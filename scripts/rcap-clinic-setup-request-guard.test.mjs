import test from 'node:test';
import assert from 'node:assert/strict';
import {CLINIC_SETUP} from './rcap-clinic-setup-only-boundary.mjs';
import {TOOLBAR_LOADER,TURNSTILE_LOADER} from './rcap-clinic-resume-network-policy.mjs';
import {classifyClinicRequest,createClinicRequestGuard} from './rcap-clinic-setup-request-guard.mjs';
const policy={project:CLINIC_SETUP.project,serverCaptchaRequired:false,frontend:{applicationSha:CLINIC_SETUP.app,deploymentId:CLINIC_SETUP.deploymentId,clientCaptchaRequired:false,widgetSiteKeyConfigured:true}};
function request(address,method='GET',type='script',extras={}) {
 return {url:()=>address,method:()=>method,resourceType:()=>type,headers:()=>extras.headers??{},
  frame:()=>({url:()=>extras.frame??CLINIC_SETUP.origin+'/expungement-ai/sign-in?mode=signin&next=%2Fbriefcase'}),
  failure:()=>({errorText:extras.error??'net::ERR_BLOCKED_BY_CLIENT'})};
}
function fixture(actor,captchaPolicy=policy) {
 const events=[],requestFailures=[];let action=null;
 const guard=createClinicRequestGuard({actor,captchaPolicy,env:{RCAP_BROWSER_PASSWORD:'mock.private'},stage:()=> 'before_code',events,requestFailures});
 const route=async req=>{await guard.route({request:()=>req,abort:async()=>{action='abort';},fallback:async()=>{action='fallback';},continue:async()=>{action='continue';}});return action;};
 return {guard,events,requestFailures,route};
}
test('named application HTTP refusals remain fatal even without a browser network error',()=>{
 for(const pathname of ['/api/expungement-ai/screening/progress','/api/expungement-ai/screening/complete','/api/clinic/entry',
  '/api/clinic/assistance/start','/api/expungement-ai/evaluate','/api/expungement-ai/screening/pending','/api/expungement-ai/screening/pending/claim']) {
  for(const status of [201,204,302,400,403,409,500]) {
   const f=fixture('participant');f.guard.response({request:()=>request(CLINIC_SETUP.origin+pathname,'POST','fetch'),status:()=>status});
   assert.throws(()=>f.guard.assertNoCritical());
  }
  const f=fixture('participant');f.guard.response({request:()=>request(CLINIC_SETUP.origin+pathname,'POST','fetch'),status:()=>200});f.guard.assertNoCritical();
 }
});
for(const actor of ['admin','participant']) test(`${actor}: intentional exact optional blocks do not poison permitted calls or console evidence`,async()=>{
 const f=fixture(actor);
 for(const url of [TOOLBAR_LOADER,TURNSTILE_LOADER]) {
  const req=request(url);assert.equal(await f.route(req),'abort');f.guard.requestFailed(req);
  f.guard.consoleError({type:()=> 'error',location:()=>({url}),text:()=> 'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT'});
  f.guard.consoleError({type:()=> 'error',location:()=>({url}),text:()=> 'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT.Inspector'});
 }
 assert.equal(await f.route(request(CLINIC_SETUP.origin+'/api/clinic/events/'+CLINIC_SETUP.event,'GET','fetch')),'fallback');
 f.guard.assertNoCritical();assert.equal(f.requestFailures.length,2);assert.ok(f.events.every(row=>row.stage==='before_code'));
 assert.ok(f.events.every(row=>!('url' in row)&&!('headers' in row)));
});
for(const [name,change] of [
 ['wrong origin',()=>request('https://different.invalid/_next-live/feedback/feedback.js')],
 ['wrong resource type',()=>request(TOOLBAR_LOADER,'GET','fetch')],
 ['wrong method',()=>request(TOOLBAR_LOADER,'POST')],
 ['wrong path',()=>request('https://vercel.live/private-upload')],
 ['wrong frame',()=>request(TOOLBAR_LOADER,'GET','script',{frame:'https://different.invalid/'})]
]) test(`optional classification refuses ${name}`,async()=>{
 const f=fixture('admin');assert.equal(await f.route(change()),'abort');assert.throws(()=>f.guard.assertNoCritical());
});
for(const captchaPolicy of [null,{serverCaptchaRequired:true,frontend:policy.frontend},{serverCaptchaRequired:false,frontend:{clientCaptchaRequired:true,widgetSiteKeyConfigured:true}}])
 test('required or unknown CAPTCHA never becomes optional',async()=>{
  const f=fixture('participant',captchaPolicy);assert.equal(await f.route(request(TURNSTILE_LOADER)),'abort');assert.throws(()=>f.guard.assertNoCritical());
 });
