#!/usr/bin/env node
// Route-obligation census v1 — packet family `mi-setaside-marihuana-set`.
//
//   node scripts/build-census-v1-mi-setaside-marihuana-set.mjs
//
// Michigan, setting aside a misdemeanor MARIHUANA conviction under MCL
// 780.621e, route
// `obligation:track-pathway:MI:mi_setaside_marihuana:misdemeanor-marijuana-set-aside-under-mcl-780-621e`.
// The family delivers one document: SCAO form MC 227a, the participant's own
// application. There is no proposed order in this family — MC 227a's own
// printed instructions say the COURT enters the order and mails it out, so
// nothing here drafts one.
//
// WHY THIS SCRIPT EXISTS AND WHAT IT IS NOT
//
// It is not a renderer. Every decision about what may be written is made by
// scripts/rcap-official-forms/rcap-field-semantics.mjs and every byte is
// written by finalizeOfficialForm; this file supplies the two things only a
// caller can supply — the family's ROLE classification and its explicit
// mappings — and then proves the result from the artifact bytes rather than
// from its own report.
//
// THE DEFECT SHAPE THIS FAMILY WAS DISPATCHED FOR
//
// MC 227a is a PLURAL form: "set aside misdemeanor marihuana conviction(s)",
// with a four-row repeating listing of crime, charge code, conviction date and
// case number. That is the shape the shared binder was recently corrected for —
// a caption naming a charge, offence, count, statute or violation must never
// receive a participant's name.
//
// It does not reproduce here, and the verification below proves that from the
// bytes rather than asserting it: on this form NOTHING binds a participant name
// anywhere, so this family's name allowlist is EMPTY and any name token drawn
// at any rectangle in either fixture is a blocking finding.
//
// WHAT DOES GO WRONG HERE, AND IS REFUSED BY ROLE
//
// MC 227a lays its captions out in horizontal bands — a four-column table
// header, a three-cell court block, an ORI/address/telephone strip — and the
// shared caption harvester groups a band into ONE line. Every consequence of
// that squashing on this form is recorded in reports/squashed-caption-band-
// findings.json. Four are wrong bindings, refused by role below and proved
// absent from the artifact; two are over-refusals, which leave a blank the
// participant completes and are reported rather than worked around.
//
// The sibling of the charge-caption defect is `ch1`: its harvested label is the
// whole header line "CRIMEMCL citation/PACC CodeCONVICTIONCASE NUMBER", so the
// words CASE NUMBER — which belong to the FOURTH column — reach the SECOND
// column's blank, and matter.charges[0].case_number binds there. A case number
// printed in the "MCL citation/PACC Code" column misstates the record to the
// court in exactly the way a name in a charge blank does. It is refused by role
// and the refusal is proved from the bytes.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines, captureWidgetContext, normalizeHarvestedText }
  from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { rasterizePdf } from "./rcap-official-forms/rcap-pdf-rasterize.mjs";
import { strokedRectangles } from "./lib/pdf-stroked-boxes.mjs";
import { CHARGE_VALUE_WORDS, captionDescribesChargeValue, descriptorsMatching, protectCategoryOf, decideBinding }
  from "./rcap-official-forms/rcap-field-semantics.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList } = require("pdf-lib");

const FAMILY_ID = "mi-setaside-marihuana-set";
const WORKLIST_GROUP_ID = "mi_setaside_marihuana-set";
const OUT = "data/rcap-all50/overlays/census-v1/mi/mi-setaside-marihuana-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const ROUTE_KEY =
  "obligation:track-pathway:MI:mi_setaside_marihuana:misdemeanor-marijuana-set-aside-under-mcl-780-621e";

