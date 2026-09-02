#!/usr/bin/env node
// WEST-bounded packet builder for the two Arizona AOC-CREM3F families and the
// seven California families assigned to this work packet. Sibling entrypoints
// import only runWestFamilyCli from this file; no shared helper is modified.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  extractPathSegments,
  extractTextItems,
  groupIntoLines,
  normalizeHarvestedText,
} from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeFlatOverlay, finalizeOfficialForm, PARTICIPANT_INK, PARTICIPANT_INK_RGB }
  from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { drawnAt, flattenedWidgets } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { rulesOfPage } from "./rcap-official-forms/rcap-pdf-rule-lines.mjs";
import { resolveFact } from "./rcap-official-forms/rcap-field-semantics.mjs";
import { fitTextToWidget } from "./rcap-official-forms/rcap-text-fitting.mjs";
import { scanBytesForActiveContent } from "./rcap-official-forms/rcap-active-content.mjs";
import { loadAppearanceSemantics, dispositionsForFamily }
  from "./rcap-official-forms/rcap-appearance-semantics.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { strokedRectangles } from "./lib/pdf-stroked-boxes.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const require = createRequire(import.meta.url);
const APPEARANCE_SEMANTICS = loadAppearanceSemantics();
const { PDFDocument, PDFName, PDFRawStream, StandardFonts, decodePDFRawStream,
  pushGraphicsState, popGraphicsState, translate, drawObject } = require("pdf-lib");
const sharp = require("sharp");

const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const FIRST_FAMILY = "az_marijuana_expungement_arrest_no_charges-set";
const POPPLER_PDFTOPPM = process.env.RCAP_PDFTOPPM ?? "pdftoppm";
const RASTER_ENGINE = "poppler_pdftoppm";
const RASTER_DPI = 72;
const GATES = Object.freeze({
  generationAllowed: false,
  runtimeSelectable: false,
  commercialRoutesOpened: 0,
});

const AZ_SOURCE = Object.freeze({
  formNumber: "AOC-CREM3F-071221",
  documentId: "AZ-AOC-CREM3F-PETITION-TO-EXPUNGE-MARIJUANA-RECORDS-SUPERIOR-COURT",
  officialTitle: "Petition to Expunge Records: Superior Court",
  pathInCorpus:
    "STATES/AZ/05_SOURCE_GATED/AZ__SOURCE-GATED__AOCCREM3F-071221__petition-to-expunge-records-superior-court__REV-UNKNOWN__EN.pdf",
  sha256: "3f0a4f97f7a28a63f4f74e4f6c37cc4400a47e35c5669895ebf296c882b79652",
  byteLength: 22738,
  pageCount: 3,
});

const CA_FORMS = Object.freeze({
  "CR-106": {
    documentId: "CA-CR-106-PROOF-OF-SERVICE-CRIMINAL-RECORD-CLEARING",
    role: "proof_of_service",
    pathInCorpus:
      "STATES/CA/02_PACKET_FORMS/CA__FORM__CR-106__proof-of-service-criminal-record-clearing__REV-2020-01-01__EN.pdf",
    sha256: "f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a",
    byteLength: 104278,
  },
  "CR-180": {
    documentId: "CA-CR-180-PETITION-FOR-DISMISSAL",
    role: "primary_filing",
    pathInCorpus:
      "STATES/CA/02_PACKET_FORMS/CA__FORM__CR-180__petition-for-dismissal__REV-2024-01-01__EN.pdf",
    sha256: "06c1b64315ebd5c7f8260d7169abc2392d6373a202dc39f4788cb8a8c98bbdbe",
    byteLength: 110684,
  },
  "CR-181": {
    documentId: "CA-CR-181-ORDER-FOR-DISMISSAL",
    role: "proposed_order",
    pathInCorpus:
      "STATES/CA/02_PACKET_FORMS/CA__FORM__CR-181__order-for-dismissal__REV-2024-01-01__EN.pdf",
    sha256: "f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504",
    byteLength: 110123,
  },
  "MC-031": {
    documentId: "CA-MC-031-ATTACHED-DECLARATION",
    role: "supporting_declaration",
    pathInCorpus:
      "STATES/CA/02_PACKET_FORMS/CA__FORM__MC-031__attached-declaration__REV-2005-07-01__EN.pdf",
    sha256: "defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075",
    byteLength: 109506,
  },
  "CR-400": {
    documentId: "CA-CR-400-PROP-64-PETITION-APPLICATION",
    role: "primary_filing",
    pathInCorpus:
      "STATES/CA/02_PACKET_FORMS/CA__FORM__CR-400__petition-application-under-health-and-safety-code-section-11361-8-adult-crimes__REV-2024-01-01__EN.pdf",
    sha256: "d325bb75f5a90b7864eab8fa43a905db7f2a9c233bb89fe412f609dee9ab35a1",
    byteLength: 82246,
  },
  "CR-401": {
    documentId: "CA-CR-401-PROP-64-PROOF-OF-SERVICE",
    role: "proof_of_service",
    pathInCorpus:
      "STATES/CA/02_PACKET_FORMS/CA__FORM__CR-401__proof-of-service-for-petition-application-under-health-and-safety-code-section-11361-8-adu__REV-2024-01-01__EN.pdf",
    sha256: "394421959966e27833ddd481cc39b969abd788b4119b47a3670de2d2ddb05d01",
    byteLength: 80276,
  },
  "CR-403": {
    documentId: "CA-CR-403-PROP-64-ORDER",
    role: "proposed_order",
    pathInCorpus:
      "STATES/CA/02_PACKET_FORMS/CA__FORM__CR-403__order-after-petition-application-under-health-and-safety-code-section-11361-8-adult-crimes__REV-2024-01-01__EN.pdf",
    sha256: "b0ecaeb4fc761feb6afe22b7c848e811a1028c8b4d1432e803c67112a347baff",
    byteLength: 102018,
  },
  "CR-409": {
    documentId: "CA-CR-409-PETITION-TO-SEAL-ARREST-AND-RELATED-RECORDS",
    role: "primary_filing",
    pathInCorpus:
      "STATES/CA/02_PACKET_FORMS/CA__FORM__CR-409__petition-to-seal-arrest-and-related-records__REV-2024-01-01__EN.pdf",
    sha256: "59fa8a041633feb8351715938d7b66fda0d879e502f1fb5dd3764939efcc1088",
    byteLength: 106622,
  },
  "CR-410": {
    documentId: "CA-CR-410-ORDER-TO-SEAL-ARREST-AND-RELATED-RECORDS",
    role: "proposed_order",
    pathInCorpus:
      "STATES/CA/02_PACKET_FORMS/CA__FORM__CR-410__order-to-seal-arrest-and-related-records__REV-2019-01-01__EN.pdf",
    sha256: "d94bd94bad3da9d05d71b1b154a440db1864b9441e2972c84b7854e1538604f9",
    byteLength: 52034,
  },
});

const FAMILIES = Object.freeze({
  "az_marijuana_expungement_arrest_no_charges-set": {
    jurisdiction: "az",
    outcome: "build",
    variant: "arrest_no_charges",
    assignmentOwnedPath:
      "data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-arrest-no-charges-set--official-pdf-fill",
    routeKeys: [
      "obligation:track-pathway:AZ:az_marijuana_expungement_arrest_no_charges:remedy-3-marijuana-expungement",
    ],
    sources: [AZ_SOURCE],
  },
  "az_marijuana_expungement_superior_court-set": {
    jurisdiction: "az",
    outcome: "build",
    variant: "superior_court",
    assignmentOwnedPath:
      "data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-superior-court-set--official-pdf-fill",
    routeKeys: ["obligation:track-only:AZ:az_marijuana_expungement_superior_court"],
    sources: [AZ_SOURCE],
  },
  "ca-1203-41-set": {
    jurisdiction: "ca", outcome: "build_ca", primaryForm: "CR-180",
    routeKeys: ["obligation:track-only:CA:ca-1203-41"],
    formNumbers: ["CR-180", "CR-181", "CR-106", "MC-031"],
  },
  "ca-1203-42-set": {
    jurisdiction: "ca", outcome: "build_ca", primaryForm: "CR-180",
    routeKeys: ["obligation:track-only:CA:ca-1203-42"],
    formNumbers: ["CR-180", "CR-181", "CR-106", "MC-031"],
  },
  "ca-1203-43-set": {
    jurisdiction: "ca", outcome: "build_ca", primaryForm: "CR-180",
    routeKeys: ["obligation:track-only:CA:ca-1203-43"],
    formNumbers: ["CR-180", "CR-181", "CR-106"],
  },
  "ca-1203-4a-set": {
    jurisdiction: "ca", outcome: "build_ca", primaryForm: "CR-180",
    routeKeys: ["obligation:track-only:CA:ca-1203-4a"],
    formNumbers: ["CR-180", "CR-181", "CR-106", "MC-031"],
  },
  "ca-17b-reduction-set": {
    jurisdiction: "ca", outcome: "build_ca", primaryForm: "CR-180",
    routeKeys: ["obligation:track-only:CA:ca-17b-reduction"],
    formNumbers: ["CR-180", "CR-181", "CR-106"],
  },
  "ca-851-91-set": {
    jurisdiction: "ca", outcome: "build_ca", primaryForm: "CR-409",
    routeKeys: ["obligation:track-only:CA:ca-851-91"],
    formNumbers: ["CR-409", "CR-410", "CR-106", "MC-031"],
    /*
     * FIX06, CLIPPING_AND_OVERLAP on all four delivered primary filings.
     *
     * CR-409's AcroForm /Fields array holds ONE root, `CR-409[0]`, and its four
     * footer pushbuttons hang five /Kids levels below it. The finalizer already
     * classified all four as SUPPRESS_CONTROL_APPEARANCE and already called the
     * detachment, but the detachment scanned only the flat /Fields array, found
     * nothing to remove, and left the fields exactly where getFields() walks
     * them from. updateFieldAppearances() then regenerated the Warning
     * pushbutton's appearance from its /MK /CA caption -- 18 words, laid out on
     * one line inside a 211-point-wide widget -- and flatten() stamped it: the
     * word "protection" broke the left edge of the paper at x -3.442 and the
     * caption's tail was drawn inside the Print button's own rectangle.
     *
     * This flag is set on THIS FAMILY ONLY. The other five California families
     * on this host share the same nesting and the same defect, and each is
     * another lane's to hold; flipping the default here would rewrite their
     * bytes without a claim on them.
     */
    detachNestedControlFields: true,
    // The one CR-409 pushbutton whose caption is the court's own text and not
    // chrome is classified here, because nothing structural separates them.
    appearanceSemanticsKey: "CA:ca-851-91-set:cr-409",
    /*
     * FIX04, KNOWN_PREFILLS on all four delivered CR-409s.
     *
     * The build was marking the item 3h statutory election -- two 1.2pt
     * diagonal strokes inset 2pt inside the DismissSection widget -- on a
     * petition the participant verifies under penalty of perjury. Two held
     * records forbid it. This packet's own participant page says "The platform
     * never marks a box on a sworn filing", which was false while the mark was
     * drawn; and the committed packet-set manifest assigns item 3h to the
     * participant as `complete_field`, requirement required, requiredBeforeFiling
     * true. A committed packet-set manifest is a held source under
     * DET-FEE-AND-WAIVER-001 A2, and A4 forbids a packet telling a participant
     * it does not state something it does state.
     *
     * The election is not route-determined and never was: both variants carry
     * the SAME route key, obligation:track-only:CA:ca-851-91, and which of the
     * two is open turns on the section 851.91(c)(2)(A) pattern-offence bar --
     * a fact about the participant's record that the platform does not hold.
     * So the control becomes a declared participant election in the field map
     * and a disclosed row on the participant page, and no ink is added.
     *
     * Set on THIS FAMILY ONLY. ca-prop64-set is the other family on this host
     * whose variants turn on marked boxes, it is another lane's to hold, and
     * flipping the default here would rewrite its bytes without a claim on it.
     */
    participantMarksStatutoryElections: true,
  },
  "ca-prop64-set": {
    jurisdiction: "ca", outcome: "build_ca", primaryForm: "CR-400",
    routeKeys: [
      "obligation:track-pathway:CA:ca-prop64:prop-64-completed-sentence-application-11361-8",
      "obligation:track-pathway:CA:ca-prop64:prop-64-currently-serving-petition-11361-8",
    ],
    formNumbers: ["CR-400", "CR-401", "CR-403"],
  },
});

const BOTH_AZ_VARIANTS = Object.freeze(["arrest_no_charges", "superior_court"]);
const SUPERIOR_ONLY = Object.freeze(["superior_court"]);

// Coordinates are assertions that bind a semantic record to a first-hand
// measurement made again from the exact source on each build/check.
const AZ_FIELD_SPECS = Object.freeze([
  { id: "filer-name", page: 1, construction: "drawn_rule", x0: 136.8, x1: 396, baselineY: 681.6,
    sourceLabel: "Person Filing", semanticLabel: "Filer name", role: "participant_identity",
    factId: "participant.full_legal_name", writeFor: BOTH_AZ_VARIANTS },
  { id: "mailing-address-top", page: 1, construction: "drawn_rule", x0: 151.2, x1: 396, baselineY: 666.4,
    sourceLabel: "Mailing Address", semanticLabel: "Mailing Address", role: "participant_contact",
    factId: "participant.street_address", writeFor: BOTH_AZ_VARIANTS },
  { id: "city-state-zip-top", page: 1, construction: "drawn_rule", x0: 171.2, x1: 396, baselineY: 650.4,
    sourceLabel: "City, State, Zip Code", semanticLabel: "City, State, Zip Code", role: "participant_contact",
    factId: "participant.city_state_zip", writeFor: BOTH_AZ_VARIANTS },
  { id: "email-top", page: 1, construction: "underscore_leader_run", x0: 143.21, x1: 398.41, baselineY: 636.8,
    sourceLabel: "Email Address", semanticLabel: "Email Address", role: "participant_contact",
    factId: "participant.email", writeFor: BOTH_AZ_VARIANTS },
  { id: "telephone-top", page: 1, construction: "drawn_rule", x0: 174.4, x1: 396, baselineY: 618.4,
    sourceLabel: "Telephone Number(s)", semanticLabel: "Telephone Number", role: "participant_contact",
    factId: "participant.phone", writeFor: BOTH_AZ_VARIANTS },
  { id: "attorney-bar-top", page: 1, construction: "underscore_leader_run", x0: 193.59, x1: 398.39, baselineY: 589.6,
    sourceLabel: "State Bar or LDP Number", semanticLabel: null, role: "attorney_identifier",
    refusal: "Attorney/LDP-only identifier; the participant is not named as their own attorney." },
  { id: "party-represented-top", page: 1, construction: "underscore_leader_run", x0: 194.39, x1: 399.2, baselineY: 573.6,
    sourceLabel: "Party you are representing", semanticLabel: null, role: "attorney_representation",
    refusal: "Attorney/LDP representation block; no representation fact is held." },
  { id: "venue-county", page: 1, construction: "underscore_leader_run", x0: 256.78, x1: 495.18, baselineY: 545.6,
    sourceLabel: "In the Superior Court of Arizona for [blank] County", semanticLabel: "County",
    role: "participant_stated_venue", factId: "matter.county", printedSuffixAfterBlank: "County",
    writeFor: BOTH_AZ_VARIANTS },
  { id: "caption-case-number", page: 1, construction: "drawn_rule", x0: 320.8, x1: 544, baselineY: 479.2,
    sourceLabel: "Case Number", semanticLabel: "Case Number", role: "matter_identifier",
    factId: "matter.case_number", writeFor: SUPERIOR_ONLY,
    refusal: "The arrest-no-charges route leaves the case number blank for the court to assign, as its route record states." },
  { id: "defendant-name", page: 1, construction: "underscore_leader_run", x0: 72.8, x1: 289.59, baselineY: 448.8,
    sourceLabel: "Defendant (FIRST, MI, LAST)", semanticLabel: "Defendant name", role: "participant_identity",
    factId: "participant.full_legal_name", writeFor: BOTH_AZ_VARIANTS },
  { id: "date-of-birth", page: 1, construction: "underscore_leader_run", x0: 136.79, x1: 287.99, baselineY: 410.4,
    sourceLabel: "Date of Birth", semanticLabel: "Date of Birth", role: "participant_identity",
    factId: "participant.date_of_birth", writeFor: BOTH_AZ_VARIANTS },
  { id: "citing-or-arresting-agency", page: 1, construction: "underscore_leader_run", x0: 326.39, x1: 536.79, baselineY: 153.6,
    sourceLabel: "Name of citing or arresting law enforcement agency",
    semanticLabel: "Citing/arresting law enforcement agency", role: "participant_stated_agency_fact",
    factId: "matter.citing_or_arresting_agency", writeFor: BOTH_AZ_VARIANTS },
  { id: "superior-court-case-number", page: 1, construction: "underscore_leader_run", x0: 218.39, x1: 539.19, baselineY: 128,
    sourceLabel: "Superior court case number", semanticLabel: "Superior court case number", role: "matter_identifier",
    factId: "matter.case_number", writeFor: SUPERIOR_ONLY,
    refusal: "The arrest-no-charges route leaves the case number blank for the court to assign, as its route record states." },
  { id: "name-at-arrest-if-different", page: 1, construction: "underscore_leader_run", x0: 300.8, x1: 517.6, baselineY: 101.6,
    sourceLabel: "My name at the time of arrest was (if different)", semanticLabel: null,
    role: "conditional_alternate_identity",
    refusal: "The platform holds the current legal name, not a separately verified name-at-arrest value; the form says to complete this only if different." },
  { id: "arrest-date", page: 2, construction: "underscore_leader_run", x0: 227.22, x1: 509.62, baselineY: 668,
    sourceLabel: "I was arrested on [insert date]", semanticLabel: "Arrest date", role: "matter_fact",
    factId: "matter.arrest_date", writeFor: BOTH_AZ_VARIANTS },
  { id: "justice-court-name", page: 2, construction: "underscore_leader_run", x0: 90.4, x1: 274.4, baselineY: 640,
    sourceLabel: "If Yes, insert name of Justice Court here", semanticLabel: null, role: "conditional_court_field",
    participantMustSupply: "the name of the Justice Court, if you answered Yes to question 2 - leave blank if you answered No" },
  { id: "justice-court-case-number", page: 2, construction: "underscore_leader_run", x0: 90.4, x1: 268.8, baselineY: 627.2,
    sourceLabel: "Justice Court case number here", semanticLabel: null, role: "conditional_matter_identifier",
    participantMustSupply: "the Justice Court case number, if you answered Yes to question 2 - leave blank if you answered No" },
  { id: "prosecuting-agency", page: 2, construction: "underscore_leader_run", x0: 222.4, x1: 511.2, baselineY: 612,
    sourceLabel: "Name of prosecuting agency", semanticLabel: null, role: "prosecutor_agency_field",
    blankTreatment: "REQUIRED_BEFORE_FILING",
    participantMustSupply: "the name of the prosecuting agency, as it appears on your paperwork" },
  { id: "conditional-conviction-date", page: 2, construction: "underscore_leader_run", x0: 466.38, x1: 571.98, baselineY: 596,
    sourceLabel: "If Yes, insert date of conviction here", semanticLabel: null, role: "conditional_disposition",
    participantMustSupply: "the date you were convicted, if you answered Yes to question 4 - leave blank if you answered No" },
  { id: "conditional-dismissal-date", page: 2, construction: "underscore_leader_run", x0: 430.39, x1: 508.79, baselineY: 548.8,
    sourceLabel: "If Yes, insert date of dismissal here", semanticLabel: null, role: "conditional_disposition",
    participantMustSupply: "the date your case was dismissed, if you answered Yes to question 7 - leave blank if you answered No" },
  { id: "supporting-documentation-line-1", page: 2, construction: "underscore_leader_run", x0: 72, x1: 542.4, baselineY: 413.6,
    sourceLabel: "Supporting documentation (optional), line 1", semanticLabel: null, role: "participant_narrative",
    refusal: "Optional participant-authored description of attachments; the platform does not invent it." },
  { id: "supporting-documentation-line-2", page: 2, construction: "underscore_leader_run", x0: 72, x1: 542.4, baselineY: 394.4,
    sourceLabel: "Supporting documentation (optional), line 2", semanticLabel: null, role: "participant_narrative",
    refusal: "Optional participant-authored description of attachments; the platform does not invent it." },
  { id: "petitioner-signature-and-date", page: 2, construction: "underscore_leader_run", x0: 71.99, x1: 542.39, baselineY: 160.8,
    sourceLabel: "Petitioner's Signature / Date", semanticLabel: null, role: "signature_and_date",
    refusal: "Signature and signature date are completed by the participant after review; never prefilled." },
  { id: "mailing-address-declaration", page: 2, construction: "underscore_leader_run", x0: 71.98, x1: 503.18, baselineY: 129.6,
    sourceLabel: "Petitioner's Mailing Address", semanticLabel: "Petitioner's Mailing Address",
    role: "participant_contact", factId: "participant.street_address", writeFor: BOTH_AZ_VARIANTS },
  { id: "email-declaration", page: 2, construction: "underscore_leader_run", x0: 71.97, x1: 503.17, baselineY: 98.4,
    sourceLabel: "Petitioner's Email Address", semanticLabel: "Petitioner's Email Address",
    role: "participant_contact", factId: "participant.email", writeFor: BOTH_AZ_VARIANTS },
  { id: "phone-declaration", page: 2, construction: "underscore_leader_run", x0: 71.97, x1: 503.16, baselineY: 72.8,
    sourceLabel: "Petitioner's Phone Number", semanticLabel: "Petitioner's Phone Number",
    role: "participant_contact", factId: "participant.phone", writeFor: BOTH_AZ_VARIANTS },
  { id: "attorney-name-printed", page: 3, construction: "underscore_leader_run", x0: 72, x1: 228.8, baselineY: 668.8,
    sourceLabel: "Attorney's name printed", semanticLabel: null, role: "attorney_identity",
    refusal: "Attorney-only field; never prefilled." },
  { id: "attorney-signature", page: 3, construction: "underscore_leader_run", x0: 252, x1: 502.39, baselineY: 668.8,
    sourceLabel: "Attorney's signature", semanticLabel: null, role: "attorney_signature",
    refusal: "Attorney signature; never prefilled." },
  { id: "attorney-bar-number", page: 3, construction: "underscore_leader_run", x0: 72, x1: 503.2, baselineY: 630.4,
    sourceLabel: "Attorney's Bar Number", semanticLabel: null, role: "attorney_identifier",
    refusal: "Attorney-only identifier; never prefilled." },
  { id: "attorney-mailing-address", page: 3, construction: "underscore_leader_run", x0: 72, x1: 481.6, baselineY: 592.8,
    sourceLabel: "Attorney's Mailing Address", semanticLabel: null, role: "attorney_contact",
    refusal: "Attorney-only contact field; never prefilled with participant data." },
  { id: "attorney-phone-and-email", page: 3, construction: "underscore_leader_run", x0: 72, x1: 508.8, baselineY: 555.2,
    sourceLabel: "Attorney's Phone Number and Email Address", semanticLabel: null, role: "attorney_contact",
    refusal: "Attorney-only contact field; never prefilled with participant data." },
]);

const CANONICAL = Object.freeze({
  "participant.full_legal_name": "Jordan Avery Reyes",
  "participant.first_name": "Jordan",
  "participant.middle_name": "Avery",
  "participant.last_name": "Reyes",
  "participant.street_address": "118 Maple Street",
  "participant.city": "Springfield",
  "participant.state": "AZ",
  "participant.zip": "01234",
  "participant.city_state_zip": "Springfield, AZ 01234",
  "participant.phone": "555-0142",
  "participant.email": "jordan.reyes@example.com",
  "participant.date_of_birth": "1991-04-17",
  "matter.county": "Example County",
  "matter.court": "Superior Court",
  "matter.case_number": "24-CR-001234",
  "matter.arrest_date": "2019-03-08",
  "matter.citing_or_arresting_agency": "Example Police Department",
  "matter.conviction_date": "2019-11-02",
  "matter.disposition_date": "2020-01-15",
  "deterministic.filing_date": "2026-08-30",
});

const BOUNDARY = Object.freeze({
  ...CANONICAL,
  "participant.full_legal_name":
    "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
  "participant.street_address":
    "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "participant.city": "Unincorporated Township of Long Hollow Crossing",
  "participant.zip": "01234-9999",
  "participant.city_state_zip":
    "Unincorporated Township of Long Hollow Crossing, AZ 01234-9999",
  "participant.phone": "555-0142 ext. 44821",
  "participant.email":
    "alexandrina.montgomery.vandenberg.oyelaran.fitzwilliam@department-of-example.example.gov",
  "matter.county": "Saint Bartholomew and the Northern Reaches County",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201",
});

// Exact, field-name-bounded mappings for facts the platform already holds.
// The names below are terminal names read first-hand from the pinned forms; no
// label regex can add a write. Elections, signatures, service acts, local-court
// addresses, prosecutor facts, narratives, and unheld offense subparts remain
// refused below.
const CA_PRIMARY_WRITES = Object.freeze({
  "CR-180": Object.freeze({
    "CR-180[0].Page1[0].P1Caption[0].TitlePartyName[0].Defendant[0]":
      "participant.full_legal_name",
    "CR-180[0].Page1[0].P1Caption[0].HeaderSub[0].Stmp[0].CaseNumber[0].CaseNumber1[0]":
      "matter.case_number",
    "CR-180[0].Page2[0].pXCaption[0].Defendant[0]":
      "participant.full_legal_name",
    "CR-180[0].Page2[0].pXCaption[0].CaseNumber1[0]":
      "matter.case_number",
    "CR-180[0].Page3[0].pXCaption[0].Defendant[0]":
      "participant.full_legal_name",
    "CR-180[0].Page3[0].pXCaption[0].CaseNumber1[0]":
      "matter.case_number",
    "CR-180[0].Page1[0].P1Caption[0].CourtInfo[0].CrtCounty[0]":
      "matter.county",
    "CR-180[0].Page1[0].LI1[0].li1[0].ConvictionDate[0]":
      "matter.conviction_date",
  }),
  "CR-409": Object.freeze({
    "CR-409[0].Page1[0].LI1[0].li1a[0].TextField[0]":
      "participant.full_legal_name",
    "CR-409[0].Page1[0].rightCaption[0].CaseNumber[0]":
      "matter.case_number",
    "CR-409[0].Page1[0].rightCaption[0].TCCaseName[0]":
      "participant.full_legal_name",
    "CR-409[0].Page2[0].PxCapton_sf[0].CaseNumber[0]":
      "matter.case_number",
    "CR-409[0].Page1[0].LI1[0].li1a[0].T186[0]":
      "participant.date_of_birth",
    "CR-409[0].Page1[0].LI1[0].li1b[0].ProtectedStreet[0]":
      "participant.street_address",
    "CR-409[0].Page1[0].LI1[0].li1b[0].ProtectedCity[0]":
      "participant.city",
    "CR-409[0].Page1[0].LI1[0].li1b[0].ProtectedState[0]":
      "participant.state",
    "CR-409[0].Page1[0].LI1[0].li1b[0].ProtectedZip[0]":
      "participant.zip",
    "CR-409[0].Page1[0].LI1[0].li1b[0].ProtectedPhone[0]":
      "participant.phone",
    "CR-409[0].Page1[0].LI1[0].li1b[0].ProtectedEmail[0]":
      "participant.email",
    "CR-409[0].Page1[0].LI3[0].li3a[0].T186[0]":
      "matter.arrest_date",
    "CR-409[0].Page1[0].LI3[0].li3c[0].T186[0]":
      "matter.citing_or_arresting_agency",
    "CR-409[0].Page1[0].rightCaption[0].CourtInfo[0]":
      "matter.county",
  }),
  "CR-400": Object.freeze({
    "CR-400[0].Page1[0].P1Caption[0].Party[0].Party2[0]":
      "participant.full_legal_name",
    "CR-400[0].Page1[0].P1Caption[0].HeaderSub[0].CaseNumber[0].CaseNumber[0]":
      "matter.case_number",
    "CR-400[0].Page1[0].P1Caption[0].CourtInfo[0].CrtCounty[0]":
      "matter.county",
  }),
});

// Exact semantic aliases for source labels whose wording does not match the
// shared descriptor literally. Each alias is bound to one measured terminal
// name; the source tooltip is retained separately in the census and field map,
// and no label regex can add another field.
const CA_EXACT_SEMANTIC_LABELS = Object.freeze({
  "CR-180[0].Page1[0].LI1[0].li1[0].ConvictionDate[0]":
    "Conviction date",
  "CR-409[0].Page1[0].LI1[0].li1b[0].ProtectedStreet[0]":
    "Street address",
  "CR-409[0].Page1[0].LI3[0].li3a[0].T186[0]":
    "Date of arrest",
  "CR-409[0].Page1[0].LI3[0].li3c[0].T186[0]":
    "Citing/arresting law enforcement agency",
});

