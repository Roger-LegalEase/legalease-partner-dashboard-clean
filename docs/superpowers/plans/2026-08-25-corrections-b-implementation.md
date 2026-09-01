# Corrections B Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close lane-D correction IDs 37–73 and the 27 assigned candidate-exact Phase-3-held flows with state-local fixes, focused regression evidence, exact captain patches for shared code, and one post-fix browser replay per assigned flow.

**Architecture:** A generated, immutable lane fixture snapshots only the 64 assigned records from correction authority `714f4d51f93461855b24c8644b6ea6ddad6d15f2`. A focused verifier checks assignment continuity, state-local rule integrity, route visibility, terminal/payment safety, and the three shared-integration contracts. State-local defects are fixed and committed here; shared evaluator and generated-ledger defects are represented as apply-ready diffs in `STATUS_D.md` for lane A.

**Tech Stack:** Node.js ESM, TypeScript runtime loader, JSON compiled RCAP profiles, the RCAP evaluator, Playwright, Git sparse worktrees.

---

## File map

- Create `scripts/expungement-ai/corrections-b/build-assignment-fixture.mjs`: deterministic extractor for the 37 proposal records and 27 flow records owned by lane D.
- Create `data/expungement-ai/corrections-b/assignment.json`: committed authority snapshot used by focused tests and browser replay.
- Create `scripts/verify-expungement-corrections-b.mjs`: one narrow verifier for counts, route identity, known state-local defects, fail-closed behavior, and shared-integration contracts.
- Modify `src/lib/rcap-engine/compiled/profiles/OK-oklahoma.json`: correct only `wait-03` and `wait-05`, whose own source text unambiguously states the operative durations.
- Modify `src/lib/rcap-engine/compiled/profiles/AR-arkansas.json`: remove the empty malformed `rule-45-and-2021-amendments-the-agent-must-confirm-the-current-` rule.
- Create `tests/e2e/expungement-ai/corrections-b/crawl-assigned-flows.mjs`: replay the 27 assigned flow fixtures against the real screening pages without checkout or persistence.
- Create `data/expungement-ai/corrections-b/browser-evidence/.gitkeep`: stable evidence directory; JSON results and screenshots remain lane evidence and are committed only if small and deterministic.
- Modify `/Users/rogerroman/LegalEase/legalease-sprint-control/STATUS_D.md`: one exact record per vague flow, deterministic ID dispositions, focused test results, browser results, and apply-ready lane-A patches.

### Task 1: Freeze the exact lane-D authority slice

**Files:**

- Create: `scripts/expungement-ai/corrections-b/build-assignment-fixture.mjs`
- Create: `data/expungement-ai/corrections-b/assignment.json`

- [ ] **Step 1: Add the extractor with closed assignment lists**

Create the script with these constants and extraction rules. The script must reject a missing, duplicate, extra, or non-held record before writing anything.

