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

/**
 * Fixed document metadata timestamp.
 *
 * pdf-lib stamps CreationDate and ModDate with the wall clock, so two renders of
 * identical input that straddle a second boundary produce different bytes. That
 * makes a packet's checksum a function of when it ran rather than of what went
 * into it, which breaks reproducibility, makes a recorded review hash
 * unverifiable and makes any determinism test intermittently fail.
 *
 * The document's real date is the one the participant writes on the signature
 * line, which is deliberately left blank. Nothing downstream reads this field.
 */
const DETERMINISTIC_TIMESTAMP = new Date(Date.UTC(2000, 0, 1, 0, 0, 0));

export async function createDocument(): Promise<{ doc: PDFDocument; fonts: Fonts }> {
  const doc = await PDFDocument.create();
  doc.setCreationDate(DETERMINISTIC_TIMESTAMP);
  doc.setModificationDate(DETERMINISTIC_TIMESTAMP);
  doc.setProducer("LegalEase");
  doc.setCreator("LegalEase");
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

  /**
   * Applies spacing without letting whitespace alone allocate a page.
   *
   * Use this only where the caller deliberately owns the following page-break
   * behavior (for example, the terminal gap after a final section). The
   * original `gap()` contract remains byte-stable for hash-bound legacy
   * packets.
   */
  spacingGap(height = LINE_HEIGHT): void {
    if (!Number.isFinite(height) || height < 0) {
      throw new Error(
        "FlowWriter spacing-gap height must be a finite non-negative number."
      );
    }
    this.y = Math.max(MARGIN_BOTTOM, this.y - height);
  }

  measureTextHeight(
    text: string,
    options: {
      font?: keyof Fonts;
      size?: number;
      indent?: number;
      lineHeight?: number;
    } = {}
  ): number {
    const size = options.size ?? 11;
    const font = this.fonts[options.font ?? "regular"];
    const indent = options.indent ?? 0;
    const lineHeight = options.lineHeight ?? LINE_HEIGHT;
    return (
      wrapText(text, font, size, this.contentWidth - indent).length *
      lineHeight
    );
  }

  /**
   * Moves to a new page before the next drawing operation when a small block
   * would otherwise split. Oversized blocks are left to normal pagination.
   */
  keepTogether(height: number): boolean {
    if (!Number.isFinite(height) || height < 0) {
      throw new Error(
        "FlowWriter keep-together height must be a finite non-negative number."
      );
    }
    const usablePageHeight = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;
    if (height > usablePageHeight) return false;
    this.ensureRoom(height);
    return true;
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

  /**
   * One row of a two-column pleading caption.
   *
   * Court captions are two columns separated by a gutter, not one padded line.
   * Padding a proportional font by character count collapses the gutter and
   * runs the party name into the cause number, which is what a reader sees as
   * "STATE OF MISSISSIPPI Cause No. 12345" on one line. Both columns are drawn
   * at fixed x positions instead, and each wraps inside its own width.
   */
  captionRow(left: string, right: string): void {
    const size = 10;
    const font = this.fonts.regular;
    const leftWidth = 250;
    const rightX = MARGIN_X + 300;
    const rightWidth = PAGE_WIDTH - MARGIN_X - rightX;
    const leftLines = left ? wrapText(left, font, size, leftWidth) : [];
    const rightLines = right ? wrapText(right, font, size, rightWidth) : [];
    const rows = Math.max(leftLines.length, rightLines.length, 1);

    for (let i = 0; i < rows; i += 1) {
      this.ensureRoom(LINE_HEIGHT);
      if (leftLines[i]) {
        this.page.drawText(leftLines[i], { x: MARGIN_X, y: this.y - size, size, font, color: rgb(0, 0, 0) });
      }
      // The section mark is the conventional Mississippi caption divider and
      // makes the two columns unmistakably separate.
      this.page.drawText("§", { x: MARGIN_X + 272, y: this.y - size, size, font, color: rgb(0, 0, 0) });
      if (rightLines[i]) {
        this.page.drawText(rightLines[i], { x: rightX, y: this.y - size, size, font, color: rgb(0, 0, 0) });
      }
      this.y -= LINE_HEIGHT;
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
