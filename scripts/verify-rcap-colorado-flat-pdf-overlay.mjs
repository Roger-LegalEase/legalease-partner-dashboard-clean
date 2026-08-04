#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const requireReady = process.argv.includes("--require-ready");
const unexpectedArgs = process.argv
  .slice(2)
  .filter((argument) => argument !== "--" && argument !== "--require-ready");

if (unexpectedArgs.length > 0) {
  fail(`Unsupported argument(s): ${unexpectedArgs.join(", ")}`);
}

const expectedTrackIds = [
  "co_municipal_conviction_seal",
  "co_pardoned_conviction_seal",
];
const expectedFlatDocumentIds = ["JDF-683", "JDF-680"];

try {
  verify();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

function verify() {
  const sourceRequirements = readJson(
    "data/record-clearing/production-factory/official-pdf-families/CO/source-requirements.json",
  );
  const fieldMaps = readJson(
    "data/record-clearing/production-factory/official-pdf-families/CO/field-maps.json",
  );
  const reviewManifest = readJson(
    "data/record-clearing/production-factory/official-pdf-families/CO/review-manifest.json",
  );
  const packetCatalog = readJson(
    "src/lib/rcap/packets/jurisdictions/colorado/packet-assemblies.json",
  );
  const boundary = readText(
    "src/lib/rcap/packets/jurisdictions/colorado/overlay.ts",
  );

  assertNonAuthorizing(sourceRequirements, "CO source contract");
  assert(
    sourceRequirements.documents.every(
      (document) =>
        document.workerReadAuthorized === false &&
        document.workerMaterializationAuthorized === false &&
        document.portableProjection === null &&
        document.assignmentAnchor === null,
    ),
    "a retained source document widened the assignment contract",
  );

  const laneAssemblies = packetCatalog.packetAssemblies.filter((assembly) =>
    expectedTrackIds.includes(assembly.trackId),
  );
  assertExactSet(
    laneAssemblies.map((assembly) => assembly.trackId),
    expectedTrackIds,
    "flat-PDF overlay tracks",
  );
  assert(
    laneAssemblies.every(
      (assembly) =>
        assembly.assemblyStatus === "blocked_preflight_only" &&
        assembly.packetReady === false &&
        assembly.generationAllowed === false &&
        assembly.runtimeStatus === "runtime_disabled",
    ),
    "an overlay packet assembly became ready",
  );

  const sourceByDocument = new Map(
    sourceRequirements.documents.map((document) => [
      document.documentId,
      document,
    ]),
  );
  const mapByDocument = new Map(
    fieldMaps.fieldMaps.map((fieldMap) => [fieldMap.documentId, fieldMap]),
  );
  for (const documentId of expectedFlatDocumentIds) {
    const source = sourceByDocument.get(documentId);
    const fieldMap = mapByDocument.get(documentId);
    assert(
      source?.technicalExpectation.technicalClass === "flat_pdf" &&
        source.technicalExpectation.fieldCount === 0 &&
        source.rendererCandidate === "coordinate_overlay",
      `${documentId}: flat-PDF candidate classification drift`,
    );
    assert(
      fieldMap &&
        fieldMap.strategyCandidate === "coordinate_overlay" &&
        fieldMap.activeRendererStrategy === null &&
        fieldMap.sourceFieldInventory.length === 0 &&
        fieldMap.sourceFieldBindings.length === 0 &&
        fieldMap.overlayPlacements.length === 0 &&
        fieldMap.reviewStatus.mappingApproved === false &&
        fieldMap.runtimeStatus === "runtime_disabled" &&
        fieldMap.generationAllowed === false,
      `${documentId}: an unassigned overlay mapping became active`,
    );
  }
  assertExactSet(
    fieldMaps.fieldMaps
      .filter((fieldMap) => fieldMap.strategyCandidate === "coordinate_overlay")
      .map((fieldMap) => fieldMap.documentId),
    expectedFlatDocumentIds,
    "flat-PDF overlay candidates",
  );
  assertExactSet(
    reviewManifest.componentReviews
      .filter(
        (review) => review.coordinateReview === "unconfirmed_source_absent",
      )
      .map((review) => review.documentId),
    expectedFlatDocumentIds,
    "unconfirmed coordinate reviews",
  );

  const companion = sourceByDocument.get("JDF-681");
  assert(
    companion?.technicalExpectation.technicalClass === "clean_acroform" &&
      companion.trackId === "co_pardoned_conviction_seal" &&
      companion.declaredComponentRole === "proposed_order",
    "JDF-681 packet companion identity drift",
  );
  const municipalResolution = sourceRequirements.unresolvedIdentities.find(
    (entry) => entry.documentId === "JDF-684",
  );
  assert(
    municipalResolution?.resolverSource === null &&
      municipalResolution.aliasAllowed === false &&
      municipalResolution.roleConflict === true &&
      municipalResolution.authorityCandidate.documentRole === "DENIAL_ORDER" &&
      municipalResolution.authorityCandidate.usableForDeclaredComponent ===
        false &&
      municipalResolution.knownDistinctAuthorityAsset.documentId === "JDF-686",
    "JDF-684 must remain an unresolved denial/grant role conflict",
  );
  const nonAlias = sourceRequirements.nonAliasDeclarations.find(
    (entry) => entry.declaredDocumentId === "JDF-684",
  );
  assert(
    nonAlias?.distinctDocumentId === "JDF-686" &&
      nonAlias.disposition === "do_not_alias",
    "JDF-684/JDF-686 non-alias declaration drift",
  );

  assert(
    boundary.includes(
      'COLORADO_FLAT_PDF_OVERLAY_JOB_ID =\n  "rcap-co-flat-pdf-overlay"',
    ) &&
      boundary.includes('"captain_assignment_required"') &&
      boundary.includes("assertColoradoFlatPdfOverlayLaneReady") &&
      boundary.includes("sourcePathResolutionAllowed: false") &&
      boundary.includes("rendererEnabled: false") &&
      boundary.includes("activeOverlayPlacementCount: 0"),
    "canonical overlay boundary lost its disabled lane state",
  );
  assertNoSourceOrRendererCapability(boundary, "overlay boundary");
  verifyNotRegistered("colorado/overlay", "rcap-co-flat-pdf-overlay");

  if (requireReady) {
    throw new Error(
      "--require-ready failed closed: captain_assignment_required; source_path_resolution_prohibited; confirmed_overlay_coordinates=0/2; JDF-684 unresolved role conflict",
    );
  }

  process.stdout.write(
    [
      "Colorado flat-PDF overlay lane verification passed.",
      `  tracks: ${expectedTrackIds.length}`,
      `  retained flat-PDF identities: ${expectedFlatDocumentIds.length}`,
      "  assignment state: captain_assignment_required",
      "  confirmed coordinates/renderers: 0/disabled",
      "  JDF-684: unresolved denial/grant role conflict; JDF-686 not aliased",
      "  private-path inspection: not attempted",
      "  live/shared registry integration: absent",
    ].join("\n") + "\n",
  );
}

function assertNonAuthorizing(value, label) {
  assert(
    value.contractState === "pending_captain_assignment" &&
      value.assignmentAnchor === null &&
      value.portableProjection === null &&
      value.portableProjectionPresent === false &&
      value.workerReadAuthorized === false &&
      value.workerMaterializationAuthorized === false &&
      value.repositoryPrivatePathTreatment ===
        "identity_evidence_only_not_materialization_authority",
    `${label} is not explicitly non-authorizing`,
  );
}

function assertNoSourceOrRendererCapability(source, label) {
  for (const prohibited of [
    "pdf-lib",
    "node:fs",
    "fetch(",
    "private/Nationwide",
    "repositorySourcePath",
    "readFile",
    "existsSync",
  ]) {
    assert(!source.includes(prohibited), `${label} contains ${prohibited}`);
  }
}

function verifyNotRegistered(importNeedle, familyNeedle) {
  const packetDirectory = resolveRepoPath("src/lib/rcap/packets");
  for (const name of fs.readdirSync(packetDirectory)) {
    if (
      !name.startsWith("registry") ||
      (!name.endsWith(".ts") && !name.endsWith(".tsx"))
    ) {
      continue;
    }
    const registry = fs.readFileSync(path.join(packetDirectory, name), "utf8");
    assert(
      !registry.includes(importNeedle) && !registry.includes(familyNeedle),
      `${name}: disabled overlay lane must not be registered`,
    );
  }
}

function assertExactSet(actual, expected, label) {
  const normalizedActual = [...new Set(actual)].sort();
  const normalizedExpected = [...new Set(expected)].sort();
  assert(
    normalizedActual.length === actual.length,
    `${label}: duplicate values are not allowed`,
  );
  assert(
    JSON.stringify(normalizedActual) === JSON.stringify(normalizedExpected),
    `${label}: expected [${normalizedExpected.join(", ")}], got [${normalizedActual.join(", ")}]`,
  );
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(resolveRepoPath(relativePath), "utf8");
}

function resolveRepoPath(relativePath) {
  assert(
    !path.isAbsolute(relativePath) && !relativePath.startsWith("private/"),
    `verifier may read repository metadata/code only: ${relativePath}`,
  );
  const absolutePath = path.resolve(rootDir, relativePath);
  const relative = path.relative(rootDir, absolutePath);
  assert(
    relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative),
    `path escapes repository root: ${relativePath}`,
  );
  return absolutePath;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fail(message) {
  process.stderr.write(
    `Colorado flat-PDF overlay verification failed: ${message}\n`,
  );
  process.exitCode = 1;
}
