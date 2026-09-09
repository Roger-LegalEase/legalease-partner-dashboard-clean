#!/usr/bin/env node
// hi_nonconviction_expungement-set — Hawaii Attorney General expungement
// application under HRS § 831-3.2, on HCJDC 159(b).
//
// WHAT THIS BUILDER REFUSES TO DO, AND WHY EACH REFUSAL IS HERE
//
// 1. It never retypes the controlling record. Everything the packet PRINTS
//    about the route -- the statute, the rule clauses, the timing, the facts
//    the participant must bring, the components -- is read at build time from
//    the compiled profile pathway and the route contract, and the build stops
//    if either record stops declaring what the packet prints. A builder that
//    retypes its own guidance goes stale silently the day the record changes;
//    three Illinois builders printed none of a ten-line requiredBeforeFiling
//    list because they never referenced the registry, and nine zero counters
//    never saw it.
//
// 2. It never shortens a value that does not fit. HCJDC 159(b) is a FLAT PDF:
//    no widgets, no /MaxLen, so the only limit is the measured width of the
//    printed rule the value sits on. A value that cannot be printed completely
//    is surfaced as a refusal carrying the held value and the measurement, and
//    named to the participant. It is never ellipsized, because a shortened
//    legal name on an agency application reads as a complete one.
//
// 3. It never writes the applicant's initials. The form's two initial cells sit
//    beside SWORN paragraphs -- the non-conviction paragraph has the applicant
//    declare "I am not a fugitive from justice" -- and typing initials there
//    would fabricate a sworn declaration. The route is stated by the packet in
//    its own instructions and field map instead. This is the treatment the
//    sibling family on this identical source already carries.
//
// 4. It measures its own output. addedGlyphsReadFromOutputBytes and
//    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes are computed by re-decoding
//    the SAVED PDF's content stream and differencing it against the blank
//    source's own text items -- not by counting the characters this script
//    believes it asked for. A finalizer's own report is the accused, not the
//    measurement.
//
// 5. Every write box is MEASURED off the source. The x/width of each blank is
//    the extent of the underscore run the form itself prints, and the initial
//    cells and checklist boxes are located from the form's own rules and box
//    glyphs. No coordinate in this file is authored; every one is read.
//
// This lane builds. It sets no verdict, issues no PASS, opens no commercial
// route and requests no approval.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { extractTextItems, extractPathSegments, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);

const FAMILY_ID = "hi_nonconviction_expungement-set";
const OUT_REL = "data/rcap-all50/overlays/census-v1/hi/hi-nonconviction-expungement-set--official-pdf-fill";
const ROUTE_KEY = "obligation:track-pathway:HI:hi_nonconviction_expungement:nonconviction-arrest-expungement";
const PATHWAY_ID = "nonconviction-arrest-expungement";
const PROFILE_REL = "src/lib/rcap-engine/compiled/profiles/HI-hawaii.json";
const ROUTE_CONTRACT_REL = "src/lib/legal-authority/routes/p0.json";
const ROUTE_CONTRACT_KEY = "HI:nonconviction-arrest-expungement";
const CORPUS_INDEX_REL = "data/rcap-all50/local-source-corpus-index.json";

const SOURCE = Object.freeze({
  documentId: "HCJDC-159B",
  sourceId: "official-form:HCJDC-159B",
  indexPath: "LegalEase Hawaii/EXPUNGEMENT_APPLICATION_Rev-2026-06.pdf",
  sha256: "1cb4f3acc20d569820379410c3aeb67c59fe3e24866932696371f25efaad935a",
  printedIdentity: "HCJDC 159(b) Rev. 06/03/2026"
});

// Deterministic document dates, so a rebuild from identical inputs produces
// identical bytes and the raster acceptance receipt keeps binding.
const FIXED_DATE = new Date("2026-09-09T00:00:00.000Z");

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

// ---------------------------------------------------------------------------
// 1. The controlling record, read rather than remembered.
// ---------------------------------------------------------------------------
function readControllingRecord() {
  const profile = JSON.parse(fs.readFileSync(PROFILE_REL, "utf8"));
  const pathway = (profile.pathways ?? []).find((p) => p.id === PATHWAY_ID);
  assert.ok(pathway, `${PROFILE_REL} no longer declares pathway ${PATHWAY_ID}; this packet prints from it and must not print from memory`);

  const contractFile = JSON.parse(fs.readFileSync(ROUTE_CONTRACT_REL, "utf8"));
  const contract = (contractFile.routes ?? []).find((r) => r.routeKey === ROUTE_CONTRACT_KEY);
  assert.ok(contract, `${ROUTE_CONTRACT_REL} no longer declares route ${ROUTE_CONTRACT_KEY}`);

  const authority = pathway.legalAuthority ?? {};
  // Each of these is PRINTED by the packet. If the record stops declaring one,
  // the packet would print a shorter guide than the route requires and nothing
  // would say so, so the build refuses instead.
  const required = {
    "pathway.label": pathway.label,
    "pathway.ruleClauses": pathway.ruleClauses,
    "pathway.waitingRules": pathway.waitingRules,
    "legalAuthority.statute": authority.statute,
    "legalAuthority.mechanism": authority.mechanism,
    "legalAuthority.packetFamily": authority.packetFamily,
    "legalAuthority.packetComponents": authority.packetComponents,
    "legalAuthority.requiredFacts": authority.requiredFacts,
    "legalAuthority.exclusions": authority.exclusions,
    "legalAuthority.notes": authority.notes,
    "contract.statute": contract.statute,
    "contract.requiredFacts": contract.requiredFacts,
    "contract.processingDeadlines": contract.processingDeadlines
  };
  for (const [key, value] of Object.entries(required)) {
    if (Array.isArray(value)) assert.ok(value.length > 0, `the controlling record declares an EMPTY ${key}; the packet prints it, so an empty declaration is a stop, not a shorter guide`);
    else assert.ok(typeof value === "string" && value.trim().length > 0, `the controlling record no longer declares ${key}; the packet prints it`);
  }
  // The two records must agree about the statute they are describing, or the
  // packet would print one route's authority under another route's heading.
  assert.equal(authority.statute, contract.statute, "the compiled profile and the route contract disagree about the statute");
  assert.equal(authority.decisionId, contract.decisionId, "the compiled profile and the route contract disagree about the legal decision id");
  assert.match(authority.statute, /831-3\.2/, "this family is the HRS § 831-3.2 non-conviction route; the record now names a different statute");

  return {
    pathway, contract, authority,
    recordDigest: {
      profile: `${PROFILE_REL}@${sha256(fs.readFileSync(PROFILE_REL))}`,
      routeContract: `${ROUTE_CONTRACT_REL}@${sha256(fs.readFileSync(ROUTE_CONTRACT_REL))}`
    }
  };
}

