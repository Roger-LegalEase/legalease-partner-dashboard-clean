# Live PF Elastic Lane Retention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep every PF lane named by a live packet-build grant in the generated dispatch while preserving normal elastic shrinkage after release.

**Architecture:** Add one pure helper that derives live PF ownership and the minimum safe lane count from claim-ledger rows. The existing generator will use that result only for PF roster sizing and will reuse the derived family-to-lane map for its existing pinning behavior.

**Tech Stack:** Node.js ESM, built-in `node:assert`, JSON claim ledgers, existing packet-factory generators and verifiers.

---

### Task 1: Add the focused regression

**Files:**
- Create: `scripts/grade-a-packet-factory-24h/pf-lane-retention.mjs`
- Create: `scripts/grade-a-packet-factory-24h/test-live-pf-lane-retention.mjs`

- [ ] **Step 1: Create the helper interface with deliberately incomplete behavior**

```js
export function livePacketLaneByFamily(claims) {
  return new Map();
}

export function effectivePacketLaneCount(baseLaneCount, liveLaneByFamily) {
  return baseLaneCount;
}
```

- [ ] **Step 2: Write the regression covering live, released, malformed, and unrelated claims**

```js
#!/usr/bin/env node
import assert from "node:assert/strict";
import { effectivePacketLaneCount, livePacketLaneByFamily } from "./pf-lane-retention.mjs";

const packetClaim = {
  subjectType: "packet-family",
  subjectId: "family-under-test",
  operation: "packet-build",
  lane: "PF17",
  released: false
};

const live = livePacketLaneByFamily([packetClaim]);
assert.equal(live.get("family-under-test"), "PF17");
assert.equal(effectivePacketLaneCount(16, live), 17);

const released = livePacketLaneByFamily([{ ...packetClaim, released: true }]);
assert.equal(released.has("family-under-test"), false);
assert.equal(effectivePacketLaneCount(16, released), 16);

const truthyReleased = livePacketLaneByFamily([{ ...packetClaim, released: "true" }]);
assert.equal(truthyReleased.has("family-under-test"), false);

const ignored = livePacketLaneByFamily([
  { ...packetClaim, lane: "VF17" },
  { ...packetClaim, operation: "independent-verification" },
  { ...packetClaim, subjectType: "source-obligation" },
  { ...packetClaim, subjectId: "" },
  { ...packetClaim, lane: "PF0" },
  { ...packetClaim, lane: "PFnot-a-number" }
]);
assert.equal(ignored.size, 0);
assert.equal(effectivePacketLaneCount(16, ignored), 16);

console.log("OK live PF lane-retention regression");
```

- [ ] **Step 3: Run the regression and confirm RED**

Run: `node scripts/grade-a-packet-factory-24h/test-live-pf-lane-retention.mjs`

Expected: FAIL because the incomplete helper does not return `PF17` or expand the count to 17.

- [ ] **Step 4: Commit the red regression**

```bash
git add scripts/grade-a-packet-factory-24h/pf-lane-retention.mjs scripts/grade-a-packet-factory-24h/test-live-pf-lane-retention.mjs
git commit -m "test(packet-factory): reproduce disappearing live PF lane"
```

### Task 2: Implement the lane-retention rule

**Files:**
- Modify: `scripts/grade-a-packet-factory-24h/pf-lane-retention.mjs`
- Modify: `scripts/grade-a-packet-factory-24h/generate.mjs:18-28`
- Modify: `scripts/grade-a-packet-factory-24h/generate.mjs:1761-1835`

- [ ] **Step 1: Implement strict live PF claim filtering and count derivation**

```js
const PF_LANE = /^PF([1-9]\d*)$/;

export function livePacketLaneByFamily(claims) {
  const lanes = new Map();
  for (const claim of claims ?? []) {
    const match = typeof claim.lane === "string" ? claim.lane.match(PF_LANE) : null;
    if (claim.subjectType !== "packet-family"
      || claim.operation !== "packet-build"
      || claim.released
      || typeof claim.subjectId !== "string"
      || claim.subjectId.length === 0
      || !match) continue;
    lanes.set(claim.subjectId, claim.lane);
  }
  return lanes;
}

export function effectivePacketLaneCount(baseLaneCount, liveLaneByFamily) {
  let highestLiveLane = 0;
  for (const lane of liveLaneByFamily.values()) {
    highestLiveLane = Math.max(highestLiveLane, Number(lane.slice(2)));
  }
  return Math.max(baseLaneCount, highestLiveLane);
}
```

