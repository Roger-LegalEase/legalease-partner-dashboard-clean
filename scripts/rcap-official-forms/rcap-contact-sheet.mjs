// Blank-versus-filled contact sheets built from the finalized artifact.
//
// The previous sheet embedded the filled-but-unflattened document. `embedPdf`
// copies a page's content stream, and an unflattened field's value lives in
// its widget's appearance stream -- an annotation, not page content. The
// filled panel therefore carried no values at all, and every sheet showed two
// identical blank pages while reporting itself as review-ready. Independent
// visual review was being handed an artifact that could not show the thing it
// was meant to review.
//
// Two changes make the sheet mean something. It embeds the finalized artifact,
// whose values have been materialized and flattened into page content; and it
// proves, by decoding that content, that the expected values are actually
// there. If the two panels come back identical while values were expected, the
// sheet is refused rather than written.
//
// The sheet is also a distributed artifact in its own right, not a preview of
// one. `embedPdf` copies a source page together with everything it references,
// so embedding an unsanitized blank form carries that form's widgets, their
// /AA additional-action dictionaries and their /JS scripts into the sheet --
// unreachable from the page tree, but present in the bytes. Both panels are
// therefore sanitized before they are embedded, and the finished sheet is
// sanitized and proven clean before it is returned.
import { createRequire } from "node:module";
import crypto from "node:crypto";
import { extractTextItems, groupIntoLines } from "./rcap-pdf-anchor-capture.mjs";
import { DETERMINISTIC_STAMP } from "./rcap-official-form-finalize.mjs";
import { sanitizeAndFlatten, assertInspectableAndClean, scanBytesForActiveContent } from "./rcap-active-content.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

/** All text visible on a page, including text inside flattened appearances. */
export function visibleTextOf(pdfDoc, pageIndex) {
  return groupIntoLines(extractTextItems(pdfDoc.getPages()[pageIndex]))
    .map((l) => l.text)
    .join("\n");
}

export function visibleTextOfDocument(pdfDoc) {
  return pdfDoc.getPages().map((_, i) => visibleTextOf(pdfDoc, i)).join("\n");
}

// Comparison has to survive the ways a PDF legitimately breaks a string up:
// kerning splits runs, and wrapping inserts newlines mid-value.
const normalize = (s) => String(s).replace(/\s+/g, "").toLowerCase();

/**
 * Confirms every expected value is visibly present in the finalized artifact.
 * Returns the values that are missing.
 */
export function missingExpectedValues(visibleText, expectedValues) {
  const haystack = normalize(visibleText);
  return [...new Set(expectedValues)].filter((v) => {
    const needle = normalize(v);
    return needle.length > 0 && !haystack.includes(needle);
  });
}

export class ContactSheetProofError extends Error {
  constructor(message, detail) {
    super(message);
    this.name = "ContactSheetProofError";
    this.detail = detail;
  }
}

/**
 * Builds the sheet and returns its bytes plus the proof that backs it.
 *
 * `finalizedBytes` must be the finalized participant artifact -- flattened,
 * sanitized, the thing that would be filed. Passing an unflattened document
 * here is precisely the defect this module exists to catch, and it will be
 * caught: its values will not be visible.
 */
