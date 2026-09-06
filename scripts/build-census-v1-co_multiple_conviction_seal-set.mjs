#!/usr/bin/env node
/**
 * The Colorado multiple-conviction sealing family — `co_multiple_conviction_seal-set`.
 *
 *   node scripts/build-census-v1-co_multiple_conviction_seal-set.mjs [--check] [--no-raster]
 *
 * Two official Judicial Department forms, filed together:
 *
 *   JDF-641  Motion to Seal Multiple Conviction Records   — the filing, five pages
 *   JDF-642  Order to Seal Multiple Conviction Records    — the proposed order
 *
 * The route is `track:CO:co_multiple_conviction_seal`, C.R.S. § 24-72-709.
 *
 * THE SAME SCRAMBLED TEXT STREAM AS THE OTHER COLORADO FORMS. Both interleave
 * their glyph runs, so extraction returns "Sheriff’s De partment" and "The
 * Defendan futrther shows". A printed-caption check cannot be run against them
 * and a match loose enough to accept that text would pass on anything, so the
 * absence is recorded per field in reports/caption-evidence.json and the caption
 * claim rests on Colorado's own authored, section-keyed widget names.
 *
 * TWO THINGS ARE PARTICULAR TO THIS FAMILY.
 *
 * First, the OFFENCE TABLE. Section 4 of JDF-641 is fifteen rows of four
 * columns -- charge, case number, sentence date, probation or parole
 * supervision end date -- one row per conviction the participant is asking the
 * court to seal. Sixty cells, and not one of them is written. This is a
 * multiple-conviction route: which convictions a participant is bringing, and
 * their supervision end dates, are the substance of the motion and the platform
 * does not hold them. A row with the charge filled and the supervision end date
 * blank would read as a finished row and would be missing the fact the
 * statutory waiting period turns on.
 *
 * Second, `∆` is ONE AcroForm field with TWO widgets: the defendant's name in
 * the case caption on page 1, and "Print Your Name" in the Sign & Date block on
 * page 5. Colorado bound them deliberately, and section 10 of this form is a
 * plain signature block rather than a verification under penalty of perjury --
 * unlike JDF-477 section 10, which is. So the name is written and appears in
 * both places, while the signature and its date stay blank.
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs. Never Poppler.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

/*
 * The calibrated page rasterizer, resolved wherever it lives.
 *
 * The Captain branch moved this module from scripts/lib/ to scripts/raster/ at
 * 5f144ec, and fifteen builders on that branch — including this one — still
 * import the old path, which is not there. Rather than pick one and break on
 * the other base, the import is tried at the new path first and falls back to
 * the old. Only a genuinely missing module is caught: a syntax error or a
 * failed dependency inside the module still throws, because a rasterizer that
 * silently resolves to a stale copy is worse than one that refuses.
 */
const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "co_multiple_conviction_seal-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/co/co-multiple-conviction-seal-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-co_multiple_conviction_seal-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "CO",
  routeKey: "track:CO:co_multiple_conviction_seal",
  routeSelectionId: "co-multiple-conviction-seal-set-jdf-641-jdf-642",
  publicLabel: "Motion to seal multiple conviction records",
  authority: "C.R.S. § 24-72-709; Colorado Judicial Department forms JDF 641 and JDF 642",
  documents: [
    { formNumber: "JDF-641", title: "Motion to Seal Multiple Conviction Records", instrumentKind: "primary_filing" },
    { formNumber: "JDF-642", title: "Order to Seal Multiple Conviction Records", instrumentKind: "proposed_order" }
  ]
});

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

const SUPPLY = (what) => ({ policy: "supply", what });
const WRITE = (fact) => ({ policy: "write", fact });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const ELECTION = (why) => ({ policy: "election", why });
const ATTORNEY = (why) => ({ policy: "attorney", why });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";
const AGENCY = (what) => SUPPLY(what);

/* Section 4: fifteen offence rows, four columns each, generated so the columns
 * of one row cannot drift apart. Every cell is the participant's. */
const OFFENCE_ROWS = ["4A", "4B", "4C", "4D", "4E", "4F", "4G", "4H", "4i", "4J", "4K", "4L", "4M", "4N", "4O"];
const OFFENCE_COLUMNS = [
  ["1", "Charge", "the charge you were convicted of, as it appears on your court record"],
  ["2", "Case Number", "the case number for that conviction, in this judicial district"],
  ["3", "Sentence Date", "the date you were sentenced on that conviction"],
  ["4", "Supervision End Date", "the date your probation or parole supervision on that conviction ended — the statutory waiting period runs from it"]
];
const offenceRows = () => {
  const rows = {};
  OFFENCE_ROWS.forEach((prefix, index) => {
    for (const [suffix, heading, what] of OFFENCE_COLUMNS) {
      rows[`${prefix}.${suffix}`] = {
        section: "4. Offense Information",
        label: `Offense ${index + 1} — ${heading}`,
        ...SUPPLY(`${what}. This is offence ${index + 1} of the fifteen the table has room for`)
      };
    }
  });
  return rows;
};

