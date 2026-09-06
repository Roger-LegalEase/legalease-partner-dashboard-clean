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

import { APPEARANCE_DISPOSITION, structuralDisposition } from "./rcap-appearance-semantics.mjs";

const require = createRequire(import.meta.url);
const { PDFName, PDFDict, PDFArray, PDFDocument, PDFNumber, PDFRawStream, PDFRef, PDFCheckBox, PDFRadioGroup,
  PDFTextField, PDFOperator, decodePDFRawStream } = require("pdf-lib");

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

function removeFromArray(pdfDoc, array, ref, dict) {
  if (!(array instanceof PDFArray)) return 0;
  let removed = 0;
  for (let i = array.size() - 1; i >= 0; i -= 1) {
    const entry = array.get(i);
    if (entry === ref || pdfDoc.context.lookup(entry) === dict) { array.remove(i); removed += 1; }
  }
  return removed;
}

/*
 * A TERMINAL field is not always a member of the AcroForm's own /Fields array.
 *
 * ISO 32000-1 8.6.1 lets a field tree nest: /Fields holds the ROOTS, and a
 * terminal field can sit any number of /Kids levels below one. The CA Judicial
 * Council forms are built that way -- CR-409's AcroForm /Fields holds a single
 * entry, `CR-409[0]`, and its four footer pushbuttons hang five levels beneath
 * it. A scan of /Fields alone therefore finds nothing to remove, returns 0, and
 * leaves the field exactly where getFields(), updateFieldAppearances() and
 * flatten() all walk it from.
 *
 * That is not hypothetical: it is why the delivered CR-409 carried the Warning
 * pushbutton's 18-word /MK /CA caption stamped across the bottom of page 2,
 * eight words off the left edge of the paper and three more inside the Print
 * button's own rectangle.
 *
 * Walking the tree is OPT-IN, and stays opt-in for the same reason
 * evaluateDeclaredMinimumSize and alignWidgetFontSizeToFit in the finalizer do:
 * the families sharing this module are rebuilt by different workers at
 * different times, and a lane holding one family does not get to decide what
 * the others' next rebuild produces. With the option off this function behaves
 * exactly as it always has, byte for byte.
 */
function detachFromParentChain(pdfDoc, acroField) {
  let childRef = acroField.ref;
  let childDict = acroField.dict;
  let removed = 0;
  for (let depth = 0; depth < 32; depth += 1) {
    const parentRef = childDict.get(PDFName.of("Parent"));
    if (!parentRef) return removed;
    const parent = pdfDoc.context.lookup(parentRef);
    if (!(parent instanceof PDFDict)) return removed;
    removed += removeFromArray(pdfDoc, parent.lookupMaybe(PDFName.of("Kids"), PDFArray), childRef, childDict);
    // A parent that has lost every kid is an empty interior node. Leaving it
    // behind would leave getFields() nothing to return for it, but it is still
    // dead structure, so it is pruned upward on the same walk.
    const kids = parent.lookupMaybe(PDFName.of("Kids"), PDFArray);
    if (kids && kids.size() > 0) return removed;
    childRef = parentRef;
    childDict = parent;
  }
  return removed;
}

/**
 * Detaches a field from the AcroForm so nothing downstream can revive it.
 *
 * Clearing the widget's /AP and removing its /Annots entry is not enough on its
 * own. updateFieldAppearances() runs after this and regenerates an appearance
 * for every field the form still lists — for a pushbutton, straight from its
 * /MK /CA caption — and flatten() finds the page through the widget's own /P
 * rather than through /Annots, so the caption this function was called to remove
 * gets stamped anyway. A field the form no longer lists is not regenerated and
 * not flattened.
 */
function detachFromAcroForm(pdfDoc, acroField, { walkFieldTree = false } = {}) {
  const acroForm = pdfDoc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  const fields = acroForm?.lookupMaybe(PDFName.of("Fields"), PDFArray);
  if (!fields) return 0;
  let removed = removeFromArray(pdfDoc, fields, acroField.ref, acroField.dict);
  if (removed === 0 && walkFieldTree) {
    removed += detachFromParentChain(pdfDoc, acroField);
    // The prune may have emptied a root, which is a member of /Fields.
    for (let i = fields.size() - 1; i >= 0; i -= 1) {
      const root = pdfDoc.context.lookup(fields.get(i));
      if (!(root instanceof PDFDict)) continue;
      const kids = root.lookupMaybe(PDFName.of("Kids"), PDFArray);
      if (kids && kids.size() === 0) { fields.remove(i); removed += 1; }
    }
  }
  return removed;
}

/** Drops a field's widgets so flatten has nothing to draw for it. */
function dropWidgets(pdfDoc, acroField, detachOptions = {}) {
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
  detachFromAcroForm(pdfDoc, acroField, detachOptions);
  return dropped;
}

/**
 * Widget annotation flags the PDF spec defines as "do not display this".
 *
 * /F bit 2 (Hidden) and bit 6 (NoView) are the source document's own statement
 * that a viewer must not show the annotation. Table 165 of ISO 32000-1: Hidden
 * means "do not display the annotation or print it", NoView means "do not
 * display on screen".
 */
const ANNOT_FLAG_HIDDEN = 1 << 1;
const ANNOT_FLAG_NOVIEW = 1 << 5;

/** True when the source marks this widget as one no viewer displays. */
function isNonDisplayedWidget(widget) {
  const flags = widget.dict.lookup(PDFName.of("F"));
  if (!(flags instanceof PDFNumber)) return false;
  const value = flags.asNumber();
  return (value & ANNOT_FLAG_HIDDEN) !== 0 || (value & ANNOT_FLAG_NOVIEW) !== 0;
}

/**
 * Drops the widgets the source itself marks as never displayed.
 *
 * pdf-lib's flatten() stamps EVERY widget's appearance onto the page. It does
 * not read /F, so an annotation the source hides is drawn as ordinary ink on
 * the filing. On a form that shows one of several alternate captions at a time
 * -- Nebraska's DC 1:15 is the proven case, with five mutually exclusive caption
 * blocks stacked on the same coordinates -- every alternate lands on top of the
 * one that belongs there and the page becomes unreadable. That defect was
 * measured as 47 same-baseline text-on-text overlaps on one page, against 0 in
 * the corpus source, so it is introduced by flattening and is not inherited.
 *
 * This is not a judgement about what a field MEANS, which is why it runs before
 * dispositions and independently of them. It reads one thing: whether the
 * document that shipped the widget says a viewer may display it. A widget the
 * source hides contributes nothing to what a person sees on screen, so it
 * contributes nothing to the flattened page either.
 *
 * Removal is from the field's /Kids and the page's /Annots, not merely from
 * /AP: updateFieldAppearances() runs after this and regenerates an appearance
 * for every widget the field still lists, so clearing /AP alone would be undone
 * a few lines later. Where the field IS the widget (the merged single-widget
 * case, so there is no /Kids to prune), the whole field is detached instead.
 */
