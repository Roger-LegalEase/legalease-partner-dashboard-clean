# South Dakota (SD) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-4`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 8 |
| Flow rows | 13 |
| Consumer screens | 12 |
| Packet-information builder questions | 5 |
| Question nodes in the public payload | 53 |
| Branch edges | 57 |
| Ordered decision rules | 45 |
| Waiting-period rules | 13 |
| Exclusion rules | 3 |

## Reachability from the rendered screens only

- Packet-ready reachable: **no**
- Payment reachable: **no**
- Best terminal found: `not_yet` on `adult-arrest-record-expungement-under-sdcl-23a-3-27`
- Facts the evaluator consumes that this state never asks: `new_convictions_during_waiting_period`, `pending_cases`, `record_documents`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `age_at_offense` | `number_or_range` | yes | `supported_by_eligibility_rule` | `criminal_record` | **none** |
| 7 | `trafficking_status` | `yes_no_prefer_not_to_say` | yes | `supported_by_eligibility_rule` | `special_category` | **none** |
| 8 | `pardon_status` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `low` | **none** |
| 9 | `sentence_completion_date` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 10 | `financial_obligations` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | yes |
| 11 | `resolved_timing_bucket` | `single_choice` | yes | `supported_by_eligibility_rule` | `low` | yes |
| 12 | `court_requirements_completed` | `single_choice` | yes | `supported_by_eligibility_rule` | `court_identity` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `adult-arrest-record-expungement-under-sdcl-23a-3-27` | `paid_packet_intended` | `needs_review` | closed | no |
| `automatic-public-record-removal-for-petty-municipal-and-class-2-misdemeanor-cases` | `non_filing_guidance` | `guidance_only` | closed | — |
| `controlled-substance-deferred-disposition-route` | `paid_packet_intended` | `guidance_only` | closed | no |
| `diversion-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `juvenile-delinquency-sealing` | `paid_packet_intended` | `needs_review` | closed | no |
| `juvenile-trafficking-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `pardon-based-sealing` | `paid_packet_intended` | `guidance_only` | closed | no |
| `suspended-imposition-of-sentence-sealing` | `paid_packet_intended` | `guidance_only` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `needs_review` | 6 |
| `guidance_only` | 4 |
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
| `EXPAI-SD-6b42c8c2e3` | desktop-1440x1000 | 12 | `needs_review` | yes |
| `EXPAI-SD-9d9a71878f` | desktop-1440x1000 | 12 | `hard_stop` | yes |

## Issues touching SD

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

## Files a Phase 3 shard may change for SD

```text
src/lib/rcap-engine/compiled/profiles/SD-south-dakota.json
src/lib/rcap/state-packs/south-dakota/**
docs/expungement-ai/flow-audit/state-reports/SD.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

---

## Phase 3 — SHARD-4

**Base SHA:** `93e05e945a52cfa1cdd2ab590636290875a48f68` (the Phase 2 product head) · **Branch:** `claude/expai-state-shard-04`

Full record, with every quote and every proposed binding: `data/expungement-ai/flow-audit/shard-results/SHARD-4.json`.

### What changed in South Dakota

Nothing. This branch carries no edit to `src/lib/rcap-engine/compiled/profiles/SD-south-dakota.json` or to `src/lib/rcap/state-packs/`. No flow row, terminal, question node, branch edge or reachability result moves.

That is not because nothing was found. The controlled-data issue (UX-COURT-001) assigned here was built, applied, measured, and then reverted when three separate gates proved a state shard cannot land it. The finished change is in the shard result file as a ready-to-apply payload with its source citations, and the gates are named below.

### Reachability at this base

| Measure | At this base |
| --- | --- |
| Packet-ready reachable from rendered screens only | yes |
| Payment reachable | yes |
| Best terminal found | `packet_ready_with_caution` on `adult-arrest-record-expungement-under-sdcl-23a-3-27` |
| Facts the evaluator uses that the flow never renders | `record_documents` |

The Phase 1 base recorded SD as reaching no packet-ready outcome from the rendered screens. Phase 2 reopened it and the shard prompt directs that it is not re-investigated. Confirmed still open at this base by regenerating the audit's own bounded sweep.

Reaching packet-ready is not the same as being release-ready. Every route below that still resolves through the provisional prose fallback is **not** recommended ACTIVE, whatever terminal it returns.

### Waiting-rule dispositions

7 of this jurisdiction's routes depend on the provisional fallback. Each gets exactly one Phase 3 disposition. These are proposals and evidence, not changes: `src/lib/rcap-engine/waiting-rule-bindings.json` is a prohibited path and no duration here was written by this shard — every one is quoted from a rule this jurisdiction's own compiled profile already publishes.

| Route | Disposition | Evidence |
| --- | --- | --- |
| `automatic-public-record-removal-for-petty-municipal-and-class-2-misdemeanor-cases` | `EXPLICIT_BINDING_PROPOSED` | `wait-07, wait-08` — five years |
| `controlled-substance-deferred-disposition-route` | `EXPLICIT_BINDING_PROPOSED` | `wait-09` — one year |
| `diversion-expungement` | `EXPLICIT_BINDING_PROPOSED` | `wait-05, wait-06` — one year |
| `juvenile-delinquency-sealing` | `EXPLICIT_BINDING_PROPOSED` | `wait-11` — one year |
| `juvenile-trafficking-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | no published rule names this route |
| `pardon-based-sealing` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates disagree: five years |
| `suspended-imposition-of-sentence-sealing` | `LEGAL_OWNER_DECISION_REQUIRED` | no published rule names this route |

