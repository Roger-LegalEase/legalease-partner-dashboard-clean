# Lane G Fresh Review Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a SHA-parameterized, read-only lane-G harness that generates the deterministic 356-flow QA matrix, six non-overlapping browser shards, and the Colorado/Mississippi/Wisconsin stress set.

**Architecture:** A pure ESM library joins candidate manifest and disposition JSON, derives QA expectations, and validates invariants. A thin CLI reads exact Git objects and writes or checks four QA-local artifacts. Node assertion tests drive the pure library before the CLI is added.

**Tech Stack:** Node.js ESM, built-in `assert`, `crypto`, `child_process`, `fs`, and Git object reads.

---

### Task 1: Establish the pure builder contract

**Files:**

- Create: `scripts/expungement-ai/qa/test-fresh-review-matrix.mjs`
- Create: `scripts/expungement-ai/qa/fresh-review-matrix-lib.mjs`

- [ ] **Step 1: Write the first failing builder test**

Create a synthetic manifest/disposition pair and call the desired API:

```js
import assert from "node:assert/strict";
import {
  buildFreshReviewArtifacts,
  DESKTOP_VIEWPORT,
  MOBILE_VIEWPORT
} from "./fresh-review-matrix-lib.mjs";

const flow = {
  flowId: "EXPAI-CO-test",
  flowKey: "CO::automatic-test::guidance_only::dtc_no_payment",
  jurisdiction: "CO",
  jurisdictionName: "Colorado",
  remedy: {
    pathwayId: "automatic-test",
    pathwayLabel: "Automatic test",
    routeType: "automatic",
    automatic: true,
    filingRequired: false
  },
  entryConditions: { publicRoute: "/expungement-ai/screening/colorado" },
  screeningFacts: ["case_outcome"],
  screeningScreenIds: ["case_outcome"],
  packetFacts: [],
  terminalOutcome: {
    resultCode: "guidance_only",
    effectiveTerminal: "guidance_only"
  },
  packetFamily: {
    mode: "automatic_relief_verification_and_guidance",
    packetFamilies: [],
    packetSets: [],
    registryTracks: []
  },
  forms: {
    sourceFormIds: [],
    officialFormIdsNamed: [],
    officialFormIdsHeldInThisRepository: []
  },
  paymentMode: "dtc_no_payment",
  sponsorshipMode: "none_direct_to_consumer",
  fixture: {
    answers: { case_outcome: "Dismissed" },
    reproducesTerminal: true,
    replayResultCode: "guidance_only"
  }
};

const disposition = {
  flowId: flow.flowId,
  flowKey: flow.flowKey,
  jurisdiction: "CO",
  remedy: "automatic-test",
  terminal: "guidance_only",
  paymentMode: "dtc_no_payment",
  sponsorshipMode: "none_direct_to_consumer",
  disposition: "READY_FOR_HOSTED_ACCEPTANCE",
  reason: "ready",
  shardDisposition: null
};

const built = buildFreshReviewArtifacts({
  candidateSha: "a".repeat(40),
  manifest: { flows: [flow] },
  dispositions: { rows: [disposition] },
  waitingRuleAuthority: { proposals: { perProposal: {} } },
  expectedRealFlowCount: 1,
  browserShardStateGroups: [["CO"]]
});

assert.equal(built.matrix.rows.length, 1);
assert.equal(built.matrix.rows[0].expectedTerminal.effective, "guidance_only");
assert.deepEqual(built.matrix.rows[0].desktopFixture.viewport, DESKTOP_VIEWPORT);
assert.deepEqual(built.matrix.rows[0].mobileFixture.viewport, MOBILE_VIEWPORT);
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node scripts/expungement-ai/qa/test-fresh-review-matrix.mjs
```

Expected: exit 1 because `fresh-review-matrix-lib.mjs` does not exist.

- [ ] **Step 3: Implement the minimal pure builder**

Export these constants and function:

