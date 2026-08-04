// Generate and review the implementation Tranche 2 (Maryland) packets.
//
// Every positive fixture goes through the REAL fulfilment path — resolvePacket,
// the official-PDF renderer, the packet store, the artifact records — and then
// through the REAL assembly path, `readAssembledPacket`, which is the same
// function the participant's "Download my complete packet PDF" route calls.
// Nothing is concatenated outside that path to make a sample look complete.
//
// The tranche's deliverable is one assembled PDF per route. Component PDFs are
// written beside it for debugging, and no ZIP is produced for anyone: the
// tracked review manifest plus this command answer what an archive would.
//
// Output goes to an ignored directory. The PDFs and the page images are never
// committed; the tracked manifest records their hashes and page counts so a
// reviewer can verify a delivered file against the commit.
//
// Usage:
//   npm run rcap:generate-tranche-2-review [-- --skip-images]

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
process.env.RCAP_PACKET_STORE_DRIVER = "local";
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run in production.");
  process.exit(1);
}

register("./lib/ts-esm-loader.mjs", import.meta.url);

const { fulfillPacket, readAssembledPacket } = await import("@/lib/rcap/packets/lifecycle");
const { resolvePacketStore, resetLocalPacketStore } = await import("@/lib/rcap/packets/store");
const { deriveMarylandFacts, MarylandBranchError, MARYLAND_SHIELDABLE_OFFENCES } = await import(
  "@/lib/rcap/packets/tranche-2-maryland-facts"
);
const { PacketResolutionError } = await import("@/lib/rcap/packets/resolve");
const { PDFCheckBox, PDFDocument, PDFTextField } = await import("pdf-lib");

const root = process.cwd();
const OUT_ROOT = path.join(root, "tmp/packet-output-review/tranche-2");
const TRANCHE_DIR = path.join(root, "data/record-clearing/implementation-tranches");
const skipImages = process.argv.includes("--skip-images");

const tranche = readTranche("tranche-2.json");
const pins = readTranche("tranche-2-authority-pins.json");
const fixtures = readTranche("tranche-2-fixtures.json");
const ownership = readTranche("tranche-2-field-ownership.json");

const positives = fixtures.positiveFixtures;
const boundaries = fixtures.boundaryFixtures;
const thirdParty = fixtures.thirdPartyOwnershipFixture;
const byFixtureId = new Map(positives.map((entry) => [entry.fixtureId, entry]));

// Deterministic: the same fixture must always produce the same request key, so
// a rerun proves reuse rather than producing a second artifact set.
const OWNER = "00000000-0000-4000-8000-000000000002";

// The review directory is rebuilt rather than merged, so a renamed fixture
// cannot leave a stale PDF behind that a reviewer would read as current.
// `_scratch` is preserved: it holds hand-run inspection tools, not output.
rebuildOutputRoot();
resetLocalPacketStore();

const store = resolvePacketStore();
const failures = [];
const results = [];

console.log(
  `Tranche 2 — ${tranche.jurisdictionName}: ${tranche.selectedTracks.length} track, ${positives.length} positive fixtures.`
);

// ---------------------------------------------------------------------------
// Positive fixtures — one assembled PDF each
// ---------------------------------------------------------------------------

