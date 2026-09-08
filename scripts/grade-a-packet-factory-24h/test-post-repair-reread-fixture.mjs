#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Tiny synthetic history, never a copy of the live repository or its dispatch.
// The child executes verify.mjs's production F31/F35 block and real Git reader.
const verifier = fileURLToPath(new URL("./verify.mjs", import.meta.url));
const root = fs.mkdtempSync(path.join(os.tmpdir(), "packet-f35-causal-fixture-"));
const dir = "data/rcap-grade-a/packet-factory-24h";
const familyId = "fixture-causal-reread";
const historyFamilyId = "fixture-preserved-refusal";
const packetDirectory = "data/rcap-grade-a/f35-fixture-packet";
const packetPath = `${packetDirectory}/packet.txt`;
const repairPath = `${dir}/fixture-repair/rows.json`;
const masterPath = `${dir}/MASTER_QUEUE.json`;
const returnsPath = `${dir}/VERIFIER_RETURNS.json`;
const counters = {
  knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0, unclassifiedBlanks: 0,
  incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0,
  invisibleWrites: 0, protectedWrites: 0, visualDefects: 0
};
const git = (...args) => execFileSync("git", args, {
  cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]
}).trim();
const write = (rel, value) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
};
const check = (name, failedIds) => {
  const child = spawnSync(process.execPath, [
    verifier, "--check-post-repair-reread-invariants", root
  ], { encoding: "utf8", maxBuffer: 128 * 1024 });
  assert.ifError(child.error);
  assert.equal(child.signal, null, `${name}: verifier terminated by a signal`);
  assert.equal(child.status, failedIds.length ? 1 : 0, `${name}: ${child.stderr.slice(0, 1000)}`);
  const results = JSON.parse(child.stdout);
  assert.deepEqual(results.map((result) => result.id), ["F31", "F35"], `${name}: actual checks required`);
  assert.deepEqual(results.filter((result) => !result.ok).map((result) => result.id), failedIds, name);
  return { name, failedIds, results };
};

try {
  git("init", "--quiet");
  git("config", "user.email", "fixture@example.invalid");
  git("config", "user.name", "Temporary F35 causal fixture");
  write(packetPath, "Synthetic packet before the known-prefill repair.\n");
  write(repairPath, { rows: [{
    itemId: familyId, status: "STOPPED", laneKind: "repair", repairedByThisLane: false
  }] });
  git("add", "--", packetPath, repairPath);
  git("commit", "--quiet", "-m", "Synthetic failed-verdict base");
  const base = git("rev-parse", "HEAD");
  const substantive = (family, lane) => ({
    familyId: family, lane, verdict: "FAIL_REPAIR_REQUIRED", verifiedAtBase: base,
    evidencePath: `${dir}/${lane}/rows.json`, isIndependentVerification: true,
    failedObligationNames: ["KNOWN_PREFILLS"]
  });
  const reread = substantive(familyId, "VF_FIXTURE_REREAD");
  const history = substantive(historyFamilyId, "VF_FIXTURE_HISTORY");
  const master = { minimumCaptainSha: base, families: [{
    familyId, state: "VERIFY_PENDING", directory: packetDirectory,
    selectedIndependentVerdict: { ...reread }, allNineCountersZero: true, counters
  }, {
    familyId: historyFamilyId, state: "FAIL_REPAIR_REQUIRED", selectedIndependentVerdict: { ...history }
  }] };
  // The reread deliberately has no preclaim history: F35 must enforce the
  // causal rule globally. A separate family gives F31 a non-vacuous subject.
  const verifierReturns = {
    rows: [reread, {
      familyId: historyFamilyId, lane: "VF_FIXTURE_REFUSAL",
      verdict: "BLOCKED_BEFORE_CLAIM", isIndependentVerification: true, verifiedAtBase: base
    }, history],
    refusedAtTheClaimGate: { rows: [`VF_FIXTURE_REFUSAL/${historyFamilyId}`] }
  };
  const completed = { rows: [{
    itemId: familyId, status: "COMPLETED", laneKind: "repair", repairedByThisLane: true,
    obligationsRepaired: ["KNOWN_PREFILLS"], countersAfter: counters
  }] };
  write(packetPath, "Synthetic packet after the known-prefill repair.\n");
  write(repairPath, completed);
  write(masterPath, master);
  write(returnsPath, verifierReturns);
  const activePath = `${dir}/ACTIVE_ASSIGNMENTS.json`;
  const ledgerPath = `${dir}/claim-ledger.json`;
  const rasterPath = `${dir}/RASTER_QUEUE.json`;
  const wavePath = "data/rcap-grade-a/launch-control/WAVE_2_VERIFICATION_LEDGER.json";
  write(activePath, { assignments: [{
    assignmentId: "VF_FIXTURE_REREAD", lane: "independent-verification", items: [familyId]
  }] });
  write(ledgerPath, { claims: [{
    lane: "FIX_FIXTURE", laneKind: "repair", familyIds: [familyId], released: true
  }, {
    lane: "VF_FIXTURE_REREAD", laneKind: "independent-verification", familyIds: [familyId], released: false
  }] });
  write(rasterPath, { rows: [] });
  write(wavePath, { rows: [] });
  git("add", "--", packetPath, repairPath, masterPath, returnsPath, activePath, ledgerPath, rasterPath, wavePath);
  git("commit", "--quiet", "-m", "Synthetic completed repair and independent reread dispatch");
  const head = git("rev-parse", "HEAD");
  assert.notEqual(base, head);
  const cases = [check("valid causal repair and executable reread baseline", [])];

  const revoked = structuredClone(completed);
  revoked.rows[0].status = "STOPPED";
  write(repairPath, revoked);
  cases.push(check("revoking the exact completed repair is refused", ["F35"]));
  write(repairPath, completed);
  check("completion restoration returns to the valid baseline", []);

  const currentBaseMaster = structuredClone(master);
  const currentBaseReturns = structuredClone(verifierReturns);
  currentBaseMaster.families[0].selectedIndependentVerdict.verifiedAtBase = head;
  currentBaseReturns.rows[0].verifiedAtBase = head;
  write(masterPath, currentBaseMaster);
  write(returnsPath, currentBaseReturns);
  cases.push(check("repair and artifacts that do not postdate the failed verdict are refused", ["F35"]));
  write(masterPath, master);
  write(returnsPath, verifierReturns);
  check("verdict restoration returns to the valid baseline", []);
  git("diff", "--quiet", "HEAD", "--");

  if (process.argv.includes("--json")) console.log(JSON.stringify({ cases, restored: true }));
  else {
    for (const result of cases) console.log(`  ${result.failedIds.length ? "detected" : "stayed green"} [F35] isolated: ${result.name}; F31 stayed green`);
    console.log("OK 3 isolated F35 controls, including a valid causal baseline; temporary fixture restored and removed");
  }
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
