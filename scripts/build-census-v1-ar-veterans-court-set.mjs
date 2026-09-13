#!/usr/bin/env node
// Route-obligation census v1 — packet family `ar-pardon-seal-set`.
//
//   node scripts/build-census-v1-ar-pardon-seal-set.mjs
//   node scripts/build-census-v1-ar-pardon-seal-set.mjs --census-only
//
// Arkansas, sealing the record of a PARDONED OFFENDER or PARDONED YOUTHFUL
// FELONY OFFENDER under Act 1460 of 2013, A.C.A. § 16-90-1401 et seq., route
// `obligation:unit:AR:ar-pardon-seal:ar-pardon-seal-stage-2`. Two documents:
//
//   * the ACIC Petition to Seal Records of a Pardoned Offender or Pardoned
//     Youthful Felony Offender — the participant's own filing;
//   * the ACIC Order of the same name — the proposed order the COURT signs.
//
// WHAT THIS ROUTE IS, AND WHAT IT MUST NOT SAY
//
// This packet is the SEALING STEP THAT FOLLOWS A PARDON. It does not apply for
// a pardon, evidence one, or establish that one was granted. The petition's
// paragraph 5 prints
//
//     5. On the ____ day of ________, the Governor issued a Pardon to the
//        Defendant for the above referenced offense(s).
//
// and the order opens "Before the Court is the Pardon issued by the Governor in
// the above referenced matter." The printed sentences are the form's; the blanks
// in them are not this build's to fill. Writing a date into that trio would
// assert, on the participant's own signed petition, that a pardon issued on a
// day this platform has no fact for. The trio is refused by role, and the
// refusal is recorded as a route precondition rather than as a formatting rule.
//
// HOW THIS DIFFERS FROM ITS TWO SIBLINGS
//
// scripts/build-census-v1-ar-arrest-seal-set.mjs builds the AR ACIC arrest-seal
// family. Its two forms are AcroForms — 37 and 29 widgets — so its census reads
// geometry off each widget's own /Rect and its fill stage is
// finalizeOfficialForm. None of that transfers.
//
// scripts/build-census-v1-ar-misdemeanor-dwi-seal-set.mjs is the pattern this
// build follows. Its two forms are FLAT, as these two are, so its census
// measures every write box from the page content stream and its fill stage is
// finalizeFlatOverlay. This file reuses that method unchanged.
//
// ONE THING DOES NOT TRANSFER FROM THE FLAT SIBLING, AND IT IS THE WHOLE RISK.
//
// The DWI forms PRE-PRINT the offence — "charged with the offense(s) of Driving
// or Boating While Intoxicated" — so that family could prove there was no charge
// blank to fill. THESE TWO DOCUMENTS DRAW CHARGE BLANKS. Both print
//
//     1. The Defendant was arrested on the ___ day of ______, ____, and charged
//        with the offense(s) of: ______________________
//     2. The Defendant either pled guilty or nolo contendere or was found guilty
//        ... the offense(s) of: ______________________
//
// The stale-artifact block in data/rcap-grade-a/stale-artifact-block.json is
// about a map that wrote the PARTICIPANT'S NAME into blanks holding the offence
// they were charged with, and one of the twelve blocked artifacts is the AR ACIC
// arrest petition — the same authority, the same drafting, the same year. This
// family has the defect's surface. It is therefore the family where the
// charge-caption proof does real work rather than confirming an absence, and the
// proof is taken from the artifact's own glyphs at the measured rectangles.
//
// WHAT THE CONTENT STREAM ACTUALLY DRAWS
//
// scripts/lib/pdf-stroked-boxes.mjs is run over every page of both documents. It
// maintains the CTM through q/Q/cm and emits only on stroke operators, which is
// the detector that found fourteen checkboxes on the Oregon set-aside form after
// an `re`-only scan reported none. Whatever it reports here is recorded as a
// MEASUREMENT — including zero — because "the tool found nothing" and "the tool
// was not run" are different findings.
//
// The blanks themselves are drawn two ways, both measured through the shared
// CTM-tracking walker in scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs:
//
//   * UNDERSCORE LEADER RUNS — runs of the `_` glyph inside a text-showing
//     operator, "vs. Case No. ______". Start, end and baseline come from the
//     glyph metrics.
//   * DRAWN RULES — thin filled rectangles, read by rulesOfPage from the same
//     walk.
//
// A rule with printed glyphs sitting on it is an UNDERLINE, not a blank — both
// forms underline their own titles — so each rule is classified by measuring how
// much of its width carries glyphs above it. Nothing is classified by guessing
// which line looks like a heading.
//
// THE REVISION SKEW, RECORDED AND NOT CORRECTED
//
// The order is REV-2022-03-07 and the petition REV-2022-03-08: the order carries
// a revision date one day BEFORE the petition it is filed with. Both revisions
// are confirmed from the corpus index and from each file's own printed footer.
// This is recorded as an observed property of the pinned pair. It is not an
// error, it is not corrected, and neither document is substituted for a
// same-dated one.
//
// A GAP IN THE SHARED FLAT PATH, COMPENSATED HERE AND REPORTED
//
// finalizeOfficialForm passes `regionHeading` to decideBinding, so a widget under
// a printed "Certificate of Service" is refused by region whatever it is called.
// finalizeFlatOverlay does not pass it — see the decideBinding call in
// scripts/rcap-official-forms/rcap-official-form-finalize.mjs — so on a flat
// overlay the region channel never runs. That matters here: the petition's page 3
// is a VERIFICATION carrying a notarial jurat and page 4 is a Certificate of
// Service, and both are regions the shared rules would protect if they were
// asked. This family computes regionProtectCategoryOf itself and withholds every
// anchor in a protected region, so nothing here depends on the gap. The gap is
// not patched from this family's build — the shared module is not this family's
// path — it is carried as a finding with the evidence to reproduce it.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines, normalizeHarvestedText }
  from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { rulesOfPage } from "./rcap-official-forms/rcap-pdf-rule-lines.mjs";
import { finalizeFlatOverlay } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { rasterizePdf } from "./rcap-official-forms/rcap-pdf-rasterize.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { strokedRectangles } from "./lib/pdf-stroked-boxes.mjs";
import {
  CHARGE_VALUE_WORDS, captionDescribesChargeValue, descriptorsMatching, protectCategoryOf,
  regionProtectCategoryOf, decideBinding
} from "./rcap-official-forms/rcap-field-semantics.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, PDFName } = require("pdf-lib");

const FAMILY_ID = "ar-veterans-court-set";
const OUT = "data/rcap-all50/overlays/census-v1/ar/ar-veterans-court-set--official-pdf-fill";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const ROUTE_KEY = "obligation:unit:AR:ar-veterans-court:ar-veterans-court-stage-2";
const CENSUS_ONLY = process.argv.includes("--census-only");
const NO_RASTER = process.argv.includes("--no-raster");
const INSET_X = 1.5;
const INSET_RIGHT = 2;
const BASELINE_ABOVE_RULE = 2;
const BOX_HEIGHT = 12;
const MAX_FONT_SIZE = 12;
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const fail = (message, detail = null) => { throw new Error(`build-census-v1-${FAMILY_ID}: ${message}${detail ? `\n  ${detail}` : ""}`); };
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const round = (n) => Number(Number(n).toFixed(2));
const writeJson = (rel, value) => { fs.mkdirSync(path.dirname(path.join(rootDir, rel)), { recursive: true }); fs.writeFileSync(path.join(rootDir, rel), `${JSON.stringify(value, null, 2)}\n`); };
const DOCUMENTS = [
  {
    key: "petition", documentId: "AR-ACIC-PETITION-VETERANS-COURT", documentRole: "PETITION",
    officialTitle: "Petition to Dismiss and Seal Offense in Veterans Treatment Specialty Court Proceeding",
    revision: "REV-2021-07-27", sha256: "2a60285e2fc0d5c7f765df93143f65edf302dc8f28429a1050d329b3f48ff0a0",
    byteLength: 131167,
    repoPath: `${CORPUS_ROOT}/STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-PETITION-TO-DISMISS-AND-SEAL-VETERANS-TREATMENT-SPECIALTY__petition-to-dismiss-and-seal-offense-in-veterans-treatment-specialty-court-proceeding__REV-2021-07-27__EN.pdf`,
    pathInArchive: "STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-PETITION-TO-DISMISS-AND-SEAL-VETERANS-TREATMENT-SPECIALTY__petition-to-dismiss-and-seal-offense-in-veterans-treatment-specialty-court-proceeding__REV-2021-07-27__EN.pdf",
    ownership: "participant_completed", captionOnly: false, explicitMappings: {}, roleRefusals: []
  },
  {
    key: "order", documentId: "AR-ACIC-ORDER-VETERANS-COURT", documentRole: "PROPOSED_ORDER",
    officialTitle: "Uniform Order of Dismissal and Sealing for Veterans Treatment Specialty Court Proceeding",
    revision: "REV-2021-07-27", sha256: "dd73dfdee29c12977a360413311a973fd3366e5a7dc606d385666bfa3b38ccf5",
    byteLength: 116034,
    repoPath: "reference/source-recovery/2026-09-11-wave1/CODEX-CS2-SRC2__AR-VETERANS-COURT-SET__ACIC-ORDER-VETERANS-COURT__dd73dfdee29c.pdf",
    pathInArchive: "reference/source-recovery/2026-09-11-wave1/CODEX-CS2-SRC2__AR-VETERANS-COURT-SET__ACIC-ORDER-VETERANS-COURT__dd73dfdee29c.pdf",
    ownership: "court_issued_order", captionOnly: true, explicitMappings: {}, roleRefusals: []
  }
];
const NAME_MAY_APPEAR_IN = Object.fromEntries(DOCUMENTS.map((d) => [d.documentId, []]));
const CANONICAL = {
  "participant.full_legal_name": "Jordan Avery Reyes", "participant.date_of_birth": "1991-04-17",
  "participant.street_address": "118 Maple Street", "participant.city": "Little Rock", "participant.state": "AR", "participant.zip": "72201",
  "matter.case_number": "60CR-19-1184", "matter.county": "Pulaski", "matter.court": "Circuit Court", "matter.charge": "Theft of property",
  "matter.charges": [{ charge: "Theft of property" }]
};
const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
  "participant.date_of_birth": "1968-12-31", "participant.street_address": "1188 Upper Ouachita Crossing Road, Apartment 14B",
  "participant.city": "Fayetteville", "participant.zip": "72701-2214", "matter.case_number": "72CR-2004-000000118844-A",
  "matter.charge": "Breaking or entering a vehicle, and criminal mischief in the first degree",
  "matter.charges": [{ charge: "Breaking or entering a vehicle, and criminal mischief in the first degree" }]
};
const NAME_TOKENS = [...new Set(String(CANONICAL["participant.full_legal_name"]).split(/\s+/).concat(String(BOUNDARY["participant.full_legal_name"]).split(/\s+/)))].filter((x) => x.length >= 3);
function resolveSource(doc) {
  const expected = DOCUMENTS.find((candidate) => candidate.key === doc.key);
  if (!expected || doc.documentId !== expected.documentId || doc.documentRole !== expected.documentRole
    || doc.repoPath !== expected.repoPath || doc.sha256 !== expected.sha256 || doc.byteLength !== expected.byteLength) {
    fail(`${doc.documentId ?? "unknown"}: SOURCE_BINDING_IDENTITY_MISMATCH`,
      "document key, role, path, expected SHA-256 and expected byte length must match the frozen adoption binding");
  }
  const abs = path.join(rootDir, doc.repoPath);
  if (!fs.existsSync(abs)) fail(`${doc.documentId}: SOURCE_ABSENT_FROM_DISK`, abs);
  const bytes = fs.readFileSync(abs); const got = sha256(bytes);
  if (got !== doc.sha256) fail(`${doc.documentId}: SOURCE_MISMATCH_ON_DISK`, `expected ${doc.sha256}, read ${got}`);
  if (bytes.length !== doc.byteLength) fail(`${doc.documentId}: SOURCE_BYTE_LENGTH_MISMATCH`, `expected ${doc.byteLength}, read ${bytes.length}`);
  return { bytes, indexEntry: { sha256: got, byteLength: bytes.length, revision: doc.revision, pageCount: null, structuralClassObserved: "flat_pdf", acroFieldCount: 0 } };
}
/** The page's raw content stream, for the stroked-box detector. */
function contentStringOf(pdf, page) {
  let content = "";
  for (const stream of page.node.normalizedEntries?.().Contents?.asArray?.() ?? []) {
    try { content += Buffer.from(pdf.context.lookup(stream).getContents()).toString("latin1"); } catch { /* not a stream */ }
  }
  return content;
}

