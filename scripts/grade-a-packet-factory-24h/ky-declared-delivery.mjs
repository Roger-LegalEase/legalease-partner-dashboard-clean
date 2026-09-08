import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateKy, fixtures, SOURCES, FAMILY, ROUTE, OUT} from '../rcap-packet-recovery/chat5/ky-nonconviction.mjs';

export const KY_FAMILY = FAMILY;
export const KY_ROUTE = ROUTE;
export const KY_DIRECTORY = OUT;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BINDING_PATH = 'scripts/rcap-packet-completeness/ky-reviewed-candidate-inputs.json';
const BINDING_SHA = 'd88f6878045063310552790a70c2fa514b11572ea585b962e4638fec5e1d572f';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const readFile = rel => {
  assert.ok(typeof rel === 'string' && !path.isAbsolute(rel) && !rel.split(/[\\/]/).includes('..'), 'Unsafe declared input path');
  const root = fs.realpathSync(ROOT), absolute = path.join(root, rel);
  assert.ok(!fs.lstatSync(absolute).isSymbolicLink() && fs.realpathSync(absolute).startsWith(root + path.sep), 'Declared input escaped checkout');
  return fs.readFileSync(absolute);
};

function declaredOnly(record) {
  assert.equal(record.family, FAMILY);
  assert.equal(record.status, 'DECLARED_NOT_INSTALLED');
  assert.equal(record.authorityCreated, 'none');
  assert.equal(record.currentState.generationAllowed, false);
  assert.equal(record.binding.paymentEligible, false);
  assert.equal(record.binding.sponsorshipEligible, false);
  for (const routes of [record.routeKeys, record.binding.routeKeys]) assert.deepEqual(routes, [ROUTE], 'KY route scope changed');
}

function selectComponents(facts) {
  assert.equal(typeof facts.options?.includeProposedOrder, 'boolean', 'EXPLICIT_COMPONENT_ELECTION_REQUIRED');
  assert.equal(typeof facts.options?.localOrderPracticeConfirmed, 'boolean', 'EXPLICIT_LOCAL_ORDER_PRACTICE_REQUIRED');
  const review = validateKy(facts);
  assert.deepEqual(review.missing, [], 'UNRESOLVED_CASE_FACTS');
  return {review, components: ['AOC-497.2', 'charge-agency-schedule',
    ...(facts.options.includeProposedOrder ? ['AOC-497'] : []), 'participant-instructions']};
}