```js
#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const AUTHORITY_SHA = "714f4d51f93461855b24c8644b6ea6ddad6d15f2";
const output = path.join(root, "data/expungement-ai/corrections-b/assignment.json");

const deterministicRouteKeys = [
  "MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59",
  "ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1",
  "ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05",
  "NE:pardon-then-seal",
  "NH:marijuana-possession-annulment-under-rsa-651-5-b",
  "NM:cannabis-expungement",
  "NY:automatic-clean-slate-sealing-under-cpl-160-57",
  "NY:automatic-non-conviction-sealing-under-cpl-160-50-160-55",
  "OK:misdemeanor-deferred-dismissal-expungement",
  "OK:nonviolent-felony-deferred-dismissal-expungement",
  "OK:not-more-than-two-eligible-felony-convictions-expungement",
  "OK:other-eligible-misdemeanor-conviction-expungement",
  "PA:path-b-complete-acquittal-not-guilty-expungement",
  "PA:path-e-age-70-expungement",
  "PA:path-i-petition-for-limited-access",
  "SC:diversion-or-program-completion-expungement",
  "SC:human-trafficking-survivor-expungement",
  "SD:automatic-public-record-removal-for-petty-municipal-and-class-2-misdemeanor-cases",
  "SD:controlled-substance-deferred-disposition-route",
  "SD:diversion-expungement",
  "SD:juvenile-delinquency-sealing",
  "TN:pathway-1-free-non-conviction-expunction-under-tenn-code-40-32-101-a-40-32-106",
  "TN:pathway-2-diversion-expunction-under-40-15-105-40-35-313",
  "VA:petition-based-sealing",
  "VA:regime-1-expungement-available-now",
  "VT:adult-felony-conviction-sealing",
  "VT:adult-misdemeanor-conviction-sealing",
  "VT:dui-sealing",
  "VT:juvenile-sealing",
  "VT:non-conviction-sealing",
  "VT:offense-before-age-25-sealing-under-33-v-s-a-5119-g",
  "VT:young-adult-sealing-for-offenses-committed-at-ages-18-21",
  "WA:blake-drug-possession-vacation-and-refund-route",
  "WV:juvenile-record-relief",
  "WV:pardon-based-expungement",
  "WY:adult-non-conviction-expungement-w-s-7-13-1401",
  "WY:felony-conviction-expungement-w-s-7-13-1502"
];

const flowIds = [
  "EXPAI-AL-eb04cbb3ea", "EXPAI-AR-6dd3254b94",
  "EXPAI-CA-820d8cab8d", "EXPAI-CA-e7b9a19891", "EXPAI-CA-4b928ba8db",
  "EXPAI-CA-c36b60d263", "EXPAI-CA-751e637f56", "EXPAI-CA-09e5b02e34",
  "EXPAI-CA-38be3a849b", "EXPAI-CA-9c540ea67a", "EXPAI-HI-4ec05ba1c0",
  "EXPAI-IA-fce6d78f56", "EXPAI-IA-4799d9d30e", "EXPAI-IA-30be9180cf",
  "EXPAI-IL-7e07ca1afa", "EXPAI-IN-0887386bf3", "EXPAI-IN-d30de2ac45",
  "EXPAI-MD-d3001d6a11", "EXPAI-MI-e2a5ee07be", "EXPAI-NH-9bb9ca9a99",
  "EXPAI-OH-8f346f384a", "EXPAI-OK-194b56c5ed", "EXPAI-OK-81ed7d3182",
  "EXPAI-TX-7e7e6db808", "EXPAI-TX-adc17283a1", "EXPAI-TX-d0af1ca00d",
  "EXPAI-TX-ab2118ec94"
];

function authorityJson(file) {
  return JSON.parse(execFileSync("git", ["show", `${AUTHORITY_SHA}:${file}`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024
  }));
}

function unique(values, label) {
  if (new Set(values).size !== values.length) throw new Error(`${label} contains duplicates`);
}

unique(deterministicRouteKeys, "deterministicRouteKeys");
unique(flowIds, "flowIds");
if (deterministicRouteKeys.length !== 37 || flowIds.length !== 27) throw new Error("assignment count drift");

const waiting = authorityJson("data/expungement-ai/flow-audit/phase4-corrections/waiting-rule-authority.json");
const dispositions = authorityJson("data/expungement-ai/flow-audit/phase4-corrections/final-flow-dispositions.json");
const manifest = authorityJson("data/expungement-ai/flow-audit/flow-manifest.json");

const deterministic = deterministicRouteKeys.map((routeKey, offset) => {
  const authority = waiting.proposals?.perProposal?.[routeKey];
  if (!authority || authority.decision !== "HELD") throw new Error(`${routeKey} is not a held authority proposal`);
  return { correctionId: offset + 37, routeKey, authority };
});

const flows = flowIds.map((flowId) => {
  const disposition = dispositions.rows.find((row) => row.flowId === flowId);
  const flow = manifest.flows.find((row) => row.flowId === flowId);
  if (!disposition || !flow) throw new Error(`${flowId} missing from authority`);
  if (disposition.shardDisposition !== "HELD_FOR_CORRECTION") throw new Error(`${flowId} is not held for correction`);
  return {
    flowId,
    flowKey: disposition.flowKey,
    jurisdiction: disposition.jurisdiction,
    routeKey: `${disposition.jurisdiction}:${disposition.remedy}`,
    authorityTerminal: disposition.terminal,
    authorityPaymentMode: disposition.paymentMode,
    authoritySponsorshipMode: disposition.sponsorshipMode,
    publicRoute: flow.entryConditions.publicRoute,
    profileVersion: flow.entryConditions.profileVersion,
    fixture: flow.fixture,
    pathwayContextSteer: flow.branchingConditions?.pathwayContextSteer ?? null,
    packetFamily: flow.packetFamily
  };
});

const document = {
  schemaVersion: "expai-corrections-b-assignment/v1",
  authoritySha: AUTHORITY_SHA,
  generatedBy: "scripts/expungement-ai/corrections-b/build-assignment-fixture.mjs",
  deterministic,
  flows
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);
console.log(`wrote ${path.relative(root, output)}: ${deterministic.length} deterministic, ${flows.length} flows`);
```

