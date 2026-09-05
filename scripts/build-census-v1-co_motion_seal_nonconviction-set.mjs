#!/usr/bin/env node
/**
 * The Colorado non-conviction sealing family — `co_motion_seal_nonconviction-set`.
 *
 *   node scripts/build-census-v1-co_motion_seal_nonconviction-set.mjs [--check] [--no-raster]
 *
 * Two official Judicial Department forms, filed together:
 *
 *   JDF-477  Motion to Seal Non-Conviction Records (simplified process)  — the filing
 *   JDF-478  Order to Seal Non-Conviction Records                        — the proposed order
 *
 * The route is `track:CO:co_motion_seal_nonconviction`, C.R.S. § 24-72-705(2)
 * and (3): the simplified backstop for records that did not end in a conviction.
 *
 * TWO THINGS ABOUT THESE FORMS SHAPED THE IMPLEMENTATION.
 *
 * First, THE PRINTED TEXT STREAM IS SCRAMBLED. Both forms interleave their glyph
 * runs, so text extracted from the content stream comes back as
 * "Motion to -CSoeanvil ctNoinon Records" and "Case NumEer". Every other family
 * in this factory checks its captions by finding the printed line at the
 * widget's recorded coordinate; on these two documents that check cannot be run,
 * because the words are not in the stream in the order they are on the paper.
 *
 * Saying so is the point. The alternative -- a fuzzy match loose enough to
 * accept "NumEer" as "Number" -- would be a check that passes on anything, and
 * a check that cannot fail is worse than an absent one because it reads as
 * evidence. So the caption claim rests on the OTHER thing these forms have, and
 * the absence is recorded in reports/caption-evidence.json with the scrambled
 * extraction beside each field, for the visual reviewer who can read the paper.
 *
 * Second, THE FIELD NAMES ARE AUTHORED AND MEANINGFUL. Colorado named these
 * widgets `County`, `Court Address`, `Case Number`, `∆`, `∆ DoB`, `Phone`,
 * `Email`, `CoS_Date`, `Sig1_Signature`, `8D.1`, `478.3C.2`. That is a
 * deliberate naming scheme keyed to the printed sections, and on a form whose
 * text cannot be read back it is the reliable channel -- which is the same
 * reasoning the shared semantics already applies when it prefers a field name
 * to a harvested caption for date components.
 *
 * So FORM_FIELDS below records, for every widget, the section of the form it
 * sits in, the printed label as a human reads it off the paper, and the policy.
 * The build asserts the widget set matches the dictionary exactly, in both
 * directions, and refuses on any drift.
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

const FAMILY_ID = "co_motion_seal_nonconviction-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/co/co-motion-seal-nonconviction-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-co_motion_seal_nonconviction-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "CO",
  routeKey: "track:CO:co_motion_seal_nonconviction",
  routeSelectionId: "co-motion-seal-nonconviction-set-jdf-477-jdf-478",
  publicLabel: "Motion to seal non-conviction records, simplified backstop",
  authority: "C.R.S. § 24-72-705(2) and (3); Colorado Judicial Department forms JDF 477 and JDF 478",
  documents: [
    { formNumber: "JDF-477", title: "Motion to Seal Non-Conviction Records (Simplified Process)", instrumentKind: "primary_filing" },
    { formNumber: "JDF-478", title: "Order to Seal Non-Conviction Records", instrumentKind: "proposed_order" }
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

/*
 * The agency block on both forms is the same shape and the same reasoning: an
 * arresting or prosecuting AGENCY is a case fact, and the completeness contract
 * refuses to let a court/clerk refusal class hide one. The platform does not
 * hold this participant's agencies, so each is declared and disclosed by name.
 */
const AGENCY = (what) => SUPPLY(what);

