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
export const GRADE_A_RENDERER_VERSION = "2.0.0";
export const GRADE_A_CONTENT_TYPE = "application/pdf";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const INK = rgb(0.06, 0.13, 0.22);
const MUTED = rgb(0.36, 0.41, 0.46);
const RULE = rgb(0.85, 0.89, 0.93);

type Fonts = { body: PDFFont; bold: PDFFont };
type Cursor = { page: PDFPage; y: number };
type PleadingFonts = Fonts & { pleadingBody: PDFFont; pleadingBold: PDFFont; pleadingItalic: PDFFont };
type GuidanceLayout = {
  bodySize: number;
  bodyLeading: number;
  keepBlocksTogether: boolean;
};
type PleadingContext = {
  court: string;
  caseNumber: string;
  title: string;
  pageNumber: number;
  confidential: boolean;
};

const PLEADING_MARGIN = 72;
const PLEADING_CONTENT_WIDTH = PAGE_WIDTH - PLEADING_MARGIN * 2;
const PLEADING_BODY_SIZE = 12;
const PLEADING_LEADING = 18;
const LEGACY_GUIDANCE_LAYOUT: GuidanceLayout = {
  bodySize: 10.5,
  bodyLeading: 15,
  keepBlocksTogether: false
};
const MS_REVISION_GUIDANCE_LAYOUT: GuidanceLayout = {
  bodySize: 10,
  bodyLeading: 14.5,
  keepBlocksTogether: true
};

export async function renderGradeAPacketPdf(packet: GradeAPacket): Promise<Buffer> {
  if (packet.documents.length === 0) {
    throw new Error("Refusing to render an empty packet. A zero-document PDF is a receipt, not a filing packet.");
  }

  const document = await PDFDocument.create();
  document.setTitle(packet.packetFamilyLabel);
  document.setProducer("LegalEase Grade-A packet renderer");
  document.setCreator("LegalEase");
  /**
   * The document's dates are the matter's verification time, not now.
   *
   * pdf-lib stamps the current clock into CreationDate and ModDate by default,
   * which makes every render of the same packet a different file. That is fatal
   * for a fulfillment record that pins an artifact hash: the hash would name a
   * moment rather than a packet, and a participant re-downloading would get
   * bytes that no longer match what was vouched for. Binding both dates to the
   * verification makes the artifact a pure function of its inputs.
   */
  const verifiedAt = new Date(packet.verifiedAt);
  const stamp = Number.isNaN(verifiedAt.getTime()) ? new Date(0) : verifiedAt;
  document.setCreationDate(stamp);
  document.setModificationDate(stamp);

  const fonts: Fonts = {
    body: await document.embedFont(StandardFonts.Helvetica),
    bold: await document.embedFont(StandardFonts.HelveticaBold)
  };

  const ordered = [...packet.documents].sort((left, right) => left.order - right.order);
  const hasPleading = ordered.some((entry) => entry.presentation === "pleading");
  const pleadingFonts: PleadingFonts | null = hasPleading
    ? {
        ...fonts,
        pleadingBody: await document.embedFont(StandardFonts.TimesRoman),
        pleadingBold: await document.embedFont(StandardFonts.TimesRomanBold),
        pleadingItalic: await document.embedFont(StandardFonts.TimesRomanItalic)
      }
    : null;
  const cursor: Cursor = { page: document.addPage([PAGE_WIDTH, PAGE_HEIGHT]), y: PAGE_HEIGHT - MARGIN };
  const guidanceLayout = packet.routeKey === "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal"
    && packet.specificationVersion === "2.0.0"
    ? MS_REVISION_GUIDANCE_LAYOUT
    : LEGACY_GUIDANCE_LAYOUT;
  ordered.forEach((entry, index) => {
    if (index > 0) pageBreak(cursor, document);
    if (entry.presentation === "pleading") {
      if (!pleadingFonts) throw new Error(`Pleading fonts were not loaded for ${entry.documentId}.`);
      drawPleadingDocument(cursor, document, pleadingFonts, entry);
    } else {
      drawDocument(cursor, document, fonts, entry, guidanceLayout);
    }
  });

  drawProvenanceFooter(cursor, document, fonts, packet, guidanceLayout);

  const bytes = await document.save({ useObjectStreams: false });
  return Buffer.from(bytes);
}

