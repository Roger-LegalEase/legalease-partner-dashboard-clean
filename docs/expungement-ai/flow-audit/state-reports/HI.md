# Hawaii (HI) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-2`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 5 |
| Flow rows | 13 |
| Consumer screens | 8 |
| Packet-information builder questions | 4 |
| Question nodes in the public payload | 49 |
| Branch edges | 38 |
| Ordered decision rules | 20 |
| Waiting-period rules | 3 |
| Exclusion rules | 6 |

## Reachability from the rendered screens only

- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution` on `nonconviction-arrest-expungement`
- Facts the evaluator consumes that this state never asks: `financial_obligations`, `new_convictions_during_waiting_period`, `pending_cases`, `record_documents`, `sentence_completion_date`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `age_at_offense` | `number_or_range` | yes | `supported_by_eligibility_rule` | `criminal_record` | **none** |
| 7 | `hi_court_order_confirmed` | `yes_no_unsure` | no | `supported_by_escalation` | `criminal_record` | yes |
| 8 | `resolved_timing_bucket` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `deferred-acceptance-one-year` | `paid_packet_intended` | `guidance_only` | closed | no |
| `deferred-prostitution-three-year` | `paid_packet_intended` | `guidance_only` | closed | no |
| `dui-under-21-conviction` | `paid_packet_intended` | `needs_review` | closed | no |
| `first-time-drug-conviction` | `paid_packet_intended` | `needs_review` | closed | no |
| `nonconviction-arrest-expungement` | `paid_packet_intended` | `packet_not_deliverable` | allowed at evaluator | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `packet_ready_with_caution` | 4 |
| `hard_stop` | 2 |
| `guidance_only` | 2 |
| `needs_review` | 2 |
| `packet_not_deliverable` | 2 |
| `needs_more_info` | 1 |

## Non-remedy terminals

| Probe | Terminal | What it exercises |
| --- | --- | --- |
| `inside_waiting_period` | `packet_ready_with_caution` | Participant's case resolved inside the shortest timing bucket the state offers. |
| `inside_waiting_period` | `packet_ready_with_caution` | Participant's case resolved inside the shortest timing bucket the state offers. |
| `no_answers_supplied` | `needs_more_info` | Participant lands on the state's first screen and submits nothing. |
| `not_my_own_record` | `hard_stop` | Participant answers the ownership question with someone else's record. |
| `out_of_jurisdiction_case` | `hard_stop` | Participant's case is not a state or local case in this jurisdiction. |
| `state_exclusion_selected` | `packet_ready_with_caution` | Participant selects a state exclusion category on the exclusion screen. |
| `state_exclusion_selected` | `packet_ready_with_caution` | Participant selects a state exclusion category on the exclusion screen. |

## Browser evidence

| Flow | Viewport | Screens walked | Rendered terminal | Matches manifest |
| --- | --- | --- | --- | --- |
| `EXPAI-HI-8254aa0343` | desktop-1440x1000 | 8 | `packet_ready_with_caution` | yes |
| `EXPAI-HI-485c161246` | desktop-1440x1000 | 8 | `guidance_only` | yes |

## Issues touching HI

- **UX-GLOBAL-001** (P0, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Open matter and Complete packet information loop for any packet-ready matter whose paymentAllowed is false or whose commercialFlow cannot be reconstructed
- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-004** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Facts already answered during screening are rendered again in the packet-information questionnaire, and the carry-forward is name-matched rather than guaranteed
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-008** (P1, `GLOBAL_REVIEW_FORMATTING`, owner `PHASE_2_SHARED`) — The accuracy review page formats exactly three internal values and prints every other snake_case answer verbatim
- **UX-GLOBAL-009** (P1, `GLOBAL_PAYMENT`, owner `PHASE_2_SHARED`) — No discount-code entry exists anywhere before checkout, and the only code the product accepts is a partner access code that grants a free packet
- **UX-GLOBAL-010** (P2, `GLOBAL_PAYMENT`, owner `PHASE_2_SHARED`) — Sponsorship is a server-side session property with no consumer entry point, so it cannot be distinguished from a discount by anyone using the product
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-STATECFG-001** (P2, `STATE_CONFIGURATION`, owner `PHASE_3_STATE_SHARD`) — Route-specific facts are asked of every participant in the state before the route is known
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-015** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-016** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-LEGAL-001** (P1, `REQUIRES_LEGAL_REVIEW`, owner `LEGAL_REVIEW_THEN_PHASE_3_STATE_SHARD`) — Selecting a state exclusion category still returns packet-ready in some jurisdictions, and so does the shortest timing bucket
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery
- **UX-GLOBAL-018** (P2, `GLOBAL_REVIEW_FORMATTING`, owner `PHASE_2_SHARED`) — packet_ready and packet_ready_with_caution render an eyebrow that differs only by a full stop, under an identical title

## Files a Phase 3 shard may change for HI

```text
src/lib/rcap-engine/compiled/profiles/HI-hawaii.json
src/lib/rcap/state-packs/hawaii/**
docs/expungement-ai/flow-audit/state-reports/HI.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.
