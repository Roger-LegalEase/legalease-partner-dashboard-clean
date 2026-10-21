#!/usr/bin/env node
// Route-obligation census v1 — packet family `id_isp_expungement-set`.
//
//   node scripts/build-census-v1-id_isp_expungement-set.mjs
//
// Idaho, expungement of a NON-CONVICTION fingerprint and criminal-history
// record under Idaho Code § 67-3004(10). Route
// `obligation:track-pathway:ID:id_isp_expungement:non-conviction-fingerprint-and-criminal-history-expungement-under-idaho-code-67-3004-10`.
// One document: the Idaho State Police Bureau of Criminal Identification's own
// **Expungement Application**. This is an AGENCY application, not a court
// filing — nothing here is filed with a court and there is no proposed order.
//
// This is not a renderer. Every decision about what may be written is made by
// scripts/rcap-official-forms/rcap-field-semantics.mjs and every byte is
// written by finalizeOfficialForm; this file supplies the family's ROLE
// classification, its explicit mappings and its printed-label corrections, and
// then proves the result from the artifact bytes rather than from its report.
//
// THREE BLANKS THE SHARED BINDER WOULD HAVE FILLED WRONG
//
// This form's field names are terse and its captions run left to right across
// one printed rule, so three widgets bind a fact that belongs somewhere else.
// All three were found by reading the census against the page's own text, and
// all three are refused or corrected here:
//
//   * `Applicants Date of Acquittal or Dismissal` (page 1, y=114.36) binds
//     `participant.full_legal_name`, because the binder matched the word
//     "Applicant" in its name. The canonical fixture would have printed
//     "Jordan Avery Reyes" as the applicant's date of acquittal.
//   * `County of Court Case Number 2` (page 1, x 72.00-532.32 at y=340.32)
//     binds `matter.county`. Measured against the page, that widget is the
//     SECOND printed rule of "Charge(s) applicant seeks to have expunged:" at
//     y=358.2 — the county blank is the widget above it, named
//     `County of Court Case Number 1`. The county would have been printed as an
//     offence.
//   * `MI` (page 1, x 464.66-532.91) binds `participant.last_name`. The printed
//     sub-caption at y=508.0 reads "(last name) (first name) (middle initial)"
//     and the three widgets sit left to right at 156.00-313.16, 317.78-461.31
//     and 464.66-532.91, so `MI` is the middle-initial box and the surname
//     would have been printed in it.
//
// PRINTED-LABEL CORRECTIONS, AND WHY THEY ARE NARROW
//
// The shared binder reaches a fact through the field NAME first and the
// harvested printed caption second. A correction replaces the harvested caption
// for ONE named widget with the printed text this build read at that widget's
// own measured position, and the correction, the harvested value it replaced
// and the evidence are all recorded on the field-map row. Every write is still
// proved from the artifact bytes afterwards, and the name-placement allowlist
// still fails the build if a participant name is drawn anywhere this family did
// not list.
//
// WHAT THIS FORM DOES NOT SAY, AND WHERE THE PACKET SENDS THE PARTICIPANT
//
// Neither this form nor any held record states what, if anything, this
// application costs. The compiled Idaho profile's only no-fee statements are
// keyed to § 67-3004(11) Clean Slate SHIELDING — a different subsection, a
// different remedy and a different destination (a county court rather than a
// state agency) — so under amendment A3 of the fee-and-waiver standard they do
// not answer this route's question. The instructions therefore name the office
// that does: the Idaho State Police Criminal History Unit, at the address and
// fax number the form itself prints.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines, captureWidgetContext, normalizeHarvestedText }
  from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { strokedRectangles } from "./lib/pdf-stroked-boxes.mjs";
import { CHARGE_VALUE_WORDS, captionDescribesChargeValue, descriptorsMatching, protectCategoryOf, decideBinding }
  from "./rcap-official-forms/rcap-field-semantics.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList } = require("pdf-lib");


const FAMILY_ID = "id_isp_expungement-set";
const OUT = "data/rcap-all50/overlays/census-v1/id/id-isp-expungement-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const ROUTE_KEY = "obligation:track-pathway:ID:id_isp_expungement:non-conviction-fingerprint-and-criminal-history-expungement-under-idaho-code-67-3004-10";

