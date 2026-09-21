# Captain decision — the remaining C1 target is `unpaid_render_returns_402`

**Date:** 2026-09-21
**Decides:** the first real required failure of `hosted_full` run 35552261640,
dispatched on the integrated Captain SHA `b3bbb4a6b`
**Status:** Captain decision and Codex handoff. Creates no approval, opens no
route, authorizes no production action.

## The C1 repair worked

The handoff that failed run 35543063831 is closed, proven hosted on the real
Preview, not locally:

`pennsylvania_path_a_refuses_commercial_authority` — **ok.** `buildCount: 2`.
The display label and the canonical ID were both exercised and **neither
reopened PA**: `builds[0]` and `builds[1]` each `routeKind: legacy_retired`,
`spec: null`, `sellable: false`, `creditConsumable: false`. All four
`admitCommercial` points refused, all four fulfillment surfaces refused,
`payment.enabled: false`, `payment.amountCents: (undefined)`.

`consumer_caller_profile_and_eligibility_mapping_exact` — **ok**, on the exact
Captain-selected fixture: `request.pathway` the canonical ID,
`request.trackId: ms-nonconv`, `specPresent: true`,
`built.spec.profileId: MS`, `profileVersion: 2026-06-19-source-conversion-1`,
`routeId: MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal`,
`factoryV2.packetFamilyId: ms-nonconv-set`,
`registryTrackIds: ["ms-nonconv"]`, `authority.state: COMPLETE_PACKET_PROVEN`,
`authority.commercialStatus: commercially_eligible`, `authority.authorized: true`.

`checkout_fixture_route_derived_from_authorities`,
`seeded_item_carries_reviewed_packet_information`,
`briefcase_insert_returning_proves_row` and
`stored_row_matches_authoritative_resolver` also passed. The Preview was
**reused** (`reused_exact_ready_preview`, `dpl_7fS5R3jKGRYeCCyuvafkoMfrkgpe`) and
the worker pulled by the accepted immutable digest.

## The failure

```
FAIL unpaid_render_returns_402 — A render of seeded unpaid item=403;
                                 reason=current final verification is required
CHECKOUT GATE OUTCOME — gate_failed passed=false
```

`scripts/rcap-hosted-checkout-gate.mjs:858` asserts
`unpaidRender.status === 402`. It got 403.

## Root cause — the product moved forward and this case did not

The application consults payment **last**, on purpose. In
`src/lib/expungement-ai/consumer-render-request.ts` the order is: route access →
item ownership → `requireCurrentPacketVerification` (line 226) → packet
information accuracy review → `buildRenderJobSpec` → person → **then**
`consumerPacketPaymentAuthority` (line 326) → `payment_required` → 402 (line
331). The source says so itself at line 283: *"before a packet row is created,
**before payment is consulted**, before a person is resolved and before anything
is enqueued."*

The gate seeds its Briefcase item with raw SQL and immediately POSTs a render.
**It never establishes a final verification** — the word does not occur anywhere
in `scripts/rcap-hosted-checkout-gate.mjs`. So `requireCurrentPacketVerification`
throws, the render is refused at the verification boundary as
`route_not_renderable` → 403, and the payment boundary is never reached.

The dates settle which side is stale:

| | |
|---|---|
| `ae083fa3f ci(rcap): add reuse-only hosted checkout gate` | **2026-08-14** — wrote this case |
| `4db45d6d1 fix: enforce protected packet commerce authority` | 2026-08-26 |
| `9293bb61c fix: close packet verification race contracts` | **2026-08-26** — added the requirement |
| `1898a99eb Re-run the render preflight at render time` | 2026-09-18 |

The case was written twelve days before the requirement it now trips over. This
is the AGENTS.md case exactly: *"When a control breaks because the product moved
forward, update the control to model the real product. Never drag the product
backward to satisfy the old control."*

## Candidate-caused or pre-existing

**Neither, precisely: newly reached.** Not newly broken, and not something the
integration caused.

- The integration changed **no** `src/` file, so application behaviour is
  untouched by it, and the run reused the **same** Preview deployment
  `dpl_7fS5R3jKGRYeCCyuvafkoMfrkgpe` the prior run used. The application under
  test is byte-identical to run 35543063831's.
- The integration touched neither the seed nor this case:
  `git diff 9eb1d9f14 496720a05 -- scripts/rcap-hosted-checkout-gate.mjs`
  matches nothing on unpaid / insert / verification / packet_information.
- `record()` throws on the first failing case
  (`rcap-hosted-checkout-gate.mjs:97`). Run 35543063831 threw at
  `consumer_caller_profile_and_eligibility_mapping_exact`, which precedes this
  case, so `unpaid_render_returns_402` **was never reached there**.

The C1 repair unblocked the gate far enough to reach the next boundary. That is
the repair working, not a regression.

**Not claimed:** that this case passed in some earlier hosted run. It has not
been run to a verdict on this application within this sprint's evidence, and
saying more than that would be inventing a baseline.

## The repair, and its bounds — CODEX C1

The remaining C1 target is this one case. **Do not broaden the sweep.**

**Do:** give the seeded item a *genuine current final verification*, established
the way the application establishes one, so the unpaid render reaches the
payment boundary and the case proves what its name says — that an unpaid item is
refused **because it is unpaid**.

**Do not:**

- relax the assertion to accept 403, "any refusal", or a set of statuses. A 403
  is a refusal for the wrong reason; accepting it would leave the payment
  boundary untested while reporting that it passed;
- edit `consumer-render-request.ts`, reorder the verification and payment
  checks, or move the payment check earlier. The ordering is the product's
  deliberate design and the correct one — nothing about a packet may be derived
  from a payment;
- fabricate a verification row that imitates one without satisfying
  `requireCurrentPacketVerification` honestly. A seeded row that merely shaped
  itself past the check would make the case green and prove nothing;
- touch any other gate case, the PA refusal contract, the MS fixture identity,
  or any acceptance identity.

If a genuine verification cannot be established from the gate without changing
product code, **that is a `CAPTAIN HANDOFF`, not a workaround** — come back with
what is blocking rather than making the case pass.

Identities stay as they are: application `884ad51d0ad50c520ec0ba2834eac03194ce88ac`,
worker source `117b469c453a403fbd217f1c441a08c7c68f6b3a`, digest
`sha256:9faa24e8c6919c5801d5c38fd40d9476c4e54188fc7ab0087ba9eb711371b34f`,
Preview `dpl_7fS5R3jKGRYeCCyuvafkoMfrkgpe`, Supabase `hyflxnlhpmiqxvvcoiia`.
No rebuild, republish, new Preview, Stripe retarget or production action is
authorized for this repair.