const CA_ROUTE_VARIANTS = Object.freeze({
  "ca-1203-41-set": Object.freeze([Object.freeze({
    variantId: "pc-1203-41",
    routeKey: "obligation:track-only:CA:ca-1203-41",
    statute: "Penal Code section 1203.41",
    selections: Object.freeze([Object.freeze({
      fieldName: "CR-180[0].Page2[0].LI5[0].CheckBox19[0]", onState: "1",
      tooltipIncludes: "§ 1203.41",
    })]),
    textControls: Object.freeze({}), controlFacts: Object.freeze({}),
  })]),
  "ca-1203-42-set": Object.freeze([Object.freeze({
    variantId: "pc-1203-42",
    routeKey: "obligation:track-only:CA:ca-1203-42",
    statute: "Penal Code section 1203.42",
    selections: Object.freeze([Object.freeze({
      fieldName: "CR-180[0].Page3[0].LI6[0].li6[0].OffenseWSentence[0]", onState: "1",
      tooltipIncludes: "§ 1203.42",
    })]),
    textControls: Object.freeze({}), controlFacts: Object.freeze({}),
  })]),
  "ca-1203-43-set": Object.freeze([Object.freeze({
    variantId: "pc-1203-43",
    routeKey: "obligation:track-only:CA:ca-1203-43",
    statute: "Penal Code section 1203.43",
    selections: Object.freeze([Object.freeze({
      fieldName: "CR-180[0].Page3[0].LI7[0].OffenseWSentence[0]", onState: "1",
      tooltipIncludes: "§ 1203.43",
    })]),
    textControls: Object.freeze({}), controlFacts: Object.freeze({}),
  })]),
  "ca-1203-4a-set": Object.freeze([Object.freeze({
    variantId: "pc-1203-4a",
    routeKey: "obligation:track-only:CA:ca-1203-4a",
    statute: "Penal Code section 1203.4a",
    selections: Object.freeze([Object.freeze({
      fieldName: "CR-180[0].Page2[0].LI3[0].OffenseWSentence[0]", onState: "1",
      tooltipIncludes: "§ 1203.4a",
    })]),
    textControls: Object.freeze({}), controlFacts: Object.freeze({}),
  })]),
  "ca-17b-reduction-set": Object.freeze([
    Object.freeze({
      variantId: "pc-17b-felony-to-misdemeanor",
      routeKey: "obligation:track-only:CA:ca-17b-reduction",
      statute: "Penal Code section 17(b), felony to misdemeanor",
      selections: Object.freeze([]),
      textControls: Object.freeze({
        "CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row1[0].Reduce1[0]": "route.pc17b.reduce_to_misdemeanor",
        "CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row1[0].Offense1[0]": "route.pc17b.reduce_to_infraction",
      }),
      controlFacts: Object.freeze({
        "route.pc17b.reduce_to_misdemeanor": "yes",
        "route.pc17b.reduce_to_infraction": "no",
      }),
    }),
    Object.freeze({
      variantId: "pc-17d2-misdemeanor-to-infraction",
      routeKey: "obligation:track-only:CA:ca-17b-reduction",
      statute: "Penal Code section 17(d)(2), misdemeanor to infraction",
      selections: Object.freeze([]),
      textControls: Object.freeze({
        "CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row1[0].Reduce1[0]": "route.pc17b.reduce_to_misdemeanor",
        "CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row1[0].Offense1[0]": "route.pc17b.reduce_to_infraction",
      }),
      controlFacts: Object.freeze({
        "route.pc17b.reduce_to_misdemeanor": "no",
        "route.pc17b.reduce_to_infraction": "yes",
      }),
    }),
  ]),
  "ca-851-91-set": Object.freeze([
    Object.freeze({
      variantId: "pc-851-91-matter-of-right",
      routeKey: "obligation:track-only:CA:ca-851-91",
      statute: "Penal Code section 851.91, matter of right",
      selections: Object.freeze([Object.freeze({
        fieldName: "CR-409[0].Page2[0].LI3-2[0].li3h[0].DismissSection[0]", onState: "1",
        tooltipIncludes: "sealed as a matter of right",
      })]),
      textControls: Object.freeze({}), controlFacts: Object.freeze({}),
    }),
    Object.freeze({
      variantId: "pc-851-91-interests-of-justice",
      routeKey: "obligation:track-only:CA:ca-851-91",
      statute: "Penal Code section 851.91, interests of justice",
      selections: Object.freeze([Object.freeze({
        fieldName: "CR-409[0].Page2[0].LI3-2[0].li3h[0].DismissSection[1]", onState: "2",
        tooltipIncludes: "interests of justice",
      })]),
      textControls: Object.freeze({}), controlFacts: Object.freeze({}),
    }),
  ]),
  "ca-prop64-set": Object.freeze([
    Object.freeze({
      variantId: "hs-11361-8-completed-sentence-application",
      routeKey: "obligation:track-pathway:CA:ca-prop64:prop-64-completed-sentence-application-11361-8",
      statute: "Health and Safety Code section 11361.8(f), completed sentence application",
      selections: Object.freeze([
        Object.freeze({
          fieldName: "CR-400[0].Page1[0].P1Caption[0].FormTitle[0].#area[1].Checkbox[1]",
          onState: "Yes", tooltipIncludes: "11361.8(f)",
        }),
        Object.freeze({
          fieldName: "CR-400[0].Page1[0].LI2[0].li2b[0].Checkbox[0]",
          onState: "Yes", tooltipIncludes: "completed the sentence",
        }),
      ]),
      textControls: Object.freeze({}), controlFacts: Object.freeze({}),
    }),
    Object.freeze({
      variantId: "hs-11361-8-currently-serving-petition",
      routeKey: "obligation:track-pathway:CA:ca-prop64:prop-64-currently-serving-petition-11361-8",
      statute: "Health and Safety Code section 11361.8(b), currently serving petition",
      selections: Object.freeze([
        Object.freeze({
          fieldName: "CR-400[0].Page1[0].P1Caption[0].FormTitle[0].#area[0].Checkbox[0]",
          onState: "Yes", tooltipIncludes: "11361.8(b)",
        }),
        Object.freeze({
          fieldName: "CR-400[0].Page1[0].LI2[0].li2a[0].Checkbox[0]",
          onState: "Yes", tooltipIncludes: "currently serving a sentence",
        }),
      ]),
      textControls: Object.freeze({}), controlFacts: Object.freeze({}),
    }),
  ]),
});

const PIKEPDF_BRIDGE = String.raw`
import hashlib
import importlib.util
import json
import os
import sys
import pikepdf

req = json.loads(sys.argv[1])

def load_module(name, filename):
    spec = importlib.util.spec_from_file_location(name, filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def sha256_file(filename):
    h = hashlib.sha256()
    with open(filename, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def inherited(node, key):
    guard = 0
    while node is not None and guard < 64:
        value = node.get(key)
        if value is not None:
            return value
        node = node.get("/Parent")
        guard += 1
    return None

def object_json(value):
    if value is None:
        return None
    if isinstance(value, pikepdf.Array):
        return [object_json(item) for item in value]
    if isinstance(value, pikepdf.Dictionary):
        return {str(key): object_json(value[key]) for key in sorted(value.keys(), key=str)}
    if isinstance(value, pikepdf.Stream):
        body = bytes(value.read_bytes())
        return {"streamSha256": hashlib.sha256(body).hexdigest(), "streamByteLength": len(body)}
    if isinstance(value, (bool, int, float)):
        return value
    return str(value)

def xfa_descriptor(pdf):
    if "/AcroForm" not in pdf.Root or "/XFA" not in pdf.Root.AcroForm:
        return {"present": False, "sha256": None, "parts": 0}
    xfa = pdf.Root.AcroForm["/XFA"]
    parts = list(xfa) if isinstance(xfa, pikepdf.Array) else [xfa]
    digest = hashlib.sha256()
    for index, part in enumerate(parts):
        if isinstance(part, pikepdf.Stream):
            kind, body = b"stream", bytes(part.read_bytes())
        else:
            kind, body = b"object", str(part).encode("utf-8")
        digest.update(str(index).encode("ascii") + b":" + kind + b":" + str(len(body)).encode("ascii") + b":" + body)
    return {"present": True, "sha256": digest.hexdigest(), "parts": len(parts)}

def appearance_states(widget):
    ap = widget.get("/AP")
    if ap is None or "/N" not in ap:
        return []
    normal = ap["/N"]
    # A direct appearance stream has no selectable appearance-state keys.  A
    # pikepdf Stream is also dictionary-like, so enumerating its dictionary
    # keys would mistake serialization details such as /Filter for button
    # states and would make a lossless qpdf rewrite look semantically changed.
    if isinstance(normal, pikepdf.Stream):
        return []
    try:
        return sorted(str(key).lstrip("/") for key in normal.keys())
    except AttributeError:
        return []

def terminal_semantics(pdf):
    page_index = {page.obj.objgen: index for index, page in enumerate(pdf.pages)}
    rows = []
    for field in census_reader.terminal_fields(pdf):
        field_type_obj = inherited(field, "/FT")
        field_type = str(field_type_obj) if field_type_obj is not None else None
        flags_obj = inherited(field, "/Ff")
        flags = int(flags_obj) if flags_obj is not None else 0
        widgets = []
        nodes = field.get("/Kids") if field.get("/Kids") is not None else [field]
        for widget in nodes:
            rect_obj = widget.get("/Rect")
            if rect_obj is None:
                continue
            x0, y0, x1, y1 = (float(value) for value in rect_obj)
            rect = [census_reader.rnd(min(x0, x1)), census_reader.rnd(min(y0, y1)),
                    census_reader.rnd(max(x0, x1)), census_reader.rnd(max(y0, y1))]
            page_ref = widget.get("/P")
            states = appearance_states(widget)
            widgets.append({
                "pageIndex": page_index.get(page_ref.objgen) if page_ref is not None else None,
                "rect": rect,
                "annotationFlags": int(widget.get("/F", 0)),
                "appearanceStates": states,
                "onStates": [state for state in states if state != "Off"],
            })
        widgets.sort(key=lambda row: (row["pageIndex"] if row["pageIndex"] is not None else -1,
                                      row["rect"]))
        rows.append({
            "name": census_reader.qualified_name(field),
            "fieldType": field_type,
            "rawFf": flags,
            "flags": census_reader.decode_flags(flags, field_type),
            "options": object_json(inherited(field, "/Opt")),
            "defaultValue": object_json(inherited(field, "/DV")),
            "currentValue": object_json(inherited(field, "/V")),
            "widgets": widgets,
        })
    rows.sort(key=lambda row: row["name"])
    return rows

def semantic_descriptor(path):
    with pikepdf.open(path) as pdf:
        fields = terminal_semantics(pdf)
        xfa = xfa_descriptor(pdf)
    encoded = json.dumps({"terminalFields": fields, "xfa": xfa}, sort_keys=True,
                         separators=(",", ":")).encode("utf-8")
    return {"terminalFields": fields, "terminalFieldCount": len(fields), "xfa": xfa,
            "sha256": hashlib.sha256(encoded).hexdigest()}

def semantic_diff(official, derivative):
    left = {field["name"]: field for field in official["terminalFields"]}
    right = {field["name"]: field for field in derivative["terminalFields"]}
    shared = sorted(set(left) & set(right))
    differences = []
    for name in shared:
        changed = [key for key in ["fieldType", "rawFf", "flags", "options", "defaultValue", "currentValue", "widgets"]
                   if left[name][key] != right[name][key]]
        if changed:
            differences.append({
                "name": name,
                "changedProperties": changed,
                "official": {key: left[name][key] for key in changed},
                "derivative": {key: right[name][key] for key in changed},
            })
    return {
        "fieldsOnlyInOfficial": sorted(set(left) - set(right)),
        "fieldsOnlyInDerivative": sorted(set(right) - set(left)),
        "fieldDifferences": differences,
        "xfaIdentical": official["xfa"] == derivative["xfa"],
    }

def census_form(form, path, pinned, write_scratch):
    observed = sha256_file(path)
    if observed != pinned:
        raise RuntimeError(f"{form}: pinned source mismatch before census")
    with pikepdf.open(path) as pdf:
        page_index = {page.obj.objgen: index for index, page in enumerate(pdf.pages)}
        pages = []
        for index, page in enumerate(pdf.pages):
            content = census_reader.read_page_content(page)
            if write_scratch:
                form_dir = os.path.join(req["scratchDir"], form)
                os.makedirs(form_dir, exist_ok=True)
                with open(os.path.join(form_dir, "page-%02d.txt" % (index + 1)), "wb") as handle:
                    handle.write(content)
            pages.append({
                "pageIndex": index,
                "mediaBox": [census_reader.rnd(value) for value in page.MediaBox],
                "cropBox": [census_reader.rnd(value) for value in page.CropBox] if "/CropBox" in page else None,
                "rotate": int(page.get("/Rotate", 0)),
                "contentStreamSha256": hashlib.sha256(content).hexdigest(),
            })
        semantics = terminal_semantics(pdf)
        semantic_by_name = {field["name"]: field for field in semantics}
        fields = []
        for field in census_reader.terminal_fields(pdf):
            name = census_reader.qualified_name(field)
            semantic = semantic_by_name[name]
            field_type = semantic["fieldType"]
            flags = semantic["rawFf"]
            widgets = []
            nodes = field.get("/Kids") if field.get("/Kids") is not None else [field]
            for widget in nodes:
                rect_obj = widget.get("/Rect")
                if rect_obj is None:
                    continue
                x0, y0, x1, y1 = (float(value) for value in rect_obj)
                lo_x, hi_x = min(x0, x1), max(x0, x1)
                lo_y, hi_y = min(y0, y1), max(y0, y1)
                page_ref = widget.get("/P")
                widgets.append({
                    "pageIndex": page_index.get(page_ref.objgen) if page_ref is not None else None,
                    "rect": [census_reader.rnd(lo_x), census_reader.rnd(lo_y),
                             census_reader.rnd(hi_x), census_reader.rnd(hi_y)],
                    "width": census_reader.rnd(hi_x - lo_x),
                    "height": census_reader.rnd(hi_y - lo_y),
                    "onStates": census_reader.on_states(widget) if field_type == "/Btn" else [],
                    "appearanceStates": appearance_states(widget),
                    "markRegion": census_reader.mark_region(widget, (lo_x, lo_y, hi_x, hi_y))
                                  if field_type == "/Btn" else None,
                    "hidden": bool(int(widget.get("/F", 0)) & 0b10),
                })
            widgets.sort(key=lambda row: (row["pageIndex"] if row["pageIndex"] is not None else -1,
                                          -row["rect"][3], row["rect"][0]))
            tooltip = field.get("/TU")
            fields.append({
                "name": name,
                "shortName": str(field.get("/T")) if field.get("/T") is not None else None,
                "fieldType": field_type,
                "flags": census_reader.decode_flags(flags, field_type),
                "rawFf": flags,
                "maxLen": int(field["/MaxLen"]) if "/MaxLen" in field else None,
                "tooltip": str(tooltip) if tooltip is not None else None,
                "options": semantic["options"],
                "defaultValue": semantic["defaultValue"],
                "currentValue": semantic["currentValue"],
                "widgetCount": len(widgets),
                "widgets": widgets,
            })
        fields.sort(key=lambda row: (
            row["widgets"][0]["pageIndex"] if row["widgets"] else 99,
            -row["widgets"][0]["rect"][3] if row["widgets"] else 0,
            row["widgets"][0]["rect"][0] if row["widgets"] else 0,
        ))
        acro = pdf.Root.AcroForm
        xfa = xfa_descriptor(pdf)
        return {
            "formNumber": form,
            "officialPath": os.path.join("STATES/CA/02_PACKET_FORMS", os.path.basename(path)),
            "pinnedOfficialSha256": pinned,
            "observedOfficialSha256": observed,
            "sha256Verified": True,
            "measuredOff": "official binary",
            "acroForm": {
                "isHybridXfa": xfa["present"],
                "xfaSha256": xfa["sha256"],
                "xfaParts": xfa["parts"],
                "needsRendering": bool(pdf.Root.get("/NeedsRendering", False)),
                "sigFlags": int(acro["/SigFlags"]) if "/SigFlags" in acro else 0,
                "needAppearances": bool(acro.get("/NeedAppearances", False)),
            },
            "pageCount": len(pdf.pages),
            "pages": pages,
            "terminalFieldCount": len(fields),
            "fields": fields,
        }

census_reader = load_module(
    "c11_census_reader",
    "scripts/census-v1-ca-1203-4-set/census-official-fields.py",
)
fidelity_reader = load_module(
    "c11_fidelity_reader",
    "scripts/census-v1-ca-1203-4-set/compare-official-vs-rescued.py",
)
result = {
    "reader": {
        "pikepdfVersion": pikepdf.__version__,
        "libqpdfVersion": pikepdf.__libqpdf_version__,
        "censusLogic": "scripts/census-v1-ca-1203-4-set/census-official-fields.py",
        "fidelityLogic": "scripts/census-v1-ca-1203-4-set/compare-official-vs-rescued.py",
    },
    "forms": {},
    "derivatives": [],
}

for target in req["targets"]:
    form = target["formNumber"]
    source_path = target["sourcePath"]
    pinned = target["sha256"]
    before = sha256_file(source_path)
    if before != pinned:
        raise RuntimeError(f"{form}: pinned source mismatch before pikepdf read")
    census = census_form(form, source_path, pinned, bool(req.get("writeScratch", False)))
    result["forms"][form] = census

    derived_path = target.get("derivedPath")
    if not derived_path:
        continue
    if req["mode"] == "create":
        os.makedirs(os.path.dirname(derived_path), exist_ok=True)
        with pikepdf.open(source_path) as pdf:
            # deterministic_id derives the trailer /ID from the file contents.
            # Without it every save mints a fresh random /ID, so two builds of
            # the same pinned source disagree on derivedSha256 and the family
            # can never rebuild byte-identically.
            pdf.save(derived_path, deterministic_id=True)
    if not os.path.exists(derived_path):
        raise RuntimeError(f"{form}: expected derived PDF is absent")

    official = fidelity_reader.describe(source_path)
    derivative = fidelity_reader.describe(derived_path)
    delta = fidelity_reader.diff(official, derivative)
    official_semantics = semantic_descriptor(source_path)
    derivative_semantics = semantic_descriptor(derived_path)
    semantics_delta = semantic_diff(official_semantics, derivative_semantics)
    enhanced_semantics_identical = (
        official_semantics["sha256"] == derivative_semantics["sha256"]
        and not semantics_delta["fieldsOnlyInOfficial"]
        and not semantics_delta["fieldsOnlyInDerivative"]
        and not semantics_delta["fieldDifferences"]
        and semantics_delta["xfaIdentical"]
    )
    equivalent = (
        delta["pageCount"] is None
        and not delta["pageGeometry"]
        and not delta["fieldsOnlyInOfficial"]
        and not delta["fieldsOnlyInDerivative"]
        and not delta["fieldDifferences"]
        and not delta["contentStreamChangedPages"]
        and enhanced_semantics_identical
    )
    with pikepdf.open(derived_path) as derived_pdf:
        derived_xfa = (
            "/AcroForm" in derived_pdf.Root
            and "/XFA" in derived_pdf.Root.AcroForm
        )
        derived_encrypted = derived_pdf.is_encrypted
    after = sha256_file(source_path)
    result["derivatives"].append({
        "formNumber": form,
        "sourcePath": source_path,
        "sourceSha256Before": before,
        "sourceSha256After": after,
        "sourceUnchanged": before == after == pinned,
        "derivedPath": derived_path,
        "derivedSha256": sha256_file(derived_path),
        "derivedByteLength": os.path.getsize(derived_path),
        "createdBy": "pikepdf.open(exact_source).save(derived_path, deterministic_id=True)",
        "openedWithEmptyUserPassword": True,
        "derivedEncrypted": derived_encrypted,
        "officialHadXfa": census["acroForm"]["isHybridXfa"],
        "derivedHadXfa": derived_xfa,
        "comparison": {
            "equivalent": equivalent,
            "pageCount": official["pageCount"],
            "fieldCount": official["fieldCount"],
            "terminalFieldTreeAndWidgetsIdentical": (
                not delta["fieldsOnlyInOfficial"]
                and not delta["fieldsOnlyInDerivative"]
                and not delta["fieldDifferences"]
            ),
            "pageGeometryIdentical": delta["pageCount"] is None and not delta["pageGeometry"],
            "originalPageContentStreamsIdentical": not delta["contentStreamChangedPages"],
            "contentStreamIdenticalPages": delta["contentStreamIdenticalPages"],
            "enhancedTerminalSemanticsIdentical": enhanced_semantics_identical,
            "enhancedTerminalSemanticsContract": [
                "terminal field qualified name", "field type", "raw and decoded field flags",
                "options", "default value", "current value", "widget page and rectangle",
                "widget annotation flags", "widget AP normal states and on-states",
                "XFA presence and decoded-packet digest",
            ],
            "officialEnhancedSemanticsSha256": official_semantics["sha256"],
            "derivedEnhancedSemanticsSha256": derivative_semantics["sha256"],
            "officialXfa": official_semantics["xfa"],
            "derivedXfa": derivative_semantics["xfa"],
            "enhancedSemanticsDelta": semantics_delta,
            "delta": delta,
        },
    })

print(json.dumps(result, separators=(",", ":")))
`;

const round = (value, digits = 2) => Number(Number(value).toFixed(digits));
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const abs = (relativePath) => path.join(rootDir, relativePath);
const readJson = (relativePath) => JSON.parse(fs.readFileSync(abs(relativePath), "utf8"));
const writeJson = (relativePath, value) => {
  fs.mkdirSync(path.dirname(abs(relativePath)), { recursive: true });
  fs.writeFileSync(abs(relativePath), `${JSON.stringify(value, null, 2)}\n`);
};
// The participant-instruction writer. westParticipantInstructions() has existed
// since this host was written and returns markdown, but nothing ever defined
// the function that writes it -- so buildAz and buildCa both died on
// "ReferenceError: writeText is not defined" at the instruction step, and every
// AZ and CA family in the fleet was unbuildable. buildAz reached it after
// rewriting the field map and before rendering, so an unrestored run left a
// half-rebuilt overlay behind.
const writeText = (relativePath, text) => {
  fs.mkdirSync(path.dirname(abs(relativePath)), { recursive: true });
  fs.writeFileSync(abs(relativePath), text.endsWith("\n") ? text : `${text}\n`);
};

function requireFamily(familyId) {
  const family = FAMILIES[familyId];
  if (!family) throw new Error(`WEST builder does not own packet family ${familyId}`);
  return family;
}

function outputDir(familyId) {
  const family = requireFamily(familyId);
  return family.assignmentOwnedPath
    ?? `data/rcap-all50/overlays/census-v1/${family.jurisdiction}/${familyId}--official-pdf-fill`;
}

/*
 * The declared variants with every statutory selection withdrawn, for a family
 * that leaves its elections to the participant. Memoised so that repeated calls
 * return the same frozen objects and every deepEqual across the build sees one
 * value rather than two equal ones.
 */
const PARTICIPANT_ELECTION_VARIANTS = new Map();
function participantElectionVariants(familyId) {
  if (!PARTICIPANT_ELECTION_VARIANTS.has(familyId)) {
    PARTICIPANT_ELECTION_VARIANTS.set(familyId, Object.freeze(CA_ROUTE_VARIANTS[familyId]
      .map((variant) => Object.freeze({ ...variant, selections: Object.freeze([]) }))));
  }
  return PARTICIPANT_ELECTION_VARIANTS.get(familyId);
}

/*
 * The statutory controls a participant-election family hands to the participant,
 * flattened out of the declared variants. Returns [] for every family that does
 * not set the flag, so nothing changes for them.
 */
function participantElectionsForFamily(familyId) {
  if (!FAMILIES[familyId]?.participantMarksStatutoryElections) return [];
  return CA_ROUTE_VARIANTS[familyId].flatMap((variant) => variant.selections
    .map((selection) => ({ ...selection, variantId: variant.variantId, routeKey: variant.routeKey })));
}

function routeControlForFamily(familyId, variantId = null) {
  const declared = CA_ROUTE_VARIANTS[familyId];
  assert.ok(declared?.length, `${familyId}: no source-grounded statutory control variants`);
  const variants = FAMILIES[familyId]?.participantMarksStatutoryElections
    ? participantElectionVariants(familyId) : declared;
  if (variantId === null) return variants;
  const variant = variants.find((candidate) => candidate.variantId === variantId);
  assert.ok(variant, `${familyId}: unknown statutory control variant ${variantId}`);
  return variant;
}

function caPacketComponentPlan(familyId, config) {
  assert.equal(config.jurisdiction, "ca");
  const out = outputDir(familyId);
  const packets = [];
  for (const variant of routeControlForFamily(familyId)) {
    for (const fixture of ["canonical", "boundary"]) {
      const packetId = `${variant.variantId}-${fixture}`;
      packets.push({
        packetId, fixture, variantId: variant.variantId,
        routeKey: variant.routeKey, statute: variant.statute,
        documents: config.formNumbers.map((formNumber, packetIndex) => {
          const source = CA_FORMS[formNumber];
          const primary = formNumber === config.primaryForm;
          return {
            packetIndex: packetIndex + 1, formNumber,
            documentId: source.documentId, role: source.role,
            evidenceMode: primary ? "finalized_source_derived_primary" : "exact_official_unchanged_copy",
            file: `${out}/fixtures/${packetId}/${formNumber.toLowerCase()}-${primary ? "filled" : "unchanged-official"}.pdf`,
          };
        }),
      });
    }
  }
  return packets;
}

export function familyContract(familyId) {
  const family = requireFamily(familyId);
  return {
    familyId,
    jurisdiction: family.jurisdiction.toUpperCase(),
    outcome: family.outcome,
    routeKeys: [...family.routeKeys],
    ...GATES,
  };
}

function corpusRoot() {
  const value = process.env.MASTER_LIBRARY_SOURCE_DIR;
  if (!value) throw new Error("MASTER_LIBRARY_SOURCE_DIR must be set explicitly to the extracted Master Library");
  if (!path.isAbsolute(value)) throw new Error("MASTER_LIBRARY_SOURCE_DIR must be an absolute path");
  if (!fs.existsSync(value)) throw new Error(`MASTER_LIBRARY_SOURCE_DIR does not exist: ${value}`);
  return value;
}

function sourcesForFamily(family) {
  if (family.sources) return family.sources;
  return family.formNumbers.map((formNumber) => ({ formNumber, ...CA_FORMS[formNumber] }));
}

function resolveSources(familyId) {
  const family = requireFamily(familyId);
  const root = corpusRoot();
  const index = readJson(CORPUS_INDEX);
  const resolved = [];
  for (const source of sourcesForFamily(family)) {
    const indexEntry = (index.entries ?? []).find((entry) => entry.path === source.pathInCorpus);
    assert.ok(indexEntry, `${source.pathInCorpus} is absent from ${CORPUS_INDEX}`);
    assert.equal(indexEntry.sha256, source.sha256, `${source.formNumber}: index SHA mismatch`);
    assert.equal(indexEntry.byteLength, source.byteLength, `${source.formNumber}: index byte length mismatch`);
    const sourcePath = path.join(root, source.pathInCorpus);
    assert.ok(fs.existsSync(sourcePath), `${source.formNumber}: source absent at ${sourcePath}`);
    const bytes = fs.readFileSync(sourcePath);
    const recomputedSha256 = sha256(bytes);
    assert.equal(recomputedSha256, source.sha256, `${source.formNumber}: source SHA drift`);
    assert.equal(bytes.length, source.byteLength, `${source.formNumber}: source byte-length drift`);
    resolved.push({ source, indexEntry, sourcePath, bytes, recomputedSha256 });
  }
  return { root, resolved };
}

function sourceReceipt(familyId, resolved) {
  return {
    schemaVersion: "rcap-source-receipt/v1",
    familyId,
    sourceCorpus: {
      identity: "extracted Master Library supplied through MASTER_LIBRARY_SOURCE_DIR",
      rootBindingEnvironmentVariable: "MASTER_LIBRARY_SOURCE_DIR",
      absoluteRootPersisted: false,
      relativePathContract: "Every sources[].pathInCorpus value resolves beneath the run-bound corpus root.",
    },
    sourceCorpusIndex: CORPUS_INDEX,
    binding: "EXACT_RECOMPUTED",
    allSourcesExact: true,
    sources: resolved.map(({ source, indexEntry, bytes, recomputedSha256 }) => ({
      formNumber: source.formNumber,
      documentId: source.documentId,
      role: source.role ?? "primary_filing",
      pathInCorpus: source.pathInCorpus,
      pinnedSha256: source.sha256,
      corpusIndexSha256: indexEntry.sha256,
      recomputedSha256,
      pinnedByteLength: source.byteLength,
      corpusIndexByteLength: indexEntry.byteLength,
      recomputedByteLength: bytes.length,
      sha256Exact: recomputedSha256 === source.sha256,
      byteLengthExact: bytes.length === source.byteLength,
      structuralClassObserved: indexEntry.structuralClassObserved ?? null,
      indexLoadError: indexEntry.loadError ?? null,
    })),
  };
}

let discoveredPikepdfPython = null;
function pikepdfPythonCandidates() {
  return [...new Set([process.env.RCAP_PIKEPDF_PYTHON, process.env.PYTHON, "python3", "python"]
    .filter(Boolean))];
}

function discoverPikepdfPython() {
  if (discoveredPikepdfPython) return discoveredPikepdfPython;
  const attempts = [];
  for (const candidate of pikepdfPythonCandidates()) {
    if (path.isAbsolute(candidate) && !fs.existsSync(candidate)) {
      attempts.push(`${candidate}: missing`);
      continue;
    }
    const probe = spawnSync(candidate,
      ["-c", "import pikepdf; print(pikepdf.__version__); print(pikepdf.__libqpdf_version__)"],
      { cwd: rootDir, encoding: "utf8", timeout: 15_000,
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } });
    if (!probe.error && probe.status === 0) {
      discoveredPikepdfPython = candidate;
      return candidate;
    }
    attempts.push(`${candidate}: ${probe.error?.code ?? probe.status} ${String(probe.stderr ?? "").trim().slice(0, 160)}`);
  }
  throw new Error(`No Python on RCAP_PIKEPDF_PYTHON/PYTHON/PATH can import pikepdf. Attempts: ${attempts.join("; ")}`);
}

function runPikepdfBridge(request) {
  const python = discoverPikepdfPython();
  const result = spawnSync(python, ["-c", PIKEPDF_BRIDGE, JSON.stringify(request)], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout: 120_000,
    env: {
      ...process.env,
      PYTHONDONTWRITEBYTECODE: "1",
    },
  });
  assert.equal(result.status, 0,
    `pikepdf bridge failed (${result.status}): ${String(result.stderr || result.stdout).slice(0, 4000)}`);
  const parsed = JSON.parse(String(result.stdout).trim());
  assert.ok(parsed.reader?.pikepdfVersion, "pikepdf bridge omitted its version");
  assert.ok(parsed.reader?.libqpdfVersion, "pikepdf bridge omitted its libqpdf version");
  return parsed;
}

function caBridgeRequest(familyId, config, resolved, mode) {
  const out = outputDir(familyId);
  return {
    mode,
    writeScratch: mode === "create",
    scratchDir: mode === "create" ? abs(`${out}/reports/official-content-streams`) : null,
    targets: resolved.map(({ source, sourcePath }) => ({
      formNumber: source.formNumber,
      sourcePath,
      sha256: source.sha256,
      derivedPath: source.formNumber === config.primaryForm
        ? abs(`${out}/derived-sources/${source.formNumber.toLowerCase()}-pikepdf-unlocked.pdf`)
        : null,
    })),
  };
}

