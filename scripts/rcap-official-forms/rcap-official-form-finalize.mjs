// Produces the finalized participant artifact for one official form.
//
// "Finalized" means the thing a participant would actually file: values
// materialized into appearances, the form flattened so no interactive field
// survives, active content removed and proven gone, and the bytes made
// reproducible. Everything downstream -- the contact sheet, the visibility
// proof, the drift check -- reads this artifact rather than an intermediate
// one, because an intermediate is not what gets filed.
import { createRequire } from "node:module";
import crypto from "node:crypto";
import { decideBinding, resolveFact, valueMatchesType, selectOnePerSlot, isChooserPrompt } from "./rcap-field-semantics.mjs";
import { fitTextToWidget, applyFitToTextField, MIN_READABLE_FONT_SIZE } from "./rcap-text-fitting.mjs";
import { sanitizeAndFlatten, scanBytesForActiveContent, ensureDefaultAppearances } from "./rcap-active-content.mjs";
import { detectNonFilingNotice } from "./rcap-source-notice.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFDropdown, PDFName, PDFString, PDFHexString, StandardFonts, rgb } = require("pdf-lib");

// A fixed instant: a fresh document otherwise stamps the wall clock into its
// info dictionary, and every render of the same facts would differ.
export const DETERMINISTIC_STAMP = new Date("2026-01-01T00:00:00Z");

/**
 * Participant values are drawn in black.
 *
 * The renderer defaulted to a dark blue for no recorded reason. A filed court
 * document is a black-ink document unless its own instructions say otherwise,
 * and an unexplained colour on a filing is a difference nobody asked for.
 */
export const PARTICIPANT_INK = rgb(0, 0, 0);
export const PARTICIPANT_INK_RGB = { r: 0, g: 0, b: 0 };

// The write box sits this far above the rule it is measured from, so a box that
// belongs to a protected rule is one whose baseline is this far above it.
export const BASELINE_ABOVE_RULE = 2;
// Tolerance around that, so a profile that rounds differently still trips.
export const PROTECTED_RULE_BAND = 3;

/**
 * The one way a form may use another ink.
 *
 * A family profile may carry `approvedTextColor: { r, g, b, reason, source }`,
 * and both the reason and the source citation are required — an override with
 * no source behind it is the unexplained default arriving under a new name. A
 * colour is never inherited from a prior fixture merely because it rendered.
 */
export function participantInk(approvedTextColor) {
  if (approvedTextColor === undefined || approvedTextColor === null) return PARTICIPANT_INK;
  const { r, g, b, reason, source } = approvedTextColor;
  const inRange = (v) => typeof v === "number" && v >= 0 && v <= 1;
  if (!inRange(r) || !inRange(g) || !inRange(b)) {
    throw new Error("approvedTextColor must carry r, g and b in 0..1");
  }
  if (typeof reason !== "string" || reason.trim().length < 20) {
    throw new Error("approvedTextColor requires a reason; an unexplained colour on a filed form is the defect this replaced");
  }
  if (typeof source !== "string" || source.trim() === "") {
    throw new Error("approvedTextColor requires a source citation for the requirement");
  }
  return rgb(r, g, b);
}

/**
 * Carries the court's own document metadata onto the finalized artifact.
 *
 * The finalizer used to stamp its own Producer and Creator and overwrite the
 * Title, which destroyed the issuing court's provenance — author, subject,
 * keywords and the form's real name — and wrote partner branding into a
 * document whose footer says it shall not be modified. The participant's
 * official form carries the court's identity, not ours.
 *
 * Only descriptive metadata crosses. Nothing active does: JavaScript, actions,
 * embedded executables, interactive behaviour and unsafe attachments are the
 * sanitizer's business and are removed there, and no amount of "it was in the
 * source" makes any of them safe to carry.
 *
 * One field cannot be carried. pdf-lib 1.17 stamps its own /Producer into any
 * document it constructs, and the finalized artifact is constructed rather than
 * edited in place, so /Producer reads as the PDF library that wrote the bytes.
 * That is reported rather than hidden. It is also not a loss worth working
 * around: /Producer names whoever last wrote the file, which is exactly why it
 * was the wrong place for provenance and why the sidecar record replaced it.
 * What matters — that no partner branding appears on the participant's filed
 * form — holds, and the verifier checks that rather than checking for a stamp.
 */
export function preserveSourceMetadata(sourceDoc, cleanDoc) {
  const carried = {};
  for (const [key, get, set] of [
    ["title", () => sourceDoc.getTitle(), (v) => cleanDoc.setTitle(v)],
    ["author", () => sourceDoc.getAuthor(), (v) => cleanDoc.setAuthor(v)],
    ["subject", () => sourceDoc.getSubject(), (v) => cleanDoc.setSubject(v)],
    ["keywords", () => sourceDoc.getKeywords(), (v) => cleanDoc.setKeywords(v.split(/\s*,\s*/))],
    ["creator", () => sourceDoc.getCreator(), (v) => cleanDoc.setCreator(v)],
    ["producer", () => sourceDoc.getProducer(), (v) => cleanDoc.setProducer(v)]
  ]) {
    let value;
    try { value = get(); } catch { value = undefined; }
    if (typeof value === "string" && value.trim() !== "") {
      try { set(value); carried[key] = value; } catch { /* a field the source cannot round-trip is left alone */ }
    }
  }
  return carried;
}

/**
 * What the emitted bytes actually carry, read back from the bytes.
 *
 * The in-memory document is not the artifact. pdf-lib writes its own /Producer
 * when it serialises a constructed document, so the only honest way to report
 * what a participant's form says is to read the file that was written.
 */
export async function metadataOfBytes(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const read = (fn) => { try { const v = fn(); return typeof v === "string" ? v : null; } catch { return null; } };
  return {
    title: read(() => doc.getTitle()),
    author: read(() => doc.getAuthor()),
    subject: read(() => doc.getSubject()),
    keywords: read(() => doc.getKeywords()),
    creator: read(() => doc.getCreator()),
    producer: read(() => doc.getProducer())
  };
}

/** Any partner branding left on a participant's filed form. */
export const BRANDING_PATTERN = /legalease|rcap|expungement\.ai/i;

