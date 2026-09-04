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
    jurisdiction: "ID",
    pathwayId: "id_set_aside_dismissal",
    obligationRouteKey: "obligation:track-only:ID:id_set_aside_dismissal",
    familyId: "id_set_aside_dismissal-set",
    trackIds: ["id_set_aside_dismissal"],
    inputTrackId: "id_set_aside_dismissal",
    specificationPath: "data/record-clearing/packet-specifications/ID-set-aside-dismissal.v1.json",
    overlayRoot: "data/rcap-all50/overlays/census-v1/id/id-set-aside-dismissal-set--custom-pleading",
    migrated: false,
    synthetic: true,
    ownerApproved: false,
    exactTrackSelectionRequired: true,
    nextGate: "current ID owner legal approval and post-approval change audit, then separate fulfillment-authority and canary evidence",
    components: [
      "id_set_aside_dismissal-primary-filing-1",
      "id_set_aside_dismissal-filing-instructions-2"
    ],
    manifestComponents: [
      ["primary_filing", "custom_pleading", null],
      ["filing_instructions", "process_guidance", null]
    ],
    artifacts: {
      canonical: ["7773edfbbad30e588ee71061cd226d6c8385e5b35d3d8fa40d43497507dbddbc", 10134, 4],
      boundary: ["69627731b56805a3b8a37b24c7cfc9b72a9b99d87a09cf85e44e05e0c9cbbf5f", 10351, 4]
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
    nextGate: "current CT owner legal approval and post-approval change audit, then separate fulfillment-authority generation",
    components: ["ct-cleanslate-petition-primary-filing-1"],
    manifestComponents: [["primary_filing", "official_pdf_fill", "JD-CR-202"]],
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
    exactTrackSelectionRequired: route.exactTrackSelectionRequired
      ?? (rawTrackIds.length !== route.trackIds.length || rawPacketSetIds.length !== 1)
  };
});

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
assert.equal(selectedFamilies.has("id_set_aside_dismissal-set"), false,
  "Idaho must not be inferred into the owner-approved cohort from technical packet proof");