function dropNonDisplayedWidgets(pdfDoc, acroField) {
  const widgets = acroField.getWidgets();
  const hidden = widgets.filter(isNonDisplayedWidget);
  if (hidden.length === 0) return 0;

  const kids = acroField.Kids();
  if (!kids) {
    // Field and widget are one object: there is no kid to prune.
    dropWidgets(pdfDoc, acroField);
    return hidden.length;
  }

  const hiddenDicts = new Set(hidden.map((widget) => widget.dict));
  for (let i = kids.size() - 1; i >= 0; i -= 1) {
    const entry = kids.get(i);
    const dict = entry instanceof PDFRef ? pdfDoc.context.lookup(entry) : entry;
    if (!hiddenDicts.has(dict)) continue;
    kids.remove(i);
    for (const page of pdfDoc.getPages()) {
      const annots = page.node.lookup(PDFName.of("Annots"));
      if (!(annots instanceof PDFArray)) continue;
      for (let j = annots.size() - 1; j >= 0; j -= 1) {
        const candidate = annots.get(j);
        if (candidate === entry || pdfDoc.context.lookup(candidate) === dict) annots.remove(j);
      }
    }
    dict.delete(PDFName.of("AP"));
  }
  // Every widget was hidden, so the field draws nothing at all.
  if (kids.size() === 0) detachFromAcroForm(pdfDoc, acroField);
  return hidden.length;
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
 * SUPPLIES THE APPEARANCE THE SOURCE OMITTED, SO NOTHING IS SYNTHESIZED IN ITS
 * PLACE.
 *
 * pdf-lib regenerates an appearance for any check box or radio widget whose
 * CURRENT /AS state has no entry in /AP /N — `PDFCheckBox.needsAppearancesUpdate`
 * returns true on exactly that condition — and its default provider paints a
 * stroked square the size of the widget's own rectangle. flatten() then stamps
 * that square onto the page as ordinary ink.
 *
 * Under ISO 32000-1 12.5.5 a viewer draws the stream named by /AS and nothing
 * else, so a widget whose /AS state is absent from /AP /N is drawn as NOTHING.
 * The square is therefore not the court's form and not a mark anybody made; it
 * is produced by the normalization and it is on the page only because the
 * normalization ran.
 *
 * Vermont's petition 200-00130 and stipulation 200-00132 are the measured case:
 * 12 and 2 button widgets, every one of them /AS /Off with /Yes as the only
 * state in /AP /N and no /BC in /MK. The official forms print one small box at
 * each of those rectangles; the delivered packet printed a second, larger 14.4pt
 * square around it, and a zero-write baseline over the pinned binaries proved
 * the squares came from the shared step rather than from the family's writes.
 *
 * The remedy is to supply the missing state rather than to suppress a drawing:
 * an EMPTY form XObject sized to the widget's own /Rect is installed for that
 * state, which is what the source's own silence means. pdf-lib then reports no
 * update is needed, generates nothing, and flattens a stream that paints
 * nothing — the same page a conforming viewer shows.
 *
 * WHAT IS NEVER TOUCHED, and each for its own reason:
 *
 *   * a widget whose /AS state ALREADY has a stream. Vermont's fee-waiver form
 *     600-00228 ships an /Off appearance that draws its own box, and that box is
 *     the court's. Reproducing it is source fidelity, and RI-OFF-APPEARANCE
 *     settles that it stays.
 *   * a widget belonging to a field this run WROTE. A checked box must render
 *     its mark, and the mark lives in the /Yes stream this never goes near.
 *   * text fields, choosers, pushbuttons and every other field type.
 *   * a widget with no /AS at all, and one whose /AP /N is a bare stream rather
 *     than a state dictionary. Neither is the measured condition, and inventing
 *     a state dictionary for them would be a structural rewrite rather than the
 *     supply of a missing entry. They are counted and left exactly as they are.
 *
 * Nothing here reads a family, a form number, a field name or a caption: the
 * condition is a structural fact about the widget, and it is the same fact in
 * every jurisdiction.
 */
export function suppressSynthesizedSelectionAppearances(pdfDoc, form, writtenFields = new Set()) {
  const report = { installed: [], skippedWritten: 0, skippedStateAlreadyDrawn: 0, skippedNoAppearanceState: 0,
    skippedNonDictionaryAppearance: 0 };
  for (const field of form.getFields()) {
    if (!(field instanceof PDFCheckBox || field instanceof PDFRadioGroup)) continue;
    const name = field.getName();
    if (writtenFields.has(name)) { report.skippedWritten += 1; continue; }
    for (const widget of field.acroField.getWidgets()) {
      const state = widget.dict.lookup(PDFName.of("AS"));
      if (!(state instanceof PDFName)) { report.skippedNoAppearanceState += 1; continue; }
      let ap = widget.dict.lookup(PDFName.of("AP"));
      if (ap !== undefined && !(ap instanceof PDFDict)) { report.skippedNonDictionaryAppearance += 1; continue; }
      let normal = ap instanceof PDFDict ? pdfDoc.context.lookup(ap.get(PDFName.of("N"))) : undefined;
      if (normal !== undefined && !(normal instanceof PDFDict)) { report.skippedNonDictionaryAppearance += 1; continue; }
      if (normal instanceof PDFDict && normal.get(state) !== undefined) { report.skippedStateAlreadyDrawn += 1; continue; }

      // The widget's own rectangle, normalized: /Rect corners may arrive in any
      // order, and a BBox of negative extent would clip the stream to nothing on
      // some viewers even though this one paints nothing anyway.
      const rect = widget.getRectangle();
      const width = Math.abs(rect.width);
      const height = Math.abs(rect.height);
      const empty = pdfDoc.context.formXObject([], {
        BBox: pdfDoc.context.obj([0, 0, width, height]),
        Matrix: pdfDoc.context.obj([1, 0, 0, 1, 0, 0]),
        Resources: pdfDoc.context.obj({})
      });
      const emptyRef = pdfDoc.context.register(empty);

      if (!(ap instanceof PDFDict)) {
        ap = pdfDoc.context.obj({});
        widget.dict.set(PDFName.of("AP"), ap);
      }
      if (!(normal instanceof PDFDict)) {
        normal = pdfDoc.context.obj({});
        ap.set(PDFName.of("N"), normal);
      }
      normal.set(state, emptyRef);
      report.installed.push({ field: name, state: String(state.toString()),
        rect: { x: +rect.x.toFixed(3), y: +rect.y.toFixed(3), width: +width.toFixed(3), height: +height.toFixed(3) } });
    }
  }
  report.installedCount = report.installed.length;
  return report;
}

/**
 * The tolerance below which a 12.5.5 mapping counts as the identity.
 *
 * Not a fudge factor and not a per-family exception: it is a geometric
 * threshold, applied to every widget in every jurisdiction the same way. A
 * mapping that moves no corner of the appearance by more than this cannot
 * change a pixel at any raster resolution this factory uses -- 0.05pt is a
 * fifth of a pixel at 300 dpi -- and rewriting a stream to apply it would
 * change bytes without changing the page.
 *
 * The measured case for it is Vermont 600-00228 field 16, whose /Rect is
 * 14.400 by 14.401 against a 14.4 by 14.4 BBox. Its exact mapping is a scale of
 * 1.00007, which is a rounding artefact of the form's own rectangle rather than
 * a defect, and VF02's sweep requires that placement to stay byte-identical.
 * Field 15 on the same page is 3.6pt out and is seventy times this threshold.
 */
export const APPEARANCE_FIT_TOLERANCE_PT = 0.05;

/** The bounding box of `bbox` after `matrix`, per ISO 32000-1 8.10.2. */
function boundingBoxAfterMatrix(bbox, matrix) {
  const [x0, y0, x1, y1] = bbox;
  const [a, b, c, d, e, f] = matrix;
  const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
    .map(([x, y]) => [a * x + c * y + e, b * x + d * y + f]);
  const xs = corners.map((p) => p[0]);
  const ys = corners.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** m1 applied first, then m2, in PDF's row-vector convention. */
function composeMatrices(m1, m2) {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + b1 * c2, a1 * b2 + b1 * d2,
    c1 * a2 + d1 * c2, c1 * b2 + d1 * d2,
    e1 * a2 + f1 * c2 + e2, e1 * b2 + f1 * d2 + f2
  ];
}

/** The six numbers of an appearance stream's /Matrix, defaulting to the identity. */
function matrixOf(pdfDoc, streamDict) {
  const raw = streamDict.get(PDFName.of("Matrix"));
  if (raw === undefined) return [1, 0, 0, 1, 0, 0];
  const arr = pdfDoc.context.lookup(raw);
  if (!(arr instanceof PDFArray) || arr.size() !== 6) return null;
  return arr.asArray().map((n) => n.asNumber());
}

/** The four numbers of an appearance stream's /BBox, or null when it has none. */
function appearanceBBoxOf(pdfDoc, streamDict) {
  const raw = streamDict.get(PDFName.of("BBox"));
  if (raw === undefined) return null;
  const arr = pdfDoc.context.lookup(raw);
  if (!(arr instanceof PDFArray) || arr.size() !== 4) return null;
  const [x0, y0, x1, y1] = arr.asArray().map((n) => n.asNumber());
  return [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)];
}

