# Sellable pathway closure — window sellable-closure-w1

This is the second nationwide denominator. It does not replace or renumber the
497-track terminal-treatment ledger, which answers a different question and stays
at 497/497. This one answers: **does every pathway LegalEase intends to sell
actually produce a working paid packet?**

## Intended-sellable denominator

| Category | Pathways |
|---|---|
| `paid_packet_intended` | 262 |
| `non_filing_guidance` | 59 |
| `product_scope_exclusion` | 16 |
| `legally_unavailable` | 2 |
| `exact_external_deferral` | 0 |
| **total compiled pathways** | **339** |

Frozen denominator: **262** pathways, sha256 `8748b29cf5523340…`

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
| `intendedSellablePathways` | 262 | — |
| `publiclyReachableSellablePathways` | 78 | **184** |
| `authoritativePacketReadyPathways` | 79 | **183** |
| `packetSpecCompletePathways` | 255 | **7** |
| `technicallyApprovedPacketPathways` | 108 | **154** |
| `legallyApprovedPacketPathways` | 79 | **183** |
| `successfullyRenderedPathways` | 192 | **70** |

**The invariant does not hold.** 6 of the six downstream stages fall short of the 262-pathway denominator (publiclyReachableSellablePathways, authoritativePacketReadyPathways, packetSpecCompletePathways, technicallyApprovedPacketPathways, legallyApprovedPacketPathways, successfullyRenderedPathways). Every shortfall below is an open blocker on an open paid pathway, not a completed treatment.

## Do not charge for guidance

**15 route(s) are payment-eligible in the evaluator and cannot deliver an artifact.** No participant is charged for them: `assertPacketRouteCanDeliver` in src/lib/expungement-ai/payment-adapter.ts shows them no price and refuses them at Checkout, and `npm run rcap:verify-money-gate-delivery` proves it over all 51 jurisdictions. What remains open is the disagreement itself — the evaluator still classifies these routes as sellable while nothing can produce their packet, so each one is an intended paid pathway with `renderer_unavailable` against it rather than a route that is finished.

| Pathway | Route kind | Why no artifact (and why no charge) |
|---|---|---|
| `AR:situation-b-misdemeanor-convictions` | `exact_supported_deferral` | resolver refused: routeKind=exact_supported_deferral |
| `CA:tool-3-petition-based-felony-sealing` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `CA:tool-4-arrest-record-sealing` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `CO:petition-based-non-conviction-sealing-jdf-417-24-72-704` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `CT:petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `ID:withheld-judgment-idaho-code-19-2604-review-branch` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `MD:police-record-expungement-when-no-charge-was-filed-under-10-103` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59` | `packet_correction_required` | resolver refused: routeKind=packet_correction_required |
| `ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NH:annulment-after-dismissal-acquittal-or-nonprosecution` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NM:cannabis-sentence-dismissal-incarcerated-person-pathway` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NY:conditional-treatment-sealing-under-cpl-160-58` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `TN:pathway-1-free-non-conviction-expunction-under-tenn-code-40-32-101-a-40-32-106` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `TX:expunction-after-acquittal-not-guilty-disposition-chapter-55a` | `exact_supported_deferral` | resolver refused: routeKind=exact_supported_deferral |
| `WI:adult-conviction-expungement-under-wis-stat-973-015` | `guidance_only` | resolver refused: routeKind=guidance_only |

## Payment follows counsel, or it does not open

Every payable route carries a compiled counsel ratification recording it as packet-capable and payable.

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
| `legal_review_pending` | 183 |
| `renderer_unavailable` | 70 |
| `route_metadata` | 47 |
| `gate_build` | 36 |
| `not_paid_product` | 35 |
| `legal_reconfirmation` | 29 |
| `wait_anchor_fix` | 17 |
| `intake_fix` | 17 |
| `filing_determination_missing` | 10 |
| `packet_spec_incomplete` | 7 |
| `legal_action_required` | 2 |

