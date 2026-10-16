import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  readQuestionContractSuccessor, questionContractSourceSuccessorFor,
  assertQuestionContractSourceSuccessor, assertQuestionContractOutputInputs,
  QUESTION_CONTRACT_SUCCESSOR_PATH, QUESTION_CONTRACT_OUTPUT_PATH
} from '../src/lib/rcap/fulfillment/question-contract-source-successor.mjs';

const readBytes = file => fs.readFileSync(file);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const receipt = readQuestionContractSuccessor(readBytes);
let checks = 0;
const check = (label, fn) => { try { fn(); checks++; } catch (error) { error.message = `${label}: ${error.message}`; throw error; } };
check('current output continuity retains all 134 observed inputs', () => assert.equal(assertQuestionContractOutputInputs(readBytes).inputCount, 134));
for (const row of receipt.routes) {
  const input = {
    routeId: row.routeId, familyId: row.familyId, trackId: row.trackId,
    specificationPath: row.specification.path, expectedPriorSha256: row.specification.predecessorSha256,
    priorSpecificationBytes: execFileSync('git', ['show', `${receipt.predecessorCommit}:${row.specification.path}`]),
    currentSpecificationBytes: readBytes(row.specification.path), readBytes
  };
  check(row.routeId + ' exact source/output continuity', () => {
    const result = questionContractSourceSuccessorFor(input);
    assert.equal(result.specificationSha256, row.specification.currentSha256);
    for (const key of ['createsOwnerApproval', 'changesApprovedOutputBytes', 'establishesProtectedVerification', 'establishesProviderOrPublicationProof', 'productionAuthorized']) assert.equal(result[key], false);
  });
  for (const key of ['familyId', 'trackId', 'specificationPath', 'expectedPriorSha256']) check(row.routeId + ' refuses wrong ' + key, () => {
    assert.throws(() => questionContractSourceSuccessorFor({ ...input, [key]: 'wrong' }), /refused/);
  });
  for (const key of ['priorSpecificationBytes', 'currentSpecificationBytes']) check(row.routeId + ' refuses corrupt ' + key, () => {
    assert.throws(() => questionContractSourceSuccessorFor({ ...input, [key]: Buffer.from('{}') }), /refused/);
  });
  for (const path of [QUESTION_CONTRACT_SUCCESSOR_PATH, QUESTION_CONTRACT_OUTPUT_PATH, ...receipt.preservedEvidence.map(evidence => evidence.path)]) {
    check(row.routeId + ' refuses changed evidence ' + path, () => assert.throws(() => questionContractSourceSuccessorFor({ ...input,
      readBytes: file => file === path ? Buffer.from('{}') : readBytes(file) }), /refused/));
  }
  const output = JSON.parse(readBytes(QUESTION_CONTRACT_OUTPUT_PATH)).routes.find(entry => entry.routeId === row.routeId);
  for (const artifact of output.artifacts) check(row.routeId + ' refuses moved ' + artifact.id, () => assert.throws(() => questionContractSourceSuccessorFor({ ...input,
    readBytes: file => file === artifact.historical.path ? Buffer.from('changed output') : readBytes(file) }), /refused/));
  for (const target of ['documents', 'sourceIdentities', 'finalVerificationRequirements']) check(row.routeId + ' rejects changed ' + target + ' below byte pin', () => {
    const r = structuredClone(receipt), selected = r.routes.find(entry => entry.routeId === row.routeId);
    const spec = JSON.parse(input.currentSpecificationBytes); spec[target] = [];
    const bytes = Buffer.from(JSON.stringify(spec)); selected.specification.currentSha256 = sha(bytes);
    assert.throws(() => assertQuestionContractSourceSuccessor({ ...input, receipt: r, row: selected, currentSpecificationBytes: bytes }), /unlisted specification change|changed /);
  });
  if (row.reviewedExactOperations.length) check(row.routeId + ' rejects missing operation below byte pin', () => {
    const r = structuredClone(receipt), selected = r.routes.find(entry => entry.routeId === row.routeId); selected.reviewedExactOperations.pop();
    assert.throws(() => assertQuestionContractSourceSuccessor({ ...input, receipt: r, row: selected }), /unlisted specification change/);
  });
  for (const [key,value] of Object.entries({schemaVersion:'wrong',recordId:'wrong',kind:'approval',
    createsOwnerApproval:true,changesApprovedOutputBytes:true,establishesProtectedVerification:true,
    establishesProviderOrPublicationProof:true,productionAuthorized:true})) {
    check(row.routeId + ' rejects direct receipt overclaim ' + key, () => {
      const r=structuredClone(receipt);r[key]=value;
      assert.throws(()=>assertQuestionContractSourceSuccessor({...input,receipt:r,row}),/receipt identity|overclaims/);
    });
  }
  check(row.routeId + ' cannot duplicate a transition below byte pin', () => {
    const r = structuredClone(receipt); r.routes.push(structuredClone(row));
    assert.throws(() => assertQuestionContractSourceSuccessor({ ...input, receipt: r, row }), /uniquely|inventory/);
  });
}
check('unlisted route has no successor', () => assert.equal(questionContractSourceSuccessorFor({ routeId: 'MS:unlisted', readBytes }), null));
check('stale source input is not equivalent to byte-identical historical PDFs', () => {
  const input = JSON.parse(readBytes(QUESTION_CONTRACT_OUTPUT_PATH)).sources.find(source => source.file.endsWith('question-answer-state.ts'));
  assert.throws(() => assertQuestionContractOutputInputs(file => file === input.file ? Buffer.from('changed dependency') : readBytes(file)), /stale output input/);
});
console.log(`PASS: ${checks} exact source, full-delta, preserved-history, output and negative controls. Technical continuity only; no protected journey, provider or release authority.`);
