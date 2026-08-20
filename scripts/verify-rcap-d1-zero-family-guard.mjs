#!/usr/bin/env node
// A run that processed nothing must not be able to erase the record of a run
// that processed everything.
//
//   node scripts/verify-rcap-d1-zero-family-guard.mjs
//
// The defect this pins: implement-rcap-official-forms-d1.mjs resolves each
// family's bytes under RCAP_BUNDLE_EXTRACT and skips the family when the file
// is absent. That is right per family and catastrophic in aggregate. With no
// extract mounted every family is skipped, and the driver then rewrote
// implementation-index.json from an empty result set -- replacing the record of
// 146 families with one describing nothing, reporting success, and exiting 0.
// It was caught only because the 1320-line deletion showed up in a diff.
//
// The five properties below are exactly the ones that make that impossible, and
// each is measured rather than asserted:
//
//   1. start from a populated implementation index;
//   2. run against an empty or missing source root;
//   3. the command exits NONZERO;
//   4. the index hash is byte-for-byte unchanged;
//   5. no family artifact or contact sheet is removed.
//
// Property 4 is checked on mtime as well as hash. Rewriting the file with
// identical bytes would pass a hash check while still proving the guard did not
// hold, so the guard must not touch the file at all.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRIVER = path.join(rootDir, "scripts/implement-rcap-official-forms-d1.mjs");
const INDEX = path.join(rootDir, "data/rcap-all50/overlays/production/implementation-index.json");
const OVERLAY = path.join(rootDir, "data/rcap-all50/overlays/production");

const failures = [];
const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok, detail }); if (!ok) failures.push(`${name}: ${detail}`); };

const sha256 = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");

/** Every rendered artifact and contact sheet under the family packages. */
function artifactInventory() {
  const found = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (/\.pdf$/i.test(entry.name)) found.push(path.relative(rootDir, full));
    }
  };
  walk(OVERLAY);
  return found.sort();
}

// ---- 1. a populated index to start from -------------------------------------
if (!fs.existsSync(INDEX)) {
  console.error("FAIL zero-family guard — there is no implementation index to protect; cannot run this regression");
  process.exit(1);
}
const indexBefore = JSON.parse(fs.readFileSync(INDEX, "utf8"));
const familiesBefore = (indexBefore.families ?? []).length;
check("index_is_populated_before", familiesBefore > 0, `${familiesBefore} families recorded`);

const hashBefore = sha256(INDEX);
const mtimeBefore = fs.statSync(INDEX).mtimeMs;
const artifactsBefore = artifactInventory();

// ---- 2. run against a source root that does not exist -----------------------
const absentRoot = path.join(rootDir, "tmp", "zero-family-guard-absent-source-root");
fs.rmSync(absentRoot, { recursive: true, force: true });

const run = spawnSync(process.execPath, [DRIVER], {
  cwd: rootDir,
  env: { ...process.env, RCAP_BUNDLE_EXTRACT: absentRoot },
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024
});

// ---- 3. nonzero exit --------------------------------------------------------
check("exits_nonzero_on_absent_source_root", run.status !== 0,
  `exit status ${run.status}${run.status === 0 ? " — a run that processed nothing reported success" : ""}`);
check("refusal_names_the_source_root", /source root is absent/i.test(run.stderr ?? ""),
  (run.stderr ?? "").trim().split("\n")[0] || "(no stderr)");

// ---- 4. the index is untouched ----------------------------------------------
const hashAfter = sha256(INDEX);
const mtimeAfter = fs.statSync(INDEX).mtimeMs;
check("index_hash_unchanged", hashAfter === hashBefore, `${hashBefore.slice(0, 16)} -> ${hashAfter.slice(0, 16)}`);
check("index_not_rewritten_at_all", mtimeAfter === mtimeBefore,
  mtimeAfter === mtimeBefore ? "mtime unchanged; the file was not opened for writing" : "the file was rewritten, even if with identical bytes");
const familiesAfter = (JSON.parse(fs.readFileSync(INDEX, "utf8")).families ?? []).length;
check("index_still_describes_every_family", familiesAfter === familiesBefore, `${familiesBefore} -> ${familiesAfter}`);

// ---- 5. nothing was removed -------------------------------------------------
const artifactsAfter = artifactInventory();
const removed = artifactsBefore.filter((f) => !artifactsAfter.includes(f));
check("no_artifact_or_contact_sheet_removed", removed.length === 0,
  removed.length === 0 ? `${artifactsBefore.length} artifacts intact` : `${removed.length} removed, first: ${removed[0]}`);

// ---- the empty-but-present case ---------------------------------------------
// A source root that exists and holds nothing is the subtler version of the same
// failure: the first guard passes, every family is still skipped, and only the
// zero-processed gate stands between an empty run and the index.
fs.mkdirSync(absentRoot, { recursive: true });
const emptyRun = spawnSync(process.execPath, [DRIVER], {
  cwd: rootDir,
  env: { ...process.env, RCAP_BUNDLE_EXTRACT: absentRoot },
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024
});
check("exits_nonzero_on_empty_source_root", emptyRun.status !== 0, `exit status ${emptyRun.status}`);
check("refusal_names_zero_processed_families", /0 source-backed families/i.test(emptyRun.stderr ?? ""),
  (emptyRun.stderr ?? "").trim().split("\n")[0] || "(no stderr)");
check("index_survives_the_empty_root_run", sha256(INDEX) === hashBefore && fs.statSync(INDEX).mtimeMs === mtimeBefore,
  "hash and mtime both unchanged");
fs.rmSync(absentRoot, { recursive: true, force: true });

// ---- result -----------------------------------------------------------------
for (const c of checks) console.log(`  ${c.ok ? "ok  " : "FAIL"} ${c.name.padEnd(42)} ${c.detail}`);

if (failures.length > 0) {
  console.error(`FAIL zero-family guard — ${failures.length} property/properties do not hold`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`OK zero-family guard — ${checks.length} properties hold; a run with no source bytes exits nonzero and leaves the ${familiesBefore}-family index and all ${artifactsBefore.length} artifacts untouched`);
