#!/usr/bin/env node
/**
 * The Colorado municipal-conviction sealing family — `co_municipal_conviction_seal-set`.
 *
 *   node scripts/build-census-v1-co_municipal_conviction_seal-set.mjs [--check]
 *
 * Two Colorado Judicial Department forms, filed together:
 *
 *   JDF 683  Petition to Seal Municipal Conviction Records  (R: February 8, 2023)
 *   JDF 686  Order to Seal Municipal Conviction Records     (R: February 8, 2023)
 *
 * The route is `obligation:track-only:CO:co_municipal_conviction_seal`,
 * C.R.S. Sec. 24-72-708.
 *
 * BOTH DOCUMENTS ARE FLAT. NEITHER HAS A SINGLE FILLABLE FIELD.
 *
 * The committed corpus index records `acroFieldCount: 0` for both, and that is
 * what they are: printed text and ruled lines. The queue's implementation
 * strategy for this family is `official_pdf_fill`, and on both halves of it
 * that strategy has nothing to fill.
 *
 * So both are built the way this repository already builds a flat form -- the
 * Colorado JDF 680 family and the Washington vacatur families are the same --
 * with `finalizeFlatOverlay` against MEASURED geometry. Every write box is a
 * printed rule read out of the page's own content stream by
 * scripts/rcap-official-forms/rcap-pdf-rule-lines.mjs. FLAT_ANCHORS below
 * records, per value, the page and the exact ends of the rule it belongs on,
 * and the build re-measures every one on every run and refuses if any has
 * moved by more than a point. No coordinate here was typed in by hand.
 *
 * THE ONE PLACE THE SHARED RULE READER DOES NOT SEE A RULE THIS FORM DRAWS
 *
 * `rulesOfPage` defaults to `minLength: 40`, which keeps table borders and
 * stray marks out. JDF 686's State blank, between the printed "State:" caption
 * at x=362.90 and the Zip caption at x=425.93, is a drawn rule 31.25 points
 * wide -- below that default and therefore invisible to the reader at its
 * default setting, while the SAME blank on JDF 683 is 40.27 points wide and is
 * seen. This build narrows the threshold through the module's own published
 * option rather than editing the shared module or hand-entering the
 * coordinate, so the box is still the form's own drawn rule. The measurement
 * is recorded in build-findings.json for whoever owns that module.
 *
 * WHAT COULD NOT BE MEASURED, AND IS SAID RATHER THAN INVENTED
 *
 * Both forms draw their tick boxes as glyphs in the text stream, not as
 * stroked paths, so `checkboxCandidates` finds none. There is no measured box
 * to point at and none is invented: every one is listed as a control the
 * participant marks by hand, in the instructions and in
 * printedSelectionControlsNotMeasured. Four blanks on JDF 683 page 2 -- the
 * municipal violation line and the three appeal lines -- are printed as runs of
 * underscore characters rather than as drawn rules, and are listed the same
 * way.
 *
 * WHAT THIS PACKET DOES NOT TELL A PARTICIPANT, AND WHY
 *
 * The committed legal-design record for this track carries two BUILD BLOCKERS
 * and states the fee as "Unconfirmed. The fee must be confirmed before
 * building." One blocker reads, in the record's own words: "Section 24-72-708
 * was not read in full in this review. Confirm the waiting period, the
 * exclusion set, the objection mechanics, and the fee before building." So
 * this packet states NO fee, NO waiting period, NO eligibility rule, NO
 * objection mechanics and NO service requirement, and says on its own first
 * page that it does not, and why. A packet is allowed to be a prepared form;
 * it is not allowed to invent the law it is filed under.
 *
 * This build rasterizes nothing. A local browser render is not a receipt: the
 * central raster workflow produces one, bound to the exact SHA-256 recorded in
 * reports/rendered-artifacts.json. It verifies nothing and issues no verdict.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeFlatOverlay } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { rulesOfPage } from "./rcap-official-forms/rcap-pdf-rule-lines.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { checkboxCandidates } from "./lib/pdf-stroked-boxes.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "co_municipal_conviction_seal-set";
const TRACK_ID = "co_municipal_conviction_seal";
const OUT = "data/rcap-all50/overlays/census-v1/co/co-municipal-conviction-seal-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-co_municipal_conviction_seal-set.mjs";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";

const RULE_TOLERANCE = 1.0;
const WRITE_BOX_HEIGHT = 12;
/* Narrowed from the module's default 40 so JDF 686's 31.25pt State rule is
 * seen. Every anchor is still matched on y, x0 AND x1 to within a point, so a
 * narrower threshold cannot make a box land anywhere but on its own rule. */
const RULE_MIN_LENGTH = 24;

const ROUTE = Object.freeze({
  jurisdiction: "CO",
  routeKey: "obligation:track-only:CO:co_municipal_conviction_seal",
  routeSelectionId: "co-municipal-conviction-seal-set-jdf-683-jdf-686",
  publicLabel: "Petition to seal a municipal conviction record",
  documents: [
    {
      formNumber: "JDF-683",
      sourceId: "official-form:JDF-683",
      componentId: "co_municipal_conviction_seal-primary-filing-1",
      title: "Petition to Seal Municipal Conviction Records",
      instrumentKind: "primary_filing",
      requirement: "required", condition: null,
      sha256: "6b451ae32c01ef1e637a460df627d246e1b4a61d4ac4f166005a7349fa87202e",
      declaredPath: "STATES/CO/02_PACKET_FORMS/CO__FORM__JDF-683__petition-to-seal-municipal-conviction-records__REV-2023-02-08__EN.pdf",
      footerMarker: "JDF 683"
    },
    {
      formNumber: "JDF-686",
      sourceId: "official-form:JDF-686",
      componentId: "co_municipal_conviction_seal-proposed-order-2",
      title: "Order to Seal Municipal Conviction Records",
      instrumentKind: "proposed_order",
      requirement: "required", condition: null,
      sha256: "abf997d8e701df0c74b1eb7833b35f30c006b50bf71b019abf7754d898433200",
      declaredPath: "STATES/CO/02_PACKET_FORMS/CO__FORM__JDF-686__order-to-seal-municipal-conviction-records__REV-2023-02-08__EN.pdf",
      footerMarker: "JDF 686"
    }
  ]
});

const RECORDS = Object.freeze({
  registry: "data/record-clearing/legal-design-track-registry.json",
  manifest: "data/record-clearing/legal-design-packet-set-manifests.json",
  census: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
  queue: "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json",
  buildability: "data/rcap-grade-a/source-wave-integration/SOURCE_READY_BUILDABILITY.json"
});

/* ---- policies ------------------------------------------------------------- */
const SUPPLY = (what) => ({ policy: "supply", what });
const WRITE = (fact) => ({ policy: "write", fact });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const ATTORNEY = (why) => ({ policy: "attorney", why });
const OPTIONAL = (what) => ({ policy: "optional", what });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";
const ATTORNEY_ONLY = "attorney-only; no attorney-representation fact is held for this participant, and this packet is prepared for a person filing without one";
const AGENCY = (what) => SUPPLY(what);

/*
 * The measured rules, per document.
 *
 * `rule` is the printed line read from the page's own content stream: `y` its
 * baseline, `x0` and `x1` its ends. Re-measured on every run; a rule that has
 * moved stops the build.
 */