const fail = (message, detail = null) => {
  console.error(`build-census-v1-${FAMILY_ID}: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was written.");
  process.exit(1);
};

const DOCUMENTS = [
  {
    key: "application",
    documentId: "ISP-BCI-EXPUNGEMENT-APPLICATION",
    documentRole: "AGENCY_APPLICATION",
    officialTitle: "Idaho State Police, Bureau of Criminal Identification — Expungement Application",
    revision: "REV-UNKNOWN",
    sha256: "7442267d7799b9b117b20494b919a875974e8086f1317c7bc7532f038c131bcf",
    pathInArchive: "STATES/ID/05_SOURCE_GATED/ID__SOURCE-GATED__ISP-BCI__idaho-state-police-bureau-of-criminal-identification-expungement-application__REV-UNKNOWN__EN.pdf",
    ownership: "participant_completed",
    captionOnly: false,

    printedLabelCorrections: {
      "MI": {
        printedLabel: "middle initial",
        readFrom: "page 1, printed sub-caption at y=508.0: \"(last name) (first name) (middle initial)\", under the \"Applicant Name:\" rule at y=522.6",
        measuredEvidence: "the three name widgets sit left to right on that rule at x 156.00-313.16, 317.78-461.31 and 464.66-532.91; this is the third, under \"(middle initial)\"",
        why: "The widget's own name is \"MI\", which the shared binder read as a surname: it would have printed the applicant's LAST name in the middle-initial box, beside the last name already written in the box to its left."
      },
      "Applicants Date of Acquittal or Dismissal": {
        printedLabel: "Applicant's Date of Acquittal or Dismissal",
        readFrom: "page 1, printed line at y=115.7: \"Applicant's Date of Acquittal or Dismissal: _________________________________\"",
        measuredEvidence: "the widget occupies x 283.68-480.84 at y=114.36, on that line and to the right of the printed caption",
        why: "Recorded so the field-map row says what the blank is. It does NOT change the binding — the shared binder matched \"Applicant\" in the field's own NAME and selected participant.full_legal_name before the label channel was consulted — which is why the blank is also refused by role below."
      },
      "County of Court Case Number 2": {
        printedLabel: "Charge(s) applicant seeks to have expunged — second printed rule",
        readFrom: "page 1: the caption \"Charge(s) applicant seeks to have expunged:\" is printed at y=358.2 and its list continues on the unlabelled rule at y=341.6",
        measuredEvidence: "this widget occupies x 72.00-532.32 at y=340.32, the full-width rule below the charges caption; the COUNTY blank is the widget above it at y=374.04, named \"County of Court Case Number 1\", on the printed line \"County of Court Case Number:\" at y=374.8",
        why: "Its own name says county and its position says charges. Left alone the shared binder writes matter.county onto the second line of the offence list."
      },
      "I was arrested on": {
        printedLabel: "I was arrested on — arrest date",
        readFrom: "page 1, printed line at y=408.1: \"I was arrested on: _________________________________________________ for this crime.\"",
        measuredEvidence: "the widget occupies x 161.88-454.80 at y=407.76, between the printed \"I was arrested on:\" and the printed \"for this crime.\"",
        why: "The field's own name reaches no descriptor at all, so the arrest date the platform holds had no channel to the form. The correction names the fact the printed sentence asks for, and the explicit mapping below authorises it."
      },
      "I was charged for the crime of": {
        printedLabel: "I was charged for the crime of — charge",
        readFrom: "page 1, printed line at y=424.8: \"I was charged for the crime of: ___________________________________________________\"",
        measuredEvidence: "the widget occupies x 223.68-528.48 at y=424.56, to the right of that printed caption",
        why: "The field's own name reaches no descriptor, so the offence the platform holds had no channel to this blank. The correction names the fact the printed sentence asks for, and the explicit mapping below authorises it."
      }
    },

    // matter.charge and matter.arrest_date are requiresExplicitMapping
    // descriptors: the caller must name them or nothing binds.
    explicitMappings: {
      "Charges applicant seeks to have expunged": "matter.charge",
      "I was charged for the crime of": "matter.charge",
      "I was arrested on": "matter.arrest_date"
    },

    unwritable: [
      { field: "Applicants Date of Acquittal or Dismissal", class: "acquittal_or_dismissal_date_not_held",
        why: "The date of acquittal or dismissal. Two separate reasons. First, the shared binder matched \"Applicant\" in the field's own name and would have printed the applicant's full legal name here. Second, the platform holds matter.disposition_date as a generic disposition date and does not establish that it is a date of ACQUITTAL or DISMISSAL — on this non-conviction route that is the whole question, and writing a disposition date under that caption would assert an acquittal the platform has not established." },
      { field: "County of Court Case Number 2", class: "offence_list_continuation_rule",
        why: "The second printed rule of \"Charge(s) applicant seeks to have expunged\". Its own name says county; the shared binder would have written matter.county onto the offence list." },
      { field: "Date", class: "participant_signature_date",
        why: "The date beside \"Signature of Requestor\" on page 2. Dating a signature that has not been made asserts the application was signed on a day it was not." },
      { field: "MI", class: "middle_initial_not_held",
        why: "The \"(middle initial)\" box of the Applicant Name rule. Two reasons, and either alone is enough. The shared binder reads the field's own NAME first and \"MI\" matches its surname descriptor, so left alone it writes the applicant's LAST name into the middle box beside the last name already written to its left. And the platform holds a middle NAME, not an initial: this build writes held facts verbatim and does not derive a new fact from one it holds. With the printed caption corrected, the shared protect rules also refuse the blank, reading \"initial\" as an initialling field." }
    ],

    completeness: {
      defaultBlank: null,
      fields: {
        "Date": { refusalClass: "signature_or_date_participant_completion",
          reason: "The date beside \"Signature of Requestor\" on page 2, completed by the participant when the application is signed." },
        "Applicants Date of Acquittal or Dismissal": { requiredBeforeFiling: true,
          reason: "The applicant's date of acquittal or dismissal, on page 1. The platform holds a generic disposition date for this matter and does not establish that it is the date the charges were dismissed or the date of an acquittal; on a § 67-3004(10) application that is the fact the whole request turns on, so the participant takes it from the certified court order they must enclose and writes it before sending." },
        "MI": { requiredBeforeFiling: true,
          reason: "The \"(middle initial)\" box of the Applicant Name rule on page 1. The platform holds a middle name and holds no middle-initial fact, and this build does not derive one from the other; the participant writes the initial before sending. Their last name and first name are written in the two boxes to its left." },
        "County of Court Case Number 2": { refusalClass: null,
          reason: "The second printed rule of the charges block. The offence the platform holds is written on the first rule; a further charge from the same arrest is the participant's to add, and the platform does not invent it." }
      }
    }
  }
];

// The ONLY blanks in this family that may ever carry the participant's name.
const NAME_MAY_APPEAR_IN = {
  "ISP-BCI-EXPUNGEMENT-APPLICATION": [
    "Applicant Last Name",  // "(last name)" box of the Applicant Name rule
    "First Name",           // "(first name)" box of the same rule
    "MI"                    // "(middle initial)" box of the same rule
  ]
};

// The corpus's standard canonical and boundary participants, so this family's
// fixtures are comparable with every other family's.
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
const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "participant.city": "Unincorporated Township of Long Hollow Crossing",
  "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, XX 01234-9999",
  "participant.zip": "01234-9999", "participant.phone": "555-0142 ext. 44821",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201",
  "matter.county": "Saint Bartholomew and the Northern Reaches County",
  "matter.charge": "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line",
  "matter.charges": [
    { case_number: "0123-45-2026-CR-900123.00-AB-CDE/2201", citation_number: "C-889201",
      charge: "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line",
      arrest_date: "2019-03-08", offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" },
    { case_number: "0123-45-2026-CR-900124.00", citation_number: "C-889202", charge: "Criminal trespass, third degree",
      arrest_date: "2020-06-21", offense_date: "2020-06-20", conviction_date: "2021-02-09", disposition_date: "2021-03-01" },
    { case_number: "0123-45-2026-CR-900125.00", citation_number: "C-889203", charge: "Driving while license suspended",
      arrest_date: "2021-09-02", offense_date: "2021-09-02", conviction_date: "2022-01-18", disposition_date: "2022-02-14" }
  ]
};

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
function resolveSource(doc) {
  const index = readJson(CORPUS_INDEX);
  const entry = (index.entries ?? []).find((e) => e.path === doc.pathInArchive);
  if (!entry) fail(`${doc.documentId}: not present in ${CORPUS_INDEX}`, doc.pathInArchive);
  if (entry.sha256 !== doc.sha256) {
    fail(`${doc.documentId}: the corpus index declares a different hash`,
      `index ${entry.sha256} / family ${doc.sha256}`);
  }
  const abs = path.join(rootDir, CORPUS_ROOT, doc.pathInArchive);
  if (!fs.existsSync(abs)) {
    fail(`${doc.documentId}: the pinned source is not installed`,
      `expected ${CORPUS_ROOT}/${doc.pathInArchive} — run scripts/rcap-corpus/bootstrap-private-corpus.sh`);
  }
  const bytes = fs.readFileSync(abs);
  const got = sha256(bytes);
  if (got !== doc.sha256) fail(`${doc.documentId}: SOURCE DRIFT`, `expected ${doc.sha256}, read ${got}`);
  if (bytes.length !== entry.byteLength) {
    fail(`${doc.documentId}: byte length disagrees with the corpus index`,
      `index ${entry.byteLength}, read ${bytes.length}`);
  }
  return { bytes, indexEntry: entry };
}

// ---- census with MEASURED geometry --------------------------------------------
async function censusDocument(doc, bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  const form = pdf.getForm();

  const linesByPage = pages.map((p) => groupIntoLines(extractTextItems(p)));
  const documentTextLines = linesByPage.flat().map((l) => normalizeHarvestedText(l.text));

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
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_from_the_document"
      };
    });
    for (const w of widgets) {
      if (!widgetsForCapture.has(w.page)) widgetsForCapture.set(w.page, []);
      widgetsForCapture.get(w.page).push({ name, rect: w.rect });
    }
    return {
      name, type, widgets,
      // Read from the document, not assumed. See maxLengthOverflows(): pdf-lib
      // THROWS on a value longer than a text field's declared /MaxLen rather
      // than reporting it unfittable, so a value that will not fit has to be
      // refused before the finalizer is asked to write it.
      maxLength: type === "text" ? (f.getMaxLength() ?? null) : null
    };
  });

  const context = new Map();
  pages.forEach((page, i) => {
    const list = widgetsForCapture.get(i + 1) ?? [];
    if (!list.length) return;
    for (const c of captureWidgetContext(page, list, { precomputedLines: linesByPage[i], isFirstPage: i === 0 })) {
      if (!context.has(c.name)) context.set(c.name, c);
    }
  });

  const ruleUnder = (page, rect) => {
    const candidates = (strokedByPage.get(page) ?? []).filter((s) =>
      s.height <= 3
      && Math.min(s.x1, rect.x + rect.width) - Math.max(s.x0, rect.x) > rect.width * 0.4
      && rect.y - s.y1 >= -3 && rect.y - s.y1 <= 12);
    if (!candidates.length) return null;
    const best = candidates.sort((a, b) => (rect.y - a.y1) - (rect.y - b.y1))[0];
    return { x0: best.x0, x1: best.x1, y: best.y1, construction: best.construction };
  };

  // Printed-label corrections. See the header note: each replaces the harvested
  // caption for ONE named widget with the printed text this build read at that
  // widget's own measured position. The harvested value it replaces is kept
  // beside it so both answers stay visible.
  const corrections = doc.printedLabelCorrections ?? {};
  const censusFields = fields.map((f) => {
    const c = context.get(f.name) ?? {};
    const w = f.widgets[0] ?? null;
    const correction = Object.hasOwn(corrections, f.name) ? corrections[f.name] : null;
    const harvested = c.effectiveLabel ?? null;
    const effective = correction ? correction.printedLabel : harvested;
    const subject = effective ?? f.name;
    return {
      name: f.name,
      type: f.type,
      maxLength: f.maxLength ?? null,
      effectiveLabel: effective,
      harvestedLabel: harvested,
      printedLabelCorrection: correction,
      labelBasis: correction
        ? "printed_page_text_read_at_the_measured_widget_position"
        : (c.labelBasis ?? null),
      regionHeading: c.regionHeading ?? null,
      widgets: f.widgets,
      captionDescribesChargeValue: captionDescribesChargeValue(subject),
      captionOrNameMentionsCharge: CHARGE_VALUE_WORDS.test(subject) || CHARGE_VALUE_WORDS.test(f.name),
      protectCategory: protectCategoryOf(subject) ?? protectCategoryOf(f.name) ?? null,
      descriptorsByName: descriptorsMatching(f.name).map((d) => d.factId),
      descriptorsByLabel: effective ? descriptorsMatching(effective).map((d) => d.factId) : [],
      measuredRuleUnderWriteBox: w ? ruleUnder(w.page, w.rect) : null
    };
  });

  return {
    pdf, pages, fields: censusFields, documentTextLines,
    pageGeometry: pages.map((p, i) => ({ page: i + 1, width: +p.getSize().width.toFixed(2), height: +p.getSize().height.toFixed(2) })),
    strokedByPage
  };
}


/**
 * Values this fixture cannot place, because the FORM says the blank is too short.
 *
 * A text widget may declare /MaxLen. pdf-lib's setText throws
 * ExceededMaxLengthError when a value is longer, and the shared finalizer does
 * not catch it — so a fixture carrying a longer value does not produce a report
 * saying the value did not fit, it produces no artifact at all. The Idaho
 * shielding petition found this: its filer-name widget declares /MaxLen 35 and
 * the corpus's standard boundary participant's name is 70 characters, and the
 * build died on the second fixture after writing the first.
 *
 * That is a defect in the shared finalizer and not in this packet, and it is not
 * repaired here — rcap-text-fitting.mjs is outside this family's owned paths and
 * every other family shares it. What is done here instead is to ask the same
 * question BEFORE the finalizer is called, using the same binder, and to refuse
 * by role any field whose resolved value exceeds the length the form itself
 * declares. The refusal is per FIXTURE, because it depends on the value: the
 * canonical participant fits and the boundary participant does not, which is
 * exactly what a boundary fixture is for.
 */
function maxLengthOverflows(doc, census, facts) {
  const availableChargeRows = Array.isArray(facts?.["matter.charges"]) ? facts["matter.charges"].length : 0;
  const found = [];
  for (const f of census.fields) {
    if (f.maxLength === null || f.maxLength === undefined) continue;
    const decision = decideBinding(
      { name: f.name, pdfType: f.type, effectiveLabel: f.effectiveLabel ?? null },
      {
        explicitMappings: doc.explicitMappings ?? {},
        captionOnly: doc.captionOnly === true,
        availableChargeRows,
        documentAcceptsFill: true
      }
    );
    if (decision.writable !== true || !decision.factId) continue;
    const value = resolveFact(facts, decision.factId);
    if (value === undefined || value === null) continue;
    const length = String(value).length;
    if (length <= f.maxLength) continue;
    found.push({
      field: f.name,
      class: "exceeds_form_declared_max_length",
      factId: decision.factId,
      maxLength: f.maxLength,
      valueLength: length,
      why: `The form declares /MaxLen ${f.maxLength} on this widget and the value for ${decision.factId} is `
        + `${length} characters. The blank cannot hold it, so it is left for the participant rather than truncated.`
    });
  }
  return found;
}

// ---- prove it from the ARTIFACT, not from the report --------------------------
async function verifyFromBytes({ file, census, report, label, documentId }) {
  const drawn = await flattenedWidgets(file);
  const findings = [];
  const chargeBlanks = [];

  for (const field of census.fields) {
    const w = field.widgets[0];
    if (!w) continue;
    const here = drawnAt(drawn, { page: w.page, rect: w.rect, tolerance: 3 })
      .map((d) => d.text).filter((t) => t && t.trim() !== "");
    const text = here.join(" ").trim();
    const wasWritten = report.written.some((x) => x.field === field.name);

    if (field.captionOrNameMentionsCharge) {
      const hit = NAME_TOKENS.filter((tok) => text.toLowerCase().includes(tok.toLowerCase()));
      chargeBlanks.push({
        field: field.name, page: w.page, rect: w.rect,
        effectiveLabel: field.effectiveLabel,
        captionDescribesChargeValue: field.captionDescribesChargeValue,
        drawnText: text === "" ? null : text,
        participantNameTokensFound: hit
      });
      if (hit.length) {
        findings.push({ severity: "blocking", fixture: label, field: field.name,
          check: "participant_name_in_a_charge_caption_blank", drawnText: text, tokens: hit });
      }
    }

    if (!wasWritten && text !== "") {
      findings.push({ severity: "blocking", fixture: label, field: field.name,
        check: "refused_field_carries_ink", drawnText: text });
    }
    if (wasWritten && text === "") {
      findings.push({ severity: "blocking", fixture: label, field: field.name,
        check: "written_field_is_blank_on_the_paper" });
    }
  }

  const mustBeBlank = census.fields.filter((f) =>
    /signature|^full date( \d+)?$|^judge$/i.test(f.name)
    || f.type === "signature"
    || /certificate\s*of\s*service/i.test(f.regionHeading ?? ""));
  for (const f of mustBeBlank) {
    const w = f.widgets[0];
    if (!w) continue;
    const text = drawnAt(drawn, { page: w.page, rect: w.rect, tolerance: 3 })
      .map((d) => d.text).join(" ").trim();
    if (text !== "") {
      findings.push({ severity: "blocking", fixture: label, field: f.name,
        check: "signature_date_or_service_field_is_not_blank", drawnText: text });
    }
  }

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

  const outside = drawn.filter((appearance) => {
    if (!String(appearance.text ?? "").trim()) return false;
    return !census.fields.some((f) => f.widgets.some((w) =>
      w.page === appearance.page
      && Math.abs(w.rect.x - appearance.x) <= 3 && Math.abs(w.rect.y - appearance.y) <= 3));
  });

  return {
    findings, chargeBlanks, namePlacements,
    appearancesDrawn: drawn.length,
    appearancesOutsideMeasuredWriteBoxes: outside.length
  };
}

// ---- the shared completeness contract's own channel ---------------------------
function completenessFields({ doc, census, written }) {
  const writtenBy = new Map(written.map((w) => [w.field, w]));
  const refusedBy = new Map((doc.completeness?.fields ? Object.entries(doc.completeness.fields) : []));
  const roleWhy = new Map(doc.unwritable.map((u) => [u.field, u]));
  return census.fields.map((f) => {
    const w = writtenBy.get(f.name);
    const declared = refusedBy.get(f.name) ?? null;
    const policy = declared ?? doc.completeness?.defaultBlank ?? null;
    const role = roleWhy.get(f.name) ?? null;
    const row = {
      field: f.name,
      fieldId: f.name,
      effectiveLabel: f.effectiveLabel,
      harvestedLabel: f.harvestedLabel ?? null,
      labelBasis: f.labelBasis ?? null,
      page: f.widgets?.[0]?.page ?? null,
      pdfType: f.type,
      isSelectionControl: f.type === "checkbox" || f.type === "radio",
      decision: w ? "write" : "refuse",
      factId: w?.factId ?? null,
      buildRoleClass: role?.class ?? null,
      buildRoleWhy: role?.why ?? null
    };
    if (w) return row;
    row.reason = policy?.reason ?? null;
    row.refusalClass = policy?.refusalClass ?? null;
    if (policy?.requiredBeforeFiling === true) row.requiredBeforeFiling = true;
    return row;
  });
}

function actualWritesArtifacts(documents) {
  return documents.flatMap(({ doc, fixtures }) =>
    ["canonical", "boundary"].map((label) => {
      const proof = fixtures[label].proof;
      return {
        documentId: doc.documentId,
        fixture: label,
        file: fixtures[label].file,
        sha256: fixtures[label].sha256,
        proofMethod:
          "AcroForm fill: every value is set on the document's own widget and its appearance is generated by the "
          + "form. The counts below are read back from the finished PDF with pdf-flattened-widgets.mjs, at each "
          + "field's own measured /Rect.",
        valuesReportedByFinalizer: fixtures[label].report.written.length,
        flattenedWidgetAppearancesReadFromOutputBytes: proof.appearancesDrawn,
        addedGlyphsReadFromOutputBytes: 0,
        addedGlyphsNote:
          "Zero by construction, not by measurement: this family writes through AcroForm widgets rather than by "
          + "drawing into page content, so every mark it makes is a widget appearance and is counted in the "
          + "column beside this one.",
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.appearancesOutsideMeasuredWriteBoxes,
        refusedFieldsWithInk: proof.findings
          .filter((x) => x.check === "refused_field_carries_ink")
          .map((x) => ({ fieldId: x.field, drawnText: x.drawnText })),
        participantNameTokensOutsideTheNameAllowlist: proof.namePlacements.filter((n) => !n.allowed).length
      };
    }));
}

// ---- participant instructions -------------------------------------------------
//
// WHERE EACH OF THE FOUR OBLIGATIONS COMES FROM, AND WHERE NOTHING WAS FOUND
//
// FILING_DESTINATION — held twice, and printed on the form itself. The
//   committed packet-set manifest for id_isp_expungement-set records
//   filingDestination as "Idaho State Police, Bureau of Criminal
//   Identification. Statewide, single agency" with the detail "Mail to 700 S.
//   Stratford Dr., Ste. 120, Meridian, ID 83642, or fax to 208-884-7193", and
//   filingMethod repeats it and adds the 30-day processing note and the
//   incomplete-application rule. Page 2 of the form prints the same address and
//   fax number. Stated.
// FEE_AND_WAIVER — NOT held for this route, and delegated to a named office.
//   Neither pinned page prints an amount. The compiled Idaho profile
//   (src/lib/rcap-engine/compiled/profiles/ID-idaho.json) carries three no-fee
//   statements and every one of them is keyed to § 67-3004(11) Clean Slate
//   SHIELDING — a different subsection, a different remedy, and a filing in a
//   county court rather than an application to a state agency. Under amendment
//   A3 of DETERMINATION_FEE_AND_WAIVER_STANDARD.json, holding is per fact and a
//   record answers only the route it addresses, so those lines do not answer
//   this one. The committed manifest records filingFee and feeWaiverTreatment as
//   not_recorded. So the instruction names the office that answers it: the Idaho
//   State Police Criminal History Unit, at the address and fax the form itself
//   prints. That is A1's named checkable authority, and the address sits in the
//   same paragraph as the money question, as A2's guidance asks.
// SERVICE — held, and the answer is that there is nobody to serve. The manifest
//   records serviceRecipients, serviceMethod and serviceTiming as not_recorded,
//   and the reason is structural rather than missing: the route's processActor
//   is "agency" and its destination is a single state agency. Nothing is filed
//   with a court, no adverse party exists, and the form prints no certificate of
//   service. What the form does require in place of service is DOCUMENTS — page
//   2 lists them — and the instruction states those instead, from the page.
// SELF_HELP_STOP — held on the form's own face. Page 2 prints, in bold, that a
//   person convicted of a sex offense is outside this law and must not submit
//   the form, and page 1 prints that the process does not apply where a
//   conviction was followed by a withheld judgment under § 19-2604(1). The
//   compiled Idaho profile adds the general recommendation to consult an
//   attorney where eligibility is unclear.
// NOT FOUND — no held record and no printed line states a deadline for this
//   application, a fee, an appeal from a refusal, or what happens to the court
//   file. Nothing below states any of them; the same named office is given for
//   the questions that remain.
function participantInstructionsMarkdown() {
  return `# Filing instructions — Expunge an Idaho non-conviction fingerprint and criminal-history record

This packet is one form: the **Idaho State Police, Bureau of Criminal Identification — Expungement Application**, under Idaho Code § 67-3004(10).

**This is not a court filing.** It is an application to a state agency. There is no petition, no proposed order, no hearing, and nobody to serve. You send it to the Idaho State Police and they either process it or return it to you.

The form prints the statute it runs on, and it is worth reading before you send anything. § 67-3004(10) reaches a person who **was arrested or served a criminal summons and was not charged by indictment or information within one year**, a person who **was acquitted of all offenses** arising from that arrest or summons, and a person who **has had all charges dismissed**. The form adds, in its own words, that the provision "shall not apply to any dismissal granted pursuant to section 19-2604(1), Idaho Code" — and page 1 says again, in bold, that if the charges resulted in a conviction and a court then granted a withheld judgment under § 19-2604(1), **the expungement process does not apply to you**.

The platform filled what it holds about you and your case: your last name, first name and middle name in the applicant block, your date of birth, your address, city, state and ZIP, your telephone number, the crime you were charged with, the date you were arrested, the Idaho court case number, the county of that case, and the charge you are asking to have expunged. Everything else is listed below.

**One box in your own name is left blank on purpose.** The form's third name box asks for your middle **initial**. The platform holds your middle *name* and no initial, and this packet does not turn one held fact into a different one, so the box is yours to complete — write the single letter. (It is also the box that, left to the form's own field naming, would have received your **surname**: the widget is named \`MI\` inside the PDF and the shared field binder reads that as a last name.)

## Where you send it

**Mail or fax it to the Idaho State Police, Bureau of Criminal Identification.** The address is printed on page 2 of the form and the committed route record for this packet gives the same one:

> Idaho State Police
> 700 S. Stratford Dr., Ste. 120
> Meridian, ID 83642
>
> Fax: 208-884-7193

**Allow about 30 days.** The form prints "PLEASE ALLOW 30 DAYS FOR PROCESSING" and the committed record says the same.

**If you want to be told when it is done**, the form's own note beside the address says to send **a self-addressed stamped envelope with the application**.

## What it costs

**No held record and no line on this form states a fee for a § 67-3004(10) expungement, so this packet does not state one.** That is a deliberate refusal rather than an omission: the compiled Idaho profile this route is built from does carry no-fee statements, but every one of them is about the **Clean Slate shielding petition under § 67-3004(11)**, which is a different subsection, a different remedy, and a filing in a county court rather than an application to a state agency. A no-fee rule for that petition says nothing about this application, and this packet will not borrow it.

**Ask the office that answers it — the Idaho State Police Criminal History Unit, at 700 S. Stratford Dr., Ste. 120, Meridian, ID 83642, or by fax on 208-884-7193**, which is the same office and the same address this application goes to. Ask before you send, and ask in the same call whether anything else is payable, because an application that is not complete comes back.

## What you must send with it

**There is nobody to serve, and there are documents to enclose instead.** Page 2 of the form lists them, and it is explicit about what happens if they are missing: "An incomplete application, or an application that does not include the documentation required above, will not be processed and will be returned to the applicant."

Enclose **copies** of:

1. **one of** — (A) the criminal citation; **or** (B) the criminal complaint and summons, with documentation showing you were served the complaint or summons by the sheriff's office; **or** (C) an indictment; **or** (D) an information;

**and** a **certified copy** of:

2. the **court order of acquittal** stating you are not guilty of the crimes charged; **or**
3. the **court order of dismissal**, showing what crimes were dismissed.

A certified copy comes from the clerk of the court that entered the order, not from your own papers.

## What you must do before you send it

1. **Get the certified court order** of acquittal or dismissal from the clerk of the Idaho court named in the case number on the form, and the citation, complaint and summons, indictment or information that goes with it.
2. **Write the date of your acquittal or dismissal** on page 1. This packet leaves it blank on purpose — see the table below.
3. **Check every prefilled line against the court order and your own details**, and correct anything that does not match. The case number and county in particular must match the order you enclose.
4. **Sign and date page 2**, on the "Signature of Requestor" line. Both are yours and are left blank.
5. **Enclose a self-addressed stamped envelope** if you want to be notified.

## The items you must supply

| Page | The blank on the form | What to write |
| --- | --- | --- |
| 1 | "Applicant's Date of Acquittal or Dismissal:" (inside the PDF, \`Applicants Date of Acquittal or Dismissal\`) | the date the court acquitted you or dismissed the charges, taken from the certified court order you are enclosing. The platform holds a general disposition date for your matter but does not establish that it is the date of an acquittal or a dismissal, and on this application that is the fact the whole request turns on |
| 1 | "(middle initial)" box of the Applicant Name rule (inside the PDF, \`MI\`) | your middle initial — one letter. Your last name and first name are already written in the two boxes to its left |
| 1 | The second rule under "Charge(s) applicant seeks to have expunged" (inside the PDF, \`County of Court Case Number 2\`) | any further charge from the same arrest that you are asking to have expunged. The first rule is filled from what you gave. Leave blank if there is only one |
| 2 | "Signature of Requestor" and "Date" | your signature and the date you sign |

Note the last two field names in that table: this form's widgets do not always carry the name of the blank they cover. The second charges rule is named \`County of Court Case Number 2\` inside the PDF, and the middle-initial box is named \`MI\`. This packet decided which blank is which by measuring the printed page, not by trusting the names — and it had to, because left alone the shared field binder would have printed your county on the charges line, your surname in the middle-initial box, and your full name where the date of acquittal goes.

## What the platform deliberately left blank

- **Your signature on page 2 and the date beside it.** You make the request, not the platform.
- **The date of acquittal or dismissal**, for the reason in the table above.
- **Your middle initial.** The platform holds your middle name and not an initial.
- **The second charges rule**, unless you have a second charge to add.

## Where self-help ends

This packet prepares one form; it does not decide anything. Stop, and get advice from a **lawyer licensed in Idaho** — or put the procedural question to the **Idaho State Police Criminal History Unit** at the address above — before you send it, if any of these is true:

- **you have been convicted of a sex offense.** Page 2 of the form is explicit and in bold: "If you have been convicted of a sex offense, this law does not apply to you. Do not submit this form, nor contact the Criminal History Unit. Instead, visit the frequently asked questions section of the Idaho Central Registry Sex Offender website."
- **your charge ended in a conviction followed by a withheld judgment under Idaho Code § 19-2604(1).** Page 1 says the expungement process does not apply to you, and the statute it quotes excludes those dismissals by name.
- you were charged by indictment or information within a year of the arrest, and you were neither acquitted nor had all charges dismissed — the statute printed on the form does not reach you;
- you cannot obtain a certified court order of acquittal or dismissal. Without it the application is incomplete and will be returned;
- your application is returned and you do not know why. Nothing in this packet or in any held record tells you what to do next, and the Criminal History Unit is the office that can.
- **a § 19-2604 dismissal already happened or is being contemplated**, because the sequencing changes what relief remains. The committed track registry records this as a point where self-help ends, and it reaches a dismissal you are still considering as well as one already entered.
- **the offense classification is genuinely unclear.**
- **the record is federal, tribal, or from another state.** The Idaho State Police Criminal History Unit expunges Idaho records; an application about a record it does not hold cannot be acted on.
- **immigration, professional licensing, peace officer employment, or firearm consequences are in play.**

## What this packet is not

This is a prepared copy of the Idaho State Police's own application form. It is not legal advice, it is not sent for you, and it does not decide whether your record can be expunged under Idaho Code § 67-3004(10).

_Route: ${ROUTE_KEY} — Idaho Code § 67-3004(10)_
`;
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

    const fixtures = {};
    for (const [label, facts] of [["canonical", CANONICAL], ["boundary", BOUNDARY]]) {
      const overflows = maxLengthOverflows(doc, census, facts);
      for (const o of overflows) {
        console.log(`  ${label}: ${o.field} refused — /MaxLen ${o.maxLength} < ${o.valueLength} characters of ${o.factId}`);
      }
      const result = await finalizeOfficialForm({
        sourceBytes: bytes,
        expectedSha256: doc.sha256,
        census: census.fields,
        facts,
        explicitMappings: doc.explicitMappings,
        unwritableFields: [
          ...doc.unwritable.map((u) => ({ field: u.field, class: u.class })),
          ...overflows.map((o) => ({ field: o.field, class: o.class }))
        ],
        captionOnly: doc.captionOnly,
        documentTextLines: census.documentTextLines,
        title: `ID ${doc.documentId}`
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
        + `, sha256=${hash.slice(0, 16)}…  charge-blanks checked=${proof.chargeBlanks.length}`
        + `  findings=${proof.findings.length}`);

      fixtures[label] = { file: rel, sha256: hash, byteLength: result.bytes.length, report: result.report, proof, overflows };
    }

    documents.push({ doc, census, indexEntry, fixtures, sourceByteLength: bytes.length });
  }

  // ---- the records -------------------------------------------------------------
  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID,
    worklistGroupId: FAMILY_ID,
    implementationStrategy: "official_pdf_fill",
    jurisdiction: "ID",
    routeKeys: [ROUTE_KEY],
    custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false,
    whyNoAcquisition:
      "Both document sources resolve to files already in the verified corpus and bind by exact SHA-256. Nothing "
      + "was fetched from a court host. The pinned Master Library was recovered through "
      + "scripts/rcap-corpus/bootstrap-private-corpus.sh, which verifies the archive hash and the corpus's own "
      + "governance checksums before extracting.",
    sourceArchive: "Expungement_AI_RCAP_Master_Library_Edition_1",
    allSourcesExact: true,
    documents: documents.map(({ doc, indexEntry, sourceByteLength }) => ({
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      officialTitle: doc.officialTitle,
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
      "that this is the current official edition of either form",
      "that neither has been superseded since the archive was assembled",
      "that any output is approved for participant delivery"
    ]
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId: FAMILY_ID,
    censusBasis: "first_hand_inspection_of_the_pinned_verified_binary",
    geometryBasis:
      "Every write box is the AcroForm widget's own /Rect, read from the document. No box is derived from a "
      + "label position; captions are captured separately and decide only what a blank means, never where it is.",
    filenameNote:
      "Deliberately NOT named field-census.json. "
      + "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs walks the overlays for that "
      + "exact filename and asserts family and field totals equal counts frozen in a diff record outside this "
      + "family's owned path. Enrolling a new census under that name would change those totals. The guard is not "
      + "weakened or skipped: this family's own charge-caption projection is recorded in "
      + "reports/charge-caption-proof.json.",
    documents: documents.map(({ doc, census }) => ({
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      ownership: doc.ownership,
      captionOnly: doc.captionOnly,
      pageGeometry: census.pageGeometry,
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
    documents: documents.map(({ doc, census, fixtures }) => {
      const written = fixtures.canonical.report.written;
      const byName = new Map(census.fields.map((f) => [f.name, f]));
      return {
        documentId: doc.documentId,
        documentRole: doc.documentRole,
        ownership: doc.ownership,
        captionOnly: doc.captionOnly,
        explicitMappings: doc.explicitMappings,
        printedLabelCorrections: doc.printedLabelCorrections ?? {},
        partialFills: doc.partialFills ?? [],
        partialFillNote:
          "A blank this packet fills only partly. Each entry names what the blank asks for, what was written, what "
          + "was not, and where the participant is told to complete it. Declared here rather than left to be "
          + "discovered on the paper.",
        printedLabelCorrectionNote:
          "Each entry replaced the harvested caption for one named widget with the printed text this build read "
          + "at that widget's own measured position, because the widget's name says nothing or says the wrong "
          + "thing. The harvested value each replaced is kept on the field-census row as harvestedLabel, and the "
          + "evidence for each correction is in the entry itself.",
        roleRefusals: doc.unwritable,
        writeBoxes: written.map((w) => {
          const f = byName.get(w.field);
          return {
            field: w.field,
            factId: w.factId ?? null,
            page: f?.widgets?.[0]?.page ?? null,
            rect: f?.widgets?.[0]?.rect ?? null,
            rectBasis: "acroform_widget_rect_read_from_the_document",
            measuredRuleUnderWriteBox: f?.measuredRuleUnderWriteBox ?? null,
            effectiveLabel: f?.effectiveLabel ?? null
          };
        }),
        refused: fixtures.canonical.report.refused,
        protectedFields: fixtures.canonical.report.protectedFields,
        fields: completenessFields({ doc, census, written })
      };
    })
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1",
    familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    note:
      "What each finished fixture actually carries, read back from its own bytes. The finalizer's report says "
      + "what this build believes it wrote; this says what the paper shows.",
    artifacts: actualWritesArtifacts(documents)
  });

  const chargeBlanks = documents.flatMap(({ doc, fixtures }) =>
    ["canonical", "boundary"].flatMap((label) =>
      fixtures[label].proof.chargeBlanks.map((b) => ({ document: doc.documentId, fixture: label, ...b }))));

  writeJson(`${OUT}/reports/charge-caption-proof.json`, {
    schemaVersion: "rcap-charge-caption-proof/v1",
    familyId: FAMILY_ID,
    question:
      "Does any blank whose caption or field name names a charge, offence, count, statute or violation "
      + "carry a participant name token in the rendered artifact bytes?",
    method:
      "Read back from the flattened appearance streams of each rendered fixture with "
      + "scripts/rcap-official-forms/pdf-flattened-widgets.mjs, at each field's own measured widget rectangle.",
    consistentWith: "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs",
    participantNameTokensSearchedFor: NAME_TOKENS,
    chargeBlanksExamined: chargeBlanks.length,
    chargeBlanksCarryingAParticipantName: chargeBlanks.filter((b) => b.participantNameTokensFound.length).length,
    answer: chargeBlanks.some((b) => b.participantNameTokensFound.length)
      ? "YES — this build is defective"
      : "NO — no participant name lands in any charge-caption blank in any fixture",
    blanks: chargeBlanks,
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
        offending
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
      + "measured rectangle.",
    blanksTheNameMayAppearIn: NAME_MAY_APPEAR_IN,
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
      + "the stale-artifact block and matches none of them.",
    rasterisation: {
      performedHere: false,
      why:
        "This container resolves no browser, so no page raster is produced at build time. The render happens "
        + "centrally in .github/workflows/rcap-packet-raster-acceptance-batch.yml against the exact bytes the "
        + "hashes below pin. This family is BUILT_RASTER_PENDING and no visual obligation is waived by it.",
      rasters: []
    },
    packets: [{
      packetId: FAMILY_ID,
      documents: documents.flatMap(({ doc, fixtures }) =>
        ["canonical", "boundary"].map((label) => `${doc.documentId} (${label})`))
    }],
    artifacts: documents.flatMap(({ doc, fixtures }) =>
      ["canonical", "boundary"].map((label) => ({
        document: doc.documentId, fixture: label,
        file: fixtures[label].file, sha256: fixtures[label].sha256, byteLength: fixtures[label].byteLength,
        fieldsWritten: fixtures[label].report.written.length,
        fieldsRefused: fixtures[label].report.refused.length,
        unfittable: fixtures[label].report.unfittable,
        refusedForExceedingFormDeclaredMaxLength: fixtures[label].overflows ?? []
      })))
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
      + "widening the map: each is either the participant's to complete, the court's, or a value the platform "
      + "does not hold.",
    count: blanksLeft.length,
    blanks: blanksLeft
  });

  fs.writeFileSync(path.join(rootDir, `${OUT}/participant-instructions.md`), participantInstructionsMarkdown());

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    status: "REQUESTED",
    grantedBy: null,
    note:
      "This is a REQUEST for output-level legal review. This build grants no approval, opens no commercial "
      + "route, creates no fulfillment record and marks no packet proven. The family remains not runtime-"
      + "selectable and generationAllowed is false.",
    workTypesAddressed: {
      OFFICIAL_SOURCE_ACQUISITION_REQUIRED:
        "Resolved as custody, not acquisition: both sources were already held and are bound by pinned SHA-256.",
      OFFICIAL_FORM_MAP_REQUIRED:
        "Field map built from measured widget geometry for both documents.",
      ARTIFACT_REVIEW_REQUIRED:
        "Canonical and boundary fixtures rendered and verified from the artifact bytes. Page rasterisation is "
        + "central and pending; this family is BUILT_RASTER_PENDING.",
      OUTPUT_LEGAL_APPROVAL_REQUIRED:
        "NOT addressed. Requested here; a human legal reviewer grants it or does not."
    },
    independentVisualReviewRequired: true
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-build-findings/v1",
    familyId: FAMILY_ID,
    blocking: allFindings.filter((f) => f.severity === "blocking"),
    findingCount: allFindings.length
  });

  console.log(`\n${allFindings.length === 0 ? "OK" : "FINDINGS"}: `
    + `${chargeBlanks.length} charge-caption blanks examined across all fixtures, `
    + `${chargeBlanks.filter((b) => b.participantNameTokensFound.length).length} carrying a participant name.`);
  if (allFindings.length) {
    for (const f of allFindings) console.error(`  ${f.severity} ${f.fixture} ${f.field}: ${f.check}`);
    process.exit(1);
  }
}

await main();
