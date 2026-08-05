#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { register } from "node:module";

import {
  PDFButton,
  PDFCheckBox,
  PDFDocument,
  PDFTextField
} from "pdf-lib";

if (process.env.NODE_ENV === "production") {
  console.error(
    "Refusing to run Connecticut AcroForm technical fixtures in production."
  );
  process.exit(1);
}

register("./lib/ts-esm-loader.mjs", import.meta.url);

const ct = await import(
  "@/lib/rcap/packets/jurisdictions/connecticut/acroform"
);

const ROOT = process.cwd();
const MATERIALIZATION_ROOT =
  process.env.RCAP_SOURCE_MATERIALIZATION_ROOT ?? "";
const OUT = path.join(
  ROOT,
  "tmp/packet-output-review/connecticut-acroform"
);
const MARKER_PATH = "tmp/rcap-factory/job.json";
const PROJECTION_PATH =
  "data/record-clearing/production-factory/official-pdf-source-assignment-projection.json";
const RECEIPT_PATH =
  "data/record-clearing/production-factory/source-materialization-receipts/rcap-ct-jd-cr-202-d37887dc0b.json";
const OWNERSHIP_PATH =
  "data/record-clearing/production-factory/official-pdf-families/CT/field-ownership.json";
const SPECIFICATIONS_PATH =
  "data/record-clearing/legal-design-specifications.json";
const SHARED_REGISTRY_PATH = "src/lib/rcap/packets/registry.ts";
const STANDARD_INPUT_REGISTRY_PATH =
  "src/lib/rcap/packets/registry-il-custom-pleading.ts";
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

function fieldBlank(field) {
  if (field instanceof PDFTextField) {
    return (field.getText() ?? "").trim() === "";
  }
  if (field instanceof PDFCheckBox) return !field.isChecked();
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
    `${pdfPath}: expected ${pageCount} page images, got ${images.length}.`
  );
  for (const imagePath of images) {
    const bytes = fs.readFileSync(imagePath);
    ok(
      bytes.byteLength > 5_000,
      `${imagePath}: rendered page image is unexpectedly small.`
    );
    pageImages.push({
      path: path.relative(ROOT, imagePath),
      sha256: sha256(bytes),
      bytes: bytes.byteLength
    });
  }
}

function expectedMappedValues(fixture) {
  const expected = new Map();
  for (const mapping of ct.CONNECTICUT_ACROFORM_TEXT_MAPPINGS) {
    const raw = fixture.facts[mapping.inputKey];
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      continue;
    }
    expected.set(mapping.fieldName, String(raw).trim());
  }
  return expected;
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

ok(Boolean(MATERIALIZATION_ROOT), "RCAP_SOURCE_MATERIALIZATION_ROOT is required.");
ok(
  fs.existsSync(path.join(ROOT, MARKER_PATH)),
  "The worker-local assignment marker is missing."
);
const marker = readJson(MARKER_PATH);
ok(
  marker.jobId === ct.CONNECTICUT_ACROFORM_JOB_ID,
  "The worker marker names another job."
);
ok(
  marker.exactAssignment?.jobId === ct.CONNECTICUT_ACROFORM_JOB_ID,
  "The exact assignment marker names another job."
);
ok(
  marker.exactAssignment?.baseCommit ===
    "ed03a7d77173283e13bd0bf41a3ea15c1bfed89c" &&
    marker.workerBaseCommit ===
      "ed03a7d77173283e13bd0bf41a3ea15c1bfed89c",
  "The worker marker base differs from the factory assignment."
);
ok(
  marker.exactAssignment?.workerBranch ===
    "rcap-factory/rcap-ct-acroform-fill-ab8bfb1f",
  "The generated worker branch differs from the marker."
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
  marker.exactAssignment?.implementationFamilies ?? [],
  ["acroform_fill"],
  "implementation families"
);
sameMembers(
  marker.exactAssignment?.exactTracks ?? [],
  ct.CONNECTICUT_ACROFORM_TRACK_IDS,
  "assigned tracks"
);
sameMembers(
  marker.exactAssignment?.exactComponents ?? [],
  ct.CONNECTICUT_ACROFORM_COMPONENT_IDS,
  "assigned components"
);
sameMembers(
  marker.exactAssignment?.ownedPaths ?? [],
  [
    "scripts/verify-rcap-connecticut-acroform-fill.mjs",
    "src/lib/rcap/packets/jurisdictions/connecticut/acroform.ts"
  ],
  "owned paths"
);
sameMembers(
  marker.exactAssignment?.expectedOutputs ?? [],
  [
    "scripts/verify-rcap-connecticut-acroform-fill.mjs",
    "src/lib/rcap/packets/jurisdictions/connecticut/acroform.ts"
  ],
  "expected outputs"
);
sameMembers(
  marker.exactAssignment?.sourceIdentities?.map(
    (source) => source.sourceIdentityKey
  ) ?? [],
  [ct.CONNECTICUT_ACROFORM_SOURCE_REQUIREMENT.sourceIdentityKey],
  "assigned source identities"
);
ok(
  marker.exactAssignment?.focusedVerifier ===
    "scripts/verify-rcap-connecticut-acroform-fill.mjs",
  "The marker focused verifier differs from this verifier."
);
note(
  "1. Worker marker, base, branch, parent, lane, implementation family, source identity, track, component, owned paths, outputs, and verifier match the exact factory assignment."
);

