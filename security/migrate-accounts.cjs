'use strict';
// Defaults to read-only preflight. Never exports password hashes to disk or logs.
const {createHash}=require('node:crypto');
const {argsOf,projectConfig}=require('./project.cjs');
const {getAuth}=require('firebase-admin/auth'),{getDatabase}=require('firebase-admin/database');
async function migrate(){
 const args=argsOf(),{app}=projectConfig(args),auth=getAuth(app),db=getDatabase(app);
 const stores=(await db.ref('stores').once('value')).val()||{};
 const records=[];
 for(const [id,store] of Object.entries(stores)){
  if(!/^[a-z0-9_-]{1,64}$/.test(id)||!store||!['user','admin'].includes(store.role))throw new Error(`Invalid store metadata: ${id}`);
  const uid=`store_${id}`,email=`${id}@inventory.invalid`;
  const byId=await auth.getUser(uid).catch(error=>{if(error.code==='auth/user-not-found')return null;throw error;});
  const byEmail=await auth.getUserByEmail(email).catch(error=>{if(error.code==='auth/user-not-found')return null;throw error;});
  if(byEmail&&byEmail.uid!==uid)throw new Error(`Email collision; no changes made for ${id}.`);
  if(byId&&(byId.email!==email||byId.customClaims?.storeId!==id||byId.customClaims?.role!==store.role))throw new Error(`UID collision or unexpected claims: ${id}`);
  if(!byId&&(typeof store.password!=='string'||!/^[0-9a-f]{64}$/i.test(store.password)))throw new Error(`Missing legacy hash: ${id}`);
  const common=['admin','password','123456','12345678',id];
  const weakAdmin=store.role==='admin'&&common.some(value=>createHash('sha256').update(value).digest('hex')===store.password);
  records.push({id,uid,email,store,existing:!!byId,weakAdmin,disabled:weakAdmin||!!byId?.disabled});
 }
 console.log(JSON.stringify({mode:args.apply?'apply':'preflight',stores:records.map(({id,store,existing,weakAdmin})=>({id,role:store.role,alreadyMigrated:existing,requiresAdminPasswordChange:weakAdmin}))},null,2));
 if(!args.apply)return;
 for(const record of records){
  const {id,uid,email,store,existing,weakAdmin,disabled}=record,claims={storeId:id,role:store.role};
  if(!existing){
   const result=await auth.importUsers([{uid,email,displayName:String(store.name||id),disabled:weakAdmin,customClaims:claims,passwordHash:Buffer.from(store.password,'hex'),passwordSalt:Buffer.alloc(0)}],{hash:{algorithm:'SHA256',rounds:1}});
   if(result.failureCount)throw new Error(`Account import failed for ${id}; legacy hash retained.`);
  }
  await auth.setCustomUserClaims(uid,claims);
  const prior=(await db.ref(`access/${uid}`).once('value')).val();
  await db.ref().update({[`access/${uid}`]:{...claims,enabled:!disabled,validAfter:prior?.validAfter||0},[`stores/${id}/password`]:null});
 }
 console.log('Account migration complete. Legacy password hashes removed from store records.');
}
if(require.main===module)migrate().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>require('firebase-admin/app').getApps().forEach(app=>app.delete()));
module.exports={migrate};
