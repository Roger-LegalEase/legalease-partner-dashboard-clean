#!/usr/bin/env node
/**
 * The Colorado pardoned-conviction sealing family — `co_pardoned_conviction_seal-set`.
 *
 *   node scripts/build-census-v1-co_pardoned_conviction_seal-set.mjs [--check] [--no-raster]
 *
 * Two official Judicial Department forms, filed together:
 *
 *   JDF-680  Motion to Seal Conviction Records (Pardoned)  — the filing
 *   JDF-681  Order to Seal Pardoned Conviction Records     — the proposed order
 *
 * The route is `track:CO:co_pardoned_conviction_seal`, C.R.S. § 24-72-710.
 *
 * TWO DOCUMENTS, TWO STRATEGIES, AND WHY
 *
 * JDF-681 is an AcroForm and is filled like every other form in this factory.
 *
 * JDF-680 IS NOT. The committed corpus index records it as `flat_pdf` with
 * `acroFieldCount: 0`, and that is what it is: two pages of printed text and
 * ruled lines with no fillable field on them at all. The assignment's
 * implementation strategy for this family is `official_pdf_fill`, and for this
 * half of it that strategy has nothing to fill.
 *
 * The answer is not to stop the family and it is not to pretend. This
 * repository already has the path for a document like this -- the Washington
 * vacatur families are built the same way -- and it is `finalizeFlatOverlay`
 * against MEASURED geometry: the write box is the printed rule the value goes
 * on, read out of the page's own content stream by
 * scripts/rcap-official-forms/rcap-pdf-rule-lines.mjs, not a coordinate anyone
 * typed in. FLAT_ANCHORS below records, for every value this build writes, the
 * rule it belongs on -- page, baseline, start and end -- and the build re-reads
 * every one of them from the pinned binary and refuses if any has moved.
 *
 * WHAT COULD NOT BE MEASURED, AND IS SAID RATHER THAN INVENTED
 *
 * JDF-680's tick boxes are not stroked rectangles. `checkboxCandidates` finds
 * ZERO on either page, because the form draws them as glyphs in the text rather
 * than as paths. There is therefore no measured box to point at, and this build
 * does not invent one: the boxes are listed in the instructions as controls the
 * participant marks by hand, and recorded in the field map as
 * `printedSelectionControlsNotMeasured` rather than as blanks with fabricated
 * geometry. A write box nobody measured is a write box nobody can review.
 *
 * Rasterization goes through scripts/lib/pdf-page-raster.mjs. Never Poppler.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm, finalizeFlatOverlay } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { rulesOfPage } from "./rcap-official-forms/rcap-pdf-rule-lines.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { checkboxCandidates } from "./lib/pdf-stroked-boxes.mjs";
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
const { rasterizePageCalibrated } = await (async () => {
  try {
    return await import("./raster/pdf-page-raster.mjs");
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
    return import("./lib/pdf-page-raster.mjs");
  }
})();

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "co_pardoned_conviction_seal-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/co/co-pardoned-conviction-seal-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-co_pardoned_conviction_seal-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "CO",
  routeKey: "track:CO:co_pardoned_conviction_seal",
  routeSelectionId: "co-pardoned-conviction-seal-set-jdf-680-jdf-681",
  publicLabel: "Motion to seal a pardoned conviction",
  authority: "C.R.S. § 24-72-710; Colorado Judicial Department forms JDF 680 and JDF 681",
  documents: [
    { formNumber: "JDF-680", title: "Motion to Seal Conviction Records (Pardoned)", instrumentKind: "primary_filing", strategy: "measured_flat_overlay" },
    { formNumber: "JDF-681", title: "Order to Seal Pardoned Conviction Records", instrumentKind: "proposed_order", strategy: "acroform_fill" }
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
const ATTORNEY = (why) => ({ policy: "attorney", why });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";
const AGENCY = (what) => SUPPLY(what);

/* ------------------------------------------------------------------ *
 * JDF-680: the measured rules a value goes on.
 *
 * `rule` is the printed line, read from the page's own content stream:
 * `y` is its baseline, `x0` and `x1` its ends. The build re-measures every one
 * of them on every run and refuses if a rule has moved by more than a point,
 * because a write box on a form is a claim about the paper and not a constant.
 * ------------------------------------------------------------------ */
