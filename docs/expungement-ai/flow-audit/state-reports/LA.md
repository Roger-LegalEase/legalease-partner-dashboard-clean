# Louisiana (LA) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-6`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 12 |
| Flow rows | 25 |
| Consumer screens | 11 |
| Packet-information builder questions | 4 |
| Question nodes in the public payload | 52 |
| Branch edges | 57 |
| Ordered decision rules | 37 |
| Waiting-period rules | 7 |
| Exclusion rules | 2 |

## Reachability from the rendered screens only

- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution` on `non-conviction-arrest-expungement`
- Facts the evaluator consumes that this state never asks: `new_convictions_during_waiting_period`, `record_documents`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `pardon_status` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `low` | **none** |
| 7 | `sentence_completion_date` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 8 | `financial_obligations` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | yes |
| 9 | `pending_cases` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 10 | `resolved_timing_bucket` | `single_choice` | yes | `supported_by_eligibility_rule` | `low` | yes |
| 11 | `court_requirements_completed` | `single_choice` | yes | `supported_by_eligibility_rule` | `court_identity` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `automated-expungement-status-verification-art-985-2` | `non_filing_guidance` | `guidance_only` | closed | — |
| `expungement-by-redaction-for-multi-person-records` | `paid_packet_intended` | `guidance_only` | closed | no |
| `felony-article-893-e-set-aside-followed-by-expungement` | `paid_packet_intended` | `packet_not_deliverable` | allowed at evaluator | no |
| `felony-ten-year-clean-period-expungement` | `paid_packet_intended` | `packet_not_deliverable` | allowed at evaluator | no |
| `first-offender-pardon-felony-expungement` | `paid_packet_intended` | `guidance_only` | closed | no |
| `first-offense-marijuana-expungement-after-90-days-art-998` | `paid_packet_intended` | `packet_not_deliverable` | allowed at evaluator | no |
| `human-trafficking-survivor-expungement-fee-exempt-route` | `paid_packet_intended` | `guidance_only` | closed | no |
| `immediate-expungement-after-successful-court-program-completion-art-985-3` | `paid_packet_intended` | `guidance_only` | closed | no |
| `interim-expungement-of-a-felony-arrest-reduced-to-a-misdemeanor-conviction` | `paid_packet_intended` | `guidance_only` | closed | no |
| `misdemeanor-article-894-b-set-aside-followed-by-expungement` | `paid_packet_intended` | `packet_not_deliverable` | allowed at evaluator | no |
| `misdemeanor-five-year-clean-period-expungement` | `paid_packet_intended` | `packet_not_deliverable` | allowed at evaluator | no |
| `non-conviction-arrest-expungement` | `paid_packet_intended` | `packet_not_deliverable` | allowed at evaluator | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `packet_not_deliverable` | 12 |
| `guidance_only` | 6 |
| `packet_ready_with_caution` | 4 |
| `hard_stop` | 2 |
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
| `EXPAI-LA-b7c0dca2fa` | desktop-1440x1000 | 11 | `packet_ready_with_caution` | yes |
| `EXPAI-LA-33f66b2e01` | desktop-1440x1000 | 11 | `guidance_only` | yes |

## Issues touching LA

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
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-015** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-016** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-LEGAL-001** (P1, `REQUIRES_LEGAL_REVIEW`, owner `LEGAL_REVIEW_THEN_PHASE_3_STATE_SHARD`) — Selecting a state exclusion category still returns packet-ready in some jurisdictions, and so does the shortest timing bucket
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery
- **UX-GLOBAL-018** (P2, `GLOBAL_REVIEW_FORMATTING`, owner `PHASE_2_SHARED`) — packet_ready and packet_ready_with_caution render an eyebrow that differs only by a full stop, under an identical title

## Files a Phase 3 shard may change for LA

```text
src/lib/rcap-engine/compiled/profiles/LA-louisiana.json
src/lib/rcap/state-packs/louisiana/**
docs/expungement-ai/flow-audit/state-reports/LA.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

## Phase 3 SHARD-6 — what this shard did

Base `93e05e945a52cfa1cdd2ab590636290875a48f68` (PHASE2_PRODUCT_HEAD). Evaluator clock pinned to `2026-07-01`. Full record: `data/expungement-ai/flow-audit/shard-results/SHARD-6.json`.

### Changed

- Added src/lib/rcap/state-packs/louisiana/record-clearing-filing-locations.ts: all 64 parishes, the judicial district courts, the Orleans Parish Criminal District Court, the Municipal and Traffic Court of New Orleans, city and juvenile courts, the State Police Bureau of Criminal Identification and Information, and a labelled manual-entry fallback. Parish, not county, is the correct local unit and the dataset says so.
- Exported it from the Louisiana state pack index.

### Deliberately not changed

- LA-louisiana.json is byte-identical to the base.
- No exclusion or waiting rule was changed, so the UX-LEGAL-001 behaviour is preserved exactly.

### Terminals

No flow row moved. All 25 Louisiana flow IDs keep the terminal they had at the base, and the compiled profile is byte-identical to it. Proved by re-running the audit's own four generators before and after this diff: the output is byte-identical.

### Reachability from the rendered screens only, at this base

- Rendered screens: **14**
- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution` on `non-conviction-arrest-expungement`

Louisiana already reaches packet_ready_with_caution with payment open from rendered screens only, on non-conviction-arrest-expungement. Not a UX-STATELAW-001 jurisdiction.

### Waiting-rule dispositions for this jurisdiction

Every route below still resolves through the provisional prose selector retained in the evaluator. None is recommended ACTIVE. No waiting period is authored here; a proposal names a rule id the compiled profile already publishes and quotes its text.

| Route | Disposition | Rules named |
| --- | --- | --- |
| `automated-expungement-status-verification-art-985-2` | legal owner decision required | none |
| `expungement-by-redaction-for-multi-person-records` | legal owner decision required | none |
| `felony-article-893-e-set-aside-followed-by-expungement` | legal owner decision required | `wait-06` |
| `felony-ten-year-clean-period-expungement` | explicit binding proposed | `wait-04` |
| `first-offender-pardon-felony-expungement` | legal owner decision required | `wait-05` |
| `first-offense-marijuana-expungement-after-90-days-art-998` | explicit binding proposed | `wait-03` |
| `human-trafficking-survivor-expungement-fee-exempt-route` | legal owner decision required | none |
| `immediate-expungement-after-successful-court-program-completion-art-985-3` | legal owner decision required | none |
| `interim-expungement-of-a-felony-arrest-reduced-to-a-misdemeanor-conviction` | legal owner decision required | none |
| `misdemeanor-article-894-b-set-aside-followed-by-expungement` | legal owner decision required | `wait-01`, `wait-02` |
| `misdemeanor-five-year-clean-period-expungement` | explicit binding proposed | `wait-02` |
| `non-conviction-arrest-expungement` | legal owner decision required | `wait-01` |

12 fallback-dependent route(s): 3 explicit binding proposed, 0 conditional binding proposed, 9 legal owner decision required, 0 held for correction.

### Controlled filing-location dataset

`src/lib/rcap/state-packs/louisiana/record-clearing-filing-locations.ts` — 64 parishes, the courts and agencies that handle record-clearing matters, and a labelled manual-entry fallback. Addresses UX-COURT-001.

Still missing: the selector itself. The renderer has no selector branch for county or court, and changing a compiled question's type or options is locked against origin/main by verify-expungement-plain-language-values unless a reviewed entry exists in data/expungement-ai/screening-parity-approved-deltas.json. Both the renderer and that approval record are prohibited shared paths for this shard, so the dataset is delivered and the binding is proposed.

### Legal questions still open

- UX-LEGAL-001: non-conviction-arrest-expungement, misdemeanor-article-894-b-set-aside and misdemeanor-five-year-clean-period all return packet_ready_with_caution with payment open at every timing bucket including lt_1_year and still_open. For the five-year route that is a packet sold on a period the participant has not served. Recorded, not implemented.
- Whether an additional clean period applies to a first-offender-pardon felony expungement, or whether the automatic pardon on completion of sentence is the whole of it.
- Whether Article 985.3 immediate expungement after court-program completion carries any period; nothing in the profile states one.
