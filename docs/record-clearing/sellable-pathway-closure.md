# Sellable pathway closure — window sellable-closure-w1

This is the second nationwide denominator. It does not replace or renumber the
497-track terminal-treatment ledger, which answers a different question and stays
at 497/497. This one answers: **does every pathway LegalEase intends to sell
actually produce a working paid packet?**

## Intended-sellable denominator

| Category | Pathways |
|---|---|
| `paid_packet_intended` | 271 |
| `non_filing_guidance` | 47 |
| `product_scope_exclusion` | 16 |
| `legally_unavailable` | 2 |
| `exact_external_deferral` | 0 |
| **total compiled pathways** | **336** |

Frozen denominator: **271** pathways, sha256 `ceac7d9c76b96989…`

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
| `intendedSellablePathways` | 271 | — |
| `publiclyReachableSellablePathways` | 80 | **191** |
| `authoritativePacketReadyPathways` | 80 | **191** |
| `packetSpecCompletePathways` | 254 | **17** |
| `technicallyApprovedPacketPathways` | 116 | **155** |
| `legallyApprovedPacketPathways` | 50 | **221** |
| `successfullyRenderedPathways` | 202 | **69** |

**The invariant does not hold.** 6 of the six downstream stages fall short of the 271-pathway denominator (publiclyReachableSellablePathways, authoritativePacketReadyPathways, packetSpecCompletePathways, technicallyApprovedPacketPathways, legallyApprovedPacketPathways, successfullyRenderedPathways). Every shortfall below is an open blocker on an open paid pathway, not a completed treatment.

## Do not charge for guidance

**13 route(s) are payment-eligible in the evaluator and cannot deliver an artifact.** No participant is charged for them: `assertPacketRouteCanDeliver` in src/lib/expungement-ai/payment-adapter.ts shows them no price and refuses them at Checkout, and `npm run rcap:verify-money-gate-delivery` proves it over all 51 jurisdictions. What remains open is the disagreement itself — the evaluator still classifies these routes as sellable while nothing can produce their packet, so each one is an intended paid pathway with `renderer_unavailable` against it rather than a route that is finished.

