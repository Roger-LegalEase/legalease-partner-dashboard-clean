#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import zlib from "node:zlib";
import { normalizeInvertedWidgetRectangles } from "./rcap-official-forms/rcap-active-content.mjs";
import { baselineInk, proveDeliveredInk } from "./rcap-official-forms/delivered-ink-measurement.mjs";
import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import {
  classifyAlabamaClerkAssignedCaseNumber,
  isAlabamaClerkAssignedCaseNumber
} from "./rcap-official-forms/alabama-clerk-assigned-case-number.mjs";
import {
  AL_C10_RELIEF_OPTIONS, AL_C10_RELIEF_TITLE, alabamaC10ReliefSection, alabamaOathGuidance,
  classifyAlabamaC10Municipality, classifyAlabamaC10Relief
} from "./rcap-official-forms/alabama-participant-handback.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFCheckBox, PDFTextField, StandardFonts, StandardFontEmbedder } = require("pdf-lib");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_PATH = "data/rcap-all50/local-source-corpus-index.json";
const WORKLIST_PATH = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const MEMO_PATH = "data/record-clearing/legal-design-intake/AL.memo.json";
const FIXED_DATE = new Date("2026-09-03T00:00:00.000Z");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const SOURCES = [
  { documentId: "CR-65", sourceId: "official-form:CR-65", path: "LegalEase Alabama/cr-65-expunge-petition-10-2024.pdf", sha256: "c2e0c7bd7abca2c83c469d7da1aa0b80b132e653f8712d0b4ce77c8b160b2a39", componentKinds: ["primary_filing", "certificate_of_service"] },
  { documentId: "C-10-CRIMINAL", sourceId: "official-form:C-10-CRIMINAL", path: "STATES/AL/02_PACKET_FORMS/AL__FORM__C-10-CRIMINAL__affidavit-of-substantial-hardship-and-order__REV-2024-05__EN.pdf", sha256: "527d4cfdde5bea564a8729e6425f1042627b03435ec634509fe32fdb80a5c6f8", componentKinds: ["fee_waiver"] }
];

const FAMILY_CONFIG = {
  "al-diversion-set": { selected: ["Check Box8.5"], routeSummary: "Misdemeanor or violation charge dismissed after successful completion of an approved diversion or court program; the form's one-year and prior-expungement conditions still must be confirmed." },
  "al-felony-dwop-set": { selected: ["Check Box10.3"], routeSummary: "Felony charge dismissed without prejudice more than five years ago, not refiled, with the form's conviction-free condition." },
  "al-felony-nonconviction-90-set": {
    trackId: "al-felony-nonconviction-90",
    selected: [],
    /*
     * CR-65 page 3 check box `Check Box10.2` -- the quashed-indictment ground,
     * one of the five printed outcomes THIS route hands back to the participant
     * -- stores its /Rect as [45.317 623.137 56.5341 608.779], corners in the
     * inverted order. ISO 32000-1 7.9.5 permits that and requires a consumer to
     * normalise it in situ; pdf-lib does not, so flatten() translates the
     * widget's own white /Off fill to the raw first corner and paints an
     * 11.2171 by 14.3578 white rectangle 14.358pt high -- across the word
     * "expired" in that same ground's printed sentence, "expired or the
     * prosecuting agency confirms that the charge or charges will not be
     * refiled."
     *
     * On this family that is worse than a blemish. This route elects nothing and
     * asks the participant to read the five printed outcomes and choose one
     * themselves; the defect painted out part of the text of one of the five
     * they are being asked to read.
     *
     * Set on this family alone because this lane holds this family alone. The
     * other five entries in this host's config are built elsewhere and are not
     * rebuilt here.
     */
    normalizeInvertedWidgetRects: true,
    measureOutputByteGlyphs: true,
    routeSummary: "Felony nonconviction route after the applicable 90-day period. The participant must select the exact outcome printed in Section III; the route family does not determine whether it was dismissal with prejudice, no-bill, acquittal, or unconditional nolle prosequi.",
    /*
     * This route deliberately elects nothing on the petition. Five printed
     * outcomes qualify, the held record does not establish which one this
     * participant's case had, and a sworn election made on their behalf out of
     * a route label would be a guess. So the comparison names all five from the
     * record and hands the election back, rather than narrowing it for them.
     */
    recordComparison: "Read the certified local record and identify which ONE of the printed Section III outcomes it actually shows, then check that box yourself. The record recognises these: \"Dismissed with prejudice, more than 90 days passed\"; \"No billed by a grand jury, more than 90 days passed\"; \"Found not guilty, more than 90 days passed\"; \"Nolle prossed without conditions, more than 90 days passed, not refiled\"; \"Indictment quashed and the limitations period for refiling has expired, or the prosecuting agency confirms the charges will not be refiled\". This packet checks none of them for you, because it does not hold which one your case was. Confirm the 90-day period from the disposition has run, confirm the charges have not been refiled, and stop if the certified record does not clearly show exactly one of these outcomes."
  },
  "al-misd-conviction-set": { selected: ["Check Box9.2", "Check Box9.3", "Check Box9.4", "Check Box9.5", "Check Box9.6", "Check Box9.7", "Check Box9.8"], routeSummary: "Qualifying misdemeanor, violation, traffic, municipal, or misdemeanor youthful-offender conviction after all seven Section II conditions." },
  "al-misd-dwop-set": { selected: ["Check Box8.6"], routeSummary: "Misdemeanor or violation charge dismissed without prejudice more than one year ago, not refiled, with the form's two-year conviction-free condition." }
  /*
   * FIX144: al-pardoned-felony-set is deliberately absent from this config.
   *
   * It used to sit here carrying `selected: ["Check Box10.6", "Check Box11.0"
   * ... "Check Box11.6"]` -- all eight limbs of CR-65 Section V -- which is the
   * exact configuration AL6-04 retired. Section V is a CONJUNCTIVE SWORN
   * certification ("AND ALL OF THE FOLLOWING HAVE OCCURRED. If you have not
   * checked all eight boxes, the conviction is not eligible for expungement"),
   * six of the eight limbs assert facts AL.memo.json track al-pardoned-felony
   * never holds and never asks for, and a seventh is the memo's own retained
   * build_blocker AL-7. That family's live builder,
   * scripts/build-census-v1-al-pardoned-felony-set.mjs, now runs on the shared
   * host build-census-v1-al-diversion-set.mjs with `selected: []` and asserts
   * that none of the eight is ever ticked again.
   *
   * buildAlabamaFamily() below asserts its own familyId, so the retired entry
   * could not be driven from here -- but a retired ticking configuration for a
   * repaired family, sitting in a live file, reads as the current design to the
   * next person who opens it. The sibling host documents the same rule for the
   * same reason: "leaving them in FAMILY_CONFIG would let a caller drive this
   * module over a family it no longer owns and silently overwrite the repaired
   * output of another lane."
   *
   * The four entries above are retained: each is the CURRENT configuration of a
   * family built elsewhere, and this lane holds none of them.
   */
};

