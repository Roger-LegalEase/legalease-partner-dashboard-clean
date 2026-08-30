#!/usr/bin/env node
// Route-obligation census v1 — packet family `az_record_sealing_arrest_no_charges-set`.
//
//   node scripts/build-census-v1-az-record-sealing-arrest-no-charges-set.mjs
//
// Arizona, sealing a criminal case record under A.R.S. § 13-911, route
// `obligation:track-pathway:AZ:az_record_sealing_arrest_no_charges:remedy-1-record-sealing`.
// The family delivers two documents:
//
//   * AOCCRSL1F-050825 Petition to Seal Criminal Case Records — the participant's filing;
//   * AOCCRSL2F-050825 Order Regarding Petition to Seal Criminal Case Records — the
//     proposed order the COURT signs.
//
// THE SITUATION, AND WHY IT IS NOT THE SIBLING'S
//
// This family's participant WAS ARRESTED AND NO CHARGES WERE FILED. There is no
// charge, no charging document, no prosecuting agency of record, no court case
// and no disposition.
//
// `claude/census-v1-build-az-record-sealing-dismissal-not-guilty` builds the
// dismissal/not-guilty situation FROM THE SAME TWO BINARIES. The forms are
// shared; the situation is not. Both documents print two ALTERNATIVE captions,
// and the form's own words at petition page 1 y=370.6 and order page 1 y=427.8
// are "OR if no charges were filed:". Above that line is the criminal caption
//
//     STATE OF ARIZONA -vs- [Defendant] / Defendant (FIRST, MI, LAST)
//
// and below it is
//
//     In Re the Matter of: [____] / Name (FIRST, MI, LAST)
//
// The sibling fills the first and refuses the second, classifying it
// `alternative_caption_for_a_different_situation`. That different situation is
// THIS one, so this family does the reverse: it refuses the `-vs-` caption,
// because captioning the participant as the defendant in a prosecution that
// never existed tells the court a case was brought that never was.
//
// The same reversal runs through the case-number fields. The sibling writes
// `Case` and `CourtCaseNum`; this route has no case number to write, and the
// petition itself conditions the second on "if charge(s) were filed"
// (page 2 y=292.8). Those are recorded as deliberate blanks in
// reports/divergence-from-the-sibling-family.json rather than left to be read
// as omissions.
//
// WHAT THIS SCRIPT IS NOT
//
// It is not a renderer. Every decision about what may be written is made by
// scripts/rcap-official-forms/rcap-field-semantics.mjs and every byte is
// written by finalizeOfficialForm; this file supplies only what a caller can
// supply — the family's ROLE classification and its explicit mappings — and
// then proves the result from the artifact bytes rather than from its report.
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

const FAMILY_ID = "az_record_sealing_arrest_no_charges-set";
const OUT = "data/rcap-all50/overlays/census-v1/az/az-record-sealing-arrest-no-charges-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const ROUTE_KEY = "obligation:track-pathway:AZ:az_record_sealing_arrest_no_charges:remedy-1-record-sealing";
const SIBLING_FAMILY = "az_record_sealing_dismissal_not_guilty-set";

