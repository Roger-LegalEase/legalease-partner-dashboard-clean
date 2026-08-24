# EXPUNGEMENT.AI FLOW PROGRAM — PHASE 3 — SHARD-3 (session 03)

You are implementing state-specific configuration corrections for exactly 8 jurisdictions. Keep thinking enabled. Use high effort.

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
BASE_SHA = dd93579871962260b12918e54c44cf9bf1e81529
BRANCH   = claude/expai-phase3-shard-3
```

Create your branch from exactly `dd93579871962260b12918e54c44cf9bf1e81529`. Fetch origin with prune first. Require a clean tracked worktree and no merge or rebase in progress. Do not push to `main`. Do not deploy. Do not change a feature flag.

## Read before you change anything

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

Phase 2 owns the shared layer. These paths are not yours, and a diff touching one of them fails your shard:

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
```

You may not remove a state-specific legal rule because it is inconvenient. You may not delete a question because the audit could not find its purpose; governance rule 8 says those are flagged, not deleted. You may not change a packet family without owner approval.

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

### Your flow IDs

114 flow IDs are yours. They are listed in full in `data/expungement-ai/flow-audit/shard-assignment.json` under `shards[] where shardId == "SHARD-3"`. The first ten:

```text
EXPAI-IN-0887386bf3
EXPAI-IN-1732365a58
EXPAI-IN-2f4c29f8b9
EXPAI-IN-3838558386
EXPAI-IN-3df90de0d5
EXPAI-IN-5e66c66354
EXPAI-IN-d30de2ac45
EXPAI-IN-d4d3b12364
EXPAI-IN-ee1fb316f7
EXPAI-MA-0bf6c2500d
```

## Your work, in order

1. **Confirm the audit's reading for each of your jurisdictions.** Open the state report, re-run the manifest generators with `--check`, and confirm the flow and question counts still hold at your base SHA. If a count has moved, stop and say so.

2. **Resolve the reachability question for every jurisdiction of yours that cannot reach packet-ready from its rendered screens.**

   Yours: `IN`, `OK`, `SC`.

   For each, decide from the state's compiled profile and its source references which of two things is true: the missing fact is a genuine legal precondition that must be asked before a packet, or the route is not available to a self-help participant in that state. The first is a lifecycle classification correction in that state's compiled profile. The second is a promotion-manifest question you must escalate rather than answer, because it changes what the product claims.

3. **Work the state-specific issues assigned to your jurisdictions.**

   - **UX-COUNTY-001** (P1, `COUNTY_DATA`) — County is collected as free text with no state-aware selector and no controlled dataset behind it
     - jurisdictions in your shard: `IN`, `MS`
     - legal review required: no
   - **UX-COURT-001** (P1, `COURT_DATA`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
     - jurisdictions in your shard: `IN`, `MA`, `MN`, `MO`, `MS`, `OK`, `SC`, `VA`
     - legal review required: no
   - **UX-STATECFG-001** (P2, `STATE_CONFIGURATION`) — Route-specific facts are asked of every participant in the state before the route is known
     - jurisdictions in your shard: `IN`
     - legal review required: no
   - **UX-STATELAW-001** (P1, `STATE_LEGAL_LOGIC`) — 19 jurisdictions reach no packet-ready outcome when the audit answers only the screens the flow renders
     - jurisdictions in your shard: `IN`, `OK`, `SC`
     - legal review required: **yes — do not implement until counsel answers**
   - **UX-CONTENT-001** (P3, `CONTENT_ONLY`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
     - jurisdictions in your shard: `IN`, `MA`, `MN`, `MO`, `MS`, `OK`, `SC`, `VA`
     - legal review required: no
   - **UX-LEGAL-001** (P1, `REQUIRES_LEGAL_REVIEW`) — Selecting a state exclusion category still returns packet-ready in some jurisdictions, and so does the shortest timing bucket
     - jurisdictions in your shard: `MS`
     - legal review required: **yes — do not implement until counsel answers**

4. **Do not implement any global issue.** Every issue whose category begins `GLOBAL_` belongs to Phase 2. If a Phase 2 fix has not landed yet, note the dependency and move on.

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
```

Additionally:

```bash
npm run lint
npm run typecheck
git diff --check
```

And prove the negative that matters most — that you changed no shared code and no unassigned jurisdiction:

```bash
git diff --name-only dd93579871962260b12918e54c44cf9bf1e81529...HEAD
```

Every path in that output must match one of your allowed configuration paths. A path outside them fails the shard regardless of how good the change is.

## Commit and push

Commit your configuration changes, your state reports, and your shard result file. Push `claude/expai-phase3-shard-3`. Do not merge. Do not deploy. Do not open a pull request unless the integration captain asks for one.

## Final response

```text
PHASE 3 SHARD-3 COMPLETE
BASE SHA:
HEAD:
JURISDICTIONS:
FLOWS CHANGED:
QUESTIONS CHANGED:
TERMINALS MOVED:
LEGAL QUESTIONS STILL OPEN:
SHARED PATHS TOUCHED:
UNASSIGNED JURISDICTIONS TOUCHED:
ACCEPTANCE TESTS:
EXACT BLOCKERS:
```

`SHARED PATHS TOUCHED` and `UNASSIGNED JURISDICTIONS TOUCHED` must both read `none`.
