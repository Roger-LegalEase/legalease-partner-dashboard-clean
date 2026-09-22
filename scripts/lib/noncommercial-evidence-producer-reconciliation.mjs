/** Bounded technical evidence reconciliation, following specification-derivation
 * reconciliation: an immutable proof receipt plus current-byte assertions.
 * Never an owner approval, and never authority for new shipping bytes. */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

export const CAPTAIN = '4d00a1ffa16965290d55536787dca85981d0fced';
export const FOOTER_COMMIT = '95ca90ba99de215d35dcbe06ddeb6528c42d8c7a';
export const PROOF_ROOT = 'data/rcap-grade-a/mission-lock/task53-evidence-reconciliation';
export const RECONCILIATION_PATH = `${PROOF_ROOT}/reconciliation.json`;
export const RECONCILIATION_SHA256 = '4e8fab74c96e3ef7375f88dfcab8cd7b4f7734055b755e0074155da5328a76e9';
export const APPROVAL_PATH = 'data/rcap-grade-a/legal-decisions/OWNER_CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_2026-09-20.json';
export const REGISTRY_PATH = 'data/rcap-grade-a/fulfillment-authority-registry.json';
export const HELPER = { path: 'scripts/rcap-custom-pleading/court-facing-rows.mjs', sha256: 'e8e8c558d35cc8eb4e3511be8f83de0bfa79b8f4e8462b38b2f6334e71f06ce2' };
export const FAMILIES = Object.freeze([
  { familyId: 'ms-misd-addl-set', routeIds: ['MS:additional-justice-court-misdemeanor-relief-9-11-15-3','MS:additional-municipal-court-misdemeanor-relief-21-23-7-6'],
    builderPath: 'scripts/build-census-v1-ms-misd-addl-set.mjs', preSha256: 'cc66b9fb6092bb826a2cd91a829a8bb0e550242c71ec7564368f238cb210553f', postSha256: '7af4839430477a1dacac3c2ea184314c701f7ed16c635c1cb6b97a40427be838' },
  { familyId: 'wy_fel_1502-set', routeIds: ['WY:felony-conviction-expungement-w-s-7-13-1502'],
    builderPath: 'scripts/build-census-v1-wy_fel_1502-set.mjs', preSha256: '5ff1ae7b72ad6d52281c68fc18b7431ba5ca2a2c974aa67f6de3dc6880b5bf76', postSha256: '57f9c4baf161581ed048805a0368f3cfb8363c4e7de4f7f864d86b892c94a91a' },
  { familyId: 'il-prostitution-j-vacate-set', routeIds: ['IL:felony-prostitution-relief'],
    builderPath: 'scripts/build-census-v1-il-prostitution-j-vacate-set.mjs', preSha256: '993d2c189284d57259b6d2a2f288e5d91050061d63dc557072dc346b235e741b', postSha256: '7a894298e4feb4a34fa68eac9976213c66a59a7e8508657b0e49361f35fb6962' }
]);
export const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export function pageCount(bytes) {
  const info = execFileSync('pdfinfo', ['-'], { input: bytes, encoding: 'utf8', maxBuffer: 1024*1024 });
  const count = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
  assert.ok(count > 0, 'PDF page count unreadable'); return count;
}
export function footerOnlyBuilderDelta(before, after) {
  const pre = before.toString('utf8');
  const importLine = 'import { courtFacingRows } from "./rcap-custom-pleading/court-facing-rows.mjs";\n';
  assert.equal(pre.split('  const wrap = (line) => {').length, 2, 'unexpected wrap definition');
  assert.equal(pre.split('    return rows;\n  };').length, 2, 'unexpected wrap end');
  const expected = pre.replace('#!/usr/bin/env node\n', '#!/usr/bin/env node\n'+importLine)
    .replace('  const wrap = (line) => {', '  const wrap = courtFacingRows((line) => {')
    .replace('    return rows;\n  };', '    return rows;\n  });');
  assert.equal(after.toString('utf8'), expected, 'substantive edit mixed into footer builder change');
}
function exactFile(entry, readBytes) {
  assert.equal(digest(readBytes(entry.path)), entry.sha256, `changed evidence: ${entry.path}`);
}
export function classificationInvariant(records) {
  return records.filter(r => r.packetCompleteness?.filingFormatArtifact && 'isCurrentCommercialArtifact' in r.packetCompleteness.filingFormatArtifact)
    .map(r => ({ routeId: r.routeId, packetFamilyId: r.packetFamilyId, artifact: r.packetCompleteness.filingFormatArtifact }));
}
export function commercialInvariant(record) {
  const artifact = record.packetCompleteness.filingFormatArtifact;
  return { routeId: record.routeId, packetFamilyId: record.packetFamilyId,
    isCurrentCommercialArtifact: artifact.isCurrentCommercialArtifact,
    currentCommercialArtifactReview: artifact.currentCommercialArtifactReview,
    provider: record.provider, deliveryProvider: record.evidenceBindings.provider.deliveryProvider,
    deliveryProviderEvidencePath: record.evidenceBindings.provider.deliveryProviderEvidencePath,
    deliveryProviderEvidenceSha256: record.evidenceBindings.provider.deliveryProviderEvidenceSha256 };
}
/** Conditions are separately callable so mutation tests reach them past the
 * outer receipt byte pin, rather than taking credit for that pin alone. */
