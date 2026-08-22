# Sellable pathway closure

Controlling product decision, from Roger:

> Every pathway classified or intended as sellable must actually work as a
> sellable pathway.

This document is the governing rulebook for that decision. It defines the
second nationwide denominator, the five closure categories, the invariant the
verifier enforces, and the only ways any of it may change.

## Two denominators, two questions

| Denominator | Artifact | Question it answers |
|---|---|---|
| 497-track terminal treatment | `data/rcap-ledger/track-terminalization.json` | Does every legal track have a complete participant treatment? |
| Sellable pathway closure | `data/rcap-ledger/sellable-pathway-closure.json` | Does every pathway LegalEase intends to sell produce a working paid packet? |

The 497 ledger stays as it is. It is not replaced, reinterpreted or renumbered,
and 497/497 continues to mean what it has always meant. The verifier asserts
that separation directly: it reads the 497 ledger, requires its aggregates to be
intact, and refuses a closure ledger whose denominator is the 497 denominator
restated under a new name.

The two can disagree without either being wrong. A track can be terminal in the
497 ledger — the participant receives a complete, specific, safe treatment — and
its pathway can still be open here, because a complete guidance treatment is not
a working paid packet.

## The five categories

Every compiled pathway carries exactly one.

### `paid_packet_intended`

The participant may prepare and file a self-help packet, and LegalEase intends
to offer that packet commercially or through RCAP sponsorship.

This is the denominator. It is frozen in
`data/rcap-ledger/sellable-pathway-denominator.frozen.json`.

**No `paid_packet_intended` pathway may end as guidance-only.** The following are
temporary blockers on an open paid pathway. None of them is a completed product
treatment, and none of them removes a pathway from this denominator:

- `guidance_only`, `hold_guidance_only`
- `needs_review`, a waiting rule that was never executed
- `needs_more_info` with no reachable follow-up
- an exact deferral caused only by unfinished implementation
- "source unavailable" where an official source can still be acquired
- packet unavailable, renderer unavailable
- form review pending, technical review pending, legal review pending

### `non_filing_guidance`

The participant has no packet to prepare because relief is automatic or the
controlling action belongs to a court, prosecutor, agency or another actor.
Guidance is the correct and complete treatment here, and it is not sold.

### `product_scope_exclusion`

The pathway is deliberately outside the product.

### `legally_unavailable`

No current remedy exists for the supplied facts.

### `exact_external_deferral`

A specific external fact, official source or legal event genuinely prevents the
route today.

