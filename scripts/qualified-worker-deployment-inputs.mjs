import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readQualifiedProductionDatabasePrerequisites,readQualifiedDatabaseCompletion,readQualifiedWorkerPlacementEvidence} from './grade-a-launch-control/qualified-production-database-binding.mjs';
import {readReadinessPrerequisites} from './qualified-worker-readonly-capture.mjs';
// Prerequisites only; the existing current-release and exact worker phase gates remain mandatory at the caller.
export function readQualifiedWorkerDeploymentInputs(root,candidate,publication){
 const preflight=readQualifiedProductionDatabasePrerequisites(root),database=readQualifiedDatabaseCompletion(root),smoke=readReadinessPrerequisites(root),readiness=readQualifiedWorkerPlacementEvidence(root);
 assert.equal(candidate.applicationSha,'4c189b682d0a9225a21b9fdf8a2ebc50500029d6');assert.equal(candidate.workerSourceSha,preflight.identity.source);assert.equal(candidate.workerDigest,preflight.identity.digest);assert.equal(candidate.productionProjectRef,'wwtwtsmywnckfkdaqqeg');assert.equal(candidate.canonicalSourceEquivalent,false);assert.equal(candidate.canonicalRebuildRequired,true);
 assert.deepEqual(candidate.qualifiedWorkerDatabase?.completedDatabase,database);assert.deepEqual(candidate.qualifiedWorkerDatabase.completedSmoke,smoke);assert.deepEqual(candidate.qualifiedWorkerDatabase.acceptedWorkerReadiness,readiness.descriptor);assert.equal(candidate.consumedPreflight?.runId,40606269080);
 const accepted=JSON.parse(execFileSync('git',['show',candidate.applicationSha+':data/rcap-render/worker-publication-evidence.json'],{cwd:root,encoding:'utf8'}));assert.deepEqual(publication,accepted,'Exact accepted publication remains unchanged');
 assert.equal(publication.imageAcceptance.sourceSha,candidate.workerSourceSha);assert.equal(publication.imageAcceptance.digest,candidate.workerDigest);assert.equal(publication.imageAcceptance.conclusion,'success');assert.equal(publication.imageAcceptance.readOnly,true);assert.equal(publication.imageAcceptance.runId,40505631029);
 return{preflightRunId:40606269080,database,smoke,readiness:readiness.descriptor,workerPlacementAuthorized:false,handoffProven:false};
}
