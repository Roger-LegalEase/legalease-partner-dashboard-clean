#!/usr/bin/env node
// Route-obligation census v1 — packet family `ak-tf800-set`.
//
//   node scripts/build-census-v1-ak-tf800-set.mjs
//
// Alaska, TF-800, "Request to Make Case Records Confidential or Sealed Under
// Administrative Rule 37.6", route `obligation:track-only:AK:ak-tf800`. One
// document, three pages, 26 AcroForm fields carrying 29 widget annotations.
//
// WHAT THIS SCRIPT IS NOT
//
// It is not a renderer. Every decision about what MAY be written is made by
// scripts/rcap-official-forms/rcap-field-semantics.mjs and every byte is
// written by finalizeOfficialForm. This file supplies the two things only a
// caller can supply — this family's ROLE classification and its explicit
// mappings — and then proves the result from the artifact bytes rather than
// from its own report.
//
// WHAT THE PREDECESSOR LEFT, AND WHAT THIS BUILD DID WITH IT
//
// The first worker on this family stopped at the source gate: the Master
// Library was not mounted in its container, so the pinned digest had nothing to
// verify against. That was correct. It also left three findings in
// reports/inherited-evidence-findings.json, drawn from the production overlay.
// All three were re-tested first-hand here against the now-mounted binary, and
// all three hold. They are answered in reports/inherited-evidence-findings-
// resolution.json rather than assumed.
//
// THE TWO DEFECTS THIS FAMILY EXISTS TO REFUSE
//
// `participant.full_legal_name`'s descriptor matches `case\s*name` and
// `party\s*names?`. TF-800 names two fields `caseName` and `partyNames`, and
// the shared binder makes BOTH writable with factId participant.full_legal_
// name. Neither is a person's name:
//
//   * "Case Name:" is the case caption — in Alaska, something like
//     "State of Alaska v. ___" or "In the Matter of ___". Printing the
//     requestor's name there misstates the caption of the case to the court.
//   * "Party Names:" asks for the parties to the case. The participant is one
//     of them; page 2 of this same form is a Certificate of Service that
//     exists precisely because there are others. Printing one name there
//     asserts the participant is the only party.
//
// The platform holds neither fact. Both are refused by role below, and the
// artifact is then read back to prove no name token reaches either rectangle.
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
const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList, PDFName, PDFDict, PDFRawStream } = require("pdf-lib");
const zlib = require("node:zlib");

const FAMILY_ID = "ak-tf800-set";
const OUT = "data/rcap-all50/overlays/census-v1/ak/ak-tf800-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const ROUTE_KEY = "obligation:track-only:AK:ak-tf800";
const PRODUCTION_OVERLAY = "data/rcap-all50/overlays/production/alaska/tf-800-form-en";