export function brandingInMetadata(metadata) {
  return Object.entries(metadata ?? {})
    .filter(([, value]) => typeof value === "string" && BRANDING_PATTERN.test(value))
    .map(([field, value]) => ({ field, value }));
}

/**
 * The source's creation date, carried through; and our own modification date.
 *
 * Carrying the creation date is honest — the court created this form on that
 * day. Carrying the source's MODIFICATION date would not be: the artifact was
 * modified, by us, and a modification date that predates the modification says
 * the opposite. Ours is a fixed instant so a re-render of unchanged inputs
 * reproduces byte for byte.
 */
export function carryDates(sourceDoc, cleanDoc) {
  let created = null;
  try { created = sourceDoc.getCreationDate(); } catch { created = null; }
  cleanDoc.setCreationDate(created instanceof Date && !Number.isNaN(created.getTime()) ? created : DETERMINISTIC_STAMP);
  cleanDoc.setModificationDate(DETERMINISTIC_STAMP);
  return {
    creationDate: (created instanceof Date && !Number.isNaN(created.getTime()) ? created : DETERMINISTIC_STAMP).toISOString(),
    modificationDate: DETERMINISTIC_STAMP.toISOString(),
    modificationDateIsOurs: true
  };
}

/** A fingerprint of the source's descriptive metadata, for the sidecar. */
export function sourceMetadataFingerprint(doc) {
  const read = (fn) => { try { const v = fn(); return typeof v === "string" ? v : ""; } catch { return ""; } };
  const parts = [
    read(() => doc.getTitle()), read(() => doc.getAuthor()), read(() => doc.getSubject()),
    read(() => doc.getKeywords()), read(() => doc.getCreator()), read(() => doc.getProducer())
  ];
  return crypto.createHash("sha256").update(parts.join("\u0000"), "utf8").digest("hex");
}

/** How far inside a control's own bounds the mark is drawn, in points. */
export const SELECTION_INSET = 2;
/** The mark's stroke. Heavier than the court's 0.72pt box, so it reads as a mark. */
export const SELECTION_LINE_WIDTH = 1.2;

/**
 * Marks selection controls the document already draws.
 *
 * A form that offers "check one option only" is answered by marking the box the
 * court printed. Two things this does NOT do, and the distinction is the whole
 * point:
 *
 *   * It never draws a box. Adding a control to a court's form changes the form
 *     rather than completing it, and a reader cannot tell a drawn box from a
 *     printed one.
 *   * It never redraws, thickens or moves the existing box. The two diagonals
 *     are struck strictly INSIDE the measured bounds, inset far enough that the
 *     court's own stroke is untouched.
 *
 * Every box passed here must have been MEASURED off the document. A derived
 * coordinate -- one inferred from where a label sits -- is how a mark ends up
 * in the margin next to nothing, so a selection carrying `measured: false` is
 * refused rather than drawn.
 */
function markSelections({ pages, selections, protectedRules, ink, report }) {
  report.selections = [];
  report.selectionsRefused = [];
  for (const selection of selections ?? []) {
    const page = pages[selection.page - 1];
    const refuse = (reason, detail = null) =>
      report.selectionsRefused.push({ control: selection.label ?? null, reason, ...(detail ? { detail } : {}) });
    if (!page) { refuse("selection_page_not_in_document"); continue; }
    if (selection.measured !== true) { refuse("selection_box_was_not_measured_off_the_document"); continue; }
    const box = selection.box ?? {};
    const { x0, y0, x1, y1 } = box;
    if (![x0, y0, x1, y1].every((n) => typeof n === "number" && Number.isFinite(n))) { refuse("selection_box_is_not_a_rectangle"); continue; }
    const width = x1 - x0, height = y1 - y0;
    const inset = selection.inset ?? SELECTION_INSET;
    // Inset twice over, so a control too small to mark inside its own stroke is
    // refused rather than marked over the court's line.
    if (!(width > inset * 2 + 1 && height > inset * 2 + 1)) {
      refuse("selection_box_is_too_small_to_mark_inside_its_own_bounds", `${width}x${height}pt with a ${inset}pt inset`);
      continue;
    }
    const { width: pageWidth, height: pageHeight } = page.getSize();
    if (x0 < 0 || y0 < 0 || x1 > pageWidth + 0.5 || y1 > pageHeight + 0.5) {
      refuse("selection_box_falls_outside_the_page", `${x0},${y0} to ${x1},${y1} on a ${pageWidth}x${pageHeight} page`);
      continue;
    }
    const trespass = (selection.protectedRules ?? protectedRules).find((r) =>
      r.page === selection.page && r.y >= y0 - PROTECTED_RULE_BAND && r.y <= y1 + PROTECTED_RULE_BAND
      && x0 < r.endX && x1 > r.x);
    if (trespass) {
      refuse("selection_box_lands_on_a_rule_the_court_owns",
        `the rule at page ${trespass.page} y=${trespass.y} is owned by ${JSON.stringify(trespass.caption ?? trespass.category ?? "the court")}`);
      continue;
    }
    const a = { x: x0 + inset, y: y0 + inset }, b = { x: x1 - inset, y: y1 - inset };
    const lineWidth = selection.lineWidth ?? SELECTION_LINE_WIDTH;
    page.drawLine({ start: a, end: b, thickness: lineWidth, color: ink });
    page.drawLine({ start: { x: a.x, y: b.y }, end: { x: b.x, y: a.y }, thickness: lineWidth, color: ink });
    report.selections.push({
      control: selection.label ?? null, page: selection.page,
      box: { x0, y0, x1, y1 }, inset, lineWidth,
      mark: "two_diagonal_strokes_inset",
      drewANewBox: false, redrewTheCourtsBox: false
    });
  }
}

/**
 * Finalizes a flat printed form by drawing values at measured anchors.
 *
 * A flat form has no widgets, so there is nothing to fill and nothing to
 * flatten: the values are drawn into page content directly and are therefore
 * visible from the moment they are written. The rest of the pipeline is
 * identical, because a flat form is just as capable of carrying a Launch
 * action or an XFA packet as a widget-bearing one.
 */
