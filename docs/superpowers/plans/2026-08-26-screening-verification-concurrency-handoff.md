# Screening verification concurrency handoff

This is the captain-owned database follow-up for Lane B. Lane B adds no migration. The application already calls the exact protected RPC names and payloads below and therefore fails closed until the captain installs matching service-role SQL. Do not adapt these calls to an older production signature.

## Protected verification authority

Create `consumer_packet_verifications`, keyed one-to-one by `briefcase_item_id`, with at least:

- `briefcase_item_id uuid primary key references consumer_briefcase_items(id)`
- `status text not null check (status in ('unverified','verified','invalidated'))`
- `verification_hash text null check (verification_hash is null or verification_hash ~ '^[a-f0-9]{64}$')`
- `snapshot_json jsonb null`
- `draft_hash text not null check (draft_hash ~ '^[a-f0-9]{64}$')`
- `draft_snapshot_json jsonb not null`
- `schema_version text not null`
- `verified_at timestamptz null`
- `invalidated_at timestamptz null`
- `row_version bigint not null default 1`
- `updated_at timestamptz not null default now()`

Only `service_role`/named security-definer functions may insert, update, or delete these rows. Revoke browser-role writes. A verified row must have a hash, final snapshot, and verified timestamp; an unverified/invalidated row must have no reusable verification hash. Every status/revision must retain the current canonical `draft_hash` and `draft_snapshot_json`. Treat any compatibility copy under `artifact_refs_json.commercialFlow.verification` as display/cache data, never mutation or presentation authority.

The pending-result claim transaction must initialize the protected draft from the exact server-owned screening source before returning the Briefcase route. The server facts save and final-verify writer must merge the answer delta into that protected draft and update this protected row plus the JSON compatibility mirror in one transaction. A material fact save sets `invalidated` after prior verification (or remains `unverified` before first verification), clears the reusable verification hash, preserves the new protected draft for resume/review presentation, and increments `row_version`. Explicit verification promotes the same draft hash/facts into the final snapshot. A semantic no-op in **verified, unverified, or invalidated** status leaves hash, draft, timestamps, and revision unchanged. Profile/rule/generator drift fails closed until a service-role re-evaluation/backfill can create a new corroborated protected draft; participant JSON cannot repair it.

Implement `get_consumer_packet_verification_authority(p_consumer_auth_user_id, p_briefcase_item_id)` and `persist_consumer_packet_verification(...)`. The persist RPC must compare `p_expected_prior_hash` and `p_expected_prior_revision`, merge only `p_answer_delta` plus the fixed-shape `p_packet_information_metadata`, and atomically store `p_next_draft_hash`, `p_next_draft_snapshot`, `p_next_verification_status`, `p_next_verification_reason`, `p_next_verification_hash`, `p_next_verification_snapshot`, and `p_next_verification_invalidated_at`. It must also update the participant JSON display mirror in that transaction. A mismatch refuses without an application retry; any later attempt must reload and rederive.

Implement service-role-only `get_consumer_briefcase_presentation_source(p_consumer_auth_user_id, p_briefcase_item_id)`. It returns exactly one durably claimed server-owned source, with exact consumer owner, Briefcase item, matter, source identity, claim timestamp, jurisdiction/profile, product, current `partner_benefit_active`/`partner_slug`, screening answers, `screening_answers_sha256`, and a canonical linkage digest over the owner/item/matter/source/claim/answer-hash/product/current-partner-benefit/partner-slug tuple. `expires_at` is the pre-claim replay deadline; it does not expire an already claimed, exactly linked presentation source. An `rcap_partner` result requires a still-active benefit and non-null partner slug from the server-owned screening session; a DTC result requires no active partner benefit. Unclaimed, wrong-owner, inactive-benefit, ambiguous, item-supplied-ID-only, or digest-mismatched rows return no row. The app fails closed until this RPC exists.

The same RPC is the current sponsorship authority for presentation and generation even after protected verification exists. A historical `snapshot.dependencies.entitlementSource`, participant `source_session_id`, or partner label never proves current coverage. Sponsored source-driven generation may prepare bytes in memory, but only `finalize_sponsored_packet_generation_if_verified` may consume credit and attach protected Ready. Sponsored Mississippi legacy output must call that same finalizer directly; it must never use `attach_consumer_packet_artifact_if_verified`.

Create protected artifact authority keyed by Briefcase item with status, revision, immutable artifact payload, entitlement source, and verification hash. Implement `get_consumer_packet_artifact_authority(p_consumer_auth_user_id, p_briefcase_item_id)`. Protected artifact provenance/status is the sole Ready, status, document, download, and duplicate-generation authority.

`legacy_backfill` is valid only with protected, non-participant evidence matching the exact owner, Briefcase item, matter, artifact source, packet-plan id, immutable artifact-byte SHA-256, output id, and verification hash (including an explicit legacy null). Consumer issuance additionally requires a server-owned paid entitlement provider-event id plus immutable render-job/output ids. Sponsored issuance additionally requires the exact source-session id plus generation-record and credit-record ids. Writable `packet_status`, `artifact_refs_json`, summaries, next steps, provenance labels, or a null hash are **never eligibility evidence**. Ambiguous or partially corroborated rows remain protected-absent and must be regenerated/backfilled from authoritative evidence.

## Expected-hash CAS points

All five mutation functions lock/read the protected verification row, require `status = 'verified'` and `verification_hash = p_expected_verification_hash`, perform the named mutation in the same transaction, and refuse without consuming authority when the comparison fails.