const FIXTURES = {
  canonical: {
    first: "Jordan", middle: "Avery", last: "Reyes", full: "Jordan Avery Reyes",
    street: "412 Magnolia Avenue", cityStateZip: "Montgomery, AL 36104", email: "jordan.reyes@example.org",
    phone: "334-555-0142", dob: "06/14/1988", caseNumber: "CC-2021-004217", county: "Montgomery",
    charge: "The charge shown on the certified case record", grounds: "See the selected statutory route and attached certified records",
    arrestAgency: "Agency shown on the certified arrest record", detentionAgency: "None beyond the agency listed above"
  },
  boundary: {
    first: "Alexandria", middle: "Catherine", last: "Montgomery-Washington", full: "Alexandria Catherine Montgomery-Washington",
    street: "1188 Martin Luther King Junior Boulevard Apartment 1407", cityStateZip: "Birmingham, AL 35203-4417",
    email: "alexandria.montgomery.washington@example.org", phone: "205-555-0199", dob: "12/31/1979",
    caseNumber: "CC-2024-000001.99", county: "Jefferson",
    charge: "The complete charge exactly as printed on the certified disposition",
    grounds: "See the selected statutory route and all attached certified records",
    arrestAgency: "Law-enforcement agency identified on the certified arrest record",
    detentionAgency: "Every booking, detention, and records-holding agency identified by the participant"
  }
};

function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, INDEX_PATH), "utf8"));
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  return SOURCES.map((source) => {
    const entry = index.entries.find((candidate) => candidate.path === source.path);
    assert.ok(entry, `missing committed index entry: ${source.path}`);
    const absolute = resolver.resolve(entry);
    assert.ok(absolute && fs.existsSync(absolute), `source custody is not mounted: ${source.path}`);
    const bytes = fs.readFileSync(absolute);
    assert.equal(sha256(bytes), source.sha256, `source hash drift: ${source.path}`);
    return { ...source, absolute, bytes, byteLength: bytes.length };
  });
}

function pageOf(field, pages) {
  const widget = field.acroField.getWidgets()[0];
  if (!widget) return 1;
  const parent = widget.P();
  let index = pages.findIndex((page) => page.ref === parent);
  if (index < 0) index = pages.findIndex((page) => (page.node.Annots()?.asArray() ?? []).some((ref) => ref === widget.ref));
  return index < 0 ? 1 : index + 1;
}

const REQUIRED_LABELS = {
  "CR-65:Text2": "Last four digits of your Social Security Number",
  "CR-65:COUNTY and it was given Court Case Number": "County where any previous expungement was filed",
  "CR-65:was     granted": "Court case number of any previous expungement",
  "C-10-CRIMINAL:undefined_2": "Your monthly gross income",
  "C-10-CRIMINAL:undefined_3": "Your spouse's monthly gross income, unless this is a marital offense",
  "C-10-CRIMINAL:undefined_4": "Your other monthly earnings, including commissions, bonuses, and interest",
  "C-10-CRIMINAL:undefined_5": "Combined monthly income of other household members",
  "C-10-CRIMINAL:undefined_6": "Monthly unemployment, workers' compensation, Social Security, retirement, or similar income",
  "C-10-CRIMINAL:undefined_7": "Child support or alimony received each month",
  "C-10-CRIMINAL:undefined_8": "Other monthly income amount",
  "C-10-CRIMINAL:undefined_9": "Total monthly gross income (item 3a)",
  "C-10-CRIMINAL:undefined_10": "Monthly rent or mortgage expense",
  "C-10-CRIMINAL:undefined_11": "Total monthly utility expense",
  "C-10-CRIMINAL:undefined_12": "Monthly food expense",
  "C-10-CRIMINAL:undefined_13": "Monthly clothing expense",
  "C-10-CRIMINAL:undefined_14": "Monthly health-care or medical-insurance expense",
  "C-10-CRIMINAL:undefined_15": "Monthly car-payment or transportation expense",
  "C-10-CRIMINAL:undefined_16": "Monthly loan-payment expense",
  "C-10-CRIMINAL:undefined_17": "Monthly credit-card-payment expense",
  "C-10-CRIMINAL:undefined_18": "Monthly educational or employment expense",
  "C-10-CRIMINAL:undefined_19": "Monthly cell-phone expense",
  "C-10-CRIMINAL:undefined_20": "Additional description of other monthly expenses",
  "C-10-CRIMINAL:undefined_21": "Other monthly expense amount",
  "C-10-CRIMINAL:undefined_22": "Monthly-expense subtotal (item 3b)",
  "C-10-CRIMINAL:undefined_23": "Monthly child-support or alimony expense subtotal (item 3c)",
  "C-10-CRIMINAL:undefined_24.0": "Monthly exceptional-expense subtotal (item 3d)",
  "C-10-CRIMINAL:undefined_24.1": "Total monthly expenses (item 3e)",
  "C-10-CRIMINAL:undefined_25": "Total monthly gross income minus total monthly expenses",
  "C-10-CRIMINAL:undefined_26": "Cash, bank funds, stocks, bonds, or certificates of deposit",
  "C-10-CRIMINAL:undefined_27": "Equity in real estate",
  "C-10-CRIMINAL:undefined_28": "Equity in personal property",
  "C-10-CRIMINAL:undefined_29": "Other asset amount",
  "C-10-CRIMINAL:undefined_30": "Value of any other property described",
  "C-10-CRIMINAL:undefined_31": "Total assets",
};

function requiredLabel(documentId, name, page) {
  return REQUIRED_LABELS[`${documentId}:${name}`] ?? `Complete "${name}" on ${documentId} page ${page}`;
}

function knownValue(documentId, name, page, fixture) {
  const key = name.toLowerCase();
  if (isAlabamaClerkAssignedCaseNumber({ documentId, fieldName: name, page })) return null;
  /*
   * CR-65's opaque Text names are not interchangeable. Text2 is the last-four
   * SSN blank, Text3 is the underlying court record to be expunged, and Text1,
   * Text4, Text5 and Text7 are repeated clerk-assigned caption boxes. The
   * dedicated classifier above removes those caption boxes before any loose
   * name rule runs. Only Text3 is the held underlying case number.
   */
  if (documentId === "CR-65" && key === "text2") return null;
  if (documentId === "CR-65" && key === "text3") return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "CR-65" && key === "county and it was given court case number") return null;
  if (documentId === "CR-65" && key === "telephone number_2") return null;
  if (documentId === "C-10-CRIMINAL" && key === "text4") return [fixture.dob, "participant.date_of_birth"];
  if (documentId === "C-10-CRIMINAL" && key === "undefined") return [fixture.cityStateZip, "participant.city_state_zip"];
  if (/spouse|employer/.test(key)) return null;
  if (/court case number/.test(key)) return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "CR-65" && key === "name of county") return [fixture.county, "matter.filing_county"];
  if (/^last name$/.test(key)) return [fixture.last, "participant.last_name"];
  if (/^first name$/.test(key)) return [fixture.first, "participant.first_name"];
  if (/^middle name$/.test(key)) return [fixture.middle, "participant.middle_name"];
  if (/full name|printed name of petitioner|print or type name/.test(key)) return [fixture.full, "participant.full_legal_name"];
  if (/street address|complete home address/.test(key)) return [fixture.street, "participant.street_address"];
  if (/city state zip code/.test(key)) return [fixture.cityStateZip, "participant.city_state_zip"];
  if (/email address$/.test(key)) return [fixture.email, "participant.email"];
  if (/telephone number|telephone number cell/.test(key) && !/attorney|server/.test(key)) return [fixture.phone, "participant.phone"];
  if (/date of birth/.test(key)) return [fixture.dob, "participant.date_of_birth"];
  if (documentId === "C-10-CRIMINAL" && key === "in the") return ["Circuit", "matter.court_type"];
  if (documentId === "C-10-CRIMINAL" && key === "court of") return [fixture.county, "matter.filing_county"];
  if (documentId === "C-10-CRIMINAL" && key === "v") return [fixture.full, "participant.full_legal_name"];
  return null;
}

