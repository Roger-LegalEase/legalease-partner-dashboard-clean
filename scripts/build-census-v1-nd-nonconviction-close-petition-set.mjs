#!/usr/bin/env node
// Route-obligation census v1 — packet family `nd-nonconviction-close-petition-set`.
//
//   node scripts/build-census-v1-nd-nonconviction-close-petition-set.mjs
//
// North Dakota, closing a nonconviction court record under N.D.C.C.
// § 12-60.1-05, on the branch where the order of nonconviction was entered
// BEFORE 1 August 2025 and a petition is therefore required. Route
// `obligation:service-branch:ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05:pre_effective_date_petition`.
//
// ONE BINARY, THREE DOCUMENTS.
//
// The North Dakota State Court Administrator's Office publishes the whole
// packet as a single six-page PDF, and the route census binds three source ids
// to it — ND-INSTRUCTIONS-CLOSE-NONCONVICTION, ND-PETITION-CLOSE-NONCONVICTION
// and ND-ORDER-CLOSE-NONCONVICTION — all at the same path and the same
// SHA-256. Measured against the pages:
//
//   pages 1-2  Instructions for Petition to Close Nonconviction Records. No
//              widgets. Not a filing.
//   pages 3-4  Petition to Close Nonconviction Records. Eighteen widgets.
//   pages 5-6  (Proposed) Order on Petition to Close Nonconviction Records.
//              TWO widgets, both checkboxes in its paragraph 3. Its caption
//              carries no widgets at all, and the printed instructions on page
//              2 say why: "Fill in the top (caption) exactly as you filled in
//              the top of your Petition." The participant writes it by hand.
//
// So this family renders one fixture per participant, because the source is one
// document; the three bound source ids are recorded on the receipt as
// `boundSourceIds` and the single rendered artifact is the whole packet.
//
// THE PROPOSED ORDER'S TWO CHECKBOXES ARE THE PARTICIPANT'S, WHICH IS UNUSUAL
//
// Every other proposed order in this corpus is the court's instrument below its
// caption. This one is not, and the form says so: page 2 of the printed
// instructions tells the participant "Paragraph 3: Read the two statements. If
// you checked both dismissal boxes on your Petition, check the first box. If
// you checked the acquittal box on your Petition, check the second box", and
// then "Don't sign or date the form. If the judge uses your proposed order, the
// judge signs." So the order's paragraph 3 boxes are classified as participant
// elections and its signature line is left to the judge — which is what the
// document itself directs.
//
// FOUR BLANKS THE SHARED BINDER WOULD HAVE FILLED WRONG
//
//   * `country` (page 4, x 371.04-484.56) binds `participant.state`. It is the
//     COUNTRY blank in the perjury declaration's place-of-signing line, "Signed
//     on ______(date) in ______(city), ______(county), ______(state),
//     ______(country)". The canonical fixture would have printed "XX" as the
//     country.
//   * `state` (page 4) binds `participant.state` too, and that blank is the
//     state where the declaration is SIGNED, not the participant's state of
//     residence. It is refused with the rest of the place-of-signing group: the
//     participant completes all five at the moment they sign.
//   * `Judicial District` (page 3 caption) binds `matter.court`, whose canonical
//     value is "District Court" — so the caption would have read "Judicial
//     District: District Court". The printed instructions say the blank may be
//     left empty: "If you don't know the Judicial District, you may leave that
//     space blank."
//   * `Printed Name` (page 4) is refused as a signature field, because its
//     harvested caption is "(Signature)" — the caption of the rule ABOVE it.
//     Measured, it is the rule at y=342.4 whose own caption "(Printed Name)" is
//     printed at y=327.7 beneath it, and it takes the petitioner's name.
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
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines, captureWidgetContext, normalizeHarvestedText }
  from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { HORIZONTAL_PADDING, usableWidthOf } from "./rcap-official-forms/rcap-text-fitting.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { strokedRectangles } from "./lib/pdf-stroked-boxes.mjs";
import { CHARGE_VALUE_WORDS, captionDescribesChargeValue, descriptorsMatching, protectCategoryOf, decideBinding }
  from "./rcap-official-forms/rcap-field-semantics.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList } = require("pdf-lib");


