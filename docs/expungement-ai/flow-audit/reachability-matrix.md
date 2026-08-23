# Reachability matrix — all 51 jurisdictions

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Audit HEAD:** `8e7580ca509fb078144e64549e00ef6908b3a623` · **Evaluation clock:** `2026-07-01`

An intentional unsupported or referral outcome is never counted as a technical failure. A jurisdiction is a technical reachability defect only when supplying the facts the flow never asks turns its terminal into packet-ready; that is a proof, not a judgement.

## Classification vocabulary

- `intentional_unsupported_or_referral` — Every compiled pathway is non-filing guidance, product-scope exclusion or legally unavailable. Guidance is the correct outcome.
- `technical_reachability_defect` — A paid pathway exists and works, and naming a waiting rule the state's own profile already contains reaches packet-ready. The flow never renders waiting_rule_id and the automatic selector picks none of those rules, so the participant cannot reach it. Shared-executor defect.
- `payment_clamp_not_reachability` — Packet-ready is reachable; the evaluator's payment clamp closes payment on every reachable route.
- `intentional_launch_hold` — Packet-ready and payment are reachable; the launch ledger holds the route on a governance gate.
- `waiting_rule_not_executable` — Every timing and completion fact is answered the clearing way, every waiting rule in the profile has been named explicitly, and the evaluator still cannot execute a waiting period. A per-state compiled-profile defect that needs a legal answer, not a shared fix.
- `unresolved_reachability` — Neither the rendered screens nor the unrendered facts reach packet-ready, and the blocker is not the waiting-rule executor. Needs a per-state legal answer.
- `reachable_and_sellable` — Reachability, payment and the launch ledger all agree.

## The matrix

