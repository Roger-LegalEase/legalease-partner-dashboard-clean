// Current-release packet canary capability. No owner authority is created here.
// Imported by the existing browser probe; all services remain behind its real gate.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {QUEUE_QUERY} from './rcap-production-worker-readiness.mjs';
export {QUEUE_QUERY};
export const CANARY = Object.freeze({
 applicationSha:'e312a5efa7b4882e0fbf61a5ff0ae7891ac23226',
 workerSourceSha:'5e04eafd7eaed7e71722862e651fb787ebbd296d',
 workerDigest:'sha256:6b6a60fc5b2d0060028526013ce37c69f748e2cccb4cfb10943f2af6cf26cfe1',
 workerInputFingerprint:'sha256:90a1e89e306cb5fc23631c63c15c12a44d955d745bbe04aada0716af2805daab',
 productionProjectRef:'wwtwtsmywnckfkdaqqeg',
 activatedDeploymentId:'dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc',
 rollbackDeploymentId:'dpl_5rpkFUKgmp5cGwPaLAzHxx1nUuPK',
 email:'rcap-production-packet-canary@rcap-acceptance.test', origin:'https://expungement.ai',
});
const requireThat=(ok,code)=>{if(!ok)throw Error(`packet_canary_${code}`);};
export const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const hash=v=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v);
export function assertCanaryRelease(candidate,env) {
 for(const k of ['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','productionProjectRef'])requireThat(candidate[k]===CANARY[k],`release_${k}`);
 for(const [k,v]of Object.entries({RCAP_APPLICATION_SHA:CANARY.applicationSha,RCAP_WORKER_SOURCE_SHA:CANARY.workerSourceSha,RCAP_WORKER_DIGEST:CANARY.workerDigest,RCAP_PRODUCTION_PROJECT_REF:CANARY.productionProjectRef,RCAP_PRODUCTION_DEPLOYMENT_ID:CANARY.activatedDeploymentId,RCAP_PUBLIC_ORIGIN:CANARY.origin,RCAP_PRODUCTION_PHASE:'packet_canary',RCAP_PROBE_BROWSERS:'chromium'}))requireThat(env[k]===v,`input_${k}`);
 const a=candidate.productionAuthorization;
 requireThat(a?.activation?.state==='consumed_successfully'&&a?.publicVerification?.state==='consumed_successfully','closures_required');
 requireThat(a.activation.activationReceipt.runId===36791436905&&a.publicVerification.publicVerificationReceipt.runId===36861106020,'closure_identity');
 requireThat(a.publicVerification.publicVerificationReceipt.activatedDeploymentId===CANARY.activatedDeploymentId&&a.stagedDeploymentId===CANARY.activatedDeploymentId&&a.rollbackDeploymentId===CANARY.rollbackDeploymentId,'deployment_binding');
 // The future owner decision must bind a resume to an exact earlier canary.
 // This does not authorize that decision: requireProductionPhaseAuthorization
 // runs first and rejects every packet_canary on the implementation successor.
 const resume=env.RCAP_RESUME_MATTER_ID?.trim()||'';
 requireThat(!resume||uuid(resume),'resume_id');
 if(resume) requireThat(a.packetCanary?.resumeMatterId===resume&&uuid(a.packetCanary?.resumeAuthUserId),'resume_not_owner_bound');
 else requireThat(!a.packetCanary?.resumeMatterId,'resume_required');
 requireThat(typeof env.RCAP_LIVE_PROMOTION_CODE==='string'&&env.RCAP_LIVE_PROMOTION_CODE.trim().length>0,'promotion_required');
 return {resumeMatterId:resume,expectedUserId:resume?a.packetCanary.resumeAuthUserId:null};
}
export function assertWorkerHealth(machines,queue,imageProof=null) {
 requireThat(Array.isArray(machines)&&machines.length===1,'worker_inventory');
 const m=machines[0],c=m.config;
 requireThat(m.state==='started','worker_not_started');
 requireThat(m.image_ref?.labels?.['org.opencontainers.image.revision']===CANARY.workerSourceSha,'worker_source');
 // Mirror manifests may differ, but their immutable image config/rootfs must
 // equal the accepted image, as in readWorkerReadiness. Labels alone never pass.
 requireThat(m.image_ref?.digest===CANARY.workerDigest || (
   imageProof?.acceptedDigest===CANARY.workerDigest && imageProof.observedDigest===m.image_ref?.digest
   && /^sha256:[0-9a-f]{64}$/.test(imageProof.acceptedConfigId??'')
   && imageProof.acceptedConfigId===imageProof.observedConfigId
 ),'worker_image_digest');
 requireThat(c?.env?.RCAP_WORKER_CONTAINER_DIGEST===CANARY.workerDigest,'worker_digest');
 requireThat(c?.env?.ENABLE_SUPABASE_PARTNER_DATA==='true','worker_data_disabled');
 requireThat(c?.restart?.policy==='always'&&(c.services===undefined||(Array.isArray(c.services)&&c.services.length===0)),'worker_configuration');
 for(const k of ['stale_queued','queued','claimed','terminal_failed'])requireThat(/^(0|[1-9][0-9]*)$/.test(String(queue?.[k])),'queue_unreadable');
 requireThat(Number(queue.stale_queued)===0&&Number(queue.terminal_failed)===0,'queue_unhealthy');
 return {id:m.id,state:m.state,imageDigest:m.image_ref.digest,workerSourceSha:CANARY.workerSourceSha,imageProof,queue};
}
export function consumerMatterId(itemId) {
 const h=createHash('sha256').update(`rcap:consumer-matter:v1:${itemId}`).digest('hex');
 return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-${((parseInt(h[16],16)&3)|8).toString(16)}${h.slice(17,20)}-${h.slice(20,32)}`;
}
export function assertMatter(row,{matterId,userId}) {
 requireThat(uuid(matterId)&&uuid(userId)&&row?.id===matterId&&row.user_id===userId&&row.email===CANARY.email,'matter_owner');
}
export function assertSettlement(row) {
 requireThat(row?.payment_status==='paid'&&row.amount_cents===0&&row.regular_price_cents===5000&&row.discount_cents===5000&&String(row.currency).toUpperCase()==='USD'&&typeof row.provider_event_id==='string'&&row.provider_event_id.length>0,'settlement');
 requireThat(typeof row.checkout_session_id==='string'&&row.checkout_session_id.startsWith('cs_live_'),'session_identity');
 return row;
}
export const JOB_COLUMNS='id, packet_id, route_id, renderer_kind, renderer_version, consumer_briefcase_item_id, consumer_auth_user_id, matter_id, person_id, input_hash, attempt_count, container_digest, status, delivery_eligibility, accounting_result, output_storage_path, output_sha256, normalized_output_sha256, failure_disposition, error_code, last_error_detail';
export function assertJob(rows,{matterId,userId,jobId=null,delivered=false}) {
 requireThat(Array.isArray(rows)&&rows.length===1,'render_job_not_unique');
 const j=rows[0];
 requireThat(uuid(j.id)&&(!jobId||j.id===jobId)&&j.consumer_briefcase_item_id===matterId&&j.consumer_auth_user_id===userId&&j.matter_id===consumerMatterId(matterId),'render_job_identity');
 for(const k of ['packet_id','route_id','renderer_kind','renderer_version'])requireThat(typeof j[k]==='string'&&j[k].length>0,`job_${k}`);
 requireThat(hash(j.input_hash)&&Number.isInteger(j.attempt_count)&&j.attempt_count===1,'job_input_or_attempt');
 requireThat(!j.failure_disposition&&!j.error_code&&!j.last_error_detail,'job_failure');
 requireThat(j.status===(delivered?'delivered':'artifact_validated'),'job_state');
 requireThat(j.container_digest===CANARY.workerDigest,'job_container_digest');
 requireThat(typeof j.output_storage_path==='string'&&j.output_storage_path.length>0&&hash(j.output_sha256)&&hash(j.normalized_output_sha256),'job_artifact');
 requireThat(j.delivery_eligibility==='eligible'&&j.accounting_result==='zero_charge','job_delivery_accounting');
 return j;
}
export function observeJob(rows,identity) {
 requireThat(Array.isArray(rows)&&rows.length<=1,'render_job_not_unique');
 if(!rows.length)return null;
 const j=rows[0];
 requireThat(!identity.jobId||identity.jobId===j.id,'render_job_identity');
 requireThat(j.consumer_briefcase_item_id===identity.matterId&&j.consumer_auth_user_id===identity.userId&&j.matter_id===consumerMatterId(identity.matterId),'render_job_identity');
 requireThat(!j.failure_disposition&&!j.error_code&&!j.last_error_detail&&j.attempt_count<=1,'job_failure');
 requireThat(['queued','claimed','rendering','validating','artifact_validated','delivered'].includes(j.status),'job_state');
 return j;
}
export function assertDeliveryEvents(events,job,userId) {
 requireThat(Array.isArray(events)&&events.some(e=>uuid(e.id)&&e.render_job_id===job.id&&e.actor_user_id===userId&&e.event_type==='transmission_completed'),'delivery_event_missing');
 return events;
}
export function inspectPdf(bytes,command=execFileSync) {
 // Poppler reads actual pages (including object streams/font maps), preserving
 // empty pages. Counting arbitrary compressed content streams is not page proof.
 let text;
 try{text=command('pdftotext',['-layout','-','-'],{input:bytes,encoding:'utf8',maxBuffer:16*1024*1024,stdio:['pipe','pipe','pipe']});}
 catch{throw Error('packet_canary_pdf_unreadable');}
 const pages=text.replace(/\r/g,'').split('\f');if(pages.at(-1)?.trim()==='')pages.pop();
 return pages.map(p=>p.replace(/\s+/g,' ').trim());
}
export function assertDownload({status,contentType,bytes,pages},job) {
 requireThat(status===200,'owner_download');
 requireThat(/^application\/pdf(?:;|$)/i.test(contentType)&&bytes.length>1000&&bytes.subarray(0,5).toString()==='%PDF-','not_pdf');
 const sha256=createHash('sha256').update(bytes).digest('hex');
 requireThat(sha256===job.output_sha256,'download_hash_mismatch');
 requireThat(Array.isArray(pages)&&pages.length>0,'zero_pages');
 requireThat(pages.filter(p=>p.length>40).length>=2&&pages.join('\n').length>500,'insufficient_text');
 requireThat(pages.slice(1,-1).every(p=>p.length>40),'blank_middle_page');
 const text=pages.join('\n');
 for(const expected of ['Acceptance Participant','Hinds County Circuit Court','25-CR-000123','Mississippi','expungement'])requireThat(text.toLowerCase().includes(expected.toLowerCase()),'content_missing');
 return {httpStatus:status,contentType,byteLength:bytes.length,pageCount:pages.length,sha256,pagesWithText:pages.filter(p=>p.length>40).length,charactersRead:text.length};
}
export function assertAnonymous(status){requireThat(status===401,'anonymous_download');}
export function zeroTotal(text){return /^(?:US\s*)?\$0\.00(?:\s*USD)?$/.test(text.trim());}
export function assertZeroCheckout({url,promotionEntered,promotionAccepted,totalText,paymentFields=[]}) {
 requireThat(new URL(url).origin==='https://checkout.stripe.com','checkout_origin');
 requireThat(promotionEntered===true&&promotionAccepted===true&&zeroTotal(totalText),'nonzero_total');
 requireThat(Array.isArray(paymentFields)&&paymentFields.length===0,'payment_method_present');
}
export function createOneOrderGuard({resume=false}={}) {
 let checkout=0,submissions=0,matters=0;
 return {
  claim(){requireThat(!resume&&++matters===1,'second_matter');},
  checkout(){requireThat(!resume&&++checkout===1,'second_checkout');},
  submit(facts){assertZeroCheckout(facts);requireThat(!resume&&checkout===1&&++submissions===1,'second_order');},
  snapshot(){return {matters,checkout,submissions,resume};}
 };
}
export function resumeDisposition(row,identity,jobs) {
 assertMatter(row,identity);assertSettlement(row);
 const j=observeJob(jobs,identity);requireThat(j,'resume_job_missing');
 if(j.status==='delivered'){assertJob(jobs,{...identity,delivered:true});return 'already_delivered';}
 return 'wait_existing_job'; // Never opens Checkout, claims, fills, or enqueues.
}
export const MUTATION_CLASSES=Object.freeze([
 'reserved_synthetic_auth_account_creation_or_password_reset',
 'synthetic_sign_in_session_and_auth_audit','one_pending_screening_result','one_claimed_consumer_briefcase_item','participant_claim_audit_events',
 'packet_information_and_final_verification_for_that_item',
 'one_live_stripe_checkout_session','one_zero_dollar_paid_reconciliation_and_provider_event',
 'consumer_person_identity_and_one_packet_identity','one_packet_render_job',
 'zero_charge_accounting_ledger','one_private_packet_storage_object',
 'short_lived_owner_download_grant','owner_delivery_event_rows',
 'ordinary_anonymous_analytics_and_funnel_telemetry',
]);
export function assertMutationClasses(classes){assert.deepEqual(classes,[...MUTATION_CLASSES],'packet_canary_mutation_scope');}

// Dependency-injected delivery control, used verbatim by the real browser probe
// and exercised with local mocks. No latest-row query, worker launch or retry.
export async function proveCanaryDelivery(ports, identity, {resume=false,maxPolls=60}={}) {
 let row,jobId=null,job;
 for(let attempt=0;attempt<maxPolls;attempt++) {
  row=await ports.matter();assertMatter(row,identity);
  if(row.payment_status==='paid')break;
  requireThat(!resume,'resume_unsettled');await ports.wait();
 }
 assertSettlement(row);ports.capture('settlement',row);
 for(let attempt=0;attempt<maxPolls;attempt++) {
  const rows=await ports.jobs();job=observeJob(rows,{...identity,jobId});
  if(job){jobId??=job.id;ports.capture('renderJob',job);}
  if(job?.status==='delivered') {
   requireThat(resume,'unexpected_prior_delivery');assertJob(rows,{...identity,jobId,delivered:true});
   const events=assertDeliveryEvents(await ports.events(jobId),job,identity.userId);
   return {alreadyDelivered:true,settlement:row,job,deliveryEvents:events};
  }
  if(job?.status==='artifact_validated'){assertJob(rows,{...identity,jobId});break;}
  await ports.wait();
 }
 assertJob(job?[job]:[],{...identity,jobId});
 const before=structuredClone(job);
 const download=await ports.ownerDownload();
 const artifact=assertDownload(download,before);
 ports.capture('artifact',artifact);
 const anonymousStatus=await ports.anonymousDownload();assertAnonymous(anonymousStatus);
 let events=[];
 for(let attempt=0;attempt<maxPolls;attempt++) {
  const rows=await ports.jobs();job=observeJob(rows,{...identity,jobId});
  if(job?.status==='delivered') {
   assertJob(rows,{...identity,jobId,delivered:true});
   requireThat(job.output_sha256===before.output_sha256&&job.output_storage_path===before.output_storage_path&&job.input_hash===before.input_hash,'post_delivery_artifact_changed');
   events=assertDeliveryEvents(await ports.events(jobId),job,identity.userId);break;
  }
  await ports.wait();
 }
 requireThat(job?.status==='delivered','delivery_not_recorded');
 ports.capture('deliveredJob',job);ports.capture('deliveryEvents',events);
 return {settlement:row,jobBeforeDownload:before,job,artifact,anonymousStatus,deliveryEvents:events,
  stranger:{liveTested:false,reason:'No independently established second reserved Production identity is bound. Cross-user isolation remains covered by hosted acceptance.'}};
}

// All privileged transport adapters apply this before fetch. This is narrower
// than the eventual phase authority and can never admit infrastructure writes.
export function assertServiceRequest(service,{pathname,method='GET',body=null,existingUserId=null}) {
 if(service==='fly') {requireThat(method==='GET'&&pathname==='/v1/apps/legalease-rcap-render-worker/machines','infrastructure_mutation');return;}
 if(service==='management') {
  if(pathname===`/v1/projects/${CANARY.productionProjectRef}/api-keys?reveal=true`){requireThat(method==='GET','key_mutation');return;}
  requireThat(pathname===`/v1/projects/${CANARY.productionProjectRef}/database/query`&&method==='POST'&&body?.read_only===true&&/^select\b/i.test(body?.query?.trim()??''),'database_mutation');return;
 }
 if(service==='auth') {
  if(pathname==='/auth/v1/admin/users'&&method==='POST')requireThat(body?.email===CANARY.email,'real_customer_mutation');
  else requireThat(method==='PUT'&&uuid(existingUserId)&&pathname===`/auth/v1/admin/users/${existingUserId}`&&Object.keys(body??{}).every(k=>['password','email_confirm'].includes(k)),'auth_mutation');
  return;
 }
 throw Error('packet_canary_infrastructure_mutation');
}

// Same immutable mirror/config comparison used by production worker readiness.
// Local docker pull/inspect only; never run, push, deploy, update or restart.
export function readWorkerImageProof(machine,{command=execFileSync,env=process.env}={}) {
 const observedDigest=machine?.image_ref?.digest;
 requireThat(/^sha256:[0-9a-f]{64}$/.test(observedDigest??''),'worker_image_digest');
 if(observedDigest===CANARY.workerDigest)return null;
 const app='legalease-rcap-render-worker',image=machine?.config?.image??'';
 requireThat(image.startsWith(`registry.fly.io/${app}:`)||image.startsWith(`registry.fly.io/${app}@`),'worker_image_registry');
 requireThat(machine?.image_ref?.labels?.['org.opencontainers.image.revision']===CANARY.workerSourceSha,'worker_source');
 requireThat(env.GITHUB_TOKEN&&env.GITHUB_ACTOR&&env.FLY_API_TOKEN,'image_read_credentials');
 const accepted=`ghcr.io/roger-legalease/rcap-render-worker@${CANARY.workerDigest}`;
 const mirrored=`registry.fly.io/${app}@${observedDigest}`;
 const run=(program,args,input)=>command(program,args,{encoding:'utf8',stdio:['pipe','pipe','pipe'],env,input,timeout:180000,maxBuffer:8*1024*1024}).trim();
 try {
  run('docker',['login','ghcr.io','--username',env.GITHUB_ACTOR,'--password-stdin'],env.GITHUB_TOKEN);
  run('flyctl',['auth','docker']);
  run('docker',['pull',accepted]);run('docker',['pull',mirrored]);
  const acceptedConfigId=run('docker',['image','inspect','--format={{.Id}}',accepted]);
  const observedConfigId=run('docker',['image','inspect','--format={{.Id}}',mirrored]);
  requireThat(/^sha256:[0-9a-f]{64}$/.test(acceptedConfigId)&&observedConfigId===acceptedConfigId,'worker_image_digest');
  return {acceptedDigest:CANARY.workerDigest,observedDigest,acceptedConfigId,observedConfigId};
 } catch {throw Error('packet_canary_worker_image_equivalence_unproven');}
}
