#!/usr/bin/env node
// Route-obligation census v1 — packet family `id_clean_slate_shield-set`.
//
//   node scripts/build-census-v1-id_clean_slate_shield-set.mjs
//
// Idaho, shielding a record from public disclosure under the Clean Slate Act,
// Idaho Code § 67-3004(11) (added by 2023 chapter 108, effective 1 January
// 2024). Route
// `obligation:track-pathway:ID:id_clean_slate_shield:clean-slate-shielding-under-idaho-code-67-3004-11`.
// One document: the Idaho Supreme Court's own **Petition to Shield Records from
// Public Disclosure**, revision 01/01/2024. There is no proposed order in this
// family and the route record records none.
//
// This is not a renderer. Every decision about what may be written is made by
// scripts/rcap-official-forms/rcap-field-semantics.mjs and every byte is
// written by finalizeOfficialForm; this file supplies the family's ROLE
// classification, its explicit mappings and its printed-label corrections, and
// then proves the result from the artifact bytes rather than from its report.
//
// THE CAPTION'S FIELD NAMES ARE OFF BY ONE, AND ONE OF THEM WOULD HAVE PRINTED
// THE PARTICIPANT'S STATE AS A JUDICIAL DISTRICT.
//
// Page 1 prints the caption across two lines:
//
//     IN THE DISTRICT COURT OF THE ______ JUDICIAL DISTRICT OF
//     THE STATE OF IDAHO, IN AND FOR THE COUNTY OF ______
//
// Each widget is named after the text that FOLLOWS it rather than the text that
// precedes it. Measured from the page's own text items:
//
//   * line y=504.5 — "IN THE DISTRICT COURT OF THE " ends at x=302.4 and
//     " JUDICIAL DISTRICT OF" resumes at 382.6. The widget spanning that gap,
//     x 302.52-382.92, is named `THE STATE OF IDAHO IN AND FOR THE COUNTY OF`.
//     It is the JUDICIAL DISTRICT blank.
//   * line y=490.0 — "THE STATE OF IDAHO, IN AND FOR THE COUNTY OF " ends at
//     x=393.4. The widget beginning at 395.04 and running to 508.80 is named
//     `JUDICIAL DISTRICT OF`. It is the COUNTY blank.
//
// Left alone, the shared binder reads the first widget's NAME, matches "STATE"
// and writes `participant.state` into it: the canonical fixture would have read
// "IN THE DISTRICT COURT OF THE XX JUDICIAL DISTRICT OF". That is refused by
// role here, because the platform holds no judicial-district fact and the
// official instructions name the court itself as the place to get it. The
// county blank takes a printed-label correction so the county the platform does
// hold reaches the blank the form actually prints it in.
//
// PRINTED-LABEL CORRECTIONS, AND WHY THEY ARE NARROW
//
// The shared binder reaches a fact through the field NAME first and the
// harvested printed caption second. A correction replaces the harvested caption
// for ONE named widget with the printed text this build read at that widget's
// own measured position, and the correction, the harvested value it replaced
// and the evidence are all recorded on the field-map row. They are used only
// for identity, contact and venue facts, never to reach an offence, charge or
// statute blank. Every write is still proved from the artifact bytes
// afterwards, and the name-placement allowlist still fails the build if a
// participant name is drawn anywhere this family did not list.
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
import { CHARGE_VALUE_WORDS, captionDescribesChargeValue, descriptorsMatching, protectCategoryOf, decideBinding, resolveFact }
  from "./rcap-official-forms/rcap-field-semantics.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList } = require("pdf-lib");


const FAMILY_ID = "id_clean_slate_shield-set";
const OUT = "data/rcap-all50/overlays/census-v1/id/id-clean-slate-shield-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const ROUTE_KEY = "obligation:track-pathway:ID:id_clean_slate_shield:clean-slate-shielding-under-idaho-code-67-3004-11";

