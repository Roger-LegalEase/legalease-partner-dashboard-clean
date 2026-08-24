# Arkansas (AR) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-5`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 3 |
| Flow rows | 8 |
| Consumer screens | 11 |
| Packet-information builder questions | 5 |
| Question nodes in the public payload | 51 |
| Branch edges | 48 |
| Ordered decision rules | 58 |
| Waiting-period rules | 14 |
| Exclusion rules | 19 |

## Reachability from the rendered screens only

- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution` on `situation-a-non-convictions`
- Facts the evaluator consumes that this state never asks: `new_convictions_during_waiting_period`, `record_documents`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `sentence_completion_date` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 7 | `financial_obligations` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | yes |
| 8 | `pending_cases` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 9 | `resolved_timing_bucket` | `single_choice` | yes | `supported_by_eligibility_rule` | `low` | yes |
| 10 | `court_requirements_completed` | `single_choice` | yes | `supported_by_eligibility_rule` | `court_identity` | yes |
| 11 | `state_exclusion_categories` | `multi_select` | yes | `supported_by_escalation` | `criminal_record` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `situation-a-non-convictions` | `paid_packet_intended` | `needs_review` | closed | no |
| `situation-b-misdemeanor-convictions` | `paid_packet_intended` | `guidance_only` | closed | no |
| `situation-c-felony-convictions` | `paid_packet_intended` | `needs_more_info` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `needs_review` | 2 |
| `needs_more_info` | 2 |
| `hard_stop` | 2 |
| `likely_not_eligible` | 1 |
| `guidance_only` | 1 |

## Non-remedy terminals

| Probe | Terminal | What it exercises |
| --- | --- | --- |
| `inside_waiting_period` | `needs_review` | Participant's case resolved inside the shortest timing bucket the state offers. |
| `no_answers_supplied` | `needs_more_info` | Participant lands on the state's first screen and submits nothing. |
| `not_my_own_record` | `hard_stop` | Participant answers the ownership question with someone else's record. |
| `out_of_jurisdiction_case` | `hard_stop` | Participant's case is not a state or local case in this jurisdiction. |
| `state_exclusion_selected` | `likely_not_eligible` | Participant selects a state exclusion category on the exclusion screen. |

## Browser evidence

| Flow | Viewport | Screens walked | Rendered terminal | Matches manifest |
| --- | --- | --- | --- | --- |
| `EXPAI-AR-6dd3254b94` | desktop-1440x1000 | 11 | `needs_more_info` | yes |
| `EXPAI-AR-777adfcba3` | desktop-1440x1000 | 11 | `hard_stop` | yes |
| `EXPAI-AR-dac222f72b` | desktop-1440x1000 | 11 | `needs_review` | yes |
| `EXPAI-AR-6dd3254b94` | mobile-390x844 | 11 | `needs_more_info` | yes |
| `EXPAI-AR-dac222f72b` | mobile-390x844 | 11 | `needs_review` | yes |

## Issues touching AR

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

## Files a Phase 3 shard may change for AR

```text
src/lib/rcap-engine/compiled/profiles/AR-arkansas.json
src/lib/rcap/state-packs/arkansas/**
docs/expungement-ai/flow-audit/state-reports/AR.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

---

# Phase 3 — SHARD-5 sign-off

Built from `93e05e945a52cfa1cdd2ab590636290875a48f68` (the Phase 2 product head). Evaluator clock pinned to `2026-07-01`.
Full record: `data/expungement-ai/flow-audit/shard-results/SHARD-5.json`.

## What changed for AR

| File | Change |
| --- | --- |
| `src/lib/rcap/state-packs/arkansas/county-court-directory.ts` | **New.** The controlled county and court dataset for Arkansas: all 75 counties, 2 court options each carrying the verbatim quote from this repository that supports it, and the two clearly-labelled fallbacks UX-COUNTY-001 and UX-COURT-001 require. |
| `src/lib/rcap/state-packs/arkansas/index.ts` | Re-exports the new module. |
| `src/lib/rcap-engine/compiled/profiles/AR-arkansas.json` | **Unchanged**, deliberately. See below. |

No waiting rule, exclusion rule, ordered decision rule, packet family, form mapping, payment clamp or `operationallySellable` value was changed. No question was deleted. No terminal moved.

## Why the compiled profile is unchanged

The county and court selector this issue asks for **was written for AR, measured, and reverted**. Two independent reasons, either sufficient:

1. **It would have been invisible.** `buildProfileDraft` in `src/lib/rcap-engine/public-profile-projection.ts` builds the public profile from `src/lib/rcap-engine/compiled/all51.json`, not from the per-state compiled profile, whenever the jurisdiction is present there — and all 51 are. The audit's own manifest already records this: `runtimeConsumerQuestionAuthority` is `all51.json`; `runtimeEligibilityAuthority` is `compiled/profiles/*.json`. This shard owns the second and not the first. Measured: with the binding applied, re-projecting AR returned the unchanged question.
2. **It would have failed this shard's own acceptance test.** `scripts/verify-expungement-plain-language-values.mjs` fails on a changed question type, option list, prompt, order or count unless the change is recorded in `data/expungement-ai/screening-parity-approved-deltas.json`, which is a prohibited path for this shard.

The exact question objects are preserved in the shard result under `proposedCompiledProfileQuestions`, and the option lists are re-derivable from the state pack, so the integration captain can land them without re-deriving anything.

## Reachability at this base

| Measure | Phase 1 artifact | This base | Explanation |
| --- | --- | --- | --- |
| Rendered consumer screens | 11 | 14 | allowlist `shared-facts-rendered` |
| Best terminal from rendered screens only | `packet_ready_with_caution / payment reachable` | `packet_ready_with_caution / payment reachable` | unchanged |

Every difference is explained by `data/expungement-ai/phase2/correction-allowlist.json`. None is caused by this shard.

## Waiting-rule dispositions

3 of this shard's 41 fallback-dependent routes are AR's. Each resolves through the provisional prose selector kept in the evaluator, and each is dispositioned rather than bound: `waiting-rule-bindings.json` and `evaluator.ts` are prohibited paths, so a shard proposes and the integration captain binds.

| Route | Disposition | Rule |
| --- | --- | --- |
| `situation-a-non-convictions` | `EXPLICIT_BINDING_PROPOSED` | wait-01 |
| `situation-b-misdemeanor-convictions` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates: wait-05, wait-06, wait-14 |
| `situation-c-felony-convictions` | `HELD_FOR_CORRECTION` | candidates: wait-02, wait-07 |

1 × `EXPLICIT_BINDING_PROPOSED` · 1 × `LEGAL_OWNER_DECISION_REQUIRED` · 1 × `HELD_FOR_CORRECTION` · **0 recommended active.**

No duration in any proposal was written by this shard. Every one is quoted from the duration Arkansas's own compiled profile already publishes, with its rule id.

## Findings and open questions

- **A defect this shard found and did not fix.** Ordered decision rule `rule-45-and-2021-amendments-the-agent-must-confirm-the-current-` is a truncated source sentence compiled into a participant-facing rule. Its `when.fieldsReferenced` and `when.caseOutcomes` are both empty, so it fires for every participant on `situation-c-felony-convictions` and returns `needs_more_info` with `return_to_exact_missing_questions` while `missingQuestionIds` is empty — a return to a screen with nothing on it. Its condition text is an instruction to a human agent ("The agent must confirm the current § 16-90-1405 list…"). Removing it opens a currently-closed Arkansas route, which moves an evaluator output and needs a reviewed entry in the shared correction allowlist, so it is proposed rather than applied (`AR-DEFECT-001`, allowlist entry `ar-situation-c-agent-note-not-a-participant-rule`).
- `situation-a-non-convictions` is one of only eight routes in this shard where a single published rule governs unconditionally. `wait-01` ("generally carry no waiting period") is proposed, corroborated by `wait-14`'s own table row: "Acquittal / nolle prosequi / dismissal / arrest — None".

## Court dataset

- Counties: **75**, complete for Arkansas, no duplicate. AR is not on UX-COUNTY-001's jurisdiction list — it asks `county_or_filing_location` ("Where in Arkansas did the case happen?"), which is a location rather than a county, which is why the audit scoped the issue elsewhere. The dataset is shipped anyway because the packet binds a county.
- Courts: **2**, not exhaustive by design. A court this repository does not name is absent rather than invented, which is why the manual-entry fallback is part of the contract and not a nicety.
  - `Circuit Court` — "File in the circuit or district court that handled the case." (`AR-arkansas.json#packetGenerator.filingDestinationRules`)
  - `District Court` — "File in the circuit or district court that handled the case." (`AR-arkansas.json#packetGenerator.filingDestinationRules`)