const projectionBytes = fs.readFileSync(path.join(ROOT, PROJECTION_PATH));
ok(
  sha256(projectionBytes) === marker.exactAssignment?.projectionSha256,
  "The official-PDF assignment projection hash differs from the worker marker."
);
const projection = JSON.parse(projectionBytes.toString("utf8"));
const requirement = ct.CONNECTICUT_ACROFORM_SOURCE_REQUIREMENT;
const projected = projection.identities.find(
  (identity) => identity.identityKey === requirement.sourceIdentityKey
);
ok(Boolean(projected), "The assigned Connecticut identity is absent from the projection.");
ok(
  projected?.assignmentEligible === true &&
    projected?.disposition === "exact_worker_assignable",
  "The assigned Connecticut identity is not exact-worker-assignable."
);
ok(
  projected?.officialDocument?.documentId === requirement.documentId &&
    projected?.officialDocument?.revision === requirement.revision &&
    projected?.officialDocument?.expectedSha256 === requirement.expectedSha256 &&
    projected?.officialDocument?.expectedBytes === requirement.expectedBytes &&
    projected?.officialDocument?.expectedMime === requirement.expectedMediaType &&
    projected?.officialDocument?.pageCount === requirement.expectedPageCount &&
    projected?.officialDocument?.structuralClass === requirement.structuralClass,
  "The projected source metadata differs from the implementation contract."
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
    receipt.assignmentJobId === ct.CONNECTICUT_ACROFORM_JOB_ID &&
    /^[0-9a-f]{40}$/u.test(receipt.assignmentBaseCommit ?? "") &&
    /^[0-9a-f]{64}$/u.test(receipt.assignmentManifestSha256 ?? "") &&
    receipt.jurisdiction === "CT" &&
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
  "The receipt does not bind the exact assigned Connecticut source."
);
ok(
  receipt.receiptSha256 === sha256(Buffer.from(canonicalJson(receiptPayload))),
  "The Connecticut source-materialization receipt envelope hash is invalid."
);
note(
  "2. Projection and receipt bind one exact JD-CR-202 Rev. 11-23 source, with no identity, track, component, path, hash, size, MIME, page-count, or structural broadening."
);

