// Shared XFA and official-form sanitation primitives.
// Keep these imports independent of the XFA command-line entrypoint so web
// runtime tracing never follows CLI-only, user-supplied filesystem paths.
import { PDFName, PDFDict, PDFArray } from "pdf-lib";

const ACTIVE_CONTENT_KEYS = ["JavaScript", "JS", "Launch", "SubmitForm", "ImportData", "GoToR", "GoToE", "Rendition", "Movie", "Sound", "RichMedia"];

export function neutralizeXfa(pdfDoc) {
  const acro = pdfDoc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  let removed = false;
  if (acro && acro.get(PDFName.of("XFA")) !== undefined) {
    acro.delete(PDFName.of("XFA"));
    removed = true;
  }
  // NeedAppearances forces a viewer to regenerate field appearances; a flattened
  // document has no fields, so leaving it set is meaningless at best.
  if (acro) acro.delete(PDFName.of("NeedAppearances"));
  return removed;
}

export function stripDocumentActions(pdfDoc) {
  const cat = pdfDoc.catalog;
  const stripped = [];
  for (const key of ["OpenAction", "AA"]) {
    if (cat.get(PDFName.of(key)) !== undefined) {
      cat.delete(PDFName.of(key));
      stripped.push(key);
    }
  }
  const names = cat.lookupMaybe(PDFName.of("Names"), PDFDict);
  if (names && names.get(PDFName.of("JavaScript")) !== undefined) {
    names.delete(PDFName.of("JavaScript"));
    stripped.push("Names/JavaScript");
  }
  return stripped;
}

/**
 * Removes link annotations that carry a URI (or any other) action.
 *
 * Official forms print help URLs such as courts.ca.gov and wrap them in Link
 * annotations. The printed text is part of the official layout and stays; the
 * clickable action is a network action, which a participant packet may not
 * carry, so only the annotation is dropped. Returns the number removed.
 */
export function stripLinkAnnotations(pdfDoc) {
  let removed = 0;
  for (const page of pdfDoc.getPages()) {
    const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annots) continue;
    for (let i = annots.size() - 1; i >= 0; i -= 1) {
      const annot = annots.lookup(i, PDFDict);
      if (!annot) continue;
      const subtype = annot.get(PDFName.of("Subtype"));
      const action = annot.lookupMaybe(PDFName.of("A"), PDFDict);
      const actionType = action ? String(action.get(PDFName.of("S")) ?? "").replace("/", "") : "";
      const isLink = String(subtype ?? "") === "/Link";
      if (isLink || actionType === "URI" || annot.get(PDFName.of("AA")) !== undefined) {
        annots.remove(i);
        removed += 1;
      }
    }
  }
  return removed;
}

/** Scans every page annotation for residual actions. Returns offending entries. */
export function scanAnnotationActions(pdfDoc) {
  const hits = [];
  for (const [pageIndex, page] of pdfDoc.getPages().entries()) {
    const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annots) continue;
    for (let i = 0; i < annots.size(); i += 1) {
      const annot = annots.lookup(i, PDFDict);
      if (!annot) continue;
      const a = annot.lookupMaybe(PDFName.of("A"), PDFDict);
      const aa = annot.get(PDFName.of("AA"));
      if (aa !== undefined) hits.push({ page: pageIndex, kind: "AA" });
      if (a) {
        const s = a.get(PDFName.of("S"));
        const sName = s ? String(s).replace("/", "") : "";
        if (ACTIVE_CONTENT_KEYS.includes(sName) || sName === "URI") {
          hits.push({ page: pageIndex, kind: sName });
        }
      }
    }
  }
  return hits;
}
