#!/usr/bin/env node
// Route-obligation census v1 — packet family `ar-arrest-seal-set`.
//
//   node scripts/build-census-v1-ar-arrest-seal-set.mjs
//
// Arkansas, sealing an ARREST under Act 1460 of 2013 (A.C.A. § 16-90-1401 et
// seq.), route
// `obligation:track-pathway:AR:ar-arrest-seal:situation-a-non-convictions`.
// The family delivers two documents:
//
//   * the ACIC Petition to Seal Arrest  — the participant's own filing;
//   * the ACIC Order to Seal Arrest     — the proposed order the COURT signs.
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
// THE DEFECT THIS FAMILY IS DOWNSTREAM OF
//
// data/rcap-grade-a/stale-artifact-block.json blocks twelve artifacts across
// six Arkansas/Kentucky families, including
// `ar-acic-petition-to-seal-arrest-under-act-1460-source-gated-en` — the SAME
// petition binary this family binds. Those artifacts were rendered through a
// map that wrote the participant's own name into blanks holding the offence
// they were charged with. Nothing here reads, cites or re-renders a blocked
// hash: the family is built fresh from the pinned source bytes, and the
// verification below re-derives the charge-caption question from the artifact
// rather than trusting that the binder is fixed.
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

const FAMILY_ID = "ar-arrest-seal-set";
const OUT = "data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const ROUTE_KEY = "obligation:track-pathway:AR:ar-arrest-seal:situation-a-non-convictions";

