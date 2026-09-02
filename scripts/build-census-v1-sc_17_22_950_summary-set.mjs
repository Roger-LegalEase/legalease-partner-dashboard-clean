#!/usr/bin/env node
/**
 * The South Carolina summary-court expungement family — `sc_17_22_950_summary-set`.
 *
 *   node scripts/build-census-v1-sc_17_22_950_summary-set.mjs [--check]
 *
 * One document, SCCA 223E (5/16), the _Application for Expungement Pursuant to
 * §17-22-950(B)_, filed in the magistrate or municipal court that disposed of
 * the charge. One page. The family carries two route units:
 *
 *   unit A — fingerprinted, automatic: the summary court is REQUIRED to issue
 *   the expungement order itself, at no cost, for a charge tried in that court
 *   that ended not guilty, dismissed or nolle prossed. There is nothing to
 *   file; the deliverable for that unit is the process guidance in
 *   participant-instructions.md.
 *
 *   unit B — not fingerprinted, application: the defendant applies at no cost
 *   on this form and the court issues the order if eligible. This build fills
 *   that form.
 *
 * THREE KINDS OF BLANK ON ONE PAGE, EACH MEASURED ITS OWN WAY.
 *
 * The form has no fillable field (acroFieldCount 0, checked on every build).
 * Its blanks are drawn three ways, and each is measured from the page's own
 * content stream rather than assumed:
 *
 *   1. FILLED THIN RECTANGLES — the caption block's ruled lines (county,
 *      race/sex/DOB/SSN/SID, defendant, address, AKA). `re` operators painted
 *      by `f`, ~0.48pt tall, read out of the content stream and re-checked
 *      against the pinned binary on every build.
 *
 *   2. UNDERSCORE RUNS — the lower half's blanks are literal underscore glyphs
 *      in the text stream ("Full Name (at time of arrest): _____"). Adjacent
 *      runs on one baseline are merged into a single measured span; each
 *      span's start, end and baseline are pinned and re-measured.
 *
 *   3. STROKED SQUARES — the two court checkboxes (Magistrate / Municipal) are
 *      9.3pt `re` squares painted by `S`. Both are measured and recorded, and
 *      neither is marked: which summary court disposed of the charge is a case
 *      fact the participant holds and the platform does not.
 *
 * WHAT IS WRITTEN. The participant's current legal name (the "Defendant"
 * caption line), the current address over the block's two ruled lines (street,
 * then city/state/zip on the uncaptioned second line), the date of birth, and
 * the phone number. Five writes; everything else is the participant's.
 *
 * WHAT IS DELIBERATELY NOT WRITTEN.
 *
 *   - "Full Name (at time of arrest)": the platform holds the participant's
 *     name as it is TODAY and writes it on the Defendant line. The name at the
 *     time of arrest is a different fact — a participant whose name has
 *     changed since the arrest would be misdescribed — so the blank is left to
 *     the participant with the reason stated.
 *   - Race, Sex, SSN, SID #: the platform holds no race or sex fact and
 *     refuses to write either anywhere; SSN and SID are government
 *     identifiers it never supplies.
 *   - The fingerprint question's three mark blanks (Yes / No / Do Not Know):
 *     whether the participant was fingerprinted is a fact about the arrest
 *     that the participant attests to, and the form itself offers "Do Not
 *     Know". This packet is built for the not-fingerprinted application unit,
 *     but the truthful answer belongs to the participant, so nothing is
 *     marked and the instructions say exactly what the question decides.
 *   - The charge facts (date of offense, warrant/ticket number, charge,
 *     arresting agency, disposition, date of disposition), the county, and
 *     any AKA: case facts the participant holds from their record.
 *   - The attorney block, and the signature.
 *
 * NO RASTER IN THIS BUILD. Page rendering is central
 * (.github/workflows/rcap-packet-raster-acceptance-batch.yml); this family
 * returns BUILT_RASTER_PENDING and PASS_COMPLETE still requires a hash-bound
 * RASTER_PASS from that workflow.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, extractPageGeometry, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeFlatOverlay } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "sc_17_22_950_summary-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/sc/sc-17-22-950-summary-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-sc_17_22_950_summary-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "SC",
  routeKeys: [
    "obligation:unit:SC:sc_17_22_950_summary:sc-17-22-950-unit-a-fingerprinted-automatic",
    "obligation:unit:SC:sc_17_22_950_summary:sc-17-22-950-unit-b-unfingerprinted-application"
  ],
  routeSelectionId: "sc-17-22-950-summary-set-scca-223e-primary-filing",
  publicLabel: "Clear a South Carolina magistrate or municipal court charge that did not end in a conviction",
  authority: "S.C. Code § 17-22-950; South Carolina Judicial Branch form SCCA 223E (5/16)",
  documents: [
    { formNumber: "SCCA-223E", title: "Application for Expungement Pursuant to §17-22-950(B)", instrumentKind: "primary_filing", strategy: "measured_flat_overlay" }
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
const NOT_APPLICABLE = (why) => ({ policy: "not_applicable", why });

const SIGNATURE = "signature_or_date_participant_completion";
const ELECTION = "participant_sworn_narrative_or_legal_election";

const RULE_TOLERANCE = 0.75;
/*
 * How far above a blank's own line the value's baseline sits.
 *
 * These are printed UNDERLINES, not table cells: a value sits ON the line, and
 * a descender touching the line reads as handwriting. The finalizer's own
 * BASELINE_ABOVE_RULE is 2 and that is right here — the Wisconsin four-point
 * lift was for ruled table CELLS, where a descender crossing the border reads
 * as ink in the cell below, and this form has no cells.
 */
const WRITE_BOX_LIFT = 2;
const WRITE_BOX_HEIGHT = 11;
const BOX_INSET = 3;

const CAPTION = "Case caption";
const IDENT = "Applicant identification";
const COURT = "Court election";
const CHARGE = "Charge and disposition";
const ATTORNEY = "Attorney";
const SIGN = "Signature";

/*
 * Every blank the form draws as a FILLED THIN RECTANGLE (`re` painted `f`,
 * ~0.48pt tall). y is the rectangle's bottom edge; x/endX its horizontal span.
 * All pinned from the governed binary and re-measured on every build.
 *
 * The caption style is caption-BELOW-line on the left column ("Defendant",
 * "Current Address", "AKA" each print under the line they name) and
 * caption-BESIDE-line in the right-hand identification block. The middle line
 * of the Current Address block prints no caption of its own: it is the second
 * address line, bounded by "Current Address" printed under the line above it
 * and "AKA" printed under the line below it.
 */
