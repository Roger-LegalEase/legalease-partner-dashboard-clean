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
import {OWNED_MATTER_ID,OWNED_MATTER_PATH,assertOwnedMatterReadonlyInputs,ownedMatterReadonlyDecision,observeOwnedMatterPasswordRoute,runOwnedMatterReadonly} from './rcap-clinic-owned-matter-readonly.mjs';

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
