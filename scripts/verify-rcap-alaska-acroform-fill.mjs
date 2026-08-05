#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { spawnSync } from "node:child_process";

import {
  PDFCheckBox,
  PDFDocument,
  PDFRadioGroup,
  PDFTextField
} from "pdf-lib";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run Alaska AcroForm technical fixtures in production.");
  process.exit(1);
}

register("./lib/ts-esm-loader.mjs", import.meta.url);

const ak = await import(
  "@/lib/rcap/packets/jurisdictions/alaska/acroform"
);

const ROOT = process.cwd();
const MATERIALIZATION_ROOT =
  process.env.RCAP_SOURCE_MATERIALIZATION_ROOT ?? "";
const OUT = path.join(ROOT, "tmp/packet-output-review/alaska-acroform");
const MARKER_PATH = path.join(ROOT, "tmp/rcap-factory/job.json");
const PROJECTION_PATH =
  "data/record-clearing/production-factory/official-pdf-source-assignment-projection.json";
const OWNERSHIP_PATH =
  "data/record-clearing/production-factory/official-pdf-families/AK/field-ownership.json";
const SPECIFICATIONS_PATH =
  "data/record-clearing/legal-design-specifications.json";
const SHARED_REGISTRY_PATH = "src/lib/rcap/packets/registry.ts";
const failures = [];
const checks = [];
const rendered = [];
const pageImages = [];

function ok(condition, message) {
  if (!condition) failures.push(message);
}

