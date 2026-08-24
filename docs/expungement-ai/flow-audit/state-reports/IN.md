# Indiana (IN) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-3`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 4 |
| Flow rows | 9 |
| Consumer screens | 8 |
| Packet-information builder questions | 3 |
| Question nodes in the public payload | 47 |
| Branch edges | 32 |
| Ordered decision rules | 19 |
| Waiting-period rules | 2 |
| Exclusion rules | 2 |

## Reachability from the rendered screens only

- Packet-ready reachable: **no**
- Payment reachable: **no**
- Best terminal found: `needs_more_info` on `juvenile-allegation-expungement`
- Facts the evaluator consumes that this state never asks: `financial_obligations`, `new_convictions_during_waiting_period`, `record_documents`, `sentence_completion_date`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 5 | `age_at_offense` | `number_or_range` | yes | `supported_by_eligibility_rule` | `criminal_record` | **none** |
| 6 | `pending_cases` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 7 | `in_prosecutor_consent_confirmed` | `yes_no_unsure` | no | `supported_by_eligibility_rule` | `criminal_record` | yes |
| 8 | `resolved_timing_bucket` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `conviction-expungement-with-records-marked-expunged` | `paid_packet_intended` | `guidance_only` | closed | no |
| `conviction-expungement-with-sealed-confidential-access` | `paid_packet_intended` | `needs_more_info` | closed | no |
| `juvenile-allegation-expungement` | `paid_packet_intended` | `needs_more_info` | closed | no |
| `non-conviction-arrest-or-criminal-charge-expungement` | `paid_packet_intended` | `needs_review` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `needs_more_info` | 3 |
| `hard_stop` | 2 |
| `needs_review` | 2 |
| `not_yet` | 1 |
| `guidance_only` | 1 |

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
| `EXPAI-IN-1732365a58` | desktop-1440x1000 | 8 | `needs_more_info` | yes |
| `EXPAI-IN-3838558386` | desktop-1440x1000 | 8 | `hard_stop` | yes |
| `EXPAI-IN-0887386bf3` | desktop-1440x1000 | 8 | `guidance_only` | yes |

## Issues touching IN

- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COUNTY-001** (P1, `COUNTY_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — County is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-007** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Current city duplicates the address already requested inside contact information
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-STATECFG-001** (P2, `STATE_CONFIGURATION`, owner `PHASE_3_STATE_SHARD`) — Route-specific facts are asked of every participant in the state before the route is known
- **UX-STATELAW-001** (P1, `STATE_LEGAL_LOGIC`, owner `LEGAL_REVIEW_THEN_PHASE_3_STATE_SHARD`) — 19 jurisdictions reach no packet-ready outcome when the audit answers only the screens the flow renders
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-015** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-016** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery

## Files a Phase 3 shard may change for IN

```text
src/lib/rcap-engine/compiled/profiles/IN-indiana.json
src/lib/rcap/state-packs/indiana/**
docs/expungement-ai/flow-audit/state-reports/IN.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

---

## Phase 3 — SHARD-3 sign-off

**Phase 2 product head / base SHA:** `93e05e945a52cfa1cdd2ab590636290875a48f68` · **Branch:** `claude/expai-state-shard-03` · **Evaluator clock:** `2026-07-01`

Indiana is held, and this report now says why in terms the next reader can act on.

### What changed

- `controlledDataBindings` added to `IN-indiana.json`, naming the controlled court and county dataset for the `court` and `county` questions. Declaration only — the public projection's allowlist does not publish it and no rule reads it.
- `src/lib/rcap/state-packs/indiana/controlled-filing-dataset.ts` added: the four filing destinations Indiana's own profile names, all 92 counties, and a labelled manual-entry fallback.

### What deliberately did not change

- No terminal, reason code, pathway, packet family, form mapping, payment clamp or `operationallySellable` value. All 9 Indiana flow rows return the same terminal at this head as at the product base.
- No question was added, removed or reordered; no option value, type, `required` flag, `contextOnly` flag or stage moved. Screening parity against `main` holds byte-for-byte.
- Every terminal, reason code and payment decision. All nine Indiana flow rows return exactly what they returned at the product base, which is what `held-jurisdiction-dispositions.json` requires of a HELD_FOR_CORRECTION jurisdiction.
- `wait-01` and `wait-02`, both of which are transcribed CCA-XP form boilerplate rather than statutory rules. Correcting them means re-converting Indiana from I.C. § 35-38-9, which changes what the product claims.
- `rule-03`, whose `needs_more_info` is unanswerable by construction: its `then` clause is `return_to_exact_missing_questions` and its `when` clause names no field.

### Terminals, before and after

| Measure | Value |
| --- | --- |
| Flow rows owned | 9 |
| Flow rows whose terminal moved | **0** |
| Terminal distribution at this head | `guidance_only` ×1, `needs_more_info` ×3, `hard_stop` ×2, `not_yet` ×1, `needs_review` ×2 |

The distribution above is the distribution at the base. Nothing in this shard moved a terminal, so there is no before-and-after table to write: the before and the after are the same row.

### Waiting-rule dispositions (2 fallback-dependent routes)

2 `HELD_FOR_CORRECTION`

| Route | Disposition | Rule(s) proposed | Duration as the profile states it |
| --- | --- | --- | --- |
| `conviction-expungement-with-records-marked-expunged` | `HELD_FOR_CORRECTION` | — | — |
| `juvenile-allegation-expungement` | `HELD_FOR_CORRECTION` | — | — |

Every rule id above is published by this jurisdiction's own compiled profile, and every duration is quoted from that rule as the profile already states it. No waiting period was authored here, no binding was added — `src/lib/rcap-engine/waiting-rule-bindings.json` is a shared path this shard may not touch — and no route is recommended ACTIVE. The full rationale, the quoted source text for every rule, and the candidate rules considered and rejected are in `data/expungement-ai/flow-audit/shard-results/SHARD-3.json` under `waitingRuleDispositions`.

### Legal questions still open

- **UX-STATELAW-001.** Indiana's promotion manifest marks the Expungement.ai channel approved and Indiana's promotion status is `live`, yet no Indiana route reaches a packet-ready outcome from the rendered screens. The measurement is unambiguous about the cause: driving the real evaluator with every rendered screen answered, in all five pathway-context options, returns `missingQuestionIds: []` every time. Nothing a participant could answer changes any Indiana terminal. Three routes are held by name inside `src/lib/rcap-engine/evaluator.ts` (`CORRECTED_AWAITING_RECONFIRM_ROUTES`, `HELD_GUIDANCE_ROUTES`); the fourth returns `needs_more_info` from `rule-03`, whose own condition text says "Because the supplied packet does not state every statutory eligibility tier for this route, the backend must confirm the applicable IC 35-38-9 section before packet release." Confirm whether Indiana is intended to be unavailable to a self-help participant in this release. If it is, Indiana's screening entry should say so plainly instead of ending in `needs_more_info` on a rule that names no question.
- **Indiana's profile is converted from forms, not from the statute.** `IN-indiana.json` publishes two waiting-period rules and both are CCA-XP form boilerplate. The real I.C. § 35-38-9 tiers exist only as hard-coded branches in `specialRouteTiming` inside the shared evaluator. Until Indiana is re-converted from the statute, both Indiana fallback routes stay `HELD_FOR_CORRECTION` and the two existing Indiana bindings continue to point at juvenile form text.

### Release-critical issues worked here

- **UX-COURT-001** (P1, release-critical) — the state-binding half is built: `src/lib/rcap/state-packs/indiana/controlled-filing-dataset.ts` publishes a controlled court and filing-destination list in which every row is quoted from this repository, plus a clearly-labelled manual-entry fallback, and `IN-indiana.json` now names it. The selector itself is Phase 2's half and is still outstanding: the renderer has no selector branch for a controlled-list question, and `toPublicQuestion` in `public-profile-projection.ts` is a strict allowlist, so a compiled profile cannot publish a dataset reference to the browser until that mapper names one. Both are prohibited shared paths for this shard.
- **UX-COUNTY-001** (P1, release-critical) — the same file publishes all 92 Indiana counties, sorted by `localeCompare("en")` so the order is reproducible, with its own labelled manual-entry fallback. County names are administrative geography rather than legal content, but nothing in this repository verifies them, so the list carries `reviewStatus: "requires_dataset_owner_confirmation"` and the fallback is not optional.
- **UX-STATECFG-001** (P2, not release-critical this phase) — recorded and left alone. Indiana asks `in_prosecutor_consent_confirmed` of every participant before the route is known; the gating would have to happen in `deriveScreens`, which the issue's own evidence names and which is a prohibited shared path.
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

### Files this shard changed for IN

```text
src/lib/rcap-engine/compiled/profiles/IN-indiana.json
src/lib/rcap/state-packs/indiana/controlled-filing-dataset.ts
src/lib/rcap/state-packs/indiana/index.ts
docs/expungement-ai/flow-audit/state-reports/IN.md
```

No shared path, no other jurisdiction, and no file under `data/expungement-ai/phase2/`, `data/rcap-ledger/` or `src/lib/rcap-engine/waiting-rule-bindings.json` was modified.
