// Active-content sanitation for official-form output.
//
// This reuses lane E's proven sanitizer rather than reimplementing it: the
// document-level strip, the link-annotation strip and the annotation scan are
// imported from the hard-form renderer, so the two lanes cannot drift into two
// different ideas of what "clean" means.
//
// What is added here is the part E's XFA path did not need:
//
//   * field-level JavaScript. A widget's /AA additional-actions dictionary
//     carries per-field scripts (/K keystroke, /F format, /V validate, /C
//     calculate). E flattens first, which drops widgets wholesale; this lane
//     must also handle documents inspected before flattening.
//   * a raw-byte residue scan. Deleting a catalog reference leaves the
//     JavaScript stream object in the file, so the model can look clean while
//     the bytes still carry the script. E solves this by rebuilding the
//     document; this module proves the rebuild worked.
//
// Refusal is the point. If residue survives, the artifact is not emitted.
import { createRequire } from "node:module";
import {
  neutralizeXfa,
  stripDocumentActions,
  stripLinkAnnotations,
  scanAnnotationActions
} from "../rcap-hard-form-xfa-shadow-fill.mjs";

const require = createRequire(import.meta.url);
const { PDFName, PDFDict, PDFArray, PDFDocument, PDFString, PDFRawStream, decodePDFRawStream } = require("pdf-lib");

export { neutralizeXfa, stripDocumentActions, stripLinkAnnotations, scanAnnotationActions };

// A rich-text field carries its formatted value as an XHTML packet in /RV, with
// the plain text in /V, and sets bit 26 of /Ff.
const RICH_TEXT_FLAG = 1 << 25;

/** Best-effort plain text out of an /RV XHTML packet. */
function readRichTextPacket(pdfDoc, rv) {
  let raw = null;
  try {
    if (typeof rv?.asString === "function") raw = rv.asString();
    else {
      const resolved = pdfDoc.context.lookup(rv);
      if (resolved instanceof PDFRawStream) raw = Buffer.from(decodePDFRawStream(resolved).decode()).toString("utf8");
      else if (typeof resolved?.asString === "function") raw = resolved.asString();
    }
  } catch { return null; }
  if (!raw) return null;
  const text = String(raw)
    .replace(/^\(|\)$/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0 ? text : null;
}

/**
 * Converts rich-text fields to ordinary text fields before appearances are
 * generated.
 *
 * pdf-lib refuses to read a rich-text field at all -- updateFieldAppearances
 * throws "Reading rich text fields is not supported" -- so one such field
 * aborts an entire family before a page is written. Missouri's CR-145 declares
 * two, and produced no artifact of any kind because of it.
 *
 * The value is not discarded. /V already holds the plain text that /RV formats,
 * so dropping the packet and the flag keeps what the participant sees while
 * removing the machinery pdf-lib cannot read; where /V is empty but the packet
 * is not, the text is recovered from the packet rather than lost. What goes is
 * styling, which is not part of what a court form records.
 *
 * Dropping /RV is a sanitation gain in its own right: it is an embedded XHTML
 * document riding inside a filed artifact for no filing purpose. The stale
 * appearance generated from it goes too, so flattening cannot draw what the
 * field used to look like.
 */
export function neutralizeRichTextFields(pdfDoc) {
  const converted = [];
  let acro;
  try { acro = pdfDoc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict); } catch { return converted; }
  if (!acro) return converted;

  // The document-wide entry has to go too, or a reader may still treat the form
  // as rich-text with every field converted.
  if (acro.get(PDFName.of("RV")) !== undefined) acro.delete(PDFName.of("RV"));

  const seen = new Set();
  const visit = (dict, path) => {
    if (!dict || seen.has(dict)) return;
    seen.add(dict);

    const rv = dict.get(PDFName.of("RV"));
    const ffRaw = dict.get(PDFName.of("Ff"));
    const ff = typeof ffRaw?.asNumber === "function" ? ffRaw.asNumber() : 0;

    if (rv !== undefined || (ff & RICH_TEXT_FLAG)) {
      // A field name may be a literal string or a UTF-16BE hex string with a
      // byte-order mark. Reporting the raw bytes would make the record
      // unreadable to the reviewer it exists for, so it is decoded.
      const nameRaw = dict.get(PDFName.of("T"));
      const name = (typeof nameRaw?.decodeText === "function"
        ? nameRaw.decodeText()
        : String(nameRaw?.asString?.() ?? nameRaw ?? path)).replace(/^\(|\)$/g, "");
      let recoveredFrom = null;

      const value = dict.get(PDFName.of("V"));
      const valueText = typeof value?.asString === "function" ? value.asString() : null;
      if (!valueText || valueText.replace(/^\(|\)$/g, "").trim() === "") {
        const packet = readRichTextPacket(pdfDoc, rv);
        if (packet) { dict.set(PDFName.of("V"), PDFString.of(packet)); recoveredFrom = "RV"; }
      }

      if (rv !== undefined) dict.delete(PDFName.of("RV"));
      if (ff & RICH_TEXT_FLAG) dict.set(PDFName.of("Ff"), pdfDoc.context.obj(ff & ~RICH_TEXT_FLAG));
      if (dict.get(PDFName.of("AP")) !== undefined) dict.delete(PDFName.of("AP"));
      converted.push({ field: name, hadRichTextPacket: rv !== undefined, valueRecoveredFrom: recoveredFrom });
    }

    const kids = dict.lookupMaybe(PDFName.of("Kids"), PDFArray);
    if (kids) {
      for (let i = 0; i < kids.size(); i += 1) {
        let kid = null;
        try { kid = kids.lookup(i, PDFDict); } catch { kid = null; }
        visit(kid, `${path}/Kids[${i}]`);
      }
    }
  };

  const fields = acro.lookupMaybe(PDFName.of("Fields"), PDFArray);
  if (fields) {
    for (let i = 0; i < fields.size(); i += 1) {
      let f = null;
      try { f = fields.lookup(i, PDFDict); } catch { f = null; }
      visit(f, `AcroForm/Fields[${i}]`);
    }
  }
  return converted;
}

