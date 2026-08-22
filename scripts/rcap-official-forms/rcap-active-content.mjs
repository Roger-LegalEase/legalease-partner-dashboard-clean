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
const { PDFName, PDFDict, PDFArray, PDFDocument, PDFNumber, PDFRawStream, PDFRef, decodePDFRawStream } = require("pdf-lib");

export { neutralizeXfa, stripDocumentActions, stripLinkAnnotations, scanAnnotationActions };

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
  return { hits, inspectable: !compressed, compressed };
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

// --- what a widget may contribute to a filed page ----------------------------
//
// Flattening stamps every field's appearance stream onto the page as ordinary
// ink. pdf-lib generates those appearances from the field's own dictionary, so
// three things the court's form carries for INTERACTIVE use were being printed
// into filings:
//
//   * `/MK /BG` — a widget background colour. On these forms it is white, and
//     the generated appearance paints it as a filled rectangle before drawing
//     any value. Flattened, that is an opaque white box over whatever the
//     official page printed underneath: rules, captions, dotted leaders. Thirty
//     four of them across four KY and NE families.
//   * Pushbuttons — Print, Reset, Clear. Controls for a person at a screen.
//     Their captions have no meaning on a filed document.
//   * Unselected choosers — a dropdown still carrying the form's own prompt or
//     its default string, and in one case its entire county option list. A
//     filing that says "Choose the court" tells the court to choose one.
//
// The rule is about what a widget CONTRIBUTES, not about which form it is on:
// a control the participant never completed contributes nothing, and no widget
// contributes a background. Nothing here names a family, a field or a form.

/** Pushbutton: /FT /Btn with the pushbutton flag (bit 17) set. */
function isPushButton(acroField) {
  const dict = acroField.dict;
  if (String(dict.lookup(PDFName.of("FT"))?.toString?.() ?? "") !== "/Btn") return false;
  const flags = dict.lookup(PDFName.of("Ff"));
  return flags instanceof PDFNumber && (flags.asNumber() & (1 << 16)) !== 0;
}

/** Choice control: /FT /Ch — a dropdown or list box. */
function isChoiceField(acroField) {
  return String(acroField.dict.lookup(PDFName.of("FT"))?.toString?.() ?? "") === "/Ch";
}

/** Drops a field's widgets so flatten has nothing to draw for it. */
function dropWidgets(pdfDoc, acroField) {
  let dropped = 0;
  for (const widget of acroField.getWidgets()) {
    for (const page of pdfDoc.getPages()) {
      const annots = page.node.lookup(PDFName.of("Annots"));
      if (!(annots instanceof PDFArray)) continue;
      for (let i = annots.size() - 1; i >= 0; i -= 1) {
        const entry = annots.get(i);
        if (entry === widget.dict || pdfDoc.context.lookup(entry) === widget.dict) { annots.remove(i); dropped += 1; }
      }
    }
    widget.dict.delete(PDFName.of("AP"));
  }
  return dropped;
}

/** The last fill colour a token sets, as a grey level, or null. */
function fillGreyOf(colourTokens) {
  if (colourTokens.g !== undefined) return parseFloat(colourTokens.g);
  return (parseFloat(colourTokens.r) + parseFloat(colourTokens.gr) + parseFloat(colourTokens.b)) / 3;
}

/**
 * Removes the opaque background paint from one appearance stream.
 *
 * These streams come from the court's own form, not from us: the widget's `/AP
 * /N` opens by setting a near-white fill and filling a rectangle the size of
 * the widget, and only then draws the rule the participant writes on. On screen
 * that background is invisible against a white page. Flattened onto a filing it
 * is an opaque box over whatever the official page printed underneath.
 *
 * Only the leading background paint is removed — the colour it sets, its
 * rectangle and the fill operator. Everything after it, the rules and any text,
 * is left exactly as the court drew it. A rectangle that does not cover the
 * widget is not a background and is not touched.
 */
function stripOpaqueBackgroundPaint(streamText, bbox) {
  const pattern = /(?:^|\n)\s*(?:(?<g>[\d.]+)\s+g|(?<r>[\d.]+)\s+(?<gr>[\d.]+)\s+(?<b>[\d.]+)\s+rg)\s*\n\s*(?<x>-?[\d.]+)\s+(?<y>-?[\d.]+)\s+(?<w>-?[\d.]+)\s+(?<h>-?[\d.]+)\s+re\s*\n\s*(?:f|F|f\*)\s*(?=\n|$)/g;
  let removed = 0;
  const out = streamText.replace(pattern, (match, ...args) => {
    const groups = args[args.length - 1];
    const grey = fillGreyOf(groups);
    if (!(grey >= 0.9)) return match;
    const w = Math.abs(parseFloat(groups.w));
    const h = Math.abs(parseFloat(groups.h));
    // A background covers the widget. A smaller rectangle is form art.
    if (!(w >= bbox.width * 0.9 && h >= bbox.height * 0.9)) return match;
    removed += 1;
    return "\n";
  });
  return { text: out, removed };
}