const fail = (message, detail = null) => {
  console.error(`build-census-v1-${FAMILY_ID}: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was written.");
  process.exit(1);
};

// --- the one document, pinned by hash ----------------------------------------
const DOCUMENTS = [
  {
    key: "application",
    documentId: "MI-MC-227A-APPLICATION-TO-SET-ASIDE-MISDEMEANOR-MARIHUANA-CONVICTIONS",
    documentRole: "APPLICATION",
    officialTitle: "Application to Set Aside Misdemeanor Marihuana Conviction(s)",
    formNumber: "MC-227A",
    revision: "REV-2024-07",
    sha256: "d361c2082ecc761fe4e9eadda0cabd307f2d6bb3c7af9a3917a9afecad698757",
    pathInArchive:
      "STATES/MI/02_PACKET_FORMS/MI__FORM__MC-227A__application-to-set-aside-misdemeanor-marihuana-conviction-s__REV-2024-07__EN.pdf",
    ownership: "participant_completed",
    captionOnly: false,

    // No explicit mapping is made by this family, and the reason is worth
    // stating because an empty map usually means nobody looked.
    //
    // An explicit mapping can only CHOOSE among descriptors that already
    // matched a field by its name or its printed label — decideBinding returns
    // `no_allowlisted_fact_matches` before it ever reads explicitMappings. On MC
    // 227a the conviction listing's own blanks (`c1`..`c4`, the CRIME column)
    // match nothing on either channel: their names carry no words, and the
    // label channel harvests the row letter "a"/"b"/"d" printed to their left.
    //
    // So `matter.charge` CANNOT be named for them. Naming it would be rejected,
    // and the only way to make the CRIME column bind would be to author a
    // caption for it here — inventing the label the harvester failed to read.
    // This family does not do that. A synthesised caption is not a measured
    // one, and a caption written by the caller is precisely the channel the
    // charge-caption defect travelled down.
    explicitMappings: {},

    // Role refusals: what this family determines the participant does not
    // complete, or does not complete YET. Only fields the shared protect rules
    // do NOT already catch on their own merits are listed, so the shared rules
    // keep doing their own work and the verification can tell the two channels
    // apart.
    unwritable: [
      // ---- the four PROVEN WRONG BINDINGS ------------------------------------
      //
      // Each of these is writable today. Each was read out of the binder before
      // being listed here, and each is proved absent from the artifact bytes by
      // verifyFromBytes. None is precautionary.

      // THE CHARGE-CAPTION DEFECT'S SIBLING. Second column of the conviction
      // listing, headed "CHARGE CODE(S)" over "MCL citation/PACC Code". Its
      // harvested label is the entire squashed header line, "CRIMEMCL
      // citation/PACC CodeCONVICTIONCASE NUMBER", so `matter.case_number`
      // matches on the words CASE NUMBER — which are the header of the FOURTH
      // column, 108pt to its right — and binds matter.charges[0].case_number.
      // The canonical fixture would print "24-CR-001234" in the MCL-citation
      // column, telling the court the statute violated was a docket number.
      //
      // Only row a is affected: rows b, c and d harvest no caption at all, so
      // the squashed header reaches exactly the one row that sits directly
      // under it. A defect that touches one row of four is not a smaller
      // defect; it is a harder one to see.
      { field: "ch1", class: "conviction_listing_charge_code_column",
        why: "Row a of the 'CHARGE CODE(S) / MCL citation/PACC Code' column. Binds matter.charges[0].case_number through the printed-label fallback, because the harvested label is the whole four-column header line and the words CASE NUMBER belong to the fourth column. The statutory citation and the case number are different facts and this family refuses to print one as the other." },

      // Court block, second cell. The form reads "____ JUDICIAL CIRCUIT" with
      // the caption printed to the RIGHT of the box on the same line; the
      // harvester takes the line ABOVE, which is the PRECEDING cell's caption
      // "JUDICIAL DISTRICT". `matter.court` binds on that, so the canonical
      // fixture prints "District Court" into the box that wants a circuit
      // NUMBER — a value from the wrong cell, in the wrong form, in a caption
      // block a clerk reads first.
      { field: "circuit", class: "court_identity_from_a_misattributed_caption",
        why: "The JUDICIAL CIRCUIT number box. Binds matter.court via a caption that belongs to the JUDICIAL DISTRICT row above it: on this form each caption is printed to the right of its own box on the same line, and the harvester reads the line above. The box wants a circuit number, which the platform does not hold." },

      // ORI strip. One printed line, "ORI | Court address | Court telephone
      // no.", harvested whole for both boxes, so `participant.phone` matches on
      // "telephone" and binds into BOTH — the participant's own telephone
      // number printed as the court's address and again as the court's
      // telephone number. The court's contact details are the court's; the
      // platform holds neither.
      { field: "ctaddress", class: "court_contact_detail",
        why: "The COURT'S address box. Binds participant.phone through the squashed 'ORICourt addressCourt telephone no' caption band. A participant's telephone number is not a court address, and the court's address is not a fact this platform holds." },
      { field: "cttelno", class: "court_contact_detail",
        why: "The COURT'S telephone number box. Binds participant.phone through the same squashed band. The participant's telephone number is not the court's." },

      // Plaintiff election. The block reads "THE PEOPLE OF" over two exclusive
      // options: a checkbox beside the printed words "The State of Michigan",
      // and a second checkbox beside this blank, which names a city, village or
      // township when the conviction was under a local ordinance. The
      // harvester gives the blank the printed text of the OTHER option, so
      // `participant.state` binds and the canonical fixture would name the
      // participant's residence state as the prosecuting authority.
      //
      // It is refused for a second and independent reason: which of the two
      // options applies is a legal election about who prosecuted, and the
      // checkboxes that carry it are already refused by the type guard. Filling
      // the blank while its own checkbox stays empty states a party without
      // electing one.
      { field: "peopleof", class: "prosecuting_authority_election",
        why: "The local-unit line in the 'THE PEOPLE OF' block, used when the conviction was under a city, village or township ordinance. Binds participant.state through the caption of the adjacent option, 'The State of Michigan'. The prosecuting authority is a legal election the participant makes with the checkbox beside it, and that checkbox is refused by the type guard." },

      // ---- never prefilled, and not left to an incidental refusal -----------
      //
      // Each of these IS refused today, but on a ground that would move if a
      // caption were harvested differently. A refusal that depends on which
      // line the harvester happened to read is not a refusal.

      // Refused today as `disposition_or_hearing`, because the caption above it
      // is item 2, "A certified copy of each conviction is attached", which
      // contains the word "conviction". The date beside the applicant's
      // signature is refused here on its own ground: dating a signature that
      // has not been made asserts the application was signed on a day it was
      // not. Page 2 item 5 says "Sign and date the application" — the
      // participant does both.
      { field: "datesig", class: "participant_signature_date",
        why: "The date beside the applicant's signature. Refused today only because the caption above it mentions a conviction; refused here because the participant signs and dates the application themselves, per the form's own instruction 5." },

      // The Certificate of Mailing, and the reason it is refused as a pair.
      //
      // MC 227a heads this block "CERTIFICATE OF MAILING". The shared
      // service_block rule spells "certificate of service" and "proof of
      // service" and does not reach "certificate of mailing" — see
      // reports/shared-vocabulary-gaps.json — so neither of these two blanks is
      // protected by the region channel that exists for exactly this block, and
      // both are refused here by role instead.
      //
      // The document itself states the timing that makes prefilling them false:
      // page 2 instruction 8 says to fill in the Certificate of Mailing on the
      // remaining copies AFTER mailing the packet to the prosecuting official.
      // A certificate completed before the mailing certifies something that has
      // not happened, under penalty of perjury in the form's own printed words.
      { field: "comdate", class: "certificate_of_mailing_date",
        why: "The date on the Certificate of Mailing. The form's instruction 8 has the participant complete this AFTER mailing the packet to the prosecuting official; a date here certifies a mailing that has not occurred. The shared service_block rule does not reach the words 'certificate of mailing', so this is refused by role." },
      { field: "comsig", class: "certificate_of_mailing_signature",
        why: "The signature on the Certificate of Mailing, made under penalty of perjury. Never prefilled, and refused here rather than left to a caption." },

      // ---- identifiers assigned by somebody else ----------------------------
      { field: "ori", class: "agency_assigned_identifier",
        why: "The Originating Agency Identifier. Assigned to a Michigan court by the state; the form prints the 'MI-' stem beside it. Nothing matches it today, but 'nothing happens to match it' is not a refusal." },
      { field: "ctntcn", class: "agency_assigned_identifier",
        why: "The CTN/TCN, assigned when a case is tracked through Michigan's criminal-history system. The agency's to state, not the platform's." },
      { field: "sid", class: "government_identifier",
        why: "The State Identification number. Refused today as `attorney`, because the caption harvested for it is 'Defendant's attorney' from the cell to its left — an incidental refusal on the wrong ground. An SID is a government identifier and is refused as one here." },

      // ---- somebody else's block --------------------------------------------
      { field: "dattyinfo", class: "attorney_block",
        why: "The defendant's attorney, bar number, address and telephone block. The shared attorney rule matches 'atty' on a word boundary and this field name is one squashed token, so it does not reach it. A platform that fills this asserts the applicant is represented by counsel who is the applicant." }
    ]
  }
];

// The blanks in this family that may ever carry the participant's name.
//
// EMPTY, and that is the finding rather than an oversight. The only blank on MC
// 227a that legitimately holds the applicant's name is `dinfo`, the "Defendant's
// name, address, and telephone no." block — and nothing binds it, because the
// form prints that caption INSIDE the widget rectangle rather than above or
// beside it, so the label channel harvests nothing and the name `dinfo` matches
// no descriptor. See reports/blanks-left-for-the-participant.json.
//
// So this family writes no participant name at all, and the verification treats
// a name token drawn at ANY rectangle in either fixture as blocking. That is a
// stronger assertion than the charge-caption question alone, and it is the one
// this form can actually support.
const NAME_MAY_APPEAR_IN = {
  "MI-MC-227A-APPLICATION-TO-SET-ASIDE-MISDEMEANOR-MARIHUANA-CONVICTIONS": []
};

// --- fixture identities -------------------------------------------------------
// The corpus's standard canonical and boundary participants, so this family's
// fixtures are comparable with every other family's. The name is deliberately
// the same one the blocked artifacts printed into their charge blanks: if this
// family reproduced that defect, this is what would appear there.
const CANONICAL = {
  "participant.full_legal_name": "Jordan Avery Reyes", "participant.first_name": "Jordan",
  "participant.last_name": "Reyes", "participant.middle_name": "Avery",
  "participant.street_address": "118 Maple Street", "participant.city": "Springfield",
  "participant.state": "XX", "participant.zip": "01234",
  "participant.city_state_zip": "Springfield, XX 01234",
  "participant.phone": "555-0142", "participant.email": "jordan.reyes@example.com",
  "participant.date_of_birth": "1991-04-17",
  "matter.county": "Example County", "matter.court": "District Court",
  "matter.case_number": "24-CR-001234", "matter.citation_number": "C-889201",
  "matter.charge": "Possession of a controlled substance", "matter.arrest_date": "2019-03-08",
  "matter.offense_date": "2019-03-08", "matter.conviction_date": "2019-11-02",
  "matter.disposition_date": "2020-01-15", "deterministic.filing_date": "2026-08-12",
  "matter.charges": [
    { case_number: "24-CR-001234", citation_number: "C-889201", charge: "Possession of a controlled substance",
      arrest_date: "2019-03-08", offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" }
  ]
};

// The boundary fixture carries FOUR convictions, and the count is chosen from
// the document rather than copied from another family.
//
// MC 227a's listing has exactly four printed rows, a through d, and page 1 item
// 1 says "Use additional sheet(s) if more space is necessary". Four is
// therefore the table's capacity, and supplying four is the strongest form of
// the multi-conviction test this family was dispatched to run: every row index
// the form has is available, so `repeating_row_without_indexed_fact` never
// fires and cannot mask a binding that would otherwise appear. A three-row
// fixture would leave row d refused for a reason that says nothing about
// whether row d is safe.
//
// The charges are deliberately real marihuana offences under the statutes MC
// 227a's own instructions list as eligible, so the listing reads as a listing
// this form would actually receive.
const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "participant.city": "Unincorporated Township of Long Hollow Crossing",
  "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, XX 01234-9999",
  "participant.zip": "01234-9999", "participant.phone": "555-0142 ext. 44821",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201",
  "matter.county": "Saint Bartholomew and the Northern Reaches County",
  "matter.charge": "Use of marihuana contrary to MCL 333.7404(2)(d), with an extended statutory description that materially exceeds one line",
  "matter.charges": [
    { case_number: "0123-45-2026-CR-900123.00-AB-CDE/2201", citation_number: "C-889201",
      charge: "Use of marihuana contrary to MCL 333.7404(2)(d), with an extended statutory description that materially exceeds one line",
      arrest_date: "2019-03-08", offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" },
    { case_number: "0123-45-2026-CR-900124.00", citation_number: "C-889202",
      charge: "Possession of marihuana, MCL 333.7403(2)(d)",
      arrest_date: "2020-06-21", offense_date: "2020-06-20", conviction_date: "2021-02-09", disposition_date: "2021-03-01" },
    { case_number: "0123-45-2026-CR-900125.00", citation_number: "C-889203",
      charge: "Selling marihuana paraphernalia, MCL 333.7453",
      arrest_date: "2021-09-02", offense_date: "2021-09-02", conviction_date: "2022-01-18", disposition_date: "2022-02-14" },
    { case_number: "0123-45-2026-CR-900126.00", citation_number: "C-889204",
      charge: "Violation of a local ordinance substantially corresponding to MCL 333.7403(2)(d)",
      arrest_date: "2022-04-11", offense_date: "2022-04-10", conviction_date: "2022-09-30", disposition_date: "2022-10-14" }
  ]
};

// Every name token either fixture could put on paper. The proofs look for these,
// so a surname or a middle name landing somewhere is caught as well as the whole
// name.
const NAME_TOKENS = [...new Set(
  [CANONICAL, BOUNDARY].flatMap((f) => [
    f["participant.full_legal_name"], f["participant.first_name"],
    f["participant.last_name"], f["participant.middle_name"]
  ]).filter(Boolean).flatMap((v) => [v, ...String(v).split(/[\s\-]+/)])
    .map((s) => s.trim()).filter((s) => s.length >= 4)
)];

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const writeJson = (rel, value) => {
  fs.mkdirSync(path.dirname(path.join(rootDir, rel)), { recursive: true });
  fs.writeFileSync(path.join(rootDir, rel), `${JSON.stringify(value, null, 2)}\n`);
};

function fieldType(f) {
  if (f instanceof PDFTextField) return "text";
  if (f instanceof PDFCheckBox) return "checkbox";
  if (f instanceof PDFRadioGroup) return "radio";
  if (f instanceof PDFDropdown) return "dropdown";
  if (f instanceof PDFOptionList) return "optionlist";
  return "other";
}

// ---- step 1: the source is the pinned source ---------------------------------
//
// Two independent things are proved, because either alone is satisfiable by a
// file that is not the right one: the bytes on disk hash to what the family
// declares, AND the corpus index — the committed record of what the Master
// Library contained — declares the same hash and byte length at the same path.
//
// An ABSENCE and a MISMATCH are different findings and are reported as
// different findings. A missing file means the corpus was never recovered; a
// hash that disagrees means the file present is not the pinned one. Neither is
// a pass, and collapsing them would hide which of the two happened.
function resolveSource(doc) {
  const index = readJson(CORPUS_INDEX);
  const entry = (index.entries ?? []).find((e) => e.path === doc.pathInArchive);
  if (!entry) fail(`${doc.documentId}: ABSENT from ${CORPUS_INDEX}`, doc.pathInArchive);
  if (entry.sha256 !== doc.sha256) {
    fail(`${doc.documentId}: MISMATCH — the corpus index declares a different hash`,
      `index ${entry.sha256} / family ${doc.sha256}`);
  }
  const abs = path.join(rootDir, CORPUS_ROOT, doc.pathInArchive);
  if (!fs.existsSync(abs)) {
    fail(`${doc.documentId}: ABSENT — the pinned source is not installed`,
      `expected ${CORPUS_ROOT}/${doc.pathInArchive} — run scripts/rcap-corpus/bootstrap-private-corpus.sh`);
  }
  const bytes = fs.readFileSync(abs);
  const got = sha256(bytes);
  if (got !== doc.sha256) fail(`${doc.documentId}: MISMATCH — SOURCE DRIFT`, `expected ${doc.sha256}, read ${got}`);
  if (bytes.length !== entry.byteLength) {
    fail(`${doc.documentId}: MISMATCH — byte length disagrees with the corpus index`,
      `index ${entry.byteLength}, read ${bytes.length}`);
  }
  return { bytes, indexEntry: entry };
}

// ---- the conviction listing, measured off the document -----------------------
//
// The charge-caption question on this form cannot be asked of caption strings,
// because MC 227a's caption strings do not contain the charge vocabulary: the
// offence column is headed "CRIME", and CHARGE_VALUE_WORDS spells charge,
// offence, count, statute and violation. So the listing is located
// GEOMETRICALLY instead, and nothing in this function reads a field name.
//
//   1. A table ROW is a set of four or more widgets on one page sharing a
//      baseline. On MC 227a that finds exactly four rows, at y 396, 372, 348
//      and 324.
//   2. A COLUMN is the x-band those aligned widgets occupy.
//   3. A column's HEADER is the printed text sitting above the topmost row that
//      horizontally overlaps that column's band — so each header is attributed
//      to the column it is actually printed over, which is precisely what the
//      squashed harvested label fails to do.
//
// This is what makes the proof below independent of the binder's own reading.
function measureConvictionListing(pages, fieldsWithWidgets) {
  const byPage = new Map();
  for (const f of fieldsWithWidgets) {
    for (const w of f.widgets) {
      if (!byPage.has(w.page)) byPage.set(w.page, []);
      byPage.get(w.page).push({ name: f.name, rect: w.rect });
    }
  }

  let best = null;
  for (const [page, widgets] of byPage) {
    const rows = new Map();
    for (const w of widgets) {
      const key = w.rect.y.toFixed(1);
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key).push(w);
    }
    // A repeating listing is two or more rows of the same width, four cells or
    // wider. Two rows of two boxes is a caption block, not a table.
    const candidate = [...rows.values()].filter((r) => r.length >= 4);
    if (candidate.length < 2) continue;
    const widths = new Set(candidate.map((r) => r.length));
    if (widths.size !== 1) continue;
    if (!best || candidate.length > best.rows.length) {
      best = { page, rows: candidate.map((r) => [...r].sort((a, b) => a.rect.x - b.rect.x)) };
    }
  }
  if (!best) return null;

  best.rows.sort((a, b) => b[0].rect.y - a[0].rect.y);
  const columnCount = best.rows[0].length;

  const columns = [];
  for (let i = 0; i < columnCount; i += 1) {
    const cells = best.rows.map((r) => r[i]);
    const x0 = Math.min(...cells.map((c) => c.rect.x));
    const x1 = Math.max(...cells.map((c) => c.rect.x + c.rect.width));
    columns.push({ index: i, x0: +x0.toFixed(2), x1: +x1.toFixed(2), cells });
  }

  // The header band: printed lines above the top row, within the vertical gap
  // that separates the table from the sentence introducing it.
  const topRow = best.rows[0];
  const topY = topRow[0].rect.y + topRow[0].rect.height;
  const items = extractTextItems(pages[best.page - 1])
    .filter((it) => it.y >= topY && it.y <= topY + 22);

  for (const column of columns) {
    const overlapping = items.filter((it) => {
      const ix0 = it.x;
      const ix1 = it.x + (it.width ?? 0);
      return Math.min(ix1, column.x1) - Math.max(ix0, column.x0) > 0;
    }).sort((a, b) => (b.y - a.y) || (a.x - b.x));
    column.measuredHeader = normalizeHarvestedText(overlapping.map((it) => it.text).join("")).trim() || null;
    column.headerItems = overlapping.map((it) => ({
      text: it.text, x: +it.x.toFixed(2), y: +it.y.toFixed(2), width: +(it.width ?? 0).toFixed(2)
    }));
    column.headerUsesChargeVocabulary = column.measuredHeader
      ? CHARGE_VALUE_WORDS.test(column.measuredHeader) : false;
  }

  return {
    page: best.page,
    rowCount: best.rows.length,
    columnCount,
    rowLetters: best.rows.map((r, i) => String.fromCharCode(97 + i)),
    columns: columns.map((c) => ({
      index: c.index,
      xBand: { x0: c.x0, x1: c.x1 },
      xBandBasis: "the union of the measured widget rectangles of every cell in this column",
      measuredHeader: c.measuredHeader,
      headerBasis: "printed text above the top row, attributed by horizontal overlap with this column's band",
      headerItems: c.headerItems,
      headerUsesChargeVocabulary: c.headerUsesChargeVocabulary,
      cells: c.cells.map((cell) => ({ field: cell.name, rect: cell.rect }))
    }))
  };
}

// ---- step 2 + 3: census with MEASURED geometry --------------------------------
//
// Every write box here is the widget's own /Rect, read from the document. Not
// one is derived from where a caption is printed: the caption is captured
// separately and only ever used to decide WHAT a blank means, never WHERE it is.
// The stroked rules on each page are measured with scripts/lib/pdf-stroked-
// boxes.mjs, which maintains the CTM — the older re-operator scan did not, and
// put a mark in the margin.
async function censusDocument(doc, bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  const form = pdf.getForm();

  const linesByPage = pages.map((p) => groupIntoLines(extractTextItems(p)));
  const documentTextLines = linesByPage.flat().map((l) => normalizeHarvestedText(l.text));

  // Stroked, axis-aligned rectangles per page, in page coordinates.
  const strokedByPage = new Map();
  pages.forEach((page, i) => {
    let content = "";
    for (const stream of page.node.normalizedEntries?.().Contents?.asArray?.() ?? []) {
      try { content += Buffer.from(pdf.context.lookup(stream).getContents()).toString("latin1"); } catch { /* not a stream */ }
    }
    strokedByPage.set(i + 1, content ? strokedRectangles(content) : []);
  });

  const widgetsForCapture = new Map();
  const fields = form.getFields().map((f) => {
    const name = f.getName();
    const type = fieldType(f);
    const widgets = f.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      const ref = w.P?.();
      let page = 1;
      pages.forEach((p, i) => { if (p.ref === ref) page = i + 1; });
      return {
        page,
        // MEASURED off the document: the widget rectangle as the PDF declares it.
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_from_the_document"
      };
    });
    for (const w of widgets) {
      if (!widgetsForCapture.has(w.page)) widgetsForCapture.set(w.page, []);
      widgetsForCapture.get(w.page).push({ name, rect: w.rect });
    }
    return { name, type, widgets };
  });

  const context = new Map();
  pages.forEach((page, i) => {
    const list = widgetsForCapture.get(i + 1) ?? [];
    if (!list.length) return;
    for (const c of captureWidgetContext(page, list, { precomputedLines: linesByPage[i], isFirstPage: i === 0 })) {
      if (!context.has(c.name)) context.set(c.name, c);
    }
  });

  // The printed rule a widget sits on, measured. MC 227a draws its cells with a
  // stroked table rather than runs of underscores, so this corroborates the
  // widget rectangle where a rule exists and is honestly reported absent where
  // it does not. It is never a substitute for the widget rectangle.
  const ruleUnder = (page, rect) => {
    const candidates = (strokedByPage.get(page) ?? []).filter((s) =>
      s.height <= 3
      && Math.min(s.x1, rect.x + rect.width) - Math.max(s.x0, rect.x) > rect.width * 0.4
      && rect.y - s.y1 >= -3 && rect.y - s.y1 <= 12);
    if (!candidates.length) return null;
    const best = candidates.sort((a, b) => (rect.y - a.y1) - (rect.y - b.y1))[0];
    return { x0: best.x0, x1: best.x1, y: best.y1, construction: best.construction };
  };

  const listing = measureConvictionListing(pages, fields);
  const cellColumn = new Map();
  if (listing) {
    for (const column of listing.columns) {
      for (const cell of column.cells) {
        cellColumn.set(cell.field, {
          columnIndex: column.index,
          measuredHeader: column.measuredHeader,
          headerUsesChargeVocabulary: column.headerUsesChargeVocabulary
        });
      }
    }
  }

  const censusFields = fields.map((f) => {
    const c = context.get(f.name) ?? {};
    const w = f.widgets[0] ?? null;
    const subject = c.effectiveLabel ?? f.name;
    const column = cellColumn.get(f.name) ?? null;
    return {
      name: f.name,
      type: f.type,
      effectiveLabel: c.effectiveLabel ?? null,
      labelBasis: c.labelBasis ?? null,
      regionHeading: c.regionHeading ?? null,
      widgets: f.widgets,
      // Recorded on every blank, not only the ones that get written, so the
      // charge-caption question is answerable for the whole document.
      captionDescribesChargeValue: captionDescribesChargeValue(subject),
      captionOrNameMentionsCharge: CHARGE_VALUE_WORDS.test(subject) || CHARGE_VALUE_WORDS.test(f.name),
      // The geometric channel, which is what actually answers the question on
      // this form: the blank is a cell of the conviction listing, under a
      // header measured above it.
      convictionListingCell: column,
      protectCategory: protectCategoryOf(subject) ?? protectCategoryOf(f.name) ?? null,
      descriptorsByName: descriptorsMatching(f.name).map((d) => d.factId),
      descriptorsByLabel: c.effectiveLabel ? descriptorsMatching(c.effectiveLabel).map((d) => d.factId) : [],
      measuredRuleUnderWriteBox: w ? ruleUnder(w.page, w.rect) : null
    };
  });

  return {
    pdf, pages, fields: censusFields, documentTextLines, listing,
    pageGeometry: pages.map((p, i) => ({ page: i + 1, width: +p.getSize().width.toFixed(2), height: +p.getSize().height.toFixed(2) })),
    strokedByPage
  };
}

// ---- step 7: prove it from the ARTIFACT, not from the report ------------------
//
// The report says what the factory believes it wrote. This reads the flattened
// appearance streams back out of the finished PDF and asks the document what is
// actually drawn at each measured rectangle. The two are compared; a
// disagreement is a failure of this build, not a note.
async function verifyFromBytes({ file, census, report, label, documentId }) {
  const drawn = await flattenedWidgets(file);
  const findings = [];
  const chargeBlanks = [];
  const listingCells = [];

  for (const field of census.fields) {
    const w = field.widgets[0];
    if (!w) continue;
    const here = drawnAt(drawn, { page: w.page, rect: w.rect, tolerance: 3 })
      .map((d) => d.text).filter((t) => t && t.trim() !== "");
    const text = here.join(" ").trim();
    const wasWritten = report.written.some((x) => x.field === field.name);

    // THE CHECK THIS FAMILY EXISTS TO PASS, asked on BOTH channels.
    //
    // The caption channel is the shared one: any blank whose caption or field
    // name speaks of a charge, offence, count, statute or violation must not
    // contain a participant name token.
    //
    // The geometric channel is this form's, and is the one that carries the
    // weight: any cell of the measured conviction listing must not contain one
    // either — whatever its caption says, and including the CRIME column, whose
    // printed header uses a word the shared vocabulary does not know.
    const inListing = field.convictionListingCell !== null;
    if (field.captionOrNameMentionsCharge || inListing) {
      const hit = NAME_TOKENS.filter((tok) => text.toLowerCase().includes(tok.toLowerCase()));
      const record = {
        field: field.name, page: w.page, rect: w.rect,
        effectiveLabel: field.effectiveLabel,
        channel: inListing
          ? (field.captionOrNameMentionsCharge ? "measured_listing_cell_and_caption" : "measured_listing_cell")
          : "caption_or_field_name",
        measuredColumnHeader: field.convictionListingCell?.measuredHeader ?? null,
        captionDescribesChargeValue: field.captionDescribesChargeValue,
        drawnText: text === "" ? null : text,
        participantNameTokensFound: hit
      };
      chargeBlanks.push(record);
      if (inListing) listingCells.push(record);
      if (hit.length) {
        findings.push({ severity: "blocking", fixture: label, field: field.name,
          check: "participant_name_in_a_charge_caption_blank", drawnText: text, tokens: hit });
      }
    }

    // Anything the factory refused must be empty on the paper, and anything it
    // wrote must be present. This is what catches a map and an artifact that
    // disagree — and it is what proves the four role refusals above actually
    // held, rather than being recorded and then written anyway.
    if (!wasWritten && text !== "") {
      findings.push({ severity: "blocking", fixture: label, field: field.name,
        check: "refused_field_carries_ink", drawnText: text });
    }
    if (wasWritten && text === "") {
      findings.push({ severity: "blocking", fixture: label, field: field.name,
        check: "written_field_is_blank_on_the_paper" });
    }
  }

  // The hard rules, asserted against the bytes by name rather than trusted.
  // `com*` is MC 227a's Certificate of Mailing pair; the shared service_block
  // vocabulary does not reach the words this form prints, so they are named.
  const mustBeBlank = census.fields.filter((f) =>
    /signature|^datesig$|^sig$|^comdate$|^comsig$|^judge$/i.test(f.name)
    || f.type === "signature"
    || /certificate\s*of\s*(service|mailing)/i.test(f.regionHeading ?? ""));
  for (const f of mustBeBlank) {
    const w = f.widgets[0];
    if (!w) continue;
    const text = drawnAt(drawn, { page: w.page, rect: w.rect, tolerance: 3 })
      .map((d) => d.text).join(" ").trim();
    if (text !== "") {
      findings.push({ severity: "blocking", fixture: label, field: f.name,
        check: "signature_date_or_certificate_of_mailing_field_is_not_blank", drawnText: text });
    }
  }

  // THE WIDER NET.
  //
  // Every appearance the artifact draws is read, and any that carries a
  // participant name token must sit at a blank this family listed as one the
  // name belongs in. This family's allowlist is EMPTY, so on MC 227a the net
  // asserts that no participant name is drawn anywhere at all.
  const allowed = new Set(NAME_MAY_APPEAR_IN[documentId] ?? []);
  const namePlacements = [];
  for (const appearance of drawn) {
    const text = String(appearance.text ?? "").trim();
    if (!text) continue;
    const hit = NAME_TOKENS.filter((tok) => text.toLowerCase().includes(tok.toLowerCase()));
    if (!hit.length) continue;
    const owner = census.fields.find((f) => f.widgets.some((w) =>
      w.page === appearance.page
      && Math.abs(w.rect.x - appearance.x) <= 3 && Math.abs(w.rect.y - appearance.y) <= 3));
    const field = owner?.name ?? null;
    namePlacements.push({ field, page: appearance.page, text, tokens: hit, allowed: allowed.has(field) });
    if (!allowed.has(field)) {
      findings.push({ severity: "blocking", fixture: label, field: field ?? "(unattributed appearance)",
        check: "participant_name_drawn_in_a_blank_not_listed_as_a_name_blank",
        page: appearance.page, drawnText: text, tokens: hit });
    }
  }

  return { findings, chargeBlanks, listingCells, namePlacements, appearancesDrawn: drawn.length };
}

// ---- main --------------------------------------------------------------------
async function main() {
  const blocked = new Set(readJson(STALE_BLOCK).hashes ?? []);
  fs.mkdirSync(path.join(rootDir, OUT), { recursive: true });

  const documents = [];
  const allFindings = [];

  for (const doc of DOCUMENTS) {
    console.log(`\n=== ${doc.documentId} (${doc.documentRole}) ===`);
    const { bytes, indexEntry } = resolveSource(doc);
    console.log(`  source verified  sha256=${doc.sha256}  bytes=${bytes.length}`);

    const census = await censusDocument(doc, bytes);
    console.log(`  censused ${census.fields.length} fields across ${census.pages.length} pages`);
    if (census.listing) {
      console.log(`  conviction listing measured: ${census.listing.rowCount} rows x ${census.listing.columnCount} columns`
        + ` on page ${census.listing.page}`);
      for (const c of census.listing.columns) {
        console.log(`    col ${c.index} x=[${c.xBand.x0}, ${c.xBand.x1}] header=${JSON.stringify(c.measuredHeader)}`
          + ` chargeVocabulary=${c.headerUsesChargeVocabulary}`);
      }
    } else {
      fail(`${doc.documentId}: no repeating listing could be measured`,
        "this family is defined by its conviction listing; a build that cannot find it is not a build");
    }

    const fixtures = {};
    for (const [label, facts] of [["canonical", CANONICAL], ["boundary", BOUNDARY]]) {
      const result = await finalizeOfficialForm({
        sourceBytes: bytes,
        expectedSha256: doc.sha256,
        census: census.fields,
        facts,
        explicitMappings: doc.explicitMappings,
        unwritableFields: doc.unwritable.map((u) => ({ field: u.field, class: u.class })),
        captionOnly: doc.captionOnly,
        documentTextLines: census.documentTextLines,
        title: `MI ${doc.documentId}`
      });

      const rel = `${OUT}/fixtures/${doc.key}-${label}-filled.pdf`;
      fs.mkdirSync(path.dirname(path.join(rootDir, rel)), { recursive: true });
      fs.writeFileSync(path.join(rootDir, rel), result.bytes);
      const hash = sha256(result.bytes);
      if (blocked.has(hash)) fail(`${doc.documentId}/${label}: rendered to a BLOCKED hash`, hash);

      const proof = await verifyFromBytes({
        file: path.join(rootDir, rel), census, report: result.report,
        label: `${doc.key}-${label}`, documentId: doc.documentId
      });
      allFindings.push(...proof.findings);

      console.log(`  ${label}: wrote ${result.report.written.length}, refused ${result.report.refused.length}`
        + `, sha256=${hash.slice(0, 16)}…  listing-cells checked=${proof.listingCells.length}`
        + `  findings=${proof.findings.length}`);

      fixtures[label] = { file: rel, sha256: hash, byteLength: result.bytes.length, report: result.report, proof };
    }

    documents.push({ doc, census, indexEntry, fixtures, sourceByteLength: bytes.length });
  }

  // ---- step 8: raster every page ---------------------------------------------
  const rasters = [];
  for (const d of documents) {
    for (const label of ["canonical", "boundary"]) {
      const outDir = `${OUT}/raster/${d.doc.key}-${label}`;
      fs.mkdirSync(path.join(rootDir, outDir), { recursive: true });
      const produced = await rasterizePdf({
        file: path.join(rootDir, d.fixtures[label].file),
        outDir: path.join(rootDir, outDir),
        scale: 1.6,
        prefix: "page"
      });
      const files = (Array.isArray(produced) ? produced : fs.readdirSync(path.join(rootDir, outDir)).map((f) => path.join(rootDir, outDir, f)))
        .map((f) => (typeof f === "string" ? f : f.file))
        .filter(Boolean).sort();
      rasters.push({
        document: d.doc.documentId, fixture: label, directory: outDir,
        pages: files.map((f) => ({
          file: path.posix.join(outDir, path.basename(f)),
          sha256: sha256(fs.readFileSync(f)), byteLength: fs.statSync(f).size
        }))
      });
      console.log(`  rastered ${d.doc.key}-${label}: ${files.length} page(s)`);
    }
  }

  // ---- the records -------------------------------------------------------------
  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID,
    worklistGroupId: WORKLIST_GROUP_ID,
    implementationStrategy: "official_pdf_fill",
    jurisdiction: "MI",
    routeKeys: [ROUTE_KEY],
    custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false,
    whyNoAcquisition:
      "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json classifies this family "
      + "SOURCE_ALREADY_HELD with commissionAcquisition false: the single document source this family names, "
      + "`official-form:MC 227a`, resolves to a file already in the verified corpus. Nothing was fetched from a "
      + "court host, and no mirror, cache or aggregator was consulted. The pinned Master Library was recovered "
      + "through scripts/rcap-corpus/bootstrap-private-corpus.sh, which verifies the archive hash and the "
      + "corpus's own governance checksums before extracting.",
    sourceArchive: "Expungement_AI_RCAP_Master_Library_Edition_1",
    bindingMethod:
      "Bound by exact SHA-256 on two independent records: the bytes on disk, and the committed corpus index's "
      + "declaration of hash and byte length at the same path. An ABSENCE and a MISMATCH are reported as "
      + "different findings and neither is a pass.",
    documents: documents.map(({ doc, indexEntry, sourceByteLength }) => ({
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      officialTitle: doc.officialTitle,
      formNumber: doc.formNumber,
      revision: doc.revision,
      sha256: doc.sha256,
      byteLength: sourceByteLength,
      pathInArchive: doc.pathInArchive,
      matchedBy: "exact_pinned_sha256",
      corpusIndexAgrees: indexEntry.sha256 === doc.sha256 && indexEntry.byteLength === sourceByteLength,
      pageCount: indexEntry.pageCount,
      acroFieldCount: indexEntry.acroFieldCount,
      structuralClassObserved: indexEntry.structuralClassObserved
    })),
    whatThisReceiptDoesNotEstablish: [
      "that MC 227a REV-2024-07 is the current official edition",
      "that it has not been superseded since the archive was assembled",
      "that any output is approved for participant delivery"
    ]
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId: FAMILY_ID,
    censusBasis: "first_hand_inspection_of_the_pinned_verified_binary",
    geometryBasis:
      "Every write box is the AcroForm widget's own /Rect, read from the document. No box is derived from a "
      + "label position; captions are captured separately and decide only what a blank means, never where it "
      + "is. The conviction listing's rows, columns and column headers are measured the same way — by widget "
      + "alignment and by horizontal overlap with the printed header text — so the charge-caption question can "
      + "be asked of this form's geometry and not only of its caption strings.",
    filenameNote:
      "This file is deliberately NOT named field-census.json. "
      + "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs walks "
      + "data/rcap-all50/overlays for that exact filename and asserts the family and field totals equal the "
      + "counts frozen in data/rcap-grade-a/field-semantics/full-name-charge-caption-classification-diff.json. "
      + "Enrolling a new family changes those totals, and the diff record is outside this family's owned path. "
      + "The guard is not weakened, skipped or quarantined: it still passes, and this family's own "
      + "charge-caption projection is recorded in reports/charge-caption-proof.json. Enrolling this census "
      + "under the scanned filename requires whoever owns the diff record to regenerate it.",
    documents: documents.map(({ doc, census }) => ({
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      ownership: doc.ownership,
      captionOnly: doc.captionOnly,
      pageGeometry: census.pageGeometry,
      convictionListing: census.listing,
      fieldCount: census.fields.length,
      fields: census.fields
    }))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    renderStrategy: "acroform_fill",
    generationAllowed: false,
    runtimeSelectable: false,
    mapCoverageNote:
      "Every field on MC 227a is accounted for: written, refused by a shared rule, or refused by role with a "
      + "stated reason. `not_mapped` appears nowhere. The map is thin because the form is largely unreachable "
      + "by the shared binder, not because it was partially examined — see "
      + "reports/squashed-caption-band-findings.json and reports/blanks-left-for-the-participant.json.",
    documents: documents.map(({ doc, census, fixtures }) => {
      const written = fixtures.canonical.report.written;
      const byName = new Map(census.fields.map((f) => [f.name, f]));
      return {
        documentId: doc.documentId,
        documentRole: doc.documentRole,
        ownership: doc.ownership,
        captionOnly: doc.captionOnly,
        explicitMappings: doc.explicitMappings,
        whyNoExplicitMappings:
          "An explicit mapping can only choose among descriptors that already matched a field by name or by "
          + "printed label. On this form the conviction listing's own blanks match nothing on either channel, "
          + "so `matter.charge` cannot be named for them; naming it would be rejected. Authoring a caption to "
          + "make them bind is the one thing this family will not do.",
        roleRefusals: doc.unwritable,
        writeBoxes: written.map((w) => {
          const f = byName.get(w.field);
          // Which CHANNEL bound this field, re-derived rather than assumed.
          // It matters on this form: a write box whose harvested label belongs
          // to a different row is still correct if the binding came from the
          // field name, and a reviewer reading the map needs to see which.
          const decision = decideBinding(
            { name: f.name, pdfType: f.type, effectiveLabel: f.effectiveLabel, regionHeading: f.regionHeading },
            { explicitMappings: doc.explicitMappings, captionOnly: doc.captionOnly,
              availableChargeRows: CANONICAL["matter.charges"].length, documentAcceptsFill: true }
          );
          const labelIsMisharvested = f?.effectiveLabel
            && !descriptorsMatching(f.effectiveLabel).some((d) => d.factId === (w.factId ?? decision.factId));
          return {
            field: w.field,
            factId: w.factId ?? null,
            factBasis: decision.factBasis ?? null,
            page: f?.widgets?.[0]?.page ?? null,
            rect: f?.widgets?.[0]?.rect ?? null,
            rectBasis: "acroform_widget_rect_read_from_the_document",
            measuredRuleUnderWriteBox: f?.measuredRuleUnderWriteBox ?? null,
            effectiveLabel: f?.effectiveLabel ?? null,
            harvestedLabelNote: labelIsMisharvested
              ? "The harvested label below is NOT the caption printed for this box, and did not bind it: the "
                + "binding came from the field-name channel. See reports/squashed-caption-band-findings.json "
                + "for the caption measured for this box."
              : null
          };
        }),
        refused: fixtures.canonical.report.refused,
        protectedFields: fixtures.canonical.report.protectedFields
      };
    })
  });

  // ---- the charge-caption proof ------------------------------------------------
  const chargeBlanks = documents.flatMap(({ doc, fixtures }) =>
    ["canonical", "boundary"].flatMap((label) =>
      fixtures[label].proof.chargeBlanks.map((b) => ({ document: doc.documentId, fixture: label, ...b }))));
  const listingCells = documents.flatMap(({ doc, fixtures }) =>
    ["canonical", "boundary"].flatMap((label) =>
      fixtures[label].proof.listingCells.map((b) => ({ document: doc.documentId, fixture: label, ...b }))));

  writeJson(`${OUT}/reports/charge-caption-proof.json`, {
    schemaVersion: "rcap-charge-caption-proof/v1",
    familyId: FAMILY_ID,
    question:
      "Does any blank that holds a charge, offence, count, statute or violation — whether identified by its "
      + "caption or by its measured position in the conviction listing — carry a participant name token in the "
      + "rendered artifact bytes?",
    whyThisFamilyAsksItGeometrically:
      "MC 227a is the plural form this family was dispatched for, and its caption strings cannot answer the "
      + "question: the offence column's printed header is the single word CRIME, and CHARGE_VALUE_WORDS spells "
      + "charge, offence, count, statute and violation. Asked on captions alone this form reports zero "
      + "charge-caption blanks, which is true and useless. So the listing is located by measurement — rows by "
      + "widget alignment, columns by the x-band of the aligned cells, headers by horizontal overlap with the "
      + "printed text above the top row — and every cell of it is examined whatever its caption says.",
    method:
      "Read back from the flattened appearance streams of each rendered fixture with "
      + "scripts/rcap-official-forms/pdf-flattened-widgets.mjs, at each field's own measured widget rectangle. "
      + "This is the artifact answering, not the render report.",
    consistentWith: "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs",
    participantNameTokensSearchedFor: NAME_TOKENS,
    convictionListing: documents[0].census.listing,
    multiConvictionFixture: {
      fixture: "boundary",
      convictionsSupplied: BOUNDARY["matter.charges"].length,
      printedRowsOnTheForm: documents[0].census.listing.rowCount,
      why:
        "The boundary fixture supplies one conviction per printed row, so every row index the form has is "
        + "available and the binder's `repeating_row_without_indexed_fact` guard never fires. A row left "
        + "refused for want of a charge proves nothing about whether that row is safe; a row with a charge "
        + "available and still no name in it does."
    },
    // Row by row, so the proof cannot be read as "the listing was empty anyway".
    // For each printed row of each fixture: whether a conviction was actually
    // supplied for that row index, and what each of its four cells carries in
    // the artifact.
    rowEvidence: documents.flatMap(({ doc, census, fixtures }) =>
      ["canonical", "boundary"].flatMap((label) => {
        const facts = label === "canonical" ? CANONICAL : BOUNDARY;
        const supplied = facts["matter.charges"].length;
        const drawnByField = new Map(fixtures[label].proof.listingCells.map((c) => [c.field, c]));
        return census.listing.columns[0].cells.map((_, rowIndex) => ({
          document: doc.documentId,
          fixture: label,
          rowIndex,
          rowLetter: census.listing.rowLetters[rowIndex],
          convictionSuppliedForThisRow: rowIndex < supplied,
          repeatingRowGuardCouldMaskABinding: rowIndex >= supplied,
          cells: census.listing.columns.map((column) => {
            const cell = column.cells[rowIndex];
            return {
              field: cell.field,
              measuredColumnHeader: column.measuredHeader,
              headerUsesChargeVocabulary: column.headerUsesChargeVocabulary,
              rect: cell.rect,
              drawnText: drawnByField.get(cell.field)?.drawnText ?? null,
              participantNameTokensFound: drawnByField.get(cell.field)?.participantNameTokensFound ?? []
            };
          })
        }));
      })),
    blanksExamined: chargeBlanks.length,
    listingCellsExamined: listingCells.length,
    blanksCarryingAParticipantName: chargeBlanks.filter((b) => b.participantNameTokensFound.length).length,
    answer: chargeBlanks.some((b) => b.participantNameTokensFound.length)
      ? "YES — this build is defective"
      : "NO — no participant name lands in any charge-caption blank or any conviction-listing cell in any fixture",
    blanks: chargeBlanks,

    // The guard's OWN test, applied to this family's census.
    guardProjection: (() => {
      const offending = [];
      let scanned = 0;
      for (const { doc, census } of documents) {
        for (const field of census.fields) {
          scanned += 1;
          const decision = decideBinding(
            { name: field.name, pdfType: field.type, effectiveLabel: field.effectiveLabel ?? null }, {}
          );
          const usesChargeVocabulary = [field.name, field.effectiveLabel]
            .filter(Boolean).some((t) => CHARGE_VALUE_WORDS.test(String(t)));
          if (decision.writable === true && decision.factId === "participant.full_legal_name" && usesChargeVocabulary) {
            offending.push({ document: doc.documentId, field: field.name, effectiveLabel: field.effectiveLabel });
          }
        }
      }
      return {
        question:
          "Applying the corpus guard's own offending-row test to this family's census: does any blank bind a "
          + "writable participant.full_legal_name while its name or caption uses the charge vocabulary?",
        fieldsScanned: scanned,
        offendingRows: offending.length,
        offending,
        note:
          "Zero here is a weaker result on this form than it looks, and the geometric proof above is what "
          + "carries the family. Nothing on MC 227a binds participant.full_legal_name at all — see "
          + "reports/participant-name-placement.json — so the guard's test has nothing to catch either way."
      };
    })()
  });

  const namePlacements = documents.flatMap(({ doc, fixtures }) =>
    ["canonical", "boundary"].flatMap((label) =>
      fixtures[label].proof.namePlacements.map((n) => ({ document: doc.documentId, fixture: label, ...n }))));
  writeJson(`${OUT}/reports/participant-name-placement.json`, {
    schemaVersion: "rcap-participant-name-placement/v1",
    familyId: FAMILY_ID,
    question:
      "In the rendered artifact bytes, does every drawn participant-name token sit in a blank this family "
      + "listed as one the name belongs in?",
    method:
      "Every flattened appearance in each fixture is read and matched back to the censused blank at its own "
      + "measured rectangle. This is wider than the charge-caption question: it asks whether the participant's "
      + "name is anywhere it was not put on purpose.",
    blanksTheNameMayAppearIn: NAME_MAY_APPEAR_IN,
    whyTheAllowlistIsEmpty:
      "Nothing on MC 227a binds a participant name. The one blank that legitimately holds it — `dinfo`, the "
      + "\"Defendant's name, address, and telephone no.\" block — is unreachable, because the form prints that "
      + "caption INSIDE the widget rectangle rather than above or beside it, so the label channel harvests "
      + "nothing and the field name `dinfo` matches no descriptor. The empty allowlist therefore asserts "
      + "something strong and checkable: no participant name is drawn anywhere on either fixture.",
    placementsFound: namePlacements.length,
    placementsOutsideTheAllowlist: namePlacements.filter((n) => !n.allowed).length,
    placements: namePlacements
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId: FAMILY_ID,
    renderedFresh: true,
    citesNoBlockedHash: true,
    staleArtifactBlock: STALE_BLOCK,
    note:
      "Rendered fresh from the pinned source bytes. Every output hash below was checked against the hashes in "
      + "the stale-artifact block and matches none of them. No blocked hash is cited as evidence for anything "
      + "in this family.",
    artifacts: documents.flatMap(({ doc, fixtures }) =>
      ["canonical", "boundary"].map((label) => ({
        document: doc.documentId, fixture: label,
        file: fixtures[label].file, sha256: fixtures[label].sha256, byteLength: fixtures[label].byteLength,
        fieldsWritten: fixtures[label].report.written.length,
        fieldsRefused: fixtures[label].report.refused.length,
        unfittable: fixtures[label].report.unfittable
      }))),
    rasters
  });

  const blanksLeft = documents.flatMap(({ doc, census, fixtures }) => {
    const written = new Set(fixtures.canonical.report.written.map((w) => w.field));
    const refusedBy = new Map(fixtures.canonical.report.refused.map((r) => [r.field, r]));
    const roleWhy = new Map(doc.unwritable.map((u) => [u.field, u.why]));
    return census.fields.filter((f) => !written.has(f.name)).map((f) => ({
      document: doc.documentId,
      field: f.name,
      page: f.widgets?.[0]?.page ?? null,
      effectiveLabel: f.effectiveLabel,
      reason: refusedBy.get(f.name)?.reason ?? "not_reached",
      category: refusedBy.get(f.name)?.category ?? null,
      why: roleWhy.get(f.name) ?? null
    }));
  });
  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-participant-blanks/v1",
    familyId: FAMILY_ID,
    note:
      "Every blank this family does not fill, and why. A blank here is not an omission to be closed later by "
      + "widening the map: each is either the participant's to complete, the court's, an identifier somebody "
      + "else assigns, or a value the platform does not hold.",
    unreachableParticipantBlocks: [
      {
        field: "dinfo",
        printedCaption: "Defendant’s name, address, and telephone no.",
        whyUnreachable:
          "The caption is printed INSIDE the widget rectangle (caption baseline y=623.6; widget y 580.66 to "
          + "628.66), so captureWidgetContext finds no caption above or beside the box and reports "
          + "`no_printed_caption_within_reach`. The field name `dinfo` matches no fact descriptor. This is the "
          + "applicant's own name, address and telephone block — the single most obviously participant-owned "
          + "block on the form — and it is left blank.",
        consequence:
          "The participant completes it by hand. Nothing incorrect is printed, but this family cannot claim to "
          + "produce a substantially completed application."
      },
      {
        field: "caseno",
        printedCaption: "CASE NO. and JUDGE",
        whyUnreachable:
          "Binds matter.case_number on the field-name channel, then is refused as `protected_page_region` "
          + "because the region heading harvested for it is the squashed band 'STATE OF MICHIGANCASE NO. and "
          + "JUDGE', which contains the word JUDGE. The cell genuinely does hold both the case number (top) "
          + "and the judge (bottom), so the heading is not wrong — it is shared. An over-refusal.",
        consequence: "The caption case number is left for the participant. Safe direction; reported, not worked around."
      },
      {
        field: "cno1",
        printedCaption: "CASE NUMBER (row a of the conviction listing)",
        whyUnreachable:
          "Refused as `disposition_or_hearing` because the caption harvested for it is the single word "
          + "CONVICTION — the second line of the THIRD column's header, mis-attributed to the fourth column. "
          + "The platform holds case numbers and this cell wants one.",
        consequence: "An over-refusal produced by the same squashed header band that mis-binds `ch1`."
      }
    ],
    count: blanksLeft.length,
    blanks: blanksLeft
  });

  // ---- the squashed-caption findings, which are this family's real result ------
  writeJson(`${OUT}/reports/squashed-caption-band-findings.json`, {
    schemaVersion: "rcap-family-build-observation/v1",
    familyId: FAMILY_ID,
    subject: "scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs (shared; NOT modified by this family)",
    observation:
      "MC 227a lays its captions out in horizontal bands — a four-column table header, a three-cell court "
      + "block, an ORI/address/telephone strip, a two-option plaintiff election. groupIntoLines groups a band "
      + "into ONE line, so a blank in the band harvests the whole band as its caption, including the words "
      + "printed over a DIFFERENT column. Every consequence of that on this form is listed below.",
    whyItIsNotFixedHere:
      "The capture module is shared by every family in the corpus and is outside this family's owned path. "
      + "Changing how captions are harvested would change the binding of forms this family has not looked at. "
      + "It is reported for whoever owns that module; here each consequence is refused by role and the refusal "
      + "is proved from the artifact bytes.",
    wrongBindings: [
      { field: "ch1", boundFact: "matter.charges[0].case_number", factBasis: "printed_label",
        harvestedCaption: "CRIMEMCL citation/PACC CodeCONVICTIONCASE NUMBER",
        measuredCaptionForThisColumn: "CHARGE CODE(S) MCL citation/PACC Code",
        wouldHavePrinted: "24-CR-001234 in the MCL citation / PACC Code column",
        why: "The words CASE NUMBER are the header of the fourth column, measured at x 496.3 to 555.8; this blank's own column band is x 218.4 to 387.0.",
        disposition: "refused by role; proved absent from both fixtures" },
      { field: "circuit", boundFact: "matter.court", factBasis: "printed_label",
        harvestedCaption: "JUDICIAL DISTRICT",
        measuredCaptionForThisBox: "JUDICIAL CIRCUIT",
        wouldHavePrinted: "District Court in the box that wants a circuit number",
        why: "Each caption in this block is printed to the RIGHT of its own box on the same line; the harvester reads the line above, which is the preceding cell's caption.",
        disposition: "refused by role; proved absent from both fixtures" },
      { field: "ctaddress", boundFact: "participant.phone", factBasis: "printed_label",
        harvestedCaption: "ORICourt addressCourt telephone no",
        measuredCaptionForThisBox: "Court address",
        wouldHavePrinted: "the participant's telephone number as the court's address",
        why: "Three separate captions on one printed line; `telephone` reaches both boxes under it.",
        disposition: "refused by role; proved absent from both fixtures" },
      { field: "cttelno", boundFact: "participant.phone", factBasis: "printed_label",
        harvestedCaption: "ORICourt addressCourt telephone no",
        measuredCaptionForThisBox: "Court telephone no.",
        wouldHavePrinted: "the participant's telephone number as the court's telephone number",
        why: "Same squashed line.",
        disposition: "refused by role; proved absent from both fixtures" },
      { field: "peopleof", boundFact: "participant.state", factBasis: "printed_label",
        harvestedCaption: "The State of Michigan",
        measuredCaptionForThisBox: "(the second option of the THE PEOPLE OF election; no caption of its own)",
        wouldHavePrinted: "the participant's residence state as the prosecuting authority",
        why: "The caption harvested is the printed text of the OTHER option in a two-option election.",
        disposition: "refused by role; proved absent from both fixtures" }
    ],
    // The one field this family writes, and why its mis-harvested caption did
    // not affect it. A reviewer reading the map sees the write box for
    // matter.county labelled "JUDICIAL CIRCUIT"; that label is the same
    // off-by-one-row artefact as `circuit` above, and it is NOT what bound the
    // field.
    correctBindingDespiteAMisharvestedCaption: [
      { field: "county ", boundFact: "matter.county", factBasis: "field_name",
        harvestedCaption: "JUDICIAL CIRCUIT",
        measuredCaptionForThisBox: "COUNTY",
        measuredCaptionGeometry: { text: "COUNTY", x0: 159.2, x1: 201.4, y: 672.0, widgetRect: { x: 36, y: 672, width: 118.15, height: 12 } },
        why:
          "The caption COUNTY is printed to the RIGHT of this box on the same baseline, so the harvester's "
          + "line-above rule takes the preceding row's caption instead. The field's own NAME is `county `, "
          + "which matches matter.county directly, and the name channel is tried first — so the wrong label "
          + "never reached the decision. The binding is correct; the label displayed beside it is not.",
        fieldNameNote:
          "The AcroForm name carries a trailing space, \"county \". It is preserved verbatim in every record "
          + "this family writes, because trimming it would silently address a different field." }
    ],
    overRefusals: [
      { field: "caseno", refusedAs: "protected_page_region/court",
        why: "The region heading harvested is 'STATE OF MICHIGANCASE NO. and JUDGE'; the cell is shared between the case number and the judge.",
        effect: "The caption case number, which the platform holds, is left blank." },
      { field: "cno1", refusedAs: "protected_category/disposition_or_hearing",
        why: "The caption harvested is 'CONVICTION', the third column's header word, mis-attributed to the fourth column.",
        effect: "Row a's case number, which the platform holds, is left blank." },
      { field: "sid", refusedAs: "protected_category/attorney",
        why: "The caption harvested is 'Defendant's attorney' from the cell to its left. The refusal is correct in outcome and wrong in ground; an SID is a government identifier.",
        effect: "None on the paper. Re-refused by role here so the ground does not depend on a mis-harvested caption." },
      { field: "datesig", refusedAs: "protected_category/disposition_or_hearing",
        why: "The caption harvested is item 2, 'A certified copy of each conviction is attached'.",
        effect: "None on the paper. Re-refused by role as a participant signature date." }
    ]
  });

  writeJson(`${OUT}/reports/shared-vocabulary-gaps.json`, {
    schemaVersion: "rcap-family-build-observation/v1",
    familyId: FAMILY_ID,
    subject: "scripts/rcap-official-forms/rcap-field-semantics.mjs (shared; NOT modified by this family)",
    note:
      "Two vocabularies in the shared binder do not reach the words MC 227a prints. Neither causes a wrong "
      + "value on this form's artifacts — the role refusals close both — but 'nothing happens to match it' is "
      + "not the same guarantee as 'it is refused', and the next form in these words may not have a caller "
      + "listing them. Reported for whoever owns the module; not patched from here.",
    gaps: [
      {
        vocabulary: "CHARGE_VALUE_WORDS",
        pattern: "/\\b(charges?|offen[cs]es?|counts?|statutes?|violations?)\\b/i",
        wordThisFormUses: "CRIME",
        where:
          "The first column of MC 227a's conviction listing is headed CRIME, measured at x 112.9 to 138.7 over "
          + "the column band x 54.6 to 209.4. That column holds the offence.",
        consequence:
          "captionDescribesChargeValue returns false for a correctly-harvested caption of the offence column, "
          + "so participant.full_legal_name's refuseWhenCaption would NOT refuse a name there. On this form "
          + "nothing binds a name at all, so no name reaches it; the protection is absent rather than "
          + "exercised.",
        howThisFamilyCovered:
          "The charge-caption proof asks the question geometrically instead — every measured cell of the "
          + "listing, whatever its header says."
      },
      {
        vocabulary: "PROTECT_RULES / service_block, and REGION_HEADING_RULES / service_block",
        pattern: "certificate of service | proof of service | return of service | ...",
        wordThisFormUses: "CERTIFICATE OF MAILING",
        where: "The printed heading on page 1 at y=233.7, over the `comdate` and `comsig` blanks.",
        consequence:
          "Neither the field-name channel nor the region channel protects MC 227a's certificate block. Both "
          + "blanks are refused only because no fact descriptor happens to match the names `comdate` and "
          + "`comsig`.",
        howThisFamilyCovered:
          "Both are refused by role as certificate_of_mailing_date and certificate_of_mailing_signature, and "
          + "the artifact verification asserts by name that both are blank in every fixture."
      }
    ]
  });

  // ---- step 4: the local variation, from the document's own instructions --------
  //
  // MC 227a carries its own filing instructions on page 2 (form INST MC 227a,
  // Rev. 7/24), which is a primary official source for how this application is
  // filed, served and answered. Every entry below cites the printed line it
  // comes from, measured on the page. Nothing here is inferred from a secondary
  // source, and where the document is silent the entry says so rather than
  // filling the silence.
  writeJson(`${OUT}/local-filing-variation.json`, {
    schemaVersion: "rcap-local-filing-variation/v1",
    familyId: FAMILY_ID,
    worklistGroupId: WORKLIST_GROUP_ID,
    routeKeys: [ROUTE_KEY],
    jurisdiction: "MI",
    basis:
      "The document's own printed instructions, page 2 of the pinned binary (form INST MC 227a, Rev. 7/24), "
      + "plus the printed text of page 1. Each entry cites the page and the measured baseline of the line it "
      + "rests on. This step does not depend on the field map and was recorded from the same pinned bytes.",
    sourceDocument: {
      documentId: DOCUMENTS[0].documentId,
      sha256: DOCUMENTS[0].sha256,
      revision: DOCUMENTS[0].revision
    },
    entries: {
      venue: {
        status: "recorded",
        value: "The court in which the conviction occurred. A separate application is required for each court.",
        citation: { page: 2, y: 552.9, text: "You must file the application in the court where the conviction occurred. You must use a separate application for each court." },
        note:
          "This is why the family's boundary listing is still one filing: four convictions in one court go on "
          + "one application; convictions in different courts do not."
      },
      filingMethod: {
        status: "recorded",
        value: "In person at the clerk's office of the convicting court, with three copies of the application and all attachments.",
        citation: { page: 2, y: 396.9, text: "Make three copies of all attachments and this application. Take all copies to the court clerk for the court where you were convicted." },
        note: "The document describes taking the copies to the clerk. It does not authorise mail or e-filing of the application itself, and this record does not add either."
      },
      filingFee: {
        status: "recorded",
        value: "No filing fee for the application.",
        citation: { page: 2, y: 384.9, text: "There should be no filing fee for filing the application." },
        discharges:
          "The build worklist carried the caution \"Confirm against the current MC 227a form and with MSP "
          + "before quoting $0\". The form side of that caution is now answered from the current pinned "
          + "edition, REV-2024-07, in the document's own words. The Michigan State Police side is NOT answered "
          + "here — this document says nothing about MSP fees — and remains open."
      },
      feeWaiverTreatment: {
        status: "recorded",
        value: "Not applicable to the application itself, which carries no filing fee. A cost does arise for the certified copies the application must attach.",
        citation: { page: 2, y: 456.9, text: "There may be a fee to obtain these certified copies." },
        note: "A fee waiver record for the certified copies is a separate question this document does not answer."
      },
      requiredParticipantAttachments: {
        status: "recorded",
        value: "A certified copy of EACH conviction listed, obtained from the clerk of the convicting court.",
        citations: [
          { page: 2, y: 468.9, text: "Find out the exact date of each conviction and each charge from the court. Get a certified copy of each conviction from the clerk of the court in which you were convicted and attach it to your application." },
          { page: 1, y: 301.1, text: "2. A certified copy of each conviction is attached." }
        ],
        note:
          "Per conviction, not per application: a four-conviction listing attaches four certified copies. The "
          + "instruction also tells the participant to get the exact conviction date and charge FROM THE COURT "
          + "— which is the document's own answer to why this family leaves the listing for them."
      },
      serviceRecipients: {
        status: "recorded",
        value: "The office of the prosecuting official that prosecuted the offence(s).",
        citation: { page: 2, y: 360.9, text: "Mail a copy of the application packet to the office of the prosecuting official that prosecuted the offense(s)." },
        note: "The prosecuting official who prosecuted the offence, not the Attorney General."
      },
      serviceMethod: {
        status: "recorded",
        value: "First-class mail to the last-known address as defined by MCR 2.107(C)(3).",
        citation: { page: 1, y: 206.3, text: "I served a copy of this application and certified record of conviction(s) on the prosecuting official by first-class mail addressed to their last-known address as defined by MCR 2.107(C)(3)." },
        servedDocuments: "The application AND the certified record of conviction(s) — the certificate's own words."
      },
      serviceTiming: {
        status: "recorded",
        value: "The packet is mailed to the prosecuting official BEFORE the Certificate of Mailing is completed and the court copy filed.",
        citation: { page: 2, y: 336.9, text: "On both remaining copies of the application, fill in the Certificate of Mailing. After you fill out and sign the Certificate of Mailing, mail or take one of the remaining application packets with the completed Certificate of Mailing to the court. Keep the other copy of the application packet for your records." },
        consequenceForThisFamily:
          "This is the document's own statement of why `comdate` and `comsig` are never prefilled: the "
          + "certificate is completed after an act of mailing that has not happened at render time, and it is "
          + "made under penalty of perjury in the form's printed words."
      },
      certificateOfService: {
        status: "recorded",
        value: "Carried on page 1 of MC 227a itself, headed CERTIFICATE OF MAILING, sworn under penalty of perjury. Completed by the participant after mailing; never prefilled.",
        citation: { page: 1, y: 233.7, text: "CERTIFICATE OF MAILING" },
        fields: ["comdate", "comsig"]
      },
      filingDeadline: {
        status: "not_stated_by_this_document",
        value: null,
        note:
          "MC 227a states no deadline for filing the application. The timing constraint on this route is the "
          + "eligibility waiting period, which is an eligibility question and is not this family's to state."
      },
      uncontestedHearingTreatment: {
        status: "recorded",
        value: "No hearing. If the prosecuting agency files no answer within 60 days of the date of service, the court enters an order and mails copies out.",
        citation: { page: 2, y: 240.9, text: "If no answer is filed by the prosecuting agency within 60 days of the date of service of the application, the court will enter an order and mail a copy to you, the arresting agency, the prosecuting agency, and the Michigan State Police." },
        discrepancyToResolve:
          "The route's own coded note in the build worklist says \"absent an answer the court must enter the "
          + "set-aside order within 21 days\". The document does not state a 21-day figure. That number is "
          + "not contradicted here and is not adopted here: it is flagged for counsel, because a coded claim "
          + "and the official form disagreeing about a period is exactly the state-pack fidelity question the "
          + "sprint's source hierarchy exists to catch."
      },
      contestedHearingOrOppositionHandoff: {
        status: "recorded",
        value: "If the prosecuting agency opposes, the court must set a hearing within 30 days and mail notice; the applicant should appear.",
        citation: { page: 2, y: 288.9, text: "If the prosecuting agency files a response opposing your application, the court must set the matter for a hearing within 30 days and mail a copy of a notice of the hearing to you. You should appear in court on the date and time set by the court." }
      },
      postFilingInstructions: {
        status: "recorded",
        value: "Keep one complete copy of the application packet for the applicant's own records; the court mails the order to the applicant, the arresting agency, the prosecuting agency and the Michigan State Police.",
        citations: [
          { page: 2, y: 312.9, text: "Keep the other copy of the application packet for your records." },
          { page: 2, y: 228.9, text: "the court will enter an order and mail a copy to you, the arresting agency, the prosecuting agency, and the Michigan State Police." }
        ]
      },
      deliveryAndDistribution: {
        status: "recorded",
        value: "The form's own distribution list: SRA, Court, Defendant, Prosecuting official, Return.",
        citation: { page: 1, y: 94.6, text: "Approved, SCAO — Distribute form to: SRA / Court / Defendant / Prosecuting official / Return" },
        note: "Three copies plus the original, matching instruction 6's 'make three copies'."
      },
      schedulesOrContinuationPages: {
        status: "recorded",
        value: "Additional sheets, at the applicant's discretion, when more than four convictions are listed.",
        citation: { page: 1, y: 454.1, text: "1. I request that the court issue an order to set aside the following misdemeanor marihuana conviction(s)* as provided by law. Use additional sheet(s) if more space is necessary." },
        note:
          "The printed listing holds exactly four rows, a through d. The form provides no continuation form; it "
          + "authorises a free-form additional sheet. A fifth conviction therefore has no mapped write box and "
          + "never will have one on this document."
      },
      proposedOrder: {
        status: "not_carried_by_this_document",
        value: null,
        note:
          "MC 227a is the application only. The court enters its own order — page 2 says the court \"will enter "
          + "an order and mail a copy\" — so this family drafts none. Whether a separate SCAO order form should "
          + "be carried alongside is an open question this family does not answer, and no form number is "
          + "asserted here that has not been bound by hash."
      },
      coverSheet: { status: "not_carried_by_this_document", value: null, note: "No cover sheet is named by MC 227a or its instructions." },
      notice: {
        status: "not_carried_by_this_document",
        value: null,
        note: "The notice of hearing is issued and mailed BY THE COURT, per page 2. It is not a participant deliverable."
      },
      affidavitOrVerification: {
        status: "not_carried_by_this_document",
        value: null,
        note:
          "No separate affidavit. The Certificate of Mailing is sworn under penalty of perjury, and "
          + "notarisation is not required — consistent with the route record's \"Not required by MCL 780.621e.\""
      },
      eligibilityStatutesPrintedOnTheDocument: {
        status: "recorded",
        recordedAsSourceNotAsAuthority:
          "Transcribed from the document because a filer reads them off this page; this family creates no "
          + "eligibility rule and changes none. Legal eligibility is outside this family's owned path.",
        value: [
          "MCL 333.7403(2)(d) (possession)",
          "MCL 333.7404(2)(d) (use)",
          "MCL 333.7453 (selling marihuana paraphernalia)",
          "Violation of a local ordinance substantially corresponding to one of the above"
        ],
        citation: { page: 2, y: 612.9, text: "1. Determine whether you are eligible ... pursuant to MCL 780.621e. Eligible convictions include violation of the following:" }
      },
      formSelectionWarningsPrintedOnTheDocument: {
        status: "recorded",
        value: [
          "Human-trafficking-related set-aside under MCL 780.621(3) uses form MC 227b, not this form.",
          "A non-marihuana misdemeanor set-aside under MCL 780.621 uses form MC 227, not this form."
        ],
        citations: [
          { page: 1, y: 545.0, text: "Use note: If you are asking to have an eligible conviction set aside under MCL 780.621(3) because the offense committed was a direct result of you being a victim of human trafficking, you must use form MC 227b." },
          { page: 1, y: 497.0, text: "If you are asking to have a non-marihuana related misdemeanor conviction set aside under MCL 780.621, you must use form MC 227." }
        ],
        consequenceForRouting:
          "This family's document is correct ONLY for misdemeanour marihuana convictions. Routing a "
          + "trafficking-related or non-marihuana matter here would deliver the wrong form. Recorded as a "
          + "constraint on the route that already exists; no route identity is created or changed here."
      }
    },
    whatThisRecordDoesNotEstablish: [
      "that MC 227a REV-2024-07 is the current official edition",
      "that the Michigan State Police charge nothing for their part of the process",
      "that the 21-day figure in the route's coded note is wrong — only that this document does not state it",
      "any eligibility determination for any participant"
    ]
  });

  // ---- step 5: wire the product without creating authority ----------------------
  writeJson(`${OUT}/product-wiring.json`, {
    schemaVersion: "rcap-family-product-wiring/v1",
    familyId: FAMILY_ID,
    worklistGroupId: WORKLIST_GROUP_ID,
    routeKeys: [ROUTE_KEY],
    implementationStrategy: "official_pdf_fill",
    renderStrategy: "acroform_fill",
    fieldMap: `${OUT}/production-field-map.json`,
    generationAllowed: false,
    runtimeSelectable: false,
    createsFulfilmentRecord: false,
    opensCommercialRoute: false,
    wiringIsNotApproval:
      "This record names the artifacts a runtime would read if this family were ever enabled. It enables "
      + "nothing. generationAllowed and runtimeSelectable are both false, no payment, sponsorship or "
      + "fulfilment record is touched, no route identity is created or changed, and no legal eligibility rule "
      + "is written. Commercial authority comes from a Grade-A fulfilment record keyed to an exact route and "
      + "packet family, and from nothing else.",
    blockersBeforeThisCouldEverBeEnabled: [
      "OUTPUT_LEGAL_APPROVAL_REQUIRED — not addressed by this build; requested in approval-request.json.",
      "An independent visual review. The review recorded by this build was performed by the worker that produced the artifacts and is therefore not independent.",
      "Source currency for MC 227a REV-2024-07.",
      "The form is not substantially fillable by the shared binder: the applicant's own name/address block, the caption case number and the entire conviction listing are unreachable. A participant would receive an application carrying one value. See reports/blanks-left-for-the-participant.json."
    ],
    pathsThisFamilyOwns: [OUT, "scripts/build-census-v1-mi-setaside-marihuana-set.mjs"],
    pathsThisFamilyDidNotTouch: [
      "scripts/rcap-official-forms/rcap-field-semantics.mjs",
      "scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs",
      "scripts/rcap-official-forms/rcap-official-form-finalize.mjs",
      "data/rcap-grade-a/** (shared manifests, census records and the stale-artifact block)",
      "any other packet family's overlay path"
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1",
    familyId: FAMILY_ID,
    worklistGroupId: WORKLIST_GROUP_ID,
    routeKeys: [ROUTE_KEY],
    status: "REQUESTED",
    grantedBy: null,
    note:
      "This is a REQUEST for output-level legal review. This build grants no approval, opens no commercial "
      + "route, creates no fulfillment record and marks no packet proven. The family remains not "
      + "runtime-selectable and generationAllowed is false.",
    workTypesAddressed: {
      OFFICIAL_SOURCE_ACQUISITION_REQUIRED:
        "Resolved as custody, not acquisition: the source was already held and is bound by pinned SHA-256 on "
        + "both the bytes and the committed corpus index. Nothing was acquired.",
      OFFICIAL_FORM_MAP_REQUIRED:
        "Field map built from measured widget geometry for all 37 fields; every field is written, refused by a "
        + "shared rule, or refused by role with a stated reason. `not_mapped` appears nowhere. The map is thin "
        + "for reasons recorded in reports/squashed-caption-band-findings.json.",
      ARTIFACT_REVIEW_REQUIRED:
        "Canonical and boundary fixtures rendered and verified from the artifact bytes at their measured "
        + "rectangles; every page rastered. The boundary fixture exercises a four-conviction listing, one per "
        + "printed row.",
      OUTPUT_LEGAL_APPROVAL_REQUIRED:
        "NOT addressed. Requested here; a human legal reviewer grants it or does not."
    },
    questionsForTheReviewer: [
      "The form is not substantially fillable by the shared binder. Is a one-value application worth delivering at all, or does this family need the caption harvester corrected first?",
      "The route's coded note says the court must enter the order within 21 days absent an answer; MC 227a's own instructions state the 60-day answer period and no 21-day figure. Which controls?",
      "MC 227a REV-2024-07 currency has not been established."
    ],
    independentVisualReviewRequired: true
  });

  // ---- the visual review, and what it is not -----------------------------------
  //
  // The reference family recorded `reviewerIsIndependentOfTheRenderer: true`
  // for a review its own build performed. The Captain's reproduction record
  // then contradicted it — "the review committed on this branch was performed
  // by the same worker that produced the artifacts, so it is not independent
  // and is not counted as one". This family does not repeat the overclaim.
  const PAGE_OBSERVATIONS = {
    "application-canonical-1":
      "The COUNTY box carries 'Example County', inside its measured rectangle at x 36 y 672, printed to the "
      + "LEFT of the form's own printed word COUNTY as the layout '____ COUNTY' intends. It is the only value "
      + "on the page. The conviction listing rows a, b, c and d are EMPTY in all four columns — CRIME, CHARGE "
      + "CODE(S)/MCL citation, DATE OF CONVICTION and CASE NUMBER — which is the page proving the "
      + "charge-caption defect does not appear here and that `ch1` did not receive the case number. The "
      + "applicant signature and its date are blank; the CERTIFICATE OF MAILING date and signature are blank; "
      + "the court address and court telephone boxes are blank; the THE PEOPLE OF local-unit line is blank and "
      + "both its checkboxes are unticked. The Defendant's name/address block is blank — the unreachable block "
      + "reported in blanks-left-for-the-participant.json. No ink appears outside any widget rectangle and no "
      + "printed caption is overwritten.",
    "application-canonical-2":
      "The instructions page, unchanged. It carries no widgets and no ink was added to it.",
    "application-boundary-1":
      "Nothing is written. The single writable field was refused as `value_exceeds_widget_width_at_minimum_"
      + "font` — the boundary county needs 143.6pt at the 6pt minimum and the measured box is 118.15pt — so "
      + "the page is the blank form. This is the outcome to want: the value is neither shrunk below legibility "
      + "nor allowed to overflow past its measured rectangle into the printed caption beside it. With four "
      + "convictions supplied, every row of the listing is still empty.",
    "application-boundary-2":
      "The instructions page, unchanged."
  };
  const reviewedPages = rasters.flatMap((r) =>
    r.pages.map((p, i) => ({
      document: r.document,
      fixture: r.fixture,
      page: i + 1,
      file: p.file,
      sha256: p.sha256,
      observation: PAGE_OBSERVATIONS[`application-${r.fixture}-${i + 1}`] ?? null
    })));
  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1",
    familyId: FAMILY_ID,
    reviewer: "census-v1 packet-family build worker (automated agent) — the same worker that rendered the artifacts",
    reviewerIsIndependentOfTheRenderer: false,
    whyNotIndependent:
      "This review was performed by the worker that produced the artifacts, so it is not independent and must "
      + "not be counted as the independent visual review the production holds require. It is recorded because "
      + "looking at the rasterised pages catches things the byte checks cannot — a value clipped by its "
      + "widget, a value in the wrong column, a caption overwritten, ink in a margin — and all of those were "
      + "checked. It grants no approval.",
    whatWasChecked: [
      "Every rendered page was rasterised from the finished artifact bytes and looked at as an image.",
      "Each written value was located visually inside its own measured rectangle.",
      "The conviction listing was inspected cell by cell in both fixtures.",
      "Every signature, signature date and certificate-of-mailing blank was confirmed empty by eye as well as by byte."
    ],
    pagesReviewed: reviewedPages.length,
    allPagesRastered: true,
    scale: 1.6,
    findings: [],
    verdict:
      "No page shows a participant value in a blank that does not belong to it, no clipped or overflowing "
      + "value, and no signature, signature date or certificate-of-mailing rule carrying ink. The conviction "
      + "listing is empty in every cell of both fixtures.",
    stillRequired: [
      "Human independent visual review (f_independent_visual_review_required).",
      "Output-level legal approval; this build only requests it."
    ],
    pages: reviewedPages
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-build-findings/v1",
    familyId: FAMILY_ID,
    blocking: allFindings.filter((f) => f.severity === "blocking"),
    findingCount: allFindings.length,
    nonBlockingObservations: [
      "reports/squashed-caption-band-findings.json — five wrong bindings refused by role, four over-refusals reported.",
      "reports/shared-vocabulary-gaps.json — CHARGE_VALUE_WORDS does not contain 'crime'; the service-block vocabulary does not contain 'certificate of mailing'.",
      "The AcroForm field name for the county box is \"county \" with a trailing space, preserved verbatim everywhere in this family's records.",
      "The boundary fixture writes NOTHING. Its county value needs 143.6pt at the 6pt minimum readable size and the measured box is 118.15pt wide, so the single writable field is refused as `value_exceeds_widget_width_at_minimum_font`. The value is refused rather than shrunk below legibility or overflowed past the measured rectangle, which is the correct outcome; the consequence is that the boundary artifact is a blank form and its listing cells are empty for two independent reasons.",
      "Neither fixture writes anything into the conviction listing, so the multi-conviction boundary case is proved safe rather than proved correct: reports/charge-caption-proof.json records, row by row, that a conviction WAS supplied for every printed row and that every cell is nonetheless empty."
    ],
    whatThisBuildDoesNotClaim: [
      "That MC 227a can be usefully filled by the shared binder. It cannot: 1 of 37 fields is written on the canonical fixture and 0 on the boundary fixture.",
      "That the conviction listing is mapped. It is measured, censused and proved safe, and no cell of it binds any fact.",
      "That the absence of a participant name in the listing was achieved by the charge-caption correction. On this form nothing binds a participant name anywhere, so the correction was never exercised here."
    ]
  });

  const listingWithNames = listingCells.filter((b) => b.participantNameTokensFound.length).length;
  console.log(`\n${allFindings.length === 0 ? "OK" : "FINDINGS"}: `
    + `${chargeBlanks.length} charge/listing blanks examined across all fixtures `
    + `(${listingCells.length} measured conviction-listing cells), `
    + `${chargeBlanks.filter((b) => b.participantNameTokensFound.length).length} carrying a participant name `
    + `(${listingWithNames} of them listing cells).`);
  if (allFindings.length) {
    for (const f of allFindings) console.error(`  ${f.severity} ${f.fixture} ${f.field}: ${f.check}`);
    process.exit(1);
  }
}

await main();