function protectedField(documentId, name, page) {
  const key = name.toLowerCase();
  if (isAlabamaClerkAssignedCaseNumber({ documentId, fieldName: name, page })) return true;
  if (documentId === "C-10-CRIMINAL" && page >= 3) return true;
  if (documentId === "C-10-CRIMINAL" && page === 2 && ["1", "day of", "undefined_32", "2", "text1"].includes(key)) return true;
  if (documentId === "CR-65" && page === 7) return true;
  if (documentId === "CR-65" && page === 6 && ["text8", "text26", "text9", "text10"].includes(key)) return true;
  return /signature|notary|officer authorized|my commission expires|dated this|^day of$|^date$/.test(key);
}

function attorneyField(documentId, name, page) {
  const key = name.toLowerCase();
  if (documentId === "CR-65" && page === 6 && ["city", "state", "zip code", "telephone number_2", "email address_2"].includes(key)) return true;
  return /attorney|state bar|business address of attorney|email address_2|telephone number_2/.test(key);
}


/*
 * BOTH OUTPUT-BYTE GLYPH READINGS, READ FROM THE PRODUCED PDF.
 *
 * This host wrote `addedGlyphsReadFromOutputBytes: 0` as a LITERAL for every
 * family it builds. That is not a reading, and on this family it was false: the
 * delivered canonical page set carries 402 glyphs in 30 flattened appearance
 * streams, and the boundary fixture carries 652. A reading that is typed rather
 * than measured cannot report a defect, which is the whole reason the two
 * readings exist.
 *
 * Every value this pipeline writes reaches the page through flatten(), as a
 * `/FlatWidget-* Do` inside its own `q ... cm ... Q`, so the glyphs the packet
 * ADDED are exactly the glyphs inside those XObjects. Each string is decoded
 * against the font named by the stream's own /Tf rather than a guess: these are
 * simple fonts (/Helvetica, /ZaDb), one byte per glyph, and a composite font
 * would need two -- so the encoding is asserted rather than assumed, and an
 * unrecognised one refuses instead of counting wrong.
 */
function measureOutputByteGlyphs(bytes) {
  const text = bytes.toString("latin1");
  // Only the flattened appearance XObjects, which is where every added value is.
  const streams = [];
  const objects = /(\d+) 0 obj\b([\s\S]*?)\bendobj/g;
  let m;
  while ((m = objects.exec(text))) {
    const body = m[2];
    if (!/\/Subtype\s*\/Form/.test(body)) continue;
    const stream = /stream\r?\n([\s\S]*?)\r?\nendstream/.exec(body);
    if (!stream) continue;
    let content = stream[1];
    if (/\/Filter\s*\/FlateDecode/.test(body)) {
      try { content = zlib.inflateSync(Buffer.from(stream[1], "latin1")).toString("latin1"); } catch { continue; }
    }
    streams.push(content);
  }
  let total = 0, nonWhitespace = 0, operators = 0;
  for (const content of streams) {
    const font = /\/(\w+)\s+[\d.]+\s+Tf/.exec(content);
    // Simple fonts only. Anything else is refused rather than miscounted.
    if (font && !["Helvetica", "ZaDb"].includes(font[1])) {
      throw new Error(`glyph reading refuses an unasserted font encoding: /${font[1]}`);
    }
    const shows = /(\[(?:[^\]\\]|\\.)*\]|\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]*>)\s*(?:TJ|Tj|'|")/g;
    let s;
    while ((s = shows.exec(content))) {
      operators += 1;
      const parts = s[1].startsWith("[")
        ? (s[1].match(/\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]*>/g) ?? [])
        : [s[1]];
      for (const part of parts) {
        const inner = part.slice(1, -1);
        const drawn = part.startsWith("<")
          ? (inner.replace(/\s+/g, "").match(/.{2}/g) ?? []).map((c) => String.fromCharCode(parseInt(c, 16))).join("")
          : inner.replace(/\\([nrtbf()\\])/g, "$1").replace(/\\[0-7]{1,3}/g, "?");
        for (const ch of drawn) { total += 1; if (!/\s/.test(ch)) nonWhitespace += 1; }
      }
    }
  }
  return { addedGlyphsReadFromOutputBytes: total, nonWhitespaceGlyphs: nonWhitespace, textShowingOperators: operators };
}

/*
 * The second way a value gets shortened: the box, not the maxLength.
 *
 * Lifting the widget's maximum length was necessary and was not sufficient.
 * None of the 216 fields on these two forms declares a maxLength at all, so the
 * slice above never fired and the guessed "6pt if longer than 36 characters"
 * was the only thing standing between a long value and the widget's own clip
 * path. It was not enough. On the boundary fixture the case number
 * CC-2024-000001.99 measured 72.48pt of Helvetica 8 inside CR-65 page 1 field
 * Text2, whose appearance clips at 65.24pt, so all six Alabama families
 * rendered that petition reading CC-2024-000001.9 -- a different case number,
 * on a document sworn under penalty of perjury. Every one of the nine counters
 * read zero throughout, because the value recorded in the field map was
 * complete; only the ink was short.
 *
 * So the size is measured against the box the value is actually drawn in, with
 * the same Helvetica metrics the appearance stream uses, and stepped down only
 * as far as it has to go. A value that cannot be made to fit legibly fails the
 * build instead of being drawn clipped, because a value a reader will misread
 * is worse than a build that stops.
 */
const FONT_SIZE_LADDER = [8, 7, 6, 5];
const HELVETICA_METRICS = StandardFontEmbedder.for(StandardFonts.Helvetica);

function drawableWidthOf(field) {
  const widget = field.acroField.getWidgets()[0];
  if (!widget) return null;
  // pdf-lib's generated appearance insets the clip path by 1pt on each side and
  // starts the text 1pt in from the left edge, so this is what the reader sees.
  return widget.getRectangle().width - 2;
}

