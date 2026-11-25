'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
test('public build contains only frontend assets and no private administration tooling',()=>{
 const names=fs.readdirSync(path.join(root,'dist'));
 assert.deepEqual([...names].sort(),['admin.html','css','daily.html','index.html','js','monthly.html']);
 for(const name of ['admin.html','index.html','daily.html','monthly.html']){
  const text=fs.readFileSync(path.join(root,'dist',name),'utf8');
  assert.doesNotMatch(text,/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i);
  assert.doesNotMatch(text,/\son(click|change|error|load)\s*=/i);
 }
});
test('production functions enforce App Check; HTTPS headers and CSP block inline scripts',()=>{
 const index=fs.readFileSync(path.join(root,'functions/index.cjs'),'utf8');assert.match(index,/enforceAppCheck:process.env.FUNCTIONS_EMULATOR!=='true'/);
 const headers=JSON.parse(fs.readFileSync(path.join(root,'firebase.json'),'utf8')).hosting.headers[0].headers;
 const csp=headers.find(h=>h.key==='Content-Security-Policy').value;
 assert.match(csp,/script-src 'self'/);assert.doesNotMatch(csp,/script-src[^;]*'unsafe-inline'/);
 assert.match(csp,/frame-ancestors 'none'/);assert.ok(headers.some(h=>h.key==='Strict-Transport-Security'));
});
test('server and browser use identical quantity algorithms and canonical product mappings',()=>{
 assert.equal(fs.readFileSync(path.join(root,'functions/transfer-core.cjs'),'utf8'),fs.readFileSync(path.join(root,'js/transfer-core.js'),'utf8'));
 const mappings=require('../../functions/sync-mappings.json');assert.equal(Object.keys(mappings.sakaihigashi).length,16);
 assert.ok(!Object.values(mappings.sakaihigashi).some(m=>m.target==='-OycLiNflhgYG4l2oe7q'));
 const admin=fs.readFileSync(path.join(root,'js/admin-app.js'),'utf8');assert.doesNotMatch(admin,/onclick=|onchange=/);
 assert.doesNotMatch(fs.readFileSync(path.join(root,'js/auth.js'),'utf8'),/ensureDefaultAdmin|hashPassword|setItem\('inventory_auth'/);
});