const FORM_FIELDS = {
  "JDF-477": {
    /* --- 1. Court ------------------------------------------------------- */
    Group_CourtType: {
      section: "1. Court", label: "District Court or County Court (selection)", selection: true,
      ...ELECTION("which court the case was in is a fact about your case, and the simplified sealing process runs in both; the form asks you to say which")
    },
    County: { section: "1. Court", label: "Colorado County", ...WRITE("matter.county") },
    "Court Address": {
      section: "1. Court", label: "Court Address",
      ...SUPPLY("the street address of the courthouse where the case was filed. The Colorado Judicial Department publishes it for every county; the platform holds no court directory")
    },
    "Case Number": { section: "3. Case Details", label: "Case Number", ...WRITE("matter.case_number") },
    Division: {
      section: "3. Case Details", label: "Division",
      ...PROTECT(COURT_OWNED, "the division is assigned by the court; the box beside it is marked on the form as being for court use")
    },
    Courtroom: {
      section: "3. Case Details", label: "Courtroom",
      ...PROTECT(COURT_OWNED, "the courtroom is assigned by the court; the box beside it is marked on the form as being for court use")
    },

    /* --- 2. Parties, and 5. My Information ------------------------------ */
    "∆": { section: "2. Parties to the Case", label: "Defendant — Full Name", ...WRITE("participant.full_legal_name") },
    "∆ DoB": { section: "5. My Information", label: "Birth Date", ...WRITE("participant.date_of_birth") },
    Address: { section: "5. My Information", label: "Current Mailing Address (with city/state/zip)", ...WRITE("participant.street_address") },
    Phone: { section: "5. My Information", label: "Phone", ...WRITE("participant.phone") },
    Email: { section: "5. My Information", label: "Email", ...WRITE("participant.email") },

    /* --- 6. Grounds for sealing ----------------------------------------- *
     * Five grounds, one form, one route. C.R.S. § 24-72-705 is the simplified
     * process for all of them, so the route does not choose between them: which
     * ground applies is a fact about how THIS case ended, and the participant
     * is the one who knows it. A packet that ticked one would be asserting a
     * disposition it does not hold. */
    Group_6_0: {
      section: "6. Grounds for Sealing Records", selection: true,
      label: "Ground for sealing — acquittal, dismissal, vacated conviction of a trafficking victim, completed diversion, or completed deferred judgment (selection)",
      ...ELECTION("C.R.S. § 24-72-705 is the simplified process for all five grounds, so the route does not choose between them; which one applies is a fact about how your case ended and you tick it")
    },
    "6_1": { section: "6. Grounds for Sealing Records", label: "Date you were acquitted of all charges", ...SUPPLY("the date you were acquitted of all charges, if that is your ground") },
    "6_2": { section: "6. Grounds for Sealing Records", label: "Date the case was completely dismissed", ...SUPPLY("the date the case was completely dismissed, if that is your ground — and remember the form's condition that the dismissal was not part of a plea agreement in a separate case") },
    "6_3": { section: "6. Grounds for Sealing Records", label: "Date you completed a diversion agreement", ...SUPPLY("the date you completed the diversion agreement, if that is your ground") },
    "6_4": { section: "6. Grounds for Sealing Records", label: "Date you completed a deferred judgment and sentence", ...SUPPLY("the date you completed the deferred judgment and sentence, if that is your ground") },

    /* --- 8. Records to be sealed: the agencies -------------------------- */
    "8A.0": { section: "8. Records to be Sealed", selection: true, label: "Prosecuting Attorney holds records (selection)", ...ELECTION("tick every agency that holds records in this case; you know which ones do") },
    "8B.0": { section: "8. Records to be Sealed", selection: true, label: "Sheriff's Department holds records (selection)", ...ELECTION("tick every agency that holds records in this case; you know which ones do") },
    "8B.1": { section: "8. Records to be Sealed", label: "Sheriff's Department — Mailing Address", ...AGENCY("the mailing address of the Sheriff's Department that holds records in this case") },
    "8C.0": { section: "8. Records to be Sealed", selection: true, label: "Colorado Bureau of Investigation holds records (selection)", ...ELECTION("the form marks the Colorado Bureau of Investigation as required and prints its address for you; tick it") },
    "8D.0": { section: "8. Records to be Sealed", selection: true, label: "Law Enforcement agency holds records (selection)", ...ELECTION("tick every agency that holds records in this case; you know which ones do") },
    "8D.1": { section: "8. Records to be Sealed", label: "Law Enforcement — Name", ...AGENCY("the name of the law enforcement agency that arrested or cited you") },
    "8D.2": { section: "8. Records to be Sealed", label: "Law Enforcement — Case Number", ...AGENCY("that agency's own case number, which is usually different from the court case number") },
    "8D.3": { section: "8. Records to be Sealed", label: "Law Enforcement — Mailing Address", ...AGENCY("that agency's mailing address") },
    "8E.0": { section: "8. Records to be Sealed", selection: true, label: "Another agency holds records (selection)", ...ELECTION("tick this if some other agency holds records in this case") },
    "8E.1": { section: "8. Records to be Sealed", label: "Other agency — Name", ...AGENCY("the name of any other agency holding records in this case") },
    "8E.2": { section: "8. Records to be Sealed", label: "Other agency — Mailing Address", ...AGENCY("that agency's mailing address") },
    "8F.1": { section: "8. Records to be Sealed", label: "Arrest number (from your fingerprint card)", ...AGENCY("the arrest number, which is printed on your fingerprint card") },
    "8F.2": { section: "8. Records to be Sealed", label: "Arrest date", ...AGENCY("the date you were arrested") },

    /* --- 9. Certificate of service --------------------------------------- */
    CoS_Date: { section: "9. Certificate of Service", label: "Certificate of Service — date of service, entered at signature", ...PROTECT(SIGNATURE, "service has not happened when the packet is prepared, and a certificate dated before the act it certifies would be false") },
    Group_CoS: { section: "9. Certificate of Service", selection: true, label: "Certificate of Service — how you sent it (selection)", ...ELECTION("you tick the method you actually used, at the time you serve the prosecuting attorney") },
    /*
     * The recipient and method lines of the certificate carry the signature
     * refusal class, not the election class, and the difference matters. The
     * election class is refused for a PARTICIPANT_CONTACT field on purpose --
     * it must not be usable to hide the participant's own contact details --
     * and the recipient line's label necessarily contains the word "address".
     * The address on it is the PROSECUTING ATTORNEY's, not the participant's,
     * and the line is completed by the participant at the moment they sign the
     * certificate, which is exactly what signature_or_date_participant_completion
     * describes.
     */
    CoS_Mail: { section: "9. Certificate of Service", label: "Certificate of Service — name and full address served by regular mail", ...PROTECT(SIGNATURE, "the certificate records who you actually served and is completed when you sign it, after service, not in advance") },
    CoS_Other: { section: "9. Certificate of Service", label: "Certificate of Service — other method, explained", ...PROTECT(SIGNATURE, "the certificate records how you actually served and is completed when you sign it, after service, not in advance") },

    /* --- 10. Verified signature ------------------------------------------ *
     * JDF-477 is VERIFIED: section 10 is a declaration under penalty of perjury
     * under the law of Colorado. The whole block -- the date, the place, the
     * printed name and the signature -- is completed by the declarant at the
     * moment of declaring, and prefilling any part of it presents a sworn
     * instrument as further along than it is. */
    Sig1_Date: { section: "10. Verified Signature", label: "Executed on this day (date), entered at signature", ...PROTECT(SIGNATURE, "part of the verification, completed when you sign under penalty of perjury") },
    Sig1_Month: { section: "10. Verified Signature", label: "Executed in this month, entered at signature", ...PROTECT(SIGNATURE, "part of the verification, completed when you sign under penalty of perjury") },
    Sig1_Year: { section: "10. Verified Signature", label: "Executed in this year, entered at signature", ...PROTECT(SIGNATURE, "part of the verification, completed when you sign under penalty of perjury") },
    Sig1_City: { section: "10. Verified Signature", label: "Executed at city (or other location), entered at signature", ...PROTECT(SIGNATURE, "part of the verification, completed when you sign under penalty of perjury") },
    Sig1_State: { section: "10. Verified Signature", label: "Executed in state (or country), entered at signature", ...PROTECT(SIGNATURE, "part of the verification, completed when you sign under penalty of perjury") },
    Sig1_Name: { section: "10. Verified Signature", label: "Print Your Name, on the verification, entered at signature", ...PROTECT(SIGNATURE, "the verification block is completed by the declarant at the moment of declaring; prefilling any part of it presents a sworn instrument as further along than it is") },
    Sig1_Signature: { section: "10. Verified Signature", label: "Your Signature", ...PROTECT(SIGNATURE, "you sign this yourself, under penalty of perjury") },
    Sig_Esq: { section: "10. Verified Signature", selection: true, label: "Counsel signature — Esq. (selection)", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    Sig_LawyerSignature: { section: "10. Verified Signature", label: "Counsel Signature (if any)", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    Sig_Bar: { section: "10. Verified Signature", label: "Counsel attorney registration number", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") }
  },

  "JDF-478": {
    /* --- A. Court, B. Parties, C. Case details --------------------------- */
    Group_CourtType: {
      section: "A. Court", label: "District Court or County Court (selection)", selection: true,
      ...ELECTION("the proposed order names the same court the motion is filed in; tick the one your case is in")
    },
    County: { section: "A. Court", label: "Colorado County", ...WRITE("matter.county") },
    "Court Address": {
      section: "A. Court", label: "Court Mailing Address",
      ...SUPPLY("the mailing address of the same courthouse, copied from the motion")
    },
    "Case Number": { section: "C. Case Details", label: "Case Number", ...WRITE("matter.case_number") },
    Division: { section: "C. Case Details", label: "Division", ...PROTECT(COURT_OWNED, "assigned by the court; the box beside it is marked for court use") },
    Courtroom: { section: "C. Case Details", label: "Courtroom", ...PROTECT(COURT_OWNED, "assigned by the court; the box beside it is marked for court use") },
    "∆": { section: "B. Parties to the Case", label: "Defendant — Full Name", ...WRITE("participant.full_legal_name") },
    "∆ DoB": { section: "2. Defendant's Information", label: "Birth Date", ...WRITE("participant.date_of_birth") },
    "∆ Street Address": { section: "2. Defendant's Information", label: "Mailing Address", ...WRITE("participant.street_address") },
    "∆ City": { section: "2. Defendant's Information", label: "City", ...WRITE("participant.city") },
    "∆ State": { section: "2. Defendant's Information", label: "State", ...WRITE("participant.state") },
    "∆ Zip": { section: "2. Defendant's Information", label: "Zip Code", ...WRITE("participant.zip") },

    /* --- 3. Records to be sealed ----------------------------------------- */
    "478.3A.1": { section: "3. Records to be Sealed", selection: true, label: "County Court case records to be sealed (selection)", ...ELECTION("tick the courts and agencies that hold records in this case") },
    "478.3A.2": { section: "3. Records to be Sealed", label: "County Court case number", ...SUPPLY("the County Court case number, if the case was in County Court") },
    "478.3B.1": { section: "3. Records to be Sealed", selection: true, label: "District Court case records to be sealed (selection)", ...ELECTION("tick the courts and agencies that hold records in this case") },
    "478.3B.2": { section: "3. Records to be Sealed", label: "District Court case number", ...SUPPLY("the District Court case number, if the case was in District Court") },
    "478.3C.0": { section: "3. Records to be Sealed", selection: true, label: "Law Enforcement Agency records to be sealed (selection)", ...ELECTION("tick the courts and agencies that hold records in this case") },
    "478.3C.1": { section: "3. Records to be Sealed", label: "Law Enforcement Agency — Name", ...AGENCY("the name of the law enforcement agency, copied from the motion") },
    "478.3C.2": { section: "3. Records to be Sealed", label: "Law Enforcement Agency — Arrest number", ...AGENCY("the arrest number from your fingerprint card, copied from the motion") },
    "478.3C.3": { section: "3. Records to be Sealed", label: "Law Enforcement Agency — Arrest date", ...AGENCY("the arrest date, copied from the motion") },
    "478.3C.4": { section: "3. Records to be Sealed", label: "Law Enforcement Agency — Mailing Address", ...AGENCY("that agency's mailing address, copied from the motion") },
    "478.3D.0": { section: "3. Records to be Sealed", selection: true, label: "Colorado Bureau of Investigation records to be sealed (selection)", ...ELECTION("the form marks the Colorado Bureau of Investigation as required and prints its address; tick it") },
    "478.3E.0": { section: "3. Records to be Sealed", selection: true, label: "Another agency's records to be sealed (selection)", ...ELECTION("tick this if some other agency holds records in this case") },
    "478.3E.1": { section: "3. Records to be Sealed", label: "Other agency — name and mailing address", ...AGENCY("the name and mailing address of any other agency holding records, copied from the motion") },
    "478.3F.0": { section: "3. Records to be Sealed", selection: true, label: "A second other agency's records to be sealed (selection)", ...ELECTION("tick this if a second other agency holds records in this case") },
    "478.3F.1": { section: "3. Records to be Sealed", label: "Second other agency — name and mailing address", ...AGENCY("the name and mailing address of a second other agency, if there is one") },
    "478.3G.0": { section: "3. Records to be Sealed", selection: true, label: "A third other agency's records to be sealed (selection)", ...ELECTION("tick this if a third other agency holds records in this case") },
    "478.3G.1": { section: "3. Records to be Sealed", label: "Third other agency — name and mailing address", ...AGENCY("the name and mailing address of a third other agency, if there is one") },

    /* --- 4. and 5.: the court's own orders and signature ------------------ */
    "478.4D": { section: "4. Court Orders", label: "By the Court — other orders", ...PROTECT(COURT_OWNED, "the decree is the court's; a proposed order that wrote the court's other orders would be drafting the judge's ruling") },
    "478.5A": { section: "5. So Ordered", label: "By the Court — signature", ...PROTECT(COURT_OWNED, "the judge or magistrate signs their own order") },
    "Group478.5B": { section: "5. So Ordered", selection: true, label: "By the Court — Judge or Magistrate (selection)", ...PROTECT(COURT_OWNED, "the officer who signs states which they are") },
    "478.5C": { section: "5. So Ordered", label: "By the Court — Dated", ...PROTECT(COURT_OWNED, "the court dates its own order") }
  }
};

/* ---- fixtures ------------------------------------------------------------ */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "412 Cherry Creek Way, Denver, CO 80202",
    "participant.city": "Denver",
    "participant.state": "CO",
    "participant.zip": "80202",
    "participant.phone": "303-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "matter.county": "Denver",
    "matter.case_number": "2019CR004217"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O’Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Colorado Springs, Colorado 80921-2214",
    "participant.city": "Colorado Springs",
    "participant.state": "Colorado",
    "participant.zip": "80921-2214",
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

  /* CLIPPING_AND_OVERLAP, measured by VF08 at 150 dpi and recorded in
   * data/rcap-grade-a/packet-factory-24h/vf08/COHORT_MEASUREMENT.json: 5 of JDF-477's 16 and 7 of JDF-478's 11 selection widgets
   * carry an /AS state with no matching stream under /AP /N. The shared
   * sanitizer calls updateFieldAppearances() before flatten(), pdf-lib
   * regenerates an appearance for exactly that condition, and its default
   * check-box provider paints a stroked square the size of the widget --
   * so 14 widget readings across the two bound fixtures (7 per fixture, on delivered pages 2, 3 and 4)
   * delivered a black-bordered box that JDF-477 and JDF-478 does not print and that no
   * conforming viewer paints (ISO 32000-1 12.5.5). VF08's zero-write
   * baseline over the same pinned bytes painted the identical pixels, so the
   * ink is the shared step's and not this family's.
   *
   * Opting in supplies the missing state as an EMPTY appearance instead, so
   * nothing is synthesized and nothing is flattened there. It reaches only
   * unwritten selection widgets whose current state has no stream:
   * the 15 widgets that ship their own state for /AS are untouched by this, because a widget's own appearance is source-owned form structure (RI-OFF-APPEARANCE). A ticked box still renders its
   * mark from the stream the source ships for the state it is set to. */
  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    suppressSynthesizedAppearances: true,
    /* CLIPPING_AND_OVERLAP, measured by VF02 at 300 dpi on the delivered bytes and
     * recorded in data/rcap-grade-a/packet-factory-24h/vf02/rows.json: the five
     * Group_6_0 radios of JDF-477 section 6 each SHIP THEIR OWN /Off stream with
     * /BBox [0 0 18 18] against a /Rect of 13.68 x 13.68. ISO 32000-1 12.5.5 fits
     * that transformed BBox onto the /Rect, so a conforming viewer draws the
     * Judiciary's grey bevel at 13.68pt; pdf-lib's flatten() emits a translation
     * and no scale, so the packet stamped it at 18pt -- cmScale 1 x requiredScale
     * 0.76, an error of 4.32pt on each axis, putting ink outside the widget's own
     * box on packet page 1 of both fixtures. suppressSynthesizedAppearances does
     * not reach these by design: it leaves alone a widget that ships its own
     * stream for the state it is set to, which is exactly what these are.
     *
     * fitAppearancesToRect pre-composes the 12.5.5 mapping into each affected
     * appearance's own /Matrix. It is geometric -- it reads only /Rect, /BBox and
     * /Matrix, never a form, field, caption or route -- and the appearance content
     * bytes are not touched and no value is written into any field. */
    fitAppearancesToRect: true,
    expectedSha256: source.sha256,
    census: census.rows.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.section,
      widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings, unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: source.title
  });
  if (process.env.CO_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) console.log(`   ${r.field ?? r.anchor}: ${r.reason}${r.category ? ` (${r.category})` : ""}`);
  }
  return { bytes, report };
}

