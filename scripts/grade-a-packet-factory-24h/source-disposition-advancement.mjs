import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { assessWashingtonReviewedGuidance } from './wa-reviewed-guidance.mjs';
import { WA_AUTOMATIC } from './treatment-reconciliation.mjs';

// Preserve the original source decision and identify the exact later evidence
// that discharged it. A generated ready flag alone cannot overrule a hold.
export function sourceDispositionAdvancement(root, decision, family) {
  if (decision.disposition !== 'SOURCE_BLOCKED' || family?.sourceReadiness?.ready !== true) return null;
  if (decision.familyId === WA_AUTOMATIC && family.state === 'GUIDANCE_READY') {
    const review = assessWashingtonReviewedGuidance(root);
    if (review.eligible && family.sourceReconciliation?.disposition === 'GUIDANCE_MAPPING_REQUIRED') {
      return { effectiveDisposition: 'GUIDANCE_READY', evidencePath: review.reviewPath,
        evidenceSha256: review.reviewSha256, participantMotionDischarged: false };
    }
  }
  if (decision.familyId !== 'census-pending-family:ME:juvenile-sealing') return null;
  const evidencePath = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08/ut-me-source-adoption.json';
  const evidenceSha256 = 'd4a23c2e0872a83a0b51fe3985a7cf23b555681c91a2b855e4b52a75950ee8c9';
  const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  try {
    const bytes = fs.readFileSync(path.join(root, evidencePath));
    if (sha(bytes) !== evidenceSha256) return null;
    const source = JSON.parse(bytes).documents.find(d => d.itemId === `${decision.familyId}::official-form:JV-043`);
    const held = fs.readFileSync(path.join(root, source.heldCorpusPath));
    const bound = family.sourceReadiness.boundSources;
    if (held.length !== source.byteLength || sha(held) !== source.sha256 || bound.length !== 1
      || bound[0].sourceId !== source.sourceId || bound[0].path !== source.heldCorpusPath
      || bound[0].sha256 !== source.sha256 || bound[0].evidencePath !== evidencePath) return null;
    return { effectiveDisposition: 'SOURCE_READY', evidencePath, evidenceSha256,
      sourcePath: source.heldCorpusPath, sourceSha256: source.sha256 };
  } catch { return null; }
}
