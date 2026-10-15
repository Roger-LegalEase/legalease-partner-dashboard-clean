import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  assertQuestionContractOutputInputs, assertQuestionContractOutputContinuity,
  readQuestionContractSuccessor, questionContractSourceSuccessorFor,
  QUESTION_CONTRACT_CONTINUITY_PATH, QUESTION_CONTRACT_CONTINUITY_SHA256,
  QUESTION_CONTRACT_CURRENT_OUTPUT_PATH, QUESTION_CONTRACT_SUCCESSOR_PATH,
  QUESTION_CONTRACT_EARLIER_CONTINUITY_PATH, QUESTION_CONTRACT_EARLIER_OUTPUT_PATH,
  QUESTION_CONTRACT_SAME_DATE_PREDECESSOR_CONTINUITY_PATH, QUESTION_CONTRACT_SAME_DATE_PREDECESSOR_OUTPUT_PATH,
  QUESTION_CONTRACT_PREVIOUS_CONTINUITY_PATH, QUESTION_CONTRACT_PREVIOUS_OUTPUT_PATH,
  QUESTION_CONTRACT_OUTPUT_PATH, MS_QUESTION_CONTRACT_PREDECESSOR_PATH
} from '../src/lib/rcap/fulfillment/question-contract-source-successor.mjs';

