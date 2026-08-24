# Texas (TX) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-2`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 9 |
| Flow rows | 14 |
| Consumer screens | 12 |
| Packet-information builder questions | 5 |
| Question nodes in the public payload | 54 |
| Branch edges | 57 |
| Ordered decision rules | 85 |
| Waiting-period rules | 23 |
| Exclusion rules | 24 |

## Reachability from the rendered screens only

- Packet-ready reachable: **yes**
- Payment reachable: **no**
- Best terminal found: `packet_ready_with_caution` on `expunction-for-arrest-with-no-charge-filed-after-the-limitations-period`
- Facts the evaluator consumes that this state never asks: `new_convictions_during_waiting_period`, `record_documents`, `sentence_completion_date`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `pardon_status` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `low` | **none** |
| 7 | `identity_error` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | **none** |
| 8 | `financial_obligations` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | yes |
| 9 | `pending_cases` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 10 | `resolved_timing_bucket` | `single_choice` | yes | `supported_by_eligibility_rule` | `low` | yes |
| 11 | `court_requirements_completed` | `single_choice` | yes | `supported_by_eligibility_rule` | `court_identity` | yes |
| 12 | `state_exclusion_categories` | `multi_select` | yes | `supported_by_escalation` | `criminal_record` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07` | `non_filing_guidance` | `guidance_only` | closed | — |
| `expunction-after-acquittal-not-guilty-disposition-chapter-55a` | `paid_packet_intended` | `guidance_only` | closed | no |
| `expunction-after-pardon-or-actual-innocence-relief` | `paid_packet_intended` | `guidance_only` | closed | no |
| `expunction-after-qualifying-class-c-deferred-disposition` | `paid_packet_intended` | `guidance_only` | closed | no |
| `expunction-after-qualifying-dismissal-or-quash` | `paid_packet_intended` | `guidance_only` | closed | no |
| `expunction-for-arrest-with-no-charge-filed-after-the-limitations-period` | `paid_packet_intended` | `needs_review` | closed | no |
| `first-offense-dwi-nondisclosure` | `paid_packet_intended` | `needs_review` | closed | no |
| `petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725` | `paid_packet_intended` | `guidance_only` | closed | no |
| `petitioned-nondisclosure-for-an-eligible-conviction-411-0735` | `paid_packet_intended` | `needs_review` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `guidance_only` | 7 |
| `needs_review` | 3 |
| `hard_stop` | 2 |
| `needs_more_info` | 1 |
| `likely_not_eligible` | 1 |

## Non-remedy terminals

| Probe | Terminal | What it exercises |
| --- | --- | --- |
| `inside_waiting_period` | `guidance_only` | Participant's case resolved inside the shortest timing bucket the state offers. |
| `no_answers_supplied` | `needs_more_info` | Participant lands on the state's first screen and submits nothing. |
| `not_my_own_record` | `hard_stop` | Participant answers the ownership question with someone else's record. |
| `out_of_jurisdiction_case` | `hard_stop` | Participant's case is not a state or local case in this jurisdiction. |
| `state_exclusion_selected` | `likely_not_eligible` | Participant selects a state exclusion category on the exclusion screen. |

## Browser evidence

| Flow | Viewport | Screens walked | Rendered terminal | Matches manifest |
| --- | --- | --- | --- | --- |
| `EXPAI-TX-7e7e6db808` | desktop-1440x1000 | 12 | `guidance_only` | yes |
| `EXPAI-TX-17bc7cc44b` | desktop-1440x1000 | 12 | `hard_stop` | yes |

## Issues touching TX

- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-007** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Current city duplicates the address already requested inside contact information
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-015** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-016** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery

## Files a Phase 3 shard may change for TX

```text
src/lib/rcap-engine/compiled/profiles/TX-texas.json
src/lib/rcap/state-packs/texas/**
docs/expungement-ai/flow-audit/state-reports/TX.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

## Phase 3 Shard 2 disposition

- Texas's payment clamp is preserved exactly; no payment, shared binding, evaluator, or live route was changed.
- The no-charge composite quotes 180 days for Class C, one year for Class A/B, and three years for felony. Its extracted 0/180-day first branches do not represent the full rule. At a 122-day Class A probe, the immediate composite returned packet-ready while a one-year rule returned `not_yet`; payment stayed false only because of the clamp.
- Classify the no-charge route as a potential P0 wrong-legal-outcome risk and recommend a hold. The first-offense-DWI and § 411.0725 branch rules also remain held because the needed interlock/exact-offense facts are absent.
- Four immediate/no-wait route proposals are explicit, but none is recommended active in this shard. Full terminal/payment evidence is in `SHARD-2.json`.