- [ ] **Step 2: Generate the fixture**

Run: `node scripts/expungement-ai/corrections-b/build-assignment-fixture.mjs`

Expected: `wrote data/expungement-ai/corrections-b/assignment.json: 37 deterministic, 27 flows`

- [ ] **Step 3: Verify deterministic regeneration**

Run: `cp data/expungement-ai/corrections-b/assignment.json /tmp/corrections-b-assignment.before.json && node scripts/expungement-ai/corrections-b/build-assignment-fixture.mjs && cmp /tmp/corrections-b-assignment.before.json data/expungement-ai/corrections-b/assignment.json`

Expected: exit 0 and no output from `cmp`.

- [ ] **Step 4: Commit the authority slice**

```bash
git add scripts/expungement-ai/corrections-b/build-assignment-fixture.mjs data/expungement-ai/corrections-b/assignment.json
git commit -m "test: freeze corrections b authority slice"
```

### Task 2: Add the focused red-first verifier

**Files:**

- Create: `scripts/verify-expungement-corrections-b.mjs`
- Test: `scripts/verify-expungement-corrections-b.mjs`

- [ ] **Step 1: Write the verifier**

The verifier must load the committed fixture, all compiled profiles, the live evaluator, and product metadata. It must accumulate failures rather than stopping at the first one. Use these exact checks:

