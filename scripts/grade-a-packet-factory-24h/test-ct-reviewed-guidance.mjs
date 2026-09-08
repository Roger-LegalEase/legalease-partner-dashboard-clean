import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CT_GUIDANCE_REVIEW, CT_GUIDANCE_CANDIDATE, CT_GUIDANCE_FAMILIES, connecticutGuidanceReviewInventory,
  assessConnecticutReviewedGuidance, applyConnecticutGuidanceAcceptance, ctGuidanceObjectSha256,
  ctGuidanceVerdictIdentity, connecticutGuidanceClosesReturnedFailure } from './ct-reviewed-guidance.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = relative => fs.readFileSync(path.join(root, relative));
const inventories = CT_GUIDANCE_FAMILIES.map(familyId => connecticutGuidanceReviewInventory(root, familyId));
// In-memory review fixture only. This test never writes an independent review,
// never turns author evidence into review, and never changes an actual ledger.
const synthetic = {
  schemaVersion: 'rcap-terminal-treatment-independent-verification/v1', reviewer: 'SYNTHETIC TEST ONLY', lane: 'SYNTHETIC TEST ONLY',
  verifiedAtBase: CT_GUIDANCE_CANDIDATE, authoredByADifferentLaneThanTheTreatmentRecord: true,
  editsNothingItVerifies: true, createsNoApproval: true, opensNoRoute: true,
  families: inventories.map(inventory => ({ familyId: inventory.familyId, verdict: 'TREATMENT_CORRECT', recordedTreatment: 'GUIDANCE_READY',
    scope: 'static_family_treatment', runtimeInstalled: false, participantFilesGeneratedOutput: false,
    participantApplicationDischarged: false, commercialAuthority: false,
    routeKeys: inventory.routeKeys, verdictScope: 'Synthetic binding control for the exact published guidance and explicit independent closure of each prior finding.',
    reviewedInputs: inventory.reviewedInputs, reviewedOutputs: inventory.reviewedOutputs,
    originalIndependentReview: inventory.originalIndependentReview, sourceRefreshEvidence: inventory.sourceRefreshEvidence,
    failedObligations: [], unmeasuredObligations: [],
    closedPriorFindings: inventory.priorFindings.map(item => ({ obligation: item.obligation, priorFindingSha256: item.priorFindingSha256,
      result: 'CLOSED_BY_INDEPENDENT_DELTA', finding: 'Synthetic test-only finding closure references the exact prior obligation and measured source repair evidence.',
      evidence: [inventory.sourceRefreshEvidence] })) }))
};
const cases = [];
function run(index, mutate = () => {}, alterBytes = null, alterHistorical = null) {
  const review = structuredClone(synthetic); mutate(review, review.families[index]);
  const reviewBytes = Buffer.from(JSON.stringify(review));
  return assessConnecticutReviewedGuidance(root, CT_GUIDANCE_FAMILIES[index], {
    reviewPublicationCommit: CT_GUIDANCE_CANDIDATE,
    readBytes: relative => relative === CT_GUIDANCE_REVIEW ? reviewBytes : alterBytes?.(relative) ?? read(relative),
    readHistorical: (commit, relative) => relative === CT_GUIDANCE_REVIEW ? alterHistorical?.(commit, relative) ?? reviewBytes
      : alterHistorical?.(commit, relative) ?? (commit === CT_GUIDANCE_CANDIDATE ? read(relative) :
        // Destruction's source-only equivalence is checked against the real original Git blob.
        undefined),
  });
}
// Use real historical reads for all ordinary pins and the destruction reuse
// comparison. The only synthesized historical object is the in-memory review.
import { execFileSync } from 'node:child_process';
const showCache = new Map();
function actualHistorical(commit, relative) {
  const key = `${commit}:${relative}`;
  if (!showCache.has(key)) showCache.set(key, execFileSync('git', ['show', key], { cwd: root, maxBuffer: 2 ** 24 }));
  return showCache.get(key);
}
function evaluate(index, mutate = () => {}, alterBytes = null, alterHistorical = null) {
  return run(index, mutate, alterBytes, (commit, relative) => alterHistorical?.(commit, relative)
    ?? (relative === CT_GUIDANCE_REVIEW ? null : actualHistorical(commit, relative)));
}
const assertCase = (name, callback) => { callback(); cases.push({ name, status: 'PASS' }); };
const good = [];
for (const [index, inventory] of inventories.entries()) assertCase(`${inventory.familyId}: matching published candidate and exact finding closures`, () => {
  const result = evaluate(index); assert.equal(result.eligible, true, result.reason); good.push(result);
  const before = inventory.priorSelectedReturn.verdict;
  const context = { readiness: { ready: true }, nineZero: true, independentReturn: inventory.priorSelectedReturn };
  assert.equal(applyConnecticutGuidanceAcceptance(before, result, context), 'GUIDANCE_READY');
});
for (const [name, mutate] of [
  ['author/reviewer conflict', review => { review.authoredByADifferentLaneThanTheTreatmentRecord = false; }],
  ['wrong candidate base', review => { review.verifiedAtBase = '0'.repeat(40); }],
  ['application discharged by guide', (_review, row) => { row.participantApplicationDischarged = true; }],
  ['runtime grant', (_review, row) => { row.runtimeInstalled = true; }],
  ['commercial grant', (_review, row) => { row.commercialAuthority = true; }],
  ['missing complete guide output', (_review, row) => { row.reviewedOutputs.pop(); }],
  ['missing source dependency', (_review, row) => { row.reviewedInputs.pop(); }],
  ['wrong original review', (_review, row) => { row.originalIndependentReview.rowSha256 = '0'.repeat(64); }],
  ['unclosed original finding', (_review, row) => { row.closedPriorFindings.pop(); }],
  ['closure of different failure', (_review, row) => { row.closedPriorFindings[0].priorFindingSha256 = '0'.repeat(64); }],
  ['unmeasured destination', (_review, row) => { row.unmeasuredObligations = ['FILING_DESTINATION']; }],
  ['missing closure evidence', (_review, row) => { row.closedPriorFindings[0].evidence = []; }],
]) assertCase(`refuse ${name}`, () => assert.equal(evaluate(2, mutate).eligible, false));
for (const [name, relative] of [
  ['guide PDF', inventories[1].reviewedOutputs[0].path],
  ['complete Markdown', inventories[1].reviewedOutputs[2].path],
  ['current Board source', inventories[1].reviewedInputs.find(item => item.path.endsWith('ct-coe-eligibility.html.gz')).path],
  ['invoking builder', inventories[1].reviewedInputs.find(item => item.path.startsWith('scripts/build-census-v1-agency') && item.path.includes('CT:')).path],
  ['source receipt', `${inventories[1].directory}/source-receipt.json`],
]) assertCase(`refuse changed ${name}`, () => assert.equal(evaluate(1, () => {}, at => at === relative ? Buffer.from('changed') : null).eligible, false));
assertCase('unpublished review cannot grant treatment', () => assert.equal(evaluate(0, () => {}, null,
  (_commit, relative) => relative === CT_GUIDANCE_REVIEW ? Buffer.from('not the review') : null).eligible, false));