- [ ] **Step 2: Run the focused regression and confirm GREEN**

Run: `node scripts/grade-a-packet-factory-24h/test-live-pf-lane-retention.mjs`

Expected: `OK live PF lane-retention regression`

- [ ] **Step 3: Wire the helper into generator sizing and pinning**

Add the import:

```js
import { effectivePacketLaneCount, livePacketLaneByFamily } from "./pf-lane-retention.mjs";
```

Before declaring `PF_LANES`, read the existing ledger fail-closed to an empty claim list, derive `livePacketLane`, and replace the PF declaration:

```js
let packetClaimsForPacking = [];
try {
  packetClaimsForPacking = JSON.parse(
    fs.readFileSync(path.join(ROOT, `${OUT_DIR}/claim-ledger.json`), "utf8")
  ).claims ?? [];
} catch { /* no ledger yet */ }
const livePacketLane = livePacketLaneByFamily(packetClaimsForPacking);
const PF_LANES = effectivePacketLaneCount(laneCount("build"), livePacketLane);
```

Delete the later duplicate `livePacketLane` construction block. Keep the existing `pinnedFamilies`, bucket creation, and exact-lane placement unchanged.

- [ ] **Step 4: Run the focused regression and syntax check**

Run: `node scripts/grade-a-packet-factory-24h/test-live-pf-lane-retention.mjs && node --check scripts/grade-a-packet-factory-24h/generate.mjs`

Expected: regression prints `OK`; syntax check exits 0.

- [ ] **Step 5: Commit the implementation**

```bash
git add scripts/grade-a-packet-factory-24h/pf-lane-retention.mjs scripts/grade-a-packet-factory-24h/generate.mjs
git commit -m "fix(packet-factory): retain lanes with live build grants"
```

### Task 3: Regenerate and verify the national dispatch

**Files:**
- Modify: generator-owned files under `data/rcap-grade-a/packet-factory-24h/`
- Modify: generator-owned prompts under `docs/rcap/grade-a/packet-factory-24h/`

- [ ] **Step 1: Regenerate in dependency order**

```bash
node scripts/grade-a-packet-factory-24h/generate-source-conveyor.mjs
node scripts/grade-a-packet-factory-24h/generate.mjs
node scripts/grade-a-packet-factory-24h/generate-raster-queue.mjs
node scripts/grade-a-packet-factory-24h/generate.mjs
```

Expected: the factory reports at least 17 PF lanes, includes PF17, and writes no history-destruction refusal.

- [ ] **Step 2: Run focused and full invariant checks**

```bash
node scripts/grade-a-packet-factory-24h/test-live-pf-lane-retention.mjs
node scripts/grade-a-packet-factory-24h/verify.mjs
node scripts/grade-a-packet-factory-24h/verify-source-conveyor.mjs
node scripts/grade-a-packet-factory-24h/verify-lane-contracts.mjs
node scripts/grade-a-packet-factory-24h/verify-claim-ledger.mjs
node scripts/grade-a-packet-factory-24h/test-independent-pass-raster-state.mjs
node scripts/grade-a-packet-factory-24h/test-resolved-verifier-source-holds.mjs
node scripts/grade-a-packet-factory-24h/test-stale-verification-claims.mjs
node scripts/grade-a-route-artifact-scope/test-route-family-alias-regression.mjs
```

Expected: every command exits 0; factory is 34/34, source conveyor is 23/23, lane contracts are 9/9, and the claim ledger reports OK.

- [ ] **Step 3: Prove convergence**

Record `git diff --stat` and SHA-256 hashes of the generator-owned JSON outputs, rerun the four generation commands from Step 1, and hash the same files again.

Expected: the second run produces the same semantic dispatch and no additional diff. Any timestamp-only change must be identified explicitly rather than treated as convergence.

- [ ] **Step 4: Commit the generated dispatch**

```bash
git add data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json data/rcap-grade-a/packet-factory-24h docs/rcap/grade-a/packet-factory-24h
git commit -m "chore(rcap): publish live-grant-safe national dispatch"
```

- [ ] **Step 5: Push and verify the Captain remote**

Run: `git push origin claude/legalease-sprint-captain-utucnw`

Then run: `git ls-remote origin refs/heads/claude/legalease-sprint-captain-utucnw`

Expected: the remote SHA exactly equals local `HEAD`; never force-push.