export function assertProducerReconciliation({ proof, familyId, routeId, builderPath, preSha256, readBytes = fs.readFileSync }) {
  const exact = FAMILIES.find(f => f.familyId === familyId && f.routeIds.includes(routeId));
  assert.ok(exact, 'family/route outside bounded reconciliation');
  assert.equal(builderPath, exact.builderPath, 'wrong builder path');
  assert.equal(preSha256, exact.preSha256, 'wrong prior builder SHA');
  assert.equal(proof.schemaVersion, 'rcap-noncommercial-evidence-producer-reconciliation/v1');
  assert.equal(proof.baseCaptain, CAPTAIN); assert.equal(proof.footerCommit, FOOTER_COMMIT);
  for (const key of ['changesLegalContent','changesCurrentCommercialArtifacts','changesShippingArtifactApproval','createsApproval','approvesNewBytes']) assert.equal(proof[key], false, key);
  assert.equal(proof.nonCommercialEvidenceProducerSupersession, true);
  assert.deepEqual(proof.families.map(f => f.identity), FAMILIES, 'scope changed');
  const family = proof.families.find(f => f.identity.familyId === familyId);
  exactFile(HELPER, readBytes);
  const before = readBytes(family.preBuilder.path), after = readBytes(builderPath);
  assert.equal(digest(before), exact.preSha256, 'wrong pre builder bytes');
  assert.equal(family.preBuilder.sha256, exact.preSha256);
  assert.equal(family.postBuilder.sha256, exact.postSha256, 'wrong post builder SHA');
  assert.equal(family.postBuilder.path, exact.builderPath);
  assert.equal(digest(after), exact.postSha256, 'wrong post builder bytes');
  footerOnlyBuilderDelta(before, after);
  // Full bytes, not counts: specifications, field maps, track/legal authority,
  // original receipts/approvals and commercial provider publication remain exact.
  for (const entry of [...proof.preservedFiles, ...proof.proofTools]) exactFile(entry, readBytes);
  const approval = JSON.parse(readBytes(APPROVAL_PATH));
  assert.equal(approval.decisionId, 'OWNER-CURRENT-COMMERCIAL-ARTIFACT-APPROVAL-20260920');
  assert.equal(approval.status, 'APPROVED_EXACT_CURRENT_COMMERCIAL_ARTIFACTS');
  assert.deepEqual(proof.commercialArtifacts, approval.approvedArtifacts ?? approval.artifacts, 'approved population changed');
  for (const artifact of proof.commercialArtifacts) {
    exactFile(artifact, readBytes);
    assert.equal(pageCount(readBytes(artifact.path)), artifact.pageCount, 'commercial artifact page count changed');
  }
  const records = JSON.parse(readBytes(REGISTRY_PATH)).records;
  assert.deepEqual(classificationInvariant(records), proof.filingFormatBindings, 'filing-format classification/binding changed');
  for (const expected of proof.commercialBindings) {
    const matches = records.filter(r => r.routeId === expected.routeId);
    assert.equal(matches.length, 1, 'commercial route not unique');
    assert.deepEqual(commercialInvariant(matches[0]), expected, 'commercial artifact review/provider changed');
    assert.equal(expected.isCurrentCommercialArtifact, false, 'census is not commercial provider');
    assert.equal(expected.currentCommercialArtifactReview.state, 'approved');
  }
  assert.deepEqual(proof.commercialBindings.map(r=>r.routeId), FAMILIES.flatMap(f=>f.routeIds));
  for (const entry of family.auxiliaryEvidence) exactFile(entry, readBytes);
  const familyDir = `${PROOF_ROOT}/${familyId}`;
  const beforeReport = JSON.parse(readBytes(`${familyDir}/before/reports/rendered-artifacts.json`));
  const afterReport = JSON.parse(readBytes(`${familyDir}/after/reports/rendered-artifacts.json`));
  assert.deepEqual(beforeReport.componentSet, afterReport.componentSet, 'component set changed');
  for (const p of ['production-field-map.json','reports/blanks-left-for-the-participant.json','reports/actual-writes.json']) {
    assert.equal(digest(readBytes(`${familyDir}/before/${p}`)), digest(readBytes(`${familyDir}/after/${p}`)), 'protected blanks/prefills or facts changed');
  }
  assert.deepEqual(family.renders.map(r=>r.fixture), ['canonical','boundary']);
  for (const render of family.renders) {
    const beforeArtifact = beforeReport.artifacts.find(a=>a.fixture===render.fixture);
    const afterArtifact = afterReport.artifacts.find(a=>a.fixture===render.fixture);
    assert.deepEqual(beforeArtifact.pageManifest, afterArtifact.pageManifest, 'component/page order changed');
    assert.equal(beforeArtifact.sha256, render.baseline.sha256);
    assert.equal(afterArtifact.sha256, render.technical.sha256);
    exactFile(render.baseline, readBytes); exactFile(render.technical, readBytes); exactFile(render.comparison, readBytes);
    assert.equal(pageCount(readBytes(render.baseline.path)), render.pageCount, 'baseline page count changed');
    assert.equal(pageCount(readBytes(render.technical.path)), render.pageCount, 'technical page count changed');
    const measured = JSON.parse(readBytes(render.comparison.path));
    assert.equal(measured.pageCount, render.pageCount);
    for (const key of ['sameSubstantiveSpansAndCoordinates','samePageGeometry','noNewBlankPage','noClippingOrOverlapRegression','footerAbsent','sameComponentPageOrder','sameProtectedBlanksAndPrefills']) assert.equal(measured[key], true, key);
    assert.equal(measured.pages.length, render.pageCount);
    assert.ok(measured.pages.some(p=>p.removedWrappedRows > 0), 'no footer removal proved');
    for (const page of measured.pages) {
      assert.equal(page.newOrDarkenedPixels, 0); assert.equal(page.changedPixelsOutsideFooter, 0);
      if (page.changedPixels) assert.equal(page.rasters.length, 2, 'changed page raster evidence missing');
      for (const raster of page.rasters) exactFile(raster, readBytes);
    }
  }
  return { contract: proof.schemaVersion, path: RECONCILIATION_PATH, sha256: RECONCILIATION_SHA256,
    familyId, routeId, builderPath, priorBuilderSha256: exact.preSha256, currentBuilderSha256: exact.postSha256,
    createsApproval: false, approvesNewBytes: false, nonCommercialEvidenceProducerSupersession: true };
}
export function reconcileNoncommercialProducer(input) {
  const readBytes = input.readBytes ?? fs.readFileSync;
  const bytes = readBytes(RECONCILIATION_PATH);
  assert.equal(digest(bytes), RECONCILIATION_SHA256, 'technical reconciliation receipt changed');
  return assertProducerReconciliation({ ...input, readBytes, proof: JSON.parse(bytes) });
}
/** Return historical producer bytes ONLY after proving why today's supporting
 * builder differs. Those bytes remain the provenance of the old approved PDF. */
export function evidenceProducerBytes({ familyId, routeId, builderPath, readBytes = fs.readFileSync }) {
  const current = readBytes(builderPath);
  const exact = FAMILIES.find(f=>f.familyId===familyId && f.routeIds.includes(routeId) && f.builderPath===builderPath);
  if (!exact || digest(current)===exact.preSha256) return current;
  reconcileNoncommercialProducer({ familyId, routeId, builderPath, preSha256: exact.preSha256, readBytes });
  return readBytes(`${PROOF_ROOT}/${familyId}/pre-builder.mjs`);
}
