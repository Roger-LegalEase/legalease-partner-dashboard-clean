import test from 'node:test';
import assert from 'node:assert/strict';
import {readWorkerIdentity,APP} from './rcap-worker-identity-readonly.mjs';
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
