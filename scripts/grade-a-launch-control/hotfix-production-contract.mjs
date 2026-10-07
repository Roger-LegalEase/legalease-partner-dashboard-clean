// Separate, one-release authorization. Historical forward v1/v2 are untouched.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
export const HOTFIX_BASE='94003a1a5b2059eb3a8d8978e68056f05071dc4a';
export const HOTFIX_APP='7a8c6a4da102bfd9691a6260d7bb117829cf4019';
export const HOTFIX_PROJECT='wwtwtsmywnckfkdaqqeg';
export const HOTFIX_MIGRATION='supabase/migrations/20261007034510_onboarding_review_conflict_transport.sql';
export const HOTFIX_ENV={key:'RCAP_ONBOARDING_LAUNCH_PREP_ENABLED',value:'true',target:['production'],type:'plain'};
export const HOTFIX_PHASES=['preflight','onboarding_review_migrate','onboarding_launch_flag','stage','smoke','activate'];
export const HOTFIX_OWNER='data/rcap-grade-a/launch-control/HOTFIX_PRODUCTION_AUTHORIZATION.json';
export const HOTFIX_FILES=[
 '.github/workflows/rcap-f1-ephemeral-staging.yml',
 '.github/workflows/rcap-hotfix-production.yml',
 'scripts/grade-a-launch-control/hotfix-production-contract.mjs',
 'scripts/grade-a-launch-control/hotfix-production-contract.test.mjs',
 'scripts/grade-a-launch-control/production-preflight-authorization.mjs',
 'scripts/rcap-hotfix-production.mjs',
 'scripts/rcap-production-migration-contract.mjs',
 'scripts/rcap-production-canary-smoke.mjs',
 'scripts/rcap-production-activate.mjs',
];
export const hotfixHash=b=>createHash('sha256').update(b).digest('hex');
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const blob=(root,sha,p)=>execFileSync('git',['show',`${sha}:${p}`],{cwd:root,maxBuffer:64*1024*1024});
const json=p=>JSON.parse(fs.readFileSync(p));
const records=['PENDING_WORKER_SUCCESSOR','RELEASE_CANDIDATE_BINDING','HOSTED_TOOLS_BINDING'].map(n=>`data/rcap-grade-a/launch-control/${n}.json`);
export function nativeHotfixWorker(root){
 const candidate=json(path.join(root,records[1]));
 const published=JSON.parse(execFileSync('unzip',['-p',path.join(root,`hosted-acceptance-evidence/worker/publication-${candidate.publication.runId}/publication.zip`),'rcap-render-worker-publication.json'],{encoding:'utf8'}));
 const accepted=json(path.join(root,`hosted-acceptance-evidence/worker/acceptance-${candidate.readOnlyImageAcceptance.runId}/verification-receipt.json`));
 assert.equal(String(published.workflowRunId),String(candidate.publication.runId));assert.equal(accepted.runId,candidate.readOnlyImageAcceptance.runId);assert.equal(accepted.conclusion,'success');assert.equal(accepted.readOnly,true);
 assert.equal(published.sourceSha,candidate.workerSourceSha);assert.equal(accepted.sourceSha,candidate.workerSourceSha);assert.equal(accepted.digest,candidate.workerDigest);assert.equal(published.immutableRegistryDigest,accepted.digest);assert.match(accepted.digest,/^sha256:[a-f0-9]{64}$/);
 return {sourceSha:published.sourceSha,digest:accepted.digest};
}
export function prepareHotfixOwner(root,executorControlSha,recordedAt=new Date().toISOString()){
 assert.match(executorControlSha,/^[a-f0-9]{40}$/);git(root,['merge-base','--is-ancestor',HOTFIX_BASE,executorControlSha]);
 const changed=git(root,['diff','--name-only',HOTFIX_BASE,executorControlSha]).split('\n').filter(Boolean);
 assert(changed.length&&changed.every(p=>HOTFIX_FILES.includes(p)),'only narrow executor-control correction');
 const c=JSON.parse(blob(root,HOTFIX_BASE,records[1])),worker=nativeHotfixWorker(root);
 assert.equal(c.applicationSha,HOTFIX_APP);assert.equal(c.workerSourceSha,worker.sourceSha);assert.equal(c.workerDigest,worker.digest);assert(Number.isSafeInteger(c.hostedAdmission.runId));
 return {schemaVersion:'rcap-onboarding-hotfix-production-authorization/v1',recordedBy:'Roger Roman',recordedAt,
  heldPredecessorSha:HOTFIX_BASE,executorControlSha,applicationSha:HOTFIX_APP,workerSourceSha:worker.sourceSha,workerDigest:worker.digest,workerInputFingerprint:c.workerInputFingerprint,toolsSha:c.toolsSha,productionProjectRef:HOTFIX_PROJECT,
  hostedClosureRunId:c.hostedAdmission.runId,heldRecordHashes:Object.fromEntries(records.map(p=>[p,hotfixHash(blob(root,HOTFIX_BASE,p))])),
  controlFiles:Object.fromEntries(changed.map(p=>[p,hotfixHash(blob(root,executorControlSha,p))])),
  phases:[...HOTFIX_PHASES],migrations:[{path:HOTFIX_MIGRATION,sha256:hotfixHash(blob(root,HOTFIX_APP,HOTFIX_MIGRATION))}],environment:[{...HOTFIX_ENV}],
  stagedDeploymentLimit:1,activationAttemptLimit:1,workerRebuildAllowed:false,workerPublicationAllowed:false,
  rollbackPolicy:'preserve-native-active-READY-accepted-production-readback',automaticRollback:['configuration','deployment','smoke','activation'],databaseRollbackAuthorized:false,
  note:'Roger authorizes only the exact onboarding hotfix: read-only preflight; one exact conflict-transport migration; only RCAP_ONBOARDING_LAUNCH_PREP_ENABLED=true in Production; one exact Production-target deployment without domain movement; bounded existing smoke; one promotion after successful smoke; no worker placement or publication. No secret, Auth, Stripe, extra migration/environment/deployment/activation, product rebuild, worker rebuild/publication, or unrelated release authority.'};
}
export function assertHotfixOwner(owner,candidate,worker){
 assert.equal(owner.schemaVersion,'rcap-onboarding-hotfix-production-authorization/v1');assert.equal(owner.recordedBy,'Roger Roman');assert.equal(owner.heldPredecessorSha,HOTFIX_BASE);
 assert.equal(owner.applicationSha,HOTFIX_APP);assert.equal(candidate.applicationSha,HOTFIX_APP);assert.equal(owner.workerSourceSha,worker.sourceSha);assert.equal(candidate.workerRebuildRequired,false,'accepted worker requires no rebuild');assert.equal(candidate.runtimeAccepted,true);
 for(const key of ['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','toolsSha'])assert.equal(owner[key],candidate[key],`exact hotfix ${key}`);
 assert.equal(owner.workerDigest,worker.digest);assert.equal(owner.productionProjectRef,HOTFIX_PROJECT);assert.equal(owner.hostedClosureRunId,candidate.hostedAdmission.runId);
 assert.deepEqual(owner.phases,HOTFIX_PHASES);assert.equal(owner.stagedDeploymentLimit,1);assert.equal(owner.activationAttemptLimit,1);assert.equal(owner.workerRebuildAllowed,false);assert.equal(owner.workerPublicationAllowed,false);assert.equal(owner.databaseRollbackAuthorized,false);
 assert.equal(owner.migrations.length,1);assert.equal(owner.migrations[0].path,HOTFIX_MIGRATION);assert.deepEqual(owner.environment,[HOTFIX_ENV]);
 assert(Number.isFinite(Date.parse(owner.recordedAt))&&Date.parse(owner.recordedAt)<=Date.now(),'actual owner timestamp');
 assert.equal(candidate.hostedAdmission.runId,owner.hostedClosureRunId);assert.equal(candidate.productionAuthorized,false,'hosted evidence grants no Production permission');
 return owner;
}
export function assertHotfixOperation(owner,journal,phase,request){
 assert(HOTFIX_PHASES.includes(phase),'only explicit hotfix phases');assert.notEqual(journal.passed,true,'consumed authorization');
 const n=journal.steps.length;assert.equal(phase,HOTFIX_PHASES[n],'ordered, single hotfix phase');
 assert(journal.steps.every((s,i)=>s.phase===HOTFIX_PHASES[i]&&s.passed===true),'all previous phases actually passed');
 const tuple={applicationSha:owner.applicationSha,workerSourceSha:owner.workerSourceSha,workerDigest:owner.workerDigest,productionProjectRef:owner.productionProjectRef};
 assert.deepEqual(request.tuple,tuple,'exact requested tuple');
 const expected={preflight:{readOnly:true},onboarding_review_migrate:{migrations:owner.migrations},onboarding_launch_flag:{environment:owner.environment},stage:{count:1,target:'production',autoAssignCustomDomains:false,applicationSha:owner.applicationSha},smoke:{stagedDeploymentId:journal.stagedDeploymentId},activate:{stagedDeploymentId:journal.stagedDeploymentId,attempts:1},}[phase];
 assert.deepEqual(request.scope,expected,'exact bounded operation scope');
 if(phase!=='preflight'){assert.match(journal.rollbackDeploymentId??'',/^dpl_[A-Za-z0-9]+$/,'captured rollback before any mutation');assert.match(journal.rollbackApplicationSha??'',/^[a-f0-9]{40}$/);assert(journal.preflightState&&Object.hasOwn(journal,'preReleaseFlag'),'captured pre-release app/config state');}
 if(['smoke','activate'].includes(phase)){assert.match(journal.stagedDeploymentId??'',/^dpl_[A-Za-z0-9]+$/);assert.match(journal.rollbackDeploymentId??'',/^dpl_[A-Za-z0-9]+$/);assert.notEqual(journal.stagedDeploymentId,journal.rollbackDeploymentId);}
 if(['activate'].includes(phase))assert.equal(journal.steps.find(s=>s.phase==='smoke')?.passed,true,'no smoke bypass');

}
export function hotfixRequest(owner,journal,phase){
 const tuple=Object.fromEntries(['applicationSha','workerSourceSha','workerDigest','productionProjectRef'].map(k=>[k,owner[k]]));
 const scope={preflight:{readOnly:true},onboarding_review_migrate:{migrations:owner.migrations},onboarding_launch_flag:{environment:owner.environment},stage:{count:1,target:'production',autoAssignCustomDomains:false,applicationSha:owner.applicationSha},smoke:{stagedDeploymentId:journal.stagedDeploymentId},activate:{stagedDeploymentId:journal.stagedDeploymentId,attempts:1},}[phase];return {tuple,scope};
}
export function deploymentApplicationSha(deployment){
 const sha=deployment.gitSource?.sha??deployment.meta?.githubCommitSha;assert.match(sha??'',/^[a-f0-9]{40}$/,'native application SHA');
 if(deployment.gitSource?.sha&&deployment.meta?.githubCommitSha)assert.equal(deployment.gitSource.sha,deployment.meta.githubCommitSha,'native application identities agree');return sha;
}
export function assertHotfixStaging(before,after,deployment,owner){
 assert.deepEqual(after,before,'no Production aliases/domains/environment mutation during staging');assert.equal(deployment.target,'production');assert.equal(deployment.readyState,'READY');assert.equal(deployment.projectId,'prj_cdgwGzFqIHgEUlzEburSLaZETdQV');assert.equal(deploymentApplicationSha(deployment),owner.applicationSha);
 for(const [meta,k]of [['rcapApplicationSha','applicationSha'],['rcapWorkerSourceSha','workerSourceSha'],['rcapWorkerDigest','workerDigest'],['rcapWorkerInputFingerprint','workerInputFingerprint'],['rcapToolsSha','toolsSha'],['rcapExecutorControlSha','executorControlSha']])assert.equal(deployment.meta?.[meta],owner[k],`exact staged ${meta}`);
 const aliases=(deployment.alias??[]).map(a=>typeof a==='string'?a:a.alias);assert(aliases.every(a=>!before.domains.some(d=>d.name===a)),'staged deployment has no Production domain');
}
export async function executeHotfix(owner,{journal={schemaVersion:'rcap-onboarding-hotfix-execution/v1',steps:[]},perform,persist=()=>{}}){
 assert.equal(journal.steps.length,0,'new execution only; no replay');
 for(const phase of HOTFIX_PHASES){const request=hotfixRequest(owner,journal,phase);assertHotfixOperation(owner,journal,phase,request);
  const step={phase,request,attemptedAt:new Date().toISOString(),passed:false};journal.steps.push(step);persist(journal);
  try{const result=await perform(phase,request,journal);assert.equal(result.passed,true,`${phase} failed`);Object.assign(step,{passed:true,finishedAt:new Date().toISOString(),result});persist(journal);}catch(error){step.failure=error.message;persist(journal);throw error;}
 }
 journal.passed=true;persist(journal);return journal;
}
export function verifyHotfixControl(root,env=process.env){
 const owner=json(path.join(root,HOTFIX_OWNER)),candidate=json(path.join(root,records[1])),worker=nativeHotfixWorker(root);assertHotfixOwner(owner,candidate,worker);
 assert.deepEqual(owner,prepareHotfixOwner(root,owner.executorControlSha,owner.recordedAt),'exact immutable hotfix owner/control manifest');
 const head=git(root,['rev-parse','HEAD']);assert.equal(env.GITHUB_SHA,head,'exact native execution SHA');assert.equal(git(root,['diff','--name-only',owner.executorControlSha,head,'--','scripts','.github']),'','zero reviewed executor drift');
 git(root,['merge-base','--is-ancestor',owner.executorControlSha,head]);git(root,['merge-base','--is-ancestor',head,'origin/captain-release']);
 assert(git(root,['diff','--name-only',owner.executorControlSha,head]).split('\n').filter(Boolean).every(p=>p===HOTFIX_OWNER),'only explicit owner record after reviewed correction');
 assert.equal(git(root,['status','--porcelain','--untracked-files=no']),'','clean execution checkout');
 for(const p of records)assert.equal(hotfixHash(fs.readFileSync(path.join(root,p))),owner.heldRecordHashes[p],'exact CURRENT successor preserved');
 for(const[p,h]of Object.entries(owner.controlFiles))assert.equal(hotfixHash(fs.readFileSync(path.join(root,p))),h,'exact frozen corrected executable');
 assert.equal(hotfixHash(fs.readFileSync(path.join(root,HOTFIX_MIGRATION))),owner.migrations[0].sha256,'exact migration source');
 assert.equal(git(root,['diff','--name-only',HOTFIX_BASE,head]).split('\n').filter(Boolean).every(p=>Object.hasOwn(owner.controlFiles,p)||p===HOTFIX_OWNER),true,'no other release changes');
 const captured=JSON.parse(fs.readFileSync(path.join(root,candidate.hostedAdmission.files.find(f=>f.path.endsWith('/admission.json')).path))).capturedAt;
 assert(Date.now()-Date.parse(captured)>=0&&Date.now()-Date.parse(captured)<=24*60*60*1000,'CURRENT admission <=24h');
 return {owner,candidate,worker};
}
// Verify the accepted native evidence with its own frozen historical controls,
// then layer only the exact new executor manifest over that CURRENT release.
export async function requireHotfixAdmission(root,env=process.env){
 const verified=verifyHotfixControl(root,env);const snapshot=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-hotfix-current-'));
 try{git(root,['worktree','add','--detach',snapshot,HOTFIX_BASE]);fs.symlinkSync(path.join(root,'node_modules'),path.join(snapshot,'node_modules'),'dir');
  const output=execFileSync(process.execPath,['--input-type=module','-e',"import {requireCurrentReleaseCandidate} from './scripts/grade-a-launch-control/verify-release-candidate-binding.mjs';const c=requireCurrentReleaseCandidate(process.cwd());console.log(JSON.stringify({current:true,applicationSha:c.applicationSha}));"],{cwd:snapshot,encoding:'utf8',maxBuffer:64*1024*1024});assert(output.includes('"current":true'),'actual forward binding and release admission PASS');
 }finally{git(root,['worktree','remove','--force',snapshot]);}
 return {...verified,current:true,bindingVerified:true,admissionVerified:true,rebuildRequired:false};
}
export function loadProductionCandidate(root,env=process.env){
 const c=json(path.join(root,records[1]));if(!env.RCAP_HOTFIX_JOURNAL)return c;
 const {owner}=verifyHotfixControl(root,env),j=json(env.RCAP_HOTFIX_JOURNAL);
 assert.equal(j.runId,String(env.GITHUB_RUN_ID));assert.equal(j.executionSha,env.GITHUB_SHA);assert.equal(j.ownerSha256,hotfixHash(fs.readFileSync(path.join(root,HOTFIX_OWNER))));
 return {...c,hotfixProduction:{owner,journal:j},productionProjectRef:HOTFIX_PROJECT,productionAuthorized:true,productionAuthorization:{...owner,authorized:true,stagedDeploymentId:j.stagedDeploymentId,rollbackDeploymentId:j.rollbackDeploymentId,productionProjectDomains:j.productionProjectDomains,productionDeploymentAliases:j.productionDeploymentAliases,smokeRunId:j.runId,smokeArtifactSha256:j.smokeArtifactSha256}};
}
export function requireHotfixPhase(candidate,phase){
 const {owner,journal}=candidate.hotfixProduction;const active=journal.steps.at(-1);assert.equal(active?.phase,phase,'only current native executor phase');assert.equal(active.passed,false,'phase not replayable');
 assertHotfixOperation(owner,{...journal,steps:journal.steps.slice(0,-1)},phase,active.request);return candidate.productionAuthorization;
}

export function assertHotfixRollback(journal,request){
 assert(journal.preflightState&&Object.hasOwn(journal,'preReleaseFlag'),'captured pre-release state required');
 assert.deepEqual(request,{deploymentId:journal.rollbackDeploymentId,applicationSha:journal.rollbackApplicationSha,flag:journal.preReleaseFlag},'rollback only to captured app/config');
 assert.match(request.deploymentId,/^dpl_[A-Za-z0-9]+$/);assert.match(request.applicationSha,/^[a-f0-9]{40}$/);
 return request;
}
