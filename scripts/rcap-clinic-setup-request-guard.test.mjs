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
