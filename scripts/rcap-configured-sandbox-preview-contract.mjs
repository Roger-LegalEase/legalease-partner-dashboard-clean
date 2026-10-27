import assert from 'node:assert/strict';
import {createHmac,createHash} from 'node:crypto';

export const CONFIGURED_SANDBOX_PHASE='configured_sandbox_preview';
export const CONFIGURED_SANDBOX_TUPLE=Object.freeze({
 applicationSha:'4feb8e94b3dee4085fe05ea75d78853fe21e5097',
 workerSourceSha:'16908485a94f475448657cea90583a4d352da9a3',
 workerDigest:'sha256:4f8c71c3630e6c110427d111518be149f3c74d46c856633fc5536a8065bc17af',
 toolsSha:'98f89f0db0bcb60088341c35595a072edd9031a4'
});
export const CONFIGURED_SANDBOX_OWNER='b6dc86a3-12bb-490d-b130-48d95d426a1e';
export const CONFIGURED_SANDBOX_PRODUCT='prod_VHEHkvH7dSvGv7';
export const CONFIGURED_SANDBOX_PROJECT='hyflxnlhpmiqxvvcoiia';

export function assertConfiguredSandboxRelease(release,env,headSha){
 assert.equal(env.GITHUB_ACTIONS,'true','Configured Preview requires the reviewed runner');
 assert.equal(env.GITHUB_EVENT_NAME,'workflow_dispatch');
 assert.equal(env.GITHUB_RUN_ATTEMPT,'1','Configured Preview is one attempt, not an automatic retry');
 assert.match(headSha,/^[a-f0-9]{40}$/);
 assert.equal(env.GITHUB_SHA,headSha,'Exact checked-out execution head required');
 for(const [key,input]of Object.entries({applicationSha:'APPLICATION_SHA_INPUT',workerSourceSha:'WORKER_SOURCE_SHA_INPUT',workerDigest:'WORKER_DIGEST_INPUT',toolsSha:'TOOLS_SHA_INPUT'})){
   assert.equal(release[key],CONFIGURED_SANDBOX_TUPLE[key],'Frozen configured Preview tuple required');
   assert.equal(env[input],release[key],'Configured Preview input must match CURRENT binding');
 }
 assert.equal(env.ACCEPTANCE_SUPABASE_PROJECT_REF,CONFIGURED_SANDBOX_PROJECT);
 assert.equal(release.runtimeAccepted,true);
 assert.equal(release.workerRebuildRequired,false);
 assert.equal(release.productionAuthorized,false);
 assert.equal(release.hostedAdmission?.schemaVersion,'rcap-readonly-successor-admission/v3');
 assert.equal(release.hostedAdmission.previewCreation?.runId,40057159400);
 // The existing CURRENT verifier binds later control bytes through closureControl.
 // toolsSha remains the frozen application tool tuple, not the execution head.
 assert.match(release.closureControl?.sourceSha??'',/^[a-f0-9]{40}$/);
}

const closed={
 RCAP_PARTNER_ONBOARDING_ENABLED:'true',RCAP_CONSUMER_DELIVERY_ROUTE_STATE:'disabled',RCAP_CONSUMER_DELIVERY_STAGING_SCOPE:'',RCAP_SPONSORED_PREVIEW_CHANNEL:'',
 STRIPE_SECRET_KEY:'',STRIPE_WEBHOOK_SECRET:'',STRIPE_LEGACY_WEBHOOK_SECRET:'',OPENAI_API_KEY:'',UPSTASH_REDIS_REST_URL:'',UPSTASH_REDIS_REST_TOKEN:'',
 ENABLE_PARTNER_EMAIL_DELIVERY:'false',EXPUNGEMENT_EMAIL_PROVIDER:'',RESEND_API_KEY:'',INTERNAL_ADMIN_ACCESS_TOKEN:'',LEGALEASE_OS_EVENTS_ENABLED:'false',LEGALEASE_OS_EVENTS_ENDPOINT:''
};
export function configuredSandboxOverrides(env){
 assert.equal(env.HOSTED_ROUTE_STATE,'staging_scoped');
 assert.equal(env.HOSTED_STAGING_SCOPE,CONFIGURED_SANDBOX_OWNER);
 assert.equal(env.HOSTED_EXISTING_PARTICIPANT_ONLY,'true');
 assert(!env.HOSTED_CLINIC_DEMO_MODE&&env.HOSTED_ISOLATED_CLINIC_PREVIEW!=='true');
 assert(!env.HOSTED_LEGAL_AID_RESEND_API_KEY&&!env.HOSTED_LEGAL_AID_EMAIL_FROM&&!env.HOSTED_LEGAL_AID_TEST_MAILBOX);
 assert(/^sk_test_[^\s]+$/.test(env.HOSTED_STRIPE_TEST_SECRET??''),'Existing Stripe test key required');
 assert(/^whsec_[^\s]+$/.test(env.HOSTED_STRIPE_TEST_WEBHOOK_SECRET??''),'Existing test webhook secret required');
 assert.equal(env.HOSTED_STRIPE_CATALOG_PRODUCT_ID,CONFIGURED_SANDBOX_PRODUCT);
 return {
   runtime:{...closed,RCAP_CONSUMER_DELIVERY_ROUTE_STATE:'staging_scoped',RCAP_CONSUMER_DELIVERY_STAGING_SCOPE:CONFIGURED_SANDBOX_OWNER,STRIPE_SECRET_KEY:env.HOSTED_STRIPE_TEST_SECRET,STRIPE_WEBHOOK_SECRET:env.HOSTED_STRIPE_TEST_WEBHOOK_SECRET,STRIPE_CONSUMER_PACKET_PRODUCT_ID:CONFIGURED_SANDBOX_PRODUCT},
   build:{...closed,SUPABASE_URL:`https://${CONFIGURED_SANDBOX_PROJECT}.supabase.co`,SUPABASE_SERVICE_ROLE_KEY:'',LEGAL_AID_RESTRICTED_FIELD_KEY:'',LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION:'',PARTICIPANT_PRIVACY_PSEUDONYM_SECRET:''}
 };
}