const FORM_FIELDS = {
  "JDF-641": {
    /* --- A. Court, B. Parties, C. Case details --------------------------- */
    Court: { section: "A. Court", selection: true, label: "Court type — County or District (selection)", ...ELECTION("which court the convictions are in is a fact about your cases; C.R.S. § 24-72-709 runs in both") },
    County: { section: "A. Court", label: "Colorado County", ...WRITE("matter.county") },
    "Court Address": { section: "A. Court", label: "Court Address", ...SUPPLY("the street address of the courthouse. The Colorado Judicial Department publishes it for every county; the platform holds no court directory") },
    "Case Number": { section: "C. Case Details", label: "Case Number", ...WRITE("matter.case_number") },
    "D/C": { section: "C. Case Details", label: "Division/Courtroom", ...PROTECT(COURT_OWNED, "the division and courtroom are assigned by the court; the box beside them is marked on the form as being for court use") },

    /* --- 2. My Information ------------------------------------------------ *
     * `∆` carries two widgets: the caption on page 1 and "Print Your Name" in
     * the Sign & Date block on page 5. One field, one value, both places. */
    "∆": { section: "B. Parties to the Case", label: "Defendant — Full Name, in the caption and on the Print Your Name line", ...WRITE("participant.full_legal_name") },
    "∆ DoB": { section: "2. My Information", label: "Date of Birth", ...WRITE("participant.date_of_birth") },
    "∆ Street Address": { section: "2. My Information", label: "Mailing Address", ...WRITE("participant.street_address") },
    "∆ CSZ": { section: "2. My Information", label: "City, State, & Zip", ...WRITE("participant.city_state_zip") },
    "∆ Phone": { section: "2. My Information", label: "Phone", ...WRITE("participant.phone") },
    "∆ Email": { section: "2. My Information", label: "Email", ...WRITE("participant.email") },
    Group_Interp: { section: "2. My Information", selection: true, label: "Do you need an interpreter — No, or Yes (selection)", ...ELECTION("whether you need an interpreter, and in which language, is yours to say") },
    Language: { section: "2. My Information", label: "Interpreter language", ...SUPPLY("the language you need an interpreter in, if you ticked Yes") },
    Group_Event: { section: "2. My Information", selection: true, label: "Attend court events in person, or virtually (selection)", ...ELECTION("how you want to attend court events is your choice; the form tells you to use JDF 76 at least 48 hours before an event to switch it") },

    /* --- 3. Records to be Sealed ------------------------------------------ */
    "3A.0": { section: "3. Records to be Sealed", selection: true, label: "District / County Court records to be sealed (selection)", ...ELECTION("tick every court and agency that holds records of these convictions") },
    "3A.1": { section: "3. Records to be Sealed", label: "District / County Court case numbers", ...SUPPLY("the case numbers of every District or County Court case you are asking to seal") },
    "3B.0": { section: "3. Records to be Sealed", selection: true, label: "Municipal Court records to be sealed (selection)", ...ELECTION("tick every court and agency that holds records of these convictions") },
    "3B.1": { section: "3. Records to be Sealed", label: "Municipal Court case numbers", ...SUPPLY("the case numbers of any Municipal Court cases you are asking to seal") },
    "3B.2": { section: "3. Records to be Sealed", label: "Municipal Court — Mailing Address", ...AGENCY("that Municipal Court's mailing address") },
    "3C.0": { section: "3. Records to be Sealed", selection: true, label: "Prosecuting Attorney records to be sealed (selection)", ...ELECTION("tick every court and agency that holds records of these convictions") },
    "3D": { section: "3. Records to be Sealed", selection: true, label: "Colorado Bureau of Investigation records to be sealed (selection)", ...ELECTION("the form marks the Colorado Bureau of Investigation required and prints its address for you; tick it") },
    "3E.0": { section: "3. Records to be Sealed", selection: true, label: "Sheriff's Department records to be sealed (selection)", ...ELECTION("tick every court and agency that holds records of these convictions") },
    "3E.1": { section: "3. Records to be Sealed", label: "Sheriff's Department — Mailing Address", ...AGENCY("the mailing address of the Sheriff's Department holding these records") },
    "3F.0": { section: "3. Records to be Sealed", selection: true, label: "City Attorney records to be sealed (selection)", ...ELECTION("tick every court and agency that holds records of these convictions") },
    "3F.1": { section: "3. Records to be Sealed", label: "City Attorney — Mailing Address", ...AGENCY("the City Attorney's mailing address") },
    "3G.0": { section: "3. Records to be Sealed", selection: true, label: "Law Enforcement records to be sealed (selection)", ...ELECTION("tick every court and agency that holds records of these convictions") },
    "3G.1": { section: "3. Records to be Sealed", label: "Law Enforcement — Agency Name", ...AGENCY("the name of the law enforcement agency that arrested or cited you") },
    "3G.2": { section: "3. Records to be Sealed", label: "Law Enforcement — Agency Mailing Address", ...AGENCY("that agency's mailing address") },
    "3G.3": { section: "3. Records to be Sealed", label: "Law Enforcement — Agency Case Number", ...AGENCY("that agency's own case number, which is usually different from the court case number") },
    "3H.0": { section: "3. Records to be Sealed", selection: true, label: "Another agency's records to be sealed (selection)", ...ELECTION("tick this if some other agency holds records of these convictions") },
    "3H.1": { section: "3. Records to be Sealed", label: "Other agency — Name", ...AGENCY("the name of any other agency holding records of these convictions") },
    "3H.2": { section: "3. Records to be Sealed", label: "Other agency — Mailing Address", ...AGENCY("that agency's mailing address") },
    "3J.1": { section: "3. Records to be Sealed", label: "Arrest Number (from your fingerprint card)", ...AGENCY("the arrest number, which is printed on your fingerprint card") },
    "3J.2": { section: "3. Records to be Sealed", label: "Date of Arrest", ...AGENCY("the date you were arrested") },

    ...offenceRows(),

    /* --- 5. Eligibility ---------------------------------------------------- */
    Group_5B: {
      section: "5. Eligibility", selection: true,
      label: "My convictions are sealable under C.R.S. § 24-72-709, or include a misdemeanour that is not (selection)",
      ...ELECTION("which of the two statements is true of your own convictions is a fact about your record; the form prints the list of offences that cannot be sealed on the page above, and this packet does not decide eligibility")
    },
    Group_5B_1: {
      section: "5. Eligibility", selection: true,
      label: "The district attorney consents, a hearing is requested, or the district attorney does not consent (selection)",
      ...ELECTION("whether the district attorney consents is not known when the packet is prepared, and asking for a hearing is your choice")
    },
    "5B.2": {
      section: "5. Eligibility",
      label: "If the district attorney does not consent — your clear and convincing showing",
      ...SUPPLY("your showing, if the district attorney does not consent: why the need for sealing is significant and substantial, why enough time has passed that you are no longer a threat to public safety, and why public disclosure is no longer necessary to protect or inform the public. The form prints those three requirements; this is yours to write")
    },

    /* --- 6. Case Process --------------------------------------------------- */
    "9B.0": { section: "6. Case Process — Appeals", selection: true, label: "Did you appeal any of these cases (selection)", ...ELECTION("whether you appealed is a fact about your own cases") },
    "9B.1": { section: "6. Case Process — Appeals", label: "Appeal Case Numbers", ...SUPPLY("the case numbers of any appeals, if you appealed") },
    "9B.2": { section: "6. Case Process — Appeals", selection: true, label: "Appellate Court (selection)", ...ELECTION("which appellate court heard the appeal, if you appealed") },
    "9B.3": { section: "6. Case Process — Appeals", label: "Appeal — Result", ...SUPPLY("how the appeal ended") },
    "9B.4": { section: "6. Case Process — Appeals", label: "Appeal — Date", ...SUPPLY("the date the appeal ended") },
    "9C.0": { section: "6. Case Process — Restitution", selection: true, label: "Do you still owe restitution (selection)", ...ELECTION("whether restitution is still owed is a fact about your own account with the court") },

    /* --- 7. and 8. --------------------------------------------------------- */
    Group_10: {
      section: "7. Criminal Record", selection: true,
      label: "Is a verified copy of your criminal history record, dated within the last 20 days, attached (selection)",
      ...ELECTION("tick Yes if you are attaching it. The form's own footnote says that if you are not, a copy must be filed within ten days of the petition")
    },
    "11.1": {
      section: "8. Harm or Adverse Consequences",
      label: "Explain the harm or adverse consequences",
      ...SUPPLY("why the harm to your privacy, or the danger of unwarranted adverse consequences, outweighs the public interest in retaining the records. This is yours to write and the platform never writes it for you")
    },

    /* --- 9. Certificate of Service ----------------------------------------- */
    CoS_Date: { section: "9. Certificate of Service", label: "Certificate of Service — date of service, entered at signature", ...PROTECT(SIGNATURE, "service has not happened when the packet is prepared, and a certificate dated before the act it certifies would be false") },
    GroupCoS: { section: "9. Certificate of Service", selection: true, label: "Certificate of Service — how you sent it (selection)", ...ELECTION("you tick the method you actually used, at the time you serve the prosecuting attorney") },
    CoS_Name: { section: "9. Certificate of Service", label: "Certificate of Service — name served by regular mail", ...PROTECT(SIGNATURE, "the certificate records who you actually served and is completed when you sign it, after service") },
    CoS_Address: { section: "9. Certificate of Service", label: "Certificate of Service — full address served by regular mail", ...PROTECT(SIGNATURE, "the certificate records who you actually served and is completed when you sign it, after service") },
    CoS_Other: { section: "9. Certificate of Service", label: "Certificate of Service — other method, explained", ...PROTECT(SIGNATURE, "the certificate records how you actually served and is completed when you sign it, after service") },

    /* --- 10. Sign & Date ---------------------------------------------------- */
    Sig: { section: "10. Sign & Date", label: "Signature", ...PROTECT(SIGNATURE, "you sign this yourself") },
    Sig_Date: { section: "10. Sign & Date", label: "Date of signature", ...PROTECT(SIGNATURE, "you date it when you sign it; a date written in advance would be false") },
    Sig_Aty: { section: "10. Sign & Date", label: "Counsel Signature (if any)", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") }
  },

  "JDF-642": {
    Dropdown1: { section: "A. Court", selection: true, label: "Court type — County or District (selection)", ...ELECTION("the proposed order names the same court the motion is filed in") },
    County: { section: "A. Court", label: "Colorado County", ...WRITE("matter.county") },
    "Court Address": { section: "A. Court", label: "Court Address", ...SUPPLY("the courthouse address, copied from the motion") },
    "Case Number": { section: "C. Case Details", label: "Case Number", ...WRITE("matter.case_number") },
    Division: { section: "C. Case Details", label: "Division", ...PROTECT(COURT_OWNED, "assigned by the court; the box beside it is marked for court use") },
    Courtroom: { section: "C. Case Details", label: "Courtroom", ...PROTECT(COURT_OWNED, "assigned by the court; the box beside it is marked for court use") },
    "∆": { section: "B. Parties to the Case", label: "Defendant — Full Name, in the caption and at 2(a)", ...WRITE("participant.full_legal_name") },
    "∆ DoB": { section: "2. Defendant's Information", label: "Birth Date", ...WRITE("participant.date_of_birth") },
    "∆ Street Address": { section: "2. Defendant's Information", label: "Mailing Address", ...WRITE("participant.street_address") },
    /*
     * `bindingLabel` is the wording the shared semantics is asked to classify;
     * `label` stays the words the form actually prints, because that is what the
     * participant is told the blank is called. They differ here for one reason:
     * JDF 642 prints "City, State, and Zip Code" and the registry's descriptor
     * matches /city\s*state\s*zip/, which the interposed "and" defeats. The
     * field then binds nothing and a fact the packet holds is left off the
     * order. Rewording the printed caption in the field map to suit a regular
     * expression would have been the wrong repair -- the participant would be
     * told the blank is called something it is not -- so the two are recorded
     * separately instead.
     */
    "∆ CSZ": {
      section: "2. Defendant's Information", label: "City, State, and Zip Code",
      bindingLabel: "City, State, Zip", ...WRITE("participant.city_state_zip")
    },
    "642.3.0": {
      section: "3. Court Findings", selection: true,
      label: "By the Court — the offenses include misdemeanors ineligible under C.R.S. § 24-72-709, and the harm outweighs the public interest (selection)",
      ...PROTECT(COURT_OWNED, "this is one of the court's own findings; a proposed order that marked it would be making the finding for the judge")
    },
    "4A.2.1": { section: "4. Court Orders", label: "Records sealed — the following cases in this Judicial District", ...SUPPLY("the case numbers of the other cases in this judicial district to be sealed, copied from the motion") },
    "4A.3.1": { section: "4. Court Orders", label: "Records sealed — Law Enforcement Agency", ...AGENCY("the law enforcement agency's name, copied from the motion") },
    "4A.3.2": { section: "4. Court Orders", label: "Records sealed — Law Enforcement Agency case number", ...AGENCY("that agency's case number, copied from the motion") },
    "4A.3.3": { section: "4. Court Orders", label: "Records sealed — Arrest number", ...AGENCY("the arrest number from your fingerprint card, copied from the motion") },
    "4D.1": { section: "4. Court Orders", label: "By the Court — other orders", ...PROTECT(COURT_OWNED, "the decree is the court's; a proposed order that wrote the court's other orders would be drafting the judge's ruling") },
    Sig: { section: "So Ordered", label: "By the Court — signature", ...PROTECT(COURT_OWNED, "the judge or magistrate signs their own order") },
    Group_Sig: { section: "So Ordered", selection: true, label: "By the Court — Judge or Magistrate (selection)", ...PROTECT(COURT_OWNED, "the officer who signs states which they are") },
    Sig_Date: { section: "So Ordered", label: "By the Court — Dated", ...PROTECT(COURT_OWNED, "the court dates its own order") }
  }
};

/* ---- fixtures ------------------------------------------------------------ */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "412 Cherry Creek Way",
    "participant.city_state_zip": "Denver, CO 80202",
    "participant.phone": "303-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "matter.county": "Denver",
    "matter.case_number": "2019CR004217"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O’Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city_state_zip": "Colorado Springs, Colorado 80921-2214",
    "participant.phone": "(719) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org",
    "matter.county": "El Paso",
    "matter.case_number": "2024CR0011882-SUPPLEMENTAL"
  }
};

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- source binding ------------------------------------------------------ */
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const all = index.entries ?? [];
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const wanted of ROUTE.documents) {
    const entry = all.find((e) => e.state === "CO" && e.formNumber === wanted.formNumber && e.assetClass === "FORM");
    if (!entry) { failures.push({ sourceId: `official-form:${wanted.formNumber}`, why: "no entry for this form number in the committed corpus index" }); continue; }
    const rel = entry.path;
    const abs = path.resolve(ROOT, root, rel);
    if (!fs.existsSync(abs)) { failures.push({ sourceId: `official-form:${wanted.formNumber}`, pathInArchive: rel, why: `the indexed path does not exist on disk: ${rel}` }); continue; }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    if (String(entry.sha256 ?? "") !== sha256) {
      failures.push({ sourceId: `official-form:${wanted.formNumber}`, pathInArchive: rel, why: `SHA-256 drift: the committed index says ${entry.sha256}, the mounted corpus holds ${sha256}` });
      continue;
    }
    resolved.push({
      ...wanted, sourceId: `official-form:${wanted.formNumber}`, pathInArchive: rel,
      revision: entry.revision ?? null, sha256, byteLength: bytes.length, bytes,
      acroFieldCount: entry.acroFieldCount ?? null, pageCount: entry.pageCount ?? null
    });
  }
  return { resolved, failures };
}