```js
export const DESKTOP_VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
export const MOBILE_VIEWPORT = Object.freeze({ width: 390, height: 844 });

export function buildFreshReviewArtifacts({
  candidateSha,
  manifest,
  dispositions,
  waitingRuleAuthority,
  expectedRealFlowCount = 356,
  browserShardStateGroups
}) {
  if (!Array.isArray(manifest?.flows) || !Array.isArray(dispositions?.rows)) {
    throw new Error("manifest flows and disposition rows are required");
  }
  if (dispositions.rows.length !== expectedRealFlowCount) {
    throw new Error(`expected ${expectedRealFlowCount} real flows; found ${dispositions.rows.length}`);
  }
  const manifestById = new Map(manifest.flows.map((flow) => [flow.flowId, flow]));
  const rows = dispositions.rows
    .map((disposition) => {
      const flow = manifestById.get(disposition.flowId);
      if (!flow) throw new Error(`missing manifest flow ${disposition.flowId}`);
      const fixture = (device, viewport) => ({
        fixtureId: `${flow.flowId}::${device}`,
        device,
        viewport,
        answers: flow.fixture.answers,
        reproducesTerminal: flow.fixture.reproducesTerminal,
        replayResultCode: flow.fixture.replayResultCode
      });
      return {
        flowId: flow.flowId,
        flowKey: flow.flowKey,
        state: flow.jurisdiction,
        remedy: {
          id: flow.remedy.pathwayId,
          label: flow.remedy.pathwayLabel
        },
        expectedTerminal: {
          evaluator: flow.terminalOutcome.resultCode,
          effective: flow.terminalOutcome.effectiveTerminal
        },
        desktopFixture: fixture("desktop", DESKTOP_VIEWPORT),
        mobileFixture: fixture("mobile", MOBILE_VIEWPORT)
      };
    })
    .sort((left, right) => left.flowId.localeCompare(right.flowId));
  const firstShard = {
    shardId: "BROWSER-SHARD-1",
    stateList: [...browserShardStateGroups[0]].sort(),
    flows: rows.map((row) => ({
      flowId: row.flowId,
      desktopFixtureId: row.desktopFixture.fixtureId,
      mobileFixtureId: row.mobileFixture.fixtureId
    }))
  };
  return {
    matrix: { schemaVersion: "expai-fresh-review-matrix/v1", candidateSha, rows },
    browserShards: { schemaVersion: "expai-browser-shards/v1", candidateSha, shards: [firstShard] },
    stressSet: { schemaVersion: "expai-three-state-stress-set/v1", candidateSha, states: [] },
    summary: { schemaVersion: "expai-fresh-review-build-summary/v1", candidateSha, realFlows: rows.length }
  };
}
```

The first implementation only needs to satisfy the single-row positive case while keeping the public signature final.

- [ ] **Step 4: Run the test and verify GREEN**

Run the same command. Expected: `fresh-review-matrix tests passed (1)`.

- [ ] **Step 5: Commit the first red-green cycle**

```bash
git add --sparse scripts/expungement-ai/qa/test-fresh-review-matrix.mjs scripts/expungement-ai/qa/fresh-review-matrix-lib.mjs
git commit -m "test(qa): establish fresh review matrix contract"
```

### Task 2: Complete matrix, ownership, shard, and failure invariants

**Files:**

- Modify: `scripts/expungement-ai/qa/test-fresh-review-matrix.mjs`
- Modify: `scripts/expungement-ai/qa/fresh-review-matrix-lib.mjs`

- [ ] **Step 1: Add failing packet-treatment and owner tests**

Add table-driven cases asserting:

```js
[
  ["HELD_FOR_LEGAL_DECISION", null, "B"],
  ["HELD_FOR_ENVIRONMENT", null, "F"],
  ["HELD_FOR_CORRECTION", "C_ROUTE", "C"],
  ["HELD_FOR_CORRECTION", "D_ROUTE", "D"],
  ["HELD_FOR_CORRECTION", "PHASE3", "D"],
  ["HELD_FOR_CORRECTION", "SHARED", "A"],
  ["READY_FOR_HOSTED_ACCEPTANCE", null, "A"]
]
```

