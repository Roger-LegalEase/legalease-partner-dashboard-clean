import assert from 'node:assert/strict';
import {CLINIC_SETUP} from './rcap-clinic-setup-only-boundary.mjs';
import {MISSISSIPPI_SCREENING_CHOICES} from './rcap-ms-screening-browser.mjs';
import {createOriginalResponseObserver} from './rcap-clinic-original-response.mjs';
import {createClinicRequestGuard} from './rcap-clinic-setup-request-guard.mjs';
import {previewRequestHeaders} from './rcap-clinic-resume-network-policy.mjs';

// These are the existing fixture's wire values, not new participant answers.
const wire={case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted',court_requirements_completed:'yes',resolved_timing_bucket:'gt_10_years'};
const profilePath='/api/expungement-ai/profiles/MS',progressPath='/api/expungement-ai/screening/progress';
const errors=new Set(['invalid_request','unsupported_jurisdiction','profile_version_mismatch','question_lifecycle_metadata_invalid']);
// Reconciled against the pinned application's real selector, including the unanswered optional program order.
export const SCREENING_PROGRESS_QUESTION_IDS=Object.freeze(['ownership_scope','jurisdiction_scope','case_outcome','offense_level','possible_pathway_context','ms_program_order','court_requirements_completed','resolved_timing_bucket']);
export const SCREENING_PROGRESS_PROFILE_VERSION='2026-06-19-source-conversion-1';
export function assertClinicProgressEvidence(value,now=Date.now()) {
 assert.equal(value?.status,'READY');assert.equal(value.businessWrites,false);
 assert.equal(value.applicationSha,CLINIC_SETUP.app);assert.equal(value.deploymentId,CLINIC_SETUP.deploymentId);assert.equal(value.origin,CLINIC_SETUP.origin);
 assert.ok(now-Date.parse(value.capturedAt)>=0&&now-Date.parse(value.capturedAt)<300000);
 assert.equal(value.responses?.length,9,'all nine original answer prefixes required');
 for(const [step,r] of value.responses.entries()) {
  assert.equal(r.step,step);assert.equal(r.httpStatus,200);assert.equal(r.outcome,'accepted');
  assert.deepEqual(r.answerIds,SCREENING_PROGRESS_QUESTION_IDS.slice(0,step).filter(id=>id!=='ms_program_order'));
  assert.deepEqual(r.response,{jurisdiction:'MS',profileVersion:SCREENING_PROGRESS_PROFILE_VERSION,questionIds:[...SCREENING_PROGRESS_QUESTION_IDS]});
 }
 assert.deepEqual(value.responseObservations?.map(r=>[r.operation,r.httpStatus,r.accepted]),[['profile',200,true],...Array.from({length:9},()=>['progress',200,true])]);
}
export async function verifyScreeningProgressPrefixes(profile,post,receipts=[]) {
 assert.equal(profile?.jurisdiction?.code,'MS','profile jurisdiction mismatch');
 assert.ok(typeof profile.profileVersion==='string'&&profile.profileVersion.length>0&&profile.profileVersion.length<150,'profile version missing');
 assert.ok(Array.isArray(profile.questions)&&profile.questions.length>0,'profile questions missing');
 const questions=new Map(profile.questions.map(q=>[q.id,q])),visited=new Set(),answers={};
 assert.equal(questions.size,profile.questions.length,'duplicate profile questions');
 for(let step=0;step<=MISSISSIPPI_SCREENING_CHOICES.length;step++) {
  const {status,body}=await post({jurisdiction:'MS',profileVersion:profile.profileVersion,answers:{...answers}});
  const receipt={step,httpStatus:status,answerIds:Object.keys(answers),outcome:'contract_mismatch'};receipts.push(receipt);
  if(errors.has(body?.error))receipt.errorCode=body.error;
  assert.equal(status,200,'progress HTTP refusal');
  assert.ok(body&&typeof body==='object'&&!Array.isArray(body),'progress malformed response');
  assert.equal(body.jurisdiction,'MS','progress jurisdiction mismatch');assert.equal(body.profileVersion,profile.profileVersion,'progress version mismatch');
  assert.ok(Array.isArray(body.questionIds)&&body.questionIds.length>0&&body.questionIds.every(id=>typeof id==='string'&&questions.has(id)),'unknown or missing question IDs');
  assert.equal(new Set(body.questionIds).size,body.questionIds.length,'duplicate question IDs');
  assert.deepEqual(body.questionIds,[...SCREENING_PROGRESS_QUESTION_IDS],'pinned question sequence mismatch');
  Object.assign(receipt,{outcome:'accepted',response:{jurisdiction:body.jurisdiction,profileVersion:body.profileVersion,questionIds:body.questionIds}});
  const next=body.questionIds.find(id=>!visited.has(id));
  if(!next)return receipts;
  const choice=MISSISSIPPI_SCREENING_CHOICES.find(q=>q.id===next);assert.ok(choice,'unexpected fixture question');visited.add(next);
  if(choice.leaveUnanswered){assert.equal(questions.get(next).required,false,'optional omission became required');continue;}
  const value=wire[next]??choice.option;assert.ok(questions.get(next).options?.includes(value),'fixture option missing from live profile');answers[next]=value;
 }
 throw Error('progress exceeded bounded fixture sequence');
}

export async function readClinicLiveScreeningProgress({env=process.env,captchaPolicy}={}) {
 const result={status:'BLOCKED',operation:'screening_progress_contract',stage:'configuration',httpStatus:null,
  applicationSha:CLINIC_SETUP.app,deploymentId:CLINIC_SETUP.deploymentId,origin:CLINIC_SETUP.origin,
  authentication:'public GET profile / POST question selection; no account sign-in',businessWrites:false,
  responses:[],responseStages:[],responseObservations:[],guardEvents:[],requestFailures:[]};
 let browser;
 try {
  assert.ok(env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim(),'existing Preview bypass unavailable');
  const {chromium}=await import('playwright');result.stage='browser_transport';
  browser=await chromium.launch({headless:true,executablePath:env.RCAP_BROWSER_CHROMIUM??'/usr/bin/google-chrome'});
  const context=await browser.newContext({serviceWorkers:'block'}),config={origin:CLINIC_SETUP.origin,authOrigin:`https://${CLINIC_SETUP.project}.supabase.co`,clinicSlug:CLINIC_SETUP.slug};
  await context.route('**/*',async route=>{
   const response=await route.fetch({headers:previewRequestHeaders(env.VERCEL_AUTOMATION_BYPASS_SECRET,route.request().headers()),maxRedirects:0,maxRetries:0});
   await route.fulfill({response});
  });
  await context.route('**/*',createOriginalResponseObserver(config,{bypass:env.VERCEL_AUTOMATION_BYPASS_SECRET,
   onObservation:value=>result.responseObservations.push(value),onStage:value=>result.responseStages.push(value)}));
  const guard=createClinicRequestGuard({actor:'participant',captchaPolicy,env,stage:()=>result.stage,events:result.guardEvents,requestFailures:result.requestFailures});
  await context.route('**/*',guard.route);
  // Stronger than the business runner: only two source-proven non-mutating operations may leave this context.
  await context.route('**/*',route=>{
   const request=route.request(),url=new URL(request.url());
   const allowed=url.origin===CLINIC_SETUP.origin&&!url.search&&!url.hash&&!url.username&&!url.password
    &&((request.method()==='GET'&&url.pathname===profilePath)||(request.method()==='POST'&&url.pathname===progressPath));
   if(!allowed)result.requestFailures.push({stage:result.stage,outcome:'diagnostic_boundary_refused'});
   return allowed?route.fallback():route.abort('blockedbyclient');
  });
  const page=await context.newPage();page.on('response',guard.response);page.on('requestfailed',guard.requestFailed);
  page.on('pageerror',guard.pageError);page.on('console',guard.consoleError);
  result.stage='public_profile';const response=await page.goto(CLINIC_SETUP.origin+profilePath,{waitUntil:'load'});
  result.httpStatus=response?.status()??null;assert.equal(result.httpStatus,200,'profile HTTP refusal');
  assert.equal(page.url(),CLINIC_SETUP.origin+profilePath,'profile redirect refused');
  const profile=await response.json();assert.equal(profile.profileVersion,SCREENING_PROGRESS_PROFILE_VERSION,'pinned profile version mismatch');
  result.stage='progress_prefixes';
  await verifyScreeningProgressPrefixes(profile,async payload=>{
   const value=await page.evaluate(async({pathname,payload})=>{
    const response=await fetch(pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),redirect:'error'});
    return {status:response.status,body:await response.json().catch(()=>null)};
   },{pathname:progressPath,payload});result.httpStatus=value.status;guard.assertNoCritical();return value;
  },result.responses);
  guard.assertNoCritical();assert.deepEqual(result.requestFailures,[],'diagnostic request failure');
  assert.equal(result.responseObservations.filter(r=>r.operation==='progress').length,result.responses.length,'all original progress responses must be captured');
  assert.ok(result.responseObservations.every(r=>['profile','progress'].includes(r.operation)&&r.accepted),'original response contract failed');
  result.status='READY';result.stage='complete';
 }catch(error) {
  const condition=typeof error?.message==='string'?error.message.split('\n')[0]:'';
  const known=['profile jurisdiction mismatch','profile version missing','profile questions missing','duplicate profile questions','progress HTTP refusal','progress malformed response','progress jurisdiction mismatch','progress version mismatch','unknown or missing question IDs','duplicate question IDs','unexpected fixture question','optional omission became required','fixture option missing from live profile','progress exceeded bounded fixture sequence','profile HTTP refusal','profile redirect refused','all original progress responses must be captured','original response contract failed','diagnostic request failure'];
  result.condition=known.includes(condition)?condition:'transport_or_contract_unproven';
  result.reason=result.stage==='configuration'?'existing_preview_bypass_unavailable':'live_screening_contract_unproven';
  result.expected='HTTP 200, exact live MS profile/version and all deterministic question-prefix contracts';
  result.observed=result.responses.at(-1)?.outcome??result.responseObservations.at(-1)?.outcome??'unproven';
 }finally{await browser?.close();}
 result.capturedAt=new Date().toISOString();return result;
}
