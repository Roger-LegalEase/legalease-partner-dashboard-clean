#!/usr/bin/env node
/**
 * V1-V7 CONTINUATION — the same shards, the same families, one fixed blocker.
 *
 *   node scripts/grade-a-launch-control/generate-verification-continuation.mjs
 *
 * All forty-three verification rows returned BLOCKED_SOURCE for one reason: the
 * private Master Library was not present in the worker environments, so no
 * pinned source could bind and every observed SHA-256 was null.
 *
 * That is an environment record, not a packet verdict. Nothing here classifies a
 * family, and re-dispatching against a re-derived family list would silently
 * change what was verified. So each shard keeps its branch and its exact family
 * assignment, read from its own return.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = "docs/rcap/grade-a/launch-control/wave-2-verification-continuation";
const RECORD = "data/rcap-grade-a/launch-control/WAVE_2_VERIFICATION_CONTINUATION.json";
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const RETURNS = {
  V1: { sha: "e14950ec5b9d9a74b300f1d076b488e1f5ebd772", branch: "codex/v1-independent-packet-verification" },
  V2: { sha: "85b58750104f85f8ed4d35362581ba4a7f9a950f", branch: "codex/v2-independent-packet-verification" },
  V3: { sha: "6fe1432af7f8aadb06087a699880dc85707a285f", branch: "codex/v3-independent-packet-verification" },
  V4: { sha: "ed8176e98344d715040bfdaeaacb684ef04aec2e", branch: "codex/v4-independent-packet-verification" },
  V5: { sha: "79922470a6a16264ba268b026097800faa9839f7", branch: "codex/v5-independent-packet-verification" },
  V6: { sha: "6e2e41fbadfaed782a68f6cb03844091b337bf5c", branch: "codex/v6-independent-packet-verification" },
  V7: { sha: "ce6bd1b174b518ecc11a69fb5214899abff8a83e", branch: "codex/v7-independent-packet-verification" }
};

const shards = [];
for (const [shard, meta] of Object.entries(RETURNS)) {
  const rows = read(`data/rcap-grade-a/wave-2/verification/${shard.toLowerCase()}/rows.json`).rows;
  shards.push({
    shard,
    branch: meta.branch,
    previousReturn: meta.sha,
    familyCount: rows.length,
    families: rows.map((r) => r.itemId),
    previousVerdicts: rows.map((r) => ({ familyId: r.itemId, verdict: r.verdict })),
    allBlockedForOneReason: rows.every((r) => r.verdict === "BLOCKED_SOURCE")
  });
}

const preconditions = [
  "MASTER_LIBRARY_SOURCE_DIR is set and resolves to the private Master Library root in the executing environment.",
  "At least 4096 MiB of free disk before any command runs, per WEC-2.",
  "node scripts/verify-packet-build-environment.mjs --family <familyId> returns something other than PACKET_BUILD_ENVIRONMENT_NOT_READY for the shard's first family."
];

const record = {
  schemaVersion: "rcap-grade-a-wave-2-verification-continuation/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-verification-continuation.mjs",
  status: "ENVIRONMENT_BLOCKED — RETRY REQUIRED",
  whatTheReturnsWere:
    "Forty-three rows, every one BLOCKED_SOURCE because the private Master Library was absent. These are environment records and not packet verdicts.",
  refusals: [
    "No family may be classified PASS or FAIL from the Wave 2 verification returns.",
    "No Lawrence review package may be prepared from them.",
    "No shard may be re-dispatched against a re-derived family list: the assignment is the list its own return carries, so that what is verified on retry is what was assigned."
  ],
  preconditionsBeforeAnyShardRuns: preconditions,
  stopRule:
    "If the precondition check fails, the shard returns DEPENDENCIES_UNINSTALLABLE or BLOCKED_SOURCE again with the observed environment and stops. A verifier that cannot read the source must never report a verdict, and a second identical environment stop is a Captain problem rather than a worker one.",
  totals: { shards: shards.length, families: shards.reduce((n, s) => n + s.familyCount, 0) },
  shards
};

fs.writeFileSync(path.join(ROOT, RECORD), `${JSON.stringify(record, null, 2)}\n`);

for (const s of shards) {
  const md = `# ${s.shard}_INDEPENDENT_PACKET_VERIFICATION — CONTINUATION

**Status of the previous run:** ENVIRONMENT_BLOCKED — RETRY REQUIRED
**Branch (unchanged):** \`${s.branch}\`
**Previous return:** \`${s.previousReturn}\`
**Families (unchanged, ${s.familyCount}):**

${s.families.map((f) => `- \`${f}\``).join("\n")}

## Why this is a continuation and not a new assignment

Every row this shard returned was \`BLOCKED_SOURCE\`: \`MASTER_LIBRARY_SOURCE_DIR\` was
unset, the default private master-library root was absent, and no pinned source
bound, so every observed SHA-256 was null. That is a record about the
environment, not about the packets. Nothing was verified, and nothing was
disproved.

The family list above is the one this shard's own return carries. It is not
re-derived, because re-deriving it would change what is verified on retry
without anyone deciding to.

## Before any command runs

${preconditions.map((p, i) => `${i + 1}. ${p}`).join("\n")}

If the precondition check fails, return \`BLOCKED_SOURCE\` again with the observed
environment and stop. Do not report a verdict you could not observe: a second
identical environment stop is a Captain problem, not a worker one.

## What a verdict requires

Each family's proof obligations are the ones the previous return already
enumerated. A family passes only when every obligation is observed, each with the
file it was observed in. A single unbound source is a ROW stop, and the shard
continues to its next family.

## What finishing does not do

A PASS here proves a packet was built and verified as specified. It opens no
commercial route, approves no output and creates no fulfillment record.

**COMMERCIAL ROUTES OPENED: 0 · PRODUCTION TOUCHED: NO**
`;
  fs.writeFileSync(path.join(ROOT, OUT_DIR, `${s.shard}_CONTINUATION.md`), md);
}

console.log(`${RECORD}: ${record.totals.shards} shards, ${record.totals.families} families`);
for (const s of shards) console.log(`  ${s.shard}\t${s.familyCount} families\t${s.branch}\tallBlocked=${s.allBlockedForOneReason}`);
