# Oregon (OR) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-1`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 3 |
| Flow rows | 8 |
| Consumer screens | 11 |
| Packet-information builder questions | 4 |
| Question nodes in the public payload | 50 |
| Branch edges | 52 |
| Ordered decision rules | 70 |
| Waiting-period rules | 23 |
| Exclusion rules | 26 |

## Reachability from the rendered screens only

- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution` on `set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c`
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
| `marijuana-specific-set-aside-redesignation` | `paid_packet_intended` | `guidance_only` | closed | no |
| `set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c` | `paid_packet_intended` | `needs_review` | closed | no |
| `set-aside-of-eligible-convictions-under-ors-137-225-1-a` | `paid_packet_intended` | `needs_review` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `needs_review` | 3 |
| `hard_stop` | 2 |
| `needs_more_info` | 1 |
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
| `EXPAI-OR-6bfdbff090` | desktop-1440x1000 | 11 | `guidance_only` | yes |
| `EXPAI-OR-29c792837e` | desktop-1440x1000 | 11 | `hard_stop` | yes |

## Issues touching OR

- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COUNTY-001** (P1, `COUNTY_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — County is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-007** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Current city duplicates the address already requested inside contact information
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-015** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-016** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery

## Files a Phase 3 shard may change for OR

```text
src/lib/rcap-engine/compiled/profiles/OR-oregon.json
src/lib/rcap/state-packs/oregon/**
docs/expungement-ai/flow-audit/state-reports/OR.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

## Phase 3 — SHARD-1

**Base SHA:** `93e05e945a52cfa1cdd2ab590636290875a48f68` · **Branch:** `claude/expai-state-shard-01` · **Hold status:** `not_held`

Full sign-off packet: `data/expungement-ai/flow-audit/shard-results/SHARD-1.json`.

### What changed

- Added src/lib/rcap/state-packs/oregon/county-court-instructions.ts — the UX-COURT-001 and UX-COUNTY-001 state binding: the Circuit Court venue rule quoted from the profile, and the county slot marked awaiting_owner_supplied_source.
- Exported it from src/lib/rcap/state-packs/oregon/index.ts.

### What was deliberately not changed

- src/lib/rcap-engine/compiled/profiles/OR-oregon.json — untouched.
- All three fallback-dependent Oregon routes are dispositioned LEGAL_OWNER_DECISION_REQUIRED. Oregon publishes a clean four-tier class table, but the flow never asks the statutory class, so no tier can be selected from a supplied fact.

### Reachability re-measured at this base

| Measure | Value |
| --- | --- |
| Rendered screens | 13 |
| Packet-ready reachable from rendered screens only | **yes** |
| Payment reachable from rendered screens only | **yes** |
| Best terminal found | `packet_ready_with_caution` |
| Best pathway | `set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c` |
| Facts the evaluator uses that this flow never renders | `record_documents` |

### Fallback-dependent routes and their Phase 3 disposition

| Route | Disposition | Why, in short |
| --- | --- | --- |
| `marijuana-specific-set-aside-redesignation` | `LEGAL_OWNER_DECISION_REQUIRED` | the repository cannot settle which rule governs, or the candidates conflict |
| `set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c` | `LEGAL_OWNER_DECISION_REQUIRED` | the repository cannot settle which rule governs, or the candidates conflict |
| `set-aside-of-eligible-convictions-under-ors-137-225-1-a` | `LEGAL_OWNER_DECISION_REQUIRED` | the repository cannot settle which rule governs, or the candidates conflict |

None is recommended ACTIVE. Every one still resolves through the provisional prose selector kept in the shared evaluator, and a proposal is evidence, not a binding.

### Terminals

8 flow row(s) belong to this jurisdiction in SHARD-1. **0** moved.

This shard changed no compiled profile, no question, no decision rule and no waiting rule, so no terminal moved and no entry is proposed for the Phase 2 correction allowlist.

### Legal questions left open

- ORS 137.225(1)(c) — resolve the dismissed-charge drafting quirk the profile itself instructs a human to verify. The acquittal and uncharged-arrest branches are ready to bind as recorded.
- ORS 137.225(1)(a) — with no statutory-class fact in the flow, which of the 1/3/5/7-year tiers governs a participant who tells us only misdemeanor or felony?
- Marijuana redesignation — the reclassified class and the pre/post-1-July-2015 offence date are both unasked.

### County and court — `SHARED_PHASE2_BLOCKER`

`UX-COURT-001` and `UX-COUNTY-001` cannot be completed inside a Phase 3 shard, and Shards 4 and 6 reproduced the
same blocker independently. One bounded state-configuration attempt was made and reverted:
rebinding `AZ:court` from `text` to a controlled `single_choice` list fails
`scripts/verify-expungement-plain-language-values.mjs` with *"changed type"* and
*"changed option values/order"*. The assertion is structural and applies to every question in
every one of the 51 compiled profiles, so it was not retried per state.

What this shard preserved instead is the source-backed state half, ready to apply:
`src/lib/rcap/state-packs/oregon/county-court-instructions.ts`.

The shared paths and controls the rebind needs — the parity approval record, the selector branch
in the shared question renderer, and the owner-supplied `TEST_COUNTY_AND_COURT_DATA_SOURCE` that was never supplied — are listed in
`SHARD-1.json#sharedPhase2Blocker`, together with the exact steps and option lists to apply once
the shared half lands.
