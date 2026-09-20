/**
 * The §7 supplemental participant guide renderer. One renderer, every route.
 *
 * The lane exists because each adopted packet family carries its own filing
 * instructions page, written in its own voice inside the packet PDF. Fifty-one
 * of those drift apart. So the substance moved into route data against a shared
 * schema (`guide-contract.ts`), and this draws it — the same way for every
 * route, with nothing route-specific in here.
 *
 * FOUR THINGS IT HAS TO GET RIGHT
 *
 * 1. EN/ES. The guide is what tells a participant where to file and what to
 *    bring, so a Spanish-language participant receiving an English guide is not
 *    a cosmetic gap. Spanish is carried per entry, and a Spanish render REFUSES
 *    when an entry has no Spanish rather than silently falling back to English:
 *    a fallback would ship a half-translated guide that reads as finished.
 *
 * 2. Wrapping and pagination. Guide entries are prose of unbounded length, so
 *    every line is measured and wrapped, and a section that runs off the page
 *    continues on the next one. Text drawn past the margin is clipped silently
 *    by the PDF, which is the failure mode this exists to prevent.
 *
 * 3. Full versus court-only packets. A court-only packet is what the
 *    participant hands the clerk. The guide is addressed TO the participant and
 *    must not be in it, so `court_only` renders no guide pages at all and says
 *    so rather than returning an empty PDF that looks like a bug.
 *
 * 4. KEEP FOR YOUR RECORDS / DO NOT FILE, on guide pages ONLY. This is the
 *    banner that stops a participant filing the instructions along with the
 *    petition. It belongs to guide pages and to nothing else — stamping it on
 *    a pleading page would tell someone not to file the thing they must file —
 *    so it is drawn here, by the guide renderer, and nowhere in the document
 *    renderer.
 *
 * STOP CONDITIONS ARE DERIVED, NEVER STORED HERE
 *
 * The specification already carries `hearingAndObjectionStops`. Copying those
 * into guide data would create a second list that can disagree with the first,
 * which is the exact failure this lane exists to end. So the renderer reads
 * them from the specification at draw time and formats them; a guide file that
 * duplicates one is refused by the control.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { PAGE_WIDTH, PAGE_HEIGHT, MARGIN, wrap, sanitize } from "../grade-a/renderer";
import {
  SUPPLEMENTAL_GUIDE_SECTIONS,
  type SupplementalGuide,
  type SupplementalGuideEntry
} from "./guide-contract";

export const GUIDE_RENDERER_KIND = "rcap_supplemental_guide_v1";
export const GUIDE_RENDERER_VERSION = "1.0.0";

const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const INK = rgb(0.1, 0.1, 0.12);
const QUIET = rgb(0.42, 0.42, 0.46);
const BANNER_INK = rgb(0.55, 0.12, 0.12);

const TITLE_SIZE = 17;
const HEADING_SIZE = 12.5;
const BODY_SIZE = 10.5;
const LINE = 14;

/** The guide is participant-facing, so it ships in the full packet only. */
export type GuideVariant = "full" | "court_only";
export type GuideLocale = "en" | "es";

export type GuideStopCondition = {
  situation: string;
  whatItMeans: string;
  stopAndGetHelp: boolean;
};

export type GuideRenderOptions = {
  locale?: GuideLocale;
  variant?: GuideVariant;
  /** Read from the specification's `hearingAndObjectionStops`. Never stored in guide data. */
  stops?: ReadonlyArray<GuideStopCondition>;
  /** Bound to the matter's verification time so a render is a pure function of its inputs. */
  verifiedAt?: string;
};

/**
 * Whether a packet of this shape carries the guide at all.
 *
 * Exported rather than inlined so the packet assembler and this renderer cannot
 * reach different answers about the same packet.
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

/** The participant-facing text of an entry in the requested language. */
function entryText(entry: SupplementalGuideEntry, locale: GuideLocale): string | null {
  if (locale === "en") return entry.text;
  const spanish = entry.textEs?.trim();
  return spanish ? spanish : null;
}

/**
 * The banner, and the reason it is a function of the page rather than a flag.
 *
 * Every guide page carries it, including continuation pages: a participant
 * separating the pages would otherwise find an unbannered sheet that looks
 * like part of the filing.
 */
const BANNER = {
  en: "KEEP FOR YOUR RECORDS — DO NOT FILE",
  es: "CONSERVE ESTE DOCUMENTO — NO LO PRESENTE ANTE EL TRIBUNAL"
} as const;

const SECTION_HEADINGS = {
  en: {
    overview: "Overview",
    nextSteps: "Next Steps",
    filingChecklist: "Filing Checklist",
    feesAndCosts: "Fees & Costs",
    stops: "When to stop and get help"
  },
  es: {
    overview: "Resumen",
    nextSteps: "Pasos siguientes",
    filingChecklist: "Lista de verificación para presentar",
    feesAndCosts: "Tarifas y costos",
    stops: "Cuándo detenerse y buscar ayuda"
  }
} as const;

const GUIDE_TITLE = {
  en: "Your guide to this packet",
  es: "Su guía para este paquete"
} as const;

type Fonts = { body: PDFFont; bold: PDFFont; italic: PDFFont };
type Cursor = { page: PDFPage; y: number };