```js
#!/usr/bin/env node
process.env.RCAP_EVALUATOR_TODAY ||= "2026-08-25";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");
const assignment = JSON.parse(fs.readFileSync(path.join(root, "data/expungement-ai/corrections-b/assignment.json"), "utf8"));
const metadata = JSON.parse(fs.readFileSync(path.join(root, "data/expungement-ai/route-product-metadata.json"), "utf8"));
const profileDir = path.join(root, "src/lib/rcap-engine/compiled/profiles");
const profiles = new Map(fs.readdirSync(profileDir).filter((file) => file.endsWith(".json")).map((file) => {
  const profile = JSON.parse(fs.readFileSync(path.join(profileDir, file), "utf8"));
  return [profile.jurisdiction.code, profile];
}));
const failures = [];
let checks = 0;
const check = (condition, message) => { checks += 1; if (!condition) failures.push(message); };

check(assignment.authoritySha === "714f4d51f93461855b24c8644b6ea6ddad6d15f2", "authority SHA drifted");
check(assignment.deterministic.length === 37, "deterministic assignment is not 37");
check(assignment.flows.length === 27, "vague-flow assignment is not 27");
check(new Set(assignment.deterministic.map((row) => row.routeKey)).size === 37, "duplicate deterministic route");
check(new Set(assignment.flows.map((row) => row.flowId)).size === 27, "duplicate vague flow");

for (const row of assignment.deterministic) {
  const [jurisdiction, pathwayId] = row.routeKey.split(":", 2);
  const profile = profiles.get(jurisdiction);
  check(Boolean(profile), `${row.correctionId} ${row.routeKey}: profile missing`);
  check(profile?.pathways?.some((pathway) => pathway.id === pathwayId), `${row.correctionId} ${row.routeKey}: pathway missing`);
}

const ar = profiles.get("AR");
check(!ar.orderedDecisionRules.some((rule) => rule.id === "rule-45-and-2021-amendments-the-agent-must-confirm-the-current-"), "AR malformed empty rule still exists");

const ok = profiles.get("OK");
const okWait = (id) => ok.waitingPeriodRules.find((rule) => rule.id === id)?.duration;
check(okWait("wait-03")?.value === 10 && okWait("wait-03")?.unit === "years", "OK wait-03 is not the source-stated ten years");
check(okWait("wait-05")?.value === 5 && okWait("wait-05")?.unit === "years", "OK wait-05 uses the seven-year lookback instead of the five-year filing wait");

const mdKey = "MD:pardoned-conviction-expungement-under-crim-proc-10-105-a-8";
check(Boolean(metadata.routes?.[mdKey] ?? metadata[mdKey]), "MD pardon route lacks explicit product metadata");

const caFlow = assignment.flows.find((row) => row.routeKey === "CA:tool-1-dismissal-set-aside");
if (caFlow) {
  const profile = profiles.get("CA");
  const baseAnswers = { ...caFlow.fixture.answers, possible_pathway_context: "Tool 1 — dismissal / set-aside (Penal Code § 1203.4 / CR-180)" };
  const baseline = evaluateScreening({ jurisdiction: "CA", profileVersion: profile.profileVersion, matterId: "corrections-b-ca-baseline", answers: baseAnswers });
  const mutated = evaluateScreening({ jurisdiction: "CA", profileVersion: profile.profileVersion, matterId: "corrections-b-ca-unrelated", answers: { ...baseAnswers, ca_prop64_branch: "unknown" } });
  check(mutated.resultCode === baseline.resultCode, `CA unrelated Prop 64 ambiguity changed ${baseline.resultCode} to ${mutated.resultCode}`);
  check(mutated.paymentAllowed === baseline.paymentAllowed, "CA unrelated Prop 64 ambiguity changed payment authority");
}

const mustRemainClosed = new Set([
  "AL:non-conviction-expungement-under-ala-code-15-27-1-a-and-15-27-2-a",
  "CA:tool-2-automatic-relief", "CA:tool-5-proposition-64-marijuana-relief",
  "IA:minor-prostitution-7251", "IA:public-intoxication-12346", "IA:underage-alcohol-12347",
  "IL:clean-slate-automatic-sealing", "IN:conviction-expungement-with-records-marked-expunged",
  "MI:automatic-clean-slate-set-aside-under-mcl-780-621g",
  "NH:out-of-state-federal-or-military-record-guidance", "OH:juvenile-sealing-and-expungement",
  "TX:automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07",
  "TX:first-offense-dwi-nondisclosure"
]);

for (const flow of assignment.flows) {
  const profile = profiles.get(flow.jurisdiction);
  let evaluation;
  try {
    evaluation = evaluateScreening({
      jurisdiction: flow.jurisdiction,
      profileVersion: profile.profileVersion,
      matterId: `corrections-b-${flow.flowId}`,
      answers: { ...flow.fixture.answers, ...(flow.pathwayContextSteer ? { possible_pathway_context: flow.pathwayContextSteer } : {}) }
    });
  } catch (error) {
    failures.push(`${flow.flowId}: evaluator threw ${error?.message ?? error}`);
    continue;
  }
  flow.actual = { resultCode: evaluation.resultCode, pathwayId: evaluation.pathwayId ?? null, paymentAllowed: evaluation.paymentAllowed };
  if (mustRemainClosed.has(flow.routeKey)) check(evaluation.paymentAllowed === false, `${flow.flowId} ${flow.routeKey}: unresolved/automatic route opened payment`);
}

if (failures.length) {
  console.error(`verify-expungement-corrections-b FAILED: ${failures.length}/${checks} checks red`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`verify-expungement-corrections-b: OK (${checks} checks; 37 deterministic; 27 flows)`);
```

- [ ] **Step 2: Run the verifier and confirm the intended red baseline**

Run: `node scripts/verify-expungement-corrections-b.mjs`

Expected failures: Arkansas malformed rule, Oklahoma `wait-03`, Oklahoma `wait-05`, Maryland metadata, and California unrelated ambiguity. Any additional unsafe payment or missing-route failure is a new root cause and must be added to `STATUS_D.md` before continuing.

- [ ] **Step 3: Commit the failing focused test**

```bash
git add scripts/verify-expungement-corrections-b.mjs
git commit -m "test: reproduce corrections b defects"
```

### Task 3: Correct Oklahoma's two source-extraction defects

**Files:**

- Modify: `src/lib/rcap-engine/compiled/profiles/OK-oklahoma.json`
- Test: `scripts/verify-expungement-corrections-b.mjs`

- [ ] **Step 1: Change `wait-03` from a null duration to the duration stated in its own rule text**

Replace:

```json
"duration": null
```

in `wait-03` with:

```json
"duration": {
  "value": 10,
  "unit": "years",
  "raw": "10 years"
}
```

- [ ] **Step 2: Change `wait-05` from the seven-year lookback to the five-year filing wait stated in the same rule**

