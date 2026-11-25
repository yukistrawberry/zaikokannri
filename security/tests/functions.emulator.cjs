'use strict';
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');
const {initializeApp:adminApp,deleteApp:deleteAdmin}=require('firebase-admin/app');
const {getAuth:adminAuth}=require('firebase-admin/auth'),{getDatabase:adminDatabase}=require('firebase-admin/database');
const {initializeApp,deleteApp}=require('firebase/app');
const {getAuth,connectAuthEmulator,signInWithEmailAndPassword}=require('firebase/auth');
const {getFunctions,connectFunctionsEmulator,httpsCallable}=require('firebase/functions');
const mappings=require('../../functions/sync-mappings.json').sakaihigashi;
let privileged,db,auth,staffClient,rootClient,guestClient;
const clients=[];
async function client(id){
 const app=initializeApp({apiKey:'demo-api-key',projectId:'demo-inventory-security'},`security-test-${id||'guest'}`);clients.push(app);
 const provider=getAuth(app);connectAuthEmulator(provider,'http://127.0.0.1:9099',{disableWarnings:true});
 if(id) await signInWithEmailAndPassword(provider,`${id}@inventory.invalid`,'EmulatorOnly12345!');
 const functions=getFunctions(app,'asia-northeast1');connectFunctionsEmulator(functions,'127.0.0.1',5001);
 return functions;
}
const payload=total=>({items:Object.entries(mappings).map(([id,m])=>({id,name:`Monthly ${id}`,unit:m.sourceUnit,total}))});
before(async()=>{
 assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9099');
 privileged=adminApp({projectId:'demo-inventory-security',databaseURL:'https://demo-inventory-security.firebaseio.com'},'emulator-operator');
 db=adminDatabase(privileged);auth=adminAuth(privileged);
 for(const [id,role] of [['sakaihigashi','user'],['root_e2e','admin']]){
  const uid=`store_${id}`;await auth.deleteUser(uid).catch(()=>{});
  await auth.createUser({uid,email:`${id}@inventory.invalid`,password:'EmulatorOnly12345!'});
  await auth.setCustomUserClaims(uid,{storeId:id,role});
  await db.ref(`access/${uid}`).set({storeId:id,role,enabled:true});
  await db.ref(`stores/${id}`).set({name:`検証 ${id}`,role,storeType:role==='admin'?'admin':'takeout'});
 }
 const products=Object.fromEntries(Object.entries(mappings).map(([id,m])=>[m.target,{name:id,department:m.sourceUnit==='枚'?'パック':'食材',warehouse:10,used:5}]));
 products['-OycLiNflhgYG4l2oe7q']={name:'ジャン袋',department:'パック',warehouse:88,used:11};
 await db.ref('inventory/sakaihigashi').set(products);
 [staffClient,rootClient,guestClient]=await Promise.all([client('sakaihigashi'),client('root_e2e'),client()]);
});
after(async()=>{await Promise.all(clients.map(app=>deleteApp(app)));if(privileged)await deleteAdmin(privileged);});
test('real callable protocol rejects anonymous and non-admin account management',async()=>{
 await assert.rejects(httpsCallable(guestClient,'applyMonthlyInventory')(payload(566)),error=>error.code==='functions/unauthenticated');
 await assert.rejects(httpsCallable(staffClient,'manageStore')({action:'create',storeId:'injected'}),error=>error.code==='functions/permission-denied');
});
test('one authenticated call applies all 16 server-owned mappings and preserves the bag',async()=>{
 const response=await httpsCallable(staffClient,'applyMonthlyInventory')(payload(566));
 assert.equal(response.data.count,16);assert.equal(response.data.historySaved,true);
 const actual=(await db.ref('inventory/sakaihigashi').once('value')).val();
 for(const [id,m] of Object.entries(mappings)){
  const item=actual[m.target];
  if(m.sourceUnit!=='枚'){assert.equal(item.warehouse,566);assert.equal(item.used,0);}
  else if(m.splitUnit===25||m.splitMode==='remainder'){assert.equal(item.warehouse,550);assert.equal(item.used,16);}
  else {assert.equal(item.warehouse,500);assert.equal(item.used,66);}
  assert.equal(item.monthlyTransfer.actorUid,'store_sakaihigashi');
 }
 assert.equal(actual['-OycLiNflhgYG4l2oe7q'].warehouse,88);
 assert.equal(actual['-OycLiNflhgYG4l2oe7q'].used,11);
});
test('zero is applied through the authenticated backend without a confirmation dialog',async()=>{
 const result=await httpsCallable(staffClient,'applyMonthlyInventory')(payload(0));assert.equal(result.data.count,16);
 for(const m of Object.values(mappings)){
  const product=(await db.ref(`inventory/sakaihigashi/${m.target}`).once('value')).val();
  assert.equal(product.warehouse,0);assert.equal(product.used,0);
 }
});
test('backend rejects missing IDs and changed units instead of guessing',async()=>{
 const incomplete=payload(1);incomplete.items.pop();
 await assert.rejects(httpsCallable(staffClient,'applyMonthlyInventory')(incomplete),error=>error.code==='functions/failed-precondition');
 const changed=payload(1);changed.items[0].unit='変更';
 await assert.rejects(httpsCallable(staffClient,'applyMonthlyInventory')(changed),error=>error.code==='functions/failed-precondition');
});
test('administrator account creation assigns claims server-side and stores no password',async()=>{
 const response=await httpsCallable(rootClient,'manageStore')({action:'create',storeId:'new_e2e',name:'新店舗',password:'EmulatorNew12345!',role:'user',storeType:'takeout'});
 assert.equal(response.data.storeId,'new_e2e');
 const user=await auth.getUser('store_new_e2e');assert.equal(user.customClaims.storeId,'new_e2e');assert.equal(user.customClaims.role,'user');
 const store=(await db.ref('stores/new_e2e').once('value')).val();assert.equal(store.password,undefined);
});
