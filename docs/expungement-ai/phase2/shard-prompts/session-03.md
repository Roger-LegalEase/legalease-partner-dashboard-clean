# EXPUNGEMENT.AI — PHASE 3 — SHARD-3 (session 03)

You are implementing release-critical state configuration corrections for exactly 8 jurisdictions. Keep thinking enabled. Use high effort.

Before the first tool call, state in one sentence that you will correct only the configuration of your assigned jurisdictions and will not touch shared code.

## Your jurisdictions

- IN Indiana
- MA Massachusetts
- MN Minnesota
- MO Missouri
- MS Mississippi
- OK Oklahoma
- SC South Carolina
- VA Virginia

No other jurisdiction is yours. If you find a defect in a jurisdiction outside this list, record it in your shard result file and leave the code alone.

## Base

```text
PHASE2_PRODUCT_HEAD = 93e05e945a52cfa1cdd2ab590636290875a48f68
BASE_SHA            = 93e05e945a52cfa1cdd2ab590636290875a48f68
BRANCH              = claude/expai-phase3-shard-3
```

`PHASE2_PRODUCT_HEAD` is the Phase 2 product base and the commit you build from. A later commit on this branch may publish these prompt files themselves; that publication commit is NOT the product base and you must not branch from it.

Create your branch from exactly `93e05e945a52cfa1cdd2ab590636290875a48f68`. That commit is the Phase 2 head: the shared fact model, the waiting-rule bindings, the canonical fact store and the contact-field split are already in it. Fetch origin with prune first. Require a clean tracked worktree and no merge or rebase in progress. Do not push to `main`. Do not deploy. Do not run a migration. Do not change a feature flag. Do not create a payment.

## Read before you change anything

Phase 2's record first — it tells you what already moved and what is deliberately still open:

```text
docs/expungement-ai/phase2/implementation-report.md
data/expungement-ai/phase2/correction-allowlist.json
data/expungement-ai/phase2/held-jurisdiction-dispositions.json
data/expungement-ai/phase2/corrected-pathway-proof.json
data/expungement-ai/phase2/p2-p3-backlog.json
src/lib/rcap-engine/waiting-rule-bindings.json
```

Then the audit's reading of your states:

```text
docs/expungement-ai/flow-audit/baseline-report.md
docs/expungement-ai/flow-audit/human-review-required.md
docs/expungement-ai/flow-audit/state-reports/IN.md
docs/expungement-ai/flow-audit/state-reports/MA.md
docs/expungement-ai/flow-audit/state-reports/MN.md
docs/expungement-ai/flow-audit/state-reports/MO.md
docs/expungement-ai/flow-audit/state-reports/MS.md
docs/expungement-ai/flow-audit/state-reports/OK.md
docs/expungement-ai/flow-audit/state-reports/SC.md
docs/expungement-ai/flow-audit/state-reports/VA.md
data/expungement-ai/flow-audit/flow-manifest.json
data/expungement-ai/flow-audit/question-inventory.json
data/expungement-ai/flow-audit/issue-register.json
AGENTS.md
```

## What you own

```text
src/lib/rcap-engine/compiled/profiles/IN-indiana.json
src/lib/rcap-engine/compiled/profiles/MA-massachusetts.json
src/lib/rcap-engine/compiled/profiles/MN-minnesota.json
src/lib/rcap-engine/compiled/profiles/MO-missouri.json
src/lib/rcap-engine/compiled/profiles/MS-mississippi.json
src/lib/rcap-engine/compiled/profiles/OK-oklahoma.json
src/lib/rcap-engine/compiled/profiles/SC-south-carolina.json
src/lib/rcap-engine/compiled/profiles/VA-virginia.json
src/lib/rcap/state-packs/indiana/**
src/lib/rcap/state-packs/massachusetts/**
src/lib/rcap/state-packs/minnesota/**
src/lib/rcap/state-packs/missouri/**
src/lib/rcap/state-packs/mississippi/**
src/lib/rcap/state-packs/oklahoma/**
src/lib/rcap/state-packs/south-carolina/**
src/lib/rcap/state-packs/virginia/**
docs/expungement-ai/flow-audit/state-reports/IN.md
docs/expungement-ai/flow-audit/state-reports/MA.md
docs/expungement-ai/flow-audit/state-reports/MN.md
docs/expungement-ai/flow-audit/state-reports/MO.md
docs/expungement-ai/flow-audit/state-reports/MS.md
docs/expungement-ai/flow-audit/state-reports/OK.md
docs/expungement-ai/flow-audit/state-reports/SC.md
docs/expungement-ai/flow-audit/state-reports/VA.md
data/expungement-ai/flow-audit/shard-results/SHARD-3.json
```

