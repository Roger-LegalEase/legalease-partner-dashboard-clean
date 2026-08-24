# Mississippi (MS) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-3`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 13 |
| Flow rows | 21 |
| Consumer screens | 7 |
| Packet-information builder questions | 12 |
| Question nodes in the public payload | 51 |
| Branch edges | 46 |
| Ordered decision rules | 104 |
| Waiting-period rules | 17 |
| Exclusion rules | 8 |

## Reachability from the rendered screens only

- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution` on `non-conviction-expungement-for-dismissal-no-disposition-or-acquittal`
- Facts the evaluator consumes that this state never asks: `financial_obligations`, `new_convictions_during_waiting_period`, `pending_cases`, `sentence_completion_date`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `resolved_timing_bucket` | `single_choice` | yes | `supported_by_eligibility_rule` | `low` | yes |
| 7 | `court_requirements_completed` | `single_choice` | yes | `supported_by_eligibility_rule` | `court_identity` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `additional-justice-or-municipal-court-misdemeanor-relief` | `paid_packet_intended` | `needs_review` | closed | no |
| `dui-nonadjudication` | `paid_packet_intended` | `needs_review` | closed | no |
| `eligible-felony-conviction-expungement-99-19-71` | `paid_packet_intended` | `needs_review` | closed | no |
| `first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1` | `paid_packet_intended` | `needs_review` | closed | no |
| `first-offense-controlled-substance-conditional-discharge-relief` | `paid_packet_intended` | `needs_review` | closed | no |
| `first-offense-dui-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `human-trafficking-survivor-vacatur-and-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `intervention-court-completion-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `minor-in-possession-underage-alcohol-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `non-conviction-expungement-for-dismissal-no-disposition-or-acquittal` | `paid_packet_intended` | `packet_ready_with_caution` | allowed at evaluator | no |
| `nonadjudication-under-99-15-26` | `paid_packet_intended` | `needs_review` | closed | no |
| `pretrial-intervention-or-diversion-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59` | `paid_packet_intended` | `needs_review` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `needs_review` | 12 |
| `packet_ready_with_caution` | 6 |
| `hard_stop` | 2 |
| `needs_more_info` | 1 |

## Non-remedy terminals

| Probe | Terminal | What it exercises |
| --- | --- | --- |
| `inside_waiting_period` | `packet_ready_with_caution` | Participant's case resolved inside the shortest timing bucket the state offers. |
| `inside_waiting_period` | `packet_ready_with_caution` | Participant's case resolved inside the shortest timing bucket the state offers. |
| `no_answers_supplied` | `needs_more_info` | Participant lands on the state's first screen and submits nothing. |
| `not_my_own_record` | `hard_stop` | Participant answers the ownership question with someone else's record. |
| `out_of_jurisdiction_case` | `hard_stop` | Participant's case is not a state or local case in this jurisdiction. |
| `state_exclusion_selected` | `packet_ready_with_caution` | Participant selects a state exclusion category on the exclusion screen. |
| `state_exclusion_selected` | `packet_ready_with_caution` | Participant selects a state exclusion category on the exclusion screen. |

## Browser evidence

| Flow | Viewport | Screens walked | Rendered terminal | Matches manifest |
| --- | --- | --- | --- | --- |
| `EXPAI-MS-9243c35cd3` | desktop-1440x1000 | 7 | `packet_ready_with_caution` | yes |
| `EXPAI-MS-8c977237d0` | desktop-1440x1000 | 7 | `hard_stop` | yes |
| `EXPAI-MS-0804ce0ddd` | desktop-1440x1000 | 7 | `needs_review` | yes |

## Issues touching MS

- **UX-GLOBAL-001** (P0, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Open matter and Complete packet information loop for any packet-ready matter whose paymentAllowed is false or whose commercialFlow cannot be reconstructed
- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-004** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Facts already answered during screening are rendered again in the packet-information questionnaire, and the carry-forward is name-matched rather than guaranteed
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COUNTY-001** (P1, `COUNTY_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — County is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-007** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Current city duplicates the address already requested inside contact information
- **UX-GLOBAL-008** (P1, `GLOBAL_REVIEW_FORMATTING`, owner `PHASE_2_SHARED`) — The accuracy review page formats exactly three internal values and prints every other snake_case answer verbatim
- **UX-GLOBAL-009** (P1, `GLOBAL_PAYMENT`, owner `PHASE_2_SHARED`) — No discount-code entry exists anywhere before checkout, and the only code the product accepts is a partner access code that grants a free packet
- **UX-GLOBAL-010** (P2, `GLOBAL_PAYMENT`, owner `PHASE_2_SHARED`) — Sponsorship is a server-side session property with no consumer entry point, so it cannot be distinguished from a discount by anyone using the product
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-015** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-016** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-LEGAL-001** (P1, `REQUIRES_LEGAL_REVIEW`, owner `LEGAL_REVIEW_THEN_PHASE_3_STATE_SHARD`) — Selecting a state exclusion category still returns packet-ready in some jurisdictions, and so does the shortest timing bucket
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery
- **UX-GLOBAL-018** (P2, `GLOBAL_REVIEW_FORMATTING`, owner `PHASE_2_SHARED`) — packet_ready and packet_ready_with_caution render an eyebrow that differs only by a full stop, under an identical title