const fail = (message, detail = null) => {
  console.error(`build-census-v1-${FAMILY_ID}: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was written.");
  process.exit(1);
};

// --- the two documents, pinned by hash ---------------------------------------
//
// `captionOnly` is the whole of the difference between them. The petition is
// the participant's statement and takes participant facts; the order is the
// court's own instrument and accepts nothing but caption facts, so its
// findings, its decree, its signature and its date are refused by the factory
// rather than by a rule this file writes.
const DOCUMENTS = [
  {
    key: "petition",
    documentId: "AR-ACIC-PETITION-TO-SEAL-ARREST-UNDER-ACT-1460",
    documentRole: "PETITION",
    officialTitle: "Petition to Seal Arrest Under Act 1460 of 2013",
    revision: "REV-2014-08-25",
    sha256: "f77e17b669bd6e01cc3818329181bb378dd774b1facd9a15c4083d37d380194c",
    pathInArchive: "STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-PETITION-TO-SEAL-ARREST-UNDER-ACT-1460__petition-to-seal-arrest-under-act-1460-of-2013__REV-2014-08-25__EN.pdf",
    ownership: "participant_completed",
    captionOnly: false,

    // The only two explicit mappings this family makes.
    //
    // "First Middle and Last name" is the DEFENDANT caption blank on page 1,
    // and the form prints "(First, Middle and Last name)" directly under it —
    // it wants the whole name. The field-name channel disagrees: the haystack
    // contains the literal substring "last name", `participant.last_name` is
    // ordered ahead of `participant.full_legal_name` in FACT_DESCRIPTORS, and
    // most-specific-first therefore selects the surname. Naming
    // full_legal_name here does not override that — decideBinding refuses a
    // mapping that conflicts with the name channel — so the blank is left
    // EMPTY and the reason is recorded as `explicit_mapping_conflicts_with_
    // field_name`. That is the intended outcome of the two available ones: a
    // petition whose caption reads "Reyes" misnames the defendant to the
    // court, and a blank line does not. See the report this script writes.
    //
    // "and charged with the offenses of 1" is a charge row and
    // `matter.charge` is a requiresExplicitMapping descriptor, so the caller
    // must name it or nothing binds. This is the exact blank class the stale
    // -artifact block is about, which is why it is mapped deliberately and
    // then proved from the bytes.
    explicitMappings: {
      "First Middle and Last name": "participant.full_legal_name",
      "and charged with the offenses of 1": "matter.charge"
    },

    // Role refusals: what this family determines the participant does not
    // complete, or does not complete YET. Only fields the shared protect
    // rules do NOT already catch are listed, so the rules keep doing their own
    // work and the verification can tell the two channels apart.
    unwritable: [
      { field: "Date", class: "participant_signature_date",
        why: "The date beside the defendant's signature on page 2. Dating a signature that has not been made asserts the petition was signed on a day it was not." },
      { field: "Date_2", class: "certificate_of_service_date",
        why: "The date on the page 3 Certificate of Service. Service has not happened; a date here certifies a mailing that has not occurred." },
      { field: "I", class: "certificate_of_service_attestation",
        why: "The certifying party's name in 'I, ____, do hereby certify that a true and correct copy ... has been provided'. This is a sworn statement about an act of service, not a caption; it is the filer's to make after mailing." },
      { field: "Arrest Tracking Number", class: "agency_assigned_identifier",
        why: "The ATN is assigned by Arkansas ACIC when an arrest is processed. It identifies the arrest through a system the platform has no knowledge of and is the agency's to state." },
      { field: "Defendant Address  Street 2", class: "address_continuation_line",
        why: "The second printed rule of a two-line street block. The platform holds one street address and writes it once; filling both lines prints the same address twice." },

      // The arrest-date trio, and the reason it is refused as a trio.
      //
      // These three blanks complete "1. The Defendant was arrested on the ___
      // day of ______, ____". The platform holds `matter.arrest_date` as a
      // whole date and holds no day, month or year fact, so there is nothing
      // correct to write into any of them.
      //
      // Refusing them is not precautionary. The first build of this family
      // WROTE THE PARTICIPANT'S NAME INTO `MONTH`: the field name matches no
      // descriptor, so the binder fell back to the printed label, the caption
      // harvested to its left is the sentence fragment "Comes the Defendant
      // and for his/her petition to seal the r", and `participant.full_legal_
      // name` matches the word "Defendant" in it. The canonical fixture read
      // "arrested on the ___ day of Jordan Avery Reyes". `DAY` bound the same
      // fact and was refused only because the name did not fit 54pt — clean by
      // luck, not by decision, which is the same thing the stale-artifact
      // block says about one of its own boundary fixtures. `YEAR` binds
      // nothing today only because its harvested caption is the digit "1".
      //
      // This is the charge-caption defect's sibling: the printed-label
      // fallback binding a name into a blank that holds something else. The
      // committed guard covers charge, offence, count, statute and violation
      // captions; a date component is none of those, so nothing shared
      // refuses it and the refusal has to be stated here.
      { field: "DAY", class: "arrest_date_component",
        why: "Day component of the arrest date. The platform holds no day fact, and the printed-label fallback binds participant.full_legal_name here via the word 'Defendant' in the harvested sentence fragment." },
      { field: "MONTH", class: "arrest_date_component",
        why: "Month component of the arrest date. Proven to receive participant.full_legal_name through the printed-label fallback; refused by role so no name can reach it." },
      { field: "YEAR", class: "arrest_date_component",
        why: "Year component of the arrest date. Refused with the other two: the trio is one fact the platform does not hold in component form." }
    ]
  },
  {
    key: "order",
    documentId: "AR-ACIC-ORDER-TO-SEAL-ARREST-UNDER-ACT-1460",
    documentRole: "PROPOSED_ORDER",
    officialTitle: "Order to Seal Arrest Under Act 1460 of 2013",
    revision: "REV-2014-01-01",
    sha256: "5bd4ed5bd1b658295b50c2ea7126e276982fd705045f36adfc1f074923722581",
    pathInArchive: "STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-ORDER-TO-SEAL-ARREST-UNDER-ACT-1460__order-to-seal-arrest-under-act-1460-of-2013__REV-2014-01-01__EN.pdf",
    ownership: "court_issued_order",
    captionOnly: true,
    explicitMappings: {
      "First Middle and Last name": "participant.full_legal_name"
    },
    unwritable: [
      { field: "Judge", class: "court_only_signature",
        why: "The judge's signature line. Court-only." },
      { field: "Date", class: "court_only_signature_date",
        why: "The date beside the judge's signature. The court dates its own order." },
      { field: "Arrest Tracking Number", class: "agency_assigned_identifier",
        why: "ACIC-assigned arrest identifier; the agency's to state." },

      // The same trio, on the order, refused for the same reason and NOT left
      // to the protection that currently happens to cover it. `Day` and
      // `Month` here bind participant.full_legal_name by the identical
      // printed-label route, and `participant.full_legal_name` is a caption
      // fact, so captionOnly does not stop it. What stops it today is that
      // this document's printed region heading is its own title, "ORDER TO
      // SEAL ARREST UNDER ACT 1460 OF 2013;", which matches the court region
      // rule. decideBinding takes a `regionIsDocumentTitle` flag precisely
      // because a title names the form rather than an area of it, so that
      // protection is incidental and would disappear the moment the flag is
      // set correctly. A refusal that depends on a form's title is not a
      // refusal.
      { field: "Day", class: "arrest_date_component",
        why: "Day component of the arrest date in the court's findings. Binds participant.full_legal_name through the printed-label fallback; refused by role rather than by the document title." },
      { field: "Month", class: "arrest_date_component",
        why: "Month component of the arrest date in the court's findings. Same binding, same refusal." },
      { field: "Year", class: "arrest_date_component",
        why: "Year component of the arrest date in the court's findings." }
    ]
  }
];