## What you must not touch

The shared layer is Phase 2's. A diff touching one of these fails your shard regardless of how good the change is:

```text
src/components/expungement-ai/**
src/components/ui/**
src/lib/expungement-ai/packet-information.ts
src/lib/expungement-ai/briefcase.ts
src/lib/expungement-ai/payment-adapter.ts
src/lib/expungement-ai/consumer-payment-authority.ts
src/lib/expungement-ai/frontend/**
src/lib/rcap-engine/evaluator.ts
src/lib/rcap-engine/public-profile-projection.ts
src/lib/rcap-engine/packet-planner.ts
src/lib/rcap-engine/composed-route-selector.ts
src/app/api/expungement-ai/checkout/**
src/app/api/expungement-ai/payment/**
src/app/briefcase/**
src/lib/analytics/**
src/lib/auth/**
src/lib/stripe/**
supabase/migrations/**
data/rcap-all50/**
data/rcap-ledger/**
src/lib/expungement-ai/canonical-facts.ts
src/lib/expungement-ai/contact-fields.ts
src/lib/expungement-ai/localization.ts
src/lib/rcap-engine/waiting-rule-bindings.json
src/lib/rcap-engine/profile-registry.ts
data/expungement-ai/phase2/**
scripts/expungement-ai/phase2/**
data/expungement-ai/screening-parity-approved-deltas.json
data/expungement-ai/fixtures/**
```

You may not remove a state-specific legal rule because it is inconvenient. You may not delete a question because the audit could not find its purpose. You may not change a packet family, a form mapping, a payment clamp or an `operationallySellable` value.

**Waiting periods.** The waiting rule a route resolves is now an explicit binding in `src/lib/rcap-engine/waiting-rule-bindings.json`, which is shared and not yours. If one of your routes needs a binding it does not have, record the route, the rule you believe applies and the source text in your shard result file. Do not author a waiting period, and do not add a binding.

## RELEASE RULE — the provisional waiting-rule fallback

Read this before you touch a route.

The waiting-rule binding table in `src/lib/rcap-engine/waiting-rule-bindings.json` is the authority **only where a binding exists**. It covers 43 of the 325 compiled pathways. The other 282 are still resolved by the pre-correction prose selector, which is retained verbatim in the evaluator and is **provisional**. It was kept because it is answer-dependent and removing it closed six jurisdictions that were open at the product base; it is not the design, it is the thing the design is replacing one reviewed binding at a time.

**57 of your assigned routes depend on that provisional fallback.** For every one of them you must return exactly one Phase 3 disposition:

| Disposition | Use it when |
| --- | --- |
| `EXPLICIT_BINDING_PROPOSED` | one waiting rule the jurisdiction's own compiled profile already publishes governs this route unconditionally, and you can name its rule id and quote its source text |
| `EXPLICIT_CONDITIONAL_BINDING_PROPOSED` | the rule that governs depends on a fact the participant already supplies, and you can name the rule ids, the field id and the exact answer values that select between them |
| `LEGAL_OWNER_DECISION_REQUIRED` | the repository does not contain enough to settle which rule governs, or the candidates conflict, and choosing one would be authoring legal content |
| `HELD_FOR_CORRECTION` | the route needs a correction outside this shard's scope before a binding is meaningful |

Rules, without exception:

- **Do not modify the shared evaluator or the shared fallback in a shard.** `src/lib/rcap-engine/evaluator.ts` and `src/lib/rcap-engine/waiting-rule-bindings.json` are prohibited paths above. You propose; the integration captain binds.
- **Do not guess a waiting rule.** A duration you cannot trace to a rule id already published by that jurisdiction's compiled profile is invented legal content. `LEGAL_OWNER_DECISION_REQUIRED` is always the correct answer over a guess.
- **No fallback-dependent route may be recommended ACTIVE without an explicit, repository-supported binding.** A route still resolving through the provisional selector is not release-ready, whatever terminal it currently returns. Recommending it ACTIVE is a shard failure.
- A proposal is evidence, not a change: rule id, quoted source text, the duration as the profile already states it, and — for a conditional proposal — the field id and answer values. Never a duration you wrote yourself.

