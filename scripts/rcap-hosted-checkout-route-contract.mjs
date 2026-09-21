// Acceptance-only contracts. These read the product's authority; they grant none.
export const PA_REFUSAL = Object.freeze({
  jurisdiction: "PA",
  pathwayId: "path-a-non-conviction-expungement",
  pathwayLabel: "Path A — Non-conviction expungement"
});

export const MS_CHECKOUT = Object.freeze({
  jurisdiction: "MS",
  pathwayId: "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal",
  pathwayLabel: "Non-conviction expungement for dismissal, no disposition, or acquittal",
  routeId: "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal",
  trackId: "ms-nonconv",
  packetFamilyId: "ms-nonconv-set",
  profileVersion: "2026-06-19-source-conversion-1"
});

export function msMappingEvidence({ request, built, compiledProfile, compiledPathway, authority,
  renderable, paymentAllowed, consumerProfileVersion, consumerPacketType }) {
  return operandEvidence([
    ["consumerProfileVersion", consumerProfileVersion, null],
    ["consumerPacketType", consumerPacketType, "custom_pleading"],
    ["paymentAllowed", paymentAllowed, true],
    ["request.state", request.state, MS_CHECKOUT.jurisdiction],
    ["request.pathway", request.pathway, MS_CHECKOUT.pathwayId],
    ["request.trackId", request.trackId, MS_CHECKOUT.trackId],
    ["compiledProfile.jurisdiction.code", compiledProfile?.jurisdiction?.code, MS_CHECKOUT.jurisdiction],
    ["compiledProfile.profileVersion", compiledProfile?.profileVersion, MS_CHECKOUT.profileVersion],
    ["compiledPathway.id", compiledPathway?.id, MS_CHECKOUT.pathwayId],
    ["compiledPathway.label", compiledPathway?.label, MS_CHECKOUT.pathwayLabel],
    ["specPresent", Boolean(built.spec), true],
    ["built.spec.profileVersion", built.spec?.profileVersion, MS_CHECKOUT.profileVersion],
    ["built.spec.profileId", built.spec?.profileId, MS_CHECKOUT.jurisdiction],
    ["built.spec.routeId", built.spec?.routeId, MS_CHECKOUT.routeId],
    ["built.spec.rendererKind", built.spec?.rendererKind, "packet_document_v1"],
    ["built.spec.rendererVersion", built.spec?.rendererVersion, "1.0.0"],
    ["built.spec.sourceSha256", built.spec?.sourceSha256, null],
    ["built.route.routeKind", built.route?.routeKind, "factory_v2"],
    ["built.route.jurisdiction", built.route?.jurisdiction, MS_CHECKOUT.jurisdiction],
    ["built.route.pathwayId", built.route?.pathwayId, MS_CHECKOUT.pathwayId],
    ["built.route.factoryV2.packetFamilyId", built.route?.factoryV2?.packetFamilyId, MS_CHECKOUT.packetFamilyId],
    ["built.route.factoryV2.packetSetIds", JSON.stringify(built.route?.factoryV2?.packetSetIds), JSON.stringify([MS_CHECKOUT.packetFamilyId])],
    ["built.route.factoryV2.registryTrackIds", JSON.stringify(built.route?.factoryV2?.registryTrackIds), JSON.stringify([MS_CHECKOUT.trackId])],
    ["built.route.factoryV2.profileVersion", built.route?.factoryV2?.profileVersion, MS_CHECKOUT.profileVersion],
    // Factory resolution is technical capability, never commercial authority.
    ["built.route.sellable", built.route?.sellable, false],
    ["built.route.creditConsumable", built.route?.creditConsumable, false],
    ["renderable", renderable, true],
    ["authority.routeId", authority?.routeId, MS_CHECKOUT.routeId],
    ["authority.jurisdiction", authority?.jurisdiction, MS_CHECKOUT.jurisdiction],
    ["authority.packetFamilyId", authority?.packetFamilyId, MS_CHECKOUT.packetFamilyId],
    ["authority.state", authority?.state, "COMPLETE_PACKET_PROVEN"],
    ["authority.commercialStatus", authority?.commercialStatus, "commercially_eligible"],
    ["authority.authorized", authority?.authorized, true]
  ]);
}

