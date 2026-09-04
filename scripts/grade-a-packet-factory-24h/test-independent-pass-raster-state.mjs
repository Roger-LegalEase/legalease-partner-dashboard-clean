#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(ROOT, "scripts/grade-a-packet-factory-24h/generate.mjs"), "utf8");
const rasterQueueSource = fs.readFileSync(path.join(ROOT, "scripts/grade-a-packet-factory-24h/generate-raster-queue.mjs"), "utf8");
const fail = (message) => {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
};
const stateFrom = (name, pattern) => {
  const match = source.match(pattern);
  if (!match) {
    fail(`${name}: state branch was not found`);
    return null;
  }
  return match[1];
};

const rasterNotEligibleState = stateFrom("raster-not-eligible independent PASS",
  /independentReturn\?\.verdict === "PASS_COMPLETE_INDEPENDENT"\s*\n\s*&& rasterNotEligible\.has\(familyId\)\) state = "([A-Z_]+)";/);
const rasterPendingState = stateFrom("no-RASTER_PASS independent PASS",
  /independentReturn\?\.verdict === "PASS_COMPLETE_INDEPENDENT"\s*\n\s*&& rasterPassByFamily\.get\(familyId\) !== true\) state = "([A-Z_]+)";/);
const repairedWithoutRasterState = stateFrom("completed repair without current RASTER_PASS",
  /repairCompletionAnswersVerdict\(independentReturn\)\s*\n\s*&& familyMovedSinceVerdict\(independentReturn, directory, buildScript\)\s*\n\s*&& rasterPassByFamily\.get\(familyId\) !== true\) state = "([A-Z_]+)";/);
const stalePacketState = stateFrom("stale packet independent PASS",
  /independentReturn\?\.verdict === "PASS_COMPLETE_INDEPENDENT"\s*\n\s*&& familyMovedSinceVerdict\([^;]+\)\) state = "([A-Z_]+)";/);
const staleSourceState = stateFrom("stale source independent PASS",
  /independentReturn\?\.verdict === "PASS_COMPLETE_INDEPENDENT"\s*\n\s*&& boundSourceDriftedSinceVerdict\([^;]+\)\) state = "([A-Z_]+)";/);
const stalePacketAt = source.indexOf("&& familyMovedSinceVerdict(independentReturn, directory, buildScript)) state");
const staleSourceAt = source.indexOf("&& boundSourceDriftedSinceVerdict(directory)) state");
const rasterNotEligibleAt = source.indexOf("&& rasterNotEligible.has(familyId)) state");
const rasterPendingAt = source.indexOf("&& rasterPassByFamily.get(familyId) !== true) state");
if ([stalePacketAt, staleSourceAt, rasterNotEligibleAt, rasterPendingAt].some((position) => position < 0)
  || Math.max(stalePacketAt, staleSourceAt) >= Math.min(rasterNotEligibleAt, rasterPendingAt)) {
  fail("packet/source lapse must outrank both no-raster PASS branches");
}

const sixCurrentPassRows = [
  ["ca-1203-41-set", rasterPendingState],
  ["ca-1203-42-set", rasterPendingState],
  ["ca-1203-43-set", rasterPendingState],
  ["ca-1203-4a-set", rasterPendingState],
  ["ca-851-91-set", rasterPendingState],
  ["nj_disorderly_persons-set", rasterPendingState]
];
for (const [familyId, state] of sixCurrentPassRows) {
  if (state !== "BUILT_RASTER_PENDING") {
    fail(`${familyId}: current independent PASS without RASTER_PASS is ${state}, expected BUILT_RASTER_PENDING`);
  }
}
if (rasterNotEligibleState !== "BUILT_RASTER_PENDING") {
  fail(`raster-not-eligible-set: expected BUILT_RASTER_PENDING, got ${rasterNotEligibleState}`);
}
if (repairedWithoutRasterState !== "BUILT_RASTER_PENDING") {
  fail(`completed repair without current raster: expected BUILT_RASTER_PENDING, got ${repairedWithoutRasterState}`);
}
const pickFixtureBody = rasterQueueSource.match(/const pickFixture = \(dir, root, fixture, pdfs\) => \{([\s\S]*?)\n\};/)?.[1] ?? "";
if (!pickFixtureBody
  || pickFixtureBody.indexOf("pdfs.includes(exact)") < 0
  || pickFixtureBody.indexOf("pdfs.includes(exact)") > pickFixtureBody.indexOf("declaredFixture(dir, root, fixture, pdfs)")) {
  fail("an exact assembled canonical.pdf/boundary.pdf must outrank a component declaration");
}

const staleRows = [
  ["stale-packet-set", stalePacketState],
  ["stale-source-set", staleSourceState]
];
for (const [familyId, state] of staleRows) {
  if (state !== "VERIFY_PENDING") fail(`${familyId}: expected VERIFY_PENDING, got ${state}`);
}

const verificationDispatch = [...sixCurrentPassRows, ["raster-not-eligible-set", rasterNotEligibleState], ...staleRows]
  .filter(([, state]) => state === "VERIFY_PENDING")
  .map(([familyId]) => familyId);
for (const [familyId] of sixCurrentPassRows) {
  if (verificationDispatch.includes(familyId)) fail(`${familyId}: completed PASS was redundantly dispatched to VF`);
}
if (verificationDispatch.includes("raster-not-eligible-set")) {
  fail("raster-not-eligible-set: completed PASS was redundantly dispatched to VF");
}
for (const [familyId] of staleRows) {
  if (!verificationDispatch.includes(familyId)) fail(`${familyId}: stale evidence did not dispatch to VF`);
}
if (!/const verifyPending = remaining\.filter\(\(f\) => f\.state === "VERIFY_PENDING"\);/.test(source)) {
  fail("VF dispatch is no longer derived exclusively from VERIFY_PENDING state");
}

if (!process.exitCode) {
  console.log("ok six current independent PASS families await raster without VF dispatch");
  console.log("ok completed repairs with changed bytes await current raster without VF dispatch");
  console.log("ok an exact assembled packet outranks component declarations in raster selection");
  console.log("ok stale packet and source evidence remain VERIFY_PENDING and dispatch to VF");
}
