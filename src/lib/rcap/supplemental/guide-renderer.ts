/**
 * The §7 supplemental participant guide renderer. One renderer, every route.
 *
 * It draws the approved design at
 * `docs/rcap/grade-a/APPROVED_SUPPLEMENTAL_VISUAL_REFERENCE.pdf` — a monochrome
 * four-part guide: a cover carrying the matter, an ordered Next Steps page, a
 * Filing Checklist with a real document table, and a Fees & Costs page with a
 * breakdown and the fee-waiver position.
 *
 * Nothing in here is route-specific. Substance comes from the route's own guide
 * data and from its packet specification; this file holds the shape.
 *
 * WHAT IT WILL NOT DO
 *
 * It never invents a fee, a court address, a filing location or method, a
 * deadline, a waiting period, a copy count, or a notarisation or service
 * requirement. Where a route establishes none of those, the field is `null` and
 * the page says so in terms. A blank cell reads as an oversight; an invented
 * figure reads as fact. Saying "not established for this route" is the only
 * honest third option, and it is the one the participant can act on — by
 * asking the clerk.
 *
 * FOUR THINGS IT HAS TO GET RIGHT
 *
 * 1. EN/ES. The guide says where to file and what to bring, so a Spanish
 *    participant handed an English guide is not a cosmetic gap. A Spanish
 *    render REFUSES an untranslated entry rather than falling back — including
 *    the stop conditions, which are instructions and not decoration.
 *
 * 2. Wrapping and pagination. Every line is measured; content that overflows
 *    continues on a new page carrying the same chrome. Text is never shrunk to
 *    force a page count, and never clipped at the margin.
 *
 * 3. Full versus court-only. A court-only packet is what the clerk receives, so
 *    it carries ZERO supplemental pages. That is a packet-assembly decision,
 *    and `guideBelongsInPacket` is the single place it is decided, so the
 *    assembler skipping the guide and this renderer refusing a court-only
 *    request cannot disagree.
 *
 * 4. KEEP FOR YOUR RECORDS / DO NOT FILE, on guide pages ONLY, including
 *    continuations. Stamping it on a pleading would tell someone not to file
 *    the document they must file, so the court-facing renderer does not know
 *    the string.
 */
import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

import { PAGE_WIDTH, PAGE_HEIGHT, wrap, sanitize, renderGradeAPacketPdf } from "../grade-a/renderer";
import { type GradeAPacket } from "../grade-a/composer";
import {
  type SupplementalGuide,
  type SupplementalGuideEntry,
  type GuideField
} from "./guide-contract";

export const GUIDE_RENDERER_KIND = "rcap_supplemental_guide_v1";
export const GUIDE_RENDERER_VERSION = "2.0.0";

const MARGIN = 46;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
/**
 * Right-aligned text is inset by this much.
 *
 * pdf-lib's `widthOfTextAtSize` sums advance widths; a rasteriser's glyph box
 * includes side bearings, so a run aligned to exactly the margin measures a
 * point or so past it. Nothing is clipped, but "inside the margin" should be
 * true however it is measured, and a fixed inset is cheaper than a tolerance
 * every future check has to remember.
 */
const RIGHT_INSET = 2;

// Monochrome, as the reference is: ink, two greys, and a near-black callout.
const INK = rgb(0.07, 0.07, 0.08);
const MUTED = rgb(0.45, 0.45, 0.48);
const FAINT = rgb(0.72, 0.72, 0.75);
const PANEL = rgb(0.965, 0.965, 0.97);
const CALLOUT = rgb(0.11, 0.11, 0.13);
const PAPER = rgb(1, 1, 1);

const LINE = 13;
const BODY = 9.5;
const LABEL = 6.8;

export type GuideVariant = "full" | "court_only";
export type GuideLocale = "en" | "es";

export type GuideStopCondition = { situation: string; whatItMeans: string; stopAndGetHelp: boolean };

/** The matter panel on the cover. Supplied by the caller, never stored in guide data. */
export type GuideMatter = {
  preparedFor?: string | null;
  preparedOn?: string | null;
  jurisdiction?: string | null;
  courtOrAgency?: string | null;
  caseOrMatter?: string | null;
  remedy?: string | null;
  packetId?: string | null;
};

/** A court-facing component, as the specification names it. */
export type GuideDocument = { documentId: string; title: string };

export type GuideRenderOptions = {
  locale?: GuideLocale;
  variant?: GuideVariant;
  matter?: GuideMatter;
  /** Court-facing components, from the packet specification. */
  documents?: ReadonlyArray<GuideDocument>;
  /** From the specification's `hearingAndObjectionStops`. Never stored in guide data. */
  stops?: ReadonlyArray<GuideStopCondition>;
  /** Spanish for the stop conditions, keyed by situation. */
  stopsEs?: Readonly<Record<string, { situation: string; whatItMeans: string }>>;
  verifiedAt?: string;
  /**
   * Render without the brand asset instead of refusing.
   *
   * For internal tooling running outside a tree that carries
   * `data/record-clearing/brand/`. Participant delivery never sets it.
   */
  allowMissingBrandAsset?: boolean;
};

/**
 * Whether a packet of this shape carries the guide at all.
 *
 * The packet assembler asks this and skips the guide when it is false; it does
 * NOT call the renderer and catch a refusal, because a court-only packet must
 * succeed with zero guide pages rather than fail. The standalone renderer
 * refuses the same request because there is no such document to hand back.
 */
export function guideBelongsInPacket(variant: GuideVariant): boolean {
  return variant === "full";
}

export class SupplementalGuideRenderError extends Error {
  readonly routeKey: string;
  constructor(routeKey: string, message: string) {
    super(`Cannot render the participant guide for ${routeKey}: ${message}`);
    this.name = "SupplementalGuideRenderError";
    this.routeKey = routeKey;
  }
}