export function operandEvidence(entries, context = {}) {
  const operands = entries.map(([operand, actual, expected]) => ({
    operand,
    actual: actual === undefined ? "(undefined)" : actual,
    actualType: typeof actual,
    expected: expected === undefined ? "(undefined)" : expected,
    passed: actual === expected
  }));
  return { ...context, passed: operands.every((entry) => entry.passed), operands };
}

export async function readPaRefusal() {
  const { buildRenderJobSpec } = await import("../src/lib/rcap/render/job-contract.ts");
  const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
  const { admitCommercial } = await import("../src/lib/rcap/fulfillment/grade-a-admission.ts");
  const { packetFulfillmentAuthority } = await import("../src/lib/expungement-ai/packet-fulfillment-authority.ts");
  const { createConsumerPaymentPlaceholder } = await import("../src/lib/expungement-ai/payment-adapter.ts");
  const profile = getProfileByJurisdiction(PA_REFUSAL.jurisdiction);
  const pathway = profile?.pathways.find((entry) => entry.id === PA_REFUSAL.pathwayId);
  // Exercise the former label input AND the canonical ID. Neither may reopen PA.
  const builds = [PA_REFUSAL.pathwayLabel, PA_REFUSAL.pathwayId].map((pathway) =>
    buildRenderJobSpec({ packetId: "pa-refusal-no-job", state: "PA", pathway, trackId: null, packetFields: {} }));
  const admissions = Object.fromEntries([
    "consumer_checkout", "generation_admission", "sponsored_entitlement", "packet_credit_admission"
  ].map((point) => [point, admitCommercial(point, {
    routeId: `PA:${PA_REFUSAL.pathwayId}`, jurisdiction: "PA", packetFamilyId: null
  })]));
  const fulfillment = Object.fromEntries([
    "checkout creation", "consumer payment authority", "sponsored entitlement", "packet credit consumption"
  ].map((surface) => [surface, packetFulfillmentAuthority("PA", PA_REFUSAL.pathwayId, surface)]));
  // Even a favorable screening predicate is not commercial authority.
  const payment = createConsumerPaymentPlaceholder({
    state: "PA", resultCode: "packet_ready", paymentAllowed: true, selectedTrackId: null
  }, PA_REFUSAL.pathwayId);
  return { pathway, builds, admissions, fulfillment, payment };
}

export function paRefusalEvidence({ pathway, builds, admissions, fulfillment, payment }) {
  return operandEvidence([
    ["compiledPathway.id", pathway?.id, PA_REFUSAL.pathwayId],
    ["compiledPathway.label", pathway?.label, PA_REFUSAL.pathwayLabel],
    ["buildCount", builds?.length, 2],
    ...[0, 1].flatMap((index) => [
      [`builds[${index}].routeKind`, builds?.[index]?.route?.routeKind, "legacy_retired"],
      [`builds[${index}].spec`, builds?.[index]?.spec, null],
      [`builds[${index}].sellable`, builds?.[index]?.route?.sellable, false],
      [`builds[${index}].creditConsumable`, builds?.[index]?.route?.creditConsumable, false]
    ]),
    ...["consumer_checkout", "generation_admission", "sponsored_entitlement", "packet_credit_admission"]
      .map((point) => [`admissions.${point}.admitted`, admissions?.[point]?.admitted, false]),
    ...["checkout creation", "consumer payment authority", "sponsored entitlement", "packet credit consumption"]
      .map((surface) => [`fulfillment.${surface}.allowed`, fulfillment?.[surface]?.allowed, false]),
    ["payment.enabled", payment?.enabled, false],
    ["payment.amountCents", payment?.amountCents, undefined]
  ], {
    route: PA_REFUSAL,
    // Pure authority calls: no writer, queue, Stripe client or credit consumer
    // is invoked. This proves refusal before side effects, not a hosted ledger audit.
    scope: "real product admission boundaries; no write or consumption invoked"
  });
}
