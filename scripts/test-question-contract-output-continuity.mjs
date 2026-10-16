import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { runInNewContext } from 'node:vm';
import * as msProofInventory from './lib/ms-paid-packet-proof.mjs';
import {
  assertQuestionContractOutputInputs, assertQuestionContractOutputContinuity,
  readQuestionContractSuccessor, questionContractSourceSuccessorFor,
  QUESTION_CONTRACT_CONTINUITY_PATH, QUESTION_CONTRACT_CONTINUITY_SHA256,
  QUESTION_CONTRACT_REVIEWED_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_REVIEWED_REVISION_OUTPUT_PATH,
  QUESTION_CONTRACT_CURRENT_OUTPUT_PATH, QUESTION_CONTRACT_SUCCESSOR_PATH,
  QUESTION_CONTRACT_EARLIER_CONTINUITY_PATH, QUESTION_CONTRACT_EARLIER_OUTPUT_PATH,
  QUESTION_CONTRACT_SAME_DATE_PREDECESSOR_CONTINUITY_PATH, QUESTION_CONTRACT_SAME_DATE_PREDECESSOR_OUTPUT_PATH,
  QUESTION_CONTRACT_PREVIOUS_CONTINUITY_PATH, QUESTION_CONTRACT_PREVIOUS_OUTPUT_PATH,
  QUESTION_CONTRACT_PRIOR_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_PRIOR_REVISION_OUTPUT_PATH,
  QUESTION_CONTRACT_ACCEPTED_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_ACCEPTED_REVISION_OUTPUT_PATH,
  QUESTION_CONTRACT_EXECUTED_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_EXECUTED_REVISION_OUTPUT_PATH,
  QUESTION_CONTRACT_OBSERVED_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_OBSERVED_REVISION_OUTPUT_PATH,
  QUESTION_CONTRACT_BOUND_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_BOUND_REVISION_OUTPUT_PATH,
  QUESTION_CONTRACT_VALIDATED_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_VALIDATED_REVISION_OUTPUT_PATH,
  QUESTION_CONTRACT_RECORDED_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_RECORDED_REVISION_OUTPUT_PATH,
  QUESTION_CONTRACT_CAPTURED_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_CAPTURED_REVISION_OUTPUT_PATH,
  QUESTION_CONTRACT_RETAINED_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_CONTINUED_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_CONTINUED_REVISION_OUTPUT_PATH, QUESTION_CONTRACT_RETAINED_REVISION_OUTPUT_PATH,
  QUESTION_CONTRACT_MEASURED_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_MEASURED_REVISION_OUTPUT_PATH,
  QUESTION_CONTRACT_RENDERED_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_RENDERED_REVISION_OUTPUT_PATH,
  QUESTION_CONTRACT_IMMEDIATE_PREDECESSOR_CONTINUITY_PATH, QUESTION_CONTRACT_IMMEDIATE_PREDECESSOR_OUTPUT_PATH,
  QUESTION_CONTRACT_LATEST_PREDECESSOR_CONTINUITY_PATH, QUESTION_CONTRACT_LATEST_PREDECESSOR_OUTPUT_PATH,
  QUESTION_CONTRACT_OUTPUT_PATH, MS_QUESTION_CONTRACT_PREDECESSOR_PATH
} from '../src/lib/rcap/fulfillment/question-contract-source-successor.mjs';

