# CODEX-LAUNCH-01 — complete the consumer/sponsored delivery path for IL:felony-prostitution-relief

You are a Codex Cloud task working for the LegalEase RCAP Grade-A launch. You are not the Captain and you integrate nothing: you work on branch `codex/launch-01-il-delivery`, created from the current tip of the canonical Captain branch `claude/legalease-sprint-captain-utucnw` (never from `main`; the Captain integrates your return into that branch), push bounded implementation commits there, and write one return file. Never push to `main` or to the captain branch, never force-push, never open a pull request, never touch Production, Vercel, Supabase auth/RLS/session code, Stripe, `.env*`, `.github/workflows/**`, migrations, any packet family under `data/rcap-all50/**`, any legal record, specification, ledger, queue or receipt.

The full contract — route, measured starting state, writable and prohibited paths, acceptance commands and the return shape — is `data/rcap-grade-a/packet-factory-24h/codex-launch-01/ASSIGNMENT.json` at your base. Read it first, then `AGENTS.md` and `docs/PRODUCT_CONTRACT.md`.

## The defect you are closing

`scripts/generate-rcap-launch-graph.mjs` resolves each pathway with `resolvePacketRoute({ state, pathway })` and no `trackId`. In `src/lib/rcap/documents/packet-route-resolver.ts`, Illinois is a LEGACY_VERIFIED jurisdiction fenced behind `factoryV2RouteMigrationFor` / `factoryV2RouteProductizationFor`, both track-exact, so the pathway-level resolution of `IL:felony-prostitution-relief` stays `legacy_retired`, `probeArtifact` never runs, and the launch graph reads `artifactResult null`, `deterministicArtifactProven false`, `dtcResult.deliverable false` — even though the exact track `il-prostitution-j-vacate` is productized (v2 specification `bc9050e0…`, family `il-prostitution-j-vacate-set`, Grade-A fulfillment record `grade-a-il-felony-prostitution-relief-v1`, hash-bound raster receipt, current-byte independent PASS).

## What "done" is

A participant whose screening lands on registry track `il-prostitution-j-vacate` is served end to end by the factory_v2 renderer bound to the server-owned specification:

1. the runtime route resolves through the exact productized track; the automatic sibling `il-prostitution-j-auto` stays closed and the trackless aggregate route is never admitted;
2. the launch graph reads a route-scoped deterministic artifact for the route, produced by the existing `probeArtifact`, not by a bypass;
3. consumer checkout → render job → authorized download, and the sponsored (partner/clinic) entitlement path, bind to that exact route and family through the existing delivery core (`authorizePacketDownload` / `streamAuthorizedPacket`, `runWorkerCycle`, `commercial-admission.ts`, `consumer-delivery-control.ts`);
4. every delivery verifier in the acceptance list covers the exact route, and a focused test proves the binding refuses the automatic sibling, a wrong family and a wildcard route scope.

Change no payment permission or commercial-enablement flag anywhere: every launch-graph row's `paymentAllowed`, `operationallySellable`, `sellable` and `creditConsumable` must read exactly what it read at your base (the baseline counts 28 `paymentAllowed=true` rows and 0 `operationallySellable=true`; both counts and every per-row value stay unchanged). Preserve unrelated route values and behaviour. Keep the assigned Illinois route and its automatic sibling closed as specified. Keep Production delivery disabled. Only the assigned renderer/artifact-resolution improvements are permitted. Commercial authority comes only from the fulfillment record and the launch gates; you open nothing.

## How to work

- Reproduce the starting state first (regenerate the launch graph, read the IL row) and keep that output for the return.
- Make the smallest change at the cause. Do not add a router, framework or abstraction; do not refactor beyond the branch you touch; never weaken a verifier assertion.
- Regenerate `data/rcap-ledger/launch-graph.json`, `data/record-clearing/factory-v2-route-registry.json` and the public-witness files only with their generators.
- Run every command in `acceptance.mustPass` and record each exit code before and after.
- `git diff --stat <base>` must show only the writable paths. The generator-only outputs listed in ASSIGNMENT.json (`data/rcap-ledger/launch-graph.json`, `data/rcap-ledger/public-witness-*.json`, `data/record-clearing/factory-v2-route-registry.json`) are the one exception to the no-ledger-changes rule above; the claim ledger, queues, receipts, legal records and specifications remain off limits.

## Return

Write `data/rcap-grade-a/packet-factory-24h/codex-launch-01/RETURN.json` (shape in ASSIGNMENT.json `returnLocation`), commit it with your implementation on `codex/launch-01-il-delivery`, and push. In the return say plainly what remains: the hosted consumer and sponsored canaries need credentials only the owner holds, and `paymentAllowed` opens only through the fulfillment record and launch gates.

## Clarification recorded 2026-09-05

- Branch from and return to the canonical Captain branch `claude/legalease-sprint-captain-utucnw`, never `main`.
- The earlier acceptance wording "every row keeps paymentAllowed false" was wrong (the baseline has 28 true rows). The constraint is: change no payment permission or commercial-enablement flag; preserve unrelated route values and behaviour; keep the assigned Illinois route and automatic sibling closed as specified; keep Production delivery disabled; permit only the assigned renderer/artifact-resolution improvements.
- The listed generator-only outputs are the sole exceptions to the no-ledger-changes sentence; they are not broadened.

## Continuation recorded 2026-09-05 (codex-launch-01-continuation-v1)

