import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { chatRowProblem, normalizeBoundedChatFailure } from '../../grade-a-packet-factory-24h/chat-review-inputs.mjs';

const candidateCommit = process.argv[2];
assert.match(candidateCommit || '', /^[0-9a-f]{40}$/, 'Supply the published candidate commit, not a branch or anticipated identity');
const familyId = 'nc_146_dismissal_petition-set';
const directory = 'data/rcap-all50/overlays/census-v1/nc/nc-146-dismissal-petition-set--official-pdf-fill';
const reviewRoot = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat4-review';
const evidencePath = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08/independent-nc-engineering.json';
const originalPath = `${reviewRoot}/nc-independent-review.json`;
const deltaPath = `${reviewRoot}/nc-delta-review-03.json`;
const closurePath = `${reviewRoot}/nc-publication-closure-04.json`;
const obligations = ['ROUTE_IDENTITY', 'SOURCE_IDENTITY', 'COMPONENT_SET', 'KNOWN_PREFILLS', 'REQUIRED_BEFORE_FILING', 'ROUTE_OPTIONS', 'REPEATING_ROWS', 'PROTECTED_FIELDS', 'ARTIFACTS', 'PAGE_ORDER', 'CLIPPING_AND_OVERLAP', 'FILING_DESTINATION', 'FEE_AND_WAIVER', 'SERVICE', 'SELF_HELP_STOP'];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const blob = bytes => crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const identity = file => { const bytes = fs.readFileSync(file); return { path: file, sha256: hash(bytes), gitBlob: blob(bytes) }; };
const original = read(originalPath);
const originalRow = original.rows.find(row => row.familyId === familyId);
const closure = read(closurePath);
const closedRow = closure.rows.find(row => row.familyId === familyId);
const evidence = read(evidencePath);
assert.equal(identity(originalPath).gitBlob, '7a1de7d414c378704bc175f36c96f73d04ba45bd');
assert.equal(evidence.verdict, 'PASS_BOUNDED_ENGINEERING_DELTA');
assert.equal(evidence.passed, 43);
assert.equal(evidence.failed, 0);
assert.equal(evidence.runtimeIntakeCounters, null);
assert.equal(evidence.runtimeInstalled, false);
assert.equal(evidence.totals.sourceFieldInstances, 1904);
assert.equal(evidence.perDocument.length, 10);
assert.equal(evidence.perDocument.reduce((sum, row) => sum + row.pages, 0), 60);
assert.deepEqual(Object.keys(closedRow.proofObligations).sort(), [...obligations].sort());
assert.ok(Object.values(closedRow.proofObligations).every(row => row.measured === true && row.result === 'PASS'));
for (const measured of evidence.measuredCodeIdentities) {
  const current = identity(measured.path);
  assert.equal(current.sha256, measured.sha256, `Engineering input changed after independent measurement: ${measured.path}`);
  assert.equal(current.gitBlob, measured.gitBlob);
}
for (const prior of originalRow.wholePdfHashesMeasured) {
  const file = `${directory}/${prior.file}`;
  const bytes = fs.readFileSync(file);
  const current = evidence.perDocument.find(row => row.file === file);
  assert.ok(current, `Every originally reviewed complete PDF must be accounted for: ${file}`);
  assert.equal(hash(bytes), prior.sha256);
  assert.equal(blob(bytes), prior.gitBlobSha);
  assert.equal(current.sha256, prior.sha256);
  assert.equal(current.gitBlob, prior.gitBlobSha);
  assert.equal(current.pages, prior.pages);
  assert.equal(bytes.length, prior.bytes);
}
const anchor = fixture => {
  const prior = originalRow.wholePdfHashesMeasured.find(row => row.file === `fixtures/${fixture}.pdf`);
  return { file: `${directory}/${prior.file}`, gitBlobSha: prior.gitBlobSha, centralAndInventorySha256: prior.sha256, byteLength: prior.bytes, pageCount: prior.pages };
};
const counterKeys = ['knownRequiredFieldsMissing', 'requiredFactsNotCollected', 'unclassifiedBlanks', 'incompleteRows', 'requiredOptionsMissing', 'requiredComponentsMissing', 'invisibleWrites', 'protectedWrites', 'visualDefects'];
assert.ok(counterKeys.every(key => evidence.nineStaticCounters[key] === 0));
const reusedEvidence = {
  original: { ...identity(originalPath), commit: '44cd232293b4cbb3aed337595ac670f65062044c', reviewer: original.reviewer, sessionIdentity: original.sessionIdentity },
  acceptedDelta: { ...identity(deltaPath), commit: '262027e7b5e7678cc7ea9fa8323bfffba3566e47' },
  publishedClosure: { ...identity(closurePath), commit: '7ca771a7f5f6ed6f00d10bff438fc81c404aa7e6' },
  completePdfs: 10,
  completePages: 60,
  originalActualTextValueChecks: 174,
  originalRequiredDisclosureChecks: 60,
  freshPageImagesExamined: 0,
  scope: 'The original whole-PDF/page review is preserved through all ten freshly matched complete PDF SHA256/Git identities. The accepted delta and publication closure, not altered original verdicts, close CHAT4-NC-01 and CHAT4-NC-02.'
};
const row = {
  familyId,
  itemId: familyId,
  familyDirectory: directory,
  routeKeys: ['obligation:track-only:NC:nc_146_dismissal_petition'],
  verifiedAtBase: candidateCommit,
  candidateCodeCommit: candidateCommit,
  packetPublicationCommit: candidateCommit,
  verdict: 'PASS_COMPLETE_INDEPENDENT',
  anchors: { canonical: anchor('canonical'), boundary: anchor('boundary') },
  proofObligations: Object.fromEntries(Object.entries(closedRow.proofObligations).map(([name, obligation]) => [name, {
    ...obligation,
    measurementOrigin: 'Exact-current-byte reuse of original whole-PDF proof and accepted published delta, supplemented by the independent source-census/all-fixture accounting and branch-refusal execution.',
    reusedEvidencePaths: [originalPath, deltaPath, closurePath],
    freshEngineeringEvidence: evidencePath,
    freshPageReview: false
  }])),
  failedObligations: [],
  unmeasuredObligations: [],
  nineCounters: {
    ...Object.fromEntries(counterKeys.map(key => [key, evidence.nineStaticCounters[key]])),
    measuredHere: true,
    allZero: true,
    scope: 'Static retained prepared candidate only. The installed verifier independently reproduced its 265-field union counters, and a separate raw-source/per-output audit accounted for all 1904 source-field instances. Required-before-filing/election disclosures do not prove collected runtime facts. Visual zero reuses unchanged prior full-page review.',
    measurementEvidence: evidencePath,
    runtimeCounterScope: null
  },
  sourceFieldAccounting: evidence.totals,
  sourceIdentitySupplement: {
    sources: evidence.sourcesMeasured,
    scope: 'All four retained raw original sources independently rehashed and parsed, including 67-field G106. The G106 retained-byte attribution gap is closed; no fresh remote download or present-day live-binary equality is asserted.'
  },
  unchangedWholeOutputIdentities: evidence.perDocument.map(({ file, sha256, gitBlob, pages }) => ({ file, sha256, gitBlob, pages })),
  reusedIndependentEvidence: reusedEvidence,
  preservedExistingCentralEvidence: originalRow.centralEvidence,
  engineeringEvidence: { ...identity(evidencePath), publicationCommit: null, passed: evidence.passed, failed: evidence.failed },
  runtimeIntakeCounters: null,
  runtimeInstalled: false,
  runtimeCapabilityBoundary: evidence.runtimeCapabilityBoundary,
  centralRasterAdmissionNewlyPerformed: false,
  terminalPromotionClaimed: false,
  productionAdmissionClaimed: false,
  scopeLimits: [
    'Static complete review does not create a Grade-A fulfillment record, open a commercial route or prove personalized generation.',
    'The four fee/component elections and their refusal controls were executed; the helper is not a participant-fact, eligibility or charge/agency capacity validator.',
    'CR285 remains disclosed and absent. Overflow is not part of these ten retained outputs. Actual overflow delivery or a matter-bound capacity refusal remains required before enabling that runtime case.',
    'Private identifiers, missing external-record/financial facts, genuine elections, signatures, sworn execution, provider acts and court/clerk decisions retain their actual completion requirements. No unknown value or actor act is invented.',
    'No current-source refresh, counsel approval, participant intake, entitlement, durable job, private delivery, production deployment or new central raster execution is claimed.'
  ]
};
const document = {
  schemaVersion: 'rcap-independent-verification-rows/v1',
  reviewer: 'GPT-6 Astra release_scope independent engineering reviewer; unchanged page measurements remain attributed to original Chat4',
  sessionIdentity: 'release-scope-session08-nc-current-byte-20260908',
  laneKind: 'independent-verification',
  recordedAt: new Date().toISOString(),
  candidateCodeCommit: candidateCommit,
  evidencePublicationCommit: null,
  supersedesSubmittedDisposition: 'nc-publication-closure-04.json',
  packetFilesEdited: false,
  buildersExecutedOrEdited: false,
  overlayDirectoriesModified: 0,
  originalReviewVerdictsEdited: false,
  packetRendererRuns: 0,
  freshPageImagesExamined: 0,
  productionTouched: false,
  rows: [row]
};
assert.equal(chatRowProblem(document, row, obligations), null);
assert.equal(normalizeBoundedChatFailure(process.cwd(), document, row).familyId, familyId);
const destination = `${reviewRoot}/nc-session08-acceptance.json`;
fs.writeFileSync(destination, `${JSON.stringify(document, null, 2)}\n`);
console.log(JSON.stringify({ evidence: destination, verdict: row.verdict, candidatePublicationCommit: candidateCommit, obligations: obligations.length, sourceFieldInstances: evidence.totals.sourceFieldInstances, runtimeInstalled: row.runtimeInstalled }));