const ownership = readJson(OWNERSHIP_PATH);
const ownershipForm = ownership.forms?.find(
  (form) => form.documentId === requirement.documentId
);
ok(
  ownership.schemaVersion === "rcap-official-pdf-field-ownership/v1" &&
    ownership.jurisdiction === "CT" &&
    ownershipForm?.expectedFieldCount ===
      requirement.expectedCompletionFieldCount,
  "The Connecticut field-ownership scaffold does not carry the assigned 18 completion fields."
);
sameMembers(
  ownership.mappingAllowedFor ?? [],
  ["participant", "system_derived"],
  "mapping-allowed ownership classes"
);
sameMembers(
  ownership.mustRemainBlank ?? [],
  [
    "participant_manual",
    "court",
    "judge",
    "clerk",
    "prosecutor",
    "agency",
    "attorney",
    "notary",
    "process_server",
    "prohibited_from_generation"
  ],
  "must-remain-blank ownership classes"
);

const inventory = ct.CONNECTICUT_ACROFORM_FIELD_INVENTORY;
const completionFields = inventory.filter((field) => field.type !== "button");
const actionFields = inventory.filter((field) => field.type === "button");
const mappedFields = inventory.filter((field) => field.inputKey !== null);
const manualFields = inventory.filter(
  (field) => field.ownership === "manual_participant_completion"
);
const outsideFields = inventory.filter(
  (field) => field.ownership === "outside_party_completion"
);
const courtFields = inventory.filter(
  (field) => field.ownership === "court_or_agency_only"
);
ok(
  inventory.length === requirement.expectedTotalAcroformFieldCount &&
    completionFields.length === requirement.expectedCompletionFieldCount &&
    actionFields.length === requirement.expectedActionButtonCount,
  "The 18 completion fields plus four source action buttons do not reconcile to the 22-field AcroForm inventory."
);
ok(
  new Set(inventory.map((field) => field.name)).size === inventory.length,
  "The Connecticut inventory contains a duplicate field name."
);
sameMembers(
  mappedFields.map((field) => field.name),
  ct.CONNECTICUT_ACROFORM_TEXT_MAPPINGS.map(
    (mapping) => mapping.fieldName
  ),
  "writable field inventory"
);
ok(mappedFields.length === 7, `Expected 7 writable fields, got ${mappedFields.length}.`);
ok(manualFields.length === 4, `Expected 4 manual fields, got ${manualFields.length}.`);
ok(outsideFields.length === 2, `Expected 2 outside-party fields, got ${outsideFields.length}.`);
ok(courtFields.length === 5, `Expected 5 court-only fields, got ${courtFields.length}.`);
ok(actionFields.length === 4, `Expected 4 action buttons, got ${actionFields.length}.`);
for (const field of inventory) {
  ok(field.widgets.length > 0, `${field.name}: missing widget geometry.`);
  ok(
    field.widgets.every(
      (entry) =>
        Number.isInteger(entry.page) &&
        entry.page > 0 &&
        entry.page <= requirement.expectedPageCount &&
        entry.width > 0 &&
        entry.height > 0
    ),
    `${field.name}: invalid page or rectangle.`
  );
}
ok(
  actionFields.every(
    (field) => field.ownership === "not_used_by_assigned_route"
  ),
  "A source print/reset button was treated as participant data."
);
ok(
  ct.CONNECTICUT_ACROFORM_PROTECTED_SURFACES.length === 3,
  "The signature, sworn-administration, and court-order surfaces are not all protected."
);
note(
  "3. Inventory: all 22 AcroForm fields are classified; the scaffold's 18 completion fields reconcile with four non-data print/reset buttons. Seven fields are writable, four manual, two outside-party, five court-only, and four not used."
);