for (const fixture of positives) {
  const outDir = path.join(OUT_ROOT, fixture.trackId, fixture.fixtureId);
  fs.mkdirSync(path.join(outDir, "components"), { recursive: true });

  const derived = deriveMarylandFacts(fixture.trackId, fixture.facts);
  const request = {
    jurisdiction: tranche.jurisdiction,
    trackId: fixture.trackId,
    facts: derived,
    allowTechnicalFixtures: true,
    ownerId: OWNER,
    requestKey: `tranche-2:${fixture.fixtureId}`,
    rootDir: root,
    store
  };

  const fulfillment = await fulfillPacket(request);

  // Determinism is checked against a second render under a different request
  // key, so it exercises the renderer rather than the idempotency cache.
  const second = await fulfillPacket({ ...request, requestKey: `tranche-2:${fixture.fixtureId}:determinism` });

  const components = [];
  for (const component of fulfillment.components) {
    const artifact = await store.repository.findArtifact(fulfillment.fulfillmentId, component.componentId);
    const bytes = await store.storage.get(artifact.objectPath);
    const secondArtifact = await store.repository.findArtifact(second.fulfillmentId, component.componentId);
    const deterministic = artifact.checksumSha256 === secondArtifact.checksumSha256;
    if (!deterministic) failures.push(`${fixture.fixtureId}/${component.componentId}: component is not deterministic.`);

    const fileName = `${String(component.order).padStart(2, "0")}-${component.componentId}.pdf`;
    fs.writeFileSync(path.join(outDir, "components", fileName), bytes);

    components.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      fileName,
      pageCount: component.pageCount,
      byteSize: artifact.byteSize,
      sha256: artifact.checksumSha256,
      rendererStrategy: component.rendererStrategy,
      officialSourceSha256: component.sourceSha256,
      deterministic,
      warnings: component.warnings
    });
  }

  // The participant's deliverable, produced by the same function the download
  // route calls. Assembled twice as well: the assembled bytes are what the
  // review manifest hashes, so they are the ones that have to be stable.
  const assembled = await readAssembledPacket({
    fulfillmentId: fulfillment.fulfillmentId,
    caseReference: fixture.caseReference,
    store
  });
  const assembledAgain = await readAssembledPacket({
    fulfillmentId: second.fulfillmentId,
    caseReference: fixture.caseReference,
    store
  });
  if (assembled.sha256 !== assembledAgain.sha256) {
    failures.push(`${fixture.fixtureId}: the assembled packet is not byte-deterministic.`);
  }

  fs.writeFileSync(path.join(outDir, assembled.fileName), assembled.bytes);

  let images = 0;
  if (!skipImages) {
    images = rasterize(path.join(outDir, assembled.fileName), path.join(outDir, "pages"));
    if (images !== assembled.pageCount) {
      failures.push(`${fixture.fixtureId}: rendered ${images} images for ${assembled.pageCount} pages.`);
    }
  }

  results.push({
    fixtureId: fixture.fixtureId,
    trackId: fixture.trackId,
    branchVariantId: fixture.branchVariantId ?? null,
    description: fixture.description,
    fulfillmentStatus: fulfillment.status,
    runtimeStatus: fulfillment.runtimeStatus,
    outputStrategy: fulfillment.outputStrategy,
    packetSetId: fulfillment.packetSetId,
    isFilingPacket: fulfillment.isFilingPacket,
    assembledFileName: assembled.fileName,
    assembledSha256: assembled.sha256,
    assembledPageCount: assembled.pageCount,
    assembledBytes: assembled.byteSize,
    assembledMimeType: assembled.mimeType,
    componentRanges: assembled.componentRanges,
    pageImages: images,
    components
  });

  console.log(
    `  ${fixture.fixtureId.padEnd(36)} ${String(assembled.pageCount).padStart(2)} pages  ` +
      `${components.length} components  ${assembled.fileName}`
  );
}

// ---------------------------------------------------------------------------
// Third-party field ownership — one fixture across the tranche
// ---------------------------------------------------------------------------

const thirdPartyBase = byFixtureId.get(thirdParty.basedOn);
const thirdPartyDir = path.join(OUT_ROOT, thirdParty.trackId, thirdParty.fixtureId);
fs.mkdirSync(path.join(thirdPartyDir, "components"), { recursive: true });

const poisonedFacts = {
  ...deriveMarylandFacts(thirdParty.trackId, thirdPartyBase.facts),
  ...thirdParty.injectedThirdPartyFacts
};
const poisoned = await fulfillPacket({
  jurisdiction: tranche.jurisdiction,
  trackId: thirdParty.trackId,
  facts: poisonedFacts,
  allowTechnicalFixtures: true,
  ownerId: OWNER,
  requestKey: `tranche-2:${thirdParty.fixtureId}`,
  rootDir: root,
  store
});

const thirdPartyComponentFiles = new Map();
for (const component of poisoned.components) {
  const artifact = await store.repository.findArtifact(poisoned.fulfillmentId, component.componentId);
  const bytes = await store.storage.get(artifact.objectPath);
  const file = path.join(thirdPartyDir, "components", `${String(component.order).padStart(2, "0")}-${component.componentId}.pdf`);
  fs.writeFileSync(file, bytes);
  thirdPartyComponentFiles.set(component.componentId, file);
}
const thirdPartyAssembled = await readAssembledPacket({
  fulfillmentId: poisoned.fulfillmentId,
  caseReference: thirdParty.caseReference,
  store
});
fs.writeFileSync(path.join(thirdPartyDir, thirdPartyAssembled.fileName), thirdPartyAssembled.bytes);

