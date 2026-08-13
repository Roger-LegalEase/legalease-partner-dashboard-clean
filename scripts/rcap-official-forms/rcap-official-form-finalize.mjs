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
import { fitTextToWidget, applyFitToTextField, verifyWrittenValue, MIN_READABLE_FONT_SIZE } from "./rcap-text-fitting.mjs";
import { extractTextItems } from "./rcap-pdf-anchor-capture.mjs";
import { sanitizeAndFlatten, assertInspectableAndClean, ensureDefaultAppearances } from "./rcap-active-content.mjs";

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
  const report = { sourceSha256: sourceSha, written: [], refused: [], unfittable: [], expectedValues: [] };

  for (const anchor of anchors) {
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
    const value = resolveFact(facts, factId);
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
    const page = pages[anchor.page - 1];
    if (!page) {
      report.refused.push({ anchor: anchor.label, reason: "anchor_page_not_in_document" });
      continue;
    }
    page.drawText(fit.lines.join(" "), {
      x: anchor.writeBox.x, y: anchor.writeBox.y, size: fit.fontSize, font, color: rgb(0, 0, 0.55)
    });
    report.written.push({ anchor: anchor.label, factId, fontSize: fit.fontSize, outcome: fit.outcome });
    report.expectedValues.push(String(value));
  }

  const { clean, report: sanitation } = await sanitizeAndFlatten(pdfDoc);
  report.sanitation = sanitation;
  clean.setProducer("LegalEase RCAP official-form factory (pdf-lib)");
  clean.setCreator("LegalEase RCAP");
  if (title) clean.setTitle(title);
  clean.setCreationDate(DETERMINISTIC_STAMP);
  clean.setModificationDate(DETERMINISTIC_STAMP);
  const bytes = await clean.save({ useObjectStreams: false });
  // Both failure modes raise a typed refusal naming this artifact. An
  // uninspectable file is never treated as a clean one.
  report.activeContentScan = assertInspectableAndClean(bytes, title ?? "finalized flat overlay");
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
/**
 * Finalizes, then checks the artifact against what it was asked to write, and
 * finalizes again without any value that did not survive.
 *
 * The fitter predicts; only the page decides. A value can be measured as
 * fitting and still be drawn short or past an edge, because the appearance is
 * generated by the field's own font rather than the one the fit was measured
 * with. Independent review found two such writes shipping as clean `shrunk`
 * outcomes with empty overflow ledgers, so this pass exists to make the ledger
 * describe the artifact instead of the intention.
 *
 * A clipped value is not repaired, it is withdrawn: a name cut mid-word on a
 * court filing is worse than a blank a human can fill in. The second pass is
 * the last -- a field refused here is refused, and there is no third round in
 * which a value could creep back.
 */
export async function finalizeOfficialForm(options) {
  const first = await finalizeOfficialFormOnce(options);
  const clipped = (first.report.writtenValueVerification ?? []).filter((v) => v.outcome === "clipped" || v.outcome === "absent");
  if (clipped.length === 0) return first;

  const withheld = new Set(clipped.map((c) => c.field));
  const second = await finalizeOfficialFormOnce({
    ...options,
    census: options.census.filter((f) => !withheld.has(f.name))
  });
  for (const c of clipped) {
    second.report.refused.push({
      field: c.field,
      reason: c.outcome === "clipped" ? "value_clipped_in_rendered_appearance" : "value_absent_from_rendered_appearance",
      category: "clipped",
      detail: c.reason,
      expectedChars: c.expectedChars ?? null,
      drawnChars: c.drawnChars ?? null,
      overflowLeftPt: c.overflowLeftPt ?? null,
      overflowRightPt: c.overflowRightPt ?? null,
      widget: c.widget ?? null
    });
  }
  second.report.clippedWritesWithdrawn = clipped;
  // If a value is still clipped after being withheld, something is drawing text
  // that was never written, and that must not pass as a clean render.
  const stillClipped = (second.report.writtenValueVerification ?? []).filter((v) => v.outcome === "clipped");
  if (stillClipped.length > 0) {
    throw new Error(`refusing to emit: ${stillClipped.length} value(s) still clipped after withdrawal: `
      + stillClipped.map((v) => v.field).join(", "));
  }
  return second;
}

