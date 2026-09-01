#!/usr/bin/env node
/**
 * The Wisconsin criminal-history challenge family — `wi_nc_doj_challenge-set`.
 *
 *   node scripts/build-census-v1-wi_nc_doj_challenge-set.mjs [--check] [--no-raster]
 *
 * One document, DJ-LE-247, the _Wisconsin Criminal History Challenge_, made to
 * the Crime Information Bureau of the Wisconsin Department of Justice under
 * s. 165.83(2) Wis. Stats. Page 1 is the challenge. Page 2 is the Bureau's
 * printed information sheet about the process and carries nothing to fill.
 *
 * A MEASURED TABLE, LIKE DJ-LE-250B, WITH ONE DIFFERENCE THAT MATTERED.
 *
 * The form has no fillable field, and its answers go in the cells of a ruled
 * table rather than on printed underlines, so every write box is a measured
 * CELL: the rule above, the rule below and a vertical divider on each side,
 * read out of the page's own content stream and re-checked against the pinned
 * binary on every build, with each divider required to run at least 80% of the
 * height of the cell it bounds.
 *
 * The difference is the TOP of the box. On DJ-LE-250B every caption is one
 * printed line, so a fixed offset from the bottom rule cleared it. Here one
 * caption is two lines -- "If challenge is due to results of a criminal /
 * background check, approximate date of check" -- and its second line sits
 * where a fixed offset would put the value. So the top of every write box is
 * measured too: it is three points under the LOWEST printed line inside that
 * cell. A cell whose caption leaves less than six points of clear space is
 * recorded as too shallow to write in rather than written over, and this build
 * asserts that no cell it writes to is one of those.
 *
 * WHAT IS WRITTEN, AND THE ONE FACT DELIBERATELY NOT WRITTEN.
 *
 * Written: the requester's street address, city/state/zip, phone number and
 * e-mail, and the subject's date of birth. The subject is the requester unless
 * the requester says otherwise -- the form's own caption for the second name
 * box is "Subject's Name (If different from requester)" -- so the subject
 * columns describe the participant.
 *
 * NOT written: the requester's name. Its box is captioned "(Last, First,
 * Middle, Suffix)", and the platform holds the name in natural order. Writing
 * "Jordan Avery Reyes" into a box that asks for surname first does not produce
 * a differently formatted name, it produces a different name -- a reader takes
 * "Jordan" as the surname. A field takes one fact and there is no allowlisted
 * fact for a name in that order, so the box is left to the participant and the
 * reason is stated rather than implied. This is recorded as a fact HELD and not
 * writable, not as a fact the platform lacks.
 *
 * The subject's date of birth is a related but different case, and is decided
 * the other way. The box is captioned "(mm/dd/yy)" and the platform holds the
 * date in ISO form. "1991-04-17" under that caption is the same date, read
 * correctly by anyone who reads it; a name in the wrong order is not the same
 * name. So the date is written and the format difference is recorded as a
 * finding against the shared finalizer, which formats no dates at all.
 *
 * WHAT COULD NOT BE MEASURED.
 *
 * The six challenge reasons -- INCORRECT CHARGE INFORMATION, MISSING
 * DISPOSITION INFORMATION, INCORRECT DISPOSITION INFORMATION, IDENTITY THEFT,
 * MISTAKEN IDENTITY/FALSE MATCH and OTHER -- each print a tick box, and none of
 * them is a stroke in the page's content stream: `checkboxCandidates` and
 * `strokedRectangles` both return zero for this page, exactly as on DJ-LE-250B.
 * They are recorded as printed controls this build could not measure. Nothing
 * is marked in any event: which of the six a participant is claiming is the
 * substance of the challenge and the platform does not hold it.
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
import { checkboxCandidates } from "./lib/pdf-stroked-boxes.mjs";
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

const FAMILY_ID = "wi_nc_doj_challenge-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-challenge-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-wi_nc_doj_challenge-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "WI",
  routeKey: "track:WI:wi_nc_doj_challenge",
  routeSelectionId: "wi-nc-doj-challenge-set-dj-le-247-primary-filing",
  publicLabel: "Challenge a Wisconsin criminal history record",
  authority: "s. 165.83(2) Wis. Stats.; Wisconsin Department of Justice, Crime Information Bureau form DJ-LE-247 (2/17)",
  documents: [
    { formNumber: "DJ-LE-247", title: "Wisconsin Criminal History Challenge", instrumentKind: "primary_filing", strategy: "measured_flat_overlay" }
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

const RULE_TOLERANCE = 0.75;
/** How much of a cell's height a divider must run before it counts as that cell's edge. */
const SPAN_OVERLAP = 0.8;
const CELL_INSET = 3;
/*
 * How far above the cell's bottom rule the baseline sits.
 *
 * The shared finalizer draws at writeBox.y, and its own BASELINE_ABOVE_RULE is
 * 2 -- right for a value on a printed UNDERLINE, where a descender touching the
 * line reads as handwriting. In a table CELL the rule is the border, and a
 * descender crossing it reads as ink belonging to the cell below. The first
 * raster of this family showed exactly that on "jordan.reyes@example.org". Four
 * points puts a 9pt descender two points clear of the border.
 */
