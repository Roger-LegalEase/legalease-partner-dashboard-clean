// Browser-free packet renderer.
//
// The previous request path launched Playwright chromium per request, which
// cannot run on the deployed serverless runtime, so every download failed. This
// renderer builds the same packet content with pdf-lib: no browser, no
// subprocess, no outbound network, and it runs identically in a request handler
// and in an isolated worker.
//
// Protected content is never fabricated here. Judicial, clerk, prosecutor,
// notary and agency blocks are emitted as labelled blank space for a human to
// complete, exactly as they appear on the source form.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { userFacingWorkflowGaps } from "@/lib/rcap/documents/filing-next-steps";
import type { RcapDocumentPacket } from "@/lib/rcap/documents/types";

export type RcapPacketPdfType = "full" | "court";

export const PACKET_RENDERER_KIND = "packet_document_v1";
export const PACKET_RENDERER_VERSION = "1.0.0";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BODY_SIZE = 10.5;
const BODY_LEADING = 15;

const INK = rgb(0.06, 0.13, 0.22);
const MUTED = rgb(0.36, 0.41, 0.46);
const RULE = rgb(0.85, 0.89, 0.93);

type Fonts = { body: PDFFont; bold: PDFFont; serif: PDFFont };

type Cursor = { page: PDFPage; y: number };

export async function renderRcapPacketPdf(packet: RcapDocumentPacket, pdfType: RcapPacketPdfType): Promise<Buffer> {
  const document = await PDFDocument.create();
  document.setTitle(`${jurisdictionFor(packet)} Record Relief Packet`);
  document.setProducer("LegalEase packet renderer");
  document.setCreator("LegalEase");

  const fonts: Fonts = {
    body: await document.embedFont(StandardFonts.Helvetica),
    bold: await document.embedFont(StandardFonts.HelveticaBold),
    serif: await document.embedFont(StandardFonts.TimesRoman)
  };

  const cursor: Cursor = { page: document.addPage([PAGE_WIDTH, PAGE_HEIGHT]), y: PAGE_HEIGHT - MARGIN };

  if (pdfType === "full") {
    drawCover(cursor, document, fonts, packet);
    drawGuidancePages(cursor, document, fonts, packet);
  }
  drawCourtPages(cursor, document, fonts, packet, pdfType);

  const bytes = await document.save({ useObjectStreams: false });
  return Buffer.from(bytes);
}

export function rcapPacketPdfFilename(packet: RcapDocumentPacket, pdfType: RcapPacketPdfType) {
  return `${safeFilename([jurisdictionFor(packet), packet.pathway, pdfType, "packet"].filter(Boolean).join(" "))}.pdf`;
}

function drawCover(cursor: Cursor, document: PDFDocument, fonts: Fonts, packet: RcapDocumentPacket) {
  heading(cursor, document, fonts, "Full LegalEase Packet", { kicker: true });
  title(cursor, document, fonts, `${jurisdictionFor(packet)} Record Relief Packet`);
  paragraph(cursor, document, fonts, String(packet.pathway ?? "").replaceAll("_", " "), { color: MUTED, size: 12 });
  space(cursor, 10);

  const facts: Array<[string, string]> = [
    ["Prepared for", preparedFor(packet)],
    ["Prepared date", new Date().toLocaleDateString("en-US")],
    ["Jurisdiction", jurisdictionFor(packet)],
    ["Packet type", "Guided self-help preparation aid"]
  ];
  for (const [label, value] of facts) {
    labelledLine(cursor, document, fonts, label, value);
  }

  space(cursor, 12);
  paragraph(cursor, document, fonts, "Prepared by LegalEase as a guided self-help packet. This is not legal advice.", { color: MUTED });
  pageBreak(cursor, document);
}

function drawGuidancePages(cursor: Cursor, document: PDFDocument, fonts: Fonts, packet: RcapDocumentPacket) {
  const next = packet.filingNextStepsPacket;
  const confirmItems = next.workflowGaps.length > 0
    ? userFacingWorkflowGaps(next.title, next.workflowGaps)
    : ["No unresolved filing details were identified from the preserved workflow instructions."];

  heading(cursor, document, fonts, "Packet summary");
  paragraph(cursor, document, fonts, "This packet includes your draft filing materials, the court-facing pages, filing next steps, fee notes, items to confirm before filing, and the safety disclaimer.");
  space(cursor, 8);

  heading(cursor, document, fonts, "Filing next steps");
  for (const line of String(next.plainText ?? "").split("\n")) {
    if (line.trim()) paragraph(cursor, document, fonts, line, { font: fonts.serif });
    else space(cursor, 6);
  }

  section(cursor, document, fonts, "Fee summary", next.feeSummary);
  section(cursor, document, fonts, "Confirm before filing", confirmItems);
  section(cursor, document, fonts, "Required attachments", next.requiredDocuments);

  heading(cursor, document, fonts, "Safety disclaimer");
  paragraph(cursor, document, fonts, next.safetyDisclaimer);
  pageBreak(cursor, document);
}