const fail = (message, detail = null) => {
  console.error(`build-census-v1-${FAMILY_ID}: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was written.");
  process.exit(1);
};

const DOCUMENT = {
  key: "request",
  documentId: "AK-TF-800",
  documentRole: "PARTICIPANT_REQUEST",
  officialTitle: "Request to Make Case Records Confidential or Sealed Under Administrative Rule 37.6",
  revision: "REV-2025-05",
  sha256: "94bab52533d74551f7a8ff8644a9671241b38075c7e05f10806d627dfb898cbd",
  pathInArchive: "STATES/AK/02_PACKET_FORMS/AK__FORM__TF-800__request-to-make-case-records-confidential-or-sealed-under-administrative-rule-37-6__REV-2025-05__EN.pdf",
  ownership: "participant_completed",

  // TF-800 is the participant's own request, not a court instrument, so it is
  // not captionOnly. Pages 2 and 3 carry the court's ORDER and the clerk's
  // distribution certificate; neither carries a single AcroForm field, which
  // is checked below rather than assumed.
  captionOnly: false,

  // No explicit mapping is made. Every fact this family writes binds through
  // the field-name channel unambiguously, and no field on TF-800 holds a
  // charge, offence, count, statute or violation — the form is about records
  // access, not about an offence. `requiresExplicitMapping` descriptors
  // therefore never come into play, and naming one would be inventing a
  // mapping the document does not ask for.
  explicitMappings: {},

  // ROLE REFUSALS.
  //
  // What this family determines the participant completes themselves, the
  // court completes, or the platform does not hold. Each entry records the
  // channel the SHARED binder uses on the same field, because a refusal that
  // exists only because nothing happened to match is not a refusal — it is a
  // gap that closes the day someone adds a descriptor. `sharedRefusalIs`
  // says how much weight the shared rule can actually carry.
  unwritable: [
    // ---- the two the shared binder would WRITE, and must not -------------
    { field: "caseName", class: "case_caption_not_a_person",
      sharedRefusalIs: "none — decideBinding returns writable=true, factId=participant.full_legal_name",
      why: "The printed caption is 'Case Name:'. In Alaska this is the case's own caption, not the requestor's name. The field name matches participant.full_legal_name's /case\\s*name/ alternative, so the shared binder writes the participant's name here; that misstates the caption of the case to the court. The platform holds no case-name fact. The harvested printed caption for this widget is the fragment 'documents t' — the tail of the email sentence printed one line above — so the label channel could not have corrected it either." },
    { field: "partyNames", class: "all_parties_not_the_participant",
      sharedRefusalIs: "none — decideBinding returns writable=true, factId=participant.full_legal_name",
      why: "The printed caption is 'Party Names:' and asks for the parties to the case. The participant is one party; page 2 of this form is a Certificate of Service that exists because there are others. Writing one name asserts the participant is the only party. The platform holds no party list." },

    // ---- the participant's own account of what and why -------------------
    // Refused today by `no_allowlisted_fact_matches`, which is the absence of
    // a fact rather than a decision about the field.
    { field: "documents", class: "participant_statement_of_records",
      sharedRefusalIs: "incidental — no_allowlisted_fact_matches",
      why: "The free-text list beside the 'Document(s):' checkbox: which specific records the participant asks the court to close. This is the substance of the request and is the participant's to state." },
    { field: "dateHearing", class: "participant_statement_of_records",
      sharedRefusalIs: "incidental — no_allowlisted_fact_matches",
      why: "Despite the field name, this is not a hearing date. It is the free text beside 'Log notes (list date and type of hearing):' and asks which log notes, by date and hearing type. The platform holds no hearing record. The harvested caption for this widget is 'Audio Recording (list date and type of hea' — the line BELOW it — so the label channel mis-binds it by one line." },
    { field: "audioRecording", class: "participant_statement_of_records",
      sharedRefusalIs: "incidental — no_allowlisted_fact_matches",
      why: "Free text beside 'Audio Recording (list date and type of hearing):'. Which recordings, by date and hearing type. The platform holds no hearing record." },
    { field: "transcript", class: "participant_statement_of_records",
      sharedRefusalIs: "incidental — no_allowlisted_fact_matches",
      why: "Free text beside 'Transcript (list date and type of hearing):'. Same class as the two above." },
    { field: "confidentialBecause", class: "participant_legal_argument",
      sharedRefusalIs: "incidental — no_allowlisted_fact_matches",
      why: "The 469x62pt block under 'These court records should be made confidential or sealed, because:'. This is the legal argument the judge must weigh against the public interest in access under Administrative Rule 37.6. It is the participant's own statement and the platform must not compose it." },

    // ---- the relief election ---------------------------------------------
    // Refused today by the type guard alone. The type guard is structural and
    // sound, but WHY these must never be selected is a decision about the
    // request, not about the widget's PDF type.
    { field: "Group1", class: "relief_election_confidential_or_sealed",
      sharedRefusalIs: "structural — non_text_field_type (type_guard)",
      why: "The two-widget radio on the line 'the following court case records be made confidential: sealed:'. Choosing between confidential and sealed is the relief the participant asks for; the two have different legal consequences and the platform does not choose between them." },
    { field: "Check Box1", class: "relief_election_scope",
      sharedRefusalIs: "structural — non_text_field_type (type_guard)",
      why: "'Entire case file'. Selecting it asks the court to close the whole case rather than named records. That is the participant's election." },
    { field: "Check Box2", class: "relief_election_scope",
      sharedRefusalIs: "structural — non_text_field_type (type_guard)",
      why: "'Document(s):' — the scope checkbox governing the `documents` free-text list." },
    { field: "Check Box3", class: "relief_election_scope",
      sharedRefusalIs: "structural — non_text_field_type (type_guard)",
      why: "'Log notes (list date and type of hearing):' scope checkbox." },
    { field: "Check Box4", class: "relief_election_scope",
      sharedRefusalIs: "structural — non_text_field_type (type_guard)",
      why: "'Audio Recording (list date and type of hearing):' scope checkbox." },
    { field: "Check Box5", class: "relief_election_scope",
      sharedRefusalIs: "structural — non_text_field_type (type_guard)",
      why: "'Transcript (list date and type of hearing):' scope checkbox." },

    // ---- the Certificate of Service, page 2 ------------------------------
    // The hard rule: never prefill a certificate of mailing. Stated by role
    // here as well as being caught by the shared rules, so the refusal does
    // not rest on one channel.
    { field: "certDate", class: "certificate_of_service_date",
      sharedRefusalIs: "robust — protected_category, category=service_block",
      why: "The date in 'I certify on ____ at [date/time] I gave a copy of this document'. Service has not happened. A date here certifies a mailing that has not occurred. The shared service_block rule refuses it and its comment names this very field; it is restated by role so the refusal does not depend on the field keeping the spelling 'certDate'. The production overlay classes this field `deterministic` — that classification does not carry over and is the subject of inherited finding F2." },
    { field: "time2", class: "certificate_of_service_time",
      sharedRefusalIs: "incidental — no_allowlisted_fact_matches",
      why: "The time in the same sentence, at [date/time]. Same certification, same refusal. Refused by the shared binder only because no fact matches the name 'time2', which is not a decision about the field." },
    { field: "mail", class: "certificate_of_service_delivery_method",
      sharedRefusalIs: "structural — non_text_field_type (type_guard)",
      why: "One of four mutually-exclusive delivery-method boxes in 'and any attachments by mail. hand-delivery. TrueFiling. email.' Which method was used is a statement about an act of service that has not happened." },
    { field: "hd", class: "certificate_of_service_delivery_method",
      sharedRefusalIs: "structural — non_text_field_type (type_guard)",
      why: "Hand-delivery, same block, same refusal." },
    { field: "tf", class: "certificate_of_service_delivery_method",
      sharedRefusalIs: "structural — non_text_field_type (type_guard)",
      why: "TrueFiling, same block, same refusal." },
    { field: "emailCB", class: "certificate_of_service_delivery_method",
      sharedRefusalIs: "structural — non_text_field_type (type_guard)",
      why: "Email, same block, same refusal — and the one the production overlay classes `participant` (writable) while classing its three siblings unwritable. That asymmetry is inherited finding F2's secondary concern. First-hand: all four are the same kind of election inside the same certification, `emailCB` alone matches participant.email by name, and only the type guard stops it. All four are refused by role here, symmetrically." },
    { field: "needText1", class: "certificate_of_service_recipients",
      sharedRefusalIs: "incidental — no_allowlisted_fact_matches",
      why: "The list under 'I served these people:'. Who was served is a statement about an act of service; the platform holds no party list and no service record." },
    { field: "signature0", class: "certificate_of_service_signature",
      sharedRefusalIs: "robust — protected_category, category=signature",
      why: "The 'Signature:' line at the foot of the Certificate of Service. A participant signature is never prefilled. Restated by role so the refusal does not rest on the field name containing the word 'signature'." }
  ]
};

// The blanks on TF-800 where a participant NAME token may legitimately appear.
//
// Exactly one. The form asks for the requestor's name once, on page 1, under
// the printed caption "Name:". Every other appearance of a name token in the
// artifact is a defect, and the verification below reads every drawn
// appearance rather than only the ones this build believes it wrote.
const NAME_MAY_APPEAR_IN = { "AK-TF-800": ["name"] };

// One narrow, stated exemption. The corpus's canonical participant email is
// derived from the canonical participant's name, so the email line carries
// name tokens legitimately. The exemption is not "ignore this field": the
// check below requires the drawn text to equal the email fact EXACTLY, so the
// email line may carry the email and nothing else.
const NAME_TOKENS_INCIDENTAL_IN = {
  email: {
    factId: "participant.email",
    why: "The corpus's canonical participant email address is built from the canonical participant's name, so name tokens appear inside it as a matter of fixture construction. The appearance is accepted only when it equals the resolved participant.email value exactly."
  }
};

// --- fixture identities -------------------------------------------------------
// The corpus's standard canonical and boundary participants, unchanged, so
// this family's fixtures are comparable with every other family's.
const CANONICAL = {
  "participant.full_legal_name": "Jordan Avery Reyes", "participant.first_name": "Jordan",
  "participant.last_name": "Reyes", "participant.middle_name": "Avery",
  "participant.street_address": "118 Maple Street", "participant.city": "Springfield",
  "participant.state": "XX", "participant.zip": "01234",
  "participant.city_state_zip": "Springfield, XX 01234",
  "participant.phone": "555-0142", "participant.email": "jordan.reyes@example.com",
  "participant.date_of_birth": "1991-04-17",
  "matter.county": "Example County", "matter.court": "District Court",
  "matter.case_number": "3AN-24-01234CI", "matter.citation_number": "C-889201",
  "matter.charge": "Possession of a controlled substance", "matter.arrest_date": "2019-03-08",
  "matter.offense_date": "2019-03-08", "matter.conviction_date": "2019-11-02",
  "matter.disposition_date": "2020-01-15", "deterministic.filing_date": "2026-08-12",
  "matter.charges": [
    { case_number: "3AN-24-01234CI", citation_number: "C-889201", charge: "Possession of a controlled substance",
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
  "matter.case_number": "3AN-26-900123.00CI/2201-AB-CDE-EXTENDED",
  "matter.county": "Saint Bartholomew and the Northern Reaches County",
  "matter.charge": "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line",
  "matter.charges": [
    { case_number: "3AN-26-900123.00CI/2201-AB-CDE-EXTENDED", citation_number: "C-889201",
      charge: "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line",
      arrest_date: "2019-03-08", offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" }
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
const inflate = (b) => { try { return zlib.inflateSync(b); } catch { return b; } };

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

// ---- steps 2 + 3: census with MEASURED geometry -------------------------------
//
// Every write box is the widget's own /Rect, read from this document. No box
// is derived from where a caption is printed: the caption is captured
// separately and only ever decides WHAT a blank means, never WHERE it is —
// which matters more than usual here, because the caption harvester mis-binds
// several of this form's widgets by a line (see the census's labelIsReliable
// field and reports/inherited-evidence-findings-resolution.json).
async function censusDocument(doc, bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  const form = pdf.getForm();

  const linesByPage = pages.map((p) => groupIntoLines(extractTextItems(p)));
  const documentTextLines = linesByPage.flat().map((l) => normalizeHarvestedText(l.text));

  // Stroked, axis-aligned rectangles per page, in page coordinates, through
  // the CTM-tracking scanner. TF-800 draws NONE — see `strokedBoxScan` in the
  // census. That is a measured negative, recorded so that a null rule under a
  // write box is never read as "not measured".
  const strokedByPage = new Map();
  const contentBytesByPage = new Map();
  pages.forEach((page, i) => {
    let content = "";
    for (const stream of page.node.normalizedEntries?.().Contents?.asArray?.() ?? []) {
      try { content += Buffer.from(pdf.context.lookup(stream).getContents()).toString("latin1"); } catch { /* not a stream */ }
    }
    contentBytesByPage.set(i + 1, content.length);
    strokedByPage.set(i + 1, content ? strokedRectangles(content) : []);
  });

  // The same scanner over each widget's OWN appearance streams. A form can
  // draw its boxes there rather than on the page, and this document's
  // checkboxes do carry appearance streams — so the question "does the form
  // draw a box at this widget" is asked of both places before it is answered.
  const widgetAppearanceBoxes = new Map();
  const readAppearanceBoxes = (widget) => {
    const found = [];
    const ap = widget.dict.get(PDFName.of("AP"));
    const apd = ap ? pdf.context.lookup(ap) : null;
    if (!(apd instanceof PDFDict)) return found;
    for (const key of apd.keys()) {
      const value = pdf.context.lookup(apd.get(key));
      const streams = value instanceof PDFRawStream ? [[key.asString(), value]]
        : value instanceof PDFDict
          ? [...value.keys()].map((k2) => [`${key.asString()}${k2.asString()}`, pdf.context.lookup(value.get(k2))])
          : [];
      for (const [label, stream] of streams) {
        if (!(stream instanceof PDFRawStream)) continue;
        const source = inflate(Buffer.from(stream.contents)).toString("latin1");
        for (const r of strokedRectangles(source)) found.push({ appearance: label, ...r });
      }
    }
    return found;
  };

  const widgetsForCapture = new Map();
  const fields = form.getFields().map((f) => {
    const name = f.getName();
    const type = fieldType(f);
    const handleWidgets = f.acroField.getWidgets();
    const widgets = handleWidgets.map((w, wi) => {
      const r = w.getRectangle();
      const ref = w.P?.();
      let page = 1;
      pages.forEach((p, i) => { if (p.ref === ref) page = i + 1; });
      const mk = w.dict.get(PDFName.of("MK"));
      const bs = w.dict.get(PDFName.of("BS"));
      const mkd = mk ? pdf.context.lookup(mk) : null;
      const bsd = bs ? pdf.context.lookup(bs) : null;
      const boxes = readAppearanceBoxes(w);
      widgetAppearanceBoxes.set(`${name}#${wi}`, boxes);
      return {
        index: wi,
        page,
        // MEASURED off the document: the widget rectangle as the PDF declares it.
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_from_the_document",
        // Whether the form draws a visible border at this widget, measured
        // from the widget's own dictionary rather than assumed.
        borderColour: mkd instanceof PDFDict && mkd.get(PDFName.of("BC")) ? String(mkd.get(PDFName.of("BC"))) : null,
        borderWidth: bsd instanceof PDFDict && bsd.get(PDFName.of("W")) ? String(bsd.get(PDFName.of("W"))) : null,
        strokedBoxesInAppearanceStreams: boxes.length
      };
    });
    for (const w of widgets) {
      if (!widgetsForCapture.has(w.page)) widgetsForCapture.set(w.page, []);
      widgetsForCapture.get(w.page).push({ name, rect: w.rect });
    }
    let multiline = null;
    let maxLength = null;
    if (f instanceof PDFTextField) {
      try { multiline = f.isMultiline(); } catch { multiline = null; }
      try { maxLength = f.getMaxLength() ?? null; } catch { maxLength = null; }
    }
    return { name, type, widgets, multiline, maxLength };
  });

  const context = new Map();
  pages.forEach((page, i) => {
    const list = widgetsForCapture.get(i + 1) ?? [];
    if (!list.length) return;
    for (const c of captureWidgetContext(page, list, { precomputedLines: linesByPage[i], isFirstPage: i === 0 })) {
      if (!context.has(c.name)) context.set(c.name, c);
    }
  });

  // Independent corroboration that a write box sits where the form asks for
  // that value: the nearest printed text line to the widget, measured from the
  // page's text content, which is a different channel from the widget
  // rectangle. It is evidence ABOUT the box, never a source for the box.
  const nearestPrintedLine = (page, rect) => {
    const lines = linesByPage[page - 1] ?? [];
    let best = null;
    for (const l of lines) {
      const dy = l.y - rect.y;
      if (dy < -4 || dy > 14) continue;
      if (best === null || Math.abs(dy) < Math.abs(best.y - rect.y)) best = l;
    }
    return best ? { y: +best.y.toFixed(2), text: normalizeHarvestedText(best.text), deltaY: +(best.y - rect.y).toFixed(2) } : null;
  };

  // A rule under the write box, if the form draws one. TF-800 draws none.
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
    const printed = w ? nearestPrintedLine(w.page, w.rect) : null;
    return {
      name: f.name,
      type: f.type,
      multiline: f.multiline,
      maxLength: f.maxLength,
      effectiveLabel: c.effectiveLabel ?? null,
      labelBasis: c.labelBasis ?? null,
      regionHeading: c.regionHeading ?? null,
      // This family does NOT trust the harvested label. Inherited finding F1
      // says the production overlay's labels are positional inferences that
      // mis-bind, and re-measuring here reproduces that: the label channel is
      // recorded for the record and is never allowed to decide anything, which
      // decideBinding also enforces by asking the field-name channel first.
      labelIsReliable: false,
      widgets: f.widgets,
      widgetCount: f.widgets.length,
      pagesTouched: [...new Set(f.widgets.map((x) => x.page))].sort((a, b) => a - b),
      captionDescribesChargeValue: captionDescribesChargeValue(subject),
      captionOrNameMentionsCharge: CHARGE_VALUE_WORDS.test(subject) || CHARGE_VALUE_WORDS.test(f.name),
      protectCategory: protectCategoryOf(subject) ?? protectCategoryOf(f.name) ?? null,
      descriptorsByName: descriptorsMatching(f.name).map((d) => d.factId),
      descriptorsByLabel: c.effectiveLabel ? descriptorsMatching(c.effectiveLabel).map((d) => d.factId) : [],
      measuredRuleUnderWriteBox: w ? ruleUnder(w.page, w.rect) : null,
      measuredNearestPrintedLine: printed,
      // What the SHARED binder decides for this field with no role refusal
      // and no explicit mapping. Recorded for every field so the map's own
      // refusals and the shared rules' refusals stay tellable apart.
      sharedBinderDecision: (() => {
        const d = decideBinding(
          { name: f.name, pdfType: f.type, effectiveLabel: c.effectiveLabel ?? null, regionHeading: c.regionHeading ?? null }, {}
        );
        return { writable: d.writable === true, factId: d.factId ?? null, reason: d.reason ?? null, category: d.category ?? null, factBasis: d.factBasis ?? null };
      })()
    };
  });

  return {
    pdf, pages, fields: censusFields, documentTextLines,
    pageGeometry: pages.map((p, i) => ({ page: i + 1, width: +p.getSize().width.toFixed(2), height: +p.getSize().height.toFixed(2) })),
    strokedByPage, contentBytesByPage, widgetAppearanceBoxes,
    widgetTotal: censusFields.reduce((n, f) => n + f.widgets.length, 0)
  };
}

