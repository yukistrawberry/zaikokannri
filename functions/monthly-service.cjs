'use strict';
function createMonthlyService({db,core,mappings,fail}) {
  const error=(code,message)=>{throw fail(code,message);};
  return async request=>{
    if(!request.auth) error('unauthenticated','ログインしてください。');
    const access=(await db.ref(`access/${request.auth.uid}`).once('value')).val();
    const token=request.auth.token;
    if(!access?.enabled||access.role!=='user'||token.role!=='user'||access.storeId!==token.storeId||(access.validAfter&&!((token.auth_time||0)>=access.validAfter))) error('permission-denied','店舗アカウントを確認してください。');
    const store=access.storeId,settings=mappings[store];
    if(!settings||!Object.keys(settings).length) error('failed-precondition','商品IDの紐付けが未設定です。');
    const items=request.data?.items;
    if(!Array.isArray(items)||!items.length||items.length>500) error('invalid-argument','棚卸データを確認してください。');
    const seen=new Set();
    for(const item of items){
      if(!item||typeof item.id!=='string'||seen.has(item.id)||typeof item.unit!=='string'||typeof item.name!=='string'||item.name.length>160||typeof item.total!=='number'||!Number.isFinite(item.total)||item.total<0||item.total>1000000000) error('invalid-argument','棚卸データの形式が不正です。');
      seen.add(item.id);
    }
    let rows;
    try { rows=core.automaticRows(items,settings); }
    catch { error('failed-precondition','紐付け済みの品目ID・単位を確認してください。'); }
    const inventoryRef=db.ref(`inventory/${store}`);
    // Keep the initial read in the transaction's local cache. A transaction may
    // otherwise first receive null before its server state has been loaded.
    const keepCache=()=>{};
    inventoryRef.on('value',keepCache);
    try {
    const original=(await inventoryRef.once('value')).val();
    if(!original) error('failed-precondition','反映先の在庫がありません。');
    let changes;
    try { changes=core.plan(rows,original); }
    catch { error('failed-precondition','反映先の商品ID・数量設定を確認してください。'); }
    for(const change of changes) if(change.warehouse>1000000000||change.used>1000000000) error('invalid-argument','数量が上限を超えています。');
    const timestamp=Date.now(),id=db.ref(`history/${store}`).push().key;
    const expected=JSON.stringify(original);
    const transaction=await inventoryRef.transaction(current=>{
      if(JSON.stringify(current)!==expected) return;
      const updated=core.apply(current,changes,id,timestamp);
      changes.forEach(change=>{updated[change.target].monthlyTransfer.actorUid=request.auth.uid;});
      return updated;
    },undefined,false);
    if(!transaction.committed) error('aborted','ほかの端末で在庫が更新されたため、今回は反映していません。もう一度ボタンを押してください。');
    let historySaved=true;
    try { await db.ref(`history/${store}/${id}`).set({action:'monthly_transfer',productName:'月末棚卸',actorUid:request.auth.uid,timestamp,detail:`月末棚卸から${changes.length}商品を反映`,changes}); }
    catch { historySaved=false; }
    return {count:changes.length,historySaved,transferId:id};
    } finally { inventoryRef.off('value',keepCache); }
  };
}
module.exports={createMonthlyService};
