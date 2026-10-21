// Deterministic PDF renderer for the North Dakota Chapter 12-60.1 Grade-A packet.
//
// One composed line is one PDF line. The composer already wrapped every line to
// the Courier measure and already decided every page break, so this renderer
// never re-wraps and never re-paginates: the PDF's page count is exactly the
// composed page count, and the same packet always produces the same bytes.
//
// Shared by the artifact generator and the Grade-A product-path proof, so the
// artifact a participant downloads is byte-identical to the artifact the review
// was performed against.

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts } = require("pdf-lib");

/** A fixed timestamp: a clock in the metadata would make the bytes unstable. */
export const ND_GRADE_A_PDF_DATE = new Date("2026-08-29T00:00:00.000Z");

// WinAnsi-safe substitutions for the standard (non-embedded) PDF fonts.
const CHAR_REPLACEMENTS = new Map([
  [" ", " "],
  ["‑", "-"],
  ["–", "-"],
  ["−", "-"]
]);

export function sanitizeForPdf(text) {
  let out = "";
  for (const ch of text) out += CHAR_REPLACEMENTS.get(ch) ?? ch;
  return out;
}

/**
 * Render a composed North Dakota packet to a complete application/pdf.
 *
 * Returns `{ bytes, overlongLines }`. An overlong line is a composer defect, not
 * something to silently clip, so it is reported rather than drawn past the
 * margin; callers fail on a non-empty list.
 */
export async function renderNdGradeAPacketPdf(packet, layout, title) {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setAuthor("LegalEase RCAP");
  doc.setSubject("North Dakota Petition to Seal Criminal Records (N.D.C.C. Chapter 12-60.1)");
  doc.setProducer("rcap-grade-a-nd-chapter-12-60-1-composer");
  doc.setCreator("LegalEase RCAP lane D");
  doc.setCreationDate(ND_GRADE_A_PDF_DATE);
  doc.setModificationDate(ND_GRADE_A_PDF_DATE);

  const font = await doc.embedFont(StandardFonts.Courier);
  const { fontSize, lineHeight, pageWidth, pageHeight, margin, measureChars } = layout;
  const overlongLines = [];

  for (const document of packet.documents) {
    for (const pageLines of document.pages) {
      const page = doc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;
      for (const rawLine of pageLines) {
        const line = sanitizeForPdf(rawLine);
        if (line.length > measureChars) {
          overlongLines.push(`${document.documentId}: ${line.slice(0, 60)}...`);
        }
        if (line.length > 0) page.drawText(line, { x: margin, y, size: fontSize, font });
        y -= lineHeight;
      }
    }
  }

  return { bytes: Buffer.from(await doc.save({ useObjectStreams: false })), overlongLines };
}

export { PDFDocument };
