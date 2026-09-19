# 132 — what the consumer boundary actually admits

`verify-rcap-grade-a-fulfillment-hardening` reports:

> the shipped registry admits only the five exact evidence-complete
> productized records: `MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal`
> was unexpectedly admitted at `consumer_checkout`

The phrase reads as over-admission at a consumer boundary. It is not one.
But the check is not merely stale either: measured against the runtime, its
five-route allowlist is **wrong in both directions**, and chasing that down
found a route nobody can sell.

## The question

> Can a route reach a real consumer checkout without the authority to be sold?

**No.** Every route the runtime admits at a money surface is admitted by an
explicit, hash-pinned owner decision, and one route the allowlist *expects* to
be sellable cannot transact at all.

## Measured, not inferred

Two vocabularies are in play and they are not interchangeable. The hardening
check drives `admitCommercialAction` with a `CommercialAdmissionPoint`
(`consumer_checkout`, `packet_credit_admission`, …). The runtime money gate is
`packetFulfillmentAuthority`, whose `PacketFulfillmentSurface` is a different
set of strings (`"checkout creation"`, `"packet credit consumption"`, …). A
first pass at this measured the second with the first's values; an unrecognised
surface skips the posture and artifact-approval gates, so it reported five
routes as allowed everywhere. Those numbers were an artefact of the probe.

Re-measured with each route's own registered `trackId` — the binding a real
caller holds — and the correct surface vocabulary, across all fourteen registry
records:

| route | checkout creation | consumer payment | sponsored entitlement | packet credit consumption |
|---|---|---|---|---|
| `DC:dc_actual_innocence_expungement_16_803` | allow | allow | allow | allow |
| `IL:felony-prostitution-relief` | allow | allow | allow | allow |
| `MS:additional-justice-court-misdemeanor-relief-9-11-15-3` | allow | allow | allow | allow |
| **`MS:additional-municipal-court-misdemeanor-relief-21-23-7-6`** | **refuse** | **refuse** | **refuse** | **refuse** |
| **`MS:non-conviction-…-acquittal`** | **allow** | **allow** | **refuse** | **refuse** |
| `WY:felony-conviction-expungement-w-s-7-13-1502` | allow | allow | allow | allow |
| the remaining 8 (ND×5, OR×3) | refuse | refuse | refuse | refuse |

## Finding 1 — MS:non-conviction is authorized, and only for the consumer channel

Its consumer admission is not an accident of a missing check. It comes from a
named owner decision, `data/record-clearing/legal-decisions/2026-09-14-ms-nonconv-paid-consumer-successor.json`,
enforced by `msPaidSuccessorConsumerScope` in
`src/lib/rcap/fulfillment/paid-consumer-successor.ts`, which refuses the
successor outright unless every one of these holds:

- `status: APPROVED_EXACT_PAID_CONSUMER_SUCCESSOR`, `owner: Roger Roman`,
  `decidedAt: 2026-09-14`, `consumerPaidAuthorized: true`
- `productionAuthorized: false`, `legacyRetirementPreserved: true`,
  `packetContentsChanged` / `eligibilityChanged` / `legalTreatmentChanged` /
  `paymentSecurityWaived` / `technicalAcceptanceWaived` all `false`
- three preserved evidence files matching their recorded SHA-256 **byte for
  byte** — the specification, the artifacts ledger and the participant-delivery
  raster review. One changed byte and the predicate returns null.

It is scoped to the channel and nothing else. The decision does not touch the
sponsored posture, and the measurement agrees: `consumerPosture: open`,
`sponsoredPosture: held`, so `sponsored entitlement` and `packet credit
consumption` refuse.

**This also closes the residual 22A left open.** 22A could not tell whether a
caller supplying the real fulfillment binding would get through, because the
census probe supplied none. Supplying the route's real `trackId`: still
refused at `packet credit consumption`. No sponsored credit can be consumed
for this route, with or without the binding.

## Finding 2 — an owner-approved route that cannot sell

`MS:additional-municipal-court-misdemeanor-relief-21-23-7-6` is in the
hardening allowlist, holds a Grade-A record at the same version 23 as the other
four, and is covered by owner artifact approval
`OWN-ARTIFACT-REREVIEW-MS-MISD-ADDL-2026-09-14`. The runtime refuses it at
every surface, including free ones.

The cause is exact. Both MS "additional misdemeanor relief" routes share one
registered specification and one track:

```
MS-additional-misdemeanor-relief.v1.json
  routeKey     MS:additional-justice-court-misdemeanor-relief-9-11-15-3
  pathwayId    additional-justice-court-misdemeanor-relief-9-11-15-3
  trackId      ms-misd-addl
  packetFamily ms-misd-addl-set
```

`consumerSpecificationBinding` requires `specification.pathwayId ===
record.pathwayId`. The municipal record's pathwayId is
`additional-municipal-court-misdemeanor-relief-21-23-7-6`, so the binding
returns null and the route is refused before any posture or price is consulted.

One specification can name one pathway. Two routes were approved against it,
and only the one it names can transact.

This is fail-closed and therefore not a money risk. It is a **release-accuracy
defect**: an owner-approved route counted in the sellable set that silently
delivers nothing. It must be resolved by deciding which is true — the municipal
route needs its own registered specification, or it was never a separate
sellable route — and not by relaxing the pathway check.

## Finding 3 — the control's allowlist is wrong in both directions

`verify-rcap-grade-a-fulfillment-hardening` hard-codes five route IDs. Against
the runtime it both **over-expects** (`MS:additional-municipal-…`, which cannot
transact) and **under-expects** (`MS:non-conviction-…`, which is explicitly
authorized). It has not followed either fact forward.

The check's real invariant is not "these five strings". It is: *the registry
admits exactly the routes an owner decision authorizes, and nothing else.* The
repair has to derive the expected set from the owner decisions rather than
restate a literal — the same defect shape as the D-track queue's "expected 67".
It must not be repaired by adding MS:non-conviction to the array.

## What must not be done

- Do not add a route to the allowlist to make this green. The literal is the
  defect.
- Do not relax `consumerSpecificationBinding`'s pathway check to let the
  municipal route bind. One specification names one pathway; that is the
  property keeping a packet bound to the route it was approved for.
- Do not read Finding 1 as clearing anything beyond the consumer channel.
  `productionAuthorized` is `false` in the owner decision, and the sponsored
  posture is untouched and held.

## Provenance

Red identically at the accepted Production baseline `8682bd007`. As everywhere
else in this sweep, that establishes chronology, not safety.
