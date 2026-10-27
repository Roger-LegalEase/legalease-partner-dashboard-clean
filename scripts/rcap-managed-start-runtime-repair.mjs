import {execFileSync} from 'node:child_process';
import {preserveConfiguredSandboxKeys} from './rcap-configured-sandbox-preview-contract.mjs';
import {requireManagedStartRuntimeRepairAdmission} from './grade-a-launch-control/require-preview-preparation.mjs';
import {assertManagedRepairRelease,MANAGED_RUNTIME_REPAIR_PHASE} from './rcap-managed-start-runtime-repair-contract.mjs';
const args=process.argv.slice(2);if(args.length&&!(args.length===1&&args[0]==='--verify'))throw Error('Repair accepts --verify or no arguments only');
const env=process.env,head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const release=requireManagedStartRuntimeRepairAdmission(process.cwd(),{phase:env.PHASE_INPUT,applicationSha:env.APPLICATION_SHA_INPUT,workerSourceSha:env.WORKER_SOURCE_SHA_INPUT,workerDigest:env.WORKER_DIGEST_INPUT,toolsSha:env.TOOLS_SHA_INPUT,workflowSourceSha:env.RCAP_ADMITTED_CONTROLLER_SHA});
assertManagedRepairRelease(release,env,head);
if(args[0]==='--verify')console.log('Exact native HELD ordinary runtime repair source verified; no provider operation.');
else{
 Object.assign(env,{HOSTED_APPLICATION_SHA:release.applicationSha,HOSTED_ROUTE_STATE:'staging_scoped',HOSTED_STAGING_SCOPE:'b6dc86a3-12bb-490d-b130-48d95d426a1e',HOSTED_EXISTING_PARTICIPANT_ONLY:'true',HOSTED_ISOLATED_CLINIC_PREVIEW:'false',HOSTED_CLINIC_DEMO_MODE:'',HOSTED_PARTNER_LAUNCH_RELEASE_AUTHORIZATION:JSON.stringify({schema:'rcap-partner-acceptance-launch/v1',applicationSha:release.applicationSha,projectId:'prj_cdgwGzFqIHgEUlzEburSLaZETdQV',supabaseProjectRef:'hyflxnlhpmiqxvvcoiia',partnerSlug:'legalease-ordinary-qa-20261024',adminAuthUserId:'6574d21e-5e0a-4567-b14e-01447c162f37'})});
 if(env.PHASE_INPUT!==MANAGED_RUNTIME_REPAIR_PHASE)throw Error('Wrong repair purpose');
 Object.assign(env,preserveConfiguredSandboxKeys(env));
 await import('./rcap-hosted-acceptance-deploy.mjs');
}