async function finalizeOfficialFormOnce({
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
      report.written.push({ field: field.name, factId: decision.factId, kind: "dropdown", expectedValue: String(match) });
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
      fontSize: fit.fontSize, outcome: fit.outcome, lines: fit.lines.length,
      // Carried on the record itself. Pairing a write with its value by index
      // into a second list works only while every write appends to both, and a
      // dropdown that pushes an option label but no text breaks the alignment
      // silently -- shifting every later field's read-back onto the wrong value.
      expectedValue: text,
      requiredWidth: fit.requiredWidthAtMin ?? null,
      availableWidth: rect ? Number(rect.width.toFixed(2)) : null
    });
    report.expectedValues.push(text);
  }

  // The names actually written, so the sanitizer can report a value that landed
  // in a widget the form does not print rather than letting it vanish quietly.
  const { clean, report: sanitation } = await sanitizeAndFlatten(pdfDoc, {
    defaultFont: helvetica,
    writtenFieldNames: new Set(report.written.map((w) => w.field))
  });
  report.sanitation = { ...sanitation, defaultAppearancesRepairedBeforeFill: defaultAppearancesRepaired };
  // A written value inside a non-printing widget is a real collision: the form
  // says the field does not appear on a printed copy, so the value is not in
  // the artifact. It is surfaced as a refusal so the lane sees it.
  for (const conflict of sanitation.writtenValuesInNonPrintingWidgets ?? []) {
    report.refused.push({
      field: conflict.field,
      reason: "written_value_in_non_printing_widget",
      category: "print_flags",
      flags: conflict.flags,
      detail: conflict.reason
    });
  }

  clean.setProducer("LegalEase RCAP official-form factory (pdf-lib)");
  clean.setCreator("LegalEase RCAP");
  if (title) clean.setTitle(title);
  clean.setCreationDate(DETERMINISTIC_STAMP);
  clean.setModificationDate(DETERMINISTIC_STAMP);

  // Serialized without object streams so the residue scan can actually see
  // into the file it is judging.
  const bytes = await clean.save({ useObjectStreams: false });

  // The single gate. There is one way to pass -- an inspectable file with no
  // residue -- and each failure raises a typed refusal naming this artifact.
  report.activeContentScan = assertInspectableAndClean(bytes, title ?? "finalized official form");

  // Read back what actually reached the page, per written field, against the
  // widget the value was meant to land in.
  {
    const rendered = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const runsByPage = rendered.getPages().map((p) => extractTextItems(p));
    const widgetOf = new Map(census.map((f) => [f.name, f.widgets?.[0] ?? null]));
    // Which channel applies is a property of the artifact, so it is decided
    // once over every page. Deciding per page gets it wrong on exactly the
    // pages that matter: a page whose every value was withdrawn has no
    // appearance runs left, and a per-page decision then falls back to geometry
    // and reads the form's own dot leader as the withdrawn value.
    const runSource = runsByPage.flat().some((r) => r.container?.bbox) ? "appearance" : "auto";
    // Runs themselves stay per page. Two widgets on different pages can share a
    // rectangle -- a caption block repeated on every page is the ordinary case
    // -- and pooling lets page 3's value satisfy page 1's field.
    report.writtenValueVerification = report.written.map((w) => {
      const widget = widgetOf.get(w.field);
      const runs = runsByPage[(widget?.page ?? 1) - 1] ?? [];
      const v = verifyWrittenValue({ value: w.expectedValue ?? null, rect: widget?.rect ?? null, runs, runSource });
      return {
        field: w.field, factId: w.factId ?? null, page: widget?.page ?? null,
        selectedFontSize: w.fontSize ?? null,
        availableWidth: w.availableWidth ?? null,
        suppliedChars: String(w.expectedValue ?? "").length,
        fittingOutcome: w.outcome ?? null,
        ...v
      };
    });
  }
  report.outputSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  report.outputBytes = bytes.length;
  return { bytes, report };
}