type Words = {
  eyebrow: string; banner: string; title: string; subtitle: string;
  preparedFor: string; preparedOn: string; jurisdiction: string; courtOrAgency: string;
  caseOrMatter: string; remedy: string; whatIsInside: string;
  inside: ReadonlyArray<{ title: string; description: string }>;
  important: string; importantBody: string;
  nextSteps: string; nextStepsLead: string;
  whereToFile: string; filingMethod: string; deadline: string; nextEvent: string;
  checklist: string; checklistLead: string; documentCheck: string;
  colDocument: string; colSigned: string; colCopies: string; colAttach: string;
  fees: string; feesLead: string; estimate: string; lastVerified: string; officialSource: string;
  breakdown: string; colItem: string; colAmount: string; colWhen: string;
  waiver: string; availability: string; formOrProcess: string; whereToSubmit: string;
  stops: string; notEstablished: string;
  /**
   * The fallback for a slot whose answer is a DATE we do not hold.
   *
   * `notEstablished` is a sentence about the route -- "ask the clerk or filing
   * office" -- and it was printed in the Last verified half of a cell whose
   * other half already names the official source. Wyoming showed what that
   * costs: a $300.00 filing fee on the left, and beside it a cell opening "Not
   * established for this route - ask the clerk". The label says the two halves
   * are different facts; the sentence reads as if the fee were in doubt. A
   * missing verification date is not a route with nothing established, and it
   * does not send anyone anywhere, so it says so in two words.
   */
  notRecorded: string;
  footerBrand: string;
  guideOf: (n: number, total: number) => string;
};

const COPY: Record<GuideLocale, Words> = {
  en: {
    eyebrow: "EXPUNGEMENT.AI  /  SUPPLEMENTAL GUIDE",
    banner: "KEEP FOR YOUR RECORDS  /  DO NOT FILE",
    title: "Your record-clearing packet",
    subtitle: "A clear guide to what is included, what you need to do next, and what to keep for your records.",
    preparedFor: "PREPARED FOR", preparedOn: "PREPARED ON",
    jurisdiction: "JURISDICTION", courtOrAgency: "COURT / AGENCY",
    caseOrMatter: "CASE / MATTER", remedy: "REMEDY",
    whatIsInside: "WHAT IS INSIDE",
    inside: [
      { title: "Next steps", description: "Where to go, what to do, and what happens after filing." },
      { title: "Filing checklist", description: "A final quality-control list before, during, and after filing." },
      { title: "Fees & costs", description: "Known court or agency fees, payment details, and fee-waiver information." },
      { title: "Court-ready documents", description: "Your forms, pleadings, motions, orders, and attachments begin after this guide." }
    ],
    important: "IMPORTANT",
    importantBody: "These supplemental pages are for you. Do not file or submit them to the clerk or court. "
      + "File only the court-facing documents identified in your packet instructions.",
    nextSteps: "Next steps",
    nextStepsLead: "Only the steps that apply to your route appear here.",
    whereToFile: "WHERE TO FILE", filingMethod: "FILING METHOD",
    deadline: "DEADLINE", nextEvent: "NEXT EVENT",
    checklist: "Filing checklist",
    checklistLead: "Use this page as your final quality-control check.",
    documentCheck: "DOCUMENT CHECK",
    colDocument: "COURT-FACING DOCUMENT", colSigned: "SIGNED?", colCopies: "COPIES", colAttach: "ATTACH / FILE?",
    fees: "Fees & costs",
    feesLead: "Separate the cost of your Expungement.ai packet from court, agency, service, certification, "
      + "and other third-party costs that may apply to your filing.",
    estimate: "ESTIMATED OUT-OF-POCKET FILING COST",
    lastVerified: "Last verified", officialSource: "Official source",
    breakdown: "FEE BREAKDOWN",
    colItem: "ITEM", colAmount: "AMOUNT", colWhen: "WHEN / HOW PAID",
    waiver: "FEE WAIVER / INDIGENCY",
    availability: "AVAILABILITY", formOrProcess: "FORM / PROCESS", whereToSubmit: "WHERE TO SUBMIT",
    stops: "WHEN TO STOP AND GET HELP",
    notEstablished: "Not established for this route — ask the clerk or filing office.",
    notRecorded: "Not recorded",
    footerBrand: "Expungement.ai by LegalEase",
    guideOf: (n: number, total: number) => `GUIDE ${n} OF ${total}`
  },
  es: {
    eyebrow: "EXPUNGEMENT.AI  /  GUÍA COMPLEMENTARIA",
    banner: "CONSERVE ESTE DOCUMENTO  /  NO LO PRESENTE",
    title: "Su paquete para limpiar antecedentes",
    subtitle: "Una guía clara sobre lo que incluye, lo que debe hacer a continuación y lo que debe conservar.",
    preparedFor: "PREPARADO PARA", preparedOn: "PREPARADO EL",
    jurisdiction: "JURISDICCIÓN", courtOrAgency: "TRIBUNAL / AGENCIA",
    caseOrMatter: "CASO / ASUNTO", remedy: "REMEDIO",
    whatIsInside: "QUÉ CONTIENE",
    inside: [
      { title: "Pasos siguientes", description: "Adónde ir, qué hacer y qué ocurre después de presentar." },
      { title: "Lista de verificación", description: "Una revisión final antes, durante y después de presentar." },
      { title: "Tarifas y costos", description: "Tarifas del tribunal o agencia, pagos e información sobre exención." },
      { title: "Documentos para el tribunal", description: "Sus formularios, escritos, mociones y órdenes comienzan después de esta guía." }
    ],
    important: "IMPORTANTE",
    importantBody: "Estas páginas complementarias son para usted. No las presente ante el secretario ni el tribunal. "
      + "Presente únicamente los documentos dirigidos al tribunal que se identifican en sus instrucciones.",
    nextSteps: "Pasos siguientes",
    nextStepsLead: "Aquí aparecen únicamente los pasos que corresponden a su trámite.",
    whereToFile: "DÓNDE PRESENTAR", filingMethod: "MÉTODO",
    deadline: "PLAZO", nextEvent: "PRÓXIMO EVENTO",
    checklist: "Lista de verificación",
    checklistLead: "Use esta página como su revisión final de calidad.",
    documentCheck: "REVISIÓN DE DOCUMENTOS",
    colDocument: "DOCUMENTO PARA EL TRIBUNAL", colSigned: "¿FIRMADO?", colCopies: "COPIAS", colAttach: "¿ADJUNTAR / PRESENTAR?",
    fees: "Tarifas y costos",
    feesLead: "Separe el costo de su paquete de Expungement.ai de los costos del tribunal, la agencia, "
      + "la notificación, las certificaciones y otros terceros.",
    estimate: "COSTO ESTIMADO DE PRESENTACIÓN",
    lastVerified: "Verificado por última vez", officialSource: "Fuente oficial",
    breakdown: "DESGLOSE DE TARIFAS",
    colItem: "CONCEPTO", colAmount: "MONTO", colWhen: "CUÁNDO / CÓMO SE PAGA",
    waiver: "EXENCIÓN DE TARIFAS / INDIGENCIA",
    availability: "DISPONIBILIDAD", formOrProcess: "FORMULARIO / PROCESO", whereToSubmit: "DÓNDE PRESENTARLO",
    stops: "CUÁNDO DETENERSE Y BUSCAR AYUDA",
    notEstablished: "No establecido para este trámite — pregunte al secretario u oficina de presentación.",
    notRecorded: "No registrado",
    footerBrand: "Expungement.ai by LegalEase",
    guideOf: (n: number, total: number) => `GUÍA ${n} DE ${total}`
  }
};

