#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { register } from "node:module";

import { PDFDocument } from "pdf-lib";

if (process.env.NODE_ENV === "production") {
  console.error(
    "Refusing to run Georgia official-overlay technical fixtures in production."
  );
  process.exit(1);
}

register("./lib/ts-esm-loader.mjs", import.meta.url);

const ga = await import(
  "@/lib/rcap/packets/jurisdictions/georgia/official-overlay"
);

const ROOT = process.cwd();
const MATERIALIZATION_ROOT =
  process.env.RCAP_SOURCE_MATERIALIZATION_ROOT ?? "";
const OUT = path.join(
  ROOT,
  "tmp/packet-output-review/georgia-official-overlay"
);
const MARKER_PATH = "tmp/rcap-factory/job.json";
const PROJECTION_PATH =
  "data/record-clearing/production-factory/official-pdf-source-assignment-projection.json";
const RECEIPT_PATH =
  "data/record-clearing/production-factory/source-materialization-receipts/rcap-ga-gbi-gcic-request-to-restrict-arrest-record-prior-c9460dd6ad.json";
const OWNERSHIP_PATH =
  "data/record-clearing/production-factory/official-pdf-families/GA/field-ownership.json";
const FIELD_MAP_SCAFFOLD_PATH =
  "data/record-clearing/production-factory/official-pdf-families/GA/field-map-scaffold.json";
const FIXTURE_SCAFFOLD_PATH =
  "data/record-clearing/production-factory/official-pdf-families/GA/fixture-scaffold.json";
const SPECIFICATIONS_PATH =
  "data/record-clearing/legal-design-specifications.json";
const SHARED_REGISTRY_PATH = "src/lib/rcap/packets/registry.ts";
const IMPLEMENTATION_PATH =
  "src/lib/rcap/packets/jurisdictions/georgia/official-overlay.ts";
const failures = [];
const checks = [];
const rendered = [];
const pageImages = [];
const integrationValidation =
  process.env.RCAP_FACTORY_VALIDATION_SCOPE === "integration";

function ok(condition, message) {
  if (!condition) failures.push(message);
}

function note(message) {
  checks.push(message);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function materializedSourcePath(destination, rootPath = MATERIALIZATION_ROOT) {
  const root = path.resolve(rootPath);
  const candidate = path.resolve(root, ...destination.split("/"));
  const relative = path.relative(root, candidate);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error("The assigned source escapes the materialization root.");
  }
  return candidate;
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sorted(values) {
  return [...values].sort((left, right) =>
    String(left).localeCompare(String(right))
  );
}

function sameMembers(actual, expected, label) {
  ok(
    JSON.stringify(sorted(actual)) === JSON.stringify(sorted(expected)),
    `${label}: expected ${JSON.stringify(sorted(expected))}, got ${JSON.stringify(sorted(actual))}.`
  );
}

function pdfText(file) {
  const result = spawnSync("pdftotext", ["-layout", file, "-"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024
  });
  if (result.status !== 0) {
    throw new Error(`pdftotext failed for ${file}: ${result.stderr}`);
  }
  return result.stdout;
}

function pageText(file, page) {
  const result = spawnSync(
    "pdftotext",
    ["-layout", "-f", String(page), "-l", String(page), file, "-"],
    {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024
    }
  );
  if (result.status !== 0) {
    throw new Error(
      `pdftotext page ${page} failed for ${file}: ${result.stderr}`
    );
  }
  return result.stdout;
}

function renderPageImages(pdfPath, outputDirectory, pageCount, kind) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const prefix = path.join(outputDirectory, "page");
  const result = spawnSync(
    "pdftoppm",
    ["-png", "-r", "150", pdfPath, prefix],
    {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024
    }
  );
  if (result.status !== 0) {
    throw new Error(`pdftoppm failed for ${pdfPath}: ${result.stderr}`);
  }
  const images = fs
    .readdirSync(outputDirectory)
    .filter((name) => /^page-\d+\.png$/u.test(name))
    .sort()
    .map((name, index) => {
      const imagePath = path.join(outputDirectory, name);
      const bytes = fs.readFileSync(imagePath);
      ok(
        bytes.byteLength > 5_000,
        `${imagePath}: rendered page image is unexpectedly small.`
      );
      const record = {
        kind,
        page: index + 1,
        path: path.relative(ROOT, imagePath),
        sha256: sha256(bytes),
        bytes: bytes.byteLength
      };
      pageImages.push(record);
      return record;
    });
  ok(
    images.length === pageCount,
    `${pdfPath}: expected ${pageCount} page images, got ${images.length}.`
  );
  return images;
}

