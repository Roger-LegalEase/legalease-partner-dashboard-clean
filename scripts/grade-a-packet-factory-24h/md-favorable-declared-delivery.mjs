import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateMdFavorable, BASIS_FIELDS} from '../rcap-packet-recovery/chat5/md-favorable.mjs';
import {prepareMdNativeFixture, MD_NATIVE_FAMILY, MD_NATIVE_DIRECTORY} from '../rcap-packet-completeness/md-favorable-native-candidate.mjs';

export const MD_FAVORABLE_FAMILY = MD_NATIVE_FAMILY;
export const MD_FAVORABLE_DIRECTORY = MD_NATIVE_DIRECTORY;
export const MD_FAVORABLE_ROUTE = 'obligation:track-pathway:MD:md_10105_favorable:adult-non-conviction-expungement-under-crim-proc-10-105';
export const MD_FAVORABLE_FIXTURES = Object.freeze([
  'canonical', 'boundary', 'selectable/acquittal', 'selectable/nolle', 'selectable/nolle-treatment',
  'selectable/stet', 'selectable/stet-treatment', 'selectable/pbj', 'selectable/pbj-no-longer-crime',
  'selectable/pbj-dui', 'selectable/ncr', 'selectable/compromise', 'selectable/juvenile-transfer',
  'selectable/adult-transfer-circuit', 'selectable/citation'
]);
const FAMILY = MD_FAVORABLE_FAMILY, OUT = MD_FAVORABLE_DIRECTORY, ROUTE = MD_FAVORABLE_ROUTE;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FORM = 'CC-DC-CR-072A';
const SOURCE = 'reference/chat-parallel-2026-09-07/chat5/CC-DC-CR-072A.pdf';
const SOURCE_SHA = '8dcb7b177cfb8900edc03158b064a57121170761e6f34e2456f08fdc68f82db2';
const HELPER = 'scripts/rcap-packet-recovery/chat5/md-favorable.mjs';
const HELPER_BLOB = '4f7f87558c98691b1ff77825ede2f13dbf7ebd7c';
const BINDING = 'scripts/rcap-packet-completeness/md-reviewed-candidate-inputs.json';
const BINDING_SHA = 'b5006d7fd203571627af2dbc4cd4bf68a0086b5ba89b045738655f36a9ba0ca9';
const ADAPTER = 'scripts/rcap-packet-completeness/md-favorable-native-candidate.mjs';
const ADAPTER_SHA = '2c0cb8fb3e2d754184b32289ceba64509ede75e704fe65386188e8a78267a4f3';
const REVIEW = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat4-review/';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const serialize = value => `${JSON.stringify(value, null, 2)}\n`;
const readFile = relative => {
  assert.ok(typeof relative === 'string' && !path.isAbsolute(relative) && !relative.split(/[\\/]/).includes('..'), 'Unsafe MD declared input path');
  const root = fs.realpathSync(ROOT), target = path.join(root, relative);
  assert.ok(!fs.lstatSync(target).isSymbolicLink() && fs.realpathSync(target).startsWith(root + path.sep), 'MD declared input escaped checkout');
  return fs.readFileSync(target);
};
function declaredOnly(record) {
  assert.equal(record.family, FAMILY);
  assert.equal(record.status, 'DECLARED_NOT_INSTALLED');
  assert.equal(record.authorityCreated, 'none');
  assert.equal(record.currentState.generationAllowed, false);
  assert.notEqual(record.currentState.runtimeSelectable, true);
  assert.notEqual(record.runtimeInstalled, true);
  assert.equal(record.binding.paymentEligible, false);
  assert.equal(record.binding.sponsorshipEligible, false);
  for (const routes of [record.routeKeys, record.binding.routeKeys]) assert.deepEqual(routes, [ROUTE], 'MD favorable route scope changed');
}
function validated(input) {
  const checked = validateMdFavorable(input);
  assert.equal(checked.mayMarkDisposition, true, 'UNRESOLVED_DISPOSITION_FACTS');
  assert.deepEqual(checked.missing, [], 'UNRESOLVED_DISPOSITION_FACTS');
  return checked;
}

