const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const core=require('../../js/transfer-core.js');
test('Spark one-click handler writes mapped quantities and history without callable services',async()=>{
 let click,updates,history,allow = false;
 const session={uid:'store_a',storeId:'a',role:'user',storeName:'A'};
 const elements={};for(const key of ['transferSend','transferMessage','header-store-name','logout-btn'])elements[key]={textContent:'',classList:{toggle(){}},addEventListener(event,fn){if(key==='transferSend')click=fn;}};
 const panel={className:'',innerHTML:'',setAttribute(){},removeAttribute(){}};
 const sandbox={InventoryConfirm:async()=>allow,Auth:{ready:async()=>{},getSession:()=>session,onChange(){}},location:{replace(){throw Error('redirect');}},document:{createElement:()=>panel,querySelector:()=>({before(){}}),getElementById:id=>elements[id]},window:{InventorySyncMappings:{a:{id:{target:'p',factor:1,sourceUnit:'枚',splitUnit:100}}},addEventListener(){}},catalog:[{name:'x',items:[{id:'id',name:'pack',unit:'枚'}]}],inventory:{id:[600]},makeLegacyKey:()=>'',getValues:()=>[600],flushInventorySave(){},InventoryTransfer:core,
 database:{ref(path){if(!path)return {push:()=>({key:'transfer'})};if(path==='inventory/a')return {once:async()=>({val:()=>({p:{name:'pack',department:'パック',warehouse:5,used:1}})}),update:async value=>{updates=value;}};return {push:async value=>{history=value;}};}},firebase:{database:{ServerValue:{TIMESTAMP:{'.sv':'timestamp'}}}}};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../../js/monthly-integration.js'),'utf8'),sandbox);
 await new Promise(resolve=>setImmediate(resolve));await click();
 assert.equal(updates,undefined);assert.equal(history,undefined);
 allow = true; await click();
 assert.equal(updates['p/warehouse'],500);assert.equal(updates['p/used'],100);assert.equal(updates['p/monthlyTransfer'].actorUid,session.uid);
 assert.equal(history.actorUid,session.uid);assert.match(elements.transferMessage.textContent,/1商品を反映/);
 assert.equal(elements.transferSend.disabled,false);
});
