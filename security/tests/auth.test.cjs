'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
async function harness({role='user',enabled=true,claimedRole=role}={}){
 const storage=new Map([['inventory_auth',JSON.stringify({storeId:'victim',role:'admin'})],['inventory-management-v1','keep-monthly-data']]);
 let callback;
 const user={uid:'store_a',getIdTokenResult:async()=>({claims:{storeId:'a',role:claimedRole,auth_time:100}}),getIdToken:async()=>'mock-token'};
 const provider={currentUser:null,setPersistence:async()=>{},onAuthStateChanged:cb=>{callback=cb;queueMicrotask(()=>cb(null));},
  signInWithEmailAndPassword:async(email)=>{assert.equal(email,'a@inventory.invalid');provider.currentUser=user;return {user};},
  signOut:async()=>{provider.currentUser=null;await callback(null);}};
 const firebase={auth:()=>provider};firebase.auth.Auth={Persistence:{SESSION:'session'}};
 const database={ref:key=>({once:async()=>({val:()=>key.startsWith('access/')?{storeId:'a',role,enabled}:{name:'Store A'}}),on:()=>{},off:()=>{}})};
 const context={firebase,database,localStorage:{getItem:key=>storage.get(key)??null,removeItem:key=>storage.delete(key)},console};vm.createContext(context);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../../js/auth.js'),'utf8'),context);
 const auth=vm.runInContext('Auth',context);await auth.ready();return {auth,storage,provider};
}
test('forgeable legacy storage cannot authenticate or grant admin rights',async()=>{
 const {auth,storage}=await harness();assert.equal(auth.getSession(),null);assert.equal(auth.isAdmin(),false);
 assert.equal(storage.has('inventory_auth'),false);assert.equal(storage.get('inventory-management-v1'),'keep-monthly-data');
});
test('successful login uses server claims plus trusted access, not local role data',async()=>{
 const {auth,storage}=await harness();storage.set('inventory_auth',JSON.stringify({role:'admin'}));
 const session=await auth.login('a','EmulatorOnly123!');assert.equal(session.uid,'store_a');assert.equal(session.role,'user');assert.equal(auth.isAdmin(),false);
 session.role='admin';assert.equal(auth.getSession().role,'user');
 await auth.logout();assert.equal(auth.getSession(),null);
});
test('disabled accounts and mismatched role claims fail closed',async()=>{
 for(const options of [{enabled:false},{role:'user',claimedRole:'admin'}]){
  const {auth}=await harness(options);await assert.rejects(auth.login('a','EmulatorOnly123!'));assert.equal(auth.getSession(),null);
 }
});