// ---------------------------------------------------------------------------
// 2. The source, bound by exact SHA-256.
// ---------------------------------------------------------------------------
function resolveSource() {
  const index = JSON.parse(fs.readFileSync(CORPUS_INDEX_REL, "utf8"));
  const entry = index.entries.find((row) => row.path === SOURCE.indexPath);
  assert.ok(entry, `the committed corpus index carries no entry at ${SOURCE.indexPath}`);
  assert.equal(entry.sha256, SOURCE.sha256, `the committed index has re-pinned ${SOURCE.indexPath}; this build binds one exact digest`);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  const absolute = resolver.resolve(entry);
  assert.ok(absolute && fs.existsSync(absolute), `the custody holding ${SOURCE.indexPath} is not mounted here`);
  const bytes = fs.readFileSync(absolute);
  assert.equal(sha256(bytes), SOURCE.sha256, `source drift at ${SOURCE.indexPath}`);
  return { bytes, byteLength: bytes.length, custody: entry.custody, declaredPath: entry.path };
}

// ---------------------------------------------------------------------------
// 3. The form's own geometry, measured out of the source bytes.
//
// Nothing below is an authored coordinate. Each entry rule is the extent of the
// underscore run the form draws; each checklist control is the box glyph the
// form draws; each initial cell is bounded by the table rules the form draws.
// ---------------------------------------------------------------------------
const BOX_GLYPH = 61551; // the Wingdings empty box HCJDC 159(b) prints for its checklist

function characterCells(line) {
  const cells = [];
  for (const run of line.runs) {
    const per = (run.x2 - run.x) / Math.max(1, run.text.length);
    for (let i = 0; i < run.text.length; i += 1) {
      cells.push({ ch: run.text[i], x: run.x + per * i, x2: run.x + per * (i + 1), size: run.size });
    }
  }
  return cells;
}

/** Every printed underscore rule on a line, as measured spans. */
function ruleSpans(line) {
  const spans = [];
  let current = null;
  for (const cell of characterCells(line)) {
    if (cell.ch === "_") {
      if (current) current.x2 = cell.x2;
      else current = { x: cell.x, x2: cell.x2, size: cell.size };
      continue;
    }
    // A single narrow space inside a rule run is kerning, not the end of it.
    if (current && cell.ch === " " && cell.x2 - cell.x < 3) continue;
    if (current) { spans.push(current); current = null; }
  }
  if (current) spans.push(current);
  return spans;
}

function measureSource(page) {
  const lines = groupIntoLines(extractTextItems(page));
  const paths = extractPathSegments(page);

  const lineStartingWith = (prefix) => {
    const hits = lines.filter((l) => l.text.startsWith(prefix));
    assert.equal(hits.length, 1, `expected exactly one line beginning ${JSON.stringify(prefix)} on ${SOURCE.documentId}; found ${hits.length}`);
    return hits[0];
  };
  const rule = (prefix, ordinal = 0) => {
    const line = lineStartingWith(prefix);
    const spans = ruleSpans(line);
    assert.ok(spans[ordinal], `${SOURCE.documentId} no longer prints rule #${ordinal + 1} on the line ${JSON.stringify(prefix)}`);
    return { ...spans[ordinal], baseline: line.y, printedLine: line.text };
  };

  const entryRules = {
    current_legal_name: rule("Current Legal Name", 0),
    other_names_used: rule("Other Names Used", 0),
    social_security_number: rule("Social Security Number", 0),
    date_of_birth: rule("Social Security Number", 1),
    sex_marker_m: rule("Social Security Number", 2),
    sex_marker_f: rule("Social Security Number", 3),
    home_address: rule("Home Address", 0),
    mailing_address: rule("Mailing Address", 0),
    phone: rule("Phone:", 0),
    email: rule("Phone:", 1),
    applicant_signature: rule("___", 0),
    signature_date: rule("___", 1)
  };
  for (const [id, span] of Object.entries(entryRules)) {
    assert.ok(span.x2 - span.x > 8, `measured rule ${id} is only ${(span.x2 - span.x).toFixed(1)}pt wide; the source layout has moved`);
  }

  // The checklist controls: the form's own box glyphs, left to right, top to bottom.
  const checklistBoxes = [];
  for (const line of lines) {
    for (const run of line.runs) {
      if (![...run.text].some((c) => c.charCodeAt(0) === BOX_GLYPH)) continue;
      checklistBoxes.push({ x: run.x, x2: run.x2, baseline: line.y, printedLine: line.text });
    }
  }
  checklistBoxes.sort((a, b) => b.baseline - a.baseline || a.x - b.x);
  assert.equal(checklistBoxes.length, 5, `${SOURCE.documentId} prints ${checklistBoxes.length} checklist boxes; this build maps 5`);

  // The two initial cells: the narrow left column of the two paragraph tables.
  const verticalRules = paths.filter((p) => p.operator === "re" && p.width < 1 && p.height > 20);
  const cellColumns = [...new Set(verticalRules.map((p) => Number(p.x.toFixed(2))))].sort((a, b) => a - b);
  assert.ok(cellColumns.length >= 2, "the paragraph tables no longer print their column rules");
  const initialCellLeft = cellColumns[0];
  const initialCellRight = cellColumns[1];
  assert.ok(initialCellRight - initialCellLeft > 20 && initialCellRight - initialCellLeft < 60,
    `the initial column measures ${(initialCellRight - initialCellLeft).toFixed(1)}pt; the source layout has moved`);
  const paragraphRow = (prefix) => {
    const line = lineStartingWith(prefix);
    return { x: initialCellLeft, x2: initialCellRight, baseline: line.y, printedLine: line.text };
  };

  // The agency's own reserved area, read from the form's own instruction.
  const agencyOnlyLine = lines.find((l) => /LEAVE BLANK; HCJDC USE ONLY/i.test(l.text));
  assert.ok(agencyOnlyLine, `${SOURCE.documentId} no longer prints its LEAVE BLANK; HCJDC USE ONLY instruction`);
  const agencyBox = paths.find((p) => p.operator === "re" && p.width > 100 && p.height > 100);
  assert.ok(agencyBox, "the HCJDC-use-only box is no longer drawn on the form");

  const printedIdentity = lines.find((l) => l.text.startsWith("HCJDC 159"));
  assert.ok(printedIdentity && printedIdentity.text.trim() === SOURCE.printedIdentity,
    `the form now prints its identity as ${JSON.stringify(printedIdentity?.text)}, not ${JSON.stringify(SOURCE.printedIdentity)}`);

  return {
    entryRules,
    checklistBoxes,
    initialCells: {
      nonconviction: paragraphRow("Expungement of Non-Conviction Information"),
      conviction: paragraphRow("Expungement of First-time Drug Offender")
    },
    agencyOnly: { x: agencyBox.x, x2: agencyBox.x + agencyBox.width, y: agencyBox.y, y2: agencyBox.y + agencyBox.height, printedLine: agencyOnlyLine.text },
    lines
  };
}