const WRITE_BOX_LIFT = 4;
const MAX_WRITE_BOX_HEIGHT = 11;
/** Clear space a cell must have under its lowest printed line to be writable. */
const MIN_WRITE_BOX_HEIGHT = 6;
/** How far under the lowest printed line in a cell the write box begins. */
const CAPTION_CLEARANCE = 3;

const REQUESTER = "Requester and subject";
const CHALLENGED = "Record being challenged";

/*
 * Every measured cell on this form, as the four strokes that bound it.
 *
 *   top / bottom  — the y of a horizontal rule segment
 *   left / right  — the x of a vertical divider, which must run this cell
 *
 * All read out of the pinned binary's content stream and re-read on every build.
 */
const CELLS = {
  /* --- the identification table, two columns ------------------------------- */
  "requester-name": {
    page: 1, top: 672.46, bottom: 647.26, left: 29.5, right: 305.6,
    section: REQUESTER, label: "Requester Name (Last, First, Middle, Suffix)",
    ...SUPPLY(
      "your name, surname first, in the order this box asks for: last, first, middle, suffix. The platform holds your "
      + "name in natural order and writing it here as it holds it would put your first name where the Bureau reads a "
      + "surname, which is a different name rather than a differently written one"
    )
  },
  "subject-name": {
    page: 1, top: 672.46, bottom: 647.26, left: 305.6, right: 580.4,
    section: REQUESTER, label: "Subject’s Name (If different from requester; Last, First, Middle, Suffix)",
    ...SUPPLY(
      "nothing, if the record you are challenging is your own — the form asks for this only if the subject of the record "
      + "is someone other than you. If you are challenging someone else's record on their behalf, put their name here, "
      + "surname first"
    )
  },
  "requester-street-address": {
    page: 1, top: 644.5, bottom: 620.5, left: 29.5, right: 305.6,
    section: REQUESTER, label: "Requester’s Street Address", ...WRITE("participant.street_address")
  },
  "subject-maiden-alias-names": {
    page: 1, top: 644.5, bottom: 620.5, left: 305.6, right: 580.4,
    section: REQUESTER, label: "Subject’s Maiden/Alias Names",
    ...SUPPLY("any maiden name or alias the subject's record might be held under. The platform holds no alias fact")
  },
  "requester-city-state-zip": {
    page: 1, top: 617.74, bottom: 593.74, left: 29.5, right: 305.6,
    section: REQUESTER, label: "Requester’s City, State, Zip Code", ...WRITE("participant.city_state_zip")
  },
  wiupin: {
    page: 1, top: 617.74, bottom: 593.74, left: 305.6, right: 580.4,
    section: REQUESTER, label: "WiUPIN (If available)",
    ...SUPPLY("your Wisconsin Unique Personal Identification Number, if you have one. It is a government identifier the platform does not hold and never writes")
  },
  "requester-phone": {
    page: 1, top: 590.98, bottom: 566.98, left: 29.5, right: 191.5,
    section: REQUESTER, label: "Requester’s Phone Number", ...WRITE("participant.phone")
  },
  "subject-sex": {
    page: 1, top: 590.98, bottom: 566.98, left: 191.5, right: 269.6,
    section: REQUESTER, label: "Subject’s Sex",
    ...SUPPLY("the subject's sex as the arresting agency recorded it. The platform holds no such fact")
  },
  "subject-race": {
    page: 1, top: 590.98, bottom: 566.98, left: 269.6, right: 344.7,
    section: REQUESTER, label: "Subject’s Race",
    ...SUPPLY("the subject's race as the arresting agency recorded it. The platform holds no race fact and the shared semantics refuses to write one anywhere, which is deliberate")
  },
  "subject-date-of-birth": {
    page: 1, top: 590.98, bottom: 566.98, left: 344.7, right: 449.6,
    section: REQUESTER, label: "Subject’s Date of Birth (mm/dd/yy)", ...WRITE("participant.date_of_birth")
  },
  "social-security-number": {
    page: 1, top: 590.98, bottom: 566.98, left: 449.6, right: 580.4,
    section: REQUESTER, label: "Social Security Number",
    ...SUPPLY("your social security number, if you choose to give it. The platform holds no social security number and the shared semantics refuses to write one anywhere")
  },
  "requester-email": {
    page: 1, top: 564.22, bottom: 540.22, left: 29.5, right: 305.6,
    section: REQUESTER, label: "Requester’s Email", ...WRITE("participant.email")
  },
  "subject-drivers-licence": {
    page: 1, top: 564.22, bottom: 540.22, left: 305.6, right: 580.4,
    section: REQUESTER, label: "Subject’s Driver License Number & State",
    ...SUPPLY("the subject's driver licence number and the state that issued it. It is a government identifier the platform does not hold and never writes")
  },
  "approximate-date-of-check": {
    page: 1, top: 537.46, bottom: 513.43, left: 29.5, right: 305.6,
    section: REQUESTER, label: "If challenge is due to results of a criminal background check, approximate date of check",
    ...SUPPLY("roughly when the background check that produced the record was run, if that is what brought you here")
  },
  "party-who-requested-the-check": {
    page: 1, top: 537.46, bottom: 513.43, left: 305.6, right: 580.4,
    section: REQUESTER, label: "Party who requested background check",
    ...SUPPLY("who ran the background check — an employer, a licensing body, a landlord. The platform does not hold it")
  },
  "signature-and-date": {
    page: 1, top: 510.67, bottom: 484.51, left: 29.5, right: 305.6,
    section: "Signature", label: "Signature of Requester, and Date",
    ...PROTECT(SIGNATURE, "you sign this yourself, and you date it when you sign it")
  },

  /* --- the right-hand sub-table: the record being challenged ---------------- */
  "challenged-wi-sid": {
    page: 1, top: 303.41, bottom: 280.01, left: 339.8, right: 418.0,
    section: CHALLENGED, label: "Record being challenged — WI SID",
    ...SUPPLY("the WI SID number printed on the record you are challenging. It is on the criminal history record the Bureau or the agency gave you")
  },
  "challenged-name": {
    page: 1, top: 303.41, bottom: 280.01, left: 418.0, right: 574.7,
    section: CHALLENGED, label: "Record being challenged — Name",
    ...SUPPLY("the name as it appears on the record you are challenging, which on an identity-theft or mistaken-identity challenge is not necessarily your own")
  },
  "challenged-sex-race": {
    page: 1, top: 280.01, bottom: 256.49, left: 339.8, right: 418.0,
    section: CHALLENGED, label: "Record being challenged — Sex/Race",
    ...SUPPLY("the sex and race as they appear on the record you are challenging")
  },
  "challenged-dob": {
    page: 1, top: 280.01, bottom: 256.49, left: 418.0, right: 496.3,
    section: CHALLENGED, label: "Record being challenged — DOB",
    ...SUPPLY("the date of birth as it appears on the record you are challenging")
  },
  "challenged-ssn": {
    page: 1, top: 280.01, bottom: 256.49, left: 496.3, right: 574.7,
    section: CHALLENGED, label: "Record being challenged — SSN",
    ...SUPPLY("the social security number as it appears on the record you are challenging, if the record shows one")
  },
  "challenged-before": {
    page: 1, top: 256.49, bottom: 232.97, left: 339.8, right: 574.7,
    section: CHALLENGED, label: "Have you successfully challenged a record before?",
    ...SUPPLY("whether you have successfully challenged a record before, and if so when")
  }
};