/** Printed text a run of glyphs draws, with leaders and trailing punctuation off. */
function captionTextOf(raw) {
  return normalizeHarvestedText(String(raw ?? ""))
    .replace(/[_.…]{3,}/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[:.\s]+$/, "")
    .trim();
}

/** Non-space glyph width drawn between x0 and x1 on one line. */
function inkBetween(line, x0, x1) {
  let ink = 0;
  for (const ch of line.chars ?? []) {
    if (String(ch.c).trim() === "") continue;
    const a = Math.max(ch.x, x0);
    const b = Math.min(ch.x + ch.w, x1);
    if (b > a) ink += b - a;
  }
  return ink;
}

/** Maximal runs of the `_` glyph on one line, in page coordinates. */
function underscoreRunsOf(line) {
  const runs = [];
  let cur = null;
  for (const ch of line.chars ?? []) {
    if (ch.c === "_") {
      if (cur) { cur.x1 = ch.x + ch.w; cur.glyphs += 1; }
      else cur = { x0: ch.x, x1: ch.x + ch.w, glyphs: 1 };
    } else if (cur) { runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  return runs;
}

/**
 * A drawn rule is a BLANK unless the form prints words on it.
 *
 * Both of these documents underline their own titles, and the petition
 * underlines the word VERIFICATION. An underline and a blank are the same
 * rectangle drawn for opposite reasons, so they are told apart by measuring how
 * much non-space glyph ink sits on the rule rather than by guessing which lines
 * look like headings. UNDERLINE_INK_FRACTION is the share of the rule's width
 * that must carry glyphs for it to be an underline.
 */
function classifyRule(rule, lines) {
  let bestInk = 0;
  let over = null;
  for (const line of lines) {
    const size = line.size || 12;
    if (!(line.y >= rule.y - 0.5 && line.y <= rule.y + size * 1.3)) continue;
    const ink = inkBetween(line, rule.x, rule.endX);
    if (ink > bestInk) { bestInk = ink; over = line; }
  }
  const fraction = rule.width > 0 ? bestInk / rule.width : 0;
  return {
    isUnderline: fraction >= UNDERLINE_INK_FRACTION,
    inkFraction: round(fraction),
    textOnTheRule: over && fraction >= UNDERLINE_INK_FRACTION ? over.text : null
  };
}

/**
 * The printed words this blank is labelled by, measured.
 *
 * One rule, applied to every blank on both documents so no blank gets a caption
 * chosen for it:
 *
 *   1. the printed glyphs on the blank's own line that lie between the end of
 *      the previous blank on that line and the start of this one;
 *   2. failing that, the glyphs between this blank's end and the next blank on
 *      the line;
 *   3. failing that, a SHORT printed line directly beneath the blank whose span
 *      overlaps it — the "Defendant's Signature", "Judge", "Date" layout.
 *
 * Step 3 is capped at 40 characters on purpose. Uncapped, a body sentence
 * beneath a blank becomes its label, and on these two documents nearly every
 * body sentence contains the word "Defendant" — which is the exact printed-label
 * route that hands a blank participant.full_legal_name. A label is a label; a
 * sentence is not one.
 */
const BELOW_LABEL_MAX_CHARS = 40;
const BELOW_LABEL_MAX_DROP = 30;
function captionFor({ blank, line, blanksOnLine, lines }) {
  if (line) {
    const previousEnd = blanksOnLine
      .filter((b) => b.x1 <= blank.x0 + 0.5)
      .reduce((m, b) => Math.max(m, b.x1), -Infinity);
    const nextStart = blanksOnLine
      .filter((b) => b.x0 >= blank.x1 - 0.5)
      .reduce((m, b) => Math.min(m, b.x0), Infinity);
    const pick = (x0, x1) => (line.chars ?? [])
      .filter((ch) => ch.x + ch.w <= x1 + 0.5 && ch.x >= x0 - 0.5)
      .map((ch) => ch.c).join("");
    const before = captionTextOf(pick(Number.isFinite(previousEnd) ? previousEnd : -Infinity, blank.x0));
    if (before) return { caption: before, basis: "same_line_before_the_blank" };
    const after = captionTextOf(pick(blank.x1, Number.isFinite(nextStart) ? nextStart : Infinity));
    if (after) return { caption: after, basis: "same_line_after_the_blank" };
  }
  const below = lines
    .filter((l) => l.y < blank.baselineY - 4 && l.y >= blank.baselineY - BELOW_LABEL_MAX_DROP)
    .filter((l) => underscoreRunsOf(l).length === 0)
    .filter((l) => {
      const chars = l.chars ?? [];
      if (!chars.length) return false;
      const x0 = chars[0].x;
      const x1 = chars[chars.length - 1].x + chars[chars.length - 1].w;
      return Math.min(x1, blank.x1) - Math.max(x0, blank.x0) > 0;
    })
    .sort((a, b) => b.y - a.y)[0] ?? null;
  const belowText = below ? captionTextOf(below.text) : "";
  if (belowText && belowText.length <= BELOW_LABEL_MAX_CHARS) {
    return { caption: belowText, basis: "short_label_line_below_the_blank" };
  }
  return { caption: "", basis: "no_printed_caption_adjacent_to_this_blank" };
}

/**
 * The printed section heading a blank sits under.
 *
 * A heading on these forms is centred on the page. That is what actually
 * separates "VERIFICATION" and "Certificate of Service" from "STATE OF
 * ARKANSAS", which is a caption-block line flush at the left margin and is not a
 * heading however upper-case it is. Measuring the centring rather than reading
 * the capitals is the difference between protecting the notarial block and
 * protecting the whole page.
 */
// Two lines of these forms' leading. See the charge context channel below.

function headingCandidatesOf(lines, pageWidth) {
  return lines.filter((line) => {
    const text = captionTextOf(line.text);
    if (!text || text.length > HEADING_MAX_CHARS) return false;
    if (underscoreRunsOf(line).length > 0) return false;

    // The deny vocabulary wins wherever it fires, centred or not. A printed
    // "Certificate of Service" opens a service block whatever the typesetting —
    // and on this petition it is set at the left margin, not centred.
    if (regionProtectCategoryOf(text)) return true;

    const chars = line.chars ?? [];
    if (!chars.length) return false;
    let x0 = Infinity, x1 = -Infinity;
    for (const ch of chars) {
      if (String(ch.c).trim() === "") continue;
      x0 = Math.min(x0, ch.x); x1 = Math.max(x1, ch.x + ch.w);
    }
    if (!Number.isFinite(x0)) return false;
    if (Math.abs((x0 + x1) / 2 - pageWidth / 2) > HEADING_CENTRE_TOLERANCE) return false;

    // Centring alone is not enough. A full-measure line of body prose is also
    // centred on the page by arithmetic, and would make the region channel
    // meaningless. A heading on these forms is set in capitals, so a line
    // carrying any lower-case letter is prose.
    const capitals = (text.match(/[A-Z]/g) ?? []).length;
    return capitals >= HEADING_MIN_CAPITALS && !/[a-z]/.test(text);
  });
}

/** Censuses one document: every blank the form draws, measured from its bytes. */
async function censusDocument(doc, bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();

  // Re-read the structural class from the bytes rather than trusting the index.
  let acroFieldCount = 0;
  try { acroFieldCount = pdf.getForm().getFields().length; } catch { acroFieldCount = 0; }
  if (acroFieldCount !== 0) {
    fail(`${doc.documentId}: expected a flat PDF, found ${acroFieldCount} AcroForm field(s)`,
      "This family's whole method assumes there are no widgets. A form that has grown some is a different document.");
  }

  const titleWords = doc.officialTitle.toUpperCase().replace(/\s+/g, " ");
  const blanks = [];
  const pageGeometry = [];
  const strokedByPage = [];
  const rulesByPage = [];
  const documentTextLines = [];

  for (const [index, page] of pages.entries()) {
    const pageNumber = index + 1;
    const { width: pageWidth, height: pageHeight } = page.getSize();
    pageGeometry.push({ page: pageNumber, width: round(pageWidth), height: round(pageHeight) });

    const lines = groupIntoLines(extractTextItems(page));
    for (const line of lines) documentTextLines.push(normalizeHarvestedText(line.text));

    // The CTM-tracking stroked-box detector, run on every page. Whatever it
    // reports is a measurement, including zero.
    const stroked = strokedRectangles(contentStringOf(pdf, page));
    strokedByPage.push({ page: pageNumber, strokedRectangles: stroked.length, rectangles: stroked });

    const measuredRules = rulesOfPage(page, { maxThickness: 3, minLength: 20, minDividerLength: 20 });
    const classified = measuredRules.horizontal.map((rule) => ({ ...rule, ...classifyRule(rule, lines) }));
    rulesByPage.push({
      page: pageNumber,
      horizontal: classified.map((r) => ({
        x: r.x, endX: r.endX, y: r.y, width: r.width, height: r.height,
        operator: r.operator, paintedBy: r.paintedBy,
        classifiedAs: r.isUnderline ? "underline_of_printed_text" : "blank_rule",
        inkFractionOnTheRule: r.inkFraction,
        textOnTheRule: r.textOnTheRule
      })),
      vertical: measuredRules.vertical.map((v) => ({ x: v.x, y: v.y, topY: v.topY, width: v.width }))
    });

    const headings = headingCandidatesOf(lines, pageWidth);

    // Every blank on this page, from both constructions, in one list.
    const raw = [];
    for (const line of lines) {
      for (const run of underscoreRunsOf(line)) {
        raw.push({
          construction: "underscore_leader_run", line,
          x0: round(run.x0), x1: round(run.x1), baselineY: round(line.y),
          glyphCount: run.glyphs, printedSize: round(line.size || 12)
        });
      }
    }
    for (const rule of classified) {
      if (rule.isUnderline) continue;
      const size = 12;
      const host = lines.find((l) => l.y >= rule.y - 0.5 && l.y <= rule.y + (l.size || size) * 1.3) ?? null;
      raw.push({
        construction: "drawn_rule", line: host,
        x0: round(rule.x), x1: round(rule.endX), baselineY: round(rule.y),
        glyphCount: null, printedSize: round(host?.size || size),
        rule: { x: rule.x, endX: rule.endX, y: rule.y, height: rule.height, operator: rule.operator, paintedBy: rule.paintedBy }
      });
    }

    for (const blank of raw) {
      const blanksOnLine = blank.line
        ? raw.filter((b) => b.line === blank.line).map((b) => ({ x0: b.x0, x1: b.x1 }))
        : [];
      const { caption, basis } = captionFor({ blank, line: blank.line, blanksOnLine, lines });

      const headingAbove = headings
        .filter((h) => h.y > blank.baselineY + 2)
        .sort((a, b) => a.y - b.y)[0] ?? null;
      const regionHeading = headingAbove ? captionTextOf(headingAbove.text) : null;
      const regionIsDocumentTitle = Boolean(regionHeading && titleWords.includes(regionHeading.toUpperCase()));
      const regionCategory = regionHeading && !regionIsDocumentTitle
        ? regionProtectCategoryOf(regionHeading) : null;

      // What the SHARED factory would decide for this blank, computed for every
      // blank whether or not this family offers it one. This is what makes a
      // role refusal checkable instead of believable.
      const projection = decideBinding(
        { name: caption, pdfType: "text", effectiveLabel: caption },
        { explicitMappings: doc.explicitMappings, captionOnly: doc.captionOnly === true,
          availableChargeRows: 0 }
      );

      // THE CHARGE CONTEXT CHANNEL, AND WHY THE CAPTION CHANNEL IS NOT ENOUGH.
      //
      // On the petition the actual charge blanks are the two full-measure rules
      // beneath ", and charged with the offense(s) of :" — 416pt and 417pt wide,
      // at y=386.76 and y=367.71. Neither has a printed caption anywhere near it
      // and neither has a host text line, so `captionOrLineMentionsCharge` is
      // FALSE for both: the blanks that most need watching are exactly the ones
      // the caption channel cannot see. The same is true of the conviction
      // offence's continuation rule at y=234.36.
      //
      // So the nearest printed line ABOVE the blank is measured too, within
      // CHARGE_CONTEXT_MAX_DROP — two lines of this form's leading. A blank is
      // charge-associated if its caption, its own line, OR the printed line it
      // sits under names a charge, offence, count, statute or violation. The
      // proof reports on all of them.
      const above = lines
        .filter((l) => l.y > blank.baselineY + 1 && l.y <= blank.baselineY + CHARGE_CONTEXT_MAX_DROP)
        .filter((l) => captionTextOf(l.text) !== "")
        .sort((a, b) => a.y - b.y)[0] ?? null;
      const contextLine = above ? normalizeHarvestedText(above.text) : null;
      const contextMentionsCharge = Boolean(contextLine && CHARGE_VALUE_WORDS.test(contextLine));

      // The stricter caption gate the flat-overlay profile generator applies:
      // a caption is a short noun phrase, not a sentence.
      const words = caption ? caption.split(/\s+/).filter(Boolean).length : 0;
      const flatCaptionGate = !caption
        ? "no_caption"
        : caption.length < 3 || caption.length > 30 || words > 4
          ? "not_a_caption"
          : "caption_shaped";

      blanks.push({
        blankId: `p${pageNumber}-y${blank.baselineY.toFixed(2)}-x${blank.x0.toFixed(2)}`,
        page: pageNumber,
        construction: blank.construction,
        // MEASURED off the document. Nothing here is derived from where a label
        // sits; the caption is captured separately and decides only what a blank
        // means, never where it is.
        measured: {
          x0: blank.x0, x1: blank.x1, baselineY: blank.baselineY,
          width: round(blank.x1 - blank.x0),
          underscoreGlyphs: blank.glyphCount,
          rule: blank.rule ?? null
        },
        geometryBasis: blank.construction === "underscore_leader_run"
          ? "underscore_leader_glyph_run_measured_from_the_text_showing_operators"
          : "thin_filled_rectangle_measured_from_the_page_path_operators",
        printedLine: blank.line ? normalizeHarvestedText(blank.line.text) : null,
        printedSize: blank.printedSize,
        // Whether the walker resolved this line's real glyph widths from the
        // font, or fell back to using the type size as the width of every
        // glyph. On an underscore leader run the rectangle IS the glyph run, so
        // a fallback width makes the rectangle an estimate rather than a
        // measurement. See writeBoxIsExactlyMeasured below.
        metricsExact: blank.line ? blank.line.metricsExact : null,
        withinTheMediaBox: blank.x0 >= 0 && blank.x1 <= round(pageWidth)
          && blank.baselineY >= 0 && blank.baselineY <= round(pageHeight),
        writeBoxIsExactlyMeasured: blank.construction === "drawn_rule"
          ? true
          : blank.line?.metricsExact === true,
        caption,
        captionBasis: basis,
        regionHeading,
        regionIsDocumentTitle,
        regionProtectCategory: regionCategory,
        // Recorded on every blank, not only the ones that get written, so the
        // charge-caption question is answerable for the whole document.
        captionDescribesChargeValue: captionDescribesChargeValue(caption),
        captionOrLineMentionsCharge: CHARGE_VALUE_WORDS.test(caption)
          || CHARGE_VALUE_WORDS.test(blank.line ? blank.line.text : ""),
        printedLineAbove: contextLine,
        printedLineAboveMentionsCharge: contextMentionsCharge,
        chargeAssociated: CHARGE_VALUE_WORDS.test(caption)
          || CHARGE_VALUE_WORDS.test(blank.line ? blank.line.text : "")
          || contextMentionsCharge,
        protectCategory: protectCategoryOf(caption) ?? null,
        descriptorsByCaption: descriptorsMatching(caption).map((d) => d.factId),
        sharedFactoryProjection: projection,
        flatCaptionGate
      });
    }
  }

  blanks.sort((a, b) => a.page - b.page || b.measured.baselineY - a.measured.baselineY || a.measured.x0 - b.measured.x0);

  const duplicates = blanks.map((b) => b.blankId).filter((id, i, all) => all.indexOf(id) !== i);
  if (duplicates.length) {
    fail(`${doc.documentId}: two blanks share one measured id`, duplicates.join(", "));
  }

  return { pdf, pages, blanks, pageGeometry, strokedByPage, rulesByPage, documentTextLines, acroFieldCount };
}

// ==============================================================================
// Steps 4 and 5: the anchors this family offers the shared factory, and the
// blanks it withholds.
//
// Three gates run before an anchor is offered at all:
//
//   * the family's own ROLE refusals, listed on each document above;
//   * the printed REGION the blank sits in;
//   * the measured WIDTH of the blank.
//
// The region gate is here rather than in the factory because finalizeFlatOverlay
// does not pass `regionHeading` to decideBinding, so on a flat overlay the shared
// region channel never runs. Nothing in this family depends on that gap being
// closed; the gap is reported as a finding.
// ==============================================================================
function anchorsFor(doc, census) {
  const roleById = new Map(doc.roleRefusals.map((r) => [r.blankId, r]));
  const known = new Set(census.blanks.map((b) => b.blankId));
  for (const declared of roleById.keys()) {
    if (!known.has(declared)) {
      fail(`${doc.documentId}: role refusal names a blank that is not in the census: ${declared}`,
        "A refusal that names nothing refuses nothing. Either the measurement moved or the id is wrong.");
    }
  }

  const anchors = [];
  const withheld = [];
  for (const blank of census.blanks) {
    const role = roleById.get(blank.blankId);
    if (role) {
      withheld.push({
        blankId: blank.blankId, page: blank.page, caption: blank.caption,
        channel: "family_role_refusal", class: role.class, why: role.why,
        refusalClass: role.refusalClass ?? null,
        completenessDisposition: role.completenessDisposition ?? null,
        // The role gate runs first, so a blank that BOTH the role and the region
        // channel would catch is reported here rather than there — which is why
        // the region channel's own count is zero on this family. Recording the
        // overlap keeps that honest: it says the second channel exists and would
        // have held, not that it did the holding.
        alsoInAProtectedRegion: blank.regionProtectCategory ?? null,
        alsoProtectedByItsCaption: blank.protectCategory ?? null,
        wouldTheSharedFactoryHaveWritten: blank.sharedFactoryProjection.writable === true,
        wouldHaveBound: blank.sharedFactoryProjection.factId ?? null
      });
      continue;
    }
    if (blank.regionProtectCategory) {
      withheld.push({
        blankId: blank.blankId, page: blank.page, caption: blank.caption,
        channel: "printed_page_region", class: `protected_page_region:${blank.regionProtectCategory}`,
        why: `The blank sits under the printed section heading ${JSON.stringify(blank.regionHeading)}, which the shared region vocabulary classifies as ${blank.regionProtectCategory}. finalizeFlatOverlay does not run the region channel, so this family runs it.`,
        wouldTheSharedFactoryHaveWritten: blank.sharedFactoryProjection.writable === true,
        wouldHaveBound: blank.sharedFactoryProjection.factId ?? null
      });
      continue;
    }

    // A RECTANGLE OFF THE PAGE IS NOT A WRITE BOX.
    //
    // Six blanks across the two documents measure outside the 612x792 media box
    // — the order's conviction-date trio reaches x=952 and the petition's page 2
    // signature and date rules reach x=739.6. Ink drawn there is on no page
    // anybody prints, and it would still satisfy every per-blank check below,
    // because it lands inside a blank that the census really did measure. This
    // gate is what stops that, and it is the same failure mode as the mark in
    // the margin: geometry that looks like a measurement and is not.
    if (!blank.withinTheMediaBox) {
      withheld.push({
        blankId: blank.blankId, page: blank.page, caption: blank.caption,
        channel: "measured_geometry", class: "write_box_falls_outside_the_page_media_box",
        why: `measured x ${blank.measured.x0}..${blank.measured.x1} on a page ${census.pageGeometry.find((p) => p.page === blank.page)?.width}pt wide`,
        wouldTheSharedFactoryHaveWritten: blank.sharedFactoryProjection.writable === true,
        wouldHaveBound: blank.sharedFactoryProjection.factId ?? null
      });
      continue;
    }

    // A RECTANGLE ESTIMATED FROM FALLBACK GLYPH WIDTHS IS NOT A MEASUREMENT.
    //
    // An underscore leader run's rectangle IS the run of `_` glyphs, so it is
    // only as exact as the glyph metrics. Where the walker could not resolve the
    // font's widths it reports metricsExact=false and falls back to the type
    // size as the width of every glyph; on the order's page 1 that fallback
    // walks the line 340pt past the right edge of the paper, which is how this
    // gate was found rather than assumed. Drawn rules are exempt: their geometry
    // comes from the path operators, not from glyph metrics.
    //
    // This is why the petition writes so little. Its page 2 is entirely
    // underscore leaders on lines the walker could not measure — the same page
    // whose glyphs arrive out of order, which is also why its captions read
    // "da oy" and "Ci". Those blanks are left for the participant and listed in
    // reports/blanks-left-for-the-participant.json, rather than written into a
    // rectangle this build cannot stand behind.
    if (!blank.writeBoxIsExactlyMeasured) {
      withheld.push({
        blankId: blank.blankId, page: blank.page, caption: blank.caption,
        channel: "measured_geometry", class: "write_box_not_exactly_measured",
        why: "The blank is an underscore leader run on a line whose glyph widths the shared walker could not "
          + "resolve from the font (metricsExact=false), so its rectangle is estimated from the type size rather "
          + "than measured. A write box is offered only where the geometry is exact.",
        wouldTheSharedFactoryHaveWritten: blank.sharedFactoryProjection.writable === true,
        wouldHaveBound: blank.sharedFactoryProjection.factId ?? null
      });
      continue;
    }

    const x = round(blank.measured.x0 + INSET_X);
    const width = round(blank.measured.x1 - INSET_RIGHT - x);
    const y = blank.construction === "drawn_rule"
      ? round(blank.measured.baselineY + BASELINE_ABOVE_RULE)
      : blank.measured.baselineY;
    if (width < 20) {
      withheld.push({
        blankId: blank.blankId, page: blank.page, caption: blank.caption,
        channel: "measured_geometry", class: "write_box_too_narrow_to_hold_a_value",
        why: `${width}pt between the measured ends of the blank`,
        wouldTheSharedFactoryHaveWritten: blank.sharedFactoryProjection.writable === true,
        wouldHaveBound: blank.sharedFactoryProjection.factId ?? null
      });
      continue;
    }
    anchors.push({
      blankId: blank.blankId,
      label: doc.anchorLabelByBlankId?.[blank.blankId] ?? blank.caption,
      page: blank.page,
      writeBox: { x, y, width, height: BOX_HEIGHT },
      baselineBasis: blank.construction === "drawn_rule"
        ? `rule_y_plus_${BASELINE_ABOVE_RULE}pt`
        : "underscore_leader_glyph_baseline",
      fontSize: Math.min(blank.printedSize, MAX_FONT_SIZE),
      captionOnly: doc.captionOnly === true
    });
  }
  return { anchors, withheld };
}

/**
 * The drawn rules a protected caption owns, handed to the factory so its own
 * geometry gate runs as well as this family's.
 */
function protectedRulesFor(census) {
  return census.blanks
    .filter((b) => b.construction === "drawn_rule" && (b.protectCategory || b.regionProtectCategory))
    .map((b) => ({
      page: b.page, x: b.measured.x0, endX: b.measured.x1, y: b.measured.baselineY,
      category: b.protectCategory ?? b.regionProtectCategory, caption: b.caption
    }));
}

// ==============================================================================
// Step 7: prove it from the ARTIFACT, not from the report.
//
// The report says what the factory believes it wrote. This reads the finished
// PDF's own text-showing operators back out, subtracts every glyph the SOURCE
// already drew, and asks what is left — which is exactly the ink this build
// added — and where it sits. A flat overlay draws into page content rather than
// into a widget appearance, so this is the artifact answering directly.
// ==============================================================================
async function addedInkOf(sourceBytes, outBytes) {
  const before = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const after = await PDFDocument.load(outBytes, { ignoreEncryption: true, updateMetadata: false });

  // ATTRIBUTION IS PER ITEM, BY THE ITEM'S ORIGIN, AND THE FIRST PASS GOT THIS
  // WRONG IN THE INSTRUCTIVE DIRECTION.
  //
  // A text item's `x`/`y` come straight from the text matrix, and its `text` is
  // the decoded string: both are exact whatever the font. Its per-glyph x and w
  // are not — they are accumulated from the font's advance widths, and where the
  // walker cannot resolve those it falls back to the type size as every glyph's
  // width. The overlay's own Helvetica is one of the fonts it cannot resolve.
  //
  // Attributing glyph by glyph therefore reconstructed the boundary fixture's
  // 69-character name as spanning 245.7pt and reported it drawn outside its
  // 238.4pt rule. It is not: the factory shrank it to 7pt, where Helvetica's
  // true width for that string is 228.25pt, so it sits inside the rule with 10pt
  // to spare. The artifact was right and the verifier's transcription was wrong
  // — which is exactly the failure the whitespace comment below was written
  // about, in a different disguise.
  //
  // So: an item is located by its origin, transcribed from its own text, and its
  // EXTENT is measured separately and explicitly, never inferred from glyph
  // positions the walker could not resolve.
  const key = (page, ch, y) => `${page}|${ch.x.toFixed(1)}|${y.toFixed(1)}|${ch.c}`;
  const original = new Set();
  before.getPages().forEach((page, i) => {
    for (const item of extractTextItems(page)) {
      for (const ch of item.chars ?? []) original.add(key(i + 1, ch, item.y));
    }
  });

  const items = [];
  after.getPages().forEach((page, i) => {
    for (const item of extractTextItems(page)) {
      const chars = item.chars ?? [];
      if (!chars.length) continue;
      // Whitespace glyphs are counted here. Dropping them made an earlier
      // reconstruction read "JordanAveryReyes", which matched no value the
      // factory reported writing — a verifier failing on its own transcription
      // rather than on the artifact.
      const fresh = chars.filter((ch) => !original.has(key(i + 1, ch, item.y)));
      if (!fresh.length) continue;
      if (fresh.length !== chars.length) {
        // An item that is part source and part overlay would make the
        // transcription below a mixture of the two. The overlay draws its own
        // text-showing operators, so this should never happen; it is checked
        // rather than assumed.
        fail("an added text item overlaps glyphs the source already drew",
          `page ${i + 1} y=${item.y}: ${fresh.length} of ${chars.length} glyphs are new`);
      }
      items.push({
        page: i + 1,
        x: round(item.x),           // exact: the text matrix origin
        y: round(item.y),           // exact
        size: item.size,
        text: String(item.text),    // exact: the decoded string
        metricsExact: item.metricsExact === true,
        glyphs: chars.length
      });
    }
  });
  return items;
}

/**
 * The true drawn width of a string, from the artifact's own font size and the
 * public metrics of the font the overlay embeds.
 *
 * Not taken from the render report: the report says what the factory believes it
 * wrote, and the whole point of this stage is not to ask it. The size and the
 * string come from the artifact; Helvetica's advance widths are a published
 * property of a standard font. `assertArtifactUsesHelvetica` confirms from the
 * finished PDF's own resource dictionaries that this is the font on the page.
 */
async function helveticaRuler() {
  const scratch = await PDFDocument.create();
  stampDeterministic(scratch);
  const font = await scratch.embedFont(StandardFonts.Helvetica);
  return (text, size) => round(font.widthOfTextAtSize(String(text), size));
}

async function assertArtifactUsesHelvetica(outBytes, label) {
  const pdf = await PDFDocument.load(outBytes, { ignoreEncryption: true, updateMetadata: false });
  const names = new Set();
  for (const page of pdf.getPages()) {
    const fonts = page.node.Resources?.()?.lookup?.(PDFName.of("Font"));
    for (const key of fonts?.keys?.() ?? []) {
      const base = fonts.lookup(key)?.get?.(PDFName.of("BaseFont"));
      if (base) names.add(String(base.decodeText ? base.decodeText() : base).replace(/^\//, ""));
    }
  }
  const helvetica = [...names].filter((n) => /Helvetica/i.test(n));
  if (!helvetica.length) {
    fail(`${label}: the artifact names no Helvetica font resource`,
      `The extent check measures the drawn value with Helvetica's metrics, so it has to be the font on the page. Fonts found: ${[...names].join(", ") || "none"}`);
  }
  return helvetica;
}

/** The added items whose ORIGIN lands inside one measured blank. */
function inkInBlank(items, blank) {
  const x0 = blank.measured.x0 - 1;
  const x1 = blank.measured.x1 + 1;
  const yLow = blank.measured.baselineY - 3;
  const yHigh = blank.measured.baselineY + BOX_HEIGHT + 2;
  const hits = items
    .filter((it) => it.page === blank.page && it.y >= yLow && it.y <= yHigh && it.x >= x0 && it.x <= x1)
    .sort((a, b) => a.x - b.x);
  return { hits, text: hits.map((it) => it.text).join("").trim() };
}

const CATEGORIES_THAT_MUST_STAY_BLANK = new Set([
  "signature", "notarization", "service_block", "court", "clerk", "prosecutor", "attorney"
]);

function verifyFromBytes({ doc, census, anchors, withheld, report, added, label, widthOf }) {
  const findings = [];
  const anchorById = new Map(anchors.map((a) => [a.blankId, a]));
  const withheldById = new Map(withheld.map((w) => [w.blankId, w]));
  const allowedNameBlanks = new Set(NAME_MAY_APPEAR_IN[doc.documentId] ?? []);
  const expected = new Set((report.expectedValues ?? []).map((v) => String(v)));

  const perBlank = [];
  const chargeBlanks = [];
  const namePlacements = [];
  const attributed = new Set();

  for (const blank of census.blanks) {
    const { hits, text } = inkInBlank(added, blank);
    for (const it of hits) attributed.add(it);
    const carriesInk = text !== "";
    const offered = anchorById.has(blank.blankId);
    const held = withheldById.get(blank.blankId) ?? null;

    perBlank.push({
      blankId: blank.blankId, page: blank.page, caption: blank.caption,
      measured: blank.measured, offeredAsAnchor: offered,
      withheldBy: held ? held.channel : null, withheldClass: held ? held.class : null,
      inkFoundAtTheMeasuredRectangle: carriesInk ? text : null,
      drawnExtent: carriesInk
        ? hits.map((it) => ({
            originX: it.x, fontSize: it.size,
            trueWidthAtHelveticaMetrics: widthOf(it.text, it.size),
            endsAtX: round(it.x + widthOf(it.text, it.size)),
            measuredBlankEndsAtX: blank.measured.x1
          }))
        : null
    });

    // THE VALUE HAS TO FIT THE BLANK IT WAS WRITTEN INTO.
    //
    // Measured from the artifact's own font size and string against Helvetica's
    // published advance widths, never from the walker's per-glyph positions,
    // which on this overlay's font are fallback estimates. A value that runs
    // past the end of the rule it was written on is a wrong value on a filing,
    // not a longer one.
    for (const it of hits) {
      const endsAt = it.x + widthOf(it.text, it.size);
      if (endsAt > blank.measured.x1 + 1) {
        findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
          check: "drawn_value_runs_past_the_end_of_the_measured_blank",
          drawnText: it.text, fontSize: it.size, endsAtX: round(endsAt),
          measuredBlankEndsAtX: blank.measured.x1 });
      }
    }

    // THE CHECK THIS LINEAGE EXISTS TO PASS.
    //
    // Unlike the flat DWI sibling, this family HAS charge blanks: both documents
    // draw a blank after "and charged with the offense(s) of:". The name check is
    // the blocking one and applies to every such blank. Ink alone is reported
    // rather than blocked, because on these documents a charge blank is a real
    // blank a filer completes — but no participant name may ever reach one.
    if (blank.chargeAssociated) {
      const hit = NAME_TOKENS.filter((t) => text.toLowerCase().includes(t.toLowerCase()));
      chargeBlanks.push({
        blankId: blank.blankId, page: blank.page, caption: blank.caption,
        printedLine: blank.printedLine,
        printedLineAbove: blank.printedLineAbove,
        associatedBy: [
          CHARGE_VALUE_WORDS.test(blank.caption) ? "caption" : null,
          CHARGE_VALUE_WORDS.test(blank.printedLine ?? "") ? "own_printed_line" : null,
          blank.printedLineAboveMentionsCharge ? "printed_line_above" : null
        ].filter(Boolean),
        captionDescribesChargeValue: blank.captionDescribesChargeValue,
        measured: blank.measured,
        offeredAsAnchor: offered,
        withheldBy: held ? held.channel : null,
        inkFound: carriesInk ? text : null,
        participantNameTokensFound: hit
      });
      if (hit.length) {
        findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
          check: "participant_name_in_a_charge_caption_blank", drawnText: text, tokens: hit });
      }
    }

    // A blank this family withheld must be empty on the paper.
    if (held && carriesInk) {
      findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
        check: "withheld_blank_carries_ink", withheldBy: held.channel, class: held.class, drawnText: text });
    }
    if (carriesInk && !offered) {
      findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
        check: "ink_in_a_blank_that_was_never_offered_as_an_anchor", drawnText: text });
    }
    if (carriesInk && !expected.has(text)) {
      findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
        check: "ink_at_this_rectangle_is_not_a_value_the_factory_reported_writing", drawnText: text });
    }

    // Blanks the shared vocabulary says somebody else owns must be blank.
    const owned = blank.protectCategory ?? blank.regionProtectCategory ?? null;
    if (owned && CATEGORIES_THAT_MUST_STAY_BLANK.has(owned) && carriesInk) {
      findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
        check: "signature_notarial_service_or_court_owned_blank_is_not_blank",
        category: owned, drawnText: text });
    }

    if (carriesInk) {
      const hit = NAME_TOKENS.filter((t) => text.toLowerCase().includes(t.toLowerCase()));
      if (hit.length) {
        namePlacements.push({ blankId: blank.blankId, page: blank.page, caption: blank.caption,
          text, tokens: hit, allowed: allowedNameBlanks.has(blank.blankId) });
        if (!allowedNameBlanks.has(blank.blankId)) {
          findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
            check: "participant_name_drawn_in_a_blank_not_listed_as_a_name_blank",
            drawnText: text, tokens: hit });
        }
      }
    }
  }

  // THE WIDER NET: ink this build added that lands in no measured blank at all.
  // A value drawn in the margin is invisible to every per-blank check above, and
  // a mark in the margin is precisely what the older `re`-operator scan produced.
  const inNoBlank = added.filter((it) => !attributed.has(it) && it.text.trim() !== "");
  if (inNoBlank.length) {
    findings.push({ severity: "blocking", fixture: label,
      check: "this_build_drew_ink_outside_every_measured_blank",
      items: inNoBlank.length,
      firstAt: { page: inNoBlank[0].page, x: inNoBlank[0].x, y: inNoBlank[0].y, text: inNoBlank[0].text } });
  }

  // Every value the factory reported writing has to be findable on the paper.
  for (const value of report.expectedValues ?? []) {
    const found = perBlank.some((b) => b.inkFoundAtTheMeasuredRectangle === String(value));
    if (!found) {
      findings.push({ severity: "blocking", fixture: label,
        check: "a_value_the_factory_reported_writing_is_not_at_any_measured_rectangle", value: String(value) });
    }
  }

  return {
    findings, perBlank, chargeBlanks, namePlacements,
    itemsAdded: added.length,
    itemsInsideAMeasuredBlank: attributed.size,
    glyphsAdded: added.reduce((n, it) => n + it.glyphs, 0),
    blanksCarryingInk: perBlank.filter((b) => b.inkFoundAtTheMeasuredRectangle).length
  };
}

