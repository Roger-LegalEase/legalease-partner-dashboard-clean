#!/usr/bin/env node
// The four-hour checkpoint verifier.
//
//   node scripts/grade-a-launch-control/verify-launch-control.mjs [--mutations]
//
// Eleven refusals. Each is a way the control plane could look healthy while
// being wrong, and each has cost something in this sprint or in the one before
// it. A checkpoint that only reports numbers tells you what it was told; this
// asks whether it was told the truth.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MUTATIONS = process.argv.includes("--mutations");
const LC = "data/rcap-grade-a/launch-control/LAUNCH_CONTROL.json";
const REUSE = "data/rcap-grade-a/launch-control/reuse-index.json";
const DISPATCH = "data/rcap-grade-a/launch-control/first-wave-assignments.json";
const SUPERSEDED = "data/rcap-grade-a/launch-control/SUPERSEDED_STATUS_RECORDS.json";
const FREEZE = "data/rcap-grade-a/route-obligation-census-v1/FREEZE.json";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 29 }).trim(); } catch { return null; } };

const results = [];
let failures = 0;
const check = (id, title, passed, observed = "") => {
  results.push({ id, title, passed });
  if (!passed) failures += 1;
  console.log(`  ${passed ? "ok  " : "FAIL"} ${id} ${title}`);
  if (!passed && observed) console.log(`         observed: ${observed}`);
};

const lc = read(LC);
const reuse = read(REUSE);
const dispatch = read(DISPATCH);
const superseded = read(SUPERSEDED);
const freeze = read(FREEZE);

// 1. Two records claiming current authority.
{
  const claimants = [];
  const scan = (rel) => {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) return;
    const text = fs.readFileSync(full, "utf8");
    if (/thisIsTheControllingLaunchRecord/.test(text)) claimants.push(rel);
  };
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (entry.name.endsWith(".json")) scan(rel);
    }
  };
  walk("data/rcap-grade-a");
  check("A1", "exactly one record claims current launch authority", claimants.length === 1, claimants.join(", "));
  const listed = new Set(superseded.superseded.map((s) => s.record));
  check("A2", "every superseded status record points at the controlling one",
    superseded.controllingRecord === LC && listed.size === superseded.superseded.length);
}

// 2. Duplicate route/family ownership across assignments.
{
  const seen = new Map(); const dupes = [];
  for (const a of dispatch.assignments) for (const row of a.rows) {
    if (seen.has(row)) dupes.push(`${row}: ${seen.get(row)} + ${a.key}`); else seen.set(row, a.key);
  }
  check("A3", "no row or family is owned by two assignments", dupes.length === 0, dupes.slice(0, 3).join(" | "));
}

// 3. Placeholder assignment values.
{
  const bad = dispatch.assignments.filter((a) => /\b(TBD|TODO|FIXME|XXX)\b/i.test(JSON.stringify(a)));
  check("A4", "no assignment carries a placeholder value", bad.length === 0, bad.map((a) => a.key).join(", "));
}

// 4. Overlapping worker-owned paths.
{
  const roots = new Map(); const clashes = [];
  for (const a of dispatch.assignments) for (const p of a.ownedPaths) {
    const root = p.split("(")[0].trim();
    if (roots.has(root) && roots.get(root) !== a.key) clashes.push(`${root}: ${roots.get(root)} + ${a.key}`);
    roots.set(root, a.key);
  }
  check("A5", "no two assignments own the same path", clashes.length === 0, clashes.slice(0, 3).join(" | "));
}

// 5. An assignment based on a nonancestor.
{
  const base = dispatch.captainBaseSha;
  const isAncestor = git(["merge-base", "--is-ancestor", base, "HEAD"]) !== null;
  check("A6", "every assignment branches from a commit that is an ancestor of the current tip", isAncestor, base);
  check("A7", "every assignment records that same base",
    dispatch.assignments.every((a) => a.captainBaseSha === base));
}

// 6. An active assignment lacking a reuse decision.
{
  const withoutReuse = dispatch.assignments.filter((a) => a.reuseChecked !== true);
  check("A8", "every assignment carries a reuse record", withoutReuse.length === 0, withoutReuse.map((a) => a.key).join(", "));
  // A packet lane may only receive a family that is free to dispatch.
  const free = new Set(reuse.families.filter((f) => f.freeToDispatch).map((f) => f.worklistGroupId));
  const wrong = [];
  for (const a of dispatch.assignments.filter((x) => x.lane === "packet")) {
    for (const family of a.rows) if (!free.has(family)) wrong.push(`${a.key}:${family}`);
  }
  check("A9", "no packet lane is given a family that already has evidence", wrong.length === 0, wrong.slice(0, 3).join(", "));
}

// 7. A completed assignment without a worker commit.
{
  const completedWithoutCommit = dispatch.assignments
    .filter((a) => a.status === "completed" && !a.workerCommit);
  check("A10", "no assignment is marked completed without a worker commit",
    completedWithoutCommit.length === 0, completedWithoutCommit.map((a) => a.key).join(", "));
}

// 8. A family counted as built without required evidence.
{
  const overlays = path.join(ROOT, "data/rcap-all50/overlays/census-v1");
  const missingEvidence = [];
  if (fs.existsSync(overlays)) {
    for (const state of fs.readdirSync(overlays)) {
      const stateDir = path.join(overlays, state);
      if (!fs.statSync(stateDir).isDirectory()) continue;
      for (const family of fs.readdirSync(stateDir)) {
        const dir = path.join(stateDir, family);
        const hasFixtures = fs.existsSync(path.join(dir, "fixtures"));
        const hasSourceReceipt = fs.readdirSync(dir).some((f) => /source-(receipt|verification|gate|binding)/.test(f));
        if (hasFixtures && !hasSourceReceipt) missingEvidence.push(`${state}/${family}`);
      }
    }
  }
  check("A11", "no family carries rendered fixtures without a source record",
    missingEvidence.length === 0, missingEvidence.join(", "));
}

