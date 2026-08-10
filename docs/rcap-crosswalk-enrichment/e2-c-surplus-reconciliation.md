# E2-C — Individual Surplus-Pathway Reconciliation

Adjudication evidence for the six frozen surplus jobs `E2-C-ID`, `E2-C-LA`,
`E2-C-MS`, `E2-C-OK`, `E2-C-PA`, `E2-C-SD` from
`data/rcap-ledger/e2-evidence-jobs.json`, produced against the canonical
crosswalk at content hash `405c07ce5bf5cf3f` on dispatch base `72574ecc`.

This lane produces evidence only. The canonical crosswalk, the compiled
profiles, and the registry are untouched; Session E3 adjudicates these records
into the canonical artifact. No registry track was invented and no compiled
pathway was dropped. Every classification rests on committed repository
evidence — `externalOfficialEvidence` is empty on all 64 records.

## What changed since the first pass

The first Session E pass proved only quantity containment: each surplus fit
inside its jurisdiction's unresolved pool. This pass adjudicates **every
pathway in all six candidate pools individually** — 64 records — so the
surplus is accounted for as identity, and the arithmetic below is *derived*
from the individual records rather than asserted.

The decisive evidence class the first pass could not reach: the full registry
records on the integration branch carry **registry-declared branching** —
`dispositions` lists, `mechanism` text naming plural categories/routes/grounds,
and composed `units` — which licenses variant classification the
section-spine matcher correctly refused, plus **subsection-level operative
authority** (e.g. I.C. § 67-3004(10) vs (11)) that breaks section-level ties.

## Result by jurisdiction

| Juris | Delta | Exact 1:1 | Variants | Composed units | Routing | Registry gaps | Unresolved | Uncovered tracks | Derived delta | Reconciles | Surplus fully identified |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ID | +1 | 2 | 0 | 0 | 1 | 2 | 0 | 2 | +1 | yes | yes |
| LA | +2 | 4 | 5 | 0 | 0 | 0 | 1 | 2 | +2 | yes | no (1 unresolved) |
| MS | +4 | 7 | 0 | 2 | 0 | 2 | 1 | 0 | +4 | yes | no (1 unresolved) |
| OK | +8 | 4 | 12 | 0 | 0 | 2 | 0 | 2 | +8 | yes | yes |
| PA | +1 | 7 | 2 | 0 | 0 | 0 | 2 | 2 | +1 | yes | no (2 unresolved) |
| SD | +3 | 5 | 0 | 0 | 0 | 3 | 0 | 0 | +3 | yes | yes |
| **Total** | **+19** | **29** | **19** | **2** | **1** | **9** | **4** | **8** | **+19** | **yes** | **3 of 6** |

Derived delta = variant surplus + registry gaps + routing + unresolved −
uncovered registry tracks, computed only from the individual records. All six
match the canonical crosswalk's reported deltas.

## The four classification families

**Direct 1:1 (29).** Operative authority at subsection level, registry
disposition classes, or a mechanism unique on both sides. Examples: Idaho
§ 67-3004(10)↔(11) split; every SD statutory family; OK § 991c, § 60.18;
LA arts. 976, 977(D)/998, 985, 985.1; PA Rule 320, §§ 6308, 9122.1, 9122.2.

**Registry-licensed variants and composed units (21).** Never inferred —
each one cites the registry's own branch declaration:
- LA: `la-977.dispositions` names both misdemeanor grounds; `la-978.dispositions`
  names all three felony grounds including `felony_conviction_with_first_offender_pardon`.
- OK: each § 18/§ 19 track's `mechanism` names its plural categories (the
  non-conviction track names all four; the felony track names the
  reclassified-felony and one-felony routes verbatim); disposition classes
  align each pathway.
- MS: `ms-diversion` declares `compositionMode: alternative` with the two
  units the two compiled pathways implement.
- PA: `pa_age70_deceased` names both grounds in its legalName and mechanism.

**Registry gaps (9).** Substantive relief mechanisms the runtime carries but
the registry does not register, each with committed mechanism evidence:
ID § 20-525A (juvenile), ID § 67-3014 (trafficking vacatur), MS § 99-15-59,
MS HB 1546 trafficking vacatur (the registry pins the bill but registers no
track), OK 10A O.S. § 2-6-109 (juvenile), OK 22 O.S. § 19c (trafficking),
SD § 23A-27-53 (drug deferred disposition), SD juvenile sealing and SD
juvenile-trafficking expungement (substantive committed content; operative
SDCL citations still to pin). Gaps are recorded for the registry owner; none
changes the 497 denominator from this lane.

**Unresolved (4).** Each with exact missing evidence:
- `LA:human-trafficking-survivor-expungement-fee-exempt-route` — committed
  content is art. 983 fee-exemption material only; no operative relief
  authority anywhere.
- `MS:dui-nonadjudication` — no operative citation in the pathway (expected
  § 63-11-30(14)); the registered DUI track is the § 63-11-30(13) mechanism.
- `PA:path-a-non-conviction-expungement` — spans the registry's deliberate
  Rule 490 / Rule 790 split with no venue discriminator.
- `PA:path-k-human-trafficking-vacatur-expungement` — vacatur asserted on a
  secondary source only; no committed primary authority.

## Wyoming continuity

Verified unchanged, not reinterpreted: the canonical crosswalk's WY entry
(+2 fully identified as the § 6-2-708 and § 14-6-241 registry-scoped-out
pathways) still holds at projection commit `3b6f4c103d`.

## What this does not claim

A classification here is a statement about identity, not readiness. Nothing
in this lane makes any track implemented, certified, or terminal, and
`contributesTo497Denominator` is `false` on all 64 records — denominator
changes belong to the registry owner through the canonical source branch.
