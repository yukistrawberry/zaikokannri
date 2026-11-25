'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const settings={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'js/sync-mappings.js'),'utf8'),settings);
fs.writeFileSync(path.join(root,'functions/sync-mappings.json'),JSON.stringify(settings.window.InventorySyncMappings,null,2)+'\n');
fs.copyFileSync(path.join(root,'js/transfer-core.js'),path.join(root,'functions/transfer-core.cjs'));
const configFile=path.join(root,'firebase.json'),config=JSON.parse(fs.readFileSync(configFile,'utf8'));
const csp="default-src 'self'; script-src 'self' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data:; connect-src 'self' https://*.googleapis.com https://www.google.com/recaptcha/ https://*.firebaseio.com wss://*.firebaseio.com https://*.firebasedatabase.app wss://*.firebasedatabase.app; frame-src https://*.firebaseapp.com https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; upgrade-insecure-requests";
const headers=config.hosting.headers[0].headers;
const old=headers.find(header=>header.key==='Content-Security-Policy');
if(old) old.value=csp; else headers.push({key:'Content-Security-Policy',value:csp});
fs.writeFileSync(configFile,JSON.stringify(config,null,2)+'\n');
const dist=path.join(root,'dist');fs.mkdirSync(dist,{recursive:true});
for(const name of ['index.html','daily.html','monthly.html','admin.html'])fs.copyFileSync(path.join(root,name),path.join(dist,name));
for(const name of ['css','js'])fs.cpSync(path.join(root,name),path.join(dist,name),{recursive:true});
for(const name of ['index.html','daily.html','monthly.html','admin.html']){
 const html=fs.readFileSync(path.join(dist,name),'utf8');
 if(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i.test(html))throw new Error(`Inline script in ${name}`);
 if(/\son(?:click|change|load|error)\s*=/i.test(html))throw new Error(`Inline event in ${name}`);
 for(const [,value] of html.matchAll(/(?:src|href)="([^"]+)"/g)){
  if(/^(https?:|data:|#)/.test(value))continue;
  if(!fs.existsSync(path.join(dist,value)))throw new Error(`Missing asset ${value}`);
 }
}
console.log('Built allowlisted public assets and matching server-side product rules. No private tooling is published.');
