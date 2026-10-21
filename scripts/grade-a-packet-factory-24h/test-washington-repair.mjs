#!/usr/bin/env node
// Run the actual generator with in-memory queue/return mutations and a capturing
// emitter. No repository file, claim, packet, or generated output is written.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GENERATOR = path.join(ROOT, "scripts/grade-a-packet-factory-24h/generate-washington-repair.mjs");
const OUT = "data/rcap-grade-a/packet-factory-24h/WASHINGTON_REPAIR.json";
const QUEUE = path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json");
const LEDGER = path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/claim-ledger.json");
const CHANGED_ENTRYPOINT = path.join(ROOT, "scripts/build-census-v1-wa_vac_homicide_victim_prostitution-set.mjs");
const source = fs.readFileSync(GENERATOR, "utf8")
  .replace(/^import .*;\n/gm, "")
  .replaceAll("import.meta.url", JSON.stringify(pathToFileURL(GENERATOR).href));
const familyIds = JSON.parse(fs.readFileSync(path.join(ROOT, OUT), "utf8")).evidence.map((e) => e.familyId);
const queue = { families: familyIds.map((familyId) => ({ familyId, state: "COMPLETE_PACKET_PROVEN", executionOwner: null })) };
Object.assign(queue.families.find((f) => f.familyId === "wa_vac_homicide_victim_prostitution-set"), { state: "LEGAL_BLOCKED" });
Object.assign(queue.families.find((f) => f.familyId === "wa_vac_substance_use_disorder-set"), { state: "PRODUCT_PATH_PENDING", executionOwner: "CAPTAIN" });

class GeneratorExit extends Error {
  constructor(code) { super(`generator exited ${code}`); this.code = code; }
}

function run({ revivedFamily, returnedLane = false, missingHistory = false } = {}) {
  const fixtureQueue = structuredClone(queue);
  if (revivedFamily) {
    const family = fixtureQueue.families.find((f) => f.familyId === revivedFamily);
    assert.ok(family, "revival fixture family exists");
    family.state = "FAIL_REPAIR_REQUIRED";
  }
  const emitted = new Map();
  const errors = [];
  let failure = null;
  const fixtureFs = Object.create(fs);
  fixtureFs.readFileSync = (file, ...args) => {
    const resolved = path.resolve(String(file));
    if (resolved === QUEUE) return JSON.stringify(fixtureQueue);
    if (resolved === LEDGER) return JSON.stringify({ claims: [] });
    if (resolved === CHANGED_ENTRYPOINT) return "// Family-exclusive repair: no shared-host import.\n";
    return fs.readFileSync(file, ...args);
  };
  fixtureFs.existsSync = (file) => returnedLane && String(file).endsWith("/war01-wa-shared-instruction-host")
    ? true : fs.existsSync(file);
  try {
    vm.runInNewContext(source, {
      fs: fixtureFs, path, fileURLToPath,
      execFileSync: (command, args, options) => {
        if (missingHistory && command === "git" && args[0] === "show") throw new Error("historical object absent");
        return execFileSync(command, args, options);
      },
      // This test concerns dispatch scope and source revision, not the separately
      // checked preflight denominator or emitter convergence implementation.
      preflightDenominator: () => ({ mustReturn: "PACKET_BUILD_ENVIRONMENT_READY: test fixture" }),
      makeEmitter: () => ({
        emit: (file, content) => emitted.set(file, content), sweep() {}, finish() {}
      }),
      process: { argv: [process.execPath, GENERATOR], chdir() {}, exit: (code) => { throw new GeneratorExit(code); } },
      console: { log() {}, error: (message) => errors.push(String(message)) }
    }, { filename: GENERATOR });
  } catch (error) { failure = error; }
  return { emitted, errors, failure };
}

const retired = run();
assert.equal(retired.failure, null, retired.errors.join("\n"));
const document = JSON.parse(retired.emitted.get(OUT));
assert.equal(document.retirement.status, "RETIRED_NEVER_EXECUTED");
assert.deepEqual(document.assignments, []);
assert.equal(document.retiredAssignments.length, 6);
assert.equal(document.rootCauseAnalysis.importGraphAt, document.dispatchBase);
assert.equal(document.rootCauseAnalysis.everyFamilyImportsTheHost, true);
assert.equal(document.rootCauseAnalysis.importGraph.length, 9);
assert.deepEqual(document.retirement.measuredOn.familiesHeldOutsidePacketRepair, [
  { familyId: "wa_vac_homicide_victim_prostitution-set", state: "LEGAL_BLOCKED", executionOwner: null },
  { familyId: "wa_vac_substance_use_disorder-set", state: "PRODUCT_PATH_PENDING", executionOwner: "CAPTAIN" }
]);
for (const held of document.retirement.measuredOn.familiesHeldOutsidePacketRepair) {
  assert.ok(!document.retirement.measuredOn.familiesAlreadySettled.includes(held.familyId));
}
for (const assignment of document.retiredAssignments) {
  assert.match(retired.emitted.get(assignment.promptFile), /RETIRED — DO NOT RUN/);
}

for (const mutation of [
  { revivedFamily: "wa_vac_homicide_victim_prostitution-set" },
  { returnedLane: true }
]) {
  const result = run(mutation);
  assert.equal(result.failure?.code, 1, "revival with changed current imports must fail");
  assert.match(result.errors.join("\n"), /not every Washington family imports the shared host/);
  assert.equal(result.emitted.size, 0, "a rejected revival must emit no ownership");
}
const missingHistory = run({ missingHistory: true });
assert.match(missingHistory.failure?.message ?? "", /cannot read dispatch import evidence/);
assert.equal(missingHistory.emitted.size, 0, "missing historical bytes must not become accepted evidence");
console.log("Washington repair regression: retired graph and separate holds pass; 3 refusal controls caught; no files written.");
