import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DTC,hash} from './rcap-hosted-saved-dtc-contracts.mjs';
import {SESSION_SHA} from './rcap-dtc-existing-session-readonly.mjs';
import {EXISTING_MODE,EXISTING_HISTORY,NO_PAY_RESULT_SHA,NO_PAY_ACCEPTANCE_SHA,assertFrozenExistingNoPay,assertReadyExistingCheckout,assertExistingWindowBudget} from './rcap-dtc-existing-fulfillment.mjs';
import {createSavedDtcRuntime} from './rcap-hosted-saved-dtc-runtime.mjs';
import {runSavedDtcFulfillment} from './rcap-hosted-saved-dtc-fulfillment.mjs';
import {assertSavedDtcDispatch,mainSavedDtc} from './rcap-hosted-saved-dtc-entry.mjs';
import {savedAppRequestAllowed,createSavedAppPort} from './rcap-hosted-saved-dtc-ports.mjs';
assert(process.env.DTC_PRIVATE_CURRENT_FILE&&process.env.DTC_NO_PAY_EVIDENCE_FILE,'Existing external evidence fixtures required; no generated saved case');
const original=JSON.parse(fs.readFileSync(process.env.DTC_PRIVATE_CURRENT_FILE))[0];
const evidence=fs.readFileSync(process.env.DTC_NO_PAY_EVIDENCE_FILE),ready=assertFrozenExistingNoPay(evidence,NO_PAY_RESULT_SHA).inspection;
assert.equal(hash(original.checkout_session_id),SESSION_SHA);
const jobId='11111111-1111-4111-8111-111111111111',person='22222222-2222-4222-8222-222222222222',matter='33333333-3333-4333-8333-333333333333';
const stage={...DTC,mode:'configured_sandbox_preview',commercialMode:'staging_scoped',testPurchaseReleased:true,webhookEndpointId:'we_1U4AKGRWROAHlAKyNFChAnWr'};
function fixture(options={}){
 const calls=[],checkpoints=[],counts={auth:0,browser:0,simulatedSubmit:0,checkout:0,render:0,worker:0},events=[];let paid=false,job=null;
 const first=new Date().toISOString(),window={operator:'root',projectRef:DTC.project,custodyReceiptSha256:'a'.repeat(64),startedAt:new Date(Date.now()-1000).toISOString(),endsAt:new Date(Date.now()+40*60000).toISOString()};
 const custody={...EXISTING_HISTORY,readonlyRun:40448672119,readonlyResultSha256:'81d46af97d0eebe993aa12f8dba2fec8bc4e1ac23b9ab3b0290b7a964f24bf53',caseSha256:hash(DTC.item),enqueueAttempted:false,workerAttempted:false,checkoutSessionId:null,checkoutSessionSha256:SESSION_SHA,noPayResultSha256:NO_PAY_RESULT_SHA,noPayAcceptanceSha256:NO_PAY_ACCEPTANCE_SHA,firstEnqueueCapableActionAt:first,reconciliationReceiptSha256:'b'.repeat(64)};
 const state=()=>({...structuredClone(original),...(options.missingReference?{checkout_session_id:null}:{}),...(options.changedRevision?{revision:9}:{}),...(paid?{payment_status:'paid',payment_valid:true,payment_authority:'server_webhook',provider_event_id:'evt_fixture',payment_person_id:person,payment_matter_id:matter,payment_product_id:'expungement_packet'}:{}),job_count:job?1:options.existingJob?1:0});
 const session=()=>({id:original.checkout_session_id,livemode:false,currency:'usd',amount_total:5000,amount_subtotal:5000,total_details:{amount_discount:0},mode:'payment',metadata:{briefcase_item_id:DTC.item,user_id:DTC.owner,verification_hash:original.verification_hash,pathway_id:original.route.pathwayId,jurisdiction:'MS',product_id:'expungement_packet',person_id:person,matter_id:matter},success_url:DTC.origin+`/briefcase/${DTC.item}?payment=return&session_id={CHECKOUT_SESSION_ID}`,url:'https://checkout.stripe.com/c/pay/PRIVATE_URL',status:paid?'complete':options.expired?'expired':'open',payment_status:paid?'paid':'unpaid',payment_intent:paid||options.intentPresent?'pi_fixture':null});
 const pdf=Buffer.from('%PDF-1.7 PRIVATE_MOCK_PDF'),sha=hash(pdf),lines={has_more:false,data:[{price:{product:DTC.product,unit_amount:5000},quantity:1,amount_total:5000,amount_subtotal:5000}]};
 const response=(status,data,type='application/json')=>({status,headers:new Headers({'content-type':type}),json:async()=>data,arrayBuffer:async()=>type==='application/pdf'?pdf:Buffer.from(JSON.stringify(data))});
 const fetcher=async(url,opts)=>{const u=new URL(url);calls.push({url:String(url),method:opts.method});
  if(u.hostname==='api.supabase.com'){
   assert.equal(opts.method,'POST');const q=JSON.parse(opts.body).query;assert(q.startsWith('begin transaction read only;'));assert(!/\b(update|insert|delete)\b/i.test(q));
   if(q.includes('consumer_briefcase_items b'))return response(200,[state()]);
   if(q.includes('consumer_packet_artifact_provenance'))return response(200,[{render_job_id:jobId,briefcase_item_id:DTC.item,consumer_auth_user_id:DTC.owner,matter_id:matter,verification_hash:original.verification_hash,entitlement_source:'consumer_payment'}]);
   if(q.includes('packet_delivery_events'))return response(200,structuredClone(events));if(q.includes('from public.packet_render_jobs'))return response(200,job?[job]:options.existingJob?[{id:jobId,consumer_briefcase_item_id:DTC.item,consumer_auth_user_id:DTC.owner,partner_id:null}]:[]);throw Error('Unexpected SQL');
  }
  if(u.pathname==='/auth/v1/token'){counts.auth++;assert.equal(opts.headers['x-vercel-protection-bypass'],undefined);return response(200,{user:{id:JSON.parse(opts.body).email.startsWith('stranger')?DTC.stranger:DTC.owner},access_token:'PRIVATE_TOKEN'});}
  if(u.hostname==='api.stripe.com'){
   assert.equal(opts.method,'GET');if(u.pathname.includes('webhook_endpoints'))return response(200,{id:'we_1U4AKGRWROAHlAKyNFChAnWr',livemode:false,status:'enabled',url:DTC.origin+'/api/stripe/webhook?x-vercel-protection-bypass=PRIVATE_BYPASS',enabled_events:['checkout.session.completed']});
   if(u.pathname.endsWith('/line_items'))return response(200,lines);if(u.pathname.includes('/checkout/sessions/')){assert.equal(decodeURIComponent(u.pathname.split('/').at(-1)),original.checkout_session_id);return response(200,session());}
   if(u.pathname.includes('payment_intents'))return response(200,{id:'pi_fixture',livemode:false,status:'succeeded',amount_received:5000,currency:'usd'});return response(200,{id:'evt_fixture',livemode:false,type:'checkout.session.completed',data:{object:{id:original.checkout_session_id,payment_intent:'pi_fixture'}}});
  }
  if(u.pathname.includes('/storage/v1/object/public/'))return response(404,{});
  assert.equal(u.origin,DTC.origin);if(u.pathname.endsWith('/checkout')){counts.checkout++;throw Error('Forbidden new Checkout');}
  if(u.pathname.endsWith('/render')){counts.render++;job={id:jobId,consumer_briefcase_item_id:DTC.item,consumer_auth_user_id:DTC.owner,person_id:person,matter_id:matter,partner_id:null,consumer_verification_hash:original.verification_hash,status:'queued'};return response(202,{briefcaseItemId:DTC.item,jobId});}
  if(!opts.headers.Cookie)return response(401,{error:'auth_required'});const encoded=opts.headers.Cookie.split('; ').map(c=>c.slice(c.indexOf('=')+1)).join('');const identity=JSON.parse(Buffer.from(encoded.slice(7),'base64').toString());if(identity.user.id===DTC.stranger)return response(404,{error:'Not found'});
  for(const event_type of ['delivery_authorized','transmission_started','transmission_completed'])events.push({id:String(events.length+1),render_job_id:jobId,event_type,actor_user_id:DTC.owner});return response(200,null,'application/pdf');
 };
 const controls={verifyTarget:async()=>{},loadCustody:async()=>custody,assertContinuousWindow:async request=>{if(options.lostWindow&&request?.phase==='before_final_pay')throw Error('Window lost');return window;}};
 const worker={buildActualPaidTarget:async args=>{assert.equal(args.firstEnqueueCapableActionAt,first);return {fixture:true};},runAdmittedPaidOnce:async()=>{counts.worker++;job={...job,status:'artifact_validated',delivery_eligibility:'eligible',accounting_result:'zero_charge',output_sha256:sha,output_byte_count:pdf.length,page_count:1,output_storage_path:`packet-artifacts/consumer/${matter}/${jobId}/${sha}.pdf`};return {schemaVersion:'paid-dtc-worker-once-safe/v1',status:'TARGET_FINALIZED_POSTSTATE_VERIFIED',workerSourceSha:DTC.worker,image:'ghcr.io/roger-legalease/rcap-render-worker@'+DTC.digest,targetJobSha256:hash(jobId),windowReceiptSha256:window.custodyReceiptSha256,attempted:true,exitCode:0,finalizedJobMatchesTarget:true,targetReceiptSha256:'c'.repeat(64),stdoutSha256:'d'.repeat(64),stderrSha256:'e'.repeat(64),movedRows:1};},loadWorkerReceipt:async()=>{throw Error('No historical worker receipt');}};
 const completeHostedCheckout=async o=>{
  counts.browser++;assert.equal(o.screenshotDir,null);assert.equal(o.promotionCode,null);assert.equal(o.onReturn,null);assert.equal(o.executablePath,'/usr/bin/google-chrome');
  if(options.changedBeforePay)options.intentPresent=true;
  try{await o.beforeFinalPay(options.inspection??ready);await o.onSubmitCheckpoint({phase:'provider_checkout_submit_before_forward',submitAttempted:false});}
  catch{return {completed:false,failureReason:'final_payment_window_check_failed',submitAttempted:false,humanInteractionRequired:false};}
  counts.simulatedSubmit++;await o.onSubmitCheckpoint({phase:'provider_checkout_submit_after_attempt',submitAttempted:true});
  if(options.challenge)return {completed:false,humanInteractionRequired:true,failureReason:'provider_challenge',submitAttempted:true};
  if(options.unknownThrow)throw Error('PRIVATE_BROWSER_FAILURE');
  if(options.browserFailure)return {completed:false,humanInteractionRequired:false,failureReason:'browser_operation_failed',submitAttempted:true,diagnostic:options.diagnostic};
  paid=true;return {completed:true,humanInteractionRequired:false,submitAttempted:true,notes:['card number: filled','card expiry: filled','card cvc: filled']};
 };
 const make=()=>createSavedDtcRuntime({mode:EXISTING_MODE,noPayEvidence:{bytes:evidence,sha256:NO_PAY_RESULT_SHA},window,env:{SUPABASE_ACCESS_TOKEN:'PRIVATE_MANAGEMENT',SUPABASE_ANON_KEY:'fixture_anon',VERCEL_AUTOMATION_BYPASS_SECRET:'PRIVATE_BYPASS',STRIPE_SECRET_KEY:'sk_test_fixture'},fetcher,credentialsFor:async actor=>({email:actor+'@rcap-acceptance.test',password:'PRIVATE_PASSWORD'}),completeHostedCheckout,controls,workerFactory:()=>worker,checkpoint:async r=>{if(options.failedCheckpoint&&r.phase==='provider_checkout_submit_before_forward')throw Error('Checkpoint unavailable');checkpoints.push(r);},sleep:async()=>{}});
 return {custody,window,counts,calls,checkpoints,make,run:async()=>runSavedDtcFulfillment({mode:EXISTING_MODE,stage,window},make())};
}
test('same existing session preserves honest prior attempt and reaches one simulated fulfillment/worker/delivery',async()=>{
 const f=fixture();assert.equal(f.calls.length,0);const result=await f.run();assert.equal(result.phase,'protected_same_case_delivery_observed');assert.deepEqual(f.counts,{auth:3,browser:1,simulatedSubmit:1,checkout:0,render:1,worker:1});for(const [k,v]of Object.entries(EXISTING_HISTORY)){assert.deepEqual(f.custody[k],v);assert.deepEqual(result[k],v);}
 const markers=f.checkpoints.filter(c=>c.phase.startsWith('provider_checkout_submit_'));assert.deepEqual(markers.map(c=>c.submitAttempted),[false,true]);for(const m of markers){assert.equal(m.historicalSubmitAttempted,null);assert.equal(m.providerAttempted,true);assert.equal(m.noInterveningPurchaseActor,false);}
 assert(f.checkpoints.filter(c=>c.phase==='existing_session_current_state_reconciled').length>=3);for(const secret of [original.checkout_session_id,original.verification_hash,'PRIVATE_URL','PRIVATE_PASSWORD','PRIVATE_TOKEN','PRIVATE_MOCK_PDF'])assert(!JSON.stringify([result,f.checkpoints]).includes(secret));
});
for(const scenario of ['missingReference','changedRevision','existingJob','expired','intentPresent','changedBeforePay','lostWindow','failedCheckpoint','challenge','unknownThrow'])test('current-state/operation refusal '+scenario+' cannot create another Checkout or retry',async()=>{
 const f=fixture({[scenario]:true});const result=await f.run();assert.equal(result.phase,'HOLD_RECONCILE_NO_RETRY');assert.equal(f.counts.checkout,0);assert.equal(f.counts.render,0);assert.equal(f.counts.worker,0);assert(f.counts.browser<=1);assert(f.counts.simulatedSubmit<=1);assert.equal(f.custody.historicalSubmitAttempted,null);assert.equal(f.custody.providerAttempted,true);
 if(['missingReference','changedRevision','existingJob','expired','intentPresent'].includes(scenario))assert.equal(f.counts.browser,0);
 if(scenario==='unknownThrow')assert.equal(result.browser.submitAttempted,null);if(scenario==='challenge')assert.equal(result.browser.humanInteractionRequired,true);
});
for(const [name,mutate]of [['incomplete',i=>i.inspectionComplete=false],['disabled',i=>i.submitDisabled=true],['free',i=>i.pageTotalClassifiedFree=true],['missing',i=>i.controls.find(c=>c.required).missing=true],['invalid',i=>i.controls.find(c=>c.required).invalid=true],['unknown checkbox',i=>i.controls.push({name:'unrecognized_control',type:'checkbox',required:true,missing:false,invalid:false,checked:false,unknownRequiredCheckbox:true})],['unknown required field',i=>i.controls.find(c=>c.required).name='unrecognized_control']])test('fresh inspection refuses '+name+' before simulated submit',async()=>{const inspection=structuredClone(ready);mutate(inspection);const f=fixture({inspection});const r=await f.run();assert.equal(r.phase,'HOLD_RECONCILE_NO_RETRY');assert.equal(f.counts.simulatedSubmit,0);assert.equal(f.counts.checkout,0);assert.equal(f.counts.worker,0);});
test('historical attempt flags cannot be reset to pass continuation',async()=>{for(const key of ['checkoutAttempted','providerAttempted','noInterveningPurchaseActor']){const f=fixture();f.custody[key]=!f.custody[key];assert.equal((await f.run()).phase,'HOLD_RECONCILE_NO_RETRY');assert.equal(f.counts.browser,0);}});
test('fixed actual bytes/sidecar qualify evidence only; altered bytes and absent source data hold before credentials',async()=>{
 assert.equal(hash(evidence),NO_PAY_RESULT_SHA);assert.throws(()=>assertFrozenExistingNoPay(Buffer.concat([evidence,Buffer.from(' ')]),NO_PAY_RESULT_SHA));assert.throws(()=>assertFrozenExistingNoPay(evidence,'0'.repeat(64)));
 const source=fs.readFileSync(new URL('./rcap-hosted-saved-dtc-entry.mjs',import.meta.url),'utf8');assert(source.indexOf('await loadExistingNoPayEvidence()')<source.indexOf('const target=await loadSavedDtcTarget'));assert(source.indexOf('await loadExistingNoPayEvidence()')<source.indexOf('api-keys'));assert(source.indexOf('await loadExistingNoPayEvidence()')<source.indexOf('const credentialsFor='));
});
test('strict >25-minute continuation threshold and 305s preclaim control remain separate',()=>{const now=Date.now();assert.throws(()=>assertExistingWindowBudget({endsAt:new Date(now+1500000).toISOString()},now));assertExistingWindowBudget({endsAt:new Date(now+1500001).toISOString()},now);const worker=fs.readFileSync(new URL('./paid-dtc-worker-once-preparation/paid-dtc-continuous-window.mjs',import.meta.url),'utf8');assert(worker.includes('end-now>305000'));});
test('new-mode dispatch and both app guards forbid Checkout independently of DB reference',async()=>{
 const input={mode:EXISTING_MODE,application_sha:DTC.app,tools_sha:DTC.tools,worker_source_sha:DTC.worker,worker_digest:DTC.digest,supabase_project_ref:DTC.project,preview_deployment_id:DTC.deploymentId,preview_hostname:new URL(DTC.origin).hostname,preview_creation_run_id:'40441747499',resume_matter_id:DTC.item};assertSavedDtcDispatch(input);assertSavedDtcDispatch({...input,mode:'dtc_saved_fulfillment'});assert.throws(()=>assertSavedDtcDispatch({...input,mode:'other'}));
 assert.equal(savedAppRequestAllowed('/api/expungement-ai/checkout','owner',{briefcaseItemId:DTC.item},null,EXISTING_MODE),false);assert.equal(savedAppRequestAllowed('/api/expungement-ai/checkout','owner',{briefcaseItemId:DTC.item},null),true);
 let forwarded=0;const port=createSavedAppPort({mode:EXISTING_MODE,boundJobId:()=>null,normalRequest:async()=>{forwarded++;}});await assert.rejects(port('/api/expungement-ai/checkout','owner',{briefcaseItemId:DTC.item}));assert.equal(forwarded,0);
 const f=fixture();await assert.rejects(f.make().app('/api/expungement-ai/checkout','owner',{briefcaseItemId:DTC.item}));assert.equal(f.calls.length,0);
});