Replace its duration with:

```json
"duration": {
  "value": 5,
  "unit": "years",
  "raw": "5 years"
}
```

- [ ] **Step 3: Run the focused verifier**

Run: `node scripts/verify-expungement-corrections-b.mjs`

Expected: the two `OK` failures disappear; Arkansas, Maryland, and California remain red.

- [ ] **Step 4: Run the narrow existing provability verifier**

Run: `node scripts/verify-rcap-evaluator-all51-provability.mjs`

Expected: exit 0 and `verify-rcap-evaluator-all51-provability: OK`.

- [ ] **Step 5: Commit Oklahoma**

```bash
git add src/lib/rcap-engine/compiled/profiles/OK-oklahoma.json scripts/verify-expungement-corrections-b.mjs
git commit -m "fix: correct Oklahoma filing waits"
```

### Task 4: Remove Arkansas's empty phantom decision rule

**Files:**

- Modify: `src/lib/rcap-engine/compiled/profiles/AR-arkansas.json`
- Test: `scripts/verify-expungement-corrections-b.mjs`

- [ ] **Step 1: Confirm the rule is structurally empty**

Run: `node -e 'const p=require("./src/lib/rcap-engine/compiled/profiles/AR-arkansas.json"); console.log(JSON.stringify(p.orderedDecisionRules.find(r=>r.id==="rule-45-and-2021-amendments-the-agent-must-confirm-the-current-"),null,2))'`

Expected: the object has no executable predicates/outcome and only incorrectly captures `situation-c-felony-convictions`.

- [ ] **Step 2: Delete exactly that object from `orderedDecisionRules`**

Do not change the Arkansas pathway, source sections, packet plan, ratification, or any neighboring executable rule.

- [ ] **Step 3: Run the focused verifier**

Run: `node scripts/verify-expungement-corrections-b.mjs`

Expected: the Arkansas failure disappears; Maryland and California remain red.

- [ ] **Step 4: Run the ratified-route verifier**

Run: `node scripts/verify-rcap-ratified-route-payment.mjs`

Expected: exit 0 and `verify-rcap-ratified-route-payment: OK`.

- [ ] **Step 5: Commit Arkansas**

```bash
git add src/lib/rcap-engine/compiled/profiles/AR-arkansas.json scripts/verify-expungement-corrections-b.mjs
git commit -m "fix: remove Arkansas phantom decision rule"
```

### Task 5: Prove already-correct and intentionally fail-closed assignments

**Files:**

- Modify: `scripts/verify-expungement-corrections-b.mjs`
- Modify: `/Users/rogerroman/LegalEase/legalease-sprint-control/STATUS_D.md`

- [ ] **Step 1: Run the existing route-specific proofs**

Run these commands individually:

```bash
node scripts/verify-expungement-plain-language-values.mjs
node scripts/verify-rcap-md-pardon-pathway.mjs
node scripts/verify-rcap-hawaii-admin-application.mjs
node scripts/verify-rcap-no-checkout-on-automatic-routes.mjs
```

Expected: all four exit 0. Record the exact check counts/output summaries in `STATUS_D.md`.

- [ ] **Step 2: Add explicit nonpayment assertions for every deterministic route without current payment authority**

Add this exact allowlist to the verifier; it is the intersection of the 37 assigned routes and the current sprint-base `RATIFIED_DEPLOYABLE_ROUTES` authority:

```js
const assignedRatifiedPaymentRoutes = new Set([
  "MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59",
  "ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1",
  "SC:diversion-or-program-completion-expungement",
  "TN:pathway-1-free-non-conviction-expunction-under-tenn-code-40-32-101-a-40-32-106",
  "VA:petition-based-sealing",
  "VA:regime-1-expungement-available-now",
  "VT:dui-sealing",
  "WY:felony-conviction-expungement-w-s-7-13-1502"
]);
const evaluatorSource = fs.readFileSync(path.join(root, "src/lib/rcap-engine/evaluator.ts"), "utf8");
const ratifiedBlock = evaluatorSource.match(/RATIFIED_DEPLOYABLE_ROUTES = new Set\(\[([\s\S]*?)\]\);/)?.[1];
check(Boolean(ratifiedBlock), "could not parse RATIFIED_DEPLOYABLE_ROUTES");
for (const row of assignment.deterministic) {
  const listedAsRatified = ratifiedBlock?.includes(`"${row.routeKey}"`) === true;
  if (assignedRatifiedPaymentRoutes.has(row.routeKey)) {
    check(listedAsRatified, `${row.correctionId} ${row.routeKey}: approved route lost ratified payment authority`);
  } else {
    check(!listedAsRatified, `${row.correctionId} ${row.routeKey}: held route unexpectedly entered ratified payment authority`);
  }
}
```