type Fonts = { body: PDFFont; bold: PDFFont; italic: PDFFont };

type Sheet = {
  document: PDFDocument;
  fonts: Fonts;
  locale: GuideLocale;
  words: Words;
  logo: PDFImage | null;
  matter: GuideMatter;
  pages: PDFPage[];
  page: PDFPage;
  y: number;
};

const LOGO_RELATIVE = "data/record-clearing/brand/legalease-logo.png";

/**
 * The wordmark.
 *
 * IT USED TO BE TOLERANT, AND THAT WAS THE DEFECT
 *
 * The earlier comment here read: "a participant's packet must not fail to
 * render because a brand file is not on disk in some deployment." The
 * deployment it was protecting against turned out to be the real one. The
 * render worker's image carried no `data/record-clearing/brand/`, so every
 * guide it produced would have fallen back to a "LEGALEASE" string drawn in
 * Helvetica -- on the participant's delivered packet, with nothing logged,
 * nothing failing, and no way to tell from the outside that the approved
 * design had not been used.
 *
 * A tolerant fallback is only tolerant to the person who does not receive the
 * document. So the default is now a refusal, and the asset is in the worker's
 * runtime manifest, which means the image fails preflight before it claims a
 * job rather than degrading quietly once it has one.
 *
 * `allowMissingBrandAsset` stays for internal tooling that legitimately runs
 * outside a tree containing the brand directory. Participant delivery never
 * sets it: `assembleParticipantPacket` does not pass it and offers no way to.
 */
export class MissingBrandAssetError extends Error {
  constructor() {
    super(
      `the supplemental guide's brand asset is not reachable (${LOGO_RELATIVE}). A participant's guide is not `
      + "rendered without it: falling back to a text wordmark would ship a packet that is not the approved "
      + "design and say nothing. Package the asset, or set allowMissingBrandAsset for internal tooling."
    );
    this.name = "MissingBrandAssetError";
  }
}

async function loadLogo(document: PDFDocument, allowMissing: boolean): Promise<PDFImage | null> {
  for (const base of [process.cwd(), path.resolve(process.cwd(), "..")]) {
    const file = path.join(base, LOGO_RELATIVE);
    if (!fs.existsSync(file)) continue;
    // A file that exists and will not embed is a corrupt asset, which is worse
    // than an absent one: it is never reported by a presence check.
    return await document.embedPng(fs.readFileSync(file));
  }
  if (allowMissing) return null;
  throw new MissingBrandAssetError();
}

function text(sheet: Sheet, value: string, x: number, size: number, font: PDFFont, color = INK) {
  sheet.page.drawText(sanitize(value), { x, y: sheet.y, size, font, color });
}

function newPage(sheet: Sheet) {
  const page = sheet.document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  sheet.pages.push(page);
  sheet.page = page;
  sheet.y = PAGE_HEIGHT - MARGIN;

  // Header: wordmark left, eyebrow right, hairline beneath.
  if (sheet.logo) {
    const height = 22;
    const width = (sheet.logo.width / sheet.logo.height) * height;
    page.drawImage(sheet.logo, { x: MARGIN, y: sheet.y - height + 3, width, height });
  } else {
    page.drawText("LEGALEASE", { x: MARGIN, y: sheet.y - 11, size: 12, font: sheet.fonts.bold, color: INK });
  }
  const eyebrow = sanitize(sheet.words.eyebrow);
  page.drawText(eyebrow, {
    x: PAGE_WIDTH - MARGIN - RIGHT_INSET - sheet.fonts.bold.widthOfTextAtSize(eyebrow, LABEL),
    y: sheet.y - 8, size: LABEL, font: sheet.fonts.bold, color: MUTED
  });
  sheet.y -= 26;
  page.drawLine({ start: { x: MARGIN, y: sheet.y }, end: { x: PAGE_WIDTH - MARGIN, y: sheet.y }, thickness: 0.5, color: FAINT });
  sheet.y -= 22;

  // The banner pill. On every guide page, continuations included.
  const banner = sanitize(sheet.words.banner);
  const width = sheet.fonts.bold.widthOfTextAtSize(banner, LABEL) + 18;
  page.drawRectangle({ x: MARGIN, y: sheet.y - 4, width, height: 15, color: PANEL });
  page.drawText(banner, { x: MARGIN + 9, y: sheet.y, size: LABEL, font: sheet.fonts.bold, color: INK });
  sheet.y -= 28;
}

