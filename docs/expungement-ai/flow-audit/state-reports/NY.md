# New York (NY) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-1`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 5 |
| Flow rows | 10 |
| Consumer screens | 18 |
| Packet-information builder questions | 4 |
| Question nodes in the public payload | 51 |
| Branch edges | 70 |
| Ordered decision rules | 77 |
| Waiting-period rules | 13 |
| Exclusion rules | 19 |

## Reachability from the rendered screens only

- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution` on `conditional-treatment-sealing-under-cpl-160-58`
- Facts the evaluator consumes that this state never asks: `financial_obligations`, `new_convictions_during_waiting_period`, `record_documents`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `sentence_completion_date` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 7 | `pending_cases` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 8 | `resolved_timing_bucket` | `single_choice` | yes | `supported_by_eligibility_rule` | `low` | yes |
| 9 | `court_requirements_completed` | `single_choice` | yes | `supported_by_eligibility_rule` | `court_identity` | yes |
| 10 | `ny_16059_total_eligible_convictions` | `number_or_range` | no | `supported_by_escalation` | `criminal_record` | yes |
| 11 | `ny_16059_felony_convictions` | `number_or_range` | no | `supported_by_escalation` | `criminal_record` | yes |
| 12 | `ny_16059_ineligible_offense` | `yes_no_unsure` | no | `supported_by_escalation` | `criminal_record` | yes |
| 13 | `ny_16059_sex_offender_registration` | `yes_no_unsure` | no | `supported_by_escalation` | `special_category` | yes |
| 14 | `ny_16059_pending_charge` | `yes_no_unsure` | no | `supported_by_escalation` | `criminal_record` | yes |
| 15 | `ny_16059_post_last_conviction_crime` | `yes_no_unsure` | no | `supported_by_escalation` | `criminal_record` | yes |
| 16 | `ny_16059_prior_sealing` | `yes_no_unsure` | no | `supported_by_escalation` | `criminal_record` | yes |
| 17 | `ny_16058_treatment_program_completed` | `yes_no_unsure` | no | `supported_by_escalation` | `special_category` | yes |
| 18 | `state_exclusion_categories` | `multi_select` | yes | `supported_by_escalation` | `criminal_record` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `automatic-clean-slate-sealing-under-cpl-160-57` | `non_filing_guidance` | `guidance_only` | closed | — |
| `automatic-non-conviction-sealing-under-cpl-160-50-160-55` | `non_filing_guidance` | `guidance_only` | closed | — |
| `conditional-treatment-sealing-under-cpl-160-58` | `paid_packet_intended` | `needs_review` | closed | no |
| `discretionary-conviction-sealing-by-petition-under-cpl-160-59` | `paid_packet_intended` | `needs_review` | closed | no |
| `marijuana-record-destruction-under-the-mrta` | `non_filing_guidance` | `guidance_only` | closed | — |

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
| `EXPAI-NY-c0d795b1a9` | desktop-1440x1000 | 18 | `guidance_only` | yes |
| `EXPAI-NY-97a89a33c1` | desktop-1440x1000 | 18 | `hard_stop` | yes |

## Issues touching NY

- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-007** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Current city duplicates the address already requested inside contact information
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-STATECFG-001** (P2, `STATE_CONFIGURATION`, owner `PHASE_3_STATE_SHARD`) — Route-specific facts are asked of every participant in the state before the route is known
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-015** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-016** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery

## Files a Phase 3 shard may change for NY

```text
src/lib/rcap-engine/compiled/profiles/NY-new-york.json
src/lib/rcap/state-packs/new-york/**
docs/expungement-ai/flow-audit/state-reports/NY.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

## Phase 3 — SHARD-1

**Base SHA:** `93e05e945a52cfa1cdd2ab590636290875a48f68` · **Branch:** `claude/expai-state-shard-01` · **Hold status:** `not_held`

Full sign-off packet: `data/expungement-ai/flow-audit/shard-results/SHARD-1.json`.

### What changed

- Added src/lib/rcap/state-packs/new-york/county-court-instructions.ts — the UX-COURT-001 state binding: the offence-driven court-of-conviction venue rule quoted from the profile.
- Exported it from src/lib/rcap/state-packs/new-york/index.ts.

### What was deliberately not changed

- src/lib/rcap-engine/compiled/profiles/NY-new-york.json — untouched, including wait-11, whose single structured duration of three years misrepresents a table row that states 'None' for three of New York's routes.
- The seven unconditional CPL 160.59 conviction-counting screens stay unconditional (UX-STATECFG-001, P2, not release-critical this phase, and the fix lives in prohibited shared code anyway).

### Reachability re-measured at this base

| Measure | Value |
| --- | --- |
| Rendered screens | 22 |
| Packet-ready reachable from rendered screens only | **yes** |
| Payment reachable from rendered screens only | **yes** |
| Best terminal found | `packet_ready_with_caution` |
| Best pathway | `conditional-treatment-sealing-under-cpl-160-58` |
| Facts the evaluator uses that this flow never renders | `record_documents` |

### Fallback-dependent routes and their Phase 3 disposition

| Route | Disposition | Why, in short |
| --- | --- | --- |
| `automatic-clean-slate-sealing-under-cpl-160-57` | `EXPLICIT_CONDITIONAL_BINDING_PROPOSED` | a fact the participant already supplies selects between published rules; field, values and rule ids recorded |
| `automatic-non-conviction-sealing-under-cpl-160-50-160-55` | `EXPLICIT_BINDING_PROPOSED` | one rule in this state's own profile governs unconditionally; rule id and source text recorded |
| `conditional-treatment-sealing-under-cpl-160-58` | `LEGAL_OWNER_DECISION_REQUIRED` | the repository cannot settle which rule governs, or the candidates conflict |
| `discretionary-conviction-sealing-by-petition-under-cpl-160-59` | `EXPLICIT_BINDING_PROPOSED` | one rule in this state's own profile governs unconditionally; rule id and source text recorded |
| `marijuana-record-destruction-under-the-mrta` | `EXPLICIT_BINDING_PROPOSED` | one rule in this state's own profile governs unconditionally; rule id and source text recorded |

None is recommended ACTIVE. Every one still resolves through the provisional prose selector kept in the shared evaluator, and a proposal is evidence, not a binding.

### Terminals

10 flow row(s) belong to this jurisdiction in SHARD-1. **0** moved.

This shard changed no compiled profile, no question, no decision rule and no waiting rule, so no terminal moved and no entry is proposed for the Phase 2 correction allowlist.

### Legal questions left open

- CPL 160.58 — is conditional treatment sealing gated on programme completion with no elapsed period, or does a period apply? This is the route New York's only UI-reachable packet currently runs through.

### County and court — `SHARED_PHASE2_BLOCKER`

`UX-COURT-001` cannot be completed inside a Phase 3 shard, and Shards 4 and 6 reproduced the
same blocker independently. One bounded state-configuration attempt was made and reverted:
rebinding `AZ:court` from `text` to a controlled `single_choice` list fails
`scripts/verify-expungement-plain-language-values.mjs` with *"changed type"* and
*"changed option values/order"*. The assertion is structural and applies to every question in
every one of the 51 compiled profiles, so it was not retried per state.

What this shard preserved instead is the source-backed state half, ready to apply:
`src/lib/rcap/state-packs/new-york/county-court-instructions.ts`.

The shared paths and controls the rebind needs — the parity approval record, the selector branch
in the shared question renderer — are listed in
`SHARD-1.json#sharedPhase2Blocker`, together with the exact steps and option lists to apply once
the shared half lands.
