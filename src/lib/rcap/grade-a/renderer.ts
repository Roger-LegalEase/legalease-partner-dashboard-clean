import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { GradeABlock, GradeADocument, GradeAPacket } from "@/lib/rcap/grade-a/composer";

/**
 * The Grade-A provider: a composed packet in, application/pdf out.
 *
 * Deliberately standalone rather than an extension of packet_document_v1. That
 * renderer belongs to the five retired legacy generators, and ADR-0004 keeps it
 * only so already-generated artifacts stay reachable. Building the forward
 * architecture on top of a component scheduled for retirement would mean the
 * retirement can never finish.
 *
 * Like the legacy renderer, this one is browser-free: pdf-lib only, no
 * subprocess, no outbound network, identical in a request handler and in an
 * isolated worker.
 *
 * It draws what the composer produced and nothing else. It has no access to the
 * specification and no notion of what a filing is, so it cannot add a sentence
 * the specification does not contain.
 */

export const GRADE_A_RENDERER_KIND = "rcap_grade_a_document_v1";
export const GRADE_A_RENDERER_VERSION = "1.0.0";
export const GRADE_A_CONTENT_TYPE = "application/pdf";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BODY_SIZE = 10.5;
const BODY_LEADING = 15;

const INK = rgb(0.06, 0.13, 0.22);
const MUTED = rgb(0.36, 0.41, 0.46);
const RULE = rgb(0.85, 0.89, 0.93);

type Fonts = { body: PDFFont; bold: PDFFont };
type Cursor = { page: PDFPage; y: number };

export async function renderGradeAPacketPdf(packet: GradeAPacket): Promise<Buffer> {
  if (packet.documents.length === 0) {
    throw new Error("Refusing to render an empty packet. A zero-document PDF is a receipt, not a filing packet.");
  }

  const document = await PDFDocument.create();
  document.setTitle(packet.packetFamilyLabel);
  document.setProducer("LegalEase Grade-A packet renderer");
  document.setCreator("LegalEase");

  const fonts: Fonts = {
    body: await document.embedFont(StandardFonts.Helvetica),
    bold: await document.embedFont(StandardFonts.HelveticaBold)
  };

  const cursor: Cursor = { page: document.addPage([PAGE_WIDTH, PAGE_HEIGHT]), y: PAGE_HEIGHT - MARGIN };

  const ordered = [...packet.documents].sort((left, right) => left.order - right.order);
  ordered.forEach((entry, index) => {
    if (index > 0) pageBreak(cursor, document);
    drawDocument(cursor, document, fonts, entry);
  });

  drawProvenanceFooter(cursor, document, fonts, packet);

  const bytes = await document.save({ useObjectStreams: false });
  return Buffer.from(bytes);
}

