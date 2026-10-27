import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {QUALIFIED_WORKER_IMAGE,QUALIFIED_WORKER_EVIDENCE,requireQualifiedWorkerImage,admitQualifiedWorkerImage} from './worker-once-preparation/qualified-worker-image.mjs';
import {dockerOnceInvocation,IMAGE,SOURCE} from './worker-once-preparation/ordinary-worker-once.mjs';
import {mainSavedDtc,assertSavedDtcDispatch} from './rcap-hosted-saved-dtc-entry.mjs';
import {DTC} from './rcap-hosted-saved-dtc-contracts.mjs';
import {EXISTING_MODE,EXISTING_HISTORY} from './rcap-dtc-existing-fulfillment.mjs';
import {requireFrozenPaidWindow} from './paid-dtc-worker-once-preparation/paid-dtc-continuous-window.mjs';
test('actual qualified84a technical records are immutable; new worker identity is separate from creator and does not admit missing fresh custody',async()=>{
 const names=['publication','publication-run','qualification','qualification-acceptance'];
 const files=Object.fromEntries(names.map(name=>[name,new URL('./dtc-qualified-worker-'+name+'.json',import.meta.url)]));
 const bytes=Object.fromEntries(await Promise.all(names.map(async name=>[name,await fs.readFile(files[name])])));
 const proof={publicationBytes:bytes.publication,publicationRun:JSON.parse(bytes['publication-run']),qualificationBytes:bytes.qualification,qualificationAcceptanceBytes:bytes['qualification-acceptance']};
 assert.equal(admitQualifiedWorkerImage(proof),QUALIFIED_WORKER_IMAGE);
 assert.equal(requireQualifiedWorkerImage(),QUALIFIED_WORKER_IMAGE);
 assert.equal(QUALIFIED_WORKER_EVIDENCE.qualificationRunId,'40505631029');
 const native=JSON.parse(bytes.qualification).jobs.find(j=>j.id===122194096589);
 assert.equal(native.run_id,40505631029);assert.equal(native.status,'completed');assert.equal(native.conclusion,'success');assert.equal(native.steps.length,25);assert(native.steps.every(s=>s.conclusion==='success'));
 for(const key of ['publicationBytes','qualificationBytes','qualificationAcceptanceBytes'])assert.throws(()=>admitQualifiedWorkerImage({...proof,[key]:Buffer.concat([proof[key],Buffer.from(' ')])}));
 assert.throws(()=>requireQualifiedWorkerImage({...QUALIFIED_WORKER_IMAGE}),/source-reviewed/);
 const input={mode:EXISTING_MODE,application_sha:DTC.app,tools_sha:DTC.tools,worker_source_sha:QUALIFIED_WORKER_IMAGE.source,worker_digest:QUALIFIED_WORKER_IMAGE.digest,supabase_project_ref:DTC.project,preview_deployment_id:DTC.deploymentId,preview_hostname:new URL(DTC.origin).hostname,preview_creation_run_id:'40441747499',resume_matter_id:DTC.item};
 assertSavedDtcDispatch(input);
 assert.throws(()=>assertSavedDtcDispatch({...input,worker_source_sha:DTC.worker,worker_digest:DTC.digest}));
 const oldCwd=process.cwd(),oldFetch=globalThis.fetch,oldExitCode=process.exitCode;
 const scratch=await fs.mkdtemp(path.join(os.tmpdir(),'f-dtc-qualified-image-check-'));let remote=0;
 try{
  process.chdir(scratch);await fs.writeFile('vercel.json',JSON.stringify({git:{deploymentEnabled:{source_check:false}}}));
  globalThis.fetch=async()=>{remote++;throw new Error('remote operation forbidden');};
  const env={DISPATCH_INPUTS:JSON.stringify(input),GITHUB_ACTIONS:'true',GITHUB_WORKFLOW_SHA:'source_only',GITHUB_SHA:'source_only',GITHUB_REF_NAME:'source_check'};
  for(const [key,name] of [['DTC_WORKER_PUBLICATION_FILE','publication'],['DTC_WORKER_PUBLICATION_RUN_FILE','publication-run'],['DTC_WORKER_QUALIFICATION_FILE','qualification'],['DTC_WORKER_QUALIFICATION_ACCEPTANCE_FILE','qualification-acceptance']]){
   const target=path.join(scratch,name+'.json');await fs.writeFile(target,bytes[name],{mode:0o600});env[key]=target;
  }
  const result=await mainSavedDtc(env);assert.equal(result.phase,'HOLD_RECONCILE_NO_RETRY');assert.equal(remote,0);
  for(const [k,v] of Object.entries(EXISTING_HISTORY))assert.deepEqual(result[k],v);
  const saved=await fs.readdir('dtc-saved-existing-fulfillment-evidence');assert(saved.includes('result.json'));
  const admission=JSON.parse(await fs.readFile('dtc-saved-existing-fulfillment-evidence/checkpoint-001.json'));
  assert.equal(admission.phase,'execution_worker_technical_evidence_admitted');assert.equal(admission.workerSourceSha,QUALIFIED_WORKER_IMAGE.source);assert.equal(admission.creatorWorkerSourceSha,DTC.worker);
 }finally{process.chdir(oldCwd);globalThis.fetch=oldFetch;process.exitCode=oldExitCode;await fs.rm(scratch,{recursive:true});}
 const jwt='fixture.'+Buffer.from(JSON.stringify({ref:'hyflxnlhpmiqxvvcoiia',role:'service_role',exp:Math.ceil(Date.now()/1000)+1000})).toString('base64url')+'.fixture';
 const env={NEXT_PUBLIC_SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co',SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co',ENABLE_SUPABASE_PARTNER_DATA:'true',RCAP_WORKER_CLAIM_SECONDS:'120',RCAP_WORKER_CONTAINER_DIGEST:DTC.digest,SUPABASE_SERVICE_ROLE_KEY:jwt};
 assert(dockerOnceInvocation(env,'12345').args.includes(IMAGE));assert.equal(SOURCE,DTC.worker);
 assert(dockerOnceInvocation({...env,RCAP_WORKER_CONTAINER_DIGEST:QUALIFIED_WORKER_IMAGE.digest},'12345',QUALIFIED_WORKER_IMAGE).args.includes(QUALIFIED_WORKER_IMAGE.image));
 assert.throws(()=>dockerOnceInvocation(env,'12345',QUALIFIED_WORKER_IMAGE));
 assert.throws(()=>requireFrozenPaidWindow(null,{identity:QUALIFIED_WORKER_IMAGE}),/source-bound|qualified native custody record/);
 const {prepareRetarget}=await import('./paid-dtc-worker-once-preparation/paid-dtc-retarget-operator.mjs');let commands=0;
 await assert.rejects(prepareRetarget({DISPATCH_INPUTS:JSON.stringify({mode:EXISTING_MODE})},{fetcher:async()=>{commands++;},runCommand:()=>{commands++;}}));assert.equal(commands,0);
});
