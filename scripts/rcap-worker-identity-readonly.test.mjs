import test from 'node:test';
import assert from 'node:assert/strict';
import {readWorkerIdentity,APP,flyReadOnlyAuthorizationHeader,classifyWorkerRuntime} from './rcap-worker-identity-readonly.mjs';
test('Fly identity permits only the fixed GET and emits identities without raw environment or credentials',async()=>{
 const calls=[];
 const result=await readWorkerIdentity({token:'synthetic-token',fetchImpl:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>[{id:'synthetic-machine',state:'started',config:{image:'registry.fly.io/example@sha256:synthetic',env:{SECRET:'synthetic-hidden',RCAP_WORKER_CONTAINER_DIGEST:'sha256:accepted'},metadata:{rcap_worker_source_sha:'source'},services:[{secret:'hidden'}]},image_ref:{digest:'sha256:fly',labels:{'org.opencontainers.image.revision':'revision'}}}]};}});
 assert.equal(calls.length,1);assert.equal(calls[0].url,`https://api.machines.dev/v1/apps/${APP}/machines`);assert.equal(calls[0].options.method,'GET');assert.equal(calls[0].options.redirect,'error');
 assert.equal(result.readOnly,true);assert.equal(result.machines[0].imageDigest,'sha256:fly');assert.equal(result.machines[0].ociRevision,'revision');
 assert(!JSON.stringify(result).includes('hidden'));assert(!JSON.stringify(result).includes('synthetic-token'));
});
test('missing credential, failed GET and malformed identity fail closed',async()=>{
 await assert.rejects(readWorkerIdentity({}),/credential/);
 await assert.rejects(readWorkerIdentity({token:'synthetic',fetchImpl:async()=>({ok:false,status:403})}),/HTTP 403/);
 await assert.rejects(readWorkerIdentity({token:'synthetic',fetchImpl:async()=>({ok:true,json:async()=>[{}]})}),/Incomplete/);
});

for(const [label,token,expected] of [
 ['FlyV1 scoped token','FlyV1 fm2_FAKE_TOKEN','FlyV1 fm2_FAKE_TOKEN'],
 ['bare fm2 scoped token','fm2_FAKE_TOKEN','FlyV1 fm2_FAKE_TOKEN'],
 ['raw historical token','fo1_FAKE_TOKEN','Bearer fo1_FAKE_TOKEN'],
 ['explicit bearer token','Bearer fo1_FAKE_TOKEN','Bearer fo1_FAKE_TOKEN'],
 ['padded FlyV1 token','  FlyV1 fm2_FAKE_TOKEN  ','FlyV1 fm2_FAKE_TOKEN'],
]){
 test(label+' preserves expected GET-only Authorization',async()=>{
   let observed;
   const fetchImpl=async(url,options)=>{
     observed={url,method:options.method,redirect:options.redirect,authorization:options.headers.Authorization};
     return {ok:true,json:async()=>[{id:'test-machine',state:'started'}]};
   };
   const result=await readWorkerIdentity({token,fetchImpl});
   assert.deepEqual(observed,{url:`https://api.machines.dev/v1/apps/${APP}/machines`,method:'GET',redirect:'error',authorization:expected});
   assert.equal(result.readOnly,true);
   assert.equal(result.machines[0].id,'test-machine');
 });
}
test('malformed credential is refused before any network request',()=>{
 for(const value of [undefined,'','   ','FlyV1 missing'+String.fromCharCode(10)+'Injected: value','invalid multiple words']){
   assert.throws(()=>flyReadOnlyAuthorizationHeader(value),/credential/i);
 }
});
test('Fly access 403 remains fail-closed and does not print the credential',async()=>{
 const token='FlyV1 fm2_FAKE_TOKEN';
 await assert.rejects(
   readWorkerIdentity({token,fetchImpl:async()=>({ok:false,status:403})}),
   error=>error.message==='Fly identity GET HTTP 403'&&!error.message.includes(token)
 );
});

test('original credential controls are refused before fetch or normalization',async()=>{
 for(const code of [...Array(32).keys(),127]){
   const control=String.fromCharCode(code);
   for(const token of [control+'FlyV1 fm2_FAKE_TOKEN','FlyV1 fm2_FAKE_TOKEN'+control,'FlyV1'+control+'fm2_FAKE_TOKEN','fm2_FAKE'+control+'_TOKEN']){
     let calls=0;
     await assert.rejects(readWorkerIdentity({token,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>[]};}}),error=>error.message==='Malformed Fly credential');
     assert.equal(calls,0,`control ${code} must not reach fetch`);
   }
 }
});


