import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {QUALIFIED_ACTIVATION_COMPLETION_REFS,readQualifiedActivationCompletion,prepareQualifiedPublicVerificationRecords} from './grade-a-launch-control/qualified-production-database-binding.mjs';
test('public-only builder requires real C/native activation and preserves exact consumed activation without replay authority',()=>{
 const root=process.cwd(),base='3f9c580e3cac3ce09e43a834edf54ae7c06333de',tools=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),actual=readQualifiedActivationCompletion(root);assert.equal(actual.runId,40634155561);
 const records=prepareQualifiedPublicVerificationRecords(root,{toolsSha:tools,releaseBaseSha:base});assert.equal(Object.keys(records).length,3);
 for(const r of Object.values(records)){assert.equal(r.qualifiedWorkerDatabase.phase,'public_verify');assert.deepEqual(r.productionAuthorization.phases,['public_verify']);assert.deepEqual(r.qualifiedWorkerDatabase.completedActivation,actual);assert.equal(r.supersededRecord.qualifiedWorkerDatabase.phase,'activate');assert.equal(r.supersededRecord.toolsSha,'ba0f2b75693d67c877b11c5b1952d59c03c30d62');assert.equal(r.productionAuthorization.stagedDeploymentId,actual.liveDeploymentId);assert.equal(r.productionAuthorization.rollbackDeploymentId,actual.rollbackDeploymentId);assert.equal(r.productionAuthorization.smokeRunId,40619590234);assert.equal(r.canonicalSourceEquivalent,false);assert.equal(r.canonicalRebuildRequired,true);assert.equal(r.qualifiedWorkerDatabase.completedWorker.historicalCleanExitObserved,false);assert.equal(r.qualifiedWorkerDatabase.completedWorker.strictPostGuardPassed,false);}
 for(const ref of Object.values(QUALIFIED_ACTIVATION_COMPLETION_REFS)){const bytes=fs.readFileSync(ref.path);try{fs.writeFileSync(ref.path,Buffer.concat([bytes,Buffer.from('\n')]));assert.throws(()=>readQualifiedActivationCompletion(root),/Actual activation completion/);}finally{fs.writeFileSync(ref.path,bytes);}}
 assert.throws(()=>prepareQualifiedPublicVerificationRecords(root,{toolsSha:tools,releaseBaseSha:'f7c9aaad0b71bc7a5e2b6f511039132d78006548'}));
});