/** Room for `needed` points, or a fresh page carrying the same chrome. */
function ensure(sheet: Sheet, needed: number) {
  if (sheet.y - needed >= MARGIN + 34) return;
  newPage(sheet);
}

function paragraph(sheet: Sheet, value: string, {
  size = BODY, font = sheet.fonts.body, color = INK, indent = 0, gap = 5, width = CONTENT_WIDTH
} = {}) {
  /*
   * Wrapped text reserves the same inset right-aligned text does.
   *
   * `wrap` fits by advance width, and a rasteriser's glyph box includes side
   * bearings, so a line that fills the measured width exactly can put its last
   * glyph a point or two past the margin. Most lines never come that close;
   * Mississippi's records-to-obtain checklist has one that does, and it was
   * drawn 0.8pt past. Reserving the inset makes "inside the margin" true
   * however it is measured, rather than true on average.
   */
  for (const line of wrap(sanitize(value), font, size, width - indent - RIGHT_INSET)) {
    ensure(sheet, LINE);
    sheet.page.drawText(line, { x: MARGIN + indent, y: sheet.y, size, font, color });
    sheet.y -= LINE;
  }
  sheet.y -= gap;
}

function sectionTitle(sheet: Sheet, value: string, lead?: string) {
  ensure(sheet, 54);
  paragraph(sheet, value, { size: 19, font: sheet.fonts.bold, gap: 3 });
  if (lead) paragraph(sheet, lead, { color: MUTED, gap: 12 });
}

function smallLabel(sheet: Sheet, value: string, gap = 8) {
  ensure(sheet, LINE + gap);
  text(sheet, value, MARGIN, LABEL, sheet.fonts.bold, MUTED);
  sheet.y -= LINE + gap - 6;
}

/** The participant-facing text of an entry, or null when the locale has none. */
function entryText(entry: SupplementalGuideEntry, locale: GuideLocale): string | null {
  if (locale === "en") return entry.text;
  const spanish = entry.textEs?.trim();
  return spanish ? spanish : null;
}

function fieldText(sheet: Sheet, field: GuideField, routeKey: string, where: string): string {
  if (!field) return sheet.words.notEstablished;
  const value = entryText(field, sheet.locale);
  if (value === null) {
    throw new SupplementalGuideRenderError(routeKey,
      `${where} has no Spanish text. A Spanish guide that falls back to English reads as finished while `
      + `telling a participant nothing they can act on, so the render refuses instead. It begins: `
      + `"${field.text.slice(0, 60)}".`);
  }
  return value;
}

/**
 * A panel of labelled cells, two per row, as the cover's matter block is drawn.
 * Cells grow to their content, so a long court name is never clipped.
 */
function cellPanel(sheet: Sheet, cells: Array<[string, string]>, columns = 2) {
  const gutter = 16;
  const columnWidth = (CONTENT_WIDTH - gutter * (columns - 1)) / columns;
  const rows: Array<Array<[string, string]>> = [];
  for (let index = 0; index < cells.length; index += columns) rows.push(cells.slice(index, index + columns));

  for (const row of rows) {
    const wrapped = row.map(([label, value]) => ({
      label,
      lines: wrap(sanitize(value), sheet.fonts.body, BODY, columnWidth - 20)
    }));
    const height = 16 + Math.max(...wrapped.map((cell) => cell.lines.length)) * LINE + 10;
    ensure(sheet, height + 6);
    sheet.page.drawRectangle({
      x: MARGIN, y: sheet.y - height + LINE, width: CONTENT_WIDTH, height, color: PANEL
    });
    wrapped.forEach((cell, index) => {
      const x = MARGIN + 10 + index * (columnWidth + gutter);
      sheet.page.drawText(sanitize(cell.label), { x, y: sheet.y, size: LABEL, font: sheet.fonts.bold, color: MUTED });
      cell.lines.forEach((line, lineIndex) => {
        sheet.page.drawText(line, { x, y: sheet.y - 13 - lineIndex * LINE, size: BODY, font: sheet.fonts.body, color: INK });
      });
    });
    sheet.y -= height + 6;
  }
  sheet.y -= 6;
}

/** A dark callout, as the IMPORTANT and BEFORE YOU PAY blocks are drawn. */
function callout(sheet: Sheet, heading: string, body: string) {
  const lines = wrap(sanitize(body), sheet.fonts.body, BODY, CONTENT_WIDTH - 28);
  const height = 20 + lines.length * LINE + 14;
  ensure(sheet, height + 8);
  sheet.page.drawRectangle({ x: MARGIN, y: sheet.y - height + LINE, width: CONTENT_WIDTH, height, color: CALLOUT });
  sheet.page.drawText(sanitize(heading), { x: MARGIN + 14, y: sheet.y, size: LABEL, font: sheet.fonts.bold, color: PAPER });
  lines.forEach((line, index) => {
    sheet.page.drawText(line, { x: MARGIN + 14, y: sheet.y - 14 - index * LINE, size: BODY, font: sheet.fonts.body, color: PAPER });
  });
  sheet.y -= height + 10;
}