const FAMILY_ID = "nd-nonconviction-close-petition-set";
const OUT = "data/rcap-all50/overlays/census-v1/nd/nd-nonconviction-close-petition-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const ROUTE_KEY = "obligation:service-branch:ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05:pre_effective_date_petition";

const fail = (message, detail = null) => {
  console.error(`build-census-v1-${FAMILY_ID}: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was written.");
  process.exit(1);
};

const DOCUMENTS = [
  {
    key: "packet",
    documentId: "ND-PETITION-AND-ORDER-CLOSE-NONCONVICTION",
    documentRole: "PETITION_AND_PROPOSED_ORDER",
    officialTitle: "Instructions, Petition and (Proposed) Order to Close Nonconviction Records (N.D.C.C. § 12-60.1-05)",
    revision: "REV-2025-08-01",
    sha256: "21b3a790b35f35c345560d9840bf39ca6f1e46cf1b9166c0e5ae2cf8ff7e4d7f",
    pathInArchive: "STATES/ND/02_PACKET_FORMS/ND__FORM__EXPERTISE__instructions-for-petition-to-close-nonconviction-records__REV-2025-08-01__EN.pdf",
    ownership: "participant_completed",
    captionOnly: false,
    boundSourceIds: [
      "official-form:ND-INSTRUCTIONS-CLOSE-NONCONVICTION",
      "official-form:ND-PETITION-CLOSE-NONCONVICTION",
      "official-form:ND-ORDER-CLOSE-NONCONVICTION"
    ],
    parts: [
      { pages: "1-2", what: "Instructions for Petition to Close Nonconviction Records", widgets: 0, isAFiling: false },
      { pages: "3-4", what: "Petition to Close Nonconviction Records", widgets: 18, isAFiling: true },
      { pages: "5-6", what: "(Proposed) Order on Petition to Close Nonconviction Records", widgets: 2, isAFiling: true }
    ],

    printedLabelCorrections: {
      "Printed Name": {
        printedLabel: "Petitioner printed name",
        readFrom: "page 4, printed caption at y=327.7: \"(Printed Name)\", beneath the rule at y=342.4",
        measuredEvidence: "the widget occupies x 72.00-287.16 at y=341.04, on that rule; the SIGNATURE rule is above it at y=386.3 with its own caption \"(Signature)\" at y=371.6, and carries no widget at all",
        why: "Its harvested caption is \"(Signature)\" — the caption of the rule above — so the shared protect rules refused the petitioner's own printed name as a signature field."
      },
      "Judicial District": {
        printedLabel: "Judicial District of the criminal case",
        readFrom: "page 3, printed caption line at y=681.7: \"County of                Judicial District\"",
        measuredEvidence: "the widget occupies x 275.36-393.10 at y=679.42, to the left of the printed words \"Judicial District\"; the County widget sits at x 126.60-262.20 on the same line",
        why: "The widget harvests no caption, and its own name reaches matter.court — whose held value is a court NAME, not a numbered judicial district. Left alone the caption reads \"Judicial District: District Court\". The correction names the blank; the role refusal below keeps it empty, as the form's own instructions permit."
      },
      "date": {
        printedLabel: "the date this declaration is signed",
        readFrom: "page 4, printed line at y=474.2: \"Signed on ________________(date) in _____________________________(city),\"",
        measuredEvidence: "the widget occupies x 158.52-254.16 at y=472.92, over the first blank on that line",
        why: "The widget is named \"date\" and harvests the fragment \"true and correct\" from the sentence above."
      },
      "city": {
        printedLabel: "the city where this declaration is signed",
        readFrom: "page 4, the same printed line at y=474.2, whose second blank is captioned \"(city)\"",
        measuredEvidence: "the widget occupies x 297.96-471.36 at y=472.92, over that second blank",
        why: "Its harvested caption is the whole sentence fragment, which the shared protect rules read as a signature field. Naming it is what lets the field map say which of the five place-of-signing blanks it is."
      },
      "county": {
        printedLabel: "the county where this declaration is signed",
        readFrom: "page 4, printed line at y=445.0: \"_________________________(county), ___________(state), ___________________(country).\"",
        measuredEvidence: "the widget occupies x 72.00-221.40 at y=443.64, over the blank captioned \"(county)\"",
        why: "Same as the city beside it: named so the field map can say which blank it is."
      },
      "state": {
        printedLabel: "the state where this declaration is signed",
        readFrom: "page 4, the same printed line at y=445.0, whose second blank is captioned \"(state)\"",
        measuredEvidence: "the widget occupies x 267.84-333.60 at y=443.64",
        why: "The widget's own name reaches participant.state — the participant's state of residence — and this blank is where the declaration is SIGNED. The correction names it; the role refusal below keeps it with the rest of its group."
      },
      "country": {
        printedLabel: "the country where this declaration is signed",
        readFrom: "page 4, the same printed line at y=445.0, whose third blank is captioned \"(country)\"",
        measuredEvidence: "the widget occupies x 371.04-484.56 at y=443.64, over the blank closing the sentence before the full stop",
        why: "The widget's own name reaches nothing, and its harvested caption carried the word \"state\" from the printed line, so the shared binder wrote participant.state into the COUNTRY blank: the canonical fixture would have printed \"XX\" as the country."
      },
      "Defendant Name": {
        printedLabel: "Comes Now Petitioner, name of the Defendant",
        readFrom: "page 3, printed paragraph 1 at y=523.6: \"1. Comes Now Petitioner, , the Defendant in the above-entitled case\"",
        measuredEvidence: "the widget occupies x 224.81-451.53 at y=522.24, in the gap between \"Comes Now Petitioner,\" and \", the Defendant\"",
        why: "Recorded so the field map distinguishes this blank from the caption's Defendant line; the binding is unchanged."
      }
    },

    explicitMappings: {},

    unwritable: [
      // The place-of-signing group, all five together.
      { field: "date", class: "place_and_date_of_signing",
        why: "The date in \"Signed on ______(date) in ______(city), ______(county), ______(state), ______(country)\", which closes a declaration made under penalty of perjury. Dating a declaration that has not been made asserts it was made on a day it was not." },
      { field: "city", class: "place_and_date_of_signing",
        why: "The city where the declaration is signed. Nobody can know it before the participant signs." },
      { field: "county", class: "place_and_date_of_signing",
        why: "The county where the declaration is signed. On the same footing as the city." },
      { field: "state", class: "place_and_date_of_signing",
        why: "The state where the declaration is signed. The shared binder wrote the participant's state of RESIDENCE into it, which is a different fact and is not necessarily the same answer." },
      { field: "country", class: "place_and_date_of_signing",
        why: "The country where the declaration is signed. The shared binder wrote the participant's state into it, so the canonical fixture would have named \"XX\" as a country." },

      { field: "Judicial District", class: "judicial_district_not_held",
        why: "The judicial district in the petition's caption. The shared binder reaches matter.court here, whose held value is a court name rather than a numbered judicial district, and the form's own printed instructions say the blank may be left empty: \"If you don't know the Judicial District, you may leave that space blank.\"" }
    ],

    completeness: {
      defaultBlank: null,
      fields: {
        "date": { refusalClass: "signature_or_date_participant_completion",
          reason: "The date in the petition's declaration under penalty of perjury, completed by the participant at the moment they sign." },
        "city": { refusalClass: "signature_or_date_participant_completion",
          reason: "The city where the participant signs the declaration under penalty of perjury, completed when the declaration is signed." },
        "county": { refusalClass: "signature_or_date_participant_completion",
          reason: "The county where the participant signs the declaration, completed when the declaration is signed." },
        "state": { refusalClass: "signature_or_date_participant_completion",
          reason: "The state where the participant signs the declaration, completed when the declaration is signed. It is not the participant's state of residence, which is a different fact." },
        "country": { refusalClass: "signature_or_date_participant_completion",
          reason: "The country where the participant signs the declaration, completed when the declaration is signed." },

        "Judicial District": { refusalClass: null,
          reason: "The judicial district in the caption. The form's own printed instructions say \"If you don't know the Judicial District, you may leave that space blank\", so it is the participant's to add if they know it, and the platform does not invent it." },

        // Paragraph 3 of the petition: the three sworn eligibility statements.
        "Check Box7": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 3's first statement — \"The dismissal was not the result of a plea agreement involving a conviction on another criminal offense.\" The printed instructions say that if the participant cannot check all three boxes they cannot use this form; which are true is a sworn statement about their own case." },
        "Check Box8": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 3's second statement — \"The dismissal was not due to a finding that Petitioner was not fit to proceed under Chapter 12.1-04\". On the same footing." },
        "Check Box9": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 3's third statement — \"The acquittal was not the result of a not guilty verdict due to Petitioner's lack of criminal responsibility under Chapter 12.1-04.1\". On the same footing." },

        // Paragraph 3 of the PROPOSED ORDER, which this form directs the
        // participant to complete. See the header note.
        "Check Box10": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The proposed order's paragraph 3 \"Dismissal\" box. Unusually for a proposed order, the form's own printed instructions direct the participant to mark it: \"If you checked both dismissal boxes on your Petition, check the first box.\" It follows the participant's own election on the petition." },
        "Check Box11": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The proposed order's paragraph 3 \"Acquittal\" box, marked by the participant on the same printed direction: \"If you checked the acquittal box on your Petition, check the second box.\"" }
      }
    }
  }
];

// The ONLY blanks in this family that may ever carry the participant's name.
const NAME_MAY_APPEAR_IN = {
  "ND-PETITION-AND-ORDER-CLOSE-NONCONVICTION": [
    "Defendant",       // page 3 caption, the Defendant line
    "Defendant Name",  // page 3 paragraph 1, "Comes Now Petitioner, ______"
    "Printed Name",    // page 4, the printed-name rule under the signature
    "Email Address"    // page 4, the petitioner's email, which contains their surname
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
// Every one of the four is answered twice here: by a committed record and by the
// packet's own printed instruction pages, which are pages 1 and 2 of the bound
// binary. Where the two agree the instruction states the answer and cites both.
//
// FILING_DESTINATION — held. The committed packet-set manifest records
//   filingDestination as "The North Dakota district court or municipal court in
//   which the criminal case is filed", with the detail "Clerk of Court of the
//   court holding the criminal case. Filed in the existing criminal case."
//   Page 2 of the printed instructions says the same: "File the original of your
//   completed, dated, and signed Petition with the Clerk of Court where your
//   criminal case is filed", and gives ndcourts.gov/court-locations.
// FEE_AND_WAIVER — held, as an amount, three times over. The manifest's
//   filingFee entry reads "none." and adds "§ 12-60.1-05(4) and the official
//   instructions both state there is no filing fee"; its feeWaiverTreatment
//   entry reads "not applicable; there is no fee"; and page 2 of the printed
//   instructions says "There's no filing fee." All are keyed to this exact
//   route, so amendment A3 is satisfied.
// SERVICE — held, and the honest answer is CONDITIONAL. The manifest records
//   serviceRecipients, serviceMethod and serviceTiming all as "None required by
//   the statute", and its filing-destination detail adds the qualification:
//   "The individual judge may require the petition to be served on the
//   prosecutor; the official instructions flag it as a possibility rather than a
//   rule." Page 2 of the printed instructions says exactly that: "The individual
//   judge in your case may require you to serve a copy of the Petition on the
//   Prosecutor." Both halves are stated below, with the clerk named as the
//   authority for which applies in a particular case.
// SELF_HELP_STOP — held on the printed page, and it is unusually blunt. Page 1
//   opens: "The ND Legal Self Help Center can't provide assistance in criminal
//   matters and doesn't have forms, procedures, or expertise available in this
//   area. If you have questions about this form, contact the office of the Clerk
//   of Court where your criminal case is currently filed." Page 1 also states
//   the five eligibility conditions and says twice that a participant who cannot
//   meet them "can't use this form".
// NOT FOUND — no held record and no printed line states a deadline for filing
//   the petition, or what to do if the court does not act. Nothing below states
//   either; the clerk of court is named for both.
function participantInstructionsMarkdown() {
  return `# Filing instructions — Close a North Dakota nonconviction court record (N.D.C.C. § 12-60.1-05)

This packet is one six-page document published by the North Dakota State Court Administrator's Office, and it contains three things:

| Pages | What it is | Whose it is |
| --- | --- | --- |
| 1–2 | **Instructions** for the petition | read them; you file nothing from these pages |
| 3–4 | **Petition to Close Nonconviction Records** | yours — this is what you file |
| 5–6 | **(Proposed) Order on Petition to Close Nonconviction Records** | you complete two boxes on it and nothing else; the judge signs it |

**Read pages 1 and 2.** They are the court administrator's own instructions and they say things this page repeats but does not replace.

## First: are you sure you need to file anything at all?

**If the court entered the order of nonconviction on or after 1 August 2025, do nothing.** Page 2 of the printed instructions is explicit: "If a North Dakota state district court or municipal court entered an order of nonconviction on or after August 1, 2025, you don't need to do anything. After 61 days from the date the court entered the order of nonconviction, the court closes the court record."

**This packet is for the other case: an order of nonconviction entered BEFORE 1 August 2025.** That is the branch this packet was built for, and paragraph 5 of the petition says so on its face: "Because the court in this case entered the order of nonconviction before August 1, 2025, Petitioner files this petition to have this court record closed."

## Then: can you use this form?

Page 1 lists five conditions and says you may use the form only if **all** of them are true:

1. a North Dakota state district court or municipal court entered an order of nonconviction before 1 August 2025 — meaning **all** the criminal charges in your case were dismissed, or you were **acquitted** of all of them;
2. the dismissal was not the result of a plea agreement involving a conviction on another offence;
3. the case was not dismissed because you were found not fit to proceed under N.D.C.C. Chapter 12.1-04;
4. the case did not end in a verdict of not guilty for lack of criminal responsibility under N.D.C.C. Chapter 12.1-04.1; and
5. the case was not appealed.

The printed instructions say it twice more, about paragraph 3 and about the form as a whole: **"If you can't check all three boxes, you can't use this form"**, and "If every paragraph isn't true and correct for you, you can't use this form."

## What this packet filled in, and what it did not

The platform filled the county and case number in the caption, your name as the Defendant in the caption and again in paragraph 1, and — after your signature on page 4 — your printed name, address, city, state and ZIP, telephone number and email address. **Because of how this form is built, the county, the case number and your name appear on the proposed order's caption on page 5 as well** — see below.

**The judicial district is blank**, and that is allowed: the printed instructions say "If you don't know the Judicial District, you may leave that space blank." Fill it in if you know it.

**The whole place-and-date-of-signing line is blank**, and so is your signature. Nobody can know where you will be when you sign a declaration you have not made yet.

**Most of the proposed order's caption is already filled, and you should not write over it.** The form uses ONE box for each of four caption facts — Judicial District, County, Case Number and Defendant — and each of those boxes appears TWICE, once on the petition's caption on page 3 and once on the proposed order's caption on page 5. They are the same box shown in two places, so a value written for the petition necessarily appears on the order as well. That is why page 5 already carries the county, the case number and your name.

**The one caption item you copy across by hand is the judicial district**, because it is the one this packet leaves blank on both pages. The printed instructions say "Fill in the top (caption) exactly as you filled in the top of your Petition"; on this form, doing that means writing the judicial district in the two places it is asked for and leaving the rest alone. **Do not hand-write the county, the case number or your name onto page 5 — they are already there, and writing over them defaces the document the judge signs.**

**Check page 5 before you file, because a long value can be left off it.** Where a caption value is too long to fit legibly, this packet refuses to print it rather than shrink it past the point of being readable — and when that happens the blank is on both pages, not just one. So read page 5's caption first: whatever is genuinely blank there is yours to fill in by hand, and whatever is already printed is not.

**Check the address block on page 4 for the same reason.** The refusal rule is not confined to the caption. The printed name, address, city, state and ZIP, telephone number and email that this packet fills in below your signature line on page 4 are measured the same way, and a value too long to fit legibly in its box is left blank rather than shrunk past the point of being readable. The city, state and ZIP line is the one that runs long most easily. Unlike the caption, that block appears once and on page 4 only, so there is no second copy of it to check — read page 4 itself, and hand-write anything the packet left blank there.

## Where you file it

**File the original with the Clerk of Court where your criminal case is filed.** Page 2 of the printed instructions says so, and the committed route record for this packet says the same: "The North Dakota district court or municipal court in which the criminal case is filed", filed in the existing criminal case. The instructions point to **ndcourts.gov/court-locations** if you need to find it.

**Make a copy of the completed, dated and signed Petition for your records before you file it.** That is the instructions' own first bullet under filing.

## What it costs

**There is no filing fee.** Page 2 of the printed instructions says it in three words — "There's no filing fee." — and the committed record for this packet says the same and names the authority: "§ 12-60.1-05(4) and the official instructions both state there is no filing fee." Because there is no fee, there is nothing to apply to have waived; the committed record records the waiver treatment as "not applicable; there is no fee."

If the clerk's office asks you for money to file this petition, **ask that clerk what the charge is for** before you pay it, because the statute and the court administrator's own instructions both say there is none.

## Who you serve, and how

**Usually nobody. Possibly the prosecutor. The judge in your case decides.**

The committed record for this packet records serviceRecipients, serviceMethod and serviceTiming as **"None required by the statute"**, and then qualifies it: "The individual judge may require the petition to be served on the prosecutor; the official instructions flag it as a possibility rather than a rule." Page 2 of the printed instructions puts it the same way: **"The individual judge in your case may require you to serve a copy of the Petition on the Prosecutor."**

So there is no service step you must take as a matter of course, and there may be one in your case. **Ask the Clerk of Court where you file whether the judge in your case requires the Prosecutor to be served, and if so how.** No held record and no printed line states a method or a deadline for it, and the clerk's office is where that is answered.

## What happens next

**The court enters an order closing the record within ten days of filing**, if you meet the requirements. Page 2 of the printed instructions says so, and paragraph 7 of the petition asks for exactly that.

**Only the court's own records are closed.** The instructions are clear about the limit: "Only the records controlled by the North Dakota court system are closed. The order won't close any records controlled by the Prosecutor or other law enforcement entities."

**Closed does not mean destroyed.** Both the instructions and paragraph 7 of the proposed order list who still has access: a clerk of court, a judge of the court, the juvenile commission, a criminal justice agency, the defendant, the defendant's lawyer, the state's attorney, and any person with a written order of the judge.

## The items you must supply

| Page | The blank on the form | What to write |
| --- | --- | --- |
| 3 | Caption — "Judicial District" (\`Judicial District\`) | the judicial district of your criminal case, if you know it. The instructions say you may leave it blank if you do not |
| 3 | Paragraph 3 — the three boxes (\`Check Box7\`, \`Check Box8\`, \`Check Box9\`) | check every one that is true. If you cannot check all three, you cannot use this form |
| 4 | "Signed on ______(date)" (\`date\`) | the date you sign |
| 4 | "in ______(city)" (\`city\`) | the city where you sign |
| 4 | "______(county)" (\`county\`) | the county where you sign |
| 4 | "______(state)" (\`state\`) | the state where you sign — **not** necessarily the state you live in, which is why it is blank |
| 4 | "______(country)" (\`country\`) | the country where you sign |
| 4 | "(Signature)" | your signature. Your printed name is already on the line below it |
| 5 | Caption — "Judicial District" (\`Judicial District\`), the same box as page 3's | the judicial district of your criminal case, if you know it. This is the ONLY caption item on page 5 that is yours: the county, case number and your name share their boxes with page 3 and are already printed. Write over nothing that is already there, and fill in anything page 5 has left blank |
| 5 | The proposed order's paragraph 3, two boxes (\`Check Box10\`, \`Check Box11\`) | check the **Dismissal** box if you checked both dismissal boxes on your petition; check the **Acquittal** box if you checked the acquittal box |

## The choices that are yours

| Where | The choice | Why it is yours |
| --- | --- | --- |
| Petition, paragraph 3 | the three statements about how your case ended | each is a sworn statement about your own case, and the instructions say you cannot use the form unless all three are true |
| Proposed order, paragraph 3 | Dismissal or Acquittal | the printed instructions direct you to mark it to match your petition. This is unusual — most proposed orders are the court's alone below the caption — and it is what this form tells you to do |

## What you must not do to the proposed order

**Do not sign or date it.** The printed instructions on page 2 say so directly: "Don't sign or date the form. If the judge uses your proposed order, the judge signs." The only marks you make on pages 5 and 6 are the two boxes in paragraph 3, and whatever the caption has genuinely left blank — normally just the judicial district.

## Where self-help ends

The printed instructions open with their own version of this, and it is worth quoting in full because it is the strongest such statement in this corpus:

> The ND Legal Self Help Center can't provide assistance in criminal matters and doesn't have forms, procedures, or expertise available in this area. If you have questions about this form, contact the office of the Clerk of Court where your criminal case is currently filed.

So: **the Clerk of Court where your criminal case is filed is the office to ask**, and there is no self-help centre behind it. Stop and get advice from a **lawyer licensed in North Dakota** before filing if any of these is true:

- you cannot check all three boxes in paragraph 3, or any paragraph of the petition is not true and correct for you. The instructions say twice that you cannot use this form;
- the order of nonconviction was entered **on or after 1 August 2025** — you do not need this petition at all, and filing one asks the court for something it is already doing;
- your case was appealed, or ended in a not-guilty verdict for lack of criminal responsibility, or was dismissed on a fitness-to-proceed finding, or the dismissal was part of a plea agreement involving a conviction on another offence. Each is one of the form's own five conditions;
- some but not all of the charges in your case were dismissed. Paragraph 2 quotes the statutory definition — "'Nonconviction' means dismissal of **all** criminal charges in a case or acquittal of **all** criminal charges in a case";
- you need records held by the prosecutor or a law-enforcement agency closed as well. This order does not reach them, and the instructions say so.

## What this packet is not

This is a prepared copy of the North Dakota State Court Administrator's Office's own form. It is not legal advice, it is not filed for you, and it does not decide whether your court record can be closed under N.D.C.C. § 12-60.1-05.

_Route: ${ROUTE_KEY} — N.D.C.C. § 12-60.1-05; the pre-1-August-2025 petition branch_
`;
}
/*
 * A width refusal, stated against the width it was actually measured on.
 *
 * The fitter refuses a value that will not fit inside a widget's USABLE width,
 * which is the widget rectangle less HORIZONTAL_PADDING. Its refusal record
 * carried `rect` and `requiredWidthAtMin` and not the usable width, and on this
 * family the two disclosed numbers said the opposite of the refusal: `City
 * State Zip Code` was refused `value_exceeds_widget_width_at_minimum_font`
 * while the same row read rect.width 181.35 against requiredWidthAtMin 179.0.
 * 179.0 is less than 181.35, so on the packet's own numbers the value fit and
 * the stated reason read false. It is not false — 179.0 exceeds the 177.35pt
 * this widget actually offers — but nothing in the record said so, and a
 * refusal a reader cannot check is a refusal a reader is right to reject.
 *
 * This adds the missing term and changes no outcome: the same values are
 * refused, the same values are written, and every fixture byte is unchanged.
 * The two sibling refusals on this fixture (Defendant 195.6 against 150,
 * County 143.6 against 135.6) exceed even the unpadded rectangle and read the
 * same way before and after.
 */
function disclosedRefusalBasis(row) {
  if (!row?.rect || typeof row.requiredWidthAtMin !== "number") return row;
  const usableWidth = usableWidthOf(row.rect);
  return {
    ...row,
    usableWidth,
    horizontalPadding: HORIZONTAL_PADDING,
    widthBasis:
      "the value is measured against the widget rectangle less the fitter's horizontal padding, "
      + `so ${row.requiredWidthAtMin}pt at ${row.minFontSize}pt font is compared with ${usableWidth}pt of `
      + `usable width inside a ${row.rect.width}pt widget, not with the ${row.rect.width}pt rectangle itself`,
    exceedsUsableWidth: row.requiredWidthAtMin > usableWidth,
    exceedsWidgetRectangle: row.requiredWidthAtMin > row.rect.width
  };
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
        /* VF08 read all 10 selection-widget rects across packet-canonical-filled.pdf
         * and packet-boundary-filled.pdf as delivering a stroked square the pinned
         * source does not print: each widget's current /AS state has no stream in
         * /AP /N, so a conforming viewer paints nothing there. VF08's zero-write
         * baseline over the same pinned bytes painted the identical pixels, so the
         * ink comes from the shared flattening step and not from this family.
         * Opting in supplies the missing state as an EMPTY appearance, so nothing
         * is synthesized and nothing is flattened there. A widget of a field this
         * run writes, and any widget whose /AS state ships its own appearance, are
         * untouched by this. */
        suppressSynthesizedAppearances: true,
        title: `ND ${doc.documentId}`
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
    jurisdiction: "ND",
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
      boundSourceIds: doc.boundSourceIds ?? [],
      boundSourceIdsNote:
        "The route census binds three source ids to this ONE binary, all at the same path and the same SHA-256: "
        + "the instructions, the petition and the proposed order are pages 1-2, 3-4 and 5-6 of a single published "
        + "PDF. They are recorded here rather than as three documents because there is one document, and the "
        + "packet delivers it whole.",
      parts: doc.parts ?? [],
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
        unfittable: fixtures[label].report.unfittable.map(disclosedRefusalBasis),
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