| Jur | Intended commercial status | Supported flow IDs | Rendered terminal | Packet-ready | Payment | First missing fact | Lifecycle of that fact | Checkout guard | Sellable | Intentional unsupported | Launch hold | Technical defect | Issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `AK` | live, 5/5 paid-intended | 0 | `packet_ready_with_caution` | yes | yes | — | — | refused: packet not deliverable | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `AL` | live, 4/4 paid-intended | 0 | `packet_ready_with_caution` | yes | yes | — | — | never reached | no | no | yes | no | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `AR` | live, 3/3 paid-intended | 1 | `packet_ready_with_caution` | yes | yes | — | — | never reached | no | no | yes | no | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `AZ` | live, 3/3 paid-intended | 0 | `not_yet` | **no** | **no** | — | — | never reached | no | no | yes | **yes** | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 UX-STATELAW-001 |
| `CA` | live, 5/7 paid-intended | 0 | `needs_review` | **no** | **no** | — | — | passes for at least one flow | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 UX-GLOBAL-018 UX-STATELAW-001 |
| `CO` | live, 3/4 paid-intended | 1 | `packet_ready_with_caution` | yes | yes | — | — | refused: packet not deliverable | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 |
| `CT` | live, 2/5 paid-intended | 0 | `not_yet` | **no** | **no** | — | — | never reached | no | no | yes | **yes** | UX-GLOBAL-005 UX-GLOBAL-006 UX-STATELAW-001 |
| `DC` | live, 4/7 paid-intended | 0 | `not_yet` | **no** | **no** | — | — | never reached | no | no | yes | **yes** | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 UX-STATELAW-001 |
| `DE` | live, 3/4 paid-intended | 0 | `packet_ready` | yes | yes | — | — | refused: packet not deliverable | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-018 |
| `FL` | live, 7/8 paid-intended | 0 | `not_yet` | **no** | **no** | — | — | never reached | no | no | yes | **yes** | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 UX-STATELAW-001 |
| `GA` | live, 4/5 paid-intended | 0 | `not_yet` | **no** | **no** | — | — | never reached | no | no | yes | **yes** | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 UX-STATELAW-001 |
| `HI` | live, 5/5 paid-intended | 0 | `packet_ready_with_caution` | yes | yes | — | — | passes for at least one flow | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 |
| `IA` | live, 5/5 paid-intended | 0 | `not_yet` | **no** | **no** | — | — | never reached | no | no | yes | **yes** | UX-GLOBAL-005 UX-GLOBAL-006 UX-STATELAW-001 |
| `ID` | live, 5/5 paid-intended | 1 | `packet_ready_with_caution` | yes | yes | — | — | never reached | no | no | yes | no | UX-GLOBAL-005 UX-GLOBAL-006 |
| `IL` | live, 8/9 paid-intended | 6 | `packet_ready_with_caution` | yes | yes | — | — | passes for at least one flow | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `IN` | live, 4/4 paid-intended | 2 | `needs_more_info` | **no** | **no** | — | — | never reached | no | no | yes | no | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 UX-STATELAW-001 |
| `KS` | live, 3/4 paid-intended | 0 | `not_yet` | **no** | **no** | — | — | never reached | no | no | yes | no | UX-GLOBAL-005 UX-GLOBAL-006 UX-STATELAW-001 |
| `KY` | live, 3/5 paid-intended | 0 | `packet_ready_with_caution` | yes | yes | — | — | refused: packet not deliverable | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 |
| `LA` | live, 11/12 paid-intended | 0 | `packet_ready_with_caution` | yes | yes | — | — | passes for at least one flow | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 |
| `MA` | live, 6/7 paid-intended | 0 | `packet_ready_with_caution` | yes | yes | — | — | refused: packet not deliverable | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `MD` | live, 7/8 paid-intended | 0 | `packet_ready_with_caution` | yes | yes | — | — | never reached | no | no | yes | no | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `ME` | live, 5/5 paid-intended | 0 | `packet_ready_with_caution` | yes | yes | — | — | refused: packet not deliverable | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `MI` | live, 4/5 paid-intended | 0 | `not_yet` | **no** | **no** | — | — | never reached | no | no | yes | **yes** | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 UX-STATELAW-001 |
| `MN` | live, 3/6 paid-intended | 0 | `packet_ready_with_caution` | yes | yes | — | — | never reached | no | no | yes | no | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `MO` | live, 7/7 paid-intended | 0 | `packet_ready_with_caution` | yes | yes | — | — | refused: packet not deliverable | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `MS` | live, 13/13 paid-intended | 2 | `packet_ready_with_caution` | yes | yes | — | — | passes for at least one flow | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `MT` | live, 4/5 paid-intended | 0 | `not_yet` | **no** | **no** | — | — | never reached | no | no | yes | **yes** | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 UX-STATELAW-001 |
| `NC` | live, 3/3 paid-intended | 0 | `packet_ready_with_caution` | yes | yes | — | — | refused: packet not deliverable | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `ND` | live, 6/6 paid-intended | 0 | `packet_ready_with_caution` | yes | yes | — | — | refused: packet not deliverable | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `NE` | live, 6/8 paid-intended | 0 | `packet_ready_with_caution` | yes | yes | — | — | refused: packet not deliverable | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `NH` | live, 5/6 paid-intended | 1 | `packet_ready_with_caution` | yes | yes | — | — | passes for at least one flow | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `NJ` | live, 4/4 paid-intended | 0 | `not_yet` | **no** | **no** | — | — | never reached | no | no | yes | no | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 UX-STATELAW-001 |
| `NM` | live, 4/5 paid-intended | 0 | `not_yet` | **no** | **no** | — | — | never reached | no | no | yes | **yes** | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 UX-STATELAW-001 |
| `NV` | live, 7/7 paid-intended | 0 | `packet_ready_with_caution` | yes | yes | — | — | never reached | no | no | yes | no | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `NY` | live, 2/5 paid-intended | 0 | `packet_ready_with_caution` | yes | yes | — | — | never reached | no | no | yes | no | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `OH` | live, 7/7 paid-intended | 0 | `packet_ready_with_caution` | yes | yes | — | — | passes for at least one flow | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `OK` | live, 17/18 paid-intended | 0 | `not_yet` | **no** | **no** | — | — | never reached | no | no | yes | **yes** | UX-GLOBAL-005 UX-GLOBAL-006 UX-STATELAW-001 |
| `OR` | live, 3/3 paid-intended | 0 | `packet_ready_with_caution` | yes | yes | — | — | never reached | no | no | yes | no | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `PA` | live, 10/11 paid-intended | 0 | `needs_more_info` | **no** | **no** | — | — | never reached | no | no | yes | **yes** | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 UX-STATELAW-001 |
| `RI` | live, 8/8 paid-intended | 0 | `needs_more_info` | **no** | **no** | — | — | never reached | no | no | yes | no | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 UX-STATELAW-001 |
| `SC` | live, 7/7 paid-intended | 0 | `not_yet` | **no** | **no** | — | — | never reached | no | no | yes | **yes** | UX-GLOBAL-005 UX-GLOBAL-006 UX-STATELAW-001 |
| `SD` | live, 7/8 paid-intended | 0 | `not_yet` | **no** | **no** | — | — | never reached | no | no | yes | **yes** | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 UX-STATELAW-001 |
| `TN` | live, 4/4 paid-intended | 0 | `packet_ready_with_caution` | yes | yes | — | — | never reached | no | no | yes | no | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `TX` | live, 8/9 paid-intended | 0 | `packet_ready_with_caution` | yes | **no** | — | — | never reached | no | no | yes | no | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `UT` | live, 8/11 paid-intended | 0 | `needs_more_info` | **no** | **no** | — | — | never reached | no | no | yes | no | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 UX-STATELAW-001 |
| `VA` | live, 2/3 paid-intended | 0 | `packet_ready_with_caution` | yes | yes | — | — | refused: packet not deliverable | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `VT` | live, 8/8 paid-intended | 3 | `packet_ready_with_caution` | yes | yes | — | — | never reached | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 |
| `WA` | live, 7/7 paid-intended | 1 | `packet_ready_with_caution` | yes | **no** | — | — | never reached | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 |
| `WI` | live, 5/5 paid-intended | 1 | `packet_ready_with_caution` | yes | yes | — | — | refused: packet not deliverable | no | no | yes | no | UX-GLOBAL-001 UX-GLOBAL-004 UX-GLOBAL-005 UX-GLOBAL-006 |
| `WV` | live, 7/7 paid-intended | 0 | `packet_ready_with_caution` | yes | **no** | — | — | never reached | no | no | yes | no | UX-GLOBAL-005 UX-GLOBAL-006 UX-GLOBAL-007 |
| `WY` | live, 3/5 paid-intended | 0 | `packet_ready_with_caution` | yes | yes | — | — | never reached | no | no | yes | no | UX-GLOBAL-005 UX-GLOBAL-006 |