Your 57 fallback-dependent routes:

```text
IN:conviction-expungement-with-records-marked-expunged   [no candidate rule at base]
IN:juvenile-allegation-expungement   [no candidate rule at base]
MA:adult-conviction-sealing-under-m-g-l-c-276-100a
MA:automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c
MA:court-requested-sealing-for-dismissal-or-nolle-prosequi-100c
MA:juvenile-record-sealing-under-100b
MA:marijuana-only-expungement
MA:time-based-expungement-under-100f-100j
MN:arrest-identification-data-destruction-when-no-charges-were-filed-minn-stat-299c-11
MN:automatic-clean-slate-expungement-under-609a-015
MN:automatic-mistaken-identity-expungement-under-609a-017
MN:cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06
MN:petition-based-expungement-under-609a-02-03
MN:prosecutor-agreed-sealing-without-a-full-petition-under-609a-025
MO:closed-record-outcome-under-rsmo-610-105
MO:false-information-or-qualifying-arrest-record-expungement-under-610-122-123
MO:first-intoxication-related-traffic-or-boating-expungement-under-610-130
MO:stolen-or-mistaken-identity-expungement-under-610-145
MS:additional-justice-or-municipal-court-misdemeanor-relief
MS:dui-nonadjudication
MS:eligible-felony-conviction-expungement-99-19-71
MS:first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1
MS:first-offense-controlled-substance-conditional-discharge-relief
MS:first-offense-dui-expungement
MS:human-trafficking-survivor-vacatur-and-expungement
MS:intervention-court-completion-expungement
MS:minor-in-possession-underage-alcohol-expungement
MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal
MS:nonadjudication-under-99-15-26
MS:pretrial-intervention-or-diversion-expungement
MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59
OK:arrest-with-no-charges-filed
OK:clean-slate-automatic-expungement
OK:conviction-reversed-and-case-dismissed
OK:deferred-sentence-court-record-expungement-under-991-c
OK:dna-factual-innocence-expungement
OK:felony-reclassified-as-a-misdemeanor
OK:fine-only-misdemeanor-conviction-expungement
OK:human-trafficking-survivor-relief
OK:juvenile-record-expungement
OK:misdemeanor-deferred-dismissal-expungement
OK:nonviolent-felony-deferred-dismissal-expungement
OK:not-more-than-two-eligible-felony-convictions-expungement
OK:one-eligible-nonviolent-felony-conviction-expungement
OK:other-eligible-misdemeanor-conviction-expungement
OK:pardon-based-expungement
OK:up-to-two-felony-deferred-dismissal-expungement
OK:victim-protective-order-record-relief
SC:diversion-or-program-completion-expungement
SC:eligible-conviction-expungement
SC:general-sessions-non-conviction-expungement
SC:human-trafficking-survivor-expungement
SC:juvenile-expungement
SC:pardon-guidance-for-otherwise-ineligible-convictions
VA:automatic-sealing-no-filing
VA:petition-based-sealing
VA:regime-1-expungement-available-now
```

Record one disposition per route in your shard result file under `waitingRuleDispositions`, keyed by the route id exactly as spelled above.

**Held jurisdictions in your shard.** These are held deliberately. Preserve their current behaviour exactly and record what you find instead of resolving it:

- IN — HELD_FOR_CORRECTION. These need a correction this sprint is not authorised to make. Their pre-correction behaviour is preserved exactly.

## Your expected scope

| Measure | Count |
| --- | --- |
| Jurisdictions | 8 |
| Flow rows | 114 |
| Question nodes | 414 |
| Consumer screens | 83 |
| Branch edges | 406 |
| Unresolved legal-review items | 7 |
| Workload weight | 1694 (15.99% of the programme) |

114 flow IDs are yours, listed in full in `data/expungement-ai/flow-audit/shard-assignment.json` under `shards[] where shardId == "SHARD-3"`.

## Your work, in order

