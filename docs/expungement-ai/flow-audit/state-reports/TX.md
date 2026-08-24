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

## Phase 3 SHARD-2 — what this shard did

Base `93e05e945a52cfa1cdd2ab590636290875a48f68` (PHASE2_PRODUCT_HEAD). Evaluator clock pinned to `2026-07-01`. Full record: `data/expungement-ai/flow-audit/shard-results/SHARD-2.json`.

### Changed

- Added `src/lib/rcap/state-packs/texas/controlled-filing-dataset.ts`: the district court of the county of arrest or prosecution, DPS as the record holder, and a manual-entry fallback.
- Added an additive `controlledDataBindings` block to `TX-texas.json`.

### Deliberately not changed

- No question's id, stage, type, prompt, options, required flag, `contextOnly` flag or `doesNotSelectPathway` flag moved.
- No pathway, waiting-period rule, exclusion rule, ordered decision rule, packet family, form mapping, `operationallySellable` value or payment clamp moved.
- No waiting rule was authored and no binding was added. `src/lib/rcap-engine/waiting-rule-bindings.json` and `src/lib/rcap-engine/evaluator.ts` are prohibited paths and are untouched.
- Texas's `PAYMENT_CLAMP_PRESERVED` hold is preserved exactly: TX still reaches a packet-ready terminal from rendered screens without payment opening, as at the base.

### Terminals

No flow row moved. All 14 TX flow IDs keep the terminal they had at the base. Proved by regenerating the audit's own four generators at the base and again with this shard's changes applied: `flow-manifest.json`, `question-inventory.json`, `branch-coverage.json` and `ui-reachability.json` are byte-identical between the two runs.

### Reachability from the rendered screens only, at this base

- Rendered screens: **16**
- Packet-ready reachable: **yes**
- Payment reachable: **no**
- Best terminal found: `packet_ready_with_caution`
- Facts the evaluator consumes that this state never asks: `record_documents`

Texas reaches a packet-ready terminal without payment opening. That is the preserved payment clamp, unchanged by this shard.

### Waiting-rule dispositions

8 fallback-dependent route(s) assigned to this jurisdiction. Every one carries exactly one disposition. None is recommended ACTIVE.

| Route | Disposition | Rule(s) / basis |
| --- | --- | --- |
| `automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07` | `HELD_FOR_CORRECTION` | `wait-18` |
| `expunction-after-acquittal-not-guilty-disposition-chapter-55a` | `HELD_FOR_CORRECTION` | `wait-01` |
| `expunction-after-pardon-or-actual-innocence-relief` | `LEGAL_OWNER_DECISION_REQUIRED` | no rule scoped to this route |
| `expunction-after-qualifying-class-c-deferred-disposition` | `LEGAL_OWNER_DECISION_REQUIRED` | no rule scoped to this route |
| `expunction-after-qualifying-dismissal-or-quash` | `LEGAL_OWNER_DECISION_REQUIRED` | no rule scoped to this route |
| `expunction-for-arrest-with-no-charge-filed-after-the-limitations-period` | `HELD_FOR_CORRECTION` | `wait-05`, `wait-06`, `wait-15`, `wait-17`, `wait-21` |
| `first-offense-dwi-nondisclosure` | `HELD_FOR_CORRECTION` | `wait-12`, `wait-13`, `wait-23` |
| `petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725` | `LEGAL_OWNER_DECISION_REQUIRED` | `wait-09`, `wait-10`, `wait-14`, `wait-20` |

### Duration-provenance findings

Structured durations in this jurisdiction's `waitingPeriodRules` that were extracted from something other than the operative wait:

- `wait-01` — duration **null**; '30th day after acquittal' was never parsed. Operative wait 30 days.
- `wait-17` — duration **0 days**, taken from the 'immediately entitled' sentence following the ladder table; the felony row's operative 3 years has no correctly-parsed rule anywhere.
- `wait-18` — duration **5 years**, taken from a neighbouring subtype row; the § 411.072 row's operative wait is 'None (court issues automatically)'.
- `wait-20` — duration **0 days**, the first of two branches; the enumerated chapters carry 5 years.
- `wait-13` — duration **5 years**, the second of two branches; 2 years applies with a full-term interlock, and the flow never asks about the interlock.

### Potential P0 payment / legal-outcome risks

- Three routes would become P0 **if bound as they stand**: `expunction-for-arrest-with-no-charge-filed-after-the-limitations-period` (`wait-17` = 0 days against an operative 3 years on the felony row), `automatic-nondisclosure-…-411-07` (`wait-18` = 5 years against a source that says the court issues it automatically), and `petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725` (`wait-20` = 0 days against an operative 5 years for the enumerated Penal Code chapters). None has a live effect: the payment clamp holds payment closed.

### Legal questions still open

Whether a completed Class C deferred disposition confers immediate entitlement; what governs a qualifying dismissal or quash and a pardon or actual-innocence expunction; and whether the flow should ask the interlock question its own guidance names.

### County and court (UX-COUNTY-001 / UX-COURT-001)

Classified `SHARED_PHASE2_BLOCKER`. One bounded state-configuration attempt was made and reproduced three blockers first-hand: the screening-parity gate refuses a compiled question's type and option list; the served payload comes from the shared all-51 designer fixture, so the change was inert; and `QuestionField.tsx` has no input combining a controlled list with manual entry. The attempt was reverted and not retried. What is preserved here is a **prepared dataset**, not a live customer-facing selector — the served profile and the renderer do not read it, and both are prohibited paths.