const FLAT_ANCHORS = {
  "JDF-683": {
    /* --- page 1, the caption band ------------------------------------------ */
    "court-city-town-or-county": {
      page: 1, rule: { y: 685.22, x0: 198.58, x1: 354.91 },
      section: "Court", label: "Colorado City/Town or County",
      ...SUPPLY("the city or town whose municipal court entered the conviction. This route is a MUNICIPAL conviction, so the court is that city's or town's own court; the platform holds the county of your matter, and on this line a county and a municipality are not the same answer")
    },
    "court-mailing-address": {
      page: 1, rule: { y: 669.7, x0: 169.08, x1: 354.91 },
      section: "Court", label: "Court Mailing Address",
      ...SUPPLY("the mailing address of that municipal court. Colorado's municipal courts are not part of the state e-filing system and the platform holds no municipal court directory, so it states no address it cannot source")
    },
    "plaintiff-city-town": {
      page: 1, rule: { y: 627.95, x0: 233.6, x1: 350.9 },
      section: "Parties", label: "Plaintiff - The People of the City/Town of",
      ...SUPPLY("the name of the city or town that prosecuted you, which the form prints as the plaintiff: \"The People of the City/Town of ___\"")
    },
    defendant: {
      page: 1, rule: { y: 604.2, x0: 119.55, x1: 350.65 },
      section: "Parties", label: "Defendant", ...WRITE("participant.full_legal_name")
    },
    "filed-by-name": {
      page: 1, rule: { y: 560.92, x0: 102.05, x1: 354.9 },
      section: "Filed by", label: "Filed by - Name", ...WRITE("participant.full_legal_name")
    },
    "case-number": {
      page: 1, rule: { y: 554.92, x0: 402.68, x1: 531.48 },
      section: "Case (court use)", label: "Case Number", ...WRITE("matter.case_number")
    },
    "filed-by-mailing-address": {
      page: 1, rule: { y: 545.42, x0: 144.55, x1: 354.9 },
      section: "Filed by", label: "Filed by - Mailing Address", ...WRITE("participant.street_address")
    },
    division: {
      page: 1, rule: { y: 536.92, x0: 402.18, x1: 531.48 },
      section: "Case (court use)", label: "Division",
      ...PROTECT(COURT_OWNED, "the division is assigned by the court, and the form prints \"This box is for court use only\" over the whole block")
    },
    "filed-by-phone": {
      page: 1, rule: { y: 529.92, x0: 101.55, x1: 265.85 },
      section: "Filed by", label: "Filed by - Phone", ...WRITE("participant.phone")
    },
    "filed-by-fax": {
      page: 1, rule: { y: 529.92, x0: 294.88, x1: 354.9 },
      section: "Filed by", label: "Filed by - Fax (optional)",
      ...OPTIONAL("a fax number, if you have one. Most people do not, and the line is left empty rather than filled with something else")
    },
    courtroom: {
      page: 1, rule: { y: 518.67, x0: 413.18, x1: 531.48 },
      section: "Case (court use)", label: "Courtroom",
      ...PROTECT(COURT_OWNED, "the courtroom is assigned by the court; the form prints \"This box is for court use only\" over the whole block")
    },
    "filed-by-email": {
      page: 1, rule: { y: 514.4, x0: 100.55, x1: 252.35 },
      section: "Filed by", label: "Filed by - Email", ...WRITE("participant.email")
    },
    "bar-number": {
      page: 1, rule: { y: 514.4, x0: 314.88, x1: 354.9 },
      section: "Filed by", label: "Attorney Bar Number",
      ...ATTORNEY(`${ATTORNEY_ONLY}. The form prints "(For lawyers)" beneath this line`)
    },

    /* --- page 1, item 2: the petitioner ------------------------------------ */
    "petitioner-dob": {
      page: 1, rule: { y: 321.1, x0: 358.4, x1: 540.23 },
      section: "2. Information about the Petitioner", label: "Date of Birth",
      ...WRITE("participant.date_of_birth")
    },
    "petitioner-mailing-address": {
      page: 1, rule: { y: 286.6, x0: 184.83, x1: 540.23 },
      section: "2. Information about the Petitioner", label: "Petitioner's Mailing Address, only if different from 'Filed by'",
      ...SUPPLY("a mailing address, ONLY if the Petitioner's is different from the one in the 'Filed by' box above. The form asks for it only in that case, so it is left empty rather than repeating what is already on the page")
    },
    "petitioner-city": {
      page: 1, rule: { y: 269.33, x0: 207.33, x1: 351.16 },
      section: "2. Information about the Petitioner", label: "Petitioner's City, only if different",
      ...SUPPLY("the city of that different address, if there is one")
    },
    "petitioner-state": {
      page: 1, rule: { y: 269.33, x0: 382.9, x1: 423.17 },
      section: "2. Information about the Petitioner", label: "Petitioner's State, only if different",
      ...SUPPLY("the state of that different address, if there is one")
    },
    "petitioner-zip": {
      page: 1, rule: { y: 269.33, x0: 472.2, x1: 540.23 },
      section: "2. Information about the Petitioner", label: "Petitioner's Zip Code, only if different",
      ...SUPPLY("the ZIP code of that different address, if there is one")
    },
    "petitioner-main-phone": {
      page: 1, rule: { y: 252.08, x0: 175.33, x1: 324.13 },
      section: "2. Information about the Petitioner", label: "Petitioner's Main Phone number, only if different",
      ...SUPPLY("a main phone number, only if it is different from the one in the 'Filed by' box")
    },
    "petitioner-work-phone": {
      page: 1, rule: { y: 252.08, x0: 395.93, x1: 540.23 },
      section: "2. Information about the Petitioner", label: "Petitioner's Work Phone number",
      ...SUPPLY("a work phone number, if you have one")
    },

    /* --- page 1, item 3: the agencies -------------------------------------- */
    "agency-municipal-court-case": {
      page: 1, rule: { y: 202.33, x0: 391.43, x1: 540.23 },
      section: "3. Agencies with custody of the records", label: "Municipal Courts - Case Number",
      ...SUPPLY("the municipal court case number or numbers you are asking to seal, as the court's own record writes them")
    },
    "agency-municipal-court-address": {
      page: 1, rule: { y: 189.8, x0: 202.83, x1: 540.23 },
      section: "3. Agencies with custody of the records", label: "Municipal Courts - Mailing Address",
      ...AGENCY("that municipal court's mailing address")
    },
    "agency-sheriff-address": {
      page: 1, rule: { y: 155.05, x0: 202.83, x1: 540.23 },
      section: "3. Agencies with custody of the records", label: "Sheriff's Department - Mailing Address",
      ...AGENCY("the mailing address of the Sheriff's Department holding these records, if it holds any")
    },
    "agency-district-attorney-address": {
      page: 1, rule: { y: 120.27, x0: 202.83, x1: 540.23 },
      section: "3. Agencies with custody of the records", label: "District Attorney - Mailing Address",
      ...AGENCY("the District Attorney's mailing address, if the District Attorney holds any of these records")
    },
    "agency-city-attorney-address": {
      page: 1, rule: { y: 85.53, x0: 202.83, x1: 540.23 },
      section: "3. Agencies with custody of the records", label: "City Attorney - Mailing Address",
      ...AGENCY("the City Attorney's mailing address. On a municipal conviction this is usually the prosecuting office")
    },

    /* --- page 2, the rest of item 3 ---------------------------------------- */
    "agency-law-enforcement-name": {
      page: 2, rule: { y: 705.47, x0: 241.1, x1: 360.15 },
      section: "3. Agencies with custody of the records", label: "Law Enforcement - name",
      ...AGENCY("the name of the law enforcement agency that arrested or cited you")
    },
    "agency-law-enforcement-case": {
      page: 2, rule: { y: 705.47, x0: 430.18, x1: 540.23 },
      section: "3. Agencies with custody of the records", label: "Law Enforcement - Case Number",
      ...AGENCY("that agency's own case number, which is usually different from the court case number")
    },
    "agency-law-enforcement-address": {
      page: 2, rule: { y: 692.97, x0: 202.83, x1: 540.23 },
      section: "3. Agencies with custody of the records", label: "Law Enforcement - Mailing Address",
      ...AGENCY("that agency's mailing address")
    },
    "agency-other-name": {
      page: 2, rule: { y: 641.2, x0: 156.58, x1: 540.23 },
      section: "3. Agencies with custody of the records", label: "Other agency - name",
      ...AGENCY("the name of any other agency holding records of this conviction")
    },
    "agency-other-address": {
      page: 2, rule: { y: 628.7, x0: 202.83, x1: 540.23 },
      section: "3. Agencies with custody of the records", label: "Other agency - Mailing Address",
      ...AGENCY("that agency's mailing address")
    },

    /* --- page 2, item 4: the conviction ------------------------------------ */
    "date-sentenced": {
      page: 2, rule: { y: 540.67, x0: 182.58, x1: 360.16 },
      section: "4. Information about the criminal conviction to seal", label: "Date Sentenced",
      ...SUPPLY("the date you were sentenced in the case you are asking to seal, from the court's own record")
    },
    "probation-parole-termination": {
      page: 2, rule: { y: 523.42, x0: 319.88, x1: 468.21 },
      section: "4. Information about the criminal conviction to seal", label: "Probation/Parole Supervision Termination Date",
      ...SUPPLY("the date your probation or parole supervision ended, from the court's own record")
    },

    /* --- page 2, item 8: the explanation ----------------------------------- */
    "explain-line-1": {
      page: 2, rule: { y: 284.1, x0: 108.05, x1: 540.23 },
      section: "8. Why the harm to your privacy outweighs the public interest", label: "Explain - first line",
      ...SUPPLY("why the harm to your privacy, or the danger of unwarranted adverse consequences, outweighs the public interest in keeping these records public. This is the substance of item 8 and it is yours: nobody but you knows what the record is costing you. Three printed lines are provided and this is the first")
    },
    "explain-line-2": {
      page: 2, rule: { y: 266.83, x0: 108.05, x1: 540.23 },
      section: "8. Why the harm to your privacy outweighs the public interest", label: "Explain - second line",
      ...SUPPLY("the rest of that explanation, on the second printed line")
    },
    "explain-line-3": {
      page: 2, rule: { y: 249.58, x0: 108.05, x1: 540.23 },
      section: "8. Why the harm to your privacy outweighs the public interest", label: "Explain - third line",
      ...SUPPLY("the rest of that explanation, on the third printed line")
    },

    /* --- page 3, item 14: the certificate of service ------------------------ */
    "certificate-date": {
      page: 3, rule: { y: 578.67, x0: 225.85, x1: 360.15 },
      section: "14. Certificate of Service", label: "Certificate of Service - date you gave the copy to the prosecuting attorney",
      ...PROTECT(SIGNATURE, "service has not happened when the packet is prepared, and a certificate dated before the act it certifies would be false")
    },
    "certificate-email-or-fax": {
      page: 3, rule: { y: 520.92, x0: 231.1, x1: 540.23 },
      section: "14. Certificate of Service", label: "Certificate of Service - email or fax address served",
      ...PROTECT(SIGNATURE, "the certificate records where you actually sent it, and you complete it when you sign it, after service")
    },
    "certificate-recipient-1": {
      page: 3, rule: { y: 486.4, x0: 191.83, x1: 522.23 },
      section: "14. Certificate of Service", label: "Certificate of Service - first recipient served by hand delivery or regular mail",
      ...PROTECT(SIGNATURE, "the certificate records who you actually served, and you complete it when you sign it, after service")
    },
    "certificate-recipient-2": {
      page: 3, rule: { y: 473.15, x0: 191.83, x1: 522.23 },
      section: "14. Certificate of Service", label: "Certificate of Service - second recipient served by hand delivery or regular mail",
      ...PROTECT(SIGNATURE, "the certificate records who you actually served, and you complete it when you sign it, after service")
    },

    /* --- page 3, item 15: signature ---------------------------------------- */
    "petitioner-signature": {
      page: 3, rule: { y: 404.63, x0: 108.05, x1: 324.13 },
      section: "15. Signature", label: "Petitioner (Defendant) Signature",
      ...PROTECT(SIGNATURE, "you sign this yourself; a signature the packet drew would not be yours")
    },
    "petitioner-signature-date": {
      page: 3, rule: { y: 404.63, x0: 360.15, x1: 504.2 },
      section: "15. Signature", label: "Petitioner (Defendant) Signature - Dated",
      ...PROTECT(SIGNATURE, "you date it on the day you sign; a date written in advance would be false")
    },
    "lawyer-signature": {
      page: 3, rule: { y: 357.85, x0: 108.05, x1: 324.13 },
      section: "15. Signature", label: "Lawyer Signature (if any)",
      ...ATTORNEY(ATTORNEY_ONLY)
    }
  },

  "JDF-686": {
    /* --- page 1, the caption band ------------------------------------------ */
    "court-city-town-or-county": {
      page: 1, rule: { y: 652.2, x0: 198.58, x1: 354.91 },
      section: "Court", label: "Colorado City/Town or County",
      ...SUPPLY("the same city or town you wrote at the head of the petition")
    },
    "court-mailing-address": {
      page: 1, rule: { y: 636.7, x0: 169.08, x1: 354.91 },
      section: "Court", label: "Court Mailing Address",
      ...SUPPLY("the same municipal court address you wrote on the petition")
    },
    "plaintiff-city-town": {
      page: 1, rule: { y: 588.42, x0: 233.6, x1: 354.9 },
      section: "Parties", label: "Plaintiff - The People of the City/Town of",
      ...SUPPLY("the same city or town you named as the plaintiff on the petition")
    },
    "case-number": {
      page: 1, rule: { y: 545.67, x0: 402.68, x1: 531.23 },
      section: "Case (court use)", label: "Case Number", ...WRITE("matter.case_number")
    },
    defendant: {
      page: 1, rule: { y: 545.42, x0: 119.55, x1: 354.9 },
      section: "Parties", label: "Defendant", ...WRITE("participant.full_legal_name")
    },
    division: {
      page: 1, rule: { y: 532.92, x0: 402.18, x1: 531.23 },
      section: "Case (court use)", label: "Division",
      ...PROTECT(COURT_OWNED, "the division is assigned by the court; the form prints \"This box is for court use only\" over the whole block")
    },
    courtroom: {
      page: 1, rule: { y: 519.92, x0: 413.18, x1: 531.23 },
      section: "Case (court use)", label: "Courtroom",
      ...PROTECT(COURT_OWNED, "the courtroom is assigned by the court; the form prints \"This box is for court use only\" over the whole block")
    },

    /* --- page 1, section 1: background ------------------------------------- */
    "defendant-full-name": {
      page: 1, rule: { y: 418.88, x0: 212.6, x1: 396.18 },
      section: "1. Background", label: "Defendant's Full Name", ...WRITE("participant.full_legal_name")
    },
    "defendant-dob": {
      page: 1, rule: { y: 418.88, x0: 472.45, x1: 540.23 },
      section: "1. Background", label: "Date of Birth", ...WRITE("participant.date_of_birth")
    },
    "defendant-mailing-address": {
      page: 1, rule: { y: 395.63, x0: 184.83, x1: 540.23 },
      section: "1. Background", label: "Mailing Address", ...WRITE("participant.street_address")
    },
    "defendant-city": {
      page: 1, rule: { y: 378.38, x0: 207.33, x1: 360.16 },
      section: "1. Background", label: "City", ...WRITE("participant.city")
    },
    /* The 31.25pt rule the shared reader's default 40pt minimum hides. See the
     * header comment and build-findings.json. */
    "defendant-state": {
      page: 1, rule: { y: 378.38, x0: 391.93, x1: 423.18 },
      section: "1. Background", label: "State", ...WRITE("participant.state")
    },
    "defendant-zip": {
      page: 1, rule: { y: 378.38, x0: 472.2, x1: 540.23 },
      section: "1. Background", label: "Zip Code", ...WRITE("participant.zip")
    },

    /* --- page 1, section 3: the decision ----------------------------------- */
    "decision-municipal-case-number": {
      page: 1, rule: { y: 119.02, x0: 279.63, x1: 504.21 },
      section: "3. Decision - Records Sealed", label: "Municipal Court case number",
      ...WRITE("matter.case_number")
    },
    "decision-law-enforcement-case-number": {
      page: 1, rule: { y: 101.77, x0: 324.13, x1: 504.21 },
      section: "3. Decision - Records Sealed", label: "Law Enforcement Agency case number",
      ...AGENCY("the law enforcement agency's own case number, copied from item 3 of the petition, so the order names the records it seals")
    },

    /* --- page 2, So Ordered ------------------------------------------------ */
    "judge-signature": {
      page: 2, rule: { y: 392.38, x0: 108.05, x1: 324.13 },
      section: "So Ordered", label: "Judge or Magistrate signature",
      ...PROTECT(COURT_OWNED, "the judge or magistrate signs their own order; a proposed order that signed itself would not be a proposal")
    },
    "order-dated": {
      page: 2, rule: { y: 392.38, x0: 360.15, x1: 504.2 },
      section: "So Ordered", label: "Order - Dated",
      ...PROTECT(COURT_OWNED, "the court dates its own order")
    }
  }
};

/*
 * The controls both forms print and neither draws as a stroked path.
 *
 * checkboxCandidates finds none on either document: the tick boxes are the
 * glyph U+2751 in the text stream. There is no box to point a write at and
 * none is invented. Asserted to still be unmeasurable on every build, so a
 * future revision that draws them as paths fails here rather than silently
 * continuing to leave them out.
 */