function readOnlyVerifyRequest(familyId, config, resolved) {
  const request = caBridgeRequest(familyId, config, resolved, "verify");
  assert.equal(request.writeScratch, false);
  assert.equal(request.scratchDir, null);
  return request;
}

function normalizeDerivativeRecords(records) {
  return records.map((record) => ({
    ...record,
    sourcePath: path.relative(corpusRoot(), record.sourcePath),
    derivedPath: path.relative(rootDir, record.derivedPath),
  }));
}

function enhancedFidelityContract(record) {
  const comparison = record.comparison ?? {};
  assert.equal(record.sourceUnchanged, true, `${record.formNumber}: exact source changed during repair`);
  assert.equal(record.derivedEncrypted, false, `${record.formNumber}: derived transport remains encrypted`);
  assert.equal(comparison.pageGeometryIdentical, true, `${record.formNumber}: page geometry changed`);
  assert.equal(comparison.originalPageContentStreamsIdentical, true,
    `${record.formNumber}: original page content streams changed`);
  assert.equal(comparison.terminalFieldTreeAndWidgetsIdentical, true,
    `${record.formNumber}: reduced terminal field/widget comparison changed`);
  assert.equal(comparison.enhancedTerminalSemanticsIdentical, true,
    `${record.formNumber}: names/types/flags/options/values/widgets/AP states or XFA changed`);
  assert.equal(comparison.officialEnhancedSemanticsSha256,
    comparison.derivedEnhancedSemanticsSha256,
    `${record.formNumber}: enhanced semantic digests differ`);
  assert.equal(comparison.officialXfa?.present, comparison.derivedXfa?.present,
    `${record.formNumber}: XFA presence changed`);
  assert.equal(comparison.officialXfa?.sha256, comparison.derivedXfa?.sha256,
    `${record.formNumber}: XFA digest changed`);
  assert.deepEqual(comparison.enhancedSemanticsDelta, {
    fieldsOnlyInOfficial: [], fieldsOnlyInDerivative: [], fieldDifferences: [], xfaIdentical: true,
  }, `${record.formNumber}: enhanced semantic delta is not empty`);
  assert.equal(comparison.equivalent, true, `${record.formNumber}: derivative is not source-equivalent`);
  return true;
}

function caPdfType(field) {
  if (field.fieldType === "/Tx") return "text";
  if (field.fieldType === "/Btn") {
    if (field.flags?.includes("pushButton")) return "pushbutton";
    if (field.flags?.includes("radio")) return "radio";
    return "checkbox";
  }
  if (field.fieldType === "/Ch") return field.flags?.includes("combo") ? "dropdown" : "optionlist";
  if (field.fieldType === "/Sig") return "signature";
  return "other";
}

function caFinalizerCensus(formCensus) {
  return formCensus.fields.map((field) => ({
    name: field.name,
    type: caPdfType(field),
    effectiveLabel: CA_EXACT_SEMANTIC_LABELS[field.name]
      ?? field.tooltip ?? field.shortName ?? field.name,
    sourceEffectiveLabel: field.tooltip ?? field.shortName ?? field.name,
    semanticLabelBasis: CA_EXACT_SEMANTIC_LABELS[field.name]
      ? "exact_terminal_name_participant_stated_subject" : "exact_source_field_metadata",
    regionHeading: null,
    multiline: field.flags?.includes("multiline") === true,
    maxLength: field.maxLen,
    widgets: field.widgets.map((widget) => ({
      page: widget.pageIndex + 1,
      rect: {
        x: round(widget.rect[0]),
        y: round(widget.rect[1]),
        width: round(widget.rect[2] - widget.rect[0]),
        height: round(widget.rect[3] - widget.rect[1]),
      },
      rectBasis: "terminal widget /Rect read first-hand from the exact official binary by pikepdf",
    })),
  }));
}

/*
 * The typed completeness declaration for one refused terminal field.
 *
 * The packet-completeness contract reads TYPED channels, never prose: a
 * refusal earns its blankness through `requiredBeforeFiling`,
 * `routeDetermined`, `isSelectionControl` and `refusalClass`, or through a
 * reason string on the contract's own approved list. The prose-only reasons
 * this host used to emit classified as UNCLASSIFIED_BLANK (or, worse, as
 * policy-shaped KNOWN_FACT findings), which is how a correctly refused blank
 * still failed the audit. The classifications below reproduce the reviewed
 * FIX-A declaration layer that vf17 verified on ca-851-91-set and
 * ca-1203-42-set (committed field maps at the pre-repair HEAD), extended to
 * the sibling CA families that share the same four-form packet shape.
 */
function caRefusalDisposition(source, field) {
  const subject = `${field.name} ${field.tooltip ?? ""}`;
  const pushButton = field.fieldType === "/Btn" && field.flags?.includes("pushButton") === true;
  const markControl = field.fieldType === "/Btn" && !pushButton;
  const requiredBeforeFiling = (reason) => ({
    reason: `REQUIRED_BEFORE_FILING: ${reason} The participant completes it, and the platform does not guess.`,
    blankTreatment: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true,
    routeDetermined: false,
    identity: field.name,
  });

  if (pushButton) {
    return { reason: "Viewer UI control; never a filing fact." };
  }
  if (source.role === "proposed_order") {
    if (!markControl && /report number/i.test(subject)) {
      // The agency and prosecutor report numbers on the proposed order are the
      // participant's to copy from their own records; everything else on the
      // order is the court's, front to back.
      return requiredBeforeFiling("the participant copies this report number from their own records before filing; the rest of the proposed order is the court's.");
    }
    return {
      reason: "The proposed order is court-owned; every order field is left for the court.",
      refusalClass: "court_prosecutor_clerk_or_agency_owned",
      ...(markControl ? { isSelectionControl: true } : {}),
    };
  }
  if (source.role === "proof_of_service") {
    if (/signature|sig(?:name|date)/i.test(subject)) {
      return {
        reason: "Proof-of-service and mailing-certificate fields describe service that has not occurred; the packet builder never completes them. Signature and signature date are completed by the participant at the moment of signing and are never prefilled.",
        refusalClass: "signature_or_date_participant_completion",
      };
    }
    if (markControl) {
      return {
        reason: "A control the participant marks. The platform never marks an election on a sworn filing; the participant instructions name it and the participant marks it before signing.",
        refusalClass: "participant_sworn_narrative_or_legal_election",
        isSelectionControl: true,
      };
    }
    if (/\btime\b/i.test(subject)) {
      // Completed at the moment of service, not before; the label's own
      // wording classifies it as later completion.
      return { reason: "Proof-of-service and mailing-certificate fields describe service that has not occurred; the packet builder never completes them." };
    }
    if (/attorney|atty(?![a-z])|lawyer|\bbar\b|bar number|\bfirm\b/i.test(subject)) {
      // The caption's attorney block is not the participant's to complete;
      // declaring it required-before-filing would hand a lawyer-only field to
      // the participant.
      return { reason: "Attorney-only field; never populated with participant data." };
    }
    return requiredBeforeFiling("Proof-of-service and mailing-certificate fields describe service that has not occurred; the packet builder never completes them.");
  }
  if (source.role === "supporting_declaration") {
    if (markControl) {
      return {
        reason: "A control the participant marks. The platform never marks an election on a sworn filing; the participant instructions name it and the participant marks it before signing.",
        refusalClass: "participant_sworn_narrative_or_legal_election",
        isSelectionControl: true,
      };
    }
    return requiredBeforeFiling("No verified declaration narrative or signed declaration act is held; every declaration field is left to the declarant.");
  }
  // ---- primary filing ----------------------------------------------------
  if (markControl) {
    return {
      reason: "A control the participant marks. The platform never marks an election on a sworn filing; the participant instructions name it and the participant marks it before signing.",
      refusalClass: "participant_sworn_narrative_or_legal_election",
      isSelectionControl: true,
    };
  }
  if (/eligible for reduction/i.test(field.tooltip ?? "")) {
    // The CR-180 conviction table's 17(b)/17(d)(2) yes-or-no cells. Only the
    // ca-17b-reduction routes determine them; on every other route the
    // election is honestly declared route-determined and unmade, which the
    // completeness contract counts as requiredOptionsMissing until a
    // captain-level field-classification determination (or a per-election
    // evidence-variant design) resolves who answers these cells on dismissal
    // routes. Declaring them participant-completable instead would be the
    // exact self-excuse channel the contract closed.
    return {
      reason: "The Penal Code section 17(b)/17(d)(2) reduction election belongs to the ca-17b-reduction family's routes; this family's route does not determine it and the platform never infers it.",
      routeDetermined: true,
    };
  }
  if (/signature|sig(?:name|date)?/i.test(subject)) {
    return {
      reason: "Signature or signature-date field; never prefilled before the participant signs.",
      refusalClass: "signature_or_date_participant_completion",
    };
  }
  if (/attorney|atty|lawyer|bar\b|firm\b/i.test(subject)) {
    return { reason: "Attorney-only field; never populated with participant data." };
  }
  // CrtUse is the XFA name of the caption's FOR COURT USE ONLY stamp region
  // (CR-180's clerk date/stamp cells live under P1Caption.HeaderSub.CrtUse).
  if (/court|crtuse|judge|clerk|department|hearing|prosecutor|agency|law enforcement/i.test(subject)) {
    return { reason: "Court, clerk, prosecutor, agency, or hearing field; never prefilled." };
  }
  if (field.flags?.includes("readOnly")) {
    return { reason: "Read-only source field; never overridden." };
  }
  if (/date\b|\bday\b|\bmonth\b|\byear\b/i.test(subject)) {
    return requiredBeforeFiling("no exact source-supported date fact is held for this terminal field; surface it to the participant and do not guess.");
  }
  return requiredBeforeFiling("the platform holds no exact fact for this terminal field; surface the field to the participant and do not guess.");
}

function caMapAndCensus(familyId, config, bridge) {
  const documents = [];
  const writes = [];
  const selections = [];
  const refusals = [];
  const primaryMappings = CA_PRIMARY_WRITES[config.primaryForm];
  assert.ok(primaryMappings, `${config.primaryForm}: no bounded primary mapping`);
  const variants = routeControlForFamily(familyId);
  assert.deepEqual([...new Set(variants.map((variant) => variant.routeKey))].sort(),
    [...config.routeKeys].sort(), `${familyId}: route variants do not cover the configured routes`);
  const textControls = new Map();
  const selectionControls = new Map();
  for (const variant of variants) {
    for (const [fieldName, factId] of Object.entries(variant.textControls)) {
      const row = textControls.get(fieldName) ?? { fieldName, factId, variants: [] };
      assert.equal(row.factId, factId, `${fieldName}: route text-control fact conflict`);
      row.variants.push({ variantId: variant.variantId, value: variant.controlFacts[factId] });
      textControls.set(fieldName, row);
    }
    for (const selection of variant.selections) {
      const row = selectionControls.get(selection.fieldName) ?? {
        fieldName: selection.fieldName, variants: [],
      };
      row.variants.push({ variantId: variant.variantId, routeKey: variant.routeKey,
        onState: selection.onState, tooltipIncludes: selection.tooltipIncludes });
      selectionControls.set(selection.fieldName, row);
    }
  }
  // Empty for every family that does not set participantMarksStatutoryElections.
  const participantElectionControls = new Map();
  for (const election of participantElectionsForFamily(familyId)) {
    const row = participantElectionControls.get(election.fieldName)
      ?? { fieldName: election.fieldName, variants: [] };
    row.variants.push({ variantId: election.variantId, routeKey: election.routeKey,
      onState: election.onState, tooltipIncludes: election.tooltipIncludes });
    participantElectionControls.set(election.fieldName, row);
  }

  for (const formNumber of config.formNumbers) {
    const source = CA_FORMS[formNumber];
    const form = bridge.forms[formNumber];
    assert.ok(form, `${formNumber}: pikepdf census missing`);
    const mappedNames = new Set();
    const fieldRows = form.fields.map((field) => {
      const baseFactId = formNumber === config.primaryForm ? primaryMappings[field.name] ?? null : null;
      const textControl = formNumber === config.primaryForm ? textControls.get(field.name) ?? null : null;
      const selectionControl = formNumber === config.primaryForm ? selectionControls.get(field.name) ?? null : null;
      const participantElection = formNumber === config.primaryForm
        ? participantElectionControls.get(field.name) ?? null : null;
      const base = {
        formNumber, documentId: source.documentId, documentRole: source.role,
        fieldName: field.name, fieldType: field.fieldType,
        effectiveLabel: field.tooltip ?? field.shortName ?? null,
        flags: field.flags, maxLen: field.maxLen, widgets: field.widgets,
      };
      if (baseFactId || textControl) {
        mappedNames.add(field.name);
        const factId = baseFactId ?? textControl.factId;
        const row = { ...base, disposition: "WRITE", factId,
          appliesToVariants: baseFactId ? variants.map((variant) => variant.variantId)
            : textControl.variants.map((variant) => variant.variantId),
          variantValues: textControl?.variants ?? null,
          routeSpecific: Boolean(textControl),
          reason: textControl
            ? "Exact CR-180 statutory text control is populated only in the named evidence variants with the recorded yes/no value."
            : "Exact primary-form terminal field explicitly mapped to a source-supported participant or matter fact the platform holds." };
        writes.push(row);
        return row;
      }
      if (selectionControl) {
        mappedNames.add(field.name);
        assert.equal(field.fieldType, "/Btn", `${field.name}: statutory selection is not a button`);
        assert.equal(field.flags?.includes("pushButton"), false, `${field.name}: statutory selection is a push button`);
        for (const variant of selectionControl.variants) {
          assert.ok(String(field.tooltip ?? "").includes(variant.tooltipIncludes),
            `${field.name}: statutory tooltip no longer identifies ${variant.tooltipIncludes}`);
          assert.ok(field.widgets.some((widget) => widget.onStates?.includes(variant.onState)),
            `${field.name}: exact AP/N on-state ${variant.onState} is absent`);
        }
        const row = { ...base, disposition: "SELECT", factId: "route.statutory_control",
          routeSpecific: true, variantSelections: selectionControl.variants,
          reason: "The named evidence variant marks this exact, first-hand widget rectangle; its recorded AP/N on-state proves the official control identity." };
        selections.push(row);
        return row;
      }
      if (participantElection) {
        mappedNames.add(field.name);
        assert.equal(field.fieldType, "/Btn", `${field.name}: statutory election is not a button`);
        assert.equal(field.flags?.includes("pushButton"), false, `${field.name}: statutory election is a push button`);
        for (const variant of participantElection.variants) {
          assert.ok(String(field.tooltip ?? "").includes(variant.tooltipIncludes),
            `${field.name}: statutory tooltip no longer identifies ${variant.tooltipIncludes}`);
          assert.ok(field.widgets.some((widget) => widget.onStates?.includes(variant.onState)),
            `${field.name}: exact AP/N on-state ${variant.onState} is absent`);
        }
        const row = { ...base, disposition: "REFUSE", factId: null,
          isSelectionControl: true,
          refusalClass: "participant_sworn_narrative_or_legal_election",
          blankTreatment: "REQUIRED_BEFORE_FILING",
          requiredBeforeFiling: true,
          routeDetermined: false,
          routeSpecific: true,
          participantElectionVariants: participantElection.variants,
          reason: "A statutory election on a petition the participant verifies under penalty of perjury. The route does not determine it -- both variants carry the same route key -- and the committed packet-set manifest assigns it to the participant as a required-before-filing act, so the platform marks nothing here and the participant page names the box." };
        refusals.push(row);
        return row;
      }
      const disposition = caRefusalDisposition(source, field);
      const row = { ...base, disposition: "REFUSE", factId: null,
        blankTreatment: disposition.blankTreatment ?? null,
        ...disposition };
      refusals.push(row);
      return row;
    });
    if (formNumber === config.primaryForm) {
      assert.deepEqual([...mappedNames].sort(), [...new Set([
        ...Object.keys(primaryMappings), ...textControls.keys(), ...selectionControls.keys(),
        ...participantElectionControls.keys(),
      ])].sort(),
        `${formNumber}: one or more bounded mapping names drifted`);
    }
    documents.push({
      formNumber, documentId: source.documentId, role: source.role,
      pinnedOfficialSha256: source.sha256,
      evidenceMode: formNumber === config.primaryForm
        ? "finalized_source_derived_primary" : "exact_official_unchanged_copy",
      pageCount: form.pageCount, terminalFieldCount: form.terminalFieldCount,
      acroForm: form.acroForm, pages: form.pages, fields: form.fields,
      dispositions: fieldRows,
    });
  }

  const total = documents.reduce((sum, document) => sum + document.terminalFieldCount, 0);
  return {
    documents,
    fieldMap: {
      schemaVersion: "rcap-production-field-map/v1", familyId,
      routeKeys: [...config.routeKeys], renderStrategy: "pikepdf_unlocked_derivative_then_official_form_finalizer",
      primaryForm: config.primaryForm,
      measurementSurface: "exact official encrypted binaries",
      derivativesUsedForMeasurement: false,
      explicitMappingsByVariant: Object.fromEntries(variants.map((variant) => [variant.variantId, {
        ...primaryMappings, ...variant.textControls,
      }])),
      statutorySelectionsByVariant: Object.fromEntries(variants.map((variant) => [variant.variantId,
        variant.selections.map((selection) => ({ ...selection }))])),
      // Present only for a family that withdraws its marks: which control each
      // variant corresponds to, recorded so the election is still identifiable
      // per route without any ink being added to the sworn filing.
      ...(config.participantMarksStatutoryElections
        ? { participantElectionsByVariant: Object.fromEntries(CA_ROUTE_VARIANTS[familyId]
          .map((variant) => [variant.variantId, variant.selections.map((selection) => ({ ...selection }))])) }
        : {}),
      ...GATES, writes, selections, refusals,
      coverage: {
        terminalFields: total, writes: writes.length, selections: selections.length,
        refusals: refusals.length, unmapped: total - writes.length - selections.length - refusals.length,
      },
      dispositionVocabulary: "rcap-packet-completeness/closed-blank-dispositions",
      requiredBeforeFilingCount: refusals.filter((row) => row.requiredBeforeFiling === true).length,
    },
  };
}

function underscoreRunsOf(line) {
  const runs = [];
  let current = null;
  for (const character of line.chars ?? []) {
    if (character.c === "_") {
      if (!current) current = { x0: character.x, x1: character.x + character.w, glyphCount: 1 };
      else { current.x1 = character.x + character.w; current.glyphCount += 1; }
    } else if (current) { runs.push(current); current = null; }
  }
  if (current) runs.push(current);
  return runs;
}

function bracketPairsOf(line) {
  const pairs = [];
  const chars = line.chars ?? [];
  for (let index = 0; index < chars.length; index += 1) {
    if (chars[index].c !== "[") continue;
    let closeIndex = index + 1;
    while (closeIndex < chars.length && chars[closeIndex].c !== "]") closeIndex += 1;
    if (closeIndex >= chars.length) continue;
    const interior = chars.slice(index + 1, closeIndex).map((char) => char.c).join("");
    if (interior.trim() !== "") {
      index = closeIndex;
      continue;
    }
    const close = chars[closeIndex];
    pairs.push({
      x0: round(chars[index].x), x1: round(close.x + close.w),
      baselineY: round(line.y), printedFontSize: round(line.size),
    });
    index = closeIndex;
  }
  return pairs;
}

function controlPrefix(lineText, page) {
  const text = normalizeHarvestedText(lineText);
  if (page === 1 && text.includes("two and one-half ounces")) return "eligible-charge-possession-limit";
  if (page === 1 && text.includes("not more than six marijuana plants")) return "eligible-charge-six-plants";
  if (page === 1 && text.includes("paraphernalia related")) return "eligible-charge-paraphernalia";
  if (text.includes("began in a Justice Court")) return "justice-court";
  if (text.includes("convicted of the offense")) return "convicted";
  if (text.includes("non-eligible charges")) return "non-eligible-charges-filed";
  if (text.includes("sentence included a term of probation")) return "probation";
  if (text.includes("case was dismissed")) return "dismissed";
  if (text.includes("outstanding arrest warrant")) return "outstanding-warrant";
  if (text.includes("active payment plan")) return "active-payment-plan";
  if (text.includes("request a hearing")) return "hearing-request";
  return null;
}

