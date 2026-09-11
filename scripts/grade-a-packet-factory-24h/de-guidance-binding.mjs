import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export function pdfPageCount(bytes) {
  const info = execFileSync('pdfinfo', ['-'], { input: bytes, encoding: 'utf8' });
  const pages = Number(info.match(/^Pages:\s+(\d+)$/m)?.[1]);
  assert.ok(Number.isInteger(pages) && pages > 0, 'PDF page count could not be parsed');
  return pages;
}
export const DE_FAMILY = 'de_mandatory_expungement-set';
export const DE_ROUTE = 'obligation:track-pathway:DE:de_mandatory_expungement:mandatory-and-automatic-expungement-under-11-del-c-4373-and-4373a';
export const DE_DIRECTORY = 'data/rcap-all50/overlays/census-v1/de/de-mandatory-expungement-set--official-pdf-fill';
export const DE_DECISION = 'data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json';
export const DE_DECISION_ID = 'DE-MANDATORY-SBI-ADMINISTRATIVE-PATHWAY';
export const DE_DECISION_SHA256 = '5e3b6fb6bdeff849949d1d2c44d9b4e7badfdf6e7ba38be6135c388df176b1f2';

// This corrects an existing declared deliverable; it does not infer that all
// agency routes are guidance or approve this guide's legal contents.
export function bindDeclaredDeGuidance(record, family, { report, receipt, instructions, hashFile, pageCountFile }) {
  if (family.familyId !== DE_FAMILY) return record;
  assert.equal(record.family, DE_FAMILY, 'Wrong wiring family');
  for (const routes of [family.routeKeys, record.routeKeys, receipt.routeKeys])
    assert.deepEqual(routes, [DE_ROUTE], 'Guidance correction cannot change route scope');
  assert.equal(report.familyId, DE_FAMILY);
  assert.equal(receipt.familyId, DE_FAMILY);
  assert.deepEqual(report.componentSet, ['agency_preparation_guide']);
  assert.deepEqual(receipt.composedComponentsAuthoredByThisBuild, ['agency_preparation_guide']);
  assert.equal(receipt.sourceBinaryCommitted, false);
  assert.match(receipt.formIdentityNote, /output is process guidance, not an official application/);
  assert.match(instructions, /There is no checkout and nothing to file from this guide/);
  assert.match(instructions, /Do not submit it to a court or agency/);
  assert.equal(record.status, 'DECLARED_NOT_INSTALLED', 'Do not rewrite an installed delivery contract');
  assert.equal(record.authorityCreated, 'none');
  assert.equal(record.currentState.generationAllowed, false);
  assert.equal(record.binding.paymentEligible, false);
  assert.equal(record.binding.sponsorshipEligible, false);
  const docs = report.pdfs;
  assert.equal(docs.length, 2, 'Guidance inventory is not the expected two complete outputs');
  for (const fixture of ['canonical', 'boundary']) {
    const matched = docs.filter(d => d.fixture === fixture);
    assert.equal(matched.length, 1, 'Missing or duplicate fixture');
    const d = matched[0];
    assert.equal(d.file, `${family.directory}/fixtures/${fixture}.pdf`);
    // Pagination belongs to the current PDF and its complete component manifest,
    // not the page count of a historical independent review.
    assert.equal(d.pageCount, pageCountFile(d.file), 'Current PDF page count mismatch');
    const artifacts = report.artifacts.filter(a => a.fixture === fixture);
    assert.equal(artifacts.length, 1, 'Missing or duplicate component inventory');
    const a = artifacts[0];
    for (const key of ['file', 'sha256', 'pageCount', 'byteLength'])
      assert.equal(a[key], d[key], `Component inventory ${key} mismatch`);
    assert.deepEqual(a.components, ['agency_preparation_guide']);
    assert.deepEqual(a.documents, ['agency_preparation_guide']);
    assert.deepEqual(a.pageManifest.map(p => [p.packetPage, p.component, p.documentId, p.sourcePage]),
      Array.from({length: d.pageCount}, (_, i) => [i + 1, 'agency_preparation_guide', 'agency_preparation_guide', i + 1]),
      'Every current page must belong to the declared guidance component');
    assert.match(d.sha256, /^[a-f0-9]{64}$/);
    assert.equal(hashFile(d.file), d.sha256, 'Current output hash mismatch');
  }
  const canonical = docs.find(d => d.fixture === 'canonical');
  const result = structuredClone(record);
  result.binding.deliveryType = 'process_guidance';
  result.binding.instrumentKinds = ['no filing — process guidance'];
  result.binding.packetComponents = ['agency_preparation_guide'];
  result.binding.filingPermitted = false;
  result.binding.deliveryBoundary = 'Preparation guidance only; do not file it with SBI or a court. SBI supplies its own subsequent paperwork.';
  // A historical pass is not a current approval while review is pending.
  if (!['GUIDANCE_READY', 'COMPLETE_PACKET_PROVEN'].includes(family.state)) {
    const prior = result.binding.lastIndependentVerification;
    if (prior) result.binding.historicalIndependentVerification = prior;
    result.binding.lastIndependentVerification = null;
    result.binding.independentReviewStatus = 'CURRENT_REVIEW_PENDING';
  }
  result.proposedRepresentation.outputStrategy = 'process_guidance';
  result.proposedRepresentation.note = 'Declaration of the existing non-filed preparation guide. This metadata correction is not installed runtime fulfillment, independent content approval, eligibility or commercial authority.';
  result.proposedRepresentation.components = [{
    componentId: `${DE_FAMILY}-component-1`, role: 'participant_guide', order: 1,
    documentId: 'agency_preparation_guide', file: canonical.file,
    sha256: canonical.sha256, requirement: 'required'
  }];
  result.proposedRepresentation.fixtureBindings = docs.map(d => ({
    fixture: d.fixture, file: d.file, sha256: d.sha256, pageCount: d.pageCount
  }));
  result.deliveryCorrectionBasis = {
    sourceReceipt: `${family.directory}/source-receipt.json`,
    instructions: `${family.directory}/participant-instructions.md`,
    renderedArtifacts: `${family.directory}/reports/rendered-artifacts.json`,
    rule: 'Honor the existing exact-route guidance declaration rather than the legacy agency-application label.',
    createsApproval: false, opensCheckout: false
  };
  return result;
}