async function expectError(code, callback, label) {
  let observed = null;
  try {
    await callback();
  } catch (error) {
    observed = error?.code ?? error?.name ?? "unknown";
  }
  ok(
    observed === code,
    `${label}: expected ${code}, got ${observed ?? "success"}.`
  );
}

function sourceBoundaryFixture({ includeFile, expectedBytes }) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "rcap-ga-overlay-boundary-")
  );
  const destination = materializedSourcePath(
    ga.GEORGIA_OFFICIAL_OVERLAY_SOURCE_REQUIREMENT.materializationDestination,
    root
  );
  const directory = path.dirname(destination);
  fs.mkdirSync(directory, { recursive: true });
  if (includeFile) {
    const bytes = Buffer.alloc(expectedBytes, 0);
    bytes.write("%PDF-1.4\n", 0, "ascii");
    fs.writeFileSync(destination, bytes, { mode: 0o444 });
    fs.chmodSync(destination, 0o444);
  }
  let current = directory;
  while (true) {
    fs.chmodSync(current, 0o555);
    if (current === root) break;
    current = path.dirname(current);
  }
  return {
    root,
    cleanup() {
      if (includeFile && fs.existsSync(destination)) {
        fs.chmodSync(destination, 0o644);
      }
      current = directory;
      while (true) {
        fs.chmodSync(current, 0o755);
        if (current === root) break;
        current = path.dirname(current);
      }
      fs.rmSync(root, { recursive: true, force: true });
    }
  };
}

ok(Boolean(MATERIALIZATION_ROOT), "RCAP_SOURCE_MATERIALIZATION_ROOT is required.");
const marker = fs.existsSync(path.join(ROOT, MARKER_PATH))
  ? readJson(MARKER_PATH)
  : null;
ok(
  integrationValidation || marker !== null,
  "The worker-local assignment marker is missing."
);
if (marker) {
  ok(
    marker.jobId === ga.GEORGIA_OFFICIAL_OVERLAY_JOB_ID,
    "The worker marker names another job."
  );
  ok(
    marker.exactAssignment?.jobId === ga.GEORGIA_OFFICIAL_OVERLAY_JOB_ID,
    "The exact assignment marker names another job."
  );
  ok(
    marker.exactAssignment?.baseCommit ===
      "ed03a7d77173283e13bd0bf41a3ea15c1bfed89c" &&
      marker.workerBaseCommit ===
        "ed03a7d77173283e13bd0bf41a3ea15c1bfed89c",
    "The marker base differs from the factory assignment."
  );
  ok(
    marker.exactAssignment?.workerBranch ===
      "rcap-factory/rcap-ga-flat-pdf-overlay-4bdcaaef",
    "The generated worker branch differs from the marker."
  );
  ok(
    marker.exactAssignment?.canonicalParent ===
      "IMP-OV-01-flat-pdf-overlay-family",
    "The marker canonical parent differs from the factory plan."
  );
  ok(
    marker.exactAssignment?.lane === "flat_pdf_overlay" &&
      marker.exactAssignment?.strategyFamily === "official_pdf_fill",
    "The marker lane or strategy family differs from the factory assignment."
  );
  ok(
    marker.exactAssignment?.runtimeDisabledInvariant === true,
    "The marker lost the runtime-disabled invariant."
  );
  sameMembers(
    marker.exactAssignment?.implementationFamilies ?? [],
    ["flat_pdf_overlay"],
    "implementation families"
  );
  sameMembers(
    marker.exactAssignment?.exactTracks ?? [],
    ga.GEORGIA_OFFICIAL_OVERLAY_TRACK_IDS,
    "assigned tracks"
  );
  sameMembers(
    marker.exactAssignment?.exactComponents ?? [],
    ga.GEORGIA_OFFICIAL_OVERLAY_COMPONENT_IDS,
    "assigned components"
  );
  sameMembers(
    marker.exactAssignment?.ownedPaths ?? [],
    [
      "scripts/verify-rcap-georgia-official-overlay.mjs",
      "src/lib/rcap/packets/jurisdictions/georgia/official-overlay.ts"
    ],
    "owned paths"
  );
  sameMembers(
    marker.exactAssignment?.expectedOutputs ?? [],
    [
      "scripts/verify-rcap-georgia-official-overlay.mjs",
      "src/lib/rcap/packets/jurisdictions/georgia/official-overlay.ts"
    ],
    "expected outputs"
  );
  sameMembers(
    marker.exactAssignment?.sourceIdentities?.map(
      (source) => source.sourceIdentityKey
    ) ?? [],
    [ga.GEORGIA_OFFICIAL_OVERLAY_SOURCE_REQUIREMENT.sourceIdentityKey],
    "assigned source identities"
  );
  ok(
    marker.exactAssignment?.focusedVerifier ===
      "scripts/verify-rcap-georgia-official-overlay.mjs",
    "The marker focused verifier differs from this verifier."
  );
  note(
    "1. Worker marker, base, branch, parent, lane, implementation family, source identity, track, component, owned paths, outputs, and verifier match the exact factory assignment."
  );
} else {
  note(
    "1. Captain integration scope: the committed exact factory assignment replaces the worker-local marker."
  );
}