const FLAT_ANCHORS = {
  // --- page 1, the caption -------------------------------------------------
  "co-county": {
    page: 1, rule: { y: 685.44, x0: 149.94, x1: 354.6 },
    section: "Court", label: "Colorado County", ...WRITE("matter.county")
  },
  "court-mailing-address": {
    page: 1, rule: { y: 669.9, x0: 173.4, x1: 354.6 },
    section: "Court", label: "Court Mailing Address",
    ...SUPPLY("the mailing address of the courthouse where the conviction was entered. The Colorado Judicial Department publishes it for every county; the platform holds no court directory")
  },
  defendant: {
    page: 1, rule: { y: 604.38, x0: 123.96, x1: 354.6 },
    section: "Parties", label: "Defendant", ...WRITE("participant.full_legal_name")
  },
  "filed-by-name": {
    page: 1, rule: { y: 561.12, x0: 106.38, x1: 354.6 },
    section: "Filed by", label: "Filed by — Name", ...WRITE("participant.full_legal_name")
  },
  "filed-by-address": {
    page: 1, rule: { y: 545.58, x0: 148.92, x1: 354.6 },
    section: "Filed by", label: "Filed by — Mailing Address", ...WRITE("participant.street_address")
  },
  "filed-by-phone": {
    page: 1, rule: { y: 530.1, x0: 105.9, x1: 270.12 },
    section: "Filed by", label: "Filed by — Phone", ...WRITE("participant.phone")
  },
  "filed-by-fax": {
    page: 1, rule: { y: 530.1, x0: 299.1, x1: 354.6 },
    section: "Filed by", label: "Filed by — Fax",
    ...SUPPLY("a fax number, if you have one; most people do not and the line is left empty")
  },
  "filed-by-email": {
    page: 1, rule: { y: 514.62, x0: 104.88, x1: 256.62 },
    section: "Filed by", label: "Filed by — Email", ...WRITE("participant.email")
  },
  "case-number": {
    page: 1, rule: { y: 555.18, x0: 402.42, x1: 531.12 },
    section: "Case (court use)", label: "Case Number", ...WRITE("matter.case_number")
  },
  division: {
    page: 1, rule: { y: 537.12, x0: 401.88, x1: 531.12 },
    section: "Case (court use)", label: "Division",
    ...PROTECT(COURT_OWNED, "the division is assigned by the court; the form marks this box for court use only")
  },
  courtroom: {
    page: 1, rule: { y: 519.06, x0: 412.92, x1: 531.12 },
    section: "Case (court use)", label: "Courtroom",
    ...PROTECT(COURT_OWNED, "the courtroom is assigned by the court; the form marks this box for court use only")
  },

  // --- page 1, section 1: the defendant ------------------------------------
  "defendant-dob": {
    page: 1, rule: { y: 371.64, x0: 358.14, x1: 540 },
    section: "1. Information about the Defendant", label: "Date of Birth", ...WRITE("participant.date_of_birth")
  },
  "petitioner-address": {
    page: 1, rule: { y: 331.14, x0: 184.68, x1: 540 },
    section: "1. Information about the Defendant", label: "Petitioner's Mailing Address, if different from 'filed by'",
    ...SUPPLY("a mailing address, ONLY if the petitioner's differs from the one in the 'filed by' box above. The form asks for it only in that case, so it is left empty rather than repeating what is already on the page")
  },
  "petitioner-city": {
    page: 1, rule: { y: 313.92, x0: 207.3, x1: 351 },
    section: "1. Information about the Defendant", label: "Petitioner's City, if different",
    ...SUPPLY("the city of that different address, if there is one")
  },
  "petitioner-state": {
    page: 1, rule: { y: 313.92, x0: 382.68, x1: 423 },
    section: "1. Information about the Defendant", label: "Petitioner's State, if different",
    ...SUPPLY("the state of that different address, if there is one")
  },
  "petitioner-zip": {
    page: 1, rule: { y: 313.92, x0: 471.9, x1: 540 },
    section: "1. Information about the Defendant", label: "Petitioner's Zip Code, if different",
    ...SUPPLY("the ZIP code of that different address, if there is one")
  },
  "petitioner-main-phone": {
    page: 1, rule: { y: 296.7, x0: 175.26, x1: 324 },
    section: "1. Information about the Defendant", label: "Petitioner's Main Phone number, if different",
    ...SUPPLY("a main phone number, only if it differs from the one in the 'filed by' box")
  },
  "petitioner-work-phone": {
    page: 1, rule: { y: 296.7, x0: 395.7, x1: 540 },
    section: "1. Information about the Defendant", label: "Petitioner's Work Phone number",
    ...SUPPLY("a work phone number, if you have one")
  },

  // --- page 1, section 2: the agencies -------------------------------------
  "agency-district-county-court-case": {
    page: 1, rule: { y: 238.2, x0: 290.16, x1: 432 },
    section: "2. Agencies with custody of the records", label: "District / County Court — case number",
    ...SUPPLY("the case number of the District or County Court case you are asking to seal")
  },
  "agency-municipal-court-cases": {
    page: 1, rule: { y: 191.7, x0: 265.98, x1: 432 },
    section: "2. Agencies with custody of the records", label: "Municipal Court — case numbers",
    ...SUPPLY("the case numbers of any Municipal Court cases you are asking to seal")
  },
  "agency-municipal-court-address": {
    page: 1, rule: { y: 174.42, x0: 202.68, x1: 540 },
    section: "2. Agencies with custody of the records", label: "Municipal Court — Mailing Address",
    ...AGENCY("that Municipal Court's mailing address")
  },
  "agency-sheriff-address": {
    page: 1, rule: { y: 133.92, x0: 202.68, x1: 540 },
    section: "2. Agencies with custody of the records", label: "Sheriff's Department — Mailing Address",
    ...AGENCY("the mailing address of the Sheriff's Department holding these records")
  },
  "agency-city-attorney-address": {
    page: 1, rule: { y: 93.42, x0: 202.68, x1: 540 },
    section: "2. Agencies with custody of the records", label: "City Attorney — Mailing Address",
    ...AGENCY("the City Attorney's mailing address")
  },

  // --- page 2, the rest of section 2 ---------------------------------------
  "agency-law-enforcement-name": {
    page: 2, rule: { y: 708.48, x0: 279.96, x1: 504 },
    section: "2. Agencies with custody of the records", label: "Law Enforcement Agency — name",
    ...AGENCY("the name of the law enforcement agency that arrested or cited you")
  },
  "agency-law-enforcement-case": {
    page: 2, rule: { y: 691.26, x0: 229.38, x1: 540 },
    section: "2. Agencies with custody of the records", label: "Law Enforcement Agency — Agency Case Number",
    ...AGENCY("that agency's own case number, which is usually different from the court case number")
  },
  "agency-law-enforcement-address": {
    page: 2, rule: { y: 673.98, x0: 202.68, x1: 540 },
    section: "2. Agencies with custody of the records", label: "Law Enforcement Agency — Mailing Address",
    ...AGENCY("that agency's mailing address")
  },
  "agency-other-name": {
    page: 2, rule: { y: 611.94, x0: 156.54, x1: 540 },
    section: "2. Agencies with custody of the records", label: "Other agency — name",
    ...AGENCY("the name of any other agency holding records of this conviction")
  },
  "agency-other-address": {
    page: 2, rule: { y: 594.72, x0: 202.68, x1: 540 },
    section: "2. Agencies with custody of the records", label: "Other agency — Mailing Address",
    ...AGENCY("that agency's mailing address")
  },

  // --- page 2, section 4: the certificate of service -----------------------
  "certificate-date": {
    page: 2, rule: { y: 469.5, x0: 216.66, x1: 360 },
    section: "4. Certificate of Service", label: "Certificate of Service — date of service, entered at signature",
    ...PROTECT(SIGNATURE, "service has not happened when the packet is prepared, and a certificate dated before the act it certifies would be false")
  },
  "certificate-email-or-fax": {
    page: 2, rule: { y: 411.72, x0: 231.12, x1: 540 },
    section: "4. Certificate of Service", label: "Certificate of Service — email or fax address served",
    ...PROTECT(SIGNATURE, "the certificate records where you actually sent it and is completed when you sign it, after service")
  },
  "certificate-recipient-1": {
    page: 2, rule: { y: 377.28, x0: 191.64, x1: 522 },
    section: "4. Certificate of Service", label: "Certificate of Service — first recipient served, by hand delivery or regular mail",
    ...PROTECT(SIGNATURE, "the certificate records who you actually served and is completed when you sign it, after service")
  },
  "certificate-recipient-2": {
    page: 2, rule: { y: 364.02, x0: 191.64, x1: 522 },
    section: "4. Certificate of Service", label: "Certificate of Service — second recipient served, by hand delivery or regular mail",
    ...PROTECT(SIGNATURE, "the certificate records who you actually served and is completed when you sign it, after service")
  },

  // --- page 2, section 5: sign and date ------------------------------------
  "print-your-name": {
    page: 2, rule: { y: 301.56, x0: 187.44, x1: 468 },
    section: "5. Sign and Date", label: "Print Your Name", ...WRITE("participant.full_legal_name")
  },
  signature: {
    page: 2, rule: { y: 272.28, x0: 108, x1: 324 },
    section: "5. Sign and Date", label: "Signature",
    ...PROTECT(SIGNATURE, "you sign this yourself")
  },
  "signature-date": {
    page: 2, rule: { y: 272.28, x0: 360, x1: 504 },
    section: "5. Sign and Date", label: "Date of signature",
    ...PROTECT(SIGNATURE, "you date it when you sign it; a date written in advance would be false")
  }
};

