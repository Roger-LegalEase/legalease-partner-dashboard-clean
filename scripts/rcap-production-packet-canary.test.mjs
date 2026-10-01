import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import {CANARY,assertCanaryRelease,assertWorkerHealth,assertMatter,assertSettlement,
 assertJob,observeJob,assertDeliveryEvents,inspectPdf,assertDownload,assertAnonymous,
 assertZeroCheckout,createOneOrderGuard,resumeDisposition,consumerMatterId,
 MUTATION_CLASSES,assertMutationClasses,proveCanaryDelivery} from './rcap-production-packet-canary-contract.mjs';
import {requireProductionPhaseAuthorization} from './grade-a-launch-control/production-preflight-authorization.mjs';
const candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
const probe=fs.readFileSync('scripts/rcap-production-save-transition-probe.mjs','utf8');
const id='11111111-1111-4111-8111-111111111111',user='22222222-2222-4222-8222-222222222222',jobId='33333333-3333-4333-8333-333333333333';
const bytes=Buffer.from('%PDF-'+ 'x'.repeat(1500));
const text='Acceptance Participant Hinds County Circuit Court 25-CR-000123 Mississippi expungement. ';
const pages=[text.repeat(4),text.repeat(4),text.repeat(4)];
const sha=createHash('sha256').update(bytes).digest('hex');
const identity={matterId:id,userId:user};
const matter=()=>({id,user_id:user,email:CANARY.email,payment_status:'paid',amount_cents:0,regular_price_cents:5000,discount_cents:5000,currency:'usd',provider_event_id:'evt_fixture',checkout_session_id:'cs_live_fixture'});
const job=()=>({id:jobId,packet_id:'packet-fixture',route_id:'MS-fixture',renderer_kind:'composed',renderer_version:'v1',consumer_briefcase_item_id:id,consumer_auth_user_id:user,matter_id:consumerMatterId(id),input_hash:'a'.repeat(64),attempt_count:1,container_digest:CANARY.workerDigest,status:'artifact_validated',delivery_eligibility:'eligible',accounting_result:'zero_charge',output_storage_path:'private/fixture.pdf',output_sha256:sha,normalized_output_sha256:'b'.repeat(64),failure_disposition:null,error_code:null,last_error_detail:null});
const machine=()=>({id:'fixture',state:'started',image_ref:{digest:CANARY.workerDigest,labels:{'org.opencontainers.image.revision':CANARY.workerSourceSha}},config:{env:{RCAP_WORKER_CONTAINER_DIGEST:CANARY.workerDigest,ENABLE_SUPABASE_PARTNER_DATA:'true'},restart:{policy:'always'},services:[]}});
const queue=()=>({stale_queued:0,queued:0,claimed:0,terminal_failed:0});
const env=()=>({RCAP_APPLICATION_SHA:CANARY.applicationSha,RCAP_WORKER_SOURCE_SHA:CANARY.workerSourceSha,RCAP_WORKER_DIGEST:CANARY.workerDigest,RCAP_PRODUCTION_PROJECT_REF:CANARY.productionProjectRef,RCAP_PRODUCTION_DEPLOYMENT_ID:CANARY.activatedDeploymentId,RCAP_PUBLIC_ORIGIN:CANARY.origin,RCAP_PRODUCTION_PHASE:'packet_canary',RCAP_PROBE_BROWSERS:'chromium',RCAP_LIVE_PROMOTION_CODE:'fixture-only-secret'});
const checkout=()=>({url:'https://checkout.stripe.com/c/pay/fixture',promotionEntered:true,promotionAccepted:true,totalText:'$0.00',paymentFields:[]});
const download=()=>({status:200,contentType:'application/pdf',bytes,pages:[...pages]});
const event=()=>({id:'44444444-4444-4444-8444-444444444444',render_job_id:jobId,actor_user_id:user,event_type:'transmission_completed'});
// Any accidental global network access fails, even if a developer environment has tokens.
globalThis.fetch=()=>{throw Error('LOCAL_TEST_NETWORK_FORBIDDEN');};

