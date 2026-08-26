# Screening verification concurrency handoff

This is the captain-owned database follow-up for Lane B. Lane B intentionally adds no migration and does not pass new parameters to the old production RPC signatures.

## Protected verification authority

Create `consumer_packet_verifications`, keyed one-to-one by `briefcase_item_id`, with at least:

- `briefcase_item_id uuid primary key references consumer_briefcase_items(id)`
- `status text not null check (status in ('unverified','verified','invalidated'))`
- `verification_hash text null check (verification_hash is null or verification_hash ~ '^[a-f0-9]{64}$')`
- `snapshot_json jsonb null`
- `schema_version text not null`
- `verified_at timestamptz null`
- `invalidated_at timestamptz null`
- `row_version bigint not null default 1`
- `updated_at timestamptz not null default now()`

Only `service_role`/named security-definer functions may insert, update, or delete these rows. Revoke browser-role writes. A verified row must have a hash, snapshot, and verified timestamp; an unverified/invalidated row must have no reusable hash. Treat any compatibility copy under `artifact_refs_json.commercialFlow.verification` as display/cache data, never mutation authority.

The server facts save and final-verify writer must update participant facts and this protected row in one transaction. A material fact save sets `invalidated`, clears the reusable hash, and increments `row_version`; a semantic no-op leaves the row unchanged. Any server write that observes profile/rule/generator dependency drift must persist invalidation in this table.

## Expected-hash CAS points

All five functions lock/read the protected verification row, require `status = 'verified'` and `verification_hash = p_expected_verification_hash`, perform the named mutation in the same transaction, and return a typed `verification_mismatch` without consuming authority when the comparison fails.

| Point | RPC | Required identity and CAS input | Mutation guarded |
| --- | --- | --- | --- |
| Checkout binding | `bind_consumer_checkout_verification` | `p_briefcase_item_id`, canonical owner/person/matter/product/session, `p_expected_verification_hash` | Bind the unpaid Checkout Session and store `checkout_verification_hash` |
| Payment entitlement | `record_consumer_packet_payment` | Existing payment evidence plus `p_expected_verification_hash` | Record paid/refunded evidence and `paid_verification_hash` |
| Artifact attach | `attach_consumer_packet_artifact_if_verified` | owner/item, immutable artifact metadata, `p_expected_verification_hash` | Merge artifact metadata without replacing `artifact_refs_json`; set Ready |
| Render enqueue | `enqueue_packet_render_job` | Existing consumer identity plus `p_expected_verification_hash` | Insert/idempotently return the render job with `verification_hash` |
| Sponsored slot | `record_partner_packet_generation` | `p_session_id`, `p_briefcase_item_id`, `p_expected_verification_hash` | Consume exactly one sponsored included/overage slot |

The matching application contract is `PACKET_VERIFICATION_CAS_HANDOFF` in `src/lib/expungement-ai/verification-cas.ts`. After the migration lands, pass the parameter to each RPC and delete transitional application-only comments/checks only after mutation tests prove the database refusal.

Captain must convert these exact application calls:

- `payment-adapter.ts` `persistCheckoutBinding` → `consumer-payment-authority.ts` `persistConsumerCheckoutBinding`: replace the direct table update with `bind_consumer_checkout_verification` and pass `expectedVerificationHash` as `p_expected_verification_hash`.
- `checkout-reconciliation.ts` `finalizePaidCheckoutSession` → `consumer-payment-authority.ts` `recordConsumerPacketPayment`: the TypeScript input already validates `expectedVerificationHash`, but the live `record_consumer_packet_payment` RPC payload intentionally does **not** send it yet. Add `p_expected_verification_hash` only with the captain migration/signature change.
- `packet-generation.ts` `updatePacketMetadata` / `attachPacketToBriefcaseItem` → `briefcase.ts` `updateBriefcasePacketMetadata` and `updateBriefcasePacketMetadataForWebhook`: replace the transitional `updated_at`/artifact-envelope comparison with `attach_consumer_packet_artifact_if_verified` for Ready artifact attach; status transitions that authorize generation must use the same protected expected hash.
- `consumer-render-request.ts` `requestConsumerPacketRenderInternal` → `job-queue.ts` `enqueueRenderJob`: `RenderJobIdentity.expectedVerificationHash` exists, but the live `enqueue_packet_render_job` payload intentionally omits the new parameter. Add `p_expected_verification_hash` with the RPC migration.
- `packet/generate/route.ts` `POST` → `rcap-slot-lifecycle.ts` `recordPartnerPacketGeneration`: the input carries briefcase item/hash, but the live `record_partner_packet_generation` payload still sends only `p_session_id`. Add `p_briefcase_item_id` and `p_expected_verification_hash` with the RPC migration.

If Stripe creates an open Checkout Session but checkout-binding CAS fails, expire that Session before returning an error. Lane B already proves this behavior. Payment or sponsorship CAS failure must not enqueue/render/attach/consume a slot. Artifact or enqueue CAS failure must not change packet status to Ready.

Paid entitlement remains an immutable commercial fact after later verification invalidation, but it authorizes no new or repeat generation until explicit verification creates a new current hash. A previously issued Ready artifact remains status-visible and downloadable; immutable artifact access does not retroactively require verification.

## Participant review fact identity

`PacketInformationModel.verificationSummary` is the canonical review surface for every participant fact map in the hash. Keys are source-qualified and stable:

1. `screeningAnswers:<id>`
2. `prefilledAnswers:<id>`
3. `packetAnswers:<id>`
4. `serverFacts:<id>`

IDs sort lexically inside each source. Every key in the snapshot's four fact maps must occur exactly once. Only `serverFacts:jurisdiction` and `serverFacts:pathway_id` are `systemContext: true`; arbitrary server facts are participant-reviewable and must render. No new hashed participant fact source may be added without adding the same IDs to this summary and its verifier.

## Integration proofs

- Add migration tests that forge `artifact_refs_json.commercialFlow.verification` while the protected row is invalidated; all five RPCs must refuse.
- Add an interleaving test for each RPC: read hash H, materially save facts (H invalidates), attempt mutation with H, assert no mutation/slot/job/artifact/entitlement.
- Prove Checkout CAS failure expires a newly created open Stripe Session.
- After state shard integration, run the all-51 lifecycle suite and explicitly prove missing/unmatched lifecycle metadata withholds CA/MS/NY/WI route-consumer and exact-packet facts while universal questions remain available.
- Run `node scripts/verify-screening-verification-finetune.mjs` and `node scripts/test-expungement-checkout-guards.mjs` after wiring the RPC parameters.
