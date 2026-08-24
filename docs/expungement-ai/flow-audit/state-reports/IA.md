# Iowa (IA) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-2`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 5 |
| Flow rows | 10 |
| Consumer screens | 9 |
| Packet-information builder questions | 3 |
| Question nodes in the public payload | 49 |
| Branch edges | 41 |
| Ordered decision rules | 24 |
| Waiting-period rules | 4 |
| Exclusion rules | 3 |

## Reachability from the rendered screens only

- Packet-ready reachable: **no**
- Payment reachable: **no**
- Best terminal found: `not_yet` on `nonconviction-901c2`
- Facts the evaluator consumes that this state never asks: `new_convictions_during_waiting_period`, `pending_cases`, `record_documents`, `sentence_completion_date`, `special_preconditions_confirmed`

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
| 8 | `financial_obligations` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | yes |
| 9 | `resolved_timing_bucket` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `minor-prostitution-7251` | `paid_packet_intended` | `guidance_only` | closed | no |
| `misdemeanor-901c3` | `paid_packet_intended` | `needs_review` | closed | no |
| `nonconviction-901c2` | `paid_packet_intended` | `needs_review` | closed | no |
| `public-intoxication-12346` | `paid_packet_intended` | `needs_review` | closed | no |
| `underage-alcohol-12347` | `paid_packet_intended` | `needs_review` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `needs_review` | 6 |
| `hard_stop` | 2 |
| `needs_more_info` | 1 |
| `guidance_only` | 1 |

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
| `EXPAI-IA-fce6d78f56` | desktop-1440x1000 | 9 | `guidance_only` | yes |
| `EXPAI-IA-057ddb2cac` | desktop-1440x1000 | 9 | `hard_stop` | yes |

## Issues touching IA

- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COUNTY-001** (P1, `COUNTY_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — County is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-GLOBAL-013** (P0, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The automatic waiting-rule selector cannot choose a rule the profile already contains, closing 13 jurisdictions that are otherwise reachable and payable
- **UX-STATELAW-001** (P1, `STATE_LEGAL_LOGIC`, owner `LEGAL_REVIEW_THEN_PHASE_3_STATE_SHARD`) — 19 jurisdictions reach no packet-ready outcome when the audit answers only the screens the flow renders
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-015** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-016** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery

## Files a Phase 3 shard may change for IA

```text
src/lib/rcap-engine/compiled/profiles/IA-iowa.json
src/lib/rcap/state-packs/iowa/**
docs/expungement-ai/flow-audit/state-reports/IA.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

## Phase 3 SHARD-2 — what this shard did

Base `93e05e945a52cfa1cdd2ab590636290875a48f68` (PHASE2_PRODUCT_HEAD). Evaluator clock pinned to `2026-07-01`. Full record: `data/expungement-ai/flow-audit/shard-results/SHARD-2.json`.

### Changed

- Added `src/lib/rcap/state-packs/iowa/controlled-filing-dataset.ts`. Iowa's `filingDestinationRules` is also empty, so the court destination was sourced from the official application caption in `sourceSections` — weaker provenance than the other seven, and flagged as such.
- Added an additive `controlledDataBindings` block to `IA-iowa.json` binding `court` and `county`.

### Deliberately not changed

- No question's id, stage, type, prompt, options, required flag, `contextOnly` flag or `doesNotSelectPathway` flag moved.
- No pathway, waiting-period rule, exclusion rule, ordered decision rule, packet family, form mapping, `operationallySellable` value or payment clamp moved.
- No waiting rule was authored and no binding was added. `src/lib/rcap-engine/waiting-rule-bindings.json` and `src/lib/rcap-engine/evaluator.ts` are prohibited paths and are untouched.

### Terminals

No flow row moved. All 10 IA flow IDs keep the terminal they had at the base. Proved by regenerating the audit's own four generators at the base and again with this shard's changes applied: `flow-manifest.json`, `question-inventory.json`, `branch-coverage.json` and `ui-reachability.json` are byte-identical between the two runs.

### Reachability from the rendered screens only, at this base

- Rendered screens: **13**
- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution`
- Facts the evaluator consumes that this state never asks: `record_documents`

This jurisdiction was reopened by Phase 2 and the shard prompt directs that it is not to be re-investigated. It was confirmed still open at this base and left alone.

### Waiting-rule dispositions

4 fallback-dependent route(s) assigned to this jurisdiction. Every one carries exactly one disposition. None is recommended ACTIVE.

| Route | Disposition | Rule(s) / basis |
| --- | --- | --- |
| `minor-prostitution-7251` | `HELD_FOR_CORRECTION` | `wait-04` |
| `misdemeanor-901c3` | `EXPLICIT_BINDING_PROPOSED` | `wait-02` |
| `public-intoxication-12346` | `HELD_FOR_CORRECTION` | `wait-04` |
| `underage-alcohol-12347` | `HELD_FOR_CORRECTION` | `wait-04` |

### Duration-provenance findings

Structured durations in this jurisdiction's `waitingPeriodRules` that were extracted from something other than the operative wait:

- `wait-04` — duration **null** while its prose states a two-year period ('during the two-year period after conviction'). It is the only rule for three Iowa routes. Operative wait: a two-year clean window; whether that is also the wait before filing is the open legal question. No live effect — all three routes are `needs_review` with payment closed.
- `wait-03`'s 30 days is a **document-freshness** window for the DCI check attached at filing, not a waiting period, and must not be bound as one.

### Legal questions still open

Whether wait-04's two-year clean window is also the wait before filing for the public-intoxication, underage-alcohol and minor-prostitution routes.

### County and court (UX-COUNTY-001 / UX-COURT-001)

Classified `SHARED_PHASE2_BLOCKER`. One bounded state-configuration attempt was made and reproduced three blockers first-hand: the screening-parity gate refuses a compiled question's type and option list; the served payload comes from the shared all-51 designer fixture, so the change was inert; and `QuestionField.tsx` has no input combining a controlled list with manual entry. The attempt was reverted and not retried. What is preserved here is a **prepared dataset**, not a live customer-facing selector — the served profile and the renderer do not read it, and both are prohibited paths.