function safeSet(field, value) {
  const max = typeof field.getMaxLength === "function" ? field.getMaxLength() : undefined;
  if (max && max < value.length) field.removeMaxLength();
  const available = drawableWidthOf(field);
  const size = available === null
    ? 8
    : FONT_SIZE_LADDER.find((candidate) => HELVETICA_METRICS.widthOfTextAtSize(value, candidate) <= available);
  assert.ok(size, `value does not fit its box at ${FONT_SIZE_LADDER[FONT_SIZE_LADDER.length - 1]}pt and must not be drawn clipped: ${field.getName()} = ${value}`);
  field.setFontSize(size);
  field.setText(value);
  return value;
}

async function fillDocument(source, fixtureName, fixture, config) {
  const document = await PDFDocument.load(source.bytes);
  const form = document.getForm();
  const pages = document.getPages();
  const writes = [];
  const refusals = [];
  for (const field of form.getFields()) {
    const name = field.getName();
    const page = pageOf(field, pages);
    const id = `${source.documentId}:${name}`;
    if (field instanceof PDFCheckBox) {
      if (source.documentId === "C-10-CRIMINAL" && name === "Check Box1.0") {
        field.check();
        writes.push({ fieldId: id, fieldName: name, effectiveLabel: "State of Alabama circuit-court caption branch (selection)", documentId: source.documentId, page, factId: "route.court_caption", isSelectionControl: true, routeDetermined: true });
      } else if (source.documentId === "CR-65" && config.selected.includes(name)) {
        field.check();
        writes.push({ fieldId: id, fieldName: name, effectiveLabel: `${config.routeSummary} (selection)`, documentId: source.documentId, page, factId: "route.selection", isSelectionControl: true, routeDetermined: true });
      } else if (classifyAlabamaC10Relief(id)) {
        refusals.push({ fieldId: id, fieldName: name, documentId: source.documentId, page, ...classifyAlabamaC10Relief(id) });
      } else if (classifyAlabamaC10Municipality({ fieldId: id, filingRule: config.filingRule, trackId: config.trackId })) {
        refusals.push({ fieldId: id, fieldName: name, documentId: source.documentId, page, ...classifyAlabamaC10Municipality({ fieldId: id, filingRule: config.filingRule, trackId: config.trackId }) });
      } else if (protectedField(source.documentId, name, page)) {
        refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Court or later-completion control: ${name}`, documentId: source.documentId, page, reason: "court, clerk, prosecutor, agency, or hearing field; never prefilled", refusalClass: "court_prosecutor_clerk_or_agency_owned", role: "court" });
      } else {
        refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Participant choice: ${name} (selection)`, documentId: source.documentId, page, reason: "A genuine participant election not determined by this route", refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true, routeDetermined: false });
      }
      continue;
    }
    if (!(field instanceof PDFTextField)) continue;
    const known = knownValue(source.documentId, name, page, fixture);
    if (known && !protectedField(source.documentId, name, page)) {
      const drawnText = safeSet(field, known[0]);
      writes.push({ fieldId: id, fieldName: name, effectiveLabel: name, documentId: source.documentId, page, factId: known[1], drawnText });
    } else if (protectedField(source.documentId, name, page)) {
      const clerkAssigned = classifyAlabamaClerkAssignedCaseNumber({ documentId: source.documentId, fieldName: name, page });
      refusals.push({ fieldId: id, fieldName: name, documentId: source.documentId, page,
        ...(clerkAssigned ?? { effectiveLabel: `Signature, court, or later-completion field: ${name}`, reason: "signature or date field; never prefilled", refusalClass: "signature_or_date_participant_completion", role: "protected" }) });
    } else if (attorneyField(source.documentId, name, page)) {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Attorney field: ${name}`, documentId: source.documentId, page, reason: "attorney-only; no representation fact is held", role: "attorney" });
    } else if (classifyAlabamaC10Municipality({ fieldId: id, filingRule: config.filingRule, trackId: config.trackId })) {
      refusals.push({ fieldId: id, fieldName: name, documentId: source.documentId, page, ...classifyAlabamaC10Municipality({ fieldId: id, filingRule: config.filingRule, trackId: config.trackId }) });
    } else {
      const label = requiredLabel(source.documentId, name, page);
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: label, documentId: source.documentId, page, reason: "The platform does not hold this participant or case fact; supply it before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false, routeDetermined: false, role: "participant" });
    }
  }
  const font = await document.embedFont(StandardFonts.Helvetica);
  // BEFORE appearances are regenerated and before flatten: both read the widget
  // rectangle back through the same accessor, so a rectangle normalised here is
  // normalised for both. See normalizeInvertedWidgetRectangles.
  const invertedRects = config.normalizeInvertedWidgetRects
    ? normalizeInvertedWidgetRectangles(document, form)
    : null;
  form.updateFieldAppearances(font);
  form.flatten();
  document.setTitle(`${source.documentId} - ${fixtureName}`);
  document.setAuthor("LegalEase packet factory");
  document.setCreator("LegalEase deterministic official-form builder");
  document.setProducer("pdf-lib 1.17.1");
  document.setCreationDate(FIXED_DATE);
  document.setModificationDate(FIXED_DATE);
  return { document, writes, refusals, invertedRects };
}

async function buildPacket(sources, fixtureName, fixture, config) {
  const filled = [];
  for (const source of sources) filled.push({ source, ...(await fillDocument(source, fixtureName, fixture, config)) });
  const packet = await PDFDocument.create();
  for (const item of filled) {
    const copied = await packet.copyPages(item.document, item.document.getPageIndices());
    copied.forEach((page) => packet.addPage(page));
  }
  packet.setTitle(`${config.familyId} ${fixtureName} filing packet`);
  packet.setAuthor("LegalEase packet factory");
  packet.setCreator("LegalEase deterministic official-form builder");
  packet.setProducer("pdf-lib 1.17.1");
  packet.setCreationDate(FIXED_DATE);
  packet.setModificationDate(FIXED_DATE);
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  const reopened = await PDFDocument.load(bytes);
  assert.equal(reopened.getPageCount(), sources.reduce((sum, source) => sum + filled.find((item) => item.source.documentId === source.documentId).document.getPageCount(), 0));
  assert.equal(reopened.getForm().getFields().length, 0, "flattened packet must carry no live fields");
  const invertedRects = filled.map((item) => item.invertedRects).filter(Boolean);
  return { bytes, pageCount: reopened.getPageCount(), writes: filled.flatMap((item) => item.writes), refusals: filled.flatMap((item) => item.refusals),
    invertedRects: invertedRects.length > 0
      ? { perSource: filled.filter((item) => item.invertedRects).map((item) => ({ documentId: item.source.documentId, ...item.invertedRects })),
          normalizedCount: invertedRects.reduce((sum, report) => sum + report.normalizedCount, 0) }
      : null };
}


/*
 * Both guides, generated from the bound legal record rather than retyped.
 *
 * This family was carved out of the shared Alabama host into its own builder,
 * and the guides were carried across as hardcoded template literals. Two things
 * followed from that. The guides stopped being derived from AL.memo.json, so
 * they could not move when the record moved; and one sentence they carried --
 * "Sign the petition under oath before an authorized officer or notary only
 * after every required item and attachment is complete." -- directs a step the
 * record expressly does not establish. AL.memo.json rules.notarization for this
 * track reads "The source review does not state a notarization requirement for
 * CR-65." Directing notarization anyway imposes a step, a cost and a delay on
 * the participant that no source in this packet supports, and contradicted the
 * four sibling Alabama packets built from the same form, which quote that
 * sentence and tell the participant to ask the circuit clerk instead.
 *
 * So the guides are generated here from the memo and bound to its digest, in
 * the same shape the shared host produces: what the record establishes, quoted;
 * a numbered before-you-file sequence; the named blanks; service with its
 * honest residue; notarization as a question for the clerk rather than a
 * direction; and every stop condition the record holds, verbatim.
 */
/*
 * CR-65 prints elections that this route does not determine, so this packet
 * ticks none of them. Until this repair the guide named none of them either.
 *
 * The mechanism: production-field-map.json classifies every one of them as
 * `participant_sworn_narrative_or_legal_election` with `requiredBeforeFiling`
 * false, and "Blanks you must fill in" prints only refusals carrying
 * `requiredBeforeFiling` true. So a MANDATORY sworn selection, on the page
 * headed "I swear or affirm, under the penalty of perjury:", reached no page
 * the participant reads -- while the two blanks that hang off its SECOND
 * branch were printed in that list unconditionally, under the sentence "Fill
 * every one ... before filing". A participant who has never sought an
 * expungement and follows that literally writes a county and a case number for
 * a prior expungement that does not exist, on a sworn page, while the
 * attestation governing those two blanks stays empty.
 *
 * No counter sees this. requiredOptionsMissing reads the field map as its
 * classification authority, and the field map says these are not required.
 *
 * Every string below is a line CR-65 ITSELF prints. None of them is this
 * packet's characterisation of Alabama law: "must", "either item 1 or item 2"
 * and "Select one of the following" are the form's own words. They are re-read
 * out of the DELIVERED bytes on every build by assertPrintedElections(), which
 * refuses the build if a quoted line is no longer printed on the page this
 * guide attributes it to.
 */
const PRINTED_ELECTIONS = {
  attachments: {
    page: 5,
    heading: "Attached to this Petition are: (Petition must include either item 1 or item 2; All Petitions must include item 3.)",
    options: [
      "[ ] (1) a certified record of arrest from the appropriate agency for the court record I seek to have",
      "[ ] (2) a certified record of disposition or a certified record of the case action summary from the",
      "[ ] (3) a certified official criminal record obtained from the Alabama Law Enforcement Agency (ALEA)."
    ]
  },
  swornSelectOne: {
    page: 6,
    oath: "I swear or affirm, under the penalty of perjury:",
    heading: "(3)(Select one of the following):",
    firstBranch: "[ ] that I have not previously applied for an expungement in this or any other jurisdiction.",
    secondBranchOpening: "[ ] that I have previously filed for an expungement. My previous expungement was filed in",
    grantedDenied: "was [ ] granted [ ] denied."
  },
  proSe: { page: 6, line: "[ ] pro se (Not represented by an attorney)" }
};

/* Every quoted line, with the delivered page it is attributed to. */
function quotedElectionLines() {
  const { attachments: a, swornSelectOne: s, proSe: p } = PRINTED_ELECTIONS;
  return [
    [a.page, a.heading], ...a.options.map((line) => [a.page, line]),
    [s.page, s.oath], [s.page, s.heading], [s.page, s.firstBranch],
    [s.page, s.secondBranchOpening], [s.page, s.grantedDenied],
    [p.page, p.line]
  ];
}

/*
 * The two blanks that exist only on the SECOND branch of the page-6 select-one.
 * Keyed by field id rather than by label so a label rewrite cannot silently
 * drop the condition.
 */
const SECOND_BRANCH_ONLY = new Set([
  "CR-65:COUNTY and it was given Court Case Number",
  "CR-65:was     granted"
]);
const SECOND_BRANCH_CONDITION = "only if you tick the SECOND box in item (3) on CR-65 page 6";

function electionsSection() {
  const a = PRINTED_ELECTIONS.attachments;
  const s = PRINTED_ELECTIONS.swornSelectOne;
  return `## Elections on CR-65 that this packet has not made

CR-65 prints choices that turn on facts this packet does not hold. It ticks
none of them, and the list above does not name them, because the field map
classifies them as elections rather than as blanks owed before filing. They are
still choices the form makes you make. Every line quoted below was read back
out of the delivered petition at build time, on the page named beside it.

**Page ${a.page} - what you attach.** The form prints:

> ${a.heading}

and three boxes under it:

${a.options.map((line) => `> ${line}`).join("\n>\n")}

All three are blank in this packet. Tick them yourself to match what you are
actually attaching, following the rule the form prints above them.

**Page ${s.page} - the sworn select-one.** Under the printed line

> ${s.oath}

the form prints

> ${s.heading}

and offers two boxes. The first reads:

> ${s.firstBranch}

The second begins:

> ${s.secondBranchOpening}

and runs on into a blank for the county it was filed in, a blank for its court
case number, and the printed pair

> ${s.grantedDenied}

Both boxes are blank in this packet, on both fixtures. Tick the one that is
true of you. It sits under the perjury line, so tick it before you sign.

The county, the case number and the granted-or-denied pair belong to the second
box alone. If you tick the first box, leave all three of them empty - that is
why they are listed above marked "${SECOND_BRANCH_CONDITION}".

**Page ${PRINTED_ELECTIONS.proSe.page} - the pro se box.** Beside the signature line the form prints:

> ${PRINTED_ELECTIONS.proSe.line}

It is blank in this packet, and this packet writes nothing into the attorney
block beside it, because it holds no representation fact for you.`;
}

/*
 * Read the delivered PDF's own printed lines back out of its page content
 * streams. A quotation this packet attributes to a printed page must be on
 * that printed page.
 */
async function printedLinesOf(file, page) {
  const doc = await PDFDocument.load(fs.readFileSync(file), { updateMetadata: false });
  const target = doc.getPages()[page - 1];
  assert.ok(target, `${path.basename(file)} has no page ${page}`);
  return groupIntoLines(extractTextItems(target)).map((line) => String(line.text ?? "").replace(/\s+/g, " ").trim());
}

async function assertPrintedElections(out) {
  for (const fixture of ["canonical.pdf", "boundary.pdf"]) {
    const file = path.join(out, "fixtures", fixture);
    const cache = new Map();
    for (const [page, quoted] of quotedElectionLines()) {
      if (!cache.has(page)) cache.set(page, await printedLinesOf(file, page));
      const want = quoted.replace(/\s+/g, " ").trim();
      assert.ok(cache.get(page).includes(want),
        `${fixture} page ${page} does not print the line this guide quotes: ${JSON.stringify(quoted)}`);
    }
  }
}

function writeGuides({ out, familyId, config, rules, track, memoDigest, required }) {
  const requiredList = required.map((row) =>
    `- ${row.effectiveLabel}${SECOND_BRANCH_ONLY.has(row.fieldId) ? ` - ${SECOND_BRANCH_CONDITION}` : ""}`).join("\n");
  const provenance = [
    "Every quoted line below is taken verbatim from the Alabama legal-design record",
    `\`${MEMO_PATH}\`, track \`${config.trackId}\` (sha256 ${memoDigest}).`,
    "Where that record does not establish something, this packet says so rather than guessing."
  ].join(" ");
  const heldRecord = [
    `- Where to file: "${rules.filing}"`,
    `- Filing fee: "${rules.fees}"`,
    `- Fee waiver: "${rules.feeWaiver}"`,
    `- Notice: "${rules.notice}"`,
    `- Service: "${rules.service}"`,
    `- Who signs: "${rules.participantSignature}"`,
    `- Oath and verification: ${alabamaOathGuidance()}`
  ].join("\n");
  const beforeFiling = [
    ...(track.supportingDocuments ?? []).map((doc, index) =>
      `${index + 1}. Obtain: ${doc.name}. Where from: ${doc.obtainedFrom}. How: ${doc.howToObtain}`),
    `${(track.supportingDocuments ?? []).length + 1}. ${config.recordComparison}`,
    `${(track.supportingDocuments ?? []).length + 2}. Fill in every blank listed under "Blanks you must fill in" below. Each one is a fact this packet does not hold for you.`,
    `${(track.supportingDocuments ?? []).length + 3}. Decide the fee. The record states: "${rules.fees}" If you claim indigency, complete C-10-CRIMINAL and tick the third printed relief request yourself. This packet ticks none of the three requests. The judge completes its order page.`,
    ...(track.manualCompletionItems ?? []).map((item, index) =>
      `${(track.supportingDocuments ?? []).length + 4 + index}. ${item.item} on ${item.whereInPacket}, and only after everything above is done. ${item.why} This packet deliberately leaves your signature and every date blank; do not sign or date early.`)
  ].join("\n");
  const stops = (track.selfHelpStopConditions ?? []).map((stop) => `- ${stop}`).join("\n");
  fs.writeFileSync(path.join(out, "participant-instructions.md"), `# Alabama expungement packet - ${familyId}

## Route selected

${config.routeSummary}

## What the held record establishes

${provenance}

${heldRecord}

## Do these before you file

${beforeFiling}

## Blanks you must fill in

Each line names a blank on the paper that this packet did not fill because it
does not hold that fact. Fill every one on both the canonical and the
boundary-style packet before filing - except the lines that carry an "only if"
condition, which belong to a box on page 6 you may not be ticking. The section
below names that box.

${requiredList}

${electionsSection()}

${alabamaC10ReliefSection(rules)}

## Service

The record states: "${rules.service}" Serve the district attorney, the
law-enforcement agency whose records you are asking the court to expunge, and
the clerk of the court for the county where the charge was filed. Use a
separate CR-65 page 7 certificate of service for each recipient.

The held record does not state which service method Alabama requires for this
petition, and this packet will not guess one. Ask the circuit clerk in the
filing county which method that court accepts before you serve. Complete the
service date, method, recipient, address and server signature on each
certificate only after service has actually happened.

## Notarization

${alabamaOathGuidance()}

## Stop and get help

Stop using automated assistance and speak with an Alabama lawyer if any of these
is true:

${stops}
`);
  fs.writeFileSync(path.join(out, "filing-instructions.md"), `# Filing instructions - ${familyId}

${provenance}

- Where to file: "${rules.filing}"
- Destination: ${track.destination?.name ?? "not stated in the record"}${track.destination?.detail ? ` — "${track.destination.detail}"` : ""}
- Filing fee: "${rules.fees}"
- Fee waiver: "${rules.feeWaiver}"
- Notice: "${rules.notice}"
- Oath and verification: ${alabamaOathGuidance()}

The C-10-CRIMINAL affidavit included in this packet is the fee-waiver form.
Complete it only if you are claiming indigency; the judge completes its order
page. Do not sign or date the petition until every required blank and every
attachment above is complete.
`);
}

