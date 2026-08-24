# Kansas (KS) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-5`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 4 |
| Flow rows | 9 |
| Consumer screens | 7 |
| Packet-information builder questions | 3 |
| Question nodes in the public payload | 47 |
| Branch edges | 32 |
| Ordered decision rules | 19 |
| Waiting-period rules | 3 |
| Exclusion rules | 2 |

## Reachability from the rendered screens only

- Packet-ready reachable: **no**
- Payment reachable: **no**
- Best terminal found: `not_yet` on `conviction-or-diversion-216614`
- Facts the evaluator consumes that this state never asks: `new_convictions_during_waiting_period`, `pending_cases`, `record_documents`, `sentence_completion_date`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `financial_obligations` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | yes |
| 7 | `resolved_timing_bucket` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `conviction-or-diversion-216614` | `paid_packet_intended` | `needs_review` | closed | no |
| `drug-registration-relief-coordination` | `non_filing_guidance` | `guidance_only` | closed | — |
| `prostitution-coercion` | `paid_packet_intended` | `guidance_only` | closed | no |
| `specialty-court-accelerated` | `paid_packet_intended` | `needs_review` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `needs_review` | 4 |
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
| `EXPAI-KS-2c904cd156` | desktop-1440x1000 | 7 | `needs_review` | yes |
| `EXPAI-KS-2886076923` | desktop-1440x1000 | 7 | `hard_stop` | yes |

## Issues touching KS

- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COUNTY-001** (P1, `COUNTY_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — County is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-STATELAW-001** (P1, `STATE_LEGAL_LOGIC`, owner `LEGAL_REVIEW_THEN_PHASE_3_STATE_SHARD`) — 19 jurisdictions reach no packet-ready outcome when the audit answers only the screens the flow renders
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-015** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-016** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery

## Files a Phase 3 shard may change for KS

```text
src/lib/rcap-engine/compiled/profiles/KS-kansas.json
src/lib/rcap/state-packs/kansas/**
docs/expungement-ai/flow-audit/state-reports/KS.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

---

# Phase 3 — SHARD-5 sign-off

Built from `93e05e945a52cfa1cdd2ab590636290875a48f68` (the Phase 2 product head). Evaluator clock pinned to `2026-07-01`.
Full record: `data/expungement-ai/flow-audit/shard-results/SHARD-5.json`.

## What changed for KS

| File | Change |
| --- | --- |
| `src/lib/rcap/state-packs/kansas/county-court-directory.ts` | **New.** The controlled county and court dataset for Kansas: all 105 counties, 1 court option each carrying the verbatim quote from this repository that supports it, and the two clearly-labelled fallbacks UX-COUNTY-001 and UX-COURT-001 require. |
| `src/lib/rcap/state-packs/kansas/index.ts` | Re-exports the new module. |
| `src/lib/rcap-engine/compiled/profiles/KS-kansas.json` | **Unchanged**, deliberately. See below. |

No waiting rule, exclusion rule, ordered decision rule, packet family, form mapping, payment clamp or `operationallySellable` value was changed. No question was deleted. No terminal moved.

## Why the compiled profile is unchanged

The county and court selector this issue asks for **was written for KS, measured, and reverted**. Two independent reasons, either sufficient:

1. **It would have been invisible.** `buildProfileDraft` in `src/lib/rcap-engine/public-profile-projection.ts` builds the public profile from `src/lib/rcap-engine/compiled/all51.json`, not from the per-state compiled profile, whenever the jurisdiction is present there — and all 51 are. The audit's own manifest already records this: `runtimeConsumerQuestionAuthority` is `all51.json`; `runtimeEligibilityAuthority` is `compiled/profiles/*.json`. This shard owns the second and not the first. Measured: with the binding applied, re-projecting KS returned the unchanged question.
2. **It would have failed this shard's own acceptance test.** `scripts/verify-expungement-plain-language-values.mjs` fails on a changed question type, option list, prompt, order or count unless the change is recorded in `data/expungement-ai/screening-parity-approved-deltas.json`, which is a prohibited path for this shard.

The exact question objects are preserved in the shard result under `proposedCompiledProfileQuestions`, and the option lists are re-derivable from the state pack, so the integration captain can land them without re-deriving anything.

## Reachability at this base

| Measure | Phase 1 artifact | This base | Explanation |
| --- | --- | --- | --- |
| Rendered consumer screens | 7 | 11 | allowlist `shared-facts-rendered` |
| Best terminal from rendered screens only | `not_yet / payment not reachable` | `not_yet / payment not reachable` | unchanged; held |

Every difference is explained by `data/expungement-ai/phase2/correction-allowlist.json`. None is caused by this shard.

## Waiting-rule dispositions

3 of this shard's 41 fallback-dependent routes are KS's. Each resolves through the provisional prose selector kept in the evaluator, and each is dispositioned rather than bound: `waiting-rule-bindings.json` and `evaluator.ts` are prohibited paths, so a shard proposes and the integration captain binds.

| Route | Disposition | Rule |
| --- | --- | --- |
| `conviction-or-diversion-216614` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates: wait-01, wait-02 |
| `specialty-court-accelerated` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates: wait-03 |
| `drug-registration-relief-coordination` | `LEGAL_OWNER_DECISION_REQUIRED` | none published |

3 × `LEGAL_OWNER_DECISION_REQUIRED` · **0 recommended active.**

No duration in any proposal was written by this shard. Every one is quoted from the duration Kansas's own compiled profile already publishes, with its rule id.

## Hold

HELD_FOR_LEGAL_DECISION — preserved exactly. Terminal `needs_review` → `needs_review`; payment false → false.

## Findings and open questions

- **Kansas is held, and this shard preserved the hold exactly.** No Kansas rule, question, terminal or payment value was changed.
- **What actually blocks Kansas.** Step 2 of this shard asks which of two things is true: a missing fact is a genuine legal precondition, or the route is not available to a self-help participant. Measured at this base, **neither is**. Nothing is missing — the bounded sweep answers every rendered Kansas screen and the evaluator returns an empty `missingQuestionIds`. And the route is available to a self-help participant: `conviction-or-diversion-216614` is `routeType: court_filing`, `filingRequired: true`, and the Kansas source says the petition is filed in the county of arrest. What blocks it is the waiting rule, and only the waiting rule.
- **The measurement.** With a fully clear record and each of the eight timing-bucket values in turn, both petition routes return `not_yet` with `ks.timing_or_completion_blocker` at every value — including `gt_10_years`. A gate that answers identically at over ten years and at under one year is reporting that it cannot resolve a rule, not applying one. Kansas rule `wait-01` publishes `duration: null` and the sentence "offense-dependent one-, three-, five-, or ten-year periods" without ever saying which offence takes which period. There is no duration in the repository to bind to (`KS-LEGAL-001`, `KS-LEGAL-002`).

## County and court datasets

- Counties: **105**, complete for Kansas, no duplicate. KS is one of UX-COUNTY-001's four assigned jurisdictions for this shard.
- Courts: **1**, not exhaustive by design. A court this repository does not name is absent rather than invented, which is why the manual-entry fallback is part of the contract and not a nicety.
  - `District Court` — "IN THE JUDICIAL DISTRICT DISTRICT COURT OF COUNTY, KANSAS" (`KS-kansas.json#sourceSections (Petition for Expungement of Conviction or Diversion caption)`)