/**
 * The appearance stream pdf-lib's flatten() will actually place for a widget.
 *
 * It mirrors PDFForm.findWidgetAppearanceRef exactly, and it reads rather than
 * ensures: PDFAnnotation.getNormalAppearance calls ensureAP, which INSTALLS an
 * empty /AP on a widget that has none, and a function that changes bytes merely
 * by looking is the defect this factory exists to catch. A widget flatten would
 * itself refuse is left alone here and counted.
 */
function normalAppearanceRefForFlatten(pdfDoc, field, widget) {
  const ap = widget.dict.lookup(PDFName.of("AP"));
  if (!(ap instanceof PDFDict)) return { ref: null, why: "no_appearance_dictionary" };
  const n = ap.get(PDFName.of("N"));
  if (n === undefined) return { ref: null, why: "no_normal_appearance" };
  const resolved = pdfDoc.context.lookup(n);
  if (resolved instanceof PDFDict) {
    // A state dictionary. flatten() selects by the FIELD's value, falling back
    // to /Off, and never by /AS -- so this does the same, or the repair would
    // rescale a stream that is not the one stamped.
    if (!(field instanceof PDFCheckBox || field instanceof PDFRadioGroup)) {
      return { ref: null, why: "state_dictionary_on_a_field_flatten_cannot_place" };
    }
    const value = field.acroField.getValue();
    const chosen = resolved.get(value) ?? resolved.get(PDFName.of("Off"));
    if (!(chosen instanceof PDFRef)) return { ref: null, why: "selected_state_is_not_an_indirect_stream" };
    return { ref: chosen, container: resolved, key: resolved.get(value) === chosen ? value : PDFName.of("Off") };
  }
  if (!(n instanceof PDFRef)) return { ref: null, why: "normal_appearance_is_not_an_indirect_stream" };
  return { ref: n, container: ap, key: PDFName.of("N") };
}

/**
 * APPLIES THE BBox-TO-Rect MAPPING ISO 32000-1 12.5.5 REQUIRES, WHICH pdf-lib's
 * flatten() DOES NOT.
 *
 * 12.5.5 says an appearance is placed by transforming its /BBox by its /Matrix,
 * taking the bounding box of the result, and computing the matrix A that maps
 * that box onto the annotation's /Rect. pdf-lib's PDFForm.flatten emits a
 * translation and nothing else -- `q 1 0 0 1 <x> <y> cm /FlatWidget-N Do Q`,
 * with rotateInPlace at rotation 0 contributing an identity -- so A is never
 * applied. Where a source widget ships an appearance whose transformed BBox is
 * not exactly its /Rect, the stream is stamped at the wrong size, at the wrong
 * place, or both, and every conforming viewer draws the source form differently
 * from the flattened packet.
 *
 * Vermont's fee-waiver form 600-00228 field 15 is the measured instance: BBox
 * [0 0 18 18] against a /Rect of 14.4 by 14.4, a required scale of 0.8 that is
 * never applied, so a 17pt stroked square is stamped where the court's form
 * draws a 13.6pt one -- about 3.4pt of stroke outside the widget's own box, and
 * 670 dark pixels at 300 dpi that the form carries nowhere.
 *
 * THE REMEDY IS TO PRE-COMPOSE, NOT TO REWRITE THE PAGE. flatten() will place
 * the stream at `translate(rect.x, rect.y)` whatever this function does, so the
 * mapping is folded into the stream's own /Matrix instead:
 *
 *     wanted   content -> Matrix -> A            (A maps into /Rect absolutely)
 *     given    content -> Matrix' -> T(rect.x, rect.y)
 *     so       Matrix' = Matrix x A x T(-rect.x, -rect.y)
 *                      = Matrix x B,  B = [sx 0 0 sy -bx0*sx -by0*sy]
 *
 * where [bx0 by0 bx1 by1] is the transformed BBox and sx, sy scale it to the
 * /Rect's own width and height. B drops out of /Rect's POSITION entirely --
 * pdf-lib has already translated there -- so only its size participates.
 *
 * WHAT IS LEFT BYTE-IDENTICAL, and this is the greater part of the corpus:
 * every placement whose mapping is the identity within
 * APPEARANCE_FIT_TOLERANCE_PT. Nothing about the widget is read except its
 * /Rect, its appearance /BBox and its appearance /Matrix. No family, form
 * number, field name, caption or jurisdiction appears anywhere in this
 * function, and there is no list of any kind in it.
 *
 * A stream placed by more than one widget that needs more than one mapping is
 * COPIED rather than mutated, because mutating it would repair one placement by
 * breaking the other.
 */