async function assertRepairInvariants(out) {
  const fieldMap = JSON.parse(fs.readFileSync(path.join(out, "production-field-map.json"), "utf8"));
  const instructions = fs.readFileSync(path.join(out, "participant-instructions.md"), "utf8");
  const written = new Set(fieldMap.writes.map((row) => row.fieldId));
  for (const forbidden of [
    "C-10-CRIMINAL:Spouses Full Name if married",
    "C-10-CRIMINAL:Employers Telephone Number",
    "C-10-CRIMINAL:MUNICIPALITY OF",
    "CR-65:COUNTY and it was given Court Case Number",
    "CR-65:Text2",
    "CR-65:Telephone Number_2",
  ]) assert.ok(!written.has(forbidden), `semantically invalid write remains: ${forbidden}`);
  assert.ok(written.has("C-10-CRIMINAL:Check Box1.0"), "state-court caption branch must be selected");
  assert.ok(written.has("C-10-CRIMINAL:COURT OF"), "state-court caption must include filing county");
  assert.ok(!fieldMap.writes.some((row) => ["matter.charge", "matter.expungement_ground", "matter.arresting_agency", "matter.detention_agencies"].includes(row.factId)), "generic directions must not be written as held case facts");
  for (const refusal of fieldMap.refusals.filter((row) => row.requiredBeforeFiling)) {
    assert.ok(!/\b(?:undefined(?:_\d+(?:\.\d+)?)?|Text\d+)\b/.test(refusal.effectiveLabel), `opaque required-before-filing label remains: ${refusal.fieldId}`);
  }
  assert.match(instructions, /certified local record/i);
  assert.match(instructions, /90 days/i);
  assert.match(instructions, /signature/i);
  assert.match(instructions, /fee waiver/i);
  assert.match(instructions, /licensing or firearm consequences/i);

  /*
   * The inverted safeguard, removed.
   *
   * This function used to assert `assert.match(instructions, /notary/i)` -- it
   * REQUIRED the guide to mention a notary, on a track whose record states
   * "The source review does not state a notarization requirement for CR-65."
   * A check that fails when an unsupported direction is taken out is not a
   * safeguard; it pins the defect in place and would have refused this repair.
   *
   * What replaces it asks the opposite question, and each assertion below fires
   * on the bytes this family shipped before this repair. The nine counters see
   * none of it: they audit whether a blank was classified, never whether an
   * instruction is true.
   */
  const filing = fs.readFileSync(path.join(out, "filing-instructions.md"), "utf8");

  assert.match(instructions, /CR-65 Rev\. 10\/2024, page 8 instructions for PAGE 6/);
  assert.match(instructions, /official authorized to administer oaths or a notary public/);
  assert.match(filing, /official authorized to administer oaths or a notary public/);
  assert.doesNotMatch(instructions, /ask the circuit clerk.*whether.*requires/si);

  // The guide must quote the record it is derived from, and be bound to its digest.
  const memoBytes = fs.readFileSync(path.join(ROOT, MEMO_PATH));
  const memo = JSON.parse(memoBytes.toString("utf8"));
  const track = memo.tracks.find((entry) => entry.trackId === FAMILY_CONFIG[fieldMap.familyId].trackId);
  assert.ok(track, "the guide's track must be present in the memo");
  for (const heading of ["## What the held record establishes", "## Do these before you file", "## Notarization"]) {
    assert.ok(instructions.includes(heading), `guide section missing: ${heading}`);
  }
  assert.ok(instructions.includes(sha256(memoBytes)), "the guide must carry the digest of the record it quotes");
  assert.ok(!instructions.includes(`Notarization: "${track.rules.notarization}"`), "stale memo uncertainty must not override CR-65's printed oath instruction");
  const municipality = fieldMap.refusals.find((row) => row.fieldId === "C-10-CRIMINAL:MUNICIPALITY OF");
  const municipalChoice = fieldMap.refusals.find((row) => row.fieldId === "C-10-CRIMINAL:Check Box1.1");
  for (const row of [municipality, municipalChoice]) {
    assert.equal(row?.completenessDisposition, "NOT_APPLICABLE_ON_THIS_ROUTE");
    assert.equal(row?.requiredBeforeFiling, false);
  }
  assert.match(instructions, new RegExp(`^## ${AL_C10_RELIEF_TITLE}$`, "m"));
  for (const option of AL_C10_RELIEF_OPTIONS) {
    const row = fieldMap.refusals.find((candidate) => candidate.fieldId === option.fieldId);
    assert.ok(row?.disclosedToParticipant, `${option.fieldId} must be disclosed`);
    assert.ok(!written.has(option.fieldId));
  }

  // Every supporting document the record marks required-before-filing, named
  // with its source and its method rather than merely mentioned.
  for (const doc of (track.supportingDocuments ?? []).filter((row) => row.requiredBeforeFiling)) {
    assert.ok(instructions.includes(doc.name), `required-before-filing document missing from the guide: ${doc.name}`);
    assert.ok(instructions.includes(doc.obtainedFrom), `where to obtain it missing from the guide: ${doc.name}`);
    assert.ok(instructions.includes(doc.howToObtain), `how to obtain it missing from the guide: ${doc.name}`);
  }

  /*
   * This route elects nothing on the petition, so the guide must hand the
   * election back by naming every printed outcome the record recognises. A
   * guide that names fewer than all five narrows a sworn election for the
   * participant by omission.
   */
  assert.equal(FAMILY_CONFIG[fieldMap.familyId].selected.length, 0, "this route must not check a Section III outcome for the participant");
  for (const disposition of track.eligibleDispositions ?? []) {
    assert.ok(instructions.includes(disposition), `eligible disposition missing from the guide: ${disposition}`);
  }

  /*
   * The sworn elections CR-65 makes the participant make.
   *
   * These four assertions each fire on the bytes this family shipped before
   * this repair: the guide named none of the page-5 attachment boxes, none of
   * the page-6 select-one, and none of the pro se box, and it listed the two
   * second-branch blanks with no condition on them at all.
   */
  for (const [, quoted] of quotedElectionLines()) {
    assert.ok(instructions.includes(quoted),
      `the guide does not carry the line CR-65 prints: ${JSON.stringify(quoted)}`);
  }
  assert.ok(instructions.includes(SECOND_BRANCH_CONDITION),
    "the guide must state the condition the two previous-expungement blanks hang on");
  for (const fieldId of SECOND_BRANCH_ONLY) {
    const row = fieldMap.refusals.find((r) => r.fieldId === fieldId);
    assert.ok(row, `a second-branch blank left the field map: ${fieldId}`);
    const line = instructions.split("\n").find((l) => l.startsWith(`- ${row.effectiveLabel}`));
    assert.ok(line, `a second-branch blank left the guide's blank list: ${fieldId}`);
    assert.ok(line.includes(SECOND_BRANCH_CONDITION),
      `a conditional blank is listed unconditionally: ${row.effectiveLabel}`);
  }
  /*
   * And none of the elections the guide now discloses may be ticked FOR the
   * participant on the pages it discloses them on. Disclosure and refusal are
   * two halves of the same statement; either one alone is false.
   */
  for (const row of fieldMap.refusals) {
    if (!row.isSelectionControl) continue;
    if (row.documentId !== "CR-65") continue;
    if (![PRINTED_ELECTIONS.attachments.page, PRINTED_ELECTIONS.swornSelectOne.page].includes(row.page)) continue;
    assert.ok(!written.has(row.fieldId),
      `a page-${row.page} election this guide hands to the participant is ticked by the build: ${row.fieldId}`);
  }
  await assertPrintedElections(out);

  // SELF_HELP_STOP: every stop the record holds, verbatim, not a paraphrase.
  for (const stop of track.selfHelpStopConditions ?? []) {
    assert.ok(instructions.includes(stop), `stop condition missing from the guide: ${stop}`);
  }
}

