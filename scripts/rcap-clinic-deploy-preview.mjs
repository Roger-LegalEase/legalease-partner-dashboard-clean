import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {assertPurposePreviewRelease,preserveConfiguredSandboxKeys,CLINIC_PURPOSE,CLINIC_SCOPE} from './rcap-configured-sandbox-preview-contract.mjs';
import {requireClinicDeployPreviewAdmission} from './grade-a-launch-control/require-preview-preparation.mjs';
const args=process.argv.slice(2);if(args.length&&!(args.length===1&&args[0]==='--verify'))throw Error('Clinic Preview accepts only --verify or no arguments');
const env=process.env,head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const release=requireClinicDeployPreviewAdmission(process.cwd(),{phase:env.PHASE_INPUT,applicationSha:env.APPLICATION_SHA_INPUT,workerSourceSha:env.WORKER_SOURCE_SHA_INPUT,workerDigest:env.WORKER_DIGEST_INPUT,toolsSha:env.TOOLS_SHA_INPUT,workflowSourceSha:env.RCAP_ADMITTED_CONTROLLER_SHA});
assertPurposePreviewRelease(release,env,head,CLINIC_PURPOSE);
const bytes=execFileSync('git',['show',release.applicationSha+':data/record-clearing/legal-decisions/2026-10-23-ms-nonconv-sponsored-preview.json']);
assert.equal(createHash('sha256').update(bytes).digest('hex'),'8c8c7b190724fdd52851ce0c1499bc8cb1be3947da0a47fc81c58e27ce379355');const grant=JSON.parse(bytes);
assert.equal(grant.approved,true);assert.equal(grant.acceptanceProjectRef,'hyflxnlhpmiqxvvcoiia');assert.equal(grant.participantUserIds.join(','),CLINIC_SCOPE);assert.equal(grant.channel,'mississippi_preview');assert.equal(grant.partnerSlug,'mvl-demo');assert.equal(grant.eventId,'77000000-0000-4000-8000-000000000055');
for(const key of ['productionAuthorized','publicLaunchAuthorized','liveConsumerPaymentAuthorized','hostedFullAuthorized'])assert.equal(grant[key],false);
if(args[0]==='--verify')console.log('Exact native HELD Clinic Preview tuple and existing grant verified; no provider operation.');
else{
 for(const key of ['HOSTED_STRIPE_TEST_SECRET','HOSTED_STRIPE_TEST_WEBHOOK_SECRET','HOSTED_STRIPE_CATALOG_PRODUCT_ID','HOSTED_LEGAL_AID_RESEND_API_KEY','HOSTED_LEGAL_AID_EMAIL_FROM','HOSTED_LEGAL_AID_TEST_MAILBOX'])assert(!env[key],'Clinic cannot acquire payment/email capability');
 Object.assign(env,{HOSTED_APPLICATION_SHA:release.applicationSha,HOSTED_ROUTE_STATE:grant.routeState,HOSTED_STAGING_SCOPE:CLINIC_SCOPE,HOSTED_EXISTING_PARTICIPANT_ONLY:'true',HOSTED_CLINIC_DEMO_MODE:grant.channel,HOSTED_ISOLATED_CLINIC_PREVIEW:'true'});
 Object.assign(env,preserveConfiguredSandboxKeys(env));await import('./rcap-hosted-acceptance-deploy.mjs');
}