**63 of 262** intended-sellable pathways are closed with no open blocker.

## Closure map

What is actually left to do, by the exact combination of blockers a pathway
carries. A pathway appears in exactly one row, so the rows are the work.

| Open blockers | Pathways | Jurisdictions |
|---|---|---|
| **none — closed** | 63 | AK, AR, AZ, CA, DC, DE, FL, GA, HI, IA, IL, IN +26 |
| `gate_build + legal_review_pending` | 33 | FL, GA, IA, KS, MD, MI, NC, ND, NH, NJ, OH, OK +8 |
| `legal_review_pending + route_metadata` | 30 | AL, AZ, GA, ID, KS, MN, MS, NC, NH, NV, OK, SC +4 |
| `legal_review_pending + not_paid_product` | 21 | AK, AL, AR, DC, FL, ID, IL, KY, LA, MA, MD, ME +1 |
| `legal_reconfirmation + legal_review_pending` | 18 | GA, IN, KY, LA, MA, MO, OH, RI, SC, TN, WA, WV |
| `legal_review_pending + renderer_unavailable + route_metadata` | 17 | AK, DE, GA, LA, MA, ME, NE, NV, OH, SC, SD, TX +2 |
| `renderer_unavailable` | 16 | AR, CA, CO, CT, ID, MD, MS, ND, NH, NM, NY, OR +3 |
| `legal_review_pending + wait_anchor_fix` | 14 | MI, NH, NM, NV, OH, OK, RI, SC, TX, VT, WA |
| `legal_reconfirmation + legal_review_pending + renderer_unavailable` | 11 | NE, NH, NJ, NV, OK, OR, RI, SD, WA, WI |
| `intake_fix + legal_review_pending + renderer_unavailable` | 10 | ID, NV, OH, OK, RI, SD, WI, WV |
| `intake_fix + legal_review_pending` | 7 | FL, KS, LA, MI, NE, WA |
| `legal_review_pending + not_paid_product + packet_spec_incomplete + renderer_unavailable` | 4 | AK, MN, MS |
| `filing_determination_missing + legal_review_pending + not_paid_product` | 4 | DE, LA, NE, OK |
| `filing_determination_missing + legal_review_pending + not_paid_product + packet_spec_incomplete + renderer_unavailable` | 3 | AK, CT, WI |
| `gate_build + legal_review_pending + renderer_unavailable` | 3 | CO, SD, WV |
| `legal_review_pending + renderer_unavailable + wait_anchor_fix` | 3 | CO, VT, WV |
| `filing_determination_missing + legal_action_required + legal_review_pending` | 2 | HI |
| `legal_review_pending + not_paid_product + renderer_unavailable` | 2 | KY, MD |
| `filing_determination_missing + legal_review_pending + not_paid_product + renderer_unavailable` | 1 | ME |

The largest single lever is the renderer. **16** pathway(s) across **15**
jurisdictions (AR, CA, CO, CT, ID, MD, MS, ND, NH, NM, NY, OR, TN, TX, WI) carry no blocker other than `renderer_unavailable`:
they are payment-eligible, counsel-ratified and packet-spec complete, and the only
thing between them and a delivered packet is a certified renderer for their
jurisdiction. Nothing about them needs a legal decision or a classification change.

Going the other way, **129** pathway(s) in AK, AL, AR, AZ, DC, DE, FL, GA, HI, IA, ID, IL, IN, KS, KY, LA, MA, MD, ME, MI, MN, MO, MS, NC, ND, NE, NH, NJ, NM, NV, OH, OK, OR, RI, SC, TN, TX, UT, VT, WA, WI, WV already produce a packet
while carrying an open blocker. Every one of them carries `legal_review_pending`:
these routes render and sell today on a compiled profile that records no counsel
ratification for them.

Regenerate with `npm run rcap:generate-sellable-closure`; verify with `npm run rcap:verify-sellable-closure`.
