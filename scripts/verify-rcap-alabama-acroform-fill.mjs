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

const familyDir =
  "data/record-clearing/production-factory/official-pdf-families/AL";
const packetCatalogPath =
  "src/lib/rcap/packets/jurisdictions/alabama/packet-assemblies.json";
const acroformBoundaryPath =
  "src/lib/rcap/packets/jurisdictions/alabama/acroform.ts";
const expectedTracks = [
  "al-misd-nonconviction-90",
  "al-felony-nonconviction-90",
  "al-misd-dwop",
  "al-felony-dwop",
  "al-diversion",
  "al-misd-conviction",
  "al-pardoned-felony",
  "al-trafficking",
];

try {
  verify();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

function verify() {
  const sources = readJson(`${familyDir}/source-requirements.json`);
  const fieldMaps = readJson(`${familyDir}/field-maps.json`);
  const packetCatalog = readJson(packetCatalogPath);
  const dependencies = readJson(`${familyDir}/dependencies.json`);
  const reviews = readJson(`${familyDir}/review-manifest.json`);
  const implementationJob = readJson(
    "planning/record-clearing-100-percent/jobs/IMP-OF-06-al-cr-65-c10-family.json",
  );
  const boundary = readText(acroformBoundaryPath);
  const sharedRegistry = readText("src/lib/rcap/packets/registry.ts");

  assert(
    implementationJob.jobId === "IMP-OF-06-al-cr-65-c10-family" &&
      implementationJob.lane === "implementation-acroform",
    "implementation job lane drift",
  );
  const acroformSources = sources.documents.filter((source) =>
    ["CR-65", "C-10-CRIMINAL"].includes(source.documentId),
  );
  assert(
    acroformSources.length === 2,
    "AcroForm lane must retain exactly two source identities",
  );
  for (const source of acroformSources) {
    assert(
      source.technicalExpectation.technicalClass === "clean_acroform" &&
        source.technicalExpectation.fieldCount === 108 &&
        source.assignmentAnchor === null &&
        source.portableProjection === null &&
        source.workerReadAuthorized === false &&
        source.workerMaterializationAuthorized === false &&
        source.sourceInspectionState ===
          "prohibited_until_captain_assignment" &&
        source.mappingApproved === false &&
        source.runtimeStatus === "runtime_disabled" &&
        source.generationAllowed === false,
      `${source.documentId}: AcroForm source gate widened`,
    );
    assert(
      typeof source.repositorySourcePath === "string" &&
        source.repositorySourcePath.startsWith("private/"),
      `${source.documentId}: identity-evidence path string drift`,
    );
  }
  const sourceByDocument = new Map(
    acroformSources.map((source) => [source.documentId, source]),
  );
  assert(
    sourceByDocument.get("CR-65").expected.sha256 ===
      "c2e0c7bd7abca2c83c469d7da1aa0b80b132e653f8712d0b4ce77c8b160b2a39" &&
      sourceByDocument.get("CR-65").expected.bytes === 468056 &&
      sourceByDocument.get("CR-65").usageBindings.length === 17,
    "CR-65 AcroForm identity or binding count drift",
  );
  assert(
    sourceByDocument.get("C-10-CRIMINAL").expected.sha256 ===
      "527d4cfdde5bea564a8729e6425f1042627b03435ec634509fe32fdb80a5c6f8" &&
      sourceByDocument.get("C-10-CRIMINAL").expected.bytes === 711433 &&
      sourceByDocument.get("C-10-CRIMINAL").usageBindings.length === 8,
    "C-10-CRIMINAL AcroForm identity or binding count drift",
  );

  const acroformMaps = fieldMaps.fieldMaps.filter((fieldMap) =>
    ["CR-65", "C-10-CRIMINAL"].includes(fieldMap.documentId),
  );
  assert(
    acroformMaps.length === 2,
    "AcroForm lane must declare exactly two maps",
  );
  for (const fieldMap of acroformMaps) {
    assert(
      fieldMap.strategyCandidate === "acroform_fill" &&
        fieldMap.activeRendererStrategy === null &&
        fieldMap.sourceFieldInventory.length === 0 &&
        fieldMap.sourceFieldBindings.length === 0 &&
        fieldMap.overlayPlacements.length === 0 &&
        fieldMap.reviewStatus.mappingApproved === false &&
        fieldMap.runtimeStatus === "runtime_disabled" &&
        fieldMap.generationAllowed === false,
      `${fieldMap.documentId}: AcroForm mapping gate widened`,
    );
  }

  const assemblies = packetCatalog.packetAssemblies.filter((assembly) =>
    expectedTracks.includes(assembly.trackId),
  );
  assert(assemblies.length === 8, "AcroForm track count must remain 8");
  assertExactSet(
    assemblies.map((assembly) => assembly.trackId),
    expectedTracks,
    "AcroForm tracks",
  );
  const components = assemblies.flatMap((assembly) => assembly.components);
  assert(components.length === 25, "AcroForm component count must remain 25");
  assert(
    components.every(
      (component) =>
        ["CR-65", "C-10-CRIMINAL"].includes(component.officialFormId) &&
        component.rendererPosture ===
          "acroform_candidate_worker_read_prohibited" &&
        component.approval.mappingApproved === false &&
        component.runtimeStatus === "runtime_disabled" &&
        component.generationAllowed === false,
    ),
    "non-AcroForm or enabled component crossed the AcroForm lane",
  );
  assert(
    components.filter((component) => component.officialFormId === "CR-65")
      .length === 17 &&
      components.filter(
        (component) => component.officialFormId === "C-10-CRIMINAL",
      ).length === 8,
    "AcroForm packet component binding counts drift",
  );

  assert(
    dependencies.dependencies.some(
      (dependency) =>
        dependency.category === "captain_assignment" &&
        dependency.resolved === false,
    ) &&
      dependencies.dependencies.some(
        (dependency) =>
          dependency.category === "edition_projection" &&
          dependency.appliesTo.includes("CR-65") &&
          dependency.resolved === false,
      ) &&
      dependencies.dependencies.some(
        (dependency) =>
          dependency.category === "field_mapping" &&
          dependency.resolved === false,
      ),
    "AcroForm blocking dependencies drift",
  );
  const acroformReviews = reviews.documentReviews.filter((review) =>
    ["CR-65", "C-10-CRIMINAL"].includes(review.documentId),
  );
  assert(
    acroformReviews.length === 2 &&
      acroformReviews.every(
        (review) =>
          review.materializationState === "blocked_captain_assignment" &&
          review.technicalReview === "not_run_worker_read_prohibited" &&
          review.mappingReview === "not_submitted" &&
          review.sampleStatus === "not_generated" &&
          Object.values(review.approvals).every((value) => value === false),
      ),
    "AcroForm review gate widened",
  );

  assert(
    boundary.includes('laneId: "rcap-al-acroform-fill"') &&
      boundary.includes("assertAlabamaAcroformFillReady") &&
      boundary.includes("captain_assignment_required") &&
      boundary.includes('rendererStatus: "runtime_disabled"') &&
      boundary.includes("sourcePathExposed: false") &&
      !boundary.includes("pdf-lib") &&
      !sharedRegistry.includes("jurisdictions/alabama/acroform"),
    "AcroForm typed boundary or registry isolation drift",
  );

  const blockers = [
    "captain_assignment_required",
    "cr65_edition_projection_required",
    "exact_source_inspection_not_authorized",
    "acroform_field_inventories:0/2",
    "acroform_mappings_approved:0/2",
    "source_backed_reviews_complete:0/10",
    "runtime_disabled",
  ];
  if (requireReady) {
    throw new Error(`--require-ready failed closed: ${blockers.join("; ")}`);
  }

  process.stdout.write(
    [
      "Alabama AcroForm-fill lane verification passed.",
      "  normalized tracks/components: 8/25",
      "  exact retained identities: 2 (CR-65 and C-10-CRIMINAL)",
      "  declared AcroForm fields: 108 + 108 (tracked evidence; not reinspected)",
      "  source field inventories/mappings: 0/2, 0/2",
      "  captain assignment: required; CR-65 Edition 1.2 projection pending",
      "  renderer/live registry: disabled and absent",
      "  private-path inspection: not attempted by this verifier",
    ].join("\n") + "\n",
  );
}

function assertExactSet(actual, expected, label) {
  const uniqueActual = [...new Set(actual)].sort();
  const uniqueExpected = [...new Set(expected)].sort();
  assert(
    uniqueActual.length === actual.length &&
      JSON.stringify(uniqueActual) === JSON.stringify(uniqueExpected),
    `${label}: expected [${uniqueExpected.join(", ")}], got [${uniqueActual.join(
      ", ",
    )}]`,
  );
}

function readJson(relativePath) {
  try {
    return JSON.parse(readText(relativePath));
  } catch (error) {
    throw new Error(
      `${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function readText(relativePath) {
  return fs.readFileSync(resolveRepoPath(relativePath), "utf8");
}

function resolveRepoPath(relativePath) {
  assert(
    typeof relativePath === "string" &&
      !path.isAbsolute(relativePath) &&
      !relativePath.replaceAll("\\", "/").startsWith("private/"),
    `tracked metadata path required; private source paths are prohibited: ${relativePath}`,
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
    `Alabama AcroForm-fill verification failed: ${message}\n`,
  );
  process.exitCode = 1;
}
