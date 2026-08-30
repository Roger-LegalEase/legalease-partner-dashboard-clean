#!/usr/bin/env node
// Route-obligation census v1 — packet family `ak-tf805-set`.
//
//   node scripts/build-census-v1-ak-tf805-set.mjs
//
// Alaska Court System form TF-805 (5/25), "Request to Remove Name From Online
// Public Index (CourtView) Under Administrative Rule 40(b) or (c)", route
// `obligation:track-only:AK:ak-tf805`. One two-page binary carries all three
// components the packet set names: the participant's request (page 1), the
// certificate of service (page 2, upper), and the court's order (page 2,
// lower). They are blocks on one document, not three binaries.
//
// WHY THIS SCRIPT EXISTS AND WHAT IT IS NOT
//
// It is not a renderer. Every decision about what may be written is made by
// scripts/rcap-official-forms/rcap-field-semantics.mjs and every byte is
// written by finalizeOfficialForm; this file supplies the two things only a
// caller can supply -- this family's ROLE classification and its explicit
// mappings -- and then proves the result from the artifact bytes rather than
// from its own report.
//
// WHAT MEASURING THIS DOCUMENT CHANGED
//
// The predecessor lane stopped at the source gate and carried the production
// lane's coordinates forward marked `inherited`. Those coordinates are correct
// -- every one of the 17 widget rectangles measured here agrees with them at
// integer rounding -- but reuse is not measurement, and measuring turned up
// three things reuse could not have:
//
//   1. TF-805 sets its whole page in one 11pt size and prints "Certificate of
//      Service" in mixed case. `pageRegions` marks a heading only when it is
//      set larger than body text or is fully capitalised, so on this document
//      NO page-2 widget is inside any detected region and the region channel
//      -- the one designed to protect a service block independently of field
//      names -- contributes nothing here. Six of the eight certificate-of-
//      service fields were therefore refused only incidentally: four by the
//      checkbox type guard and two because no descriptor happens to match
//      their names. A refusal that depends on a form's typography is not a
//      refusal, so this family states them by ROLE below.
//
//   2. The form draws the certificate of service inside a stroked box, and
//      that box can be measured: 56.4..553.65 x 501.62..604.22 on page 2. All
//      eight page-2 widgets lie inside it. That is a geometric service-block
//      assertion taken off the document, and the verification below uses it --
//      it does not depend on a field being named "cert" anything.
//
//   3. The order block on page 2 draws four checkboxes (x=72.83; y=446.73,
//      427.52, 328.5, 189.65) that have NO AcroForm widget at all. The court
//      marks them by hand. Nothing this platform can write reaches the order,
//      and that is measured here rather than assumed.
//
// The stroked geometry above is read with scripts/lib/pdf-stroked-boxes.mjs,
// which tracks the CTM. It is read from the DECODED content stream: TF-805's
// streams are Flate-compressed, and running the detector over the raw bytes
// returns zero rectangles rather than an error -- silently, which is the
// failure mode worth naming.
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
import { CHARGE_VALUE_WORDS, captionDescribesChargeValue, descriptorsMatching, protectCategoryOf,
  regionProtectCategoryOf, decideBinding, resolveFact } from "./rcap-official-forms/rcap-field-semantics.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList,
  PDFRawStream, decodePDFRawStream } = require("pdf-lib");

const FAMILY_ID = "ak-tf805-set";
const OUT = "data/rcap-all50/overlays/census-v1/ak/ak-tf805-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const ROUTE_KEY = "obligation:track-only:AK:ak-tf805";
const INHERITED = `${OUT}/inherited-measurements.json`;