const requirement = ga.GEORGIA_OFFICIAL_OVERLAY_SOURCE_REQUIREMENT;
const projectionBytes = fs.readFileSync(path.join(ROOT, PROJECTION_PATH));
ok(
  integrationValidation ||
    sha256(projectionBytes) === marker?.exactAssignment?.projectionSha256,
  "The official-PDF assignment projection hash differs from the worker marker."
);
const projection = JSON.parse(projectionBytes.toString("utf8"));
const projected = projection.identities.find(
  (identity) => identity.identityKey === requirement.sourceIdentityKey
);
ok(Boolean(projected), "The assigned Georgia identity is absent from the projection.");
ok(
  projected?.assignmentEligible === true &&
    projected?.disposition === "exact_worker_assignable",
  "The assigned Georgia identity is not exact-worker-assignable."
);
ok(
  projected?.officialDocument?.documentId === requirement.documentId &&
    projected?.officialDocument?.documentRole === requirement.documentRole &&
    projected?.officialDocument?.revision === requirement.revision &&
    projected?.officialDocument?.expectedSha256 === requirement.expectedSha256 &&
    projected?.officialDocument?.expectedBytes === requirement.expectedBytes &&
    projected?.officialDocument?.expectedMime === requirement.expectedMediaType &&
    projected?.officialDocument?.pageCount === requirement.expectedPageCount &&
    projected?.officialDocument?.structuralClass === requirement.structuralClass,
  "The projected Georgia source metadata differs from the implementation contract."
);
ok(
  projected?.exactSourceContract?.materializationDestination ===
    requirement.materializationDestination &&
    projected?.exactSourceContract?.readOnlyTreatment ===
      "worker_read_only_no_modify",
  "The projected portable source path or read-only treatment drifted."
);
sameMembers(
  projected?.componentIds ?? [],
  requirement.componentIds,
  "projected component uses"
);
sameMembers(
  projected?.trackIds ?? [],
  requirement.trackIds,
  "projected track uses"
);

const receipt = readJson(RECEIPT_PATH);
const receiptPayload = Object.fromEntries(
  Object.entries(receipt).filter(
    ([key]) => key !== "receiptSha256" && key !== "materializationAction"
  )
);
ok(
  receipt.schemaVersion === "rcap-source-materialization-result/v1" &&
    receipt.assignmentJobId === ga.GEORGIA_OFFICIAL_OVERLAY_JOB_ID &&
    /^[0-9a-f]{40}$/u.test(receipt.assignmentBaseCommit ?? "") &&
    /^[0-9a-f]{64}$/u.test(receipt.assignmentManifestSha256 ?? "") &&
    receipt.jurisdiction === "GA" &&
    receipt.documentId === requirement.documentId &&
    receipt.documentRole === requirement.documentRole &&
    receipt.expectedSha256 === requirement.expectedSha256 &&
    receipt.actualSha256 === requirement.expectedSha256 &&
    receipt.expectedBytes === requirement.expectedBytes &&
    receipt.actualBytes === requirement.expectedBytes &&
    receipt.expectedMediaType === requirement.expectedMediaType &&
    receipt.actualMediaType === requirement.expectedMediaType &&
    receipt.materializationDestination === requirement.materializationDestination &&
    receipt.actualMode === 0o444 &&
    receipt.hashAndMediaVerified === true &&
    receipt.workerReady === true &&
    receipt.ready === true,
  "The receipt does not bind the exact assigned Georgia source."
);
ok(
  receipt.receiptSha256 === sha256(Buffer.from(canonicalJson(receiptPayload))),
  "The Georgia source-materialization receipt envelope hash is invalid."
);
note(
  "2. Projection and receipt bind one exact four-page flat source, with no identity, track, component, path, hash, size, MIME, page-count, revision, or structural broadening."
);