## The 19 with no packet-ready outcome

`AZ`, `CA`, `CT`, `DC`, `FL`, `GA`, `IA`, `IN`, `KS`, `MI`, `MT`, `NJ`, `NM`, `OK`, `PA`, `RI`, `SC`, `SD`, `UT`

They are not one problem. They split into three:

| Class | Jurisdictions | Owner |
| --- | --- | --- |
| technical_reachability_defect | `AZ` `CT` `DC` `FL` `GA` `IA` `MI` `MT` `NM` `OK` `PA` `SC` `SD` | Phase 2 shared |
| waiting_rule_not_executable | `KS` `NJ` `RI` `UT` | Phase 3 state shard, after a legal answer |
| unresolved_reachability | `CA` `IN` | Phase 3 state shard, after a legal answer |

## The 22 with no payment outcome

`AZ`, `CA`, `CT`, `DC`, `FL`, `GA`, `IA`, `IN`, `KS`, `MI`, `MT`, `NJ`, `NM`, `OK`, `PA`, `RI`, `SC`, `SD`, `TX`, `UT`, `WA`, `WV`

## Why 22 and not 19

Reachability and payment are two different gates and the second is strictly narrower. Every jurisdiction that cannot reach packet-ready also cannot reach payment, because payment is only ever offered on a packet-ready terminal. The extra jurisdictions in the payment set are the ones that DO reach packet-ready and are then closed by the evaluator's own payment clamp in evaluateAgainstProfile: paymentAllowed additionally requires route.deterministic, a packet plan, routeIsRatifiedDeployable, a court-filed petition or administrative application route, and isPacketPlanFulfillmentReady. A route can satisfy every eligibility rule, return packet_ready_with_caution, and still be handed paymentAllowed false by that clamp.

| Jurisdiction | Rendered terminal | Pathway | Classification |
| --- | --- | --- | --- |
| `TX` | `packet_ready_with_caution` | `expunction-for-arrest-with-no-charge-filed-after-the-limitations-period` | `payment_clamp_not_reachability` |
| `WA` | `packet_ready_with_caution` | `victim-survivor-conviction-vacation-route` | `payment_clamp_not_reachability` |
| `WV` | `packet_ready_with_caution` | `juvenile-record-relief` | `payment_clamp_not_reachability` |

## Intentional outcomes, kept separate from failures

- **Intentional unsupported or referral:** none. Every one of the 51 jurisdictions has at least one pathway the closure ledger classifies `paid_packet_intended`, so no jurisdiction is guidance-only by design.
- **Intentional launch holds:** 51 jurisdictions — `AK`, `AL`, `AR`, `AZ`, `CA`, `CO`, `CT`, `DC`, `DE`, `FL`, `GA`, `HI`, `IA`, `ID`, `IL`, `IN`, `KS`, `KY`, `LA`, `MA`, `MD`, `ME`, `MI`, `MN`, `MO`, `MS`, `MT`, `NC`, `ND`, `NE`, `NH`, `NJ`, `NM`, `NV`, `NY`, `OH`, `OK`, `OR`, `PA`, `RI`, `SC`, `SD`, `TN`, `TX`, `UT`, `VA`, `VT`, `WA`, `WI`, `WV`, `WY`. These reach packet-ready and payment at the runtime and are held by the launch ledger on governance gates, not by a defect.
