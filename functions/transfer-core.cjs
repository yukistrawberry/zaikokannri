(function (root) {
  'use strict';
  function quantity(value) {
    if (value === '' || value === null || typeof value === 'boolean' || !Number.isFinite(Number(value)) || Number(value) < 0) throw new Error('数量・換算倍率は0以上の数値を指定してください。');
    return Number(value);
  }
  function plan(rows, products) {
    const seen = new Set();
    return rows.filter(row => row.selected).map(row => {
      const product = products[row.target];
      if (!product) throw new Error('反映先の商品が見つかりません。再読み込みしてください。');
      if (seen.has(row.target)) throw new Error('同じ毎日商品が複数選択されています。対応付けを修正してください。');
      seen.add(row.target);
      const factor = quantity(row.factor);
      if (factor === 0) throw new Error('換算倍率は0より大きくしてください。');
      const total = Math.round(quantity(row.total) * factor * 1000000) / 1000000;
      // Per-product pack rules are configured alongside the fixed product IDs.
      let warehouse = total;
      if (product.department === 'パック') {
        const splitUnit = row.splitUnit === undefined ? 100 : quantity(row.splitUnit);
        if (row.splitMode !== undefined && !['remainder','reserve'].includes(row.splitMode)) {
          throw new Error(`${product.name}の分割方法が不正です。設定の確認が必要です。`);
        }
        if (row.splitMode === 'remainder') {
          if (![25,50,100].includes(splitUnit)) throw new Error(`${product.name}の分割単位が不正です。`);
          warehouse = Math.floor(total / splitUnit) * splitUnit;
        } else if (splitUnit === 50) {
          // Keep >50 and <=100 in used when total exceeds 100.
          warehouse = Math.max(0, (Math.ceil(total / 50) - 2) * 50);
        } else if (splitUnit === 100) {
          // Exact hundreds keep one hundred in used; totals <=100 stay entirely in used.
          warehouse = Math.max(0, (Math.ceil(total / 100) - 1) * 100);
        } else if (splitUnit === 25) {
          warehouse = Math.floor(total / 25) * 25;
        } else {
          throw new Error(`${product.name}の分割ルールが未確定です。設定の確認が必要です。`);
        }
      }
      const used = Math.round((total - warehouse) * 1000000) / 1000000;
      return { target: row.target, sourceId: row.id, sourceName: row.name, name: product.name,
        oldWarehouse: quantity(product.warehouse ?? 0), oldUsed: quantity(product.used ?? 0),
        warehouse, used, factor, unit: row.unit, splitUnit: product.department === 'パック' ? Number(row.splitUnit ?? 100) : null,
        splitMode: product.department === 'パック' ? (row.splitMode ?? (Number(row.splitUnit) === 25 ? 'remainder' : 'reserve')) : null };
    });
  }
  function apply(products, changes, transferId, timestamp) {
    const next = JSON.parse(JSON.stringify(products));
    changes.forEach(change => {
      if (!next[change.target]) throw new Error('反映先の商品が削除されています。');
      Object.assign(next[change.target], { warehouse: change.warehouse, used: change.used, updatedAt: timestamp,
        monthlyTransfer: { id: transferId, sourceId: change.sourceId, sourceName: change.sourceName,
          timestamp, previousWarehouse: change.oldWarehouse, previousUsed: change.oldUsed } });
    });
    return next;
  }
  function automaticRows(items, mappings) {
    const byId = new Map(items.map(item=>[item.id,item]));
    const rows = [];
    for (const [id,binding] of Object.entries(mappings)) {
      if (!binding?.target) continue;
      const item = byId.get(id);
      if (!item) throw new Error('紐付け済みの棚卸商品が見つかりません。商品ID設定の確認が必要です。');
      if (binding.sourceUnit !== undefined && binding.sourceUnit !== item.unit) throw new Error(`${item.name}の単位が変わっています。換算設定の確認が必要です。`);
      const factor = quantity(binding.factor);
      if (factor <= 0) throw new Error(`${item.name}の換算倍率が未設定または不正です。`);
      rows.push({...item,selected:true,target:binding.target,factor,splitUnit:binding.splitUnit,splitMode:binding.splitMode});
    }
    return rows;
  }
  const api = { quantity, plan, apply, automaticRows };
  root.InventoryTransfer = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
