import {execFileSync} from 'node:child_process';
import {assertPurposePreviewRelease,configuredSandboxOverrides,preserveConfiguredSandboxKeys,CONFIGURED_SANDBOX_PHASE,CONFIGURED_SANDBOX_OWNER,CONFIGURED_SANDBOX_PRODUCT} from './rcap-configured-sandbox-preview-contract.mjs';
import {requireConfiguredSandboxPreviewAdmission} from './grade-a-launch-control/require-preview-preparation.mjs';
const args=process.argv.slice(2);if(args.length&&!(args.length===1&&args[0]==='--verify'))throw Error('Configured Preview accepts only --verify or no arguments');
const env=process.env,head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const release=requireConfiguredSandboxPreviewAdmission(process.cwd(),{phase:env.PHASE_INPUT,applicationSha:env.APPLICATION_SHA_INPUT,workerSourceSha:env.WORKER_SOURCE_SHA_INPUT,workerDigest:env.WORKER_DIGEST_INPUT,toolsSha:env.TOOLS_SHA_INPUT,workflowSourceSha:env.RCAP_ADMITTED_CONTROLLER_SHA});
assertPurposePreviewRelease(release,env,head,CONFIGURED_SANDBOX_PHASE);
if(args[0]==='--verify')console.log('Exact native HELD configured Sandbox Preview tuple verified; no provider operation.');
else{
 Object.assign(env,{HOSTED_APPLICATION_SHA:release.applicationSha,HOSTED_ROUTE_STATE:'staging_scoped',HOSTED_STAGING_SCOPE:CONFIGURED_SANDBOX_OWNER,HOSTED_EXISTING_PARTICIPANT_ONLY:'true',HOSTED_STRIPE_CATALOG_PRODUCT_ID:CONFIGURED_SANDBOX_PRODUCT,HOSTED_CLINIC_DEMO_MODE:'',HOSTED_ISOLATED_CLINIC_PREVIEW:'false'});
 configuredSandboxOverrides(env);Object.assign(env,preserveConfiguredSandboxKeys(env));await import('./rcap-hosted-acceptance-deploy.mjs');
}