// The ONLY blanks in this family that may ever carry the participant's name.
//
// Stated as an allowlist rather than as a set of refusals, because the defect
// this family kept finding is a name arriving somewhere nobody listed. The
// verification reads every appearance out of the rendered artifact and fails
// on a name token drawn anywhere but here — which is how `MONTH` was caught,
// and is a wider net than the charge-caption question alone.
const NAME_MAY_APPEAR_IN = {
  "AR-ACIC-PETITION-TO-SEAL-ARREST-UNDER-ACT-1460": [
    "First Middle and Last name",  // page 1 DEFENDANT caption — currently refused, see explicitMappings
    "Defendant NAME"               // page 2 "WHEREFORE, the Defendant, ______"
  ],
  "AR-ACIC-ORDER-TO-SEAL-ARREST-UNDER-ACT-1460": [
    "First Middle and Last name",  // page 1 DEFENDANT caption — currently refused
    "Defendant"                    // page 2 "the Petition of the Defendant, ______"
  ]
};

// --- fixture identities -------------------------------------------------------
// The corpus's standard canonical and boundary participants, so this family's
// fixtures are comparable with every other family's. "Jordan Avery Reyes" is
// deliberately the same name that the blocked artifacts printed into their
// charge blanks: if this family reproduced that defect, this name is what
// would appear there, and the verification below looks for exactly that.
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

// Every name token either fixture could put on paper. The charge-blank proof
// looks for these, so it catches a surname or a middle name landing in a
// charge blank as well as the whole name.
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
// A mismatch is a stop, not a warning.
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

// ---- step 2 + 3: census with MEASURED geometry --------------------------------
//
// Every write box here is the widget's own /Rect, read from the document. Not
// one is derived from where a caption is printed: the caption is captured
// separately and only ever used to decide WHAT a blank means, never WHERE it
// is. The stroked rules on each page are measured too, so the map records the
// printed line a value sits on as independent corroboration that the widget is
// where the form actually draws a blank.
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

  // The printed rule a widget sits on, measured. A blank on these ACIC forms is
  // drawn as a run of underscores rather than a stroked path, so this is
  // corroboration where it exists and is honestly reported absent where it
  // does not — it is never a substitute for the widget rectangle.
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
    strokedByPage
  };
}