## Files a Phase 3 shard may change for MS

```text
src/lib/rcap-engine/compiled/profiles/MS-mississippi.json
src/lib/rcap/state-packs/mississippi/**
docs/expungement-ai/flow-audit/state-reports/MS.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

---

## Phase 3 — SHARD-3 sign-off

**Phase 2 product head / base SHA:** `93e05e945a52cfa1cdd2ab590636290875a48f68` · **Branch:** `claude/expai-state-shard-03` · **Evaluator clock:** `2026-07-01`

Mississippi is the shard's largest jurisdiction by pathway count, has four bindable routes, and carries the shard's one counsel question.

### What changed

- `controlledDataBindings` added to `MS-mississippi.json` for the combined county-and-court source question.
- `src/lib/rcap/state-packs/mississippi/controlled-filing-dataset.ts` added: the six court types Mississippi's own pack and profile already name, the district-attorney notice destination, all 82 counties, and a labelled manual-entry fallback.

### What deliberately did not change

- No terminal, reason code, pathway, packet family, form mapping, payment clamp or `operationallySellable` value. All 21 Mississippi flow rows return the same terminal at this head as at the product base.
- No question was added, removed or reordered; no option value, type, `required` flag, `contextOnly` flag or stage moved. Screening parity against `main` holds byte-for-byte.
- `county-court-instructions.ts` and every other file in the Mississippi legacy generator. The new dataset is an additional file; nothing existing was edited, so the live legacy generator is untouched.
- `exclusionRules` and `waitingPeriodRules`. Rescoping a state exclusion rule is exactly the change UX-LEGAL-001 reserves for counsel.

### Terminals, before and after

| Measure | Value |
| --- | --- |
| Flow rows owned | 21 |
| Flow rows whose terminal moved | **0** |
| Terminal distribution at this head | `needs_review` ×12, `hard_stop` ×2, `packet_ready_with_caution` ×6, `needs_more_info` ×1 |

The distribution above is the distribution at the base. Nothing in this shard moved a terminal, so there is no before-and-after table to write: the before and the after are the same row.

### Waiting-rule dispositions (13 fallback-dependent routes)

4 `EXPLICIT_BINDING_PROPOSED` · 9 `LEGAL_OWNER_DECISION_REQUIRED`

| Route | Disposition | Rule(s) proposed | Duration as the profile states it |
| --- | --- | --- | --- |
| `additional-justice-or-municipal-court-misdemeanor-relief` | `EXPLICIT_BINDING_PROPOSED` | `wait-12` | 2 years |
| `first-offense-dui-expungement` | `EXPLICIT_BINDING_PROPOSED` | `wait-08` | 5 years |
| `minor-in-possession-underage-alcohol-expungement` | `EXPLICIT_BINDING_PROPOSED` | `wait-09` | one year |
| `uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59` | `EXPLICIT_BINDING_PROPOSED` | `wait-02` | 12 months |
| `dui-nonadjudication` | `LEGAL_OWNER_DECISION_REQUIRED` | — | — |
| `eligible-felony-conviction-expungement-99-19-71` | `LEGAL_OWNER_DECISION_REQUIRED` | — | — |
| `first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1` | `LEGAL_OWNER_DECISION_REQUIRED` | — | — |
| `first-offense-controlled-substance-conditional-discharge-relief` | `LEGAL_OWNER_DECISION_REQUIRED` | — | — |
| `human-trafficking-survivor-vacatur-and-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | — | — |
| `intervention-court-completion-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | — | — |
| `non-conviction-expungement-for-dismissal-no-disposition-or-acquittal` | `LEGAL_OWNER_DECISION_REQUIRED` | — | — |
| `nonadjudication-under-99-15-26` | `LEGAL_OWNER_DECISION_REQUIRED` | — | — |
| `pretrial-intervention-or-diversion-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | — | — |

Every rule id above is published by this jurisdiction's own compiled profile, and every duration is quoted from that rule as the profile already states it. No waiting period was authored here, no binding was added — `src/lib/rcap-engine/waiting-rule-bindings.json` is a shared path this shard may not touch — and no route is recommended ACTIVE. The full rationale, the quoted source text for every rule, and the candidate rules considered and rejected are in `data/expungement-ai/flow-audit/shard-results/SHARD-3.json` under `waitingRuleDispositions`.