export async function buildContactSheet({
  blankBytes,
  finalizedBytes,
  expectedValues = [],
  heading = "blank (left) vs finalized fill (right)",
  scale = 0.62,
  artifactLabel = "contact sheet"
}) {
  // The blank panel is the untouched official form, so it arrives carrying
  // whatever the issuing authority put in it: widget scripts, document
  // actions, an XFA packet. Sanitizing it here means the sheet embeds the same
  // printed appearance without also embedding the machinery behind it. The
  // finalized artifact is already clean; running it through the same pass is
  // cheap and removes any question of which panel a residue marker came from.
  const blankPanel = await sanitizedPanel(blankBytes);
  const finalPanel = await sanitizedPanel(finalizedBytes);
  // Recorded from the bytes actually embedded, not from the intent to sanitize
  // them. Rebuilding the composed sheet would clean it either way, so without
  // this the panel step could be removed and nothing downstream would notice.
  const panelScans = {
    blank: scanBytesForActiveContent(blankPanel),
    finalized: scanBytesForActiveContent(finalPanel)
  };

  const blankDoc = await PDFDocument.load(blankPanel, { ignoreEncryption: true });
  const finalDoc = await PDFDocument.load(finalPanel, { ignoreEncryption: true });

  const blankText = visibleTextOfDocument(blankDoc);
  const finalText = visibleTextOfDocument(finalDoc);

  const missing = missingExpectedValues(finalText, expectedValues);
  if (missing.length > 0) {
    throw new ContactSheetProofError(
      `finalized artifact does not visibly contain ${missing.length} expected value(s)`,
      { missing }
    );
  }

  // The decisive check: values were expected, yet the finalized page renders
  // exactly like the blank one. That is the unflattened-artifact defect, and
  // it must fail rather than produce a sheet nobody can review.
  if (expectedValues.length > 0 && normalize(blankText) === normalize(finalText)) {
    throw new ContactSheetProofError(
      "blank and filled panels are identical despite expected values; the filled panel is not the finalized artifact",
      { expectedValueCount: expectedValues.length }
    );
  }

  const sheet = await PDFDocument.create();
  const font = await sheet.embedFont(StandardFonts.Helvetica);
  const pageCount = Math.min(blankDoc.getPageCount(), finalDoc.getPageCount());
  for (let i = 0; i < pageCount; i += 1) {
    const [bp] = await sheet.embedPdf(blankPanel, [i]);
    const [fp] = await sheet.embedPdf(finalPanel, [i]);
    const W = bp.width, H = bp.height, gap = 24, margin = 28, header = 34;
    const page = sheet.addPage([W * scale * 2 + gap + margin * 2, H * scale + margin * 2 + header]);
    page.drawText(`${heading} — page ${i + 1} of ${pageCount}`,
      { x: margin, y: H * scale + margin + 12, size: 9, font, color: rgb(0.1, 0.1, 0.1) });
    page.drawPage(bp, { x: margin, y: margin, xScale: scale, yScale: scale });
    page.drawPage(fp, { x: margin + W * scale + gap, y: margin, xScale: scale, yScale: scale });
  }

  sheet.setCreationDate(DETERMINISTIC_STAMP);
  sheet.setModificationDate(DETERMINISTIC_STAMP);

  // The sheet composes two already-clean panels, but embedPdf reaches into
  // each source document to copy what a page references, so the composed file
  // is scanned on its own account rather than trusted because its inputs were.
  // Object streams are off for the same reason the finalized artifact turns
  // them off: a scan that cannot see the bytes cannot judge them.
  const { clean: cleanSheet } = await sanitizeAndFlatten(sheet, { alreadyFlattened: true });
  cleanSheet.setCreationDate(DETERMINISTIC_STAMP);
  cleanSheet.setModificationDate(DETERMINISTIC_STAMP);
  const bytes = await cleanSheet.save({ useObjectStreams: false });
  const activeContentScan = assertInspectableAndClean(bytes, artifactLabel);

  return {
    bytes,
    proof: {
      basis: "finalized participant artifact, decoded from page content including flattened appearances",
      pages: pageCount,
      expectedValues: [...new Set(expectedValues)],
      allExpectedValuesVisible: true,
      panelsDiffer: true,
      panelsSanitizedBeforeEmbedding: panelScans.blank.clean && panelScans.finalized.clean,
      panelScans,
      activeContentScan,
      finalizedSha256: crypto.createHash("sha256").update(finalizedBytes).digest("hex"),
      sheetSha256: crypto.createHash("sha256").update(bytes).digest("hex")
    }
  };
}

/**
 * Sanitizes one panel before it is embedded.
 *
 * The panel is already a rendered page -- the blank source as issued, or the
 * finalized artifact -- so it is not flattened again; flattening a finalized
 * artifact would be a no-op and flattening the blank one would materialize the
 * empty field appearances the left-hand panel exists to show. What this does
 * remove is everything the sheet has no business carrying: XFA, document and
 * field actions, active annotation subtypes, and any annotation that is not
 * part of the printed appearance.
 */
async function sanitizedPanel(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const { clean } = await sanitizeAndFlatten(doc, { alreadyFlattened: true });
  clean.setCreationDate(DETERMINISTIC_STAMP);
  clean.setModificationDate(DETERMINISTIC_STAMP);
  return clean.save({ useObjectStreams: false });
}
