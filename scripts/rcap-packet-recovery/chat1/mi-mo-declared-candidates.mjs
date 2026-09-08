import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { FAMILY_IDS as MI_IDS, fixturesFor, nextSteps, validateInput } from '../chat9/michigan.mjs';
import { assessPriorApplications } from '../chat9/mi-history-policy.mjs';
import { FAMILY as MO_ID, importFacts, instructionPages, needsConfidentialSheet } from '../chat7/mistaken-identity.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const EVIDENCE = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/mi-mo-closure';
const GUARD = `${EVIDENCE}/candidate-publication-guard.json`;
const GUARD_SHA = 'f2347aab63d69a6532a6d42d3049314d256f9f17da6936f94b58289d5719d7b8';
const REVIEW = `${EVIDENCE}/mi-mo-session10-static-acceptance.json`;
const REVIEW_SHA = 'ac95c311003dcbcc3dd1b205954420e0fdff9555d3b8d26a4ce6b96d1424c224';
const SELF = 'scripts/rcap-packet-recovery/chat1/mi-mo-declared-candidates.mjs';
const MO_AUTO = 'obligation:unit:MO:mo-610-145-mistaken-identity:mo-610-145-automatic-on-notice';
const MO_PETITION = 'obligation:unit:MO:mo-610-145-mistaken-identity:mo-610-145-cr301-petition';
export const MI_MO_FAMILIES = Object.freeze([...MI_IDS, MO_ID]);
export const isMiMoDeclaredFamily = id => MI_MO_FAMILIES.includes(id);
const SPECS = {
  [MI_IDS[0]]: { directory: 'data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill', routes: ['obligation:track-pathway:MI:mi_setaside_application:set-aside-by-application-under-mcl-780-621'] },
  [MI_IDS[1]]: { directory: 'data/rcap-all50/overlays/census-v1/mi/mi-setaside-first-owi-set--official-pdf-fill', routes: ['obligation:track-pathway:MI:mi_setaside_first_owi:first-offense-owi-set-aside-by-application'] },
  [MO_ID]: { directory: 'data/rcap-all50/overlays/census-v1/mo/mo-610-145-mistaken-identity-set--official-pdf-fill', routes: [MO_AUTO, MO_PETITION] },
};
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const stable = value => JSON.stringify(value && typeof value === 'object'
  ? Array.isArray(value) ? value.map(item => JSON.parse(stable(item)))
    : Object.fromEntries(Object.keys(value).sort().map(key => [key, JSON.parse(stable(value[key]))]))
  : value);
