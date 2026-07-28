// ============================================================
// Database Operations Module
// 在庫・店舗・履歴のCRUD操作
// ============================================================

const DB = (() => {

  // ----------------------------------------------------------
  // Store Operations (店舗管理)
  // ----------------------------------------------------------

  // 全店舗取得
  function onStoresChange(callback) {
    database.ref('stores').on('value', snapshot => {
      const data = snapshot.val() || {};
      const stores = Object.keys(data).map(id => ({
        id,
        ...data[id]
      }));
      callback(stores);
    });
  }

  // 店舗追加
  async function addStore(storeId, name, password, role = 'user', storeType = 'takeout') {
    const id = storeId.trim().toLowerCase();
    if (!id || !name || !password) {
      throw new Error('すべての項目を入力してください。');
    }

    // ID重複チェック
    const existing = await database.ref(`stores/${id}`).once('value');
    if (existing.exists()) {
      throw new Error('この店舗IDは既に使用されています。');
    }

    const hashedPassword = await Auth.hashPassword(password);
    await database.ref(`stores/${id}`).set({
      name: name.trim(),
      password: hashedPassword,
      role,
      storeType: role === 'admin' ? 'admin' : storeType,
      createdAt: Date.now()
    });
  }

  // 店舗更新
  async function updateStore(storeId, updates) {
    const updateData = { ...updates };
    if (updateData.password) {
      updateData.password = await Auth.hashPassword(updateData.password);
    }
    updateData.updatedAt = Date.now();
    await database.ref(`stores/${storeId}`).update(updateData);
  }

  // 店舗削除
  async function deleteStore(storeId) {
    const updates = {};
    updates[`stores/${storeId}`] = null;
    updates[`inventory/${storeId}`] = null;
    updates[`history/${storeId}`] = null;
    updates[`storeTypes/${storeId}`] = null;
    updates[`inventoryTemplateState/${storeId}`] = null;
    await database.ref().update(updates);
  }

  // ----------------------------------------------------------
  // Inventory Operations (在庫管理)
  // ----------------------------------------------------------

  // 店舗の在庫をリアルタイム監視
  function onInventoryChange(storeId, callback) {
    const ref = database.ref(`inventory/${storeId}`);
    ref.on('value', snapshot => {
      const data = snapshot.val() || {};
      const items = Object.keys(data).map(key => ({
        key,
        ...data[key]
      }));
      callback(items);
    });
    return ref;
  }

  // 在庫監視を停止
  function offInventoryChange(ref) {
    if (ref) ref.off('value');
  }

  // 商品追加
  async function addProduct(storeId, product) {
    const { department, name, warehouse, used } = product;
    if (!name || !name.trim()) {
      throw new Error('商品名を入力してください。');
    }

    const newRef = await database.ref(`inventory/${storeId}`).push({
      department: department || 'パック',
      name: name.trim(),
      warehouse: Number(warehouse) || 0,
      used: Number(used) || 0,
      createdAt: Date.now()
    });

    // 履歴記録
    await addHistory(storeId, {
      action: 'add_product',
      productName: name.trim(),
      productKey: newRef.key,
      detail: `「${name.trim()}」を追加`
    });

    return newRef.key;
  }

  // 商品更新
  async function updateProduct(storeId, productKey, updates) {
    await database.ref(`inventory/${storeId}/${productKey}`).update({
      ...updates,
      updatedAt: Date.now()
    });
  }

  // 商品フィールド更新（値の変更ログ付き）
  async function updateProductField(storeId, productKey, field, newValue, productName, storeName) {
    // 現在の値を取得
    const snapshot = await database.ref(`inventory/${storeId}/${productKey}/${field}`).once('value');
    const oldValue = snapshot.val();

    await database.ref(`inventory/${storeId}/${productKey}`).update({
      [field]: newValue,
      updatedAt: Date.now()
    });

    // 履歴記録
    const fieldLabel = field === 'warehouse' ? '倉庫在庫' : '店舗使用数';
    await addHistory(storeId, {
      action: `update_${field}`,
      productName,
      productKey,
      field,
      oldValue,
      newValue,
      storeName: storeName || '',
      detail: `「${productName}」の${fieldLabel}: ${oldValue} → ${newValue}`
    });
  }

  // 商品削除
  async function deleteProduct(storeId, productKey, productName) {
    await database.ref(`inventory/${storeId}/${productKey}`).remove();

    await addHistory(storeId, {
      action: 'delete_product',
      productName,
      productKey,
      detail: `「${productName}」を削除`
    });
  }

  // ----------------------------------------------------------
  // Department Operations (部門管理)
  // ----------------------------------------------------------

  function onDepartmentsChange(callback) {
    database.ref('departments').on('value', snapshot => {
      const data = snapshot.val();
      if (!data) {
        // デフォルト部門を初期化
        const defaults = { pack: 'パック', food: '食材' };
        database.ref('departments').set(defaults);
        callback(Object.values(defaults));
        return;
      }
      callback(Object.values(data));
    });
  }

  async function addDepartment(key, name) {
    await database.ref(`departments/${key}`).set(name);
  }

  async function removeDepartment(key) {
    await database.ref(`departments/${key}`).remove();
  }

  // ----------------------------------------------------------
  // History Operations (履歴管理)
  // ----------------------------------------------------------

  async function addHistory(storeId, entry) {
    await database.ref(`history/${storeId}`).push({
      ...entry,
      timestamp: Date.now()
    });
  }

  function onHistoryChange(storeId, callback, limitCount = 100) {
    const ref = database.ref(`history/${storeId}`).orderByChild('timestamp').limitToLast(limitCount);
    ref.on('value', snapshot => {
      const data = snapshot.val() || {};
      const entries = Object.keys(data).map(key => ({
        key,
        ...data[key]
      }));
      // 新しい順に並べる
      entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      callback(entries);
    });
    return ref;
  }

  // ----------------------------------------------------------
  // Migration (既存データの移行)
  // ----------------------------------------------------------

  async function migrateExistingData() {
    // 既存の sakaihigashi/ データを inventory/sakaihigashi/ に移行
    const oldRef = database.ref('sakaihigashi');
    const snapshot = await oldRef.once('value');
    const oldData = snapshot.val();

    if (!oldData) return { migrated: false, reason: 'no_data' };

    // 既に移行済みかチェック
    const newSnapshot = await database.ref('inventory/sakaihigashi').once('value');
    if (newSnapshot.exists()) return { migrated: false, reason: 'already_migrated' };

    // データコピー
    await database.ref('inventory/sakaihigashi').set(oldData);

    return { migrated: true, count: Object.keys(oldData).length };
  }

  // ----------------------------------------------------------
  // CSV Export
  // ----------------------------------------------------------

  function exportToCSV(items, storeName) {
    const headers = ['部門', '商品名', '倉庫在庫', '店舗使用数', '残数'];
    const rows = items.map(item => [
      item.department,
      item.name,
      item.warehouse,
      item.used,
      (item.warehouse || 0) + (item.used || 0)
    ]);

    const bom = '\uFEFF';
    const csv = bom + [headers, ...rows].map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `在庫_${storeName}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ----------------------------------------------------------
  // Utility
  // ----------------------------------------------------------

  function getRemaining(item) {
    return (Number(item.warehouse) || 0) + (Number(item.used) || 0);
  }

  function formatRemaining(item) {
    const remaining = getRemaining(item);
    if (item.department === '食材') {
      return remaining.toFixed(2);
    }
    return String(remaining);
  }

  return {
    // Stores
    onStoresChange,
    addStore,
    updateStore,
    deleteStore,
    // Inventory
    onInventoryChange,
    offInventoryChange,
    addProduct,
    updateProduct,
    updateProductField,
    deleteProduct,
    // Departments
    onDepartmentsChange,
    addDepartment,
    removeDepartment,
    // History
    addHistory,
    onHistoryChange,
    // Migration
    migrateExistingData,
    // CSV
    exportToCSV,
    // Utility
    getRemaining,
    formatRemaining
  };
})();
