import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import zlib from "node:zlib";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { makeCorpusEntryResolver } from "../lib/corpus-index-paths.mjs";
import { extractTextItems, groupIntoLines, captureWidgetContext } from "./rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./pdf-flattened-widgets.mjs";
import { scanBytesForActiveContent } from "./rcap-active-content.mjs";
import { stampDeterministic } from "./rcap-deterministic-pdf-date.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS } from "../rcap-packet-completeness/completeness-contract.mjs";
import { preserveIdentityRefresh } from "../rcap-packet-completeness/identity-refresh.mjs";


import { measureKansasDocument, preserveKansasOrderBlank } from "./kansas-byte-measurement.mjs";

export function createKansasBuilder(SPEC, FIXTURES, ROUTE_FACTS) {
const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "../..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFName, StandardFonts, rgb } = require("pdf-lib");



const OUT = SPEC.outDir;
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));

/* ======================================================================== *
 * 1. SOURCES — bound by exact SHA-256 through the committed corpus index
 * ======================================================================== */

function normalRect(r) {
  return { x: Math.min(r.x, r.x + r.width), y: Math.min(r.y, r.y + r.height), width: Math.abs(r.width), height: Math.abs(r.height) };
}

/**
 * Every official binary this family fills, resolved through the committed
 * corpus index and verified byte-for-byte against the digest the census
 * pinned. A mismatch, a missing custody or an absent file refuses the build:
 * an overlay drawn on a binary nobody identified is not an overlay of the
 * official form.
 *
 * The recovery pool is a PARTIAL custody. Its own declaration in the index
 * says it "satisfies an individual source obligation and never a completeness
 * assertion", which is exactly what is asked of it here — six named documents
 * at six exact digests, and no claim about the corpus as a whole.
 */
function resolveSources() {
  const index = readJson("data/rcap-all50/local-source-corpus-index.json");
  const resolve = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  const resolved = [];
  const failures = [];
  for (const doc of SPEC.documents.filter((d) => d.officialFormId)) {
    const entry = index.entries.find((e) => e.path === doc.corpusPath && e.custody === doc.custody);
    if (!entry) { failures.push({ documentId: doc.documentId, why: "the committed corpus index names no entry at this path in this custody", path: doc.corpusPath, custody: doc.custody }); continue; }
    if (entry.sha256 !== doc.sha256) { failures.push({ documentId: doc.documentId, why: "the corpus index records a different digest than this family pins", indexSha256: entry.sha256, pinnedSha256: doc.sha256 }); continue; }
    const absolute = resolve.resolve(entry);
    if (!absolute || !fs.existsSync(absolute)) { failures.push({ documentId: doc.documentId, why: "the custody holding this source is not mounted in this container", path: doc.corpusPath, custody: doc.custody }); continue; }
    const bytes = fs.readFileSync(absolute);
    const digest = sha(bytes);
    if (digest !== doc.sha256) { failures.push({ documentId: doc.documentId, why: "the bytes on disk do not hash to the pinned digest", observedSha256: digest, pinnedSha256: doc.sha256 }); continue; }
    if (bytes.length !== doc.byteLength) { failures.push({ documentId: doc.documentId, why: "the bytes on disk are not the pinned length", observedByteLength: bytes.length, pinnedByteLength: doc.byteLength }); continue; }
    resolved.push({ ...doc, bytes, byteLengthObserved: bytes.length, custodyRoot: index.custodies.find((c) => c.id === doc.custody)?.root ?? null });
  }
  return { resolved, failures };
}

/**
 * The committed records this family reads its legal treatment out of, bound by
 * exact SHA-256, with every statement the build relies on re-read from the
 * bytes as an anchor first. A record that moved, or that no longer carries an
 * anchor, refuses the build rather than letting the packet quote a sentence
 * that is no longer there.
 */
function resolveRecords() {
  const resolved = [];
  const failures = [];
  for (const rec of SPEC.records) {
    const abs = path.join(ROOT, rec.path);
    if (!fs.existsSync(abs)) { failures.push({ recordId: rec.recordId, path: rec.path, why: "the committed record does not exist at this path" }); continue; }
    const bytes = fs.readFileSync(abs);
    const text = bytes.toString("utf8");
    const missing = (rec.mustContain ?? []).filter((a) => !text.includes(a));
    if (missing.length > 0) { failures.push({ recordId: rec.recordId, path: rec.path, why: `the committed record no longer carries ${missing.length} anchor statement(s) this build relies on`, missingAnchors: missing.slice(0, 8) }); continue; }
    resolved.push({ recordId: rec.recordId, path: rec.path, role: rec.role, sha256: sha(bytes), byteLength: bytes.length, anchorsVerified: (rec.mustContain ?? []).length });
  }
  return { resolved, failures };
}

/* ======================================================================== *
 * 2. CENSUS — every widget of every official document, with an AUTHORED label
 * ======================================================================== */

/**
 * The printed label a widget sits beside, harvested from the page.
 *
 * The harvest is a fallback, never the answer. Measured on these six binaries
 * it binds the county into the year-of-birth blank of the petition, the e-mail
 * address into the fax blank, the residence state into the driver's-licence
 * blank of the cover sheet, and the petitioner's own name into "the petitioner
 * was granted a diversion for the crime of" on the order. Every one of those
 * is a wrong value in a box a court reads, on documents signed under penalty
 * of perjury, so this family AUTHORS a label for every field and the harvest
 * is retained only as evidence of what the page prints.
 */
function censusOf(source) {
  return (async () => {
    const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
    const pages = doc.getPages();
    assert.equal(pages.length, source.pages, `${source.documentId}: pinned page count`);
    const pageText = pages.map((p, i) => ({ page: i + 1, lines: groupIntoLines(extractTextItems(p)) }));
    const fields = doc.getForm().getFields().map((f) => {
      const name = f.getName();
      const widgets = f.acroField.getWidgets().map((w, i) => {
        let pg = pages.findIndex((p) => p.ref === w.P());
        if (pg < 0) pg = pages.findIndex((p) => (p.node.Annots()?.asArray() ?? []).some((ref) => doc.context.lookup(ref) === w.dict));
        assert.ok(pg >= 0, `${source.documentId}/${name}: widget is on no page of the document`);
        const rect = normalRect(w.getRectangle());
        const ctx = captureWidgetContext(pages[pg], [{ name, rect }], { precomputedLines: pageText[pg].lines, isFirstPage: pg === 0 })[0];
        return { widgetIndex: i, page: pg + 1, rect, harvestedLabel: ctx.effectiveLabel ?? null, harvestedRegion: ctx.regionHeading ?? null };
      });
      const authored = SPEC.labels[`${source.documentId}:${name}`];
      assert.ok(typeof authored === "string" && authored.trim().length > 0,
        `${source.documentId}/${name}: this family authors no label for this field, and an unlabelled field is one nobody can classify`);
      return {
        name,
        type: ({ PDFTextField: "text", PDFCheckBox: "checkbox", PDFRadioGroup: "radio", PDFDropdown: "dropdown", PDFButton: "button", PDFSignature: "signature" })[f.constructor.name] ?? f.constructor.name,
        multiline: f instanceof PDFTextField && f.isMultiline(),
        maxLength: f.getMaxLength?.() ?? null,
        effectiveLabel: authored,
        harvestedLabel: widgets[0].harvestedLabel,
        regionHeading: null,
        widgets,
        sourceValue: f.getText?.() ?? null
      };
    });
    assert.equal(fields.length, source.acroFieldCount, `${source.documentId}: pinned AcroForm field count`);
    return { fields, pageText: pageText.map((p) => ({ page: p.page, lines: p.lines.map((l) => ({ y: l.y, text: l.text })) })) };
  })();
}