function decodedPageContent(pdf, page) {
  const contents = page.node.normalizedEntries?.().Contents;
  const refs = contents?.asArray?.() ?? (contents ? [contents] : []);
  let output = "";
  for (const ref of refs) {
    const stream = pdf.context.lookup(ref);
    if (!(stream instanceof PDFRawStream)) continue;
    try { output += Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1"); }
    catch { /* recorded as a zero decoded-byte contribution */ }
  }
  return output;
}

async function measureAzDocument(bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  assert.equal(pages.length, AZ_SOURCE.pageCount, "AOC-CREM3F page count changed");
  assert.equal(pdf.getForm().getFields().length, 0, "AOC-CREM3F is no longer flat");
  const underscoreCandidates = [];
  const pageRecords = [];
  const controlCandidates = [];
  const documentTextLines = [];

  for (const [pageIndex, page] of pages.entries()) {
    const pageNumber = pageIndex + 1;
    const lines = groupIntoLines(extractTextItems(page));
    for (const line of lines) {
      documentTextLines.push(normalizeHarvestedText(line.text));
      for (const run of underscoreRunsOf(line)) {
        underscoreCandidates.push({
          page: pageNumber, construction: "underscore_leader_run",
          x0: round(run.x0), x1: round(run.x1), baselineY: round(line.y),
          width: round(run.x1 - run.x0), glyphCount: run.glyphCount,
          printedLine: normalizeHarvestedText(line.text),
          printedFontSize: round(line.size), metricsExact: line.metricsExact === true,
        });
      }
      const pairs = bracketPairsOf(line);
      if (pairs.length) {
        const prefix = controlPrefix(line.text, pageNumber);
        assert.ok(prefix, `unclassified bracket control line on page ${pageNumber}: ${line.text}`);
        pairs.forEach((pair, index) => {
          const suffix = pairs.length === 1 ? "selection" : index === 0 ? "yes" : "no";
          controlCandidates.push({
            controlId: `${prefix}-${suffix}`, page: pageNumber,
            construction: "printed_bracket_glyph_pair", measured: pair,
            printedLine: normalizeHarvestedText(line.text), disposition: "REFUSED",
            role: "participant_legal_election_or_conditional_fact",
            /*
             * FIX01/RT-1. This used to give the reason as a statement of build
             * policy -- "the shared semantics never writes a checkbox/radio
             * election" -- which is a fact about this builder and not a reason
             * a blank on a sworn petition is allowed to be blank, so the
             * completeness contract read all nineteen as
             * ROUTE_OPTION_NOT_SELECTED. They are not route options. Each is a
             * statement about the petitioner's own conduct, sworn by the
             * petitioner, and neither AZ route determines which of them is
             * true. The row now declares that.
             */
            reason: "A sworn election on the petitioner's own record. The route this packet is built for does not "
              + "determine it, and the platform never marks a box the petitioner swears to; the participant "
              + "instructions name this election and the petitioner marks it before signing.",
            refusalClass: "participant_sworn_narrative_or_legal_election",
            completenessDisposition: "PARTICIPANT_ELECTION_GENUINE",
            routeDetermined: false,
            isSelectionControl: true,
          });
        });
      }
    }
    const pathRules = rulesOfPage(page, { maxThickness: 3, minLength: 20, minDividerLength: 20 });
    const decodedContent = decodedPageContent(pdf, page);
    const ctmBoxes = decodedContent ? strokedRectangles(decodedContent) : [];
    const { width, height } = page.getSize();
    pageRecords.push({
      page: pageNumber,
      geometry: { width: round(width), height: round(height), rotate: page.getRotation().angle },
      extractedTextLines: lines.length,
      decodedContentBytes: Buffer.byteLength(decodedContent, "latin1"),
      ctmStrokedRectangles: ctmBoxes,
      horizontalRules: pathRules.horizontal,
      verticalRules: pathRules.vertical,
    });
  }

  assert.equal(underscoreCandidates.length, 26, "AOC-CREM3F underscore-blank count changed");
  assert.equal(controlCandidates.length, 19, "AOC-CREM3F printed control count changed");

  const measuredFields = AZ_FIELD_SPECS.map((spec) => {
    const candidates = spec.construction === "underscore_leader_run"
      ? underscoreCandidates
      : pageRecords[spec.page - 1].horizontalRules.map((rule) => ({
        page: spec.page, construction: "drawn_rule",
        x0: round(rule.x), x1: round(rule.endX), baselineY: round(rule.y),
        width: round(rule.width), glyphCount: null, printedLine: spec.sourceLabel,
        printedFontSize: 11.2, metricsExact: true,
        pathOperator: rule.operator, paintedBy: rule.paintedBy,
      }));
    const match = candidates.find((candidate) =>
      candidate.page === spec.page
      && Math.abs(candidate.x0 - spec.x0) <= 0.06
      && Math.abs(candidate.x1 - spec.x1) <= 0.06
      && Math.abs(candidate.baselineY - spec.baselineY) <= 0.06);
    assert.ok(match, `${spec.id}: exact first-hand blank measurement not found`);
    return {
      fieldId: spec.id, page: spec.page, sourceLabel: spec.sourceLabel,
      semanticLabel: spec.semanticLabel, role: spec.role,
      measured: {
        construction: match.construction, x0: match.x0, x1: match.x1,
        baselineY: match.baselineY, width: match.width,
        glyphCount: match.glyphCount, printedFontSize: match.printedFontSize,
        metricsExact: match.metricsExact, pathOperator: match.pathOperator ?? null,
        paintedBy: match.paintedBy ?? null,
        geometrySource: match.construction === "drawn_rule"
          ? "CTM-tracked page path from scripts/rcap-official-forms/rcap-pdf-rule-lines.mjs"
          : "underscore glyph run from scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs",
      },
      printedLine: match.printedLine,
    };
  });

  const measuredUnderscoreIds = new Set(
    measuredFields.filter((field) => field.measured.construction === "underscore_leader_run")
      .map((field) => `${field.page}|${field.measured.x0}|${field.measured.x1}|${field.measured.baselineY}`),
  );
  for (const candidate of underscoreCandidates) {
    assert.ok(
      measuredUnderscoreIds.has(`${candidate.page}|${candidate.x0}|${candidate.x1}|${candidate.baselineY}`),
      `uncensused underscore blank at page ${candidate.page}, x=${candidate.x0}, y=${candidate.baselineY}`,
    );
  }
  assert.equal(measuredFields.length, 31, "AOC-CREM3F semantic blank count changed");
  return { documentTextLines, pages: pageRecords, fields: measuredFields, controls: controlCandidates };
}

function azDisposition(config, field) {
  const spec = AZ_FIELD_SPECS.find((candidate) => candidate.id === field.fieldId);
  assert.ok(spec, `missing AZ field specification for ${field.fieldId}`);
  if (spec.writeFor?.includes(config.variant)) {
    return {
      disposition: "WRITE", factId: spec.factId,
      routeSpecific: spec.writeFor !== BOTH_AZ_VARIANTS,
      reason: "Participant or matter fact explicitly mapped for this route.",
    };
  }
  /*
   * FIX01/RT-1. A blank the participant must fill has to DECLARE it: the
   * completeness contract reads requiredBeforeFiling, an identity and a printed
   * label, and never reads prose. These rows carried prose only -- and prose
   * shaped like build policy at that -- so five of them were counted as known
   * facts the packet failed to write. `participantMustSupply` on the spec is
   * the declaration, and it also supplies the words the participant reads.
   */
  if (spec.participantMustSupply) {
    return {
      disposition: "REFUSE", factId: null, routeSpecific: Boolean(spec.writeFor),
      reason: `The platform holds no value for this and the participant supplies it before filing: ${spec.participantMustSupply}.`,
      completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true,
      routeDetermined: false,
      participantMustSupply: spec.participantMustSupply,
    };
  }
  return {
    disposition: "REFUSE", factId: null, routeSpecific: Boolean(spec.writeFor),
    blankTreatment: spec.blankTreatment ?? null,
    reason: spec.refusal
      ?? "REQUIRED_BEFORE_FILING: the platform holds no exact fact for this blank; surface it to the participant and do not guess.",
  };
}

function westParticipantInstructions(familyId, fieldMap) {
  const required = [...new Map((fieldMap.refusals ?? [])
    .filter((field) => field.requiredBeforeFiling === true || field.blankTreatment === "REQUIRED_BEFORE_FILING")
    .map((field) => {
      const id = field.fieldId ?? field.fieldName;
      const label = field.sourceLabel ?? field.effectiveLabel ?? id;
      return [id, label];
    })).entries()]
    .map(([field, label]) => `- ${label} (source field: \`${field}\`)`)
    .join("\n");
  return `# Participant and reviewer instructions\n\n`
    + `Packet family: \`${familyId}\`\n\n`
    + `This is a review artifact and is not approved for filing or commercial use.\n\n`
    + `## Exact facts still required before filing\n\n`
    + (required
      ? `The platform does not hold the facts below. Supply and verify each applicable item before filing; the build does not guess them.\n\n${required}\n`
      : "No required-before-filing fact gaps were recorded by this field map.\n")
    + `\nSignatures, signature dates, service acts, court/clerk entries, attorney-only fields, and unmade participant elections remain for their proper owner or event.\n`;
}

/*
 * Per-family participant guidance, modeled on the reviewed FIX-A instructions
 * verified by vf17 on ca-851-91-set and ca-1203-42-set. Nothing here is
 * invented: no fee figure, address, or service recipe originates in this file.
 *
 * The house standard USED to be blanket delegation to a named checkable
 * authority -- the clerk of the Superior Court in the named county -- for the
 * fee, the waiver, service and the filing address alike. Amendment A2 of
 * DETERMINATION_FEE_AND_WAIVER_STANDARD.json ends that for any family whose
 * committed packet-set manifest answers those questions, and answers VT8's
 * question C4 by holding that a manifest's participantActionRequired entries
 * are a held source exactly as the track registry is. Delegating a question
 * the repository has already answered substitutes a question for an answer we
 * have.
 *
 * `statesHeldParticipantActions` opts a family into reading its own manifest
 * entries instead. It is a per-family flag rather than a host-wide switch for
 * one reason only: every other California family on this host carries the same
 * defect and the same fix, but this worker holds a repair claim on
 * ca-851-91-set alone, and rewriting seven unclaimed families' participant
 * instructions as a side effect of one repair is not this lane's to do. The
 * mechanism is general and the remaining families need only the flag once
 * their repairs are claimed -- recorded for the Captain in the lane return.
 */
const CA_PARTICIPANT_GUIDANCE = Object.freeze({
  "ca-1203-41-set": Object.freeze({
    title: "Penal Code section 1203.41 dismissal",
    countyOf: "conviction", orderForm: "CR-181", orderName: "order for dismissal",
    primaryName: "CR-180 (Petition for Dismissal)",
  }),
  "ca-1203-42-set": Object.freeze({
    title: "Penal Code section 1203.42 dismissal",
    countyOf: "conviction", orderForm: "CR-181", orderName: "order for dismissal",
    primaryName: "CR-180 (Petition for Dismissal)",
  }),
  "ca-1203-43-set": Object.freeze({
    title: "Penal Code section 1203.43 dismissal",
    countyOf: "conviction", orderForm: "CR-181", orderName: "order for dismissal",
    primaryName: "CR-180 (Petition for Dismissal)",
  }),
  "ca-1203-4a-set": Object.freeze({
    title: "Penal Code section 1203.4a dismissal",
    countyOf: "conviction", orderForm: "CR-181", orderName: "order for dismissal",
    primaryName: "CR-180 (Petition for Dismissal)",
  }),
  "ca-17b-reduction-set": Object.freeze({
    title: "Penal Code section 17(b)/17(d)(2) reduction",
    countyOf: "conviction", orderForm: "CR-181", orderName: "order for dismissal",
    primaryName: "CR-180 (Petition for Dismissal)",
  }),
  "ca-851-91-set": Object.freeze({
    title: "Penal Code section 851.91 petition to seal an arrest record",
    countyOf: "arrest", orderForm: "CR-410", orderName: "order to seal",
    primaryName: "CR-409 (Petition to Seal Arrest and Related Records)",
    reliefQuestion: "whether your arrest qualifies to be sealed",
    // See statesHeldParticipantActions below. Opted in because this family's
    // repair is claimed.
    statesHeldParticipantActions: true,
    /*
     * FIX04, REQUIRED_BEFORE_FILING. Four of this manifest's ten
     * required-before-filing items were absent from the packet in any form,
     * including both of the two that send the participant out to obtain a
     * record they will not otherwise have and the verification under penalty of
     * perjury that section 851.91 turns on. The manifest is a held source under
     * A2 and A4's onTheWiderQuestion reaches an omission of what the repository
     * establishes, so the acts are printed in the manifest's own words.
     */
    statesManifestPreFilingActs: true,
    /*
     * FIX04, SELF_HELP_STOP. Five of the six conditions the committed track
     * registry holds for trackId ca-851-91 were absent from the packet, the
     * missing one that matters most being the section 851.91(c)(2)(A)
     * pattern-offence bar that decides which of this family's two item 3h
     * elections is open at all.
     */
    statesRegistryStopConditions: "ca-851-91",
    electionItem: "item 3h",
  }),
  "ca-prop64-set": Object.freeze({
    title: "Health and Safety Code section 11361.8 (Proposition 64) relief",
    countyOf: "conviction", orderForm: "CR-403", orderName: "order after petition",
    primaryName: "CR-400 (Petition/Application under Health and Safety Code section 11361.8)",
    reliefQuestion: "whether your conviction qualifies for Proposition 64 relief",
    // Opted in for this family because its repair is claimed. Its manifest
    // holds the filing destination and the service recipient, and the packet
    // was denying both.
    statesHeldParticipantActions: true,
    // A3. The manifest's pay_fee entry for this family records only that the
    // source review does not state a fee for the CR-400 series -- a statement
    // of NON-establishment, which A1 forbids publishing as the answer. The
    // answer is in the compiled California profile, and it is keyed to this
    // route by name. See caHeldRouteFee.
    heldRouteFee: Object.freeze({
      routeToken: "Prop 64",
      amount: "$0",
      keyedTo: "Proposition 64 marijuana relief, Health and Safety Code section 11361.8",
    }),
  }),
});

const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";
const TRACK_REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const CA_COMPILED_PROFILE = "src/lib/rcap-engine/compiled/profiles/CA-california.json";

/*
 * The route tokens California's one fee table keys its lines to.
 *
 * The table covers several remedies at once, so a line is evidence about the
 * remedy it names and about no other. This list is what "another route" means
 * to caHeldRouteFee: any line carrying a token that is not the asking family's
 * own is discarded before an amount is read out of it, however plainly the
 * amount is printed there.
 */
const CA_FEE_TABLE_ROUTE_TOKENS = Object.freeze([
  "1203.4", "1203.425", "851.91", "851.93", "Prop 64", "17(b)", "17(d)",
]);

/*
 * The filing fee this route's own record establishes, or null.
 *
 * A3 of DETERMINATION_FEE_AND_WAIVER_STANDARD.json: holding is per FACT, not
 * per document. A2 made the compiled state profile a held source without
 * qualification, and California's profile carries ONE fee table spanning
 * several statutes -- "Prop 64 marijuana relief $0" three columns from "1203.4
 * dismissal petition ~$60-$150 per case". Read per document, the profile would
 * license publishing the 1203.4 figure as the fee for 1203.41, 1203.42,
 * 1203.43, 1203.4a or 17(b), which is the sibling-route inference A2's own
 * whatDoesNotCount forbids.
 *
 * So a family does not get "the profile". It declares the token its own route
 * is named by, and this reader will only ever return a line that carries that
 * token and carries no other route's token. A family that declares nothing
 * gets nothing: heldRouteFee absent returns null and the caller falls back to
 * naming a checkable authority, which A3 records as the honest outcome for the
 * 1203.4x siblings rather than a defect to repair away.
 *
 * The guards are the point, so they are assertions rather than filters that
 * fail quietly:
 *   - at least one line names this route, carries no other route's token, and
 *     states the declared amount;
 *   - no line naming only this route states any other money figure, so the
 *     record cannot be answering two ways at once.
 */
function caHeldRouteFee(guidance) {
  const rule = guidance.heldRouteFee;
  if (!rule) return null;
  const profile = readJson(CA_COMPILED_PROFILE);
  const feeRules = profile.packetGenerator?.feeRules ?? [];
  assert.ok(feeRules.length, "the compiled California profile states no fee rules");
  const foreign = CA_FEE_TABLE_ROUTE_TOKENS.filter((token) => token !== rule.routeToken);
  assert.ok(foreign.length < CA_FEE_TABLE_ROUTE_TOKENS.length,
    `${rule.routeToken}: a family's route token must be one the fee table keys its lines to`);
  const onPoint = feeRules.filter((line) =>
    line.includes(rule.routeToken) && !foreign.some((token) => line.includes(token)));
  assert.ok(onPoint.length,
    `${rule.routeToken}: no fee line names this route without also naming another`);
  const otherMoney = onPoint
    .flatMap((line) => line.match(/\$[\d][\d,.]*/g) ?? [])
    .filter((figure) => figure !== rule.amount);
  assert.deepEqual(otherMoney, [],
    `${rule.routeToken}: this route's own fee lines state a figure other than ${rule.amount}`);
  const stating = onPoint.filter((line) => line.includes(rule.amount));
  assert.ok(stating.length,
    `${rule.routeToken}: no on-point fee line states ${rule.amount}`);
  return { amount: rule.amount, keyedTo: rule.keyedTo, quoted: stating[0], onPointLines: onPoint.length };
}


/*
 * The held filing, service and fee-waiver answers for one packet set, read from
 * the committed manifest rather than restated here. Every sentence this returns
 * quotes or paraphrases a participantActionRequired entry for this exact
 * packetSetId; if the manifest stops holding one, the corresponding sentence
 * disappears rather than being invented, and if it holds none the caller falls
 * back to the delegating paragraph.
 *
 * The fee AMOUNT is deliberately not stated. The manifest's pay_fee entry for
 * ca-851-91-set says "Unresolved and county-specific. Do not publish a figure."
 * -- the repository genuinely does not hold it, so under the determination's
 * third met limb the named clerk stands in for that one question, and only for
 * that one.
 */
function caHeldParticipantActions(familyId) {
  const manifest = readJson(PACKET_SET_MANIFESTS);
  const set = (manifest.packetSets ?? []).find((row) => row.packetSetId === familyId);
  assert.ok(set, `${familyId}: no packet-set manifest entry to read held participant actions from`);
  const actions = set.participantActionRequired ?? [];
  const first = (kind) => {
    const row = actions.find((candidate) => candidate.kind === kind);
    const text = String(row?.description ?? "").trim();
    return text.length ? text : null;
  };
  return {
    file: first("file"),
    serveParty: first("serve_party"),
    payFee: first("pay_fee"),
    applyFeeWaiver: first("apply_fee_waiver"),
  };
}

function caHeldGuidanceSections(familyId, config, guidance) {
  const held = caHeldParticipantActions(familyId);
  const routeFee = caHeldRouteFee(guidance);
  const stated = [held.file, held.serveParty, held.applyFeeWaiver].filter(Boolean);
  assert.ok(stated.length,
    `${familyId}: statesHeldParticipantActions is set but its manifest holds no file, serve_party or apply_fee_waiver entry`);

  const clerk = `the clerk of the Superior Court in the county of the ${guidance.countyOf}`;
  // The packet's own proof of service, read off the family's form list rather
  // than named here: CR-106 for the 851.91 and 1203.4x families, CR-401 for
  // the Proposition 64 route, and nothing at all for a family that ships none.
  const proofOfService = config.formNumbers
    .find((formNumber) => CA_FORMS[formNumber]?.role === "proof_of_service") ?? null;
  const out = [];

  if (held.file) {
    // A4's narrower rule, applied to the sentence describing the rule rather
    // than to the rule: the packet may not tell a participant that the held
    // sentence carries a deadline when it does not. 851.91's does -- "at least
    // 15 days before the hearing" -- and Proposition 64's does not.
    const filingDeadlineHeld = /\bbefore\b|\bwithin\b|\bdays\b|\bdeadline\b/i.test(held.file);
    const readIt = filingDeadlineHeld
      ? "Read it against your own case before you rely on it: it tells you which court, what goes in together, and the deadline that governs both."
      : "Read it against your own case before you rely on it: it tells you which court and what goes in together. It sets no filing deadline for this route, and none is invented here.";
    out.push(`## Where you file this, and by when\n\n${held.file}\n\nThat rule is the committed packet-set manifest for this packet, not a guess at local practice. ${readIt}\n`);
  }
  if (held.serveParty) {
    // What the held sentence itself settles decides what else is said. A
    // sentence that anchors its deadline to the hearing gets the rule about
    // counting backwards from it; one that states neither a method nor a
    // deadline gets an authority named for those two questions and for those
    // two only. Nothing here is asserted about a route whose own sentence is
    // silent, and nothing is added to a route whose sentence already answers.
    const anchoredToHearing = /before the hearing/i.test(held.serveParty);
    const statesMethod = /\bmail\b|\bhand\b|personal(?:ly)?|process server/i.test(held.serveParty);
    const statesTiming = /\bwithin\b|\bbefore\b|\bdays\b|\bdeadline\b/i.test(held.serveParty);
    // Both, not either. A sentence that answers one of the two has been read
    // and found to say what it says; adding an authority beside it would tell
    // a participant to go and ask about something the packet has just told
    // them. Only a sentence silent on both leaves a participant unable to act.
    const missing = statesMethod || statesTiming
      ? []
      : ["by what method service must be made", "by when it must be made"];
    const sentences = [];
    if (proofOfService) {
      sentences.push(`This is why ${CA_FORMS[proofOfService]?.officialTitle ?? proofOfService} ships with this packet: it is the proof that you served those parties.`);
    }
    sentences.push("Serve first, then complete the proof of service — never the other way round.");
    if (anchoredToHearing) {
      sentences.push("The deadline runs backwards from the hearing, so count from the hearing date, not from the day you file.");
    }
    if (missing.length) {
      sentences.push(`What the repository does not establish for this route is ${missing.join(" and ")}, so no rule for either is printed here — **ask ${clerk}** before you serve, and do not read this packet's silence as permission to choose freely.`);
    }
    out.push(`## Who you must serve, and by when\n\n${held.serveParty}\n\n${sentences.join(" ")}\n`);
  }

  const money = [];
  if (routeFee) {
    // A1 in the order A1 states it: the repository establishes this route's
    // fee, so the packet states it. The manifest's pay_fee entry for such a
    // family records only that its own source review did not reach the
    // question, and printing that as the answer would tell a participant the
    // packet cannot say what it can.
    money.push(`**This filing costs ${routeFee.amount}.** The compiled California profile states it for this route in terms — "${routeFee.quoted}" — keyed to ${routeFee.keyedTo}, and that is the line this packet relies on. It is not read across from any other California remedy: the same table prices the petition-based dismissals separately, and those figures answer a different statute's question, not this one. **Ask ${clerk} what payment methods that court accepts** and whether it charges anything for certified copies, which is a separate cost from the filing itself.`);
  } else {
    money.push(held.payFee
      ? `**The filing fee itself is the one question this packet cannot answer.** The committed packet-set manifest records the fee for this route as "${held.payFee.replace(/\s*$/, "")}" — it varies from county to county and the repository does not hold the figure for yours, so none is printed here. Publishing an amount this packet does not hold would be worse than publishing none. **Ask ${clerk} what the filing fee is for this petition**, and ask at the same time what payment methods that court accepts.`
      : `**Ask ${clerk} what the filing fee is for this petition**, and what payment methods that court accepts.`);
  }
  if (held.applyFeeWaiver) {
    // Only what the manifest says, and no more. The wave-2 verification ledger
    // records the precise limit of this fact: FW-001 is California's general
    // fee-waiver form, and that "does not determine whether either filing has a
    // fee or when a waiver is required". So the form is NAMED -- which is what
    // the packet was failing to do -- while whether a waiver is available on
    // this petition stays with the clerk. FW-001's official title is not held
    // in this repository and is therefore not printed here.
    // A packet that has just stated a nil fee cannot open the next paragraph
    // with "if you cannot pay it". The waiver form is still named, because the
    // manifest holds it and naming a held form is never wrong; what changes is
    // the claim made around it, and neither branch asserts that a waiver is
    // available on this route, which no held record establishes either way.
    money.push(routeFee && routeFee.amount === "$0"
      ? `**A fee waiver is a separate question, and on this route it should not arise.** No filing fee is stated for this route, so there should be nothing to waive when you file. ${held.applyFeeWaiver.replace(/\s*$/, "")} It is a separate form: it is not part of this packet, is not filled in for you, and is available from the California Courts self-help forms site along with the forms in this packet. Whether a waiver is needed or available for anything else on this filing is not established for this route, so **if the court asks you for money at the counter, ask ${clerk} what the charge is for and whether form FW-001 covers it** before you pay.`
      : `**If you cannot pay it, ask about a fee waiver by name.** ${held.applyFeeWaiver.replace(/\s*$/, "")} It is a separate form: it is not part of this packet, is not filled in for you, and is available from the California Courts self-help forms site along with the forms in this packet. Naming it is as far as the repository goes — whether a waiver is available on this particular petition, and what it requires of you, is decided on your own financial circumstances and on that court's practice, so **ask ${clerk} for form FW-001 and whether a waiver applies to this filing**.`);
  }
  out.push(`## What this costs\n\n${money.join("\n\n")}\n`);

  assert.ok(guidance.reliefQuestion,
    `${familyId}: statesHeldParticipantActions is set but no relief question is configured`);
  const fromTheClerk = routeFee
    ? "The payment methods that court accepts, and any local intake rule"
    : "The filing fee, the payment methods that court accepts, and any local intake rule";
  out.push(`## Where this packet's self-help ends\n\n`
    + `This packet states what the repository holds for this route and nothing beyond it. ${fromTheClerk} — a cover sheet, a filing window, an e-filing requirement — come from ${clerk}, not from this packet. It does not decide ${guidance.reliefQuestion}, it does not appear for you, and it is not legal advice. If your case does not match the route named at the top of this page, or if anyone opposes the petition, that is the point to get a lawyer or a legal-aid office rather than to press on with these papers.\n`);

  return out.join("\n");
}

/*
 * The manifest kinds that describe an act before filing, as distinct from the
 * filing, service, fee and waiver questions, which have their own sections and
 * their own determination. Nothing here restates a fee or a destination.
 */
const PRE_FILING_ACT_KINDS = Object.freeze([
  "obtain_document", "confirm_answer", "complete_field", "sign", "notarize",
]);

/*
 * The acts the committed packet-set manifest holds for this packet, printed in
 * its own words. Verbatim rather than paraphrased for the same reason the
 * filing and service sentences are: the manifest is the held source, and a
 * summary of it is this build's sentence rather than the repository's.
 *
 * Every requiredBeforeFiling act is carried. The conditional obtain_document
 * entries are carried with them and labelled conditional, because the manifest
 * requires the participant to CHECK an answer against a document it separately
 * records how to obtain, and telling someone to check a docket without telling
 * them where a docket comes from leaves them unable to act.
 */
function caManifestPreFilingActs(familyId, guidance) {
  if (!guidance.statesManifestPreFilingActs) return "";
  const manifest = readJson(PACKET_SET_MANIFESTS);
  const set = (manifest.packetSets ?? []).find((row) => row.packetSetId === familyId);
  assert.ok(set, `${familyId}: no packet-set manifest entry to read pre-filing acts from`);
  const acts = (set.participantActionRequired ?? []).filter((row) =>
    PRE_FILING_ACT_KINDS.includes(row.kind)
    && (row.requiredBeforeFiling === true || row.kind === "obtain_document"));
  assert.ok(acts.length,
    `${familyId}: statesManifestPreFilingActs is set but its manifest holds no pre-filing act`);
  const lines = acts.map((row) => {
    const description = String(row.description ?? "").trim();
    assert.ok(description, `${familyId}: a manifest pre-filing act carries no description`);
    const tail = [];
    if (row.obtainedFrom) tail.push(`It comes from: ${String(row.obtainedFrom).replace(/\s*\.?$/, "")}.`);
    if (row.requirement === "conditional" && row.conditionDescription) {
      tail.push(`This one is conditional: ${String(row.conditionDescription).replace(/\s*$/, "")}`);
    }
    return `- ${description}${tail.length ? ` ${tail.join(" ")}` : ""}`;
  });
  return `## What you must obtain, check and swear before you file\n\n`
    + `These are the committed packet-set manifest's own words for this packet, not a summary of them. Each one is something the filing needs, the platform does not hold, and this packet therefore does not fill in.\n\n`
    + `${lines.join("\n")}\n\n`;
}

/*
 * The committed track registry's own self-help stop conditions for this route.
 *
 * Printed verbatim and as a list the participant meets before the tables, not
 * folded into a disclaimer: a disclaimer says the packet is not legal advice,
 * which is a statement about the packet, while a stop condition is a statement
 * about the participant's own case and is the only one of the two that can tell
 * them to put the papers down.
 */
function caRegistryStopConditionSection(config, guidance) {
  const trackId = guidance.statesRegistryStopConditions;
  if (!trackId) return "";
  const registry = readJson(TRACK_REGISTRY);
  const track = (registry.tracks ?? []).find((row) => row.trackId === trackId);
  assert.ok(track, `${trackId}: no committed track registry entry to read stop conditions from`);
  const conditions = (track.selfHelpStopConditions ?? [])
    .map((condition) => String(condition).trim()).filter(Boolean);
  assert.ok(conditions.length, `${trackId}: the track registry holds no self-help stop condition`);
  const meetsTheElection = config.participantMarksStatutoryElections && guidance.electionItem
    ? `\n\nThe first of these also decides which election at ${guidance.electionItem} is open to you at all, which is one reason this packet marks neither box for you: the form prints that same bar in its own words beside the item.`
    : "";
  return `## When to stop and take this to a lawyer\n\n`
    + `The committed track registry records these as the points where self-help ends on this route, in its own words. If any of them describes your case, stop here and take the papers to a lawyer or a legal-aid office rather than filing them:\n\n`
    + conditions.map((condition) => `- ${condition}`).join("\n")
    + `${meetsTheElection}\n\n`;
}

function caParticipantInstructions(familyId, config, fieldMap) {
  const guidance = CA_PARTICIPANT_GUIDANCE[familyId];
  assert.ok(guidance, `${familyId}: no participant guidance is configured`);
  const companionNames = config.formNumbers
    .filter((formNumber) => formNumber !== config.primaryForm)
    .map((formNumber) => `${formNumber} (${CA_FORMS[formNumber].officialTitle ?? CA_FORMS[formNumber].role.replace(/_/g, " ")})`);
  const required = (fieldMap.refusals ?? []).filter((row) => row.requiredBeforeFiling === true);
  const byDocument = new Map();
  for (const row of required) {
    const key = row.documentId;
    if (!byDocument.has(key)) byDocument.set(key, []);
    byDocument.get(key).push(row);
  }
  const shortFieldName = (name) => String(name).replace(/^[^.]*\./, "");
  const tables = [...byDocument.entries()].map(([documentId, rows]) => {
    const service = rows[0].documentRole === "proof_of_service";
    const lines = rows
      .map((row) => ({
        page: (row.widgets?.[0]?.pageIndex ?? 0) + 1,
        name: shortFieldName(row.fieldName),
        label: String(row.effectiveLabel ?? "").trim(),
      }))
      .sort((left, right) => left.page - right.page || left.name.localeCompare(right.name))
      .map((row) => `| ${row.page} | \`${row.name}\` | ${row.label
        ? `the form prints \`${row.label}\` beside it`
        : "the measurement could reach no printed caption; read the printed page"}${service
        ? " — complete this only after service has actually occurred" : ""} |`);
    return `### ${documentId}\n\n| Page | Form field | What the form says |\n| --- | --- | --- |\n${lines.join("\n")}\n`;
  }).join("\n");
  const routeDeterminedNote = (fieldMap.refusals ?? []).some((row) => row.routeDetermined === true)
    ? "\n- **The 17(b)/17(d)(2) yes-or-no cells in the conviction table** — a route-level election this packet family does not determine; it is recorded as unmade rather than guessed.\n"
    : "\n";
  return `# Participant and reviewer instructions — ${guidance.title}\n\n`
    + `These files are deterministic review fixtures made from exact held official sources. They are not approved filing packets.\n\n`
    + config.routeKeys.map((route) => `- Route scope: \`${route}\``).join("\n") + "\n"
    + `- Primary form: ${guidance.primaryName}, with ${companionNames.join(", ")}.\n\n`
    + `The platform filled in only identity and record facts it verifiably holds — name, case number, county, date of birth, contact details, and the recorded arrest or conviction facts — in the caption and identity items of the primary form. Everything else is yours to complete, and this page lists it.\n\n`
    + `## What you must do before you file\n\n`
    + `1. **Fill in every blank listed below.** Each row names the page, the form field as the source PDF names it, and the words printed beside the blank.\n`
    + `2. **Mark every election yourself.** The platform never marks a box on a sworn filing.\n`
    + `3. **Sign and date each form yourself**, and complete the proof of service only after service has actually occurred.\n`
    + `4. **Leave ${guidance.orderForm} entirely blank**${required.some((row) => row.documentRole === "proposed_order")
      ? " except the report numbers listed below" : ""}. The ${guidance.orderName} is the court's form.\n\n`
    + caManifestPreFilingActs(familyId, guidance)
    + caRegistryStopConditionSection(config, guidance)
    + (guidance.statesHeldParticipantActions
      ? caHeldGuidanceSections(familyId, config, guidance) + `\n`
      : `## What this packet does not tell you\n\n`
        + `The filing fee and whether it can be waived, who must be served and by what method, and the address of the court are not established in this repository. Ask the clerk of the Superior Court in the county of the ${guidance.countyOf}. An unsourced figure in a filing instruction would be worse than none. This is where this packet's self-help ends: fee, waiver, service, and local filing practice come from the clerk of that court, not from this packet.\n\n`)
    + `## The blanks you must fill in\n\n`
    + `The platform holds no value for any of these, and this packet never guesses at one.\n\n`
    + tables
    + `\n## Blanks that are not yours to fill\n\n`
    + `- **${guidance.orderForm}, the ${guidance.orderName}** — the court completes and signs it.\n`
    + `- **The attorney block on the primary form** — leave it blank unless a lawyer is filing for you.\n`
    + `- **Every signature and signature date** — yours to complete at the moment you sign.`
    + routeDeterminedNote;
}

function azMapAndAnchors(familyId, config, census) {
  const fields = census.fields.map((field) => ({ ...field, ...azDisposition(config, field) }));
  const anchors = [];
  const explicitMappings = {};
  for (const field of fields.filter((candidate) => candidate.disposition === "WRITE")) {
    const spec = AZ_FIELD_SPECS.find((candidate) => candidate.id === field.fieldId);
    const inset = 2;
    const y = field.measured.construction === "drawn_rule"
      ? round(field.measured.baselineY + 2) : field.measured.baselineY;
    const anchor = {
      blankId: field.fieldId, label: field.semanticLabel, sourceLabel: field.sourceLabel,
      page: field.page, factId: field.factId,
      writeBox: { x: round(field.measured.x0 + inset), y,
        width: round(field.measured.width - inset * 2), height: 11.2 },
      fontSize: 9, measured: true,
      printedSuffixAfterBlank: spec.printedSuffixAfterBlank ?? null,
    };
    assert.ok(anchor.label, `${field.fieldId}: writable anchor has no semantic label`);
    if (explicitMappings[anchor.label]) {
      assert.equal(explicitMappings[anchor.label], anchor.factId, `${anchor.label}: mapping conflict`);
    }
    explicitMappings[anchor.label] = anchor.factId;
    anchors.push(anchor);
  }
  return {
    fields, anchors, explicitMappings,
    map: {
      schemaVersion: "rcap-production-field-map/v1", familyId,
      routeKeys: [...config.routeKeys], renderStrategy: "flat_pdf_measured_overlay",
      sourceSha256: AZ_SOURCE.sha256,
      measurementSurface: "exact official AOC-CREM3F source bytes",
      derivativesUsed: false, explicitMappings, ...GATES,
      writes: fields.filter((field) => field.disposition === "WRITE"),
      refusals: [...fields.filter((field) => field.disposition === "REFUSE"), ...census.controls],
      coverage: {
        measuredBlanks: fields.length, measuredPrintedControls: census.controls.length,
        writes: fields.filter((field) => field.disposition === "WRITE").length,
        refusals: fields.filter((field) => field.disposition === "REFUSE").length + census.controls.length,
        unmapped: 0,
      },
      /* The blanks the participant must fill, named so the packet can ask for them. */
      requiredBeforeFilingCount: fields.filter((field) => field.requiredBeforeFiling === true).length,
      requiredBeforeFiling: fields.filter((field) => field.requiredBeforeFiling === true).map((field) => ({
        fieldId: field.fieldId, label: field.sourceLabel, page: field.page,
        participantMustSupply: field.participantMustSupply,
      })),
    },
  };
}

async function addedInkOf(sourceBytes, outputBytes) {
  const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const output = await PDFDocument.load(outputBytes, { ignoreEncryption: true, updateMetadata: false });
  const metricsDocument = await PDFDocument.create();
  stampDeterministic(metricsDocument);
  const overlayFont = await metricsDocument.embedFont(StandardFonts.Helvetica);
  const key = (page, character, y) => `${page}|${Number(character.x).toFixed(1)}|${Number(y).toFixed(1)}|${character.c}`;
  const original = new Set();
  source.getPages().forEach((page, index) => {
    for (const item of extractTextItems(page)) {
      for (const character of item.chars ?? []) original.add(key(index + 1, character, item.y));
    }
  });
  const added = [];
  output.getPages().forEach((page, index) => {
    for (const item of extractTextItems(page)) {
      const metricsExact = item.metricsExact === true;
      const runWidth = metricsExact
        ? round(item.width)
        : round(overlayFont.widthOfTextAtSize(item.text, item.size));
      for (const character of item.chars ?? []) {
        if (original.has(key(index + 1, character, item.y))) continue;
        added.push({ page: index + 1, x: round(character.x), y: round(item.y),
          width: round(character.w), character: character.c,
          metricsExact, runX: round(item.x), runWidth, runText: item.text,
          runFontSize: round(item.size) });
      }
    }
  });
  return added;
}

async function paintedPathGeometryFromBytes(bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return pdf.getPages().flatMap((page, index) => extractPathSegments(page).map((segment) => ({
    page: index + 1,
    operator: segment.operator,
    x: round(segment.x), y: round(segment.y),
    width: round(segment.width), height: round(segment.height),
    paintedBy: segment.paintedBy,
  })));
}

function paintedPathKey(segment) {
  return [segment.page, segment.operator, segment.x, segment.y,
    segment.width, segment.height, segment.paintedBy].join("|");
}

function subtractPaintedPaths(sourcePaths, artifactPaths) {
  const remaining = new Map();
  for (const segment of sourcePaths) {
    const key = paintedPathKey(segment);
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }
  const added = [];
  for (const segment of artifactPaths) {
    const key = paintedPathKey(segment);
    const count = remaining.get(key) ?? 0;
    if (count > 0) remaining.set(key, count - 1);
    else added.push(segment);
  }
  return added;
}

function azPrintedControlBox(control) {
  const measured = control.measured;
  return {
    x: measured.x0,
    y: round(measured.baselineY - 1.5),
    width: round(measured.x1 - measured.x0),
    height: round(measured.printedFontSize + 3),
  };
}

function paintedPathIntersectsBox(segment, box) {
  const segmentX1 = segment.x + segment.width;
  const segmentY1 = segment.y + segment.height;
  return segmentX1 >= box.x && segment.x <= box.x + box.width
    && segmentY1 >= box.y && segment.y <= box.y + box.height;
}

function proveAzPrintedControlsUnmarked({ controls, addedGlyphs, sourcePaths, artifactPaths, fixture }) {
  const addedPaths = subtractPaintedPaths(sourcePaths, artifactPaths);
  const proof = controls.map((control) => {
    const box = azPrintedControlBox(control);
    const addedTextGlyphs = addedGlyphs.filter((glyph) =>
      glyph.character.trim() && glyphInsideBox(glyph, control.page, box));
    const addedVectorPaths = addedPaths.filter((segment) =>
      segment.page === control.page && paintedPathIntersectsBox(segment, box));
    return {
      controlId: control.controlId, page: control.page, measuredBox: box,
      addedTextGlyphs, addedVectorPaths,
      sourceToArtifactUnmarked: addedTextGlyphs.length === 0 && addedVectorPaths.length === 0,
    };
  });
  assert.deepEqual(proof.filter((row) => !row.sourceToArtifactUnmarked), [],
    `${fixture}: a measured printed selection control carries added text or vector ink`);
  return {
    measurementCount: controls.length,
    sourcePaintedPathCount: sourcePaths.length,
    artifactPaintedPathCount: artifactPaths.length,
    sourceToArtifactAddedPaintedPathCount: addedPaths.length,
    controls: proof,
  };
}

function glyphInsideBox(glyph, page, box) {
  if (glyph.metricsExact === false && Number.isFinite(glyph.runX) && Number.isFinite(glyph.runWidth)) {
    return glyph.page === page && glyph.y >= box.y - 1.5 && glyph.y <= box.y + box.height + 1.5
      && glyph.runX >= box.x - 1 && glyph.runX + glyph.runWidth <= box.x + box.width + 2;
  }
  return glyph.page === page && glyph.y >= box.y - 1.5 && glyph.y <= box.y + box.height + 1.5
    && glyph.x >= box.x - 1 && glyph.x + glyph.width <= box.x + box.width + 2;
}

function glyphInsideMeasuredField(glyph, field) {
  if (glyph.metricsExact === false && Number.isFinite(glyph.runX) && Number.isFinite(glyph.runWidth)) {
    return glyph.page === field.page
      && glyph.y >= field.measured.baselineY - 2 && glyph.y <= field.measured.baselineY + 13.5
      && glyph.runX < field.measured.x1 && glyph.runX + glyph.runWidth > field.measured.x0;
  }
  return glyph.page === field.page
    && glyph.y >= field.measured.baselineY - 2 && glyph.y <= field.measured.baselineY + 13.5
    && glyph.x >= field.measured.x0 - 1 && glyph.x + glyph.width <= field.measured.x1 + 2;
}

function proofText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function expectedAzValueForAnchor(anchor, facts, report) {
  const raw = facts[anchor.factId];
  const normalizations = (report.normalized ?? []).filter((row) =>
    row.anchor === anchor.label
      && row.factId === anchor.factId
      && proofText(row.from) === proofText(raw));
  assert.ok(normalizations.length <= 1,
    `${anchor.blankId}: finalizer recorded ambiguous per-anchor normalizations`);
  const expected = normalizations[0]?.to ?? raw;
  assert.ok((report.expectedValues ?? []).some((value) =>
    proofText(value) === proofText(expected)),
  `${anchor.blankId}: expected value is absent from the finalizer report`);
  return expected;
}

function assertExactFieldBindings({ observations, expectedByField, fixtureValues, label,
  requireEveryOtherFieldBlank = false }) {
  const rows = new Map(observations.map((row) => [row.fieldName ?? row.fieldId, row]));
  const expectedEntries = Object.entries(expectedByField);
  const protectedFieldsWithFixtureValues = [];
  const protectedFieldsWithAddedInk = [];
  for (const [field, expectedRaw] of expectedEntries) {
    const row = rows.get(field);
    assert.ok(row, `${label}/${field}: expected measured field is absent from output-byte observations`);
    const actual = proofText(row.textReadFromOutputBytes);
    const expected = proofText(expectedRaw);
    assert.equal(actual, expected,
      `${label}/${field}: exact field does not carry expected value ${JSON.stringify(expected)}`);
  }
  const allFixtureValues = [...new Set((fixtureValues ?? []).map(proofText).filter(Boolean))];
  for (const [field, row] of rows) {
    if (Object.hasOwn(expectedByField, field)) continue;
    const actual = proofText(row.textReadFromOutputBytes);
    const matchingFixtureValues = allFixtureValues.filter((value) => actual.includes(value));
    if (matchingFixtureValues.length) {
      protectedFieldsWithFixtureValues.push({ field, actual, matchingFixtureValues });
    }
    if (requireEveryOtherFieldBlank && row.protectFromAddedInk !== false && actual) {
      protectedFieldsWithAddedInk.push({ field, actual });
    }
  }
  assert.deepEqual(protectedFieldsWithFixtureValues, [],
    `${label}: participant fixture value appears in a refused/protected field`);
  assert.deepEqual(protectedFieldsWithAddedInk, [],
    `${label}: a refused/protected field contains added appearance text`);
  return { protectedFieldsWithFixtureValues, protectedFieldsWithAddedInk };
}

async function verifyAzArtifact({ sourceBytes, outputFile, outputBytes, anchors, fields, controls,
  report, fixture }) {
  const facts = fixture === "canonical" ? CANONICAL : BOUNDARY;
  const added = await addedInkOf(sourceBytes, outputBytes);
  assert.equal(controls.length, 19, `${fixture}: measured printed selection-control census drifted`);
  const [sourcePaths, artifactPaths] = await Promise.all([
    paintedPathGeometryFromBytes(sourceBytes), paintedPathGeometryFromBytes(outputBytes),
  ]);
  const printedSelectionControlProof = proveAzPrintedControlsUnmarked({
    controls, addedGlyphs: added, sourcePaths, artifactPaths, fixture,
  });
  const actualWrites = anchors.map((anchor) => {
    const glyphs = added.filter((glyph) => glyphInsideBox(glyph, anchor.page, anchor.writeBox))
      .sort((left, right) => left.x - right.x);
    return {
      fixture, fieldId: anchor.blankId, anchorLabel: anchor.label,
      sourceLabel: anchor.sourceLabel, factId: anchor.factId,
      page: anchor.page, writeBox: anchor.writeBox,
      textReadFromOutputBytes: glyphs.map((glyph) => glyph.character).join("").trim() || null,
      glyphCountReadFromOutputBytes: glyphs.filter((glyph) => glyph.character.trim()).length,
    };
  });
  const outside = added.filter((glyph) => glyph.character.trim())
    .filter((glyph) => !anchors.some((anchor) => glyphInsideBox(glyph, anchor.page, anchor.writeBox)));
  assert.equal(outside.length, 0,
    `${fixture}: added text outside every measured write box: ${JSON.stringify(outside)}`);
  const refusedWithInk = fields.filter((field) => field.disposition === "REFUSE")
    .map((field) => ({ fieldId: field.fieldId,
      glyphs: added.filter((glyph) => glyph.character.trim() && glyphInsideMeasuredField(glyph, field)) }))
    .filter((row) => row.glyphs.length > 0);
  assert.equal(refusedWithInk.length, 0, `${fixture}: a refused field carries added ink`);
  assert.equal(report.selections?.length ?? 0, 0, `${fixture}: no legal-election box may be marked`);
  assert.equal(report.selectionsRefused?.length ?? 0, 0, `${fixture}: no selection was offered`);
  const flattened = await flattenedWidgets(abs(outputFile));
  assert.equal(flattened.length, 0, `${fixture}: flat overlay unexpectedly emitted widget appearances`);
  const expectedValues = new Set((report.expectedValues ?? []).map(String));
  const actualText = actualWrites.filter((row) => row.textReadFromOutputBytes);
  const writtenAnchors = anchors.filter((anchor) => (report.written ?? []).some((row) =>
    row.anchor === anchor.label && row.factId === anchor.factId));
  const exactBindingProof = assertExactFieldBindings({
    observations: actualWrites,
    expectedByField: Object.fromEntries(writtenAnchors.map((anchor) =>
      [anchor.blankId, expectedAzValueForAnchor(anchor, facts, report)])),
    fixtureValues: [...expectedValues], label: `AZ/${fixture}`,
    requireEveryOtherFieldBlank: true,
  });
  assert.equal(actualText.length, report.written.length,
    `${fixture}: actual-write count differs from finalizer report`);
  return {
    fixture, outputFile, sha256: sha256(outputBytes), byteLength: outputBytes.length,
    finalizerWritten: report.written, finalizerRefused: report.refused,
    finalizerNormalized: report.normalized,
    valuesReportedByFinalizer: report.expectedValues,
    addedGlyphsReadFromOutputBytes: added.length,
    flattenedWidgetAppearancesReadFromOutputBytes: flattened.length,
    writes: actualWrites, refusedFieldsWithInk: refusedWithInk,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: outside,
    printedSelectionControlProof,
    exactBindingProof,
  };
}

function expectedDimensionsFromPageGeometry(page) {
  const box = page.cropBox ?? page.mediaBox;
  assert.ok(Array.isArray(box) && box.length === 4, `page ${page.pageIndex + 1}: missing PDF box geometry`);
  const width = Math.abs(Number(box[2]) - Number(box[0]));
  const height = Math.abs(Number(box[3]) - Number(box[1]));
  const rotation = ((Number(page.rotate ?? 0) % 360) + 360) % 360;
  const rotated = rotation === 90 || rotation === 270;
  return {
    widthPx: Math.round((rotated ? height : width) * RASTER_DPI / 72),
    heightPx: Math.round((rotated ? width : height) * RASTER_DPI / 72),
  };
}

function portablePopplerIdentity(version) {
  assert.match(String(version), /^[0-9][0-9A-Za-z.+-]*$/,
    `unrecognized pdftoppm version: ${JSON.stringify(version)}`);
  return {
    engine: RASTER_ENGINE,
    version: String(version),
    executablePathPersisted: false,
  };
}

function popplerRasterIdentity() {
  if (path.isAbsolute(POPPLER_PDFTOPPM)) {
    assert.ok(fs.existsSync(POPPLER_PDFTOPPM), "configured Poppler executable is missing");
  }
  const probe = spawnSync(POPPLER_PDFTOPPM, ["-v"], {
    encoding: "utf8", timeout: 15_000,
  });
  assert.equal(probe.status, 0,
    `Poppler version probe failed: ${probe.stderr || probe.stdout || probe.error?.message || "unknown error"}`);
  const output = `${probe.stderr ?? ""}\n${probe.stdout ?? ""}`;
  const match = /\bpdftoppm version\s+([^\s]+)/i.exec(output);
  assert.ok(match, "Poppler version probe did not identify pdftoppm");
  return portablePopplerIdentity(match[1]);
}

function assertPortableRasterIdentity(identity, label) {
  assert.deepEqual(identity, portablePopplerIdentity(identity?.version),
    `${label}: raster tool identity must contain only portable engine/version evidence`);
  assert.equal(path.isAbsolute(String(identity.version)), false,
    `${label}: raster version must not be an executable path`);
  return true;
}

async function rasterizeWithPoppler({ file, outDir, expectedPageCount,
  expectedPageGeometry = null, prefix = "page", rasterIdentity }) {
  assertPortableRasterIdentity(rasterIdentity, `${file} rasterizer`);
  if (path.isAbsolute(POPPLER_PDFTOPPM)) {
    assert.ok(fs.existsSync(POPPLER_PDFTOPPM),
      "configured Poppler executable is missing");
  }
  const input = abs(file);
  const output = abs(outDir);
  assert.ok(fs.existsSync(input), `raster input is missing: ${file}`);
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  const targetPrefix = path.join(output, `${prefix}-raw`);
  const run = spawnSync(POPPLER_PDFTOPPM,
    ["-png", "-r", String(RASTER_DPI), input, targetPrefix],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  assert.equal(run.status, 0,
    `Poppler raster failed for ${file}: ${run.stderr || run.stdout || run.error?.message || "unknown error"}`);

  let livePages = null;
  if (expectedPageGeometry) {
    assert.equal(expectedPageGeometry.length, expectedPageCount,
      `${file}: declared page geometry count differs from page count`);
  } else {
    const source = await PDFDocument.load(fs.readFileSync(input), {
      ignoreEncryption: true, updateMetadata: false,
    });
    livePages = source.getPages();
    assert.equal(livePages.length, expectedPageCount,
      `${file}: declared page count differs from finished PDF bytes`);
  }
  const found = fs.readdirSync(output)
    .map((name) => ({ name, match: new RegExp(`^${prefix}-raw-(\\d+)\\.png$`).exec(name) }))
    .filter((row) => row.match)
    .map((row) => ({ ...row, page: Number(row.match[1]) }))
    .sort((left, right) => left.page - right.page);
  assert.equal(found.length, expectedPageCount, `${file}: not every page rastered by Poppler`);
  assert.deepEqual(found.map((row) => row.page),
    Array.from({ length: expectedPageCount }, (_, index) => index + 1),
    `${file}: Poppler page sequence is incomplete`);

  const pages = [];
  for (const row of found) {
    const outputFile = path.join(output, `${prefix}-${String(row.page).padStart(2, "0")}.png`);
    fs.renameSync(path.join(output, row.name), outputFile);
    const png = fs.readFileSync(outputFile);
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a",
      `${file}/page ${row.page}: Poppler output is not PNG`);
    const metadata = await sharp(png).metadata();
    const { channels } = await sharp(png).greyscale().stats();
    const looksBlank = channels[0].max - channels[0].min <= 6;
    assert.equal(looksBlank, false, `${file}/page ${row.page}: Poppler raster looks blank`);
    const expected = expectedPageGeometry
      ? expectedDimensionsFromPageGeometry(expectedPageGeometry[row.page - 1])
      : expectedRasterDimensions(livePages[row.page - 1]);
    const expectedWidthPx = expected.widthPx;
    const expectedHeightPx = expected.heightPx;
    assert.ok(Math.abs(metadata.width - expectedWidthPx) <= 1,
      `${file}/page ${row.page}: Poppler width ${metadata.width} != expected ${expectedWidthPx}`);
    assert.ok(Math.abs(metadata.height - expectedHeightPx) <= 1,
      `${file}/page ${row.page}: Poppler height ${metadata.height} != expected ${expectedHeightPx}`);
    pages.push({
      page: row.page,
      file: path.posix.join(outDir, path.basename(outputFile)),
      sha256: sha256(png), byteLength: png.length,
      widthPx: metadata.width, heightPx: metadata.height,
      expectedWidthPx, expectedHeightPx,
      looksBlank, croppedToPage: true, attempts: 1,
      engine: rasterIdentity.engine, engineVersion: rasterIdentity.version, dpi: RASTER_DPI,
    });
  }
  return pages;
}

function expectedRasterDimensions(pdfPage) {
  const pageSize = pdfPage.getSize();
  const rotation = ((pdfPage.getRotation().angle % 360) + 360) % 360;
  const rotated = rotation === 90 || rotation === 270;
  return {
    widthPx: Math.round((rotated ? pageSize.height : pageSize.width) * RASTER_DPI / 72),
    heightPx: Math.round((rotated ? pageSize.width : pageSize.height) * RASTER_DPI / 72),
  };
}

async function recomputeRasterEvidence({ pdfFile, rasterRows, label, pageGeometry = null,
  rasterIdentity }) {
  assertPortableRasterIdentity(rasterIdentity, `${label} recorded rasterizer`);
  const liveRasterIdentity = popplerRasterIdentity();
  assert.deepEqual(liveRasterIdentity, rasterIdentity,
    `${label}: current Poppler engine/version differs from the recorded rasterizer`);
  const pdfBytes = fs.readFileSync(abs(pdfFile));
  const pages = pageGeometry ?? (await PDFDocument.load(pdfBytes, {
    ignoreEncryption: true, updateMetadata: false,
  })).getPages();
  assert.deepEqual(rasterRows.map((row) => row.page),
    Array.from({ length: pages.length }, (_, index) => index + 1),
    `${label}: raster rows do not cover every PDF page exactly once in order`);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-west-poppler-check-"));
  try {
    const freshPrefix = path.join(tempDir, "page");
    const run = spawnSync(POPPLER_PDFTOPPM,
      ["-png", "-r", String(RASTER_DPI), abs(pdfFile), freshPrefix],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    assert.equal(run.status, 0,
      `fresh Poppler raster failed for ${label}: ${run.stderr || run.stdout || run.error?.message || "unknown error"}`);
    const freshFiles = fs.readdirSync(tempDir)
      .map((name) => ({ name, match: /^page-(\d+)\.png$/.exec(name) }))
      .filter((row) => row.match)
      .map((row) => ({ ...row, page: Number(row.match[1]) }))
      .sort((left, right) => left.page - right.page);
    assert.deepEqual(freshFiles.map((row) => row.page),
      Array.from({ length: pages.length }, (_, index) => index + 1),
      `${label}: fresh Poppler replay did not cover every PDF page exactly once`);

    const recomputed = [];
    for (const [index, page] of pages.entries()) {
      const row = rasterRows[index];
      const recordedPng = fs.readFileSync(abs(row.file));
      const freshPng = fs.readFileSync(path.join(tempDir, freshFiles[index].name));
      assert.equal(recordedPng.subarray(0, 8).toString("hex"), "89504e470d0a1a0a",
        `${label}/page ${index + 1}: recorded raster is not PNG`);
      assert.equal(freshPng.subarray(0, 8).toString("hex"), "89504e470d0a1a0a",
        `${label}/page ${index + 1}: fresh Poppler replay is not PNG`);
      assert.equal(freshPng.equals(recordedPng), true,
        `${label}/page ${index + 1}: fresh Poppler PNG bytes differ from recorded raster`);
      const [recordedMetadata, freshMetadata] = await Promise.all([
        sharp(recordedPng).metadata(), sharp(freshPng).metadata(),
      ]);
      const { channels } = await sharp(freshPng).greyscale().stats();
      const looksBlank = channels[0].max - channels[0].min <= 6;
      const expected = pageGeometry
        ? expectedDimensionsFromPageGeometry(page)
        : expectedRasterDimensions(page);
      const live = {
        page: index + 1, sha256: sha256(freshPng), byteLength: freshPng.length,
        widthPx: freshMetadata.width, heightPx: freshMetadata.height,
        expectedWidthPx: expected.widthPx, expectedHeightPx: expected.heightPx,
        looksBlank,
      };
      assert.equal(sha256(recordedPng), row.sha256,
        `${label}/page ${index + 1}: recorded raster hash drift`);
      assert.equal(recordedPng.length, row.byteLength,
        `${label}/page ${index + 1}: recorded raster byte length drift`);
      assert.equal(live.sha256, row.sha256,
        `${label}/page ${index + 1}: fresh Poppler raster hash differs from recorded evidence`);
      assert.equal(live.byteLength, row.byteLength,
        `${label}/page ${index + 1}: fresh Poppler raster byte length differs from recorded evidence`);
      assert.equal(recordedMetadata.width, row.widthPx,
        `${label}/page ${index + 1}: recorded width drift`);
      assert.equal(recordedMetadata.height, row.heightPx,
        `${label}/page ${index + 1}: recorded height drift`);
      assert.equal(live.widthPx, row.widthPx,
        `${label}/page ${index + 1}: fresh Poppler width differs from recorded evidence`);
      assert.equal(live.heightPx, row.heightPx,
        `${label}/page ${index + 1}: fresh Poppler height differs from recorded evidence`);
      assert.ok(Math.abs(live.widthPx - expected.widthPx) <= 1,
        `${label}/page ${index + 1}: raster width differs from live PDF geometry`);
      assert.ok(Math.abs(live.heightPx - expected.heightPx) <= 1,
        `${label}/page ${index + 1}: raster height differs from live PDF geometry`);
      assert.equal(looksBlank, false, `${label}/page ${index + 1}: fresh raster pixels are blank`);
      assert.equal(row.engine, rasterIdentity.engine, `${label}/page ${index + 1}: raster engine drift`);
      assert.equal(row.engineVersion, rasterIdentity.version,
        `${label}/page ${index + 1}: raster engine version drift`);
      assert.equal(row.dpi, RASTER_DPI, `${label}/page ${index + 1}: raster DPI drift`);
      recomputed.push(live);
    }
    return { pdfSha256: sha256(pdfBytes), pageCount: pages.length, pages: recomputed,
      freshPopplerReplay: true };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function rasterizeArtifacts(familyId, artifacts) {
  const rasterIdentity = popplerRasterIdentity();
  const all = [];
  for (const artifact of artifacts) {
    const rasterDir = `${outputDir(familyId)}/raster/aoc-crem3f-${artifact.fixture}`;
    const pages = await rasterizeWithPoppler({
      file: artifact.file, outDir: rasterDir,
      expectedPageCount: AZ_SOURCE.pageCount, prefix: "page", rasterIdentity,
    });
    assert.equal(pages.length, AZ_SOURCE.pageCount, `${artifact.fixture}: not every page rastered`);
    for (const page of pages) {
      assert.equal(page.looksBlank, false, `${artifact.fixture}/page ${page.page}: raster looks blank`);
      assert.equal(page.croppedToPage, true, `${artifact.fixture}/page ${page.page}: raster not cropped`);
      all.push({ fixture: artifact.fixture, ...page });
    }
  }
  return { identity: rasterIdentity, dpi: RASTER_DPI, pages: all };
}

function clearAzCompletionClaims(out) {
  const ownedAzRoot = `${abs("data/rcap-all50/overlays/census-v1/az")}${path.sep}`;
  assert.ok(abs(out).startsWith(ownedAzRoot), `refusing to clear claims outside assigned AZ roots: ${out}`);
  for (const file of ["approval-request.json", "build-findings.json"]) {
    fs.rmSync(abs(`${out}/${file}`), { force: true });
  }
}

async function buildAz(familyId, config) {
  const out = outputDir(familyId);
  clearAzCompletionClaims(out);
  try {
  const { resolved } = resolveSources(familyId);
  const [{ bytes }] = resolved;
  const census = await measureAzDocument(bytes);
  const { fields, anchors, explicitMappings, map } = azMapAndAnchors(familyId, config, census);
  writeJson(`${out}/source-receipt.json`, sourceReceipt(familyId, resolved));
  writeJson(`${out}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId, routeKeys: [...config.routeKeys], jurisdiction: "AZ",
    documentId: AZ_SOURCE.documentId, formNumber: AZ_SOURCE.formNumber,
    sourceSha256: AZ_SOURCE.sha256,
    measurementBasis: {
      source: "exact official source bytes rebound by SHA-256 and byte length on this run",
      structuralClass: "flat_pdf", derivativesUsed: false,
      textAndUnderscoreInstrument: "scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs",
      pathRuleInstrument: "scripts/rcap-official-forms/rcap-pdf-rule-lines.mjs (CTM-tracking)",
      strokedBoxInstrument: "scripts/lib/pdf-stroked-boxes.mjs (CTM-tracking, decoded streams)",
      coordinateSystem: "PDF points, origin bottom-left",
    },
    pageCount: census.pages.length, acroFormFieldCount: 0,
    measuredBlankCount: census.fields.length,
    measuredPrintedControlCount: census.controls.length,
    pages: census.pages, fields: census.fields, controls: census.controls,
  });
  writeJson(`${out}/production-field-map.json`, map);
  writeText(`${out}/participant-instructions.md`, westParticipantInstructions(familyId, map));

  const artifacts = [];
  const actualReports = [];
  for (const [fixture, facts] of [["canonical", CANONICAL], ["boundary", BOUNDARY]]) {
    const result = await finalizeFlatOverlay({
      sourceBytes: bytes, expectedSha256: AZ_SOURCE.sha256, anchors,
      selections: [], protectedRules: [], explicitMappings, facts,
      documentTextLines: census.documentTextLines, title: AZ_SOURCE.officialTitle,
    });
    const file = `${out}/fixtures/aoc-crem3f-${fixture}-filled.pdf`;
    fs.mkdirSync(path.dirname(abs(file)), { recursive: true });
    fs.writeFileSync(abs(file), result.bytes);
    const proof = await verifyAzArtifact({
      sourceBytes: bytes, outputFile: file, outputBytes: result.bytes,
      anchors, fields, controls: census.controls, report: result.report, fixture,
    });
    /*
     * FIX01/RT-1, requiredComponentsMissing. The artifact rows named no
     * document, so the component the source receipt and the field map declare
     * -- AZ-AOC-CREM3F-PETITION-TO-EXPUNGE-MARIJUANA-RECORDS-SUPERIOR-COURT --
     * matched no rendered artifact and was counted missing, on a packet that
     * renders it twice.
     */
    artifacts.push({ fixture, file, sha256: proof.sha256, byteLength: proof.byteLength,
      pageCount: AZ_SOURCE.pageCount,
      documentId: AZ_SOURCE.documentId, formNumber: AZ_SOURCE.formNumber,
      valuesWrittenFromOutputBytes: proof.writes.filter((row) => row.textReadFromOutputBytes).length,
      finalizerRefusals: proof.finalizerRefused.length });
    actualReports.push(proof);
  }
  const raster = await rasterizeArtifacts(familyId, artifacts);
  writeJson(`${out}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-from-output-bytes/v1", familyId,
    method: "Exact source glyphs are subtracted from finished-PDF glyphs by page/x/y/character. Remaining glyphs are attributed only inside a measured write box; no finalizer assertion substitutes for this byte-derived record.",
    artifacts: actualReports,
  });
  writeJson(`${out}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId,
    renderedFresh: true, sourceSha256: AZ_SOURCE.sha256, artifacts,
    rasterTool: raster.identity,
    rasterEngine: raster.identity.engine, rasterEngineVersion: raster.identity.version,
    rasterDpi: raster.dpi,
    everyPageRastered: raster.pages.length === artifacts.length * AZ_SOURCE.pageCount,
    rasters: raster.pages,
  });
  /*
   * FIX01/RT-1. This builder writes product-wiring.json fresh, and the route
   * `binding` block is written by
   * scripts/grade-a-packet-factory-24h/generate-product-wiring.mjs afterwards.
   * A rebuild therefore silently deleted the binding every terminalized family
   * was given, on every family on this host. It is preserved and its
   * instructions pointer refreshed, rather than dropped and regenerated later
   * by a lane that may not run.
   */
  const azWiringPath = `${out}/product-wiring.json`;
  const azPreservedBinding = fs.existsSync(abs(azWiringPath))
    ? readJson(azWiringPath).binding ?? null
    : null;
  writeJson(azWiringPath, {
    schemaVersion: "rcap-family-product-wiring/v1", familyId,
    routeKeys: [...config.routeKeys], implementationStrategy: "official_pdf_fill",
    renderStrategy: "flat_pdf_measured_overlay",
    fieldMap: `${out}/production-field-map.json`, ...GATES,
    createsFulfillmentRecord: false, opensCommercialRoute: false,
    note: "This record names build artifacts only. It grants no runtime, commercial, fulfillment, eligibility, or approval authority.",
    ...(azPreservedBinding ? {
      binding: {
        ...azPreservedBinding,
        instructions: fs.existsSync(abs(`${out}/participant-instructions.md`))
          ? `${out}/participant-instructions.md`
          : azPreservedBinding.instructions ?? null,
      },
    } : {}),
  });
  await azCompletionEvidenceReady(familyId, config);
  writeJson(`${out}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1", familyId,
    routeKeys: [...config.routeKeys], status: "REQUESTED", grantedBy: null, ...GATES,
    sourceFidelityEstablished: true, outputLegalApprovalEstablished: false,
    independentVisualReviewEstablished: false,
    note: "Canonical and boundary artifacts were built and byte-checked, but this file only requests output-level legal and independent visual review. It grants neither and opens no route.",
    reviewerQuestions: [
      "Confirm the route-specific treatment of the two case-number blanks: filled for the superior-court route and left for court assignment on the arrest-no-charges route.",
      "Confirm that every printed bracket election, conditional court/prosecutor field, signature/date line, and attorney block remains participant- or official-completed.",
      "Confirm source currency for the held SOURCE-GATED AOC-CREM3F revision bound in source-receipt.json.",
    ],
  });
  writeJson(`${out}/build-findings.json`, {
    schemaVersion: "rcap-build-findings/v1", familyId,
    status: "BUILT_REVIEW_REQUIRED", ...GATES, blocking: [],
    observations: [
      "AOC-CREM3F is a flat three-page PDF with 31 measured blank segments and 19 printed bracket controls; it has zero AcroForm fields.",
      config.variant === "arrest_no_charges"
        ? "The two case-number blanks are explicitly refused on this route because its route record says the court assigns the case number."
        : "The two case-number blanks are explicitly mapped to matter.case_number on this superior-court route.",
      "No printed bracket control is marked. No signature, signature date, law-enforcement/prosecutor agency, court-identity, clerk, or attorney field is offered as an anchor.",
      "Every added text glyph in both fixture PDFs was read from the finished bytes and attributed to a measured write box; every page was rastered with version-identified Poppler pdftoppm at 72 dpi.",
    ],
    stillRequired: ["Output-level legal approval.", "Independent human visual review.",
      "Source-currency review for the held SOURCE-GATED revision."],
  });
  await checkAz(familyId, config, { quiet: true });
  console.log(`BUILD_OK ${familyId} artifacts=2 rasters=${raster.pages.length}`);
  } catch (error) {
    clearAzCompletionClaims(out);
    throw error;
  }
}

function commandProbe(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 15_000 });
  return {
    command: [command, ...args].join(" "), available: !result.error && result.status === 0,
    exitStatus: result.status, errorCode: result.error?.code ?? null,
    stdout: String(result.stdout ?? "").trim().slice(0, 500),
    stderr: String(result.stderr ?? "").trim().slice(0, 500),
  };
}

