# Maryland (MD) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-4`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 8 |
| Flow rows | 13 |
| Consumer screens | 14 |
| Packet-information builder questions | 5 |
| Question nodes in the public payload | 54 |
| Branch edges | 64 |
| Ordered decision rules | 98 |
| Waiting-period rules | 49 |
| Exclusion rules | 35 |

## Reachability from the rendered screens only

- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution` on `adult-non-conviction-expungement-under-crim-proc-10-105`
- Facts the evaluator consumes that this state never asks: `new_convictions_during_waiting_period`, `record_documents`, `special_preconditions_confirmed`

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
| 8 | `pardon_status` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `low` | **none** |
| 9 | `pardon_signed_date` | `date_or_unknown` | no | `supported_by_escalation` | `low` | yes |
| 10 | `sentence_completion_date` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 11 | `financial_obligations` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | yes |
| 12 | `pending_cases` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 13 | `resolved_timing_bucket` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 14 | `state_exclusion_categories` | `multi_select` | yes | `supported_by_escalation` | `criminal_record` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `adult-non-conviction-expungement-under-crim-proc-10-105` | `paid_packet_intended` | `needs_review` | closed | no |
| `automatic-expungement-under-crim-proc-10-105-1` | `non_filing_guidance` | `guidance_only` | closed | — |
| `cannabis-specific-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `eligible-conviction-expungement-under-crim-proc-10-110` | `paid_packet_intended` | `needs_review` | closed | no |
| `juvenile-expungement` | `paid_packet_intended` | `guidance_only` | closed | no |
| `pardoned-conviction-expungement-under-crim-proc-10-105-a-8` | `paid_packet_intended` | `likely_not_eligible` | closed | no |
| `police-record-expungement-when-no-charge-was-filed-under-10-103` | `paid_packet_intended` | `needs_review` | closed | no |
| `second-chance-act-shielding` | `paid_packet_intended` | `needs_review` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `needs_review` | 6 |
| `hard_stop` | 2 |
| `likely_not_eligible` | 2 |
| `guidance_only` | 2 |
| `needs_more_info` | 1 |

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
| `EXPAI-MD-a914286c73` | desktop-1440x1000 | 14 | `needs_review` | yes |
| `EXPAI-MD-d3001d6a11` | desktop-1440x1000 | 14 | `likely_not_eligible` | yes |

## Issues touching MD

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

## Files a Phase 3 shard may change for MD