const factsSha = input => sha(Buffer.from(stable(input)));
function safeRead(relative) {
  assert(typeof relative === 'string' && !path.isAbsolute(relative) && !relative.includes('\\') && !relative.split('/').some(part => ['..', '.', ''].includes(part)), 'Unsafe MI/MO candidate path');
  let file = ROOT;
  for (const part of relative.split('/')) { file = path.join(file, part); assert(!fs.lstatSync(file).isSymbolicLink(), 'MI/MO candidate path is a symlink'); }
  assert(fs.realpathSync(file).startsWith(`${fs.realpathSync(ROOT)}${path.sep}`), 'MI/MO candidate escaped checkout');
  return fs.readFileSync(file);
}
function checkedFamily(family) {
  const spec = SPECS[family.familyId];
  assert(spec, 'Unsupported MI/MO family');
  assert.equal(family.directory, spec.directory, 'MI/MO directory mismatch');
  assert.deepEqual([...family.routeKeys].sort(), [...spec.routes].sort(), 'MI/MO exact route scope changed');
  return spec;
}
function loadCandidate(family, options) {
  const spec = checkedFamily(family), read = options.readFile ?? safeRead;
  const guardBytes = read(GUARD), reviewBytes = read(REVIEW);
  assert.equal(sha(guardBytes), GUARD_SHA, 'MI/MO guarded input inventory changed');
  assert.equal(sha(reviewBytes), REVIEW_SHA, 'MI/MO independent static review changed');
  const guard = JSON.parse(guardBytes), review = JSON.parse(reviewBytes);
  const accepted = review.rows.find(row => row.familyId === family.familyId);
  assert.equal(accepted?.verdict, 'PASS_COMPLETE_INDEPENDENT');
  const mi = MI_IDS.includes(family.familyId);
  const dependencies = new Set(mi ? [
    'scripts/rcap-packet-recovery/chat9/michigan.mjs', 'scripts/rcap-packet-recovery/chat9/mi-history-policy.mjs',
    'reference/chat-parallel-2026-09-07/chat9/mc227.pdf',
  ] : [
    'scripts/rcap-packet-recovery/chat7/mistaken-identity.mjs', 'scripts/rcap-packet-recovery/chat7/mistaken-identity-follow-through.mjs',
    'reference/chat-parallel-2026-09-07/chat7/CR301.pdf', 'reference/chat-parallel-2026-09-07/chat7/CR311.pdf', 'reference/chat-parallel-2026-09-07/chat7/FI-05.pdf',
  ]);
  const members = guard.files.filter(item => item.path.startsWith(`${spec.directory}/`) || dependencies.has(item.path));
  assert([...dependencies].every(file => members.some(item => item.path === file)), 'MI/MO code/source dependency lacks a reviewed pin');
  const bytes = new Map();
  for (const item of members) {
    assert(!bytes.has(item.path), 'Duplicate MI/MO reviewed input');
    const data = read(item.path);
    assert.equal(data.length, item.bytes, `MI/MO input length mismatch: ${item.path}`);
    assert.equal(sha(data), item.sha256, `MI/MO input hash mismatch: ${item.path}`);
    bytes.set(item.path, data);
  }
  const get = relative => { assert(bytes.has(relative), `Unbound MI/MO input: ${relative}`); return bytes.get(relative); };
  const json = relative => JSON.parse(get(relative));
  const reportPath = `${spec.directory}/reports/rendered-artifacts.json`, report = json(reportPath);
  assert.equal(report.familyId, family.familyId);
  if (options.report !== undefined) assert.deepEqual(options.report, report, 'Supplied MI/MO inventory differs from reviewed bytes');
  const receiptPath = `${spec.directory}/source-receipt.json`, receipt = json(receiptPath);
  const sources = receipt.documents.map(item => {
    const file = item.sourcePath ?? item.path;
    assert.equal(sha(get(file)), item.sha256, 'MI/MO source receipt mismatch');
    return { documentId: item.formNumber, file, sha256: item.sha256, byteLength: get(file).length };
  });
  return { spec, mi, get, json, accepted, report, reportPath, receiptPath, sources, memberCount: members.length };
}

// MO's builder explicitly projects these elections from two retained base
// fixtures. This small matrix preserves that actual invoking path; it does not
// derive legal authority from filenames, infer local practice, or add variants.
function moInputs(candidate) {
  const result = new Map();
  for (const base of ['canonical', 'boundary']) {
    const file = `${candidate.spec.directory}/${base}.fixture.json`, input = candidate.json(file);
    for (const opensNewCase of [false, true]) for (const proposedOrderRequested of [false, true]) {
      const fixture = `${base}.${opensNewCase ? 'new-case' : 'existing-case'}.${proposedOrderRequested ? 'with-order' : 'no-order'}`;
      result.set(fixture, { file, input: { ...input, opensNewCase, proposedOrderRequested } });
    }
    for (const proposedOrderRequested of [false, true]) {
      result.set(`${base}.existing-case.clerk-requires-sheet.${proposedOrderRequested ? 'with-order' : 'no-order'}`, {
        file, input: { ...input, opensNewCase: false, confidentialSheetRequired: true, proposedOrderRequested },
      });
    }
  }
  const file = `${candidate.spec.directory}/automatic-on-notice.fixture.json`;
  result.set('automatic-on-notice', { file, input: candidate.json(file) });
  return result;
}

/** One factual route/component/output matrix feeds both declaration and raster
 * enrollment. All outputs are retained synthetic examples; none is live-ready. */
