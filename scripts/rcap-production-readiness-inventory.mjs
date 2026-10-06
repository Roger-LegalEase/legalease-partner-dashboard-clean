// Read-only inventory for the existing GitHub Actions secret context. No value,
// raw environment entry, full Machine configuration, or response body is logged.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {requireProductionPhaseAuthorization} from './grade-a-launch-control/production-preflight-authorization.mjs';
import {verifyProductionPreflightEvidence} from './grade-a-launch-control/verify-production-preflight-evidence.mjs';
import {resolveHostedVercelIdentity,hostedVercelScopedUrl} from './rcap-hosted-acceptance-vercel-identity.mjs';

export const APP='legalease-rcap-render-worker';
export const KEY_NAMES=['LEGAL_AID_RESTRICTED_FIELD_KEY','LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION','PARTICIPANT_PRIVACY_PSEUDONYM_SECRET'];
export async function collectReadinessInventory({candidate,vercelToken,flyToken,fetchImpl=fetch,readSecretNames}){
 for(const phase of ['legal_aid_keys_read','production_worker_deploy','smoke'])requireProductionPhaseAuthorization(candidate,phase);
 if(!vercelToken||!flyToken)throw Error('GitHub-held inventory credentials required');
 const identity=await resolveHostedVercelIdentity({token:vercelToken,fetchImpl});
 async function get(url,token){
  const r=await fetchImpl(url,{method:'GET',redirect:'error',headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error(`read-only inventory HTTP ${r.status}`);
  return r.json();
 }
 const vercel=p=>get(hostedVercelScopedUrl(p,identity),vercelToken);
 const listing=await vercel(`/v9/projects/${identity.projectId}/env?decrypt=false`);
 if(!Array.isArray(listing.envs))throw Error('environment names unavailable');
 const productionKeys=listing.envs.filter(x=>KEY_NAMES.includes(x.key)&&x.target?.includes('production')).map(x=>({name:x.key,type:x.type,targets:x.target,id:x.id}));
 const deployments=[];
 for(const id of [candidate.productionAuthorization.stagedDeploymentId,candidate.productionAuthorization.rollbackDeploymentId]){
  const d=await vercel(`/v13/deployments/${id}`);
  if(d.id!==id||d.projectId!==identity.projectId)throw Error('deployment identity mismatch');
  deployments.push({id:d.id,projectId:d.projectId,target:d.target,readyState:d.readyState,url:d.url,
   metadata:Object.fromEntries(Object.entries(d.meta??{}).filter(([k])=>['rcapApplicationSha','rcapWorkerSourceSha','rcapWorkerDigest','rcapSupabaseProjectRef','githubCommitSha'].includes(k)))});
 }
 const domains=await vercel(`/v9/projects/${identity.projectId}/domains`);
 if(!Array.isArray(domains.domains)||domains.pagination?.next)throw Error('complete domain inventory required');
 const publicDomains=[];
 for(const d of domains.domains.filter(d=>d.gitBranch==null)){
  const deployment=await vercel(`/v13/deployments/${encodeURIComponent(d.name)}`);
  publicDomains.push({hostname:d.name,deploymentId:deployment.id,projectId:deployment.projectId});
 }
 const machines=await get(`https://api.machines.dev/v1/apps/${APP}/machines`,flyToken);
 if(!Array.isArray(machines))throw Error('Machine inventory unavailable');
 const names=await readSecretNames();
 if(!Array.isArray(names)||names.some(x=>typeof x!=='string'))throw Error('secret-name inventory unavailable');
 return {schemaVersion:'rcap-production-readiness-inventory/v1',capturedAt:new Date().toISOString(),readOnly:true,secretValuesIncluded:false,
  applicationSha:candidate.applicationSha,workerSourceSha:candidate.workerSourceSha,workerDigest:candidate.workerDigest,
  productionKeys,keyDisposition:KEY_NAMES.every(n=>productionKeys.filter(x=>x.name===n).length===1)?'PRESENT_REQUIRES_TYPE_CHECK':'MISSING_OR_DUPLICATE_REQUIRES_REVIEW',
  deployments,publicDomains,worker:{app:APP,secretNames:[...new Set(names)].sort(),machines:machines.map(m=>({id:m.id,state:m.state,
   imageDigest:m.image_ref?.digest??null,ociRevision:m.image_ref?.labels?.['org.opencontainers.image.revision']??null,
   acceptedDigest:m.config?.env?.RCAP_WORKER_CONTAINER_DIGEST??null,partnerDataEnabled:m.config?.env?.ENABLE_SUPABASE_PARTNER_DATA==='true',
   restartPolicy:m.config?.restart?.policy??null,memoryMb:m.config?.guest?.memory_mb??null,inboundServiceCount:m.config?.services?.length??0}))}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
  verifyProductionPreflightEvidence(process.cwd());
  const result=await collectReadinessInventory({candidate,vercelToken:process.env.VERCEL_TOKEN,flyToken:process.env.FLY_API_TOKEN,
   readSecretNames:()=>JSON.parse(execFileSync('flyctl',['secrets','list','--app',APP,'--json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']})).map(x=>x.Name??x.name)});
  fs.mkdirSync('production-canary-evidence',{recursive:true});
  fs.writeFileSync('production-canary-evidence/production-readiness-inventory.json',JSON.stringify(result,null,2)+'\n');
  console.log('Read-only Fly/Vercel inventory recorded; secret values excluded. Review required; no mutation performed.');
 }catch{console.error('Read-only inventory failed; no raw response or credential emitted.');process.exitCode=1;}
}
