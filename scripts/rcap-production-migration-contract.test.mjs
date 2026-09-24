import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  PRODUCTION_PROJECT_REF, CLINIC_SOURCE_FILES, requireProductionReleaseTuple,
  requireProductionPhaseAuthorization, requireProductionDeploymentBinding, clinicSourceTestDatabase,
  buildClinicSourceReference, clinicSourceCatalogQuery, certifyClinicSourceCatalog
} from './rcap-production-migration-contract.mjs';
import { runProductionClinicMigration } from './rcap-production-clinic-migrate.mjs';
import { runProductionLegalAidMigration } from './rcap-production-legal-aid-migrate.mjs';
import {
  runProductionForwardChainMigration, LEDGER_BASELINE_VERSIONS, MIGRATIONS,
  UNLEDGERED_PRIOR_STEPS, PHASE_PREREQUISITES
} from './rcap-production-forward-chain-migrate.mjs';
import { packetApplicationTestDatabase } from './rcap-packet-database-reference.mjs';
import { packetCatalogQuery, CORRECTION_PATH } from './rcap-packet-database-contract.mjs';

const root=process.cwd();
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
// Local protocol identities only. This fixture grants no real Production
// permission; no tool in these tests can contact a remote service.
const candidate={applicationSha:head,workerSourceSha:head,workerDigest:'sha256:'+'a'.repeat(64),
  workerInputFingerprint:'sha256:'+'b'.repeat(64),productionProjectRef:PRODUCTION_PROJECT_REF,
  productionAuthorized:true};
candidate.productionAuthorization={...candidate,authorized:true,recordedBy:'local fixture',recordedAt:'2026-09-24',
  phases:['clinic_migrate','legal_aid_migrate','forward_chain_migrate']};
const binding={...candidate,toolsSha:head};
const environment={RCAP_APPLICATION_SHA:head,RCAP_WORKER_SOURCE_SHA:head,RCAP_WORKER_DIGEST:candidate.workerDigest,
  RCAP_TOOLS_SHA:head,GITHUB_SHA:head,RCAP_PRODUCTION_PROJECT_REF:PRODUCTION_PROJECT_REF,SUPABASE_ACCESS_TOKEN:'local-transport-only'};
function requireLocalRelease(_root,env) {
  requireProductionReleaseTuple(candidate,binding,env);
  requireProductionPhaseAuthorization(candidate,env.RCAP_PRODUCTION_PHASE);
  return candidate;
}
function evidenceDirectory(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-production-control-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;
}
const response=(json,status=200)=>({ok:status>=200&&status<300,status,async text(){return JSON.stringify(json);}});

test('Production successor tuple accepts exact identities and rejects each wrong identity or historical permission',()=>{
  assert.equal(requireProductionReleaseTuple(candidate,binding,environment),candidate);
  assert.equal(requireProductionPhaseAuthorization(candidate,'clinic_migrate'),candidate.productionAuthorization);
  for(const key of ['RCAP_APPLICATION_SHA','RCAP_WORKER_SOURCE_SHA','RCAP_WORKER_DIGEST','RCAP_TOOLS_SHA','RCAP_PRODUCTION_PROJECT_REF']) {
    assert.throws(()=>requireProductionReleaseTuple(candidate,binding,{...environment,[key]:'wrong'}),/mismatch/);
  }
  for(const key of ['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint']) {
    const wrong=structuredClone(candidate);wrong.productionAuthorization[key]='historical';
    assert.throws(()=>requireProductionPhaseAuthorization(wrong,'clinic_migrate'),/authorization_tuple_mismatch/);
  }
  assert.throws(()=>requireProductionPhaseAuthorization({...candidate,productionAuthorized:false},'clinic_migrate'),/not_authorized/);
  assert.throws(()=>requireProductionPhaseAuthorization(candidate,'activate'),/not_authorized/);
});

