// Actual release prerequisites only; none of these receipts admits a database write by itself.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readQualifiedPreflightEvidence} from './qualified-worker-preflight-binding.mjs';
import {assertQualifiedWorkerCompatibility,QUALIFIED_FORWARD_APP} from './verify-qualified-worker-forward-binding.mjs';
const EVIDENCE='data/rcap-grade-a/launch-control/qualified-release-evidence/';
export const QUALIFIED_DATABASE_PREREQUISITES={
 preflight:{path:EVIDENCE+'ACTUAL-PRODUCTION-PREFLIGHT.json',sha256:'0d60dc5a5e736b90e939b14f776a970b1e0244e8229283bf24862835397ce234'},
 acceptance:{path:EVIDENCE+'C-ACTUAL-PRODUCTION-PREFLIGHT.json',sha256:'c281b20fba2e159242126465eae08e668f444dfa49ea6add4ec4c234130d1b41'},
 authority:{path:EVIDENCE+'C-EXISTING-OWNER29223-SCOPE.json',sha256:'01c2d60d1c3cecb48e04e5979f848b057c091d53dbd4ad69d04f1fb245711452'},
};
export function readQualifiedProductionDatabasePrerequisites(root){
 const original=readQualifiedPreflightEvidence(root),{identity}=assertQualifiedWorkerCompatibility(root),documents={};
 for(const [key,ref] of Object.entries(QUALIFIED_DATABASE_PREREQUISITES)){
  const bytes=fs.readFileSync(path.join(root,ref.path));assert.equal(createHash('sha256').update(bytes).digest('hex'),ref.sha256,'Actual release prerequisite '+key);documents[key]=JSON.parse(bytes);
 }
 const {preflight,acceptance,authority}=documents;
 assert.equal(acceptance.schemaVersion,'qualified-production-first-preflight-actual-independent-acceptance/v1');assert.equal(acceptance.authority,'CODEX C');assert.equal(acceptance.runId,40606269080);
 assert.equal(preflight.passed,true);assert.equal(preflight.phase,'preflight');assert.equal(preflight.verdicts.length,11);assert(preflight.verdicts.every(v=>v.passed===true));
 for(const [key,value] of Object.entries({applicationSha:QUALIFIED_FORWARD_APP,workerSourceSha:identity.source,workerDigest:identity.digest}))assert.equal(preflight.requestedIdentity[key],value);
 assert.deepEqual(preflight.deployments,acceptance.deployments);assert.deepEqual(preflight.projectRefs,{production:'wwtwtsmywnckfkdaqqeg',acceptance:'hyflxnlhpmiqxvvcoiia'});
 assert.equal(authority.authority,'CODEX C');assert.equal(authority.nativeOwner.sha256IncludingLF,'49b86d196021f1bcc1251569152b5d803b0dfe6771694c4910eb8171d82b89b6');
 assert.equal(authority.nativeOwner.timestamp,'2026-10-28T00:02:56.591Z');assert.equal(authority.retainedPriorOwnerAuthoritySha256,'cc11ef00c38aa787847d06aeb20a0323e526afc5cbd9f2c9aef6903deba04e2e');
 return {...documents,original,identity};
}