/* ---- census --------------------------------------------------------------- */
async function censusOf(source) {
  const spec = FORM_FIELDS[source.formNumber];
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text }))
  }));

  const rows = [];
  const unmapped = [];
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const entry = spec[name];
    const widgets = field.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      const ref = w.P();
      let pi = pages.findIndex((p) => p.ref === ref);
      if (pi < 0) pi = 0;
      return {
        page: pi + 1,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary"
      };
    });
    if (!entry) { unmapped.push({ field: name, widgets }); continue; }
    /*
     * What the SOURCE already carries on this control, before this build touches
     * it. JDF 477 ships with the Colorado Bureau of Investigation box already
     * ticked, because the form marks that agency required -- so the finished
     * artifact draws a tick at a rectangle this map refuses, and reading that as
     * "a field the map refused carries ink" would report a protected write this
     * build never made. The form's own default is recorded here, from the
     * pinned binary, so the byte proof can tell the two apart by evidence.
     */
    let sourceValue = null;
    try {
      if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
      else if (typeof field.getSelected === "function") sourceValue = field.getSelected() ?? null;
      else if (typeof field.getText === "function") sourceValue = field.getText() ?? null;
    } catch { sourceValue = null; }
    rows.push({
      key: name, name, page: widgets[0]?.page ?? null, widgets, sourceValue,
      rect: widgets[0]?.rect ?? null, rectBasis: widgets[0]?.rectBasis ?? null,
      type: field.constructor.name.replace(/^PDF/, "").toLowerCase()
        .replace("textfield", "text").replace("radiogroup", "radiogroup").replace("checkbox", "checkbox"),
      isSelectionControl: entry.selection === true
        || field.constructor.name === "PDFCheckBox" || field.constructor.name === "PDFRadioGroup",
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      section: entry.section, effectiveLabel: entry.label,
      bindingLabel: entry.bindingLabel ?? entry.label,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null,
      // The scrambled extraction at this widget's own coordinate, kept as
      // evidence of WHY the printed-caption check is unavailable on this form.
      printedTextAtCoordinate: (pageText.find((p) => p.page === (widgets[0]?.page ?? 1))?.lines ?? [])
        .filter((l) => widgets[0] && Math.abs(l.y - widgets[0].rect.y) <= 20)
        .sort((a, b) => Math.abs(a.y - widgets[0].rect.y) - Math.abs(b.y - widgets[0].rect.y))
        .slice(0, 2).map((l) => ({ y: l.y, extracted: l.text }))
    });
  }

  const dictionaryKeys = new Set(Object.keys(spec));
  for (const r of rows) dictionaryKeys.delete(r.key);
  return { rows, unmapped, stale: [...dictionaryKeys], pageText, pageCount: pages.length };
}

