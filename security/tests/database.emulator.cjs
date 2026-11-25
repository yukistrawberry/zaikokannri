'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {ref,get,set,update,remove}=require('firebase/database');
let env,staff,other,admin,guest,disabled;
const product={name:'商品',department:'パック',warehouse:500,used:66,createdAt:1};
before(async()=>{
 env=await initializeTestEnvironment({projectId:'demo-inventory-security',database:{host:'127.0.0.1',port:9000,rules:fs.readFileSync(path.join(__dirname,'../../database.rules.json'),'utf8')}});
 await env.clearDatabase();
 await env.withSecurityRulesDisabled(async context=>set(ref(context.database()),{
  access:{store_a:{storeId:'a',role:'user',enabled:true},store_b:{storeId:'b',role:'user',enabled:true},store_root:{storeId:'root',role:'admin',enabled:true},store_disabled:{storeId:'disabled',role:'user',enabled:false}},
  stores:{a:{name:'A',role:'user'},b:{name:'B',role:'user'},root:{name:'管理者',role:'admin'}},
  inventory:{a:{p:product},b:{p:product}},departments:{pack:'パック'},history:{a:{original:{action:'old',timestamp:1,actorUid:'store_a'}}}
 }));
 staff=env.authenticatedContext('store_a',{storeId:'a',role:'user'}).database();
 other=env.authenticatedContext('store_b',{storeId:'b',role:'user'}).database();
 admin=env.authenticatedContext('store_root',{storeId:'root',role:'admin'}).database();
 disabled=env.authenticatedContext('store_disabled',{storeId:'disabled',role:'user'}).database();
 guest=env.unauthenticatedContext().database();
});
after(async()=>{await env?.cleanup();});
test('anonymous clients cannot read or write business or identity data',async()=>{
 for(const key of ['inventory/a','stores/a','access/store_a','departments']) await assertFails(get(ref(guest,key)));
 await assertFails(set(ref(guest,'inventory/a/p/warehouse'),0));
});
test('staff can read own inventory/profile but not another store or the stores root',async()=>{
 await assertSucceeds(get(ref(staff,'inventory/a')));await assertSucceeds(get(ref(staff,'stores/a')));
 await assertFails(get(ref(staff,'inventory/b')));await assertFails(get(ref(staff,'stores/b')));await assertFails(get(ref(staff,'stores')));
});
test('staff update own quantities including zero but cannot update another store',async()=>{
 await assertSucceeds(update(ref(staff,'inventory/a/p'),{warehouse:0,used:0,updatedAt:Date.now()}));
 await assertFails(update(ref(other,'inventory/a/p'),{warehouse:999}));
});
test('staff cannot escalate roles or create accounts; admin profiles also require server callable',async()=>{
 await assertFails(set(ref(staff,'access/store_a/role'),'admin'));
 await assertFails(set(ref(staff,'stores/a/role'),'admin'));
 await assertFails(set(ref(staff,'stores/injected'),{name:'fake',role:'admin'}));
 await assertFails(set(ref(admin,'access/store_root/role'),'user'));
 await assertFails(set(ref(admin,'stores/new'),{name:'new',role:'user'}));
});
test('a forged admin claim without the matching trusted access record is denied',async()=>{
 const forged=env.authenticatedContext('store_a',{storeId:'a',role:'admin'}).database();
 await assertFails(get(ref(forged,'inventory/b')));
 await assertFails(set(ref(forged,'departments/forged'),'x'));
});
test('disabled access records immediately deny operations even with a valid-looking token',async()=>{
 await assertFails(get(ref(disabled,'inventory/a')));
 await assertFails(set(ref(disabled,'inventory/disabled/p'),product));
});
test('quantity validation rejects negative, strings, oversized values and missing required fields',async()=>{
 for(const value of [-1,'10',1000000001]) await assertFails(set(ref(staff,'inventory/a/p/warehouse'),value));
 await assertFails(remove(ref(staff,'inventory/a/p/name')));
 await assertFails(update(ref(staff,'inventory/a/p'),{name:'changed'}));
 await assertFails(update(ref(staff,'inventory/a/p'),{department:'changed'}));
});
test('staff cannot add, delete or replace product IDs',async()=>{
 await assertFails(set(ref(staff,'inventory/a/new'),product));
 await assertFails(remove(ref(staff,'inventory/a/p')));
 await assertFails(set(ref(staff,'inventory/a'),{replacement:product}));
});
test('staff cannot bypass server-side monthly transfer using a whole-store write',async()=>{
 const data=(await get(ref(staff,'inventory/a'))).val();
 data.p.warehouse=500;data.p.used=66;data.p.updatedAt=Date.now();
 data.p.monthlyTransfer={id:'test',sourceId:'base-0-11',sourceName:'15パック',timestamp:Date.now(),previousWarehouse:0,previousUsed:0,actorUid:'store_root'};
 await assertFails(set(ref(staff,'inventory/a'),data));
 await assertSucceeds(set(ref(admin,'inventory/a'),data));
});
test('authenticated append-only history records require the real actor and current timestamp',async()=>{
 await assertSucceeds(set(ref(staff,'history/a/new'),{action:'monthly_transfer',timestamp:Date.now(),actorUid:'store_a',detail:'反映',changes:[{target:'p',name:'x',warehouse:500,used:66}]}));
 await assertFails(set(ref(staff,'history/a/new'),{action:'changed',timestamp:Date.now(),actorUid:'store_a'}));
 await assertFails(remove(ref(staff,'history/a/original')));
 await assertFails(set(ref(staff,'history/a/fake-actor'),{action:'x',timestamp:Date.now(),actorUid:'store_root'}));
 await assertFails(set(ref(staff,'history/b/fake'),{action:'x',timestamp:Date.now(),actorUid:'store_a'}));
});
test('authenticated admins retain inventory/department/template management',async()=>{
 await assertSucceeds(get(ref(admin,'inventory')));
 await assertSucceeds(set(ref(admin,'inventory/b/new'),product));
 await assertSucceeds(set(ref(admin,'departments/new'),'新部門'));
 await assertFails(set(ref(staff,'departments/new'),'偽部門'));
 await assertSucceeds(set(ref(admin,'inventoryTemplates/takeout/p'),product));
 await assertFails(get(ref(staff,'inventoryTemplates')));
});

test('Spark monthly multi-location write is atomic and rejects invalid or foreign targets',async()=>{
 await env.withSecurityRulesDisabled(async context=>set(ref(context.database(),'inventory/a/spark'),product));
 await assertSucceeds(update(ref(staff,'inventory/a'),{'p/warehouse':500,'p/used':100,'spark/warehouse':0,'spark/used':0}));
 assert.equal((await get(ref(staff,'inventory/a/p/used'))).val(),100);
 await assertFails(update(ref(staff,'inventory/a'),{'p/warehouse':7,'spark/used':-1}));
 assert.equal((await get(ref(staff,'inventory/a/p/warehouse'))).val(),500);
 await assertFails(update(ref(staff),{'inventory/a/p/warehouse':7,'inventory/b/p/used':2}));
 assert.equal((await get(ref(staff,'inventory/a/p/warehouse'))).val(),500);
});