export function gradeAPacketFilename(packet: GradeAPacket): string {
  const slug = packet.routeKey.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug || "legalease"}-packet.pdf`;
}

function drawPleadingDocument(
  cursor: Cursor,
  document: PDFDocument,
  fonts: PleadingFonts,
  entry: GradeADocument
) {
  const caption = entry.blocks.find(
    (block): block is Extract<GradeABlock, { kind: "pleading_caption" }> => block.kind === "pleading_caption"
  );
  if (!caption) throw new Error(`Pleading document ${entry.documentId} has no pleading caption.`);

  const context: PleadingContext = {
    court: caption.court,
    caseNumber: caption.caseNumber,
    title: caption.title,
    pageNumber: 1,
    confidential: false
  };
  cursor.y = PAGE_HEIGHT - PLEADING_MARGIN;
  drawPleadingFooter(cursor.page, fonts, context);

  for (const block of entry.blocks) {
    switch (block.kind) {
      case "pleading_caption":
        drawPleadingCaption(cursor, document, fonts, context, block);
        break;
      case "pleading_paragraph":
        drawPleadingParagraph(cursor, document, fonts, context, block.text, block.number);
        break;
      case "pleading_identity_list":
        drawPleadingIdentityList(cursor, document, fonts, context, block);
        break;
      case "pleading_signature":
        drawPleadingSignature(cursor, document, fonts, context, block);
        break;
      case "notary_verification":
        drawNotaryVerification(cursor, document, fonts, context, block);
        break;
      case "service_certificate":
        drawServiceCertificate(cursor, document, fonts, context, block);
        break;
      case "official_signature":
        drawOfficialSignature(cursor, document, fonts, context, block);
        break;
      case "confidential_identifier_addendum":
        context.title = block.title;
        context.confidential = true;
        pleadingPageBreak(cursor, document, fonts, context);
        drawConfidentialAddendum(cursor, document, fonts, context, block);
        break;
      default:
        throw new Error(`Pleading document ${entry.documentId} contains unsupported block ${block.kind}.`);
    }
  }
}

function drawPleadingCaption(
  cursor: Cursor,
  document: PDFDocument,
  fonts: PleadingFonts,
  context: PleadingContext,
  block: Extract<GradeABlock, { kind: "pleading_caption" }>
) {
  ensurePleading(cursor, document, fonts, context, 245);
  cursor.y = drawCenteredWrapped(
    cursor.page,
    fonts.pleadingBold,
    sanitize(block.court.toUpperCase()),
    PLEADING_BODY_SIZE,
    PLEADING_CONTENT_WIDTH,
    cursor.y,
    PLEADING_LEADING
  ) - 36;

  const leftWidth = 290;
  const plaintiffLines = wrap(sanitize(block.plaintiff.toUpperCase()), fonts.pleadingBold, 12, leftWidth);
  for (const line of plaintiffLines) {
    cursor.page.drawText(line, {
      x: PLEADING_MARGIN,
      y: cursor.y,
      size: 12,
      font: fonts.pleadingBold,
      color: INK
    });
    cursor.y -= PLEADING_LEADING;
  }
  cursor.page.drawText("PLAINTIFF", {
    x: PAGE_WIDTH - PLEADING_MARGIN - fonts.pleadingBold.widthOfTextAtSize("PLAINTIFF", 12),
    y: cursor.y + PLEADING_LEADING,
    size: 12,
    font: fonts.pleadingBold,
    color: INK
  });
  cursor.y -= 18;
  cursor.page.drawText("VS.", { x: PLEADING_MARGIN, y: cursor.y, size: 12, font: fonts.pleadingBold, color: INK });
  const caseLabel = `CASE NO. ${sanitize(block.caseNumber)}`;
  cursor.page.drawText(caseLabel, {
    x: PAGE_WIDTH - PLEADING_MARGIN - fonts.pleadingBold.widthOfTextAtSize(caseLabel, 12),
    y: cursor.y,
    size: 12,
    font: fonts.pleadingBold,
    color: INK
  });
  cursor.y -= 36;

  const defendantLines = wrap(sanitize(block.defendant.toUpperCase()), fonts.pleadingBold, 12, leftWidth);
  for (const line of defendantLines) {
    cursor.page.drawText(line, {
      x: PLEADING_MARGIN,
      y: cursor.y,
      size: 12,
      font: fonts.pleadingBold,
      color: INK
    });
    cursor.y -= PLEADING_LEADING;
  }
  const defendantRole = sanitize((block.defendantRole ?? "DEFENDANT/PETITIONER").toUpperCase());
  cursor.page.drawText(defendantRole, {
    x: PAGE_WIDTH - PLEADING_MARGIN - fonts.pleadingBold.widthOfTextAtSize(defendantRole, 12),
    y: cursor.y + PLEADING_LEADING,
    size: 12,
    font: fonts.pleadingBold,
    color: INK
  });
  cursor.y -= 30;
  cursor.y = drawCenteredWrapped(
    cursor.page,
    fonts.pleadingBold,
    sanitize(block.title),
    13,
    PLEADING_CONTENT_WIDTH,
    cursor.y,
    18
  );
  const titleWidth = Math.min(fonts.pleadingBold.widthOfTextAtSize(sanitize(block.title), 13), PLEADING_CONTENT_WIDTH);
  cursor.page.drawLine({
    start: { x: (PAGE_WIDTH - titleWidth) / 2, y: cursor.y + 14 },
    end: { x: (PAGE_WIDTH + titleWidth) / 2, y: cursor.y + 14 },
    thickness: 0.7,
    color: INK
  });
  cursor.y -= 24;
}

function drawPleadingParagraph(
  cursor: Cursor,
  document: PDFDocument,
  fonts: PleadingFonts,
  context: PleadingContext,
  text: string,
  number?: string
) {
  ensurePleading(cursor, document, fonts, context, number ? 58 : 40);
  if (number) {
    const width = fonts.pleadingBold.widthOfTextAtSize(number, 12);
    cursor.page.drawText(number, {
      x: (PAGE_WIDTH - width) / 2,
      y: cursor.y,
      size: 12,
      font: fonts.pleadingBold,
      color: INK
    });
    cursor.y -= 24;
  }
  drawPleadingText(cursor, document, fonts, context, text, { firstLineIndent: 36 });
  cursor.y -= 9;
}

function drawPleadingIdentityList(
  cursor: Cursor,
  document: PDFDocument,
  fonts: PleadingFonts,
  context: PleadingContext,
  block: Extract<GradeABlock, { kind: "pleading_identity_list" }>
) {
  if (block.number) {
    ensurePleading(cursor, document, fonts, context, 58);
    const width = fonts.pleadingBold.widthOfTextAtSize(block.number, 12);
    cursor.page.drawText(block.number, {
      x: (PAGE_WIDTH - width) / 2,
      y: cursor.y,
      size: 12,
      font: fonts.pleadingBold,
      color: INK
    });
    cursor.y -= 24;
  } else if (block.introduction) {
    ensurePleading(cursor, document, fonts, context, 52);
  }
  if (block.introduction) {
    drawPleadingText(cursor, document, fonts, context, block.introduction, { firstLineIndent: 36 });
    cursor.y -= 8;
  }
  block.items.forEach((item, index) => {
    const letter = String.fromCharCode(97 + index);
    drawPleadingText(cursor, document, fonts, context, `(${letter}) ${item.label}: ${item.value}`, { indent: 24 });
    cursor.y -= 3;
  });
  cursor.y -= 8;
}

function drawPleadingSignature(
  cursor: Cursor,
  document: PDFDocument,
  fonts: PleadingFonts,
  context: PleadingContext,
  block: Extract<GradeABlock, { kind: "pleading_signature" }>
) {
  ensurePleading(cursor, document, fonts, context, 205);
  drawPleadingText(cursor, document, fonts, context, block.heading);
  cursor.y -= 18;
  drawPleadingText(cursor, document, fonts, context, block.role, { font: fonts.pleadingBold });
  cursor.y -= 28;
  drawBlankLine(cursor, fonts, 280);
  drawPleadingText(cursor, document, fonts, context, block.name.toUpperCase());
  for (const line of block.contactLines) drawPleadingText(cursor, document, fonts, context, line);
  cursor.y -= 12;
}

function drawNotaryVerification(
  cursor: Cursor,
  document: PDFDocument,
  fonts: PleadingFonts,
  context: PleadingContext,
  block: Extract<GradeABlock, { kind: "notary_verification" }>
) {
  ensurePleading(cursor, document, fonts, context, 390);
  cursor.y = drawCenteredWrapped(
    cursor.page,
    fonts.pleadingBold,
    sanitize(block.title),
    13,
    PLEADING_CONTENT_WIDTH,
    cursor.y,
    18
  ) - 18;
  drawPleadingText(cursor, document, fonts, context, block.statement, { firstLineIndent: 36 });
  cursor.y -= 20;
  drawBlankLine(cursor, fonts, 280);
  drawPleadingText(cursor, document, fonts, context, `${block.participantName.toUpperCase()}, PETITIONER PRO SE`);
  cursor.y -= 16;
  drawPleadingText(cursor, document, fonts, context, block.venueState, { font: fonts.pleadingBold });
  drawPleadingText(cursor, document, fonts, context, "COUNTY OF ______________________________", { font: fonts.pleadingBold });
  cursor.y -= 12;
  drawPleadingText(cursor, document, fonts, context,
    block.jurat,
    { firstLineIndent: 36 });
  cursor.y -= 24;
  drawBlankLine(cursor, fonts, 280);
  drawPleadingText(cursor, document, fonts, context, "NOTARY PUBLIC", { font: fonts.pleadingBold });
  drawPleadingText(cursor, document, fonts, context, "Printed Name: ______________________________");
  drawPleadingText(cursor, document, fonts, context, "My Commission Expires: ____________________");
  drawPleadingText(cursor, document, fonts, context, "Commission Identification No.: _____________");
  drawPleadingText(cursor, document, fonts, context, "[OFFICIAL NOTARY STAMP]", { font: fonts.pleadingBold });
  cursor.y -= 12;
}

function drawServiceCertificate(
  cursor: Cursor,
  document: PDFDocument,
  fonts: PleadingFonts,
  context: PleadingContext,
  block: Extract<GradeABlock, { kind: "service_certificate" }>
) {
  drawPleadingText(cursor, document, fonts, context, block.statement, { firstLineIndent: 36 });
  cursor.y -= 18;
  drawPleadingText(cursor, document, fonts, context, "Method of service: __________________________________________");
  drawPleadingText(cursor, document, fonts, context, "Date of service: _____________________________________________");
  cursor.y -= 26;
  drawBlankLine(cursor, fonts, 280);
  drawPleadingText(cursor, document, fonts, context, `${block.participantName.toUpperCase()}, PETITIONER PRO SE`);
  cursor.y -= 12;
}

function drawOfficialSignature(
  cursor: Cursor,
  document: PDFDocument,
  fonts: PleadingFonts,
  context: PleadingContext,
  block: Extract<GradeABlock, { kind: "official_signature" }>
) {
  ensurePleading(cursor, document, fonts, context, 155);
  if (block.title.trim()) {
    drawPleadingText(cursor, document, fonts, context, block.title, { font: fonts.pleadingBold });
  }
  if (block.note) drawPleadingText(cursor, document, fonts, context, block.note, { font: fonts.pleadingItalic });
  cursor.y -= 24;
  drawBlankLine(cursor, fonts, 280);
  drawPleadingText(cursor, document, fonts, context, block.role, { font: fonts.pleadingBold });
  if (/CLERK$/.test(block.role)) {
    drawPleadingText(cursor, document, fonts, context, "Date: ______________________________");
    drawPleadingText(cursor, document, fonts, context, "[COURT SEAL]", { font: fonts.pleadingBold });
  }
  cursor.y -= 12;
}

function drawConfidentialAddendum(
  cursor: Cursor,
  document: PDFDocument,
  fonts: PleadingFonts,
  context: PleadingContext,
  block: Extract<GradeABlock, { kind: "confidential_identifier_addendum" }>
) {
  cursor.y = drawCenteredWrapped(
    cursor.page,
    fonts.pleadingBold,
    sanitize(block.title),
    14,
    PLEADING_CONTENT_WIDTH,
    cursor.y,
    19
  ) - 16;
  drawPleadingText(cursor, document, fonts, context, block.warning, { font: fonts.pleadingBold });
  cursor.y -= 12;
  block.items.forEach((item) => {
    drawPleadingText(cursor, document, fonts, context, `${item.label}: ${item.value}`, { indent: 18 });
    cursor.y -= 3;
  });
}

function drawPleadingText(
  cursor: Cursor,
  document: PDFDocument,
  fonts: PleadingFonts,
  context: PleadingContext,
  text: string,
  options: { indent?: number; firstLineIndent?: number; font?: PDFFont } = {}
) {
  const indent = options.indent ?? 0;
  const firstLineIndent = options.firstLineIndent ?? 0;
  const font = options.font ?? fonts.pleadingBody;
  const lines = wrap(sanitize(text), font, PLEADING_BODY_SIZE, PLEADING_CONTENT_WIDTH - indent - firstLineIndent);
  lines.forEach((line, index) => {
    ensurePleading(cursor, document, fonts, context, PLEADING_LEADING);
    cursor.page.drawText(line, {
      x: PLEADING_MARGIN + indent + (index === 0 ? firstLineIndent : 0),
      y: cursor.y,
      size: PLEADING_BODY_SIZE,
      font,
      color: INK
    });
    cursor.y -= PLEADING_LEADING;
  });
}

function drawBlankLine(cursor: Cursor, fonts: PleadingFonts, width: number) {
  cursor.page.drawLine({
    start: { x: PLEADING_MARGIN, y: cursor.y },
    end: { x: PLEADING_MARGIN + width, y: cursor.y },
    thickness: 0.7,
    color: INK
  });
  cursor.y -= fonts.pleadingBody.heightAtSize(PLEADING_BODY_SIZE) + 7;
}

function ensurePleading(
  cursor: Cursor,
  document: PDFDocument,
  fonts: PleadingFonts,
  context: PleadingContext,
  needed: number
) {
  if (cursor.y - needed < PLEADING_MARGIN) pleadingPageBreak(cursor, document, fonts, context);
}

function pleadingPageBreak(
  cursor: Cursor,
  document: PDFDocument,
  fonts: PleadingFonts,
  context: PleadingContext
) {
  cursor.page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  context.pageNumber += 1;
  drawPleadingFooter(cursor.page, fonts, context);
  const court = sanitize(context.court);
  const caseLabel = `CASE NO. ${sanitize(context.caseNumber)}`;
  const titleText = sanitize(context.title);
  cursor.page.drawText(court, {
    x: PLEADING_MARGIN,
    y: PAGE_HEIGHT - 44,
    size: 8.5,
    font: fonts.pleadingBody,
    color: MUTED
  });
  cursor.page.drawText(caseLabel, {
    x: PLEADING_MARGIN,
    y: PAGE_HEIGHT - 56,
    size: 8.5,
    font: fonts.pleadingBody,
    color: MUTED
  });
  cursor.page.drawText(titleText, {
    x: PAGE_WIDTH - PLEADING_MARGIN - fonts.pleadingItalic.widthOfTextAtSize(titleText, 8.5),
    y: PAGE_HEIGHT - 56,
    size: 8.5,
    font: fonts.pleadingItalic,
    color: MUTED
  });
  cursor.page.drawLine({
    start: { x: PLEADING_MARGIN, y: PAGE_HEIGHT - 64 },
    end: { x: PAGE_WIDTH - PLEADING_MARGIN, y: PAGE_HEIGHT - 64 },
    thickness: 0.5,
    color: RULE
  });
  cursor.y = PAGE_HEIGHT - 86;
}

function drawPleadingFooter(page: PDFPage, fonts: PleadingFonts, context: PleadingContext) {
  const left = context.confidential
    ? "CONFIDENTIAL MCIC PROCESSING COPY - DO NOT SERVE OR PUBLICLY FILE"
    : `CASE NO. ${sanitize(context.caseNumber)}`;
  page.drawText(left, { x: PLEADING_MARGIN, y: 38, size: 8, font: fonts.pleadingBody, color: MUTED });
  const pageLabel = `Page ${context.pageNumber}`;
  page.drawText(pageLabel, {
    x: PAGE_WIDTH - PLEADING_MARGIN - fonts.pleadingBody.widthOfTextAtSize(pageLabel, 8),
    y: 38,
    size: 8,
    font: fonts.pleadingBody,
    color: MUTED
  });
}

function drawCenteredWrapped(
  page: PDFPage,
  font: PDFFont,
  text: string,
  size: number,
  maxWidth: number,
  y: number,
  leading: number
) {
  for (const line of wrap(text, font, size, maxWidth)) {
    page.drawText(line, {
      x: (PAGE_WIDTH - font.widthOfTextAtSize(line, size)) / 2,
      y,
      size,
      font,
      color: INK
    });
    y -= leading;
  }
  return y;
}

function drawDocument(
  cursor: Cursor,
  document: PDFDocument,
  fonts: Fonts,
  entry: GradeADocument,
  layout: GuidanceLayout
) {
  kicker(cursor, document, fonts, entry.outputStrategy === "custom_pleading" ? "Court document" : "Instructions");
  title(cursor, document, fonts, entry.title);
  entry.blocks.forEach((block, index) => {
    // A signature heading stranded at the foot of one page while its lines
    // move to the next is more than ugly: it makes the signing instruction
    // ambiguous. Keep the heading and the whole signature block together.
    if (layout.keepBlocksTogether && block.kind === "heading" && entry.blocks[index + 1]?.kind === "signature") {
      ensure(cursor, document, 150);
    }
    if (
      layout.keepBlocksTogether
      && block.kind === "heading"
      && entry.blocks[index + 1]?.kind === "paragraph"
      && entry.blocks[index + 2]?.kind === "signature"
    ) {
      ensure(cursor, document, 205);
    }
    drawBlock(cursor, document, fonts, block, layout);
  });
}

function drawBlock(
  cursor: Cursor,
  document: PDFDocument,
  fonts: Fonts,
  block: GradeABlock,
  layout: GuidanceLayout
) {
  switch (block.kind) {
    case "heading":
      heading(cursor, document, fonts, block.text);
      return;
    case "paragraph":
      paragraph(cursor, document, fonts, block.text, {}, layout);
      return;
    case "labelled":
      labelled(cursor, document, fonts, block.label, block.value, layout);
      return;
    case "bulleted":
      for (const item of block.items) paragraph(cursor, document, fonts, `- ${item}`, { indent: 12 }, layout);
      space(cursor, 4);
      return;
    case "numbered":
      block.items.forEach((item, index) =>
        paragraph(cursor, document, fonts, `${index + 1}. ${item}`, { indent: 12 }, layout));
      space(cursor, 4);
      return;
    case "signature":
      signature(cursor, document, fonts, block, layout);
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
  block: Extract<GradeABlock, { kind: "signature" }>,
  layout: GuidanceLayout
) {
  if (layout.keepBlocksTogether) ensure(cursor, document, 125);
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
  if (block.label) labelled(cursor, document, fonts, "Printed name", block.label, layout);
  paragraph(cursor, document, fonts, block.note, { color: MUTED, size: 9 }, layout);
}

function drawProvenanceFooter(
  cursor: Cursor,
  document: PDFDocument,
  fonts: Fonts,
  packet: GradeAPacket,
  layout: GuidanceLayout
) {
  // The packet says what it was built from. A participant who comes back with a
  // question, and anyone reviewing a complaint about one of these, can tell
  // exactly which specification produced the pages in their hand.
  pageBreak(cursor, document);
  kicker(cursor, document, fonts, "About this packet");
  title(cursor, document, fonts, packet.packetFamilyLabel);
  labelled(cursor, document, fonts, "Route", packet.routeKey, layout);
  labelled(cursor, document, fonts, "Packet specification", `${packet.specificationId} v${packet.specificationVersion}`, layout);
  labelled(cursor, document, fonts, "Prepared from verification", packet.verificationHash, layout);
  paragraph(cursor, document, fonts,
    "This packet was prepared from the answers you confirmed at final verification. If any of those answers change, "
    + "the packet has to be prepared again — a filing built on a superseded answer is worse than no filing.",
    { color: MUTED, size: 9 }, layout);
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
  options: { color?: ReturnType<typeof rgb>; size?: number; indent?: number } = {},
  layout: GuidanceLayout = LEGACY_GUIDANCE_LAYOUT
) {
  const size = options.size ?? layout.bodySize;
  const indent = options.indent ?? 0;
  const leading = size + 4.5;
  const lines = wrap(sanitize(text), fonts.body, size, CONTENT_WIDTH - indent);
  const paragraphHeight = lines.length * leading + 3;
  if (layout.keepBlocksTogether && paragraphHeight <= PAGE_HEIGHT - MARGIN * 2) {
    ensure(cursor, document, paragraphHeight);
  }
  for (const line of lines) {
    ensure(cursor, document, leading);
    cursor.page.drawText(line, { x: MARGIN + indent, y: cursor.y, size, font: fonts.body, color: options.color ?? INK });
    cursor.y -= leading;
  }
  cursor.y -= 3;
}

function labelled(
  cursor: Cursor,
  document: PDFDocument,
  fonts: Fonts,
  label: string,
  value: string,
  layout: GuidanceLayout = LEGACY_GUIDANCE_LAYOUT
) {
  ensure(cursor, document, layout.bodyLeading * 2);
  cursor.page.drawText(sanitize(label.toUpperCase()), { x: MARGIN, y: cursor.y, size: 7.5, font: fonts.bold, color: MUTED });
  cursor.y -= 12;
  for (const line of wrap(sanitize(value), fonts.body, layout.bodySize, CONTENT_WIDTH)) {
    ensure(cursor, document, layout.bodyLeading);
    cursor.page.drawText(line, { x: MARGIN, y: cursor.y, size: layout.bodySize, font: fonts.body, color: INK });
    cursor.y -= layout.bodyLeading;
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
