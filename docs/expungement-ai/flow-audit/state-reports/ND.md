# North Dakota (ND) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-2`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 6 |
| Flow rows | 12 |
| Consumer screens | 6 |
| Packet-information builder questions | 12 |
| Question nodes in the public payload | 51 |
| Branch edges | 37 |
| Ordered decision rules | 96 |
| Waiting-period rules | 19 |
| Exclusion rules | 4 |

## Reachability from the rendered screens only

- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution` on `deferred-imposition-dismissal-and-sealing`
- Facts the evaluator consumes that this state never asks: `financial_obligations`, `new_convictions_during_waiting_period`, `pending_cases`, `sentence_completion_date`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `resolved_timing_bucket` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `deferred-imposition-dismissal-and-sealing` | `paid_packet_intended` | `packet_not_deliverable` | allowed at evaluator | no |
| `dui-record-sealing-under-the-separate-dui-statute` | `paid_packet_intended` | `needs_review` | closed | no |
| `first-offense-possession-sealing` | `paid_packet_intended` | `needs_review` | closed | no |
| `general-conviction-sealing-under-n-d-c-c-chapter-12-60-1` | `paid_packet_intended` | `needs_review` | closed | no |
| `marijuana-specific-summary-pardon-or-sealing-relief` | `paid_packet_intended` | `needs_review` | closed | no |
| `non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05` | `paid_packet_intended` | `needs_review` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `needs_review` | 7 |
| `hard_stop` | 2 |
| `packet_not_deliverable` | 2 |
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
| `EXPAI-ND-a3bfb554d3` | desktop-1440x1000 | 6 | `packet_ready_with_caution` | yes |
| `EXPAI-ND-86e4047faf` | desktop-1440x1000 | 6 | `needs_review` | yes |

## Issues touching ND

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
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery
- **UX-GLOBAL-018** (P2, `GLOBAL_REVIEW_FORMATTING`, owner `PHASE_2_SHARED`) — packet_ready and packet_ready_with_caution render an eyebrow that differs only by a full stop, under an identical title

## Files a Phase 3 shard may change for ND

```text
src/lib/rcap-engine/compiled/profiles/ND-north-dakota.json
src/lib/rcap/state-packs/north-dakota/**
docs/expungement-ai/flow-audit/state-reports/ND.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

## Phase 3 SHARD-2 — what this shard did

Base `93e05e945a52cfa1cdd2ab590636290875a48f68` (PHASE2_PRODUCT_HEAD). Evaluator clock pinned to `2026-07-01`. Full record: `data/expungement-ai/flow-audit/shard-results/SHARD-2.json`.

### Changed

- Added `src/lib/rcap/state-packs/north-dakota/controlled-filing-dataset.ts`: state district court and municipal court as the two venues the statute names, and a manual-entry fallback.
- Added an additive `controlledDataBindings` block to `ND-north-dakota.json` recording **zero bindings**: North Dakota publishes no `court`, `county` or `county_or_filing_location` question.

### Deliberately not changed

- No question's id, stage, type, prompt, options, required flag, `contextOnly` flag or `doesNotSelectPathway` flag moved.
- No pathway, waiting-period rule, exclusion rule, ordered decision rule, packet family, form mapping, `operationallySellable` value or payment clamp moved.
- No waiting rule was authored and no binding was added. `src/lib/rcap-engine/waiting-rule-bindings.json` and `src/lib/rcap-engine/evaluator.ts` are prohibited paths and are untouched.

### Terminals

No flow row moved. All 12 ND flow IDs keep the terminal they had at the base. Proved by regenerating the audit's own four generators at the base and again with this shard's changes applied: `flow-manifest.json`, `question-inventory.json`, `branch-coverage.json` and `ui-reachability.json` are byte-identical between the two runs.

### Reachability from the rendered screens only, at this base

- Rendered screens: **12**
- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution`
- Facts the evaluator consumes that this state never asks: **none**

### Waiting-rule dispositions

6 fallback-dependent route(s) assigned to this jurisdiction. Every one carries exactly one disposition. None is recommended ACTIVE.

| Route | Disposition | Rule(s) / basis |
| --- | --- | --- |
| `deferred-imposition-dismissal-and-sealing` | `LEGAL_OWNER_DECISION_REQUIRED` | `wait-19` |
| `dui-record-sealing-under-the-separate-dui-statute` | `EXPLICIT_BINDING_PROPOSED` | `wait-07` |
| `first-offense-possession-sealing` | `LEGAL_OWNER_DECISION_REQUIRED` | `wait-01`, `wait-02` |
| `general-conviction-sealing-under-n-d-c-c-chapter-12-60-1` | `EXPLICIT_CONDITIONAL_BINDING_PROPOSED` | `wait-05`, `wait-06` — on `offense_level` |
| `marijuana-specific-summary-pardon-or-sealing-relief` | `EXPLICIT_BINDING_PROPOSED` | `wait-03` |
| `non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05` | `EXPLICIT_CONDITIONAL_BINDING_PROPOSED` | `wait-14`, `wait-15` — on `disposition_date` |

### Duration-provenance findings

Structured durations in this jurisdiction's `waitingPeriodRules` that were extracted from something other than the operative wait:

- `wait-01`/`wait-02` — 2 years, stated as a **disqualifying forward window** ('not subsequently convicted within two years of a further controlled-substance violation'), not a wait before filing. This changed `first-offense-possession-sealing` from a proposed binding to `LEGAL_OWNER_DECISION_REQUIRED`.
- `wait-05`/`wait-06`/`wait-10`/`wait-11` — stated as **lookbacks** ('no new conviction for at least N years before filing'), but ND's own table header names them the misdemeanor and felony *waiting periods*, so lookback and wait coincide. This is why the chapter 12-60.1 conditional binding is proposed rather than held.
- `wait-19` — duration 10 days, belonging to a different row of the same concatenated table; it is the only text describing deferred imposition.

### Legal questions still open

Whether ND's misdemeanor and felony lookbacks are the waiting period (its own table says so), and what governs deferred-imposition sealing and first-offense possession sealing.

### County and court (UX-COUNTY-001 / UX-COURT-001)

Classified `SHARED_PHASE2_BLOCKER`. One bounded state-configuration attempt was made and reproduced three blockers first-hand: the screening-parity gate refuses a compiled question's type and option list; the served payload comes from the shared all-51 designer fixture, so the change was inert; and `QuestionField.tsx` has no input combining a controlled list with manual entry. The attempt was reverted and not retried. What is preserved here is a **prepared dataset**, not a live customer-facing selector — the served profile and the renderer do not read it, and both are prohibited paths.