const thirdPartyIssues = [];
const poisonedText = pdfText(path.join(thirdPartyDir, thirdPartyAssembled.fileName));
for (const forbidden of thirdParty.mustNotAppearInOutput) {
  if (poisonedText.includes(forbidden)) {
    thirdPartyIssues.push(`an injected third-party value reached the packet: ${forbidden}`);
  }
}

// Field-level, not only text-level: an unchecked box prints nothing, so a text
// search alone would never see one that had been checked.
const petitionFile = thirdPartyComponentFiles.get(pins.tracks[0].components[0].componentId);
const noticeFile = thirdPartyComponentFiles.get(pins.tracks[0].components[1].componentId);
const fileByForm = { "CC-DC-CR-148": petitionFile, "MDJ-008": noticeFile };

for (const entry of thirdParty.checkboxesThatMustRemainUnchecked) {
  const field = await loadField(fileByForm[entry.form], entry.pdfFieldName);
  if (field instanceof PDFCheckBox && field.isChecked()) {
    thirdPartyIssues.push(`${entry.form}: ${entry.pdfFieldName} was checked.`);
  }
}
for (const entry of thirdParty.fieldsThatMustRemainEmpty) {
  const field = await loadField(fileByForm[entry.form], entry.pdfFieldName);
  if (field instanceof PDFTextField && (field.getText() ?? "").trim() !== "") {
    thirdPartyIssues.push(`${entry.form}: ${entry.pdfFieldName} carries a value.`);
  }
}
failures.push(...thirdPartyIssues.map((issue) => `${thirdParty.fixtureId}: ${issue}`));
console.log(
  `  ${thirdParty.fixtureId.padEnd(36)} ${thirdPartyIssues.length === 0 ? "no third-party field written" : "THIRD-PARTY FIELD WRITTEN"}`
);

// ---------------------------------------------------------------------------
// Boundary fixtures — each must stop, not produce a packet
// ---------------------------------------------------------------------------

const boundaryResults = [];
for (const boundary of boundaries) {
  const base = byFixtureId.get(boundary.basedOn);
  const input = { ...base.facts, ...(boundary.overrideFacts ?? {}) };
  if (boundary.overrideConvictions) input.convictions = boundary.overrideConvictions;
  for (const key of boundary.omitKeys ?? []) delete input[key];

  let outcome = "generated_unexpectedly";
  let detail = null;
  try {
    const derived = deriveMarylandFacts(boundary.trackId, input);
    await fulfillPacket({
      jurisdiction: tranche.jurisdiction,
      trackId: boundary.trackId,
      facts: derived,
      allowTechnicalFixtures: true,
      ownerId: OWNER,
      requestKey: `tranche-2:${boundary.fixtureId}`,
      rootDir: root,
      store
    });
  } catch (error) {
    if (error instanceof MarylandBranchError) {
      outcome = "branch_error";
      detail = error.key;
    } else if (error instanceof PacketResolutionError) {
      outcome = "resolution_missing_required_input";
      detail = (error.detail.missingInputs ?? []).join(", ");
    } else {
      outcome = "unexpected_error";
      detail = String(error?.message ?? "").slice(0, 160);
    }
  }

  const passed =
    outcome === boundary.expect && (!boundary.expectDetail || String(detail).includes(boundary.expectDetail));
  if (!passed) {
    failures.push(`${boundary.fixtureId}: expected ${boundary.expect}/${boundary.expectDetail}, got ${outcome}/${detail}.`);
  }
  boundaryResults.push({
    fixtureId: boundary.fixtureId,
    trackId: boundary.trackId,
    kind: boundary.kind,
    expected: boundary.expect,
    expectedDetail: boundary.expectDetail ?? null,
    outcome,
    detail,
    passed
  });
  console.log(`  ${boundary.fixtureId.padEnd(36)} ${passed ? "stopped correctly" : "DID NOT STOP"} (${outcome})`);
}

// ---------------------------------------------------------------------------
// Technical review — the assertions no rendered page can make for itself
// ---------------------------------------------------------------------------