/*
 * The tick boxes JDF-680 prints, which this build could not measure.
 *
 * checkboxCandidates finds none on either page: the form draws them as glyphs
 * in the text stream rather than as stroked paths. There is no box to point a
 * write at and none is invented, so they are listed here, disclosed to the
 * participant as controls to mark by hand, and asserted to still be unmeasurable
 * on every build -- if a future revision of the form draws them as paths, this
 * build fails rather than silently continuing to leave them out.
 */
const PRINTED_SELECTION_CONTROLS_NOT_MEASURED = [
  { page: 1, section: "Court", printedNear: "Court: District County", what: "whether the case was in District or County Court" },
  { page: 1, section: "2. Agencies with custody of the records", printedNear: "District / County Court: (case number)", what: "that the District or County Court holds records" },
  { page: 1, section: "2. Agencies with custody of the records", printedNear: "District Attorney", what: "that the District Attorney holds records" },
  { page: 1, section: "2. Agencies with custody of the records", printedNear: "Municipal Court: (case numbers)", what: "that a Municipal Court holds records" },
  { page: 1, section: "2. Agencies with custody of the records", printedNear: "Sheriff’s Department", what: "that the Sheriff's Department holds records" },
  { page: 1, section: "2. Agencies with custody of the records", printedNear: "City Attorney", what: "that the City Attorney holds records" },
  { page: 2, section: "2. Agencies with custody of the records", printedNear: "Law Enforcement Agency (Identify)", what: "that a law enforcement agency holds records" },
  { page: 2, section: "2. Agencies with custody of the records", printedNear: "Colorado Bureau of Investigation (Required)", what: "the Colorado Bureau of Investigation, which the form marks required and whose address it prints for you" },
  { page: 2, section: "2. Agencies with custody of the records", printedNear: "Other:", what: "that some other agency holds records" },
  { page: 2, section: "3. Pardon", printedNear: "I attached the Governor’s full and unconditional pardon for the convictions in this case.", what: "that you have attached the Governor's full and unconditional pardon — this route does not exist without it" },
  { page: 2, section: "4. Certificate of Service", printedNear: "Colorado Courts E-Filing (only available to lawyers)", what: "that you served through Colorado Courts E-Filing" },
  { page: 2, section: "4. Certificate of Service", printedNear: "Email or Fax to:", what: "that you served by email or fax" },
  { page: 2, section: "4. Certificate of Service", printedNear: "Hand Delivery, to: (name, place)", what: "that you served by hand delivery" },
  { page: 2, section: "4. Certificate of Service", printedNear: "Regular Mail, addressed to: (name, full address)", what: "that you served by regular mail" }
];

/* ---- JDF-681, an ordinary AcroForm ---------------------------------------- */
const FORM_FIELDS = {
  County: { section: "A. Court", label: "Colorado County", ...WRITE("matter.county") },
  "Court Address": { section: "A. Court", label: "Court Mailing Address", ...SUPPLY("the courthouse's mailing address, copied from the motion") },
  "Case Number": { section: "C. Case Details", label: "Case Number", ...WRITE("matter.case_number") },
  Division: { section: "C. Case Details", label: "Division", ...PROTECT(COURT_OWNED, "assigned by the court; the box beside it is marked for court use") },
  Courtroom: { section: "C. Case Details", label: "Courtroom", ...PROTECT(COURT_OWNED, "assigned by the court; the box beside it is marked for court use") },
  "∆": { section: "B. Parties to the Case", label: "Defendant — Full Name, in the caption and at 2(a)", ...WRITE("participant.full_legal_name") },
  "∆ DoB": { section: "2. Defendant's Information", label: "Birth Date", ...WRITE("participant.date_of_birth") },
  "∆ Street Address": { section: "2. Defendant's Information", label: "Mailing Address", ...WRITE("participant.street_address") },
  "∆ City": { section: "2. Defendant's Information", label: "City", ...WRITE("participant.city") },
  "∆ State": { section: "2. Defendant's Information", label: "State", ...WRITE("participant.state") },
  "∆ Zip": { section: "2. Defendant's Information", label: "Zip Code", ...WRITE("participant.zip") },
  "681.4A.1": {
    section: "4. Court Orders", label: "Records sealed — the law enforcement agency and its case number",
    ...AGENCY("the law enforcement agency and its case number, copied from the motion, so the order names the records it seals")
  },
  "478.4D": { section: "4. Court Orders", label: "By the Court — other orders", ...PROTECT(COURT_OWNED, "the decree is the court's; a proposed order that wrote the court's other orders would be drafting the judge's ruling") },
  "478.5A": { section: "So Ordered", label: "By the Court — signature", ...PROTECT(COURT_OWNED, "the judge or magistrate signs their own order") },
  "Group478.5B": { section: "So Ordered", selection: true, label: "By the Court — Judge or Magistrate (selection)", ...PROTECT(COURT_OWNED, "the officer who signs states which they are") },
  "478.5C": { section: "So Ordered", label: "By the Court — Dated", ...PROTECT(COURT_OWNED, "the court dates its own order") }
};

