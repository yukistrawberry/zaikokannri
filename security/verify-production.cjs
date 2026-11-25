const fs=require('node:fs'),path=require('node:path');
const {projectConfig}=require('./project.cjs'),{getAuth}=require('firebase-admin/auth');
(async()=>{const {app}=projectConfig({project:'zaikokannri-sakaihigashi'});try{
 const t=await app.options.credential.getAccessToken();
 const base=app.options.databaseURL;
 const read=async suffix=>{const r=await fetch(base+suffix,{headers:{Authorization:'Bearer '+t.access_token},signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Read verification failed: '+r.status);return r.json();};
 const data=await read('/.json');
 const folder=path.join(__dirname,'private');const backup=fs.readdirSync(folder).filter(x=>x.startsWith('before-spark-cutover-')).sort().at(-1);
 const original=JSON.parse(fs.readFileSync(path.join(folder,backup),'utf8'));
 const assert=require('node:assert/strict');assert.deepEqual(data.inventory,original.inventory);assert.deepEqual(data.history,original.history);
 for(const [id,store] of Object.entries(data.stores)){
  const user=await getAuth(app).getUser('store_'+id),access=data.access[user.uid];
  assert.equal(store.password,undefined);assert.equal(user.disabled,false);assert.equal(user.customClaims.storeId,id);assert.equal(user.customClaims.role,store.role);assert.equal(access.enabled,true);
 }
 const anon=await fetch(base+'/inventory/sakaihigashi.json',{signal:AbortSignal.timeout(30000)});assert.equal(anon.status,401);
 const rules=await read('/.settings/rules.json');assert.deepEqual(rules.rules,JSON.parse(fs.readFileSync(path.join(__dirname,'../database.rules.json'),'utf8')).rules);
 console.log(JSON.stringify({accountsVerified:Object.keys(data.stores).length,inventoryUnchanged:true,historyUnchanged:true,anonymousReadDenied:true,deployedRulesMatch:true}));
}finally{await app.delete();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