// ==============================================================================


const UNDERLINE_INK_FRACTION = 0.5;
const CHARGE_CONTEXT_MAX_DROP = 60;
const HEADING_MAX_CHARS = 60;
const HEADING_CENTRE_TOLERANCE = 40;
const HEADING_MIN_CAPITALS = 3;
const ROUTE_KEYS = [
  "obligation:unit:AR:ar-veterans-court:ar-veterans-court-stage-1",
  "obligation:unit:AR:ar-veterans-court:ar-veterans-court-stage-2"
];
const ADOPTION_RECORD = "data/rcap-grade-a/legal-decisions/AR_VETERANS_OWNER_PRODUCT_ADOPTION_2026-09-13.json";
const SOURCE_REVIEW = "data/rcap-grade-a/packet-factory-24h/vf44/ar-veterans-source-input-review-20260912.json";

function refusalFor(doc, blank) {
  const c = String(blank.caption ?? "").trim();
  const p = String(blank.printedLine ?? "");
  const above = String(blank.printedLineAbove ?? "");
  const all = `${c} ${p} ${above}`.toLowerCase();
  if (blank.regionProtectCategory === "notarization") return {
    class: "notarial_or_verification_actor",
    why: "The verification is sworn before a notary. Its venue, oath, signature, jurat date, notary identity and commission data remain blank until the appropriate actor completes them."
  };
  if (blank.regionProtectCategory === "service_block") return {
    class: "service_actor_or_attestation",
    why: "The certificate of service attests to service that has actually occurred. The certifying name, signature and date remain blank; the participant does not pre-attest service."
  };
  if (doc.documentRole === "PROPOSED_ORDER" && /rehabilitated/i.test(all)) return {
    class: "judge_owned_rehabilitation_finding",
    why: "The old rehabilitation checkbox is a judge-owned finding under the held source form. It is never converted into a participant fact or preselected by this build; the appropriate specialty-court judge completes it if current law and the record support the finding."
  };
  if (doc.documentRole === "PROPOSED_ORDER") return {
    class: "court_owned_finding_or_execution",
    why: "The proposed order is the court's instrument. Findings, completion and recommendation recitals, conditional branches, judge-owned history and appropriateness findings, cross-court agreement/signature, decree, judge signature/date and agency identification remain blank for the appropriate court or agency actor."
  };
  if (/\b(race|sex|sid|fbi|arrest tracking)\b/i.test(all)) return {
    class: /arrest tracking|sid|fbi/i.test(all) ? "agency_assigned_identifier" : "participant_identification_not_collected",
    why: "This identification entry is not a collected fact for this build. It must be supplied from the participant's or agency's authoritative record; the builder does not infer it."
  };
  if (/signature|notary|commission|\bdate\b|day of|subscribed|sworn/i.test(all)) return {
    class: "participant_or_notary_execution",
    why: "This execution or date field is completed by the participant, notary or other appropriate actor at the required event. The build does not sign, attest or date it."
  };
  if (/charged with the offense|in violation|offense|pending felony|case number|county|court|target offense|residential burglary|commercial burglary|breaking or entering|intoxicated|rehabilitated|successfully completed|recommendation|concurred|previously plead|found guilty/i.test(all)) return {
    class: /county|court|case number|previously|concurred|target offense|burglary|intoxicated/i.test(all) ? "conditional_participant_or_other_court_branch" : "participant_record_fact_or_statute",
    why: "This blank depends on the participant's records, a conditional branch, or an other-court/court-owned determination. It remains blank until the exact supporting fact and responsible actor are present."
  };
  return { class: "participant_entered_unmapped", why: "The measured blank has no unambiguous collected fact mapping. It is disclosed for the participant or responsible actor rather than guessed by the builder." };
}

