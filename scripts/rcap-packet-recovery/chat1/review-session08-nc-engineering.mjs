import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { auditFamily } from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
import { NC_BRANCH_FIXTURES, selectNc146Components, assembleNc146Packet } from '../nc-146-indigency.mjs';

const familyId = 'nc_146_dismissal_petition-set';
const directory = 'data/rcap-all50/overlays/census-v1/nc/nc-146-dismissal-petition-set--official-pdf-fill';
const reviewRoot = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat4-review';
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const blob = bytes => crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const fieldMap = json(`${directory}/production-field-map.json`);
const inventory = json(`${directory}/reports/rendered-artifacts.json`);
const receipt = json(`${directory}/source-receipt.json`);
const wiring = json(`${directory}/product-wiring.json`);
const delta = json(`${reviewRoot}/nc-delta-review-03.json`).rows.find(row => row.familyId === familyId);
const closure = json(`${reviewRoot}/nc-publication-closure-04.json`).rows.find(row => row.familyId === familyId);
const checks = [];
const test = async (name, run) => {
  try { await run(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: error.message }); }
};
const sourceFields = new Map();
const sourcesMeasured = [];
for (const source of receipt.documents) {
  await test(`Retained ${source.documentId} bytes independently reproduce its source census`, async () => {
    const bytes = fs.readFileSync(source.pathInRepository);
    assert.equal(hash(bytes), source.sha256);
    assert.equal(bytes.length, source.byteLength);
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    const names = pdf.getForm().getFields().map(field => field.getName());
    assert.equal(pdf.getPageCount(), source.pageCount);
    assert.equal(names.length, source.acroFieldCount);
    assert.equal(new Set(names).size, names.length);
    sourceFields.set(source.documentId, names);
    sourcesMeasured.push({ documentId: source.documentId, sha256: hash(bytes), byteLength: bytes.length, pages: pdf.getPageCount(), sourceFields: names.length });
  });
}
const strip = (field, role) => {
  assert.ok(field.startsWith(`${role}.`));
  return field.slice(role.length + 1);
};
for (const map of fieldMap.maps.filter(map => map.officialSource)) {
  for (const fixture of ['canonical', 'boundary']) {
    await test(`${fixture} ${map.documentId} accounts for each raw source field exactly once`, () => {
      const rows = [...map[`${fixture}Writes`], ...map[`${fixture}Refusals`]];
      const names = rows.map(row => strip(row.field, map.documentRole));
      assert.equal(new Set(names).size, names.length);
      assert.deepEqual([...names].sort(), [...sourceFields.get(map.documentId)].sort());
      assert.equal(map.officialSource.sha256, receipt.documents.find(source => source.documentId === map.documentId).sha256);
    });
  }
}
const disposition = row => {
  if (row.completenessDisposition === 'REQUIRED_BEFORE_FILING') return 'REQUIRED_BEFORE_FILING';
  if (row.completenessDisposition === 'NOT_APPLICABLE_ON_THIS_ROUTE') return 'NOT_APPLICABLE_ON_THIS_ROUTE';
  if (row.field === 'petition.PetitionSignedByName') return 'LATER_COMPLETION';
  if (row.reason?.startsWith('attorney-only, and no representation fact is held')) return 'NOT_APPLICABLE_ON_THIS_ROUTE';
  if (row.reason?.startsWith('court, clerk, prosecutor, agency, or hearing field;') || row.reason?.startsWith('signature or date field;')) return 'PROTECTED_FIELD';
  if (row.kind === 'selection_control') return 'PARTICIPANT_ELECTION_GENUINE';
  if (row.reason?.startsWith('optional participant-authored content, and the platform does not invent it:')) return 'OPTIONAL_PARTICIPANT_CONTENT';
  throw new Error(`Unaccounted source-field disposition: ${row.field}`);
};
const perDocument = [];
const totals = { sourceFieldInstances: 0, writtenSourceFieldInstances: 0, blankSourceFieldInstances: 0, blankDispositions: {} };
for (const [suffix, priorGitBlob] of Object.entries(delta.currentOutputGitBlobsMatchedToPriorReview)) {
  await test(`Whole output ${suffix} retains the prior independent review identity and exact branch census`, async () => {
    const file = `${directory}/fixtures/${suffix}`;
    const bytes = fs.readFileSync(file);
    assert.equal(blob(bytes), priorGitBlob);
    const declaration = inventory.pdfs.find(row => row.file === file);
    assert.ok(declaration, `Output inventory declaration is required: ${suffix}`);
    assert.equal(hash(bytes), declaration.sha256);
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    assert.equal(pdf.getPageCount(), declaration.pageCount);
    const branch = inventory.conditionalBranches.find(row => row.file === file);
    const fixture = branch?.baseFixture || suffix.replace('.pdf', '');
    const components = branch?.components || fieldMap.maps.map(map => map.documentRole);
    if (branch) {
      const decision = selectNc146Components(branch.selection);
      assert.deepEqual(decision.components, components);
      assert.equal(decision.grantsDeliveryAuthority, false);
      const installed = wiring.binding.conditionalDelivery.fixtureBindings.find(row => row.file === file);
      assert.ok(installed);
      assert.equal(installed.sha256, hash(bytes));
      assert.equal(installed.pageCount, pdf.getPageCount());
      assert.deepEqual(installed.components, components);
      assert.equal(installed.legalReviewRequired, decision.legalReviewRequired);
    }
    const measured = { file, sha256: hash(bytes), gitBlob: blob(bytes), pages: pdf.getPageCount(), baseFixture: fixture, branch: branch?.branch || 'diagnostic_only', sourceFieldInstances: 0, written: 0, blank: 0, blankDispositions: {} };
    for (const map of fieldMap.maps.filter(map => map.officialSource && components.includes(map.documentRole))) {
      measured.sourceFieldInstances += sourceFields.get(map.documentId).length;
      measured.written += map[`${fixture}Writes`].length;
      measured.blank += map[`${fixture}Refusals`].length;
      for (const refusal of map[`${fixture}Refusals`]) {
        const kind = disposition(refusal);
        measured.blankDispositions[kind] = (measured.blankDispositions[kind] || 0) + 1;
      }
    }
    assert.equal(measured.sourceFieldInstances, measured.written + measured.blank);
    totals.sourceFieldInstances += measured.sourceFieldInstances;
    totals.writtenSourceFieldInstances += measured.written;
    totals.blankSourceFieldInstances += measured.blank;
    for (const [kind, count] of Object.entries(measured.blankDispositions)) totals.blankDispositions[kind] = (totals.blankDispositions[kind] || 0) + count;
    perDocument.push(measured);
  });
}
await test('All ten retained complete outputs cover sixty pages and 1904 source-field instances', () => {
  assert.equal(perDocument.length, 10);
  assert.equal(perDocument.reduce((sum, row) => sum + row.pages, 0), 60);
  assert.equal(totals.sourceFieldInstances, 1904);
  assert.equal(totals.writtenSourceFieldInstances, 170);
  assert.equal(totals.blankSourceFieldInstances, 1734);
});
await test('Only expunction purpose is preselected on the indigency source', () => {
  const map = fieldMap.maps.find(map => map.documentId === 'AOC-G-106');
  for (const fixture of ['canonical', 'boundary']) {
    const selections = map[`${fixture}Writes`].filter(row => row.kind === 'selection_control');
    assert.deepEqual(selections.map(row => row.field), ['fee_waiver.ExpunctionPetitionCbx']);
    assert.equal(selections[0].routeDetermined, true);
    for (const name of ['SNAPCbx', 'TANFCbx', 'SSICbx', 'LegalServicesCbx', 'FinanciallyUnableCbx', 'OrderAuthorizedCbx', 'OrderDeniedCbx']) {
      assert.ok(map[`${fixture}Refusals`].some(row => row.field === `fee_waiver.${name}`));
    }
  }
});
await test('Petition court/clerk reverse is never written and every row remains explicitly uncompleted', () => {
  const map = fieldMap.maps.find(map => map.documentId === 'AOC-CR-287');
  for (const fixture of ['canonical', 'boundary']) {
    assert.ok(map[`${fixture}Writes`].every(row => row.page === 1));
    assert.ok(map[`${fixture}Refusals`].filter(row => row.page === 2).every(row => disposition(row) === 'PROTECTED_FIELD'));
    for (let number = 1; number <= 10; number += 1) {
      for (const column of ['FileNumber', 'OffenseDescription', 'DateOfOffense', 'DateOfArrest', 'DateOfDismissal']) {
        const row = map[`${fixture}Refusals`].find(row => row.field === `petition.${column}${number}`);
        assert.ok(row);
        assert.equal(disposition(row), number === 1 ? 'REQUIRED_BEFORE_FILING' : 'OPTIONAL_PARTICIPANT_CONTENT');
      }
    }
  }
});
for (const [name, selection] of Object.entries(NC_BRANCH_FIXTURES)) {
  await test(`Explicit ${name} election retains source roles and never decides eligibility`, () => {
    const result = selectNc146Components(selection);
    assert.equal(result.branch, name);
    assert.equal(result.components.includes('fee_waiver'), selection.requestIndigency);
    assert.equal(result.components.includes('supplemental_financial_affidavit'), selection.supplementalRequested);
    assert.equal(result.legalReviewRequired, selection.feeStatus === 'fee_due');
    assert.equal(result.indigencyEstablished, false);
    assert.equal(result.feeAssessed, false);
    assert.equal(result.grantsEligibility, false);
    assert.equal(result.grantsDeliveryAuthority, false);
  });
}
for (const [name, selection] of [
  ['absent selection', null],
  ['unknown fee', { ...NC_BRANCH_FIXTURES.no_fee, feeStatus: 'unknown' }],
  ['missing indigency election', { feeStatus: 'fee_due', supplementalRequested: false }],
  ['string indigency election', { ...NC_BRANCH_FIXTURES.fee_paid, requestIndigency: 'true' }],
  ['number supplemental election', { ...NC_BRANCH_FIXTURES.fee_paid, supplementalRequested: 1 }],
  ['no-fee indigency claim', { ...NC_BRANCH_FIXTURES.no_fee, requestIndigency: true }],
  ['supplement without petition', { ...NC_BRANCH_FIXTURES.fee_paid, supplementalRequested: true, supplementalRequestReference: 'synthetic request' }],
  ['missing court-request reference', { ...NC_BRANCH_FIXTURES.requested_financial_supplement, supplementalRequestReference: '' }],
  ['whitespace court-request reference', { ...NC_BRANCH_FIXTURES.requested_financial_supplement, supplementalRequestReference: '   ' }]
]) await test(`Refuses ${name}`, () => assert.throws(() => selectNc146Components(selection)));
await test('The assembler refuses missing selected component bytes without generating a replacement packet', async () => {
  await assert.rejects(() => assembleNc146Packet(new Map(), NC_BRANCH_FIXTURES.indigency_requested), /Selected NC component is missing/);
});
await test('Sponsorship or asserted overflow cannot create authority through the fee-only helper', () => {
  const result = selectNc146Components({ ...NC_BRANCH_FIXTURES.no_fee, sponsored: true, verified: true, chargeCount: 11, otherAgencyCount: 3 });
  assert.equal(result.grantsEligibility, false);
  assert.equal(result.grantsDeliveryAuthority, false);
  assert.equal(result.components.includes('fee_waiver'), false);
});
await test('Installed declaration does not advertise runtime capability or a default diagnostic', () => {
  assert.equal(wiring.status, 'DECLARED_NOT_INSTALLED');
  assert.equal(wiring.currentState.generationAllowed, false);
  assert.equal(wiring.currentState.serviceDisposition, 'missing_from_compiled_runtime');
  assert.equal(wiring.authorityCreated, 'none');
  assert.equal(wiring.binding.paymentEligible, false);
  assert.equal(wiring.binding.sponsorshipEligible, false);
  assert.equal(wiring.binding.filingPermitted, false);
  assert.equal(wiring.binding.conditionalDelivery.defaultBranch, null);
  assert.equal(wiring.binding.conditionalDelivery.diagnosticArtifactsExcluded, true);
});
await test('Published chronology is the exact accepted correction, not newly reconstructed text', () => {
  for (const key of ['host', 'guide']) {
    const identity = closure.currentIdentities[key];
    const bytes = fs.readFileSync(identity.path);
    assert.equal(hash(bytes), identity.retainedBytesFreshlyRehashedSha256);
    assert.equal(blob(bytes), identity.gitBlobReadThroughGitHub);
  }
});
let counters = null;
await test('The installed shared verifier reproduces nine zeros under its static union scope', () => {
  const audit = auditFamily(directory, familyId);
  assert.equal(audit.sourceCurrentness, 'EXACT');
  assert.equal(Object.keys(audit.counters).length, 9);
  assert.ok(Object.values(audit.counters).every(value => value === 0));
  counters = { ...audit.counters, measuredHere: true, allZero: true, source: 'Executed installed auditFamily; exhaustive per-output source accounting is independently measured separately above.', staticFieldUnion: audit.totals };
});
const failed = checks.filter(check => !check.passed).length;
const evidence = {
  schemaVersion: 'rcap-independent-nc-engineering-delta/v1',
  reviewer: 'release_scope independent engineering sub-agent',
  recordedAt: new Date().toISOString(),
  familyId,
  verdict: failed ? 'FAIL_REPAIR_REQUIRED' : 'PASS_BOUNDED_ENGINEERING_DELTA',
  evidencePublicationCommit: null,
  checks,
  passed: checks.length - failed,
  failed,
  measuredCodeIdentities: [
    'scripts/rcap-packet-recovery/nc-146-indigency.mjs',
    'scripts/build-census-v1-nc_146_dismissal_petition-set.mjs',
    'scripts/rcap-packet-completeness/verify-packet-completeness.mjs',
    'scripts/rcap-packet-completeness/completeness-contract.mjs',
    `${directory}/production-field-map.json`,
    `${directory}/product-wiring.json`,
    `${directory}/reports/actual-writes.json`,
    `${directory}/reports/rendered-artifacts.json`,
    `${directory}/source-receipt.json`
  ].map(file => { const bytes = fs.readFileSync(file); return { path: file, sha256: hash(bytes), gitBlob: blob(bytes) }; }),
  sourcesMeasured,
  totals,
  perDocument,
  nineStaticCounters: counters,
  originalReview: delta.priorReview,
  publishedClosureCommit: '7ca771a7f5f6ed6f00d10bff438fc81c404aa7e6',
  runtimeIntakeCounters: null,
  runtimeInstalled: false,
  runtimeCapabilityBoundary: {
    chargeRowsPresentOnSource: 10,
    otherAgencySlotsPresentOnSource: 2,
    cr285Included: false,
    participantMatterFactsAcceptedByFeeHelper: false,
    executablePersonalizedOverflowRefusalMeasured: false,
    finding: 'The fee/component helper is not a participant-fact or capacity validator. Extra overflow assertions cannot create authority, but no installed participant-specific success/refusal chain has been proven. CR285 delivery or a matter-bound capacity refusal remains required before enabling overflowing runtime cases.'
  },
  limitations: [
    'All ten exact retained PDF identities are measured; prior complete-page review is reused, not repeated.',
    'Fresh raw G106 equality is established against retained original custody. This is not a fresh download or proof of present-day live-source equality.',
    'Required-before-filing disclosures and genuine source elections are not completed participant facts. All runtime intake counters remain null.',
    'No production, court-actor authentication, eligibility, entitlement, central raster admission, participant-personalized rendering or authorized delivery is proven.'
  ],
  retainedFilesMutated: false,
  packetRendererRuns: 0,
  newRasterRuns: 0,
  freshPageImagesExamined: 0,
  productionTouched: false
};
const destination = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08/independent-nc-engineering.json';
fs.writeFileSync(destination, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ evidence: destination, verdict: evidence.verdict, passed: evidence.passed, failed, failedChecks: checks.filter(check => !check.passed), totals }));
if (failed) process.exitCode = 1;