// ---------------------------------------------------------------------------
// 4. Fixtures. Synthetic participants used to exercise the layout; the boundary
//    fixture is the long-value stress case for every measured rule.
// ---------------------------------------------------------------------------
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Reyes, Jordan Avery",
    "participant.date_of_birth": "06/14/1988",
    "participant.home_address": "412 Aloha Street, Honolulu, HI 96813",
    "participant.mailing_address": "412 Aloha Street, Honolulu, HI 96813",
    "participant.phone": "808-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Montgomery-Washington, Alexandria Catherine Kahananui",
    "participant.date_of_birth": "12/31/1979",
    "participant.home_address": "1188 Kalanianaole Highway Apartment 1407, Honolulu, Hawaii 96821-4417",
    "participant.mailing_address": "Post Office Box 61407, Kailua, Hawaii 96734-1407",
    "participant.phone": "(808) 555-0199 extension 4417",
    "participant.email": "alexandria.montgomery.washington@example.org"
  }
};

const WRITE_PLAN = [
  { id: "current_legal_name", rule: "current_legal_name", label: "Current Legal Name (Last, First, Middle)", factId: "participant.full_legal_name" },
  { id: "date_of_birth", rule: "date_of_birth", label: "Date of Birth", factId: "participant.date_of_birth" },
  { id: "home_address", rule: "home_address", label: "Home Address", factId: "participant.home_address" },
  { id: "mailing_address", rule: "mailing_address", label: "Mailing Address", factId: "participant.mailing_address" },
  { id: "phone", rule: "phone", label: "Phone", factId: "participant.phone" },
  { id: "email", rule: "email", label: "Email", factId: "participant.email" }
];

const MIN_SIZE = 6;
const MAX_SIZE = 8;
const INSET = 1.5;      // left inset inside the printed rule
const CLEARANCE = 1.5;  // baseline lift so the value sits on the rule, not through it

/**
 * The complete value at the largest size that fits the MEASURED rule, or null.
 *
 * Never shortens. A value that does not fit at MIN_SIZE is returned as null and
 * the caller surfaces it as a refusal carrying the held value and the
 * measurement, because a value that cannot be printed completely is a failure to
 * surface and never a value silently shortened.
 */
function completeFit(font, value, span) {
  const available = (span.x2 - span.x) - INSET * 2;
  for (let size = MAX_SIZE; size >= MIN_SIZE; size -= 0.25) {
    const width = font.widthOfTextAtSize(value, size);
    if (width <= available) return { size, width, available };
  }
  return { size: null, width: font.widthOfTextAtSize(value, MIN_SIZE), available };
}

