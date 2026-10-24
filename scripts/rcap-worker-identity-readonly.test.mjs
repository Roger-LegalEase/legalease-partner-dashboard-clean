import test from 'node:test';
import assert from 'node:assert/strict';
import {readWorkerIdentity,APP,flyReadOnlyAuthorizationHeader} from './rcap-worker-identity-readonly.mjs';
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
 for(const value of [undefined,'','   ','FlyV1 missing\\nInjected: value','invalid multiple words']){
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
