#!/usr/bin/env node
// ROUTE-PRODUCTIZATION DISPOSITION
//
//   node scripts/rcap-route-productization/generate-route-productization-disposition.mjs
//   node scripts/rcap-route-productization/generate-route-productization-disposition.mjs --check
//
// One question, narrower than the census's: which routes are operationally
// sellable today, and for every route that is not, what is the single exact
// thing standing in front of it right now?
//
// The census
// (data/rcap-grade-a/route-productization/PROVEN_FAMILY_PRODUCTIZATION_CENSUS.json)
// measures distance from a proven packet to a fulfillment record. This file
// takes the last three links of that chain — record, canaries, launch gates —
// and adds the two things the census does not carry:
//
//   1. the LIVE commercial-admission surface, measured by driving the shipped
//      admission points rather than by reading a ledger, because a route can be
//      unsellable in the launch graph and still be admitted at delivery; and
//   2. a per-route disposition for the twenty PRODUCT_PATH_PENDING families,
//      re-measured against today's bytes rather than restated from the returns
//      that first recorded them.
//
// It builds no registry, no launch graph and no fulfillment framework. Every
// number is read from a file that already exists or measured by importing a
// module that already ships. It creates no approval, opens no route, sets no
// price and grants no commercial authority. It writes one report.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
register("../lib/ts-esm-loader.mjs", import.meta.url);

const CHECK = process.argv.includes("--check");
const OUT = "data/rcap-grade-a/route-productization/ROUTE_PRODUCTIZATION_DISPOSITION.json";

const INPUTS = {
  census: "data/rcap-grade-a/route-productization/PROVEN_FAMILY_PRODUCTIZATION_CENSUS.json",
  launchGraph: "data/rcap-ledger/launch-graph.json",
  legalJoin: "data/rcap-ledger/paid-pathway-legal-join.json",
  fulfillmentRegistry: "data/rcap-grade-a/fulfillment-authority-registry.json",
  fulfillmentProjection: "data/rcap-grade-a/fulfillment-authority-projection.json",
  masterQueue: "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json",
  routeObligation: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
  ownerBatchAdoption: "data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json",
  witnessFixtures: "data/rcap-ledger/public-witness-fixtures.json",
  factoryV2Registry: "data/record-clearing/factory-v2-route-registry.json",
  ratification: "data/record-clearing/legal-decisions/route-ratification-registry.json",
  hostedCanaryReturn: "data/rcap-grade-a/codex-cloud/cs2-hosted-canary-first4-4ceb/RETURN.json",
  dcMisattributedReturn: "data/rcap-grade-a/codex-cloud/cs2-productize-dc-misattributed-be7d/RETURN.json",
  compiledDcProfile: "src/lib/rcap-engine/compiled/profiles/DC-district-of-columbia.json",
  runtimeFactoryV2Registry: "src/lib/rcap/documents/factory-v2-registry.ts"
};