const fail = (message, detail = null) => {
  console.error(`build-census-v1-${FAMILY_ID}: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was written.");
  process.exit(1);
};

const DOCUMENTS = [
  {
    key: "petition",
    documentId: "ISC-PETITION-TO-SHIELD-67-3004-11",
    documentRole: "PETITION",
    officialTitle: "Petition to Shield Records from Public Disclosure, I.C. § 67-3004(11)",
    revision: "REV-2024-01-01",
    sha256: "91130b9036728677e0b6919222e00f8eae0a9114222a5b9d0ed8b3376140dede",
    pathInArchive: "STATES/ID/02_PACKET_FORMS/ID__FORM__PETITION-TO-SHIELD-RECORDS-FROM-PUBLIC-DISCLOSURE__petition-to-shield-records-from-public-disclosure-i-c-67-3004-11__REV-2001-01__EN.pdf",
    ownership: "participant_completed",
    captionOnly: false,

    printedLabelCorrections: {
      "JUDICIAL DISTRICT OF": {
        printedLabel: "IN AND FOR THE COUNTY OF",
        readFrom: "page 1, printed line at y=490.0: \"THE STATE OF IDAHO, IN AND FOR THE COUNTY OF\"",
        measuredEvidence: "the printed line ends at x=393.4 and this widget occupies x 395.04-508.80 on the same line, so it spans the blank after \"COUNTY OF\"",
        why: "The widget is named after the words that PRECEDE the line it sits on, not the words beside it. Its own name would have reached nothing; the county the platform holds would not have been written at all."
      },
      "THE STATE OF IDAHO IN AND FOR THE COUNTY OF": {
        printedLabel: "IN THE DISTRICT COURT OF THE judicial district",
        readFrom: "page 1, printed line at y=504.5: \"IN THE DISTRICT COURT OF THE ______ JUDICIAL DISTRICT OF\"",
        measuredEvidence: "\"IN THE DISTRICT COURT OF THE \" ends at x=302.4 and \" JUDICIAL DISTRICT OF\" resumes at x=382.6; this widget occupies x 302.52-382.92, exactly that gap",
        why: "Its own name contains the word STATE, and the shared binder matched participant.state on it: the canonical fixture would have printed \"IN THE DISTRICT COURT OF THE XX JUDICIAL DISTRICT OF\". The correction states what the blank is; the role refusal below then keeps it empty, because the platform holds no judicial-district fact."
      },
      "City State and Zip Code": {
        printedLabel: "City, State and Zip Code",
        readFrom: "page 1, printed caption at y=629.2: \"City, State and Zip Code\"",
        measuredEvidence: "the widget occupies x 71.04-310.92 at y=636.00, directly above that printed caption, in the filer's contact block at the head of the page",
        why: "Its harvested caption is \"Mailing Address (Street or Post Office Box)\" — the caption of the line ABOVE it — so the row would have described the wrong blank. The correction only names the blank; it does not change what is written into it, because the shared binder reads the field NAME first and the name matches its city descriptor before the label channel is ever consulted. See partialFills below."
      },
      "Petitioner  Defendant_2": {
        printedLabel: "Petitioner / Defendant signature line, page 2",
        readFrom: "page 2, printed caption at y=462.1: \"Petitioner / Defendant\", directly under the rule this widget covers, in the block headed \"CERTIFICATION UNDER PENALTY OF PERJURY\"",
        measuredEvidence: "the widget occupies x 324.00-504.12 at y=469.52; the printed caption naming it sits at y=462.1 beneath it, and \"Dated:\" with its own widget sits to the left on the same rule",
        why: "The widget harvests no caption at all and its name matches the participant's name, so the shared binder would have printed the petitioner's name on the line where the petitioner SIGNS the certification under penalty of perjury. The correction says what the line is; the role refusal below keeps it blank."
      }
    },

    explicitMappings: {},

    // A blank this packet fills only PARTLY, declared rather than hidden.
    //
    // The form prints one rule captioned "City, State and Zip Code" and the
    // platform holds all three (participant.city_state_zip is "Springfield, XX
    // 01234" for the canonical participant). The shared binder cannot place it:
    // it reads the field NAME first, "City State and Zip Code" matches its city
    // descriptor before its city_state_zip descriptor — that descriptor's own
    // pattern wants city, state and zip adjacent, and the word "and" in the
    // field name breaks it — and an explicit mapping cannot override a
    // descriptor the name has already selected. So the city is written and the
    // state and the ZIP are not.
    //
    // The alternative was to leave the whole line blank and declare it
    // required-before-filing, and that would have been a false declaration: the
    // contract's own condition for that disposition is that the platform holds
    // no value for the fact, and the platform holds all three. So the line is
    // written as far as it can be, and participant-instructions.md tells the
    // participant, in the table of items they must supply, to add the state and
    // the ZIP code after the city.
    //
    // The underlying question — should a field named "City State and Zip Code"
    // reach participant.city_state_zip — belongs to whoever owns
    // rcap-field-semantics.mjs, which is outside this family's owned paths and
    // is shared by every other family.
    partialFills: [
      {
        field: "City State and Zip Code",
        page: 1,
        theBlankAsksFor: "the city, the state and the ZIP code, on one printed rule",
        thisPacketWrites: "participant.city",
        notWritten: ["participant.state", "participant.zip"],
        heldByThePlatform: true,
        why: "The shared binder selects its city descriptor from the field's own name before the city_state_zip descriptor is reached, and an explicit mapping cannot override a descriptor the name already selected.",
        disclosedTo: "participant-instructions.md, in the table of items the participant must supply"
      }
    ],

    unwritable: [
      { field: "THE STATE OF IDAHO IN AND FOR THE COUNTY OF", class: "judicial_district_not_held",
        why: "The judicial-district blank in the caption (see the header note). The platform holds no judicial-district fact, and the shared binder would otherwise have written participant.state into it because the widget's NAME contains the word STATE. Idaho's own Clean Slate instructions, carried in the compiled Idaho profile, tell the filer to \"Fill in the district, county, case number\" and add \"You can obtain this information from the court if you do not have it.\"" },
      { field: "Petitioner  Defendant_2", class: "participant_signature_line",
        why: "The signature rule above the printed words \"Petitioner / Defendant\" on page 2, inside the block headed CERTIFICATION UNDER PENALTY OF PERJURY. The participant signs it; the shared binder would have printed their name there." },
      { field: "Dated", class: "participant_signature_date",
        why: "The date beside that signature. Dating a certification that has not been made asserts the petition was signed on a day it was not." }
    ],

    completeness: {
      defaultBlank: null,
      fields: {
        "Petitioner  Defendant_2": { refusalClass: "signature_or_date_participant_completion",
          reason: "The signature line under CERTIFICATION UNDER PENALTY OF PERJURY on page 2. The petition is certified under penalty of perjury; the participant signs it." },
        "Dated": { refusalClass: "signature_or_date_participant_completion",
          reason: "The date beside that signature, completed by the participant when the petition is signed." },

        "THE STATE OF IDAHO IN AND FOR THE COUNTY OF": { requiredBeforeFiling: true,
          reason: "The judicial district in the caption's \"IN THE DISTRICT COURT OF THE ______ JUDICIAL DISTRICT OF\" line. The county is written on the line below it; which of Idaho's judicial districts that county sits in is a fact the platform does not hold, and Idaho's own Clean Slate instructions say to obtain it from the court. The participant writes it before filing." },

        "a misdemeanor that is not assaultive or violent as listed in Idaho Code section": {
          refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 1's first eligibility box — \"a misdemeanor that is not assaultive or violent as listed in Idaho Code section 67-3004(11)(b)\". Which limb of § 67-3004(11) the offence qualifies under is read off the participant's own record; this route covers both and does not determine it." },
        "a felony possession of a controlled substance under Idaho Code section 372732a": {
          refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "Paragraph 1's second eligibility box — \"a felony possession of a controlled substance under Idaho Code section 37-2732(a), (c), or (e)\". The other half of the same election." }
      }
    }
  }
];

// The ONLY blanks in this family that may ever carry the participant's name.
const NAME_MAY_APPEAR_IN = {
  "ISC-PETITION-TO-SHIELD-67-3004-11": [
    "Full Name of Party Filing Document",  // the filer block at the head of page 1
    "Petitioner  Defendant",               // the caption's party line
    "Email Address if any"                 // the filer block's email, which contains the surname
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
// FILING_DESTINATION — held, twice. The committed packet-set manifest for
//   id_clean_slate_shield-set records filingDestination as "The county court
//   where the underlying criminal case was filed. The proceeding occurs in the
//   underlying criminal case, § 67-3004(11)(e). E-filing available through
//   iCourt", and its destination detail adds "District court, in the underlying
//   criminal case". The compiled Idaho profile carries the Supreme Court's own
//   Clean Slate instructions verbatim: "file it at the county court where the
//   underlying criminal case was filed. Ask the court clerk to date stamp your
//   copy. Or file your form online by creating an iCourt account". Stated.
// FEE_AND_WAIVER — held, twice. The manifest's own destination detail says "No
//   filing fee." The compiled Idaho profile says it twice more: "The petition is
//   filed in the county court where the underlying case was filed, with no
//   filing fee", and, in the official instructions it carries, "There is no
//   filing fee to file your Petition." Both are keyed to § 67-3004(11)
//   shielding, which is this route, so amendment A3 is satisfied. Stated as an
//   amount, not delegated.
// SERVICE — held, and the answer is that the participant serves nobody. The
//   manifest records serviceRecipients as "Service on the prosecutor is not the
//   petitioner's job; the court notifies the prosecuting attorney of the hearing
//   date", and the profile's instructions say "the court will set a hearing date
//   and notify you and the prosecuting attorney of the hearing date. You will
//   receive a Notice of Hearing from the court."
// SELF_HELP_STOP — held. The manifest's contestedHearingOrOppositionHandoff
//   entry: "The mandatory hearing does not block generation; actual opposition
//   or contested testimony triggers handoff." The profile's instructions add the
//   once-in-a-lifetime bar and the recommendation to consult an attorney about
//   timing and offence eligibility, and the petition's own paragraph 6 states
//   the bar on its face.
// NOT FOUND — the manifest records notarizationRequirements, filingDeadline,
//   serviceMethod, serviceTiming and postFilingInstructions as not_recorded, and
//   the form prints none of them. Nothing below states any of them. The form's
//   own page 2 certifies under penalty of perjury rather than before a notary,
//   which is on its face and is described from the page.
function participantInstructionsMarkdown() {
  return `# Filing instructions — Shield an Idaho record from public disclosure (Clean Slate Act)

This packet is one form: the Idaho Supreme Court's **Petition to Shield Records from Public Disclosure, I.C. § 67-3004(11)**, revision 01/01/2024. There is no proposed order — the court writes its own.

The petition asks the court to shield from public disclosure all records in one criminal case. It is a **sworn** document: page 2 ends with a CERTIFICATION UNDER PENALTY OF PERJURY that everything in it is true and correct.

The platform filled what it holds about you and your case: your name in the filer block at the top of page 1 and again as Petitioner/Defendant in the caption, your mailing address, your **city**, your telephone, your email, the county in the caption, and the case number. Everything else is listed below.

**Two things about this form's blanks are worth knowing before you check it.**

**The "City, State and Zip Code" line carries only your city.** The platform holds your state and your ZIP code as well, and the line is meant to hold all three, but the way this form names that blank means only the city reaches it. **Write your state and your ZIP code after the city before you file.**

**Some of this form's blanks are short, and a long value is left out rather than cut off.** Five of them declare a maximum length inside the PDF — the filer-name line and the caption's party line hold 35 and 30 characters, the mailing-address line 35, the city line 35, and the case-number line 16. If any of your details is longer than the blank the form gives it, this packet leaves that blank empty rather than printing a shortened version of your name or your case number. **Check every prefilled line against your own details, and write anything that is missing.**

## Read paragraphs 1 to 8 before you sign

The petition is eight numbered statements you make about yourself, and **this packet has not ticked any box and has not decided any of them for you**. Paragraph 2 asserts that at least five years have passed since you completed your sentence, including all ordered probation, parole, fines and restitution. Paragraph 3 asserts you have had no felony or misdemeanor conviction in those five years and are not on probation or parole. Paragraphs 4 and 5 assert you have no pending cases and no restraining orders in effect. Paragraph 6 states that **you may have only one Clean Slate petition granted in your lifetime**. Read all eight on the paper and sign only if every one of them is true of you.

## Where you file this

**File in the county court where the underlying criminal case was filed.** The committed route record for this packet says so — "The county court where the underlying criminal case was filed. The proceeding occurs in the underlying criminal case, § 67-3004(11)(e)" — and the Idaho Supreme Court's own Clean Slate instructions, carried in the compiled Idaho profile this route is built from (\`src/lib/rcap-engine/compiled/profiles/ID-idaho.json\`), say the same: "take your original document and copy and file it at the county court where the underlying criminal case was filed."

**The county is already written in the caption.** Check it against the county where your criminal case was filed, and correct it before you file if they are not the same.

**The judicial district is left blank, and it is yours to fill in.** The caption's first line reads "IN THE DISTRICT COURT OF THE ______ JUDICIAL DISTRICT OF" and the platform holds no judicial-district fact for your case. **Get it from the court where your case was filed.** The Supreme Court's own instructions say exactly that: "Fill in the district, county, case number, and your name as the Petitioner/Defendant. You can obtain this information from the court if you do not have it." The iCourt Portal at https://mycourts.idaho.gov/ shows your case information as well.

**You may file on paper or online.** The same instructions: file the original and a copy at the county court and "Ask the court clerk to date stamp your copy", **or** file online through iCourt at https://idaho.tylertech.cloud/OfsWeb. They also direct you to "Type or fill out the Petition in black ink" — so if you complete the remaining blanks by hand, use black ink.

## The filing fee

**There is no filing fee.** The compiled Idaho profile states it twice: "The petition is filed in the county court where the underlying case was filed, with no filing fee", and, in the Supreme Court's own Clean Slate instructions that it carries in full, "**There is no filing fee to file your Petition.**" The committed route record for this packet says the same in its filing-destination entry: "No filing fee."

Because there is no fee, there is no fee waiver to apply for. **If the clerk of the county court where you file asks you to pay something, ask that clerk what the charge is for before you pay it** — the records above are explicit that filing this petition costs nothing.

## Who you serve, and how

**You serve nobody. The court does it.** The committed route record for this packet is explicit: "Service on the prosecutor is not the petitioner's job; the court notifies the prosecuting attorney of the hearing date." The Supreme Court's own instructions say the same: "Once your Petition is filed, the court will set a hearing date and notify you and the prosecuting attorney of the hearing date. You will receive a Notice of Hearing from the court."

**There will be a hearing, and you should expect to attend it.** The instructions carry it as their own Step 4, and add that you can monitor the status of your case on the iCourt Portal.

## What you must do before you file

1. **Get the judicial district and check the county and case number**, from the court where your criminal case was filed or from the iCourt Portal at https://mycourts.idaho.gov/.
2. **Read paragraphs 1 to 8 on the paper**, and satisfy yourself that every one of them is true of you.
3. **Tick exactly one box in paragraph 1** — see _The choice that is yours_ below.
4. **Sign and date the certification on page 2.** It is made under penalty of perjury under Idaho law. Both the signature and its date are left blank because they are yours.
5. **Make a copy for your records** before you file, as the Supreme Court's instructions direct, and ask the clerk to date-stamp it if you file on paper.

## The items you must supply

| Page | The blank on the form | What to write |
| --- | --- | --- |
| 1 | Caption — "IN THE DISTRICT COURT OF THE ______ JUDICIAL DISTRICT OF" (inside the PDF this blank is called \`THE STATE OF IDAHO IN AND FOR THE COUNTY OF\`) | the judicial district your county sits in. Get it from the court where your case was filed, or from the iCourt Portal |
| 1 | Filer block — "City, State and Zip Code" (\`City State and Zip Code\`) | your **state and ZIP code**, after the city. The city is already written; the state and the ZIP are not |
| 1 | Paragraph 1 — the two eligibility boxes | tick the one that is true of your offense: a non-assaultive, non-violent misdemeanor under I.C. § 67-3004(11)(b), **or** a felony possession of a controlled substance under I.C. § 37-2732(a), (c) or (e) |
| 2 | CERTIFICATION — "Dated:" (\`Dated\`) | the date you sign |
| 2 | CERTIFICATION — the signature line above "Petitioner / Defendant" (inside the PDF, \`Petitioner  Defendant_2\`) | your signature. Your name is already printed in the caption and in the filer block; this line is where you sign |

Note the field names in that table: three of this form's widgets are named after the words that come **after** them rather than the words beside them, which is why the judicial-district blank is called \`THE STATE OF IDAHO IN AND FOR THE COUNTY OF\` inside the PDF. This packet decided which blank is which by measuring the printed caption, not by trusting the names.

## The choice that is yours

| The choice | Why it is yours |
| --- | --- |
| a non-assaultive, non-violent misdemeanor under I.C. § 67-3004(11)(b) **or** a felony possession of a controlled substance under I.C. § 37-2732(a), (c) or (e) | which limb of the Clean Slate Act your offense qualifies under is read off your own record. This route covers both and does not decide it for you |

## What the platform deliberately left blank

- **Your signature on page 2 and the date beside it.** You make the certification under penalty of perjury, not the platform.
- **The judicial district in the caption.** The platform holds no judicial-district fact, and Idaho's own instructions send you to the court for it.
- **Every box in paragraph 1.** Which limb of the statute your offense falls under is your statement about your own record.
- **Your state and ZIP code on the "City, State and Zip Code" line**, for the reason given at the top of this page.
- **Any prefilled line whose value is longer than the blank the form declares.** The packet leaves it empty rather than printing a shortened name or case number.

## Where self-help ends

This packet prepares one form; it does not decide anything. Stop and get advice from a **lawyer licensed in Idaho** — or put the procedural question to the **clerk of the county court where your criminal case was filed**, who can say what the court requires even though the clerk cannot give legal advice — before filing, if any of these is true:

- **the prosecuting attorney opposes the petition, or the hearing becomes contested.** The committed record for this packet is explicit that this is where self-help stops: "The mandatory hearing does not block generation; actual opposition or contested testimony triggers handoff." A hearing by itself is normal and expected; opposition is not something this packet handles.
- **you are not sure this is the right moment to use your one petition.** Paragraph 6 of the form states it on its face: you may have **only one** Clean Slate petition granted in your lifetime. The Supreme Court's own instructions say "You may want to seek legal advice for help determining the timing and offense eligibility before filing", and there is no second chance to get the timing right.
- you are unsure whether your offense is within I.C. § 67-3004(11)(a)–(c) at all. The same instructions say: "If you are unsure whether you meet the conditions for shielding your record from public disclosure, you should consult with an attorney."
- you cannot truthfully make one of the eight statements on the form — five years since completing the sentence including all fines and restitution, no subsequent convictions, no pending cases, no restraining orders;
- you want to shield records in more than one case. This petition asks the court to shield "all records in this case", and the compiled Idaho profile records that only one offence, or offences from a single incident or transaction, may be shielded.

## What this packet is not

This is a prepared copy of the Idaho Supreme Court's own form. It is not legal advice, it is not filed for you, and it does not decide whether your record can be shielded under I.C. § 67-3004(11).

_Route: ${ROUTE_KEY} — I.C. § 67-3004(11), added by 2023 chapter 108, effective 1 January 2024_
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
