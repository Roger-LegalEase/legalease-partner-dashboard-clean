// Enforces that every verifier script carries a recorded disposition.
//
// The gap this closes: 41 red verifiers and 75 unrun green ones accumulated
// because nothing required anyone to say what each was for. Coverage that
// nobody has decided about is indistinguishable from coverage that does not
// exist.
//
// Checks:
//   1. Every verifier script in scripts/ has a register entry.
//   2. The register names no script that has been deleted.
//   3. Every disposition is from the agreed vocabulary.
//   4. retire, quarantine and blocked_on_family carry a reason; the last also
//      names a root blocker, so it is attached to a family rather than floating.
//   5. Anything marked `wired` really is in the npm test chain, and anything in
//      the chain is marked `wired` — the register cannot claim coverage the
//      chain does not have, or hide coverage it does.
//   6. Nothing broken is marked `wired` or `wire`; that would knowingly put a
//      red script into required CI.
//
// Pure Node. No execution, no network, no database.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registerPath = path.join(rootDir, "data/rcap-verifier-dispositions.json");
const scriptsDir = path.join(rootDir, "scripts");

const failures = [];

if (!fs.existsSync(registerPath)) {
  console.error("Missing data/rcap-verifier-dispositions.json.");
  console.error("Generate it with: npm run rcap:generate-verifier-dispositions");
  process.exit(1);
}

const register = JSON.parse(fs.readFileSync(registerPath, "utf8"));
const entries = register.entries || {};

const VALID = new Set([
  "wired",
  "wire",
  "keep_available",
  "fix_then_wire",
  "blocked_on_family",
  "quarantine",
  "retire"
]);
const NEEDS_REASON = new Set(["retire", "quarantine", "blocked_on_family", "fix_then_wire"]);

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
const testChain = pkg.scripts?.test ?? "";

const onDisk = fs
  .readdirSync(scriptsDir)
  .filter((f) => /^(verify|test|audit)-.*\.mjs$/.test(f))
  .sort();

for (const file of onDisk) {
  if (!entries[file]) {
    failures.push(`${file}: no recorded disposition`);
  }
}

for (const [file, entry] of Object.entries(entries)) {
  if (!onDisk.includes(file)) {
    failures.push(`${file}: register names a script that is not in scripts/`);
    continue;
  }
  if (!VALID.has(entry.disposition)) {
    failures.push(`${file}: unknown disposition ${JSON.stringify(entry.disposition)}`);
    continue;
  }
  if (NEEDS_REASON.has(entry.disposition) && !entry.reason) {
    failures.push(`${file}: disposition ${entry.disposition} requires a reason`);
  }
  if (entry.disposition === "blocked_on_family" && !entry.rootBlocker) {
    failures.push(`${file}: blocked_on_family requires a rootBlocker naming the family`);
  }

  const inChain = testChain.includes(file);
  if (entry.disposition === "wired" && !inChain) {
    failures.push(`${file}: marked wired but not present in the npm test chain`);
  }
  if (inChain && entry.disposition !== "wired") {
    failures.push(
      `${file}: is in the npm test chain but recorded as ${entry.disposition}; the register must match reality`
    );
  }
  if (
    (entry.disposition === "wired" || entry.disposition === "wire") &&
    (entry.observedStatus === "orphan_broken" || entry.observedStatus === "orphan_timeout")
  ) {
    failures.push(
      `${file}: ${entry.disposition} but last observed ${entry.observedStatus}; a red script must not be placed in required CI`
    );
  }
}

if (failures.length > 0) {
  console.error("Verifier disposition verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("");
  console.error("Regenerate with: npm run rcap:generate-verifier-dispositions");
  process.exit(1);
}

const counts = {};
for (const entry of Object.values(entries)) {
  counts[entry.disposition] = (counts[entry.disposition] || 0) + 1;
}

console.log("Verifier disposition verification passed.");
console.log(`Scripts with a recorded disposition: ${Object.keys(entries).length} / ${onDisk.length}`);
for (const [disposition, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(4)}  ${disposition}`);
}

const pendingWire = Object.entries(entries).filter(([, e]) => e.disposition === "wire");
if (pendingWire.length > 0) {
  console.log("");
  console.log("Green and awaiting promotion into required CI:");
  for (const [file] of pendingWire) console.log(`  - ${file}`);
}
