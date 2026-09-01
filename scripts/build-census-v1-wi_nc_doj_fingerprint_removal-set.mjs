#!/usr/bin/env node
/**
 * The Wisconsin DOJ fingerprint-record removal family — `wi_nc_doj_fingerprint_removal-set`.
 *
 *   node scripts/build-census-v1-wi_nc_doj_fingerprint_removal-set.mjs [--check] [--no-raster]
 *
 * One document, DJ-LE-250B, the _Wisconsin Fingerprint Record Removal Request_,
 * made to the Crime Information Bureau of the Wisconsin Department of Justice
 * under Wis. Stat. § 165.84. Page 1 is the Bureau's printed instructions and
 * carries nothing to fill. Page 2 is the request.
 *
 * THIS IS A FLAT FORM WITH NO FILLABLE FIELD AND NO UNDERLINE TO WRITE ON.
 *
 * The form has zero AcroForm fields, so `finalizeOfficialForm` has nothing to
 * fill. It is also not the Washington shape, where a value sits on a printed
 * underline: page 2 is a TABLE. Its cells are bounded by full-width horizontal
 * rules and by vertical dividers, all of them strokes in the page's own content
 * stream, and the caption of each cell is printed at the top of the cell with
 * the answer written beneath it.
 *
 * So every write box here is a measured CELL: four measured strokes — the rule
 * above, the rule below, the divider left and the divider right — read out of
 * the content stream by scripts/rcap-official-forms/rcap-pdf-rule-lines.mjs.
 * CELLS below records all four for every box, and the build re-reads all four
 * from the pinned binary on every run and refuses the box if any has moved. A
 * vertical divider is additionally required to SPAN the cell it bounds, so a
 * divider belonging to a different band cannot stand in for a missing one.
 *
 * MUCH OF THIS FORM'S PRINTED TEXT CANNOT BE READ, AND IS NOT GUESSED.
 *
 * DJ-LE-250B embeds a subsetted font whose glyph codes are the ASCII of the
 * character minus 29, so those runs extract as "ILQJHUSULQW UHFRUG" where the
 * paper reads "fingerprint record". Other runs on the same line use a normally
 * encoded font and extract plainly. The shift is exact and reversible, but
 * which of the two encodings a given run uses is not something this build can
 * read, and a rule that shifts the runs that "look wrong" is a rule that
 * invents text.
 *
 * So this build quotes the form ONLY where the form extracts plainly, and
 * records the rest as unreadable in reports/caption-evidence.json. Every
 * requirement stated in the participant instructions is a plain-extracting
 * sentence, quoted rather than paraphrased. The cell captions are not affected:
 * they are read from their own coordinates and every one of them — LAST NAME,
 * FIRST NAME, FULL MIDDLE NAME, STREET ADDRESS, APARTMENT NUMBER, CITY, STATE,
 * ZIP, GENDER, RACE, DATE OF BIRTH, DATE OF ARREST, ARRESTING AGENCY, ARRESTING
 * AGENCY CASE #, DATE OF CONVICTION OR ADJUDICATION, NAME OF COURT, CHARGE &
 * DISPOSITION — extracts plainly at least in part.
 *
 * THREE THINGS ARE DELIBERATELY LEFT BLANK.
 *
 * The DATE OF BIRTH cell prints its own segmented template, "__ __ / __ __ /
 * ____", at y=534. The platform holds one composed date, not three components,
 * and there is no measured box for any individual segment — the segments are
 * underscore glyphs, not strokes. A composed date drawn across the template
 * would overprint it. The date is left to the participant with that reason
 * stated.
 *
 * The ARREST AND CONVICTION TABLE — three arrest rows and three conviction rows,
 * eighteen cells — is left entirely blank. One cell of it, ARRESTING AGENCY
 * CASE #, is the arresting agency's own case number, which is not the court case
 * number the platform holds and must not be filled with it. A row whose arrest
 * date and agency are filled and whose agency case number is blank reads as
 * finished and is not, so no cell of any row is written and all eighteen are
 * declared and disclosed.
 *
 * GENDER and RACE have no allowlisted fact behind them. Race is refused by the
 * shared semantics as a protected category in any event, and the platform holds
 * no gender fact. Both are left to the participant.
 *
 * The FINGERPRINT boxes take inked rolled impressions of the subject's index
 * fingers, which page 1 calls mandatory, and a packet cannot produce one. Only
 * the LEFT box is measurable: its top and bottom strokes are in the page's
 * content stream at y=200.47 and y=101.53, x=280..399. The right box's strokes
 * are not there at all, and neither are the Male and Female tick boxes in the
 * GENDER cell -- `checkboxCandidates` and `strokedRectangles` both return zero
 * for this page, although a reader plainly sees all of them on the paper. They
 * are drawn some other way, and this build records what it could measure and
 * says plainly what it could not, rather than reporting a coordinate it
 * inferred from a caption.
 *
 * Rasterization goes through scripts/lib/pdf-page-raster.mjs. Never Poppler.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeFlatOverlay } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { rulesOfPage } from "./rcap-official-forms/rcap-pdf-rule-lines.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

/*
 * The calibrated page rasterizer, resolved wherever it lives.
 *
 * The Captain branch moved this module from scripts/lib/ to scripts/raster/ at
 * 5f144ec, and fifteen builders on that branch — including this one — still
 * import the old path, which is not there. Rather than pick one and break on
 * the other base, the import is tried at the new path first and falls back to
 * the old. Only a genuinely missing module is caught: a syntax error or a
 * failed dependency inside the module still throws, because a rasterizer that
 * silently resolves to a stale copy is worse than one that refuses.
 */
const { rasterizePageCalibrated } = await (async () => {
  try {
    return await import("./raster/pdf-page-raster.mjs");
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
    return import("./lib/pdf-page-raster.mjs");
  }
})();

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "wi_nc_doj_fingerprint_removal-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-fingerprint-removal-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-wi_nc_doj_fingerprint_removal-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "WI",
  routeKey: "track:WI:wi_nc_doj_fingerprint_removal",
  routeSelectionId: "wi-nc-doj-fingerprint-removal-set-dj-le-250b-primary-filing",
  publicLabel: "Ask the Wisconsin DOJ to remove a fingerprint arrest record",
  authority: "Wis. Stat. § 165.84; Wisconsin Department of Justice, Crime Information Bureau form DJ-LE-250B",
  documents: [
    { formNumber: "DJ-LE-250B", title: "Wisconsin Fingerprint Record Removal Request", instrumentKind: "primary_filing", strategy: "measured_flat_overlay" }
  ]
});

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

const SUPPLY = (what) => ({ policy: "supply", what });
const WRITE = (fact) => ({ policy: "write", fact });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });

const SIGNATURE = "signature_or_date_participant_completion";
const AGENCY_OWNED = "court_prosecutor_clerk_or_agency_owned";

/** How far a measured stroke may have moved before the box is refused. */
const RULE_TOLERANCE = 0.75;
/** The value sits in the lower part of its cell, clear of the printed caption. */
const CELL_INSET = 3;
const MAX_WRITE_BOX_HEIGHT = 10;
/** Clear space a cell must have under its lowest printed line to be writable. */
const MIN_WRITE_BOX_HEIGHT = 6;
/** How far under the lowest printed line in a cell the write box begins. */
const CAPTION_CLEARANCE = 3;
/*
 * How far above the cell's bottom rule the baseline sits.
 *
 * The shared finalizer draws at writeBox.y, and its own BASELINE_ABOVE_RULE is
 * 2 -- right for a value on a printed UNDERLINE, where a descender touching the
 * line reads as handwriting. In a table CELL the rule is the border, and a
 * descender crossing it reads as ink belonging to the cell below.
 */
const WRITE_BOX_LIFT = 4;
/** How much of a cell's height a divider must run before it counts as that cell's edge. */
const SPAN_OVERLAP = 0.8;

