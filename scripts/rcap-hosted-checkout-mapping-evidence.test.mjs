import assert from "node:assert/strict";
import fs from "node:fs";
import { register } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { MS_CHECKOUT, msMappingEvidence } from "./rcap-hosted-checkout-route-contract.mjs";

register("./lib/ts-esm-loader.mjs", import.meta.url);
const gate = fs.readFileSync(new URL("./rcap-hosted-checkout-gate.mjs", import.meta.url), "utf8");
const caseId = "consumer_caller_profile_and_eligibility_mapping_exact";
const start = gate.indexOf("  const consumerMappingEvidence = msMappingEvidence(");
const end = gate.indexOf("  // Exactly the Captain-selected route.", start);
assert.ok(start >= 0 && end > start);
const recordStart = gate.indexOf("function record(");
const recordEnd = gate.indexOf("\nclass GateFailure", recordStart);
const source = `${gate.slice(recordStart, recordEnd)}\n${gate.slice(start, end)}`;
const { buildRenderJobSpec } = await import("../src/lib/rcap/render/job-contract.ts");
const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { packetRouteCanRender } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");
const { fulfillmentAuthorityFor } = await import("../src/lib/rcap/fulfillment/grade-a-admission.ts");
const { isConsumerPaymentAllowed } = await import("../src/lib/expungement-ai/eligibility-adapter.ts");
const mappingRequest = { packetId: "mapping-evidence", state: "MS", pathway: MS_CHECKOUT.pathwayId, trackId: "ms-nonconv", packetFields: {} };
const built = buildRenderJobSpec(mappingRequest);
const compiledProfile = getProfileByJurisdiction("MS");

function emit(change = () => {}) {
  const evidence = { cases: {} };
  const logs = [];
  const context = {
    evidence, console: { log: (line) => logs.push(line) }, sanitize: (value) => value,
    GateFailure: class extends Error {}, MS_CHECKOUT, msMappingEvidence,
    consumerProfileVersion: null, consumerPacketType: "custom_pleading",
    consumerResultCode: "packet_ready", isConsumerPaymentAllowed,
    compiledProfile, compiledPathway: compiledProfile.pathways.find((entry) => entry.id === MS_CHECKOUT.pathwayId),
    mappingRequest: structuredClone(mappingRequest), built: structuredClone(built),
    fulfillmentAuthorityFor, packetRouteCanRender
  };
  change(context);
  let refused = false;
  try { vm.runInNewContext(source, context); } catch (error) {
    if (!(error instanceof context.GateFailure)) throw error;
    refused = true;
  }
  const result = JSON.parse(JSON.stringify(evidence.cases[caseId]));
  assert.equal(refused, !result.passed);
  assert.deepEqual(JSON.parse(result.observed), result.details);
  assert.ok(logs.some((line) => line.includes(result.observed)));
  for (const operand of result.details.operands) {
    assert.ok(Object.hasOwn(operand, "actual"));
    assert.ok(Object.hasOwn(operand, "expected"));
  }
  return result;
}

test("real MS mapping emits every strict operand in evidence and log", () => {
  const result = emit();
  assert.equal(result.passed, true, result.observed);
  assert.equal(result.details.operands.length, 33);
});
for (const [field, expected] of [["profileId", "MS"], ["profileVersion", MS_CHECKOUT.profileVersion]]) {
  test(`wrong ${field} remains distinguishable in the emitted evidence`, () => {
    const result = emit((context) => { context.built.spec[field] = "WRONG"; });
    assert.equal(result.passed, false);
    const operand = result.details.operands.find((entry) => entry.operand === `built.spec.${field}`);
    assert.deepEqual(operand, { operand: `built.spec.${field}`, actual: "WRONG", actualType: "string", expected, passed: false });
  });
}
test("null spec preserves both undefined identity values", () => {
  const result = emit((context) => { context.built.spec = null; });
  assert.equal(result.passed, false);
  for (const field of ["profileId", "profileVersion"]) {
    const operand = result.details.operands.find((entry) => entry.operand === `built.spec.${field}`);
    assert.equal(operand.actual, "(undefined)");
    assert.equal(operand.actualType, "undefined");
    assert.equal(operand.passed, false);
  }
});

// Run the exact gate's complete local fixture preparation, stopping BEFORE SQL,
// auth, HTTP, Stripe or any write. No copied convergence/review implementation.
export async function prepareFixture(sourceText = gate) {
  const begin = sourceText.indexOf('  const { buildRenderJobSpec } = await import(');
  const stop = sourceText.indexOf('  const summaryJson = sqlText(', begin);
  assert.ok(begin >= 0 && stop > begin);
  const preparation = sourceText.slice(begin, stop).replaceAll('"../src/', `"${new URL("../src/", import.meta.url).href}`);
  const helper = new URL("./rcap-hosted-checkout-route-contract.mjs", import.meta.url).href;
  const script = `
    import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto";
    import {MS_CHECKOUT, msMappingEvidence} from ${JSON.stringify(helper)};
    const ROOT = ${JSON.stringify(process.cwd())};
    const evidence = {cases:{}};
    function record(id, passed, observed, details) {
      evidence.cases[id] = {passed, observed, details};
      if (!passed) throw new Error(id + ": " + observed);
    }
    ${preparation}
    export {evidence, mappingRequest, checkoutRequest, reviewed};
  `;
  try { return await import(`data:text/javascript;base64,${Buffer.from(script).toString("base64")}`); }
  catch (error) { throw new Error(error.message); }
}

test("real gate preparation selects only the exact MS reviewed fixture with explicit track", async () => {
  const result = await prepareFixture();
  assert.equal(result.mappingRequest.pathway, MS_CHECKOUT.pathwayId);
  assert.equal(result.mappingRequest.trackId, MS_CHECKOUT.trackId);
  assert.equal(result.checkoutRequest.pathway, MS_CHECKOUT.pathwayId);
  assert.equal(result.checkoutRequest.trackId, MS_CHECKOUT.trackId);
  assert.equal(result.reviewed.evaluation.pathwayId, MS_CHECKOUT.pathwayId);
  assert.equal(result.reviewed.pathway.pathwayLabel, MS_CHECKOUT.pathwayLabel);
});

test("a wrong reviewed pathway stops fixture preparation without trying another route", async () => {
  const anchor = 'const reviewed = settled.failure ? settled : buildReviewedFlow(settled);';
  assert.ok(gate.includes(anchor));
  const changed = gate.replace(anchor, anchor + '\n  if (reviewed.evaluation) reviewed.evaluation.pathwayId = "wrong-route";');
  await assert.rejects(prepareFixture(changed), /seeded_item_carries_reviewed_packet_information/);
});