export async function finalizeFlatOverlay({
  sourceBytes,
  expectedSha256,
  anchors,
  // Existing selection controls the court already drew, and which of them this
  // configuration marks. Never a new box: see markSelections below.
  selections = [],
  protectedRules = [],
  // fieldName -> factId. The only way a descriptor marked
  // `requiresExplicitMapping` can bind, and it can override nothing: a protect
  // rule, a type guard and a caption-only document all still refuse.
  explicitMappings = {},
  facts,
  nonFilingNotice = null,
  // The document's own printed text. Passed so this path can hold for itself
  // rather than only when a caller remembered to look: the defect this closes
  // was a detector that returned false, and a path that trusts the caller
  // inherits every future miss the same way.
  documentTextLines = [],
  minFontSize = MIN_READABLE_FONT_SIZE,
  title = null,
  approvedTextColor = null
}) {
  const ink = participantInk(approvedTextColor);
  const sourceSha = crypto.createHash("sha256").update(sourceBytes).digest("hex");
  if (expectedSha256 && expectedSha256 !== sourceSha) {
    throw new Error(`source drift: expected ${expectedSha256}, read ${sourceSha}`);
  }
  // Either the caller's notice or one this path finds for itself, including in
  // the anchor labels — on a flat overlay those ARE the document's printed
  // text, so a reference-only notice sitting on an anchor is caught even with
  // no line list supplied.
  const flatHold = nonFilingNotice
    ?? detectNonFilingNotice([...documentTextLines, ...(anchors ?? []).map((a) => a?.label)])?.notice
    ?? null;
  if (flatHold) throw new NonFilingHoldError(flatHold);

  const pdfDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const report = { sourceSha256: sourceSha, written: [], refused: [], unfittable: [], expectedValues: [], normalized: [] };

  for (const anchor of anchors) {
    const page = pages[anchor.page - 1];
    if (!page) {
      report.refused.push({ anchor: anchor.label, reason: "anchor_page_not_in_document" });
      continue;
    }

    // A write box outside the page cannot be reviewed, cannot be read, and on a
    // filed document is a value that simply is not there. The factory had no
    // such check: an anchor at x=560 on a 612pt page was drawn, running off the
    // right edge. Refused rather than clipped — a clipped value on a filing is
    // a wrong value, not a shorter one.
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const box = anchor.writeBox;
    if (box.x < 0 || box.y < 0 || box.x + box.width > pageWidth + 0.5 || box.y + box.height > pageHeight + 0.5) {
      report.refused.push({
        anchor: anchor.label, reason: "write_box_falls_outside_the_page",
        detail: `box ${box.x},${box.y} ${box.width}x${box.height} against a ${pageWidth}x${pageHeight} page`
      });
      continue;
    }

    // Protection had been a naming convention: the protect rules are applied to
    // the anchor's LABEL, so an anchor labelled "Name Printed or Typed" whose
    // write box sits on the signature rule was written without complaint. A
    // court owns the blank, not the word next to it, so the rule the box lands
    // on is checked as well. This is geometry-based protection, and it holds
    // independently of what the label says.
    const trespass = (anchor.protectedRules ?? protectedRules).find((r) =>
      r.page === anchor.page
      && Math.abs(r.y + BASELINE_ABOVE_RULE - box.y) <= PROTECTED_RULE_BAND
      && box.x < r.endX && box.x + box.width > r.x);
    if (trespass) {
      report.refused.push({
        anchor: anchor.label, reason: "write_box_lands_on_a_rule_the_court_owns",
        category: trespass.category ?? "protected_rule",
        detail: `the rule at page ${trespass.page} y=${trespass.y} is owned by the protected caption ${JSON.stringify(trespass.caption ?? "")}`
      });
      continue;
    }

    // An anchor is only ever placed against an allowlisted label, but the
    // protect rules are applied again here: the drawing path must not be a way
    // around them.
    const decision = decideBinding(
      { name: anchor.label, pdfType: "text", effectiveLabel: anchor.label },
      {
        explicitMappings,
        captionOnly: anchor.captionOnly === true,
        availableChargeRows: Array.isArray(facts?.["matter.charges"]) ? facts["matter.charges"].length : 0
      }
    );
    if (!decision.writable) {
      report.refused.push({ anchor: anchor.label, reason: decision.reason, category: decision.category ?? null });
      continue;
    }
    const factId = anchor.factId ?? decision.factId;
    const raw = resolveFact(facts, factId);
    // Some blanks are followed by the word they are a blank FOR: Wisconsin's
    // venue line prints "CIRCUIT COURT, ______ COUNTY". Writing a county fact
    // that already carries the suffix produced "Milwaukee County   COUNTY" on
    // the caption of a petition. The suffix the form itself prints is removed
    // from the value, and the removal is recorded rather than done silently.
    let value = raw;
    const printedSuffix = anchor.printedSuffixAfterBlank ?? null;
    if (printedSuffix && typeof raw === "string") {
      // Anchored at the end, so the match has to be made against a trimmed
      // value: "La Crosse County " — which is what a form field and a CSV
      // import routinely produce — otherwise defeats the pattern, the trailing
      // space alone gets trimmed, and the venue renders "La Crosse County
      // COUNTY" while the audit record claims the suffix was removed. A false
      // normalization record is worse than none: it is the artifact a reviewer
      // would trust instead of looking.
      const escaped = printedSuffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // The abbreviation the same word is printed as. "Milwaukee Co." doubles
      // exactly as "Milwaukee County" does.
      const abbreviation = printedSuffix.length > 3 ? `${escaped.slice(0, 2)}\\.` : null;
      const alternatives = [escaped, ...(abbreviation ? [abbreviation] : [])].join("|");
      const base = raw.trim();
      const stripped = base.replace(new RegExp(`\\s*\\b(?:${alternatives})\\.?$`, "i"), "").trim();
      // Only when the suffix actually came off. A value that merely had
      // whitespace trimmed was not normalized and must not be recorded as if
      // it were.
      if (stripped !== base && stripped.length > 0) {
        value = stripped;
        report.normalized.push({ anchor: anchor.label, factId, from: raw, to: stripped,
          why: `the form prints ${JSON.stringify(printedSuffix)} after this blank, so the value must not repeat it` });
      } else {
        value = base;
      }
    }
    if (!valueMatchesType(value, decision.valueType)) {
      report.refused.push({ anchor: anchor.label, reason: "no_value_or_type_mismatch", factId });
      continue;
    }
    const fit = fitTextToWidget({
      font, text: String(value), rect: anchor.writeBox, multiline: false,
      maxFontSize: anchor.fontSize, minFontSize
    });
    if (fit.outcome === "refused") {
      report.unfittable.push({ anchor: anchor.label, factId, ...fit });
      report.refused.push({ anchor: anchor.label, reason: fit.reason, category: "unfittable" });
      continue;
    }
    page.drawText(fit.lines.join(" "), {
      x: anchor.writeBox.x, y: anchor.writeBox.y, size: fit.fontSize, font, color: ink
    });
    report.written.push({ anchor: anchor.label, factId, fontSize: fit.fontSize, outcome: fit.outcome });
    report.expectedValues.push(String(value));
  }

  markSelections({ pages, selections, protectedRules, ink, report });

  const { clean, report: sanitation } = await sanitizeAndFlatten(pdfDoc);
  report.sanitation = sanitation;
  report.sourceMetadataFingerprint = sourceMetadataFingerprint(pdfDoc);
  report.metadataCarried = preserveSourceMetadata(pdfDoc, clean);
  report.participantInk = approvedTextColor ? { ...approvedTextColor } : PARTICIPANT_INK_RGB;
  report.dates = carryDates(pdfDoc, clean);
  const bytes = await clean.save({ useObjectStreams: false, updateMetadata: false });
  report.metadataEmitted = await metadataOfBytes(bytes);
  report.metadataBranding = brandingInMetadata(report.metadataEmitted);
  if (report.metadataBranding.length > 0) {
    throw new Error(`refusing to emit: partner branding on a participant's official form (${report.metadataBranding.map((b) => b.field).join(", ")})`);
  }
  const residue = scanBytesForActiveContent(bytes);
  if (!residue.inspectable) throw new Error("finalized overlay is not byte-inspectable");
  if (residue.hits.length > 0) throw new Error(`refusing to emit: active-content residue remains: ${residue.hits.join(", ")}`);
  report.activeContentScan = residue;
  report.outputSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  report.outputBytes = bytes.length;
  return { bytes, report };
}