function probeRepositoryQpdfPath() {
  const repositoryPikepdfReader = "scripts/census-v1-ca-1203-4-set/census-official-fields.py";
  const pythonCandidates = pikepdfPythonCandidates();
  const pythonAttempts = pythonCandidates.map((python) => commandProbe(python, [
    "-c", "import pikepdf; print(pikepdf.__version__); print(pikepdf.__libqpdf_version__)",
  ]));
  const qpdf = commandProbe("qpdf", ["--version"]);
  return {
    attemptedFirst: true, repositoryPikepdfReader,
    repositoryPikepdfReaderPresent: fs.existsSync(abs(repositoryPikepdfReader)),
    repositoryReaderRequirement: "The repository reader states that pikepdf/qpdf is required because pdf-lib 1.17.1 cannot open these inputs.",
    pythonAttempts, pikepdfAvailable: pythonAttempts.some((attempt) => attempt.available),
    qpdf, qpdfAvailable: qpdf.available,
    repositoryRescueScript: "scripts/rescue-encrypted-rcap-pdfs.mjs",
    repositoryRescueScriptPresent: fs.existsSync(abs("scripts/rescue-encrypted-rcap-pdfs.mjs")),
    note: "The rescue script was not run because it writes a shared rescue directory outside this worker's authorized paths. Availability was probed read-only instead.",
  };
}