/** Read every source widget's position against the saved packet; no report literal stands in for ink. */
export async function measureAl90Packet(bytes, sources, packet, options = {}) {
  const boxes = [], baselines = {};
  let pageOffset = 0;
  for (const source of sources) {
    const pdf = await PDFDocument.load(source.bytes);
    const form = pdf.getForm();
    normalizeInvertedWidgetRectangles(pdf, form);
    baselines[source.documentId] = await baselineInk(source);
    for (const field of form.getFields()) {
      const fieldId = `${source.documentId}:${field.getName()}`;
      const write = packet.writes.find(w => w.fieldId === fieldId);
      const refusal = packet.refusals.find(w => w.fieldId === fieldId);
      if (!write && !refusal) continue;
      for (const widget of field.acroField.getWidgets()) {
        const page = pdf.getPages().findIndex(p => p.ref.toString() === widget.P()?.toString()) + 1;
        assert.ok(page > 0, `${fieldId}: no source widget page`);
        boxes.push({ fieldId, documentId: source.documentId, page, packetPage: pageOffset + page,
          rect: widget.getRectangle(), expectInk: Boolean(write), expectText: write?.drawnText });
      }
    }
    pageOffset += pdf.getPageCount();
  }
  const proof = await proveDeliveredInk(bytes, { boxes }, baselines, options);
  return { ...proof, measurementScope: 'Differential decoded glyphs and actual flattened appearance placements; source painting and visible clipping remain subject to original raster review.' };
}

