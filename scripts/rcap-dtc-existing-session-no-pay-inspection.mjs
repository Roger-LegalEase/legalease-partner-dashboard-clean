import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {DTC,hash,currentBaseline} from './rcap-hosted-saved-dtc-contracts.mjs';
import {SESSION_SHA,classifyExistingSession} from './rcap-dtc-existing-session-readonly.mjs';
import {matterQuery} from './rcap-hosted-existing-dtc-continuation.mjs';
import {assertConsumerPurposeRelease} from './rcap-hosted-consumer-purpose-release.mjs';
import {CREDENTIAL_SOURCE,readSavedDtcCredentials} from './rcap-hosted-saved-dtc-credentials.mjs';
import {createNormalSavedActorPorts} from './rcap-hosted-saved-dtc-ports.mjs';
import {completeHostedCheckout} from './rcap-saved-dtc-stripe-checkout-browser.mjs';

const MODE='dtc_existing_session_no_pay_inspection';
const SAFE_NAMES=new Set(['unrecognized_control','email','cardNumber','cardExpiry','cardCvc','cardCountry','cardPostalCode','billingName','billingAddressLine1','billingAddressLine2','billingLocality','billingAdministrativeArea','billingPostalCode','billingCountry','phoneNumber','name','country','addressLine1','addressLine2','postalCode','city','state','termsOfServiceConsentCheckbox','cc-name','cc-number','cc-exp','cc-csc','country-name','street-address','address-line1','address-line2','address-level1','address-level2','postal-code','tel']);
const REASONS=new Set(['diagnostic_stop_before_pay','required_fields_missing','submit_control_missing','card_not_supplied','provider_challenge','preview_bootstrap_failed','unexpected_destination','browser_operation_failed']);
export function safeSubmitInspection(value){
 if(value===null||value===undefined)return null;
 assert(typeof value.inspectionComplete==='boolean');assert.equal(typeof value.pageTotalClassifiedFree,'boolean');assert(value.submitDisabled===null||typeof value.submitDisabled==='boolean');assert(Array.isArray(value.controls)&&value.controls.length<=60);
 return {pageTotalClassifiedFree:value.pageTotalClassifiedFree,submitDisabled:value.submitDisabled,inspectionComplete:value.inspectionComplete,controls:value.controls.map(c=>{
  assert(['input','select','checkbox','radio'].includes(c.type));for(const k of ['required','missing','invalid','unknownRequiredCheckbox'])assert.equal(typeof c[k],'boolean');assert(c.checked===null||typeof c.checked==='boolean');
  return {name:SAFE_NAMES.has(c.name)?c.name:'unrecognized_control',type:c.type,required:c.required,missing:c.missing,invalid:c.invalid,checked:c.checked,unknownRequiredCheckbox:c.unknownRequiredCheckbox};
 })};
}
function admit(env){
 assert.equal(env.GITHUB_ACTIONS,'true');assert.equal(env.GITHUB_REPOSITORY,'Roger-LegalEase/legalease-partner-dashboard-clean');assert.equal(env.GITHUB_REF_NAME,'codex/f-vercel-raw-readonly-20261026');assert.equal(env.GITHUB_EVENT_NAME,'workflow_dispatch');assert.equal(env.GITHUB_RUN_ATTEMPT,'1');assert.match(env.GITHUB_SHA??'',/^[a-f0-9]{40}$/);assert.equal(env.GITHUB_SHA,env.GITHUB_WORKFLOW_SHA);
 const input=JSON.parse(env.DISPATCH_INPUTS);for(const[k,v]of Object.entries({mode:MODE,resume_matter_id:DTC.item,application_sha:DTC.app,tools_sha:DTC.tools,worker_source_sha:DTC.worker,worker_digest:DTC.digest,supabase_project_ref:DTC.project}))assert.equal(input[k],v);
 for(const k of ['clinic_attempt_id','journey_state','contradiction_job_id','promotion_code','expected_total_cents','sponsor_case','clinic_resume_authorization','clinic_session_closure_authorization'])assert(!input[k]);assert.equal(input.sponsor_items??'[]','[]');assert([undefined,false,'false'].includes(input.sponsor_fulfillment));
 for(const k of ['SUPABASE_ACCESS_TOKEN','GITHUB_TOKEN','VERCEL_AUTOMATION_BYPASS_SECRET'])assert(env[k]?.trim());assert(/^sk_test_[^\s]+$/.test(env.STRIPE_SECRET_KEY));
}
/** One pinned session inspection. Explicit ports let tests exercise the real transports without live I/O. */
export async function inspectExistingDtcSession({env,fetcher,browser,checkpoint}){
 for(const fn of [fetcher,browser,checkpoint])assert.equal(typeof fn,'function');
 let phase='admission',inspection=null,submitAttempted=null,beforePayObserved=false,stopCheckpointPersisted=false,unexpectedSubmitCheckpoint=false;
 const observations=[];
 const flags={caseSha256:hash(DTC.item),sessionSha256:SESSION_SHA,newCheckout:false,payAllowed:false,enqueueAllowed:false,workerAllowed:false};
 const request=async(url,init)=>{
  await checkpoint({phase,event:'before_request',observedHttpStatus:null});
  let r;try{r=await fetcher(url,{...init,redirect:'error',signal:init.signal??AbortSignal.timeout(30000)});}
  catch{await checkpoint({phase,event:'request_failed',observedHttpStatus:null});throw new Error('Bounded inspection request failed.');}
  observations.push({phase,http:r.status});await checkpoint({phase,event:'after_response',observedHttpStatus:r.status});return r;
 };
 try{
  admit(env);
  phase='exact_saved_matter_read';const query=matterQuery().replace('begin transaction read only;',"begin transaction read only; set local statement_timeout='15s';");
  const matter=await request(`https://api.supabase.com/v1/projects/${DTC.project}/database/query`,{method:'POST',headers:{Authorization:'Bearer '+env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({query})});assert([200,201].includes(matter.status));const rows=await matter.json();assert.equal(rows.length,1);const state=rows[0];currentBaseline(state);assert.equal(hash(state.checkout_session_id),SESSION_SHA);assert(/^cs_test_[A-Za-z0-9]+$/.test(state.checkout_session_id));assert.equal(state.payment_status,'unpaid');assert.equal(state.payment_valid,false);assert.equal(state.provider_event_id,null);assert.equal(state.job_count,0);
  phase='same_existing_session_read';const provider=await request('https://api.stripe.com/v1/checkout/sessions/'+state.checkout_session_id,{method:'GET',headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY}});assert.equal(provider.status,200);const session=await provider.json();assert.equal(session.payment_intent,null);const reconciled=classifyExistingSession(state,session,null);assert.equal(reconciled.providerSessionStatus,'open');assert.equal(reconciled.providerPaymentStatus,'unpaid');assert.equal(reconciled.paymentIntentPresent,false);assert.equal(new URL(session.url).origin,'https://checkout.stripe.com');
  phase='actual_purpose_runtime_identity';const release=await request(DTC.origin+'/api/rcap/release',{method:'GET',headers:{'x-vercel-protection-bypass':env.VERCEL_AUTOMATION_BYPASS_SECRET}});assertConsumerPurposeRelease({status:release.status,json:await release.json()},'configured_sandbox_preview');
  phase='existing_anon_key_read';const keyResponse=await request(`https://api.supabase.com/v1/projects/${DTC.project}/api-keys`,{method:'GET',headers:{Authorization:'Bearer '+env.SUPABASE_ACCESS_TOKEN}});assert.equal(keyResponse.status,200);const keys=await keyResponse.json();assert(Array.isArray(keys));const anon=keys.filter(k=>k.name==='anon');assert.equal(anon.length,1);assert(anon[0].api_key?.trim());
  phase='historical_credential_content_read';const content=await request(`https://api.github.com/repos/Roger-LegalEase/legalease-partner-dashboard-clean/contents/${CREDENTIAL_SOURCE.path}?ref=${CREDENTIAL_SOURCE.commit}`,{method:'GET',headers:{Authorization:'Bearer '+env.GITHUB_TOKEN,Accept:'application/vnd.github.raw+json'}});assert.equal(content.status,200);const credentialsFor=readSavedDtcCredentials(Buffer.from(await content.arrayBuffer()));const owner=await credentialsFor('owner');
  phase='normal_owner_login';const actors=createNormalSavedActorPorts({fetcher:request,anonKey:anon[0].api_key,bypass:env.VERCEL_AUTOMATION_BYPASS_SECRET,credentialsFor,boundJobId:()=>null});await actors.verifyNormalOwner();const sessionCookies=await actors.ownerSessionCookies();
  phase='same_session_browser_inspection';await checkpoint({phase,sessionSha256:SESSION_SHA,submitAttempted:null,payAllowed:false});
  const result=await browser({checkoutUrl:session.url,expectedReturnUrl:session.success_url.replace('{CHECKOUT_SESSION_ID}',session.id),previewProtectionBypassSecret:env.VERCEL_AUTOMATION_BYPASS_SECRET,email:owner.email,sessionCookies,promotionCode:null,screenshotDir:null,onReturn:null,executablePath:'/usr/bin/google-chrome',
   beforeFinalPay:async value=>{beforePayObserved=true;inspection=safeSubmitInspection(value);assert(inspection);submitAttempted=false;await checkpoint({phase:'before_final_pay_inspection',inspection,providerExpectedAmountCents:session.amount_total,submitAttempted:false,payAllowed:false});stopCheckpointPersisted=true;const stop=new Error('Existing-session inspection stops before Pay.');stop.code='CHECKOUT_DIAGNOSTIC_STOP';throw stop;},
   onSubmitCheckpoint:async value=>{unexpectedSubmitCheckpoint=true;submitAttempted=typeof value?.submitAttempted==='boolean'?value.submitAttempted:null;await checkpoint({phase:'unexpected_submit_checkpoint_refused',submitAttempted,payAllowed:false});throw new Error('Submission is not permitted by this inspection.');}
  });
  submitAttempted=typeof result?.submitAttempted==='boolean'?result.submitAttempted:null;
  assert.equal(unexpectedSubmitCheckpoint,false);assert.equal(result?.completed,false);assert.equal(submitAttempted,false);assert(REASONS.has(result.failureReason));
  if(beforePayObserved){assert(stopCheckpointPersisted);assert.equal(result.failureReason,'diagnostic_stop_before_pay');}else assert.notEqual(result.failureReason,'diagnostic_stop_before_pay');
  inspection=inspection??safeSubmitInspection(result.submitInspection);
  return {schemaVersion:'exact-existing-dtc-no-pay-inspection/v1',status:'EXISTING_SESSION_INSPECTED_NO_PAY',...flags,providerExpectedAmountCents:session.amount_total,providerSessionStatus:'open',providerPaymentStatus:'unpaid',paymentIntentPresent:false,jobCount:0,completed:false,humanInteractionRequired:typeof result.humanInteractionRequired==='boolean'?result.humanInteractionRequired:null,failureReason:result.failureReason,submitAttempted,beforePayObserved,inspection,observations};
 }catch(error){return {schemaVersion:'exact-existing-dtc-no-pay-inspection/v1',status:'HOLD_NO_FORWARD',...flags,phase,errorClass:error?.name==='AssertionError'?'AssertionError':'Error',submitAttempted,beforePayObserved,unexpectedSubmitCheckpoint,inspection,observations};}
}
export async function main(env=process.env){
 const dir='dtc-existing-session-no-pay-inspection-evidence';fs.mkdirSync(dir,{recursive:true,mode:0o700});fs.chmodSync(dir,0o700);let sequence=0;
 const save=(name,value)=>{const fd=fs.openSync(dir+'/'+name,'wx',0o600);try{fs.fchmodSync(fd,0o600);fs.writeFileSync(fd,JSON.stringify(value)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}};
 assert.equal(JSON.parse(fs.readFileSync('vercel.json')).git.deploymentEnabled[env.GITHUB_REF_NAME],false);
 const result=await inspectExistingDtcSession({env,fetcher:fetch,browser:completeHostedCheckout,checkpoint:async value=>save('checkpoint-'+String(++sequence).padStart(3,'0')+'.json',value)});save('result.json',result);if(result.status!=='EXISTING_SESSION_INSPECTED_NO_PAY')process.exitCode=1;return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('Existing-session inspection held; no Pay is authorized.');process.exitCode=1;});