async function renderFixture(sourceBytes, geometry, facts) {
  const pdf = await PDFDocument.load(sourceBytes);
  assert.equal(pdf.getPageCount(), 1, `${SOURCE.documentId} is a one-page form`);
  assert.equal(pdf.getForm().getFields().length, 0, `${SOURCE.documentId} must remain the measured flat source; a widget appeared`);
  const page = pdf.getPage(0);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const written = [];
  const unfittable = [];
  for (const plan of WRITE_PLAN) {
    const span = geometry.entryRules[plan.rule];
    const value = facts[plan.factId];
    assert.ok(typeof value === "string" && value.trim().length > 0, `fixture holds no value for ${plan.factId}`);
    const fit = completeFit(font, value, span);
    if (fit.size === null) {
      // Refuse, complete, with the measurement. Never truncate.
      unfittable.push({
        fieldId: `${SOURCE.documentId}:${plan.id}`, fieldName: plan.id, effectiveLabel: plan.label,
        documentId: SOURCE.documentId, page: 1, factId: plan.factId,
        heldValue: value,
        measurement: { ruleWidthPt: Number((span.x2 - span.x).toFixed(2)), availableWidthPt: Number(fit.available.toFixed(2)), requiredWidthPtAtMinimumSize: Number(fit.width.toFixed(2)), minimumSizePt: MIN_SIZE }
      });
      continue;
    }
    const x = span.x + INSET;
    const y = span.baseline + CLEARANCE;
    page.drawText(value, { x, y, size: fit.size, font, color: rgb(0, 0, 0) });
    written.push({
      fieldId: `${SOURCE.documentId}:${plan.id}`, fieldName: plan.id, effectiveLabel: plan.label,
      documentId: SOURCE.documentId, page: 1, factId: plan.factId, drawnText: value,
      fontSize: fit.size,
      /*
       * THE WRITE BOX IS THE BLANK THE FORM PRINTS, not the width this script
       * computed for the string.
       *
       * The reader that measures the delivered bytes reconstructs a glyph run's
       * width from nominal metrics (metricsExact is false for an embedded
       * subset), so its extent and pdf-lib's exact Helvetica metric differ by a
       * few percent. Scoring containment against the exact metric therefore
       * reported every correctly-placed value as ink outside its box -- a
       * measurement artefact reported as a visual defect, which is the failure
       * mode this whole counter exists to catch, pointed backwards.
       *
       * The blank the form draws is the box that actually matters: ink outside
       * it is ink on another line or off the rule. The value is separately
       * guaranteed to fit that rule at its exact metric by completeFit, so
       * nothing is loosened by measuring against the rule.
       */
      rect: {
        x: Number(span.x.toFixed(2)),
        y: Number((span.baseline - 2).toFixed(2)),
        width: Number((span.x2 - span.x).toFixed(2)),
        height: Number((fit.size + 4).toFixed(2))
      },
      exactTextExtent: { x: Number(x.toFixed(2)), baseline: Number(y.toFixed(2)), widthAtExactMetrics: Number(fit.width.toFixed(2)), ruleWidthPt: Number((span.x2 - span.x).toFixed(2)) },
      measuredRule: { x: Number(span.x.toFixed(2)), x2: Number(span.x2.toFixed(2)), baseline: span.baseline, printedLine: span.printedLine }
    });
  }

  pdf.setTitle(`${FAMILY_ID} — ${SOURCE.printedIdentity}`);
  pdf.setAuthor("LegalEase packet factory");
  pdf.setSubject("Hawaii Attorney General expungement application under HRS § 831-3.2");
  pdf.setCreator("scripts/build-census-v1-hi_nonconviction_expungement-set.mjs");
  pdf.setProducer("pdf-lib 1.17.1");
  pdf.setCreationDate(FIXED_DATE);
  pdf.setModificationDate(FIXED_DATE);
  const bytes = Buffer.from(await pdf.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  return { bytes, written, unfittable };
}

// ---------------------------------------------------------------------------
// 5. The measurement of the DELIVERED bytes.
//
// The output is re-loaded from the bytes that were saved and differenced
// against the blank source. Nothing here consults what the renderer said it
// did.
// ---------------------------------------------------------------------------
const glyphKey = (item) => `${item.text}@${item.x.toFixed(1)},${item.y.toFixed(1)},${item.size}`;
const inkOf = (text) => String(text ?? "").replace(/\s/g, "").length;

async function measureOutput(outputBytes, sourceItems, declaredWrites, protectedBoxes) {
  const pdf = await PDFDocument.load(outputBytes);
  const page = pdf.getPage(0);

  const baseline = new Map();
  for (const item of sourceItems) baseline.set(glyphKey(item), (baseline.get(glyphKey(item)) ?? 0) + 1);

  const added = [];
  for (const item of extractTextItems(page)) {
    const key = glyphKey(item);
    const remaining = baseline.get(key) ?? 0;
    if (remaining > 0) { baseline.set(key, remaining - 1); continue; }
    added.push(item);
  }

  const inBox = (item, box) => {
    const x2 = item.x + (item.width ?? 0);
    return item.x >= box.x - 1 && x2 <= box.x + box.width + 1
      && item.y >= box.y - 1 && item.y <= box.y + box.height + 1;
  };
  const boxes = declaredWrites.map((w) => w.rect);
  const outside = added.filter((item) => inkOf(item.text) > 0 && !boxes.some((b) => inBox(item, b)));

  // A refused field carries ink when added ink lands inside its measured area.
  const refusedWithInk = [];
  for (const area of protectedBoxes) {
    const hits = added.filter((item) => inkOf(item.text) > 0
      && item.x + (item.width ?? 0) >= area.x && item.x <= area.x2
      && item.y >= area.y - 2 && item.y <= area.y2 + 2);
    if (hits.length) refusedWithInk.push({ fieldId: area.fieldId, glyphs: hits.reduce((n, h) => n + inkOf(h.text), 0) });
  }

  // Flat in, flat out: a widget appearance in the output would be ink the
  // official form does not print. Measured, not assumed.
  const widgetAppearances = pdf.getPages().reduce((n, p) => n + (p.node.Annots()?.size() ?? 0), 0);

  return {
    addedGlyphsReadFromOutputBytes: added.reduce((n, item) => n + inkOf(item.text), 0),
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: outside.reduce((n, item) => n + inkOf(item.text), 0),
    glyphsOutsideDetail: outside.slice(0, 10).map((i) => ({ text: i.text, x: Number(i.x.toFixed(1)), y: Number(i.y.toFixed(1)) })),
    flattenedWidgetAppearancesReadFromOutputBytes: widgetAppearances,
    acroFieldsInOutput: pdf.getForm().getFields().length,
    refusedFieldsWithInk: refusedWithInk
  };
}

// ---------------------------------------------------------------------------
// 6. The classified blanks.
// ---------------------------------------------------------------------------
function blankPlan(geometry) {
  const [signatureBox, photoIdBox, mailingBox, courtOrderBox, paymentBox] = geometry.checklistBoxes;
  return [
    {
      id: "other_names_used", label: "Other Names Used", area: geometry.entryRules.other_names_used,
      requiredBeforeFiling: true, factId: "participant.other_names_used",
      participantMustSupply: "every other name you have used — maiden, married, former, or alias — or write NONE",
      reason: "the platform holds no alias history for this participant, and an agency application that omits a name it should carry is returned"
    },
    {
      id: "social_security_number", label: "Optional Social Security Number", area: geometry.entryRules.social_security_number,
      disposition: "OPTIONAL_PARTICIPANT_CONTENT",
      reason: "optional participant-authored identifier; the form prints \"SSN is optional\" beside it and the platform does not invent it"
    },
    {
      id: "sex_marker_m", label: "Sex marker M", area: geometry.entryRules.sex_marker_m,
      requiredBeforeFiling: true, factId: "participant.sex_marker",
      participantMustSupply: "mark M or F, whichever matches the arrest record being expunged",
      reason: "the screening record holds no sex marker for this participant and this build never supplies a personal declaration"
    },
    {
      id: "sex_marker_f", label: "Sex marker F", area: geometry.entryRules.sex_marker_f,
      requiredBeforeFiling: true, factId: "participant.sex_marker",
      participantMustSupply: "mark M or F, whichever matches the arrest record being expunged",
      reason: "the screening record holds no sex marker for this participant and this build never supplies a personal declaration"
    },
    /*
     * The two INITIAL CELLS are writing blanks, not tick boxes: the applicant
     * writes letters in them. They are recorded as text blanks for that reason,
     * and the paragraph each one belongs to is named.
     */
    {
      id: "initial_nonconviction_paragraph",
      label: "Initial cell beside the Expungement of Non-Conviction Information paragraph",
      printedLabel: "Expungement of Non-Conviction Information:",
      area: geometry.initialCells.nonconviction,
      requiredBeforeFiling: true, factId: null,
      participantMustSupply: "write your initials in this cell — it is the paragraph this packet is built for, and initialling it is your own sworn declaration",
      reason: "this cell is the applicant's sworn declaration under HRS § 831-3.2, including the declaration that the applicant is not a fugitive from justice; no packet may write an applicant's initials on a sworn paragraph"
    },
    {
      id: "initial_conviction_paragraph",
      /*
       * Described by the statutory branch it belongs to rather than by the
       * adjective its printed caption opens with. The caption reads
       * "Expungement of First-time Drug Offender, Property Offender, and/or DUI
       * <21", and the shared field classifier reads the bare word "time" inside
       * "First-time" as a court-assigned hearing time -- which would have
       * recorded an applicant's initial cell as a field "the court completes at
       * or after filing". That statement would be false in the packet's own
       * record. The exact printed caption is preserved on printedLabel.
       */
      label: "Initial cell beside the conviction-expungement paragraph under HRS §§ 706-622.5, 706-622.8, 706-622.9 and 291E-0064(e)",
      printedLabel: "Expungement of First-time Drug Offender, Property Offender, and/or DUI <21:",
      area: geometry.initialCells.conviction,
      disposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      routeConditionThatMakesItInapplicable: "this family is the HRS § 831-3.2 NON-CONVICTION arrest route; that paragraph is the HRS §§ 706-622.5, 706-622.8, 706-622.9 and 291E-0064(e) conviction-expungement branch of the same form, and it requires a court order granting expungement of a conviction that this route never produces",
      reason: "the conviction-expungement branch of this form belongs to a different statutory route"
    },
    /*
     * The five CHECKLIST BOXES are the form's own box glyphs under "Before
     * submitting the application, confirm these items are complete". Each is a
     * confirmation of an act the platform cannot observe and must never
     * certify: that the applicant signed, attached identification, reviewed the
     * address, or enclosed payment.
     *
     * They are declared required-before-filing so the completeness contract
     * holds the packet to DISCLOSING each one to the participant. The contract
     * reaches that disposition on a selection control only through the
     * case-determined channel, so each carries an explicit reason the ROUTE
     * cannot determine it -- which is the plain truth here: no statutory route
     * decides whether this applicant put a photo ID in the envelope.
     */
    {
      id: "checklist_signature", label: "Checklist box: Signature of applicant", printedLabel: "Signature of applicant",
      area: signatureBox, requiredBeforeFiling: true, factId: null, isSelectionControl: true,
      determinedByTheCaseNotTheRoute: true,
      whyTheRouteCannotDetermineIt: "the box confirms that the applicant has personally signed; a statutory route cannot determine whether a signature has been made, and this packet never signs",
      participantMustSupply: "check this box only after you have personally signed the application",
      reason: "this mark certifies an act only the applicant performs"
    },
    {
      id: "checklist_photo_id", label: "Checklist box: Copy of valid government-issued photo ID of applicant", printedLabel: "Copy of valid government-issued photo ID of applicant",
      area: photoIdBox, requiredBeforeFiling: true, factId: null, isSelectionControl: true,
      determinedByTheCaseNotTheRoute: true,
      whyTheRouteCannotDetermineIt: "the box confirms an attachment was enclosed; whether this applicant enclosed a copy of their identification is a fact about this envelope, not about the statutory route, and the platform holds no such fact",
      participantMustSupply: "attach a copy of your valid government-issued photo ID, then check this box",
      reason: "this mark certifies an attachment only the applicant can supply"
    },
    {
      id: "checklist_mailing_address", label: "Checklist box: Mailing Address", printedLabel: "Mailing Address",
      area: mailingBox, requiredBeforeFiling: true, factId: null, isSelectionControl: true,
      determinedByTheCaseNotTheRoute: true,
      whyTheRouteCannotDetermineIt: "the box confirms the applicant has reviewed where the expungement certificate will be mailed; the route cannot make that confirmation on the applicant's behalf, and the address written above it is the platform's record rather than the applicant's check of it",
      participantMustSupply: "confirm the mailing address printed on the application is the one you want the certificate mailed to, then check this box",
      reason: "this mark certifies the applicant's own review of where the certificate will be sent"
    },
    {
      id: "checklist_court_order", label: "Checklist box: Court Order Granting Expungement, if applicable", printedLabel: "Court Order Granting Expungement, if applicable",
      area: courtOrderBox,
      disposition: "NOT_APPLICABLE_ON_THIS_ROUTE", isSelectionControl: true,
      routeConditionThatMakesItInapplicable: "the form limits this attachment to applications to expunge a CONVICTION, and prints that such applications without the court order will be denied; this route expunges non-conviction arrest information and produces no such order",
      reason: "the attachment belongs to the conviction branch of this form"
    },
    {
      id: "checklist_payment", label: "Checklist box: Payment — Money Order or Cashier's Check issued in the United States", printedLabel: "Payment – Money Order or Cashier's Check issued in the United States",
      area: paymentBox, requiredBeforeFiling: true, factId: null, isSelectionControl: true,
      determinedByTheCaseNotTheRoute: true,
      whyTheRouteCannotDetermineIt: "the box confirms payment was enclosed; the fee amount depends on whether this is a first-time expungement, which the platform does not hold, and whether payment was enclosed is an act of the applicant rather than a determination of the route",
      participantMustSupply: "enclose the money order or cashier's check payable to \"State of Hawaii\" in the amount the form prints, then check this box",
      reason: "this mark certifies an enclosure only the applicant can supply"
    },
    {
      id: "applicant_signature", label: "Signature of applicant", area: geometry.entryRules.applicant_signature,
      refusalClass: "signature_or_date_participant_completion", role: "protected",
      reason: "signature or date field; never prefilled — the applicant signs personally after the packet is complete"
    },
    {
      id: "signature_date", label: "Signature date", area: geometry.entryRules.signature_date,
      refusalClass: "signature_or_date_participant_completion", role: "protected",
      reason: "signature or date field; never prefilled — a date written before signing would be false"
    },
    {
      id: "hcjdc_use_only_area", label: "LEAVE BLANK; HCJDC USE ONLY area", area: { x: geometry.agencyOnly.x, x2: geometry.agencyOnly.x2, baseline: geometry.agencyOnly.y2 },
      refusalClass: "court_prosecutor_clerk_or_agency_owned", role: "agency",
      reason: "court, clerk, prosecutor, agency, or hearing field — the form prints LEAVE BLANK; HCJDC USE ONLY across it"
    }
  ];
}

function toFieldMapRow(blank) {
  const area = blank.area ?? {};
  return {
    fieldId: `${SOURCE.documentId}:${blank.id}`,
    fieldName: blank.id,
    effectiveLabel: blank.label,
    ...(blank.printedLabel ? { printedLabel: blank.printedLabel } : {}),
    documentId: SOURCE.documentId,
    page: 1,
    reason: blank.reason,
    ...(blank.isSelectionControl ? { isSelectionControl: true } : {}),
    ...(blank.requiredBeforeFiling
      ? {
        completenessDisposition: "REQUIRED_BEFORE_FILING",
        requiredBeforeFiling: true,
        factAvailable: false,
        routeDetermined: false,
        role: "participant",
        factId: blank.factId ?? null,
        participantMustSupply: blank.participantMustSupply,
        ...(blank.determinedByTheCaseNotTheRoute
          ? { determinedByTheCaseNotTheRoute: true, whyTheRouteCannotDetermineIt: blank.whyTheRouteCannotDetermineIt }
          : {})
      }
      : {}),
    ...(blank.disposition ? { completenessDisposition: blank.disposition } : {}),
    ...(blank.routeConditionThatMakesItInapplicable ? { routeConditionThatMakesItInapplicable: blank.routeConditionThatMakesItInapplicable } : {}),
    ...(blank.refusalClass ? { refusalClass: blank.refusalClass, role: blank.role } : {}),
    measuredArea: { x: Number((area.x ?? 0).toFixed(2)), x2: Number((area.x2 ?? 0).toFixed(2)), baseline: area.baseline ?? null }
  };
}

// ---------------------------------------------------------------------------
// 7. The participant guide, printed FROM the controlling record.
// ---------------------------------------------------------------------------
function participantInstructions(record, blanks, unfittable) {
  const { pathway, authority, contract } = record;
  const required = blanks.filter((b) => b.requiredBeforeFiling);
  const lines = [];
  lines.push(`# ${authority.packetFamily}`);
  lines.push("");
  lines.push(`**Route:** ${pathway.label}`);
  lines.push(`**Mechanism:** ${authority.mechanism} (${authority.statute})`);
  lines.push(`**Form:** ${SOURCE.documentId} — ${SOURCE.printedIdentity}`);
  lines.push("");
  lines.push("## What this route is, in the record's own words");
  lines.push("");
  for (const clause of pathway.ruleClauses) lines.push(`- ${clause}`);
  lines.push("");
  lines.push(`> ${authority.notes}`);
  lines.push("");
  lines.push("## Timing");
  lines.push("");
  // The pathway's waiting rules and the contract's processing deadlines are two
  // records of the same route and overlap by design; the participant is shown
  // each statement once, in the order the records declare them.
  const timing = [];
  const addTiming = (text) => {
    const normalized = String(text).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (timing.some((t) => t.normalized === normalized)) return;
    timing.push({ normalized, text: String(text) });
  };
  for (const waitingRule of pathway.waitingRules) addTiming(waitingRule);
  for (const deadline of contract.processingDeadlines) addTiming(`${deadline.label} — ${deadline.note}`);
  for (const entry of timing) lines.push(`- ${entry.text}`);
  lines.push("");
  lines.push("## What this packet contains");
  lines.push("");
  for (const component of authority.packetComponents) lines.push(`- ${component}`);
  lines.push("");
  lines.push("The written application is the document in this packet. The disposition documentation is yours to obtain and attach; this packet does not contain it and cannot obtain it for you.");
  lines.push("");
  lines.push("## Required before filing — you must complete each of these yourself");
  lines.push("");
  for (const blank of required) lines.push(`- **${blank.label}** — ${blank.participantMustSupply}`);
  if (unfittable.length) {
    lines.push("");
    lines.push("### Values this packet held but could not print completely");
    lines.push("");
    lines.push("The printed rule on the official form is too narrow for the complete value below. Nothing was shortened: the blank was left empty rather than printed as a partial value that would read as a whole one. Write the value out by hand, continuing above or below the rule if you must.");
    lines.push("");
    for (const item of unfittable) {
      lines.push(`- **${item.effectiveLabel}** — the complete value is \`${item.heldValue}\`. The form's rule measures ${item.measurement.ruleWidthPt}pt and the value needs ${item.measurement.requiredWidthPtAtMinimumSize}pt even at ${item.measurement.minimumSizePt}pt type.`);
    }
  }
  lines.push("");
  lines.push("## Facts the route turns on — check each against your own record before you file");
  lines.push("");
  for (const fact of contract.requiredFacts) lines.push(`- ${fact}`);
  lines.push("");
  lines.push("## When this route does not apply");
  lines.push("");
  lines.push("The form itself prints the circumstances in which an expungement order **shall not** be issued. Read them on the application before you file. The record additionally names these as the points that decide the route:");
  lines.push("");
  for (const exclusion of authority.exclusions) lines.push(`- ${exclusion}`);
  lines.push("");
  lines.push("## Nothing in this packet is legal advice, and nothing in it is approved for filing on your behalf");
  lines.push("");
  lines.push("No part of this application has been signed, initialled, dated, notarised or adopted by anyone. Every declaration on it is yours to make.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function filingInstructions(record, geometry) {
  const { authority, contract } = record;
  const address = geometry.lines
    .filter((l) => l.y < 75 && l.y > 30)
    .map((l) => l.text)
    .filter((t) => t && !t.startsWith("HCJDC 159"));
  const lines = [];
  lines.push("# Filing instructions");
  lines.push("");
  lines.push(`**Route:** ${authority.mechanism} — ${authority.statute}`);
  lines.push(`**Outcome mode:** ${authority.outcomeMode} — this is an application to a state agency, not a petition to a court.`);
  lines.push("");
  lines.push("## Where it goes");
  lines.push("");
  lines.push("The form prints its own submission block:");
  lines.push("");
  for (const line of address) lines.push(`    ${line}`);
  lines.push("");
  lines.push("## What goes with it");
  lines.push("");
  lines.push("- A copy of your valid official government-issued photo ID.");
  lines.push("- Payment by money order or cashier's check issued in the United States, payable to \"State of Hawaii\". Personal checks are not accepted. The amounts printed on the form are $35 for a first-time expungement, $50 for a non-first-time expungement and $20 for a duplicate certificate; $10 of the fee is non-refundable.");
  lines.push("- A self-addressed stamped envelope.");
  lines.push("- Your disposition documentation.");
  lines.push("");
  lines.push("## Service");
  lines.push("");
  lines.push("No party is served. This is an agency application; there is no opposing party and no certificate of service.");
  lines.push("");
  lines.push("## After it is sent");
  lines.push("");
  for (const deadline of contract.processingDeadlines) lines.push(`- ${deadline.label}: ${deadline.note}`);
  lines.push("- The form states the certificate is mailed to the address provided within 120 days, as authorized by HRS §831-3.2(a).");
  lines.push("- The form states that because of the confidentiality of arrest records, no information — including application status — is given over the phone or by email.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

// ---------------------------------------------------------------------------
// 8. Build.
// ---------------------------------------------------------------------------
async function build() {
  const record = readControllingRecord();
  const source = resolveSource();

  const sourcePdf = await PDFDocument.load(source.bytes);
  const sourcePage = sourcePdf.getPage(0);
  const geometry = measureSource(sourcePage);
  const sourceItems = extractTextItems(sourcePage);

  const blanks = blankPlan(geometry);
  const protectedAreas = blanks
    .filter((b) => b.role === "protected" || b.role === "agency")
    .map((b) => ({
      fieldId: `${SOURCE.documentId}:${b.id}`,
      x: b.area.x, x2: b.area.x2,
      y: (b.id === "hcjdc_use_only_area") ? geometry.agencyOnly.y : b.area.baseline,
      y2: (b.id === "hcjdc_use_only_area") ? geometry.agencyOnly.y2 : b.area.baseline + 10
    }));

  const out = path.join(ROOT, OUT_REL);
  fs.mkdirSync(path.join(out, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(out, "reports"), { recursive: true });

  /*
   * Fixtures are staged, measured and only then published.
   *
   * A family that fails its own integrity checks must leave no half-built
   * directory: a partly-built packet that reads as built is worse than one that
   * was never started. So each artifact is written under a staging name,
   * measured from the bytes on disk, and renamed into place only after every
   * check below has passed.
   */
  const staged = [];
  const rendered = {};
  try {
    for (const [name, facts] of Object.entries(FIXTURES)) {
      const packet = await renderFixture(source.bytes, geometry, facts);
      const stagePath = path.join(out, "fixtures", `${name}.pdf.staging`);
      fs.writeFileSync(stagePath, packet.bytes);
      staged.push([stagePath, path.join(out, "fixtures", `${name}.pdf`)]);
      const onDisk = fs.readFileSync(stagePath);
      assert.equal(sha256(onDisk), sha256(packet.bytes), `${name}.pdf did not survive the write`);
      const measured = await measureOutput(onDisk, sourceItems, packet.written, protectedAreas);
      rendered[name] = { ...packet, bytes: onDisk, measured };
    }

    const outsideNow = Object.entries(rendered).filter(([, r]) => r.measured.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes > 0);
    const refusedInkNow = Object.entries(rendered).filter(([, r]) => r.measured.refusedFieldsWithInk.length > 0);
    const invisibleNow = Object.entries(rendered).filter(([, r]) => r.written.length > 0 && r.measured.addedGlyphsReadFromOutputBytes === 0);
    assert.equal(outsideNow.length, 0, `ink landed outside a measured write box: ${JSON.stringify(outsideNow.map(([f, r]) => [f, r.measured.glyphsOutsideDetail]))}`);
    assert.equal(refusedInkNow.length, 0, `a refused field carries ink: ${JSON.stringify(refusedInkNow.map(([f, r]) => [f, r.measured.refusedFieldsWithInk]))}`);
    assert.equal(invisibleNow.length, 0, "the output bytes carry no added ink although values were written");

    for (const [from, to] of staged) fs.renameSync(from, to);
  } catch (error) {
    for (const [from] of staged) { try { fs.rmSync(from, { force: true }); } catch { /* nothing staged */ } }
    throw error;
  }

  // Every fixture must be complete or say so. A fixture that could not print a
  // held value keeps the value in the record and names it to the participant.
  const unfittable = Object.values(rendered).flatMap((r) => r.unfittable);

  const writes = rendered.canonical.written.map(({ drawnText, ...row }) => row);
  const refusals = blanks.map(toFieldMapRow).concat(unfittable.map((item) => ({
    fieldId: item.fieldId, fieldName: item.fieldName, effectiveLabel: item.effectiveLabel,
    documentId: item.documentId, page: 1,
    reason: `the complete value does not fit the form's own printed rule and this build never shortens a value: ${item.measurement.requiredWidthPtAtMinimumSize}pt of type into a ${item.measurement.availableWidthPt}pt rule`,
    completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false,
    routeDetermined: false, role: "participant", factId: item.factId,
    heldValue: item.heldValue, measurement: item.measurement
  })));

  writeJson(path.join(out, "production-field-map.json"), {
    schemaVersion: "rcap-production-field-map/v2",
    familyId: FAMILY_ID,
    implementationStrategy: "participant_agency_application",
    routeKeys: [ROUTE_KEY],
    controllingRecord: record.recordDigest,
    routeSelectionNote: `This packet is built for exactly one statutory route: ${record.pathway.label} (${record.authority.statute}). The form's other paragraph — the first-time drug/property offender and DUI-under-21 CONVICTION branch — is declared not applicable on this route and carries a named route condition. The form's own route mark is an INITIAL CELL beside a sworn paragraph, and this build never writes an applicant's initials; the route the packet proceeds under is stated here, in participant-instructions.md and in filing-instructions.md, and the participant initials the paragraph themselves.`,
    geometrySource: "every write and refusal area is measured out of the bound source bytes at build time; no coordinate in the builder is authored",
    writes,
    refusals
  });

  writeJson(path.join(out, "source-receipt.json"), {
    schemaVersion: "rcap-source-receipt/v2",
    familyId: FAMILY_ID,
    jurisdiction: "HI",
    implementationStrategy: "participant_agency_application",
    custodyClass: "SOURCE_ALREADY_HELD",
    allSourcesExact: true,
    bindingMethod: "the committed corpus index entry for the declared path, then exact SHA-256 over the bytes on disk",
    sourceBinaryCommitted: false,
    sources: [{
      sourceId: SOURCE.sourceId, documentId: SOURCE.documentId, formNumber: SOURCE.documentId,
      printedIdentity: SOURCE.printedIdentity,
      path: SOURCE.indexPath, custody: source.custody, sha256: SOURCE.sha256, sha256Exact: true,
      byteLength: source.byteLength, componentKinds: ["primary_filing"]
    }],
    legalRecordsBound: record.recordDigest,
    commercialRoutesOpened: 0
  });

  writeJson(path.join(out, "reports", "actual-writes.json"), {
    schemaVersion: "rcap-actual-writes/v2",
    familyId: FAMILY_ID,
    howMeasured: "each artifact was re-loaded from the bytes written to disk and its page content stream decoded; the blank source's own text items were differenced out, so every count below is ink that is in the delivered file and is not in the source",
    documents: [{ documentId: SOURCE.documentId, actualWrites: rendered.canonical.written }],
    artifacts: Object.entries(rendered).map(([fixture, r]) => ({
      fixture,
      sha256: sha256(r.bytes),
      valuesReportedByFinalizer: r.written.length,
      addedGlyphsReadFromOutputBytes: r.measured.addedGlyphsReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: r.measured.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      glyphsOutsideDetail: r.measured.glyphsOutsideDetail,
      flattenedWidgetAppearancesReadFromOutputBytes: r.measured.flattenedWidgetAppearancesReadFromOutputBytes,
      acroFieldsInOutput: r.measured.acroFieldsInOutput,
      refusedFieldsWithInk: r.measured.refusedFieldsWithInk,
      written: r.written.map((w) => ({ field: w.fieldName, chars: inkOf(w.drawnText) })),
      valuesHeldButNotPrinted: r.unfittable.map((u) => ({ field: u.fieldName, why: "does not fit the form's own printed rule; never shortened", measurement: u.measurement }))
    }))
  });

  writeJson(path.join(out, "reports", "rendered-artifacts.json"), {
    schemaVersion: "rcap-rendered-artifacts/v2",
    familyId: FAMILY_ID,
    rasterState: "BUILT_RASTER_PENDING",
    whyRasterIsPending: "this container resolves no browser the page rasterizer can execute; rendering is central, against the exact hashes below. No visual defect count is claimed and none is zeroed.",
    componentIdentityMode: "exact",
    packets: Object.entries(rendered).map(([fixture, r]) => ({
      fixture,
      file: `${OUT_REL}/fixtures/${fixture}.pdf`,
      sha256: sha256(r.bytes),
      byteLength: r.bytes.length,
      pageCount: 1,
      documents: [{ documentId: SOURCE.documentId, componentKinds: ["primary_filing"] }]
    }))
  });

  writeJson(path.join(out, "approval-request.json"), {
    schemaVersion: "rcap-packet-approval-request/v2",
    familyId: FAMILY_ID,
    status: "BUILT_RASTER_PENDING",
    implementationStrategy: "participant_agency_application",
    routeKeys: [ROUTE_KEY],
    packetFamily: record.authority.packetFamily,
    components: [{ kind: "primary_filing", componentId: "component:hi_nonconviction_expungement-primary-filing-1", documentId: SOURCE.documentId }],
    artifacts: Object.entries(rendered).map(([fixture, r]) => ({
      fixture, file: `${OUT_REL}/fixtures/${fixture}.pdf`, sha256: sha256(r.bytes), byteLength: r.bytes.length, pageCount: 1
    })),
    independentVerificationStatus: "PENDING",
    selfVerified: false,
    commercialRoutesOpened: 0,
    productionTouched: false,
    whatThisDoesNotClaim: [
      "No verdict. This lane built these bytes and does not verify them.",
      "No raster has been taken; visualDefects records that nobody has looked, not that there is nothing to see.",
      "No approval, no promotion, no route change and no commercial authority."
    ]
  });

  fs.writeFileSync(path.join(out, "participant-instructions.md"), participantInstructions(record, blanks, unfittable));
  fs.writeFileSync(path.join(out, "filing-instructions.md"), filingInstructions(record, geometry));

  writeJson(path.join(out, "build-findings.json"), {
    schemaVersion: "rcap-family-build-findings/v1",
    familyId: FAMILY_ID,
    status: "BUILT_RASTER_PENDING",
    buildStatus: "state_built",
    packetRendered: true,
    fixturesWritten: Object.keys(rendered).length,
    commercialRoutesOpened: 0,
    approvalRequested: false,
    promotionRequested: false,
    measuredOnDeliveredBytes: Object.fromEntries(Object.entries(rendered).map(([f, r]) => [f, r.measured])),
    notedForTheIndependentLane: [
      "The form's route mark is an INITIAL CELL beside a sworn paragraph, not a check box. This build classifies it REQUIRED_BEFORE_FILING with routeDetermined false, on the ground that initialling the paragraph is the applicant's own sworn declaration (it includes \"I hereby declare that I am not a fugitive from justice\") rather than a preparer's selection. The route the packet proceeds under is stated in the field map, the participant instructions and the filing instructions. The sibling family hi_dag_danc_expungement-set carries the identical treatment on the identical source.",
      "The conviction-expungement paragraph and its court-order checklist item are declared NOT_APPLICABLE_ON_THIS_ROUTE with named route conditions taken from what the form itself prints about them.",
      "No raster was taken here. flattenedWidgetAppearancesReadFromOutputBytes is a real reading of the output's annotation count, not a placeholder."
    ]
  });

  console.log(JSON.stringify({
    familyId: FAMILY_ID,
    status: "BUILT_RASTER_PENDING",
    writes: writes.length,
    classifiedBlanks: refusals.length,
    valuesHeldButNotPrinted: unfittable.length,
    artifacts: Object.fromEntries(Object.entries(rendered).map(([f, r]) => [f, { sha256: sha256(r.bytes), bytes: r.bytes.length, addedGlyphs: r.measured.addedGlyphsReadFromOutputBytes, glyphsOutsideBoxes: r.measured.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes }])),
    selfVerified: false
  }, null, 2));
}

await build();
