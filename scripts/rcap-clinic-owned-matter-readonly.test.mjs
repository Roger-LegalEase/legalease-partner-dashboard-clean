import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {CLINIC_SETUP} from './rcap-clinic-setup-only-boundary.mjs';
import {publicReactResourcePolicy} from './rcap-clinic-live-screening-progress.mjs';
import {observedTokenIdentity} from './rcap-clinic-resume-network-policy.mjs';
import {observedOriginalResponse} from './rcap-clinic-original-response.mjs';
import {createClinicRequestGuard} from './rcap-clinic-setup-request-guard.mjs';
import {OWNED_MATTER_ID,OWNED_MATTER_PATH,ownedMatterOverviewLinks,assertOwnedMatterReadonlyInputs,ownedMatterReadonlyDecision,ownedMatterSpeculativePrefetch,observeOwnedMatterPasswordRoute,runOwnedMatterReadonly} from './rcap-clinic-owned-matter-readonly.mjs';

const origin=CLINIC_SETUP.origin,auth=`https://${CLINIC_SETUP.project}.supabase.co`;
const request=(pathname,{method='GET',type='document',base=origin,headers={}}={})=>({url:()=>new URL(pathname,base).href,method:()=>method,resourceType:()=>type,headers:()=>headers,postDataJSON:()=>({})});
function inputs(dir) {
 const env={RCAP_BROWSER_BASE_URL:origin,RCAP_BROWSER_EMAIL:CLINIC_SETUP.email,RCAP_BROWSER_PREVIEW_DEPLOYMENT_ID:CLINIC_SETUP.deploymentId,RCAP_BROWSER_APPLICATION_SHA:CLINIC_SETUP.app,
  RCAP_BROWSER_ACCEPTANCE_PROJECT_REF:CLINIC_SETUP.project,RCAP_BROWSER_PASSWORD:'SYNTHETIC_PASSWORD_CANARY',RCAP_BROWSER_VERCEL_BYPASS_SECRET:'SYNTHETIC_BYPASS_CANARY',RCAP_BROWSER_EVIDENCE_DIR:dir,
  GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ID:'synthetic-run',GITHUB_RUN_ATTEMPT:'1'};
 const gate={schema:'clinic_owned_matter_readonly/v1',status:'READY',matterId:OWNED_MATTER_ID,projectRef:CLINIC_SETUP.project,applicationSha:CLINIC_SETUP.app,deploymentId:CLINIC_SETUP.deploymentId,
  controlHead:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,runAttempt:'1',capturedAt:new Date().toISOString(),checks:[{ok:true}],blockers:[],captchaPolicy:{project:CLINIC_SETUP.project,serverCaptchaRequired:false,
   frontend:{applicationSha:CLINIC_SETUP.app,deploymentId:CLINIC_SETUP.deploymentId,clientCaptchaRequired:false,widgetSiteKeyConfigured:true}}};
 return {env,gate};
}
test('same-run identity, fresh gate and exact existing owner bindings are enforced before browser effects',()=>{
 const {env,gate}=inputs('/tmp/synthetic-not-used');assert.doesNotThrow(()=>assertOwnedMatterReadonlyInputs(env,gate));
 for(const change of [{matterId:'other'},{runId:'other'},{controlHead:'b'.repeat(40)},{status:'BLOCKED'},{capturedAt:new Date(Date.now()-300001).toISOString()},{checks:[]},{blockers:[{}]}])assert.throws(()=>assertOwnedMatterReadonlyInputs(env,{...gate,...change}));
 for(const change of [{RCAP_BROWSER_EMAIL:'other@example.invalid'},{RCAP_BROWSER_BASE_URL:'https://other.invalid'},{SUPABASE_ACCESS_TOKEN:'SYNTHETIC_MANAGEMENT_CANARY'},{GITHUB_RUN_ATTEMPT:'2'}])assert.throws(()=>assertOwnedMatterReadonlyInputs({...env,...change},gate));
});
test('only exact normal password grant can cross the POST boundary; all setup, reset, claim and delivery mutations are blocked',()=>{
 assert.equal(ownedMatterReadonlyDecision(request('/auth/v1/token?grant_type=password',{base:auth,method:'POST',type:'fetch'})),'allowed');
 for(const url of ['/auth/v1/token?grant_type=refresh_token','/auth/v1/logout','/auth/v1/signup'])assert.equal(ownedMatterReadonlyDecision(request(url,{base:auth,method:'POST'})),'readonly_mutation_blocked');
 for(const url of ['/api/clinic/session/reset','/api/clinic/entry','/api/clinic/assistance/start','/api/expungement-ai/screening/pending','/api/expungement-ai/screening/pending/claim','/api/expungement-ai/packet/generate','/api/stripe/webhook'])assert.equal(ownedMatterReadonlyDecision(request(url,{method:'POST'})),'readonly_mutation_blocked');
 assert.equal(ownedMatterReadonlyDecision(request('/api/analytics/web',{method:'POST'})),'readonly_telemetry_suppressed');
 assert.equal(ownedMatterReadonlyDecision(request('/api/events/product',{method:'POST'})),'readonly_telemetry_suppressed');
});
test('canonical and exact Next alias reads/RSC are allowed; foreign matters, delivery GETs and unknown queries fail closed',()=>{
 for(const route of [OWNED_MATTER_PATH,`/briefcase/${OWNED_MATTER_ID}`,'/briefcase'])assert.equal(ownedMatterReadonlyDecision(request(route)),'allowed');
 assert.equal(ownedMatterReadonlyDecision(request(OWNED_MATTER_PATH+'?_rsc=synthetic',{type:'fetch'})),'allowed');
 for(const route of ['/briefcase/00000000-0000-4000-8000-000000000000',OWNED_MATTER_PATH+'/packet-information','/api/rcap/packets/id/download',OWNED_MATTER_PATH+'?unknown=private',OWNED_MATTER_PATH+'?_rsc=a&_rsc=b'])assert.equal(ownedMatterReadonlyDecision(request(route,{type:'fetch'})),'readonly_read_path_blocked');
 assert.equal(ownedMatterReadonlyDecision(request(OWNED_MATTER_PATH+'?token=PRIVATE')),'readonly_invalid_url_blocked');
});
test('resources use original document policy and do not globally accept arbitrary deployment queries',()=>{
 const policy=publicReactResourcePolicy('<script src="/_next/static/chunks/a.js?dpl=synthetic"></script><link rel="icon" href="/favicon.ico?dpl=synthetic">');
 assert.equal(ownedMatterReadonlyDecision(request('/_next/static/chunks/a.js?dpl=synthetic',{type:'script'}),[policy]),'allowed');
 assert.equal(ownedMatterReadonlyDecision(request('/_next/static/chunks/a.js?dpl=other',{type:'script'}),[policy]),'readonly_read_path_blocked');
 assert.equal(ownedMatterReadonlyDecision(request('/favicon.ico?dpl=synthetic',{type:'other'}),[policy]),'allowed');
});
const nextSpeculative=(target,{frame='/briefcase',base=origin,headers={},type='fetch',method='GET',navigation=false,referer=origin+frame}={})=>{
 const req=request(target,{method,type,base,headers:{'next-router-prefetch':'1',rsc:'1',referer,...headers}});
 req.frame=()=>({url:()=>origin+frame});req.isNavigationRequest=()=>navigation;
 req.failure=()=>({errorText:'net::ERR_BLOCKED_BY_CLIENT'});
 return req;
};
test('actual run40220408395 speculative sign-in and saved-matter RSC links are suppressed without network access',()=>{
 const positives=[
  ['/auth/forgot-password?_rsc=test&next=%2Fbriefcase','/expungement-ai/sign-in'],
  ['/expungement-ai/sign-in?_rsc=test&mode=signin','/expungement-ai/sign-in'],
  ['/expungement-ai?_rsc=test','/expungement-ai/sign-in'],
  ['/briefcase/'+OWNED_MATTER_ID+'?_rsc=test','/briefcase'],
  ['/briefcase/settings?_rsc=test','/briefcase'],
  ['/briefcase/documents?_rsc=test','/briefcase'],
  ['/briefcase/'+OWNED_MATTER_ID+'/packet-information?_rsc=test',OWNED_MATTER_PATH],
  [OWNED_MATTER_PATH+'?_rsc=test',OWNED_MATTER_PATH]
 ];
 for(const [target,frame] of positives){
  const req=nextSpeculative(target,{frame});
  assert.equal(ownedMatterSpeculativePrefetch(req),true,target);
  assert.equal(ownedMatterReadonlyDecision(req),'optional_owned_matter_prefetch',target);
 }
});
test('non-speculative requests, foreign matters, secret queries, outside frames, writes and required navigation remain fatal',()=>{
 const cases=[
  nextSpeculative('/briefcase/settings?_rsc=test',{type:'document'}),
  nextSpeculative('/briefcase/settings?_rsc=test',{method:'POST'}),
  nextSpeculative('/briefcase/settings?_rsc=test',{navigation:true}),
  nextSpeculative('/briefcase/settings?_rsc=test',{headers:{'next-router-prefetch':'0'}}),
  nextSpeculative('/briefcase/settings?_rsc=test',{headers:{rsc:'0'}}),
  nextSpeculative('/briefcase/settings?unknown=bad&_rsc=test'),
  nextSpeculative('/briefcase/settings?_rsc=test&token=sensitive'),
  nextSpeculative('/briefcase/settings?_rsc=test',{referer:'https://other.invalid/briefcase'}),
  nextSpeculative('/briefcase/settings?_rsc=test',{frame:'/admin'}),
  nextSpeculative('/briefcase/00000000-0000-0000-0000-000000000000?_rsc=test'),
  nextSpeculative('/api/expungement-ai/screening/pending?_rsc=test'),
  nextSpeculative('https://other.invalid/briefcase?_rsc=test')
 ];
 for(const req of cases){
  assert.equal(ownedMatterSpeculativePrefetch(req),false,req.url());
  assert.notEqual(ownedMatterReadonlyDecision(req),'optional_owned_matter_prefetch',req.url());
 }
});
test('dedicated guard locally aborts exact RSC prefetch without a fatal browser error, while ordinary failures remain fatal',async()=>{
 const build=(opt=true)=>createClinicRequestGuard({
  actor:'participant',captchaPolicy:{},env:{},stage:()=> 'existing_canonical_read',
  events:[],requestFailures:[],stageResults:[],...(opt?{isOwnedMatterSpeculativePrefetch:ownedMatterSpeculativePrefetch}:{})
 });
 const req=nextSpeculative('/briefcase/'+OWNED_MATTER_ID+'/packet-information?_rsc=test',{frame:OWNED_MATTER_PATH});
 const guard=build();let abort=null,forwarded=false;
 await guard.route({request:()=>req,abort:async reason=>{abort=reason},fallback:async()=>{forwarded=true}});
 assert.equal(abort,'blockedbyclient');assert.equal(forwarded,false);
 guard.requestFailed(req);assert.doesNotThrow(()=>guard.assertNoCritical());
 const backgroundCanceled=nextSpeculative(OWNED_MATTER_PATH+'?_rsc=test',{frame:OWNED_MATTER_PATH});
 backgroundCanceled.failure=()=>({errorText:'net::ERR_ABORTED'});
 guard.requestFailed(backgroundCanceled);assert.doesNotThrow(()=>guard.assertNoCritical());
 const strict=build(false);strict.requestFailed(backgroundCanceled);
 assert.throws(()=>strict.assertNoCritical());
 const realRequest=nextSpeculative('/briefcase/settings?_rsc=test',{frame:OWNED_MATTER_PATH,navigation:true});
 realRequest.failure=()=>({errorText:'net::ERR_ABORTED'});
 guard.requestFailed(realRequest);assert.throws(()=>guard.assertNoCritical());
});
test('both original Auth observers consume one original response without forwarding Preview headers or exposing tokens',async()=>{
 const req=request('/auth/v1/token?grant_type=password',{base:auth,method:'POST',type:'fetch',headers:{'x-vercel-protection-bypass':'SYNTHETIC_BYPASS_CANARY'}});
 const body={user:{id:CLINIC_SETUP.owner},access_token:'SYNTHETIC_ACCESS_CANARY',refresh_token:'SYNTHETIC_REFRESH_CANARY'};
 const response={status:()=>200,headers:()=>({}),body:async()=>Buffer.from(JSON.stringify(body)),json:async()=>body};let fetches=0,fulfills=0;const safe=[];
 await observeOwnedMatterPasswordRoute({request:()=>req,fetch:async options=>{fetches++;assert.equal(options.headers['x-vercel-protection-bypass'],undefined);assert.equal(options.maxRedirects,0);assert.equal(options.maxRetries,0);return response;},fulfill:async value=>{fulfills++;assert.equal(value.response,response);},abort:async()=>assert.fail('auth should not abort')},{bypass:'SYNTHETIC_BYPASS_CANARY',captchaPolicy:{},onObservation:x=>safe.push(x)});
 assert.equal(fetches,1);assert.equal(fulfills,1);assert.equal(observedTokenIdentity(req).id,CLINIC_SETUP.owner);assert.equal(observedOriginalResponse(req).userId,CLINIC_SETUP.owner);
 assert(!JSON.stringify(safe).includes('CANARY'));
});