/**
 * Supplies a neutral /DA default-appearance entry to any field missing one.
 *
 * Some official forms ship text fields with no /DA (Kentucky's AOC-496 among
 * them). pdf-lib refuses to guess: both setFontSize and updateFieldAppearances
 * throw on such a field, which would abort an entire artifact over a cosmetic
 * omission in the source. This supplies a default for those fields only, and
 * it governs how a value is drawn -- never what the value is.
 *
 * It must run before any field is written, because setting a font size edits
 * the /DA string and therefore requires one to already exist.
 */
export function ensureDefaultAppearances(form) {
  const repaired = [];
  for (const field of form.getFields()) {
    // The getter returns undefined for a missing entry rather than throwing,
    // while setFontSize throws on the same field. Presence has to be tested on
    // the returned value, not on whether the call succeeded.
    let existing;
    try { existing = field.acroField.getDefaultAppearance(); } catch { existing = undefined; }
    if (typeof existing === "string" && existing.trim() !== "") continue;
    try {
      field.acroField.setDefaultAppearance("/Helv 0 Tf 0 g");
      repaired.push(field.getName());
    } catch { /* a field that cannot carry one is left as-is */ }
  }
  return repaired;
}

// PDF annotation flag bits (/F). Three of them decide whether an annotation
// belongs in a filed paper document.
export const ANNOTATION_FLAG = {
  INVISIBLE: 1,
  HIDDEN: 2,
  PRINT: 4,
  NO_VIEW: 32
};

/**
 * Reads one annotation's /F flags and decides whether it is part of the
 * document's printed appearance.
 *
 * The test is the one a viewer applies when it prints: an annotation prints
 * only if the Print bit is set, and never if Hidden or NoView is set. An absent
 * /F entry means zero, which means it does not print -- that is the spec's
 * default, and it is exactly how official forms mark their Reset and Clear
 * Form buttons.
 *
 * This matters because flattening draws widget appearance streams into page
 * content. Without this test, flattening promotes every helper widget and
 * control caption into permanent ink on a court filing, which inverts what
 * flattening is supposed to preserve. Measured across the 252 source PDFs in
 * the D packs: 99.4% of text widgets set Print and no document leaves all of
 * them unset, while only 6.3% of buttons set it.
 */