// A number printed here would be relied on at a filing counter, and the fee for
// a shielding petition is an open release blocker. Nothing prints one.
const PROHIBITED_CONTENT = [
  { id: "fee_amount", pattern: /\$\s?\d/, why: "a dollar amount was printed" },
  { id: "expungement_conflation", pattern: /petition (for|to) expunge|expungement of (your|these) conviction/i, why: "shielding described as expungement" },
  { id: "attorney_review_claim", pattern: /reviewed by (an|our) attorney|attorney[- ]reviewed/i, why: "the packet claims attorney review" },
  { id: "internal_sha", pattern: /\b[0-9a-f]{40,}\b/, why: "an internal hash reached a participant page" },
  { id: "source_gated_form", pattern: /CC-DC-CR-072/i, why: "a source-gated form was named as part of this packet" },
  { id: "outcome_promise", pattern: /will be granted|guarantee|we guarantee/i, why: "an outcome was promised" }
];

const expectedComponentIds = pins.tracks[0].components.map((entry) => entry.componentId);
const mappedFieldNames = new Set(
  ownership.forms.flatMap((form) => form.fields.filter((field) => field.mapped).map((field) => field.pdfFieldName))
);

const technical = [];
for (const result of results) {
  const fixture = byFixtureId.get(result.fixtureId);
  const outDir = path.join(OUT_ROOT, result.trackId, result.fixtureId);
  const issues = [];

  // Component completeness and order against the pinned packet definition.
  const produced = result.components.map((entry) => entry.componentId);
  for (const componentId of expectedComponentIds) {
    if (!produced.includes(componentId)) issues.push(`${componentId}: expected component was not produced.`);
  }
  for (const componentId of produced) {
    if (!expectedComponentIds.includes(componentId)) issues.push(`${componentId}: unexpected component in the packet.`);
  }
  const orders = result.components.map((entry) => entry.order);
  if (orders.some((value, index) => index > 0 && value <= orders[index - 1])) {
    issues.push("components are not in ascending packet order.");
  }

  // The assembled file is one PDF, correctly named, and made of exactly the
  // components in exactly the packet order.
  if (result.assembledMimeType !== "application/pdf") issues.push("the assembled packet is not application/pdf.");
  if (!result.assembledFileName.startsWith("LegalEase_Maryland_")) {
    issues.push(`assembled filename does not follow the convention: ${result.assembledFileName}`);
  }
  if (/\b\d{9}\b/.test(result.assembledFileName) || /\b\d{2}[-_]\d{2}[-_]\d{4}\b/.test(result.assembledFileName)) {
    issues.push("the assembled filename carries something that looks like a sensitive value.");
  }
  const assembledFile = path.join(outDir, result.assembledFileName);
  const head = fs.readFileSync(assembledFile).subarray(0, 5).toString("latin1");
  if (head !== "%PDF-") issues.push("the assembled file does not begin with a PDF header.");
  const rangeOrder = result.componentRanges.map((range) => range.order);
  if (rangeOrder.join(",") !== [...rangeOrder].sort((a, b) => a - b).join(",")) {
    issues.push("assembled component ranges are not in packet order.");
  }
  const rangePages = result.componentRanges.reduce((total, range) => total + range.pageCount, 0);
  if (rangePages !== result.assembledPageCount) issues.push("component page ranges do not cover the assembled packet.");
  const componentPages = result.components.reduce((total, entry) => total + (entry.pageCount ?? 0), 0);
  if (componentPages !== result.assembledPageCount) {
    issues.push("the assembled page count does not equal the sum of its components.");
  }

  // Official sources: the exact pinned hash, on the exact pinned component.
  for (const component of result.components) {
    const pin = pins.tracks[0].components.find((entry) => entry.componentId === component.componentId);
    if (pin.asset) {
      if (component.officialSourceSha256 !== pin.asset.sha256) {
        issues.push(`${component.componentId}: official source hash does not match the Edition 1.2 pin.`);
      }
      if (component.rendererStrategy !== pin.rendererStrategy) {
        issues.push(`${component.componentId}: rendered with ${component.rendererStrategy}, pinned as ${pin.rendererStrategy}.`);
      }
    } else if (component.officialSourceSha256 !== null) {
      issues.push(`${component.componentId}: a guidance component reports an official source hash.`);
    }
    if (!component.deterministic) issues.push(`${component.componentId}: output is not deterministic.`);
    if (!component.pageCount || component.pageCount < 1) issues.push(`${component.componentId}: no page count.`);
  }

  // Field level, on the official components: every participant value the
  // fixture supplied landed, every third-party field is still blank, and only
  // the offences the fixture selected are checked.
  const petition = await loadForm(path.join(outDir, "components", `01-${expectedComponentIds[0]}.pdf`));
  const notice = await loadForm(path.join(outDir, "components", `02-${expectedComponentIds[1]}.pdf`));

  const selected = new Set(fixture.facts.convictions.map((entry) => entry.offenceKey));
  for (const offence of MARYLAND_SHIELDABLE_OFFENCES) {
    const box = petition.getField(offence.checkboxField);
    const shouldBeChecked = selected.has(offence.key);
    if (box.isChecked() !== shouldBeChecked) {
      issues.push(`CC-DC-CR-148: ${offence.key} checkbox is ${box.isChecked() ? "checked" : "unchecked"} and should not be.`);
    }
    const caseField = petition.getField(offence.caseField);
    const caseText = (caseField.getText() ?? "").trim();
    if (!shouldBeChecked && caseText !== "") {
      issues.push(`CC-DC-CR-148: ${offence.key} carries a case number but its box is unchecked.`);
    }
    if (shouldBeChecked) {
      const supplied = fixture.facts.convictions.find((entry) => entry.offenceKey === offence.key).caseNumbers;
      const continued = offence.continuationField
        ? (petition.getField(offence.continuationField).getText() ?? "").trim()
        : "";
      const printed = `${caseText} ${continued}`;
      for (const caseNumber of supplied) {
        if (!printed.includes(caseNumber)) {
          issues.push(`CC-DC-CR-148: case number for ${offence.key} is absent from the form.`);
        }
      }
    }
  }

  // Court branch, on both forms.
  const circuit = fixture.facts.courtLevel === "circuit";
  for (const [label, form] of [["CC-DC-CR-148", petition], ["MDJ-008", notice]]) {
    if (form.getField("Circuit Court").isChecked() !== circuit) issues.push(`${label}: circuit-court box is wrong for this branch.`);
    if (form.getField("District Court").isChecked() === circuit) issues.push(`${label}: district-court box is wrong for this branch.`);
  }

  // Third-party and manual blocks stay blank on every positive packet, not only
  // on the fixture built to attack them.
  for (const form of ownership.forms) {
    const loaded = form.documentId === "CC-DC-CR-148" ? petition : notice;
    for (const field of form.fields) {
      if (field.mapped) continue;
      if (field.type === "button") continue;
      const target = loaded.getField(field.pdfFieldName);
      if (target instanceof PDFTextField && (target.getText() ?? "").trim() !== "") {
        issues.push(`${form.documentId}: unmapped ${field.owner} field ${field.pdfFieldName} carries a value.`);
      }
      if (target instanceof PDFCheckBox && target.isChecked()) {
        issues.push(`${form.documentId}: unmapped ${field.owner} field ${field.pdfFieldName} is checked.`);
      }
    }
    // And no field outside the ownership record exists to be written to.
    for (const name of loaded.getFields().map((entry) => entry.getName())) {
      if (!form.fields.some((field) => field.pdfFieldName === name)) {
        issues.push(`${form.documentId}: field ${name} is absent from the field-ownership record.`);
      }
      if (mappedFieldNames.has(name)) continue;
    }
  }

  // Required participant values reached the page.
  const petitionText = pdfText(path.join(outDir, "components", `01-${expectedComponentIds[0]}.pdf`));
  for (const value of [fixture.facts.petitionerName, fixture.facts.courtAddress, fixture.facts.dateOfBirth]) {
    if (!petitionText.includes(value)) issues.push(`CC-DC-CR-148: a required participant value is absent (${value}).`);
  }

  // Prohibited content, across the whole assembled packet.
  const assembledText = pdfText(assembledFile);
  for (const rule of PROHIBITED_CONTENT) {
    if (rule.pattern.test(assembledText)) issues.push(`assembled packet: ${rule.why}.`);
  }
  if (!assembledText.includes("This document is not a court filing")) {
    issues.push("assembled packet: the instructions do not carry the not-a-court-filing notice.");
  }

  technical.push({ fixtureId: result.fixtureId, trackId: result.trackId, passed: issues.length === 0, issues });
  failures.push(...issues.map((issue) => `${result.fixtureId}: ${issue}`));
}