const readBytes = file => fs.readFileSync(file);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const continuity = JSON.parse(readBytes(QUESTION_CONTRACT_CONTINUITY_PATH));
const proof = JSON.parse(readBytes(QUESTION_CONTRACT_CURRENT_OUTPUT_PATH));
const historical = JSON.parse(readBytes(QUESTION_CONTRACT_OUTPUT_PATH));
const receipt = readQuestionContractSuccessor(readBytes);
let checks = 0;
function check(name, run) { try { run(); checks++; } catch (error) { error.message = `${name}: ${error.message}`; throw error; } }
const validate = (c = continuity, p = proof, read = readBytes) => assertQuestionContractOutputContinuity({ continuity: c, proof: p, readBytes: read });
check('exact executed successor validates complete current inventory', () => {
  const actual = assertQuestionContractOutputInputs(readBytes);
  assert.equal(actual.inputCount, 121);
  assert.equal(actual.path, QUESTION_CONTRACT_CURRENT_OUTPUT_PATH);
  assert.equal(actual.sha256, sha(readBytes(QUESTION_CONTRACT_CURRENT_OUTPUT_PATH)));
  assert.equal(actual.continuity.sha256, QUESTION_CONTRACT_CONTINUITY_SHA256);
  assert.deepEqual(actual.historicalOutput, continuity.historicalOutput);
  assert.deepEqual(actual.previousContinuity, continuity.previousContinuity);
  assert.deepEqual(actual.previousOutput, continuity.previousOutput);
  assert.deepEqual(actual.earlierContinuity, continuity.earlierContinuity);
  assert.deepEqual(actual.earlierOutput, continuity.earlierOutput);
  assert.deepEqual(actual.sameDatePredecessorContinuity, continuity.sameDatePredecessorContinuity);
  assert.deepEqual(actual.sameDatePredecessorOutput, continuity.sameDatePredecessorOutput);
  assert.equal(JSON.parse(readBytes(QUESTION_CONTRACT_EARLIER_OUTPUT_PATH)).sources.length, 113);
});
check('all original observed dependencies retained, with added imports', () => {
  assert.equal(historical.sources.length, 88);
  assert.equal(proof.sources.length, 121);
  assert.equal(continuity.addedSourcePaths.length, 33);
  const previous = JSON.parse(readBytes(QUESTION_CONTRACT_PREVIOUS_OUTPUT_PATH));
  assert.equal(previous.sources.length, 118);
  assert.equal(continuity.previousAddedSourcePaths.length, 3);
  assert.equal(continuity.previousSourceTransitions.length, 1);
  const sameDate = JSON.parse(readBytes(QUESTION_CONTRACT_SAME_DATE_PREDECESSOR_OUTPUT_PATH));
  assert.equal(sameDate.sources.length, 119);
  assert.equal(continuity.sameDatePredecessorAddedSourcePaths.length, 2);
  assert.equal(continuity.sameDatePredecessorSourceTransitions.length, 1);
  for (const source of sameDate.sources) assert.ok(proof.sources.some(input => input.file === source.file));
  for (const source of previous.sources) assert.ok(proof.sources.some(input => input.file === source.file));
  for (const source of historical.sources) assert.ok(proof.sources.some(input => input.file === source.file));
});
for (const path of [QUESTION_CONTRACT_CONTINUITY_PATH, QUESTION_CONTRACT_CURRENT_OUTPUT_PATH, QUESTION_CONTRACT_SUCCESSOR_PATH, QUESTION_CONTRACT_OUTPUT_PATH, QUESTION_CONTRACT_PREVIOUS_CONTINUITY_PATH, QUESTION_CONTRACT_PREVIOUS_OUTPUT_PATH, QUESTION_CONTRACT_EARLIER_CONTINUITY_PATH, QUESTION_CONTRACT_EARLIER_OUTPUT_PATH, QUESTION_CONTRACT_SAME_DATE_PREDECESSOR_CONTINUITY_PATH, QUESTION_CONTRACT_SAME_DATE_PREDECESSOR_OUTPUT_PATH]) {
  check(`tampered pinned evidence refused: ${path}`, () => assert.throws(() => assertQuestionContractOutputInputs(file => file === path ? Buffer.from('{}') : readBytes(file)), /bytes changed/));
  check(`missing pinned evidence refuses, never falls back: ${path}`, () => assert.throws(() => assertQuestionContractOutputInputs(file => {
    if (file === path) throw new Error('deliberately missing pinned evidence');
    return readBytes(file);
  }), /deliberately missing pinned evidence/));
}
const continuityMutations = {
  'wrong identity': [c => { c.recordId = 'other'; }, /continuity identity/],
  'wrong historical receipt': [c => { c.historicalSuccessor.sha256 = '0'.repeat(64); }, /continuity ancestry/],
  'wrong historical output': [c => { c.historicalOutput.sha256 = '0'.repeat(64); }, /continuity ancestry/],
  'wrong previous continuity': [c => { c.previousContinuity.sha256 = '0'.repeat(64); }, /previous continuity ancestry/],
  'wrong previous output': [c => { c.previousOutput.sha256 = '0'.repeat(64); }, /previous continuity ancestry/],
  'wrong earlier continuity': [c => { c.earlierContinuity.sha256 = '0'.repeat(64); }, /earlier continuity ancestry/],
  'wrong earlier output': [c => { c.earlierOutput.sha256 = '0'.repeat(64); }, /earlier continuity ancestry/],
  'wrong same-date continuity': [c => { c.sameDatePredecessorContinuity.sha256 = '0'.repeat(64); }, /same-date predecessor ancestry/],
  'wrong same-date output': [c => { c.sameDatePredecessorOutput.sha256 = '0'.repeat(64); }, /same-date predecessor ancestry/],
  'reduced same-date inventory': [c => { c.sameDatePredecessorSourceCount--; }, /source inventory/],
  'omitted same-date transition': [c => { c.sameDatePredecessorSourceTransitions.pop(); }, /undeclared same-date predecessor source transition/],
  'fabricated same-date transition': [c => { c.sameDatePredecessorSourceTransitions[0].beforeSha256 = '0'.repeat(64); }, /undeclared same-date predecessor source transition/],
  'omitted same-date addition': [c => { c.sameDatePredecessorAddedSourcePaths.pop(); }, /undeclared same-date predecessor source transition/],
  'reduced earlier inventory': [c => { c.earlierSourceCount--; }, /source inventory/],
  'reduced previous inventory': [c => { c.previousSourceCount--; }, /source inventory/],
  'omitted previous transition': [c => { c.previousSourceTransitions.pop(); }, /undeclared previous source transition/],
  'fabricated previous transition': [c => { c.previousSourceTransitions[0].beforeSha256 = '0'.repeat(64); }, /undeclared previous source transition/],
  'omitted previous addition': [c => { c.previousAddedSourcePaths.pop(); }, /undeclared previous source transition/],
  'unlisted successor path': [c => { c.currentOutput.path = 'other'; }, /current output path/],
  'wrong candidate': [c => { c.reproducedCodeSha = '0'.repeat(40); }, /candidate drift/],
  'reduced inventory': [c => { c.currentSourceCount = 103; }, /source inventory/],
  'omitted source transition': [c => { c.sourceTransitions.pop(); }, /undeclared source transition/],
  'fabricated source transition': [c => { c.sourceTransitions[0].beforeSha256 = '0'.repeat(64); }, /undeclared source transition/],
  'duplicated added source': [c => { c.addedSourcePaths[0] = c.addedSourcePaths[1]; }, /undeclared source transition/]
};
for (const key of ['createsOwnerApproval', 'changesApprovedOutputBytes', 'establishesProtectedVerification', 'establishesProviderOrPublicationProof', 'commercialAuthorityGranted', 'productionAuthorized']) {
  continuityMutations[`overclaimed ${key}`] = [c => { c[key] = true; }, /continuity overclaims/];
}
for (const [name, [mutate, reason]] of Object.entries(continuityMutations)) check(name, () => {
  const c = structuredClone(continuity); mutate(c); assert.throws(() => validate(c), reason);
});
const proofMutations = {
  'missing route': [p => p.routes.pop(), /route inventory/],
  'duplicate route': [p => { p.routes[0] = p.routes[1]; }, /route inventory/],
  'missing variant': [p => p.routes[0].artifacts.pop(), /changed output semantics/],
  'duplicate variant': [p => { p.routes[0].artifacts[0] = p.routes[0].artifacts[1]; }, /changed output semantics/],
  'wrong output bytes': [p => { p.routes[0].artifacts[0].sha256 = '0'.repeat(64); }, /changed output semantics/],
  'changed page count': [p => { p.routes[0].artifacts[0].pageCount++; }, /changed output semantics/],
  'changed text': [p => { p.routes[0].artifacts[0].textSha256 = '0'.repeat(64); }, /changed output semantics/],
  'changed protected field structure': [p => { p.routes[0].structure = []; }, /changed output semantics/],
  'changed synthetic facts': [p => { p.routes[0].fixture.currentFactMapSha256 = '0'.repeat(64); }, /changed output semantics/],
  'missing source': [p => p.sources.pop(), /source inventory/],
  'duplicate source': [p => { p.sources[0] = p.sources[1]; }, /source inventory/],
  'omitted historical source': [p => { p.sources[0] = { file: 'invented', sha256: '0'.repeat(64) }; }, /historical source omitted/],
  'failed check': [p => { p.checks[0].status = 'FAIL'; }, /acceptance incomplete/],
  'NOT_RUN check': [p => { p.checks[0].status = 'NOT_RUN'; }, /acceptance incomplete/],
  'duplicated check': [p => { p.checks[0] = p.checks[1]; }, /acceptance incomplete/],
  'missing check': [p => p.checks.pop(), /acceptance incomplete/],
  'source drift': [p => p.sourceDrift.push('changed source'), /acceptance incomplete/],
  'candidate changed during run': [p => { p.headAfter = '0'.repeat(40); }, /candidate drift/],
  'worktree changed during run': [p => { p.statusAfter += '\nchanged'; }, /candidate drift/]
};
for (const key of ['approvalGranted', 'commercialAuthorityGranted', 'productionAuthorized', 'protectedJourneyProven']) proofMutations[`output overclaims ${key}`] = [p => { p[key] = true; }, /proof scope/];
for (const [name, [mutate, reason]] of Object.entries(proofMutations)) check(name, () => {
  const p = structuredClone(proof); mutate(p); assert.throws(() => validate(continuity, p), reason);
});
check('an October 13 addition cannot disappear behind a revised transition list', () => {
  const c = structuredClone(continuity), p = structuredClone(proof);
  const prior = JSON.parse(readBytes(QUESTION_CONTRACT_EARLIER_OUTPUT_PATH));
  const originalPaths = new Set(historical.sources.map(input => input.file));
  const removed = prior.sources.find(input => !originalPaths.has(input.file)).file;
  p.sources.find(input => input.file === removed).file = 'invented';
  c.addedSourcePaths = c.addedSourcePaths.filter(file => file !== removed).concat('invented').sort();
  assert.throws(() => validate(c, p), /earlier source omitted/);
});
check('an October 14 addition cannot disappear behind revised transition lists', () => {
  const c = structuredClone(continuity), p = structuredClone(proof);
  const prior = JSON.parse(readBytes(QUESTION_CONTRACT_PREVIOUS_OUTPUT_PATH));
  const earlierPaths = new Set(JSON.parse(readBytes(QUESTION_CONTRACT_EARLIER_OUTPUT_PATH)).sources.map(input => input.file));
  const removed = prior.sources.find(input => !earlierPaths.has(input.file)).file;
  p.sources.find(input => input.file === removed).file = 'invented';
  c.addedSourcePaths = c.addedSourcePaths.filter(file => file !== removed).concat('invented').sort();
  assert.throws(() => validate(c, p), /previous source omitted/);
});
check('an October 15 v1 addition cannot disappear behind revised transition lists', () => {
  const c = structuredClone(continuity), p = structuredClone(proof);
  const prior = JSON.parse(readBytes(QUESTION_CONTRACT_SAME_DATE_PREDECESSOR_OUTPUT_PATH));
  const olderPaths = new Set(JSON.parse(readBytes(QUESTION_CONTRACT_PREVIOUS_OUTPUT_PATH)).sources.map(input => input.file));
  const removed = prior.sources.find(input => !olderPaths.has(input.file)).file;
  p.sources.find(input => input.file === removed).file = 'invented';
  c.addedSourcePaths = c.addedSourcePaths.filter(file => file !== removed).concat('invented').sort();
  c.previousAddedSourcePaths = c.previousAddedSourcePaths.filter(file => file !== removed).concat('invented').sort();
  assert.throws(() => validate(c, p), /same-date predecessor source omitted/);
});
for (const input of proof.sources) check(`current input cannot drift: ${input.file}`, () => assert.throws(() => assertQuestionContractOutputInputs(file => file === input.file ? Buffer.from('deliberately changed source') : readBytes(file)), /stale output input|specification moved|approved output bytes moved|historical evidence changed/));
for (const evidence of receipt.preservedEvidence) check(`historical evidence remains bound: ${evidence.path}`, () => assert.throws(() => validate(continuity, proof, file => file === evidence.path ? Buffer.from('changed history') : readBytes(file)), /historical evidence changed/));
check('MS original owner/source transition remains unchanged', () => {
  const row = receipt.routes.find(entry => entry.trackId === 'ms-nonconv');
  const actual = questionContractSourceSuccessorFor({ routeId: row.routeId, familyId: row.familyId, trackId: row.trackId,
    specificationPath: row.specification.path, expectedPriorSha256: row.specification.predecessorSha256,
    priorSpecificationBytes: readBytes(MS_QUESTION_CONTRACT_PREDECESSOR_PATH), currentSpecificationBytes: readBytes(row.specification.path), readBytes });
  assert.equal(actual.path, QUESTION_CONTRACT_SUCCESSOR_PATH);
  assert.equal(actual.sha256, continuity.historicalSuccessor.sha256);
  assert.deepEqual(actual.outputProof, receipt.outputProof);
  for (const key of ['createsOwnerApproval', 'changesApprovedOutputBytes', 'establishesProtectedVerification', 'establishesProviderOrPublicationProof', 'productionAuthorized']) assert.equal(actual[key], false);
});
console.log(`PASS: ${checks} output-continuity and refusal controls; no new approval, protected journey or commercial authority.`);
