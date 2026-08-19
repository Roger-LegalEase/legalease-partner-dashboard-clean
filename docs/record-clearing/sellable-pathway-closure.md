# Sellable pathway closure — window sellable-closure-w1

This is the second nationwide denominator. It does not replace or renumber the
497-track terminal-treatment ledger, which answers a different question and stays
at 497/497. This one answers: **does every pathway LegalEase intends to sell
actually produce a working paid packet?**

## Intended-sellable denominator

| Category | Pathways |
|---|---|
| `paid_packet_intended` | 284 |
| `non_filing_guidance` | 37 |
| `product_scope_exclusion` | 2 |
| `legally_unavailable` | 2 |
| `exact_external_deferral` | 0 |
| **total compiled pathways** | **325** |

Frozen denominator: **284** pathways, sha256 `a1f2f60e047ed56a…`

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

| Stage | Pathways | Shortfall against the denominator |
|---|---|---|
| `intendedSellablePathways` | 284 | — |
| `publiclyReachableSellablePathways` | 97 | **187** |
| `authoritativePacketReadyPathways` | 97 | **187** |
| `packetSpecCompletePathways` | 279 | **5** |
| `technicallyApprovedPacketPathways` | 114 | **170** |
| `legallyApprovedPacketPathways` | 52 | **232** |
| `successfullyRenderedPathways` | 220 | **64** |

**The invariant does not hold.** 6 of the six downstream stages fall short of the 284-pathway denominator (publiclyReachableSellablePathways, authoritativePacketReadyPathways, packetSpecCompletePathways, technicallyApprovedPacketPathways, legallyApprovedPacketPathways, successfullyRenderedPathways). Every shortfall below is an open blocker on an open paid pathway, not a completed treatment.

## Do not charge for guidance

**12 route(s) are payment-eligible in the evaluator and cannot deliver an artifact.** No participant is charged for them: `assertPacketRouteCanDeliver` in src/lib/expungement-ai/payment-adapter.ts shows them no price and refuses them at Checkout, and `npm run rcap:verify-money-gate-delivery` proves it over all 51 jurisdictions. What remains open is the disagreement itself — the evaluator still classifies these routes as sellable while nothing can produce their packet, so each one is an intended paid pathway with `renderer_unavailable` against it rather than a route that is finished.

| Pathway | Route kind | Why no artifact (and why no charge) |
|---|---|---|
| `AR:situation-b-misdemeanor-convictions` | `exact_supported_deferral` | resolver refused: routeKind=exact_supported_deferral |
| `CA:tool-3-petition-based-felony-sealing` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `CA:tool-4-arrest-record-sealing` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `ID:withheld-judgment-idaho-code-19-2604-review-branch` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NH:annulment-after-dismissal-acquittal-or-nonprosecution` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NJ:marijuana-hashish-expungement-under-n-j-s-a-2c-52-5-1-5-2-and-6-1` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NM:cannabis-sentence-dismissal-incarcerated-person-pathway` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NY:conditional-treatment-sealing-under-cpl-160-58` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `TN:pathway-1-free-non-conviction-expunction-under-tenn-code-40-32-101-a-40-32-106` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `TX:expunction-after-acquittal-not-guilty-disposition-chapter-55a` | `exact_supported_deferral` | resolver refused: routeKind=exact_supported_deferral |
| `WI:adult-conviction-expungement-under-wis-stat-973-015` | `guidance_only` | resolver refused: routeKind=guidance_only |

## Payment follows counsel, or it does not open

**46 payable route(s) carry no compiled counsel ratification** recording them as packet-capable and payable. The evaluator's ratified-route set and the compiled `lawrenceRatification` records disagree, and payment follows the wider of the two.

## Guidance substituted for a packet

99 track(s) record that the participant files a document of their own and are still served
a guidance, deferral or exclusion treatment. Under the controlling decision these are
temporary blockers on intended paid pathways, not completed product treatments.

| Stated cause of the stop | Tracks |
|---|---|
| `unfinished_implementation` | 66 |
| `undeclared` | 33 |

## Open blockers across the denominator

| Blocker | Pathways |
|---|---|
| `legal_review_pending` | 232 |
| `renderer_unavailable` | 64 |
| `route_metadata` | 53 |
| `gate_build` | 41 |
| `wait_anchor_fix` | 31 |
| `legal_reconfirmation` | 27 |
| `intake_fix` | 18 |
| `filing_determination_missing` | 15 |
| `not_paid_product` | 14 |
| `packet_spec_incomplete` | 5 |
| `legal_action_required` | 2 |
| `unclassified_route` | 1 |