/** A ruled table. Column widths are fractions of the content width. */
function table(sheet: Sheet, headers: string[], rows: string[][], fractions: number[]) {
  const widths = fractions.map((fraction) => CONTENT_WIDTH * fraction);
  const xs = widths.reduce<number[]>((acc, width, index) => {
    acc.push(index === 0 ? MARGIN : acc[index - 1] + widths[index - 1]);
    return acc;
  }, []);

  ensure(sheet, LINE * 2);
  headers.forEach((header, index) => {
    sheet.page.drawText(sanitize(header), { x: xs[index], y: sheet.y, size: LABEL, font: sheet.fonts.bold, color: MUTED });
  });
  sheet.y -= 8;
  sheet.page.drawLine({ start: { x: MARGIN, y: sheet.y }, end: { x: PAGE_WIDTH - MARGIN, y: sheet.y }, thickness: 0.5, color: FAINT });
  sheet.y -= 14;

  for (const row of rows) {
    const wrapped = row.map((cell, index) => wrap(sanitize(cell), sheet.fonts.body, BODY, widths[index] - 8));
    const height = Math.max(...wrapped.map((lines) => lines.length)) * LINE + 8;
    ensure(sheet, height + 6);
    wrapped.forEach((lines, index) => {
      lines.forEach((line, lineIndex) => {
        sheet.page.drawText(line, {
          x: xs[index], y: sheet.y - lineIndex * LINE, size: BODY, font: sheet.fonts.body, color: INK
        });
      });
    });
    sheet.y -= height;
    sheet.page.drawLine({ start: { x: MARGIN, y: sheet.y + 6 }, end: { x: PAGE_WIDTH - MARGIN, y: sheet.y + 6 }, thickness: 0.3, color: FAINT });
    sheet.y -= 8;
  }
  sheet.y -= 6;
}

// ---------------------------------------------------------------- the pages

function drawPacketOverview(sheet: Sheet, guide: SupplementalGuide, options: GuideRenderOptions) {
  const w = sheet.words;
  paragraph(sheet, w.title, { size: 24, font: sheet.fonts.bold, gap: 4 });
  paragraph(sheet, w.subtitle, { color: MUTED, gap: 14 });

  const m = sheet.matter;
  const or = (value: string | null | undefined) => (value && value.trim() ? value : w.notEstablished);
  cellPanel(sheet, [
    [w.preparedFor, or(m.preparedFor)], [w.preparedOn, or(m.preparedOn)],
    [w.jurisdiction, or(m.jurisdiction ?? guide.jurisdiction)], [w.courtOrAgency, or(m.courtOrAgency)],
    [w.caseOrMatter, or(m.caseOrMatter)], [w.remedy, or(m.remedy)]
  ]);

  smallLabel(sheet, w.whatIsInside);
  w.inside.forEach(({ title, description }, index) => {
    ensure(sheet, LINE * 2 + 8);
    text(sheet, String(index + 1).padStart(2, "0"), MARGIN, BODY, sheet.fonts.body, MUTED);
    text(sheet, title, MARGIN + 34, BODY, sheet.fonts.bold);
    const lines = wrap(sanitize(description), sheet.fonts.body, BODY, CONTENT_WIDTH - 190);
    lines.forEach((line, lineIndex) => {
      sheet.page.drawText(line, { x: MARGIN + 190, y: sheet.y - lineIndex * LINE, size: BODY, font: sheet.fonts.body, color: MUTED });
    });
    sheet.y -= Math.max(lines.length, 1) * LINE + 6;
    sheet.page.drawLine({ start: { x: MARGIN, y: sheet.y + 4 }, end: { x: PAGE_WIDTH - MARGIN, y: sheet.y + 4 }, thickness: 0.3, color: FAINT });
    sheet.y -= 8;
  });

  /*
   * The callout closes the cover, as the reference does, BEFORE the route's own
   * overview prose. Drawing the prose first pushed it onto page two, so the one
   * page that tells a participant not to file these sheets no longer carried
   * the sentence saying so.
   */
  callout(sheet, w.important, w.importantBody);

  // The route's own overview substance, where it has any.
  for (const entry of guide.overview ?? []) {
    paragraph(sheet, fieldText(sheet, entry, guide.routeKey, "an Overview entry"));
  }
}

function drawNextSteps(sheet: Sheet, guide: SupplementalGuide, options: GuideRenderOptions) {
  const w = sheet.words;
  newPage(sheet);
  sectionTitle(sheet, w.nextSteps, w.nextStepsLead);

  const strip = guide.filingStrip;
  cellPanel(sheet, [
    [w.whereToFile, fieldText(sheet, strip?.whereToFile ?? null, guide.routeKey, "the filing location")],
    [w.filingMethod, fieldText(sheet, strip?.filingMethod ?? null, guide.routeKey, "the filing method")],
    [w.deadline, fieldText(sheet, strip?.deadline ?? null, guide.routeKey, "the deadline")],
    [w.nextEvent, fieldText(sheet, strip?.nextEvent ?? null, guide.routeKey, "the next event")]
  ]);

  /*
   * ONE NUMBERING SYSTEM PER PAGE.
   *
   * The renderer numbers Next Steps entries down the margin. Where a route's
   * own adopted wording also numbers its steps, the page carried two counts
   * that disagreed: a margin "7" beside "STEP SIX", a margin "3" beside "(1)
   * THE PROSECUTING ATTORNEY". They disagree because they count different
   * things -- the margin counts entries, and an entry is not always a step; a
   * heading, a parenthetical aside and a sub-item are entries too.
   *
   * The GUIDE says which, in `nextStepsNumbering`. It is not read off the text:
   * deciding presentation by whether a sentence starts with a bracket means
   * rewording a step silently renumbers a legal packet. Where the route
   * declares its own step labels the margin goes quiet for the whole section --
   * the section is the unit, because "which step am I on" has to have one
   * answer for the page -- and where it does not, the margin numbers every
   * entry exactly as before.
   *
   * The source wording is untouched either way.
   */
  const entries = guide.nextSteps ?? [];
  const routeNumbersItsOwnSteps = guide.nextStepsNumbering === "source_step_labels";

  entries.forEach((entry, index) => {
    const body = fieldText(sheet, entry, guide.routeKey, "a Next Steps entry");
    ensure(sheet, LINE * 2);
    /*
     * The 26-point gutter stays even when nothing is drawn in it.
     *
     * Closing it up reads better -- an empty gutter is an indent nobody asked
     * for -- and widening the column to the full content width pushed lines
     * past the right margin on DC and Mississippi, because the wrap measures a
     * kerned width and the page draws an unkerned one. Trading a cosmetic
     * indent for ink outside the text block is not a trade. It stays until that
     * measurement is fixed, and it is recorded with it.
     */
    if (!routeNumbersItsOwnSteps) {
      text(sheet, String(index + 1), MARGIN, BODY, sheet.fonts.bold, MUTED);
    }
    const lines = wrap(sanitize(body), sheet.fonts.body, BODY, CONTENT_WIDTH - 26);
    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) ensure(sheet, LINE);
      sheet.page.drawText(line, { x: MARGIN + 26, y: sheet.y - lineIndex * LINE, size: BODY, font: sheet.fonts.body, color: INK });
    });
    sheet.y -= lines.length * LINE + 8;
  });
}