export function readAnnotationFlags(dict) {
  const raw = dict?.get(PDFName.of("F"));
  const flags = typeof raw?.asNumber === "function" ? raw.asNumber() : 0;
  const hidden = Boolean(flags & ANNOTATION_FLAG.HIDDEN);
  const noView = Boolean(flags & ANNOTATION_FLAG.NO_VIEW);
  const prints = Boolean(flags & ANNOTATION_FLAG.PRINT);
  let reason = null;
  if (hidden) reason = "hidden_flag_set";
  else if (noView) reason = "no_view_flag_set";
  else if (!prints) reason = raw === undefined ? "no_flags_entry_so_does_not_print" : "print_flag_not_set";
  return {
    flags,
    flagsEntryPresent: raw !== undefined,
    hidden,
    noView,
    prints,
    partOfFiledAppearance: prints && !hidden && !noView,
    reason
  };
}

function rectOf(dict) {
  const rect = dict?.lookupMaybe?.(PDFName.of("Rect"), PDFArray);
  if (!rect) return null;
  const out = [];
  for (let i = 0; i < rect.size(); i += 1) {
    const n = rect.lookup(i);
    out.push(typeof n?.asNumber === "function" ? Number(n.asNumber().toFixed(2)) : null);
  }
  return out;
}

/** Drops one widget dictionary from every page's /Annots array. */
function removeWidgetFromPages(pdfDoc, widgetDict) {
  let removed = 0;
  for (const page of pdfDoc.getPages()) {
    const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annots) continue;
    for (let i = annots.size() - 1; i >= 0; i -= 1) {
      let resolved = null;
      try { resolved = pdfDoc.context.lookup(annots.get(i)); } catch { resolved = null; }
      if (resolved === widgetDict) { annots.remove(i); removed += 1; }
    }
  }
  return removed;
}

/**
 * Removes every widget that is not part of the printed appearance, before the
 * form is flattened.
 *
 * pdf-lib's flatten() draws each widget's appearance stream unconditionally, so
 * the only way to keep a non-printing widget out of the artifact is to make the
 * form stop reporting it. A field whose widgets are all non-printing is removed
 * outright; a field with a mix loses only the offending widgets, so the copies
 * that do print survive.
 *
 * `writtenFieldNames` decides nothing: honoring the source's own flags is the
 * point, and a value written into a field the form marks non-printing would not
 * appear on a printed copy either. It exists to report the collision loudly,
 * because participant data vanishing silently is worse than a caption leaking.
 */
export function suppressNonPrintingWidgets(pdfDoc, { writtenFieldNames = new Set() } = {}) {
  const written = writtenFieldNames instanceof Set ? writtenFieldNames : new Set(writtenFieldNames ?? []);
  const suppressed = [];
  const conflicts = [];
  const fieldsToRemove = [];

  let form;
  try { form = pdfDoc.getForm(); } catch { return { suppressed, conflicts, fieldsRemoved: 0, widgetsRemoved: 0 }; }

  for (const field of form.getFields()) {
    let name = "(unnamed)";
    try { name = field.getName(); } catch { /* an unnamed field is still judged on its flags */ }

    let widgets = [];
    try { widgets = field.acroField.getWidgets(); } catch { continue; }
    if (widgets.length === 0) continue;

    const keep = [];
    const drop = [];
    for (const widget of widgets) {
      const flags = readAnnotationFlags(widget.dict);
      (flags.partOfFiledAppearance ? keep : drop).push({ widget, flags });
    }
    if (drop.length === 0) continue;

    for (const d of drop) {
      const entry = {
        field: name,
        fieldType: field.constructor?.name?.replace(/^PDF/, "") ?? null,
        reason: d.flags.reason,
        flags: d.flags.flags,
        rect: rectOf(d.widget.dict)
      };
      suppressed.push(entry);
      if (written.has(name)) conflicts.push(entry);
    }

    // A field with no /Kids is its own widget, so there is nothing to prune
    // from: the field itself has to go.
    const kids = field.acroField.dict.lookupMaybe(PDFName.of("Kids"), PDFArray);
    if (keep.length === 0 || !kids) { fieldsToRemove.push(field); continue; }
    for (const d of drop) {
      for (let i = kids.size() - 1; i >= 0; i -= 1) {
        let resolved = null;
        try { resolved = pdfDoc.context.lookup(kids.get(i)); } catch { resolved = null; }
        if (resolved === d.widget.dict) kids.remove(i);
      }
      removeWidgetFromPages(pdfDoc, d.widget.dict);
    }
  }

  let fieldsRemoved = 0;
  for (const field of fieldsToRemove) {
    try { form.removeField(field); fieldsRemoved += 1; } catch { /* reported as suppressed either way */ }
  }
  return { suppressed, conflicts, fieldsRemoved, widgetsRemoved: suppressed.length };
}