/* ======================================================================== *
 * 3. POLICY — what each field is, and why it is written or refused
 * ======================================================================== */

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const SWORN_ELECTION = "participant_sworn_narrative_or_legal_election";

/**
 * One row of the field map for one field, from this family's authored policy.
 *
 * The policy table is data, not inference: every field of every document is
 * named in it, and censusOf above refuses a field the table does not name. A
 * field that nobody classified is exactly the one that goes missing.
 */
function policyRow(source, field) {
  const key = `${source.documentId}:${field.name}`;
  const decision = SPEC.policy[key];
  assert.ok(decision, `${key}: this family declares no policy for this field`);
  const common = {
    field: field.name, fieldName: field.name, fieldId: key,
    document: source.documentId, documentId: source.documentId,
    page: field.widgets[0].page,
    effectiveLabel: field.effectiveLabel, printedLabel: field.effectiveLabel, printedLine: field.harvestedLabel,
    regionHeading: null, sectionHeading: null,
    rectBasis: "measured_widget_rectangle_of_the_exact_official_binary",
    widgets: field.widgets.map((w) => ({ widgetIndex: w.widgetIndex, page: w.page, rect: w.rect }))
  };
  if (decision.kind === "write") return { ...common, decision: "write", factId: decision.factId, why: decision.why };
  if (decision.kind === "narrative") return { ...common, decision: "write", viaNarrativeChannel: true, factId: decision.factId, why: decision.why };
  if (decision.kind === "select") return { ...common, decision: "select", isSelectionControl: true, routeDetermined: true, basis: decision.basis, why: decision.basis };
  const row = { ...common, decision: "refuse", factId: null, reason: decision.reason, why: decision.reason, isSelectionControl: decision.selectionControl === true };
  switch (decision.kind) {
    case "protected":
      return { ...row, category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED, completenessDisposition: "PROTECTED_FIELD", requiredBeforeFiling: false };
    case "signature":
      return { ...row, category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE, completenessDisposition: "PROTECTED_FIELD", requiredBeforeFiling: false };
    case "later":
      return { ...row, category: null, completenessClass: null, class: null, completenessDisposition: "LATER_COMPLETION", requiredBeforeFiling: false, laterCompletionTrigger: decision.trigger };
    case "election":
      return { ...row, category: SWORN_ELECTION, completenessClass: SWORN_ELECTION, class: SWORN_ELECTION, completenessDisposition: "PARTICIPANT_ELECTION_GENUINE", requiredBeforeFiling: false, routeDetermined: false };
    case "notApplicable":
      return { ...row, category: null, completenessClass: null, class: null, completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE", routeConditionThatMakesItInapplicable: decision.routeCondition, requiredBeforeFiling: false, routeDetermined: false };
    case "optional":
      return { ...row, category: null, completenessClass: null, class: null, completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT", requiredBeforeFiling: false, routeDetermined: false };
    case "requiredBeforeFiling":
      return {
        ...row, category: null, completenessClass: null, class: null,
        completenessDisposition: "REQUIRED_BEFORE_FILING", disposition: "REQUIRED_BEFORE_FILING",
        requiredBeforeFiling: true, routeDetermined: false,
        identity: `${source.documentId} page ${field.widgets[0].page} field ${field.name}`,
        participantMustSupply: decision.supply,
        ...(decision.caseDetermined
          ? { determinedByTheCaseNotTheRoute: true, whyTheRouteCannotDetermineIt: decision.caseDetermined }
          : {})
      };
    default:
      throw new Error(`${key}: unknown policy kind ${decision.kind}`);
  }
}

/* ======================================================================== *
 * 4. RENDER — one official document, filled and flattened
 * ======================================================================== */

async function renderDocument(source, census, facts) {
  const rows = census.fields.map((f) => policyRow(source, f));

  /* THE ONLY BOXES THIS FAMILY MAY EVER MARK.
   *
   * Every election this packet settles is named, field by field and document
   * by document, in SPEC.routeSelectionsMade, where a reader can see all of
   * them at once alongside the printed line each one sits on and the reason
   * the route determines it. This guard refuses any other mark.
   *
   * It exists because the packet is sworn. The coercion assertion at item
   * 8.A.iii of this petition is the sharpest case: it is a statement about
   * what was done to the petitioner, the committed registry says LegalEase
   * must not invent the coercion narrative and must not decide whether
   * coercion is proved, and a raster can be re-earned while a pre-answered
   * sworn election cannot be cured by disclosing it afterwards. A later edit
   * that turns any refusal on any of these six binaries into a settled
   * selection stops the build here rather than shipping the mark. */
  const declaredSelections = new Set(SPEC.routeSelectionsMade.filter((x) => x.document === source.documentId).map((x) => x.field));
  for (const r of rows.filter((x) => x.decision === "select")) {
    assert.ok(declaredSelections.has(r.field),
      `${r.fieldId}: this build would mark a box that SPEC.routeSelectionsMade does not name. Every election this packet settles is declared there with the printed line it sits on and the reason the route determines it; a mark that is not declared there is a pre-answered election on a sworn filing.`);
  }
  for (const declared of declaredSelections) {
    assert.ok(rows.some((r) => r.field === declared && (r.decision === "select" || r.routeDeterminedAndUnmade === true)),
      `${source.documentId}/${declared}: SPEC.routeSelectionsMade declares this election and the policy table neither settles it nor records it as route-determined-and-unmade`);
  }

  const writes = rows.filter((r) => r.decision === "write" && !r.viaNarrativeChannel);
  const narratives = rows.filter((r) => r.viaNarrativeChannel === true);
  const selections = Object.fromEntries(rows.filter((r) => r.decision === "select").map((r) => [r.field, { checked: true, basis: r.basis }]));

  /* Every field this family does not write through the ordinary channel is
   * handed to the finalizer as unwritable BY NAME. The shared semantics would
   * otherwise re-derive the decision from the field name and the printed label
   * alone, and this family's own measurement is that it re-derives five of
   * them wrongly. A narrative field is in this list too: its ordinary binding
   * is the WRONG fact, and the narrative channel writes the right one from the
   * same held fact set without consulting a descriptor. */
  const allowed = new Set([...writes.map((r) => r.field), ...narratives.map((r) => r.field), ...Object.keys(selections)]);
  const unwritable = rows.filter((r) => !allowed.has(r.field)).map((r) => ({ field: r.field, class: r.category ?? r.completenessDisposition }));

  /* A narrative field is NOT declared unwritable-by-role, because the shared
   * narrative pass refuses any line that is. It is instead given its intended
   * fact id in explicitMappings, where the shared semantics compares it to the
   * fact the FIELD NAME would bind and refuses the conflicting binding by
   * name — which is exactly the outcome wanted: the ordinary pass writes
   * nothing into it, and the narrative pass then writes the held fact this
   * family actually means. Both halves are the shared module's own rules; the
   * only thing this family supplies is the fact id. */

  const result = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: census.fields,
    facts,
    explicitMappings: Object.fromEntries([...writes, ...narratives].map((r) => [r.field, r.factId])),
    unwritableFields: unwritable,
    selectionsFromHeldFacts: selections,
    narrativeAcrossFields: narratives.map((r) => ({ factId: r.factId, fields: [r.field] })),
    captionOnly: source.captionOnly === true,
    documentAcceptsFill: true,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    maxFontSize: 10, minFontSize: 6,
    evaluateDeclaredMinimumSize: true, alignWidgetFontSizeToFit: true, fitTextPerWidget: true,
    detachNestedControlFields: true, suppressSynthesizedAppearances: true,
    suppressSynthesizedWidgetBorders: true, normalizeInvertedWidgetRects: true, honorWidgetBorderStyle: true,
    preserveUnwrittenSelectionBackgrounds: true, fitAppearancesToRect: true,
    title: `${SPEC.familyId} ${source.documentId}`
  });

  /* A write this family declared and the finalizer refused is NOT quietly
   * downgraded: the value is held, so the blank is a missing known fact and
   * the row says so in the field map rather than borrowing an excuse. */
  const written = new Map(result.report.written.map((w) => [w.field, w]));
  const mapped = rows.map((r) => {
    if (r.decision === "write") {
      const w = written.get(r.field);
      if (w) return { ...r, kind: w.kind ?? "acroform_text", fontSize: w.fontSize ?? null };
      return {
        ...r, decision: "refuse", heldButNotWritten: true,
        category: null, completenessClass: null, class: null,
        completenessDisposition: "KNOWN_FACT_NOT_WRITTEN", requiredBeforeFiling: false,
        reason: `the finalizer refused a write this family declared: ${JSON.stringify(result.report.refused.filter((x) => x.field === r.field))}`,
        finalizerRefusal: result.report.refused.filter((x) => x.field === r.field),
        heldValue: facts[r.factId] ?? null
      };
    }
    if (r.decision === "select") {
      const w = written.get(r.field);
      if (w) return { ...r, kind: w.kind };
      /* THE FAMILY DECIDED TO STATE ITS ROUTE AND THE SHARED RULES REFUSED.
       *
       * Not an assertion, and not quietly re-dispositioned either. The
       * election is route-determined, this family settled it from held facts,
       * and the shared protect rules would not let the mark be made. The row
       * keeps routeDetermined true, so the completeness contract counts it as
       * ROUTE_OPTION_NOT_SELECTED and the build stops — which is the correct
       * outcome for a route-specific packet that does not state its route.
       * The finalizer's own refusal is recorded verbatim beside it so the
       * reader can see which rule refused and on which caption.
       *
       * The alternative was to reword the printed caption until the protect
       * rule stopped matching it. That is the same move the completeness
       * contract calls out by name ("wording a refusal to match a regex is
       * the thing these counters exist to prevent"), pointed the other way,
       * and this family does not make it. */
      const refusals = result.report.refused.filter((x) => x.field === r.field);
      return {
        ...r, decision: "refuse", routeDeterminedAndUnmade: true, routeDetermined: true,
        category: null, completenessClass: null, class: null,
        completenessDisposition: "ROUTE_OPTION_NOT_SELECTED",
        requiredBeforeFiling: false,
        familyDecision: r.basis,
        reason: `this family settled this route election from held facts and the shared field semantics refused the mark: ${JSON.stringify(refusals)}`,
        finalizerRefusal: refusals
      };
    }
    return r;
  });
  const bytes = await preserveKansasOrderBlank(result.bytes, source.bytes, mapped);
  return { ...result, bytes, rows: mapped };
}

