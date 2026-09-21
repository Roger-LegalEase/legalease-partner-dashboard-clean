import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import { readPaRefusal, paRefusalEvidence, MS_CHECKOUT, msMappingEvidence } from "./rcap-hosted-checkout-route-contract.mjs";

register("./lib/ts-esm-loader.mjs", import.meta.url);
const pa = await readPaRefusal();

test("real PA label and canonical ID both refuse new jobs, Checkout, payment and sponsored credit", () => {
  const evidence = paRefusalEvidence(pa);
  assert.equal(evidence.passed, true, JSON.stringify(evidence));
  for (const operand of JSON.parse(JSON.stringify(evidence)).operands) {
    assert.ok(Object.hasOwn(operand, "actual"));
    assert.ok(Object.hasOwn(operand, "expected"));
  }
});

const mutations = [
  ["PA unexpectedly returns a render spec", (value) => { value.builds[0].spec = { profileId: "PA" }; }],
  ["PA canonical-ID input unexpectedly returns a render spec", (value) => { value.builds[1].spec = { profileId: "PA" }; }],
  ["PA no longer resolves retired", (value) => { value.builds[0].route.routeKind = "factory_v2"; }],
  ["PA resolver authorizes sales", (value) => { value.builds[0].route.sellable = true; }],
  ["PA resolver authorizes credits", (value) => { value.builds[0].route.creditConsumable = true; }],
  ...["consumer_checkout", "generation_admission", "sponsored_entitlement", "packet_credit_admission"].map((point) =>
    [`PA admits ${point}`, (value) => { value.admissions[point].admitted = true; }]),
  ...["checkout creation", "consumer payment authority", "sponsored entitlement", "packet credit consumption"].map((surface) =>
    [`PA fulfillment allows ${surface}`, (value) => { value.fulfillment[surface].allowed = true; }]),
  ["PA offers payment", (value) => { value.payment.enabled = true; value.payment.amountCents = 5000; }]
];
for (const [name, mutate] of mutations) {
  test(`negative: ${name}`, () => {
    const changed = structuredClone(pa);
    mutate(changed);
    const evidence = paRefusalEvidence(changed);
    assert.equal(evidence.passed, false);
    assert.ok(evidence.operands.some((operand) => !operand.passed));
  });
}

const { buildRenderJobSpec } = await import("../src/lib/rcap/render/job-contract.ts");
const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { packetRouteCanRender } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");
const { fulfillmentAuthorityFor } = await import("../src/lib/rcap/fulfillment/grade-a-admission.ts");
const { isConsumerPaymentAllowed } = await import("../src/lib/expungement-ai/eligibility-adapter.ts");
const request = { packetId: "ms-contract-proof", state: MS_CHECKOUT.jurisdiction,
  pathway: MS_CHECKOUT.pathwayId, trackId: MS_CHECKOUT.trackId, packetFields: {} };
const built = buildRenderJobSpec(request);
const compiledProfile = getProfileByJurisdiction("MS");
const ms = {
  request, built, compiledProfile,
  compiledPathway: compiledProfile.pathways.find((entry) => entry.id === MS_CHECKOUT.pathwayId),
  authority: fulfillmentAuthorityFor(MS_CHECKOUT.routeId),
  renderable: packetRouteCanRender(built.route),
  paymentAllowed: isConsumerPaymentAllowed("packet_ready", true),
  consumerProfileVersion: null, consumerPacketType: "custom_pleading"
};

test("exact canonical MS identity proves factory rendering and current Grade-A family authority", () => {
  const evidence = msMappingEvidence(ms);
  assert.equal(evidence.passed, true, JSON.stringify(evidence));
});

for (const [name, mutate] of [
  ["wrong explicit track", (v) => { v.request.trackId = "ms-other"; }],
  ["missing explicit track", (v) => { v.request.trackId = null; }],
  ["wrong request pathway", (v) => { v.request.pathway = "different-pathway"; }],
  ["wrong resolved route", (v) => { v.built.spec.routeId = "WY:another-authorized-route"; }],
  ["wrong resolved pathway", (v) => { v.built.route.pathwayId = "different-pathway"; }],
  ["wrong profile ID", (v) => { v.built.spec.profileId = "PA"; }],
  ["wrong profile version", (v) => { v.built.spec.profileVersion = "old-version"; }],
  ["null spec", (v) => { v.built.spec = null; }],
  ["wrong packet family", (v) => { v.built.route.factoryV2.packetFamilyId = "other-family"; }],
  ["wrong renderer", (v) => { v.built.spec.rendererKind = "none"; }],
  ["wrong renderer version", (v) => { v.built.spec.rendererVersion = "0.0.0"; }],
  ["commercially unproven family", (v) => { v.authority.authorized = false; }],
  ["another route's commercial authority", (v) => { v.authority.routeId = "WY:another-authorized-route"; }],
  ["negative payment predicate", (v) => { v.paymentAllowed = false; }]
]) {
  test(`negative: MS ${name}`, () => {
    const value = structuredClone(ms);
    mutate(value);
    assert.equal(msMappingEvidence(value).passed, false);
  });
}

test("real builder with wrong track cannot be accepted", () => {
  const wrong = { ...request, trackId: "ms-other" };
  const result = buildRenderJobSpec(wrong);
  assert.equal(msMappingEvidence({ ...ms, request: wrong, built: result }).passed, false);
});

test("display label is not silently treated as the canonical MS route ID", () => {
  const label = { ...request, pathway: MS_CHECKOUT.pathwayLabel };
  const result = buildRenderJobSpec(label);
  assert.equal(result.route.routeKind, "legacy_retired");
  assert.equal(result.spec, null);
  assert.equal(msMappingEvidence({ ...ms, request: label, built: result }).passed, false);
});
