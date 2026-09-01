// Reads, off the page, the text that sits beside each field.
//
// The reviewed label in a specification is a human reading. This is the
// machine's, kept separately so the two can be compared rather than conflated:
// JDF 612's text layer is drawn with a transposed encoding and comes back as
// "Sheriff¶s De Sartment", which is evidence of what the page draws and is
// not a label anyone would write.
//
// The measurement is taken from the family's retained participant artifact,
// which carries the official form's own page content. The official binary is
// the better source and is used when it is mounted; when it is not, the
// artifact is named as the basis so no reader mistakes one for the other.
import fs from "node:fs";
import { createRequire } from "node:module";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { extractTextItems, groupIntoLines } from "../../../../../../scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { PDFDocument } = require("pdf-lib") as any;

interface Rect { x: number; y: number; width: number; height: number }
interface Widget { page: number; rect: Rect }
interface CensusEntry { name: string; widgets: Widget[] }

export interface LabelEvidence {
  readonly schemaVersion: "rcap-colorado-label-evidence/v1";
  readonly basis: string;
  readonly documentSha256: string;
  readonly byField: Readonly<Record<string, string>>;
}

/**
 * The line the widget sits on, then the line above it, joined.
 *
 * Two lines rather than one because these forms put the answer beside its
 * question on some rows and beneath it on others, and a single-line reading
 * would return an empty string for every offence row on JDF 417.
 */
function evidenceFor(lines: { y: number; x: number; text: string }[], rect: Rect): string {
  const centre = rect.y + rect.height / 2;
  const sameRow = lines
    .filter((line) => Math.abs(line.y - centre) <= 8)
    .sort((a, b) => a.x - b.x)
    .map((line) => line.text);
  const above = lines
    .filter((line) => line.y > centre + 8 && line.y < centre + 26)
    .sort((a, b) => a.x - b.x)
    .map((line) => line.text);
  return [...sameRow, ...above].join(" ⟂ ").trim();
}

export async function readLabelEvidence(
  pdfPath: string,
  census: readonly CensusEntry[],
  basis: string,
  documentSha256: string,
): Promise<LabelEvidence> {
  const bytes = fs.readFileSync(pdfPath);
  const document = await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true });
  const pages = document.getPages();
  const linesByPage = pages.map((page: unknown) =>
    groupIntoLines(extractTextItems(page)) as { y: number; x: number; text: string }[],
  );

  const byField: Record<string, string> = {};
  for (const field of census) {
    const readings = field.widgets
      .map((widget) => evidenceFor(linesByPage[widget.page - 1] ?? [], widget.rect))
      .filter((reading) => reading !== "");
    byField[field.name] = [...new Set(readings)].join(" ‖ ");
  }

  return {
    schemaVersion: "rcap-colorado-label-evidence/v1",
    basis,
    documentSha256,
    byField,
  };
}
