import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {QUALIFIED_DATABASE_COMPLETION_REFS,readQualifiedDatabaseCompletion,prepareQualifiedSmokeRecords,verifyQualifiedDatabaseBinding,requireQualifiedDatabasePhase} from './grade-a-launch-control/qualified-production-database-binding.mjs';
import {QUALIFIED_DATABASE_PARTIAL_REFS} from './qualified-db-accepted-first-commit.mjs';
import {requireProductionMigrationRelease} from './rcap-production-migration-contract.mjs';
const root=process.cwd(),head=()=>execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),base='8b496ce7fb75e241851c301866371473c83c9fd2',file='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json';
test('actual final C acceptance/result/proof preserve both accepted commits and are mandatory immutable smoke prerequisites',()=>{
 const accepted=readQualifiedDatabaseCompletion(root);assert.equal(accepted.runId,40617912474);assert.equal(accepted.actualFinalStateSha256,'9a69ac706e312838d8a47472d38f2d530bce816e00cd03ed4d66ce90f214c6a8');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'qualified-smoke-prerequisites-'));try{
  for(const ref of [...Object.values(QUALIFIED_DATABASE_COMPLETION_REFS),...Object.values(QUALIFIED_DATABASE_PARTIAL_REFS)]){const p=path.join(dir,ref.path);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(ref.path,p);}
  assert.deepEqual(readQualifiedDatabaseCompletion(dir),accepted);
  for(const ref of Object.values(QUALIFIED_DATABASE_COMPLETION_REFS)){const p=path.join(dir,ref.path),b=fs.readFileSync(p);fs.writeFileSync(p,'{}');assert.throws(()=>readQualifiedDatabaseCompletion(dir));fs.writeFileSync(p,b);}
 }finally{fs.rmSync(dir,{recursive:true});}
});
test('pure smoke generator preserves actual migration controller and retained identities while granting only existing smoke',()=>{
 const records=prepareQualifiedSmokeRecords(root,{toolsSha:head(),releaseBaseSha:base}),c=records[file];assert.equal(Object.keys(records).length,3);assert.deepEqual(c.productionAuthorization.phases,['smoke']);assert.equal(c.qualifiedWorkerDatabase.phase,'smoke');assert.equal(c.qualifiedWorkerDatabase.completedDatabase.runId,40617912474);assert.equal(c.qualifiedWorkerDatabase.technicalAdmissionAt,'2026-10-28T00:40:16.119879+00:00');assert.equal(c.supersededRecord.qualifiedWorkerDatabase.phase,'forward_chain_migrate');assert.equal(c.supersededRecord.toolsSha,'d1eed693336cfd377caea5845806e9ee3c64a95a');assert.equal(c.canonicalSourceEquivalent,false);assert.equal(c.canonicalRebuildRequired,true);assert.equal(c.productionAuthorization.stagedDeploymentId,'dpl_8w9xAAvEp45jn8J3PUQn4ibTnzKz');assert.equal(c.productionAuthorization.rollbackDeploymentId,'dpl_2SRcG3kEvG9UU1udDZ7GZR7naLc6');
 const workflow=fs.readFileSync('.github/workflows/rcap-production-canary.yml','utf8');assert.match(workflow,/fetch-depth:.*inputs.phase == 'smoke'.*257/);assert(workflow.includes('[ "$RCAP_PRODUCTION_PHASE" = smoke ]'));
 const smoke=fs.readFileSync('scripts/rcap-production-canary-smoke.mjs','utf8');assert(smoke.includes('databaseCompatibility: RELEASE_CANDIDATE.qualifiedWorkerDatabase?.completedDatabase ?? null'));assert(smoke.includes('migrationHashes: REQUIRED_MIGRATION_HASHES'));
});
if(process.env.QUALIFIED_SMOKE_CONTROLLER_TEST==='1'){
 test('actual smoke controller passes mandatory release caller and refuses migration/worker/activation phases',()=>{
  const c=JSON.parse(fs.readFileSync(file)),env={RCAP_APPLICATION_SHA:c.applicationSha,RCAP_WORKER_SOURCE_SHA:c.workerSourceSha,RCAP_WORKER_DIGEST:c.workerDigest,RCAP_TOOLS_SHA:c.toolsSha,RCAP_PRODUCTION_PROJECT_REF:c.productionProjectRef,GITHUB_SHA:head(),RCAP_PRODUCTION_PHASE:'smoke'};
  assert.deepEqual(requireProductionMigrationRelease(root,env),c);for(const phase of ['preflight','forward_chain_migrate','production_worker_deploy','activate','public_verify'])assert.throws(()=>requireQualifiedDatabasePhase(c,phase));
 });
 test('actual smoke controller rejects altered final evidence or an expanded phase grant',()=>{
  const c=JSON.parse(fs.readFileSync(file));for(const p of [...Object.values(QUALIFIED_DATABASE_COMPLETION_REFS).map(r=>r.path),file]){
   const original=fs.readFileSync(p);try{fs.writeFileSync(p,p===file?JSON.stringify({...c,productionAuthorization:{...c.productionAuthorization,phases:['smoke','activate']}}):Buffer.concat([original,Buffer.from('\n')]));assert.equal(verifyQualifiedDatabaseBinding(root,JSON.parse(fs.readFileSync(file))).current,false);}finally{fs.writeFileSync(p,original);}
  }
 });
}
