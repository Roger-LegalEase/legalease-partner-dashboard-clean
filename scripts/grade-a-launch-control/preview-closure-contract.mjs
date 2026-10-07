// v3 is a true acceptance Preview. Historical v1/v2 remain staged Production.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {HOSTED_VERCEL_PROJECT_ID} from '../rcap-hosted-acceptance-vercel-identity.mjs';
import {assertVercelProductionScopes} from './vercel-production-scopes.mjs';
export const PREVIEW_ADMISSION_SCHEMA='rcap-readonly-successor-admission/v3';
export const PREVIEW_CREATION_RUN=37692898588;
export const ACCEPTANCE_PROJECT='hyflxnlhpmiqxvvcoiia';
export const TUPLE_KEYS=['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','toolsSha'];
export const sha256=bytes=>'sha256:'+createHash('sha256').update(bytes).digest('hex');
export function assertNativePreviewCreation({run,jobs,artifact,archiveDigest,deploy,preflight,creationCandidate},tuple,inputs){
 assert.equal(Number(inputs.creationRunId),PREVIEW_CREATION_RUN,'exact authorized native Preview creation run');
 assert.equal(run.id,PREVIEW_CREATION_RUN);assert.equal(run.status,'completed');assert.equal(run.conclusion,'success');assert.equal(run.run_attempt,1);assert.equal(run.event,'workflow_dispatch');
 assert.equal(run.path,'.github/workflows/rcap-f1-ephemeral-staging.yml');assert.equal(run.repository.full_name.toLowerCase(),'roger-legalease/legalease-partner-dashboard-clean');
 const job=jobs.jobs.find(j=>j.run_id===run.id&&j.steps.some(s=>s.name==='Deploy the frozen application SHA to Vercel Preview'));
 assert(job&&job.status==='completed'&&job.conclusion==='success','successful native replace_preview job');
 for(const name of ['Require exact current release or HELD acceptance Preview tuple','Require CURRENT authority except exact HELD acceptance Preview creation','Read the existing sandbox catalog for the replacement Preview','Deploy the frozen application SHA to Vercel Preview','Upload the hosted acceptance evidence'])assert.equal(job.steps.find(s=>s.name===name)?.conclusion,'success',name);
 assert.equal(artifact.name,`rcap-hosted-replace_preview-${run.id}`);assert.equal(artifact.workflow_run.id,run.id);assert.equal(artifact.workflow_run.head_sha,run.head_sha);assert.equal(artifact.digest,archiveDigest,'native creation archive digest');
 assert.equal(preflight.schemaVersion,'rcap-hosted-acceptance-preflight/v1');assert.equal(preflight.passed,true);assert.equal(preflight.acceptanceProjectRef,ACCEPTANCE_PROJECT);assert.equal(preflight.cases.projectIdentity.status,'ACTIVE_HEALTHY');
 assert.equal(deploy.schemaVersion,'rcap-hosted-acceptance-deploy/v1');assert.equal(deploy.passed,true);assert.equal(deploy.applicationSha,tuple.applicationSha);assert.equal(deploy.acceptanceProjectRef,ACCEPTANCE_PROJECT);
 assert.equal(creationCandidate.status,'FORWARD_BOUND_HOSTED_PENDING');assert.equal(creationCandidate.productionAuthorized,false);
 for(const key of TUPLE_KEYS)assert.equal(creationCandidate[key],tuple[key],`native creation ${key}`);
 for(const name of ['deployed_to_preview_not_production','deployment_carries_the_final_application_sha','deployment_carries_the_accepted_worker_binding','bound_to_the_acceptance_supabase_project_only','production_aliases_unchanged','production_environment_variables_unchanged'])assert(deploy.requiredCases.includes(name)&&!deploy.failedCases.includes(name),name);
 assert.deepEqual(deploy.productionBefore,deploy.productionAfter,'creation preserved Production environment and aliases');
 assert.equal(deploy.neverPassedProdFlag,true);assert.equal(deploy.neverWroteProjectLevelEnv,true);
 const d=deploy.deployment;assert.equal(inputs.deploymentId,d.id,'exact native Preview id');assert.equal(inputs.hostname,d.immutableHostname,'exact native Preview hostname');
 assertPreviewDeployment({id:d.id,url:d.immutableHostname,projectId:d.projectId,gitSource:{sha:d.gitSourceSha},meta:d.metadata,target:d.target,readyState:d.readyState},tuple,{deploymentId:d.id,hostname:d.immutableHostname});
 return {runId:run.id,workflowSourceSha:run.head_sha,artifactId:artifact.id,artifactDigest:artifact.digest,toolsSha:tuple.toolsSha,deploymentId:d.id,hostname:d.immutableHostname,target:d.target,projectId:d.projectId,applicationSha:d.gitSourceSha,newDeploymentCreated:false};
}
export function assertPreviewDeployment(d,tuple,creation,{aliases=[],domains=[]}={}){
 assert.equal(d.id,creation.deploymentId,'exact Preview id');assert.equal(d.url,creation.hostname,'exact Preview hostname');assert.equal(d.projectId,HOSTED_VERCEL_PROJECT_ID,'pinned Preview project');
 assert.equal(d.gitSource?.sha,tuple.applicationSha,'exact Preview application');assert([null,'preview'].includes(d.target),'true nonproduction Preview target');assert.equal(d.readyState,'READY');
 for(const key of ['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint']){const meta='rcap'+key[0].toUpperCase()+key.slice(1);assert.equal(d.meta?.[meta],tuple[key],`Preview ${meta}`);}
 assert.equal(d.meta?.rcapAcceptanceProjectRef,ACCEPTANCE_PROJECT);assert.equal(d.meta?.rcapStagedProduction,undefined,'historical staged Production metadata forbidden');
 assert(!aliases.some(a=>a.alias===d.url),'Preview is not a Production alias');assert(!domains.some(a=>a.name===d.url),'Preview is not a Production domain');
}
export function assertPreviewAdmission(h){
 assert.equal(h.schemaVersion,PREVIEW_ADMISSION_SCHEMA);assert([null,'preview'].includes(h.target),'v3 requires a true Preview');assert.equal(h.projectId,HOSTED_VERCEL_PROJECT_ID);assert.equal(h.acceptanceProjectRef,ACCEPTANCE_PROJECT);
 assert.equal(h.previewCreation?.runId,PREVIEW_CREATION_RUN);assert.equal(h.previewCreation.deploymentId,h.deploymentId);assert.equal(h.previewCreation.hostname,h.hostname);assert.equal(h.previewCreation.toolsSha,h.toolsSha);assert.equal(h.previewCreation.projectId,h.projectId);assert.equal(h.previewCreation.applicationSha,h.applicationSha);assert.equal(h.previewCreation.newDeploymentCreated,false);
 assert([null,'preview'].includes(h.previewCreation.target));assert.match(h.previewCreation.workflowSourceSha,/^[a-f0-9]{40}$/);assert.match(h.closureControlSha,/^[a-f0-9]{40}$/);
 assert.equal(h.queueSafetyVerified,true);assert.equal(h.productionEnvironmentUnchanged,true);assert.equal(h.projectLevelProductionEnvironmentMutations,0);assert.equal(h.newDeploymentCreated,false);assert.equal(h.workerClaims,0);assert.equal(h.realPayments,0);assert.equal(h.participantWrites,0);
 assertVercelProductionScopes(h.productionDeploymentAliases,h.productionProjectDomains,h);assert.equal(h.productionDeploymentAliasesUnchanged,true);assert.equal(h.productionProjectDomainsUnchanged,true);
 assert(!h.productionDeploymentAliases.some(a=>a.alias===h.hostname));assert(!h.productionProjectDomains.some(a=>a.name===h.hostname));
}
export function assertPreviewClosureDocuments(h,read){
 assertPreviewAdmission(h);
 const ready=read('candidate-ready.json');assertPreviewDeployment({id:ready.id,url:ready.url,target:ready.target,readyState:ready.readyState,projectId:ready.projectId,gitSource:{sha:ready.applicationSha},meta:ready.meta},h,h.previewCreation,{aliases:h.productionDeploymentAliases,domains:h.productionProjectDomains});
 const candidateAliases=read('candidate-aliases.json');assert(Array.isArray(candidateAliases.aliases)&&!candidateAliases.pagination?.next,'complete Preview alias inventory');for(const a of candidateAliases.aliases){assert(!h.productionDeploymentAliases.some(p=>p.alias===a.alias));assert(!h.productionProjectDomains.some(p=>p.name===a.alias));}
 const state=read('acceptance-project-state.json');assert.equal(state.projectRef,ACCEPTANCE_PROJECT);assert.equal(state.status,'ACTIVE_HEALTHY');
 const rollback=read('worker-rollback.json');assert.equal(rollback.passed,true);assert.equal(rollback.readOnly,true);
 const queue=read('queue-safety.json');assert.equal(queue.passed,true);assert.equal(queue.readOnly,true);for(const key of ['stale_queued','queued','claimed','terminal_failed'])assert.equal(Number(queue.queue[key]),0);
 const routing=read('shared-host-routing.json');assert.equal(routing.passed,true);assert.equal(routing.source,h.applicationSha);assert.deepEqual(routing.cases,[['expungement.ai','/','/expungement-ai'],['legalease.com','/','/static/legalease/index.html'],['legaleasepartner.com','/','/partners']]);
 const browser=read('browser-results.json');assert.equal(browser.length,4);assert.deepEqual(browser.map(r=>[r.locale,r.width]).sort(),[['en',375],['en',1440],['es',375],['es',1440]].sort());for(const r of browser){assert.equal(r.status,'PASS');assert.equal(r.auth,'MOCKED: NO LIVE AUTH');assert.equal(r.claim,'MOCKED: NO LIVE CLAIM');}
 for(const when of ['before','after'])assertVercelProductionScopes(read(`production-aliases-${when}.json`),read(`production-project-domains-${when}.json`),h);
 assert.deepEqual(read('production-environment-before.json'),read('production-environment-after.json'),'Production environment unchanged');
}