const readBytes = file => fs.readFileSync(file);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const continuity = JSON.parse(readBytes(QUESTION_CONTRACT_CONTINUITY_PATH));
const proof = JSON.parse(readBytes(QUESTION_CONTRACT_CURRENT_OUTPUT_PATH));
const observedContinuity = JSON.parse(readBytes(QUESTION_CONTRACT_OBSERVED_REVISION_CONTINUITY_PATH));
const observedProof = JSON.parse(readBytes(QUESTION_CONTRACT_OBSERVED_REVISION_OUTPUT_PATH));
const measuredContinuity = JSON.parse(readBytes(QUESTION_CONTRACT_MEASURED_REVISION_CONTINUITY_PATH));
const measuredProof = JSON.parse(readBytes(QUESTION_CONTRACT_MEASURED_REVISION_OUTPUT_PATH));
const boundContinuity = JSON.parse(readBytes(QUESTION_CONTRACT_BOUND_REVISION_CONTINUITY_PATH));
const boundProof = JSON.parse(readBytes(QUESTION_CONTRACT_BOUND_REVISION_OUTPUT_PATH));
const validatedContinuity = JSON.parse(readBytes(QUESTION_CONTRACT_VALIDATED_REVISION_CONTINUITY_PATH));
const validatedProof = JSON.parse(readBytes(QUESTION_CONTRACT_VALIDATED_REVISION_OUTPUT_PATH));
const recordedContinuity = JSON.parse(readBytes(QUESTION_CONTRACT_RECORDED_REVISION_CONTINUITY_PATH));
const recordedProof = JSON.parse(readBytes(QUESTION_CONTRACT_RECORDED_REVISION_OUTPUT_PATH));
const capturedContinuity = JSON.parse(readBytes(QUESTION_CONTRACT_CAPTURED_REVISION_CONTINUITY_PATH));
const capturedProof = JSON.parse(readBytes(QUESTION_CONTRACT_CAPTURED_REVISION_OUTPUT_PATH));
const retainedContinuity = JSON.parse(readBytes(QUESTION_CONTRACT_RETAINED_REVISION_CONTINUITY_PATH));
const retainedProof = JSON.parse(readBytes(QUESTION_CONTRACT_RETAINED_REVISION_OUTPUT_PATH));
const continuedContinuity = JSON.parse(readBytes(QUESTION_CONTRACT_CONTINUED_REVISION_CONTINUITY_PATH));
const continuedProof = JSON.parse(readBytes(QUESTION_CONTRACT_CONTINUED_REVISION_OUTPUT_PATH));
const reviewedContinuity = JSON.parse(readBytes(QUESTION_CONTRACT_REVIEWED_REVISION_CONTINUITY_PATH));
const reviewedProof = JSON.parse(readBytes(QUESTION_CONTRACT_REVIEWED_REVISION_OUTPUT_PATH));
const historical = JSON.parse(readBytes(QUESTION_CONTRACT_OUTPUT_PATH));
const receipt = readQuestionContractSuccessor(readBytes);
let checks = 0;
function check(name, run) { try { run(); checks++; } catch (error) { error.message = `${name}: ${error.message}`; throw error; } }
const validate = (c = continuity, p = proof, read = readBytes) => assertQuestionContractOutputContinuity({ continuity: c, proof: p, readBytes: read });
check('exact executed successor validates complete current inventory', () => {
  const actual = assertQuestionContractOutputInputs(readBytes);
  assert.equal(actual.inputCount, 134);
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
  assert.deepEqual(actual.latestPredecessorContinuity, continuity.latestPredecessorContinuity);
  assert.deepEqual(actual.latestPredecessorOutput, continuity.latestPredecessorOutput);
  assert.deepEqual(actual.immediatePredecessorContinuity, continuity.immediatePredecessorContinuity);
  assert.deepEqual(actual.immediatePredecessorOutput, continuity.immediatePredecessorOutput);
  assert.deepEqual(actual.priorRevisionContinuity, continuity.priorRevisionContinuity);
  assert.deepEqual(actual.priorRevisionOutput, continuity.priorRevisionOutput);
  assert.deepEqual(actual.acceptedRevisionContinuity, continuity.acceptedRevisionContinuity);
  assert.deepEqual(actual.acceptedRevisionOutput, continuity.acceptedRevisionOutput);
  assert.deepEqual(actual.executedRevisionContinuity, continuity.executedRevisionContinuity);
  assert.deepEqual(actual.executedRevisionOutput, continuity.executedRevisionOutput);
  assert.deepEqual(actual.renderedRevisionContinuity, continuity.renderedRevisionContinuity);
  assert.deepEqual(actual.renderedRevisionOutput, continuity.renderedRevisionOutput);
  assert.deepEqual(actual.observedRevisionContinuity, continuity.observedRevisionContinuity);
  assert.deepEqual(actual.observedRevisionOutput, continuity.observedRevisionOutput);
  assert.deepEqual(actual.measuredRevisionContinuity, continuity.measuredRevisionContinuity);
  assert.deepEqual(actual.measuredRevisionOutput, continuity.measuredRevisionOutput);
  assert.deepEqual(actual.boundRevisionContinuity, continuity.boundRevisionContinuity);
  assert.deepEqual(actual.boundRevisionOutput, continuity.boundRevisionOutput);
  assert.deepEqual(actual.validatedRevisionContinuity, continuity.validatedRevisionContinuity);
  assert.deepEqual(actual.validatedRevisionOutput, continuity.validatedRevisionOutput);
  assert.deepEqual(actual.recordedRevisionContinuity, continuity.recordedRevisionContinuity);
  assert.deepEqual(actual.recordedRevisionOutput, continuity.recordedRevisionOutput);
  assert.deepEqual(actual.capturedRevisionContinuity, continuity.capturedRevisionContinuity);
  assert.deepEqual(actual.capturedRevisionOutput, continuity.capturedRevisionOutput);
  assert.deepEqual(actual.retainedRevisionContinuity, continuity.retainedRevisionContinuity);
  assert.deepEqual(actual.retainedRevisionOutput, continuity.retainedRevisionOutput);
  assert.deepEqual(actual.continuedRevisionContinuity, continuity.continuedRevisionContinuity);
  assert.deepEqual(actual.continuedRevisionOutput, continuity.continuedRevisionOutput);
  assert.deepEqual(actual.reviewedRevisionContinuity, continuity.reviewedRevisionContinuity);
  assert.deepEqual(actual.reviewedRevisionOutput, continuity.reviewedRevisionOutput);
  assert.equal(JSON.parse(readBytes(QUESTION_CONTRACT_EARLIER_OUTPUT_PATH)).sources.length, 113);
});
check('actual continuity reader paths fit the exact MS required inventory union including v14/v15/v16', () => {
  const reads = new Set();
  const actual = assertQuestionContractOutputInputs(file => { reads.add(file); return readBytes(file); });
  const source = fs.readFileSync('scripts/lib/ms-paid-packet-proof.mjs', 'utf8');
  const match = source.match(/const requiredInventory=(\[\.\.\.new Set\(\[[\s\S]*?\]\)\]\.sort\(\));/);
  assert.ok(match, 'use the real existing MS inventory expression, not a copied list');
  const context = { ...msProofInventory,
    predecessor: JSON.parse(readBytes(msProofInventory.MS_PAID_PACKET_PROOF_PREDECESSOR)),
    currentOutput: proof, proof: { outputContinuity: actual } };
  const inventory = expression => new Set(runInNewContext(expression, context));
  const required = inventory(match[1]);
  assert.ok([...reads].every(file => required.has(file)), 'every actual continuity read must enter MS source inventory');
  for (const token of ['retainedRevisionContinuity', 'retainedRevisionOutput', 'continuedRevisionContinuity', 'continuedRevisionOutput', 'reviewedRevisionContinuity', 'reviewedRevisionOutput']) {
    const path = actual[token].path;
    assert.ok(reads.has(path) && required.has(path), 'new predecessor is really read and included');
    const removed = match[1].replace(`proof.outputContinuity.${token}.path,`, '');
    assert.notEqual(removed, match[1]);
    assert.equal(inventory(removed).has(path), false, 'missing new predecessor cannot be masked by historical union');
  }
});
check('all original observed dependencies retained, with added imports', () => {
  // Keep the immutable v8 assertions at their original historical scope.
  const continuity = observedContinuity, proof = observedProof;
  assert.equal(historical.sources.length, 88);
  assert.equal(proof.sources.length, 124);
  assert.equal(continuity.addedSourcePaths.length, 36);
  const previous = JSON.parse(readBytes(QUESTION_CONTRACT_PREVIOUS_OUTPUT_PATH));
  assert.equal(previous.sources.length, 118);
  assert.equal(continuity.previousAddedSourcePaths.length, 6);
  assert.equal(continuity.previousSourceTransitions.length, 8);
  const sameDate = JSON.parse(readBytes(QUESTION_CONTRACT_SAME_DATE_PREDECESSOR_OUTPUT_PATH));
  assert.equal(sameDate.sources.length, 119);
  assert.equal(continuity.sameDatePredecessorAddedSourcePaths.length, 5);
  assert.equal(continuity.sameDatePredecessorSourceTransitions.length, 8);
  assert.equal(JSON.parse(readBytes(QUESTION_CONTRACT_LATEST_PREDECESSOR_OUTPUT_PATH)).sources.length, 121);
  assert.deepEqual(continuity.latestPredecessorAddedSourcePaths, ['src/lib/rcap-engine/texas-nondisclosure-facts.ts', 'src/lib/rcap-engine/wyoming-1401-facts.ts', 'src/lib/rcap-engine/wyoming-1501-facts.ts']);
  assert.equal(continuity.latestPredecessorSourceTransitions.length, 9);
  assert.ok(continuity.latestPredecessorSourceTransitions.some(row => row.file === 'src/lib/rcap-engine/california-1203-4-facts.ts'));
  assert.deepEqual(continuity.immediatePredecessorAddedSourcePaths, ['src/lib/rcap-engine/texas-nondisclosure-facts.ts', 'src/lib/rcap-engine/wyoming-1401-facts.ts', 'src/lib/rcap-engine/wyoming-1501-facts.ts']);
  assert.deepEqual(continuity.immediatePredecessorSourceTransitions.map(row => row.file), ["data/record-clearing/packet-specifications/GA-sb-288-misdemeanor-conviction-restriction-and-sealing.v1.json", "data/record-clearing/packet-specifications/MS-first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1.v1.json", "src/lib/expungement-ai/frontend/reviewed-result-display-copy.json", "src/lib/expungement-ai/localization.ts", "src/lib/expungement-ai/reviewed-contact-contracts.json", "src/lib/rcap/grade-a/composer.ts", "src/lib/rcap/grade-a/packet-specification.ts", "src/lib/rcap/grade-a/renderer.ts"]);
  assert.deepEqual(continuity.priorRevisionAddedSourcePaths, ['src/lib/rcap-engine/texas-nondisclosure-facts.ts', 'src/lib/rcap-engine/wyoming-1401-facts.ts', 'src/lib/rcap-engine/wyoming-1501-facts.ts']);
  assert.deepEqual(continuity.priorRevisionSourceTransitions.map(row => row.file), ["data/record-clearing/packet-specifications/MS-first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1.v1.json", "src/lib/expungement-ai/frontend/reviewed-result-display-copy.json", "src/lib/expungement-ai/localization.ts", "src/lib/expungement-ai/reviewed-contact-contracts.json", "src/lib/rcap/grade-a/composer.ts", "src/lib/rcap/grade-a/packet-specification.ts"]);
  assert.deepEqual(continuity.acceptedRevisionAddedSourcePaths, ['src/lib/rcap-engine/texas-nondisclosure-facts.ts', 'src/lib/rcap-engine/wyoming-1401-facts.ts', 'src/lib/rcap-engine/wyoming-1501-facts.ts']);
  assert.deepEqual(continuity.acceptedRevisionSourceTransitions.map(row => row.file), ['src/lib/expungement-ai/frontend/reviewed-result-display-copy.json', 'src/lib/expungement-ai/localization.ts']);
  for (const source of sameDate.sources) assert.ok(proof.sources.some(input => input.file === source.file));
  for (const source of previous.sources) assert.ok(proof.sources.some(input => input.file === source.file));
  for (const source of historical.sources) assert.ok(proof.sources.some(input => input.file === source.file));
});
check('immediate accepted v6 inventory is preserved with exact TX/WY observed additions', () => {
  // Keep the immutable v8 assertions at their original historical scope.
  const continuity = observedContinuity, proof = observedProof;
  const prior = JSON.parse(readBytes(QUESTION_CONTRACT_EXECUTED_REVISION_OUTPUT_PATH));
  assert.equal(prior.sources.length, 122);
  assert.equal(continuity.executedRevisionSourceCount, 122);
  assert.deepEqual(continuity.executedRevisionAddedSourcePaths, ['src/lib/rcap-engine/texas-nondisclosure-facts.ts', 'src/lib/rcap-engine/wyoming-1501-facts.ts']);
  assert.deepEqual(continuity.executedRevisionSourceTransitions, [{file:'src/lib/expungement-ai/frontend/reviewed-result-display-copy.json', beforeSha256:'f961c6fe9d4bd9663cf3b539d46dd96bf2fa1fee2d66f7c8a3b087f5709a1d6f', afterSha256:'4a31457e5aec3f314d99cf574774c94306ec0ceca8ecb4051e2ea7556440709b'}, {file:'src/lib/expungement-ai/localization.ts', beforeSha256:'ffa138a6b897029e5213df311b4c2b3abcc101e8b053da22fd72682c1644c259', afterSha256:'bf5c38efc088531fe2dcf598b32e47c4726a2b844ad2296cee0bc4ef10f469d7'}]);
  for (const input of prior.sources) assert.ok(proof.sources.some(current => current.file === input.file));
});
for (const path of [QUESTION_CONTRACT_VALIDATED_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_VALIDATED_REVISION_OUTPUT_PATH, QUESTION_CONTRACT_BOUND_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_BOUND_REVISION_OUTPUT_PATH, QUESTION_CONTRACT_MEASURED_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_MEASURED_REVISION_OUTPUT_PATH, QUESTION_CONTRACT_OBSERVED_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_OBSERVED_REVISION_OUTPUT_PATH, QUESTION_CONTRACT_CONTINUITY_PATH, QUESTION_CONTRACT_CURRENT_OUTPUT_PATH, QUESTION_CONTRACT_SUCCESSOR_PATH, QUESTION_CONTRACT_OUTPUT_PATH, QUESTION_CONTRACT_PREVIOUS_CONTINUITY_PATH, QUESTION_CONTRACT_PREVIOUS_OUTPUT_PATH, QUESTION_CONTRACT_EARLIER_CONTINUITY_PATH, QUESTION_CONTRACT_EARLIER_OUTPUT_PATH, QUESTION_CONTRACT_SAME_DATE_PREDECESSOR_CONTINUITY_PATH, QUESTION_CONTRACT_SAME_DATE_PREDECESSOR_OUTPUT_PATH, QUESTION_CONTRACT_LATEST_PREDECESSOR_CONTINUITY_PATH, QUESTION_CONTRACT_LATEST_PREDECESSOR_OUTPUT_PATH, QUESTION_CONTRACT_IMMEDIATE_PREDECESSOR_CONTINUITY_PATH, QUESTION_CONTRACT_IMMEDIATE_PREDECESSOR_OUTPUT_PATH, QUESTION_CONTRACT_PRIOR_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_PRIOR_REVISION_OUTPUT_PATH, QUESTION_CONTRACT_ACCEPTED_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_ACCEPTED_REVISION_OUTPUT_PATH, QUESTION_CONTRACT_EXECUTED_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_EXECUTED_REVISION_OUTPUT_PATH, QUESTION_CONTRACT_RENDERED_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_RENDERED_REVISION_OUTPUT_PATH]) {
  check(`tampered pinned evidence refused: ${path}`, () => assert.throws(() => assertQuestionContractOutputInputs(file => file === path ? Buffer.from('{}') : readBytes(file)), /bytes changed/));
  check(`missing pinned evidence refuses, never falls back: ${path}`, () => assert.throws(() => assertQuestionContractOutputInputs(file => {
    if (file === path) throw new Error('deliberately missing pinned evidence');
    return readBytes(file);
  }), /deliberately missing pinned evidence/));
}
check('immediate v7 inventory differs only by the accepted appended MIP result catalogue', () => {
  // Keep the immutable v8 assertions at their original historical scope.
  const continuity = observedContinuity, proof = observedProof;
  const prior = JSON.parse(readBytes(QUESTION_CONTRACT_RENDERED_REVISION_OUTPUT_PATH));
  assert.equal(prior.sources.length, 124);
  assert.equal(continuity.renderedRevisionSourceCount, 124);
  assert.deepEqual(continuity.renderedRevisionAddedSourcePaths, []);
  assert.deepEqual(continuity.renderedRevisionSourceTransitions, [{file:'src/lib/expungement-ai/frontend/reviewed-result-display-copy.json', beforeSha256:'f961c6fe9d4bd9663cf3b539d46dd96bf2fa1fee2d66f7c8a3b087f5709a1d6f', afterSha256:'4a31457e5aec3f314d99cf574774c94306ec0ceca8ecb4051e2ea7556440709b'}]);
  for (const input of prior.sources) assert.ok(proof.sources.some(current => current.file === input.file));
});
check('executed NY02 v9 retains v8 with exact observed five additions and two changes', () => {
  // Preserve immutablev9 expectations against its own actual receipt.
  const continuity=measuredContinuity, proof=measuredProof;
  assert.equal(observedProof.sources.length, 124);
  assert.equal(proof.sources.length, 129);
  assert.equal(continuity.observedRevisionSourceCount, 124);
  assert.deepEqual(continuity.observedRevisionAddedSourcePaths, ['src/lib/expungement-ai/ny-16059-clock-confirmation.ts', 'src/lib/rcap-engine/answer-normalization.ts', 'src/lib/rcap-engine/new-york-16059-clock-display.ts', 'src/lib/rcap-engine/new-york-16059-facts.ts', 'src/lib/rcap-engine/new-york-16059-questions.ts']);
  assert.deepEqual(continuity.observedRevisionSourceTransitions, [
    {file:'src/lib/expungement-ai/localization.ts', beforeSha256:'bf5c38efc088531fe2dcf598b32e47c4726a2b844ad2296cee0bc4ef10f469d7', afterSha256:'10895b57e43d3e4c69b3e00dfc5ac926b3955ca3a1657dbfb4a9270f5a9abd7e'},
    {file:'src/lib/expungement-ai/record-fact-clarification.ts', beforeSha256:'579589406162ffd8dee24ab4db76014ffc9c91dbd0497fb428cff94eb96575d7', afterSha256:'c3221c5ad8a3d54e359f8afb82eaa6c7a30cfa4e7107707e1ac1868fb75aa754'}]);
  assert.ok(observedProof.sources.every(input => proof.sources.some(current => current.file === input.file)));
});
check('actual MO610141 v10 preserves v9 and changes only measured localization', () => {
  // Preserve immutable v10 expectations against its own actual receipt.
  const continuity=boundContinuity, proof=boundProof;
  assert.equal(measuredProof.sources.length,129);
  assert.equal(proof.sources.length,129);
  assert.equal(continuity.measuredRevisionSourceCount,129);
  assert.deepEqual(continuity.measuredRevisionAddedSourcePaths,[]);
  assert.deepEqual(continuity.measuredRevisionSourceTransitions,[{file:'src/lib/expungement-ai/localization.ts',beforeSha256:'10895b57e43d3e4c69b3e00dfc5ac926b3955ca3a1657dbfb4a9270f5a9abd7e',afterSha256:'5ca96b90b781796b33d4d92e9a030c61f585ed66265667c827fd9ea5dad9f25f'}]);
  assert.equal(continuity.currentOutput.sha256,'01c9c66d9991c18a25a55adb89f47a8501aab0f3dc0423e2faa090df64330f47');
  assert.equal(proof.headBefore,'6b4cd9c214129e99053504e3936f8365ec05ff05');
  assert.equal(proof.headAfter,proof.headBefore);
  assert.equal(proof.statusAfter,proof.statusBefore);
  assert.ok(proof.statusBefore.includes('src/lib/expungement-ai/localization.ts'),'retain actual precommit dirty render custody');
  assert.ok(measuredProof.sources.every(input=>proof.sources.some(current=>current.file===input.file)));
});
check('actual NY16055 v11 preserves v10 with two measured display changes only', () => {
  // Retain immutable v11 expectations against its own accepted execution.
  const continuity=validatedContinuity, proof=validatedProof;
  assert.equal(boundProof.sources.length,129);
  assert.equal(proof.sources.length,129);
  assert.equal(continuity.boundRevisionSourceCount,129);
  assert.deepEqual(continuity.boundRevisionAddedSourcePaths,[]);
  assert.deepEqual(continuity.boundRevisionSourceTransitions,[{"file":"src/lib/expungement-ai/frontend/reviewed-result-display-copy.json","beforeSha256":"4a31457e5aec3f314d99cf574774c94306ec0ceca8ecb4051e2ea7556440709b","afterSha256":"f1265cb2b749a3fffacc567c4d6a79442e2e7ca6203cc49f57880586ba7d2cb4"},{"file":"src/lib/expungement-ai/reviewed-result-copy.ts","beforeSha256":"80b5414257fce5546bff747e5635470b618c42541467955314c78af7c7d26cc4","afterSha256":"54fc6f1deebe3576a3d5774a735aa587643daaf368b2b3cddecfd78b5e882ee5"}]);
  assert.equal(continuity.currentOutput.sha256,'e6e928e4ab51a16e39ac8dd859a7b5b882ef73847addbe31797fd9234acd53c1');
  assert.equal(proof.headBefore,'73766e4683056ad03d2decaf1ecf832446c7ce8c');
  assert.equal(proof.headAfter,proof.headBefore);
  assert.equal(proof.statusAfter,proof.statusBefore);
  assert.ok(boundProof.sources.every(input=>proof.sources.some(current=>current.file===input.file)));
});
check('actual NY117 v12 preserves v11 with two measured display changes only', () => {
  const continuity = recordedContinuity, proof = recordedProof;
  assert.equal(validatedProof.sources.length,129);
  assert.equal(proof.sources.length,129);
  assert.equal(continuity.validatedRevisionSourceCount,129);
  assert.deepEqual(continuity.validatedRevisionAddedSourcePaths,[]);
  assert.deepEqual(continuity.validatedRevisionSourceTransitions,[{"file":"src/lib/expungement-ai/frontend/reviewed-result-display-copy.json","beforeSha256":"f1265cb2b749a3fffacc567c4d6a79442e2e7ca6203cc49f57880586ba7d2cb4","afterSha256":"46d57b5c926f25248608c4c923436a86ea457968b13d37795434b698b153b476"},{"file":"src/lib/expungement-ai/reviewed-result-copy.ts","beforeSha256":"54fc6f1deebe3576a3d5774a735aa587643daaf368b2b3cddecfd78b5e882ee5","afterSha256":"deba4d419adf9e49da744cc49abf60d3d56e7e33fd1a15293df537f6c9042acb"}]);
  assert.equal(continuity.currentOutput.sha256,'5b684eeec4064364adc5420711162b9a8acd672ff7702950019cd89aa43dafd2');
  assert.equal(proof.headBefore,'0e8c94917db22208ed91902946a86ebdd20975a3');
  assert.equal(proof.headAfter,proof.headBefore);
  assert.equal(proof.statusAfter,proof.statusBefore);
  assert.ok(validatedProof.sources.every(input=>proof.sources.some(current=>current.file===input.file)));
});
check('actual NY120 v13 preserves v12 with one measured catalog change only', () => {
  const continuity = capturedContinuity, proof = capturedProof;
  assert.equal(recordedProof.sources.length,129);
  assert.equal(proof.sources.length,129);
  assert.equal(continuity.recordedRevisionSourceCount,129);
  assert.deepEqual(continuity.recordedRevisionAddedSourcePaths,[]);
  assert.deepEqual(continuity.recordedRevisionSourceTransitions,[{"file":"src/lib/expungement-ai/frontend/reviewed-result-display-copy.json","beforeSha256":"46d57b5c926f25248608c4c923436a86ea457968b13d37795434b698b153b476","afterSha256":"c1e52aced34d07083567f14cd97fcd880eea8fe65da356715c63beea9a797a40"}]);
  assert.equal(continuity.currentOutput.sha256,'4ed443b2b6727881536548eae9f1ca9cfe0e8f408b183c971c31fa3c7e50306c');
  assert.equal(proof.headBefore,'ddf788fa144b2fa28e1d0ed2cf56b4beaac273ea');
  assert.equal(proof.headAfter,proof.headBefore);
  assert.equal(proof.statusAfter,proof.statusBefore);
  assert.ok(recordedProof.sources.every(input=>proof.sources.some(current=>current.file===input.file)));
});
check('actual MD police v14 preserves v13 with one measured catalog change only', () => {
  const continuity = retainedContinuity, proof = retainedProof;
  assert.equal(capturedProof.sources.length,129);
  assert.equal(proof.sources.length,129);
  assert.equal(continuity.capturedRevisionSourceCount,129);
  assert.deepEqual(continuity.capturedRevisionAddedSourcePaths,[]);
  assert.deepEqual(continuity.capturedRevisionSourceTransitions,[{"file":"src/lib/expungement-ai/frontend/reviewed-result-display-copy.json","beforeSha256":"c1e52aced34d07083567f14cd97fcd880eea8fe65da356715c63beea9a797a40","afterSha256":"e8387d12520458361a715637221c2dce8a8493745eded595f766727fb3c8021b"}]);
  assert.equal(continuity.currentOutput.sha256,'472b6cf2fd3e10ae2a84d40efd0c4701c752e804f2857f6dcde7d44f3ae961a1');
  assert.equal(proof.headBefore,'252fc586781ffc5c75c2f514de7a8f5b1344e40d');
  assert.equal(proof.headAfter,proof.headBefore);
  assert.equal(proof.statusAfter,proof.statusBefore);
  assert.ok(capturedProof.sources.every(input=>proof.sources.some(current=>current.file===input.file)));
});
check('actual MS first-offender v15 preserves v14 and exact measured five additions/two changes', () => {
  const continuity = continuedContinuity, proof = continuedProof;
  assert.equal(retainedProof.sources.length,129);
  assert.equal(proof.sources.length,134);
  assert.equal(continuity.retainedRevisionSourceCount,129);
  assert.deepEqual(continuity.retainedRevisionAddedSourcePaths,["data/record-clearing/legal-design-intake/MS.memo.json", "src/lib/expungement-ai/ms-first-offender-source-questions.ts", "src/lib/legal-authority/routes/mississippi.json", "src/lib/rcap-engine/mississippi-first-offender-source-facts.ts", "src/lib/rcap-engine/profile-registry.ts"]);
  assert.deepEqual(continuity.retainedRevisionSourceTransitions,[{"file": "src/lib/expungement-ai/frontend/reviewed-result-display-copy.json", "beforeSha256": "e8387d12520458361a715637221c2dce8a8493745eded595f766727fb3c8021b", "afterSha256": "820ebb0b569c09082f93c43869bd3f0488e8f9a0f0fcf7cfa96ec61d2d342b89"}, {"file": "src/lib/expungement-ai/record-fact-clarification.ts", "beforeSha256": "c3221c5ad8a3d54e359f8afb82eaa6c7a30cfa4e7107707e1ac1868fb75aa754", "afterSha256": "22943fa03665a2cfea63381577bf694a7b2fa4aab520ac8f86552b71eee06dd5"}]);
  assert.equal(continuity.currentOutput.sha256,'c3ec80751df95ab3d80acc7590c4237332ba5686626260aff0db8f6a83290faa');
  assert.equal(proof.headBefore,'c7a48e976687759b274e211d7383a0591135fa3e');
  assert.equal(proof.headAfter,proof.headBefore);
  assert.equal(proof.statusAfter,proof.statusBefore);
  assert.ok(retainedProof.sources.every(input=>proof.sources.some(current=>current.file===input.file)));
});
for (const path of [QUESTION_CONTRACT_RETAINED_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_RETAINED_REVISION_OUTPUT_PATH]) {
  check(`tampered v14 predecessor refused: ${path}`, () => assert.throws(() => assertQuestionContractOutputInputs(file => file === path ? Buffer.from('{}') : readBytes(file)), /bytes changed/));
  check(`missing v14 predecessor refuses: ${path}`, () => assert.throws(() => assertQuestionContractOutputInputs(file => {if(file===path)throw new Error('deliberately missing v14 evidence');return readBytes(file);}), /deliberately missing v14 evidence/));
}
check('actual CT54u v16 preserves all v15 paths and only measured localization transition', () => {
  const continuity = reviewedContinuity, proof = reviewedProof;
  assert.equal(continuedProof.sources.length,134);
  assert.equal(proof.sources.length,134);
  assert.equal(continuity.continuedRevisionSourceCount,134);
  assert.deepEqual(continuity.continuedRevisionAddedSourcePaths,[]);
  assert.deepEqual(continuity.continuedRevisionSourceTransitions,[{"file": "src/lib/expungement-ai/localization.ts", "beforeSha256": "5ca96b90b781796b33d4d92e9a030c61f585ed66265667c827fd9ea5dad9f25f", "afterSha256": "b3a9a104b41c6c828d10a367eaf05271e97704c75b98077889967c7770b34a8f"}]);
  assert.equal(continuity.currentOutput.sha256,'31483aa3539d3609ff3e67729d0fce06302a1560f8f978be98ec240324435ec3');
  assert.equal(proof.headBefore,'b725f73df9b783a7904b639cad21679f5cc95e03');
  assert.equal(proof.headAfter,proof.headBefore);
  assert.equal(proof.statusAfter,proof.statusBefore);
  assert.deepEqual(proof.sources.map(row=>row.file),continuedProof.sources.map(row=>row.file));
});
for (const path of [QUESTION_CONTRACT_CONTINUED_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_CONTINUED_REVISION_OUTPUT_PATH]) {
  check(`tampered v15 predecessor refused: ${path}`, () => assert.throws(() => assertQuestionContractOutputInputs(file => file === path ? Buffer.from('{}') : readBytes(file)), /bytes changed/));
  check(`missing v15 predecessor refuses: ${path}`, () => assert.throws(() => assertQuestionContractOutputInputs(file => {if(file===path)throw new Error('deliberately missing v15 evidence');return readBytes(file);}), /deliberately missing v15 evidence/));
}
check('actual CT19/20 v17 preserves all v16 paths and only measured localization transition', () => {
  assert.equal(reviewedProof.sources.length,134);
  assert.equal(proof.sources.length,134);
  assert.equal(continuity.reviewedRevisionSourceCount,134);
  assert.deepEqual(continuity.reviewedRevisionAddedSourcePaths,[]);
  assert.deepEqual(continuity.reviewedRevisionSourceTransitions,[{file:'src/lib/expungement-ai/localization.ts',beforeSha256:'b3a9a104b41c6c828d10a367eaf05271e97704c75b98077889967c7770b34a8f',afterSha256:'d1f16d1b1fabe287cb9bc46862388712b135854e8624508297427d9e0de5239d'}]);
  assert.equal(continuity.currentOutput.sha256,'d3abf1d26b391881aab87c6b103b46e5a32df481acf08532bfe22cd830e9f5b4');
  assert.equal(proof.headBefore,'f489a3dd2c8e5ed7a5a5f31b4c710c43081faad5');
  assert.equal(proof.headAfter,proof.headBefore);
  assert.equal(proof.statusAfter,proof.statusBefore);
  assert.deepEqual(proof.sources.map(row=>row.file),reviewedProof.sources.map(row=>row.file));
});
for (const path of [QUESTION_CONTRACT_REVIEWED_REVISION_CONTINUITY_PATH, QUESTION_CONTRACT_REVIEWED_REVISION_OUTPUT_PATH]) {
  check(`tampered v16 predecessor refused: ${path}`, () => assert.throws(() => assertQuestionContractOutputInputs(file => file === path ? Buffer.from('{}') : readBytes(file)), /bytes changed/));
  check(`missing v16 predecessor refuses: ${path}`, () => assert.throws(() => assertQuestionContractOutputInputs(file => {if(file===path)throw new Error('deliberately missing v16 evidence');return readBytes(file);}), /deliberately missing v16 evidence/));
}
const continuityMutations = {
  'wrong reviewed revision continuity': [c => { c.reviewedRevisionContinuity.sha256 = '0'.repeat(64); }, /reviewed revision predecessor ancestry/],
  'wrong reviewed revision output': [c => { c.reviewedRevisionOutput.sha256 = '0'.repeat(64); }, /reviewed revision predecessor ancestry/],
  'reduced reviewed revision inventory': [c => { c.reviewedRevisionSourceCount--; }, /source inventory/],
  'omitted reviewed revision transition': [c => { c.reviewedRevisionSourceTransitions.pop(); }, /undeclared reviewed predecessor source transition/],
  'fabricated reviewed revision transition': [c => { c.reviewedRevisionSourceTransitions[0].beforeSha256 = '0'.repeat(64); }, /undeclared reviewed predecessor source transition/],
  'invented reviewed revision addition': [c => { c.reviewedRevisionAddedSourcePaths.push('invented'); }, /undeclared reviewed predecessor source transition/],
  'wrong continued revision continuity': [c => { c.continuedRevisionContinuity.sha256 = '0'.repeat(64); }, /continued revision predecessor ancestry/],
  'wrong continued revision output': [c => { c.continuedRevisionOutput.sha256 = '0'.repeat(64); }, /continued revision predecessor ancestry/],
  'reduced continued revision inventory': [c => { c.continuedRevisionSourceCount--; }, /source inventory/],
  'omitted continued revision transition': [c => { c.continuedRevisionSourceTransitions.pop(); }, /undeclared continued predecessor source transition/],
  'fabricated continued revision transition': [c => { c.continuedRevisionSourceTransitions[0].beforeSha256 = '0'.repeat(64); }, /undeclared continued predecessor source transition/],
  'invented continued revision addition': [c => { c.continuedRevisionAddedSourcePaths.push('invented'); }, /undeclared continued predecessor source transition/],
  'wrong retained revision continuity': [c => { c.retainedRevisionContinuity.sha256 = '0'.repeat(64); }, /retained revision predecessor ancestry/],
  'wrong retained revision output': [c => { c.retainedRevisionOutput.sha256 = '0'.repeat(64); }, /retained revision predecessor ancestry/],
  'reduced retained revision inventory': [c => { c.retainedRevisionSourceCount--; }, /source inventory/],
  'omitted retained revision transition': [c => { c.retainedRevisionSourceTransitions.pop(); }, /undeclared retained predecessor source transition/],
  'fabricated retained revision transition': [c => { c.retainedRevisionSourceTransitions[0].beforeSha256 = '0'.repeat(64); }, /undeclared retained predecessor source transition/],
  'invented retained revision addition': [c => { c.retainedRevisionAddedSourcePaths.push('invented'); }, /undeclared retained predecessor source transition/],
  'wrong captured revision continuity': [c => { c.capturedRevisionContinuity.sha256 = '0'.repeat(64); }, /captured revision predecessor ancestry/],
  'wrong captured revision output': [c => { c.capturedRevisionOutput.sha256 = '0'.repeat(64); }, /captured revision predecessor ancestry/],
  'reduced captured revision inventory': [c => { c.capturedRevisionSourceCount--; }, /source inventory/],
  'omitted captured revision transition': [c => { c.capturedRevisionSourceTransitions.pop(); }, /undeclared captured predecessor source transition/],
  'fabricated captured revision transition': [c => { c.capturedRevisionSourceTransitions[0].beforeSha256 = '0'.repeat(64); }, /undeclared captured predecessor source transition/],
  'invented captured revision addition': [c => { c.capturedRevisionAddedSourcePaths.push('invented'); }, /undeclared captured predecessor source transition/],
  'wrong recorded revision continuity': [c => { c.recordedRevisionContinuity.sha256 = '0'.repeat(64); }, /recorded revision predecessor ancestry/],
  'wrong recorded revision output': [c => { c.recordedRevisionOutput.sha256 = '0'.repeat(64); }, /recorded revision predecessor ancestry/],
  'reduced recorded revision inventory': [c => { c.recordedRevisionSourceCount--; }, /source inventory/],
  'omitted recorded revision transition': [c => { c.recordedRevisionSourceTransitions.pop(); }, /undeclared recorded predecessor source transition/],
  'fabricated recorded revision transition': [c => { c.recordedRevisionSourceTransitions[0].beforeSha256 = '0'.repeat(64); }, /undeclared recorded predecessor source transition/],
  'invented recorded revision addition': [c => { c.recordedRevisionAddedSourcePaths.push('invented'); }, /undeclared recorded predecessor source transition/],
  'wrong validated revision continuity': [c => { c.validatedRevisionContinuity.sha256 = '0'.repeat(64); }, /validated revision predecessor ancestry/],
  'wrong validated revision output': [c => { c.validatedRevisionOutput.sha256 = '0'.repeat(64); }, /validated revision predecessor ancestry/],
  'reduced validated revision inventory': [c => { c.validatedRevisionSourceCount--; }, /source inventory/],
  'omitted validated revision transition': [c => { c.validatedRevisionSourceTransitions.pop(); }, /undeclared validated predecessor source transition/],
  'fabricated validated revision transition': [c => { c.validatedRevisionSourceTransitions[0].beforeSha256 = '0'.repeat(64); }, /undeclared validated predecessor source transition/],
  'invented validated revision addition': [c => { c.validatedRevisionAddedSourcePaths.push('invented'); }, /undeclared validated predecessor source transition/],
  'wrong bound revision continuity': [c => { c.boundRevisionContinuity.sha256 = '0'.repeat(64); }, /bound revision predecessor ancestry/],
  'wrong bound revision output': [c => { c.boundRevisionOutput.sha256 = '0'.repeat(64); }, /bound revision predecessor ancestry/],
  'reduced bound revision inventory': [c => { c.boundRevisionSourceCount--; }, /source inventory/],
  'omitted bound revision transition': [c => { c.boundRevisionSourceTransitions.pop(); }, /undeclared bound predecessor source transition/],
  'fabricated bound revision transition': [c => { c.boundRevisionSourceTransitions[0].beforeSha256 = '0'.repeat(64); }, /undeclared bound predecessor source transition/],
  'invented bound revision addition': [c => { c.boundRevisionAddedSourcePaths.push('invented'); }, /undeclared bound predecessor source transition/],
  'wrong measured revision continuity': [c => { c.measuredRevisionContinuity.sha256 = '0'.repeat(64); }, /measured revision predecessor ancestry/],
  'wrong measured revision output': [c => { c.measuredRevisionOutput.sha256 = '0'.repeat(64); }, /measured revision predecessor ancestry/],
  'reduced measured revision inventory': [c => { c.measuredRevisionSourceCount--; }, /source inventory/],
  'omitted measured revision transition': [c => { c.measuredRevisionSourceTransitions.pop(); }, /undeclared measured predecessor source transition/],
  'fabricated measured revision transition': [c => { c.measuredRevisionSourceTransitions[0].beforeSha256 = '0'.repeat(64); }, /undeclared measured predecessor source transition/],
  'invented measured revision addition': [c => { c.measuredRevisionAddedSourcePaths.push('invented'); }, /undeclared measured predecessor source transition/],
  'wrong observed revision continuity': [c => { c.observedRevisionContinuity.sha256 = '0'.repeat(64); }, /observed revision predecessor ancestry/],
  'wrong observed revision output': [c => { c.observedRevisionOutput.sha256 = '0'.repeat(64); }, /observed revision predecessor ancestry/],
  'reduced observed revision inventory': [c => { c.observedRevisionSourceCount--; }, /source inventory/],
  'omitted observed revision transition': [c => { c.observedRevisionSourceTransitions.pop(); }, /undeclared observed predecessor source transition/],
  'fabricated observed revision transition': [c => { c.observedRevisionSourceTransitions[0].beforeSha256 = '0'.repeat(64); }, /undeclared observed predecessor source transition/],
  'omitted observed revision addition': [c => { c.observedRevisionAddedSourcePaths.pop(); }, /undeclared observed predecessor source transition/],
  'invented observed revision addition': [c => { c.observedRevisionAddedSourcePaths.push('invented'); }, /undeclared observed predecessor source transition/],
  'wrong rendered revision continuity': [c => { c.renderedRevisionContinuity.sha256 = '0'.repeat(64); }, /rendered revision predecessor ancestry/],
  'wrong rendered revision output': [c => { c.renderedRevisionOutput.sha256 = '0'.repeat(64); }, /rendered revision predecessor ancestry/],
  'reduced rendered revision inventory': [c => { c.renderedRevisionSourceCount--; }, /source inventory/],
  'omitted rendered revision transition': [c => { c.renderedRevisionSourceTransitions.pop(); }, /undeclared rendered predecessor source transition/],
  'fabricated rendered revision transition': [c => { c.renderedRevisionSourceTransitions[0].beforeSha256 = '0'.repeat(64); }, /undeclared rendered predecessor source transition/],
  'invented rendered revision addition': [c => { c.renderedRevisionAddedSourcePaths.push('invented'); }, /undeclared rendered predecessor source transition/],
  'wrong executed revision continuity': [c => { c.executedRevisionContinuity.sha256 = '0'.repeat(64); }, /executed revision predecessor ancestry/],
  'wrong executed revision output': [c => { c.executedRevisionOutput.sha256 = '0'.repeat(64); }, /executed revision predecessor ancestry/],
  'reduced executed revision inventory': [c => { c.executedRevisionSourceCount--; }, /source inventory/],
  'omitted executed revision transition': [c => { c.executedRevisionSourceTransitions.pop(); }, /undeclared executed predecessor source transition/],
  'fabricated executed revision transition': [c => { c.executedRevisionSourceTransitions[0].beforeSha256 = '0'.repeat(64); }, /undeclared executed predecessor source transition/],
  'invented executed revision addition': [c => { c.executedRevisionAddedSourcePaths.push('invented'); }, /undeclared executed predecessor source transition/],
  'wrong accepted revision continuity': [c => { c.acceptedRevisionContinuity.sha256 = '0'.repeat(64); }, /accepted revision predecessor ancestry/],
  'wrong accepted revision output': [c => { c.acceptedRevisionOutput.sha256 = '0'.repeat(64); }, /accepted revision predecessor ancestry/],
  'reduced accepted revision inventory': [c => { c.acceptedRevisionSourceCount--; }, /source inventory/],
  'omitted accepted revision transition': [c => { c.acceptedRevisionSourceTransitions.pop(); }, /undeclared accepted predecessor source transition/],
  'fabricated accepted revision transition': [c => { c.acceptedRevisionSourceTransitions[0].beforeSha256 = '0'.repeat(64); }, /undeclared accepted predecessor source transition/],
  'invented accepted revision addition': [c => { c.acceptedRevisionAddedSourcePaths.push('invented'); }, /undeclared accepted predecessor source transition/],
  'wrong revision continuity': [c => { c.priorRevisionContinuity.sha256 = '0'.repeat(64); }, /revision predecessor ancestry/],
  'wrong revision output': [c => { c.priorRevisionOutput.sha256 = '0'.repeat(64); }, /revision predecessor ancestry/],
  'reduced revision inventory': [c => { c.priorRevisionSourceCount--; }, /source inventory/],
  'omitted revision transition': [c => { c.priorRevisionSourceTransitions.pop(); }, /undeclared revision predecessor source transition/],
  'fabricated revision transition': [c => { c.priorRevisionSourceTransitions[0].beforeSha256 = '0'.repeat(64); }, /undeclared revision predecessor source transition/],
  'invented revision addition': [c => { c.priorRevisionAddedSourcePaths.push('invented'); }, /undeclared revision predecessor source transition/],
  'wrong immediate continuity': [c => { c.immediatePredecessorContinuity.sha256 = '0'.repeat(64); }, /immediate predecessor ancestry/],
  'wrong immediate output': [c => { c.immediatePredecessorOutput.sha256 = '0'.repeat(64); }, /immediate predecessor ancestry/],
  'reduced immediate inventory': [c => { c.immediatePredecessorSourceCount--; }, /source inventory/],
  'omitted immediate transition': [c => { c.immediatePredecessorSourceTransitions.pop(); }, /undeclared immediate predecessor source transition/],
  'fabricated immediate transition': [c => { c.immediatePredecessorSourceTransitions[0].beforeSha256 = '0'.repeat(64); }, /undeclared immediate predecessor source transition/],
  'invented immediate addition': [c => { c.immediatePredecessorAddedSourcePaths.push('invented'); }, /undeclared immediate predecessor source transition/],
  'wrong latest continuity': [c => { c.latestPredecessorContinuity.sha256 = '0'.repeat(64); }, /latest predecessor ancestry/],
  'wrong latest output': [c => { c.latestPredecessorOutput.sha256 = '0'.repeat(64); }, /latest predecessor ancestry/],
  'reduced latest inventory': [c => { c.latestPredecessorSourceCount--; }, /source inventory/],
  'omitted latest transition': [c => { c.latestPredecessorSourceTransitions.pop(); }, /undeclared latest predecessor source transition/],
  'fabricated latest transition': [c => { c.latestPredecessorSourceTransitions[0].beforeSha256 = '0'.repeat(64); }, /undeclared latest predecessor source transition/],
  'invented latest addition': [c => { c.latestPredecessorAddedSourcePaths.push('invented'); }, /undeclared latest predecessor source transition/],
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