async function probeCaSources(resolved) {
  const repositoryPath = probeRepositoryQpdfPath();
  const sourceAttempts = [];
  const successfulCensus = [];
  for (const { source, bytes } of resolved) {
    let pdfLib;
    try {
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
      const fields = pdf.getForm().getFields();
      pdfLib = { readable: true, pageCount: pdf.getPageCount(), acroFormFieldCount: fields.length,
        pageGeometry: pdf.getPages().map((page, index) => ({ page: index + 1, ...page.getSize() })) };
      successfulCensus.push({ formNumber: source.formNumber, ...pdfLib });
    } catch (error) { pdfLib = { readable: false, errorName: error.name, errorMessage: error.message }; }
    let rasterHelper;
    try {
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
      rasterHelper = { readable: true, pageGeometry: pdf.getPages().map((page, index) => ({
        page: index + 1, ...page.getSize(),
      })) };
    }
    catch (error) { rasterHelper = { readable: false, errorName: error.name, errorMessage: error.message }; }
    sourceAttempts.push({
      formNumber: source.formNumber, documentId: source.documentId,
      sourceSha256: source.sha256, pdfHeader: bytes.subarray(0, 12).toString("latin1"),
      rawBytesContainEncryptToken: bytes.includes(Buffer.from("/Encrypt", "latin1")),
      pdfLib, repositoryRasterHelper: rasterHelper,
    });
  }
  return { repositoryPath, sourceAttempts, successfulCensus };
}

function caUnblockCondition(formNumbers) {
  return [
    `For every exact receipt hash in this family (${formNumbers.join(", ")}), provide an executable pikepdf/qpdf path or a source-derived repaired PDF with provenance back to that exact hash.`,
    "Re-census every terminal AcroForm/XFA field, widget rectangle, page, field flag, option, and button appearance state from the exact official bytes or proven source-derived repair.",
    "Implement a fill path that preserves official page content and form semantics, then pass canonical and boundary output-byte verification with all signature/date, service, court, clerk, prosecutor, and agency fields blank.",
    `Raster every page of every finished packet component with bundled Poppler pdftoppm at ${RASTER_DPI} dpi and make this family's --check recompute PDF coverage, PNG hashes, dimensions, and blankness.`,
    "All preceding conditions must be satisfied in one source-bound build; dependency availability alone does not unblock completion.",
  ];
}