test('critical application aborts and unknown console/page errors remain fatal',async()=>{
 for(const actor of ['admin','participant']) {
  const f=fixture(actor),req=request(CLINIC_SETUP.origin+'/api/expungement-ai/screening/pending','POST','fetch',{error:'net::ERR_ABORTED'});
  f.guard.requestFailed(req);assert.throws(()=>f.guard.assertNoCritical());
 }
 const f=fixture('participant');f.guard.consoleError({type:()=> 'error',location:()=>({url:'https://unknown.invalid/x.js'}),text:()=> 'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT'});
 assert.throws(()=>f.guard.assertNoCritical());
 const page=fixture('admin');page.guard.pageError();assert.throws(()=>page.guard.assertNoCritical());
});
test('second code POST, funding, generation, encoded delivery and unknown external writes remain blocked',async()=>{
 const f=fixture('admin'),url=CLINIC_SETUP.origin+`/api/clinic/events/${CLINIC_SETUP.event}/access-codes`;
 assert.equal(await f.route(request(url,'POST','fetch')),'fallback');assert.equal(await f.route(request(url,'POST','fetch')),'abort');assert.throws(()=>f.guard.assertNoCritical());
 for(const [method,url] of [['POST',CLINIC_SETUP.origin+'/api/clinic/packet/funding'],['POST',CLINIC_SETUP.origin+'/api/expungement-ai/packet/render'],['GET',CLINIC_SETUP.origin+'/%61pi/rcap/packets/id/download'],['POST','https://different.invalid/upload']]) {
  const block=fixture('participant');assert.equal(await block.route(request(url,method,'fetch')),'abort');assert.throws(()=>block.guard.assertNoCritical());
 }
});
test('only explicit same-origin Next prefetch is intentionally suppressed',async()=>{
 const f=fixture('participant'),url=CLINIC_SETUP.origin+'/auth/forgot-password';
 const req=request(url,'GET','fetch',{headers:{'next-router-prefetch':'1'}});
 assert.equal(await f.route(req),'abort');f.guard.requestFailed(req);f.guard.assertNoCritical();
 const required=fixture('participant'),normal=request(url,'GET','fetch',{error:'net::ERR_ABORTED'});
 assert.equal(await required.route(normal),'fallback');required.guard.requestFailed(normal);assert.throws(()=>required.guard.assertNoCritical());
});
test('guard evidence redacts known path/origin values and strips queries',async()=>{
 const f=fixture('admin'),req=request('https://mock.private.invalid/mock.private?password=do-not-record','POST','fetch');
 await f.route(req);f.guard.requestFailed(req);const saved=JSON.stringify(f.events);
 assert.ok(!saved.includes('mock.private'));assert.ok(!saved.includes('do-not-record'));assert.ok(saved.includes('resourceType'));
});

test('safe response observer retains actual statuses for Auth, workspace, evaluation, pending save and atomic claim',()=>{
 const stageResults=[];const guard=createClinicRequestGuard({actor:'participant',captchaPolicy:policy,env:{},stage:()=> 'test',events:[],requestFailures:[],stageResults});
 for(const [address,method,status] of [[`https://${CLINIC_SETUP.project}.supabase.co/auth/v1/token?grant_type=password`,'POST',200],
  [CLINIC_SETUP.origin+'/api/clinic/events/'+CLINIC_SETUP.event,'GET',403],
  [CLINIC_SETUP.origin+'/api/expungement-ai/evaluate','POST',200],
  [CLINIC_SETUP.origin+'/api/expungement-ai/screening/pending','POST',200],
  [CLINIC_SETUP.origin+'/api/expungement-ai/screening/pending/claim','POST',409]])
  guard.response({request:()=>request(address,method,'fetch'),status:()=>status});
 assert.deepEqual(stageResults.map(row=>row.stage),['normal_auth','event_workspace','screening_evaluation','pending_save','atomic_claim']);
 assert.deepEqual(stageResults.map(row=>row.httpStatus),[200,403,200,200,409]);
 assert.ok(stageResults.every(row=>Object.keys(row).length===5));assert.ok(!JSON.stringify(stageResults).includes('grant_type'));
});
test('signup and extra-query frames never qualify optional CAPTCHA suppression',async()=>{
 for(const frame of [CLINIC_SETUP.origin+'/expungement-ai/sign-in?mode=create&next=%2Fbriefcase',
  CLINIC_SETUP.origin+'/expungement-ai/sign-in?mode=signin&next=%2Fbriefcase&extra=1']) {
  const f=fixture('participant');await f.route(request(TURNSTILE_LOADER,'GET','script',{frame}));assert.throws(()=>f.guard.assertNoCritical());
 }
 const f=fixture('participant');await f.route(request(TOOLBAR_LOADER+'?token=not-recorded'));assert.throws(()=>f.guard.assertNoCritical());
});

