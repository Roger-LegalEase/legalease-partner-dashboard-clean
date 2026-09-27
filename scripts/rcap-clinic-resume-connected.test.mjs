import {execFileSync} from 'node:child_process';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {chromium} from 'playwright';
import {startConnectedFixture} from './rcap-clinic-resume-connected-fixture.mjs';
import {createResumeBrowserLifecycle} from './rcap-clinic-resume-browser-lifecycle.mjs';
import {createResumeBrowserPorts} from './rcap-clinic-resume-browser-ports.mjs';
import {runResumeProof,RESUME,CHECKPOINT,classifyResumeLifecycle} from './rcap-clinic-resume-contract.mjs';
import {handleResumeRequest,createNetworkEvidence,ACCEPTANCE_ORIGIN} from './rcap-clinic-resume-network-policy.mjs';
import {finishResume,resumeFailureRecord,writeResumeFailureRecord} from './rcap-clinic-resume-browser-reset.mjs';
const fixture=process.env.RCAP_CONNECTED_FIXTURE;assert.ok(fixture,'RCAP_CONNECTED_FIXTURE required: build sign-in fixture with --connected');
const config={project:RESUME.project,serverCaptchaRequired:false,frontend:{clientCaptchaRequired:false,widgetSiteKeyConfigured:true},syntheticProfile:'bounded no-analytics Clinic resume'};
const deferred=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve:v=>resolve(v)}};
async function connected(fault,{run=runResumeProof,baseline=false}={}){
 const service=await startConnectedFixture(fixture),browser=await chromium.launch({headless:true}),violations=[],network=createNetworkEvidence(),progress=[],milestones=[],diagnostics=[],outdir=fs.mkdtempSync(path.join(os.tmpdir(),'resume-connected-result-'));let phase='contract',result,error,reads=0;
 const blocked=deferred(),release=deferred();
 const handleRequest=async route=>{
  const u=new URL(route.request().url());
  if(u.pathname==='/pending-handler'){blocked.resolve();await release.promise;throw new Error('synthetic outstanding route rejection');}
  // The external GoTrue boundary is a disposable local credential/session
  // service. All production policy checks still execute; no hosted request.
  if(u.origin===ACCEPTANCE_ORIGIN){let authResult;const wrapped={request:()=>route.request(),fetch:async options=>{assert.equal(options.headers['x-vercel-protection-bypass'],undefined);assert.equal(options.headers['x-vercel-skip-toolbar'],undefined);authResult=await service.auth(route);return {status:()=>authResult.status,json:async()=>authResult.body}},fulfill:()=>route.fulfill({status:authResult.status,json:authResult.body}),abort:()=>route.abort()};return handleResumeRequest(wrapped,{origin:service.origin,bypass:'synthetic',violations,captchaPolicy:config,network});}
  return handleResumeRequest(route,{origin:service.origin,bypass:'synthetic',violations,captchaPolicy:config,network});
 };
 const activity=createResumeBrowserLifecycle({browser,handleRequest,violations});
 // Force a real replacement document after readiness and before credential
 // entry. The production sign-in helper must refuse its missing document nonce.
 if(fault==='readiness-document-change'){
  const context=activity.context;activity.context=async options=>{const c=await context(options),newPage=c.newPage.bind(c);c.newPage=async()=>{const p=await newPage(),locator=p.locator.bind(p);p.locator=(selector,...args)=>{const l=locator(selector,...args);if(selector==='input[name="email"]'){const fill=l.fill.bind(l);l.fill=async value=>{await p.goto(p.url(),{waitUntil:'domcontentloaded'});return fill(value)}}return l};return p};return c};
 }
 const ports=createResumeBrowserPorts({activity,origin:service.origin,bypass:'synthetic',password:service.password,query:service.query,project:RESUME.project,observed:(name,p)=>{milestones.push(name);if(name==='signInDiagnostics')diagnostics.push(p);}});
 const reset=ports.resetDevice;ports.resetDevice=async()=>{const r=await reset();if(fault==='handler-rejection'){const p=browser.contexts()[0].pages().at(-1);void p.evaluate(()=>fetch('/pending-handler').catch(()=>{})).catch(()=>{});await blocked.promise;}return r};
 const finish=ports.finishBrowserActivity;ports.finishBrowserActivity=async()=>{if(fault==='shutdown-failure'){const original=browser.close.bind(browser);browser.close=async()=>{browser.close=original;await original();throw Error('synthetic close response failure')}}const promise=finish();if(fault==='handler-rejection')release.resolve();return promise};
 const snapshot=async()=>{reads++;if(reads===5&&['late-network','late-download'].includes(fault)){const p=browser.contexts()[0].pages().at(-1);await p.evaluate(url=>fetch(url).catch(()=>null),fault==='late-download'?`/api/rcap/packets/%62${RESUME.job.slice(1)}/download`:'https://unrecognized.invalid/late');}if(service.count.closures&&fault==='readback')throw Error('synthetic readback failure');return service.snapshot()};
 try{
  result=await run({...ports,snapshot,sourceRun:'local-disposable-connected',requireSuccessorPreview:async()=>({deploymentId:CHECKPOINT.previewId,applicationSha:'af638b61cc4b74afad972fa79c4c1ca3f6709540',fixture:true}),violations:()=>[...violations],recordProgress:async entry=>{progress.push(entry);if(fault==='record-violation'&&entry.stage==='closure_requested')violations.push('synthetic violation during evidence write');if(fault==='record-failure'&&entry.stage==='closure_requested')throw Error('synthetic evidence failure');},closeExactSession:async()=>{if(!baseline){activity.assertFinished();assert.deepEqual(violations,[]);}await service.closeExactSession();if(fault==='lost-response')throw Error('synthetic committed response lost')}});
  finishResume({receipt:result,assertNoViolations:()=>assert.deepEqual(violations,[]),resultPath:path.join(outdir,'clinic-resume-result.json'),write:(p,s)=>{if(['result-write','failure-record'].includes(fault))throw Error('synthetic ENOSPC');fs.writeFileSync(p,s)},setPhase:p=>phase=p});
 }catch(e){try{await activity.finish()}catch{}error=resumeFailureRecord({error:e,stages:progress.map(x=>x.stage),phase});writeResumeFailureRecord({failure:error,failurePath:path.join(outdir,'failure.json'),write:(p,s)=>{if(fault==='failure-record')throw Error('synthetic failure-record ENOSPC');fs.writeFileSync(p,s)},emit:line=>{if(fault==='failure-record')assert.ok(String(line).includes('closureCommitted'))},redact:String});}
 finally{release.resolve();try{await activity.finish()}catch{}await browser.close();}
 if(error)console.log(JSON.stringify({fault,diagnostics:diagnostics.at(-1),network:network.counts,violations,error,counts:service.count}));
 const after=await service.snapshot(),answer={fault: fault??'clean',result,error,counts:{...service.count},after,progress,milestones,network,activity:activity.observations(),resultFile:fs.existsSync(path.join(outdir,'clinic-resume-result.json'))};await service.close();return answer;
}
test('complete connected path: real compiled form/ready view/queue, application denials, shipped reset helper, browser drain, canonical PG closure, readback and result',async()=>{
 const r=await connected();assert.equal(r.error,undefined,JSON.stringify(r.error));assert.equal(r.result.passed,true);assert.equal(r.resultFile,true);assert.equal(r.counts.closures,1);assert.equal(r.counts.authRequests,5);assert.equal(r.counts.ownerDeliveryRequests,0);assert.equal(r.counts.storageReads,0);assert.equal(r.counts.deliveryWrites,0);assert.equal(r.after.delivery.length,6);assert.equal(r.after.sessionAudit.length,1);assert.equal(classifyResumeLifecycle(r.after),'EXACT_RESET_CHECKPOINT');assert.deepEqual(r.result.finalCheckpointRun.browserCompletion,{finished:true,contexts:0,pendingHandlers:0,browserConnected:false,errors:0});for(const key of ['ownerSignIn','readyMatter','denials','queue','serverReset','deviceCleanup','handover'])assert.ok(r.milestones.includes(key),key);console.log(JSON.stringify({case:r.fault,counts:r.counts,deliveryEvents:r.after.delivery.length,closureAudits:r.after.sessionAudit.length,activity:r.activity,resultFile:r.resultFile}));
});
for(const fault of ['late-network','late-download','record-violation','handler-rejection','shutdown-failure','record-failure','readiness-document-change'])test('connected refusal before closure: '+fault,async()=>{const r=await connected(fault);assert.ok(r.error);assert.equal(r.counts.closures,0,JSON.stringify(r.error));assert.equal(r.error.closureCommitted,false);assert.equal(r.after.sessionAudit.length,0);assert.equal(r.after.delivery.length,6);assert.equal(r.counts.ownerDeliveryRequests,0);assert.equal(r.counts.storageReads,0);assert.equal(r.counts.deliveryWrites,0);assert.equal(r.resultFile,false);console.log(JSON.stringify({case:fault,stage:r.error.stage,closureCalls:0,deliveryEvents:6,activity:r.activity}));});
for(const fault of ['lost-response','readback','result-write','failure-record'])test('connected post-commit recovery: '+fault,async()=>{const r=await connected(fault);assert.ok(r.error);assert.equal(r.counts.closures,1);assert.equal(r.after.sessionAudit.length,1);assert.equal(r.after.delivery.length,6);assert.equal(classifyResumeLifecycle(r.after),'EXACT_RESET_CHECKPOINT');assert.equal(r.error.closureCommitted,fault==='lost-response'?'unknown_read_only_inventory_required':true);assert.equal(r.resultFile,false);console.log(JSON.stringify({case:fault,stage:r.error.stage,closureCommitted:r.error.closureCommitted,closureAudits:1,deliveryEvents:6}));});

// Execute the COMPLETE original contract module with the same actual browser
// callers and disposable external boundaries. Do not extract its orchestration
// function or replace shutdown with a boolean port. The old contract never calls
// the real finish operation; it can commit despite a late recorded violation.
const originalSource=execFileSync('git',['show','ea8eeb8717b1cf40a0e203fab5fa5aad449cd155:scripts/rcap-clinic-resume-contract.mjs'],{encoding:'utf8'}).replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${new URL(p,import.meta.url).href}'`);
const originalContract=await import('data:text/javascript;base64,'+Buffer.from(originalSource).toString('base64'));
for(const fault of ['late-network','record-violation'])test('before control: complete ea8 contract commits despite '+fault,async()=>{const r=await connected(fault,{run:originalContract.runResumeProof,baseline:true});assert.equal(r.counts.closures,1);assert.equal(r.after.sessionAudit.length,1);assert.equal(r.after.delivery.length,6);assert.equal(r.error.closureCommitted,true);assert.equal(r.resultFile,false);console.log(JSON.stringify({before:'ea8eeb871',fault,closureCalls:1,knownCommitted:true,deliveryEvents:6}));});
