// Local contract checks only. No checkout provider, hosted identity or live
// entitlement is created. Imported by the existing delivery acceptance gates.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { withIllinoisRegistry } from "./test-rcap-il-authority-fixture.mjs";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { resolvePacketRoute } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");
const { buildRenderJobSpec } = await import("../src/lib/rcap/render/job-contract.ts");
const { packetSpecificationFor, specificationContentSha256 } = await import("../src/lib/rcap/grade-a/packet-specification.ts");
const lane = await import("../src/lib/rcap/render/commercial-admission.ts");
const { resolveConsumerDeliveryAccess } = await import("../src/lib/rcap/render/consumer-delivery-control.ts");
const { authorizePacketDownload, streamAuthorizedPacket } = await import("../src/lib/rcap/render/packet-delivery.ts");

export const IL_ROUTE = "IL:felony-prostitution-relief";
export const IL_TRACK = "il-prostitution-j-vacate";
export const IL_FAMILY = "il-prostitution-j-vacate-set";
export const IL_SPECIFICATION = packetSpecificationFor(IL_ROUTE);
export const IL_SNAPSHOT = {
  schemaVersion: "expungement-ai/final-verification/v1",
  jurisdiction: "IL", pathwayId: "felony-prostitution-relief",
  selectedTrackId: IL_TRACK, verifiedAt: "2026-09-05T00:00:00.000Z",
  profileVersion: "2026-06-19-source-conversion-1",
  profileSourceFingerprint: specificationContentSha256(IL_SPECIFICATION),
  profileAuthorityFingerprint: "local-il-delivery-verification",
  packetFamilyIdentifiers: { mode: "custom_pleading", sourceFormIds: [] },
  paymentAllowed: false, resultCode: "packet_ready"
};

export function ilContext({ userId = "local-owner", matterId = "local-matter", kind = "consumer_payment", snapshot = IL_SNAPSHOT } = {}) {
  return lane.fulfillmentRequestContext({
    participantUserId: userId, matterId, matterOwnerUserId: userId,
    finalVerification: lane.finalVerificationSnapshotFrom({
      snapshot, verificationHash: "local-il-verification", matterId,
      ownerUserId: userId, packetFamilyId: IL_FAMILY
    }),
    entitlement: lane.entitlementContext({ kind, idempotencyKey: "local-il-entitlement", alreadyConsumed: false, serverVerified: true }),
    storage: lane.artifactStorageContext({ privateStorage: true, artifactSha256: "a".repeat(64), repeatDownload: false })
  });
}

const identity = lane.commercialRouteIdentity({ jurisdiction: "IL", pathwayId: "felony-prostitution-relief" });
assert.equal(identity.packetFamilyId, IL_FAMILY);
const jobInput = { packetId: "local-il-packet", state: "IL", pathway: "felony-prostitution-relief", packetFields: {} };
const exact = buildRenderJobSpec({ ...jobInput, trackId: IL_TRACK });
assert.equal(exact.route.routeKind, "factory_v2");
assert.equal(exact.route.factoryV2.packetFamilyId, IL_FAMILY);
assert.deepEqual(exact.route.factoryV2.registryTrackIds, [IL_TRACK]);
assert.equal(exact.spec.routeId, IL_ROUTE);
assert.equal(exact.route.sellable, false);
assert.equal(exact.route.creditConsumable, false);

const graphArgument = process.argv.indexOf("--il-graph");
const graphPath = graphArgument < 0 ? "data/rcap-ledger/launch-graph.json" : process.argv[graphArgument + 1];
const row = JSON.parse(fs.readFileSync(graphPath, "utf8")).rows.find((candidate) => candidate.pathwayKey === IL_ROUTE);
assert.equal(row.renderer.routeKind, "factory_v2", "IL graph must resolve the productized track");
assert.equal(row.renderer.trackId, IL_TRACK);
assert.deepEqual(row.renderer.packetSetIds, [IL_FAMILY]);
assert.equal(row.artifactResult.rendered, true);
assert.equal(row.artifactResult.deterministic, true);
assert.equal(row.operationalGates.deterministicArtifactProven, true);
assert.deepEqual(row.artifactResult.scope, {
  routeId: IL_ROUTE, trackId: IL_TRACK, packetFamilyId: IL_FAMILY,
  specificationSha256: specificationContentSha256(IL_SPECIFICATION)
});
assert.equal(row.operationalGates.paymentAllowed, false);
assert.equal(row.operationallySellable, false);
assert.equal(row.paymentResult.sellableAtTheResolver, false);
assert.equal(row.rcapResult.creditConsumable, false);