**44 of 284** intended-sellable pathways are closed with no open blocker.

## Closure map

What is actually left to do, by the exact combination of blockers a pathway
carries. A pathway appears in exactly one row, so the rows are the work.

| Open blockers | Pathways | Jurisdictions |
|---|---|---|
| **none — closed** | 44 | AR, CA, CO, CT, DC, GA, IA, IL, KS, KY, MD, MN +6 |
| `legal_review_pending` | 41 | AK, AL, AZ, DE, FL, HI, IL, IN, LA, MA, ME, MI +18 |
| `gate_build + legal_review_pending` | 38 | CO, FL, GA, IA, IL, KS, MD, MI, NC, ND, NH, NJ +10 |
| `legal_review_pending + route_metadata` | 37 | AK, AL, AZ, FL, GA, ID, MA, MN, NC, NH, NV, OK +6 |
| `legal_review_pending + wait_anchor_fix` | 22 | MI, MT, NH, NM, NV, OH, OK, RI, SC, TX, VT, WA +1 |
| `legal_reconfirmation + legal_review_pending` | 20 | GA, IN, KY, LA, MA, ME, MO, NE, NJ, OR, PA, TN |
| `legal_review_pending + renderer_unavailable + route_metadata` | 16 | AK, DE, LA, ME, MN, NE, NV, OH, SC, SD, TX, UT +1 |
| `intake_fix + legal_review_pending + renderer_unavailable` | 10 | ID, NV, OH, OK, RI, SD, WI, WV |
| `legal_review_pending + renderer_unavailable + wait_anchor_fix` | 9 | CO, MD, NH, NV, OK, RI, VT, WA, WV |
| `intake_fix + legal_review_pending` | 8 | FL, KS, LA, ME, MI, NE, PA, WA |
| `renderer_unavailable` | 7 | AR, CA, ND, NJ, NM, WI |
| `legal_reconfirmation + legal_review_pending + renderer_unavailable` | 7 | MD, MO, ND, NM, SD, WI |
| `filing_determination_missing + legal_review_pending + not_paid_product` | 6 | DE, LA, NE, OK, PA, WV |
| `legal_review_pending + renderer_unavailable` | 5 | ID, NH, NY, TN, TX |
| `filing_determination_missing + legal_review_pending + not_paid_product + packet_spec_incomplete + renderer_unavailable` | 3 | AK, SC, WI |
| `gate_build + legal_review_pending + renderer_unavailable` | 3 | KY, SD, WV |
| `filing_determination_missing + legal_review_pending + not_paid_product + renderer_unavailable` | 3 | ME, SD, UT |
| `filing_determination_missing + legal_action_required + legal_review_pending` | 2 | HI |
| `legal_review_pending + not_paid_product + packet_spec_incomplete + renderer_unavailable` | 1 | AK |
| `filing_determination_missing + legal_review_pending + not_paid_product + packet_spec_incomplete` | 1 | CT |
| `unclassified_route` | 1 | MD |

The largest single lever is the renderer. **7** pathway(s) across **6**
jurisdictions (AR, CA, ND, NJ, NM, WI) carry no blocker other than `renderer_unavailable`:
they are payment-eligible, counsel-ratified and packet-spec complete, and the only
thing between them and a delivered packet is a certified renderer for their
jurisdiction. Nothing about them needs a legal decision or a classification change.

Going the other way, **176** pathway(s) in AK, AL, AZ, CO, CT, DE, FL, GA, HI, IA, ID, IL, IN, KS, KY, LA, MA, MD, ME, MI, MN, MO, MT, NC, ND, NE, NH, NJ, NM, NV, NY, OH, OK, OR, PA, RI, SC, SD, TN, TX, UT, VA, VT, WA, WI, WV, WY already produce a packet
while carrying an open blocker. Every one of them carries `legal_review_pending`:
these routes render and sell today on a compiled profile that records no counsel
ratification for them.

## Pathways with no row in route-product-metadata.json

- `MD:pardoned-conviction-expungement-under-crim-proc-10-105-a-8`

Regenerate with `npm run rcap:generate-sellable-closure`; verify with `npm run rcap:verify-sellable-closure`.