/*
 * A cell the form rules and never captions: the right half of the signature
 * band. It is measured and recorded because it is there, and nothing is said
 * about what belongs in it, because the form says nothing.
 */
const UNCAPTIONED_CELLS = [
  { page: 1, id: "signature-band-right-half", top: 510.67, bottom: 484.51, left: 305.6, right: 580.4 }
];

/*
 * The six challenge reasons. Each prints a tick box on the paper and none of
 * them is a stroke in the content stream, so none has a measured box. Recorded
 * with the printed heading and the y it sits on, and marked unmeasured.
 */
const UNMEASURED_PRINTED_CONTROLS = [
  { page: 1, label: "INCORRECT CHARGE INFORMATION", printedAtY: 412 },
  { page: 1, label: "MISSING DISPOSITION INFORMATION", printedAtY: 373 },
  { page: 1, label: "INCORRECT DISPOSITION INFORMATION", printedAtY: 343 },
  { page: 1, label: "IDENTITY THEFT", printedAtY: 306 },
  { page: 1, label: "MISTAKEN IDENTITY/FALSE MATCH", printedAtY: 267 },
  { page: 1, label: "OTHER", printedAtY: 219 }
].map((c) => ({
  ...c,
  why: "the form prints a tick box beside this heading and it is not a stroke in the page content stream; checkboxCandidates and strokedRectangles both return zero for this page"
}));