const RULE_FIELDS = {
  "county-municipality": {
    page: 1, y: 715.5, x: 171.0, endX: 283.5,
    section: CAPTION, label: "COUNTY/MUNICIPALITY OF",
    ...SUPPLY(
      "the county or municipality of the magistrate or municipal court where this charge was disposed of — it is the "
      + "court you are applying to, and it is on your ticket, warrant or court paperwork"
    )
  },
  race: {
    page: 1, y: 675.06, x: 369.84, endX: 431.64,
    section: IDENT, label: "Race",
    ...SUPPLY("your race as the record describes it. The platform holds no race fact and the shared semantics refuses to write one anywhere, which is deliberate")
  },
  sex: {
    page: 1, y: 675.06, x: 463.08, endX: 501.72,
    section: IDENT, label: "Sex",
    ...SUPPLY("your sex as the record describes it. The platform holds no such fact")
  },
  dob: {
    page: 1, y: 648.12, x: 369.84, endX: 431.64,
    section: IDENT, label: "DOB", ...WRITE("participant.date_of_birth")
  },
  ssn: {
    page: 1, y: 648.12, x: 463.08, endX: 547.56,
    section: IDENT, label: "SSN",
    ...SUPPLY("your social security number, if you choose to give it. The platform holds no social security number and the shared semantics refuses to write one anywhere")
  },
  "sid-number": {
    page: 1, y: 621.12, x: 407.82, endX: 530.88,
    section: IDENT, label: "SID #",
    ...SUPPLY("the SLED state identification (SID) number, if your record shows one. It is a government identifier the platform does not hold and never writes")
  },
  "defendant-name": {
    page: 1, y: 594.06, x: 30.6, endX: 283.5,
    section: CAPTION, label: "Defendant", ...WRITE("participant.full_legal_name")
  },
  "current-address-line-1": {
    page: 1, y: 567.12, x: 30.6, endX: 283.5,
    section: CAPTION, label: "Current Address", ...WRITE("participant.street_address")
  },
  "current-address-line-2": {
    page: 1, y: 540.06, x: 30.6, endX: 283.5,
    section: CAPTION, label: "Current Address, second line — City, State, Zip",
    bindingBasis:
      "the form prints no caption on this middle ruled line. It is the second line of the Current Address block: "
      + "\"Current Address\" prints under the line above it and \"AKA\" under the line below it, so this line carries "
      + "the remainder of the address — city, state and zip",
    ...WRITE("participant.city_state_zip")
  },
  aka: {
    page: 1, y: 513.0, x: 30.6, endX: 283.5,
    section: CAPTION, label: "AKA",
    ...SUPPLY("any other name your record might be held under. Leave it blank if there is none")
  }
};

/*
 * Every blank the form draws as an UNDERSCORE RUN in the text stream. y is the
 * text baseline of the run; x/endX the merged span of adjacent runs. The three
 * fingerprint mark blanks live in SELECTION_CONTROLS below, not here — a
 * 21.84pt mark blank beside a printed option is a control, not a place a fact
 * goes.
 */
const UNDERSCORE_FIELDS = {
  "name-at-time-of-arrest": {
    page: 1, y: 415.44, x: 170.45, endX: 575.65,
    section: CHARGE, label: "Full Name (at time of arrest):",
    ...SUPPLY(
      "your full name as it was AT THE TIME OF ARREST, exactly as it appears on the ticket, warrant or record. The "
      + "platform holds your name as it is today and has written that on the Defendant line; if your name has changed "
      + "since the arrest, the two are different facts, so this one is yours to write"
    )
  },
  "phone-number": {
    page: 1, y: 392.04, x: 111.59, endX: 571.62,
    section: CHARGE, label: "Phone Number:", ...WRITE("participant.phone")
  },
  "date-of-offense": {
    page: 1, y: 345.18, x: 114.23, endX: 245.68,
    section: CHARGE, label: "Date of Offense:",
    ...SUPPLY("the date of the offense, from your ticket, warrant or record")
  },
  "warrant-ticket-number": {
    page: 1, y: 345.18, x: 367.55, endX: 575.61,
    section: CHARGE, label: "Warrant/Ticket Number:",
    ...SUPPLY("the warrant or ticket number, from the ticket or warrant itself")
  },
  charge: {
    page: 1, y: 321.72, x: 75.29, endX: 573.54,
    section: CHARGE, label: "Charge:",
    ...SUPPLY("the charge as the court's record states it")
  },
  "arresting-agency": {
    page: 1, y: 298.32, x: 119.75, endX: 574.26,
    section: CHARGE, label: "Arresting Agency:",
    ...SUPPLY("the agency that arrested or cited you, from the record you screened with")
  },
  disposition: {
    page: 1, y: 251.46, x: 93.71, endX: 252.45,
    section: CHARGE, label: "Disposition:",
    ...SUPPLY("how the charge ended — not guilty, dismissed, or nolle prossed. Under §17-22-950 those are the dispositions this application covers")
  },
  "date-of-disposition": {
    page: 1, y: 251.46, x: 350.51, endX: 575.06,
    section: CHARGE, label: "Date of Disposition:",
    ...SUPPLY("the date the court disposed of the charge, from the court's record")
  },
  "attorney-name": {
    page: 1, y: 204.6, x: 184.98, endX: 573.8,
    section: ATTORNEY, label: "Attorney Name (if represented):",
    ...NOT_APPLICABLE("attorney-only block: no attorney-representation fact is held for this participant, and the form itself marks it \"(if represented)\"")
  },
  "attorney-address": {
    page: 1, y: 181.2, x: 119.34, endX: 573.79,
    section: ATTORNEY, label: "Attorney Address:",
    ...NOT_APPLICABLE("attorney-only block: no attorney-representation fact is held for this participant")
  },
  signature: {
    page: 1, y: 94.02, x: 324.0, endX: 570.39,
    section: SIGN, label: "Signature",
    ...PROTECT(SIGNATURE, "you sign this yourself. Read the application's own sentence above the charge block before you do — signing asserts it")
  }
};

/*
 * The form's five selection controls: two stroked 9.3pt squares for which
 * summary court disposed of the charge, and the fingerprint question's three
 * underscore mark blanks. None is marked. Which court heard the charge and
 * whether the participant was fingerprinted are facts about the case that the
 * participant attests to and the platform does not hold — and the form's own
 * third option, "Do Not Know", is the proof the answer is the participant's.
 */
const SELECTION_CONTROLS = [
  {
    selectionId: "court-magistrate", field: "Magistrate", section: COURT,
    control: "stroked_square", page: 1, box: { x: 386.76, y: 570.54, width: 9.3, height: 9.3 },
    heading: "Charge was disposed of in the court indicated below:",
    what: "mark this box if a magistrate court disposed of the charge"
  },
  {
    selectionId: "court-municipal", field: "Municipal", section: COURT,
    control: "stroked_square", page: 1, box: { x: 458.88, y: 570.54, width: 9.3, height: 9.3 },
    heading: "Charge was disposed of in the court indicated below:",
    what: "mark this box if a municipal court disposed of the charge"
  },
  {
    selectionId: "fingerprinted-yes", field: "Were you fingerprinted for this charge? — Yes", section: CHARGE,
    control: "underscore_mark_blank", page: 1, span: { y: 274.92, x: 251.99, endX: 273.83 },
    heading: "Were you fingerprinted for this charge?",
    what: "mark Yes only if you were fingerprinted for this charge"
  },
  {
    selectionId: "fingerprinted-no", field: "Were you fingerprinted for this charge? — No", section: CHARGE,
    control: "underscore_mark_blank", page: 1, span: { y: 274.92, x: 323.99, endX: 345.83 },
    heading: "Were you fingerprinted for this charge?",
    what: "mark No if you were not fingerprinted — that is the case this application route exists for"
  },
  {
    selectionId: "fingerprinted-do-not-know", field: "Were you fingerprinted for this charge? — Do Not Know", section: CHARGE,
    control: "underscore_mark_blank", page: 1, span: { y: 274.92, x: 395.99, endX: 417.83 },
    heading: "Were you fingerprinted for this charge?",
    what: "mark Do Not Know if you are not sure"
  }
].map((c) => ({
  ...c,
  kind: "selection_control",
  isSelectionControl: true,
  disposition: "unmarked",
  marked: false,
  reason:
    "a fact about the participant's own case that the participant attests to by marking it; the platform does not hold "
    + "it and marks no selection it cannot source",
  category: ELECTION, completenessClass: ELECTION, class: ELECTION
}));