1. **Re-confirm the audit's reading at this base.** Phase 2 changed which facts the flow renders, so counts recorded against the Phase 1 base may have moved for a legitimate reason. Re-run the manifest generators with `--check` and reconcile any difference against `data/expungement-ai/phase2/correction-allowlist.json` before you treat it as a defect. A difference the allowlist does not explain is a finding: stop and say so.

2. **Resolve the reachability question for your jurisdictions that still cannot reach packet-ready from rendered screens.**

   Already reopened by Phase 2, so do not re-investigate them: `OK`, `SC`. Their intended route now returns a packet-ready terminal for the same participant the Phase 1B reconciliation used, and the proof is in `data/expungement-ai/phase2/remedy-context-replay-after.json`. Confirm that still holds at this base and record it.

   Still yours: `IN`.

   Phase 2 corrected the shared part of this: facts the evaluator consumed before the packet decision are now asked, and the waiting-rule lookup no longer fails silently. What is left in these states is legal, not structural. For each, decide from the compiled profile and its source references which is true: the missing fact is a genuine legal precondition that must be asked before a packet, or the route is not available to a self-help participant in that state. The first is a lifecycle classification correction in that state's compiled profile. The second changes what the product claims and must be escalated, not answered.

3. **Work the release-critical state issues assigned to you.** P0 and P1 first; anything marked not release-critical is recorded in your shard result and left alone this phase.

- **UX-COUNTY-001** (P1, `COUNTY_DATA`) — RELEASE-CRITICAL
  - County is collected as free text with no state-aware selector and no controlled dataset behind it
  - expected: A state-aware county selector sourced from a controlled dataset, with a clearly-labelled manual entry fallback.
  - your jurisdictions: `IN`, `MS`
  - legal review required: no
- **UX-COURT-001** (P1, `COURT_DATA`) — RELEASE-CRITICAL
  - Court is collected as free text with no state-aware selector and no controlled dataset behind it
  - expected: A state-aware court selector sourced from a controlled dataset, with a clearly-labelled manual entry fallback.
  - your jurisdictions: `IN`, `MA`, `MN`, `MO`, `MS`, `OK`, `SC`, `VA`
  - legal review required: no
- **UX-STATECFG-001** (P2, `STATE_CONFIGURATION`) — not release-critical this phase
  - Route-specific facts are asked of every participant in the state before the route is known
  - expected: Route-specific questions appear only once the answers so far make that route possible.
  - your jurisdictions: `IN`
  - legal review required: no