const ownership = readJson(OWNERSHIP_PATH);
const ownershipForm = ownership.forms?.find(
  (form) => form.documentId === requirement.documentId
);
ok(
  ownership.schemaVersion === "rcap-official-pdf-field-ownership/v1" &&
    ownership.jurisdiction === "GA" &&
    ownershipForm?.expectedFieldCount === 0,
  "The Georgia ownership scaffold no longer describes a zero-field flat PDF."
);
sameMembers(
  ownership.mappingAllowedFor ?? [],
  ["participant", "system_derived"],
  "mapping-allowed ownership classes"
);
const fieldMapScaffold = readJson(FIELD_MAP_SCAFFOLD_PATH);
const scaffoldForm = fieldMapScaffold.forms?.find(
  (form) => form.documentId === requirement.documentId
);
ok(
  scaffoldForm?.expectedStructure?.technicalClass === "flat_pdf" &&
    scaffoldForm?.expectedStructure?.pageCount === 4 &&
    scaffoldForm?.expectedStructure?.fieldCount === 0 &&
    scaffoldForm?.expectedStructure?.encrypted === false &&
    scaffoldForm?.expectedStructure?.xfa === false,
  "The implementation source structure differs from the assigned field-map scaffold."
);

const placements = ga.GEORGIA_OFFICIAL_OVERLAY_PLACEMENTS;
const expectedPlacementGeometry = [
  ["section-one-full-legal-name", 106, 561, 428],
  ["section-one-date-of-birth", 136, 534, 155],
  ["section-one-race", 324, 534, 100],
  ["section-one-sex", 451, 534, 84],
  ["section-one-social-security-number", 183, 507, 351],
  ["section-one-telephone-number", 166, 480, 111],
  ["section-one-email", 313, 480, 221],
  ["section-one-street-address", 145, 453, 390],
  ["section-one-city", 96, 426, 210],
  ["section-one-state", 341, 426, 89],
  ["section-one-zip", 481, 426, 56],
  ["section-one-arresting-agency", 155, 399, 379],
  ["section-one-date-of-arrest", 142, 373, 390]
];
ok(placements.length === 14, `Expected 14 mapped regions, got ${placements.length}.`);
ok(
  new Set(placements.map((entry) => entry.regionId)).size ===
    placements.length,
  "The Georgia overlay contains a duplicate region identifier."
);
for (const [regionId, x, y, maxWidth] of expectedPlacementGeometry) {
  const entry = placements.find((candidate) => candidate.regionId === regionId);
  ok(
    entry?.page === 2 &&
      entry?.lineAnchors?.length === 1 &&
      entry.lineAnchors[0].x === x &&
      entry.lineAnchors[0].y === y &&
      entry.lineAnchors[0].maxWidth === maxWidth,
    `${regionId}: confirmed source coordinate drifted.`
  );
}
const offensePlacement = placements.find(
  (entry) => entry.regionId === "section-one-offenses-arrested-for"
);
ok(
  offensePlacement?.page === 2 &&
    JSON.stringify(offensePlacement.lineAnchors) ===
      JSON.stringify([
        { x: 188, y: 346, maxWidth: 346 },
        { x: 74, y: 319, maxWidth: 461 },
        { x: 74, y: 292, maxWidth: 461 }
      ]),
  "The confirmed three-line offense region drifted."
);
for (const entry of placements) {
  ok(
    entry.page === 2 &&
      entry.font === "Helvetica" &&
      entry.fontSize === 9 &&
      entry.confirmedAgainstRenderedPage === true &&
      entry.confirmedAgainstSourceSha256 === requirement.expectedSha256 &&
      entry.coversOfficialText === false,
    `${entry.regionId}: overlay confirmation, font, page, or blank-only invariant drifted.`
  );
  ok(
    entry.sourceRegions.length === entry.lineAnchors.length &&
      entry.sourceRegions.every(
        (region, index) =>
          region.x === entry.lineAnchors[index].x &&
          region.y === entry.lineAnchors[index].y - 1 &&
          region.width === entry.lineAnchors[index].maxWidth &&
          region.height === 12
      ),
    `${entry.regionId}: source blank and draw anchor do not reconcile.`
  );
}
const protectedRegions = ga.GEORGIA_OFFICIAL_OVERLAY_PROTECTED_REGIONS;
sameMembers(
  protectedRegions.map((entry) => entry.regionId),
  [
    "instructions-page",
    "gbi-use-only",
    "applicant-signature-and-date",
    "section-two-arrest-information",
    "section-three-prosecuting-attorney"
  ],
  "protected source regions"
);
ok(
  placements.every(
    (entry) =>
      !protectedRegions.some(
        (protectedRegion) =>
          protectedRegion.pages.includes(entry.page) &&
          protectedRegion.regionId !== "instructions-page" &&
          protectedRegion.regionId !== "gbi-use-only" &&
          protectedRegion.regionId !== "applicant-signature-and-date"
      )
  ),
  "An overlay placement targets a fully outside-party page."
);
const implementationSource = fs.readFileSync(
  path.join(ROOT, IMPLEMENTATION_PATH),
  "utf8"
);
ok(
  !implementationSource.includes(".drawRectangle("),
  "The Georgia overlay introduced a rectangle that could conceal official text."
);
note(
  "3. Overlay map: 14 confirmed blank-only regions on PDF page 2 use a fixed readable Helvetica size. The instruction page, GBI-only block, signature/date, all of Section Two, and all of Section Three remain unchanged or blank."
);

