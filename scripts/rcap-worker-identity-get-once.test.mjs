import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {inspectWorkerOnce} from './rcap-worker-identity-get-once.mjs';

test('one corrected-header GET preserves transport guards and projects identity only',async()=>{
 let calls=0;
 const result=await inspectWorkerOnce({token:'FlyV1 fm2_SYNTHETIC_PRIVATE',fetchImpl:async(url,options)=>{
   calls++;
   assert.equal(url,'https://api.machines.dev/v1/apps/legalease-rcap-render-worker/machines');
   assert.equal(options.method,'GET');assert.equal(options.redirect,'error');
   assert.equal(options.headers.Authorization,'FlyV1 fm2_SYNTHETIC_PRIVATE');
   assert(options.signal instanceof AbortSignal);
   return {ok:true,status:200,json:async()=>[{id:'synthetic-machine',state:'started',config:{env:{SECRET:'RAW_PRIVATE_SENTINEL'},services:['RAW_PRIVATE_SENTINEL']}}]};
 }});
 assert.equal(calls,1);assert.equal(result.requestCount,1);assert.equal(result.httpStatus,200);assert.equal(result.passed,true);
 assert.equal(result.identity.machines[0].id,'synthetic-machine');
 assert(!JSON.stringify(result).includes('RAW_PRIVATE_SENTINEL'));assert(!JSON.stringify(result).includes('SYNTHETIC_PRIVATE'));
});
test('denied, transport and malformed-identity results are safe and never retry',async()=>{
 for(const [response,status] of [[{ok:false,status:403},403],[{ok:false,status:401},401],[{ok:true,status:200,json:async()=>[{}]},200],[null,null]]){
   let calls=0;
   const result=await inspectWorkerOnce({token:'FlyV1 fm2_SYNTHETIC_PRIVATE',fetchImpl:async()=>{calls++;if(!response)throw Error('RAW_PRIVATE_SENTINEL');return response;}});
   assert.equal(result.passed,false);assert.equal(result.httpStatus,status);assert.equal(result.requestCount,1);assert.equal(calls,1);
   assert(!JSON.stringify(result).includes('RAW_PRIVATE_SENTINEL'));assert(!JSON.stringify(result).includes('SYNTHETIC_PRIVATE'));
 }
});
test('original controls fail before any request and without echoing the credential',async()=>{
 let calls=0;
 const result=await inspectWorkerOnce({token:'FlyV1 fm2_SYNTHETIC_PRIVATE\n',fetchImpl:async()=>{calls++;throw Error('must not run');}});
 assert.equal(calls,0);assert.equal(result.requestCount,0);assert.equal(result.httpStatus,null);assert.equal(result.passed,false);
 assert(!JSON.stringify(result).includes('SYNTHETIC_PRIVATE'));
});
test('CLI retains a safe receipt on actual mocked403 and exits1',()=>{
 const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'f-worker-get-cli-'));
 const moduleUrl=new URL('./rcap-worker-identity-get-once.mjs',import.meta.url);
 const program=`globalThis.fetch=async()=>({ok:false,status:403});process.argv[1]=${JSON.stringify(fileURLToPath(moduleUrl))};await import(${JSON.stringify(moduleUrl.href)});`;
 try{
   const result=spawnSync(process.execPath,['--input-type=module','-e',program],{cwd,env:{FLY_API_TOKEN:'FlyV1 fm2_SYNTHETIC_PRIVATE'},encoding:'utf8',timeout:5000});
   assert.equal(result.status,1);assert.equal(result.stderr,'');
   const receipt=JSON.parse(fs.readFileSync(path.join(cwd,'worker-identity-evidence/get-result.json'),'utf8'));
   assert.equal(receipt.httpStatus,403);assert.equal(receipt.passed,false);assert.equal(receipt.requestCount,1);
   assert.equal(receipt.reason,'Fly identity GET HTTP 403; provider details withheld.');
   assert(!result.stdout.includes('SYNTHETIC_PRIVATE'));assert(!JSON.stringify(receipt).includes('SYNTHETIC_PRIVATE'));
 }finally{fs.rmSync(cwd,{recursive:true});}
});
