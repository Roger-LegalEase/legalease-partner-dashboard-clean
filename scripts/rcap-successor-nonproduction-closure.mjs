import {PREVIEW_ADMISSION_SCHEMA,ACCEPTANCE_PROJECT,assertNativePreviewCreation,assertPreviewDeployment,assertPreviewClosureDocuments,sha256} from './grade-a-launch-control/preview-closure-contract.mjs';
import {productionDomainsPath,productionProjectDomains,productionDeploymentAliases,assertVercelProductionScopes} from './grade-a-launch-control/vercel-production-scopes.mjs';
import {QUEUE_QUERY} from './rcap-production-worker-readiness.mjs';
// Exact application staging and GET-only predecessor custody. No activation,
// worker deployment, database writes, packet generation or live auth.
import assert from 'node:assert/strict';
import {registryImage,assertRegistryMirrorEquivalent} from './rcap-successor-registry-read.mjs';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {verifyPinnedForwardBinding,PENDING,CANDIDATE} from './grade-a-launch-control/verify-pinned-worker-successor.mjs';
import {readWorkerIdentity,APP} from './rcap-worker-identity-readonly.mjs';
import {resolveHostedVercelIdentity,hostedVercelScopedUrl,HOSTED_VERCEL_PROJECT_NAME} from './rcap-hosted-acceptance-vercel-identity.mjs';
const out='successor-closure-evidence';fs.mkdirSync(out,{recursive:true});
const write=(name,value)=>fs.writeFileSync(`${out}/${name}.json`,JSON.stringify(value,null,2)+'\n');
const hash=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
const p=JSON.parse(fs.readFileSync(PENDING)),candidate=JSON.parse(fs.readFileSync(CANDIDATE));
const gate=verifyPinnedForwardBinding(process.cwd(),candidate);assert(gate.bindingVerified,JSON.stringify(gate));assert.equal(candidate.hostedAdmission,null,'one fresh staging run; no replay');
for(const [key,env]of Object.entries({applicationSha:'RCAP_APPLICATION_SHA',workerSourceSha:'RCAP_WORKER_SOURCE_SHA',workerDigest:'RCAP_WORKER_DIGEST',toolsSha:'RCAP_TOOLS_SHA'}))assert.equal(p[key],process.env[env],key);
const workflowSourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();assert.equal(workflowSourceSha,process.env.GITHUB_SHA);
let workerRollbackVerified=false;
let rollbackOperation='machine GET';
const tuple=Object.fromEntries(['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','toolsSha'].map(k=>[k,p[k]]));
// Independently download native creation evidence; never trust a typed id alone.
const gh=(api,binary=false)=>execFileSync('gh',['api',api],{encoding:binary?undefined:'utf8',maxBuffer:64*1024*1024});
const repo='repos/Roger-LegalEase/legalease-partner-dashboard-clean';
const creationRunId=process.env.RCAP_PREVIEW_CREATION_RUN_ID;
assert(/^\d+$/.test(creationRunId??''),'native creation run input required');
const creationRun=JSON.parse(gh(`${repo}/actions/runs/${creationRunId}`));
const creationJobs=JSON.parse(gh(`${repo}/actions/runs/${creationRunId}/jobs?per_page=100`));assert(!creationJobs.total_count||creationJobs.jobs.length===creationJobs.total_count,'complete native creation jobs');
const creationArtifacts=JSON.parse(gh(`${repo}/actions/runs/${creationRunId}/artifacts?per_page=100`));
const matches=creationArtifacts.artifacts.filter(a=>a.name===`rcap-hosted-replace_preview-${creationRunId}`&&!a.expired);assert.equal(matches.length,1,'one exact native creation artifact');
const creationArtifact=matches[0];
write('preview-creation-run',creationRun);write('preview-creation-jobs',creationJobs);write('preview-creation-artifact',creationArtifact);
const creationArchive=gh(`${repo}/actions/artifacts/${creationArtifact.id}/zip`,true);fs.writeFileSync(`${out}/preview-creation-native.zip`,creationArchive);
const creationEntry=name=>JSON.parse(execFileSync('unzip',['-p',`${out}/preview-creation-native.zip`,name],{encoding:'utf8'}));
const creationCandidate=JSON.parse(execFileSync('git',['show',`${creationRun.head_sha}:${CANDIDATE}`],{encoding:'utf8'}));
const previewCreation=assertNativePreviewCreation({run:creationRun,jobs:creationJobs,artifact:creationArtifact,archiveDigest:sha256(creationArchive),deploy:creationEntry('deploy.json'),preflight:creationEntry('preflight.json'),creationCandidate},tuple,{creationRunId,deploymentId:process.env.RCAP_PREVIEW_DEPLOYMENT_ID,hostname:process.env.RCAP_STAGED_CANDIDATE_HOSTNAME});
const projectStateResponse=await fetch(`https://api.supabase.com/v1/projects/${ACCEPTANCE_PROJECT}`,{headers:{Authorization:'Bearer '+process.env.SUPABASE_ACCESS_TOKEN},redirect:'error',signal:AbortSignal.timeout(30000)});assert(projectStateResponse.ok,'acceptance project identity GET');const acceptanceState=await projectStateResponse.json();assert.equal(acceptanceState.id,ACCEPTANCE_PROJECT);assert.equal(acceptanceState.name,'legalease-rcap-acceptance');assert.equal(acceptanceState.status,'ACTIVE_HEALTHY');write('acceptance-project-state',{projectRef:acceptanceState.id,name:acceptanceState.name,status:acceptanceState.status,capturedAt:new Date().toISOString()});
// Rollback availability uses registry GETs only, including challenge token GET.

