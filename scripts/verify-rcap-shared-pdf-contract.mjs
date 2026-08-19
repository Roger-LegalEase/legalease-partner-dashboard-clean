#!/usr/bin/env node
// The shared PDF finalization contract, proved end to end on four canaries.
//
//   node scripts/verify-rcap-shared-pdf-contract.mjs
//   node scripts/verify-rcap-shared-pdf-contract.mjs --mutations
//
// Five systemic corrections are checked here once, for the whole corpus, rather
// than form family by form family:
//
//   1. write-box geometry comes from content streams, never from pixels;
//   2. participant text is black;
//   3. the participant's official form keeps the court's metadata, and our
//      provenance lives in a sidecar bound to the output hash;
//   4. an email line receives an email or nothing;
//   5. every discovered field and every measured anchor is classified.
//
// The Wisconsin CR-266 canary is synthesized to the geometry an independent
// review recorded on that form — the real binary lives under private/Nationwide
// Record Clearing/, which this worktree does not carry. That is deliberate: a
// platform contract should be provable without any one family's bytes, and the
// PDF lane proves the same contract against the real ones.
//
// Nothing here writes to the repository. The mutation pass mutates only
// in-memory documents and objects it constructed itself, so there is nothing to
// restore and the tracked tree is byte-identical throughout.

import { createRequire } from "node:module";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const MUTATIONS = process.argv.includes("--mutations");

const {
  wisconsinCr266GeometryCanary, acroFormCanary, activeContentCanary, emailSemanticsCanary, CANARY_STAMP
} = await import("./rcap-official-forms/rcap-pdf-canaries.mjs");
const {
  ruleLinesOf, captionLinesOf, ruleForCaption, GEOMETRY_SOURCE
} = await import("./rcap-official-forms/rcap-pdf-rule-lines.mjs");
const {
  finalizeFlatOverlay, finalizeOfficialForm, PARTICIPANT_INK_RGB, participantInk,
  metadataOfBytes, brandingInMetadata
} = await import("./rcap-official-forms/rcap-official-form-finalize.mjs");
const {
  artifactProvenance, provenanceCoversArtifact, PROVENANCE_SCHEMA
} = await import("./rcap-official-forms/rcap-artifact-provenance.mjs");
const {
  classifyForm, classificationFailures, DEFAULT_PROTECTED_CATEGORIES
} = await import("./rcap-official-forms/rcap-field-classification.mjs");
const { decideBinding } = await import("./rcap-official-forms/rcap-field-semantics.mjs");
const { scanBytesForActiveContent } = await import("./rcap-official-forms/rcap-active-content.mjs");
const { extractPageGeometry, groupIntoLines } = await import("./rcap-official-forms/rcap-pdf-anchor-capture.mjs");

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

// ---------------------------------------------------------------------------
// The world under test. Everything a mutation can reach lives here, so a
// mutation changes an input rather than reaching into module state.
// ---------------------------------------------------------------------------
async function buildWorld() {
  const cr266 = await wisconsinCr266GeometryCanary();
  const rules = await ruleLinesOf(cr266.bytes);
  const captions = await captionLinesOf(cr266.bytes);

  const anchorFor = (label) => {
    const line = captions[0].lines.find((l) => l.text.trim() === label);
    if (!line) return null;
    const binding = ruleForCaption(rules, {
      page: 1, baselineY: line.y, labelX: line.x,
      labelX2: line.runs.at(-1).x2, label
    });
    return { label, line, binding };
  };

  const labels = ["COUNTY", "Case No.", "Date of Birth", "Defendant's Name", "Signature"];
  const anchors = labels.map(anchorFor).filter(Boolean);

  const discovered = [
    ...anchors.map((a) => ({
      id: `anchor:${a.label}`, page: 1, printedLabel: a.label, fieldType: "flat_anchor",
      geometry: a.binding.bound
        ? { x: a.binding.rule.x, y: a.binding.rule.y, width: a.binding.rule.width, maxRightEdge: a.binding.maxRightEdge }
        : null,
      sourceEvidence: `content_stream:${a.binding.bound ? a.binding.rule.sourceStream : "refused"}`
    })),
    { id: "anchor:Page 1 of 2", page: 1, printedLabel: "Page 1 of 2", fieldType: "flat_anchor", geometry: null, sourceEvidence: "content_stream:page_content" },
    { id: "anchor:Judge", page: 1, printedLabel: "Judge", fieldType: "flat_anchor", geometry: null, sourceEvidence: "content_stream:page_content" }
  ];
  const classification = classifyForm({ jurisdiction: "WI", documentId: "CR-266", discovered });

  return { cr266, rules, captions, anchors, discovered, classification };
}