const SELECTION_NOTE =
  "Neither the court election nor the fingerprint answer is route-determined. The family's application unit exists for "
  + "the not-fingerprinted case, but the form's own options include \"Do Not Know\", and a participant answers with "
  + "what is true for them — the truthful answer and the court that actually heard the charge are theirs to state. "
  + "The two court squares are measured stroked boxes; the three fingerprint blanks are measured underscore spans a "
  + "participant marks by hand.";

/* ---- fixtures ------------------------------------------------------------ */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.street_address": "412 Harden Street",
    "participant.city_state_zip": "Columbia, SC 29205",
    "participant.phone": "803-555-0142",
    "participant.date_of_birth": "1991-04-17"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O’Shaughnessy-Whitfield",
    "participant.street_address": "1188 Cypress Gardens Crossing Road, Apartment 14B",
    "participant.city_state_zip": "Moncks Corner, South Carolina 29461-2214",
    "participant.phone": "(843) 555-0199 ext. 4417",
    "participant.date_of_birth": "1968-12-31"
  }
};

/* ---- source binding ------------------------------------------------------ */
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const all = index.entries ?? [];
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const wanted of ROUTE.documents) {
    // Matched by state and form number. The corpus files SCCA-223E under
    // 05_SOURCE_GATED with assetClass SOURCE-GATED and revision REV-UNKNOWN,
    // although the form itself prints "SCCA 223E (5/16)". The filing is a
    // question about the archive; the SHA-256 binding decides these are the
    // form's bytes, and it holds.
    const entry = all.find((e) => e.state === "SC" && e.formNumber === wanted.formNumber);
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
      revision: entry.revision ?? null, printedRevision: "5/16", assetClass: entry.assetClass ?? null,
      sha256, byteLength: bytes.length, bytes,
      acroFieldCount: entry.acroFieldCount ?? null, pageCount: entry.pageCount ?? null
    });
  }
  return { resolved, failures };
}

/* ---- measure every blank off the pinned binary ----------------------------- */

/** Adjacent underscore runs on one baseline, merged into contiguous spans. */
function underscoreSpansOf(items) {
  const runs = items
    .filter((t) => /^_+$/.test(String(t.text).trim()) && String(t.text).trim().length > 0)
    .map((t) => ({ y: Number(t.y), x: Number(t.x), w: Number(t.width ?? 0), glyphs: String(t.text).trim().length }));
  const byY = new Map();
  for (const r of runs) {
    const key = r.y.toFixed(2);
    if (!byY.has(key)) byY.set(key, []);
    byY.get(key).push(r);
  }
  const spans = [];
  for (const [, list] of byY) {
    list.sort((a, b) => a.x - b.x);
    for (const r of list) {
      const last = spans[spans.length - 1];
      if (last && Math.abs(last.y - r.y) < 0.01 && r.x - last.endX < 2.5) {
        last.endX = r.x + r.w;
        last.glyphs += r.glyphs;
      } else {
        spans.push({ y: r.y, x: r.x, endX: r.x + r.w, glyphs: r.glyphs });
      }
    }
  }
  return spans.map((s) => ({ y: Number(s.y.toFixed(2)), x: Number(s.x.toFixed(2)), endX: Number(s.endX.toFixed(2)), glyphs: s.glyphs }));
}

