# Lane B — Grade-A fulfillment authority core · status and evidence

**Sprint:** `2026-08-29-national-grade-a`
**Branch:** `claude/grade-a-fulfillment-core-jni395`
**Session base:** `07675789a80e732d2b835c1e8ba2092b39201b79` (tip of `origin/main` and of the
lane branch at session start; the lane envelope shipped the literal placeholder
`<captain-provided SHA>`, so this is the observed base, not an assumed one)
**Production touched:** no

## Environment identity gate

| Field | Result |
| --- | --- |
| Repository | `Roger-LegalEase/legalease-partner-dashboard-clean` — matches |
| `origin` | `https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean` — matches |
| Branch | `claude/grade-a-fulfillment-core-jni395` — matches |
| Worktree | `/home/user/legalease-partner-dashboard-clean`, also the git toplevel — the assigned checkout |
| Production | disconnected, untouched |
| Private corpus | **absent.** `private/` does not exist in this checkout. |

The absent corpus blocks nothing in this lane. Lane B reads generated evidence
ledgers under `data/`, not source PDFs; the Oregon and North Dakota candidate
records below derive from `data/rcap-ledger/launch-graph.json` and the committed
review manifests. A lane that must hash Oregon's official forms is blocked by
this and Lane B is not.

## What was built

One versioned, server-authoritative fulfillment authority. Not a second one —
searched first: `COMPLETE_PACKET_PROVEN` did not exist anywhere in the repository,
and the question it answers was being answered independently in nine places.

| Deliverable | Where |
| --- | --- |
| 1. Schema / domain model and policy interface | `src/lib/rcap/fulfillment/grade-a-authority.ts` |
| 2. Server-side eligibility functions | `evaluateFulfillmentAuthority`, `admitCommercialAction` (same file); `admitCommercial`, `fulfillmentAuthorityFor` in `grade-a-admission.ts` |
| 3. Invalidation / staleness rules | `collectStaleness` (same file), driven by `data/rcap-grade-a/fulfillment-observation-snapshot.json` |
| 4. Migration patch proposal | `docs/rcap/grade-a/migration-patch-proposal/` — unnumbered, outside `supabase/migrations/`, because shared migration ordering is captain-owned |
| 5. Focused tests | `scripts/verify-rcap-grade-a-fulfillment-authority.mjs` (+ `--mutations`) |
| 6. Integration note | `docs/rcap/grade-a/GRADE_A_FULFILLMENT_INTEGRATION_NOTE.md` — all nine admission points, with file:line anchors |
| 7. Oregon / North Dakota candidate records | `data/rcap-grade-a/fulfillment-authority-registry.json` — 9 records, **all INCOMPLETE** |
| 8. No commercial enablement without proof | `commerciallyEligible: 0` in the projection |

## The Oregon and North Dakota result

Nine candidate records were written — 3 Oregon pathways, 6 North Dakota. **None
reaches `COMPLETE_PACKET_PROVEN`, and the honest reason is that the evidence does
not exist**, not that a rule is too strict:

| Missing dimension | Routes affected | Where the absence is recorded |
| --- | --- | --- |
| Page-by-page visual review | 9 / 9 | `data/rcap-all50/contact-sheet-visual-proof.json` has no OR or ND family; the ND families read `formal_visual_review_pending` |
| Output-level legal approval | 9 / 9 | `completedOutputLegalReview: "pending"` on both ND families; no OR family row exists |
| Bound final verification | 9 / 9 | no lane has produced a verification bound to these exact proof identities |
| Official source held and hashed | 9 / 9 | `officialFormIdsHeldInThisRepository` is empty for every OR and ND row; the corpus is absent from this checkout |
| Owner legal approval | 4 / 9 | `ownerApprovedLegalStatus: "owner_approval_pending"` |

This is the intended outcome of deliverable 7, not a shortfall against it: the
lane was to write candidate records *only if* the lanes provided complete
evidence. They did not, so the records say what is missing, per route, by name.

## Evidence

```
$ node scripts/generate-rcap-grade-a-fulfillment-authority.mjs --check
Grade-A fulfillment authority verified: 9 candidate record(s) across ND, OR.
  COMPLETE_PACKET_PROVEN: 0
  INCOMPLETE: 9   STALE: 0
  commercially eligible: 0

$ node scripts/verify-rcap-grade-a-fulfillment-authority.mjs
Grade-A fulfillment authority: 64 checks passed.
  registry routes: 9   commercially eligible: 0

$ node scripts/verify-rcap-grade-a-fulfillment-authority.mjs --mutations
Mutations: 20 deliberate breakages, all caught.
Grade-A fulfillment authority: 64 checks passed.

$ npx tsc --noEmit          # clean
$ npx eslint src/lib/rcap/fulfillment scripts/*grade-a*   # clean
```

### The verifier was itself verified

A passing gate proves nothing until it has been shown to fail. The visual-review
rule was deleted from `grade-a-authority.ts` and the gate re-run: three mutation
checks failed (`visual review only partially covered`, `visual review waived as
not required`, `visual review with no named reviewer`). The rule was restored and
the gate returned to green. An earlier, weaker tamper — replacing the first
condition with `if (false)` — did **not** fail, because the `else if` chain still
caught it; that is why the stronger tamper was run.