const specifications = readJson(SPECIFICATIONS_PATH);
const specification = specifications.officialFormAssignments.find(
  (entry) =>
    entry.trackId === "ct-cleanslate-petition" &&
    entry.componentId === "ct-cleanslate-petition-primary-filing-1" &&
    entry.officialFormId === "JD-CR-202"
);
ok(Boolean(specification), "The exact Connecticut legal-design assignment is absent.");
sameMembers(
  specification?.generationRequirements?.map((entry) => entry.key) ?? [],
  ct.CONNECTICUT_ACROFORM_NORMALIZED_INPUT_KEYS,
  "normalized Connecticut generation keys"
);
const standardRegistry = fs.readFileSync(
  path.join(ROOT, STANDARD_INPUT_REGISTRY_PATH),
  "utf8"
);
for (const key of ct.CONNECTICUT_ACROFORM_STANDARD_PARTICIPANT_KEYS) {
  ok(
    standardRegistry.includes(`key: "${key}"`),
    `The established packet participant key ${key} is absent from the existing input registry.`
  );
}
for (const mapping of ct.CONNECTICUT_ACROFORM_TEXT_MAPPINGS) {
  ok(
    ct.CONNECTICUT_ACROFORM_NORMALIZED_INPUT_KEYS.includes(mapping.inputKey) ||
      ct.CONNECTICUT_ACROFORM_STANDARD_PARTICIPANT_KEYS.includes(
        mapping.inputKey
      ),
    `${mapping.fieldName}: ${mapping.inputKey} is not an adopted normalized or established participant key.`
  );
}
const crimeField = inventory.find((field) =>
  field.name.endsWith(".CRIMES2ERASE[0]")
);
ok(
  crimeField?.ownership === "manual_participant_completion" &&
    crimeField.inputKey === null,
  "The legal-design manual crimes block became writable."
);
for (const suffix of [
  ".COURTADDRESS[0]",
  ".JDGANUM[0]",
  ".DATESIGN[0]",
  ".DATESIGN[1]",
  ".PRINTNAME[1]",
  ".MODIFIED[0]",
  ".DENIED[0]",
  ".GRANTED[0]",
  ".TOWNJUDGMNT[0]",
  ".DATEJUDGMNT[0]"
]) {
  const field = inventory.find((candidate) => candidate.name.endsWith(suffix));
  ok(
    Boolean(field) && field.inputKey === null,
    `${suffix}: a manual, outside-party, or court field became writable.`
  );
}
ok(
  ct.CONNECTICUT_ACROFORM_TEXT_MAPPINGS.every(
    (mapping) =>
      ![
        "offenseDate",
        "sentencingLocation",
        "offenseSections",
        "offenseClassThenCurrent",
        "mostRecentConvictionDate",
        "countsOnDocket",
        "supervisionComplete",
        "pendingCharges"
      ].includes(mapping.inputKey)
  ),
  "A route-selection or sworn legal-design answer became a generated assertion."
);
note(
  "4. Legal-design boundary: docket data and established participant profile/contact values are the only inputs written. Crime selection, venue identifiers, eligibility assertions, execution, notarization, and the court order remain manual or blank."
);