const PRINTED_SELECTION_CONTROLS_NOT_MEASURED = {
  "JDF-683": [
    { page: 1, section: "Court", printedNear: "Court: Municipal District", what: "whether the case was in the Municipal or the District court" },
    { page: 1, section: "1. The Petitioner is", printedNear: "the Defendant and the primary subject of the criminal conviction record.", what: "that you are the Defendant yourself - this is the box a person filing their own petition ticks" },
    { page: 1, section: "1. The Petitioner is", printedNear: "the designated representative of the Defendant, by power of attorney or notarized authorization.", what: "that you are the Defendant's designated representative" },
    { page: 1, section: "1. The Petitioner is", printedNear: "the parent of the Defendant, if Defendant is under legal disability.", what: "that you are the Defendant's parent" },
    { page: 1, section: "1. The Petitioner is", printedNear: "the appointed legal representative of the Defendant, if Defendant is under legal disability.", what: "that you are the Defendant's appointed legal representative" },
    { page: 1, section: "3. Agencies with custody of the records", printedNear: "Municipal Courts Case Number:", what: "that a municipal court holds records" },
    { page: 1, section: "3. Agencies with custody of the records", printedNear: "Sheriff's Department", what: "that the Sheriff's Department holds records" },
    { page: 1, section: "3. Agencies with custody of the records", printedNear: "District Attorney", what: "that the District Attorney holds records" },
    { page: 1, section: "3. Agencies with custody of the records", printedNear: "City Attorney", what: "that the City Attorney holds records" },
    { page: 2, section: "3. Agencies with custody of the records", printedNear: "Law Enforcement (name)", what: "that a law enforcement agency holds records" },
    { page: 2, section: "3. Agencies with custody of the records", printedNear: "Colorado Bureau of Investigation (CBI) (Required)", what: "the CBI, which the form marks Required and whose address it prints for you" },
    { page: 2, section: "3. Agencies with custody of the records", printedNear: "Other:", what: "that some other agency holds records" },
    { page: 2, section: "4. Information about the criminal conviction to seal", printedNear: "Municipal Violation(s) of", what: "that the offence sealed is a municipal violation, on a line the form prints as underscores rather than as a rule" },
    { page: 2, section: "5. Was this case appealed?", printedNear: "Was this case appealed? Yes No", what: "whether the case was appealed" },
    { page: 2, section: "6. Criminal history record", printedNear: "criminal history record check was conducted no more than 20 days prior to the filing of this Petition.", what: "whether a current verified copy of the criminal history record is attached - the form gives you 10 days after filing if it is not" },
    { page: 2, section: "7. Restitution", printedNear: "Does Defendant still owe restitution?", what: "whether restitution is still owed" },
    { page: 3, section: "14. Certificate of Service", printedNear: "Efiling (where available)", what: "that you served by e-filing" },
    { page: 3, section: "14. Certificate of Service", printedNear: "Email or Fax to:", what: "that you served by email or fax" },
    { page: 3, section: "14. Certificate of Service", printedNear: "Hand Delivery, to: (name, place)", what: "that you served by hand delivery" },
    { page: 3, section: "14. Certificate of Service", printedNear: "Regular Mail, addressed to: (name, full address)", what: "that you served by regular mail" }
  ],
  "JDF-686": [
    { page: 1, section: "Court", printedNear: "Court: Municipal District", what: "whether the case was in the Municipal or the District court" },
    { page: 2, section: "So Ordered", printedNear: "Judge Magistrate Dated", what: "whether the signing officer is a Judge or a Magistrate - the court's own choice, not the participant's" }
  ]
};

/*
 * Blanks the form prints as runs of underscore characters rather than as drawn
 * rules. There is no measurable rule under them, so no write box exists and
 * none is invented.
 */
const PRINTED_BLANKS_NOT_MEASURED = {
  "JDF-683": [
    { page: 2, section: "4. Information about the criminal conviction to seal", printedNear: "Municipal Violation(s) of ________", what: "the municipal violation or violations you were convicted of, as the court's record names them" },
    { page: 2, section: "5. Was this case appealed?", printedNear: "Appeal Case Number: ________", what: "the appeal case number, only if the case was appealed" },
    { page: 2, section: "5. Was this case appealed?", printedNear: "Appellate Court: ________", what: "the appellate court, only if the case was appealed" },
    { page: 2, section: "5. Was this case appealed?", printedNear: "Result: ________ Date: ________", what: "the result of the appeal and its date, only if the case was appealed" }
  ],
  "JDF-686": []
};

/* ---- fixtures ------------------------------------------------------------- */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1988-04-17",
    "participant.street_address": "412 Cherry Creek Way",
    "participant.city": "Denver",
    "participant.state": "CO",
    "participant.zip": "80202",
    "participant.phone": "303-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "matter.case_number": "M2019-004217"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1961-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city": "Colorado Springs",
    "participant.state": "Colorado",
    "participant.zip": "80921-2214",
    "participant.phone": "(719) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org",
    "matter.case_number": "2014M0011882-SUPPLEMENTAL"
  }
};

