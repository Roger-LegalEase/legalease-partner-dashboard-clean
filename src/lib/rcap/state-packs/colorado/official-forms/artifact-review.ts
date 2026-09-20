// What is actually on the retained artifacts, read off the artifacts.
//
// Two questions, answered from the bytes rather than from a manifest. First,
// which declared values are really visible on the finished page — the fixtures
// are flattened, so a value that was set on a field but never drawn would be
// invisible to a form-field reader and is caught here instead. Second, whether
// anything the specification protects has a value on the page.
//
// The protected check is deliberately blunt. It looks for the participant's
// own name in the signature block's own row, because that is what a signature
// forged by a renderer would look like, and it reports the row's text so a
// reviewer can see what it saw.
import fs from "node:fs";
import { createRequire } from "node:module";
import { extractTextItems, groupIntoLines } from "../../../../../../scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import type { ColoradoFormSpec } from "./types";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { PDFDocument } = require("pdf-lib") as any;

export interface RowReading {
  readonly field: string;
  readonly page: number;
  readonly rowText: string;
}

export interface PageReading {
  readonly page: number;
  readonly width: number;
  readonly height: number;
  readonly textLines: number;
  /** The form's own footer line, which proves the official page survived. */
  readonly footer: string | null;
  readonly declaredValuesVisible: readonly string[];
  readonly protectedRowsWithText: readonly { readonly field: string; readonly rowText: string }[];
  /** Rows the caller asked about, so a value that is not on the page can be diagnosed. */
  readonly requestedRows: readonly { readonly field: string; readonly rowText: string }[];
}

export interface ArtifactReading {
  readonly artifact: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly pages: readonly PageReading[];
  readonly acroFormFieldsRemaining: number;
  readonly flattened: boolean;
}

function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Is the value on the page?
 *
 * Both forms draw their text in fragments — JDF 612 emits "Phon 555-0142e:" for
 * a row whose label is "Phone:" — so a substring test against the whole page,
 * with whitespace collapsed, is the only reading that survives the encoding.
 * A short value is not searched for at all: "no" appears on every page of both
 * forms and finding it would prove nothing.
 */
function valueVisible(pageText: string, value: string): boolean {
  const needle = normalise(value);
  if (needle.length < 6) return false;
  return pageText.includes(needle);
}

export async function readArtifact(
  artifactPath: string,
  spec: ColoradoFormSpec,
  declaredValues: readonly string[],
  sha256: (input: Buffer) => string,
  rowsOfInterest: readonly string[] = [],
): Promise<ArtifactReading> {
  const bytes = fs.readFileSync(artifactPath);
  const document = await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true });
  const pages = document.getPages();

  let remaining = 0;
  try {
    remaining = document.getForm().getFields().length;
  } catch {
    remaining = 0;
  }

  const requested = new Set(rowsOfInterest);
  const protectedByPage = new Map<number, { field: string; y: number; height: number }[]>();
  const requestedByPage = new Map<number, { field: string; y: number; height: number }[]>();
  for (const field of spec.fields) {
    for (const anchor of field.anchors) {
      const entry = { field: field.field, y: anchor.rect.y, height: anchor.rect.height };
      if (field.fieldClass === "protected") {
        protectedByPage.set(anchor.page, [...(protectedByPage.get(anchor.page) ?? []), entry]);
      }
      if (requested.has(field.field)) {
        requestedByPage.set(anchor.page, [...(requestedByPage.get(anchor.page) ?? []), entry]);
      }
    }
  }

  const readings: PageReading[] = [];
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const lines = groupIntoLines(extractTextItems(page)) as { y: number; x: number; text: string }[];
    const pageText = normalise(lines.map((line) => line.text).join(" "));
    const size = page.getSize() as { width: number; height: number };

    const footer = lines
      .filter((line) => line.y < 30)
      .map((line) => line.text.trim())
      .find((text) => text.length > 0) ?? null;

    const visible: string[] = [];
    for (const value of declaredValues) {
      if (valueVisible(pageText, value)) visible.push(value);
    }

    const rowTextAt = (entry: { field: string; y: number; height: number }) => {
      const centre = entry.y + entry.height / 2;
      return {
        field: entry.field,
        rowText: lines
          .filter((line) => Math.abs(line.y - centre) <= 6)
          .sort((a, b) => a.x - b.x)
          .map((line) => line.text)
          .join(" ")
          .trim(),
      };
    };
    const protectedRows = (protectedByPage.get(index + 1) ?? []).map(rowTextAt);
    const requestedRows = (requestedByPage.get(index + 1) ?? []).map(rowTextAt);

    readings.push({
      page: index + 1,
      width: Math.round(size.width * 100) / 100,
      height: Math.round(size.height * 100) / 100,
      textLines: lines.length,
      footer,
      declaredValuesVisible: visible,
      protectedRowsWithText: protectedRows,
      requestedRows,
    });
  }

  return {
    artifact: artifactPath,
    sha256: sha256(bytes),
    bytes: bytes.length,
    pages: readings,
    acroFormFieldsRemaining: remaining,
    flattened: remaining === 0,
  };
}