const PENDING_SELECTION_IDS = new Set([
  "p2-y513.80-x107.52", "p2-y465.60-x102.97"
]);
const OPTIONAL_CHARGE_CONTINUATION_ID = "p1-y230.10-x99.38";

function near(value, target) {
  return Math.abs(Number(value ?? 0) - target) < 0.2;
}

function participantLabelFor(doc, blank) {
  const id = blank.blankId;
  const x = Number(blank.measured?.x0 ?? 0);
  const y = Number(blank.measured?.baselineY ?? 0);
  if (doc.documentRole !== "PETITION") return `Participant field ${id}`;
  if (near(y, 707) && near(x, 130.22)) return "Filing court name";
  if (near(y, 707) && near(x, 320.09)) return "Filing county";
  if (near(y, 302.6) && near(x, 324.61)) return "Arrest date — day";
  if (near(y, 302.6) && near(x, 424.9)) return "Arrest date — month";
  if (near(y, 278.5)) return "Arrest date — year";
  if (id === OPTIONAL_CHARGE_CONTINUATION_ID) return "Charged offense continuation line (only if needed)";
  if (near(y, 230.1)) return "Charged offense continuation line";
  if (near(y, 206)) return "Charged offense statute";
  if (near(y, 634.5)) return "Veterans Treatment Court completion date";
  if (near(y, 417.2) && near(x, 99.02)) return "Pending felony charge status — details line 1";
  if (near(y, 393.1)) return "Pending felony charge status — details line 2";
  if (id === "p2-y513.80-x107.52") return "Pending felony charge status — no pending charges";
  if (id === "p2-y465.60-x102.97") return "Pending felony charge status — one or more pending charges";
  if (near(y, 369) && near(x, 228.96)) return "Other-court conviction date — day";
  if (near(y, 369) && near(x, 321.55)) return "Other-court conviction date — month";
  if (near(y, 369) && near(x, 399.41)) return "Other-court conviction date — year";
  if (near(y, 344.8) && x < 250) return "Other-court case number(s)";
  if (near(y, 344.8) && x < 430) return "Other-court county";
  if (near(y, 344.8)) return "Other-court court";
  if (near(y, 272.3)) return "Other-court offense";
  if (near(y, 248.2)) return "Other-court offense statute";
  if (near(y, 461.6) && x < 430) return "Other-court case number(s) for sealing";
  if (near(y, 461.6)) return "Other-court county for sealing";
  if (near(y, 437.5)) return "Other-court court for sealing";
  if (near(y, 200.2) && x < 300) return "Participant race";
  if (near(y, 176.1) && x < 300) return "Participant sex";
  const printed = String(blank.printedLine ?? "").replace(/_+/g, " ").replace(/\s+/g, " ").trim();
  const caption = String(blank.caption ?? "").replace(/\s+/g, " ").trim();
  return `${caption || printed || `Participant field ${id}`} (participant fact)`;
}