## Acceptance criteria

| Required proof | Where | Result |
| --- | --- | --- |
| incomplete record denies consumer checkout | 9 per-admission-point checks | pass |
| … denies sponsorship | same | pass |
| … denies packet-credit consumption | same | pass |
| … denies generation and delivery | same | pass |
| complete current record allows the synthetic path | `a complete current record admits every expected synthetic path` | pass |
| stale source/spec/provider/review/verification closes authority | 13 staleness cases + the null-observation case | pass |
| client mutation cannot elevate authority | 9 hostile bodies + 2 source-shape checks | pass |
| wrong jurisdiction or family denied | 3 route-binding checks | pass |
| legacy generator presence does not authorize | proves MS is sellable at the resolver and `UNSUPPORTED_ROUTE` here; all 5 legacy jurisdictions × 9 points denied | pass |
| generated projections match the controlling registry | 4 projection checks | pass |
| concurrent reads and version changes deterministic | 64 concurrent evaluations + interleaved version test + deep-freeze + ambiguity test | pass |
| audit history identifies who/what/why | 3 history checks incl. hash-chain tamper detection | pass |

## Invariants held

- authority computed server-side; the module reads no `NextRequest`, `headers()`, `cookies()`, `searchParams` or `process.env` — asserted by a source-shape check
- client/profile booleans cannot create authority; an authority-bearing key in a body is **refused**, not sanitised and honoured
- packet-family names alone cannot create authority
- runtime use is not ratification; artifact existence is not packet proof
- any change to legal, source, spec, provider, visual-review, output-review or verification state closes authority by hash comparison
- history is immutable and hash-chained; a rewritten record breaks its own link
- one canonical controlling registry; the projection is derived and editing it changes nothing
- unsupported routes fail closed — no record means `UNSUPPORTED_ROUTE`
- consumer and sponsored paths call the same function
- no text summary, checklist, wrong-state form, placeholder order or unreviewed artifact can be commercially deliverable — `commerciallyEligible: 0`

## Shared files touched, and why

`package.json` — the three lane commands were appended to the `test` chain and
two named `rcap:` scripts added. Additive; nothing existing was reordered,
removed or weakened. `package-lock.json` was **not** touched. If the captain owns
the chain's ordering, the commands have no positional dependency and can be moved.

Not touched: the global fulfillment ledger, `data/rcap-ledger/launch-graph.json`,
the commercial denominator, generated registries, route-ratification projections,
`supabase/migrations/`, `package-lock.json`, candidate freeze records, deployment
records.

## Next integration step

Lane F wires the nine admission points listed in the integration note. It should
need no new rule: `admitCommercial(point, identity)` is the whole interface, and
`denialCode` maps to a typed refusal at each route.

The captain's one shared-file change is
`scripts/generate-rcap-launch-graph.mjs`: `operationallySellable` should become a
read of `fulfillmentAuthorityFor(pathwayKey).authorized` rather than a tenth
independent computation of the same question.

## Artifact hashes

| SHA-256 | File |
| --- | --- |
| `768a19425c69dfad2c7d3dd2d71f89237cb2fdb8b98ba8786388d61cc6e986bf` | `src/lib/rcap/fulfillment/grade-a-authority.ts` |
| `eae7a4fbdc005a12202938b1d1d26fa52516691ade243180d93a6645a6761ec1` | `src/lib/rcap/fulfillment/grade-a-registry.ts` |
| `ff94367bafbea3cb09c07dd2e0597dadf0f9eae65f1b785ad66f85f2dc5204ab` | `src/lib/rcap/fulfillment/grade-a-admission.ts` |
| `1e79dd0cc8c346d31ec837f22e1d4be5cad388a4cb135bdeb57a1ddecb3c9411` | `scripts/generate-rcap-grade-a-fulfillment-authority.mjs` |
| `e3fdd13f8969c015e3dd40b12bbbed2d7abaf7df2df5e345b4d60c6e6d28ddff` | `scripts/verify-rcap-grade-a-fulfillment-authority.mjs` |
| `afce09d8a5b1ed68e60025c7ea808935b8dcdbf0db2823d0fac39c900d751add` | `data/rcap-grade-a/fulfillment-authority-registry.json` |
| `e3b8441f49f4344aaab1796491c0f9b90f300a46ca2c79ae652c69890bd623a9` | `data/rcap-grade-a/fulfillment-observation-snapshot.json` |
| `527ab407f515a2ac7d76ace3e2f6cd904ac23db91bc9e7e87e946277f65cec26` | `data/rcap-grade-a/fulfillment-authority-projection.json` |
| `0a10c3287dcfe7dc45ba9c4be0ee52e9c89de6cbb00b46d06d2c3d22e8cc5547` | `docs/rcap/grade-a/GRADE_A_FULFILLMENT_INTEGRATION_NOTE.md` |
| `91d6f4aa0679f540439a206ac537bb4ca0d2129f46e7001876e8a01377172188` | `docs/rcap/grade-a/migration-patch-proposal/grade-a-fulfillment-authority.sql` |
