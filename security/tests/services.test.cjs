'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createAccountService}=require('../../functions/account-service.cjs');
const {createMonthlyService}=require('../../functions/monthly-service.cjs');
const core=require('../../js/transfer-core.js');
function fakeDb(seed){
 const data=structuredClone(seed);let conflict=false;
 const value=path=>path?path.split('/').reduce((node,key)=>node?.[key],data)??null:data;
 const put=(path,val)=>{const parts=path.split('/');let node=data;for(const key of parts.slice(0,-1))node=node[key]??={};if(val===null)delete node[parts.at(-1)];else node[parts.at(-1)]=structuredClone(val);};
 return {data,setConflict:()=>conflict=true,ref(path=''){return {
  once:async()=>({val:()=>structuredClone(value(path))}),on:()=>{},off:()=>{},
  set:async val=>put(path,val),update:async changes=>{for(const [key,val] of Object.entries(changes))put(path?`${path}/${key}`:key,val);},push:()=>({key:'test-generated-id'}),
  transaction:async callback=>{if(conflict){put(`${path}/p/used`,77);conflict=false;}const next=callback(structuredClone(value(path)));if(next===undefined)return {committed:false};put(path,next);return {committed:true};}
 };}};
}
const fail=(code,message)=>Object.assign(new Error(message),{code});
const user={uid:'store_a',token:{storeId:'a',role:'user'}};
const admin={uid:'store_root',token:{storeId:'root',role:'admin'}};
function seed(){return {access:{store_a:{storeId:'a',role:'user',enabled:true},store_root:{storeId:'root',role:'admin',enabled:true}},stores:{a:{name:'A',role:'user'},root:{name:'Root',role:'admin'}},inventory:{a:{p:{name:'Pack',department:'パック',warehouse:10,used:5},bag:{name:'ジャン袋',department:'パック',warehouse:88,used:11}}}};}
function service(db){return createMonthlyService({db,core,mappings:{a:{monthly:{target:'p',factor:1,sourceUnit:'枚',splitUnit:50}}},fail});}
const items=total=>[{id:'monthly',name:'Monthly pack',unit:'枚',total}];
test('monthly endpoint rejects anonymous, forged roles and disabled accounts',async()=>{
 const db=fakeDb(seed()),sync=service(db);
 await assert.rejects(sync({data:{items:items(566)}}),{code:'unauthenticated'});
 await assert.rejects(sync({auth:{...user,token:{...user.token,role:'admin'}},data:{items:items(566)}}),{code:'permission-denied'});
 db.data.access.store_a.enabled=false;
 await assert.rejects(sync({auth:user,data:{items:items(566)}}),{code:'permission-denied'});
 assert.equal(db.data.inventory.a.p.warehouse,10);
});
test('monthly endpoint uses server mappings and preserves the excluded bag',async()=>{
 const db=fakeDb(seed()),result=await service(db)({auth:user,data:{storeId:'other-store',items:items(566)}});
 assert.equal(result.count,1);assert.equal(db.data.inventory.a.p.warehouse,500);assert.equal(db.data.inventory.a.p.used,66);
 assert.deepEqual(db.data.inventory.a.bag,seed().inventory.a.bag);
 assert.equal(db.data.history.a['test-generated-id'].actorUid,'store_a');
});
test('monthly zero resets both fields and unchanged rules handle exact multiples',async()=>{
 const db=fakeDb(seed()),sync=service(db);
 await sync({auth:user,data:{items:items(550)}});assert.equal(db.data.inventory.a.p.warehouse,450);assert.equal(db.data.inventory.a.p.used,100);
 await sync({auth:user,data:{items:items(0)}});assert.equal(db.data.inventory.a.p.warehouse,0);assert.equal(db.data.inventory.a.p.used,0);
});
test('monthly input errors and concurrent edits stop before overwriting',async()=>{
 const db=fakeDb(seed()),sync=service(db);
 await assert.rejects(sync({auth:user,data:{items:items(-1)}}),{code:'invalid-argument'});
 await assert.rejects(sync({auth:user,data:{items:[...items(1),...items(2)]}}),{code:'invalid-argument'});
 await assert.rejects(sync({auth:user,data:{items:[{...items(1)[0],unit:'Kg'}]}}),{code:'failed-precondition'});
 db.setConflict();await assert.rejects(sync({auth:user,data:{items:items(566)}}),{code:'aborted'});
 assert.equal(db.data.inventory.a.p.warehouse,10);assert.equal(db.data.inventory.a.p.used,77);
});
test('account operations require live server-side administrator privileges',async()=>{
 const db=fakeDb(seed()),calls=[];
 const auth=new Proxy({},{get:(_,key)=>async data=>{calls.push({key,data});}});
 const manage=createAccountService({auth,db,fail});
 await assert.rejects(manage({data:{action:'create',storeId:'new'}}),{code:'unauthenticated'});
 await assert.rejects(manage({auth:user,data:{action:'create',storeId:'new'}}),{code:'permission-denied'});
 await assert.rejects(manage({auth:{...user,token:{storeId:'a',role:'admin'}},data:{action:'create',storeId:'new'}}),{code:'permission-denied'});
 assert.equal(calls.length,0);
});
test('administrator creates strong auth accounts without storing passwords in the database',async()=>{
 const db=fakeDb(seed()),calls=[];
 const auth=new Proxy({},{get:(_,key)=>async (...data)=>{calls.push({key,data});}});
 const manage=createAccountService({auth,db,fail});
 await assert.rejects(manage({auth:admin,data:{action:'create',storeId:'new',name:'New',role:'user',password:'admin'}}),{code:'invalid-argument'});
 await manage({auth:admin,data:{action:'create',storeId:'new',name:'New',role:'user',password:'LocalTest12345!'}});
 assert.ok(calls.some(call=>call.key==='setCustomUserClaims'));
 assert.equal(db.data.stores.new.password,undefined);assert.equal(db.data.access.store_new.enabled,true);
});
test('administrator accounts cannot be deleted or demoted through the browser endpoint',async()=>{
 const manage=createAccountService({auth:{},db:fakeDb(seed()),fail});
 await assert.rejects(manage({auth:admin,data:{action:'delete',storeId:'root'}}),{code:'failed-precondition'});
 await assert.rejects(manage({auth:admin,data:{action:'update',storeId:'root',role:'user',name:'Root'}}),{code:'failed-precondition'});
});