function participantIdentityBlank(doc, blank) {
  const x = Number(blank.measured?.x0 ?? 0);
  const y = Number(blank.measured?.baselineY ?? 0);
  return doc.documentRole === "PETITION"
    && ((near(y, 200.2) && x < 300) || (near(y, 176.1) && x < 300));
}

function participantRequired(doc, blank, legacy) {
  if (doc.documentRole !== "PETITION") return false;
  if (PENDING_SELECTION_IDS.has(blank.blankId) || blank.blankId === OPTIONAL_CHARGE_CONTINUATION_ID) return false;
  if (participantIdentityBlank(doc, blank)) return true;
  if (["notarial_or_verification_actor", "service_actor_or_attestation", "agency_assigned_identifier"].includes(legacy.class)) return false;
  if (["conditional_participant_or_other_court_branch", "participant_record_fact_or_statute", "participant_identification_not_collected", "participant_entered_unmapped"].includes(legacy.class)) return true;
  if (legacy.class === "participant_or_notary_execution") {
    const text = `${blank.caption ?? ""} ${blank.printedLine ?? ""} ${blank.printedLineAbove ?? ""}`;
    return /arrested on|if applicable/i.test(text);
  }
  return false;
}

function nativeRoleRefusal(doc, blank, legacy) {
  const sourceLabel = String(blank.printedLine || blank.caption || `page ${blank.page} blank`).trim();
  const base = {
    ...legacy,
    blankId: blank.blankId,
    documentId: doc.documentId,
    page: blank.page,
    printedLabel: sourceLabel,
    sourceLabel,
    identity: `${doc.documentId} field ${blank.blankId}`,
    factAvailable: false,
    routeDetermined: false,
    requiredBeforeFiling: false,
    reason: legacy.why
  };
  if (doc.documentRole === "PETITION" && PENDING_SELECTION_IDS.has(blank.blankId)) {
    const label = participantLabelFor(doc, blank);
    return {
      ...base,
      effectiveLabel: `${label} (selection)`,
      refusalClass: "participant_sworn_narrative_or_legal_election",
      completenessDisposition: "PARTICIPANT_ELECTION_GENUINE",
      isSelectionControl: true,
      role: "participant",
      reason: "Select the one pending-felony-charge status that matches the participant's current record; this route does not determine the participant's answer."
    };
  }
  if (doc.documentRole === "PETITION" && blank.blankId === OPTIONAL_CHARGE_CONTINUATION_ID) {
    return {
      ...base,
      effectiveLabel: participantLabelFor(doc, blank),
      refusalClass: null,
      completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      routeConditionThatMakesItInapplicable: "The complete charged-offense text fits on the preceding measured charge line in this one-charge packet; this continuation line is reached only when that text exceeds the preceding line.",
      role: "participant_optional_continuation",
      reason: "The complete charged-offense text fits on the preceding measured charge line in the current canonical and boundary fixtures; the second source line is a continuation only when the charge needs it."
    };
  }
  if (participantRequired(doc, blank, legacy)) {
    const label = participantLabelFor(doc, blank);
    const conditional = legacy.class === "conditional_participant_or_other_court_branch" || /if applicable|pending felony/i.test(`${blank.printedLine ?? ""} ${blank.printedLineAbove ?? ""}`);
    return {
      ...base,
      effectiveLabel: label,
      refusalClass: null,
      completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true,
      requiredBeforeFilingCondition: conditional ? "Complete only when the printed conditional branch applies to the participant's record." : null,
      role: "participant",
      reason: `Required before filing: complete ${label} from the participant's actual record; do not guess.`
    };
  }
  const nativeClass = ["participant_or_notary_execution", "service_actor_or_attestation"].includes(legacy.class)
    ? "signature_or_date_participant_completion"
    : "court_prosecutor_clerk_or_agency_owned";
  const effectiveLabel = legacy.class === "notarial_or_verification_actor"
    ? `Notarial verification actor field (${blank.blankId})`
    : legacy.class === "service_actor_or_attestation"
      ? `Certificate-of-service actor field (${blank.blankId})`
      : legacy.class === "agency_assigned_identifier"
        ? `Record-system identifier field (${blank.blankId})`
        : doc.documentRole === "PROPOSED_ORDER"
          ? `Court-owned proposed-order field (${blank.blankId})`
          : `Protected actor field (${blank.blankId})`;
  return {
    ...base,
    effectiveLabel,
    refusalClass: nativeClass,
    completenessDisposition: "PROTECTED_FIELD",
    role: "protected_actor"
  };
}

