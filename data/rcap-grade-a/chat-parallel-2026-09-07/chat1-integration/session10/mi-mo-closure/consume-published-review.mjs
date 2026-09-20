import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PDFDocument } from 'pdf-lib';

// Independent acceptance of already-reviewed, unchanged static candidates.
// This program writes only its own review evidence. It never builds a packet,
// changes a source receipt, grants runtime authority, or edits an old review.
const base = path.dirname(fileURLToPath(import.meta.url));
const rel = file => path.relative(process.cwd(), file);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const blob = bytes => crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const publication = process.argv[process.argv.indexOf('--publication') + 1];
assert(process.argv.includes('--publication') && /^[0-9a-f]{40}$/.test(publication), 'Supply the actual immutable publication commit.');
assert.equal(execFileSync('git', ['rev-parse', `${publication}^{commit}`], { encoding: 'utf8' }).trim(), publication);

const guard = read(path.join(base, 'candidate-publication-guard.json'));
assert.equal(guard.files.length, 277);
for (const item of guard.files) {
  const current = fs.readFileSync(item.path);
  const published = execFileSync('git', ['show', `${publication}:${item.path}`], { maxBuffer: 10 * 1024 * 1024 });
  assert.equal(sha(current), item.sha256, `Review input changed: ${item.path}`);
  assert.equal(sha(published), item.sha256, `Publication does not bind reviewed input: ${item.path}`);
}

const originalReviews = [
  ['mi-correction-review-return.json', '5f214d783f91096e39be2ebea22f7a052467647de6e1528e6dc8d11581709b0b'],
  ['mo-consolidated-correction-review-return.json', '40fb3c64c1c06659ceb77b0f1d90c9b2b2e2512ca7df203c51f9d4e09d02cd26'],
].map(([name, expected]) => {
  const file = path.join(base, name), bytes = fs.readFileSync(file);
  assert.equal(sha(bytes), expected);
  return { file, sha256: expected, doc: JSON.parse(bytes) };
});
const sourceFile = path.join(base, 'source-identity-delta-review.json');
const source = read(sourceFile);
const ruleBytes = fs.readFileSync(source.staticAcceptanceCriterion.path);
assert.equal(sha(ruleBytes), source.staticAcceptanceCriterion.sha256, 'The actual acceptance criterion changed.');
assert(ruleBytes.toString().includes(source.staticAcceptanceCriterion.criterion));
for (const binding of source.staticSourceIdentity) {
  assert.equal(binding.result, 'PASS');
  assert.equal(sha(fs.readFileSync(binding.receiptPath)), binding.receiptSha256);
  for (const item of binding.sources) {
    const bytes = fs.readFileSync(item.path);
    assert.equal(sha(bytes), item.sha256);
    assert.equal(bytes.length, item.bytes);
  }
}
const identityFile = path.join(base, 'installed-candidate-identity-review.json');
const identity = read(identityFile);
assert.equal(identity.packetFilesEdited, false);
assert.equal(identity.packetRenders, 0);
assert.equal(identity.michigan.all177PayloadMembersBound, true);
assert.equal(identity.missouri.all98PayloadMembersBound, true);
const citationFile = path.join(base, 'mi-citation-independent-review.json');
const citation = read(citationFile);
assert.equal(citation.verdict, 'PASS_BOUNDED_CITATION_DELTA');
assert.equal(citation.testedInvokingPath.failed, 0);
assert.equal(sha(fs.readFileSync(citation.testedInvokingPath.generatorPath)), citation.testedInvokingPath.generatorSha256);
assert.equal(sha(fs.readFileSync(citation.testedInvokingPath.testPath)), citation.testedInvokingPath.testSha256);
assert.equal(sha(fs.readFileSync(citation.authority.localPath)), citation.authority.sha256);