/* ======================================================================== *
 * 5. THE COMPOSED PROCESS-GUIDANCE COMPONENT
 * ======================================================================== */

function sanitizePdfText(text) {
  return String(text).replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-").replaceAll("—", "-")
    .replaceAll("−", "-").replaceAll("’", "'").replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§", "Sec. ").replaceAll("…", "...").replaceAll("′", "'").replaceAll(" ", " ");
}

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11, lineHeight = 14.5, width = 612, height = 792, margin = 72;
  const maxWidth = width - 2 * margin;
  const renderedWidth = (t) => Math.max(font.widthOfTextAtSize(t, fontSize), [...t].length * fontSize * 0.5);
  let page = pdf.addPage([width, height]);
  let y = height - margin;
  const draw = (line) => {
    if (y < margin) { page = pdf.addPage([width, height]); y = height - margin; }
    if (line) page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  };
  const splitToken = (token) => {
    const chunks = []; let cur = "";
    for (const ch of token) { if (cur && renderedWidth(`${cur}${ch}`) > maxWidth) { chunks.push(cur); cur = ch; } else cur += ch; }
    if (cur) chunks.push(cur);
    return chunks;
  };
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => (renderedWidth(w) > maxWidth ? splitToken(w) : [w]));
    const rows = []; let cur = "";
    for (const w of words) {
      const cand = cur ? `${cur} ${w}` : w;
      if (renderedWidth(cand) <= maxWidth) cur = cand; else { if (cur) rows.push(cur); cur = w; }
    }
    if (cur) rows.push(cur);
    return rows;
  };
  for (const raw of sanitizePdfText(fullText).split("\n")) for (const row of wrap(raw)) draw(row);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

/**
 * The hearing-preparation document the committed registry requires as
 * component 7. Every sentence in it is either this build's own plain
 * scaffolding or a statement quoted from the committed record on its own
 * line; nothing here narrates the participant's life, asserts eligibility, or
 * predicts an outcome, because the registry forbids all three by name.
 */
function processGuidanceBody(facts) {
  const lines = [];
  lines.push(SPEC.guidance.title.toUpperCase(), "");
  lines.push(`Prepared for: ${facts["participant.full_legal_name"]}`, "");
  for (const p of SPEC.guidance.intro) { lines.push(p, ""); }
  lines.push("THE FOUR FINDINGS THE COURT MUST MAKE", "");
  for (const f of SPEC.guidance.findings) { lines.push(f, ""); }
  lines.push("WHAT THE COMMITTED RECORD SAYS, IN ITS OWN WORDS", "");
  for (const [where, what] of SPEC.guidance.quoted) { lines.push(`${where}:`, what, ""); }
  lines.push("WHEN TO STOP AND GET HELP INSTEAD OF FILING", "");
  for (const s of SPEC.stopConditions) lines.push(`- ${s}`);
  lines.push("");
  lines.push("WHAT THIS DOCUMENT IS NOT", "");
  lines.push(SPEC.guidance.whatThisIsNot);
  return lines.join("\n");
}