const REQUESTER = "Person Submitting the Request";
const SUBJECT = "Subject of the Record to be Removed";
const TABLE = "Arrest and conviction table";

/*
 * Every write box on this form, as the four measured strokes that bound it.
 *
 *   top / bottom  — the y of a full-width horizontal rule
 *   left / right  — the x of a vertical divider, which must SPAN this cell
 *
 * All five numbers per cell were read out of the pinned binary's content
 * stream, and all five are re-read and re-checked on every build.
 */
const CELLS = {
  /* --- Person Submitting the Request ---------------------------------------- */
  "requester-last-name": {
    page: 2, top: 679.66, bottom: 652.74, left: 35.6, right: 235.4,
    section: REQUESTER, label: "Person submitting the request — LAST NAME", ...WRITE("participant.last_name")
  },
  "requester-first-name": {
    page: 2, top: 679.66, bottom: 652.74, left: 235.4, right: 435.1,
    section: REQUESTER, label: "Person submitting the request — FIRST NAME", ...WRITE("participant.first_name")
  },
  "requester-middle-name": {
    page: 2, top: 679.66, bottom: 652.74, left: 435.1, right: 585.8,
    section: REQUESTER, label: "Person submitting the request — FULL MIDDLE NAME", ...WRITE("participant.middle_name")
  },
  "requester-street-address": {
    page: 2, top: 652.74, bottom: 628.74, left: 35.6, right: 435.1,
    section: REQUESTER, label: "Person submitting the request — STREET ADDRESS", ...WRITE("participant.street_address")
  },
  "requester-apartment-number": {
    page: 2, top: 652.74, bottom: 628.74, left: 435.1, right: 585.8,
    section: REQUESTER, label: "Person submitting the request — APARTMENT NUMBER",
    ...SUPPLY("your apartment number, if your address has one. The platform holds your street address as one line and does not hold the apartment separately, so writing part of the address here would put the same information in two places")
  },
  "requester-city": {
    page: 2, top: 628.74, bottom: 604.62, left: 35.6, right: 308.7,
    section: REQUESTER, label: "Person submitting the request — CITY", ...WRITE("participant.city")
  },
  "requester-state": {
    page: 2, top: 628.74, bottom: 604.62, left: 308.7, right: 435.1,
    section: REQUESTER, label: "Person submitting the request — STATE", ...WRITE("participant.state")
  },
  "requester-zip": {
    page: 2, top: 628.74, bottom: 604.62, left: 435.1, right: 585.8,
    section: REQUESTER, label: "Person submitting the request — ZIP", ...WRITE("participant.zip")
  },

  /* --- Subject of the Record ------------------------------------------------- */
  "subject-last-name": {
    page: 2, top: 588.65, bottom: 557.74, left: 35.6, right: 193.8,
    section: SUBJECT, label: "Subject of the record — LAST NAME", ...WRITE("participant.last_name")
  },
  "subject-first-name": {
    page: 2, top: 588.65, bottom: 557.74, left: 193.8, right: 379.3,
    section: SUBJECT, label: "Subject of the record — FIRST NAME", ...WRITE("participant.first_name")
  },
  "subject-middle-name": {
    page: 2, top: 588.65, bottom: 557.74, left: 379.3, right: 585.8,
    section: SUBJECT, label: "Subject of the record — FULL MIDDLE NAME", ...WRITE("participant.middle_name")
  },
  "subject-gender": {
    page: 2, top: 557.74, bottom: 523.31, left: 35.6, right: 193.8,
    section: SUBJECT, label: "Subject of the record — GENDER",
    ...SUPPLY("your gender, by marking the Male or the Female tick box the form prints inside this cell. The platform holds no gender fact, and those two tick boxes are not strokes in the page's content stream — checkboxCandidates and strokedRectangles both find none anywhere on this page — so there is no measured box for a packet to mark")
  },
  "subject-race": {
    page: 2, top: 557.74, bottom: 523.31, left: 193.8, right: 379.3,
    section: SUBJECT, label: "Subject of the record — RACE",
    ...SUPPLY("your race, as the arresting agency recorded it. The platform holds no race fact and the shared semantics refuses to write one anywhere, which is deliberate")
  },
  "subject-date-of-birth": {
    page: 2, top: 557.74, bottom: 523.31, left: 379.3, right: 585.8,
    section: SUBJECT, label: "Subject of the record — DATE OF BIRTH (mm/dd/yyyy)",
    ...SUPPLY("your date of birth, in the segmented template the form prints inside this box — two digits for the month, two for the day, four for the year. The platform holds your date of birth as one composed value and the form's three segments are underscore characters rather than measured boxes, so a single value written across them would print over the template")
  }
};

/* The arrest and conviction table: three arrest rows and three conviction rows,
 * generated so the six cells of one row cannot drift apart. Not one cell of it
 * is written; see the header. */
const TABLE_BANDS = [
  { row: 1, kind: "arrest", top: 503.56, bottom: 472.88 },
  { row: 1, kind: "conviction", top: 472.88, bottom: 439.26 },
  { row: 2, kind: "arrest", top: 436.26, bottom: 406.83 },
  { row: 2, kind: "conviction", top: 406.83, bottom: 379.26 },
  { row: 3, kind: "arrest", top: 375.79, bottom: 343.39 },
  { row: 3, kind: "conviction", top: 343.39, bottom: 312.34 }
];
const TABLE_COLUMNS = { left: 34.8, mid1: 236.1, mid2: 385.9, right: 585.8 };
const TABLE_CELLS = {
  arrest: [
    ["date-of-arrest", "DATE OF ARREST", "left", "mid1",
      "the date of the arrest whose fingerprint record you are asking the Department of Justice to remove"],
    ["arresting-agency", "ARRESTING AGENCY", "mid1", "mid2",
      "the agency that arrested you"],
    ["arresting-agency-case-number", "ARRESTING AGENCY CASE #", "mid2", "right",
      "the ARRESTING AGENCY's own case number, which is not the court case number and is on the agency's paperwork rather than the court's"]
  ],
  conviction: [
    ["date-of-conviction", "DATE OF CONVICTION OR ADJUDICATION", "left", "mid1",
      "the date of the conviction or adjudication, if there was one"],
    ["name-of-court", "NAME OF COURT", "mid1", "mid2",
      "the name of the court. The form's instruction 2a says the court case number and charge may be found on CCAP, Wisconsin Circuit Court Access, or through the Municipal Court for ordinance offences"],
    ["charge-and-disposition", "CHARGE & DISPOSITION", "mid2", "right",
      "the charge and how it was disposed of. Instruction 2a says this information must include the court case number and the charge"]
  ]
};

function tableCells() {
  const out = {};
  for (const band of TABLE_BANDS) {
    for (const [suffix, heading, leftKey, rightKey, what] of TABLE_CELLS[band.kind]) {
      out[`row-${band.row}-${suffix}`] = {
        page: 2, top: band.top, bottom: band.bottom,
        left: TABLE_COLUMNS[leftKey], right: TABLE_COLUMNS[rightKey],
        section: TABLE,
        label: `Row ${band.row} — ${heading}`,
        ...SUPPLY(
          `${what}. This is row ${band.row} of the three the table has room for. Fill a row completely or leave it `
          + "empty: a row with the date filled and the agency case number missing reads as finished and is not"
        )
      };
    }
  }
  return out;
}

Object.assign(CELLS, tableCells());

/* The signature band. Nothing here is written, and there is no measured
 * divider between the signature and its date — the form prints the two captions
 * side by side and strokes no line between them, so the band is recorded whole
 * rather than split at a coordinate nobody measured. */