assertCase('changed original destruction output prevents source-only evidence reuse', () => assert.equal(evaluate(0, () => {}, null,
  (commit, relative) => commit === inventories[0].originalIndependentReview.verifiedAtBase && relative === inventories[0].reviewedOutputs[0].path ? Buffer.from('different old PDF') : null).eligible, false));
const basic = { readiness: { ready: true }, nineZero: true, independentReturn: inventories[0].priorSelectedReturn };
for (const [name, state, change] of [
  ['new legal hold', 'LEGAL_BLOCKED', c => { c.legalBlocked = true; }],
  ['owner delivery refusal', 'WRONG_DELIVERY_TYPE', c => { c.deliveryTypeRefusal = { decisionId: 'NEW' }; }],
  ['measured current defect', 'FAIL_REPAIR_REQUIRED', c => { c.nineZero = false; }],
  ['actual source unavailable', 'SOURCE_BLOCKED', c => { c.readiness.ready = false; }],
  ['new failure with old name', 'FAIL_REPAIR_REQUIRED', c => { c.independentReturn.failedObligations[0].finding = 'A new substantive source finding'; }],
  ['new independent review base', 'FAIL_REPAIR_REQUIRED', c => { c.independentReturn.verifiedAtBase = '0'.repeat(40); }],
  ['unclosed source hold', 'SOURCE_BLOCKED', c => { c.verifierSourceHold = { blockedObligations: ['SOURCE_IDENTITY'], reason: 'unreviewed' }; }],
]) assertCase(`preserve ${name}`, () => { const context = structuredClone(basic); change(context); assert.equal(applyConnecticutGuidanceAcceptance(state, good[0], context), state); });
assertCase('explicit root closure can close exactly its new verdict and source-hold objects', () => {
  const context = structuredClone(basic); context.independentReturn.verdict = 'BLOCKED_SOURCE';
  context.verifierSourceHold = { lane: 'vf03', verdict: 'BLOCKED_SOURCE', blockedObligations: ['SOURCE_IDENTITY'], evidencePath: inventories[0].originalIndependentReview.path };
  const result = evaluate(0, (_review, row) => {
    const closure = { result: 'CLOSED_BY_INDEPENDENT_DELTA', finding: 'Synthetic exact source-hold resolution after measured restoration of the named source identity.', evidence: [inventories[0].sourceRefreshEvidence] };
    row.closedSourceHolds = [{ ...closure, holdSha256: ctGuidanceObjectSha256(context.verifierSourceHold) }];
    row.closedCurrentVerdicts = [{ ...closure, verdictSha256: ctGuidanceObjectSha256(ctGuidanceVerdictIdentity(context.independentReturn)) }];
  });
  assert.equal(result.eligible, true, result.reason);
  assert.equal(applyConnecticutGuidanceAcceptance('SOURCE_BLOCKED', result, context), 'GUIDANCE_READY');
  context.verifierSourceHold.blockedObligations.push('NEW_SOURCE_QUESTION');
  assert.equal(applyConnecticutGuidanceAcceptance('SOURCE_BLOCKED', result, context), 'SOURCE_BLOCKED');
});
assertCase('unrelated families are untouched', () => {
  assert.equal(assessConnecticutReviewedGuidance(root, 'unrelated'), null);
  assert.equal(applyConnecticutGuidanceAcceptance('SOURCE_READY', { eligible: true, familyId: 'unrelated' }, basic), 'SOURCE_READY');
});
const returned = { ...structuredClone(inventories[0].priorSelectedReturn), isIndependentVerification: true };
const closedFamily = {
  familyId: returned.familyId, state: 'GUIDANCE_READY', legalInputStatus: 'SETTLED',
  sourceReadiness: { ready: true }, allNineCountersZero: true,
  reviewedTreatmentGuidance: { ...good[0], eligible: true, currentTreatmentHold: null },
  historicalIndependentFailureClosedByGuidanceReview: {
    verdict: returned.verdict, lane: returned.lane, verifiedAtBase: returned.verifiedAtBase,
    evidencePath: returned.evidencePath, failedObligations: returned.failedObligations,
    closedBy: good[0].reviewPath, reviewSha256: good[0].reviewSha256, closedPriorFindings: good[0].closedPriorFindings
  }, failedObligations: [], failedObligationNames: []
};
assertCase('F29 recognizes only the exactly retained independently closed static failure', () =>
  assert.equal(connecticutGuidanceClosesReturnedFailure(closedFamily, returned, good[0]), true));
