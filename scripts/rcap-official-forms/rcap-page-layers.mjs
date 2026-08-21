// Separates a finalized artifact page into the ink the official form printed
// and the ink LegalEase put there.
//
// Every artifact this factory emits carries its page content as a four-element
// array: a `q`, the official source page's own stream, the matching `Q`, and
// one appended stream holding everything the overlay wrote. The wrapper exists
// because the writer pushes the graphics state before drawing, and the shape is
// a property of how the artifact is built rather than a guess about it.
//
// That shape is what makes a visual proof possible without the blank source
// binary. Element 1 IS the blank page -- not a reconstruction of it, not a
// re-acquisition, the same stream object -- so rendering the page with element
// 3 removed shows exactly what the court printed, and rendering it with element
// 1 removed shows exactly what we added. Neither view is inferred from a pixel
// difference, so neither can be wrong about which layer a mark came from.
//
// A page that does not have this shape is reported as unsplittable rather than
// forced. Guessing which stream is ours on a court filing is how a participant's
// name gets attributed to the clerk.
import zlib from "node:zlib";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFArray, PDFRef } = require("pdf-lib");

/** Decoded text of a content stream, or null when its filter is not one we read. */
export function decodeStream(context, ref) {
  const stream = context.lookup(ref);
  if (!stream?.contents) return null;
  const raw = Buffer.from(stream.contents);
  const filter = stream.dict?.get(PDFName.of("Filter"));
  const filterName = filter ? String(filter) : "";
  if (!filterName) return raw.toString("latin1");
  if (filterName.includes("FlateDecode")) {
    try { return zlib.inflateSync(raw).toString("latin1"); } catch { return null; }
  }
  return null;
}

/**
 * Which content-stream refs on `page` are the official form's and which are ours.
 *
 * Returns `{ splittable: false, reason }` when the page is not in the wrapped
 * shape the factory emits, which is the only honest answer for a page whose
 * layers cannot be told apart by structure.
 */
export function splitPageLayers(doc, page) {
  const contents = page.node.get(PDFName.of("Contents"));
  if (!(contents instanceof PDFArray)) {
    return { splittable: false, reason: "page content is a single stream, so the official layer and the written layer are not separable by structure" };
  }
  const refs = [];
  for (let i = 0; i < contents.size(); i += 1) {
    const entry = contents.get(i);
    if (!(entry instanceof PDFRef)) {
      return { splittable: false, reason: "page content array holds a non-reference entry" };
    }
    refs.push(entry);
  }
  const decoded = refs.map((ref) => decodeStream(doc.context, ref));
  if (decoded.some((text) => text === null)) {
    return { splittable: false, reason: "a content stream on this page uses a filter this reader does not decode" };
  }
  if (decoded.length < 2 || decoded[0].trim() !== "q") {
    return { splittable: false, reason: "page content array does not open with the graphics-state push the factory writes" };
  }
  const close = decoded.findIndex((text, index) => index > 0 && text.trim() === "Q");
  if (close < 0) {
    return { splittable: false, reason: "page content array has no matching graphics-state pop" };
  }
  return {
    splittable: true,
    // The `q`/`Q` wrapper travels with the official layer: it is what the
    // factory pushed around the source stream, and dropping it would change how
    // the source renders.
    sourceRefs: refs.slice(0, close + 1),
    generatedRefs: refs.slice(close + 1),
    sourceStreamText: decoded.slice(1, close).join("\n"),
    generatedStreamText: decoded.slice(close + 1).join("\n")
  };
}

/**
 * A copy of `bytes` in which every page keeps only the layer named by `keep`.
 *
 * The document is otherwise untouched -- same resources, same page boxes, same
 * object graph -- so the two renders differ in exactly one thing and a pixel
 * comparison between them means what it looks like it means.
 */
export async function isolateLayer(bytes, keep, renderDate) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const perPage = [];
  for (const page of doc.getPages()) {
    const split = splitPageLayers(doc, page);
    perPage.push(split);
    if (!split.splittable) continue;
    const kept = keep === "source" ? split.sourceRefs : split.generatedRefs;
    page.node.set(PDFName.of("Contents"), doc.context.obj(kept));
  }
  // pdf-lib stamps a fresh modification date on save; pinning it keeps the
  // isolated document, and therefore its raster, reproducible run to run.
  doc.setModificationDate(renderDate);
  doc.setCreationDate(renderDate);
  return { bytes: await doc.save({ useObjectStreams: false }), perPage };
}

/**
 * A one-page document holding just `pageIndex` of `bytes`.
 *
 * The viewer's `#page=N` anchor scrolls to a page; it does not isolate one. For
 * a multi-page form the captured frame carries the tail of the preceding page
 * above the one that was asked for, and page-edge detection then locks onto the
 * wrong page -- on AK:tf-800 page 3 that put page 2's checkboxes inside the
 * measured area. Handing the renderer a document with one page in it removes
 * the ambiguity at the source instead of trying to crop around it.
 */
export async function singlePagePdf(bytes, pageIndex, renderDate) {
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const single = await PDFDocument.create();
  const [copied] = await single.copyPages(source, [pageIndex]);
  single.addPage(copied);
  single.setModificationDate(renderDate);
  single.setCreationDate(renderDate);
  return single.save({ useObjectStreams: false });
}

/**
 * Whether the artifact still carries interactive form machinery.
 *
 * A finalized filing must be flat. A surviving widget renders its own default
 * appearance -- an empty chooser prompt, a comb, a highlight box -- which is a
 * mark on a court filing that nobody authored and that no field map describes.
 */
export async function interactiveResidue(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const catalog = doc.catalog;
  const acroForm = catalog.get(PDFName.of("AcroForm"));
  let acroFieldCount = 0;
  let needAppearances = null;
  if (acroForm) {
    const dict = doc.context.lookup(acroForm);
    const fields = dict?.get?.(PDFName.of("Fields"));
    const resolved = fields ? doc.context.lookup(fields) : null;
    acroFieldCount = resolved instanceof PDFArray ? resolved.size() : 0;
    const need = dict?.get?.(PDFName.of("NeedAppearances"));
    needAppearances = need === undefined ? null : String(need) === "true";
  }
  let widgetAnnotations = 0;
  for (const page of doc.getPages()) {
    const annots = page.node.get(PDFName.of("Annots"));
    const resolved = annots ? doc.context.lookup(annots) : null;
    if (!(resolved instanceof PDFArray)) continue;
    for (let i = 0; i < resolved.size(); i += 1) {
      const annot = doc.context.lookup(resolved.get(i));
      const subtype = annot?.get?.(PDFName.of("Subtype"));
      if (subtype && String(subtype) === "/Widget") widgetAnnotations += 1;
    }
  }
  return {
    acroFormPresent: Boolean(acroForm),
    acroFieldCount,
    widgetAnnotations,
    needAppearances,
    flat: acroFieldCount === 0 && widgetAnnotations === 0
  };
}
