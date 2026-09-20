import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { GA_GUIDANCE, GA_PETITION } from './treatment-reconciliation.mjs';
export const GA_STAGE_REVIEW = 'data/rcap-grade-a/packet-factory-24h/checkpoint-232-to-250/ga-guidance-stage-review.json';
const DIR = 'data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading';
const BUILDER = 'scripts/build-census-v1-rcap-ga-guidance-implementation.mjs';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const safe = relative => assert(typeof relative === 'string' && !path.isAbsolute(relative)
  && !relative.includes('\\') && !relative.split('/').some(p => ['', '.', '..'].includes(p)), 'Unsafe guidance evidence path');
// This adapter proves only the two guidance stages. The caller must separately
// earn COMPLETE_PACKET_PROVEN through the existing source, independent review,
// raster receipt, completeness and product-wiring gates before admission.
export function assessGeorgiaReviewedGuidance(root, overrides = {}) {
  const read = overrides.readBytes ?? (relative => { safe(relative); return fs.readFileSync(path.join(root, relative)); });
  const historical = overrides.readHistorical ?? ((commit, relative) => {
    safe(relative); return execFileSync('git', ['show', `${commit}:${relative}`],
      { cwd: root, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 2 ** 26 });
  });
  try {
    const reviewBytes = read(GA_STAGE_REVIEW), review = JSON.parse(reviewBytes);
    assert.equal(review.schemaVersion, 'rcap-ga-guidance-stage-review/v1');
    assert.equal(review.familyId, GA_GUIDANCE);
    assert.equal(review.independentlyReviewed, true);
    assert.equal(review.editsNothingItVerifies, true);
    assert.ok(review.reviewer?.trim()); assert.match(review.lane, /^VF\d+$/i);
    assert.match(review.verifiedAtBase, /^[0-9a-f]{40}$/);
    assert.equal(review.scope, 'static_family_guidance');
    assert.equal(review.verdict, 'PASS'); assert.deepEqual(review.failedObligations, []);
    assert.deepEqual(review.stageIds, ['pre_consent', 'qualifying_order_on_or_after_2026_07_01']);
    assert.equal(review.separatePetitionFamilyId, GA_PETITION);
    assert.equal(review.secondPetitionGenerated, false); assert.equal(review.commercialAuthority, false);
    const receiptPath = `${DIR}/source-receipt.json`, reportPath = `${DIR}/reports/rendered-artifacts.json`;
    const receipt = JSON.parse(read(receiptPath)), report = JSON.parse(read(reportPath));
    assert.equal(receipt.familyId, GA_GUIDANCE); assert.equal(report.familyId, GA_GUIDANCE);
    assert.ok(receipt.committedRecords.some(r => r.recordId === 'controlling-decision:CLD-2026-08-28-GA-RFO'));
    const artifacts = report.artifacts;
    assert.deepEqual(artifacts.map(a => a.fixture).sort(), ['boundary', 'canonical']);
    const required = new Set([BUILDER, receiptPath, reportPath, `${DIR}/production-field-map.json`,
      `${DIR}/reports/actual-writes.json`, `${DIR}/participant-instructions.md`,
      ...receipt.committedRecords.map(r => r.pathInRepository), ...artifacts.map(a => a.file)]);
    assert.ok(Array.isArray(review.reviewedFiles));
    assert.equal(new Set(review.reviewedFiles.map(f => f.path)).size, review.reviewedFiles.length);
    const checked = new Map();
    for (const file of review.reviewedFiles) {
      safe(file.path); assert.match(file.sha256, /^[0-9a-f]{64}$/);
      assert.equal(sha(read(file.path)), file.sha256, `Current reviewed bytes changed: ${file.path}`);
      assert.equal(sha(historical(review.verifiedAtBase, file.path)), file.sha256, `Review pin mismatch: ${file.path}`);
      checked.set(file.path, file.sha256);
    }
    for (const file of required) assert.ok(checked.has(file), `Review omitted ${file}`);
    for (const source of receipt.committedRecords) assert.equal(checked.get(source.pathInRepository), source.sha256);
    for (const artifact of artifacts) assert.equal(checked.get(artifact.file), artifact.sha256);
    return { eligible: true, familyId: GA_GUIDANCE, reviewPath: GA_STAGE_REVIEW,
      reviewSha256: sha(reviewBytes), reviewedAtBase: review.verifiedAtBase,
      reviewer: review.reviewer, lane: review.lane, checked: [...checked].map(([path, sha256]) => ({path, sha256})),
      participantPetitionDischarged: false, commercialAuthority: false };
  } catch (error) {
    return { eligible: false, familyId: GA_GUIDANCE, reviewPath: GA_STAGE_REVIEW, reason: error.message };
  }
}

export function applyGeorgiaGuidanceAcceptance(priorState, treatmentState, reviewed) {
  return priorState === 'COMPLETE_PACKET_PROVEN' && reviewed?.familyId === GA_GUIDANCE
    && reviewed.eligible === true ? 'GUIDANCE_READY' : treatmentState;
}