| Pathway | Route kind | Why no artifact (and why no charge) |
|---|---|---|
| `AR:situation-b-misdemeanor-convictions` | `exact_supported_deferral` | resolver refused: routeKind=exact_supported_deferral |
| `CA:tool-3-petition-based-felony-sealing` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `CA:tool-4-arrest-record-sealing` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `ID:withheld-judgment-idaho-code-19-2604-review-branch` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `MD:police-record-expungement-when-no-charge-was-filed-under-10-103` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NH:annulment-after-dismissal-acquittal-or-nonprosecution` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NM:cannabis-sentence-dismissal-incarcerated-person-pathway` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NY:conditional-treatment-sealing-under-cpl-160-58` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `SC:diversion-or-program-completion-expungement` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `TN:pathway-1-free-non-conviction-expunction-under-tenn-code-40-32-101-a-40-32-106` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `TX:expunction-after-acquittal-not-guilty-disposition-chapter-55a` | `exact_supported_deferral` | resolver refused: routeKind=exact_supported_deferral |
| `WI:adult-conviction-expungement-under-wis-stat-973-015` | `guidance_only` | resolver refused: routeKind=guidance_only |

## Payment follows counsel, or it does not open

**40 payable route(s) carry no compiled counsel ratification** recording them as packet-capable and payable. The evaluator's ratified-route set and the compiled `lawrenceRatification` records disagree, and payment follows the wider of the two.

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
| `legal_review_pending` | 221 |
| `renderer_unavailable` | 69 |
| `route_metadata` | 45 |
| `not_paid_product` | 44 |
| `gate_build` | 36 |
| `legal_reconfirmation` | 29 |
| `wait_anchor_fix` | 19 |
| `packet_spec_incomplete` | 17 |
| `intake_fix` | 16 |
| `filing_determination_missing` | 11 |
| `legal_action_required` | 2 |

**34 of 271** intended-sellable pathways are closed with no open blocker.

## Closure map

What is actually left to do, by the exact combination of blockers a pathway
carries. A pathway appears in exactly one row, so the rows are the work.

| Open blockers | Pathways | Jurisdictions |
|---|---|---|
| **none — closed** | 34 | AR, CA, CO, CT, DC, GA, IA, IL, KS, MD, MN, MS +6 |
| `gate_build + legal_review_pending` | 34 | CO, FL, GA, IA, KS, MD, MI, NC, ND, NH, NJ, OH +9 |
| `legal_review_pending` | 33 | AK, AZ, DE, FL, HI, IL, IN, LA, ME, MI, MO, NC +13 |
| `legal_review_pending + route_metadata` | 30 | AL, AZ, GA, ID, MA, MN, MS, NC, NH, NV, OK, SC +4 |
| `legal_reconfirmation + legal_review_pending` | 20 | GA, IN, KY, LA, MA, ME, MO, NE, NJ, OR, RI, SC +3 |
| `legal_review_pending + wait_anchor_fix` | 16 | MI, NH, NM, NV, OH, OK, RI, SC, TX, VT, WA, WV |
| `legal_review_pending + renderer_unavailable + route_metadata` | 15 | AK, DE, LA, ME, NE, NV, OH, SC, SD, TX, UT, WY |
| `legal_review_pending + not_paid_product` | 14 | AK, AL, FL, ID, IL, LA, MA, MD, ME, MO |
| `intake_fix + legal_review_pending + renderer_unavailable` | 10 | ID, NV, OH, OK, RI, SD, WI, WV |
| `legal_review_pending + not_paid_product + packet_spec_incomplete + renderer_unavailable` | 9 | AK, MN, MS, RI |
| `legal_reconfirmation + legal_review_pending + renderer_unavailable` | 8 | NH, NV, OK, RI, SD, WA, WI |
| `not_paid_product` | 7 | AR, DC, IL, KY |
| `renderer_unavailable` | 6 | AR, CA, ND, NM, WI |
| `intake_fix + legal_review_pending` | 6 | FL, KS, LA, MI, NE, WA |
| `legal_review_pending + renderer_unavailable` | 6 | ID, MD, NH, NY, TN, TX |
| `filing_determination_missing + legal_review_pending + not_paid_product` | 5 | DE, LA, NE, OK, WV |
| `legal_review_pending + renderer_unavailable + wait_anchor_fix` | 3 | CO, VT, WV |
| `not_paid_product + packet_spec_incomplete + renderer_unavailable` | 3 | MS |
| `filing_determination_missing + legal_review_pending + not_paid_product + packet_spec_incomplete + renderer_unavailable` | 2 | AK, WI |
| `filing_determination_missing + legal_action_required + legal_review_pending` | 2 | HI |
| `legal_review_pending + not_paid_product + renderer_unavailable` | 2 | KY, MD |
| `gate_build + legal_review_pending + renderer_unavailable` | 2 | SD, WV |
| `filing_determination_missing + legal_review_pending + not_paid_product + packet_spec_incomplete` | 1 | CT |
| `filing_determination_missing + legal_review_pending + not_paid_product + renderer_unavailable` | 1 | ME |
| `legal_reconfirmation + legal_review_pending + packet_spec_incomplete + renderer_unavailable` | 1 | ND |
| `legal_review_pending + packet_spec_incomplete + renderer_unavailable` | 1 | SC |

The largest single lever is the renderer. **6** pathway(s) across **5**
jurisdictions (AR, CA, ND, NM, WI) carry no blocker other than `renderer_unavailable`:
they are payment-eligible, counsel-ratified and packet-spec complete, and the only
thing between them and a delivered packet is a certified renderer for their
jurisdiction. Nothing about them needs a legal decision or a classification change.

Going the other way, **168** pathway(s) in AK, AL, AR, AZ, CO, CT, DC, DE, FL, GA, HI, IA, ID, IL, IN, KS, KY, LA, MA, MD, ME, MI, MN, MO, MS, NC, ND, NE, NH, NJ, NM, NV, NY, OH, OK, OR, RI, SC, SD, TN, TX, UT, VA, VT, WA, WI, WV, WY already produce a packet
while carrying an open blocker. Every one of them carries `legal_review_pending`:
these routes render and sell today on a compiled profile that records no counsel
ratification for them.

Regenerate with `npm run rcap:generate-sellable-closure`; verify with `npm run rcap:verify-sellable-closure`.