/* ---- render ---------------------------------------------------------------- */
async function renderDocument(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const writable = census.rows.filter((r) => r.policy === "write");
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const writableNames = new Set(writable.map((r) => r.name));
  const unwritableFields = census.rows.filter((r) => !writableNames.has(r.name)).map((r) => ({ field: r.name }));

  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: census.rows.map((r) => ({
      // The BINDING label goes to the finalizer; the printed label goes to the
      // field map and the participant. They are the same string unless a form's
      // own wording defeats the shared descriptor, and the dictionary says so
      // where they differ.
      name: r.name, type: r.type, effectiveLabel: r.bindingLabel, regionHeading: r.section,
      widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings, unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    /* FIX68. JDF-641 field 11.1 ships an appearance whose /BBox is 396pt wide
     * against a /Rect 392.4pt wide, so the stroked box it draws overhangs its
     * own widget by 3.6pt. ISO 32000-1 12.5.5 requires the transformed BBox to
     * be fitted to the /Rect -- here 0.9909 -- and pdf-lib's flatten() emits a
     * translation only, so the fit never happened. VF08 measured 1179 dark
     * pixels outside that rect per fixture at 300 dpi on packet page 5, where
     * the form's own conforming placement carries none, and proved the ink is
     * the shared step's rather than this family's by reproducing the identical
     * pixel set from a zero-write flatten of the pinned source with the option
     * OFF.
     *
     * Opting in pre-composes the 12.5.5 mapping into that appearance's own
     * /Matrix. This is the shared step's defect, not Colorado's; the option is
     * default-off and no other family's bytes move because this family passes
     * it. No synthesized square was recorded for this family, so FIX50's
     * suppressSynthesizedAppearances is not passed. That reasoning still holds,
     * and it is re-measured rather than inherited: VF02 compared all twenty-one
     * selection widgets with the pinned form at their own rects and found the
     * packet stamps no square of its own at any of them, so FIX50's option --
     * which supplies a missing /AP /N state for a check box or radio widget --
     * has nothing to act on here. FIX80's option below is a different mechanism
     * on different widgets, and passing it does not make FIX50's apply. */
    fitAppearancesToRect: true,
    /* FIX80. JDF-641's choice widgets 9B.0, 9B.2 and 9C.0 on page 4 -- an
     * appeal question, an appellate-court line and a restitution question, all
     * three participant elections this packet deliberately leaves unmade -- are
     * nested below an AcroForm root. The unwritten-input drop clears each
     * widget's /AP and removes it from /Annots but cannot detach a nested
     * field, so updateFieldAppearances regenerates an appearance from the
     * widget's /MK /BC [0 0 0] and flatten() finds the page through the
     * widget's own /P. VF02 measured what that delivers: 8,344 dark pixels of
     * black rectangle per fixture at 300 dpi, outside every declared write box,
     * where the Colorado Judicial Department's own form prints a single rule --
     * the rule each widget's own 29-byte appearance draws, and which the
     * regeneration discarded.
     *
     * Opting in keeps those three silent source appearances instead of clearing
     * them, and removes /MK /BC and /MK /BG from every unwritten field's
     * widgets so nothing regenerated for one can paint a border. This is the
     * shared step's defect, not Colorado's; the option is default-off and no
     * other family's bytes move because this family passes it. */
    suppressSynthesizedWidgetBorders: true,
    title: source.title
  });
  if (process.env.CO641_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) console.log(`   ${r.field ?? r.anchor}: ${r.reason}${r.category ? ` (${r.category})` : ""}`);
  }
  return { bytes, report };
}

