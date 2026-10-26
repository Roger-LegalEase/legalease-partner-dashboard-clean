import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL(process.env.CLINIC_ENV_SOURCE || './rcap-hosted-acceptance-deploy.mjs',import.meta.url),'utf8');
const scope='e7c1d76e-dcf2-4d41-b585-ba164806f391,255998e1-eb69-4239-b151-0f8b8935a539';
const closed=['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','STRIPE_LEGACY_WEBHOOK_SECRET','STRIPE_CONSUMER_PACKET_PRODUCT_ID','OPENAI_API_KEY','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','EXPUNGEMENT_EMAIL_PROVIDER','PARTNER_EMAIL_PROVIDER','RESEND_API_KEY','INTERNAL_ADMIN_ACCESS_TOKEN','LEGALEASE_OS_EVENTS_ENDPOINT'];
const privateKeys=['SUPABASE_SERVICE_ROLE_KEY','LEGAL_AID_RESTRICTED_FIELD_KEY','LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION','PARTICIPANT_PRIVACY_PSEUDONYM_SECRET'];
function actual({isolated=true,phase='clinic_deploy',configured=null}={}) {
  const processEnv=Object.fromEntries([...closed,...privateKeys].map(k=>[k,'INHERITED_PRIVATE_CANARY']));
  Object.assign(processEnv,{PHASE_INPUT:phase,HOSTED_STRIPE_TEST_SECRET:isolated?'':'sk_test_synthetic',HOSTED_STRIPE_TEST_WEBHOOK_SECRET:isolated?'':'whsec_synthetic'});
  const context={MANAGED_START:null,ISOLATED_CLINIC_PREVIEW:isolated,ROUTE_STATE:phase==='replace_preview'?'':'staging_scoped',SCOPE_IDS:scope,CLINIC_DEMO_MODE:isolated?'mississippi_preview':'',
    RETURN_ORIGIN:'https://legalease-rcap-clinic-4feb8e94b3de-roger947s-projects.vercel.app',SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co',
    keys:{anon:'synthetic-anon',service:'EXISTING_PRIVATE_SERVICE'},PRESERVED_DATA_KEYS:{LEGAL_AID_RESTRICTED_FIELD_KEY:'EXISTING_PRIVATE_DATA',LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION:'v1',PARTICIPANT_PRIVACY_PSEUDONYM_SECRET:'EXISTING_PRIVATE_PSEUDONYM'},
    CATALOG_PRODUCT_ID:isolated?'':'prod_synthetic',LEGAL_AID_EMAIL:null,configuredSandboxEnv:configured,process:{env:processEnv}};
  const start=source.indexOf('const closedPreviewEnv ='),end=source.indexOf('// A live Stripe key',start);
  assert(start>=0&&end>start);
  return JSON.parse(vm.runInNewContext(source.slice(start,end)+'\nJSON.stringify({runtimeEnv,buildEnv});',context));
}
test('actual isolated runtime preserves exact three sponsored keys and private continuity bindings',()=>{
  const {runtimeEnv:r}=actual();
  assert.equal(r.RCAP_CONSUMER_DELIVERY_ROUTE_STATE,'staging_scoped');assert.equal(r.RCAP_CONSUMER_DELIVERY_STAGING_SCOPE,scope);assert.equal(r.RCAP_SPONSORED_PREVIEW_CHANNEL,'mississippi_preview');
  assert.equal(r.SUPABASE_SERVICE_ROLE_KEY,'EXISTING_PRIVATE_SERVICE');assert.equal(r.LEGAL_AID_RESTRICTED_FIELD_KEY,'EXISTING_PRIVATE_DATA');assert.equal(r.LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION,'v1');assert.equal(r.PARTICIPANT_PRIVACY_PSEUDONYM_SECRET,'EXISTING_PRIVATE_PSEUDONYM');
});
test('actual request maps suppress inherited outbound configuration at runtime and build',()=>{
  const {runtimeEnv,buildEnv}=actual();
  for(const map of [runtimeEnv,buildEnv]) {
    for(const key of closed)assert.equal({...{[key]:'INHERITED_PRIVATE_CANARY'},...map}[key],'',key);
    for(const key of ['ENABLE_PARTNER_EMAIL_DELIVERY','LEGALEASE_OS_EVENTS_ENABLED'])assert.equal(map[key],'false',key);
  }
});
test('actual isolated build blanks private data and service-role bindings',()=>{
  const {buildEnv}=actual();
  for(const key of privateKeys)assert.equal(buildEnv[key],'',key);
  assert.equal(buildEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,'synthetic-anon');
  assert(!JSON.stringify(buildEnv).includes('PRIVATE'));
});
test('ordinary, replacement and configured Sandbox phases retain their existing environment semantics',()=>{
  const ordinary=actual({isolated:false});assert.equal(ordinary.runtimeEnv.STRIPE_SECRET_KEY,'sk_test_synthetic');assert.equal(ordinary.runtimeEnv.STRIPE_CONSUMER_PACKET_PRODUCT_ID,'prod_synthetic');assert.equal(ordinary.runtimeEnv.RCAP_SPONSORED_PREVIEW_CHANNEL,undefined);
  const replacement=actual({isolated:false,phase:'replace_preview'});assert.equal(replacement.runtimeEnv.RCAP_CONSUMER_DELIVERY_ROUTE_STATE,'disabled');assert.equal(replacement.runtimeEnv.RCAP_CONSUMER_DELIVERY_STAGING_SCOPE,'');assert.equal(replacement.runtimeEnv.RCAP_SPONSORED_PREVIEW_CHANNEL,'');assert.equal(replacement.runtimeEnv.STRIPE_SECRET_KEY,'');assert.equal(replacement.buildEnv.SUPABASE_SERVICE_ROLE_KEY,'');
  const configured=actual({isolated:false,phase:'configured_sandbox_preview',configured:{runtime:{STRIPE_SECRET_KEY:'sk_test_configured',RCAP_CONSUMER_DELIVERY_STAGING_SCOPE:'configured-existing-owner'},build:{SUPABASE_SERVICE_ROLE_KEY:''}}});assert.equal(configured.runtimeEnv.STRIPE_SECRET_KEY,'sk_test_configured');assert.equal(configured.runtimeEnv.RCAP_CONSUMER_DELIVERY_STAGING_SCOPE,'configured-existing-owner');assert.equal(configured.buildEnv.SUPABASE_SERVICE_ROLE_KEY,'');
});