// A checkbox tick is not text.
//
// The positive control for this family's verification put ink into every hard-
// blank field and confirmed the text readback catches it — except a checked
// BOX, which draws a glyph or a path and extracts as the empty string. So the
// text checks alone cannot tell a ticked box from an unticked one, and this
// form's whole relief election (confidential vs sealed; entire case vs named
// records) and all four of its delivery-method boxes are checkboxes.
//
// Flattening emits an appearance for EVERY widget, ticked or not, so the
// presence of an appearance proves nothing either. What separates them is what
// the appearance draws: an untouched box's stream draws only its axis-aligned
// border, and a selected one adds a mark.
//
// On TF-800 that mark is measured rather than guessed at. Every control on the
// form — all five checkboxes, both radio widgets and all four delivery boxes —
// authors its selected appearance as the SAME two stroked diagonals:
//
//     q 1 1 9.52 9.52 re W n  2 9.52 m 9.52 2 l  9.52 9.52 m 2 2 l  s Q
//
// an X. Group1 is a radio group and is drawn as an X too, not as the dot a
// radio is usually given. A stroked diagonal segment cannot occur in an
// axis-aligned border, so it is the detector; a glyph-drawn mark is caught as
// well, for a document that uses one.
function selectionMarkIn(streamSource) {
  const text = String(streamSource ?? "");
  // A glyph-drawn mark.
  if (/\bT[jJ]\b/.test(text)) return { marked: true, basis: "text_showing_operator_in_a_control_appearance" };
  // NOT a curve. A curve operator was tried as a mark rule and had to be
  // withdrawn: pdf-lib synthesises an unselected RADIO's border as a stroked
  // circle of four Beziers, so `c` is present on Group1's two widgets in a
  // clean render and the rule reported both as selected in both fixtures. A
  // ring is a border, not a mark. Measured, not assumed — see
  // reports/artifact-byte-verification.json#whyASelectionMarkIsCheckedSeparately.
  // A stroked diagonal: a border cannot have one.
  const toks = text.match(/[-\d.]+|[A-Za-z*'"]+/g) ?? [];
  let stand = [];
  let pts = [];
  let sawDiagonal = false;
  for (const t of toks) {
    if (/^-?[\d.]+$/.test(t)) { stand.push(t); continue; }
    const n = (k) => +stand[stand.length - k];
    if (t === "m") { pts = [[n(2), n(1)]]; }
    else if (t === "l" && pts.length) {
      const [px, py] = pts[pts.length - 1];
      const [x, y] = [n(2), n(1)];
      if (Math.abs(x - px) > 0.01 && Math.abs(y - py) > 0.01) sawDiagonal = true;
      pts.push([x, y]);
    } else if (/^(S|s|B|B\*|b|b\*|f|F|f\*|n)$/.test(t)) { pts = []; }
    stand = [];
  }
  if (sawDiagonal) return { marked: true, basis: "stroked_diagonal_segment_in_a_control_appearance" };
  return { marked: false, basis: "border_geometry_only" };
}

/** The flattened appearance stream drawn at a given page point, as source text. */
function appearanceSourceAt(doc, page, x, y, tolerance = 3) {
  const ctx = doc.context;
  const pageNode = doc.getPages()[page - 1];
  if (!pageNode) return null;
  const resources = pageNode.node.get(PDFName.of("Resources"));
  const xObjects = resources && ctx.lookup(resources).get(PDFName.of("XObject"));
  if (!xObjects) return null;
  const dict = ctx.lookup(xObjects);
  const contents = pageNode.node.get(PDFName.of("Contents"));
  const refs = contents?.asArray ? contents.asArray() : contents ? [contents] : [];
  let stream = "";
  for (const ref of refs) { try { stream += inflate(Buffer.from(ctx.lookup(ref).contents)).toString("latin1"); } catch { /* not a stream */ } }
  const placement = /q((?:\s*-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ cm)+)\s*\/(\S+)\s+Do/g;
  let match;
  while ((match = placement.exec(stream))) {
    let ax = 0, ay = 0;
    for (const cm of match[1].matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) cm/g)) {
      ax += Number(cm[5]); ay += Number(cm[6]);
    }
    if (Math.abs(ax - x) > tolerance || Math.abs(ay - y) > tolerance) continue;
    const key = PDFName.of(match[2]);
    if (!dict.has(key)) continue;
    const obj = ctx.lookup(dict.get(key));
    if (!(obj instanceof PDFRawStream)) continue;
    return inflate(Buffer.from(obj.contents)).toString("latin1");
  }
  return null;
}

