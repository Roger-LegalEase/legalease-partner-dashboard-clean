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
  PDFDropdown,
  PDFName,
  PDFTextField
} from "pdf-lib";

if (process.env.NODE_ENV === "production") {
  console.error(
    "Refusing to run New Jersey AcroForm technical fixtures in production."
  );
  process.exit(1);
}

register("./lib/ts-esm-loader.mjs", import.meta.url);

const nj = await import("@/lib/rcap/packets/jurisdictions/new-jersey/acroform");

const ROOT = process.cwd();
const MATERIALIZATION_ROOT = process.env.RCAP_SOURCE_MATERIALIZATION_ROOT ?? "";
const OUT = path.join(ROOT, "tmp/packet-output-review/new-jersey-acroform");
const MARKER_PATH = "tmp/rcap-factory/job.json";
const PROJECTION_PATH =
  "data/record-clearing/production-factory/official-pdf-source-assignment-projection.json";
const RECEIPT_PATH =
  "data/record-clearing/production-factory/source-materialization-receipts/rcap-nj-cn-10557-814e1397cd.json";
const TRACK_REGISTRY_PATH =
  "data/record-clearing/legal-design-track-registry.json";
const PACKET_MANIFEST_PATH =
  "data/record-clearing/legal-design-packet-set-manifests.json";
const SHARED_REGISTRY_PATH = "src/lib/rcap/packets/registry.ts";

const JOB_ID = "rcap-nj-acroform-fill";
const CANONICAL_PARENT = "NEW-03-acroform-families";

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

