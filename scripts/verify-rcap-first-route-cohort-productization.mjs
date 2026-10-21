#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);
register("./lib/ts-esm-loader.mjs", import.meta.url);
// This repository is intentionally sparse at `src/lib/rcap-engine`. The route
// resolver needs only jurisdiction normalization and the existence of a
// compiled profile to exercise the productization branch, so provide that
// narrow seam when the real registry is not materialized. Full checkouts keep
// importing the real module.
if (!fs.existsSync(path.join(ROOT, "src/lib/rcap-engine/profile-registry.ts"))) {
  const profileModule = `
    export function normalizeJurisdictionCode(value) {
      return String(value ?? "").trim().toUpperCase().replace(/[^A-Z]/g, "");
    }
    export function getProfileByJurisdiction(jurisdiction) {
      const code = normalizeJurisdictionCode(jurisdiction);
      return code ? { jurisdiction: { code }, profileVersion: "source-light-verifier", pathways: [] } : undefined;
    }
  `;
  const profileUrl = `data:text/javascript,${encodeURIComponent(profileModule)}`;
  const packetCorrectionUrl = `data:text/javascript,${encodeURIComponent("export default { rows: [] };")}`;
  const runtimeEnvironmentUrl = `data:text/javascript,${encodeURIComponent(`
    export function resolveDeploymentEnvironment() { return "development"; }
    export function isProductionRuntimeEnvironment() { return false; }
  `)}`;
  const sourceLightLoader = `
    export async function resolve(specifier, context, nextResolve) {
      if (specifier === "@/lib/rcap-engine/profile-registry") {
        return { url: ${JSON.stringify(profileUrl)}, shortCircuit: true };
      }
      if (specifier === "@/../data/rcap-ledger/packet-correction-required.json") {
        return { url: ${JSON.stringify(packetCorrectionUrl)}, shortCircuit: true };
      }
      if (specifier === "@/lib/server-runtime-environment") {
        return { url: ${JSON.stringify(runtimeEnvironmentUrl)}, shortCircuit: true };
      }
      return nextResolve(specifier, context);
    }
  `;
  register(`data:text/javascript,${encodeURIComponent(sourceLightLoader)}`, import.meta.url);
}

const MUTATIONS = process.argv.includes("--mutations");
const MIGRATIONS_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";
const FACTORY_REGISTRY_PATH = "data/record-clearing/factory-v2-route-registry.json";
const FULFILLMENT_REGISTRY_PATH = "data/rcap-grade-a/fulfillment-authority-registry.json";
const OWNER_DECISION_PATH = "data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json";
const POST_APPROVAL_AUDIT_PATH = "data/rcap-grade-a/legal-decisions/POST_APPROVAL_CHANGE_AUDIT_2026-09-02.json";
const RELEASE_READINESS_PATH = "data/rcap-codex/release-readiness.json";
const LAUNCH_GRAPH_PATH = "data/rcap-ledger/launch-graph.json";
const HOSTED_ACCEPTANCE_PATH = "data/rcap-all50/hosted-acceptance-journeys.json";