/* ======================================================================== *
 * 6. BYTE PROOF — read back from the saved bytes, never from build intent
 * ======================================================================== */

/**
 * The INK of one flattened appearance, decoded out of the saved artifact.
 *
 * A checkbox mark on these Judicial Council binaries is a PATH, not a glyph:
 * the form ships its own /Yes appearance and the tick is drawn with path
 * operators, so the text of the appearance stream is the empty string. A byte
 * proof that compared the drawn TEXT to a check character would therefore
 * report an unmarked box and a marked one identically, which is the shape of
 * defect this proof exists to catch rather than to have.
 *
 * So the mark is measured as ink: the appearance's own decoded content stream
 * is read back out of the artifact and its painting operators are counted. An
 * appearance that paints nothing is not a mark however the report describes it.
 */
function appearanceInk(doc, appearanceName, page) {
  const ctx = doc.context;
  const resources = doc.getPages()[page - 1].node.get(PDFName.of("Resources"));
  const xObjects = resources && ctx.lookup(resources).get(PDFName.of("XObject"));
  if (!xObjects) return null;
  const dict = ctx.lookup(xObjects);
  const key = PDFName.of(appearanceName);
  if (!dict.has(key)) return null;
  const stream = ctx.lookup(dict.get(key));
  let bytes = Buffer.from(stream.contents);
  const filter = String(stream.dict?.get(PDFName.of("Filter")) ?? "");
  if (filter.includes("FlateDecode")) { try { bytes = zlib.inflateSync(bytes); } catch { /* raw */ } }
  const text = bytes.toString("latin1");
  const paintingOperators = (text.match(/(?:^|[\s])(?:re|m|l|c|v|y|f\*?|B\*?|b\*?|S|s|Tj|TJ|'|")(?=[\s]|$)/g) ?? []).length;
  return { appearance: appearanceName, byteLength: bytes.length, sha256: sha(bytes), paintingOperators };
}

/**
 * What actually reached the paper.
 *
 * For the six official documents this reads the FLATTENED appearance at each
 * measured widget rectangle of the saved artifact. For the composed guidance
 * page it reads the extracted text of the saved page. In both cases the
 * counters below are computed from what came back, never from what this
 * builder meant to write: a counter whose name says it was read from the
 * output bytes is read from the output bytes or it is null.
 */
async function actualWriteProof(fixtures) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ks-21-6614-conviction-readback-"));
  const documents = [];
  try {
    for (const [fixtureName, docs] of Object.entries(fixtures)) {
      for (const doc of docs) {
        if (doc.composed) {
          const loaded = await PDFDocument.load(doc.bytes, { ignoreEncryption: true, updateMetadata: false });
          const text = loaded.getPages().map((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text).join(" ")).join(" ").replace(/\s+/g, " ");
          const expected = sanitizePdfText(doc.facts["participant.full_legal_name"]);
          assert.ok(text.includes(expected), `${fixtureName}/${doc.documentId}: the composed page does not carry the participant's name in its own saved bytes`);
          const glyphs = text.replace(/\s+/g, "").length;
          documents.push({
            fixture: fixtureName, documentId: doc.documentId, sha256: sha(doc.bytes),
            proofMethod: "extracted text of the saved composed page",
            valuesReportedByFinalizer: 1,
            addedGlyphsReadFromOutputBytes: glyphs,
            flattenedWidgetAppearancesReadFromOutputBytes: 0,
            nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
            actualWrites: [{ field: "composed.participant_name", document: doc.documentId, factId: "participant.full_legal_name", expected, foundInOutputBytes: true }],
            refusedFieldsWithInk: []
          });
          continue;
        }
        const file = path.join(dir, `${fixtureName}--${doc.documentId}.pdf`);
        fs.writeFileSync(file, doc.bytes);
        const appearances = await flattenedWidgets(file);
        const saved = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
        const measured = await measureKansasDocument(doc.bytes, doc.sourceBytes, doc.rows, appearances);
        assert.deepEqual(measured.violations, [], `${fixtureName}/${doc.documentId}: output-byte control/refusal measurement`);
        assert.equal(measured.placement.appearancesNotPlacedAtTheirOwnSourceWidget, 0,
          `${fixtureName}/${doc.documentId}: flattened appearance moved outside its source widget`);
        const actualWrites = [];
        const refusedFieldsWithInk = [];
        let glyphs = 0;
        let markInk = 0;
        for (const row of doc.rows) {
          for (const widget of row.widgets) {
            const drawn = drawnAt(appearances, widget);
            const drawnText = drawn.map((a) => a.text).join("").trim();
            if (row.decision !== "write" && row.decision !== "select") {
              if (drawnText) refusedFieldsWithInk.push({ field: row.field, page: widget.page, drawnText });
              continue;
            }
            if (row.decision === "select") {
              /* A mark is ink, and ink is what is measured. See appearanceInk. */
              const ink = drawn.map((a) => appearanceInk(saved, a.appearance, widget.page)).filter(Boolean);
              const painted = ink.reduce((n, i) => n + i.paintingOperators, 0);
              assert.ok(drawn.length > 0 && painted > 0,
                `${fixtureName} ${doc.documentId}/${row.field}: this build marked this box and the saved bytes carry no painted appearance at its measured rectangle`);
              markInk += painted;
              actualWrites.push({
                field: row.field, document: doc.documentId, page: widget.page, rect: widget.rect,
                factId: null, kind: row.kind ?? null, mark: "checked",
                paintingOperatorsReadFromOutputBytes: painted, appearances: ink,
                foundInOutputBytes: true, appearanceCount: drawn.length,
                proof: "the flattened appearance at this box's own measured rectangle was decoded out of the saved artifact and its painting operators counted"
              });
              continue;
            }
            const expected = sanitizePdfText(String(doc.facts[row.factId]));
            assert.equal(drawnText, expected,
              `${fixtureName} ${doc.documentId}/${row.field}: the flattened appearance in the saved bytes is not the value this build bound`);
            glyphs += drawnText.replace(/\s+/g, "").length;
            actualWrites.push({
              field: row.field, document: doc.documentId, page: widget.page, rect: widget.rect,
              factId: row.factId ?? null, kind: row.kind ?? null, expected, drawnText,
              foundInOutputBytes: true, appearanceCount: drawn.length,
              proof: "flattened widget appearance read back at the field's own measured rectangle in the saved artifact bytes"
            });
          }
        }
        assert.deepEqual(refusedFieldsWithInk, [],
          `${fixtureName}/${doc.documentId}: a field this family refused carries printed text in the saved bytes`);
        documents.push({
          fixture: fixtureName, documentId: doc.documentId, sha256: sha(doc.bytes),
          proofMethod: "flattened widget appearance read at each measured rectangle of the saved artifact",
          valuesReportedByFinalizer: doc.report.written.length,
          addedGlyphsReadFromOutputBytes: glyphs,
          markPaintingOperatorsReadFromOutputBytes: markInk,
          flattenedWidgetAppearancesReadFromOutputBytes: appearances.length,
          nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: measured.placement.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
          byteMeasurement: measured,
          actualWrites, refusedFieldsWithInk
        });
      }
    }
  } finally {
    for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
    fs.rmdirSync(dir);
  }
  return documents;
}

/* ======================================================================== *
 * 7. COUNTERS — the repository's own contract, over this family's own rows
 * ======================================================================== */

function countCompleteness(maps, writeProofs, instructionsText, declaredComponents, builtComponents) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: r.isSelectionControl === true,
    heldButNotWritten: r.heldButNotWritten === true, finalizerRefusal: r.finalizerRefusal ?? null,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      ...(r.routeConditionThatMakesItInapplicable ? { routeConditionThatMakesItInapplicable: r.routeConditionThatMakesItInapplicable } : {}),
      ...(r.determinedByTheCaseNotTheRoute ? { determinedByTheCaseNotTheRoute: true, whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt } : {}),
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = [];
  const blanks = [];
  for (const m of maps) {
    for (const w of m.canonicalWrites ?? []) writes.push(row(w));
    for (const r of m.canonicalRefusals ?? []) blanks.push(row(r));
  }

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    if (!writtenInDocument.has(w.document)) writtenInDocument.set(w.document, new Set());
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(w.document).add(k);
  }

  /* A WRITE THIS FAMILY DECLARED AND THE OUTPUT DOES NOT CARRY.
   *
   * Counted here, from this run's own outcome, BEFORE the blank is handed to
   * classifyBlank at all. The reason is a defect this family had and fixed:
   * five held facts on the petition's own contact block were suppressed
   * because the label this family authored for them began "Signature block",
   * which the shared protect rules read as a signature field — and
   * classifyBlank then read the same label and called the blank an allowed
   * PROTECTED_FIELD. The counter said zero while five held facts were missing
   * from the paper. A fact the platform holds and did not print is a missing
   * known fact whatever any label says about it, so it is counted from the
   * fact of the suppression and never from the classification. */
  const suppressed = blanks.filter((b) => b.heldButNotWritten === true);
  for (const b of suppressed) {
    note("knownRequiredFieldsMissing", {
      field: b.id, document: b.document, label: b.label,
      basis: "this family declared a write for a fact it holds and the saved artifact does not carry it",
      finalizerRefusal: b.finalizerRefusal ?? null
    });
  }

  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared?.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ ...blank, ...verdict });
    const spec = BLANK_DISPOSITIONS[verdict.disposition];
    if (spec?.allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.id, document: blank.document, label: blank.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.id, document: blank.document, label: blank.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.id, document: blank.document, label: blank.label, basis: verdict.basis });
  }

  const hay = String(instructionsText ?? "").toLowerCase();
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.id, b.declared?.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => hay.includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.id, document: b.document, label: b.label, why: "classified required-before-filing and not named in participant-instructions.md" });
  }

  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }

  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") note("protectedWrites", { field: w.id, document: w.document, label: w.label, why: "a protected field was written" });
  }

  for (const c of declaredComponents) {
    if (!builtComponents.includes(c)) note("requiredComponentsMissing", { component: c, why: "the committed registry declares this component required and this build produced no bytes for it" });
  }

  /* Read from the byte-proof documents, which were read from the artifacts. */
  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: p.fixture, document: p.documentId, reportedByFinalizer: p.valuesReportedByFinalizer });
    if ((p.refusedFieldsWithInk ?? []).length > 0) note("visualDefects", { fixture: p.fixture, document: p.documentId, refusedFieldsWithInk: p.refusedFieldsWithInk.length });
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, document: p.documentId, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
  }

  return { counters, findings, ledger, written: writes.length, blank: blanks.length };
}