export function miMoCandidateMatrix(family, options = {}) {
  const c = loadCandidate(family, options), out = c.spec.directory;
  const inputs = c.mi ? new Map(Object.entries(fixturesFor(family.familyId)).map(([fixture, input]) =>
    [fixture, { file: `${out}/fixtures/${fixture}.json`, input }])) : moInputs(c);
  assert.equal(new Set(c.report.artifacts.map(item => item.fixture)).size, inputs.size, 'Duplicate or missing MI/MO output election');
  assert.deepEqual(c.report.artifacts.map(item => item.fixture).sort(), [...inputs.keys()].sort(), 'MI/MO selected output inventory is incomplete');
  const missing = c.mi ? null : c.json(`${out}/reports/missing-information.json`);
  const packetManifest = c.mi ? null : c.json(`${out}/packet-manifest.json`);
  const fixtures = c.report.artifacts.map(artifact => {
    const { file: inputFile, input } = inputs.get(artifact.fixture);
    assert.equal(input.synthetic, true, 'PARTICIPANT_RENDER_REQUIRED');
    assert.equal(sha(c.get(artifact.file)), artifact.sha256, 'MI/MO selected PDF mismatch');
    if (options.hashFile) assert.equal(options.hashFile(artifact.file), artifact.sha256, 'MI/MO current selected output mismatch');
    let components, selection, outcome, guideFile, completion;
    if (c.mi) {
      assert.deepEqual(c.json(inputFile), input, 'MI stored fixture differs from its actual generator input');
      const elected = validateInput(family.familyId, input), history = assessPriorApplications(input);
      const detail = c.json(`${out}/reports/${artifact.fixture}-render.json`);
      assert.equal(detail.artifactSha256, artifact.sha256);
      assert.equal(detail.pageCount, artifact.pageCount);
      assert.deepEqual(detail.historyTreatment, history);
      assert.deepEqual(artifact.historyTreatment, history);
      assert.equal(detail.fieldLedger.length, 106);
      assert.equal(history.permissionToReapply, false);
      assert.equal(artifact.fileable, false);
      assert.equal(artifact.executionComplete, false);
      guideFile = `${out}/${artifact.fixture}-next-steps.md`;
      assert.equal(c.get(guideFile).toString(), nextSteps(input, artifact.fixture), 'MI delivered guide differs from actual invoking text path');
      components = artifact.componentCoverage.map(item => ({ documentId: item.role === 'conditional_additional_sheet' ? 'MC227-continuation' : 'MC227', role: item.role,
        firstPage: item.outputPages[0], pageCount: item.outputPages.length, sourcePages: item.sourcePages ?? null }));
      assert.deepEqual(components.slice(0, 3).map(item => [item.role, item.firstPage, item.pageCount]), [['application', 1, 2], ['hearing_notice_and_service', 3, 1], ['official_instructions', 4, 1]]);
      assert.equal(components.reduce((sum, item) => sum + item.pageCount, 0), artifact.pageCount);
      selection = { item2: elected, prosecution: input.prosecution, court: input.court.key, historyTreatment: history };
      outcome = history.status === 'NO_PRIOR_LISTED_APPLICATION_HANDOFF_IDENTIFIED' ? 'PREPARED_PACKET_EXAMPLE' : 'PREPARATION_ONLY_ATTORNEY_REVIEW';
      completion = { fieldAccounting: { sourceFields: 106, classifications: Object.fromEntries([...new Set(detail.fieldLedger.map(item => item.disposition))].map(kind => [kind, detail.fieldLedger.filter(item => item.disposition === kind).length])) },
        requiredBeforeFiling: detail.fieldLedger.filter(item => item.disposition === 'REQUIRED_BEFORE_FILING').map(item => ({ field: item.name, label: item.label, basis: item.basis })),
        protectedFields: detail.fieldLedger.filter(item => item.disposition === 'PROTECTED_FIELD').map(item => ({ field: item.name, reason: item.basis })),
        missingAttachments: artifact.missingAttachments };
    } else {
      const facts = importFacts(input), automatic = facts.route === 'automatic-on-notice';
      const expected = automatic ? ['instructions'] : ['CR301', ...(needsConfidentialSheet(facts) ? ['FI-05'] : []), ...(facts.proposedOrderRequested ? ['CR311'] : []), 'instructions'];
      assert.deepEqual(artifact.pageManifest.map(item => item.component), expected, 'MO actor/component election differs from actual invoking path');
      const manifest = packetManifest.variants.find(item => item.id === artifact.fixture);
      assert(manifest);
      assert.equal(`${out}/${manifest.packet}`, artifact.file);
      assert.equal(manifest.sha256, artifact.sha256);
      assert.equal(manifest.pages, artifact.pageCount);
      assert.deepEqual(manifest.components, artifact.pageManifest);
      let nextPage = 1;
      components = artifact.pageManifest.map(item => {
        assert.equal(item.firstPage, nextPage); assert.equal(item.lastPage, item.firstPage + item.pages - 1); nextPage += item.pages;
        return { documentId: item.component, role: { CR301: 'primary_filing', 'FI-05': 'confidential_cover_sheet', CR311: 'proposed_order', instructions: automatic ? 'automatic_status_guidance' : 'filing_and_service_instructions' }[item.component], firstPage: item.firstPage, pageCount: item.pages };
      });
      assert.equal(nextPage - 1, artifact.pageCount);
      guideFile = `${out}/instructions/${artifact.fixture}.md`;
      const generatedText = instructionPages(facts).map(section => `# ${section.title}\n\n${section.paragraphs.join('\n\n')}`).join('\n\n');
      assert(c.get(guideFile).toString().startsWith(generatedText), 'MO delivered guide lost actual generator paragraphs');
      const declaration = missing.variants.find(item => item.fixture === artifact.fixture);
      assert(declaration);
      assert.equal(`${out}/${declaration.guide}`, guideFile);
      const items = missing.items.filter(item => item.fixture === artifact.fixture);
      assert.equal(items.length, declaration.missingCount, 'MO qualified missing-information count mismatch');
      const listFile = `${out}/${declaration.list}`;
      completion = { requiredBeforeFiling: items, list: { file: listFile, sha256: sha(c.get(listFile)), missingCount: items.length },
        protectedActorActionsCompleted: false };
      selection = { route: facts.route, opensNewCase: facts.opensNewCase, confidentialSheetRequired: facts.confidentialSheetRequired ?? null,
        proposedOrderRequested: facts.proposedOrderRequested, includedCourtForms: expected.filter(item => item !== 'instructions') };
      outcome = automatic ? 'AUTOMATIC_STATUS_GUIDANCE' : 'PREPARED_PACKET_EXAMPLE';
    }
    const routeKey = c.mi ? c.spec.routes[0] : input.route === 'automatic-on-notice' ? MO_AUTO : MO_PETITION;
    return { fixture: artifact.fixture, routeKey, file: artifact.file, sha256: artifact.sha256, byteLength: c.get(artifact.file).length, pageCount: artifact.pageCount,
      components, guide: { file: guideFile, sha256: sha(c.get(guideFile)), delivery: c.mi ? 'separate_markdown' : 'included_pdf_instructions_and_complete_markdown' },
      input: { file: inputFile, sourceFileSha256: sha(c.get(inputFile)), factSnapshotSha256: factsSha(input) },
      selection, expectedOutcome: outcome, completion, syntheticFixture: true, filingPermitted: false,
      participantExecutionCompleted: false, grantsEligibility: false, grantsDeliveryAuthority: false, paymentEligible: false, sponsorshipEligible: false,
      ...(outcome === 'AUTOMATIC_STATUS_GUIDANCE' ? { paymentGate: null, sponsorshipGate: null, requiredCourtForms: [] } : {}) };
  });
  return { familyId: family.familyId, directory: out, routeKeys: c.spec.routes, fixtureRoot: c.mi ? `${out}/fixtures` : out,
    sourceBindings: c.sources, sourceReceipt: { file: c.receiptPath, sha256: sha(c.get(c.receiptPath)) },
    independentReview: { file: REVIEW, sha256: REVIEW_SHA, publicationCommit: c.accepted.packetPublicationCommit },
    reviewInputBinding: { file: GUARD, sha256: GUARD_SHA, measuredRelevantFiles: c.memberCount },
    outputInventory: { file: c.reportPath, sha256: sha(c.get(c.reportPath)), documents: fixtures.length, pages: fixtures.reduce((sum, item) => sum + item.pageCount, 0) },
    anchors: structuredClone(c.accepted.anchors), fixtures };
}

