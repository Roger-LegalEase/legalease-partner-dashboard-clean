# Rhode Island (RI) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-2`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 8 |
| Flow rows | 13 |
| Consumer screens | 6 |
| Packet-information builder questions | 8 |
| Question nodes in the public payload | 47 |
| Branch edges | 36 |
| Ordered decision rules | 91 |
| Waiting-period rules | 16 |
| Exclusion rules | 10 |

## Reachability from the rendered screens only

- Packet-ready reachable: **no**
- Payment reachable: **no**
- Best terminal found: `needs_more_info` on `path-c-deferred-sentence-expungement`
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
| `path-a-first-offender-conviction-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `path-b-multiple-misdemeanor-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `path-c-deferred-sentence-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `path-d-non-conviction-sealing-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `path-e-filed-complaint-relief-under-12-10-12` | `paid_packet_intended` | `needs_review` | closed | no |
| `path-f-marijuana-possession-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `path-g-decriminalized-offense-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `path-h-commercial-sexual-activity-related-expungement` | `paid_packet_intended` | `needs_review` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `needs_review` | 10 |
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
| `EXPAI-RI-7db4cf78a4` | desktop-1440x1000 | 6 | `needs_review` | yes |
| `EXPAI-RI-45c6d64fb9` | desktop-1440x1000 | 6 | `hard_stop` | yes |

## Issues touching RI

- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-007** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Current city duplicates the address already requested inside contact information
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-STATELAW-001** (P1, `STATE_LEGAL_LOGIC`, owner `LEGAL_REVIEW_THEN_PHASE_3_STATE_SHARD`) — 19 jurisdictions reach no packet-ready outcome when the audit answers only the screens the flow renders
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-015** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-016** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery

## Files a Phase 3 shard may change for RI

```text
src/lib/rcap-engine/compiled/profiles/RI-rhode-island.json
src/lib/rcap/state-packs/rhode-island/**
docs/expungement-ai/flow-audit/state-reports/RI.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

## Phase 3 SHARD-2 — what this shard did

Base `93e05e945a52cfa1cdd2ab590636290875a48f68` (PHASE2_PRODUCT_HEAD). Evaluator clock pinned to `2026-07-01`. Full record: `data/expungement-ai/flow-audit/shard-results/SHARD-2.json`.

### Changed

- Added `src/lib/rcap/state-packs/rhode-island/controlled-filing-dataset.ts`: the court of conviction as venue, the Attorney General's BCI unit as an order destination, and a note that Rhode Island is a single statewide judicial system with no county venue.
- Added an additive `controlledDataBindings` block to `RI-rhode-island.json` recording **zero bindings**: Rhode Island publishes no typed court or county question.

### Deliberately not changed

- No question's id, stage, type, prompt, options, required flag, `contextOnly` flag or `doesNotSelectPathway` flag moved.
- No pathway, waiting-period rule, exclusion rule, ordered decision rule, packet family, form mapping, `operationallySellable` value or payment clamp moved.
- No waiting rule was authored and no binding was added. `src/lib/rcap-engine/waiting-rule-bindings.json` and `src/lib/rcap-engine/evaluator.ts` are prohibited paths and are untouched.
- Rhode Island's `HELD_FOR_LEGAL_DECISION` hold is preserved exactly. All eight routes are recorded `LEGAL_OWNER_DECISION_REQUIRED`, with candidate rules attached as evidence *for the owner* rather than proposed as bindings.

### Terminals

No flow row moved. All 13 RI flow IDs keep the terminal they had at the base. Proved by regenerating the audit's own four generators at the base and again with this shard's changes applied: `flow-manifest.json`, `question-inventory.json`, `branch-coverage.json` and `ui-reachability.json` are byte-identical between the two runs.

### Reachability from the rendered screens only, at this base

- Rendered screens: **12**
- Packet-ready reachable: **no**
- Payment reachable: **no**
- Best terminal found: `not_yet`
- Facts the evaluator consumes that this state never asks: **none**

Rhode Island still reaches no packet-ready terminal. The structural half of that issue is closed: the list of facts the evaluator uses but the flow never asks is now **empty**, and the route resolves `path-a-first-offender-conviction-expungement` and returns `not_yet`. `not_yet` is a timing outcome, not a missing-fact outcome, so neither limb the shard prompt offers is the true one. What stands between Rhode Island and a packet is *which waiting rule governs* — and that is exactly what Rhode Island is held for. Escalated, not answered.

### Waiting-rule dispositions

8 fallback-dependent route(s) assigned to this jurisdiction. Every one carries exactly one disposition. None is recommended ACTIVE.

| Route | Disposition | Rule(s) / basis |
| --- | --- | --- |
| `path-a-first-offender-conviction-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | `wait-10`, `wait-11` |
| `path-b-multiple-misdemeanor-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | `wait-02`, `wait-12` |
| `path-c-deferred-sentence-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | `wait-03` |
| `path-d-non-conviction-sealing-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | `wait-04`, `wait-05`, `wait-06`, `wait-07` |
| `path-e-filed-complaint-relief-under-12-10-12` | `LEGAL_OWNER_DECISION_REQUIRED` | no rule scoped to this route |
| `path-f-marijuana-possession-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | no rule scoped to this route |
| `path-g-decriminalized-offense-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | no rule scoped to this route |
| `path-h-commercial-sexual-activity-related-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | `wait-08` |

### Duration-provenance findings

Structured durations in this jurisdiction's `waitingPeriodRules` that were extracted from something other than the operative wait:

- `wait-09` and `wait-15` are multi-class picker blobs whose durations belong to no single route. Recorded as evidence for the held legal decision, not acted on.

### Legal questions still open

Every RI waiting rule. The repository holds clean-looking candidates for paths B, C and H, which are recorded as evidence for the owner rather than proposed.

### County and court (UX-COUNTY-001 / UX-COURT-001)

Classified `SHARED_PHASE2_BLOCKER`. One bounded state-configuration attempt was made and reproduced three blockers first-hand: the screening-parity gate refuses a compiled question's type and option list; the served payload comes from the shared all-51 designer fixture, so the change was inert; and `QuestionField.tsx` has no input combining a controlled list with manual entry. The attempt was reverted and not retried. What is preserved here is a **prepared dataset**, not a live customer-facing selector — the served profile and the renderer do not read it, and both are prohibited paths.
