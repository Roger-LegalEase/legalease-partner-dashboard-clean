# Connecticut (CT) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-6`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 5 |
| Flow rows | 10 |
| Consumer screens | 10 |
| Packet-information builder questions | 3 |
| Question nodes in the public payload | 49 |
| Branch edges | 45 |
| Ordered decision rules | 72 |
| Waiting-period rules | 8 |
| Exclusion rules | 16 |

## Reachability from the rendered screens only

- Packet-ready reachable: **no**
- Payment reachable: **no**
- Best terminal found: `not_yet` on `petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202`
- Facts the evaluator consumes that this state never asks: `new_convictions_during_waiting_period`, `pending_cases`, `record_documents`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `pardon_status` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `low` | **none** |
| 7 | `sentence_completion_date` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 8 | `financial_obligations` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | yes |
| 9 | `resolved_timing_bucket` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 10 | `state_exclusion_categories` | `multi_select` | yes | `supported_by_escalation` | `criminal_record` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `absolute-pardon-resulting-in-erasure` | `paid_packet_intended` | `guidance_only` | closed | no |
| `automatic-clean-slate-erasure-for-eligible-post-2000-convictions` | `non_filing_guidance` | `guidance_only` | closed | — |
| `automatic-non-conviction-erasure-under-conn-gen-stat-54-142a` | `non_filing_guidance` | `guidance_only` | closed | — |
| `cannabis-conviction-erasure` | `non_filing_guidance` | `guidance_only` | closed | — |
| `petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202` | `paid_packet_intended` | `needs_review` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `guidance_only` | 5 |
| `hard_stop` | 2 |
| `needs_more_info` | 1 |
| `likely_not_eligible` | 1 |
| `needs_review` | 1 |

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
| `EXPAI-CT-28eaf662a0` | desktop-1440x1000 | 10 | `guidance_only` | yes |
| `EXPAI-CT-c07d33d078` | desktop-1440x1000 | 10 | `hard_stop` | yes |
| `EXPAI-CT-28eaf662a0` | mobile-390x844 | 10 | `guidance_only` | yes |

## Issues touching CT

- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
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

## Files a Phase 3 shard may change for CT

```text
src/lib/rcap-engine/compiled/profiles/CT-connecticut.json
src/lib/rcap/state-packs/connecticut/**
docs/expungement-ai/flow-audit/state-reports/CT.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

## Phase 3 SHARD-6 — what this shard did

Base `93e05e945a52cfa1cdd2ab590636290875a48f68` (PHASE2_PRODUCT_HEAD). Evaluator clock pinned to `2026-07-01`. Full record: `data/expungement-ai/flow-audit/shard-results/SHARD-6.json`.

### Changed

- Added src/lib/rcap/state-packs/connecticut/record-clearing-filing-locations.ts: the 13 judicial districts, the 8 historical counties, the four venues that handle erasure matters, and a labelled manual-entry fallback.
- Exported it from the Connecticut state pack index.

### Deliberately not changed

- CT-connecticut.json is byte-identical to the base. No question, option value, lifecycle classification, packet family, form mapping, payment clamp or operationallySellable value moved.
- No waiting rule was authored and no binding was added; the two conditional proposals are recorded here as evidence only.

### Terminals

No flow row moved. All 10 Connecticut flow IDs keep the terminal they had at the base, and the compiled profile is byte-identical to it. Proved by re-running the audit's own four generators before and after this diff: the output is byte-identical.

### Reachability from the rendered screens only, at this base

- Rendered screens: **14**
- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution` on `petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202`

Phase 2 reopened Connecticut and it still holds at this base: the bounded sweep over rendered screens reaches packet_ready_with_caution on petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202 with payment open, and a direct replay returns the same result at every timing bucket. Nothing was re-investigated and nothing was changed.

### Waiting-rule dispositions for this jurisdiction

Every route below still resolves through the provisional prose selector retained in the evaluator. None is recommended ACTIVE. No waiting period is authored here; a proposal names a rule id the compiled profile already publishes and quotes its text.

| Route | Disposition | Rules named |
| --- | --- | --- |
| `absolute-pardon-resulting-in-erasure` | conditional binding proposed | `wait-06`, `wait-07` |
| `automatic-clean-slate-erasure-for-eligible-post-2000-convictions` | conditional binding proposed | `wait-04`, `wait-05` |
| `automatic-non-conviction-erasure-under-conn-gen-stat-54-142a` | legal owner decision required | `wait-02`, `wait-03` |
| `cannabis-conviction-erasure` | legal owner decision required | none |

4 fallback-dependent route(s): 0 explicit binding proposed, 2 conditional binding proposed, 2 legal owner decision required, 0 held for correction.

### Controlled filing-location dataset

`src/lib/rcap/state-packs/connecticut/record-clearing-filing-locations.ts` — 13 judicial districts, the courts and agencies that handle record-clearing matters, and a labelled manual-entry fallback. Addresses UX-COURT-001.

Still missing: the selector itself. The renderer has no selector branch for county or court, and changing a compiled question's type or options is locked against origin/main by verify-expungement-plain-language-values unless a reviewed entry exists in data/expungement-ai/screening-parity-approved-deltas.json. Both the renderer and that approval record are prohibited shared paths for this shard, so the dataset is delivered and the binding is proposed.

### Legal questions still open

- UX-STATELAW-001 for CT is closed by the Phase 2 correction and confirmed at this base; no question remains.
- Whether the nolle branch of § 54-142a can be separated from the dismissal branch, which the merged case_outcome option currently prevents.
- Whether the Clean Slate felony period may be applied to every felony when the source row is limited to Class D/E and unclassified felonies punishable by five years or less.
