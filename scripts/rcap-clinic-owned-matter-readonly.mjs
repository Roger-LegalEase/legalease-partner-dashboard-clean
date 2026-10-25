import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {CLINIC_SETUP} from './rcap-clinic-setup-only-boundary.mjs';
import {createClinicRequestGuard} from './rcap-clinic-setup-request-guard.mjs';
import {createOriginalResponseObserver} from './rcap-clinic-original-response.mjs';
import {installSignInSafety,signInWithRealForm} from './rcap-clinic-resume-sign-in.mjs';
import {handleResumeRequest,previewRequestHeaders,withoutPreviewHeaders,TOOLBAR_LOADER,TURNSTILE_LOADER} from './rcap-clinic-resume-network-policy.mjs';
import {applyAnalyticsOptOut} from './rcap-clinic-resume-browser-reset.mjs';
import {publicReactResourcePolicy,publicReactResourceDecision} from './rcap-clinic-live-screening-progress.mjs';

export const OWNED_MATTER_ID='6765fcb9-586d-4abe-bc60-9f77f6a11e16';
export const OWNED_MATTER_PATH=`/briefcase/matters/${OWNED_MATTER_ID}`;
const aliasPath=`/briefcase/${OWNED_MATTER_ID}`;
const authOrigin=`https://${CLINIC_SETUP.project}.supabase.co`;
const readPaths=new Set(['/briefcase','/briefcase/matters',aliasPath,OWNED_MATTER_PATH]);
// Suppress verified Next.js speculative RSC prefetches locally, never send them to Preview.
// A clicked/required route lacks the speculative markers and retains the strict read boundary.
export function ownedMatterSpeculativePrefetch(request) {
 let url,frame,referer,headers;
 try {
  url=new URL(request.url());headers=request.headers();frame=new URL(request.frame().url());
  referer=new URL(headers.referer);
 } catch{return false;}
 if(url.origin!==CLINIC_SETUP.origin||frame.origin!==CLINIC_SETUP.origin||referer.origin!==CLINIC_SETUP.origin
   ||frame.pathname!==referer.pathname||request.method()!=='GET'||request.resourceType()!=='fetch'
   ||request.isNavigationRequest?.()!==false||headers['next-router-prefetch']!=='1'||headers.rsc!=='1'
   ||url.username||url.password||url.hash||/%(?:2f|5c|2e)/i.test(url.pathname))return false;
 if(!new Set(['/expungement-ai/sign-in','/briefcase','/briefcase/matters',aliasPath,OWNED_MATTER_PATH]).has(frame.pathname))return false;
 const allowedTarget=url.pathname==='/auth/forgot-password'||url.pathname==='/expungement-ai'
   ||url.pathname.startsWith('/expungement-ai/')||url.pathname==='/briefcase'||url.pathname.startsWith('/briefcase/');
 if(!allowedTarget||url.pathname.startsWith('/api/')||url.pathname.startsWith('/briefcase/api/')
   ||/\/(?:checkout|funding|admin|render|generate|download)(?:\/|$)/i.test(url.pathname))return false;
 const uuid=/^\/briefcase\/(?:matters\/)?[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:\/|$)/;
 if(uuid.test(url.pathname)&&![aliasPath,OWNED_MATTER_PATH,aliasPath+'/packet-information',OWNED_MATTER_PATH+'/packet-information'].includes(url.pathname))return false;
 const keys=[...url.searchParams.keys()];
 if(url.searchParams.getAll('_rsc').length!==1||!/^[A-Za-z0-9_-]{1,200}$/.test(url.searchParams.get('_rsc')??''))return false;
 const extended=['/auth/forgot-password','/expungement-ai/sign-in'].includes(url.pathname);
 if(keys.length>3||keys.some(key=>!(extended?['_rsc','mode','next']:['_rsc']).includes(key)))return false;
 if(['mode','next'].some(key=>url.searchParams.getAll(key).length>1||url.searchParams.get(key)?.length>256))return false;
 return true;
}

