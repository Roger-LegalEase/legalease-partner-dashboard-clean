import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { migrationCertification, requireMigrationCertification, acceptanceLedgerExecution, runAcceptanceMigrationSequence } from './rcap-migration-certification.mjs';
import { CONTRACT_PATH, CORRECTION_PATH, digest } from './rcap-packet-database-contract.mjs';
import { packetApplicationTestDatabase, readPacketCatalog } from './rcap-packet-database-reference.mjs';
import { runHostedAcceptanceMigrate } from './rcap-hosted-acceptance-migrate.mjs';

const contract=JSON.parse(fs.readFileSync(CONTRACT_PATH,'utf8'));
test('duplicate HTTP/SQL errors, matching ledger hashes and plausible objects never certify a phase',()=>{
  for(const error of ['42710','42P07','42701','42P06','already exists'])assert.equal(migrationCertification({duplicate:error,ledgerMatch:true,signaturePresent:true}).certified,false);
  assert.equal(acceptanceLedgerExecution({sha256:'a',applied_by:'adopted_existing_objects'},'a'),false);
  assert.equal(acceptanceLedgerExecution({sha256:'a',applied_by:'hosted_acceptance_pipeline'},'a'),true);
});
test('complete exact catalog permits adoption even after a duplicate response',()=>{
  assert.equal(migrationCertification({expected:contract.current,actual:contract.current,duplicate:true,executed:false}).certified,true);
});
test('every postcondition is required for adoption even when execution reports success',()=>{
  for(const key of Object.keys(contract.current)) {
    const partial=structuredClone(contract.current);delete partial[key];
    const verdict=migrationCertification({expected:contract.current,actual:partial,executed:true});
    assert.equal(verdict.certified,false,key);assert.ok(verdict.failures.some(f=>f.name===key));
  }
});
test('no empty expected manifest can certify historical adoption',()=>{
  for(const expected of [null,undefined,{}])assert.throws(()=>requireMigrationCertification({expected,actual:{},signaturePresent:true}),/migration_not_certified/);
});

// The same executable sequence the hosted entrypoint calls, backed by real
// PostgreSQL. Only Management API transport and evidence persistence are ports.
function databaseQuery(db, calls) {
  return async text => {
    calls.push(text);
    const statement=text.trim().replace(/^set search_path = public, pg_catalog;\s*/,'').replace(/;$/,'');
    try {
      let json=[];
      if (/^(select|with)\b/i.test(statement)) json=db.json(`select coalesce(jsonb_agg(q),'[]') from (${statement}) q`);
      else if (/^insert\b[\s\S]*\breturning\b/i.test(statement)) json=JSON.parse(db.sql(`with q as (${statement}) select coalesce(jsonb_agg(q),'[]') from q`).trim());
      else db.sql(text);
      return {ok:true,status:200,json,text:JSON.stringify(json)};
    } catch(error) {
      return {ok:false,status:400,json:{message:String(error.stderr??error.message)},text:String(error.stderr??error.message)};
    }
  };
}
const createLedger=db=>db.sql(`create table rcap_acceptance_migration_ledger (
  phase integer primary key,sha256 text not null,authorization_id text not null,applied_by text not null
)`);
const root=process.cwd();
const correction=fs.readFileSync(CORRECTION_PATH,'utf8');
const entry={phase:56,path:CORRECTION_PATH,authorizationId:'local_forward_correction_test'};
function loop(db,{writeEvidence=async()=>{},query,calls=[],priorRows=[],rows=[{phase:entry.phase,onDisk:digest(correction)}],preserveExistingState=false}={}) {
  const operations=query??databaseQuery(db,calls);
  return {rows,calls,run:()=>runAcceptanceMigrationSequence({
    sequence:[entry],rows,priorRows,preserveExistingState,query:operations,
    readSql:relative=>fs.readFileSync(relative,'utf8'),
    certifyCurrent:async()=>migrationCertification({expected:contract.current,actual:readPacketCatalog(db)}),
    persistEvidence:writeEvidence
  })};
}

