import assert from 'node:assert/strict';
import { register } from 'node:module';
import fixtures from './test-ar-record-origin-fixtures.mjs';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { decorateBriefcaseItemForPresentationWithDependencies: decorate } = await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { heldPacketCorrectionInputIds, packetInformationPatch, protectedPacketDraftHash, protectedPacketInformationModelFor } = await import('../src/lib/expungement-ai/packet-information.ts');
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; }
async function present(record) {
  return decorate({ consumerAuthUserId: 'synthetic-ar-owner', item: { id: 'synthetic-ar-matter', jurisdiction: 'AR', artifactRefs: {} } }, {
    readProtectedArtifact: async () => ({ ok: true, value: null }),
    readProtectedVerification: async () => ({ ok: true, value: record }),
    readTrustedPendingSource: async () => ({ ok: false, reason: 'synthetic_source_absent' }),
    readPaymentAuthority: async () => ({ valid: false, reason: 'unpaid' }),
    evaluateAuthoritative: evaluate,
    readCommercialActions: async () => ({ fulfillmentAvailable: false, checkoutAllowed: false, generationAllowed: false })
  });
}
for (const row of fixtures.rows) {
  const original = structuredClone(row.record), before = structuredClone(original);
  const model = protectedPacketInformationModelFor(original);
  check(model?.builderQuestions.some(q => q.id === 'ar_record_origin'), `${row.route}: protected origin correction exists`);
  const result = await present(original);
  check(result.authorityStatus === 'protected_draft' && result.packetDraft.status === 'available', `${row.route}: retained correction link must be available; actual ${result.unavailableReason}`);
  check(result.resultCode === (row.route.includes('situation-b-') ? 'guidance_only' : 'needs_more_info'), `${row.route}: expected held treatment`);
  check(result.verificationStatus !== 'verified' && Object.values(result.commercialActions).every(v => v === false), `${row.route}: no commercial or verified promotion`);
  const pageModel = { ...result.packetDraft, stateCode: result.jurisdiction, pathwayId: result.pathwayId };
  check(heldPacketCorrectionInputIds(pageModel, result.resultCode).has('ar_record_origin'), `${row.route}: actual page action predicate exposes origin correction`);
  for (const origin of ['arkansas', 'unknown', 'other_state', 'federal']) {
    const patch = packetInformationPatch({ existingItem: { id: 'synthetic-ar-matter', jurisdiction: 'AR', artifactRefs: {} }, protectedVerification: original, answers: { ar_record_origin: origin } });
    check(patch?.protectedTransition?.nextVerification && !patch.readyToGenerate, `${row.route}/${origin}: explicit correction preserves hold`);
    const saved = await present(patch.protectedTransition.nextVerification);
    check(saved.authorityStatus === 'protected_draft' && heldPacketCorrectionInputIds({ ...saved.packetDraft, stateCode: saved.jurisdiction, pathwayId: saved.pathwayId }, saved.resultCode).has('ar_record_origin'), `${row.route}/${origin}: correction stays reachable after save`);
  }
  for (const state of ['MS', 'CA', 'NY']) for (const resultCode of ['guidance_only', 'not_covered_yet']) {
    check(!heldPacketCorrectionInputIds({ ...pageModel, stateCode: state }, resultCode).has('ar_record_origin'), `${row.route}/${state}/${resultCode}: no unrelated guidance activation`);
  }
  assert.deepEqual(original, before, `${row.route}: presentation must preserve raw historical record`); checks++;
  for (const [field, value] of Object.entries({ profileVersion: 'wrong', profileSourceFingerprint: 'wrong', profileAuthorityFingerprint: 'wrong', pathwayId: 'wrong', paymentAllowed: true, resultCode: 'packet_ready', selectedTrackId: 'wrong', treatmentClassification: 'wrong', deferralComponentIds: ['wrong'] })) {
    const bad = structuredClone(original);
    bad.draftSnapshot[field] = value;
    bad.draftHash = protectedPacketDraftHash(bad.draftSnapshot);
    const denied = await present(bad);
    check(denied.authorityStatus === 'unavailable' && denied.packetDraft.status === 'unavailable', `${row.route}: invalid ${field} remains unavailable`);
  }
}
console.log(`PASS ${checks} Arkansas protected presentation controls (read-only fixtures; no authenticated acceptance claim).`);