test('canonical matter and existing alias frames suppress only the exact optional toolbar',async()=>{
 const id='11111111-1111-4111-8111-111111111111';
 for(const actor of ['admin','participant'])for(const pathname of [`/briefcase/matters/${id}`,`/briefcase/${id}`]) {
  const f=fixture(actor),req=request(TOOLBAR_LOADER,'GET','script',{frame:CLINIC_SETUP.origin+pathname});
  assert.equal(classifyClinicRequest(req,{actor,captchaPolicy:policy}),'optional_toolbar_blocked');
  assert.equal(await f.route(req),'abort');f.guard.requestFailed(req);f.guard.assertNoCritical();
 }
});
test('matter frame support preserves origin, query, UUID, resource, method and operation restrictions',async()=>{
 const pathname='/briefcase/matters/11111111-1111-4111-8111-111111111111',frame=CLINIC_SETUP.origin+pathname;
 const refused=[
  request(TOOLBAR_LOADER,'GET','script',{frame:'https://different.invalid'+pathname}),
  request(TOOLBAR_LOADER,'GET','script',{frame:frame+'?extra=1'}),
  request(TOOLBAR_LOADER,'GET','script',{frame:frame+'/packet-information'}),
  request(TOOLBAR_LOADER,'GET','script',{frame:CLINIC_SETUP.origin+'/briefcase/matters/not-a-uuid'}),
  request(TOOLBAR_LOADER,'GET','script',{frame:CLINIC_SETUP.origin+'/briefcase/matters/'+'-'.repeat(36)}),
  request(TOOLBAR_LOADER,'POST','script',{frame}),
  request(TOOLBAR_LOADER,'GET','fetch',{frame}),
  request(TOOLBAR_LOADER+'?extra=1','GET','script',{frame}),
  request('https://different.invalid/_next-live/feedback/feedback.js','GET','script',{frame}),
  request(TURNSTILE_LOADER,'GET','script',{frame}),
  ...['/api/clinic/packet/funding','/api/expungement-ai/packet/render','/api/expungement-ai/checkout','/api/clinic/session/reset']
   .map(path=>request(CLINIC_SETUP.origin+path,'POST','fetch',{frame})),
  request('https://different.invalid/upload','POST','fetch',{frame})
 ];
 for(const actor of ['admin','participant'])for(const req of refused) {
  const f=fixture(actor);assert.equal(classifyClinicRequest(req,{actor,captchaPolicy:policy}),'critical_blocked');
  assert.equal(await f.route(req),'abort');assert.throws(()=>f.guard.assertNoCritical());
 }
});

test('administrator code issuance requires its documented 201 and retains only sanitized stage evidence',()=>{
 for(const status of [200,201,204,403,500]) {
  const stageResults=[];const guard=createClinicRequestGuard({actor:'admin',captchaPolicy:policy,env:{},stage:()=> 'before_code',events:[],requestFailures:[],stageResults});
  guard.response({request:()=>request(CLINIC_SETUP.origin+'/api/clinic/events/'+CLINIC_SETUP.event+'/access-codes','POST','fetch'),status:()=>status});
  if(status===201)guard.assertNoCritical();else assert.throws(()=>guard.assertNoCritical());
  assert.deepEqual(Object.keys(stageResults[0]).sort(),['actor','stage','httpStatus','pathname','outcome'].sort());
 }
});