test('actual migration loop rejects PostgreSQL duplicate-object execution without certifying or recording it',async t=>{
  const db=packetApplicationTestDatabase(root,{corrected:false,deliverySuccessors:false});t.after(()=>db.stop());createLedger(db);
  const before=readPacketCatalog(db);
  assert.equal(migrationCertification({expected:contract.current,actual:before}).certified,false);
  const duplicateSql='create table public.packet_render_jobs (id uuid);';
  const duplicateEntry={phase:56,path:'local-duplicate-object-fixture.sql',authorizationId:'local_duplicate_rejection_test'};
  const rows=[{phase:duplicateEntry.phase,onDisk:digest(duplicateSql)}],calls=[],evidence=[];
  const result=await runAcceptanceMigrationSequence({
    sequence:[duplicateEntry],rows,priorRows:[],preserveExistingState:false,
    query:databaseQuery(db,calls),
    readSql:relative=>{assert.equal(relative,duplicateEntry.path);return duplicateSql;},
    certifyCurrent:async()=>migrationCertification({expected:contract.current,actual:readPacketCatalog(db)}),
    persistEvidence:async value=>{evidence.push(value);}
  });
  assert.equal(result.passed,false);assert.equal(result.satisfied,0);assert.equal(result.applied,0);
  assert.match(result.failure,/Migration execution failed:.*relation "packet_render_jobs" already exists/s);
  assert.equal(rows[0].disposition,'execution_failed_state_requires_readback');
  for(const flag of ['satisfied','applied','databaseApplied','receiptRecorded','evidenceRecorded'])assert.equal(rows[0][flag],false,flag);
  assert.deepEqual(calls,[duplicateSql],'duplicate SQL failure must stop before any receipt statement');
  assert.deepEqual(evidence,[]);
  assert.equal(db.scalar('select count(*) from rcap_acceptance_migration_ledger'),'0');
  assert.deepEqual(readPacketCatalog(db),before,'failed duplicate DDL must leave current state unchanged');
});

test('actual migration loop distinguishes a committed database correction from a failed execution receipt',async t=>{
  const db=packetApplicationTestDatabase(root,{corrected:false,deliverySuccessors:false});t.after(()=>db.stop());
  createLedger(db);
  db.sql(`create function reject_test_receipt() returns trigger language plpgsql as $$ begin
    raise exception 'receipt write rejected'; end $$;
    create trigger reject_test_receipt before insert on rcap_acceptance_migration_ledger
      for each row execute function reject_test_receipt();`);
  const run=loop(db);
  const result=await run.run();
  assert.equal(result.passed,false);assert.equal(result.applied,0);assert.equal(result.satisfied,0);
  assert.equal(run.rows[0].databaseApplied,true);assert.equal(run.rows[0].receiptRecorded,false);
  assert.equal(run.rows[0].evidenceRecorded,false);assert.equal(run.rows[0].disposition,'applied_but_unrecorded');
  assert.equal(run.rows[0].recovery.databaseChangeRolledBack,false);
  assert.equal(db.scalar('select count(*) from rcap_acceptance_migration_ledger'),'0');
  assert.equal(migrationCertification({expected:contract.current,actual:readPacketCatalog(db)}).certified,true,'SQL committed even though its receipt failed');
  const recovery=loop(db,{preserveExistingState:true});
  const recovered=await recovery.run();
  assert.equal(recovered.passed,true);assert.equal(recovered.applied,0);assert.equal(recovered.satisfied,1);
  assert.equal(recovery.calls.length,0,'verified recovery must neither replay SQL nor invent a historical receipt');
  assert.equal(recovery.rows[0].disposition,'complete_current_postconditions_verified_no_write');
  db.sql('alter table packet_render_jobs drop column sponsored_consumer_auth_user_id');
  const staleRecovery=loop(db,{preserveExistingState:true});
  assert.equal((await staleRecovery.run()).passed,false);assert.equal(staleRecovery.calls.length,0);
});

test('actual loop advances counters only after SQL, exact receipt and evidence persistence succeed',async t=>{
  const db=packetApplicationTestDatabase(root,{corrected:false,deliverySuccessors:false});t.after(()=>db.stop());createLedger(db);
  const evidence=[];
  const run=loop(db,{writeEvidence:async value=>{
    assert.equal(db.scalar('select count(*) from rcap_acceptance_migration_ledger'),'1');
    assert.equal(run.rows[0].satisfied,false);assert.equal(run.rows[0].applied,false);
    evidence.push(structuredClone(value));
  }});
  const result=await run.run();
  assert.equal(result.passed,true);assert.equal(result.applied,1);assert.equal(result.satisfied,1);
  assert.equal(run.rows[0].databaseApplied,true);assert.equal(run.rows[0].receiptRecorded,true);assert.equal(run.rows[0].evidenceRecorded,true);
  assert.equal(evidence.length,1);assert.equal(evidence[0].satisfied,1);
});