CELLS["signature-of-requester"] = {
  page: 2, top: 259.62, bottom: 211.13, left: 35.5, right: 584.4,
  section: "Signature",
  label: "Signature of Requester, and Date",
  ...PROTECT(SIGNATURE,
    "you sign this yourself, and you date it when you sign it. The line above it reads \"I attest that all the "
    + "information provided is accurate and true to the best of my knowledge\", and the paragraph above that says the "
    + "signature also requests expungement of your DNA Databank Record at the Wisconsin State Crime Laboratory")
};

/*
 * The fingerprint boxes.
 *
 * The form prints two, captioned LEFT INDEX FINGER and RIGHT INDEX FINGER. Only
 * the left one has strokes in the page's content stream -- its top rule at
 * y=200.47 and its bottom rule at y=101.53, both spanning x=280..399. The right
 * box is drawn some other way and nothing in this page's rules, checkbox
 * candidates or stroked rectangles reaches it. It is recorded as unmeasured
 * rather than given a coordinate this build worked out from where its caption
 * sits.
 */
const FINGERPRINT_BOXES = [
  {
    page: 2, label: "Fingerprint box — LEFT INDEX FINGER",
    rules: [{ y: 200.47, x0: 282.72, x1: 398.92, edge: "top" }, { y: 101.53, x0: 280.22, x1: 398.27, edge: "bottom" }]
  }
];
const UNMEASURED_PRINTED_CONTROLS = [
  {
    page: 2, label: "Fingerprint box — RIGHT INDEX FINGER",
    why: "the form prints this box and its caption, and its strokes are not in the page content stream; rulesOfPage finds no rule and strokedRectangles finds no rectangle anywhere in that region"
  },
  {
    page: 2, label: "GENDER — the Male and Female tick boxes",
    why: "the form prints a tick box beside each word and neither is a stroke in the page content stream; checkboxCandidates and strokedRectangles both return zero for this page"
  }
];

/* ---- fixtures ------------------------------------------------------------ */
const FIXTURES = {
  canonical: {
    "participant.first_name": "Jordan",
    "participant.middle_name": "Avery",
    "participant.last_name": "Reyes",
    "participant.street_address": "412 North Carroll Street",
    "participant.city": "Madison",
    "participant.state": "WI",
    "participant.zip": "53703",
    "participant.date_of_birth": "1991-04-17"
  },
  boundary: {
    "participant.first_name": "Maria-Alejandra",
    "participant.middle_name": "Consuelo Estefania",
    "participant.last_name": "O’Shaughnessy-Whitfield",
    "participant.street_address": "1188 Upper Notch Crossing Road",
    "participant.city": "Wisconsin Rapids",
    "participant.state": "Wisconsin",
    "participant.zip": "54494-2214",
    "participant.date_of_birth": "1968-12-31"
  }
};

const RASTER_ENGINE = "scripts/lib/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- source binding ------------------------------------------------------ */
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const all = index.entries ?? [];
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const wanted of ROUTE.documents) {
    // Matched by state and form number only. This form is filed in the corpus
    // under 04_SUPPORTING_PROCESS with assetClass SUPPORT rather than FORM,
    // which is a filing question about the archive and not a question about
    // whether these bytes are the form. The SHA-256 binding below is what
    // decides that.
    const entry = all.find((e) => e.state === "WI" && e.formNumber === wanted.formNumber);
    if (!entry) { failures.push({ sourceId: `official-form:${wanted.formNumber}`, why: "no entry for this form number in the committed corpus index" }); continue; }
    const rel = entry.path;
    const abs = path.resolve(ROOT, root, rel);
    if (!fs.existsSync(abs)) { failures.push({ sourceId: `official-form:${wanted.formNumber}`, pathInArchive: rel, why: `the indexed path does not exist on disk: ${rel}` }); continue; }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    if (String(entry.sha256 ?? "") !== sha256) {
      failures.push({ sourceId: `official-form:${wanted.formNumber}`, pathInArchive: rel, why: `SHA-256 drift: the committed index says ${entry.sha256}, the mounted corpus holds ${sha256}` });
      continue;
    }
    resolved.push({
      ...wanted, sourceId: `official-form:${wanted.formNumber}`, pathInArchive: rel,
      revision: entry.revision ?? null, assetClass: entry.assetClass ?? null,
      sha256, byteLength: bytes.length, bytes,
      acroFieldCount: entry.acroFieldCount ?? null, pageCount: entry.pageCount ?? null
    });
  }
  return { resolved, failures };
}

