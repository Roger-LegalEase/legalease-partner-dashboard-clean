import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertConfiguredSandboxRelease,configuredSandboxOverrides,preserveConfiguredSandboxKeys,CONFIGURED_SANDBOX_TUPLE,CONFIGURED_SANDBOX_OWNER,CONFIGURED_SANDBOX_PRODUCT,CONFIGURED_SANDBOX_PROJECT} from './rcap-configured-sandbox-preview-contract.mjs';

const head='a'.repeat(40);
const release={...CONFIGURED_SANDBOX_TUPLE,runtimeAccepted:true,workerRebuildRequired:false,productionAuthorized:false,closureControl:{sourceSha:'b'.repeat(40)},hostedAdmission:{schemaVersion:'rcap-readonly-successor-admission/v3',previewCreation:{runId:40057159400}}};
const inputs={GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:head,ACCEPTANCE_SUPABASE_PROJECT_REF:CONFIGURED_SANDBOX_PROJECT,APPLICATION_SHA_INPUT:release.applicationSha,WORKER_SOURCE_SHA_INPUT:release.workerSourceSha,WORKER_DIGEST_INPUT:release.workerDigest,TOOLS_SHA_INPUT:release.toolsSha};
const env={HOSTED_ROUTE_STATE:'staging_scoped',HOSTED_STAGING_SCOPE:CONFIGURED_SANDBOX_OWNER,HOSTED_EXISTING_PARTICIPANT_ONLY:'true',HOSTED_STRIPE_TEST_SECRET:'sk_test_SYNTHETIC_PRIVATE_CANARY',HOSTED_STRIPE_TEST_WEBHOOK_SECRET:'whsec_SYNTHETIC_PRIVATE_CANARY',HOSTED_STRIPE_CATALOG_PRODUCT_ID:CONFIGURED_SANDBOX_PRODUCT};

