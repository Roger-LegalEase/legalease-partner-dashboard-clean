// Mutation tests for the E2 source-support audit verifier.
//
// The audit is the record of whether each of the 935 evidence citations
// actually supports the claim attached to it. Final E3 leaned on it, and the
// job graph downstream of it inherits its conclusions — so "the verifier
// passes" is only worth something if the verifier also *fails* when the
// artifact is wrong.
//
// Each mutation below corrupts the committed artifact in one specific way and
// asserts the verifier turns red with the matching complaint. A mutation that
// still passes is a hole in the audit, not a passing test.
//
// The artifact is restored from the original bytes in a finally block, so an
// abort mid-run cannot leave a corrupted audit in the tree.
//
// Usage: node scripts/test-rcap-source-support-audit-mutations.mjs

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUDIT_JSON = path.join(rootDir, "data/rcap-crosswalk-enrichment/e2-source-support-audit.json");
const VERIFIER = path.join(rootDir, "scripts/verify-rcap-e2-source-support-audit.mjs");

const original = fs.readFileSync(AUDIT_JSON, "utf8");

function runVerifier() {
  const result = spawnSync("node", [VERIFIER], { cwd: rootDir, encoding: "utf8" });
  return { code: result.status, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

/** Finds the first row matching a predicate, or throws — a mutation that cannot
 * find its target is a silently skipped test, which is worse than a failure. */
function findRow(rows, predicate, label) {
  const row = rows.find(predicate);
  if (!row) throw new Error(`mutation setup failed: no row matching ${label}`);
  return row;
}

const MUTATIONS = [
  {
    name: "dropped row",
    expect: "row count drift",
    mutate: (a) => {
      a.rows.splice(5, 1);
    }
  },
  {
    name: "duplicated evidence identity",
    expect: "duplicate evidenceId",
    mutate: (a) => {
      a.rows[7] = { ...a.rows[6] };
    }
  },
  {
    name: "pinned commit that does not resolve",
    expect: "does not resolve",
    mutate: (a) => {
      const row = findRow(a.rows, (r) => r.sourceRef, "a path@commit pin");
      row.sourceRef = "0123456789abcdef0123456789abcdef01234567";
    }
  },
  {
    name: "source path that does not exist",
    expect: "missing but classified",
    mutate: (a) => {
      const row = findRow(a.rows, (r) => !r.sourceRef && r.classification !== "source_missing", "an unpinned resolved row");
      row.sourcePath = "src/lib/rcap-engine/compiled/profiles/ZZ-nowhere.json";
    }
  },
  {
    name: "fabricated exact_verbatim",
    expect: "not present in the cited bytes",
    mutate: (a) => {
      const row = findRow(a.rows, (r) => r.classification === "faithful_paraphrase", "a faithful_paraphrase row");
      row.classification = "exact_verbatim";
    }
  },
  {
    name: "unsupported row carrying a supporting verdict",
    expect: "carries a supporting verdict",
    mutate: (a) => {
      const row = findRow(a.rows, (r) => r.classification === "unsupported_by_cited_source", "an unsupported row");
      row.supportsProposition = "textual";
    }
  },
  {
    name: "pointer_invalid claiming support",
    expect: "must not carry support",
    mutate: (a) => {
      const row = findRow(a.rows, (r) => r.classification === "pointer_invalid", "a pointer_invalid row");
      row.supportsProposition = "derivable";
    }
  },
  {
    name: "silently omitted E-SPECIAL package",
    expect: "E-SPECIAL",
    mutate: (a) => {
      a.rows = a.rows.filter((r) => r.laneId !== "E-SPECIAL");
      a.input.lanes = a.input.lanes.filter((l) => l.laneId !== "E-SPECIAL");
    }
  }
];

let passed = 0;
const failures = [];

try {
  // Baseline: the committed artifact must verify before any mutation means anything.
  const baseline = runVerifier();
  if (baseline.code !== 0) {
    console.error("baseline FAILED: the committed audit does not verify, so mutation results are meaningless");
    console.error(baseline.output.split("\n").slice(0, 10).join("\n"));
    process.exit(1);
  }
  console.log("baseline: committed audit verifies");

  for (const mutation of MUTATIONS) {
    const artifact = JSON.parse(original);
    mutation.mutate(artifact);
    fs.writeFileSync(AUDIT_JSON, `${JSON.stringify(artifact, null, 2)}\n`);

    const { code, output } = runVerifier();
    if (code === 0) {
      failures.push(`${mutation.name}: verifier still PASSED — the audit does not catch this`);
    } else if (!output.includes(mutation.expect)) {
      failures.push(
        `${mutation.name}: verifier failed but not for the expected reason (wanted "${mutation.expect}")`
      );
    } else {
      passed += 1;
      console.log(`  red as expected: ${mutation.name}`);
    }
  }
} finally {
  fs.writeFileSync(AUDIT_JSON, original);
}

// The restore must actually have worked; a green run over a corrupted tree is
// the failure mode this whole file exists to prevent.
const restored = runVerifier();
if (restored.code !== 0) {
  console.error("FAILED: the audit does not verify after restore — the tree may be dirty");
  process.exit(1);
}

if (failures.length > 0) {
  console.error("test-rcap-source-support-audit-mutations FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`test-rcap-source-support-audit-mutations passed: ${passed}/${MUTATIONS.length} mutations red, artifact restored and verifying.`);
