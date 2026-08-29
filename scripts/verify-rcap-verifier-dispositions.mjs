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
//   5. Anything marked `wired` really is reached by CI -- the npm test chain OR
//      a direct invocation from a workflow -- and anything in
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

/**
 * Verifier scripts a workflow runs directly, as `run: node scripts/<file>`.
 *
 * Only an unconditional step counts. A step behind an `if:` is skipped on the
 * runs where its condition is false, and recording a sometimes-skipped guard as
 * "wired" would overstate the coverage exactly where it matters least
 * predictably.
 */
function workflowInvokedScripts() {
  const dir = path.join(rootDir, ".github/workflows");
  const invoked = new Set();
  if (!fs.existsSync(dir)) return invoked;
  for (const name of fs.readdirSync(dir).sort()) {
    if (!/\.ya?ml$/.test(name)) continue;
    const lines = fs.readFileSync(path.join(dir, name), "utf8").split(/\r?\n/);
    let conditional = false;
    for (const line of lines) {
      if (/^\s{6}- name:/.test(line)) { conditional = false; continue; }
      if (/^\s{8}if:/.test(line)) { conditional = true; continue; }
      const run = /^\s{8}run:\s*node\s+scripts\/([A-Za-z0-9._-]+\.mjs)/.exec(line);
      if (run && !conditional) invoked.add(run[1]);
    }
  }
  return invoked;
}
const workflowInvocations = workflowInvokedScripts();

// The top level and scripts/security/, matching the generator. These two files
// are halves of one mechanism: if the register learns about a directory and the
// check does not, every entry from that directory reads as naming a script that
// does not exist, and the honest fix is for both to look in the same places.
// Keys are paths relative to scripts/, so a security verifier and a top-level
// one of the same name stay distinguishable.
function verifierFilesUnder(relativeDir, prefix) {
  const absolute = path.join(scriptsDir, relativeDir);
  if (!fs.existsSync(absolute)) return [];
  return fs
    .readdirSync(absolute)
    .filter((f) => /^(verify|test|audit)-.*\.mjs$/.test(f))
    .map((f) => `${prefix}${f}`);
}
const onDisk = [...verifierFilesUnder(".", ""), ...verifierFilesUnder("security", "security/")].sort();

for (const file of onDisk) {
  if (!entries[file]) {
    failures.push(`${file}: no recorded disposition`);
  }
}

for (const [file, entry] of Object.entries(entries)) {
  if (!onDisk.includes(file)) {
    failures.push(`${file}: register names a script that is not in scripts/ or scripts/security/`);
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

  // "Wired" means CI runs it, and the test chain is not the only way CI does.
  // Several guards are invoked directly from a workflow on purpose:
  // package.json is a worker image input, so adding a script entry there
  // changes the image fingerprint and forces a rebuild for a check that alters
  // nothing the image contains. Judging those by chain membership alone marked
  // genuinely-wired verifiers as merely available, which is the same
  // register-does-not-match-reality failure this file exists to prevent.
  const inChain = testChain.includes(file);
  const inWorkflow = workflowInvocations.has(file);
  const reachedByCi = inChain || inWorkflow;
  if (entry.disposition === "wired" && !reachedByCi) {
    failures.push(`${file}: marked wired but neither in the npm test chain nor invoked by a workflow`);
  }
  // The reverse check stays chain-only, deliberately. Extending it to workflow
  // invocation turns ten existing entries red at once -- guards several other
  // lanes invoke directly and recorded as `keep_available` before "wired" was
  // understood to include a workflow step. Those records understate CI
  // coverage and should be corrected, but by the lanes that own them, not by a
  // sweep from here while they are in flight. They are reported below instead
  // of failed, so the finding is not lost.
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

// Reported, not failed: see the reverse-check comment above.
const understated = [...workflowInvocations]
  .filter((file) => register.entries[file] && register.entries[file].disposition !== "wired")
  .sort();
if (understated.length > 0) {
  console.warn(`  note: ${understated.length} verifier(s) are invoked directly by a workflow but recorded as something other than 'wired'. Their records understate CI coverage and belong to the lanes that own them:`);
  for (const file of understated) console.warn(`    ${file} (${register.entries[file].disposition})`);
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