const readBytes = (relative) => {
  const materialized = path.join(ROOT, relative);
  return fs.existsSync(materialized)
    ? fs.readFileSync(materialized)
    : execFileSync("git", ["show", `HEAD:${relative}`], { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 });
};
const read = (relative) => JSON.parse(readBytes(relative).toString("utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const stableStringify = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
};

const {
  packetSpecificationFor,
  packetSpecificationForTrack,
  specificationContentSha256,
  specificationLegalSectionsBound
} = await import("../src/lib/rcap/grade-a/packet-specification.ts");
const {
  factoryV2RouteFor,
  factoryV2RouteMigrationFor,
  resetFactoryV2RegistryCache
} = await import("../src/lib/rcap/documents/factory-v2-registry.ts");
const {
  resolvePacketRoute
} = await import("../src/lib/rcap/documents/packet-route-resolver.ts");
const {
  buildRenderJobSpec
} = await import("../src/lib/rcap/render/job-contract.ts");
const {
  commercialRouteIdentity,
  resolvePacketFamilyId
} = await import("../src/lib/rcap/render/commercial-admission.ts");
const {
  admitCommercial
} = await import("../src/lib/rcap/fulfillment/grade-a-admission.ts");
const {
  resolveConsumerDeliveryRouteState
} = await import("../src/lib/rcap/render/consumer-delivery-control.ts");

const ROUTES = [
  {
    jurisdiction: "DC",
    pathwayId: "dc_actual_innocence_expungement_16_803",
    familyId: "dc_innocence_expungement-set",
    trackIds: ["dc_innocence_expungement"],
    specificationPath: "data/record-clearing/packet-specifications/DC-actual-innocence-expungement.v1.json",
    overlayRoot: "data/rcap-all50/overlays/census-v1/dc/dc-innocence-expungement-set--custom-pleading",
    migrated: true,
    components: ["primary_filing", "prosecutor_service", "filing_instructions"],
    artifacts: {
      canonical: ["d887a3cba40f27765809ba436a4ed4c223f5927282f3f4f43eee178e5b2a1076", 14157, 5],
      boundary: ["84ebf215a5e1e3b25fbc15cfdac155b375650f553c41046ceeeb5dcc0bc6203d", 14422, 5]
    }
  },
  {
    jurisdiction: "DC",
    pathwayId: "dc_correct_misattributed_arrest",
    obligationRouteKey: "obligation:track-only:DC:dc_correct_misattributed_arrest",
    familyId: "dc_correct_misattributed_arrest-set",
    trackIds: ["dc_correct_misattributed_arrest"],
    inputTrackId: "dc_correct_misattributed_arrest",
    specificationPath: "data/record-clearing/packet-specifications/DC-correct-misattributed-arrest.v1.json",
    overlayRoot: "data/rcap-all50/overlays/census-v1/dc/dc-correct-misattributed-arrest-set--custom-pleading",
    migrated: false,
    ownerApproved: true,
    postApprovalAudited: false,
    exactProductized: true,
    generatedRegistryRow: false,
    exactTrackSelectionRequired: true,
    nextGate: "post-approval substantive-legal-change audit for OWN-ADOPT-2026-09-02-BATCH-53, then separate fulfillment-authority generation",
    requiredInputIds: [
      "participant_full_legal_name",
      "date_of_birth",
      "contact_information",
      "underlying_case_number",
      "misidentification_facts",
      "no_fingerprints_taken",
      "no_other_identification",
      "prosecuting_office_name_address"
    ],
    components: ["primary_filing", "prosecutor_service", "filing_instructions"],
    manifestComponents: [
      ["dc_correct_misattributed_arrest-primary-filing-1", "primary_filing", "custom_pleading", null, 1],
      ["dc_correct_misattributed_arrest-prosecutor-service-2", "prosecutor_service", "process_guidance", null, 2],
      ["dc_correct_misattributed_arrest-filing-instructions-3", "filing_instructions", "process_guidance", null, 3]
    ],
    artifacts: {
      canonical: ["d4e4125cb51ec2248468dc093da2d40f66ae1dafc380ed7c2d6f84ec8fc4ce7f", 13617, 5],
      boundary: ["4a5cea51f550c553758c09e1ad96f21d0c0f751bdf77ee2da6adb7a2f9dc4225", 13868, 5]
    }
  },
  {
    jurisdiction: "IL",
    pathwayId: "felony-prostitution-relief",
    familyId: "il-prostitution-j-vacate-set",
    trackIds: ["il-prostitution-j-vacate"],
    rawTrackIds: ["il-prostitution-j-auto", "il-prostitution-j-vacate"],
    rawPacketSetIds: ["il-prostitution-j-auto-set", "il-prostitution-j-vacate-set"],
    inputTrackId: "il-prostitution-j-vacate",
    specificationPath: "data/record-clearing/packet-specifications/IL-felony-prostitution-relief.v1.json",
    overlayRoot: "data/rcap-all50/overlays/census-v1/il/il-prostitution-j-vacate-set--custom-pleading",
    migrated: true,
    components: ["primary_filing", "proposed_order"],
    // APPROVAL PIN, FAILING ON PURPOSE. These are the bytes the decision owner
    // approved on 2026-09-02 (OWN-ADOPT-2026-09-02-BATCH-53), under the
    // condition that any shipping-artifact digest change requires re-review.
    // Commit 42defabe4 (FIX02) added one court-owned-fields line to the
    // proposed order and moved the bytes to d4cb7659… / ea728bba…, which no
    // legal decision names. The loop below therefore fails at the rendered
    // report and again at the bytes on disk, and both failures are true.
    // Do not repair this by moving the pin: a changed pin would be a renewed
    // approval written by a verifier. The route is already REVOKED and denied
    // (this file still asserts sellable=false and MAINTENANCE_HOLD for it), so
    // the red is a stale-approval signal, not a commercial exposure. Moving the
    // pin needs a NEW legal-decision record naming the moved bytes, from the
    // decision owner, and a lane holding that record.
    // Disposition: docs/rcap/grade-a/captain/IL_PIN_DISPOSITION_2026-09-06.md
    artifacts: {
      canonical: ["7daaa389709afebccd46cdcee56b16c9888eb4ddcda2475c6c1e0b7315b9517d", 7802, 3],
      boundary: ["714832a826220e0d1f82363af3aa251d6dd5e3e9d7fb7235450b002cb614705b", 7980, 3]
    }
  },
  {
    jurisdiction: "MS",
    pathwayId: "additional-justice-court-misdemeanor-relief-9-11-15-3",
    familyId: "ms-misd-addl-set",
    trackIds: ["ms-misd-addl"],
    specificationPath: "data/record-clearing/packet-specifications/MS-additional-misdemeanor-relief.v1.json",
    overlayRoot: "data/rcap-all50/overlays/census-v1/ms/ms-misd-addl-set--custom-pleading",
    migrated: true,
    components: [
      "ms-misd-addl-primary-filing-1",
      "ms-misd-addl-proposed-order-2",
      "ms-misd-addl-certificate-of-service-3",
      "ms-misd-addl-attachment-4",
      "ms-misd-addl-instructions-5"
    ],
    artifacts: {
      canonical: ["7878f2c0d297bf272eb166820505996ba32976a174b8019140ee83728bf3cd3c", 21298, 8],
      boundary: ["96c13766362702101176e205e7cea1bd39a9305fe175f703ece4e5241680a3c5", 21617, 8]
    }
  },
  {
    jurisdiction: "MS",
    pathwayId: "additional-municipal-court-misdemeanor-relief-21-23-7-6",
    familyId: "ms-misd-addl-set",
    trackIds: ["ms-misd-addl"],
    specificationPath: "data/record-clearing/packet-specifications/MS-additional-misdemeanor-relief.v1.json",
    overlayRoot: "data/rcap-all50/overlays/census-v1/ms/ms-misd-addl-set--custom-pleading",
    migrated: true,
    components: [
      "ms-misd-addl-primary-filing-1",
      "ms-misd-addl-proposed-order-2",
      "ms-misd-addl-certificate-of-service-3",
      "ms-misd-addl-attachment-4",
      "ms-misd-addl-instructions-5"
    ],
    artifacts: {
      canonical: ["7878f2c0d297bf272eb166820505996ba32976a174b8019140ee83728bf3cd3c", 21298, 8],
      boundary: ["96c13766362702101176e205e7cea1bd39a9305fe175f703ece4e5241680a3c5", 21617, 8]
    }
  },
  {
    jurisdiction: "WY",
    pathwayId: "felony-conviction-expungement-w-s-7-13-1502",
    familyId: "wy_fel_1502-set",
    trackIds: ["wy_fel_1502"],
    specificationPath: "data/record-clearing/packet-specifications/WY-felony-conviction-expungement.v1.json",
    overlayRoot: "data/rcap-all50/overlays/census-v1/wy/wy-fel-1502-set--custom-pleading",
    migrated: false,
    components: [
      "wy_fel_1502-primary-filing-1",
      "wy_fel_1502-proposed-order-2",
      "wy_fel_1502-verification-3",
      "wy_fel_1502-certificate-of-service-4",
      "wy_fel_1502-filing-instructions-5"
    ],
    artifacts: {
      canonical: ["3dcdbc4ec3d9f08b6c6302b84f254663aa9302a4f712d7451000e2ecda302e30", 21843, 8],
      boundary: ["703e8d3202e8ecc45aefc000346d65db8bec60ae2b9f1e8ce34796e97400f800", 22165, 8]
    }
  },
  {
    jurisdiction: "CT",
    pathwayId: "petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202",
    obligationRouteKey: "obligation:track-pathway:CT:ct-cleanslate-petition:petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202",
    familyId: "ct-cleanslate-petition-set",
    trackIds: ["ct-cleanslate-petition"],
    inputTrackId: "ct-cleanslate-petition",
    specificationPath: "data/record-clearing/packet-specifications/CT-petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202.v1.json",
    overlayRoot: "data/rcap-all50/overlays/census-v1/ct/ct-cleanslate-petition-set--official-pdf-fill",
    migrated: false,
    ownerApproved: false,
    exactTrackSelectionRequired: true,
    components: ["ct-cleanslate-petition-primary-filing-1"],
    artifacts: {
      canonical: ["d44ace77326e51a697450d18a033eadccf308b32d5d426ce5c73ffc989546e06", 248957, 2],
      boundary: ["e190d7304260be94e84e46fb18710ee85e1f5a5314e7a7a5a5dd5eeb33b3d052", 248978, 2]
    }
  }
].map((route) => {
  const rawTrackIds = route.rawTrackIds ?? route.trackIds;
  const rawPacketSetIds = route.rawPacketSetIds ?? [route.familyId];
  return {
    ...route,
    routeId: `${route.jurisdiction}:${route.pathwayId}`,
    rawTrackIds,
    rawPacketSetIds,
    ownerApproved: route.ownerApproved ?? true,
    postApprovalAudited: route.postApprovalAudited ?? (route.ownerApproved ?? true),
    exactProductized: route.exactProductized ?? route.ownerApproved === false,
    generatedRegistryRow: route.generatedRegistryRow ?? true,
    exactTrackSelectionRequired: route.exactTrackSelectionRequired
      ?? (rawTrackIds.length !== route.trackIds.length || rawPacketSetIds.length !== 1)
  };
});

const FULFILLMENT_EVIDENCE_GAP_ROUTES = new Set([
  "DC:dc_actual_innocence_expungement_16_803",
  "IL:felony-prostitution-relief",
  "MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
  "MS:additional-municipal-court-misdemeanor-relief-21-23-7-6",
  "WY:felony-conviction-expungement-w-s-7-13-1502"
]);

const REQUIRED_BUILD_INPUTS = [
  "authoritativeProfile",
  "authoritativePathway",
  "exactPacketSet",
  "packetSpecification",
  "requiredParticipantFields",
  "sourceOrApprovedComposedDocument",
  "deterministicFixture"
];

const firstCohort = read("data/rcap-grade-a/FIRST_ROUTE_COHORT.json");
assert.match(firstCohort.atCommit, /^[0-9a-f]{40}$/,
  "the canonical cohort generator must bind the selection to an exact evidence commit");
const selectedFamilies = new Set(firstCohort.cohort.map((row) => row.familyId));
for (const familyId of [
  "dc_innocence_expungement-set",
  "il-prostitution-j-vacate-set",
  "ms-misd-addl-set",
  "wy_fel_1502-set"
]) {
  assert.ok(selectedFamilies.has(familyId),
    `the rolling cohort must retain the productized family ${familyId}`);
}
assert.equal(selectedFamilies.has("ct-cleanslate-petition-set"), false,
  "CT must not be borrowed into the owner-approved cohort");
const ctCohortEvidence = firstCohort.allRows.find((row) => row.familyId === "ct-cleanslate-petition-set");
assert.ok(ctCohortEvidence, "CT technical productization requires its exact current cohort evidence row");
assert.equal(ctCohortEvidence.checks.packetProven, true);
assert.equal(ctCohortEvidence.checks.routeToFamilyBindingExact, true);
assert.equal(ctCohortEvidence.checks.sourceIdentityComplete, true);
assert.equal(ctCohortEvidence.checks.noHoldApplies, true);
assert.equal(ctCohortEvidence.checks.coveredByAnExistingOwnerApproval, false);
assert.equal(ctCohortEvidence.checks.noSubstantiveLegalChangeSinceThatApproval, false);
assert.equal(ctCohortEvidence.legalApproval, null);
assert.equal(ctCohortEvidence.inCohort, false);
assert.equal(selectedFamilies.has("dc_correct_misattributed_arrest-set"), false,
  "DC misattributed-arrest must not enter the cohort without its post-approval audit");
const dcMisattributedCohortEvidence = firstCohort.allRows.find((row) =>
  row.familyId === "dc_correct_misattributed_arrest-set");
assert.ok(dcMisattributedCohortEvidence,
  "DC misattributed-arrest productization requires its exact current cohort evidence row");
assert.equal(dcMisattributedCohortEvidence.checks.packetProven, true);
assert.equal(dcMisattributedCohortEvidence.checks.verdictCurrentAndDeclaresItsBase, true);
assert.equal(dcMisattributedCohortEvidence.checks.rasterReceiptStillBindsTheBytes, true);
assert.equal(dcMisattributedCohortEvidence.checks.routeToFamilyBindingExact, true);
assert.equal(dcMisattributedCohortEvidence.checks.sourceIdentityComplete, true);
assert.equal(dcMisattributedCohortEvidence.checks.coveredByAnExistingOwnerApproval, true);
assert.equal(dcMisattributedCohortEvidence.checks.noSubstantiveLegalChangeSinceThatApproval, false);
assert.equal(dcMisattributedCohortEvidence.checks.noHoldApplies, true);
assert.deepEqual(dcMisattributedCohortEvidence.unmetConditions,
  ["noSubstantiveLegalChangeSinceThatApproval"]);
assert.equal(dcMisattributedCohortEvidence.independentVerification.verdict, "PASS_COMPLETE_INDEPENDENT");
assert.equal(dcMisattributedCohortEvidence.independentVerification.verifierId, "vf03");
assert.equal(dcMisattributedCohortEvidence.independentVerification.verifiedAtBase,
  "efda1c0aa5e8e5c6b2b519dca84b0adaee66c595");
assert.equal(dcMisattributedCohortEvidence.legalApproval.legalDecisionRecordId,
  "OWN-ADOPT-2026-09-02-BATCH-53");
assert.equal(dcMisattributedCohortEvidence.legalApproval.approvalCurrent, true);
assert.equal(dcMisattributedCohortEvidence.inCohort, false);

const manifests = read(MIGRATIONS_PATH);
const migrations = manifests.factoryV2RouteMigrations ?? [];
assert.deepEqual(migrations.map((row) => row.routeId).sort(), ROUTES.filter((row) => row.migrated).map((row) => row.routeId).sort(),
  "the migration crosswalk must contain exactly the four retired-legacy routes and no jurisdiction-wide row");
for (const migration of migrations) {
  assert.equal(migration.scope, "route_only");
  assert.equal(migration.ownerDecisionRecordId, "OWN-ADOPT-2026-09-02-BATCH-53");
  assert.equal(migration.createsCommercialAuthority, false);
  assert.equal(migration.opensRoute, false);
}
const ctPacketSet = manifests.packetSets.filter((row) => row.packetSetId === "ct-cleanslate-petition-set");
assert.equal(ctPacketSet.length, 1, "the CT family must have one exact packet-set row");
assert.deepEqual(ctPacketSet[0].factoryV2RouteProductization, {
  obligationRouteKey: "obligation:track-pathway:CT:ct-cleanslate-petition:petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202",
  runtimeRouteId: "CT:petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202",
  jurisdiction: "CT",
  pathwayId: "petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202",
  registryTrackIds: ["ct-cleanslate-petition"],
  packetFamilyId: "ct-cleanslate-petition-set",
  scope: "route_track_family_only",
  legalApproval: null,
  postApprovalChangeAudit: null,
  createsCommercialAuthority: false,
  opensRoute: false,
  nextGate: "current CT owner legal approval and post-approval change audit, then separate fulfillment-authority generation"
});
const dcMisattributedPacketSets = manifests.packetSets.filter((row) =>
  row.packetSetId === "dc_correct_misattributed_arrest-set");
assert.equal(dcMisattributedPacketSets.length, 1,
  "the DC misattributed-arrest family must have one exact packet-set row");
const dcMisattributedPacketSet = dcMisattributedPacketSets[0];
const {
  legalApproval: dcMisattributedLegalApproval,
  ...dcMisattributedCrosswalk
} = dcMisattributedPacketSet.factoryV2RouteProductization;
assert.deepEqual(dcMisattributedCrosswalk, {
  obligationRouteKey: "obligation:track-only:DC:dc_correct_misattributed_arrest",
  runtimeRouteId: "DC:dc_correct_misattributed_arrest",
  jurisdiction: "DC",
  pathwayId: "dc_correct_misattributed_arrest",
  registryTrackIds: ["dc_correct_misattributed_arrest"],
  packetFamilyId: "dc_correct_misattributed_arrest-set",
  scope: "route_track_family_only",
  postApprovalChangeAudit: null,
  createsCommercialAuthority: false,
  opensRoute: false,
  nextGate: "post-approval substantive-legal-change audit for OWN-ADOPT-2026-09-02-BATCH-53, then separate fulfillment-authority generation"
});
assert.equal(dcMisattributedLegalApproval.legalApprovalResult, "ADOPT");
assert.equal(dcMisattributedLegalApproval.legalDecisionRecordId, "OWN-ADOPT-2026-09-02-BATCH-53");
assert.equal(dcMisattributedLegalApproval.legalDecisionOwner, "Roger Roman");
assert.equal(dcMisattributedLegalApproval.legalDecisionEffectiveDate, "2026-09-02");
assert.equal(dcMisattributedLegalApproval.approvalCurrent, true);
assert.deepEqual(dcMisattributedLegalApproval.shippingArtifactDigestPins.map((pin) => [pin.fixture, pin.sha256]), [
  ["canonical", "d4e4125cb51ec2248468dc093da2d40f66ae1dafc380ed7c2d6f84ec8fc4ce7f"],
  ["boundary", "4a5cea51f550c553758c09e1ad96f21d0c0f751bdf77ee2da6adb7a2f9dc4225"]
]);
assert.deepEqual(dcMisattributedPacketSet.components.map((component) => [
  component.componentId,
  component.role,
  component.outputStrategy,
  component.officialFormId,
  component.order
]), [
  ["dc_correct_misattributed_arrest-primary-filing-1", "primary_filing", "custom_pleading", null, 1],
  ["dc_correct_misattributed_arrest-prosecutor-service-2", "prosecutor_service", "process_guidance", null, 2],
  ["dc_correct_misattributed_arrest-filing-instructions-3", "filing_instructions", "process_guidance", null, 3]
]);
assert.ok(dcMisattributedPacketSet.components.every((component) => component.officialSourceUrl === null),
  "the DC reference source must not be represented as a shipped official-form component");

const generatorSource = fs.readFileSync(path.join(ROOT, "scripts/generate-rcap-factory-v2-registry.mjs"), "utf8");
assert.match(generatorSource, /const PACKET_SETS = "data\/record-clearing\/legal-design-packet-set-manifests\.json"/,
  "the migration crosswalk must live in the existing packet-set input consumed by the factory-v2 generator");
assert.match(generatorSource, /packetSets = read\(PACKET_SETS\)/);
assert.match(generatorSource, /packetSetManifests: \{ path: PACKET_SETS, sha256: sha256\(PACKET_SETS\) \}/,
  "the generator must continue to digest-pin the migration input");

const rawRegistry = read(FACTORY_REGISTRY_PATH);
const fulfillment = read(FULFILLMENT_REGISTRY_PATH);
const ownerDecision = read(OWNER_DECISION_PATH);
const postApprovalAudit = read(POST_APPROVAL_AUDIT_PATH);
assert.equal(ownerDecision.recordId, "OWN-ADOPT-2026-09-02-BATCH-53");
for (const route of ROUTES) {
  const raw = rawRegistry.routes.find((row) => row.pathwayKey === route.routeId);
  if (route.generatedRegistryRow) {
    assert.ok(raw, `${route.routeId}: generated factory-v2 row missing`);
    assert.ok(REQUIRED_BUILD_INPUTS.every((name) => raw.buildInputs?.[name] === true),
      `${route.routeId}: all seven generated build inputs must remain true`);
    assert.deepEqual(raw.unmetBuildInputs, [], `${route.routeId}: generated build inputs unexpectedly unmet`);
    assert.deepEqual(raw.packetSetIds, route.rawPacketSetIds);
    assert.deepEqual(raw.registryTrackIds, route.rawTrackIds);
    assert.equal(raw.factoryV2Resolves, !route.migrated,
      `${route.routeId}: only retired-legacy ownership may distinguish the raw generated admission`);
    assert.equal(raw.legacyGeneratorOwnsThisJurisdiction, route.migrated);
  } else {
    assert.equal(raw, undefined,
      `${route.routeId}: the exact track-only route must not pretend it has a generated pathway row`);
  }

  const spec = packetSpecificationFor(route.routeId);
  assert.ok(spec, `${route.routeId}: route-scoped packet specification missing`);
  assert.equal(spec.packetFamily, route.familyId);
  assert.ok((spec.routeKeys ?? [spec.routeKey]).includes(route.routeId));
  assert.equal(packetSpecificationForTrack(route.routeId, route.trackIds[0]), spec,
    `${route.routeId}: exact track did not resolve its server-owned specification`);
  if (route.postApprovalAudited) {
    assert.equal(spec.legalSectionsBoundBy?.ownerDecisionRecordId, ownerDecision.recordId);
    assert.equal(spec.legalSectionsBoundBy?.postApprovalAuditVerdict, "COVERED_BY_EXISTING_APPROVAL");
    assert.equal(specificationLegalSectionsBound(spec), true);
  } else {
    assert.equal(spec.obligationRouteKey, route.obligationRouteKey);
    assert.equal(spec.legalSectionsBoundBy, undefined,
      `${route.routeId}: an absent post-approval audit was represented as a bound legal section`);
    if (route.ownerApproved) {
      assert.equal(spec.legalApproval?.legalDecisionRecordId, ownerDecision.recordId);
      assert.equal(spec.legalApproval?.approvalCurrent, true);
    } else {
      assert.equal(spec.legalApproval, null);
    }
    assert.equal(spec.postApprovalChangeAudit, null);
    assert.equal(specificationLegalSectionsBound(spec), false);
    assert.equal(spec.nextGate, route.nextGate
      ?? "current CT owner legal approval and post-approval change audit, then separate fulfillment-authority generation");
  }
  assert.equal(resolvePacketFamilyId(route.routeId), route.familyId,
    `${route.routeId}: server-owned family crosswalk mismatch`);
  assert.equal(specificationContentSha256(spec), spec.specificationSha256,
    `${route.routeId}: runtime must expose the committed specification digest`);

  const specFile = read(route.specificationPath);
  const recordedSpecSha = specFile.specificationSha256;
  delete specFile.specificationSha256;
  assert.equal(sha256(stableStringify(specFile)), recordedSpecSha,
    `${route.routeId}: specification content digest is stale`);
  assert.deepEqual(spec.documents.slice().sort((a, b) => a.order - b.order).map((document) => document.documentId), route.components,
    `${route.routeId}: specification does not bind the exact component set in order`);

  const rendered = read(`${route.overlayRoot}/reports/rendered-artifacts.json`);
  if (route.ownerApproved) {
    assert.deepEqual(rendered.componentSet, route.components, `${route.routeId}: shipping report component set drifted`);
  } else {
    assert.deepEqual(ctPacketSet[0].components.map((component) => component.componentId), route.components,
      `${route.routeId}: packet-set component set drifted`);
    assert.deepEqual(ctPacketSet[0].components.map((component) => [component.role, component.outputStrategy, component.officialFormId]),
      [["primary_filing", "official_pdf_fill", "JD-CR-202"]]);
  }
  const specificationArtifacts = route.postApprovalAudited ? spec.approvedArtifacts : spec.artifactEvidence;
  assert.deepEqual(specificationArtifacts?.map((artifact) => artifact.fixture).sort(), ["boundary", "canonical"]);
  let adoptedArtifacts = null;
  if (route.ownerApproved) {
    const adoptionQualification = ownerDecision.adoption.qualifications.find((qualification) =>
      qualification.families.includes(route.familyId));
    assert.ok(adoptionQualification, `${route.routeId}: owner decision does not adopt the family`);
    adoptedArtifacts = adoptionQualification.digestConditionRecordedPerFamily[route.familyId];
    assert.ok(adoptedArtifacts, `${route.routeId}: owner decision has no exact artifact pins`);
    const currentAudit = postApprovalAudit.families.find((row) => row.familyId === route.familyId);
    if (route.postApprovalAudited) {
      assert.equal(currentAudit?.verdict, "COVERED_BY_EXISTING_APPROVAL");
      assert.equal(currentAudit?.reviewedAgainstApprovalRecordId, ownerDecision.recordId);
      assert.equal(currentAudit?.currentIndependentVerification?.verdict, "PASS_COMPLETE_INDEPENDENT");
      assert.equal(currentAudit?.mayEnterTheFirstCohort, true);
    } else {
      assert.equal(currentAudit, undefined,
        `${route.routeId}: a post-approval audit was fabricated for this family`);
    }
  } else {
    assert.equal(ownerDecision.adoption.qualifications.some((qualification) =>
      qualification.families.includes(route.familyId)), false,
    `${route.routeId}: CT unexpectedly appears in the existing owner decision`);
    assert.equal(postApprovalAudit.families.some((row) => row.familyId === route.familyId), false,
      `${route.routeId}: CT unexpectedly appears in the post-approval audit`);
  }
  const reportArtifacts = rendered.pdfs ?? rendered.artifacts;
  for (const [fixture, [expectedSha, expectedBytes, expectedPages]] of Object.entries(route.artifacts)) {
    const artifact = specificationArtifacts.find((candidate) => candidate.fixture === fixture);
    const reportArtifact = reportArtifacts.find((candidate) => candidate.fixture === fixture);
    const adoptedArtifact = adoptedArtifacts?.find((candidate) => candidate.fixture === fixture) ?? null;
    assert.ok(artifact && reportArtifact, `${route.routeId}/${fixture}: artifact binding missing`);
    if (route.ownerApproved) {
      assert.ok(adoptedArtifact, `${route.routeId}/${fixture}: owner decision artifact binding missing`);
    }
    if (!route.postApprovalAudited) {
      assert.equal(artifact.authority, "technical_evidence_only");
    }
    assert.deepEqual(artifact.components, route.components);
    assert.equal(artifact.sha256, expectedSha);
    assert.equal(artifact.byteLength, expectedBytes);
    assert.equal(artifact.pageCount, expectedPages);
    assert.equal(reportArtifact.sha256, expectedSha);
    assert.equal(reportArtifact.byteLength, expectedBytes);
    if (reportArtifact.pageCount !== undefined) assert.equal(reportArtifact.pageCount, expectedPages);
    if (adoptedArtifact) {
      assert.equal(adoptedArtifact.file, artifact.file);
      assert.equal(adoptedArtifact.sha256, expectedSha);
    }
    const bytes = readBytes(artifact.file);
    assert.equal(sha256(bytes), expectedSha, `${route.routeId}/${fixture}: shipping bytes changed`);
    assert.equal(bytes.length, expectedBytes, `${route.routeId}/${fixture}: shipping byte length changed`);
  }

  const factory = factoryV2RouteFor(route.jurisdiction, route.pathwayId, route.inputTrackId);
  assert.ok(factory, `${route.routeId}: exact route not admitted by factory-v2`);
  assert.equal(factory.packetFamilyId, route.familyId);
  assert.deepEqual(factory.packetSetIds, [route.familyId]);
  assert.deepEqual(factory.registryTrackIds, route.trackIds);
  if (route.requiredInputIds) assert.deepEqual(factory.requiredInputIds, route.requiredInputIds);
  assert.equal(factory.exactTrackSelectionRequired, route.exactTrackSelectionRequired);
  assert.equal(factory.exactRouteProductization !== null, route.exactProductized);
  assert.equal(factoryV2RouteMigrationFor(route.jurisdiction, route.pathwayId, route.inputTrackId)?.routeId ?? null,
    route.migrated ? route.routeId : null);

  const resolution = resolvePacketRoute({
    state: route.jurisdiction,
    pathway: route.pathwayId,
    trackId: route.inputTrackId
  });
  assert.equal(resolution.routeKind, "factory_v2", `${route.routeId}: exact route did not select factory-v2`);
  assert.equal(resolution.factoryV2?.packetFamilyId, route.familyId);
  assert.equal(resolution.factoryV2?.retiredLegacyRouteMigrated, route.migrated);
  assert.equal(resolution.factoryV2?.exactRouteProductized, route.exactProductized);
  assert.equal(resolution.factoryV2?.exactTrackSelectionRequired, factory.exactTrackSelectionRequired);
  if (route.exactProductized) {
    assert.equal(resolution.factoryV2?.legalApprovalEstablished, route.ownerApproved);
    assert.equal(resolution.factoryV2?.legalApprovalRecordId,
      route.ownerApproved ? ownerDecision.recordId : undefined);
    assert.equal(resolution.factoryV2?.postApprovalChangeAuditEstablished, false);
    assert.equal(resolution.factoryV2?.obligationRouteKey, route.obligationRouteKey);
    assert.equal(resolution.factoryV2?.nextGate, route.nextGate
      ?? "current CT owner legal approval and post-approval change audit, then separate fulfillment-authority generation");
  }
  assert.equal(resolution.sellable, false, `${route.routeId}: productization must not open checkout`);
  assert.equal(resolution.creditConsumable, false, `${route.routeId}: productization must not open sponsored credit`);
  const fulfillmentRecord = fulfillment.records.find((record) => record.routeId === route.routeId);
  if (FULFILLMENT_EVIDENCE_GAP_ROUTES.has(route.routeId)) {
    assert.ok(fulfillmentRecord, `${route.routeId}: fulfillment evidence record missing`);
    assert.equal(fulfillmentRecord.packetFamilyId, route.familyId);
    assert.equal(fulfillmentRecord.finalVerification?.state, "bound");
    assert.ok(fulfillmentRecord.officialSources.some((source) => source.sourceKind === "codified_authority"),
      `${route.routeId}: custom pleading lacks its codified-authority binding`);
    assert.equal(resolution.availability, "MAINTENANCE_HOLD",
      `${route.routeId}: evidence repair must leave route activation under the existing hold`);
  } else {
    assert.equal(resolution.availability, "UNFINISHED",
      `${route.routeId}: absent fulfillment authority must remain the next gate`);
    assert.equal(fulfillmentRecord, undefined,
      `${route.routeId}: this lane must not create an unrelated fulfillment record`);
  }
}

const siblings = [
  ["DC", "dc_motion_seal_nonconviction_16_806"],
  ["DC", "dc_motion_seal_misdemeanor_conviction_5yr_16_806"],
  ["MS", "first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1"],
  ["MS", "eligible-felony-conviction-expungement-99-19-71"]
];
for (const [jurisdiction, pathwayId] of siblings) {
  assert.equal(factoryV2RouteFor(jurisdiction, pathwayId), null,
    `${jurisdiction}:${pathwayId}: retired sibling gained factory authority`);
  const resolution = resolvePacketRoute({ state: jurisdiction, pathway: pathwayId });
  assert.equal(resolution.routeKind, "legacy_retired", `${jurisdiction}:${pathwayId}: retired sibling reopened`);
  assert.equal(resolution.sellable, false);
  assert.equal(resolution.creditConsumable, false);
}

const migratedRouteIds = new Set(ROUTES.filter((route) => route.migrated).map((route) => route.routeId));
const everyRetiredSibling = rawRegistry.routes.filter((row) =>
  ["DC", "IL", "MS"].includes(row.jurisdiction) && !migratedRouteIds.has(row.pathwayKey));
assert.ok(everyRetiredSibling.length > siblings.length, "retired-sibling census unexpectedly empty");
for (const sibling of everyRetiredSibling) {
  assert.equal(factoryV2RouteFor(sibling.jurisdiction, sibling.pathwayId), null,
    `${sibling.pathwayKey}: retired sibling gained factory authority`);
  const resolution = resolvePacketRoute({ state: sibling.jurisdiction, pathway: sibling.pathwayId });
  assert.notEqual(resolution.routeKind, "factory_v2", `${sibling.pathwayKey}: retired sibling migrated by inference`);
  assert.equal(resolution.sellable, false);
  assert.equal(resolution.creditConsumable, false);
}

const connecticut = ROUTES.find((route) => route.familyId === "ct-cleanslate-petition-set");
assert.ok(connecticut, "the Connecticut route fixture is missing");
assert.equal(packetSpecificationForTrack(connecticut.routeId, "ct-absolute-pardon"), undefined,
  "a Connecticut sibling track inherited the Clean Slate petition specification");
for (const trackId of [undefined, "", "ct-absolute-pardon", "ct-pardon-erasure"]) {
  assert.equal(factoryV2RouteFor(connecticut.jurisdiction, connecticut.pathwayId, trackId), null,
    `Connecticut ${trackId || "trackless"}: exact route admitted without its one server-owned track`);
  const resolution = resolvePacketRoute({
    state: connecticut.jurisdiction,
    pathway: connecticut.pathwayId,
    trackId
  });
  assert.notEqual(resolution.routeKind, "factory_v2",
    `Connecticut ${trackId || "trackless"}: exact packet family was admitted by inference`);
  assert.equal(resolution.sellable, false);
  assert.equal(resolution.creditConsumable, false);
}
for (const pathwayId of ["", "*", "absolute-pardon-resulting-in-erasure"]) {
  assert.equal(factoryV2RouteFor("CT", pathwayId, "ct-absolute-pardon"), null,
    `CT:${pathwayId || "<aggregate>"}: sibling or aggregate route gained factory authority`);
  const resolution = resolvePacketRoute({ state: "CT", pathway: pathwayId, trackId: "ct-absolute-pardon" });
  assert.notEqual(resolution.routeKind, "factory_v2",
    `CT:${pathwayId || "<aggregate>"}: sibling or aggregate route was productized`);
  assert.equal(resolution.sellable, false);
  assert.equal(resolution.creditConsumable, false);
}

const dcMisattributed = ROUTES.find((route) => route.familyId === "dc_correct_misattributed_arrest-set");
assert.ok(dcMisattributed, "the DC misattributed-arrest route fixture is missing");
assert.equal(packetSpecificationForTrack(dcMisattributed.routeId, "dc_innocence_expungement"), undefined,
  "a sibling DC track inherited the misattributed-arrest specification");
const dcMisattributedSpec = packetSpecificationFor(dcMisattributed.routeId);
const dcReference = dcMisattributedSpec.sourceIdentities.find((source) =>
  source.sourceId === "DC-HOW-TO-SEAL-OR-EXPUNGE-YOUR-CRIMINAL-RECOR");
assert.ok(dcReference, "the DC filing-channel reference source is not bound");
assert.equal(dcReference.sha256, "310381f170d1875ef7a40e9e71c8653c1ea5c847628a6c718ea9016c0e312712");
assert.equal(dcReference.byteLength, 47232);
assert.equal(dcReference.instrumentKind, "bound_reference_instrument");
assert.equal(dcReference.shippedAsPacketComponent, false,
  "the DC filing-channel reference was converted into a shipped component");
assert.ok(dcMisattributedSpec.documents.every((document) => document.officialFormId === null),
  "the DC authority/reference source must never become a shipped official form");
const dcMisattributedRendered = read(`${dcMisattributed.overlayRoot}/reports/rendered-artifacts.json`);
assert.deepEqual(dcMisattributedRendered.componentSet, dcMisattributed.components);
for (const artifact of dcMisattributedRendered.artifacts) {
  assert.equal(artifact.routeKey, dcMisattributed.obligationRouteKey);
  assert.deepEqual(artifact.documents, dcMisattributed.components);
  assert.deepEqual(artifact.components, dcMisattributed.components);
  assert.ok(artifact.pageManifest.every((page) => page.sourceSha256 === null),
    "the DC filing-channel reference bytes were represented as packet pages");
}
for (const trackId of [undefined, "", "dc_innocence_expungement", "dc_seal_nonconviction"]) {
  assert.equal(factoryV2RouteFor(dcMisattributed.jurisdiction, dcMisattributed.pathwayId, trackId), null,
    `DC misattributed-arrest ${trackId || "trackless"}: exact route admitted without its server-owned track`);
  const resolution = resolvePacketRoute({
    state: dcMisattributed.jurisdiction,
    pathway: dcMisattributed.pathwayId,
    trackId
  });
  assert.notEqual(resolution.routeKind, "factory_v2",
    `DC misattributed-arrest ${trackId || "trackless"}: exact packet family was admitted by inference`);
  assert.equal(resolution.sellable, false);
  assert.equal(resolution.creditConsumable, false);
}
for (const pathwayId of ["", "*", "dc_motion_seal_nonconviction_16_806"]) {
  assert.equal(factoryV2RouteFor("DC", pathwayId, dcMisattributed.inputTrackId), null,
    `DC:${pathwayId || "<aggregate>"}: aggregate or sibling route gained misattributed-arrest factory authority`);
  const resolution = resolvePacketRoute({ state: "DC", pathway: pathwayId, trackId: dcMisattributed.inputTrackId });
  assert.notEqual(resolution.routeKind, "factory_v2",
    `DC:${pathwayId || "<aggregate>"}: aggregate or sibling route was productized`);
  assert.equal(resolution.sellable, false);
  assert.equal(resolution.creditConsumable, false);
}

for (const route of ROUTES) {
  assert.equal(factoryV2RouteFor(
    route.jurisdiction === "DC" ? "MS" : "DC",
    route.pathwayId,
    route.inputTrackId
  ), null,
    `${route.routeId}: wrong jurisdiction selected the route`);
  const supplied = resolvePacketRoute({
    state: route.jurisdiction,
    pathway: route.pathwayId,
    trackId: route.inputTrackId,
    packetFamilyId: route.familyId
  });
  assert.equal(supplied.routeKind, "disabled", `${route.routeId}: client-supplied family authority was accepted`);
  assert.equal(supplied.sellable, false);
  assert.match(supplied.reason, /Client-supplied packet-family authority is not accepted/);
}

const illinois = ROUTES.find((route) => route.familyId === "il-prostitution-j-vacate-set");
assert.ok(illinois, "the Illinois route fixture is missing");
assert.equal(packetSpecificationForTrack(illinois.routeId, "il-prostitution-j-auto"), undefined,
  "the automatic sibling track inherited the vacatur packet specification");
assert.equal(factoryV2RouteFor(illinois.jurisdiction, illinois.pathwayId), null,
  "the aggregate Illinois runtime row was admitted without the exact server-owned track");
assert.equal(factoryV2RouteFor(illinois.jurisdiction, illinois.pathwayId, "il-prostitution-j-auto"), null,
  "the automatic sibling track inherited the vacatur packet family");
for (const trackId of [undefined, "*", "il-prostitution-j-auto"]) {
  const resolution = resolvePacketRoute({
    state: illinois.jurisdiction,
    pathway: illinois.pathwayId,
    trackId
  });
  assert.notEqual(resolution.routeKind, "factory_v2",
    `Illinois ${trackId ?? "trackless"}: aggregate sibling route was broadened into factory-v2`);
  assert.equal(resolution.sellable, false);
  assert.equal(resolution.creditConsumable, false);
}

const ilRenderInput = {
  packetId: "il-productization-verifier",
  state: illinois.jurisdiction,
  pathway: illinois.pathwayId,
  packetFields: {}
};
const ilRender = buildRenderJobSpec({ ...ilRenderInput, trackId: illinois.inputTrackId });
assert.ok(ilRender.spec, "the exact Illinois vacatur route did not reach the shared render-job path");
assert.equal(ilRender.route.routeKind, "factory_v2");
assert.equal(ilRender.spec.routeId, illinois.routeId);
for (const trackId of [undefined, "*", "il-prostitution-j-auto"]) {
  const siblingRender = buildRenderJobSpec({ ...ilRenderInput, trackId });
  assert.equal(siblingRender.spec, null,
    `Illinois ${trackId ?? "trackless"}: a sibling render job inherited the vacatur packet`);
  assert.notEqual(siblingRender.route.routeKind, "factory_v2");
}

const ctRenderInput = {
  packetId: "ct-productization-verifier",
  state: connecticut.jurisdiction,
  pathway: connecticut.pathwayId,
  packetFields: {}
};
const ctRender = buildRenderJobSpec({ ...ctRenderInput, trackId: connecticut.inputTrackId });
assert.ok(ctRender.spec, "the exact Connecticut route did not reach the shared render-job path");
assert.equal(ctRender.route.routeKind, "factory_v2");
assert.equal(ctRender.spec.routeId, connecticut.routeId);
for (const trackId of [undefined, "ct-absolute-pardon"]) {
  const siblingRender = buildRenderJobSpec({ ...ctRenderInput, trackId });
  assert.equal(siblingRender.spec, null,
    `Connecticut ${trackId ?? "trackless"}: a render job inherited the Clean Slate petition family`);
  assert.notEqual(siblingRender.route.routeKind, "factory_v2");
}

const dcMisattributedRenderInput = {
  packetId: "dc-misattributed-productization-verifier",
  state: dcMisattributed.jurisdiction,
  pathway: dcMisattributed.pathwayId,
  packetFields: {}
};
const dcMisattributedRender = buildRenderJobSpec({
  ...dcMisattributedRenderInput,
  trackId: dcMisattributed.inputTrackId
});
assert.ok(dcMisattributedRender.spec,
  "the exact DC misattributed-arrest route did not reach the shared render-job path");
assert.equal(dcMisattributedRender.route.routeKind, "factory_v2");
assert.equal(dcMisattributedRender.spec.routeId, dcMisattributed.routeId);
for (const trackId of [undefined, "dc_innocence_expungement", "dc_seal_nonconviction"]) {
  const siblingRender = buildRenderJobSpec({ ...dcMisattributedRenderInput, trackId });
  assert.equal(siblingRender.spec, null,
    `DC misattributed-arrest ${trackId ?? "trackless"}: a render job inherited the exact family`);
  assert.notEqual(siblingRender.route.routeKind, "factory_v2");
}

const ilCommercialIdentity = commercialRouteIdentity({
  jurisdiction: illinois.jurisdiction,
  pathwayId: illinois.pathwayId
});
assert.equal(ilCommercialIdentity.packetFamilyId, illinois.familyId,
  "the money gate did not derive the Illinois packet family from the server-owned specification");
const ilFulfillmentRecord = fulfillment.records.find((record) => record.routeId === illinois.routeId);
assert.ok(ilFulfillmentRecord, "the exact Illinois Grade-A fulfillment record is absent");
assert.equal(ilFulfillmentRecord.schemaVersion, "rcap-grade-a-fulfillment-authority/v2");
assert.equal(ilFulfillmentRecord.packetFamilyId, illinois.familyId);
for (const admissionPoint of ["consumer_checkout", "sponsored_entitlement", "packet_credit_admission"]) {
  const decision = admitCommercial(admissionPoint, ilCommercialIdentity, null);
  assert.equal(decision.admitted, false, `${admissionPoint}: Illinois productization opened commercial authority`);
  assert.equal(decision.denialCode, "participant_context_denied",
    `${admissionPoint}: a fulfillment record bypassed the independently required participant context`);
}

// The v2 record proves fulfillment only. These pre-existing deployment and
// launch gates remain independent and dark, so generating the record cannot be
// mistaken for a hosted consumer or sponsored canary, a deployment pin, or a
// route-open operation.
const releaseReadiness = read(RELEASE_READINESS_PATH).deploymentReadiness;
assert.equal(resolveConsumerDeliveryRouteState(), "disabled",
  "the consumer-delivery route state unexpectedly became live during productization verification");
assert.equal(releaseReadiness.finalApplicationShaRequired, true);
assert.equal(releaseReadiness.applicationTarget, null,
  "the fulfillment record fabricated a hosted application deployment pin");
assert.equal(releaseReadiness.immutableDigestRequired, true);
assert.equal(releaseReadiness.workerTarget, null,
  "the fulfillment record fabricated a hosted worker deployment pin");
assert.equal(readBytes(HOSTED_ACCEPTANCE_PATH).includes(Buffer.from(illinois.routeId)), false,
  "the fulfillment record fabricated an exact-route hosted acceptance/canary receipt");
const ilLaunchRow = read(LAUNCH_GRAPH_PATH).rows.find((row) => row.pathwayKey === illinois.routeId);
assert.ok(ilLaunchRow, "the current launch graph lacks the Illinois pathway row");
assert.equal(ilLaunchRow.paymentResult?.allowedAtTheEvaluator, false);
assert.equal(ilLaunchRow.paymentResult?.sellableAtTheResolver, false);
assert.equal(ilLaunchRow.paymentResult?.creditConsumable, false);
/*
 * Illinois now HAS an exact v2 fulfillment-authority record, so this asserts
 * admission rather than its absence. Asserting false here was asserting that
 * the record had not been written yet, which stopped being a safety property
 * the moment the route was deliberately productized -- and it is not the
 * property this block exists to defend. That property is the two lines below
 * and the five above: the record admits fulfillment and opens nothing. A route
 * is sellable only after the whole chain, and the record alone is one link.
 */
assert.equal(ilLaunchRow.fulfillmentAuthorityAdmitted, true,
  "the Illinois launch row lost its fulfillment-authority admission");
assert.equal(ilLaunchRow.operationallySellable, false);
assert.equal(ilLaunchRow.allOperationalGatesMet, false);

const ctCommercialIdentity = commercialRouteIdentity({
  jurisdiction: connecticut.jurisdiction,
  pathwayId: connecticut.pathwayId
});
assert.equal(ctCommercialIdentity.packetFamilyId, connecticut.familyId,
  "the money gate did not derive the Connecticut packet family from the server-owned specification");
for (const admissionPoint of ["consumer_checkout", "sponsored_entitlement", "packet_credit_admission"]) {
  const decision = admitCommercial(admissionPoint, ctCommercialIdentity, null);
  assert.equal(decision.admitted, false, `${admissionPoint}: Connecticut productization opened commercial authority`);
  assert.equal(decision.denialCode, "fulfillment_no_record",
    `${admissionPoint}: Connecticut must remain refused until separate fulfillment authority exists`);
}

const dcMisattributedCommercialIdentity = commercialRouteIdentity({
  jurisdiction: dcMisattributed.jurisdiction,
  pathwayId: dcMisattributed.pathwayId
});
assert.equal(dcMisattributedCommercialIdentity.packetFamilyId, dcMisattributed.familyId,
  "the money gate did not derive the DC misattributed-arrest family from the server-owned specification");
for (const admissionPoint of ["consumer_checkout", "sponsored_entitlement", "packet_credit_admission"]) {
  const decision = admitCommercial(admissionPoint, dcMisattributedCommercialIdentity, null);
  assert.equal(decision.admitted, false,
    `${admissionPoint}: DC misattributed-arrest productization opened commercial authority`);
  assert.equal(decision.denialCode, "fulfillment_no_record",
    `${admissionPoint}: missing audit and fulfillment authority must remain an exact no-record refusal`);
}

if (MUTATIONS) {
  const original = fs.readFileSync(path.join(ROOT, MIGRATIONS_PATH), "utf8");
  const originalSha = sha256(original);
  const checkMutation = (label, mutate, routeId) => {
    const changed = JSON.parse(original);
    mutate(changed);
    try {
      fs.writeFileSync(path.join(ROOT, MIGRATIONS_PATH), `${JSON.stringify(changed, null, 2)}\n`);
      resetFactoryV2RegistryCache();
      const route = ROUTES.find((candidate) => candidate.routeId === routeId);
      assert.ok(route, `${label}: unknown test route`);
      assert.equal(factoryV2RouteFor(route.jurisdiction, route.pathwayId, route.inputTrackId), null,
        `${label}: mutation was not denied`);
      assert.notEqual(resolvePacketRoute({
        state: route.jurisdiction,
        pathway: route.pathwayId,
        trackId: route.inputTrackId
      }).routeKind, "factory_v2", `${label}: mutated route escaped its exact fail-closed fence`);
      console.log(`caught  ${label}`);
    } finally {
      fs.writeFileSync(path.join(ROOT, MIGRATIONS_PATH), original);
      resetFactoryV2RegistryCache();
    }
  };

  checkMutation("wrong packet family", (doc) => {
    doc.factoryV2RouteMigrations[0].packetFamilyId = "dc_seal_nonconviction-set";
  }, "DC:dc_actual_innocence_expungement_16_803");
  checkMutation("wildcard route scope", (doc) => {
    doc.factoryV2RouteMigrations[0].routeId = "DC:*";
  }, "DC:dc_actual_innocence_expungement_16_803");
  checkMutation("commercial authority flag", (doc) => {
    doc.factoryV2RouteMigrations[1].createsCommercialAuthority = true;
  }, "MS:additional-justice-court-misdemeanor-relief-9-11-15-3");
  checkMutation("route-open flag", (doc) => {
    doc.factoryV2RouteMigrations[1].opensRoute = true;
  }, "MS:additional-justice-court-misdemeanor-relief-9-11-15-3");
  checkMutation("unbound owner decision", (doc) => {
    doc.factoryV2RouteMigrations[1].ownerDecisionRecordId = "UNAPPROVED";
  }, "MS:additional-justice-court-misdemeanor-relief-9-11-15-3");
  checkMutation("duplicate route migration", (doc) => {
    doc.factoryV2RouteMigrations.push({ ...doc.factoryV2RouteMigrations[0] });
  }, "DC:dc_actual_innocence_expungement_16_803");
  checkMutation("Illinois sibling track substitution", (doc) => {
    const row = doc.factoryV2RouteMigrations.find((candidate) => candidate.routeId === "IL:felony-prostitution-relief");
    row.registryTrackIds = ["il-prostitution-j-auto"];
  }, "IL:felony-prostitution-relief");
  checkMutation("Illinois sibling packet substitution", (doc) => {
    const row = doc.factoryV2RouteMigrations.find((candidate) => candidate.routeId === "IL:felony-prostitution-relief");
    row.packetFamilyId = "il-prostitution-j-auto-set";
  }, "IL:felony-prostitution-relief");
  checkMutation("Connecticut wrong packet family substitution", (doc) => {
    const packetSet = doc.packetSets.find((candidate) => candidate.packetSetId === "ct-cleanslate-petition-set");
    packetSet.factoryV2RouteProductization.packetFamilyId = "ct-absolute-pardon-set";
  }, "CT:petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202");
  checkMutation("Connecticut sibling track substitution", (doc) => {
    const packetSet = doc.packetSets.find((candidate) => candidate.packetSetId === "ct-cleanslate-petition-set");
    packetSet.factoryV2RouteProductization.registryTrackIds = ["ct-absolute-pardon"];
  }, "CT:petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202");
  checkMutation("Connecticut aggregate route substitution", (doc) => {
    const packetSet = doc.packetSets.find((candidate) => candidate.packetSetId === "ct-cleanslate-petition-set");
    packetSet.factoryV2RouteProductization.runtimeRouteId = "CT:*";
  }, "CT:petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202");
  checkMutation("DC misattributed-arrest wrong packet family substitution", (doc) => {
    const packetSet = doc.packetSets.find((candidate) => candidate.packetSetId === "dc_correct_misattributed_arrest-set");
    packetSet.factoryV2RouteProductization.packetFamilyId = "dc_innocence_expungement-set";
  }, "DC:dc_correct_misattributed_arrest");
  checkMutation("DC misattributed-arrest sibling track substitution", (doc) => {
    const packetSet = doc.packetSets.find((candidate) => candidate.packetSetId === "dc_correct_misattributed_arrest-set");
    packetSet.factoryV2RouteProductization.registryTrackIds = ["dc_innocence_expungement"];
  }, "DC:dc_correct_misattributed_arrest");
  checkMutation("DC misattributed-arrest aggregate route substitution", (doc) => {
    const packetSet = doc.packetSets.find((candidate) => candidate.packetSetId === "dc_correct_misattributed_arrest-set");
    packetSet.factoryV2RouteProductization.runtimeRouteId = "DC:*";
  }, "DC:dc_correct_misattributed_arrest");
  checkMutation("DC misattributed-arrest trackless substitution", (doc) => {
    const packetSet = doc.packetSets.find((candidate) => candidate.packetSetId === "dc_correct_misattributed_arrest-set");
    packetSet.factoryV2RouteProductization.registryTrackIds = [];
  }, "DC:dc_correct_misattributed_arrest");
  checkMutation("DC misattributed-arrest fabricated post-approval audit", (doc) => {
    const packetSet = doc.packetSets.find((candidate) => candidate.packetSetId === "dc_correct_misattributed_arrest-set");
    packetSet.factoryV2RouteProductization.postApprovalChangeAudit = {
      verdict: "COVERED_BY_EXISTING_APPROVAL"
    };
  }, "DC:dc_correct_misattributed_arrest");
  checkMutation("DC misattributed-arrest wrong owner approval", (doc) => {
    const packetSet = doc.packetSets.find((candidate) => candidate.packetSetId === "dc_correct_misattributed_arrest-set");
    packetSet.factoryV2RouteProductization.legalApproval.legalDecisionRecordId = "UNAPPROVED";
  }, "DC:dc_correct_misattributed_arrest");

  assert.equal(sha256(fs.readFileSync(path.join(ROOT, MIGRATIONS_PATH), "utf8")), originalSha,
    "mutation checks did not restore the authoritative migration input byte-for-byte");
}

console.log(`First-route cohort productization PASS (${ROUTES.length} routes; ${MUTATIONS ? "fail-closed mutations checked" : "focused route/spec/resolver checks"}).`);