test('postclaim diagnostics retain bounded request purpose without permitting packet prefetch or hiding aborts',async()=>{
 const id='11111111-1111-4111-8111-111111111111';
 const f=fixture('participant'),req=request(CLINIC_SETUP.origin+`/briefcase/${id}/packet-information?_rsc=private-rsc&preparation=private-preparation&private-query-name=private-value`,'GET','fetch',{
  headers:{rsc:'1','next-router-prefetch':'1',purpose:'prefetch','sec-purpose':'prefetch;prerender',authorization:'private-header'},frame:CLINIC_SETUP.origin+`/briefcase/matters/${id}`
 });
 assert.equal(await f.route(req),'abort');f.guard.requestFailed(req);
 assert.throws(()=>f.guard.assertNoCritical());
 for(const event of f.events) {
  assert.equal(event.routeCategory,'packet_information');assert.deepEqual(event.queryNames,['_rsc','preparation']);
  assert.equal(event.unknownQueryNames,true);assert.equal(event.rsc,true);assert.equal(event.nextRouterPrefetch,true);assert.equal(event.purposePrefetch,true);
 }
 assert.deepEqual(f.events.map(event=>event.outcome),['critical_blocked','critical_request_failed']);
 const saved=JSON.stringify(f.events);
 for(const secret of ['private-rsc','private-preparation','private-query-name','private-value','private-header',id])assert.equal(saved.includes(secret),false);
 for(const [pathname,category] of [[`/briefcase/matters/${id}`,'canonical_matter'],[`/briefcase/${id}`,'matter_alias'],[`/briefcase/${id}/review`,'matter_review'],['/api/expungement-ai/packet/render','packet_delivery_or_ambiguous']]) {
  const aborted=fixture('participant');aborted.guard.requestFailed(request(CLINIC_SETUP.origin+pathname+'?_rsc=secret','GET','fetch',{error:'net::ERR_ABORTED'}));
  assert.equal(aborted.events[0].routeCategory,category);assert.deepEqual(aborted.events[0].queryNames,['_rsc']);
  assert.equal(aborted.events[0].rsc,false);assert.equal(aborted.events[0].nextRouterPrefetch,false);assert.equal(aborted.events[0].purposePrefetch,false);
  assert.equal(aborted.events[0].outcome,'critical_request_failed');assert.throws(()=>aborted.guard.assertNoCritical());
 }
});

test('request correlation distinguishes an aborted Next navigation from a separately blocked Link prefetch',async()=>{
 const id='11111111-1111-4111-8111-111111111111',frame=CLINIC_SETUP.origin+`/briefcase/matters/${id}`;
 const f=fixture('participant');
 const navigation=request(frame+'?_rsc=private-navigation','GET','fetch',{frame,headers:{rsc:'1',referer:CLINIC_SETUP.origin+'/briefcase?private-name=private-value'},error:'net::ERR_ABORTED'});
 assert.equal(await f.route(navigation),'fallback');f.guard.response({request:()=>navigation,status:()=>200});f.guard.requestFailed(navigation);
 const prefetch=request(CLINIC_SETUP.origin+`/briefcase/${id}/packet-information?_rsc=private-prefetch`,'GET','fetch',{frame,headers:{rsc:'1','next-router-prefetch':'1',referer:frame,purpose:'prefetch'}});
 assert.equal(await f.route(prefetch),'abort');f.guard.requestFailed(prefetch);
 const [allowed,response,aborted,blocked,blockFailure]=f.events;
 assert.equal(allowed.requestId,response.requestId);assert.equal(allowed.requestId,aborted.requestId);
 assert.equal(blocked.requestId,blockFailure.requestId);assert.notEqual(aborted.requestId,blocked.requestId);
 assert.equal(response.httpStatus,200);assert.equal(aborted.outcome,'critical_request_failed');assert.equal(aborted.error,'net::ERR_ABORTED');
 assert.equal(aborted.ruleId,'participant_boundary_allowed');assert.equal(blocked.ruleId,'participant_boundary_denied');
 assert.equal(blocked.outcome,'critical_blocked');assert.equal(blockFailure.outcome,'critical_request_failed');
 assert.equal(aborted.routeTemplate,'/briefcase/matters/[matterId]');assert.equal(blocked.routeTemplate,'/briefcase/[matterId]/packet-information');
 assert.deepEqual(aborted.initiatorContext,{frameRouteTemplate:'/briefcase/matters/[matterId]',refererRouteTemplate:'/briefcase',navigationRequest:false});
 assert.deepEqual(blocked.initiatorContext,{frameRouteTemplate:'/briefcase/matters/[matterId]',refererRouteTemplate:'/briefcase/matters/[matterId]',navigationRequest:false});
 assert.equal(aborted.nextRouterPrefetch,false);assert.equal(blocked.nextRouterPrefetch,true);
 assert.throws(()=>f.guard.assertNoCritical());
 const saved=JSON.stringify(f.events);for(const secret of [id,'private-navigation','private-prefetch','private-name','private-value',CLINIC_SETUP.origin])assert.equal(saved.includes(secret),false);
});