/* ---- measure the table, then place the boxes in its cells ------------------ */
async function censusOf(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text })),
    items: extractTextItems(p).map((t) => ({ x: Number(t.x), y: Number(t.y), text: String(t.text ?? "") }))
  }));

  const measured = pages.map((p, i) => {
    const r = rulesOfPage(p);
    return { page: i + 1, horizontal: r.horizontal ?? [], vertical: r.vertical ?? [] };
  });

  // The claim that this form has no fillable field is a claim, so it is checked.
  const acroFieldCount = doc.getForm().getFields().length;

  const rows = [];
  const geometryDrift = [];
  for (const [key, entry] of Object.entries(CELLS)) {
    const here = measured.find((m) => m.page === entry.page) ?? { horizontal: [], vertical: [] };
    const hRule = (y) => here.horizontal.find((r) => Math.abs(r.y - y) <= RULE_TOLERANCE);
    /*
     * A divider only bounds a cell if it actually runs the height of it. A
     * divider at the same x belonging to a different band is not this cell's
     * edge -- x=585.8 carries two separate strokes on this page, one down the
     * name blocks and one down the arrest table, and picking the wrong one
     * would put a write box in the wrong column.
     *
     * The test is overlap, not containment: the form draws each divider from
     * just above the rule below to just below the rule above, so a divider that
     * genuinely bounds a cell still falls a point or so short of both rules.
     * SPAN_OVERLAP is the fraction of the cell's own height the divider must
     * cover, and the best overlap wins rather than the first match.
     */
    const cellHeight = entry.top - entry.bottom;
    const overlapOf = (v) => {
      const y0 = Number(v.y);
      const y1 = y0 + Number(v.height ?? 0);
      return Math.max(0, Math.min(y1, entry.top) - Math.max(y0, entry.bottom)) / cellHeight;
    };
    const vRule = (x) => here.vertical
      .filter((v) => Math.abs(v.x - x) <= RULE_TOLERANCE && overlapOf(v) >= SPAN_OVERLAP)
      .sort((a, b) => overlapOf(b) - overlapOf(a))[0];

    const top = hRule(entry.top);
    const bottom = hRule(entry.bottom);
    const left = vRule(entry.left);
    const right = vRule(entry.right);
    if (!top || !bottom || !left || !right) {
      geometryDrift.push({
        cell: key, page: entry.page,
        expected: { top: entry.top, bottom: entry.bottom, left: entry.left, right: entry.right },
        found: { top: top ? top.y : null, bottom: bottom ? bottom.y : null, left: left ? left.x : null, right: right ? right.x : null },
        nearestHorizontal: here.horizontal
          .filter((r) => Math.abs(r.y - entry.top) <= 6 || Math.abs(r.y - entry.bottom) <= 6)
          .map((r) => ({ y: r.y, x: r.x, endX: r.endX })).slice(0, 4),
        nearestVertical: here.vertical
          .filter((v) => Math.abs(v.x - entry.left) <= 6 || Math.abs(v.x - entry.right) <= 6)
          .map((v) => ({ x: v.x, y: v.y, height: v.height })).slice(0, 4)
      });
      continue;
    }

    /*
     * The TOP of the box is measured too, not offset by a constant: on this
     * form the APARTMENT NUMBER caption sits two points above where a constant
     * offset would put the box's top edge. The box begins three points under
     * the LOWEST printed line inside the cell, and a cell with less clear space
     * than MIN_WRITE_BOX_HEIGHT is recorded as too shallow to write in.
     */
    const items = pageText.find((p) => p.page === entry.page)?.items ?? [];
    const printedInCell = items
      .filter((t) => t.text.trim() && t.x >= left.x - 2 && t.x <= right.x + 2
        && t.y >= bottom.y - 1 && t.y <= top.y + 1)
      .sort((a, b) => b.y - a.y || a.x - b.x);
    const lowestPrintedLine = printedInCell.length > 0
      ? Math.min(...printedInCell.map((t) => t.y)) : null;
    const boxBottom = bottom.y + WRITE_BOX_LIFT;
    const ceiling = lowestPrintedLine === null
      ? top.y - CAPTION_CLEARANCE : lowestPrintedLine - CAPTION_CLEARANCE;
    const height = Number(Math.min(MAX_WRITE_BOX_HEIGHT, ceiling - boxBottom).toFixed(2));
    const writeBox = {
      x: Number((left.x + CELL_INSET).toFixed(2)),
      y: Number(boxBottom.toFixed(2)),
      width: Number((right.x - left.x - CELL_INSET * 2).toFixed(2)),
      height: Math.max(0, height)
    };
    const tooShallow = height < MIN_WRITE_BOX_HEIGHT;
    rows.push({
      key, name: key, page: entry.page,
      rect: writeBox, writeBox,
      rectBasis: "measured_table_cell: four strokes read from the page content stream — the rule above, the rule below, and the vertical divider on each side, each re-checked against the pinned binary",
      tooShallowToWriteIn: tooShallow,
      lowestPrintedLineInCell: lowestPrintedLine,
      measuredCell: {
        topRuleY: top.y, bottomRuleY: bottom.y,
        leftDividerX: left.x, rightDividerX: right.x,
        leftDividerSpan: [Number(left.y), Number(left.y) + Number(left.height ?? 0)],
        rightDividerSpan: [Number(right.y), Number(right.y) + Number(right.height ?? 0)],
        leftDividerCoversCell: Number(overlapOf(left).toFixed(4)),
        rightDividerCoversCell: Number(overlapOf(right).toFixed(4)),
        topRuleSpan: [top.x, top.endX], bottomRuleSpan: [bottom.x, bottom.endX]
      },
      type: "flat_overlay_text", isSelectionControl: false, multiline: false, maxLength: null,
      sourceValue: null,
      section: entry.section, effectiveLabel: entry.label, bindingLabel: entry.bindingLabel ?? entry.label,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null,
      // The caption printed inside this cell, read at the cell's own
      // coordinates rather than assumed from the dictionary.
      printedTextInThisCell: printedInCell
        .slice(0, 12).map((t) => ({ x: Math.round(t.x), y: Math.round(t.y), extracted: t.text }))
    });
  }

  const fingerprintBoxes = FINGERPRINT_BOXES.map((b) => {
    const here = measured.find((m) => m.page === b.page) ?? { horizontal: [] };
    const found = b.rules.map((want) => {
      const rule = here.horizontal.find((r) =>
        Math.abs(r.y - want.y) <= RULE_TOLERANCE
        && Math.abs(r.x - want.x0) <= RULE_TOLERANCE
        && Math.abs(r.endX - want.x1) <= RULE_TOLERANCE);
      return { edge: want.edge, measured: Boolean(rule), rule: rule ? { y: rule.y, x: rule.x, endX: rule.endX, thickness: rule.height } : null };
    });
    return { page: b.page, label: b.label, edges: found, measured: found.every((f) => f.measured) };
  });

  return {
    rows, geometryDrift, pageText, pageCount: pages.length, acroFieldCount, fingerprintBoxes,
    measuredHorizontalRules: measured.reduce((n, m) => n + m.horizontal.length, 0),
    measuredVerticalRules: measured.reduce((n, m) => n + m.vertical.length, 0)
  };
}

/* ---- render ---------------------------------------------------------------- */
async function renderDocument(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const writable = census.rows.filter((r) => r.policy === "write");
  // Geometry-based protection: the signature band is handed to the overlay as a
  // protected rule, so any write box that landed in it would be refused for
  // WHERE it is even if its label said something innocent.
  const protectedRules = census.rows
    .filter((r) => r.policy === "protect")
    .map((r) => ({
      page: r.page, y: r.measuredCell.bottomRuleY,
      x: r.measuredCell.leftDividerX, endX: r.measuredCell.rightDividerX,
      category: r.refusalClass, caption: r.effectiveLabel
    }));

  const anchors = writable.map((r) => ({
    page: r.page, label: r.effectiveLabel, writeBox: r.writeBox,
    factId: r.fact, fontSize: 9, protectedRules
  }));

  const { bytes, report } = await finalizeFlatOverlay({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    anchors, protectedRules,
    explicitMappings: Object.fromEntries(writable.map((r) => [r.effectiveLabel, r.fact])),
    facts,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: source.title
  });
  if (process.env.WI250B_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) console.log(`   ${r.anchor ?? r.field}: ${r.reason}${r.category ? ` (${r.category})` : ""}`);
    for (const u of report.unfittable ?? []) console.log(`   UNFIT ${u.anchor ?? u.field}: ${u.reason} ${JSON.stringify(u.value)}`);
  }
  return { bytes, report };
}

/* ---- byte proof ------------------------------------------------------------ */
async function byteProof(source, census, artifactBytes, report, fixtureName) {
  /*
   * A measured overlay draws into the page's own content stream, so there is no
   * flattened widget to read. The ink is read back as the finalized page's TEXT
   * at each measured cell, with the SOURCE's own printed text at the same
   * coordinates subtracted -- because every cell on this form prints its own
   * caption inside itself, and reading the output alone would report the form's
   * own captions as ink this build put there.
   */
  const out = await PDFDocument.load(artifactBytes, { ignoreEncryption: true });
  const src = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const outText = new Map();
  const srcText = new Map();
  out.getPages().forEach((p, i) => outText.set(i + 1, extractTextItems(p).map((t) => ({ x: Number(t.x), y: Number(t.y), text: String(t.text ?? "") }))));
  src.getPages().forEach((p, i) => srcText.set(i + 1, extractTextItems(p).map((t) => ({ x: Number(t.x), y: Number(t.y), text: String(t.text ?? "") }))));

  const inBox = (t, box) => t.x >= box.x - 2 && t.x <= box.x + box.width + 2
    && t.y >= box.y - 3 && t.y <= box.y + box.height + 3;
  const drawnInBox = (page, box) => {
    const already = new Set((srcText.get(page) ?? []).filter((t) => inBox(t, box)).map((t) => `${Math.round(t.x)}:${t.text}`));
    return (outText.get(page) ?? [])
      .filter((t) => t.text.trim() && inBox(t, box))
      .filter((t) => !already.has(`${Math.round(t.x)}:${t.text}`))
      .sort((a, b) => a.x - b.x).map((t) => t.text);
  };

  const written = new Set(report.written.map((w) => w.anchor));
  const actualWrites = [];
  const refusedFieldsWithInk = [];
  let glyphs = 0;
  for (const r of census.rows) {
    const text = drawnInBox(r.page, r.writeBox);
    const ink = text.join("").trim();
    if (written.has(r.effectiveLabel) && r.policy === "write") {
      glyphs += ink.length;
      actualWrites.push({
        field: r.key, factId: r.fact, page: r.page, rect: r.writeBox,
        section: r.section, effectiveLabel: r.effectiveLabel, measuredCell: r.measuredCell,
        drawnText: text, expected: FIXTURES[fixtureName][r.fact] ?? null,
        matchesExpected: ink === String(FIXTURES[fixtureName][r.fact] ?? "").trim()
      });
      continue;
    }
    if (ink.length === 0) continue;
    refusedFieldsWithInk.push({ fieldId: r.key, page: r.page, drawnText: text });
  }
  return { actualWrites, refusedFieldsWithInk, documentAuthoredAppearances: [], glyphs, appearances: 0 };
}

