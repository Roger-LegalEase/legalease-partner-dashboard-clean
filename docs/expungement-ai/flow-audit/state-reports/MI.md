# Michigan (MI) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-2`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 5 |
| Flow rows | 10 |
| Consumer screens | 10 |
| Packet-information builder questions | 4 |
| Question nodes in the public payload | 51 |
| Branch edges | 46 |
| Ordered decision rules | 71 |
| Waiting-period rules | 17 |
| Exclusion rules | 35 |

## Reachability from the rendered screens only

- Packet-ready reachable: **no**
- Payment reachable: **no**
- Best terminal found: `not_yet` on `misdemeanor-marijuana-set-aside-under-mcl-780-621e`
- Facts the evaluator consumes that this state never asks: `financial_obligations`, `new_convictions_during_waiting_period`, `record_documents`, `sentence_completion_date`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `prior_relief` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | **none** |
| 7 | `trafficking_status` | `yes_no_prefer_not_to_say` | yes | `supported_by_eligibility_rule` | `special_category` | **none** |
| 8 | `pending_cases` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 9 | `state_exclusion_categories` | `multi_select` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 10 | `resolved_timing_bucket` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `automatic-clean-slate-set-aside-under-mcl-780-621g` | `non_filing_guidance` | `guidance_only` | closed | — |
| `first-offense-owi-set-aside-by-application` | `paid_packet_intended` | `needs_review` | closed | no |
| `human-trafficking-related-set-aside-application` | `paid_packet_intended` | `guidance_only` | closed | no |
| `misdemeanor-marijuana-set-aside-under-mcl-780-621e` | `paid_packet_intended` | `needs_review` | closed | no |
| `set-aside-by-application-under-mcl-780-621` | `paid_packet_intended` | `guidance_only` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `guidance_only` | 4 |
| `hard_stop` | 2 |
| `needs_review` | 2 |
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
| `EXPAI-MI-e2a5ee07be` | desktop-1440x1000 | 10 | `guidance_only` | yes |
| `EXPAI-MI-8efbd03060` | desktop-1440x1000 | 10 | `hard_stop` | yes |

## Issues touching MI

- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-007** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Current city duplicates the address already requested inside contact information
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-GLOBAL-013** (P0, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The automatic waiting-rule selector cannot choose a rule the profile already contains, closing 13 jurisdictions that are otherwise reachable and payable
- **UX-STATELAW-001** (P1, `STATE_LEGAL_LOGIC`, owner `LEGAL_REVIEW_THEN_PHASE_3_STATE_SHARD`) — 19 jurisdictions reach no packet-ready outcome when the audit answers only the screens the flow renders
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-015** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-016** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery

## Files a Phase 3 shard may change for MI

```text
src/lib/rcap-engine/compiled/profiles/MI-michigan.json
src/lib/rcap/state-packs/michigan/**
docs/expungement-ai/flow-audit/state-reports/MI.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

## Phase 3 SHARD-2 — what this shard did

Base `93e05e945a52cfa1cdd2ab590636290875a48f68` (PHASE2_PRODUCT_HEAD). Evaluator clock pinned to `2026-07-01`. Full record: `data/expungement-ai/flow-audit/shard-results/SHARD-2.json`.

### Changed

- Added `src/lib/rcap/state-packs/michigan/controlled-filing-dataset.ts`: the convicting court as venue, Michigan State Police as the fingerprint/fee destination, and a manual-entry fallback.
- Added an additive `controlledDataBindings` block to `MI-michigan.json`.

### Deliberately not changed

- No question's id, stage, type, prompt, options, required flag, `contextOnly` flag or `doesNotSelectPathway` flag moved.
- No pathway, waiting-period rule, exclusion rule, ordered decision rule, packet family, form mapping, `operationallySellable` value or payment clamp moved.
- No waiting rule was authored and no binding was added. `src/lib/rcap-engine/waiting-rule-bindings.json` and `src/lib/rcap-engine/evaluator.ts` are prohibited paths and are untouched.
- The live `MI:misdemeanor-marijuana-set-aside-under-mcl-780-621e` binding was not touched, though its `longest_bound_duration` selects 10 years from rules whose 10 years is an offence-severity threshold.

### Terminals

No flow row moved. All 10 MI flow IDs keep the terminal they had at the base. Proved by regenerating the audit's own four generators at the base and again with this shard's changes applied: `flow-manifest.json`, `question-inventory.json`, `branch-coverage.json` and `ui-reachability.json` are byte-identical between the two runs.

### Reachability from the rendered screens only, at this base

- Rendered screens: **14**
- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution`
- Facts the evaluator consumes that this state never asks: `record_documents`

This jurisdiction was reopened by Phase 2 and the shard prompt directs that it is not to be re-investigated. It was confirmed still open at this base and left alone.

### Waiting-rule dispositions

4 fallback-dependent route(s) assigned to this jurisdiction. Every one carries exactly one disposition. None is recommended ACTIVE.

| Route | Disposition | Rule(s) / basis |
| --- | --- | --- |
| `automatic-clean-slate-set-aside-under-mcl-780-621g` | `HELD_FOR_CORRECTION` | `wait-10`, `wait-11` |
| `first-offense-owi-set-aside-by-application` | `EXPLICIT_BINDING_PROPOSED` | `wait-08` |
| `human-trafficking-related-set-aside-application` | `LEGAL_OWNER_DECISION_REQUIRED` | no rule scoped to this route |
| `set-aside-by-application-under-mcl-780-621` | `LEGAL_OWNER_DECISION_REQUIRED` | `wait-07`, `wait-08`, `wait-09` |

### Duration-provenance findings

Structured durations in this jurisdiction's `waitingPeriodRules` that were extracted from something other than the operative wait:

- `wait-10` — duration **93 days**, extracted from a **sentence term** ('(≥ 93 days'); operative wait **7 years** from imposition of sentence.
- `wait-04`, `wait-14`, `wait-17` — 3 years each, extracted from the post-denial **refiling bar** (MCL 780.621d(5)); none is a waiting period for a first application.
- `wait-05`, `wait-12`, `wait-16` — 10 years, extracted from an **offence-severity threshold** ('punishable by more than 10 years').

### Potential P0 payment / legal-outcome risks

- `MI:automatic-clean-slate-set-aside-under-mcl-780-621g` would become a P0 **if bound as it stands**: `wait-10`'s structured duration is 93 days, taken from the offence-severity qualifier '(≥ 93 days', while its own text states the wait is 7 years. No live effect today — the route is `guidance_only` with payment closed.

### Legal questions still open

How many convictions the applicant has, which is what separates MI wait-08 from wait-09 and which the flow never asks; and whether MCL 780.621e marijuana set-aside really carries a 10-year wait.

### County and court (UX-COUNTY-001 / UX-COURT-001)

Classified `SHARED_PHASE2_BLOCKER`. One bounded state-configuration attempt was made and reproduced three blockers first-hand: the screening-parity gate refuses a compiled question's type and option list; the served payload comes from the shared all-51 designer fixture, so the change was inert; and `QuestionField.tsx` has no input combining a controlled list with manual entry. The attempt was reverted and not retried. What is preserved here is a **prepared dataset**, not a live customer-facing selector — the served profile and the renderer do not read it, and both are prohibited paths.