test('Production deployment and smoke receipt binding has an exact successor success path and rejects a false receipt',()=>{
  const release=structuredClone(candidate);
  release.acceptanceProjectRef='hyflxnlhpmiqxvvcoiia';
  release.hostedAcceptance={preview:{deploymentId:'dpl_localPreview',applicationSha:head,
    acceptanceProjectRef:release.acceptanceProjectRef,target:null,readyState:'READY'}};
  const authorization=release.productionAuthorization;
  authorization.phases.push('preflight','smoke','activate');
  authorization.stagedDeploymentId='dpl_localStaged';authorization.rollbackDeploymentId='dpl_localRollback';
  authorization.smokeRunId=12345678;
  const smoke={passed:true,applicationSha:head,workerSourceSha:head,workerDigest:release.workerDigest,
    productionProjectRef:PRODUCTION_PROJECT_REF,stagedDeploymentId:authorization.stagedDeploymentId,
    rollbackDeploymentId:authorization.rollbackDeploymentId,migrationHashes:['local-source-hash'],
    transactionalFixtureRolledBack:true,productionDatabasePersistentlyMutated:false,
    realParticipantRecordsCreated:false,realChargesCreated:false};
  const smokeText=JSON.stringify(smoke),sha256=text=>createHash('sha256').update(text).digest('hex');
  authorization.smokeArtifactSha256=sha256(smokeText);
  for(const phase of ['preflight','smoke','activate'])assert.equal(requireProductionDeploymentBinding(release,phase),authorization);
  const wrong=structuredClone(release);wrong.productionAuthorization.rollbackDeploymentId=authorization.stagedDeploymentId;
  assert.throws(()=>requireProductionDeploymentBinding(wrong,'smoke'),/deployment_binding_missing/);
  wrong.productionAuthorization.rollbackDeploymentId=authorization.rollbackDeploymentId;
  delete wrong.productionAuthorization.smokeArtifactSha256;
  assert.throws(()=>requireProductionDeploymentBinding(wrong,'activate'),/receipt_binding_missing/);
  wrong.hostedAcceptance.preview.applicationSha='0'.repeat(40);
  assert.throws(()=>requireProductionDeploymentBinding(wrong,'preflight'),/preview_binding_missing/);
  // Execute the actual activation receipt predicate without invoking a phase,
  // deployment, preflight, or remote transport.
  const source=fs.readFileSync('scripts/rcap-production-activate.mjs','utf8');
  const start=source.indexOf('  const smokeExact = '),end=source.indexOf('\n  record(',start);
  assert.ok(start>0&&end>start);
  const check=()=>vm.runInNewContext(source.slice(start,end)+'\nsmokeExact',{
    sha256,smokeText,smoke,RELEASE_CANDIDATE:release,APPLICATION_SHA:head,WORKER_SOURCE_SHA:head,
    WORKER_DIGEST:release.workerDigest,PRODUCTION_PROJECT_REF,STAGED_DEPLOYMENT_ID:authorization.stagedDeploymentId,
    ROLLBACK_DEPLOYMENT_ID:authorization.rollbackDeploymentId,REQUIRED_MIGRATION_HASHES:smoke.migrationHashes
  });
  assert.equal(check(),true);
  authorization.smokeArtifactSha256='0'.repeat(64);assert.equal(check(),false);
});

test('actual Clinic and Legal Aid entrypoints accept complete source state without replay and reject partial state or false receipts',async t=>{
  const reference=await buildClinicSourceReference(root);
  const db=await clinicSourceTestDatabase();t.after(()=>db.close());
  // Inventory prerequisites are outside this narrow certificate. The Clinic
  // and Legal Aid catalogs themselves execute their exact source files below.
  await db.exec(`alter table consumer_briefcase_items add column payment_product_id text,
    add column payment_person_id uuid,add column payment_matter_id uuid;
    alter table packet_render_jobs enable row level security;`);
  for(const name of ['expungement_packet_product_id','consumer_matter_id_for_briefcase_item','consumer_packet_payment_authority','record_consumer_packet_payment','enqueue_packet_render_job','finalize_packet_render_job']) {
    await db.exec(`create function ${name}() returns boolean language sql as $$ select true $$`);
  }
  for(const file of CLINIC_SOURCE_FILES)await db.exec(fs.readFileSync(file,'utf8'));
  const requests=[];
  const fetch=async(url,opts)=>{
    assert.ok(url.startsWith(`https://api.supabase.com/v1/projects/${PRODUCTION_PROJECT_REF}`));
    if(opts.method==='GET')return response({ref:PRODUCTION_PROJECT_REF});
    const {query}=JSON.parse(opts.body);requests.push(query);
    assert.match(query.trim(),/^(select|with)\b/i,'complete state must be a verified no-write path');
    try{return response((await db.query(query)).rows);}catch(error){return response({message:error.message},400);}
  };
  const run=async(phase,extra={})=>{
    requests.length=0;
    const execute=phase==='clinic_migrate'?runProductionClinicMigration:runProductionLegalAidMigration;
    return execute({env:{...environment,RCAP_PRODUCTION_PHASE:phase,RCAP_PRODUCTION_EVIDENCE_DIR:evidenceDirectory(t),...extra},
      rootDir:root,fetch,requireRelease:requireLocalRelease,sourceReference:async()=>reference});
  };
  for(const phase of ['clinic_migrate','legal_aid_migrate'])await t.test(`${phase}: exact tuple and complete current state succeed with zero database writes`,async()=>{
    const result=await run(phase);
    assert.equal(result.passed,true,result.failure);
    assert.equal(result.productionDatabaseMutated,false);assert.equal(result.migrationApplied,false);
    assert.equal(result.certification.certified,true);assert.equal(result.certification.stage,'legal_aid');
    assert.equal(result.migrationDisposition,'already_exact_source_postconditions_no_write');
    assert.ok(requests.length>0);
  });
  await t.test('wrong tuple is refused before any service request',async()=>{
    const result=await run('clinic_migrate',{RCAP_WORKER_DIGEST:'sha256:'+'c'.repeat(64)});
    assert.equal(result.passed,false);assert.match(result.failure,/tuple_mismatch/);assert.equal(requests.length,0);
  });
  await t.test('missing cross-table reservation trigger fails the actual Clinic no-write branch',async()=>{
    const definition=(await db.query("select pg_get_triggerdef(oid) as definition from pg_trigger where tgrelid='packet_render_jobs'::regclass and tgname='clinic_sync_packet_reservation_after_job'")).rows[0].definition;
    await db.exec('drop trigger clinic_sync_packet_reservation_after_job on packet_render_jobs');
    const result=await run('clinic_migrate');
    assert.equal(result.passed,false);assert.match(result.failure,/postconditions_failed/);
    assert.equal(result.productionDatabaseMutated,false);
    await db.exec(definition);
  });
  await db.exec('alter table clinic_events disable row level security');
  await t.test('partial schema and a claimed successful receipt cannot substitute for current source postconditions',async()=>{
    const result=await run('clinic_migrate');
    assert.equal(result.passed,false);assert.equal(result.productionDatabaseMutated,false);
    const catalog=(await db.query(clinicSourceCatalogQuery)).rows[0].catalog;
    assert.throws(()=>certifyClinicSourceCatalog(reference,{...catalog,receipt:{certified:true,executed:true}}),/postconditions_failed/);
  });
  await db.exec('alter table clinic_events enable row level security; revoke execute on function clinic_actor_can_event(uuid,uuid,text) from service_role');
  await t.test('complete object names with drifted privileges still fail the real Clinic entrypoint',async()=>{
    const result=await run('clinic_migrate');
    assert.equal(result.passed,false);assert.match(result.failure,/postconditions_failed/);
  });
});