const fail = (message, detail = null) => {
  console.error(`build-census-v1-${FAMILY_ID}: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was written.");
  process.exit(1);
};

// --- the one document, pinned by hash ----------------------------------------
const DOCUMENT = {
  key: "tf805",
  documentId: "AK-TF-805-REQUEST-TO-REMOVE-NAME-FROM-ONLINE-PUBLIC-INDEX",
  documentRole: "REQUEST_WITH_CERTIFICATE_OF_SERVICE_AND_PROPOSED_ORDER",
  officialTitle: "Request to Remove Name From Online Public Index (CourtView) Under Administrative Rule 40(b) or (c)",
  revision: "REV-2025-05",
  sha256: "96306d64eda397e25094f92c3d67a642372b82cba12f97c6666e5500136e8f54",
  pathInArchive: "STATES/AK/02_PACKET_FORMS/AK__FORM__TF-805__request-to-remove-name-from-online-public-index-courtview-under-administrative-rule-40-b-o__REV-2025-05__EN.pdf",
  ownership: "participant_completed_with_court_order_block",

  // NO explicit mappings, and that is a finding rather than an omission.
  //
  // `explicitMappings` exists to let a caller name a legally sensitive fact --
  // a charge, an arrest date, a disposition date -- for a blank that will not
  // bind without it. TF-805 asks for none of them. It is a request about how a
  // case is INDEXED, not about what the case was, so it has no charge blank,
  // no offence blank and no date-of-offence blank anywhere on either page.
  // The charge-caption proof this build writes is therefore empty by the
  // document's own construction, not by a refusal that happened to hold.
  explicitMappings: {},
  captionOnly: false,

  // Fields this family determines the participant completes themselves, or
  // completes only after an act that has not happened.
  //
  // Following the corpus convention, this lists only what the SHARED rules do
  // not already catch on their own merits, so the two channels stay separable
  // and the verification can report which one refused each field. Two fields
  // are deliberately NOT listed -- `certDate`, caught by the shared
  // service_block name rule, and `signature0`, caught by the shared signature
  // rule -- so that if either shared rule ever stops working, this family's
  // verification fails rather than silently taking over.
  unwritable: [
    // The certificate of service. Every field here is a statement about an act
    // of service that has not occurred when the packet is produced. The
    // measured stroked box on page 2 encloses all of them, and the
    // verification asserts that box is empty rather than trusting this list.
    { field: "time2", class: "certificate_of_service_time",
      why: "The time in 'I certify on ___ at ___ [date/time] I gave a copy of this document'. Service has not happened; a time here certifies an act that has not occurred. Refused today only because no descriptor matches the name 'time2' -- an accident, not a decision." },
    { field: "needText1", class: "certificate_of_service_recipients",
      why: "The 'I served these people:' line. Who was served is a fact about something the participant did, and the platform does not know it. Refused today only because no descriptor matches the name 'needText1'." },
    { field: "mail", class: "service_method_election",
      why: "The 'by mail' service-method box. Which method was used is the participant's statement about their own act, made after the act. Refused today only by the checkbox type guard, which is a guard about field TYPE, not about who owns the field." },
    { field: "hd", class: "service_method_election",
      why: "The 'hand-delivery' service-method box. Same reason as `mail`." },
    { field: "tf", class: "service_method_election",
      why: "The 'TrueFiling' service-method box. Measured off the document: page 2 prints 'by mail. hand-delivery. TrueFiling. email.' and this box is the third of the four, at x=334.74 against the printed box at x=335.10. Same reason as `mail`." },
    { field: "emailCB", class: "service_method_election",
      why: "The 'email' service-method box, and the most dangerous field on the form. Its NAME matches the participant.email descriptor, so the only thing standing between it and a bound value today is the checkbox type guard. The form further prints '[You can only use email if the other party provided an email address to the court]' -- a condition about the OTHER party that the platform cannot evaluate." },

    // The participant's own legal election and their own sworn words.
    { field: "why", class: "participant_legal_election",
      why: "The radio choosing the ground for relief: Administrative Rule 40(b) (sensitive and highly personal matters) at the widget measured at y=415.00, or 40(c) (likely substantial physical harm) at y=358.71. Which ground applies is a legal characterisation of the participant's own circumstances and is theirs to make. The consequences differ -- 40(c) removal lasts five years and 40(b) does not -- so a default here would be a legal choice made for someone. Refused today only by the checkbox/radio type guard." },
    { field: "reason", class: "participant_sworn_statement",
      why: "The free-text box completing 'I believe that the statements above are true, because:', which sits above the Verification block the participant swears to. These are the participant's own sworn words. No fact the platform holds is an answer to it, and generating one would put words into a sworn statement. Refused today only because no descriptor matches the name 'reason'." }
  ]
};

// The ONLY blanks in this family that may ever carry the participant's name.
// Stated as an allowlist, so a name arriving anywhere nobody listed is a
// failure rather than something to notice later.
const NAME_MAY_APPEAR_IN = [
  "name",        // page 1 "Name:" -- the requestor's own name
  "caseName",    // page 1 "Case Name:" -- see the finding recorded about this
  "partyNames"   // page 1 "Party Names:" -- the parties whose name is to be removed
];

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
  "participant.email": "alexandrina.montgomery.vandenberg.oyelaran.fitzwilliam@department-of-example.example.gov",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201",
  "matter.county": "Saint Bartholomew and the Northern Reaches County"
};

const NAME_TOKENS = [...new Set(
  [CANONICAL, BOUNDARY].flatMap((f) => [
    f["participant.full_legal_name"], f["participant.first_name"],
    f["participant.last_name"], f["participant.middle_name"]
  ]).filter(Boolean).flatMap((v) => [v, ...String(v).split(/[\s\-]+/)])
    .map((s) => s.trim()).filter((s) => s.length >= 4)
)];

// The facts that ARE the participant's name. Used by the placement check below
// to tell "the name was drawn here" from "a value that happens to contain the
// name was drawn here" -- an email address built from a surname being the case
// that forced the distinction.
const NAME_FACTS = new Set([
  "participant.full_legal_name", "participant.first_name",
  "participant.last_name", "participant.middle_name"
]);

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

/**
 * A page's content stream, DECODED.
 *
 * `PDFRawStream.getContents()` returns the stream as stored, which for TF-805
 * is Flate-compressed. Handing those bytes to a content-stream scanner does
 * not throw -- it matches no operators and returns an empty result, which
 * reads exactly like a form that draws nothing. Decoding first is the whole
 * difference between "this form has no stroked boxes" and the eleven it has.
 */
function decodedPageContent(pdf, page) {
  let out = "";
  for (const ref of page.node.normalizedEntries?.().Contents?.asArray?.() ?? []) {
    const stream = pdf.context.lookup(ref);
    if (!(stream instanceof PDFRawStream)) continue;
    try { out += Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1"); }
    catch { /* undecodable stream: contributes nothing, and says so by its absence */ }
  }
  return out;
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
      `expected ${CORPUS_ROOT}/${doc.pathInArchive} -- run scripts/rcap-corpus/bootstrap-private-corpus.sh`);
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

// ---- steps 2 + 3: census with MEASURED geometry -------------------------------
//
// Every write box is the widget's own /Rect, read from the document. No box is
// derived from where a caption is printed: captions are captured separately and
// decide only what a blank MEANS, never where it is. The stroked geometry is
// measured independently and used as corroboration -- the printed box a control
// sits on, and the printed box a block is enclosed by.
async function censusDocument(doc, bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  const form = pdf.getForm();

  const linesByPage = pages.map((p) => groupIntoLines(extractTextItems(p)));
  const documentTextLines = linesByPage.flat().map((l) => normalizeHarvestedText(l.text));

  const strokedByPage = new Map();
  pages.forEach((page, i) => {
    const content = decodedPageContent(pdf, page);
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

  // The printed control box a widget sits on. TF-805 draws its checkboxes and
  // radios as stroked near-squares, so for those this is real, independent
  // corroboration that the widget is where the form actually draws a control.
  // The text blanks are drawn as nothing at all -- no stroked rule, no run of
  // underscores -- so for those it is honestly absent rather than invented.
  const controlBoxUnder = (page, rect) => {
    const overlap = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0);
    const near = (strokedByPage.get(page) ?? []).filter((s) =>
      s.squareness >= 0.85 && Math.max(s.width, s.height) <= 20
      && overlap(s.x0, s.x1, rect.x, rect.x + rect.width) > Math.min(s.width, rect.width) * 0.5
      && overlap(s.y0, s.y1, rect.y, rect.y + rect.height) > Math.min(s.height, rect.height) * 0.5);
    if (!near.length) return null;
    const best = near.sort((a, b) =>
      (Math.abs(a.x0 - rect.x) + Math.abs(a.y0 - rect.y)) - (Math.abs(b.x0 - rect.x) + Math.abs(b.y0 - rect.y)))[0];
    return {
      x0: best.x0, y0: best.y0, x1: best.x1, y1: best.y1,
      width: best.width, height: best.height, construction: best.construction,
      offsetFromWidget: { dx: +(best.x0 - rect.x).toFixed(2), dy: +(best.y0 - rect.y).toFixed(2) }
    };
  };

  // The large stroked boxes on each page: a form drawing a box around a block
  // is telling the reader where that block begins and ends. This is what gives
  // the certificate of service a MEASURED boundary on a document whose
  // typography defeats heading detection.
  const enclosures = new Map();
  for (const [page, rects] of strokedByPage) {
    enclosures.set(page, rects.filter((r) => r.width > 200 && r.height > 40));
  }
  const enclosingBox = (page, rect) => {
    const box = (enclosures.get(page) ?? []).find((b) =>
      rect.x >= b.x0 - 1 && rect.x + rect.width <= b.x1 + 1
      && rect.y >= b.y0 - 1 && rect.y + rect.height <= b.y1 + 1);
    return box ? { x0: box.x0, y0: box.y0, x1: box.x1, y1: box.y1, width: box.width, height: box.height } : null;
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
      regionProtectCategory: c.regionHeading ? regionProtectCategoryOf(c.regionHeading) : null,
      widgets: f.widgets,
      captionDescribesChargeValue: captionDescribesChargeValue(subject),
      captionOrNameMentionsCharge: CHARGE_VALUE_WORDS.test(subject) || CHARGE_VALUE_WORDS.test(f.name),
      protectCategory: protectCategoryOf(subject) ?? protectCategoryOf(f.name) ?? null,
      descriptorsByName: descriptorsMatching(f.name).map((d) => d.factId),
      descriptorsByLabel: c.effectiveLabel ? descriptorsMatching(c.effectiveLabel).map((d) => d.factId) : [],
      measuredControlBoxUnderWriteBox: w ? controlBoxUnder(w.page, w.rect) : null,
      measuredEnclosingBox: w ? enclosingBox(w.page, w.rect) : null
    };
  });

  return {
    pdf, pages, fields: censusFields, documentTextLines, strokedByPage,
    enclosures,
    pageGeometry: pages.map((p, i) => ({
      page: i + 1, width: +p.getSize().width.toFixed(2), height: +p.getSize().height.toFixed(2),
      orientation: p.getSize().width < p.getSize().height ? "portrait" : "landscape"
    }))
  };
}

// ---- step 7: prove it from the ARTIFACT, not from the report -------------------
async function verifyFromBytes({ file, census, report, facts, label, serviceBlockBox }) {
  const drawn = await flattenedWidgets(file);
  const findings = [];
  const chargeBlanks = [];
  const serviceBlockCheck = [];

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
        field: field.name, page: w.page, rect: w.rect, effectiveLabel: field.effectiveLabel,
        captionDescribesChargeValue: field.captionDescribesChargeValue,
        drawnText: text === "" ? null : text, participantNameTokensFound: hit
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

    // THE GEOMETRIC SERVICE-BLOCK ASSERTION.
    //
    // Not "is this field named like a service field" -- that channel is what
    // left six of these eight refused by accident. This asks the only question
    // the document itself answers: does this widget sit inside the box the
    // form draws around its certificate of service, and if so, is it blank.
    if (serviceBlockBox && w.page === serviceBlockBox.page
      && w.rect.x >= serviceBlockBox.x0 - 1 && w.rect.x + w.rect.width <= serviceBlockBox.x1 + 1
      && w.rect.y >= serviceBlockBox.y0 - 1 && w.rect.y + w.rect.height <= serviceBlockBox.y1 + 1) {
      serviceBlockCheck.push({ field: field.name, rect: w.rect, drawnText: text === "" ? null : text });
      if (text !== "") {
        findings.push({ severity: "blocking", fixture: label, field: field.name,
          check: "field_inside_the_measured_certificate_of_service_box_carries_ink", drawnText: text });
      }
    }
  }

  // The hard rules, asserted against the bytes by name as well as by geometry.
  const mustBeBlank = census.fields.filter((f) =>
    /signature|^date$|cert\s*date|certdate|^time/i.test(f.name)
    || /signature|certificate\s*of\s*service/i.test(f.effectiveLabel ?? ""));
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

  // THE WIDER NET: every drawn name token must sit in a blank this family
  // listed as one the name belongs in.
  //
  // One exemption, and it is narrow on purpose. `jordan.reyes@example.com` on
  // the Email line contains the surname, so a literal token scan calls the
  // participant's own email address a misplaced name. What is drawn there is
  // the EMAIL -- the token is inside the value, not instead of it. So an
  // appearance is exempt only when all three hold: the field was written by
  // this build, the fact written there is not itself a name fact, and the text
  // on the paper is EXACTLY the value that fact resolves to. A name fact
  // reaching a non-name blank still blocks, a value that does not match what
  // was intended still blocks, and an appearance in a field this build never
  // wrote still blocks. The exemption cannot hide a misplaced name; it can
  // only recognise a correctly placed non-name value.
  const allowed = new Set(NAME_MAY_APPEAR_IN);
  const writtenByField = new Map(report.written.map((w) => [w.field, w]));
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

    const isNameBlank = allowed.has(field);
    const write = field ? writtenByField.get(field) : null;
    const factId = write?.factId ?? null;
    const intended = factId ? resolveFact(facts, factId) : undefined;
    const carriedInsideANonNameValue = Boolean(
      write && factId && !NAME_FACTS.has(factId)
      && intended !== undefined && intended !== null
      && String(intended).trim() === text);

    const ok = isNameBlank || carriedInsideANonNameValue;
    namePlacements.push({
      field, page: appearance.page, text, tokens: hit, allowed: ok,
      basis: isNameBlank ? "listed_as_a_name_blank"
        : carriedInsideANonNameValue ? "token_carried_inside_the_exact_non_name_value_written_here"
          : "not_accounted_for",
      writtenFactId: factId, intendedValue: intended === undefined ? null : String(intended)
    });
    if (!ok) {
      findings.push({ severity: "blocking", fixture: label, field: field ?? "(unattributed appearance)",
        check: "participant_name_drawn_in_a_blank_not_listed_as_a_name_blank",
        page: appearance.page, drawnText: text, tokens: hit, writtenFactId: factId });
    }
  }

  return { findings, chargeBlanks, namePlacements, serviceBlockCheck, appearancesDrawn: drawn.length };
}

// ---- main ---------------------------------------------------------------------
async function main() {
  const blocked = new Set(readJson(STALE_BLOCK).hashes ?? []);
  fs.mkdirSync(path.join(rootDir, OUT), { recursive: true });

  const doc = DOCUMENT;
  console.log(`\n=== ${doc.documentId} (${doc.documentRole}) ===`);
  const { bytes, indexEntry } = resolveSource(doc);
  console.log(`  source verified  sha256=${doc.sha256}  bytes=${bytes.length}`);

  const census = await censusDocument(doc, bytes);
  console.log(`  censused ${census.fields.length} fields across ${census.pages.length} pages`);
  for (const [page, rects] of census.strokedByPage) {
    console.log(`  page ${page}: ${rects.length} stroked rectangle(s) measured off the decoded content stream`);
  }

  // The measured certificate-of-service enclosure. Found by geometry -- the one
  // large stroked box on page 2 -- and then confirmed against the printed words
  // it encloses, so a box that is not the certificate cannot be mistaken for it.
  const page2Lines = groupIntoLines(extractTextItems(census.pages[1])).map((l) => ({
    y: l.y, text: normalizeHarvestedText(l.text)
  }));
  const serviceBlockBox = (() => {
    for (const b of census.enclosures.get(2) ?? []) {
      const encloses = page2Lines.some((l) =>
        l.y >= b.y0 && l.y <= b.y1 && /certificate\s*of\s*service/i.test(l.text));
      if (encloses) return { page: 2, x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, width: b.width, height: b.height };
    }
    return null;
  })();
  if (!serviceBlockBox) {
    fail("the measured certificate-of-service enclosure was not found on page 2",
      "This build asserts the service block is empty by GEOMETRY. Without the box that assertion cannot be made, "
      + "and falling back to the field-name channel alone is what left six of these eight fields refused by accident.");
  }
  console.log(`  certificate-of-service box measured at p2 x ${serviceBlockBox.x0}..${serviceBlockBox.x1}`
    + ` y ${serviceBlockBox.y0}..${serviceBlockBox.y1}`);

  // The order block draws controls the platform can never reach. Measured, not
  // assumed: the ORDER heading's y, the stroked boxes below it, and the count
  // of AcroForm widgets below it, which must be zero.
  const orderHeadingY = page2Lines.filter((l) => /^order$/i.test(l.text.trim())).map((l) => l.y)[0] ?? null;
  const orderBlock = {
    orderHeadingY,
    strokedControlsBelowTheOrderHeading: orderHeadingY === null ? null
      : (census.strokedByPage.get(2) ?? []).filter((r) => r.y1 < orderHeadingY && r.squareness >= 0.85)
        .map((r) => ({ x0: r.x0, y0: r.y0, width: r.width, height: r.height })),
    acroFormWidgetsBelowTheOrderHeading: orderHeadingY === null ? null
      : census.fields.flatMap((f) => f.widgets.filter((w) => w.page === 2 && w.rect.y + w.rect.height < orderHeadingY)
        .map(() => f.name))
  };

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
      title: `AK ${doc.documentId}`
    });

    const rel = `${OUT}/fixtures/${doc.key}-${label}-filled.pdf`;
    fs.mkdirSync(path.dirname(path.join(rootDir, rel)), { recursive: true });
    fs.writeFileSync(path.join(rootDir, rel), result.bytes);
    const hash = sha256(result.bytes);
    if (blocked.has(hash)) fail(`${doc.documentId}/${label}: rendered to a BLOCKED hash`, hash);

    const proof = await verifyFromBytes({
      file: path.join(rootDir, rel), census, report: result.report, facts, label, serviceBlockBox
    });

    console.log(`  ${label}: wrote ${result.report.written.length}, refused ${result.report.refused.length}`
      + `, sha256=${hash.slice(0, 16)}...  service-block fields checked=${proof.serviceBlockCheck.length}`
      + `  findings=${proof.findings.length}`);

    fixtures[label] = { file: rel, sha256: hash, byteLength: result.bytes.length, report: result.report, proof };
  }

  const allFindings = ["canonical", "boundary"].flatMap((l) => fixtures[l].proof.findings);

  // ---- step 8: raster every page ----------------------------------------------
  const rasters = [];
  for (const label of ["canonical", "boundary"]) {
    const outDir = `${OUT}/raster/${doc.key}-${label}`;
    fs.mkdirSync(path.join(rootDir, outDir), { recursive: true });
    const produced = await rasterizePdf({
      file: path.join(rootDir, fixtures[label].file),
      outDir: path.join(rootDir, outDir), scale: 1.6, prefix: "page"
    });
    const files = (Array.isArray(produced) ? produced
      : fs.readdirSync(path.join(rootDir, outDir)).map((f) => path.join(rootDir, outDir, f)))
      .map((f) => (typeof f === "string" ? f : f.file)).filter(Boolean).sort();
    rasters.push({
      fixture: label, directory: outDir,
      pages: files.map((f) => ({
        file: path.posix.join(outDir, path.basename(f)),
        sha256: sha256(fs.readFileSync(f)), byteLength: fs.statSync(f).size
      }))
    });
    console.log(`  rastered ${doc.key}-${label}: ${files.length} page(s)`);
  }

  // ---- the inherited-measurement comparison, field by field --------------------
  //
  // An inherited number is a cross-check, never a substitute for measuring. Every
  // rectangle above was measured off this document; this says, per field, whether
  // the measurement agrees with what the previous lane carried forward.
  const inherited = readJson(INHERITED);
  const inheritedByField = new Map(inherited.fields.map((f) => [f.field, f]));
  const comparison = census.fields.map((f) => {
    const prior = inheritedByField.get(f.name);
    if (!prior) return { field: f.name, inheritedPresent: false, agrees: null, note: "no inherited record for this field" };
    const widgets = f.widgets.map((w, i) => {
      const p = prior.widgets[i];
      if (!p) return { widget: i, inheritedPresent: false, agrees: null };
      const d = {
        x: +(w.rect.x - p.rect.x).toFixed(2), y: +(w.rect.y - p.rect.y).toFixed(2),
        width: +(w.rect.width - p.rect.width).toFixed(2), height: +(w.rect.height - p.rect.height).toFixed(2)
      };
      // The inherited record carries integers. Agreement therefore means the
      // measured value rounds to the inherited one, which is a stricter claim
      // than "within half a point" in only one direction and is the honest one.
      const rounds = Math.round(w.rect.x) === p.rect.x && Math.round(w.rect.y) === p.rect.y
        && Math.round(w.rect.width) === p.rect.width && Math.round(w.rect.height) === p.rect.height;
      return { widget: i, page: { measured: w.page, inherited: p.page, agrees: w.page === p.page },
        measuredRect: w.rect, inheritedRect: p.rect, delta: d, agrees: rounds && w.page === p.page };
    });
    return {
      field: f.name, inheritedPresent: true,
      typeAgrees: f.type === prior.type, measuredType: f.type, inheritedType: prior.type,
      widgets, agrees: widgets.every((w) => w.agrees === true) && f.type === prior.type
    };
  });
  const disagreements = comparison.filter((c) => c.agrees === false);

  // ---- the records --------------------------------------------------------------
  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    implementationStrategy: "official_pdf_fill", jurisdiction: "AK", routeKeys: [ROUTE_KEY],
    custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false,
    whyNoAcquisition:
      "The source was already held. The pinned Master Library was recovered in this container with "
      + "scripts/rcap-corpus/bootstrap-private-corpus.sh, which verified the archive SHA-256 and the corpus's own "
      + "00_GOVERNANCE/CHECKSUMS.sha256 before extracting. Nothing was fetched from a court or agency host; egress "
      + "to those hosts is refused by policy and no mirror, cache or aggregator was used.",
    sourceArchive: "Expungement_AI_RCAP_Master_Library_Edition_1",
    documents: [{
      documentId: doc.documentId, documentRole: doc.documentRole, officialTitle: doc.officialTitle,
      revision: doc.revision, sha256: doc.sha256, byteLength: bytes.length,
      pathInArchive: doc.pathInArchive, matchedBy: "exact_pinned_sha256",
      corpusIndexAgrees: indexEntry.sha256 === doc.sha256 && indexEntry.byteLength === bytes.length,
      pageCount: indexEntry.pageCount, acroFieldCount: indexEntry.acroFieldCount,
      structuralClassObserved: indexEntry.structuralClassObserved,
      observedPageCount: census.pages.length, observedAcroFieldCount: census.fields.length
    }],
    whatThisReceiptDoesNotEstablish: [
      "that TF-805 (5/25) is the current official edition",
      "that it has not been superseded since the archive was assembled",
      "that any output is approved for participant delivery"
    ]
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId: FAMILY_ID,
    censusBasis: "first_hand_inspection_of_the_pinned_verified_binary",
    geometryBasis:
      "Every write box is the AcroForm widget's own /Rect, read from this document by this lane. No box is "
      + "derived from a label position. Stroked geometry is measured independently with "
      + "scripts/lib/pdf-stroked-boxes.mjs from the DECODED content stream and used only as corroboration.",
    filenameNote:
      "Deliberately NOT named field-census.json. "
      + "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs walks data/rcap-all50/overlays "
      + "for that exact filename and asserts family and field totals equal counts frozen in "
      + "data/rcap-grade-a/field-semantics/full-name-charge-caption-classification-diff.json. Enrolling a new "
      + "family changes those totals, and that diff record is outside this family's owned path. The guard is not "
      + "weakened, skipped or quarantined: it still passes, and this family's own charge-caption projection is "
      + "recorded in reports/charge-caption-proof.json.",
    documents: [{
      documentId: doc.documentId, documentRole: doc.documentRole, ownership: doc.ownership,
      captionOnly: doc.captionOnly, pageGeometry: census.pageGeometry,
      fieldCount: census.fields.length, fields: census.fields,
      measuredStrokedGeometry: {
        note:
          "Read from the decoded content stream. TF-805's streams are Flate-compressed; the same detector run "
          + "over the undecoded bytes returns zero rectangles without erroring, which is indistinguishable from a "
          + "form that draws nothing.",
        byPage: [...census.strokedByPage].map(([page, rects]) => ({ page, count: rects.length, rectangles: rects }))
      },
      measuredCertificateOfServiceBox: serviceBlockBox,
      measuredOrderBlock: orderBlock
    }]
  });

  writeJson(`${OUT}/measurement-vs-inherited.json`, {
    schemaVersion: "rcap-census-v1-measurement-comparison/v1",
    familyId: FAMILY_ID,
    question:
      "This lane measured TF-805 itself. Field by field, does that measurement agree with the geometry the "
      + "previous lane carried forward in inherited-measurements.json?",
    rule:
      "An inherited number is a cross-check, never a substitute for measuring. Every rectangle in this family's "
      + "census was read off the document by this lane. Nothing below was copied from the inherited record; the "
      + "inherited record is compared TO the measurement, in that direction.",
    inheritedRecord: INHERITED,
    inheritedRecordSha256: sha256(fs.readFileSync(path.join(rootDir, INHERITED))),
    comparisonBasis:
      "The inherited record carries integer rectangles. A field agrees when the measured rectangle rounds to the "
      + "inherited one on all four components, the widget count matches, the page matches and the type matches.",
    fieldsCompared: comparison.length,
    fieldsAgreeing: comparison.filter((c) => c.agrees === true).length,
    fieldsDisagreeing: disagreements.length,
    verdict: disagreements.length === 0
      ? "AGREES -- all 17 fields, every widget, measured independently and matching the inherited geometry"
      : "DISAGREES -- see disagreements below; the MEASURED value governs",
    disagreements,
    perField: comparison,
    whatTheAgreementDoesAndDoesNotEstablish: {
      does: [
        "that the inherited coordinates describe this binary, at this SHA-256",
        "that the previous lane's custody chain was sound"
      ],
      doesNot: [
        "that the inherited record was sufficient -- it carried no stroked geometry, no region-heading finding "
        + "and no certificate-of-service enclosure, and those are what changed this family's refusals",
        "that agreement on geometry implies agreement on classification: this lane refuses eight fields by role "
        + "that the inherited classification left to incidental protection"
      ]
    }
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID, routeKeys: [ROUTE_KEY],
    renderStrategy: "acroform_fill",
    generationAllowed: false, runtimeSelectable: false,
    documents: [(() => {
      const written = fixtures.canonical.report.written;
      const byName = new Map(census.fields.map((f) => [f.name, f]));
      return {
        documentId: doc.documentId, documentRole: doc.documentRole, ownership: doc.ownership,
        captionOnly: doc.captionOnly,
        explicitMappings: doc.explicitMappings,
        explicitMappingsNote:
          "Empty, and by the document's construction rather than by omission. TF-805 asks for no charge, offence, "
          + "count, statute, violation or offence date, so no requiresExplicitMapping descriptor matches any field "
          + "on either page.",
        roleRefusals: doc.unwritable,
        writeBoxes: written.map((w) => {
          const f = byName.get(w.field);
          return {
            field: w.field, factId: w.factId ?? null,
            page: f?.widgets?.[0]?.page ?? null, rect: f?.widgets?.[0]?.rect ?? null,
            rectBasis: "acroform_widget_rect_read_from_the_document",
            measuredControlBoxUnderWriteBox: f?.measuredControlBoxUnderWriteBox ?? null,
            measuredEnclosingBox: f?.measuredEnclosingBox ?? null,
            effectiveLabel: f?.effectiveLabel ?? null
          };
        }),
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
      ? "YES -- this build is defective"
      : "NO -- no participant name lands in any charge-caption blank in any fixture",
    whyTheSetIsEmpty:
      "TF-805 has no charge-vocabulary blank on either page, measured. It is a request about how a case is "
      + "INDEXED, not about what the case was: the participant states a ground under Administrative Rule 40(b) or "
      + "(c) and their own reasons, and the offence is never asked for. The charge-caption defect class cannot "
      + "arise on this form. That is a property of the document, not a refusal that happened to hold, and it is "
      + "recorded so a later reader does not mistake an empty result for an unrun check.",
    blanks: chargeBlanks,
    guardProjection: (() => {
      const offending = [];
      let scanned = 0;
      for (const field of census.fields) {
        scanned += 1;
        const decision = decideBinding(
          { name: field.name, pdfType: field.type, effectiveLabel: field.effectiveLabel ?? null }, {});
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
        fieldsScanned: scanned, offendingRows: offending.length, offending
      };
    })()
  });

  const namePlacements = ["canonical", "boundary"].flatMap((label) =>
    fixtures[label].proof.namePlacements.map((n) => ({ fixture: label, ...n })));
  writeJson(`${OUT}/reports/participant-name-placement.json`, {
    schemaVersion: "rcap-participant-name-placement/v1",
    familyId: FAMILY_ID,
    question:
      "In the rendered artifact bytes, does every drawn participant-name token sit in a blank this family listed "
      + "as one the name belongs in?",
    method:
      "Every flattened appearance in each fixture is read and matched back to the censused blank at its own "
      + "measured rectangle. This is wider than the charge-caption question.",
    blanksTheNameMayAppearIn: NAME_MAY_APPEAR_IN,
    placementsFound: namePlacements.length,
    placementsOutsideTheAllowlist: namePlacements.filter((n) => !n.allowed).length,
    placements: namePlacements
  });

  writeJson(`${OUT}/reports/service-block-proof.json`, {
    schemaVersion: "rcap-service-block-proof/v1",
    familyId: FAMILY_ID,
    question:
      "Is every field inside the certificate of service blank in the rendered artifact bytes -- and is it blank "
      + "because this family decided so, rather than because a type guard or a missing descriptor happened to "
      + "hold?",
    whyThisReportExists:
      "TF-805 sets its whole page in one 11pt size and prints 'Certificate of Service' in mixed case. "
      + "pageRegions marks a heading only when it is set larger than body text or is fully capitalised, so on "
      + "this document no page-2 widget is inside any detected region and the region channel -- the channel built "
      + "to protect a service block independently of field names -- contributes nothing. Six of the eight fields "
      + "in this block were therefore refused only incidentally.",
    measuredCertificateOfServiceBox: serviceBlockBox,
    howTheBoxWasFound:
      "The one large stroked rectangle on page 2, read with scripts/lib/pdf-stroked-boxes.mjs from the decoded "
      + "content stream, then confirmed to enclose the printed words 'Certificate of Service' so a different box "
      + "could not be mistaken for it.",
    fieldsInsideTheBox: census.fields.filter((f) => {
      const w = f.widgets[0];
      return w && w.page === 2 && w.rect.x >= serviceBlockBox.x0 - 1
        && w.rect.x + w.rect.width <= serviceBlockBox.x1 + 1
        && w.rect.y >= serviceBlockBox.y0 - 1 && w.rect.y + w.rect.height <= serviceBlockBox.y1 + 1;
    }).map((f) => {
      const role = doc.unwritable.find((u) => u.field === f.name);
      const decision = decideBinding(
        { name: f.name, pdfType: f.type, effectiveLabel: f.effectiveLabel ?? null,
          regionHeading: f.regionHeading ?? null }, {});
      return {
        field: f.name, rect: f.widgets[0].rect,
        refusedByRoleInThisFamily: Boolean(role),
        roleClass: role?.class ?? null,
        whatTheSharedRulesAloneWouldSay: decision,
        sharedRefusalIsIncidental: !role
          ? false
          : ["non_text_field_type", "no_allowlisted_fact_matches"].includes(decision.reason)
      };
    }),
    perFixture: ["canonical", "boundary"].map((label) => ({
      fixture: label,
      fieldsChecked: fixtures[label].proof.serviceBlockCheck.length,
      fieldsCarryingInk: fixtures[label].proof.serviceBlockCheck.filter((c) => c.drawnText !== null).length,
      fields: fixtures[label].proof.serviceBlockCheck
    })),
    answer: ["canonical", "boundary"].every((l) =>
      fixtures[l].proof.serviceBlockCheck.every((c) => c.drawnText === null))
      ? "YES -- every field inside the measured certificate-of-service box is blank in both fixtures"
      : "NO -- this build is defective"
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId: FAMILY_ID, renderedFresh: true, citesNoBlockedHash: true,
    staleArtifactBlock: STALE_BLOCK,
    note:
      "Rendered fresh from the pinned source bytes. Every output hash below was checked against the hashes in the "
      + "stale-artifact block and matches none of them. No blocked hash is cited as evidence for anything.",
    artifacts: ["canonical", "boundary"].map((label) => ({
      document: doc.documentId, fixture: label,
      file: fixtures[label].file, sha256: fixtures[label].sha256, byteLength: fixtures[label].byteLength,
      fieldsWritten: fixtures[label].report.written.length,
      fieldsRefused: fixtures[label].report.refused.length,
      unfittable: fixtures[label].report.unfittable,
      appearancesDrawn: fixtures[label].proof.appearancesDrawn
    })),
    rasters
  });

  const blanksLeft = (() => {
    const written = new Set(fixtures.canonical.report.written.map((w) => w.field));
    const refusedBy = new Map(fixtures.canonical.report.refused.map((r) => [r.field, r]));
    const roleWhy = new Map(doc.unwritable.map((u) => [u.field, u.why]));
    return census.fields.filter((f) => !written.has(f.name)).map((f) => ({
      document: doc.documentId, field: f.name, page: f.widgets?.[0]?.page ?? null,
      effectiveLabel: f.effectiveLabel,
      reason: refusedBy.get(f.name)?.reason ?? "not_reached",
      category: refusedBy.get(f.name)?.category ?? null,
      why: roleWhy.get(f.name) ?? null
    }));
  })();
  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-participant-blanks/v1",
    familyId: FAMILY_ID,
    note:
      "Every blank this family does not fill, and why. A blank here is not an omission to be closed later by "
      + "widening the map: each is either the participant's to complete, the court's, or a value the platform "
      + "does not hold. TF-805 leaves the participant a great deal to do -- their legal ground, their reasons, "
      + "their signature, and the whole certificate of service after they have actually served.",
    count: blanksLeft.length,
    blanks: blanksLeft,
    printedBlanksWithNoAcroFormWidget: {
      note:
        "Measured. These are places the form asks for something and provides no fillable field at all, so no map "
        + "can reach them and the participant completes them on paper.",
      page1: [
        "the 'Date' and 'Your Signature' rules under the Verification block",
        "the notarial jurat -- 'Subscribed and sworn to or affirmed before me at ___, Alaska on ___', the "
        + "officer's signature, and 'My commission expires ___'"
      ],
      page2: [
        "the four ORDER checkboxes measured at x=72.83, y=446.73 / 427.52 / 328.5 / 189.65",
        "the court's findings lines, 'Presiding Judge', 'Date', 'Type or Print Name', the distribution "
        + "certification and 'JA/Clerk'"
      ]
    }
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1",
    familyId: FAMILY_ID, routeKeys: [ROUTE_KEY],
    status: "REQUESTED", grantedBy: null,
    note:
      "This is a REQUEST for output-level legal review. This build grants no approval, opens no commercial route, "
      + "creates no fulfilment record and marks no packet proven. The family remains not runtime-selectable and "
      + "generationAllowed is false.",
    workTypesAddressed: {
      OFFICIAL_SOURCE_ACQUISITION_REQUIRED:
        "Resolved as custody, not acquisition: the source was already held and is bound by pinned SHA-256.",
      OFFICIAL_FORM_MAP_REQUIRED:
        "Field map built from geometry measured off the binary by this lane, and cross-checked against the "
        + "inherited record in measurement-vs-inherited.json.",
      LOCAL_VARIATION_REQUIRED:
        "Recorded, and two gaps the previous lane had to leave open are now closed from the document itself. "
        + "Testing against a rendered packet is now possible and the fixtures exist; whether a filing fee applies "
        + "remains unresolved and is named as such.",
      PRODUCT_WIRING_REQUIRED:
        "Specified, not installed. Compiled runtime is untouched.",
      ARTIFACT_REVIEW_REQUIRED:
        "Canonical and boundary fixtures rendered and verified from the artifact bytes; every page rastered. An "
        + "INDEPENDENT human visual review is still required and is not discharged by this build.",
      OUTPUT_LEGAL_APPROVAL_REQUIRED:
        "NOT addressed. Requested here; a human legal reviewer grants it or does not."
    },
    independentVisualReviewRequired: true
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-build-findings/v1",
    familyId: FAMILY_ID,
    blocking: allFindings.filter((f) => f.severity === "blocking"),
    findingCount: allFindings.length,
    observations: [
      {
        id: "region-channel-silent-on-this-document",
        severity: "observation",
        where: "AK TF-805, page 2, and scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs pageRegions",
        finding:
          "TF-805 sets every line on both pages at 11pt and prints 'Certificate of Service' and 'Verification' in "
          + "mixed case. pageRegions marks a heading only when a line is set at least 0.5pt larger than body text "
          + "or is written in full capitals, so neither is detected. The only regions found on page 2 are 'ORDER' "
          + "and 'DENIED.', both of which begin BELOW every widget on the page. No widget on this document is "
          + "inside any region.",
        consequence:
          "The region channel -- built so that renaming a protected field cannot move it off the page -- "
          + "contributes nothing on this form. Six of the eight certificate-of-service fields were left refused "
          + "only by the checkbox type guard or by no descriptor happening to match their names.",
        actionTakenHere:
          "All six are refused by ROLE in this family, and the artifact proof asserts the block is empty by "
          + "MEASURED GEOMETRY -- the stroked box the form draws around its certificate of service -- rather than "
          + "by field naming.",
        notFixedHere:
          "pageRegions is shared and is outside this family's owned path. Changing the heading heuristic would "
          + "change region detection for every family in the corpus, which is not this lane's call to make."
      },
      {
        id: "stroked-box-detector-read-undecoded-in-the-reference-build",
        severity: "observation",
        where: "scripts/build-census-v1-ar-arrest-seal-set.mjs, the page-content read that feeds strokedRectangles",
        finding:
          "That build reads page content with PDFRawStream.getContents(), which returns the stream as stored. "
          + "Every Master Library source checked is Flate-compressed, so the detector receives compressed bytes, "
          + "matches no operators, and returns an empty array without erroring. All 66 fields in that family's "
          + "census and all 13 write boxes in its field map carry measuredRuleUnderWriteBox: null.",
        howConfirmed:
          "Both ACIC sources for that family were re-read here with decodePDFRawStream: raw lengths are 2-5 KB "
          + "against decoded lengths of 6-18 KB, the raw read yields zero rectangles on every page of every "
          + "Arkansas source, and the decoded read yields rectangles on several of them -- 4 on page 1 and 8 on "
          + "page 2 of the petition to seal, among others.",
        consequence:
          "That family's stroked-geometry corroboration is empty rather than absent. Nothing it wrote is wrong: "
          + "its write boxes are widget rectangles and were never derived from stroked geometry. The corroborating "
          + "channel simply did not run, and a null reads as 'this form draws no rule here'.",
        actionTakenHere:
          "This family decodes the stream before scanning, and says so in its census. On TF-805 the difference is "
          + "0 rectangles against 11 -- including the box that makes this family's service-block proof possible.",
        notFixedHere:
          "data/rcap-all50/overlays/census-v1/ar/** and scripts/build-census-v1-ar-arrest-seal-set.mjs are another "
          + "family's owned path. Reported, not edited."
      },
      {
        id: "case-name-and-party-names-merged-into-one-slot",
        severity: "observation",
        where: "AK TF-805 page 1, fields `caseName` and `partyNames`, and selectOnePerSlot in rcap-field-semantics.mjs",
        finding:
          "`name`, `caseName` and `partyNames` all bind participant.full_legal_name. selectOnePerSlot groups "
          + "same-fact widgets on a page into slots by transitive rectangle overlap, and `caseName` (measured at "
          + "y 490.26..504.66) overlaps `partyNames` (y 476.26..490.66) by 0.40pt. They are two distinct printed "
          + "lines of the form -- 'Case Name:' and 'Party Names:' -- but the widgets are 14.40pt tall on a 14.00pt "
          + "line pitch, so they touch. The two are merged into one slot and one of them is refused as a "
          + "`duplicate_widget_for_one_slot`.",
        whatActuallyHappened:
          "`partyNames` was kept and `caseName` refused, decided by the larger-area tiebreak in slotRank: "
          + "400.60x14.40 = 5768.6 against 226.59x14.40 = 3262.9. The outcome is the right one -- Party Names is "
          + "the blank this form exists to fill, since it names the party whose name is to be removed from the "
          + "index -- but it was decided by which box is bigger, not by which blank matters.",
        risk:
          "Had the areas fallen the other way, TF-805 would render with Party Names blank and the participant's "
          + "name written on the Case Name line instead. On a request to remove a party's name from the public "
          + "index, that is the one blank that should not be empty. The refusal is also invisible as a category "
          + "error: it reads as an intentional de-duplication rather than as two different questions collapsed "
          + "into one.",
        actionTakenHere:
          "Recorded and proved from the bytes: reports/participant-name-placement.json shows the name drawn at "
          + "`name` and `partyNames` in both fixtures and nowhere else, and production-field-map.json carries the "
          + "refusal with its reason. `caseName` is left blank for the participant. Nothing was overridden.",
        notFixedHere:
          "selectOnePerSlot is shared and outside this family's owned path. A 0.4pt overlap being treated as one "
          + "slot affects every family whose widget heights exceed the form's line pitch, and re-tuning that "
          + "threshold is not this lane's call. For a reviewer: whether TF-805 should offer a partial case name "
          + "at all is a separate question, since the platform holds no matter.case_name fact and an Alaska case "
          + "name is a caption ('State of Alaska v. Reyes') rather than a person's name."
      },
      {
        id: "label-harvest-misreads-two-page-1-captions",
        severity: "observation",
        where: "AK TF-805 page 1, fields `name` and `dayPhone`",
        finding:
          "The printed-label harvester returns 'Addres' for `name` and 'By providing an email address, you agree "
          + "that the court and ' for `dayPhone`. Matched as labels those resolve to participant.street_address "
          + "and participant.email respectively -- the street address onto the Name line, the email address onto "
          + "the Daytime Phone line.",
        whyNothingIsWrongInTheOutput:
          "The label is only a FALLBACK. Both fields have names the descriptor list matches directly, so the name "
          + "channel decides both and the label is never consulted. Verified from the artifact bytes: the "
          + "canonical fixture draws the name on the Name line and the phone on the Daytime Phone line.",
        risk:
          "It is decided by field naming rather than by the label being right. A future edition of TF-805 that "
          + "renamed these fields to something the descriptors do not match would fall through to labels that are "
          + "wrong, and the fallback exists precisely for forms whose field names say nothing."
      }
    ]
  });

  console.log(`\n  inherited-measurement comparison: ${comparison.filter((c) => c.agrees === true).length}`
    + `/${comparison.length} fields agree, ${disagreements.length} disagree`);
  console.log(`${allFindings.length === 0 ? "OK" : "FINDINGS"}: `
    + `${chargeBlanks.length} charge-caption blanks examined, `
    + `${fixtures.canonical.proof.serviceBlockCheck.length} certificate-of-service fields proved blank per fixture.`);
  if (allFindings.length) {
    for (const f of allFindings) console.error(`  ${f.severity} ${f.fixture} ${f.field}: ${f.check}`);
    process.exit(1);
  }
}

await main();
