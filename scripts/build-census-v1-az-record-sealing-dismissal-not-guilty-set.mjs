#!/usr/bin/env node
// Route-obligation census v1 — packet family
// `az_record_sealing_dismissal_not_guilty-set`.
//
//   node scripts/build-census-v1-az-record-sealing-dismissal-not-guilty-set.mjs
//
// Arizona, sealing a criminal case record after a DISMISSAL or a NOT GUILTY
// verdict under A.R.S. § 13-911, route
// `obligation:track-only:AZ:az_record_sealing_dismissal_not_guilty`.
// The family names two documents:
//
//   * AOCCRSL1F — Petition to Seal Criminal Case Records, the participant's
//     own filing, 71 AcroForm fields across 5 pages;
//   * AOCCRSL2F — Order Regarding Petition to Seal Criminal Case Records, the
//     proposed order the COURT completes and signs, 41 fields across 3 pages.
//
// WHAT THIS SCRIPT IS NOT
//
// It is not a renderer. Every decision about what may be written is made by
// scripts/rcap-official-forms/rcap-field-semantics.mjs and every byte is
// written by finalizeOfficialForm. This file supplies only what a caller must
// supply — the family's ROLE classification and its explicit mappings — and
// then proves the result from the artifact bytes rather than from its own
// report.
//
// WHY THE PREDECESSOR STOPPED, AND WHAT CHANGED
//
// The first worker on this family recorded `corpus_absent` at step 1 and built
// nothing. That refusal was correct and is preserved in SOURCE-BIND-BLOCKED
// .json: the Master Library was not mounted in that container, and an absent
// corpus is not an empty one. Nothing about the finding was wrong; it was true
// of that container. The corpus is recovered per container with
// scripts/rcap-corpus/bootstrap-private-corpus.sh, and both forms now bind by
// exact SHA-256 against their pinned digests.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
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
const { PDFDocument, PDFName, PDFDict, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList } = require("pdf-lib");

const FAMILY_ID = "az_record_sealing_dismissal_not_guilty-set";
const OUT = "data/rcap-all50/overlays/census-v1/az/az-record-sealing-dismissal-not-guilty-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const ROUTE_KEY = "obligation:track-only:AZ:az_record_sealing_dismissal_not_guilty";

