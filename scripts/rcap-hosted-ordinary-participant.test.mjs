import assert from 'node:assert/strict';
import test from 'node:test';
import {EventEmitter} from 'node:events';
import fs from 'node:fs';
import {runOrdinaryParticipant,ordinaryRequestAllowed,ordinaryClaimReconciliationSql,assertOrdinaryAdmission,ORDINARY_APPLICATION_SHA,ORDINARY_PARTNER,ORDINARY_PARTICIPANT} from './rcap-hosted-ordinary-participant.mjs';
import {MISSISSIPPI_SCREENING_CHOICES} from './rcap-ms-screening-browser.mjs';
import {MS_NONCONVICTION_ROUTE,MS_NONCONVICTION_SCREENING_ANSWERS} from './lib/rcap-ms-nonconviction-fixture.mjs';
const origin='https://ordinary-fixture.vercel.app',session='11111111-1111-4111-8111-111111111111',item='22222222-2222-4222-8222-222222222222',job='33333333-3333-4333-8333-333333333333',requestId='44444444-4444-4444-8444-444444444444';
const binding={actualStartSucceeded:true,applicationSha:ORDINARY_APPLICATION_SHA,origin,deploymentId:'dpl_SyntheticOrdinary9aad',sourceBindingSha256:'a'.repeat(64),partnerSlug:ORDINARY_PARTNER,participantUserId:ORDINARY_PARTICIPANT};
const matches=(pattern,text)=>pattern instanceof RegExp?pattern.test(text):pattern===text;
function harness(options={},shared={custody:null,claimed:false,queued:false,verified:false,checkpoints:[],counts:{auth:0,start:0,pending:0,claim:0,generation:0,image:0,window:0},questions:[]}){
 const counts=shared.counts;let activeFault=options.failClaimCheckpoint===true,admissions=0;
 const row=()=>({transaction_read_only:'on',database_name:'postgres',database_user:'postgres',
  item:{id:item,user_id:ORDINARY_PARTICIPANT,source_session_id:session,jurisdiction:'MS',payment_allowed:false,payment_status:'not_applicable'},
  source:{consumer_auth_user_id:ORDINARY_PARTICIPANT,briefcase_item_id:item,claimed_user_id:ORDINARY_PARTICIPANT,claimed_at:'2026-10-27T00:00:00Z',product:'rcap_partner',partner_slug:ORDINARY_PARTNER,partner_benefit_active:true,jurisdiction:'MS',profile_version:MS_NONCONVICTION_ROUTE.profileVersion,screening_answers:MS_NONCONVICTION_SCREENING_ANSWERS},
  authority:{valid:true,partner_slug:ORDINARY_PARTNER,partner_id:'55555555-5555-4555-8555-555555555555',clinic_event_id:null,clinic_case_id:null},
  verification:{consumer_auth_user_id:ORDINARY_PARTICIPANT,briefcase_item_id:item,status:shared.verified?'verified':'unverified',revision:1,verification_hash:'b'.repeat(64),jurisdiction:'MS',pathwayId:MS_NONCONVICTION_ROUTE.pathwayId},
  jobs:shared.queued?[{id:job,briefcase_item_id:item,sponsored_consumer_briefcase_item_id:item,sponsored_consumer_auth_user_id:ORDINARY_PARTICIPANT,sponsored_session_id:session,sponsored_clinic_event_id:null,route_id:MS_NONCONVICTION_ROUTE.routeId,sponsored_route_key:MS_NONCONVICTION_ROUTE.routeId,sponsored_verification_hash:'b'.repeat(64),renderer_kind:'packet_document_v1',status:'queued',attempt_count:0,output_storage_path:null,output_sha256:null}]:[]});
 class Page extends EventEmitter{
  constructor(){super();this.current=origin+'/briefcase';this.phase='signin';this.index=0;this.expanded=false;this.waiters=[];this.fallbacks=0;}
  route(_pattern,handler){this.guard=handler;}
  url(){return this.current;}
  async goto(url){await this.emitRequest(url,'GET');this.current=url;return {status:()=>200};}
  async waitForURL(predicate){assert(predicate(new URL(this.current)),'Actual canonical path required');if(this.current.endsWith('/packet-information')){this.current=origin+`/briefcase/${item}/review`;this.phase='review';}}
  waitForResponse(predicate){return new Promise(resolve=>this.waiters.push({predicate,resolve}));}
  async emitRequest(url,method='POST',body){
   const u=new URL(url);const req={url:()=>url,method:()=>method,postDataJSON:()=>{if(body===undefined)throw Error('No JSON body');return body;},headers:()=>({'x-vercel-protection-bypass':'PRIVATE_BYPASS'})};
   const respond=()=>{
    if(u.hostname.endsWith('.supabase.co')){counts.auth++;return {user:{id:options.wrongOwner?'66666666-6666-4666-8666-666666666666':ORDINARY_PARTICIPANT}};}
    if(u.pathname==='/api/expungement-ai/profiles/MS')return {jurisdiction:{code:'MS'},profileVersion:MS_NONCONVICTION_ROUTE.profileVersion,questions:MISSISSIPPI_SCREENING_CHOICES.map(c=>({id:c.id,prompt:c.prompt,type:'single_choice',required:c.id==='ms_program_order'?options.requiredProgramOrder===true:true,contextOnly:false}))};
    if(u.pathname==='/api/expungement-ai/evaluate')return {jurisdiction:'MS',profileVersion:MS_NONCONVICTION_ROUTE.profileVersion,matterId:body.matterId,resultCode:'packet_ready',paymentAllowed:false,consumerPacketAvailable:false,sponsoredPacketAvailable:true,missingQuestionIds:[]};
    if(u.pathname==='/api/expungement-ai/screening/progress')return {jurisdiction:'MS',profileVersion:MS_NONCONVICTION_ROUTE.profileVersion,questionIds:MISSISSIPPI_SCREENING_CHOICES.map(c=>c.id)};
    if(u.pathname==='/api/expungement-ai/screening/pending'){counts.pending++;assert.equal(shared.custody.stage,'ordinary_before_pending_and_claim');return {ok:true,claimToken:'PRIVATE_CLAIM_TOKEN'};}
    if(u.pathname==='/api/expungement-ai/screening/pending/claim'){counts.claim++;shared.claimed=true;return {ok:true,matterId:item,redirectTo:`/briefcase/matters/${item}`};}
    if(u.pathname.endsWith('/packet-information')){shared.verified=true;return {ok:true,readyToGenerate:true,commercialActions:{generationAllowed:true,checkoutAllowed:false}};}
    if(u.pathname==='/api/expungement-ai/packet/generate'){counts.generation++;assert.equal(shared.custody.stage,'ordinary_generate_before_forward');assert(shared.custody.firstEnqueueCapableActionAt);shared.queued=true;return {briefcaseItemId:item,packetStatus:'generating',canDownload:false};}
    if(u.pathname===`/intake/${ORDINARY_PARTNER}`&&method==='POST'){counts.start++;assert.equal(shared.custody.stage,'ordinary_before_intake_start');return {};}
    return {};
   };
   let response;
   const deliver=async()=>{response??={status:()=>200,body:async()=>Buffer.from(JSON.stringify(respond())),headers:()=>({})};
    const data=await response.body();const event={request:()=>req,url:()=>url,status:()=>200,json:async()=>JSON.parse(data.toString())};
    if(u.pathname==='/api/expungement-ai/screening/pending/claim'){assert.equal(shared.custody.stage,'ordinary_claim_response_observed','Custody must precede claim navigation');this.current=origin+`/briefcase/matters/${item}`;}
    this.emit('response',event);for(const waiter of [...this.waiters])if(waiter.predicate(event)){this.waiters.splice(this.waiters.indexOf(waiter),1);waiter.resolve(event);}
   };
   const route={request:()=>req,fetch:async opts=>{assert.equal(opts.maxRedirects,0);assert.equal(opts.maxRetries,0);if(u.origin!==origin)assert.equal(opts.headers['x-vercel-protection-bypass'],undefined);const data=respond();response={status:()=>200,body:async()=>Buffer.from(JSON.stringify(data)),headers:()=>({})};return response;},fulfill:async()=>deliver(),fallback:async()=>{this.fallbacks++;await deliver();},continue:async()=>{throw Error('Never bypass the context handler with continue');},abort:async()=>{throw Error('Request aborted by strict policy');}};
   await this.guard(route);
  }
  locator(selector){return new Locator(this,{selector});}
  getByRole(role,opts={}){return new Locator(this,{role,...opts});}
  getByText(text){return new Locator(this,{text});}
  evaluate(){return {status:200,body:{revision:1,answers:{}}};}
  waitForTimeout(){throw Error('Test page should expose the actual next question immediately');}
 }
 class Locator{
  constructor(page,info){this.page=page;this.info=info;}
  locator(selector){return new Locator(this.page,{selector,parent:this});}
  getByRole(role,opts={}){return new Locator(this.page,{role,...opts,parent:this});}
  filter(){return this;}
  async waitFor(){assert(await this.isVisible());}
  async isVisible(){const {role,name}=this.info;if(role==='heading'){
    if(matches(name,'A path may be available'))return this.page.phase==='result';
    return this.page.phase==='screening'&&matches(name,MISSISSIPPI_SCREENING_CHOICES[this.page.index]?.prompt??'');
   }return true;}
  async count(){if(this.info.role==='radio')return this.info.checked===true?0:2;return 1;}
  async getAttribute(name){if(name==='aria-expanded')return String(this.page.expanded);if(name==='id')return 'q-ms_program_order-prompt';if(name==='data-packet-verification-state')return 'unverified';return null;}
  async textContent(){return 'Optional';}
  async inputValue(){return this.info.selector==='input[name="requestId"]'?requestId:'';}
  async fill(){assert(!this.info.selector?.includes('ms_program_order'));}
  async check(){shared.questions.push(MISSISSIPPI_SCREENING_CHOICES[this.page.index].id);}
  async all(){return [];}
  async click(){const p=this.page,{role,name,selector}=this.info;
   if(role==='button'&&name==='Sign in'){await p.emitRequest('https://hyflxnlhpmiqxvvcoiia.supabase.co/auth/v1/token?grant_type=password','POST',{email:'owner@rcap-acceptance.test',password:'PRIVATE_PASSWORD'});p.current=origin+'/briefcase';return;}
   if(selector?.startsWith('a[href="/intake/')){p.current=origin+`/intake/${ORDINARY_PARTNER}`;return;}
   if(role==='button'&&name==='Start free screening'){
    await p.emitRequest(origin+`/intake/${ORDINARY_PARTNER}`,'POST');if(options.uncertainStart)throw Error('UNCERTAIN_INTAKE');
    p.current=origin+'/expungement-ai/screening/ms?session='+session;p.phase='screening';await p.emitRequest(origin+'/api/expungement-ai/profiles/MS','GET');return;
   }
   if(role==='button'&&name==='Show optional help'){p.expanded=true;return;}
   if(role==='button'&&matches(name,'Continue')){
    p.index++;await p.emitRequest(origin+'/api/expungement-ai/screening/progress','POST',{jurisdiction:'MS',profileVersion:MS_NONCONVICTION_ROUTE.profileVersion});
    if(p.index>=MISSISSIPPI_SCREENING_CHOICES.length){p.phase='result';await p.emitRequest(origin+'/api/expungement-ai/evaluate','POST',{jurisdiction:'MS',profileVersion:MS_NONCONVICTION_ROUTE.profileVersion,matterId:requestId});}return;
   }
   if(role==='button'&&name==='Save my result and continue'){
    await p.emitRequest(origin+'/api/expungement-ai/screening/pending','POST',{anonymousSessionId:session});await p.emitRequest(origin+'/api/expungement-ai/screening/pending/claim','POST',{claimToken:'PRIVATE_CLAIM_TOKEN'});return;
   }
   if(role==='link'&&name==='Complete packet information'){p.current=origin+`/briefcase/${item}/packet-information`;return;}
   if(role==='button'&&name==='Verify and prepare clinic packet'){
    await p.emitRequest(origin+`/api/expungement-ai/briefcase/${item}/packet-information`,'POST',{expectedRevision:0,verify:true});await p.emitRequest(origin+'/api/expungement-ai/packet/generate','POST',{briefcaseItemId:item});
    if(options.duplicateGeneration)await p.emitRequest(origin+'/api/expungement-ai/packet/generate','POST',{briefcaseItemId:item});return;
   }
   throw Error('Unsupported old/manual UI selector');
  }
 }
 const page=new Page();
 const args={page,anonymousPage:{goto:async()=>{},evaluate:async()=>401},strangerPage:{goto:async()=>{},evaluate:async()=>404},origin,email:'owner@rcap-acceptance.test',password:'PRIVATE_PASSWORD',bypass:'PRIVATE_BYPASS',
  admit:async()=>{admissions++;return {...binding,...(options.notLive?{actualStartSucceeded:false}:{}),...(options.changedBinding&&admissions>1?{sourceBindingSha256:'c'.repeat(64)}:{})};},
  assertExclusiveWindow:async()=>{counts.window++;if(options.lostWindow)throw Error('Window lost');},verifyPreparedImageBeforeVerify:async()=>{counts.image++;},
  authorizeRequest:async()=>options.rejectPolicy!==true,
  loadCustody:async()=>options.staleCustodyRead?null:structuredClone(shared.custody),
  checkpoint:async record=>{if(options.failBeforeStart&&record.stage==='ordinary_before_intake_start')throw Error('Custody unavailable');if(activeFault&&record.stage==='ordinary_claim_response_observed'){activeFault=false;throw Error('Claim response custody unavailable');}shared.custody=structuredClone(record);shared.checkpoints.push(structuredClone(record));},
  readNative:async query=>{assert.match(query,/BEGIN READ ONLY/);if(query.includes(' AS matches;'))return {transaction_read_only:'on',database_name:'postgres',database_user:'postgres',matches:shared.claimed?Array.from({length:options.matchCount??1},()=>({itemId:item,sessionId:session,owner:ORDINARY_PARTICIPANT,partnerSlug:ORDINARY_PARTNER,product:'rcap_partner',eventId:null,status:'CLAIMED',...options.reconciledChange})):[]};return row();}
 };
 return {args,page,shared,run:()=>runOrdinaryParticipant(args)};
}
function custody(extra={}){return {schema:'ordinary-participant-private-custody/v1',...binding,stage:'ordinary_matter_claimed',sessionId:session,itemId:item,intakeRequestId:requestId,firstEnqueueCapableActionAt:null,generationRequests:0,...extra};}
const supported=typeof RegExp.escape==='function';
test('source-supported runtime and actual live admission are required before Auth or intake',async t=>{if(!supported)return t.skip('Covered by explicit unsupported-runtime case');const f=harness({notLive:true});await assert.rejects(f.run(),/Actual current normal Start/);assert.equal(f.shared.counts.auth,0);assert.equal(f.shared.counts.start,0);});
test('unsupported accepted-driver runtime refuses before any Auth/intake operation',async t=>{if(supported)return t.skip('This process has native RegExp.escape');const f=harness();await assert.rejects(f.run(),/supported runtime/);assert.equal(f.shared.counts.auth,0);assert.equal(f.shared.counts.start,0);});
test('actual D3 original profile/optional omission/save-claim adapters drive public Start and canonical matter then one-job STOP',async t=>{if(!supported)return t.skip();const f=harness();const result=await f.run();assert.equal(result.stage,'ordinary_enqueued_worker_handoff_required');assert.equal(result.itemId,item);assert.equal(result.eventId,null);assert.equal(result.jobId,job);assert.equal(result.generationRequests,1);assert.equal(result.generationRequestsThisInvocation,1);assert(Number.isFinite(Date.parse(result.firstEnqueueCapableActionAt)));assert.equal(result.journeyComplete,false);assert.equal(f.shared.counts.auth,1);assert.equal(f.shared.counts.start,1);assert.equal(f.shared.counts.pending,1);assert.equal(f.shared.counts.claim,1);assert.equal(f.shared.counts.generation,1);assert.equal(f.shared.counts.image,1);assert(!f.shared.questions.includes('ms_program_order'));assert(f.shared.checkpoints.some(c=>c.omittedQuestionIds?.includes('ms_program_order')));assert(f.page.fallbacks>0);});
test('uncertain actual claim response reconciles its exact native-owned case and never screens or claims twice',async t=>{if(!supported)return t.skip();const first=harness({failClaimCheckpoint:true});await assert.rejects(first.run(),/Claim response custody unavailable/);assert(first.shared.claimed);assert.equal(first.shared.custody.itemId,null);const resumed=harness({},first.shared);const result=await resumed.run();assert.equal(result.itemId,item);assert.equal(first.shared.counts.start,1);assert.equal(first.shared.counts.pending,1);assert.equal(first.shared.counts.claim,1);assert.equal(first.shared.counts.generation,1);assert(first.shared.checkpoints.some(c=>c.stage==='ordinary_claim_reconciled_same_owned_case'));});
test('uncertain intake never starts another session or signs in again',async t=>{if(!supported)return t.skip();const first=harness({uncertainStart:true});await assert.rejects(first.run(),/UNCERTAIN_INTAKE/);assert.equal(first.shared.counts.start,1);const auth=first.shared.counts.auth;const resumed=harness({},first.shared);await assert.rejects(resumed.run(),/Uncertain intake/);assert.equal(first.shared.counts.start,1);assert.equal(first.shared.counts.auth,auth);});
test('already queued exact-owned case resumes only its STOP handoff without Verify/generation/image work',async t=>{if(!supported)return t.skip();const f=harness();f.shared.custody=custody({generationRequests:1,firstEnqueueCapableActionAt:new Date(Date.now()-1000).toISOString()});f.shared.claimed=true;f.shared.queued=true;f.shared.verified=true;const result=await f.run();assert.equal(result.resumed,true);assert.equal(result.generationRequestsThisInvocation,0);for(const key of ['start','pending','claim','generation','image'])assert.equal(f.shared.counts[key],0);assert.equal(f.shared.counts.window,1);});
for(const [name,options,expected] of [
 ['missing', {matchCount:0},/Uncertain or unclaimed/],
 ['ambiguous',{matchCount:2},/Uncertain or unclaimed/],
 ['other owner',{reconciledChange:{owner:'66666666-6666-4666-8666-666666666666'}},/strictly equal/],
 ['Clinic event',{reconciledChange:{eventId:job}},/strictly equal/],
 ['historical case',{reconciledChange:{itemId:'d13233f6-d9c7-41e1-9bb5-8a454d747503'}},/own new matter/]
])test('uncertain claim refuses '+name+' native reconciliation without a second intake or claim',async t=>{
 if(!supported)return t.skip();const f=harness(options);f.shared.custody=custody({itemId:null});f.shared.claimed=true;await assert.rejects(f.run(),expected);for(const key of ['start','pending','claim','generation','image'])assert.equal(f.shared.counts[key],0);
});
test('private checkpoint readback must match before forwarding Start',async t=>{if(!supported)return t.skip();const f=harness({staleCustodyRead:true});await assert.rejects(f.run(),/Private checkpoint must be durable/);assert.equal(f.shared.counts.start,0);});
test('verified case without a queued job holds rather than repeating Verify',async t=>{if(!supported)return t.skip();const f=harness();f.shared.custody=custody();f.shared.verified=true;await assert.rejects(f.run(),/Verified-but-not-queued/);assert.equal(f.shared.counts.generation,0);assert.equal(f.shared.counts.image,0);});
for(const scenario of ['prior-generation','wrong-custody','missing-enqueue-time','private-write-failure','wrong-auth-owner','required-program-order','strict-context-policy','lost-window','changed-binding','duplicate-generation'])test('bounded refusal '+scenario+' never creates/retries a second case or job',async t=>{
 if(!supported)return t.skip();const f=harness({failBeforeStart:scenario==='private-write-failure',wrongOwner:scenario==='wrong-auth-owner',requiredProgramOrder:scenario==='required-program-order',rejectPolicy:scenario==='strict-context-policy',lostWindow:scenario==='lost-window',changedBinding:scenario==='changed-binding',duplicateGeneration:scenario==='duplicate-generation'});
 if(scenario==='prior-generation')f.shared.custody=custody({generationRequests:1,firstEnqueueCapableActionAt:new Date().toISOString()});
 if(scenario==='wrong-custody')f.shared.custody=custody({origin:'https://other.vercel.app'});
 if(scenario==='missing-enqueue-time'){f.shared.custody=custody({generationRequests:1});f.shared.claimed=true;f.shared.queued=true;f.shared.verified=true;}
 const expected={'prior-generation':/Uncertain prior generation/,'wrong-custody':/Custody belongs/,'missing-enqueue-time':/Original enqueue boundary custody/,'private-write-failure':/Custody unavailable/,'wrong-auth-owner':/approved owner/,'required-program-order':/optional|false/i,'strict-context-policy':/Request aborted/,'lost-window':/Window lost/,'changed-binding':/Admission changed/,'duplicate-generation':/Request aborted/};
 await assert.rejects(f.run(),expected[scenario]);assert(f.shared.counts.start<=1);assert(f.shared.counts.claim<=1);assert(f.shared.counts.generation<=1);if(scenario!=='duplicate-generation')assert.equal(f.shared.counts.generation,0);
});
test('existing finite Stripe/download/generation guards and readonly reconciliation shape remain',()=>{
 const state={origin,targetItemId:item,generationAllowed:false,generationCount:0};assert.equal(ordinaryRequestAllowed({url:'https://checkout.stripe.com/c/pay/x',method:'GET'},state),false);assert.equal(ordinaryRequestAllowed({url:origin+'/api/rcap/packets/'+job+'/download',method:'GET'},state),false);assert.equal(ordinaryRequestAllowed({url:origin+'/api/expungement-ai/packet/generate',method:'POST',body:{briefcaseItemId:item}},state),false);assert.throws(()=>ordinaryClaimReconciliationSql("'unsafe'"));const sql=ordinaryClaimReconciliationSql(session);assert.match(sql,/BEGIN READ ONLY; SET LOCAL statement_timeout='15s'/);assert(!/INSERT|UPDATE|DELETE|CALL /.test(sql));assertOrdinaryAdmission(binding,origin);
 const source=fs.readFileSync(new URL('./rcap-hosted-ordinary-participant.mjs',import.meta.url),'utf8');assert(!source.includes('route.continue'));assert(source.includes('return route.fallback()'));assert(!source.includes("name:'Sign in to continue'"));assert(source.includes('runScreeningFromOriginalProfile'));assert(source.includes('saveScreeningAndClaim'));assert(!source.includes('runOnceAfterActualVerify'));
});
