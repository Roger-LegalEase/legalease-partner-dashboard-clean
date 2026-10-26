import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {realLaunchOrigin,realLaunchLeaseActive,acceptancePreviewLaunchBinding,realLaunchSourceBound,realVerificationToken,acceptsRealVerification}=await import('../src/lib/partners/onboarding/real-launch-security.ts');
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

// Synthetic identifiers exercise the release parser; they confer no real operator or program authority.
const previewBinding={schema:'rcap-partner-acceptance-launch/v1',applicationSha:sha,projectId:'prj_cdgwGzFqIHgEUlzEburSLaZETdQV',supabaseProjectRef:'hyflxnlhpmiqxvvcoiia',partnerSlug:'legalease-ordinary-qa-20261024',adminAuthUserId:'11111111-1111-4111-8111-111111111111'};
const preview={VERCEL:'1',VERCEL_ENV:'preview',VERCEL_AUTOMATION_BYPASS_SECRET:'synthetic-existing-bypass',VERCEL_PROJECT_ID:previewBinding.projectId,VERCEL_DEPLOYMENT_ID:'dpl_SyntheticPreviewA',VERCEL_URL:'synthetic-owned-preview.vercel.app',VERCEL_GIT_COMMIT_SHA:sha,NEXT_PUBLIC_RCAP_BUILD_SHA:sha,SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co',NEXT_PUBLIC_SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co',RCAP_PARTNER_LAUNCH_ENABLED:'true',RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION:JSON.stringify(previewBinding)};
const previewContext={partnerSlug:previewBinding.partnerSlug,authUserId:previewBinding.adminAuthUserId,role:'internal_admin'};
assert.equal(realLaunchOrigin(preview,previewContext),'https://synthetic-owned-preview.vercel.app');
assert.equal(realLaunchOrigin(preview),null,'Source identity alone cannot authorize a launch caller');
assert.equal(realLaunchSourceBound(preview),true);
for(const patch of [{role:'partner_admin'},{partnerSlug:'another-tenant'},{authUserId:'22222222-2222-4222-8222-222222222222'}])assert.equal(realLaunchOrigin(preview,{...previewContext,...patch}),null);
for(const patch of [{VERCEL_AUTOMATION_BYPASS_SECRET:''},{VERCEL_AUTOMATION_BYPASS_SECRET:'invalid\r\nheader'},{VERCEL:'0'},{VERCEL_ENV:'production'},{VERCEL_PROJECT_ID:'prj_Other'},{VERCEL_DEPLOYMENT_ID:''},{VERCEL_DEPLOYMENT_ID:'not-a-deployment'},{VERCEL_URL:'expungement.ai'},{VERCEL_URL:'attacker.test'},{VERCEL_URL:'evil.vercel.app/path'},{VERCEL_URL:'user@owned.vercel.app'},{VERCEL_URL:'owned.vercel.app:443'},{VERCEL_GIT_COMMIT_SHA:'b'.repeat(40)},{NEXT_PUBLIC_RCAP_BUILD_SHA:'b'.repeat(40)},{SUPABASE_URL:'https://production.supabase.co'},{NEXT_PUBLIC_SUPABASE_URL:'https://production.supabase.co'},{RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN:'https://expungement.ai'},{RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN:'https://another-preview.vercel.app'},{RCAP_PARTNER_LAUNCH_ENABLED:'false'},{RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION:''},{RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION:'generic QA override'},{RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION:'{}'}]){
 assert.equal(realLaunchOrigin({...preview,...patch},previewContext),null);assert.equal(acceptancePreviewLaunchBinding({...preview,...patch}),null);
}
for(const key of Object.keys(previewBinding))assert.equal(acceptancePreviewLaunchBinding({...preview,RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION:JSON.stringify({...previewBinding,[key]:'wrong'})}),null,key);
assert.equal(acceptancePreviewLaunchBinding({...preview,RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION:JSON.stringify({...previewBinding,extra:true})}),null);
assert.equal(realLaunchOrigin({...preview,RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN:'https://synthetic-owned-preview.vercel.app'},previewContext),'https://synthetic-owned-preview.vercel.app');
const tokenEnv={...preview,SUPABASE_SERVICE_ROLE_KEY:'synthetic-service-only-key'},oldEnv=Object.fromEntries(Object.keys({...tokenEnv,...prod}).map(key=>[key,process.env[key]]));
try{
 Object.assign(process.env,tokenEnv);
 const token=realVerificationToken(previewContext.partnerSlug,'operation-A');assert.match(token,/^[a-f0-9]{64}$/);
 assert.equal(acceptsRealVerification(previewContext.partnerSlug,'operation-A',token),true);
 assert.equal(acceptsRealVerification(previewContext.partnerSlug,'operation-B',token),false);
 assert.equal(realVerificationToken('another-tenant','operation-A'),'');
 process.env.VERCEL_DEPLOYMENT_ID='dpl_SyntheticPreviewB';assert.equal(acceptsRealVerification(previewContext.partnerSlug,'operation-A',token),false);
 Object.assign(process.env,prod);
 const {createHmac}=await import('node:crypto');
 assert.equal(realVerificationToken('production-partner','operation-A'),createHmac('sha256',tokenEnv.SUPABASE_SERVICE_ROLE_KEY).update('rcap-real-staged:production-partner:operation-A').digest('hex'),'Production token bytes remain unchanged');
}finally{for(const [key,value]of Object.entries(oldEnv))if(value===undefined)delete process.env[key];else process.env[key]=value;}
console.log('Exact Acceptance Preview source/project/database/tenant/admin binding and deployment-scoped HMAC assertions PASS; Production and loopback controls retained.');

const {execFileSync}=await import('node:child_process');
execFileSync(process.execPath,['scripts/test-rcap-acceptance-preview-launch.mjs'],{stdio:'inherit'});