/* ---- helpers -------------------------------------------------------------- */
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`;
};
const entryDigest = (value) => sha256(Buffer.from(stable(value), "utf8"));
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}
function readRecord(rel) {
  const bytes = fs.readFileSync(path.join(ROOT, rel));
  return { path: rel, bytes, data: JSON.parse(bytes.toString("utf8")), sha256: sha256(bytes), byteLength: bytes.length };
}

/* ---- the committed records ------------------------------------------------ */
function loadControllingRecords() {
  const loaded = Object.fromEntries(Object.entries(RECORDS).map(([k, rel]) => [k, readRecord(rel)]));
  const pins = [];
  const pin = (key, pointer, entry) => {
    const record = loaded[key];
    pins.push({
      record: record.path, wholeFileSha256: record.sha256, byteLength: record.byteLength,
      thisFamilysEntry: pointer, thisFamilysEntrySha256: entryDigest(entry),
      whyBothPinsExist: "the whole-file pin detects any edit to a shared national record; the entry pin says whether the edit touched this family"
    });
    return entry;
  };

  const track = loaded.registry.data.tracks.find((t) => t.trackId === TRACK_ID);
  assert.ok(track, `${RECORDS.registry} carries no track ${TRACK_ID}`);
  assert.equal(track.jurisdiction, "CO");
  /* The two sentences this packet's silences rest on. If the record ever
   * confirms the fee or the statute, this build's refusal to state them is no
   * longer correct and the build should be revisited rather than quietly keep
   * withholding. */
  assert.match(String(track.rules?.fees ?? ""), /unconfirmed/i,
    "the track record now states a fee for this route; this packet was built on its refusal to state one and must be revisited");
  const unreadStatute = (track.unresolvedQuestions ?? []).find((q) => /24-72-708 was not read in full/i.test(q.question ?? ""));
  assert.ok(unreadStatute,
    "the track record no longer says Sec. 24-72-708 was unread; this packet's silence about eligibility rests on that sentence");
  pin("registry", `tracks[trackId=${TRACK_ID}]`, track);

  const packetSet = loaded.manifest.data.packetSets.find((p) => p.packetSetId === FAMILY_ID);
  assert.ok(packetSet, `${RECORDS.manifest} carries no packet set ${FAMILY_ID}`);
  const components = [...packetSet.components].sort((a, b) => a.order - b.order);
  assert.deepEqual(components.map((c) => c.officialFormId), ROUTE.documents.map((d) => d.formNumber),
    "the committed component set no longer names the two forms this build renders, in this order");
  assert.deepEqual(components.map((c) => c.componentId), ROUTE.documents.map((d) => d.componentId));
  assert.deepEqual(components.map((c) => c.requirement), ROUTE.documents.map((d) => d.requirement));
  pin("manifest", `packetSets[packetSetId=${FAMILY_ID}]`, packetSet);

  const routes = (loaded.census.data.routes ?? []).filter((r) => r.packetSetId === FAMILY_ID);
  assert.ok(routes.length >= 1, `the route-obligation census carries no route for ${FAMILY_ID}`);
  pin("census", `routes[packetSetId=${FAMILY_ID}]`, routes);

  const queueFamily = loaded.queue.data.families.find((f) => f.familyId === FAMILY_ID);
  assert.ok(queueFamily, `${RECORDS.queue} carries no ${FAMILY_ID}`);
  assert.equal(queueFamily.directory, OUT);
  assert.equal(queueFamily.buildScript, BUILD_SCRIPT);
  assert.deepEqual([...queueFamily.routeKeys], [ROUTE.routeKey]);
  for (const declared of queueFamily.sourceHashes ?? []) {
    const doc = ROUTE.documents.find((d) => d.sourceId === declared.sourceId);
    assert.ok(doc, `the queue binds ${declared.sourceId}, which this build does not render`);
    assert.equal(declared.sha256, doc.sha256, `${declared.sourceId} no longer declares the digest this build was written against`);
  }
  pin("queue", `families[familyId=${FAMILY_ID}]`, queueFamily);

  const buildability = (loaded.buildability.data.rows ?? []).find((r) => r.familyId === FAMILY_ID);
  assert.ok(buildability, `${RECORDS.buildability} carries no row for ${FAMILY_ID}`);
  assert.equal(buildability.verdict, "EVERY_BOUND_SOURCE_IS_A_HELD_PDF");
  pin("buildability", `rows[familyId=${FAMILY_ID}]`, buildability);

  return { track, packetSet, routes, queueFamily, buildability, pins };
}

/* ---- source binding ------------------------------------------------------- */
function mountedCustodies(index) {
  const repoRoots = [ROOT];
  try {
    const main = path.dirname(execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      { cwd: ROOT, encoding: "utf8" }).trim());
    if (main && main !== ROOT) repoRoots.push(main);
  } catch { /* not a git checkout: this checkout is then the only repository root */ }

  const mounts = [];
  const seen = new Set();
  const add = (custody, pathsRelativeTo, base, describes) => {
    const absolute = path.resolve(base);
    const key = `${custody}@${absolute}`;
    if (seen.has(key) || !fs.existsSync(absolute)) return;
    seen.add(key);
    mounts.push({ custody, pathsRelativeTo, base: absolute, describes });
  };
  const library = process.env.MASTER_LIBRARY_SOURCE_DIR;
  if (library) add("master_library", "custodyRoot", library, "MASTER_LIBRARY_SOURCE_DIR");
  for (const custody of index.custodies ?? []) {
    const shape = custody.pathsRelativeTo ?? "custodyRoot";
    for (const repo of repoRoots) {
      if (shape === "custodyRoot") add(custody.id, shape, path.join(repo, custody.root), `${custody.id} under ${repo}`);
      else if (fs.existsSync(path.join(repo, custody.root))) add(custody.id, shape, repo, `${custody.id} (repository-relative paths) under ${repo}`);
    }
  }
  return mounts;
}

function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const mounts = mountedCustodies(index);
  const resolved = [];
  const failures = [];
  for (const wanted of ROUTE.documents) {
    const entries = (index.entries ?? [])
      .filter((e) => e.sha256 === wanted.sha256)
      .sort((a, b) => (a.path === wanted.declaredPath ? -1 : b.path === wanted.declaredPath ? 1 : a.path.localeCompare(b.path)));
    if (entries.length === 0) {
      failures.push({
        sourceIdentity: wanted.sourceId, formNumber: wanted.formNumber, expectedSha256: wanted.sha256,
        declaredPath: wanted.declaredPath, why: "the committed corpus index carries no entry at this digest"
      });
      continue;
    }
    const tried = [];
    let bound = null;
    for (const entry of entries) {
      const custody = entry.custody ?? "master_library";
      for (const mount of mounts) {
        if (bound) break;
        if (mount.custody !== custody) continue;
        const attempt = path.join(mount.base, entry.path);
        if (!fs.existsSync(attempt)) { tried.push({ path: attempt, why: "not present in this container" }); continue; }
        const bytes = fs.readFileSync(attempt);
        const digest = sha256(bytes);
        if (digest !== wanted.sha256) { tried.push({ path: attempt, why: `SHA-256 drift: holds ${digest}` }); continue; }
        bound = { entry, custody, absolute: attempt, bytes, digest, matchedDeclaredPath: entry.path === wanted.declaredPath };
      }
      if (bound) break;
    }
    if (!bound) {
      failures.push({
        sourceIdentity: wanted.sourceId, formNumber: wanted.formNumber, expectedSha256: wanted.sha256,
        declaredPath: wanted.declaredPath, pathsTried: tried, why: "no mounted custody holds these exact bytes"
      });
      continue;
    }
    resolved.push({
      ...wanted,
      pathInArchive: bound.entry.path, boundFromCustody: bound.custody,
      boundAtTheDeclaredPath: bound.matchedDeclaredPath,
      absolutePath: bound.absolute, revision: bound.entry.revision ?? null,
      structuralClassObserved: bound.entry.structuralClassObserved ?? null,
      acroFieldCount: bound.entry.acroFieldCount ?? null, indexPageCount: bound.entry.pageCount ?? null,
      byteLength: bound.bytes.length, bytes: bound.bytes, sha256Confirmed: bound.digest
    });
  }
  return {
    resolved, failures,
    custodiesSearched: mounts.map((m) => ({
      custody: m.custody, pathsRelativeTo: m.pathsRelativeTo, base: path.relative(ROOT, m.base) || ".", describes: m.describes
    }))
  };
}

/* ---- census: measure the rules, then place the boxes on them -------------- */
async function censusFlat(source) {
  const anchors = FLAT_ANCHORS[source.formNumber];
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y * 100) / 100, text: l.text }))
  }));
  const measured = pages.map((p, i) => ({ page: i + 1, horizontal: rulesOfPage(p, { minLength: RULE_MIN_LENGTH }).horizontal ?? [] }));

  /* Both claims this build makes about the document, checked rather than
   * assumed: that it has no fillable field, and that it draws no stroked tick
   * box. */
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
  for (const [key, entry] of Object.entries(anchors)) {
    const here = measured.find((m) => m.page === entry.page)?.horizontal ?? [];
    const hit = here.find((r) =>
      Math.abs(r.y - entry.rule.y) <= RULE_TOLERANCE
      && Math.abs(r.x - entry.rule.x0) <= RULE_TOLERANCE
      && Math.abs(r.endX - entry.rule.x1) <= RULE_TOLERANCE);
    if (!hit) {
      ruleDrift.push({
        anchor: key, page: entry.page, expected: entry.rule,
        nearest: here.filter((r) => Math.abs(r.y - entry.rule.y) <= 6)
          .map((r) => ({ y: +r.y.toFixed(2), x: +r.x.toFixed(2), endX: +r.endX.toFixed(2) })).slice(0, 4)
      });
      continue;
    }
    const writeBox = {
      x: Number((hit.x + 2).toFixed(2)),
      y: Number((hit.y + 2).toFixed(2)),
      width: Number((hit.width - 4).toFixed(2)),
      height: WRITE_BOX_HEIGHT
    };
    rows.push({
      key, name: key, page: entry.page, rect: writeBox, writeBox,
      rectBasis: "measured_printed_rule_read_from_the_page_content_stream",
      measuredRule: { y: +hit.y.toFixed(2), x: +hit.x.toFixed(2), endX: +hit.endX.toFixed(2), width: +hit.width.toFixed(2), thickness: +hit.height.toFixed(2) },
      ruleIsBelowTheReadersDefaultMinimum: hit.width < 40,
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
    rows, ruleDrift, pageText, pageCount: pages.length, acroFieldCount,
    strokedCheckboxCount: strokedBoxes.reduce((n, p) => n + p.boxes.length, 0),
    measuredRuleCount: measured.reduce((n, m) => n + m.horizontal.length, 0),
    footerMarkerFoundOnEveryPage: pageText.every((p) =>
      p.lines.some((l) => l.text.includes(source.footerMarker)))
  };
}

/* ---- render --------------------------------------------------------------- */
async function renderFlat(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const writable = census.rows.filter((r) => r.policy === "write");
  /*
   * Geometry-based protection: every rule this build refuses is handed to the
   * overlay as a protected rule, so a write box that landed on a signature or
   * a court-use rule is refused for WHERE it is, whatever its label says.
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
    anchors, protectedRules,
    explicitMappings: Object.fromEntries(writable.map((r) => [r.effectiveLabel, r.fact])),
    facts,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: source.title
  });
  return { bytes, report };
}

/* ---- byte proof ----------------------------------------------------------- */
/*
 * A measured overlay draws into the page's own content stream, so there is no
 * flattened widget appearance to read. The ink is read back the way it was
 * written: the finalized page TEXT, at the coordinates of the rule each value
 * was drawn on, with the SOURCE's own text at those same coordinates
 * subtracted. A printed form is not an empty rectangle -- JDF 683's
 * certificate-of-service sentence sits level with its own rule -- and reading
 * the output alone would report the form's own words as ink this build put on
 * a field it refused.
 */
async function byteProof(source, census, artifactBytes, report, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const out = await PDFDocument.load(artifactBytes, { ignoreEncryption: true });
  const src = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const itemsOf = (doc) => new Map(doc.getPages().map((p, i) => [i + 1, extractTextItems(p).map((t) => ({
    x: Number(t.x), y: Number(t.y), width: Number(t.width ?? 0), text: String(t.text ?? "")
  }))]));
  const outText = itemsOf(out);
  const srcText = itemsOf(src);

  const inBox = (t, box) => t.x >= box.x - 2 && t.x <= box.x + box.width + 2
    && t.y >= box.y - 3 && t.y <= box.y + box.height + 3;
  /*
   * ONE GLYPH RUN BELONGS TO ONE BOX, AND IT IS THE NEAREST ONE.
   *
   * Two of JDF 686's caption rules are 12.75 points apart - Case Number at
   * y=545.67 and Division at y=532.92 - and a 12-point write box read with a
   * 3-point tolerance claims text from both. Read that way the case number,
   * correctly drawn on its own rule, also read as ink inside the court-owned
   * Division box, and the family reported two protected writes it does not
   * have. A byte proof that mis-attributes ink is worse than none: it reports
   * a clean packet as broken, and the pressure is then to relax the check.
   *
   * So every drawn item is assigned to exactly one box: the one whose write
   * baseline is nearest it among the boxes that contain it. Nothing is
   * softened - a value drawn on the WRONG rule is attributed to that rule and
   * still reads as ink on a field the map refused.
   */
  const boxesOf = new Map();
  for (const r of census.rows) {
    if (!boxesOf.has(r.page)) boxesOf.set(r.page, []);
    boxesOf.get(r.page).push({ key: r.key, rect: r.rect });
  }
  const nearestBoxKey = (page, t) => {
    let best = null;
    for (const b of boxesOf.get(page) ?? []) {
      if (!inBox(t, b.rect)) continue;
      const distance = Math.abs(t.y - b.rect.y);
      if (best === null || distance < best.distance) best = { key: b.key, distance };
    }
    return best?.key ?? null;
  };
  const drawnInBox = (page, key, box) => {
    const already = new Set((srcText.get(page) ?? [])
      .filter((t) => nearestBoxKey(page, t) === key)
      .map((t) => `${Math.round(t.x)}:${t.text}`));
    return (outText.get(page) ?? [])
      .filter((t) => t.text.trim() && nearestBoxKey(page, t) === key)
      .filter((t) => !already.has(`${Math.round(t.x)}:${t.text}`))
      .sort((a, b) => a.x - b.x)
      .map((t) => t.text);
  };

  const written = new Set(report.written.map((w) => w.anchor));
  const actualWrites = [];
  const refusedFieldsWithInk = [];
  let glyphs = 0;

  for (const r of census.rows) {
    const text = drawnInBox(r.page, r.key, r.rect);
    const ink = text.join("").trim();
    if (written.has(r.effectiveLabel) && r.policy === "write") {
      glyphs += ink.replace(/\s+/g, "").length;
      actualWrites.push({
        field: r.key, factId: r.fact, page: r.page, rect: r.rect,
        measuredRule: r.measuredRule, section: r.section, effectiveLabel: r.effectiveLabel,
        drawnText: text, expected: facts[r.fact] ?? null,
        matchesExpected: ink === String(facts[r.fact] ?? "").trim()
      });
      continue;
    }
    if (ink.length === 0) continue;
    refusedFieldsWithInk.push({ fieldId: r.key, page: r.page, drawnText: text });
  }

  /*
   * nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, MEASURED: every text item in
   * the finalized bytes differenced against the same item in the pinned source,
   * keeping only what this build added, then dropping whatever landed inside a
   * measured write box. What remains is ink this build put somewhere no rule
   * was measured.
   */
  const boxes = census.rows.map((r) => ({ page: r.page, rect: r.rect }));
  const outside = [];
  for (const [page, items] of outText) {
    const before = new Map();
    for (const t of srcText.get(page) ?? []) {
      const key = `${Math.round(t.x)}|${Math.round(t.y)}|${t.text}`;
      before.set(key, (before.get(key) ?? 0) + 1);
    }
    for (const t of items) {
      const stripped = t.text.replace(/\s+/g, "");
      if (stripped.length === 0) continue;
      const key = `${Math.round(t.x)}|${Math.round(t.y)}|${t.text}`;
      const remaining = before.get(key) ?? 0;
      if (remaining > 0) { before.set(key, remaining - 1); continue; }
      if (boxes.some((b) => b.page === page && inBox(t, b.rect))) continue;
      outside.push({ page, x: +t.x.toFixed(2), y: +t.y.toFixed(2), text: t.text, glyphs: stripped.length });
    }
  }

  return {
    actualWrites, refusedFieldsWithInk, glyphs,
    outsideMeasuredWriteBoxes: outside,
    glyphsOutsideMeasuredWriteBoxes: outside.reduce((n, t) => n + t.glyphs, 0)
  };
}

/* ---- field map ------------------------------------------------------------ */
function mapFor(source, census, report, boundaryReport) {
  const writtenNames = new Set(report.written.map((w) => w.anchor));
  const boundaryWritten = new Set((boundaryReport?.written ?? []).map((w) => w.anchor));
  const boundaryUnfittable = new Map((boundaryReport?.unfittable ?? []).map((u) => [u.anchor, u]));
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const boundaryWrites = [];
  const boundaryRefusals = [];

  for (const r of census.rows) {
    const base = {
      field: `${source.formNumber}/${r.key}`,
      fieldName: `${source.formNumber}/${r.key}`,
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      measuredRule: r.measuredRule,
      ruleIsBelowTheReadersDefaultMinimum: r.ruleIsBelowTheReadersDefaultMinimum === true,
      printedLabel: r.effectiveLabel, printedLine: r.effectiveLabel,
      sectionHeading: r.section, regionHeading: r.effectiveLabel,
      effectiveLabel: r.effectiveLabel,
      captionBasis: "the printed caption read from this page's own text stream at the coordinate of the rule the value is written on",
      printedTextAtCoordinate: r.printedTextAtCoordinate,
      document: source.formNumber, componentId: source.componentId
    };

    if (r.policy === "write") {
      const refusedWrite = (fixture, unfittable) => ({
        ...base,
        reason: unfittable
          ? `the value bound to ${r.fact} does not fit the rule this form draws at the minimum readable font, so the shared overlay refused it rather than clipping it; the ${fixture} packet does not claim a value it did not draw`
          : `the overlay refused this write; the ${fixture} packet does not claim a value it did not draw`,
        category: null, completenessClass: null, class: null,
        disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
        requiredBeforeFiling: true, identity: `${source.formNumber} rule ${r.key}`,
        factId: null, routeDetermined: false,
        ...(unfittable ? { unfittable } : {}),
        why: "reported rather than claimed, so the refusal is visible to the audit",
        participantMustSupply: "this value yourself: the one held for you is longer than the rule the form prints here"
      });
      const writeRow = { ...base, factId: r.fact, kind: r.type };
      if (writtenNames.has(r.effectiveLabel)) canonicalWrites.push(writeRow);
      else canonicalRefusals.push(refusedWrite("canonical", null));
      if (boundaryReport) {
        if (boundaryWritten.has(r.effectiveLabel)) boundaryWrites.push(writeRow);
        else boundaryRefusals.push(refusedWrite("boundary", boundaryUnfittable.get(r.effectiveLabel) ?? null));
      }
      continue;
    }

    if (r.policy === "protect") {
      const rowValue = {
        ...base, reason: r.why, category: r.refusalClass,
        completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, why: r.why
      };
      canonicalRefusals.push(rowValue); boundaryRefusals.push(rowValue);
      continue;
    }
    if (r.policy === "attorney") {
      const rowValue = {
        ...base, reason: r.why, category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, why: r.why
      };
      canonicalRefusals.push(rowValue); boundaryRefusals.push(rowValue);
      continue;
    }
    if (r.policy === "optional") {
      const rowValue = {
        ...base,
        reason: `optional participant-authored content; the platform does not invent it: ${r.what}`,
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, optional: true,
        why: `the form does not require this and the platform holds no value for it: ${r.what}`,
        participantMaySupply: r.what
      };
      canonicalRefusals.push(rowValue); boundaryRefusals.push(rowValue);
      continue;
    }

    const rbfRow = {
      ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${source.formNumber} rule ${r.key}`,
      factId: null, routeDetermined: false,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    };
    canonicalRefusals.push(rbfRow); boundaryRefusals.push(rbfRow);
  }

  return {
    formNumber: source.formNumber, documentId: source.formNumber, documentRole: source.instrumentKind,
    componentId: source.componentId,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: "flat_pdf_measured_overlay",
    explicitMappings: Object.fromEntries(canonicalWrites.map((w) => [w.field, w.factId])),
    roleRefusals: [], selectionControls: [],
    printedSelectionControlsNotMeasured: PRINTED_SELECTION_CONTROLS_NOT_MEASURED[source.formNumber] ?? [],
    printedBlanksNotMeasured: PRINTED_BLANKS_NOT_MEASURED[source.formNumber] ?? [],
    canonicalWrites, canonicalRefusals, boundaryWrites, boundaryRefusals,
    boundaryColumnBasis:
      "each column is built from that fixture's own render report; a value only one fixture could draw is a write in "
      + "one column and a refusal in the other"
  };
}