// Lifecycle doubles cover safety/artifact handling only, never deployed Next behavior.
function doubles({guardFatal=false,wrongOwner=false}={}) {
 const routes=[],events={};let url=origin+'/briefcase',closed=false,contexts=0,links=0;
 const page={on:()=>{},mainFrame:()=>({}),url:()=>url,locator:()=>({first(){return this;},waitFor:async()=>{},click:async()=>{links++;url=origin+`/briefcase/${OWNED_MATTER_ID}`;}}),
  waitForFunction:async()=>{},waitForURL:async()=>{},goto:async next=>{url=next;return {status:()=>200};},setViewportSize:async()=>{},screenshot:async()=>{},waitForLoadState:async()=>{}};
 const context={on:(name,fn)=>{events[name]=fn;},route:async(pattern,fn)=>routes.push(fn),exposeBinding:async()=>{},addInitScript:async()=>{},close:async()=>{closed=true;}};
 const guard={route:async r=>r.fallback(),response:()=>{},requestFailed:()=>{},consoleError:()=>{},pageError:()=>{},recordReadonlyBoundary:(r,x)=>({...x,requestId:'synthetic-request'}),assertNoCritical:()=>{if(guardFatal)throw new Error('SYNTHETIC_RAW_PRIVATE_ERROR');}};
 return {browser:{newContext:async()=>{contexts++;return context;}},createGuard:()=>guard,signIn:async()=>{events.page(page);return {id:wrongOwner?'00000000-0000-4000-8000-000000000000':CLINIC_SETUP.owner,p:page};},state:()=>({routes,closed,contexts,links})};
}
test('lifecycle safety double refuses bad gate before context creation and persists a sanitized failure',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'owned-readonly-test-'));try{const cfg=inputs(dir),ports=doubles();cfg.gate.status='BLOCKED';const r=await runOwnedMatterReadonly({...cfg,...ports});assert.equal(r.passed,false);assert.equal(ports.state().contexts,0);assert(fs.existsSync(path.join(dir,'owned-matter-readonly-result.json')));assert(!JSON.stringify(r).includes('CANARY'));}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('lifecycle safety double saves canonical observation/screenshots even when final guard is fatal',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'owned-readonly-test-'));try{const cfg=inputs(dir),ports=doubles({guardFatal:true});const r=await runOwnedMatterReadonly({...cfg,...ports});assert.equal(r.passed,false);assert.equal(r.canonicalRendered,true);assert.equal(r.screenshots.length,2);assert.equal(ports.state().links,1);assert.equal(ports.state().closed,true);assert.equal(r.businessWritesForwarded,0);assert(!JSON.stringify(r).includes('PRIVATE'));assert(fs.existsSync(path.join(dir,'owned-matter-readonly-result.json')));}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('lifecycle safety double rejects wrong returned user before any matter navigation',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'owned-readonly-test-'));try{const cfg=inputs(dir),ports=doubles({wrongOwner:true});const r=await runOwnedMatterReadonly({...cfg,...ports});assert.equal(r.passed,false);assert.equal(r.canonicalRendered,undefined);assert.equal(ports.state().links,0);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('actual outer routing locally suppresses telemetry and correlates distinct blocked requests through the real D bridge',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'owned-readonly-test-'));
 try {
  const cfg=inputs(dir),ports=doubles();let guard;const actions=[];const originalSignIn=ports.signIn;
  ports.createGuard=options=>(guard=createClinicRequestGuard(options));
  ports.signIn=async options=>{
   const signed=await originalSignIn(options);options.observe({stage:'complete',authResponseObserved:true});
   const outer=ports.state().routes.at(-1);
   for(const [pathname,method] of [['/api/analytics/web','POST'],['/api/clinic/session/reset','POST'],['/api/rcap/packets/unknown/download','GET']]) {
    const req=request(pathname,{method,type:'fetch'});req.frame=()=>({url:()=>origin+OWNED_MATTER_PATH});req.isNavigationRequest=()=>false;req.failure=()=>({errorText:'net::ERR_BLOCKED_BY_CLIENT'});
    await outer({request:()=>req,fulfill:async value=>actions.push(['local',value.status]),abort:async reason=>{actions.push(['abort',reason]);guard.requestFailed(req);},fallback:async()=>assert.fail('blocked/suppressed request must not reach network')});
   }
   return signed;
  };
  const r=await runOwnedMatterReadonly({...cfg,...ports});assert.equal(r.passed,false);assert.equal(r.canonicalRendered,true);assert.equal(r.outerFailureCount,2);
  assert.deepEqual(actions,[['local',204],['abort','blockedbyclient'],['abort','blockedbyclient']]);
  const blocks=r.guardEvents.filter(e=>e.outcome==='readonly_blocked');assert.equal(blocks.length,2);assert.notEqual(blocks[0].requestId,blocks[1].requestId);
  for(const block of blocks){const failed=r.requestFailures.find(e=>e.requestId===block.requestId);assert(failed);assert.equal(failed.ruleId,block.ruleId);}
  assert.equal(r.signInDiagnostics[0].stage,'complete');assert(!JSON.stringify(r).includes('CANARY'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('actual three-layer owned-matter browser route chain suppresses speculative Next prefetch with zero forwarded reads',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'owned-next-prefetch-'));
 try {
  const cfg=inputs(dir),ports=doubles(),originalSignIn=ports.signIn;let guard,networkCalls=0,suppressions=0;
  ports.createGuard=options=>(guard=createClinicRequestGuard(options));
  ports.signIn=async options=>{
   const signed=await originalSignIn(options);
   const req=nextSpeculative('/briefcase/'+OWNED_MATTER_ID+'/packet-information?_rsc=test',{frame:'/briefcase'});
   const layers=ports.state().routes;
   assert.equal(layers.length,3,'actual routing stack changed');
   const dispatch=async index=>layers[index]({
    request:()=>req,
    fallback:async()=>index===0?assert.fail('optional prefetch forwarded to actual network'):dispatch(index-1),
    abort:async reason=>{assert.equal(reason,'blockedbyclient');suppressions++;guard.requestFailed(req);},
    fulfill:async()=>{networkCalls++;assert.fail('speculative GET must not be fulfilled as an actual read')},
    fetch:async()=>{networkCalls++;assert.fail('speculative GET was sent to server')}
   });
   await dispatch(layers.length-1);
   return signed;
  };
  const result=await runOwnedMatterReadonly({...cfg,...ports});
  assert.equal(result.passed,true,'auth and canonical matter must still pass after suppression');
  assert.equal(result.outerFailureCount,0);
  assert.equal(result.businessWritesForwarded,0);
  assert.equal(result.canonicalRendered,true);
  assert.equal(networkCalls,0);assert.equal(suppressions,1);
  assert(result.guardEvents.some(e=>e.outcome==='optional_owned_matter_prefetch'));
  assert(result.requestFailures.some(e=>e.outcome==='optional_request_failed'));
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
for(const httpStatus of [401,403,500])test(`allowed read HTTP ${httpStatus} cannot pass even without a console or page error`,async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'owned-readonly-http-test-'));
 try {
  const cfg=inputs(dir),ports=doubles();let guard,fetches=0,forwardedRefusal=false;const originalSignIn=ports.signIn;
  ports.createGuard=options=>(guard=createClinicRequestGuard(options));
  ports.signIn=async options=>{
   const signed=await originalSignIn(options);
   const req=request('/auth/v1/user',{base:auth,type:'fetch'});req.frame=()=>({url:()=>origin+'/briefcase'});req.isNavigationRequest=()=>false;req.failure=()=>({errorText:'net::ERR_FAILED'});
   const original={request:()=>req,status:()=>httpStatus,headers:()=>({})};
   const dispatch=async index=>ports.state().routes[index]({request:()=>req,
    fetch:async()=>{fetches++;return original;},
    fulfill:async value=>{assert.equal(value.response,original);forwardedRefusal=true;guard.response(original);},abort:async()=>assert.fail('HTTP refusal response should be preserved'),fallback:async()=>dispatch(index-1)});
   await dispatch(ports.state().routes.length-1);return signed;
  };
  const r=await runOwnedMatterReadonly({...cfg,...ports});assert.equal(fetches,1);assert.equal(r.passed,false);assert.equal(forwardedRefusal,true);
  const refusal=r.outerFailures.find(e=>e.ruleId==='readonly_http_refusal_blocked');assert(refusal);assert.equal(refusal.httpStatus,httpStatus);assert.equal(refusal.operation,'read_http_status');
  const observed=r.guardEvents.find(e=>e.requestId===refusal.requestId&&e.outcome==='response_received');assert(observed);assert.equal(observed.ruleId,refusal.ruleId);assert.equal(observed.httpStatus,httpStatus);
  assert.equal(r.canonicalRendered,true);assert(fs.existsSync(path.join(dir,'owned-matter-readonly-result.json')));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('prefetch suppression refuses unknown family paths and validates source-defined continuation values',()=>{
 for(const target of ['/briefcase/unrecognized?_rsc=test','/expungement-ai/unrecognized?_rsc=test','/briefcase/settings/private?_rsc=test','/auth/forgot-password?_rsc=test&product=other','/auth/forgot-password?_rsc=test&next=https%3A%2F%2Fother.invalid','/expungement-ai/sign-in?_rsc=test&mode=unexpected'])assert.equal(ownedMatterSpeculativePrefetch(nextSpeculative(target)),false);
 assert.equal(ownedMatterSpeculativePrefetch(nextSpeculative('/auth/forgot-password?_rsc=test&next=%2Fbriefcase&product=expungement',{frame:'/expungement-ai/sign-in'})),true);
});
test('only exact owner-overview HTML matter Links qualify for local suppression, never forwarding or required reads',()=>{
 const other='/briefcase/11111111-1111-4111-8111-111111111111';
 const links=ownedMatterOverviewLinks(`<a href="${other}">Existing matter</a><a href="https://other.invalid${other}">external</a><a href="${other}/packet-information">off-scope</a><a href="/briefcase/unrecognized">unknown</a>`);
 assert.deepEqual([...links],[other]);
 const speculative=nextSpeculative(other+'?_rsc=test');
 assert.equal(ownedMatterSpeculativePrefetch(speculative),false);
 assert.equal(ownedMatterReadonlyDecision(speculative,[],links),'optional_owned_matter_prefetch');
 assert.equal(ownedMatterReadonlyDecision(nextSpeculative(other+'?_rsc=test',{navigation:true}),[],links),'readonly_read_path_blocked');
 assert.equal(ownedMatterSpeculativePrefetch(nextSpeculative(other+'?_rsc=test',{frame:OWNED_MATTER_PATH}),links),false);
});
import {chromium} from 'playwright';
test('native Chromium layered routing suppresses the observed RSC fetch locally and leaves unknown requests fatal',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.RCAP_BROWSER_CHROMIUM||'/usr/bin/google-chrome'});
 try {
  for(const unknown of [false,true]) {
   const context=await browser.newContext();const events=[],failures=[];let networkCalls=0;
   const guard=createClinicRequestGuard({actor:'participant',captchaPolicy:{},env:{},stage:()=> 'existing_next_link',events,requestFailures:failures,isOwnedMatterSpeculativePrefetch:ownedMatterSpeculativePrefetch});
   await context.route('**/*',route=>{if(route.request().isNavigationRequest())return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Native routing fixture; not Next application proof</title>'});networkCalls++;return route.abort();});
   await context.route('**/*',guard.route);
   await context.route('**/*',route=>{const decision=ownedMatterReadonlyDecision(route.request());if(['allowed','optional_owned_matter_prefetch'].includes(decision))return route.fallback();guard.recordReadonlyBoundary(route.request(),{outcome:'readonly_blocked',ruleId:decision});return route.abort('blockedbyclient');});
   const page=await context.newPage();page.on('requestfailed',guard.requestFailed);page.on('console',guard.consoleError);page.on('pageerror',guard.pageError);
   await page.goto(origin+'/briefcase');
   const failure=page.waitForEvent('requestfailed');
   await page.evaluate(async target=>{await fetch(target,{headers:{RSC:'1','Next-Router-Prefetch':'1'}}).catch(()=>{});},unknown?'/briefcase/unrecognized?_rsc=test':'/briefcase/'+OWNED_MATTER_ID+'/packet-information?_rsc=test');
   await failure;assert.equal(networkCalls,0);
   if(unknown)assert.throws(()=>guard.assertNoCritical());else{assert.doesNotThrow(()=>guard.assertNoCritical());assert(events.some(e=>e.outcome==='optional_owned_matter_prefetch'));assert(failures.some(e=>e.outcome==='optional_request_failed'));}
   await context.close();
  }
 }finally{await browser.close();}
});

test('actual orchestration binds original Auth identity before overview fulfillment and suppresses only its rendered matter Links',async()=>{
 for(const ownerMatches of [true,false]) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'owned-original-auth-links-'));
  try {
   const cfg=inputs(dir),ports=doubles(),originalSignIn=ports.signIn;let guard,authPosts=0,otherReads=0,suppressed=0;
   ports.createGuard=options=>(guard=createClinicRequestGuard(options));
   ports.signIn=async options=>{
    const signed=await originalSignIn(options);const other='/briefcase/11111111-1111-4111-8111-111111111111';
    const dispatch=async(req,response)=>{
     req.frame=()=>({url:()=>origin+'/briefcase'});req.isNavigationRequest=()=>req.resourceType()==='document';req.failure=()=>({errorText:'net::ERR_BLOCKED_BY_CLIENT'});
     const step=async index=>ports.state().routes[index]({request:()=>req,fetch:async()=>{if(req.method()==='POST')authPosts++;if(new URL(req.url()).pathname===other)otherReads++;return response;},fulfill:async()=>{},abort:async()=>{suppressed++;guard.requestFailed(req);},fallback:async()=>step(index-1)});
     await step(ports.state().routes.length-1);
    };
    const id=ownerMatches?CLINIC_SETUP.owner:'22222222-2222-4222-8222-222222222222',authBody={user:{id},access_token:'PRIVATE_FIXTURE_TOKEN'};
    await dispatch(request('/auth/v1/token?grant_type=password',{base:auth,method:'POST',type:'fetch'}),{status:()=>200,headers:()=>({}),body:async()=>Buffer.from(JSON.stringify(authBody)),json:async()=>authBody});
    await dispatch(request('/briefcase'),{status:()=>200,headers:()=>({}),body:async()=>Buffer.from(`<script src="/_next/static/chunks/fixture.js"></script><a href="${other}">Existing owner matter</a>`)});
    await dispatch(nextSpeculative(other+'?_rsc=test'),null);
    return {...signed,id};
   };
   const r=await runOwnedMatterReadonly({...cfg,...ports});assert.equal(authPosts,1);assert.equal(otherReads,0);assert.equal(suppressed,1);assert.equal(r.passed,ownerMatches);
   assert(r.guardEvents.some(e=>e.outcome===(ownerMatches?'optional_owned_matter_prefetch':'readonly_blocked')));assert(!JSON.stringify(r).includes('PRIVATE_FIXTURE_TOKEN'));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
 }
});
