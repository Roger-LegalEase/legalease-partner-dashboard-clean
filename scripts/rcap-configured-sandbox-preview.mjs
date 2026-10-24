import {execFileSync} from 'node:child_process';
import {assertConfiguredSandboxRelease,configuredSandboxOverrides,preserveConfiguredSandboxKeys,CONFIGURED_SANDBOX_PHASE,CONFIGURED_SANDBOX_OWNER,CONFIGURED_SANDBOX_PRODUCT} from './rcap-configured-sandbox-preview-contract.mjs';
import {requireCurrentReleaseCandidate} from './grade-a-launch-control/verify-release-candidate-binding.mjs';

const args=process.argv.slice(2);
if(args.length&&!(args.length===1&&args[0]==='--verify'))throw Error('Configured Preview accepts only --verify or no arguments');
const env=process.env;
const release=requireCurrentReleaseCandidate(process.cwd());
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assertConfiguredSandboxRelease(release,env,head);
if(args[0]==='--verify'){
 console.log('Configured Sandbox Preview CURRENT source and frozen tuple verified; no provider operation.');
}else{
 Object.assign(env,{PHASE_INPUT:CONFIGURED_SANDBOX_PHASE,HOSTED_APPLICATION_SHA:release.applicationSha,HOSTED_ROUTE_STATE:'staging_scoped',HOSTED_STAGING_SCOPE:CONFIGURED_SANDBOX_OWNER,HOSTED_EXISTING_PARTICIPANT_ONLY:'true',HOSTED_STRIPE_CATALOG_PRODUCT_ID:CONFIGURED_SANDBOX_PRODUCT,HOSTED_CLINIC_DEMO_MODE:'',HOSTED_ISOLATED_CLINIC_PREVIEW:'false'});
 configuredSandboxOverrides(env);
 Object.assign(env,preserveConfiguredSandboxKeys(env));
 await import('./rcap-hosted-acceptance-deploy.mjs');
}
