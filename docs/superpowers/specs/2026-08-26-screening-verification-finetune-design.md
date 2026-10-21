# Screening and Verification Fine-Tune Design

**Date:** 2026-08-26  
**Application baseline:** `441ee3188ee52047a012232d8d11f890a09b4ac5`  
**Safe tools lineage:** `de28d4220e21710b9e340b461b6dc2c5403951cf`

## Objective

Correct the existing nationwide Expungement.ai journey without rebuilding it:

1. keep the free check limited to scope, explicit route selection, hard exclusions, and coarse approved timing/completion facts;
2. collect exact court, case, record, form, and date facts in packet information;
3. require an explicit final verification after the participant has seen the complete packet-fact summary;
4. bind both consumer payment and partner sponsorship to the same current verification snapshot;
5. preserve all 51 jurisdictions, 356 reconciled flows, 650 browser-required variants, packet families, forms, Clinic Mode, Briefcase, partner surfaces, and worker inputs.

## Authority boundary

The compiled profiles, existing route contracts, existing route-fact relevance mappings, and retained flow fixtures are the only authorities used by this correction. The implementation must not parse legal prose into new predicates.

Route pruning is conservative:

- before an exact participant-selected pathway is available, route-specific questions are withheld rather than guessed;
- an exact `possible_pathway_context` label may narrow to its corresponding compiled pathway because the current projection already guarantees every compiled pathway is represented in that question;
- route-specific facts may appear only when an existing machine mapping names that pathway;
- an unknown, unmatched, or unsupported selection never eliminates a route or creates payment authority;
- the existing authoritative evaluator remains the only component that can return the retained legal result.

Where an exact date is currently used only to compute an already-approved elapsed-time rule, the free check uses the existing approved coarse timing representation and packet information retains the exact value. If the existing authorities cannot express a mandatory predicate without inventing law, the affected route remains fail-closed.

## Two-stage lifecycle

### Stage 1: free check

The client requests a server-selected ordered question list. The progress response contains public question IDs only: no client-selectable route ID, payment authority, sponsorship entitlement, or packet-generation authority.

The final free-check evaluation continues to use the existing server evaluator. It may identify the retained result and packet plan, but it cannot authorize checkout or sponsored generation until final verification exists.

### Stage 2: packet facts and final verification

Packet information has four observable states:

- `not_started`
- `in_progress`
- `facts_complete`
- `ready_to_generate` (only when a current explicit verification exists)

Saving the last packet fact produces `facts_complete`; it does not verify. The review page shows the complete fact summary and provides a separate explicit verification action.

The verification snapshot contains, in canonical order:

- jurisdiction and profile version/source fingerprint;
- exact pathway and retained result;
- payment authority;
- packet plan, required inputs, packet family/form identifiers;
- selected track and treatment classification;
- all screening answers;
- all packet/server/prefilled answers;
- the verification timestamp and schema version.

Its SHA-256 hash is the commerce and generation binding. Any later fact or dependency change clears readiness and records `invalidated` with a reason. Paid entitlement remains paid, but generation is blocked until the current facts are reverified.

## Payment and sponsorship

Consumer checkout, checkout-session reuse, signed webhook reconciliation, durable render enqueue, synchronous packet generation, and partner-sponsored generation all require the same current snapshot hash.

Sponsorship proves who pays; it never substitutes for legal/fact verification. A stale or failed sponsored attempt consumes no partner slot. The checkout and generation APIs re-read the current matter before authorizing work.

No database migration is planned. The existing `artifact_refs_json.commercialFlow` envelope can hold the additive versioned verification object. A migration is allowed only if focused concurrency tests prove that envelope cannot safely enforce the current-hash boundary.

## UX

The participant-visible sequence is:

`Free check → save matter → packet information → final verification → payment or covered generation → packet preparation → packet ready`.

Sponsored/Clinic users never see consumer price or payment copy. The result CTA describes the actual Briefcase handoff. The stepper exposes list/progress semantics and the active step. Async errors use live regions. Existing shared-device privacy/reset behavior remains reachable.

## Regression invariants

- 51 jurisdictions.
- 356 real-flow fixture terminals reproduced.
- 650/650 browser-required variants retained.
- No packet-family, form-set, or service-disposition drift.
- Zero exact-date inputs in the free check unless an existing approved authority proves the exact value is mandatory at that stage.
- Zero court/docket/case-number inputs in the free check.
- Zero cross-route conditional-fact leaks.
- Zero duplicate semantic fact asks.
- Zero missing packet-plan required facts.
- Zero payment or sponsored generation paths without a current final verification.
- Production is not touched.