const specifications = readJson(SPECIFICATIONS_PATH);
const specification = specifications.officialFormAssignments.find(
  (entry) =>
    entry.trackId === "ga-nonconv-pre2013" &&
    entry.componentId === "ga-nonconv-pre2013-primary-filing-1" &&
    entry.officialFormId === requirement.documentId
);
ok(Boolean(specification), "The exact Georgia legal-design assignment is absent.");
sameMembers(
  specification?.generationRequirements?.map((entry) => entry.key) ?? [],
  ga.GEORGIA_OFFICIAL_OVERLAY_NORMALIZED_INPUT_KEYS,
  "normalized Georgia generation keys"
);
const mappedInputKeys = new Set(placements.map((entry) => entry.inputKey));
sameMembers(
  mappedInputKeys,
  [
    "fullLegalName",
    "dateOfBirth",
    "race",
    "sex",
    "socialSecurityNumber",
    "telephoneNumber",
    "emailForAgency",
    "streetAddressForCompletionLetter",
    "cityStateZip",
    "arrestingAgency",
    "arrestDate",
    "offensesArrestedFor"
  ],
  "mapped participant input keys"
);
sameMembers(
  ga.GEORGIA_OFFICIAL_OVERLAY_UNWRITTEN_INPUTS.map(
    (entry) => entry.inputKey
  ),
  [
    "disposition",
    "appearsOnCriminalHistory",
    "pleaAgreementSameTransaction"
  ],
  "intentionally unwritten screening inputs"
);
ok(
  placements.every((entry) =>
    ga.GEORGIA_OFFICIAL_OVERLAY_NORMALIZED_INPUT_KEYS.includes(
      entry.inputKey
    )
  ),
  "An overlay region uses an input absent from the normalized legal design."
);
ok(
  specification?.manualCompletionItems?.some(
    (entry) => entry.item === "Applicant signature and date"
  ) &&
    specification?.manualCompletionItems?.some(
      (entry) => entry.item === "Section Two in its entirety"
    ) &&
    specification?.manualCompletionItems?.some(
      (entry) => entry.item === "Section Three in its entirety"
    ),
  "The implementation no longer preserves every legal-design manual-completion item."
);
const fixtureScaffold = readJson(FIXTURE_SCAFFOLD_PATH);
sameMembers(
  fixtureScaffold.tracks?.[0]?.requiredFactKeys ?? [],
  ga.GEORGIA_OFFICIAL_OVERLAY_NORMALIZED_INPUT_KEYS,
  "factory fixture fact keys"
);
note(
  "4. Legal-design boundary: all 12 mapped input keys are exact adopted participant answers; city/state/ZIP is only deterministically split. Three screening answers are not converted into agency or prosecutor assertions."
);

const sourcePath = materializedSourcePath(
  requirement.materializationDestination
);
const sourceBefore = {
  sha256: sha256(fs.readFileSync(sourcePath)),
  bytes: fs.statSync(sourcePath).size,
  mode: fs.statSync(sourcePath).mode & 0o777
};
const verified = await ga.verifyGeorgiaOfficialOverlaySource({
  materializationRoot: MATERIALIZATION_ROOT
});
ok(
  verified.sha256 === requirement.expectedSha256 &&
    verified.bytes.byteLength === requirement.expectedBytes &&
    verified.pageCount === requirement.expectedPageCount &&
    verified.fieldCount === requirement.expectedFieldCount,
  "The implementation source verification did not reconcile."
);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const sourceImages = renderPageImages(
  sourcePath,
  path.join(OUT, "source-reference"),
  4,
  "source"
);

