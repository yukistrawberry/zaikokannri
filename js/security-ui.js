/* Data is escaped as HTML text/attributes, never embedded inside JavaScript handlers. */
window.SecurityUI = Object.freeze({
  escape(value) { return String(value ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
});
document.addEventListener('click',event=>{
  const button=event.target.closest('button[data-safe-action]');
  if(!button) return;
  const {safeAction,key,name}=button.dataset;
  if(safeAction==='delete-dept') window.confirmDeleteDept(key,name);
  if(safeAction==='edit-store') window.editStore(key);
  if(safeAction==='delete-store') window.confirmDeleteStore(key);
  if(safeAction==='delete-product') window.confirmDeleteProduct(key,name);
});
document.addEventListener('change',event=>{
  const input=event.target.closest('input[data-safe-field]');
  if(input) window.updateProductField(input.dataset.key,input.dataset.safeField,input.value,input.dataset.name);
});