function drawFilingChecklist(sheet: Sheet, guide: SupplementalGuide, options: GuideRenderOptions) {
  const w = sheet.words;
  newPage(sheet);
  sectionTitle(sheet, w.checklist, w.checklistLead);

  /*
   * The document table is built from the PACKET SPECIFICATION's court-facing
   * components, not from guide data. A guide carrying its own list could name a
   * document the packet does not contain, or miss one it does.
   */
  const documents = options.documents ?? [];
  if (documents.length > 0) {
    smallLabel(sheet, w.documentCheck);
    const details = new Map((guide.documentDetails ?? []).map((detail) => [detail.documentId, detail]));
    table(sheet,
      [w.colDocument, w.colSigned, w.colCopies, w.colAttach],
      documents.map((document) => {
        const detail = details.get(document.documentId);
        return [
          document.title,
          "[   ]",
          detail?.copies ?? "-",
          fieldText(sheet, detail?.instruction ?? null, guide.routeKey, `the filing instruction for ${document.documentId}`)
        ];
      }),
      [0.52, 0.1, 0.1, 0.28]
    );
  }

  for (const entry of guide.filingChecklist ?? []) {
    paragraph(sheet, `- ${fieldText(sheet, entry, guide.routeKey, "a Filing Checklist entry")}`, { indent: 6 });
  }
}

function drawFeesAndCosts(sheet: Sheet, guide: SupplementalGuide, options: GuideRenderOptions) {
  const w = sheet.words;
  newPage(sheet);
  sectionTitle(sheet, w.fees, w.feesLead);

  const fees = guide.fees;
  cellPanel(sheet, [
    [w.estimate, fees?.estimate ?? w.notEstablished],
    [`${w.lastVerified} / ${w.officialSource}`,
      [fees?.lastVerified ?? w.notRecorded,
        fees?.officialSource ? fieldText(sheet, fees.officialSource, guide.routeKey, "the official fee source") : w.notEstablished
      ].join("  |  ")]
  ]);

  /*
   * The breakdown block is DRAWN even where the route establishes no row.
   *
   * Omitting the section entirely was the same mistake as a blank cell, one
   * level up: a participant comparing their guide to another route's sees a
   * missing block and cannot tell whether nothing is established or whether
   * something was dropped. Georgia is the case -- its filing fee, its
   * pauper's-affidavit reach and its e-filing availability are all recorded as
   * unresolved and county-specific, and the memorandum forbids quoting a figure
   * until they close -- so the honest page says that where the rows would be.
   */
  smallLabel(sheet, w.breakdown);
  if (fees?.breakdown?.length) {
    table(sheet, [w.colItem, w.colAmount, w.colWhen],
      fees.breakdown.map((row) => [
        sheet.locale === "es" && row.itemEs ? row.itemEs : row.item,
        row.amount ?? "-",
        fieldText(sheet, row.whenHowPaid, guide.routeKey, `the payment timing for "${row.item}"`)
      ]),
      [0.5, 0.18, 0.32]);
  } else {
    paragraph(sheet, w.notEstablished);
  }

  smallLabel(sheet, w.waiver);
  cellPanel(sheet, [
    [w.availability, fieldText(sheet, fees?.waiver?.availability ?? null, guide.routeKey, "fee-waiver availability")],
    [w.formOrProcess, fieldText(sheet, fees?.waiver?.formOrProcess ?? null, guide.routeKey, "the fee-waiver form or process")],
    [w.whereToSubmit, fieldText(sheet, fees?.waiver?.whereToSubmit ?? null, guide.routeKey, "where to submit a fee waiver")]
  ]);

  for (const entry of guide.feesAndCosts ?? []) {
    paragraph(sheet, fieldText(sheet, entry, guide.routeKey, "a Fees & Costs entry"));
  }
}

/**
 * Stop conditions, DERIVED from the specification rather than stored in guide
 * data, so the two lists cannot disagree. Spanish is supplied alongside and
 * refused when missing, because a stop condition is an instruction.
 */
