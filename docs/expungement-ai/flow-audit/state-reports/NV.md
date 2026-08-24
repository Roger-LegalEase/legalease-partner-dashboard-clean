# Nevada (NV) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-2`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 7 |
| Flow rows | 12 |
| Consumer screens | 9 |
| Packet-information builder questions | 5 |
| Question nodes in the public payload | 53 |
| Branch edges | 49 |
| Ordered decision rules | 36 |
| Waiting-period rules | 13 |
| Exclusion rules | 4 |

## Reachability from the rendered screens only

- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution` on `general-conviction-record-sealing-under-nrs-179-245`
- Facts the evaluator consumes that this state never asks: `financial_obligations`, `new_convictions_during_waiting_period`, `record_documents`, `sentence_completion_date`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `pardon_status` | `yes_no_unsure` | yes | `supported_by_form_binding` | `low` | **none** |
| 7 | `pending_cases` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 8 | `resolved_timing_bucket` | `single_choice` | yes | `supported_by_eligibility_rule` | `low` | yes |
| 9 | `court_requirements_completed` | `single_choice` | yes | `supported_by_eligibility_rule` | `court_identity` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `controlled-substance-possession-sealing-under-nrs-453-3365` | `paid_packet_intended` | `guidance_only` | closed | no |
| `deferred-judgment-dismissal-and-sealing-under-nrs-176-211` | `paid_packet_intended` | `needs_review` | closed | no |
| `general-conviction-record-sealing-under-nrs-179-245` | `paid_packet_intended` | `needs_review` | closed | no |
| `non-conviction-record-sealing` | `paid_packet_intended` | `needs_review` | closed | no |
| `probation-or-specialty-court-dismissal-set-aside-sealing` | `paid_packet_intended` | `needs_review` | closed | no |
| `reentry-program-sealing-under-nrs-179-259` | `paid_packet_intended` | `guidance_only` | closed | no |
| `trafficking-victim-vacatur-and-sealing-under-nrs-179-247` | `paid_packet_intended` | `needs_review` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `needs_review` | 7 |
| `hard_stop` | 2 |
| `guidance_only` | 2 |
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
| `EXPAI-NV-e17caeead8` | desktop-1440x1000 | 9 | `guidance_only` | yes |
| `EXPAI-NV-378a0b27a0` | desktop-1440x1000 | 9 | `hard_stop` | yes |

## Issues touching NV

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

## Files a Phase 3 shard may change for NV

```text
src/lib/rcap-engine/compiled/profiles/NV-nevada.json
src/lib/rcap/state-packs/nevada/**
docs/expungement-ai/flow-audit/state-reports/NV.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

## Phase 3 SHARD-2 — what this shard did

Base `93e05e945a52cfa1cdd2ab590636290875a48f68` (PHASE2_PRODUCT_HEAD). Evaluator clock pinned to `2026-07-01`. Full record: `data/expungement-ai/flow-audit/shard-results/SHARD-2.json`.

### Changed

- Added `src/lib/rcap/state-packs/nevada/controlled-filing-dataset.ts`: three source-backed destinations including the NRS 179.2595 single-district-court route for records spread across several courts, and a manual-entry fallback.
- Added an additive `controlledDataBindings` block to `NV-nevada.json`.

### Deliberately not changed

- No question's id, stage, type, prompt, options, required flag, `contextOnly` flag or `doesNotSelectPathway` flag moved.
- No pathway, waiting-period rule, exclusion rule, ordered decision rule, packet family, form mapping, `operationallySellable` value or payment clamp moved.
- No waiting rule was authored and no binding was added. `src/lib/rcap-engine/waiting-rule-bindings.json` and `src/lib/rcap-engine/evaluator.ts` are prohibited paths and are untouched.

### Terminals

No flow row moved. All 12 NV flow IDs keep the terminal they had at the base. Proved by regenerating the audit's own four generators at the base and again with this shard's changes applied: `flow-manifest.json`, `question-inventory.json`, `branch-coverage.json` and `ui-reachability.json` are byte-identical between the two runs.

### Reachability from the rendered screens only, at this base

- Rendered screens: **14**
- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution`
- Facts the evaluator consumes that this state never asks: `record_documents`

### Waiting-rule dispositions

7 fallback-dependent route(s) assigned to this jurisdiction. Every one carries exactly one disposition. None is recommended ACTIVE.

| Route | Disposition | Rule(s) / basis |
| --- | --- | --- |
| `controlled-substance-possession-sealing-under-nrs-453-3365` | `EXPLICIT_BINDING_PROPOSED` | `wait-13` |
| `deferred-judgment-dismissal-and-sealing-under-nrs-176-211` | `LEGAL_OWNER_DECISION_REQUIRED` | no rule scoped to this route |
| `general-conviction-record-sealing-under-nrs-179-245` | `LEGAL_OWNER_DECISION_REQUIRED` | `wait-02`, `wait-03`, `wait-04`, `wait-05` |
| `non-conviction-record-sealing` | `LEGAL_OWNER_DECISION_REQUIRED` | `wait-08`, `wait-10` |
| `probation-or-specialty-court-dismissal-set-aside-sealing` | `LEGAL_OWNER_DECISION_REQUIRED` | `wait-11` |
| `reentry-program-sealing-under-nrs-179-259` | `EXPLICIT_BINDING_PROPOSED` | `wait-12` |
| `trafficking-victim-vacatur-and-sealing-under-nrs-179-247` | `LEGAL_OWNER_DECISION_REQUIRED` | no rule scoped to this route |

### Duration-provenance findings

Structured durations in this jurisdiction's `waitingPeriodRules` that were extracted from something other than the operative wait:

- No duration-provenance defect found. `wait-02`, `wait-03`, `wait-04`, `wait-05`, `wait-12` and `wait-13` each match the single period in their own text. Nevada's difficulty is route scoping, not duration provenance.

### Potential P0 payment / legal-outcome risks

- `NV:general-conviction-record-sealing-under-nrs-179-245` — with `case_outcome` = 'Arrest or citation with no charge filed' and `offense_level` = 'Felony', this conviction-sealing route returns `packet_ready_with_caution` with `paymentAllowed` **true at `lt_1_year`**, while the profile's own rule for a declined prosecution (`wait-08`/`wait-10`) is **8 years from arrest**. Recommended **HOLD**.

### Legal questions still open

Which NRS 179.245 period applies to a participant the flow can only describe as 'Misdemeanor' or 'Felony'; and what governs NRS 176.211 and NRS 179.247, which no published rule names.

### County and court (UX-COUNTY-001 / UX-COURT-001)

Classified `SHARED_PHASE2_BLOCKER`. One bounded state-configuration attempt was made and reproduced three blockers first-hand: the screening-parity gate refuses a compiled question's type and option list; the served payload comes from the shared all-51 designer fixture, so the change was inert; and `QuestionField.tsx` has no input combining a controlled list with manual entry. The attempt was reverted and not retried. What is preserved here is a **prepared dataset**, not a live customer-facing selector — the served profile and the renderer do not read it, and both are prohibited paths.