| Point | RPC | Required identity and CAS input | Mutation guarded |
| --- | --- | --- | --- |
| Checkout binding | `bind_consumer_checkout_verification` | `p_briefcase_item_id`, canonical owner/person/matter/product/session, `p_expected_verification_hash` | Bind the unpaid Checkout Session and store `checkout_verification_hash` |
| Payment entitlement | `record_consumer_packet_payment` | Existing payment evidence plus `p_expected_verification_hash` | Record paid/refunded evidence and `paid_verification_hash` |
| Artifact attach | `attach_consumer_packet_artifact_if_verified` | owner/item, immutable artifact metadata, `p_expected_verification_hash` | Merge artifact metadata without replacing `artifact_refs_json`; set Ready |
| Render enqueue | `enqueue_verified_consumer_packet_render` | Exact packet/job identity, consumer owner/item/person/matter, `p_expected_verification_hash`, `p_render_packet`, `p_render_input_payload` | Atomically insert/idempotently return the exact render packet, immutable input, and one job |
| Sponsored slot | `finalize_sponsored_packet_generation_if_verified` | `p_session_id`, `p_briefcase_item_id`, `p_expected_verification_hash`, `p_packet_artifact` | Consume exactly one sponsored included/overage slot and attach protected Ready artifact atomically |

The authoritative parameter lists are `PACKET_VERIFICATION_CAS_HANDOFF` in `src/lib/expungement-ai/verification-cas.ts`; captain SQL must match them exactly.

Captain must convert these exact application calls:

- `verification-cas.ts` already calls `persist_consumer_packet_verification` with prior hash/revision, answer delta, canonical mirror metadata, and the full next protected transition.
- `briefcase-presentation-authority.ts` already calls `get_consumer_briefcase_presentation_source` with owner/item and independently verifies answer/linkage digests.
- `consumer-payment-authority.ts` already calls `bind_consumer_checkout_verification` and `record_consumer_packet_payment` with `p_expected_verification_hash`. Checkout binding must return `ok:true` for an identical binding, explicit `ok:false` only for a definitive CAS/conflict refusal, and transport/storage failures as errors.
- `verification-cas.ts` already calls `attach_consumer_packet_artifact_if_verified` with owner/item/hash, entitlement source, and immutable artifact.
- `job-queue.ts` already calls `enqueue_verified_consumer_packet_render` with every packet/job identity field, owner/item/person/matter, expected hash, `p_render_packet`, and `p_render_input_payload`.
- `rcap-slot-lifecycle.ts` already calls `finalize_sponsored_packet_generation_if_verified` with session/item/hash/artifact.

If Stripe creates an open Checkout Session but checkout-binding CAS fails, expire that Session before returning an error. Lane B already proves this behavior. Payment or sponsorship CAS failure must not enqueue/render/attach/consume a slot. Artifact or enqueue CAS failure must not change packet status to Ready.

Paid entitlement remains an immutable commercial fact after later verification invalidation, but it authorizes no new or repeat generation until explicit verification creates a new current hash. A protected previously issued Ready artifact remains status-visible and downloadable without retroactive verification. Participant-writable `packet_status`, `artifact_refs_json`, summary, next steps, pathway labels, tracks, or treatment fields never grant access or presentation authority. Briefcase legal/result/pathway/checklist/progress/builder/review presentation comes only from the protected final/current-draft snapshot, or from exact service-role claimed-source re-evaluation when protected verification is explicitly absent.

## Participant review fact identity

`PacketInformationModel.verificationSummary` is the canonical review surface for every participant fact map in the hash. Keys are source-qualified and stable:

1. `screeningAnswers:<id>`
2. `prefilledAnswers:<id>`
3. `packetAnswers:<id>`
4. `serverFacts:<id>`

IDs sort lexically inside each source. Every key in the snapshot's four fact maps must occur exactly once. Only `serverFacts:jurisdiction` and `serverFacts:pathway_id` are `systemContext: true`; arbitrary server facts are participant-reviewable and must render. No new hashed participant fact source may be added without adding the same IDs to this summary and its verifier.

## Integration proofs

- Add migration tests that forge `artifact_refs_json.commercialFlow.verification`, `packet_status`, artifact refs, summary, and next steps while protected verification/artifact rows are absent or invalidated; every mutation and access path must refuse.
- Add an interleaving test for each RPC: read hash H, materially save facts (H invalidates), attempt mutation with H, assert no mutation/slot/job/artifact/entitlement.
- Prove explicit Checkout CAS refusal expires both reused and newly created open Stripe Sessions, while transport/unavailable outcomes do not expire either Session.
- After state shard integration, run the all-51 lifecycle suite and explicitly prove missing/unmatched lifecycle metadata withholds CA/MS/NY/WI route-consumer and exact-packet facts while universal questions remain available.
- Prove protected verification semantic no-op/hash/revision reuse and stale prior-hash/revision refusal.
- Prove first-save -> leave -> protected resume -> facts complete -> final review -> verify, plus verified edit -> invalidated protected resume.
- Prove claimed post-TTL presentation succeeds only for the exact protected owner/item/source/digests; unclaimed, wrong-owner, forged-link, and ambiguous rows fail closed.
- Run `node scripts/verify-screening-verification-finetune.mjs` and `node scripts/test-expungement-checkout-guards.mjs` after installing the exact RPCs.