function declaredOnly(record, family) {
  checkedFamily(family);
  assert.equal(record.family, family.familyId); assert.equal(record.status, 'DECLARED_NOT_INSTALLED');
  assert.equal(record.authorityCreated, 'none'); assert.equal(record.currentState.generationAllowed, false);
  assert.notEqual(record.runtimeInstalled, true); assert.notEqual(record.currentState.runtimeSelectable, true);
  assert.notEqual(record.binding.runtimeInstalled, true); assert.notEqual(record.binding.generationAllowed, true);
  assert.equal(record.binding.paymentEligible, false); assert.equal(record.binding.sponsorshipEligible, false);
  for (const routes of [record.routeKeys, record.binding.routeKeys]) assert.deepEqual([...routes].sort(), [...family.routeKeys].sort(), 'MI/MO declared route scope mismatch');
}

export function bindDeclaredMiMoDelivery(record, family, options = {}) {
  if (!isMiMoDeclaredFamily(family.familyId)) return record;
  declaredOnly(record, family);
  const matrix = miMoCandidateMatrix(family, options), result = structuredClone(record);
  result.runtimeInstalled = false; result.currentState.runtimeSelectable = false;
  Object.assign(result.binding, { runtimeInstalled: false, generationAllowed: false, filingPermitted: false,
    conditionalDelivery: { ...matrix, fixtureBindings: matrix.fixtures, explicitSelectionRequired: true, defaultBranch: null, runtimeInstalled: false,
      selectionContract: `${SELF}#selectDeclaredMiMoFixture`,
      note: 'Exact retained synthetic examples only. Every selected route uses its own full PDF, facts, component elections and complete guide. Actual participant generation, current verification, entitlement and private delivery are separate; no later actor action is fabricated.' }, acceptanceReceipt: null });
  delete result.binding.conditionalDelivery.fixtures;
  result.binding.packetComponents = [...new Set(matrix.fixtures.flatMap(item => item.components.map(component => component.documentId)))];
  result.binding.componentConditions = family.familyId === MO_ID ? { CR301: 'petition route only', 'FI-05': 'petition and (opensNewCase or receiving-clerk requirement)', CR311: 'petition and court-requested proposed order', automaticGuidance: 'automatic-on-notice route: no court forms, payment gate or sponsorship gate' } : { 'MC227-continuation': 'only where actual repeating data exceed source rows' };
  Object.assign(result.proposedRepresentation, { note: result.binding.conditionalDelivery.note, runtimeSelectable: false, generationAllowed: false, defaultComponentId: null,
    fixtureBindings: matrix.fixtures, components: matrix.fixtures.map((item, index) => ({ componentId: `${family.familyId}:${item.fixture}`, role: item.expectedOutcome === 'AUTOMATIC_STATUS_GUIDANCE' ? 'conditional_guidance_output' : 'conditional_assembled_packet',
      order: index + 1, documentId: item.fixture, file: item.file, sha256: item.sha256, requirement: 'conditional', selectedBy: item.fixture, routeKey: item.routeKey,
      componentsIncluded: item.components.map(component => component.documentId), guide: item.guide, syntheticFixture: true, grantsDeliveryAuthority: false })) });
  if (options.raster) {
    // The existing trusted caller must first authenticate/admit this central
    // receipt. This comparison checks only its exact candidate coverage.
    const raster = options.raster, pass = raster.rasterReceipt;
    assert.equal(raster.familyId, family.familyId); assert.equal(pass?.verdict, 'RASTER_PASS');
    assert.equal(pass.coversTheWholeFamily, true); assert.equal(pass.documentsMeasured, matrix.fixtures.length);
    assert.equal(pass.pagesMeasured, matrix.outputInventory.pages); assert.deepEqual(pass.documentsNotCovered, []);
    assert.deepEqual([...pass.documentsCovered].sort(), matrix.fixtures.map(item => path.posix.relative(matrix.fixtureRoot, item.file)).sort());
    assert.equal(raster.documents.length, matrix.fixtures.length);
    for (const item of matrix.fixtures) {
      const matches = raster.documents.filter(document => document.path === item.file); assert.equal(matches.length, 1);
      assert.equal(matches[0].sha256, item.sha256); assert.equal(matches[0].pageCount, item.pageCount);
    }
    assert.equal(pass.boundToCanonicalSha256, matrix.anchors.canonical.centralAndInventorySha256);
    assert.equal(pass.boundToBoundarySha256, matrix.anchors.boundary.centralAndInventorySha256);
    result.binding.acceptanceReceipt = { verdict: pass.verdict, workflowRunId: pass.workflowRunId, jobId: pass.jobId,
      artifactId: pass.receiptArtifact?.id ?? null, verdictPath: pass.verdictPath, boundToCanonicalSha256: pass.boundToCanonicalSha256,
      boundToBoundarySha256: pass.boundToBoundarySha256, coversTheWholeFamily: true, documentsMeasured: pass.documentsMeasured,
      pagesMeasured: pass.pagesMeasured, documentsCovered: [...pass.documentsCovered], documentsDigest: pass.documentsDigest };
  }
  return result;
}