/**
 * Removes non-widget annotations that are not part of the printed appearance.
 *
 * Flattening disposes of widgets, but a document rebuilt from its pages carries
 * every other annotation across. A hidden or non-printing note is no more part
 * of a filing than a hidden helper widget is.
 */
export function stripNonPrintingAnnotations(pdfDoc) {
  const removed = [];
  for (const [pageIndex, page] of pdfDoc.getPages().entries()) {
    const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annots) continue;
    for (let i = annots.size() - 1; i >= 0; i -= 1) {
      let annot = null;
      try { annot = pdfDoc.context.lookup(annots.get(i), PDFDict); } catch { annot = null; }
      if (!annot) continue;
      const flags = readAnnotationFlags(annot);
      if (flags.partOfFiledAppearance) continue;
      const subtype = String(annot.get(PDFName.of("Subtype")) ?? "").replace(/^\//, "");
      annots.remove(i);
      removed.push({ page: pageIndex, subtype, reason: flags.reason, flags: flags.flags });
    }
  }
  return removed;
}

/**
 * Removes per-field scripting from every widget: the additional-actions
 * dictionary and any action attached directly to the annotation.
 */
export function stripFieldActions(pdfDoc) {
  const removed = [];
  const acro = pdfDoc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  const seen = new Set();

  const scrub = (dict, where) => {
    if (!dict || seen.has(dict)) return;
    seen.add(dict);
    for (const key of ["AA", "A"]) {
      if (dict.get(PDFName.of(key)) !== undefined) {
        dict.delete(PDFName.of(key));
        removed.push({ where, key });
      }
    }
    // A calculation order list only exists to drive field JavaScript.
    const kids = dict.lookupMaybe(PDFName.of("Kids"), PDFArray);
    if (kids) {
      for (let i = 0; i < kids.size(); i += 1) {
        scrub(kids.lookup(i, PDFDict), `${where}/Kids[${i}]`);
      }
    }
  };

  if (acro) {
    if (acro.get(PDFName.of("CO")) !== undefined) {
      acro.delete(PDFName.of("CO"));
      removed.push({ where: "AcroForm", key: "CO" });
    }
    const fields = acro.lookupMaybe(PDFName.of("Fields"), PDFArray);
    if (fields) {
      for (let i = 0; i < fields.size(); i += 1) scrub(fields.lookup(i, PDFDict), `AcroForm/Fields[${i}]`);
    }
  }

  for (const [pageIndex, page] of pdfDoc.getPages().entries()) {
    const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annots) continue;
    for (let i = 0; i < annots.size(); i += 1) scrub(annots.lookup(i, PDFDict), `page[${pageIndex}]/Annots[${i}]`);
  }
  return removed;
}

// Byte-level markers for content that must not survive into a filed packet.
// These are matched against the serialized file, so they catch a stream object
// that is still present even though nothing references it any more.
const RESIDUE_MARKERS = [
  ["document_javascript", /\/JavaScript\b/],
  ["field_javascript", /\/JS\b/],
  ["additional_actions", /\/AA\b/],
  ["open_action", /\/OpenAction\b/],
  ["launch_action", /\/Launch\b/],
  ["submit_action", /\/SubmitForm\b/],
  ["import_action", /\/ImportData\b/],
  ["uri_action", /\/URI\b/],
  ["remote_goto", /\/GoToR\b/],
  ["embedded_goto", /\/GoToE\b/],
  ["rich_media", /\/RichMedia\b/],
  ["xfa_residue", /\/XFA\b/]
];

/**
 * Blanks the payload of every stream object before scanning.
 *
 * Compressed stream data is arbitrary bytes, and arbitrary bytes contain the
 * sequence "/JS" often enough to matter: a Kentucky form's Flate-compressed
 * image stream produced exactly that, and a naive byte scan condemned a
 * perfectly clean artifact. Active content always lives in a dictionary, never
 * inside a compressed payload, so the payloads are removed before matching.
 * Only the object structure is judged.
 */
function redactStreamPayloads(text) {
  return text.replace(/\bstream\r?\n?[\s\S]*?endstream/g, "stream endstream");
}

/**
 * Scans serialized bytes for active-content residue.
 *
 * Object streams compress their contents, so a scan of a compressed file can
 * miss a marker that is really there. Callers therefore serialize with
 * `useObjectStreams: false` before scanning -- the same choice lane E makes --
 * and this function refuses to give a clean verdict on a file whose object
 * streams it cannot see into.
 */
