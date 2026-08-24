# Expungement.ai Phase 4 — Independent Verification of the Integrated Flow Program

**Candidate:** `86e0cd0a1305d8d22f7fded86a5a63848bf75690` (`claude/expai-flow-integration-p3` head)
**Phase 2 product head:** `93e05e945a52cfa1cdd2ab590636290875a48f68`
**Verification branch:** `claude/expai-flow-verification-p4`
**Safety branch:** `claude/expai-p3-candidate-safety-86e0cd0a`

This session implemented no part of Phase 2, no Phase 3 shard and no Phase 3 integration.
It wrote verification records only. No implementation path was modified and no finding was
repaired. Nothing was merged, deployed or migrated, and no Stripe call was made.

---

## 1. Frozen evidence reconciled before anything was written

The six shard result files were re-read and their route dispositions recounted from scratch:

| Class | Required | Observed |
|---|---|---|
| `EXPLICIT_BINDING_PROPOSED` | 75 | **75** |
| `EXPLICIT_CONDITIONAL_BINDING_PROPOSED` | 12 | **12** |
| `LEGAL_OWNER_DECISION_REQUIRED` | 170 | **170** |
| `HELD_FOR_CORRECTION` | 25 | **25** |
| Total fallback routes | 282 | **282** |
| Duplicate routes across shards | 0 | **0** |

The counts and the route identities reconcile exactly. The same 282 appear independently in
`waiting-rule-bindings.json` as 279 `unresolvedPreserved` plus 3 `unresolvedAtBase`.

## 2. Flow identity and the 622-to-625 reconciliation

```
TOTAL_MANIFEST_ROWS:           625
TOTAL_REAL_PARTICIPANT_FLOWS:  356
TOTAL_SYNTHETIC_PROBE_FLOWS:   269
```

The integration captain's claim was checked rather than accepted. Running
`build-flow-manifest.mjs` and `build-question-inventory.mjs` in a clean worktree at
`93e05e94` — no shard merged — produces bytes **identical** to the candidate's committed
artifacts (`flow-manifest` sha256 prefix `04377127e72cf9c1`, `question-inventory`
`00075de219f14d68`). Compared by stable flowKey, state, remedy, audience, payment and
sponsorship mode and terminal meaning:

- real participant flows: **356 at base, 356 at candidate**
- missing real flow keys: **0** · lost state/remedy pairs: **0**
- terminal / packet-family / form-set / payment-mode / sponsorship-mode / eligibility changes: **0**
- synthetic probe churn: **7 retired, 10 added**

The entire 622→625 movement is probe churn. No real remedy moved. Confirmed.

## 3. One verdict per manifest row

625 rows, 625 verdicts, one each.

| Verdict | All rows | Real participant flows |
|---|---|---|
| APPROVED | 168 | 12 |
| CORRECTION_REQUIRED | 189 | 183 |
| LEGAL_OWNER_DECISION_REQUIRED | 258 | 157 |
| ENVIRONMENT_BLOCKED | 10 | 4 |

Precedence: `CORRECTION_REQUIRED > LEGAL_OWNER_DECISION_REQUIRED > ENVIRONMENT_BLOCKED > APPROVED`.
No purchasable row carries APPROVED. No P0-risk row is recommended active. `APPROVED` here
means "verified as a record", never "cleared to sell": every APPROVED row is non-purchasable,
and its rollout recommendation is still conditioned on the hosted gate.

## 4. Waiting-rule verification

**The provisional prose fallback is not eliminated.** `bestWaitingRuleForPathway` is present
verbatim in `src/lib/rcap-engine/evaluator.ts` and decides all 282 routes with no authored
binding. 43 routes carry a committed binding: 34 `rules`, 8 `inline`, 1 `no_waiting_period`.

Every committed binding was checked. No bound rule id is missing from its jurisdiction, and no
binding's provenance duration disagrees with the profile it cites. The defect is upstream:

**21 of 43 committed bindings bind a number that is not the operative wait.** 57 individual
findings across six classes — age thresholds, sentence or probation terms, disqualifying
lookbacks, objection windows, durations with no counterpart in their own quote, and 12
multi-class bindings collapsed to one branch by `longest_bound_duration`.

## 5. The seven required P0 holds — reproduced independently

Method: the committed evaluator driven through the committed public-profile projection, one
synthetic participant per (jurisdiction, pathway, published timing bucket), route pinned
through the profile's own pathway-context option. 325 routes swept — the manifest's own
`compiledPathways` denominator.