// These are existing synthetic validation outputs, not participant documents.
// Reuse the actual accepted validator and reviewed source-specific importer.
// Caller filesystem ports never authenticate a participant or create authority.
export function bindDeclaredMdFavorableDelivery(record, family, options = {}) {
  if (family.familyId !== FAMILY) return record;
  declaredOnly(record);
  assert.equal(family.directory, OUT);
  assert.deepEqual(family.routeKeys, [ROUTE]);
  const read = options.readFile ?? readFile;
  const hashFile = options.hashFile ?? (file => sha(read(file)));
  const bindingBytes = read(BINDING);
  assert.equal(sha(bindingBytes), BINDING_SHA, 'MD reviewed manifest mismatch');
  const manifest = JSON.parse(bindingBytes);
  assert.equal(manifest.familyId, FAMILY);
  assert.equal(manifest.files.length, 56, 'Incomplete MD reviewed member inventory');
  const bytes = new Map();
  for (const member of manifest.files) {
    assert.ok(!bytes.has(member.path), 'Duplicate MD reviewed member');
    const held = read(member.path);
    assert.equal(held.length, member.byteLength, `MD reviewed input length mismatch: ${member.path}`);
    assert.equal(sha(held), member.sha256, `MD reviewed input hash mismatch: ${member.path}`);
    bytes.set(member.path, held);
  }
  assert.equal(sha(read(ADAPTER)), ADAPTER_SHA, 'Reviewed MD source-role adapter changed');
  assert.equal(blob(bytes.get(HELPER)), HELPER_BLOB, 'Accepted MD chronology helper changed');
  const get = file => { assert.ok(bytes.has(file), `Unbound MD candidate input: ${file}`); return JSON.parse(bytes.get(file)); };
  const original = get(REVIEW + 'md-independent-review.json').rows.find(row => row.familyId === FAMILY);
  const delta = get(REVIEW + 'md-guard-delta-03.json').rows.find(row => row.familyId === FAMILY);
  assert.equal(original.suppliedPdfVerdict, 'PASS_REVIEWED_FIXTURES');
  assert.equal(delta.verdict, 'PASS');
  assert.deepEqual(delta.failedObligations, []);
  assert.equal(delta.measuredIdentities.newHelperGitBlob, HELPER_BLOB);
  const receipt = get(`${OUT}/source-receipt.json`);
  assert.equal(receipt.officialFormId, FORM);
  assert.equal(receipt.sourcePath, SOURCE);
  assert.equal(receipt.sha256, SOURCE_SHA);
  assert.equal(receipt.edition, '09/2025');
  assert.equal(receipt.sourcePageCount, 1);
  assert.equal(sha(bytes.get(SOURCE)), SOURCE_SHA);
  const reportPath = `${OUT}/reports/rendered-artifacts.json`, report = get(reportPath);
  if (options.report !== undefined) assert.deepEqual(options.report, report, 'Supplied MD inventory differs from reviewed report');
  assert.equal(report.familyId, FAMILY);
  assert.deepEqual(report.componentSet, [FORM]);
  assert.equal(report.pdfs.length, MD_FAVORABLE_FIXTURES.length);
  assert.equal(new Set(report.pdfs.map(d => d.fixture)).size, MD_FAVORABLE_FIXTURES.length);
  assert.deepEqual(report.pdfs.map(d => d.fixture).sort(), [...MD_FAVORABLE_FIXTURES].sort(), 'Incomplete MD fixture inventory');
  const census = get(`${OUT}/official-field-census.json`), fieldMap = get(`${OUT}/production-field-map.json`);
  assert.equal(census.length, 47);
  const fixtureBindings = [];
  for (const artifact of report.pdfs) {
    const inputPath = `${OUT}/fixtures/${artifact.fixture}.facts.json`;
    const fixtureReportPath = `${OUT}/reports/${artifact.fixture}.json`;
    const facts = get(inputPath), native = get(fixtureReportPath);
    assert.equal(facts.isSyntheticFixture, true, 'MD candidate is synthetic evidence');
    const checked = validated(facts);
    const prepared = prepareMdNativeFixture({fixture: artifact.fixture, census, fieldMap, report: native, checked, basisFields: BASIS_FIELDS});
    assert.equal(prepared.ledger.length, 47);
    assert.equal(native.inputPath, `fixtures/${artifact.fixture}.facts.json`);
    assert.equal(native.inputSha256, sha(bytes.get(inputPath)), 'MD facts/report mismatch');
    assert.equal(native.sourcePath, SOURCE);
    assert.equal(native.sourceSha256, SOURCE_SHA);
    assert.equal(artifact.file, `${OUT}/fixtures/${artifact.fixture}.pdf`);
    assert.equal(artifact.documentId, FORM);
    assert.equal(artifact.role, 'assembled_official_petition_packet');
    assert.deepEqual(artifact.components, [FORM]);
    assert.deepEqual(native.selectedComponents, [FORM]);
    assert.equal(artifact.pageCount, 4);
    assert.deepEqual(native.output, {file: artifact.file, sha256: artifact.sha256, byteLength: artifact.byteLength, pageCount: 4});
    assert.equal(sha(bytes.get(artifact.file)), artifact.sha256);
    assert.equal(hashFile(artifact.file), artifact.sha256, 'Current MD selected output hash mismatch');
    assert.deepEqual(artifact.pageManifest, [
      {packetPage: 1, documentId: FORM, role: 'primary_filing', sourcePage: 1, sourceSha256: SOURCE_SHA},
      ...[2, 3, 4].map(packetPage => ({packetPage, documentId: 'participant-instructions', role: 'participant_instructions'}))
    ], 'MD selected component pages differ');
    fixtureBindings.push({fixture: artifact.fixture, file: artifact.file, sha256: artifact.sha256,
      byteLength: artifact.byteLength, pageCount: 4, components: [FORM, 'participant-instructions'],
      pageManifest: structuredClone(artifact.pageManifest),
      input: {file: inputPath, sha256: native.inputSha256}, report: {file: fixtureReportPath, sha256: sha(bytes.get(fixtureReportPath))},
      selection: {basis: facts.case.basis, event: facts.case.event, courtLevel: facts.court.level, transfer: facts.court.transfer,
        treatmentRequired: facts.case.treatmentRequired},
      confirmedConditions: structuredClone(checked.conditions), earliestOrdinaryFilingDate: checked.earliest,
      requiredBeforeFiling: structuredClone(native.blanks.filter(blank => blank.requiredBeforeFiling === true)),
      participantExecution: structuredClone(native.blanks.filter(blank => blank.disposition === 'signature_or_date_participant_completion')),
      notApplicableAttorneyBlanks: structuredClone(native.blanks.filter(blank => blank.disposition === 'not_applicable_pro_se')),
      optionalBlanks: structuredClone(native.blanks.filter(blank => blank.disposition === 'optional_blank')),
      sourceFieldAccounting: {total: prepared.ledger.length, written: prepared.fieldMap.writes.length, blank: prepared.fieldMap.refusals.length,
        fields: prepared.ledger.map(row => ({field: row.field, accounting: row.accounting}))},
      syntheticFixture: true, participantExecutionCompleted: false, filingPermitted: false, grantsDeliveryAuthority: false});
  }
  assert.equal(fixtureBindings.reduce((n, f) => n + f.pageCount, 0), 60);
  assert.equal(fixtureBindings.reduce((n, f) => n + f.sourceFieldAccounting.total, 0), 705);
  const result = structuredClone(record);
  result.runtimeInstalled = false;
  result.currentState.runtimeSelectable = false;
  result.binding.runtimeInstalled = false;
  result.binding.generationAllowed = false;
  result.binding.filingPermitted = false;
  result.binding.packetComponents = [FORM, 'participant-instructions'];
  result.binding.componentConditions = {};
  result.binding.conditionalDelivery = {
    selectionContract: 'scripts/rcap-packet-recovery/chat5/md-favorable.mjs#validateMdFavorable',
    fixtureSelectionContract: 'scripts/grade-a-packet-factory-24h/md-favorable-declared-delivery.mjs#selectDeclaredMdFavorableFixture',
    explicitSelectionRequired: true, defaultBranch: null, runtimeInstalled: false,
    reviewInputBinding: {file: BINDING, sha256: BINDING_SHA, filesMeasured: bytes.size},
    sourceRoleAdapter: {file: ADAPTER, sha256: ADAPTER_SHA}, acceptedHelperGitBlob: HELPER_BLOB,
    independentCandidateReview: structuredClone(manifest.review),
    outputInventory: {file: reportPath, sha256: sha(bytes.get(reportPath)), documents: 15, pages: 60},
    sourceBinding: {documentId: FORM, file: SOURCE, sha256: SOURCE_SHA, edition: '09/2025', pageCount: 1, fieldCount: 47},
    fixtureBindings,
    note: 'Exact synthetic ordinary 072A validation outputs only. Real participant facts require current verification, a new matter-bound render and authorized private delivery. Personal signing and disclosed missing agency facts remain unresolved; no attorney, service or execution act is invented. Conviction, cannabis, early release and fee-waiver components are separate treatments.'
  };
  Object.assign(result.proposedRepresentation, {
    note: result.binding.conditionalDelivery.note, runtimeSelectable: false, generationAllowed: false,
    defaultComponentId: null, fixtureBindings: structuredClone(fixtureBindings),
    components: fixtureBindings.map((f, i) => ({componentId: `${FAMILY}-${f.fixture.replaceAll('/', '-')}`,
      role: 'conditional_assembled_packet', order: i + 1, documentId: f.fixture, file: f.file, sha256: f.sha256,
      requirement: 'conditional', selectedBy: f.fixture, componentsIncluded: [...f.components],
      syntheticFixture: true, grantsDeliveryAuthority: false}))
  });
  result.binding.acceptanceReceipt = null;
  if (options.raster) {
    // This validates the inventory of an already-admitted, rehashed receipt
    // supplied by the existing trusted caller. It is not issuer authentication.
    const raster = options.raster, pass = raster.rasterReceipt;
    assert.equal(raster.familyId, FAMILY);
    assert.equal(pass.verdict, 'RASTER_PASS');
    assert.equal(pass.coversTheWholeFamily, true);
    assert.equal(pass.documentsMeasured, 15);
    assert.equal(pass.pagesMeasured, 60);
    assert.deepEqual(pass.documentsNotCovered, []);
    assert.deepEqual([...pass.documentsCovered].sort(), report.pdfs.map(d => d.file.slice(`${OUT}/fixtures/`.length)).sort());
    assert.equal(raster.documents.length, 15);
    for (const d of report.pdfs) {
      const matches = raster.documents.filter(p => p.path === d.file);
      assert.equal(matches.length, 1);
      assert.equal(matches[0].sha256, d.sha256);
      assert.equal(matches[0].pageCount, d.pageCount);
    }
    assert.equal(pass.boundToCanonicalSha256, report.pdfs.find(d => d.fixture === 'canonical').sha256);
    assert.equal(pass.boundToBoundarySha256, report.pdfs.find(d => d.fixture === 'boundary').sha256);
    result.binding.acceptanceReceipt = {verdict: pass.verdict, workflowRunId: pass.workflowRunId, jobId: pass.jobId,
      artifactId: pass.receiptArtifact.id, verdictPath: pass.verdictPath,
      boundToCanonicalSha256: pass.boundToCanonicalSha256, boundToBoundarySha256: pass.boundToBoundarySha256,
      coversTheWholeFamily: true, documentsMeasured: 15, pagesMeasured: 60,
      documentsCovered: [...pass.documentsCovered], documentsDigest: pass.documentsDigest};
  }
  return result;
}