test('missing actual frozen source evidence refuses executable new entry before any remote/key/Auth read',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'b-existing-source-guard-')),cwd=process.cwd(),oldFetch=globalThis.fetch,oldExit=process.exitCode;let remoteCalls=0;
 try{
  fs.copyFileSync(new URL('../vercel.json',import.meta.url),path.join(tmp,'vercel.json'));process.chdir(tmp);globalThis.fetch=async()=>{remoteCalls++;throw Error('No live I/O');};
  const input={mode:EXISTING_MODE,application_sha:DTC.app,tools_sha:DTC.tools,worker_source_sha:DTC.worker,worker_digest:DTC.digest,supabase_project_ref:DTC.project,preview_deployment_id:DTC.deploymentId,preview_hostname:new URL(DTC.origin).hostname,preview_creation_run_id:'40441747499',resume_matter_id:DTC.item};
  const result=await mainSavedDtc({DISPATCH_INPUTS:JSON.stringify(input),GITHUB_ACTIONS:'true',GITHUB_SHA:'a'.repeat(40),GITHUB_WORKFLOW_SHA:'a'.repeat(40),GITHUB_REF_NAME:'codex/f-vercel-raw-readonly-20261026'});
  assert.equal(result.phase,'HOLD_RECONCILE_NO_RETRY');assert.equal(remoteCalls,0);assert.equal(fs.statSync('dtc-saved-existing-fulfillment-evidence/result.json').mode&0o777,0o600);
 }finally{globalThis.fetch=oldFetch;process.exitCode=oldExit;process.chdir(cwd);fs.rmSync(tmp,{recursive:true,force:true});}
});