Also assert that automatic/guidance/referral/no-filing rows carry `packetTreatment.kind === "no_packet"` and prohibit checkout, credit, and render jobs, while participant-filed packet routes preserve packet families, packet sets, registry tracks, and forms.

- [ ] **Step 2: Run and verify RED**

Expected: assertions fail because owner precedence and complete packet treatment are not implemented.

- [ ] **Step 3: Implement ownership and treatment**

Derive the correction split by lexicographically sorting the keys where `waitingRuleAuthority.proposals.perProposal[key].decision === "HELD"`; indices 0–35 map to C and the remainder to D. A Phase-3-held disposition maps to D. Other correction-held shared issues map to A.

Use this owner precedence:

```text
HELD_FOR_LEGAL_DECISION -> B
HELD_FOR_ENVIRONMENT -> F
HELD_FOR_CORRECTION + group C proposal -> C
HELD_FOR_CORRECTION + group D proposal or Phase-3 hold -> D
other HELD_FOR_CORRECTION -> A
READY_FOR_HOSTED_ACCEPTANCE -> A
```

Add these exact helpers and use them while creating every matrix row:

```js
function correctionOwnership(waitingRuleAuthority) {
  const held = Object.entries(waitingRuleAuthority?.proposals?.perProposal ?? {})
    .filter(([, proposal]) => proposal.decision === "HELD")
    .map(([routeKey]) => routeKey)
    .sort();
  return {
    c: new Set(held.slice(0, 36)),
    d: new Set(held.slice(36))
  };
}

function deriveOwner(disposition, owners) {
  if (disposition.disposition === "HELD_FOR_LEGAL_DECISION") {
    return { lane: "B", basis: "approved_legal_decision_implementation" };
  }
  if (disposition.disposition === "HELD_FOR_ENVIRONMENT") {
    return { lane: "F", basis: "hosted_environment_acceptance" };
  }
  if (disposition.disposition !== "HELD_FOR_CORRECTION") {
    return { lane: "A", basis: "release_captain_integrated_behavior" };
  }
  const routeKey = `${disposition.jurisdiction}:${disposition.remedy}`;
  if (owners.c.has(routeKey)) return { lane: "C", basis: "correction_ids_1_36" };
  if (owners.d.has(routeKey)) return { lane: "D", basis: "correction_ids_37_73" };
  if (disposition.shardDisposition === "HELD_FOR_CORRECTION") {
    return { lane: "D", basis: "candidate_exact_phase3_held_flow" };
  }
  return { lane: "A", basis: "shared_or_unassigned_correction" };
}

function derivePacketTreatment(flow) {
  const effective = flow.terminalOutcome?.effectiveTerminal ?? flow.terminalOutcome?.resultCode;
  const packetExpected = flow.remedy?.filingRequired === true
    && effective === "packet_ready_with_caution";
  return {
    kind: packetExpected ? "packet_expected" : "no_packet",
    checkoutAllowed: packetExpected && flow.paymentMode === "dtc_paid",
    packetCreditAllowed: packetExpected,
    renderJobAllowed: packetExpected,
    familyMode: flow.packetFamily?.mode ?? null,
    packetFamilies: [...(flow.packetFamily?.packetFamilies ?? [])],
    packetSets: [...(flow.packetFamily?.packetSets ?? [])],
    registryTracks: [...(flow.packetFamily?.registryTracks ?? [])],
    forms: {
      sourceFormIds: [...(flow.forms?.sourceFormIds ?? [])],
      officialFormIdsNamed: [...(flow.forms?.officialFormIdsNamed ?? [])],
      officialFormIdsHeldInThisRepository: [...(flow.forms?.officialFormIdsHeldInThisRepository ?? [])]
    }
  };
}
```

