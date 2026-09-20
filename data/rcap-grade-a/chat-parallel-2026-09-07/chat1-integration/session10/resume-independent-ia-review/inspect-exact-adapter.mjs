/** Read-only independent review observations; never rebuild or write candidate files. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { auditPreparedInputs } from '../../../../../../scripts/rcap-packet-completeness/verify-packet-completeness.mjs';
import { IA_FORM1_FAMILY, IA_FORM1_DIRECTORY, IA_FORM1_ROUTE, iaForm1CandidateMatrix,
  auditIaForm1ExpectedOutcomes, createDeclaredIaForm1Delivery, selectDeclaredIaForm1Fixture,
  resolveIaForm1RasterEnrollment } from '../../../../../../scripts/rcap-packet-recovery/chat1/ia-form1-expected-candidates.mjs';

const out = path.dirname(new URL(import.meta.url).pathname);
const evidence = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/ia-form1-closure';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(file);
const json = file => JSON.parse(read(file));
const family = { familyId: IA_FORM1_FAMILY, directory: IA_FORM1_DIRECTORY, routeKeys: [IA_FORM1_ROUTE], implementationStrategy: 'official_pdf_fill' };
const guard = json(`${evidence}/exact-candidate-install.json`);
const before = new Map(guard.files.map(item => [item.path, sha(read(item.path))]));
for (const item of guard.files) {
  const bytes = read(item.path);
  assert.equal(sha(bytes), item.sha256);
  assert.equal(bytes.length, item.bytes);
  assert.equal(sha(execFileSync('git', ['show', `774e1c3e3fa7ffd8e4f2aefea384440e4b1dab90:${item.path}`], {maxBuffer: 32 * 1024 * 1024})), item.sha256);
}
const originalCustody = json(`${evidence}/original-review-custody.json`).map(item => {
  const bytes = read(item.path);
  assert.equal(sha(bytes), item.sha256);
  assert.equal(sha(execFileSync('git', ['show', `${item.sourceCommit}:${item.sourcePath}`], {maxBuffer: 1024 * 1024})), item.sha256);
  return { path: item.path, sourceCommit: item.sourceCommit, sha256: item.sha256 };
});
const matrix = iaForm1CandidateMatrix(family);
const observedCalls = [];
const result = auditIaForm1ExpectedOutcomes(family, inputs => {
  const measured = auditPreparedInputs(family.directory, family.familyId, inputs);
  observedCalls.push({ fields: measured.totals.terminalFields, result: measured.result, requiredOptionsMissing: measured.counters.requiredOptionsMissing });
  return measured;
});
assert.deepEqual(observedCalls.map(call => call.fields), [285, 57, 57, 57, 57, 57, 171]);
assert.deepEqual(observedCalls.filter(call => call.result === 'FAIL_ROUTE_SELECTION').map(call => call.fields), [285, 57]);
assert.equal(result.expectedOutcomeAccounting.expectedDay180RefusalPreserved, true);
assert.equal(result.expectedOutcomeAccounting.missingContactsRemainUnknown, true);
assert.equal(result.totals.written, 74);
assert.equal(result.totals.blank, 97);
const record = createDeclaredIaForm1Delivery(family, {family: family.familyId, routeKeys: family.routeKeys, paymentEligible: false, sponsorshipEligible: false});
const enrollment = await resolveIaForm1RasterEnrollment(family);
assert.equal(enrollment.documents.length, 5);
assert.equal(enrollment.documents.reduce((sum, item) => sum + item.pageCount, 0), 26);
const outcomes = matrix.fixtures.map(item => {
  const facts = json(item.input.file);
  if (item.diagnostic) assert.throws(() => selectDeclaredIaForm1Fixture(record, facts, item.fixture), /DIAGNOSTIC_NOT_FILING_POSITIVE/);
  const selected = selectDeclaredIaForm1Fixture(record, facts, item.fixture, item.diagnostic ? {deliveryPurpose: 'diagnostic-preview'} : {});
  assert.equal(selected.filingPositive, false);
  assert.equal(selected.filingPermitted, false);
  assert.equal(selected.participantExecutionCompleted, false);
  assert.equal(selected.grantsDeliveryAuthority, false);
  assert.equal(selected.runtimeInstalled, false);
  return { fixture: item.fixture, pages: item.pageCount, expectedOutcome: item.expectedOutcome, diagnostic: item.diagnostic,
    filingPositive: false, missingParticipantFacts: item.readiness.missingParticipantFacts,
    missingParticipantControlAreas: item.readiness.missingParticipantControlAreas,
    components: item.components.map(component => component.id), sha256: item.sha256 };
});
for (const [file, digest] of before) assert.equal(sha(read(file)), digest);
const resultDoc = { scope: 'Independent read-only adapter execution, actual shared audit calls, declared-selection checks, PDF page parsing, and existing custody rehash; no render',
  familyId: family.familyId, publishedGuardedCandidate: '774e1c3e3fa7ffd8e4f2aefea384440e4b1dab90',
  adapterSha256: sha(read('scripts/rcap-packet-recovery/chat1/ia-form1-expected-candidates.mjs')),
  testsSha256: sha(read('scripts/rcap-packet-recovery/chat1/test-ia-form1-expected-candidates.mjs')),
  authorRegressionSuite: { tests: 53, execution: 'Previously executed by Captain and retained author return; not rerun or relabeled here' },
  actualSharedAuditCalls: observedCalls, guardedFiles: 65, guardFilesUnchanged: true, allGuardFilesExactAtPublishedCandidate: true,
  originalReviewCustody: originalCustody, outcomes, documents: 5, pages: 26,
  sourceReview: matrix.sourceReview, originalIndependentReview: matrix.originalIndependentReview,
  measuredHereFreshVisualInspection: false, centralReceiptCreated: false, filingPermissionGranted: false, runtimeInstalled: false, productionChanged: false };
fs.writeFileSync(path.join(out, 'adapter-observations.json'), JSON.stringify(resultDoc, null, 2) + '\n');
console.log(JSON.stringify({ guardedFiles: 65, unchanged: true, sharedAuditCalls: observedCalls.length, documents: 5, pages: 26,
  adapterSha256: resultDoc.adapterSha256, output: path.join(out, 'adapter-observations.json') }));
