import { MS_NONCONVICTION_PACKET_ANSWERS } from "./lib/rcap-ms-nonconviction-fixture.mjs";

// Synthetic participant answers from existing MS controls. These three exact
// values match the participant-delivery fixture in verify-ms-clinic-filing-revision.
// They are fixture facts, not a change to questions or filing requirements.
export const HOSTED_FINAL_REVIEW_ANSWERS = {
  ...MS_NONCONVICTION_PACKET_ANSWERS,
  release_confirmed: { value: "Yes", unknown: false },
  mcic_identifier_delivery_method: { value: "Confidential court-approved MCIC identifier addendum", unknown: false },
  mcic_identifier_method_confirmation_source: { value: "Confirmed by the Hinds County Circuit Clerk on 2026-09-03", unknown: false }
};

// Use participant application boundaries. Never manufacture protected authority.
export async function claimAndVerifyHostedFixture({ call, record, screening, answers }) {
  const pending = await call('/api/expungement-ai/screening/pending', {
    body: screening
  });
  record('verification_screening_pending_created', pending.status === 200
    && pending.json?.ok === true && typeof pending.json?.claimToken === 'string',
  `status=${pending.status}; error=${pending.json?.error ?? 'none'}`);
  // The single-use token stays in memory; never include it in acceptance evidence.
  const claim = await call('/api/expungement-ai/screening/pending/claim', {
    body: { claimToken: pending.json.claimToken }
  });
  const itemId = claim.json?.matterId;
  record('verification_screening_claimed', claim.status === 200 && claim.json?.ok === true
    && typeof itemId === 'string' && /^[0-9a-f-]{36}$/i.test(itemId),
  `status=${claim.status}; error=${claim.json?.error ?? 'none'}; item=${itemId ?? 'none'}`);

  const endpoint = `/api/expungement-ai/briefcase/${itemId}/packet-information`;
  const saved = await call(endpoint, { body: { answers, verify: false } });
  record('verification_facts_saved_without_final_review', saved.status === 200 && saved.json?.ok === true
    && saved.json?.readyToGenerate === false && saved.json?.missingInputIds?.length === 0,
  JSON.stringify(saved.json));

  const unverified = await call('/api/expungement-ai/packet/render', { body: { briefcaseItemId: itemId } });
  record('unverified_unpaid_render_requires_verification', unverified.status === 403
    && unverified.json?.reason === 'current final verification is required', JSON.stringify(unverified));

  // The participant explicitly completes final review after saving all facts.
  const verified = await call(endpoint, { body: { answers: {}, verify: true } });
  record('current_final_verification_established', verified.status === 200 && verified.json?.ok === true
    && verified.json?.readyToGenerate === true && verified.json?.missingInputIds?.length === 0
    && verified.json?.reviewReason === 'authoritative_route_confirmed', JSON.stringify(verified.json));
  return itemId;
}