export function scanBytesForActiveContent(bytes) {
  const text = redactStreamPayloads(Buffer.from(bytes).toString("latin1"));
  const hits = [];
  for (const [kind, marker] of RESIDUE_MARKERS) {
    if (marker.test(text)) hits.push(kind);
  }
  const compressed = /\/Type\s*\/ObjStm/.test(text);
  const inspectable = !compressed;
  return {
    hits,
    inspectable,
    compressed,
    // Cleanliness is a positive claim, and it can only be made about a file the
    // scanner could actually read. An empty `hits` array on an uninspectable
    // file says nothing, so the verdict is carried explicitly rather than left
    // for a caller to infer from an absence.
    clean: inspectable && hits.length === 0,
    verdict: !inspectable ? "uninspectable" : (hits.length === 0 ? "clean" : "residue_found")
  };
}

/**
 * Raised when an artifact cannot be proven free of active content.
 *
 * `inspectable: false` is not a pass. A file whose object streams the scanner
 * cannot see into may carry any of the markers it is looking for, so the only
 * honest outcome is a refusal that names the artifact and says what a human
 * has to do about it.
 */
export class UninspectableArtifactError extends Error {
  constructor(artifact, scan) {
    super(`cannot prove ${artifact} is free of active content: its object streams hide the bytes the scan judges`);
    this.name = "UninspectableArtifactError";
    this.reason = "artifact_not_byte_inspectable";
    this.artifact = artifact;
    this.scan = scan;
    this.remediation = "re-serialize with { useObjectStreams: false } and re-scan, or inspect this artifact by an alternate means before it is treated as review-ready";
  }
}

/** Raised when the scan positively finds residue. */
export class ActiveContentResidueError extends Error {
  constructor(artifact, scan) {
    super(`refusing to emit ${artifact}: active-content residue remains: ${scan.hits.join(", ")}`);
    this.name = "ActiveContentResidueError";
    this.reason = "active_content_residue";
    this.artifact = artifact;
    this.hits = scan.hits;
    this.scan = scan;
    this.remediation = "sanitize and rebuild the document from its flattened pages, then re-scan";
  }
}

/**
 * The single gate every emitted artifact passes through.
 *
 * There is exactly one way to obtain a clean verdict -- an inspectable file
 * with no residue -- and both failure modes raise a typed error naming the
 * artifact. Callers cannot accidentally read an empty `hits` array as a pass,
 * because they no longer see the scan until it has been judged.
 */
export function assertInspectableAndClean(bytes, artifact) {
  const scan = scanBytesForActiveContent(bytes);
  if (!scan.inspectable) throw new UninspectableArtifactError(artifact, scan);
  if (scan.hits.length > 0) throw new ActiveContentResidueError(artifact, scan);
  return scan;
}

// Annotation subtypes that are active content in themselves: they embed or
// play media, or attach a file, regardless of whether they carry an /A action.
const ACTIVE_ANNOT_SUBTYPES = new Set(["RichMedia", "Movie", "Screen", "Sound", "FileAttachment", "3D"]);

/**
 * Removes annotations whose subtype is active content.
 *
 * Lane E's strip keys off the action attached to an annotation, which is the
 * right test for a Link. A RichMedia or Movie annotation needs no action to be
 * live, so subtype has to be tested as well or it survives a clean scan.
 */
export function stripActiveAnnotationSubtypes(pdfDoc) {
  const removed = [];
  for (const [pageIndex, page] of pdfDoc.getPages().entries()) {
    const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annots) continue;
    for (let i = annots.size() - 1; i >= 0; i -= 1) {
      let annot = null;
      try { annot = pdfDoc.context.lookup(annots.get(i), PDFDict); } catch { annot = null; }
      if (!annot) continue;
      const subtype = String(annot.get(PDFName.of("Subtype")) ?? "").replace(/^\//, "");
      if (ACTIVE_ANNOT_SUBTYPES.has(subtype)) {
        annots.remove(i);
        removed.push({ page: pageIndex, subtype });
      }
    }
  }
  return removed;
}

/**
 * Drops entries from every page's /Annots array that no longer resolve to a
 * dictionary. Returns how many were removed.
 */
