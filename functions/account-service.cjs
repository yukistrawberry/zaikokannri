'use strict';
function createAccountService({auth,db,fail}) {
  const error=(code,message)=>{throw fail(code,message);};
  const idOf=value=>{
    if(typeof value!=='string'||!/^[a-z0-9_-]{1,64}$/.test(value)) error('invalid-argument','店舗IDの形式が不正です。');
    return value;
  };
  const nameOf=value=>{
    if(typeof value!=='string'||!value.trim()||value.length>120||/[\u0000-\u001f]/.test(value)) error('invalid-argument','店舗名を確認してください。');
    return value.trim();
  };
  const passwordOf=value=>{
    if(typeof value!=='string'||value.length<12||value.length>128||!/[A-Za-z]/.test(value)||!/[0-9]/.test(value)) error('invalid-argument','パスワードは英字と数字を含む12〜128文字にしてください。');
    return value;
  };
  async function requireAdmin(request) {
    if(!request.auth) error('unauthenticated','ログインしてください。');
    const access=(await db.ref(`access/${request.auth.uid}`).once('value')).val();
    if(request.auth.token.role!=='admin'||!access?.enabled||access.role!=='admin'||access.storeId!==request.auth.token.storeId||(access.validAfter&&!((request.auth.token.auth_time||0)>=access.validAfter))) error('permission-denied','管理者権限が必要です。');
  }
  return async function manage(request) {
    await requireAdmin(request);
    const data=request.data||{},id=idOf(data.storeId),uid=`store_${id}`;
    if(!['create','update','delete'].includes(data.action)) error('invalid-argument','操作を確認してください。');
    const existing=(await db.ref(`stores/${id}`).once('value')).val();
    if(data.action==='delete') {
      if(!existing) error('not-found','店舗が見つかりません。');
      if(existing.role==='admin') error('failed-precondition','管理者アカウントの削除は管理用ツールで行ってください。');
      // Deny access before touching Authentication or deleting business data.
      await db.ref(`access/${uid}/enabled`).set(false);
      await auth.revokeRefreshTokens(uid);
      await auth.deleteUser(uid);
      await db.ref().update({[`stores/${id}`]:null,[`access/${uid}`]:null,[`inventory/${id}`]:null,[`history/${id}`]:null,[`storeTypes/${id}`]:null,[`inventoryTemplateState/${id}`]:null});
      return {storeId:id};
    }
    const role=data.role===undefined?existing?.role:data.role;
    if(!['user','admin'].includes(role)) error('invalid-argument','権限の指定が不正です。');
    const name=nameOf(data.name??existing?.name);
    const type=role==='admin'?'admin':data.storeType??existing?.storeType??'takeout';
    if(!['takeout','sakaba','admin','unknown'].includes(type)) error('invalid-argument','店舗種別を確認してください。');
    const claims={storeId:id,role};
    if(data.action==='create') {
      if(existing) error('already-exists','店舗IDは使用されています。');
      const password=passwordOf(data.password);
      await auth.createUser({uid,email:`${id}@inventory.invalid`,password,displayName:name,disabled:true});
      try {
        await auth.setCustomUserClaims(uid,claims);
        await db.ref().update({[`stores/${id}`]:{name,role,storeType:type,createdAt:Date.now()},[`access/${uid}`]:{...claims,enabled:false,validAfter:0}});
        await auth.updateUser(uid,{disabled:false});
        await db.ref(`access/${uid}/enabled`).set(true);
      } catch(error) {
        // A failed create remains disabled; no partial account can log in.
        await auth.updateUser(uid,{disabled:true}).catch(()=>{});
        await db.ref(`access/${uid}/enabled`).set(false).catch(()=>{});
        throw error;
      }
    } else {
      if(!existing) error('not-found','店舗が見つかりません。');
      if(existing.role==='admin'&&role!=='admin') error('failed-precondition','管理者の降格は管理用ツールで行ってください。');
      const authUpdates={displayName:name};
      if(data.password) authUpdates.password=passwordOf(data.password);
      const changesIdentity=!!data.password||role!==existing.role;
      if(changesIdentity)await db.ref(`access/${uid}/enabled`).set(false);
      await auth.updateUser(uid,authUpdates);
      if(changesIdentity){await auth.setCustomUserClaims(uid,claims);await auth.revokeRefreshTokens(uid);}
      const updates={[`stores/${id}/name`]:name,[`stores/${id}/role`]:role,[`stores/${id}/storeType`]:type,[`stores/${id}/updatedAt`]:Date.now(),[`stores/${id}/password`]:null};
      if(changesIdentity)updates[`access/${uid}`]={...claims,enabled:true,validAfter:Math.floor(Date.now()/1000)+1};
      await db.ref().update(updates);
    }
    return {storeId:id};
  };
}
module.exports={createAccountService};