function drawStopConditions(sheet: Sheet, guide: SupplementalGuide, options: GuideRenderOptions) {
  const blocking = (options.stops ?? []).filter((stop) => stop.stopAndGetHelp);
  if (blocking.length === 0) return;
  ensure(sheet, LINE * 5);
  smallLabel(sheet, sheet.words.stops);
  for (const stop of blocking) {
    let situation = stop.situation;
    let meaning = stop.whatItMeans;
    if (sheet.locale === "es") {
      const translated = options.stopsEs?.[stop.situation];
      if (!translated?.situation?.trim() || !translated?.whatItMeans?.trim()) {
        throw new SupplementalGuideRenderError(guide.routeKey,
          `a stop condition has no Spanish text. A stop condition tells a participant to stop and get help, `
          + `so printing it in English inside a Spanish guide is the one place a fallback is least survivable. `
          + `It begins: "${stop.situation.slice(0, 60)}".`);
      }
      situation = translated.situation;
      meaning = translated.whatItMeans;
    }
    paragraph(sheet, `- ${situation}`, { indent: 6, gap: 1 });
    paragraph(sheet, meaning, { indent: 18, font: sheet.fonts.italic, color: MUTED, size: BODY - 0.5 });
  }
}

/** Footers last, so every page can carry its true number out of the true total. */
function drawFooters(sheet: Sheet) {
  const total = sheet.pages.length;
  sheet.pages.forEach((page, index) => {
    page.drawLine({ start: { x: MARGIN, y: MARGIN + 14 }, end: { x: PAGE_WIDTH - MARGIN, y: MARGIN + 14 }, thickness: 0.5, color: FAINT });
    page.drawText(sanitize(sheet.words.footerBrand), { x: MARGIN, y: MARGIN, size: LABEL, font: sheet.fonts.body, color: MUTED });
    const packetId = sanitize(sheet.matter.packetId ?? "");
    if (packetId) {
      page.drawText(packetId, {
        x: (PAGE_WIDTH - sheet.fonts.body.widthOfTextAtSize(packetId, LABEL)) / 2,
        y: MARGIN, size: LABEL, font: sheet.fonts.body, color: MUTED
      });
    }
    const counter = sanitize(sheet.words.guideOf(index + 1, total));
    page.drawText(counter, {
      x: PAGE_WIDTH - MARGIN - RIGHT_INSET - sheet.fonts.bold.widthOfTextAtSize(counter, LABEL),
      y: MARGIN, size: LABEL, font: sheet.fonts.bold, color: MUTED
    });
  });
}

/** Draw the whole guide into an existing document. Returns pages added. */
export async function drawSupplementalGuide(
  document: PDFDocument,
  guide: SupplementalGuide,
  options: GuideRenderOptions = {}
): Promise<number> {
  const variant = options.variant ?? "full";
  if (!guideBelongsInPacket(variant)) return 0;

  const locale = options.locale ?? "en";
  const before = document.getPageCount();
  const sheet: Sheet = {
    document,
    fonts: {
      body: await document.embedFont(StandardFonts.Helvetica),
      bold: await document.embedFont(StandardFonts.HelveticaBold),
      italic: await document.embedFont(StandardFonts.HelveticaOblique)
    },
    locale,
    words: COPY[locale],
    logo: await loadLogo(document, options.allowMissingBrandAsset === true),
    matter: options.matter ?? {},
    pages: [],
    page: null as unknown as PDFPage,
    y: 0
  };

  newPage(sheet);
  drawPacketOverview(sheet, guide, options);
  drawNextSteps(sheet, guide, options);
  drawFilingChecklist(sheet, guide, options);
  drawFeesAndCosts(sheet, guide, options);
  drawStopConditions(sheet, guide, options);
  drawFooters(sheet);

  return document.getPageCount() - before;
}

/** The guide on its own, for review artifacts and for the controls. */
export async function renderSupplementalGuidePdf(
  guide: SupplementalGuide,
  options: GuideRenderOptions = {}
): Promise<Buffer> {
  const variant = options.variant ?? "full";
  if (!guideBelongsInPacket(variant)) {
    throw new SupplementalGuideRenderError(guide.routeKey,
      `a ${variant} packet carries no participant guide, so there is no document to return. The packet `
      + `assembler does not call this for a ${variant} packet: it asks guideBelongsInPacket and skips the `
      + `guide, producing the court-facing documents normally.`);
  }

  const document = await PDFDocument.create();
  document.setTitle(`${guide.jurisdiction} - ${COPY[options.locale ?? "en"].title}`);
  document.setProducer("LegalEase supplemental guide renderer");
  document.setCreator("LegalEase");
  const stamped = new Date(options.verifiedAt ?? 0);
  const when = Number.isNaN(stamped.getTime()) ? new Date(0) : stamped;
  document.setCreationDate(when);
  document.setModificationDate(when);

  const drawn = await drawSupplementalGuide(document, guide, options);
  if (drawn === 0) throw new SupplementalGuideRenderError(guide.routeKey, "the guide carries no substance to draw.");
  /*
   * OBJECT STREAMS OFF, LIKE THE GRADE-A RENDERER.
   *
   * pdf-lib's default `save()` writes page objects into compressed object
   * streams, so `/Type /Page` never appears in the file's bytes. The artifact
   * validator counts pages by scanning for exactly that -- deliberately, so a
   * defect in the library that produced the PDF cannot hide from the check
   * meant to catch it -- and it therefore read every assembled packet as a
   * zero-page PDF and refused to let it become an artifact.
   *
   * This never mattered while the assembled output was only a review artifact.
   * The moment it became the participant's delivered packet, it meant
   * generation failed for every guide-backed route. `renderGradeAPacketPdf`
   * has always passed this flag; the guide renderer simply never needed to.
   */
  return Buffer.from(await document.save({ useObjectStreams: false }));
}

/** Stop conditions from a packet specification, in the shape this renderer draws. */
export function guideStopConditions(
  specification: { hearingAndObjectionStops?: ReadonlyArray<GuideStopCondition> }
): ReadonlyArray<GuideStopCondition> {
  return specification.hearingAndObjectionStops ?? [];
}