A deferral earns this category only by **declaring** the external blocker —
`{ kind, fact, whoResolves, howResolved }` on the treatment record. It is never
inferred from prose. A treatment whose own stated reason is our unfinished work
("that is a limit on us, not on you or on your case", "the route is not bound
into the system", "has not finished the output and technical proof checks") is
by its own words an implementation blocker on a paid pathway, and the generator
classifies it that way.

## Leaving the paid denominator

Removing a pathway from `paid_packet_intended` requires a signed record in
`data/rcap-ledger/sellable-pathway-reclassifications.json` carrying:

- the exact previous classification
- the exact new classification
- a written reason, which must be one of
  - `no_participant_filing` — legal evidence that there is no participant filing
  - `product_scope_decision` — an explicit product-scope decision by Roger
- the evidence
- the authority
- the decision date

These are **not** valid reasons: implementation difficulty, a missing or
unacquired official form, stale or pending review of any kind, an evaluator or
renderer defect, or improving the closure numbers.

The verifier proves every difference between the live derivation and the freeze
against this register, and fails on an unsigned departure or an invalid reason.

## The invariant

```text
intendedSellablePathways
  == publiclyReachableSellablePathways
  == authoritativePacketReadyPathways
  == packetSpecCompletePathways
  == technicallyApprovedPacketPathways
  == legallyApprovedPacketPathways
  == successfullyRenderedPathways
```

Each stage is measured against committed evidence and against the running code,
never asserted:

| Stage | How it is measured |
|---|---|
| `intendedSellablePathways` | category `paid_packet_intended` |
| `publiclyReachableSellablePathways` | the live evaluator's payment gate opens for the route |
| `authoritativePacketReadyPathways` | route metadata records packet fulfilment ready with no paid-route blocker |
| `packetSpecCompletePathways` | the compiled packet plan passes `isPacketPlanFulfillmentReady` |
| `technicallyApprovedPacketPathways` | no open technical blocker and the packet route resolver admits a renderer |
| `legallyApprovedPacketPathways` | counsel ratification is `ratified_deployable`, packet-capable and payable |
| `successfullyRenderedPathways` | the real renderer was asked for this route and produced valid PDF bytes |

`successfullyRenderedPathways` is proved by rendering, in the generator run
itself. A pathway counts only if the packet route resolver admitted it and the
browser-free renderer returned bytes beginning `%PDF-`.

## Do not charge for guidance

A second invariant, enforced in the runtime and not only in the ledger:

```text
publiclyReachableSellablePathways ⊆ successfullyRenderedPathways
```

The evaluator decides whether a route is ratified. The packet route resolver
decides whether an artifact can be produced. Nothing bound the two together, so
a route could be payment-eligible in a jurisdiction whose packet route resolves
to guidance: the participant paid $50, the download route answered 409, and
`buildRenderJobSpec` returned no job.

`assertPacketRouteCanDeliver` in `src/lib/expungement-ai/payment-adapter.ts`
closes that. A route that cannot produce an artifact is shown no price and is
refused at Checkout with `ConsumerPacketNotDeliverableError`.

This is a fence on the charge, not a reclassification of the pathway. Every
route refused there stays in the intended-sellable denominator with
`renderer_unavailable` recorded against it as an open blocker.

## Payment follows counsel

A third invariant, measured in the ledger:

```text
publiclyReachableSellablePathways ⊆ legallyApprovedPacketPathways
```

The evaluator's `RATIFIED_DEPLOYABLE_ROUTES` set and the compiled
`lawrenceRatification` records are two different statements about the same
routes, and payment follows the wider of the two. Where they disagree, the
ledger names each route: money is open on a route whose compiled profile carries
no counsel ratification recording it as packet-capable and payable.

Closing this means reconciling the two — either by recording the ratification
the evaluator is already relying on, or by narrowing the evaluator's set to the
routes counsel actually ratified. It is not closed by widening the ratification
records to match the evaluator without counsel having looked.

## Running it

```bash
npm run rcap:generate-sellable-closure          # regenerate the ledger and the position report
npm run rcap:generate-sellable-closure -- --check
npm run rcap:freeze-sellable-denominator        # deliberate act only
npm run rcap:verify-sellable-closure            # the full closure gate; fails while the invariant is open
npm run rcap:verify-sellable-closure-governance # the rules that must hold at every commit
npm run rcap:verify-sellable-closure-mutations  # proves the verifier detects faked closure
npm run rcap:verify-money-gate-delivery         # proves no route can charge for a packet it cannot produce
```

The governance verifier, the mutation suite, the money-gate binding and the
generator's `--check` are wired into `npm test`. The full closure gate is not:
it fails today, on purpose, and it is the release gate rather than the commit
gate. Nothing about that hides the gap — the governance verifier prints every
stage count on every run, and the position report names every open pathway.

## Known red gate: the worker image fingerprint

`node scripts/generate-rcap-staging-action.mjs --check` is red on this branch,
and it must stay red until the freeze. This is the gate working, not a defect
introduced here.

`IMAGE_INPUT_PATHS` in that generator covers all of `src/` plus `package.json`,
so **any** change under `src/` makes the recorded fingerprint stale and makes the
already-published worker image "an image for other bytes". Binding the money
gate to the delivery gate changed three image inputs:

- `src/lib/expungement-ai/payment-adapter.ts`
- `src/app/api/expungement-ai/checkout/route.ts`
- `package.json`

Two facts establish that this is a freeze-wide condition rather than something
this branch caused:

- The fingerprint base `88d9157b` is image-input-equivalent to `origin/main`, so
  the gate was green on main and goes red for any source change.
- `origin/claude/rcap-authoritative-profile-version-fix` (PR #112, the hosted
  payment-to-PDF workstream) trips the same gate on three of its own `src/`
  files.

Clearing it requires regenerating the fingerprint at the accepted tip **and
republishing the worker image at that SHA**. Both belong to whoever owns the
freeze. This workstream is explicitly forbidden from republishing that worker or
deploying anything, so it does neither.

The two alternatives were both refused. Republishing the worker is not ours to
do. Reverting the delivery-gate binding would restore live charging on 71
payment-eligible routes that cannot produce a packet, which is the exact defect
the controlling decision exists to end. A red freeze gate on a branch that is
not being deployed is the correct cost.

## Position at the freeze

See `docs/record-clearing/sellable-pathway-closure.md`, regenerated with the
ledger.