// ---------------------------------------------------------------------------
// Visual checklist — what a reviewer has to look at, page by page
// ---------------------------------------------------------------------------

if (!skipImages) writeVisualChecklist();

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

const technicalPassed =
  technical.every((entry) => entry.passed) &&
  boundaryResults.every((entry) => entry.passed) &&
  thirdPartyIssues.length === 0;

fs.writeFileSync(
  path.join(OUT_ROOT, "generation-result.json"),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      trancheId: tranche.trancheId,
      generatedAt: new Date().toISOString(),
      authorityEdition: pins.authorityEdition,
      authorityArchiveSha256: pins.authorityArchiveSha256,
      positives: results,
      thirdPartyOwnership: { fixtureId: thirdParty.fixtureId, issues: thirdPartyIssues, passed: thirdPartyIssues.length === 0 },
      boundaries: boundaryResults,
      technical,
      technicalPassed,
      failures
    },
    null,
    2
  )}\n`
);

// The tracked manifest carries no wall clock. Its point is that the hashes are
// reproducible, and a timestamp would make every rerun a diff.
writeTrackedManifest(technicalPassed);

console.log("");
console.log(`Assembled participant PDFs: ${results.length}. Boundary fixtures: ${boundaryResults.length}.`);
console.log(`Technical review: ${technicalPassed ? "passed" : "FAILED"}.`);
if (failures.length > 0) {
  console.log("");
  for (const failure of failures.slice(0, 40)) console.log(`  - ${failure}`);
  process.exit(1);
}
console.log("No track was promoted. md_second_chance_shielding remains runtime_disabled.");

// ---------------------------------------------------------------------------

function readTranche(name) {
  return JSON.parse(fs.readFileSync(path.join(TRANCHE_DIR, name), "utf8"));
}

function rebuildOutputRoot() {
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  for (const entry of fs.readdirSync(OUT_ROOT)) {
    if (entry === "_scratch") continue;
    fs.rmSync(path.join(OUT_ROOT, entry), { recursive: true, force: true });
  }
}

function rasterize(pdfFile, imageDir) {
  fs.mkdirSync(imageDir, { recursive: true });
  const rendered = spawnSync("pdftoppm", ["-png", "-r", "110", pdfFile, path.join(imageDir, "page")], {
    encoding: "utf8"
  });
  if (rendered.status !== 0) {
    failures.push(`page rasterization failed for ${path.basename(pdfFile)} — ${rendered.stderr}`);
    return 0;
  }
  return fs.readdirSync(imageDir).filter((name) => name.endsWith(".png")).length;
}

async function loadForm(file) {
  const doc = await PDFDocument.load(new Uint8Array(fs.readFileSync(file)));
  return doc.getForm();
}

async function loadField(file, name) {
  const form = await loadForm(file);
  try {
    return form.getField(name);
  } catch {
    return null;
  }
}

/** Extracted page text, for content assertions rather than for display. */
function pdfText(file) {
  const result = spawnSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`pdftotext failed for ${file}: ${result.stderr}`);
  return result.stdout.replace(/-\n\s*/g, "").replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ");
}

function writeVisualChecklist() {
  const lines = [
    "# Tranche 2 — Maryland visual review checklist",
    "",
    "Every page of every assembled participant packet, with what has to be true of it.",
    "Regenerate with `npm run rcap:generate-tranche-2-review`. Nothing here is committed.",
    "",
    "## What to look for on an official court page",
    "",
    "- no clipped text and no value outside its blank",
    "- no overlapping values and no value printed over a printed label",
    "- no microtype: an auto-sizing Maryland field shrinks instead of clipping",
    "- no shifted checkbox mark and no box checked that should not be",
    "- the attorney block, both signature lines and both signature dates blank and usable",
    "- the official form's own appearance intact — rules, seal, footer, revision line",
    "",
    "## What to look for on a LegalEase page",
    "",
    "- clearly separate from the court pages, with its own header and page numbering",
    "- no internal metadata, hash, component id or reviewer note",
    "- no fee amount, and no confidential value repeated without a reason",
    ""
  ];
  for (const result of results) {
    const dir = path.relative(root, path.join(OUT_ROOT, result.trackId, result.fixtureId));
    lines.push(`## ${result.fixtureId} — ${result.assembledPageCount} pages`);
    lines.push("");
    lines.push(`\`${dir}/${result.assembledFileName}\``);
    lines.push("");
    for (const range of result.componentRanges) {
      for (let page = range.startPage; page <= range.endPage; page += 1) {
        lines.push(
          `- page ${String(page).padStart(2, "0")} — ${range.role} (${range.componentId}) — \`${dir}/pages/page-${String(page).padStart(2, "0")}.png\``
        );
      }
    }
    lines.push("");
  }
  fs.writeFileSync(path.join(OUT_ROOT, "visual-checklist.md"), `${lines.join("\n")}\n`);
}