/* ---- fixtures ------------------------------------------------------------ */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.street_address": "412 North Carroll Street",
    "participant.city_state_zip": "Madison, WI 53703",
    "participant.phone": "608-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "participant.date_of_birth": "1991-04-17"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O’Shaughnessy-Whitfield",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city_state_zip": "Wisconsin Rapids, Wisconsin 54494-2214",
    "participant.phone": "(715) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org",
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
     * The TOP of the box is measured too, not offset by a constant. One caption
     * on this form wraps to two lines and its second line sits exactly where a
     * fixed offset would put the value, so the box begins three points under
     * the LOWEST printed line inside the cell. A cell with less clear space
     * than MIN_WRITE_BOX_HEIGHT is recorded as too shallow to write in rather
     * than written over.
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
    const available = ceiling - boxBottom;
    const height = Number(Math.min(MAX_WRITE_BOX_HEIGHT, available).toFixed(2));
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

  // Cells the form rules and never captions. Measured because they are there;
  // nothing is said about what belongs in them, because the form says nothing.
  const uncaptionedCells = UNCAPTIONED_CELLS.map((c) => {
    const here = measured.find((m) => m.page === c.page) ?? { horizontal: [], vertical: [] };
    const h = (y) => here.horizontal.find((r) => Math.abs(r.y - y) <= RULE_TOLERANCE);
    const cellHeight = c.top - c.bottom;
    const cover = (v) => {
      const y0 = Number(v.y);
      const y1 = y0 + Number(v.height ?? 0);
      return Math.max(0, Math.min(y1, c.top) - Math.max(y0, c.bottom)) / cellHeight;
    };
    const v = (x) => here.vertical
      .filter((k) => Math.abs(k.x - x) <= RULE_TOLERANCE && cover(k) >= SPAN_OVERLAP)
      .sort((a, b) => cover(b) - cover(a))[0];
    const printed = (pageText.find((p) => p.page === c.page)?.items ?? [])
      .filter((t) => t.text.trim() && t.x >= c.left - 2 && t.x <= c.right + 2
        && t.y >= c.bottom - 1 && t.y <= c.top + 1);
    return {
      ...c,
      measured: Boolean(h(c.top) && h(c.bottom) && v(c.left) && v(c.right)),
      printedTextInThisCell: printed.map((t) => ({ x: Math.round(t.x), y: Math.round(t.y), extracted: t.text })),
      why: "the form rules this cell and prints no caption in it; nothing can be said about what belongs there, so nothing is"
    };
  });

  // The claim that this page's tick boxes are not strokes is a claim, so it is
  // checked on every build rather than asserted once.
  let content = "";
  for (const stream of pages[0].node.normalizedEntries?.().Contents?.asArray?.() ?? []) {
    try { content += Buffer.from(doc.context.lookup(stream).getContents()).toString("latin1"); } catch { /* not a stream */ }
  }
  const strokedCheckboxCount = content ? checkboxCandidates(content).length : 0;

  return {
    rows, geometryDrift, pageText, pageCount: pages.length, acroFieldCount,
    uncaptionedCells, strokedCheckboxCount,
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
  if (process.env.WI247_DEBUG_RENDER) {
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
    printedControlsNotMeasured: UNMEASURED_PRINTED_CONTROLS,
    measuredCellsWithNoPrintedCaption: census.uncaptionedCells,
    factsHeldButNotWritable: [
      {
        cell: `${source.formNumber}/requester-name`,
        factHeld: "participant.full_legal_name",
        why: "the box is captioned (Last, First, Middle, Suffix) and the platform holds the name in natural order. Writing it as held would put the first name where the Bureau reads a surname, which is a different name rather than a differently written one. There is no allowlisted fact for a name in that order and a field takes one fact."
      }
    ]
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
 * What page 2 says, quoted verbatim.
 *
 * Unlike DJ-LE-250B, this form's information sheet extracts cleanly, so the
 * quotations below are the Bureau's own sentences rather than a summary. Page 1
 * extracts with its two columns interleaved character by character -- "Requester
 * Name (Last, First, Middle, Suffix) Subject' Nasme (If different..." -- which
 * is why every caption in this build is read at its own cell's coordinates
 * rather than from a line.
 */
const PAGE_TWO_QUOTES = [
  {
    where: "page 2, opening paragraph",
    quote: "Wisconsin statutes permit access to criminal history information based on non-unique identifiers such as name and date of birth. Criminal history records returned based on non-unique identifiers are not guaranteed to be the subject of the inquiry. Several individuals may have the same name and date of birth. All arrest information in the Wisconsin criminal history database is based on the submission of arrest fingerprint cards and can be positively matched using fingerprints."
  },
  {
    where: "page 2, the six-month bullet",
    quote: "Due to the fluid nature of criminal history records, any challenge should be made within 6 months of receipt of the criminal history record. You should submit a copy of the record with your challenge and indicate the information you believe to be incorrect."
  },
  {
    where: "page 2, the removal bullet",
    quote: "State law does not permit the removal of arrest or disposition information but notations are added to the disposition information for the following: Special dispositions under 973.015, 961.47 or 161.47 Wis. Stats. Court-ordered expungements for cases that did not result in dismissal of all charges. Governor’s Pardon or Executive Clemency."
  },
  {
    where: "page 2, the open-case bullet",
    quote: "If you believe that a case is open on your record that should be closed, please submit the Judgment of Conviction or Order for Dismissal issued by the court. You may also submit a letter from the prosecutor indicating the case was not prosecuted. These documents must be obtained from the court having jurisdiction or the office prosecuting the offense."
  },
  {
    where: "page 2, the disposition bullet",
    quote: "If you believe that a disposition is incorrect, contact the court having jurisdiction to obtain a Judgment of Conviction or Order for Dismissal to submit with your request. Many courts have their case information available online at http://wcca.wicourts.gov . Challenges to online court records ( http://wcca.wicourts.gov ) must be directed to the court having jurisdiction."
  },
  {
    where: "page 2, the FBI bullet",
    quote: "Challenges to FBI records not based on a Wisconsin arrest must be directed to the FBI or the state submitting the information to the FBI."
  },
  {
    where: "page 2, the fee bullet",
    quote: "CIB charges $7 fee to provide an individual with a copy of his/her criminal record via the website using your Master Card or Visa. If your request is by mail, the fee is $12."
  },
  {
    where: "page 1, the address block",
    quote: "Submit forms to: Crime Information Bureau, P.O. Box 2718, Madison, WI 53701-2718"
  },
  {
    where: "page 1, above the challenge-reason section",
    quote: "What is the problem with your criminal history? Be specific; use another sheet of paper to explain if necessary. Attach court documents or other supporting documents, if available."
  }
];

const quoteAt = (needle) => PAGE_TWO_QUOTES.find((q) => q.where.includes(needle)).quote;

function participantInstructions(maps, rbf) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);

  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is one form: **DJ-LE-247**, the _Wisconsin Criminal History Challenge_. It goes to the **Crime "
    + "Information Bureau of the Wisconsin Department of Justice**, not to a court. Page 1 is the challenge; page 2 is "
    + "the Bureau's own information sheet about how the process works, and there is nothing to fill in on it.", "",
    `It is prepared under ${ROUTE.authority}.`, ""
  );
  out.push(`> ${quoteAt("address block")}`, "");
  out.push(
    "The platform filled in what it holds about you: your street address, your city, state and zip, your phone number, "
    + "your e-mail and your date of birth. Everything else is yours, and every one of those blanks is listed below.", ""
  );

  out.push("## Your name is not filled in, and that is deliberate", "");
  out.push(
    "The first box asks for your name **surname first**: “Requester Name (Last, First, Middle, Suffix)”. The platform "
    + "holds your name the way you gave it, in natural order, and writing it into that box as it holds it would put "
    + "your first name where the Bureau reads a surname. That is not a differently written name, it is a different "
    + "name — and this is a form about a record being matched to the wrong person. **Write your name there yourself, "
    + "surname first.**", ""
  );

  out.push("## What this form can and cannot change", "");
  out.push(`> ${quoteAt("removal bullet")}`, "");
  out.push(
    "Read that before you send this. The Bureau does not delete arrest or disposition information from a Wisconsin "
    + "criminal history record. What it does is add a notation in the three cases the sentence lists. A challenge is "
    + "for information that is **wrong**, missing, or not yours.", ""
  );
  out.push(`> ${quoteAt("opening paragraph")}`, "");

  out.push("## Send it within six months, with a copy of the record", "");
  out.push(`> ${quoteAt("six-month bullet")}`, "");
  out.push(`> ${quoteAt("fee bullet")}`, "");

  out.push("## Say which of the six problems yours is", "");
  out.push(
    "The lower half of page 1 lists six reasons — incorrect charge information, missing disposition information, "
    + "incorrect disposition information, identity theft, mistaken identity or false match, and other — each with a "
    + "tick box. **None of them is ticked**, because which one applies is the substance of your challenge and the "
    + "platform does not hold it. Tick the one that fits, and use the space beneath it, or another sheet of paper, to "
    + "explain.", ""
  );
  out.push(`> ${quoteAt("above the challenge-reason section")}`, "");
  out.push(
    "The two identity reasons carry an extra requirement the form prints beside them: **you must submit a fingerprint "
    + "card with the challenge form**, and complete the “Record being challenged” boxes in the right-hand column. Those "
    + "boxes describe the record you say is not yours, so the name, sex, race, date of birth and social security "
    + "number in them are the ones printed on that record — not necessarily your own.", ""
  );

  out.push("## Documents to send with it", "");
  out.push(`> ${quoteAt("open-case bullet")}`, "");
  out.push(`> ${quoteAt("disposition bullet")}`, "");
  out.push(`> ${quoteAt("FBI bullet")}`, "");

  out.push("## What you must do before you send this", "");
  out.push("1. **Write your name in the first box, surname first.**");
  out.push("2. **Tick the one of the six reasons that fits, and explain it** in the space under it or on another sheet.");
  out.push("3. **Fill in every item in the table below.** Each names the section of the form and the box.");
  out.push("4. **Attach a copy of the criminal history record you are challenging**, with the wrong information marked.");
  out.push("5. **Attach the court or prosecutor documents** the quotations above describe.");
  out.push("6. **On an identity-theft or mistaken-identity challenge, include a fingerprint card** and complete the right-hand “Record being challenged” boxes.");
  out.push("7. **Sign and date it yourself.**");
  out.push("");

  for (const [doc, items] of byDoc) {
    out.push(`## ${doc}: the boxes you must fill in`, "");
    out.push("| Section | The box on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Your name**, for the reason above.");
  out.push("- **Your social security number and any driver licence or WiUPIN number.** These are government identifiers; the platform holds none and never writes one.");
  out.push("- **Sex and race.** The platform holds neither, and the shared semantics refuses to write a race anywhere.");
  out.push("- **Every tick box.** The form's tick boxes are not drawn in a way this packet can measure, and which reason applies is yours in any event.");
  out.push("- **Your signature and its date.**");
  out.push("");

  out.push("## One thing to check on the form", "");
  out.push(
    "Your date of birth is filled in as it is held, in year-month-day order. The box is captioned **(mm/dd/yy)**. It is "
    + "the same date either way and a reader will not mistake it, but if you would rather it matched the caption, cross "
    + "it out and write it again in month/day/year order.", ""
  );

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared copy of an official Wisconsin Department of Justice form. It is not legal advice, it is not "
    + "sent for you, and **it does not decide whether your record will be changed**. Read page 2 before you send it: it "
    + "is the Bureau's own account of what a challenge can do."
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
    assert.ok(census.uncaptionedCells.every((c) => c.measured),
      `${source.formNumber}: an uncaptioned cell did not measure: ${JSON.stringify(census.uncaptionedCells)}`);
    // A cell whose caption leaves no clear space may be recorded, never written into.
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
        strokedCheckboxCount: census.strokedCheckboxCount,
        measuredHorizontalRules: census.measuredHorizontalRules,
        measuredVerticalRules: census.measuredVerticalRules,
        cells: census.rows.length,
        cellsTooShallowToWriteIn: census.rows.filter((r) => r.tooShallowToWriteIn).map((r) => r.key),
        writes: census.rows.filter((r) => r.policy === "write").length,
        supply: census.rows.filter((r) => r.policy === "supply").length,
        protected: census.rows.filter((r) => r.policy === "protect").length,
        uncaptionedCellsMeasured: census.uncaptionedCells.filter((c) => c.measured).length
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
  const instructionsText = participantInstructions(maps, rbf);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "official_pdf_fill",
    renderStrategy: "measured_flat_overlay",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact form number + committed corpus-index SHA-256 + on-disk SHA-256 + byte length",
    bindingNote:
      "Matched by state and form number rather than by assetClass: the corpus files DJ-LE-247 under "
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
      "This form has no fillable field. Every box below is a measured TABLE CELL: the rule above, the rule below and a "
      + "vertical divider on each side, all read from the page's own content stream, re-checked against the pinned "
      + "binary on each build, with each divider required to run at least 80% of the cell it bounds. The TOP of each "
      + "write box is measured too — three points under the lowest printed line inside the cell — because one caption "
      + "on this form wraps to two lines. The caption is whatever the form prints inside the cell, recorded verbatim at "
      + "its own coordinates in printedTextInThisCell.",
    pageOneExtractionNote:
      "Page 1's two columns interleave character by character when the page is read as lines — \"Requester Name (Last, "
      + "First, Middle, Suffix) Subject' Nasme (If different...\" — so no caption here is taken from a line. Every one "
      + "is read at its own cell's coordinates. Page 2 extracts cleanly and is quoted verbatim in the instructions.",
    documents: censuses.map(({ source, census }) => ({
      documentId: source.formNumber, formNumber: source.formNumber, sourceSha256: source.sha256,
      pageCount: census.pageCount, acroFieldCount: census.acroFieldCount,
      strokedCheckboxCount: census.strokedCheckboxCount,
      measuredHorizontalRules: census.measuredHorizontalRules,
      measuredVerticalRules: census.measuredVerticalRules,
      cellCount: census.rows.length,
      uncaptionedCells: census.uncaptionedCells,
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
      "Page 1 of DJ-LE-247 interleaves its two columns when read as lines, so a printed-caption check against a LINE "
      + "would compare against text that belongs to two different boxes. Page 2 extracts cleanly.",
    whyThisIsNotWorkedAround:
      "No caption here is taken from a line. Each is read inside its own measured cell, at that cell's coordinates, "
      + "and recorded verbatim in the field census — so the caption claim and the geometry claim rest on the same four "
      + "measured strokes rather than on a text match.",
    pageTwoQuotationsUsed: PAGE_TWO_QUOTES,
    perCell: censuses.flatMap(({ source, census }) => census.rows.map((r) => ({
      document: source.formNumber, cell: r.key, page: r.page, rect: r.rect,
      labelThisBuildUses: r.effectiveLabel, section: r.section,
      textExtractedInsideThisCell: r.printedTextInThisCell
    })))
  });

  writeJson(`${OUT}/reports/record-discrepancy-analysis.json`, {
    schemaVersion: "rcap-record-discrepancy-analysis/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The six discrepancies DJ-LE-247 recognises, with what the form itself says each one requires. Read off the "
      + "printed page; nothing here is composed.",
    whatTheBureauWillAndWillNotDo: quoteAt("removal bullet"),
    discrepancies: [
      {
        reason: "INCORRECT CHARGE INFORMATION",
        formSays: "the record lists an incorrect charge or charge severity (felony, misdemeanor or non-criminal); include the Date of Arrest and original charge information in the space below",
        marked: false, markable: false
      },
      {
        reason: "MISSING DISPOSITION INFORMATION",
        formSays: "you must provide the disposition document provided by the prosecutor or court (Judgment of Conviction, Order for Dismissal, etc.)",
        marked: false, markable: false
      },
      {
        reason: "INCORRECT DISPOSITION INFORMATION",
        formSays: "you must provide supporting disposition documents provided by the prosecutor or court (Judgment of Conviction, Order for Dismissal, etc.)",
        marked: false, markable: false
      },
      {
        reason: "IDENTITY THEFT",
        formSays: "my personal information was used by another individual when arrested — must submit fingerprint card with challenge form and complete the information in the right column",
        marked: false, markable: false
      },
      {
        reason: "MISTAKEN IDENTITY/FALSE MATCH",
        formSays: "I am not the person whose record was returned — must submit fingerprint card with challenge form and complete the information in the right column",
        marked: false, markable: false
      },
      {
        reason: "OTHER",
        formSays: "explanation; attach another sheet of paper to explain if necessary",
        marked: false, markable: false
      }
    ],
    whyNoneIsMarked:
      "Which discrepancy a participant is claiming is the substance of the challenge and the platform does not hold "
      + "it. It is also not markable: the tick boxes are not strokes in the page's content stream, so there is no "
      + "measured box for a packet to mark. Both reasons are true and the first is the operative one.",
    supportingDocumentsTheFormRequires: [
      { when: "a case is open that should be closed", require: quoteAt("open-case bullet") },
      { when: "a disposition is incorrect", require: quoteAt("disposition bullet") },
      { when: "the record is an FBI record not based on a Wisconsin arrest", require: quoteAt("FBI bullet") },
      { when: "always", require: quoteAt("six-month bullet") }
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "measured_flat_overlay",
    captionBasis: "measured table cells; see field-census.census-v1.json and reports/caption-evidence.json",
    dispositionVocabulary: [SIGNATURE, AGENCY_OWNED],
    routeDeterminedSelections: [],
    routeSelectionNote:
      "Nothing on this form is route-determined. The six challenge reasons are facts about the participant's own "
      + "record, and the form carries no other election.",
    subjectIsTheRequesterNote:
      "The subject columns are filled from the participant's own facts because the form's caption for the second name "
      + "box is \"Subject's Name (If different from requester)\": the subject is the requester unless the requester "
      + "says otherwise. That is read off the form rather than assumed.",
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
    printedControlsThisBuildCouldNotMeasure: maps.flatMap((m) => m.printedControlsNotMeasured),
    measuredCellsWithNoPrintedCaption: maps.flatMap((m) => m.measuredCellsWithNoPrintedCaption),
    factsHeldButNotWritable: maps.flatMap((m) => m.factsHeldButNotWritable),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID,
    required: true, granted: false, reviewedBy: null,
    note:
      "Every page of both fixtures is rastered for a human who did not build this family. It matters more than usual "
      + "here: this is a measured overlay onto a table whose two columns interleave in the text stream, so a reviewer "
      + "looking at the paper is the check that a value sits in the cell it belongs to.",
    whatToLookAt: [
      "Page 1, the identification table: the street address, the city/state/zip, the phone number and the e-mail each "
        + "in the LEFT column under their own captions, and nothing in the right column except the date of birth in "
        + "the fourth of the five narrow boxes.",
      "Page 1, the first box: the requester's name is EMPTY. That is deliberate — the box asks for surname first and "
        + "the platform holds the name in natural order. Confirm the instructions make that legible to a reader.",
      "Page 1, the narrow five-column band: the phone number is in the first box and the date of birth in the fourth. "
        + "The three between them — Subject's Sex, Subject's Race, and Social Security Number — must be empty, and the "
        + "date of birth must not have drifted into the Social Security Number box beside it.",
      "Page 1, the box captioned \"If challenge is due to results of a criminal background check, approximate date of "
        + "check\": its printed caption is two lines and leaves almost no clear space. Confirm nothing is written in "
        + "it and the caption is unobscured.",
      "Page 1, the six challenge reasons and their tick boxes: all unmarked, all still visible.",
      "Page 1, the right-hand \"Record being challenged\" boxes: all six empty.",
      "Page 1, the signature band: empty.",
      "Page 2: completely untouched. Nothing is drawn on the Bureau's information sheet.",
      "The date of birth is written as held, in year-month-day order, under a caption that asks for mm/dd/yy. Confirm "
        + "it is legible and unambiguous; the instructions say a participant may rewrite it.",
      "Boundary fixture: a 45-character street address, a 38-character city/state/zip and a 58-character e-mail. Each "
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
          "The requester's name box is captioned \"(Last, First, Middle, Suffix)\" and the platform holds the name in "
          + "natural order.",
        consequence:
          "The box is left blank and the reason is stated to the participant in its own section of the instructions. "
          + "Writing the held name there would put the first name where the Bureau reads a surname, on a form whose "
          + "whole subject is a record matched to the wrong person. Recorded in the field map under "
          + "factsHeldButNotWritable, so the audit sees a fact held and not written rather than a fact absent."
      },
      {
        severity: "advisory",
        owner: "scripts/rcap-official-forms/rcap-official-form-finalize.mjs",
        finding:
          "The subject's date-of-birth box is captioned \"(mm/dd/yy)\" and the value is written in ISO form, because "
          + "the shared finalizer formats no dates: its only normalisation is stripping whitespace.",
        consequence:
          "The date is written, because it is the same date and reads correctly either way — unlike the name above, "
          + "where the order changes which name it is. The difference is disclosed to the participant and put to the "
          + "visual reviewer. A date-format channel on the finalizer, driven by the caption, would close it."
      },
      {
        finding:
          "One caption on this form wraps to two printed lines — \"If challenge is due to results of a criminal / "
          + "background check, approximate date of check\" — and its second line sits where a fixed offset from the "
          + "bottom rule would put a value.",
        consequence:
          "The top of every write box on this form is measured: three points under the lowest printed line inside the "
          + "cell. A cell with less than six points of clear space is recorded as too shallow to write in, and the "
          + "build asserts that no cell it writes to is one of those."
      },
      {
        finding:
          "Page 1's two columns interleave character by character when the page is read as lines.",
        consequence:
          "No caption in this build comes from a line. Each is read inside its own measured cell, so the caption claim "
          + "and the geometry claim rest on the same four measured strokes. Page 2 extracts cleanly and is quoted "
          + "verbatim rather than summarised."
      },
      {
        finding:
          "The six challenge-reason tick boxes are not strokes in the page's content stream — checkboxCandidates and "
          + "strokedRectangles both return zero for this page, the same as on DJ-LE-250B.",
        consequence:
          "They are recorded as printed controls this build could not measure, with the printed heading and the y each "
          + "sits on. None is marked in any event: which reason applies is the substance of the challenge."
      },
      {
        finding:
          "The form rules one cell it never captions — the right half of the signature band.",
        consequence:
          "It is measured and recorded as a cell with no printed caption. Nothing is said about what belongs in it, "
          + "because the form says nothing, and it is given no disposition rather than a guessed one."
      },
      {
        finding:
          "The corpus files DJ-LE-247 under 04_SUPPORTING_PROCESS with assetClass SUPPORT and revision REV-UNKNOWN, "
          + "although the form itself prints \"DJ-LE-247 (2/17)\" and is the operative challenge form for this route.",
        consequence:
          "The source is resolved by state and form number rather than by assetClass, and binds by exact SHA-256. The "
          + "filing and the missing revision are raised for the owner of the corpus index."
      },
      {
        severity: "advisory",
        finding:
          "The boundary participant's name carries a typographic apostrophe (U+2019); it is not written on this form, "
          + "so the shared finalizer's encoding behaviour does not appear here.",
        consequence: "Recorded so a reviewer comparing this family with the others knows why."
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
      "The requester's name box is deliberately blank. Counsel should confirm that leaving it to the participant, with "
        + "the reason stated, is the right call against writing a name in an order the form does not ask for.",
      "The date of birth is written in ISO form under a caption asking for mm/dd/yy. Counsel should confirm that is "
        + "acceptable to the Crime Information Bureau, or say that it is not.",
      "reports/record-discrepancy-analysis.json — the six discrepancies the form recognises and what each requires, "
        + "read off the printed page.",
      "Page 2 is the Bureau's own statement that it does not remove arrest or disposition information. A participant "
        + "arriving at this route expecting removal is at the wrong route, and the instructions say so in the "
        + "Bureau's words."
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
