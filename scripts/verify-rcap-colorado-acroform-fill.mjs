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
  "co_petition_seal_arrest",
  "co_motion_seal_nonconviction",
  "co_clean_slate",
  "co_motion_seal_conviction",
  "co_multiple_conviction_seal",
  "co_decriminalized_conduct_seal",
];

const expectedDocumentIds = [
  "JDF-417",
  "JDF-477",
  "JDF-478",
  "JDF-2363",
  "JDF-612",
  "JDF-615",
  "JDF-641",
  "JDF-642",
  "JDF-2370",
  "JDF-2374",
];

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
  const packetCatalog = readJson(
    "src/lib/rcap/packets/jurisdictions/colorado/packet-assemblies.json",
  );
  const boundary = readText(
    "src/lib/rcap/packets/jurisdictions/colorado/acroform.ts",
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
    "AcroForm lane tracks",
  );
  const laneOfficialComponents = laneAssemblies.flatMap((assembly) =>
    assembly.components.filter(
      (component) =>
        component.kind === "official_pdf" &&
        component.sourceRequirementId !== null,
    ),
  );
  assertExactSet(
    laneOfficialComponents.map((component) => component.officialFormId),
    expectedDocumentIds,
    "AcroForm lane retained documents",
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
  for (const documentId of expectedDocumentIds) {
    const source = sourceByDocument.get(documentId);
    const fieldMap = mapByDocument.get(documentId);
    assert(source, `${documentId}: source-evidence row missing`);
    assert(
      source.technicalExpectation.technicalClass === "clean_acroform" &&
        source.rendererCandidate === "acroform_fill",
      `${documentId}: AcroForm candidate classification drift`,
    );
    assert(
      fieldMap &&
        fieldMap.strategyCandidate === "acroform_fill" &&
        fieldMap.activeRendererStrategy === null &&
        fieldMap.sourceFieldInventory.length === 0 &&
        fieldMap.sourceFieldBindings.length === 0 &&
        fieldMap.overlayPlacements.length === 0 &&
        fieldMap.reviewStatus.mappingApproved === false &&
        fieldMap.runtimeStatus === "runtime_disabled" &&
        fieldMap.generationAllowed === false,
      `${documentId}: an unassigned AcroForm mapping became active`,
    );
  }

  const roleMismatch = sourceByDocument.get("JDF-2370");
  assert(
    roleMismatch.documentRole === "INSTRUCTIONS" &&
      roleMismatch.declaredComponentRole === "primary_filing" &&
      roleMismatch.authorityDisposition === "authority_role_mismatch",
    "JDF-2370 must remain a blocked instructions/primary-filing mismatch",
  );
  const arrestOrder = sourceRequirements.unresolvedIdentities.find(
    (entry) => entry.documentId === "JDF-417-ORDER",
  );
  assert(
    arrestOrder?.resolverSource === null &&
      arrestOrder.aliasAllowed === false &&
      arrestOrder.knownDistinctAuthorityAsset.documentId === "JDF-418",
    "JDF-417-ORDER must remain unresolved and non-aliased",
  );

  assert(
    boundary.includes('COLORADO_ACROFORM_JOB_ID = "rcap-co-acroform-fill"') &&
      boundary.includes('"captain_assignment_required"') &&
      boundary.includes("assertColoradoAcroformLaneReady") &&
      boundary.includes("sourcePathResolutionAllowed: false") &&
      boundary.includes("rendererEnabled: false") &&
      boundary.includes("activeFieldMappingCount: 0"),
    "canonical AcroForm boundary lost its disabled lane state",
  );
  assertNoSourceOrRendererCapability(boundary, "AcroForm boundary");
  verifyNotRegistered("colorado/acroform", "rcap-co-acroform-fill");

  if (requireReady) {
    throw new Error(
      "--require-ready failed closed: captain_assignment_required; source_path_resolution_prohibited; approved_field_mappings=0/10; JDF-2370 authority role mismatch; JDF-417-ORDER unresolved",
    );
  }

  process.stdout.write(
    [
      "Colorado AcroForm lane verification passed.",
      `  tracks: ${expectedTrackIds.length}`,
      `  retained AcroForm-shaped identities: ${expectedDocumentIds.length}`,
      "  assignment state: captain_assignment_required",
      "  active field mappings/renderers: 0/disabled",
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
      `${name}: disabled AcroForm lane must not be registered`,
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
    `Colorado AcroForm lane verification failed: ${message}\n`,
  );
  process.exitCode = 1;
}