export function fitAppearanceStreamsToRect(pdfDoc, form, { tolerancePt = APPEARANCE_FIT_TOLERANCE_PT } = {}) {
  const report = { rescaled: [], rescaledCount: 0, widgetsExamined: 0, alreadyCorrect: 0,
    skippedNoPlaceableAppearance: {}, skippedDegenerateGeometry: 0, streamsCopiedForConflictingPlacements: 0,
    tolerancePt };

  // Every placement first, so a stream shared by two widgets that need
  // different mappings is discovered before any of them is edited.
  const wanted = [];
  for (const field of form.getFields()) {
    for (const widget of field.acroField.getWidgets()) {
      report.widgetsExamined += 1;
      const found = normalAppearanceRefForFlatten(pdfDoc, field, widget);
      if (!found.ref) {
        report.skippedNoPlaceableAppearance[found.why] = (report.skippedNoPlaceableAppearance[found.why] ?? 0) + 1;
        continue;
      }
      const stream = pdfDoc.context.lookup(found.ref);
      const dict = stream?.dict;
      if (!dict) { report.skippedNoPlaceableAppearance.appearance_is_not_a_stream =
        (report.skippedNoPlaceableAppearance.appearance_is_not_a_stream ?? 0) + 1; continue; }
      const bbox = appearanceBBoxOf(pdfDoc, dict);
      const matrix = matrixOf(pdfDoc, dict);
      if (!bbox || !matrix) { report.skippedNoPlaceableAppearance.unreadable_bbox_or_matrix =
        (report.skippedNoPlaceableAppearance.unreadable_bbox_or_matrix ?? 0) + 1; continue; }

      const rect = widget.getRectangle();
      const rectWidth = Math.abs(rect.width);
      const rectHeight = Math.abs(rect.height);
      const [bx0, by0, bx1, by1] = boundingBoxAfterMatrix(bbox, matrix);
      const boxWidth = bx1 - bx0;
      const boxHeight = by1 - by0;
      // 12.5.5 leaves a degenerate box undefined, and inventing a scale for one
      // would be a rewrite rather than the mapping. Counted, not touched.
      if (!(boxWidth > 0) || !(boxHeight > 0) || !(rectWidth > 0) || !(rectHeight > 0)) {
        report.skippedDegenerateGeometry += 1;
        continue;
      }
      const sx = rectWidth / boxWidth;
      const sy = rectHeight / boxHeight;
      // How far the flattened corners actually move. This, not the scale
      // factor, is what a reader would see, and it is what the tolerance is in.
      const displacement = Math.max(Math.abs(bx0), Math.abs(bx1 - rectWidth),
        Math.abs(by0), Math.abs(by1 - rectHeight));
      if (displacement <= tolerancePt) { report.alreadyCorrect += 1; continue; }

      wanted.push({
        field: field.getName(), ref: found.ref, container: found.container, key: found.key, stream,
        matrix, bbox, rect: { width: rectWidth, height: rectHeight },
        fitted: composeMatrices(matrix, [sx, 0, 0, sy, -bx0 * sx, -by0 * sy]),
        scale: { x: sx, y: sy }, displacementPt: displacement
      });
    }
  }

  // A stream carrying two different wanted matrices is copied for all but the
  // first; one carrying the same matrix twice is edited once.
  const byRef = new Map();
  for (const w of wanted) {
    const list = byRef.get(w.ref.toString()) ?? [];
    list.push(w);
    byRef.set(w.ref.toString(), list);
  }
  const same = (a, b) => a.every((n, i) => Math.abs(n - b[i]) < 1e-9);

  for (const [, group] of byRef) {
    let editedInPlace = false;
    for (const w of group) {
      if (!editedInPlace || same(w.fitted, group[0].fitted)) {
        if (!editedInPlace) {
          w.stream.dict.set(PDFName.of("Matrix"), pdfDoc.context.obj(w.fitted));
          editedInPlace = true;
        }
      } else {
        if (!(w.stream instanceof PDFRawStream)) {
          throw new Error(
            `fitAppearancesToRect: appearance ${w.ref.toString()} is placed by widgets needing different `
            + `mappings and its stream cannot be copied (${w.stream.constructor.name}); field ${w.field}`
          );
        }
        const copy = PDFRawStream.of(w.stream.dict.clone(pdfDoc.context), w.stream.contents.slice());
        copy.dict.set(PDFName.of("Matrix"), pdfDoc.context.obj(w.fitted));
        const copyRef = pdfDoc.context.register(copy);
        w.container.set(w.key, copyRef);
        report.streamsCopiedForConflictingPlacements += 1;
      }
      report.rescaled.push({
        field: w.field,
        appearanceBBox: w.bbox,
        sourceMatrix: w.matrix,
        widgetRect: { width: +w.rect.width.toFixed(4), height: +w.rect.height.toFixed(4) },
        requiredScale: { x: +w.scale.x.toFixed(6), y: +w.scale.y.toFixed(6) },
        fittedMatrix: w.fitted.map((n) => +n.toFixed(6)),
        displacementPt: +w.displacementPt.toFixed(4)
      });
    }
  }
  report.rescaledCount = report.rescaled.length;
  return report;
}

/**
 * A BORDER pdf-lib DRAWS BECAUSE THE WIDGET WAS INTERACTIVE, NOT BECAUSE THE
 * COURT PRINTED ONE.
 *
 * `/MK /BC` is a widget's border colour and `/MK /BG` its background colour.
 * Under ISO 32000-1 12.5.6.19 both belong to the appearance CHARACTERISTICS a
 * viewer uses when it has to construct an appearance for itself; a widget that
 * ships its own `/AP /N` is drawn from that stream and its `/MK` is never
 * consulted. pdf-lib's default providers read `/MK` unconditionally whenever
 * they regenerate, so wherever this pipeline leaves a field without a usable
 * appearance -- by clearing one, or because the source shipped none --
 * updateFieldAppearances paints a stroked rectangle the size of the widget and
 * flatten() stamps it on the filing as ordinary ink.
 *
 * Colorado's JDF 641 is the measured case, and VF02 measured it: three choice
 * widgets on page 4 (9B.0, 9B.2 and 9C.0) that the packet deliberately leaves
 * unanswered, each carrying `/MK /BC [0 0 0]`, delivered as 8,344 dark pixels
 * of black rectangle at 300 dpi that the Colorado Judicial Department's own
 * form does not print -- over the top of the single rule the form does print
 * there, which the widget's own 29-byte `/AP /N` draws.
 *
 * The two functions below are the two halves of one remedy, and both act only
 * on a field this run did NOT write. A written value must keep whatever the
 * pipeline draws for it, and neither function is ever reached for one.
 */

/** Every text-showing operand in an appearance stream, unparsed. */
function textShowingOperands(streamText) {
  const found = [];
  const re = /(\((?:\\[\s\S]|[^\\()])*\)|<[0-9A-Fa-f\s]*>|\[[^\]]*\])\s*(?:Tj|TJ|'|")/g;
  let match;
  while ((match = re.exec(streamText)) !== null) found.push(match[1]);
  return found;
}