// Bind only the exact retained candidate. Source/report/fact/output/code bytes
// must still match its existing review-input manifest; no fresh render is implied.
// readFile/hashFile are filesystem ports, not commercial-authority providers.
export function bindDeclaredKyDelivery(record, family, options = {}) {
  if (family.familyId !== FAMILY) return record;
  declaredOnly(record);
  assert.equal(family.directory, OUT);
  assert.deepEqual(family.routeKeys, [ROUTE]);
  const read = options.readFile ?? readFile;
  const hashFile = options.hashFile ?? (file => sha(read(file)));
  const bindingBytes = read(BINDING_PATH);
  assert.equal(sha(bindingBytes), BINDING_SHA, 'KY review-input binding mismatch');
  const binding = JSON.parse(bindingBytes);
  assert.equal(binding.familyId, FAMILY);
  const bytes = new Map();
  for (const member of binding.files) {
    assert.ok(!bytes.has(member.path), 'Duplicate reviewed member');
    const held = read(member.path);
    assert.equal(held.length, member.byteLength, `KY reviewed input length mismatch: ${member.path}`);
    assert.equal(sha(held), member.sha256, `KY reviewed input hash mismatch: ${member.path}`);
    bytes.set(member.path, held);
  }
  const parsed = rel => {
    assert.ok(bytes.has(rel), `Unbound candidate document: ${rel}`);
    return JSON.parse(bytes.get(rel));
  };
  assert.equal(gitBlob(read(binding.review.path)), binding.review.gitBlob, 'KY independent review bytes changed');
  const reportPath = `${OUT}/reports/rendered-artifacts.json`;
  const report = parsed(reportPath);
  if (options.report !== undefined) assert.deepEqual(options.report, report, 'Supplied KY output inventory differs from bound report');
  assert.equal(report.familyId, FAMILY);
  const expectedFixtures = Object.keys(fixtures());
  assert.equal(report.pdfs.length, 13);
  assert.equal(new Set(report.pdfs.map(d => d.fixture)).size, 13, 'Duplicate KY fixture');
  assert.deepEqual(report.pdfs.map(d => d.fixture).sort(), [...expectedFixtures].sort(), 'Incomplete KY fixture inventory');
  const receipt = parsed(`${OUT}/source-receipt.json`);
  for (const [id, source] of Object.entries(SOURCES)) {
    assert.deepEqual(receipt.sources[id], source, `KY source identity differs: ${id}`);
    assert.equal(sha(bytes.get(source.path)), source.sha256);
  }
  const census = parsed(`${OUT}/official-field-census.json`);
  const fixtureBindings = [];
  for (const artifact of report.pdfs) {
    const inputPath = `${OUT}/fixtures/${artifact.fixture}.facts.json`;
    const fixtureReportPath = `${OUT}/reports/${artifact.fixture}.json`;
    const facts = parsed(inputPath), fixtureReport = parsed(fixtureReportPath);
    assert.equal(facts.isSyntheticFixture, true, 'Candidate output is synthetic evidence');
    const {review, components} = selectComponents(facts);
    assert.equal(artifact.file, `${OUT}/fixtures/${artifact.fixture}.pdf`);
    assert.equal(fixtureReport.fixture, artifact.fixture);
    assert.equal(fixtureReport.familyId, FAMILY);
    assert.equal(fixtureReport.inputSha256, sha(bytes.get(inputPath)), 'KY input/report binding mismatch');
    assert.deepEqual(fixtureReport.output, {file: artifact.file, sha256: artifact.sha256,
      byteLength: artifact.byteLength, pageCount: artifact.pageCount});
    assert.equal(sha(bytes.get(artifact.file)), artifact.sha256, 'KY selected output mismatch');
    assert.equal(hashFile(artifact.file), artifact.sha256, 'KY current selected output mismatch');
    assert.deepEqual(fixtureReport.eligibility, review.eligibility);
    assert.deepEqual(fixtureReport.selectedBases, review.selectable);
    assert.deepEqual(artifact.componentPages, fixtureReport.componentPages);
    assert.deepEqual(artifact.componentPages.map(c => c.documentId), components, 'AOC-497 is distinct from AOC-497.2');
    let firstPage = 1;
    for (const component of artifact.componentPages) {
      const expected = {
        'AOC-497.2': {role: 'primary_filing', pages: 2},
        'charge-agency-schedule': {role: 'filing_attachment', pages: 1},
        'AOC-497': {role: 'proposed_order', pages: 2},
        'participant-instructions': {role: 'participant_instructions', pages: 3}
      }[component.documentId];
      assert.equal(component.firstPage, firstPage);
      assert.equal(component.pageCount, expected.pages);
      assert.equal(component.role, expected.role);
      if (SOURCES[component.documentId]) assert.equal(component.sourceSha256, SOURCES[component.documentId].sha256);
      firstPage += component.pageCount;
    }
    assert.equal(artifact.pageCount, facts.options.includeProposedOrder ? 8 : 6);
    assert.equal(firstPage - 1, artifact.pageCount);
    // Court/County are held venue facts. Only the source's reserved execution
    // controls and exact AOC-497 findings are official-owned, not every field
    // whose label happens to contain court or a party name.
    for (const write of fixtureReport.writes) {
      assert.ok(components.includes(write.documentId), 'Write belongs to an omitted component');
      const field = census[write.documentId]?.find(f => f.field === write.field);
      assert.ok(field, 'Write has no exact source field');
      assert.ok(field.type !== 'PDFButton', 'Viewer control cannot be a participant write');
      assert.ok(!(write.documentId === 'AOC-497' && (field.type === 'PDFCheckBox' || ['other charges', '2_2', 'undefined_2'].includes(write.field))), 'Court-owned finding written');
      assert.ok(!['signature date', 'signature year'].includes(write.field), 'Execution field written');
    }
    fixtureBindings.push({fixture: artifact.fixture, file: artifact.file, sha256: artifact.sha256,
      byteLength: artifact.byteLength, pageCount: artifact.pageCount, components,
      componentPages: structuredClone(artifact.componentPages),
      input: {file: inputPath, sha256: fixtureReport.inputSha256},
      report: {file: fixtureReportPath, sha256: sha(bytes.get(fixtureReportPath))},
      selection: structuredClone(facts.options), selectedBases: [...review.selectable],
      manualCompletions: structuredClone(fixtureReport.blanks.filter(b => b.requiredBeforeFiling === true)),
      officialActorObligations: structuredClone(fixtureReport.blanks.filter(b => b.kind === 'court_clerk_agency_owned')),
      optionalBlanks: structuredClone(fixtureReport.blanks.filter(b => b.kind === 'optional_blank')),
      writtenFields: fixtureReport.writes.map(w => ({documentId: w.documentId, field: w.field, kind: w.kind})),
      syntheticFixture: true, filingPermitted: false, grantsDeliveryAuthority: false});
  }
  assert.equal(fixtureBindings.reduce((n, f) => n + f.pageCount, 0), 90);
  const result = structuredClone(record);
  result.currentState.runtimeSelectable = false;
  result.binding.packetComponents = ['AOC-497.2', 'charge-agency-schedule', 'AOC-497', 'participant-instructions'];
  result.binding.componentConditions = {'AOC-497': 'includeProposedOrder === true and localOrderPracticeConfirmed === true'};
  result.binding.filingPermitted = false;
  result.binding.conditionalDelivery = {
    selectionContract: 'scripts/rcap-packet-recovery/chat5/ky-nonconviction.mjs#validateKy',
    fixtureSelectionContract: 'scripts/grade-a-packet-factory-24h/ky-declared-delivery.mjs#selectDeclaredKyFixture',
    explicitSelectionRequired: true, defaultBranch: null, runtimeInstalled: false,
    reviewInputBinding: {file: BINDING_PATH, sha256: BINDING_SHA, filesMeasured: bytes.size},
    independentCandidateReview: structuredClone(binding.review),
    outputInventory: {file: reportPath, sha256: sha(bytes.get(reportPath)), documents: 13, pages: 90},
    sourceBindings: structuredClone(SOURCES), fixtureBindings,
    note: 'Exact synthetic validation outputs only. Participant facts require a new render, current verification, matter-bound authority and private delivery. Manual identifiers and execution are not represented as completed.'
  };
  result.proposedRepresentation.note = result.binding.conditionalDelivery.note;
  result.proposedRepresentation.runtimeSelectable = false;
  result.proposedRepresentation.generationAllowed = false;
  result.proposedRepresentation.defaultComponentId = null;
  result.proposedRepresentation.fixtureBindings = structuredClone(fixtureBindings);
  result.proposedRepresentation.components = fixtureBindings.map((f, i) => ({
    componentId: `${FAMILY}-${f.fixture.replaceAll('/', '-')}`, role: 'conditional_assembled_packet',
    order: i + 1, documentId: f.fixture, file: f.file, sha256: f.sha256,
    requirement: 'conditional', selectedBy: f.fixture, componentsIncluded: [...f.components],
    syntheticFixture: true, grantsDeliveryAuthority: false
  }));
  result.binding.acceptanceReceipt = null;
  if (options.raster) {
    // The caller must have independently admitted and rehashed this receipt.
    // Matching this inventory does not authenticate a caller or grant authority.
    const raster = options.raster, pass = raster.rasterReceipt;
    assert.equal(raster.familyId, FAMILY);
    assert.equal(pass.verdict, 'RASTER_PASS');
    assert.equal(pass.coversTheWholeFamily, true);
    assert.equal(pass.documentsMeasured, 13);
    assert.equal(pass.pagesMeasured, 90);
    assert.deepEqual(pass.documentsNotCovered, []);
    assert.deepEqual([...pass.documentsCovered].sort(), report.pdfs.map(d => d.file.slice(`${OUT}/fixtures/`.length)).sort());
    assert.equal(raster.documents.length, 13);
    for (const d of report.pdfs) {
      const matches = raster.documents.filter(p => p.path === d.file);
      assert.equal(matches.length, 1);
      assert.equal(matches[0].sha256, d.sha256);
      assert.equal(matches[0].pageCount, d.pageCount);
    }
    assert.equal(pass.boundToCanonicalSha256, report.pdfs.find(d => d.fixture === 'canonical').sha256);
    assert.equal(pass.boundToBoundarySha256, report.pdfs.find(d => d.fixture === 'boundary').sha256);
    result.binding.acceptanceReceipt = {
      verdict: pass.verdict, workflowRunId: pass.workflowRunId, jobId: pass.jobId,
      artifactId: pass.receiptArtifact.id, verdictPath: pass.verdictPath,
      boundToCanonicalSha256: pass.boundToCanonicalSha256, boundToBoundarySha256: pass.boundToBoundarySha256,
      coversTheWholeFamily: true, documentsMeasured: 13, pagesMeasured: 90,
      documentsCovered: [...pass.documentsCovered], documentsDigest: pass.documentsDigest
    };
  }
  return result;
}