export function createDeclaredMiMoDelivery(family, binding, options = {}) {
  if (!isMiMoDeclaredFamily(family.familyId)) return null;
  return bindDeclaredMiMoDelivery({ schemaVersion: 'rcap-census-v1-product-wiring/v1', family: family.familyId,
    routeKey: family.routeKeys.length === 1 ? family.routeKeys[0] : null, routeKeys: [...family.routeKeys], workType: 'PRODUCT_WIRING_REQUIRED',
    status: 'DECLARED_NOT_INSTALLED', authorityCreated: 'none', generatedBy: 'scripts/grade-a-packet-factory-24h/generate-product-wiring.mjs',
    derivedFrom: `${family.directory}/reports/rendered-artifacts.json`, explicitNonGrants: ['No live route, fulfillment record, entitlement, payment, sponsorship, generation or delivery authority is created.'],
    currentState: { serviceDisposition: 'missing_from_compiled_runtime', commercialState: 'NO_ROUTE_LEVEL_GRADE_A_AUTHORITY_FROM_TRACK_MEMBERSHIP', existingArtifactIds: [], generationAllowed: false },
    binding, proposedRepresentation: { packetSetId: family.familyId, outputStrategy: family.implementationStrategy, components: [] } }, family, options);
}

export function selectDeclaredMiMoFixture(record, input, fixture, options = {}) {
  const spec = SPECS[record.family]; assert(spec, 'Unsupported MI/MO family');
  const family = { familyId: record.family, directory: spec.directory, routeKeys: spec.routes };
  declaredOnly(record, family); assert.equal(input?.synthetic, true, 'PARTICIPANT_RENDER_REQUIRED');
  if (MI_IDS.includes(record.family)) validateInput(record.family, input); else importFacts(input);
  const rebound = bindDeclaredMiMoDelivery(record, family, options);
  assert.deepEqual(record.binding.conditionalDelivery, rebound.binding.conditionalDelivery, 'MI/MO declared binding changed or is stale');
  const matches = rebound.binding.conditionalDelivery.fixtureBindings.filter(item => item.fixture === fixture);
  assert.equal(matches.length, 1, 'EXPLICIT_SUPPORTED_FIXTURE_REQUIRED');
  assert.equal(factsSha(input), matches[0].input.factSnapshotSha256, 'FIXTURE_INPUT_MISMATCH_PARTICIPANT_RENDER_REQUIRED');
  return { ...structuredClone(matches[0]), runtimeInstalled: false };
}

