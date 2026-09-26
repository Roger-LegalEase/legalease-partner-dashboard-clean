#!/usr/bin/env node
// Dedicated existing-namespace proof. Default: read-only database inventory.
// NEVER imports seed/generate/worker execution. Future execution requires two
// explicit authorizations because the original handoff cookie was lost.
import assert from 'node:assert/strict';
import {handleResumeRequest} from './rcap-clinic-resume-network-policy.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {requireCurrentReleaseCandidate} from './grade-a-launch-control/verify-release-candidate-binding.mjs';
import {RESUME,CHECKPOINT,classifyDeliveryCheckpoint,classifyResumeLifecycle,queuePrivacySql,assertQueuePrivacyPrerequisites, resumeSql,requireResumeAuthorization,exactSessionClosureSql,runResumeProof,sha} from './rcap-clinic-resume-contract.mjs';
import {plantParticipantState,serverReset,runShippedDeviceReset,observeSameDeviceHandover,redactSecrets,finishResume,resumeFailureRecord,writeResumeFailureRecord,storageInventory,applyAnalyticsOptOut,ANALYTICS_OPT_OUT_PROFILE} from './rcap-clinic-resume-browser-reset.mjs';
import {hostedVercelScopedUrl,resolveHostedVercelIdentity} from './rcap-hosted-acceptance-vercel-identity.mjs';
const args=process.argv.slice(2);const value=k=>args[args.indexOf(k)+1];
for(let i=0;i<args.length;i++){assert.ok(['--project','--execute','--owner-authorization','--session-closure-authorization'].includes(args[i]),'unknown argument');if(args[i]!=='--execute')i++;}
const project=args.includes('--project')?value('--project'):'';
const execute=requireResumeAuthorization({project,execute:args.includes('--execute'),authorization:args.includes('--owner-authorization')?value('--owner-authorization'):null});
const env=k=>{assert.ok(process.env[k]?.trim(),`${k} required`);return process.env[k].trim();};
const closureSql=execute?exactSessionClosureSql(project,args.includes('--session-closure-authorization')?value('--session-closure-authorization'):null):null;
const token=env('SUPABASE_ACCESS_TOKEN');
async function query(sql,readOnly=true){const response=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql,read_only:readOnly})});assert.ok(response.ok,`database query HTTP ${response.status}`);const body=await response.json();if(readOnly)assert.ok(Array.isArray(body),'database query response must be an array');return body;}
const snapshot=async()=>{const rows=await query(await resumeSql(project));assert.equal(rows.length,1);return rows[0].evidence;};
const inventory=await snapshot();assert.equal(classifyDeliveryCheckpoint(inventory).state,'SUCCESSOR_EXPLICIT_DOWNLOAD_ALREADY_PROVEN','hosted checkpoint must not replay download');
// The inventory distinguishes the exact active checkpoint from the exact
// already-reset checkpoint (one matching audit record). Anything else refuses.
const lifecycle=classifyResumeLifecycle(inventory);
if(!execute){console.log(JSON.stringify({mode:'READ_ONLY',lifecycle,acceptance:false,secondLifecycleTransitionPermitted:false,namespace:RESUME,state:inventory,executionHeld:true,originalHandoffUnavailable:true,exactSessionClosureRequiresSeparateAuthorization:true},null,2));process.exit(0);}
assert.equal(lifecycle,'EXACT_ACTIVE_CHECKPOINT','exact checkpoint already reset: no second lifecycle transition');
// Validate all future execution credentials/authority before the first browser write.
const {chromium}=await import('playwright');
const base=env('RCAP_BROWSER_BASE_URL'),origin=new URL(base).origin;assert.equal(origin,base);assert.ok(new URL(base).hostname.endsWith('.vercel.app'));assert.equal(new URL(base).protocol,'https:');
assert.equal(new URL(base).hostname,CHECKPOINT.hostname);
const deploymentId=env('RCAP_BROWSER_PREVIEW_DEPLOYMENT_ID'),applicationSha=env('RCAP_BROWSER_APPLICATION_SHA'),workerDigest=env('RCAP_BROWSER_WORKER_DIGEST');
assert.equal(deploymentId,CHECKPOINT.previewId);
assert.match(applicationSha,/^[a-f0-9]{40}$/);assert.notEqual(applicationSha,'6ebacdcde8afdf8aa706f16b38e0646babcbdc49');assert.match(workerDigest,/^sha256:[a-f0-9]{64}$/);assert.notEqual(workerDigest,RESUME.priorDigest);assert.notEqual(deploymentId,'dpl_EopdPGhnhjk8JqwdiAqi9RYmATpB');
const candidate=requireCurrentReleaseCandidate();
assert.equal(candidate.applicationSha,applicationSha);assert.equal(candidate.workerSourceSha,applicationSha);assert.equal(candidate.workerDigest,workerDigest);assert.equal(candidate.runtimeAccepted,true);assert.equal(candidate.workerRebuildRequired,false);assert.equal(candidate.productionAuthorized,false);
const cleanEntryPath='/clinic/mississippi-volunteer-lawyers-demo';
const password=env('HOSTED_CLINIC_DEMO_PASSWORD'),bypass=env('RCAP_BROWSER_VERCEL_BYPASS_SECRET'),vercelToken=env('RCAP_BROWSER_VERCEL_TOKEN');
const evidenceDir=path.resolve(process.env.RCAP_BROWSER_EVIDENCE_DIR||'hosted-acceptance-evidence/clinic-resume');fs.mkdirSync(evidenceDir,{recursive:true});
const progressPath=path.join(evidenceDir,'clinic-resume-progress.json'),progress=[];const redact=text=>redactSecrets(text,[password,bypass,vercelToken,token]);
let browser,owner, page,requests=0;const violations=[];const downloadPath=`/api/rcap/packets/${RESUME.job}/download`;
const readApi=async(route,identity)=>{const r=await fetch(hostedVercelScopedUrl(route,identity),{headers:{Authorization:`Bearer ${vercelToken}`}});assert.equal(r.status,200);return r.json();};
// Every context carries the documented analytics opt-out before any application
// script runs; this bounded resume creates no analytics records or identifiers.
async function context(){const c=await browser.newContext({acceptDownloads:true});await applyAnalyticsOptOut(c);await c.route('**/*',route=>handleResumeRequest(route,{origin,bypass,violations}));return c;}
async function signIn(c,email,next){const p=await c.newPage();await p.goto(`${origin}/expungement-ai/sign-in?mode=signin&next=${encodeURIComponent(next)}`,{waitUntil:'domcontentloaded'});await p.locator('input[name="email"]').fill(email);await p.locator('input[name="password"]').fill(password);const response=p.waitForResponse(r=>r.url().includes('/auth/v1/token')&&r.request().method()==='POST');await p.getByRole('button',{name:'Sign in',exact:true}).click();const r=await response;assert.equal(r.status(),200);const body=await r.json();await p.waitForURL(u=>u.pathname===next);return {p,id:body.user?.id};}
async function probe(c,route){const r=await c.request.get(origin+route,{headers:{'x-vercel-protection-bypass':bypass}});return {status:r.status(),body:await r.text()};}
const missingPath='/api/rcap/packets/00000000-0000-4000-8000-000000000000/download';
let phase='contract';
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.RCAP_BROWSER_CHROMIUM||undefined});
 const receipt=await runResumeProof({snapshot,sourceRun:env('GITHUB_RUN_ID'),
 requireSuccessorPreview:async()=>{const identity=await resolveHostedVercelIdentity({token:vercelToken});const d=await readApi(`/v13/deployments/${deploymentId}`,identity),alias=await readApi(`/v13/deployments/${new URL(origin).hostname}`,identity),aliases=await readApi(`/v2/deployments/${deploymentId}/aliases`,identity);assert.equal(d.id??d.uid,deploymentId);assert.equal(alias.id??alias.uid,deploymentId);assert.equal(d.readyState??d.status,'READY');assert.ok(d.target===null||d.target==='preview');assert.equal(d.projectId,identity.projectId);assert.equal(d.gitSource?.sha,applicationSha);for(const[k,v]of Object.entries({rcapApplicationSha:applicationSha,rcapWorkerSourceSha:applicationSha,rcapWorkerDigest:workerDigest,rcapAcceptanceProjectRef:project,rcapRouteState:'staging_scoped',rcapClinicDemoMode:'mississippi_preview',rcapStripeConfigured:'false',rcapStagingScopeSha256:sha(`${RESUME.owner},${RESUME.stranger}`)}))assert.equal(d.meta?.[k],v,k);assert.ok((aliases.aliases??[]).every(x=>x.target!=='production'&&x.deployment?.target!=='production'));return {deploymentId,applicationSha,workerDigest,origin};},
 signInOwner:async()=>{owner=await context();owner.on('request',r=>{if(new URL(r.url()).pathname===downloadPath)requests++;});const signed=await signIn(owner,'mvl-demo-participant-a@rcap-acceptance.test','/briefcase');page=signed.p;assert.equal(signed.id,RESUME.owner);},
 observeBeforeMatter:async()=>{assert.equal(requests,0,'no automatic download during direct sign-in/Briefcase landing');},
 openReadyMatter:async()=>{await page.goto(`${origin}/briefcase/${RESUME.item}`,{waitUntil:'domcontentloaded',timeout:30000});await page.locator('[data-packet-ready="true"]').waitFor({timeout:30000});await page.locator(`a[href="${downloadPath}"]`).waitFor({state:'visible'});},
 downloadRequests:()=>requests,
 explicitDownload:async()=>{const pending=page.waitForEvent('download');await page.locator(`a[href="${downloadPath}"]`).click();const d=await pending;assert.equal(await d.failure(),null);return fs.readFileSync(await d.path());},
 proveDenials:async()=>{const anon=await context(),stranger=await context();const signed=await signIn(stranger,'mvl-demo-participant-b@rcap-acceptance.test','/briefcase');assert.equal(signed.id,RESUME.stranger);const a=await probe(anon,downloadPath),b=await probe(stranger,downloadPath);const missing=await probe(stranger,missingPath);assert.equal(b.status,missing.status);assert.equal(b.body,missing.body);await anon.close();await stranger.close();return{anonymous:a.status,stranger:b.status};},
 proveStaffQueuePrivacy:async()=>{
 const rows=await query(queuePrivacySql(project));assert.equal(rows.length,1);assertQueuePrivacyPrerequisites(rows[0].evidence);
 const admin=await context(),staff=await context();try{
  const {p,id}=await signIn(admin,'mvl-demo-admin@rcap-acceptance.test',`/clinic/staff/${RESUME.event}/queue`);assert.equal(id,CHECKPOINT.admin);
  const response=await admin.request.get(`${origin}/api/clinic/events/${RESUME.event}/queue`,{headers:{'x-vercel-protection-bypass':bypass}});assert.equal(response.status(),200);const body=await response.json();
  const index=body.cases.findIndex(c=>c.id===RESUME.clinicCase);assert.ok(index>=0,'exact durable admin case');const exact=body.cases[index];assert.equal(exact.participantUserId,RESUME.owner);assert.equal(exact.queueStatus,'packet_ready');assert.equal(exact.routeDisposition,'packet');
  const uiRows=p.locator('tbody tr');assert.equal(await uiRows.count(),body.cases.length);assert.equal(await uiRows.nth(index).getByLabel(`Packet status for participant ending ${RESUME.owner.slice(-8)}`).inputValue(),'packet_ready');
  const signed=await signIn(staff,'mvl-demo-staff@rcap-acceptance.test',`/clinic/staff/${RESUME.event}/queue`);assert.equal(signed.id,CHECKPOINT.staff);
  const staffResponse=await staff.request.get(`${origin}/api/clinic/events/${RESUME.event}/queue`,{headers:{'x-vercel-protection-bypass':bypass}});assert.equal(staffResponse.status(),200);const staffBody=await staffResponse.json();
  const current=await query(queuePrivacySql(project));assert.equal(current.length,1);assertQueuePrivacyPrerequisites(current[0].evidence);assert.ok(!staffBody.cases.some(c=>c.id===RESUME.clinicCase),'expired exact case must be hidden from authorized ordinary staff');
  return {partnerAdminDurableCaseVisible:true,exactCaseId:RESUME.clinicCase,eventStaffAuthorized:true,expiredAssistanceCaseHiddenFromEventStaff:true,eventStaffAuthUserId:CHECKPOINT.staff,adminAuthUserId:CHECKPOINT.admin};
 }finally{await admin.close();await staff.close();}
 },
 resetDevice:async()=>{
 // Browser sign-out and device cleanup use unchanged shipped implementations,
 // driven through the factored adapter. Nothing here writes to the database:
 // the canonical closure of the LOST-cookie session is the separate port below,
 // which the contract calls only after every result returned here is asserted.
 await plantParticipantState(page);const priorState=await storageInventory(page);await serverReset(page);
 const cleanup=await runShippedDeviceReset({page,owner,helperSource:fs.readFileSync('src/lib/clinic-mode/device-reset.mjs','utf8'),cleanEntryPath,itemId:RESUME.item,priorState});
 const handover=await observeSameDeviceHandover({cleanup,owner,probe,signIn,strangerEmail:'mvl-demo-participant-b@rcap-acceptance.test',expectedStrangerId:RESUME.stranger,downloadPath,missingPath});
 return {...cleanup,...handover,analyticsProfile:ANALYTICS_OPT_OUT_PROFILE};
 },
 violations:()=>[...violations],
 recordProgress:async entry=>{progress.push(JSON.parse(redact(JSON.stringify(entry))));fs.writeFileSync(progressPath,JSON.stringify({schemaVersion:'rcap-clinic-resume-progress/v1',sourceRun:process.env.GITHUB_RUN_ID?.trim()||null,checkpoint:{assisted:RESUME.assisted,owner:RESUME.owner,session:RESUME.session,job:RESUME.job},stages:progress},null,2)+'\n');},
 // closureSql names the exact pinned session and its original owner itself;
 // the Participant B sign-in on the device never reaches this port.
 closeExactSession:async()=>{await query(closureSql,false);}
 });
 finishResume({receipt,assertNoViolations:()=>assert.deepEqual(violations,[],'resume attempted a forbidden request'),resultPath:path.join(evidenceDir,'clinic-resume-result.json'),write:fs.writeFileSync,setPhase:next=>{phase=next;}});
 console.log('Clinic checkpoint complete; deliveries remain attributed to runs 36211668984 and 36252986173.');
}catch(error){
 // The write boundary stays observable on failure. The record is derived from
 // the recorded stages and the phase, never from the absence of a stage tag:
 // a failure after a verified readback reports the closure as committed, and a
 // result write that threw reports the result as unknown.
 if(error instanceof Error)error.message=redact(error.message);
 const failure=resumeFailureRecord({error,stages:progress.map(s=>s.stage),phase,redact});
 writeResumeFailureRecord({failure,failurePath:path.join(evidenceDir,'clinic-resume-failure.json'),write:fs.writeFileSync,emit:console.error,redact});
 throw error;
}finally{try{await browser?.close();}catch(closeError){console.error('browser close failed after the reported outcome: '+redact(String(closeError?.message??closeError).split('\n')[0]));}}