### Legal questions still open

- **UX-LEGAL-001.** Mississippi's non-conviction route returns `packet_ready_with_caution` both when a state exclusion category is selected and when the shortest timing bucket is chosen. The profile is consistent with that: `wait-17`'s row reads "Dismissed/dropped/no disposition/not guilty Petition; court shall expunge" and states no period, and none of Mississippi's eight exclusion rules is scoped to the non-conviction route. Counsel to confirm that the § 99-19-71 exclusion list and Mississippi's waiting rules do not bind that route, or to say which rule does. This shard deliberately did not settle it — it is why that route's disposition is `LEGAL_OWNER_DECISION_REQUIRED` rather than a proposed no-waiting-period binding.
- **The § 99-19-71 felony changeover.** Mississippi publishes both sides of it — `wait-05` ("Before July 1, 2026 5 years") and `wait-06` ("On or after July 1, 2026 3 years") — and the selector is a calendar date, not a participant answer. The evaluator clock is pinned to 2026-07-01, the changeover date itself. Counsel and release to decide which side a filing falls on.

### Release-critical issues worked here

- **UX-COURT-001** (P1, release-critical) — the state-binding half is built: `src/lib/rcap/state-packs/mississippi/controlled-filing-dataset.ts` publishes a controlled court and filing-destination list in which every row is quoted from this repository, plus a clearly-labelled manual-entry fallback, and `MS-mississippi.json` now names it. The selector itself is Phase 2's half and is still outstanding: the renderer has no selector branch for a controlled-list question, and `toPublicQuestion` in `public-profile-projection.ts` is a strict allowlist, so a compiled profile cannot publish a dataset reference to the browser until that mapper names one. Both are prohibited shared paths for this shard.
- **UX-COUNTY-001** (P1, release-critical) — the same file publishes all 82 Mississippi counties, sorted by `localeCompare("en")` so the order is reproducible, with its own labelled manual-entry fallback. County names are administrative geography rather than legal content, but nothing in this repository verifies them, so the list carries `reviewStatus: "requires_dataset_owner_confirmation"` and the fallback is not optional.
- **UX-CONTENT-001** (P3, not release-critical this phase) — recorded and left alone. The five purpose-not-found ids are published by `postPaymentPacketCompletion` in the shared projection, so this is not a per-state change.

#### UX-COUNTY-001 / UX-COURT-001 — classified `SHARED_PHASE2_BLOCKER`

Confirmed programme-wide: shards 4 and 6 hit the same blocker independently, and one bounded state-configuration attempt here reproduced it exactly. The state-binding half is done and ready to apply; the rest cannot be built from any state shard, because every control that would turn the dataset into a selector sits on a prohibited shared path:

| Shared path | The control it holds |
| --- | --- |
| `src/lib/rcap-engine/public-profile-projection.ts` | `toPublicQuestion` is a strict allowlist; a field it does not name never reaches the browser. It must name a controlled-dataset field before any compiled profile can publish one. Its own comment says `PublicJurisdictionProfile` and the approved key set in `verify-public-profile-projection.mjs` must change with it. |
| `src/components/expungement-ai/screening/QuestionField.tsx` | No selector branch exists for a controlled-list question — UX-COURT-001's own evidence cites line 167, `case "text_or_unknown"`, a text box plus an unknown checkbox. |
| `src/lib/expungement-ai/packet-information.ts` | Line 451 re-asks `court` as `text_or_unknown` after payment, so a screening-side selector alone would still let a free-text value reach the packet. |
| `data/expungement-ai/screening-parity-approved-deltas.json` | Turning the question into a controlled list changes its `type` and `options`, which `verify-expungement-plain-language-values` compares against `main`. That needs a reviewed parity delta, and the approval file is prohibited to every shard by name. |
| `data/expungement-ai/phase2/correction-allowlist.json` | Any change that moves an evaluator output needs an entry here before `build-phase2-record.mjs` will still report `unexplainedDifferences: 0`. |

No shared projection, renderer, parity approval file or fixture was modified. The datasets and the profile declarations are inert and additive, so once the projection names a controlled-dataset field and the renderer grows a selector branch, this jurisdiction binds with no further state-side work.

### Files this shard changed for MS

```text
src/lib/rcap-engine/compiled/profiles/MS-mississippi.json
src/lib/rcap/state-packs/mississippi/controlled-filing-dataset.ts
src/lib/rcap/state-packs/mississippi/index.ts
docs/expungement-ai/flow-audit/state-reports/MS.md
```

No shared path, no other jurisdiction, and no file under `data/expungement-ai/phase2/`, `data/rcap-ledger/` or `src/lib/rcap-engine/waiting-rule-bindings.json` was modified.