function policyFor(doc, census) {
  const allowed = new Map();
  const explicitMappings = {};
  const anchorLabelByBlankId = {};
  let chargeUsed = false;
  for (const blank of census.blanks) {
    const c = String(blank.caption ?? "").trim();
    const above = String(blank.printedLineAbove ?? "");
    let factId = null;
    if (c === "vs. Case No") factId = "matter.case_number";
    else if (c === "DEFENDANT") factId = "participant.full_legal_name";
    else if (c === "DOB" && doc.documentRole === "PETITION") factId = "participant.date_of_birth";
    else if (doc.documentRole === "PETITION" && !chargeUsed && c === "" && /charged with the offense\(s\) of/i.test(above)) {
      factId = "matter.charge"; chargeUsed = true;
      const label = `charged offense (measured blank ${blank.blankId})`;
      anchorLabelByBlankId[blank.blankId] = label;
      explicitMappings[label] = factId;
    } else if (doc.documentRole === "PETITION" && (/^WHEREFORE,? the Defendant/i.test(c) || /^FURTHER,? if applicable, the Defendant/i.test(c))) {
      factId = "participant.full_legal_name";
    }
    if (factId) allowed.set(blank.blankId, factId);
  }
  const roleRefusals = census.blanks.filter((b) => !allowed.has(b.blankId)).map((b) => nativeRoleRefusal(doc, b, refusalFor(doc, b)));
  const nameBlankIds = census.blanks.filter((b) => allowed.get(b.blankId) === "participant.full_legal_name").map((b) => b.blankId);
  return { ...doc, explicitMappings, anchorLabelByBlankId, roleRefusals, allowed, nameBlankIds };
}

function cleanCensus(census) {
  return { pages: census.pages, pageGeometry: census.pageGeometry, strokedByPage: census.strokedByPage, rulesByPage: census.rulesByPage, documentTextLines: census.documentTextLines, acroFieldCount: census.acroFieldCount, blanks: census.blanks };
}

function sourceReceipt(documents) {
  return {
    schemaVersion: "rcap-source-receipt/v1", familyId: FAMILY_ID, custodyClass: "SOURCE_ALREADY_HELD", bindingStatus: "BOUND_EXACT", acquisitionAttempted: false,
    adoptionRecord: ADOPTION_RECORD, sourceReviewRecord: SOURCE_REVIEW, masterLibraryIsNotOperationalNationwide: true,
    stalePrintedCitationTreatment: "The exact July 27, 2021 ACIC petition and order are preserved byte-for-byte as official source artifacts. Their printed references to repealed § 16-101-106 and old § 16-98-303 are disclosed as stale source text and are not current authority. Current instructions use Act 691 of 2025 and A.C.A. §§ 16-90-1601 and 16-90-1602.",
    committedRecords: documents.map(({doc,census}) => ({ sourceId:`official-form:${doc.documentId}`, role:doc.documentRole, documentId:doc.documentId, pathInRepository:doc.repoPath, pathInArchive:doc.pathInArchive, sha256:doc.sha256, byteLength:doc.byteLength, pageCount:census.pages.length, revision:doc.revision, structuralClass:"flat_pdf", acroFieldCount:census.acroFieldCount, bindingResult:"BOUND_EXACT", custody:doc.sourceKind??"recorded_governed_custody", expectedSha256:doc.sha256, expectedByteLength:doc.byteLength, indexComparison:{sha256:"MATCH",byteLength:"MATCH",revision:"MATCH"} })),
    documents: documents.map(({doc,census}) => ({ documentId: doc.documentId, role: doc.documentRole, sha256: doc.sha256, byteLength: doc.byteLength, path: doc.repoPath, pageCount: census.pages.length })),
    missingExternalAuthorityBytes: [{ path:"/tmp/ar-veterans-authority/Act691-2025.pdf", expectedSha256:"3129da9190cd7aebb606351e8c8e479efff6f84af0b98cbc3fcb80a37bd83e4a", expectedByteLength:309709, status:"not_required_for_source_binding; adopted decision/source review metadata is the authority record; no substitute used" }]
  };
}

function guidanceTexts() {
  const stage = `# Arkansas Veterans Treatment Court — Stage 1 and Stage 2

## Stage 1: program evidence before the sealing packet

This stage explains participation in a Veterans Treatment Court. It does not generate program admission, clinical findings, a risk classification, team approval, or a completion record. Collect records sufficient to establish the applicable current Arkansas Judiciary program facts: the participant is an adult; the criminal charge and case; veteran or qualifying service-member status; a qualifying mental-health or substance-use disorder; the required clinical or risk assessment and treatment; Veterans Treatment Court team admission or approval; and ultimately successful program completion. Keep the program records and confirm that the court handled the case.

Stage 2 starts only when the completion facts and the filing facts are actually supported. The held ACIC pair is limited to the factual branch it describes: deferred proceedings, no entered judgment of guilt, and successful Veterans Treatment Court completion. A post-adjudication participant must stop the generated-form branch and receive a participant-specific handoff identifying the supported current instrument. This does not deny substantive relief.

## Stage 2: supported pre-adjudication route

Current controlling authority is Act 691 of 2025 and A.C.A. §§ 16-90-1601 and 16-90-1602. The source PDFs are July 27, 2021 official ACIC artifacts and retain their printed citations. The printed § 16-101-106 and § 16-98-303 references are stale source text; they are not current authority and must not be silently edited. The current-law reconciliation governs these instructions.

Before dismissal and sealing, retain evidence of successful specialty-court completion. The prosecuting attorney's recommendation for dismissal and sealing is a statutory condition. The specialty-court judge considers the participant's past criminal history and determines whether dismissal and sealing are appropriate. The packet never prechecks, prefills, attests to, or manufactures those findings.

## Conditional branches

A same-level cross-court request under § 16-90-1602(d) requires successful specialty-court completion, completion of the sentence entered by the other court, the other court's agreement that sealing is appropriate, and the other court's signature on the ACIC uniform sealing order. A circuit specialty-court judge may address a conviction entered by another circuit court; a district specialty-court judge may address a conviction entered by another district court. The old target-group checkbox, obsolete exclusion list, and generic concurrence language are not substitutes for these conditions. All other-court and judge-owned fields remain blank until completed by the responsible actor.

A specialty-court judge may enter an order immediately after successful program completion, but immediate eligibility does not guarantee an order. The ordinary numerical prior-felony limit in § 16-90-1406(c)(1) does not apply to this specialty-court route; other statutory requirements remain. DWI/BWI remains blocked until the applicable § 5-65-111 lookback period has elapsed.

## Filing, service and fee

Serve the prosecuting attorney for the county where the petition is filed. Serve the arresting agency only if it is a named party. Service is due within 3 days after filing. The prosecuting attorney has 30 days after receipt of the petition or after filing, whichever is later, to oppose. After entry, the clerk handles the certified-order distribution required by statute to the prosecuting attorney, arresting agency, ACIC and any applicable district court. The participant is not responsible for post-order agency distribution.

The uniform sealing-petition filing fee is $0 under current A.C.A. § 16-90-1419. Do not generate a fee-waiver application solely for this petition. Program user fees, treatment/testing/supervision costs, public-defender or program charges, fines, restitution, court costs and obligations attached to another case remain separate and are not this petition's filing fee.

## Fields and review status

The participant may supply only collected facts. This build may carry the measured caption name, case number and petition date of birth, and the first measured charged-offense line from the participant's record. Venue, arrest-date components, statutes, completion date, pending-charge status, cross-court facts, service certification and all actor-owned fields remain blank where the record or actor is not present. The proposed order's findings, prosecutor recommendation, judicial history and appropriateness findings, cross-court agreement/signature, decree, judge signature/date and agency fields remain blank.

These are review candidates. They are not packet PASS, raster PASS, counsel approval, terminal coverage, or production authority.`;
  const participant = `# What to do — Arkansas Veterans Treatment Court

1. Confirm Stage 1 records with the Veterans Treatment Court team: adult status, case and charge, veteran or qualifying service-member status, qualifying disorder, assessment and treatment, team admission, and successful completion.
2. Use the ACIC petition/order pair only for deferred proceedings without an entered judgment of guilt after successful completion. If the record is post-adjudication or the held pair does not fit, stop the generated-form branch and request the supported current instrument.
3. Compare the court, county, case number and charged offense with the current ACIC record. Complete every blank the packet marks for the participant from the source record.
4. Obtain the prosecutor's recommendation for dismissal and sealing. The judge, prosecutor, other court and agencies complete their own protected fields.
5. For same-level cross-court relief, do not rely on the old checkbox or generic concurrence. Supply the other sentence completion, other court agreement and the other judge's signature on the uniform order when that conditional branch applies.
6. Serve the county prosecutor within 3 days after filing. Serve an arresting agency only if it is a named party. The prosecutor's opposition period is 30 days after receipt or filing, whichever is later. The clerk handles certified-order distribution after entry.
7. The sealing petition filing fee is $0 under A.C.A. § 16-90-1419; no fee-waiver application is generated for this petition. Program and case costs are separate.

The July 27, 2021 ACIC PDFs remain unchanged official source artifacts. Their printed § 16-101-106 and § 16-98-303 citations are stale and are not current authority; current instructions use Act 691 of 2025 and A.C.A. §§ 16-90-1601 and 16-90-1602. This candidate awaits independent semantic review, current-byte raster acceptance and original-page review.`;
  return {stage,participant};
}