test('DTC browser diagnostic reaches safe checkpoint and HOLD result without another purchase/job',async()=>{
 const f=fixture({browserFailure:true,diagnostic:{phase:'submit_click',errorClass:'TimeoutError',message:'PRIVATE_URL https://private.invalid',stack:'PRIVATE_STACK'}});const result=await f.run();assert.equal(result.phase,'HOLD_RECONCILE_NO_RETRY');assert.deepEqual(result.browser.diagnostic,{phase:'submit_click',errorClass:'TimeoutError'});assert.deepEqual(f.checkpoints.at(-1).diagnostic,result.browser.diagnostic);assert.equal(result.browser.submitAttempted,true);assert.equal(result.historicalSubmitAttempted,null);assert.equal(f.counts.checkout,0);assert.equal(f.counts.render,0);assert.equal(f.counts.worker,0);assert.equal(f.counts.simulatedSubmit,1);assert(!JSON.stringify([result,f.checkpoints]).includes('PRIVATE_'));
});
test('DTC browser diagnostic rejects arbitrary phases/classes/private fields at the adapter boundary',async()=>{
 const f=fixture({browserFailure:true,diagnostic:{phase:'PRIVATE_PHASE',errorClass:'PRIVATE_ERROR',error:'PRIVATE_TOKEN',url:'https://private.invalid'}});const result=await f.run();assert.deepEqual(result.browser.diagnostic,{phase:'unclassified_phase',errorClass:'UnknownError'});assert.equal(result.browser.submitAttempted,true);assert(!JSON.stringify([result,f.checkpoints]).includes('PRIVATE_'));assert.equal(f.counts.worker,0);
});
test('DTC browser diagnostic records escaped adapter exceptions while retaining unknown submission status',async()=>{
 const f=fixture({unknownThrow:true});const result=await f.run();assert.equal(result.phase,'HOLD_RECONCILE_NO_RETRY');assert.deepEqual(result.browser.diagnostic,{phase:'adapter_call',errorClass:'Error'});assert.equal(result.browser.submitAttempted,null);assert.equal(result.historicalSubmitAttempted,null);assert.equal(f.counts.checkout,0);assert.equal(f.counts.render,0);assert.equal(f.counts.worker,0);assert(!JSON.stringify([result,f.checkpoints]).includes('PRIVATE_BROWSER_FAILURE'));
});
