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
import { createRequire } from "node:module";
import crypto from "node:crypto";
import { extractTextItems, groupIntoLines } from "./rcap-pdf-anchor-capture.mjs";
import { DETERMINISTIC_STAMP } from "./rcap-official-form-finalize.mjs";

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
  scale = 0.62
}) {
  const blankDoc = await PDFDocument.load(blankBytes, { ignoreEncryption: true });
  const finalDoc = await PDFDocument.load(finalizedBytes, { ignoreEncryption: true });

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
    const [bp] = await sheet.embedPdf(blankBytes, [i]);
    const [fp] = await sheet.embedPdf(finalizedBytes, [i]);
    const W = bp.width, H = bp.height, gap = 24, margin = 28, header = 34;
    const page = sheet.addPage([W * scale * 2 + gap + margin * 2, H * scale + margin * 2 + header]);
    page.drawText(`${heading} — page ${i + 1} of ${pageCount}`,
      { x: margin, y: H * scale + margin + 12, size: 9, font, color: rgb(0.1, 0.1, 0.1) });
    page.drawPage(bp, { x: margin, y: margin, xScale: scale, yScale: scale });
    page.drawPage(fp, { x: margin + W * scale + gap, y: margin, xScale: scale, yScale: scale });
  }

  // Stamped and serialized the same way the finalizer stamps a participant
  // artifact. The sheet is evidence about a finalized artifact, and evidence
  // that cannot itself pass the finalization contract is awkward to defend:
  // without the producer string it cannot say which factory built it, and
  // saved with object streams the active-content scan cannot see into it.
  sheet.setProducer("LegalEase RCAP official-form factory (pdf-lib)");
  sheet.setCreator("LegalEase RCAP");
  sheet.setTitle(heading);
  sheet.setCreationDate(DETERMINISTIC_STAMP);
  sheet.setModificationDate(DETERMINISTIC_STAMP);
  const bytes = await sheet.save({ useObjectStreams: false });

  return {
    bytes,
    proof: {
      basis: "finalized participant artifact, decoded from page content including flattened appearances",
      pages: pageCount,
      expectedValues: [...new Set(expectedValues)],
      allExpectedValuesVisible: true,
      panelsDiffer: true,
      finalizedSha256: crypto.createHash("sha256").update(finalizedBytes).digest("hex"),
      sheetSha256: crypto.createHash("sha256").update(bytes).digest("hex")
    }
  };
}