The eight named routes still require their existing route-specific runtime proof before payment can open; membership alone never opens checkout. Every other assigned deterministic route remains visible and non-ratified until the missing legal/modeling fact is approved.

- [ ] **Step 3: Re-run the focused verifier**

Run: `node scripts/verify-expungement-corrections-b.mjs`

Expected: only the two captain-owned failures remain: California route-scoped ambiguity and Maryland generated metadata.

- [ ] **Step 4: Commit the closed-route coverage**

```bash
git add scripts/verify-expungement-corrections-b.mjs
git commit -m "test: lock corrections b fail closed routes"
```

### Task 6: Produce exact lane-A patches for shared integration

**Files:**

- Modify: `/Users/rogerroman/LegalEase/legalease-sprint-control/STATUS_D.md`
- Captain-owned target: `src/lib/rcap-engine/route-fact-relevance.ts`
- Captain-owned target: `src/lib/rcap-engine/evaluator.ts`
- Captain-owned generated targets: `data/expungement-ai/route-product-metadata.json` and the inventory artifacts regenerated by `scripts/audit-petition-route-inventory.mjs`

- [ ] **Step 1: Record the California evaluator patch**

The apply-ready patch in `STATUS_D.md` must:

1. add `route-fact-relevance.ts` with `UNIVERSAL_PREPAY_FACT_IDS`, `ROUTE_ESCALATION_FACT_IDS`, `pathwayRelevantFactIds()`, and `relevantFactIds()` from the verified correction candidate;
2. import `relevantFactIds` in `evaluator.ts`;
3. call `selectPathway(profile, answers)` before ambiguity evaluation;
4. change `ambiguityReason` to accept `profile` and `selectedPathway` and filter rendered prepayment questions through `relevantFactIds(profile, selectedPathway)`;
5. preserve the selected pathway in a `needs_review` result;
6. include the exact focused mutation command `node scripts/verify-expungement-corrections-b.mjs`.

The patch must not change payment, packet, route ratification, or legal timing.

- [ ] **Step 2: Record the Maryland generated-metadata action**

Record this exact captain action:

```bash
node scripts/audit-petition-route-inventory.mjs
node scripts/verify-rcap-no-generic-fallbacks.mjs
```

Expected after regeneration: the explicit key `MD:pardoned-conviction-expungement-under-crim-proc-10-105-a-8` is present, classified as the existing court petition route, the inventory count is 325, and the no-generic-fallback verifier exits 0. Lane D must not commit the captain-owned generated ledger files.

- [ ] **Step 3: Include focused evidence and ownership labels**

Each shared patch record must say `owner: A`, `producer: D`, list exact target files, list the currently failing assertion, and list the expected passing assertion. Mark neither correction complete until lane A reports application or patch-equivalent integration.

### Task 7: Replay the 27 real browser paths once

**Files:**

- Create: `tests/e2e/expungement-ai/corrections-b/crawl-assigned-flows.mjs`
- Create: `data/expungement-ai/corrections-b/browser-evidence/.gitkeep`
- Test: `tests/e2e/expungement-ai/corrections-b/crawl-assigned-flows.mjs`

- [ ] **Step 1: Add a closed-scope Playwright crawler**

Adapt the authority crawler at `714f4d51:tests/e2e/expungement-ai/flow-audit/crawl-screening-flows.mjs` with these exact constraints:

```js
const assignment = JSON.parse(fs.readFileSync(path.join(rootDir, "data/expungement-ai/corrections-b/assignment.json"), "utf8"));
const plan = assignment.flows;
if (plan.length !== 27 || new Set(plan.map((flow) => flow.flowId)).size !== 27) {
  throw new Error("Corrections-B browser plan must contain exactly 27 unique flows");
}
```

