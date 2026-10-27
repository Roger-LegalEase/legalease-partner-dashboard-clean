import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {DTC,hash} from './rcap-hosted-saved-dtc-contracts.mjs';
import {CREDENTIAL_SOURCE,readSavedDtcCredentials} from './rcap-hosted-saved-dtc-credentials.mjs';
const originalFetch=globalThis.fetch;let importCalls=0;globalThis.fetch=async()=>{importCalls++;throw Error('No import-time network');};
const {inspectExistingDtcSession,safeSubmitInspection,main}=await import('./rcap-dtc-existing-session-no-pay-inspection.mjs');globalThis.fetch=originalFetch;
assert.equal(importCalls,0);
assert(process.env.DTC_EXISTING_SESSION_STATE_FILE,'private existing-session fixture only');
const originalState=JSON.parse(fs.readFileSync(process.env.DTC_EXISTING_SESSION_STATE_FILE,'utf8'))[0];
const blob=execFileSync('git',['show',CREDENTIAL_SOURCE.commit+':'+CREDENTIAL_SOURCE.path],{cwd:new URL('..',import.meta.url),stdio:['ignore','pipe','ignore']});
const credentialsFor=readSavedDtcCredentials(blob),owner=await credentialsFor('owner');
const inspection={pageTotalClassifiedFree:true,submitDisabled:true,inspectionComplete:true,controls:[{name:'cardNumber',type:'input',required:true,missing:true,invalid:true,checked:null,unknownRequiredCheckbox:false,value:'PRIVATE_CARD_VALUE'},{name:'PRIVATE_FIELD_NAME',type:'checkbox',required:true,missing:true,invalid:true,checked:false,unknownRequiredCheckbox:true}]};
function fixture(scenario='diagnostic'){
 const input={mode:'dtc_existing_session_no_pay_inspection',resume_matter_id:DTC.item,application_sha:DTC.app,tools_sha:DTC.tools,worker_source_sha:DTC.worker,worker_digest:DTC.digest,supabase_project_ref:DTC.project};
 const env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Roger-LegalEase/legalease-partner-dashboard-clean',GITHUB_REF_NAME:'codex/f-vercel-raw-readonly-20261026',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:'a'.repeat(40),GITHUB_WORKFLOW_SHA:'a'.repeat(40),DISPATCH_INPUTS:JSON.stringify(input),SUPABASE_ACCESS_TOKEN:'PRIVATE_MANAGEMENT',GITHUB_TOKEN:'PRIVATE_GITHUB',STRIPE_SECRET_KEY:'sk_test_PRIVATE',VERCEL_AUTOMATION_BYPASS_SECRET:'PRIVATE_BYPASS'};
 const state=structuredClone(originalState);if(scenario==='job-present')state.job_count=1;if(scenario==='paid-database')state.payment_status='paid';
 const session={id:state.checkout_session_id,livemode:false,status:'open',payment_status:'unpaid',payment_intent:null,currency:'usd',amount_total:5000,amount_subtotal:5000,mode:'payment',metadata:{briefcase_item_id:DTC.item,user_id:DTC.owner,verification_hash:state.verification_hash,pathway_id:state.route.pathwayId,jurisdiction:'MS',product_id:'expungement_packet',person_id:'11111111-1111-4111-8111-111111111111',matter_id:'22222222-2222-4222-8222-222222222222'},success_url:DTC.origin+`/briefcase/${DTC.item}?payment=return&session_id={CHECKOUT_SESSION_ID}`,url:'https://checkout.stripe.com/c/pay/PRIVATE_CHECKOUT_URL'};
 if(scenario==='wrong-session')session.id='cs_test_wrong';if(scenario==='intent-present')session.payment_intent='pi_existing';if(scenario==='expired-session')session.status='expired';
 const calls=[],checkpoints=[],counts={auth:0,browser:0,pay:0};
 const response=(body,status=200)=>new Response(typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body),{status});
 const fetcher=async(url,init)=>{
  calls.push({url,init});assert.equal(init.redirect,'error');assert(init.signal instanceof AbortSignal);
  const marker=checkpoints.at(-1);assert.equal(marker.event,'before_request','durable marker precedes every request');assert.equal(marker.observedHttpStatus,null);
  if(url===`https://api.supabase.com/v1/projects/${DTC.project}/database/query`){assert.equal(init.method,'POST');const query=JSON.parse(init.body).query;assert.match(query,/begin transaction read only;/);assert.match(query,/statement_timeout='15s'/);assert(query.includes(DTC.item));assert(!/insert into|update public|delete from/i.test(query));return response([state],201);}
  if(url==='https://api.stripe.com/v1/checkout/sessions/'+state.checkout_session_id){assert.equal(init.method,'GET');assert.equal(init.headers.Authorization,'Bearer '+env.STRIPE_SECRET_KEY);assert.equal(init.headers['x-vercel-protection-bypass'],undefined);return response(session);}
  if(url===DTC.origin+'/api/rcap/release'){assert.equal(init.method,'GET');assert.equal(init.headers['x-vercel-protection-bypass'],env.VERCEL_AUTOMATION_BYPASS_SECRET);return response({application:'RCAP 2.0',policyVersion:'rcap2.2',buildSha:scenario==='wrong-release'?'0'.repeat(40):DTC.app,runtimeSha:DTC.app,sourceBound:false},503);}
  if(url===`https://api.supabase.com/v1/projects/${DTC.project}/api-keys`){assert.equal(init.method,'GET');if(scenario==='key-timeout')throw Error('PRIVATE_KEY_TIMEOUT');return response([{name:'anon',api_key:'PRIVATE_ANON'},{name:'service_role',api_key:'PRIVATE_SERVICE_UNUSED'}]);}
  if(url===`https://api.github.com/repos/Roger-LegalEase/legalease-partner-dashboard-clean/contents/${CREDENTIAL_SOURCE.path}?ref=${CREDENTIAL_SOURCE.commit}`){assert.equal(init.method,'GET');assert.equal(init.headers.Authorization,'Bearer '+env.GITHUB_TOKEN);assert.equal(init.headers.Accept,'application/vnd.github.raw+json');return response(scenario==='wrong-credential-hash'?Buffer.from('PRIVATE_WRONG_BLOB'):blob);}
  if(url===`https://${DTC.project}.supabase.co/auth/v1/token?grant_type=password`){counts.auth++;assert.equal(counts.auth,1);assert.equal(init.method,'POST');assert.equal(init.headers.apikey,'PRIVATE_ANON');assert.deepEqual(JSON.parse(init.body),owner);return response({access_token:'PRIVATE_ACCESS',refresh_token:'PRIVATE_REFRESH',user:{id:scenario==='wrong-auth-owner'?'11111111-1111-4111-8111-111111111111':DTC.owner}});}
  throw Error('Unexpected transport; no checkout, retarget, intent or worker port is allowed');
 };
 const checkpoint=async value=>{if(scenario==='checkpoint-failure'&&value.phase==='before_final_pay_inspection'||scenario==='http-checkpoint-failure'&&value.phase==='existing_anon_key_read'&&value.event==='after_response')throw Error('PRIVATE_CHECKPOINT_FAILURE');checkpoints.push(structuredClone(value));};
 const browser=async o=>{
  counts.browser++;assert.equal(counts.browser,1);assert.equal(o.checkoutUrl,session.url);assert.equal(o.expectedReturnUrl,session.success_url.replace('{CHECKOUT_SESSION_ID}',session.id));assert.equal(o.email,owner.email);assert.equal(o.promotionCode,null);assert.equal(o.onReturn,null);assert.equal(o.screenshotDir,null);assert.equal(o.executablePath,'/usr/bin/google-chrome');assert(o.sessionCookies.length>0);for(const c of o.sessionCookies){assert.equal(c.domain,new URL(DTC.origin).hostname);assert(c.name.startsWith('sb-'+DTC.project+'-auth-token'));assert.equal(c.secure,true);}
  if(scenario==='browser-throws')throw Error('PRIVATE_BROWSER_THROW https://private.invalid');
  if(scenario==='unexpected-submit'){await assert.rejects(o.onSubmitCheckpoint({submitAttempted:false}));return {completed:false,submitAttempted:false,failureReason:'submission_checkpoint_failed'};}
  if(scenario==='early-required')return {completed:false,humanInteractionRequired:true,submitAttempted:false,failureReason:'required_fields_missing',submitInspection:inspection,notes:['PRIVATE_NOTES'],returnUrl:'PRIVATE_URL'};
  if(scenario==='challenge')return {completed:false,humanInteractionRequired:true,submitAttempted:false,failureReason:'provider_challenge',notes:['PRIVATE_PROVIDER_BODY']};
  if(scenario==='dishonest-completion')return {completed:true,submitAttempted:true,failureReason:'completed'};
  try{await o.beforeFinalPay(inspection);counts.pay++;throw Error('No-Pay callback returned');}
  catch(error){if(scenario==='checkpoint-failure')return {completed:false,submitAttempted:false,failureReason:'final_payment_window_check_failed'};assert.equal(error.code,'CHECKOUT_DIAGNOSTIC_STOP');return {completed:false,humanInteractionRequired:false,submitAttempted:false,failureReason:'diagnostic_stop_before_pay',submitInspection:inspection,notes:['PRIVATE_NOTES'],returnUrl:'PRIVATE_URL'};}
 };
 return {env,input,calls,checkpoints,counts,run:()=>inspectExistingDtcSession({env,fetcher,browser,checkpoint})};
}
function assertSafe(f,result){
 const out=JSON.stringify([result,f.checkpoints]);
 for(const secret of ['PRIVATE_',stateSecret(),DTC.item,DTC.owner,owner.email,owner.password,'https://','http://'])assert(!out.includes(secret),'no private value, raw URL or identity may enter evidence');
 assert.equal(f.counts.pay,0);assert(f.counts.auth<=1);assert(f.counts.browser<=1);
 assert(!f.calls.some(c=>/payment_intents|webhook_endpoints|\/render|\/checkout$|refresh_token|\/admin\//.test(c.url)));
}
function stateSecret(){return originalState.verification_hash;}
test('correct persisted session, actual source/hash, normal owner, safe callback then typed stop with no Pay',async()=>{
 const f=fixture();const result=await f.run();assert.equal(result.status,'EXISTING_SESSION_INSPECTED_NO_PAY');assert.equal(result.submitAttempted,false);assert.equal(result.beforePayObserved,true);assert.equal(result.inspection.submitDisabled,true);assert.equal(result.inspection.pageTotalClassifiedFree,true);assert.equal(result.providerExpectedAmountCents,5000);assert.equal(result.inspection.controls[1].name,'unrecognized_control');assert.equal(result.failureReason,'diagnostic_stop_before_pay');assert.equal(f.counts.auth,1);assert.equal(f.counts.browser,1);assert.equal(f.calls.length,6);assertSafe(f,result);
});
for(const scenario of ['early-required','challenge'])test('existing browser refusal '+scenario+' stops once without requiring Pay callback',async()=>{const f=fixture(scenario),result=await f.run();assert.equal(result.status,'EXISTING_SESSION_INSPECTED_NO_PAY');assert.equal(result.beforePayObserved,false);assert.equal(result.submitAttempted,false);assertSafe(f,result);});
for(const scenario of ['job-present','paid-database','wrong-session','intent-present','expired-session','wrong-release','wrong-credential-hash','wrong-auth-owner','key-timeout','http-checkpoint-failure','checkpoint-failure','unexpected-submit','dishonest-completion','browser-throws'])test('bounded refusal '+scenario+' has no customer forwarding/retry',async()=>{
 const f=fixture(scenario),result=await f.run();assert.equal(result.status,'HOLD_NO_FORWARD');if(['job-present','paid-database','wrong-session','intent-present','expired-session','wrong-release','wrong-credential-hash','key-timeout','http-checkpoint-failure'].includes(scenario)){assert.equal(f.counts.auth,0);assert.equal(f.counts.browser,0);}if(scenario==='browser-throws')assert.equal(result.submitAttempted,null);if(scenario==='unexpected-submit')assert.equal(result.unexpectedSubmitCheckpoint,true);if(scenario==='http-checkpoint-failure'){assert.equal(result.observations.at(-1).http,200);assert(!f.checkpoints.some(c=>c.event==='request_failed'));}assertSafe(f,result);
});
test('wrong mode refuses before any transport',async()=>{const f=fixture();f.input.mode='dtc_saved_fulfillment';f.env.DISPATCH_INPUTS=JSON.stringify(f.input);const result=await f.run();assert.equal(result.status,'HOLD_NO_FORWARD');assert.equal(f.calls.length,0);assertSafe(f,result);});
test('safe inspection drops unknown fields and rejects nonboolean control state',()=>{const result=safeSubmitInspection(inspection);assert(!JSON.stringify(result).includes('PRIVATE_'));assert.throws(()=>safeSubmitInspection({...inspection,controls:[{...inspection.controls[0],invalid:'PRIVATE_VALUE'}]}));});
test('CLI admission refusal writes exclusive mode600 result without network',async()=>{
 const previousCwd=process.cwd(),previousFetch=globalThis.fetch,previousExit=process.exitCode,tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dtc-no-pay-absence-'));let calls=0;
 try{process.chdir(tmp);fs.writeFileSync('vercel.json',JSON.stringify({git:{deploymentEnabled:{'codex/f-vercel-raw-readonly-20261026':false}}}));globalThis.fetch=async()=>{calls++;throw Error('No network');};const f=fixture();f.env.DISPATCH_INPUTS=JSON.stringify({...f.input,mode:'wrong'});const result=await main(f.env);assert.equal(result.status,'HOLD_NO_FORWARD');assert.equal(calls,0);const file='dtc-existing-session-no-pay-inspection-evidence/result.json';assert.equal(fs.statSync(file).mode&0o777,0o600);assert.equal(fs.statSync(path.dirname(file)).mode&0o777,0o700);}
 finally{process.chdir(previousCwd);globalThis.fetch=previousFetch;process.exitCode=previousExit;fs.rmSync(tmp,{recursive:true});}
});

test('actual helper preserves free-classification boolean without changing payment behavior',async()=>{
 const {readCheckoutSubmitState}=await import('./rcap-saved-dtc-stripe-checkout-browser.mjs');
 const page={mainFrame:()=>page,frames:()=>[page],locator:()=>({all:async()=>[]})};
 for(const classifiedFree of [true,false]){
  const state=await readCheckoutSubmitState(page,{isDisabled:async()=>true},classifiedFree);
  assert.equal(state.pageTotalClassifiedFree,classifiedFree);assert.equal(safeSubmitInspection(state).pageTotalClassifiedFree,classifiedFree);
 }
 const source=fs.readFileSync(new URL('./rcap-saved-dtc-stripe-checkout-browser.mjs',import.meta.url),'utf8');
 assert.equal((source.match(/submitInspection = await readCheckoutSubmitState\(page,/g)||[]).length,3);
 assert.match(source,/first\(\), looksFree\)/);assert.match(source,/readCheckoutSubmitState\(page, null, looksFree\)/);assert.match(source,/readCheckoutSubmitState\(page, submit, looksFree\)/);
 assert.match(source,/const looksFree = \/\\\$0\\\.00\/\.test\(amountText\)/);
});