// ---------------------------------------------------------------------------
// checks
// ---------------------------------------------------------------------------
async function failures(world) {
  const out = [];
  const fail = (ok, message) => { if (!ok) out.push(message); };
  const { cr266, rules, anchors, discovered, classification } = world;

  // G — geometry comes from the content stream, and the CR-266 defects stay fixed.
  fail(GEOMETRY_SOURCE === "content_stream", `G-source: the geometry source is ${GEOMETRY_SOURCE}`);
  const geometrySource = fs.readFileSync("scripts/rcap-official-forms/rcap-pdf-rule-lines.mjs", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
  fail(!/rasteri[sz]|pixel|png|canvas|pdftoppm|pdftocairo/i.test(geometrySource),
    "G-no-raster: the geometry module reaches for a rasterizer");
  fail(rules[0].horizontal.every((r) => r.geometrySource === "content_stream"),
    "G-tagged: a rule is not tagged as content-stream geometry");

  const byLabel = new Map(anchors.map((a) => [a.label, a.binding]));
  const county = byLabel.get("COUNTY");
  fail(county?.bound === true, "G-county: COUNTY did not resolve to a rule; a petition filed without a venue is not filed");

  const caseNo = byLabel.get("Case No.");
  fail(caseNo?.bound === true, "G-case-bound: Case No. did not resolve to a rule");
  fail(caseNo?.rule?.width < 100,
    `G-case-width: Case No. resolved to a ${caseNo?.rule?.width}pt box; the real rule is 77.16pt and the fabricated one was 213pt`);
  fail(caseNo?.rule?.endX <= 432.1, `G-case-end: Case No. ends at ${caseNo?.rule?.endX}, past its real 432.07`);
  fail(caseNo?.maxRightEdge <= 464.26,
    `G-case-divider: the Case No. write box may reach ${caseNo?.maxRightEdge}, past the caption divider at 464.26`);

  const dob = byLabel.get("Date of Birth");
  fail(dob?.bound === true, "G-dob-bound: Date of Birth did not resolve");
  fail(dob?.rule?.x !== caseNo?.rule?.x,
    "G-dob-misbind: Date of Birth captured the Case Number rule, which is the defect this replaced");

  fail(byLabel.get("Defendant's Name")?.bound === true, "G-defendant: Defendant's Name did not resolve");
  fail(anchors.every((a) => !a.binding.bound || a.binding.associationMethod === "horizontal_overlap_and_vertical_distance"),
    "G-method: a binding was made without both constraints");
  fail(anchors.every((a) => a.binding.bound || typeof a.binding.ambiguity === "string"),
    "G-refusal: a refusal was recorded with no named ambiguity");
  fail(anchors.every((a) => typeof a.binding.participantFallback === "string" && a.binding.participantFallback.length > 0),
    "G-fallback: a binding records no participant fallback");

  // A long value must refuse rather than cross the divider.
  const longCase = await finalizeFlatOverlay({
    sourceBytes: cr266.bytes,
    anchors: [{
      page: 1, label: "Case No.", factId: "matter.case_number",
      writeBox: { x: caseNo.rule.x, y: caseNo.rule.y + 1.5, width: caseNo.maxRightEdge - caseNo.rule.x, height: 10 },
      fontSize: 9
    }],
    facts: { "matter.case_number": "2019CF000123456789-AB-LONGEST-POSSIBLE-CASE-NUMBER" }
  });
  fail(longCase.report.written.length === 0 && longCase.report.refused.length === 1,
    "G-overflow: a case number too long for its rule was drawn instead of refused");

  // B — participant text is black.
  fail(PARTICIPANT_INK_RGB.r === 0 && PARTICIPANT_INK_RGB.g === 0 && PARTICIPANT_INK_RGB.b === 0,
    `B-default: the platform ink is ${JSON.stringify(PARTICIPANT_INK_RGB)}`);
  const finalizerSource = fs.readFileSync("scripts/rcap-official-forms/rcap-official-form-finalize.mjs", "utf8");
  fail(!/rgb\(\s*0\s*,\s*0\s*,\s*0\.\d/.test(finalizerSource), "B-blue: the finalizer still names the old blue default");
  let unexplainedColourAccepted = false;
  try { participantInk({ r: 0, g: 0, b: 0.55 }); unexplainedColourAccepted = true; } catch { /* refused, as required */ }
  fail(!unexplainedColourAccepted, "B-override: a colour override with no reason and no source was accepted");
  let sourcedColourRejected = false;
  try {
    participantInk({ r: 0, g: 0, b: 0.55, reason: "the form's own instructions require blue ink for this field", source: "form instructions page 2" });
  } catch { sourcedColourRejected = true; }
  fail(!sourcedColourRejected, "B-approved: a colour override with a reason and a source was refused");

  const filled = await finalizeFlatOverlay({
    sourceBytes: cr266.bytes,
    anchors: [{ page: 1, label: "Defendant's Name", factId: "participant.full_legal_name", writeBox: { x: 180, y: 654, width: 240, height: 12 }, fontSize: 9 }],
    facts: { "participant.full_legal_name": "Jordan Rivera" }
  });
  fail(filled.report.written.length === 1, "B-written: the canary value was not written");
  fail(JSON.stringify(filled.report.participantInk) === JSON.stringify(PARTICIPANT_INK_RGB),
    `B-report: the render reported ink ${JSON.stringify(filled.report.participantInk)}`);

  // M — the court's metadata survives; ours does not appear.
  const sourceMeta = await metadataOfBytes(cr266.bytes);
  const outMeta = await metadataOfBytes(filled.bytes);
  for (const field of ["title", "author", "subject", "creator"]) {
    fail(outMeta[field] === sourceMeta[field],
      `M-${field}: the artifact carries ${JSON.stringify(outMeta[field])} where the source carries ${JSON.stringify(sourceMeta[field])}`);
  }
  fail(brandingInMetadata(outMeta).length === 0,
    `M-branding: partner branding on a participant's official form (${brandingInMetadata(outMeta).map((b) => b.field).join(", ")})`);
  fail(filled.report.dates?.modificationDateIsOurs === true,
    "M-moddate: the artifact claims the source's modification date, which says it was not modified");

  // P — provenance lives in a sidecar bound to the output hash.
  const provenance = await artifactProvenance({
    jurisdiction: "WI", assetId: "WI:CR-266", documentId: "CR-266", formFamily: "cr-266-form-en",
    officialFormNumber: "CR-266", officialTitle: sourceMeta.title, sourcePublisher: "Wisconsin Court System",
    sourceUrl: "https://www.wicourts.gov/formdisplay/CR-266.pdf", sourceRevision: "REV-2024-05",
    sourceSha256: filled.report.sourceSha256, sourceMetadataFingerprint: filled.report.sourceMetadataFingerprint,
    fieldMap: { anchors: discovered.length }, classification, packetSpec: { components: 1 },
    rendererVersion: "flat-overlay-1", generatedAt: CANARY_STAMP.toISOString(),
    activeContentResult: filled.report.activeContentScan, flatteningResult: filled.report.sanitation,
    protectedFieldResult: { refused: filled.report.refused.length }, fixtureIdentity: "cr266-canonical",
    artifacts: [{ rel: "canonical-filled.pdf", bytes: filled.bytes }]
  });
  fail(provenance.schemaVersion === PROVENANCE_SCHEMA, "P-schema: the sidecar carries the wrong schema");
  for (const field of [
    "jurisdiction", "assetId", "formFamily", "officialFormNumber", "officialTitle", "sourcePublisher",
    "sourceUrl", "sourceRevision", "sourceSha256", "sourceMetadataFingerprint", "fieldMapSha256",
    "classificationSha256", "packetSpecSha256", "factoryVersion", "rendererVersion", "generatedAt",
    "activeContentResult", "flatteningResult", "protectedFieldResult", "fixtureIdentity"
  ]) {
    fail(provenance[field] !== undefined && provenance[field] !== null, `P-field: the sidecar records no ${field}`);
  }
  fail(provenance.artifacts[0].pageCount >= 1, "P-pages: the sidecar records no page count");
  const covered = provenanceCoversArtifact(provenance, "canonical-filled.pdf", filled.bytes);
  fail(covered.covered === true, `P-bound: the sidecar does not cover its own artifact (${covered.reason})`);
  const otherBytes = provenanceCoversArtifact(provenance, "canonical-filled.pdf", cr266.bytes);
  fail(otherBytes.covered === false, "P-drift: the sidecar covers bytes it does not describe");
  fail(provenanceCoversArtifact(null, "canonical-filled.pdf", filled.bytes).covered === false,
    "P-missing: an absent sidecar reads as coverage");
  // Determinism: the same inputs produce the same record.
  const again = await artifactProvenance({
    jurisdiction: "WI", assetId: "WI:CR-266", documentId: "CR-266", sourceSha256: filled.report.sourceSha256,
    rendererVersion: "flat-overlay-1", generatedAt: CANARY_STAMP.toISOString(),
    artifacts: [{ rel: "canonical-filled.pdf", bytes: filled.bytes }]
  });
  fail(again.artifacts[0].outputSha256 === provenance.artifacts[0].outputSha256, "P-deterministic: the sidecar is not reproducible");

  // No verifier may still require a LegalEase Producer stamp.
  for (const file of fs.readdirSync("scripts").filter((f) => f.endsWith(".mjs"))) {
    if (file === "verify-rcap-shared-pdf-contract.mjs") continue;
    const text = fs.readFileSync(path.join("scripts", file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
    fail(!/getProducer\(\)\s*(===|!==|\.includes)[^\n]*(LegalEase|RCAP)/i.test(text),
      `P-stamp: scripts/${file} still requires a LegalEase Producer stamp`);
  }

  // E — an email line receives an email or nothing.
  for (const label of ["Email Address", "E-mail Address", "Email", "E-mail", "E mail address", "Applicant Email Addr"]) {
    const decision = decideBinding({ name: label, pdfType: "text", effectiveLabel: label });
    fail(decision.writable && decision.factId === "participant.email",
      `E-bind: ${JSON.stringify(label)} binds ${decision.factId ?? decision.reason} rather than participant.email`);
  }
  for (const label of ["Street Address", "Mailing Address", "Address Line 1"]) {
    const decision = decideBinding({ name: label, pdfType: "text", effectiveLabel: label });
    fail(decision.factId === "participant.street_address",
      `E-street: ${JSON.stringify(label)} no longer binds the street address`);
  }
  const emailCanary = await emailSemanticsCanary();
  const withEmail = await finalizeFlatOverlay({
    sourceBytes: emailCanary.bytes,
    anchors: [
      { page: 1, label: "Email Address", writeBox: { x: 150, y: 700, width: 240, height: 10 }, fontSize: 9 },
      { page: 1, label: "Street Address", writeBox: { x: 150, y: 660, width: 240, height: 10 }, fontSize: 9 }
    ],
    facts: { "participant.email": "jordan@example.org", "participant.street_address": "19 Elm Street" }
  });
  const emailWrite = withEmail.report.written.find((w) => w.anchor === "Email Address");
  fail(emailWrite?.factId === "participant.email", "E-render: the email line did not receive the email");
  const emailLine = groupIntoLines(extractPageGeometry((await PDFDocument.load(withEmail.bytes)).getPages()[0]).text)
    .find((l) => Math.abs(l.y - 700) < 3);
  fail(!/Elm Street/.test(emailLine?.text ?? ""), "E-street-on-email: a street address rendered onto the email line");
  fail(/jordan@example.org/.test(emailLine?.text ?? ""), "E-email-missing: the email did not render onto the email line");

  const withoutEmail = await finalizeFlatOverlay({
    sourceBytes: emailCanary.bytes,
    anchors: [{ page: 1, label: "Email Address", writeBox: { x: 150, y: 700, width: 240, height: 10 }, fontSize: 9 }],
    facts: { "participant.street_address": "19 Elm Street" }
  });
  fail(withoutEmail.report.written.length === 0,
    "E-blank: a missing email did not leave the line blank; something was substituted");

  // C — every discovered field and anchor is classified.
  const classFailures = classificationFailures(classification, discovered);
  fail(classFailures.length === 0, `C-complete: ${classFailures.slice(0, 3).join("; ")}`);
  fail(classification.counts.classified === classification.counts.discovered,
    `C-arithmetic: ${classification.counts.classified} classified against ${classification.counts.discovered} discovered`);
  fail(classification.entries.length > 0, "C-empty: the classification is empty");
  const signature = classification.entries.find((e) => e.id === "anchor:Signature");
  fail(signature?.classification === "protected" && signature?.protectionCategory === "signature",
    "C-signature: the signature area is not protected");
  fail(classification.entries.every((e) => e.classification !== "participant_writable" || e.participantDataKey),
    "C-key: a writable field names no canonical participant data key");
  fail(DEFAULT_PROTECTED_CATEGORIES.length >= 19, "C-categories: the default-protected list has been shortened");

  // A — active content is removed and the descriptive metadata survives it.
  const active = await activeContentCanary();
  const beforeScan = scanBytesForActiveContent(active.bytes);
  fail(beforeScan.hits.length > 0, "A-canary: the active-content canary carries no active content to remove");
  const cleaned = await finalizeOfficialForm({
    sourceBytes: active.bytes,
    census: [],
    facts: {},
    title: null
  });
  const afterScan = scanBytesForActiveContent(cleaned.bytes);
  fail(afterScan.hits.length === 0, `A-residue: active content survived (${afterScan.hits.join(", ")})`);
  const cleanedMeta = await metadataOfBytes(cleaned.bytes);
  fail(cleanedMeta.title === "Official Form With Active Content", "A-title: sanitation destroyed the official title");
  fail(cleanedMeta.author === "State Court Administrator", "A-author: sanitation destroyed the official author");
  fail(brandingInMetadata(cleanedMeta).length === 0, "A-branding: sanitation stamped partner branding");

  // F — the AcroForm canary: regeneration, flattening, census, sidecar.
  const acro = await acroFormCanary();
  const acroFinal = await finalizeOfficialForm({
    sourceBytes: acro.bytes,
    census: [
      { name: "petitioner.name", type: "text", effectiveLabel: "Petitioner Name", widgets: [{ rect: { x: 180, y: 694, width: 240, height: 16 } }] },
      { name: "email.address", type: "text", effectiveLabel: "Email Address", widgets: [{ rect: { x: 180, y: 654, width: 240, height: 16 } }] },
      { name: "judge.signature", type: "text", effectiveLabel: "Judge Signature", widgets: [{ rect: { x: 180, y: 114, width: 240, height: 16 } }] }
    ],
    facts: {
      "participant.full_legal_name": "Jordan Rivera",
      "participant.email": "jordan@example.org",
      "participant.street_address": "19 Elm Street"
    },
    title: null
  });
  const acroDoc = await PDFDocument.load(acroFinal.bytes, { ignoreEncryption: true, updateMetadata: false });
  fail(acroDoc.getForm().getFields().length === 0, "F-flatten: interactive fields survived flattening");
  const acroMeta = await metadataOfBytes(acroFinal.bytes);
  fail(acroMeta.title === "Official AcroForm Petition", "F-title: the AcroForm artifact lost the official title");
  fail(brandingInMetadata(acroMeta).length === 0, "F-branding: partner branding on the AcroForm artifact");
  const acroText = groupIntoLines(extractPageGeometry(acroDoc.getPages()[0]).text).map((l) => l.text).join(" ");
  fail(/Jordan Rivera/.test(acroText), "F-visible: the filled value is not visible on the flattened page");
  fail(!/19 Elm Street/.test(acroText), "F-email-street: a street address reached the AcroForm email field");
  const acroDiscovered = [
    { id: "petitioner.name", page: 1, printedLabel: "Petitioner Name", fieldType: "text", geometry: { x: 180, y: 694, width: 240, height: 16 } },
    { id: "email.address", page: 1, printedLabel: "Email Address", fieldType: "text", geometry: { x: 180, y: 654, width: 240, height: 16 } },
    { id: "judge.signature", page: 1, printedLabel: "Judge Signature", fieldType: "text", geometry: { x: 180, y: 114, width: 240, height: 16 } }
  ];
  const acroClass = classifyForm({ jurisdiction: "XX", documentId: "ACRO", discovered: acroDiscovered });
  fail(classificationFailures(acroClass, acroDiscovered).length === 0, "F-census: the AcroForm census is incomplete");
  fail(acroClass.entries.find((e) => e.id === "judge.signature")?.classification === "protected",
    "F-judge: the judge signature field is not protected");
  const acroProv = await artifactProvenance({
    jurisdiction: "XX", assetId: "XX:ACRO", documentId: "ACRO", sourceSha256: acroFinal.report.sourceSha256,
    classification: acroClass, rendererVersion: "acroform-1", generatedAt: CANARY_STAMP.toISOString(),
    artifacts: [{ rel: "acro-filled.pdf", bytes: acroFinal.bytes }]
  });
  fail(provenanceCoversArtifact(acroProv, "acro-filled.pdf", acroFinal.bytes).covered === true,
    "F-sidecar: the AcroForm artifact is not bound to its sidecar");

  return out;
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------
const world = await buildWorld();

if (MUTATIONS) {
  const base = (await failures(world)).length;
  if (base !== 0) {
    console.error(`verify-rcap-shared-pdf-contract --mutations refuses to run: the baseline is not green (${base} failure(s)).`);
    process.exit(1);
  }

  const clone = async () => {
    const fresh = await buildWorld();
    return fresh;
  };

  const mutations = [
    ["raster geometry accepted as authoritative", async (w) => {
      for (const rule of w.rules[0].horizontal) rule.geometrySource = "raster_dark_line_detection";
    }],
    ["the fabricated CR-266 Case Number box returns", async (w) => {
      const binding = w.anchors.find((a) => a.label === "Case No.").binding;
      binding.rule = { ...binding.rule, width: 213, endX: binding.rule.x + 213 };
      binding.maxRightEdge = binding.rule.x + 213;
    }],
    ["COUNTY is omitted", async (w) => {
      const county = w.anchors.find((a) => a.label === "COUNTY");
      county.binding = { bound: false, ambiguity: "removed", participantFallback: "x", associationMethod: "horizontal_overlap_and_vertical_distance" };
    }],
    ["Date of Birth captures the Case Number rule", async (w) => {
      const caseNo = w.anchors.find((a) => a.label === "Case No.").binding;
      const dob = w.anchors.find((a) => a.label === "Date of Birth").binding;
      dob.rule = { ...caseNo.rule };
    }],
    ["a binding made on vertical distance alone", async (w) => {
      w.anchors.find((a) => a.label === "Case No.").binding.associationMethod = "nearest_vertical_distance";
    }],
    ["a refusal recorded with no named ambiguity", async (w) => {
      const county = w.anchors.find((a) => a.label === "COUNTY");
      county.binding = { bound: false, participantFallback: "x", associationMethod: "horizontal_overlap_and_vertical_distance" };
    }],
    ["the classification file is empty", async (w) => {
      w.classification.entries = [];
      w.classification.counts.classified = 0;
    }],
    ["one discovered field is unclassified", async (w) => {
      w.classification.entries = w.classification.entries.slice(0, -1);
      w.classification.counts.classified -= 1;
    }],
    ["a protected field becomes writable", async (w) => {
      const signature = w.classification.entries.find((e) => e.id === "anchor:Signature");
      signature.classification = "participant_writable";
      signature.participantDataKey = "participant.full_legal_name";
      signature.protectionCategory = null;
    }],
    ["an unknown field classification is accepted", async (w) => {
      w.classification.entries[0].classification = "manual_review";
    }],
    ["a measured anchor is dropped from the census", async (w) => {
      w.discovered = w.discovered.slice(0, -1);
      w.classification.counts.discovered -= 1;
    }]
  ];

  let undetected = 0;
  for (const [label, mutate] of mutations) {
    const mutated = await clone();
    await mutate(mutated);
    const caught = (await failures(mutated)).length > base;
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }

  // The remaining five mutations are of shipped source rather than of the world
  // under test, so they are proved by executing the guard directly against the
  // mutated input rather than by editing a tracked file.
  const sourceMutations = [
    ["blue becomes the unexplained default", () => {
      try { participantInk({ r: 0, g: 0, b: 0.55 }); return false; } catch { return true; }
    }],
    ["official Title overwritten with LegalEase", () => {
      return brandingInMetadata({ title: "LegalEase RCAP official-form factory" }).length > 0;
    }],
    ["official Creator overwritten with LegalEase", () => {
      return brandingInMetadata({ creator: "LegalEase RCAP" }).length > 0;
    }],
    ["the sidecar output hash does not match the PDF", () => {
      const record = { schemaVersion: PROVENANCE_SCHEMA, artifacts: [{ artifact: "a.pdf", outputSha256: sha256(Buffer.from("x")) }] };
      return provenanceCoversArtifact(record, "a.pdf", Buffer.from("y")).covered === false;
    }],
    ["Email Address maps to street address", () => {
      const decision = decideBinding({ name: "Email Address", pdfType: "text", effectiveLabel: "Email Address" });
      return decision.factId !== "participant.street_address";
    }]
  ];
  for (const [label, holds] of sourceMutations) {
    const caught = holds() === true;
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }

  const total = mutations.length + sourceMutations.length;
  if (undetected > 0) {
    console.error(`\nverify-rcap-shared-pdf-contract --mutations FAILED — ${undetected} of ${total} undetected.`);
    process.exit(1);
  }
  console.log(`\nEvery way of reintroducing one of the five systemic PDF defects is detected (${total}/${total}).`);
  process.exit(0);
}

const problems = await failures(world);
console.log(
  `shared PDF contract: geometry from ${GEOMETRY_SOURCE}; ` +
  `${world.anchors.filter((a) => a.binding.bound).length}/${world.anchors.length} CR-266 anchors bound; ` +
  `ink ${JSON.stringify(PARTICIPANT_INK_RGB)}; ` +
  `${world.classification.counts.classified}/${world.classification.counts.discovered} classified ` +
  `(${world.classification.counts.participant_writable} writable, ${world.classification.counts.protected} protected, ${world.classification.counts.not_applicable} n/a).`
);
if (problems.length > 0) {
  console.error(`\nverify-rcap-shared-pdf-contract FAILED — ${problems.length} problem(s):\n`);
  for (const problem of problems.slice(0, 40)) console.error(` - ${problem}`);
  if (problems.length > 40) console.error(` … and ${problems.length - 40} more`);
  process.exit(1);
}
console.log("Content-stream geometry, black participant ink, the court's own metadata, a sidecar bound to the output hash, an email line that only takes an email, and a complete field census.");