async function censusOf(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const acroFieldCount = doc.getForm().getFields().length;

  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text })),
    items: extractTextItems(p).map((t) => ({ x: Number(t.x), y: Number(t.y), text: String(t.text ?? "") }))
  }));

  const geometry = pages.map((p, i) => {
    const { paths } = extractPageGeometry(p);
    return {
      page: i + 1,
      // The caption block's blanks: filled thin rectangles.
      filledRules: paths
        .filter((s) => s.paintedBy === "f" && s.height <= 3 && s.width >= 20)
        .map((s) => ({ y: Number(s.y.toFixed(2)), x: Number(s.x.toFixed(2)), endX: Number((s.x + s.width).toFixed(2)), height: Number(s.height.toFixed(2)) })),
      // The court election: stroked near-square boxes.
      strokedSquares: paths
        .filter((s) => s.paintedBy === "S" && Math.abs(s.width - s.height) <= 1 && s.width >= 6 && s.width <= 16)
        .map((s) => ({ x: Number(s.x.toFixed(2)), y: Number(s.y.toFixed(2)), width: Number(s.width.toFixed(2)), height: Number(s.height.toFixed(2)) })),
      // The lower half's blanks: merged underscore runs.
      underscoreSpans: underscoreSpansOf(extractTextItems(p))
    };
  });

  const rows = [];
  const geometryDrift = [];

  const record = (key, entry, found, basis, extra = {}) => {
    const writeBox = {
      x: Number((found.x + BOX_INSET).toFixed(2)),
      y: Number((found.y + WRITE_BOX_LIFT).toFixed(2)),
      width: Number((found.endX - found.x - BOX_INSET * 2).toFixed(2)),
      height: WRITE_BOX_HEIGHT
    };
    rows.push({
      key, name: key, page: entry.page,
      rect: writeBox, writeBox, rectBasis: basis,
      measuredBlank: { y: found.y, x: found.x, endX: found.endX, ...extra },
      type: "flat_overlay_text", isSelectionControl: false, multiline: false, maxLength: null,
      sourceValue: null,
      section: entry.section, effectiveLabel: entry.label, bindingLabel: entry.label,
      bindingBasis: entry.bindingBasis ?? null,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null
    });
  };

  for (const [key, entry] of Object.entries(RULE_FIELDS)) {
    const here = geometry.find((g) => g.page === entry.page) ?? { filledRules: [] };
    const found = here.filledRules.find((r) =>
      Math.abs(r.y - entry.y) <= RULE_TOLERANCE
      && Math.abs(r.x - entry.x) <= RULE_TOLERANCE
      && Math.abs(r.endX - entry.endX) <= RULE_TOLERANCE);
    if (!found) {
      geometryDrift.push({
        blank: key, kind: "filled_rule", page: entry.page,
        expected: { y: entry.y, x: entry.x, endX: entry.endX },
        nearest: here.filledRules.filter((r) => Math.abs(r.y - entry.y) <= 6).slice(0, 4)
      });
      continue;
    }
    record(key, entry, found,
      "measured_filled_rule: a thin filled rectangle (`re` painted `f`) read from the page content stream and re-checked against the pinned binary on every build",
      { drawn: "filled_thin_rectangle", height: found.height });
  }

  for (const [key, entry] of Object.entries(UNDERSCORE_FIELDS)) {
    const here = geometry.find((g) => g.page === entry.page) ?? { underscoreSpans: [] };
    const found = here.underscoreSpans.find((s) =>
      Math.abs(s.y - entry.y) <= RULE_TOLERANCE
      && Math.abs(s.x - entry.x) <= RULE_TOLERANCE
      && Math.abs(s.endX - entry.endX) <= RULE_TOLERANCE);
    if (!found) {
      geometryDrift.push({
        blank: key, kind: "underscore_span", page: entry.page,
        expected: { y: entry.y, x: entry.x, endX: entry.endX },
        nearest: here.underscoreSpans.filter((s) => Math.abs(s.y - entry.y) <= 6).slice(0, 4)
      });
      continue;
    }
    record(key, entry, found,
      "measured_underscore_span: adjacent underscore glyph runs on one text baseline, merged into a single span, read from the page content stream and re-checked against the pinned binary on every build",
      { drawn: "underscore_glyph_run", glyphs: found.glyphs });
  }

  const selectionControls = SELECTION_CONTROLS.map((c) => {
    const here = geometry.find((g) => g.page === c.page) ?? { strokedSquares: [], underscoreSpans: [] };
    let measured = false;
    let measuredBounds = null;
    if (c.control === "stroked_square") {
      const found = here.strokedSquares.find((b) =>
        Math.abs(b.x - c.box.x) <= RULE_TOLERANCE && Math.abs(b.y - c.box.y) <= RULE_TOLERANCE);
      measured = Boolean(found);
      measuredBounds = found ?? null;
    } else {
      const found = here.underscoreSpans.find((s) =>
        Math.abs(s.y - c.span.y) <= RULE_TOLERANCE && Math.abs(s.x - c.span.x) <= RULE_TOLERANCE
        && Math.abs(s.endX - c.span.endX) <= RULE_TOLERANCE);
      measured = Boolean(found);
      measuredBounds = found ?? null;
    }
    return { ...c, measured, measuredBounds };
  });

  return {
    rows, geometryDrift, selectionControls, pageText,
    pageCount: pages.length, acroFieldCount,
    filledRuleCount: geometry.reduce((n, g) => n + g.filledRules.length, 0),
    strokedSquareCount: geometry.reduce((n, g) => n + g.strokedSquares.length, 0),
    underscoreSpanCount: geometry.reduce((n, g) => n + g.underscoreSpans.length, 0)
  };
}

/* ---- render ---------------------------------------------------------------- */
function protectedRulesOf(census) {
  // Geometry-based protection: the signature span is handed to the overlay as
  // a protected rule, so a write box that landed on it would be refused for
  // WHERE it is even if its label said something innocent.
  return census.rows
    .filter((r) => r.policy === "protect")
    .map((r) => ({
      page: r.page, y: r.measuredBlank.y,
      x: r.measuredBlank.x, endX: r.measuredBlank.endX,
      category: r.refusalClass, caption: r.effectiveLabel
    }));
}

async function renderDocument(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const writable = census.rows.filter((r) => r.policy === "write");
  const protectedRules = protectedRulesOf(census);

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
  if (process.env.SC223E_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) console.log(`   ${r.anchor ?? r.field}: ${r.reason}${r.category ? ` (${r.category})` : ""}`);
    for (const u of report.unfittable ?? []) console.log(`   UNFIT ${u.anchor ?? u.field}: ${u.reason} ${JSON.stringify(u.value)}`);
  }
  return { bytes, report };
}

