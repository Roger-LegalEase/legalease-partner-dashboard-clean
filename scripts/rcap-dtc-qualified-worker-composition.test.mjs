import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {QUALIFIED_WORKER_IMAGE,QUALIFIED_WORKER_EVIDENCE,requireQualifiedWorkerImage,admitQualifiedWorkerImage} from './worker-once-preparation/qualified-worker-image.mjs';
import {dockerOnceInvocation,IMAGE,SOURCE} from './worker-once-preparation/ordinary-worker-once.mjs';
import {mainSavedDtc,assertSavedDtcDispatch} from './rcap-hosted-saved-dtc-entry.mjs';
import {DTC} from './rcap-hosted-saved-dtc-contracts.mjs';
import {EXISTING_MODE,EXISTING_HISTORY} from './rcap-dtc-existing-fulfillment.mjs';
import {runSavedDtcFulfillment} from './rcap-hosted-saved-dtc-fulfillment.mjs';
import {createSavedDtcWorkerBinding} from './rcap-hosted-saved-dtc-worker.mjs';
import {requireFrozenPaidWindow} from './paid-dtc-worker-once-preparation/paid-dtc-continuous-window.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
test('unpublished84a worker holds actual existing-DTC entry before auth; creator, Pay preparation, Clinic retry guards and default324 retained',async()=>{
 assert.equal(QUALIFIED_WORKER_IMAGE.source,'84a75b6e65dc69e6c371afac44f1284e0debf722');
 assert.equal(QUALIFIED_WORKER_IMAGE.digest,null);assert.equal(QUALIFIED_WORKER_IMAGE.image,null);
 assert(Object.values(QUALIFIED_WORKER_EVIDENCE).every(x=>x===null));
 assert.throws(()=>requireQualifiedWorkerImage(),/HOLD before authentication/);
 assert.throws(()=>requireQualifiedWorkerImage({...QUALIFIED_WORKER_IMAGE}),/source-reviewed/);
 assert.throws(()=>admitQualifiedWorkerImage({}),/HOLD before authentication/);
 assert.throws(()=>createSavedDtcWorkerBinding({identity:QUALIFIED_WORKER_IMAGE}),/HOLD before authentication/);
 assert.throws(()=>requireFrozenPaidWindow(null,{identity:QUALIFIED_WORKER_IMAGE}),/HOLD before authentication/);
 const oldCwd=process.cwd(),oldFetch=globalThis.fetch,oldExitCode=process.exitCode;
 const scratch=await fs.mkdtemp(path.join(os.tmpdir(),'f-dtc-null-image-check-'));let remote=0;
 try{
  process.chdir(scratch);await fs.writeFile('vercel.json',JSON.stringify({git:{deploymentEnabled:{source_check:false}}}));
  globalThis.fetch=async()=>{remote++;throw new Error('remote operation forbidden');};
  const result=await mainSavedDtc({DISPATCH_INPUTS:JSON.stringify({mode:EXISTING_MODE}),GITHUB_ACTIONS:'true',GITHUB_WORKFLOW_SHA:'source_only',GITHUB_SHA:'source_only',GITHUB_REF_NAME:'source_check'});
  assert.equal(result.phase,'HOLD_RECONCILE_NO_RETRY');assert.equal(remote,0);
  for(const [k,v] of Object.entries(EXISTING_HISTORY))assert.deepEqual(result[k],v);
  assert.deepEqual(await fs.readdir('dtc-saved-existing-fulfillment-evidence'),['result.json']);
  const records=[];const io=new Proxy({checkpoint:async x=>records.push(x)},{get:(target,key)=>key in target?target[key]:()=>{throw new Error('unexpected port '+String(key));}});
  const held=await runSavedDtcFulfillment({mode:EXISTING_MODE,workerIdentity:QUALIFIED_WORKER_IMAGE},io);
  assert.equal(held.phase,'HOLD_RECONCILE_NO_RETRY');assert.equal(records.length,1);
 }finally{process.chdir(oldCwd);globalThis.fetch=oldFetch;process.exitCode=oldExitCode;await fs.rm(scratch,{recursive:true});}
 assertSavedDtcDispatch({mode:'dtc_saved_fulfillment',application_sha:DTC.app,tools_sha:DTC.tools,worker_source_sha:DTC.worker,worker_digest:DTC.digest,supabase_project_ref:DTC.project,preview_deployment_id:DTC.deploymentId,preview_hostname:new URL(DTC.origin).hostname,preview_creation_run_id:'40441747499',resume_matter_id:DTC.item});
 const env={NEXT_PUBLIC_SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co',SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co',ENABLE_SUPABASE_PARTNER_DATA:'true',RCAP_WORKER_CLAIM_SECONDS:'120',RCAP_WORKER_CONTAINER_DIGEST:DTC.digest,SUPABASE_SERVICE_ROLE_KEY:'fixture.'+Buffer.from(JSON.stringify({ref:'hyflxnlhpmiqxvvcoiia',role:'service_role',exp:Math.ceil(Date.now()/1000)+1000})).toString('base64url')+'.fixture'};
 const invocation=dockerOnceInvocation(env,'12345');assert(invocation.args.includes(IMAGE));assert.equal(SOURCE,DTC.worker);assert.equal(invocation.options.env.RCAP_WORKER_CONTAINER_DIGEST,DTC.digest);
 assert.throws(()=>dockerOnceInvocation(env,'12345',QUALIFIED_WORKER_IMAGE),/HOLD before authentication/);
 const shared=await fs.readFile(new URL('./worker-once-preparation/ordinary-worker-once.mjs',import.meta.url),'utf8');
 assert.equal(hash(shared.slice(shared.indexOf('function assertSnapshot('),shared.indexOf('function rowsThatChanged('))),'be11d7352597ee1d823427f4020a519b0c798bec066d9cff999799c9d2970527');
 for(const [file,pin] of Object.entries({"scripts/rcap-hosted-saved-dtc-contracts.mjs": "6157d6b4669db26feb4976d99f2be9df62a56d8113005a0672ad3d8de9f4e416", "scripts/rcap-hosted-saved-dtc-target.mjs": "2b00f45ee143029fd5780f5a41575a764c6c31bee15de87536bfb771dd83ecf0", "scripts/rcap-saved-dtc-stripe-checkout-browser.mjs": "2d84f13ede971b6c96edcac15ecb3ca99fa50e54b24ef91316d6ff3a74d7014f", "scripts/rcap-dtc-existing-fulfillment.mjs": "dc884bf0b2b438849fab42ba0b4f1a34b97579f1abccec1aadb2221bb0591206"}))assert.equal(hash(await fs.readFile(new URL('../'+file,import.meta.url))),pin,file);
});

test('new execution identity also blocks URL preparation before context, provider or subprocess; inverse has no qualification dependency',async()=>{
 const {prepareRetarget}=await import('./paid-dtc-worker-once-preparation/paid-dtc-retarget-operator.mjs');
 let remote=0,commands=0;
 await assert.rejects(prepareRetarget({DISPATCH_INPUTS:JSON.stringify({mode:EXISTING_MODE})},{fetcher:async()=>{remote++;},runCommand:()=>{commands++;}}),/HOLD before authentication/);
 assert.equal(remote,0);assert.equal(commands,0);
 const source=await fs.readFile(new URL('./paid-dtc-worker-once-preparation/paid-dtc-retarget-operator.mjs',import.meta.url),'utf8');
 const restore=source.slice(source.indexOf('export async function restoreRetarget('),source.indexOf('export async function main('));
 assert(!restore.includes('requireQualifiedWorkerImage'));
});