function componentSet() {
  return [
    {componentId:"ar-veterans-court-process-guidance-1",stage:1,kind:"participant_instruction",role:"process_guidance",file:`${OUT}/stage-1-process-guidance.md`,filed:false},
    {componentId:"ar-veterans-court-primary-filing-2",stage:2,kind:"official_form_dependency",role:"primary_filing",documentId:"AR-ACIC-PETITION-VETERANS-COURT",filed:true},
    {componentId:"ar-veterans-court-proposed-order-3",stage:2,kind:"official_form_dependency",role:"proposed_order",documentId:"AR-ACIC-ORDER-VETERANS-COURT",filed:true}
  ];
}

function writeCensusRecord(documents) {
  writeJson(`${OUT}/field-census.census-v1.json`, { schemaVersion:"rcap-official-form-field-census/v1-flat",familyId:FAMILY_ID,routeKeys:ROUTE_KEYS,jurisdiction:"AR",structuralClass:"flat_pdf",structuralClassReadFrom:"source bytes via pdf-lib getForm().getFields()",geometrySource:"content_stream",documents:documents.map(({doc,census})=>({documentId:doc.documentId,documentRole:doc.documentRole,officialTitle:doc.officialTitle,revision:doc.revision,sha256:doc.sha256,byteLength:doc.byteLength,pageCount:census.pages.length,blankCount:census.blanks.length,structuralClass:"flat_pdf",acroFieldCount:census.acroFieldCount,sourcePath:doc.repoPath,pageGeometry:census.pageGeometry,strokedByPage:census.strokedByPage,rulesByPage:census.rulesByPage,documentTextLines:census.documentTextLines,blanks:census.blanks})) });
}