/** True when an operand shows at least one character a reader would see. */
function operandShowsInk(operand) {
  if (operand.startsWith("(")) return /\S/.test(operand.slice(1, -1).replace(/\\[\s\S]/g, " "));
  if (operand.startsWith("<")) {
    const hex = operand.slice(1, -1).replace(/\s+/g, "");
    for (let i = 0; i < hex.length; i += 2) {
      const code = parseInt(hex.slice(i, i + 2).padEnd(2, "0"), 16);
      const whitespace = code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d || code === 0x00;
      if (Number.isNaN(code) || !whitespace) return true;
    }
    return false;
  }
  // A /TJ array: strings interleaved with kerning numbers. Every string in it
  // is judged the same way, and a number never shows ink.
  const strings = operand.match(/\((?:\\[\s\S]|[^\\()])*\)|<[0-9A-Fa-f\s]*>/g) ?? [];
  return strings.some(operandShowsInk);
}

/**
 * The widgets of a field whose OWN appearance draws no word.
 *
 * "Silent" is a structural property of the stream the source shipped, read from
 * the bytes: it contains no text-showing operator carrying a character a reader
 * would see. Such a stream is rules, leaders and line art -- the court's own
 * drawing of the blank -- and keeping it adds nothing the participant did not
 * supply. A stream that DOES show text is exactly the chooser prompt, default
 * or option list the unwritten-input drop exists to remove, so it is not
 * silent, is not kept, and the drop proceeds unchanged.
 *
 * Anything this cannot read for certain is reported as not silent: a state
 * dictionary, an appearance that is not an indirect stream, an undecodable
 * stream, and a stream carrying a text operator whose operand this did not
 * parse. Refusing to keep is always the safe answer, because it is the answer
 * the pipeline already gives.
 */
function widgetsWhoseSourceAppearanceIsSilent(pdfDoc, acroField) {
  const silent = [];
  for (const widget of acroField.getWidgets()) {
    const ap = widget.dict.lookup(PDFName.of("AP"));
    if (!(ap instanceof PDFDict)) continue;
    const normal = pdfDoc.context.lookup(ap.get(PDFName.of("N")));
    if (!(normal instanceof PDFRawStream)) continue;
    let text;
    try { text = new TextDecoder().decode(decodePDFRawStream(normal).decode()); } catch { continue; }
    const operands = textShowingOperands(text);
    const carriesTextOperator = /(?:^|[\s\]>)])(?:Tj|TJ|'|")(?=[\s(<[/]|$)/.test(text);
    if (carriesTextOperator && operands.length === 0) continue;
    if (operands.some(operandShowsInk)) continue;
    silent.push(widget);
  }
  return silent;
}

/**
 * Removes the appearance CHARACTERISTICS pdf-lib would synthesise a border and
 * a background from, for a field this run did not write.
 *
 * This is the half of the remedy that covers a widget with no usable source
 * appearance at all: nothing can be preserved for it, so the entries that make
 * the synthesised rectangle visible go instead. What pdf-lib then generates for
 * an unwritten field is an appearance that paints nothing, which is what a
 * conforming viewer draws from a widget carrying no value.
 *
 * `/BG` travels with `/BC` because it is the same synthesised rectangle: the
 * default providers fill with one and stroke with the other in a single call.
 * stripWidgetBackground already removes `/BG` on every path that keeps an
 * appearance, so this adds the border and extends both to the drop path.
 */
function neutralizeSynthesizedBorderCharacteristics(acroField) {
  let removed = 0;
  for (const widget of acroField.getWidgets()) {
    const mk = widget.dict.lookup(PDFName.of("MK"));
    if (!(mk instanceof PDFDict)) continue;
    for (const key of ["BC", "BG"]) {
      if (mk.get(PDFName.of(key)) === undefined) continue;
      mk.delete(PDFName.of(key));
      removed += 1;
    }
  }
  return removed;
}

/**
 * A WIDGET WHOSE BORDER THE COURT DRAWS AS A WRITING RULE, DELIVERED AS A BOX.
 *
 * `/BS /S` is a widget's border STYLE (ISO 32000-1 12.5.4, Table 166). `/S`
 * (solid) and the three decorated styles bound the whole annotation rectangle;
 * `/U` means one thing and only one thing -- "a single line along the bottom of
 * the annotation rectangle" -- and `/N` means no border at all. The style says
 * WHERE the border colour in `/MK /BC` is painted, and pdf-lib's default text
 * provider never reads it: it strokes a full rectangle from `/MK /BC` whatever
 * `/BS /S` says, so a blank the court draws as a writing rule is regenerated as
 * a boxed field.
 *
 * Pennsylvania's Rule 490 blank expungement order is the measured case, and
 * VF02 measured it. Its order page 1 carries eight widgets with
 * `/MK /BC [0 0 0]`. Six declare no `/BS` at all -- default solid -- and each
 * ships an `/AP /N` that strokes a rectangle, so regenerating one coincides
 * with the form. The other two are the two the packet writes a value into,
 * DocketNumber and Defendant, and both declare `/BS << /S /U >>`; both ship an
 * `/AP /N` that draws ONE horizontal line and nothing else
 * (`0 G 0 0.5 m 171.2816 0.5 l s`). Delivered, each became a one-point black
 * stroked rectangle -- about 3,157 and 3,244 dark pixels per fixture at 300 dpi
 * -- around a caption blank the Pennsylvania Judiciary draws as a rule.
 *
 * THE RULE CANNOT SIMPLY BE LEFT TO THE PAGE, and this was measured before the
 * remedy was chosen rather than assumed. The pinned order was rendered twice at
 * 300 dpi, once whole and once with `/Annots` and `/AcroForm` removed: in the
 * window of each of those two widgets the page content carries 0 dark pixels,
 * against 2,680 and 2,856 whole. The court's writing rule at those two blanks
 * exists ONLY inside the widget's own appearance stream. So dropping `/MK /BC`
 * and letting pdf-lib regenerate would indeed remove the box -- and would take
 * the rule with it, trading a border the form does not print for the loss of a
 * rule the form does. At the adjacent control widget DefendantName, which
 * carries no `/BC`, the rule IS page content (4,686 pixels either way), which
 * is why that widget was never affected in the first place.
 *
 * So the remedy is to honour the declared style rather than to delete the
 * border: `/MK /BC` is removed before regeneration, so pdf-lib synthesises no
 * rectangle, and the underline `/BS /S /U` declares is drawn back into the
 * regenerated appearance from the widget's own `/BS /W` and `/MK /BC`. What
 * that reconstructs is the source's own stream: width defaults to 1, the stroke
 * is centred at `/W / 2`, and the two Pennsylvania widgets ship exactly
 * `0 G 0 0.5 m <bbox width> 0.5 l s`.
 *
 * TWO INDEPENDENT SIGNALS MUST AGREE before a widget is touched. The widget has
 * to DECLARE an underline in `/BS /S`, and its shipped `/AP /N` has to paint no
 * rectangle. Where the two disagree -- a widget declaring `/U` whose own
 * appearance draws a box -- the form contradicts itself, and honouring either
 * signal would change what the court's own form shows; those are refused and
 * counted, never repaired. Anything unreadable is refused on the same terms the
 * rest of this module refuses: refusing is the answer the pipeline already
 * gives.
 */