/** The /BBox of an appearance stream, as width and height. */
function bboxOf(stream) {
  const box = stream.dict.lookup(PDFName.of("BBox"));
  if (!(box instanceof PDFArray) || box.size() < 4) return null;
  const n = (i) => box.lookup(i).asNumber();
  return { width: Math.abs(n(2) - n(0)), height: Math.abs(n(3) - n(1)) };
}

/**
 * Strips the widget background so nothing opaque is flattened behind the value.
 *
 * Two sources: `/MK /BG`, which pdf-lib turns into a filled rectangle when it
 * generates an appearance, and the background already painted inside an
 * appearance stream the form shipped. Both have to go — clearing only the first
 * leaves thirty-four white boxes standing.
 */
function stripWidgetBackground(pdfDoc, acroField) {
  let stripped = 0;
  for (const widget of acroField.getWidgets()) {
    const mk = widget.dict.lookup(PDFName.of("MK"));
    if (mk instanceof PDFDict && mk.get(PDFName.of("BG")) !== undefined) {
      mk.delete(PDFName.of("BG"));
      stripped += 1;
    }
    const ap = widget.dict.lookup(PDFName.of("AP"));
    if (!(ap instanceof PDFDict)) continue;
    for (const [stateKey, ref] of ap.entries()) {
      const target = pdfDoc.context.lookup(ref);
      const streams = target instanceof PDFDict
        ? [...target.entries()].map(([, r]) => [r, pdfDoc.context.lookup(r)])
        : [[ap.get(stateKey), target]];
      for (const [ref2, stream] of streams) {
        if (!(stream instanceof PDFRawStream) || !(ref2 instanceof PDFRef)) continue;
        const bbox = bboxOf(stream);
        if (!bbox || bbox.width === 0 || bbox.height === 0) continue;
        let text;
        try { text = new TextDecoder().decode(decodePDFRawStream(stream).decode()); } catch { continue; }
        const { text: cleaned, removed } = stripOpaqueBackgroundPaint(text, bbox);
        if (removed === 0) continue;
        const dict = stream.dict.clone(pdfDoc.context);
        dict.delete(PDFName.of("Filter"));
        dict.delete(PDFName.of("DecodeParms"));
        const bytes = new TextEncoder().encode(cleaned);
        dict.set(PDFName.of("Length"), pdfDoc.context.obj(bytes.length));
        pdfDoc.context.assign(ref2, PDFRawStream.of(dict, bytes));
        stripped += removed;
      }
    }
  }
  return stripped;
}

/**
 * Decides, per field, what survives into the flattened page.
 *
 * `writtenFields` are the fields this run actually bound a participant value
 * to. Only the caller knows that, and it is the difference between a chooser
 * the participant answered and one still showing the form's prompt.
 */
export function restrictWidgetContributions(pdfDoc, form, writtenFields = new Set(), supersededFields = new Set()) {
  const report = { commandControlsDropped: [], unselectedChoicesDropped: [], supersededWidgetsDropped: [], backgroundsNeutralized: 0 };
  for (const field of form.getFields()) {
    const name = field.getName();
    const acroField = field.acroField;
    if (isPushButton(acroField)) {
      dropWidgets(pdfDoc, acroField);
      report.commandControlsDropped.push(name);
      continue;
    }
    if (supersededFields.has(name) && !writtenFields.has(name)) {
      // Another widget won this slot. Whatever this one would draw is the
      // form's own placeholder for a box the participant is not filling here.
      acroField.dict.delete(PDFName.of("V"));
      dropWidgets(pdfDoc, acroField);
      report.supersededWidgetsDropped.push(name);
      continue;
    }
    if (isChoiceField(acroField) && !writtenFields.has(name)) {
      // No participant selection: whatever it would draw is the form's own
      // prompt, default or option list.
      acroField.dict.delete(PDFName.of("V"));
      dropWidgets(pdfDoc, acroField);
      report.unselectedChoicesDropped.push(name);
      continue;
    }
    report.backgroundsNeutralized += stripWidgetBackground(pdfDoc, acroField);
  }
  return report;
}

export async function sanitizeAndFlatten(pdfDoc, { alreadyFlattened = false, defaultFont = null, writtenFields = new Set(), supersededFields = new Set() } = {}) {
  const report = {};

  const acroBefore = pdfDoc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  report.xfaPresentInInput = Boolean(acroBefore && acroBefore.get(PDFName.of("XFA")) !== undefined);
  report.xfaRemoved = neutralizeXfa(pdfDoc);
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
      // Before appearances are generated, not after: pdf-lib builds the
      // background rectangle into the stream it generates, so removing the
      // background afterwards would mean editing generated streams instead of
      // never asking for the rectangle at all.
      report.widgetContributions = restrictWidgetContributions(pdfDoc, form, writtenFields, supersededFields);
      // Appearances must exist before flattening: flatten draws each field's
      // appearance stream onto the page, so a field whose appearance was never
      // generated flattens to nothing and the value disappears.
      form.updateFieldAppearances(defaultFont ?? undefined);
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