Use each row's `publicRoute`, `fixture.answers`, and `pathwayContextSteer`. Keep the authority crawler's synthetic-data guard, nonproduction-origin guard, no-auth/no-save/no-checkout rule, question-ID capture, exact selected-value capture, console/network capture, and `data-result-code` terminal capture. Use one viewport per candidate row; the two CA payment-mode variants still run separately because their flow IDs are distinct.

Write a single result file under `data/expungement-ai/corrections-b/browser-evidence/results.json` with:

```js
{
  schemaVersion: "expai-corrections-b-browser/v1",
  baseUrl: new URL(baseUrl).origin,
  runAt: new Date().toISOString(),
  flowCount: results.length,
  results
}
```

The script exits nonzero if a flow does not land on its requested pathway, if an unresolved/automatic route exposes checkout, if a product console error occurs, or if fewer than 27 results are recorded.

- [ ] **Step 2: Start the local application**

Run: `npm run dev -- --port 3210`

Expected: the app listens on `http://127.0.0.1:3210` or `http://localhost:3210`.

- [ ] **Step 3: Run the browser shard once after state-local fixes**

Run:

```bash
EXPAI_CORRECTIONS_B_BASE_URL=http://127.0.0.1:3210 \
EXPAI_CORRECTIONS_B_EVIDENCE_DIR=data/expungement-ai/corrections-b/browser-evidence \
node tests/e2e/expungement-ai/corrections-b/crawl-assigned-flows.mjs
```

Expected: 27/27 flows replayed. Shared-patch-dependent CA/MD rows may remain explicitly `captain_patch_pending`, but they must preserve payment safety. No flow may silently disappear or be reclassified as passed by hiding its route.

- [ ] **Step 4: Commit the browser harness and bounded evidence**

```bash
git add tests/e2e/expungement-ai/corrections-b/crawl-assigned-flows.mjs data/expungement-ai/corrections-b/browser-evidence/.gitkeep
git commit -m "test: replay corrections b browser flows"
```

Do not commit volatile screenshots unless `STATUS_D.md` needs one to prove an exact product defect; link their local absolute paths instead.

### Task 8: Final verification, status, push, and handoff

**Files:**

- Modify: `/Users/rogerroman/LegalEase/legalease-sprint-control/STATUS_D.md`

- [ ] **Step 1: Run the complete narrow lane-D verification set**

```bash
node scripts/expungement-ai/corrections-b/build-assignment-fixture.mjs
git diff --exit-code -- data/expungement-ai/corrections-b/assignment.json
node scripts/verify-expungement-corrections-b.mjs
node scripts/verify-expungement-plain-language-values.mjs
node scripts/verify-rcap-ratified-route-payment.mjs
node scripts/verify-rcap-evaluator-all51-provability.mjs
node scripts/verify-rcap-md-pardon-pathway.mjs
node scripts/verify-rcap-hawaii-admin-application.mjs
node scripts/verify-rcap-no-checkout-on-automatic-routes.mjs
git diff --check
```

Expected: every owned test passes. `verify-rcap-no-generic-fallbacks.mjs` remains a documented captain-patch check until lane A regenerates the Maryland metadata.

- [ ] **Step 2: Complete `STATUS_D.md`**

The status must contain:

- the exact branch/base/authority SHAs;
- commits produced by this plan;
- a row for each correction ID 37–73 with classification, route, owned fix or existing proof, test, and result;
- a row for each of the 27 flow IDs with expected/actual terminal, payment, sponsorship, packet family, precise root cause, correction classification, focused test, and browser result;
- the two apply-ready lane-A patches and their remaining red assertions;
- any legal hold kept fail-closed without invented rules;
- the browser result count and evidence path.

- [ ] **Step 3: Commit any final owned documentation**

```bash
git status --short
git add docs/superpowers/plans/2026-08-25-corrections-b-implementation.md
git commit -m "docs: record corrections b execution plan"
```

Do not stage the control worktree's `STATUS_D.md` in the product repository.

- [ ] **Step 4: Push the lane branch**

Run: `git push origin sprint/20260825-corrections-b`

Expected: the remote branch advances to the final owned commit. Do not push to `main`.

- [ ] **Step 5: Report the truthful terminal state**

Use `CORRECTIONS B COMPLETE` only if all owned changes, 64 records, and 27 browser replays are complete and lane A has either applied or accepted the two shared patches. Otherwise report `CORRECTIONS B READY FOR CAPTAIN PATCH` with the exact remaining shared assertions and no completion claim.
