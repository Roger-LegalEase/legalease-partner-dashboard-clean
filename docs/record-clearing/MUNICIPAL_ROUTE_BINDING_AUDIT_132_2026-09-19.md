# 132 — the municipal route's specification binding

`MS:additional-municipal-court-misdemeanor-relief-21-23-7-6` holds owner
approval, a v23 Grade-A record and a place in the intended commercial set, and
the runtime refuses it at every surface on a pathway-id mismatch.

## Classification

**`SHARED_SPEC_EXPLICITLY_AUTHORIZED`.**

Not inferred from similarity. The specification says so in its own words, the
schema carries a field for exactly this relationship, the statutes are named as
parallel provisions, and the owner decision names both routes. The defect is
that one binding check reads a singular field where the schema carries a plural
one.

## The facts, in order

### 1. What owner decision authorized the municipal route

`OWN-ARTIFACT-REREVIEW-MS-MISD-ADDL-2026-09-14`
(`data/rcap-grade-a/legal-decisions/OWNER_ARTIFACT_REREVIEW_MS_ADDITIONAL_MISDEMEANOR_2026-09-14.json`),
decision `APPROVED_EXACT_SHIPPING_ARTIFACTS`, family `ms-misd-addl-set`,
`routeIds` listing **both** routes explicitly.

It follows a rejection the same day, `OWN-REJECT-MS-MISD-ADDL-2026-09-14`:
`REJECT_CURRENT_PAIR_REQUIRE_LAYOUT_ONLY_REPAIR`, because *"the explanatory
parenthetical is separated from the signature block onto a mostly empty page
4."* The re-review approves the repair — leading reduced 14.5pt → 13pt, the
parenthetical moved up onto page 3, the empty page eliminated.

### 2. Does it identify the municipal route, or infer it?

It names it, and it approves **bytes**:

> "I approve the repaired current shipping pair for ms-misd-addl-set. This
> approval is limited to these exact artifact digests. Any future
> shipping-artifact digest change requires fresh exact-hash re-review and does
> not inherit this approval."

with `routeTreatmentChanged: false`, `eligibilityChanged: false`,
`operativeReliefChanged: false`, `productionAuthorized: false`,
`runtimeAuthorized: false`. So it is not the decision that creates a municipal
packet treatment. That decision is the specification.

### 3–4. Are the two routes' requirements identical, or merely similar?

`data/record-clearing/packet-specifications/MS-additional-misdemeanor-relief.v1.json`
answers this directly:

- `statutoryAuthority.primary`: **"Miss. Code Ann. §§ 9-11-15(3) and 21-23-7(6)"**
- `ruleStatement`: *"The **parallel provisions** give the justice court or
  municipal court discretionary power to expunge any or all misdemeanor
  convictions **in that same court** after an open-court showing of
  rehabilitation, good conduct for two years since the last conviction in any
  court, and the best interest of society."*
- `pathwayLabel`: "Additional justice-court **or** municipal-court misdemeanor relief"
- `filingDestination`: *"File with the clerk of the justice court or municipal
  court in which the convictions were entered. A participant with convictions in
  two courts needs two petitions."*
- `doNotImport`: *"Do not merge convictions from different courts into one
  petition; each court reaches only its own misdemeanor convictions."*

The relief, the showing, the two-year clock, the components and the service are
the same; what differs is the **venue and section**, and the specification
handles that as a venue branch rather than as a second packet.

### 5. Does a municipal-specific specification exist elsewhere?

No, and the specification says one must not:

> "This one family specification enumerates exactly the parallel justice-court
> and municipal-court runtime routes. It binds the existing five-component
> census-v1 family and its adopted canonical and boundary hashes. The venue
> branch selects the court and section; **it does not create a third route,
> authorize a sibling Mississippi route, or grant fulfillment or commercial
> authority.**"

### 6. Was the v23 record built against municipal evidence or the shared spec?

Both, correctly. Each route's record cites the shared specification
(`ms-additional-misdemeanor-relief` v1.0.0, file digest `e870e694…`) and the
owner-approved canonical (`artifactValidation.artifactSha256 = c2938658…`), and
each carries its **own** fixture digest — `0ed90f68…` for justice court,
`9b7b0fa2…` for municipal. The municipal record is not a copy.

### 7. What the schema provides, and what the binding reads

The specification declares the relationship in a dedicated field:

```json
"routeKey":  "MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
"routeKeys": [
  "MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
  "MS:additional-municipal-court-misdemeanor-relief-21-23-7-6"
]
```

The specification registry already honours it —
`packetSpecificationFor("MS:additional-municipal-…")` resolves this
specification, and `packetSpecificationForTrack` passes because both routes
share track `ms-misd-addl`.

`consumerSpecificationBinding` in
`src/lib/rcap/fulfillment/consumer-specification-binding.ts` does not:

```ts
|| specification.pathwayId !== record.pathwayId
```

`specification.pathwayId` is the singular justice-court value. The municipal
record's `pathwayId` is `additional-municipal-court-misdemeanor-relief-21-23-7-6`,
so the binding returns null and the route is refused before any posture, price
or approval is consulted. Every other clause passes.

That single comparison is the whole defect. It is not that two pathway IDs are
being forced onto one specification; it is that the field the schema provides for
this relationship is not the field the check reads.

### 8. What counts the route as commercially available

The Grade-A registry: the municipal record is one of the six
`commercially_eligible` records, and `admitCommercialAction` admits it at every
commercial admission point. Only the runtime binding refuses it. The
hardening control's five-route allowlist also expects it to be sellable.

## The ordering constraint — read this before fixing the binding

Fixing `consumerSpecificationBinding` is not cosmetic. The registry already
marks the municipal record commercially eligible, so honouring `routeKeys` would
**open consumer checkout for this route**.

It must not open while this is true:

```
fixtures/canonical.pdf on disk          c2938658…   (owner APPROVED)
product-wiring acceptanceReceipt bound  3c7588be…   (owner REJECTED)
verdict                                 RASTER_PASS
acceptanceReceiptWithdrawn              absent
```

The family carries a **live RASTER_PASS naming the exact bytes the owner
rejected**, and it was never withdrawn. This is the single remaining receipt
drift in the repository — it is the subject step 144's derived scan found, and
its digest is the one preserved in the rejection record.

So the raster acceptance for `ms-misd-addl-set` attests a layout the owner
refused. Opening the municipal route before that receipt is withdrawn and
re-issued against `c2938658…` would sell a packet whose acceptance evidence
names rejected bytes.

Order of operations:

1. Withdraw the stale receipt and re-raster against the approved canonical, per
   the governance-preservation rule that already exists for exactly this case.
2. Only then correct `consumerSpecificationBinding` to honour `routeKeys`.

## What must not be done

- Do not relax the pathway check. One specification naming one pathway is the
  property that keeps a packet bound to the route it was approved for; the fix
  is to read `routeKeys`, which is a declared enumeration, not to stop
  comparing.
- Do not clone the specification under a municipal identifier. The specification
  forbids creating a sibling route in terms.
- Do not withdraw the municipal route's approved status. The authority for it is
  explicit and current.
- Do not correct the binding first. See the ordering constraint above.

## Gate

Diagnosis and recording only. `comparedInputs: 30`, `changedPaths: []`,
`rebuildRequired: false`. Correcting the binding changes
`src/lib/rcap/fulfillment/` — a worker-image input — so the gate must be
reassessed when that lands.