export function assertOwnedMatterReadonlyInputs(env,gate,now=Date.now()) {
 for(const [key,value] of Object.entries({RCAP_BROWSER_BASE_URL:CLINIC_SETUP.origin,RCAP_BROWSER_EMAIL:CLINIC_SETUP.email,
  RCAP_BROWSER_PREVIEW_DEPLOYMENT_ID:CLINIC_SETUP.deploymentId,RCAP_BROWSER_APPLICATION_SHA:CLINIC_SETUP.app,
  RCAP_BROWSER_ACCEPTANCE_PROJECT_REF:CLINIC_SETUP.project}))assert.equal(env[key],value,'exact read-only browser binding');
 assert.ok(env.RCAP_BROWSER_PASSWORD?.trim()&&env.RCAP_BROWSER_VERCEL_BYPASS_SECRET?.trim(),'existing normal test credentials required');
 assert.ok(!env.SUPABASE_ACCESS_TOKEN,'browser step must not receive Management credentials');
 assert.match(env.GITHUB_SHA??'',/^[a-f0-9]{40}$/);assert.ok(env.GITHUB_RUN_ID);assert.equal(env.GITHUB_RUN_ATTEMPT,'1');
 assert.equal(gate?.schema,'clinic_owned_matter_readonly/v1');assert.equal(gate.status,'READY');
 for(const [key,value] of Object.entries({matterId:OWNED_MATTER_ID,projectRef:CLINIC_SETUP.project,applicationSha:CLINIC_SETUP.app,
  deploymentId:CLINIC_SETUP.deploymentId,controlHead:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,runAttempt:env.GITHUB_RUN_ATTEMPT}))assert.equal(gate[key],value,'same-run exact owned-matter gate');
 assert.ok(now-Date.parse(gate.capturedAt)>=0&&now-Date.parse(gate.capturedAt)<300000,'fresh owned-matter gate required');
 assert.ok(gate.checks?.length>0&&gate.checks.every(c=>c.ok===true)&&Array.isArray(gate.blockers)&&gate.blockers.length===0);
 assert.equal(gate.captchaPolicy?.project,CLINIC_SETUP.project);assert.equal(gate.captchaPolicy.serverCaptchaRequired,false);
 assert.equal(gate.captchaPolicy.frontend?.applicationSha,CLINIC_SETUP.app);assert.equal(gate.captchaPolicy.frontend?.deploymentId,CLINIC_SETUP.deploymentId);
 assert.equal(gate.captchaPolicy.frontend.clientCaptchaRequired,false);assert.equal(gate.captchaPolicy.frontend.widgetSiteKeyConfigured,true);
}

export function ownedMatterReadonlyDecision(request,policies=[]) {
 let url;try{url=new URL(request.url());}catch{return 'readonly_invalid_url_blocked';}
 if(url.username||url.password||url.hash||/%(?:2f|5c|2e)/i.test(url.pathname)
  ||[...url.searchParams.keys()].some(k=>['email','password','access_token','refresh_token','token'].includes(k.toLowerCase())))return 'readonly_invalid_url_blocked';
 const method=request.method(),type=request.resourceType();
 if(url.origin===CLINIC_SETUP.origin&&method==='POST'&&['/api/analytics/web','/api/events/product'].includes(url.pathname)&&!url.search)return 'readonly_telemetry_suppressed';
 if(url.origin===authOrigin&&method==='POST'&&url.pathname==='/auth/v1/token'&&url.search==='?grant_type=password')return 'allowed';
 if(!['GET','HEAD'].includes(method))return 'readonly_mutation_blocked';
 if(ownedMatterSpeculativePrefetch(request))return 'optional_owned_matter_prefetch';
 if(url.origin===authOrigin)return !url.search&&['/auth/v1/user','/auth/v1/settings'].includes(url.pathname)?'allowed':'readonly_read_path_blocked';
 if([TOOLBAR_LOADER,TURNSTILE_LOADER].includes(url.href)&&method==='GET'&&type==='script')return 'allowed';
 if(url.origin!==CLINIC_SETUP.origin)return 'readonly_read_path_blocked';
 if(url.pathname==='/expungement-ai/sign-in')return url.searchParams.size===2&&url.searchParams.getAll('mode').length===1&&url.searchParams.get('mode')==='signin'
  &&url.searchParams.getAll('next').length===1&&url.searchParams.get('next')==='/briefcase'?'allowed':'readonly_read_path_blocked';
 if(readPaths.has(url.pathname))return !url.search||(method==='GET'&&['fetch','xhr'].includes(type)&&url.searchParams.size===1&&/^[A-Za-z0-9_-]{1,200}$/.test(url.searchParams.get('_rsc')??''))?'allowed':'readonly_read_path_blocked';
 return policies.some(policy=>publicReactResourceDecision(request,policy).allowed)?'allowed':'readonly_read_path_blocked';
}

// Both existing response observers consume one original Auth response; no second POST.
export async function observeOwnedMatterPasswordRoute(route,{bypass,captchaPolicy,onObservation=()=>{}}) {
 const request=route.request();
 assert.equal(request.url(),`${authOrigin}/auth/v1/token?grant_type=password`);assert.equal(request.method(),'POST');
 const observer=createOriginalResponseObserver({origin:CLINIC_SETUP.origin,authOrigin},{onObservation});
 return handleResumeRequest({request:()=>request,abort:reason=>route.abort(reason),fulfill:options=>route.fulfill(options),
  fetch:async options=>{const response=await route.fetch({...options,maxRetries:0});
   await observer({request:()=>request,fetch:async()=>response,fulfill:async()=>{},abort:async()=>{throw new Error('original authentication response refused');}});
   return response;
  }},{origin:CLINIC_SETUP.origin,bypass,captchaPolicy,violations:[]});
}