export function gradeAPacketFilename(packet: GradeAPacket): string {
  const slug = packet.routeKey.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug || "legalease"}-packet.pdf`;
}

function drawDocument(cursor: Cursor, document: PDFDocument, fonts: Fonts, entry: GradeADocument) {
  kicker(cursor, document, fonts, entry.outputStrategy === "custom_pleading" ? "Court document" : "Instructions");
  title(cursor, document, fonts, entry.title);
  for (const block of entry.blocks) drawBlock(cursor, document, fonts, block);
}

function drawBlock(cursor: Cursor, document: PDFDocument, fonts: Fonts, block: GradeABlock) {
  switch (block.kind) {
    case "heading":
      heading(cursor, document, fonts, block.text);
      return;
    case "paragraph":
      paragraph(cursor, document, fonts, block.text);
      return;
    case "labelled":
      labelled(cursor, document, fonts, block.label, block.value);
      return;
    case "bulleted":
      for (const item of block.items) paragraph(cursor, document, fonts, `- ${item}`, { indent: 12 });
      space(cursor, 4);
      return;
    case "numbered":
      block.items.forEach((item, index) => paragraph(cursor, document, fonts, `${index + 1}. ${item}`, { indent: 12 }));
      space(cursor, 4);
      return;
    case "signature":
      signature(cursor, document, fonts, block);
      return;
    case "rule":
      horizontalRule(cursor, document);
      return;
  }
}

function signature(
  cursor: Cursor,
  document: PDFDocument,
  fonts: Fonts,
  block: Extract<GradeABlock, { kind: "signature" }>
) {
  space(cursor, 8);
  for (const line of block.lines) {
    ensure(cursor, document, 34);
    cursor.page.drawLine({
      start: { x: MARGIN, y: cursor.y },
      end: { x: MARGIN + 260, y: cursor.y },
      thickness: 0.75,
      color: INK
    });
    cursor.y -= 12;
    cursor.page.drawText(sanitize(line), { x: MARGIN, y: cursor.y, size: 8, font: fonts.body, color: MUTED });
    cursor.y -= 18;
  }
  if (block.label) labelled(cursor, document, fonts, "Printed name", block.label);
  paragraph(cursor, document, fonts, block.note, { color: MUTED, size: 9 });
}

function drawProvenanceFooter(cursor: Cursor, document: PDFDocument, fonts: Fonts, packet: GradeAPacket) {
  // The packet says what it was built from. A participant who comes back with a
  // question, and anyone reviewing a complaint about one of these, can tell
  // exactly which specification produced the pages in their hand.
  pageBreak(cursor, document);
  kicker(cursor, document, fonts, "About this packet");
  title(cursor, document, fonts, packet.packetFamilyLabel);
  labelled(cursor, document, fonts, "Route", packet.routeKey);
  labelled(cursor, document, fonts, "Packet specification", `${packet.specificationId} v${packet.specificationVersion}`);
  labelled(cursor, document, fonts, "Prepared from verification", packet.verificationHash);
  paragraph(cursor, document, fonts,
    "This packet was prepared from the answers you confirmed at final verification. If any of those answers change, "
    + "the packet has to be prepared again — a filing built on a superseded answer is worse than no filing.",
    { color: MUTED, size: 9 });
}

function kicker(cursor: Cursor, document: PDFDocument, fonts: Fonts, text: string) {
  ensure(cursor, document, 24);
  cursor.page.drawText(sanitize(text.toUpperCase()), { x: MARGIN, y: cursor.y, size: 8, font: fonts.bold, color: MUTED });
  cursor.y -= 16;
}

function title(cursor: Cursor, document: PDFDocument, fonts: Fonts, text: string) {
  for (const line of wrap(sanitize(text), fonts.bold, 19, CONTENT_WIDTH)) {
    ensure(cursor, document, 25);
    cursor.page.drawText(line, { x: MARGIN, y: cursor.y, size: 19, font: fonts.bold, color: INK });
    cursor.y -= 24;
  }
  cursor.y -= 6;
}

function heading(cursor: Cursor, document: PDFDocument, fonts: Fonts, text: string) {
  ensure(cursor, document, 30);
  cursor.page.drawText(sanitize(text), { x: MARGIN, y: cursor.y, size: 12, font: fonts.bold, color: INK });
  cursor.y -= 19;
}

function paragraph(
  cursor: Cursor,
  document: PDFDocument,
  fonts: Fonts,
  text: string,
  options: { color?: ReturnType<typeof rgb>; size?: number; indent?: number } = {}
) {
  const size = options.size ?? BODY_SIZE;
  const indent = options.indent ?? 0;
  const leading = size + 4.5;
  for (const line of wrap(sanitize(text), fonts.body, size, CONTENT_WIDTH - indent)) {
    ensure(cursor, document, leading);
    cursor.page.drawText(line, { x: MARGIN + indent, y: cursor.y, size, font: fonts.body, color: options.color ?? INK });
    cursor.y -= leading;
  }
  cursor.y -= 3;
}

function labelled(cursor: Cursor, document: PDFDocument, fonts: Fonts, label: string, value: string) {
  ensure(cursor, document, BODY_LEADING * 2);
  cursor.page.drawText(sanitize(label.toUpperCase()), { x: MARGIN, y: cursor.y, size: 7.5, font: fonts.bold, color: MUTED });
  cursor.y -= 12;
  for (const line of wrap(sanitize(value), fonts.body, BODY_SIZE, CONTENT_WIDTH)) {
    ensure(cursor, document, BODY_LEADING);
    cursor.page.drawText(line, { x: MARGIN, y: cursor.y, size: BODY_SIZE, font: fonts.body, color: INK });
    cursor.y -= BODY_LEADING;
  }
  cursor.y -= 4;
}

function horizontalRule(cursor: Cursor, document: PDFDocument) {
  ensure(cursor, document, 14);
  cursor.page.drawLine({
    start: { x: MARGIN, y: cursor.y + 4 },
    end: { x: PAGE_WIDTH - MARGIN, y: cursor.y + 4 },
    thickness: 0.75,
    color: RULE
  });
  cursor.y -= 12;
}

function space(cursor: Cursor, amount: number) {
  cursor.y -= amount;
}

function pageBreak(cursor: Cursor, document: PDFDocument) {
  cursor.page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  cursor.y = PAGE_HEIGHT - MARGIN;
}

function ensure(cursor: Cursor, document: PDFDocument, needed: number) {
  if (cursor.y - needed < MARGIN) pageBreak(cursor, document);
}

/**
 * Greedy wrap on measured width. A token longer than the line — a long case
 * number, a verification hash — is split by character so nothing is drawn past
 * the right margin and silently clipped.
 */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
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
    let chunk = "";
    for (const character of word) {
      if (font.widthOfTextAtSize(chunk + character, size) > maxWidth) {
        lines.push(chunk);
        chunk = character;
      } else {
        chunk += character;
      }
    }
    current = chunk;
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

/**
 * The standard fonts encode WinAnsi only. Curly quotes and dashes are folded to
 * their ASCII equivalents and anything still outside the range is dropped, so a
 * stray character can never throw mid-render and fail a participant's download.
 */
function sanitize(value: string) {
  return String(value ?? "")
    .replaceAll("‘", "'")
    .replaceAll("’", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("…", "...")
    .replaceAll(" ", " ")
    .replace(/[^\x20-\x7E¡-ÿ]/g, "");
}