for (const fixture of ga.GEORGIA_OFFICIAL_OVERLAY_TECHNICAL_FIXTURES) {
  const first = await ga.renderGeorgiaOfficialOverlayTrack({
    materializationRoot: MATERIALIZATION_ROOT,
    trackId: fixture.trackId,
    facts: fixture.facts
  });
  const second = await ga.renderGeorgiaOfficialOverlayTrack({
    materializationRoot: MATERIALIZATION_ROOT,
    trackId: fixture.trackId,
    facts: fixture.facts
  });
  ok(first.runtimeDisabled === true, `${fixture.fixtureId}: runtime is not disabled.`);
  ok(first.packetReady === false, `${fixture.fixtureId}: packet readiness changed.`);
  ok(
    first.counselAdopted === false,
    `${fixture.fixtureId}: counsel adoption changed.`
  );
  ok(
    first.releaseActive === false,
    `${fixture.fixtureId}: release state changed.`
  );
  ok(
    first.technicalFixtureOnly === true,
    `${fixture.fixtureId}: output is not technical-fixture-only.`
  );
  ok(
    first.physicalDocuments.length === 1 &&
      second.physicalDocuments.length === 1,
    `${fixture.fixtureId}: expected one physical document.`
  );
  sameMembers(
    first.logicalComponentOrder,
    ga.GEORGIA_OFFICIAL_OVERLAY_COMPONENT_IDS,
    `${fixture.fixtureId} component order`
  );
  const document = first.physicalDocuments[0];
  const repeated = second.physicalDocuments[0];
  ok(
    document.sha256 === repeated.sha256 &&
      Buffer.from(document.bytes).equals(Buffer.from(repeated.bytes)),
    `${fixture.fixtureId}: repeated rendering changed the bytes.`
  );
  ok(
    document.sha256 ===
      ga.GEORGIA_OFFICIAL_OVERLAY_EXPECTED_FIXTURE_HASHES[
        fixture.fixtureId
      ],
    `${fixture.fixtureId}: stable fixture hash differs (got ${document.sha256}).`
  );
  ok(
    document.sourceIdentityKey === requirement.sourceIdentityKey &&
      document.sourceSha256 === requirement.expectedSha256,
    `${fixture.fixtureId}: source identity drifted.`
  );
  ok(
    document.pageCount === 4 && document.physicalCopyCount === 1,
    `${fixture.fixtureId}: page or physical-copy count changed.`
  );
  sameMembers(
    document.logicalComponentIds,
    requirement.componentIds,
    `${fixture.fixtureId} logical component binding`
  );
  sameMembers(
    document.overlayPages,
    [2],
    `${fixture.fixtureId} overlay pages`
  );
  sameMembers(
    document.mappedRegionIds,
    placements.map((entry) => entry.regionId),
    `${fixture.fixtureId} mapped regions`
  );
  sameMembers(
    document.protectedRegionIds,
    protectedRegions.map((entry) => entry.regionId),
    `${fixture.fixtureId} protected regions`
  );

  const fixtureDirectory = path.join(OUT, fixture.fixtureId);
  fs.mkdirSync(fixtureDirectory, { recursive: true });
  const outputPath = path.join(
    fixtureDirectory,
    `${fixture.fixtureId}-GBI-GCIC.pdf`
  );
  fs.writeFileSync(outputPath, document.bytes);
  const reopened = await PDFDocument.load(document.bytes, {
    updateMetadata: false
  });
  ok(
    reopened.getPageCount() === 4 &&
      reopened.getForm().getFields().length === 0 &&
      reopened.getPages().every(
        (page) =>
          page.getWidth() === 612 &&
          page.getHeight() === 792 &&
          page.getRotation().angle === 0
      ),
    `${fixture.fixtureId}: page geometry or flat-PDF structure changed.`
  );

  const extracted = pdfText(outputPath);
  const normalizedExtracted = extracted.replace(/\s+/gu, " ");
  for (const fixedPhrase of [
    "AGENCY INSTRUCTIONS FOR REQUEST TO RESTRICT",
    "SECTION ONE - APPLICANT INFORMATION",
    "SECTION TWO - ARREST INFORMATION",
    "SECTION THREE – PROSECUTING ATTORNEY",
    "Record Restriction Form"
  ]) {
    ok(
      normalizedExtracted.includes(fixedPhrase),
      `${fixture.fixtureId}: official phrase is missing: ${fixedPhrase}.`
    );
  }
  for (const value of [
    fixture.facts.fullLegalName,
    fixture.facts.dateOfBirth,
    fixture.facts.race,
    fixture.facts.sex,
    fixture.facts.socialSecurityNumber,
    fixture.facts.telephoneNumber,
    fixture.facts.emailForAgency,
    fixture.facts.streetAddressForCompletionLetter,
    "Atlanta",
    "GA",
    "30303",
    fixture.facts.arrestingAgency,
    fixture.facts.arrestDate,
    "Synthetic misdemeanor charge and synthetic ordinance allegation for deterministic",
    "layout testing only"
  ]) {
    ok(
      normalizedExtracted.includes(String(value).replace(/\s+/gu, " ")),
      `${fixture.fixtureId}: a mapped value is absent from the rendered text layer.`
    );
  }
  for (const ignoredValue of [
    fixture.facts.disposition,
    String(fixture.facts.appearsOnCriminalHistory),
    String(fixture.facts.pleaAgreementSameTransaction)
  ]) {
    ok(
      !normalizedExtracted.includes(String(ignoredValue)),
      `${fixture.fixtureId}: an agency/prosecutor screening answer was written.`
    );
  }
  for (let page = 1; page <= 4; page += 1) {
    ok(
      pageText(outputPath, page).replace(/\s/gu, "").length > 80,
      `${fixture.fixtureId}: page ${page} is blank.`
    );
  }
  const outputImages = renderPageImages(
    outputPath,
    path.join(fixtureDirectory, "pages"),
    4,
    "output"
  );
  for (const page of [1, 3, 4]) {
    ok(
      sourceImages[page - 1].sha256 === outputImages[page - 1].sha256,
      `${fixture.fixtureId}: protected page ${page} changed after rasterization.`
    );
  }
  ok(
    sourceImages[1].sha256 !== outputImages[1].sha256,
    `${fixture.fixtureId}: mapped page 2 did not visibly change.`
  );
  rendered.push({
    fixtureId: fixture.fixtureId,
    trackId: fixture.trackId,
    documentId: document.documentId,
    componentIds: document.logicalComponentIds,
    overlayPages: document.overlayPages,
    mappedRegionCount: document.mappedRegionIds.length,
    protectedRegionCount: document.protectedRegionIds.length,
    pageCount: document.pageCount,
    sha256: document.sha256,
    outputPath: path.relative(ROOT, outputPath)
  });
}