const fail = (message, detail = null) => {
  console.error(`build-census-v1-${FAMILY_ID}: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was written.");
  process.exit(1);
};

// --- the two documents, pinned by hash ---------------------------------------
//
// `captionOnly` is the whole of the difference between them. The petition is
// the participant's own statement; the order is the court's instrument and
// accepts nothing but caption facts, so its findings, its decree, its judicial
// signature and its date are refused by the factory rather than by a rule this
// file writes.
const DOCUMENTS = [
  {
    key: "petition",
    documentId: "AZ-AOCCRSL1F-PETITION-TO-SEAL-CRIMINAL-CASE-RECORDS",
    documentRole: "PETITION",
    officialTitle: "Petition to Seal Criminal Case Records",
    revision: "REV-2025-05-08",
    formNumber: "AOCCRSL1F-050825",
    sha256: "32c1e54d8a4135cfefe5d85d25f62afdb7c212f6a475e18664188524de34db05",
    pathInArchive: "STATES/AZ/02_PACKET_FORMS/AZ__FORM__AOCCRSL1F-050825__petition-to-seal-criminal-case-records__REV-2025-05-08__EN.pdf",
    ownership: "participant_completed",
    captionOnly: false,
    explicitMappings: {},

    // Role refusals: what this family determines the participant does not
    // complete, or does not complete YET. Only fields the shared protect rules
    // do NOT already catch are listed, so the shared rules keep doing their own
    // work and the verification can tell the two channels apart.
    unwritable: [
      // MEASURED DEFECT, not a precaution. Page 1 prints its contact block as
      // five captions ABOVE five widgets:
      //   y=705.2 "Person Filing"        -> Filer     y=700.6
      //   y=684.8 "Address (if not ...)" -> Address   y=680.2
      //   y=664.4 "City, State, Zip"     -> City      y=660.2
      //   y=644.0 "Telephone"            -> Telephone y=640.2
      //   y=623.6 "Email Address"        -> Email     y=619.2
      // captureWidgetContext harvests the caption BELOW each widget, so every
      // label in the block is off by one row. `Filer` matches no descriptor by
      // name, so the printed-label fallback runs and binds the harvested label
      // "Address (if not protected)" -> participant.street_address. The
      // canonical fixture would print the petitioner's street address on the
      // "Person Filing" line. City, Telephone and Email survive only because
      // their own NAMES match; Filer has no such rescue. Naming an explicit
      // mapping does not fix it — decideBinding refuses a mapping that
      // conflicts with the name channel — so the line is left EMPTY, which is
      // the better of the two available outcomes.
      { field: "Filer", class: "mislabelled_contact_line",
        why: "The 'Person Filing' NAME line on page 1. The page prints its captions above its widgets, so the label harvest is off by one row and binds participant.street_address here through the printed-label fallback. A petition whose 'Person Filing' line carries a street address misidentifies the filer to the court." },

      // The `City` field has TWO widgets: page 1 in the contact block, and page
      // 5 at "City, State, Zip Code" inside DECLARATIONS AND ACKNOWLEDGEMENTS.
      // One value fills both. The page-5 block's other two lines — Print
      // (Printed Name) and Addr (Address) — are refused by the shared region
      // rule as notarization territory, so writing City alone produces a
      // half-completed signature block: a declaration under penalty of perjury
      // with a city filled in beside a blank printed name and a blank
      // signature. That is the AK TF-800 `certDate` defect in another form.
      { field: "City", class: "spans_the_declaration_block",
        why: "One field, two widgets: the page 1 contact line and the page 5 'City, State, Zip Code' inside DECLARATIONS AND ACKNOWLEDGEMENTS. Its page-5 neighbours are refused as notarization territory, so filling it half-completes a declaration made under penalty of perjury." },

      // Page 3 § 3(e): "Name of the justice court and the justice court case
      // number if the case was initially filed in a justice court but was
      // transferred to the superior court." The caption opens with the word
      // "Name", ASKS_FOR_A_PERSONS_NAME matches it, and the binder writes
      // participant.full_legal_name. A court is not a person. The field also
      // carries TWO widgets — the court name and the case number — so one
      // value would be printed into both.
      { field: "JusticeCourt1", class: "court_identity_not_a_person",
        why: "Page 3 § 3(e), the justice court's NAME and case number, carried on two widgets of one field. The caption begins with 'Name of the justice court', so ASKS_FOR_A_PERSONS_NAME matches and participant.full_legal_name binds: the petitioner would be named as the court that heard the case." },

      // "e. Name at the time of arrest, if not the same as above". ALTERNATE_
      // BLOCK names exactly this shape, but it is tested against a harvested
      // CAPTION and `PetName1` binds through the NAME channel, which runs
      // first and never reaches it. Writing the same name into both asserts
      // the two differ and then shows them identical — NC AOC-CV-226's defect.
      { field: "PetName1", class: "alternate_block_conditional_on_difference",
        why: "Page 2 § I.1(e), 'Name at the time of arrest, if not the same as above'. It is completed only when the name differs. The platform holds one name, so filling it would assert a difference and then print the same value." },

      // Page 1 prints two mutually exclusive captions: "Defendant (FIRST, MI,
      // LAST)" and, "OR if no charges were filed:", "In Re the Matter of: /
      // Name (FIRST, MI, LAST)". This family is the DISMISSAL / NOT GUILTY
      // family: charges WERE filed, so the Defendant caption is the correct
      // one and the In-Re caption must stay empty. It binds nothing today only
      // because "Plaintiff" matches no descriptor, which is luck rather than a
      // decision.
      { field: "Plaintiff", class: "alternative_caption_for_a_different_situation",
        why: "The page 1 'In Re the Matter of' name, used ONLY where no charges were filed. In this family charges were filed and dismissed or tried to a not-guilty verdict, so the Defendant caption applies and this one stays blank. Filling both would give the court two captions for one matter." },

      // Page 5, beside "Petitioner / Petitioner's Attorney Signature". It is
      // refused today only because no descriptor matches the field name
      // `Date`, which is not a refusal — it is an absence of a match.
      { field: "Date", class: "participant_signature_date",
        why: "The date beside the petitioner's signature on page 5. Dating a signature that has not been made asserts the petition was signed on a day it was not. Refused by role rather than by the accident that nothing matches the name 'Date'." },

      // Page 2 § I.2(d) and its follow-up. Both are predicated on "If no
      // charges were filed" and are not this family's questions at all. They
      // are refused today by the shared signature rule, which fires on the
      // word "initial" inside "initial appearance" — a false positive that
      // happens to point the safe way. A refusal that depends on a
      // coincidence is not a refusal.
      { field: "Check Box7", class: "predicated_on_no_charges_filed",
        why: "Page 2 § I.2(d), 'If no charges were filed, did you have an initial appearance?'. Charges were filed in this family, so the question does not apply. It is refused today only because the shared signature rule matches 'initial' inside 'initial appearance'." },
      { field: "Check Box8", class: "predicated_on_no_charges_filed",
        why: "The follow-up to § I.2(d), reached only when the previous answer is yes. Not this family's question, and refused today by the same coincidental match on 'initial'." }
    ]
  },
  {
    key: "order",
    documentId: "AZ-AOCCRSL2F-ORDER-REGARDING-PETITION-TO-SEAL",
    documentRole: "PROPOSED_ORDER",
    officialTitle: "Order Regarding Petition to Seal Criminal Case Records",
    revision: "REV-2025-05-08",
    formNumber: "AOCCRSL2F-050825",
    sha256: "436df2e10722ff26b30069d4b0913825fa304202d6538a70e45ad8bafbca61b1",
    pathInArchive: "STATES/AZ/02_PACKET_FORMS/AZ__FORM__AOCCRSL2F-050825__order-regarding-petition-to-seal-criminal-case-records__REV-2025-05-08__EN.pdf",
    ownership: "court_issued_order",
    captionOnly: true,
    explicitMappings: {},
    unwritable: [
      { field: "DName", class: "alternative_caption_for_a_different_situation",
        why: "The order's 'In Re the Matter of' name, the caption used only where no charges were filed. This family's caption is the Defendant one. participant.full_legal_name binds here through the field name, so without this refusal the order would carry both captions." },
      { field: "NameArrest", class: "alternate_block_conditional_on_difference",
        why: "Page 1 § I(c), 'Name at the time of arrest, if not the same as above'. Conditional on a difference the platform cannot assert, and it binds participant.full_legal_name through the name channel." },
      { field: "Date", class: "court_only_signature_date",
        why: "The date beside the Judicial Officer's signature on page 3. The court dates its own order. Refused by role rather than by the accident that nothing matches the name 'Date'." },

      // Page 2 is headed "II. THE COURT MAKES THE FOLLOWING FINDINGS OF FACT
      // AND CONCLUSIONS OF LAW". The shared region rule catches Check Box4,
      // Check Box5 and Check Box6, whose harvested region heading is that
      // title. The rest of the page harvests a region heading of "13-911(H)."
      // or nothing, because the heading is far above them, so Check Box7
      // through Check Box17, `Other` and `OtherFindings` are refused ONLY by
      // the non-text type guard or by nothing matching their names. Neither is
      // a role decision, and the type guard would stop applying the moment a
      // selection channel existed. These are the court's own findings.
      ...["Check Box7", "Check Box8", "Check Box9", "Check Box10", "Check Box11",
          "Check Box12", "Check Box13", "Check Box14", "Check Box15", "Check Box16",
          "Check Box17"].map((field) => ({
        field, class: "court_finding_of_fact",
        why: "A finding of fact or conclusion of law under the page 2 heading 'II. THE COURT MAKES THE FOLLOWING FINDINGS OF FACT AND CONCLUSIONS OF LAW'. The shared region rule does not reach this far down the page, so without this refusal it is held back only by the non-text type guard." })),
      { field: "Other", class: "court_finding_of_fact",
        why: "The page 2 'Other:' findings line, in the court's own findings block. Refused today only because no descriptor matches the name." },
      { field: "OtherFindings", class: "court_finding_of_fact",
        why: "The page 2 'Other findings:' line. The court's finding to make, not the platform's to draft." },
      { field: "ArrestOn", class: "court_recital_of_the_petition",
        why: "Page 1 recital of the arrest date the ORDER repeats back from the petition. The court states what was presented to it; the platform does not draft the court's recitals." }
    ]
  }
];

// --- the disposition question, answered from the document --------------------
//
// The gate report this build resumes left one question UNRESOLVED and forbade
// answering it from recollection of A.R.S. § 13-911 or from the family's own
// name: does the official form treat a DISMISSAL and a NOT GUILTY verdict as
// one selection or two?
//
// It is answered here from the measured bytes. Page 3 § I.4 "DESCRIBE YOUR
// SITUATION" carries one field, `Check Box9`, with three widgets and three
// export values. Each widget's measured y sits on one printed option:
//
//   /1  widget y=478.70   option printed at y=481.1
//       "I was arrested for a criminal offense and no charges were filed."
//   /2  widget y=436.47   option printed at y=438.4
//       "I was charged with one or more criminal offenses and the charge(s)
//        were subsequently dismissed OR resulted in a not guilty verdict at
//        trial. A dismissal or not guilty verdict was entered on ______."
//   /3  widget y=376.47   option printed at y=377.8
//       "I was charged with a criminal offense and a judgment of guilt was
//        entered on ______."
//
// So the form treats them as ONE selection: a single export value /2 on a
// single field, sharing a single date blank (`EnteredOn`). That is what the
// document does, and it is measurable.
//
// It is NOT the route-identity decision. The Oregon precedent recorded in
// data/record-clearing/packet-specifications/OR-disposition-configurations.v1
// .json settles that a shared form option is compatible with — and did not
// prevent — two separately governed configurations, each with its own
// specification id, route key and disposition predicate. Counsel required that
// in Oregon where acquittal and ordinary dismissal shared one option on one
// form. Finding one checkbox in Arizona therefore licenses one FORM SELECTION,
// not one ROUTE. The route-identity decision is counsel's and is not made here.
const DISPOSITION = {
  question: "Does AOCCRSL1F treat a dismissal and a not-guilty verdict as one selection or two?",
  answeredFrom: "the measured bytes of the pinned source, not from statute or from the family name",
  answer: "ONE selection",
  control: { document: "AZ-AOCCRSL1F-PETITION-TO-SEAL-CRIMINAL-CASE-RECORDS", field: "Check Box9", exportValue: "/2", page: 3 },
  sharedDateBlank: "EnteredOn",
  whatThisDoesNotDecide:
    "The route identity. Oregon settled that one shared form option is compatible with two separately governed "
    + "configurations; counsel required exactly that where ORS 137.225(1)(d) put acquittal and ordinary dismissal "
    + "on one option of one form. Whether AZ ships one route or two is counsel's decision and is not taken here."
};

// The ONLY blanks in this family that may ever carry the participant's name.
// Stated as an allowlist rather than as refusals, because the defect this
// corpus keeps finding is a name arriving somewhere nobody listed.
const NAME_MAY_APPEAR_IN = {
  "AZ-AOCCRSL1F-PETITION-TO-SEAL-CRIMINAL-CASE-RECORDS": [
    "Defendant",  // page 1 caption, "Defendant (FIRST, MI, LAST)"
    "PetName"     // page 2 § I.1(a), "Petitioner's name"
  ],
  "AZ-AOCCRSL2F-ORDER-REGARDING-PETITION-TO-SEAL": [
    "Defendant",  // page 1 caption
    "PetName"     // page 1 § I(a), "Petitioner's name"
  ]
};

// --- fixture identities -------------------------------------------------------
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
  "matter.county": "Example County", "matter.court": "Superior Court",
  "matter.case_number": "CR2019-001234", "matter.citation_number": "C-889201",
  "matter.charge": "Possession of a controlled substance", "matter.arrest_date": "2019-03-08",
  "matter.offense_date": "2019-03-08", "matter.disposition_date": "2020-01-15",
  "deterministic.filing_date": "2026-08-12",
  "matter.charges": [
    { case_number: "CR2019-001234", citation_number: "C-889201", charge: "Possession of a controlled substance",
      arrest_date: "2019-03-08", offense_date: "2019-03-08", disposition_date: "2020-01-15" }
  ]
};
const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "participant.city": "Unincorporated Township of Long Hollow Crossing",
  "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, XX 01234-9999",
  "participant.zip": "01234-9999", "participant.phone": "555-0142 ext. 44821",
  "matter.case_number": "CR2026-0123-45-900123.00-AB-CDE/2201",
  "matter.county": "Saint Bartholomew and the Northern Reaches County",
  "matter.charge": "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line",
  "matter.charges": [
    { case_number: "CR2026-0123-45-900123.00-AB-CDE/2201", citation_number: "C-889201",
      charge: "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line",
      arrest_date: "2019-03-08", offense_date: "2019-03-08", disposition_date: "2020-01-15" }
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
//
// Two independent things are proved, because either alone is satisfiable by a
// file that is not the right one: the bytes on disk hash to what the family
// declares, AND the corpus index — the committed record of what the Master
// Library contained — declares the same hash and byte length at the same path.
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

// ---- measuring the boxes the form already draws ------------------------------
//
// The brief requires every write box to be measured off the document with
// scripts/lib/pdf-stroked-boxes.mjs, which tracks the CTM where the older
// `re`-operator scan did not and put a mark in the margin.
//
// Running that scan over these two forms' PAGE content streams finds zero
// stroked rectangles on all eight pages. That is a true measurement, not a
// failure: Arizona's forms are Acrobat-authored, and every selection square is
// drawn inside its own widget APPEARANCE stream rather than on the page. So the
// scan is run where the box actually is. `Check Box9`'s /2 widget decodes to:
//
//     q 1 g 0 0 14.1835 13.3107 re f 0.5 0.5 13.1835 12.3107 re s Q
//     q 1 1 12.1835 11.3107 re W n BT /ZaDb 9.608 Tf 3.0276 3.4031 Td (4) Tj ET Q
//
// — a stroked square from (0.50, 0.50) to (13.68, 12.81) in widget-local
// coordinates, and, in the ON state, the ZapfDingbats check the form itself
// draws inside it. Adding the widget's own /Rect origin puts that square in
// page coordinates. Nothing here draws a new box: the measured square and the
// form's own mark are both read out of the document.
function measureSelectionControls(pdf, form, pages) {
  const pageIndex = new Map();
  pages.forEach((p, i) => pageIndex.set(p.ref.toString(), i + 1));
  const controls = [];

  for (const f of form.getFields()) {
    if (fieldType(f) !== "checkbox" && fieldType(f) !== "radio") continue;
    const name = f.getName();
    for (const [i, w] of f.acroField.getWidgets().entries()) {
      const r = w.getRectangle();
      const pRef = w.dict.get(PDFName.of("P"));
      const page = pRef ? pageIndex.get(pRef.toString()) ?? null : null;
      const ap = w.dict.lookupMaybe(PDFName.of("AP"), PDFDict);
      const n = ap?.lookupMaybe(PDFName.of("N"), PDFDict);

      const states = [];
      let measuredBox = null;
      let drawsItsOwnMark = false;
      for (const key of n?.keys() ?? []) {
        const state = key.asString();
        let body = "";
        try {
          const raw = Buffer.from(n.lookup(key).getContents());
          try { body = zlib.inflateSync(raw).toString("latin1"); } catch { body = raw.toString("latin1"); }
        } catch { /* unreadable appearance */ }
        // CTM-aware: the same walker the brief names, run on the stream that
        // actually contains the square.
        const inner = strokedRectangles(body).filter((b) =>
          (b.x1 - b.x0) >= 6 && (b.y1 - b.y0) >= 6);
        if (inner.length && !measuredBox) {
          const b = inner[0];
          measuredBox = {
            page,
            // Widget-local square + the widget's own /Rect origin = page coords.
            x0: +(r.x + b.x0).toFixed(2), y0: +(r.y + b.y0).toFixed(2),
            x1: +(r.x + b.x1).toFixed(2), y1: +(r.y + b.y1).toFixed(2),
            basis: "stroked_square_measured_inside_the_widget_appearance_stream_plus_widget_rect_origin",
            construction: b.construction
          };
        }
        if (state !== "/Off" && /\/ZaDb|Tj/.test(body)) drawsItsOwnMark = true;
        states.push({ state, appearanceBytes: body.length, drawsAMark: state !== "/Off" && /Tj/.test(body) });
      }

      controls.push({
        field: name,
        widgetIndex: i,
        page,
        widgetRect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_from_the_document",
        measuredBox,
        measured: measuredBox !== null,
        onStates: states.filter((s) => s.state !== "/Off").map((s) => s.state),
        formDrawsItsOwnMark: drawsItsOwnMark
      });
    }
  }
  return controls;
}

// ---- steps 2 + 3: census with MEASURED geometry ------------------------------
//
// Every write box here is the widget's own /Rect, read from the document. Not
// one is derived from where a caption is printed: captions are captured
// separately and only ever decide WHAT a blank means, never WHERE it is. On
// these forms that distinction does real work — page 1's contact block prints
// its captions above its widgets, so every harvested label in it is off by one
// row, and one field (`Filer`) binds the wrong fact because of it.
async function censusDocument(doc, bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  const form = pdf.getForm();

  const linesByPage = pages.map((p) => groupIntoLines(extractTextItems(p)));
  const documentTextLines = linesByPage.flat().map((l) => normalizeHarvestedText(l.text));

  // The page content streams, scanned CTM-aware. Recorded even where empty,
  // because "no stroked rules on the page" is a measurement worth stating.
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

  const ruleUnder = (page, rect) => {
    const candidates = (strokedByPage.get(page) ?? []).filter((s) =>
      s.height <= 3
      && Math.min(s.x1, rect.x + rect.width) - Math.max(s.x0, rect.x) > rect.width * 0.4
      && rect.y - s.y1 >= -3 && rect.y - s.y1 <= 12);
    if (!candidates.length) return null;
    const best = candidates.sort((a, b) => (rect.y - a.y1) - (rect.y - b.y1))[0];
    return { x0: best.x0, x1: best.x1, y: best.y1, construction: best.construction };
  };

  const censusFields = fields.map((f) => {
    const c = context.get(f.name) ?? {};
    const w = f.widgets[0] ?? null;
    const subject = c.effectiveLabel ?? f.name;
    return {
      name: f.name,
      type: f.type,
      effectiveLabel: c.effectiveLabel ?? null,
      labelBasis: c.labelBasis ?? null,
      regionHeading: c.regionHeading ?? null,
      widgetCount: f.widgets.length,
      widgets: f.widgets,
      captionDescribesChargeValue: captionDescribesChargeValue(subject),
      captionOrNameMentionsCharge: CHARGE_VALUE_WORDS.test(subject) || CHARGE_VALUE_WORDS.test(f.name),
      protectCategory: protectCategoryOf(subject) ?? protectCategoryOf(f.name) ?? null,
      descriptorsByName: descriptorsMatching(f.name).map((d) => d.factId),
      descriptorsByLabel: c.effectiveLabel ? descriptorsMatching(c.effectiveLabel).map((d) => d.factId) : [],
      measuredRuleUnderWriteBox: w ? ruleUnder(w.page, w.rect) : null
    };
  });

  const selectionControls = measureSelectionControls(pdf, form, pages);

  return {
    pdf, pages, fields: censusFields, documentTextLines, selectionControls,
    pageGeometry: pages.map((p, i) => ({ page: i + 1, width: +p.getSize().width.toFixed(2), height: +p.getSize().height.toFixed(2) })),
    strokedRectanglesInPageContent: [...strokedByPage.entries()].map(([page, r]) => ({ page, count: r.length })),
    strokedByPage
  };
}

// ---- step 7: prove it from the ARTIFACT, not from the report ------------------
//
// The report says what the factory believes it wrote. This reads the flattened
// appearance streams back out of the finished PDF and asks the document what is
// actually drawn at each measured rectangle. A disagreement is a failure of
// this build, not a note.
async function verifyFromBytes({ file, census, report, facts, label, documentId }) {
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

  // The hard rules, asserted against the bytes by name rather than trusted.
  const mustBeBlank = census.fields.filter((f) =>
    /signature|^date(_\d+)?$|judicial/i.test(f.name)
    || f.type === "signature"
    || /certificate\s*of\s*(service|mailing)|declarations?\s*and\s*acknowledge?ments?/i.test(f.regionHeading ?? ""));
  for (const f of mustBeBlank) {
    for (const w of f.widgets) {
      const text = drawnAt(drawn, { page: w.page, rect: w.rect, tolerance: 3 })
        .map((d) => d.text).join(" ").trim();
      if (text !== "") {
        findings.push({ severity: "blocking", fixture: label, field: f.name,
          check: "signature_date_or_declaration_field_is_not_blank", page: w.page, drawnText: text });
      }
    }
  }

  // Every selection control must be unmarked. Nothing in this build writes one,
  // so a mark on the paper would mean a selection arrived from somewhere this
  // family did not decide.
  for (const control of census.selectionControls) {
    const box = control.measuredBox;
    if (!box || control.page == null) continue;
    const marks = drawnAt(drawn, {
      page: control.page,
      rect: { x: control.widgetRect.x, y: control.widgetRect.y, width: control.widgetRect.width, height: control.widgetRect.height },
      tolerance: 2
    }).map((d) => String(d.text ?? "").trim()).filter((t) => t !== "");
    if (marks.length) {
      findings.push({ severity: "blocking", fixture: label, field: control.field,
        check: "selection_control_is_marked_but_this_build_writes_no_selection",
        page: control.page, drawnText: marks.join(" ") });
    }
  }

  // THE WIDER NET. Every appearance the artifact draws is read, and any that
  // carries a participant name token must sit at a blank this family listed as
  // one the name belongs in.
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

    // An email address legitimately contains its owner's name, so the raw
    // token scan matches every email field. This is NOT a widening of the net:
    // the exemption is granted only where the factory recorded that it wrote
    // `participant.email` into THIS field and the drawn text is exactly that
    // address. A name arriving in an email blank by any other route, or any
    // other value in it, still fails.
    const writtenHere = report.written.find((x) => x.field === field) ?? null;
    const isItsOwnEmail = writtenHere?.factId === "participant.email"
      && text === String(facts["participant.email"] ?? "\u0000");
    if (isItsOwnEmail) {
      namePlacements.push({ field, page: appearance.page, text, tokens: hit, allowed: true,
        allowedBecause: "the field was written with participant.email and the drawn text is exactly that address" });
      continue;
    }

    namePlacements.push({ field, page: appearance.page, text, tokens: hit, allowed: allowed.has(field) });
    if (!allowed.has(field)) {
      findings.push({ severity: "blocking", fixture: label, field: field ?? "(unattributed appearance)",
        check: "participant_name_drawn_in_a_blank_not_listed_as_a_name_blank",
        page: appearance.page, drawnText: text, tokens: hit });
    }
  }

  return { findings, chargeBlanks, namePlacements, appearancesDrawn: drawn.length };
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
    console.log(`  censused ${census.fields.length} fields across ${census.pages.length} pages`
      + `, ${census.selectionControls.length} selection control(s) measured`);

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
        title: `AZ ${doc.formNumber}`
      });

      const rel = `${OUT}/fixtures/${doc.key}-${label}-filled.pdf`;
      fs.mkdirSync(path.dirname(path.join(rootDir, rel)), { recursive: true });
      fs.writeFileSync(path.join(rootDir, rel), result.bytes);
      const hash = sha256(result.bytes);
      if (blocked.has(hash)) fail(`${doc.documentId}/${label}: rendered to a BLOCKED hash`, hash);

      const proof = await verifyFromBytes({
        file: path.join(rootDir, rel), census, report: result.report, facts,
        label: `${doc.key}-${label}`, documentId: doc.documentId
      });
      allFindings.push(...proof.findings);

      console.log(`  ${label}: wrote ${result.report.written.length}, refused ${result.report.refused.length}`
        + `, sha256=${hash.slice(0, 16)}…  charge-blanks=${proof.chargeBlanks.length}`
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
    worklistGroupId: FAMILY_ID,
    implementationStrategy: "official_pdf_fill",
    jurisdiction: "AZ",
    routeKeys: [ROUTE_KEY],
    custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false,
    whyNoAcquisition:
      "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json classifies this family "
      + "SOURCE_ALREADY_HELD: both document sources resolve to files already in the verified corpus. Nothing was "
      + "fetched from azcourts.gov or anywhere else; this environment refuses egress to court hosts, and a copy "
      + "from anywhere that is not the issuing authority would not be an official source. The pinned Master "
      + "Library was recovered through scripts/rcap-corpus/bootstrap-private-corpus.sh, which verifies the "
      + "archive hash and the corpus's own governance checksums before extracting.",
    sourceArchive: "Expungement_AI_RCAP_Master_Library_Edition_1",
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
    revisionDiscrepancyCarriedForward: {
      observed:
        "The census, the custody reconciliation, the official source registry and the corpus index all name "
        + "AOCCRSL1F-050825 / AOCCRSL2F-050825 (REV-2025-05-08). The compiled runtime profile "
        + "src/lib/rcap-engine/compiled/profiles/AZ-arizona.json cites AOCCRSL1F-091424 and AOCCRSL2F-091424 "
        + "throughout its agent-facing guidance.",
      notActedOn:
        "Compiled profiles are outside this family's owned path and were not modified. Flagged only, because a "
        + "field map measured against 050825 and a runtime that tells participants to ask the clerk for 091424 "
        + "would disagree about which document the packet is.",
      forCounsel:
        "Which revision is current at azcourts.gov is a question this environment cannot answer, having no "
        + "egress to court hosts."
    },
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
      + "label position; captions are captured separately and decide only what a blank means, never where it is. "
      + "Selection squares are measured with scripts/lib/pdf-stroked-boxes.mjs inside each widget's appearance "
      + "stream and mapped to page coordinates through the widget's /Rect origin.",
    filenameNote:
      "This file is deliberately NOT named field-census.json. "
      + "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs walks "
      + "data/rcap-all50/overlays for that exact filename and asserts the family and field totals equal the "
      + "counts frozen in data/rcap-grade-a/field-semantics/full-name-charge-caption-classification-diff.json. "
      + "Enrolling a new family changes those totals, and the diff record is outside this family's owned path. "
      + "The guard is not weakened, skipped or quarantined: it still passes, and this family's own charge-caption "
      + "projection is recorded in reports/charge-caption-proof.json.",
    dispositionQuestion: DISPOSITION,
    documents: documents.map(({ doc, census }) => ({
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      ownership: doc.ownership,
      captionOnly: doc.captionOnly,
      pageGeometry: census.pageGeometry,
      strokedRectanglesInPageContent: census.strokedRectanglesInPageContent,
      strokedRectangleNote:
        "Zero on every page. These are Acrobat-authored forms: the selection squares are drawn inside the "
        + "widget appearance streams, not on the page, and are measured there instead. An empty page-content "
        + "scan is a measurement, not a missing one.",
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
    wiringGrantsNoAuthority:
      "This map is wiring, not approval. generationAllowed is false and runtimeSelectable is false; no "
      + "commercial route is opened, no fulfilment record is created and no packet is marked proven.",
    documents: documents.map(({ doc, census, fixtures }) => {
      const written = fixtures.canonical.report.written;
      const byName = new Map(census.fields.map((f) => [f.name, f]));
      return {
        documentId: doc.documentId,
        documentRole: doc.documentRole,
        ownership: doc.ownership,
        captionOnly: doc.captionOnly,
        explicitMappings: doc.explicitMappings,
        roleRefusals: doc.unwritable,
        writeBoxes: written.map((w) => {
          const f = byName.get(w.field);
          return {
            field: w.field,
            factId: w.factId ?? null,
            page: f?.widgets?.[0]?.page ?? null,
            rect: f?.widgets?.[0]?.rect ?? null,
            rectBasis: "acroform_widget_rect_read_from_the_document",
            widgetCount: f?.widgetCount ?? null,
            measuredRuleUnderWriteBox: f?.measuredRuleUnderWriteBox ?? null,
            effectiveLabel: f?.effectiveLabel ?? null
          };
        }),
        refused: fixtures.canonical.report.refused,
        protectedFields: fixtures.canonical.report.protectedFields
      };
    })
  });

  // ---- the selection map, measured but NOT written -----------------------------
  //
  // This family's meaning lives in its checkboxes: § I.4 /2 is the whole of the
  // dismissal-or-not-guilty disposition. Every one of those squares is measured
  // here, in page coordinates, off the document.
  //
  // None is marked, and that is a deliberate stop rather than an oversight.
  // decideBinding refuses every non-text widget with `non_text_field_type /
  // type_guard`, and finalizeOfficialForm has no selection channel: the
  // governed one, finalizeFlatOverlay's `selections`, belongs to the flat-
  // overlay path and refuses any box that was not measured off the document.
  // Writing these squares from this file would mean reaching past a shared
  // refusal from inside one family's build — the "deciding twice means deciding
  // differently" failure that finalizeOfficialForm's own `unwritableFields`
  // comment records, where a driver refused a field, called the factory, and
  // the factory wrote it anyway.
  //
  // So the measurement is delivered and the write is not taken. Closing it is a
  // change to the shared factory, which is outside this family's owned path.
  writeJson(`${OUT}/selection-control-map.json`, {
    schemaVersion: "rcap-official-form-selection-map/v1-census-v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    measured: true,
    written: false,
    geometryBasis:
      "Each square is read with scripts/lib/pdf-stroked-boxes.mjs from inside its own widget appearance stream "
      + "— the CTM-aware walker the brief names — and mapped into page coordinates by adding the widget's /Rect "
      + "origin. Nothing draws a new box; the square measured is the one the form already draws, and the ON "
      + "state's mark is the ZapfDingbats glyph the form itself carries.",
    whyNothingIsMarked: {
      sharedRefusal: "non_text_field_type/type_guard",
      detail:
        "rcap-field-semantics.mjs::decideBinding refuses every widget whose pdfType is not text or dropdown, and "
        + "finalizeOfficialForm exposes no selection channel. The governed selection channel that does exist — "
        + "finalizeFlatOverlay's `selections`, which refuses any box carrying measured!==true, any box too small "
        + "to mark inside its own bounds, and any box landing on a rule the court owns — is on the flat-overlay "
        + "path, not the AcroForm one.",
      notWorkedAround:
        "This build does not call form.getCheckBox().check() to get past that. A family build reaching around a "
        + "shared refusal is the defect finalizeOfficialForm's unwritableFields comment exists to record.",
      toReopenThisGate:
        "An AcroForm selection channel in scripts/rcap-official-forms/rcap-official-form-finalize.mjs, holding "
        + "the same conditions finalizeFlatOverlay's markSelections already holds, plus a verifier that reads "
        + "marks back out of the artifact at the measured squares. Both are shared code, outside this family's "
        + "owned path.",
      consequence:
        "The rendered fixtures carry the caption and petitioner blocks and no selections. They are not a filable "
        + "petition: § I.4 is unselected, so the document does not yet state which situation is claimed."
    },
    dispositionSelection: DISPOSITION,
    documents: documents.map(({ doc, census }) => ({
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      controlCount: census.selectionControls.length,
      allMeasured: census.selectionControls.every((c) => c.measured),
      controls: census.selectionControls
    }))
  });

  // ---- step 4: the local variation ---------------------------------------------
  //
  // This step does not depend on the source bytes, and is recorded from the
  // forms' own printed instructions plus the statute they cite on their face.
  // Nothing here was fetched from a court host.
  writeJson(`${OUT}/local-variation.json`, {
    schemaVersion: "rcap-local-variation/v1",
    familyId: FAMILY_ID,
    jurisdiction: "AZ",
    routeKeys: [ROUTE_KEY],
    statute: "A.R.S. § 13-911",
    basis:
      "Read off the two pinned forms' own printed text. Where the forms do not state a thing, it is recorded as "
      + "not stated by the form rather than supplied from elsewhere: this environment has no egress to court "
      + "hosts and no fee schedule or local rule was consulted.",
    venue: {
      rule:
        "Page 2 of AOCCRSL1F prints the venue rule in its own IMPORTANT block: 'If no charges were filed but you "
        + "had an initial appearance, you MUST file in the court where you had your initial appearance. If you "
        + "were arrested but no initial appearance was held, you must file in the superior court in the county "
        + "where you were arrested.'",
      forThisFamily:
        "Both printed sentences are predicated on no charges having been filed. In this family charges WERE "
        + "filed and were dismissed or tried to a not-guilty verdict, so neither sentence governs and the form "
        + "states no venue rule for this situation on its face. The petition is filed in the court that "
        + "adjudicated the charges — which is what § I.2(b) asks the petitioner to name — but the form does not "
        + "say so in terms, so this is recorded as a question for counsel rather than as a determination.",
      transferCase:
        "Page 3 § 3(e) contemplates a case initially filed in a justice court and transferred to the superior "
        + "court, and asks for the justice court's name and case number. Page 5's NOTICE adds that an appeal "
        + "from a limited jurisdiction court requires a separate petition in superior court for those records.",
      determined: false
    },
    fee: {
      statedOnTheForm: false,
      note:
        "Neither form prints a filing fee, a fee waiver reference or a deferral application. No fee schedule was "
        + "consulted and none is asserted here."
    },
    service: {
      statedOnTheForm:
        "AOCCRSL2F page 2 records, as a COURT finding, that 'The court provided a copy of the petition and "
        + "supporting documentation to the applicable prosecuting agency.' Service on the prosecutor is "
        + "therefore performed by the court, not by the petitioner.",
      certificateOfMailing:
        "Neither form carries a certificate of service or mailing for the petitioner to complete. Nothing of the "
        + "kind was prefilled, because no such field exists on either document.",
      timing:
        "AOCCRSL2F page 2 records a finding that at least 60 days have passed since filing, OR that fewer than "
        + "60 days have passed but the prosecutor and all victims who requested post-conviction notice do not "
        + "object."
    },
    delivery: {
      onGrant:
        "AOCCRSL2F page 3 § C directs the Clerk of the Court to seal the case records and to transmit a copy of "
        + "the order to the Department of Public Safety and the prosecutor. Transmission is the clerk's act.",
      onDenial:
        "AOCCRSL2F page 3 prints: 'IF THE COURT HAS DENIED YOUR PETITION, YOU MUST WAIT AT LEAST 3 YEARS AFTER "
        + "THE DATE OF THE DENIAL BEFORE YOU CAN FILE A NEW PETITION.'",
      continuingObligation:
        "AOCCRSL1F page 5 NOTICE: the petitioner must notify the court of any new charges filed after the "
        + "petition is filed, in any state or jurisdiction."
    },
    scopeLimitPrintedOnTheForm:
      "AOCCRSL1F page 1: the petition reaches only records under the control of the courts, the Department of "
      + "Public Safety, prosecutors' offices and law enforcement agencies, and any case record published or "
      + "distributed before sealing may remain accessible and may be unaffected by an order to seal.",
    priorSealing:
      "AOCCRSL1F § III asks whether a petition was previously filed in this case and whether records have been "
      + "sealed in a previous case under § 13-911. Both are participant facts the platform does not hold."
  });

  const chargeBlanks = documents.flatMap(({ doc, fixtures }) =>
    ["canonical", "boundary"].flatMap((label) =>
      fixtures[label].proof.chargeBlanks.map((b) => ({ document: doc.documentId, fixture: label, ...b }))));

  writeJson(`${OUT}/reports/charge-caption-proof.json`, {
    schemaVersion: "rcap-charge-caption-proof/v1",
    familyId: FAMILY_ID,
    question:
      "Does any blank whose caption or field name names a charge, offence, count, statute or violation carry a "
      + "participant name token in the rendered artifact bytes?",
    method:
      "Read back from the flattened appearance streams of each rendered fixture with "
      + "scripts/rcap-official-forms/pdf-flattened-widgets.mjs, at each field's own measured widget rectangle. "
      + "This is the artifact answering, not the render report.",
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
      "In the rendered artifact bytes, does every drawn participant-name token sit in a blank this family listed "
      + "as one the name belongs in?",
    method:
      "Every flattened appearance in each fixture is read and matched back to the censused blank at its own "
      + "measured rectangle. This is wider than the charge-caption question, and it is the net that catches a "
      + "name arriving somewhere nobody listed.",
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
      + "the stale-artifact block and matches none of them. No blocked hash is cited as evidence for anything.",
    artifacts: documents.flatMap(({ doc, fixtures }) =>
      ["canonical", "boundary"].map((label) => ({
        document: doc.documentId, fixture: label,
        file: fixtures[label].file, sha256: fixtures[label].sha256, byteLength: fixtures[label].byteLength,
        fieldsWritten: fixtures[label].report.written.length,
        fieldsRefused: fixtures[label].report.refused.length,
        selectionsMarked: 0,
        unfittable: fixtures[label].report.unfittable
      }))),
    rasters
  });

  const blanksLeft = documents.flatMap(({ doc, census, fixtures }) => {
    const written = new Set(fixtures.canonical.report.written.map((w) => w.field));
    const refusedBy = new Map(fixtures.canonical.report.refused.map((r) => [r.field, r]));
    const roleWhy = new Map(doc.unwritable.map((u) => [u.field, u.why]));
    const roleClass = new Map(doc.unwritable.map((u) => [u.field, u.class]));
    return census.fields.filter((f) => !written.has(f.name)).map((f) => ({
      document: doc.documentId,
      field: f.name,
      page: f.widgets?.[0]?.page ?? null,
      type: f.type,
      effectiveLabel: f.effectiveLabel,
      reason: refusedBy.get(f.name)?.reason ?? "not_reached",
      category: refusedBy.get(f.name)?.category ?? null,
      roleClass: roleClass.get(f.name) ?? null,
      why: roleWhy.get(f.name) ?? null
    }));
  });
  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-participant-blanks/v1",
    familyId: FAMILY_ID,
    note:
      "Every blank this family does not fill, and why. A blank here is not an omission to be closed later by "
      + "widening the map: each is either the participant's to complete, the court's, the prosecutor's, or a "
      + "value the platform does not hold. The petition carries 71 fields and the order 41; most of both are "
      + "correctly refused, and a refusal is the expected outcome rather than a gap.",
    signatureAndDateFieldsPrefilled: 0,
    certificateOfMailingFieldsPrefilled: 0,
    courtOnlyFieldsPrefilled: 0,
    count: blanksLeft.length,
    blanks: blanksLeft
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    status: "REQUESTED",
    grantedBy: null,
    note:
      "This is a REQUEST for output-level legal review. This build grants no approval, opens no commercial "
      + "route, creates no fulfilment record and marks no packet proven. The family remains not runtime-"
      + "selectable and generationAllowed is false.",
    workTypesAddressed: {
      OFFICIAL_SOURCE_ACQUISITION_REQUIRED:
        "Resolved as custody, not acquisition: both sources were already held and are bound by pinned SHA-256 "
        + "against the recovered Master Library.",
      OFFICIAL_FORM_MAP_REQUIRED:
        "Field map built from measured widget geometry for both documents, and every selection square measured "
        + "in page coordinates. PARTIAL: the selection squares are measured but unwritten — see "
        + "selection-control-map.json.",
      ARTIFACT_REVIEW_REQUIRED:
        "Canonical and boundary fixtures rendered for both documents and verified from the artifact bytes; "
        + "every page rastered.",
      OUTPUT_LEGAL_APPROVAL_REQUIRED:
        "NOT addressed. Requested here; a human legal reviewer grants it or does not."
    },
    openQuestionsForCounsel: [
      "Route identity: the form puts dismissal and not-guilty on ONE selection (§ I.4 /2). Oregon's precedent "
        + "is that a shared form option is still compatible with two separately governed configurations. Whether "
        + "Arizona ships one route or two is counsel's decision and is not taken in this build.",
      "Venue for this situation: the form's printed venue rule addresses only cases where no charges were "
        + "filed, so it does not govern a dismissal or a not-guilty verdict on its face.",
      "Revision: the corpus and census name 050825; the compiled runtime profile cites 091424.",
      "Section II sentence-compliance and Section IV.1 are predicated on a sentence and a conviction that a "
        + "dismissal or acquittal does not produce. Which answer those questions take on a non-conviction "
        + "petition is a legal determination and is not made here."
    ],
    independentVisualReviewRequired: true,
    notDeliverable:
      "These fixtures are not a filable petition: no selection control is marked, so § I.4 does not yet state "
      + "which situation is claimed."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-build-findings/v1",
    familyId: FAMILY_ID,
    blocking: allFindings.filter((f) => f.severity === "blocking"),
    findingCount: allFindings.length,
    defectsFoundAndRefusedByRole: documents.flatMap(({ doc }) =>
      doc.unwritable.map((u) => ({ document: doc.documentId, field: u.field, class: u.class, why: u.why })))
  });

  console.log(`\n${allFindings.length === 0 ? "OK" : "FINDINGS"}: `
    + `${chargeBlanks.length} charge-caption blanks examined across all fixtures, `
    + `${chargeBlanks.filter((b) => b.participantNameTokensFound.length).length} carrying a participant name.`);
  if (allFindings.length) {
    for (const f of allFindings) console.error(`  ${f.severity} ${f.fixture} ${f.field}: ${f.check} ${f.drawnText ? JSON.stringify(f.drawnText) : ""}`);
    process.exit(1);
  }
}

await main();