test('positive contracts accept the exact current release and synthetic proof',()=>{
 assertCanaryRelease(candidate,env());assertWorkerHealth([machine()],queue());assertMatter(matter(),identity);
 assertSettlement(matter());assertJob([job()],identity);assertDownload(download(),job());assertAnonymous(401);
 assertZeroCheckout(checkout());assertDeliveryEvents([event()],job(),user);assertMutationClasses([...MUTATION_CLASSES]);
});
for(const key of ['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','productionProjectRef'])test(`release mutation: ${key}`,()=>{const c=structuredClone(candidate);c[key]='stale';assert.throws(()=>assertCanaryRelease(c,env()));});
for(const key of Object.keys(env()))test(`input mutation: ${key}`,()=>{const e=env();e[key]='';assert.throws(()=>assertCanaryRelease(candidate,e));});
for(const key of ['activation','publicVerification'])test(`closure mutation: ${key}`,()=>{const c=structuredClone(candidate);c.productionAuthorization[key].state='authorized_not_executed';assert.throws(()=>assertCanaryRelease(c,env()));});
for(const [name,mutate]of [
 ['stale source',m=>m.image_ref.labels['org.opencontainers.image.revision']='fe2457a71dd90d0fb83d0ed2738fcd1e6566d76e'],
 ['stale image',m=>m.image_ref.digest='sha256:'+'0'.repeat(64)],['digest environment',m=>m.config.env.RCAP_WORKER_CONTAINER_DIGEST='wrong'],
 ['disabled data',m=>m.config.env.ENABLE_SUPABASE_PARTNER_DATA='false'],['stopped',m=>m.state='stopped'],
 ['restart',m=>m.config.restart.policy='no'],['inbound service',m=>m.config.services=[{}]],['unreadable service',m=>m.config.services={}]
])test(`worker mutation: ${name}`,()=>{const m=machine();mutate(m);assert.throws(()=>assertWorkerHealth([m],queue()));});
for(const n of [0,2])test(`worker inventory ${n} refuses`,()=>assert.throws(()=>assertWorkerHealth(Array.from({length:n},machine),queue())));
for(const key of ['stale_queued','terminal_failed'])test(`queue mutation: ${key}`,()=>{const q=queue();q[key]=1;assert.throws(()=>assertWorkerHealth([machine()],q));});
for(const [name,mutate]of [
 ['paid amount',r=>r.amount_cents=1],['null amount',r=>r.amount_cents=null],['regular price',r=>r.regular_price_cents=4999],['discount',r=>r.discount_cents=4999],['provider event',r=>r.provider_event_id=null],['currency',r=>r.currency='eur'],['unpaid',r=>r.payment_status='pending'],['sandbox session',r=>r.checkout_session_id='cs_test_fixture']
])test(`settlement mutation: ${name}`,()=>{const r=matter();mutate(r);assert.throws(()=>assertSettlement(r));});
for(const [name,mutate]of [
 ['nonzero total',c=>c.totalText='$50.00'],['discount line not total',c=>c.totalText='Discount $0.00 Total $50.00'],['promotion absent',c=>c.promotionEntered=false],['promotion refused',c=>c.promotionAccepted=false],['card control',c=>c.paymentFields=['card-number']],['payment method',c=>c.paymentFields=['bank-account']],['wrong origin',c=>c.url='https://checkout.stripe.com.evil.test/']
])test(`checkout mutation: ${name}`,()=>{const c=checkout();mutate(c);assert.throws(()=>assertZeroCheckout(c));});
test('first path permits one matter, one Checkout and one zero-dollar submit only',()=>{const g=createOneOrderGuard();g.claim();g.checkout();g.submit(checkout());assert.deepEqual(g.snapshot(),{matters:1,checkout:1,submissions:1,resume:false});assert.throws(()=>g.claim());assert.throws(()=>g.checkout());assert.throws(()=>g.submit(checkout()));});
test('resume forbids every creation/submission',()=>{const g=createOneOrderGuard({resume:true});assert.throws(()=>g.claim());assert.throws(()=>g.checkout());assert.throws(()=>g.submit(checkout()));});
test('nonzero refusal precedes any submission',()=>{const g=createOneOrderGuard();g.checkout();assert.throws(()=>g.submit({...checkout(),totalText:'$50.00'}));assert.equal(g.snapshot().submissions,0);});
for(const [name,mutate]of [
 ...['succeeded','failed','expired','retryable','queued','delivered'].map(state=>[`state ${state}`,j=>j.status=state]),
 ['missing storage',j=>j.output_storage_path=''],['wrong container',j=>j.container_digest='wrong'],['missing SHA',j=>j.output_sha256=''],['missing normalized SHA',j=>j.normalized_output_sha256=''],['retry',j=>j.attempt_count=2],['retryable failure',j=>j.failure_disposition='retryable'],['error code',j=>j.error_code='failed'],['error detail',j=>j.last_error_detail='bad'],['ineligible',j=>j.delivery_eligibility='blocked'],['wrong accounting',j=>j.accounting_result='consumed'],['wrong owner',j=>j.consumer_auth_user_id=id],['wrong item',j=>j.consumer_briefcase_item_id=user],['wrong derived matter',j=>j.matter_id=id],['wrong input hash',j=>j.input_hash='']
])test(`job mutation: ${name}`,()=>{const j=job();mutate(j);assert.throws(()=>assertJob([j],identity));});
for(const n of [0,2])test(`job cardinality ${n} refuses`,()=>assert.throws(()=>assertJob(Array.from({length:n},job),identity)));
test('a different id on later polling refuses',()=>assert.throws(()=>observeJob([job()],{...identity,jobId:id})));
for(const state of ['succeeded','failed','expired','retryable'])test(`poll refuses stale or failed ${state}`,()=>assert.throws(()=>observeJob([{...job(),status:state}],identity)));
for(const [name,mutate]of [
 ['owner non-200',d=>d.status=404],['non-PDF type',d=>d.contentType='text/html'],['bad header',d=>d.bytes=Buffer.from('html'+ 'x'.repeat(1501))],['short PDF',d=>d.bytes=Buffer.from('%PDF-')],['hash mismatch',d=>d.bytes=Buffer.concat([d.bytes,Buffer.from('x')])],['zero pages',d=>d.pages=[]],['insufficient text',d=>d.pages=['short','short']],['one text page',d=>d.pages=[text.repeat(10)]],['blank middle',d=>d.pages=[pages[0],'',pages[1]]],
 ...['Acceptance Participant','Hinds County Circuit Court','25-CR-000123','Mississippi','expungement'].map(t=>[`missing ${t}`,d=>d.pages=d.pages.map(p=>p.replaceAll(t,''))])
])test(`PDF mutation: ${name}`,()=>{const d=download();mutate(d);assert.throws(()=>assertDownload(d,job()));});
for(const s of [200,302,404,500])test(`anonymous ${s} refuses`,()=>assert.throws(()=>assertAnonymous(s)));
for(const [name,mutate]of [['wrong matter',r=>r.id=user],['wrong owner',r=>r.user_id=id],['real email',r=>r.email='customer@example.com'],['different reserved email',r=>r.email='other@rcap-acceptance.test'],['unpaid',r=>r.payment_status='pending']])test(`resume mutation: ${name}`,()=>{const r=matter();mutate(r);assert.throws(()=>resumeDisposition(r,identity,[job()]));});
test('resume id must be exact owner-approved prior canary',()=>{const e={...env(),RCAP_RESUME_MATTER_ID:id};assert.throws(()=>assertCanaryRelease(candidate,e));const c=structuredClone(candidate);c.productionAuthorization.packetCanary={resumeMatterId:user,resumeAuthUserId:user};assert.throws(()=>assertCanaryRelease(c,e));c.productionAuthorization.packetCanary.resumeMatterId=id;assert.equal(assertCanaryRelease(c,e).resumeMatterId,id);});
test('already delivered returns existing proof, no second order',()=>assert.equal(resumeDisposition(matter(),identity,[{...job(),status:'delivered'}]),'already_delivered'));
for(const name of ['deployment','environment','alias','migration','worker_restart','charge'])test(`mutation scope refuses ${name}`,()=>assert.throws(()=>assertMutationClasses([...MUTATION_CLASSES,name])));
for(const phase of ['packet_canary','production_packet_canary','packet_generation','worker_launch','save_transition_reproduce','save_transition_verify','live_zero_dollar_order','payment','checkout'])test(`real gate refuses ${phase}, including generic phase append`,()=>{assert.throws(()=>requireProductionPhaseAuthorization(candidate,phase),{message:'production_phase_not_authorized_for_current_release'});const c=structuredClone(candidate);c.productionAuthorization.phases.push(phase);assert.throws(()=>requireProductionPhaseAuthorization(c,phase),{message:'production_phase_not_authorized_for_current_release'});});
test('no canary authority or receipt; both older decisions consumed',()=>{assert.equal(candidate.productionAuthorization.packetCanary,undefined);assert.equal(candidate.packetCanaryReceipt,undefined);assert.throws(()=>requireProductionPhaseAuthorization(candidate,'public_verify'),/production_public_verify_authorization_consumed/);assert.throws(()=>requireProductionPhaseAuthorization(candidate,'activate'),/production_activate_authorization_consumed/);});
function deliveryPorts({mutateJob=()=>{},mutateDownload=()=>{},anonymous=401,deliveredInitially=false}={}) {
 let downloaded=0;const calls=[];
 return {calls,ports:{
  matter:async()=>{calls.push('matter');return matter();},
  jobs:async()=>{calls.push('jobs');const j=job();if(downloaded||deliveredInitially)j.status='delivered';mutateJob(j);return [j];},
  events:async()=>{calls.push('events');return [event()];},
  ownerDownload:async()=>{calls.push('owner');downloaded++;const d=download();mutateDownload(d);return d;},
  anonymousDownload:async()=>{calls.push('anonymous');return anonymous;},wait:async()=>calls.push('wait'),capture:()=>{}
 }};
}
test('actual delivery control proves pre/post state, same job/hash and fresh anonymous refusal',async()=>{const {ports,calls}=deliveryPorts();const r=await proveCanaryDelivery(ports,identity,{maxPolls:2});assert.equal(r.jobBeforeDownload.status,'artifact_validated');assert.equal(r.job.status,'delivered');assert.equal(r.artifact.sha256,r.job.output_sha256);assert.deepEqual(calls,['matter','jobs','owner','anonymous','jobs','events']);});
for(const [name,options]of [['owner denied',{mutateDownload:d=>d.status=403}],['hash substitution',{mutateDownload:d=>d.bytes=Buffer.concat([d.bytes,Buffer.from('changed')])}],['anonymous accessible',{anonymous:200}],['stale terminal state',{mutateJob:j=>j.status='succeeded'}],['retryable',{mutateJob:j=>j.failure_disposition='retryable'}]])test(`real control-flow fault: ${name}`,async()=>{const {ports}=deliveryPorts(options);await assert.rejects(proveCanaryDelivery(ports,identity,{maxPolls:2}));});
test('delivered resume returns before browser download and all mutation ports',async()=>{const {ports,calls}=deliveryPorts({deliveredInitially:true});const r=await proveCanaryDelivery(ports,identity,{resume:true,maxPolls:2});assert.equal(r.alreadyDelivered,true);assert.deepEqual(calls,['matter','jobs','events']);});
test('real PDF parser preserves page boundaries and detects blank middle corruption',async()=>{
 const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);
 for(let i=0;i<3;i++){const p=pdf.addPage();if(i!==1)for(let y=50;y<750;y+=25)p.drawText(text,{x:15,y,size:8,font});}
 const b=Buffer.from(await pdf.save());const extracted=inspectPdf(b);assert.equal(extracted.length,3);assert.equal(extracted[1],'');assert.throws(()=>assertDownload({status:200,contentType:'application/pdf',bytes:b,pages:extracted},{output_sha256:createHash('sha256').update(b).digest('hex')}),/blank_middle_page/);
});
test('current repository worker/database/route contract proves both state transitions and grant requirement',()=>{
 const read=p=>fs.readFileSync(p,'utf8');
 assert.match(read('docs/RCAP_RENDER_WORKER_CONTRACT.md'),/validating -> artifact_validated -> delivered/);
 assert.match(read('src/lib/rcap/render/job-queue.ts'),/rpc\("finalize_packet_render_job"/);
 assert.match(read('supabase/phase-50-rcap-packet-delivery-hardening.sql'),/set status = 'artifact_validated'/);
 assert.match(read('supabase/phase-50-rcap-packet-delivery-hardening.sql'),/p_event_type = 'transmission_completed' and v_job.status = 'artifact_validated'[\s\S]*?set status = 'delivered'/);
 assert.match(read('src/lib/rcap/render/packet-delivery.ts'),/await record\("transmission_completed"\)/);
 assert.match(read('src/app/api/expungement-ai/packet/artifacts/[itemId]/route.ts'),/streamAuthorizedPacket/);
 assert.match(read('src/lib/expungement-ai/private-delivery.ts'),/if \(!grantShape.test\(input.token\)\) return null/);
});
test('canary reuses one existing signed-out journey, builder and order helper, and skips second-matter loop',async()=>{
 const source=probe.slice(probe.indexOf('async function verifyPhase()'),probe.indexOf('// --- screening helpers'));
 let claimed=0,built=0,orders=0;
 const locator={goto:async()=>{},reload:async()=>{throw Error('second journey forbidden');}};
 const context={newPage:async()=>locator};
 const evidence={browsers:{},mutations:{mattersClaimed:[]},account:{userId:user},canary:{}};
 const sandbox={IS_PACKET_CANARY:true,evidence,console:{log(){}},ensureProbeAccount:async()=>({email:CANARY.email}),newSection:()=>({status:'pending',pending:{status:200},claim:{status:401},handoff:{modeCreate:true}}),launchBrowser:async()=>({version:()=>'',newContext:async()=>context,close:async()=>{}}),attachObservers:()=>{},runSignedOutJourney:async()=>{claimed++;return {pendingOk:true,claimStatus:401,handoffUrl:'fixture'};},summarize:()=>'',record:(_n,ok)=>assert.ok(ok),signInAndClaim:async()=>({authStatus:200,claimStatus:200,claimMatterId:id}),validUuid:v=>v===id,persist:()=>{},readCanaryMatter:async()=>matter(),assertMatter,canaryQuery:async()=>[],expectMatterRendered:async()=>{},completePacketInformationAndVerify:async()=>{built++;return {verifyStatus:200,nextActionPresent:true};},placeLiveZeroDollarOrder:async()=>{orders++;return {};},redact:String};
 vm.createContext(sandbox);await vm.runInContext(source+'\nverifyPhase()',sandbox);
 assert.equal(claimed,1);assert.equal(built,1);assert.equal(orders,1);assert.deepEqual(evidence.mutations.mattersClaimed,[id]);
});
test('canary delivery branches before the obsolete historical polling path',()=>{const s=probe.slice(probe.indexOf('async function placeLiveZeroDollarOrder'),probe.indexOf('// --- verify phase'));assert.ok(s.indexOf('await completeCanaryDelivery')<s.indexOf('jobState === "succeeded"'));assert.match(s,/await completeCanaryDelivery\(page, matterId, order\);\s+return order;/);});

test('entrypoint reaches the real refusal before credentials, browser, account or directory writes',async()=>{
 const {spawnSync}=await import('node:child_process');
 const r=spawnSync(process.execPath,['scripts/rcap-production-save-transition-probe.mjs'],{encoding:'utf8',env:{PATH:process.env.PATH,RCAP_PRODUCTION_PHASE:'packet_canary'}});
 assert.notEqual(r.status,0);assert.match(r.stderr,/production_phase_not_authorized_for_current_release/);
 assert.doesNotMatch(r.stdout,/SUMMARY|probe: phase/);
});
test('transport guard refuses infrastructure and out-of-scope auth/database operations',async()=>{
 const {assertServiceRequest}=await import('./rcap-production-packet-canary-contract.mjs');
 for(const service of ['deployment','environment','alias','stripe'])assert.throws(()=>assertServiceRequest(service,{method:'POST',pathname:'/anything'}));
 assert.throws(()=>assertServiceRequest('fly',{method:'POST',pathname:'/v1/apps/legalease-rcap-render-worker/machines'}));
 assert.throws(()=>assertServiceRequest('management',{method:'POST',pathname:`/v1/projects/${CANARY.productionProjectRef}/database/query`,body:{query:'delete from public.consumer_briefcase_items',read_only:false}}));
 assert.throws(()=>assertServiceRequest('auth',{method:'POST',pathname:'/auth/v1/admin/users',body:{email:'real@example.com'}}));
 assert.throws(()=>assertServiceRequest('auth',{method:'PUT',pathname:`/auth/v1/admin/users/${id}`,existingUserId:user,body:{password:'fixture'}}));
 assertServiceRequest('fly',{method:'GET',pathname:'/v1/apps/legalease-rcap-render-worker/machines'});
 assertServiceRequest('management',{method:'POST',pathname:`/v1/projects/${CANARY.productionProjectRef}/database/query`,body:{query:'select 1',read_only:true}});
});
test('promotion code is redacted in raw, encoded and provider-uppercase form',()=>{
 const start=probe.indexOf('function redact(value)');const end=probe.indexOf('\nfunction record(',start);
 const code='fixture-coupon';const sandbox={secrets:new Set([code]),LIVE_PROMOTION_CODE:code,escapeRegExp:s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')};
 vm.createContext(sandbox);vm.runInContext(probe.slice(start,end),sandbox);
 assert.equal(sandbox.redact(code+' '+code.toUpperCase()),'[redacted] [redacted]');
 assert.ok(!sandbox.redact('https://example.test/?grant=fixture-token').includes('fixture-token'));
 assert.match(probe,/if \(IS_PACKET_CANARY\) return;[\s\S]*?page.screenshot/);
});

test('Fly mirror proof compares both immutable config ids and never launches/modifies a worker',async()=>{
 const {readWorkerImageProof}=await import('./rcap-production-packet-canary-contract.mjs');
 const m=machine();m.image_ref.digest='sha256:'+'c'.repeat(64);m.config.image='registry.fly.io/legalease-rcap-render-worker:accepted';
 const calls=[],config='sha256:'+'d'.repeat(64);
 const command=(program,args)=>{calls.push([program,args]);return args[0]==='image'?config:'read-complete';};
 const env={GITHUB_TOKEN:'fixture-secret',GITHUB_ACTOR:'fixture',FLY_API_TOKEN:'fixture-secret'};
 const proof=readWorkerImageProof(m,{command,env});assertWorkerHealth([m],queue(),proof);
 assert.equal(calls.filter(([,a])=>a[0]==='pull').length,2);
 assert.ok(calls.every(([,a])=>!a.some(x=>['run','push','deploy','update','restart','start'].includes(x))));
 assert.ok(!JSON.stringify(proof).includes('fixture-secret'));
 assert.throws(()=>readWorkerImageProof(m,{env,command:(_p,a)=>a[0]==='image'?(a.at(-1).startsWith('ghcr.io')?config:'sha256:'+'e'.repeat(64)):'ok'}),/image_equivalence_unproven/);
 assert.throws(()=>assertWorkerHealth([m],queue(),{...proof,observedConfigId:'wrong'}));
 assert.throws(()=>assertWorkerHealth([m],queue(),{...proof,observedDigest:'wrong'}));
 assert.throws(()=>readWorkerImageProof({...m,config:{...m.config,image:'evil.invalid/image:tag'}},{env,command}),/worker_image_registry/);
});
