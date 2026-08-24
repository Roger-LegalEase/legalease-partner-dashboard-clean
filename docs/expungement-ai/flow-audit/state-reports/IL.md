# Illinois (IL) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-6`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 9 |
| Flow rows | 18 |
| Consumer screens | 12 |
| Packet-information builder questions | 5 |
| Question nodes in the public payload | 54 |
| Branch edges | 63 |
| Ordered decision rules | 100 |
| Waiting-period rules | 40 |
| Exclusion rules | 38 |

## Reachability from the rendered screens only

- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution` on `adult-non-conviction-expungement`
- Facts the evaluator consumes that this state never asks: `financial_obligations`, `new_convictions_during_waiting_period`, `pending_cases`, `record_documents`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `age_at_offense` | `number_or_range` | yes | `supported_by_eligibility_rule` | `criminal_record` | **none** |
| 7 | `trafficking_status` | `yes_no_prefer_not_to_say` | yes | `supported_by_eligibility_rule` | `special_category` | **none** |
| 8 | `pardon_status` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `low` | **none** |
| 9 | `sentence_completion_date` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 10 | `resolved_timing_bucket` | `single_choice` | yes | `supported_by_eligibility_rule` | `low` | yes |
| 11 | `court_requirements_completed` | `single_choice` | yes | `supported_by_eligibility_rule` | `court_identity` | yes |
| 12 | `state_exclusion_categories` | `multi_select` | yes | `supported_by_escalation` | `criminal_record` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `adult-conviction-sealing` | `paid_packet_intended` | `packet_ready_with_caution` | allowed at evaluator | no |
| `adult-non-conviction-expungement` | `paid_packet_intended` | `packet_ready_with_caution` | allowed at evaluator | no |
| `cannabis-specific-automatic-or-petition-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `clean-slate-automatic-sealing` | `non_filing_guidance` | `guidance_only` | closed | — |
| `criminal-identity-theft-mistaken-identity-relief` | `paid_packet_intended` | `needs_review` | closed | no |
| `expungement-after-eligible-supervision-or-qualified-probation` | `paid_packet_intended` | `needs_review` | closed | no |
| `felony-prostitution-relief` | `paid_packet_intended` | `likely_not_eligible` | closed | no |
| `human-trafficking-survivor-vacatur-and-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `juvenile-automatic-or-petition-expungement` | `paid_packet_intended` | `packet_ready_with_caution` | allowed at evaluator | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `packet_ready_with_caution` | 8 |
| `needs_review` | 4 |
| `hard_stop` | 2 |
| `likely_not_eligible` | 2 |
| `needs_more_info` | 1 |
| `guidance_only` | 1 |

## Non-remedy terminals

| Probe | Terminal | What it exercises |
| --- | --- | --- |
| `inside_waiting_period` | `packet_ready_with_caution` | Participant's case resolved inside the shortest timing bucket the state offers. |
| `inside_waiting_period` | `packet_ready_with_caution` | Participant's case resolved inside the shortest timing bucket the state offers. |
| `no_answers_supplied` | `needs_more_info` | Participant lands on the state's first screen and submits nothing. |
| `not_my_own_record` | `hard_stop` | Participant answers the ownership question with someone else's record. |
| `out_of_jurisdiction_case` | `hard_stop` | Participant's case is not a state or local case in this jurisdiction. |
| `state_exclusion_selected` | `likely_not_eligible` | Participant selects a state exclusion category on the exclusion screen. |

## Browser evidence

| Flow | Viewport | Screens walked | Rendered terminal | Matches manifest |
| --- | --- | --- | --- | --- |
| `EXPAI-IL-0e77f4fd92` | desktop-1440x1000 | 12 | `packet_ready_with_caution` | yes |
| `EXPAI-IL-35b2281e6d` | desktop-1440x1000 | 12 | `likely_not_eligible` | yes |
| `EXPAI-IL-ba54c2b39b` | desktop-1440x1000 | 12 | `needs_review` | yes |

## Issues touching IL

- **UX-GLOBAL-001** (P0, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Open matter and Complete packet information loop for any packet-ready matter whose paymentAllowed is false or whose commercialFlow cannot be reconstructed
- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-004** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Facts already answered during screening are rendered again in the packet-information questionnaire, and the carry-forward is name-matched rather than guaranteed
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-007** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Current city duplicates the address already requested inside contact information
- **UX-GLOBAL-008** (P1, `GLOBAL_REVIEW_FORMATTING`, owner `PHASE_2_SHARED`) — The accuracy review page formats exactly three internal values and prints every other snake_case answer verbatim
- **UX-GLOBAL-009** (P1, `GLOBAL_PAYMENT`, owner `PHASE_2_SHARED`) — No discount-code entry exists anywhere before checkout, and the only code the product accepts is a partner access code that grants a free packet
- **UX-GLOBAL-010** (P2, `GLOBAL_PAYMENT`, owner `PHASE_2_SHARED`) — Sponsorship is a server-side session property with no consumer entry point, so it cannot be distinguished from a discount by anyone using the product
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-015** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-016** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-LEGAL-001** (P1, `REQUIRES_LEGAL_REVIEW`, owner `LEGAL_REVIEW_THEN_PHASE_3_STATE_SHARD`) — Selecting a state exclusion category still returns packet-ready in some jurisdictions, and so does the shortest timing bucket
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery
- **UX-GLOBAL-018** (P2, `GLOBAL_REVIEW_FORMATTING`, owner `PHASE_2_SHARED`) — packet_ready and packet_ready_with_caution render an eyebrow that differs only by a full stop, under an identical title

## Files a Phase 3 shard may change for IL

```text
src/lib/rcap-engine/compiled/profiles/IL-illinois.json
src/lib/rcap/state-packs/illinois/**
docs/expungement-ai/flow-audit/state-reports/IL.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

## Phase 3 SHARD-6 — what this shard did

Base `93e05e945a52cfa1cdd2ab590636290875a48f68` (PHASE2_PRODUCT_HEAD). Evaluator clock pinned to `2026-07-01`. Full record: `data/expungement-ai/flow-audit/shard-results/SHARD-6.json`.

### Changed

- Added src/lib/rcap/state-packs/illinois/record-clearing-filing-locations.ts: all 102 counties, the Circuit Court, the Circuit Court of Cook County, the Juvenile Division, the ISP Bureau of Identification, and a labelled manual-entry fallback.
- Exported it from the Illinois state pack index alongside the existing county-court-instructions and court-routing modules, which are prose guidance for the legacy generator rather than a selectable list.

### Deliberately not changed

- IL-illinois.json is byte-identical to the base.
- The Illinois legacy generator and its state pack modules were not modified; AGENTS.md preserves them.
- No exclusion rule and no waiting rule was changed, so the UX-LEGAL-001 behaviour is preserved exactly for counsel to see.

### Terminals

No flow row moved. All 18 Illinois flow IDs keep the terminal they had at the base, and the compiled profile is byte-identical to it. Proved by re-running the audit's own four generators before and after this diff: the output is byte-identical.

### Reachability from the rendered screens only, at this base

- Rendered screens: **17**
- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution` on `adult-non-conviction-expungement`

Illinois already reaches packet_ready_with_caution with payment open from rendered screens only, on adult-non-conviction-expungement. Not a UX-STATELAW-001 jurisdiction.

### Waiting-rule dispositions for this jurisdiction

Every route below still resolves through the provisional prose selector retained in the evaluator. None is recommended ACTIVE. No waiting period is authored here; a proposal names a rule id the compiled profile already publishes and quotes its text.

| Route | Disposition | Rules named |
| --- | --- | --- |
| `adult-conviction-sealing` | legal owner decision required | `wait-18`, `wait-19`, `wait-29`, `wait-30`, `wait-37` |
| `adult-non-conviction-expungement` | explicit binding proposed | `wait-01`, `wait-02`, `wait-03`, `wait-04` |
| `cannabis-specific-automatic-or-petition-expungement` | legal owner decision required | `wait-13` |
| `clean-slate-automatic-sealing` | held for correction | `wait-23`, `wait-37` |
| `criminal-identity-theft-mistaken-identity-relief` | legal owner decision required | none |
| `expungement-after-eligible-supervision-or-qualified-probation` | legal owner decision required | `wait-09`, `wait-10`, `wait-25`, `wait-26`, `wait-27` |
| `felony-prostitution-relief` | legal owner decision required | none |
| `human-trafficking-survivor-vacatur-and-expungement` | explicit binding proposed | `wait-21` |
| `juvenile-automatic-or-petition-expungement` | explicit binding proposed | `wait-22`, `wait-31` |

9 fallback-dependent route(s): 3 explicit binding proposed, 0 conditional binding proposed, 5 legal owner decision required, 1 held for correction.

### Controlled filing-location dataset

`src/lib/rcap/state-packs/illinois/record-clearing-filing-locations.ts` — 102 counties, the courts and agencies that handle record-clearing matters, and a labelled manual-entry fallback. Addresses UX-COURT-001.

Still missing: the selector itself. The renderer has no selector branch for county or court, and changing a compiled question's type or options is locked against origin/main by verify-expungement-plain-language-values unless a reviewed entry exists in data/expungement-ai/screening-parity-approved-deltas.json. Both the renderer and that approval record are prohibited shared paths for this shard, so the dataset is delivered and the binding is proposed.

### Legal questions still open

- UX-LEGAL-001: adult-conviction-sealing returns packet_ready_with_caution with payment open at the shortest timing bucket, lt_1_year. Recorded, not implemented.
- Which records the June 30, 2026 shortening of the sealing wait from three years to two applies to. The evaluator clock is July 1, 2026, so both the three-year and the two-year statement are live at evaluation time.
- What the Clean Slate automatic sealing route should tell a participant before automatic sealing begins on January 1, 2029.
