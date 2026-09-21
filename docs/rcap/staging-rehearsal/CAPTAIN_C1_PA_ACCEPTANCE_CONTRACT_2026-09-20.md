# Captain decision — PA Path A is a refusal case, not a Checkout journey

**Date:** 2026-09-20
**Decides:** the Codex C1 handoff from `hosted_full` run 35543063831
**Authority:** Roger Roman, 2026-09-20, on ADR-0004 and
`data/record-clearing/legal-decisions/2026-08-28-legacy-generator-retirement.json`
**Status:** Captain decision. Creates no approval, opens no route, authorizes no
production action.

## What was actually wrong

The gate was not red because the product broke. It was red because the
acceptance contract asks a retired route to behave like a live one.

`consumer_caller_profile_and_eligibility_mapping_exact` builds a render job
specification for `PA` / `Path A — Non-conviction expungement` and asserts the
specification carries a profile identity and version. Pennsylvania's legacy
generator is a retired commercial fulfillment path, so the resolver returns
`legacy_retired`, `buildRenderJobSpec` returns `spec: null`, and the two
operands the case reads off the specification are `undefined`.

Reproduced independently through the real builder and registry:

| operand | actual | expected | passed |
|---|---|---|---|
| `consumerProfileVersion` | `null` | `null` | yes |
| `consumerPacketType` | `custom_pleading` | `custom_pleading` | yes |
| `isConsumerPaymentAllowed` | `true` | `true` | yes |
| `compiledProfile.jurisdiction.code` | `PA` | `PA` | yes |
| `compiledPathway.label` | `Path A — Non-conviction expungement` | same | yes |
| `built.spec.profileVersion` | `(undefined)` | `2026-06-19-source-conversion-1` | **no** |
| `built.spec.profileId` | `(undefined)` | `PA` | **no** |

`specPresent: false`, `routeKind: legacy_retired`, and the resolver's own
reason: *"PA's legacy generator is retired as a commercial fulfillment path
(ADR-0004). It renders for historical access and migration comparison only, and
authorizes no checkout, sponsorship, credit or delivery."*

The product is saying exactly what ADR-0004 decided. The contract is what is
stale.

## The decision

PA `Path A — Non-conviction expungement` **remains commercially retired.** None
of the following is authorized, and none is a legitimate way to make this gate
pass:

- restoring the legacy renderer as commercial authority;
- making `buildRenderJobSpec` produce a specification for `legacy_retired`;
- creating a PA exception;
- weakening or relaxing the assertion;
- reopening PA so the Checkout gate can go green.

Per the retirement record: *"There is no state-specific commercial exception and
none may be created... Jurisdiction membership grants nothing. A route sells only
what a fulfillment record proves it delivers."*

## 1. The accepted negative contract for PA Path A

PA Path A becomes an explicit refusal case. It must prove, positively, that the
retirement holds:

| must prove | expected |
|---|---|
| route resolution | `routeKind === "legacy_retired"` |
| specification | `spec === null` |
| render job | no new render job is authorized |
| checkout | no Checkout is authorized from the retired legacy route |
| entitlement | no paid or sponsored entitlement is consumed |

This is a stronger case than the one it replaces. The old case could only fail
when PA misbehaved; the new one fails if PA is ever quietly un-retired, which is
the thing ADR-0004 actually cares about.

## 2. The exact fixture identity for the positive Checkout journey

Chosen from the canonical fulfillment registry, not from whatever passes.
`data/rcap-grade-a/fulfillment-authority-projection.json` carries six routes at
`COMPLETE_PACKET_PROVEN` / `commercially_eligible`. The positive journey uses
exactly this one:

| field | value |
|---|---|
| jurisdiction | `MS` |
| **pathwayId** — pass THIS to `buildRenderJobSpec` as `pathway` | `non-conviction-expungement-for-dismissal-no-disposition-or-acquittal` |
| pathwayLabel — assert separately as the compiled/user-facing label | `Non-conviction expungement for dismissal, no disposition, or acquittal` |
| routeId | `MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal` |
| trackId | `ms-nonconv` |
| packetSetId / packetFamilyId | `ms-nonconv-set` |
| profileVersion | `2026-06-19-source-conversion-1` |
| componentCount | 5 |

### Correction, 2026-09-21 — the builder takes the canonical ID, not the label

The row above originally said the **display label** was "what the gate passes as
`pathway`". **That was wrong**, and Codex was right to stop and ask rather than
implement it.

