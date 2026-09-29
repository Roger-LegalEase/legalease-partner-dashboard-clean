import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PREFLIGHT_BASE,PREFLIGHT_STATUS,PREFLIGHT_NOTE,assertPreflightOnlyAuthorization} from './production-preflight-authorization.mjs';
import {requireProductionPhaseAuthorization,requireProductionDeploymentBinding,requireProductionReleaseTuple} from '../rcap-production-migration-contract.mjs';
import {HOSTED_EVIDENCE_FILES,HOSTED_STATUS} from './verify-hosted-acceptance-evidence.mjs';
const prefix='data/rcap-grade-a/launch-control/';
const candidate=JSON.parse(fs.readFileSync(prefix+'RELEASE_CANDIDATE_BINDING.json'));
const clone=()=>structuredClone(candidate);
const refusal={message:'production_phase_not_authorized_for_current_release'};
const workflow=fs.readFileSync('.github/workflows/rcap-f1-ephemeral-staging.yml','utf8');
const modes=workflow.match(/options: \[([^\n]+)\]/)[1].split(', ').filter(p=>p.startsWith('production_')&&p!=='production_preflight');
const phases=[...new Set([...modes,...modes.map(p=>p.slice('production_'.length)),
 'live_open_payable_checkout','production_live_open_payable_checkout','packet_migrate','deploy','alias','live_order','production_save_transition_*','unknown_future_phase'])];

test('exact frozen tuple authorizes only preflight; Preview remains the Acceptance negative control',()=>{
 assert.equal(candidate.status,PREFLIGHT_STATUS);
 assert.equal(candidate.supersededRecord.status,HOSTED_STATUS);
 assert.deepEqual(candidate.productionAuthorization.phases,['preflight']);
 assert.equal(candidate.productionAuthorization.note,PREFLIGHT_NOTE);
 assert.equal(assertPreflightOnlyAuthorization(candidate),candidate.productionAuthorization);
 assert.equal(requireProductionPhaseAuthorization(candidate,'preflight'),candidate.productionAuthorization);
 assert.equal(requireProductionDeploymentBinding(candidate,'preflight'),candidate.productionAuthorization);
 const tools=JSON.parse(fs.readFileSync(prefix+'HOSTED_TOOLS_BINDING.json'));
 const env={RCAP_APPLICATION_SHA:candidate.applicationSha,RCAP_WORKER_SOURCE_SHA:candidate.workerSourceSha,
  RCAP_WORKER_DIGEST:candidate.workerDigest,RCAP_PRODUCTION_PROJECT_REF:candidate.productionProjectRef,
  RCAP_TOOLS_SHA:PREFLIGHT_BASE};
 assert.equal(requireProductionReleaseTuple(candidate,tools,env),candidate);
 for(const key of ['RCAP_APPLICATION_SHA','RCAP_WORKER_SOURCE_SHA','RCAP_WORKER_DIGEST','RCAP_PRODUCTION_PROJECT_REF']){
  assert.throws(()=>requireProductionReleaseTuple(candidate,tools,{...env,[key]:'wrong'}),/mismatch/);
 }
 const at=Date.parse(candidate.productionAuthorization.recordedAt);
 const baseAt=Number(execFileSync('git',['show','-s','--format=%ct',PREFLIGHT_BASE]))*1000;
 assert.ok(at>=baseAt&&at<=Date.now(),'new actual timestamp after Captain, not a historical fixture');
});
for(const phase of phases) test(`phase ${phase}: denied, including appended or substituted owner phases`,()=>{
 assert.throws(()=>requireProductionPhaseAuthorization(candidate,phase),refusal);
 assert.throws(()=>requireProductionDeploymentBinding(candidate,phase),refusal);
 for(const list of [['preflight',phase],[phase]]){
  const c=clone();c.productionAuthorization.phases=list;
  assert.throws(()=>requireProductionPhaseAuthorization(c,phase),refusal);
  assert.throws(()=>requireProductionPhaseAuthorization(c,'preflight'),refusal);
 }
});
for(const key of ['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','productionProjectRef']){
 for(const location of ['candidate','authorization','both']) test(`wrong ${key} in ${location} refuses`,()=>{
  const c=clone();
  if(location!=='authorization')c[key]='wrong';
  if(location!=='candidate')c.productionAuthorization[key]='wrong';
  assert.throws(()=>requireProductionPhaseAuthorization(c,'preflight'),refusal);
 });
}
for(const [label,mutate] of [
 ['missing owner',c=>delete c.productionAuthorization.recordedBy],
 ['blank owner',c=>c.productionAuthorization.recordedBy=' '],
 ['invented owner',c=>c.productionAuthorization.recordedBy='codex'],
 ['missing timestamp',c=>delete c.productionAuthorization.recordedAt],
 ...['invalid','2026-09-29','2026-02-30T00:00:00.000Z','2026-09-29T00:00:00+00:00',null].map(value=>[`invalid timestamp ${value}`,c=>c.productionAuthorization.recordedAt=value]),
 ['false outer authorization',c=>c.productionAuthorized=false],
 ['false inner authorization',c=>c.productionAuthorization.authorized=false],
 ['held status',c=>c.status=HOSTED_STATUS],
 ['stale status mirror',c=>c.hostedAcceptanceStatus=HOSTED_STATUS],
 ['invented general authorization status',c=>c.status='PRODUCTION_AUTHORIZED'],
 ['missing status',c=>delete c.status],
 ['wrong predecessor',c=>c.releaseBaseSha='0'.repeat(40)],
 ['broadened note',c=>c.productionAuthorization.note+=' Also activate.'],
 ['empty phases',c=>c.productionAuthorization.phases=[]],
 ['duplicated phase',c=>c.productionAuthorization.phases=['preflight','preflight']],
 ['historical permission',c=>{const find=v=>{if(!v||typeof v!=='object')return null;if(v.productionAuthorization)return v.productionAuthorization;for(const child of Object.values(v)){const found=find(child);if(found)return found;}return null;};const old=find(c.supersededRecord);assert.ok(old);c.productionAuthorization=old;}],
 ]) test(label,()=>{const c=clone();mutate(c);assert.throws(()=>requireProductionPhaseAuthorization(c,'preflight'),refusal);});
