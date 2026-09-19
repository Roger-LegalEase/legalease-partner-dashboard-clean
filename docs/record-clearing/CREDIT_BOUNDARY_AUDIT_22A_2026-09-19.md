# 22A — credit boundary audit

Opened because `verify-rcap-census-v1-money-credit-gate` reports five
`creditConsumable:false` routes reaching packet-credit accounting. The
question is not why the verifier is red. It is:

> Can any route with `creditConsumable:false` cause a participant or sponsor
> credit to be reserved, decremented, consumed, recorded as consumed, or
> otherwise commercially exercised?

**No. Not for any of the five, and not by a rollback — the credit-side call is
never made.**

## The five routes

```
DC:dc_actual_innocence_expungement_16_803
MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal
MS:additional-justice-court-misdemeanor-relief-9-11-15-3
MS:additional-municipal-court-misdemeanor-relief-21-23-7-6
WY:felony-conviction-expungement-w-s-7-13-1502
```

## What the runtime actually returns

Measured by driving `finalizeSponsoredPacketGeneration` — the real function,
through the census's own harness — and reading every field of the result:

| field | all five routes |
|---|---|
| `ok` | `false` |
| `countedAs` | `"not_counted"` |
| `recorded` | `false` |
| `consumed` / `ledgerEventId` / `consumptionId` | **absent — the result object has no such key** |

The result carries exactly four keys: `ok`, `recorded`, `countedAs`, `error`.
There is no consumption identifier, no ledger event, and nothing counted.

## Why no side effect is possible

The gate order inside `finalizeSponsoredPacketGeneration`
(`src/lib/expungement-ai/rcap-slot-lifecycle.ts`):

1. `if (!input.admission)` → refuse
2. `governCommercialAdmission("packet_credit_admission", …)` → refuse on throw
3. `assertPacketFulfillmentProven(…, "packet credit consumption")` ← **the five
   are refused here**
4. `assertExpectedPacketVerificationHash(…)`
5. `getSupabaseAdminClient()` ← first touch of the database client
6. `supabase.rpc("finalize_sponsored_packet_generation_if_verified", …)` ←
   the only mutation

The refusal at step 3 returns before step 5. **The Supabase client is never
obtained and the RPC is never called**, so there is no reservation, no
decrement, no ledger write and nothing to roll back. This is not atomicity
saving us after the fact; the credit-side call does not happen.

The code says so itself at step 1: *"Strictly before the RPC that consumes the
credit. A credit spent on an unproven route is a credit the partner cannot get
back."*

## Classification

All five: **`REFUSED_BEFORE_CREDIT_SIDE_EFFECT`**.

## So why is the verifier red?

Because its invariant is stricter than "no credit moved", and deliberately so.
It requires all three of:

```js
credit.ok === false
credit.countedAs === "not_counted"
String(credit.error).startsWith("packet_credit_admission refused (")
```

The first two hold. The third does not: these five are refused by the
**fulfillment-binding** gate at step 3, not by the **admission** gate at
step 2. The verifier is asserting *which gate* refuses, not merely that
something did.

That distinction is the finding, and it is the same shape as the routeKind
one: the gate named in the invariant is not the gate doing the work.
`packet_credit_admission` admits these five — the census records the same five
as reserving sponsored entitlement — and the only thing standing between them
and the RPC is the fulfillment check behind it.

## The residual concern, stated precisely

Today the fulfillment gate refuses all five with *"cannot prove it delivers the
packet it promises (missing exact fulfillment binding)"*. The census drives
with a synthetic context that supplies **no `trackId` and no packet family**, so
that refusal is partly a property of the probe.

`MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal` is in
this list and is the route this release exists for. It does hold a Grade-A
fulfillment record. A caller that supplies the exact binding the census omits
would pass step 3 — and step 2 already admits. **What refuses this route today
is the absence of a binding in the probe, not the admission gate.**

That is not a proven defect: packet credits are the partner/sponsored
mechanism and the consumer path for MS is Stripe checkout, not credits. But
the question "can a sponsored credit be consumed for a route the resolver
calls `creditConsumable:false`, when a real binding is supplied" is not
answered by this audit, and it is the question worth answering next.

## What must not be done

- Do not widen or weaken the verifier so the fulfillment refusal counts as an
  admission refusal. The whole value of the assertion is that it names the gate.
- Do not change `creditConsumable` on any of the five to make the census agree.
- Neither the absence of a side effect today nor the pre-existence of the
  condition at the accepted baseline `8682bd007` authorises either.

## Provenance

Red identically at the accepted Production baseline `8682bd007`, so nothing in
this branch introduced it. As with every other item in this sweep, that
establishes chronology, not safety.
