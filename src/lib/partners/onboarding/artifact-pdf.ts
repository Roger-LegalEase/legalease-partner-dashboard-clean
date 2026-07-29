import "server-only";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { RenderedDocument } from "./artifact-generator";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const NAVY = rgb(0.059, 0.118, 0.239);
const SLATE = rgb(0.361, 0.341, 0.314);
const ORANGE = rgb(0.78, 0.35, 0.11);

/**
 * Renders an approved snapshot to a private PDF using pdf-lib, which is already
 * a repository dependency. No headless browser is introduced.
 */
export async function renderApprovedSnapshotPdf(input: {
  document: RenderedDocument;
  versionNumber: number;
  generatedAt: string;
  organizationName: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${input.document.documentTitle} — ${input.organizationName}`);
  pdf.setProducer("LegalEase");
  pdf.setCreator("LegalEase");

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const newPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };

  const ensure = (needed: number) => {
    if (y - needed < MARGIN) newPage();
  };

  const write = (
    text: string,
    options: {
      font?: typeof regular;
      size?: number;
      color?: ReturnType<typeof rgb>;
      indent?: number;
      gap?: number;
    } = {}
  ) => {
    const font = options.font ?? regular;
    const size = options.size ?? 10.5;
    const color = options.color ?? NAVY;
    const indent = options.indent ?? 0;
    const lines = wrap(text, font, size, CONTENT_WIDTH - indent);
    for (const line of lines) {
      ensure(size + 4);
      page.drawText(line, {
        x: MARGIN + indent,
        y: y - size,
        size,
        font,
        color
      });
      y -= size + 4;
    }
    y -= options.gap ?? 0;
  };

  write(input.document.documentTitle, { font: bold, size: 22, gap: 4 });
  write(input.organizationName, { size: 13, color: SLATE });
  if (input.document.programName) {
    write(input.document.programName, { size: 11, color: SLATE });
  }
  write(
    `Version ${input.versionNumber} · Generated ${input.generatedAt.slice(0, 10)}`,
    { size: 9, color: SLATE, gap: 14 }
  );

  for (const section of input.document.sections) {
    ensure(40);
    write(section.heading, { font: bold, size: 13, gap: 2 });

    for (const block of section.blocks) {
      if (block.kind === "paragraph") {
        write(block.text, { gap: 8 });
      } else if (block.kind === "definitions") {
        for (const item of block.items) {
          write(item.term, { font: bold, size: 9.5, color: SLATE });
          write(item.value, { indent: 12, gap: 4 });
        }
        y -= 4;
      } else if (block.kind === "bullets") {
        for (const item of block.items) {
          write(`•  ${item}`, { indent: 6 });
        }
        y -= 8;
      } else if (block.kind === "gap") {
        write(`Not yet provided: ${block.label}`, {
          font: bold,
          size: 9.5,
          color: ORANGE
        });
        write(`Set this in ${block.whereToSet}`, {
          size: 9,
          color: SLATE,
          indent: 12,
          gap: 6
        });
      }
    }
    y -= 6;
  }

  return pdf.save();
}

function wrap(
  text: string,
  font: { widthOfTextAtSize: (value: string, size: number) => number },
  size: number,
  maxWidth: number
): string[] {
  // pdf-lib's standard fonts cannot encode characters outside WinAnsi, so
  // anything unusual is replaced rather than throwing mid-render.
  const safe = text.replace(/[^\x20-\x7E -ÿ]/g, "-");
  const words = safe.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}
