import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {QUALIFIED_WORKER_COMPLETION_REFS,readQualifiedWorkerCompletion,prepareQualifiedActivationRecords} from './grade-a-launch-control/qualified-production-database-binding.mjs';
const root=process.cwd(),base='f7c9aaad0b71bc7a5e2b6f511039132d78006548';
test('activation consumes actual C safe-transition acceptance without rewriting missing clean exits and grants only exact stage activation',()=>{
 const completed=readQualifiedWorkerCompletion(root);assert.equal(completed.safeTransitionAccepted,true);assert.equal(completed.historicalCleanExitObserved,false);assert.equal(completed.strictPostGuardPassed,false);
 const records=prepareQualifiedActivationRecords(root,{toolsSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),releaseBaseSha:base});assert.equal(Object.keys(records).length,3);
 for(const record of Object.values(records)){assert.deepEqual(record.productionAuthorization.phases,['activate']);assert.equal(record.qualifiedWorkerDatabase.phase,'activate');assert.deepEqual(record.qualifiedWorkerDatabase.completedWorker,completed);assert.equal(record.supersededRecord.qualifiedWorkerDatabase.phase,'production_worker_deploy');assert.equal(record.canonicalSourceEquivalent,false);assert.equal(record.canonicalRebuildRequired,true);assert.equal(record.productionAuthorization.stagedDeploymentId,'dpl_8w9xAAvEp45jn8J3PUQn4ibTnzKz');assert.equal(record.productionAuthorization.rollbackDeploymentId,'dpl_2SRcG3kEvG9UU1udDZ7GZR7naLc6');assert.equal(record.productionAuthorization.smokeRunId,40619590234);assert.equal(record.productionAuthorization.smokeArtifactSha256,'9fd7702305a6cea54ed1bfaf88b5d4c6aab2c01846aa5628efa28b4f025397e9');}
 const ref=QUALIFIED_WORKER_COMPLETION_REFS.acceptance,bytes=fs.readFileSync(ref.path);try{const altered=JSON.parse(bytes);altered.cleanExitCodesObserved=true;fs.writeFileSync(ref.path,JSON.stringify(altered));assert.throws(()=>readQualifiedWorkerCompletion(root),/Actual worker completion acceptance/);}finally{fs.writeFileSync(ref.path,bytes);}
 const current=fs.readFileSync('scripts/qualified-worker-placement.mjs','utf8'),original=execFileSync('git',['show',base+':scripts/qualified-worker-placement.mjs'],{encoding:'utf8'});const guard=s=>s.slice(s.indexOf('export function assertQualifiedWorkerPoststate'),s.indexOf('\nfunction write('));assert.equal(guard(current),guard(original));
});