function note(message) {
  checks.push(message);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
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

function fieldBlank(field) {
  if (field instanceof PDFTextField) return (field.getText() ?? "").trim() === "";
  if (field instanceof PDFCheckBox) return !field.isChecked();
  if (field instanceof PDFRadioGroup) {
    return (field.getSelected() ?? "").trim() === "";
  }
  return false;
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

function renderPageImages(pdfPath, outputDirectory, pageCount) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const prefix = path.join(outputDirectory, "page");
  const result = spawnSync(
    "pdftoppm",
    ["-png", "-r", "150", pdfPath, prefix],
    {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024
    }
  );
  if (result.status !== 0) {
    throw new Error(`pdftoppm failed for ${pdfPath}: ${result.stderr}`);
  }
  const images = fs
    .readdirSync(outputDirectory)
    .filter((name) => /^page-\d+\.png$/u.test(name))
    .sort()
    .map((name) => path.join(outputDirectory, name));
  ok(
    images.length === pageCount,
    `${pdfPath}: expected ${pageCount} rendered page images, got ${images.length}.`
  );
  for (const imagePath of images) {
    const bytes = fs.readFileSync(imagePath);
    ok(bytes.byteLength > 5_000, `${imagePath}: rendered page image is unexpectedly small.`);
    pageImages.push({
      path: path.relative(ROOT, imagePath),
      sha256: sha256(bytes),
      bytes: bytes.byteLength
    });
  }
}

function expectedMappedValues(fixture, documentId) {
  const facts = fixture.facts;
  const caseNumber = String(facts.caseNumberAndCourt ?? "")
    .split(",", 1)[0]
    .trim();
  if (documentId === "TF-800") {
    return new Map([
      ["caseNo", caseNumber],
      ["documents", String(facts.recordsToSeal)],
      ["confidentialBecause", String(facts.sealingNarrative)]
    ]);
  }
  if (documentId === "TF-805") {
    return new Map([
      ["caseNo", caseNumber],
      ["reason", String(facts.groundsFacts)]
    ]);
  }
  return new Map([["caseNo", caseNumber]]);
}

async function expectError(code, callback, label) {
  let observed = null;
  try {
    await callback();
  } catch (error) {
    observed = error?.code ?? error?.name ?? "unknown";
  }
  ok(observed === code, `${label}: expected ${code}, got ${observed ?? "success"}.`);
}

ok(Boolean(MATERIALIZATION_ROOT), "RCAP_SOURCE_MATERIALIZATION_ROOT is required.");
ok(fs.existsSync(MARKER_PATH), "The worker-local assignment marker is missing.");
const marker = readJson("tmp/rcap-factory/job.json");
ok(marker.jobId === ak.ALASKA_ACROFORM_JOB_ID, "The worker marker names another job.");
ok(
  marker.exactAssignment?.jobId === ak.ALASKA_ACROFORM_JOB_ID,
  "The exact assignment marker names another job."
);
ok(
  marker.exactAssignment?.runtimeDisabledInvariant === true,
  "The marker lost the runtime-disabled invariant."
);
ok(
  marker.exactAssignment?.canonicalParent ===
    "IMP-OF-05-small-statewide-acroform-states",
  "The marker canonical parent differs from the factory plan."
);
ok(
  marker.exactAssignment?.lane === "acroform_fill" &&
    marker.exactAssignment?.strategyFamily === "official_pdf_fill",
  "The marker lane or strategy family differs from the factory assignment."
);
sameMembers(
  marker.exactAssignment?.exactTracks ?? [],
  ak.ALASKA_ACROFORM_TRACK_IDS,
  "assigned tracks"
);
sameMembers(
  marker.exactAssignment?.exactComponents ?? [],
  ak.ALASKA_ACROFORM_COMPONENT_IDS,
  "assigned components"
);
sameMembers(
  marker.exactAssignment?.ownedPaths ?? [],
  [
    "scripts/verify-rcap-alaska-acroform-fill.mjs",
    "src/lib/rcap/packets/jurisdictions/alaska/acroform.ts"
  ],
  "owned paths"
);
sameMembers(
  marker.exactAssignment?.sourceIdentities?.map(
    (source) => source.sourceIdentityKey
  ) ?? [],
  ak.ALASKA_ACROFORM_SOURCE_REQUIREMENTS.map(
    (source) => source.sourceIdentityKey
  ),
  "assigned source identities"
);
note("1. Worker marker, parent, lane, source identities, tracks, components, and owned paths match the exact factory assignment.");

const projectionBytes = fs.readFileSync(path.join(ROOT, PROJECTION_PATH));
ok(
  sha256(projectionBytes) === marker.exactAssignment?.projectionSha256,
  "The official-PDF assignment projection hash differs from the worker marker."
);
const projection = JSON.parse(projectionBytes.toString("utf8"));
for (const requirement of ak.ALASKA_ACROFORM_SOURCE_REQUIREMENTS) {
  const projected = projection.identities.find(
    (identity) => identity.identityKey === requirement.sourceIdentityKey
  );
  ok(Boolean(projected), `${requirement.sourceIdentityKey}: absent from projection.`);
  ok(
    projected?.assignmentEligible === true &&
      projected?.disposition === "exact_worker_assignable",
    `${requirement.sourceIdentityKey}: not an exact worker assignment.`
  );
  ok(
    projected?.officialDocument?.documentId === requirement.documentId &&
      projected?.officialDocument?.revision === requirement.revision &&
      projected?.officialDocument?.expectedSha256 ===
        requirement.expectedSha256 &&
      projected?.officialDocument?.expectedBytes === requirement.expectedBytes &&
      projected?.officialDocument?.expectedMime ===
        requirement.expectedMediaType &&
      projected?.officialDocument?.pageCount ===
        requirement.expectedPageCount &&
      projected?.officialDocument?.structuralClass ===
        requirement.structuralClass,
    `${requirement.sourceIdentityKey}: projected identity metadata differs from the implementation.`
  );
  sameMembers(
    projected?.componentIds ?? [],
    requirement.componentIds,
    `${requirement.documentId} component uses`
  );
  sameMembers(
    projected?.trackIds ?? [],
    requirement.trackIds,
    `${requirement.documentId} track uses`
  );
}
note(`2. Projection: ${ak.ALASKA_ACROFORM_SOURCE_REQUIREMENTS.length} exact receipt-backed identities reconcile without broadening.`);

const ownership = readJson(OWNERSHIP_PATH);
ok(
  ownership.automationPolicy?.signaturesAlwaysManual === true &&
    ownership.automationPolicy?.swornVerificationAlwaysManual === true &&
    ownership.automationPolicy?.unknownOwnerDefaultsToProtected === true,
  "The Alaska ownership scaffold lost a required manual/protected invariant."
);
const allowedOwnership = new Set([
  "participant_supplied",
  "derived_deterministically_from_participant_answers",
  "manual_participant_completion",
  "outside_party_completion",
  "court_or_agency_only",
  "prohibited_from_generation",
  "intentionally_blank",
  "not_used_by_assigned_route"
]);
let fieldCount = 0;
let mappedFieldCount = 0;
let manualFieldCount = 0;
for (const requirement of ak.ALASKA_ACROFORM_SOURCE_REQUIREMENTS) {
  const inventory =
    ak.ALASKA_ACROFORM_FIELD_INVENTORIES[requirement.documentId];
  ok(
    inventory.length === requirement.expectedFieldCount,
    `${requirement.documentId}: expected ${requirement.expectedFieldCount} inventoried fields, got ${inventory.length}.`
  );
  ok(
    new Set(inventory.map((field) => field.name)).size === inventory.length,
    `${requirement.documentId}: duplicate inventory field name.`
  );
  const mappings =
    ak.ALASKA_ACROFORM_TEXT_MAPPINGS[requirement.documentId];
  sameMembers(
    mappings.map((mapping) => mapping.fieldName),
    inventory
      .filter((field) => field.inputKey !== null)
      .map((field) => field.name),
    `${requirement.documentId} writable field inventory`
  );
  for (const field of inventory) {
    fieldCount += 1;
    ok(
      allowedOwnership.has(field.ownership),
      `${requirement.documentId}:${field.name}: unknown ownership classification.`
    );
    ok(field.widgets.length > 0, `${requirement.documentId}:${field.name}: no widget geometry.`);
    ok(
      field.widgets.every(
        (entry) =>
          Number.isInteger(entry.page) &&
          entry.page > 0 &&
          entry.page <= requirement.expectedPageCount &&
          entry.width > 0 &&
          entry.height > 0
      ),
      `${requirement.documentId}:${field.name}: invalid widget page or rectangle.`
    );
    if (field.inputKey !== null) mappedFieldCount += 1;
    if (field.ownership === "manual_participant_completion") {
      manualFieldCount += 1;
    }
  }
}
ok(fieldCount === 66, `expected 66 source fields, inventoried ${fieldCount}.`);
ok(mappedFieldCount === 6, `expected 6 mapped fields, got ${mappedFieldCount}.`);
ok(manualFieldCount === 60, `expected 60 manual fields, got ${manualFieldCount}.`);
for (const [documentId, fieldName] of [
  ["TF-800", "signature0"],
  ["TF-805", "signature0"],
  ["TF-810", "signature"],
  ["TF-810", "dateSigned"]
]) {
  const field = ak.ALASKA_ACROFORM_FIELD_INVENTORIES[documentId].find(
    (candidate) => candidate.name === fieldName
  );
  ok(
    field?.ownership === "manual_participant_completion" &&
      field?.inputKey === null,
    `${documentId}:${fieldName}: signature or execution field became writable.`
  );
}
const protectedSurfaces = Object.values(
  ak.ALASKA_ACROFORM_PROTECTED_SURFACES
).flat();
ok(
  protectedSurfaces.filter(
    (surface) => surface.owner === "outside_party_completion"
  ).length === 2,
  "Expected two outside-party protected surfaces."
);
ok(
  protectedSurfaces.filter(
    (surface) => surface.owner === "court_or_agency_only"
  ).length === 4,
  "Expected four court/agency-only protected surfaces."
);
note(`3. Inventory: 66/66 fields classified; ${mappedFieldCount} writable, ${manualFieldCount} manual, 2 outside-party and 4 court/agency-only non-field surfaces protected.`);

const specifications = readJson(SPECIFICATIONS_PATH);
const assignedSpecs = specifications.officialFormAssignments.filter((spec) =>
  ak.ALASKA_ACROFORM_TRACK_IDS.includes(spec.trackId)
);
const keysByDocument = new Map([
  [
    "TF-800",
    new Set(
      assignedSpecs
        .filter((spec) => spec.officialFormId === "TF-800")
        .flatMap((spec) =>
          spec.generationRequirements.map((requirement) => requirement.key)
        )
    )
  ],
  [
    "TF-805",
    new Set(
      assignedSpecs
        .filter((spec) => spec.officialFormId === "TF-805")
        .flatMap((spec) =>
          spec.generationRequirements.map((requirement) => requirement.key)
        )
    )
  ],
  [
    "TF-810",
    new Set(
      assignedSpecs
        .filter((spec) => spec.officialFormId === "TF-810")
        .flatMap((spec) =>
          spec.generationRequirements.map((requirement) => requirement.key)
        )
    )
  ]
]);
for (const [documentId, mappings] of Object.entries(
  ak.ALASKA_ACROFORM_TEXT_MAPPINGS
)) {
  for (const mapping of mappings) {
    ok(
      keysByDocument.get(documentId)?.has(mapping.inputKey),
      `${documentId}:${mapping.fieldName}: ${mapping.inputKey} is absent from the normalized design.`
    );
  }
}
ok(
  ak.ALASKA_ACROFORM_FIELD_INVENTORIES["TF-810"]
    .filter((field) => field.type === "checkbox")
    .every(
      (field) =>
        field.ownership === "manual_participant_completion" &&
        field.inputKey === null
    ),
  "TF-810 ground selection became an inferred eligibility conclusion."
);
ok(
  ak.ALASKA_ACROFORM_FIELD_INVENTORIES["TF-805"].find(
    (field) => field.name === "why"
  )?.inputKey === null,
  "TF-805 Rule 40(b)/(c) selection was inferred from narrative text."
);
note("4. Legal-design boundary: every write comes from an existing normalized participant key; legal-ground, eligibility, signature, service, notary, court, clerk, judge, and agency completion remains manual or blank.");

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const sourceBefore = new Map();
for (const requirement of ak.ALASKA_ACROFORM_SOURCE_REQUIREMENTS) {
  const absolutePath = path.join(
    MATERIALIZATION_ROOT,
    requirement.materializationDestination
  );
  sourceBefore.set(requirement.sourceIdentityKey, {
    sha256: sha256(fs.readFileSync(absolutePath)),
    bytes: fs.statSync(absolutePath).size,
    mode: fs.statSync(absolutePath).mode & 0o777
  });
  const verified = await ak.verifyAlaskaAcroformSource({
    materializationRoot: MATERIALIZATION_ROOT,
    documentId: requirement.documentId
  });
  ok(
    verified.sha256 === requirement.expectedSha256 &&
      verified.bytes.byteLength === requirement.expectedBytes &&
      verified.pageCount === requirement.expectedPageCount &&
      verified.fieldNames.length === requirement.expectedFieldCount,
    `${requirement.documentId}: source verification did not reconcile.`
  );
}

for (const fixture of ak.ALASKA_ACROFORM_TECHNICAL_FIXTURES) {
  const first = await ak.renderAlaskaAcroformTrack({
    materializationRoot: MATERIALIZATION_ROOT,
    trackId: fixture.trackId,
    facts: fixture.facts
  });
  const second = await ak.renderAlaskaAcroformTrack({
    materializationRoot: MATERIALIZATION_ROOT,
    trackId: fixture.trackId,
    facts: fixture.facts
  });
  ok(first.runtimeDisabled === true, `${fixture.fixtureId}: runtime is not disabled.`);
  ok(first.packetReady === false, `${fixture.fixtureId}: packet readiness changed.`);
  ok(first.counselAdopted === false, `${fixture.fixtureId}: counsel adoption became true.`);
  ok(
    first.releaseActive === false,
    `${fixture.fixtureId}: production enablement became true.`
  );
  ok(
    first.technicalFixtureOnly === true,
    `${fixture.fixtureId}: output is not marked technical-fixture-only.`
  );
  sameMembers(
    first.physicalDocuments.map((document) => document.documentId),
    fixture.expectedDocumentIds,
    `${fixture.fixtureId} physical documents`
  );
  ok(
    first.physicalDocuments.reduce(
      (total, document) => total + document.pageCount,
      0
    ) === fixture.expectedPageCount,
    `${fixture.fixtureId}: wrong positive page count.`
  );
  if (fixture.expectedDocumentIds.length === 0) {
    ok(
      first.noFilingRequired === true &&
        first.logicalComponentOrder.length === 0 &&
        first.physicalDocuments.length === 0,
      `${fixture.fixtureId}: no-filing branch generated a component.`
    );
    continue;
  }

  ok(
    first.physicalDocuments.length === second.physicalDocuments.length,
    `${fixture.fixtureId}: repeated render changed document count.`
  );
  for (let index = 0; index < first.physicalDocuments.length; index += 1) {
    const document = first.physicalDocuments[index];
    const repeated = second.physicalDocuments[index];
    ok(
      document.sha256 === repeated.sha256 &&
        Buffer.from(document.bytes).equals(Buffer.from(repeated.bytes)),
      `${fixture.fixtureId}:${document.documentId}: rendering is not deterministic.`
    );
    ok(
      document.sha256 ===
        ak.ALASKA_ACROFORM_EXPECTED_FIXTURE_HASHES[fixture.fixtureId],
      `${fixture.fixtureId}:${document.documentId}: stable fixture hash differs (got ${document.sha256}).`
    );
    const requirement = ak.ALASKA_ACROFORM_SOURCE_REQUIREMENTS.find(
      (candidate) => candidate.documentId === document.documentId
    );
    ok(
      document.sourceSha256 === requirement?.expectedSha256 &&
        document.sourceIdentityKey === requirement?.sourceIdentityKey,
      `${fixture.fixtureId}:${document.documentId}: source identity drifted.`
    );
    ok(
      document.physicalCopyCount === 1,
      `${fixture.fixtureId}:${document.documentId}: generated duplicate physical copies.`
    );
    sameMembers(
      document.logicalComponentIds,
      requirement?.componentIds ?? [],
      `${fixture.fixtureId}:${document.documentId} logical component bindings`
    );
    sameMembers(
      first.logicalComponentOrder,
      requirement?.componentIds ?? [],
      `${fixture.fixtureId} logical component order coverage`
    );

    const fixtureDirectory = path.join(OUT, fixture.fixtureId);
    fs.mkdirSync(fixtureDirectory, { recursive: true });
    const outputPath = path.join(
      fixtureDirectory,
      `${fixture.fixtureId}-${document.documentId}.pdf`
    );
    fs.writeFileSync(outputPath, document.bytes);
    const reopened = await PDFDocument.load(document.bytes, {
      updateMetadata: false
    });
    const expectedValues = expectedMappedValues(fixture, document.documentId);
    const inventory =
      ak.ALASKA_ACROFORM_FIELD_INVENTORIES[document.documentId];
    sameMembers(
      document.mappedFieldNames,
      [...expectedValues.keys()],
      `${fixture.fixtureId}:${document.documentId} mapped fields`
    );
    for (const fieldRecord of inventory) {
      const field = reopened.getForm().getField(fieldRecord.name);
      const expectedValue = expectedValues.get(fieldRecord.name);
      if (expectedValue !== undefined) {
        ok(
          field instanceof PDFTextField &&
            field.getText() === expectedValue,
          `${fixture.fixtureId}:${document.documentId}:${fieldRecord.name}: wrong output value.`
        );
        const appearances = field.acroField
          .getWidgets()
          .map((widget) => widget.getAppearances()?.normal)
          .filter(Boolean);
        ok(
          appearances.length === fieldRecord.widgets.length,
          `${fixture.fixtureId}:${document.documentId}:${fieldRecord.name}: a widget lacks a visible appearance.`
        );
      } else {
        ok(
          fieldBlank(field),
          `${fixture.fixtureId}:${document.documentId}:${fieldRecord.name}: unowned field was written.`
        );
      }
    }

    const extracted = pdfText(outputPath);
    const fixedPhrase =
      document.documentId === "TF-800"
        ? "REQUEST TO MAKE CASE RECORDS CONFIDENTIAL OR SEALED"
        : document.documentId === "TF-805"
          ? "REQUEST TO REMOVE NAME FROM ONLINE PUBLIC INDEX"
          : "REQUEST TO EXCLUDE CASE FROM ONLINE PUBLIC INDEX";
    ok(
      extracted.includes(fixedPhrase),
      `${fixture.fixtureId}:${document.documentId}: official source language is missing.`
    );
    for (const expectedValue of expectedValues.values()) {
      ok(
        extracted.includes(expectedValue),
        `${fixture.fixtureId}:${document.documentId}: mapped value is absent from the rendered text layer.`
      );
    }
    for (let page = 1; page <= document.pageCount; page += 1) {
      ok(
        pageText(outputPath, page).replace(/\s/gu, "").length > 80,
        `${fixture.fixtureId}:${document.documentId}: page ${page} is blank.`
      );
    }
    renderPageImages(
      outputPath,
      path.join(fixtureDirectory, `${document.documentId}-pages`),
      document.pageCount
    );
    rendered.push({
      fixtureId: fixture.fixtureId,
      trackId: fixture.trackId,
      documentId: document.documentId,
      componentIds: document.logicalComponentIds,
      pageCount: document.pageCount,
      sha256: document.sha256,
      mappedFieldNames: document.mappedFieldNames,
      manualFieldCount: document.manualFieldNames.length,
      outputPath: path.relative(ROOT, outputPath)
    });
  }
}

const tf805 = rendered.find((entry) => entry.documentId === "TF-805");
ok(
  tf805?.componentIds.length === 3 &&
    rendered.filter((entry) => entry.documentId === "TF-805").length === 1,
  "TF-805 must be one physical two-page document bound to its three logical component uses."
);
const renderedComponentIds = rendered.flatMap((entry) => entry.componentIds);
sameMembers(
  renderedComponentIds,
  ak.ALASKA_ACROFORM_COMPONENT_IDS,
  "rendered positive component coverage"
);
ok(
  rendered.reduce((total, entry) => total + entry.pageCount, 0) === 6,
  "Expected six rendered pages across the three positive Alaska fixtures."
);
note(`5. Rendering: ${rendered.length} positive packets, 6 pages, exact component coverage, deterministic hashes, visible AcroForm appearances, no blank pages, and TF-805 deduplicated to one physical document.`);

await expectError(
  "missing_required_input",
  () =>
    ak.renderAlaskaAcroformDocument({
      materializationRoot: MATERIALIZATION_ROOT,
      documentId: "TF-800",
      facts: {
        caseNumberAndCourt: "3PA-00-00000CR, Palmer Trial Court",
        recordsToSeal: "Synthetic record"
      }
    }),
  "missing normalized narrative"
);
await expectError(
  "content_overflow",
  () =>
    ak.renderAlaskaAcroformDocument({
      materializationRoot: MATERIALIZATION_ROOT,
      documentId: "TF-805",
      facts: {
        caseNumberAndCourt: "3AN-00-00001CR, Anchorage Trial Court",
        groundsFacts: "Synthetic overflow ".repeat(100)
      }
    }),
  "narrative capacity"
);
await expectError(
  "protected_input",
  () =>
    ak.renderAlaskaAcroformDocument({
      materializationRoot: MATERIALIZATION_ROOT,
      documentId: "TF-810",
      facts: {
        caseNumberAndCourt: "1JU-00-00000CR, Juneau Trial Court",
        signature: "Synthetic Signature"
      }
    }),
  "signature protection"
);
await expectError(
  "invalid_case_number_and_court",
  () =>
    ak.renderAlaskaAcroformDocument({
      materializationRoot: MATERIALIZATION_ROOT,
      documentId: "TF-810",
      facts: { caseNumberAndCourt: "1JU-00-00000CR" }
    }),
  "combined case/court parsing"
);
await expectError(
  "unsupported_track",
  () =>
    ak.renderAlaskaAcroformTrack({
      materializationRoot: MATERIALIZATION_ROOT,
      trackId: "ak-mistaken-identity",
      facts: {}
    }),
  "assignment boundary"
);
note("6. Fail-closed cases: missing input, capacity overflow, protected signature input, malformed combined case/court input, and an unassigned track are refused.");

for (const requirement of ak.ALASKA_ACROFORM_SOURCE_REQUIREMENTS) {
  const absolutePath = path.join(
    MATERIALIZATION_ROOT,
    requirement.materializationDestination
  );
  const before = sourceBefore.get(requirement.sourceIdentityKey);
  const after = {
    sha256: sha256(fs.readFileSync(absolutePath)),
    bytes: fs.statSync(absolutePath).size,
    mode: fs.statSync(absolutePath).mode & 0o777
  };
  ok(
    JSON.stringify(before) === JSON.stringify(after) &&
      after.sha256 === requirement.expectedSha256 &&
      after.bytes === requirement.expectedBytes &&
      after.mode === 0o444,
    `${requirement.documentId}: source bytes or read-only mode changed.`
  );
}
const sharedRegistry = fs.readFileSync(
  path.join(ROOT, SHARED_REGISTRY_PATH),
  "utf8"
);
ok(
  !sharedRegistry.includes("jurisdictions/alaska/acroform"),
  "The Alaska worker implementation was wired into the shared runtime registry."
);
ok(
  ak.ALASKA_ACROFORM_RUNTIME_DISABLED === true &&
    ak.ALASKA_ACROFORM_PACKET_READY === false &&
    ak.ALASKA_ACROFORM_COUNSEL_ADOPTED === false &&
    ak.ALASKA_ACROFORM_RELEASE_ACTIVE === false,
  "A release-state invariant became enabled."
);
note("7. Safety: all three controlling binaries are unchanged and mode 0444; shared runtime registration, packet readiness, counsel adoption, and production enablement remain false.");

if (failures.length > 0) {
  console.error("Alaska AcroForm fill verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Alaska AcroForm fill verification passed.");
for (const check of checks) console.log(check);
for (const entry of rendered) {
  console.log(
    `   ${entry.fixtureId.padEnd(28)} ${entry.documentId.padEnd(6)} ${String(entry.pageCount).padStart(2)}p ${entry.sha256}`
  );
}
console.log(
  `8. Visual evidence: ${pageImages.length} page images rendered under ${path.relative(ROOT, OUT)}; worker inspection is technical evidence only.`
);
