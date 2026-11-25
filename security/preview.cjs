'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const publicRoot=path.resolve(__dirname,'../dist');
const config=JSON.parse(fs.readFileSync(path.join(__dirname,'../firebase.json'),'utf8'));
http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const target=path.resolve(publicRoot,'.'+(name==='/'?'/index.html':name));
 if(!target.startsWith(publicRoot+path.sep)){res.writeHead(403);return res.end();}
 try{
  let content=fs.readFileSync(target);
  for(const header of config.hosting.headers[0].headers){
   if(header.key==='Strict-Transport-Security')continue;
   let value=header.value;
   if(header.key==='Content-Security-Policy')value=value.replace('; upgrade-insecure-requests','').replace("connect-src 'self'","connect-src 'self' http://127.0.0.1:9099 http://127.0.0.1:9000 http://127.0.0.1:5001 ws://127.0.0.1:9000");
   res.setHeader(header.key,value);
  }
  if(name==='/js/runtime-config.js')content=Buffer.from('window.InventoryRuntime = Object.freeze({emulators:true,appCheckSiteKey:""});');
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'})[path.extname(target)]||'application/octet-stream');
  res.end(content);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(8765,'127.0.0.1',()=>console.log('Local emulator-only preview: http://127.0.0.1:8765/'));