// Exact nonproduction fixture selection. Owner/matter/entitlement and actual
// participant generation remain the production renderer's separate obligation.
export function selectDeclaredMdFavorableFixture(record, input, fixture, options = {}) {
  declaredOnly(record);
  assert.ok(typeof fixture === 'string' && MD_FAVORABLE_FIXTURES.includes(fixture), 'EXPLICIT_SUPPORTED_FIXTURE_REQUIRED');
  assert.equal(input?.isSyntheticFixture, true, 'PARTICIPANT_RENDER_REQUIRED');
  validated(input);
  const rebound = bindDeclaredMdFavorableDelivery(record, {familyId: FAMILY, directory: OUT, routeKeys: [ROUTE]}, options);
  assert.deepEqual(record.binding.conditionalDelivery, rebound.binding.conditionalDelivery, 'MD declared binding changed or is stale');
  const matches = rebound.binding.conditionalDelivery.fixtureBindings.filter(f => f.fixture === fixture);
  assert.equal(matches.length, 1, 'No unique MD fixture');
  const selected = matches[0];
  assert.equal(sha(Buffer.from(serialize(input))), selected.input.sha256, 'FIXTURE_INPUT_MISMATCH_PARTICIPANT_RENDER_REQUIRED');
  return {...structuredClone(selected), grantsEligibility: false, grantsDeliveryAuthority: false, runtimeInstalled: false};
}
