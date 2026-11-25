'use strict';
const {argsOf,projectConfig}=require('./project.cjs');
const {getAuth}=require('firebase-admin/auth'),{getDatabase}=require('firebase-admin/database');
function hiddenPassword(){
 if(!process.stdin.isTTY)throw new Error('Run in an interactive terminal; password input must not be logged or piped.');
 return new Promise((resolve,reject)=>{
  let value='';process.stdout.write('New administrator password (hidden): ');process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');
  const done=(error)=>{process.stdin.removeListener('data',onData);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');error?reject(error):resolve(value);};
  const onData=text=>{for(const character of text){if(character==='\u0003')return done(new Error('Cancelled.'));if(character==='\r'||character==='\n')return done();if(character==='\u007f'||character==='\b')value=value.slice(0,-1);else if(character>=' ')value+=character;}};
  process.stdin.on('data',onData);
 });
}
async function main(){
 const args=argsOf();
 if(!/^[a-z0-9_-]{1,64}$/.test(args.store||''))throw new Error('Specify --store with an existing or new administrator ID.');
 const {app}=projectConfig(args),auth=getAuth(app),db=getDatabase(app),uid=`store_${args.store}`;
 if(!args.apply){console.log('Preflight only. Re-run with --apply to enter a new strong administrator password.');return;}
 const role=args.role || 'admin';
 if(!['user','admin'].includes(role))throw new Error('Invalid --role.');
 const password=await hiddenPassword();
 if(password.length<12||password.length>128||!/[A-Za-z]/.test(password)||!/[0-9]/.test(password))throw new Error('Use 12–128 characters including letters and digits.');
 const existing=await auth.getUser(uid).catch(error=>{if(error.code==='auth/user-not-found')return null;throw error;});
 if(existing&&existing.email!==`${args.store}@inventory.invalid`)throw new Error('UID collision.');
 await db.ref(`access/${uid}/enabled`).set(false);
 if(existing)await auth.updateUser(uid,{password,disabled:false});
 else await auth.createUser({uid,email:`${args.store}@inventory.invalid`,password,displayName:args.name||args.store});
 await auth.setCustomUserClaims(uid,{storeId:args.store,role});await auth.revokeRefreshTokens(uid);
 await db.ref().update({[`access/${uid}`]:{storeId:args.store,role,enabled:true,validAfter:Math.floor(Date.now()/1000)+1},[`stores/${args.store}/name`]:args.name||args.store,[`stores/${args.store}/role`]:role,[`stores/${args.store}/storeType`]:role==='admin'?'admin':(args.type||'takeout'),[`stores/${args.store}/password`]:null});
 console.log('Administrator account prepared. No password was written to logs or files.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>require('firebase-admin/app').getApps().forEach(app=>app.delete()));