Your first return is integrated: fbee9d12f and fb462a3c1 are on the Captain branch as a5dc95d0a and eaa9b6193, the launch graph and its Markdown are regenerated at 73375e9a6, and all 23 acceptance commands pass there. Continue the same task on the same branch: merge `origin/claude/legalease-sprint-captain-utucnw` (at or after 73375e9a6) into `codex/launch-01-il-delivery` with an ordinary merge. No rebase, no force-push, no recreated work, no pull request.

Roger authorizes completing the two application dependencies your return named. The full contract is the `continuation` object in ASSIGNMENT.json at that tip: read it first. In short:

- **Writable now, in addition to the delivery-core paths you already hold:** `src/lib/expungement-ai/packet-fulfillment-authority.ts`, `src/lib/expungement-ai/payment-adapter.ts`, `src/lib/expungement-ai/packet-generation.ts`, `scripts/rcap-render-worker.mjs`, the delivery verifiers and tests, the generator-only launch outputs (including `docs/record-clearing/LAUNCH_GRAPH.md`), and your return `RETURN-02.json`. Nothing else: not the canonical authority registry or its generator, not the older `packet-fulfillment-records.json` ledger, not legal records, specifications, packet families, migrations, Stripe, `.env*`, workflows or Production.
- **Outcome A:** the consumer lookup consumes the canonical Grade-A authority (registry loader, authority evaluator, admission observation) plus provider and specification information for the exact route, track and family. A valid record is never rejected because the old ledger lacks a duplicate; a missing, revoked, stale, incomplete, superseded, wrong-track or wrong-family record stays denied. Note the current fact: the IL record is **REVOKED at version 2** because the packet family failed a fresh independent read on 2026-09-05; its repair is in flight and the generator reinstates the record when the read passes. So prove the positive path with a test registry fixture loaded through the same loader, and prove the closed path against the live registry. Do not edit the live registry.
- **Outcome B:** the Illinois consumer and sponsored paths reach the existing durable job system and an actual renderer through the render worker and `packet-generation.ts`, with server-owned verified participant facts and the exact track, family and specification. The canonical-PDF adapter stays test-only. One delivery architecture.
- **Prove the missing behaviour**, not the passing fixture test: the real generation entry point and worker/provider adapter in an isolated local environment; participant facts reach the document and changing them changes it; the artifact binds to the right matter and verification; consumer and sponsored accounting keep their semantics; retries do not duplicate jobs, delivery or consumption; owner and repeat downloads work; other-user, wrong-track, wrong-family and stale-verification requests fail. Keep the deterministic-artifact regression for approved fixture inputs. Report unit, local-integration and hosted results separately and never call an authentication or Stripe boundary passed when a test double stood in for it.
- **Return** `data/rcap-grade-a/packet-factory-24h/codex-launch-01/RETURN-02.json` with the shape ASSIGNMENT.json names, commit it with your implementation, push the branch.

### Addendum 2026-09-05: the acceptance list is red for a true reason

At 29d4ae772 the canonical registry revoked the Illinois record (the packet family failed a fresh independent read), and 18 of the 23 acceptance commands now exit 1 because `scripts/verify-rcap-il-delivery-binding.mjs` asserts admission against the live registry, which answers `fulfillment_revoked`. The binding code is unchanged and passed at 73375e9a6. Under this continuation, split those assertions: binding logic against a test registry fixture loaded through the same loader; the live registry's answer asserted separately as the fact it is. See `continuation.verifierDesignCorrection` in ASSIGNMENT.json.

## Continuation recorded 2026-09-06 (codex-launch-01-continuation-v2)

RETURN-02 is integrated in full on the Captain branch (65851c3d1, 91ede5943, ed33ddf4a, b7fca6bb2, including the test-only Buffer-hashing fix). Outcome A is accepted complete. Outcome B is accepted incomplete for exactly the two reasons you named, and both dependencies have now landed:

- **Renderer entry point (DEL-A, 0fcedd773).** `composeParticipantDeliveryPacket(specification, matter)` from `@/lib/rcap/grade-a/participant-packet` composes the approved Illinois motion and order with a real `pleading_caption`; it is signature-compatible with `composeGradeAPacket`. Connect it in `src/lib/rcap/render/personalized-packet.ts` at the single call near line 49. The caption guard in `renderer.ts` stays. Proof: `scripts/test-rcap-il-participant-renderer.mjs`.
- **Sponsored transaction (DEL-B, 7307b0e34).** `supabase/migrations/20260906120000_sponsored_route_render_transaction.sql` registers the exact Illinois route beside the Mississippi literals and provides `sponsored_packet_render_authority`, `enqueue_verified_sponsored_packet_render` and `finalize_sponsored_packet_generation_for_route` (service_role). Connect them in `src/lib/expungement-ai/packet-generation.ts` at the sponsored refusal near lines 205–208. Proof: `scripts/test-rcap-il-sponsored-transaction.mjs`, 69/69 on the Captain branch, local ephemeral PostgreSQL only. No hosted migration has been applied.

Continue on the same branch: merge `origin/claude/legalease-sprint-captain-utucnw` at or after 7307b0e34 with an ordinary merge, connect the two points, and rerun the whole integration chain locally (two participants, fact-change sensitivity, determinism, matter/verification binding, consumer and sponsored accounting, retries, downloads, denials, changed-verification regeneration). The live route stays REVOKED because the committed fixtures moved after approval; prove positive paths only through the isolated test authority, never by binding the current digest as approved. The full contract is `continuation2` in ASSIGNMENT.json. Return `RETURN-03.json`.