```text
src/lib/rcap-engine/compiled/profiles/MD-maryland.json
src/lib/rcap/state-packs/maryland/**
docs/expungement-ai/flow-audit/state-reports/MD.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

---

## Phase 3 — SHARD-4

**Base SHA:** `93e05e945a52cfa1cdd2ab590636290875a48f68` (the Phase 2 product head) · **Branch:** `claude/expai-state-shard-04`

Full record, with every quote and every proposed binding: `data/expungement-ai/flow-audit/shard-results/SHARD-4.json`.

### What changed in Maryland

Nothing. This branch carries no edit to `src/lib/rcap-engine/compiled/profiles/MD-maryland.json` or to `src/lib/rcap/state-packs/`. No flow row, terminal, question node, branch edge or reachability result moves.

That is not because nothing was found. The controlled-data issues (UX-COURT-001 and UX-COUNTY-001) assigned here were built, applied, measured, and then reverted when four separate gates proved a state shard cannot land them. The finished change is in the shard result file as a ready-to-apply payload with its source citations, and the gates are named below.

### Reachability at this base

| Measure | At this base |
| --- | --- |
| Packet-ready reachable from rendered screens only | yes |
| Payment reachable | yes |
| Best terminal found | `packet_ready_with_caution` on `adult-non-conviction-expungement-under-crim-proc-10-105` |
| Facts the evaluator uses that the flow never renders | `record_documents` |

The Phase 1 base recorded no unreachable finding for MD, and the regenerated sweep confirms it reaches packet-ready at this base.

Reaching packet-ready is not the same as being release-ready. Every route below that still resolves through the provisional prose fallback is **not** recommended ACTIVE, whatever terminal it returns.

### Waiting-rule dispositions

8 of this jurisdiction's routes depend on the provisional fallback. Each gets exactly one Phase 3 disposition. These are proposals and evidence, not changes: `src/lib/rcap-engine/waiting-rule-bindings.json` is a prohibited path and no duration here was written by this shard — every one is quoted from a rule this jurisdiction's own compiled profile already publishes.

| Route | Disposition | Evidence |
| --- | --- | --- |
| `adult-non-conviction-expungement-under-crim-proc-10-105` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates disagree: 3 years, 15 years |
| `automatic-expungement-under-crim-proc-10-105-1` | `EXPLICIT_BINDING_PROPOSED` | `wait-09, wait-10, wait-11` — 3 years |
| `cannabis-specific-expungement` | `EXPLICIT_BINDING_PROPOSED` | `wait-15, wait-21, wait-22, wait-33` — 3 years |
| `eligible-conviction-expungement-under-crim-proc-10-110` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates disagree: 5 years, 7 years, 10 years, 15 years, 3 years |
| `juvenile-expungement` | `EXPLICIT_BINDING_PROPOSED` | `wait-24` — 2 years |
| `pardoned-conviction-expungement-under-crim-proc-10-105-a-8` | `HELD_FOR_CORRECTION` | blocked on a correction outside this shard |
| `police-record-expungement-when-no-charge-was-filed-under-10-103` | `LEGAL_OWNER_DECISION_REQUIRED` | no published rule names this route |
| `second-chance-act-shielding` | `EXPLICIT_BINDING_PROPOSED` | `wait-23, wait-27, wait-37` — 3 years |

Counts: EXPLICIT_BINDING_PROPOSED 4, HELD_FOR_CORRECTION 1, LEGAL_OWNER_DECISION_REQUIRED 3. Recommended ACTIVE: none.

### Release-critical issues assigned here

- **UX-COUNTY-001** (P1) — blocked, see below
- **UX-COURT-001** (P1) — blocked, see below
- **UX-CONTENT-001** (P3) — not release-critical this phase; recorded, not implemented

#### Why the court selector is not in this branch

A state-aware selector for `court` was built from Maryland's own repository content — every option quoted from this jurisdiction's compiled profile or state pack — with a clearly-labelled "not listed" fallback, and applied to the compiled profile. With it applied, all four audit generators regenerated byte-identical and every green verifier stayed green. Three gates then refused it:

1. **The screening-parity gate.** `scripts/verify-expungement-plain-language-values.mjs` diffs every compiled profile against `origin/main` and asserts equality on `type` and `options` for every question. It failed with `MD:court changed type.` and `MD:court changed option values/order.` The only escape is a reviewed delta in `data/expungement-ai/screening-parity-approved-deltas.json`, which carries `authorization.authorizedBy: "Roger"` and is a prohibited path for this shard.
2. **The served payload is not this file.** `buildProfileDraft` in `src/lib/rcap-engine/public-profile-projection.ts` takes `questions` from `getDesignerPublicProfiles()[code]` — the shared all-51 fixture `src/lib/rcap-engine/compiled/all51.json` — and never from the compiled engine profile when a fixture exists. All 51 have one. With the change applied, `projectPublicProfile` still returned `court` as `text` with no options.
3. **The renderer has no manual-entry-plus-list input.** `QuestionField.tsx` renders `single_choice` through `OptionGroup`, which has no free-text affordance, and `text_or_unknown` as a text box with no list. The expectation's "clearly-labelled manual entry fallback" needs an "Other — please specify" branch there and a matching allowance in `validatePacketAnswer`. Both files are prohibited paths.

4. **Maryland is additionally hash-pinned.** The approved delta `md-pardon-signed-date-2026-08-11` pins `src/lib/rcap-engine/compiled/profiles/MD-maryland.json` by sha256, so any byte change to it throws before any comparison runs. That is why the county selector, which is Maryland's alone, is also not in this branch.

None of this is a MD problem. UX-COURT-001 names all 51 jurisdictions and the parity gate compares all 51 profiles, so every Phase 3 state shard carrying this issue meets the same walls.

### Open legal questions

- `adult-non-conviction-expungement-under-crim-proc-10-105` — Most § 10-105 dispositions carry three years, but a probation-before-judgment for a Transportation § 21-902 DUI/DWI carries fifteen. Separating them needs two rendered facts at once — case_outcome = "Diversion, deferred disposition, supervision, or similar program" AND state_exclusion_categories containing "DUI/DWI or serious traffic" — and the exclusion screen is a multi-select whose selected value is a self-report, not the disposition code. Getting it wrong would open a packet twelve years early.
  - What would settle it: A rendered fact that reports the disposition class (acquittal/nolle/dismissal vs PBJ vs stet) and, for a PBJ, whether the underlying charge was a Transportation § 21-902 DUI/DWI.
- `eligible-conviction-expungement-under-crim-proc-10-110` — § 10-110 publishes five competing durations keyed on the exact statute of conviction — 5, 7, 10, 15 and a 3-year cannabis special — and Maryland renders only offense_level (Misdemeanor / Felony / Infraction / Traffic) and a self-reported exclusion multi-select. No rendered fact identifies which § 10-110(c) group the conviction falls in. Phase 2 already records this route reporting md.configuration_missing for the same reason.
  - What would settle it: A rendered fact carrying the convicted statute, or the § 10-110(c) waiting-period group (5 / 7 / 10 / 15 year) that Maryland Courts' CC-DC-CR-072G2 list assigns to it.
- `pardoned-conviction-expungement-under-crim-proc-10-105-a-8` — This is the only route of mine with no compiled route- rule at all, and Phase 2 already records it returning needs_review with md.configuration_missing rather than executing a timing rule. Its timing is not an ordinary waiting period but the ten-year MAXIMUM filing window under Crim. Proc. § 10-105(c)(4), measured from pardon_signed_date. Binding a waiting rule before that configuration exists would bind the wrong kind of rule.
  - Correction required first: The § 10-105(c)(4) maximum-filing-period configuration named in data/expungement-ai/phase2/correction-allowlist.json entry md-10-110-configuration-reported-once and governed by the Roger-authorized delta md-pardon-signed-date-2026-08-11 in data/expungement-ai/screening-parity-approved-deltas.json, which is a prohibited path for this shard.
- `police-record-expungement-when-no-charge-was-filed-under-10-103` — No rule in Maryland's published waitingPeriodRules names § 10-103 or the police-record route. There is nothing in the repository to bind.

### Before and after

No flow ID in MD changed its terminal. Terminals moved: **0**. Evaluator output differences proposed for the correction allowlist: **none** — this branch changes no evaluator input.