/**
 * The operators of a content stream, with strings, names, numbers and comments
 * skipped, so `re` inside `/Frame` or inside `(a re b)` is never read as the
 * rectangle operator.
 */
function contentStreamOperators(text) {
  const operators = [];
  let i = 0;
  const isDelimiter = (c) => c === undefined || " \t\r\n\f\0()<>[]{}/%".includes(c);
  while (i < text.length) {
    const c = text[i];
    if (" \t\r\n\f\0".includes(c)) { i += 1; continue; }
    if (c === "%") { while (i < text.length && text[i] !== "\n" && text[i] !== "\r") i += 1; continue; }
    if (c === "(") {
      let depth = 1; i += 1;
      while (i < text.length && depth > 0) {
        if (text[i] === "\\") { i += 2; continue; }
        if (text[i] === "(") depth += 1;
        else if (text[i] === ")") depth -= 1;
        i += 1;
      }
      continue;
    }
    if (c === "<") { // a hex string, or the start of a dictionary
      if (text[i + 1] === "<") { i += 2; continue; }
      while (i < text.length && text[i] !== ">") i += 1;
      i += 1; continue;
    }
    if (c === ">") { i += text[i + 1] === ">" ? 2 : 1; continue; }
    if (c === "/") { i += 1; while (!isDelimiter(text[i])) i += 1; continue; }
    if ("[]{}".includes(c)) { i += 1; continue; }
    let token = "";
    while (!isDelimiter(text[i])) { token += text[i]; i += 1; }
    if (token === "") { i += 1; continue; }
    // A number is an operand, never an operator.
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(token)) continue;
    operators.push(token);
  }
  return operators;
}

const PATH_PAINTING_OPERATORS = new Set(["S", "s", "f", "F", "f*", "B", "B*", "b", "b*"]);

/**
 * Does the appearance the SOURCE ships for this widget paint a box?
 *
 * Answered from the operators of the stream, not from a substring of it, and
 * the distinction that matters is how many SEGMENTS a painted subpath has. A
 * box is `re`, which constructs one in a single operator, or a painted subpath
 * of three or more segments -- which is how pdf-lib itself draws a border, as
 * `0 0 m 0 h l w h l w 0 l h S`. A rule is one segment: `0 0.5 m <w> 0.5 l s`,
 * which is what the two Pennsylvania widgets ship. `s` is not by itself a box;
 * it closes the subpath before stroking, and closing a two-point line draws it
 * back over itself.
 *
 * Returns `null` -- meaning "not answerable", which every caller must treat as
 * "paints a box" -- for a widget with no `/AP`, an `/AP /N` that is a state
 * dictionary rather than a stream, or a stream that cannot be decoded.
 */
const PATH_SEGMENT_OPERATORS = new Set(["l", "c", "v", "y"]);
const BOX_SUBPATH_SEGMENTS = 3;

export function sourceAppearancePaintsRectangle(pdfDoc, widget) {
  const ap = widget.dict.lookup(PDFName.of("AP"));
  if (!(ap instanceof PDFDict)) return null;
  const normal = pdfDoc.context.lookup(ap.get(PDFName.of("N")));
  if (!(normal instanceof PDFRawStream)) return null;
  let text;
  try { text = new TextDecoder().decode(decodePDFRawStream(normal).decode()); } catch { return null; }
  let segments = 0;
  let widest = 0;
  let sawRectangle = false;
  for (const operator of contentStreamOperators(text)) {
    if (operator === "re") { sawRectangle = true; continue; }
    if (operator === "m") { widest = Math.max(widest, segments); segments = 0; continue; }
    if (PATH_SEGMENT_OPERATORS.has(operator)) { segments += 1; continue; }
    if (PATH_PAINTING_OPERATORS.has(operator)) {
      widest = Math.max(widest, segments);
      // A path constructed with `re` and then painted is a box, whatever else
      // the subpath counting says.
      if (sawRectangle) return true;
      segments = 0;
      continue;
    }
    if (operator === "n") { sawRectangle = false; widest = Math.max(widest, segments); segments = 0; }
  }
  widest = Math.max(widest, segments);
  return widest >= BOX_SUBPATH_SEGMENTS;
}

/** The stroke-colour operators for a `/MK /BC` array, or null if it sets none. */
function strokeColorOperatorsFor(borderColor) {
  if (!(borderColor instanceof PDFArray)) return null;
  const components = borderColor.asArray().map((n) => (n instanceof PDFNumber ? n.asNumber() : NaN));
  if (components.some((n) => !Number.isFinite(n))) return null;
  // 12.5.6.19: an empty array means no colour, and so no border is painted.
  if (components.length === 1) return `${components[0]} G`;
  if (components.length === 3) return `${components.join(" ")} RG`;
  if (components.length === 4) return `${components.join(" ")} K`;
  return null;
}

/**
 * The underline a widget DECLARES, or null when it declares none.
 *
 * Reads only `/BS /S`, `/BS /W` and `/MK /BC`. A width of 0 paints no border at
 * all under 12.5.4, and a `/BC` that sets no colour paints none under 12.5.6.19;
 * both are declarations of nothing, and nothing is what they get.
 */
export function declaredUnderlineBorder(widget) {
  const bs = widget.dict.lookup(PDFName.of("BS"));
  if (!(bs instanceof PDFDict)) return null;
  const style = bs.get(PDFName.of("S"));
  if (!(style instanceof PDFName) || style.asString() !== "/U") return null;
  const declaredWidth = bs.lookup(PDFName.of("W"));
  const width = declaredWidth instanceof PDFNumber ? declaredWidth.asNumber() : 1;
  if (!Number.isFinite(width) || width <= 0) return null;
  const mk = widget.dict.lookup(PDFName.of("MK"));
  if (!(mk instanceof PDFDict)) return null;
  const stroke = strokeColorOperatorsFor(mk.lookup(PDFName.of("BC")));
  if (stroke === null) return null;
  return { width, stroke };
}

/**
 * Before appearances are generated: takes `/MK /BC` off every widget of a
 * WRITTEN text field that declares an underline and ships an appearance
 * agreeing there is no box, and returns what has to be drawn back afterwards.
 *
 * Only a written field, because an unwritten one is the other remedy's
 * business: `suppressSynthesizedWidgetBorders` keeps or clears an unwritten
 * widget and never reaches a written one, and this never reaches an unwritten
 * one. The two do not overlap and neither changes what the other does.
 */