test('actual Production forward control rejects signature/ledger receipts without current postconditions and succeeds on complete state without writes',async t=>{
  const db=packetApplicationTestDatabase(root);t.after(()=>db.stop());
  const inventory={ledger_present:true,ledger_has_name_column:true,
    ledger_versions:[...LEDGER_BASELINE_VERSIONS,...MIGRATIONS.map(m=>m.version)]};
  for(const m of MIGRATIONS)inventory[`sig_${m.version}`]=true;
  for(const p of PHASE_PREREQUISITES)inventory[`prereq_${p.name}`]=true;
  for(const p of UNLEDGERED_PRIOR_STEPS)inventory[`prior_${p.version}`]=true;
  const requests=[];
  const fetch=async(url,opts)=>{
    if(opts.method==='GET')return response(url.endsWith('/backups')?{backups:[]}:{ref:PRODUCTION_PROJECT_REF});
    const {query}=JSON.parse(opts.body);requests.push(query);
    assert.match(query.trim(),/^(select|with|set search_path)\b/i,'no historical replay or receipt adoption');
    // Historical inventory/impact is a Management API protocol fixture. The
    // required current dependency catalog is always real PostgreSQL output.
    if(query===packetCatalogQuery())return response([{catalog:JSON.parse(db.sql(query).trim().split('\n').at(-1))}]);
    if(query.includes('ledger_versions'))return response([inventory]);
    if(query.includes('select column_name::text'))return response(['claim_token_hash','status','claimed_matter_id'].map(column_name=>({column_name})));
    if(query.includes('count(*)::int as total_rows'))return response([{total_rows:0}]);
    assert.fail(`unexpected query: ${query.slice(0,120)}`);
  };
  const run=()=>runProductionForwardChainMigration({env:{...environment,RCAP_PRODUCTION_PHASE:'forward_chain_migrate',RCAP_PRODUCTION_EVIDENCE_DIR:evidenceDirectory(t)},rootDir:root,fetch,requireRelease:requireLocalRelease});
  db.sql('alter table packet_render_jobs drop column sponsored_consumer_auth_user_id');
  const stale=await run();
  assert.equal(stale.passed,false);assert.match(stale.failure,/migration_not_certified/);
  assert.equal(stale.productionDatabaseMutated,false);assert.equal(stale.ledgerRowsRecorded.length,0);
  db.applyFile(path.join(root,CORRECTION_PATH));
  const correct=await run();
  assert.equal(correct.passed,true,correct.failure);assert.equal(correct.productionDatabaseMutated,false);
  assert.equal(correct.migrationsApplied.length,0);assert.equal(correct.ledgerRowsRecorded.length,0);
  assert.equal(correct.migrationDisposition,'current_release_dependencies_verified_no_write');
  assert.equal(correct.historicalChainCertified,false);
});
