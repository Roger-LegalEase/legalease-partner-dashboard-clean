// Text layout for generated documents.
//
// pdf-lib has no line breaking and no pagination, so both live here and are
// shared by the pleading and guidance engines. Overflow is detected rather
// than silently clipped: a court document that quietly loses its last
// paragraph is worse than one that refuses to render.

import { PDFDocument, PDFFont, StandardFonts, rgb, type PDFPage } from "pdf-lib";

export const PAGE_WIDTH = 612;
export const PAGE_HEIGHT = 792;
export const MARGIN_X = 72;
export const MARGIN_TOP = 72;
export const MARGIN_BOTTOM = 72;
export const LINE_HEIGHT = 14;

export type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont };

export async function createDocument(): Promise<{ doc: PDFDocument; fonts: Fonts }> {
  const doc = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.TimesRoman),
    bold: await doc.embedFont(StandardFonts.TimesRomanBold),
    italic: await doc.embedFont(StandardFonts.TimesRomanItalic)
  };
  return { doc, fonts };
}

/** Breaks text to fit a width, splitting over-long words rather than losing them. */
export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const rawLine of String(text).split("\n")) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        current = word;
        continue;
      }
      // A single word wider than the column. Break it by character so the
      // content survives, and let the caller record a warning.
      let chunk = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(chunk + char, size) > maxWidth) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      current = chunk;
    }
    if (current) lines.push(current);
  }
  return lines;
}

/** A cursor that adds pages as content runs past the bottom margin. */
export class FlowWriter {
  private page: PDFPage;
  private y: number;
  readonly warnings: string[] = [];

  constructor(private readonly doc: PDFDocument, private readonly fonts: Fonts) {
    this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN_TOP;
  }

  get contentWidth(): number {
    return PAGE_WIDTH - MARGIN_X * 2;
  }

  private ensureRoom(height: number): void {
    if (this.y - height >= MARGIN_BOTTOM) return;
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN_TOP;
  }

  gap(height = LINE_HEIGHT): void {
    this.ensureRoom(height);
    this.y -= height;
  }

  write(
    text: string,
    options: {
      font?: keyof Fonts;
      size?: number;
      align?: "left" | "center";
      indent?: number;
      lineHeight?: number;
    } = {}
  ): void {
    const size = options.size ?? 11;
    const font = this.fonts[options.font ?? "regular"];
    const indent = options.indent ?? 0;
    const lineHeight = options.lineHeight ?? LINE_HEIGHT;
    const maxWidth = this.contentWidth - indent;
    const lines = wrapText(text, font, size, maxWidth);

    for (const line of lines) {
      this.ensureRoom(lineHeight);
      const width = font.widthOfTextAtSize(line, size);
      const x =
        options.align === "center"
          ? MARGIN_X + (this.contentWidth - width) / 2
          : MARGIN_X + indent;
      this.page.drawText(line, { x, y: this.y - size, size, font, color: rgb(0, 0, 0) });
      this.y -= lineHeight;
    }
  }

  rule(): void {
    this.ensureRoom(LINE_HEIGHT);
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN_X, y: this.y },
      thickness: 0.75,
      color: rgb(0, 0, 0)
    });
    this.y -= LINE_HEIGHT;
  }

  /** A signature or fill-in rule the participant completes by hand. */
  signatureLine(label: string): void {
    this.ensureRoom(LINE_HEIGHT * 2);
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y },
      end: { x: MARGIN_X + 260, y: this.y },
      thickness: 0.75,
      color: rgb(0, 0, 0)
    });
    this.y -= LINE_HEIGHT;
    this.write(label, { size: 9, font: "italic" });
  }
}

/** Substitutes {{key}} placeholders and reports any that had no value. */
export function fillTemplate(
  text: string,
  facts: Record<string, unknown>
): { text: string; missing: string[] } {
  const missing: string[] = [];
  const filled = text.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_match, key: string) => {
    const value = facts[key];
    if (value === undefined || value === null || String(value).trim() === "") {
      missing.push(key);
      return "____________________";
    }
    return String(value);
  });
  return { text: filled, missing };
}