/* ---- the builder's own count of the nine counters -------------------------- */
function countCompleteness(maps, writeProofs, artifacts, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: false,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = maps.flatMap((m) => m.canonicalWrites.map((w) => row(w)));
  const blanks = maps.flatMap((m) => m.canonicalRefusals.map((r) => row(r)));

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
    ledger.push({ field: blank.id, label: blank.label, document: blank.document, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    const counter = verdict.disposition === "KNOWN_FACT_NOT_WRITTEN" ? "knownRequiredFieldsMissing"
      : verdict.disposition === "ROUTE_OPTION_NOT_SELECTED" ? "requiredOptionsMissing" : "unclassifiedBlanks";
    note(counter, { field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis });
  }

  const instructions = String(instructionsText ?? "").toLowerCase();
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.field].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => instructions.includes(n.toLowerCase().slice(0, 60)))) continue;
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
    const missing = cells.filter((c) => !c.written && classifyField(c.label, false).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label) });
  }

  for (const p of writeProofs) {
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && (p.addedGlyphsReadFromOutputBytes ?? 0) === 0) {
      note("invisibleWrites", { fixture: p.fixture, document: p.formNumber, why: "the overlay reported values and the output bytes carry no added glyph at any measured rule" });
    }
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) {
      note("visualDefects", { fixture: p.fixture, document: p.formNumber, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, where: p.inkOutsideMeasuredWriteBoxes });
    }
    for (const refused of p.refusedFieldsWithInk ?? []) {
      note("protectedWrites", { fixture: p.fixture, field: refused.fieldId, why: "a rule the map refused carries ink this build added" });
    }
  }
  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected rule was written" });
    }
  }

  const rendered = artifacts.flatMap((a) => a.documents ?? []).map((d) => String(d).toLowerCase());
  for (const m of maps) {
    if (!rendered.includes(String(m.formNumber).toLowerCase())) {
      note("requiredComponentsMissing", { component: m.formNumber, why: "the field map names this document and it reaches no page of a rendered artifact" });
    }
  }

  return { counters, findings, ledger };
}

/* ---- the two instruction documents ---------------------------------------- */
function requiredBeforeFilingItems(maps) {
  return maps.flatMap((m) => m.canonicalRefusals
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, componentId: m.componentId, field: r.field, page: r.page,
      section: r.sectionHeading, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })));
}
function optionalItems(maps) {
  return maps.flatMap((m) => m.canonicalRefusals
    .filter((r) => r.optional === true)
    .map((r) => ({ document: m.formNumber, field: r.field, label: r.effectiveLabel, participantMaySupply: r.participantMaySupply })));
}

/*
 * The one rule on this packet that is written in one fixture and refused in the
 * other, read out of the maps rather than asserted in prose.
 *
 * VF01 failed this family on KNOWN_PREFILLS because the guide carried an
 * unconditional sentence listing the order's State line under "What the
 * platform deliberately left blank" and telling the participant to write a
 * state on it. The canonical bytes print CO on that rule. An unconditional
 * sentence about a conditional outcome is false for whichever fixture it does
 * not describe, and a participant who acts on it hand-writes over correct data
 * on the document a judge signs. The guide now states the mechanism, says which
 * record answers it for the packet in hand, and asserts nothing that both
 * fixtures do not share.
 */
function narrowRuleWrittenInOneFixtureOnly(maps) {
  for (const m of maps) {
    for (const w of m.canonicalWrites ?? []) {
      if (w.ruleIsBelowTheReadersDefaultMinimum !== true) continue;
      const boundaryRefusal = (m.boundaryRefusals ?? [])
        .find((r) => r.field === w.field && r.unfittable?.outcome === "refused");
      if (!boundaryRefusal) continue;
      return { document: m.formNumber, write: w, boundaryRefusal };
    }
  }
  return null;
}

