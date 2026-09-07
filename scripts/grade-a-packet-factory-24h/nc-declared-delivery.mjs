import assert from 'node:assert/strict';
import { selectNc146Components, NC_BRANCH_FIXTURES } from '../rcap-packet-recovery/nc-146-indigency.mjs';

export const NC_FAMILY = 'nc_146_dismissal_petition-set';
export const NC_ROUTE = 'obligation:track-only:NC:nc_146_dismissal_petition';
const pageSizes = { petition: 2, instructions: 1, fee_waiver: 2, supplemental_financial_affidavit: 2, participant_guide: 1 };
const sha = value => assert.match(value, /^[0-9a-f]{64}$/, 'Invalid whole-PDF digest');

// Describe the branches the packet builder already produced. Reuse its selector;
// this is not another eligibility engine, a renderer, or a delivery entitlement.
export function bindDeclaredNcDelivery(record, family, { report, hashFile, raster }) {
  if (family.familyId !== NC_FAMILY) return record;
  assert.equal(record.family, NC_FAMILY);
  assert.equal(report.familyId, NC_FAMILY);
  for (const routes of [family.routeKeys, record.routeKeys, record.binding.routeKeys])
    assert.deepEqual(routes, [NC_ROUTE], 'NC route scope changed');
  assert.equal(record.status, 'DECLARED_NOT_INSTALLED');
  assert.equal(record.authorityCreated, 'none');
  assert.equal(record.currentState.generationAllowed, false);
  assert.equal(record.binding.paymentEligible, false);
  assert.equal(record.binding.sponsorshipEligible, false);
  assert.deepEqual(report.componentSet, Object.keys(pageSizes));
  assert.equal(report.pdfs.length, 10, 'Expected two diagnostics and eight selectable complete PDFs');
  const byFixture = new Map(report.pdfs.map(d => [d.fixture, d]));
  assert.equal(byFixture.size, 10, 'Duplicate fixture');
  const fixtureBindings = [], diagnostics = [];
  for (const fixture of ['canonical', 'boundary']) {
    const diagnostic = byFixture.get(fixture);
    assert.ok(diagnostic, 'Missing diagnostic fixture');
    assert.equal(diagnostic.file, `${family.directory}/fixtures/${fixture}.pdf`);
    assert.equal(diagnostic.pageCount, 8);
    sha(diagnostic.sha256);
    assert.equal(hashFile(diagnostic.file), diagnostic.sha256, 'Diagnostic digest mismatch');
    diagnostics.push({fixture, file: diagnostic.file, sha256: diagnostic.sha256, pageCount: 8, deliverable: false, role: 'diagnostic_only'});
    for (const [branch, selection] of Object.entries(NC_BRANCH_FIXTURES)) {
      const d = byFixture.get(`${fixture}-${branch}`);
      assert.ok(d, `Missing ${fixture}/${branch}`);
      assert.equal(d.baseFixture, fixture);
      assert.equal(d.branch, branch);
      assert.equal(d.file, `${family.directory}/fixtures/branches/${fixture}-${branch}.pdf`);
      const selected = selectNc146Components(d.selection);
      assert.deepEqual(selected, selectNc146Components(selection), 'Fixture selection differs from the existing branch contract');
      assert.deepEqual(d.selectionResult, selected);
      assert.deepEqual(d.components, selected.components);
      const expectedPages = selected.components.flatMap(component => Array.from({length: pageSizes[component]}, (_, i) => ({component, sourcePage: i + 1})));
      assert.equal(d.pageCount, expectedPages.length, 'Wrong page count');
      assert.deepEqual(d.pageManifest, expectedPages.map((p, i) => ({packetPage: i + 1, ...p})), 'Wrong component order or source page');
      assert.equal(d.syntheticFixture, true, 'Example fixtures are not participant output');
      sha(d.sha256);
      assert.equal(hashFile(d.file), d.sha256, 'Selectable output digest mismatch');
      fixtureBindings.push({fixture, branch, file: d.file, sha256: d.sha256, pageCount: d.pageCount, components: d.components,
        legalReviewRequired: selected.legalReviewRequired, syntheticFixture: true, grantsDeliveryAuthority: false});
    }
  }
  const result = structuredClone(record);
  result.binding.packetComponents = [...report.componentSet];
  result.binding.componentConditions = structuredClone(report.componentConditions);
  result.binding.filingPermitted = false;
  result.binding.conditionalDelivery = {
    selectionContract: 'scripts/rcap-packet-recovery/nc-146-indigency.mjs#selectNc146Components',
    explicitSelectionRequired: true, defaultBranch: null,
    branches: Object.keys(NC_BRANCH_FIXTURES),
    fixtureBindings,
    diagnosticArtifactsExcluded: true,
    note: 'These are synthetic validation fixtures, not documents to file for a participant. Existing legal-review stops, final verification and delivery authority remain required.'
  };
  result.proposedRepresentation.note = 'Four explicit packet selections, each bound to canonical and boundary validation evidence. The all-components diagnostics are never the default filing. This declaration installs no runtime and grants no approval.';
  result.proposedRepresentation.components = fixtureBindings.filter(d => d.fixture === 'canonical').map((d, i) => ({
    componentId: `${NC_FAMILY}-${d.branch}`, role: 'conditional_assembled_packet', order: i + 1,
    documentId: d.branch, file: d.file, sha256: d.sha256, requirement: 'conditional',
    selectedBy: d.branch, componentsIncluded: d.components, legalReviewRequired: d.legalReviewRequired
  }));
  result.proposedRepresentation.fixtureBindings = fixtureBindings;
  result.proposedRepresentation.diagnosticArtifacts = diagnostics;
  result.proposedRepresentation.defaultComponentId = null;
  // The caller supplies only an already-admitted, currently rehashed receipt.
  // Check its full inventory here as well; an old two-PDF pass is insufficient.
  result.binding.acceptanceReceipt = null;
  if (raster) {
    const receipt = raster.rasterReceipt;
    assert.equal(raster.familyId, NC_FAMILY);
    assert.equal(receipt.verdict, 'RASTER_PASS');
    assert.equal(receipt.coversTheWholeFamily, true);
    assert.equal(receipt.documentsMeasured, 10);
    assert.equal(receipt.pagesMeasured, 60);
    assert.deepEqual(receipt.documentsNotCovered, []);
    const expected = report.pdfs.map(d => d.file.slice(`${family.directory}/fixtures/`.length)).sort();
    assert.deepEqual([...receipt.documentsCovered].sort(), expected);
    assert.equal(raster.documents.length, 10);
    for (const d of report.pdfs) {
      const matches = raster.documents.filter(p => p.path === d.file);
      assert.equal(matches.length, 1);
      assert.equal(matches[0].sha256, d.sha256);
      assert.equal(matches[0].pageCount, d.pageCount);
    }
    assert.equal(receipt.boundToCanonicalSha256, byFixture.get('canonical').sha256);
    assert.equal(receipt.boundToBoundarySha256, byFixture.get('boundary').sha256);
    result.binding.acceptanceReceipt = {
      verdict: receipt.verdict, workflowRunId: receipt.workflowRunId, jobId: receipt.jobId,
      artifactId: receipt.receiptArtifact.id, verdictPath: receipt.verdictPath,
      boundToCanonicalSha256: receipt.boundToCanonicalSha256, boundToBoundarySha256: receipt.boundToBoundarySha256,
      coversTheWholeFamily: true, documentsMeasured: 10, pagesMeasured: 60,
      documentsCovered: [...receipt.documentsCovered], documentsDigest: receipt.documentsDigest
    };
  }
  return result;
}

// Synthetic nonproduction branch exercise only. No entitlement or file delivery.
export function selectDeclaredNcFixture(record, selection, fixture) {
  assert.equal(record.family, NC_FAMILY);
  assert.ok(['canonical', 'boundary'].includes(fixture));
  const selected = selectNc146Components(selection);
  const entries = record.binding.conditionalDelivery.fixtureBindings.filter(d => d.fixture === fixture && d.branch === selected.branch);
  assert.equal(entries.length, 1, 'No unique bound branch');
  assert.deepEqual(entries[0].components, selected.components);
  return {...structuredClone(entries[0]), grantsEligibility: false, grantsDeliveryAuthority: false};
}
