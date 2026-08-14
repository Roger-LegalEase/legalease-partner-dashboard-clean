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
const { PDFName, PDFDict, PDFArray, PDFDocument } = require("pdf-lib");

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
export async function sanitizeAndFlatten(pdfDoc, { alreadyFlattened = false, defaultFont = null } = {}) {
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
