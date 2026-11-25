/* Same document, shared authentication and live database subscription. */
window.InventoryViews = (() => {
  let current = 'daily';
  const positions = {daily:0, monthly:0};
  function show(view) {
    if (!['daily','monthly'].includes(view) || view === current) return;
    if (Auth.getSession()?.role !== 'user') return;
    positions[current] = window.scrollY;
    if (current === 'monthly') flushInventorySave();
    document.getElementById('daily-view').hidden = view !== 'daily';
    document.getElementById('monthly-view').hidden = view !== 'monthly';
    current = view;
    document.title = view === 'monthly' ? '月末棚卸' : '在庫管理 - 店舗スタッフ';
    window.scrollTo({top:positions[view],behavior:'instant'});
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-inventory-view]');
    if (!link) return;
    event.preventDefault(); show(link.dataset.inventoryView);
  });
  return {show, get current(){return current;}};
})();

window.InventoryConfirm = () => new Promise(resolve => {
  const dialog = document.getElementById('transfer-confirm');
  if (dialog.open) { resolve(false); return; }
  const finish = approved => { dialog.close(); resolve(approved); };
  document.getElementById('transfer-cancel').onclick = () => finish(false);
  document.getElementById('transfer-confirm-send').onclick = () => finish(true);
  dialog.oncancel = event => { event.preventDefault(); finish(false); };
  dialog.showModal();
});