async function buildCaStop(familyId, config) {
  const out = outputDir(familyId);
  const { resolved } = resolveSources(familyId);
  const probe = await probeCaSources(resolved);
  writeJson(`${out}/source-receipt.json`, sourceReceipt(familyId, resolved));
  if (probe.successfulCensus.length > 0) {
    writeJson(`${out}/field-census.census-v1.json`, {
      schemaVersion: "rcap-official-form-field-census/v1-census-v1",
      familyId, status: "PARTIAL_STOP_EVIDENCE",
      note: "Only exact-byte sources pdf-lib could read are listed. Partial evidence grants no fill authority and does not make the family complete.",
      forms: probe.successfulCensus,
    });
  }
  const exactUnblockCondition = caUnblockCondition(config.formNumbers);
  writeJson(`${out}/build-findings.json`, {
    schemaVersion: "rcap-build-findings/v1", familyId,
    status: "STOPPED_SOURCE_BOUND", ...GATES,
    sourceBinding: "EXACT_RECOMPUTED", sourceReaderAttempts: probe,
    successfulFirstHandCensusCount: probe.successfulCensus.length,
    safeExactOfficialFillPathAvailable: false,
    safeExactOfficialRasterPathAvailable: probe.sourceAttempts.every((attempt) => attempt.repositoryRasterHelper.readable),
    productionFieldMapProduced: false, filledArtifactsProduced: false,
    byteDerivedActualWritesProduced: false, renderedArtifactsProduced: false,
    blocking: [{
      code: "CA_EXACT_OFFICIAL_PDF_FILL_PATH_UNAVAILABLE",
      summary: "The exact official source PDFs cannot be safely filled in this environment: the repository pikepdf/qpdf dependency path is unavailable and pdf-lib cannot open the source bytes.",
      exactUnblockCondition,
    }],
    refusal: "No fixtures, production map, actual-writes report, rendered-artifacts report, or page rasters were fabricated from substitute fixtures or unproven derivatives.",
  });
  writeJson(`${out}/product-wiring.json`, {
    schemaVersion: "rcap-family-product-wiring/v1", familyId,
    routeKeys: [...config.routeKeys], implementationStrategy: "official_pdf_fill",
    status: "STOPPED_NO_SAFE_FILL_PATH", ...GATES,
    createsFulfillmentRecord: false, opensCommercialRoute: false, fieldMap: null,
  });
  writeJson(`${out}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1", familyId,
    routeKeys: [...config.routeKeys], status: "REFUSED_TO_REQUEST_COMPLETION_APPROVAL",
    completionRefused: true, approvalRequested: false, grantedBy: null, ...GATES,
    reason: "There is no source-bound production field map or finished artifact to approve. Requesting completion approval would misstate the build state.",
    exactUnblockCondition,
  });
  await checkCaStop(familyId, config, { quiet: true });
  console.log(`STOP_EVIDENCE_OK ${familyId} sources=${resolved.length}`);
}

function resetOwnedCaOutput(familyId) {
  const config = requireFamily(familyId);
  assert.equal(config.jurisdiction, "ca");
  const relative = outputDir(familyId);
  const absolute = abs(relative);
  const caRoot = `${abs("data/rcap-all50/overlays/census-v1/ca")}${path.sep}`;
  assert.ok(absolute.startsWith(caRoot), `refusing to reset a path outside the assigned CA root: ${absolute}`);
  assert.ok(path.basename(absolute) === `${familyId}--official-pdf-fill`,
    `refusing to reset a non-family path: ${absolute}`);
  fs.rmSync(absolute, { recursive: true, force: true });
  fs.mkdirSync(absolute, { recursive: true });
}

function clearCaCompletionClaims(familyId) {
  const config = requireFamily(familyId);
  assert.equal(config.jurisdiction, "ca");
  const out = outputDir(familyId);
  const absolute = abs(out);
  const caRoot = `${abs("data/rcap-all50/overlays/census-v1/ca")}${path.sep}`;
  assert.ok(absolute.startsWith(caRoot),
    `refusing to clear claims outside the assigned CA root: ${absolute}`);
  assert.equal(path.basename(absolute), `${familyId}--official-pdf-fill`,
    `refusing to clear claims for a non-family path: ${absolute}`);
  for (const file of ["approval-request.json", "build-findings.json"]) {
    fs.rmSync(abs(`${out}/${file}`), { force: true });
  }
}

function pdfFormState(pdf) {
  const acroRef = pdf.catalog.get(PDFName.of("AcroForm"));
  if (!acroRef) return { acroFormPresent: false, xfaPresent: false };
  const acro = pdf.context.lookup(acroRef);
  return {
    acroFormPresent: true,
    xfaPresent: typeof acro?.has === "function" && acro.has(PDFName.of("XFA")),
  };
}

async function finalizeCaFixture(options) {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args.map(String).join(" ");
    warnings.push(message);
    originalWarn(...args);
  };
  try {
    const result = await finalizeOfficialForm(options);
    return { ...result, pdfLibWarnings: warnings };
  } finally {
    console.warn = originalWarn;
  }
}

function measuredSelectionsForVariant(formCensus, variant) {
  return variant.selections.map((selection) => {
    const field = formCensus.fields.find((candidate) => candidate.name === selection.fieldName);
    assert.ok(field, `${variant.variantId}: exact statutory control ${selection.fieldName} is absent`);
    assert.equal(field.fieldType, "/Btn", `${selection.fieldName}: statutory control is not a button`);
    const widget = field.widgets.find((candidate) => candidate.onStates?.includes(selection.onState));
    assert.ok(widget, `${selection.fieldName}: AP/N on-state ${selection.onState} is absent`);
    assert.ok(Number.isInteger(widget.pageIndex), `${selection.fieldName}: widget page is unresolved`);
    const [x0, y0, x1, y1] = widget.rect;
    return {
      fieldName: selection.fieldName,
      label: selection.fieldName,
      tooltip: field.tooltip,
      onState: selection.onState,
      page: widget.pageIndex + 1,
      box: { x0, y0, x1, y1 },
      measured: true,
      measurementBasis: "exact official terminal widget /Rect with AP/N on-state read first-hand by pikepdf",
    };
  });
}

function measuredRouteTextControlsForVariant(formCensus, variant) {
  return Object.entries(variant.textControls).map(([fieldName, factId]) => {
    const field = formCensus.fields.find((candidate) => candidate.name === fieldName);
    assert.ok(field, `${variant.variantId}: exact statutory text control ${fieldName} is absent`);
    assert.equal(field.fieldType, "/Tx", `${fieldName}: statutory text control is not a text field`);
    assert.match(String(field.tooltip ?? ""), /eligible\s+for\s+reduction.+yes\s+or\s+no/i,
      `${fieldName}: statutory yes/no tooltip drifted`);
    assert.equal(field.widgets.length, 1, `${fieldName}: statutory text control must have one widget`);
    const widget = field.widgets[0];
    assert.ok(Number.isInteger(widget.pageIndex), `${fieldName}: widget page is unresolved`);
    const [x0, y0, x1, y1] = widget.rect;
    const value = variant.controlFacts[factId];
    assert.match(String(value ?? ""), /^(?:yes|no)$/,
      `${variant.variantId}/${fieldName}: statutory control value must be exactly yes or no`);
    return {
      fieldName, factId, value: String(value).toLowerCase(), tooltip: field.tooltip,
      page: widget.pageIndex + 1,
      rect: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 },
      measurementBasis: "exact official terminal widget /Rect and statutory yes/no tooltip read first-hand by pikepdf",
    };
  });
}

async function overlayCaRouteTextControls(sourceBytes, measuredControls, variant) {
  if (measuredControls.length === 0) {
    return {
      bytes: sourceBytes,
      report: { variantId: variant.variantId, sourceSha256: sha256(sourceBytes), written: [],
        refused: [], outputSha256: sha256(sourceBytes), outputBytes: sourceBytes.length },
    };
  }
  const pdf = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  const written = [];
  for (const control of measuredControls) {
    const page = pages[control.page - 1];
    assert.ok(page, `${variant.variantId}/${control.fieldName}: measured page is absent`);
    const size = 8;
    const textWidth = font.widthOfTextAtSize(control.value, size);
    assert.ok(textWidth <= control.rect.width - 4,
      `${variant.variantId}/${control.fieldName}: statutory yes/no value does not fit`);
    const x = control.rect.x + 2;
    const y = control.rect.y + Math.max(1.5, (control.rect.height - size) / 2);
    page.drawText(control.value, { x, y, size, font });
    written.push({
      field: control.fieldName, factId: control.factId, value: control.value,
      tooltip: control.tooltip, page: control.page, rect: control.rect,
      draw: { x: round(x), y: round(y), fontSize: size },
      measurementBasis: control.measurementBasis,
    });
  }
  const bytes = Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
  const active = scanBytesForActiveContent(bytes);
  assert.equal(active.inspectable, true, `${variant.variantId}: route-text overlay is not byte-inspectable`);
  assert.deepEqual(active.hits, [], `${variant.variantId}: route-text overlay introduced active content`);
  return {
    bytes,
    report: {
      variantId: variant.variantId, sourceSha256: sha256(sourceBytes), written, refused: [],
      activeContentScan: active, outputSha256: sha256(bytes), outputBytes: bytes.length,
    },
  };
}

async function overlayCaExactMappedFacts({ bytes, formCensus, explicitMappings, facts, report }) {
  const alreadyWritten = new Set(report.written.map((row) => row.field));
  const duplicateLosers = new Set(report.refused
    .filter((row) => row.reason === "duplicate_widget_for_one_slot")
    .map((row) => row.field));
  const pending = Object.entries(explicitMappings)
    .filter(([fieldName]) => !alreadyWritten.has(fieldName) && !duplicateLosers.has(fieldName));
  if (pending.length === 0) return { bytes, report };

  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const written = [];
  const refused = [];
  for (const [fieldName, factId] of pending) {
    const field = formCensus.fields.find((candidate) => candidate.name === fieldName);
    assert.ok(field, `${fieldName}: exact mapped field is absent from the first-hand census`);
    if (field.fieldType !== "/Tx") {
      refused.push({ field: fieldName, factId, reason: "exact_mapping_requires_text_field" });
      continue;
    }
    const value = resolveFact(facts, factId);
    if (value == null || String(value).trim() === "") {
      refused.push({ field: fieldName, factId, reason: "no_value_for_exact_mapping" });
      continue;
    }
    const fittedWidgets = field.widgets.map((widget, widgetIndex) => {
      assert.ok(Number.isInteger(widget.pageIndex), `${fieldName}: widget page is unresolved`);
      const [x0, y0, x1, y1] = widget.rect;
      const rect = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
      return {
        widget, widgetIndex, rect,
        fit: fitTextToWidget({
          font, text: String(value), rect,
          multiline: field.flags?.includes("multiline") === true,
          maxFontSize: 9, minFontSize: 6,
        }),
      };
    });
    const failed = fittedWidgets.find(({ fit }) => fit.outcome === "refused");
    if (failed) {
      refused.push({ field: fieldName, factId, reason: failed.fit.reason,
        widget: failed.widgetIndex });
      continue;
    }
    const widgetWrites = [];
    for (const { widget, widgetIndex, rect, fit } of fittedWidgets) {
      const page = pdf.getPages()[widget.pageIndex];
      assert.ok(page, `${fieldName}: measured widget page ${widget.pageIndex + 1} is absent`);
      // The previous writer used page.drawText, which emits bare text
      // operators into the page content stream. Every artifact-evidence
      // reader on this host — pdf-flattened-widgets.mjs, verifyCaArtifact,
      // the packet-completeness verifier — decodes participant ink
      // exclusively from `q <cm> /XObject Do` appearance placements, so an
      // overlay write was reported by the finalizer yet ABSENT from the
      // decoded flattened appearances, and buildCa aborted on its own
      // missing-ink assertion (CR-180's ConvictionDate hit exactly this: the
      // ink sat in page content stream 17 while drawnAt read nothing at the
      // widget rectangle). This writer emits the same construction
      // form.flatten() does — a Form XObject in widget-local coordinates,
      // placed at the measured rectangle — with the identical baseline
      // arithmetic, inset, font and ink the drawText writer used, so the mark
      // lands exactly where it always did and now also exists as an
      // appearance stream the evidence layer can decode. (This is the east
      // host's proven placeExactFactAppearance pattern.)
      const n = (v) => +Number(v).toFixed(3);
      const lineHeight = fit.fontSize * 1.15;
      const firstBaseline = fit.lines.length === 1
        ? Math.max(1, (rect.height - fit.fontSize) / 2)
        : rect.height - fit.fontSize - 1;
      const ink = PARTICIPANT_INK_RGB;
      const content = [
        "BT",
        `${n(ink.r)} ${n(ink.g)} ${n(ink.b)} rg`,
        `/F0 ${n(fit.fontSize)} Tf`,
        ...fit.lines.flatMap((line, index) => [
          `1 0 0 1 2 ${n(firstBaseline - index * lineHeight)} Tm`,
          `${font.encodeText(line).toString()} Tj`,
        ]),
        "ET",
      ].join("\n");
      const stream = pdf.context.stream(content, {
        Type: "XObject", Subtype: "Form",
        BBox: [0, 0, n(rect.width), n(rect.height)],
        Resources: { Font: { F0: font.ref } },
      });
      const key = page.node.newXObject("ExactFactOverlay", pdf.context.register(stream));
      page.pushOperators(pushGraphicsState(), translate(n(rect.x), n(rect.y)),
        drawObject(key), popGraphicsState());
      widgetWrites.push({ widgetIndex, page: widget.pageIndex + 1, rect,
        fontSize: fit.fontSize, outcome: fit.outcome,
        renderedAs: "form_xobject_appearance", xObject: key.toString() });
    }
    written.push({ field: fieldName, factId, value: String(value),
      kind: "exact_measured_fact_overlay", widgets: widgetWrites });
  }

  if (written.length === 0) {
    return { bytes, report: { ...report, exactMappingOverlay: { written, refused } } };
  }
  const output = Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
  const active = scanBytesForActiveContent(output);
  assert.equal(active.inspectable, true, "CA exact-mapping overlay is not byte-inspectable");
  assert.deepEqual(active.hits, [], "CA exact-mapping overlay introduced active content");
  const writtenNames = new Set(written.map((row) => row.field));
  return {
    bytes: output,
    report: {
      ...report,
      written: [...report.written, ...written],
      refused: report.refused.filter((row) => !writtenNames.has(row.field)),
      protectedFields: (report.protectedFields ?? [])
        .filter((row) => !writtenNames.has(row.field)),
      expectedValues: [...(report.expectedValues ?? []),
        ...written.map((row) => String(resolveFact(facts, row.factId)))],
      outputSha256: sha256(output), outputBytes: output.length,
      exactMappingOverlay: { written, refused, activeContentScan: active,
        sourceSha256: sha256(bytes), outputSha256: sha256(output), outputBytes: output.length },
    },
  };
}

async function finalizeCaPrimaryFixture({ formCensus, variant, officialOptions }) {
  const finalized = await finalizeCaFixture(officialOptions);
  const exactMapped = await overlayCaExactMappedFacts({
    bytes: finalized.bytes, formCensus,
    explicitMappings: officialOptions.explicitMappings,
    facts: officialOptions.facts, report: finalized.report,
  });
  const official = { ...finalized, bytes: exactMapped.bytes, report: exactMapped.report };
  const measuredRouteTextControls = measuredRouteTextControlsForVariant(formCensus, variant);
  const routed = await overlayCaRouteTextControls(official.bytes, measuredRouteTextControls, variant);
  const measuredSelections = measuredSelectionsForVariant(formCensus, variant);
  if (measuredSelections.length === 0) {
    return { ...official, bytes: routed.bytes, routeTextReport: routed.report,
      selectionReport: { selections: [], selectionsRefused: [] },
      measuredRouteTextControls, measuredSelections };
  }
  const selected = await finalizeFlatOverlay({
    sourceBytes: routed.bytes,
    expectedSha256: sha256(routed.bytes),
    anchors: [], selections: measuredSelections, protectedRules: [],
    explicitMappings: {}, facts: {}, documentTextLines: [],
    title: officialOptions.title,
  });
  assert.equal(selected.report.selections.length, measuredSelections.length,
    `${variant.variantId}: not every exact statutory control was marked`);
  assert.deepEqual(selected.report.selectionsRefused, [],
    `${variant.variantId}: an exact statutory control was refused`);
  return {
    bytes: selected.bytes, report: official.report,
    pdfLibWarnings: official.pdfLibWarnings,
    routeTextReport: routed.report, selectionReport: selected.report,
    measuredRouteTextControls, measuredSelections,
  };
}

async function strokedLineSegmentsFromBytes(bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const segments = [];
  const number = "(-?(?:\\d+(?:\\.\\d*)?|\\.\\d+))";
  const pattern = new RegExp(`${number}\\s+${number}\\s+m\\s+${number}\\s+${number}\\s+l\\s+S`, "g");
  pdf.getPages().forEach((page, index) => {
    const content = decodedPageContent(pdf, page);
    let match;
    while ((match = pattern.exec(content))) {
      segments.push({ page: index + 1, x0: Number(match[1]), y0: Number(match[2]),
        x1: Number(match[3]), y1: Number(match[4]) });
    }
  });
  return segments;
}

function segmentMatches(segment, expected, tolerance = 0.2) {
  const direct = Math.abs(segment.x0 - expected.x0) <= tolerance
    && Math.abs(segment.y0 - expected.y0) <= tolerance
    && Math.abs(segment.x1 - expected.x1) <= tolerance
    && Math.abs(segment.y1 - expected.y1) <= tolerance;
  const reversed = Math.abs(segment.x1 - expected.x0) <= tolerance
    && Math.abs(segment.y1 - expected.y0) <= tolerance
    && Math.abs(segment.x0 - expected.x1) <= tolerance
    && Math.abs(segment.y0 - expected.y1) <= tolerance;
  return direct || reversed;
}

function xMarkSegments(box, inset = 2) {
  return [
    { x0: box.x0 + inset, y0: box.y0 + inset, x1: box.x1 - inset, y1: box.y1 - inset },
    { x0: box.x0 + inset, y0: box.y1 - inset, x1: box.x1 - inset, y1: box.y0 + inset },
  ];
}

function proveStatutorySelectionsFromOutput({ outputSegments, formCensus, variant, selectionReport, label }) {
  const selected = new Set(variant.selections.map((selection) => selection.fieldName));
  const proofs = [];
  for (const measured of measuredSelectionsForVariant(formCensus, variant)) {
    const reportRow = selectionReport.selections.find((row) => row.control === measured.fieldName);
    assert.ok(reportRow, `${label}/${measured.fieldName}: selection finalizer report is absent`);
    const expected = xMarkSegments(measured.box, reportRow.inset);
    const observed = expected.map((wanted) => outputSegments.filter((segment) =>
      segment.page === measured.page && segmentMatches(segment, wanted)));
    assert.ok(observed.every((matches) => matches.length >= 1),
      `${label}/${measured.fieldName}: exact measured X mark is absent from output bytes`);
    proofs.push({ fieldName: measured.fieldName, page: measured.page, box: measured.box,
      onState: measured.onState, expectedSegments: expected,
      outputSegments: observed.map((matches) => matches[0]) });
  }
  const protectedButtonsWithAddedMarks = [];
  for (const field of formCensus.fields.filter((candidate) =>
    candidate.fieldType === "/Btn" && !candidate.flags?.includes("pushButton") && !selected.has(candidate.name))) {
    for (const widget of field.widgets) {
      if (!Number.isInteger(widget.pageIndex)) continue;
      const [x0, y0, x1, y1] = widget.rect;
      const expected = xMarkSegments({ x0, y0, x1, y1 });
      if (expected.every((wanted) => outputSegments.some((segment) =>
        segment.page === widget.pageIndex + 1 && segmentMatches(segment, wanted)))) {
        protectedButtonsWithAddedMarks.push({ fieldName: field.name, page: widget.pageIndex + 1,
          rect: widget.rect });
      }
    }
  }
  assert.deepEqual(protectedButtonsWithAddedMarks, [],
    `${label}: an unselected/protected button carries an added X mark`);
  return { selectedControls: proofs, protectedButtonsWithAddedMarks };
}

async function proveRouteTextControlsFromOutput({ outputBytes, formCensus, variant, routeTextReport, label }) {
  const measured = measuredRouteTextControlsForVariant(formCensus, variant);
  if (measured.length === 0) {
    if (routeTextReport) {
      assert.equal(routeTextReport.variantId, variant.variantId, `${label}: empty statutory text variant drift`);
      assert.deepEqual(routeTextReport.written, [], `${label}: unexpected statutory text write`);
      assert.deepEqual(routeTextReport.refused, [], `${label}: unexpected statutory text refusal`);
    }
    return { controls: [], everyControlObservedExactly: true };
  }
  assert.ok(routeTextReport, `${label}: statutory text-control report is absent`);
  assert.equal(routeTextReport.variantId, variant.variantId, `${label}: statutory text variant drift`);
  assert.equal(routeTextReport.written.length, measured.length,
    `${label}: statutory text-control report count drift`);
  assert.deepEqual(routeTextReport.refused, [], `${label}: a statutory text control was refused`);
  if (variant.selections.length === 0) {
    assert.equal(routeTextReport.outputSha256, sha256(outputBytes),
      `${label}: statutory text-control output hash drift`);
    assert.equal(routeTextReport.outputBytes, outputBytes.length,
      `${label}: statutory text-control output byte length drift`);
  }
  const pdf = await PDFDocument.load(outputBytes, { ignoreEncryption: true, updateMetadata: false });
  const proof = measured.map((control) => {
    const page = pdf.getPages()[control.page - 1];
    const glyphs = extractTextItems(page).flatMap((item) => (item.chars ?? [])
      .filter((character) => character.x + character.w >= control.rect.x - 0.5
        && character.x <= control.rect.x + control.rect.width + 0.5
        && item.y >= control.rect.y - 1
        && item.y <= control.rect.y + control.rect.height + 1)
      .map((character) => ({ x: character.x, c: character.c })))
      .sort((left, right) => left.x - right.x);
    const textReadFromOutputBytes = glyphs.map((glyph) => glyph.c).join("").trim();
    assert.equal(proofText(textReadFromOutputBytes), proofText(control.value),
      `${label}/${control.fieldName}: exact statutory yes/no value is absent from output bytes`);
    const reportRow = routeTextReport.written.find((row) => row.field === control.fieldName);
    assert.ok(reportRow, `${label}/${control.fieldName}: statutory text report row is absent`);
    assert.equal(reportRow.factId, control.factId, `${label}/${control.fieldName}: route fact drift`);
    assert.equal(proofText(reportRow.value), proofText(control.value),
      `${label}/${control.fieldName}: route report value drift`);
    return { ...control, textReadFromOutputBytes, outputGlyphCount: glyphs.length };
  });
  return { controls: proof, everyControlObservedExactly: proof.length === measured.length };
}

async function verifyCaArtifact({ familyId, formNumber, formCensus, fieldMap,
  outputFile, outputBytes, report, facts, fixture, variant, routeTextReport,
  selectionReport, pdfLibWarnings }) {
  const drawn = await flattenedWidgets(abs(outputFile));
  const writtenByName = new Map(report.written.map((row) => [row.field, row]));
  const refusedByName = new Map(report.refused.map((row) => [row.field, row]));
  const mappedByName = new Map(fieldMap.writes
    .filter((row) => row.formNumber === formNumber && !row.routeSpecific
      && row.appliesToVariants.includes(variant.variantId))
    .map((row) => [row.fieldName, row]));
  const routeTextByName = new Map(fieldMap.writes
    .filter((row) => row.formNumber === formNumber && row.routeSpecific
      && row.appliesToVariants.includes(variant.variantId))
    .map((row) => [row.fieldName, row]));
  const selectedByName = new Map(fieldMap.selections
    .filter((row) => row.formNumber === formNumber
      && row.variantSelections.some((selection) => selection.variantId === variant.variantId))
    .map((row) => [row.fieldName, row]));
  const fixtureValues = Object.entries(facts)
    .filter(([key]) => key.startsWith("participant.") || key.startsWith("matter."))
    .map(([, value]) => String(value));
  const observations = [];
  const writtenProof = [];

  for (const field of caFinalizerCensus(formCensus)) {
    const widget = field.widgets[0];
    if (!widget) continue;
    const appearances = drawnAt(drawn, { page: widget.page, rect: widget.rect, tolerance: 3 });
    const textReadFromOutputBytes = appearances.map((row) => row.text).filter((value) => value.trim()).join(" ").trim();
    const wasWritten = writtenByName.has(field.name);
    const mapped = mappedByName.get(field.name) ?? null;
    const routeText = routeTextByName.get(field.name) ?? null;
    const selected = selectedByName.get(field.name) ?? null;
    const exactField = formCensus.fields.find((candidate) => candidate.name === field.name);
    const row = {
      fieldName: field.name, page: widget.page, rect: widget.rect,
      disposition: mapped ? "WRITE" : routeText ? "ROUTE_TEXT" : selected ? "SELECT" : "REFUSE",
      factId: mapped?.factId ?? routeText?.factId ?? null,
      textReadFromOutputBytes: textReadFromOutputBytes || null,
      flattenedAppearancesReadFromOutputBytes: appearances,
      protectFromAddedInk: exactField?.fieldType !== "/Btn" || !exactField.flags?.includes("pushButton"),
    };
    observations.push(row);
    if (wasWritten) {
      assert.ok(mapped, `${fixture}/${field.name}: finalizer wrote a field absent from the production map`);
      const expected = String(facts[mapped.factId]);
      assert.equal(proofText(textReadFromOutputBytes), proofText(expected),
        `${fixture}/${field.name}: finished bytes do not carry the mapped value ${JSON.stringify(expected)}`);
      writtenProof.push(row);
    }
  }

  for (const [fieldName] of mappedByName) {
    const written = writtenByName.has(fieldName);
    const refused = refusedByName.has(fieldName);
    assert.notEqual(written, refused,
      `${fixture}/${fieldName}: each bounded primary mapping must be exactly written or fail-closed refused`);
  }
  assert.ok([...writtenByName].every(([fieldName]) => mappedByName.has(fieldName)),
    `${fixture}: finalizer wrote a field outside the bounded primary map`);
  assert.equal(writtenProof.length, report.written.length,
    `${fixture}: output-byte write proof count differs from finalizer writes`);
  const exactBindingProof = assertExactFieldBindings({
    observations,
    expectedByField: Object.fromEntries([...mappedByName]
      .filter(([fieldName]) => writtenByName.has(fieldName))
      .map(([fieldName, mapping]) =>
      [fieldName, facts[mapping.factId]])),
    fixtureValues, label: `${familyId}/${variant.variantId}/${fixture}`,
    requireEveryOtherFieldBlank: true,
  });
  const outputSegments = await strokedLineSegmentsFromBytes(outputBytes);
  const statutorySelectionProof = proveStatutorySelectionsFromOutput({
    outputSegments, formCensus, variant, selectionReport,
    label: `${familyId}/${variant.variantId}/${fixture}`,
  });
  const statutoryTextControlProof = await proveRouteTextControlsFromOutput({
    outputBytes, formCensus, variant, routeTextReport,
    label: `${familyId}/${variant.variantId}/${fixture}`,
  });
  const pdf = await PDFDocument.load(outputBytes, { ignoreEncryption: true, updateMetadata: false });
  const formState = pdfFormState(pdf);
  assert.equal(formState.xfaPresent, false, `${fixture}: finished PDF still contains XFA`);
  assert.equal(formState.acroFormPresent, false, `${fixture}: finished PDF still contains an AcroForm`);
  assert.ok(pdfLibWarnings.some((message) => message.includes("Removing XFA form data")),
    `${fixture}: the required pdf-lib XFA-removal behavior was not observed and recorded`);
  return {
    familyId, fixture, variantId: variant.variantId, routeKey: variant.routeKey,
    formNumber, outputFile,
    sha256: sha256(outputBytes), byteLength: outputBytes.length,
    pageCount: pdf.getPageCount(), formState,
    pdfLibWarnings, finalizerWritten: report.written,
    finalizerRefused: report.refused,
    selectionReport,
    flattenedAppearanceCount: drawn.length,
    writtenProof, exactBindingProof, statutorySelectionProof, routeTextReport,
    statutoryTextControlProof,
    fieldObservations: observations,
  };
}

function verifyUnchangedCaComponent({ familyId, packet, document, source, sourceBytes, formCensus, fieldMap }) {
  const outputBytes = fs.readFileSync(abs(document.file));
  assert.equal(sha256(outputBytes), source.sha256,
    `${packet.packetId}/${source.formNumber}: unchanged component hash differs from exact official source`);
  assert.equal(outputBytes.length, source.byteLength,
    `${packet.packetId}/${source.formNumber}: unchanged component bytes differ from exact official source`);
  const dispositions = fieldMap.refusals.filter((row) => row.formNumber === source.formNumber);
  assert.equal(dispositions.length, formCensus.terminalFieldCount,
    `${packet.packetId}/${source.formNumber}: every unchanged-copy field must be explicitly refused`);
  return {
    familyId, packetId: packet.packetId, fixture: packet.fixture,
    variantId: packet.variantId, routeKey: packet.routeKey,
    formNumber: source.formNumber, documentRole: source.role,
    outputFile: document.file, evidenceMode: document.evidenceMode,
    sha256: source.sha256, byteLength: sourceBytes.length,
    pageCount: formCensus.pageCount, exactOfficialBytesUnchanged: true,
    writes: [], selections: [], refusalCount: dispositions.length,
    protectedContentProof: "Output bytes are byte-identical to the exact SHA-bound official source; therefore no participant value or added ink exists in any service, signature, court, clerk, prosecutor, agency, or declaration field.",
  };
}

function bindCaProofToPacket(proof, packet, document) {
  return {
    ...proof,
    packetId: packet.packetId,
    fixture: packet.fixture,
    variantId: packet.variantId,
    routeKey: packet.routeKey,
    formNumber: document.formNumber,
    documentRole: document.role,
    evidenceMode: document.evidenceMode,
    outputFile: document.file,
  };
}

async function rasterizeCaArtifacts(familyId, artifacts) {
  const rasterIdentity = popplerRasterIdentity();
  const rasters = [];
  for (const artifact of artifacts) {
    const rasterDir = `${outputDir(familyId)}/raster/${artifact.packetId}/${artifact.formNumber.toLowerCase()}`;
    const pages = await rasterizeWithPoppler({
      file: artifact.file, outDir: rasterDir,
      expectedPageCount: artifact.pageCount,
      expectedPageGeometry: artifact.pageGeometry,
      prefix: "page", rasterIdentity,
    });
    assert.equal(pages.length, artifact.pageCount,
      `${artifact.formNumber}/${artifact.fixture}: not every page rastered`);
    for (const page of pages) {
      assert.equal(page.looksBlank, false, `${artifact.formNumber}/${artifact.fixture}/page ${page.page}: raster looks blank`);
      assert.equal(page.croppedToPage, true, `${artifact.formNumber}/${artifact.fixture}/page ${page.page}: raster not cropped`);
      rasters.push({
        packetId: artifact.packetId, formNumber: artifact.formNumber,
        documentRole: artifact.documentRole, evidenceMode: artifact.evidenceMode,
        fixture: artifact.fixture, variantId: artifact.variantId,
        ...page,
      });
    }
  }
  return { identity: rasterIdentity, dpi: RASTER_DPI, rasters };
}

async function buildCa(familyId, config) {
  const out = outputDir(familyId);
  clearCaCompletionClaims(familyId);
  try {
    const { resolved } = resolveSources(familyId);
    resetOwnedCaOutput(familyId);
    const bridge = runPikepdfBridge(caBridgeRequest(familyId, config, resolved, "create"));
    const derivatives = normalizeDerivativeRecords(bridge.derivatives);
    assert.equal(derivatives.length, 1, `${familyId}: expected exactly one primary-form derivative`);
    const [derivative] = derivatives;
    assert.equal(derivative.formNumber, config.primaryForm);
    enhancedFidelityContract(derivative);

    const receipt = sourceReceipt(familyId, resolved);
    receipt.derivedRepairs = derivatives;
    writeJson(`${out}/source-receipt.json`, receipt);
    const { documents, fieldMap } = caMapAndCensus(familyId, config, bridge);
    writeJson(`${out}/field-census.census-v1.json`, {
      schemaVersion: "rcap-official-form-field-census/v1-census-v1",
      familyId, jurisdiction: "CA", routeKeys: [...config.routeKeys],
      status: "FIRST_HAND_EXACT_OFFICIAL_CENSUS",
      measurementBasis: {
        surface: "exact official encrypted binaries, rebound by SHA-256 and byte length on this run",
        derivativesUsed: false,
        readBy: `pikepdf ${bridge.reader.pikepdfVersion} / libqpdf ${bridge.reader.libqpdfVersion}, empty user password`,
        censusLogic: bridge.reader.censusLogic,
        coordinateSystem: "PDF points, origin bottom-left; pageIndex is zero-based in the pikepdf evidence",
      },
      formOrder: [...config.formNumbers], forms: bridge.forms, documents,
    });
    writeJson(`${out}/reports/source-fidelity.json`, {
      schemaVersion: "rcap-source-derived-repair-fidelity/v1", familyId,
      exactOfficialSources: receipt.sources,
      derivedRepairs: derivatives,
      acceptanceRule: "A derivative is accepted only when source bytes remain exact and page geometry, original page content streams, terminal names/types/flags/options/default/current values, widget geometry/AP states, and XFA presence/digest are identical.",
    });
    writeJson(`${out}/production-field-map.json`, fieldMap);
    writeText(`${out}/participant-instructions.md`, caParticipantInstructions(familyId, config, fieldMap));

    const derivedBytes = fs.readFileSync(abs(derivative.derivedPath));
    assert.equal(sha256(derivedBytes), derivative.derivedSha256);
    assert.equal(derivedBytes.length, derivative.derivedByteLength);
    const packets = caPacketComponentPlan(familyId, config);
    const resolvedByForm = new Map(resolved.map((row) => [row.source.formNumber, row]));
    const artifacts = [];
    const actualReports = [];
    const packetEvidence = [];

    for (const packet of packets) {
      const variant = routeControlForFamily(familyId, packet.variantId);
      const baseFacts = packet.fixture === "canonical" ? CANONICAL : BOUNDARY;
      const facts = { ...baseFacts, ...variant.controlFacts };
      const packetDocuments = [];
      for (const document of packet.documents) {
        const formCensus = bridge.forms[document.formNumber];
        const sourceRow = resolvedByForm.get(document.formNumber);
        assert.ok(formCensus && sourceRow, `${packet.packetId}/${document.formNumber}: source evidence absent`);
        let proof;
        if (document.formNumber === config.primaryForm) {
          const finalizerCensus = caFinalizerCensus(formCensus);
          const combinedMappings = fieldMap.explicitMappingsByVariant[variant.variantId];
          const routeTextNames = new Set(Object.keys(variant.textControls));
          const explicitMappings = Object.fromEntries(Object.entries(combinedMappings)
            .filter(([fieldName]) => !routeTextNames.has(fieldName)));
          const writableNames = new Set(Object.keys(explicitMappings));
          const unwritableFields = finalizerCensus.filter((field) => !writableNames.has(field.name))
            .map((field) => ({ field: field.name }));
          const result = await finalizeCaPrimaryFixture({
            formCensus, variant,
            officialOptions: {
              sourceBytes: derivedBytes,
              expectedSha256: derivative.derivedSha256,
              census: finalizerCensus, facts, explicitMappings, unwritableFields,
              captionOnly: false, documentAcceptsFill: true,
              documentTextLines: [], maxFontSize: 9, minFontSize: 6,
              title: CA_FORMS[config.primaryForm].documentId,
              // Per-family, and only where the family's config asks for it.
              detachNestedControlFields: config.detachNestedControlFields === true,
              /*
               * What this family's classified fields' appearances MEAN.
               *
               * Empty for every family that has no registry entry, which is the
               * structural default and is what each of them already gets. It
               * matters here because the structural rule calls every pushbutton
               * chrome, and CR-409 carries one whose caption is the form number
               * inside a sentence the court printed: "(form MC-031)." Suppress
               * that one and the filing reads "(form )."
               */
              appearanceDispositions: config.appearanceSemanticsKey
                ? dispositionsForFamily(APPEARANCE_SEMANTICS, config.appearanceSemanticsKey)
                : new Map(),
            },
          });
          fs.mkdirSync(path.dirname(abs(document.file)), { recursive: true });
          fs.writeFileSync(abs(document.file), result.bytes);
          proof = await verifyCaArtifact({
            familyId, formNumber: config.primaryForm, formCensus, fieldMap,
            outputFile: document.file, outputBytes: result.bytes,
            report: result.report, facts, fixture: packet.fixture, variant,
            routeTextReport: result.routeTextReport,
            selectionReport: result.selectionReport,
            pdfLibWarnings: result.pdfLibWarnings,
          });
        } else {
          fs.mkdirSync(path.dirname(abs(document.file)), { recursive: true });
          fs.writeFileSync(abs(document.file), sourceRow.bytes);
          proof = verifyUnchangedCaComponent({ familyId, packet, document,
            source: sourceRow.source, sourceBytes: sourceRow.bytes, formCensus, fieldMap });
        }
        proof = bindCaProofToPacket(proof, packet, document);
        const artifact = {
          packetId: packet.packetId, fixture: packet.fixture,
          variantId: packet.variantId, routeKey: packet.routeKey,
          formNumber: document.formNumber,
          // The packet-completeness component check binds every documentId the
          // field map or receipt names to a rendered artifact; without the id
          // here the rendered record cannot answer for its own components.
          documentId: CA_FORMS[document.formNumber].documentId,
          documentRole: document.role,
          evidenceMode: document.evidenceMode, file: document.file,
          sha256: proof.sha256, byteLength: proof.byteLength,
          pageCount: proof.pageCount, pageGeometry: formCensus.pages,
          exactOfficialBytesUnchanged: proof.exactOfficialBytesUnchanged === true,
          valuesWrittenFromOutputBytes: proof.writtenProof?.length ?? 0,
          statutorySelectionsProvenFromOutputBytes:
            proof.statutorySelectionProof?.selectedControls?.length ?? 0,
        };
        artifacts.push(artifact);
        actualReports.push(proof);
        packetDocuments.push(artifact);
      }
      packetEvidence.push({ ...packet, documents: packetDocuments });
    }

    const raster = await rasterizeCaArtifacts(familyId, artifacts);
    writeJson(`${out}/reports/packet-evidence.json`, {
      schemaVersion: "rcap-ca-packet-evidence/v1", familyId,
      canonicalAndBoundaryPerVariant: true, packets: packetEvidence,
    });
    writeJson(`${out}/reports/actual-writes.json`, {
      schemaVersion: "rcap-actual-writes-from-output-bytes/v1", familyId,
      method: "Every primary text value is re-read from its exact flattened widget rectangle and matched to that field's fact. Exact statutory selections are re-read as two diagonal line segments inside the exact measured official widget rectangle. Every companion is byte-identical to its exact SHA-bound official source.",
      protectedFieldRule: "Every refused primary text/signature field must have no added appearance text or participant fixture value; every unselected button must lack an added X. Service, order, and declaration components are unchanged exact bytes.",
      xfaHandling: "The source-derived primary transport preserves the exact XFA digest. pdf-lib logs XFA removal before the shared finalizer flattens the form; finished primary PDFs contain neither XFA nor an AcroForm.",
      artifacts: actualReports,
    });
    writeJson(`${out}/reports/rendered-artifacts.json`, {
      schemaVersion: "rcap-rendered-artifacts/v1", familyId,
      renderedFresh: true, primaryForm: config.primaryForm,
      packets: packetEvidence.map((packet) => ({ packetId: packet.packetId,
        fixture: packet.fixture, variantId: packet.variantId, routeKey: packet.routeKey,
        documents: packet.documents.map((document) => document.file) })),
      artifacts, rasterTool: raster.identity,
      rasterEngine: raster.identity.engine, rasterEngineVersion: raster.identity.version,
      rasterDpi: raster.dpi,
      everyPageRastered: raster.rasters.length === artifacts.reduce((sum, artifact) => sum + artifact.pageCount, 0),
      rasters: raster.rasters,
    });
    writeJson(`${out}/product-wiring.json`, {
      schemaVersion: "rcap-family-product-wiring/v1", familyId,
      routeKeys: [...config.routeKeys], implementationStrategy: "official_pdf_fill",
      renderStrategy: "source_derived_primary_plus_exact_unchanged_packet_components",
      evidenceVariants: routeControlForFamily(familyId).map((variant) => variant.variantId),
      fieldMap: `${out}/production-field-map.json`, ...GATES,
      createsFulfillmentRecord: false, opensCommercialRoute: false,
      note: "Artifacts remain review-only alternatives. This record grants no runtime, commercial, fulfillment, eligibility, branch-selection, or approval authority.",
    });

    await caCompletionEvidenceReady(familyId, config);

    const approval = {
      schemaVersion: "rcap-output-approval-request/v1", familyId,
      routeKeys: [...config.routeKeys], status: "REQUESTED", grantedBy: null, ...GATES,
      sourceFidelityEstablished: true, packetCompletenessEstablished: true,
      outputLegalApprovalEstablished: false, independentVisualReviewEstablished: false,
      note: "Only after a read-only full evidence check passed, this file requests output-level legal and independent visual review. It grants neither and opens no route.",
      reviewerQuestions: [
        `Confirm the exact ${config.primaryForm} statutory-control alternatives recorded for every evidence variant.`,
        "Confirm every configured petition/order/proof/service/attachment component is present and that unchanged companions remain exact official bytes.",
        "Confirm no service, signature/date, declaration, court-owned, prosecutor, clerk, agency, or unverified factual-alternative field was completed.",
      ],
    };
    const findings = {
      schemaVersion: "rcap-build-findings/v1", familyId,
      status: "BUILT_REVIEW_REQUIRED", ...GATES, blocking: [],
      observations: [
        `All ${resolved.length} exact official packet components were censused and included in canonical and boundary evidence for every recorded statutory variant.`,
        `${config.primaryForm} derivative fidelity includes terminal names/types/flags/options/default/current values, widget rectangles/AP states, XFA digest, page geometry, and original content streams.`,
        "Only safe identity/case-caption facts and the exact named statutory controls were written. Fact-dependent subchoices remain blank; 17(b)/17(d)(2), 851.91, and Prop 64 alternatives are separate review fixtures, not inferred runtime choices.",
        "Every primary write/selection was proved at its exact measured field from output bytes. Every companion is an unchanged exact official copy, and every page was freshly rastered by version-identified Poppler pdftoppm at 72 dpi.",
      ],
      stillRequired: ["Output-level legal approval.", "Independent human visual review.",
        "A runtime may select an evidence alternative only from verified case facts after separate approval."],
    };
    assertGate(approval, "approval candidate");
    assertGate(findings, "findings candidate");
    writeJson(`${out}/approval-request.json`, approval);
    writeJson(`${out}/build-findings.json`, findings);
    await checkCa(familyId, config, { quiet: true });
    console.log(`BUILD_OK ${familyId} packets=${packets.length} artifacts=${artifacts.length} rasters=${raster.rasters.length}`);
  } catch (error) {
    clearCaCompletionClaims(familyId);
    throw error;
  }
}

function assertGate(record, label) {
  assert.equal(record.generationAllowed, false, `${label}: generationAllowed must be false`);
  assert.equal(record.runtimeSelectable, false, `${label}: runtimeSelectable must be false`);
  assert.equal(record.commercialRoutesOpened, 0, `${label}: commercialRoutesOpened must be zero`);
}

function checkReceipt(familyId, receipt, resolved) {
  assert.equal(receipt.familyId, familyId);
  assert.equal(receipt.binding, "EXACT_RECOMPUTED");
  assert.equal(receipt.allSourcesExact, true);
  assert.equal(Object.hasOwn(receipt, "sourceCorpusRoot"), false,
    `${familyId}: source receipt must not persist a machine-local corpus root`);
  assert.deepEqual(receipt.sourceCorpus, {
    identity: "extracted Master Library supplied through MASTER_LIBRARY_SOURCE_DIR",
    rootBindingEnvironmentVariable: "MASTER_LIBRARY_SOURCE_DIR",
    absoluteRootPersisted: false,
    relativePathContract: "Every sources[].pathInCorpus value resolves beneath the run-bound corpus root.",
  });
  assert.equal(path.isAbsolute(receipt.sourceCorpusIndex), false,
    `${familyId}: corpus index receipt path must be repository-relative`);
  assert.equal(receipt.sources.length, resolved.length);
  for (const { source, bytes } of resolved) {
    const row = receipt.sources.find((candidate) => candidate.formNumber === source.formNumber);
    assert.ok(row, `${familyId}: receipt missing ${source.formNumber}`);
    assert.equal(row.pinnedSha256, source.sha256);
    assert.equal(row.corpusIndexSha256, source.sha256);
    assert.equal(row.recomputedSha256, sha256(bytes));
    assert.equal(row.recomputedByteLength, bytes.length);
    assert.equal(row.sha256Exact, true);
    assert.equal(row.byteLengthExact, true);
    assert.equal(path.isAbsolute(row.pathInCorpus), false,
      `${familyId}/${source.formNumber}: corpus source path must be relative`);
    assert.equal(row.pathInCorpus, source.pathInCorpus);
  }
}

async function checkAz(familyId, config, { quiet = false, requireCompletionClaims = true } = {}) {
  const out = outputDir(familyId);
  const before = evidenceTreeFingerprint(out);
  const required = ["source-receipt.json", "field-census.census-v1.json",
    "production-field-map.json", "reports/actual-writes.json",
    "reports/rendered-artifacts.json", "product-wiring.json", "participant-instructions.md"];
  for (const file of required) {
    assert.ok(fs.existsSync(abs(`${out}/${file}`)), `${familyId}: missing ${file}`);
  }
  if (requireCompletionClaims) {
    for (const file of ["approval-request.json", "build-findings.json"]) {
      assert.ok(fs.existsSync(abs(`${out}/${file}`)), `${familyId}: missing checked completion claim ${file}`);
    }
  } else {
    assert.equal(fs.existsSync(abs(`${out}/approval-request.json`)), false,
      `${familyId}: approval claim exists before completion evidence check`);
    assert.equal(fs.existsSync(abs(`${out}/build-findings.json`)), false,
      `${familyId}: BUILT claim exists before completion evidence check`);
  }

  const { resolved } = resolveSources(familyId);
  const [{ bytes }] = resolved;
  checkReceipt(familyId, readJson(`${out}/source-receipt.json`), resolved);
  const censusRecord = readJson(`${out}/field-census.census-v1.json`);
  const liveCensus = await measureAzDocument(bytes);
  assert.equal(censusRecord.sourceSha256, AZ_SOURCE.sha256);
  assert.equal(censusRecord.pageCount, 3);
  assert.equal(censusRecord.measuredBlankCount, 31);
  assert.equal(censusRecord.measuredPrintedControlCount, 19);
  assert.deepEqual(censusRecord.fields, liveCensus.fields);
  assert.deepEqual(censusRecord.controls, liveCensus.controls);
  const liveMapping = azMapAndAnchors(familyId, config, liveCensus);
  const fieldMap = readJson(`${out}/production-field-map.json`);
  assert.deepEqual(fieldMap, liveMapping.map,
    `${familyId}: recorded AZ field map differs from the fresh exact-source map`);
  assertGate(fieldMap, "production-field-map");
  assert.equal(fieldMap.coverage.measuredBlanks, 31);
  assert.equal(fieldMap.coverage.measuredPrintedControls, 19);
  assert.equal(fieldMap.coverage.unmapped, 0);
  assert.equal(fieldMap.writes.length + fieldMap.refusals.length, 50);
  const forbiddenRoles = /signature|date$|prosecutor|court_field|clerk|attorney/;
  assert.equal(fieldMap.writes.filter((field) => forbiddenRoles.test(field.role)).length, 0,
    "forbidden signature/date/prosecutor/court/clerk/attorney role is writable");
  assert.deepEqual(fieldMap.writes.filter((field) => /agency/.test(field.role))
    .map((field) => [field.fieldId, field.factId]),
  [["citing-or-arresting-agency", "matter.citing_or_arresting_agency"]]);
  if (config.variant === "arrest_no_charges") {
    assert.equal(fieldMap.writes.some((field) => field.fieldId.includes("case-number")), false);
  } else {
    assert.deepEqual(fieldMap.writes.filter((field) => field.fieldId.includes("case-number"))
      .map((field) => field.fieldId).sort(), ["caption-case-number", "superior-court-case-number"]);
  }

  const actual = readJson(`${out}/reports/actual-writes.json`);
  const rendered = readJson(`${out}/reports/rendered-artifacts.json`);
  assert.equal(actual.artifacts.length, 2);
  assert.equal(rendered.artifacts.length, 2);
  for (const fixture of ["canonical", "boundary"]) {
    const facts = fixture === "canonical" ? CANONICAL : BOUNDARY;
    const recordedProof = actual.artifacts.find((artifact) => artifact.fixture === fixture);
    const renderedArtifact = rendered.artifacts.find((artifact) => artifact.fixture === fixture);
    assert.ok(recordedProof && renderedArtifact, `${familyId}/${fixture}: artifact evidence is incomplete`);
    assert.equal(recordedProof.outputFile, renderedArtifact.file);
    const pdfBytes = fs.readFileSync(abs(renderedArtifact.file));
    assert.equal(sha256(pdfBytes), renderedArtifact.sha256);
    assert.equal(pdfBytes.length, renderedArtifact.byteLength);
    const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
    assert.equal(pdf.getPageCount(), 3);
    const liveFinalizer = await finalizeFlatOverlay({
      sourceBytes: bytes, expectedSha256: AZ_SOURCE.sha256,
      anchors: liveMapping.anchors, selections: [], protectedRules: [],
      explicitMappings: liveMapping.explicitMappings, facts,
      documentTextLines: liveCensus.documentTextLines, title: AZ_SOURCE.officialTitle,
    });
    const freshProof = await verifyAzArtifact({
      sourceBytes: bytes, outputFile: renderedArtifact.file, outputBytes: pdfBytes,
      anchors: liveMapping.anchors, fields: liveMapping.fields, controls: liveCensus.controls,
      report: liveFinalizer.report, fixture,
    });
    assert.deepEqual(freshProof, recordedProof,
      `${familyId}/${fixture}: output-byte AZ proof drifted from fresh source-bound verification`);
  }

  assert.equal(rendered.everyPageRastered, true);
  assertPortableRasterIdentity(rendered.rasterTool, `${familyId} rendered-artifacts`);
  assert.equal(rendered.rasterEngine, rendered.rasterTool.engine);
  assert.equal(rendered.rasterEngineVersion, rendered.rasterTool.version);
  assert.equal(rendered.rasterDpi, RASTER_DPI);
  assert.equal(rendered.rasters.length, 6);
  for (const artifact of rendered.artifacts) {
    const rows = rendered.rasters.filter((row) => row.fixture === artifact.fixture);
    const live = await recomputeRasterEvidence({
      pdfFile: artifact.file, rasterRows: rows, label: `${familyId}/${artifact.fixture}`,
      rasterIdentity: rendered.rasterTool,
    });
    assert.equal(live.pdfSha256, artifact.sha256);
    assert.equal(live.pageCount, artifact.pageCount);
  }
  const wiring = readJson(`${out}/product-wiring.json`);
  assertGate(wiring, "product-wiring");
  if (requireCompletionClaims) {
    const approval = readJson(`${out}/approval-request.json`);
    const findings = readJson(`${out}/build-findings.json`);
    assertGate(approval, "approval-request");
    assertGate(findings, "build-findings");
    assert.equal(findings.status, "BUILT_REVIEW_REQUIRED");
    assert.deepEqual(findings.blocking, []);
    assert.equal(approval.status, "REQUESTED");
    assert.equal(approval.grantedBy, null);
  }
  const after = evidenceTreeFingerprint(out);
  assert.deepEqual(after, before, `${familyId}: --check mutated evidence files`);
  if (!quiet) console.log(`CHECK_OK ${familyId}`);
}

async function azCompletionEvidenceReady(familyId, config) {
  await checkAz(familyId, config, { quiet: true, requireCompletionClaims: false });
  return true;
}

async function checkCaStop(familyId, config, { quiet = false } = {}) {
  const out = outputDir(familyId);
  const { resolved } = resolveSources(familyId);
  checkReceipt(familyId, readJson(`${out}/source-receipt.json`), resolved);
  const findings = readJson(`${out}/build-findings.json`);
  const wiring = readJson(`${out}/product-wiring.json`);
  const approval = readJson(`${out}/approval-request.json`);
  assertGate(findings, "build-findings");
  assertGate(wiring, "product-wiring");
  assertGate(approval, "approval-request");
  assert.equal(findings.status, "STOPPED_SOURCE_BOUND");
  assert.equal(findings.productionFieldMapProduced, false);
  assert.equal(findings.filledArtifactsProduced, false);
  assert.equal(findings.byteDerivedActualWritesProduced, false);
  assert.equal(findings.renderedArtifactsProduced, false);
  assert.equal(findings.blocking.length, 1);
  assert.ok(findings.blocking[0].exactUnblockCondition.length >= 5);
  assert.equal(findings.sourceReaderAttempts.repositoryPath.attemptedFirst, true);
  assert.equal(findings.sourceReaderAttempts.repositoryPath.repositoryPikepdfReaderPresent, true);
  assert.equal(findings.sourceReaderAttempts.repositoryPath.pikepdfAvailable, false,
    "pikepdf is now available; STOP evidence must be rebuilt through the repository reader path");
  assert.equal(findings.sourceReaderAttempts.repositoryPath.qpdfAvailable, false,
    "qpdf is now available; STOP evidence must be rebuilt through the repository reader path");
  assert.equal(findings.sourceReaderAttempts.sourceAttempts.length, resolved.length);
  for (const attempt of findings.sourceReaderAttempts.sourceAttempts) {
    assert.equal(attempt.pdfLib.readable, false, `${attempt.formNumber}: pdf-lib is now readable; rebuild required`);
    assert.equal(attempt.repositoryRasterHelper.readable, false,
      `${attempt.formNumber}: repository raster helper is now readable; rebuild required`);
  }
  assert.equal(approval.status, "REFUSED_TO_REQUEST_COMPLETION_APPROVAL");
  assert.equal(approval.completionRefused, true);
  assert.equal(approval.approvalRequested, false);
  assert.deepEqual(approval.exactUnblockCondition, caUnblockCondition(config.formNumbers));
  for (const forbidden of [`${out}/production-field-map.json`, `${out}/reports/actual-writes.json`,
    `${out}/reports/rendered-artifacts.json`]) {
    assert.equal(fs.existsSync(abs(forbidden)), false,
      `${forbidden}: STOP family must not fabricate completion artifact`);
  }
  if (!quiet) console.log(`CHECK_STOP_OK ${familyId}`);
}

function evidenceTreeFingerprint(relativeRoot) {
  const absoluteRoot = abs(relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  const rows = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) {
        const bytes = fs.readFileSync(file);
        const stat = fs.statSync(file);
        rows.push({ file: path.relative(absoluteRoot, file), sha256: sha256(bytes),
          byteLength: bytes.length, mtimeMs: stat.mtimeMs });
      }
    }
  };
  walk(absoluteRoot);
  return rows.sort((left, right) => left.file.localeCompare(right.file));
}

function assertDistinctRouteArtifactsWhenAvailable() {
  const cr180Families = ["ca-1203-41-set", "ca-1203-42-set", "ca-1203-43-set",
    "ca-1203-4a-set", "ca-17b-reduction-set"];
  const reports = [];
  for (const familyId of cr180Families) {
    const file = `${outputDir(familyId)}/reports/rendered-artifacts.json`;
    if (!fs.existsSync(abs(file))) return;
    const report = readJson(file);
    if (!Array.isArray(report.packets) || !report.packets.every((packet) => packet.variantId)) return;
    reports.push(report);
  }
  for (const fixture of ["canonical", "boundary"]) {
    const primary = reports.flatMap((report) => report.artifacts.filter((artifact) =>
      artifact.fixture === fixture && artifact.evidenceMode === "finalized_source_derived_primary"));
    assert.equal(new Set(primary.map((artifact) => artifact.sha256)).size, primary.length,
      `CR-180 ${fixture}: distinct statutory-control variants emitted byte-identical primary artifacts`);
  }
}

async function checkCa(familyId, config, { quiet = false, requireCompletionClaims = true } = {}) {
  const out = outputDir(familyId);
  const before = evidenceTreeFingerprint(out);
  const required = ["source-receipt.json", "field-census.census-v1.json",
    "production-field-map.json", "reports/source-fidelity.json", "reports/packet-evidence.json",
    "reports/actual-writes.json", "reports/rendered-artifacts.json", "product-wiring.json",
    "participant-instructions.md"];
  for (const file of required) assert.ok(fs.existsSync(abs(`${out}/${file}`)), `${familyId}: missing ${file}`);
  if (requireCompletionClaims) {
    for (const file of ["approval-request.json", "build-findings.json"]) {
      assert.ok(fs.existsSync(abs(`${out}/${file}`)), `${familyId}: missing checked completion claim ${file}`);
    }
  } else {
    assert.equal(fs.existsSync(abs(`${out}/approval-request.json`)), false,
      `${familyId}: approval claim exists before completion evidence check`);
    assert.equal(fs.existsSync(abs(`${out}/build-findings.json`)), false,
      `${familyId}: BUILT claim exists before completion evidence check`);
  }

  const { resolved } = resolveSources(familyId);
  const resolvedByForm = new Map(resolved.map((row) => [row.source.formNumber, row]));
  const receipt = readJson(`${out}/source-receipt.json`);
  checkReceipt(familyId, receipt, resolved);
  assert.equal(receipt.derivedRepairs.length, 1);
  const derivedRecord = receipt.derivedRepairs[0];
  assert.equal(derivedRecord.formNumber, config.primaryForm);
  const derivedBytes = fs.readFileSync(abs(derivedRecord.derivedPath));
  assert.equal(sha256(derivedBytes), derivedRecord.derivedSha256);
  assert.equal(derivedBytes.length, derivedRecord.derivedByteLength);
  enhancedFidelityContract(derivedRecord);

  const verifyRequest = readOnlyVerifyRequest(familyId, config, resolved);
  const bridge = runPikepdfBridge(verifyRequest);
  const liveDerivatives = normalizeDerivativeRecords(bridge.derivatives);
  assert.deepEqual(liveDerivatives, receipt.derivedRepairs,
    `${familyId}: derivative provenance/fidelity changed`);
  enhancedFidelityContract(liveDerivatives[0]);

  const censusRecord = readJson(`${out}/field-census.census-v1.json`);
  assert.equal(censusRecord.status, "FIRST_HAND_EXACT_OFFICIAL_CENSUS");
  assert.deepEqual(censusRecord.formOrder, config.formNumbers);
  assert.deepEqual(censusRecord.forms, bridge.forms,
    `${familyId}: recorded exact-source census differs from a fresh read-only pikepdf census`);
  const liveMapping = caMapAndCensus(familyId, config, bridge);
  assert.deepEqual(censusRecord.documents, liveMapping.documents);
  const fieldMap = readJson(`${out}/production-field-map.json`);
  assert.deepEqual(fieldMap, liveMapping.fieldMap);
  assertGate(fieldMap, "production-field-map");
  assert.equal(fieldMap.coverage.unmapped, 0);
  assert.equal(fieldMap.coverage.writes + fieldMap.coverage.selections + fieldMap.coverage.refusals,
    fieldMap.coverage.terminalFields);
  // The bounded write set is the S1 shared-fact-allowlist decision of record
  // (data/rcap-grade-a/wave-2/s1-shared-fact-allowlist/rows.json, runner
  // runWestFamilyCli): identity/caption facts plus the held participant
  // contact facts and the participant-stated citing/arresting agency. The
  // previous two-fact list predated S1 and condemned exactly the held writes
  // S1 ordered, so every post-S1 rebuild failed its own completion check.
  const s1BoundWriteFacts = new Set([
    "participant.full_legal_name", "matter.case_number",
    "participant.street_address", "participant.city", "participant.state",
    "participant.zip", "participant.phone", "participant.email",
    "participant.date_of_birth", "matter.county", "matter.arrest_date",
    "matter.conviction_date", "matter.citing_or_arresting_agency",
  ]);
  for (const write of fieldMap.writes) {
    assert.ok(s1BoundWriteFacts.has(write.factId)
      || write.factId.startsWith("route."), `${write.fieldName}: unbounded fact mapping`);
    const subject = `${write.fieldName} ${write.effectiveLabel ?? ""}`;
    // S1 retired the blanket agency refusal for the one participant-stated
    // citing/arresting-agency fact only; prosecutor/clerk/service/signature
    // subjects stay protected for it, and every other write keeps the full
    // protected-subject net including "agency".
    const protectedSubject = write.factId === "matter.citing_or_arresting_agency"
      ? /signature|sigdate|service|mailing certificate|attorney|atty|lawyer|prosecutor|clerk/i
      : /signature|sigdate|service|mailing certificate|attorney|atty|lawyer|prosecutor|clerk|agency/i;
    assert.equal(protectedSubject.test(subject), false,
      `${write.fieldName}: protected field is writable`);
  }
  if (config.participantMarksStatutoryElections) {
    assert.deepEqual(fieldMap.selections, [],
      `${familyId}: the platform marked a statutory election it declares is the participant's`);
    assert.ok(Object.values(fieldMap.participantElectionsByVariant ?? {})
      .every((rows) => rows.length >= 1),
    `${familyId}: a variant declares no participant election control`);
  } else {
    assert.ok(fieldMap.selections.length >= 1 || familyId === "ca-17b-reduction-set",
      `${familyId}: statutory button selection is missing`);
  }

  const fidelity = readJson(`${out}/reports/source-fidelity.json`);
  assert.deepEqual(fidelity.derivedRepairs, receipt.derivedRepairs);
  enhancedFidelityContract(fidelity.derivedRepairs[0]);
  const plannedPackets = caPacketComponentPlan(familyId, config);
  const packetEvidence = readJson(`${out}/reports/packet-evidence.json`);
  assert.equal(packetEvidence.canonicalAndBoundaryPerVariant, true);
  assert.deepEqual(packetEvidence.packets.map((packet) => ({
    packetId: packet.packetId, fixture: packet.fixture, variantId: packet.variantId,
    routeKey: packet.routeKey, formNumbers: packet.documents.map((document) => document.formNumber),
  })), plannedPackets.map((packet) => ({
    packetId: packet.packetId, fixture: packet.fixture, variantId: packet.variantId,
    routeKey: packet.routeKey, formNumbers: packet.documents.map((document) => document.formNumber),
  })), `${familyId}: configured packet components are missing or reordered`);

  const actual = readJson(`${out}/reports/actual-writes.json`);
  const rendered = readJson(`${out}/reports/rendered-artifacts.json`);
  const expectedArtifactCount = plannedPackets.length * config.formNumbers.length;
  assert.equal(actual.artifacts.length, expectedArtifactCount);
  assert.equal(rendered.artifacts.length, expectedArtifactCount);
  assert.equal(rendered.everyPageRastered, true);
  assertPortableRasterIdentity(rendered.rasterTool, `${familyId} rendered-artifacts`);
  assert.equal(rendered.rasterEngine, rendered.rasterTool.engine);
  assert.equal(rendered.rasterEngineVersion, rendered.rasterTool.version);
  assert.equal(rendered.rasterDpi, RASTER_DPI);

  for (const packet of plannedPackets) {
    const variant = routeControlForFamily(familyId, packet.variantId);
    const facts = { ...(packet.fixture === "canonical" ? CANONICAL : BOUNDARY), ...variant.controlFacts };
    for (const document of packet.documents) {
      const sourceRow = resolvedByForm.get(document.formNumber);
      const formCensus = bridge.forms[document.formNumber];
      const artifact = rendered.artifacts.find((candidate) =>
        candidate.packetId === packet.packetId && candidate.formNumber === document.formNumber);
      const recordedProof = actual.artifacts.find((candidate) =>
        candidate.packetId === packet.packetId && candidate.formNumber === document.formNumber);
      assert.ok(sourceRow && formCensus && artifact && recordedProof,
        `${packet.packetId}/${document.formNumber}: packet evidence is incomplete`);
      assert.equal(artifact.documentRole, CA_FORMS[document.formNumber].role);
      assert.equal(artifact.evidenceMode, document.evidenceMode);
      assert.deepEqual(artifact.pageGeometry, formCensus.pages);
      const bytes = fs.readFileSync(abs(artifact.file));
      assert.equal(sha256(bytes), artifact.sha256);
      assert.equal(bytes.length, artifact.byteLength);
      let freshProof;
      if (document.formNumber === config.primaryForm) {
        freshProof = await verifyCaArtifact({
          familyId, formNumber: config.primaryForm, formCensus, fieldMap,
          outputFile: artifact.file, outputBytes: bytes,
          report: { written: recordedProof.finalizerWritten, refused: recordedProof.finalizerRefused },
          facts, fixture: packet.fixture, variant,
          routeTextReport: recordedProof.routeTextReport,
          selectionReport: recordedProof.selectionReport,
          pdfLibWarnings: recordedProof.pdfLibWarnings,
        });
      } else {
        freshProof = verifyUnchangedCaComponent({ familyId, packet, document,
          source: sourceRow.source, sourceBytes: sourceRow.bytes, formCensus, fieldMap });
      }
      freshProof = bindCaProofToPacket(freshProof, packet, document);
      if (document.formNumber === config.primaryForm
        && measuredRouteTextControlsForVariant(formCensus, variant).length === 0) {
        if (!Object.hasOwn(recordedProof, "routeTextReport")) delete freshProof.routeTextReport;
        if (!Object.hasOwn(recordedProof, "statutoryTextControlProof")) {
          delete freshProof.statutoryTextControlProof;
        }
      }
      assert.deepEqual(freshProof, recordedProof,
        `${packet.packetId}/${document.formNumber}: output-byte proof drifted`);
      const rasterRows = rendered.rasters.filter((row) =>
        row.packetId === packet.packetId && row.formNumber === document.formNumber);
      const liveRaster = await recomputeRasterEvidence({
        pdfFile: artifact.file, rasterRows,
        pageGeometry: formCensus.pages,
        label: `${familyId}/${packet.packetId}/${document.formNumber}`,
        rasterIdentity: rendered.rasterTool,
      });
      assert.equal(liveRaster.pdfSha256, artifact.sha256);
      assert.equal(liveRaster.pageCount, artifact.pageCount);
    }
  }
  const expectedRasterCount = rendered.artifacts.reduce((sum, artifact) => sum + artifact.pageCount, 0);
  assert.equal(rendered.rasters.length, expectedRasterCount);

  for (const fixture of ["canonical", "boundary"]) {
    const primary = rendered.artifacts.filter((artifact) => artifact.fixture === fixture
      && artifact.evidenceMode === "finalized_source_derived_primary");
    if (config.participantMarksStatutoryElections) {
      // The inverse proof, and the stronger one for this family. The only thing
      // that ever differed between its two variants' primary filings was the
      // election ink; with the election withdrawn they must be byte-identical,
      // and a difference would mean a mark survived somewhere.
      assert.equal(new Set(primary.map((artifact) => artifact.sha256)).size, 1,
        `${familyId}/${fixture}: variants differ although every statutory election is the participant's`);
    } else {
      assert.equal(new Set(primary.map((artifact) => artifact.sha256)).size, primary.length,
        `${familyId}/${fixture}: distinct statutory variants emitted byte-identical primary PDFs`);
    }
  }
  assertDistinctRouteArtifactsWhenAvailable();

  const wiring = readJson(`${out}/product-wiring.json`);
  assertGate(wiring, "product-wiring");
  assert.deepEqual(wiring.evidenceVariants,
    routeControlForFamily(familyId).map((variant) => variant.variantId));
  if (requireCompletionClaims) {
    const approval = readJson(`${out}/approval-request.json`);
    const findings = readJson(`${out}/build-findings.json`);
    assertGate(approval, "approval-request");
    assertGate(findings, "build-findings");
    assert.equal(findings.status, "BUILT_REVIEW_REQUIRED");
    assert.deepEqual(findings.blocking, []);
    assert.equal(approval.status, "REQUESTED");
    assert.equal(approval.grantedBy, null);
    assert.equal(approval.packetCompletenessEstablished, true);
  }
  const after = evidenceTreeFingerprint(out);
  assert.deepEqual(after, before, `${familyId}: --check mutated evidence files`);
  if (!quiet) console.log(`CHECK_OK ${familyId}`);
}

