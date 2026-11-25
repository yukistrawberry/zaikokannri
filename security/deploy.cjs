'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const {argsOf,projectConfig}=require('./project.cjs');
const {getAuth}=require('firebase-admin/auth'),{getDatabase}=require('firebase-admin/database');
async function main(){
 const args=argsOf();
 if(!['lock','release'].includes(args.phase))throw new Error('Specify --phase lock or --phase release. Lock closes the old app during cutover.');
 if(args.emulator)throw new Error('Use the test scripts for emulators.');
 const root=path.resolve(__dirname,'..'),cli=require.resolve('firebase-tools/lib/bin/firebase.js');
 const {app}=projectConfig(args);
 if(args.phase==='release'){
  const runtime={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'js/runtime-config.js'),'utf8'),runtime);
  if(runtime.window.InventoryRuntime.emulators||!runtime.window.InventoryRuntime.appCheckSiteKey)throw new Error('Set the production App Check site key and disable emulator mode before release.');
  const db=getDatabase(app),auth=getAuth(app);
  const [stores,access]=await Promise.all([db.ref('stores').once('value'),db.ref('access').once('value')]);
  let admins=0;
  for(const [id,store] of Object.entries(stores.val()||{})){
   if(store.password!==undefined)throw new Error('Account migration is incomplete: legacy password hashes remain.');
   const uid=`store_${id}`,record=access.val()?.[uid],user=await auth.getUser(uid);
   if(!record||record.storeId!==id||record.role!==store.role||user.customClaims?.storeId!==id||user.customClaims?.role!==store.role)throw new Error(`Account migration is incomplete: ${id}`);
   if(record.enabled&&store.role==='admin'&&!user.disabled)admins++;
  }
  if(admins<1)throw new Error('A migrated, enabled administrator is required before release.');
 }
 require('./build.cjs');
 const result=spawnSync(process.execPath,[cli,'deploy','--project',args.project,'--only',args.phase==='lock'?'database':'database,hosting'],{cwd:root,stdio:'inherit',shell:false});
 if(result.status!==0)throw new Error('Deployment did not complete. Inspect the Firebase CLI result.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(async()=>{await Promise.all(require('firebase-admin/app').getApps().map(app=>app.delete()));});
