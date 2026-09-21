# C1 acceptance-contract repair — Captain clarification implemented

Captain baseline: `c1ca7b4e87db8e09aecdd8b4940a38a495d54af7`, fetched and merged into `codex/mission-lock-engineering`. Both controlling documents were read. Captain subsequently approved passing the supplied canonical MS pathway ID to the builder and asserting the display label separately. The local acceptance-contract repair is complete; hosted acceptance remains for Claude to run after integration.

## Completed implementation and proof

- Replaced the stale positive PA mapping with the exact MS fixture, explicit `ms-nonconv` track, `ms-nonconv-set` family, profile `2026-06-19-source-conversion-1`, and renderer `packet_document_v1` / `1.0.0`. All 33 identity/payment/authority operands are emitted with actual and expected values.
- PA remains an explicit refusal case for both canonical ID and display label. Actual admission guards deny new generation, Checkout, paid authority and sponsored/packet credit authority. These pure boundary checks do not claim a hosted ledger audit.
- Removed jurisdiction fallback selection. Real screening and Packet Information preparation must stay on the exact selected MS route. Persisted fixture references carry the explicit track. Synthetic arrest, release and dismissal answers satisfy existing review-safety controls; no product guard or legal content changed.
- The existing Checkout workflow step runs the focused contract/evidence tests before its gate. Its scheduling, acceptance pins and unpaid-stop controls remain unchanged.
- Captain contract wording is amended forward to record the approved canonical-ID clarification.

Validation: 38/38 focused tests pass (PA refusal mutations; MS wrong/missing track, pathway, route, profile, version, family, renderer and authority; null spec; real-builder wrong-track refusal; complete real fixture preparation and no-fallback mutation). Checkout verifier: 109/109. Packet contract baseline and 18/18 mutations pass. Hosted matrix baseline passes. `git diff --check` passes.

Captain handoff: the broader hosted-matrix mutation suite has a pre-existing unmatched anchor for `hosted_full loses deploy+matrix in the contract` (13/14 caught). Reproduced with the verifier and both workflow files extracted from Captain baseline `c1ca7b4e…`; baseline exits 1 identically. This batch does not alter that verifier or phase contract.

Next: Claude independently reviews and integrates the engineering branch, supplies the new canonical tools SHA, and runs hosted acceptance against the existing Preview and worker digest. No dispatch or live/provider operation was performed here. C2 remains read-only.

## Historical checkpoint (superseded by the approval above)

The Captain decision explicitly labels `pathwayLabel` as “this is what the gate passes as pathway.” Executing that instruction with the real candidate builder and explicit `trackId: "ms-nonconv"` returns `routeKind: "legacy_retired"`, `spec: null`. The factory accessor indexes by exact canonical pathway ID; it does not normalize display labels.

Executing the same builder with the supplied canonical ID `non-conviction-expungement-for-dismissal-no-disposition-or-acquittal` and the same explicit track instead yields the selected `MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal` route, `factory_v2`, `ms-nonconv-set`, profile `MS` / `2026-06-19-source-conversion-1`, renderer `packet_document_v1` / `1.0.0`. Its Grade-A authority is `COMPLETE_PACKET_PROVEN`, `commercially_eligible`, authorized. This is the same selected route, not a proposed substitute.

## Implemented independently

- Added the PA refusal case to the gate before its existing mapping case. Both label and canonical ID must return null specs and retired, noncommercial resolver status.
- Actual product admission functions must refuse consumer Checkout, generation, sponsored entitlement and packet-credit admission. Fulfillment guards also refuse paid consumer payment authority and credit consumption. The real payment placeholder must offer no payment or amount even with a favorable screening predicate.
- These are pure admission-boundary proofs; no writers, queues, provider calls, payments or credit consumers are invoked. They do not claim a hosted ledger audit.
- Added strict MS identity evidence and mutation tests as preparation. The positive hosted flow is **not yet rewired**: doing so depends on resolving the explicit label-input instruction. The original stale positive PA assertion and fallback selection remain present, so this checkpoint must not be treated as a completed fix or dispatched.

## Local validation

- Route contracts: 32/32 tests pass, including 14 PA reopening mutations, 14 MS identity/authority mutations, and real-builder wrong-track and label-input refusals.
- Existing mapping evidence: 5 tests (the old candidate assertion remains red, as its diagnostic test expects).
- Existing hosted Checkout verifier: 95/95.
- Existing packet contract verifier and 18/18 negative mutations pass.
- `git diff --check` passes.

## Captain clarification required

Confirm that the harness should pass the supplied **canonical pathway ID** to `buildRenderJobSpec` and assert the supplied display label separately. No resolver change or alternative route is proposed. An asynchronous clarification was requested; no answer has been received at this checkpoint.

After clarification: replace the stale positive PA assertion and fallback search with the exact MS flow, preserve all strict identity and evidence assertions, rerun the affected controls, and hand the completed commit to Claude for integration and hosted acceptance.

No product code or acceptance pin changed. No workflow dispatch, worker rebuild/publication, Preview creation, Stripe retarget, or production action occurred. C2 remains read-only.
