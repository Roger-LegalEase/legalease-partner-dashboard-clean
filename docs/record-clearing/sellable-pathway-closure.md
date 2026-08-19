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
| `technicallyApprovedPacketPathways` | 27 | **257** |
| `legallyApprovedPacketPathways` | 52 | **232** |
| `successfullyRenderedPathways` | 40 | **244** |

**The invariant does not hold.** 6 of the six downstream stages fall short of the 284-pathway denominator. Every shortfall below is an open blocker on an open paid pathway, not a completed treatment.

## Do not charge for guidance

**72 pathway(s) can take money and cannot deliver an artifact.** The money gate (evaluator payment) and the delivery gate (packet route resolver) are not bound to each other, so a participant on these routes can be charged and then refused the packet.

| Pathway | Route kind | Why no artifact |
|---|---|---|
| `AK:confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `AL:eligible-conviction-expungement-under-the-redeemer-act` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `AR:situation-a-non-convictions` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `AR:situation-b-misdemeanor-convictions` | `exact_supported_deferral` | resolver refused: routeKind=exact_supported_deferral |
| `AR:situation-c-felony-convictions` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `AZ:remedy-1-record-sealing` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `CA:tool-1-dismissal-set-aside` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `CA:tool-3-petition-based-felony-sealing` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `CA:tool-4-arrest-record-sealing` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `CA:prop-64-currently-serving-petition-11361-8` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `CA:prop-64-completed-sentence-application-11361-8` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `CO:petition-based-non-conviction-sealing-jdf-417-24-72-704` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `CT:petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `DE:discretionary-court-expungement-under-11-del-c-4374` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `FL:court-ordered-expunction-943-0585` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `GA:sb-288-misdemeanor-conviction-restriction-and-sealing` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `HI:nonconviction-arrest-expungement` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `HI:first-time-drug-conviction` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `HI:dui-under-21-conviction` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `IA:nonconviction-901c2` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `ID:withheld-judgment-idaho-code-19-2604-review-branch` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `IN:conviction-expungement-with-sealed-confidential-access` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `KS:specialty-court-accelerated` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `KY:misdemeanor-violation-traffic-conviction` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `LA:non-conviction-arrest-expungement` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `LA:misdemeanor-article-894-b-set-aside-followed-by-expungement` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `LA:misdemeanor-five-year-clean-period-expungement` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `LA:first-offense-marijuana-expungement-after-90-days-art-998` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `LA:felony-article-893-e-set-aside-followed-by-expungement` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `LA:felony-ten-year-clean-period-expungement` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `MA:adult-conviction-sealing-under-m-g-l-c-276-100a` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `MD:adult-non-conviction-expungement-under-crim-proc-10-105` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `ME:adult-conviction-sealing` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `MI:misdemeanor-marijuana-set-aside-under-mcl-780-621e` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `MN:petition-based-expungement-under-609a-02-03` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `MO:general-arrest-charge-plea-trial-or-conviction-expungement-under-rsmo-610-140` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `MO:first-intoxication-related-traffic-or-boating-expungement-under-610-130` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `MO:stolen-or-mistaken-identity-expungement-under-610-145` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `MT:misdemeanor-conviction-expungement-under-mont-code-46-18-1104` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `MT:deferred-sentence-dismissal-or-confidentiality-route` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `MT:marijuana-related-redesignation-expungement-under-mmrta` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NC:dismissal-and-not-guilty-expunction-under-g-s-15a-146` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `ND:deferred-imposition-dismissal-and-sealing` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `ND:first-offense-possession-sealing` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `ND:marijuana-specific-summary-pardon-or-sealing-relief` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NE:set-aside-probation-fine-community-service` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NE:set-aside-incarceration-one-year-or-less` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NH:annulment-after-dismissal-acquittal-or-nonprosecution` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NJ:marijuana-hashish-expungement-under-n-j-s-a-2c-52-5-1-5-2-and-6-1` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NJ:arrest-dismissal-and-other-non-conviction-expungement-under-n-j-s-a-2c-52-6` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NM:no-conviction-released-without-conviction` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NM:cannabis-sentence-dismissal-incarcerated-person-pathway` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NV:general-conviction-record-sealing-under-nrs-179-245` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NY:conditional-treatment-sealing-under-cpl-160-58` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `NY:discretionary-conviction-sealing-by-petition-under-cpl-160-59` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `OH:adult-non-conviction-sealing-or-expungement-under-2953-33` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `OK:acquittal-dismissal-or-other-no-conviction-expungement` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `RI:path-f-marijuana-possession-expungement` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `SC:diversion-or-program-completion-expungement` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `SD:adult-arrest-record-expungement-under-sdcl-23a-3-27` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `TN:pathway-1-free-non-conviction-expunction-under-tenn-code-40-32-101-a-40-32-106` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `TX:expunction-after-acquittal-not-guilty-disposition-chapter-55a` | `exact_supported_deferral` | resolver refused: routeKind=exact_supported_deferral |
| `UT:path-i-traffic-offense-expungement-or-deletion` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `VA:regime-1-expungement-available-now` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `VA:petition-based-sealing` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `VT:dui-sealing` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `WA:non-conviction-record-deletion-under-rcw-10-97-060` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `WI:adult-conviction-expungement-under-wis-stat-973-015` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `WV:accelerated-treatment-recovery-job-readiness-expungement-under-61-11-26a` | `guidance_only` | resolver refused: routeKind=guidance_only |
| `WY:felony-conviction-expungement-w-s-7-13-1502` | `guidance_only` | resolver refused: routeKind=guidance_only |

## Payment follows counsel, or it does not open

**46 payable route(s) carry no compiled counsel ratification** recording them as packet-capable and payable. The evaluator's ratified-route set and the compiled `lawrenceRatification` records disagree, and payment follows the wider of the two.

## Guidance substituted for a packet

99 track(s) record that the participant files a document of their own and are still served
a guidance, deferral or exclusion treatment. Under the controlling decision these are
temporary blockers on intended paid pathways, not completed product treatments.

| Stated cause of the stop | Tracks |
|---|---|
| `unfinished_implementation` | 56 |
| `undeclared` | 43 |

## Open blockers across the denominator

| Blocker | Pathways |
|---|---|
| `renderer_unavailable` | 244 |
| `legal_review_pending` | 232 |
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

**23 of 284** intended-sellable pathways are closed with no open blocker.

## Pathways with no row in route-product-metadata.json

- `MD:pardoned-conviction-expungement-under-crim-proc-10-105-a-8`

Regenerate with `npm run rcap:generate-sellable-closure`; verify with `npm run rcap:verify-sellable-closure`.
