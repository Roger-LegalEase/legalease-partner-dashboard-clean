#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const verifier = fileURLToPath(new URL("./verify.mjs", import.meta.url));
const root = fs.mkdtempSync(path.join(os.tmpdir(), "packet-repair-return-reader-"));
const lane = "data/rcap-grade-a/packet-factory-24h/fix-test";
const cloud = "data/rcap-grade-a/codex-cloud/repair-test";
const counters = {
  knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0, unclassifiedBlanks: 0,
  incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0,
  invisibleWrites: 0, protectedWrites: 0, visualDefects: 0
};
const row = (itemId, extra = {}) => ({
  itemId, status: "COMPLETED", laneKind: "repair", repairedByThisLane: true,
  obligationsRepaired: ["REQUIRED_BEFORE_FILING"], countersAfter: { ...counters }, ...extra
});
const files = [];
const write = (rel, value) => {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === "string" ? value : JSON.stringify(value));
  files.push(rel);
};
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

try {
  git("init", "--quiet");
  git("config", "user.email", "fixture@example.invalid");
  git("config", "user.name", "Temporary repair-reader fixture");
  const stale = row("stale");
  const optionalLane = row("optional-lane-stale", { laneKind: undefined });
  const historicalJoint = row("joint-needs-order", { obligationsRepaired: ["KNOWN_PREFILLS"] });
  const changed = row("changed-existing", { obligationsRepaired: ["KNOWN_PREFILLS"] });
  write(`${lane}/rows.json`, { rows: [stale, optionalLane, historicalJoint, changed] });
  // Finding a different earlier row of the same family must not make an
  // unchanged second row appear to be new evidence.
  write(`${lane}/multiple-history.json`, { rows: [
    row("multiple-stale", { obligationsRepaired: ["KNOWN_PREFILLS"] }), row("multiple-stale")
  ] });
  write(`${lane}/malformed-history.json`, "{invalid before the verdict");
  write(`${lane}/wrong-shape-history.json`, { note: "no measurable old rows" });
  git("add", "--", ...files);
  git("commit", "--quiet", "-m", "Temporary verdict base");
  const base = git("rev-parse", "HEAD");

  write(`${lane}/rows.current-pa-va.json`, { rows: [row("alternate-name")] });
  write(`${cloud}/RETURN-02.json`, { rows: [row("cloud-alternate", { laneKind: "shared-host-repair" })] });
  write(`${lane}/rows.json`, { rows: [stale, optionalLane, historicalJoint, row("changed-existing")] });
  write(`${lane}/joint-a.json`, { rows: [row("joint", {
    obligationsRepaired: ["KNOWN_PREFILLS"], obligationsThisRowDoesNotDischarge: ["REQUIRED_BEFORE_FILING"]
  })] });
  write(`${lane}/joint-b.json`, { rows: [row("joint", {
    obligationsThisRowDoesNotDischarge: ["KNOWN_PREFILLS"]
  }), row("joint-needs-order")] });
  write(`${lane}/negative-rows.json`, { rows: [
    row("stopped", { status: "STOPPED" }),
    row("not-repairer", { repairedByThisLane: false }),
    row("wrong-lane", { laneKind: "independent-verification" }),
    row("mentioned-only", { obligationsRepaired: ["KNOWN_PREFILLS"], note: "REQUIRED_BEFORE_FILING remains open" }),
    row("withdrawn", { obligationsStillOpen: ["REQUIRED_BEFORE_FILING"] }),
    row("missing-counters", { countersAfter: {} }),
    row("partial-counters", { countersAfter: { knownRequiredFieldsMissing: 0 } }),
    row("nonzero-counters", { countersAfter: { ...counters, unclassifiedBlanks: 1 } }),
    row("extra-counter", { countersAfter: { ...counters, extra: 0 } })
  ] });
  write(`${lane}/malformed-history.json`, { rows: [row("malformed-history")] });
  write(`${lane}/wrong-shape-history.json`, { rows: [row("wrong-shape-history")] });
  write(`${lane}/mixed-shape.json`, { rows: [row("mixed-shape"), { status: "COMPLETED" }] });
  write(`${lane}/empty.json`, { rows: [] });
  write(`${lane}/malformed-current.json`, "{not JSON");
  write(`${lane}/nested/RETURN.json`, { rows: [row("nested-excluded")] });
  write(`${lane}/checkpoint.json`, { itemId: "checkpoint-excluded", status: "COMPLETED" });
  write(`${lane}/legacy.json`, { rows: [row("legacy-prose", {
    obligationsRepaired: undefined, obligationRepaired: "REQUIRED_BEFORE_FILING. Repaired the missing caption disclosure."
  })] });

  const cases = [];
  const expected = [];
  const add = (familyId, evidencePath = null, extra = {}) => {
    cases.push({ familyId, verifiedAtBase: base, failedObligationNames: ["REQUIRED_BEFORE_FILING"], ...extra });
    expected.push({ familyId, evidencePath });
  };
  add("alternate-name", `${lane}/rows.current-pa-va.json`);
  add("cloud-alternate", `${cloud}/RETURN-02.json`);
  add("changed-existing", `${lane}/rows.json`);
  add("joint", `${lane}/joint-b.json`, { failedObligationNames: ["KNOWN_PREFILLS", "REQUIRED_BEFORE_FILING"] });
  add("legacy-prose", `${lane}/legacy.json`);
  for (const name of [
    "stale", "optional-lane-stale", "multiple-stale", "stopped", "not-repairer", "wrong-lane",
    "mentioned-only", "withdrawn", "missing-counters", "partial-counters", "nonzero-counters",
    "extra-counter", "malformed-history", "wrong-shape-history", "mixed-shape", "nested-excluded", "checkpoint-excluded"
  ]) add(name);
  add("joint-needs-order", null, { failedObligationNames: ["KNOWN_PREFILLS", "REQUIRED_BEFORE_FILING"] });
  add("alternate-name", null, { verifiedAtBase: "f".repeat(40) });
  add("alternate-name", null, { verifiedAtBase: "not-a-commit" });
  add("alternate-name", null, { failedObligationNames: [] });
  const casesPath = path.join(root, "cases.json");
  fs.writeFileSync(casesPath, JSON.stringify(cases));
  const actual = JSON.parse(execFileSync(process.execPath, [
    verifier, "--check-post-repair-return-evidence", root, casesPath
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  assert.deepEqual(actual, expected);
  console.log(`OK ${cases.length} post-repair reader cases: alternate filenames, causal ordering, joint exact obligations and nine counters; temporary fixtures only`);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