/** Existing raster queue integration point: the same matrix supplies exact
 * primary anchors and every selected whole output. No filename inference,
 * packet copy, renderer run, source substitution or new variant is involved. */
export async function resolveMiMoRasterEnrollment(family, options = {}) {
  if (!isMiMoDeclaredFamily(family.familyId)) return null;
  const matrix = miMoCandidateMatrix(family, options), read = options.readFile ?? safeRead;
  const documents = [];
  for (const fixture of matrix.fixtures) {
    const bytes = read(fixture.file), parsed = (await PDFDocument.load(bytes, { updateMetadata: false })).getPageCount();
    assert.equal(parsed, fixture.pageCount, 'MI/MO selected PDF page-count drift');
    documents.push({ role: fixture.fixture === 'boundary' || fixture.fixture.startsWith('boundary.') ? 'boundary' : 'canonical',
      name: path.posix.relative(matrix.fixtureRoot, fixture.file), path: fixture.file, sha256: fixture.sha256,
      conditionalPacketBranch: fixture.fixture, pageCount: parsed, pageCountEvidence: { method: 'pdf-lib', version: '1.17.1', pageCount: parsed, sourceSha256: fixture.sha256 },
      pageCountBasis: 'Parsed from the exact reviewed selected whole-output bytes.' });
  }
  documents.sort((a, b) => (a.role === 'canonical' ? 0 : 1) - (b.role === 'canonical' ? 0 : 1) || a.name.localeCompare(b.name, 'en'));
  const names = documents.map(item => item.name);
  const fixtureSelection = Object.fromEntries(['canonical', 'boundary'].map(role => {
    const anchor = matrix.anchors[role]; assert(documents.some(item => item.path === anchor.file && item.sha256 === anchor.centralAndInventorySha256));
    return [role, { name: path.posix.relative(matrix.fixtureRoot, anchor.file), basis: 'Exact independently reviewed selected whole-output anchor', why: null }];
  }));
  return { root: path.join(ROOT, matrix.fixtureRoot), pdfs: names, basis: 'Every actual selected output in the exact independently reviewed MI/MO candidate',
    ...fixtureSelection, documents, documentsDigest: sha(Buffer.from(JSON.stringify(documents.map(item => [item.role, item.path, item.sha256])))),
    coverage: { documents: names, rastered: names, notRastered: [], notRenderedByThisGate: [], complete: true,
      basis: 'Requested coverage includes every declared selected complete PDF and both fixture roles; this enrollment is not an executed raster verdict.',
      whatCompleteMeansHere: 'All selected packet and automatic-guidance outputs are included. No completed central render is asserted by this declaration.' } };
}
