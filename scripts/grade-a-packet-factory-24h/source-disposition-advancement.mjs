import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { assessWashingtonReviewedGuidance } from './wa-reviewed-guidance.mjs';
import { WA_AUTOMATIC } from './treatment-reconciliation.mjs';
import {loadLegalBlockResolutions, assessLegalResolutionAtReviewBase, sourcePermissionHoldResolved} from './legal-block-resolution.mjs';

// Preserve the original source decision and identify the exact later evidence
// that discharged it. A generated ready flag alone cannot overrule a hold.
export function sourceDispositionAdvancement(root, decision, family) {
  if (family?.sourceReadiness?.ready !== true) return null;
  if (decision.disposition === 'PRODUCT_PATH_PENDING' && family.currentLegalResolution?.disposition === 'LEGAL_CLEAR') {
    const resolution = loadLegalBlockResolutions(root).byFamily.get(decision.familyId);
    const review = assessLegalResolutionAtReviewBase(root, family.selectedIndependentVerdict?.verifiedAtBase, resolution);
    if (resolution?.disposition === 'LEGAL_CLEAR' && resolution.decisionId === family.currentLegalResolution.decisionId
      && resolution.decisionRecord === family.currentLegalResolution.decisionRecord
      && (!decision.permissionHold || sourcePermissionHoldResolved(decision.familyId, decision, resolution))
      && review.available && family.selectedIndependentVerdict?.verdict === 'PASS_COMPLETE_INDEPENDENT') {
      return {effectiveDisposition:'SOURCE_READY', evidencePath:resolution.decisionRecord,
        decisionId:resolution.decisionId, reviewedAuthorityBindings:review.recordBindings};
    }
  }
  const utah = utahSourceAdvancement(root, decision, family);
  if (utah) return utah;
  if (decision.disposition !== 'SOURCE_BLOCKED') return null;
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

function utahSourceAdvancement(root, decision, family) {
  const juvenile = decision.familyId === 'census-pending-family:UT:path-m-juvenile-expungement' && decision.disposition === 'SOURCE_BLOCKED';
  const selector = decision.familyId === 'ut_pet_remove_link-set' && decision.disposition === 'PRODUCT_PATH_PENDING';
  if (!juvenile && !selector) return null;
  const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  try {
    const evidencePath = selector
      ? 'data/rcap-grade-a/source-wave-integration/UT_REMOVE_LINK_NEXT_BLOCKER_2026-09-11.json'
      : 'data/rcap-grade-a/source-wave-integration/KNOWN_RESIDUAL_SOURCE_RECOVERY_2026-09-11.json';
    const evidence = fs.readFileSync(path.join(root,evidencePath));
    const record = JSON.parse(evidence);
    if (selector && (record.familyId !== decision.familyId || record.ownerAnswer !== 'RESOLVED'
      || record.bindingProductRule?.requiredFact !== 'judgeOrCommissioner'
      || JSON.stringify(record.bindingProductRule.judge) !== JSON.stringify(['1501CR','1502CR','1110GE'])
      || JSON.stringify(record.bindingProductRule.commissioner) !== JSON.stringify(['1501CR-C','1502CR','1111GE'])
      || record.bindingProductRule.otherwise?.generateFilingPacket !== false
      || record.bindingProductRule.otherwise?.action !== 'STOP')) return null;
    const expected = selector ? ['official-form:1501CR','official-form:1501CR-C','official-form:1502CR','official-form:1110GE','official-form:1111GE'] : ['official-form:1174XX'];
    const bound = family.sourceReadiness.boundSources ?? [];
    if (bound.length !== expected.length || new Set(bound.map(s=>s.sourceId)).size !== expected.length) return null;
    const sources=[];
    for (const id of expected) {
      const b=bound.find(s=>s.sourceId===id);
      if (!b || !b.evidencePath || sha(fs.readFileSync(path.join(root,b.path))) !== b.sha256) return null;
      const adoptionBytes=fs.readFileSync(path.join(root,b.evidencePath));
      const adoption=JSON.parse(adoptionBytes);
      const rows=adoption.sources ?? adoption.documents ?? [];
      const source=rows.find(s=>(s.sourceObligationId===id && s.familyIds?.includes(decision.familyId)) || s.familyBindings?.some(b=>b.familyId===decision.familyId && b.obligationIds?.includes(id)));
      if (!source || source.heldCorpusPath!==b.path || source.sha256!==b.sha256) return null;
      sources.push({sourceId:id,path:b.path,sha256:b.sha256,evidencePath:b.evidencePath,evidenceSha256:sha(adoptionBytes)});
    }
    return {effectiveDisposition:'SOURCE_READY',evidencePath,evidenceSha256:sha(evidence),sources};
  } catch { return null; }
}