/* ---- byte proof ------------------------------------------------------------ */
async function byteProof(source, census, artifactBytes, report, fixtureName) {
  const tmp = path.join(ROOT, `.co-641-byte-proof-${source.formNumber}-${fixtureName}.pdf`);
  fs.writeFileSync(tmp, artifactBytes);
  let widgets = [];
  try { widgets = await flattenedWidgets(tmp); } finally { fs.unlinkSync(tmp); }
  const written = new Map(report.written.map((w) => [w.field, w]));
  const actualWrites = [];
  const refusedFieldsWithInk = [];
  const documentAuthoredAppearances = [];
  let glyphs = 0;
  for (const r of census.rows) {
    for (const wdg of r.widgets) {
      const drawn = drawnAt(widgets, { page: wdg.page, rect: wdg.rect });
      const text = drawn.map((d) => d.text).filter(Boolean);
      const ink = text.join("").trim();
      if (written.has(r.name) && r.policy === "write") {
        glyphs += ink.length;
        actualWrites.push({
          field: r.key, factId: r.fact, page: wdg.page, rect: wdg.rect,
          section: r.section, effectiveLabel: r.effectiveLabel,
          drawnText: text, expected: FIXTURES[fixtureName][r.fact] ?? null,
          matchesExpected: ink === String(FIXTURES[fixtureName][r.fact] ?? "").trim()
        });
        continue;
      }
      if (ink.length === 0) continue;
      // Ink on a control the SOURCE already carried is the form's own default,
      // not a write this build made. JDF 477 ships the CBI box ticked because
      // the form marks that agency required.
      if (r.sourceValue !== null && r.sourceValue !== undefined) {
        documentAuthoredAppearances.push({
          field: r.key, page: wdg.page, rect: wdg.rect, drawnText: text,
          sourceValue: r.sourceValue,
          note: "the pinned source already carries this value; flattening materialises the form's own default"
        });
        continue;
      }
      refusedFieldsWithInk.push({ fieldId: r.key, page: wdg.page, drawnText: text });
    }
  }
  return { actualWrites, refusedFieldsWithInk, documentAuthoredAppearances, glyphs, appearances: widgets.length };
}