export function takeDeclaredUnderlineBordersOffWidgets(pdfDoc, form, writtenFields = new Set()) {
  const pending = [];
  const report = { widgets: [], refusedContradictoryAppearance: [], refusedUnreadableAppearance: [] };
  for (const field of form.getFields()) {
    const name = field.getName();
    if (!writtenFields.has(name)) continue;
    // A text field only. A button's border is drawn by its own state stream and
    // a chooser's by a path this pipeline does not regenerate.
    if (!(field instanceof PDFTextField)) continue;
    for (const widget of field.acroField.getWidgets()) {
      const underline = declaredUnderlineBorder(widget);
      if (!underline) continue;
      const paintsRectangle = sourceAppearancePaintsRectangle(pdfDoc, widget);
      if (paintsRectangle === null) { report.refusedUnreadableAppearance.push(name); continue; }
      if (paintsRectangle === true) { report.refusedContradictoryAppearance.push(name); continue; }
      const mk = widget.dict.lookup(PDFName.of("MK"));
      mk.delete(PDFName.of("BC"));
      pending.push({ field: name, widget, underline });
      report.widgets.push({ field: name, borderWidthPt: underline.width, stroke: underline.stroke });
    }
  }
  return { pending, report };
}

/**
 * After appearances are generated and before they are placed: draws the
 * declared underline into each regenerated appearance.
 *
 * The line is drawn in the appearance's own /BBox space, which is the space the
 * source's own stream draws its rule in, and it is drawn LAST so it cannot be
 * clipped away by the text clip pdf-lib emits. Its own `q`/`Q` leaves the
 * graphics state exactly as it found it.
 */
export function drawDeclaredUnderlineBorders(pdfDoc, pending) {
  const drawn = [];
  for (const { field, widget, underline } of pending) {
    const ap = widget.dict.lookup(PDFName.of("AP"));
    if (!(ap instanceof PDFDict)) continue;
    const normal = pdfDoc.context.lookup(ap.get(PDFName.of("N")));
    if (!normal || typeof normal.push !== "function") continue;
    const bbox = normal.dict?.lookup?.(PDFName.of("BBox"));
    if (!(bbox instanceof PDFArray)) continue;
    const [x0, , x1] = bbox.asArray().map((n) => (n instanceof PDFNumber ? n.asNumber() : NaN));
    if (!Number.isFinite(x0) || !Number.isFinite(x1)) continue;
    const y = underline.width / 2;
    const operators = ["q", underline.stroke, `${underline.width} w`, "[] 0 d",
      `${x0} ${y} m`, `${x1} ${y} l`, "S", "Q"];
    normal.push(...operators.map((operator) => PDFOperator.of(operator)));
    drawn.push({ field, fromPt: [x0, y], toPt: [x1, y], widthPt: underline.width });
  }
  return drawn;
}

/**
 * Decides, per field, what survives into the flattened page.
 *
 * `writtenFields` are the fields this run actually bound a participant value
 * to. Only the caller knows that, and it is the difference between a chooser
 * the participant answered and one still showing the form's prompt.
 */
export function restrictWidgetContributions(pdfDoc, form, writtenFields = new Set(), dispositions = new Map(),
  detachOptions = {}, { suppressSynthesizedWidgetBorders = false } = {}) {
  const report = { commandControlsDropped: [], unselectedChoicesDropped: [], unwrittenParticipantInputsDropped: [],
    sourceAppearancesPreserved: [], backgroundsNeutralized: 0, nonDisplayedWidgetsDropped: 0,
    fieldsWithNonDisplayedWidgets: [], dispositionsApplied: {},
    silentSourceAppearancesKept: [], synthesizedBorderCharacteristicsRemoved: 0 };
  for (const field of form.getFields()) {
    const name = field.getName();
    const acroField = field.acroField;
    // Before anything is decided about MEANING: a widget the source itself
    // marks Hidden or NoView is never shown to a person, so it is never
    // flattened onto the page either. This reads the document's own display
    // flag, not the family, the form, the field name or the text.
    const nonDisplayed = dropNonDisplayedWidgets(pdfDoc, acroField);
    if (nonDisplayed > 0) {
      report.nonDisplayedWidgetsDropped += nonDisplayed;
      report.fieldsWithNonDisplayedWidgets.push(name);
      if (acroField.getWidgets().length === 0) { report.dispositionsApplied[name] = "not_displayed_by_source"; continue; }
    }
    // What this field's appearance MEANS. A classified field says so; anything
    // else falls back to the structural rule. Both arrive as one of three
    // dispositions, and everything below switches on that value alone - never on
    // the family, the form, the field name, the text drawn, or a flag bit.
    const disposition = dispositions.get(name)
      ?? structuralDisposition({ isPushButton: isPushButton(acroField), isChoice: isChoiceField(acroField) });
    report.dispositionsApplied[name] = disposition;

    if (disposition === APPEARANCE_DISPOSITION.SUPPRESS_CONTROL_APPEARANCE) {
      dropWidgets(pdfDoc, acroField, detachOptions);
      report.commandControlsDropped.push(name);
      continue;
    }
    // OPT-IN, and only for a field this run did not write: no border or
    // background may be synthesised at it from the characteristics a viewer
    // uses only when it has to construct an appearance itself. Runs before the
    // drop below and before any appearance is generated, because a rectangle
    // never asked for is cheaper to prevent than to edit out afterwards.
    const unwritten = !writtenFields.has(name);
    const keepSilent = suppressSynthesizedWidgetBorders && unwritten
      ? widgetsWhoseSourceAppearanceIsSilent(pdfDoc, acroField) : [];
    if (suppressSynthesizedWidgetBorders && unwritten) {
      report.synthesizedBorderCharacteristicsRemoved += neutralizeSynthesizedBorderCharacteristics(acroField);
    }
    if (disposition === APPEARANCE_DISPOSITION.RENDER_PARTICIPANT_VALUE_ONLY_WHEN_WRITTEN && !writtenFields.has(name)) {
      // The court's own silent drawing of this blank -- a rule, a leader, line
      // art and no word -- is kept rather than cleared, so nothing has to be
      // regenerated in its place. Only under the opt-in, and only when EVERY
      // widget of the field draws no word: a field showing a prompt on any
      // widget is dropped whole, as it always was.
      if (keepSilent.length > 0 && keepSilent.length === acroField.getWidgets().length) {
        report.silentSourceAppearancesKept.push(name);
        report.backgroundsNeutralized += stripWidgetBackground(pdfDoc, acroField);
        continue;
      }
      // Nothing was written here, so whatever the source draws inside the field
      // is the court's instruction to a person filling it in by hand, or its own
      // prompt, default or option list. It does not go on the filing.
      acroField.dict.delete(PDFName.of("V"));
      dropWidgets(pdfDoc, acroField);
      (isChoiceField(acroField) ? report.unselectedChoicesDropped : report.unwrittenParticipantInputsDropped).push(name);
      continue;
    }
    if (disposition === APPEARANCE_DISPOSITION.PRESERVE_SOURCE_APPEARANCE) report.sourceAppearancesPreserved.push(name);
    // A written participant input and preserved source text are treated alike
    // from here: the appearance stays, and only an opaque background painted
    // over the page is removed from it.
    report.backgroundsNeutralized += stripWidgetBackground(pdfDoc, acroField);
  }
  return report;
}