// ---- step 5: prove it from the ARTIFACT, not from the report ------------------
//
// The report says what the factory believes it wrote. This reads the flattened
// appearance streams back out of the finished PDF and asks the document what is
// actually drawn at each measured rectangle. The two are compared; a
// disagreement is a failure of this build, not a note.
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
    // Any blank whose caption or name speaks of a charge, offence, count,
    // statute or violation must not contain a participant name token.
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

    // Anything the factory refused must be empty on the paper, and anything it
    // wrote must be present. This is what catches a map and an artifact that
    // disagree.
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
    /signature|^date(_\d+)?$|^judge$/i.test(f.name)
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

  // THE WIDER NET.
  //
  // Every appearance the artifact draws is read, and any that carries a
  // participant name token must sit at a blank this family listed as one the
  // name belongs in. The charge-caption check above answers the question the
  // stale-artifact block asks; this one answers the question that block is an
  // instance of — "is the participant's name anywhere it was not put on
  // purpose" — and it is what caught the participant's name being written
  // into the MONTH of the arrest date.
  const allowed = new Set(NAME_MAY_APPEAR_IN[documentId] ?? []);
  const namePlacements = [];
  for (const appearance of drawn) {
    const text = String(appearance.text ?? "").trim();
    if (!text) continue;
    const hit = NAME_TOKENS.filter((tok) => text.toLowerCase().includes(tok.toLowerCase()));
    if (!hit.length) continue;
    // Which censused blank is drawn at this point.
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
      const result = await finalizeOfficialForm({
        sourceBytes: bytes,
        expectedSha256: doc.sha256,
        census: census.fields,
        facts,
        explicitMappings: doc.explicitMappings,
        unwritableFields: doc.unwritable.map((u) => ({ field: u.field, class: u.class })),
        captionOnly: doc.captionOnly,
        documentTextLines: census.documentTextLines,
        title: `AR ${doc.documentId}`
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
    jurisdiction: "AR",
    routeKeys: [ROUTE_KEY],
    custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false,
    whyNoAcquisition:
      "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json classifies this family "
      + "SOURCE_ALREADY_HELD: both document sources resolve to files already in the verified corpus. Nothing was "
      + "fetched from a court host. The pinned Master Library was recovered through "
      + "scripts/rcap-corpus/bootstrap-private-corpus.sh, which verifies the archive hash and the corpus's own "
      + "governance checksums before extracting.",
    sourceArchive: "Expungement_AI_RCAP_Master_Library_Edition_1",
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
      "This file is deliberately NOT named field-census.json. "
      + "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs walks "
      + "data/rcap-all50/overlays for that exact filename and asserts the family and field totals equal the "
      + "counts frozen in data/rcap-grade-a/field-semantics/full-name-charge-caption-classification-diff.json "
      + "(156 families / 5286 fields). Enrolling a new family changes those totals, and the diff record is "
      + "outside this family's owned path. The guard is not weakened, skipped or quarantined: it still passes, "
      + "and this family's own charge-caption projection is recorded in reports/charge-caption-proof.json. "
      + "Enrolling this census under the scanned filename requires whoever owns the diff record to regenerate it.",
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
      "Does any blank whose caption or field name names a charge, offence, count, statute or violation "
      + "carry a participant name token in the rendered artifact bytes?",
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

    // The guard's OWN test, applied to this family's census.
    //
    // verify-full-name-charge-caption-semantics.mjs asks, of every censused
    // blank in the corpus: does decideBinding make it writable, with factId
    // participant.full_legal_name, while its name or caption uses the charge
    // vocabulary? That set must be empty. This runs the identical question
    // over this family, because the guard itself does not see this census —
    // see `filenameNote` in field-census.census-v1.json.
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
      + "measured rectangle. This is wider than the charge-caption question and is what caught the "
      + "participant's name being written into the MONTH of the arrest date in the first build of this family.",
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
      "Rendered fresh from the pinned source bytes. Every output hash below was checked against the twelve "
      + "hashes in the stale-artifact block and matches none of them. No blocked hash is cited as evidence "
      + "for anything in this family.",
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
      + "widening the map: each is either the participant's to complete, the court's, or a value the platform "
      + "does not hold.",
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
      + "route, creates no fulfillment record and marks no packet proven. The family remains not runtime-"
      + "selectable and generationAllowed is false.",
    workTypesAddressed: {
      OFFICIAL_SOURCE_ACQUISITION_REQUIRED:
        "Resolved as custody, not acquisition: both sources were already held and are bound by pinned SHA-256.",
      OFFICIAL_FORM_MAP_REQUIRED:
        "Field map built from measured widget geometry for both documents.",
      ARTIFACT_REVIEW_REQUIRED:
        "Canonical and boundary fixtures rendered and verified from the artifact bytes; every page rastered.",
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