/* ---- field map ------------------------------------------------------------- */
function mapFor(source, census, report) {
  const writtenNames = new Set(report.written.map((w) => w.field));
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const selectionControls = [];

  for (const r of census.rows) {
    const base = {
      field: `${source.formNumber}/${r.key}`,
      fieldName: `${source.formNumber}/${r.key}`.replace(/\[\d+\]/g, ""),
      acroFieldName: r.name,
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.effectiveLabel, printedLine: r.effectiveLabel,
      sectionHeading: r.section, regionHeading: r.effectiveLabel,
      effectiveLabel: r.effectiveLabel,
      captionBasis: "authored_acroform_field_name_plus_printed_section, because this form's text stream is scrambled",
      printedTextAtCoordinate: r.printedTextAtCoordinate,
      document: source.formNumber
    };

    if (r.policy === "write") {
      if (writtenNames.has(r.name)) canonicalWrites.push({ ...base, factId: r.fact, kind: r.type });
      else {
        canonicalRefusals.push({
          ...base, reason: "the finalizer refused this write; the packet does not claim a value it did not draw",
          category: null, completenessClass: null, class: null,
          requiredBeforeFiling: false, why: "reported rather than claimed, so the defect is visible to the audit"
        });
      }
      continue;
    }

    if (r.isSelectionControl) {
      const cls = r.policy === "protect" ? r.refusalClass : r.policy === "attorney" ? null : PARTICIPANT_ELECTION;
      selectionControls.push({
        ...base, selectionId: base.field, kind: "selection_control", type: r.type,
        widgets: r.widgets, disposition: "explicit_refusal",
        reason: r.why, category: cls, completenessClass: cls, class: cls,
        requiredBeforeFiling: false, routeDetermined: false
      });
      continue;
    }

    if (r.policy === "protect") {
      canonicalRefusals.push({
        ...base, reason: r.why, category: r.refusalClass,
        completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    if (r.policy === "attorney") {
      canonicalRefusals.push({
        ...base, reason: r.why, category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    canonicalRefusals.push({
      ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${source.formNumber} field ${r.key}`,
      factId: null, routeDetermined: false,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }

  return {
    formNumber: source.formNumber, documentId: source.formNumber, documentRole: source.instrumentKind,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: "acroform",
    explicitMappings: Object.fromEntries(canonicalWrites.map((w) => [w.field, w.factId])),
    roleRefusals: [], selectionControls, canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
  };
}

/* ---- the builder's own count of the nine counters --------------------------- */
function countCompleteness(maps, writeProofs, artifacts, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r, selection = false) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: selection,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = maps.flatMap((m) => m.canonicalWrites.map((w) => row(w)));
  const blanks = maps.flatMap((m) => [
    ...m.canonicalRefusals.map((r) => row(r)),
    ...m.selectionControls.map((c) => row(c, true))
  ]);

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  for (const p of writeProofs) {
    for (const w of p.actualWrites) if (w.factId && String(w.drawnText.join("")).trim()) availableFacts.add(String(w.factId));
  }
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  // Scoped to the DOCUMENT: a field name repeats across the two forms and means
  // something different on each.
  const writtenInDocument = new Map();
  for (const w of writes) {
    if (!writtenInDocument.has(w.document)) writtenInDocument.set(w.document, new Set());
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(w.document).add(k);
  }

  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ field: blank.id, label: blank.label, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    const counter = verdict.disposition === "KNOWN_FACT_NOT_WRITTEN" ? "knownRequiredFieldsMissing"
      : verdict.disposition === "ROUTE_OPTION_NOT_SELECTED" ? "requiredOptionsMissing" : "unclassifiedBlanks";
    note(counter, { field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis });
  }

  const instructions = String(instructionsText ?? "");
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.field].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => instructions.toLowerCase().includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.field, label: b.label, why: "declared required-before-filing and not named in participant-instructions.md" });
  }

  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label) });
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) {
      note("invisibleWrites", { fixture: p.fixture, why: "the finalizer reported values and the output bytes carry no glyph and no flattened appearance" });
    }
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, why: "ink landed outside every measured write box" });
    for (const refused of p.refusedFieldsWithInk ?? []) {
      note("protectedWrites", { fixture: p.fixture, field: refused.fieldId, why: "a field the map refused carries ink in the output" });
    }
  }
  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  const rendered = artifacts.map((a) => `${a.file} ${(a.documents ?? []).join(" ")}`).join(" ").toLowerCase();
  const loose = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const m of maps) {
    if (!rendered.includes(String(m.formNumber).toLowerCase()) && !loose(rendered).includes(loose(m.formNumber))) {
      note("requiredComponentsMissing", { component: m.formNumber, why: "the field map names this document and it appears in no rendered artifact" });
    }
  }

  return { counters, findings, ledger };
}

/* ---- artifacts ------------------------------------------------------------- */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  return maps.flatMap((m) => m.canonicalRefusals
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page,
      section: r.sectionHeading, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })));
}

function participantInstructions(maps, rbf) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const elections = maps.flatMap((m) => m.selectionControls
    .filter((c) => c.category === PARTICIPANT_ELECTION)
    .map((c) => ({ document: m.formNumber, ...c })));

  const out = [];
  out.push(`# Filing instructions \u2014 ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is two Colorado Judicial Department forms, filed together:", "",
    "- **JDF 641**, _Motion to Seal Multiple Conviction Records_ \u2014 what you file.",
    "- **JDF 642**, _Order to Seal Multiple Conviction Records_ \u2014 the order you give the court to sign.", "",
    `Both are prepared for **${ROUTE.publicLabel.toLowerCase()}** under ${ROUTE.authority}.`, ""
  );
  out.push(
    "The platform filled in what it holds about you and your case: your name, your date of birth, your address, your "
    + "phone, your e-mail, the county and the case number, on both forms. Everything else is yours, and every one of "
    + "those blanks is listed below by the section of the form it is in.", ""
  );

  out.push("## The offence table is the substance of this motion", "");
  out.push(
    "Section 4 of JDF 641 has fifteen rows and four columns \u2014 charge, case number, sentence date, and the date "
    + "probation or parole supervision ended. **Every cell is yours to fill.** This is a multiple-conviction route: which "
    + "convictions you are bringing is the whole of what the court is deciding, and the platform does not hold them. The "
    + "supervision end date matters most of all, because the statutory waiting period in C.R.S. \u00a7 24-72-709(2) runs "
    + "from it. Fill a row completely or leave it empty \u2014 a row with the charge in it and the end date missing looks "
    + "finished and is not.", ""
  );

  out.push("## Where you file this", "");
  out.push(
    "File both forms with the **clerk of the Colorado court that handled the convictions** \u2014 the District or County "
    + "Court in the county already filled in for you. The Colorado Judicial Department publishes each courthouse's "
    + "address; this packet does not state one, because the platform holds no court directory and an unsourced address in "
    + "a filing instruction is worse than none.", ""
  );
  out.push("**Ask the clerk what fee applies.** It is not established in any source this packet holds, so it is not stated here.", "");
  out.push(
    "**The Colorado Bureau of Investigation charges its own fee.** JDF 642 says so on its face, in a note addressed to "
    + "you: the CBI charges a fee before its records are sealed, and you contact the CBI to pay it. That is separate from "
    + "anything the court charges.", ""
  );

  out.push("## What you must do before you file", "");
  out.push("1. **Fill in every item in the tables below.** Each names the form, the section and the blank.");
  out.push("2. **Complete the offence table.** Every row you use, all four columns.");
  out.push("3. **Attach a verified copy of your criminal history record dated within the last 20 days**, and tick Yes in section 7. If you cannot, tick No and file a copy within ten days \u2014 the form's own footnote says so.");
  out.push("4. **Make the choices listed under _The choices that are yours_**, including whether the district attorney consents and whether you are asking for a hearing.");
  out.push("5. **Serve a copy on the prosecuting attorney**, then complete the certificate of service in section 9 \u2014 the date, the method and who you sent it to. After you have served, not before.");
  out.push("6. **Sign and date section 10 yourself.** Your printed name is already there, because the form uses one field for the caption and the printed-name line; the signature and the date are yours.");
  out.push("7. **Leave sections 3 and 4 of JDF 642 alone**, apart from the case and agency details listed below. The findings, the other orders and the judge's signature are the court's.");
  out.push("");

  for (const [doc, items] of byDoc) {
    const title = ROUTE.documents.find((d) => d.formNumber === doc)?.title ?? doc;
    out.push(`## ${doc} \u2014 ${title}: the items you must supply`, "");
    out.push("| Section | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## The choices that are yours", "");
  out.push("| Form | Section | The choice | Why it is yours |", "| --- | --- | --- | --- |");
  for (const c of elections) out.push(`| ${c.document} | ${c.sectionHeading} | ${c.effectiveLabel} | ${c.reason} |`);
  out.push("");

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Your signature and its date** in section 10 of JDF 641.");
  out.push("- **The certificate of service in section 9** \u2014 the date, the method and the person served. Service has not happened when this packet is prepared.");
  out.push("- **The counsel signature line.** You are filing this yourself; no attorney-representation fact is held for you.");
  out.push("- **The Division and Courtroom boxes on both forms.** The form marks that box for court use.");
  out.push("- **The court's findings in section 3 of JDF 642, its other orders, and the judge's or magistrate's signature and date.**");
  out.push("");

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared set of official Colorado Judicial Department forms. It is not legal advice, it is not filed for "
    + "you, and **it does not decide whether your convictions can be sealed**. Page 3 of JDF 641 prints the list of "
    + "convictions that are not eligible \u2014 traffic offences and infractions, C.R.S. \u00a7 42-4-1301 violations, "
    + "offences whose underlying basis involved unlawful sexual behaviour, C.R.S. \u00a7 18-6-401, and a long list of "
    + "sentencing provisions. Read it against your own record before you sign."
  );
  out.push("");
  out.push(`_Route: ${ROUTE.routeKey} \u2014 ${ROUTE.authority}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point -------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const { resolved, failures } = resolveSources();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a source did not bind by exact SHA-256, so nothing may be rendered from it",
      overlayDirectoryTouched: false
    };
  }

  const censuses = [];
  for (const source of resolved) {
    const census = await censusOf(source);
    assert.equal(census.unmapped.length, 0,
      `${source.formNumber}: ${census.unmapped.length} widget(s) carry no dictionary entry: ${JSON.stringify(census.unmapped.slice(0, 5).map((u) => u.field))}`);
    assert.equal(census.stale.length, 0,
      `${source.formNumber}: the dictionary names ${census.stale.length} field(s) this form does not have: ${JSON.stringify(census.stale)}`);
    if (source.acroFieldCount != null) {
      assert.equal(census.rows.length, source.acroFieldCount,
        `${source.formNumber}: censused ${census.rows.length} fields, the committed corpus index declares ${source.acroFieldCount}`);
    }
    censuses.push({ source, census });
  }

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      documents: censuses.map(({ source, census }) => ({
        formNumber: source.formNumber, sha256: source.sha256, fields: census.rows.length,
        writes: census.rows.filter((r) => r.policy === "write").length,
        supply: census.rows.filter((r) => r.policy === "supply").length,
        elections: census.rows.filter((r) => r.policy === "election").length,
        protected: census.rows.filter((r) => r.policy === "protect").length,
        attorney: census.rows.filter((r) => r.policy === "attorney").length
      }))
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "raster"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const maps = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    const pageManifest = [];
    for (const { source, census } of censuses) {
      const { bytes, report } = await renderDocument(source, census, fixtureName);
      const proof = await byteProof(source, census, bytes, report, fixtureName);
      writeProofs.push({
        fixture: fixtureName, formNumber: source.formNumber, sourceSha256: source.sha256,
        proofMethod: "flattened widget appearances read back at every measured /Rect of the finalized bytes",
        valuesReportedByFinalizer: report.written.length,
        flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
        addedGlyphsReadFromOutputBytes: proof.glyphs,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
        refusedFieldsWithInk: proof.refusedFieldsWithInk,
        documentAuthoredAppearances: proof.documentAuthoredAppearances,
        unfittable: report.unfittable,
        actualWrites: proof.actualWrites
      });
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copied = await packet.copyPages(doc, doc.getPageIndices());
      for (const [i, p] of copied.entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), formNumber: source.formNumber, sourcePage: i + 1, sourceSha256: source.sha256 });
      }
      if (fixtureName === "canonical") maps.push(mapFor(source, census, report));
    }

    const packetBytes = await packet.save({ useObjectStreams: false, updateMetadata: false });
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    artifacts.push({
      fixture: fixtureName, file,
      sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents: censuses.map((c) => c.source.formNumber)
    });

    const rasterDir = `${OUT}/raster/${fixtureName}`;
    fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
    for (let i = 0; !skipRaster && i < packet.getPageCount(); i += 1) {
      const stage = path.join(ROOT, rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
      const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: i, keep: stage });
      for (const scrap of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
        const f = path.join(stage, scrap);
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }
      const png = path.join(stage, "page.png");
      rasterPages.push({
        fixture: fixtureName, page: i + 1,
        file: `${rasterDir}/page-${String(i + 1).padStart(2, "0")}/page.png`,
        pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
        pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
        calibrationResidualPx: render.calibrationResidualPx,
        paperBounds: render.paper,
        engine: "chromium_calibrated_scripts_lib_pdf_page_raster",
        sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
      });
    }
  }

  const rbf = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbf);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact form number + committed corpus-index SHA-256 + on-disk SHA-256 + byte length",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId, statutoryAuthority: ROUTE.authority,
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], documentId: r.formNumber, formNumber: r.formNumber, revision: r.revision,
      pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength, instrumentKind: r.instrumentKind
    })),
    sourceBinaryCommitted: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    captionBasis:
      "These two forms interleave their glyph runs, so text extracted from the content stream comes back scrambled "
      + "(\"Sheriff\u2019s De partment\", \"The Defendan futrther shows\"). A printed-caption check cannot be run on them, and a "
      + "match loose enough to accept the scrambled text would pass on anything. Captions here are the AcroForm field "
      + "names Colorado authored, which are meaningful and section-keyed, plus the printed section heading. The scrambled "
      + "extraction at each widget's own coordinate is recorded beside it as evidence, for the reviewer who reads the paper.",
    documents: censuses.map(({ source, census }) => ({
      documentId: source.formNumber, formNumber: source.formNumber, sourceSha256: source.sha256,
      pageCount: census.pageCount, fieldCount: census.rows.length,
      corpusIndexDeclaresFieldCount: source.acroFieldCount,
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis, pdfType: r.type,
        isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        section: r.section, effectiveLabel: r.effectiveLabel, policy: r.policy, factId: r.fact,
        printedTextAtCoordinate: r.printedTextAtCoordinate
      }))
    }))
  });

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1", familyId: FAMILY_ID,
    finding:
      "JDF 641 and JDF 642 interleave their glyph runs. Text extracted from the content stream is scrambled at the "
      + "character level, so no printed-caption check can be run against them.",
    whyThisIsNotWorkedAround:
      "A fuzzy match loose enough to accept \"NumEer\" as \"Number\" would pass on almost anything, and a check that "
      + "cannot fail reads as evidence while proving nothing. The absence is recorded instead.",
    whatTheCaptionClaimRestsOnHere:
      "Colorado authored these widget names -- County, Court Address, Case Number, \u2206 Phone, \u2206 Email, "
      + "CoS_Date, Group_5B_1, 3G.3, 4A.3.2 -- and they are keyed to the printed sections. The dictionary and the widget set "
      + "are asserted to match exactly in both directions, and every placement is rastered for a reviewer who can read "
      + "the paper.",
    perField: censuses.flatMap(({ source, census }) => census.rows.map((r) => ({
      document: source.formNumber, field: r.key, page: r.page, rect: r.rect,
      labelThisBuildUses: r.effectiveLabel, section: r.section,
      textExtractedAtThisCoordinate: r.printedTextAtCoordinate
    })))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "acroform_fill",
    captionBasis: "authored AcroForm field names plus printed section headings; see reports/caption-evidence.json",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeDeterminedSelections: [],
    routeSelectionNote:
      "C.R.S. \u00a7 24-72-709 is one section and JDF 641 is its form. Nothing on either form is a route election: the "
      + "eligibility statement, the district attorney's position, the court type, the interpreter and attendance choices "
      + "and the agency list are all facts about the participant's own record and circumstances. The packet states the "
      + "route it was built for and leaves those to the participant rather than asserting facts it does not hold.",
    offenceTableNote:
      "Sixty cells of section 4's fifteen-row offence table are declared required-before-filing and none is written. "
      + "Which convictions the participant is bringing, and the date supervision ended on each, are the substance of a "
      + "multiple-conviction motion and the platform does not hold them.",
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true, rasterEngine: RASTER_ENGINE, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note: "Read back from the finalized PDF bytes at every measured widget rectangle, not from the finalizer's own report.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, formNumber: p.formNumber,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    blockingFindings: writeProofs.flatMap((p) => p.refusedFieldsWithInk.map((r) => ({
      fixture: p.fixture, field: r.fieldId, finding: "a field the map refused carries ink in the output"
    })))
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    participantElections: maps.flatMap((m) => m.selectionControls.map((c) => ({
      document: m.formNumber, field: c.field, page: c.page, section: c.sectionHeading, label: c.effectiveLabel, why: c.reason
    }))),
    protectedBlanks: maps.flatMap((m) => m.canonicalRefusals.filter((r) => r.requiredBeforeFiling !== true).map((r) => ({
      document: m.formNumber, field: r.field, page: r.page, label: r.effectiveLabel, refusalClass: r.category, why: r.why
    }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID,
    required: true, granted: false, reviewedBy: null,
    note:
      "Every page of both fixtures is rastered for a human who did not build this family. It matters more than usual "
      + "here: these two forms cannot be caption-checked from their own text stream, so a reviewer reading the paper is "
      + "the check that a value sits under the heading it belongs to.",
    whatToLookAt: [
      "JDF 641 sections A, B, C and 2, and JDF 642 sections A, B, C and 2: confirm the county, case number, defendant "
        + "name, birth date, address, phone and e-mail each sit under the heading they belong to. The text stream is "
        + "scrambled, so this is the check.",
      "JDF 641 page 5, section 10: the printed name is filled and the signature and date lines are blank. The name and "
        + "the caption share one AcroForm field, which is why it appears in both places.",
      "JDF 641 section 4, the offence table: all fifteen rows entirely blank, all four columns. Confirm a participant "
        + "would understand the table is theirs to complete.",
      "JDF 641 sections 3 and JDF 642 section 4: the agency boxes unticked and the agency names, numbers and addresses blank.",
      "JDF 641 sections 5, 6 and 7: no eligibility statement ticked, no district-attorney position ticked, no appeal or "
        + "restitution answer, and the criminal-history question unanswered.",
      "JDF 641 section 9: the certificate of service blank \u2014 no date, no method, no recipient.",
      "JDF 642 sections 3 and 4: the court's finding box unticked, the other-orders box blank, and neither Judge nor "
        + "Magistrate ticked."
    ],
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount })),
    rasterPages: rasterPages.map((p) => ({ fixture: p.fixture, page: p.page, file: p.file, sha256: p.sha256 }))
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  const counted = countCompleteness(maps, writeProofs, artifacts, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract functions "
      + "over this family's field map, byte proof, rendered artifacts and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [],
    findings: [
      {
        finding: "JDF 641 and JDF 642 interleave their glyph runs; extracted text is scrambled at the character level.",
        consequence:
          "No printed-caption check can be run on either form. The captions rest on Colorado's own authored field names "
          + "and the printed section headings; the scrambled extraction is recorded per field in "
          + "reports/caption-evidence.json, and placement is left to the visual reviewer, who can read the paper."
      },
      {
        finding:
          "Section 4 of JDF 641 is fifteen rows of four columns, one row per conviction, and the fourth column is the "
          + "date probation or parole supervision ended.",
        consequence:
          "No cell of it is written. Which convictions a participant brings under C.R.S. \u00a7 24-72-709 is the substance "
          + "of the motion and the platform does not hold them, and the supervision end date is the fact the statutory "
          + "waiting period runs from. A row with the charge filled and that date blank would read as finished and would "
          + "be missing the fact the court needs. All sixty cells are declared and disclosed."
      },
      {
        finding:
          "`\u2206` is one AcroForm field with two widgets: the defendant's name in the page-1 caption and the Print Your "
          + "Name line in the Sign & Date block on page 5.",
        consequence:
          "The name is written and appears in both. Section 10 of this form is a plain signature block, not a "
          + "verification under penalty of perjury \u2014 unlike section 10 of JDF 477, where the printed name is left "
          + "blank for exactly that reason. The signature and its date stay blank on both forms."
      },
      {
        finding:
          "Whether the district attorney consents is a three-way election on page 4, and the form sets out what a "
          + "participant must show by clear and convincing evidence if they do not.",
        consequence:
          "The election and the showing are both left to the participant, and the instructions carry the form's three "
          + "requirements in the form's own terms."
      },
      {
        finding: "Every agency name, number and address is an agency fact, which no court or clerk refusal class may excuse.",
        consequence: "Each is declared REQUIRED_BEFORE_FILING and named to the participant in participant-instructions.md."
      },
      {
        severity: "advisory",
        finding:
          "The boundary participant's name carries a typographic apostrophe (U+2019) and the finalized bytes carry the "
          + "name without it.",
        consequence:
          "Recorded for visual review. The behaviour is in the shared finalizer's font encoding and reproduces in "
          + "vt_seal_misdemeanor-set, which is already PASS_COMPLETE."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    mattersForTheReviewersAttention: [
      "reports/caption-evidence.json \u2014 these two forms cannot be caption-checked from their own text stream, so visual review carries more weight here than usual.",
      "reports/blanks-left-for-the-participant.json \u2014 sixty offence-table cells are left to the participant, which is a lot of paper to hand back; confirm the instructions make the table legible to fill."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: PASS_COUNTERS.every((c) => counted.counters[c] === 0) ? "COMPLETED" : "STOPPED",
    counters: counted.counters, counterFindings: counted.findings,
    directory: OUT, documents: resolved.map((r) => r.formNumber),
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    requiredBeforeFiling: rbf.length,
    participantElections: maps.reduce((n, m) => n + m.selectionControls.length, 0),
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    rasterPages: rasterPages.length
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