sameMembers(
  [...new Set(rendered.flatMap((entry) => entry.componentIds))],
  ga.GEORGIA_OFFICIAL_OVERLAY_COMPONENT_IDS,
  "rendered component coverage"
);
sameMembers(
  [...new Set(rendered.map((entry) => entry.trackId))],
  ga.GEORGIA_OFFICIAL_OVERLAY_TRACK_IDS,
  "rendered track coverage"
);
ok(
  rendered.length === 1 && rendered[0].pageCount === 4,
  "Expected one deterministic four-page Georgia technical packet."
);
note(
  "5. Rendering: one deterministic four-page technical packet covers the exact track and component. Fourteen mapped regions appear only on PDF page 2; protected pages 1, 3, and 4 are raster-identical to the source."
);

const fixture = ga.GEORGIA_OFFICIAL_OVERLAY_TECHNICAL_FIXTURES[0];
await expectError(
  "missing_required_input",
  () =>
    ga.renderGeorgiaOfficialOverlayDocument({
      materializationRoot: MATERIALIZATION_ROOT,
      facts: { ...fixture.facts, fullLegalName: "" }
    }),
  "missing normalized participant input"
);
await expectError(
  "invalid_city_state_zip",
  () =>
    ga.renderGeorgiaOfficialOverlayDocument({
      materializationRoot: MATERIALIZATION_ROOT,
      facts: { ...fixture.facts, cityStateZip: "not parseable" }
    }),
  "combined city/state/ZIP parsing"
);
await expectError(
  "content_overflow",
  () =>
    ga.renderGeorgiaOfficialOverlayDocument({
      materializationRoot: MATERIALIZATION_ROOT,
      facts: {
        ...fixture.facts,
        offensesArrestedFor: "Synthetic overflow phrase ".repeat(100)
      }
    }),
  "three-line offense capacity"
);
await expectError(
  "protected_input",
  () =>
    ga.renderGeorgiaOfficialOverlayDocument({
      materializationRoot: MATERIALIZATION_ROOT,
      facts: { ...fixture.facts, applicantSignature: "Synthetic Signature" }
    }),
  "signature protection"
);
await expectError(
  "unsupported_track",
  () =>
    ga.renderGeorgiaOfficialOverlayTrack({
      materializationRoot: MATERIALIZATION_ROOT,
      trackId: "ga-nonconv-post2013",
      facts: {}
    }),
  "assignment boundary"
);

