import fs from "node:fs";

export type XfaStatus = true | false | "unknown";

export function detectXfaInPdfBytes(buffer: Buffer): XfaStatus {
  if (!buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) return "unknown";
  const text = buffer.toString("latin1");
  if (!/\/AcroForm\b/.test(text)) return false;
  return /\/XFA\b/.test(text);
}

export function detectXfaInPdfFile(pdfPath: string): XfaStatus {
  try {
    return detectXfaInPdfBytes(fs.readFileSync(pdfPath));
  } catch {
    return "unknown";
  }
}