function startPage(document: PDFDocument, fonts: Fonts, locale: GuideLocale): Cursor {
  const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const banner = sanitize(BANNER[locale]);
  const width = fonts.bold.widthOfTextAtSize(banner, 9.5);
  page.drawText(banner, {
    x: (PAGE_WIDTH - width) / 2, y: PAGE_HEIGHT - MARGIN + 14, size: 9.5, font: fonts.bold, color: BANNER_INK
  });
  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - MARGIN + 8 },
    end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - MARGIN + 8 },
    thickness: 0.6,
    color: BANNER_INK
  });
  return { page, y: PAGE_HEIGHT - MARGIN - 6 };
}

/** Make room for `needed` points, starting a fresh bannered page if there is not. */
function ensure(document: PDFDocument, cursor: Cursor, fonts: Fonts, locale: GuideLocale, needed: number) {
  if (cursor.y - needed >= MARGIN + 24) return;
  const next = startPage(document, fonts, locale);
  cursor.page = next.page;
  cursor.y = next.y;
}

function drawParagraph(
  document: PDFDocument,
  cursor: Cursor,
  fonts: Fonts,
  locale: GuideLocale,
  text: string,
  { size = BODY_SIZE, font = fonts.body, indent = 0, gap = 6 } = {}
) {
  for (const line of wrap(sanitize(text), font, size, CONTENT_WIDTH - indent)) {
    ensure(document, cursor, fonts, locale, LINE);
    cursor.page.drawText(line, { x: MARGIN + indent, y: cursor.y, size, font, color: INK });
    cursor.y -= LINE;
  }
  cursor.y -= gap;
}

/**
 * Draw the whole guide into an existing document, so the packet renderer can
 * append it without a second PDF and a merge step.
 */
export function drawSupplementalGuide(
  document: PDFDocument,
  fonts: Fonts,
  guide: SupplementalGuide,
  options: GuideRenderOptions = {}
): number {
  const locale = options.locale ?? "en";
  const variant = options.variant ?? "full";
  if (!guideBelongsInPacket(variant)) return 0;

  const headings = SECTION_HEADINGS[locale];
  const before = document.getPageCount();
  const cursor = startPage(document, fonts, locale);

  drawParagraph(document, cursor, fonts, locale, GUIDE_TITLE[locale],
    { size: TITLE_SIZE, font: fonts.bold, gap: 10 });

  for (const section of SUPPLEMENTAL_GUIDE_SECTIONS) {
    const entries = guide[section.id];
    if (!entries || entries.length === 0) continue;
    // A heading is never left stranded at the foot of a page.
    ensure(document, cursor, fonts, locale, LINE * 3);
    drawParagraph(document, cursor, fonts, locale, headings[section.id],
      { size: HEADING_SIZE, font: fonts.bold, gap: 4 });
    for (const entry of entries) {
      const text = entryText(entry, locale);
      if (text === null) {
        throw new SupplementalGuideRenderError(guide.routeKey,
          `an entry in "${section.heading}" has no Spanish text. A Spanish guide that falls back to English `
          + `reads as finished while telling a participant nothing they can act on, so the render refuses `
          + `instead. The entry begins: "${entry.text.slice(0, 60)}".`);
      }
      drawParagraph(document, cursor, fonts, locale, text);
    }
  }

  /*
   * Stop conditions, derived from the specification rather than stored here.
   * The guide never carries its own copy, so the two cannot disagree.
   */
  const stops = options.stops ?? [];
  if (stops.length > 0) {
    ensure(document, cursor, fonts, locale, LINE * 4);
    drawParagraph(document, cursor, fonts, locale, headings.stops,
      { size: HEADING_SIZE, font: fonts.bold, gap: 4 });
    for (const stop of stops) {
      if (!stop.stopAndGetHelp) continue;
      drawParagraph(document, cursor, fonts, locale, `- ${stop.situation}`, { indent: 10, gap: 2 });
      drawParagraph(document, cursor, fonts, locale, stop.whatItMeans,
        { indent: 22, font: fonts.italic, size: BODY_SIZE - 0.5 });
    }
  }

  ensure(document, cursor, fonts, locale, LINE * 2);
  drawParagraph(document, cursor, fonts, locale, sanitize(BANNER[locale]),
    { size: 9, font: fonts.bold, gap: 0 });

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
      `a ${variant} packet carries no participant guide. The guide is addressed to the participant, not to the `
      + `court, and returning an empty PDF would look like a defect rather than the rule it is.`);
  }

  const document = await PDFDocument.create();
  document.setTitle(`${guide.jurisdiction} — ${GUIDE_TITLE[options.locale ?? "en"]}`);
  document.setProducer("LegalEase supplemental guide renderer");
  document.setCreator("LegalEase");
  const stamped = new Date(options.verifiedAt ?? 0);
  const when = Number.isNaN(stamped.getTime()) ? new Date(0) : stamped;
  document.setCreationDate(when);
  document.setModificationDate(when);

  const fonts: Fonts = {
    body: await document.embedFont(StandardFonts.Helvetica),
    bold: await document.embedFont(StandardFonts.HelveticaBold),
    italic: await document.embedFont(StandardFonts.HelveticaOblique)
  };

  drawSupplementalGuide(document, fonts, guide, options);
  const drawn = document.getPageCount();
  if (drawn === 0) {
    throw new SupplementalGuideRenderError(guide.routeKey, "the guide carries no substance to draw.");
  }
  // Discard the trailing blank pdf-lib leaves if the last page took nothing.
  return Buffer.from(await document.save());
}

/** Stop conditions from a packet specification, in the shape this renderer draws. */
export function guideStopConditions(
  specification: { hearingAndObjectionStops?: ReadonlyArray<GuideStopCondition> }
): ReadonlyArray<GuideStopCondition> {
  return specification.hearingAndObjectionStops ?? [];
}
