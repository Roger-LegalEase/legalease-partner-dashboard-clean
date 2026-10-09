import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {realLaunchOrigin,realLaunchLeaseActive}=await import('../src/lib/partners/onboarding/real-launch-security.ts');
const {commercialAuthorityValid}=await import('../src/lib/partners/onboarding/commercial-authority.ts');
const sha='a'.repeat(40),prod={VERCEL_ENV:'production',VERCEL_GIT_COMMIT_SHA:sha,RCAP_PARTNER_LAUNCH_ENABLED:'true',RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION:`release:${sha}`,RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN:'https://expungement.ai'};
assert.equal(realLaunchOrigin({}),null);
assert.equal(realLaunchOrigin(prod),'https://expungement.ai');
// A PR head and its merge commit are different release identities. Neither an
// old authorization nor missing CLI Git identity may authorize the merged build.
const mergeSha='c'.repeat(40);
assert.equal(realLaunchOrigin({...prod,VERCEL_GIT_COMMIT_SHA:mergeSha}),null);
assert.equal(realLaunchOrigin({...prod,VERCEL_GIT_COMMIT_SHA:''}),null);
assert.equal(realLaunchOrigin({...prod,VERCEL_GIT_COMMIT_SHA:mergeSha,RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION:`release:${mergeSha}`}),'https://expungement.ai');
for(const patch of [{RCAP_PARTNER_LAUNCH_ENABLED:'false'},{RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION:'generic override'},{RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION:`release:${'b'.repeat(40)}`},{RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN:'https://attacker.test'},{RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN:'http://127.0.0.1:3100',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321'},{RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN:'https://expungement.ai/secret'},{RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN:'https://expungement.ai:8443'},{RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN:'https://user:password@expungement.ai'},{VERCEL_ENV:'preview'}])assert.equal(realLaunchOrigin({...prod,...patch}),null);
assert.equal(realLaunchOrigin({...prod,VERCEL_ENV:'preview',RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN:'http://127.0.0.1:3100',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321'}),'http://127.0.0.1:3100');
const authority={id:'documented-authority',workspace_id:'own-workspace',kind:'verified_paid',document_id:'approved-document',document_hash:'c'.repeat(64),authority_reference:'verified signed contractual reference',expires_at:'2030-01-01T00:00:00Z',access_mode:'open',packet_entitlement_id:'own-current-packet-allocation',actor_auth_user_id:'verified-platform-admin'};
const facts={payment_status:'paid',stripe_payment_intent_id:'pi_fixture',paid_at:'2026-01-01T00:00:00Z',payment_amount:100,qualification_status:'qualified'},now=Date.parse('2026-10-08T00:00:00Z');
assert.equal(commercialAuthorityValid(authority,facts,now),true);
for(const patch of [{payment_status:'unpaid'},{payment_status:'demo_paid'},{stripe_payment_intent_id:null},{paid_at:null},{payment_amount:0},{payment_amount:Infinity},{qualification_status:'pending'}])assert.equal(commercialAuthorityValid(authority,{...facts,...patch},now),false);
for(const patch of [{expires_at:'2026-01-01T00:00:00Z'},{expires_at:'invalid'},{document_id:''},{document_hash:'unknown'},{packet_entitlement_id:''},{authority_reference:'override'},{kind:'internal_override'}])assert.equal(commercialAuthorityValid({...authority,...patch},facts,now),false);
assert.equal(commercialAuthorityValid(null,facts,now),false);
for(const kind of ['sponsored','purchase_order'])assert.equal(commercialAuthorityValid({...authority,kind},{...facts,payment_status:'unpaid',stripe_payment_intent_id:null,paid_at:null,payment_amount:null},now),true);
assert.equal(realLaunchLeaseActive('2026-10-08T00:00:00Z',now),true);
assert.equal(realLaunchLeaseActive('2026-10-07T23:45:00Z',now),false);
assert.equal(realLaunchLeaseActive('2026-10-08T00:01:00Z',now),false);
assert.equal(realLaunchLeaseActive('invalid',now),false);
for(const kind of ['sponsored','purchase_order'])assert.equal(commercialAuthorityValid({...authority,kind},{...facts,payment_status:'demo_paid'},now),false);
console.log('Real-launch release identity and commercial-policy assertions PASS, including post-merge SHA binding. Paid evidence never inferred from demo, sponsorship, or override.');

const {partnerLaunchMaterialsApproved,requiresPartnerLaunchReview}=await import('../src/lib/partners/onboarding/partner-material-policy.ts');
const materials=['implementation_brief','co_branded_page_configuration'].map(artifactType=>({artifactType,sourceFreshness:'current',currentVersion:{approvalStatus:'approved',partnerReviewStatus:'approved'}}));
assert.equal(partnerLaunchMaterialsApproved(materials),true);
assert.equal(partnerLaunchMaterialsApproved(materials.slice(1)),false);
for(const patch of [{sourceFreshness:'stale'},{currentVersion:{approvalStatus:'approved',partnerReviewStatus:'awaiting_partner'}},{currentVersion:{approvalStatus:'pending_review',partnerReviewStatus:'approved'}}])assert.equal(partnerLaunchMaterialsApproved([materials[0],{...materials[1],...patch}]),false);
assert.equal(requiresPartnerLaunchReview('staff_quick_start_guide'),false);
console.log('Required partner material reviews match the real-launch SQL guard; reference materials add no approval ceremony.');