test('a failed local evidence write never turns committed SQL into a claimed rollback or success',async t=>{
  const db=packetApplicationTestDatabase(root,{corrected:false,deliverySuccessors:false});t.after(()=>db.stop());createLedger(db);
  const run=loop(db,{writeEvidence:async()=>{throw new Error('evidence volume unavailable');}});
  const result=await run.run();
  assert.equal(result.passed,false);assert.equal(result.satisfied,0);assert.equal(result.applied,0);
  assert.equal(run.rows[0].databaseApplied,true);assert.equal(run.rows[0].receiptRecorded,true);
  assert.equal(run.rows[0].evidenceRecorded,false);assert.equal(run.rows[0].disposition,'applied_but_unrecorded');
  assert.equal(run.rows[0].recovery.databaseChangeRolledBack,false);
  assert.equal(db.scalar('select count(*) from rcap_acceptance_migration_ledger'),'1');
});

test('an HTTP-success false receipt is rejected by the actual executable loop',async t=>{
  const db=packetApplicationTestDatabase(root,{corrected:false,deliverySuccessors:false});t.after(()=>db.stop());createLedger(db);
  const calls=[],query=databaseQuery(db,calls);
  const run=loop(db,{calls,query:async text=>{
    const response=await query(text);
    if(/insert into public.rcap_acceptance_migration_ledger/.test(text))response.json[0].sha256='0'.repeat(64);
    return response;
  }});
  const result=await run.run();
  assert.equal(result.passed,false);assert.equal(result.satisfied,0);assert.equal(result.applied,0);
  assert.equal(run.rows[0].disposition,'applied_but_unrecorded');
});

test('actual hosted entrypoint rejects stale current state despite a matching non-Phase-50 ledger, and verifies correct state without writes',async t=>{
  const db=packetApplicationTestDatabase(root);t.after(()=>db.stop());createLedger(db);
  const historical=JSON.parse(fs.readFileSync('data/rcap-staging-action.json','utf8')).migrationsInApplyOrder.find(entry=>entry.phase===55);
  db.sql(`insert into rcap_acceptance_migration_ledger values(55,'${historical.sha256}','${historical.authorizationId}','hosted_acceptance_pipeline')`);
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-loop-evidence-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const calls=[],query=databaseQuery(db,calls);
  const environment={SUPABASE_ACCESS_TOKEN:'local-transport-only',ACCEPTANCE_SUPABASE_PROJECT_REF:'hyflxnlhpmiqxvvcoiia'};
  const evidenceWriter=value=>fs.writeFileSync(path.join(directory,'migrate.json'),JSON.stringify(value));
  const originalLedger=db.json('select jsonb_agg(l) from rcap_acceptance_migration_ledger l');
  db.sql('alter table packet_render_jobs drop column sponsored_consumer_auth_user_id');
  const stale=await runHostedAcceptanceMigrate({query,environment,evidenceWriter});
  assert.equal(stale.passed,false);assert.equal(stale.sequenceResult.satisfied,0);assert.equal(stale.sequenceResult.applied,0);
  assert.match(stale.sequenceResult.failure,/current_postconditions_failed_no_replay/);
  assert.ok(calls.every(text=>/^(select|set search_path)\b/.test(text.trim())), 'existing-environment refusal must precede every write');
  db.applyFile(path.join(root,CORRECTION_PATH));calls.length=0;
  const complete=await runHostedAcceptanceMigrate({query,environment,evidenceWriter});
  assert.equal(complete.passed,true,JSON.stringify(complete));
  assert.equal(complete.sequenceResult.applied,0);assert.equal(complete.sequenceResult.satisfied,complete.authorizedSequence.length);
  assert.ok(complete.authorizedSequence.every(row=>row.satisfied&&!row.databaseApplied&&!row.applied&&row.evidenceRecorded));
  assert.ok(calls.every(text=>/^(select|set search_path)\b/.test(text.trim())));
  assert.deepEqual(db.json('select jsonb_agg(l) from rcap_acceptance_migration_ledger l'),originalLedger);
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory,'migrate.json'))).passed,true);
});

test('workflow requires the read-only catalog gate before any payment and keeps blank promo blank',()=>{
  const source=fs.readFileSync('.github/workflows/rcap-hosted-acceptance-staging.yml','utf8');
  assert.ok(source.indexOf('run: node scripts/verify-rcap-packet-database.mjs')<source.indexOf('run: node scripts/rcap-hosted-acceptance-payment.mjs'));
  assert.match(source,/HOSTED_STRIPE_PROMOTION_CODE: \$\{\{ inputs\.promotion_code \}\}/);
});
