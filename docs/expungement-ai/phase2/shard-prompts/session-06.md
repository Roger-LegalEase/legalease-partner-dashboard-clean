# EXPUNGEMENT.AI — PHASE 3 — SHARD-6 (session 06)

You are implementing release-critical state configuration corrections for exactly 9 jurisdictions. Keep thinking enabled. Use high effort.

Before the first tool call, state in one sentence that you will correct only the configuration of your assigned jurisdictions and will not touch shared code.

## Your jurisdictions

- CT Connecticut
- DE Delaware
- ID Idaho
- IL Illinois
- KY Kentucky
- LA Louisiana
- NH New Hampshire
- NJ New Jersey
- VT Vermont

No other jurisdiction is yours. If you find a defect in a jurisdiction outside this list, record it in your shard result file and leave the code alone.

## Base

```text
BASE_SHA = 288b0d9a1d6683b91b447275a1474710d433ef95
BRANCH   = claude/expai-phase3-shard-6
```

Create your branch from exactly `288b0d9a1d6683b91b447275a1474710d433ef95`. That commit is the Phase 2 head: the shared fact model, the waiting-rule bindings, the canonical fact store and the contact-field split are already in it. Fetch origin with prune first. Require a clean tracked worktree and no merge or rebase in progress. Do not push to `main`. Do not deploy. Do not run a migration. Do not change a feature flag. Do not create a payment.

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
docs/expungement-ai/flow-audit/state-reports/CT.md
docs/expungement-ai/flow-audit/state-reports/DE.md
docs/expungement-ai/flow-audit/state-reports/ID.md
docs/expungement-ai/flow-audit/state-reports/IL.md
docs/expungement-ai/flow-audit/state-reports/KY.md
docs/expungement-ai/flow-audit/state-reports/LA.md
docs/expungement-ai/flow-audit/state-reports/NH.md
docs/expungement-ai/flow-audit/state-reports/NJ.md
docs/expungement-ai/flow-audit/state-reports/VT.md
data/expungement-ai/flow-audit/flow-manifest.json
data/expungement-ai/flow-audit/question-inventory.json
data/expungement-ai/flow-audit/issue-register.json
AGENTS.md
```

## What you own

```text
src/lib/rcap-engine/compiled/profiles/CT-connecticut.json
src/lib/rcap-engine/compiled/profiles/DE-delaware.json
src/lib/rcap-engine/compiled/profiles/ID-idaho.json
src/lib/rcap-engine/compiled/profiles/IL-illinois.json
src/lib/rcap-engine/compiled/profiles/KY-kentucky.json
src/lib/rcap-engine/compiled/profiles/LA-louisiana.json
src/lib/rcap-engine/compiled/profiles/NH-new-hampshire.json
src/lib/rcap-engine/compiled/profiles/NJ-new-jersey.json
src/lib/rcap-engine/compiled/profiles/VT-vermont.json
src/lib/rcap/state-packs/connecticut/**
src/lib/rcap/state-packs/delaware/**
src/lib/rcap/state-packs/idaho/**
src/lib/rcap/state-packs/illinois/**
src/lib/rcap/state-packs/kentucky/**
src/lib/rcap/state-packs/louisiana/**
src/lib/rcap/state-packs/new-hampshire/**
src/lib/rcap/state-packs/new-jersey/**
src/lib/rcap/state-packs/vermont/**
docs/expungement-ai/flow-audit/state-reports/CT.md
docs/expungement-ai/flow-audit/state-reports/DE.md
docs/expungement-ai/flow-audit/state-reports/ID.md
docs/expungement-ai/flow-audit/state-reports/IL.md
docs/expungement-ai/flow-audit/state-reports/KY.md
docs/expungement-ai/flow-audit/state-reports/LA.md
docs/expungement-ai/flow-audit/state-reports/NH.md
docs/expungement-ai/flow-audit/state-reports/NJ.md
docs/expungement-ai/flow-audit/state-reports/VT.md
data/expungement-ai/flow-audit/shard-results/SHARD-6.json
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

**Held jurisdictions in your shard.** These are held deliberately. Preserve their current behaviour exactly and record what you find instead of resolving it:

- NJ — HELD_FOR_LEGAL_DECISION. The waiting rule for these routes cannot be settled from repository content. Choosing one would author legal content, so none is authored and none is guessed.

## Your expected scope

| Measure | Count |
| --- | --- |
| Jurisdictions | 9 |
| Flow rows | 119 |
| Question nodes | 455 |
| Consumer screens | 96 |
| Branch edges | 437 |
| Unresolved legal-review items | 7 |
| Workload weight | 1839 (17.36% of the programme) |

119 flow IDs are yours, listed in full in `data/expungement-ai/flow-audit/shard-assignment.json` under `shards[] where shardId == "SHARD-6"`.

## Your work, in order

1. **Re-confirm the audit's reading at this base.** Phase 2 changed which facts the flow renders, so counts recorded against the Phase 1 base may have moved for a legitimate reason. Re-run the manifest generators with `--check` and reconcile any difference against `data/expungement-ai/phase2/correction-allowlist.json` before you treat it as a defect. A difference the allowlist does not explain is a finding: stop and say so.

2. **Resolve the reachability question for your jurisdictions that still cannot reach packet-ready from rendered screens.**

   Already reopened by Phase 2, so do not re-investigate them: `CT`. Their intended route now returns a packet-ready terminal for the same participant the Phase 1B reconciliation used, and the proof is in `data/expungement-ai/phase2/remedy-context-replay-after.json`. Confirm that still holds at this base and record it.

   Still yours: `NJ`.

   Phase 2 corrected the shared part of this: facts the evaluator consumed before the packet decision are now asked, and the waiting-rule lookup no longer fails silently. What is left in these states is legal, not structural. For each, decide from the compiled profile and its source references which is true: the missing fact is a genuine legal precondition that must be asked before a packet, or the route is not available to a self-help participant in that state. The first is a lifecycle classification correction in that state's compiled profile. The second changes what the product claims and must be escalated, not answered.

3. **Work the release-critical state issues assigned to you.** P0 and P1 first; anything marked not release-critical is recorded in your shard result and left alone this phase.

- **UX-COUNTY-001** (P1, `COUNTY_DATA`) — RELEASE-CRITICAL
  - County is collected as free text with no state-aware selector and no controlled dataset behind it
  - expected: A state-aware county selector sourced from a controlled dataset, with a clearly-labelled manual entry fallback.
  - your jurisdictions: `ID`, `KY`
  - legal review required: no
- **UX-COURT-001** (P1, `COURT_DATA`) — RELEASE-CRITICAL
  - Court is collected as free text with no state-aware selector and no controlled dataset behind it
  - expected: A state-aware court selector sourced from a controlled dataset, with a clearly-labelled manual entry fallback.
  - your jurisdictions: `CT`, `DE`, `ID`, `IL`, `KY`, `LA`, `NH`, `NJ`, `VT`
  - legal review required: no
- **UX-STATELAW-001** (P1, `STATE_LEGAL_LOGIC`) — RELEASE-CRITICAL
  - 19 jurisdictions reach no packet-ready outcome when the audit answers only the screens the flow renders
  - expected: Every jurisdiction whose promotion manifest marks the Expungement.ai channel approved has at least one packet-ready outcome reachable from the rendered screens, or states plainly that it does not.
  - your jurisdictions: `CT`, `NJ`
  - legal review required: **yes — record the question, do not implement it**
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`) — not release-critical this phase
  - 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
  - expected: A question is either asked and consumed, or not published.
  - your jurisdictions: `CT`, `DE`, `ID`, `IL`, `KY`, `LA`, `NH`, `NJ`, `VT`
  - legal review required: no
- **UX-LEGAL-001** (P1, `REQUIRES_LEGAL_REVIEW`) — RELEASE-CRITICAL
  - Selecting a state exclusion category still returns packet-ready in some jurisdictions, and so does the shortest timing bucket
  - expected: Counsel confirms that the exclusion list and the waiting rule do not bind the non-conviction routes, or the rules are corrected.
  - your jurisdictions: `IL`, `LA`, `NH`
  - legal review required: **yes — record the question, do not implement it**

4. **Do not implement any global issue.** Every issue whose category begins `GLOBAL_` was Phase 2's. The ones Phase 2 did not build are in `data/expungement-ai/phase2/p2-p3-backlog.json` with the reason; add to that record rather than acting on it. State-specific findings still open across the programme: `UX-COUNTY-001`, `UX-COURT-001`, `UX-STATECFG-001`, `UX-STATELAW-001`, `UX-CONTENT-001`, `UX-LEGAL-001`.

5. **Write one state sign-off packet per jurisdiction** at `data/expungement-ai/flow-audit/shard-results/SHARD-6.json`, recording for each jurisdiction: what you changed, what you deliberately did not change, which legal questions remain open, and the before-and-after terminal for every flow ID of yours whose outcome moved.

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
EXPAI_FLOW_AUDIT_JURISDICTIONS=CT node tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs
EXPAI_FLOW_AUDIT_JURISDICTIONS=DE node tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs
EXPAI_FLOW_AUDIT_JURISDICTIONS=ID node tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs
EXPAI_FLOW_AUDIT_JURISDICTIONS=IL node tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs
EXPAI_FLOW_AUDIT_JURISDICTIONS=KY node tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs
EXPAI_FLOW_AUDIT_JURISDICTIONS=LA node tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs
EXPAI_FLOW_AUDIT_JURISDICTIONS=NH node tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs
EXPAI_FLOW_AUDIT_JURISDICTIONS=NJ node tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs
EXPAI_FLOW_AUDIT_JURISDICTIONS=VT node tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs
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
git diff --name-only 288b0d9a1d6683b91b447275a1474710d433ef95...HEAD
```

Every path in that output must match one of your allowed configuration paths.

## Commit and push

Commit your configuration changes, your state reports, and your shard result file. Push `claude/expai-phase3-shard-6`. Do not merge. Do not deploy. Do not open a pull request unless the integration captain asks for one.

## Final response

```text
PHASE 3 SHARD-6 COMPLETE
BASE SHA:
HEAD:
JURISDICTIONS:
FLOWS CHANGED:
QUESTIONS CHANGED:
TERMINALS MOVED:
EVALUATOR OUTPUT DIFFERENCES PROPOSED FOR THE ALLOWLIST:
LEGAL QUESTIONS STILL OPEN:
HELD JURISDICTIONS TOUCHED:
SHARED PATHS TOUCHED:
UNASSIGNED JURISDICTIONS TOUCHED:
ACCEPTANCE TESTS:
EXACT BLOCKERS:
```

`SHARED PATHS TOUCHED`, `HELD JURISDICTIONS TOUCHED` and `UNASSIGNED JURISDICTIONS TOUCHED` must all read `none`.
