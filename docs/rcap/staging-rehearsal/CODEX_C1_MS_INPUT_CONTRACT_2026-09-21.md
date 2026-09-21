# C1 checkpoint — exact MS builder input needs clarification

Captain baseline: `c1ca7b4e87db8e09aecdd8b4940a38a495d54af7`, fetched and merged into `codex/mission-lock-engineering`. Both controlling documents were read. This is an implementation checkpoint, not completed hosted-contract repair or acceptance.

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