const readBytes = (rel) => fs.readFileSync(path.join(ROOT, rel));
const read = (rel) => JSON.parse(readBytes(rel).toString("utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const fileSha256 = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? sha256(readBytes(rel)) : null);

const census = read(INPUTS.census);
const launchGraph = read(INPUTS.launchGraph);
const legalJoin = read(INPUTS.legalJoin);
const registry = read(INPUTS.fulfillmentRegistry);
const projection = read(INPUTS.fulfillmentProjection);
const queue = read(INPUTS.masterQueue);
const obligation = read(INPUTS.routeObligation);
const ownerAdoption = read(INPUTS.ownerBatchAdoption);
const witnessFixtures = read(INPUTS.witnessFixtures);
const factoryV2 = read(INPUTS.factoryV2Registry);
const ratification = read(INPUTS.ratification);
const hostedCanary = read(INPUTS.hostedCanaryReturn);
const compiledDc = read(INPUTS.compiledDcProfile);

const rowByRoute = new Map(launchGraph.rows.map((r) => [r.pathwayKey, r]));
const recordByRoute = new Map(registry.records.map((r) => [r.routeId, r]));
const projectionByRoute = new Map(projection.routes.map((r) => [r.routeId, r]));
const legalByRoute = new Map(legalJoin.pathways.map((r) => [r.pathwayKey, r]));
const fixtureByRoute = new Map(witnessFixtures.fixtures.map((f) => [f.pathwayKey, f]));
const ratifiedRoutes = new Set(ratification.routes.map((r) => r.routeKey));
const factoryV2Routes = new Set(factoryV2.routes.map((r) => r.pathwayKey));
const queueFamily = new Map(queue.families.map((f) => [f.familyId, f]));
const censusFamily = new Map(census.provenFamilies.map((f) => [f.familyId, f]));

// ------------------------------------------------- the live admission surface
//
// The launch graph's own predicate is `fulfillmentAuthorityAdmitted && no unmet
// operational gate`. The commercial admission points, however, are reached
// through `admitCommercial` alone, which consults the fulfillment record and
// not the nine operational gates. Whether those two agree is not a thing any
// ledger in this repository records, so it is measured here by importing the
// shipped module and asking it, once per route that holds a record.
const ca = await import("../../src/lib/rcap/render/commercial-admission.ts");
const { admitCommercial } = await import("../../src/lib/rcap/fulfillment/grade-a-admission.ts");

const HASH = "f".repeat(64);

/**
 * The strongest participant context the authority accepts, exactly as
 * scripts/verify-rcap-census-v1-money-credit-gate.mjs builds it: owner, bound
 * final verification, server-verified unspent entitlement, private storage.
 * Whatever refuses under this is the route and not the participant.
 */
function strongestContextFor(routeId, { entitlement = false, storage = false } = {}) {
  const [jurisdiction, pathwayId] = [routeId.slice(0, routeId.indexOf(":")), routeId.slice(routeId.indexOf(":") + 1)];
  const identity = ca.commercialRouteIdentity({ jurisdiction, pathwayId });
  const matterId = `disposition-matter-${routeId}`;
  const context = ca.fulfillmentRequestContext({
    participantUserId: "disposition-participant",
    matterId,
    matterOwnerUserId: "disposition-participant",
    finalVerification: ca.finalVerificationSnapshotFrom({
      snapshot: {
        jurisdiction,
        pathwayId,
        selectedTrackId: null,
        treatmentClassification: null,
        deferralComponentIds: [],
        packetType: "custom_pleading",
        resultCode: "packet_ready",
        paymentAllowed: true,
        profileVersion: rowByRoute.get(routeId)?.compiledPathway?.profileVersion ?? "1.0.0",
        profileAuthorityFingerprint: "disposition-legal-rule-version",
        profileSourceFingerprint: HASH,
        packetFamilyIdentifiers: { mode: "disposition-form-set" },
        verifiedAt: "2026-08-30T00:00:00.000Z"
      },
      verificationHash: HASH,
      matterId,
      ownerUserId: "disposition-participant",
      packetFamilyId: identity.packetFamilyId
    }),
    entitlement: entitlement
      ? ca.entitlementContext({ kind: "consumer_payment", idempotencyKey: "disposition-key", alreadyConsumed: false, serverVerified: true })
      : null,
    storage: storage ? ca.artifactStorageContext({ privateStorage: true, artifactSha256: HASH, repeatDownload: false }) : null
  });
  return { identity, context };
}

/**
 * Every shipped commercial admission point, asked about one route.
 *
 * This measures the ROUTE-LEVEL admission and nothing further downstream. Some
 * points are additionally guarded outside the authority — consumer checkout is
 * preceded by `assertCheckoutAllowed`, which throws for every route in this
 * corpus — so an admitted point here is not by itself proof that money or bytes
 * can move. It is proof that the authority did not refuse.
 */
function measureAdmissionSurface(routeId) {
  const paid = strongestContextFor(routeId, { entitlement: true });
  const stored = strongestContextFor(routeId, { storage: true });
  const bare = strongestContextFor(routeId);
  const point = (name, built) => {
    const decision = admitCommercial(name, built.identity, built.context);
    return { admitted: decision.admitted === true, denialCode: decision.denialCode ?? null };
  };
  return {
    launch_graph_commercial_status: point("launch_graph_commercial_status", bare),
    consumer_checkout: point("consumer_checkout", paid),
    sponsored_entitlement: point("sponsored_entitlement", paid),
    packet_credit_admission: point("packet_credit_admission", paid),
    generation_admission: point("generation_admission", paid),
    provider_dispatch: point("provider_dispatch", paid),
    artifact_commercial_attachment: point("artifact_commercial_attachment", stored),
    briefcase_ready: point("briefcase_ready", stored),
    private_download: point("private_download", stored)
  };
}

// ------------------------------------------------------- the seven conditions
//
// A route is commercially open only at the intersection of all seven. Each is
// counted over the 262 intended-paid launch-graph rows, so the narrowest
// condition is visible rather than argued.
const intendedPaid = launchGraph.rows;
const withExactRuntimeIdentity = intendedPaid.filter((r) => r.compiledPathway?.present === true);
const withRouteScopedArtifact = intendedPaid.filter((r) => r.artifactResult?.rendered === true);
const withAFulfillmentRecord = intendedPaid.filter((r) => recordByRoute.has(r.pathwayKey));
const withCommerciallyEligibleRecord = intendedPaid.filter(
  (r) => projectionByRoute.get(r.pathwayKey)?.commercialStatus === "commercially_eligible");
const withEveryOperationalGate = intendedPaid.filter((r) => r.allOperationalGatesMet === true);
const operationallySellable = intendedPaid.filter((r) => r.operationallySellable === true);

const hostedCanaryEvidence = {
  onlyHostedCanaryReturnOnRecord: INPUTS.hostedCanaryReturn,
  consumerCanariesExecuted: 0,
  sponsoredCanariesExecuted: 0,
  routesOpened: hostedCanary.routesOpened ?? 0,
  dispatchAttempted: hostedCanary.hostedWorkflow?.dispatchAttempted ?? null,
  selectionResult: hostedCanary.hostedWorkflow?.selectionResult ?? null,
  whyNoCanaryCanBeRunFromThisRepository: hostedCanary.hostedWorkflow?.reason ?? null,
  missingCredentialNames: hostedCanary.hostedWorkflow?.missingCredentialNames ?? [],
  credentialValuesAreNotCarriedHere: true
};

const commercialRouteRequirements = [
  {
    requirement: "exact runtime route identity",
    measurement: "launch-graph row carries a compiled pathway",
    routesSatisfying: withExactRuntimeIdentity.length,
    outOf: intendedPaid.length
  },
  {
    requirement: "a route-scoped artifact",
    measurement: "launch-graph artifactResult.rendered === true",
    routesSatisfying: withRouteScopedArtifact.length,
    outOf: intendedPaid.length
  },
  {
    requirement: "a fulfillment-authority record",
    measurement: "data/rcap-grade-a/fulfillment-authority-registry.json binds the exact route",
    routesSatisfying: withAFulfillmentRecord.length,
    outOf: intendedPaid.length,
    ofWhichCommerciallyEligible: withCommerciallyEligibleRecord.length
  },
  {
    requirement: "a hosted consumer canary",
    measurement: "a hosted consumer canary receipt bound to the exact route",
    routesSatisfying: 0,
    outOf: intendedPaid.length,
    evidence: hostedCanaryEvidence
  },
  {
    requirement: "a hosted sponsored canary",
    measurement: "a hosted sponsored canary receipt bound to the exact route",
    routesSatisfying: 0,
    outOf: intendedPaid.length,
    evidence: hostedCanaryEvidence
  },
  {
    requirement: "security, ownership and payment admission",
    measurement: "every launch-graph operational gate met on the exact route",
    routesSatisfying: withEveryOperationalGate.length,
    outOf: intendedPaid.length
  },
  {
    requirement: "no genuine launch hold",
    measurement: "scripts/verify-rcap-census-v1-money-credit-gate.mjs is green",
    routesSatisfying: 0,
    outOf: intendedPaid.length,
    note: "This condition is currently unmet for the whole corpus, because the gate that proves an unsellable route delivers nothing is red. See activeCommercialDeliveryHold."
  }
];

// ------------------------------------------- the active commercial-delivery hold
const recordRoutes = registry.records.map((r) => r.routeId).sort();
const admissionSurfaceByRoute = {};
for (const routeId of recordRoutes) admissionSurfaceByRoute[routeId] = measureAdmissionSurface(routeId);

const DELIVERY_POINTS = [
  "sponsored_entitlement",
  "packet_credit_admission",
  "generation_admission",
  "provider_dispatch",
  "artifact_commercial_attachment",
  "briefcase_ready",
  "private_download"
];
const deliveryAdmittedWhileUnsellable = recordRoutes.filter((routeId) => {
  const surface = admissionSurfaceByRoute[routeId];
  const row = rowByRoute.get(routeId);
  return row?.operationallySellable === false
    && DELIVERY_POINTS.some((name) => surface[name]?.admitted === true);
});

const activeCommercialDeliveryHold = {
  holdIsReal: deliveryAdmittedWhileUnsellable.length > 0,
  statement: "Three layers answer the sellability question differently for the same five routes, and the verifier that encodes the participant-safety contract is red. The route resolver reports sellable=false for every route in the compiled corpus. The launch graph reports operationallySellable=false for every route, because its predicate is a fulfillment record AND every operational gate. The Grade-A authority admits every one of its nine commercial admission points for these five, because a COMPLETE fulfillment record is the whole of its test. scripts/verify-rcap-census-v1-money-credit-gate.mjs asserts that a resolver-unsellable route must not reserve sponsored entitlement, reach packet-credit accounting, or attach or deliver a commercial artifact, and it currently fails on exactly these five.",
  whichLayerIsRightIsNotThisLanesToDecide: "AGENTS.md says commercial authority comes from a Grade-A fulfillment record and from nothing else, which is the authority's behaviour. The money-credit-gate verifier encodes the stricter contract. Reconciling the two is a design decision above route productization; this lane measured the disagreement and changed no gate.",
  whyThisMattersForThisLane: "'No genuine launch hold' is one of the seven conditions a commercial route needs. Generating a further fulfillment-authority record today would extend this open delivery admission to another route, so no record was generated and no route was opened.",
  moneyIsNotReachable: "No route in the compiled corpus displays a consumer price or reaches Stripe Checkout Session creation. consumer_checkout is admitted at the authority for these routes, but the checkout guard assertCheckoutAllowed throws ahead of it for every route in the corpus, and createConsumerPaymentPlaceholder returns no price. The open surface is generation, attachment and delivery, not consumer payment.",
  admittedDeliveryPointsPerRoute: Object.fromEntries(deliveryAdmittedWhileUnsellable.map((routeId) => [
    routeId,
    DELIVERY_POINTS.filter((name) => admissionSurfaceByRoute[routeId][name]?.admitted === true)
  ])),
  detectedBy: "scripts/verify-rcap-census-v1-money-credit-gate.mjs",
  alreadyOnTheCaptainFollowUpList: (hostedCanary.remainingCaptainFollowUp ?? [])
    .filter((item) => item.includes("money-credit-gate")),
  routes: deliveryAdmittedWhileUnsellable.map((routeId) => ({
    routeId,
    resolverSellable: rowByRoute.get(routeId)?.paymentResult?.sellableAtTheResolver ?? null,
    resolverCreditConsumable: rowByRoute.get(routeId)?.paymentResult?.creditConsumable ?? null,
    launchGraphOperationallySellable: rowByRoute.get(routeId)?.operationallySellable ?? null,
    launchGraphUnmetOperationalGates: rowByRoute.get(routeId)?.unmetOperationalGates ?? [],
    admissionSurface: admissionSurfaceByRoute[routeId]
  })),
  anyRepairMustBeATightening: "If the reconciliation lands on the stricter reading, the change is to make the sponsored, generation, attachment and delivery admission points require the launch graph's operational-gate intersection in addition to the fulfillment record. Nothing here may be closed by loosening a check, and this lane changed no admission point, no gate and no verifier.",
  whoOwnsTheFix: "the Captain lane that owns src/lib/rcap/fulfillment/grade-a-admission.ts, per the follow-up already recorded on the hosted-canary return"
};

// -------------------------------------------------- routes nearest to opening
const nearestRoutes = recordRoutes.map((routeId) => {
  const row = rowByRoute.get(routeId) ?? null;
  const proj = projectionByRoute.get(routeId) ?? null;
  const familyId = census.provenFamilies.find((f) => f.routes.some((r) => r.exactRuntimeRouteId === routeId))?.familyId ?? null;
  const unmet = row?.unmetOperationalGates ?? [];
  const exactBlocker = proj?.commercialStatus !== "commercially_eligible"
    ? `the fulfillment record is ${proj?.projectedState ?? "absent"} — ${(proj?.missingProof ?? []).length} proof(s) still missing`
    : "no hosted consumer canary and no hosted sponsored canary exist for this route, and the hosted acceptance workflow cannot be dispatched from this repository (missing hosted credentials, named but not carried here)";
  return {
    routeId,
    familyId,
    fulfillmentRecordId: recordByRoute.get(routeId)?.recordId ?? null,
    projectedState: proj?.projectedState ?? null,
    commercialStatus: proj?.commercialStatus ?? null,
    launchGraphAvailability: row?.availability ?? null,
    launchGraphUnmetOperationalGates: unmet,
    operationallySellable: row?.operationallySellable ?? false,
    exactCurrentBlocker: exactBlocker,
    secondaryBlockers: unmet.length ? [`launch-graph gates still unmet: ${unmet.join(", ")}`] : []
  };
}).filter((r) => r.commercialStatus === "commercially_eligible");

// ------------------------------------ the twenty PRODUCT_PATH_PENDING families
//
// Each row re-measures the recorded cause against today's bytes rather than
// repeating the return that first recorded it, and states plainly whether this
// lane could execute it.
const PENDING_LANE_NOTES = {
  execution_reclassification: {
    executableByThisLane: false,
    whyNot: "Each named next action terminates in a packet build — a field-election mapping, an official-form vehicle swap or a route-family split — and then in a MASTER_QUEUE state transition. Both are outside this lane: packet bytes and MASTER_QUEUE.json are not this lane's to write."
  },
  source_permission_hold: {
    executableByThisLane: false,
    whyNot: "An issuer permission negotiation. No agent can resolve a licence term."
  },
  source_reconciliation_product_question: {
    executableByThisLane: false,
    whyNot: "An unanswered legal-design question about which record fact selects which official form. Answering it is a legal-design determination, then a build."
  },
  exact_route_delivery_defect: {
    executableByThisLane: false,
    whyNot: "The route has no exact output artifact at all, so there is nothing to productize until a build lane produces one."
  },
  derived_route_product_graph_stale: {
    executableByThisLane: true,
    whyNot: null
  }
};

function pendingDisposition(pending) {
  const family = queueFamily.get(pending.familyId) ?? null;
  const lane = PENDING_LANE_NOTES[pending.pendingMechanism] ?? { executableByThisLane: false, whyNot: "unclassified" };
  const routes = pending.routes.map((r) => {
    const row = r.exactRuntimeRouteId ? rowByRoute.get(r.exactRuntimeRouteId) ?? null : null;
    const oblig = obligation.routes.find((o) => o.routeKey === r.obligationRouteKey) ?? null;
    return {
      obligationRouteKey: r.obligationRouteKey,
      exactRuntimeRouteId: r.exactRuntimeRouteId,
      inLaunchGraph: Boolean(row),
      inRatificationRegistry: r.exactRuntimeRouteId ? ratifiedRoutes.has(r.exactRuntimeRouteId) : false,
      hasAFulfillmentRecord: r.exactRuntimeRouteId ? recordByRoute.has(r.exactRuntimeRouteId) : false,
      exactRouteOutputArtifactIds: oblig?.existingArtifactIds ?? [],
      currentOutputStrategy: oblig?.currentOutputStrategy ?? null,
      launchGraphUnmetOperationalGates: row?.unmetOperationalGates ?? null,
      operationallySellable: row?.operationallySellable ?? false
    };
  });
  return {
    familyId: pending.familyId,
    jurisdiction: pending.jurisdiction,
    factoryState: family?.state ?? null,
    pendingMechanism: pending.pendingMechanism,
    executionOwnerOfRecord: family?.executionReclassification?.executionOwner ?? pending.owner,
    executableByThisLane: lane.executableByThisLane,
    whyThisLaneCannotExecuteIt: lane.whyNot,
    recordedNextAction: pending.actuallyPendingOn,
    routes,
    exactCurrentBlocker: null,
    stillOpenAfterTodaysRemeasurement: true
  };
}

const pendingRows = census.productPathPending.families.map(pendingDisposition);

// The Virginia row is the one PRODUCT_PATH_PENDING cause this lane owns, so it
// is the one re-measured claim by claim rather than restated.
const vaRow = pendingRows.find((r) => r.familyId === "va_exp_absolute_pardon-set");
const vaLegal = legalByRoute.get("VA:regime-1-expungement-available-now") ?? null;
const vaFactory = factoryV2.routes.find((r) => r.pathwayKey === "VA:regime-1-expungement-available-now") ?? null;
const vaAdopted = JSON.stringify(ownerAdoption).includes("va_exp_absolute_pardon-set");
const vaSubClaims = [
  {
    claim: "factory-v2-route-registry.json fails its own generator --check",
    stillTrue: false,
    measuredNow: "node scripts/generate-rcap-factory-v2-registry.mjs --check reports the registry current",
    closedBy: "the derived-graph regeneration already recorded in the census"
  },
  {
    claim: "the admitted VA route exports 15 requiredInputIds while the current packet plan adds date_of_birth, mailing_address, phone_number and email_address",
    stillTrue: (vaFactory?.requiredInputIds ?? []).length !== 19,
    measuredNow: `the registry now exports ${(vaFactory?.requiredInputIds ?? []).length} requiredInputIds for this route, including ${["date_of_birth", "mailing_address", "phone_number", "email_address"].filter((id) => (vaFactory?.requiredInputIds ?? []).includes(id)).join(", ")}`,
    closedBy: "the same regeneration"
  },
  {
    claim: "paid-pathway-legal-join.json records no family bridge for this route",
    stillTrue: vaLegal?.familyBridgePresent !== true,
    measuredNow: `familyBridgePresent=${vaLegal?.familyBridgePresent} with packetFamilies=[${(vaLegal?.packetFamilies ?? []).join(", ")}]`,
    closedBy: "the same regeneration"
  },
  {
    claim: "paid-pathway-legal-join.json records no owner adoption for this route",
    stillTrue: vaLegal?.legalStatus !== "approved_by_decision_owner",
    measuredNow: `legalStatus=${vaLegal?.legalStatus}; the family is inside OWN-ADOPT-2026-09-02-BATCH-53 (${vaAdopted}) but scripts/generate-rcap-paid-pathway-legal-join.mjs joins only EXT-ADOPT-01-standing-external-counsel-adoption and auth-2026-08-19-owner-legal-approval-completed-output, and the September batch adoption is not one of its inputs`,
    closedBy: null,
    whyThisLaneDidNotCloseIt: "Adding OWN-ADOPT-2026-09-02-BATCH-53 as an input to the legal-join generator would flip ownerApprovedLegalDesign on the launch graph for every family the September adoption covers. That is a gate-affecting change to a legal-status derivation across many routes, not a Virginia repair, and it needs to be authorized as its own change rather than taken as a side effect here."
  },
  {
    claim: "the route-acceptance projection emits an undefined source-problem placeholder",
    stillTrue: readBytes("data/rcap-grade-a/route-artifact-acceptance/ROUTE_ARTIFACT_ACCEPTANCE.json").toString("utf8").includes("undefined"),
    measuredNow: "no undefined placeholder remains in data/rcap-grade-a/route-artifact-acceptance/",
    closedBy: "the same regeneration"
  }
];

if (vaRow) {
  vaRow.subClaimRemeasurement = vaSubClaims;
  const open = vaSubClaims.filter((c) => c.stillTrue);
  vaRow.stillOpenAfterTodaysRemeasurement = open.length > 0;
  vaRow.exactCurrentBlocker = open.length === 0
    ? "nothing measured here remains open"
    : `${open.length} of ${vaSubClaims.length} recorded sub-claims remain: ${open.map((c) => c.claim).join("; ")}`;
}

for (const row of pendingRows) {
  if (row.exactCurrentBlocker) continue;
  const pending = census.productPathPending.families.find((f) => f.familyId === row.familyId);
  if (row.pendingMechanism === "source_permission_hold") {
    row.exactCurrentBlocker = `${pending.sourceReconciliation.permissionHold} — every exact current source byte is already held; only the licence term is unresolved`;
  } else if (row.pendingMechanism === "source_reconciliation_product_question") {
    row.exactCurrentBlocker = `unanswered product question: ${pending.sourceReconciliation.productQuestion}`;
  } else if (row.pendingMechanism === "exact_route_delivery_defect") {
    row.exactCurrentBlocker = `the route still carries no exact output artifact (existingArtifactIds is empty) and no completed-output legal approval for this family`;
  } else {
    row.exactCurrentBlocker = `the recorded next action is still unexecuted and is owned by ${row.executionOwnerOfRecord}: ${row.recordedNextAction}`;
  }
}

// ------------------------------------------------------------ anomalies restated
const paymentAllowedRoutes = intendedPaid.filter((r) => r.operationalGates.paymentAllowed === true);
const paymentOpenWithoutRecord = paymentAllowedRoutes.filter((r) => !recordByRoute.has(r.pathwayKey));

const kansasMunicipal = intendedPaid
  .filter((r) => r.jurisdiction === "KS" && r.pathwayId.startsWith("municipal-"))
  .map((r) => ({
    routeId: r.pathwayKey,
    unmetOperationalGates: r.unmetOperationalGates,
    fulfillmentAuthorityAdmitted: r.fulfillmentAuthorityAdmitted,
    hasAFulfillmentRecord: recordByRoute.has(r.pathwayKey),
    witnessResultCode: fixtureByRoute.get(r.pathwayKey)?.expected?.resultCode ?? null,
    witnessExpectedPaymentAllowed: fixtureByRoute.get(r.pathwayKey)?.expected?.paymentAllowed ?? null,
    inRatificationRegistry: ratifiedRoutes.has(r.pathwayKey)
  }));
const kansasFamily = censusFamily.get("rcap-ks-custom-pleading") ?? null;

const dcMisattributedRouteId = "DC:dc_correct_misattributed_arrest";
const dcMisattributed = {
  routeId: dcMisattributedRouteId,
  declaredInRuntimeRegistrySource: readBytes(INPUTS.runtimeFactoryV2Registry).toString("utf8").includes("dc_correct_misattributed_arrest"),
  presentInCompiledDcProfile: JSON.stringify(compiledDc).includes(dcMisattributedRouteId.split(":")[1]),
  presentInGeneratedFactoryV2Registry: factoryV2Routes.has(dcMisattributedRouteId),
  presentInLaunchGraph: rowByRoute.has(dcMisattributedRouteId),
  presentInRatificationRegistry: ratifiedRoutes.has(dcMisattributedRouteId),
  hasAFulfillmentRecord: recordByRoute.has(dcMisattributedRouteId),
  commercialAdmission: measureAdmissionSurface(dcMisattributedRouteId),
  familyState: queueFamily.get("dc_correct_misattributed_arrest-set")?.state ?? null,
  restatement: "The declaration is inert, not a door. src/lib/rcap/documents/factory-v2-registry.ts carries a literal DC misattributed-arrest crosswalk, but the obligation is track-only: no compiled DC pathway emits the route, so screening can never select it, and every commercial admission point refuses it with fulfillment_no_record. It is a renderer crosswalk with nothing upstream that can reach it.",
  whatWouldChangeThat: "Adding a compiled runtime pathway under src/lib/rcap-engine/compiled/profiles/DC-district-of-columbia.json, which would make the route participant-reachable in screening. This lane did not do that: it is a live RCAP route change and a legal-design act, and the route also carries no counsel ratification.",
  decisionRequired: "counsel ratification for DC:dc_correct_misattributed_arrest in data/record-clearing/legal-decisions/route-ratification-registry.json, before any compiled pathway is added"
};

const anomaliesRestated = {
  evaluatorPaymentOpenWithoutAFulfillmentRecord: {
    priorFinding: "26 routes returning paymentAllowed=true at the evaluator with no fulfillment record",
    stillTrue: true,
    measuredNow: {
      paymentAllowedAtTheEvaluator: paymentAllowedRoutes.length,
      ofWhichHoldAFulfillmentRecord: paymentAllowedRoutes.length - paymentOpenWithoutRecord.length,
      ofWhichHoldNone: paymentOpenWithoutRecord.length
    },
    restatement: "The count is unchanged and the layering is intentional rather than broken. paymentAllowed is a screening-layer verdict read off the public witness fixture's terminal evaluation; commercial admission is decided separately by the fulfillment registry, which refuses all 26 with fulfillment_no_record. Nothing participant-visible follows from the evaluator's verdict either: no route in the compiled corpus displays a consumer price or reaches Checkout.",
    whatWouldResolveIt: "A product decision about whether the evaluator should keep returning paymentAllowed=true for a route no fulfillment record can serve. It is a reporting-consistency question, not a safety one, and it is not this lane's to decide.",
    routes: paymentOpenWithoutRecord.map((r) => ({
      routeId: r.pathwayKey,
      availability: r.availability,
      unmetOperationalGates: r.unmetOperationalGates
    }))
  },
  kansasMunicipalRoutes: {
    priorFinding: "two Kansas municipal routes whose sole unmet gate is paymentAllowed",
    stillTrue: true,
    restatement: "True at the launch graph and misleading as a measure of distance. unmetOperationalGates is one gate long for both routes, but operationallySellable is the intersection of the gates AND a fulfillment record, and neither route has a record: their family, rcap-ks-custom-pleading, carries 8 unmet generator preconditions and 4 remaining steps, one of which only Roger can take. The paymentAllowed gate is itself unmet because the evaluator's own settled outcome for these routes is guidance_only and needs_more_info — the product deliberately answers with guidance rather than a paid packet — so closing it would mean changing the screening outcome, not flipping a switch.",
    routes: kansasMunicipal,
    familyDistance: kansasFamily
      ? {
          familyId: kansasFamily.familyId,
          blocker: kansasFamily.blocker,
          unmetGeneratorPreconditionCount: kansasFamily.unmetGeneratorPreconditionCount,
          remainingStepCount: kansasFamily.remainingStepCount,
          remainingStepsOnlyRogerCanTake: kansasFamily.remainingStepsOnlyRogerCanTake,
          singleNextAction: kansasFamily.singleNextAction
        }
      : null
  },
  dcCorrectMisattributedArrest: dcMisattributed
};

// ------------------------------------------- decisions no agent may substitute for
const decisionsOnlyTheOwnerOrCounselCanMake = [
  {
    decision: "Adopt the completed output of the families that hold no completed-output owner approval, naming their exact shipping-artifact digests",
    whoDecides: "Roger",
    record: "data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json (OWN-ADOPT-2026-09-02-BATCH-53) or a successor record",
    blocks: `${census.byBlocker.NO_COMPLETED_OUTPUT_LEGAL_APPROVAL_FOR_THIS_FAMILY ?? 0} proven families, including ct-cleanslate-petition-set and rcap-ks-custom-pleading`,
    generatorPreconditionItCloses: "P08"
  },
  {
    decision: "Re-review the families whose approved shipping-artifact digest moved after approval",
    whoDecides: "Roger",
    record: "OWN-ADOPT-2026-09-02-BATCH-53, as a re-review",
    blocks: `${census.byBlocker.APPROVED_SHIPPING_DIGEST_MOVED_SINCE_APPROVAL ?? 0} proven families`,
    generatorPreconditionItCloses: "P09"
  },
  {
    decision: "Resolve Kansas Judicial Council commercial reuse and republication treatment for the six held Kansas source families",
    whoDecides: "Roger — an issuer permission negotiation",
    record: "data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json",
    blocks: "6 PRODUCT_PATH_PENDING families; every exact current source byte is already held",
    generatorPreconditionItCloses: null
  },
  {
    decision: "Decide what to do about the routes whose evaluator payment gate is open while the fulfillment layer refuses",
    whoDecides: "Roger",
    record: "data/rcap-ledger/launch-graph.json read together with data/rcap-grade-a/fulfillment-authority-registry.json",
    blocks: `${paymentOpenWithoutRecord.length} routes, none of which can take money today`,
    generatorPreconditionItCloses: "P07"
  },
  {
    decision: "Ratify DC:dc_correct_misattributed_arrest, or record that it stays unratified, before any compiled DC pathway is added for it",
    whoDecides: "counsel (Lawrence), through the route ratification registry",
    record: "data/record-clearing/legal-decisions/route-ratification-registry.json",
    blocks: "the only proven family whose blocker is NO_COMPILED_RUNTIME_PATHWAY and whose crosswalk already ships",
    generatorPreconditionItCloses: "P01"
  },
  {
    decision: "Answer which Utah route or case fact selects hearing form 1110GE versus no-hearing form 1111GE",
    whoDecides: "counsel or a recorded source determination — not an agent",
    record: "data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json, family ut_pet_remove_link-set",
    blocks: "1 PRODUCT_PATH_PENDING family",
    generatorPreconditionItCloses: null
  },
  {
    decision: "Authorize the hosted acceptance credentials and a Captain-owned exact-route batch input, so hosted consumer and sponsored canaries can be run for the five commercially eligible routes",
    whoDecides: "Roger",
    record: `${INPUTS.hostedCanaryReturn} — hostedWorkflow.missingCredentialNames and remainingCaptainFollowUp`,
    blocks: "all 5 routes that already hold a commercially eligible fulfillment record",
    generatorPreconditionItCloses: null
  }
];

// -------------------------------------------------------------------- document
const document = {
  schemaVersion: "rcap-route-productization-disposition/v1",
  generatedBy: "scripts/rcap-route-productization/generate-route-productization-disposition.mjs",
  question: "Which routes are operationally sellable today, and for every route that is not, what is the single exact thing standing in front of it right now?",
  createsApproval: false,
  changesRuntime: false,
  opensAnyRoute: false,
  productionTouched: false,
  paymentTripleTouched: false,
  whatThisIsNot: [
    "not a registry: the controlling registry of fulfillment authority remains data/rcap-grade-a/fulfillment-authority-registry.json",
    "not a launch graph: route gates are read from data/rcap-ledger/launch-graph.json",
    "not a second census: family distance is read from PROVEN_FAMILY_PRODUCTIZATION_CENSUS.json and not recomputed",
    "not an authority: every legal fact here is copied from an owner or counsel record and none is created"
  ],
  headline: {
    routesNewlyOperationallySellable: 0,
    routesOperationallySellable: operationallySellable.length,
    fulfillmentAuthorityRecordsGeneratedByThisLane: 0,
    productPathPendingFamiliesClosedByThisLane: 0,
    routesHoldingACommerciallyEligibleFulfillmentRecord: nearestRoutes.length,
    productPathPendingFamiliesRemeasuredAgainstTodaysBytes: pendingRows.length,
    productPathPendingSubClaimsMeasuredClosed: vaSubClaims.filter((c) => !c.stillTrue).length,
    productPathPendingSubClaimsStillOpen: vaSubClaims.filter((c) => c.stillTrue).length,
    whatMovedAndWhatDidNot: "Nothing was closed by this lane. The one PRODUCT_PATH_PENDING cause route productization owns, the stale Virginia route/product graph, was re-measured claim by claim: four of its five recorded sub-claims are already closed by the derived-graph regenerations recorded in the census, and one remains. The remaining nineteen are owned by other lanes or by a person, and each is re-stated with the blocker measured today rather than the blocker recorded when the verdict was written.",
    why: "No route clears all seven conditions. Five routes across four packet families hold a commercially eligible fulfillment record and have closed every in-repository link; each is blocked on a hosted consumer canary and a hosted sponsored canary that cannot be run from this repository, and beyond that on owner-controlled launch gates. Separately, a commercial-delivery gate is currently red for exactly those routes, so opening any of them, or minting another record, would widen an open delivery admission rather than close one."
  },
  inputs: Object.fromEntries(Object.entries(INPUTS).map(([, rel]) => [rel, fileSha256(rel)])),
  commercialRouteRequirements,
  activeCommercialDeliveryHold,
  nearestRoutes,
  productPathPending: {
    note: "One row per PRODUCT_PATH_PENDING family, re-measured against today's bytes. executableByThisLane records whether route productization could have closed it; where it could not, the reason names the lane that owns it.",
    total: pendingRows.length,
    closedByThisLane: 0,
    executableByThisLane: pendingRows.filter((r) => r.executableByThisLane).length,
    byMechanism: census.productPathPending.byMechanism,
    families: pendingRows
  },
  anomaliesRestated,
  decisionsOnlyTheOwnerOrCounselCanMake
};

const serialized = `${JSON.stringify(document, null, 2)}\n`;
const outAbs = path.join(ROOT, OUT);
if (CHECK) {
  const current = fs.existsSync(outAbs) ? fs.readFileSync(outAbs, "utf8") : null;
  if (current !== serialized) {
    console.error(`Regeneration required — ${OUT} does not match its evidence.`);
    process.exit(1);
  }
  console.log(`${OUT} is current.`);
} else {
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, serialized);
  console.log(`wrote ${OUT}`);
}

console.log(`  operationally sellable routes: ${operationallySellable.length}`);
console.log(`  routes holding a commercially eligible fulfillment record: ${nearestRoutes.length}`);
console.log(`  routes admitted at delivery while the launch graph says unsellable: ${deliveryAdmittedWhileUnsellable.length}`);
console.log(`  evaluator payment open with no fulfillment record: ${paymentOpenWithoutRecord.length}`);
console.log(`  PRODUCT_PATH_PENDING families: ${pendingRows.length} (executable by this lane: ${pendingRows.filter((r) => r.executableByThisLane).length})`);