/**
 * The documents the checklist lists: the ones THIS MATTER actually ships.
 *
 * It takes the composed packet, not the specification. A specification is a
 * catalogue of everything a route can produce, including conditionals the
 * matter did not select -- South Dakota's escalation motion is the live
 * example. Reading the catalogue would print a checklist row for a document
 * that is not in the participant's hands, which is worse than omitting it:
 * they would go looking for it, or file believing something is missing.
 *
 * Selection is the §4.2 contract's `courtFacing`, the same predicate the
 * court-only download uses, so the packet and its checklist cannot disagree.
 * Records the participant must obtain elsewhere are not documents this packet
 * contains and belong in the filing checklist as tasks, not here.
 */
export function guideDocuments(
  packet: { documents?: ReadonlyArray<{ documentId: string; title?: string; courtFacing?: boolean }> }
): ReadonlyArray<GuideDocument> {
  return (packet.documents ?? [])
    .filter((document) => document.courtFacing === true)
    .map((document) => ({ documentId: document.documentId, title: document.title ?? document.documentId }));
}

/**
 * A full packet: the guide, then the court-facing material.
 *
 * The requirement states the shape plainly -- supplemental pages only when the
 * packet is `full`, court-facing material always, and a court-only packet
 * containing ZERO supplemental pages. The ordering follows the approved
 * reference, whose contents page tells the participant their forms "begin after
 * this guide".
 *
 * A court-only packet does not call the guide renderer and swallow a refusal;
 * it never asks for a guide at all. That is why `guideBelongsInPacket` exists
 * as one exported decision: a packet that failed to build because a guide it
 * should not contain refused to render would be a defect invented by the
 * integration rather than found by it.
 *
 * The court-facing bytes are copied in unchanged. Redrawing them here is how a
 * supplemental redesign silently alters a filing.
 *
 * IT RENDERS THE PACKET HALF ITSELF, AND THAT IS THE POINT
 *
 * A packet component marked `supersededBy: "supplemental_guide"` may only be
 * dropped when the guide is genuinely in the participant's hands, so the packet
 * render has to know whether a guide is coming. Taking a finished PDF here
 * would leave that as a convention a caller has to remember, and a caller who
 * forgot would ship a route's legacy instructions beside the guide written to
 * replace them -- two sets of filing instructions, free to drift apart.
 *
 * Taking the composed packet instead makes the pairing structural: the one
 * function that knows whether a guide is being assembled is the one that asks
 * for the pages.
 */
export async function assemblePacketWithGuide(
  packet: GradeAPacket,
  guide: SupplementalGuide | null,
  options: GuideRenderOptions & { routeKey?: string } = {}
): Promise<Buffer> {
  const variant = options.variant ?? "full";

  /*
   * A full packet without its guide is not a full packet.
   *
   * The earlier version took `guide: null` and simply skipped drawing, and the
   * completeness assertion also skipped because it required a guide to be
   * present. A route whose guide data failed to load therefore returned court
   * material under a full-packet request -- the participant would have received
   * a download missing the pages that tell them where to file, with nothing
   * anywhere reporting it. Missing guide data is incomplete, not court-only.
   */
  if (variant === "full" && !guide) {
    throw new SupplementalGuideRenderError(options.routeKey ?? "unknown route",
      "a full packet was requested and no guide data was supplied. A full packet is the guide plus the "
      + "court-facing material, so this is incomplete data, not a court-only packet. Assemble a court-only "
      + "packet deliberately, or supply the route's guide.");
  }

  const document = await PDFDocument.create();

  /*
   * THE ASSEMBLED DOCUMENT'S DATES ARE THE MATTER'S, NOT NOW.
   *
   * This document is created here, so pdf-lib stamps the current clock into
   * CreationDate and ModDate unless told otherwise -- and it was not told.
   * `renderGradeAPacketPdf` and `renderSupplementalGuidePdf` both bind their
   * dates to the verification for exactly this reason; the assembler, which
   * produces the bytes a participant actually receives, did not.
   *
   * Measured: the bare Grade-A render hashed identically three times out of
   * three; the assembled packet produced a different hash whenever a second
   * ticked over. That is fatal to everything downstream. A recorded artifact
   * digest would name a moment rather than a packet, the download's re-render
   * check would fail on a correct packet, and review evidence would name bytes
   * nobody could reproduce -- including the evidence for an owner decision.
   *
   * The packet already carries the right value, and it is the same one the
   * court-facing half is stamped with, so the two halves of an assembled
   * document cannot disagree about when it was made.
   */
  const verifiedAt = new Date(options.verifiedAt ?? packet.verifiedAt);
  const stamp = Number.isNaN(verifiedAt.getTime()) ? new Date(0) : verifiedAt;
  document.setTitle(packet.packetFamilyLabel);
  document.setProducer("LegalEase participant packet assembler");
  document.setCreator("LegalEase");
  document.setCreationDate(stamp);
  document.setModificationDate(stamp);

  if (guide && guideBelongsInPacket(variant)) {
    await drawSupplementalGuide(document, guide, options);
  }
  const guidePages = document.getPageCount();

  const courtFacingPdf = await renderGradeAPacketPdf(packet, {
    variant,
    // The guide is assembled only where it is actually drawn. A court-only
    // download carries no guide, so nothing there is superseded yet.
    guideAssembled: Boolean(guide) && guideBelongsInPacket(variant)
  });
  const courtFacing = await PDFDocument.load(courtFacingPdf);
  const copied = await document.copyPages(courtFacing, courtFacing.getPageIndices());
  for (const page of copied) document.addPage(page);

  if (variant === "full" && guidePages === 0) {
    throw new SupplementalGuideRenderError(guide!.routeKey,
      "a full packet was assembled with no guide pages. The guide is part of what a full packet is, so "
      + "producing one without it silently ships a court-only packet under a full packet's name.");
  }
  // Object streams off, for the reason given in renderSupplementalGuidePdf:
  // the artifact validator counts pages by scanning the bytes, and a compressed
  // page object is a page it cannot see.
  return Buffer.from(await document.save({ useObjectStreams: false }));
}
