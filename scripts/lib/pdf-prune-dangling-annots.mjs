// Prune page /Annots entries that no longer resolve, and assert none survive.
//
// WHY THIS EXISTS. pdf-lib's form.flatten() removes the widget annotation
// objects from the document context but leaves their indirect references in
// each page's /Annots array. Copying such a page into a fresh packet document
// makes PDFObjectCopier reserve a fresh object number for every one of those
// unresolvable references and then never emit an object at it, so the packet
// ships with /Size larger than the object numbers its cross-reference table
// covers, split into one xref subsection per surviving run. Poppler then
// refuses the file with "Syntax Error: Couldn't find trailer dictionary" and
// reconstructs the table before it can read a page.
//
// The two symptoms VF01/VF02/VF03 measured -- N dangling references per fixture
// and exactly N object numbers declared by /Size but absent from the xref --
// are one fault with one cause, and the count is equal because each dangling
// reference consumes exactly one reserved-and-never-written object number.
// Pruning at the component document, BEFORE copyPages runs, is therefore the
// whole repair: no reference survives to be copied, no number is reserved for
// one, and pdf-lib emits a single full-coverage xref subsection on its own. No
// separate free-entry xref pass is needed, and this file does not add one.
// The already-clean il-exp-pardon-set and il-seal-edu-set, which have called
// the same prune since they were built, are the evidence: both ship /Size 808
// over a single 808-object subsection with zero dangling references.
//
// LINK ANNOTATIONS RESOLVE AND MUST STAY. The official AOIC forms carry Link
// annotations that are real objects. They resolve, so the filter below keeps
// them, and pruneDanglingAnnots never removes a live annotation of any kind:
// the only thing it drops is a reference to an object that is not there.
//
// This is the shared EXP-AD build path's copy of a repair first written as
// pruneDanglingAnnots() in scripts/build-census-v1-il-exp-pardon-set.mjs. It
// lives here so the fix has one implementation rather than one per family.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PDFName, PDFRef } = require("pdf-lib");

/**
 * Remove every unresolvable indirect reference from every page's /Annots.
 * @returns {number} how many references were removed.
 */
export function pruneDanglingAnnots(document) {
  let removed = 0;
  for (const page of document.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    const before = removed;
    const keep = annots.asArray().filter((entry) => {
      const resolved = entry instanceof PDFRef ? document.context.lookup(entry) : entry;
      if (resolved) return true;
      removed += 1;
      return false;
    });
    if (removed === before) continue;
    if (keep.length === 0) page.node.delete(PDFName.of("Annots"));
    else page.node.set(PDFName.of("Annots"), document.context.obj(keep));
  }
  return removed;
}

/**
 * Count the unresolvable /Annots references a document still carries. Zero is
 * the only value a delivered packet may ship; builds assert on it against the
 * reopened bytes so the defect cannot return silently.
 * @returns {number}
 */
export function countDanglingAnnots(document) {
  let dangling = 0;
  for (const page of document.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (const entry of annots.asArray()) {
      const resolved = entry instanceof PDFRef ? document.context.lookup(entry) : entry;
      if (!resolved) dangling += 1;
    }
  }
  return dangling;
}
