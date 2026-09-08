// Describe the retained GA outputs without turning diagnostic examples into
// filing-positive selections or creating runtime authority.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { conditionalPacketDocuments } from './conditional-raster-documents.mjs';
import { FAMILY, ROUTE, OUT, SOURCE, SOURCE_SHA, fixtures, validateGa, guideFor } from '../rcap-packet-recovery/chat5/ga-pre2013.mjs';

export const GA_FAMILY = FAMILY;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const parsed = file => JSON.parse(read(file));

export function bindDeclaredGaDelivery(record, family, options = {}) {
  if (family.familyId !== FAMILY) return record;
  assert.equal(family.directory, OUT);
  assert.deepEqual(family.routeKeys, [ROUTE]);
  assert.equal(record.family, FAMILY);
  assert.equal(record.status, 'DECLARED_NOT_INSTALLED');
  assert.equal(record.authorityCreated, 'none');
  assert.equal(record.currentState.generationAllowed, false);
  assert.notEqual(record.runtimeInstalled, true);
  assert.notEqual(record.currentState.runtimeSelectable, true);
  assert.notEqual(record.binding.runtimeInstalled, true);
  assert.notEqual(record.binding.generationAllowed, true);
  assert.notEqual(record.binding.filingPermitted, true);
  assert.equal(record.binding.paymentEligible, false);
  assert.equal(record.binding.sponsorshipEligible, false);
  for (const routes of [record.routeKeys, record.binding.routeKeys]) assert.deepEqual(routes, [ROUTE]);
  assert.equal(sha(read(SOURCE)), SOURCE_SHA, 'GA source drift');
  const report = parsed(`${OUT}/reports/rendered-artifacts.json`);
  if (options.report) assert.deepEqual(options.report, report, 'GA supplied report drift');
  const declared = conditionalPacketDocuments({ report, fixtures: path.join(ROOT, OUT, 'fixtures'), root: ROOT });
  const bindings = declared.map(document => {
    const fixture = document.branch;
    const inputFile = `${OUT}/fixtures/${fixture}.facts.json`;
    const input = parsed(inputFile), validation = validateGa(input);
    assert.equal(input.sample, true, 'GA retained outputs are synthetic');
    const artifact = report.artifacts.find(d => d.fixture === fixture);
    const reportFile = `${OUT}/reports/${fixture}.json`, measured = parsed(reportFile);
    assert.equal(measured.fixture, fixture);
    assert.equal(measured.familyId, FAMILY);
    assert.equal(measured.inputSha256, sha(read(inputFile)), 'GA fixture report/input mismatch');
    assert.equal(measured.sourceSha256, SOURCE_SHA);
    assert.deepEqual(measured.output, { path: artifact.path, sha256: artifact.sha256, byteLength: artifact.byteLength, pageCount: artifact.pageCount });
    assert.deepEqual(artifact.documents, measured.componentPages.map(p => p.documentId), 'GA declaration omitted or changed an included component');
    assert.deepEqual(measured.guide, guideFor(validation), 'GA fixture guide differs from reviewed builder');
    assert.equal(measured.readyToSubmit, false);
    return { fixture, routeKey: ROUTE, file: `${OUT}/${artifact.path}`, sha256: artifact.sha256,
      byteLength: artifact.byteLength, pageCount: artifact.pageCount, components: artifact.documents,
      input: { file: inputFile, sha256: sha(read(inputFile)), facts: input },
      guide: { file: reportFile, sha256: sha(read(reportFile)), delivery: 'included_complete_pdf_instructions', sections: measured.guide.map(g => g.title) },
      selectionKind: document.selectionKind, requiredBeforeFiling: validation.missing,
      filingReady: false, syntheticFixture: true, grantsDeliveryAuthority: false };
  });
  assert.equal(bindings.length, 15);
  assert.equal(bindings.reduce((n, d) => n + d.pageCount, 0), 108);
  const result = structuredClone(record);
  result.runtimeInstalled = false;
  result.currentState.runtimeSelectable = false;
  Object.assign(result.binding, { runtimeInstalled: false, generationAllowed: false, filingPermitted: false, acceptanceReceipt: null });
  result.binding.conditionalDelivery = { fixtureBindings: bindings,
    outputInventory: { documents: 15, pages: 108, diagnosticDocuments: 3, conditionalExamples: 12 },
    explicitSelectionRequired: true, defaultBranch: null, runtimeInstalled: false,
    diagnosticsAreNotPositiveFixtures: true, source: { file: SOURCE, sha256: SOURCE_SHA },
    note: 'Exact synthetic complete outputs. Diagnostic canonical, boundary and missing-facts packets are not filing-positive selections. Every conditional example requires private SSN completion; selected attachment requirements remain unresolved until the actual document is attached.' };
  result.binding.packetComponents = [...new Set(bindings.flatMap(d => d.components))];
  Object.assign(result.proposedRepresentation, { note: result.binding.conditionalDelivery.note,
    runtimeSelectable: false, generationAllowed: false, defaultComponentId: null,
    fixtureBindings: bindings, components: bindings.map((d, i) => ({ componentId: `${FAMILY}:${d.fixture}`,
      role: d.selectionKind === 'diagnostic' ? 'diagnostic_output' : 'conditional_assembled_packet',
      order: i + 1, documentId: d.fixture, file: d.file, sha256: d.sha256,
      requirement: d.selectionKind === 'diagnostic' ? 'diagnostic_only' : 'conditional',
      selectedBy: d.fixture, componentsIncluded: d.components, guide: d.guide,
      syntheticFixture: true, filingReady: false, grantsDeliveryAuthority: false })) });
  if (options.raster) {
    const raster = options.raster, pass = raster.rasterReceipt;
    assert.equal(raster.familyId, FAMILY);
    assert.equal(pass?.verdict, 'RASTER_PASS');
    assert.equal(pass.coversTheWholeFamily, true);
    assert.equal(pass.documentsMeasured, 15); assert.equal(pass.pagesMeasured, 108);
    assert.deepEqual(pass.documentsNotCovered, []);
    assert.deepEqual([...pass.documentsCovered].sort(), bindings.map(d => `${d.fixture}.pdf`).sort());
    assert.equal(raster.documents.length, 15);
    for (const d of bindings) {
      const found = raster.documents.filter(p => p.path === d.file); assert.equal(found.length, 1);
      assert.equal(found[0].sha256, d.sha256); assert.equal(found[0].pageCount, d.pageCount);
      assert.equal(found[0].selectionKind, d.selectionKind); assert.equal(found[0].filingReady, false);
      assert.deepEqual(found[0].requiredBeforeFiling, d.requiredBeforeFiling.map(m => m.fieldId));
    }
    for (const primary of ['canonical', 'boundary']) assert.equal(pass[`boundTo${primary[0].toUpperCase()+primary.slice(1)}Sha256`], bindings.find(d => d.fixture === primary).sha256);
    result.binding.acceptanceReceipt = { verdict: pass.verdict, workflowRunId: pass.workflowRunId,
      jobId: pass.jobId, artifactId: pass.receiptArtifact.id, verdictPath: pass.verdictPath,
      boundToCanonicalSha256: pass.boundToCanonicalSha256, boundToBoundarySha256: pass.boundToBoundarySha256,
      coversTheWholeFamily: true, documentsMeasured: 15, pagesMeasured: 108,
      documentsCovered: [...pass.documentsCovered], documentsDigest: pass.documentsDigest };
  }
  return result;
}

// Nonproduction evidence selector; no canned sample is a participant render.
export function selectDeclaredGaFixture(record, input, fixture, options = {}) {
  assert.equal(input?.sample, true, 'PARTICIPANT_RENDER_REQUIRED');
  assert.ok(typeof fixture === 'string' && Object.hasOwn(fixtures(), fixture), 'EXPLICIT_SUPPORTED_FIXTURE_REQUIRED');
  const bound = bindDeclaredGaDelivery(record, { familyId: FAMILY, directory: OUT, routeKeys: [ROUTE] }, options);
  assert.deepEqual(record.binding.conditionalDelivery, bound.binding.conditionalDelivery, 'GA declared binding is stale');
  assert.deepEqual(record.proposedRepresentation, bound.proposedRepresentation, 'GA declared components changed');
  const selected = bound.binding.conditionalDelivery.fixtureBindings.find(d => d.fixture === fixture);
  assert.equal(selected.selectionKind, 'conditional_packet_example', 'DIAGNOSTIC_IS_NOT_A_POSITIVE_SELECTION');
  assert.deepEqual(input, selected.input.facts, 'EXACT_SYNTHETIC_FIXTURE_FACTS_REQUIRED');
  return structuredClone(selected);
}
