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
import { decideBinding, resolveFact, valueMatchesType } from "./rcap-field-semantics.mjs";
import { fitTextToWidget, applyFitToTextField, MIN_READABLE_FONT_SIZE } from "./rcap-text-fitting.mjs";
import { sanitizeAndFlatten, scanBytesForActiveContent, ensureDefaultAppearances } from "./rcap-active-content.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFDropdown, StandardFonts, rgb } = require("pdf-lib");

// A fixed instant: a fresh document otherwise stamps the wall clock into its
// info dictionary, and every render of the same facts would differ.
export const DETERMINISTIC_STAMP = new Date("2026-01-01T00:00:00Z");

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
  protectedRules = [],
  facts,
  nonFilingNotice = null,
  minFontSize = MIN_READABLE_FONT_SIZE,
  title = null
}) {
  const sourceSha = crypto.createHash("sha256").update(sourceBytes).digest("hex");
  if (expectedSha256 && expectedSha256 !== sourceSha) {
    throw new Error(`source drift: expected ${expectedSha256}, read ${sourceSha}`);
  }
  if (nonFilingNotice) throw new NonFilingHoldError(nonFilingNotice);

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
    // right edge.
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
    // on is checked as well.
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
      { captionOnly: anchor.captionOnly === true, availableChargeRows: Array.isArray(facts?.["matter.charges"]) ? facts["matter.charges"].length : 0 }
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
      const stripped = raw.replace(new RegExp(`\\s*\\b${printedSuffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.?$`, "i"), "").trim();
      if (stripped !== raw && stripped.length > 0) {
        value = stripped;
        report.normalized.push({ anchor: anchor.label, factId, from: raw, to: stripped,
          why: `the form prints ${JSON.stringify(printedSuffix)} after this blank, so the value must not repeat it` });
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
      x: anchor.writeBox.x, y: anchor.writeBox.y, size: fit.fontSize, font, color: PARTICIPANT_INK
    });
    report.written.push({ anchor: anchor.label, factId, fontSize: fit.fontSize, outcome: fit.outcome });
    report.expectedValues.push(String(value));
  }

  const { clean, report: sanitation } = await sanitizeAndFlatten(pdfDoc);
  report.sanitation = sanitation;
  preserveSourceMetadata(pdfDoc, clean);
  clean.setCreationDate(DETERMINISTIC_STAMP);
  clean.setModificationDate(DETERMINISTIC_STAMP);
  const bytes = await clean.save({ useObjectStreams: false });
  const residue = scanBytesForActiveContent(bytes);
  if (!residue.inspectable) throw new Error("finalized overlay is not byte-inspectable");
  if (residue.hits.length > 0) throw new Error(`refusing to emit: active-content residue remains: ${residue.hits.join(", ")}`);
  report.activeContentScan = residue;
  report.outputSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  report.outputBytes = bytes.length;
  return { bytes, report };
}

// Participant values are drawn in black. The renderer defaulted to a dark blue
// for no recorded reason; a filed court form is a black-ink document unless its
// own instructions say otherwise, and an unexplained colour on a filing is a
// difference nobody asked for. A form that genuinely requires another ink can
// pass one explicitly.
export const PARTICIPANT_INK = rgb(0, 0, 0);

// The write box sits this far above the rule it is measured from, so a box that
// belongs to a protected rule is one whose baseline is this far above it.
const BASELINE_ABOVE_RULE = 2;
// Tolerance around that, so a profile that rounds differently still trips.
const PROTECTED_RULE_BAND = 3;

/**
 * Carries the court's own document metadata onto the finalized artifact.
 *
 * The finalizer used to stamp its own Producer and Creator and overwrite the
 * Title, which destroyed the issuing court's provenance -- author, subject,
 * keywords and the form's real name -- and wrote partner branding into a
 * document whose footer says it shall not be modified. The participant's
 * official form carries the court's identity, not ours.
 *
 * Provenance for our purposes lives in the sidecar artifact record instead,
 * where it can hold the source and output hashes, the field-map hash and the
 * factory version -- none of which fits in a PDF Info dictionary, and none of
 * which should be trusted from one anyway.
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
export async function finalizeOfficialForm({
  sourceBytes,
  expectedSha256,
  census,
  facts,
  explicitMappings = {},
  captionOnly = false,
  documentAcceptsFill = true,
  nonFilingNotice = null,
  maxFontSize,
  minFontSize = MIN_READABLE_FONT_SIZE,
  title = null
}) {
  const sourceSha = crypto.createHash("sha256").update(sourceBytes).digest("hex");
  if (expectedSha256 && expectedSha256 !== sourceSha) {
    throw new Error(`source drift: expected ${expectedSha256}, read ${sourceSha}`);
  }

  // A form that says on its own face that it must not be completed for filing
  // is never filled, whatever else the profile says.
  if (nonFilingNotice) throw new NonFilingHoldError(nonFilingNotice);

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
    expectedValues: []
  };

  for (const field of census) {
    const decision = decideBinding(
      { name: field.name, pdfType: field.type, effectiveLabel: field.effectiveLabel },
      { explicitMappings, captionOnly, availableChargeRows, documentAcceptsFill }
    );

    if (!decision.writable) {
      report.refused.push({ field: field.name, reason: decision.reason, category: decision.category ?? null });
      if (decision.reason === "protected_category" || decision.category === "type_guard") {
        report.protectedFields.push({ field: field.name, category: decision.category });
      }
      continue;
    }

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
    if (declaredMax && text.length > declaredMax) {
      // The form's own limit wins over any preference of ours.
      report.refused.push({ field: field.name, reason: "value_exceeds_form_max_length", maxLength: declaredMax, valueLength: text.length, factId: decision.factId });
      continue;
    }

    const fit = fitTextToWidget({
      font: helvetica,
      text,
      rect,
      multiline: field.multiline === true,
      maxFontSize,
      minFontSize
    });

    if (fit.outcome === "refused") {
      report.unfittable.push({ field: field.name, factId: decision.factId, ...fit });
      report.refused.push({ field: field.name, reason: fit.reason, category: "unfittable" });
      continue;
    }

    applyFitToTextField(handle, fit);
    report.written.push({
      field: field.name, factId: decision.factId, kind: "text",
      fontSize: fit.fontSize, outcome: fit.outcome, lines: fit.lines.length
    });
    report.expectedValues.push(text);
  }

  const { clean, report: sanitation } = await sanitizeAndFlatten(pdfDoc, { defaultFont: helvetica });
  report.sanitation = { ...sanitation, defaultAppearancesRepairedBeforeFill: defaultAppearancesRepaired };

  preserveSourceMetadata(pdfDoc, clean);
  clean.setCreationDate(DETERMINISTIC_STAMP);
  clean.setModificationDate(DETERMINISTIC_STAMP);

  // Serialized without object streams so the residue scan can actually see
  // into the file it is judging.
  const bytes = await clean.save({ useObjectStreams: false });

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