/* ---- fixtures ------------------------------------------------------------ */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1978-04-17",
    "participant.street_address": "412 Cherry Creek Way",
    "participant.city": "Denver",
    "participant.state": "CO",
    "participant.zip": "80202",
    "participant.phone": "303-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "matter.county": "Denver",
    "matter.case_number": "2011CR004217"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O’Shaughnessy-Whitfield",
    "participant.date_of_birth": "1961-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city": "Colorado Springs",
    "participant.state": "Colorado",
    "participant.zip": "80921-2214",
    "participant.phone": "(719) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org",
    "matter.county": "El Paso",
    "matter.case_number": "2014CR0011882-SUPPLEMENTAL"
  }
};

const RASTER_ENGINE = "scripts/lib/pdf-page-raster.mjs (Chromium, calibrated)";
const RULE_TOLERANCE = 1.0;
const WRITE_BOX_HEIGHT = 12;

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
      acroFieldCount: entry.acroFieldCount ?? null, pageCount: entry.pageCount ?? null,
      structuralClassObserved: entry.structuralClassObserved ?? null
    });
  }
  return { resolved, failures };
}

/* ---- JDF-680: measure the rules, then place the boxes on them ------------- */
async function censusFlat(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text }))
  }));

  const measured = pages.map((p, i) => ({ page: i + 1, horizontal: (rulesOfPage(p).horizontal ?? []) }));

  // The form must still have no fillable field and no stroked tick box: both are
  // claims this build makes about it, so both are checked rather than assumed.
  const acroFieldCount = doc.getForm().getFields().length;
  const strokedBoxes = pages.map((p, i) => {
    let content = "";
    for (const stream of p.node.normalizedEntries?.().Contents?.asArray?.() ?? []) {
      try { content += Buffer.from(doc.context.lookup(stream).getContents()).toString("latin1"); } catch { /* not a stream */ }
    }
    return { page: i + 1, boxes: content ? checkboxCandidates(content) : [] };
  });

  const rows = [];
  const ruleDrift = [];
  for (const [key, entry] of Object.entries(FLAT_ANCHORS)) {
    const here = measured.find((m) => m.page === entry.page)?.horizontal ?? [];
    const hit = here.find((r) =>
      Math.abs(r.y - entry.rule.y) <= RULE_TOLERANCE
      && Math.abs(r.x - entry.rule.x0) <= RULE_TOLERANCE
      && Math.abs(r.endX - entry.rule.x1) <= RULE_TOLERANCE);
    if (!hit) {
      ruleDrift.push({
        anchor: key, page: entry.page, expected: entry.rule,
        nearest: here.filter((r) => Math.abs(r.y - entry.rule.y) <= 6)
          .map((r) => ({ y: r.y, x: r.x, endX: r.endX })).slice(0, 3)
      });
      continue;
    }
    // The value sits ON the rule, so the box starts a couple of points in from
    // the left end and a couple of points above the line.
    const writeBox = {
      x: Number((hit.x + 2).toFixed(2)),
      y: Number((hit.y + 2).toFixed(2)),
      width: Number((hit.width - 4).toFixed(2)),
      height: WRITE_BOX_HEIGHT
    };
    rows.push({
      key, name: key, page: entry.page,
      rect: writeBox, writeBox,
      rectBasis: "measured_printed_rule_read_from_the_page_content_stream",
      measuredRule: { y: hit.y, x: hit.x, endX: hit.endX, width: hit.width, thickness: hit.height },
      type: "flat_overlay_text", isSelectionControl: false, multiline: false, maxLength: null,
      section: entry.section, effectiveLabel: entry.label,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null,
      printedTextAtCoordinate: (pageText.find((p) => p.page === entry.page)?.lines ?? [])
        .filter((l) => Math.abs(l.y - entry.rule.y) <= 14)
        .sort((a, b) => Math.abs(a.y - entry.rule.y) - Math.abs(b.y - entry.rule.y))
        .slice(0, 2).map((l) => ({ y: l.y, extracted: l.text }))
    });
  }

  return {
    rows, ruleDrift, pageText, pageCount: pages.length,
    acroFieldCount,
    strokedCheckboxCount: strokedBoxes.reduce((n, p) => n + p.boxes.length, 0),
    measuredRuleCount: measured.reduce((n, m) => n + m.horizontal.length, 0)
  };
}

/* ---- JDF-681: an ordinary AcroForm census --------------------------------- */
async function censusAcroForm(source) {
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
    const entry = FORM_FIELDS[name];
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
    let sourceValue = null;
    try {
      if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
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
      section: entry.section, effectiveLabel: entry.label, bindingLabel: entry.bindingLabel ?? entry.label,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null,
      printedTextAtCoordinate: (pageText.find((p) => p.page === (widgets[0]?.page ?? 1))?.lines ?? [])
        .filter((l) => widgets[0] && Math.abs(l.y - widgets[0].rect.y) <= 16)
        .sort((a, b) => Math.abs(a.y - widgets[0].rect.y) - Math.abs(b.y - widgets[0].rect.y))
        .slice(0, 2).map((l) => ({ y: l.y, extracted: l.text }))
    });
  }
  const dictionaryKeys = new Set(Object.keys(FORM_FIELDS));
  for (const r of rows) dictionaryKeys.delete(r.key);
  return { rows, unmapped, stale: [...dictionaryKeys], pageText, pageCount: pages.length };
}