function materializedSourcePath(destination) {
  const root = path.resolve(MATERIALIZATION_ROOT);
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

function fieldBlank(field) {
  if (field instanceof PDFTextField) return (field.getText() ?? "") === "";
  if (field instanceof PDFCheckBox) return !field.isChecked();
  if (field instanceof PDFDropdown) {
    const authored =
      nj.NEW_JERSEY_ACROFORM_AUTHORED_DROPDOWN_SELECTIONS[field.getName()];
    const selected = field.getSelected();
    if (authored === undefined) return selected.length === 0;
    return selected.length === 1 && selected[0] === authored;
  }
  return true;
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

// 1. Assignment marker -------------------------------------------------------

ok(Boolean(MATERIALIZATION_ROOT), "RCAP_SOURCE_MATERIALIZATION_ROOT is required.");
const marker = fs.existsSync(path.join(ROOT, MARKER_PATH))
  ? readJson(MARKER_PATH)
  : null;
ok(
  integrationValidation || marker !== null,
  "The worker-local assignment marker is missing."
);
if (marker) {
  ok(marker.jobId === JOB_ID, "The worker marker names another job.");
  ok(
    marker.exactAssignment?.jobId === JOB_ID,
    "The exact assignment marker names another job."
  );
  ok(
    marker.exactAssignment?.runtimeDisabledInvariant === true,
    "The marker lost the runtime-disabled invariant."
  );
  ok(
    marker.exactAssignment?.canonicalParent === CANONICAL_PARENT,
    "The marker canonical parent differs from the factory plan."
  );
  ok(
    marker.exactAssignment?.workerMayAcquireOrMaterializeSources !== true,
    "The marker permits source acquisition."
  );
  sameMembers(
    (marker.exactAssignment?.sourceIdentities ?? []).map(
      (entry) => entry.sourceIdentityKey
    ),
    [nj.NEW_JERSEY_ACROFORM_SOURCE_REQUIREMENT.sourceIdentityKey],
    "Marker source identities"
  );
  sameMembers(
    marker.exactAssignment?.exactTracks ?? [],
    nj.NEW_JERSEY_ACROFORM_TRACK_IDS,
    "Marker tracks"
  );
  sameMembers(
    marker.exactAssignment?.exactComponents ?? [],
    nj.NEW_JERSEY_ACROFORM_COMPONENT_IDS,
    "Marker components"
  );
  ok(
    JSON.stringify(marker.ownedPaths ?? []) ===
      JSON.stringify([
        "scripts/verify-rcap-new-jersey-acroform-fill.mjs",
        "src/lib/rcap/packets/jurisdictions/new-jersey/acroform.ts"
      ]),
    "The marker owned paths differ from this implementation."
  );
}

const projectionBytes = fs.readFileSync(path.join(ROOT, PROJECTION_PATH));
ok(
  integrationValidation ||
    sha256(projectionBytes) === marker?.exactAssignment?.projectionSha256,
  "The official-PDF assignment projection hash differs from the worker marker."
);
note(
  `1. Assignment: ${JOB_ID} under ${CANONICAL_PARENT}; ${nj.NEW_JERSEY_ACROFORM_TRACK_IDS.length} exact tracks and ${nj.NEW_JERSEY_ACROFORM_COMPONENT_IDS.length} exact components are pinned to one source identity.`
);

// 2. Source identity, receipt and projection ---------------------------------

const requirement = nj.NEW_JERSEY_ACROFORM_SOURCE_REQUIREMENT;
const receipt = readJson(RECEIPT_PATH);
const projection = JSON.parse(projectionBytes.toString("utf8"));
const projected = projection.identities.find(
  (identity) => identity.identityKey === requirement.sourceIdentityKey
);

ok(Boolean(projected), "The New Jersey identity is absent from the projection.");
ok(
  projected?.assignmentEligible === true &&
    projected?.disposition === "exact_worker_assignable",
  "The New Jersey identity is not exact-worker-assignable in the projection."
);
ok(
  (projected?.assignmentBlockers ?? []).every(
    (blocker) => blocker === "exact_source_archive_not_materialized"
  ),
  `The New Jersey identity carries a non-materialization blocker: ${JSON.stringify(projected?.assignmentBlockers)}.`
);
ok(
  projected?.officialDocument?.documentId === requirement.documentId &&
    projected?.officialDocument?.documentRole === requirement.documentRole &&
    projected?.officialDocument?.revision === requirement.revision &&
    projected?.officialDocument?.officialTitle === requirement.officialTitle &&
    projected?.officialDocument?.pageCount === requirement.expectedPageCount &&
    projected?.officialDocument?.structuralClass === requirement.structuralClass,
  "The projected official document identity differs from this implementation."
);
ok(
  projected?.exactSourceContract?.expectedSha256 === requirement.expectedSha256 &&
    projected?.exactSourceContract?.expectedBytes === requirement.expectedBytes &&
    projected?.exactSourceContract?.expectedMime ===
      requirement.expectedMediaType &&
    projected?.exactSourceContract?.materializationDestination ===
      requirement.materializationDestination,
  "The projected exact source contract differs from this implementation."
);
sameMembers(
  projected?.trackIds ?? [],
  nj.NEW_JERSEY_ACROFORM_TRACK_IDS,
  "Projected tracks"
);
sameMembers(
  projected?.componentIds ?? [],
  nj.NEW_JERSEY_ACROFORM_COMPONENT_IDS,
  "Projected components"
);
ok(
  projected?.grantsPacketReady === false &&
    projected?.grantsCounselAdoption === false &&
    projected?.grantsVisualApproval === false &&
    projected?.grantsLegalOutputApproval === false &&
    projected?.grantsRuntimeEnablement === false &&
    projected?.grantsSourceApproval === false,
  "The projected identity grants a review or runtime state."
);

ok(
  receipt.ready === true &&
    receipt.workerReady === true &&
    receipt.state === "worker_ready" &&
    receipt.hashAndMediaVerified === true,
  "The New Jersey source receipt is not worker-ready."
);
ok(
  receipt.documentId === requirement.documentId &&
    receipt.documentRole === requirement.documentRole &&
    receipt.expectedSha256 === requirement.expectedSha256 &&
    receipt.actualSha256 === requirement.expectedSha256 &&
    receipt.expectedBytes === requirement.expectedBytes &&
    receipt.actualBytes === requirement.expectedBytes &&
    receipt.expectedMediaType === requirement.expectedMediaType &&
    receipt.materializationDestination === requirement.materializationDestination,
  "The New Jersey source receipt identity differs from this implementation."
);
ok(
  receipt.sourceStructure?.pageCount === requirement.expectedPageCount &&
    receipt.sourceStructure?.encrypted === requirement.encrypted &&
    receipt.sourceStructure?.xfa === requirement.xfa &&
    receipt.sourceStructure?.acroFormPresent === true &&
    receipt.sourceStructure?.acroFormFieldCount ===
      requirement.expectedTotalAcroformFieldCount &&
    receipt.sourceStructure?.structuralClass === requirement.structuralClass,
  "The receipt structural record differs from this implementation."
);
ok(
  receipt.readOnlyTreatment === "worker_read_only_no_modify" &&
    receipt.provenance?.privateCorpusUsed === false &&
    receipt.provenance?.runtimeStatus === "runtime_disabled",
  "The receipt read-only or provenance treatment changed."
);
sameMembers(
  (receipt.usageBindings ?? []).map((entry) => entry.componentId),
  nj.NEW_JERSEY_ACROFORM_COMPONENT_IDS,
  "Receipt usage bindings"
);
note(
  `2. Source: ${requirement.documentId} ${requirement.revision} (${requirement.documentRole}), ${requirement.expectedBytes} bytes, sha256 ${requirement.expectedSha256}, ${requirement.expectedPageCount} pages, ${requirement.expectedTotalAcroformFieldCount} AcroForm fields, not encrypted, no XFA.`
);

// 3. Legal design coverage ---------------------------------------------------

const registry = readJson(TRACK_REGISTRY_PATH);
const registryTracks = (registry.tracks ?? []).filter(
  (track) => track.jurisdiction === "NJ" && track.outputStrategy === "official_pdf_fill"
);
sameMembers(
  registryTracks.map((track) => track.trackId),
  nj.NEW_JERSEY_ACROFORM_TRACK_IDS,
  "Normalized official_pdf_fill tracks"
);
const packetSets = readJson(PACKET_MANIFEST_PATH).packetSets.filter(
  (entry) => entry.jurisdiction === "NJ"
);
for (const trackId of nj.NEW_JERSEY_ACROFORM_TRACK_IDS) {
  const set = packetSets.find((entry) => entry.trackId === trackId);
  ok(Boolean(set), `${trackId} has no packet-set manifest.`);
  const officialComponents = (set?.components ?? []).filter(
    (component) => component.outputStrategy === "official_pdf_fill"
  );
  ok(
    officialComponents.every(
      (component) => component.officialFormId === requirement.documentId
    ),
    `${trackId} binds an official component to a document other than ${requirement.documentId}.`
  );
  sameMembers(
    officialComponents
      .sort((left, right) => left.order - right.order)
      .map((component) => component.componentId),
    nj.NEW_JERSEY_ACROFORM_COMPONENT_IDS_BY_TRACK[trackId],
    `${trackId} official components`
  );
  ok(
    JSON.stringify(
      officialComponents
        .sort((left, right) => left.order - right.order)
        .map((component) => component.role)
    ) === JSON.stringify(nj.NEW_JERSEY_ACROFORM_COMPONENT_ROLE_ORDER),
    `${trackId} official component roles or order differ from the manifest.`
  );
  ok(
    officialComponents.every((component) => component.conditionDescription === null),
    `${trackId} carries a conditional official component this implementation does not model.`
  );
}
note(
  `3. Packet: the manifest directs no extraction and no reordering, so the ${requirement.expectedPageCount}-page kit is preserved whole and the four component roles (${nj.NEW_JERSEY_ACROFORM_COMPONENT_ROLE_ORDER.join(", ")}) map onto one physical document per track.`
);

// 4. Field inventory and ownership -------------------------------------------

const sourcePath = materializedSourcePath(requirement.materializationDestination);
const sourceBefore = {
  sha256: sha256(fs.readFileSync(sourcePath)),
  bytes: fs.statSync(sourcePath).size,
  mode: fs.statSync(sourcePath).mode & 0o777
};
ok(
  sourceBefore.sha256 === requirement.expectedSha256 &&
    sourceBefore.bytes === requirement.expectedBytes &&
    sourceBefore.mode === 0o444,
  "The controlling New Jersey source does not match its receipt before rendering."
);

const inventory = nj.NEW_JERSEY_ACROFORM_FIELD_INVENTORY;
ok(
  inventory.length === requirement.expectedTotalAcroformFieldCount,
  `The declared inventory holds ${inventory.length} fields, not ${requirement.expectedTotalAcroformFieldCount}.`
);
ok(
  new Set(inventory.map((entry) => entry.name)).size === inventory.length,
  "The declared inventory repeats a field name."
);

const OWNERSHIP_CLASSES = [
  "participant_supplied",
  "derived_deterministically_from_participant_answers",
  "manual_participant_completion",
  "outside_party_completion",
  "court_or_agency_only",
  "prohibited_from_generation",
  "intentionally_blank",
  "not_used_by_assigned_route"
];
const byOwnership = {};
for (const entry of inventory) {
  ok(
    OWNERSHIP_CLASSES.includes(entry.ownership),
    `${entry.name} carries an unknown ownership class.`
  );
  ok(
    typeof entry.treatment === "string" && entry.treatment.length > 20,
    `${entry.name} has no recorded treatment.`
  );
  byOwnership[entry.ownership] = (byOwnership[entry.ownership] ?? 0) + 1;
}
const mappedNames = nj.NEW_JERSEY_ACROFORM_TEXT_MAPPINGS.map(
  (mapping) => mapping.fieldName
);
ok(
  new Set(mappedNames).size === mappedNames.length,
  "A field is mapped more than once."
);
for (const entry of inventory) {
  const isMapped = mappedNames.includes(entry.name);
  const writable =
    entry.ownership === "participant_supplied" ||
    entry.ownership === "derived_deterministically_from_participant_answers";
  ok(
    isMapped === writable,
    `${entry.name} ownership ${entry.ownership} disagrees with its mapping state.`
  );
  ok(
    isMapped ? entry.inputKey !== null : entry.inputKey === null,
    `${entry.name} input key disagrees with its mapping state.`
  );
  ok(
    entry.type !== "button" || entry.ownership === "not_used_by_assigned_route",
    `${entry.name} is an action button with a participant ownership class.`
  );
}
const buttons = inventory.filter((entry) => entry.type === "button");
ok(
  buttons.length === requirement.expectedActionButtonCount,
  `The kit exposes ${buttons.length} action buttons, not ${requirement.expectedActionButtonCount}.`
);
ok(
  inventory.length - buttons.length === requirement.expectedCompletionFieldCount,
  "The completion-field count differs from the declared requirement."
);
for (const ambiguous of nj.NEW_JERSEY_ACROFORM_AMBIGUOUS_FIELD_NAMES) {
  const entry = inventory.find((candidate) => candidate.name === ambiguous.name);
  ok(Boolean(entry), `${ambiguous.name} is absent from the inventory.`);
  ok(
    !mappedNames.includes(ambiguous.name),
    `${ambiguous.name} carries semantically distinct blanks and must never be written.`
  );
  ok(
    ambiguous.resolution === "never_written",
    `${ambiguous.name} declares a resolution other than never_written.`
  );
  ok(
    entry?.widgets.length === ambiguous.widgetCount,
    `${ambiguous.name} widget count differs from its recorded collision.`
  );
}
note(
  `4. Field inventory: ${inventory.length} of ${requirement.expectedTotalAcroformFieldCount} fields classified exactly once — ${byOwnership.participant_supplied} participant supplied, ${byOwnership.derived_deterministically_from_participant_answers} deterministic, ${byOwnership.manual_participant_completion} manual participant completion, ${byOwnership.outside_party_completion} outside-party completion, ${byOwnership.court_or_agency_only} court or agency only, ${byOwnership.prohibited_from_generation} prohibited, ${byOwnership.not_used_by_assigned_route} unused or action button. ${nj.NEW_JERSEY_ACROFORM_AMBIGUOUS_FIELD_NAMES.length} reused or misspelled source names are recorded and never written; the source PDF is never renamed.`
);

// 5. Deterministic fixtures --------------------------------------------------

fs.mkdirSync(OUT, { recursive: true });
const expectedHashes = nj.NEW_JERSEY_ACROFORM_EXPECTED_FIXTURE_HASHES;
sameMembers(
  Object.keys(expectedHashes),
  nj.NEW_JERSEY_ACROFORM_TECHNICAL_FIXTURES.map((fixture) => fixture.fixtureId),
  "Expected fixture hashes"
);
sameMembers(
  new Set(
    nj.NEW_JERSEY_ACROFORM_TECHNICAL_FIXTURES.map((fixture) => fixture.trackId)
  ),
  nj.NEW_JERSEY_ACROFORM_TRACK_IDS,
  "Fixture track coverage"
);

const protectedNamesByFixture = new Map();
for (const fixture of nj.NEW_JERSEY_ACROFORM_TECHNICAL_FIXTURES) {
  const result = await nj.renderNewJerseyAcroformTrack({
    materializationRoot: MATERIALIZATION_ROOT,
    trackId: fixture.trackId,
    facts: fixture.facts
  });
  ok(
    result.runtimeDisabled === true &&
      result.packetReady === false &&
      result.counselAdopted === false &&
      result.releaseActive === false &&
      result.technicalFixtureOnly === true,
    `${fixture.fixtureId} returned a release state.`
  );
  ok(
    result.physicalDocuments.length === 1,
    `${fixture.fixtureId} produced more than one physical document.`
  );
  ok(
    JSON.stringify(result.logicalComponentOrder) ===
      JSON.stringify(nj.NEW_JERSEY_ACROFORM_COMPONENT_IDS_BY_TRACK[fixture.trackId]),
    `${fixture.fixtureId} logical component order differs from the manifest.`
  );

  const document = result.physicalDocuments[0];
  ok(
    document.sha256 === expectedHashes[fixture.fixtureId],
    `${fixture.fixtureId} is not deterministic: expected ${expectedHashes[fixture.fixtureId]}, got ${document.sha256}.`
  );
  ok(
    document.pageCount === requirement.expectedPageCount,
    `${fixture.fixtureId} rendered ${document.pageCount} pages, not ${requirement.expectedPageCount}.`
  );
  ok(
    document.sourceSha256 === requirement.expectedSha256,
    `${fixture.fixtureId} did not render from the receipt-bound source.`
  );

  const reopened = await PDFDocument.load(document.bytes, {
    updateMetadata: false
  });
  ok(
    reopened.getPageCount() === requirement.expectedPageCount,
    `${fixture.fixtureId} lost a page on reload.`
  );
  for (let index = 0; index < reopened.getPageCount(); index += 1) {
    const page = reopened.getPage(index);
    const media = page.getMediaBox();
    ok(
      Math.abs(media.width - 612) < 0.02 &&
        Math.abs(media.height - 792) < 0.02 &&
        page.getRotation().angle === 0,
      `${fixture.fixtureId} page ${index + 1} changed size or rotation.`
    );
  }
  const form = reopened.getForm();
  ok(
    form.getFields().length === requirement.expectedTotalAcroformFieldCount,
    `${fixture.fixtureId} changed the AcroForm field count.`
  );
  ok(!form.hasXFA(), `${fixture.fixtureId} introduced XFA.`);

  const written = [];
  for (const entry of inventory) {
    const field = form.getField(entry.name);
    if (field instanceof PDFButton) continue;
    if (mappedNames.includes(entry.name)) {
      if (!fieldBlank(field)) written.push(entry.name);
      continue;
    }
    ok(
      fieldBlank(field),
      `${fixture.fixtureId}: ${entry.name} (${entry.ownership}) is not blank.`
    );
  }
  sameMembers(
    document.mappedFieldNames,
    written,
    `${fixture.fixtureId} written fields`
  );
  ok(
    document.mappedFieldNames.every((name) => mappedNames.includes(name)),
    `${fixture.fixtureId} wrote a field outside the approved mapping.`
  );
  ok(
    document.protectedFieldNames.length ===
      requirement.expectedCompletionFieldCount - document.mappedFieldNames.length,
    `${fixture.fixtureId} protected-field count does not reconcile.`
  );
  protectedNamesByFixture.set(fixture.fixtureId, document.protectedFieldNames);

  /**
   * The kit authors a 14pt widget-level default on several widgets of the
   * shared caption fields. A widget default overrides the field default, so a
   * value sized for the narrowest widget would still be drawn at 14pt there
   * and clipped. Every widget of every written field must therefore resolve to
   * the one size the renderer chose from that field's narrowest box.
   */
  const fontSizeOf = (appearance) =>
    Number(/\/[^\s]+\s+([\d.]+)\s+Tf/u.exec(appearance ?? "")?.[1]);
  for (const name of document.mappedFieldNames) {
    const field = form.getField(name);
    const entry = inventory.find((candidate) => candidate.name === name);
    const fieldSize = fontSizeOf(field.acroField.getDefaultAppearance());
    ok(
      Number.isFinite(fieldSize) && fieldSize > 0 && fieldSize <= 9,
      `${fixture.fixtureId}: ${name} has no resolved font size at or below the first ladder size.`
    );
    for (const widget of field.acroField.getWidgets()) {
      const widgetAppearance = widget.dict.get(PDFName.of("DA"));
      if (widgetAppearance === undefined) continue;
      ok(
        fontSizeOf(widgetAppearance.toString()) === fieldSize,
        `${fixture.fixtureId}: ${name} kept a widget-level font size that overrides the resolved size.`
      );
    }
    const narrowest = Math.min(...entry.widgets.map((entryWidget) => entryWidget.width));
    const value = fixture.facts[
      nj.NEW_JERSEY_ACROFORM_TEXT_MAPPINGS.find(
        (mapping) => mapping.fieldName === name
      ).inputKey
    ];
    ok(
      narrowest > 0,
      `${fixture.fixtureId}: ${name} has no measurable widget.`
    );
    ok(
      value === undefined || String(field.getText() ?? "").length > 0,
      `${fixture.fixtureId}: ${name} was mapped but rendered empty.`
    );
  }

  const file = path.join(OUT, `${fixture.fixtureId}.pdf`);
  fs.writeFileSync(file, document.bytes);
  rendered.push({
    fixtureId: fixture.fixtureId,
    trackId: fixture.trackId,
    pageCount: document.pageCount,
    mapped: document.mappedFieldNames.length,
    sha256: document.sha256
  });
}
note(
  `5. Fixtures: ${rendered.length} deterministic synthetic packets across all ${nj.NEW_JERSEY_ACROFORM_TRACK_IDS.length} assigned tracks, covering both conditional participant values and a long name that is placed only after deterministic font reduction. No fixture carries real participant information.`
);

// 6. Visual evidence ---------------------------------------------------------

const rasterise = spawnSync("pdftoppm", ["-v"], { encoding: "utf8" });
const canRasterise = rasterise.status === 0 || rasterise.stderr?.includes("pdftoppm");
if (canRasterise) {
  const pngDir = path.join(OUT, "png");
  fs.rmSync(pngDir, { recursive: true, force: true });
  fs.mkdirSync(pngDir, { recursive: true });
  const sourceRender = spawnSync(
    "pdftoppm",
    ["-r", "100", "-png", sourcePath, path.join(pngDir, "source")],
    { encoding: "utf8" }
  );
  ok(sourceRender.status === 0, "The controlling source could not be rasterised.");
  const sourcePages = new Map();
  for (let page = 1; page <= requirement.expectedPageCount; page += 1) {
    const file = path.join(pngDir, `source-${String(page).padStart(2, "0")}.png`);
    ok(fs.existsSync(file), `Source page ${page} did not rasterise.`);
    if (fs.existsSync(file)) {
      sourcePages.set(page, sha256(fs.readFileSync(file)));
      pageImages.push(file);
    }
  }
  const mappedPages = new Set(
    inventory
      .filter((entry) => mappedNames.includes(entry.name))
      .flatMap((entry) => entry.widgets.map((widget) => widget.page))
  );
  for (const entry of rendered) {
    const render = spawnSync(
      "pdftoppm",
      [
        "-r",
        "100",
        "-png",
        path.join(OUT, `${entry.fixtureId}.pdf`),
        path.join(pngDir, entry.fixtureId)
      ],
      { encoding: "utf8" }
    );
    ok(render.status === 0, `${entry.fixtureId} could not be rasterised.`);
    const seen = new Map();
    for (let page = 1; page <= requirement.expectedPageCount; page += 1) {
      const file = path.join(
        pngDir,
        `${entry.fixtureId}-${String(page).padStart(2, "0")}.png`
      );
      ok(fs.existsSync(file), `${entry.fixtureId} page ${page} did not rasterise.`);
      if (!fs.existsSync(file)) continue;
      pageImages.push(file);
      const bytes = fs.readFileSync(file);
      ok(bytes.length > 2000, `${entry.fixtureId} page ${page} rendered blank.`);
      const digest = sha256(bytes);
      ok(
        !seen.has(digest),
        `${entry.fixtureId} page ${page} duplicates page ${seen.get(digest)}.`
      );
      seen.set(digest, page);
      const changed = digest !== sourcePages.get(page);
      ok(
        changed === mappedPages.has(page),
        changed
          ? `${entry.fixtureId} page ${page} differs from the official source but carries no mapped widget.`
          : `${entry.fixtureId} page ${page} carries a mapped widget but is unchanged.`
      );
    }
  }
  note(
    `6. Visual evidence: every page of every fixture was rasterised and compared with the official source. Exactly the ${mappedPages.size} pages carrying a mapped widget differ; the remaining ${requirement.expectedPageCount - mappedPages.size} pages, including all ${nj.NEW_JERSEY_ACROFORM_INSTRUCTION_PAGES.length} instruction pages, are pixel-identical to the kit. No page is blank and no page is duplicated.`
  );
} else {
  note(
    "6. Visual evidence: pdftoppm is unavailable in this environment, so page rasterisation was skipped."
  );
}

// 7. Fail-closed behaviour ---------------------------------------------------

const baseFacts = nj.NEW_JERSEY_ACROFORM_TECHNICAL_FIXTURES[0].facts;

await expectError(
  "missing_required_input",
  () =>
    nj.renderNewJerseyAcroformTrack({
      materializationRoot: MATERIALIZATION_ROOT,
      trackId: "nj_arrest_no_conviction",
      facts: { ...baseFacts, petitionerFullLegalName: "   " }
    }),
  "A missing required participant input"
);
await expectError(
  "missing_required_input",
  () =>
    nj.renderNewJerseyAcroformTrack({
      materializationRoot: MATERIALIZATION_ROOT,
      trackId: "nj_arrest_no_conviction",
      facts: { ...baseFacts, mailingAddressZip: "" }
    }),
  "A missing component of the combined caption value"
);
await expectError(
  "content_overflow",
  () =>
    nj.renderNewJerseyAcroformTrack({
      materializationRoot: MATERIALIZATION_ROOT,
      trackId: "nj_arrest_no_conviction",
      facts: {
        ...baseFacts,
        petitionerFullLegalName: "Q".repeat(240)
      }
    }),
  "A participant value that cannot be shown legibly at the smallest ladder size"
);
await expectError(
  "protected_input",
  () =>
    nj.renderNewJerseyAcroformTrack({
      materializationRoot: MATERIALIZATION_ROOT,
      trackId: "nj_arrest_no_conviction",
      facts: { ...baseFacts, hearingDate: "09/01/2026" }
    }),
  "A court-supplied hearing date"
);
await expectError(
  "protected_input",
  () =>
    nj.renderNewJerseyAcroformTrack({
      materializationRoot: MATERIALIZATION_ROOT,
      trackId: "nj_arrest_no_conviction",
      facts: { ...baseFacts, statutoryBasis: "N.J.S.A. 2C:52-5.3" }
    }),
  "A statutory-basis characterisation"
);
await expectError(
  "protected_input",
  () =>
    nj.renderNewJerseyAcroformTrack({
      materializationRoot: MATERIALIZATION_ROOT,
      trackId: "nj_arrest_no_conviction",
      facts: { ...baseFacts, serviceCompleted: "true" }
    }),
  "An assertion that service was completed"
);
await expectError(
  "protected_input",
  () =>
    nj.renderNewJerseyAcroformTrack({
      materializationRoot: MATERIALIZATION_ROOT,
      trackId: "nj_arrest_no_conviction",
      facts: { ...baseFacts, notarySignature: "Notary" }
    }),
  "An outside-party execution value"
);
await expectError(
  "unsupported_track",
  () =>
    nj.renderNewJerseyAcroformTrack({
      materializationRoot: MATERIALIZATION_ROOT,
      trackId: "nj_automated_clean_slate",
      facts: baseFacts
    }),
  "A track outside the assignment"
);
await expectError(
  "invalid_materialization_root",
  () =>
    nj.renderNewJerseyAcroformTrack({
      materializationRoot: path.join(ROOT, "tmp"),
      trackId: "nj_arrest_no_conviction",
      facts: baseFacts
    }),
  "An unsealed materialization root"
);
note(
  "7. Fail-closed cases: a missing required input, a missing half of the combined caption value, an unshowable value, a court hearing date, a statutory-basis characterisation, an assertion of completed service, an outside-party execution value, an unassigned track and an unsealed source root are all refused."
);

// 8. Safety ------------------------------------------------------------------

const sourceAfter = {
  sha256: sha256(fs.readFileSync(sourcePath)),
  bytes: fs.statSync(sourcePath).size,
  mode: fs.statSync(sourcePath).mode & 0o777
};
ok(
  JSON.stringify(sourceBefore) === JSON.stringify(sourceAfter) &&
    sourceAfter.sha256 === requirement.expectedSha256 &&
    sourceAfter.mode === 0o444,
  "The controlling New Jersey source bytes or read-only mode changed."
);
const trackedSources = spawnSync(
  "git",
  [
    "ls-files",
    "--",
    "official-pdf",
    "tmp/packet-output-review",
    "src/lib/rcap/packets/jurisdictions/new-jersey/*.pdf"
  ],
  { cwd: ROOT, encoding: "utf8" }
);
ok(
  trackedSources.status === 0 && trackedSources.stdout.trim() === "",
  `An official or generated PDF entered Git: ${trackedSources.stdout.trim()}`
);
const workerChanges = spawnSync(
  "git",
  ["status", "--porcelain", "--untracked-files=all"],
  { cwd: ROOT, encoding: "utf8" }
);
const changedPaths = workerChanges.stdout
  .split("\n")
  .map((line) => line.slice(3).trim())
  .filter((line) => line.length > 0 && !line.startsWith("tmp/"));
ok(
  workerChanges.status === 0,
  "The worker tree status could not be read."
);
ok(
  changedPaths.every((entry) =>
    [
      "scripts/verify-rcap-new-jersey-acroform-fill.mjs",
      "src/lib/rcap/packets/jurisdictions/new-jersey/acroform.ts"
    ].includes(entry)
  ),
  `The worker changed a path it does not own: ${JSON.stringify(changedPaths)}.`
);
const sharedRegistry = fs.readFileSync(
  path.join(ROOT, SHARED_REGISTRY_PATH),
  "utf8"
);
ok(
  !sharedRegistry.includes("jurisdictions/new-jersey/acroform"),
  "The New Jersey worker implementation was wired into the shared runtime registry."
);
ok(
  nj.NEW_JERSEY_ACROFORM_RUNTIME_DISABLED === true &&
    nj.NEW_JERSEY_ACROFORM_PACKET_READY === false &&
    nj.NEW_JERSEY_ACROFORM_REVIEW_READY === false &&
    nj.NEW_JERSEY_ACROFORM_COUNSEL_ADOPTED === false &&
    nj.NEW_JERSEY_ACROFORM_RELEASE_ACTIVE === false,
  "A release-state invariant changed."
);
for (const track of registryTracks) {
  ok(
    track.legalStatus !== "approved_for_live" && track.legalStatus !== "live",
    `${track.trackId} was promoted by this worker.`
  );
}
note(
  "8. Safety: the receipt-bound source is unchanged and mode 0444; no official or generated PDF is tracked; shared runtime registration, packet readiness, review readiness, counsel adoption and release activation all remain false."
);

if (failures.length > 0) {
  console.error("New Jersey AcroForm fill verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("New Jersey AcroForm fill verification passed.");
for (const check of checks) console.log(check);
for (const entry of rendered) {
  console.log(
    `   ${entry.fixtureId.padEnd(46)} ${entry.trackId.padEnd(26)} ${entry.pageCount}p ${String(entry.mapped).padStart(2)} mapped ${entry.sha256}`
  );
}
console.log(
  `9. Visual evidence: ${pageImages.length} page images rendered under ${path.relative(ROOT, path.join(OUT, "png"))}; worker inspection is technical evidence only.`
);
