import {fundingCatalogQuery,expectedFundingCatalog} from './rcap-production-funding-dependency-contract.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {runProductionForwardChainMigration} from './rcap-production-forward-chain-migrate.mjs';
import {loadCorrection,requireForwardCorrectionAuthorization,CORRECTION_DIR,AUTHORIZATION_PATH,stateFingerprint} from './rcap-production-packet-forward-correction.mjs';
import {normalizeCatalog,loadPacketContract,comparePacketCatalog} from './rcap-packet-database-contract.mjs';
const root=process.cwd(),plan=loadCorrection(root);
const release=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
const catalogs=[...plan.sql.matchAll(/expected jsonb := '((?:''|[^'])*)'::jsonb/g)].map(m=>JSON.parse(m[1].replaceAll("''","'")));
const rpc=[...plan.sql.matchAll(/\bactual is distinct from '((?:''|[^'])*)'::jsonb/g)].map(m=>JSON.parse(m[1].replaceAll("''","'")));
const before={packet:catalogs[0],canonical:rpc[0],full:rpc[1],funding:{},prerequisites:plan.prerequisites.expected},after={packet:catalogs[1],canonical:rpc[2],full:rpc[3],funding:expectedFundingCatalog(root),prerequisites:plan.prerequisites.expected};
const inventory=JSON.parse(fs.readFileSync('scripts/fixtures/production-readiness-20260929/forward_inventory.json')).data;
function isolated() {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'forward-correction-test-'));
 for(const name of ['.git','supabase'])fs.symlinkSync(path.join(root,name),path.join(dir,name));
 fs.mkdirSync(path.join(dir,'data'),{recursive:true});
 fs.symlinkSync(path.join(root,'data/rcap-grade-a'),path.join(dir,'data/rcap-grade-a'));
 fs.copyFileSync(path.join(root,AUTHORIZATION_PATH),path.join(dir,AUTHORIZATION_PATH));
 fs.mkdirSync(path.join(dir,'scripts/fixtures'),{recursive:true});
 fs.cpSync(path.join(root,CORRECTION_DIR),path.join(dir,CORRECTION_DIR),{recursive:true});
 return dir;
}
async function execute({state=before,phase='forward_chain_migrate',immediateDrift=false,immediateFundingDrift=false,transactionError=false,postDrift=false,mutateAuthorization,missingPrerequisite=false}={}) {
 const dir=isolated(),calls=[],writes=[];let current=structuredClone(state),packetReads=0;
 try {
  if(mutateAuthorization){const p=path.join(dir,AUTHORIZATION_PATH),a=JSON.parse(fs.readFileSync(p));mutateAuthorization(a);fs.writeFileSync(p,JSON.stringify(a));}
  const result=await runProductionForwardChainMigration({rootDir:dir,requireRelease:()=>release,env:{
    RCAP_APPLICATION_SHA:release.applicationSha,RCAP_PRODUCTION_PROJECT_REF:release.productionProjectRef,
    RCAP_PRODUCTION_PHASE:phase,RCAP_TOOLS_SHA:'380865b07d4b57bbc6506117cc189bcb5f33d771',SUPABASE_ACCESS_TOKEN:'offline-only-not-a-secret',RCAP_PRODUCTION_EVIDENCE_DIR:path.join(dir,'evidence')
  },fetch:async(url,options={})=>{
    calls.push({url,method:options.method});
    let value;
    if(options.method==='GET')value=url.endsWith('/backups')?{backups:[],pitr_enabled:false}:{ref:release.productionProjectRef};
    else {
      const q=JSON.parse(options.body).query;
      if(q===plan.sql){writes.push(q);if(transactionError)return new Response(JSON.stringify({message:'injected transaction refusal'}),{status:400});current=structuredClone(after);if(postDrift)current.full.owner='unexpected_owner';value=[];}
      else if(q.includes('as ledger_present')){value=structuredClone(inventory);if(missingPrerequisite)value[0].prereq_packet_render_jobs=false;}
      else if(q.includes('information_schema.columns')&&q.includes('consumer_pending_screening_results'))value=['claim_token_hash','claimed_matter_id','status'].map(column_name=>({column_name}));
      else if(q.includes('with p as'))value=[{total_rows:0}];
      else if(q===plan.prerequisites.query)value=[current.prerequisites];
      else if(q===fundingCatalogQuery){if(immediateFundingDrift&&packetReads===2)current.funding={'table:clinic_packet_funding':{kind:'v'}};value=[{catalog:current.funding}];}
      else if(q.includes('jsonb_object_agg(key,value')){packetReads++;if(immediateDrift&&packetReads===2)current.packet['table:packet_render_jobs'].rls=false;value=[{catalog:current.packet}];}
      else if(q.includes('pg_get_functiondef'))value=[current.full];
      else if(q.includes('p.prosrc'))value=[current.canonical];
      else throw new Error('unexpected SQL query in offline transport');
    }
    return new Response(JSON.stringify(value),{status:200});
  }});
  return {result,calls,writes,packetReads};
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
}
test('committed gates exactly bind captured before and source-derived frozen after',()=>{
 assert.equal(stateFingerprint(before.packet,before.canonical,before.full,before.funding,before.prerequisites),plan.manifest.beforeFingerprint);
 assert.equal(stateFingerprint(after.packet,after.canonical,after.full,after.funding,after.prerequisites),plan.manifest.afterFingerprint);
 assert.deepEqual(comparePacketCatalog(loadPacketContract(root).current,normalizeCatalog(after.packet)),[]);
 assert.equal(requireForwardCorrectionAuthorization(root,release).authorized,true);
});
test('actual migrate entrypoint issues exactly one reviewed transaction after immediate readback',async()=>{
 const r=await execute();assert.equal(r.result.passed,true,r.result.failure);assert.deepEqual(r.writes,[plan.sql]);
 assert.equal(r.packetReads,3);assert.equal(r.result.productionDatabaseMutated,true);
 assert.equal(r.result.forwardCorrectionReadback.afterFingerprint,plan.manifest.afterFingerprint);
 assert.deepEqual(r.result.ledgerRowsRecorded,[]);
});
test('exact corrected state is a no-write success',async()=>{
 const r=await execute({state:after});assert.equal(r.result.passed,true,r.result.failure);assert.equal(r.writes.length,0);
 assert.equal(r.result.migrationDisposition,'current_release_dependencies_verified_no_write');
});
test('capture drift and concurrent prewrite change refuse before mutation',async t=>{
 for(const item of ['packet','canonical','full','immediate'])await t.test(item,async()=>{
  const state=structuredClone(before);
  if(item==='packet')state.packet['table:packet_render_jobs'].rls=false;
  if(item==='canonical')state.canonical.prosrc+=' --changed';
  if(item==='full')state.full.owner='wrong';
  const r=await execute({state,immediateDrift:item==='immediate'});assert.equal(r.result.passed,false);assert.equal(r.writes.length,0);assert.match(r.result.failure,/before_state_exact/);
 });
});
test('partial repair cannot masquerade as captured or corrected state',async()=>{
 const state=structuredClone(before);state.packet['column:packet_render_jobs.retry_reconciliation_history']=after.packet['column:packet_render_jobs.retry_reconciliation_history'];
 const r=await execute({state});assert.equal(r.result.passed,false);assert.equal(r.writes.length,0);
});
test('read-only phase retains canonical drift refusal and never applies correction',async()=>{
 const r=await execute({phase:'forward_chain_readback'});assert.equal(r.result.passed,false);assert.equal(r.result.failure,'current_canonical_matter_rpc_exact');assert.equal(r.writes.length,0);
});
test('unauthorized phase and missing prerequisites refuse',async()=>{
 const forbidden=await execute({phase:'activate'});assert.equal(forbidden.calls.length,0);assert.equal(forbidden.result.passed,false);
 const partial=await execute({missingPrerequisite:true});assert.equal(partial.writes.length,0);assert.equal(partial.result.passed,false);
});
test('independent authorization binds owner timestamp tuple phase SQL and readback before service access',async t=>{
 const mutations={owner:a=>a.recordedBy='',timestamp:a=>a.recordedAt='invalid',phase:a=>a.phases.push('activate'),status:a=>a.status='authorized_production_incident',fingerprint:a=>a.readback.beforeFingerprint='sha256:'+'0'.repeat(64),sql:a=>a.correction.sha256='0'.repeat(64),history:a=>a.historicalReplayAuthorized=true};
 for(const key of ['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','productionProjectRef'])mutations[key]=a=>a[key]='wrong';
 for(const [name,mutateAuthorization]of Object.entries(mutations))await t.test(name,async()=>{
  const r=await execute({mutateAuthorization});assert.equal(r.result.passed,false);assert.equal(r.calls.length,0);
 });
});
test('transaction refusal and postwrite drift never report a pass',async()=>{
 const failed=await execute({transactionError:true});assert.equal(failed.result.passed,false);assert.equal(failed.writes.length,1);assert.equal(failed.result.productionDatabaseMutated,null);assert.equal(failed.result.productionDatabaseMutationOutcome,'unknown_until_transaction_response');
 const drift=await execute({postDrift:true});assert.equal(drift.result.passed,false);assert.equal(drift.result.failure,'forward_correction_after_state_exact');
});

test('historical authorization remains exact under supersededRecord and supplies no new permission',()=>{
 const a=JSON.parse(fs.readFileSync(AUTHORIZATION_PATH));
 const prior=JSON.parse(execFileSync('git',['show','380865b07d4b57bbc6506117cc189bcb5f33d771:'+AUTHORIZATION_PATH],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 assert.deepEqual(a.supersededRecord,prior);
});

for(const kind of ['missing','changed','extra','old-packet-only'])test('funding closure refuses '+kind+' state',async()=>{
 const state=structuredClone(after);
 if(kind==='missing')delete state.funding['table:clinic_packet_funding'];
 if(kind==='changed')state.funding['table:clinic_packet_funding'].rls=false;
 if(kind==='extra')state.funding['function:allocate_clinic_packet_funding(uuid)']={};
 if(kind==='old-packet-only')state.funding={};
 const r=await execute({state});assert.equal(r.result.passed,false);assert.equal(r.writes.length,0);
});

test('funding appearance between initial and immediate readback refuses before write',async()=>{const r=await execute({immediateFundingDrift:true});assert.equal(r.result.passed,false);assert.equal(r.writes.length,0);});

test('changed captured prerequisite refuses before write',async()=>{const state=structuredClone(before);state.prerequisites.relations.processed_stripe_events.columns.pop();const r=await execute({state});assert.equal(r.result.passed,false);assert.equal(r.writes.length,0);});

test('native Acceptance funding source proof exactly matches the source-derived four-object catalog',()=>{
 const proof=JSON.parse(fs.readFileSync(path.join(root,CORRECTION_DIR,'source-funding-acceptance.json')));
 assert.equal(proof.readOnly,true);assert.equal(proof.projectRef,'hyflxnlhpmiqxvvcoiia');
 assert.deepEqual(proof.data,[{catalog:expectedFundingCatalog(root)}]);
});