/* ======================================================================== *
 * 8. PARTICIPANT INSTRUCTIONS
 * ======================================================================== */

function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries(SPEC.documents.map((d, i) => [d.documentId, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r, i) => ({
      document: m.documentId, componentId: m.componentId, field: r.field, page: r.page,
      printedContext: r.printedLine, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.reason, participantMustSupply: r.participantMustSupply,
      declarationIndex: i
    })))
    .sort((a, b) => (order[a.document] - order[b.document]) || (a.page - b.page) || (a.declarationIndex - b.declarationIndex))
    .map(({ declarationIndex, ...rest }) => rest);
}

function participantInstructions(maps, rbf, laterCompletion) {
  const out = [];
  out.push(`# What you must do before you file — ${SPEC.routeName}`, "");
  out.push(`This packet is prepared for **${SPEC.legalName}**.`, "");
  for (const p of SPEC.instructionsIntro) out.push(p, "");

  out.push("## What is in this packet, and who each document is for", "");
  out.push("| Component | Document | What it is, and who completes it |", "| --- | --- | --- |");
  for (const d of SPEC.documents) out.push(`| \`${d.componentId}\` | ${d.participantName} | ${d.whoCompletesIt} |`);
  out.push("");

  out.push("## Where this is filed, what it costs, and who must be served", "");
  out.push("Each answer below is quoted from the committed record that establishes it, on a line of its own.", "");
  for (const [q, answer] of SPEC.obligationTable) { out.push(`**${q}**`, "", answer, ""); }

  out.push("## The route this packet states for you", "");
  for (const p of SPEC.routeElectionDisclosure) out.push(p, "");

  out.push("## Documents you must obtain before filing", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  for (const [doc, where] of SPEC.documentsToObtain) out.push(`| ${doc} | ${where} |`);
  out.push("");

  out.push("## The items you must supply", "");
  out.push("Each is a blank on a named page of a named document. Fill every one from the record itself, never from memory. The packet leaves them blank because the platform holds no value for them.", "");
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc}`, "");
    out.push("| Page | The blank on the document | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What the court fills in after you file", "");
  out.push("These blanks are not yours to complete before filing. The court or the clerk supplies them.", "");
  out.push("| Document | Page | The blank | When it is filled |", "| --- | --- | --- | --- |");
  for (const i of laterCompletion) out.push(`| ${i.document} | ${i.page} | ${i.disclosureLabel} | ${i.trigger} |`);
  out.push("");

  out.push("## What you do, in order", "");
  for (const [i, s] of SPEC.steps.entries()) out.push(`${i + 1}. ${s}`);
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  for (const b of SPEC.deliberatelyBlank) out.push(`- ${b}`);
  out.push("");

  out.push("## What this packet does not tell you", "");
  for (const n of SPEC.notTold) out.push(`- ${n}`);
  out.push("");

  out.push("## When to stop and get help instead of filing", "");
  for (const s of SPEC.stopConditions) out.push(`- ${s}`);
  out.push("");

  out.push("## What this packet is not", "");
  out.push(SPEC.whatThisIsNot, "");
  out.push("Official forms: Kansas Judicial Council / Kansas Judicial Branch. Retain the printed revision and attribution on every page.", "");
  out.push(`_Route: ${SPEC.routeLabel}_`);
  return `${out.join("\n")}\n`;
}

/* ======================================================================== *
 * 9. OUTPUT
 * ======================================================================== */

function writeOut(output, rel, value) {
  output.set(rel, Buffer.isBuffer(value) ? value : Buffer.from(`${JSON.stringify(value, null, 2)}\n`));
}

async function savePacket(docs, title) {
  const packet = await PDFDocument.create();
  const pageManifest = [];
  for (const d of docs) {
    const src = await PDFDocument.load(d.bytes, { ignoreEncryption: true, updateMetadata: false });
    for (const [i, p] of (await packet.copyPages(src, src.getPageIndices())).entries()) {
      packet.addPage(p);
      pageManifest.push({ packetPage: packet.getPageCount(), component: d.componentId, documentId: d.documentId, sourcePage: i + 1, sourceSha256: d.composed ? null : d.sourceSha256 });
    }
  }
  packet.setTitle(title);
  stampDeterministic(packet);
  packet.setProducer("LegalEase deterministic official-form builder");
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, updateFieldAppearances: false }));
  assert.deepEqual(scanBytesForActiveContent(bytes).hits, [], "the assembled packet carries active content");
  return { bytes, pageManifest, pageCount: packet.getPageCount() };
}

/* ======================================================================== *
 * 10. ENTRY POINT
 * ======================================================================== */

async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");

  const { resolved: sources, failures: sourceFailures } = resolveSources();
  const { resolved: records, failures: recordFailures } = resolveRecords();
  if (sourceFailures.length > 0 || recordFailures.length > 0) {
    return {
      familyId: SPEC.familyId, status: "BLOCKED_SOURCE",
      failedSourceIdentities: sourceFailures, failedRecordIdentities: recordFailures,
      why: "an exact source binary or a committed record this family builds from is missing, moved, or no longer hashes to its pinned digest, so nothing may be drawn against it",
      overlayDirectoryTouched: false
    };
  }

  /* ---- guards that run in the BUILD PATH, before anything is rendered ---- *
   * Not behind a flag, not in a self test. Each one refuses a packet this
   * family must never produce, and each is proved to fire by breaking the
   * thing it guards and watching the build stop. */
  assert.equal(sources.length, SPEC.documents.filter((d) => d.officialFormId).length,
    "every official component of this family must resolve to an exact source binary");
  for (const fixtureName of Object.keys(FIXTURES)) {
    const facts = FIXTURES[fixtureName];
    assert.equal(facts["answers.pending_felony_proceeding"], false,
      `${fixtureName}: the selected petition option cannot contradict a pending felony proceeding`);
    if (ROUTE_FACTS.prostitutionOffence) {
      assert.equal(facts["answers.prostitution_offence"], true);
      assert.equal(facts["answers.coercion_decided_by_the_platform"], false);
    } else assert.equal(facts["answers.disposition"], ROUTE_FACTS.disposition,
      `${fixtureName}: this family is the K.S.A. 21-6614(a)(1) CONVICTION route and states that election on the petition; a fixture whose held disposition is not a conviction would have the packet swear to the wrong one`);
    if (!ROUTE_FACTS.specialtyCourt) assert.equal(facts["answers.felony_in_past_two_years"], false,
      `${fixtureName}: Option A of the Judicial Council petition asserts no felony conviction in the past two years and no pending felony proceeding; the packet may not select Option A over a held answer that contradicts it`);
    assert.equal(facts["answers.currently_required_to_register"], false,
      `${fixtureName}: K.S.A. 21-6614(f) freezes every case in the record while offender registration is required, so a packet may not be built over a held answer that registration applies`);
    assert.equal(facts["answers.specialty_court_completion"], ROUTE_FACTS.specialtyCourt === true,
      `${fixtureName}: Option B is the K.S.A. 21-6614(a)(3) specialty-court lane and a different track; this family must not be built for a record that belongs to it`);
  }

  if (checkOnly) {
    const censuses = await Promise.all(sources.map(censusOf));
    return {
      familyId: SPEC.familyId, status: "CHECK_ONLY",
      sourcesBound: sources.map((s) => ({ documentId: s.documentId, sha256: s.sha256 })),
      recordsBound: records.length,
      anchorsVerified: records.reduce((n, r) => n + r.anchorsVerified, 0),
      fieldsCensused: censuses.reduce((n, c) => n + c.fields.length, 0)
    };
  }

  const censuses = await Promise.all(sources.map(censusOf));
  const fixtures = {};
  for (const [fixtureName, facts] of Object.entries(FIXTURES)) {
    const docs = [];
    for (const [i, source] of sources.entries()) {
      const rendered = await renderDocument(source, censuses[i], facts);
      docs.push({
        componentId: source.componentId, documentId: source.documentId, role: source.role,
        sourceSha256: source.sha256, sourceBytes: source.bytes, bytes: rendered.bytes, report: rendered.report, rows: rendered.rows,
        facts, composed: false
      });
    }
    for (const guidance of SPEC.documents.filter((d) => !d.officialFormId)) docs.push({
      componentId: guidance.componentId, documentId: guidance.documentId, role: guidance.role,
      sourceSha256: null, bytes: await renderComposedPdf(guidance.compose ? guidance.compose(facts) : processGuidanceBody(facts), `${SPEC.legalName} — ${guidance.participantName}`),
      report: { written: [] }, rows: [], facts, composed: true
    });
    fixtures[fixtureName] = docs;
  }

  const writeProofs = await actualWriteProof(fixtures);

  const maps = sources.map((s, i) => ({
    formNumber: s.documentId, documentId: s.documentId, componentId: s.componentId,
    officialFormId: s.officialFormId, officialSourceUrl: s.officialSourceUrl,
    documentPolicy: { mode: "participant", captionOnly: s.captionOnly === true, documentAcceptsFill: true, routeKey: SPEC.routeKey, role: s.role },
    structuralClass: "acroform",
    boundSource: { path: s.corpusPath, custody: s.custody, sha256: s.sha256, byteLength: s.byteLength, pages: s.pages },
    explicitMappings: Object.fromEntries(fixtures.canonical[i].rows.filter((r) => r.decision === "write").map((r) => [r.field, r.factId])),
    roleRefusals: [],
    selectionControls: fixtures.canonical[i].rows.filter((r) => r.isSelectionControl === true).map((r) => ({ field: r.field, label: r.effectiveLabel, decision: r.decision, reasonForThisControlOnThisRoute: r.why })),
    canonicalWrites: fixtures.canonical[i].rows.filter((r) => r.decision === "write" || r.decision === "select"),
    canonicalRefusals: fixtures.canonical[i].rows.filter((r) => r.decision === "refuse"),
    boundaryWrites: fixtures.boundary[i].rows.filter((r) => r.decision === "write" || r.decision === "select"),
    boundaryRefusals: fixtures.boundary[i].rows.filter((r) => r.decision === "refuse")
  }));

  const rbf = requiredBeforeFilingItems(maps);
  const laterCompletion = maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.completenessDisposition === "LATER_COMPLETION")
    .map((r) => ({ document: m.documentId, page: r.page, disclosureLabel: r.effectiveLabel, trigger: r.laterCompletionTrigger })));
  const instructionsText = participantInstructions(maps, rbf, laterCompletion);

  const declaredComponents = SPEC.documents.map((d) => d.componentId);
  const builtComponents = fixtures.canonical.map((d) => d.componentId);
  const counted = countCompleteness(maps, writeProofs, instructionsText, declaredComponents, builtComponents);

  const packets = {};
  for (const [fixtureName, docs] of Object.entries(fixtures)) {
    packets[fixtureName] = await savePacket(docs, `${SPEC.legalName} — ${fixtureName} fixture`);
  }

  /* ---- output ---------------------------------------------------------- */
  const output = new Map();
  for (const [fixtureName, docs] of Object.entries(fixtures)) {
    /* Only the assembled packet is committed. Every component's own bytes were
     * rendered, read back and hashed above, and the assembly carries the same
     * pages; committing both would put 23MB of duplicated pages in the tree for
     * a review artifact. Each component's digest and byte length are recorded
     * in reports/rendered-artifacts.json and are reproducible by rerunning. */
    writeOut(output, `fixtures/${fixtureName}.pdf`, packets[fixtureName].bytes);
  }
  writeOut(output, "fixtures/participant-facts.json", {
    schemaVersion: "rcap-fixture-participant-facts/v1", familyId: SPEC.familyId,
    theseAreSyntheticTestFacts: "No fixture value is any person's record. They exercise the field map and the fitter; they assert nothing about anybody.",
    fixtures: FIXTURES
  });
  writeOut(output, "participant-instructions.md", Buffer.from(instructionsText));

  writeOut(output, "field-census.census-v1.json", {
    schemaVersion: "rcap-field-census/v1-census-v1", familyId: SPEC.familyId,
    labelBasis: "every label in this census is AUTHORED by this family; the harvested label beside it records what the page prints and is evidence, not a binding",
    documents: sources.map((s, i) => ({
      componentId: s.componentId, documentId: s.documentId, sourceSha256: s.sha256,
      fields: censuses[i].fields.map((f) => ({ name: f.name, type: f.type, multiline: f.multiline, maxLength: f.maxLength, authoredLabel: f.effectiveLabel, harvestedLabel: f.harvestedLabel, widgets: f.widgets, sourceValue: f.sourceValue }))
    }))
  });

  writeOut(output, "production-field-map.json", {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: SPEC.familyId,
    routeKeys: [SPEC.routeKey], routeLabels: { [SPEC.routeKey]: SPEC.routeLabel },
    printedRouteLineCarriesTheLabelNotTheKey: true,
    jurisdiction: SPEC.jurisdiction, statutes: SPEC.statutes, legalName: SPEC.legalName,
    implementationStrategy: "official_pdf_fill", renderStrategy: "official_pdf_fill_flattened",
    componentSet: declaredComponents,
    componentRoles: Object.fromEntries(SPEC.documents.map((d) => [d.componentId, d.role])),
    componentConditions: {},
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, SWORN_ELECTION],
    routeSelectionsMade: SPEC.routeSelectionsMade,
    routeSelectionNote: SPEC.routeSelectionNote,
    participantFacingObligations: SPEC.obligationTable.map(([question, answer]) => ({ question, answer })),
    writes: maps.flatMap(m => m.canonicalWrites),
    refusals: maps.flatMap(m => m.canonicalRefusals.map(r => ({ ...r, refusalClass: r.category }))),
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    laterCompletion, maps,
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeOut(output, "source-receipt.json", {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: SPEC.familyId, worklistGroupId: SPEC.familyId,
    jurisdiction: SPEC.jurisdiction, implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_BOUND_BY_HELD_BYTES", acquisitionCommissioned: false,
    bindingMethod: "each official binary resolved through data/rcap-all50/local-source-corpus-index.json and verified byte-for-byte against the digest this family pins, in this run; each committed record bound by exact SHA-256 with every relied-on statement re-read from its bytes as an anchor before anything was composed",
    routeKeys: [SPEC.routeKey], routeLabels: { [SPEC.routeKey]: SPEC.routeLabel },
    printedRouteLineCarriesTheLabelNotTheKey: true,
    statutoryAuthority: SPEC.statutes, legalName: SPEC.legalName,
    allSourcesExact: sourceFailures.length === 0 && sources.length === SPEC.documents.filter((d) => d.officialFormId).length,
    documents: sources.map((s) => ({
      componentId: s.componentId, documentId: s.documentId, officialFormId: s.officialFormId,
      documentRole: s.role, officialTitle: s.officialTitle, revision: s.revision,
      officialSourceUrl: s.officialSourceUrl,
      pathInCustody: s.corpusPath, custody: s.custody, custodyRoot: s.custodyRoot,
      sha256: s.sha256, byteLength: s.byteLengthObserved,
      matchedBy: "exact_path_custody_sha256_and_byte_length", corpusIndexAgrees: true,
      pageCount: s.pages, acroFieldCount: s.acroFieldCount, structuralClassObserved: "acroform",
      generatedParticipantArtifact: true
    })),
    committedRecords: records.map((r) => ({
      sourceIds: [`committed-record:${r.path}`], recordId: r.recordId, pathInRepository: r.path,
      sha256: r.sha256, byteLength: r.byteLength, instrumentKind: "committed_record_bound_as_authority",
      role: r.role, anchorStatementsVerified: r.anchorsVerified
    })),
    composedComponentsAuthoredByThisBuild: SPEC.documents.filter((d) => !d.officialFormId).map((d) => d.componentId),
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    republicationRestriction: SPEC.republicationRestriction,
    whatThisReceiptDoesNotEstablish: [
      "that any output is approved for participant delivery",
      "that any record is eligible for the relief this family petitions for",
      "that the Kansas Judicial Council republication restriction recorded above has been resolved, waived or licensed",
      "that a partial custody standing behind five of these six binaries is the complete operational corpus"
    ]
  });

  writeOut(output, "reports/actual-writes.json", {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: SPEC.familyId, derivedFromArtifactBytes: true,
    note: "Every value was read back out of the saved artifact bytes — from the flattened widget appearance at the field's own measured rectangle for the six official documents, and from the extracted text of the saved page for the composed guidance component. Nothing here is this builder's own intent.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, documentId: p.documentId,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    totalActualWrites: writeProofs.reduce((n, d) => n + d.actualWrites.length, 0),
    blockingFindings: []
  });

  writeOut(output, "reports/blanks-left-for-the-participant.json", {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: SPEC.familyId,
    requiredBeforeFiling: rbf,
    laterCompletion,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.completenessDisposition === "PROTECTED_FIELD")
      .map((r) => ({ document: m.documentId, page: r.page, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.reason }))),
    participantElections: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.completenessDisposition === "PARTICIPANT_ELECTION_GENUINE")
      .map((r) => ({ document: m.documentId, page: r.page, field: r.field, label: r.effectiveLabel, reasonForThisControlOnThisRoute: r.reason }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeOut(output, "reports/completeness-counters.json", {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: SPEC.familyId,
    whatThisIs: "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract functions over this family's field map, its byte proof and participant-instructions.md.",
    whatThisIsNot: "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires an independent fifteen-obligation verification and a hash-bound RASTER_PASS from the central raster workflow.",
    howEachCounterWasTaken: SPEC.howEachCounterWasTaken,
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    terminalFields: counted.written + counted.blank,
    written: counted.written, blank: counted.blank,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeOut(output, "reports/rendered-artifacts.json", {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: SPEC.familyId,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: declaredComponents,
    componentConditions: {},
    boundReferenceSource: sources.map((s) => ({ documentId: s.documentId, sha256: s.sha256 })),
    pdfs: Object.entries(packets).map(([fixture, p]) => ({
      file: `${OUT}/fixtures/${fixture}.pdf`, documentId: "assembled_packet",
      role: "assembled_packet_of_official_forms_and_one_composed_guidance_page",
      fixture, sha256: sha(p.bytes), byteLength: p.bytes.length, pageCount: p.pageCount
    })),
    familyAssemblyIsAParticipantDeliverable: true,
    familyAssemblyRole: "single-route family: the assembly is this route's packet",
    componentArtifacts: Object.entries(fixtures).flatMap(([fixture, docs]) => docs.map((d) => ({
      fixture, componentId: d.componentId, documentId: d.documentId, role: d.role,
      committedAsItsOwnFile: false,
      carriedInto: `${OUT}/fixtures/${fixture}.pdf`,
      sha256: sha(d.bytes), byteLength: d.bytes.length,
      sourceSha256: d.sourceSha256,
      valuesReadBackFromTheseBytes: writeProofs.find((p) => p.fixture === fixture && p.documentId === d.documentId)?.actualWrites.length ?? null
    }))),
    pageManifests: Object.fromEntries(Object.entries(packets).map(([f, p]) => [f, p.pageManifest])),
    routeArtifacts: Object.entries(packets).map(([fixture, p]) => ({
      routeKey: SPEC.routeKey, routeLabel: SPEC.routeLabel, route: SPEC.routeSlug, fixture,
      file: `${OUT}/fixtures/${fixture}.pdf`, sha256: sha(p.bytes), byteLength: p.bytes.length,
      pageCount: p.pageCount, pageManifest: p.pageManifest,
      components: declaredComponents, documents: SPEC.documents.map((d) => d.documentId),
      role: "route_packet", deliveryRole: "participant_deliverable_for_this_route_only",
      valuesReadBackFromTheseBytes: writeProofs.filter((x) => x.fixture === fixture).reduce((n, x) => n + x.actualWrites.length, 0),
      rasterPending: true, independentVerificationPending: true
    })),
    routeArtifactRoutes: [SPEC.routeKey],
    routeLabels: { [SPEC.routeKey]: SPEC.routeLabel },
    printedRouteLineCarriesTheLabelNotTheKey: true,
    routeArtifactRasterPending: true,
    byteDerivedHashes: true,
    rasterEngine: null, rasterSkipped: true, rasterPages: [],
    everyPageRastered: false,
    rasterState: "BUILT_RASTER_PENDING",
    rasterIsCentral: "This lane renders no raster. Enrolment and rendering are the central raster workflow's, dispatched by Captain.",
    independentVerificationPending: true
  });

  writeOut(output, "build-status.json", {
    schemaVersion: "rcap-family-build-status/v1", familyId: SPEC.familyId,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: SPEC.buildScript,
    rasterEngine: "not rendered in this run", popplerUsed: false,
    renderedArtifacts: Object.keys(packets).length,
    rasterPages: 0, rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route.",
    sourcePermissionHoldUnresolved: SPEC.republicationRestriction.holdName
  });

  writeOut(output, "build-findings.json", {
    schemaVersion: "rcap-family-build-findings/v1", familyId: SPEC.familyId,
    blocking: counted.findings, findings: SPEC.buildFindings,
    historicalFindings: SPEC.historicalBuildFindings,
    historicalFindingsAreNotCurrentVerdicts: true
  });

  writeOut(output, "approval-request.json", {
    schemaVersion: "rcap-family-approval-request/v1", familyId: SPEC.familyId,
    requested: "independent completeness verification, a central raster, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: SPEC.counselQuestions,
    mattersForTheReviewersAttention: SPEC.reviewersAttention
  });

  if (checkOnly) return { familyId: SPEC.familyId, status: "CHECK_ONLY" };

  const drift = [];
  for (const [rel, bytes] of output) {
    const abs = path.join(ROOT, OUT, rel);
    if (argv.includes("--verify-deterministic")) {
      if (!fs.existsSync(abs)) { drift.push({ file: rel, why: "absent" }); continue; }
      const saved = fs.readFileSync(abs);
      if (saved.length !== bytes.length || sha(saved) !== sha(bytes)) drift.push({ file: rel, savedSha256: sha(saved), rebuiltSha256: sha(bytes) });
      continue;
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    if (rel.endsWith(".json")) fs.writeFileSync(abs, `${JSON.stringify(preserveIdentityRefresh(fs, abs, JSON.parse(bytes.toString("utf8"))), null, 2)}\n`);
    else fs.writeFileSync(abs, bytes);
  }
  if (argv.includes("--verify-deterministic")) {
    return { familyId: SPEC.familyId, status: drift.length === 0 ? "DETERMINISTIC" : "DRIFT", drift };
  }

  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return {
    familyId: SPEC.familyId,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : { stopClass: "COMPLETENESS_COUNTER_NOT_ZERO", nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0), firstFindings: counted.findings.slice(0, 8) }),
    counters: counted.counters,
    directory: OUT,
    implementationStrategy: "official_pdf_fill",
    sourcesBound: sources.map((s) => ({ documentId: s.documentId, sha256: s.sha256, custody: s.custody })),
    recordsBound: records.map((r) => ({ recordId: r.recordId, sha256: r.sha256, anchorsVerified: r.anchorsVerified })),
    components: declaredComponents,
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    requiredBeforeFiling: rbf.length,
    laterCompletion: laterCompletion.length,
    artifactHashes: Object.entries(packets).map(([fixture, p]) => ({ fixture, packetSha256: sha(p.bytes), pages: p.pageCount, byteLength: p.bytes.length })),
    rasterState: "BUILT_RASTER_PENDING",
    nineCountersZero: allZero,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false,
    sourcePermissionHoldUnresolved: SPEC.republicationRestriction.holdName
  };
}

return runFamily;
}