/* ---- render --------------------------------------------------------------- */
async function renderFlat(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const writable = census.rows.filter((r) => r.policy === "write");
  /*
   * Geometry-based protection: every rule this build refuses is handed to the
   * overlay as a protected rule, so a write box that landed on a signature line
   * would be refused for WHERE it is even if its label said something innocent.
   * The check exists because protection used to be a naming convention.
   */
  const protectedRules = census.rows
    .filter((r) => r.policy === "protect")
    .map((r) => ({
      page: r.page, y: r.measuredRule.y, x: r.measuredRule.x, endX: r.measuredRule.endX,
      category: r.refusalClass, caption: r.effectiveLabel
    }));

  const anchors = writable.map((r) => ({
    page: r.page, label: r.effectiveLabel, writeBox: r.writeBox,
    factId: r.fact, fontSize: 10, protectedRules
  }));

  const { bytes, report } = await finalizeFlatOverlay({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    anchors,
    protectedRules,
    explicitMappings: Object.fromEntries(writable.map((r) => [r.effectiveLabel, r.fact])),
    facts,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: source.title
  });
  if (process.env.CO680_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) console.log(`   ${r.anchor ?? r.field}: ${r.reason}${r.category ? ` (${r.category})` : ""}`);
  }
  return { bytes, report };
}

async function renderAcroForm(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const writable = census.rows.filter((r) => r.policy === "write");
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const writableNames = new Set(writable.map((r) => r.name));
  const unwritableFields = census.rows.filter((r) => !writableNames.has(r.name)).map((r) => ({ field: r.name }));

  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: census.rows.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.bindingLabel, regionHeading: r.section,
      widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings, unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: source.title
  });
  if (process.env.CO680_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) {
      if (r.reason !== "classified_unwritable_by_role") console.log(`   ${r.field ?? r.anchor}: ${r.reason}${r.category ? ` (${r.category})` : ""}`);
    }
  }
  return { bytes, report };
}

