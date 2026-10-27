import assert from 'node:assert/strict';
import {CURRENT_PURPOSE_TUPLE,CURRENT_ORDINARY_PREVIEW,currentPurposeMetadata,classifyCurrentPurposeDeployment} from './rcap-configured-sandbox-preview-contract.mjs';
export const MANAGED_RUNTIME_REPAIR_PHASE='managed_start_runtime_repair';
export const MANAGED_RUNTIME_REPAIR_ID='ordinary-launch-prep-v1';
export const MANAGED_REPAIR_PREDECESSOR=CURRENT_ORDINARY_PREVIEW;
export function assertManagedRepairRelease(release,env,head){
 assert.equal(env.PHASE_INPUT,MANAGED_RUNTIME_REPAIR_PHASE);assert.equal(env.GITHUB_ACTIONS,'true');assert.equal(env.GITHUB_EVENT_NAME,'workflow_dispatch');assert.equal(env.GITHUB_RUN_ATTEMPT,'1');
 assert.equal(env.GITHUB_REPOSITORY,'Roger-LegalEase/legalease-partner-dashboard-clean');assert.equal(env.GITHUB_REF_NAME,'codex/f-vercel-raw-readonly-20261026');assert.match(env.GITHUB_SHA??'',/^[a-f0-9]{40}$/);assert.equal(env.GITHUB_WORKFLOW_SHA,env.GITHUB_SHA);
 assert.equal(env.RCAP_ADMITTED_CONTROLLER_SHA,head);
 for(const [k,v]of Object.entries(CURRENT_PURPOSE_TUPLE))assert.equal(release[k],v);
 for(const [k,n]of Object.entries({applicationSha:'APPLICATION_SHA_INPUT',workerSourceSha:'WORKER_SOURCE_SHA_INPUT',workerDigest:'WORKER_DIGEST_INPUT',toolsSha:'TOOLS_SHA_INPUT'}))assert.equal(env[n],release[k]);
 assert.equal(env.ACCEPTANCE_SUPABASE_PROJECT_REF,'hyflxnlhpmiqxvvcoiia');assert.equal(release.current,false);assert.equal(release.previewOnly,true);assert.equal(release.productionAuthorized,false);assert.equal(release.deploymentAuthorized,false);
}
export function managedRepairMetadata(origin){
 return {...currentPurposeMetadata('managed_start_preview',origin),rcapManagedRuntimeRepair:MANAGED_RUNTIME_REPAIR_ID,rcapRepairPredecessor:MANAGED_REPAIR_PREDECESSOR.id,rcapOnboardingLaunchPrepEnabled:'true',rcapLaunchStudioEnabled:'false'};
}
export function classifyManagedRepairSibling(d,projectId,originFor){
 // A prior repair, READY or otherwise, is an operation to reconcile; never create another.
 assert(!d?.meta?.rcapManagedRuntimeRepair,'REPAIR_PRIOR_ATTEMPT_REQUIRES_RECONCILIATION');
 return classifyCurrentPurposeDeployment(d,projectId,originFor);
}
export function assertManagedRepairAliasPrestate(response,projectId,originFor){
 assert.equal(response?.status,200,'REPAIR_ALIAS_PREDECESSOR_REQUIRED');
 const d=classifyManagedRepairSibling(response.json,projectId,originFor);
 assert.equal(d.phase,'managed_start_preview');assert.equal(d.id,MANAGED_REPAIR_PREDECESSOR.id);assert.equal(d.url,MANAGED_REPAIR_PREDECESSOR.hostname);return d;
}
export async function restoreManagedRepairAlias({api,alias,newDeploymentId,assertPredecessor}){
 assert.equal(alias,'legalease-rcap-managed-c0052e13d980-roger947s-projects.vercel.app');assert.match(newDeploymentId??'',/^dpl_[A-Za-z0-9]+$/);assert.notEqual(newDeploymentId,MANAGED_REPAIR_PREDECESSOR.id);
 const current=await api('/v13/deployments/'+encodeURIComponent(alias));
 if(current.status===200&&current.json?.id===MANAGED_REPAIR_PREDECESSOR.id){await assertPredecessor();return {performed:false,restored:true,priorDeploymentId:MANAGED_REPAIR_PREDECESSOR.id};}
 if(current.status!==200||current.json?.id!==newDeploymentId)throw Error('REPAIR_INVERSE_CURRENT_BINDING_UNPROVEN');
 const expected=managedRepairMetadata('https://'+alias);assert.equal(current.json.projectId,'prj_cdgwGzFqIHgEUlzEburSLaZETdQV');assert.equal(current.json.gitSource?.sha,CURRENT_PURPOSE_TUPLE.applicationSha);assert(Object.hasOwn(current.json,'target')&&(current.json.target===null||current.json.target==='preview'));for(const [k,v]of Object.entries(expected))assert.equal(current.json.meta?.[k],v);
 await assertPredecessor();
 const restored=await api('/v2/deployments/'+MANAGED_REPAIR_PREDECESSOR.id+'/aliases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({alias})});
 if(restored.status<200||restored.status>=300)throw Error('REPAIR_INVERSE_POST_FAILED');
 const after=await api('/v13/deployments/'+encodeURIComponent(alias));
 if(after.status!==200||after.json?.id!==MANAGED_REPAIR_PREDECESSOR.id)throw Error('REPAIR_INVERSE_READBACK_FAILED');
 return {performed:true,restored:true,priorDeploymentId:MANAGED_REPAIR_PREDECESSOR.id};
}
