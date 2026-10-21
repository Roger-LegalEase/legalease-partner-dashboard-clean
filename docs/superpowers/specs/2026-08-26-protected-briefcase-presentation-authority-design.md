# Protected Briefcase presentation authority design

## Objective

Add one server-only boundary that converts an owner-scoped `ConsumerBriefcaseItem` into a sanitized Briefcase view model. UI consumers receive no participant-row legal, route, status, or artifact authority. The same correction makes protected verification sufficient for checkout, render, and generation after the participant JSON mirror is deleted.

Lane B owns the shared adapter, protected contracts, commerce/render corrections, tests, and captain handoff. Lane B does not edit UI components, state files, SQL, or migrations.

## Public server API

Create `src/lib/expungement-ai/briefcase-presentation-authority.ts` with these exports:

- `BriefcasePresentationAuthorityStatus`
- `BriefcasePresentationArtifact`
- `BriefcasePresentationItem`
- `decorateBriefcaseItemForPresentation({ consumerAuthUserId, item })`
- `decorateBriefcaseItemsForPresentation({ consumerAuthUserId, items })`

The item model carries safe identity (`id`, canonical jurisdiction, `createdAt`, and an authority-derived title), canonical result/pathway/summary/next steps/checklist, protected verification state, protected artifact/Ready/download documents, protected paid/sponsored presentation state, and an explicit unavailable reason. Batch output preserves input order. The single wrapper and batch wrapper use the same assembler.

The runtime wrappers depend only on server-only readers. A pure injected assembler owns validation and sanitization so focused tests can prove authority behavior without a database.

## Legal and presentation authority

### Protected verification exists

A verified protected record is acceptable only when its snapshot is structurally complete and can be matched to the current compiled profile and authoritative packet plan. Re-evaluate the protected screening answers with the exact jurisdiction, profile version, and matter identity. Require exact result code, pathway ID, selected track, treatment, required inputs, packet plan, and dependency identity. Derive title/pathway label, summary, next steps, and readiness checklist from that authoritative result and compiled plan. Never read their participant-row mirrors.

An existing unverified or invalidated protected record never falls back to a pending row. It presents only its same-revision protected current draft: canonical legal/result/pathway/checklist, protected answers, canonical builder/review surfaces, and `not_started`/`in_progress`/`facts_complete` progress. It never presents verified/Ready or authorizes commerce/generation.

### Protected verification explicitly absent

Fallback is allowed only for the exact `protected_verification_authority_missing` result. Read the captain-owned service-role presentation-source RPC, which must bind the authenticated owner to the exact Briefcase item, matter, source identity, claim timestamp, product/current partner-benefit state, and answer/linkage digests, then re-evaluate its stored jurisdiction, profile version, matter ID, and screening answers. A raw item/pending/source-session ID without protected owner/item corroboration is insufficient. A claimed exact source remains durable after its pre-claim replay TTL and can supply the canonical first-open draft.

Storage errors, malformed rows, ownership conflicts, unclaimed or ambiguously linked sources, digest mismatches, re-evaluation failures, or result inconsistencies produce a neutral unavailable view.

## Protected current draft

Every protected verification status/revision carries `draftHash` and `draftSnapshot`. The first claim initializes it from trusted server inputs. Each save atomically merges only the answer delta into the prior protected draft, re-evaluates route/plan/facts, and persists the next draft plus canonical mirror metadata. Explicit verification promotes that same draft; later edits invalidate commerce but retain the new protected draft for resume. Deleting the entire writable `commercialFlow` before checkout or after payment cannot prevent render/generation because the final protected snapshot remains self-sufficient.

### Neutral unavailable view

The neutral model may retain the exact Briefcase item ID and immutable creation time needed for routing and stable ordering. Jurisdiction is admitted only after the protected or trusted-source authority confirms it. It exposes no Ready state, download/document path, legal outcome, pathway, summary, next steps, checklist, track, treatment, payment, or sponsorship assertion.

## Artifact, payment, and sponsorship authority