test('frozen tools identity and later reviewed execution head are distinct and both checked',()=>{
 assert.notEqual(release.toolsSha,head);
 assert.doesNotThrow(()=>assertConfiguredSandboxRelease(release,inputs,head));
 for(const changed of [{GITHUB_SHA:'c'.repeat(40)},{TOOLS_SHA_INPUT:head},{APPLICATION_SHA_INPUT:'d'.repeat(40)},{WORKER_DIGEST_INPUT:'sha256:'+'e'.repeat(64)},{ACCEPTANCE_SUPABASE_PROJECT_REF:'wwtwtsmywnckfkdaqqeg'},{GITHUB_ACTIONS:'false'},{GITHUB_EVENT_NAME:'push'},{GITHUB_RUN_ATTEMPT:'2'}])assert.throws(()=>assertConfiguredSandboxRelease(release,{...inputs,...changed},head));
});
test('HELD admission, unaccepted worker and future application do not gain configured deployment authority',()=>{
 for(const changed of [{hostedAdmission:null},{hostedAdmission:{schemaVersion:'unverified'}},{runtimeAccepted:false},{workerRebuildRequired:true},{productionAuthorized:true},{applicationSha:'8'.repeat(40)},{closureControl:null}])assert.throws(()=>assertConfiguredSandboxRelease({...release,...changed},inputs,head));
});
test('only exact existing owner and server-only test Stripe inputs open; build and other outbound inputs stay closed',()=>{
 const {runtime,build}=configuredSandboxOverrides(env);
 assert.equal(runtime.RCAP_CONSUMER_DELIVERY_ROUTE_STATE,'staging_scoped');assert.equal(runtime.RCAP_CONSUMER_DELIVERY_STAGING_SCOPE,CONFIGURED_SANDBOX_OWNER);
 assert.equal(runtime.STRIPE_SECRET_KEY,env.HOSTED_STRIPE_TEST_SECRET);assert.equal(runtime.STRIPE_WEBHOOK_SECRET,env.HOSTED_STRIPE_TEST_WEBHOOK_SECRET);
 assert.equal(build.SUPABASE_URL,'https://hyflxnlhpmiqxvvcoiia.supabase.co');
 for(const key of ['SUPABASE_SERVICE_ROLE_KEY','LEGAL_AID_RESTRICTED_FIELD_KEY','LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION','PARTICIPANT_PRIVACY_PSEUDONYM_SECRET','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET'])assert.equal(build[key],'');
 for(const map of [runtime,build])for(const key of ['OPENAI_API_KEY','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','STRIPE_LEGACY_WEBHOOK_SECRET','RCAP_SPONSORED_PREVIEW_CHANNEL','RESEND_API_KEY','INTERNAL_ADMIN_ACCESS_TOKEN','LEGALEASE_OS_EVENTS_ENDPOINT'])assert.equal(map[key],'');
 assert(!JSON.stringify(build).includes('PRIVATE_CANARY'));
});
test('live/missing secrets, broad owner lists, Clinic/email and wrong catalog refuse before deployment',()=>{
 for(const changed of [{HOSTED_STRIPE_TEST_SECRET:'sk_live_SYNTHETIC'},{HOSTED_STRIPE_TEST_SECRET:''},{HOSTED_STRIPE_TEST_WEBHOOK_SECRET:''},{HOSTED_STAGING_SCOPE:CONFIGURED_SANDBOX_OWNER+',extra-owner'},{HOSTED_EXISTING_PARTICIPANT_ONLY:'false'},{HOSTED_CLINIC_DEMO_MODE:'mississippi_preview'},{HOSTED_ISOLATED_CLINIC_PREVIEW:'true'},{HOSTED_LEGAL_AID_RESEND_API_KEY:'SYNTHETIC'},{HOSTED_STRIPE_CATALOG_PRODUCT_ID:'prod_other'}])assert.throws(()=>configuredSandboxOverrides({...env,...changed}));
});
test('existing DS-08 continuity bytes are preserved with no fresh key generation',()=>{
 const names=['HOSTED_LEGAL_AID_RESTRICTED_FIELD_KEY','HOSTED_LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION','HOSTED_PARTICIPANT_PRIVACY_PSEUDONYM_SECRET'];
 const explicit=Object.fromEntries(names.map((name,i)=>[name,'EXISTING_SYNTHETIC_'+i]));assert.deepEqual(preserveConfiguredSandboxKeys(explicit),explicit);
 assert.deepEqual(preserveConfiguredSandboxKeys({HOSTED_CLINIC_DEMO_PASSWORD:'SYNTHETIC_ACCEPTANCE_PASSWORD_20261024'}),{[names[0]]:'4c0Y3KRFratR9Uyd1W0ccUfjIw6hO/XzTKyn/9ZUJzg=',[names[1]]:'v1',[names[2]]:'RLQWq2PqvzTaWpZnCsAxSy1VWaBWEvg_7gVAmPhIW-8'});
 assert.throws(()=>preserveConfiguredSandboxKeys({[names[0]]:'ONLY_ONE'}));assert.throws(()=>preserveConfiguredSandboxKeys({HOSTED_CLINIC_DEMO_PASSWORD:'short'}));
});
test('dedicated workflow job cannot schedule payment, worker, fixtures, migrations or runner build',()=>{
 const workflow=fs.readFileSync(new URL('../.github/workflows/rcap-f1-ephemeral-staging.yml',import.meta.url),'utf8');
 const job=workflow.split('  configured_sandbox_preview:\n')[1]?.split('  successor_nonproduction_closure:\n')[0];assert(job);
 assert.match(job,/if: inputs.mode == 'configured_sandbox_preview'/);
 assert(job.indexOf('rcap-configured-sandbox-preview.mjs --verify')<job.indexOf('HOSTED_STRIPE_TEST_SECRET:'));
 assert(!/npm run build|docker |flyctl|auth-config|stripe-fixtures|acceptance-payment|acceptance-matrix|migrate|webhook-retarget/.test(job));
 assert.match(job,/VERCEL_AUTOMATION_BYPASS_SECRET: \$\{\{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET \}\}/);
 assert.match(job,/ref: \$\{\{ github.sha \}\}/);assert.match(job,/persist-credentials: false/);
 assert.match(job,/productId = 'prod_VHEHkvH7dSvGv7'/);assert.match(job,/method: 'GET'/);assert.match(job,/unit_amount, 5000/);
 assert.match(job,/path: admitted-controller\/hosted-acceptance-evidence\/deploy.json/);
});