export async function sanitizeAndFlatten(pdfDoc, { alreadyFlattened = false, defaultFont = null, writtenFields = new Set(),
  appearanceDispositions = new Map(),
  /*
   * Whether a suppressed control is also removed from a NESTED field tree.
   *
   * Off by default and deliberately: a family whose controls sit directly in
   * the AcroForm's /Fields array is already fully detached by the flat scan, so
   * the option changes nothing for it, and a family that has never been rebuilt
   * against this option keeps the bytes it has. See detachFromAcroForm.
   */
  detachNestedControlFields = false,
  /*
   * Whether a check box or radio widget whose CURRENT /AS state has no stream in
   * /AP /N is given an EMPTY appearance for that state before appearances are
   * generated, so pdf-lib synthesizes no square there and flatten stamps none.
   *
   * Off by default and deliberately, on the same reasoning as
   * detachNestedControlFields above and the finalizer's own opt-in flags: the
   * families sharing this module are rebuilt by different workers at different
   * times, and a repair lane holding one family does not get to decide what the
   * others' next rebuild produces. Every caller that does not pass this keeps
   * the bytes it has, to the byte. See suppressSynthesizedSelectionAppearances
   * for what the option does and for the four cases it never touches.
   *
   * CAPTAIN DECISION: like those flags, this default should flip to true once
   * every family can be rebuilt together. A border the official form does not
   * print is ink the packet added, wherever it occurs.
   */
  suppressSynthesizedAppearances = false,
  /*
   * Whether each widget appearance about to be flattened is first given the
   * BBox-to-Rect mapping ISO 32000-1 12.5.5 requires and pdf-lib's flatten()
   * never applies.
   *
   * Off by default and deliberately, on exactly the reasoning the two options
   * above give: the families sharing this module are rebuilt by different
   * workers at different times, and a repair lane holding one family does not
   * get to decide what the others' next rebuild produces. A caller that does
   * not pass this keeps the bytes it has, to the byte -- and so does a
   * placement whose mapping is already the identity even when it is passed.
   * See fitAppearanceStreamsToRect for the transform and for what it refuses.
   *
   * CAPTAIN DECISION: like those flags, this default should flip to true once
   * every family can be rebuilt together. An appearance stamped at 125% of the
   * size the court's own form draws it is wrong ink wherever it occurs, and no
   * family can opt out of a specification.
   */
  fitAppearancesToRect = false,
  /*
   * Whether a widget belonging to a field this run did NOT write is stopped
   * from acquiring a border and background pdf-lib synthesises from its
   * `/MK /BC` and `/MK /BG` -- by keeping the silent appearance the source
   * already ships for it where there is one, and by removing those two entries
   * where there is not.
   *
   * Off by default and deliberately, on exactly the reasoning the three options
   * above give: the families sharing this module are rebuilt by different
   * workers at different times, and a repair lane holding one family does not
   * get to decide what the others' next rebuild produces. A caller that does
   * not pass this keeps the bytes it has, to the byte -- and so does a field
   * this run wrote, which neither half of the remedy is ever reached for.
   * See widgetsWhoseSourceAppearanceIsSilent and
   * neutralizeSynthesizedBorderCharacteristics for what each half refuses.
   *
   * CAPTAIN DECISION: like those flags, this default should flip to true once
   * every family can be rebuilt together. A black rectangle at a question the
   * packet leaves for the participant to answer is ink the court's form does
   * not print, wherever it occurs.
   */
  suppressSynthesizedWidgetBorders = false,
  /*
   * Whether a WRITTEN text field's regenerated appearance honours the border
   * STYLE its widget declares in `/BS /S`, instead of pdf-lib's unconditional
   * rectangle.
   *
   * Off by default and deliberately, on exactly the reasoning the four options
   * above give: the families sharing this module are rebuilt by different
   * workers at different times, and a repair lane holding one family does not
   * get to decide what the others' next rebuild produces. A caller that does
   * not pass this keeps the bytes it has, to the byte -- and so does a widget
   * that declares no `/BS /S /U`, an unwritten field, a field that is not a
   * text field, and a widget whose own shipped appearance contradicts its
   * declared style. See takeDeclaredUnderlineBordersOffWidgets and
   * drawDeclaredUnderlineBorders for what each half refuses.
   *
   * This does NOT overlap suppressSynthesizedWidgetBorders. That option acts
   * only on a field this run did not write; this one acts only on a field this
   * run did write. A caller may pass both, and each still does exactly what it
   * says on the fields it owns.
   *
   * CAPTAIN DECISION: like those flags, this default should flip to true once
   * every family can be rebuilt together. `/BS /S` is a clause of the
   * specification, not a judgement about ink, and a court's writing rule
   * delivered as a boxed field is wrong wherever it occurs.
   */
  honorWidgetBorderStyle = false } = {}) {
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
      report.widgetContributions = restrictWidgetContributions(pdfDoc, form, writtenFields, appearanceDispositions,
        { walkFieldTree: detachNestedControlFields }, { suppressSynthesizedWidgetBorders });
      // Before appearances are generated, for the same reason the two steps
      // around it run there: pdf-lib builds the border into the stream it
      // generates from `/MK /BC`, so the colour comes off first and the line
      // the style actually declares goes back on afterwards.
      let pendingUnderlines = [];
      if (honorWidgetBorderStyle) {
        const taken = takeDeclaredUnderlineBordersOffWidgets(pdfDoc, form, writtenFields);
        pendingUnderlines = taken.pending;
        report.declaredWidgetBorderStyles = taken.report;
      }
      // Before appearances are generated, for the same reason the background
      // strip runs before them: a state supplied here is a state pdf-lib does
      // not regenerate, whereas a stream replaced afterwards would be editing a
      // square that had already been invented.
      if (suppressSynthesizedAppearances) {
        report.synthesizedSelectionAppearancesSuppressed = suppressSynthesizedSelectionAppearances(pdfDoc, form, writtenFields);
      }
      // Appearances must exist before flattening: flatten draws each field's
      // appearance stream onto the page, so a field whose appearance was never
      // generated flattens to nothing and the value disappears.
      form.updateFieldAppearances(defaultFont ?? undefined);
      // AFTER the appearance exists and before it is measured or placed: the
      // underline is part of the appearance, so a mapping fitted below must be
      // computed with it already there.
      if (honorWidgetBorderStyle && pendingUnderlines.length > 0) {
        report.declaredWidgetBorderStyles.drawn = drawDeclaredUnderlineBorders(pdfDoc, pendingUnderlines);
      }
      // AFTER appearances are generated and immediately before they are placed:
      // the mapping has to be computed against the streams that will actually
      // be stamped, including any pdf-lib has just generated, and flatten()'s
      // own updateFieldAppearances pass regenerates nothing that is already
      // clean, so a matrix fitted here survives into the page.
      if (fitAppearancesToRect) {
        report.appearancesFittedToRect = fitAppearanceStreamsToRect(pdfDoc, form);
      }
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