test('same identity GET captures safe runtime classifications and preserves existing rollback projection',async()=>{
 const hidden='SYNTHETIC_PRIVATE_CANARY_NEVER_EMIT';let calls=0;
 const machine={id:'synthetic',state:'started',config:{image:'registry.fly.io/example@sha256:synthetic',init:{exec:['node','scripts/rcap-render-worker.mjs','--loop']},env:{SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co',SUPABASE_SERVICE_ROLE_KEY:hidden,RCAP_WORKER_CONTAINER_DIGEST:'sha256:accepted'}},image_ref:{digest:'sha256:fly'}};
 const result=await readWorkerIdentity({token:hidden,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>[machine]};}});
 assert.equal(calls,1);
 assert.deepEqual(result.runtimeClassifications,[{machineId:'synthetic',command:'known_loop',configuredSupabaseHost:'acceptance',basis:'returned_machine_config_only'}]);
 assert.deepEqual(result.machines,[{id:'synthetic',state:'started',imageReference:machine.config.image,imageDigest:'sha256:fly',imageRegistry:null,imageRepository:null,ociRevision:null,recordedSourceSha:null,acceptedDigest:'sha256:accepted'}]);
 assert(!JSON.stringify(result).includes(hidden));assert(!JSON.stringify(result).includes('https://hyflxnlhpmiqxvvcoiia.supabase.co'));
});

test('command classification accepts only complete explicit known invocations and never infers image defaults',()=>{
 const classify=init=>classifyWorkerRuntime({init}).command;
 assert.equal(classify(undefined),'image_default');assert.equal(classify({}),'image_default');
 assert.equal(classify({exec:['node','scripts/rcap-render-worker.mjs','--loop']}),'known_loop');
 assert.equal(classify({entrypoint:['node'],cmd:['scripts/rcap-render-worker.mjs','--loop']}),'known_loop');
 assert.equal(classify({entrypoint:[],cmd:['node','scripts/rcap-render-worker.mjs','--loop']}),'unknown');
 assert.equal(classify({exec:['node','-e','process.exit(0)']}),'known_health_only');
 for(const init of [null,[],false,{exec:[]},{cmd:['node','scripts/rcap-render-worker.mjs','--loop']},{entrypoint:['node']},{entrypoint:['node','scripts/rcap-render-worker.mjs','--loop'],cmd:[]},{exec:['node','scripts/rcap-render-worker.mjs','--once']},{exec:['sh','-c','node scripts/rcap-render-worker.mjs --loop']},{exec:['node','scripts/rcap-render-worker.mjs','--loop'],cmd:['extra']},{exec:'node scripts/rcap-render-worker.mjs --loop'},{exec:[12]},{exec:['node','-e','process.exit(0); fetch(SYNTHETIC_SECRET)']}])assert.equal(classify(init),'unknown');
 assert.equal(classifyWorkerRuntime({image:'known-image',env:{RCAP_WORKER_MODE:'health_only'}}).command,'image_default','image identity and environment labels do not prove a default command');
});

test('Supabase target classification is limited to returned public URL host and absent secret-injected targets stay unproved',()=>{
 const classify=env=>classifyWorkerRuntime({env}).configuredSupabaseHost;
 const acceptance='https://hyflxnlhpmiqxvvcoiia.supabase.co',production='https://wwtwtsmywnckfkdaqqeg.supabase.co';
 assert.equal(classify(undefined),'absent');assert.equal(classify({}),'absent');
 assert.equal(classify({SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_URL:null,SUPABASE_SERVICE_ROLE_KEY:'SYNTHETIC_PRIVATE'}),'absent');
 assert.equal(classify({SUPABASE_URL:acceptance}),'acceptance');
 assert.equal(classify({SUPABASE_URL:production,NEXT_PUBLIC_SUPABASE_URL:production+'/'}),'known_production');
 assert.equal(classify({SUPABASE_URL:'https://other.example.test'}),'other');
 assert.equal(classify({SUPABASE_URL:acceptance,NEXT_PUBLIC_SUPABASE_URL:production}),'inconsistent');
 assert.equal(classify({SUPABASE_URL:'https://one.example.test',NEXT_PUBLIC_SUPABASE_URL:'https://two.example.test'}),'inconsistent');
 for(const env of [null,[],false,{SUPABASE_URL:12},{SUPABASE_URL:'invalid SYNTHETIC_PRIVATE'},{SUPABASE_URL:'http://hyflxnlhpmiqxvvcoiia.supabase.co'},{SUPABASE_URL:'https://user:SYNTHETIC_PRIVATE@hyflxnlhpmiqxvvcoiia.supabase.co'},{SUPABASE_URL:acceptance+'?token=SYNTHETIC_PRIVATE'},{SUPABASE_URL:' '+acceptance},{SUPABASE_URL:acceptance+'/other'}]){
  const result=classifyWorkerRuntime({env});assert.equal(result.configuredSupabaseHost,'unknown');assert(!JSON.stringify(result).includes('SYNTHETIC_PRIVATE'));
 }
});


test('missing or malformed entire machine config is unknown and cannot imply an observed image default',()=>{
 for(const config of [undefined,null,[],false,12,'SYNTHETIC_PRIVATE_CONFIG'])assert.deepEqual(classifyWorkerRuntime(config),{command:'unknown',configuredSupabaseHost:'unknown',basis:'returned_machine_config_only'});
 assert.deepEqual(classifyWorkerRuntime({}),{command:'image_default',configuredSupabaseHost:'absent',basis:'returned_machine_config_only'});
});