export async function runOwnedMatterReadonly({browser,env=process.env,gate,createGuard=createClinicRequestGuard,signIn=signInWithRealForm}) {
 const evidenceDir=path.resolve(env.RCAP_BROWSER_EVIDENCE_DIR||'clinic-owned-matter-evidence');fs.mkdirSync(evidenceDir,{recursive:true});
 const result={schemaVersion:'clinic_owned_matter_readonly_browser/v1',passed:false,scope:'read_only_existing_owned_matter',
  controlHead:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,runAttempt:env.GITHUB_RUN_ATTEMPT,applicationSha:CLINIC_SETUP.app,
  deploymentId:CLINIC_SETUP.deploymentId,matterId:OWNED_MATTER_ID,stage:'gate',guardEvents:[],requestFailures:[],stageResults:[],
  navigation:[],authObservations:[],signInDiagnostics:[],outerFailures:[],outerFailureCount:0,screenshots:[],businessWritesForwarded:0,databasePersistenceProof:false};
 let context,page,guard;const policies=[];
 const fail=value=>{result.outerFailureCount++;if(result.outerFailures.length<100)result.outerFailures.push(value);};
 const blocked=(request,ruleId,httpStatus=null)=>fail({...guard.recordReadonlyBoundary(request,{outcome:'readonly_blocked',ruleId}),
  operation:httpStatus===null?'readonly_route_boundary':'read_http_status',httpStatus});
 try {
  assertOwnedMatterReadonlyInputs(env,gate);
  guard=createGuard({actor:'participant',captchaPolicy:gate.captchaPolicy,env,stage:()=>result.stage,
   events:result.guardEvents,requestFailures:result.requestFailures,stageResults:result.stageResults,
   isOwnedMatterSpeculativePrefetch:ownedMatterSpeculativePrefetch});
  assert.equal(typeof guard.recordReadonlyBoundary,'function','correlated read-only guard bridge required');
  context=await browser.newContext({acceptDownloads:false,serviceWorkers:'block'});
  await applyAnalyticsOptOut(context);await installSignInSafety(context);
  context.on('page',p=>{p.on('response',guard.response);p.on('requestfailed',guard.requestFailed);p.on('console',guard.consoleError);p.on('pageerror',guard.pageError);
   p.on('framenavigated',frame=>{if(frame!==p.mainFrame()||result.navigation.length>=50)return;let u;try{u=new URL(frame.url());}catch{return;}
    result.navigation.push({stage:result.stage,origin:u.origin===CLINIC_SETUP.origin?'preview':'other',route:readPaths.has(u.pathname)?u.pathname:u.pathname==='/expungement-ai/sign-in'?'sign_in':'other',queryNames:[...new Set(u.searchParams.keys())].map(k=>['_rsc','mode','next'].includes(k)?k:'other')});});
  });
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin===authOrigin&&request.method()==='POST')return observeOwnedMatterPasswordRoute(route,{bypass:env.RCAP_BROWSER_VERCEL_BYPASS_SECRET,captchaPolicy:gate.captchaPolicy,
    onObservation:value=>{if(result.authObservations.length<20)result.authObservations.push(value);}});
   const headers=url.origin===CLINIC_SETUP.origin?previewRequestHeaders(env.RCAP_BROWSER_VERCEL_BYPASS_SECRET,request.headers()):withoutPreviewHeaders(request.headers());
   let response;try{response=await route.fetch({headers,maxRedirects:0,maxRetries:0});}catch{blocked(request,'readonly_read_path_blocked');return route.abort('failed');}
   if(response.status()>=300&&response.status()<400){blocked(request,'readonly_redirect_blocked');return route.abort('blockedbyclient');}
   if(response.status()<200||response.status()>=400){blocked(request,'readonly_http_refusal_blocked',response.status());return route.fulfill({response});}
   if(url.origin===CLINIC_SETUP.origin&&request.resourceType()==='document'&&response.status()===200){
    const body=await response.body();if(policies.length<20)policies.push(publicReactResourcePolicy(body.toString('utf8')));return route.fulfill({response,body});
   }
   return route.fulfill({response});
  });
  await context.route('**/*',guard.route);
  await context.route('**/*',async route=>{
   const request=route.request(),decision=ownedMatterReadonlyDecision(request,policies);
   if(decision==='allowed'||decision==='optional_owned_matter_prefetch')return route.fallback();
   if(decision==='readonly_telemetry_suppressed'){guard.recordReadonlyBoundary(request,{outcome:decision,ruleId:decision});return route.fulfill({status:204,body:''});}
   blocked(request,decision);return route.abort('blockedbyclient');
  });
  result.stage='participant_normal_signin';result.operation='normal_test_sign_in';
  const signed=await signIn({context,origin:CLINIC_SETUP.origin,email:env.RCAP_BROWSER_EMAIL,password:env.RCAP_BROWSER_PASSWORD,next:'/briefcase',
   observe:proof=>{if(result.signInDiagnostics.length<50)result.signInDiagnostics.push(proof);}});
  assert.equal(signed.id,CLINIC_SETUP.owner,'normal test participant must own the existing matter');result.ownerAuthenticated=true;page=signed.p;
  result.stage='existing_next_link';result.operation='locate_existing_next_link';
  try {
   const link=page.locator(`a[href="${aliasPath}"]`).first();await link.waitFor({state:'visible',timeout:15000});
   result.operation='await_existing_next_link_hydration';
   await page.waitForFunction(href=>{const a=[...document.querySelectorAll('a')].find(a=>a.getAttribute('href')===href);return a&&Object.keys(a).some(k=>k.startsWith('__reactProps$')&&typeof a[k]?.onClick==='function');},aliasPath,{timeout:15000});
   result.operation='click_existing_next_link';
   await Promise.all([page.waitForURL(u=>u.origin===CLINIC_SETUP.origin&&[aliasPath,OWNED_MATTER_PATH].includes(u.pathname),{timeout:15000}),link.click()]);
   result.nextLinkNavigation={attempted:true,accepted:true,source:'actual deployed Next Link'};
  }catch{result.nextLinkNavigation={attempted:true,accepted:false,stage:result.stage,operation:result.operation,reason:'original_next_link_observation_failed'};fail({stage:result.stage,operation:result.operation,outcome:'next_link_observation_failed'});}
  result.stage='existing_canonical_read';result.operation='get_existing_canonical_matter';
  const navigation=await page.goto(CLINIC_SETUP.origin+OWNED_MATTER_PATH,{waitUntil:'domcontentloaded',timeout:30000});result.canonicalHttpStatus=navigation?.status()??null;
  assert.equal(result.canonicalHttpStatus,200);assert.equal(new URL(page.url()).pathname,OWNED_MATTER_PATH);
  await page.locator(`[data-briefcase-matter-id="${OWNED_MATTER_ID}"]`).waitFor({state:'visible',timeout:15000});
  result.canonicalRendered=true;
  for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]) {
   result.operation=`capture_existing_matter_${name}`;
   await page.setViewportSize({width,height});const file=`existing-owned-matter-${name}.png`;
   await page.screenshot({path:path.join(evidenceDir,file),fullPage:true});result.screenshots.push(file);
  }
  result.operation='settle_existing_next_traffic';
  await page.waitForLoadState('networkidle',{timeout:10000});result.stage='readonly_final_guard';result.operation='assert_readonly_boundaries';
  guard.assertNoCritical();assert.equal(result.outerFailureCount,0,'read-only boundary or observation failed');result.passed=true;result.stopReason='existing_owned_matter_observed_without_business_mutation';
 }catch{result.failure={stage:result.stage,operation:result.operation??'validate_gate',httpStatus:result.canonicalHttpStatus??null,reason:'readonly_owned_matter_observation_failed'};}
 finally {
  if(context)try{await context.close();}catch{result.passed=false;result.closeFailed=true;}
  if(guard)try{guard.assertNoCritical();}catch{result.passed=false;result.guardFailureRetained=true;}
  result.completedAt=new Date().toISOString();fs.writeFileSync(path.join(evidenceDir,'owned-matter-readonly-result.json'),JSON.stringify(result,null,2)+'\n');
 }
 return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
 let browser;
 try {
  const {readOwnedMatterGate}=await import('./rcap-clinic-owned-matter-prerequisites.mjs');
  const gate=readOwnedMatterGate(process.env.RCAP_BROWSER_OWNED_MATTER_GATE_FILE,process.env);assertOwnedMatterReadonlyInputs(process.env,gate);
  const {chromium}=await import('playwright');browser=await chromium.launch({headless:true,executablePath:process.env.RCAP_BROWSER_CHROMIUM||undefined});
  const result=await runOwnedMatterReadonly({browser,gate});if(!result.passed)process.exitCode=1;
 }catch{console.error('Existing owned-matter read-only inspection could not complete.');process.exitCode=1;}
 finally{if(browser)await browser.close();}
}