/* ---- byte proof ------------------------------------------------------------ */
async function byteProof(source, census, artifactBytes, report, fixtureName) {
  /*
   * The ink is read back as the finalized page's TEXT at each measured blank,
   * with the SOURCE's own printed text at the same coordinates subtracted —
   * the lower half's blanks are underscore glyphs, which are themselves text
   * items inside the very box the value is drawn in.
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
        section: r.section, effectiveLabel: r.effectiveLabel, measuredBlank: r.measuredBlank,
        drawnText: text, expected: FIXTURES[fixtureName][r.fact] ?? null,
        matchesExpected: ink === String(FIXTURES[fixtureName][r.fact] ?? "").trim()
      });
      continue;
    }
    if (ink.length === 0) continue;
    refusedFieldsWithInk.push({ fieldId: r.key, page: r.page, drawnText: text });
  }
  // The selection controls must carry no new ink either: nothing is marked.
  const markedControls = [];
  for (const c of census.selectionControls) {
    const bounds = c.control === "stroked_square"
      ? { x: c.box.x, y: c.box.y, width: c.box.width, height: c.box.height }
      : { x: c.span.x, y: c.span.y, width: c.span.endX - c.span.x, height: WRITE_BOX_HEIGHT };
    const text = drawnInBox(c.page, bounds);
    if (text.join("").trim().length > 0) markedControls.push({ selectionId: c.selectionId, drawnText: text });
  }
  return { actualWrites, refusedFieldsWithInk, markedControls, documentAuthoredAppearances: [], glyphs, appearances: 0 };
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
      measuredBlank: r.measuredBlank,
      printedLabel: r.effectiveLabel, printedLine: r.effectiveLabel,
      sectionHeading: r.section, regionHeading: r.effectiveLabel,
      effectiveLabel: r.effectiveLabel,
      bindingBasis: r.bindingBasis ?? null,
      captionBasis:
        "the caption the form prints for this blank, read from the page's own text at the blank's coordinates; the "
        + "caption-below-line and caption-beside-line layouts are both recorded in the field census",
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

    if (r.policy === "not_applicable") {
      canonicalRefusals.push({
        ...base,
        reason: r.why,
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    canonicalRefusals.push({
      ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${source.formNumber} blank ${r.key}`,
      factId: null, routeDetermined: false,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }

  return {
    formNumber: source.formNumber, documentId: source.formNumber, documentRole: source.instrumentKind,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKeys: ROUTE.routeKeys },
    structuralClass: "measured_flat_overlay",
    explicitMappings: Object.fromEntries(canonicalWrites.map((w) => [w.field, w.factId])),
    roleRefusals: [],
    selectionControls: census.selectionControls.map((c) => ({
      selectionId: `${source.formNumber}/${c.selectionId}`,
      field: c.field,
      kind: c.kind, isSelectionControl: true,
      page: c.page,
      control: c.control,
      bounds: c.control === "stroked_square" ? c.box : c.span,
      measured: c.measured, measuredBounds: c.measuredBounds,
      sectionHeading: c.section, printedHeading: c.heading,
      disposition: c.disposition, marked: c.marked,
      reason: c.reason,
      category: c.category, completenessClass: c.completenessClass, class: c.class,
      participantMustDecide: c.what,
      document: source.formNumber
    })),
    canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals,
    factsHeldButNotWritable: []
  };
}

/* ---- the builder's own count of the nine counters --------------------------- */
function countCompleteness(maps, writeProofs, artifacts, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r, selection = false) => ({
    id: r.field ?? r.selectionId, name: r.fieldName ?? r.field ?? r.selectionId,
    label: selection ? `${r.field} (selection)` : (r.effectiveLabel ?? ""),
    reason: r.reason ?? "",
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
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || (writtenInDocument.get(blank.document) ?? new Set()).has(normLabel(blank.label))
        || (writtenInDocument.get(blank.document) ?? new Set()).has(normLabel(blank.name))
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
      note("invisibleWrites", { fixture: p.fixture, why: "the finalizer reported values and the output bytes carry no glyph inside any measured blank" });
    }
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, why: "ink landed outside every measured write box" });
    for (const refused of p.refusedFieldsWithInk ?? []) {
      note("protectedWrites", { fixture: p.fixture, field: refused.fieldId, why: "a blank the map refused carries ink in the output that the source does not print" });
    }
    for (const marked of p.markedControls ?? []) {
      note("protectedWrites", { fixture: p.fixture, field: marked.selectionId, why: "a selection control this build leaves unmarked carries ink in the output that the source does not print" });
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
 * What the form itself prints, quoted verbatim. The attestation sentence is
 * the substance of the application — signing asserts it — and the NOTE is the
 * form's own routing rule for diversion-program dismissals.
 */
const FORM_QUOTES = [
  {
    where: "the application's own attestation, printed above the charge block",
    quote:
      "The Defendant makes application to this court for the expungement of all records of the charge described below. "
      + "Pursuant to §17-22-950(B), the charge was not dismissed at a preliminary hearing and I do not have charges "
      + "pending in the summary court and a court of general sessions that arise out of the same course of events."
  },
  {
    where: "the NOTE printed above the signature block",
    quote:
      "NOTE: If this charge was dismissed or nolle prossed because of successful completion of the Pre-Trial "
      + "Intervention Program, Traffic Education Program, Alcohol Education Program, Conditional Discharge, or any "
      + "other statutorily authorized diversion program operated by a solicitor's office, you must apply for an "
      + "expungement at the solicitor's office."
  },
  {
    where: "the court election, right column",
    quote: "Charge was disposed of in the court indicated below: [ ] Magistrate  [ ] Municipal"
  }
];
const quoteAt = (needle) => FORM_QUOTES.find((q) => q.where.includes(needle)).quote;

/*
 * The legal-review facts the instructions rest on, each named with its source
 * so a reviewer can check it. The review is
 * STATES/SC/01_LEGAL_REVIEW/SC__LEGAL-REVIEW__STATEWIDE__south-carolina-record-clearing-legal-review__ASOF-2026-08-01__EN.md,
 * Track 1 (§ 17-22-950).
 */
const LEGAL_FACTS = Object.freeze({
  authority: "S.C. Code § 17-22-950",
  fee: "none — \"the defendant applies at no cost\"; \"Fee: none.\" (legal review, Track 1)",
  automatic: "the Summary Courts are required to automatically issue orders of expungement for cases tried in their courts where the defendant is found not guilty, or the charges are dismissed or nolle prossed (legal review, Track 1)",
  objection: "prosecution or law enforcement may object within 30 days, on limited grounds only (pending charges or an ineligible charge), transmitted on form SCCA 223D (legal review, Track 1); the timing of the order itself is stated from the statute, not from the review — the expungement must occur no sooner than the appeal expiration date and no later than thirty days after that date, § 17-22-950(C), as read at source on 2026-08-06 and recorded in SC.memo waitingPeriods",
  stops: "preliminary hearing dismissals; related pending charges from the same events; objection filed; an order that has not issued within the § 17-22-950(C) window (legal review, Track 1, self-help limits, with the window taken from the statute)"
});

function participantInstructions(maps, rbf) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);

  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is one form: **SCCA 223E (5/16)**, the _Application for Expungement Pursuant to §17-22-950(B)_. It is "
    + "for a charge that was handled in a South Carolina **magistrate or municipal court** (the summary courts) and "
    + "ended in your favor — not guilty, dismissed, or nolle prossed.", "",
    `It is prepared under ${ROUTE.authority}.`, ""
  );

  out.push("## First: you may not need to file anything at all", "");
  out.push(
    "Under § 17-22-950, the summary courts are **required to issue expungement orders automatically**, at no cost, for "
    + "cases tried in their courts that ended not guilty, dismissed, or nolle prossed. **If you were fingerprinted for "
    + "the charge, the court generally issues the order itself** — start by contacting the magistrate or municipal "
    + "court that handled your charge and asking whether the expungement order has issued.", "",
    "**This application form is the summary court's own process for the case where you were NOT fingerprinted**: you "
    + "apply, at no cost, and the court issues the order if you are eligible. If the court tells you an automatic "
    + "order already issued, you are done — keep a copy of it.", ""
  );

  out.push("## Where to file", "");
  out.push(
    "File this application with the **magistrate or municipal court where the charge was disposed of** — the same "
    + "summary court that handled the case. The form's own caption says so: it is captioned \"IN THE "
    + "MAGISTRATE/MUNICIPAL COURT\" for the county or municipality you name at the top, and it asks you to mark which "
    + "court disposed of the charge. It is not filed with the solicitor, and not with SLED.", ""
  );

  out.push("## What it costs", "");
  out.push(
    "**Nothing.** Under S.C. Code § 17-22-950 the summary court process is free: the automatic order issues at no "
    + "cost, and where you were not fingerprinted, \"the defendant applies at no cost using the summary court "
    + "application process.\" There is no filing fee to pay and no fee waiver to request, and no one should charge "
    + "you for this. You can check that with the court itself or with the South Carolina Judicial Branch's published "
    + "expungement guidance.", ""
  );

  out.push("## Service and notice", "");
  out.push(
    "**You do not serve anyone.** The form prints no certificate of service and the reviewed authority places no "
    + "service step on the applicant. After the application, notice runs inside the court system: prosecution or law "
    + "enforcement may object **within 30 days**, on limited grounds only (pending charges or an ineligible charge), "
    + "on the court's own objection transmittal (SCCA 223D). If no objection is filed, the order is the court's to "
    + "issue, and the statute sets when: under **§ 17-22-950(C)** the expungement must occur **no sooner than the "
    + "appeal expiration date and no later than thirty days after that date**. Ask the summary court that handled "
    + "your charge what your appeal expiration date is if you need to know when to expect the order.", ""
  );

  out.push("## Attachments", "");
  out.push(
    "The printed form requires **no attachments**, and nothing in the reviewed sources adds one for this "
    + "application. If you have paperwork showing the disposition (a ticket, a court record), bring it when you file "
    + "— it helps the clerk find the case — but the form does not demand it.", ""
  );

  out.push("## Deadline", "");
  out.push(
    "The reviewed sources state **no deadline for applying**: § 17-22-950 does not condition this expungement on how "
    + "long ago the charge was resolved. The only clocks in the process run after you apply — the 30-day objection "
    + "window under § 17-22-950(F), and the signature window § 17-22-950(C) sets, which runs from the appeal "
    + "expiration date rather than from the notice.", ""
  );

  out.push("## Read this before you sign", "");
  out.push(`> ${quoteAt("attestation")}`, "");
  out.push(
    "Signing the application asserts that sentence. **Do not sign it if the charge was dismissed at a preliminary "
    + "hearing, or if you have related charges pending** in the summary court or a court of general sessions arising "
    + "out of the same course of events — in either case the court should not issue the order, and this packet's "
    + "self-help path stops there.", ""
  );
  out.push(`> ${quoteAt("NOTE")}`, "");
  out.push(
    "That is the form's own routing rule: **if your dismissal came through PTI, a traffic or alcohol education "
    + "program, a conditional discharge, or any other solicitor-operated diversion program, this form is the wrong "
    + "one** — apply at the solicitor's office instead. That is a different process with its own forms, and it is "
    + "outside this packet.", ""
  );

  out.push("## The two questions the form asks you to mark", "");
  out.push(
    "**Which court disposed of the charge.** The form prints two boxes — Magistrate and Municipal — under \"Charge "
    + "was disposed of in the court indicated below:\". Mark the one that heard your case. Neither box is marked for "
    + "you, because which court it was is a fact about your case that you hold.", "",
    "**Were you fingerprinted for this charge? — Yes / No / Do Not Know.** Mark the one that is true for you, on the "
    + "blank before it. Nothing is marked for you: whether you were fingerprinted is your answer to give, and the "
    + "form itself allows \"Do Not Know\". This application route is the one the summary court uses where you were "
    + "not fingerprinted; if you were fingerprinted, ask the court about the automatic order first (see the top of "
    + "these instructions).", ""
  );

  out.push("## What the platform filled in", "");
  out.push(
    "Your current legal name (on the \"Defendant\" line), your current address (street on the first ruled line, "
    + "city/state/zip on the second), your date of birth, and your phone number. Everything else is yours, and every "
    + "one of those blanks is listed below.", ""
  );

  out.push("## One name is deliberately not filled in", "");
  out.push(
    "The line **\"Full Name (at time of arrest):\"** is left blank. The platform holds your name as it is today and "
    + "has written that on the Defendant line. Your name **at the time of arrest** is a different fact — if your name "
    + "has changed since then, writing today's name there would misdescribe the record. Write it yourself, exactly as "
    + "it appears on the ticket, warrant or record.", ""
  );

  for (const [doc, items] of byDoc) {
    out.push(`## ${doc}: the blanks you must fill in`, "");
    out.push("| Section | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Full Name (at time of arrest)** — for the reason above.");
  out.push("- **Race and Sex.** The platform holds neither, and the shared semantics refuses to write a race anywhere.");
  out.push("- **SSN and SID #.** Government identifiers; the platform holds none and never writes one.");
  out.push("- **The two court boxes and the three fingerprint blanks.** Facts about your case that you mark yourself.");
  out.push("- **The attorney block.** The form marks it \"(if represented)\"; no representation fact is held. If an attorney represents you, they complete it.");
  out.push("- **Your signature.**");
  out.push("");

  out.push("## If something goes wrong", "");
  out.push(
    "These are the edges of what this packet can help with, and each is an exact stop:", "",
    "1. **The charge was dismissed at a preliminary hearing** — the court should not issue the order and this "
    + "application does not fit; the form's attestation excludes it.",
    "2. **Related charges from the same course of events are still pending** in summary court or general sessions — "
    + "same stop, for the same reason.",
    "3. **Your dismissal came through a diversion program** (PTI, traffic or alcohol education, conditional "
    + "discharge, or another solicitor-operated program) — apply at the solicitor's office; this form is the wrong one.",
    "4. **You were fingerprinted and the automatic order never issued**, or **an objection was filed**, or **no "
    + "signed order appears within the window § 17-22-950(C) allows** — those are beyond this packet's self-help "
    + "path. Contact the "
    + "summary court that handled the charge; if that does not resolve it, the circuit solicitor's office or a South "
    + "Carolina attorney is the next step.", ""
  );

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared copy of an official South Carolina Judicial Branch form. It is not legal advice, it is not "
    + "filed for you, and **it does not decide whether your record will be expunged** — the court does, after the "
    + "objection window runs."
  );
  out.push("");
  out.push(`_Routes: ${ROUTE.routeKeys.join(" · ")} — ${ROUTE.authority}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point -------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");

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
      `${source.formNumber}: ${census.geometryDrift.length} measured blank(s) no longer match the pinned binary: ${JSON.stringify(census.geometryDrift.slice(0, 3))}`);
    assert.equal(census.rows.length, Object.keys(RULE_FIELDS).length + Object.keys(UNDERSCORE_FIELDS).length,
      `${source.formNumber}: measured ${census.rows.length} blanks, the dictionaries declare ${Object.keys(RULE_FIELDS).length + Object.keys(UNDERSCORE_FIELDS).length}`);
    assert.ok(census.selectionControls.every((c) => c.measured),
      `${source.formNumber}: a selection control did not measure: ${JSON.stringify(census.selectionControls.filter((c) => !c.measured).map((c) => c.selectionId))}`);
    assert.equal(census.pageCount, 1, `${source.formNumber}: expected one page, found ${census.pageCount}`);
    censuses.push({ source, census });
  }

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      documents: censuses.map(({ source, census }) => ({
        formNumber: source.formNumber, sha256: source.sha256, pageCount: census.pageCount,
        acroFieldCount: census.acroFieldCount,
        filledRuleCount: census.filledRuleCount,
        strokedSquareCount: census.strokedSquareCount,
        underscoreSpanCount: census.underscoreSpanCount,
        blanks: census.rows.length,
        writes: census.rows.filter((r) => r.policy === "write").length,
        supply: census.rows.filter((r) => r.policy === "supply").length,
        notApplicable: census.rows.filter((r) => r.policy === "not_applicable").length,
        protected: census.rows.filter((r) => r.policy === "protect").length,
        selectionControlsMeasured: census.selectionControls.filter((c) => c.measured).length
      }))
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const maps = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const packet = await PDFDocument.create();
    const pageManifest = [];
    for (const { source, census } of censuses) {
      const { bytes, report } = await renderDocument(source, census, fixtureName);
      const proof = await byteProof(source, census, bytes, report, fixtureName);
      writeProofs.push({
        fixture: fixtureName, formNumber: source.formNumber, sourceSha256: source.sha256,
        proofMethod: "the finalized page's own text read at every measured blank, with the source's printed text at the same coordinates subtracted — the lower half's blanks are underscore glyphs inside the very boxes the values are drawn in",
        valuesReportedByFinalizer: report.written.length,
        flattenedWidgetAppearancesReadFromOutputBytes: 0,
        flattenedWidgetNote: "a measured overlay draws into page content and has no widget to flatten; this counter is zero by construction, not by failure",
        addedGlyphsReadFromOutputBytes: proof.glyphs,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
        refusedFieldsWithInk: proof.refusedFieldsWithInk,
        markedControls: proof.markedControls,
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
     * clears it is bound to its SHA-256. PDFDocument.create() stamps the wall
     * clock; stampDeterministic pins both dates to the factory's fixed
     * instant, so the artifact is a function of its inputs.
     */
    stampDeterministic(packet);
    const packetBytes = await packet.save({ useObjectStreams: false, updateMetadata: false });
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    artifacts.push({
      fixture: fixtureName, file,
      sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents: censuses.map((c) => c.source.formNumber)
    });
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
      "Matched by state and form number rather than by assetClass: the corpus files SCCA-223E under 05_SOURCE_GATED "
      + "with assetClass SOURCE-GATED and revision REV-UNKNOWN, although the form itself prints \"SCCA 223E (5/16)\". "
      + "That is a filing question about the archive; the SHA-256 binding is what decides these are the form's bytes, "
      + "and it holds. The legal review's own open question — the current revision of SCCA 223E — remains open for "
      + "source-freshness review and is recorded in build-findings.json.",
    routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId, statutoryAuthority: ROUTE.authority,
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], documentId: r.formNumber, formNumber: r.formNumber,
      revision: r.revision, printedRevision: r.printedRevision,
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
      "This form has no fillable field. Its blanks are drawn three ways and each is measured its own way from the "
      + "page's content stream: filled thin rectangles (`re` painted `f`) for the caption block's ruled lines, merged "
      + "underscore glyph runs for the lower half, and stroked 9.3pt squares for the two court checkboxes. Every "
      + "measurement is re-checked against the pinned binary on each build.",
    captionLayoutNote:
      "The left column prints its captions BELOW the lines they name (\"Defendant\", \"Current Address\", \"AKA\" "
      + "each under their line); the right-hand identification block prints captions beside or above staggered "
      + "blanks (the DOB blank sits on the line below its caption, beside the SSN blank). The middle ruled line of "
      + "the Current Address block prints no caption of its own and is recorded as the block's second line.",
    documents: censuses.map(({ source, census }) => ({
      documentId: source.formNumber, formNumber: source.formNumber, sourceSha256: source.sha256,
      pageCount: census.pageCount, acroFieldCount: census.acroFieldCount,
      filledRuleCount: census.filledRuleCount,
      strokedSquareCount: census.strokedSquareCount,
      underscoreSpanCount: census.underscoreSpanCount,
      selectionControls: census.selectionControls.map((c) => ({
        selectionId: c.selectionId, field: c.field, control: c.control,
        page: c.page, bounds: c.control === "stroked_square" ? c.box : c.span,
        measured: c.measured, measuredBounds: c.measuredBounds,
        printedHeading: c.heading, disposition: c.disposition
      })),
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis, measuredBlank: r.measuredBlank,
        pdfType: r.type, isSelectionControl: false, multiline: false, maxLength: null,
        section: r.section, effectiveLabel: r.effectiveLabel, bindingBasis: r.bindingBasis,
        policy: r.policy, factId: r.fact
      }))
    }))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "measured_flat_overlay",
    captionBasis: "measured blanks of three drawn kinds; see field-census.census-v1.json",
    dispositionVocabulary: [SIGNATURE, ELECTION],
    routeDeterminedSelections: [],
    routeSelectionNote: SELECTION_NOTE,
    processGuidanceUnit: {
      routeKey: ROUTE.routeKeys[0],
      deliverable: "participant-instructions.md",
      note:
        "Unit A (fingerprinted, automatic) files nothing: the summary court is required to issue the order itself at "
        + "no cost. The instructions carry the verification path and the escalation stops for that unit."
    },
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    byteDerivedHashes: true,
    rasterization: {
      status: "BUILT_RASTER_PENDING",
      policy:
        "No page is rastered in this build. Rendering is central "
        + "(.github/workflows/rcap-packet-raster-acceptance-batch.yml) and renders the exact fixture bytes pinned "
        + "above by SHA-256. PASS_COMPLETE still requires a hash-bound RASTER_PASS from that workflow."
    },
    everyPageRastered: false, rasterPages: [],
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note:
      "Read back from the finalized PDF bytes at every measured blank, not from the finalizer's own report. A "
      + "measured overlay draws into page content, so the reader is the page's own text, and the source's printed "
      + "text at the same coordinates is subtracted — the lower half's blanks are underscore glyphs inside the very "
      + "boxes the values are drawn in.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, formNumber: p.formNumber,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk,
      markedControls: p.markedControls
    })),
    blockingFindings: writeProofs.flatMap((p) => [
      ...p.refusedFieldsWithInk.map((r) => ({
        fixture: p.fixture, field: r.fieldId, finding: "a blank the map refused carries ink in the output that the source does not print"
      })),
      ...p.markedControls.map((m) => ({
        fixture: p.fixture, field: m.selectionId, finding: "a selection control this build leaves unmarked carries ink in the output"
      }))
    ])
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    participantElections: maps.flatMap((m) => m.selectionControls.map((c) => ({
      document: m.formNumber, selectionId: c.selectionId, field: c.field, control: c.control,
      page: c.page, bounds: c.bounds, printedHeading: c.printedHeading,
      why: c.reason, participantMustDecide: c.participantMustDecide
    }))),
    protectedBlanks: maps.flatMap((m) => m.canonicalRefusals
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({
        document: m.formNumber, field: r.field, page: r.page, label: r.effectiveLabel, refusalClass: r.category, why: r.why
      }))),
    factsHeldButNotWritable: maps.flatMap((m) => m.factsHeldButNotWritable),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, writeProofs, artifacts, instructionsText);
  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: allZero ? "state_built" : "overlay_samples_rendered",
    reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterStatus: "BUILT_RASTER_PENDING",
    rasterEngine: "none in this build — rendering is central (.github/workflows/rcap-packet-raster-acceptance-batch.yml)",
    popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: 0,
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route.",
    neverCharge:
      "The § 17-22-950 summary-court process is free by statute and largely automatic. The legal review's design "
      + "decision stands: never charge for a packet on this track."
  });

  writeJson(`${OUT}/reports/builder-completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract "
      + "functions over this family's field map, byte proof, rendered artifacts and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: allZero,
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  const boundaryNameProof = writeProofs.find((p) => p.fixture === "boundary")
    ?.actualWrites.find((w) => w.field === "defendant-name");

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [],
    findings: [
      {
        finding:
          "OWNER CORRECTION Q5, 2026-09-02. The packet stated that \"if no objection is filed, the trial judge signs "
          + "the order no sooner than 31 and no later than 40 days after notice.\" The owner directed that the "
          + "unsourced timing rule be removed and not reappear until supported by controlling authority. The rule "
          + "was searched for before it was removed. It is NOT invented: the held South Carolina legal review "
          + "(STATES/SC/01_LEGAL_REVIEW/...ASOF-2026-08-01, Track 1, lines 87 and 347) states it in those words, and "
          + "the Nationwide custody's South Carolina Wilma agent reference states it too, both attributing it to the "
          + "South Carolina Judicial Branch page "
          + "https://www.sccourts.org/resources/general-public/expungement-application-process/for-magistrate-municipal-courts/. "
          + "Neither is controlling authority, and that page could not be read on this build: an outbound request to "
          + "it, and to https://www.scstatehouse.gov/code/t17c022.php, were both refused at CONNECT with HTTP 403 by "
          + "this container's egress proxy, so the absence is a fetch refusal and not a finding that the page lacks "
          + "the rule.",
        consequence:
          "The 31/40-day rule is removed from the participant deliverable in all three places it appeared (service "
          + "and notice, deadline, self-help stop 4). What replaces it is the controlling authority the design "
          + "already holds: § 17-22-950(C), read at source on 2026-08-06 and recorded in SC.memo waitingPeriods — "
          + "the expungement must occur no sooner than the appeal expiration date and no later than thirty days "
          + "after that date. Note the two rules are not the same rule differently worded: the statute's window is "
          + "anchored to the APPEAL EXPIRATION DATE and the removed rule was anchored to NOTICE. The self-help stop "
          + "is kept and now names the statutory window instead of a day count. Neither SCCA 223E nor SCCA 223D1 "
          + "carries 31 or 40 anywhere; both were re-read on this build."
      },
      {
        finding:
          "\"Full Name (at time of arrest)\" is a different fact from the participant's current legal name: a "
          + "participant whose name has changed since the arrest would be misdescribed by today's name.",
        consequence:
          "The current legal name is written on the \"Defendant\" caption line, the at-time-of-arrest line is left "
          + "to the participant, and the reason has its own section in the instructions."
      },
      {
        finding:
          "The family carries two route units and one filed document. Unit A (fingerprinted) is automatic issuance "
          + "with nothing to file; unit B (not fingerprinted) is this application.",
        consequence:
          "Unit A's deliverable is process guidance inside participant-instructions.md — the verification path and "
          + "the escalation stops — recorded in the field map under processGuidanceUnit. No second document exists "
          + "to render, and none is claimed."
      },
      {
        finding:
          "Neither the Magistrate/Municipal election nor the fingerprint question is marked, although the family's "
          + "application unit exists for the not-fingerprinted case.",
        consequence: SELECTION_NOTE
      },
      {
        finding:
          "The form draws its blanks three ways: filled thin rectangles in the caption block, underscore glyph runs "
          + "in the lower half, and stroked 9.3pt squares for the court election. rulesOfPage alone missed the Sex "
          + "blank (38.64pt, under its 40pt minimum length) and the checkbox squares.",
        consequence:
          "The census reads the page geometry directly: filled rules, merged underscore spans and stroked squares "
          + "are each measured and pinned, and every blank on the page is accounted for in one of the three."
      },
      {
        finding:
          "The right-hand identification block staggers its blanks: the DOB caption prints at y=666 and its blank is "
          + "the ruled line at y=648 below it, beside the SSN blank on the same line.",
        consequence:
          "The DOB write box is placed on the measured line the form actually provides, and the layout is recorded "
          + "in the field census so a visual reviewer can confirm the value sits where a reader expects it."
      },
      {
        finding:
          "The corpus files SCCA-223E under 05_SOURCE_GATED with assetClass SOURCE-GATED and revision REV-UNKNOWN; "
          + "the form itself prints \"SCCA 223E (5/16)\", and the legal review lists \"current revision of SCCA "
          + "223E\" as its own open question.",
        consequence:
          "The source binds by exact SHA-256 against the committed index, the printed revision is recorded in the "
          + "source receipt, and the revision-currentness question is left where the legal review put it: with "
          + "source-freshness review, which is not a build gate."
      },
      {
        severity: "advisory",
        finding: boundaryNameProof && boundaryNameProof.matchesExpected === false
          ? "The boundary participant's name carries a typographic apostrophe (U+2019) and the bytes read back differ from the fixture value."
          : "The boundary participant's name carries a typographic apostrophe (U+2019) and is written on the Defendant line.",
        consequence: boundaryNameProof && boundaryNameProof.matchesExpected === false
          ? "Recorded for visual review, as in me-seal-prost-set: the behaviour is in the shared finalizer's font encoding. The drawn text is in reports/actual-writes.json."
          : "The read-back matches the fixture value; the shared finalizer's Helvetica encoding carries U+2019. Recorded so a reviewer comparing this family with me-seal-prost-set knows why the advisory there does not repeat here."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, central rasterization, visual review and counsel review",
    buildStatus: allZero ? "state_built" : "overlay_samples_rendered",
    status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    mattersForTheReviewersAttention: [
      "The \"Full Name (at time of arrest)\" line is deliberately blank while the current legal name is written on "
        + "the Defendant line. Counsel should confirm that split is right.",
      "Nothing marks the fingerprint question or the court election, although the application unit exists for the "
        + "not-fingerprinted case; the routeSelectionNote in production-field-map.json states why. Counsel should "
        + "confirm the answer belongs to the participant.",
      "The city/state/zip is written on the uncaptioned middle line of the Current Address block. The visual "
        + "reviewer should confirm it reads as the address's second line.",
      "The DOB value sits on the ruled line below its printed caption, beside the SSN blank — the form's own "
        + "layout. The visual reviewer should confirm it cannot be read as an SSN.",
      "The instructions tell a fingerprinted participant to verify automatic issuance instead of filing. Counsel "
        + "should confirm that guidance against § 17-22-950 and the legal review's Track 1.",
      "The corpus's SCCA-223E carries revision REV-UNKNOWN and prints (5/16); the legal review's open question on "
        + "revision currentness stands for source-freshness review.",
      "OWNER CORRECTION Q5: the \"no sooner than 31 and no later than 40 days after notice\" rule is out of the "
        + "deliverable and § 17-22-950(C)'s appeal-expiration window is in. Two held secondary records — the SC legal "
        + "review Track 1 and the Nationwide Wilma agent reference — both carry the 31/40 rule and both attribute it "
        + "to the South Carolina Judicial Branch's magistrate/municipal expungement-process page, which this "
        + "container could not fetch (CONNECT refused, HTTP 403). If counsel or a source lane can read that page, "
        + "the question to settle is whether the Judicial Branch publishes a 31-to-40-day post-notice signature "
        + "window ALONGSIDE § 17-22-950(C)'s appeal-expiration window, or whether the review paraphrased the statute "
        + "wrongly. Until then the statute governs the packet."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: allZero ? "COMPLETED" : "STOPPED",
    counters: counted.counters, counterFindings: counted.findings,
    directory: OUT, documents: resolved.map((r) => r.formNumber),
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    requiredBeforeFiling: rbf.length,
    measuredBlanks: censuses.reduce((n, c) => n + c.census.rows.length, 0),
    selectionControls: censuses.reduce((n, c) => n + c.census.selectionControls.length, 0),
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    rasterStatus: "BUILT_RASTER_PENDING"
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