test('exact decision rule identifiers preserve optional, delivery, sensitive URL and second-code denials',async()=>{
 for(const [req,ruleId,outcome] of [
  [request(TOOLBAR_LOADER),'exact_toolbar_optional','optional_toolbar_blocked'],
  [request(TURNSTILE_LOADER),'verified_turnstile_optional','optional_turnstile_blocked'],
  [request(CLINIC_SETUP.origin+'/briefcase','GET','fetch',{headers:{'next-router-prefetch':'1'}}),'named_next_prefetch_optional','optional_prefetch_blocked'],
  [request(CLINIC_SETUP.origin+'/api/expungement-ai/packet/render','GET','fetch'),'browser_delivery_denied','critical_blocked'],
  [request(CLINIC_SETUP.origin+'/briefcase?token=private-token','GET','fetch'),'sensitive_url_denied','critical_blocked']
 ]) {
  const f=fixture('participant');assert.equal(await f.route(req),'abort');assert.equal(f.events[0].ruleId,ruleId);assert.equal(f.events[0].outcome,outcome);
  f.guard.requestFailed(req);assert.equal(f.events[0].requestId,f.events[1].requestId);
  if(outcome.startsWith('optional'))f.guard.assertNoCritical();else assert.throws(()=>f.guard.assertNoCritical());
 }
 const f=fixture('admin'),url=CLINIC_SETUP.origin+`/api/clinic/events/${CLINIC_SETUP.event}/access-codes`;
 assert.equal(await f.route(request(url,'POST','fetch')),'fallback');assert.equal(await f.route(request(url,'POST','fetch')),'abort');
 assert.equal(f.events[1].ruleId,'second_code_post_denied');assert.throws(()=>f.guard.assertNoCritical());
});


test('readonly boundary bridge correlates outer denials and suppression without owning fatal decisions',()=>{
 const f=fixture('participant'),req=request(CLINIC_SETUP.origin+'/unknown-private-path?_rsc=private-query-value','GET','fetch');
 const outer=f.guard.recordReadonlyBoundary(req,{outcome:'readonly_blocked',ruleId:'readonly_read_path_blocked'});
 assert.equal(outer.ruleId,'readonly_read_path_blocked');assert.equal(outer.setupRuleId,'participant_boundary_allowed');
 assert.equal(outer.outcome,'readonly_blocked');assert.equal(f.events.length,1);f.guard.assertNoCritical();
 f.guard.requestFailed(req);
 assert.equal(f.events[1].requestId,outer.requestId);assert.equal(f.events[1].ruleId,'readonly_read_path_blocked');
 assert.equal(f.events[1].setupRuleId,'participant_boundary_allowed');assert.equal(f.events[1].outcome,'critical_request_failed');
 assert.throws(()=>f.guard.assertNoCritical());
 const telemetry=fixture('participant'),ping=request(CLINIC_SETUP.origin+'/api/analytics/web','POST','ping');
 const suppressed=telemetry.guard.recordReadonlyBoundary(ping,{outcome:'readonly_telemetry_suppressed',ruleId:'readonly_telemetry_suppressed'});
 assert.equal(suppressed.ruleId,'readonly_telemetry_suppressed');assert.notEqual(suppressed.requestId,null);
 assert.equal(telemetry.events.length,1);telemetry.guard.assertNoCritical();
 for(const entry of [{outcome:'private-outcome',ruleId:'readonly_read_path_blocked'},
  {outcome:'readonly_blocked',ruleId:'private-rule'},
  {outcome:'readonly_blocked',ruleId:'readonly_telemetry_suppressed'}])assert.throws(()=>telemetry.guard.recordReadonlyBoundary(ping,entry));
 const refusal=fixture('participant'),read=request(CLINIC_SETUP.origin+'/briefcase','GET','fetch');
 const denied=refusal.guard.recordReadonlyBoundary(read,{outcome:'readonly_blocked',ruleId:'readonly_http_refusal_blocked'});
 assert.equal(denied.ruleId,'readonly_http_refusal_blocked');assert.equal(denied.outcome,'readonly_blocked');
 refusal.guard.requestFailed(read);assert.equal(refusal.events[1].requestId,denied.requestId);assert.equal(refusal.events[1].ruleId,'readonly_http_refusal_blocked');
 assert.throws(()=>refusal.guard.assertNoCritical());
 const saved=JSON.stringify(f.events);for(const secret of ['unknown-private-path','private-query-value',CLINIC_SETUP.origin])assert.equal(saved.includes(secret),false);
});