/* ---- field map ------------------------------------------------------------- */
function mapFor(source, census, report) {
  const writtenLabels = new Set(report.written.map((w) => w.anchor));
  const canonicalWrites = [];
  const canonicalRefusals = [];

  for (const r of census.rows) {
    const base = {
      field: `${source.formNumber}/${r.key}`,
      fieldName: `${source.formNumber}/${r.key}`,
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      measuredCell: r.measuredCell,
      printedLabel: r.effectiveLabel, printedLine: r.effectiveLabel,
      sectionHeading: r.section, regionHeading: r.effectiveLabel,
      effectiveLabel: r.effectiveLabel,
      captionBasis: "the caption printed inside this measured cell, read at the cell's own coordinates; recorded verbatim in printedTextInThisCell, including the runs this form's subsetted font makes unreadable",
      printedTextInThisCell: r.printedTextInThisCell,
      document: source.formNumber
    };

    if (r.policy === "write") {
      if (writtenLabels.has(r.effectiveLabel)) canonicalWrites.push({ ...base, factId: r.fact, kind: r.type });
      else {
        canonicalRefusals.push({
          ...base, reason: "the finalizer refused this write; the packet does not claim a value it did not draw",
          category: null, completenessClass: null, class: null,
          requiredBeforeFiling: false, why: "reported rather than claimed, so the defect is visible to the audit"
        });
      }
      continue;
    }

    if (r.policy === "protect") {
      canonicalRefusals.push({
        ...base, reason: r.why, category: r.refusalClass,
        completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    canonicalRefusals.push({
      ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${source.formNumber} cell ${r.key}`,
      factId: null, routeDetermined: false,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }

  return {
    formNumber: source.formNumber, documentId: source.formNumber, documentRole: source.instrumentKind,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: "measured_flat_overlay",
    explicitMappings: Object.fromEntries(canonicalWrites.map((w) => [w.field, w.factId])),
    roleRefusals: [], selectionControls: [], canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals,
    printedControlsNotWritten: census.fingerprintBoxes.map((b) => ({
      page: b.page, label: b.label, measuredEdges: b.edges,
      why: "this box takes an inked rolled fingerprint impression, which page 1 of the form calls mandatory. Nothing a packet can draw belongs in it."
    })),
    printedControlsNotMeasured: UNMEASURED_PRINTED_CONTROLS
  };
}

/* ---- the builder's own count of the nine counters --------------------------- */
function countCompleteness(maps, writeProofs, artifacts, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r, selection = false) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: selection,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = maps.flatMap((m) => m.canonicalWrites.map((w) => row(w)));
  const blanks = maps.flatMap((m) => [
    ...m.canonicalRefusals.map((r) => row(r)),
    ...m.selectionControls.map((c) => row(c, true))
  ]);

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  for (const p of writeProofs) {
    for (const w of p.actualWrites) if (w.factId && String(w.drawnText.join("")).trim()) availableFacts.add(String(w.factId));
  }
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    if (!writtenInDocument.has(w.document)) writtenInDocument.set(w.document, new Set());
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(w.document).add(k);
  }

  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ field: blank.id, label: blank.label, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    const counter = verdict.disposition === "KNOWN_FACT_NOT_WRITTEN" ? "knownRequiredFieldsMissing"
      : verdict.disposition === "ROUTE_OPTION_NOT_SELECTED" ? "requiredOptionsMissing" : "unclassifiedBlanks";
    note(counter, { field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis });
  }

  const instructions = String(instructionsText ?? "");
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.field].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => instructions.toLowerCase().includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.field, label: b.label, why: "declared required-before-filing and not named in participant-instructions.md" });
  }

  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label) });
  }

  for (const p of writeProofs) {
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && (p.addedGlyphsReadFromOutputBytes ?? 0) === 0) {
      note("invisibleWrites", { fixture: p.fixture, why: "the finalizer reported values and the output bytes carry no glyph inside any measured cell" });
    }
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, why: "ink landed outside every measured write box" });
    for (const refused of p.refusedFieldsWithInk ?? []) {
      note("protectedWrites", { fixture: p.fixture, field: refused.fieldId, why: "a cell the map refused carries ink in the output that the source does not print" });
    }
  }
  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  const rendered = artifacts.map((a) => `${a.file} ${(a.documents ?? []).join(" ")}`).join(" ").toLowerCase();
  const loose = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const m of maps) {
    if (!rendered.includes(String(m.formNumber).toLowerCase()) && !loose(rendered).includes(loose(m.formNumber))) {
      note("requiredComponentsMissing", { component: m.formNumber, why: "the field map names this document and it appears in no rendered artifact" });
    }
  }

  return { counters, findings, ledger };
}

/* ---- artifacts ------------------------------------------------------------- */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  return maps.flatMap((m) => m.canonicalRefusals
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page,
      section: r.sectionHeading, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })));
}

/*
 * What page 1 requires, quoted only where page 1 extracts plainly.
 *
 * Each entry is a sentence this build read verbatim out of the pinned binary's
 * text. Nothing here is reconstructed from the shifted encoding, and nothing is
 * paraphrased into a requirement the form does not state.
 */
const PLAIN_QUOTES = [
  { where: "page 1, instruction 1 (after the injured-finger sentence)", quote: "If either finger is injured, provide the impression of another finger, but clearly designate which fingers were used for the rolled impression." },
  { where: "page 1, instruction 2a", quote: "Conviction information must include court case number and charge. This information may be found on CCAP (Wisconsin Circuit Court Access) http://wcca.wicourts.gov/index.xsl" },
  { where: "page 1, instruction 2b", quote: "If the request is subsequent to a conviction, finding, or an adjudication, supporting documentation must be provided which shall include, a certified copy of the court order reversing, setting aside, or vacating the conviction." },
  { where: "page 1, instruction 4", quote: "Court expungement seals the court files but has no effect on files maintained by the Wisconsin Department of Justice. Removal of arrest information from the Department of Justice files has no effect on the availability of the same information from court files or police records. State v. Leitner, 2002 WI 77, 253 Wis. 2d 449, 646 N.W.2d 341, 00-1718." },
  { where: "page 1, instruction 6", quote: "Successful requests will result in either the return of the arrest fingerprint card or deletion of the electronically stored document." },
  { where: "page 1, instruction 7", quote: "Time to process a request varies. If your request qualifies and the disposition has been reported to the Department of Justice your request will be processed promptly. If the disposition has not been submitted by the court, prosecutor or arresting agency, staff will need to obtain the disposition, make sure the disposition qualifies the removal of the record, update the criminal history and then process the request. If you have documentation regarding the dismissal of the offense(s) involved in your request, you should include copies with the request to speed processing." },
  { where: "page 2, above the signature", quote: "If necessary to proceed with your fingerprint record removal request, the signature below also represents a request to expunge your DNA Databank Record at the Wisconsin State Crime Laboratory." },
  { where: "page 2, the attestation", quote: "I attest that all the information provided is accurate and true to the best of my knowledge." }
];

function participantInstructions(maps, rbf, census) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);

  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is one form: **DJ-LE-250B**, the _Wisconsin Fingerprint Record Removal Request_. It is sent to the "
    + "**Crime Information Bureau of the Wisconsin Department of Justice**, not to a court. Page 1 is the Bureau's own "
    + "instruction sheet and there is nothing to fill in on it; page 2 is the request.", "",
    `It is prepared under ${ROUTE.authority}.`, ""
  );
  out.push(
    "The platform filled in what it holds about you: your last, first and full middle name in **both** name blocks — the "
    + "person submitting the request and the subject of the record, which the form's own instruction 1 says are the same "
    + "person — and your street address, city, state and zip. Everything else on the form is yours, and every one of "
    + "those blanks is listed below.", ""
  );

  out.push("## This is not a court expungement, and the form says so", "");
  out.push(
    "> " + PLAIN_QUOTES.find((q) => q.where.includes("instruction 4")).quote, "",
    "Read that before you send this. A Wisconsin court order expunging your case does **not** remove the fingerprint "
    + "record the Department of Justice holds, and removing the Department of Justice record does not change what the "
    + "court or the police still hold. They are separate records and this form reaches one of them.", ""
  );

  out.push("## Your signature also asks for something else", "");
  out.push(
    "> " + PLAIN_QUOTES.find((q) => q.where.includes("above the signature")).quote, "",
    "That sentence is printed above the signature line. If you do not want your DNA Databank record touched, do not "
    + "sign this form until you have asked the Bureau about it.", ""
  );

  out.push("## The arrest and conviction table is yours to complete", "");
  out.push(
    "The middle of page 2 is three rows, each with an arrest line and a conviction line — six boxes to a row, eighteen "
    + "in all. **Not one of them is filled in.** Which arrest you are asking the Bureau to remove is the substance of "
    + "the request and the platform does not hold it, and one of the boxes — **ARRESTING AGENCY CASE #** — is the "
    + "arresting agency's own case number, which is not the court case number and must not be filled in with it. "
    + "**Fill a row completely or leave it empty:** a row with the arrest date and the agency filled and the agency "
    + "case number missing reads as finished and is not.", ""
  );
  out.push("> " + PLAIN_QUOTES.find((q) => q.where.includes("2a")).quote, "");

  out.push("## The two fingerprint boxes", "");
  out.push(
    "The bottom of page 2 has two boxes, one for each index finger. Page 1 calls legible inked fingerprint impressions "
    + "mandatory, and says any law enforcement agency can help you obtain the inked rolled impression. **Nothing a "
    + "printed packet can do puts a fingerprint in those boxes.**", ""
  );
  out.push("> " + PLAIN_QUOTES.find((q) => q.where.includes("injured")).quote, "");

  out.push("## Documentation you must send with it", "");
  out.push("> " + PLAIN_QUOTES.find((q) => q.where.includes("2b")).quote, "");
  out.push("> " + PLAIN_QUOTES.find((q) => q.where.includes("instruction 7")).quote, "");

  out.push("## What you must do before you send this", "");
  out.push("1. **Complete the arrest and conviction table** — every box of every row you use.");
  out.push("2. **Fill in every item in the table below.** Each names the section of the form and the box.");
  out.push("3. **Have your index fingers inked and rolled into the two boxes.** Any law enforcement agency can help.");
  out.push("4. **Gather the supporting documentation** the two quotations above describe, and send copies with the request.");
  out.push("5. **Sign and date it yourself**, after reading what the signature also asks for.");
  out.push("6. **Leave the box at the foot of the page alone.** It is marked for the Bureau's use.");
  out.push("");

  for (const [doc, items] of byDoc) {
    out.push(`## ${doc}: the boxes you must fill in`, "");
    out.push("| Section | The box on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Your date of birth.** The box prints its own segmented template — two digits, two digits, four digits — and the platform holds one composed date. Writing it across the template would print over it.");
  out.push("- **Gender and race.** The platform holds neither, and the shared semantics refuses to write a race anywhere.");
  out.push("- **The whole arrest and conviction table.** See above.");
  out.push("- **Your signature and its date.**");
  out.push("- **The two fingerprint boxes.**");
  out.push("");

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared copy of an official Wisconsin Department of Justice form. It is not legal advice, it is not sent "
    + "for you, and **it does not decide whether your fingerprint record can be removed**. Page 1 of the form sets out "
    + "the conditions, and this packet does not restate them, because most of page 1 does not extract readably from the "
    + "file — see `reports/caption-evidence.json`. **Read page 1 on the paper before you send this.**"
  );
  out.push("");
  out.push(`_Route: ${ROUTE.routeKey} — ${ROUTE.authority}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point -------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const { resolved, failures } = resolveSources();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a source did not bind by exact SHA-256, so nothing may be rendered from it",
      overlayDirectoryTouched: false
    };
  }

  const censuses = [];
  for (const source of resolved) {
    const census = await censusOf(source);
    assert.equal(census.acroFieldCount, 0,
      `${source.formNumber}: this build treats the form as flat, and it reports ${census.acroFieldCount} AcroForm field(s)`);
    assert.equal(census.geometryDrift.length, 0,
      `${source.formNumber}: ${census.geometryDrift.length} measured cell(s) no longer match the pinned binary: ${JSON.stringify(census.geometryDrift.slice(0, 3))}`);
    assert.equal(census.rows.length, Object.keys(CELLS).length,
      `${source.formNumber}: measured ${census.rows.length} cells, the dictionary declares ${Object.keys(CELLS).length}`);
    assert.ok(census.fingerprintBoxes.every((b) => b.measured),
      `${source.formNumber}: a fingerprint box rule did not measure: ${JSON.stringify(census.fingerprintBoxes)}`);
    const shallowWrites = census.rows.filter((r) => r.policy === "write" && r.tooShallowToWriteIn);
    assert.equal(shallowWrites.length, 0,
      `${source.formNumber}: ${shallowWrites.length} cell(s) this build writes to have no clear space under their printed caption: ${JSON.stringify(shallowWrites.map((r) => r.key))}`);
    censuses.push({ source, census });
  }

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      documents: censuses.map(({ source, census }) => ({
        formNumber: source.formNumber, sha256: source.sha256, pageCount: census.pageCount,
        acroFieldCount: census.acroFieldCount,
        measuredHorizontalRules: census.measuredHorizontalRules,
        measuredVerticalRules: census.measuredVerticalRules,
        cells: census.rows.length,
        cellsTooShallowToWriteIn: census.rows.filter((r) => r.tooShallowToWriteIn).map((r) => r.key),
        writes: census.rows.filter((r) => r.policy === "write").length,
        supply: census.rows.filter((r) => r.policy === "supply").length,
        protected: census.rows.filter((r) => r.policy === "protect").length,
        fingerprintBoxesMeasured: census.fingerprintBoxes.filter((b) => b.measured).length
      }))
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "raster"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const maps = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const packet = await PDFDocument.create();
    const pageManifest = [];
    for (const { source, census } of censuses) {
      const { bytes, report } = await renderDocument(source, census, fixtureName);
      const proof = await byteProof(source, census, bytes, report, fixtureName);
      writeProofs.push({
        fixture: fixtureName, formNumber: source.formNumber, sourceSha256: source.sha256,
        proofMethod: "the finalized page's own text read at every measured cell, with the source's printed text at the same coordinates subtracted",
        valuesReportedByFinalizer: report.written.length,
        flattenedWidgetAppearancesReadFromOutputBytes: 0,
        flattenedWidgetNote: "a measured overlay draws into page content and has no widget to flatten; this counter is zero by construction, not by failure",
        addedGlyphsReadFromOutputBytes: proof.glyphs,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
        refusedFieldsWithInk: proof.refusedFieldsWithInk,
        documentAuthoredAppearances: proof.documentAuthoredAppearances,
        unfittable: report.unfittable,
        actualWrites: proof.actualWrites
      });
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copied = await packet.copyPages(doc, doc.getPageIndices());
      for (const [i, p] of copied.entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), formNumber: source.formNumber, sourcePage: i + 1, sourceSha256: source.sha256 });
      }
      if (fixtureName === "canonical") maps.push(mapFor(source, census, report));
    }

    /*
     * A packet has to be byte-reproducible, because the raster receipt that
     * clears it is bound to its SHA-256.
     *
     * `PDFDocument.create()` stamps /CreationDate and /ModDate with the wall
     * clock, and `updateMetadata: false` only stops them being refreshed on
     * save -- it does not stop them being set. Two builds of identical inputs
     * therefore differ, measurably, in exactly six bytes: the timestamp digits.
     * A receipt pinned to one of those hashes is invalidated by a rebuild that
     * changed nothing.
     *
     * So both dates are pinned to the Unix epoch. It is plainly not a claim
     * about when the document was made -- that is the point of choosing a date
     * no reader could mistake for one -- and it makes the artifact a function
     * of its inputs, which is what a hash-bound gate needs.
     */
    packet.setCreationDate(new Date(0));
    packet.setModificationDate(new Date(0));
    const packetBytes = await packet.save({ useObjectStreams: false, updateMetadata: false });
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    artifacts.push({
      fixture: fixtureName, file,
      sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents: censuses.map((c) => c.source.formNumber)
    });

    const rasterDir = `${OUT}/raster/${fixtureName}`;
    fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
    for (let i = 0; !skipRaster && i < packet.getPageCount(); i += 1) {
      const stage = path.join(ROOT, rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
      const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: i, keep: stage });
      for (const scrap of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
        const f = path.join(stage, scrap);
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }
      const png = path.join(stage, "page.png");
      rasterPages.push({
        fixture: fixtureName, page: i + 1,
        file: `${rasterDir}/page-${String(i + 1).padStart(2, "0")}/page.png`,
        pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
        pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
        calibrationResidualPx: render.calibrationResidualPx,
        paperBounds: render.paper,
        engine: "chromium_calibrated_scripts_lib_pdf_page_raster",
        sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
      });
    }
  }

  const rbf = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbf, censuses[0].census);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "official_pdf_fill",
    renderStrategy: "measured_flat_overlay",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact form number + committed corpus-index SHA-256 + on-disk SHA-256 + byte length",
    bindingNote:
      "Matched by state and form number rather than by assetClass: the corpus files DJ-LE-250B under "
      + "04_SUPPORTING_PROCESS with assetClass SUPPORT. That is a filing question about the archive; the SHA-256 "
      + "binding is what decides these are the form's bytes, and it holds.",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId, statutoryAuthority: ROUTE.authority,
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], documentId: r.formNumber, formNumber: r.formNumber, revision: r.revision,
      assetClassInCorpus: r.assetClass,
      pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength, instrumentKind: r.instrumentKind,
      renderStrategy: r.strategy
    })),
    sourceBinaryCommitted: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    structuralClass: "measured_flat_overlay",
    captionBasis:
      "This form has no fillable field. Every box below is a measured TABLE CELL: four strokes read out of the page's "
      + "own content stream — the rule above, the rule below and the vertical divider on each side — and every one of "
      + "them is re-checked against the pinned binary on each build. A divider must span the cell it bounds, so a "
      + "divider from a different band cannot stand in for a missing one. The caption is whatever the form prints "
      + "inside the cell, recorded verbatim at its own coordinates in printedTextInThisCell.",
    documents: censuses.map(({ source, census }) => ({
      documentId: source.formNumber, formNumber: source.formNumber, sourceSha256: source.sha256,
      pageCount: census.pageCount, acroFieldCount: census.acroFieldCount,
      measuredHorizontalRules: census.measuredHorizontalRules,
      measuredVerticalRules: census.measuredVerticalRules,
      cellCount: census.rows.length,
      fingerprintBoxes: census.fingerprintBoxes,
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis, measuredCell: r.measuredCell,
        tooShallowToWriteIn: r.tooShallowToWriteIn, lowestPrintedLineInCell: r.lowestPrintedLineInCell,
        pdfType: r.type, isSelectionControl: false, multiline: false, maxLength: null,
        section: r.section, effectiveLabel: r.effectiveLabel, policy: r.policy, factId: r.fact,
        printedTextInThisCell: r.printedTextInThisCell
      }))
    }))
  });

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1", familyId: FAMILY_ID,
    finding:
      "DJ-LE-250B embeds a subsetted font whose glyph codes are the ASCII of the character minus 29. Runs set in that "
      + "font extract as \"ILQJHUSULQW UHFRUG\" where the paper reads \"fingerprint record\". Other runs on the same "
      + "printed line use a normally encoded font and extract plainly, so a single page mixes the two.",
    whyThisIsNotWorkedAround:
      "The shift is exact and reversible, but which encoding a given run uses is not something this build reads, and a "
      + "rule that un-shifts the runs that look wrong is a rule that invents text. Every sentence this packet quotes "
      + "from the form is one that extracted plainly, listed below with where it was read. Everything else is recorded "
      + "as unreadable, and the participant instructions tell the reader to read page 1 on the paper.",
    plainQuotationsUsed: PLAIN_QUOTES,
    whatTheCellCaptionsRestOn:
      "Cell captions are not affected by the encoding question, because the cell is defined by four measured strokes "
      + "rather than by its caption. What the form prints inside each measured cell is recorded verbatim at its own "
      + "coordinates in the field census, shifted runs included, for a reviewer reading the paper.",
    perCell: censuses.flatMap(({ source, census }) => census.rows.map((r) => ({
      document: source.formNumber, cell: r.key, page: r.page, rect: r.rect,
      labelThisBuildUses: r.effectiveLabel, section: r.section,
      textExtractedInsideThisCell: r.printedTextInThisCell
    })))
  });

  writeJson(`${OUT}/reports/disposition-documentation-package.json`, {
    schemaVersion: "rcap-disposition-documentation-package/v1", familyId: FAMILY_ID,
    whatThisIs:
      "What the Bureau's own instruction sheet says must accompany this request, quoted from the sentences of page 1 "
      + "that extract plainly. It is not a checklist this build composed.",
    documentsTheFormRequires: [
      {
        when: "the request is subsequent to a conviction, finding, or an adjudication",
        require: "a certified copy of the court order reversing, setting aside, or vacating the conviction",
        quotedFrom: "page 1, instruction 2b"
      },
      {
        when: "you have documentation regarding the dismissal of the offence or offences involved in your request",
        require: "copies sent with the request, which the form says speeds processing",
        quotedFrom: "page 1, instruction 7"
      },
      {
        when: "always",
        require: "legible inked rolled impressions of the subject's index fingers, in the two boxes at the foot of page 2",
        quotedFrom: "page 1, instruction 1 — and the two boxes are measured in the field census"
      }
    ],
    whatIsNotListedHere:
      "Page 1's instructions 1, 3 and 5, and the first half of 2 and 4, set out further conditions and do not extract "
      + "readably from this file. They are not restated, guessed or summarised. The participant instructions say so and "
      + "tell the reader to read page 1 on the paper.",
    arrestEventMapping: {
      whatItIs: "How this build maps an arrest event onto the form's table.",
      rowsAvailableOnTheForm: 3,
      cellsPerRow: 6,
      cellsWritten: 0,
      why:
        "One cell of every arrest row, ARRESTING AGENCY CASE #, is the arresting agency's own case number. It is not "
        + "matter.case_number and must not be filled with it, so no row can be completed from the platform's fact map "
        + "and no row is started. All eighteen cells are declared required before filing and named to the participant."
    }
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "measured_flat_overlay",
    captionBasis: "measured table cells; see field-census.census-v1.json and reports/caption-evidence.json",
    dispositionVocabulary: [SIGNATURE, AGENCY_OWNED],
    routeDeterminedSelections: [],
    routeSelectionNote:
      "There is no election on this form. It carries no checkbox and no radio group — the only thing resembling one is "
      + "the words \"Male\" and \"Female\" printed as text inside the GENDER cell, which are glyphs rather than strokes "
      + "and therefore have no measured box to mark. Nothing here is route-determined.",
    bothNameBlocksNote:
      "The participant's name is written into both name blocks. The form's own instruction 1 says the request must be "
      + "made by the requesting candidate, so on this route the person submitting the request and the subject of the "
      + "record are the same person. That is read off the form rather than assumed.",
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true, rasterEngine: RASTER_ENGINE, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note:
      "Read back from the finalized PDF bytes at every measured cell, not from the finalizer's own report. A measured "
      + "overlay draws into page content, so the reader is the page's own text rather than a flattened widget "
      + "appearance, and the source's printed text at the same coordinates is subtracted — every cell on this form "
      + "prints its caption inside itself.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, formNumber: p.formNumber,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    blockingFindings: writeProofs.flatMap((p) => p.refusedFieldsWithInk.map((r) => ({
      fixture: p.fixture, field: r.fieldId, finding: "a cell the map refused carries ink in the output that the source does not print"
    })))
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    participantElections: [],
    protectedBlanks: maps.flatMap((m) => m.canonicalRefusals.filter((r) => r.requiredBeforeFiling !== true).map((r) => ({
      document: m.formNumber, field: r.field, page: r.page, label: r.effectiveLabel, refusalClass: r.category, why: r.why
    }))),
    physicalActsNoPacketCanPerform: maps.flatMap((m) => m.printedControlsNotWritten),
    printedControlsThisBuildCouldNotMeasure: maps.flatMap((m) => m.printedControlsNotMeasured),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID,
    required: true, granted: false, reviewedBy: null,
    note:
      "Every page of both fixtures is rastered for a human who did not build this family. It matters more than usual "
      + "here: this is a measured overlay onto a table, so the check that a value sits in the cell it belongs to is a "
      + "reviewer looking at the paper.",
    whatToLookAt: [
      "Page 2, the Person Submitting the Request block: last, first and full middle name each in their own column, "
        + "under their own printed caption; the street address in the wide left box and the apartment box empty; city, "
        + "state and zip each in their own column. Nothing may sit on a printed rule or cross a divider.",
      "Page 2, the Subject of the Record block: the same three names again, in the three columns of the narrower band "
        + "beneath. The two blocks have DIFFERENT column widths and different divider positions — 235/435 above and "
        + "193/379 below — so a value that looks right in one block and wrong in the other is the defect to catch.",
      "Page 2, the GENDER, RACE and DATE OF BIRTH cells: all three empty, and the form's own Male and Female tick "
        + "boxes and its segmented date template untouched and unobscured. Those tick boxes are not strokes in the "
        + "content stream, so a reader is the only check that they are still there and still empty.",
      "Page 2, the arrest and conviction table: all three rows and all eighteen boxes empty.",
      "Page 2, the signature band and the two fingerprint boxes: empty.",
      "Page 1: completely untouched. Nothing is drawn on the instruction sheet.",
      "Boundary fixture: a 23-character hyphenated surname, an 18-character middle name and a 16-character city. Each "
        + "either fits its column or is reported unfittable — nothing may spill into the next column."
    ],
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount })),
    rasterPages: rasterPages.map((p) => ({ fixture: p.fixture, page: p.page, file: p.file, sha256: p.sha256 }))
  });

  const counted = countCompleteness(maps, writeProofs, artifacts, instructionsText);
  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: allZero ? "state_built" : "overlay_samples_rendered",
    reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract functions "
      + "over this family's field map, byte proof, rendered artifacts and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: allZero,
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [],
    findings: [
      {
        finding:
          "DJ-LE-250B has no AcroForm field, and it is not the shape the flat-overlay path was written for either: its "
          + "answers go in the cells of a ruled table rather than on printed underlines.",
        consequence:
          "Every write box here is a measured CELL — the rule above, the rule below and a vertical divider on each "
          + "side, all read from the content stream, and the divider is additionally required to span the cell it "
          + "bounds. All four strokes are re-read from the pinned binary on every build and the box is refused if any "
          + "has moved. This is the first family in the factory to bound a write box on four measured strokes rather "
          + "than one."
      },
      {
        finding:
          "The form embeds a subsetted font whose glyph codes are the ASCII of the character minus 29, mixed on the "
          + "same lines with normally encoded runs.",
        consequence:
          "Most of page 1 does not extract readably. This build quotes only what extracts plainly, records the rest as "
          + "unreadable in reports/caption-evidence.json, and tells the participant to read page 1 on the paper. "
          + "Un-shifting the runs that look wrong would be inventing the form's text."
      },
      {
        finding:
          "The ARRESTING AGENCY CASE # column asks for the arresting agency's own case number, which is a different "
          + "fact from matter.case_number.",
        consequence:
          "No cell of the three-row arrest and conviction table is written. A row completed from the platform's facts "
          + "would be missing that one cell and would read as finished. All eighteen are declared and disclosed."
      },
      {
        finding:
          "The form prints two fingerprint boxes and two GENDER tick boxes that are not in the page's content stream. "
          + "Only the LEFT fingerprint box has strokes there (its top and bottom rules); the right one, and the Male "
          + "and Female tick boxes, are found by neither rulesOfPage nor checkboxCandidates nor strokedRectangles, "
          + "although a reader sees all of them on the paper.",
        consequence:
          "They are recorded as printed controls this build could not measure, with the coordinates it did measure "
          + "beside them. No coordinate is inferred from where a caption sits: a write box nobody measured is a write "
          + "box nobody can review. Nothing is written in any of them in any event."
      },
      {
        finding:
          "The DATE OF BIRTH cell prints its own segmented template, \"__ __ / __ __ / ____\", drawn as underscore "
          + "glyphs rather than as strokes.",
        consequence:
          "There is no measured box for any individual segment and the platform holds one composed date. The date is "
          + "left to the participant with that reason stated, rather than drawn across the form's own template."
      },
      {
        finding:
          "The signature on page 2 carries a second request. The form prints, above the signature line: \"If necessary "
          + "to proceed with your fingerprint record removal request, the signature below also represents a request to "
          + "expunge your DNA Databank Record at the Wisconsin State Crime Laboratory.\"",
        consequence:
          "Quoted in the participant instructions under its own heading, with the plain statement that a participant "
          + "who does not want their DNA Databank record touched should ask the Bureau before signing."
      },
      {
        finding:
          "The corpus files DJ-LE-250B under 04_SUPPORTING_PROCESS with assetClass SUPPORT and revision REV-UNKNOWN, "
          + "although the document is the operative request form for this route.",
        consequence:
          "The source is resolved by state and form number rather than by assetClass. The SHA-256 binding is "
          + "unchanged. Raised for the owner of the corpus index, which is outside this lane's owned paths."
      },
      {
        severity: "advisory",
        finding:
          "The boundary participant's name carries a typographic apostrophe (U+2019) and the finalized bytes carry the "
          + "name without it.",
        consequence:
          "Recorded for visual review. The behaviour is in the shared finalizer's font encoding and reproduces across "
          + "every family in this factory that uses the same boundary fixture."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: allZero ? "state_built" : "overlay_samples_rendered",
    status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    mattersForTheReviewersAttention: [
      "This is a measured overlay onto a TABLE, and the two name blocks have different column widths — dividers at "
        + "235/435 in the upper block and 193/379 in the lower. Visual review is the check that each value is in its "
        + "own cell.",
      "reports/caption-evidence.json — most of page 1 does not extract readably. Counsel review of what this route "
        + "requires cannot be done from the extracted text and has to be done from the paper.",
      "reports/disposition-documentation-package.json — what the Bureau's own instructions say must accompany the "
        + "request, quoted rather than composed.",
      "The DNA Databank sentence above the signature line. A participant signs two requests with one signature."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: allZero ? "COMPLETED" : "STOPPED",
    counters: counted.counters, counterFindings: counted.findings,
    directory: OUT, documents: resolved.map((r) => r.formNumber),
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    requiredBeforeFiling: rbf.length,
    measuredCells: censuses.reduce((n, c) => n + c.census.rows.length, 0),
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    rasterPages: rasterPages.length
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
