# Captain integration — the complete Codex C1 chain

**Date:** 2026-09-21
**Integrates:** `cfb132bc01b2edda90bfc53eb382d9b6c9091dab` →
`0e3c163c55486a8f1b0dbcf8457639d58527c966` →
`44550fd9500c12dde40b33246223f23a20cec68e`, in that order, onto `captain-release`
at `9eb1d9f14`.
**Status:** Captain integration. Creates no approval, opens no route, authorizes
no production action.

## The chain, not the tip

`44550fd95` alone is not the C1 repair — it is eight lines in one mutation
anchor. The repair is the combined diff of all three commits. Cherry-picking the
three in order reproduces exactly the Codex range `312718441..44550fd95`, because
no other commit sits between them on `codex/mission-lock-engineering`.

The two earlier Codex batches, `960e5dbff` and `1494efb8a`, were already
integrated by content. Their patch-ids no longer match, so `--cherry-mark`
reports them as absent; every file they touch is byte-identical between
`1494efb8a` and the Captain baseline, which is the check that actually answers
the question.

Verified equivalence: `git diff 312718441 44550fd95` and
`git diff 9eb1d9f14 496720a05` differ only in the one resolved documentation
hunk below and in line-number offsets. Every script, test and workflow change is
byte-identical to Codex's.

## The one conflict, and how it was resolved

`CAPTAIN_C1_PA_ACCEPTANCE_CONTRACT_2026-09-20.md`, the MS fixture-identity table.
Both sides were correcting the same mistaken sentence. Resolved in favour of the
Captain amendment, which annotates **both** rows rather than one:

| kept | |
|---|---|
| `**pathwayId**` | — pass THIS to `buildRenderJobSpec` as `pathway` |
| `pathwayLabel` | — assert separately; **not** the builder route key |

The second clause is Codex's own wording, folded in so nothing in its
clarification is lost. Codex's `**Amended forward, 2026-09-21**` paragraph
auto-merged and is preserved verbatim. The old "display label as builder
pathway" wording is not restored anywhere.

## What was confirmed after integration

| confirmed | evidence |
|---|---|
| PA refusal intact | `PA_REFUSAL` builds from **both** the display label and the canonical ID; both must resolve `legacy_retired`, `spec === null`, with negatives for 4 `admitCommercial` points, 4 fulfillment surfaces and payment |
| MS canonical ID + `ms-nonconv` intact | `MS_CHECKOUT.pathwayId` is the canonical ID, `trackId: "ms-nonconv"`, `packetFamilyId: "ms-nonconv-set"`; asserted through `request.pathway`, `request.trackId`, `built.route.factoryV2.registryTrackIds` |
| no fallback search | `unexpected pathway ${…}; no fallback permitted` — the gate stops rather than trying another route; covered by the evidence test |
| gate verifier | `verify-rcap-hosted-checkout-gate` — OK, 109 checks |
| focused C1 tests | route contract 32/32, mapping evidence 6/6 |
| packet-contract mutations | 18/18 caught |
| hosted-full matrix baseline | passed — 9 required steps, each `always()`-gated |
| hosted-full matrix mutations | **14/14 applied + caught.** The `13/14` defect is gone: the anchor is now a `/m` regex tolerant of the workflow's real spacing, and an unmatched mutation now `assert`s rather than counting itself undetected |
| no product, legal or commercial source altered | `git diff --name-only` over `src/ data/ supabase/ deploy/` is empty |
| canonical worker inputs unchanged | `createWorkerInputPlan` against the accepted `117b469c4` / `sha256:9faa24e8…` returns `changedPaths: []`, `rebuildRequired: false`, `reuse-accepted-digest` |

Acceptance identities are byte-identical across the integration:
`scripts/rcap-hosted-vercel-rest-transport.mjs` and
`scripts/rcap-hosted-stripe-webhook-retarget.mjs` are untouched, and
`EXPECTED_WORKER_DIGEST` still reads `sha256:9faa24e8…`. No rebuild, republish,
new Preview or Stripe retarget is proven necessary by this integration, and none
is performed.

## What is NOT claimed green

`scripts/rcap-hosted-acceptance-preparation.test.mjs` fails 3 of 10. This is
**not** a Mission Lock control in the selected set and it is **not** repaired
here.

Root cause: the file pins CLI-era accepted identities —
`ACCEPTED_SOURCE = 5ac0d8d69…`, `CANONICAL_ACCEPTED_SOURCE = b680a4e4d…` — that
the current accepted worker source `117b469c4` superseded, and a
`rcapStagingScopeSha256=` expectation against a deploy script that has moved on.
The tree is right and the pins are stale.

Established pre-existing rather than candidate-caused, by construction: the
failing tests are a pure function of `rcap-hosted-acceptance-deploy.mjs`,
`rcap-hosted-acceptance-worker-input-plan.mjs` and the canonical input set, and
`git diff --name-only 9eb1d9f14 496720a05` over every one of those paths is
empty. Identical inputs, identical result. Called against the *real* accepted
identities the same module returns `reuse-accepted-digest` with no changed paths,
which is why this is a stale binding and not byte drift.

This belongs to the deferred C4 bucket — repair or retire the CLI-era controls
and stale release/hosted-tools bindings. Deferred is not resolved.
