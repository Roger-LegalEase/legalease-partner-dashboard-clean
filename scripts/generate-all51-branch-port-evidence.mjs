// Measures which jurisdictions have reviewed implementation on an unmerged
// lineage that the controlling branch does not carry.
//
// This exists so the reconciliation's EXISTING_BRANCH_TO_PORT bucket is a
// measurement rather than a recollection. The jurisdiction lists come from the
// tranche manifests on the branch itself.
//
// Usage: node scripts/generate-all51-branch-port-evidence.mjs [--check]

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const OUT = "data/rcap-all50/all51-branch-port-evidence.json";

// The lineages worth measuring. Others were checked and carry no
// per-jurisdiction implementation the controlling branch lacks.
const LINEAGES = [
  "origin/feat/record-clearing-production-integration",
  "origin/feat/record-clearing-tranche-2-maryland",
  "origin/feat/record-clearing-tranche-1-implementation",
  "origin/feat/record-clearing-production-factory",
  "origin/feat/record-clearing-batch-2-legal-design"
];

const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const tryGit = (args) => { try { return git(args); } catch { return null; } };

const jurisdictions = {};
const lineages = [];

for (const ref of LINEAGES) {
  const head = tryGit(["rev-parse", "--short", ref]);
  if (!head) continue;
  const commit = head.trim();

  const listing = tryGit(["ls-tree", "-r", "--name-only", ref, "--", "data/record-clearing/implementation-tranches"]);
  const tranches = (listing ?? "").split("\n").filter((f) => /tranche-\d+\.json$/.test(f));

  const codes = new Set();
  for (const file of tranches) {
    const body = tryGit(["show", `${ref}:${file}`]);
    if (!body) continue;
    for (const match of body.matchAll(/"jurisdiction"\s*:\s*"([A-Z]{2})"/g)) codes.add(match[1]);
  }

  // What the controlling branch does not have at all.
  const engineListing = tryGit(["ls-tree", "-r", "--name-only", ref, "--", "src/lib/rcap/packets/engines"]);
  const engines = (engineListing ?? "").split("\n").filter(Boolean);
  const enginesMissingLocally = engines.filter((file) => !fs.existsSync(path.join(root, file)));

  if (codes.size === 0 && enginesMissingLocally.length === 0) continue;

  lineages.push({
    branch: ref.replace(/^origin\//, ""),
    commit,
    trancheManifests: tranches.length,
    jurisdictions: [...codes].sort(),
    packetEnginesAbsentFromControllingBranch: enginesMissingLocally
  });

  for (const code of codes) {
    // First lineage that carries a jurisdiction wins; they are listed most
    // complete first.
    if (jurisdictions[code]) continue;
    jurisdictions[code] = {
      branch: ref.replace(/^origin\//, ""),
      commit,
      evidence: `${tranches.length} tranche manifests naming ${code}`,
      artifacts: enginesMissingLocally.length > 0
        ? "legal design, packet specification and packet-engine implementation"
        : "legal design and packet specification"
    };
  }
}

const evidence = {
  schemaVersion: 1,
  generatedBy: "scripts/generate-all51-branch-port-evidence.mjs",
  note: "Reviewed per-jurisdiction implementation that exists on an unmerged lineage and not on the controlling branch. Port the delta; never merge a lineage wholesale.",
  lineages,
  jurisdictions,
  // The launch graph counts zero operationally sellable pathways and the hosted
  // acceptance matrix carries behaviour probes rather than per-jurisdiction
  // generation evidence, so no jurisdiction is hosted-accepted yet.
  hostedAcceptedJurisdictions: []
};

const serialized = `${JSON.stringify(evidence, null, 2)}\n`;

if (CHECK) {
  const current = fs.existsSync(path.join(root, OUT)) ? fs.readFileSync(path.join(root, OUT), "utf8") : "";
  if (current !== serialized) {
    console.error(`${OUT} is stale or missing; regenerate it.`);
    process.exit(1);
  }
  console.log(`Branch port evidence verified: ${Object.keys(jurisdictions).length} jurisdictions across ${lineages.length} lineages.`);
  process.exit(0);
}

fs.writeFileSync(path.join(root, OUT), serialized);
console.log(`Wrote ${OUT}`);
console.log(`Jurisdictions to port: ${Object.keys(jurisdictions).sort().join(" ") || "none"}`);
for (const lineage of lineages) {
  console.log(`  ${lineage.branch} @ ${lineage.commit}: ${lineage.jurisdictions.join(" ") || "no tranche jurisdictions"}`
    + `${lineage.packetEnginesAbsentFromControllingBranch.length > 0 ? ` (+${lineage.packetEnginesAbsentFromControllingBranch.length} packet engines absent locally)` : ""}`);
}