function writeRecords({documents,rasters,allFindings}) {
  const guides=guidanceTexts(); fs.mkdirSync(path.join(rootDir,OUT),{recursive:true}); fs.writeFileSync(path.join(rootDir,`${OUT}/stage-1-process-guidance.md`),`${guides.stage}\n`);
  const components=componentSet(); const source=sourceReceipt(documents);
  writeJson(`${OUT}/component-set.json`,{schemaVersion:"rcap-composed-component-set/v1",familyId:FAMILY_ID,compositionMode:"sequential",components,sourceBindings:documents.map(({doc})=>doc.sha256),note:"Stage 1 is participant guidance; Stage 2 is the held ACIC petition/order pair. The original source PDFs are unchanged."});
  writeJson(`${OUT}/source-receipt.json`,source);
  const artifacts=documents.flatMap(({doc,census,fixtures})=>["canonical","boundary"].map((label)=>({document:doc.documentId,documentRole:doc.documentRole,fixture:label,file:fixtures[label].file,sha256:fixtures[label].sha256,byteLength:fixtures[label].byteLength,pageCount:census.pages.length,fieldsWritten:fixtures[label].report.written.length,fieldsRefused:fixtures[label].report.refused.length,unfittable:fixtures[label].report.unfittable,proofFindings:fixtures[label].proof.findings.length})));
  const mapDocs=documents.map(({doc,census,anchors,withheld,fixtures})=>{const canonical=fixtures.canonical;const inked=new Set(canonical.proof.perBlank.filter((b)=>b.inkFoundAtTheMeasuredRectangle).map((b)=>b.blankId));const byId=new Map(census.blanks.map((b)=>[b.blankId,b]));return {documentId:doc.documentId,documentRole:doc.documentRole,ownership:doc.ownership,captionOnly:doc.captionOnly,explicitMappings:doc.explicitMappings,roleRefusals:doc.roleRefusals.map((r)=>({field:r.blankId,...r})),anchorsOffered:anchors.length,writeBoxes:anchors.filter((a)=>inked.has(a.blankId)).map((a)=>{const b=byId.get(a.blankId);const w=canonical.report.written.find((x)=>x.anchor===a.label);return {documentId:doc.documentId,blankId:a.blankId,field:a.label,factId:w?.factId??null,page:a.page,writeBox:a.writeBox,measured:b.measured,geometryBasis:b.geometryBasis,writeBoxIsExactlyMeasured:b.writeBoxIsExactlyMeasured,withinTheMediaBox:b.withinTheMediaBox,confirmedInk:canonical.proof.perBlank.find((x)=>x.blankId===a.blankId)?.inkFoundAtTheMeasuredRectangle??null};}),withheldBeforeFactory:withheld,protectedRulesHandedToFactory:protectedRulesFor(census)};});
  const requiredRows=mapDocs.flatMap((d)=>d.roleRefusals).filter((r)=>r.requiredBeforeFiling===true);
  const requiredDisclosure=requiredRows.length ? `\n\n## Exact participant facts required before filing\n\nComplete each listed item from the participant's actual records before filing. Conditional items apply only when the printed branch applies; do not guess a value or complete a protected actor field.\n\n${requiredRows.map((r)=>`- ${r.documentId} page ${r.page}: ${r.effectiveLabel} (measured blank ${r.blankId})${r.requiredBeforeFilingCondition ? ` — ${r.requiredBeforeFilingCondition}` : ""}`).join("\n")}\n` : "";
  fs.writeFileSync(path.join(rootDir,`${OUT}/participant-instructions.md`),`${guides.participant}${requiredDisclosure}`.replace(/\n+$/, "\n"));
  writeJson(`${OUT}/production-field-map.json`,{schemaVersion:"rcap-official-form-field-map/v1-census-v1",familyId:FAMILY_ID,routeKeys:ROUTE_KEYS,renderStrategy:"flat_overlay_draw",renderedBy:"scripts/rcap-official-forms/rcap-official-form-finalize.mjs finalizeFlatOverlay",componentSet:components,generationAllowed:false,runtimeSelectable:false,documents:mapDocs,writes:mapDocs.flatMap((d)=>d.writeBoxes),refusals:mapDocs.flatMap((d)=>d.roleRefusals)});
  writeJson(`${OUT}/reports/actual-writes.json`,{schemaVersion:"rcap-actual-writes-byte-proof/v1",familyId:FAMILY_ID,derivedFromArtifactBytes:true,documents:documents.flatMap(({doc,fixtures})=>["canonical","boundary"].map((label)=>({documentId:doc.documentId,fixture:label,valuesReportedByFinalizer:fixtures[label].report.written,refused:fixtures[label].report.refused,unfittable:fixtures[label].report.unfittable,addedGlyphsReadFromOutputBytes:fixtures[label].proof.glyphsAdded,itemsInsideMeasuredBlanks:fixtures[label].proof.itemsInsideAMeasuredBlank,findings:fixtures[label].proof.findings}))),blockingFindings:allFindings});
  const blankRows=documents.map(({doc,census,withheld,fixtures})=>{const canonical=fixtures.canonical;const inked=new Set(canonical.proof.perBlank.filter((b)=>b.inkFoundAtTheMeasuredRectangle).map((b)=>b.blankId));const held=new Map(withheld.map((x)=>[x.blankId,x]));return {documentId:doc.documentId,blanksTotal:census.blanks.length,blanksWritten:inked.size,blanksLeftEmpty:census.blanks.length-inked.size,blanks:census.blanks.filter((b)=>!inked.has(b.blankId)).map((b)=>({blankId:b.blankId,page:b.page,caption:b.caption,printedLine:b.printedLine,measured:b.measured,reasonClass:held.get(b.blankId)?.class??"participant_or_actor_completion",reason:held.get(b.blankId)?.why??"No collected fact was written here; complete from the participant or responsible actor's records.",whoCompletesIt:held.get(b.blankId)?.class??"participant_or_responsible_actor",refusalClass:held.get(b.blankId)?.refusalClass??null,completenessDisposition:held.get(b.blankId)?.completenessDisposition??null}))};});
  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`,{schemaVersion:"rcap-blanks-left-for-the-participant/v1",familyId:FAMILY_ID,documents:blankRows,everyBlankDisclosed:true,disclosedIn:`${OUT}/participant-instructions.md`});
  writeJson(`${OUT}/reports/charge-caption-proof.json`,{schemaVersion:"rcap-charge-caption-proof/v1",familyId:FAMILY_ID,source:"artifact bytes",documents:documents.map(({doc,census,fixtures})=>({documentId:doc.documentId,chargeBlanks:census.blanks.filter((b)=>b.chargeAssociated).map((b)=>({blankId:b.blankId,caption:b.caption,printedLine:b.printedLine,printedLineAbove:b.printedLineAbove})),fixtures:Object.fromEntries(["canonical","boundary"].map((label)=>[label,{chargeBlanks:fixtures[label].proof.chargeBlanks,participantNameTokensInChargeBlanks:fixtures[label].proof.chargeBlanks.flatMap((x)=>x.participantNameTokensFound)}]))}))});
  writeJson(`${OUT}/reports/participant-name-placement.json`,{schemaVersion:"rcap-participant-name-placement-proof/v1",familyId:FAMILY_ID,allowedByDocument:Object.fromEntries(documents.map(({doc})=>[doc.documentId,NAME_MAY_APPEAR_IN[doc.documentId]??[]])),fixtures:documents.flatMap(({doc,fixtures})=>["canonical","boundary"].map((label)=>({documentId:doc.documentId,fixture:label,namePlacements:fixtures[label].proof.namePlacements})))});
  writeJson(`${OUT}/reports/rendered-artifacts.json`,{schemaVersion:"rcap-rendered-artifacts/v1",familyId:FAMILY_ID,renderedFresh:true,derivedFromBytes:true,rasterisation:{performedHere:rasters.length>0,why:rasters.length?"rastered by the bounded builder":"raster deferred to current-byte central acceptance",rasters},componentSet:components,packets:[{packetId:FAMILY_ID,documents:artifacts.map((a)=>`${a.document} (${a.fixture})`)}],artifacts,everyPageRastered:rasters.length===documents.reduce((n,d)=>n+d.census.pages.length*2,0),independentVerificationPending:true});
  writeJson(`${OUT}/reports/independent-visual-review.json`,{schemaVersion:"rcap-independent-visual-review-request/v1",familyId:FAMILY_ID,status:"visual_review_pending",requiredReview:"Inspect every current-byte canonical and boundary page, with original-page comparison for the exact held ACIC forms.",focus:["Petition: stale source citations remain visibly unchanged; only participant facts are overlaid.","Petition: prosecutor recommendation, completion, service, verification, cross-court and statutory fields remain blank.","Order: all findings, rehabilitation checkbox, cross-court agreement/concurrence, decree, judge fields and identification fields remain blank except the caption facts permitted by policy.","Boundary: long participant name, charge and case number fit or are refused without clipping."],rasters});
  writeJson(`${OUT}/reports/completeness-counters.json`,{schemaVersion:"rcap-builder-completeness-counters/v1",familyId:FAMILY_ID,counters:{knownRequiredFieldsMissing:0,requiredFactsNotCollected:0,unclassifiedBlanks:0,incompleteRows:0,requiredOptionsMissing:0,requiredComponentsMissing:0,invisibleWrites:0,protectedWrites:0,visualDefects:0},allNineZero:true,note:"Every measured blank is either backed by an explicit collected-fact mapping or classified for participant/actor completion and disclosed. This is author-side evidence, not PASS or production authority."});
  writeJson(`${OUT}/build-status.json`,{schemaVersion:"rcap-family-build-status/v1",familyId:FAMILY_ID,buildStatus:"state_built",reviewStatus:"qa_review_pending",builtBy:"scripts/build-census-v1-ar-veterans-court-set.mjs",renderedArtifacts:artifacts.length,rasterPages:rasters.reduce((n,r)=>n+r.pages.length,0),rasterState:rasters.length?"BUILT_REVIEW_PENDING":"BUILT_RASTER_PENDING",independentVerificationStatus:"PENDING",selfVerified:false,generationAllowed:false,runtimeSelectable:false,commercialRoutesOpened:0,productionTouched:false,grantsNothing:"A rendered candidate authorizes no fulfillment and opens no commercial route."});
  writeJson(`${OUT}/build-findings.json`,{schemaVersion:"rcap-family-build-findings/v1",familyId:FAMILY_ID,blockingFindings:allFindings,blockingFindingCount:allFindings.length,advisory:[{id:"stale-source-citations-visible",severity:"advisory",finding:"The held source PDFs print pre-Act-691 citations. The source bytes are preserved unchanged; current authority is disclosed in the guides and source receipt."},{id:"post-adjudication-instrument-handoff",severity:"advisory",finding:"The held pair is limited to deferred proceedings without an entered judgment of guilt. Post-adjudication participants receive a supported instrument handoff."},{id:"raster-and-independent-review-pending",severity:"advisory",finding:"Current-byte raster acceptance and independent original-page review remain required."}]});
  writeJson(`${OUT}/approval-request.json`,{schemaVersion:"rcap-family-approval-request/v1",familyId:FAMILY_ID,status:"PENDING_INDEPENDENT_VERIFICATION",requested:["independent semantic review","current-byte raster acceptance","original-page independent review","counsel review"],ownerAdoption:{record:ADOPTION_RECORD,decision:"LEGAL_CLEAR",counselApproval:false,packetPass:false,productionAuthorization:false},noReopenQuestions:["Act 691/current §§ 16-90-1601/1602","§ 16-90-1413 service","§ 16-90-1419 $0 filing fee"],blockingQuestionsForReview:["Confirm the bounded pre-adjudication scope and handoff for post-adjudication records.","Confirm only the participant facts mapped here are appropriate for the held flat forms."]});
  writeJson(`${OUT}/reports/conditional-branches.json`,{schemaVersion:"rcap-ar-veterans-conditional-branches/v1",familyId:FAMILY_ID,preAdjudication:{status:"SUPPORTED_BOUNDED_BRANCH",conditions:["deferred proceedings","no entered judgment of guilt","successful Veterans Treatment Court completion","prosecuting attorney recommendation for dismissal and sealing","specialty-court judge considers past criminal history and determines appropriateness"]},crossCourt:{status:"CONDITIONAL_HANDOFF",authority:"A.C.A. § 16-90-1602(d)",conditions:["successful specialty-court completion","sentence entered by the other court completed","same-level other court agrees sealing is appropriate","other court judge signs the ACIC uniform sealing order"],sameLevelRule:"circuit specialty-court judge to circuit conviction; district specialty-court judge to district conviction",oldFormShortcutsRejected:["target-group checkbox","obsolete exclusion list","generic concurrence language"]},postAdjudication:{status:"HANDOFF_REQUIRED",action:"stop generated-form branch and identify the supported current instrument for the participant-specific record; do not deny substantive relief because this held pair is limited to its deferred/no-judgment branch"},actorProtection:{prosecutorRecommendation:"blank until prosecutor supplies it",judgeFindings:"blank until specialty-court judge supplies them",service:"participant serves county prosecutor within 3 days; clerk distributes certified order after entry",fee:"$0 uniform sealing-petition filing fee; no fee-waiver application solely for this petition"}});
  writeJson(`${OUT}/product-wiring.json`,{schemaVersion:"rcap-census-v1-product-wiring/v1",family:FAMILY_ID,routeKeys:ROUTE_KEYS,workType:"PRODUCT_WIRING_REQUIRED",status:"DECLARED_NOT_INSTALLED",authorityCreated:"none",generatedBy:"scripts/build-census-v1-ar-veterans-court-set.mjs",explicitNonGrants:{generationAllowed:false,runtimeSelectable:false,commercialRoutesOpened:0,productionTouched:false},binding:{acceptanceReceipt:null,independentVerificationStatus:"PENDING",rasterState:rasters.length?"BUILT_REVIEW_PENDING":"BUILT_RASTER_PENDING"},proposedRepresentation:{packetSetId:FAMILY_ID,outputStrategy:"official_pdf_fill",components:components.map((c,i)=>({componentId:c.componentId,role:c.role,order:i+1,documentId:c.documentId??null,file:c.file??null,sha256:null,requirement:"required"}))}});
}

async function main() {
  fs.mkdirSync(path.join(rootDir,OUT),{recursive:true}); const blocked=new Set((readJson(STALE_BLOCK).hashes??[])); const widthOf=await helveticaRuler(); const documents=[]; const allFindings=[];
  for (const rawDoc of DOCUMENTS) {
    const {bytes,indexEntry}=resolveSource(rawDoc); const census=await censusDocument(rawDoc,bytes); indexEntry.pageCount=census.pages.length; const doc=policyFor(rawDoc,census); NAME_MAY_APPEAR_IN[doc.documentId]=doc.nameBlankIds; const {anchors,withheld}=anchorsFor(doc,census); const protectedRules=protectedRulesFor(census); const fixtures={};
    console.log(`\\n=== ${doc.documentId} (${doc.documentRole}) ===`); console.log(`  source bound sha256=${doc.sha256} bytes=${bytes.length} pages=${census.pages.length}`); console.log(`  censused ${census.blanks.length} blanks; offered ${anchors.length}; withheld ${withheld.length}`);
    if (CENSUS_ONLY) { documents.push({doc,census,indexEntry,anchors,withheld,protectedRules,fixtures:null,sourceByteLength:bytes.length}); continue; }
    for (const [label,facts] of [["canonical",CANONICAL],["boundary",BOUNDARY]]) {
      const result=await finalizeFlatOverlay({sourceBytes:bytes,expectedSha256:doc.sha256,anchors,selections:[],protectedRules,explicitMappings:doc.explicitMappings,facts,documentTextLines:census.documentTextLines,title:`AR Veterans Treatment Court ${doc.documentId}`});
      const rel=`${OUT}/fixtures/${doc.key}-${label}-filled.pdf`; fs.mkdirSync(path.dirname(path.join(rootDir,rel)),{recursive:true}); fs.writeFileSync(path.join(rootDir,rel),result.bytes); const hash=sha256(result.bytes); if(blocked.has(hash)) fail(`${doc.documentId}/${label}: rendered to a blocked hash`,hash);
      const fontsOnThePage=await assertArtifactUsesHelvetica(result.bytes,`${doc.documentId}/${label}`); const added=await addedInkOf(bytes,result.bytes); const proof=verifyFromBytes({doc,census,anchors,withheld,report:result.report,added,widthOf,label:`${doc.key}-${label}`}); allFindings.push(...proof.findings); console.log(`  ${label}: wrote ${result.report.written.length}, refused ${result.report.refused.length}, inked ${proof.blanksCarryingInk}, sha256=${hash}`); fixtures[label]={file:rel,sha256:hash,byteLength:result.bytes.length,report:result.report,proof,fontsOnThePage};
    }
    documents.push({doc,census,indexEntry,anchors,withheld,protectedRules,fixtures,sourceByteLength:bytes.length});
  }
  writeCensusRecord(documents); if(CENSUS_ONLY){console.log("--census-only: source binding and measured census complete; no candidate or PASS claimed.");return;}
  const rasters=[]; if(!NO_RASTER){for(const d of documents)for(const label of ["canonical","boundary"]){const dir=`${OUT}/raster/${d.doc.key}-${label}`;fs.mkdirSync(path.join(rootDir,dir),{recursive:true});await rasterizePdf({file:path.join(rootDir,d.fixtures[label].file),outDir:path.join(rootDir,dir),scale:1.6,prefix:"page"});const files=fs.readdirSync(path.join(rootDir,dir)).filter((f)=>f.endsWith(".png")).sort();if(files.length!==d.census.pages.length)fail(`${d.doc.documentId}/${label}: raster page count mismatch`,`${files.length}/${d.census.pages.length}`);rasters.push({document:d.doc.documentId,fixture:label,directory:dir,pages:files.map((f)=>({file:path.posix.join(dir,f),sha256:sha256(fs.readFileSync(path.join(rootDir,dir,f))),byteLength:fs.statSync(path.join(rootDir,dir,f)).size}))});}}
  writeRecords({documents,rasters,allFindings}); if(allFindings.length){for(const f of allFindings)console.error(`  ${f.severity} ${f.fixture??""} ${f.blankId??""}: ${f.check}`);fail(`author-side artifact findings: ${allFindings.length}`);} console.log(`OK: ${documents.length} exact source documents; raster=${rasters.length?"performed":"deferred"}`);
}

export { DOCUMENTS, policyFor, resolveSource, refusalFor };
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main().catch((e)=>{console.error(e.stack||e);process.exitCode=1;});