- [ ] **Step 4: Add failing denominator and shard tests**

Assert failures for duplicate manifest IDs, duplicate disposition IDs, unmatched joins, wrong denominator, state assigned to two shards, state missing from all shards, and flow overlap. Assert that shuffled inputs produce byte-identical stable JSON.

- [ ] **Step 5: Run and verify RED**

Expected: one or more invariant assertions fail.

- [ ] **Step 6: Implement all validations and stable ordering**

Sort matrix rows by `flowId`, shard state lists lexicographically, and shard flow entries by `flowId`. Build the stress set in state order `CO`, `MS`, `WI`. Use `JSON.stringify(value, null, 2) + "\n"` as the canonical serializer.

Use these exact validation helpers:

```js
function uniqueIndex(rows, label) {
  const index = new Map();
  for (const row of rows) {
    if (!row?.flowId) throw new Error(`${label} row is missing flowId`);
    if (index.has(row.flowId)) throw new Error(`duplicate ${label} flowId ${row.flowId}`);
    index.set(row.flowId, row);
  }
  return index;
}

function validateShardGroups(rows, groups) {
  const stateToShard = new Map();
  groups.forEach((states, shardIndex) => {
    for (const state of states) {
      if (stateToShard.has(state)) throw new Error(`state ${state} appears in multiple browser shards`);
      stateToShard.set(state, shardIndex);
    }
  });
  for (const row of rows) {
    if (!stateToShard.has(row.state)) throw new Error(`state ${row.state} has no browser shard`);
  }
  return stateToShard;
}

export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
```

- [ ] **Step 7: Run and verify GREEN**

Expected: all pure-library tests pass with a printed assertion count.

- [ ] **Step 8: Commit the completed pure builder**

```bash
git add --sparse scripts/expungement-ai/qa/test-fresh-review-matrix.mjs scripts/expungement-ai/qa/fresh-review-matrix-lib.mjs
git commit -m "feat(qa): build deterministic fresh review artifacts"
```

### Task 3: Add the Git-object CLI and real-authority contract

**Files:**

- Create: `scripts/expungement-ai/qa/build-fresh-review-matrix.mjs`
- Modify: `scripts/expungement-ai/qa/test-fresh-review-matrix.mjs`

- [ ] **Step 1: Add failing CLI tests**

Spawn the CLI against a temporary output directory and assert:

- missing `--candidate-sha` exits nonzero;
- an invalid ref exits nonzero;
- authority `714f4d51f93461855b24c8644b6ea6ddad6d15f2` writes four files;
- `--check` passes on unchanged output;
- `--check` fails after one output byte changes.

- [ ] **Step 2: Run and verify RED**

Expected: CLI cases fail because the file does not exist.

- [ ] **Step 3: Implement the CLI**

Use `execFileSync("git", ["rev-parse", "--verify", `${candidateSha}^{commit}`])` and `execFileSync("git", ["show", `${candidateSha}:${path}`], { maxBuffer: 64 * 1024 * 1024 })`. Validate the requested SHA with `/^[0-9a-f]{40}$/`.

Write these files only after the builder returns:

```js
const outputs = new Map([
  ["CURRENT_MATRIX.json", artifacts.matrix],
  ["BROWSER_SHARDS.json", artifacts.browserShards],
  ["THREE_STATE_STRESS_SET.json", artifacts.stressSet],
  ["BUILD_SUMMARY.json", artifacts.summary]
]);
```

Default output directory:

```text
data/expungement-ai/qa/fresh-review
```

Use this exact argument and write/check structure:

