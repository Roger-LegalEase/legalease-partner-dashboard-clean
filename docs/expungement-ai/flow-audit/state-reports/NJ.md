# New Jersey (NJ) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-6`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 4 |
| Flow rows | 9 |
| Consumer screens | 14 |
| Packet-information builder questions | 4 |
| Question nodes in the public payload | 53 |
| Branch edges | 56 |
| Ordered decision rules | 87 |
| Waiting-period rules | 19 |
| Exclusion rules | 29 |

## Reachability from the rendered screens only

- Packet-ready reachable: **no**
- Payment reachable: **no**
- Best terminal found: `not_yet` on `regular-expungement-under-n-j-s-a-2c-52-2-2c-52-3`
- Facts the evaluator consumes that this state never asks: `new_convictions_during_waiting_period`, `record_documents`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `age_at_offense` | `number_or_range` | yes | `supported_by_eligibility_rule` | `criminal_record` | **none** |
| 7 | `prior_relief` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | **none** |
| 8 | `trafficking_status` | `yes_no_prefer_not_to_say` | yes | `supported_by_eligibility_rule` | `special_category` | **none** |
| 9 | `pardon_status` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `low` | **none** |
| 10 | `sentence_completion_date` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 11 | `financial_obligations` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | yes |
| 12 | `pending_cases` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 13 | `resolved_timing_bucket` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 14 | `state_exclusion_categories` | `multi_select` | yes | `supported_by_escalation` | `criminal_record` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `arrest-dismissal-and-other-non-conviction-expungement-under-n-j-s-a-2c-52-6` | `paid_packet_intended` | `needs_review` | closed | no |
| `clean-slate-petition-under-n-j-s-a-2c-52-5-3` | `paid_packet_intended` | `guidance_only` | closed | no |
| `marijuana-hashish-expungement-under-n-j-s-a-2c-52-5-1-5-2-and-6-1` | `paid_packet_intended` | `needs_review` | closed | no |
| `regular-expungement-under-n-j-s-a-2c-52-2-2c-52-3` | `paid_packet_intended` | `needs_review` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `needs_review` | 4 |
| `hard_stop` | 2 |
| `needs_more_info` | 1 |
| `likely_not_eligible` | 1 |
| `guidance_only` | 1 |

## Non-remedy terminals

| Probe | Terminal | What it exercises |
| --- | --- | --- |
| `inside_waiting_period` | `needs_review` | Participant's case resolved inside the shortest timing bucket the state offers. |
| `no_answers_supplied` | `needs_more_info` | Participant lands on the state's first screen and submits nothing. |
| `not_my_own_record` | `hard_stop` | Participant answers the ownership question with someone else's record. |
| `out_of_jurisdiction_case` | `hard_stop` | Participant's case is not a state or local case in this jurisdiction. |
| `state_exclusion_selected` | `likely_not_eligible` | Participant selects a state exclusion category on the exclusion screen. |

## Browser evidence

| Flow | Viewport | Screens walked | Rendered terminal | Matches manifest |
| --- | --- | --- | --- | --- |
| `EXPAI-NJ-b95401deef` | desktop-1440x1000 | 14 | `needs_review` | yes |
| `EXPAI-NJ-ed03ab1379` | desktop-1440x1000 | 14 | `hard_stop` | yes |

## Issues touching NJ

- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-007** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Current city duplicates the address already requested inside contact information
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-STATELAW-001** (P0, `STATE_LEGAL_LOGIC`, owner `LEGAL_REVIEW_THEN_PHASE_3_STATE_SHARD`) — 19 jurisdictions reach no packet-ready outcome when the audit answers only the screens the flow renders
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-014** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-015** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-GLOBAL-016** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery

## Files a Phase 3 shard may change for NJ

```text
src/lib/rcap-engine/compiled/profiles/NJ-new-jersey.json
src/lib/rcap/state-packs/new-jersey/**
docs/expungement-ai/flow-audit/state-reports/NJ.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.
