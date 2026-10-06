// Exact application staging and GET-only predecessor custody. No activation,
// worker deployment, database credentials, packet generation or live auth.
import assert from 'node:assert/strict';
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
const tuple=Object.fromEntries(['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','toolsSha'].map(k=>[k,p[k]]));
// Rollback availability uses registry GETs only, including challenge token GET.
async function registryImage(host,repo,digest,basic){
 let authorization='Basic '+Buffer.from(basic).toString('base64');
 async function get(url,accept){
  let r=await fetch(url,{method:'GET',headers:{Authorization:authorization,...(accept?{Accept:accept}:{})},redirect:'error',signal:AbortSignal.timeout(30000)});
  if(r.status===401){const challenge=r.headers.get('www-authenticate')??'';const param=k=>new RegExp(k+'="([^"]+)"').exec(challenge)?.[1];const realm=param('realm');assert(realm,'registry challenge');const u=new URL(realm);assert(['ghcr.io','registry.fly.io','api.fly.io'].includes(u.hostname)&&u.protocol==='https:');u.searchParams.set('service',param('service')??host);u.searchParams.set('scope',param('scope')??`repository:${repo}:pull`);const token=await fetch(u,{method:'GET',headers:{Authorization:authorization},redirect:'error'});assert(token.ok,'registry read token');const t=await token.json();authorization='Bearer '+(t.token??t.access_token);r=await fetch(url,{method:'GET',headers:{Authorization:authorization,...(accept?{Accept:accept}:{})},redirect:'follow',signal:AbortSignal.timeout(30000)});}
  assert(r.ok,`registry ${host} GET HTTP ${r.status}`);return Buffer.from(await r.arrayBuffer());
 }
 const bytes=await get(`https://${host}/v2/${repo}/manifests/${digest}`,'application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json');assert.equal(hash(bytes),digest,'immutable manifest digest');let manifest=JSON.parse(bytes);
 if(manifest.manifests){const platform=manifest.manifests.find(m=>m.platform?.os==='linux'&&m.platform?.architecture==='amd64');assert(platform);manifest=JSON.parse(await get(`https://${host}/v2/${repo}/manifests/${platform.digest}`,'application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json'));}
 const config=await get(`https://${host}/v2/${repo}/blobs/${manifest.config.digest}`);assert.equal(hash(config),manifest.config.digest);const parsed=JSON.parse(config);
 return {reference:`${host}/${repo}@${digest}`,manifestDigest:digest,configDigest:manifest.config.digest,layers:manifest.layers.map(l=>l.digest),rootfs:parsed.rootfs.diff_ids,ociRevision:parsed.config?.Labels?.['org.opencontainers.image.revision']??null};
}
try {
 const fly=await readWorkerIdentity({token:process.env.FLY_API_TOKEN});write('fly-identity',fly);assert.equal(fly.machines.length,1);const m=fly.machines[0];assert.equal(m.state,'started');assert.equal(m.ociRevision,'5e04eafd7eaed7e71722862e651fb787ebbd296d');
 const mirror=await registryImage('registry.fly.io',APP,m.imageDigest,'x:'+process.env.FLY_API_TOKEN);
 const predecessor=await registryImage('ghcr.io','roger-legalease/rcap-render-worker',m.acceptedDigest,'x-access-token:'+process.env.GITHUB_TOKEN);
 assert.equal(mirror.configDigest,predecessor.configDigest,'Fly/GHCR config identity');assert.deepEqual(mirror.layers,predecessor.layers,'Fly/GHCR layers');assert.deepEqual(mirror.rootfs,predecessor.rootfs,'Fly/GHCR rootfs');
 const oldConfig=execFileSync('git',['show',m.ociRevision+':deploy/rcap-render-worker/fly.toml']);assert(oldConfig.equals(fs.readFileSync('deploy/rcap-render-worker/fly.toml')),'unchanged worker configuration');
 write('worker-rollback',{passed:true,readOnly:true,capturedAt:fly.capturedAt,machine:m,mirror,predecessor,procedure:`After separately authorized activation, restore only machine ${m.id} image to ${mirror.reference} using the preserved preactivation machine configuration, then verify started state, OCI revision and health. No schema, secrets or application settings require mutation to restore the predecessor. Preserve the predecessor RCAP_WORKER_CONTAINER_DIGEST=${m.acceptedDigest}; changing only image on a successor config would retain the wrong evidence identity.`,configurationRequired:'Same committed fly.toml; restore image and its exact recorded digest identity only, no schema/secret/settings changes',flyConfigurationSha256:hash(oldConfig),workerDeploymentRequired:m.ociRevision!==p.workerSourceSha});
 workerRollbackVerified=true;
}catch(error){workerRollbackVerified=false;write('worker-rollback',{passed:false,readOnly:true,reason:error.message});}
const token=process.env.VERCEL_TOKEN;assert(token);const identity=await resolveHostedVercelIdentity({token});
async function vercel(pathname,body){const r=await fetch(hostedVercelScopedUrl(pathname,identity),{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(60000)});assert(r.ok,`Vercel ${body?'staging POST':'GET'} HTTP ${r.status}`);return r.json();}
const rollback='dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc';
async function aliases(){const d=await vercel(`/v3/deployments/${rollback}/aliases`);assert(Array.isArray(d.aliases)&&!d.pagination?.next);return d.aliases.map(a=>({alias:a.alias,redirect:a.redirect??null})).sort((a,b)=>a.alias.localeCompare(b.alias));}
const before=await aliases();write('production-aliases-before',before);
const current=await vercel(`/v13/deployments/${rollback}`);assert.equal(current.readyState,'READY');assert.equal(current.gitSource?.sha??current.meta?.githubCommitSha,'e312a5efa7b4882e0fbf61a5ff0ae7891ac23226');
const project=await vercel(`/v9/projects/${identity.projectId}`);assert.equal(project.name,HOSTED_VERCEL_PROJECT_NAME);assert.equal(project.link?.productionBranch,'main');
write('project-configuration',{projectId:project.id,productionBranch:project.link.productionBranch,nodeVersion:project.nodeVersion,framework:project.framework,buildCommand:project.buildCommand,installCommand:project.installCommand,outputDirectory:project.outputDirectory,productionConfigInherited:true,envOverrides:false});
const body={name:HOSTED_VERCEL_PROJECT_NAME,project:identity.projectId,gitSource:{type:'github',repoId:'1248656766',ref:p.applicationSha,sha:p.applicationSha},target:'production',autoAssignCustomDomains:false,meta:{rcapStagedProduction:'true',rcapApplicationSha:p.applicationSha,rcapWorkerSourceSha:p.workerSourceSha,rcapWorkerDigest:p.workerDigest,rcapToolsSha:p.toolsSha}};
// Exactly one safe POST. No alias/promotion API exists in this program.
const created=await vercel('/v13/deployments',body);write('candidate-created',{id:created.id,url:created.url,target:created.target,applicationSha:created.gitSource?.sha});assert.match(created.id,/^dpl_/);assert.equal(created.gitSource?.sha,p.applicationSha);assert.equal(created.target,'production');
let d=created;
for(let i=0;i<180&&d.readyState!=='READY';i++){assert(!['ERROR','CANCELED'].includes(d.readyState),'candidate build failed');await new Promise(r=>setTimeout(r,5000));d=await vercel(`/v13/deployments/${created.id}`);}
assert.equal(d.readyState,'READY');assert.equal(d.gitSource?.sha,p.applicationSha);
write('candidate-ready',{id:d.id,url:d.url,target:d.target,readyState:d.readyState,applicationSha:d.gitSource.sha,meta:{rcapApplicationSha:d.meta.rcapApplicationSha,rcapWorkerSourceSha:d.meta.rcapWorkerSourceSha,rcapWorkerDigest:d.meta.rcapWorkerDigest}});
const origin='https://'+d.url;
process.env.RCAP_STAGED_ORIGIN=origin;
execFileSync(process.execPath,['scripts/rcap-successor-staged-browser.mjs'],{stdio:'inherit',env:process.env});
const after=await aliases();write('production-aliases-after',after);assert.deepEqual(after,before,'production aliases unchanged');
for(const a of before.filter(a=>!a.redirect)){const live=await vercel('/v13/deployments/'+a.alias);assert.equal(live.id,rollback,'all existing public aliases remain on predecessor');}
const browser=JSON.parse(fs.readFileSync(`${out}/browser-results.json`));assert.equal(browser.length,4);assert(browser.every(r=>r.status==='PASS'));
write('admission',{schemaVersion:'rcap-readonly-successor-admission/v1',capturedAt:new Date().toISOString(),...tuple,workerRollbackVerified,sharedHostRoutingMethod:'frozen-proxy-map-and-staged-targets',workflowSourceSha,runId:Number(process.env.GITHUB_RUN_ID),deploymentId:d.id,hostname:d.url,productionRollback:rollback,productionAliases:before,productionAliasesUnchanged:true,autoAssignCustomDomains:false,signupVerified:true,sharedHostRoutingVerified:true,productionWrites:false,target:d.target,readyState:d.readyState,liveAuthCalls:0,productionAuthorized:false,emailDelivery:'UNVERIFIED: all authentication mocked',hostedScope:'read-only staged signup and host routing; no live participant, payment, packet or queue exercised'});
console.log('Exact staged application verified; production aliases and worker unchanged.');

assert(workerRollbackVerified,'Nonproduction closure incomplete: worker rollback evidence failed; staging result retained for review');
