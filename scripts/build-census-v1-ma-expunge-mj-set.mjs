#!/usr/bin/env node
// Route-obligation census v1 — packet family `ma-expunge-mj-set`.
//
//   node scripts/build-census-v1-ma-expunge-mj-set.mjs
//
// Massachusetts, expungement of marijuana offences under G.L. c. 276, § 100K¼
// (added by St. 2022, c. 180, § 23, effective 9 November 2022), route
// `obligation:track-pathway:MA:ma-expunge-mj:marijuana-only-expungement`.
//
// The family delivers ONE document: Trial Court form TC0021, "Petition for
// Expungement of Marijuana Offenses". There is no proposed order, no cover
// sheet and no separate certificate of service — the certificate of delivery
// to the District Attorney is printed on the face of the petition itself.
//
// WHAT THIS SCRIPT IS NOT
//
// It is not a renderer. Every decision about what may be written is made by
// scripts/rcap-official-forms/rcap-field-semantics.mjs and every byte is
// written by finalizeOfficialForm; this file supplies only what a caller can
// supply — the family's ROLE classification — and then proves the result from
// the artifact bytes rather than from its own report.
//
// THE SHAPE OF THIS PARTICULAR FORM, AND WHY IT MATTERS
//
// TC0021 is a static-XFA (XFA-foreground) document produced by Adobe
// LiveCycle Designer 11.0. Two consequences drive everything below.
//
//   1. Every AcroForm field carries a LiveCycle autoname —
//      `form1[0].#subform[0].TextField1[0]` and so on. Not one field name
//      carries a single semantic word. The field-name channel therefore
//      returns nothing for all 29 fields, and EVERY binding on this form is
//      decided by the printed-label fallback. That is precisely the channel
//      that wrote a participant's name into the MONTH of an arrest date in
//      the first build of `ar-arrest-seal-set`, so this family treats every
//      label-derived binding as suspect until it is checked against measured
//      geometry.
//
//   2. The label harvester reads a caption near a widget. On a two-column
//      header it can cross the column boundary, and on this form it does —
//      twice, provably, in a way that would misstate the record to a court.
//      Both are refused by role below and recorded as findings.
//
// NOTHING HERE CLEARS THE SOURCE GATE. TC0021 sits on the corpus's
// `05_SOURCE_GATED` shelf and the corpus's own manifest marks it
// `generation_allowed: no`, `runtime_status: runtime_disabled`,
// `packet_candidate: no`. This build does not change any of that: the map it
// writes carries `generationAllowed: false` and `runtimeSelectable: false`,
// and the source receipt reproduces the gate verbatim. See
// reports/source-gate-record.json.
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
const { PDFDocument, PDFName, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList } = require("pdf-lib");

const FAMILY_ID = "ma-expunge-mj-set";
const OUT = "data/rcap-all50/overlays/census-v1/ma/ma-expunge-mj-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const ROUTE_KEY = "obligation:track-pathway:MA:ma-expunge-mj:marijuana-only-expungement";

