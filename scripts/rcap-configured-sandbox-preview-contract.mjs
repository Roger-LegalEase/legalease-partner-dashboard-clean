import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';

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