// These are authority-unit tests with synthetic verified context, not evidence
// that the evaluator or deployment permits a checkout. Both remain closed.
await withIllinoisRegistry(async () => {
for (const kind of ["consumer_payment", "sponsored_credit"]) {
  const point = kind === "consumer_payment" ? "consumer_checkout" : "sponsored_entitlement";
  const context = ilContext({ kind });
  assert.equal(lane.governCommercialAdmission(point, identity, context).admitted, true);
  for (const action of ["generation_admission", "provider_dispatch", "private_download", "repeat_download"]) {
    assert.equal(lane.governCommercialAdmission(action, identity, {
      ...context, storage: { ...context.storage, repeatDownload: action === "repeat_download" }
    }).admitted, true);
  }
  for (const packetFamilyId of ["il-prostitution-j-auto-set", "*", null]) {
    assert.throws(() => lane.governCommercialAdmission(point, { ...identity, packetFamilyId }, context), lane.CommercialAdmissionDeniedError);
  }
  for (const routeId of ["IL:*", "*", "IL:il-prostitution-j-auto"]) {
    assert.throws(() => lane.governCommercialAdmission(point, { ...identity, routeId }, context), lane.CommercialAdmissionDeniedError);
  }
  for (const finalVerification of [
    null,
    { ...context.finalVerification, invalidated: true },
    { ...context.finalVerification, ownerUserId: "another-participant" },
    { ...context.finalVerification, matterId: "another-matter" },
    { ...context.finalVerification, boundRouteId: "IL:*" },
    { ...context.finalVerification, boundPacketFamilyId: "il-prostitution-j-auto-set" }
  ]) {
    assert.throws(() => lane.governCommercialAdmission("provider_dispatch", identity, { ...context, finalVerification }), lane.CommercialAdmissionDeniedError);
  }
  for (const trackId of [null, "*", "il-prostitution-j-auto"]) {
    const denied = buildRenderJobSpec({ ...jobInput, trackId });
    assert.equal(denied.spec, null);
    assert.notEqual(resolvePacketRoute({ ...jobInput, trackId }).routeKind, "factory_v2");
    const wrongTrack = ilContext({ kind, snapshot: { ...IL_SNAPSHOT, selectedTrackId: trackId } });
    assert.throws(() => lane.governCommercialAdmission(point, identity, wrongTrack), lane.CommercialAdmissionDeniedError,
      `${kind}: ${trackId ?? "trackless"} verification must not inherit the vacatur family`);
  }
}

// Delivery-binding unit fixture only: completed-job/accounting, identity and
// storage are doubles. This PDF is not an Illinois packet or a render proof.
const pdf = await PDFDocument.create();
pdf.addPage([612, 792]).drawText("SYNTHETIC DELIVERY BINDING ONLY", { font: await pdf.embedFont(StandardFonts.Helvetica) });
const bytes = Buffer.from(await pdf.save());
const digest = createHash("sha256").update(bytes).digest("hex");
const jobId = "11111111-1111-4111-8111-111111111111";
const job = {
  id: jobId, packetId: "unit-packet", routeId: IL_ROUTE, briefcaseItemId: "unit-item",
  consumerBriefcaseItemId: "unit-item", consumerAuthUserId: "unit-owner", matterId: "unit-matter",
  consumerVerificationHash: "unit-verification", status: "artifact_validated", deliveryEligibility: "eligible", accountingResult: "zero_charge",
  outputStoragePath: `unit/${jobId}/${digest}.pdf`, outputSha256: digest,
  personalizedBinding: { trackId: IL_TRACK, packetFamilyId: IL_FAMILY, specificationSha256: specificationContentSha256(IL_SPECIFICATION),
    specificationFileSha256: createHash("sha256").update(fs.readFileSync("data/record-clearing/packet-specifications/IL-felony-prostitution-relief.v1.json")).digest("hex") }
};
const current = { snapshot: IL_SNAPSHOT, hash: "unit-verification", ownerUserId: "unit-owner", matterId: "unit-matter", alreadyDownloaded: false };
const events = [];
const ports = { getJob: async () => job, userOwnsBriefcaseItem: async (user) => user === "unit-owner",
  getCurrentVerification: async () => current, storage: { read: async () => bytes }, recordEvent: async (event) => { events.push(event); return "unit-event"; } };
for (const repeat of [false, true]) {
  current.alreadyDownloaded = repeat;
  const decision = await authorizePacketDownload(ports, { jobId, userId: "unit-owner" });
  assert.equal(decision.ok, true, JSON.stringify(decision));
  const response = await streamAuthorizedPacket(ports, decision, { userId: "unit-owner" });
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
}
assert.equal(events.filter((e) => e.eventType === "transmission_completed").length, 2);
for (const userId of [null, "other-user"]) assert.equal((await authorizePacketDownload(ports, { jobId, userId })).ok, false);
for (const changes of [
  { hash: "stale-verification" }, { matterId: "wrong-matter" },
  { snapshot: { ...IL_SNAPSHOT, selectedTrackId: "il-prostitution-j-auto" } }
]) assert.equal((await authorizePacketDownload({ ...ports, getCurrentVerification: async () => ({ ...current, ...changes }) }, { jobId, userId: "unit-owner" })).ok, false);
for (const changes of [
  { packetFamilyId: "wrong-family" }, { trackId: "*" },
  { specificationFileSha256: "f".repeat(64) }, { specificationSha256: "f".repeat(64) }
]) assert.equal((await authorizePacketDownload({ ...ports, getJob: async () => ({ ...job, personalizedBinding: { ...job.personalizedBinding, ...changes } }) }, { jobId, userId: "unit-owner" })).ok, false);
});
assert.equal(resolveConsumerDeliveryAccess({ subjectId: null }).allowed, false,
  "this local verifier must run with consumer delivery disabled");
console.log("Illinois delivery binding: exact track/family/job and consumer/sponsored denials PASS (local only)");

// Current release state is a separate assertion, never the positive fixture.
const { fulfillmentAuthorityFor, admitCommercial } = await import("../src/lib/rcap/fulfillment/grade-a-admission.ts");
const current = fulfillmentAuthorityFor(IL_ROUTE);
const currentAdmission = admitCommercial("generation_admission", identity, ilContext());
assert.equal(currentAdmission.admitted, current.commercialStatus === "commercially_eligible");
if (current.state === "REVOKED") assert.equal(currentAdmission.denialCode, "fulfillment_revoked");
console.log(`Illinois committed registry: ${current.state}; admitted=${currentAdmission.admitted}`);