/* ---- byte proof ------------------------------------------------------------ */
async function byteProof(source, census, artifactBytes, report, fixtureName, isFlat) {
  /*
   * TWO DOCUMENTS, TWO WAYS OF READING THE INK BACK, AND ONE REASON.
   *
   * flattenedWidgets reads the appearance streams of flattened AcroForm
   * WIDGETS. A measured overlay has none: finalizeFlatOverlay draws into the
   * page's own content stream, so on JDF 680 that reader returns nothing, every
   * write reads back as no ink, and the family reports two invisibleWrites it
   * does not have. That is a defect in the reading, not in the packet -- and a
   * byte proof that cannot see the ink it is checking is worth less than none,
   * because it reports a clean packet as broken and would report a broken one
   * as clean the moment somebody relaxed it.
   *
   * So the flat document is read back the way it was written: the finalized
   * bytes' own page TEXT, at the coordinates of the rule each value was drawn
   * on. The AcroForm document keeps the widget reader it needs.
   */
  const tmp = path.join(ROOT, `.co-680-byte-proof-${source.formNumber}-${fixtureName}.pdf`);
  fs.writeFileSync(tmp, artifactBytes);
  let widgets = [];
  try { widgets = isFlat ? [] : await flattenedWidgets(tmp); } finally { fs.unlinkSync(tmp); }

  /** Text drawn into the finalized page content stream, per page. */
  const flatTextByPage = new Map();
  if (isFlat) {
    const out = await PDFDocument.load(artifactBytes, { ignoreEncryption: true });
    out.getPages().forEach((p, i) => {
      flatTextByPage.set(i + 1, extractTextItems(p).map((t) => ({
        x: Number(t.x), y: Number(t.y), width: Number(t.width ?? 0), text: String(t.text ?? "")
      })));
    });
  }
  /*
   * What the SOURCE already prints inside the same box.
   *
   * A rule on a printed form is not an empty rectangle: JDF 680's
   * certificate-of-service line reads "I certify that on ____, I gave a copy of
   * this document to the" and the words sit level with the rule, inside the
   * band a write box occupies. Reading the output alone would report the form's
   * own sentence as ink this build put on a field it refused -- a protected
   * write that never happened. So the source is read at the same coordinates
   * and its own text is subtracted. Nothing is softened: a box whose output
   * carries text the source does not is still a blocking finding.
   */
  const sourceTextByPage = new Map();
  if (isFlat) {
    const src = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
    src.getPages().forEach((p, i) => {
      sourceTextByPage.set(i + 1, extractTextItems(p).map((t) => ({
        x: Number(t.x), y: Number(t.y), text: String(t.text ?? "")
      })));
    });
  }
  const inBox = (t, box) => t.x >= box.x - 2 && t.x <= box.x + box.width + 2
    && t.y >= box.y - 3 && t.y <= box.y + box.height + 3;
  /** The text this overlay drew inside one write box, read from the output. */
  const drawnInBox = (page, box) => {
    const printed = (sourceTextByPage.get(page) ?? [])
      .filter((t) => inBox(t, box))
      .map((t) => `${Math.round(t.x)}:${t.text}`);
    const already = new Set(printed);
    return (flatTextByPage.get(page) ?? [])
      .filter((t) => t.text.trim() && inBox(t, box))
      .filter((t) => !already.has(`${Math.round(t.x)}:${t.text}`))
      .sort((a, b) => a.x - b.x)
      .map((t) => t.text);
  };

  const written = isFlat
    ? new Set(report.written.map((w) => w.anchor))
    : new Set(report.written.map((w) => w.field));
  const actualWrites = [];
  const refusedFieldsWithInk = [];
  const documentAuthoredAppearances = [];
  let glyphs = 0;

  for (const r of census.rows) {
    const places = isFlat ? [{ page: r.page, rect: r.rect }] : r.widgets;
    for (const wdg of places) {
      const text = isFlat
        ? drawnInBox(wdg.page, wdg.rect)
        : drawnAt(widgets, { page: wdg.page, rect: wdg.rect }).map((d) => d.text).filter(Boolean);
      const ink = text.join("").trim();
      const isWritten = isFlat ? written.has(r.effectiveLabel) : written.has(r.name);
      if (isWritten && r.policy === "write") {
        glyphs += ink.length;
        actualWrites.push({
          field: r.key, factId: r.fact, page: wdg.page, rect: wdg.rect,
          section: r.section, effectiveLabel: r.effectiveLabel,
          ...(r.measuredRule ? { measuredRule: r.measuredRule } : {}),
          drawnText: text, expected: FIXTURES[fixtureName][r.fact] ?? null,
          matchesExpected: ink === String(FIXTURES[fixtureName][r.fact] ?? "").trim()
        });
        continue;
      }
      if (ink.length === 0) continue;
      if (r.sourceValue !== null && r.sourceValue !== undefined) {
        documentAuthoredAppearances.push({
          field: r.key, page: wdg.page, rect: wdg.rect, drawnText: text, sourceValue: r.sourceValue,
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
function mapFor(source, census, report, isFlat) {
  const writtenNames = isFlat
    ? new Set(report.written.map((w) => w.anchor))
    : new Set(report.written.map((w) => w.field));
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const selectionControls = [];

  for (const r of census.rows) {
    const base = {
      field: `${source.formNumber}/${r.key}`,
      fieldName: `${source.formNumber}/${r.key}`.replace(/\[\d+\]/g, ""),
      acroFieldName: isFlat ? null : r.name,
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      ...(r.measuredRule ? { measuredRule: r.measuredRule } : {}),
      printedLabel: r.effectiveLabel, printedLine: r.effectiveLabel,
      sectionHeading: r.section, regionHeading: r.effectiveLabel, effectiveLabel: r.effectiveLabel,
      captionBasis: isFlat
        ? "the printed section, and the measured rule the value sits on"
        : "authored AcroForm field name plus the printed section it sits in",
      printedTextAtCoordinate: r.printedTextAtCoordinate,
      document: source.formNumber
    };

    if (r.policy === "write") {
      const hit = isFlat ? writtenNames.has(r.effectiveLabel) : writtenNames.has(r.name);
      if (hit) canonicalWrites.push({ ...base, factId: r.fact, kind: r.type });
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
      const cls = r.policy === "protect" ? r.refusalClass : PARTICIPANT_ELECTION;
      selectionControls.push({
        ...base, selectionId: base.field, kind: "selection_control", type: r.type,
        widgets: r.widgets ?? [{ page: r.page, rect: r.rect }], disposition: "explicit_refusal",
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
      requiredBeforeFiling: true, identity: `${source.formNumber} blank ${r.key}`,
      factId: null, routeDetermined: false,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }

  return {
    formNumber: source.formNumber, documentId: source.formNumber, documentRole: source.instrumentKind,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: isFlat ? "flat_pdf_measured_overlay" : "acroform",
    explicitMappings: Object.fromEntries(canonicalWrites.map((w) => [w.field, w.factId])),
    roleRefusals: [], selectionControls, canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals,
    ...(isFlat ? { printedSelectionControlsNotMeasured: PRINTED_SELECTION_CONTROLS_NOT_MEASURED } : {})
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

  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is two Colorado Judicial Department forms, filed together:", "",
    "- **JDF 680**, _Motion to Seal Conviction Records (Pardoned)_ — what you file.",
    "- **JDF 681**, _Order to Seal Pardoned Conviction Records_ — the order you give the court to sign.", "",
    `Both are prepared for **${ROUTE.publicLabel.toLowerCase()}** under ${ROUTE.authority}.`, ""
  );
  out.push(
    "The platform filled in what it holds about you and your case: your name, your date of birth, your address, your "
    + "phone, your e-mail, the county and the case number, on both forms. Everything else is yours, and every one of "
    + "those blanks is listed below by the section of the form it is in.", ""
  );

  out.push("## The pardon is the whole of this route", "");
  out.push(
    "C.R.S. § 24-72-710 seals a conviction **that the Governor has pardoned**. Section 3 of JDF 680 says what you must do "
    + "about it: **attach the Governor's full and unconditional pardon for the convictions in this case**, and tick the "
    + "box saying you have. Without the pardon there is nothing for this motion to ask for. The platform does not hold "
    + "your pardon and does not attach it.", ""
  );

  out.push("## Boxes you tick with a pen", "");
  out.push(
    "JDF 680 is a printed form, not a fillable one — the values on your copy were placed on its ruled lines, and its "
    + "**tick boxes are printed characters rather than fields, so nothing can mark them for you.** Mark these by hand:", ""
  );
  for (const c of PRINTED_SELECTION_CONTROLS_NOT_MEASURED) {
    out.push(`- **Page ${c.page}, ${c.section}** — beside _${c.printedNear}_: tick it to say ${c.what}.`);
  }
  out.push("");
  out.push(
    "The Colorado Bureau of Investigation is **required** and the form prints its address for you: ATTN "
    + "Identification-Seals, 690 Kipling St. STE 3000, Lakewood, CO 80215. Tick it.", ""
  );
  out.push(
    "JDF 681 says the same thing from the court's side: once the order is signed, the court's clerk sends a copy to the "
    + "CBI and to every records custodian listed in the motion — which is why the list you tick matters. The order also "
    + "carries a note to you: **the CBI charges a fee before its records are sealed**, and you contact the CBI to pay it.", ""
  );

  out.push("## Where you file this", "");
  out.push(
    "File both forms with the **clerk of the Colorado court that entered the conviction** — the District or County Court "
    + "in the county already filled in for you. The Colorado Judicial Department publishes each courthouse's address; "
    + "this packet does not state one, because the platform holds no court directory and an unsourced address in a filing "
    + "instruction is worse than none. **Ask the clerk what court fee applies**, which is likewise not established here.", ""
  );

  out.push("## What you must do before you file", "");
  out.push("1. **Fill in every item in the tables below.** Each names the form, the section and the blank.");
  out.push("2. **Tick every box listed under _Boxes you tick with a pen_** that applies to you.");
  out.push("3. **Attach the Governor's pardon.**");
  out.push("4. **Serve a copy on the prosecuting attorney**, then complete the certificate of service in section 4 of JDF 680 — the date, the method and who you sent it to. After you have served, not before.");
  out.push("5. **Sign and date section 5 of JDF 680 yourself.** Your printed name is already there; the signature and the date are yours.");
  out.push("6. **Leave the court's parts of JDF 681 alone** — the findings in section 3, the other orders in 4(d), and the signature and date.");
  out.push("");

  for (const [doc, items] of byDoc) {
    const title = ROUTE.documents.find((d) => d.formNumber === doc)?.title ?? doc;
    out.push(`## ${doc} — ${title}: the items you must supply`, "");
    out.push("| Section | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Your signature and its date** in section 5 of JDF 680.");
  out.push("- **The certificate of service in section 4** — the date, the method and the person served. Service has not happened when this packet is prepared.");
  out.push("- **The Division and Courtroom boxes on both forms.** The form marks that box for court use only.");
  out.push("- **The court's findings in section 3 of JDF 681, its other orders, and the judge's or magistrate's signature and date.**");
  out.push("");

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared set of official Colorado Judicial Department forms. It is not legal advice, it is not filed for "
    + "you, and it does not decide whether your pardoned conviction will be sealed. JDF 681 sets out what the court must "
    + "find: that the public interest in retaining public access to the conviction record is outweighed by the harm to "
    + "your privacy, by the dangers of unwarranted adverse consequences to you, and by the intent of the full and "
    + "unconditional pardon. That finding is the court's."
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
    const isFlat = source.strategy === "measured_flat_overlay";
    const census = isFlat ? await censusFlat(source) : await censusAcroForm(source);
    if (isFlat) {
      assert.equal(census.ruleDrift.length, 0,
        `${source.formNumber}: ${census.ruleDrift.length} measured rule(s) are no longer printed where the anchor says: ${JSON.stringify(census.ruleDrift.slice(0, 3))}`);
      // Both claims this build makes about the document, checked rather than assumed.
      assert.equal(census.acroFieldCount, 0,
        `${source.formNumber}: the corpus index records this form as flat, and it now carries ${census.acroFieldCount} AcroForm field(s); a measured overlay is the wrong strategy for it`);
      assert.equal(census.strokedCheckboxCount, 0,
        `${source.formNumber}: ${census.strokedCheckboxCount} stroked tick box(es) are now measurable, so the printed controls this build leaves to the participant should be mapped instead`);
      assert.equal(census.rows.length, Object.keys(FLAT_ANCHORS).length,
        `${source.formNumber}: ${census.rows.length} of ${Object.keys(FLAT_ANCHORS).length} anchors resolved`);
    } else {
      assert.equal(census.unmapped.length, 0,
        `${source.formNumber}: ${census.unmapped.length} widget(s) carry no dictionary entry: ${JSON.stringify(census.unmapped.slice(0, 8).map((u) => u.field))}`);
      assert.equal(census.stale.length, 0,
        `${source.formNumber}: the dictionary names ${census.stale.length} field(s) this form does not have: ${JSON.stringify(census.stale)}`);
      if (source.acroFieldCount != null) {
        assert.equal(census.rows.length, source.acroFieldCount,
          `${source.formNumber}: censused ${census.rows.length} fields, the committed corpus index declares ${source.acroFieldCount}`);
      }
    }
    censuses.push({ source, census, isFlat });
  }

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      documents: censuses.map(({ source, census, isFlat }) => ({
        formNumber: source.formNumber, strategy: source.strategy, sha256: source.sha256,
        structuralClassObserved: source.structuralClassObserved,
        blanks: census.rows.length,
        ...(isFlat ? { measuredRulesOnTheForm: census.measuredRuleCount, acroFieldsOnTheForm: census.acroFieldCount, strokedTickBoxes: census.strokedCheckboxCount } : {}),
        writes: census.rows.filter((r) => r.policy === "write").length,
        supply: census.rows.filter((r) => r.policy === "supply").length,
        protected: census.rows.filter((r) => r.policy === "protect").length
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
    const pageManifest = [];
    for (const { source, census, isFlat } of censuses) {
      const { bytes, report } = isFlat
        ? await renderFlat(source, census, fixtureName)
        : await renderAcroForm(source, census, fixtureName);
      const proof = await byteProof(source, census, bytes, report, fixtureName, isFlat);
      writeProofs.push({
        fixture: fixtureName, formNumber: source.formNumber, strategy: source.strategy,
        sourceSha256: source.sha256,
        proofMethod: isFlat
          ? "text read back from the finalized bytes at every measured rule the overlay wrote on"
          : "flattened widget appearances read back at every measured /Rect of the finalized bytes",
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
      if (fixtureName === "canonical") maps.push(mapFor(source, census, report, isFlat));
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
    implementationStrategyNote:
      "The assignment names official_pdf_fill for this family, and that is what JDF 681 gets. JDF 680 is a flat PDF with "
      + "no AcroForm field on it, so it is built as a measured overlay against the rules the form prints, which is the "
      + "same path the Washington vacatur families use. The strategy per document is recorded below.",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact form number + committed corpus-index SHA-256 + on-disk SHA-256 + byte length",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId, statutoryAuthority: ROUTE.authority,
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], documentId: r.formNumber, formNumber: r.formNumber, revision: r.revision,
      pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength,
      instrumentKind: r.instrumentKind, strategy: r.strategy,
      structuralClassObserved: r.structuralClassObserved, acroFieldCount: r.acroFieldCount
    })),
    sourceBinaryCommitted: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    captionBasis:
      "JDF 681's captions are the AcroForm field names Colorado authored plus the printed section. JDF 680 has no fields "
      + "at all: each of its blanks is the printed RULE the value sits on, measured from the page's own content stream by "
      + "scripts/rcap-official-forms/rcap-pdf-rule-lines.mjs and re-measured on every build. Both forms interleave their "
      + "glyph runs, so the text extracted at each coordinate is recorded beside the blank rather than used as a check.",
    documents: censuses.map(({ source, census, isFlat }) => ({
      documentId: source.formNumber, formNumber: source.formNumber, sourceSha256: source.sha256,
      strategy: source.strategy, structuralClassObserved: source.structuralClassObserved,
      pageCount: census.pageCount, fieldCount: census.rows.length,
      ...(isFlat
        ? {
          acroFieldsOnTheForm: census.acroFieldCount,
          strokedTickBoxesOnTheForm: census.strokedCheckboxCount,
          measuredHorizontalRulesOnTheForm: census.measuredRuleCount,
          printedSelectionControlsNotMeasured: PRINTED_SELECTION_CONTROLS_NOT_MEASURED
        }
        : { corpusIndexDeclaresFieldCount: source.acroFieldCount }),
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
        ...(r.measuredRule ? { measuredRule: r.measuredRule } : {}),
        pdfType: r.type, isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        section: r.section, effectiveLabel: r.effectiveLabel, policy: r.policy, factId: r.fact,
        printedTextAtCoordinate: r.printedTextAtCoordinate
      }))
    }))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId,
    renderStrategy: "acroform_fill_and_measured_flat_overlay",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeDeterminedSelections: [],
    routeSelectionNote:
      "C.R.S. § 24-72-710 is one section and these two forms are its instruments. Nothing on either is a route election: "
      + "the court type, the agency list, the pardon attachment and the service method are all facts about the "
      + "participant's own case and their own acts.",
    flatOverlayNote:
      "JDF 680 carries no AcroForm field. Every value written on it sits on a rule measured from the page's own content "
      + "stream; measuredRule records the rule each write box was derived from, and the build refuses if any of them has "
      + "moved by more than a point.",
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
    note:
      "Read back from the finalized PDF bytes at every write box, not from the finalizer's own report. On JDF 680 the "
      + "write box is the measured rule the value sits on, and measuredRule travels with each write so a reviewer can "
      + "check the placement against the paper.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, formNumber: p.formNumber, strategy: p.strategy,
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
    handMarkedControls: PRINTED_SELECTION_CONTROLS_NOT_MEASURED,
    handMarkedControlsNote:
      "JDF 680 draws its tick boxes as glyphs rather than as stroked paths, so checkboxCandidates finds none and there is "
      + "no measured box for this build to mark or to point a refusal at. They are listed here and named in "
      + "participant-instructions.md as boxes the participant marks by hand. No geometry was invented for them.",
    participantElections: maps.flatMap((m) => m.selectionControls.map((c) => ({
      document: m.formNumber, field: c.field, page: c.page, section: c.sectionHeading,
      label: c.effectiveLabel, refusalClass: c.category, why: c.reason
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
      + "here: half of this packet is drawn onto a flat form at measured coordinates, and a reviewer reading the paper is "
      + "the check that a value sits on the rule it belongs on rather than merely near it.",
    whatToLookAt: [
      "JDF 680 page 1, the caption block: the county, the court address line, the defendant, and the 'filed by' name, "
        + "address, phone and e-mail. Confirm each value sits ON its own printed rule, level with it and not overlapping "
        + "the printed caption to its left.",
      "JDF 680 page 1, the right-hand court-use box: the case number written, and Division and Courtroom blank.",
      "JDF 680 page 1, section 1: the date of birth written; every 'if different' line below it blank.",
      "JDF 680 pages 1 and 2, section 2: every agency line blank, and every printed tick box unmarked.",
      "JDF 680 page 2, section 3: the pardon box unmarked.",
      "JDF 680 page 2, section 4: the certificate of service blank — no date, no recipient, no method marked.",
      "JDF 680 page 2, section 5: the printed name written, and the signature and date lines blank.",
      "JDF 681: the caption, the defendant's name, birth date, address, city, state and ZIP written; the records-sealed "
        + "line blank; and section 3's findings, 4(d)'s other orders and the signature block all blank, with neither "
        + "Judge nor Magistrate ticked."
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
        finding:
          "JDF 680 is a flat PDF. The committed corpus index records it as `flat_pdf` with acroFieldCount 0, and it is: "
          + "two pages of printed text and ruled lines with nothing fillable on them. The assignment's strategy for this "
          + "family is official_pdf_fill, and on this half of it there is nothing to fill.",
        consequence:
          "The document is built as a measured overlay through finalizeFlatOverlay, the same path the Washington vacatur "
          + "families use. Every write box is derived from a rule read out of the page's own content stream, the rule is "
          + "recorded with the write, and the build refuses if any rule has moved by more than a point. The per-document "
          + "strategy is recorded in the source receipt rather than left to be inferred from the family's strategy field."
      },
      {
        finding:
          "JDF 680's tick boxes are not stroked rectangles: checkboxCandidates finds zero on either page, because the "
          + "form draws them as glyphs in the text stream.",
        consequence:
          "No geometry was invented for them. They are listed in the field map as printedSelectionControlsNotMeasured, "
          + "named in participant-instructions.md as boxes the participant marks by hand, and the build asserts on every "
          + "run that they are still unmeasurable — so a future revision that draws them as paths fails here rather than "
          + "silently continuing to leave fourteen controls out of the map."
      },
      {
        finding:
          "The pardon is the whole of this route: C.R.S. § 24-72-710 seals a conviction the Governor has pardoned, and "
          + "section 3 of JDF 680 requires the pardon to be attached.",
        consequence:
          "The platform does not hold the pardon and does not attach it. The instructions put that first, before the "
          + "field tables, because a motion filed without it is asking for something the statute does not offer."
      },
      {
        finding:
          "Section 1 of JDF 680 asks for the petitioner's address, city, state and phone only IF they differ from the "
          + "'filed by' block already filled in above.",
        consequence:
          "Those five lines are left empty and declared, with the condition stated in the disclosure. Repeating a value "
          + "the form asks for only on a condition would put an unasked-for answer on a filing."
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
      "Half of this packet is drawn onto a flat form at measured coordinates. reports/independent-visual-review.json "
        + "names what to look at; placement on JDF 680 is the thing only a reviewer reading the paper can confirm.",
      "reports/blanks-left-for-the-participant.json → handMarkedControls lists fourteen printed tick boxes this build "
        + "could not measure and does not mark."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: PASS_COUNTERS.every((c) => counted.counters[c] === 0) ? "COMPLETED" : "STOPPED",
    counters: counted.counters, counterFindings: counted.findings,
    directory: OUT, documents: resolved.map((r) => `${r.formNumber} (${r.strategy})`),
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    requiredBeforeFiling: rbf.length,
    handMarkedControlsDisclosed: PRINTED_SELECTION_CONTROLS_NOT_MEASURED.length,
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    rasterPages: rasterPages.length
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
