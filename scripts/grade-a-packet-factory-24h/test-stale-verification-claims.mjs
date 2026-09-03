#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VERIFY = path.join(ROOT, "scripts/grade-a-packet-factory-24h/verify.mjs");
const GENERATE = path.join(ROOT, "scripts/grade-a-packet-factory-24h/generate.mjs");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-stale-vf-claim-"));

const fail = (message) => {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
};

const runInvariant = (name, { claims, expectedStatus, expectedText }) => {
  const activePath = path.join(temp, `${name}-active.json`);
  const ledgerPath = path.join(temp, `${name}-ledger.json`);
  fs.writeFileSync(activePath, `${JSON.stringify({ assignments: [{
    assignmentId: "VF02",
    lane: "independent-verification",
    itemKind: "streamingClaim",
    items: ["family-under-test"]
  }] }, null, 2)}\n`);
  fs.writeFileSync(ledgerPath, `${JSON.stringify({ claims }, null, 2)}\n`);
  const result = spawnSync(process.execPath, [VERIFY,
    "--check-verification-claim-invariant", activePath, ledgerPath], {
    cwd: ROOT,
    encoding: "utf8"
  });
  const output = `${result.stdout}${result.stderr}`;
  if (result.status !== expectedStatus) {
    fail(`${name}: expected exit ${expectedStatus}, got ${result.status}\n${output}`);
    return;
  }
  if (!output.includes(expectedText)) fail(`${name}: missing ${JSON.stringify(expectedText)}\n${output}`);
  else console.log(`ok ${name}`);
};

const liveClaim = {
  subjectType: "packet-family",
  subjectId: "family-under-test",
  familyId: "family-under-test",
  familyIds: ["family-under-test"],
  operation: "independent-verification",
  lane: "VF02",
  laneKind: "independent-verification",
  released: false,
  releasedAt: null
};

runInvariant("matching-live-claim", {
  claims: [liveClaim, { ...liveClaim, subjectId: "finished-off-dispatch", familyId: "finished-off-dispatch", familyIds: ["finished-off-dispatch"], released: true, releasedAt: "2026-09-03T00:00:00Z" }],
  expectedStatus: 0,
  expectedText: "VERIFICATION_CLAIMS_ASSERTABLE 1"
});
runInvariant("matching-released-claim", {
  claims: [{ ...liveClaim, released: true, releasedAt: "2026-09-03T00:00:00Z" }],
  expectedStatus: 1,
  expectedText: "released"
});
runInvariant("matching-truthy-released-claim", {
  claims: [{ ...liveClaim, released: "true", releasedAt: "2026-09-03T00:00:00Z" }],
  expectedStatus: 1,
  expectedText: "released"
});
runInvariant("missing-matching-claim", {
  claims: [],
  expectedStatus: 1,
  expectedText: "0 matching claims"
});
runInvariant("matching-claim-on-wrong-lane", {
  claims: [{ ...liveClaim, lane: "VF05" }],
  expectedStatus: 1,
  expectedText: "VF05"
});
runInvariant("matching-claim-with-wrong-lane-kind", {
  claims: [{ ...liveClaim, laneKind: "packet-repair" }],
  expectedStatus: 1,
  expectedText: "packet-repair"
});
runInvariant("duplicate-matching-claims", {
  claims: [liveClaim, { ...liveClaim }],
  expectedStatus: 1,
  expectedText: "2 matching claims"
});

const generatorActivePath = path.join(temp, "generator-active.json");
const generatorLedgerPath = path.join(temp, "generator-ledger.json");
const generatorValidLedgerPath = path.join(temp, "generator-valid-ledger.json");
const generatorActive = `${JSON.stringify({ assignments: [{
  assignmentId: "VF02",
  lane: "independent-verification",
  items: ["family-under-test"]
}] }, null, 2)}\n`;
const generatorLedger = `${JSON.stringify({ claims: [{
  ...liveClaim,
  released: true,
  releasedAt: "2026-09-03T00:00:00Z"
}] }, null, 2)}\n`;
fs.writeFileSync(generatorActivePath, generatorActive);
fs.writeFileSync(generatorLedgerPath, generatorLedger);
fs.writeFileSync(generatorValidLedgerPath, `${JSON.stringify({ claims: [
  liveClaim,
  { ...liveClaim,
    subjectId: "finished-off-dispatch",
    familyId: "finished-off-dispatch",
    familyIds: ["finished-off-dispatch"],
    released: true,
    releasedAt: "2026-09-03T00:00:00Z" }
] }, null, 2)}\n`);

const validGeneration = spawnSync(process.execPath, [GENERATE,
  "--check-verification-claim-invariant", generatorActivePath, generatorValidLedgerPath], {
  cwd: ROOT,
  encoding: "utf8"
});
const validGenerationOutput = `${validGeneration.stdout}${validGeneration.stderr}`;
if (validGeneration.status !== 0 || !validGenerationOutput.includes("VERIFICATION_CLAIMS_ASSERTABLE 1")) {
  fail(`generator rejected released history outside dispatch\n${validGenerationOutput}`);
} else console.log("ok generator-allows-released-off-dispatch-history");

for (let attempt = 1; attempt <= 2; attempt += 1) {
  const generation = spawnSync(process.execPath, [GENERATE,
    "--check-verification-claim-invariant", generatorActivePath, generatorLedgerPath], {
    cwd: ROOT,
    encoding: "utf8"
  });
  const generationOutput = `${generation.stdout}${generation.stderr}`;
  if (generation.status === 0) fail(`generator attempt ${attempt} accepted a released VF assignment`);
  else if (!generationOutput.includes("REFUSED_UNASSERTABLE_VERIFICATION_DISPATCH 1")
    || !generationOutput.includes("VF02/family-under-test")) {
    fail(`generator attempt ${attempt} failed for the wrong reason\n${generationOutput}`);
  }
}
if (fs.readFileSync(generatorActivePath, "utf8") !== generatorActive
  || fs.readFileSync(generatorLedgerPath, "utf8") !== generatorLedger) {
  fail("generator invariant check mutated its inputs and could reissue-loop");
} else if (!process.exitCode) console.log("ok generator-fails-closed-without-reissue-loop");

if (!process.exitCode) console.log("OK stale verification-claim regression");