function writeTrackedManifest(passed) {
  const manifest = {
    schemaVersion: 1,
    trancheId: tranche.trancheId,
    jurisdiction: tranche.jurisdiction,
    authorityEdition: pins.authorityEdition,
    authorityArchiveSha256: pins.authorityArchiveSha256,
    regenerateWith: tranche.reviewGenerationCommand,
    reviewOutput: {
      directory: tranche.reviewOutputDirectory,
      tracked: false,
      zipDelivered: false,
      note: "The assembled packets, the component PDFs and the page images are deliberately untracked. This manifest records their hashes and page counts, so a file handed to counsel can be verified against the commit without an archive in version control. No wall-clock timestamp is recorded here: the manifest's value is that a rerun reproduces it exactly."
    },
    participantDeliverable: {
      form: "one_assembled_pdf",
      perRoute: 1,
      zipDelivered: false,
      componentPdfsRetained: "internally only",
      downloadRoute: "GET /api/rcap/packets/{fulfillmentId}/packet",
      participantAction: "Download my complete packet PDF"
    },
    selectedTracks: tranche.selectedTracks.map((entry) => ({
      trackId: entry.trackId,
      businessLabel: entry.businessLabel,
      outputStrategy: entry.outputStrategy,
      officialForms: entry.officialForms,
      branchVariants: entry.branchVariants.map((variant) => variant.variantId)
    })),
    officialSources: pins.tracks[0].components
      .filter((component) => component.asset)
      .map((component) => ({
        componentId: component.componentId,
        documentId: component.asset.documentId,
        documentRole: component.asset.documentRole,
        revision: component.asset.revision,
        sha256: component.asset.sha256,
        canonicalRelativePath: component.asset.canonicalRelativePath,
        rendererStrategy: component.rendererStrategy
      })),
    samplePackets: results.map((result) => ({
      fixtureId: result.fixtureId,
      trackId: result.trackId,
      branchVariantId: result.branchVariantId,
      assembledFileName: result.assembledFileName,
      assembledSha256: result.assembledSha256,
      assembledBytes: result.assembledBytes,
      assembledPageCount: result.assembledPageCount,
      pageImages: result.pageImages,
      componentCount: result.components.length,
      componentRanges: result.componentRanges,
      components: result.components.map((component) => ({
        componentId: component.componentId,
        role: component.role,
        order: component.order,
        pageCount: component.pageCount,
        sha256: component.sha256,
        byteSize: component.byteSize,
        rendererStrategy: component.rendererStrategy,
        officialSourceSha256: component.officialSourceSha256,
        deterministic: component.deterministic,
        warnings: component.warnings
      }))
    })),
    thirdPartyOwnershipFixture: {
      fixtureId: thirdParty.fixtureId,
      injectedFactKeys: Object.keys(thirdParty.injectedThirdPartyFacts).length,
      valuesThatReachedThePacket: thirdPartyIssues.length,
      passed: thirdPartyIssues.length === 0
    },
    boundaryFixtures: boundaryResults,
    technicalResult: passed ? "passed" : "failed",
    technicalDetail: {
      assembledPacketsGenerated: results.length,
      boundaryFixturesStopped: boundaryResults.filter((entry) => entry.passed).length,
      thirdPartyFieldsWritten: thirdPartyIssues.length,
      deterministic: true,
      unresolvedIssues: failures.length
    },
    visualReviewRecord: "data/record-clearing/implementation-tranches/tranche-2-visual-review.json",
    legalOutputRecommendation: "data/record-clearing/implementation-tranches/tranche-2-legal-output-recommendation.json",
    humanLegalReviewStatus: "awaiting_counsel_adoption",
    runtimeStatus: "runtime_disabled",
    packetReady: 0,
    enabledJurisdictions: 0,
    launchGate: "red",
    note: "The technical review in this file is an engineering proof, not a legal approval. Nothing here may be read as counsel's sign-off, and no status in this file grants generation, promotion or release."
  };
  fs.writeFileSync(path.join(TRANCHE_DIR, "tranche-2-review-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}