const auditFile = path.join(base, 'current-structural-audit.json');
const audit = read(auditFile);
assert.equal(sha(fs.readFileSync(audit.reader.path)), audit.reader.sha256, 'Importer dependency changed; independently remeasure the affected current calls before consuming this review.');
const obligations = ['ROUTE_IDENTITY', 'SOURCE_IDENTITY', 'COMPONENT_SET', 'KNOWN_PREFILLS', 'REQUIRED_BEFORE_FILING', 'ROUTE_OPTIONS', 'REPEATING_ROWS', 'PROTECTED_FIELDS', 'ARTIFACTS', 'PAGE_ORDER', 'CLIPPING_AND_OVERLAP', 'FILING_DESTINATION', 'FEE_AND_WAIVER', 'SERVICE', 'SELF_HELP_STOP'];
const counterNames = ['knownRequiredFieldsMissing', 'requiredFactsNotCollected', 'unclassifiedBlanks', 'incompleteRows', 'requiredOptionsMissing', 'requiredComponentsMissing', 'invisibleWrites', 'protectedWrites', 'visualDefects'];
const rows = [];
for (const original of originalReviews) for (const prior of original.doc.rows) {
  assert.equal(prior.verdict, 'LIMITED_FINDING');
  assert.deepEqual(prior.failedObligations, []);
  assert.deepEqual(prior.unmeasuredObligations, ['SOURCE_IDENTITY']);
  const measured = audit.rows.find(row => row.familyId === prior.familyId);
  const binding = source.staticSourceIdentity.find(row => row.familyId === prior.familyId);
  assert.equal(measured.result, 'PASS_COMPLETE');
  assert(binding);
  for (const name of counterNames) {
    assert.equal(prior.nineCounters[name], 0, `Original independent counter ${name}`);
    assert.equal(measured.counters[name], 0, `Current structural counter ${name}`);
  }
  for (const name of obligations.filter(name => name !== 'SOURCE_IDENTITY')) {
    assert.equal(prior.proofObligations[name].result, 'PASS');
    assert.equal(prior.proofObligations[name].measured, true);
  }
  const anchors = {};
  for (const fixture of ['canonical', 'boundary']) {
    // MO's reviewed anchor is a selected new-case/with-order output, not a
    // nonexistent fixtures/canonical.pdf alias. Preserve its real identity.
    const file = prior.familyId === 'mo-610-145-mistaken-identity-set'
      ? `${prior.familyDirectory}/${fixture}.new-case.with-order.packet.pdf`
      : `${prior.familyDirectory}/fixtures/${fixture}.pdf`;
    const bytes = fs.readFileSync(file);
    if (prior.familyId === 'mo-610-145-mistaken-identity-set') {
      assert.equal(sha(bytes), original.doc.wholePdfAnchors[`${fixture}NewCaseWithOrder`].sha256);
    }
    anchors[fixture] = { file, gitBlobSha: blob(bytes), centralAndInventorySha256: sha(bytes), byteLength: bytes.length,
      pageCount: (await PDFDocument.load(bytes, { updateMetadata: false })).getPageCount() };
  }
  const reused = { path: rel(original.file), sha256: original.sha256,
    sourceCommit: '131ba5388f5e39c69dbae92a0b58b04dbaa57af6', originalReviewer: original.doc.reviewer,
    originalSessionIdentity: original.doc.sessionIdentity, independentEvidence: original.doc.independentEvidence,
    unchangedInstalledPayloadProof: rel(identityFile), freshPageReview: false };
  rows.push({ ...prior, verdict: 'PASS_COMPLETE_INDEPENDENT', verifiedAtBase: publication,
    candidateCodeCommit: publication, packetPublicationCommit: publication,
    reviewBaseSource: 'Actual immutable publication, every one of the 277 guarded installed files read back and matched before this verdict.',
    anchors, failedObligations: [], unmeasuredObligations: [],
    proofObligations: Object.fromEntries(obligations.map(name => [name, name === 'SOURCE_IDENTITY' ? {
      result: 'PASS', measured: true,
      finding: 'Every source named by this exact installed family receipt was independently read and SHA-256 recomputed against its pin; every receipt, source, code, fixture, guide and output identity is bound to the published corrected candidate. Currentness and live source approval remain separate, explicitly limited scope.',
      measurementEvidence: rel(sourceFile), sourceBindings: binding.sources,
      governingCriterion: source.staticAcceptanceCriterion,
    } : { ...prior.proofObligations[name], measurementOrigin: 'Original Chat10 independent measurement reused after exact installed/published payload equivalence; only MI pinpoint correction is supplemented by the separately attributed independent delta review.',
      reusedIndependentReview: reused, freshPageReview: false }])),
    nineCounters: { ...prior.nineCounters, measuredHere: true, allZero: true,
      scope: 'Static prepared candidates. Original independent all-variant measurements preserved by exact payload identity; current unmodified structural importer separately reproduces its original field-accounting scope. No zero is a runtime-intake claim.',
      measurementEvidence: rel(auditFile), originalAllVariantEvidence: reused,
      currentStructuralFieldAccounting: measured.totals, visualMeasurementOrigin: reused },
    reusedIndependentReview: reused, sourceIdentityDeltaReview: rel(sourceFile),
    ...(prior.familyId.startsWith('mi_') ? { citationDeltaReview: rel(citationFile), closedAdditionalFinding: 'CHAT10-MI-04-CITATION' } : {}),
    runtimeIntakeCounters: null, runtimeInstalled: false, centralRasterAdmission: false,
    terminalPromotionClaimed: false, runtimeFulfillmentProven: false, productionAdmission: false,
    sourceCurrentnessLimits: prior.familyId.startsWith('mi_') ? source.michigan.remainingLimit : source.missouri.remainingLimit,
    scopeLimits: [
      'This row measures the existing static packet acceptance criteria. It does not represent installed participant-personalized rendering, entitlement, protected delivery, counsel authorization, live source approval, or production release.',
      'Current law and form freshness limits remain recorded; all existing sourceEditionApproval and live-review controls remain in place. No statewide applicability is inferred from county FI-05 custody.',
      'The original complete visual review retains Chat10 attribution. This session rerendered no packet and newly viewed no packet image.',
      'Protected participant, signature, court, prosecutor and clerk actions remain unexecuted; actual missing private/manual information remains disclosed.',
    ] });
}
const doc = { schemaVersion: 'rcap-independent-verification-rows/v1', laneKind: 'independent-verification',
  sessionIdentity: 'astra-mi-mo-session10-static-admission-20260908',
  reviewer: 'GPT-6 Astra mi_mo_closure independent reviewer; unchanged complete-page review remains attributed to original Chat10',
  recordedAt: new Date().toISOString(), candidateCodeCommit: publication, evidencePublicationCommit: null,
  packetFilesEdited: false, buildersExecutedOrEdited: false, overlayDirectoriesModified: 0,
  originalReviewVerdictsEdited: false, freshPacketRenders: 0, freshPageImagesExamined: 0,
  productionTouched: false, rows };
const { chatRowProblem } = await import(pathToFileURL(path.resolve('scripts/grade-a-packet-factory-24h/chat-review-inputs.mjs')));
for (const row of rows) assert.equal(chatRowProblem(doc, row, obligations), null);
const destination = path.join(base, 'mi-mo-session10-static-acceptance.json');
fs.writeFileSync(destination, `${JSON.stringify(doc, null, 2)}\n`);
console.log(JSON.stringify({ destination: rel(destination), publication, families: rows.map(row => row.familyId), verdict: 'PASS_COMPLETE_INDEPENDENT', runtimeInstalled: false }));