assert.equal(firstCohort.allRows.some((row) => row.familyId === "id_set_aside_dismissal-set"), false,
  "the current cohort contains no Idaho row that could establish route-level owner approval");

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
const idPacketSet = manifests.packetSets.filter((row) => row.packetSetId === "id_set_aside_dismissal-set");
assert.equal(idPacketSet.length, 1, "the Idaho family must have one exact packet-set row");
assert.deepEqual(idPacketSet[0].factoryV2RouteProductization, {
  obligationRouteKey: "obligation:track-only:ID:id_set_aside_dismissal",
  runtimeRouteId: "ID:id_set_aside_dismissal",
  jurisdiction: "ID",
  pathwayId: "id_set_aside_dismissal",
  registryTrackIds: ["id_set_aside_dismissal"],
  packetFamilyId: "id_set_aside_dismissal-set",
  scope: "route_track_family_only",
  legalApproval: null,
  postApprovalChangeAudit: null,
  createsCommercialAuthority: false,
  opensRoute: false,
  nextGate: "current ID owner legal approval and post-approval change audit, then separate fulfillment-authority and canary evidence"
});

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
const fulfillmentRecordsAlreadyAtBase = new Set([
  "DC:dc_actual_innocence_expungement_16_803",
  "MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
  "MS:additional-municipal-court-misdemeanor-relief-21-23-7-6",
  "WY:felony-conviction-expungement-w-s-7-13-1502"
]);
assert.equal(ownerDecision.recordId, "OWN-ADOPT-2026-09-02-BATCH-53");
for (const route of ROUTES) {
  const raw = rawRegistry.routes.find((row) => row.pathwayKey === route.routeId);
  if (route.synthetic) {
    assert.equal(raw, undefined,
      `${route.routeId}: productization must not pretend the generated registry already supplied this track-only identity`);
  } else {
    assert.ok(raw, `${route.routeId}: generated factory-v2 row missing`);
    assert.ok(REQUIRED_BUILD_INPUTS.every((name) => raw.buildInputs?.[name] === true),
      `${route.routeId}: all seven generated build inputs must remain true`);
    assert.deepEqual(raw.unmetBuildInputs, [], `${route.routeId}: generated build inputs unexpectedly unmet`);
    assert.deepEqual(raw.packetSetIds, route.rawPacketSetIds);
    assert.deepEqual(raw.registryTrackIds, route.rawTrackIds);
    assert.equal(raw.factoryV2Resolves, !route.migrated,
      `${route.routeId}: only retired-legacy ownership may distinguish the raw generated admission`);
    assert.equal(raw.legacyGeneratorOwnsThisJurisdiction, route.migrated);
  }

  const spec = packetSpecificationFor(route.routeId);
  assert.ok(spec, `${route.routeId}: route-scoped packet specification missing`);
  assert.equal(spec.packetFamily, route.familyId);
  assert.ok((spec.routeKeys ?? [spec.routeKey]).includes(route.routeId));
  assert.equal(packetSpecificationForTrack(route.routeId, route.trackIds[0]), spec,
    `${route.routeId}: exact track did not resolve its server-owned specification`);
  if (route.ownerApproved) {
    assert.equal(spec.legalSectionsBoundBy?.ownerDecisionRecordId, ownerDecision.recordId);
    assert.equal(spec.legalSectionsBoundBy?.postApprovalAuditVerdict, "COVERED_BY_EXISTING_APPROVAL");
    assert.equal(specificationLegalSectionsBound(spec), true);
  } else {
    assert.equal(spec.obligationRouteKey, route.obligationRouteKey);
    assert.equal(spec.legalSectionsBoundBy, undefined,
      `${route.routeId}: another jurisdiction's approval was borrowed`);
    assert.equal(spec.legalApproval, null);
    assert.equal(spec.postApprovalChangeAudit, null);
    assert.equal(specificationLegalSectionsBound(spec), false);
    assert.equal(spec.nextGate, route.nextGate);
  }
  assert.equal(resolvePacketFamilyId(route.routeId), route.familyId,
    `${route.routeId}: server-owned family crosswalk mismatch`);
  assert.equal(specificationContentSha256(spec), spec.specificationSha256,
    `${route.routeId}: runtime must expose the committed specification digest`);

  const specFile = read(route.specificationPath);
  const recordedSpecSha = specFile.specificationSha256;
  if (route.jurisdiction === "ID") {
    assert.deepEqual(specFile.sourceComposition, {
      custodyClass: "CUSTOM_PLEADING_FROM_CODIFIED_TEXT",
      sourceBinaryCount: 0,
      officialBinaryInvented: false,
      authorityReferenceShippedAsSourceComponent: false,
      receipt: "data/rcap-all50/overlays/census-v1/id/id-set-aside-dismissal-set--custom-pleading/source-receipt.json"
    });
    assert.deepEqual(specFile.independentVerificationEvidence, {
      verdict: "PASS_COMPLETE_INDEPENDENT",
      lane: "VF04",
      wave: "packet-factory-24h/VF04/integrated-FIX02-independent-reread",
      verifiedAtBase: "cf492847858f0dccd3266a15b00a23499f462935",
      record: "data/rcap-grade-a/packet-factory-24h/vf04/rows.json",
      currentAtProductizationBase: "57d60a73fa0dcb105bcc49390f94bf3fd3ecbd55",
      currentAfterIntegratedRepair: "FIX02",
      selfVerification: false
    });
    assert.deepEqual(specFile.rasterEvidence, {
      verdict: "RASTER_PASS",
      workflowRunId: "33605354695",
      jobId: "100168605472",
      artifactId: 9837134404,
      coversTheWholeFamily: true,
      boundToCanonicalSha256: "7773edfbbad30e588ee71061cd226d6c8385e5b35d3d8fa40d43497507dbddbc",
      boundToBoundarySha256: "69627731b56805a3b8a37b24c7cfc9b72a9b99d87a09cf85e44e05e0c9cbbf5f"
    });
    const vf04 = read("data/rcap-grade-a/packet-factory-24h/vf04/rows.json").rows.find((row) =>
      row.itemId === route.familyId && row.wave.includes("integrated-FIX02-independent-reread"));
    assert.equal(vf04?.verdict, "PASS_COMPLETE_INDEPENDENT",
      "the current post-FIX02 VF04 verdict must remain the bound verdict");
    assert.deepEqual(vf04?.artifacts.map((artifact) =>
      [artifact.fixture, artifact.sha256, artifact.byteLength, artifact.pageCount]), [
      ["canonical", "7773edfbbad30e588ee71061cd226d6c8385e5b35d3d8fa40d43497507dbddbc", 10134, 4],
      ["boundary", "69627731b56805a3b8a37b24c7cfc9b72a9b99d87a09cf85e44e05e0c9cbbf5f", 10351, 4]
    ]);
  }
  delete specFile.specificationSha256;
  assert.equal(sha256(stableStringify(specFile)), recordedSpecSha,
    `${route.routeId}: specification content digest is stale`);
  assert.deepEqual(spec.documents.slice().sort((a, b) => a.order - b.order).map((document) => document.documentId), route.components,
    `${route.routeId}: specification does not bind the exact component set in order`);

  const rendered = read(`${route.overlayRoot}/reports/rendered-artifacts.json`);
  if (route.ownerApproved) {
    assert.deepEqual(rendered.componentSet, route.components, `${route.routeId}: shipping report component set drifted`);
  } else {
    const technicalPacketSet = manifests.packetSets.filter((row) => row.packetSetId === route.familyId);
    assert.equal(technicalPacketSet.length, 1, `${route.routeId}: exact packet-set row is not unique`);
    assert.deepEqual(technicalPacketSet[0].components.map((component) => component.componentId), route.components,
      `${route.routeId}: packet-set component set drifted`);
    assert.deepEqual(technicalPacketSet[0].components.map((component) =>
      [component.role, component.outputStrategy, component.officialFormId]), route.manifestComponents);
    if (route.jurisdiction === "ID") {
      assert.deepEqual(rendered.componentSet, route.components,
        `${route.routeId}: rendered family does not match the exact packet-set components`);
    }
  }
  const specificationArtifacts = route.ownerApproved ? spec.approvedArtifacts : spec.artifactEvidence;
  assert.deepEqual(specificationArtifacts?.map((artifact) => artifact.fixture).sort(), ["boundary", "canonical"]);
  let adoptedArtifacts = null;
  if (route.ownerApproved) {
    const adoptionQualification = ownerDecision.adoption.qualifications.find((qualification) =>
      qualification.families.includes(route.familyId));
    assert.ok(adoptionQualification, `${route.routeId}: owner decision does not adopt the family`);
    adoptedArtifacts = adoptionQualification.digestConditionRecordedPerFamily[route.familyId];
    assert.ok(adoptedArtifacts, `${route.routeId}: owner decision has no exact artifact pins`);
    const currentAudit = postApprovalAudit.families.find((row) => row.familyId === route.familyId);
    assert.equal(currentAudit?.verdict, "COVERED_BY_EXISTING_APPROVAL");
    assert.equal(currentAudit?.reviewedAgainstApprovalRecordId, ownerDecision.recordId);
    assert.equal(currentAudit?.currentIndependentVerification?.verdict, "PASS_COMPLETE_INDEPENDENT");
    assert.equal(currentAudit?.mayEnterTheFirstCohort, true);
  } else {
    if (route.jurisdiction === "CT") {
      assert.equal(ownerDecision.adoption.qualifications.some((qualification) =>
        qualification.families.includes(route.familyId)), false,
      `${route.routeId}: CT unexpectedly appears in the existing owner decision`);
    }
    assert.equal(postApprovalAudit.families.some((row) => row.familyId === route.familyId), false,
      `${route.routeId}: a missing post-approval audit must not be inferred`);
  }
  const reportArtifacts = rendered.pdfs ?? rendered.artifacts;
  for (const [fixture, [expectedSha, expectedBytes, expectedPages]] of Object.entries(route.artifacts)) {
    const artifact = specificationArtifacts.find((candidate) => candidate.fixture === fixture);
    const reportArtifact = reportArtifacts.find((candidate) => candidate.fixture === fixture);
    const adoptedArtifact = adoptedArtifacts?.find((candidate) => candidate.fixture === fixture) ?? null;
    assert.ok(artifact && reportArtifact, `${route.routeId}/${fixture}: artifact binding missing`);
    if (route.ownerApproved) {
      assert.ok(adoptedArtifact, `${route.routeId}/${fixture}: owner decision artifact binding missing`);
    } else {
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
  assert.equal(factory.exactTrackSelectionRequired, route.exactTrackSelectionRequired);
  assert.equal(factory.exactRouteProductization !== null, !route.ownerApproved);
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
  assert.equal(resolution.factoryV2?.exactRouteProductized, !route.ownerApproved);
  assert.equal(resolution.factoryV2?.exactTrackSelectionRequired, factory.exactTrackSelectionRequired);
  if (!route.ownerApproved) {
    assert.equal(resolution.factoryV2?.legalApprovalEstablished, false);
    assert.equal(resolution.factoryV2?.postApprovalChangeAuditEstablished, false);
    assert.equal(resolution.factoryV2?.obligationRouteKey, route.obligationRouteKey);
    assert.equal(resolution.factoryV2?.nextGate, route.nextGate);
    if (route.jurisdiction === "ID") {
      assert.equal(resolution.factoryV2?.fulfillmentAuthorityEstablished, false);
      assert.equal(resolution.factoryV2?.canaryEvidenceEstablished, false);
      assert.match(resolution.reason, /payment, sponsorship, credit, delivery, canary evidence, route opening and Production remain closed/);
    }
  }
  assert.equal(resolution.sellable, false, `${route.routeId}: productization must not open checkout`);
  assert.equal(resolution.creditConsumable, false, `${route.routeId}: productization must not open sponsored credit`);
  assert.equal(resolution.availability, "UNFINISHED", `${route.routeId}: absent fulfillment authority must remain the next gate`);
  assert.equal(fulfillment.records.some((record) => record.routeId === route.routeId),
    fulfillmentRecordsAlreadyAtBase.has(route.routeId),
    `${route.routeId}: fulfillment-record presence drifted from the assigned base`);
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

const idaho = ROUTES.find((route) => route.familyId === "id_set_aside_dismissal-set");
assert.ok(idaho, "the Idaho route fixture is missing");
assert.equal(packetSpecificationForTrack(idaho.routeId, "id_felony_reduction"), undefined,
  "the Idaho felony-reduction sibling inherited the set-aside specification");
for (const trackId of [undefined, "", "id_felony_reduction", "id_clean_slate_shield"]) {
  assert.equal(factoryV2RouteFor(idaho.jurisdiction, idaho.pathwayId, trackId), null,
    `Idaho ${trackId || "trackless"}: exact route admitted without its one server-owned track`);
  const resolution = resolvePacketRoute({
    state: idaho.jurisdiction,
    pathway: idaho.pathwayId,
    trackId
  });
  assert.notEqual(resolution.routeKind, "factory_v2",
    `Idaho ${trackId || "trackless"}: exact packet family was admitted by inference`);
  assert.equal(resolution.sellable, false);
  assert.equal(resolution.creditConsumable, false);
}
for (const pathwayId of ["", "*", "id_felony_reduction"]) {
  assert.equal(factoryV2RouteFor("ID", pathwayId, "id_set_aside_dismissal"), null,
    `ID:${pathwayId || "<aggregate>"}: sibling, wildcard or aggregate route gained factory authority`);
  const resolution = resolvePacketRoute({ state: "ID", pathway: pathwayId, trackId: "id_set_aside_dismissal" });
  assert.notEqual(resolution.routeKind, "factory_v2",
    `ID:${pathwayId || "<aggregate>"}: sibling, wildcard or aggregate route was productized`);
  assert.equal(resolution.sellable, false);
  assert.equal(resolution.creditConsumable, false);
}
const clientSelectedIdahoFamily = resolvePacketRoute({
  state: idaho.jurisdiction,
  pathway: idaho.pathwayId,
  trackId: idaho.inputTrackId,
  packetFamilyId: "id_felony_reduction-set"
});
assert.equal(clientSelectedIdahoFamily.routeKind, "disabled",
  "a client-selected Idaho sibling family was accepted");
assert.equal(clientSelectedIdahoFamily.sellable, false);
assert.equal(clientSelectedIdahoFamily.creditConsumable, false);
assert.match(clientSelectedIdahoFamily.reason, /Client-supplied packet-family authority is not accepted/);

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
for (const trackId of [undefined, "il-prostitution-j-auto"]) {
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
for (const trackId of [undefined, "il-prostitution-j-auto"]) {
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

const idRenderInput = {
  packetId: "id-productization-verifier",
  state: idaho.jurisdiction,
  pathway: idaho.pathwayId,
  packetFields: {}
};
const idRender = buildRenderJobSpec({ ...idRenderInput, trackId: idaho.inputTrackId });
assert.ok(idRender.spec, "the exact Idaho route did not reach the shared render-job path");
assert.equal(idRender.route.routeKind, "factory_v2");
assert.equal(idRender.spec.routeId, idaho.routeId);
for (const trackId of [undefined, "id_felony_reduction"]) {
  const siblingRender = buildRenderJobSpec({ ...idRenderInput, trackId });
  assert.equal(siblingRender.spec, null,
    `Idaho ${trackId ?? "trackless"}: a render job inherited the set-aside family`);
  assert.notEqual(siblingRender.route.routeKind, "factory_v2");
}

const ilCommercialIdentity = commercialRouteIdentity({
  jurisdiction: illinois.jurisdiction,
  pathwayId: illinois.pathwayId
});
assert.equal(ilCommercialIdentity.packetFamilyId, illinois.familyId,
  "the money gate did not derive the Illinois packet family from the server-owned specification");
for (const admissionPoint of ["consumer_checkout", "sponsored_entitlement", "packet_credit_admission"]) {
  const decision = admitCommercial(admissionPoint, ilCommercialIdentity, null);
  assert.equal(decision.admitted, false, `${admissionPoint}: Illinois productization opened commercial authority`);
  assert.equal(decision.denialCode, "fulfillment_no_record",
    `${admissionPoint}: the exact next gate must remain a Grade-A fulfillment record`);
}

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

const idCommercialIdentity = commercialRouteIdentity({
  jurisdiction: idaho.jurisdiction,
  pathwayId: idaho.pathwayId
});
assert.equal(idCommercialIdentity.packetFamilyId, idaho.familyId,
  "the money gate did not derive the Idaho packet family from the server-owned specification");
for (const admissionPoint of ["consumer_checkout", "sponsored_entitlement", "packet_credit_admission"]) {
  const decision = admitCommercial(admissionPoint, idCommercialIdentity, null);
  assert.equal(decision.admitted, false, `${admissionPoint}: Idaho productization opened commercial authority`);
  assert.equal(decision.denialCode, "fulfillment_no_record",
    `${admissionPoint}: Idaho must remain refused at the missing Grade-A fulfillment record`);
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
  checkMutation("Idaho wrong packet family substitution", (doc) => {
    const packetSet = doc.packetSets.find((candidate) => candidate.packetSetId === "id_set_aside_dismissal-set");
    packetSet.factoryV2RouteProductization.packetFamilyId = "id_felony_reduction-set";
  }, "ID:id_set_aside_dismissal");
  checkMutation("Idaho sibling track substitution", (doc) => {
    const packetSet = doc.packetSets.find((candidate) => candidate.packetSetId === "id_set_aside_dismissal-set");
    packetSet.factoryV2RouteProductization.registryTrackIds = ["id_felony_reduction"];
  }, "ID:id_set_aside_dismissal");
  checkMutation("Idaho trackless substitution", (doc) => {
    const packetSet = doc.packetSets.find((candidate) => candidate.packetSetId === "id_set_aside_dismissal-set");
    packetSet.factoryV2RouteProductization.registryTrackIds = [];
  }, "ID:id_set_aside_dismissal");
  checkMutation("Idaho aggregate route substitution", (doc) => {
    const packetSet = doc.packetSets.find((candidate) => candidate.packetSetId === "id_set_aside_dismissal-set");
    packetSet.factoryV2RouteProductization.runtimeRouteId = "ID";
  }, "ID:id_set_aside_dismissal");
  checkMutation("Idaho wildcard route substitution", (doc) => {
    const packetSet = doc.packetSets.find((candidate) => candidate.packetSetId === "id_set_aside_dismissal-set");
    packetSet.factoryV2RouteProductization.runtimeRouteId = "ID:*";
  }, "ID:id_set_aside_dismissal");
  checkMutation("Idaho delivered component substitution", (doc) => {
    const packetSet = doc.packetSets.find((candidate) => candidate.packetSetId === "id_set_aside_dismissal-set");
    packetSet.components[1].componentId = "id_felony_reduction-filing-instructions-2";
  }, "ID:id_set_aside_dismissal");

  assert.equal(sha256(fs.readFileSync(path.join(ROOT, MIGRATIONS_PATH), "utf8")), originalSha,
    "mutation checks did not restore the authoritative migration input byte-for-byte");
}

console.log(`First-route cohort productization PASS (${ROUTES.length} routes; ${MUTATIONS ? "fail-closed mutations checked" : "focused route/spec/resolver checks"}).`);
