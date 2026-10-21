import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { chatRowProblem } from '../../grade-a-packet-factory-24h/chat-review-inputs.mjs';

const familyId = 'ky_nonconviction_expungement-set';
const candidateCommit = '32b4cd6639edb8fc43cb9e9b3afdb92371111a78';
const obligations = ['ROUTE_IDENTITY', 'SOURCE_IDENTITY', 'COMPONENT_SET', 'KNOWN_PREFILLS', 'REQUIRED_BEFORE_FILING', 'ROUTE_OPTIONS', 'REPEATING_ROWS', 'PROTECTED_FIELDS', 'ARTIFACTS', 'PAGE_ORDER', 'CLIPPING_AND_OVERLAP', 'FILING_DESTINATION', 'FEE_AND_WAIVER', 'SERVICE', 'SELF_HELP_STOP'];
const directory = 'data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill';
const reviewRoot = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat4-review';
const evidenceRoot = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08';
const originalPath = `${reviewRoot}/ky-independent-review.json`;
const originalBytes = fs.readFileSync(originalPath);
const original = JSON.parse(originalBytes);
const originalRow = original.rows.find(row => row.familyId === familyId);
assert.ok(originalRow, 'Original independent KY row is required');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
assert.equal(gitBlob(originalBytes), '8b10a3b22ee00f0ac60a6f7048a2fc622919bfe5');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const nativeEvidence = readJson(`${evidenceRoot}/independent-ky-native-counters.json`);
const audit = nativeEvidence.result;
assert.equal(audit.familyId, familyId);
assert.equal(audit.runtimeIntakeCounters, null);
assert.equal(audit.runtimeInstalled, false);
assert.equal(Object.keys(audit.counters).length, 9);
assert.ok(Object.values(audit.counters).every(value => value === 0));
assert.deepEqual(Object.keys(originalRow.proofObligations).sort(), [...obligations].sort());
assert.ok(Object.values(originalRow.proofObligations).every(obligation => obligation.measured === true && obligation.result === 'PASS'));
for (const name of ['independent-ky-engineering.json', 'independent-ky-declared-engineering.json', 'independent-ky-declared-installed.json']) {
  const evidence = readJson(`${evidenceRoot}/${name}`);
  assert.equal(evidence.failed, 0, `${name} must have no failed independent controls`);
  assert.equal(evidence.verdict, 'PASS_BOUNDED_ENGINEERING_DELTA');
}
const identities = files => files.map(file => {
  const bytes = fs.readFileSync(file);
  return { path: file, sha256: sha256(bytes), gitBlob: gitBlob(bytes), publicationCommit: null };
});
const anchors = fixture => {
  const file = `${directory}/fixtures/${fixture}.pdf`;
  const bytes = fs.readFileSync(file);
  const retainedSha256 = { canonical: '348e5677f471acea22dd6643fea1c820db8779f218b2563417682433a8884be2', boundary: '93f902bfe7108680379c49d5a4cf27273369b67a7794e989ee17c52a8ee20474' };
  assert.equal(sha256(bytes), retainedSha256[fixture]);
  return { file, gitBlobSha: gitBlob(bytes), centralAndInventorySha256: sha256(bytes), byteLength: bytes.length, pageCount: fixture === 'canonical' ? 6 : 8 };
};
const originalReuse = {
  path: originalPath,
  commit: 'c0df1418c07a636564412b113e80f6a7b213fff9',
  gitBlob: gitBlob(originalBytes),
  originalReviewer: original.reviewer,
  originalSessionIdentity: original.sessionIdentity,
  completePdfs: 13,
  completePages: 90,
  scope: 'Unchanged whole-PDF/source/facts/report identity and all fifteen original measured obligations. No page image was reexamined in this session; accepted exact-byte evidence is reused without editing its original verdict or null runtime counters.'
};
const row = {
  familyId,
  itemId: familyId,
  verifiedAtBase: candidateCommit,
  candidateCodeCommit: candidateCommit,
  packetPublicationCommit: candidateCommit,
  verdict: 'PASS_COMPLETE_INDEPENDENT',
  familyDirectory: directory,
  anchors: { canonical: anchors('canonical'), boundary: anchors('boundary') },
  proofObligations: Object.fromEntries(Object.entries(originalRow.proofObligations).map(([name, obligation]) => [name, {
    ...obligation,
    measurementOrigin: 'Reused unchanged exact-byte PR238 independent measurement, supplemented by independent source-bound static native accounting and selected-output engineering review.',
    reusedEvidence: { path: originalPath, commit: originalReuse.commit, gitBlob: originalReuse.gitBlob },
    freshPageReview: false
  }])),
  failedObligations: [],
  unmeasuredObligations: [],
  nineCounters: {
    ...audit.counters,
    measuredHere: true,
    allZero: true,
    scope: 'Static prepared candidate only. The independent native adapter run reproduced all nine aggregate counters over the exact 13 retained outputs. Runtime required-fact collection is not measured. Visual zero uses the prior unchanged whole-PDF review, not newly viewed pixels.',
    measurementEvidence: `${evidenceRoot}/independent-ky-native-counters.json`,
    independentCounterReview: `${evidenceRoot}/independent-ky-engineering.json`,
    visualMeasurementOrigin: originalReuse
  },
  sourceFieldAccounting: {
    totalFieldInstances: 569,
    writtenFieldInstances: 270,
    blankFieldInstances: 299,
    blankDispositions: { NOT_APPLICABLE_ON_THIS_ROUTE: 192, REQUIRED_BEFORE_FILING: 21, PROTECTED_FIELD: 86 },
    scope: 'Each included source form in each separate fixture is classified once. The 21 required-before-filing source fields are 19 private SSNs and two disclosed boundary telephone fields, not fabricated or collected runtime values.'
  },
  reusedIndependentReview: originalReuse,
  selectedOutputReview: `${evidenceRoot}/independent-ky-declared-installed.json`,
  reviewEvidence: identities([
    `${evidenceRoot}/independent-ky-engineering.json`,
    `${evidenceRoot}/independent-ky-native-counters.json`,
    `${evidenceRoot}/independent-ky-declared-engineering.json`,
    `${evidenceRoot}/independent-ky-declared-installed.json`
  ]),
  separateEngineeringFinding: {
    status: 'OPEN_SHARED_INVENTORY_GAP_NOT_PRESENT_IN_THIS_CANDIDATE',
    path: 'scripts/grade-a-packet-factory-24h/conditional-raster-documents.mjs',
    finding: 'The native unlisted-file scan ignores uppercase .PDF names. Independent scratch control failed; none of the exact 13 retained lowercase KY candidate PDFs is omitted. Shared repair remains held by Captain, and this review does not claim that the inventory verifier has no defects.',
    evidence: `${evidenceRoot}/independent-ky-native-raster-before-repair.json`,
    candidateOutputIdentitiesChanged: false
  },
  runtimeIntakeCounters: null,
  runtimeInstalled: false,
  centralRasterAdmission: false,
  terminalPromotionClaimed: false,
  runtimeFulfillmentProven: false,
  productionAdmission: false,
  scopeLimits: [
    'This is an independent static prepared-candidate acceptance row, not a fulfillment record or a commercial route grant.',
    'The actual generated declaration selects exact synthetic fixtures only. Participant-personalized collection, entitlement, durable jobs and authorized production delivery are not proven.',
    'Signatures, dates, notarization, judicial decisions, clerk actions and protected private/manual facts retain their proper actors and disclosed completion requirements.',
    'The unchanged validator refuses asOf after 2026-09-07; present-day runtime use still requires current authority evidence.',
    'Central raster custody/admission, production release, counsel approval and runtime intake are not newly measured or asserted by this review.'
  ]
};
const document = {
  schemaVersion: 'rcap-independent-verification-rows/v1',
  reviewer: 'GPT-6 Astra release_scope independent engineering reviewer; original exact-byte visual measurements remain attributed to PR238 Chat4',
  sessionIdentity: 'release-scope-session08-ky-current-byte-20260908',
  laneKind: 'independent-verification',
  recordedAt: new Date().toISOString(),
  candidateCodeCommit: candidateCommit,
  evidencePublicationCommit: null,
  supersedesSubmittedDisposition: 'ky-independent-review.json',
  packetFilesEdited: false,
  buildersExecutedOrEdited: false,
  overlayDirectoriesModified: 0,
  originalReviewVerdictEdited: false,
  freshPacketRenders: 0,
  freshPageImagesExamined: 0,
  productionTouched: false,
  rows: [row]
};
assert.equal(chatRowProblem(document, row, obligations), null, 'Existing central schema must accept the independently measured row');
const destination = `${reviewRoot}/ky-session08-acceptance.json`;
fs.writeFileSync(destination, `${JSON.stringify(document, null, 2)}\n`);
console.log(JSON.stringify({ evidence: destination, verdict: row.verdict, candidatePublicationCommit: candidateCommit, obligations: Object.keys(row.proofObligations).length, staticCounters: row.nineCounters, runtimeInstalled: row.runtimeInstalled }));
