// Authentication/item presentation and final-screening validation are fixtures.
// The verification, payment, queue, accounting and provenance RPCs stay real.
let db;
export const sponsoredItems = new Set();
export function bindDeliveryDb(database) { db = database; }
export const literal = (v) => v === null ? 'null' : `'${String(v).replaceAll("'", "''")}'`;
export async function getBriefcaseItem(userId, id) {
  const row = db.json(`select row_to_json(t) from (select * from consumer_briefcase_items where id=${literal(id)} and user_id=${literal(userId)}) t`);
  return row && { id: row.id, state: row.jurisdiction, packetStatus: row.packet_status, paymentProvider: row.payment_provider };
}
export const getBriefcaseItemForWebhook = getBriefcaseItem;
export const partnerSlugForPacketItem = () => null;
export const updateBriefcasePacketMetadata = async () => { throw new Error('unexpected inline metadata write'); };
export const updateBriefcasePacketMetadataForWebhook = updateBriefcasePacketMetadata;
export class CurrentPacketVerificationRequiredError extends Error {}
export async function requireCurrentPacketVerification(userId, item) {
  const { readProtectedPacketVerification } = await import('../src/lib/expungement-ai/verification-cas.ts');
  const read = await readProtectedPacketVerification({ consumerAuthUserId: userId, briefcaseItemId: item.id });
  if (!read.ok || read.value.status !== 'verified') throw new CurrentPacketVerificationRequiredError(`verification not current: ${JSON.stringify(read)}`);
  return { hash: read.value.hash, snapshot: read.value.snapshot };
}
export function protectedPacketInformationModelFor(verification) {
  return { stage: 'ready_to_generate', missingInputIds: [], reviewedAt: verification.snapshot.verifiedAt,
    initialAnswers: verification.snapshot.packetAnswers, serverFacts: verification.snapshot.serverFacts };
}
export async function readTrustedBriefcasePresentationSource({ item }) {
  const { consumerMatterIdForItem } = await import('../src/lib/expungement-ai/consumer-identity.ts');
  return { ok: true, value: sponsoredItems.has(item.id)
    ? { product: 'rcap_partner', partnerBenefitActive: true, partnerSlug: 'synthetic-program', sourceSessionId: item.id, matterId: consumerMatterIdForItem(item.id) }
    : { product: 'expungement_ai' } };
}
