# Captain review — C1 accepted, one bounded follow-up before integration

**Date:** 2026-09-21
**Reviewed:** `0e3c163c55486a8f1b0dbcf8457639d58527c966`, with prerequisite
checkpoint `cfb132bc01b2edda90bfc53eb382d9b6c9091dab`
**Status:** Reviewed and reproduced. **Not yet integrated** — one bounded
engineering defect first, then the combined batch integrates once.

## The C1 contract is accepted

Reproduced independently by running the batch from Codex's own commit, not from
its report. Every confirmation holds:

| confirmed | evidence |
|---|---|
| PA is an explicit `legacy_retired` refusal case | route-contract test 1, and negatives 4–6 |
| PA returns no render spec | `builds` exercises **both** the old display label **and** the canonical ID — "Neither may reopen PA" — with negatives 2 and 3 |
| PA commercial / payment / sponsored / credit admission remains refused | four `admitCommercial` points, four `packetFulfillmentAuthority` surfaces and `createConsumerPaymentPlaceholder`, each with its own negative (7–15) |
| MS uses the canonical pathway ID | `request.pathway` asserted equal to `non-conviction-expungement-for-dismissal-no-disposition-or-acquittal` |
| MS explicitly passes `trackId` | `request.trackId` asserted equal to `ms-nonconv`, with negatives for a wrong track and a missing track |
| display label asserted separately | `compiledPathway.label` is its own operand, distinct from `compiledPathway.id` |
| exact family | `built.route.factoryV2.packetFamilyId`, `packetSetIds` and `registryTrackIds` all pinned to `ms-nonconv-set` / `ms-nonconv` |
| exact profile, renderer, route, Grade-A authority | `profileVersion`, `rendererKind`, `rendererVersion`, `routeId`, plus `authority.state = COMPLETE_PACKET_PROVEN`, `commercialStatus = commercially_eligible`, `authorized = true` |
| no route fallback remains | mapping-evidence test 6: a wrong reviewed pathway "stops fixture preparation without trying another route" |
| no product, legal or commercial code changed | the batch touches `scripts/`, `.github/workflows/` and `docs/` only. No `src/`, no `data/` |

Two further things worth recording, because they are better than asked for.

The MS contract asserts `built.route.sellable === false` and
`creditConsumable === false` **on the passing route**, with the comment that
factory resolution is technical capability and never commercial authority. That
keeps the ADR-0004 distinction visible on the positive case rather than only on
the negative one.

The gate verifier grew from **95 checks to 109**. The contract got stricter while
being repointed, which is the opposite of the usual risk when an acceptance case
is replaced.

The workflow change is in scope and strengthens the lane: it renames the step
truthfully and runs both contract tests *before* the gate, so the contract is
proven in CI rather than only locally.

## The one bounded defect, and it is not Codex's

`scripts/verify-rcap-hosted-full-matrix-contract.mjs` reports 13/14 because one
mutation never applies. Reproduced and root-caused:

```
anchor:   "full)          DEPLOY=true;  MATRIX=true;  GATE=true"      (10 spaces)
workflow: "full)            DEPLOY=true;  MATRIX=true;  GATE=true; …" (12 spaces)
```

`String.replace` finds nothing, returns the input unchanged, and the suite
correctly reports the mutation undetected. This is pre-existing and it is the
suite being honest — a mutation that cannot apply proves nothing, and saying so
is right.

It matters because that mutation is the one protecting the live `hosted_full`
anti-skip contract: it is supposed to prove the suite notices if `full` quietly
stops scheduling deploy and matrix.

### Follow-up for Codex — change the mutation mechanism only

1. Modify only `scripts/verify-rcap-hosted-full-matrix-contract.mjs`.
2. Target the `full)` contract line **semantically** rather than by exact
   whitespace, so the mutation survives reformatting of the workflow.
3. **Assert every mutation actually changed its input.** This is the part that
   generalises: a `!== original` guard turns any future no-op anchor into a loud
   failure instead of a silent pass. The other thirteen anchors apply today, but
   nothing currently stops one of them drifting the same way.
4. Do **not** edit the workflow to match the anchor, and do **not** weaken the
   underlying `fail()` assertion to satisfy the mutation. The workflow is
   correct; the mutation is what is broken.
5. Prove baseline green and **14/14** mutations caught.

Then return the commit. The C1 batch and this follow-up integrate together, once.

## Not done yet, deliberately

Hosted acceptance is **not** dispatched. Integration waits for the follow-up so
the branch takes one combined batch rather than two. Application, worker source,
digest, Preview and Stripe identities are all unchanged, and no rebuild,
republish, new Preview or retarget is authorized for this work.