for(const key of ['deploymentId','hostname','applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','acceptanceProjectRef','readyState','target']){
 test(`Preview ${key} substitution refuses`,()=>{const c=clone();c.hostedAcceptance.preview[key]='wrong';assert.throws(()=>requireProductionDeploymentBinding(c,'preflight'),refusal);});
}
for(const location of ['candidate','authorization'])for(const key of ['stagedDeploymentId','rollbackDeploymentId','smokeRunId','smokeArtifactSha256','smokeReceipt','activationReceipt']){
 test(`no invented ${location} ${key}`,()=>{const c=clone();(location==='candidate'?c:c.productionAuthorization)[key]='invented';assert.throws(()=>requireProductionPhaseAuthorization(c,'preflight'),refusal);});
}
test('all predecessor control records retain exact bytes through nested-record serialization and hashes; native evidence is unchanged',()=>{
 for(const name of ['RELEASE_CANDIDATE_BINDING.json','HOSTED_TOOLS_BINDING.json','PENDING_WORKER_SUCCESSOR.json']){
  const rel=prefix+name,record=JSON.parse(fs.readFileSync(rel));
  const bytes=execFileSync('git',['show',`${PREFLIGHT_BASE}:${rel}`],{maxBuffer:32*1024*1024});
  assert.equal(JSON.stringify(record.supersededRecord,null,2)+'\n',bytes.toString());
  assert.equal(record.supersededRecordSha256,createHash('sha256').update(bytes).digest('hex'));
 }
 assert.deepEqual(candidate.hostedAcceptance,candidate.supersededRecord.hostedAcceptance);
 for(const rel of HOSTED_EVIDENCE_FILES)assert.deepEqual(fs.readFileSync(rel),execFileSync('git',['show',`${PREFLIGHT_BASE}:${rel}`],{maxBuffer:32*1024*1024}));
});
console.log(`Preflight-only boundary: ${phases.length} unauthorized phase spellings; ${phases.length*6} exact-code phase refusals.`);

// Execute only the actual early guards with local input. No entrypoint, browser,
// remote transport, workflow, live order or deployment is invoked by this test.
for(const [rel,phase,env] of [
 ['.github/workflows/deploy-rcap-render-worker-production.yml','production_worker_deploy',{}],
 ...['read','create'].map(p=>['scripts/rcap-production-legal-aid-keys.mjs',`legal_aid_keys_${p}`,{RCAP_LEGAL_AID_KEYS_PHASE:p}]),
 ...['save_transition_reproduce','save_transition_verify','live_zero_dollar_order','live_open_payable_checkout'].map(p=>['scripts/rcap-production-save-transition-probe.mjs',p,{RCAP_PRODUCTION_PHASE:p}]),
])test(`actual entrypoint guard refuses ${phase} before service access`,()=>{
 const source=fs.readFileSync(rel,'utf8');
 assert.match(source,/import \{ requireProductionPhaseAuthorization \} from ["'][^"']*production-preflight-authorization.mjs["']/);
 const guard=source.split('\n').find(line=>line.trimStart().startsWith('requireProductionPhaseAuthorization('));
 assert.ok(guard,'entrypoint must invoke the shared phase gate');
 const firstEffect=rel.endsWith('.yml')?source.indexOf('const publication ='):source.indexOf(rel.includes('keys')?'fs.mkdirSync(EVIDENCE_DIR':'const PRODUCTION_PROJECT_REF =');
 assert.ok(source.indexOf(guard)<firstEffect,'authorization precedes execution');
 const seen=[];
 const context={candidate,JSON,fs:{readFileSync:()=>JSON.stringify(candidate)},process:{env},
  requireProductionPhaseAuthorization:(c,p)=>{seen.push(p);return requireProductionPhaseAuthorization(c,p);}};
 assert.throws(()=>vm.runInNewContext(guard,context),refusal);
 assert.deepEqual(seen,[phase]);
});