export class NonFilingHoldError extends Error {
  constructor(notice) {
    super(`document states it is not for filing: ${String(notice).slice(0, 160)}`);
    this.name = "NonFilingHoldError";
    this.notice = notice;
  }
}

/**
 * Fills, fits, flattens, sanitizes and stamps one form.
 *
 * `census` supplies each field's pdf type, widget rectangle and multiline
 * flag, all read from the binary. `facts` is the fact set. Refusals -- a
 * protected field, an unfittable value, a charge row with no charge -- are
 * returned, never worked around.
 */
/*
 * Rewrites the size token of each widget's own /DA to the measured fit.
 *
 * Only the size changes. The font resource name and every other operator in the
 * widget's own default-appearance string are preserved exactly, because the
 * appearance generator resolves that name against the AcroForm /DR and
 * substituting a different font would change the drawn glyphs as well as their
 * size. A widget with no /DA of its own already follows the field and is left
 * untouched. A widget whose declared size already equals the fit is left
 * untouched too, so this can never move bytes it does not need to move.
 */
function alignWidgetDefaultAppearanceSizes(handle, fontSize) {
  const aligned = [];
  const widgets = (() => { try { return handle.acroField.getWidgets(); } catch { return []; } })();
  widgets.forEach((widget, index) => {
    const entry = widget.dict.get(PDFName.of("DA"));
    if (!(entry instanceof PDFString || entry instanceof PDFHexString)) return;
    const before = entry.decodeText();
    const after = before.replace(/(^|\s)(\d*\.?\d+)(\s+Tf\b)/,
      (whole, lead, size, tail) => (Number(size) === Number(fontSize) ? whole : `${lead}${fontSize}${tail}`));
    if (after === before) return;
    widget.dict.set(PDFName.of("DA"), PDFString.of(after));
    aligned.push({ widgetIndex: index, before, after });
  });
  return aligned;
}

/*
 * Writes a SIZE OF ITS OWN into every widget of one field.
 *
 * alignWidgetDefaultAppearanceSizes above stamps ONE size -- the field's single
 * measured fit -- onto every widget that already carries a /DA. That is the
 * right repair when a field's widgets are the same shape, and the wrong one
 * when they are not. CN-10557 carries `DefName` across twenty widgets from
 * 208.23 to 366.15 points wide, and the fit is measured against widgets[0]
 * alone: the boundary name fitted at 6.5pt in a 228.92pt box, and at 6.5pt it
 * needs 219.5pt, which is 15 points more than the narrowest widget can hold. So
 * four widgets overflowed, and on four pages a word left the 612-point page
 * altogether and was cut mid-word -- a cover letter to a court carrying a
 * truncated name and a truncated address.
 *
 * A widget is a place on paper. One measurement cannot describe twenty of them,
 * so this writes each widget's own measured size into that widget's own /DA,
 * and leaves the field-level /DA at the SMALLEST of them so a widget with no
 * /DA of its own inherits a size that is safe everywhere. Only the size token
 * moves; the font resource name and the colour operators are preserved exactly,
 * for the reason given above. A widget with no /DA and no field /DA to copy is
 * left alone -- it is already covered by the field-level minimum.
 */
function applyPerWidgetDefaultAppearanceSizes(handle, sizes, fieldDefaultAppearance) {
  const applied = [];
  const widgets = (() => { try { return handle.acroField.getWidgets(); } catch { return []; } })();
  widgets.forEach((widget, index) => {
    const size = sizes[index];
    if (!(size > 0)) return;
    const own = widget.dict.get(PDFName.of("DA"));
    const before = (own instanceof PDFString || own instanceof PDFHexString)
      ? own.decodeText()
      : (typeof fieldDefaultAppearance === "string" ? fieldDefaultAppearance : null);
    if (before == null) return;
    const after = before.replace(/(^|\s)(\d*\.?\d+)(\s+Tf\b)/,
      (whole, lead, current, tail) => (Number(current) === Number(size) ? whole : `${lead}${size}${tail}`));
    if (after === before && (own instanceof PDFString || own instanceof PDFHexString)) return;
    widget.dict.set(PDFName.of("DA"), PDFString.of(after));
    applied.push({ widgetIndex: index, fontSize: size, before, after });
  });
  return applied;
}