export function preserveConfiguredSandboxKeys(env){
 const names=['HOSTED_LEGAL_AID_RESTRICTED_FIELD_KEY','HOSTED_LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION','HOSTED_PARTICIPANT_PRIVACY_PSEUDONYM_SECRET'];
 const present=names.filter(name=>env[name]).length;
 assert(present===0||present===names.length,'Complete preserved Acceptance key inputs required');
 if(present)return Object.fromEntries(names.map(name=>[name,env[name]]));
 const password=env.HOSTED_CLINIC_DEMO_PASSWORD??'';
 assert(password.length>=20,'Existing Acceptance continuity credential required');
 // Exact DS-08 continuity derivation already used by the closed Preview workflow.
 return {
   [names[0]]:createHmac('sha256',password).update('rcap-acceptance-server-secret:hyflxnlhpmiqxvvcoiia:legal-aid-restricted-field-key/v1').digest('base64'),
   [names[1]]:'v1',
   [names[2]]:createHmac('sha256',password).update('rcap-acceptance-server-secret:hyflxnlhpmiqxvvcoiia:participant-privacy-pseudonym-secret/v1').digest('base64url')
 };
}

// These purposes use the existing native HELD lane; they do not make the
// candidate CURRENT or authorize payments, claims or production operations.
export const CURRENT_PURPOSE_TUPLE=Object.freeze({applicationSha:'c0052e13d9801d24080275aab02c70c6ea213fa3',workerSourceSha:'32499751569359315248c2048fa111064a47c67f',workerDigest:'sha256:cd0d3ab9098ed47028d5d89ae5280904520f28bc7331fc9ca17b2a2978a3f494',workerInputFingerprint:'sha256:6e3d8a6ed5390effb3945085ac6159016e806f19ada509ee36f6fc0c06efcea0'});
export const CURRENT_ORDINARY_PREVIEW=Object.freeze({id:'dpl_7dmD2g1xZccLiTbkJL9Xp3wCrWyF',hostname:'legalease-partner-dashboard-clean-6f0r4rwo0-roger947s-projects.vercel.app'});
export const CLINIC_PURPOSE='clinic_deploy';
export const CLINIC_SCOPE='e7c1d76e-dcf2-4d41-b585-ba164806f391,255998e1-eb69-4239-b151-0f8b8935a539';
export function assertPurposePreviewRelease(release,env,head,phase){
 assert([CONFIGURED_SANDBOX_PHASE,CLINIC_PURPOSE,'configured_sandbox_preview_recover'].includes(phase));
 assert.equal(env.PHASE_INPUT,phase);assert.equal(env.GITHUB_ACTIONS,'true');assert.equal(env.GITHUB_EVENT_NAME,'workflow_dispatch');assert.equal(env.GITHUB_RUN_ATTEMPT,'1');
 assert.equal(env.GITHUB_REF_NAME,'codex/f-vercel-raw-readonly-20261026');assert.match(env.GITHUB_SHA??'',/^[a-f0-9]{40}$/);assert.equal(env.GITHUB_WORKFLOW_SHA,env.GITHUB_SHA);
 assert.equal(env.RCAP_ADMITTED_CONTROLLER_SHA,head,'actual admitted-controller checkout must be pinned independently of the real carrier SHA');
 for(const [key,value]of Object.entries(CURRENT_PURPOSE_TUPLE))assert.equal(release[key],value);
 for(const [key,name]of Object.entries({applicationSha:'APPLICATION_SHA_INPUT',workerSourceSha:'WORKER_SOURCE_SHA_INPUT',workerDigest:'WORKER_DIGEST_INPUT',toolsSha:'TOOLS_SHA_INPUT'}))assert.equal(env[name],release[key]);
 assert.equal(env.ACCEPTANCE_SUPABASE_PROJECT_REF,CONFIGURED_SANDBOX_PROJECT);assert.equal(release.current,false);assert.equal(release.previewOnly,true);assert.equal(release.productionAuthorized,false);assert.equal(release.deploymentAuthorized,false);
}
export function currentPurposeMetadata(phase,origin){
 assert([CONFIGURED_SANDBOX_PHASE,CLINIC_PURPOSE,'managed_start_preview'].includes(phase));
 const configured=phase===CONFIGURED_SANDBOX_PHASE,clinic=phase===CLINIC_PURPOSE;
 const scope=clinic?CLINIC_SCOPE:CONFIGURED_SANDBOX_OWNER;
 return {rcapWorkerSourceSha:CURRENT_PURPOSE_TUPLE.workerSourceSha,rcapWorkerDigest:CURRENT_PURPOSE_TUPLE.workerDigest,rcapWorkerInputFingerprint:CURRENT_PURPOSE_TUPLE.workerInputFingerprint,
  rcapApplicationSha:CURRENT_PURPOSE_TUPLE.applicationSha,rcapAcceptanceProjectRef:CONFIGURED_SANDBOX_PROJECT,rcapPreviewPurpose:clinic?'mississippi_clinic':configured?'none':'managed_start',
  rcapClinicDemoMode:clinic?'mississippi_preview':'none',rcapRouteState:'staging_scoped',rcapStagingScopeSha256:createHash('sha256').update(scope).digest('hex'),rcapReturnOrigin:origin,
  rcapStripeConfigured:configured?'true':'false',rcapCatalogProduct:configured?CONFIGURED_SANDBOX_PRODUCT:'inline',
  ...(configured?{rcapConfiguredSandbox:'true'}:{}),...(!configured&&!clinic?{rcapOrdinaryGrantSha256:'9db1864b330945e3307a430a013328f9ec5a00ccfb2dee2bfec68dab8a780e40',rcapSponsoredChannel:'mississippi_preview'}:{})};
}
// Full readback only: these classifications cannot authorize a payment or
// establish key continuity. Unknown/partial/same-source attempts hold creation.
export function classifyCurrentPurposeDeployment(d,projectId,originFor){
 assert.equal(d?.projectId,projectId,'PURPOSE_PROJECT_MISMATCH');assert.equal(d.gitSource?.sha,CURRENT_PURPOSE_TUPLE.applicationSha,'PURPOSE_SOURCE_MISMATCH');
 assert(Object.hasOwn(d,'target')&&(d.target===null||d.target==='preview'),'PURPOSE_NOT_PREVIEW');assert.match(d.id??'',/^dpl_[A-Za-z0-9]+$/);assert.match(d.url??'',/^[a-z0-9-]+\.vercel\.app$/);
 const purpose=d.meta?.rcapPreviewPurpose;
 const phase=purpose==='managed_start'?'managed_start_preview':purpose==='mississippi_clinic'?CLINIC_PURPOSE:purpose==='none'&&d.meta?.rcapConfiguredSandbox==='true'?CONFIGURED_SANDBOX_PHASE:null;
 assert(phase,'PURPOSE_UNKNOWN_CURRENT_APP_ATTEMPT');
 if(phase==='managed_start_preview'){assert.equal(d.id,CURRENT_ORDINARY_PREVIEW.id,'PURPOSE_UNRECONCILED_MANAGED_SIBLING');assert.equal(d.url,CURRENT_ORDINARY_PREVIEW.hostname);}
 const origin=originFor(CURRENT_PURPOSE_TUPLE.applicationSha,phase===CLINIC_PURPOSE?'mississippi_clinic':phase==='managed_start_preview'?'managed_start':'none');
 const expected=currentPurposeMetadata(phase,origin);for(const [key,value]of Object.entries(expected))assert.equal(d.meta?.[key],value,'PURPOSE_METADATA_MISMATCH:'+key);
 assert.equal(d.readyState,'READY','PURPOSE_PRIOR_ATTEMPT_NOT_READY');
 return {phase,id:d.id,url:d.url,readyState:d.readyState,meta:expected};
}

// This endpoint's sourceBound flag is ordinary-admin launch authority, not consumer source identity.
export function assertPurposeRuntimeIdentity({status,body,applicationSha,adminLaunch}){
 assert.equal(typeof adminLaunch,'boolean');assert(body&&typeof body==='object'&&!Array.isArray(body));assert.equal(body.application,'RCAP 2.0');assert.equal(body.policyVersion,'rcap2.2');assert.equal(body.buildSha,applicationSha);assert.equal(body.runtimeSha,applicationSha);
 assert.equal(status,adminLaunch?200:503);assert.equal(body.sourceBound,adminLaunch);
 return {runtimeSourceIdentityVerified:true,adminLaunchSourceBound:body.sourceBound};
}