try {
 const fly=await readWorkerIdentity({token:process.env.FLY_API_TOKEN});write('fly-identity',fly);assert.equal(fly.machines.length,1);const m=fly.machines[0];assert.equal(m.state,'started');assert.equal(m.ociRevision,'5e04eafd7eaed7e71722862e651fb787ebbd296d');
 rollbackOperation='Fly immutable manifest/config GET';
 const mirror=await registryImage('registry.fly.io',APP,m.imageDigest,'x:'+process.env.FLY_API_TOKEN);
 rollbackOperation='GHCR immutable manifest/config GET';
 const predecessor=await registryImage('ghcr.io','roger-legalease/rcap-render-worker',m.acceptedDigest,'x-access-token:'+process.env.GITHUB_TOKEN);
 const mirrorEquivalence=assertRegistryMirrorEquivalent(mirror,predecessor);
 const oldConfig=execFileSync('git',['show',m.ociRevision+':deploy/rcap-render-worker/fly.toml']);assert(oldConfig.equals(fs.readFileSync('deploy/rcap-render-worker/fly.toml')),'unchanged worker configuration');
 write('worker-rollback',{passed:true,readOnly:true,capturedAt:fly.capturedAt,machine:m,mirror,predecessor,mirrorEquivalence,procedure:`After separately authorized activation, restore only machine ${m.id} image to ${mirror.reference} using the existing machine configuration preserved in place, restoring only the image and its recorded predecessor digest identity, then verify started state, OCI revision and health. No schema, secrets or application settings require mutation to restore the predecessor. Preserve the predecessor RCAP_WORKER_CONTAINER_DIGEST=${m.acceptedDigest}; changing only image on a successor config would retain the wrong evidence identity.`,configurationRequired:'Same committed fly.toml; restore image and its exact recorded digest identity only, no schema/secret/settings changes',flyConfigurationSha256:hash(oldConfig),workerDeploymentRequired:m.ociRevision!==p.workerSourceSha});
 workerRollbackVerified=true;
}catch(error){workerRollbackVerified=false;write('worker-rollback',{passed:false,readOnly:true,reason:error.message,operation:rollbackOperation,transportCode:error.cause?.code??null});}
// Existing aggregate queue query, explicitly read-only; no job is claimed.
const queueResponse=await fetch('https://api.supabase.com/v1/projects/wwtwtsmywnckfkdaqqeg/database/query',{method:'POST',headers:{Authorization:'Bearer '+process.env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({query:QUEUE_QUERY,read_only:true}),redirect:'error',signal:AbortSignal.timeout(60000)});
assert(queueResponse.ok,`read-only queue HTTP ${queueResponse.status}`);const queueRows=await queueResponse.json();assert(Array.isArray(queueRows)&&queueRows.length===1);const queue=queueRows[0];
for(const key of ['stale_queued','queued','claimed','terminal_failed'])assert(/^(0|[1-9][0-9]*)$/.test(String(queue[key]))&&Number(queue[key])===0,`safe empty queue: ${key}`);
write('queue-safety',{passed:true,readOnly:true,capturedAt:new Date().toISOString(),projectRef:'wwtwtsmywnckfkdaqqeg',queue});
const token=process.env.VERCEL_TOKEN;assert(token);const identity=await resolveHostedVercelIdentity({token});
async function vercel(pathname){const r=await fetch(hostedVercelScopedUrl(pathname,identity),{method:'GET',headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(60000)});assert(r.ok,`Vercel GET HTTP ${r.status}`);return r.json();}
const rollback='dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc';
async function aliases(){return productionDeploymentAliases(await vercel(`/v3/deployments/${rollback}/aliases`));}
const before=await aliases();write('production-aliases-before',before);
const projectInventoryBefore=await vercel(productionDomainsPath(identity.projectId));const domainsBefore=productionProjectDomains(projectInventoryBefore);write('production-project-domains-before',domainsBefore);write('project-domain-verification',projectInventoryBefore.domains.map(d=>({name:d.name,verified:d.verified??null})));
for(const domain of domainsBefore.filter(d=>d.redirect===null)){const live=await vercel('/v13/deployments/'+domain.name);assert.equal(live.id,rollback,'all direct Production domains remain on predecessor');}
const current=await vercel(`/v13/deployments/${rollback}`);assert.equal(current.readyState,'READY');assert.equal(current.gitSource?.sha??current.meta?.githubCommitSha,'e312a5efa7b4882e0fbf61a5ff0ae7891ac23226');
const project=await vercel(`/v9/projects/${identity.projectId}`);assert.equal(project.name,HOSTED_VERCEL_PROJECT_NAME);assert.equal(project.link?.productionBranch,'main');
write('project-configuration',{projectId:project.id,productionBranch:project.link.productionBranch,nodeVersion:project.nodeVersion,framework:project.framework,buildCommand:project.buildCommand,installCommand:project.installCommand,outputDirectory:project.outputDirectory,productionConfigInherited:true,envOverrides:false});
// Verify the exact already-created Preview by id AND immutable hostname.
const byId=await vercel('/v13/deployments/'+previewCreation.deploymentId);
const d=await vercel('/v13/deployments/'+previewCreation.hostname);
for(const observed of [byId,d])assertPreviewDeployment(observed,tuple,previewCreation,{aliases:before,domains:domainsBefore});
const candidateAliases=await vercel(`/v3/deployments/${d.id}/aliases`);assert(!candidateAliases.pagination?.next,'complete Preview alias inventory');
for(const a of candidateAliases.aliases??[]){assert(!before.some(p=>p.alias===a.alias),'no Production alias on Preview');assert(!domainsBefore.some(p=>p.name===a.alias),'no Production project domain on Preview');}
write('candidate-aliases',candidateAliases);write('candidate-reuse',previewCreation);
write('candidate-ready',{id:d.id,url:d.url,target:d.target,readyState:d.readyState,applicationSha:d.gitSource.sha,projectId:d.projectId,meta:Object.fromEntries(['rcapApplicationSha','rcapWorkerSourceSha','rcapWorkerDigest','rcapWorkerInputFingerprint','rcapAcceptanceProjectRef'].map(k=>[k,d.meta[k]]))});
const envShape=body=>{assert(Array.isArray(body.envs)&&!body.pagination?.next,'complete Production env inventory');return body.envs.filter(e=>(e.target??[]).includes('production')).map(e=>({id:e.id,key:e.key,target:e.target,updatedAt:e.updatedAt,type:e.type})).sort((a,b)=>a.key.localeCompare(b.key));};
const environmentBefore=envShape(await vercel(`/v9/projects/${identity.projectId}/env?decrypt=false`));write('production-environment-before',environmentBefore);
const origin='https://'+d.url;
process.env.RCAP_STAGED_ORIGIN=origin;
let browserFailure;
try{execFileSync(process.execPath,['scripts/rcap-successor-staged-browser.mjs'],{stdio:'inherit',env:process.env});}catch(error){browserFailure=error;}

const after=await aliases();write('production-aliases-after',after);const domainsAfter=productionProjectDomains(await vercel(productionDomainsPath(identity.projectId)));write('production-project-domains-after',domainsAfter);assertVercelProductionScopes(after,domainsAfter,{productionDeploymentAliases:before,productionProjectDomains:domainsBefore});
for(const domain of domainsAfter.filter(d=>d.redirect===null)){const live=await vercel('/v13/deployments/'+domain.name);assert.equal(live.id,rollback,'all direct Production domains remain on predecessor after staging');}
for(const a of before.filter(a=>!a.redirect)){const live=await vercel('/v13/deployments/'+a.alias);assert.equal(live.id,rollback,'all existing public aliases remain on predecessor');}
const environmentAfter=envShape(await vercel(`/v9/projects/${identity.projectId}/env?decrypt=false`));write('production-environment-after',environmentAfter);assert.deepEqual(environmentAfter,environmentBefore,'Production environment unchanged');
assertPreviewDeployment(await vercel('/v13/deployments/'+d.id),tuple,previewCreation,{aliases:after,domains:domainsAfter});
if(browserFailure)throw browserFailure;
const browser=JSON.parse(fs.readFileSync(`${out}/browser-results.json`));assert.equal(browser.length,4);assert(browser.every(r=>r.status==='PASS'));
const admission={schemaVersion:PREVIEW_ADMISSION_SCHEMA,capturedAt:new Date().toISOString(),...tuple,closureControlSha:candidate.closureControl.sourceSha,previewCreation,workerRollbackVerified,queueSafetyVerified:true,sharedHostRoutingMethod:'frozen-proxy-map-and-staged-targets',workflowSourceSha,runId:Number(process.env.GITHUB_RUN_ID),deploymentId:d.id,hostname:d.url,projectId:d.projectId,acceptanceProjectRef:ACCEPTANCE_PROJECT,productionRollback:rollback,productionDeploymentAliases:before,productionProjectDomains:domainsBefore,productionDeploymentAliasesUnchanged:true,productionProjectDomainsUnchanged:true,productionEnvironmentUnchanged:true,projectLevelProductionEnvironmentMutations:0,autoAssignCustomDomains:false,signupVerified:true,sharedHostRoutingVerified:true,productionWrites:false,target:d.target,readyState:d.readyState,liveAuthCalls:0,productionAuthorized:false,newDeploymentCreated:false,workerClaims:0,realPayments:0,participantWrites:0,emailDelivery:'UNVERIFIED: all authentication mocked',hostedScope:'read-only existing acceptance Preview, mocked signup, frozen host routing and aggregate queue safety'};
assertPreviewClosureDocuments(admission,name=>JSON.parse(fs.readFileSync(`${out}/${name}`)));
write('admission',admission);
console.log('Exact existing Preview closure PASS; no deployment creation, Production writes, live auth, payments, participant writes or worker claims.');
