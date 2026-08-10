// Generates the verifier disposition register.
//
// Every verifier script gets a recorded decision. A script with no decision is
// the failure mode this closes: 41 red verifiers and 75 unrun green ones sat in
// the tree for months because nothing forced anyone to say what they were for.
//
// Dispositions:
//   wired             already reached by `npm test`
//   wire              belongs in required CI; a milestone gate depends on it
//   keep_available    green and useful ad hoc, but no gate depends on it
//   fix_then_wire     broken, worth repairing, then reconsidered for the chain
//   blocked_on_family root-blockered to a packet family; not fixable alone
//   quarantine        unsafe to run as-is (mutates tracked state, hangs)
//   retire            delete, with a recorded reason
//
// Human decisions already in the register are preserved. Only scripts absent
// from it receive a generated default, so re-running never overwrites a call
// somebody made deliberately.
//
// Usage: node scripts/generate-rcap-verifier-dispositions.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const auditPath = path.join(rootDir, "data/rcap-verifier-audit.json");
const registerPath = path.join(rootDir, "data/rcap-verifier-dispositions.json");

if (!fs.existsSync(auditPath)) {
  console.error("No audit data. Run: npm run rcap:audit-orphaned-verifiers");
  process.exit(1);
}

const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));

// Decisions already made, by Roger or recorded in the build plan. These are not
// defaults and are re-applied on every generation.
const OVERRIDES = {
  "verify-all51-launch-enabled.mjs": {
    disposition: "retire",
    reason:
      "Forces all 51 jurisdictions to enable together, which contradicts the Milestone 1 model where routes go live in certification order behind one authorization. The build plan names it for deletion and replacement by verify-national-jurisdiction-experience and verify-route-packet-readiness."
  },
  "verify-all51-source-engine.mjs": {
    disposition: "keep_available",
    reason:
      "Was rewriting its coverage report on every run, so verifying dirtied a tracked file. Now compares by default and writes only under --write, and detects a stale report. No gate depends on it yet."
  },
  "verify-mississippi-document-generator.mjs": {
    disposition: "blocked_on_family",
    rootBlocker: "legacy_generator_family_mississippi",
    reason:
      "Loads src/lib/rcap/documents/mississippi/generator.ts, which exists on no current ref. Added in e58bcc0b and since removed. AGENTS.md requires the Mississippi legacy generator be preserved while verify-all50-build asserts legacy generators are removed from the active runtime; that contradiction is the root blocker and is not resolvable inside this script."
  },
  "verify-dc-document-generator.mjs": {
    disposition: "blocked_on_family",
    rootBlocker: "legacy_generator_family_dc",
    reason: "Same root blocker as Mississippi, for the District of Columbia family."
  },
  "verify-illinois-document-generator.mjs": {
    disposition: "blocked_on_family",
    rootBlocker: "legacy_generator_family_illinois",
    reason: "Same root blocker as Mississippi, for the Illinois family."
  },
  "verify-pennsylvania-document-generator.mjs": {
    disposition: "blocked_on_family",
    rootBlocker: "legacy_generator_family_pennsylvania",
    reason: "Same root blocker as Mississippi, for the Pennsylvania family."
  },
  "verify-texas-harris-document-generator.mjs": {
    disposition: "blocked_on_family",
    rootBlocker: "legacy_generator_family_texas_harris",
    reason: "Same root blocker as Mississippi, for the Texas-Harris family."
  }
};

// Verifiers a milestone gate depends on behaviourally. Only these are proposed
// for required CI; the plan is explicit that the chain carries gate guards, not
// everything that happens to be green.
const MILESTONE_GATE_GUARDS = new Set([
  "verify-rcap-authorization-queue.mjs",
  "verify-rcap-render-job-contract.mjs",
  "verify-rcap-render-worker.mjs",
  "verify-rcap-partner-entitlement.mjs",
  "verify-rcap-slot-lifecycle.mjs",
  "verify-internal-admin-browser-access.mjs",
  "verify-first-admin-provisioning.mjs"
]);

