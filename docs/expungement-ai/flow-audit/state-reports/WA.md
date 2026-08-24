# Washington (WA) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-4`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 7 |
| Flow rows | 12 |
| Consumer screens | 11 |
| Packet-information builder questions | 4 |
| Question nodes in the public payload | 50 |
| Branch edges | 51 |
| Ordered decision rules | 34 |
| Waiting-period rules | 21 |
| Exclusion rules | 5 |

## Reachability from the rendered screens only

- Packet-ready reachable: **yes**
- Payment reachable: **no**
- Best terminal found: `packet_ready_with_caution` on `victim-survivor-conviction-vacation-route`
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
| 7 | `trafficking_status` | `yes_no_prefer_not_to_say` | yes | `supported_by_eligibility_rule` | `special_category` | **none** |
| 8 | `sentence_completion_date` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 9 | `financial_obligations` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | yes |
| 10 | `pending_cases` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 11 | `resolved_timing_bucket` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `adult-felony-vacation-under-rcw-9-94a-640` | `paid_packet_intended` | `needs_review` | closed | no |
| `adult-misdemeanor-gross-misdemeanor-vacation-under-rcw-9-96-060` | `paid_packet_intended` | `needs_review` | closed | no |
| `blake-drug-possession-vacation-and-refund-route` | `paid_packet_intended` | `needs_review` | closed | no |
| `juvenile-record-sealing-under-rcw-13-50-260` | `paid_packet_intended` | `needs_review` | closed | no |
| `misdemeanor-cannabis-conviction-vacation` | `paid_packet_intended` | `needs_review` | closed | no |
| `non-conviction-record-deletion-under-rcw-10-97-060` | `paid_packet_intended` | `needs_review` | closed | no |
| `victim-survivor-conviction-vacation-route` | `paid_packet_intended` | `packet_ready_with_caution` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `needs_review` | 7 |
| `hard_stop` | 2 |
| `not_yet` | 1 |
| `needs_more_info` | 1 |
| `packet_ready_with_caution` | 1 |

## Non-remedy terminals

| Probe | Terminal | What it exercises |
| --- | --- | --- |
| `inside_waiting_period` | `not_yet` | Participant's case resolved inside the shortest timing bucket the state offers. |
| `no_answers_supplied` | `needs_more_info` | Participant lands on the state's first screen and submits nothing. |
| `not_my_own_record` | `hard_stop` | Participant answers the ownership question with someone else's record. |
| `out_of_jurisdiction_case` | `hard_stop` | Participant's case is not a state or local case in this jurisdiction. |
| `state_exclusion_selected` | `needs_review` | Participant selects a state exclusion category on the exclusion screen. |

## Browser evidence

| Flow | Viewport | Screens walked | Rendered terminal | Matches manifest |
| --- | --- | --- | --- | --- |
| `EXPAI-WA-e337d619f9` | desktop-1440x1000 | 11 | `packet_ready_with_caution` | yes |
| `EXPAI-WA-288139071e` | desktop-1440x1000 | 11 | `hard_stop` | yes |
| `EXPAI-WA-24a861f8e0` | desktop-1440x1000 | 11 | `needs_review` | yes |

## Issues touching WA