function participantInstructions(record, maps, rbf, optional) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const { track } = record;
  const buildBlockers = (track.unresolvedQuestions ?? []).filter((q) => q.impact === "build_blocker");
  const narrowRule = narrowRuleWrittenInOneFixtureOnly(maps);

  const out = [];
  out.push(`# What to do with this packet - ${ROUTE.publicLabel}`, "");
  out.push("This packet is two Colorado Judicial Department forms:", "");
  for (const d of ROUTE.documents) {
    out.push(`- **${d.formNumber.replace("-", " ")}** - _${d.title}_ (R: February 8, 2023). ${d.instrumentKind === "proposed_order" ? "The proposed order you give the court to sign." : "The petition you file."}`);
  }
  out.push("");
  out.push(`Both are prepared for one route: **${track.legalName}**.`, "");

  out.push("## Read this first: what this packet does NOT tell you", "");
  out.push(
    "This is a prepared copy of two official forms. It is **not** a statement of what Colorado law requires of you, "
    + "and on this route it deliberately says less than you might expect. The committed legal-design record for this "
    + "track carries these open items, in its own words:", ""
  );
  for (const q of buildBlockers) out.push(`> ${q.question}`, "");
  out.push(`> The fee, as the record states it: ${track.rules.fees}`, "");
  out.push(
    "So this packet **states no filing fee, no waiting period, no eligibility rule, no objection procedure and no "
    + "service requirement**, because the record it is built from does not establish any of them. **Ask the municipal "
    + "court clerk** what the fee is, what they need, and how they take a filing, before you go. Do not read this "
    + "packet's silence as \"there is nothing to pay\" or \"you are eligible\".", ""
  );
  const scope = (track.scopeRestrictions ?? [])[0];
  if (scope) {
    out.push("And one thing the record IS explicit about:", "");
    out.push(`> ${scope}`, "");
  }

  out.push("## What the platform filled in, and what it did not", "");
  out.push(
    "Both of these forms are **flat** - the Colorado Judicial Department published them with no fillable fields at "
    + "all. Every value this packet wrote was placed on a printed rule measured out of the form's own page, and "
    + "nothing was placed anywhere the form does not draw a line.", ""
  );
  out.push(
    "Written for you, where the value held for you fits the rule the form draws: your name, your date of birth, your "
    + "case number, your street address, your telephone number and your email address on the petition; and your name, "
    + "date of birth, case number, street address, city, state and ZIP on the proposed order. Everything else is "
    + "yours, and every one of those blanks is listed below - and where a value held for you was longer than the rule "
    + "the form prints, it was left for you rather than shortened to fit, and reports/actual-writes.json records "
    + "which.", ""
  );
  if (narrowRule) {
    const w = narrowRule.write;
    const label = w.effectiveLabel;
    out.push(
      [
        `**One line to check before you file: the ${label} line in section "${w.sectionHeading}" of `,
        `${narrowRule.document.replace("-", " ")}, the proposed order.** The rule Colorado draws there is ${w.measuredRule.width} `,
        "points wide - narrower than every other blank on the sheet - and this packet writes your city and your ZIP ",
        "on either side of it. A value too long to sit on a rule that narrow at a readable size is refused rather ",
        "than shrunk or clipped, so this is the one line on this packet that is written for some participants and ",
        `left for others. **Look at it.** If it already carries a ${label.toLowerCase()}, that is this packet's own `,
        "write and you leave it alone - writing over it puts two answers on the order a judge signs. If it is empty, ",
        "write it yourself. reports/actual-writes.json records which of the two happened in your packet: a value ",
        "written there is listed under actualWrites, and a value refused for length is listed under unfittable."
      ].join(""), ""
    );
  }

  out.push("## The tick boxes are yours, all of them, and you mark them by hand", "");
  out.push(
    "Both forms draw their tick boxes as printed characters rather than as boxes a program can find, so this packet "
    + "**marked none of them and could not**. That is not a gap in your packet - it is what the form is. Every one is "
    + "listed below with the words printed beside it, and you mark them with a pen.", ""
  );
  for (const m of maps) {
    const controls = m.printedSelectionControlsNotMeasured ?? [];
    if (controls.length === 0) continue;
    out.push(`### ${m.formNumber.replace("-", " ")} - boxes to mark by hand`, "");
    out.push("| Page | Section | Printed beside the box | What ticking it says |", "| --- | --- | --- | --- |");
    for (const c of controls) out.push(`| ${c.page} | ${c.section} | ${c.printedNear} | ${c.what} |`);
    out.push("");
  }

  const underscoreBlanks = maps.flatMap((m) => (m.printedBlanksNotMeasured ?? []).map((b) => ({ document: m.formNumber, ...b })));
  if (underscoreBlanks.length > 0) {
    out.push("## Four more blanks you fill by hand", "");
    out.push(
      "The form prints these as rows of underscore characters rather than as ruled lines, so there is no measured "
      + "line to write on and this packet left them alone:", ""
    );
    out.push("| Form | Page | Printed on the form | What to write |", "| --- | --- | --- | --- |");
    for (const b of underscoreBlanks) out.push(`| ${b.document.replace("-", " ")} | ${b.page} | ${b.printedNear} | ${b.what} |`);
    out.push("");
  }

  out.push("## Item 1 of the petition: say who is filing", "");
  out.push(
    "The petition's first item asks who the Petitioner is, and gives four choices. **This packet was prepared on the "
    + "basis that you are the Defendant filing for yourself** - the first of the four - and the date of birth it wrote "
    + "at item 2 is yours. If somebody else is petitioning on your behalf, tick the box that describes them and check "
    + "that the date of birth on the form is the right person's.", ""
  );

  out.push("## What you must do before you file", "");
  out.push("1. **Ask the municipal court clerk what the fee is and what they need.** Colorado's municipal courts are not on the state e-filing system and each one runs its own intake.");
  out.push("2. **Fill in every item in the tables below.** Each names the form, the section and the blank.");
  out.push("3. **Mark every tick box that applies**, from the tables above.");
  out.push("4. **Write item 8 in your own words.** That paragraph - why the harm to your privacy outweighs the public interest in keeping the record public - is the substance of the petition, and nobody but you can write it.");
  out.push("5. **Attach a current verified copy of your criminal history record**, or file it within 10 days of filing the petition, as item 6 of the form says.");
  out.push("6. **Sign and date the petition yourself** at item 15. Neither is filled in for you.");
  out.push("7. **Serve the prosecuting attorney, and then complete the certificate of service** at item 14. It is a statement that service has already happened, so it is filled in after you serve, never before.");
  out.push("8. **Leave the proposed order's signature block alone.** The judge or magistrate signs and dates their own order.");
  out.push("");

  out.push("## Where it goes", "");
  out.push(`- **Where:** ${track.destination.name}. ${track.destination.detail}`);
  out.push(`- **Filing:** ${track.rules.filing}`);
  out.push(`- **Your signature:** ${track.rules.participantSignature}`);
  /* The record's fee sentence is addressed to the people who BUILD this packet,
   * not to the person filing it: "must be confirmed before building" is a build
   * instruction, and "the source review" names an internal artefact. Printed
   * unlabelled in a list of directions to the filer, it is the
   * internal-record-text-on-a-participant-page defect that no counter sees --
   * present, non-empty, verbatim from a controlling record. State what the
   * record establishes in the filer's own vocabulary and give the action that
   * follows from it. The record's own words stay in this guide above, quoted
   * and labelled as record text, which is where they belong. The build asserts
   * rules.fees still reads "unconfirmed", so this sentence cannot outlive the
   * silence it describes. */
  out.push("- **The fee:** The committed record does not confirm a filing fee for this route, so this packet states no amount. Ask the municipal court clerk what it is before you go.");
  out.push("- **Fee waiver:** The committed record does not address a fee waiver for this route, so this packet states no waiver procedure, no waiver form and no eligibility test. Ask the same clerk what the court does about a filing fee somebody cannot pay.");
  out.push(`- **Service:** ${track.rules.service} The form itself carries a certificate of service at item 14, addressed to the prosecuting attorney, so complete it after you serve.`);
  out.push(`- **Notarization:** ${track.rules.notarization}`);
  out.push(`- **Objections:** ${track.rules.notice}`);
  out.push("");

  for (const [doc, items] of byDoc) {
    const source = ROUTE.documents.find((d) => d.formNumber === doc);
    out.push(`## ${doc.replace("-", " ")} - ${source?.title ?? doc}: the items you must supply`, "");
    out.push("| Page | Section | The blank on the form | What to write |", "| --- | --- | --- | --- |");
    for (const i of items) out.push(`| ${i.page} | ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  if (optional.length > 0) {
    out.push("## Optional, and left empty on purpose", "");
    out.push("| Form | The blank | What it is for |", "| --- | --- | --- |");
    for (const o of optional) out.push(`| ${o.document.replace("-", " ")} | ${o.label} | ${o.participantMaySupply} |`);
    out.push("");
  }

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Your signature and its date**, and the whole lawyer signature line on the petition.");
  out.push("- **The certificate of service at item 14.** It states that service has happened; a packet that filled it in would be making that statement for a filing nobody has served.");
  out.push("- **The Division and Courtroom boxes**, on both forms. The form prints \"This box is for court use only\" over them.");
  out.push("- **The judge's or magistrate's signature and the date on the proposed order.**");
  out.push("- **The city or town at the head of both forms.** This is a municipal conviction, so that line names the city or town whose court heard it, and the platform holds a county rather than a municipality.");
  /* The order's State line does NOT belong on this list. It is written whenever
   * the state held for the participant fits its 31.25pt rule, and refused only
   * when it does not, so listing it as deliberately blank is false for every
   * packet where it was written. It is described where it is true instead --
   * see narrowRuleWrittenInOneFixtureOnly above. */
  out.push("");

  out.push("## When this is not a do-it-yourself matter", "");
  for (const stop of track.selfHelpBoundaries ?? []) out.push(`- ${stop}`);
  out.push("");

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared copy of two official Colorado forms. It is not legal advice, it is not filed for you, and it "
    + "does not decide whether your municipal conviction can be sealed. The record this packet is built from says "
    + "plainly that C.R.S. Sec. 24-72-708 was not read in full, so **nothing here tells you that you are eligible.** "
    + "Read the statute, or ask a lawyer, before you file."
  );
  out.push("");
  out.push(`_Route: ${ROUTE.routeKey} - ${track.authority.join("; ")}_`);
  return `${out.join("\n")}\n`;
}

function filingInstructions(record, artifacts, maps) {
  const { track } = record;
  const out = [];
  out.push(`# Filing instructions - ${track.legalName}`, "");
  out.push(
    "Every rule below is generated from the committed legal-design track record for this route, which is hashed into "
    + "`source-receipt.json`. Where that record says nothing, this page says nothing - and on this route it says "
    + "nothing about several things a filer needs, which is stated rather than filled in.", ""
  );

  out.push("## What you file", "");
  out.push("| Order | Component | Form | Role | Required or conditional | Pages |", "| --- | --- | --- | --- | --- | --- |");
  for (const [i, d] of ROUTE.documents.entries()) {
    const m = maps.find((x) => x.formNumber === d.formNumber);
    const pages = new Set((m?.canonicalWrites ?? []).concat(m?.canonicalRefusals ?? []).map((r) => r.page));
    out.push(`| ${i + 1} | ${d.componentId} | ${d.formNumber.replace("-", " ")} | ${d.instrumentKind.replace(/_/g, " ")} | ${d.requirement} | ${[...pages].sort((a, b) => a - b).join(", ")} |`);
  }
  out.push("");

  out.push("## Open items the record names, which this packet does not answer", "");
  out.push("| Impact | What is open | Which part of the filing it affects |", "| --- | --- | --- |");
  for (const q of track.unresolvedQuestions ?? []) out.push(`| ${q.impact} | ${q.question} | ${q.affectedElement} |`);
  out.push("");
  out.push(
    "The two `build_blocker` rows are why this packet states no fee, no waiting period, no exclusion set and no "
    + "objection mechanics. The `release_blocker` row says the municipal set had not been acquired; **JDF 683 and "
    + "JDF 686 are now held and are bound in this packet by exact digest**, which answers that row for these two forms "
    + "and not for JDF 682, 684 or 685.", ""
  );

  out.push("## Venue", "");
  out.push(`${track.venue}`, "");
  out.push("## Where it is filed", "");
  out.push(`**${track.destination.kind}:** ${track.destination.name}`, "");
  out.push(`${track.destination.detail}`, "");
  out.push(`${track.rules.filing}`, "");
  out.push("## Fee", "");
  /* This is the heading a filer reads specifically to learn what the filing
   * costs. The record's fee sentence -- "The fee must be confirmed before
   * building" -- is an instruction to the people who build this packet, in
   * vocabulary that means nothing to a filer, and it was published here in
   * full. Say instead what the record establishes and what the filer should do
   * about it. No amount, no waiver eligibility and no waiver form is stated,
   * because the record states none. */
  out.push("The committed record does not confirm a filing fee for this route, so this packet states no amount. Ask the municipal court clerk what the filing costs before you go. **Fee waiver:** The committed record does not address a fee waiver for this route, so this packet states no waiver procedure, no waiver form and no eligibility test. Ask the same clerk what the court does about a filing fee somebody cannot pay.", "");
  out.push("## Service, notice and signature", "");
  out.push(`**Service:** ${track.rules.service}`, "");
  out.push(`**Notice and objections:** ${track.rules.notice}`, "");
  out.push(`**Signature:** ${track.rules.participantSignature}`, "");
  out.push(`**Notarization:** ${track.rules.notarization}`, "");
  out.push("## Scope restriction the record states", "");
  for (const s of track.scopeRestrictions ?? []) out.push(`- ${s}`);
  out.push("");
  out.push("## What the participant must obtain", "");
  for (const item of track.participantFilingRequirements ?? []) {
    out.push(`- **${item.name}** (${item.obtainedFrom}) - ${item.howToObtain} Requirement: ${item.requirement}${item.conditionDescription ? ` - ${item.conditionDescription}` : ""}. Required before filing: ${item.requiredBeforeFiling ? "yes" : "no"}.`);
  }
  out.push("");
  out.push("## Manual completion items the record names", "");
  out.push("| Item | Where in the packet | Why the participant does it |", "| --- | --- | --- |");
  for (const item of track.manualCompletionItems ?? []) out.push(`| ${item.item} | ${item.whereInPacket} | ${item.why} |`);
  out.push("");
  out.push("## Hand off to counsel when", "");
  for (const stop of track.selfHelpBoundaries ?? []) out.push(`- ${stop}`);
  out.push("");
  out.push("## The fixtures these instructions were written against", "");
  out.push("| Fixture | Pages | SHA-256 |", "| --- | --- | --- |");
  for (const a of artifacts) out.push(`| ${a.fixture} | ${a.pageCount} | \`${a.sha256}\` |`);
  out.push("");
  out.push("_These are review fixtures built from invented participant facts. They are not anybody's filing, and no packet here has been verified, approved or made sellable by this build._", "");
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const record = loadControllingRecords();
  const { resolved, failures, custodiesSearched } = resolveSources();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: failures, custodiesSearched,
      why: "a declared source did not bind by exact SHA-256, so nothing may be rendered from it",
      overlayDirectoryTouched: false,
      counters: null, countersAreNullBecause: "no packet was built, so no counter was measured"
    };
  }

  const censuses = [];
  for (const source of resolved) {
    const census = await censusFlat(source);
    assert.equal(census.ruleDrift.length, 0,
      `${source.formNumber}: ${census.ruleDrift.length} declared rule(s) are not where this build measured them; `
      + `a write box on a form is a claim about the paper and is refused rather than guessed: `
      + `${JSON.stringify(census.ruleDrift.slice(0, 4))}`);
    assert.equal(census.acroFieldCount, 0,
      `${source.formNumber}: this build treats the form as flat and it now carries ${census.acroFieldCount} AcroForm field(s)`);
    assert.equal(census.strokedCheckboxCount, 0,
      `${source.formNumber}: this build states that the tick boxes are glyphs and cannot be measured, and `
      + `${census.strokedCheckboxCount} stroked box(es) were found. Measure them and mark the route-determined ones `
      + "rather than continuing to leave every box to the participant.");
    assert.ok(census.footerMarkerFoundOnEveryPage,
      `${source.formNumber}: not every page prints the footer marker ${JSON.stringify(source.footerMarker)}`);
    if (source.indexPageCount != null) {
      assert.equal(census.pageCount, source.indexPageCount,
        `${source.formNumber}: ${census.pageCount} pages, the committed corpus index declares ${source.indexPageCount}`);
    }
    assert.equal(census.rows.length, Object.keys(FLAT_ANCHORS[source.formNumber]).length);
    censuses.push({ source, census });
  }

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      documents: censuses.map(({ source, census }) => ({
        formNumber: source.formNumber, sha256: source.sha256, custody: source.boundFromCustody,
        pages: census.pageCount, acroFieldCount: census.acroFieldCount,
        measuredRules: census.measuredRuleCount, strokedCheckboxes: census.strokedCheckboxCount,
        anchors: census.rows.length,
        anchorsOnARuleBelowTheReadersDefaultMinimum: census.rows.filter((r) => r.ruleIsBelowTheReadersDefaultMinimum).length,
        byPolicy: Object.fromEntries(["write", "supply", "optional", "protect", "attorney"]
          .map((p) => [p, census.rows.filter((r) => r.policy === p).length])),
        printedSelectionControlsNotMeasured: (PRINTED_SELECTION_CONTROLS_NOT_MEASURED[source.formNumber] ?? []).length,
        printedBlanksNotMeasured: (PRINTED_BLANKS_NOT_MEASURED[source.formNumber] ?? []).length
      }))
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const renderReports = { canonical: new Map(), boundary: new Map() };

  for (const fixtureName of ["canonical", "boundary"]) {
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`${record.track.legalName} - ${fixtureName} fixture`);
    const pageManifest = [];
    for (const { source, census } of censuses) {
      const { bytes, report } = await renderFlat(source, census, fixtureName);
      renderReports[fixtureName].set(source.formNumber, report);
      const proof = await byteProof(source, census, bytes, report, fixtureName);
      writeProofs.push({
        fixture: fixtureName, formNumber: source.formNumber, componentId: source.componentId,
        sourceSha256: source.sha256,
        proofMethod:
          "a measured overlay draws into the page's own content stream, so the ink is read back from the finalized "
          + "page TEXT at the coordinates of the rule each value was drawn on, with the pinned source's own text at "
          + "those same coordinates subtracted",
        outsideBoxProofMethod:
          "every text item in the finalized bytes differenced against the same item in the pinned source, keeping "
          + "only what this build added, then dropping whatever landed inside a measured write box",
        valuesReportedByFinalizer: report.written.length,
        flattenedWidgetAppearancesReadFromOutputBytes: 0,
        whyThatIsZero:
          "this document is flat and this build draws no widget; there is no flattened widget appearance to count, "
          + "and the added-glyph reading beside it is the measurement that matters here",
        addedGlyphsReadFromOutputBytes: proof.glyphs,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.glyphsOutsideMeasuredWriteBoxes,
        inkOutsideMeasuredWriteBoxes: proof.outsideMeasuredWriteBoxes,
        refusedFieldsWithInk: proof.refusedFieldsWithInk,
        normalized: report.normalized ?? [],
        unfittable: report.unfittable,
        actualWrites: proof.actualWrites
      });
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copied = await packet.copyPages(doc, doc.getPageIndices());
      for (const [i, p] of copied.entries()) {
        packet.addPage(p);
        pageManifest.push({
          packetPage: packet.getPageCount(), formNumber: source.formNumber, componentId: source.componentId,
          sourcePage: i + 1, sourceSha256: source.sha256
        });
      }
    }
    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    artifacts.push({
      fixture: fixtureName, file, sha256: sha256(packetBytes),
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents: censuses.map((c) => c.source.formNumber),
      components: censuses.map((c) => c.source.componentId)
    });
  }

  const maps = censuses.map(({ source, census }) => mapFor(source, census,
    renderReports.canonical.get(source.formNumber), renderReports.boundary.get(source.formNumber)));
  const rbf = requiredBeforeFilingItems(maps);
  const optional = optionalItems(maps);
  const instructionsText = participantInstructions(record, maps, rbf, optional);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);
  fs.writeFileSync(path.join(ROOT, OUT, "filing-instructions.md"), filingInstructions(record, artifacts, maps));

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "official_pdf_fill",
    implementationStrategyAsDelivered: "measured_flat_overlay_on_both_documents",
    whyThoseDiffer:
      "The queue's strategy for this family is official_pdf_fill and BOTH bound documents are flat: the committed "
      + "corpus index records acroFieldCount 0 for each, and this build confirms it from the bytes. There is nothing "
      + "to fill, so every value is placed on a printed rule measured out of the page's own content stream.",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    bindingMethod:
      "the declared SHA-256 against the committed corpus index, then the same digest recomputed from the bytes on "
      + "disk, searched over every mounted custody the index declares. A declared path is a hint; the digest is the "
      + "binding.",
    custodiesSearched,
    supersededSourceNote:
      "The queue's source readiness for this family records official-form:JDF-684 as superseded by "
      + "official-form:JDF-686, and its committed source reconciliation reads \"Build from JDF 683 and the corrected "
      + "JDF 686 proposed granting-order component.\" That is what this build renders. JDF 684 is bound nowhere here.",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId,
    statutoryAuthority: record.track.authority.join("; "),
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], documentId: r.formNumber, formNumber: r.formNumber,
      componentId: r.componentId, instrumentKind: r.instrumentKind,
      componentRequirement: r.requirement, componentCondition: r.condition,
      revision: r.revision, pathInArchive: r.pathInArchive, boundFromCustody: r.boundFromCustody,
      declaredPath: r.declaredPath, boundAtTheDeclaredPath: r.boundAtTheDeclaredPath,
      sha256: r.sha256, sha256RecomputedFromBytes: r.sha256Confirmed, byteLength: r.byteLength,
      corpusIndexStructuralClass: r.structuralClassObserved,
      corpusIndexAcroFieldCount: r.acroFieldCount, corpusIndexPageCount: r.indexPageCount
    })),
    controllingRecords: record.pins,
    guideProseIsGeneratedFrom:
      "data/record-clearing/legal-design-track-registry.json tracks[trackId=co_municipal_conviction_seal]. Every "
      + "venue, filing rule, fee sentence, service sentence, scope restriction, open question and self-help boundary "
      + "printed in participant-instructions.md and filing-instructions.md is a string from that record, pinned above "
      + "by whole-file and by entry digest. Where the record establishes nothing - the fee, the waiting period, the "
      + "exclusion set, the objection mechanics - the packet states nothing.",
    sourceBinaryCommitted: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    censusScope:
      "Neither document has an AcroForm. The census is therefore of MEASURED RULES: each row is a printed line read "
      + "out of the page's own content stream, with the value's write box placed on it. Every rule is re-measured on "
      + "every build and a rule that has moved by more than a point stops the build.",
    ruleReaderSettings: {
      module: "scripts/rcap-official-forms/rcap-pdf-rule-lines.mjs",
      minLength: RULE_MIN_LENGTH,
      moduleDefaultMinLength: 40,
      whyItIsNarrowed:
        "JDF 686 draws its State blank as a 31.25pt rule, below the module's default 40pt minimum, while JDF 683 "
        + "draws the same blank at 40.27pt and is seen. The threshold is narrowed through the module's own published "
        + "option so the box is still the form's own drawn rule; nothing is hand-entered and no shared module is "
        + "edited.",
      ruleTolerancePoints: RULE_TOLERANCE,
      writeBoxHeightPoints: WRITE_BOX_HEIGHT,
      writeBoxPlacement: "two points in from the rule's left end and two points above its baseline"
    },
    captionBasis:
      "The printed caption read from each page's own text stream at the coordinate of the rule the value is written "
      + "on. See reports/caption-evidence.json.",
    documents: censuses.map(({ source, census }) => ({
      documentId: source.formNumber, formNumber: source.formNumber, componentId: source.componentId,
      sourceSha256: source.sha256, boundFromCustody: source.boundFromCustody,
      pageCount: census.pageCount, acroFieldCount: census.acroFieldCount,
      measuredHorizontalRulesOnTheWholeDocument: census.measuredRuleCount,
      strokedCheckboxesFound: census.strokedCheckboxCount,
      anchorCount: census.rows.length,
      printedSelectionControlsNotMeasured: PRINTED_SELECTION_CONTROLS_NOT_MEASURED[source.formNumber] ?? [],
      printedBlanksNotMeasured: PRINTED_BLANKS_NOT_MEASURED[source.formNumber] ?? [],
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
        measuredRule: r.measuredRule,
        ruleIsBelowTheReadersDefaultMinimum: r.ruleIsBelowTheReadersDefaultMinimum,
        pdfType: r.type, isSelectionControl: false, multiline: false, maxLength: null,
        section: r.section, effectiveLabel: r.effectiveLabel, policy: r.policy, factId: r.fact,
        printedTextAtCoordinate: r.printedTextAtCoordinate
      }))
    }))
  });

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1", familyId: FAMILY_ID,
    finding:
      "These two forms have no AcroForm field names at all, so there is no authored caption to compare against the "
      + "paper. The only caption either document has is the printed one, and that is what every label in this family "
      + "is read from: the text extracted at the coordinate of the rule the value is written on.",
    method:
      "For every measured rule, the printed lines within 14 points of its baseline are extracted from the page's own "
      + "text stream and recorded, nearest first. A reviewer can put the label this build uses beside the words "
      + "Colorado printed there and see whether they agree.",
    whyThisIsRecordedAnyway:
      "A caption basis asserted without the extraction beside it cannot be told apart from one that was guessed. "
      + "Colorado's text extraction on these two forms interleaves in places - \"SherDiffepartm'sent\" for "
      + "\"Sheriff's Department\" - so the extraction is recorded as it comes back rather than tidied, and a reviewer "
      + "can see exactly how much weight it carries.",
    perDocument: censuses.map(({ source, census }) => ({
      document: source.formNumber, anchors: census.rows.length,
      basis: "the printed line read at each measured rule's own coordinate; this document has no authored field names to corroborate it"
    })),
    perField: censuses.flatMap(({ source, census }) => census.rows.map((r) => ({
      document: source.formNumber, field: r.key, page: r.page, rect: r.rect,
      measuredRule: r.measuredRule,
      labelThisBuildUses: r.effectiveLabel, section: r.section,
      textExtractedAtThisCoordinate: r.printedTextAtCoordinate
    })))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId,
    renderStrategy: "measured_flat_overlay",
    jurisdiction: ROUTE.jurisdiction, statute: record.track.authority.join("; "),
    legalName: record.track.legalName, implementationStrategy: "official_pdf_fill",
    componentSet: ROUTE.documents.map((d) => d.componentId),
    componentConditions: {},
    captionBasis: "the printed caption read at each measured rule's coordinate; see reports/caption-evidence.json",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeDeterminedSelections: [],
    routeSelectionNote:
      "NO SELECTION CONTROL ON EITHER FORM IS MARKED BY THIS BUILD, AND NONE COULD BE. Both documents draw their tick "
      + "boxes as glyphs in the text stream rather than as stroked paths, so checkboxCandidates finds none and there "
      + "is no measured box to mark. Marking one would mean drawing ink at a hand-entered coordinate, which is the "
      + "one thing this factory's official-form path never does. Every printed control is listed per document under "
      + "printedSelectionControlsNotMeasured with the words printed beside it, and every one is disclosed to the "
      + "participant in participant-instructions.md.",
    theBuildBlockersThisPacketIsSilentAbout: (record.track.unresolvedQuestions ?? []).filter((q) => q.impact === "build_blocker"),
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    optionalParticipantContent: optional,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    componentSet: ROUTE.documents.map((d) => d.componentId), componentConditions: {},
    artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    pdfs: artifacts.map((a) => ({
      file: a.file, documentId: "assembled_packet", role: "assembled_packet_of_official_forms",
      fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount
    })),
    byteDerivedHashes: true,
    everyPageRastered: false, rasterSkipped: true, rasterEngine: null, rasterPages: [],
    rasterState: "BUILT_RASTER_PENDING",
    whyNoLocalRasterReceipt:
      "A local browser render is not a receipt. The central raster workflow produces one, bound to the exact SHA-256 "
      + "recorded above.",
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note:
      "Both documents are flat, so there are no flattened widget appearances to read: the ink is read back from the "
      + "finalized page text at the coordinates of the rule each value was drawn on, with the pinned source's own "
      + "text at those coordinates subtracted. Both glyph readings are measurements.",
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
      fixture: p.fixture, field: r.fieldId, finding: "a rule the map refused carries ink this build added"
    })))
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    optionalParticipantContent: optional,
    participantElections: [],
    printedSelectionControlsNotMeasured: maps.flatMap((m) => (m.printedSelectionControlsNotMeasured ?? []).map((c) => ({ document: m.formNumber, ...c }))),
    printedBlanksNotMeasured: maps.flatMap((m) => (m.printedBlanksNotMeasured ?? []).map((b) => ({ document: m.formNumber, ...b }))),
    protectedBlanks: maps.flatMap((m) => m.canonicalRefusals
      .filter((r) => r.requiredBeforeFiling !== true && r.optional !== true)
      .map((r) => ({ document: m.formNumber, field: r.field, page: r.page, label: r.effectiveLabel, refusalClass: r.category, why: r.why }))),
    nearMissesRefusedByRole: [
      {
        document: "JDF-683 and JDF-686", field: "Colorado City/Town or County",
        wouldHaveBound: "matter.county",
        finding:
          "The caption line binds matter.county by name. On a MUNICIPAL conviction the court is a city's or town's "
          + "own court, and the platform holds the county of the matter rather than the municipality: writing the "
          + "county there would name the wrong venue on the face of both documents. Refused by role and carried to "
          + "the participant on both forms."
      },
      {
        document: "JDF-686", field: "State (section 1)",
        finding:
          "The rule Colorado draws under this caption is 31.25 points wide, below the shared rule reader's 40-point "
          + "default minimum, so at the default setting it is invisible and the participant's city and ZIP would sit "
          + "either side of an unwritten gap. This build narrows the threshold through the module's own option and "
          + "writes the state on the form's own drawn rule wherever the value held for the participant fits it, and "
          + "records the measurement for the module's owner. Fitting is decided per packet and not per family: the "
          + "canonical fixture writes CO there, and the boundary fixture's spelled-out Colorado is refused as "
          + "unfittable and left for the participant, so the participant guide describes the check rather than "
          + "asserting either outcome."
      }
    ],
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, writeProofs, artifacts, instructionsText);
  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);

  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract "
      + "functions over this family's field maps, byte proof, rendered artifacts and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    whatTheyDoNotMeasure:
      "The printed tick boxes and the four underscore blanks, because neither form draws a control this build can "
      + "measure and the counters count measured blanks. They are enumerated instead, per document, in "
      + "production-field-map.json and reports/blanks-left-for-the-participant.json, and every one is disclosed to "
      + "the participant. A counter that cannot see them is not a counter that excuses them.",
    counters: counted.counters,
    allNineZero: allZero,
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID,
    required: true, granted: false, reviewedBy: null,
    note:
      "Five pages: JDF 683's three, then JDF 686's two. Every value is drawn into the page's own content stream on a "
      + "measured printed rule, so the thing to check is PLACEMENT: whether each value sits on its own line and "
      + "nowhere else. No page was rastered by this build; the central raster workflow renders them from the hashes "
      + "in reports/rendered-artifacts.json.",
    whatToLookAt: [
      "Packet page 1 (JDF 683 page 1), the caption block: the participant's name on the Defendant rule and on the "
        + "'Filed by' Name rule, the case number on the Case Number rule inside the court-use box, and the street "
        + "address, phone and email each on their own 'Filed by' rule. The City/Town or County rule and the Court "
        + "Mailing Address rule are EMPTY, and so are Division, Courtroom and the Bar Number.",
      "Packet page 1, item 2: the date of birth on its rule, and the whole 'if different' block beneath it empty - "
        + "address, city, state, zip, main phone, work phone. The form asks for those only when they differ from the "
        + "'Filed by' box.",
      "Packet page 1, item 3, and packet page 2: every agency line empty. Municipal Courts, Sheriff's Department, "
        + "District Attorney, City Attorney, Law Enforcement and Other - names, case numbers and addresses, all "
        + "blank.",
      "Packet page 2, item 8: all three explanation rules empty. That paragraph is the substance of the petition and "
        + "it is the participant's.",
      "Packet page 3, items 14 and 15: the certificate of service entirely empty - date, email/fax, both recipient "
        + "lines - and both signature rules and the date beside them empty. A certificate of service filled in on an "
        + "unfiled packet would be a false statement and is the worst defect this packet could carry.",
      "Packet page 4 (JDF 686 page 1): the caption carries the name and case number; section 1 carries the name, "
        + "date of birth, mailing address, CITY, STATE and ZIP. Look hard at the State value: it sits on a rule only "
        + "31 points wide between the City and Zip rules, and it must be inside that rule and not over the printed "
        + "'State:' caption or the 'Zip Code:' caption.",
      "Packet page 4, section 3: the Municipal Court case number written, and the Law Enforcement Agency case number "
        + "EMPTY - the platform holds the first and not the second.",
      "Packet page 5 (JDF 686 page 2): the judge's signature rule and the date beside it EMPTY. This is a proposed "
        + "order; a signed one would not be a proposal.",
      "Every tick box on all five pages unmarked. There are twenty-two of them and not one is this packet's to mark.",
      "Boundary fixture: the long hyphenated name, the apartment-line address, the 60-character email and the "
        + "13-character state either sit inside their rules or are reported unfittable in reports/actual-writes.json. "
        + "Nothing may run past the end of its rule or over the caption beside it."
    ],
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount })),
    rasterPages: []
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: allZero ? "state_built" : "overlay_samples_rendered",
    reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: "not rendered in this run", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: 0,
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING", selfVerified: false,
    stopped: !allZero,
    stopReason: allZero ? null : "A completeness counter is non-zero. See reports/completeness-counters.json.",
    legalDesignBuildBlockersOpen: (record.track.unresolvedQuestions ?? []).filter((q) => q.impact === "build_blocker").length,
    whyThatDoesNotStopThisBuild:
      "AGENTS.md's build-first review model makes counsel review a blocker for approved_for_live and live, not for "
      + "building through state_built. The blockers are carried on the packet's own instructions page and in "
      + "approval-request.json instead of being resolved here, and nothing in this build asserts eligibility, a fee "
      + "or a waiting period.",
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID,
    blocking: allZero ? [] : [{
      severity: "blocking",
      finding: "A completeness counter is non-zero on this build.",
      consequence: "See reports/completeness-counters.json for the counter and the finding rows behind it."
    }],
    findings: [
      {
        severity: "advisory",
        finding:
          "THE COMMITTED LEGAL-DESIGN RECORD FOR THIS TRACK CARRIES TWO OPEN BUILD BLOCKERS AND STATES NO FEE. In its "
          + "own words: \"Section 24-72-708 was not read in full in this review. Confirm the waiting period, the "
          + "exclusion set, the objection mechanics, and the fee before building\", and \"Municipal form coverage and "
          + "current municipal-court procedure.\" rules.fees reads \"Unconfirmed. The fee must be confirmed before "
          + "building.\" MASTER_QUEUE nevertheless records legalInputStatus SETTLED for this family.",
        consequence:
          "The build proceeds under AGENTS.md's build-first review model, which makes counsel review a blocker for "
          + "approved_for_live rather than for building. What it changes is the PROSE: this packet states no fee, no "
          + "waiting period, no eligibility rule, no exclusion set, no objection mechanics and no service "
          + "requirement, and its first instructions section says so and tells the participant to ask the clerk. The "
          + "build asserts the record still says both things and stops if either sentence changes, so a later "
          + "confirmation cannot leave this packet quietly silent. The disagreement between the queue's SETTLED and "
          + "the track record's build blockers is reported and is not resolved by this lane."
      },
      {
        finding:
          "BOTH DOCUMENTS ARE FLAT. The committed corpus index records acroFieldCount 0 for JDF 683 and JDF 686, and "
          + "this build confirms it from the bytes on every run.",
        consequence:
          "The family's declared strategy is official_pdf_fill and there is nothing to fill, so both documents go "
          + "through finalizeFlatOverlay against measured geometry: every write box is a printed rule read out of "
          + "that page's own content stream, re-measured on every build, and a rule that has moved by more than a "
          + "point stops the build. No coordinate in this family was typed in by hand."
      },
      {
        severity: "advisory",
        owner: "scripts/rcap-official-forms/rcap-pdf-rule-lines.mjs",
        finding:
          "rulesOfPage defaults to minLength 40. JDF 686 draws its section-1 State blank as a rule 31.25 points wide "
          + "(page 1, y=378.38, x 391.93 to 423.18), which that default hides, while JDF 683 draws the same blank at "
          + "40.27 points and is seen. Measured on both binaries.",
        consequence:
          "This build narrows the threshold to 24 through the module's own published option rather than editing the "
          + "shared module or hand-entering the coordinate, so the write box is still the form's own drawn rule and "
          + "every anchor is still matched on y, x0 AND x1 to within a point. Without it the participant's city and "
          + "ZIP would sit either side of an unwritten gap on a proposed order. Whether the module's default should "
          + "move is its owner's call; the measurement is recorded here so it can be made on evidence."
      },
      {
        finding:
          "NEITHER FORM DRAWS A TICK BOX AS A STROKED PATH. checkboxCandidates finds zero on all five pages; the "
          + "boxes are the glyph U+2751 in the text stream. There are twenty-two printed controls between the two "
          + "documents, including item 1's four Petitioner options, item 3's six agency boxes, item 5's appeal "
          + "answer, item 6's criminal-history answer, item 7's restitution answer and item 14's four service "
          + "methods.",
        consequence:
          "Not one is marked, and none is invented: marking one would mean drawing ink at a hand-entered coordinate "
          + "in white space. All twenty-two are enumerated with the words printed beside them, per document, in the "
          + "field map and in the participant instructions, and the build asserts that zero stroked boxes are found "
          + "on every run - so a future revision that draws them as paths fails here rather than silently continuing "
          + "to leave every box to the participant."
      },
      {
        finding:
          "FOUR BLANKS ON JDF 683 PAGE 2 ARE PRINTED AS RUNS OF UNDERSCORE CHARACTERS RATHER THAN AS DRAWN RULES: "
          + "the municipal violation line at item 4, and the appeal case number, appellate court and result/date "
          + "lines at item 5.",
        consequence:
          "There is no measurable rule under any of them, so no write box exists and none is invented. All four are "
          + "listed under printedBlanksNotMeasured with the printed text beside them and disclosed to the "
          + "participant as blanks to fill by hand."
      },
      {
        finding:
          "THE CAPTION LINE ON BOTH FORMS READS \"Colorado City/Town or County\", and binds matter.county by name.",
        consequence:
          "On a municipal conviction the court is a city's or town's own court and the platform holds the county of "
          + "the matter rather than the municipality, so writing the county there would name the wrong venue on the "
          + "face of both documents. Refused by role on both and carried to the participant, with the distinction "
          + "spelled out on its own instruction row. Recorded under nearMissesRefusedByRole rather than quietly "
          + "avoided."
      },
      {
        finding:
          "JDF 683's item 1 asks who the Petitioner is and offers four choices, and this build writes the "
          + "participant's own date of birth at item 2 on the basis that the Petitioner is the Defendant.",
        consequence:
          "That assumption is stated on the packet's own instructions page, with the instruction to tick the first "
          + "box and to check the date of birth if somebody else is petitioning. The box itself is unmarkable, so "
          + "the packet cannot state the answer on the form; saying it in the instructions is the most it can "
          + "honestly do."
      },
      {
        finding:
          "The track record's release blocker reads \"JDF 683 with 682, 684, 685 and 686, the municipal set, have not "
          + "been acquired.\" Measured here: JDF 683 and JDF 686 ARE held and bind by exact digest in this build.",
        consequence:
          "That sentence is stale for these two forms and is answered for them and for no others. JDF 682, 684 and "
          + "685 are not bound here and this build says nothing about them. Reported rather than edited: the record "
          + "is not this lane's to change."
      },
      {
        finding:
          "The queue's source readiness records official-form:JDF-684 as SUPERSEDED by official-form:JDF-686, and "
          + "its committed source reconciliation reads \"Build from JDF 683 and the corrected JDF 686 proposed "
          + "granting-order component.\"",
        consequence:
          "That is exactly what this build renders. JDF 684 is bound nowhere in this family, and the substitution is "
          + "recorded in the source receipt so a reviewer sees which order component was used and on whose "
          + "determination."
      },
      {
        finding:
          "Both output-byte glyph readings are MEASURED. flattenedWidgetAppearancesReadFromOutputBytes is 0 on both "
          + "documents and the report says why in the same object: a flat document has no widget to flatten, so that "
          + "reading is structurally zero rather than an absent measurement, and the added-glyph reading beside it "
          + "is the one that carries the proof.",
        consequence:
          "The ink is read back from the finalized page text at the coordinates of the rule each value was drawn "
          + "on, with the pinned source's own text at those coordinates subtracted, and the outside-the-box reading "
          + "is the same difference taken over the whole page. Both methods are recorded per document in "
          + "reports/actual-writes.json."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, central raster acceptance, visual review and counsel review",
    buildStatus: allZero ? "state_built" : "overlay_samples_rendered",
    status: allZero ? "PENDING_INDEPENDENT_VERIFICATION" : "STOPPED_COUNTER_NON_ZERO",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: (record.track.unresolvedQuestions ?? []).map((q) => ({ impact: q.impact, question: q.question, affectedElement: q.affectedElement })),
    mattersForTheReviewersAttention: [
      "COUNSEL FIRST, AND BEFORE ANY PROMOTION. The committed track record says C.R.S. Sec. 24-72-708 was not read in "
        + "full and that the waiting period, the exclusion set, the objection mechanics and the fee must be confirmed "
        + "before building, while MASTER_QUEUE records this family's legalInputStatus as SETTLED. This packet was "
        + "built silent on every one of those points. Counsel should confirm that silence is the right answer and "
        + "that the instructions' opening warning is strong enough.",
      "Placement, on every page. Both documents are flat and every value is drawn on a measured rule; the visual "
        + "reviewer's list in reports/independent-visual-review.json names each one and the printed caption it must "
        + "not touch. Look hardest at JDF 686's State value on its 31-point rule.",
      "Twenty-two printed tick boxes, none of them markable and none of them marked. Confirm the participant "
        + "instructions make it unmistakable that marking them is the participant's job, and that the CBI box - which "
        + "the form itself marks Required - is called out."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: allZero ? "COMPLETED" : "STOPPED",
    stopClass: allZero ? null : "COMPLETENESS_COUNTER_NOT_ZERO",
    counters: counted.counters, counterFindings: counted.findings,
    rasterState: "BUILT_RASTER_PENDING",
    directory: OUT, documents: resolved.map((r) => r.formNumber),
    components: ROUTE.documents.map((d) => d.componentId),
    boundSources: resolved.map((r) => ({ sourceId: r.sourceId, sha256: r.sha256, custody: r.boundFromCustody })),
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    requiredBeforeFiling: rbf.length,
    printedSelectionControlsNotMeasured: maps.reduce((n, m) => n + (m.printedSelectionControlsNotMeasured ?? []).length, 0),
    printedBlanksNotMeasured: maps.reduce((n, m) => n + (m.printedBlanksNotMeasured ?? []).length, 0),
    legalDesignBuildBlockersOpen: (record.track.unresolvedQuestions ?? []).filter((q) => q.impact === "build_blocker").length,
    artifacts: artifacts.map((a) => ({
      fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount
    })),
    glyphReadings: writeProofs.map((p) => ({
      fixture: p.fixture, document: p.formNumber,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes
    })),
    rasterPages: 0,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
      const built = r.status === "COMPLETED" || r.status === "CHECK_ONLY";
      if (!built) process.exit(2);
    })
    .catch((e) => { console.error(e); process.exit(1); });
}