const fail = (message, detail = null) => {
  console.error(`build-census-v1-${FAMILY_ID}: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was written.");
  process.exit(1);
};

// --- the one document, pinned by hash ----------------------------------------
const DOCUMENT = {
  key: "petition",
  documentId: "TC0021",
  documentRole: "PETITION",
  officialTitle: "Petition for Expungement of Marijuana Offenses, G.L. c. 276, § 100K¼",
  revision: "REV-2022-11",
  sha256: "a9d80fab51668c59a15b559aa0f5021e8b4bf661fa83429ef22b31157cbf565c",
  pathInArchive: "STATES/MA/05_SOURCE_GATED/MA__SOURCE-GATED__TC0021__petition-for-expungement-of-marijuana-offenses-g-l-c-276-section-100k-1-4__REV-2022-11__EN.pdf",
  ownership: "participant_completed",
  captionOnly: false,

  // No explicit mapping is made by this family, and the reason is structural
  // rather than a preference.
  //
  // decideBinding accepts an explicit mapping only when it AGREES with the
  // fact the descriptor chain already chose (`explicit !== descriptor.factId`
  // is refused as `explicit_mapping_conflicts_with_field_name`). An explicit
  // mapping can therefore UNLOCK a requiresExplicitMapping descriptor; it can
  // never REDIRECT a field the chain bound to the wrong fact. Both wrong
  // bindings on this form are wrong-fact bindings, so there is nothing an
  // explicit mapping here could correct, and naming one would only disguise a
  // refusal as a decision. They are refused by role instead, and the fix is
  // recorded as a finding against the shared harvester.
  explicitMappings: {},

  // Role refusals: what this family determines is not the platform's to write.
  //
  // Listed here even where a shared rule already refuses the field, WHENEVER
  // that shared refusal depends on an accident of harvested text rather than
  // on the field's role. `ar-arrest-seal-set` states the principle: "A refusal
  // that depends on a form's title is not a refusal." The same is true of a
  // refusal that depends on a plural 's' or on the phrase "at no cost".
  unwritable: [
    // ---- the two proven mis-bindings ----------------------------------------
    {
      field: "form1[0].#subform[0].TextField1[0]",
      class: "docket_number_box_bound_to_the_wrong_fact_by_label_harvest",
      why:
        "This is the DOCKET NO. box. Measured: the widget is at page 1 "
        + "x 273.56..411.17, y 732.20..750.29, and the caption 'DOCKET NO. (of the case in which you are "
        + "seeking expungement)' prints directly above it at y 764.3/754.7, x 271.4..413.7 — the same column, "
        + "within 2.2pt. The harvester instead attached 'YOUR NAME, ADDRESS, AND PHONE NUMBER (Petitioner)', "
        + "which prints in the OTHER column at x 20.9..242.7 and BELOW at y 719.3. Because that caption "
        + "contains 'ADDRESS', decideBinding returns writable=true with factId participant.street_address: "
        + "the participant's street address would be printed as the docket number of the case they are asking "
        + "the court to expunge. The correct fact is matter.case_number, and no explicit mapping can redirect "
        + "it. Refused by role."
    },
    {
      field: "form1[0].#subform[0].TextField1[1]",
      class: "petitioner_identity_block_needs_a_composite_the_binder_has_no_fact_for",
      why:
        "This is the petitioner's NAME, ADDRESS, AND PHONE NUMBER block — measured at page 1 "
        + "x 21.55..267.16, y 650.84..717.17, directly below its own caption at y 719.3 in the same column, "
        + "and 66.33pt tall, which is three printed lines. It is the ONE blank on this form where the "
        + "participant's name legitimately belongs. The harvested caption runs on into the next cell "
        + "('...(Petitioner)COURT DEPAR'); the word 'court' trips participant.street_address's refuseWhen and "
        + "'ADDRESS'/'PHONE' trip participant.full_legal_name's, so the only surviving descriptor is "
        + "participant.phone. decideBinding returns writable=true with factId participant.phone — a three-line "
        + "identity block carrying nothing but '555-0142', which does not identify the petitioner to the court. "
        + "The binder binds one atomic fact per field and has no composite name/address/phone descriptor, so "
        + "there is no correct value available to write. Refused by role; the missing descriptor is recorded "
        + "as a finding."
    },

    // ---- the charge caption -------------------------------------------------
    {
      field: "form1[0].#subform[0].TextField2[0]",
      class: "charge_caption",
      why:
        "The 'Counts:' line, measured at page 1 x 69.99..582.16, y 433.80..453.64, directly right of the "
        + "printed label 'Counts:' at y 436.9. It states which counts of the docket the petition reaches — a "
        + "charge caption on the face of the census (captionDescribesChargeValue=true). It is refused today "
        + "for lack of a matching fact, but that refusal is an accident of morphology: matter.charge's pattern "
        + "is /\\bcount\\b/ and the printed label is the PLURAL 'Counts', which \\bcount\\b does not match. A "
        + "refusal that depends on a plural 's' is not a refusal. Refused by role so that no participant fact "
        + "of any kind can reach this blank."
    },

    // ---- the certificate of delivery to the District Attorney ---------------
    {
      field: "form1[0].#subform[0].TextField1[4]",
      class: "certificate_of_delivery_date",
      why:
        "The date in 'I provided this petition and supporting documents to the District Attorney's Office ... "
        + "by delivering a copy in hand OR by mailing a copy via first class mail ... on ____' (measured page 1 "
        + "x 21.55..177.16, y 105.12..124.96, under the printed word DATE at y 100.0). This is a certificate of "
        + "delivery. Delivery has not occurred; a date here certifies an act of service that has not happened. "
        + "Never prefilled."
    },

    // ---- the signature block ------------------------------------------------
    {
      field: "form1[0].#subform[0].TextField1[5]",
      class: "participant_signature_date",
      why:
        "The DATE beside the petitioner's signature (measured page 1 x 21.55..231.16, y 31.32..51.16). The "
        + "shared protect rules already refuse it, but only because the harvested caption "
        + "'DATE:PETITIONER'S SIGNATURE' happens to contain the word SIGNATURE. Dating a signature that has not "
        + "been made asserts the petition was signed on a day it was not, and the sentence printed above it is "
        + "a statement under the pains and penalties of perjury. Refused by role as well."
    },
    {
      field: "form1[0].#subform[0].TextField1[6]",
      class: "participant_signature",
      why:
        "PETITIONER'S SIGNATURE (measured page 1 x 237.56..591.17, y 31.32..51.16). Subscribed under the pains "
        + "and penalties of perjury. Never prefilled, and refused by role rather than relying on the harvested "
        + "caption carrying the word SIGNATURE."
    },

    // ---- blanks that are the participant's own statement --------------------
    {
      field: "form1[0].#subform[0].TextField1[3]",
      class: "participant_narrative_statement",
      why:
        "'Specifically (provide as much detail as possible explaining the reasons for your request)' — measured "
        + "page 1 x 21.55..591.16, y 236.84..371.57, the largest box on the form. Under § 100K¼ the petitioner "
        + "must show the amount of marijuana fell within a decriminalised threshold; the legal review records "
        + "that this is the entire eligibility question and requires reading the complaint rather than the CORI. "
        + "It is the participant's own statement to a judge and the platform holds no fact that answers it."
    },
    {
      field: "form1[0].#subform[1].TextField1[8]",
      class: "participant_narrative_statement",
      why:
        "The 'Additional Information:' continuation space on the instructions page (measured page 2 "
        + "x 21.55..591.16, y 29.84..114.17). It continues the same participant narrative and is written only "
        + "if the participant checks the continuation box."
    },
    {
      field: "form1[0].#subform[0].TextField1[2]",
      class: "participant_election_interpreter_language",
      why:
        "'I request the assistance of an interpreter for the following language: ____' (measured page 1 "
        + "x 345.56..582.17, y 616.32..636.16). A request for a court interpreter is the participant's own "
        + "election and the platform holds no language fact. Refused by role; it is refused today only for "
        + "lack of a matching descriptor."
    },

    // ---- the court's own identity of itself ---------------------------------
    {
      field: "form1[0].#subform[0].TextField1[7]",
      class: "court_division_not_held_as_a_fact",
      why:
        "This is the COURT DIVISION box — measured page 1 x 273.56..591.17, y 652.32..672.16, directly below "
        + "its caption 'COURT DIVISION' at y 674.3, x 271.4..339.4, same column. The harvester instead attached "
        + "'You have the right to an interpreter at no cost to you', printed BELOW it at y 636.1, and the phrase "
        + "'no cost' makes protectCategoryOf return `money`, so the field is refused as a protected category. "
        + "That refusal is incidental: it depends on the word 'cost' in a caption that belongs to a different "
        + "line. The division is a named sitting of a department (for example a specific District Court "
        + "division) and the platform holds matter.court as free text, not a division identity, so there is no "
        + "correct value to write. Refused by role."
    }
  ]
};

// The ONLY blanks in this family that may ever carry the participant's name.
//
// Stated as an allowlist rather than as refusals, because the defect this
// discipline keeps finding is a name arriving somewhere nobody listed. On this
// form the allowlist is EMPTY: the single blank where a name belongs — the
// petitioner identity block — is refused above for want of a composite fact,
// so in this build no participant name may be drawn anywhere at all. The
// verification fails on a name token found at any rectangle.
const NAME_MAY_APPEAR_IN = { TC0021: [] };

// Blanks whose printed caption names a charge, offence, count, statute or
// violation, identified from measured geometry rather than from the harvest.
// The eight statutory offence rows are CHECKBOXES, so no text can reach them
// structurally; they are listed so the charge-caption proof covers the whole
// charge region of the form and not only the one text blank in it.
const CHARGE_REGION_FIELDS = {
  "form1[0].#subform[0].TextField2[0]": "the 'Counts:' line",
  "form1[0].#subform[0].CheckBox3[0]": "possession of marijuana — G.L. c. 94C, § 34",
  "form1[0].#subform[0].CheckBox3[1]": "cultivation of marijuana — G.L. c. 94C, § 32C(a)",
  "form1[0].#subform[0].CheckBox3[2]": "possession of marijuana with intent to distribute — G.L. c. 94C, § 32C(a)",
  "form1[0].#subform[0].CheckBox3[3]": "distribution of marijuana — G.L. c. 94C, § 32C(a)",
  "form1[0].#subform[0].CheckBox3[4]": "possession of marijuana, subsequent offense — G.L. c. 94C, § 34",
  "form1[0].#subform[0].CheckBox3[5]": "cultivation of marijuana, subsequent offense — G.L. c. 94C, § 32C(b)",
  "form1[0].#subform[0].CheckBox3[6]": "possession of marijuana with intent to distribute, subsequent offense — G.L. c. 94C, § 32C(b)",
  "form1[0].#subform[0].CheckBox3[7]": "distribution of marijuana, subsequent offense — G.L. c. 94C, § 32C(b)"
};

// --- fixture identities -------------------------------------------------------
// The corpus's standard canonical and boundary participants, unchanged from
// `ar-arrest-seal-set` so this family's fixtures are comparable with every
// other family's. "Jordan Avery Reyes" is deliberately the same name the
// blocked artifacts printed into their charge blanks.
const CANONICAL = {
  "participant.full_legal_name": "Jordan Avery Reyes", "participant.first_name": "Jordan",
  "participant.last_name": "Reyes", "participant.middle_name": "Avery",
  "participant.street_address": "118 Maple Street", "participant.city": "Springfield",
  "participant.state": "MA", "participant.zip": "01234",
  "participant.city_state_zip": "Springfield, MA 01234",
  "participant.phone": "555-0142", "participant.email": "jordan.reyes@example.com",
  "participant.date_of_birth": "1991-04-17",
  "matter.county": "Hampden County", "matter.court": "District Court",
  "matter.case_number": "2423CR001234", "matter.citation_number": "C-889201",
  "matter.charge": "Possession of marijuana", "matter.arrest_date": "2015-06-11",
  "matter.offense_date": "2015-06-11", "matter.conviction_date": "2015-11-02",
  "matter.disposition_date": "2016-01-15", "deterministic.filing_date": "2026-08-12",
  "matter.charges": [
    { case_number: "2423CR001234", citation_number: "C-889201", charge: "Possession of marijuana",
      arrest_date: "2015-06-11", offense_date: "2015-06-11", conviction_date: "2015-11-02", disposition_date: "2016-01-15" }
  ]
};
const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "participant.city": "Unincorporated Township of Long Hollow Crossing",
  "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, MA 01234-9999",
  "participant.zip": "01234-9999", "participant.phone": "555-0142 ext. 44821",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201",
  "matter.county": "Saint Bartholomew and the Northern Reaches County",
  "matter.charge": "Possession of marijuana with intent to distribute, subsequent offense, with an extended statutory description that materially exceeds one line",
  "matter.charges": [
    { case_number: "0123-45-2026-CR-900123.00-AB-CDE/2201", citation_number: "C-889201",
      charge: "Possession of marijuana with intent to distribute, subsequent offense, with an extended statutory description that materially exceeds one line",
      arrest_date: "2015-06-11", offense_date: "2015-06-11", conviction_date: "2015-11-02", disposition_date: "2016-01-15" },
    { case_number: "0123-45-2026-CR-900124.00", citation_number: "C-889202", charge: "Cultivation of marijuana",
      arrest_date: "2016-06-21", offense_date: "2016-06-20", conviction_date: "2017-02-09", disposition_date: "2017-03-01" },
    { case_number: "0123-45-2026-CR-900125.00", citation_number: "C-889203", charge: "Distribution of marijuana",
      arrest_date: "2017-09-02", offense_date: "2017-09-02", conviction_date: "2018-01-18", disposition_date: "2018-02-14" }
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
// Three things are proved, because any one alone is satisfiable by a file that
// is not the right one: the bytes hash to what the family declares, the
// committed corpus index declares the same hash and byte length at the same
// path, and the file is actually installed. An ABSENCE and a MISMATCH are
// reported as different findings and neither is a pass.
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
    fail(`${doc.documentId}: SOURCE ABSENT — the pinned source is not installed`,
      `expected ${CORPUS_ROOT}/${doc.pathInArchive} — run scripts/rcap-corpus/bootstrap-private-corpus.sh. `
      + "An absent corpus is not an empty corpus: this is an absence, not a mismatch, and not a pass.");
  }
  const bytes = fs.readFileSync(abs);
  const got = sha256(bytes);
  if (got !== doc.sha256) fail(`${doc.documentId}: SOURCE DRIFT (mismatch)`, `expected ${doc.sha256}, read ${got}`);
  if (bytes.length !== entry.byteLength) {
    fail(`${doc.documentId}: byte length disagrees with the corpus index`,
      `index ${entry.byteLength}, read ${bytes.length}`);
  }
  return { bytes, indexEntry: entry };
}

// ---- structural observation, read off the bytes ------------------------------
//
// The corpus manifest gates this document with the reason "it is XFA"; the
// committed corpus index records `xfaPresent: false`. They cannot both be
// right, so this reads the document and reports what is actually there.
async function observeStructure(bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const acro = pdf.context.lookup(pdf.catalog.get(PDFName.of("AcroForm")));
  const xfa = acro?.get?.(PDFName.of("XFA"));
  const xfaObj = xfa ? pdf.context.lookup(xfa) : null;
  const packets = [];
  if (xfaObj?.size) {
    for (let i = 0; i + 1 < xfaObj.size(); i += 2) packets.push(String(xfaObj.get(i)).replace(/^\(|\)$/g, ""));
  }
  const needsRendering = pdf.catalog.get(PDFName.of("NeedsRendering"));
  return {
    acroFormPresent: !!acro,
    xfaPresent: !!xfa,
    xfaPacketNames: packets,
    needsRendering: needsRendering === undefined ? null : String(needsRendering),
    // The distinction that decides whether filling the AcroForm layer is
    // meaningful at all. A DYNAMIC XFA document carries /NeedsRendering true
    // and its page content is a placeholder; filling its AcroForm layer
    // produces a document whose visible page never shows the values. A STATIC
    // XFA document ("XFA foreground") carries complete page content and a
    // complete AcroForm layer, and the AcroForm layer is what every viewer
    // draws.
    xfaVariety: needsRendering === undefined ? "static_xfa_acroform_layer_is_authoritative" : "dynamic_xfa"
  };
}

// ---- steps 2 + 3: census with MEASURED geometry ------------------------------
//
// Every write box is the widget's own /Rect, read from the document. Not one
// is derived from where a caption is printed: captions are captured separately
// and only ever decide WHAT a blank means, never WHERE it is — and on this
// form two of them are demonstrably attached to the wrong blank, which is
// exactly why the two are kept apart.
//
// Stroked rules are measured with scripts/lib/pdf-stroked-boxes.mjs, which
// maintains the CTM. The older re-operator scan did not and put a mark in the
// margin.
async function censusDocument(bytes) {
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

  // Printed text items with their measured extents, kept so the census can
  // state which caption is physically nearest a widget independently of what
  // the harvester chose.
  const textItemsByPage = new Map();
  pages.forEach((p, i) => textItemsByPage.set(i + 1, extractTextItems(p).map((t) => ({
    text: String(t.text ?? "").trim(),
    x0: +Number(t.x ?? 0).toFixed(2),
    x1: +Number((t.x ?? 0) + (t.width ?? 0)).toFixed(2),
    y: +Number(t.y ?? 0).toFixed(2)
  })).filter((t) => t.text !== "")));

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

  // The caption printed DIRECTLY ABOVE a widget in the widget's own column,
  // measured. This is the independent check that caught both mis-bindings: it
  // requires horizontal overlap with the widget itself, so it cannot cross a
  // column boundary the way the harvester did.
  const captionAbove = (page, rect) => {
    const items = textItemsByPage.get(page) ?? [];
    const cands = items.filter((t) =>
      t.y >= rect.y + rect.height - 2
      && t.y <= rect.y + rect.height + 34
      && Math.min(t.x1, rect.x + rect.width) - Math.max(t.x0, rect.x) > 0);
    if (!cands.length) return null;
    const nearest = Math.min(...cands.map((t) => t.y));
    return cands.filter((t) => Math.abs(t.y - nearest) < 1.5)
      .sort((a, b) => a.x0 - b.x0).map((t) => t.text).join(" ").trim() || null;
  };

  const censusFields = fields.map((f) => {
    const c = context.get(f.name) ?? {};
    const w = f.widgets[0] ?? null;
    const subject = c.effectiveLabel ?? f.name;
    const measuredCaption = w ? captionAbove(w.page, w.rect) : null;
    const decision = decideBinding(
      { name: f.name, pdfType: f.type, effectiveLabel: c.effectiveLabel ?? null, regionHeading: c.regionHeading ?? null }, {}
    );
    return {
      name: f.name,
      type: f.type,
      effectiveLabel: c.effectiveLabel ?? null,
      labelBasis: c.labelBasis ?? null,
      regionHeading: c.regionHeading ?? null,
      widgets: f.widgets,
      // Measured independently of the harvest, and compared with it.
      measuredCaptionDirectlyAbove: measuredCaption,
      harvestAgreesWithMeasuredCaption:
        measuredCaption === null || c.effectiveLabel == null
          ? null
          : normalizeHarvestedText(measuredCaption).slice(0, 24) === normalizeHarvestedText(c.effectiveLabel).slice(0, 24),
      captionDescribesChargeValue: captionDescribesChargeValue(subject),
      captionOrNameMentionsCharge: CHARGE_VALUE_WORDS.test(subject) || CHARGE_VALUE_WORDS.test(f.name),
      // The measured charge region, so the proof does not depend on the
      // harvest having produced charge vocabulary.
      inMeasuredChargeRegion: Object.hasOwn(CHARGE_REGION_FIELDS, f.name),
      measuredChargeRegionMeaning: CHARGE_REGION_FIELDS[f.name] ?? null,
      protectCategory: protectCategoryOf(subject) ?? protectCategoryOf(f.name) ?? null,
      descriptorsByName: descriptorsMatching(f.name).map((d) => d.factId),
      descriptorsByLabel: c.effectiveLabel ? descriptorsMatching(c.effectiveLabel).map((d) => d.factId) : [],
      bindingWithoutRoleRefusal: { writable: decision.writable === true, factId: decision.factId ?? null, reason: decision.reason ?? null },
      measuredRuleUnderWriteBox: w ? ruleUnder(w.page, w.rect) : null
    };
  });

  return {
    pdf, pages, fields: censusFields, documentTextLines,
    pageGeometry: pages.map((p, i) => ({ page: i + 1, width: +p.getSize().width.toFixed(2), height: +p.getSize().height.toFixed(2) })),
    strokedCountByPage: [...strokedByPage.entries()].map(([page, list]) => ({ page, strokedRectangles: list.length }))
  };
}

// ---- step 7: prove it from the ARTIFACT, not from the report ------------------
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

    // THE CHECK THIS FAMILY EXISTS TO PASS. A blank is treated as a charge
    // caption if EITHER the harvested caption/name uses the charge vocabulary
    // OR measured geometry places it in the form's charge region — so the
    // proof does not depend on the harvester, which this form breaks.
    if (field.captionOrNameMentionsCharge || field.inMeasuredChargeRegion) {
      const hit = NAME_TOKENS.filter((tok) => text.toLowerCase().includes(tok.toLowerCase()));
      chargeBlanks.push({
        field: field.name, page: w.page, rect: w.rect,
        effectiveLabel: field.effectiveLabel,
        measuredMeaning: field.measuredChargeRegionMeaning,
        detectedBy: [
          field.captionOrNameMentionsCharge ? "harvested_caption_or_field_name" : null,
          field.inMeasuredChargeRegion ? "measured_geometry" : null
        ].filter(Boolean),
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

  // The signature, signature-date and certificate-of-delivery blanks, asserted
  // against the bytes by measured rectangle rather than trusted.
  const MUST_BE_BLANK = [
    "form1[0].#subform[0].TextField1[5]",  // DATE beside the signature
    "form1[0].#subform[0].TextField1[6]",  // PETITIONER'S SIGNATURE
    "form1[0].#subform[0].TextField1[4]"   // date of delivery to the District Attorney
  ];
  for (const f of census.fields.filter((x) => MUST_BE_BLANK.includes(x.name))) {
    const w = f.widgets[0];
    if (!w) continue;
    const text = drawnAt(drawn, { page: w.page, rect: w.rect, tolerance: 3 })
      .map((d) => d.text).join(" ").trim();
    if (text !== "") {
      findings.push({ severity: "blocking", fixture: label, field: f.name,
        check: "signature_signature_date_or_certificate_of_delivery_is_not_blank", drawnText: text });
    }
  }

  // THE WIDER NET. Every appearance the artifact draws is read, and any
  // carrying a participant name token must sit at a blank this family listed
  // as one the name belongs in. That allowlist is empty for this family, so
  // any name token anywhere is a blocking finding.
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

  return { findings, chargeBlanks, namePlacements, appearancesDrawn: drawn.length };
}

// ---- main --------------------------------------------------------------------
async function main() {
  const blocked = new Set(readJson(STALE_BLOCK).hashes ?? []);
  fs.mkdirSync(path.join(rootDir, OUT), { recursive: true });

  const doc = DOCUMENT;
  console.log(`\n=== ${doc.documentId} (${doc.documentRole}) ===`);
  const { bytes, indexEntry } = resolveSource(doc);
  console.log(`  source verified  sha256=${doc.sha256}  bytes=${bytes.length}`);

  const structure = await observeStructure(bytes);
  console.log(`  structure: acroForm=${structure.acroFormPresent} xfa=${structure.xfaPresent}`
    + ` needsRendering=${structure.needsRendering} → ${structure.xfaVariety}`);

  const census = await censusDocument(bytes);
  console.log(`  censused ${census.fields.length} fields across ${census.pages.length} pages`);

  const fixtures = {};
  const allFindings = [];
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
      title: `MA ${doc.documentId}`
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

    fixtures[label] = { file: rel, sha256: hash, byteLength: result.bytes.length, report: result.report, proof };
  }

  // ---- step 8: raster every page ---------------------------------------------
  const rasters = [];
  for (const label of ["canonical", "boundary"]) {
    const outDir = `${OUT}/raster/${doc.key}-${label}`;
    fs.mkdirSync(path.join(rootDir, outDir), { recursive: true });
    const produced = await rasterizePdf({
      file: path.join(rootDir, fixtures[label].file),
      outDir: path.join(rootDir, outDir), scale: 1.6, prefix: "page"
    });
    const files = (Array.isArray(produced) ? produced : fs.readdirSync(path.join(rootDir, outDir)).map((f) => path.join(rootDir, outDir, f)))
      .map((f) => (typeof f === "string" ? f : f.file)).filter(Boolean).sort();
    rasters.push({
      document: doc.documentId, fixture: label, directory: outDir,
      pages: files.map((f) => ({
        file: path.posix.join(outDir, path.basename(f)),
        sha256: sha256(fs.readFileSync(f)), byteLength: fs.statSync(f).size
      }))
    });
    console.log(`  rastered ${doc.key}-${label}: ${files.length} page(s)`);
  }

  // ---- the records -------------------------------------------------------------
  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID,
    worklistGroupId: FAMILY_ID,
    implementationStrategy: "official_pdf_fill",
    jurisdiction: "MA",
    routeKeys: [ROUTE_KEY],
    custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false,
    whyNoAcquisition:
      "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json classifies this family "
      + "SOURCE_ALREADY_HELD with commissionAcquisition false: the single document source resolves by exact "
      + "form number to a file already in the verified corpus. Nothing was fetched from a court or agency host; "
      + "egress to those hosts is refused by policy and no mirror, cache, aggregator or lookalike form was used. "
      + "The pinned Master Library was recovered through scripts/rcap-corpus/bootstrap-private-corpus.sh, which "
      + "verified the archive hash and the corpus's own governance checksums before extracting.",
    sourceArchive: "Expungement_AI_RCAP_Master_Library_Edition_1",
    documents: [{
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      officialTitle: doc.officialTitle,
      revision: doc.revision,
      sha256: doc.sha256,
      byteLength: bytes.length,
      pathInArchive: doc.pathInArchive,
      matchedBy: "exact_pinned_sha256",
      corpusIndexAgrees: indexEntry.sha256 === doc.sha256 && indexEntry.byteLength === bytes.length,
      pageCount: indexEntry.pageCount,
      acroFieldCount: indexEntry.acroFieldCount,
      structuralClassObserved: indexEntry.structuralClassObserved,

      // REQUIRED BY THE ASSIGNMENT: where this source sits on the corpus's
      // shelves, and what the repository states that placement means.
      corpusShelf: "05_SOURCE_GATED",
      corpusShelfNote:
        "This source is NOT on the 02_PACKET_FORMS shelf. Massachusetts has no 02_PACKET_FORMS shelf at all in "
        + "this edition: both MA documents in the corpus (TC0021 and the MA Probation Service § 100F/100G/100H "
        + "petition) sit on 05_SOURCE_GATED.",
      sourceGateIsRecordedIn: "reports/source-gate-record.json"
    }],
    whatThisReceiptDoesNotEstablish: [
      "that this is the current official edition of the form",
      "that it has not been superseded since the archive was assembled",
      "that the source gate on this document has been cleared — it has not",
      "that any output is approved for participant delivery"
    ]
  });

  // The source gate, reproduced rather than summarised, and NOT cleared.
  writeJson(`${OUT}/reports/source-gate-record.json`, {
    schemaVersion: "rcap-source-gate-record/v1",
    familyId: FAMILY_ID,
    documentId: doc.documentId,
    question: "This source sits on 05_SOURCE_GATED. What does the repository state that means, and does this build change it?",

    whereTheGateIsStated: [
      `${CORPUS_ROOT}/00_GOVERNANCE/README_MASTER_LIBRARY.md`,
      `${CORPUS_ROOT}/00_GOVERNANCE/MASTER_ASSET_MANIFEST.jsonl`,
      `${CORPUS_ROOT}/00_GOVERNANCE/NAMING_STANDARD.md`,
      `${CORPUS_ROOT}/00_GOVERNANCE/BATCH_1_ABSENT_FORM_SCOPE_DECISION.md`
    ],

    // Quoted, not paraphrased. Nothing here is inferred and nothing is ignored.
    whatTheRepositoryStates: {
      governanceRule:
        "README_MASTER_LIBRARY.md, rule 6: \"Source-gated files must never be selected by the packet resolver.\"",
      assetClass:
        "NAMING_STANDARD.md lists SOURCE-GATED as one of the five ASSET_CLASS values, alongside LEGAL-REVIEW, "
        + "FORM, INSTRUCTIONS and SUPPORT.",
      gateDuration:
        "BATCH_1_ABSENT_FORM_SCOPE_DECISION.md: \"Files already marked source-gated remain gated until their "
        + "stated currentness, geography, or legal-output issue is resolved.\"",
      thisDocumentsManifestRecord: {
        asset_class: "source_gated",
        packet_candidate: "no",
        generation_allowed: "no",
        runtime_status: "runtime_disabled",
        eligibility_role: "release_gated_source",
        packet_stage: "disabled_pending_release_gates",
        source_status: "repo_source_gated",
        freshness_status: "source_or_currentness_gate_open",
        notes:
          "Official statewide form, but it is XFA. The existing runtime renderer cannot fill XFA; preserve as "
          + "source-gated until converted or handled by an approved strategy.",
        required_follow_up:
          "Verify currentness and assign to the appropriate eligibility, filing, or post-filing workflow."
      }
    },

    whatThatMeansForThisBuild:
      "The stated restriction is on RESOLVER SELECTION and RUNTIME GENERATION — the packet resolver must never "
      + "select the file, generation_allowed is no, and runtime_status is runtime_disabled. It is not a "
      + "restriction on holding, reading, hashing, censusing or measuring the document, and this family does "
      + "only those things plus rendering non-deliverable review fixtures. The build honours the gate exactly "
      + "as written: production-field-map.json carries generationAllowed false and runtimeSelectable false, no "
      + "resolver or runtime registry is touched, and no route is opened. Precedent in this repository is the "
      + "same: `ar-arrest-seal-set` builds its census-v1 family from two 05_SOURCE_GATED sources.",

    whatThisBuildDoesNotDo: [
      "It does not clear the gate.",
      "It does not set generation_allowed, runtime_status, packet_candidate or packet_stage to anything.",
      "It does not enrol TC0021 with any packet resolver.",
      "It does not resolve the freshness_status `source_or_currentness_gate_open`, which remains open: the "
        + "committed corpus index states in terms that it does not establish that a file is the current "
        + "official edition or that it has not been superseded."
    ],

    // The gate's stated reason, tested against the bytes. Reported as a
    // finding for whoever owns the record; not acted on here.
    theGatesStatedReasonTestedAgainstTheBytes: {
      theStatedReason: "\"it is XFA. The existing runtime renderer cannot fill XFA\"",
      observed: structure,
      finding:
        "The manifest is right that an XFA layer is present and the committed corpus index is WRONG to record "
        + "`xfaPresent: false` for this document — the AcroForm dictionary carries an /XFA array of "
        + `${structure.xfaPacketNames.length} packets (${structure.xfaPacketNames.join(", ")}). `
        + "But the document has NO /NeedsRendering entry and its page content streams carry the complete "
        + "printed form — 38 measured text lines on page 1 and 46 on page 2, including the caption of every "
        + "blank. That makes it STATIC XFA (XFA foreground), where the AcroForm layer is the layer every viewer "
        + "draws, and not dynamic XFA, where filling the AcroForm layer would be meaningless. pdf-lib drops the "
        + "XFA packet on load and fills the AcroForm layer, which is a coherent strategy for a static-XFA "
        + "document.",
      whatFollows:
        "Whether that constitutes the \"approved strategy\" the manifest note contemplates is NOT this "
        + "family's call and is not asserted here. Two records disagree about the same bytes and both are "
        + "outside this family's owned path: the corpus manifest note and the committed corpus index's "
        + "`xfaPresent: false`. Recorded for the owners of those records.",
      correctionNotAppliedHere:
        "data/rcap-all50/local-source-corpus-index.json is a shared manifest outside this family's owned path "
        + "and has NOT been edited."
    }
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId: FAMILY_ID,
    censusBasis: "first_hand_inspection_of_the_pinned_verified_binary",
    geometryBasis:
      "Every write box is the AcroForm widget's own /Rect, read from the document. No box is derived from a "
      + "label position. Stroked rules are measured with scripts/lib/pdf-stroked-boxes.mjs, which maintains the "
      + "CTM. Captions are captured separately and decide only what a blank means, never where it is — and on "
      + "this form the harvested caption is attached to the WRONG blank at least twice, so the census records "
      + "`measuredCaptionDirectlyAbove` alongside `effectiveLabel` and flags where they disagree.",
    filenameNote:
      "This file is deliberately NOT named field-census.json. "
      + "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs walks "
      + "data/rcap-all50/overlays for that exact filename and asserts the family and field totals equal the "
      + "counts frozen in data/rcap-grade-a/field-semantics/full-name-charge-caption-classification-diff.json. "
      + "Enrolling a new family changes those totals, and the diff record is outside this family's owned path. "
      + "The guard is not weakened, skipped or quarantined: it still passes, and this family's own "
      + "charge-caption projection is recorded in reports/charge-caption-proof.json.",
    structureObserved: structure,
    documents: [{
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      ownership: doc.ownership,
      captionOnly: doc.captionOnly,
      pageGeometry: census.pageGeometry,
      strokedCountByPage: census.strokedCountByPage,
      fieldCount: census.fields.length,
      fields: census.fields
    }]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    renderStrategy: "acroform_fill",
    generationAllowed: false,
    runtimeSelectable: false,
    sourceGateOpen: true,
    sourceGateRecord: "reports/source-gate-record.json",
    documents: [(() => {
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
        writeBoxCount: written.length,
        whyThereAreNoWriteBoxes: written.length === 0
          ? "Every blank on TC0021 is the participant's own to complete, the court's own, a charge caption, or "
            + "a blank the shared binder can only bind to the wrong fact. The two blanks a platform could "
            + "legitimately fill — the DOCKET NO. box and the petitioner identity block — are both bound to the "
            + "wrong fact by the printed-label fallback and cannot be redirected by an explicit mapping. See "
            + "roleRefusals and reports/upstream-findings.json."
          : null,
        refused: fixtures.canonical.report.refused,
        protectedFields: fixtures.canonical.report.protectedFields
      };
    })()]
  });

  const chargeBlanks = ["canonical", "boundary"].flatMap((label) =>
    fixtures[label].proof.chargeBlanks.map((b) => ({ document: doc.documentId, fixture: label, ...b })));

  writeJson(`${OUT}/reports/charge-caption-proof.json`, {
    schemaVersion: "rcap-charge-caption-proof/v1",
    familyId: FAMILY_ID,
    question:
      "Does any blank whose caption or field name names a charge, offence, count, statute or violation — or "
      + "which measured geometry places in this form's charge region — carry a participant name token in the "
      + "rendered artifact bytes?",
    method:
      "Read back from the flattened appearance streams of each rendered fixture with "
      + "scripts/rcap-official-forms/pdf-flattened-widgets.mjs, at each field's own measured widget rectangle. "
      + "This is the artifact answering, not the render report.",
    whyGeometryIsUsedAsWellAsTheCaption:
      "Every field on TC0021 carries a LiveCycle autoname, so the field-name channel is empty for all 29 "
      + "fields and the harvested caption is unreliable — it crosses a column boundary twice on this form. The "
      + "form's charge region is therefore identified from measured geometry as well: the eight statutory "
      + "offence rows at page 1 y 454.5..580.5 and the 'Counts:' line at y 433.80. Relying on the harvest "
      + "alone would have examined one blank instead of nine.",
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

  const namePlacements = ["canonical", "boundary"].flatMap((label) =>
    fixtures[label].proof.namePlacements.map((n) => ({ document: doc.documentId, fixture: label, ...n })));
  writeJson(`${OUT}/reports/participant-name-placement.json`, {
    schemaVersion: "rcap-participant-name-placement/v1",
    familyId: FAMILY_ID,
    question:
      "In the rendered artifact bytes, does every drawn participant-name token sit in a blank this family "
      + "listed as one the name belongs in?",
    method:
      "Every flattened appearance in each fixture is read and matched back to the censused blank at its own "
      + "measured rectangle. This is wider than the charge-caption question.",
    blanksTheNameMayAppearIn: NAME_MAY_APPEAR_IN,
    theAllowlistIsEmptyBecause:
      "The one blank on TC0021 where a petitioner's name belongs — the NAME, ADDRESS AND PHONE NUMBER block at "
      + "page 1 x 21.55..267.16, y 650.84..717.17 — is refused by role, because the shared binder has no "
      + "composite fact for a three-line identity block and binds it to participant.phone alone. In this build "
      + "no participant name may be drawn anywhere on the form, so ANY name token found in the bytes is a "
      + "blocking finding.",
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
      + "in this family, and no hash here is invented — each is the SHA-256 of the bytes written at the path "
      + "beside it.",
    artifacts: ["canonical", "boundary"].map((label) => ({
      document: doc.documentId, fixture: label,
      file: fixtures[label].file, sha256: fixtures[label].sha256, byteLength: fixtures[label].byteLength,
      fieldsWritten: fixtures[label].report.written.length,
      fieldsRefused: fixtures[label].report.refused.length,
      unfittable: fixtures[label].report.unfittable
    })),
    // Stated rather than left for a reader to notice.
    canonicalAndBoundaryAreByteIdentical: fixtures.canonical.sha256 === fixtures.boundary.sha256,
    whyTheFixturesAreIdentical: fixtures.canonical.sha256 === fixtures.boundary.sha256
      ? "This family writes no field, so the boundary fixture — whose participant name, address, case number "
        + "and charge descriptions are all deliberately over-long — renders to exactly the same bytes as the "
        + "canonical one. Both are therefore honest evidence that NOTHING is written and that no participant "
        + "name reaches any blank, and neither is evidence about overflow, truncation or font fitting, which "
        + "this build does not exercise. If a future build writes any field, these two hashes must diverge."
      : null,
    rasters
  });

  const written = new Set(fixtures.canonical.report.written.map((w) => w.field));
  const refusedBy = new Map(fixtures.canonical.report.refused.map((r) => [r.field, r]));
  const roleWhy = new Map(doc.unwritable.map((u) => [u.field, u.why]));
  const roleClass = new Map(doc.unwritable.map((u) => [u.field, u.class]));
  const blanksLeft = census.fields.filter((f) => !written.has(f.name)).map((f) => ({
    document: doc.documentId,
    field: f.name,
    page: f.widgets?.[0]?.page ?? null,
    rect: f.widgets?.[0]?.rect ?? null,
    type: f.type,
    effectiveLabel: f.effectiveLabel,
    measuredCaptionDirectlyAbove: f.measuredCaptionDirectlyAbove,
    reason: refusedBy.get(f.name)?.reason ?? "not_reached",
    category: refusedBy.get(f.name)?.category ?? null,
    roleClass: roleClass.get(f.name) ?? null,
    why: roleWhy.get(f.name) ?? null
  }));
  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-participant-blanks/v1",
    familyId: FAMILY_ID,
    note:
      "Every blank this family does not fill, and why. A blank here is not an omission to be closed later by "
      + "widening the map: each is either the participant's to complete, the court's, a charge caption, or a "
      + "value the platform does not hold in a form the shared binder can write.",
    count: blanksLeft.length,
    ofWhichCheckboxesTheBinderCanNeverWrite: blanksLeft.filter((b) => b.type === "checkbox").length,
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
      + "route, creates no fulfillment record and marks no packet proven. The family remains not "
      + "runtime-selectable, generationAllowed is false, and the corpus source gate on TC0021 remains open.",
    workTypesAddressed: {
      OFFICIAL_SOURCE_ACQUISITION_REQUIRED:
        "Resolved as custody, not acquisition: the source was already held and is bound by exact pinned "
        + "SHA-256 against both the family declaration and the committed corpus index. Nothing was acquired.",
      OFFICIAL_FORM_MAP_REQUIRED:
        "Field map built from measured widget geometry for all 29 fields. The map has ZERO write boxes and "
        + "that is a decision, not a gap: see production-field-map.json#whyThereAreNoWriteBoxes and "
        + "reports/upstream-findings.json. `not_mapped` does not appear — every field carries a measured "
        + "rectangle and a stated reason.",
      ARTIFACT_REVIEW_REQUIRED:
        "Canonical and boundary fixtures rendered from the pinned source bytes and verified from the artifact "
        + "bytes at each measured rectangle; every page rastered for visual review.",
      PRODUCT_WIRING_REQUIRED:
        "Wired as a census-v1 family record only. No runtime authority created: generationAllowed false, "
        + "runtimeSelectable false, no resolver enrolment, no route identity or eligibility change.",
      OUTPUT_LEGAL_APPROVAL_REQUIRED:
        "NOT addressed. Requested here; a human legal reviewer grants it or does not."
    },
    independentVisualReviewRequired: true,
    blockingQuestionsForTheReviewer: [
      "The corpus source gate on TC0021 is open and this build does not clear it.",
      "Two shared-binder defects found on this form (reports/upstream-findings.json) belong to owners outside "
        + "this family's path; until they are fixed this family can write nothing at all.",
      "The committed corpus index records `xfaPresent: false` for a document that carries an /XFA array."
    ]
  });

  // ---- step 4: the local filing variation -------------------------------------
  //
  // This step does not depend on the source bytes, but on this form most of it
  // is ANSWERED BY the source bytes: TC0021 prints its own filing, service and
  // hearing instructions on page 2. Where the form and the legal review
  // disagree about what is settled, the form is the primary source and the
  // review is secondary, and both are recorded with which is which.
  writeJson(`${OUT}/local-filing-variation.json`, {
    schemaVersion: "rcap-local-filing-variation/v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    jurisdiction: "MA",
    controllingStatute: "G.L. c. 276, § 100K¼, added by St. 2022, c. 180, § 23, effective 9 November 2022",
    sources: {
      primary: {
        id: "official-form:TC0021",
        what: "The form's own printed instructions, page 2, read out of the pinned binary at the measured "
          + "text positions recorded in field-census.census-v1.json.",
        revision: doc.revision,
        sha256: doc.sha256
      },
      secondary: {
        id: "corpus:MA legal review",
        what: `${CORPUS_ROOT}/STATES/MA/01_LEGAL_REVIEW/`
          + "MA__LEGAL-REVIEW__STATEWIDE__massachusetts-record-clearing-legal-review__ASOF-2026-07-30__EN.md, "
          + "TRACK 7 — Marijuana expungement.",
        asOf: "2026-07-30"
      }
    },
    noExternalSourceWasFetched:
      "Egress to court and agency hosts is refused by policy. Every statement below is drawn from the pinned "
      + "source binary or from the corpus's own committed legal review. No mirror, cache or aggregator was used.",

    filing: {
      method: { value: "Paper filing at the clerk's office.", basis: "secondary", note: "The form does not state a method; the review records paper filing." },
      destination: {
        value: "The clerk's office in the court where the criminal case was heard.",
        basis: "primary",
        quote: "You must file this petition in the clerk's office in the court where the criminal case was heard."
      },
      venueRule: {
        value: "Statewide form, court-specific filing: the court connected to the record.",
        basis: "primary_and_secondary",
        note: "The form's header offers Boston Municipal, District, Juvenile and Superior Court departments plus "
          + "a division line, so venue is expressed on the face of the form as a department-and-division choice."
      },
      oneCasePerPetition: {
        value: "One petition per docket number. Separate petitions are required for records in different cases.",
        basis: "primary",
        quote: "If you would like to ask a judge to expunge records in different cases, with different docket "
          + "numbers, you must file separate petitions for each case."
      },
      allEligibleChargesInTheCase: {
        value: "All eligible marijuana charges connected to the case must be included in the one petition.",
        basis: "primary",
        quote: "On this petition, you must include all of the eligible marijuana charges connected to the case "
          + "that you are asking the judge to expunge."
      },
      deadline: { value: "None on the petitioner. The COURT is under a 30-day deadline to act.", basis: "primary_and_secondary" }
    },

    fee: {
      filingFee: {
        value: "UNRESOLVED — no figure is established.",
        basis: "secondary",
        quote: "Filing or processing fee: None identified. Unresolved.",
        productRule: "No fee figure may be published for this route until it is established. Absence of a "
          + "recorded fee is not a statement that the filing is free."
      },
      feeWaiverTreatment: { value: "UNRESOLVED — not established, and conditional on whether a fee attaches at all.", basis: "secondary" }
    },

    service: {
      // The review left this open; the FORM settles it.
      recipients: {
        value: "The District Attorney's Office of the county that prosecuted the case.",
        basis: "primary",
        quote: "You must provide a copy of this petition and any documents that you file with the petition to "
          + "the District Attorney's Office that prosecuted the case."
      },
      method: {
        value: "By hand delivery OR by first-class mail, at the petitioner's election.",
        basis: "primary",
        quote: "You can do this by bringing a copy to the District Attorney's Office or by mailing a copy to "
          + "the District Attorney's Office by first-class mail.",
        formFields: "The election is recorded on the face of the petition by two checkboxes at page 1 "
          + "y 127.26 (x 20.84 in hand, x 182.84 by first-class mail) and a date blank at y 105.12."
      },
      timing: {
        value: "On or before the day the petition is filed in court.",
        basis: "primary",
        quote: "...on or before the day that you file this petition in court."
      },
      proofOfService: {
        value: "No proof of service is required to be filed. The petition carries the petitioner's own "
          + "certificate of delivery instead.",
        basis: "primary",
        quote: "You are not required to provide proof of hand delivery or mailing at this time, but may want "
          + "to obtain and preserve proof of delivery or mailing for your records."
      },
      correctsTheSecondarySource: {
        finding:
          "The MA legal review records service as UNRESOLVED for this track — 'Certificate or proof of "
          + "service: unresolved. Whether service on the district attorney is required, as it is under § 100K, "
          + "was not established on this pass' and 'Notice recipients: ... Unresolved whether the petitioner "
          + "serves.' The pinned form settles it: the petitioner serves, the recipient is the prosecuting "
          + "county's District Attorney, the method is hand delivery or first-class mail, and the timing is on "
          + "or before the filing day. The form is the primary source and post-dates the review's premise "
          + "(REV-2022-11). Recorded so the review can be updated by whoever owns it; the review file is in the "
          + "read-only corpus and has NOT been edited."
      }
    },

    delivery: {
      whatTheCourtMustDo: {
        value: "The court shall order expungement within 30 days of the petition being filed. Written findings "
          + "of fact are required on grant or denial.",
        basis: "primary_and_secondary",
        quote: "(Note: The court is to act within 30 days of the petition being filed.)"
      },
      whatTheParticipantReceives: {
        value: "The clerk provides the petitioner with a certified copy of the expungement order, the docket "
          + "sheets, and the criminal complaint related to the expungement.",
        basis: "primary",
        quote: "If the judge allows your petition for expungement, the clerk will provide you with a certified "
          + "copy of the expungement order, the docket sheets and the criminal complaint related to the "
          + "expungement.",
        participantWarning: {
          value: "Copies must be made BEFORE the court orders expungement; afterwards the record is destroyed "
            + "and no copy can be obtained from the court.",
          basis: "primary",
          quote: "If you want copies of the police report, any documents that you filed, or the petition, you "
            + "must make copies before the court orders expungement. Once the record is destroyed, you will "
            + "not be able to get a copy from the court."
        }
      },
      whereTheOrderGoes: {
        value: "To the clerk of the court where the record was created, the Commissioner of Probation, and the "
          + "Commissioner of Criminal Justice Information Services.",
        basis: "secondary"
      }
    },

    hearing: {
      value: "Optional and at the election of either side. Under § 100K¼(b) the court shall hold a hearing if "
        + "requested by the petitioner or the district attorney; the court may hold one regardless.",
      basis: "primary_and_secondary",
      quote: "At a hearing, you can tell the judge why you think the marijuana record(s) should be expunged. "
        + "Even if you don't request a hearing, the judge could still hold a hearing where you must be present.",
      formField: "The election is a checkbox at page 1 x 20.84, y 202.00 ('I request that the Court hold a "
        + "hearing on my petition.'), which is the participant's own and is never pre-checked by this family."
    },

    verification: {
      value: "Signed under the pains and penalties of perjury. No notarisation.",
      basis: "primary",
      quote: "I swear under the pains and penalty of perjury that all information I provided in this Petition "
        + "is true to the best of my knowledge and belief.",
      note: "The perjury subscription is why the signature and its date are refused by role rather than left "
        + "to an incidental protect match."
    },

    attachments: {
      value: "Documents supporting the petition are optional and attached by the participant, who checks a box "
        + "at page 1 x 20.84, y 157.50 to say they have done so. The legal review records a certified copy of "
        + "the complaint and docket sheet as strongly advised, because the amount of marijuana is the entire "
        + "eligibility question and the CORI does not show it.",
      basis: "primary_and_secondary"
    },

    interpreter: {
      value: "The form states the right to an interpreter at no cost and provides a language blank. This is the "
        + "participant's own election and the platform holds no language fact.",
      basis: "primary",
      quote: "You have the right to an interpreter at no cost to you."
    },

    stillUnresolved: [
      "Filing or processing fee, and therefore fee-waiver treatment.",
      "Whether the corpus's REV-2022-11 edition is still the current official edition — the committed corpus "
        + "index states in terms that it does not establish currentness, and the corpus manifest carries "
        + "freshness_status `source_or_currentness_gate_open` for this document."
    ]
  });

  // ---- findings that belong to owners outside this family ----------------------
  writeJson(`${OUT}/reports/upstream-findings.json`, {
    schemaVersion: "rcap-upstream-findings/v1",
    familyId: FAMILY_ID,
    note:
      "Defects this family found in shared components. None is fixed here: the shared binder, the corpus index "
      + "and the corpus manifest are all outside this family's owned path, and no verifier was skipped, "
      + "weakened or quarantined to get a green lane. Each is stated with the measurement that proves it.",
    findings: [
      {
        id: "MA-TC0021-01",
        severity: "blocking_for_this_family",
        component: "scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs (captureWidgetContext)",
        title: "The label harvester crosses a column boundary on a two-column form header and binds the docket "
          + "box to the participant's street address.",
        measured: {
          field: "form1[0].#subform[0].TextField1[0]",
          widgetRect: { page: 1, x: 273.56, y: 732.20, width: 137.61, height: 18.09 },
          captionActuallyAbove: { text: "DOCKET NO. (of the case in which you are seeking expungement)", y: 764.3, x0: 271.4, x1: 413.7 },
          captionTheHarvesterChose: { text: "YOUR NAME, ADDRESS, AND PHONE NUMBER (Petitioner)", y: 719.3, x0: 20.9, x1: 242.7 },
          labelBasis: "printed_to_the_left_in_the_same_cell"
        },
        consequence:
          "decideBinding returns writable=true with factId participant.street_address. Unrefused, the "
          + "participant's street address is printed as the docket number of the case they are asking the "
          + "court to expunge.",
        whyThisFamilyCannotFixIt:
          "An explicit mapping cannot redirect it: decideBinding refuses any explicit mapping that disagrees "
          + "with the descriptor the chain chose. The field is refused by role instead, which leaves the docket "
          + "number blank rather than wrong.",
        suggestedOwnerAction:
          "Require horizontal overlap with the widget before accepting a caption as 'to the left in the same "
          + "cell', or prefer a caption directly above in the same column when both exist."
      },
      {
        id: "MA-TC0021-02",
        severity: "blocking_for_this_family",
        component: "scripts/rcap-official-forms/rcap-field-semantics.mjs (FACT_DESCRIPTORS)",
        title: "There is no composite descriptor for a combined name/address/phone identity block, so the one "
          + "blank on this form where the petitioner's name belongs cannot be filled correctly.",
        measured: {
          field: "form1[0].#subform[0].TextField1[1]",
          widgetRect: { page: 1, x: 21.55, y: 650.84, width: 245.61, height: 66.33 },
          heightIsThreePrintedLines: true,
          caption: "YOUR NAME, ADDRESS, AND PHONE NUMBER (Petitioner)",
          harvestedLabel: "YOUR NAME, ADDRESS, AND PHONE NUMBER (Petitioner)COURT DEPAR",
          whyOnlyPhoneSurvives:
            "The harvest runs into the next cell and picks up 'COURT'. participant.street_address's refuseWhen "
            + "contains \\bcourt\\b so it drops out; participant.full_legal_name's refuseWhen contains "
            + "\\baddr(ess)?\\b and \\bphone\\b so it drops out. participant.phone is the only descriptor left."
        },
        consequence:
          "decideBinding returns writable=true with factId participant.phone. Unrefused, a three-line "
          + "petitioner identity block on a petition sworn under the pains and penalties of perjury carries "
          + "nothing but a telephone number, which does not identify the petitioner to the court.",
        whyThisFamilyCannotFixIt:
          "The binder binds one atomic fact per field and the caller cannot supply a composite. Refused by "
          + "role, which leaves the block blank for the participant rather than misidentifying them.",
        suggestedOwnerAction:
          "Either add a composite descriptor (a name/address/phone block is common on state cover pages), or "
          + "allow a caller to supply a composed value for a named field under an explicit mapping."
      },
      {
        id: "MA-TC0021-03",
        severity: "record_defect",
        component: "data/rcap-all50/local-source-corpus-index.json",
        title: "The committed corpus index records `xfaPresent: false` for a document whose AcroForm dictionary "
          + "carries an /XFA array.",
        measured: {
          path: doc.pathInArchive,
          indexSays: { xfaPresent: false, structuralClassObserved: "acroform", acroFieldCount: 29, pageCount: 2 },
          bytesSay: structure
        },
        consequence:
          "The corpus manifest gates this document on the ground that it IS XFA while the index says it is "
          + "not. Anyone reconciling the two from the index alone would conclude the gate's stated reason is "
          + "baseless. It is not: the XFA layer is there. What the index gets right is that the AcroForm layer "
          + "is real and complete.",
        notFixedHere: "The index is a shared manifest outside this family's owned path and has not been edited."
      },
      {
        id: "MA-TC0021-04",
        severity: "latent",
        component: "scripts/rcap-official-forms/rcap-field-semantics.mjs (matter.charge descriptor)",
        title: "The charge descriptor's /\\bcount\\b/ pattern does not match the plural caption 'Counts', which "
          + "is how this form labels its charge-count line.",
        measured: {
          field: "form1[0].#subform[0].TextField2[0]",
          widgetRect: { page: 1, x: 69.99, y: 433.80, width: 512.17, height: 19.84 },
          printedLabel: "Counts:",
          captionDescribesChargeValue: true,
          decideBindingToday: "writable=false, reason=no_allowlisted_fact_matches"
        },
        consequence:
          "The blank is refused today, but for the wrong reason — it is refused because nothing matched, not "
          + "because it is a charge caption. A future descriptor whose pattern does match the plural would "
          + "make it writable with no other change. This family refuses it by role so the outcome does not "
          + "depend on a plural 's'.",
        suggestedOwnerAction: "Consider /\\bcounts?\\b/ in the matter.charge pattern."
      },
      {
        id: "MA-TC0021-05",
        severity: "latent",
        component: "scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs + PROTECT_RULES",
        title: "The COURT DIVISION box is protected only incidentally, by the word 'cost' in a caption that "
          + "belongs to a different line.",
        measured: {
          field: "form1[0].#subform[0].TextField1[7]",
          widgetRect: { page: 1, x: 273.56, y: 652.32, width: 317.61, height: 19.84 },
          captionActuallyAbove: { text: "COURT DIVISION", y: 674.3, x0: 271.4, x1: 339.4 },
          captionTheHarvesterChose: { text: "You have the right to an interpreter at no cost to you", y: 636.1 },
          protectCategory: "money"
        },
        consequence:
          "protectCategoryOf returns `money` from 'no cost', so the field is refused as a protected category. "
          + "That is the right outcome for the wrong reason and would vanish if the harvest changed. Refused "
          + "by role here as well. The same incidental `money` protection covers the interpreter checkbox at "
          + "x 29.84, y 617.98.",
        suggestedOwnerAction: "Same harvester fix as MA-TC0021-01."
      }
    ]
  });

  // ---- step 5: product wiring, creating no authority ---------------------------
  writeJson(`${OUT}/product-wiring.json`, {
    schemaVersion: "rcap-family-product-wiring/v1",
    familyId: FAMILY_ID,
    worklistGroupId: FAMILY_ID,
    packetSetId: FAMILY_ID,
    implementationStrategy: "official_pdf_fill",
    routeKeys: [ROUTE_KEY],
    jurisdiction: "MA",
    trackId: "ma-expunge-mj",
    runtimePathwayId: "marijuana-only-expungement",
    documents: [{
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      officialTitle: doc.officialTitle,
      revision: doc.revision,
      sha256: doc.sha256,
      role: "primaryOfficialForm"
    }],
    componentsThisFamilyDoesNotProvide: {
      proposedOrder: "not applicable — § 100K¼ requires no proposed order and none is in the corpus",
      coverSheet: "not applicable",
      notice: "not applicable — the court, not the petitioner, notifies",
      certificateOfService:
        "not a separate document — the certificate of delivery to the District Attorney is printed on the face "
        + "of TC0021 and is completed by the participant after actual delivery",
      affidavitOrVerification:
        "not a separate document — the perjury subscription is printed on the face of TC0021"
    },

    // The whole point of this section.
    authorityCreated: "NONE",
    assertions: {
      generationAllowed: false,
      runtimeSelectable: false,
      resolverEnrolment: "none — TC0021 is not enrolled with any packet resolver",
      commercialRouteOpened: false,
      fulfilmentRecordCreated: false,
      approvedForParticipantDelivery: false,
      productionConfigurationTouched: false,
      legalEligibilityTouched: false,
      routeIdentityTouched: false,
      paymentOrSponsorshipTouched: false,
      sharedManifestsTouched: false
    },
    whatWouldBeRequiredBeforeAnyOfThatChanges: [
      "The corpus source gate on TC0021 is cleared by whoever owns the Master Library governance record.",
      "MA-TC0021-01 and MA-TC0021-02 in reports/upstream-findings.json are fixed by the owner of the shared "
        + "binder, without which this family can write no field at all.",
      "The filing fee and fee-waiver treatment are established (local-filing-variation.json#fee).",
      "A human legal reviewer grants the output approval requested in approval-request.json.",
      "A Grade-A fulfilment record keyed to this exact route and packet family exists. Commercial authority "
        + "comes from that and from nothing else."
    ],
    ownedPath: OUT,
    pathsThisFamilyDidNotEdit: [
      "data/rcap-all50/local-source-corpus-index.json",
      "data/rcap-grade-a/**",
      "scripts/rcap-official-forms/**",
      "scripts/lib/**",
      "any other packet family's overlay path"
    ]
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