- **UX-GLOBAL-001** (P0, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Open matter and Complete packet information loop for any packet-ready matter whose paymentAllowed is false or whose commercialFlow cannot be reconstructed
- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-004** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Facts already answered during screening are rendered again in the packet-information questionnaire, and the carry-forward is name-matched rather than guaranteed
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-008** (P1, `GLOBAL_REVIEW_FORMATTING`, owner `PHASE_2_SHARED`) — The accuracy review page formats exactly three internal values and prints every other snake_case answer verbatim
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-015** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-016** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery
- **UX-GLOBAL-018** (P2, `GLOBAL_REVIEW_FORMATTING`, owner `PHASE_2_SHARED`) — packet_ready and packet_ready_with_caution render an eyebrow that differs only by a full stop, under an identical title

## Files a Phase 3 shard may change for WA

```text
src/lib/rcap-engine/compiled/profiles/WA-washington.json
src/lib/rcap/state-packs/washington/**
docs/expungement-ai/flow-audit/state-reports/WA.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

---

## Phase 3 — SHARD-4

**Base SHA:** `93e05e945a52cfa1cdd2ab590636290875a48f68` (the Phase 2 product head) · **Branch:** `claude/expai-state-shard-04`

Full record, with every quote and every proposed binding: `data/expungement-ai/flow-audit/shard-results/SHARD-4.json`.

### What changed in Washington

Nothing. This branch carries no edit to `src/lib/rcap-engine/compiled/profiles/WA-washington.json` or to `src/lib/rcap/state-packs/`. No flow row, terminal, question node, branch edge or reachability result moves.

That is not because nothing was found. The controlled-data issue (UX-COURT-001) assigned here was built, applied, measured, and then reverted when three separate gates proved a state shard cannot land it. The finished change is in the shard result file as a ready-to-apply payload with its source citations, and the gates are named below.

### Reachability at this base

| Measure | At this base |
| --- | --- |
| Packet-ready reachable from rendered screens only | yes |
| Payment reachable | **no** — preserved payment clamp |
| Best terminal found | `packet_ready_with_caution` on `victim-survivor-conviction-vacation-route` |
| Facts the evaluator uses that the flow never renders | `record_documents` |

The Phase 1 base recorded no unreachable finding for WA, and the regenerated sweep confirms it reaches packet-ready at this base.

Reaching packet-ready is not the same as being release-ready. Every route below that still resolves through the provisional prose fallback is **not** recommended ACTIVE, whatever terminal it returns.

### Waiting-rule dispositions

7 of this jurisdiction's routes depend on the provisional fallback. Each gets exactly one Phase 3 disposition. These are proposals and evidence, not changes: `src/lib/rcap-engine/waiting-rule-bindings.json` is a prohibited path and no duration here was written by this shard — every one is quoted from a rule this jurisdiction's own compiled profile already publishes.

| Route | Disposition | Evidence |
| --- | --- | --- |
| `adult-felony-vacation-under-rcw-9-94a-640` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates disagree: 10 years, 5 years |
| `adult-misdemeanor-gross-misdemeanor-vacation-under-rcw-9-96-060` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates disagree: 3 years, 5 years |
| `blake-drug-possession-vacation-and-refund-route` | `EXPLICIT_BINDING_PROPOSED` | `wait-18` — no ordinary waiting period |
| `juvenile-record-sealing-under-rcw-13-50-260` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates disagree: immediate/upon event |
| `misdemeanor-cannabis-conviction-vacation` | `LEGAL_OWNER_DECISION_REQUIRED` | no published rule names this route |
| `non-conviction-record-deletion-under-rcw-10-97-060` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates disagree: 2 years, 3 years |
| `victim-survivor-conviction-vacation-route` | `LEGAL_OWNER_DECISION_REQUIRED` | no published rule names this route |

Counts: EXPLICIT_BINDING_PROPOSED 1, LEGAL_OWNER_DECISION_REQUIRED 6. Recommended ACTIVE: none.

### Release-critical issues assigned here

- **UX-COURT-001** (P1) — blocked, see below
- **UX-CONTENT-001** (P3) — not release-critical this phase; recorded, not implemented

#### Why the court selector is not in this branch

A state-aware selector for `court` was built from Washington's own repository content — every option quoted from this jurisdiction's compiled profile or state pack — with a clearly-labelled "not listed" fallback, and applied to the compiled profile. With it applied, all four audit generators regenerated byte-identical and every green verifier stayed green. Three gates then refused it:

1. **The screening-parity gate.** `scripts/verify-expungement-plain-language-values.mjs` diffs every compiled profile against `origin/main` and asserts equality on `type` and `options` for every question. It failed with `WA:court changed type.` and `WA:court changed option values/order.` The only escape is a reviewed delta in `data/expungement-ai/screening-parity-approved-deltas.json`, which carries `authorization.authorizedBy: "Roger"` and is a prohibited path for this shard.
2. **The served payload is not this file.** `buildProfileDraft` in `src/lib/rcap-engine/public-profile-projection.ts` takes `questions` from `getDesignerPublicProfiles()[code]` — the shared all-51 fixture `src/lib/rcap-engine/compiled/all51.json` — and never from the compiled engine profile when a fixture exists. All 51 have one. With the change applied, `projectPublicProfile` still returned `court` as `text` with no options.
3. **The renderer has no manual-entry-plus-list input.** `QuestionField.tsx` renders `single_choice` through `OptionGroup`, which has no free-text affordance, and `text_or_unknown` as a text box with no list. The expectation's "clearly-labelled manual entry fallback" needs an "Other — please specify" branch there and a matching allowance in `validatePacketAnswer`. Both files are prohibited paths.

None of this is a WA problem. UX-COURT-001 names all 51 jurisdictions and the parity gate compares all 51 profiles, so every Phase 3 state shard carrying this issue meets the same walls.

### Open legal questions

- `adult-felony-vacation-under-rcw-9-94a-640` — RCW 9.94A.640 publishes two durations keyed on felony class — ten years for a Class B, five for a Class C — and Washington's rendered offense_level says only "Felony". The class is asked in source_question_07, which is never rendered.
  - What would settle it: A rendered fact carrying the felony class (Class B or Class C).
- `adult-misdemeanor-gross-misdemeanor-vacation-under-rcw-9-96-060` — RCW 9.96.060 publishes two durations — three years ordinary, five years for a domestic-violence misdemeanour — and Washington renders no fact that reports whether the offence was domestic violence. It asks in source_question_16, which is an engine-evaluation row and is never rendered, and Washington's rendered screen set carries no state_exclusion_categories question at all.
  - What would settle it: A rendered fact reporting whether the conviction was a domestic-violence misdemeanour or gross misdemeanour.
- `juvenile-record-sealing-under-rcw-13-50-260` — wait-10 names RCW 13.50.260 and settles one branch only: a juvenile case ending in acquittal after fact-finding, or dismissal with prejudice, is sealed immediately. The compiled route also accepts diversion, misdemeanour conviction, other conviction and juvenile adjudication, and no published rule states a period for any of them — which is the route's main population, not an edge.
  - What would settle it: A published rule for the RCW 13.50.260 sealing motion on an adjudication or a diversion, which the profile does not currently carry.
- `misdemeanor-cannabis-conviction-vacation` — No rule in Washington's published waitingPeriodRules names the misdemeanour cannabis vacation route or states a period for it. The ordinary RCW 9.96.060 three-year rule is not written to this route, and applying it would be a legal judgement about whether the cannabis subsection carries the general timing bar.
- `non-conviction-record-deletion-under-rcw-10-97-060` — RCW 10.97.060 publishes two durations — two years from a favourable disposition, three years from arrest/citation/warrant where no conviction was obtained. Washington's rendered case_outcome settles the dismissed and acquitted values as favourable dispositions, but the route also accepts "Diversion, deferred disposition, supervision, or similar program", and the profile does not say whether a diversion is a favourable disposition for this section. A conditional binding that left that value unassigned would be a partial guess.
  - What would settle it: Counsel must say whether a diversion or deferred disposition counts as a favourable disposition under RCW 10.97.060. The settled part of the mapping is case_outcome in {"Dismissed, no-billed, nolle prosequi, or not prosecuted", "Acquitted or found not guilty"} → wait-16, two years.
- `victim-survivor-conviction-vacation-route` — No rule in Washington's published waitingPeriodRules names the victim/survivor vacation route. This is also the route the bounded reachability sweep uses to reach packet-ready in Washington, so it is the one most worth a reviewed binding first.

### Before and after

No flow ID in WA changed its terminal. Terminals moved: **0**. Evaluator output differences proposed for the correction allowlist: **none** — this branch changes no evaluator input.
