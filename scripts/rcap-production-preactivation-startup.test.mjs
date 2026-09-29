import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {parse} from 'yaml';
import {requireProductionPhaseAuthorization} from './grade-a-launch-control/production-preflight-authorization.mjs';
import {verifyProductionPreflightEvidence} from './grade-a-launch-control/verify-production-preflight-evidence.mjs';
const candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
const publication=JSON.parse(fs.readFileSync('data/rcap-render/worker-publication-evidence.json'));
const worker=parse(fs.readFileSync('.github/workflows/deploy-rcap-render-worker-production.yml','utf8')).jobs.deploy.steps;
const keys=parse(fs.readFileSync('.github/workflows/rcap-f1-ephemeral-staging.yml','utf8')).jobs.production_legal_aid_keys.steps;
const guard=worker.find(s=>s.name==='Refuse any worker identity outside the frozen candidate');
function workerGuard(c=candidate,sha=c.workerSourceSha,digest=c.workerDigest,p=publication){
 const code=guard.run.split("<<'JS'\n")[1].split('\nJS')[0].replace(/^import .*;\n/gm,'');
 const context={JSON,process:{env:{INPUT_WORKER_SOURCE_SHA:sha,INPUT_WORKER_DIGEST:digest},cwd:()=>process.cwd()},
  fs:{readFileSync:rel=>JSON.stringify(rel.includes('RELEASE_CANDIDATE')?c:p)},requireProductionPhaseAuthorization,verifyProductionPreflightEvidence,console:{log:()=>{}}};
 return vm.runInNewContext(code,context);
}
test('worker guard executes accepted immutable source/digest and native preflight without a service',()=>workerGuard());
for(const [label,change]of [
 ['source',()=>workerGuard(candidate,'0'.repeat(40))],['digest',()=>workerGuard(candidate,candidate.workerSourceSha,'sha256:'+'0'.repeat(64))],
 ['not accepted',()=>{const p=structuredClone(publication);p.runtimeAccepted=false;workerGuard(candidate,undefined,undefined,p);}],
 ['wrong publication',()=>{const p=structuredClone(publication);p.immutableRegistryDigest='wrong';workerGuard(candidate,undefined,undefined,p);}],
 ['activation permission',()=>{const c=structuredClone(candidate);c.productionAuthorization.phases.push('activate');workerGuard(c);}],
 ['old permission',()=>workerGuard(candidate.supersededRecord)],
])test(`worker deployment refuses ${label} before registry access`,()=>assert.throws(change));
for(const [name,steps,stop]of [['worker',worker,'Pull the accepted worker by immutable digest and read back its identity'],['keys',keys,'Read, or create once, the Production Legal Aid keys']])test(`${name}: explicit Node 22 and dependency-free guards precede first service`,()=>{
 const setup=steps.findIndex(s=>s.uses==='actions/setup-node@v4'),boundary=steps.findIndex(s=>s.name===stop);
 assert.ok(setup>=0&&setup<boundary);assert.equal(steps[setup].with['node-version'],22);assert.equal(steps[setup].if,undefined);
 assert.equal(steps.filter(s=>s.run?.trim()==='npm ci').length,0,'native-only startup needs no external packages');
 const auth=steps.findIndex(s=>s.run?.includes('requireProductionPhaseAuthorization(candidate,'));assert.ok(auth>setup&&auth<boundary);
 assert.match(steps[auth].run,/verifyProductionPreflightEvidence\(process.cwd\(\)\)/);assert.equal(steps[auth].if,undefined);
});
for(const phase of ['read','create'])test(`Legal Aid ${phase}: actual module startup reaches only an intercepted first service boundary`,()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-keys-boundary-'));
 try{
  const boundaryPath=path.join(dir,'intercepted-boundary.json');
  // A caught refusal exits the child immediately; pipe-backed console output
  // need not flush. Persist the intercepted call before throwing instead.
  const code=`import fs from 'node:fs';const calls=[];globalThis.fetch=async(url,options={})=>{calls.push({url:String(url),method:options.method??'GET',hasBody:options.body!==undefined});fs.writeFileSync(${JSON.stringify(boundaryPath)},JSON.stringify(calls));throw new Error('LOCAL_REHEARSAL_STOP_BEFORE_SERVICE');};await import('./scripts/rcap-production-legal-aid-keys.mjs');`;

  const result=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',env:{PATH:process.env.PATH,RCAP_LEGAL_AID_KEYS_PHASE:phase,VERCEL_TOKEN:'local-placeholder-not-a-credential',RCAP_PRODUCTION_EVIDENCE_DIR:dir}});
  assert.ifError(result.error);assert.equal(result.status,1);
  const calls=JSON.parse(fs.readFileSync(boundaryPath,'utf8'));assert.equal(calls.length,1);assert.equal(calls[0].method,'GET');assert.equal(calls[0].hasBody,false);
  const target=new URL(calls[0].url);assert.equal(target.origin,'https://api.vercel.com');assert.equal(target.pathname,'/v9/projects/legalease-partner-dashboard-clean');assert.equal(target.searchParams.get('teamId'),'team_4qLmZK9WI6xIy5vjYC0IF3ae');
  const evidence=JSON.parse(fs.readFileSync(path.join(dir,`production-legal-aid-keys-${phase}.json`),'utf8'));
  assert.equal(evidence.passed,false);assert.equal(evidence.failure,'Vercel identity read failed or timed out');
  for(const flag of ['secretValuesIncluded','environmentVariableCreated','environmentVariableOverwritten','deploymentTriggered','aliasChanged','productionDatabaseMutated'])assert.equal(evidence[flag],false,flag);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
for(const phase of ['activate','public_verify','live_zero_dollar_order','unknown'])test(`Legal Aid refuses ${phase} before any transport`,()=>{
 const code=`globalThis.fetch=()=>{throw new Error('UNEXPECTED_TRANSPORT');};await import('./scripts/rcap-production-legal-aid-keys.mjs');`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',env:{PATH:process.env.PATH,RCAP_LEGAL_AID_KEYS_PHASE:phase}});
 assert.notEqual(result.status,0);assert.match(result.stderr,/production_phase_not_authorized_for_current_release/);assert.doesNotMatch(result.stderr,/UNEXPECTED_TRANSPORT/);
});