Call `readProtectedPacketArtifact` for every presentation item. Only a valid protected `ready` record may create Ready status, artifact metadata, document paths, or download capability. Sanitize known source-engine and legacy artifact shapes into a narrow discriminated union; do not expose document bytes or unknown keys.

Paid presentation state comes from `consumerPacketPaymentAuthority`, not `item.paymentStatus`. Sponsored presentation and generation state comes from the current service-role owner/item/source-bound presentation-source RPC, never from a historical snapshot dependency or `item.sourceSessionId`. Errors remain explicit unavailable states. The adapter never reads participant artifact refs, packet status, summary, next steps, pathway label, selected track, treatment, or deferral fields as authority. Sponsored Mississippi legacy output becomes protected Ready only through `finalize_sponsored_packet_generation_if_verified`, which validates the current hash and atomically consumes credit plus attaches provenance; the generic artifact-attach RPC is forbidden for that path.

## Legacy artifact evidence

Extend the protected artifact record contract. `legacy_backfill` is valid only when protected SQL returns corroborated non-participant issuance evidence with:

- evidence kind (`consumer_payment_render_output` or `sponsored_generation_record`),
- exact owner, Briefcase item, matter, artifact source, and packet-plan IDs,
- immutable output/render or sponsored-generation/credit record ID,
- a canonical artifact byte digest,
- and the evidence verification hash when the historical source has one.

The artifact fields must match the evidence tuple and the protected row identities exactly. A provenance label, participant JSON, null hash, missing digest, mismatched source/plan/owner/item/matter, or ambiguous issuance record fails closed and is presented absent/regenerable.

Update the captain handoff to state that participant JSON is never legacy eligibility evidence. The captain backfill must corroborate server-only payment entitlement plus immutable render job/output, or sponsored generation/credit plus source session, before creating protected provenance.

## Protected snapshot self-sufficiency

Checkout, render, and generation must continue after complete deletion of `artifact_refs_json.commercialFlow`. Every packet fact they need comes from the protected verification snapshot and its fact dependencies plus the compiled packet plan. The participant JSON verification mirror is display/cache data only.

Tests cover deletion before checkout and deletion after payment. A valid protected snapshot either completes the normal render/generation derivation or refuses before commerce; it may never produce paid-without-delivery because a participant removed the mirror.

## Stripe and no-op corrections

When a reusable open Checkout Session fails immutable binding or success/cancel-origin reconciliation, expire it before returning an error. The old URL must become unpayable, and the request must not create a duplicate Session.

Semantic identical verification transitions preserve revision and timestamps for verified, unverified, and invalidated protected records. The answer delta contains only values that differ from the merged protected fact sources, so repeating a screening/prefill value cannot silently create a new source-qualified packet fact while reusing the old draft hash. Only a material fact or dependency change advances protected state.

## Verification strategy

Use TDD with focused pure and runtime-mock tests:

- forged participant Ready/status/artifact/download/document fields cannot affect the view model;
- forged summary, next steps, result, pathway, checklist, track, treatment, and complete `commercialFlow` deletion cannot affect protected output;
- protected missing permits only exact owner/item-linked claimed-source fallback; protected unverified/invalidated uses only its protected draft and storage errors fail closed;
- first-open, first-save/resume/review/verify, and invalidated-edit/resume use no raw-row fallback;
- malformed or mismatched protected snapshots fail closed;
- legacy label-only, null-hash, missing-digest, and mismatched evidence fail closed;
- exact corroborated legacy evidence sanitizes to Ready;
- protected snapshot supports checkout and render/generation with the whole mirror deleted;
- invalid reusable open Stripe Sessions expire without duplication;
- identical transitions preserve every status revision/timestamp;
- batch and single wrappers return the same model and preserve order.

Run focused verifier and mutation harnesses, checkout tests, typecheck, focused ESLint, parity checks, all-51 money/delivery proof, and `git diff --check`. Obtain an independent exact-diff review with zero Critical and zero Important findings before the single cumulative commit.