export async function buildAlabamaFamily(familyId, { guidanceMapOnly = false } = {}) {
  assert.equal(familyId, "al-felony-nonconviction-90-set", "this family-owned builder may only build al-felony-nonconviction-90-set");
  const base = FAMILY_CONFIG[familyId];
  assert.ok(base, `unsupported Alabama family: ${familyId}`);
  const config = { familyId, ...base };
  const outRel = `data/rcap-all50/overlays/census-v1/al/${familyId}--official-pdf-fill`;
  const out = path.join(ROOT, outRel);
  const sources = resolveSources();
  const worklist = JSON.parse(fs.readFileSync(path.join(ROOT, WORKLIST_PATH), "utf8"));
  const family = worklist.packetFamilies.find((entry) => entry.worklistGroupId === familyId);
  assert.ok(family, `family absent from worklist: ${familyId}`);
  /*
   * The guides are generated FROM the legal record, not written alongside it.
   *
   * A retyped guide drifts from the record silently; one quoted from the record
   * and bound to its digest cannot drift without the digest moving.
   */
  const memoBytes = fs.readFileSync(path.join(ROOT, MEMO_PATH));
  const memoDigest = sha256(memoBytes);
  const memo = JSON.parse(memoBytes.toString("utf8"));
  const track = memo.tracks.find((entry) => entry.trackId === config.trackId);
  assert.ok(track, `track absent from ${MEMO_PATH}: ${config.trackId}`);
  const rules = track.rules ?? {};
  for (const key of ["filing", "fees", "feeWaiver", "notice", "service", "participantSignature", "notarization"]) {
    assert.ok(rules[key], `${config.trackId}: rules.${key} is not held; a guide may not be written past an absent rule`);
  }
  assert.ok((track.selfHelpStopConditions ?? []).length > 0, `${config.trackId}: the record holds no stop conditions`);
  config.filingRule = rules.filing;
  const packets = {};
  for (const [fixtureName, fixture] of Object.entries(FIXTURES)) packets[fixtureName] = await buildPacket(sources, fixtureName, fixture, config);
  fs.mkdirSync(path.join(out, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(out, "reports"), { recursive: true });
  if (!guidanceMapOnly) for (const [fixtureName, packet] of Object.entries(packets)) fs.writeFileSync(path.join(out, "fixtures", `${fixtureName}.pdf`), packet.bytes);
  const fieldMap = {
    schemaVersion: "rcap-production-field-map/v2", familyId, implementationStrategy: "official_pdf_fill",
    routeKeys: family.routes.map((route) => route.routeKey), routeSummary: config.routeSummary,
    writes: packets.canonical.writes.map(({ drawnText, ...row }) => row), refusals: packets.canonical.refusals
  };
  writeJson(path.join(out, "production-field-map.json"), fieldMap);
  if (!guidanceMapOnly) {
    writeJson(path.join(out, "source-receipt.json"), {
      schemaVersion: "rcap-source-receipt/v2", familyId, allSourcesExact: true,
      sources: sources.map(({ documentId, sourceId, path: sourcePath, sha256: digest, byteLength, componentKinds }) => ({ documentId, formNumber: documentId, sourceId, path: sourcePath, sha256: digest, sha256Exact: true, byteLength, componentKinds }))
    });
    const deliveredProofs = {};
    for (const [fixture, packet] of Object.entries(packets)) {
      deliveredProofs[fixture] = await measureAl90Packet(fs.readFileSync(path.join(out, "fixtures", `${fixture}.pdf`)), sources, packet);
      assert.deepEqual(deliveredProofs[fixture].invisibleWrites, [], `${fixture}: invisible writes`);
      assert.deepEqual(deliveredProofs[fixture].incompleteValues, [], `${fixture}: incomplete values`);
      assert.deepEqual(deliveredProofs[fixture].refusedFieldsWithInk, [], `${fixture}: refused fields carry added ink`);
    }
    writeJson(path.join(out, "reports", "delivered-ink-proof.json"), { familyId, derivedFromSavedBytes: true, fixtures: deliveredProofs });
    writeJson(path.join(out, "reports", "actual-writes.json"), {
      schemaVersion: "rcap-actual-writes/v2", familyId,
      documents: SOURCES.map((source) => ({ documentId: source.documentId, actualWrites: packets.canonical.writes.filter((row) => row.documentId === source.documentId) })),
      /* Measured, not typed. See measureOutputByteGlyphs. */
      artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, valuesReportedByFinalizer: packet.writes.length,
        addedGlyphsReadFromOutputBytes: deliveredProofs[fixture].addedGlyphsReadFromOutputBytes,
        flattenedWidgetAppearancesReadFromOutputBytes: deliveredProofs[fixture].flattenedWidgetAppearancePlacementsReadFromOutputBytes,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: deliveredProofs[fixture].nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
        refusedFieldsWithInk: deliveredProofs[fixture].refusedFieldsWithInk }))
    });
    writeJson(path.join(out, "reports", "rendered-artifacts.json"), {
      schemaVersion: "rcap-rendered-artifacts/v2", familyId, rasterState: "BUILT_RASTER_PENDING",
      packets: Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${outRel}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount, documents: SOURCES.map((source) => ({ documentId: source.documentId, componentKinds: source.componentKinds })) }))
    });
    writeJson(path.join(out, "approval-request.json"), {
      schemaVersion: "rcap-packet-approval-request/v2", familyId, status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill",
      routeKeys: family.routes.map((route) => route.routeKey), components: SOURCES.flatMap((source) => source.componentKinds.map((kind) => ({ kind, documentId: source.documentId }))),
      artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${outRel}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount })),
      independentVerificationStatus: "PENDING", commercialRoutesOpened: 0, productionTouched: false
    });
  }
  const required = packets.canonical.refusals.filter((row) => row.requiredBeforeFiling);
  writeGuides({ out, familyId, config, rules, track, memoDigest, required });
  if (!guidanceMapOnly) {
    writeJson(path.join(out, "reports", "build-summary.json"), {
      familyId, result: "BUILT_RASTER_PENDING", counters: { knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0, unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0, visualDefects: null },
      artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount })), selfVerified: false
    });
  }
  console.log(`${familyId}: BUILT_RASTER_PENDING; ${packets.canonical.writes.length} writes, ${packets.canonical.refusals.length} classified blanks; canonical=${sha256(packets.canonical.bytes)} boundary=${sha256(packets.boundary.bytes)}`);
}

if (pathToFileURL(process.argv[1]).href === import.meta.url) {
  const out = path.join(ROOT, "data/rcap-all50/overlays/census-v1/al/al-felony-nonconviction-90-set--official-pdf-fill");
  if (process.argv.includes("--check") || process.argv.includes("--self-test")) {
    await assertRepairInvariants(out);
    console.log("al-felony-nonconviction-90-set: repair invariants PASS");
  } else {
    await buildAlabamaFamily("al-felony-nonconviction-90-set", { guidanceMapOnly: process.argv.includes("--guidance-map-only") });
    await assertRepairInvariants(out);
  }
}