// 9. A route counted commercially open without Grade-A proof.
{
  const opened = lc.productPath.commercialRoutesOpened;
  const proven = lc.packetFamilies.completePacketProven;
  check("A12", "no route is commercially open without a proven packet behind it",
    opened === 0 || opened <= proven, `opened ${opened}, proven ${proven}`);
}

// 10. Unexplained denominator movement.
{
  const d = lc.denominator;
  check("A13", "the launch record's denominator is the frozen census denominator",
    d.terminalObligations === freeze.totals.totalObligations
    && d.categoryA === freeze.totals.categoryA
    && d.categoryB === freeze.totals.categoryB
    && d.packetFamilies === freeze.totals.packetFamilies,
    `${d.terminalObligations}/${d.categoryA}/${d.categoryB}/${d.packetFamilies} vs frozen ${freeze.totals.totalObligations}/${freeze.totals.categoryA}/${freeze.totals.categoryB}/${freeze.totals.packetFamilies}`);
}

// 11. A stale checkpoint claiming current status.
//
// Exact equality with HEAD cannot be the test: the record is committed, and
// committing it moves HEAD past it. That is the same self-reference the
// two-commit dispatch method exists to avoid, and demanding equality would make
// the check impossible to satisfy rather than hard to fool.
//
// The real question is whether anything the record DEPENDS ON has changed since
// it was generated. So: the recorded tip must be an ancestor of HEAD, and every
// record the launch control consumes must be byte-identical between that tip
// and HEAD. A launch record generated before a commit that did not touch its
// inputs is still current; one generated before a commit that did is not.
{
  const recorded = lc.lineage.captainSha;
  const head = git(["rev-parse", "HEAD"]);
  const isAncestor = recorded === head
    || git(["merge-base", "--is-ancestor", recorded, "HEAD"]) !== null;
  check("A14", "the launch record was generated at a commit that is still in this history", isAncestor,
    `record ${String(recorded).slice(0, 8)} is not an ancestor of head ${String(head).slice(0, 8)}`);

  const drifted = [];
  if (isAncestor && recorded !== head) {
    for (const consumed of Object.values(lc.consumes)) {
      const before = git(["rev-parse", `${recorded}:${consumed}`]);
      const after = git(["rev-parse", `HEAD:${consumed}`]);
      if (before !== after) drifted.push(consumed);
    }
  }
  check("A15", "no record the launch control consumes has changed since it was generated",
    drifted.length === 0,
    `${drifted.length} input(s) moved: ${drifted.join(", ")} — regenerate rather than reading a stale checkpoint as current`);
}

console.log(`\n${results.length - failures}/${results.length} checkpoint checks passed.`);

if (MUTATIONS) {
  console.log("\nmutations:");
  const target = path.join(ROOT, DISPATCH);
  const original = fs.readFileSync(target);
  const cases = [
    { name: "a duplicated row across two assignments is caught", mutate: (j) => { j.assignments[1].rows.push(j.assignments[0].rows[0]); return j; } },
    { name: "a placeholder value is caught", mutate: (j) => { j.assignments[0].mission = "TBD"; return j; } },
    { name: "an overlapping owned path is caught", mutate: (j) => { j.assignments[1].ownedPaths = [...j.assignments[0].ownedPaths]; return j; } },
    { name: "a nonancestor base is caught", mutate: (j) => { j.captainBaseSha = "0".repeat(40); return j; } },
    { name: "an assignment without a reuse record is caught", mutate: (j) => { j.assignments[0].reuseChecked = false; return j; } },
    { name: "a completed assignment with no worker commit is caught", mutate: (j) => { j.assignments[0].status = "completed"; return j; } },
    { name: "a packet lane given an already-built family is caught", mutate: (j) => { j.assignments.find((a) => a.lane === "packet").rows.push("ar-arrest-seal-set"); return j; } },
    { name: "an assignment recording a different base than the manifest is caught", mutate: (j) => { j.assignments[2].captainBaseSha = "1".repeat(40); return j; } }
  ];
  let undetected = 0;
  try {
    for (const testCase of cases) {
      fs.writeFileSync(target, JSON.stringify(testCase.mutate(JSON.parse(original.toString("utf8"))), null, 2) + "\n");
      let caught = false;
      try { execFileSync(process.execPath, [fileURLToPath(import.meta.url)], { cwd: ROOT, stdio: "pipe" }); }
      catch { caught = true; }
      console.log(`  ${caught ? "detected " : "MISSED   "} ${testCase.name}`);
      if (!caught) undetected += 1;
      fs.writeFileSync(target, original);
    }
  } finally { fs.writeFileSync(target, original); }
  const restored = fs.readFileSync(target).equals(original);
  console.log(`\n  every mutated file restored byte-for-byte: ${restored}`);
  if (!restored || undetected > 0) { console.error("the checkpoint proves less than it claims."); process.exit(1); }
  console.log(`\nOK checkpoint mutations — ${cases.length} case(s), every mutation caught.`);
}

if (failures > 0) { console.error(`\n${failures} checkpoint check(s) FAILED.`); process.exit(1); }