- **UX-STATELAW-001** (P1, `STATE_LEGAL_LOGIC`) — RELEASE-CRITICAL
  - 19 jurisdictions reach no packet-ready outcome when the audit answers only the screens the flow renders
  - expected: Every jurisdiction whose promotion manifest marks the Expungement.ai channel approved has at least one packet-ready outcome reachable from the rendered screens, or states plainly that it does not.
  - your jurisdictions: `IN`, `OK`, `SC`
  - legal review required: **yes — record the question, do not implement it**
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`) — not release-critical this phase
  - 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
  - expected: A question is either asked and consumed, or not published.
  - your jurisdictions: `IN`, `MA`, `MN`, `MO`, `MS`, `OK`, `SC`, `VA`
  - legal review required: no
- **UX-LEGAL-001** (P1, `REQUIRES_LEGAL_REVIEW`) — RELEASE-CRITICAL
  - Selecting a state exclusion category still returns packet-ready in some jurisdictions, and so does the shortest timing bucket
  - expected: Counsel confirms that the exclusion list and the waiting rule do not bind the non-conviction routes, or the rules are corrected.
  - your jurisdictions: `MS`
  - legal review required: **yes — record the question, do not implement it**

4. **Do not implement any global issue.** Every issue whose category begins `GLOBAL_` was Phase 2's. The ones Phase 2 did not build are in `data/expungement-ai/phase2/p2-p3-backlog.json` with the reason; add to that record rather than acting on it. State-specific findings still open across the programme: `UX-COUNTY-001`, `UX-COURT-001`, `UX-STATECFG-001`, `UX-STATELAW-001`, `UX-CONTENT-001`, `UX-LEGAL-001`.

5. **Write one state sign-off packet per jurisdiction** at `data/expungement-ai/flow-audit/shard-results/SHARD-3.json`, recording for each jurisdiction: what you changed, what you deliberately did not change, which legal questions remain open, and the before-and-after terminal for every flow ID of yours whose outcome moved.

## Acceptance tests

Run all of these. Every one must pass before you push.

```bash
node scripts/expungement-ai/flow-audit/build-flow-manifest.mjs --check
node scripts/expungement-ai/flow-audit/build-question-inventory.mjs --check
node scripts/expungement-ai/flow-audit/build-branch-coverage.mjs --check
node scripts/expungement-ai/flow-audit/build-ui-reachability.mjs --check
node scripts/expungement-ai/flow-audit/verify-flow-audit.mjs
node scripts/verify-rcap-evaluator-all51-provability.mjs
node scripts/verify-rcap-reachability-evidence.mjs
node scripts/verify-public-profile-projection.mjs
node scripts/verify-expungement-dtc-flow-unchanged.mjs
EXPAI_FLOW_AUDIT_JURISDICTIONS=IN node tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs
EXPAI_FLOW_AUDIT_JURISDICTIONS=MA node tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs
EXPAI_FLOW_AUDIT_JURISDICTIONS=MN node tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs
EXPAI_FLOW_AUDIT_JURISDICTIONS=MO node tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs
EXPAI_FLOW_AUDIT_JURISDICTIONS=MS node tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs
EXPAI_FLOW_AUDIT_JURISDICTIONS=OK node tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs
EXPAI_FLOW_AUDIT_JURISDICTIONS=SC node tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs
EXPAI_FLOW_AUDIT_JURISDICTIONS=VA node tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs
node scripts/expungement-ai/phase2/verify-expungement-fact-model.mjs
node scripts/expungement-ai/phase2/verify-jurisdiction-slug-routes.mjs
node scripts/expungement-ai/phase2/build-phase2-record.mjs
node scripts/verify-expungement-plain-language-values.mjs
node scripts/verify-rcap-md-pardon-pathway.mjs
```

Additionally:

```bash
npm run lint
npm run typecheck
git diff --check
```

`node scripts/expungement-ai/phase2/build-phase2-record.mjs` must report `unexplainedDifferences: 0`. If your change moves an evaluator output, it belongs in the correction allowlist — which is shared, so you propose the entry in your shard result and the integration captain adds it. An unexplained difference is a failure, not a finding.

And prove the negative that matters most — that you changed no shared code and no unassigned jurisdiction:

```bash
git diff --name-only 93e05e945a52cfa1cdd2ab590636290875a48f68...HEAD
```

Every path in that output must match one of your allowed configuration paths.

## Commit and push

Commit your configuration changes, your state reports, and your shard result file. Push `claude/expai-phase3-shard-3`. Do not merge. Do not deploy. Do not open a pull request unless the integration captain asks for one.

## Final response

```text
PHASE 3 SHARD-3 COMPLETE
PHASE2 PRODUCT HEAD:
BASE SHA:
HEAD:
JURISDICTIONS:
FLOWS CHANGED:
QUESTIONS CHANGED:
TERMINALS MOVED:
EVALUATOR OUTPUT DIFFERENCES PROPOSED FOR THE ALLOWLIST:
FALLBACK-DEPENDENT ROUTES ASSIGNED:            57
FALLBACK ROUTES DISPOSITIONED:
  EXPLICIT_BINDING_PROPOSED:
  EXPLICIT_CONDITIONAL_BINDING_PROPOSED:
  LEGAL_OWNER_DECISION_REQUIRED:
  HELD_FOR_CORRECTION:
FALLBACK ROUTES RECOMMENDED ACTIVE:
LEGAL QUESTIONS STILL OPEN:
HELD JURISDICTIONS TOUCHED:
SHARED PATHS TOUCHED:
UNASSIGNED JURISDICTIONS TOUCHED:
ACCEPTANCE TESTS:
EXACT BLOCKERS:
```

`SHARED PATHS TOUCHED`, `HELD JURISDICTIONS TOUCHED` and `UNASSIGNED JURISDICTIONS TOUCHED` must all read `none`.

`FALLBACK ROUTES RECOMMENDED ACTIVE` must read `none`. The four disposition counts must sum to `FALLBACK-DEPENDENT ROUTES ASSIGNED`; a route left undispositioned fails the shard.
