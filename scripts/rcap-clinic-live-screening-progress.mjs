import assert from 'node:assert/strict';
import {CLINIC_SETUP} from './rcap-clinic-setup-only-boundary.mjs';
import {MISSISSIPPI_SCREENING_CHOICES,screeningAlertDetails,screeningFailureDiagnostics} from './rcap-ms-screening-browser.mjs';
import {createOriginalResponseObserver} from './rcap-clinic-original-response.mjs';
import {createClinicRequestGuard,classifyClinicRequest} from './rcap-clinic-setup-request-guard.mjs';
import {previewRequestHeaders} from './rcap-clinic-resume-network-policy.mjs';

// These are the existing fixture's wire values, not new participant answers.
const wire={case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted',court_requirements_completed:'yes',resolved_timing_bucket:'gt_10_years'};
const profilePath='/api/expungement-ai/profiles/MS',progressPath='/api/expungement-ai/screening/progress';
const screeningPath='/expungement-ai/screening/ms';
const errors=new Set(['invalid_request','unsupported_jurisdiction','profile_version_mismatch','question_lifecycle_metadata_invalid']);
// Reconciled against the pinned application's real selector, including the unanswered optional program order.
export const SCREENING_PROGRESS_QUESTION_IDS=Object.freeze(['ownership_scope','jurisdiction_scope','case_outcome','offense_level','possible_pathway_context','ms_program_order','court_requirements_completed','resolved_timing_bucket']);
export const SCREENING_PROGRESS_PROFILE_VERSION='2026-06-19-source-conversion-1';
const iconPaths=new Set(['/favicon.ico','/expungement-ai/favicon.ico','/expungement-ai/icon-192.png','/expungement-ai/icon-512.png','/expungement-ai/apple-touch-icon.png']);
const samePreview=url=>url.origin===CLINIC_SETUP.origin&&!url.hash&&!url.username&&!url.password;
const queryNames=url=>[...url.searchParams.keys()].map(name=>/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(name)?name:'[unrecognized_name]');
function resourceCategory(url) {
 if(/^\/_next\/static\/(?:chunks|media)\//.test(url.pathname)&&!/%(?:2f|5c|2e)/i.test(url.pathname)) {
  if(url.pathname.endsWith('.js'))return 'framework_script';
  if(url.pathname.endsWith('.css'))return 'framework_stylesheet';
  if(/\.(woff2?|ttf|otf)$/.test(url.pathname))return 'framework_font';
 }
 if(url.pathname==='/_next/image')return 'image_optimizer';
 if(iconPaths.has(url.pathname))return 'declared_icon';
 if(url.pathname==='/expungement-ai/wilma-avatar.png')return 'wilma_avatar';
 if(url.pathname===profilePath)return 'profile_api';
 if(url.pathname===progressPath)return 'progress_api';
 if(url.pathname===screeningPath)return 'screening_document';
 return 'unrecognized';
}
const deploymentQuery=url=>!url.search||(url.searchParams.size===1&&url.searchParams.has('dpl')&&/^[A-Za-z0-9_-]{1,200}$/.test(url.searchParams.get('dpl')));
function safeOptimizer(url) {
 const keys=[...url.searchParams.keys()];
 return keys.length===new Set(keys).size&&keys.every(key=>['url','w','q','dpl'].includes(key))
  &&url.searchParams.get('url')==='/expungement-ai/wilma-avatar.png'&&['48','96'].includes(url.searchParams.get('w'))&&url.searchParams.get('q')==='75'
  &&(!url.searchParams.has('dpl')||/^[A-Za-z0-9_-]{1,200}$/.test(url.searchParams.get('dpl')));
}
// Bind tokens and image/icon URLs to the original protected document, never an inferred deployment ID.
export function publicReactResourcePolicy(html) {
 const tokens=new Set(),declared=new Set(),evidence=[];
 for(const tag of html.matchAll(/<(script|link|img)\b[^>]*>/gi)) {
  const attrs=Object.fromEntries([...tag[0].matchAll(/\b([a-zA-Z]+)\s*=\s*["']([^"']*)["']/g)].map(m=>[m[1].toLowerCase(),m[2].replaceAll('&amp;','&')]));
  const refs=[attrs.src,attrs.href,...(attrs.srcset??'').split(',').map(x=>x.trim().split(/\s+/)[0])].filter(Boolean);
  for(const ref of refs) {
   let url;try{url=new URL(ref,CLINIC_SETUP.origin);}catch{continue;}
   if(!samePreview(url))continue;
   const category=resourceCategory(url);
   const framework=category.startsWith('framework_')&&deploymentQuery(url);
   const icon=category==='declared_icon'&&tag[1].toLowerCase()==='link'&&/^(?:icon|shortcut icon|apple-touch-icon)$/.test(attrs.rel??'')&&deploymentQuery(url);
   const image=tag[1].toLowerCase()==='img'&&((category==='image_optimizer'&&safeOptimizer(url))||(category==='wilma_avatar'&&!url.search));
   if(!framework&&!icon&&!image)continue;
   if(framework&&url.searchParams.has('dpl'))tokens.add(url.searchParams.get('dpl'));
   declared.add(url.href);evidence.push({category,queryNames:queryNames(url),source:'original_screening_document'});
  }
 }
 assert.ok(evidence.some(r=>r.category==='framework_script'),'React document framework scripts missing');
 assert.ok(tokens.size<=1,'React document deployment tokens disagree');
 return {tokens,declared,evidence};
}
export function publicReactResourceDecision(request,policy) {
 const url=new URL(request.url()),category=resourceCategory(url),type=request.resourceType();
 const evidence={origin:url.origin===CLINIC_SETUP.origin?'preview':'external',method:request.method(),resourceType:type,category,queryNames:queryNames(url)};
 if(!policy||!samePreview(url)||request.method()!=='GET')return {...evidence,allowed:false};
 const expected={framework_script:'script',framework_stylesheet:'stylesheet',framework_font:'font'}[category];
 const framework=expected===type&&deploymentQuery(url)&&(!url.search||policy.tokens.has(url.searchParams.get('dpl')));
 const image=['image_optimizer','wilma_avatar'].includes(category)&&type==='image'&&policy.declared.has(url.href);
 const icon=category==='declared_icon'&&['image','other'].includes(type)&&policy.declared.has(url.href);
 return {...evidence,allowed:Boolean(framework||image||icon),...(category==='declared_icon'?{purpose:'optional_brand_icon'}:{}),...(category==='image_optimizer'||category==='wilma_avatar'?{purpose:'optional_closed_guide_avatar'}:{})};
}
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
 assert.equal(value.reactInitialization?.status,'READY','actual React initialization required');
 assert.equal(value.reactInitialization.pathname,screeningPath);assert.equal(value.reactInitialization.firstQuestionId,'ownership_scope');
 assert.equal(value.reactInitialization.documentStatus,200);
 assert.deepEqual(value.reactInitialization.progressContract,{jurisdiction:'MS',profileVersion:SCREENING_PROGRESS_PROFILE_VERSION,questionIds:[...SCREENING_PROGRESS_QUESTION_IDS]});
 assert.deepEqual(value.reactInitialization.alerts,[]);
 assert.deepEqual(value.resourceFailures,[]);
 assert.ok(value.resourceResponses?.some(r=>r.category==='framework_script'&&r.allowed&&r.httpStatus===200));
 assert.ok(value.resourceResponses.every(r=>r.allowed&&r.httpStatus===200));
 assert.deepEqual(value.reactInitialization.responseObservations?.map(r=>[r.operation,r.httpStatus,r.accepted]),[['profile',200,true],['progress',200,true]]);
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

export async function readClinicLiveScreeningProgress({env=process.env,captchaPolicy,browserType}={}) {
 const result={status:'BLOCKED',operation:'screening_progress_contract',stage:'configuration',httpStatus:null,
  applicationSha:CLINIC_SETUP.app,deploymentId:CLINIC_SETUP.deploymentId,origin:CLINIC_SETUP.origin,
  authentication:'public GET profile / POST question selection; no account sign-in',businessWrites:false,
  responses:[],responseStages:[],responseObservations:[],guardEvents:[],requestFailures:[],browserErrors:[],resourceRequests:[],resourceResponses:[],resourceFailures:[]};
 let browser,page,ui,resourcePolicy;
 const current=()=>ui??result;
 try {
  assert.ok(env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim(),'existing Preview bypass unavailable');
  browserType??=(await import('playwright')).chromium;result.stage='browser_transport';
  browser=await browserType.launch({headless:true,executablePath:env.RCAP_BROWSER_CHROMIUM??'/usr/bin/google-chrome'});
  const context=await browser.newContext({serviceWorkers:'block'}),config={origin:CLINIC_SETUP.origin,authOrigin:`https://${CLINIC_SETUP.project}.supabase.co`,clinicSlug:CLINIC_SETUP.slug};
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   let httpStatus=null;try {
   const response=await route.fetch({headers:previewRequestHeaders(env.VERCEL_AUTOMATION_BYPASS_SECRET,request.headers()),maxRedirects:0,maxRetries:0});
   httpStatus=response.status();
   if(ui&&url.pathname===screeningPath&&request.resourceType()==='document') {
    assert.equal(response.status(),200,'React document HTTP refusal');
    const bytes=await response.body();assert.ok(bytes.length<10000000,'React document too large');
    resourcePolicy=publicReactResourcePolicy(bytes.toString('utf8'));ui.declaredResources=resourcePolicy.evidence;
    return route.fulfill({response,body:bytes});
   }
   if(ui)result.resourceResponses.push({...publicReactResourceDecision(request,resourcePolicy),httpStatus:response.status()});
   if(response.status()!==200)return route.abort('blockedbyclient');
   await route.fulfill({response});
   }catch(error) {
    const message=typeof error?.message==='string'?error.message.split('\n')[0]:'';
    const condition=['React document HTTP refusal','React document framework scripts missing','React document deployment tokens disagree','React document too large'].includes(message)?message:'resource_transport_or_body_failure';
    result.resourceFailures.push({...publicReactResourceDecision(request,resourcePolicy),stage:result.stage,httpStatus,condition});
    await route.abort('failed');
   }
  });
  await context.route('**/*',createOriginalResponseObserver(config,{bypass:env.VERCEL_AUTOMATION_BYPASS_SECRET,
   onObservation:value=>current().responseObservations.push(value),onStage:value=>current().responseStages.push(value)}));
  const guard=createClinicRequestGuard({actor:'participant',captchaPolicy,env,stage:()=>result.stage,events:result.guardEvents,requestFailures:result.requestFailures});
  await context.route('**/*',guard.route);
  // Stronger than the business runner: only two source-proven non-mutating operations may leave this context.
  await context.route('**/*',route=>{
   const request=route.request(),url=new URL(request.url());
   const exact=url.origin===CLINIC_SETUP.origin&&!url.search&&!url.hash&&!url.username&&!url.password;
   if(ui&&exact&&request.method()==='POST'&&['/api/analytics/web','/api/events/product'].includes(url.pathname)) {
    result.guardEvents.push({stage:result.stage,method:'POST',pathname:url.pathname,outcome:'telemetry_suppressed_locally'});
    return route.fulfill({status:204,body:''});
   }
   const classification=ui?classifyClinicRequest(request,{actor:'participant',captchaPolicy}):null;
   if(classification?.startsWith('optional_')) {
    result.resourceRequests.push({...publicReactResourceDecision(request,resourcePolicy),category:classification,stage:result.stage});return route.fallback();
   }
   const resource=publicReactResourceDecision(request,resourcePolicy);
   const document=ui&&exact&&request.method()==='GET'&&url.pathname===screeningPath&&request.resourceType()==='document';
   let progress=request.method()==='POST'&&url.pathname===progressPath;
   if(progress&&ui) {
    let body;try{body=request.postDataJSON();}catch{}
    progress=body?.jurisdiction==='MS'&&body.profileVersion===SCREENING_PROGRESS_PROFILE_VERSION&&body.answers
     &&!Array.isArray(body.answers)&&Object.keys(body.answers).length===0&&Object.keys(body).every(key=>['jurisdiction','profileVersion','answers'].includes(key));
   }
   const allowed=(exact&&((request.method()==='GET'&&url.pathname===profilePath)||progress))||document||(ui&&resource.allowed);
   if(ui)result.resourceRequests.push({...resource,allowed:Boolean(allowed),stage:result.stage});
   if(!allowed)result.requestFailures.push({...resource,stage:result.stage,outcome:'diagnostic_boundary_refused'});
   return allowed?route.fallback():route.abort('blockedbyclient');
  });
  page=await context.newPage();page.setDefaultTimeout(30000);page.on('response',guard.response);page.on('requestfailed',guard.requestFailed);
  page.on('pageerror',error=>{guard.pageError(error);result.browserErrors.push({stage:result.stage,outcome:/hydration|Minified React error #(?:418|423|425)/i.test(error.message)?'react_hydration_error':'page_error'});});page.on('console',guard.consoleError);
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
  result.stage='react_initialization';
  ui=result.reactInitialization={status:'BLOCKED',responseObservations:[],responseStages:[],initialAlerts:[],alerts:[],pathname:null};
  // Install body readers before navigation; retain original responses, never replay a request.
  const readBody=pathname=>page.waitForResponse(r=>r.url()===CLINIC_SETUP.origin+pathname,{timeout:30000})
   .then(async response=>{try{return {httpStatus:response.status(),body:await response.json()};}catch{return {httpStatus:response.status(),bodyReadFailed:true};}}).catch(()=>({httpStatus:null,bodyReadFailed:true}));
  const profileRead=readBody(profilePath),progressRead=readBody(progressPath);
  const document=await page.goto(CLINIC_SETUP.origin+screeningPath,{waitUntil:'domcontentloaded'});
  ui.documentStatus=document?.status()??null;result.httpStatus=ui.documentStatus;
  assert.equal(ui.documentStatus,200,'React document HTTP refusal');
  assert.equal(page.url(),CLINIC_SETUP.origin+screeningPath,'React document redirect refused');
  ui.initialAlerts=await screeningAlertDetails(page);
  const first=page.getByRole('heading',{name:MISSISSIPPI_SCREENING_CHOICES[0].prompt,exact:true});
  const deadline=Date.now()+30000;
  while(!await first.isVisible()&&Date.now()<deadline) {
   assert.deepEqual((await screeningAlertDetails(page)).filter(a=>a.source==='application'),[],'React application alert');
   guard.assertNoCritical();await page.waitForTimeout(50);
  }
  assert.equal(await first.isVisible(),true,'React first question missing');
  const [loadedProfile,loadedProgress]=await Promise.all([profileRead,progressRead]);
  assert.ok(!loadedProfile.bodyReadFailed&&!loadedProgress.bodyReadFailed,'React original body read failed');
  assert.equal(loadedProfile.httpStatus,200);assert.equal(loadedProgress.httpStatus,200);
  assert.equal(loadedProfile.body?.profileVersion,SCREENING_PROGRESS_PROFILE_VERSION);
  assert.deepEqual(loadedProfile.body,profile,'React profile differs from verified public profile');
  assert.deepEqual(loadedProgress.body,{jurisdiction:'MS',profileVersion:SCREENING_PROGRESS_PROFILE_VERSION,questionIds:[...SCREENING_PROGRESS_QUESTION_IDS]},'React progress contract mismatch');
  await page.waitForLoadState('load');
  await page.waitForFunction(()=>document.fonts.status==='loaded',null,{timeout:30000});
  ui.progressContract={...loadedProgress.body};
  Object.assign(ui,await screeningFailureDiagnostics(page,{observations:ui.responseObservations,stages:ui.responseStages}));
  assert.deepEqual(ui.alerts,[],'React application alert');guard.assertNoCritical();
  assert.ok(result.requestFailures.every(f=>f.outcome==='optional_request_failed'),'React critical request failure');
  assert.deepEqual(ui.responseObservations.map(r=>[r.operation,r.httpStatus,r.accepted]),[['profile',200,true],['progress',200,true]],'React original observations incomplete');
  assert.ok(result.resourceResponses.length>0&&result.resourceResponses.every(r=>r.allowed&&r.httpStatus===200),'React resource HTTP refusal');
  ui.firstQuestionId='ownership_scope';ui.status='READY';
  result.status='READY';result.stage='complete';
 }catch(error) {
  if(ui&&page)Object.assign(ui,await screeningFailureDiagnostics(page,{observations:ui.responseObservations,stages:ui.responseStages}).catch(()=>({diagnosticsUnavailable:true})));
  const condition=typeof error?.message==='string'?error.message.split('\n')[0]:'';
  const known=['React resource HTTP refusal','React document framework scripts missing','React document deployment tokens disagree','React document too large','React document HTTP refusal','React document redirect refused','React application alert','React first question missing','React original body read failed','React progress contract mismatch','React critical request failure','React original observations incomplete','profile jurisdiction mismatch','profile version missing','profile questions missing','duplicate profile questions','progress HTTP refusal','progress malformed response','progress jurisdiction mismatch','progress version mismatch','unknown or missing question IDs','duplicate question IDs','unexpected fixture question','optional omission became required','fixture option missing from live profile','progress exceeded bounded fixture sequence','profile HTTP refusal','profile redirect refused','all original progress responses must be captured','original response contract failed','diagnostic request failure'];
  const failedResource=result.resourceFailures.at(-1)??result.resourceResponses.findLast(r=>r.httpStatus!==200);
  result.condition=failedResource?.condition??(failedResource?'React resource HTTP refusal':null)??(known.includes(condition)?condition:result.requestFailures.some(r=>r.outcome==='diagnostic_boundary_refused')?'React resource boundary refused':'transport_or_contract_unproven');
  result.reason=result.stage==='configuration'?'existing_preview_bypass_unavailable':'live_screening_contract_unproven';
  result.expected=ui?'Exact public React page: original HTTP 200 profile/progress, matching version/questions, first ownership question, no application alert or critical browser failure':'HTTP 200, exact live MS profile/version and all deterministic question-prefix contracts';
  const failedResponse=current().responseObservations.findLast(r=>!r.accepted);
  if(failedResponse)result.httpStatus=failedResponse.httpStatus;
  else if(failedResource)result.httpStatus=failedResource.httpStatus;
  result.observed=failedResponse?.outcome??(failedResource?`${failedResource.category}: ${result.condition}`:null)??(ui?result.condition:result.responses.at(-1)?.outcome)??'unproven';
 }finally{await browser?.close();}
 result.capturedAt=new Date().toISOString();return result;
}