Counts: EXPLICIT_BINDING_PROPOSED 4, LEGAL_OWNER_DECISION_REQUIRED 3. Recommended ACTIVE: none.

### Release-critical issues assigned here

- **UX-COURT-001** (P1) — blocked, see below
- **UX-STATELAW-001** (P1) — legal review required; the question is recorded, not implemented
- **UX-CONTENT-001** (P3) — not release-critical this phase; recorded, not implemented

#### Why the court selector is not in this branch

A state-aware selector for `court` was built from South Dakota's own repository content — every option quoted from this jurisdiction's compiled profile or state pack — with a clearly-labelled "not listed" fallback, and applied to the compiled profile. With it applied, all four audit generators regenerated byte-identical and every green verifier stayed green. Three gates then refused it:

1. **The screening-parity gate.** `scripts/verify-expungement-plain-language-values.mjs` diffs every compiled profile against `origin/main` and asserts equality on `type` and `options` for every question. It failed with `SD:court changed type.` and `SD:court changed option values/order.` The only escape is a reviewed delta in `data/expungement-ai/screening-parity-approved-deltas.json`, which carries `authorization.authorizedBy: "Roger"` and is a prohibited path for this shard.
2. **The served payload is not this file.** `buildProfileDraft` in `src/lib/rcap-engine/public-profile-projection.ts` takes `questions` from `getDesignerPublicProfiles()[code]` — the shared all-51 fixture `src/lib/rcap-engine/compiled/all51.json` — and never from the compiled engine profile when a fixture exists. All 51 have one. With the change applied, `projectPublicProfile` still returned `court` as `text` with no options.
3. **The renderer has no manual-entry-plus-list input.** `QuestionField.tsx` renders `single_choice` through `OptionGroup`, which has no free-text affordance, and `text_or_unknown` as a text box with no list. The expectation's "clearly-labelled manual entry fallback" needs an "Other — please specify" branch there and a matching allowance in `validatePacketAnswer`. Both files are prohibited paths.

None of this is a SD problem. UX-COURT-001 names all 51 jurisdictions and the parity gate compares all 51 profiles, so every Phase 3 state shard carrying this issue meets the same walls.

### Open legal questions

- `juvenile-trafficking-expungement` — No rule in South Dakota's published waitingPeriodRules names § 26-7A-115.1 or the juvenile trafficking route. The state pack's own instruction for this route is to send the person to legal aid or an attorney, which is the opposite of a bindable period.
- `pardon-based-sealing` — The only rule addressing the pardon route carries a structured five-year duration that its own text does not support: the text describes what a Chapter 24-14 pardon does to the record and names no waiting period at all. Binding five years would bind a parse artifact as law. The mismatch is also recorded below as a state-pack fidelity issue.
  - What would settle it: Counsel must say whether Chapter 24-14 pardon-based sealing carries any waiting period, and if so from what anchor. The published five-year figure should not be used until then.
- `suspended-imposition-of-sentence-sealing` — No rule in South Dakota's published waitingPeriodRules names SDCL §§ 23A-27-13 to 23A-27-17 or the suspended-imposition route. wait-04 and wait-12 are status sentinels (not_eligible_yet_waiting_period, not_eligible_juvenile_waiting_period) with no duration, not rules.

### Before and after

No flow ID in SD changed its terminal. Terminals moved: **0**. Evaluator output differences proposed for the correction allowlist: **none** — this branch changes no evaluator input.