| Hold | Result |
|---|---|
| HI `dui-under-21-conviction` | **PARTIAL** — timing inert across all nine buckets (all → `needs_review`); payment does not open here, it opens on `HI:nonconviction-arrest-expungement`, which is inert at `lt_1_year` *and* while the case is still open |
| HI `first-time-drug-conviction` | **PARTIAL** — identical to the DUI route |
| NV `general-conviction-record-sealing` | **NOT REPRODUCED AS STATED** — `needs_review`/`paymentAllowed=false` at every bucket including `lt_1_year`. The real defect is different: the eight-year rule never executes and no NV route reaches a purchasable terminal at all. Hold retained; the wording needs correcting before it is actioned |
| LA five-year clean-period route | **REPRODUCED** — three LA routes allow payment at `lt_1_year`, including `misdemeanor-article-894-b-set-aside` and `felony-article-893-e-set-aside`, the clean-period family the hold names |
| MO `marijuana-expungement` | **REPRODUCED EXACTLY** — a *committed* binding (`ruleRefs:["wait-01"]`) whose own quote is *"First intoxication-related traffic/boating offense 610.130 … after 10 years"*. An unrelated DWI ten-year rule is bound live to Missouri's Article XIV marijuana remedy. Not a proposal |
| PA routes selecting `wait-05` | **REPRODUCED IN DATA** — `wait-05` carries `{70, years}` extracted from *"70 years of age or older"*; the operative wait in that same sentence is the 10 years also stated there. Not currently reachable to a payment decision: the single committed PA binding omits `wait-05`, and `path-e` returns `guidance_only`. It becomes reachable the moment a `path-e` binding is authored from the rule list |
| CA affected routes | **REPRODUCED** — `ambiguityReason()` is route-blind. All four `ca_prop64_*` questions are published to every California participant and each flips `CA:tool-1-dismissal-set-aside` from `packet_ready_with_caution`/`true` to `needs_review`/`false` |

### Beyond the register

- **176 of 325 routes are timing-inert** — the participant's timing answer changes nothing.
- **14 routes allow payment at `lt_1_year`; 5 allow it while the case is still open.**
- `WI:adult-conviction-expungement-under-wis-stat-973-015` is the **only route on a committed
  binding** in that set. It is not in the seven-entry register and should be added.
- IL, MS, ND, NE and VA each carry an unregistered `lt_1_year` payment route.

### A bounded negative

Every one of the 51 jurisdictions publishes 16 of *other* states' route-scoped question ids
(EXPAI-FA-022). The obvious escalation — a Wisconsin question blocking an Alaska route — was
tested across all 51 and **does not reproduce**: no foreign question changed any outcome. The
route-irrelevant ambiguity defect is confined to a jurisdiction's *own* route-scoped questions,
where 5 of 16 tested questions close a payable route that has nothing to do with them.

## 6. County and court

All five claims verified; the `SHARED_PHASE2_BLOCKER` classification is correct.

- 17 of 51 jurisdictions carry a prepared controlled dataset (16 with options, 1 empty for a
  recorded source gap); **34 have none at all**.
- Nothing outside the state packs reads `controlledDataBindings` or any dataset — a state
  profile edit cannot reach the served public profile. **Confirmed.**
- `scripts/verify-expungement-plain-language-values.mjs` passes and refuses an unapproved
  question type or option change; Maryland's delta carries four sha256 pins. **Confirmed.**
- `QuestionField.tsx` has eight arms and **none** combines a controlled option list with a
  separately stored manual value. **Confirmed.**
- No shard represented a prepared dataset as a live selector. **Confirmed.**

Consolidated as **CP-07**. Not implemented.

## 7. Global issue reconciliation (25 registered)

| Verdict | Count |
|---|---|
| CLOSED_BY_PHASE2 | 6 |
| STILL_REPRODUCIBLE | 6 |
| ENVIRONMENT_BLOCKED | 12 |
| LEGAL_OWNER_DECISION_REQUIRED | 1 |
| SUPERSEDED | 0 |

Phase 2 implementations were credited where the code shows them — the slug-route verifier, the
canonical-fact sweep, screening-session persistence, plain-language mapping, discount and
sponsorship entry points — rather than assumed absent because integration was merge-only.
EXPAI-FA-018 (the waiting-rule selector) is recorded **partially closed**: 43 routes bound, 282
still on the fallback.

## 8. Deterministic verification — run once

`verify-flow-audit.mjs`: **29/33 pass**, failing FA-16, FA-17, FA-21, FA-23.

The integration record claims all four fail "identically at the untouched base". That is true
**only after regeneration**, and this pass established the distinction:

| Run | Result |
|---|---|
| Candidate `86e0cd0a` | 29/33 — FA-16, FA-17, FA-21, FA-23 red |
| Phase 2 base `93e05e94`, committed tree as-is | **31/33 — only FA-17 and FA-21 red** |
| Phase 2 base after regenerating manifest + inventory | 29/33 — the same four red |

FA-16 and FA-23 pass at the committed base because the artifacts committed there were *stale*.
The candidate committed the correctly regenerated ones, which is why the checks turn red. The
defects are pre-existing; their visibility is candidate-caused. Neither is a real-flow loss:

- **FA-16's 7 unknown flow ids are all retired synthetic probe hashes** (FL, IA ×2, PA ×2,
  SD ×2) — every one an `_probe_inside_waiting_period` or `_probe_state_exclusion_selected`
  row. Zero real remedies referenced.
- **FA-23's 31 non-reproducing fixtures** are recorded verbatim in
  `phase2/post-implementation-comparison.json#staleWitnessFixtures` at the Phase 2 head.
- **FA-17's delta is 104 paths.** Every one of the 17 compiled-profile changes was verified
  additive-only: each adds exactly the top-level `controlledDataBindings` key and changes no
  question, pathway, waiting rule, exclusion rule, ordered decision rule or profile version.
  Each of the 43 state-pack index changes is a single added export line, zero deletions.
- **FA-21**: five artifacts stale at base, four at the candidate — a partial improvement.

Worker and ledger, measured once each:

- `verify-rcap-image-input-fingerprint.mjs` **FAILS**: `src/` at HEAD is `1efde49aa966…`, the
  fingerprint records `bded33ec9863…`, base `5ac0d8d6`, 129 image-input paths differ. Partly
  candidate-caused (103 of them are this candidate's authorised state-scoped work). Blocks
  hosted acceptance and worker publication; does not block flow logic.
- `verify-rcap-worker-image-revision.mjs` **FAILS**: `WORKER_TAG` unset — a missing environment
  input, not a tree defect.
- `generate-rcap-authority-ledger.mjs --check` is **GREEN**: *"Ledger current at version 1. No
  drift."* The "stale RCAP witness ledger" characterisation does not hold for the authority
  ledger at this head.

`data/rcap-*` was not regenerated and no worker was published.

## 9. Browser and authenticated acceptance — one bounded attempt

No exact Preview, staging Supabase, synthetic user or compatible browser exists.

- `hosted-acceptance-record.json`: `deploymentUrl = null`; no Preview created, none found to reuse.
- `data/rcap-staging-action.json`: `status = "prepared_queued_not_authorized"`, blocker **ENV-007**.
- `environment-blockers.json#fixtureCreation`: `attempted=false, authorized=false`.
- Playwright 1.60.0 resolves chromium **v1223**; `/opt/pw-browsers` carries **1194** only.
- No `STRIPE_*`, `SUPABASE_*` or `VERCEL_*` value is present.

Confirmed once and **not retried**. Browser, paid, sponsored, discount, save/resume, privacy,
cross-user, mobile and legacy-loop cases are **ENVIRONMENT_BLOCKED**. No static or self-signed
artifact is represented as a Stripe-delivered test-webhook result; no payment call was made.

## 10. Correction packets

| ID | Title | Blocks rollout |
|---|---|---|
| CP-01 | P0 legal and premature-payment risks | yes |
| CP-02 | Explicit waiting-rule bindings ready for application (75) | yes |
| CP-03 | Conditional bindings requiring a new fact (12) | yes |
| CP-04 | Duration-extraction defects in committed bindings (21 of 43) | yes |
| CP-05 | Legal-owner decisions (170) | yes |
| CP-06 | State-source reconstruction, including Indiana | yes |
| CP-07 | County/court shared pipeline | yes |
| CP-08 | Shared evaluator defects, including route-irrelevant ambiguity | yes |
| CP-09 | Stale worker and reachability evidence | no (blocks hosted acceptance) |
| CP-10 | Hosted environment / browser / payment / sponsorship acceptance | yes |

None is implemented.

## 11. Final gate

All 16 gate checks pass: one verdict per row; 51 jurisdictions; no missing real path; no
duplicate real flow key; zero eligibility, packet-family, form-set, payment or sponsorship
changes; unsupported routes non-purchasable; 282 dispositions represented once; all seven P0
entries retained; no implementation-path diff; `git diff --check` clean; no unsupported route
approved as purchasable; no P0-risk route recommended active.

**Not ready for controlled rollout.** Nine of ten packets block. The hosted half of the exit
gate is reported as ENVIRONMENT_BLOCKED, not as approval.