// An explicit fixture selector for nonproduction integration evidence. A real
// participant cannot obtain a canned fixture by presenting equivalent choices.
export function selectDeclaredKyFixture(record, input, fixture, options = {}) {
  declaredOnly(record);
  assert.ok(typeof fixture === 'string' && Object.hasOwn(fixtures(), fixture), 'EXPLICIT_SUPPORTED_FIXTURE_REQUIRED');
  assert.equal(input?.isSyntheticFixture, true, 'PARTICIPANT_RENDER_REQUIRED');
  const {review, components} = selectComponents(input);
  const rebound = bindDeclaredKyDelivery(record, {familyId: FAMILY, directory: OUT, routeKeys: [ROUTE]}, options);
  assert.deepEqual(record.binding.conditionalDelivery, rebound.binding.conditionalDelivery, 'Declared KY binding changed or is stale');
  const matches = rebound.binding.conditionalDelivery.fixtureBindings.filter(f => f.fixture === fixture);
  assert.equal(matches.length, 1, 'No unique exact fixture');
  const selected = matches[0];
  assert.equal(sha(Buffer.from(json(input))), selected.input.sha256, 'FIXTURE_INPUT_MISMATCH_PARTICIPANT_RENDER_REQUIRED');
  assert.deepEqual(selected.selection, input.options);
  assert.deepEqual(selected.components, components);
  assert.deepEqual(selected.selectedBases, review.selectable);
  return {...structuredClone(selected), grantsEligibility: false, grantsDeliveryAuthority: false, runtimeInstalled: false};
}
