import assert from "node:assert/strict";
import fs from "node:fs";
import { register } from "node:module";
import vm from "node:vm";
import test from "node:test";

register("./lib/ts-esm-loader.mjs", import.meta.url);
const { buildRenderJobSpec } = await import("../src/lib/rcap/render/job-contract.ts");
const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { isConsumerPaymentAllowed } = await import("../src/lib/expungement-ai/eligibility-adapter.ts");

const gate = fs.readFileSync(new URL("./rcap-hosted-checkout-gate.mjs", import.meta.url), "utf8");
const caseId = "consumer_caller_profile_and_eligibility_mapping_exact";
const start = gate.indexOf("  const consumerMappingEvidence = {");
const end = gate.indexOf("  const routeIdentity = {", start);
assert.ok(start >= 0 && end > start, "the real gate's evidence and assertion must be executable");
const recordStart = gate.indexOf("function record(");
const recordEnd = gate.indexOf("\nclass GateFailure", recordStart);
const source = `${gate.slice(recordStart, recordEnd)}\n${gate.slice(start, end)}`;
const PA_PATHWAY = "Path A — Non-conviction expungement";

function emit(overrides = {}) {
  const evidence = { cases: {} };
  const logs = [];
  const context = {
    evidence, console: { log: (line) => logs.push(line) }, sanitize: (value) => value,
    GateFailure: class extends Error {}, PA_PATHWAY,
    consumerProfileVersion: null, consumerPacketType: "custom_pleading",
    consumerResultCode: "packet_ready", isConsumerPaymentAllowed,
    compiledProfile: { jurisdiction: { code: "PA" }, profileVersion: "fixture-version" },
    compiledPathway: { label: PA_PATHWAY },
    built: { spec: { profileVersion: "fixture-version", profileId: "PA" }, route: {} },
    ...overrides
  };
  let refused = false;
  try { vm.runInNewContext(source, context); } catch (error) {
    if (!(error instanceof context.GateFailure)) throw error;
    refused = true;
  }
  const emitted = JSON.parse(JSON.stringify(evidence.cases[caseId]));
  assert.equal(refused, !emitted.passed);
  assert.deepEqual(JSON.parse(emitted.observed), emitted.details);
  assert.ok(logs.some((line) => line.includes(emitted.observed)), "all operands must also reach the log");
  assert.equal(emitted.details.operands.length, 7);
  for (const operand of emitted.details.operands) {
    assert.ok(Object.hasOwn(operand, "actual"));
    assert.ok(Object.hasOwn(operand, "expected"));
    assert.equal(typeof operand.passed, "boolean");
  }
  return emitted;
}

test("all seven satisfied operands are emitted by the real record function", () => {
  assert.equal(emit().passed, true);
});

for (const [field, expected] of [["profileVersion", "fixture-version"], ["profileId", "PA"]]) {
  test(`a wrong ${field} fails and exposes actual/expected in evidence and log`, () => {
    const result = emit({ built: { spec: { profileVersion: "fixture-version", profileId: "PA", [field]: "WRONG" }, route: {} } });
    assert.equal(result.passed, false);
    assert.deepEqual(result.details.operands.filter((operand) => !operand.passed), [{
      operand: `built.spec.${field}`, actual: "WRONG", actualType: "string", expected, passed: false
    }]);
  });
}

test("a refused specification exposes both missing operands without JSON dropping them", () => {
  const result = emit({ built: { spec: null, route: { routeKind: "legacy_retired" } } });
  assert.equal(result.passed, false);
  assert.equal(result.details.specPresent, false);
  assert.deepEqual(result.details.operands.filter((operand) => !operand.passed).map((operand) => [operand.operand, operand.actual, operand.actualType]), [
    ["built.spec.profileVersion", "(undefined)", "undefined"],
    ["built.spec.profileId", "(undefined)", "undefined"]
  ]);
});

test("current Pennsylvania Path A reproduces both failures through the real builder and registry", () => {
  const compiledProfile = getProfileByJurisdiction("PA");
  const consumerRenderSource = fs.readFileSync(new URL("../src/lib/expungement-ai/consumer-render-request.ts", import.meta.url), "utf8");
  const eligibilitySource = fs.readFileSync(new URL("../src/lib/expungement-ai/eligibility-adapter.ts", import.meta.url), "utf8");
  const result = emit({
    consumerProfileVersion: consumerRenderSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
      .match(/buildRenderJobSpec\(\{[\s\S]*?profileVersion:\s*"([^"]+)"/)?.[1] ?? null,
    consumerPacketType: eligibilitySource.match(/resultCode === "packet_ready"\s*\|\|\s*resultCode === "packet_ready_with_caution"\)\s*return "([^"]+)"/)?.[1] ?? null,
    compiledProfile,
    compiledPathway: compiledProfile?.pathways?.find((candidate) => candidate.label === PA_PATHWAY) ?? null,
    built: buildRenderJobSpec({ packetId: "00000000-0000-4000-8000-000000000001", state: "PA", pathway: PA_PATHWAY,
      briefcaseItemId: "00000000-0000-4000-8000-000000000002", trackId: null, packetFields: {} })
  });
  assert.equal(result.passed, false, "diagnostic repair must not make the conflicting gate green");
  assert.equal(result.details.routeKind, "legacy_retired");
  assert.deepEqual(result.details.operands.map((operand) => operand.passed), [true, true, true, true, true, false, false]);
  console.log(`CANDIDATE REPRODUCTION ${JSON.stringify(result)}`);
});
