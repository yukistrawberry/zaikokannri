'use strict';
const fs=require('node:fs'),path=require('node:path');
function argsOf(argv=process.argv.slice(2)) {
 const args={};
 for(let i=0;i<argv.length;i++) {if(!argv[i].startsWith('--'))throw new Error('Use named arguments.');args[argv[i].slice(2)]=argv[i+1]&&!argv[i+1].startsWith('--')?argv[++i]:true;}
 return args;
}
function projectConfig(args) {
 const source=fs.readFileSync(path.join(__dirname,'../js/firebase-config.js'),'utf8');
 const field=name=>source.match(new RegExp(`${name}\\s*:\\s*["']([^"']+)`))?.[1];
 const configured=field('projectId');
 if(!args.project||typeof args.project!=='string') throw new Error('Specify --project explicitly.');
 const emulator=args.emulator===true;
 if(emulator&&!args.project.startsWith('demo-'))throw new Error('Emulator operations must use a demo-* project.');
 if(!emulator&&args.project!==configured)throw new Error('The project does not match firebase-config.js.');
 if(emulator){process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099';process.env.FIREBASE_DATABASE_EMULATOR_HOST='127.0.0.1:9000';}
 const {initializeApp,applicationDefault}=require('firebase-admin/app');
 const app=initializeApp({projectId:args.project,databaseURL:emulator?`https://${args.project}.firebaseio.com`:field('databaseURL'),...(emulator?{}:{credential:applicationDefault()})},`operator-${Date.now()}`);
 return {app,emulator};
}
module.exports={argsOf,projectConfig};