const sourcePath = path.join(
  MATERIALIZATION_ROOT,
  requirement.materializationDestination
);
const sourceBefore = {
  sha256: sha256(fs.readFileSync(sourcePath)),
  bytes: fs.statSync(sourcePath).size,
  mode: fs.statSync(sourcePath).mode & 0o777
};
const verified = await ct.verifyConnecticutAcroformSource({
  materializationRoot: MATERIALIZATION_ROOT
});
ok(
  verified.sha256 === requirement.expectedSha256 &&
    verified.bytes.byteLength === requirement.expectedBytes &&
    verified.pageCount === requirement.expectedPageCount &&
    verified.fieldNames.length ===
      requirement.expectedTotalAcroformFieldCount,
  "The implementation source verification did not reconcile."
);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const fixture of ct.CONNECTICUT_ACROFORM_TECHNICAL_FIXTURES) {
  const first = await ct.renderConnecticutAcroformTrack({
    materializationRoot: MATERIALIZATION_ROOT,
    trackId: fixture.trackId,
    facts: fixture.facts
  });
  const second = await ct.renderConnecticutAcroformTrack({
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
    ct.CONNECTICUT_ACROFORM_COMPONENT_IDS,
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
      ct.CONNECTICUT_ACROFORM_EXPECTED_FIXTURE_HASHES[fixture.fixtureId],
    `${fixture.fixtureId}: stable fixture hash differs (got ${document.sha256}).`
  );
  ok(
    document.sourceIdentityKey === requirement.sourceIdentityKey &&
      document.sourceSha256 === requirement.expectedSha256,
    `${fixture.fixtureId}: source identity drifted.`
  );
  ok(
    document.pageCount === 2 && document.physicalCopyCount === 1,
    `${fixture.fixtureId}: page or physical-copy count changed.`
  );
  sameMembers(
    document.logicalComponentIds,
    requirement.componentIds,
    `${fixture.fixtureId} logical component binding`
  );

  const fixtureDirectory = path.join(OUT, fixture.fixtureId);
  fs.mkdirSync(fixtureDirectory, { recursive: true });
  const outputPath = path.join(
    fixtureDirectory,
    `${fixture.fixtureId}-JD-CR-202.pdf`
  );
  fs.writeFileSync(outputPath, document.bytes);
  const reopened = await PDFDocument.load(document.bytes, {
    updateMetadata: false
  });
  ok(
    reopened.getPageCount() === 2 &&
      reopened.getPages().every(
        (page) =>
          page.getWidth() === 612 &&
          page.getHeight() === 792 &&
          page.getRotation().angle === 0
      ),
    `${fixture.fixtureId}: page geometry changed.`
  );
  const expectedValues = expectedMappedValues(fixture);
  sameMembers(
    document.mappedFieldNames,
    [...expectedValues.keys()],
    `${fixture.fixtureId} mapped fields`
  );
  for (const fieldRecord of inventory) {
    const field = reopened.getForm().getField(fieldRecord.name);
    if (fieldRecord.type === "button") {
      ok(
        field instanceof PDFButton,
        `${fixture.fixtureId}:${fieldRecord.name}: action button changed type.`
      );
      continue;
    }
    const expectedValue = expectedValues.get(fieldRecord.name);
    if (expectedValue !== undefined) {
      ok(
        field instanceof PDFTextField && field.getText() === expectedValue,
        `${fixture.fixtureId}:${fieldRecord.name}: wrong output value.`
      );
      const appearances = field.acroField
        .getWidgets()
        .map((entry) => entry.getAppearances()?.normal)
        .filter(Boolean);
      ok(
        appearances.length === fieldRecord.widgets.length,
        `${fixture.fixtureId}:${fieldRecord.name}: a widget lacks a visible appearance.`
      );
    } else {
      ok(
        fieldBlank(field),
        `${fixture.fixtureId}:${fieldRecord.name}: an unowned field was written.`
      );
    }
  }

  const extracted = pdfText(outputPath);
  ok(
    extracted.includes("PETITION FOR CLEAN SLATE ERASURE") &&
      extracted.includes("Order of the Court") &&
      extracted.includes("Where to file petition"),
    `${fixture.fixtureId}: official Connecticut form language is missing.`
  );
  for (const expectedValue of new Set(expectedValues.values())) {
    ok(
      extracted.includes(expectedValue),
      `${fixture.fixtureId}: ${expectedValue} is absent from the rendered text layer.`
    );
  }
  for (const ignoredValue of [
    fixture.facts.offenseSections,
    fixture.facts.offenseClassThenCurrent,
    fixture.facts.countsOnDocket
  ]) {
    ok(
      !extracted.includes(String(ignoredValue)),
      `${fixture.fixtureId}: a manual legal-design answer was written into the form.`
    );
  }
  for (let page = 1; page <= document.pageCount; page += 1) {
    ok(
      pageText(outputPath, page).replace(/\s/gu, "").length > 80,
      `${fixture.fixtureId}: page ${page} is blank.`
    );
  }
  renderPageImages(
    outputPath,
    path.join(fixtureDirectory, "pages"),
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
    protectedFieldCount: document.protectedFieldNames.length,
    outputPath: path.relative(ROOT, outputPath)
  });
}

