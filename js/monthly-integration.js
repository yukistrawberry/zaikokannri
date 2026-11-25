/* One-click monthly -> daily transfer. Product IDs and unit factors are configured separately. */
(async function () {
  await Auth.ready();
  'use strict';
  function staffSession() { return Auth.getSession()?.role==='user' ? Auth.getSession() : null; }
  if (!staffSession()) await new Promise(resolve => {
    const stop = Auth.onChange(value => { if (value?.role === 'user') { stop(); resolve(); } });
  });
  const initialSession = staffSession();
  const panel = document.createElement('section');
  panel.className = 'integration-panel';
  panel.innerHTML = '<button type="button" class="primary" id="transferSend">毎日在庫へ反映</button><p id="transferMessage" class="message" role="status" aria-live="polite"></p>';
  document.querySelector('.category-info').before(panel);
  const button = document.getElementById('transferSend');
  const status = document.getElementById('transferMessage');
  const message = (text, error = false) => { status.textContent = text; status.classList.toggle('error', error); };
  document.getElementById('header-store-name').textContent = initialSession.storeName || initialSession.storeId;
  function ensureSession() {
    const current = staffSession();
    if (!current) throw new Error('ログインし直してください。');
    return current;
  }
  let busy = false;
  function mappingsFor(store) { return window.InventorySyncMappings?.[store] || {}; }
  function monthlySnapshot() {
    flushInventorySave();
    return catalog.flatMap(category => category.items.map(item => ({
      ...item,
      counted:Object.prototype.hasOwnProperty.call(inventory,item.id) || Object.prototype.hasOwnProperty.call(inventory,makeLegacyKey(category.name,item.name)),
      total:getValues(category.name,item).reduce((a,b)=>a+b,0)
    })));
  }
  button.addEventListener('click', async () => {
    if (busy) return;
    if (!await InventoryConfirm()) return;
    busy = true; button.disabled = true; button.textContent = '反映中…'; panel.setAttribute('aria-busy','true');
    let writing = false, committed = false;
    try {
      const session = ensureSession();
      const mappings = mappingsFor(session.storeId);
      const snapshot = monthlySnapshot();
      const rows = InventoryTransfer.automaticRows(snapshot, mappings);
      if (!rows.length) {
        const configuredCount = Object.values(mappings).filter(binding=>binding?.target).length;
        message(configuredCount ? '反映できる商品がありません。商品IDの設定を確認してください。' : '商品IDの紐付けがまだ設定されていません。設定後はこのボタンだけで反映できます。', true);
        return;
      }
      await Auth.ready(); ensureSession();
      const ref = database.ref(`inventory/${session.storeId}`);
      const products = (await ref.once('value')).val() || {};
      const changes = InventoryTransfer.plan(rows, products);
      const stamp = Date.now(), transferId = database.ref().push().key;
      const next = InventoryTransfer.apply(products, changes, transferId, stamp);
      const updates = {};
      for (const change of changes) {
        const item = next[change.target];
        item.monthlyTransfer.actorUid = session.uid;
        for (const field of ['warehouse','used','updatedAt','monthlyTransfer']) updates[`${change.target}/${field}`] = item[field];
      }
      if (ensureSession().storeId !== session.storeId) throw new Error('ログイン店舗が変更されました。');
      writing = true;
      // One atomic multi-location write: rules validate every existing product.
      await ref.update(updates);
      committed = true;
      let historySaved = true;
      try {
        await database.ref(`history/${session.storeId}`).push({action:'monthly_transfer',actorUid:session.uid,
          timestamp:firebase.database.ServerValue.TIMESTAMP,changes:changes.map(c=>({target:c.target,warehouse:c.warehouse,used:c.used})),
          detail:`月末棚卸から${changes.length}商品を反映`});
      } catch { historySaved = false; }
      message(`${session.storeName || session.storeId}の毎日在庫に${changes.length}商品を反映しました。${historySaved ? '' : '履歴の保存には失敗しましたが、在庫は更新済みです。'}`);
    } catch (error) {
      if (committed) message('毎日在庫への反映は完了しています。結果表示を確認してください。');
      else if (writing && !['functions/aborted','functions/unauthenticated','functions/permission-denied','functions/invalid-argument','functions/failed-precondition'].includes(error.code)) message(`反映結果を確認できません：${error.message}\n通信切断時は反映済みの場合があります。毎日在庫の値を確認してください。`,true);
      else message(error.message,true);
    } finally {
      busy = false; button.disabled = false; button.textContent = '毎日在庫へ反映'; panel.removeAttribute('aria-busy');
    }
  });
})();