export function compactAnnots(pdfDoc) {
  let removed = 0;
  for (const page of pdfDoc.getPages()) {
    const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annots) continue;
    for (let i = annots.size() - 1; i >= 0; i -= 1) {
      let resolved = null;
      try { resolved = pdfDoc.context.lookup(annots.get(i)); } catch { resolved = null; }
      if (!(resolved instanceof PDFDict)) { annots.remove(i); removed += 1; }
    }
  }
  return removed;
}

/**
 * The full sanitation pass over an already-filled document.
 *
 * Order is load-bearing and mirrors lane E: XFA presence is observed before
 * the form is touched, document actions are stripped, the form is flattened so
 * no widget survives, link annotations go, and only then is the document
 * rebuilt from its flattened pages so orphaned script objects are left behind.
 */
export async function sanitizeAndFlatten(pdfDoc, { alreadyFlattened = false, defaultFont = null, writtenFieldNames = new Set() } = {}) {
  const report = {};

  const acroBefore = pdfDoc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  report.xfaPresentInInput = Boolean(acroBefore && acroBefore.get(PDFName.of("XFA")) !== undefined);
  report.xfaRemoved = neutralizeXfa(pdfDoc);
  // Before anything reads a field: pdf-lib throws on a rich-text field the
  // moment appearances are generated, which aborts the family rather than
  // degrading it.
  report.richTextFieldsNeutralized = neutralizeRichTextFields(pdfDoc);
  report.fieldActionsStripped = stripFieldActions(pdfDoc);
  report.documentActionsStripped = stripDocumentActions(pdfDoc);

  if (!alreadyFlattened) {
    const form = pdfDoc.getForm();
    // A flat printed form has no widgets to flatten. Calling flatten() on an
    // empty form is not merely pointless, it throws in some pdf-lib paths, so
    // the field count decides.
    const fieldCount = form.getFields().length;
    if (fieldCount > 0) {
      report.defaultAppearancesRepaired = ensureDefaultAppearances(form);
      // Appearances must exist before flattening: flatten draws each field's
      // appearance stream onto the page, so a field whose appearance was never
      // generated flattens to nothing and the value disappears.
      form.updateFieldAppearances(defaultFont ?? undefined);
      // Only now, with appearances current, are the non-printing widgets taken
      // out -- after the update so no printing field loses a freshly generated
      // appearance, and before the flatten so no helper caption becomes ink.
      const printFlags = suppressNonPrintingWidgets(pdfDoc, { writtenFieldNames });
      report.nonPrintingWidgetsSuppressed = printFlags.suppressed;
      report.nonPrintingFieldsRemoved = printFlags.fieldsRemoved;
      report.writtenValuesInNonPrintingWidgets = printFlags.conflicts;
      form.flatten();
      report.flattened = true;
    } else {
      report.flattened = false;
      report.flattenSkipped = "document carries no form fields";
    }
    report.fieldCountBeforeFlatten = fieldCount;
  }

  // Flattening removes widget annotations but can leave their references
  // behind in a page's /Annots array. Lane E's strip resolves each entry
  // strictly and throws on a dangling one, so the array is compacted here
  // rather than by loosening E's proven code.
  report.danglingAnnotationsRemoved = compactAnnots(pdfDoc);

  report.activeAnnotationSubtypesRemoved = stripActiveAnnotationSubtypes(pdfDoc);
  report.linkAnnotationsRemoved = stripLinkAnnotations(pdfDoc);
  // Whatever annotations survive flattening are judged by the same printed
  // appearance test the widgets were.
  report.nonPrintingAnnotationsRemoved = stripNonPrintingAnnotations(pdfDoc);

  const modelResidue = scanAnnotationActions(pdfDoc);
  if (modelResidue.length > 0) {
    throw new Error(`residual active content after flatten: ${JSON.stringify(modelResidue)}`);
  }

  // Rebuild: copying only the flattened pages into a fresh document carries
  // page content and resources across and leaves every orphaned JavaScript and
  // XFA object behind. This is the step that makes the byte scan honest.
  const clean = await PDFDocument.create();
  const copied = await clean.copyPages(pdfDoc, pdfDoc.getPageIndices());
  for (const page of copied) clean.addPage(page);
  const rebuiltResidue = scanAnnotationActions(clean);
  if (rebuiltResidue.length > 0) {
    throw new Error(`residual active content after rebuild: ${JSON.stringify(rebuiltResidue)}`);
  }
  report.rebuiltFromFlattenedPages = true;
  return { clean, report };
}