/** Apply the already-declared guidance identity to the queue inputs. This is a
 * metadata normalization only; every non-component source obligation survives. */
export function normalizeDeclaredDeGuidanceBuildInputs(root, input) {
  if (input.familyId !== DE_FAMILY) return input;
  assert.equal(input.legalResolution?.disposition, 'LEGAL_CLEAR', 'Delaware guidance normalization requires final LEGAL_CLEAR');
  assert.equal(input.legalResolution?.decisionId, DE_DECISION_ID, 'Wrong Delaware legal disposition');
  assert.equal(input.legalResolution?.decisionRecord, DE_DECISION, 'Wrong Delaware legal decision record');
  assert.deepEqual(input.routes.map(route => route.routeKey), [DE_ROUTE], 'Delaware guidance normalization cannot change route scope');
  const bytes = relative => fs.readFileSync(path.join(root, relative));
  const hashFile = relative => crypto.createHash('sha256').update(bytes(relative)).digest('hex');
  assert.equal(hashFile(DE_DECISION), DE_DECISION_SHA256, 'Delaware legal decision bytes changed');
  const decision = JSON.parse(bytes(DE_DECISION));
  const row = decision.decisions.find(item => item.decisionId === DE_DECISION_ID);
  assert.equal(row?.disposition, 'LEGAL_CLEAR');
  assert.deepEqual(row.familyIds, [DE_FAMILY]);
  assert.match(row.bindingProductRule, /SBI-controlled administrative pathway/);
  assert.match(row.bindingProductRule, /must not manufacture a fictional court application/);

  const wiring = JSON.parse(bytes(`${DE_DIRECTORY}/product-wiring.json`));
  const report = JSON.parse(bytes(`${DE_DIRECTORY}/reports/rendered-artifacts.json`));
  const receipt = JSON.parse(bytes(`${DE_DIRECTORY}/source-receipt.json`));
  const declared = bindDeclaredDeGuidance(wiring, {
    familyId: DE_FAMILY, routeKeys: [DE_ROUTE], directory: DE_DIRECTORY, state: 'VERIFY_PENDING'
  }, {report, receipt, instructions: bytes(`${DE_DIRECTORY}/participant-instructions.md`).toString('utf8'),
    hashFile, pageCountFile: relative => pdfPageCount(bytes(relative))});
  assert.equal(declared.binding.deliveryType, 'process_guidance');
  assert.equal(declared.binding.filingPermitted, false);
  assert.deepEqual(declared.binding.packetComponents, ['agency_preparation_guide']);

  const routes = input.routes.map(route => ({
    ...route,
    participantFacingInstrument: 'no filing — process guidance: agency_preparation_guide',
    currentOutputStrategy: 'process_guidance',
    requiredSourceIds: [...new Set((route.requiredSourceIds ?? [])
      .filter(id => !String(id).startsWith('component:')).concat('component:agency_preparation_guide'))]
  }));
  return {
    ...input,
    routes,
    implementationStrategy: 'process_guidance',
    sourceReconciliation: {
      ...(input.sourceReconciliation ?? {}),
      implementationStrategyOverride: 'process_guidance',
      guidanceAuthorityRecords: [{path: DE_DECISION, sha256: DE_DECISION_SHA256}],
      exactNextAction: 'Obtain current whole-family raster and a current independent 15-obligation review of the declared non-filed SBI guide.',
      disposition: 'GUIDANCE_DECLARATION_BOUND'
    },
    declaredGuidance: declared
  };
}
