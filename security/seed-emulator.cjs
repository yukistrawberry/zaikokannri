'use strict';
// Synthetic local test data only. Explicitly refuses any production target.
const fs=require('node:fs'),path=require('node:path');
process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099';
process.env.FIREBASE_DATABASE_EMULATOR_HOST='127.0.0.1:9000';
const {initializeApp}=require('firebase-admin/app'),{getAuth}=require('firebase-admin/auth'),{getDatabase}=require('firebase-admin/database');
const app=initializeApp({projectId:'demo-inventory-security',databaseURL:'https://demo-inventory-security.firebaseio.com'});
async function main(){
 const auth=getAuth(app),db=getDatabase(app);
 for(const [id,role] of [['sakaihigashi','user'],['root_e2e','admin']]){
  const uid=`store_${id}`;
  try{await auth.createUser({uid,email:`${id}@inventory.invalid`,password:'EmulatorOnly12345!'});}catch(error){if(error.code!=='auth/uid-already-exists'&&error.code!=='auth/email-already-exists')throw error;}
  await auth.setCustomUserClaims(uid,{storeId:id,role});
  await db.ref(`access/${uid}`).set({storeId:id,role,enabled:true,validAfter:0});
  await db.ref(`stores/${id}`).set({name:role==='admin'?'検証用管理者':'検証用店舗',role,storeType:role==='admin'?'admin':'takeout'});
 }
 const source=fs.readFileSync(path.join(__dirname,'../js/monthly-app.js'),'utf8');
 const catalog=JSON.parse(source.match(/const BASE_INVENTORY_DATA = (.*);/)[1]);
 const names=Object.fromEntries(catalog.flatMap((c,ci)=>c.items.map((item,ii)=>[`base-${ci}-${ii}`,item.name])));
 const mappings=require('../functions/sync-mappings.json').sakaihigashi;
 const products=Object.fromEntries(Object.entries(mappings).map(([id,m])=>[m.target,{name:names[id],department:m.sourceUnit==='枚'?'パック':'食材',warehouse:10,used:5}]));
 products['-OycLiNflhgYG4l2oe7q']={name:'ジャン袋',department:'パック',warehouse:88,used:11};
 await db.ref('inventory/sakaihigashi').set(products);
 await db.ref('departments').set({pack:'パック',food:'食材'});
 console.log('Seeded synthetic Auth users, access controls and inventory into demo emulators only.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>app.delete());
