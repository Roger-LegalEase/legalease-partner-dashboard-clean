import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {parse} from 'yaml';
import {requireProductionPhaseAuthorization} from './rcap-production-migration-contract.mjs';

const workflowPath='.github/workflows/rcap-production-canary.yml';
const base='4fd9a89707257927218c185e90006be348ac3d58';
const document=parse(fs.readFileSync(workflowPath,'utf8'));
const steps=document.jobs.preflight.steps;
const phases=document.on.workflow_call.inputs.phase.description.split(', or ').join(', ').split(', ');
const gate='node scripts/rcap-production-migration-contract.mjs';
const readCandidate=()=>JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
function verifyOrder(list){
 const setup=list.findIndex(s=>s.uses==='actions/setup-node@v4');
 const checkout=list.findIndex(s=>s.uses==='actions/checkout@v4');
 const installs=list.map((s,i)=>s.run?.trim()==='npm ci'?i:-1).filter(i=>i>=0);
 const verifier=list.findIndex(s=>s.run?.includes(gate));
 assert.equal(installs.length,1,'one frozen install shared by every phase');
 assert.ok(checkout>=0&&checkout<setup&&setup<installs[0]&&installs[0]<verifier,'checkout -> Node -> dependencies -> verifier');
 for(const i of [setup,installs[0],verifier]){
  assert.equal(list[i].if,undefined,'prerequisites and authorization unconditional');
  assert.equal(list[i]['continue-on-error'],undefined,'no ignored prerequisite or authorization failure');
 }
 for(const [i,s]of list.entries())if(s.env&&Object.keys(s.env).some(k=>/TOKEN|SECRET/.test(k))||/docker (login|pull)|node scripts\/rcap-production-(?:canary|clinic-migrate|forward-chain-migrate|legal-aid-migrate|activate)\.mjs/.test(s.run??'')){
  assert.ok(i>verifier,'phase authorization before service access');
 }
 return {setup,install:installs[0],verifier};
}

test('run 36596128309 dependency-order failure is detected on untouched Captain YAML',()=>{
 const prior=parse(execFileSync('git',['show',`${base}:${workflowPath}`],{encoding:'utf8'}));
 assert.throws(()=>verifyOrder(prior.jobs.preflight.steps));
 const old=prior.jobs.preflight.steps;
 assert.ok(old.findIndex(s=>s.run?.includes(gate))<old.findIndex(s=>s.uses==='actions/setup-node@v4'));
 assert.ok(old.filter(s=>s.run?.trim()==='npm ci').every(s=>s.if&&!s.if.includes("'preflight'")));
});
for(const phase of phases)test(`${phase}: clean runner installs once before verifier; unauthorized phase stops before services`,()=>{
 const order=verifyOrder(steps);
 // Model only setup/install/gate. Never run a Production script or a service.
 let node=false,installed=false,installCount=0;
 for(let i=0;i<=order.verifier;i++){
  if(i===order.setup)node=true;
  if(i===order.install){assert.ok(node);installed=true;installCount++;}
  if(i===order.verifier){
   assert.ok(node&&installed,'verifier must load with dependencies');
   const c=readCandidate();
   if(['preflight','restage','clinic_migrate','forward_chain_readback','forward_chain_migrate','legal_aid_readback','legal_aid_migrate','smoke'].includes(phase))assert.equal(requireProductionPhaseAuthorization(c,phase),c.productionAuthorization);
   else assert.throws(()=>requireProductionPhaseAuthorization(c,phase),{message:'production_phase_not_authorized_for_current_release'});
  }
 }
 assert.equal(installCount,1);
});
for(const [name,mutate]of [
 ['late Node setup',s=>{const i=s.findIndex(x=>x.uses==='actions/setup-node@v4');s.push(...s.splice(i,1));}],
 ['late dependency install',s=>{const i=s.findIndex(x=>x.run?.trim()==='npm ci');s.push(...s.splice(i,1));}],
 ['conditional install excludes preflight',s=>{s.find(x=>x.run?.trim()==='npm ci').if="inputs.phase == 'clinic_migrate'";}],
 ['duplicate smoke install',s=>s.push({if:"inputs.phase == 'smoke'",run:'npm ci'})],
 ['ignored install failure',s=>{s.find(x=>x.run?.trim()==='npm ci')['continue-on-error']=true;}],
 ['service before authorization',s=>s.unshift({run:'docker pull example.invalid/image'})],
 ['conditional authorization bypass',s=>{s.find(x=>x.run?.includes(gate)).if="inputs.phase == 'preflight'";}],
])test(`workflow mutation refuses ${name}`,()=>{const changed=structuredClone(steps);mutate(changed);assert.throws(()=>verifyOrder(changed));});

test('clean isolated module load reproduces missing TypeScript; frozen local package resolves it without running preflight',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-production-order-import-'));
 try{
  const rel='scripts/rcap-application-inputs.mjs';
  fs.mkdirSync(path.join(root,'scripts'));fs.copyFileSync(rel,path.join(root,rel));
  const load=()=>spawnSync(process.execPath,['--input-type=module','-e',`await import('./${rel}');`],{cwd:root,encoding:'utf8',env:{PATH:process.env.PATH}});
  let result=load();assert.notEqual(result.status,0);assert.match(result.stderr,/ERR_MODULE_NOT_FOUND/);assert.match(result.stderr,/Cannot find package 'typescript'/);
  const require=createRequire(import.meta.url);
  const packagePath=require.resolve('typescript/package.json');
  const lock=JSON.parse(fs.readFileSync('package-lock.json'));
  assert.equal(JSON.parse(fs.readFileSync(packagePath)).version,lock.packages['node_modules/typescript'].version);
  // Local package materialization only: no npm/network or Production execution.
  // verifyOrder independently requires the real workflow's exact npm ci command.
  fs.mkdirSync(path.join(root,'node_modules'));fs.cpSync(path.dirname(packagePath),path.join(root,'node_modules/typescript'),{recursive:true});
  result=load();assert.equal(result.status,0,result.stderr);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('lockfile and application dependency declarations retain exact approved bytes',()=>{
 for(const rel of ['package.json','package-lock.json']){
  assert.deepEqual(fs.readFileSync(rel),execFileSync('git',['show',`${base}:${rel}`],{maxBuffer:32*1024*1024}));
 }
});