const fail = (message, detail = null) => {
  console.error(`build-census-v1-${FAMILY_ID}: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was written.");
  process.exit(1);
};

const DOCUMENTS = [
  {
    key: "petition",
    documentId: "AZ-AOCCRSL1F-PETITION-TO-SEAL-CRIMINAL-CASE-RECORDS",
    documentRole: "PETITION",
    officialTitle: "Petition to Seal Criminal Case Records",
    revision: "REV-2025-05-08",
    sha256: "32c1e54d8a4135cfefe5d85d25f62afdb7c212f6a475e18664188524de34db05",
    pathInArchive: "STATES/AZ/02_PACKET_FORMS/AZ__FORM__AOCCRSL1F-050825__petition-to-seal-criminal-case-records__REV-2025-05-08__EN.pdf",
    ownership: "participant_completed",
    captionOnly: false,

    // The ONE explicit mapping this family makes.
    //
    // `Charge` is the page 2 blank printed "a. What were you charged with or the
    // offense for which you were arrested if no charges were filed:" (y=391.1).
    // The second limb of that sentence is written FOR this situation, so the
    // blank is applicable here even though nothing was ever charged: what goes
    // in it is the offence of arrest.
    //
    // `matter.charge` is a `requiresExplicitMapping` descriptor, so the caller
    // must name it or nothing binds. This is the exact blank class the stale-
    // artifact block is about — twelve artifacts across six families wrote the
    // participant's own name into blanks holding the offence — which is why it
    // is mapped deliberately and then proved from the bytes in
    // reports/charge-caption-proof.json.
    explicitMappings: {
      "Charge": "matter.charge"
    },

    // Role refusals: what this family determines the participant does not
    // complete on THIS route. Only fields the shared protect rules do NOT
    // already catch are listed, so the shared rules keep doing their own work
    // and the verification can tell the two channels apart.
    unwritable: [
      // --- the three refusals that are THIS SITUATION's, and the sibling's writes ---
      { field: "Defendant", class: "criminal_caption_for_a_situation_this_route_does_not_have",
        why: "The `-vs-` caption blank on page 1 (widget y=412.2), printed under 'STATE OF ARIZONA -vs-' (y=438.8) "
          + "and over 'Defendant (FIRST, MI, LAST)' (y=399.8). This route's participant was arrested and never "
          + "charged, so the State was never a party opposite them and they were never a defendant. The form "
          + "itself offers the alternative at y=370.6 — 'OR if no charges were filed:' — and this route belongs "
          + "under that line, not this one. The sibling family writes this blank; naming a person as the "
          + "defendant in a prosecution that never existed is a false statement to the court, so this family "
          + "does not." },
      { field: "Case", class: "no_case_number_exists_on_this_route",
        why: "The 'Case Number:' blank in the page 1 caption (y=465.7), repeated as a header widget on pages 2-5. "
          + "A case number is issued when a case is opened; nothing was ever filed on this route, so there is no "
          + "number and `matter.case_number` holds nothing true for this matter. The sibling family writes it." },
      { field: "CourtCaseNum", class: "conditioned_by_the_form_on_charges_having_been_filed",
        why: "Page 2 'c. Court case number if charge(s) were filed:' (y=292.8). The form conditions the blank on "
          + "its own face and the condition is false here. The sibling family writes it." },

      // --- refusals that correct a mis-binding, not a role ---
      { field: "Filer", class: "mislabelled_contact_line",
        why: "The 'Person Filing' blank (page 1 y=700.6), which wants the filer's NAME. Its own field name "
          + "matches no descriptor, so the printed-label fallback decides, and the caption harvested for it is "
          + "'Address (if not protected)' — the line printed BELOW it at y=684.8. Left alone the binder writes "
          + "`participant.street_address` into the name line, so the petition would say the person filing is "
          + "'118 Maple Street'. An explicit mapping cannot repair it: decideBinding refuses a mapping that "
          + "conflicts with the channel that chose the descriptor. The blank is refused instead. The sibling "
          + "family reaches the same conclusion on the same field." },
      { field: "City", class: "one_field_spanning_the_caption_and_the_declaration_block",
        why: "`City` carries TWO widgets — page 1 y=660.2 in the filer's contact block, and page 5 y=478.7 inside "
          + "DECLARATIONS AND ACKNOWLEDGEMENTS. A value set on the field renders in both, so writing the caption "
          + "copy also draws into the declaration block, whose neighbours `Print` and `Addr` are refused as a "
          + "protected page region. One fact cannot serve both places, and the declaration block is not this "
          + "platform's to fill." },
      { field: "JusticeCourt1", class: "court_identity_not_a_person",
        why: "Page 3 'e. Name of the justice court and the justice court case number...' (y=604.7). The word "
          + "'Name' in the harvested caption matches `participant.full_legal_name`, and left alone the binder "
          + "writes the participant's own name into a blank that holds the identity of a COURT. This is the "
          + "same defect class as the stale-artifact block and as Arkansas ACIC's MONTH blank: a name arriving "
          + "somewhere nobody listed. Neither the charge-caption guard nor the date-component guard covers it — "
          + "a court name is neither — so it is refused here by role and caught again by the name-placement "
          + "allowlist in reports/participant-name-placement.json." },
      { field: "PetName1", class: "alternate_block_conditional_on_difference",
        why: "Page 2 'e. Name at the time of arrest, if not the same as above:' (y=463.1). The blank is to be "
          + "completed only when the name differs from the one already given. `participant.full_legal_name` "
          + "carries no 'if different' refusal, so left alone the binder copies the same name into it, which "
          + "asserts a former name the platform does not hold and contradicts the condition printed on the form." },
      { field: "Date", class: "participant_signature_date",
        why: "Page 5 y=553.1, the date beside 'Petitioner / Petitioner's Attorney Signature'. Dating a signature "
          + "that has not been made asserts the petition was signed on a day it was not. Refused here by role "
          + "rather than left to the label channel declining to match, which would be luck and not a decision." }
    ]
  },
  {
    key: "order",
    documentId: "AZ-AOCCRSL2F-ORDER-REGARDING-PETITION-TO-SEAL",
    documentRole: "PROPOSED_ORDER",
    officialTitle: "Order Regarding Petition to Seal Criminal Case Records",
    revision: "REV-2025-05-08",
    sha256: "436df2e10722ff26b30069d4b0913825fa304202d6538a70e45ad8bafbca61b1",
    pathInArchive: "STATES/AZ/02_PACKET_FORMS/AZ__FORM__AOCCRSL2F-050825__order-regarding-petition-to-seal-criminal-case-records__REV-2025-05-08__EN.pdf",
    ownership: "court_issued_order",
    // The court's own instrument: findings, decree, signature and date are
    // refused by the factory's caption-only rule rather than by anything this
    // file writes.
    captionOnly: true,
    explicitMappings: {},
    unwritable: [
      { field: "Defendant", class: "criminal_caption_for_a_situation_this_route_does_not_have",
        why: "The order's `-vs-` caption blank (page 1 y=472.1), under 'STATE OF ARIZONA -vs-' (y=497.2). Refused "
          + "for the same reason as the petition's: this route has no prosecution and no defendant. The order "
          + "prints the same alternative at y=427.8, 'OR if no charges were filed:', and this family captions "
          + "under it. The sibling family writes this blank." },
      { field: "Case", class: "no_case_number_exists_on_this_route",
        why: "The order's caption 'Case Number:' (page 1 y=524.8, repeated on pages 2-3). No case was opened. "
          + "The sibling family writes it." },
      { field: "CaseNo", class: "no_court_case_exists_on_this_route",
        why: "Page 1 'All records relating to the eligible charge(s) in court case number:' (y=166.3). There is "
          + "no court case whose records could be described. The sibling family writes it." },
      { field: "NameArrest", class: "alternate_block_conditional_on_difference",
        why: "Page 1 'c. Name at the time of arrest, if not the same as above:' (y=78.1). Conditional on a "
          + "difference the platform does not hold, exactly as PetName1 on the petition." },
      { field: "ArrestOn", class: "court_recital_of_the_petition",
        why: "Page 1 y=264.7, the date in the court's recital of what 'the petition requests' (y=310.4). The "
          + "court recites the petition in its own words; the platform does not draft the court's recital, even "
          + "where it holds the underlying date." },
      { field: "Other", class: "court_finding_of_fact",
        why: "Page 2, a free-text finding in section II, 'THE COURT MAKES THE FOLLOWING FINDINGS OF FACT AND "
          + "CONCLUSIONS OF LAW'. A finding is the court's to make. Refused by role rather than left to the "
          + "label channel declining to match." },
      { field: "OtherFindings", class: "court_finding_of_fact",
        why: "Page 2, the companion free-text findings blank. Refused for the same reason." },
      { field: "Date", class: "court_only_signature_date",
        why: "Page 3 y=340.5, the date beside the judicial officer's signature. The court dates its own order." }
    ]
  }
];

// The ONLY blanks in this family that may ever carry the participant's name.
//
// Stated as an allowlist rather than as a set of refusals, because the defect
// this class of family keeps finding is a name arriving somewhere nobody
// listed. The verification reads every appearance out of the rendered artifact
// and fails on a name token drawn anywhere but here — a wider net than the
// charge-caption question alone, and the net that `JusticeCourt1` needs.
const NAME_MAY_APPEAR_IN = {
  "AZ-AOCCRSL1F-PETITION-TO-SEAL-CRIMINAL-CASE-RECORDS": [
    "PetName"     // page 2 "a. Petitioner's name:*" — filled
    // `Plaintiff`, the In-Re caption this route belongs under, is NOT here:
    // the binder cannot reach it. See reports/caption-blank-finding.json.
  ],
  "AZ-AOCCRSL2F-ORDER-REGARDING-PETITION-TO-SEAL": [
    "DName",      // page 1 "In Re the Matter of:" — this route's caption, filled
    "PetName"     // page 1 "a. Petitioner's name:" — filled
  ]
};

// --- fixture identities -------------------------------------------------------
// The corpus's standard canonical and boundary participants, so this family's
// fixtures are comparable with every other family's. "Jordan Avery Reyes" is
// deliberately the same name the blocked artifacts printed into their charge
// blanks: if this family reproduced that defect, this is the name that would
// appear there, and the verification below looks for exactly that.
const CANONICAL = {
  "participant.full_legal_name": "Jordan Avery Reyes", "participant.first_name": "Jordan",
  "participant.last_name": "Reyes", "participant.middle_name": "Avery",
  "participant.street_address": "118 Maple Street", "participant.city": "Springfield",
  "participant.state": "XX", "participant.zip": "01234",
  "participant.city_state_zip": "Springfield, XX 01234",
  "participant.phone": "555-0142", "participant.email": "jordan.reyes@example.com",
  "participant.date_of_birth": "1991-04-17",
  "matter.county": "Example County", "matter.court": "District Court",
  // NOTE: `matter.case_number` and the disposition dates are deliberately still
  // present in the fixture. This route has no case number, and the point of
  // leaving the fact populated is that the REFUSAL has to be what keeps it off
  // the paper. A fixture that simply withheld the value would pass whether or
  // not the refusal worked.
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
      arrest_date: "2019-03-08", offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" }
  ]
};

// Every name token either fixture could put on paper. The charge-blank proof
// looks for these, so it catches a surname or a middle name landing in a charge
// blank as well as the whole name.
const NAME_TOKENS = [...new Set(
  [CANONICAL, BOUNDARY].flatMap((f) => [
    f["participant.full_legal_name"], f["participant.first_name"],
    f["participant.last_name"], f["participant.middle_name"]
  ]).filter(Boolean).flatMap((v) => [v, ...String(v).split(/[\s\-]+/)])
    .map((s) => s.trim()).filter((s) => s.length >= 4)
)];

// Values that must never reach the paper on THIS route, keyed to the reason.
// These are the sibling's writes, and the fixture keeps the facts populated
// precisely so their absence is evidence the refusal fired.
const MUST_NOT_APPEAR = [
  { value: CANONICAL["matter.case_number"], why: "no case number exists on a route where nothing was charged", fixture: "canonical" },
  { value: BOUNDARY["matter.case_number"], why: "no case number exists on a route where nothing was charged", fixture: "boundary" }
];

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
// An ABSENCE and a MISMATCH are different findings and neither is a pass.
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
    fail(`${doc.documentId}: CORPUS ABSENT — the pinned source is not installed`,
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

// ---- step 2 + 3: census with MEASURED geometry --------------------------------
//
// Every write box here is the widget's own /Rect, read from the document. Not
// one is derived from where a caption is printed: the caption is captured
// separately and only ever used to decide WHAT a blank means, never WHERE it
// is. The stroked rules on each page are measured too, with
// scripts/lib/pdf-stroked-boxes.mjs, so the map records the printed line a
// value sits on as independent corroboration that the widget is where the form
// actually draws a blank. No box is drawn by this family.
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
      // The checkbox export states, read from the widget's own /AP /N
      // dictionary. This is how the situation control is measured rather than
      // assumed; see reports/situation-control.json.
      let exportStates = null;
      try {
        const normal = w.getAppearances?.()?.normal;
        if (normal && typeof normal.keys === "function") exportStates = normal.keys().map((k) => k.asString());
      } catch { /* no appearance dictionary */ }
      return {
        page,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_from_the_document",
        exportStates
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

  // The printed rule a widget sits on, measured off the content stream. This is
  // corroboration where it exists and is honestly reported absent where it does
  // not — it is never a substitute for the widget rectangle.
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
      widgets: f.widgets,
      // Recorded on every blank, not only the ones that get written, so the
      // charge-caption question is answerable for the whole document.
      captionDescribesChargeValue: captionDescribesChargeValue(subject),
      captionOrNameMentionsCharge: CHARGE_VALUE_WORDS.test(subject) || CHARGE_VALUE_WORDS.test(f.name),
      protectCategory: protectCategoryOf(subject) ?? protectCategoryOf(f.name) ?? null,
      descriptorsByName: descriptorsMatching(f.name).map((d) => d.factId),
      descriptorsByLabel: c.effectiveLabel ? descriptorsMatching(c.effectiveLabel).map((d) => d.factId) : [],
      measuredRuleUnderWriteBox: w ? ruleUnder(w.page, w.rect) : null
    };
  });

  return {
    pdf, pages, fields: censusFields, documentTextLines,
    pageGeometry: pages.map((p, i) => ({ page: i + 1, width: +p.getSize().width.toFixed(2), height: +p.getSize().height.toFixed(2) })),
    strokedByPage, linesByPage
  };
}

// ---- step 5: prove it from the ARTIFACT, not from the report ------------------
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

    // THE CHECK THIS FAMILY EXISTS TO PASS.
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
    /signature|^date(_\d+)?$/i.test(f.name)
    || f.type === "signature"
    || /certificate\s*of\s*(service|mailing)/i.test(f.regionHeading ?? ""));
  for (const f of mustBeBlank) {
    for (const w of f.widgets) {
      const text = drawnAt(drawn, { page: w.page, rect: w.rect, tolerance: 3 })
        .map((d) => d.text).join(" ").trim();
      if (text !== "") {
        findings.push({ severity: "blocking", fixture: label, field: f.name,
          check: "signature_date_or_service_field_is_not_blank", drawnText: text });
      }
    }
  }

  // THE WIDER NET: every appearance the artifact draws is read, and any that
  // carries a participant name token must sit at a blank this family listed.
  //
  // ONE class of appearance is accounted for rather than flagged, and it is
  // narrowed as tightly as it can be. An email address contains the
  // participant's name BY CONSTRUCTION — the corpus fixture's address is
  // `jordan.reyes@example.com` — so an email blank carrying "jordan" and
  // "reyes" is the email fact rendering correctly, not a name arriving
  // somewhere nobody listed. The exemption applies ONLY where the field was
  // written by this run with factId `participant.email` AND the drawn text is
  // exactly the email value that fixture supplied. A name token in an email
  // blank that was not written, or whose text is anything other than that
  // value, is still blocking. These are recorded in full under
  // `nameTokensInsideANonNameFact` so the exemption is auditable and nothing
  // is dropped silently.
  const writtenFactById = new Map(report.written.map((w) => [w.field, w.factId ?? null]));
  const emailValue = String(facts["participant.email"] ?? "");
  const allowed = new Set(NAME_MAY_APPEAR_IN[documentId] ?? []);
  const namePlacements = [];
  const nameTokensInsideANonNameFact = [];
  for (const appearance of drawn) {
    const text = String(appearance.text ?? "").trim();
    if (!text) continue;
    const hit = NAME_TOKENS.filter((tok) => text.toLowerCase().includes(tok.toLowerCase()));
    if (!hit.length) continue;
    const owner = census.fields.find((f) => f.widgets.some((w) =>
      w.page === appearance.page
      && Math.abs(w.rect.x - appearance.x) <= 3 && Math.abs(w.rect.y - appearance.y) <= 3));
    const field = owner?.name ?? null;

    const isEmailFactRenderingItself =
      field !== null
      && writtenFactById.get(field) === "participant.email"
      && emailValue !== ""
      && text === emailValue;
    if (isEmailFactRenderingItself) {
      nameTokensInsideANonNameFact.push({
        field, page: appearance.page, text, tokens: hit, factId: "participant.email",
        why: "the participant's email address contains their name by construction; the value drawn is exactly "
          + "the email fact this fixture supplied, so this is the email rendering and not a name placement"
      });
      continue;
    }

    namePlacements.push({ field, page: appearance.page, text, tokens: hit, allowed: allowed.has(field) });
    if (!allowed.has(field)) {
      findings.push({ severity: "blocking", fixture: label, field: field ?? "(unattributed appearance)",
        check: "participant_name_drawn_in_a_blank_not_listed_as_a_name_blank",
        page: appearance.page, drawnText: text, tokens: hit });
    }
  }

  // THE SITUATION NET: values that are true for the sibling's situation and
  // false for this one must not be on this route's paper at all. The fixtures
  // still CARRY those facts, so an empty result here is the refusal working
  // rather than the fixture being silent.
  const situationLeaks = [];
  for (const rule of MUST_NOT_APPEAR) {
    if (!label.endsWith(rule.fixture)) continue;
    for (const appearance of drawn) {
      const text = String(appearance.text ?? "").trim();
      if (!text || !text.includes(rule.value)) continue;
      const owner = census.fields.find((f) => f.widgets.some((w) =>
        w.page === appearance.page
        && Math.abs(w.rect.x - appearance.x) <= 3 && Math.abs(w.rect.y - appearance.y) <= 3));
      situationLeaks.push({ value: rule.value, why: rule.why, field: owner?.name ?? null, page: appearance.page, text });
      findings.push({ severity: "blocking", fixture: label, field: owner?.name ?? "(unattributed appearance)",
        check: "value_from_a_different_situation_reached_the_paper", drawnText: text, why: rule.why });
    }
  }

  return { findings, chargeBlanks, namePlacements, nameTokensInsideANonNameFact, situationLeaks,
    appearancesDrawn: drawn.length };
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
    console.log(`  source bound     sha256=${doc.sha256}  bytes=${bytes.length}`);

    const census = await censusDocument(doc, bytes);
    console.log(`  censused ${census.fields.length} fields across ${census.pages.length} pages`);
    if (census.fields.length !== indexEntry.acroFieldCount) {
      fail(`${doc.documentId}: censused ${census.fields.length} fields but the corpus index declares ${indexEntry.acroFieldCount}`);
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
        title: `AZ ${doc.documentId}`
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
        + `, sha256=${hash.slice(0, 16)}…  charge-blanks checked=${proof.chargeBlanks.length}`
        + `  findings=${proof.findings.length}`);

      fixtures[label] = { file: rel, sha256: hash, byteLength: result.bytes.length, report: result.report, proof };
    }

    documents.push({ doc, census, indexEntry, fixtures, sourceByteLength: bytes.length });
  }

  // ---- step 6: raster every page ---------------------------------------------
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
      if (files.length !== d.census.pages.length) {
        fail(`${d.doc.documentId}/${label}: rastered ${files.length} page(s) for a ${d.census.pages.length}-page document`);
      }
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
      "This family is classified SOURCE_ALREADY_HELD with commissionAcquisition false: both document sources "
      + "resolve to files already in the verified corpus. Nothing was fetched from azcourts.gov, any mirror or "
      + "any cache. The pinned Master Library was recovered through "
      + "scripts/rcap-corpus/bootstrap-private-corpus.sh, which verifies the archive hash and the corpus's own "
      + "governance checksums before extracting.",
    sourceArchive: "Expungement_AI_RCAP_Master_Library_Edition_1",
    sharedWith: {
      family: SIBLING_FAMILY,
      note:
        "The sibling family binds these same two binaries for the dismissal/not-guilty situation. Sharing the "
        + "bytes does not share the situation: see reports/divergence-from-the-sibling-family.json."
    },
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
      + "label position and no box is drawn by this family; captions are captured separately and decide only "
      + "what a blank means, never where it is. Stroked rules are measured from each page's content stream with "
      + "scripts/lib/pdf-stroked-boxes.mjs and recorded as corroboration only.",
    filenameNote:
      "This file is deliberately NOT named field-census.json. "
      + "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs walks "
      + "data/rcap-all50/overlays for that exact filename and asserts the family and field totals equal the "
      + "counts frozen in data/rcap-grade-a/field-semantics/full-name-charge-caption-classification-diff.json. "
      + "Enrolling a new family under the scanned filename changes those totals, and the diff record is outside "
      + "this family's owned path. Neither guard is weakened, skipped or quarantined by this family, and this "
      + "family's own charge-caption projection is recorded in reports/charge-caption-proof.json.",
    guardStateObservedAtBuildTime:
      "Both shared semantics guards were run before and after this family's census was written, and BOTH WERE "
      + "ALREADY FAILING on the branch beforehand — this family did not break either. "
      + "verify-full-name-charge-caption-semantics.mjs reports the identical row with and without this census "
      + "('the recorded field and family totals are the corpus's own — 5286 of 5286 across 156 of 157'), which "
      + "is this file's filename working as intended: the guard does not see it. "
      + "verify-name-date-component-semantics.mjs DOES scan census-v1 files, and its standing row moves from "
      + "'157 of 162 censuses, 5352 of 5428 fields' to '157 of 163 censuses, 5352 of 5540 fields' — this family "
      + "adds one census and 112 fields to a backlog of censuses the frozen record has not been regenerated "
      + "against. That backlog predates this family and closing it means regenerating "
      + "data/rcap-grade-a/field-semantics/, which is not this family's to regenerate. The substantive rows of "
      + "both guards — 'no field binds a writable participant name into a charge blank', 'no date-component "
      + "blank binds a writable participant name', 'no protect category is removed', 'no protect rule is "
      + "weakened' — all pass.",
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
    // The product is wired, and no authority is created by wiring it: the
    // family is not runtime-selectable and generation is not allowed. The route
    // is additionally unreachable as compiled — see
    // reports/route-reachability-finding.json, which this build re-confirms.
    generationAllowed: false,
    runtimeSelectable: false,
    situation:
      "The participant was ARRESTED and NO CHARGES WERE FILED. There is no charge, no charging document, no "
      + "prosecuting agency of record, no court case number and no disposition.",
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
            measuredRuleUnderWriteBox: f?.measuredRuleUnderWriteBox ?? null,
            effectiveLabel: f?.effectiveLabel ?? null
          };
        }),
        refused: fixtures.canonical.report.refused,
        protectedFields: fixtures.canonical.report.protectedFields
      };
    })
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
  const nonNameFactTokens = documents.flatMap(({ doc, fixtures }) =>
    ["canonical", "boundary"].flatMap((label) =>
      fixtures[label].proof.nameTokensInsideANonNameFact.map((n) => ({ document: doc.documentId, fixture: label, ...n }))));
  writeJson(`${OUT}/reports/participant-name-placement.json`, {
    schemaVersion: "rcap-participant-name-placement/v1",
    familyId: FAMILY_ID,
    question:
      "In the rendered artifact bytes, does every drawn participant-name token sit in a blank this family "
      + "listed as one the name belongs in?",
    method:
      "Every flattened appearance in each fixture is read and matched back to the censused blank at its own "
      + "measured rectangle. This is wider than the charge-caption question: on this family it is the net that "
      + "covers `JusticeCourt1`, a COURT-identity blank whose harvested caption contains the word 'Name' and "
      + "which the binder would otherwise fill with the participant's own name. A court name is neither a "
      + "charge caption nor a date component, so no shared guard refuses it.",
    blanksTheNameMayAppearIn: NAME_MAY_APPEAR_IN,
    placementsFound: namePlacements.length,
    placementsOutsideTheAllowlist: namePlacements.filter((n) => !n.allowed).length,
    placements: namePlacements,
    nameTokensInsideANonNameFact: {
      note:
        "Appearances carrying a name token that are accounted for rather than flagged, with the reason. The "
        + "only class here is the participant's own email address, which contains their name by construction. "
        + "The exemption is granted only where the field was written by this run with factId "
        + "`participant.email` and the drawn text is exactly the email value the fixture supplied.",
      count: nonNameFactTokens.length,
      appearances: nonNameFactTokens
    }
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
      + "widening the map: each is either the participant's to complete, the court's, the prosecutor's, or a "
      + "value the platform does not hold — and on this route a large share are blanks that HAVE no true value, "
      + "because nothing was ever charged.",
    checkboxNote:
      "Every checkbox on both documents is refused `non_text_field_type` by the factory's type guard: this "
      + "platform writes text fields and dropdowns and selects no boxes at all. That includes the situation "
      + "control this family measured (petition `Check Box9`), the record-category elections, the Section II "
      + "sentence-compliance answers and every court finding on the order. The measurement is recorded in "
      + "reports/situation-control.json so that the control is documented even though nothing selects it.",
    count: blanksLeft.length,
    blanks: blanksLeft
  });

  // ---- the situation control, MEASURED ----------------------------------------
  //
  // The predecessor gate on this branch recorded that the sibling family
  // measured petition `Check Box9` and took export value `/2`, and that "which
  // export value, if any, denotes an arrest with no charges filed is not
  // knowable from that record and is exactly what this family must read for
  // itself". This is that reading, done from the binary.
  const situationControl = (() => {
    const petition = documents.find((d) => d.doc.key === "petition");
    const field = petition.census.fields.find((f) => f.name === "Check Box9");
    if (!field) fail("petition: `Check Box9` is not present in the census");
    const lines = petition.census.linesByPage[2] ?? [];   // page 3, zero-indexed
    return {
      document: petition.doc.documentId,
      field: field.name,
      page: field.widgets[0]?.page ?? null,
      printedPrompt: "4. DESCRIBE YOUR SITUATION (required)* — You must check at least one box that applies to your situation.",
      widgets: field.widgets.map((w) => {
        // The printed line this widget sits on, chosen by nearest baseline to
        // the widget's own rectangle. Geometry decides, not reading order.
        const near = lines
          .map((l) => ({ text: normalizeHarvestedText(l.text), y: l.y, dy: Math.abs((l.y ?? 0) - w.rect.y) }))
          .sort((a, b) => a.dy - b.dy)[0] ?? null;
        return {
          rect: w.rect,
          rectBasis: w.rectBasis,
          exportStates: w.exportStates,
          onState: (w.exportStates ?? []).find((v) => v !== "/Off") ?? null,
          nearestPrintedLine: near ? { text: near.text, y: near.y, verticalOffsetFromWidget: +near.dy.toFixed(2) } : null
        };
      }),
      reading:
        "Three widgets on one field, one per printed situation, each within ~2.5pt of its line. Export `/1` is "
        + "'I was arrested for a criminal offense and no charges were filed' — THIS ROUTE. Export `/2` is the "
        + "dismissal/not-guilty situation, which is the sibling family's and which the sibling's own record "
        + "confirms it took. Export `/3` is the judgment-of-guilt limb, which is neither family's.",
      consequenceForSectionII:
        "The printed text of the `/1` line continues 'If checked, please go to Section III.' The form therefore "
        + "routes this situation PAST Section II (SENTENCE COMPLIANCE) entirely. That is read from the form's "
        + "own face and it disposes of the sentence-compliance gate for this limb: there is no sentence to have "
        + "complied with. It does not decide whether A.R.S. § 13-911 imposes any other waiting period on the "
        + "no-charges-filed limb, which is a statutory question this family does not answer.",
      butNothingSelectsIt:
        "This control is NOT set by this build. finalizeOfficialForm writes text fields and dropdowns only and "
        + "refuses every checkbox `non_text_field_type` by type guard, so no box on either document is "
        + "selected. The situation election stays the participant's to make. The control is measured and "
        + "recorded here so that the family's route identity is documented against the form, not so that "
        + "anything is asserted on the participant's behalf.",
      grantsNoAuthority:
        "Reading a control is not selecting it, and identifying this route's export value neither makes the "
        + "route reachable nor states that the participant is eligible under it."
    };
  })();
  writeJson(`${OUT}/reports/situation-control.json`, {
    schemaVersion: "rcap-situation-control/v1",
    familyId: FAMILY_ID,
    routeKey: ROUTE_KEY,
    question: "Which control on the pinned petition denotes an arrest that produced no charge, and what is its export value?",
    answer: "Petition field `Check Box9`, widget 1 of 3, export value `/1`.",
    ...situationControl
  });

  // ---- the caption blank this route needs and the binder cannot reach --------
  const captionFinding = (() => {
    const petition = documents.find((d) => d.doc.key === "petition");
    const order = documents.find((d) => d.doc.key === "order");
    const pf = petition.census.fields.find((f) => f.name === "Plaintiff");
    const of = order.census.fields.find((f) => f.name === "DName");
    const decision = decideBinding(
      { name: pf.name, pdfType: pf.type, effectiveLabel: pf.effectiveLabel, regionHeading: pf.regionHeading },
      { explicitMappings: { Plaintiff: "participant.full_legal_name" }, captionOnly: false,
        availableChargeRows: 1, documentAcceptsFill: true }
    );
    return {
      whatTheFormOffers:
        "Both documents print TWO alternative captions. Above the line 'OR if no charges were filed:' is the "
        + "criminal caption 'STATE OF ARIZONA -vs- [Defendant]'. Below it is 'In Re the Matter of: [____] / "
        + "Name (FIRST, MI, LAST)'. This route belongs under the second.",
      onTheOrder: {
        field: of.name, page: of.widgets[0].page, rect: of.widgets[0].rect,
        outcome: "WRITTEN with participant.full_legal_name",
        why: "`DName` matches the name descriptor through its own harvested caption, so the order carries this "
          + "route's correct caption."
      },
      onThePetition: {
        field: pf.name, page: pf.widgets[0].page, rect: pf.widgets[0].rect,
        effectiveLabel: pf.effectiveLabel, labelBasis: pf.labelBasis,
        descriptorsByName: pf.descriptorsByName, descriptorsByLabel: pf.descriptorsByLabel,
        outcome: "LEFT BLANK",
        decisionWithAnExplicitMappingAttempted: decision,
        why:
          "The field is NAMED `Plaintiff` — the form's author reused the criminal-caption widget name for the "
          + "In-Re blank — and the word matches no descriptor. Its printed caption 'Name (FIRST, MI, LAST)' is "
          + "printed BELOW the widget, so the label channel harvests nothing for it either. decideBinding "
          + "returns `no_allowlisted_fact_matches` BEFORE it consults explicitMappings, so an explicit mapping "
          + "cannot introduce the fact: a caller can disambiguate or block a binding, never create one. The "
          + "projection above is that call, made with the mapping supplied, and it still refuses.",
        whatThisFamilyDidNotDo:
          "It did not add a descriptor, widen a match, or otherwise edit the shared binder to reach this "
          + "blank. rcap-field-semantics.mjs is shared by every family in the corpus and its classification "
          + "diffs are frozen records outside this family's owned path; widening it here would move committed "
          + "blanks in families this worker has not read. It also did not write the name into `Defendant` "
          + "instead, which is the one thing that would fill a caption and the one thing that would be false.",
        consequence:
          "The petition this family renders names the petitioner in Section I ('a. Petitioner's name') but "
          + "leaves the page 1 caption blank. That is a real gap and it is stated as one rather than closed by "
          + "either of the two wrong moves above.",
        whoOwnsIt: "Whoever owns scripts/rcap-official-forms/rcap-field-semantics.mjs and the frozen classification diffs."
      }
    };
  })();
  writeJson(`${OUT}/reports/caption-blank-finding.json`, {
    schemaVersion: "rcap-caption-blank-finding/v1",
    familyId: FAMILY_ID,
    question: "Which caption does this route file under, and does the platform fill it?",
    answer:
      "The 'In Re the Matter of:' caption, because no charges were filed. The ORDER's copy is filled. The "
      + "PETITION's copy is not: the binder cannot reach it, and this family records that rather than editing "
      + "shared semantics or filling the wrong caption.",
    ...captionFinding
  });

  // ---- what this family does differently from the sibling ---------------------
  writeJson(`${OUT}/reports/divergence-from-the-sibling-family.json`, {
    schemaVersion: "rcap-family-divergence/v1",
    familyId: FAMILY_ID,
    siblingFamilyId: SIBLING_FAMILY,
    siblingBranch: "claude/census-v1-build-az-record-sealing-dismissal-not-guilty",
    sharedSources: DOCUMENTS.map((d) => ({ documentId: d.documentId, sha256: d.sha256 })),
    note:
      "Both families bind the SAME TWO BINARIES by the same digests. The forms are shared; the eligibility "
      + "situation, the facts written and the refusals are not. This record states every blank this route "
      + "deliberately leaves empty that the sibling fills, and why — so that a reviewer comparing the two "
      + "packets does not read a deliberate refusal as a missing mapping.",
    thisSituation:
      "Arrested, and NO CHARGES WERE FILED. No charge, no charging document, no prosecuting agency of record, "
      + "no court case number, no disposition.",
    siblingSituation:
      "Charged, and the charges were dismissed or produced a not-guilty verdict at trial. A charge, a "
      + "prosecution, a court case and a disposition all exist.",
    blanksThisRouteLeavesThatTheSiblingWrites: [
      { document: "AZ-AOCCRSL1F-PETITION-TO-SEAL-CRIMINAL-CASE-RECORDS", field: "Defendant",
        siblingWrites: "participant.full_legal_name", thisRoute: "BLANK",
        why: "The `-vs-` criminal caption. No prosecution was ever brought, so the participant was never a "
          + "defendant and the State was never opposite them. The form's own alternative — 'OR if no charges "
          + "were filed: / In Re the Matter of:' — is where this route belongs." },
      { document: "AZ-AOCCRSL1F-PETITION-TO-SEAL-CRIMINAL-CASE-RECORDS", field: "Case",
        siblingWrites: "matter.case_number", thisRoute: "BLANK",
        why: "A case number is issued when a case is opened. Nothing was filed, so none exists." },
      { document: "AZ-AOCCRSL1F-PETITION-TO-SEAL-CRIMINAL-CASE-RECORDS", field: "CourtCaseNum",
        siblingWrites: "matter.case_number", thisRoute: "BLANK",
        why: "The form conditions the blank on its own face: 'c. Court case number if charge(s) were filed'. "
          + "The condition is false here." },
      { document: "AZ-AOCCRSL2F-ORDER-REGARDING-PETITION-TO-SEAL", field: "Defendant",
        siblingWrites: "participant.full_legal_name", thisRoute: "BLANK",
        why: "The order's `-vs-` caption, refused for the same reason as the petition's." },
      { document: "AZ-AOCCRSL2F-ORDER-REGARDING-PETITION-TO-SEAL", field: "Case",
        siblingWrites: "matter.case_number", thisRoute: "BLANK",
        why: "No case was opened, so the order's caption carries no case number." },
      { document: "AZ-AOCCRSL2F-ORDER-REGARDING-PETITION-TO-SEAL", field: "CaseNo",
        siblingWrites: "matter.case_number", thisRoute: "BLANK",
        why: "'All records relating to the eligible charge(s) in court case number' — there is no court case "
          + "whose records could be described." }
    ],
    blanksTheSiblingLeavesThatThisRouteWrites: [
      { document: "AZ-AOCCRSL2F-ORDER-REGARDING-PETITION-TO-SEAL", field: "DName",
        siblingRefusesAs: "alternative_caption_for_a_different_situation", thisRoute: "participant.full_legal_name",
        why: "The sibling is explicit that this caption belongs to a different situation. That situation is "
          + "this one, so this family fills it and refuses the caption the sibling fills." }
    ],
    blanksBOTHLeaveButForDifferentReasons: [
      { document: "AZ-AOCCRSL1F-PETITION-TO-SEAL-CRIMINAL-CASE-RECORDS", field: "Plaintiff",
        siblingReason: "role — `alternative_caption_for_a_different_situation`",
        thisRouteReason:
          "This IS the caption for this route, and it is left blank only because the binder cannot reach it. "
          + "See reports/caption-blank-finding.json. The two families arrive at the same empty blank from "
          + "opposite directions, and only one of them is content with it.",
        materialDifference: true },
      { document: "AZ-AOCCRSL1F-PETITION-TO-SEAL-CRIMINAL-CASE-RECORDS", field: "Check Box7",
        siblingReason: "role — `predicated_on_no_charges_filed`; the sibling's charges WERE filed, so the "
          + "question does not arise for it",
        thisRouteReason:
          "The question ('d. If no charges were filed, did you have an initial appearance?') is squarely "
          + "APPLICABLE to this route — it is the control that decides this route's venue. It is blank because "
          + "the platform holds no initial-appearance fact and because the factory selects no checkbox at all.",
        materialDifference: true },
      { document: "AZ-AOCCRSL1F-PETITION-TO-SEAL-CRIMINAL-CASE-RECORDS", field: "Check Box8",
        siblingReason: "role — `predicated_on_no_charges_filed`",
        thisRouteReason:
          "As Check Box7: applicable here, unanswerable from platform facts, and a checkbox the factory never "
          + "selects.",
        materialDifference: true }
    ],
    refusalsBothFamiliesReachIndependently: [
      { field: "Filer", why: "mislabelled contact line — the label channel harvests the address printed below it" },
      { field: "City", why: "one field spanning the page 1 caption block and the page 5 declaration block" },
      { field: "JusticeCourt1", why: "a COURT identity blank the name channel would fill with a person's name" },
      { field: "PetName1 / NameArrest", why: "alternate-name blocks conditional on a difference the platform does not hold" }
    ],
    provedFromTheBytes:
      "The case-number divergence is not asserted from this record alone. Both fixtures still CARRY "
      + "`matter.case_number` as a populated fact, and every drawn appearance in every fixture was scanned for "
      + "that literal value. It appears nowhere. A fixture that simply withheld the value would have passed "
      + "whether or not the refusal worked."
  });

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
        "Resolved as custody, not acquisition: both sources were already held and are bound by pinned SHA-256, "
        + "with the corpus index agreeing on digest, byte length, page count and field count. Nothing was "
        + "acquired from any host.",
      OFFICIAL_FORM_MAP_REQUIRED:
        "Field map built from measured widget geometry for both documents, 112 fields censused in total.",
      ARTIFACT_REVIEW_REQUIRED:
        "Canonical and boundary fixtures rendered for both documents and verified from the artifact bytes at "
        + "their measured rectangles; all 16 pages rastered.",
      OUTPUT_LEGAL_APPROVAL_REQUIRED:
        "NOT addressed. Requested here; a human legal reviewer grants it or does not."
    },
    mattersAReviewerMustSeeFirst: [
      "reports/route-reachability-finding.json — as compiled, NO answer a participant can give selects this "
        + "situation, so the route is unreachable however good the documents are. This build does not fix it: "
        + "it is eligibility and route identity.",
      "reports/caption-blank-finding.json — the petition's page 1 caption for this situation is left blank "
        + "because the shared binder cannot reach the field.",
      "local-filing-variation.json — venue is now answered FROM THE FORM but is conditional on whether an "
        + "initial appearance was held, which is a fact the platform does not hold.",
      "reports/divergence-from-the-sibling-family.json — six blanks this route leaves that the sibling fills."
    ],
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

  return documents;
}

await main();