/**
 * The orders a form can print a date in, and how an ISO fact is written in each.
 *
 * A closed vocabulary rather than a format string: a caller that can pass
 * arbitrary punctuation can invent an order this module has never rendered, and
 * the whole point of naming the order is that it was read off the form.
 */
export const PRINTED_DATE_ORDERS = Object.freeze({
  month_day_year: ({ year, month, day }) => `${month}/${day}/${year}`
});

/** An ISO date fact, written in the order the form prints beneath the blank. */
export function isoDateInPrintedOrder(iso, order, fieldName = null) {
  const render = PRINTED_DATE_ORDERS[order];
  if (!render) {
    throw new Error(`unknown printed date order ${JSON.stringify(order)}${fieldName ? ` for field ${JSON.stringify(fieldName)}` : ""}; known orders are ${Object.keys(PRINTED_DATE_ORDERS).join(", ")}`);
  }
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).trim());
  if (!parts) {
    throw new Error(`a printed date order was asked for a value that is not an ISO date: ${JSON.stringify(iso)}${fieldName ? ` on field ${JSON.stringify(fieldName)}` : ""}`);
  }
  return render({ year: parts[1], month: parts[2], day: parts[3] });
}

export async function finalizeOfficialForm({
  sourceBytes,
  expectedSha256,
  census,
  facts,
  explicitMappings = {},
  // Fields the classifier decided, by ROLE, that the participant does not
  // complete. Supplied by the caller because only the caller has the
  // classification, and required here because deciding twice means deciding
  // differently: the driver refused these and recorded them in the map's
  // unwritableFields, then called this function, which re-derived every
  // decision from the census alone and wrote them anyway. KY AOC-334's `Court`
  // and `Date`, VA CC-1201's `User.FullName` and `User.Sex`, NE DC 1:15's
  // `adoptionof` and VT 600-00228's `3` were all refused in their own maps and
  // present in their own bytes -- and the comment beside the driver's refusal
  // asserted the factory would refuse them at render time, which nothing did.
  unwritableFields = [],
  captionOnly = false,
  documentAcceptsFill = true,
  nonFilingNotice = null,
  // As above: this path holds on the document's own words, not only on the
  // caller's reading of them.
  documentTextLines = [],
  maxFontSize,
  minFontSize = MIN_READABLE_FONT_SIZE,
  // Passed straight through to the fitter. See its own comment: the descending
  // ladder can step past the declared minimum without ever trying it, and a
  // value that fits there is refused. Opt-in, because the families sharing this
  // finalizer are rebuilt by different workers at different times.
  evaluateDeclaredMinimumSize = false,
  /*
   * Whether a fitted font size is also written onto the field's own WIDGETS.
   *
   * applyFitToTextField sets the size on the FIELD's /DA. A widget annotation
   * may carry its own /DA, and where it does the widget's entry is the one the
   * appearance generator uses -- so the field-level size is discarded and the
   * value renders at whatever size the widget declares.
   *
   * That is not cosmetic. On the CPL 160.59 pro se packet every widget of
   * "Applicant Name", "Street Address", "City State Zip", "Phone" and "Email"
   * carries `/Arial 11 Tf 0 0 0 rg` while the field-level entry is `/Helv 0 Tf`.
   * The fitter measured the boundary values down to 7.5, 9.5, 7 and 8 points and
   * reported outcome "shrunk"; the bytes drew all five at 11 and three of them
   * ran off the right edge of a 612-point page. The report was true about the
   * fit and false about the ink, which is the worst shape a report can take.
   *
   * The alignment rewrites ONLY the size token inside each widget's existing
   * /DA, preserving its font resource name and its colour operators, so a value
   * whose fit is the widget's declared size is a no-op and no family's canonical
   * bytes move on that account.
   *
   * Opt-in, on the same reasoning as evaluateDeclaredMinimumSize above: the
   * families sharing this finalizer are rebuilt by different workers at
   * different times, and a repair lane holding a few families does not get to
   * decide what the others' next rebuild produces.
   *
   * CAPTAIN DECISION: like the flag above, this default should flip to true once
   * every family can be rebuilt together. A shrunk fit that the bytes ignore is
   * a defect wherever it occurs, not only here.
   */
  alignWidgetFontSizeToFit = false,
  /*
   * Whether each WIDGET of a multi-widget text field is fitted on its own
   * rectangle instead of all of them on widgets[0].
   *
   * `const rect = field.widgets?.[0]?.rect` below is the whole of the current
   * measurement. Where a field's widgets are the same shape that is exact; where
   * they are not it is a measurement of one box applied to boxes it never saw.
   * On CN-10557 it put participant text off the right edge of a 612-point page
   * on four pages of the delivered boundary filing while the build report called
   * the same writes "fit" and "shrunk".
   *
   * With this on, every widget is fitted on its own rectangle. The field's VALUE
   * -- and, for a multiline field, its line breaks -- comes from the most
   * constraining widget, because a field holds one string however many places it
   * appears; each widget's own /DA then carries that widget's own size. If ANY
   * widget cannot hold the value at a readable size the whole field is refused,
   * which is the existing behaviour of this module extended to every box rather
   * than to the first one: a value half of whose appearances are legible is not
   * a written field.
   *
   * Opt-in on the same reasoning as the two flags above: forty-odd builders
   * share this module and a repair lane does not get to decide what the other
   * families' next rebuild produces. A single-widget field measures identically
   * either way, so a family whose fields carry one widget each is byte-identical
   * with it on.
   *
   * CAPTAIN DECISION: this default should flip to true once every family can be
   * rebuilt together.
   */
  fitTextPerWidget = false,
  title = null,
  // Field name -> appearance disposition, for the family being rendered. The
  // caller resolves it from the shared semantic registry; an empty map leaves
  // every field on the structural default, which is what every unclassified
  // family gets.
  appearanceDispositions = new Map(),
  /*
   * Whether a suppressed control is also detached from a NESTED field tree.
   *
   * The suppression itself is not in question: a pushbutton is chrome and
   * structuralDisposition has always called it SUPPRESS_CONTROL_APPEARANCE. The
   * question is whether the detachment REACHES it. ISO 32000-1 8.6.1 lets a
   * field tree nest, and on the California Judicial Council forms it does: the
   * AcroForm's /Fields array holds one root and every terminal field hangs
   * beneath it, so the flat scan removed nothing, updateFieldAppearances
   * regenerated each pushbutton's appearance from its /MK /CA caption, and
   * flatten() stamped it onto the page through the widget's own /P.
   *
   * Opt-in, on the same reasoning as evaluateDeclaredMinimumSize and
   * alignWidgetFontSizeToFit above: the families sharing this finalizer are
   * rebuilt by different workers at different times, and a repair lane holding
   * one family does not get to decide what the others' next rebuild produces.
   * A family whose controls sit directly in /Fields is unaffected either way.
   *
   * CAPTAIN DECISION: like those flags, this default should flip to true once
   * every family can be rebuilt together. A control caption stamped off the
   * edge of the paper is a defect wherever it occurs, not only here.
   */
  detachNestedControlFields = false,
  /*
   * TEXT fields whose SHIPPED value must not survive into the artifact.
   *
   * The chooser-prompt block further down already handles a choice field that
   * arrives selected. A text field can arrive filled in the same way, and it is
   * worse, because a chooser prompt reads as a prompt while a filled text field
   * reads as an answer the participant gave.
   *
   * The Texas Statement of Inability to Afford Payment of Court Costs is the
   * case this was written for: the held copy ships with "Value / Valor 11" = 0,
   * "Amount Cantidad 15" = 0 and "Today" = 12/15/2022. Those three ride through
   * a flatten as ordinary ink, so a packet whose own field map declares all
   * three REQUIRED_BEFORE_FILING nevertheless delivered a sworn declaration
   * already dated, over two sworn financial totals already asserted as zero,
   * while its instructions told the participant to supply exactly those facts.
   * Neither number nor date is a fact the platform holds about anyone.
   *
   * Clearing the value alone is not enough, for the same reason the chooser
   * block gives: pdf-lib keeps the widget's existing appearance stream and the
   * old ink renders from that, so the appearance goes too and flatten
   * regenerates from nothing. A field this run WROTE is never touched.
   *
   * Opt-in, on the same reasoning as evaluateDeclaredMinimumSize and
   * alignWidgetFontSizeToFit above: the families sharing this finalizer are
   * rebuilt by different workers at different times, and a repair lane holding
   * a few families does not get to decide what the others' next rebuild
   * produces. Every caller that does not pass this list is byte-unaffected.
   */
  clearSourceCarriedTextValues = [],
  /*
   * DATE fields whose value is printed in the ORDER THE FORM PRINTS BENEATH IT.
   *
   * A date fact is STORED one way and PRINTED another, and until now this
   * module only knew the first. valueMatchesType requires a date fact to be
   * YYYY-MM-DD, `let text = String(value)` writes exactly that string, and
   * nothing between them consults the form. So every family renders ISO,
   * whatever its form asks for -- which two other families (AR misdemeanor DWI
   * and CT clean slate) already recorded as a shared-factory question rather
   * than one of their own.
   *
   * The Texas Statement of Inability to Afford Payment of Court Costs is the
   * case that makes it a defect rather than a convention. Its page 2 prints
   * "Month Day Year / Mes Dia Ano" on the rule directly beneath the date-of-
   * birth blank, and the packet drew "1994-04-17" on it. Read in the order the
   * form names, that is month 1994, day 04, year 17. The ink is not merely
   * unconventional there; it disagrees with the printed line it sits on.
   *
   * The caller names the FIELD and the ORDER, because the caller is the one
   * that has read the form's own printed line and can be held to it. This
   * module never guesses an order from a field name, a locale or a
   * jurisdiction: a date silently reordered by inference is the same defect
   * pointing the other way.
   *
   * Opt-in, on the same reasoning as evaluateDeclaredMinimumSize,
   * alignWidgetFontSizeToFit, fitTextPerWidget, detachNestedControlFields and
   * clearSourceCarriedTextValues above: forty-odd families share this module
   * and are rebuilt by different workers at different times, and a repair lane
   * holding one family does not get to decide what the others' next rebuild
   * produces. Every caller that does not pass this map is byte-unaffected.
   *
   * CAPTAIN DECISION: this is the fifth flag with that paragraph. The corpus
   * needs one rebuild-everything moment, after which these defaults flip.
   */
  printedDateOrderByField = {}
}) {
  const sourceSha = crypto.createHash("sha256").update(sourceBytes).digest("hex");
  if (expectedSha256 && expectedSha256 !== sourceSha) {
    throw new Error(`source drift: expected ${expectedSha256}, read ${sourceSha}`);
  }

  // A form that says on its own face that it must not be completed for filing
  // is never filled, whatever else the profile says.
  const hold = nonFilingNotice ?? detectNonFilingNotice(documentTextLines)?.notice ?? null;
  if (hold) throw new NonFilingHoldError(hold);

  const pdfDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const form = pdfDoc.getForm();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  // Before anything is written: setting a font size edits the /DA string, so a
  // field without one has to be given a default first.
  const defaultAppearancesRepaired = ensureDefaultAppearances(form);

  const availableChargeRows = Array.isArray(facts?.["matter.charges"]) ? facts["matter.charges"].length : 0;
  const report = {
    sourceSha256: sourceSha,
    written: [],
    refused: [],
    unfittable: [],
    protectedFields: [],
    expectedValues: [],
    // Widgets whose own /DA size was brought into line with the measured fit.
    // Empty unless alignWidgetFontSizeToFit is on; empty then too when no widget
    // carries its own /DA, or the fit already equals what that /DA declares.
    widgetFontSizeAligned: [],
    // Widgets fitted on their own rectangle. Empty unless fitTextPerWidget is on.
    widgetFittedIndividually: []
  };

  // Deciding and writing used to happen in one pass, which cannot see that two
  // widgets are competing for one place on the paper. Every field is decided
  // first, the writable ones are reduced to one per slot, and only then is
  // anything written — so the artifact and the map agree about which widget
  // carries the value.
  const unwritableByRole = new Set((unwritableFields ?? []).map((f) => String(f?.field ?? f?.name ?? f)));

  const allowed = [];
  for (const field of census) {
    // Role first, and it is not overridable. The name channel can only ever
    // widen what binds; a class the classifier declined to call participant is
    // the caller's finding about the whole field, and no pattern match on its
    // name is entitled to reverse it.
    if (unwritableByRole.has(field.name)) {
      report.refused.push({ field: field.name, reason: "classified_unwritable_by_role", category: "role" });
      report.protectedFields.push({ field: field.name, category: "role" });
      continue;
    }

    const decision = decideBinding(
      { name: field.name, pdfType: field.type, effectiveLabel: field.effectiveLabel, regionHeading: field.regionHeading },
      { explicitMappings, captionOnly, availableChargeRows, documentAcceptsFill }
    );

    if (!decision.writable) {
      report.refused.push({ field: field.name, reason: decision.reason, category: decision.category ?? null,
        regionHeading: decision.regionHeading ?? null });
      if (decision.reason === "protected_category" || decision.reason === "protected_page_region" || decision.category === "type_guard") {
        report.protectedFields.push({ field: field.name, category: decision.category });
      }
      continue;
    }
    allowed.push({
      field, decision,
      name: field.name, factId: decision.factId, pdfType: field.type,
      page: field.widgets?.[0]?.page ?? 1, rect: field.widgets?.[0]?.rect ?? null
    });
  }

  const slots = selectOnePerSlot(allowed);
  for (const loser of slots.refused) {
    report.refused.push({ field: loser.name, reason: loser.reason, category: loser.category,
      factId: loser.factId, keptInstead: loser.keptInstead });
  }
  report.slotArbitration = { candidates: allowed.length, kept: slots.kept.length, refusedAsDuplicate: slots.refused.length };

  for (const { field, decision } of slots.kept) {
    const value = resolveFact(facts, decision.factId);
    if (!valueMatchesType(value, decision.valueType)) {
      report.refused.push({ field: field.name, reason: "no_value_or_type_mismatch", factId: decision.factId });
      continue;
    }

    let handle;
    try { handle = form.getField(field.name); } catch {
      report.refused.push({ field: field.name, reason: "field_not_present_in_form" });
      continue;
    }

    if (handle instanceof PDFDropdown) {
      const options = handle.getOptions?.() ?? [];
      const wanted = String(value).trim().toLowerCase();
      const match = options.find((o) => String(o).trim().toLowerCase() === wanted)
        ?? options.find((o) => String(o).trim().toLowerCase() === wanted.replace(/\s*county$/, ""));
      if (!match) {
        report.refused.push({ field: field.name, reason: "value_not_among_field_options", factId: decision.factId });
        continue;
      }
      handle.select(match);
      report.written.push({ field: field.name, factId: decision.factId, kind: "dropdown" });
      report.expectedValues.push(String(match));
      continue;
    }

    if (!(handle instanceof PDFTextField)) {
      report.refused.push({ field: field.name, reason: "non_text_field_type", category: "type_guard" });
      continue;
    }

    const rect = field.widgets?.[0]?.rect ?? null;
    const declaredMax = field.maxLength ?? null;
    let text = String(value);
    /*
     * The stored order is the fact's; the printed order is the form's. Only a
     * field the caller named is reordered, and only a date: asking for an order
     * on a field that did not resolve to a date descriptor is a caller error and
     * is thrown rather than ignored, because a silently skipped reorder leaves
     * the wrong ink on the page with a report that says it was asked for.
     */
    const printedOrder = printedDateOrderByField[field.name];
    if (printedOrder !== undefined) {
      if (decision.valueType !== "date") {
        throw new Error(`printedDateOrderByField names ${JSON.stringify(field.name)}, which binds ${decision.factId} as ${decision.valueType} rather than a date`);
      }
      text = isoDateInPrintedOrder(text, printedOrder, field.name);
    }
    if (declaredMax && text.length > declaredMax) {
      // The form's own limit wins over any preference of ours.
      report.refused.push({ field: field.name, reason: "value_exceeds_form_max_length", maxLength: declaredMax, valueLength: text.length, factId: decision.factId });
      continue;
    }

    const rects = fitTextPerWidget
      ? (field.widgets ?? []).map((w) => w?.rect).filter((r) => r)
      : [];
    const perWidgetFits = rects.map((widgetRect) => fitTextToWidget({
      font: helvetica,
      text,
      rect: widgetRect,
      multiline: field.multiline === true,
      maxFontSize,
      minFontSize,
      evaluateDeclaredMinimumSize
    }));
    // The most constraining widget decides the string that is stored and, for a
    // multiline field, where its lines break; a field holds one value however
    // many places it is printed.
    const fit = perWidgetFits.length > 0
      ? (perWidgetFits.find((f) => f.outcome === "refused")
        ?? perWidgetFits.reduce((tightest, candidate) => (candidate.fontSize < tightest.fontSize ? candidate : tightest)))
      : fitTextToWidget({
        font: helvetica,
        text,
        rect,
        multiline: field.multiline === true,
        maxFontSize,
        minFontSize,
        evaluateDeclaredMinimumSize
      });

    if (fit.outcome === "refused") {
      const refusedWidget = perWidgetFits.findIndex((f) => f.outcome === "refused");
      report.unfittable.push({
        field: field.name, factId: decision.factId, ...fit,
        ...(refusedWidget >= 0 ? { refusedAtWidgetIndex: refusedWidget, widgetsMeasured: perWidgetFits.length } : {})
      });
      report.refused.push({
        field: field.name, reason: fit.reason, category: "unfittable",
        ...(refusedWidget >= 0 ? { refusedAtWidgetIndex: refusedWidget, widgetsMeasured: perWidgetFits.length } : {})
      });
      continue;
    }

    applyFitToTextField(handle, fit);
    const perWidgetSizes = perWidgetFits.map((f) => f.fontSize);
    const fittedIndividually = perWidgetFits.length > 1
      ? applyPerWidgetDefaultAppearanceSizes(handle, perWidgetSizes,
        (() => { try { return handle.acroField.getDefaultAppearance(); } catch { return null; } })())
      : [];
    if (fittedIndividually.length) {
      report.widgetFittedIndividually.push({
        field: field.name, fontSizes: perWidgetSizes, widgets: fittedIndividually
      });
    }
    // The blanket alignment is the fallback for a family that has not opted into
    // per-widget fitting; running both would stamp one size over the individual
    // ones this field just measured.
    const widgetsAligned = (alignWidgetFontSizeToFit && fittedIndividually.length === 0)
      ? alignWidgetDefaultAppearanceSizes(handle, fit.fontSize)
      : [];
    if (widgetsAligned.length) {
      report.widgetFontSizeAligned.push({ field: field.name, fontSize: fit.fontSize, widgets: widgetsAligned });
    }
    report.written.push({
      field: field.name, factId: decision.factId, kind: "text",
      fontSize: fit.fontSize, outcome: fit.outcome, lines: fit.lines.length,
      ...(printedOrder !== undefined
        ? { printedDateOrder: printedOrder, storedValue: String(value), printedValue: text }
        : {}),
      ...(perWidgetFits.length > 1 ? { widgetFontSizes: perWidgetSizes } : {}),
      ...(fittedIndividually.length ? { widgetsFittedIndividually: fittedIndividually.length } : {}),
      ...(widgetsAligned.length ? { widgetFontSizeAligned: widgetsAligned.length } : {})
    });
    report.expectedValues.push(text);
  }

  // A choice field nobody selected still carries the source document's own
  // chooser prompt, and flattening draws it onto the page as ordinary ink:
  // Nebraska's forms ship selected on "Choose the court" and "Choose the
  // county", so a filed pleading told the court to choose one.
  //
  // Clearing the value alone does not do it. pdf-lib leaves the widget's
  // existing appearance stream in place and the prompt renders from that, so
  // the stale appearance goes too and flatten regenerates from nothing. A
  // field this run WROTE is never touched here.
  const written = new Set(report.written.map((w) => w.field));
  report.promptsSuppressed = [];
  for (const handle of form.getFields()) {
    const name = handle.getName();
    if (written.has(name)) continue;
    if (typeof handle.getOptions !== "function" || typeof handle.getSelected !== "function") continue;
    let selected = [];
    let options = [];
    try { selected = handle.getSelected() ?? []; options = handle.getOptions() ?? []; } catch { continue; }
    if (!selected.some((value) => isChooserPrompt(value, options))) continue;
    handle.acroField.dict.delete(PDFName.of("V"));
    for (const widget of handle.acroField.getWidgets()) widget.dict.delete(PDFName.of("AP"));
    report.promptsSuppressed.push({ field: name, suppressed: selected });
  }

  // The same problem for text fields the source shipped already filled. See
  // clearSourceCarriedTextValues above. Empty by default, so a caller that does
  // not ask for this gets exactly the bytes it got before.
  report.sourceCarriedValuesCleared = [];
  const clearRequested = new Set(clearSourceCarriedTextValues ?? []);
  if (clearRequested.size > 0) {
    for (const handle of form.getFields()) {
      const name = handle.getName();
      if (!clearRequested.has(name) || written.has(name)) continue;
      if (typeof handle.getText !== "function") continue;
      let carried = null;
      try { carried = handle.getText() ?? null; } catch { carried = null; }
      if (carried === null || String(carried).trim() === "") continue;
      handle.acroField.dict.delete(PDFName.of("V"));
      for (const widget of handle.acroField.getWidgets()) widget.dict.delete(PDFName.of("AP"));
      report.sourceCarriedValuesCleared.push({ field: name, cleared: carried });
    }
    const notFound = [...clearRequested]
      .filter((name) => !report.sourceCarriedValuesCleared.some((row) => row.field === name));
    if (notFound.length > 0) {
      // A named field that carried nothing means the source changed under the
      // caller's reading of it, and silently doing nothing would hide that.
      throw new Error(
        `clearSourceCarriedTextValues names ${notFound.length} field(s) this source does not carry a value in: ${notFound.join(", ")}`
      );
    }
  }

  // The fields this run actually bound. A chooser in this set was answered by
  // the participant; one outside it is still showing the court's own prompt.
  const { clean, report: sanitation } = await sanitizeAndFlatten(pdfDoc, {
    defaultFont: helvetica,
    writtenFields: new Set(report.written.map((w) => w.field)),
    // What each classified field's appearance means. The caller resolves this
    // for the family it is rendering and hands over a plain field-name map, so
    // the finalizer never learns which family it is working on.
    appearanceDispositions,
    detachNestedControlFields
  });
  report.sanitation = { ...sanitation, defaultAppearancesRepairedBeforeFill: defaultAppearancesRepaired };

  report.sourceMetadataFingerprint = sourceMetadataFingerprint(pdfDoc);
  report.metadataCarried = preserveSourceMetadata(pdfDoc, clean);
  report.participantInk = PARTICIPANT_INK_RGB;
  report.dates = carryDates(pdfDoc, clean);

  // Serialized without object streams so the residue scan can actually see
  // into the file it is judging.
  const bytes = await clean.save({ useObjectStreams: false, updateMetadata: false });
  report.metadataEmitted = await metadataOfBytes(bytes);
  report.metadataBranding = brandingInMetadata(report.metadataEmitted);
  if (report.metadataBranding.length > 0) {
    throw new Error(`refusing to emit: partner branding on a participant's official form (${report.metadataBranding.map((b) => b.field).join(", ")})`);
  }

  const residue = scanBytesForActiveContent(bytes);
  if (!residue.inspectable) {
    throw new Error("finalized artifact is not byte-inspectable: object streams would hide active-content residue");
  }
  if (residue.hits.length > 0) {
    throw new Error(`refusing to emit: active-content residue remains: ${residue.hits.join(", ")}`);
  }
  report.activeContentScan = residue;
  report.outputSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  report.outputBytes = bytes.length;
  return { bytes, report };
}
