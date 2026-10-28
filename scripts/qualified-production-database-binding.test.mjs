import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {prepareQualifiedDatabaseRecords,verifyQualifiedDatabaseBinding,readQualifiedDatabaseTechnicalAdmission,QUALIFIED_DATABASE_ADMISSION,QUALIFIED_DATABASE_PACKAGE_SHA256} from './grade-a-launch-control/qualified-production-database-binding.mjs';
import {requireCurrentReleaseCandidate} from './grade-a-launch-control/verify-release-candidate-binding.mjs';
import {requireProductionMigrationRelease} from './rcap-production-migration-contract.mjs';
import {requireQualifiedDatabasePhase} from './grade-a-launch-control/qualified-production-database-binding.mjs';
import {QUALIFIED_DATABASE_PACKAGE_PATH,readQualifiedDatabasePackage} from './qualified-production-database-package.mjs';
const root=process.cwd(),head=()=>execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),file='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json',candidate=()=>JSON.parse(fs.readFileSync(file));
const alter=(file,change,check)=>{const original=fs.readFileSync(file);try{fs.writeFileSync(file,change(original));check();}finally{fs.writeFileSync(file,original);}};
test('original C66870 acceptance and corrected package lineage are required source prerequisites, with no native postimage claimed',()=>{
 const c=readQualifiedDatabaseTechnicalAdmission(root),p=readQualifiedDatabasePackage(root,QUALIFIED_DATABASE_PACKAGE_SHA256);assert.equal(c.accepted,true);assert.equal(c.executionAdmitted,false);assert.equal(c.packageSha256,p.manifest.supersedes.packageSha256);assert.equal(p.manifest.beforeStateSha256,c.beforeStateSha256);assert.equal(p.transactions[1].descriptor.beforeStateSha256,null);
 alter(QUALIFIED_DATABASE_ADMISSION.path,()=>Buffer.from('{}'),()=>assert.throws(()=>readQualifiedDatabaseTechnicalAdmission(root)));
});
test('pure generator preserves actual consumed e49d records and only derives the two-migration phase',()=>{
 const records=prepareQualifiedDatabaseRecords(root,{toolsSha:head(),releaseBaseSha:'e49d4fee4d3c082f3be9571f4d3f5d77f5b2f67b'}),c=records[file];assert.equal(Object.keys(records).length,3);assert.deepEqual(c.productionAuthorization.phases,['forward_chain_migrate']);assert.equal(c.consumedPreflight.runId,40606269080);assert.equal(c.supersededRecord.qualifiedWorkerPreflight.schemaVersion,'qualified-worker-first-preflight/v1');assert.equal(c.canonicalSourceEquivalent,false);assert.equal(c.canonicalRebuildRequired,true);assert.equal(c.productionAuthorization.stagedDeploymentId,'dpl_8w9xAAvEp45jn8J3PUQn4ibTnzKz');assert.equal(c.productionAuthorization.rollbackDeploymentId,'dpl_2SRcG3kEvG9UU1udDZ7GZR7naLc6');assert.equal(c.qualifiedWorkerPreflight,undefined);
});
if(process.env.QUALIFIED_DB_CONTROLLER_TEST==='1'){
 test('existing release and migration caller accepts the exact frozen two-source controller and rejects every later phase',()=>{
  const c=requireCurrentReleaseCandidate(root),env={RCAP_APPLICATION_SHA:c.applicationSha,RCAP_WORKER_SOURCE_SHA:c.workerSourceSha,RCAP_WORKER_DIGEST:c.workerDigest,RCAP_TOOLS_SHA:c.toolsSha,RCAP_PRODUCTION_PROJECT_REF:c.productionProjectRef,GITHUB_SHA:head(),RCAP_PRODUCTION_PHASE:'forward_chain_migrate'};
  assert.deepEqual(requireProductionMigrationRelease(root,env),c);
  for(const phase of ['preflight','forward_chain_readback','smoke','activate','production_worker_deploy','public_verify'])assert.throws(()=>requireQualifiedDatabasePhase(c,phase),/Smoke requires actual database poststate/);
 });
 test('changed C admission, package, wire, executable control or phase grant refuses before provider effects',()=>{
  const p=readQualifiedDatabasePackage(root,QUALIFIED_DATABASE_PACKAGE_SHA256),wire='scripts/fixtures/production-wwt-two-migration-package/'+p.transactions[0].descriptor.wireTemplatePath.split('/').at(-1);
  for(const target of [QUALIFIED_DATABASE_ADMISSION.path,QUALIFIED_DATABASE_PACKAGE_PATH,wire,'scripts/qualified-production-database-runtime.mjs'])alter(target,b=>Buffer.concat([b,Buffer.from('\n')]),()=>assert.equal(verifyQualifiedDatabaseBinding(root,candidate()).current,false));
  alter(file,b=>Buffer.from(JSON.stringify({...JSON.parse(b),productionAuthorization:{...JSON.parse(b).productionAuthorization,phases:['forward_chain_migrate','smoke']}})),()=>assert.equal(verifyQualifiedDatabaseBinding(root,candidate()).current,false));
 });
}
