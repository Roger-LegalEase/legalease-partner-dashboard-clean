#!/usr/bin/env node
// Dedicated existing-namespace proof. Default: read-only database inventory.
// NEVER imports seed/generate/worker execution. Future execution requires two
// explicit authorizations because the original handoff cookie was lost.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {requireCurrentReleaseCandidate} from './grade-a-launch-control/verify-release-candidate-binding.mjs';
import {RESUME, resumeSql,requireResumeAuthorization,exactSessionClosureSql,runResumeProof,assertResumeState,sha} from './rcap-clinic-resume-contract.mjs';
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
if(!execute){const current=await snapshot();assertResumeState(current);console.log(JSON.stringify({mode:'READ_ONLY',namespace:RESUME,state:current,executionHeld:true,originalHandoffUnavailable:true,exactSessionClosureRequiresSeparateAuthorization:true},null,2));process.exit(0);}
// Validate all future execution credentials/authority before the first browser write.
const {chromium}=await import('playwright');
const base=env('RCAP_BROWSER_BASE_URL'),origin=new URL(base).origin;assert.equal(origin,base);assert.ok(new URL(base).hostname.endsWith('.vercel.app'));assert.equal(new URL(base).protocol,'https:');
const deploymentId=env('RCAP_BROWSER_PREVIEW_DEPLOYMENT_ID'),applicationSha=env('RCAP_BROWSER_APPLICATION_SHA'),workerDigest=env('RCAP_BROWSER_WORKER_DIGEST');
assert.match(applicationSha,/^[a-f0-9]{40}$/);assert.notEqual(applicationSha,'6ebacdcde8afdf8aa706f16b38e0646babcbdc49');assert.match(workerDigest,/^sha256:[a-f0-9]{64}$/);assert.notEqual(workerDigest,RESUME.priorDigest);assert.notEqual(deploymentId,'dpl_EopdPGhnhjk8JqwdiAqi9RYmATpB');
const candidate=requireCurrentReleaseCandidate();
assert.equal(candidate.applicationSha,applicationSha);assert.equal(candidate.workerSourceSha,applicationSha);assert.equal(candidate.workerDigest,workerDigest);assert.equal(candidate.runtimeAccepted,true);assert.equal(candidate.workerRebuildRequired,false);assert.equal(candidate.productionAuthorized,false);
const cleanEntryPath='/clinic/mississippi-volunteer-lawyers-demo';
const password=env('HOSTED_CLINIC_DEMO_PASSWORD'),bypass=env('RCAP_BROWSER_VERCEL_BYPASS_SECRET'),vercelToken=env('RCAP_BROWSER_VERCEL_TOKEN');
const evidenceDir=path.resolve(process.env.RCAP_BROWSER_EVIDENCE_DIR||'hosted-acceptance-evidence/clinic-resume');fs.mkdirSync(evidenceDir,{recursive:true});
let browser,owner, page,requests=0;const violations=[];const downloadPath=`/api/rcap/packets/${RESUME.job}/download`;
const readApi=async(route,identity)=>{const r=await fetch(hostedVercelScopedUrl(route,identity),{headers:{Authorization:`Bearer ${vercelToken}`}});assert.equal(r.status,200);return r.json();};
async function context(){const c=await browser.newContext({acceptDownloads:true});await c.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());if(u.origin===origin){if(r.method()!=='GET'&&r.method()!=='HEAD'&&u.pathname!=='/api/clinic/session/reset'){violations.push(`${r.method()} ${u.pathname}`);return route.abort();}return route.continue({headers:{...r.headers(),'x-vercel-protection-bypass':bypass}});}if(u.origin===`https://${project}.supabase.co`&&u.pathname.startsWith('/auth/v1/'))return route.continue();violations.push(`${r.method()} ${u.origin}${u.pathname}`);return route.abort();});return c;}
async function signIn(c,email,next){const p=await c.newPage();await p.goto(`${origin}/expungement-ai/sign-in?mode=signin&next=${encodeURIComponent(next)}`,{waitUntil:'domcontentloaded'});await p.locator('input[name="email"]').fill(email);await p.locator('input[name="password"]').fill(password);const response=p.waitForResponse(r=>r.url().includes('/auth/v1/token')&&r.request().method()==='POST');await p.getByRole('button',{name:'Sign in',exact:true}).click();const r=await response;assert.equal(r.status(),200);const body=await r.json();await p.waitForURL(u=>u.pathname===next);return {p,id:body.user?.id};}
async function denied(c){const r=await c.request.get(origin+downloadPath,{headers:{'x-vercel-protection-bypass':bypass}});return {status:r.status(),body:await r.text()};}
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.RCAP_BROWSER_CHROMIUM||undefined});
 const receipt=await runResumeProof({snapshot,
 requireSuccessorPreview:async()=>{const identity=await resolveHostedVercelIdentity({token:vercelToken});const d=await readApi(`/v13/deployments/${deploymentId}`,identity),alias=await readApi(`/v13/deployments/${new URL(origin).hostname}`,identity),aliases=await readApi(`/v2/deployments/${deploymentId}/aliases`,identity);assert.equal(d.id??d.uid,deploymentId);assert.equal(alias.id??alias.uid,deploymentId);assert.equal(d.readyState??d.status,'READY');assert.ok(d.target===null||d.target==='preview');assert.equal(d.projectId,identity.projectId);assert.equal(d.gitSource?.sha,applicationSha);for(const[k,v]of Object.entries({rcapApplicationSha:applicationSha,rcapWorkerSourceSha:applicationSha,rcapWorkerDigest:workerDigest,rcapAcceptanceProjectRef:project,rcapRouteState:'staging_scoped',rcapClinicDemoMode:'mississippi_preview',rcapStripeConfigured:'false',rcapStagingScopeSha256:sha(`${RESUME.owner},${RESUME.stranger}`)}))assert.equal(d.meta?.[k],v,k);assert.ok((aliases.aliases??[]).every(x=>x.target!=='production'&&x.deployment?.target!=='production'));return {deploymentId,applicationSha,workerDigest,origin};},
 signInOwner:async()=>{owner=await context();owner.on('request',r=>{if(new URL(r.url()).pathname===downloadPath)requests++;});const signed=await signIn(owner,'mvl-demo-participant-a@rcap-acceptance.test','/briefcase');page=signed.p;assert.equal(signed.id,RESUME.owner);},
 observeBeforeMatter:async()=>{assert.equal(requests,0,'no automatic download during direct sign-in/Briefcase landing');},
 openReadyMatter:async()=>{await page.goto(`${origin}/briefcase/${RESUME.item}`,{waitUntil:'domcontentloaded',timeout:30000});await page.locator('[data-packet-ready="true"]').waitFor({timeout:30000});await page.locator(`a[href="${downloadPath}"]`).waitFor({state:'visible'});},
 downloadRequests:()=>requests,
 explicitDownload:async()=>{const pending=page.waitForEvent('download');await page.locator(`a[href="${downloadPath}"]`).click();const d=await pending;assert.equal(await d.failure(),null);return fs.readFileSync(await d.path());},
 proveDenials:async()=>{const anon=await context(),stranger=await context();const signed=await signIn(stranger,'mvl-demo-participant-b@rcap-acceptance.test','/briefcase');assert.equal(signed.id,RESUME.stranger);const a=await denied(anon),b=await denied(stranger);const missing=await stranger.request.get(origin+'/api/rcap/packets/00000000-0000-4000-8000-000000000000/download',{headers:{'x-vercel-protection-bypass':bypass}});assert.equal(b.status,missing.status());assert.equal(b.body,await missing.text());await anon.close();await stranger.close();return{anonymous:a.status,stranger:b.status};},
 proveExactStaffCase:async()=>{const staff=await context();const {p}=await signIn(staff,'mvl-demo-staff@rcap-acceptance.test',`/clinic/staff/${RESUME.event}/queue`);const response=await staff.request.get(`${origin}/api/clinic/events/${RESUME.event}/queue`,{headers:{'x-vercel-protection-bypass':bypass}});assert.equal(response.status(),200);const body=await response.json();const index=body.cases.findIndex(c=>c.id===RESUME.clinicCase);assert.ok(index>=0,'exact staff case');assert.equal(body.cases[index].participantUserId,RESUME.owner);assert.equal(body.cases[index].queueStatus,'packet_ready');const rows=p.locator('tbody tr');assert.equal(await rows.count(),body.cases.length);const row=rows.nth(index);assert.equal(await row.getByLabel(`Packet status for participant ending ${RESUME.owner.slice(-8)}`).inputValue(),'packet_ready');await staff.close();},
 resetDeviceAndCloseExactSession:async()=>{
 // Browser sign-out and device cleanup use unchanged shipped implementations.
 // The separate canonical DB closure accounts explicitly for the LOST cookie.
 await page.evaluate(async()=>{localStorage.setItem('rcap-resume-reset','participant-a');sessionStorage.setItem('rcap-resume-reset','participant-a');await new Promise((resolve,reject)=>{const request=indexedDB.open('rcap-resume-reset',1);request.onsuccess=()=>{request.result.close();resolve(null);};request.onerror=()=>reject(request.error);});await caches.open('rcap-resume-reset');});
 const reset=await page.evaluate(async()=>{const r=await fetch('/api/clinic/session/reset',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reason:'staff_reset'})});return {status:r.status,...await r.json()};});assert.equal(reset.status,200);assert.equal(reset.signOutConfirmed,true);
 const current=await snapshot();assertResumeState(current);await query(closureSql,false);
 const helper=fs.readFileSync('src/lib/clinic-mode/device-reset.mjs','utf8').replace('export async function resetClinicDeviceState','async function resetClinicDeviceState');
 await page.addScriptTag({content:helper+'\nwindow.rcapResumeReset=resetClinicDeviceState;'});await page.evaluate(clean=>window.rcapResumeReset(window,clean),cleanEntryPath);
 await page.waitForURL(u=>u.pathname===cleanEntryPath);const cookies=(await owner.cookies()).filter(c=>/^(sb-|clinic_|screening_|briefcase_)/.test(c.name)).length;
 const storage=await page.evaluate(async()=>({localStorage:localStorage.length,sessionStorage:sessionStorage.length,indexedDB:(await indexedDB.databases()).length,caches:(await caches.keys()).length,serviceWorkers:(await navigator.serviceWorker.getRegistrations()).length}));
 let historySafe=true;for(const op of ['goBack','goBack','goBack','goForward','goForward','goForward']){await page[op]({waitUntil:'domcontentloaded'});historySafe&&=new URL(page.url()).pathname===cleanEntryPath&&!(await page.locator('body').innerText()).includes(RESUME.item);}
 const revoked=await denied(owner);assert.ok([401,404].includes(revoked.status));const signed=await signIn(owner,'mvl-demo-participant-b@rcap-acceptance.test','/briefcase');assert.equal(signed.id,RESUME.stranger);const b=await denied(owner);return{signOutConfirmed:true,cookies,storage,historySafe,sameDeviceStranger:b.status,originalCookieUnavailable:true,sessionClosure:'separately authorized exact canonical clinic_end_assisted_session'};
 }});
 assert.deepEqual(violations,[],'resume attempted a forbidden request');fs.writeFileSync(path.join(evidenceDir,'clinic-resume-result.json'),JSON.stringify(receipt,null,2)+'\n');console.log('Clinic resume passed; immutable core evidence remains attributed to run 36211668984.');
}finally{await browser?.close();}