function drawCourtPages(cursor: Cursor, document: PDFDocument, fonts: Fonts, packet: RcapDocumentPacket, pdfType: RcapPacketPdfType) {
  heading(cursor, document, fonts, `${jurisdictionFor(packet)} court-facing pages`, { kicker: pdfType === "court" });
  space(cursor, 4);

  for (const [label, value] of courtFacingFields(packet)) {
    labelledLine(cursor, document, fonts, label, value);
  }

  space(cursor, 10);
  heading(cursor, document, fonts, "Statement");
  const statement = String(packet.generatedPlainText ?? "").trim();
  if (statement) {
    for (const line of statement.split("\n")) {
      if (line.trim()) paragraph(cursor, document, fonts, line, { font: fonts.serif });
      else space(cursor, 6);
    }
  } else {
    paragraph(cursor, document, fonts, "No statement text was generated for this packet.", { color: MUTED });
  }

  space(cursor, 16);
  // Protected blocks stay blank. Nothing here is ever pre-filled on the
  // participant's behalf.
  protectedBlock(cursor, document, fonts, "Petitioner signature");
  protectedBlock(cursor, document, fonts, "Date");
  space(cursor, 8);
  paragraph(cursor, document, fonts, "The blocks below are completed by the court, the clerk, the prosecutor or a notary. Leave them blank.", { color: MUTED, size: 9 });
  protectedBlock(cursor, document, fonts, "Clerk use only");
  protectedBlock(cursor, document, fonts, "Order of the court");
}

function courtFacingFields(packet: RcapDocumentPacket): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ["Petitioner", preparedFor(packet)],
    ["County", packet.county ?? ""],
    ["Court", packet.courtName ?? ""],
    ["Cause or case number", packet.causeNumber ?? packet.agencyCaseNumber ?? ""],
    ["Charge", packet.charge ?? ""],
    ["Arrest date", packet.arrestDate ?? ""],
    ["Arresting agency", packet.arrestingAgency ?? ""],
    ["Offense date", packet.offenseDate ?? ""],
    ["Disposition date", packet.dispositionDate ?? ""]
  ];
  return rows.map(([label, value]) => [label, value.trim() ? value : "________________________"]);
}

function section(cursor: Cursor, document: PDFDocument, fonts: Fonts, title: string, items: string[]) {
  if (!items || items.length === 0) return;
  heading(cursor, document, fonts, title);
  for (const item of items) {
    paragraph(cursor, document, fonts, `•  ${item}`, { indent: 8 });
  }
  space(cursor, 6);
}

function protectedBlock(cursor: Cursor, document: PDFDocument, fonts: Fonts, label: string) {
  ensure(cursor, document, 34);
  cursor.y -= 20;
  cursor.page.drawLine({
    start: { x: MARGIN, y: cursor.y },
    end: { x: MARGIN + CONTENT_WIDTH * 0.62, y: cursor.y },
    thickness: 0.75,
    color: RULE
  });
  cursor.y -= 11;
  cursor.page.drawText(sanitize(label), { x: MARGIN, y: cursor.y, size: 8.5, font: fonts.body, color: MUTED });
  cursor.y -= 6;
}

function labelledLine(cursor: Cursor, document: PDFDocument, fonts: Fonts, label: string, value: string) {
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

function title(cursor: Cursor, document: PDFDocument, fonts: Fonts, text: string) {
  for (const line of wrap(sanitize(text), fonts.bold, 22, CONTENT_WIDTH)) {
    ensure(cursor, document, 28);
    cursor.page.drawText(line, { x: MARGIN, y: cursor.y, size: 22, font: fonts.bold, color: INK });
    cursor.y -= 27;
  }
  cursor.y -= 4;
}

function heading(cursor: Cursor, document: PDFDocument, fonts: Fonts, text: string, options: { kicker?: boolean } = {}) {
  const size = options.kicker ? 9 : 13;
  ensure(cursor, document, size + 18);
  cursor.page.drawText(sanitize(options.kicker ? text.toUpperCase() : text), {
    x: MARGIN,
    y: cursor.y,
    size,
    font: fonts.bold,
    color: options.kicker ? MUTED : INK
  });
  cursor.y -= size + 8;
}

function paragraph(
  cursor: Cursor,
  document: PDFDocument,
  fonts: Fonts,
  text: string,
  options: { color?: ReturnType<typeof rgb>; size?: number; font?: PDFFont; indent?: number } = {}
) {
  const size = options.size ?? BODY_SIZE;
  const font = options.font ?? fonts.body;
  const indent = options.indent ?? 0;
  const leading = size + 4.5;
  for (const line of wrap(sanitize(text), font, size, CONTENT_WIDTH - indent)) {
    ensure(cursor, document, leading);
    cursor.page.drawText(line, { x: MARGIN + indent, y: cursor.y, size, font, color: options.color ?? INK });
    cursor.y -= leading;
  }
  cursor.y -= 2;
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
 * Greedy wrap on measured width. A single token longer than the line (a long
 * case number, a URL) is split by character so nothing is ever drawn past the
 * right margin and silently clipped.
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

function jurisdictionFor(packet: RcapDocumentPacket) {
  if (packet.state === "TX") return "Harris County, Texas";
  if (packet.state === "PA") return "Pennsylvania";
  if (packet.state === "DC") return "District of Columbia";
  if (packet.state === "IL") return "Illinois";
  if (packet.state === "MS") return "Mississippi";
  return String(packet.state ?? "");
}

function preparedFor(packet: RcapDocumentPacket) {
  return [packet.petitionerFirstName, packet.petitionerLastName].filter(Boolean).join(" ").trim() || "User";
}

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "legalease-packet";
}