const missingSourceFixture = sourceBoundaryFixture({
  includeFile: false,
  expectedBytes: requirement.expectedBytes
});
try {
  await expectError(
    "source_missing",
    () =>
      ga.verifyGeorgiaOfficialOverlaySource({
        materializationRoot: missingSourceFixture.root
      }),
    "missing source boundary"
  );
} finally {
  missingSourceFixture.cleanup();
}

const wrongHashFixture = sourceBoundaryFixture({
  includeFile: true,
  expectedBytes: requirement.expectedBytes
});
try {
  await expectError(
    "source_hash_mismatch",
    () =>
      ga.verifyGeorgiaOfficialOverlaySource({
        materializationRoot: wrongHashFixture.root
      }),
    "source hash boundary"
  );
} finally {
  wrongHashFixture.cleanup();
}
note(
  "6. Fail-closed cases: missing input, malformed combined address, region overflow, signature input, unassigned track, missing source, and wrong source hash are refused without shrinking, clipping, continuation, or gate weakening."
);

const sourceAfter = {
  sha256: sha256(fs.readFileSync(sourcePath)),
  bytes: fs.statSync(sourcePath).size,
  mode: fs.statSync(sourcePath).mode & 0o777
};
ok(
  JSON.stringify(sourceBefore) === JSON.stringify(sourceAfter) &&
    sourceAfter.sha256 === requirement.expectedSha256 &&
    sourceAfter.bytes === requirement.expectedBytes &&
    sourceAfter.mode === 0o444,
  "The controlling Georgia source bytes or read-only mode changed."
);
const trackedSources = spawnSync(
  "git",
  ["ls-files", "--", "official-pdf/GA/*.pdf"],
  { cwd: ROOT, encoding: "utf8" }
);
ok(
  trackedSources.status === 0 && trackedSources.stdout.trim() === "",
  "An official or generated Georgia source PDF entered Git."
);
const status = spawnSync(
  "git",
  ["status", "--porcelain=v1", "--untracked-files=all"],
  { cwd: ROOT, encoding: "utf8" }
);
const changedPaths = status.stdout
  .split("\n")
  .filter(Boolean)
  .map((line) => line.slice(3));
if (integrationValidation) {
  note(
    "7a. Captain integration scope: worker-owned path reconciliation is verified from the atomic worker commit."
  );
} else {
  sameMembers(
    changedPaths,
    [
      "scripts/verify-rcap-georgia-official-overlay.mjs",
      "src/lib/rcap/packets/jurisdictions/georgia/official-overlay.ts"
    ],
    "worker-owned changed paths"
  );
}
const sharedRegistry = fs.readFileSync(
  path.join(ROOT, SHARED_REGISTRY_PATH),
  "utf8"
);
ok(
  !sharedRegistry.includes("jurisdictions/georgia/official-overlay"),
  "The Georgia worker implementation was wired into the shared runtime registry."
);
ok(
  ga.GEORGIA_OFFICIAL_OVERLAY_RUNTIME_DISABLED === true &&
    ga.GEORGIA_OFFICIAL_OVERLAY_REVIEW_READY === false &&
    ga.GEORGIA_OFFICIAL_OVERLAY_COUNSEL_ADOPTED === false &&
    ga.GEORGIA_OFFICIAL_OVERLAY_RELEASE_ACTIVE === false,
  "A release-state invariant changed."
);
note(
  "7. Safety: the receipt-bound source is unchanged and mode 0444; no source or generated PDF is tracked; only job-owned files changed; shared runtime registration, packet readiness, counsel adoption, and release activation remain false."
);

if (failures.length > 0) {
  console.error("Georgia official PDF overlay verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Georgia official PDF overlay verification passed.");
for (const check of checks) console.log(check);
for (const entry of rendered) {
  console.log(
    `   ${entry.fixtureId.padEnd(43)} ${entry.pageCount}p ${entry.mappedRegionCount} regions ${entry.sha256}`
  );
}
console.log(
  `8. Visual evidence: 4 output page images plus 4 source-reference images rendered under ${path.relative(ROOT, OUT)}; worker inspection is technical evidence only.`
);
