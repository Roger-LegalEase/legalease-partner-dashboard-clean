// One exact ordinary source successor. Existing consumer/Clinic purpose constants stay c005.
import assert from'node:assert/strict';
import{CURRENT_PURPOSE_TUPLE,CURRENT_ORDINARY_PREVIEW,currentPurposeMetadata,CLINIC_PURPOSE,CONFIGURED_SANDBOX_PHASE}from'./rcap-configured-sandbox-preview-contract.mjs';
import{managedRepairMetadata}from'./rcap-managed-start-runtime-repair-contract.mjs';
export const SOURCE_SUCCESSOR_PHASE='managed_start_source_successor';
export const SOURCE_SUCCESSOR_APP='9aadacd0c5a7fac90a1662f1928b7b86f8685c7a';
export const SOURCE_SUCCESSOR_ID='ordinary-prepare-command-trace-v1';
const PROJECT='prj_cdgwGzFqIHgEUlzEburSLaZETdQV';
export const SOURCE_SUCCESSOR_PREDECESSOR=Object.freeze({id:'dpl_BAxSvMXJCJqUAxATgpZgANAjZhjt',hostname:'legalease-partner-dashboard-clean-nrvu23zle-roger947s-projects.vercel.app',alias:'legalease-rcap-managed-c0052e13d980-roger947s-projects.vercel.app'});
export const SOURCE_SUCCESSOR_ALIAS='legalease-rcap-managed-9aadacd0c5a7-roger947s-projects.vercel.app';
export const SOURCE_SUCCESSOR_PROTECTED=Object.freeze([
 {...SOURCE_SUCCESSOR_PREDECESSOR,kind:'repair'},
 {...CURRENT_ORDINARY_PREVIEW,kind:'managed_start_preview'},
 {id:'dpl_4dcAZzgpzB71AFT3pPokeZzg7UA4',hostname:'legalease-partner-dashboard-clean-567xzll2v-roger947s-projects.vercel.app',alias:'legalease-rcap-c0052e13d980-roger947s-projects.vercel.app',kind:CONFIGURED_SANDBOX_PHASE},
 {id:'dpl_DeFafrLVF3CaAds8k2xR68iU1nKS',hostname:'legalease-partner-dashboard-clean-chpz1v7ys-roger947s-projects.vercel.app',alias:'legalease-rcap-clinic-c0052e13d980-roger947s-projects.vercel.app',kind:CLINIC_PURPOSE}
]);
export function assertSourceSuccessorRelease(release,env,head){
 assert.equal(env.PHASE_INPUT,SOURCE_SUCCESSOR_PHASE);assert.equal(env.GITHUB_ACTIONS,'true');assert.equal(env.GITHUB_EVENT_NAME,'workflow_dispatch');assert.equal(env.GITHUB_RUN_ATTEMPT,'1');assert.equal(env.GITHUB_REPOSITORY,'Roger-LegalEase/legalease-partner-dashboard-clean');assert.equal(env.GITHUB_REF_NAME,'codex/f-vercel-raw-readonly-20261026');assert.match(env.GITHUB_SHA??'',/^[a-f0-9]{40}$/);assert.equal(env.GITHUB_WORKFLOW_SHA,env.GITHUB_SHA);assert.equal(env.RCAP_ADMITTED_CONTROLLER_SHA,head);
 assert.equal(release.applicationSha,SOURCE_SUCCESSOR_APP);for(const key of ['workerSourceSha','workerDigest','workerInputFingerprint'])assert.equal(release[key],CURRENT_PURPOSE_TUPLE[key]);for(const[key,name]of Object.entries({applicationSha:'APPLICATION_SHA_INPUT',toolsSha:'TOOLS_SHA_INPUT',workerSourceSha:'WORKER_SOURCE_SHA_INPUT',workerDigest:'WORKER_DIGEST_INPUT'}))assert.equal(env[name],release[key]);assert.equal(env.ACCEPTANCE_SUPABASE_PROJECT_REF,'hyflxnlhpmiqxvvcoiia');assert.equal(release.current,false);assert.equal(release.previewOnly,true);assert.equal(release.productionAuthorized,false);assert.equal(release.deploymentAuthorized,false);
}
export function sourceSuccessorMetadata(origin){assert.equal(origin,'https://'+SOURCE_SUCCESSOR_ALIAS);return{...currentPurposeMetadata('managed_start_preview',origin),rcapApplicationSha:SOURCE_SUCCESSOR_APP,rcapManagedSourceSuccessor:SOURCE_SUCCESSOR_ID,rcapSourcePredecessor:SOURCE_SUCCESSOR_PREDECESSOR.id,rcapOnboardingLaunchPrepEnabled:'true',rcapLaunchStudioEnabled:'false'};}
export function assertProtectedSourceDeployment(d,known,originFor){
 assert.equal(d?.projectId,PROJECT);assert.equal(d.id,known.id);assert.equal(d.url,known.hostname);assert.equal(d.gitSource?.sha,CURRENT_PURPOSE_TUPLE.applicationSha);assert(Object.hasOwn(d,'target')&&(d.target===null||d.target==='preview'));assert.equal(d.readyState,'READY');
 const purpose=known.kind==='repair'?'managed_start_preview':known.kind,origin=originFor(CURRENT_PURPOSE_TUPLE.applicationSha,purpose===CLINIC_PURPOSE?'mississippi_clinic':purpose===CONFIGURED_SANDBOX_PHASE?'none':'managed_start');const expected=known.kind==='repair'?managedRepairMetadata(origin):currentPurposeMetadata(purpose,origin);for(const[k,v]of Object.entries(expected))assert.equal(d.meta?.[k],v,'SOURCE_SUCCESSOR_PRESERVATION:'+k);return{id:d.id,url:d.url,target:d.target,sourceSha:d.gitSource.sha,readyState:d.readyState,meta:expected};
}
export function assertSourceSuccessorAliasAbsent(response){assert.equal(response.status,404,'SOURCE_SUCCESSOR_ALIAS_PREEXISTING_HOLD');}
export function refusePriorSourceSuccessorAttempt(d){if(d?.gitSource?.sha===SOURCE_SUCCESSOR_APP||d?.meta?.rcapApplicationSha===SOURCE_SUCCESSOR_APP)throw Error('SOURCE_SUCCESSOR_PRIOR_ATTEMPT_REQUIRES_RECONCILIATION');}
export async function restoreSourceSuccessorAlias({api,newDeploymentId}){
 assert.match(newDeploymentId??'',/^dpl_[A-Za-z0-9]+$/);const current=await api('/v13/deployments/'+encodeURIComponent(SOURCE_SUCCESSOR_ALIAS));if(current.status===404)return{performed:false,restored:true,priorState:'absent'};assert.equal(current.status,200);assert.equal(current.json?.id,newDeploymentId,'SOURCE_SUCCESSOR_INVERSE_UNKNOWN_BINDING');assert.equal(current.json.projectId,PROJECT);assert(Object.hasOwn(current.json,'target')&&(current.json.target===null||current.json.target==='preview'));assert.equal(current.json.gitSource?.sha,SOURCE_SUCCESSOR_APP);for(const[k,v]of Object.entries(sourceSuccessorMetadata('https://'+SOURCE_SUCCESSOR_ALIAS)))assert.equal(current.json.meta?.[k],v);
 // Resolve provider alias ID and verify its hostname/target before deletion.
 const alias=await api('/v4/aliases/'+encodeURIComponent(SOURCE_SUCCESSOR_ALIAS));assert.equal(alias.status,200);assert.equal(alias.json?.alias,SOURCE_SUCCESSOR_ALIAS);assert.equal(alias.json?.projectId,PROJECT);assert.equal(alias.json?.deploymentId??alias.json?.deployment?.id,newDeploymentId);assert.match(alias.json?.uid??'',/^[A-Za-z0-9_]+$/);const removed=await api('/v2/aliases/'+encodeURIComponent(alias.json.uid),{method:'DELETE'});assert(removed.status>=200&&removed.status<300);const after=await api('/v13/deployments/'+encodeURIComponent(SOURCE_SUCCESSOR_ALIAS));assert.equal(after.status,404,'SOURCE_SUCCESSOR_INVERSE_READBACK_FAILED');return{performed:true,restored:true,priorState:'absent'};
}
