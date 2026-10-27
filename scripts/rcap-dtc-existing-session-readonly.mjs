import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {DTC,hash,currentBaseline,assertSession} from './rcap-hosted-saved-dtc-contracts.mjs';
import {matterQuery} from './rcap-hosted-existing-dtc-continuation.mjs';
export const SESSION_SHA='88725b452648d5c1fa99e9b312df638384d813253a323af4649a4c834cdc4079';
export function classifyExistingSession(state,session,intent){
 const baseline=currentBaseline(state);assert.equal(hash(state.checkout_session_id),SESSION_SHA);assertSession(session,baseline,state.checkout_session_id);
 assert(['open','complete','expired'].includes(session.status));assert(['paid','unpaid','no_payment_required'].includes(session.payment_status));
 if(session.payment_intent){assert.match(session.payment_intent,/^pi_[A-Za-z0-9]+$/);assert.equal(intent?.id,session.payment_intent);assert.equal(intent.livemode,false);assert.equal(intent.currency,'usd');assert.equal(intent.amount,5000);assert(['requires_payment_method','requires_confirmation','requires_action','processing','requires_capture','canceled','succeeded'].includes(intent.status));}
 else assert.equal(intent,null);
 if(session.payment_status==='paid'){assert.equal(intent?.status,'succeeded');assert.equal(intent.amount_received,5000);}
 const safeCode=v=>typeof v==='string'&&/^[a-z_]{1,80}$/.test(v)?v:null;
 return {schemaVersion:'exact-existing-dtc-session-readonly/v1',status:'EXISTING_SESSION_RECONCILED_NO_FORWARD',caseSha256:hash(DTC.item),sessionSha256:SESSION_SHA,providerSessionStatus:session.status,providerPaymentStatus:session.payment_status,paymentIntentPresent:!!intent,paymentIntentStatus:intent?.status??'absent',paymentIntentSha256:intent?hash(intent.id):null,lastPaymentErrorCode:safeCode(intent?.last_payment_error?.code),declineCode:safeCode(intent?.last_payment_error?.decline_code),nextActionType:safeCode(intent?.next_action?.type),databasePaymentStatus:state.payment_status,providerEventPresent:!!state.provider_event_id,jobCount:state.job_count,revision:state.revision,customerWrites:0,providerWrites:0,newCheckout:false,payAllowed:false,enqueueAllowed:false,workerAllowed:false};
}
export async function main(env=process.env){
 const dir='dtc-existing-session-readonly-evidence';fs.mkdirSync(dir,{mode:0o700});fs.chmodSync(dir,0o700);let phase='admission';const observations=[];
 const save=value=>{const fd=fs.openSync(dir+'/result.json','wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(value)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}};
 try{
  assert.equal(env.GITHUB_REPOSITORY,'Roger-LegalEase/legalease-partner-dashboard-clean');assert.equal(env.GITHUB_REF_NAME,'codex/f-vercel-raw-readonly-20261026');assert.equal(env.GITHUB_RUN_ATTEMPT,'1');assert.equal(env.GITHUB_EVENT_NAME,'workflow_dispatch');assert.equal(env.GITHUB_SHA,env.GITHUB_WORKFLOW_SHA);
  const input=JSON.parse(env.DISPATCH_INPUTS);assert.equal(input.mode,'dtc_existing_session_readonly');assert.equal(input.resume_matter_id,DTC.item);for(const[k,v]of Object.entries({application_sha:DTC.app,tools_sha:DTC.tools,worker_source_sha:DTC.worker,worker_digest:DTC.digest,supabase_project_ref:DTC.project}))assert.equal(input[k],v);
  for(const k of ['clinic_attempt_id','journey_state','contradiction_job_id','promotion_code','expected_total_cents','sponsor_case','clinic_resume_authorization','clinic_session_closure_authorization'])assert(!input[k]);assert.equal(input.sponsor_items??'[]','[]');assert([undefined,false,'false'].includes(input.sponsor_fulfillment));assert(/^sk_test_[^\s]+$/.test(env.STRIPE_SECRET_KEY));assert(env.SUPABASE_ACCESS_TOKEN?.trim());
  phase='exact_saved_matter_read';const query=matterQuery().replace('begin transaction read only;',"begin transaction read only; set local statement_timeout='15s';");const response=await fetch(`https://api.supabase.com/v1/projects/${DTC.project}/database/query`,{method:'POST',headers:{Authorization:'Bearer '+env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({query}),redirect:'error',signal:AbortSignal.timeout(20000)});observations.push({phase,http:response.status});assert([200,201].includes(response.status));const rows=await response.json();assert.equal(rows.length,1);const state=rows[0];currentBaseline(state);assert.equal(hash(state.checkout_session_id),SESSION_SHA);assert(/^cs_test_[A-Za-z0-9]+$/.test(state.checkout_session_id));
  const read=async resource=>{const r=await fetch('https://api.stripe.com/v1/'+resource,{method:'GET',headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY},redirect:'error',signal:AbortSignal.timeout(20000)});observations.push({phase,http:r.status});assert.equal(r.status,200);return r.json();};
  phase='same_existing_session_read';const session=await read('checkout/sessions/'+state.checkout_session_id);assert.equal(session.id,state.checkout_session_id);assert.equal(hash(session.id),SESSION_SHA);assert.equal(session.livemode,false);let intent=null;
  if(session.payment_intent){assert.match(session.payment_intent,/^pi_[A-Za-z0-9]+$/);phase='same_session_intent_read';intent=await read('payment_intents/'+session.payment_intent);}
  phase='typed_classification';save({...classifyExistingSession(state,session,intent),observations});
 }catch(error){save({status:'HOLD_NO_FORWARD',phase,errorClass:error?.name==='AssertionError'?'AssertionError':'Error',observations,customerWrites:0,providerWrites:0,newCheckout:false,payAllowed:false});process.exitCode=1;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