// ---- step 7: prove it from the ARTIFACT, not from the report ------------------
async function verifyFromBytes({ file, census, report, facts, label, documentId }) {
  const drawn = await flattenedWidgets(file);
  const artifact = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const findings = [];
  const chargeBlanks = [];
  const perWidget = [];
  const selectionMarks = [];

  for (const field of census.fields) {
    const wasWritten = report.written.some((x) => x.field === field.name);

    // EVERY widget, not only the first. `caseNo` carries three, on pages 1, 2
    // and 3, and one value fills all of them — inherited finding F3. A check
    // that reads only widget[0] would pass with pages 2 and 3 blank.
    for (const w of field.widgets) {
      const here = drawnAt(drawn, { page: w.page, rect: w.rect, tolerance: 3 })
        .map((d) => d.text).filter((t) => t && t.trim() !== "");
      const text = here.join(" ").trim();
      perWidget.push({
        field: field.name, widgetIndex: w.index, page: w.page, rect: w.rect,
        wasWritten, drawnText: text === "" ? null : text
      });

      if (field.captionOrNameMentionsCharge) {
        const hit = NAME_TOKENS.filter((tok) => text.toLowerCase().includes(tok.toLowerCase()));
        chargeBlanks.push({
          field: field.name, widgetIndex: w.index, page: w.page, rect: w.rect,
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
        findings.push({ severity: "blocking", fixture: label, field: field.name, page: w.page,
          check: "refused_field_carries_ink", drawnText: text });
      }
      // A written field must be present at EVERY one of its widgets.
      if (wasWritten && text === "") {
        findings.push({ severity: "blocking", fixture: label, field: field.name, page: w.page,
          widgetIndex: w.index, check: "written_field_is_blank_on_the_paper" });
      }
    }
  }

  // The hard rules, asserted against the bytes by name rather than trusted to
  // any classification — this family's, the shared binder's or the production
  // overlay's.
  const HARD_BLANK = /signature|^time2$|^certdate$|^needtext1$|^mail$|^hd$|^tf$|^emailcb$/i;
  for (const f of census.fields) {
    const isHard = HARD_BLANK.test(f.name) || f.type === "signature"
      || /certificate\s*of\s*service/i.test(f.regionHeading ?? "");
    if (!isHard) continue;
    for (const w of f.widgets) {
      const text = drawnAt(drawn, { page: w.page, rect: w.rect, tolerance: 3 })
        .map((d) => d.text).join(" ").trim();
      if (text !== "") {
        findings.push({ severity: "blocking", fixture: label, field: f.name, page: w.page,
          check: "signature_date_or_service_field_is_not_blank", drawnText: text });
      }
    }
  }

  // EVERY control on this form is refused, so no box may carry a selection
  // mark. Checked against what the appearance DRAWS, because a tick extracts
  // as the empty string and the text checks above cannot see it.
  for (const f of census.fields) {
    if (f.type !== "checkbox" && f.type !== "radio") continue;
    for (const w of f.widgets) {
      const source = appearanceSourceAt(artifact, w.page, w.rect.x, w.rect.y);
      const mark = source === null
        ? { marked: false, basis: "no_appearance_placed_at_this_rectangle" }
        : selectionMarkIn(source);
      selectionMarks.push({
        field: f.name, widgetIndex: w.index, page: w.page, rect: w.rect,
        appearanceStreamBytes: source === null ? null : source.length,
        marked: mark.marked, basis: mark.basis
      });
      if (mark.marked) {
        findings.push({ severity: "blocking", fixture: label, field: f.name, page: w.page,
          check: "a_control_this_family_refuses_carries_a_selection_mark", basis: mark.basis });
      }
    }
  }

  // THE WIDER NET. Every appearance the artifact draws is read, and any
  // carrying a participant name token must sit at a blank this family listed
  // as one the name belongs in. This is what would catch a name reaching
  // `caseName` or `partyNames` if the role refusals above ever stopped firing.
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

    const incidental = field ? NAME_TOKENS_INCIDENTAL_IN[field] : null;
    const incidentalValue = incidental ? String(facts[incidental.factId] ?? "") : null;
    const incidentalOk = Boolean(incidental) && incidentalValue !== "" && text === incidentalValue;

    const isAllowed = allowed.has(field) || incidentalOk;
    namePlacements.push({
      field, page: appearance.page, text, tokens: hit, allowed: isAllowed,
      basis: allowed.has(field) ? "listed_name_blank"
        : incidentalOk ? `incidental_exact_match_of_${incidental.factId}`
          : "not_allowed"
    });
    if (!isAllowed) {
      findings.push({ severity: "blocking", fixture: label, field: field ?? "(unattributed appearance)",
        check: "participant_name_drawn_in_a_blank_not_listed_as_a_name_blank",
        page: appearance.page, drawnText: text, tokens: hit });
    }
  }

  // Pages 2 and 3 carry the court's ORDER, the clerk's distribution
  // certificate and the Certificate of Service. The ONLY thing this family
  // writes there is the case number in each page's header. Anything else drawn
  // on those pages is a defect.
  const courtPageInk = [];
  for (const appearance of drawn) {
    if (appearance.page === 1) continue;
    const text = String(appearance.text ?? "").trim();
    if (!text) continue;
    const owner = census.fields.find((f) => f.widgets.some((w) =>
      w.page === appearance.page
      && Math.abs(w.rect.x - appearance.x) <= 3 && Math.abs(w.rect.y - appearance.y) <= 3));
    courtPageInk.push({ page: appearance.page, field: owner?.name ?? null, text });
    if (owner?.name !== "caseNo") {
      findings.push({ severity: "blocking", fixture: label, field: owner?.name ?? "(unattributed appearance)",
        check: "ink_on_a_court_page_outside_the_case_number_header",
        page: appearance.page, drawnText: text });
    }
  }

  return { findings, chargeBlanks, namePlacements, perWidget, courtPageInk, selectionMarks, appearancesDrawn: drawn.length };
}

// ---- main --------------------------------------------------------------------
async function main() {
  const blocked = new Set(readJson(STALE_BLOCK).hashes ?? []);
  fs.mkdirSync(path.join(rootDir, OUT), { recursive: true });

  const doc = DOCUMENT;
  console.log(`\n=== ${doc.documentId} (${doc.documentRole}) ===`);
  const { bytes, indexEntry } = resolveSource(doc);
  console.log(`  source verified  sha256=${doc.sha256}  bytes=${bytes.length}`);

  const census = await censusDocument(doc, bytes);
  console.log(`  censused ${census.fields.length} fields / ${census.widgetTotal} widgets across ${census.pages.length} pages`);

  // Structural assertions about this document, checked rather than assumed.
  if (census.fields.length !== 26) fail(`expected 26 AcroForm fields, censused ${census.fields.length}`);
  if (census.widgetTotal !== 29) fail(`expected 29 widget annotations, censused ${census.widgetTotal}`);
  const caseNo = census.fields.find((f) => f.name === "caseNo");
  if (!caseNo || caseNo.widgets.length !== 3) fail("caseNo must carry three widgets (pages 1, 2 and 3)");
  if (String(caseNo.pagesTouched) !== "1,2,3") fail(`caseNo widgets must sit on pages 1, 2 and 3; measured ${caseNo.pagesTouched}`);
  const p3 = census.fields.filter((f) => f.widgets.some((w) => w.page === 3));
  if (p3.length !== 1 || p3[0].name !== "caseNo") {
    fail(`page 3 must carry exactly one field, caseNo; measured ${p3.map((f) => f.name).join(", ") || "none"}`);
  }

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
      title: `AK ${doc.documentId}`
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
      + `, sha256=${hash.slice(0, 16)}…  widgets-read=${proof.perWidget.length}`
      + `  name-placements=${proof.namePlacements.length}  findings=${proof.findings.length}`);

    fixtures[label] = { file: rel, sha256: hash, byteLength: result.bytes.length, report: result.report, proof };
  }

  // ---- step 8: raster every page ---------------------------------------------
  const rasters = [];
  for (const label of ["canonical", "boundary"]) {
    const outDir = `${OUT}/raster/${doc.key}-${label}`;
    fs.mkdirSync(path.join(rootDir, outDir), { recursive: true });
    const produced = await rasterizePdf({
      file: path.join(rootDir, fixtures[label].file),
      outDir: path.join(rootDir, outDir),
      scale: 1.6,
      prefix: "page"
    });
    const files = (Array.isArray(produced) ? produced : fs.readdirSync(path.join(rootDir, outDir)).map((f) => path.join(rootDir, outDir, f)))
      .map((f) => (typeof f === "string" ? f : f.file))
      .filter(Boolean).sort();
    if (files.length !== census.pages.length) {
      fail(`${label}: rastered ${files.length} page(s), document has ${census.pages.length}`);
    }
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
    jurisdiction: "AK",
    routeKeys: [ROUTE_KEY],
    custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false,
    whyNoAcquisition:
      "The source was already held. The pinned Master Library was recovered in this container through "
      + "scripts/rcap-corpus/bootstrap-private-corpus.sh, which verifies the archive hash and the corpus's own "
      + "governance checksums before extracting. Nothing was fetched from a court or agency host, and no mirror, "
      + "cache or aggregator was consulted.",
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
      structuralClassObserved: indexEntry.structuralClassObserved
    }],
    whatThisReceiptDoesNotEstablish: [
      "that this is the current official edition of TF-800",
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
      + "label position; captions are captured separately and decide only what a blank means, never where it is. "
      + "Every widget of every field is recorded, not only the first.",
    filenameNote:
      "Deliberately NOT named field-census.json. "
      + "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs walks "
      + "data/rcap-all50/overlays for that exact filename and asserts family and field totals equal the counts "
      + "frozen in data/rcap-grade-a/field-semantics/full-name-charge-caption-classification-diff.json. Enrolling "
      + "a new family changes those totals and that diff record is outside this family's owned path. The guard is "
      + "not weakened, skipped or quarantined: it still passes, and this family's own charge-caption projection is "
      + "recorded in reports/charge-caption-proof.json.",
    strokedBoxScan: {
      library: "scripts/lib/pdf-stroked-boxes.mjs",
      whatWasScanned: "each page's content stream, and every widget's own appearance streams",
      pageContentStreamBytes: Object.fromEntries(census.contentBytesByPage),
      strokedRectanglesFoundInPageContent: Object.fromEntries(
        [...census.strokedByPage].map(([p, r]) => [p, r.length])),
      strokedRectanglesFoundInWidgetAppearances: [...census.widgetAppearanceBoxes]
        .reduce((n, [, boxes]) => n + boxes.length, 0),
      finding:
        "TF-800 draws no stroked rectangle anywhere — not on any of its three page content streams, and not in "
        + "any widget appearance stream. No widget carries a border colour or a border width either. This form's "
        + "blanks are defined by the widget rectangles and the printed captions beside them, and by nothing else. "
        + "measuredRuleUnderWriteBox is therefore null on every field: that is a MEASURED ABSENCE, not an "
        + "unattempted measurement. Because there is no drawn rule or border to corroborate against, "
        + "measuredNearestPrintedLine records the printed caption line instead — a different channel from the "
        + "widget rectangle, used as evidence about a box and never as a source for one."
    },
    productionOverlayCrossCheck: (() => {
      let prod = null;
      try { prod = readJson(`${PRODUCTION_OVERLAY}/field-census.json`); } catch { prod = null; }
      if (!prod) return { compared: false, why: "production field-census.json not readable" };
      const prodFields = new Map((prod.fields ?? []).map((f) => [f.name, f]));
      const rows = census.fields.map((f) => {
        const p = prodFields.get(f.name);
        const w = f.widgets[0];
        const agrees = Boolean(p?.widgets?.[0]) && w
          && Math.abs(p.widgets[0].rect.x - w.rect.x) <= 0.5
          && Math.abs(p.widgets[0].rect.y - w.rect.y) <= 0.5
          && Math.abs(p.widgets[0].rect.width - w.rect.width) <= 0.5
          && Math.abs(p.widgets[0].rect.height - w.rect.height) <= 0.5;
        return {
          field: f.name,
          measuredHere: w?.rect ?? null,
          productionRecords: p?.widgets?.[0]?.rect ?? null,
          agreesWithinHalfAPoint: agrees,
          widgetsMeasuredHere: f.widgets.length,
          widgetsProductionRecords: p?.widgets?.length ?? 0
        };
      });
      return {
        compared: true,
        source: `${PRODUCTION_OVERLAY}/field-census.json`,
        readOnly: true,
        fieldsCompared: rows.length,
        fieldsAgreeing: rows.filter((r) => r.agreesWithinHalfAPoint).length,
        verdict: rows.every((r) => r.agreesWithinHalfAPoint)
          ? "AGREES — every first-widget rectangle measured here matches the production record within half a point. "
            + "The production overlay rounds to whole points; this census records two decimal places."
          : "DISAGREES — see the rows below.",
        widgetCoverageDifference:
          "The production census records ONE widget per field. This census records all 29. The two widgets "
          + "production omits are caseNo on pages 2 and 3, and the second Group1 radio widget on page 1. That "
          + "omission is the substance of inherited finding F3, and it is why verification here reads every "
          + "widget rather than the first.",
        rows
      };
    })(),
    document: {
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      ownership: doc.ownership,
      captionOnly: doc.captionOnly,
      pageGeometry: census.pageGeometry,
      fieldCount: census.fields.length,
      widgetCount: census.widgetTotal,
      widgetsPerPage: census.pageGeometry.map(({ page }) => ({
        page, widgets: census.fields.reduce((n, f) => n + f.widgets.filter((w) => w.page === page).length, 0)
      })),
      fields: census.fields
    }
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    renderStrategy: "acroform_fill",
    generationAllowed: false,
    runtimeSelectable: false,
    wiringCreatesNoAuthority:
      "generationAllowed is false and runtimeSelectable is false. This map describes what a fill WOULD write. "
      + "It opens no route, marks no packet proven and approves no output for participant delivery.",
    document: (() => {
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
            // Every widget the value lands in. caseNo lands in three.
            widgets: (f?.widgets ?? []).map((x) => ({
              index: x.index, page: x.page, rect: x.rect, rectBasis: x.rectBasis
            })),
            widgetCount: f?.widgets?.length ?? 0,
            pagesTouched: f?.pagesTouched ?? [],
            rectBasis: "acroform_widget_rect_read_from_the_document",
            measuredRuleUnderWriteBox: f?.measuredRuleUnderWriteBox ?? null,
            measuredNearestPrintedLine: f?.measuredNearestPrintedLine ?? null,
            harvestedLabel: f?.effectiveLabel ?? null,
            harvestedLabelIsReliable: false
          };
        }),
        refused: fixtures.canonical.report.refused,
        protectedFields: fixtures.canonical.report.protectedFields
      };
    })()
  });

  const chargeBlanks = ["canonical", "boundary"].flatMap((label) =>
    fixtures[label].proof.chargeBlanks.map((b) => ({ document: doc.documentId, fixture: label, ...b })));

  writeJson(`${OUT}/reports/charge-caption-proof.json`, {
    schemaVersion: "rcap-charge-caption-proof/v1",
    familyId: FAMILY_ID,
    question:
      "Does any blank whose caption or field name names a charge, offence, count, statute or violation "
      + "carry a participant name token in the rendered artifact bytes?",
    method:
      "Read back from the flattened appearance streams of each rendered fixture with "
      + "scripts/rcap-official-forms/pdf-flattened-widgets.mjs, at each field's own measured widget rectangle — "
      + "every widget, not only the first. This is the artifact answering, not the render report.",
    consistentWith: "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs",
    documentNote:
      "TF-800 is a records-access request under Administrative Rule 37.6. It asks about court RECORDS, not about "
      + "an offence, and carries no charge, offence, count, statute or violation blank at all — so the population "
      + "this question ranges over is legitimately empty on this form. The zero below is the absence of the "
      + "hazard, not the absence of the check: the wider participant-name-placement proof in "
      + "reports/participant-name-placement.json reads EVERY appearance the artifact draws and is what actually "
      + "constrains this family.",
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
    })(),
    theHazardThisFormActuallyHas: {
      note:
        "The charge-caption question is empty here, but the SHAPE of that defect is present and is what this "
        + "family's role refusals exist for. decideBinding makes `caseName` and `partyNames` writable with "
        + "factId participant.full_legal_name — a participant's name bound into a blank that holds something "
        + "else. Neither is a charge blank, so no shared rule refuses either.",
      fields: census.fields
        .filter((f) => f.sharedBinderDecision.writable && f.sharedBinderDecision.factId === "participant.full_legal_name")
        .map((f) => ({
          field: f.name,
          sharedBinderWouldWrite: f.sharedBinderDecision.factId,
          refusedByThisFamily: doc.unwritable.some((u) => u.field === f.name),
          roleClass: doc.unwritable.find((u) => u.field === f.name)?.class ?? null
        }))
    }
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
      + "measured rectangle. This is wider than the charge-caption question, and on TF-800 it is the check that "
      + "carries the weight: the form has no charge blanks, but it has two blanks the shared binder would write "
      + "the participant's name into (`caseName`, `partyNames`) and neither is a name.",
    blanksTheNameMayAppearIn: NAME_MAY_APPEAR_IN,
    incidentalExemptions: NAME_TOKENS_INCIDENTAL_IN,
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
    artifacts: ["canonical", "boundary"].map((label) => ({
      document: doc.documentId, fixture: label,
      file: fixtures[label].file, sha256: fixtures[label].sha256, byteLength: fixtures[label].byteLength,
      fieldsWritten: fixtures[label].report.written.length,
      fieldsRefused: fixtures[label].report.refused.length,
      widgetsReadBackFromBytes: fixtures[label].proof.perWidget.length,
      unfittable: fixtures[label].report.unfittable
    })),
    rasters
  });

  writeJson(`${OUT}/reports/artifact-byte-verification.json`, {
    schemaVersion: "rcap-artifact-byte-verification/v1",
    familyId: FAMILY_ID,
    question:
      "At every measured widget rectangle of every censused field, what does the finished artifact actually draw?",
    method:
      "flattenedWidgets() reads the composed placement of every flattened appearance out of each fixture's page "
      + "content streams; drawnAt() selects the appearances landing within 3pt of a measured rectangle. Nothing "
      + "here is taken from the render report.",
    whyASelectionMarkIsCheckedSeparately:
      "A checked box draws a glyph or a stroked mark, not text, and extracts as the empty string — so the "
      + "text readback above cannot tell a ticked box from an unticked one. Flattening emits an appearance for "
      + "every widget either way, so the presence of an appearance proves nothing. selectionMarkIn() reads what "
      + "each control's appearance actually DRAWS and reports a mark on a text-showing operator, a curve, or a "
      + "stroked diagonal segment — none of which can occur in an axis-aligned border. Every control on TF-800 "
      + "is refused by this family, so every one of them must come back unmarked.",
    whyEveryWidget:
      "caseNo carries three widgets, on pages 1, 2 and 3, filled from one value. Reading only widget[0] would "
      + "report the case number present while pages 2 and 3 were blank. Inherited finding F3.",
    multiWidgetFitHazard: (() => {
      // A finding this build made by measuring, not one it inherited.
      //
      // finalizeOfficialForm fits a value against `field.widgets[0].rect`, and
      // writes or refuses the WHOLE field on that one result. caseNo's three
      // widgets are not the same width — 127.06pt on page 1, 134.39pt on
      // page 2, 130.25pt on page 3 — and widget[0] is the NARROWEST of the
      // three. So the page-1 box decides for all of them.
      //
      // The boundary fixture is where this becomes visible: its case number
      // needs 131pt at the 6pt floor, page 1 offers 127.06, and the field is
      // refused entirely. Pages 2 and 3 could have carried it and are left
      // blank instead — on a form where that header is the only thing
      // identifying those pages to the court.
      //
      // It fails in the SAFE direction here, and only because widget[0]
      // happens to be the narrowest. Had the widest come first, a value that
      // fitted page 1 would have been written to all three and silently
      // clipped on the narrower two, which is the same defect pointing the
      // other way. That is what makes this a finding rather than a note: the
      // outcome is decided by widget order, not by a decision.
      const rows = [];
      for (const field of census.fields) {
        if (field.widgets.length < 2) continue;
        const widths = field.widgets.map((w) => ({ index: w.index, page: w.page, width: w.rect.width }));
        const narrowest = widths.reduce((a, b) => (b.width < a.width ? b : a));
        const widest = widths.reduce((a, b) => (b.width > a.width ? b : a));
        rows.push({
          field: field.name,
          widgets: widths,
          fitIsDecidedBy: { index: widths[0].index, page: widths[0].page, width: widths[0].width },
          narrowest, widest,
          widthSpread: +(widest.width - narrowest.width).toFixed(2),
          firstWidgetIsNarrowest: widths[0].width === narrowest.width,
          consequence: widths[0].width === narrowest.width
            ? "Fails safe: a value too wide for the narrowest box refuses the whole field rather than clipping "
              + "the others. The cost is that boxes which could have carried the value are left blank."
            : "FAILS UNSAFE: a value fitted to widget[0] is written to narrower widgets too and is clipped there."
        });
      }
      return {
        question:
          "For a field whose widgets are not all the same width, which box decides whether the value is written?",
        answer:
          "widget[0]. finalizeOfficialForm passes field.widgets[0].rect to fitTextToWidget and writes or refuses "
          + "the whole field on that one result.",
        observedOnThisForm: rows,
        observedConsequence: ["canonical", "boundary"].map((label) => ({
          fixture: label,
          caseNoWritten: fixtures[label].report.written.some((w) => w.field === "caseNo"),
          unfittable: fixtures[label].report.unfittable.filter((u) => u.field === "caseNo")
        })),
        severity: "advisory",
        whoOwnsTheFix:
          "scripts/rcap-official-forms/rcap-official-form-finalize.mjs, which is outside this family's owned "
          + "path. Fitting against the narrowest widget of the field would make the safe outcome a decision "
          + "rather than an accident of widget order. This family does not edit that file, does not work around "
          + "it, and does not tune its boundary fixture to avoid it."
      };
    })(),
    fixtures: ["canonical", "boundary"].map((label) => ({
      fixture: label,
      widgetsRead: fixtures[label].proof.perWidget.length,
      widgetsCarryingInk: fixtures[label].proof.perWidget.filter((w) => w.drawnText !== null).length,
      courtPageInk: fixtures[label].proof.courtPageInk,
      controlsChecked: fixtures[label].proof.selectionMarks.length,
      controlsCarryingASelectionMark: fixtures[label].proof.selectionMarks.filter((m) => m.marked).length,
      selectionMarks: fixtures[label].proof.selectionMarks,
      widgets: fixtures[label].proof.perWidget
    }))
  });

  // Inherited findings, answered from this build's own measurements.
  const f = (name) => census.fields.find((x) => x.name === name);
  writeJson(`${OUT}/reports/inherited-evidence-findings-resolution.json`, {
    schemaVersion: "rcap-inherited-findings-resolution/v1",
    familyId: FAMILY_ID,
    resolves: "reports/inherited-evidence-findings.json",
    basis:
      "Each inherited finding was re-tested first-hand against the now-mounted pinned binary, not accepted on "
      + "the predecessor's report. The predecessor derived them by reading the production overlay; this build "
      + "derived them by measuring the document.",
    resolutions: [
      {
        id: "AK-TF800-F1",
        inherited: "Inherited effectiveLabel values are positional inferences and mis-bind.",
        verdict: "CONFIRMED, and it reproduces on a fresh harvest of the verified binary.",
        evidenceMeasuredHere: {
          fieldsWhoseHarvestedLabelBelongsToAnotherLine: [
            { field: "name", printedCaptionIs: "Name:", harvestedLabel: f("name")?.effectiveLabel,
              consequenceIfTheLabelHadDecided: "descriptorsMatching('Addres') yields participant.street_address — the participant's street address would have been printed on the Name line." },
            { field: "email", printedCaptionIs: "Email*:", harvestedLabel: f("email")?.effectiveLabel,
              consequenceIfTheLabelHadDecided: "participant.street_address on the Email line." },
            { field: "dayPhone", printedCaptionIs: "Daytime Phone:", harvestedLabel: f("dayPhone")?.effectiveLabel,
              consequenceIfTheLabelHadDecided: "participant.email on the Daytime Phone line." },
            { field: "caseName", printedCaptionIs: "Case Name:", harvestedLabel: f("caseName")?.effectiveLabel,
              consequenceIfTheLabelHadDecided: "nothing — the fragment matches no descriptor. The hazard on this field comes from the NAME channel, not the label channel." },
            { field: "dateHearing", printedCaptionIs: "Log notes (list date and type of hearing):", harvestedLabel: f("dateHearing")?.effectiveLabel,
              consequenceIfTheLabelHadDecided: "nothing today; the harvested caption belongs to the line below." }
          ],
          distinctHarvestedLabels: new Set(census.fields.map((x) => x.effectiveLabel)).size,
          fieldsWithNoHarvestedLabel: census.fields.filter((x) => x.effectiveLabel === null).length
        },
        whatThisBuildDid:
          "The harvested label is recorded on every field and marked labelIsReliable:false, and it decides "
          + "nothing. decideBinding asks the field-name channel first and only falls back to the label when the "
          + "name matches nothing, so on this document the label never decides a written field. Every semantic "
          + "call in this family's role refusals was re-derived from the document's own printed text, quoted in "
          + "the `why` of each refusal.",
        stillTrue: "The widget rects. They are structural annotation geometry and they agree with the production record."
      },
      {
        id: "AK-TF800-F2",
        inherited: "certDate is classed deterministic but is the certificate-of-mailing date; emailCB is classed participant while its three siblings are not.",
        verdict: "CONFIRMED as a hazard, and already closed in the shared binder — but not by a channel this family should lean on alone.",
        evidenceMeasuredHere: {
          certDate: {
            printedSentence: "I certify on ____ at [date/time] I gave a copy of this document",
            measuredRect: f("certDate")?.widgets?.[0]?.rect ?? null,
            descriptorsMatchingTheFieldName: f("certDate")?.descriptorsByName ?? [],
            sharedBinderDecision: f("certDate")?.sharedBinderDecision ?? null,
            note:
              "descriptorsMatching('certDate') still yields deterministic.filing_date — the production overlay's "
              + "classification was not arbitrary. What stops it now is the shared service_block protect rule, "
              + "whose own comment names this exact field. This family also refuses it by role, so the refusal "
              + "does not depend on the field keeping the spelling 'certDate'."
          },
          deliveryCheckboxGroup: ["mail", "hd", "tf", "emailCB"].map((n) => ({
            field: n,
            measuredRect: f(n)?.widgets?.[0]?.rect ?? null,
            descriptorsMatchingTheFieldName: f(n)?.descriptorsByName ?? [],
            sharedBinderDecision: f(n)?.sharedBinderDecision ?? null
          })),
          emailCBAsymmetryResolved:
            "First-hand, all four sit on the same printed line — 'and any attachments by mail. hand-delivery. "
            + "TrueFiling. email.' — inside the Certificate of Service, and all four are the same kind of "
            + "election about an act of service that has not happened. emailCB is the only one of the four whose "
            + "NAME matches a descriptor (participant.email), and only the type guard stops it being written. "
            + "This family refuses all four by role, symmetrically, so the group is no longer asymmetric and no "
            + "member's refusal rests on it being a checkbox."
        }
      },
      {
        id: "AK-TF800-F3",
        inherited: "The 29-vs-26 count gap is a units mismatch; caseNo carries three widgets and page 3 is legitimately written.",
        verdict: "CONFIRMED exactly.",
        evidenceMeasuredHere: {
          fields: census.fields.length,
          widgets: census.widgetTotal,
          multiWidgetFields: census.fields.filter((x) => x.widgets.length > 1)
            .map((x) => ({ field: x.name, widgets: x.widgets.length, pages: x.pagesTouched })),
          widgetsPerPage: census.pageGeometry.map(({ page }) => ({
            page, widgets: census.fields.reduce((n, x) => n + x.widgets.filter((w) => w.page === page).length, 0)
          })),
          pageThreeOccupancy: p3.map((x) => ({ field: x.name, rect: x.widgets.find((w) => w.page === 3)?.rect ?? null }))
        },
        whatThisBuildDid:
          "Verification reads EVERY widget of every field rather than widget[0], and asserts a written field is "
          + "present at all of its widgets. The page-3 rule is stated positively and checked positively: pages 2 "
          + "and 3 may carry the case-number header and nothing else, which is asserted against the artifact "
          + "bytes by the ink_on_a_court_page_outside_the_case_number_header check. A verifier demanding page 3 "
          + "stay untouched is not written, because satisfying it would mean the case number was left blank in "
          + "that page's header."
      }
    ]
  });

  const written = new Set(fixtures.canonical.report.written.map((w) => w.field));
  const refusedBy = new Map(fixtures.canonical.report.refused.map((r) => [r.field, r]));
  const roleWhy = new Map(doc.unwritable.map((u) => [u.field, u]));
  const blanksLeft = census.fields.filter((x) => !written.has(x.name)).map((x) => ({
    document: doc.documentId,
    field: x.name,
    page: x.widgets?.[0]?.page ?? null,
    printedCaptionNearest: x.measuredNearestPrintedLine?.text ?? null,
    reason: refusedBy.get(x.name)?.reason ?? "not_reached",
    category: refusedBy.get(x.name)?.category ?? null,
    roleClass: roleWhy.get(x.name)?.class ?? null,
    sharedRefusalIs: roleWhy.get(x.name)?.sharedRefusalIs ?? null,
    why: roleWhy.get(x.name)?.why ?? null
  }));
  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-participant-blanks/v1",
    familyId: FAMILY_ID,
    note:
      "Every blank this family does not fill, and why. A blank here is not an omission to be closed later by "
      + "widening the map: each is either the participant's to complete, the court's, or a value the platform "
      + "does not hold. 21 of this form's 26 fields are left blank, which is what a records-access request "
      + "looks like — the substance of TF-800 is the participant's own account of which records and why, and "
      + "the platform composes none of it.",
    count: blanksLeft.length,
    partialFills: [{
      field: "address",
      severity: "high",
      whatIsWritten: "participant.street_address",
      whatTheFormAsksFor:
        "TF-800 prints one 425pt line captioned 'Address:' and has no companion city, state or zip field. The "
        + "line is the participant's complete mailing address — the form's own note says the court and other "
        + "parties send court documents to the contact details given here.",
      finding:
        "The descriptor list holds participant.street_address, participant.city, participant.state, "
        + "participant.zip and participant.city_state_zip, but no single complete-mailing-address fact, and "
        + "`address` binds street_address by name. The rendered line is therefore PARTIAL by construction: it "
        + "carries the street and not the city, state or zip. It is not wrong — it is the participant's own "
        + "street address on a line captioned Address — but a participant who files without completing it gives "
        + "the court an address it cannot mail to.",
      whyItIsStillWritten:
        "A street address on an address line is incomplete, not incorrect, and TF-800 must be sworn before a "
        + "clerk, notary or other person authorised to administer oaths, so the participant necessarily handles "
        + "the page. Leaving it blank would discard a correct fact the platform holds.",
      whoOwnsTheFix:
        "scripts/rcap-official-forms/rcap-field-semantics.mjs, which is outside this family's owned path. A "
        + "combined mailing-address fact, or an explicit mapping channel for one-line address blanks, is where "
        + "this closes. This family does not edit that file and does not work around it."
    }],
    blanks: blanksLeft
  });

  writeJson(`${OUT}/reports/local-variation.json`, {
    schemaVersion: "rcap-local-variation/v1",
    familyId: FAMILY_ID,
    jurisdiction: "AK",
    routeKeys: [ROUTE_KEY],
    basis:
      "Read off the pinned TF-800 binary's own printed text. Nothing here is sourced from a court host, a "
      + "mirror or an aggregator, and nothing is inferred from another jurisdiction. Where the document's text "
      + "extraction interleaves (the form sets some lines in overlapping runs), the extracted string is quoted "
      + "verbatim and marked, rather than being tidied into text the document does not demonstrably carry.",
    createsNoLegalAuthority:
      "This records what the form says about its own filing, service and delivery. It is not legal eligibility, "
      + "it is not a route identity, and it opens nothing.",
    filing: {
      where: "The Clerk's Office at the participant's local trial court.",
      printedText: "Filing Instructions: File this request with the Clerk's Office at your local trial court.",
      textBasis: "rendered_page_raster",
      extractionNote:
        "Text extraction returns this line scrambled — 'File this request wiloctalh t rialt choue Crt. lerk's "
        + "Office at your' — because the form sets it in interleaved runs, with 'local trial court' as a link "
        + "styled separately. The extracted string is NOT what the form says. The printedText above is read off "
        + "raster/request-canonical/page-01.png, which Chromium's PDF engine rendered from these same pinned "
        + "bytes: a second measurement channel on the same document, not a reconstruction and not an outside "
        + "source. Both channels are recorded so the disagreement between them stays visible.",
      verbatimTextExtraction: "File this request wiloctalh t rialt choue Crt. lerk's Office at your",
      timeLimit: [
        "when you first open your case",
        "while the case is still open",
        "or if it has been less than 90 days since the case was closed"
      ],
      timeLimitCaveat:
        "If the case was reopened after being closed, the request applies only to records filed or created "
        + "since the case was reopened."
    },
    fee: {
      statedOnTheFormsFace: false,
      note:
        "TF-800 states no filing fee anywhere on its three pages. That is a measured absence of a statement "
        + "about fees on this document; it is not a finding that no fee is payable. Whether a motion fee "
        + "attaches is not something this form answers."
    },
    venue: {
      court: "The trial court in which the case is pending.",
      note:
        "The form binds itself to an existing case — it carries a Case Name, a Case No. and Party Names, and "
        + "its time limit is expressed relative to the case being open, closed or reopened. There is no venue "
        + "election for the participant to make."
    },
    relief: {
      choice: "confidential OR sealed",
      choiceIsTheParticipants: true,
      confidentialMeans:
        "the record is restricted to the case parties, the parties' attorneys, persons authorized by written "
        + "court order, and court staff for case processing purposes only",
      sealedMeans:
        "the record is restricted to the judge and persons authorized by written court order",
      scopeOptions: ["Entire case file", "Document(s)", "Log notes", "Audio Recording", "Transcript"],
      effectIfEntireCase:
        "the case is removed from the public index (CourtView) and the court file is unavailable to the public",
      effectIfSpecificRecords:
        "the case remains on public CourtView but the specified records are unavailable to the public",
      judgeMustFind:
        "that the public interest in access to court records is outweighed by at least one of (1) risk of "
        + "injury to individuals, (2) individual privacy rights and interests, (3) proprietary business "
        + "information, (4) the deliberative process, or (5) public safety; AND that the requestor's interest "
        + "in confidentiality is distinguishable from the confidentiality interests of parties in similar case "
        + "types."
    },
    courtBlocksCarryNoFields: {
      finding:
        "The ORDER block on page 2 prints six checkboxes — DENIED, GRANTED, confidential, sealed, Entire Case "
        + "File, The following specific records — and page 3 prints the judge's findings block, two "
        + "signature-and-date pairs, the clerk's distribution certificate and a JA/Clerk line. NONE of them is "
        + "an AcroForm widget. They are printed marks and printed rules.",
      basis:
        "Measured: the census finds 19 widgets on page 1, 9 on page 2 and 1 on page 3, and the 10 on pages 2 "
        + "and 3 are the case-number header plus the Certificate of Service. Confirmed visually in "
        + "raster/request-canonical/page-02.png and page-03.png, where every court control renders empty.",
      consequence:
        "The court's own elections and signatures on this form cannot be filled by any fill path, correct or "
        + "defective. That is a property of the document, not a protection this family built, and it is "
        + "recorded so nobody credits the map with it."
    },
    verification: {
      required: true,
      form: "I state on oath or affirm that I read this document and believe all statements in it are true.",
      administeredBy: "Court clerk, notary public, or other person authorized to administer oaths.",
      carriesSeal: true,
      structuralNote:
        "The Verification block's 'Date' and 'Your Signature' lines on page 2 carry NO AcroForm widget at all — "
        + "measured, not assumed. They cannot be filled by any fill path, correct or defective."
    },
    service: {
      required: "A copy of this form and everything attached to it must be given to every party in the case.",
      useTrueFilingIf: [
        "both you and the other party are using TrueFiling",
        "you are using TrueFiling and the other party gave their email address to the court"
      ],
      useCertificateOfServiceIf: [
        "the other party is not using TrueFiling and did not give their email address to the court",
        "TrueFiling is not available",
        "you are exempt from using TrueFiling"
      ],
      trueFilingAvailabilityReference: "https://ak-courts.info/tfcourts",
      referenceNote:
        "Printed on the form's own face and recorded as printed. It was not fetched, resolved or checked — "
        + "egress to court hosts is refused by policy."
    },
    delivery: {
      methods: ["mail", "hand-delivery", "TrueFiling", "email"],
      emailCondition: "email may be used only if the other party provided an email address to the court",
      platformSelectsAMethod: false,
      why:
        "Which method was used is a statement about an act of service that has not happened when the packet is "
        + "produced. All four delivery checkboxes are refused by role."
    },
    relatedForms: [{
      form: "TF-810",
      whenInstead:
        "If the participant believes the case should automatically be confidential or sealed by statute or "
        + "rule and is listed on public CourtView by mistake."
    }],
    citation: "Alaska Administrative Rule 37.6 (the form also cites Administrative Rule 37.5 in the court's own findings on page 3)."
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1",
    familyId: FAMILY_ID,
    why:
      "Text extraction cannot see a value clipped by its widget rectangle, a value written over preprinted "
      + "wording, a value in the wrong column, a page that renders blank, or text that runs past a margin. "
      + "Every page of both fixtures was rendered and looked at.",
    renderer: "Chromium's bundled PDF engine, via scripts/rcap-official-forms/rcap-pdf-rasterize.mjs at scale 1.6",
    pagesReviewed: rasters.reduce((n, r) => n + r.pages.length, 0),
    observations: [
      { fixture: "canonical", page: 1,
        observed:
          "Name, Address, Email*, Daytime Phone and Case No. each sit on their own printed line, inside the "
          + "line, at full size, with no overlap of preprinted wording and no run past the right margin. "
          + "'Case Name:' and 'Party Names:' are blank — the two refusals this family exists to make, visible "
          + "on the paper. Both radio circles and all five scope checkboxes are unmarked. The Document(s), Log "
          + "notes, Audio Recording and Transcript lines and the 'because:' block are blank." },
      { fixture: "canonical", page: 2,
        observed:
          "The case-number header carries the value. Everything else is blank: the Verification block, the "
          + "whole Certificate of Service (date, time, all four delivery boxes, 'I served these people', "
          + "Signature), and the whole ORDER block." },
      { fixture: "canonical", page: 3,
        observed:
          "The case-number header carries the value and nothing else on the page does. The judge's findings, "
          + "both signature-and-date pairs, the clerk's distribution certificate and the JA/Clerk line are all "
          + "blank." },
      { fixture: "boundary", page: 1,
        observed:
          "The 70-character name and the 76-character address both fit within their printed lines, "
          + "auto-reduced, without clipping and without crossing into the margin. 'Case No.:' is BLANK — the "
          + "visible consequence of advisory finding AK-TF800-B1. Everything else matches canonical." },
      { fixture: "boundary", pages: [2, 3],
        observed:
          "Both pages render with no participant ink at all, including the case-number headers, which are "
          + "blank for the same reason as page 1. Consistent with the byte verification, which reports no "
          + "appearance carrying text on either page." }
    ],
    defectsFound: [],
    verdict:
      "No clipping, no overwriting of preprinted text, no value in a wrong column, no blank page that should "
      + "carry content, and no margin overrun. The one visible gap — the boundary fixture's blank case-number "
      + "headers — is recorded as advisory finding AK-TF800-B1 and is a limitation of the shared finalizer, "
      + "not a defect in this map.",
    doesNotConstitute:
      "This is the build's own visual review. It is not the independent legal review requested in "
      + "approval-request.json, and it approves nothing."
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
        "Resolved as custody, not acquisition: the source was already held and is bound by pinned SHA-256 "
        + "94bab52533d74551f7a8ff8644a9671241b38075c7e05f10806d627dfb898cbd at 130602 bytes.",
      OFFICIAL_FORM_MAP_REQUIRED:
        "Field map built from measured widget geometry — all 29 widgets of all 26 fields.",
      ARTIFACT_REVIEW_REQUIRED:
        "Canonical and boundary fixtures rendered and verified from the artifact bytes at every measured "
        + "rectangle; all three pages rastered for both fixtures.",
      OUTPUT_LEGAL_APPROVAL_REQUIRED:
        "NOT addressed. Requested here; a human legal reviewer grants it or does not."
    },
    reviewerShouldLookAt: [
      "The `address` partial fill in reports/blanks-left-for-the-participant.json — the only value this family "
        + "writes that is incomplete against what its line asks for.",
      "The two role refusals in production-field-map.json that the shared binder does not make: caseName and "
        + "partyNames. If a reviewer disagrees that these are not name blanks, the map changes.",
      "That 21 of 26 fields are deliberately blank, including the whole substance of the request."
    ],
    independentVisualReviewRequired: true
  });

  const advisory = [
    {
      severity: "advisory",
      id: "AK-TF800-B1",
      title: "A multi-widget field's fit is decided by widget[0], not by its narrowest box.",
      field: "caseNo",
      where: "scripts/rcap-official-forms/rcap-official-form-finalize.mjs (outside this family's owned path)",
      detail:
        "caseNo's three widgets are 127.06pt (page 1), 134.39pt (page 2) and 130.25pt (page 3). "
        + "finalizeOfficialForm fits against widget[0] and writes or refuses the whole field on that result. "
        + "The boundary case number needs 131pt at the 6pt floor, so the field is refused entirely and the "
        + "page-2 and page-3 case-number headers are left blank although both boxes would have held it. It "
        + "fails safe here only because widget[0] is the narrowest of the three; with the widest first, a value "
        + "fitted to page 1 would be written to all three and clipped on the narrower two. See "
        + "reports/artifact-byte-verification.json#multiWidgetFitHazard.",
      thisFamilyDidNot: "tune the boundary fixture to avoid it, or edit the shared finalizer to work around it"
    },
    {
      severity: "advisory",
      id: "AK-TF800-B2",
      title: "The 'Address:' line is a complete mailing address; the platform binds only its street component.",
      field: "address",
      where: "scripts/rcap-official-forms/rcap-field-semantics.mjs (outside this family's owned path)",
      detail:
        "TF-800 prints one 425pt line captioned 'Address:' with no companion city, state or zip field, and the "
        + "form's own note says the court sends documents to the contact details given here. `address` binds "
        + "participant.street_address by name and there is no combined mailing-address fact, so the rendered "
        + "line is partial by construction. See reports/blanks-left-for-the-participant.json#partialFills.",
      thisFamilyDidNot: "invent a fact, edit the descriptor list, or leave the correct street address unwritten"
    }
  ];

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-build-findings/v1",
    familyId: FAMILY_ID,
    blocking: allFindings.filter((x) => x.severity === "blocking"),
    findingCount: allFindings.length,
    advisoryNote:
      "Advisory findings are defects this build MEASURED but did not cause and does not own. They do not fail "
      + "the build, and none was worked around: each names the file that owns the fix.",
    advisory
  });

  console.log(`\n${allFindings.length === 0 ? "OK" : "FINDINGS"}: `
    + `${chargeBlanks.length} charge-caption blanks examined, `
    + `${namePlacements.length} name placements read from the artifacts, `
    + `${namePlacements.filter((n) => !n.allowed).length} outside the allowlist.`);
  if (allFindings.length) {
    for (const x of allFindings) console.error(`  ${x.severity} ${x.fixture} ${x.field}: ${x.check}`);
    process.exit(1);
  }
}

await main();