for (const [name, mutate] of [
  ['false fresh custody', (_f, _r, a) => { a.eligible = false; }],
  ['packet promotion', f => { f.state = 'COMPLETE_PACKET_PROVEN'; }],
  ['later finding', (_f, r) => { r.failedObligations[0].finding = 'New current defect'; }],
  ['later verifier base', (_f, r) => { r.verifiedAtBase = '0'.repeat(40); }],
  ['author return', (_f, r) => { r.isIndependentVerification = false; }],
  ['missing original attribution', f => { delete f.historicalIndependentFailureClosedByGuidanceReview; }],
  ['different closed finding', f => { f.historicalIndependentFailureClosedByGuidanceReview.closedPriorFindings = []; }],
  ['stale review binding', f => { f.reviewedTreatmentGuidance.reviewSha256 = '0'.repeat(64); }],
  ['unavailable source', f => { f.sourceReadiness.ready = false; }],
  ['measured defect', f => { f.allNineCountersZero = false; }],
  ['legal hold', f => { f.legalInputStatus = 'BLOCKED'; }],
  ['owner refusal', f => { f.ownerDeliveryTypeRefusal = { refused: true }; }],
  ['unclosed source hold', f => { f.verifierSourceHold = { reason: 'new hold' }; }],
  ['remaining failed obligation', f => { f.failedObligationNames = ['SOURCE_IDENTITY']; }]
]) assertCase(`F29 refuses ${name}`, () => {
  const f = structuredClone(closedFamily), r = structuredClone(returned), a = structuredClone(good[0]);
  mutate(f, r, a); assert.equal(connecticutGuidanceClosesReturnedFailure(f, r, a), false);
});
console.log(JSON.stringify({ status: 'PASS', cases, count: cases.length, actualIndependentReviewCreated: false, actualTreatmentGranted: false }, null, 2));