async function caCompletionEvidenceReady(familyId, config) {
  await checkCa(familyId, config, { quiet: true, requireCompletionClaims: false });
  return true;
}

function diagnoseCaFidelity(familyId, config) {
  const { resolved } = resolveSources(familyId);
  const bridge = runPikepdfBridge(readOnlyVerifyRequest(familyId, config, resolved));
  console.log(JSON.stringify(normalizeDerivativeRecords(bridge.derivatives)
    .map((record) => ({ formNumber: record.formNumber, comparison: record.comparison })), null, 2));
}

async function selfTest(requestedFamily = FIRST_FAMILY) {
  requireFamily(requestedFamily);
  const engineSource = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
  assert.doesNotMatch(engineSource, /\/Users\/rogerroman|\/private\/tmp/,
    "WEST engine must discover Poppler and pikepdf without host-specific absolute paths");
  assert.match(PIKEPDF_BRIDGE, /isinstance\(value, pikepdf\.Stream\)/,
    "pikepdf semantic serialization must distinguish real streams from string objects");
  const missingP1P2FixContracts = [
    ["completion claims gated on complete checked evidence", typeof caCompletionEvidenceReady === "function"],
    ["AZ completion claims gated on complete checked evidence", typeof azCompletionEvidenceReady === "function"],
    ["route-specific statutory controls", typeof routeControlForFamily === "function"],
    ["all configured packet components represented per fixture", typeof caPacketComponentPlan === "function"],
    ["enhanced exact-vs-derived semantic fidelity", typeof enhancedFidelityContract === "function"],
    ["expected values bound to exact measured fields", typeof assertExactFieldBindings === "function"],
    ["raster pixels/dimensions recomputed during check", typeof recomputeRasterEvidence === "function"],
    ["pikepdf verify request is hermetic and read-only", typeof readOnlyVerifyRequest === "function"],
  ].filter(([, present]) => !present).map(([label]) => label);
  assert.deepEqual(missingP1P2FixContracts, [],
    `missing WEST P1/P2 fix contracts: ${missingP1P2FixContracts.join("; ")}`);
  assert.deepEqual(Object.keys(FAMILIES).sort(), [
    "az_marijuana_expungement_arrest_no_charges-set",
    "az_marijuana_expungement_superior_court-set",
    "ca-1203-41-set", "ca-1203-42-set", "ca-1203-43-set", "ca-1203-4a-set",
    "ca-17b-reduction-set", "ca-851-91-set", "ca-prop64-set",
  ].sort());
  for (const familyId of Object.keys(FAMILIES)) {
    const contract = familyContract(familyId);
    assertGate(contract, `${familyId} contract`);
    assert.ok(contract.routeKeys.length >= 1);
  }
  assert.equal(AZ_FIELD_SPECS.length, 31);
  assert.equal(outputDir("az_marijuana_expungement_arrest_no_charges-set"),
    "data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-arrest-no-charges-set--official-pdf-fill");
  assert.equal(outputDir("az_marijuana_expungement_superior_court-set"),
    "data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-superior-court-set--official-pdf-fill");
  assert.equal(AZ_FIELD_SPECS.filter((field) => field.role.includes("signature") && field.writeFor).length, 0);
  assert.deepEqual(AZ_FIELD_SPECS
    .filter((field) => /agency|prosecutor|attorney/.test(field.role) && field.writeFor)
    .map((field) => [field.id, field.factId]),
  [["citing-or-arresting-agency", "matter.citing_or_arresting_agency"]]);
  assert.equal(AZ_FIELD_SPECS.find((field) => field.id === "prosecuting-agency").blankTreatment,
    "REQUIRED_BEFORE_FILING");
  const venueAnchor = {
    blankId: "venue-county", label: "County", factId: "matter.county",
  };
  assert.equal(expectedAzValueForAnchor(venueAnchor, CANONICAL, {
    normalized: [{ anchor: "County", factId: "matter.county",
      from: "Example County", to: "Example",
      why: "the official form prints the County suffix" }],
    expectedValues: ["Example"],
  }), "Example", "AZ verification must honor the finalizer's per-anchor County normalization");
  const portableRaster = portablePopplerIdentity("25.06.0");
  assert.equal(assertPortableRasterIdentity(portableRaster, "self-test Poppler"), true);
  assert.deepEqual(portableRaster, {
    engine: "poppler_pdftoppm", version: "25.06.0", executablePathPersisted: false,
  });
  const receiptBytes = Buffer.from("portable-source-receipt");
  const receiptHash = sha256(receiptBytes);
  const portableReceipt = sourceReceipt("portable-receipt-fixture", [{
    source: {
      formNumber: "TEST", documentId: "TEST-DOCUMENT", role: "primary_filing",
      pathInCorpus: "STATES/AZ/test.pdf", sha256: receiptHash,
      byteLength: receiptBytes.length,
    },
    indexEntry: { sha256: receiptHash, byteLength: receiptBytes.length },
    bytes: receiptBytes, recomputedSha256: receiptHash,
  }]);
  assert.equal(Object.hasOwn(portableReceipt, "sourceCorpusRoot"), false);
  assert.equal(portableReceipt.sourceCorpus.absoluteRootPersisted, false);
  assert.equal(path.isAbsolute(portableReceipt.sources[0].pathInCorpus), false);
  const instructionalBracketLine = {
    y: 100, size: 10,
    chars: [..."[insert date]"].map((c, index) => ({ c, x: index * 5, w: 5 })),
  };
  assert.equal(bracketPairsOf(instructionalBracketLine).length, 0,
    "instructional square-bracket text must not be classified as an empty selection control");
  assert.equal(glyphInsideBox({
    page: 1, x: 397.55, y: 683.6, width: 3.75, character: "I",
    metricsExact: false, runX: 138.8, runWidth: 244.55,
  }, 1, { x: 138.8, y: 683.6, width: 255.2, height: 11.2 }), true,
  "an inexact extracted glyph must use the exact remeasured overlay run extent");
  const printedControlFixture = [{
    controlId: "fixture-selection", page: 1,
    measured: { x0: 10, x1: 20, baselineY: 10, printedFontSize: 10 },
  }];
  const unmarkedControlProof = proveAzPrintedControlsUnmarked({
    controls: printedControlFixture, addedGlyphs: [],
    sourcePaths: [{ page: 1, operator: "l", x: 1, y: 1,
      width: 2, height: 0, paintedBy: "S" }],
    artifactPaths: [{ page: 1, operator: "l", x: 1, y: 1,
      width: 2, height: 0, paintedBy: "S" }],
    fixture: "unmarked-control-regression",
  });
  assert.equal(unmarkedControlProof.controls[0].sourceToArtifactUnmarked, true);
  assert.throws(() => proveAzPrintedControlsUnmarked({
    controls: printedControlFixture, addedGlyphs: [{
      page: 1, x: 12, y: 12, width: 4, character: "X", metricsExact: true,
    }], sourcePaths: [], artifactPaths: [], fixture: "text-mark-regression",
  }), /selection control carries added text or vector ink/);
  assert.throws(() => proveAzPrintedControlsUnmarked({
    controls: printedControlFixture, addedGlyphs: [], sourcePaths: [],
    artifactPaths: [{ page: 1, operator: "l", x: 12, y: 12,
      width: 6, height: 6, paintedBy: "S" }], fixture: "vector-mark-regression",
  }), /selection control carries added text or vector ink/);
  const routeTextVariant = {
    variantId: "route-text-regression", routeKey: "test:route",
    selections: [],
    textControls: { "Exact.Route.Field": "route.test.yes_no" },
    controlFacts: { "route.test.yes_no": "yes" },
  };
  const routeTextCensus = { fields: [{
    name: "Exact.Route.Field", fieldType: "/Tx",
    tooltip: "Eligible for reduction to misdemeanor under Penal Code, § 17(b) (yes or no)",
    widgets: [{ pageIndex: 0, rect: [20, 40, 140, 56] }],
  }] };
  const routeTextSource = await PDFDocument.create();
  stampDeterministic(routeTextSource);
  routeTextSource.addPage([200, 200]);
  const routeTextSourceBytes = Buffer.from(await routeTextSource.save({
    useObjectStreams: false, updateMetadata: false,
  }));
  const measuredRouteText = measuredRouteTextControlsForVariant(routeTextCensus, routeTextVariant);
  const routeTextOverlay = await overlayCaRouteTextControls(
    routeTextSourceBytes, measuredRouteText, routeTextVariant,
  );
  const routeTextProof = await proveRouteTextControlsFromOutput({
    outputBytes: routeTextOverlay.bytes, formCensus: routeTextCensus,
    variant: routeTextVariant, routeTextReport: routeTextOverlay.report,
    label: "route-text-regression",
  });
  assert.equal(routeTextProof.controls[0].textReadFromOutputBytes, "yes");
  const exactDateField = "CR-180[0].Page1[0].LI1[0].li1[0].ConvictionDate[0]";
  const exactFactSource = await PDFDocument.create();
  stampDeterministic(exactFactSource);
  exactFactSource.addPage([200, 200]);
  const exactFactSourceBytes = Buffer.from(await exactFactSource.save({
    useObjectStreams: false, updateMetadata: false,
  }));
  const exactFactOverlay = await overlayCaExactMappedFacts({
    bytes: exactFactSourceBytes,
    formCensus: { fields: [{
      name: exactDateField, fieldType: "/Tx", flags: [],
      widgets: [{ pageIndex: 0, rect: [20, 80, 120, 96] }],
    }] },
    explicitMappings: { [exactDateField]: "matter.conviction_date" },
    facts: CANONICAL,
    report: {
      written: [],
      refused: [{ field: exactDateField, reason: "protected_category",
        category: "disposition_or_hearing" }],
      protectedFields: [{ field: exactDateField, category: "disposition_or_hearing" }],
      expectedValues: [],
    },
  });
  assert.deepEqual(exactFactOverlay.report.refused, []);
  assert.equal(exactFactOverlay.report.written[0].factId, "matter.conviction_date");
  const exactFactProofPdf = await PDFDocument.load(exactFactOverlay.bytes, {
    ignoreEncryption: true, updateMetadata: false,
  });
  assert.ok(extractTextItems(exactFactProofPdf.getPages()[0])
    .some((item) => String(item.text ?? "").includes(CANONICAL["matter.conviction_date"])),
  "exact conviction-date fallback must be visible in the output bytes");
  const caUnion = new Set(Object.values(FAMILIES).filter((family) => family.jurisdiction === "ca")
    .flatMap((family) => family.formNumbers));
  assert.deepEqual([...caUnion].sort(), Object.keys(CA_FORMS).sort());
  for (const family of Object.values(FAMILIES).filter((candidate) => candidate.jurisdiction === "ca")) {
    assert.equal(family.outcome, "build_ca",
      "an available exact-source pikepdf/libqpdf path must reopen every CA family");
    assert.ok(CA_PRIMARY_WRITES[family.primaryForm], `${family.primaryForm}: primary mapping missing`);
  }
  assert.deepEqual(Object.keys(CA_PRIMARY_WRITES).sort(), ["CR-180", "CR-400", "CR-409"]);
  assert.equal(Object.values(CA_PRIMARY_WRITES)
    .reduce((count, mappings) => count + Object.keys(mappings).length, 0), 25);
  assert.deepEqual(Object.keys(CA_EXACT_SEMANTIC_LABELS).sort(), [
    "CR-180[0].Page1[0].LI1[0].li1[0].ConvictionDate[0]",
    "CR-409[0].Page1[0].LI1[0].li1b[0].ProtectedStreet[0]",
    "CR-409[0].Page1[0].LI3[0].li3a[0].T186[0]",
    "CR-409[0].Page1[0].LI3[0].li3c[0].T186[0]",
  ]);
  for (const mappings of Object.values(CA_PRIMARY_WRITES)) {
    assert.ok(Object.values(mappings).includes("matter.case_number"));
    assert.ok(Object.values(mappings).includes("participant.full_legal_name"));
    assert.ok(Object.values(mappings).every((factId) => [
      "matter.case_number", "matter.county", "matter.arrest_date", "matter.conviction_date",
      "matter.citing_or_arresting_agency", "participant.full_legal_name",
      "participant.date_of_birth", "participant.street_address", "participant.city",
      "participant.state", "participant.zip", "participant.phone", "participant.email",
    ].includes(factId)));
    assert.equal(Object.keys(mappings).some((name) =>
      /signature|sigdate|service|attorney|atty|lawyer|prosecutor|clerk|agency/i.test(name)), false);
  }
  assert.deepEqual(Object.keys(CA_ROUTE_VARIANTS).sort(), Object.keys(FAMILIES)
    .filter((familyId) => FAMILIES[familyId].jurisdiction === "ca").sort());
  for (const [familyId, config] of Object.entries(FAMILIES)
    .filter(([, candidate]) => candidate.jurisdiction === "ca")) {
    const variants = routeControlForFamily(familyId);
    assert.deepEqual([...new Set(variants.map((variant) => variant.routeKey))].sort(),
      [...config.routeKeys].sort());
    assert.equal(new Set(variants.map((variant) => variant.variantId)).size, variants.length);
    const plan = caPacketComponentPlan(familyId, config);
    assert.equal(plan.length, variants.length * 2);
    assert.ok(plan.every((packet) => packet.documents.length === config.formNumbers.length));
    assert.ok(plan.every((packet) => packet.documents.map((document) => document.formNumber)
      .join("|") === config.formNumbers.join("|")));
  }
  assert.notDeepEqual(CA_ROUTE_VARIANTS["ca-17b-reduction-set"][0].controlFacts,
    CA_ROUTE_VARIANTS["ca-17b-reduction-set"][1].controlFacts);
  assert.notEqual(CA_ROUTE_VARIANTS["ca-851-91-set"][0].selections[0].fieldName,
    CA_ROUTE_VARIANTS["ca-851-91-set"][1].selections[0].fieldName);
  assert.notDeepEqual(CA_ROUTE_VARIANTS["ca-prop64-set"][0].selections,
    CA_ROUTE_VARIANTS["ca-prop64-set"][1].selections);
  assert.throws(() => assertExactFieldBindings({
    observations: [
      { fieldName: "name", textReadFromOutputBytes: "24-CR-001234" },
      { fieldName: "case", textReadFromOutputBytes: "Jordan Avery Reyes" },
    ],
    expectedByField: { name: "Jordan Avery Reyes", case: "24-CR-001234" },
    fixtureValues: ["Jordan Avery Reyes", "24-CR-001234"], label: "swapped-value-regression",
  }), /exact field does not carry expected value/);
  assert.throws(() => assertExactFieldBindings({
    observations: [{ fieldName: "county", textReadFromOutputBytes: "Example County" }],
    expectedByField: { county: "Example" }, fixtureValues: ["Example"],
    label: "normalized-value-prefix-regression",
  }), /exact field does not carry expected value/,
  "an unnormalized longer value must not satisfy an exact normalized binding");
  assert.doesNotThrow(() => assertExactFieldBindings({
    observations: [{ fieldName: "county", textReadFromOutputBytes: "  Example\n" }],
    expectedByField: { county: "Example" }, fixtureValues: ["Example"],
    label: "whitespace-insensitive-exact-regression",
  }));
  assert.deepEqual(bindCaProofToPacket({ sha256: "proof" }, {
    packetId: "packet", fixture: "canonical", variantId: "variant", routeKey: "route",
  }, {
    formNumber: "CR-180", role: "primary_filing",
    evidenceMode: "finalized_source_derived_primary", file: "fixture.pdf",
  }), {
    sha256: "proof", packetId: "packet", fixture: "canonical", variantId: "variant",
    routeKey: "route", formNumber: "CR-180", documentRole: "primary_filing",
    evidenceMode: "finalized_source_derived_primary", outputFile: "fixture.pdf",
  });
  const semanticFixture = {
    formNumber: "TEST", sourceUnchanged: true, derivedEncrypted: false,
    comparison: {
      equivalent: true, pageGeometryIdentical: true,
      originalPageContentStreamsIdentical: true,
      terminalFieldTreeAndWidgetsIdentical: true,
      enhancedTerminalSemanticsIdentical: true,
      officialEnhancedSemanticsSha256: "same", derivedEnhancedSemanticsSha256: "same",
      officialXfa: { present: true, sha256: "xfa" },
      derivedXfa: { present: true, sha256: "xfa" },
      enhancedSemanticsDelta: { fieldsOnlyInOfficial: [], fieldsOnlyInDerivative: [],
        fieldDifferences: [], xfaIdentical: true },
    },
  };
  assert.equal(enhancedFidelityContract(semanticFixture), true);
  assert.throws(() => enhancedFidelityContract({ ...semanticFixture,
    comparison: { ...semanticFixture.comparison, derivedXfa: { present: true, sha256: "changed" } } }),
  /XFA digest changed/);
  const fakeConfig = FAMILIES["ca-1203-41-set"];
  const verifyRequest = readOnlyVerifyRequest("ca-1203-41-set", fakeConfig,
    fakeConfig.formNumbers.map((formNumber) => ({ source: { formNumber }, sourcePath: `${formNumber}.pdf` })));
  assert.equal(verifyRequest.mode, "verify");
  assert.equal(verifyRequest.writeScratch, false);
  assert.equal(verifyRequest.scratchDir, null);
  assert.match(String(checkCa), /readOnlyVerifyRequest/);
  const buildSource = String(buildCa);
  assert.ok(buildSource.indexOf("clearCaCompletionClaims")
    < buildSource.indexOf("resolveSources"),
  "CA must clear stale completion claims before source resolution can throw");
  assert.ok(buildSource.indexOf("await caCompletionEvidenceReady")
    < buildSource.indexOf("approval-request.json"),
  "completion evidence must pass before an approval request is written");
  assert.match(buildSource, /catch \(error\)[\s\S]*clearCaCompletionClaims/,
    "CA build failure must clear premature completion claims");
  const azBuildSource = String(buildAz);
  assert.ok(azBuildSource.indexOf("await azCompletionEvidenceReady")
    < azBuildSource.indexOf("approval-request.json"),
  "AZ completion evidence must pass before an approval request is written");
  assert.match(azBuildSource, /catch \(error\)[\s\S]*clearAzCompletionClaims/,
    "AZ build failure must clear premature completion claims");
  const azCheckSource = String(checkAz);
  assert.match(azCheckSource, /azMapAndAnchors/,
    "AZ check must regenerate the exact-source production map");
  assert.match(azCheckSource, /verifyAzArtifact/,
    "AZ check must rerun output-byte proof instead of trusting stored booleans");
  assert.match(String(recomputeRasterEvidence), /mkdtempSync[\s\S]*spawnSync\(POPPLER_PDFTOPPM[\s\S]*freshPng\.equals\(recordedPng\)/,
    "WEST --check must freshly replay Poppler in a temp directory and compare exact PNG bytes");
  for (const rasterizer of [rasterizeArtifacts, rasterizeCaArtifacts]) {
    const implementation = String(rasterizer);
    assert.match(implementation, /rasterizeWithPoppler/,
      "WEST production rastering must use the bounded Poppler helper");
    assert.doesNotMatch(implementation, /chooseChromium|rcap-pdf-rasterize/,
      "WEST production rastering must not launch Chromium");
  }
  console.log(`SELF_TEST_OK ${requestedFamily}`);
}

export async function runWestFamilyCli(familyId) {
  const config = requireFamily(familyId);
  if (process.argv.includes("--self-test")) return selfTest(familyId);
  if (process.argv.includes("--diagnose-fidelity")) {
    assert.equal(config.jurisdiction, "ca", "fidelity diagnosis is CA-only");
    return diagnoseCaFidelity(familyId, config);
  }
  if (process.argv.includes("--check")) {
    return config.jurisdiction === "az" ? checkAz(familyId, config) : checkCa(familyId, config);
  }
  return config.jurisdiction === "az" ? buildAz(familyId, config) : buildCa(familyId, config);
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  try { await runWestFamilyCli(FIRST_FAMILY); }
  catch (error) {
    console.error(`build-census-v1-${FIRST_FAMILY}: ${error.stack || error.message}`);
    process.exitCode = 1;
  }
}
