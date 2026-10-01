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
   else if(phase==='activate'){
    assert.throws(()=>requireProductionPhaseAuthorization(c,phase),{message:'production_activate_authorization_consumed'});
    const historical=JSON.parse(execFileSync('git',['show','47d2f0b87e6dcda358f8f24a8c0eca71bfd02b6a:data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'],{encoding:'utf8'}));
    assert.equal(requireProductionPhaseAuthorization(historical,phase),historical.productionAuthorization);
    delete c.productionAuthorization.activation;
    assert.throws(()=>requireProductionPhaseAuthorization(c,phase),{message:'production_phase_not_authorized_for_current_release'});
   }
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

const publicWorkflowPath='.github/workflows/rcap-f1-ephemeral-staging.yml';
const publicBase='994606291c25a9dfcf4b8b5dc3a44b01f17e2ae8';
const publicDocument=parse(fs.readFileSync(publicWorkflowPath,'utf8'));
const publicSteps=publicDocument.jobs.production_public_verify.steps;
function verifyPublicOrder(list){
 const only=(predicate,label)=>{const matches=list.map((s,i)=>predicate(s)?i:-1).filter(i=>i>=0);assert.equal(matches.length,1,`exactly one ${label}`);return matches[0];};
 const checkout=only(s=>s.uses==='actions/checkout@v4','checkout');
 const ancestry=only(s=>s.name==='Verify ancestry of every pinned SHA and check out the tools commit','ancestry/tools checkout');
 assert.match(list[ancestry].run,/git merge-base --is-ancestor/);
 assert.match(list[ancestry].run,/git checkout --detach "\$\{\{ inputs.tools_sha \}\}"/);
 const setup=only(s=>s.uses==='actions/setup-node@v4','Node setup');
 const install=only(s=>s.run?.trim()==='npm ci','npm ci');
 const authorization=only(s=>s.run?.includes(gate),'authorization gate');
 assert.match(list[authorization].run,/node scripts\/verify-rcap-worker-input-equivalence\.mjs --base "\$\{\{ inputs.worker_source_sha \}\}" --head "\$\{\{ inputs.tools_sha \}\}"/);
 const verifier=only(s=>s.run?.trim()==='node scripts/rcap-production-public-verify.mjs','public verifier');
 assert.ok(checkout<ancestry&&ancestry<setup&&setup<install&&install<authorization&&authorization<verifier,'checkout -> exact tools -> Node -> npm ci -> authorization -> public verification');
 for(const i of [setup,install,authorization]){assert.equal(list[i].if,undefined,'unconditional prerequisite');assert.equal(list[i]['continue-on-error'],undefined,'no ignored failure');}
 for(const [i,s]of list.entries()){
  const secrets=Object.entries(s.env??{}).filter(([k,v])=>/TOKEN|SECRET|KEY/.test(k)||/secrets\./.test(String(v)));
  if(secrets.length||/rcap-production-public-verify|\bcurl\b|\bwget\b|\bfetch\(|\bvercel\b|\bsupabase\b|\bstripe\b|docker (?:pull|run|login)/i.test(s.run??''))assert.ok(i>authorization,'authorization before any service access or credential');
  for(const [key]of secrets){assert.equal(i,verifier,'credentials only on verifier');assert.equal(key,'VERCEL_TOKEN','only Vercel service credential');}
 }
 return {checkout,ancestry,setup,install,authorization,verifier};
}
test('public verification: committed predecessor fails ordering; corrected job authorizes before service access',()=>{
 const prior=parse(execFileSync('git',['show',`${publicBase}:${publicWorkflowPath}`],{encoding:'utf8'}));
 assert.throws(()=>verifyPublicOrder(prior.jobs.production_public_verify.steps),/checkout -> exact tools/);
 verifyPublicOrder(publicSteps);
 assert.equal(publicDocument.jobs.production_public_verify.env.VERCEL_TOKEN,undefined);
 // Only the step order changes; every original step and every other job remain exact.
 const reordered=structuredClone(prior);
 const old=reordered.jobs.production_public_verify.steps;
 const gateIndex=old.findIndex(s=>s.run?.includes(gate));
 const [gateStep]=old.splice(gateIndex,1);old.splice(gateIndex+2,0,gateStep);
 // Preserve the historical closure assertion against its immutable successor.
 const closed=parse(execFileSync('git',['show',`acdc8e76671445f7d86e9842c103ac57961522eb:${publicWorkflowPath}`],{encoding:'utf8'}));
 assert.deepEqual(closed,reordered);
 assert.deepEqual(publicDocument.jobs.production_public_verify,closed.jobs.production_public_verify);
});
const moveBefore=(s,what,before)=>{const i=s.findIndex(what),[step]=s.splice(i,1);s.splice(s.findIndex(before),0,step);};
const isGate=s=>s.run?.includes(gate),isSetup=s=>s.uses==='actions/setup-node@v4',isInstall=s=>s.run?.trim()==='npm ci',isPublic=s=>s.run?.trim()==='node scripts/rcap-production-public-verify.mjs';
for(const [name,mutate]of [
 ['gate before setup',s=>moveBefore(s,isGate,isSetup)],
 ['gate before npm ci',s=>moveBefore(s,isGate,isInstall)],
 ['missing npm ci',s=>s.splice(s.findIndex(isInstall),1)],
 ['conditional npm ci',s=>s.find(isInstall).if='false'],
 ['duplicate npm ci',s=>s.push({run:'npm ci'})],
 ['ignored npm ci failure',s=>s.find(isInstall)['continue-on-error']=true],
 ['missing setup',s=>s.splice(s.findIndex(isSetup),1)],
 ['late setup',s=>{const [step]=s.splice(s.findIndex(isSetup),1);s.push(step);}],
 ['early Vercel token',s=>s[0].env.VERCEL_TOKEN='${{ secrets.VERCEL_TOKEN }}'],
 ['early public verifier',s=>moveBefore(s,isPublic,isGate)],
 ['conditional gate',s=>s.find(isGate).if='false'],
 ['missing worker equivalence',s=>s.find(isGate).run=gate],
 ['early public GET',s=>s.unshift({run:'curl https://expungement.ai'})],
 ['conditional setup',s=>s.find(isSetup).if='false'],
 ['ignored setup failure',s=>s.find(isSetup)['continue-on-error']=true],
 ['ignored gate failure',s=>s.find(isGate)['continue-on-error']=true],
 ['missing checkout',s=>s.splice(s.findIndex(x=>x.uses==='actions/checkout@v4'),1)],
 ['missing tools checkout',s=>s.find(x=>x.name==='Verify ancestry of every pinned SHA and check out the tools commit').run='git status'],
])test(`public workflow mutation refuses ${name}`,()=>{const s=structuredClone(publicSteps);mutate(s);assert.throws(()=>verifyPublicOrder(s));});

const packetDispatcher=parse(fs.readFileSync(publicWorkflowPath,'utf8'));
const packetJob=packetDispatcher.jobs.production_packet_canary;
function verifyPacketOrder(job){
 assert.equal(job.if,"inputs.mode == 'production_packet_canary'");
 assert.equal(job.env.RCAP_PRODUCTION_PHASE,'packet_canary');
 assert.equal(job.env.RCAP_PRODUCTION_DEPLOYMENT_ID,'dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc');
 assert.equal(job.env.RCAP_PRODUCTION_PROJECT_REF,'wwtwtsmywnckfkdaqqeg');
 assert.equal(job.env.RCAP_PROBE_BROWSERS,'chromium');
 assert.equal(job.concurrency['cancel-in-progress'],false);
 assert.ok(!JSON.stringify(job.env).includes('secrets.')&&!JSON.stringify(job.env).includes('inputs.promotion_code'));
 const s=job.steps;const gateIndex=s.findIndex(x=>x.run?.includes(gate));
 const install=s.findIndex(x=>x.run==='npm ci');const setup=s.findIndex(x=>x.uses==='actions/setup-node@v4');
 assert.ok(gateIndex>install&&install>setup&&setup>s.findIndex(x=>x.uses==='actions/checkout@v4'));
 for(const i of [setup,install,gateIndex]){assert.equal(s[i].if,undefined);assert.equal(s[i]['continue-on-error'],undefined);}
 const execution=s.findIndex(x=>x.run?.includes('node scripts/rcap-production-save-transition-probe.mjs'));
 assert.ok(execution>gateIndex);
 for(const [i,x]of s.entries())if(JSON.stringify(x.env??{}).includes('secrets.')||JSON.stringify(x.env??{}).includes('inputs.promotion_code'))assert.ok(i>gateIndex,'no service secret or bearer code before gate');
 assert.equal(s[execution].if,undefined);assert.equal(s[execution]['continue-on-error'],undefined);
 assert.ok(s[execution].run.indexOf('::add-mask::')<s[execution].run.indexOf('node scripts/'));
 assert.equal(s[execution].env.RCAP_RESUME_MATTER_ID,'${{ inputs.resume_matter_id }}');
 const text=JSON.stringify(job);
 for(const stale of ['fe2457a71dd90d0fb83d0ed2738fcd1e6566d76e','a22ad8559df69563a4f8b055e0efcb15de128e5ce09d75325abcbf783adff905','dpl_BJMUzi76BWPUbnnxE8Doim6hwkiP','preview_hostname','STRIPE_SECRET_KEY','VERCEL_TOKEN','production_worker_deploy'])assert.ok(!text.includes(stale),stale);
 for(const exact of ['e312a5efa7b4882e0fbf61a5ff0ae7891ac23226','5e04eafd7eaed7e71722862e651fb787ebbd296d','sha256:6b6a60fc5b2d0060028526013ce37c69f748e2cccb4cfb10943f2af6cf26cfe1'])assert.ok(text.includes(exact));
}
test('dedicated current-release packet canary is selectable, secret-free until its real refusing gate',()=>{
 assert.ok(packetDispatcher.on.workflow_dispatch.inputs.mode.options.includes('production_packet_canary'));verifyPacketOrder(packetJob);
 let secretReached=false;
 assert.throws(()=>{requireProductionPhaseAuthorization(readCandidate(),'packet_canary');secretReached=true;},{message:'production_phase_not_authorized_for_current_release'});
 assert.equal(secretReached,false);
});
for(const [name,mutate]of [
 ['secret at job scope',j=>j.env.SUPABASE_ACCESS_TOKEN='${{ secrets.SUPABASE_ACCESS_TOKEN }}'],
 ['promotion at job scope',j=>j.env.CODE='${{ inputs.promotion_code }}'],
 ['early secret',j=>j.steps.unshift({env:{FLY_API_TOKEN:'${{ secrets.FLY_API_TOKEN }}'}})],
 ['late dependency',j=>{const i=j.steps.findIndex(s=>s.run==='npm ci');j.steps.push(...j.steps.splice(i,1));}],
 ['conditional gate',j=>j.steps.find(s=>s.run?.includes(gate)).if='false'],
 ['ignored gate',j=>j.steps.find(s=>s.run?.includes(gate))['continue-on-error']=true],
 ['wrong phase',j=>j.env.RCAP_PRODUCTION_PHASE='live_zero_dollar_order'],
 ['historical deployment',j=>j.env.RCAP_PRODUCTION_DEPLOYMENT_ID='dpl_BJMUzi76BWPUbnnxE8Doim6hwkiP'],
 ['parallel browser',j=>j.env.RCAP_PROBE_BROWSERS='chromium,webkit'],
 ['cancel in progress',j=>j.concurrency['cancel-in-progress']=true],
])test(`packet workflow mutation: ${name}`,()=>{const j=structuredClone(packetJob);mutate(j);assert.throws(()=>verifyPacketOrder(j));});
test('historical live-order job retains its identities and authority unchanged',()=>{
 const old=parse(execFileSync('git',['show','acdc8e76671445f7d86e9842c103ac57961522eb:'+publicWorkflowPath],{encoding:'utf8'}));
 assert.deepEqual(packetDispatcher.jobs.production_save_transition,old.jobs.production_save_transition);
 const without=structuredClone(packetDispatcher);delete without.jobs.production_packet_canary;
 without.on.workflow_dispatch.inputs.mode.options=without.on.workflow_dispatch.inputs.mode.options.filter(m=>m!=='production_packet_canary');
 without.on.workflow_dispatch.inputs.resume_matter_id.description=old.on.workflow_dispatch.inputs.resume_matter_id.description;
 assert.deepEqual(without,old);
});