```js
const args = process.argv.slice(2);
const valueAfter = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] ?? null;
};
const candidateSha = valueAfter("--candidate-sha");
const check = args.includes("--check");
const outputDir = path.resolve(rootDir, valueAfter("--output-dir")
  ?? "data/expungement-ai/qa/fresh-review");

if (!candidateSha || !/^[0-9a-f]{40}$/.test(candidateSha)) {
  throw new Error("--candidate-sha must be an exact 40-character lowercase SHA");
}
const resolved = execFileSync("git", ["rev-parse", "--verify", `${candidateSha}^{commit}`], {
  cwd: rootDir,
  encoding: "utf8"
}).trim();
if (resolved !== candidateSha) throw new Error(`candidate did not resolve exactly: ${resolved}`);

const readJson = (candidatePath) => JSON.parse(execFileSync(
  "git",
  ["show", `${candidateSha}:${candidatePath}`],
  { cwd: rootDir, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
));

if (!check) fs.mkdirSync(outputDir, { recursive: true });
for (const [fileName, value] of outputs) {
  const expected = stableJson(value);
  const target = path.join(outputDir, fileName);
  if (check) {
    const actual = fs.readFileSync(target, "utf8");
    if (actual !== expected) throw new Error(`${fileName} does not match candidate ${candidateSha}`);
  } else {
    fs.writeFileSync(target, expected);
  }
}
```

- [ ] **Step 4: Run and verify GREEN**

Expected: pure and CLI tests pass, including the exact 356-row authority run.

- [ ] **Step 5: Commit the CLI**

```bash
git add --sparse scripts/expungement-ai/qa/build-fresh-review-matrix.mjs scripts/expungement-ai/qa/test-fresh-review-matrix.mjs
git commit -m "feat(qa): read fresh review inputs by candidate SHA"
```

### Task 4: Generate and verify Phase-1 evidence

**Files:**

- Create: `data/expungement-ai/qa/fresh-review/CURRENT_MATRIX.json`
- Create: `data/expungement-ai/qa/fresh-review/BROWSER_SHARDS.json`
- Create: `data/expungement-ai/qa/fresh-review/THREE_STATE_STRESS_SET.json`
- Create: `data/expungement-ai/qa/fresh-review/BUILD_SUMMARY.json`

- [ ] **Step 1: Generate from the verified correction authority**

```bash
node scripts/expungement-ai/qa/build-fresh-review-matrix.mjs --candidate-sha 714f4d51f93461855b24c8644b6ea6ddad6d15f2
```

Expected: 356 matrix rows, 712 device fixtures, six shards, Colorado 5, Mississippi 14, Wisconsin 6.

- [ ] **Step 2: Run the byte-for-byte check**

```bash
node scripts/expungement-ai/qa/build-fresh-review-matrix.mjs --candidate-sha 714f4d51f93461855b24c8644b6ea6ddad6d15f2 --check
```

Expected: all four files match.

- [ ] **Step 3: Run focused verification**

```bash
node scripts/expungement-ai/qa/test-fresh-review-matrix.mjs
git diff --check
git status --short
```

Expected: tests pass, diff check is clean, and status lists only lane-G-owned QA artifacts.

- [ ] **Step 4: Stage exact paths and commit**

```bash
git add --sparse scripts/expungement-ai/qa/fresh-review-matrix-lib.mjs scripts/expungement-ai/qa/build-fresh-review-matrix.mjs scripts/expungement-ai/qa/test-fresh-review-matrix.mjs data/expungement-ai/qa/fresh-review/CURRENT_MATRIX.json data/expungement-ai/qa/fresh-review/BROWSER_SHARDS.json data/expungement-ai/qa/fresh-review/THREE_STATE_STRESS_SET.json data/expungement-ai/qa/fresh-review/BUILD_SUMMARY.json
git commit -m "test(qa): prepare 356-flow fresh review matrix"
```

- [ ] **Step 5: Record the Phase-1 handoff**

Report the commit SHA and artifact counts. State explicitly that Fresh Correction Review remains gated on lane A's frozen candidate SHA and hosted browser proof remains gated on lane F's exact Preview.