The existing PA case passes `PA_PATHWAY`, a display label, so the label looked
like the builder's route key. It is not. With the display label the real MS
builder resolves `legacy_retired`; with the canonical pathway ID plus
`trackId: "ms-nonconv"` it resolves the intended `factory_v2` route and the
exact `ms-nonconv-set`. The factory registry keys on the ID.

So: pass `non-conviction-expungement-for-dismissal-no-disposition-or-acquittal`
as `pathway`, pass `ms-nonconv` as `trackId`, and assert the display label as a
**separate** compiled/user-facing check rather than as the route key.

This is not a route substitution and changes no product behaviour. It is the
same exact Captain-selected route, identified the way the registry identifies
it. And it is **not** a licence to normalize labels in the resolver: the
resolver stays untouched, because changing the product to preserve a mistaken
acceptance instruction is the wrong direction of repair. The instruction is
amended forward; the mistaken sentence is left above so the correction is
legible rather than invisible.

**Why this one and not another.** It is the only candidate that is
simultaneously: current Grade-A proven for the exact route *and* packet family;
carried by the most recent owner artifact approval (Item 13B, superseded to v3
on 2026-09-20); and already demonstrated in a passing hosted Checkout journey —
Mississippi at 5000 cents, and again with `ACCEPTFREE100` cleared to 0. Choosing
a route with Grade-A authority but no hosted history would risk moving the
failure rather than removing it.

**Pass the `trackId`.** The current case passes `trackId: null`. The ADR-0004
fence is `LEGACY_VERIFIED.has(jurisdiction) && !migration && !productization`,
and `LEGACY_VERIFIED_JURISDICTIONS = ["MS", "IL", "DC", "PA", "TX"]` — so
Mississippi is behind the same fence Pennsylvania is. MS clears it through its
factory-v2 crosswalk row, and those accessors take
`(jurisdiction, pathwayId, trackId)`. Passing `ms-nonconv` rather than `null` is
what makes the pass deliberate instead of incidental.

**If MS surprises**, the structurally simplest fallback is
`WY:felony-conviction-expungement-w-s-7-13-1502` / `wy_fel_1502-set`, which is
Grade-A proven and is not behind the retirement fence at all — Wyoming is not in
`LEGACY_VERIFIED_JURISDICTIONS`. It has no hosted-journey history, which is why
it is the fallback and not the choice. Do not substitute any other route without
coming back.

## 3. The bounded product check — no defect found

The concern was that the eligibility adapter derives payment availability from
screening result and engine payment flags, which ADR-0004 says do not constitute
commercial authority — so PA Path A might offer `paymentAllowed=true` and a $50
price despite resolving `legacy_retired`.

**It does not.** The repair already exists in
`src/lib/expungement-ai/payment-adapter.ts`, and payment availability is a
conjunction of five conditions, not the screening predicate alone:

```
enabled = !deferred && canDeliver && fulfillmentProven && routeSellable
          && isConsumerPaymentAllowed(result.resultCode, result.paymentAllowed)
```

`routeSellable` is `isOperationallySellable(routeId)`, which is
`launch_graph_commercial_status` — Grade-A commercial admission, point 10 of 10.
Pennsylvania has **zero** Grade-A fulfillment records (the authority carries DC,
IL, MS, ND, OR and WY only), and an absent record is a refusal, so `routeSellable`
is false and the participant is shown *"No payment available for this result"*.

The adapter's own comment already names the trap this check was looking for:
`canDeliver` *"is true for all five ADR-0004 `legacy_retired` generators"*, and
the ledger `fulfillmentProven` reads is not a Grade-A record. `routeSellable` is
the guard that actually holds, and it was added for exactly this reason.

**So the gate operand misleads and should be read carefully.**
`isConsumerPaymentAllowed(consumerResultCode, true) === true` in the mapping case
is the screening predicate **in isolation** — one of five conjuncts. It is not
evidence that the product offers payment for PA Path A, and it must not be cited
as such. No product-side commercial-admission repair is handed to Codex, because
none is needed.

## What Codex may and may not change

May: the acceptance contract — replace the PA positive mapping case with the
negative refusal contract above, and add the positive journey on the exact MS
fixture identity.

May not: `buildRenderJobSpec`, the route resolver, the retirement fence, the
commercial-admission boundary, the assertion's strictness, or PA's commercial
status. If the negative contract cannot be expressed without touching one of
those, that is a `CAPTAIN HANDOFF`, not a workaround.

Identities are unchanged and no rebuild, republish, new Preview, Stripe retarget
or production action is authorized for this correction.