sameMembers(
  [...new Set(rendered.flatMap((entry) => entry.componentIds))],
  ct.CONNECTICUT_ACROFORM_COMPONENT_IDS,
  "rendered component coverage"
);
sameMembers(
  [...new Set(rendered.map((entry) => entry.trackId))],
  ct.CONNECTICUT_ACROFORM_TRACK_IDS,
  "rendered track coverage"
);
ok(
  rendered.length === 2 &&
    rendered.reduce((total, entry) => total + entry.pageCount, 0) === 4,
  "Expected two deterministic Connecticut packets and four rendered pages."
);
note(
  "5. Rendering: two deterministic technical packets exercise the assigned track and optional-contact branch; each has one exact component, two positive pages, visible AcroForm appearances, stable hashes, and no extra component."
);

await expectError(
  "missing_required_input",
  () =>
    ct.renderConnecticutAcroformDocument({
      materializationRoot: MATERIALIZATION_ROOT,
      facts: {
        docketNumber: "H14H-CR98-0012345-S",
        dateOfBirth: "02/03/1980",
        mailingAddress: "44 Sample Street, Hartford, CT 06103"
      }
    }),
  "missing established participant name"
);
await expectError(
  "content_overflow",
  () =>
    ct.renderConnecticutAcroformDocument({
      materializationRoot: MATERIALIZATION_ROOT,
      facts: {
        petitionerName: "Jordan Example",
        docketNumber: "SYNTHETIC-DOCKET-".repeat(30),
        dateOfBirth: "02/03/1980",
        mailingAddress: "44 Sample Street, Hartford, CT 06103"
      }
    }),
  "single-line source capacity"
);
await expectError(
  "protected_input",
  () =>
    ct.renderConnecticutAcroformDocument({
      materializationRoot: MATERIALIZATION_ROOT,
      facts: {
        petitionerName: "Jordan Example",
        docketNumber: "H14H-CR98-0012345-S",
        dateOfBirth: "02/03/1980",
        mailingAddress: "44 Sample Street, Hartford, CT 06103",
        signature: "Synthetic Signature"
      }
    }),
  "signature protection"
);
await expectError(
  "unsupported_track",
  () =>
    ct.renderConnecticutAcroformTrack({
      materializationRoot: MATERIALIZATION_ROOT,
      trackId: "ct-cleanslate-automatic",
      facts: {}
    }),
  "assignment boundary"
);
note(
  "6. Fail-closed cases: missing required participant input, source-field overflow, protected execution input, and an unassigned track are refused; no unapproved continuation or font shrinking is used."
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
  "The controlling Connecticut source bytes or read-only mode changed."
);
const trackedSources = spawnSync(
  "git",
  ["ls-files", "--", "official-pdf/CT/*.pdf"],
  { cwd: ROOT, encoding: "utf8" }
);
ok(
  trackedSources.status === 0 && trackedSources.stdout.trim() === "",
  "An official or generated PDF entered Git."
);
const sharedRegistry = fs.readFileSync(
  path.join(ROOT, SHARED_REGISTRY_PATH),
  "utf8"
);
ok(
  !sharedRegistry.includes("jurisdictions/connecticut/acroform"),
  "The Connecticut worker implementation was wired into the shared runtime registry."
);
ok(
  ct.CONNECTICUT_ACROFORM_RUNTIME_DISABLED === true &&
    ct.CONNECTICUT_ACROFORM_REVIEW_READY === false &&
    ct.CONNECTICUT_ACROFORM_COUNSEL_ADOPTED === false &&
    ct.CONNECTICUT_ACROFORM_RELEASE_ACTIVE === false,
  "A release-state invariant changed."
);
note(
  "7. Safety: the receipt-bound source is unchanged and mode 0444; no PDF is tracked; shared runtime registration, packet readiness, counsel adoption, and release activation remain false."
);

if (failures.length > 0) {
  console.error("Connecticut AcroForm fill verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Connecticut AcroForm fill verification passed.");
for (const check of checks) console.log(check);
for (const entry of rendered) {
  console.log(
    `   ${entry.fixtureId.padEnd(48)} ${entry.documentId} ${entry.pageCount}p ${entry.sha256}`
  );
}
console.log(
  `8. Visual evidence: ${pageImages.length} page images rendered under ${path.relative(ROOT, OUT)}; worker inspection is technical evidence only.`
);
