# Minnesota (MN) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-3`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 6 |
| Flow rows | 11 |
| Consumer screens | 9 |
| Packet-information builder questions | 5 |
| Question nodes in the public payload | 52 |
| Branch edges | 44 |
| Ordered decision rules | 34 |
| Waiting-period rules | 15 |
| Exclusion rules | 15 |

## Reachability from the rendered screens only

- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution` on `petition-based-expungement-under-609a-02-03`
- Facts the evaluator consumes that this state never asks: `financial_obligations`, `new_convictions_during_waiting_period`, `record_documents`, `sentence_completion_date`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `identity_error` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | **none** |
| 7 | `pending_cases` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 8 | `resolved_timing_bucket` | `single_choice` | yes | `supported_by_eligibility_rule` | `low` | yes |
| 9 | `court_requirements_completed` | `single_choice` | yes | `supported_by_eligibility_rule` | `court_identity` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `arrest-identification-data-destruction-when-no-charges-were-filed-minn-stat-299c-11` | `non_filing_guidance` | `needs_review` | closed | — |
| `automatic-clean-slate-expungement-under-609a-015` | `non_filing_guidance` | `guidance_only` | closed | — |
| `automatic-mistaken-identity-expungement-under-609a-017` | `non_filing_guidance` | `guidance_only` | closed | — |
| `cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06` | `paid_packet_intended` | `guidance_only` | closed | no |
| `petition-based-expungement-under-609a-02-03` | `paid_packet_intended` | `needs_review` | closed | no |
| `prosecutor-agreed-sealing-without-a-full-petition-under-609a-025` | `paid_packet_intended` | `guidance_only` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `needs_review` | 4 |
| `guidance_only` | 4 |
| `hard_stop` | 2 |
| `needs_more_info` | 1 |

## Non-remedy terminals

| Probe | Terminal | What it exercises |
| --- | --- | --- |
| `inside_waiting_period` | `needs_review` | Participant's case resolved inside the shortest timing bucket the state offers. |
| `no_answers_supplied` | `needs_more_info` | Participant lands on the state's first screen and submits nothing. |
| `not_my_own_record` | `hard_stop` | Participant answers the ownership question with someone else's record. |
| `out_of_jurisdiction_case` | `hard_stop` | Participant's case is not a state or local case in this jurisdiction. |
| `state_exclusion_selected` | `needs_review` | Participant selects a state exclusion category on the exclusion screen. |

## Browser evidence

| Flow | Viewport | Screens walked | Rendered terminal | Matches manifest |
| --- | --- | --- | --- | --- |
| `EXPAI-MN-1ecfc803d9` | desktop-1440x1000 | 9 | `needs_review` | yes |
| `EXPAI-MN-a45aa520e9` | desktop-1440x1000 | 9 | `hard_stop` | yes |

## Issues touching MN

- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-007** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Current city duplicates the address already requested inside contact information
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-014** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-015** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-GLOBAL-016** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery

## Files a Phase 3 shard may change for MN

```text
src/lib/rcap-engine/compiled/profiles/MN-minnesota.json
src/lib/rcap/state-packs/minnesota/**
docs/expungement-ai/flow-audit/state-reports/MN.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.