function defaultFor(row) {
  if (row.mutatesTrackedFiles) {
    return {
      disposition: "quarantine",
      reason: "Rewrites tracked files when run; verification must not mutate what it verifies."
    };
  }
  switch (row.status) {
    case "in_chain":
      return { disposition: "wired", reason: "Already reached by npm test." };
    case "generator_skipped":
      return {
        disposition: "keep_available",
        reason: "Generator rather than verifier; writes its own report and is run deliberately."
      };
    case "orphan_passing":
      return MILESTONE_GATE_GUARDS.has(row.file)
        ? { disposition: "wire", reason: "Green, and a milestone gate depends on this behaviour." }
        : {
            disposition: "keep_available",
            reason: "Green but no milestone gate depends on it; useful ad hoc."
          };
    case "orphan_broken":
      return {
        disposition: "fix_then_wire",
        reason: `Red when executed${row.detail ? `: ${row.detail}` : "."}`
      };
    case "orphan_timeout":
      return {
        disposition: "quarantine",
        reason: `Exceeded the ${audit.timeoutMs}ms budget; either genuinely slow or hung. Needs a bounded runtime before any gate can depend on it.`
      };
    case "added_since_audit":
      return {
        disposition: "keep_available",
        reason:
          "Added after the last coverage audit, so no measured status exists yet. Provisional; the next audit run replaces this with a measured disposition."
      };
    default:
      return { disposition: "fix_then_wire", reason: "Unclassified; needs a decision." };
  }
}

const existing = fs.existsSync(registerPath)
  ? JSON.parse(fs.readFileSync(registerPath, "utf8"))
  : { entries: {} };
const previous = existing.entries || {};

const entries = {};
let generated = 0;
let preserved = 0;
let overridden = 0;

// Scripts added since the last audit still need a decision. Classifying them by
// chain membership is honest and provisional: the next audit replaces the
// guess with a measured status. Leaving them out would let a new verifier slip
// in with no recorded decision, which is the exact gap this register closes.
const auditedFiles = new Set(audit.scripts.map((r) => r.file));
const onDisk = fs
  .readdirSync(path.join(rootDir, "scripts"))
  .filter((f) => /^(verify|test|audit)-.*\.mjs$/.test(f))
  .sort();

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
const testChain = pkg.scripts?.test ?? "";

const rowsToProcess = [
  ...audit.scripts,
  ...onDisk
    .filter((f) => !auditedFiles.has(f))
    .map((f) => ({
      file: f,
      status: testChain.includes(f) ? "in_chain" : "added_since_audit",
      detail: null,
      wiredToNamedScript: true,
      mutatesTrackedFiles: false
    }))
];

for (const row of rowsToProcess) {
  if (OVERRIDES[row.file]) {
    entries[row.file] = {
      ...OVERRIDES[row.file],
      observedStatus: row.status,
      decidedBy: "recorded_decision"
    };
    overridden += 1;
    continue;
  }
  if (previous[row.file] && previous[row.file].decidedBy === "human") {
    entries[row.file] = { ...previous[row.file], observedStatus: row.status };
    preserved += 1;
    continue;
  }
  entries[row.file] = { ...defaultFor(row), observedStatus: row.status, decidedBy: "generated" };
  generated += 1;
}

const counts = {};
for (const entry of Object.values(entries)) {
  counts[entry.disposition] = (counts[entry.disposition] || 0) + 1;
}

const register = {
  schemaVersion: "rcap-verifier-dispositions/v1",
  purpose:
    "One recorded decision per verifier script. Reconciliation workstream opened by commit 1c3015a8, which found that only 60 of 200 verifier scripts are reached by npm test.",
  note:
    "decidedBy 'generated' is a default and may be changed freely. Set decidedBy to 'human' to pin a decision so regeneration preserves it. Entries in the script's OVERRIDES map are re-applied every run.",
  counts,
  entries
};

fs.writeFileSync(registerPath, `${JSON.stringify(register, null, 2)}\n`, "utf8");

console.log("Verifier disposition register generated.");
console.log(`  scripts        : ${Object.keys(entries).length}`);
console.log(`  generated      : ${generated}`);
console.log(`  preserved human: ${preserved}`);
console.log(`  recorded calls : ${overridden}`);
console.log("");
for (const [disposition, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(4)}  ${disposition}`);
}
console.log("");
console.log(`Written: ${path.relative(rootDir, registerPath)}`);