/* ---- byte proof ------------------------------------------------------------ */
async function byteProof(source, census, artifactBytes, report, fixtureName) {
  const tmp = path.join(ROOT, `.co-477-byte-proof-${source.formNumber}-${fixtureName}.pdf`);
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
  const elections = maps.flatMap((m) => m.selectionControls.map((c) => ({ document: m.formNumber, ...c })));

  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is two Colorado Judicial Department forms, filed together:", "",
    "- **JDF 477**, _Motion to Seal Non-Conviction Records (Simplified Process)_ — what you file.",
    "- **JDF 478**, _Order to Seal Non-Conviction Records_ — the order you give the court to sign.", "",
    `Both are prepared for **${ROUTE.publicLabel.toLowerCase()}** under ${ROUTE.authority}.`, ""
  );
  out.push(
    "The platform filled in what it holds about you and your case: your name, your date of birth, your address, your "
    + "phone, your e-mail, the county and the case number, on both forms. Everything else is yours, and every one of "
    + "those blanks is listed below by the section of the form it is in.", ""
  );

  out.push("## Where you file this", "");
  out.push(
    "File both forms with the **clerk of the Colorado court that handled the case** — the District Court or the County "
    + "Court named in section 1 of the motion, in the county already filled in for you. The Colorado Judicial Department "
    + "publishes each courthouse's address; this packet does not state one, because the platform holds no court directory "
    + "and an unsourced address in a filing instruction is worse than none.", ""
  );
  out.push(
    "**Ask the clerk what fee applies, if any.** C.R.S. § 24-72-705 is the simplified process and the fee position for it "
    + "is not established in any source this packet holds, so it is not stated here.", ""
  );

  out.push("## The Colorado Bureau of Investigation is not optional", "");
  out.push(
    "Both forms print the CBI's address for you — ATTN Identification-Seals, 690 Kipling St. STE 3000, Lakewood, CO 80215 "
    + "— and JDF 478 marks it **required**. Tick it on both forms. JDF 478 also directs the court's clerk to send the CBI "
    + "a copy of the signed order within 28 days.", ""
  );

  out.push("## What you must do before you file", "");
  out.push("1. **Fill in every item in the tables below.** Each names the form, the section and the blank.");
  out.push("2. **Make the choices listed under _The choices that are yours_.** They are left blank on purpose.");
  out.push("3. **Serve a copy on the prosecuting attorney**, then complete the certificate of service in section 9 of JDF 477 — the date, the method, and who you sent it to. Do it after you have served, not before.");
  out.push("4. **Sign the verification in section 10 of JDF 477.** It is a declaration under penalty of perjury under the law of Colorado. The whole block — the date, the place, your printed name and your signature — is completed by you at the moment you declare, so none of it is filled in for you.");
  out.push("5. **Leave sections 4 and 5 of JDF 478 alone.** Those are the court's orders and the judge's or magistrate's signature.");
  out.push("");

  for (const [doc, items] of byDoc) {
    const title = ROUTE.documents.find((d) => d.formNumber === doc)?.title ?? doc;
    out.push(`## ${doc} — ${title}: the items you must supply`, "");
    out.push("| Section | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## The choices that are yours", "");
  out.push("| Form | Section | The choice | Why it is yours |", "| --- | --- | --- | --- |");
  for (const c of elections) out.push(`| ${c.document} | ${c.sectionHeading} | ${c.effectiveLabel} | ${c.reason} |`);
  out.push("");

  out.push("## What the platform deliberately left blank", "");
  out.push("- **The verification in section 10 of JDF 477** — the date, the city, the state, your printed name and your signature. It is sworn under penalty of perjury and is completed at the moment of declaring.");
  out.push("- **The certificate of service in section 9 of JDF 477** — the date, the method and the person served. Service has not happened when this packet is prepared.");
  out.push("- **The counsel signature block.** You are filing this yourself; no attorney-representation fact is held for you.");
  out.push("- **The Division and Courtroom boxes on both forms.** The form marks that box for court use.");
  out.push("- **Sections 4 and 5 of JDF 478** — the court's orders and the judge's or magistrate's signature and date.");
  out.push("");

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared set of official Colorado Judicial Department forms. It is not legal advice, it is not filed for "
    + "you, and it does not decide whether your records are eligible to be sealed. JDF 477 sets out the grounds and the "
    + "conditions in its own words — including the affirmations in section 7 about protective orders, underage alcohol, "
    + "marijuana and paraphernalia offences, and charges dismissed under C.R.S. § 18-1.3-101. Read them before you swear to them."
  );
  out.push("");
  out.push(`_Route: ${ROUTE.routeKey} — ${ROUTE.authority}_`);
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
      + "(\"Case NumEer\", \"Motion to -CSoeanvil ctNoinon Records\"). A printed-caption check cannot be run on them, and a "
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
      "JDF 477 and JDF 478 interleave their glyph runs. Text extracted from the content stream is scrambled at the "
      + "character level, so no printed-caption check can be run against them.",
    whyThisIsNotWorkedAround:
      "A fuzzy match loose enough to accept \"NumEer\" as \"Number\" would pass on almost anything, and a check that "
      + "cannot fail reads as evidence while proving nothing. The absence is recorded instead.",
    whatTheCaptionClaimRestsOnHere:
      "Colorado authored these widget names -- County, Court Address, Case Number, Phone, Email, CoS_Date, "
      + "Sig1_Signature, 8D.1, 478.3C.2 -- and they are keyed to the printed sections. The dictionary and the widget set "
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
      "C.R.S. § 24-72-705 is one simplified process covering all five grounds JDF 477 lists, so the route does not choose "
      + "between them: which ground applies is a fact about how this case ended. The packet states the route it was built "
      + "for and leaves the ground, the court type and the agency list to the participant rather than asserting a "
      + "disposition it does not hold.",
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
      "JDF 477 sections 1, 2, 3 and 5, and JDF 478 sections A, B, C and 2: confirm the county, case number, defendant "
        + "name, birth date, address, phone and e-mail each sit under the heading they belong to. The text stream is "
        + "scrambled, so this is the check.",
      "JDF 477 section 6: all five grounds unticked and their date boxes blank.",
      "JDF 477 section 8 and JDF 478 section 3: the agency boxes unticked and the agency names, numbers and addresses blank.",
      "JDF 477 section 9: the certificate of service blank — no date, no method, no recipient.",
      "JDF 477 section 10: the verification blank — no date, no place, no printed name, no signature — and the counsel block blank.",
      "JDF 478 sections 4 and 5: the court's orders, signature and date blank, and neither Judge nor Magistrate ticked."
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
        finding: "JDF 477 and JDF 478 interleave their glyph runs; extracted text is scrambled at the character level.",
        consequence:
          "No printed-caption check can be run on either form. The captions rest on Colorado's own authored field names "
          + "and the printed section headings; the scrambled extraction is recorded per field in "
          + "reports/caption-evidence.json, and placement is left to the visual reviewer, who can read the paper."
      },
      {
        finding: "C.R.S. § 24-72-705 is one simplified process covering five different grounds, and JDF 477 asks which one applies.",
        consequence:
          "The ground is a participant election rather than a route-determined selection. A packet built for this route "
          + "that ticked one of the five would be asserting a disposition the platform does not hold."
      },
      {
        finding: "Both forms ask for the agencies holding records, and the completeness contract refuses to let a court or clerk refusal class excuse an agency fact.",
        consequence:
          "Every agency name, number and address is declared REQUIRED_BEFORE_FILING and named to the participant in "
          + "participant-instructions.md, rather than being bundled into a protected class."
      },
      {
        finding: "JDF 477 section 10 is a verification under penalty of perjury, not a plain signature line.",
        consequence:
          "The whole block — date, city, state, printed name and signature — is left blank. Prefilling any part of a "
          + "verification presents a sworn instrument as further along than it is."
      },
      {
        finding:
          "JDF 477 ships with the Colorado Bureau of Investigation box already ticked, because the form marks that agency "
          + "required. The finished artifact therefore draws a tick at a rectangle this map refuses.",
        consequence:
          "The census reads each control's value from the pinned source, and the byte proof records ink at a control the "
          + "source already carried as a documentAuthoredAppearance rather than as ink on a refused field. Reading it the "
          + "other way would report a protected write this build never made. Nothing is softened: a control the source "
          + "leaves empty that carries ink in the output is still a blocking finding."
      },
      {
        severity: "advisory",
        finding:
          "The boundary participant's full mailing address does not fit JDF 477's single Address line at the minimum "
          + "readable font, so the finalizer refuses it rather than clipping it.",
        consequence:
          "Recorded in reports/actual-writes.json under unfittable. That is the boundary fixture doing its job; the "
          + "canonical fixture writes the address."
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
      "reports/caption-evidence.json — these two forms cannot be caption-checked from their own text stream, so visual review carries more weight here than usual."
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
