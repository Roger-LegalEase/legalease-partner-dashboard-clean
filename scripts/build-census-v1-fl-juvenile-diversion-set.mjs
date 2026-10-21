#!/usr/bin/env node
/**
 * PF21 deterministic overlay builder for FDLE40-025, Florida's five-page
 * juvenile-diversion-expunction application packet.
 *
 * The source is read from the governed repository source-recovery location,
 * asserted by byte length and SHA-256 before any output is written, with an
 * optional environment override that must satisfy the same identity checks.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractPageGeometry, extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import {
  BLANK_DISPOSITIONS,
  PASS_COUNTERS,
  classifyBlank,
  classifyField,
  rowKeyOf
} from "./rcap-packet-completeness/completeness-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { PDFDict, PDFDocument, PDFName, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "fl-juvenile-diversion-set";
const ROUTE_KEY = "obligation:track-pathway:FL:fl-juvenile-diversion:juvenile-diversion-expunction-943-0582";
const OUT = "data/rcap-all50/overlays/census-v1/fl/fl-juvenile-diversion-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-fl-juvenile-diversion-set.mjs";
const SOURCE_ID = "FDLE-JUVENILE-DIVERSION-EXPUNCTION-APPLICATION";
const COMPONENTS = [SOURCE_ID];
const EXPECTED_SOURCE_SHA256 = "a3ad1d240cf07092cf1e56fc825b207ec28b89541fb25f012b52356f7774788e";
const EXPECTED_SOURCE_LENGTH = 23990;
const EXPECTED_SOURCE_PAGES = 5;
const DEFAULT_SOURCE = path.join(ROOT, "reference/source-recovery/2026-09-11-wave1/"
  + "CODEX-CS2-SRC2__FL-JUVENILE-DIVERSION-SET__FDLE-JUVENILE-DIVERSION-EXPUNCTION-APPLICATION__a3ad1d240cf0.pdf");
const SIGNATURE = "signature_or_date_participant_completion";
const AGENCY_OWNED = "court_prosecutor_clerk_or_agency_owned";

const FIXTURES = Object.freeze({
  canonical: {
    "participant.full_name": "Jordan Avery Reyes",
    "participant.last_name": "Reyes",
    "participant.first_name": "Jordan",
    "participant.middle_name": "Avery",
    "participant.dob": "04/17/1991",
    "participant.race": "W",
    "participant.sex": "X",
    "participant.phone": "850-555-0142",
    "participant.street": "42 Larkspur Street",
    "participant.city": "Tallahassee",
    "participant.state": "FL",
    "participant.zip": "32301",
    "participant.email": "jordan.reyes@example.org",
    "matter.arresting_agency": "Tallahassee Police Department",
    "matter.arrest_date": "06/15/2008",
    "matter.charge": "Trespass in a structure or conveyance - misdemeanor, Fla. Stat. 810.08",
    "matter.diversion_program": "Juvenile Pretrial Intervention",
    "matter.diversion_completion_date": "08/20/2008",
    "matter.age_at_offense": "17",
    "matter.court": "Leon County Juvenile Division"
  },
  boundary: {
    /* Keep the held middle name in every split and whole-name placement. */
    "participant.full_name": "Maria-Alejandra Isabel O'Shaughnessy-Whitfield",
    "participant.last_name": "O'Shaughnessy-Whitfield",
    "participant.first_name": "Maria-Alejandra",
    "participant.middle_name": "Isabel",
    "participant.dob": "09/05/2006",
    "participant.race": "U",
    "participant.sex": "X",
    "participant.phone": "850-555-0199",
    "participant.street": "1188 Upper Coastal Crossing Rd Apt 14B",
    "participant.city": "Fort Walton Beach",
    "participant.state": "FL",
    "participant.zip": "32548-2214",
    "participant.email": "maria.oshaughnessy.whitfield@longmailexample.org",
    "matter.arresting_agency": "Okaloosa County Sheriff's Office",
    "matter.arrest_date": "07/18/2023",
    "matter.charge": "Criminal mischief causing property damage - misdemeanor, Fla. Stat. 806.13(1)(b)",
    "matter.diversion_program": "Youthful Offender Diversion Program",
    "matter.diversion_completion_date": "09/01/2023",
    "matter.age_at_offense": "16",
    "matter.court": "Okaloosa County Juvenile Division"
  }
});

/*
 * These are placement contracts, not rectangles inferred from our own draw
 * calls. Every region is tied to a caption or rule read from the pinned FDLE
 * source. The final-PDF audit below diffs source and output text runs and
 * refuses any run whose actual Helvetica glyph bounds leave its source region.
 */
const WRITE_LAYOUT = Object.freeze([
  { id: "page1_last_name", factId: "participant.last_name", page: 1, x: 45, y: 686, width: 202,
    region: [41.967, 253.278, 684.158, 710.208], anchor: { text: "Last Name", x: 44.817, y: 702.939, ruleY: 684.158 } },
  { id: "page1_first_name", factId: "participant.first_name", page: 1, x: 256, y: 686, width: 150,
    region: [253.278, 411.442, 684.158, 710.208], anchor: { text: "First Name", x: 255.703, y: 702.939, ruleY: 684.158 } },
  { id: "page1_middle_name", factId: "participant.middle_name", page: 1, x: 415, y: 686, width: 148,
    region: [411.442, 570.031, 684.158, 710.208], anchor: { text: "Middle Name", x: 413.867, y: 702.939, ruleY: 684.158 } },
  { id: "page1_dob", factId: "participant.dob", page: 1, x: 45, y: 573, width: 106,
    region: [41.967, 153.107, 564.708, 590.758], anchor: { text: "Date of Birth (MM/DD/YYYY)", x: 44.817, y: 583.489, ruleY: 564.708 } },
  { id: "page1_race", factId: "participant.race", page: 1, x: 157, y: 573, width: 116,
    region: [153.107, 279.638, 564.708, 590.758], anchor: { text: "Race", x: 155.532, y: 583.489, ruleY: 564.708 } },
  { id: "page1_sex", factId: "participant.sex", page: 1, x: 283, y: 573, width: 64,
    region: [279.638, 353.448, 564.708, 590.758], anchor: { text: "Sex", x: 282.063, y: 583.489, ruleY: 564.708 } },
  { id: "page1_phone", factId: "participant.phone", page: 1, x: 386, y: 573, width: 67,
    region: [384.216, 458.891, 564.708, 590.758], anchor: { text: "Phone", x: 355.873, y: 583.489, ruleY: 564.708 } },
  { id: "page1_mailing_address", factId: "participant.street", page: 1, x: 45, y: 547, width: 334,
    region: [41.967, 385.082, 538.658, 564.708], anchor: { text: "Mailing Address", x: 44.817, y: 557.439, ruleY: 538.658 } },
  { id: "page1_mailing_city", factId: "participant.city", page: 1, x: 388, y: 547, width: 113,
    region: [385.082, 506.341, 538.658, 564.708], anchor: { text: "City", x: 387.507, y: 557.439, ruleY: 538.658 } },
  { id: "page1_mailing_state", factId: "participant.state", page: 1, x: 508, y: 547, width: 22, preferred: 7.5,
    region: [506.341, 532.701, 538.658, 564.708], anchor: { text: "State", x: 508.766, y: 557.439, ruleY: 538.658 } },
  { id: "page1_mailing_zip", factId: "participant.zip", page: 1, x: 535, y: 547, width: 32, preferred: 7.5, minimum: 4.5,
    region: [532.701, 570.031, 538.658, 564.708], anchor: { text: "Zip", x: 535.126, y: 557.439, ruleY: 538.658 } },
  { id: "page1_permanent_address", factId: "participant.street", page: 1, x: 45, y: 521, width: 334,
    region: [41.967, 385.082, 512.608, 538.658], anchor: { text: "Permanent Address", x: 44.817, y: 531.389, ruleY: 512.608 } },
  { id: "page1_permanent_city", factId: "participant.city", page: 1, x: 388, y: 521, width: 113,
    region: [385.082, 506.341, 512.608, 538.658], anchor: { text: "City", x: 387.507, y: 531.389, ruleY: 512.608 } },
  { id: "page1_permanent_state", factId: "participant.state", page: 1, x: 508, y: 521, width: 22, preferred: 7.5,
    region: [506.341, 532.701, 512.608, 538.658], anchor: { text: "State", x: 508.766, y: 531.389, ruleY: 512.608 } },
  { id: "page1_permanent_zip", factId: "participant.zip", page: 1, x: 535, y: 521, width: 32, preferred: 7.5, minimum: 4.5,
    region: [532.701, 570.031, 512.608, 538.658], anchor: { text: "Zip", x: 535.126, y: 531.389, ruleY: 512.608 } },
  { id: "page1_email", factId: "participant.email", page: 1, x: 230, y: 495, width: 334,
    region: [226.917, 570.032, 486.558, 512.608], anchor: { text: "Email Address", x: 229.342, y: 505.339, ruleY: 486.558 } },
  { id: "page1_arresting_agency", factId: "matter.arresting_agency", page: 1, x: 136, y: 456, width: 208,
    region: [130.812, 344.636, 453.674, 466.863], anchor: { text: "Arresting Agency:", x: 58.392, y: 461.93, ruleY: 453.674 } },
  { id: "page1_completion_date", factId: "matter.diversion_completion_date", page: 1, x: 351, y: 456, width: 208, preferred: 8,
    region: [349.636, 560.606, 453.674, 466.863], anchor: { text: "Diversion Program Completion Date:", x: 356.636, y: 461.93, ruleY: 453.674 } },
  { id: "page1_arrest_date_1", factId: "matter.arrest_date", page: 1, x: 63, y: 412, width: 64, preferred: 7.5,
    region: [61.872, 129.562, 409.324, 427.263], anchor: { text: "Date(s) of Arrest", x: 64.381, y: 433.73, ruleY: 409.324 } },
  { id: "page1_charge_1", factId: "matter.charge", page: 1, x: 136, y: 412, width: 426, preferred: 7.5,
    region: [134.562, 563.107, 409.324, 427.263], anchor: { text: "Charge(s) Description", x: 307.05, y: 433.73, ruleY: 409.324 } },
  { id: "page2_name", factId: "participant.full_name", printedFormat: "last_comma_first_middle", page: 2, x: 45, y: 670, width: 257,
    region: [40.975, 306, 666.15, 693.4], anchor: { text: "Name (Last, First Middle)", x: 43.825, y: 685.276, ruleY: 666.15 } },
  { id: "page2_dob", factId: "participant.dob", page: 2, x: 309, y: 670, width: 125,
    region: [306, 438.3, 666.15, 693.4], anchor: { text: "DOB (MM/DD/YYYY)", x: 308.425, y: 685.276, ruleY: 666.15 } },
  { id: "page2_phone", factId: "participant.phone", page: 2, x: 441, y: 670, width: 126,
    region: [438.3, 571.025, 666.15, 693.4], anchor: { text: "Phone", x: 440.725, y: 685.276, ruleY: 666.15 } },
  /* The fingerprint-card rules are the writable spans. Keep each value on the
   * same baseline row as its printed label and bound its region to the exact
   * source rule, rather than the surrounding name/demographic block. */
  { id: "page3_last_name", factId: "participant.last_name", page: 3, x: 66, y: 690, width: 147,
    region: [64.74, 214.86, 687.425, 699.845], anchor: { text: "Last", x: 41.4, y: 689.845,
      ruleY: 687.425, ruleX0: 64.74, ruleX1: 214.86, regionTop: 699.845 } },
  { id: "page3_first_name", factId: "participant.first_name", page: 3, x: 247, y: 690, width: 139,
    region: [245.778, 387.558, 687.425, 699.845], anchor: { text: "First", x: 221.328, y: 689.845,
      ruleY: 687.425, ruleX0: 245.778, ruleX1: 387.558, regionTop: 699.845 } },
  { id: "page3_middle_name", factId: "participant.middle_name", page: 3, x: 426.5, y: 690, width: 133,
    region: [425.122, 561.342, 687.425, 699.845], anchor: { text: "Middle", x: 390.672, y: 689.845,
      ruleY: 687.425, ruleX0: 425.122, ruleX1: 561.342, regionTop: 699.845 } },
  { id: "page3_race", factId: "participant.race", page: 3, x: 77, y: 618, width: 64,
    region: [75.84, 142.56, 615.425, 627.845], anchor: { text: "RACE:", x: 41.4, y: 617.845,
      ruleY: 615.425, ruleX0: 75.84, ruleX1: 142.56, regionTop: 627.845 } },
  { id: "page3_sex", factId: "participant.sex", page: 3, x: 174.5, y: 618, width: 22,
    region: [173.36, 198.38, 615.425, 627.845], anchor: { text: "SEX:", x: 147.24, y: 617.845,
      ruleY: 615.425, ruleX0: 173.36, ruleX1: 198.38, regionTop: 627.845 } },
  { id: "page3_dob", factId: "participant.dob", page: 3, x: 230, y: 618, width: 50, preferred: 7.5,
    region: [228.49, 281.31, 615.425, 627.845], anchor: { text: "DOB:", x: 200.16, y: 617.845,
      ruleY: 615.425, ruleX0: 228.49, ruleX1: 281.31, regionTop: 627.845 } }
]);

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const sanitize = (text) => String(text).replaceAll("‑", "-").replaceAll("–", "-")
  .replaceAll("—", "-").replaceAll("’", "'").replaceAll("‘", "'")
  .replaceAll("“", "\"").replaceAll("”", "\"").replaceAll("§", "Sec. ");

function writeJson(rel, value) {
  const absolute = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`);
}

function hashRepoFile(rel) {
  const bytes = fs.readFileSync(path.join(ROOT, rel));
  return { path: rel, sha256: sha256(bytes), byteLength: bytes.length };
}

function sourceBytes() {
  const sourcePath = process.env.PF21_FL_JUVENILE_DIVERSION_SOURCE || DEFAULT_SOURCE;
  assert.ok(fs.existsSync(sourcePath),
    `BLOCKED_SOURCE: ${SOURCE_ID} is absent; required SHA-256 ${EXPECTED_SOURCE_SHA256}`);
  const bytes = fs.readFileSync(sourcePath);
  assert.equal(bytes.length, EXPECTED_SOURCE_LENGTH,
    `BLOCKED_SOURCE: ${SOURCE_ID} length ${bytes.length} != ${EXPECTED_SOURCE_LENGTH}`);
  assert.equal(sha256(bytes), EXPECTED_SOURCE_SHA256,
    `BLOCKED_SOURCE: ${SOURCE_ID} SHA-256 does not match ${EXPECTED_SOURCE_SHA256}`);
  return { sourcePath, bytes };
}

function rowBase(id, label, page) {
  return {
    field: `${SOURCE_ID}.${id}`,
    fieldName: `${SOURCE_ID}.${id}`,
    printedLabel: label,
    printedLine: label,
    effectiveLabel: label,
    regionHeading: label,
    sectionHeading: null,
    document: SOURCE_ID,
    page,
    rectBasis: "measured_on_flat_official_pdf"
  };
}

const writeRow = (id, label, page, factId) => ({
  ...rowBase(id, label, page), factId, kind: "text_write"
});

const protectedRow = (id, label, page, category, why) => ({
  ...rowBase(id, label, page),
  reason: category === SIGNATURE
    ? "signature or date field; never prefilled by this build"
    : "court, clerk, prosecutor, agency, notary, or fingerprint-official field; that official completes it",
  category,
  completenessClass: category,
  class: category,
  completenessDisposition: "PROTECTED_FIELD",
  requiredBeforeFiling: false,
  why
});

const rbfRow = (id, label, page, participantMustSupply, why) => ({
  ...rowBase(id, label, page),
  reason: `the participant supplies this before submission: ${participantMustSupply}`,
  category: null,
  completenessClass: null,
  class: null,
  disposition: "REQUIRED_BEFORE_FILING",
  completenessDisposition: "REQUIRED_BEFORE_FILING",
  requiredBeforeFiling: true,
  routeDetermined: false,
  identity: `${SOURCE_ID} field ${id}`,
  factId: null,
  participantMustSupply,
  why
});

const optionalRow = (id, label, page, why) => ({
  ...rowBase(id, label, page),
  reason: "optional participant-authored content; the platform does not invent it",
  category: null,
  completenessClass: null,
  class: null,
  requiredBeforeFiling: false,
  why
});

function maps() {
  const writes = [
    writeRow("page1_last_name", "Applicant last name", 1, "participant.last_name"),
    writeRow("page1_first_name", "Applicant first name", 1, "participant.first_name"),
    writeRow("page1_middle_name", "Applicant middle name", 1, "participant.middle_name"),
    writeRow("page1_dob", "Applicant date of birth", 1, "participant.dob"),
    writeRow("page1_race", "Applicant race", 1, "participant.race"),
    writeRow("page1_sex", "Applicant sex", 1, "participant.sex"),
    writeRow("page1_phone", "Applicant phone", 1, "participant.phone"),
    writeRow("page1_mailing_address", "Applicant mailing address", 1, "participant.street"),
    writeRow("page1_mailing_city", "Applicant mailing city", 1, "participant.city"),
    writeRow("page1_mailing_state", "Applicant mailing state", 1, "participant.state"),
    writeRow("page1_mailing_zip", "Applicant mailing zip", 1, "participant.zip"),
    writeRow("page1_permanent_address", "Applicant permanent address", 1, "participant.street"),
    writeRow("page1_permanent_city", "Applicant permanent city", 1, "participant.city"),
    writeRow("page1_permanent_state", "Applicant permanent state", 1, "participant.state"),
    writeRow("page1_permanent_zip", "Applicant permanent zip", 1, "participant.zip"),
    writeRow("page1_email", "Applicant email address", 1, "participant.email"),
    writeRow("page1_arresting_agency", "Arresting agency", 1, "matter.arresting_agency"),
    writeRow("page1_completion_date", "Diversion program completion date", 1, "matter.diversion_completion_date"),
    writeRow("page1_arrest_date_1", "Charge row 1 arrest date", 1, "matter.arrest_date"),
    writeRow("page1_charge_1", "Charge row 1 charge description", 1, "matter.charge"),
    writeRow("page2_name", "Applicant full name on written certified statement", 2, "participant.full_name"),
    writeRow("page2_dob", "Applicant date of birth on written certified statement", 2, "participant.dob"),
    writeRow("page2_phone", "Applicant phone on written certified statement", 2, "participant.phone"),
    writeRow("page3_last_name", "Fingerprinted person's last name", 3, "participant.last_name"),
    writeRow("page3_first_name", "Fingerprinted person's first name", 3, "participant.first_name"),
    writeRow("page3_middle_name", "Fingerprinted person's middle name", 3, "participant.middle_name"),
    writeRow("page3_race", "Fingerprinted person's race", 3, "participant.race"),
    writeRow("page3_sex", "Fingerprinted person's sex", 3, "participant.sex"),
    writeRow("page3_dob", "Fingerprinted person's date of birth", 3, "participant.dob")
  ];

  const refusals = [
    optionalRow("page1_alias_last", "Alias last name(s) (optional)", 1, "the official application labels aliases optional and the fixture carries none"),
    optionalRow("page1_alias_first", "Alias first name(s) (optional)", 1, "the official application labels aliases optional and the fixture carries none"),
    optionalRow("page1_alias_middle", "Alias middle name(s) (optional)", 1, "the official application labels aliases optional and the fixture carries none"),
    optionalRow("page1_ssn", "Social Security number (optional)", 1, "the official application marks it optional"),
    rbfRow("page1_driver_license", "Florida Driver's License No.", 1,
      "the applicant's Florida driver's-license number, if applicable", "the fixture does not hold this identity fact"),
    protectedRow("page1_applicant_signature", "Applicant signature", 1, SIGNATURE,
      "the applicant signs in the presence of a notary public or deputy clerk"),
    protectedRow("page1_signature_date", "Date beside applicant signature", 1, SIGNATURE,
      "the applicant supplies the true date when signing"),
    protectedRow("page1_parent_signature", "Signature of parent or legal guardian", 1, SIGNATURE,
      "the source marks this signature required if the applicant is under 18"),
    protectedRow("page1_parent_signature_date", "Date beside parent or legal guardian signature", 1, SIGNATURE,
      "the parent or legal guardian supplies the true date when signing, if required"),
    protectedRow("page1_notary_state_county", "Notary state and county", 1, AGENCY_OWNED,
      "the notary or deputy clerk completes the acknowledgment"),
    protectedRow("page1_notary_date", "Notary acknowledgment date", 1, AGENCY_OWNED,
      "the notary or deputy clerk completes the acknowledgment"),
    protectedRow("page1_notary_signature", "Notary signature", 1, AGENCY_OWNED,
      "the notary or deputy clerk signs"),
    protectedRow("page1_notary_commission", "Notary commissioned name or stamp", 1, AGENCY_OWNED,
      "the notary or deputy clerk completes it"),
    protectedRow("page1_notary_identification", "Notary identification type", 1, AGENCY_OWNED,
      "the notary or deputy clerk completes it"),
    rbfRow("participant_diversion_program", "Diversion program name and completion date (participant confirmation)", 1,
      "the program name and completion date exactly as shown on the completion certification", "the printed application has a completion-date field but no separate program-name field"),
    rbfRow("participant_offence_and_court", "Offence details and court involved (participant confirmation)", 1,
      "the offence, arresting agency, and court involved", "the source application prints charge and agency fields but does not print a separate court field"),
    rbfRow("participant_age_at_offence", "Age at time of the offence (participant confirmation)", 1,
      "the applicant's age when the arrest occurred", "the source application does not print an age-at-offence field")
  ];

  for (let row = 2; row <= 8; row += 1) {
    refusals.push(optionalRow(`page1_arrest_date_${row}`, `Charge row ${row} arrest date (optional additional charge)`, 1,
      "the fixture contains no additional arrest in this row"));
    refusals.push(optionalRow(`page1_charge_${row}`, `Charge row ${row} charge description (optional additional charge)`, 1,
      "the fixture contains no additional charge in this row"));
  }

  for (const [id, label] of [
    ["page2_state_attorney", "State Attorney or Statewide Prosecutor"],
    ["page2_reviewing_officer", "Reviewing Officer"],
    ["page2_county", "County"],
    ["page2_circuit", "Circuit"],
    ["page2_signature", "Signature of prosecuting authority"],
    ["page2_signature_date", "Date beside prosecuting-authority signature"],
    ["page2_title", "Title of prosecuting authority"],
    ["page2_completion_date", "Diversion Program Completion Date (certifying office)"]
  ]) {
    refusals.push(protectedRow(id, label, 2, AGENCY_OWNED,
      "the State Attorney or Statewide Prosecutor completes the written certified statement"));
  }
  for (let row = 1; row <= 8; row += 1) {
    for (const [suffix, label] of [
      ["charge", "charge description"],
      ["statute", "statute violation"],
      ["case", "case number"],
      ["action", "action"]
    ]) {
      refusals.push(protectedRow(`page2_${suffix}_${row}`, `State Attorney row ${row} ${label}`, 2, AGENCY_OWNED,
        "the State Attorney or Statewide Prosecutor completes the written certified statement"));
    }
  }

  refusals.push(
    optionalRow("page3_alias_last", "Fingerprint card alias last name (optional)", 3, "the fixture carries no alias"),
    optionalRow("page3_alias_first", "Fingerprint card alias first name (optional)", 3, "the fixture carries no alias"),
    optionalRow("page3_alias_middle", "Fingerprint card alias middle name (optional)", 3, "the fixture carries no alias"),
    optionalRow("page3_ssn", "Fingerprint card Social Security number (optional)", 3, "the official packet states disclosure is voluntary"),
    rbfRow("page3_place_of_birth", "Fingerprint card place of birth", 3,
      "the applicant's place of birth", "the fixture does not hold this identity fact"),
    protectedRow("page3_official_signature", "Signature of official taking fingerprints", 3, AGENCY_OWNED,
      "the fingerprint official completes it"),
    protectedRow("page3_ori", "ORI or fingerprinting-entity stamp", 3, AGENCY_OWNED,
      "the fingerprinting entity completes it"),
    protectedRow("page3_person_signature", "Signature of person fingerprinted", 3, SIGNATURE,
      "the applicant signs while being fingerprinted"),
    protectedRow("page3_person_signature_date", "Date beside signature of person fingerprinted", 3, SIGNATURE,
      "the applicant dates the fingerprint card when signing"),
    protectedRow("page3_fingerprint_impressions", "Fingerprint impressions", 3, AGENCY_OWNED,
      "the fingerprinting entity takes and completes the impressions")
  );

  return [{
    formNumber: SOURCE_ID,
    documentId: SOURCE_ID,
    documentRole: "primary_filing",
    documentPolicy: {
      mode: "participant",
      captionOnly: false,
      documentAcceptsFill: true,
      routeKey: ROUTE_KEY,
      documentId: SOURCE_ID,
      role: "primary_filing"
    },
    structuralClass: "flat_official_pdf",
    explicitMappings: {},
    roleRefusals: [],
    selectionControls: [],
    canonicalWrites: writes,
    canonicalRefusals: refusals,
    boundaryWrites: writes,
    boundaryRefusals: refusals
  }];
}

function fitText(page, font, value, placement) {
  assert.equal(typeof value, "string", `${placement.id}: required fixture value must be a string`);
  const text = sanitize(value);
  assert.ok(text.trim(), `${placement.id}: required fixture value is empty`);
  const minimum = placement.minimum ?? 5;
  let size = placement.preferred ?? 8.5;
  while (size > minimum && font.widthOfTextAtSize(text, size) > placement.width) size -= 0.25;
  const width = font.widthOfTextAtSize(text, size);
  assert.ok(width <= placement.width + 0.1,
    `${placement.id}: value does not fit measured rectangle: ${text}`);
  page.drawText(text, { x: placement.x, y: placement.y, size, font, color: rgb(0, 0, 0) });
  return { ...placement, text, size, drawnWidth: width };
}

function printedValueFor(placement, facts) {
  if (placement.printedFormat !== "last_comma_first_middle") return facts[placement.factId];
  const last = facts["participant.last_name"];
  const first = facts["participant.first_name"];
  const middle = facts["participant.middle_name"];
  for (const [name, value] of [["last", last], ["first", first], ["middle", middle]]) {
    assert.equal(typeof value, "string", `${placement.id}: ${name} name must be a string for printed ordering`);
    assert.ok(value.trim(), `${placement.id}: ${name} name is empty for printed ordering`);
  }
  return `${last}, ${first} ${middle}`;
}

const close = (a, b, tolerance = 0.02) => Math.abs(a - b) <= tolerance;
const rounded = (number) => Number(number.toFixed(3));

function assertSourceAnchors(pages, layout) {
  const geometry = pages.map((page) => extractPageGeometry(page));
  for (const placement of layout) {
    const page = geometry[placement.page - 1];
    assert.ok(page, `${placement.id}: source page ${placement.page} is absent`);
    const label = page.text.find((item) => item.text.trim() === placement.anchor.text
      && close(item.x, placement.anchor.x) && close(item.y, placement.anchor.y));
    assert.ok(label,
      `${placement.id}: named source anchor ${JSON.stringify(placement.anchor.text)} moved or disappeared`);
    if (placement.anchor.ruleY !== undefined) {
      const hasExactRule = placement.anchor.ruleX0 !== undefined;
      if (hasExactRule) {
        const expectedRegion = [placement.anchor.ruleX0, placement.anchor.ruleX1,
          placement.anchor.ruleY, placement.anchor.regionTop];
        assert.ok(placement.region.every((value, index) => close(value, expectedRegion[index])),
          `${placement.id}: allowed region must equal its measured source blank ${JSON.stringify(expectedRegion)}`);
      }
      const rule = page.paths.find((item) => Math.abs(item.height) <= 0.5
        && close(item.y, placement.anchor.ruleY)
        && (hasExactRule
          ? close(item.x, placement.anchor.ruleX0) && close(item.x + item.width, placement.anchor.ruleX1)
          : item.x < placement.region[1] && item.x + item.width > placement.region[0]));
      assert.ok(rule, `${placement.id}: source blank rule y=${placement.anchor.ruleY} moved or disappeared`);
    }
  }
}

async function overlayOfficialPdf(bytes, facts, layout = WRITE_LAYOUT) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  stampDeterministic(doc);
  doc.setTitle("FDLE40-025 Juvenile Diversion Expunction Application - PF21 fixture");
  doc.setCreator("RCAP PF21 artifact-only builder");
  doc.setProducer("RCAP PF21 artifact-only builder");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  assert.equal(pages.length, EXPECTED_SOURCE_PAGES, "the exact FDLE source must retain all five pages");
  assertSourceAnchors(pages, layout);
  const plannedWrites = layout.map((placement) => ({
    ...fitText(pages[placement.page - 1], font, printedValueFor(placement, facts), placement),
    heldValue: sanitize(facts[placement.factId]),
    reformattedForPrintedCaption: Boolean(placement.printedFormat)
  }));
  return {
    bytes: Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false })),
    plannedWrites
  };
}

function textRunKey(page, item) {
  return `${page}|${item.x.toFixed(2)}|${item.y.toFixed(2)}|${Number(item.size || 0).toFixed(2)}|${item.text}`;
}

async function addedTextRuns(sourceBytes, outputBytes) {
  const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const output = await PDFDocument.load(outputBytes, { ignoreEncryption: true, updateMetadata: false });
  const sourceRuns = new Map();
  source.getPages().forEach((page, index) => {
    for (const item of extractTextItems(page)) {
      const key = textRunKey(index + 1, item);
      sourceRuns.set(key, (sourceRuns.get(key) ?? 0) + 1);
    }
  });
  const added = [];
  output.getPages().forEach((page, index) => {
    for (const item of extractTextItems(page)) {
      const key = textRunKey(index + 1, item);
      const left = sourceRuns.get(key) ?? 0;
      if (left > 0) sourceRuns.set(key, left - 1);
      else if (item.text.trim()) added.push({
        page: index + 1,
        x: item.x,
        y: item.y,
        size: Number(item.size || 0),
        text: item.text
      });
    }
  });
  return { source, output, added };
}

function widgetAppearancesIn(document) {
  let count = 0;
  for (const [, object] of document.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFDict)) continue;
    if (String(object.get(PDFName.of("Subtype"))) !== "/Widget") continue;
    if (object.has(PDFName.of("AP"))) count += 1;
  }
  return count;
}

function helveticaGlyphBounds(run, font) {
  /* Standard Helvetica's AFM FontBBox is [-166,-225,1000,931], while its
   * cap/ascent and descender used for visible text are 718 and -207. The same
   * numbers reproduce Poppler's actual glyph bboxes for this source/output. */
  return {
    x0: run.x,
    x1: run.x + font.widthOfTextAtSize(run.text, run.size),
    y0: run.y - run.size * 0.207,
    y1: run.y + run.size * 0.718
  };
}

async function measureOverlay(sourceBytes, outputBytes, plannedWrites) {
  const { source, output, added } = await addedTextRuns(sourceBytes, outputBytes);
  const scratch = await PDFDocument.create();
  const font = await scratch.embedFont(StandardFonts.Helvetica);
  const unused = new Set(added.map((_, index) => index));
  const actualWrites = [];
  const outside = [];
  for (const planned of plannedWrites) {
    const candidates = [...unused].filter((index) => {
      const run = added[index];
      return run.page === planned.page && run.text === planned.text;
    }).sort((a, b) => {
      const ar = added[a];
      const br = added[b];
      return Math.abs(ar.x - planned.x) + Math.abs(ar.y - planned.y)
        - Math.abs(br.x - planned.x) - Math.abs(br.y - planned.y);
    });
    assert.ok(candidates.length, `${planned.id}: expected text is absent from final PDF bytes`);
    const index = candidates[0];
    unused.delete(index);
    const run = added[index];
    const bounds = helveticaGlyphBounds(run, font);
    const [x0, x1, y0, y1] = planned.region;
    const inside = bounds.x0 >= x0 - 0.02 && bounds.x1 <= x1 + 0.02
      && bounds.y0 >= y0 - 0.02 && bounds.y1 <= y1 + 0.02;
    if (!inside) outside.push({ id: planned.id, text: run.text, bounds, sourceRegion: planned.region });
    actualWrites.push({
      field: `${SOURCE_ID}.${planned.id}`,
      document: SOURCE_ID,
      factId: planned.factId,
      heldValue: planned.heldValue,
      expected: planned.text,
      drawnText: run.text,
      printedFormat: planned.printedFormat ?? null,
      reformattedForPrintedCaption: planned.reformattedForPrintedCaption,
      foundInOutputBytes: true,
      page: run.page,
      measuredOrigin: { x: rounded(run.x), y: rounded(run.y) },
      measuredGlyphBounds: Object.fromEntries(Object.entries(bounds).map(([key, value]) => [key, rounded(value)])),
      sourceRegion: { x0, x1, y0, y1 },
      sourceAnchor: planned.anchor,
      insideNamedSourceRegion: inside,
      proof: "text run diffed from pinned source and measured in final PDF bytes against its named source region"
    });
  }
  for (const index of unused) {
    const run = added[index];
    outside.push({
      id: null,
      text: run.text,
      bounds: helveticaGlyphBounds(run, font),
      sourceRegion: null,
      reason: "added output text has no declared write"
    });
  }
  const glyphCount = (run) => [...run.text].filter((character) => character.trim()).length;
  return {
    actualWrites,
    addedGlyphsReadFromOutputBytes: added.reduce((sum, run) => sum + glyphCount(run), 0),
    widgetAppearancesReadFromSourceBytes: widgetAppearancesIn(source),
    flattenedWidgetAppearancesReadFromOutputBytes: widgetAppearancesIn(output),
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: outside.reduce((sum, row) => sum + glyphCount(row), 0),
    outside,
    sourceRegionsMeasured: plannedWrites.length,
    addedTextRunsReadFromOutputBytes: added.length
  };
}

async function renderAndMeasure(sourceBytes, facts, layout = WRITE_LAYOUT) {
  const rendered = await overlayOfficialPdf(sourceBytes, facts, layout);
  const measured = await measureOverlay(sourceBytes, rendered.bytes, rendered.plannedWrites);
  assert.equal(measured.actualWrites.length, layout.length,
    "not every declared write was recovered from final PDF bytes");
  assert.equal(measured.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, 0,
    `added glyphs left their named source regions: ${JSON.stringify(measured.outside)}`);
  return { ...rendered, measured };
}

async function checkStoredFixtures(sourceBytes, fixtureDirectory = path.join(ROOT, OUT, "fixtures")) {
  const checked = [];
  for (const fixture of ["canonical", "boundary"]) {
    const expected = await renderAndMeasure(sourceBytes, FIXTURES[fixture]);
    const storedPath = path.join(fixtureDirectory, `${fixture}.pdf`);
    assert.ok(fs.existsSync(storedPath), `${fixture}: committed fixture is absent at ${storedPath}`);
    const storedBytes = fs.readFileSync(storedPath);
    const storedMeasurement = await measureOverlay(sourceBytes, storedBytes, expected.plannedWrites);
    assert.equal(storedMeasurement.actualWrites.length, WRITE_LAYOUT.length,
      `${fixture}: stored fixture does not contain all declared writes`);
    assert.equal(storedMeasurement.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, 0,
      `${fixture}: stored fixture has glyphs outside named source regions`);
    const expectedSha256 = sha256(expected.bytes);
    const storedSha256 = sha256(storedBytes);
    assert.equal(storedSha256, expectedSha256,
      `${fixture}: stored fixture is stale or tampered; expected ${expectedSha256}, got ${storedSha256}`);
    checked.push({
      fixture,
      expectedSha256,
      storedSha256,
      storedByteLength: storedBytes.length,
      pageCount: (await PDFDocument.load(storedBytes)).getPageCount(),
      sourceRegionsMeasuredFromStoredBytes: storedMeasurement.sourceRegionsMeasured,
      addedGlyphsReadFromStoredBytes: storedMeasurement.addedGlyphsReadFromOutputBytes,
      widgetAppearancesReadFromSourceBytes: storedMeasurement.widgetAppearancesReadFromSourceBytes,
      flattenedWidgetAppearancesReadFromStoredBytes:
        storedMeasurement.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes:
        storedMeasurement.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes
    });
  }
  return checked;
}

async function textOfPages(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return doc.getPages().map((page) => groupIntoLines(extractTextItems(page))
    .map((line) => line.text).join(" ").replace(/\s+/g, " "));
}

async function buildFixture(source, fixtureName, facts, fieldMaps) {
  const { bytes: packetBytes, measured } = await renderAndMeasure(source, facts);
  const document = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const pagesText = await textOfPages(packetBytes);
  const documentText = pagesText.join(" ").replace(/\s+/g, " ");
  for (const field of fieldMaps[0].canonicalWrites) {
    const proof = measured.actualWrites.find((write) => write.field === field.field);
    assert.ok(proof, `${fixtureName} ${field.field} has no final-PDF write proof`);
    assert.equal(proof.factId, field.factId, `${fixtureName} ${field.field} changed fact identity`);
    assert.ok(documentText.includes(proof.drawnText),
      `${fixtureName} ${field.field}: printed value is not readable from final packet bytes`);
  }
  assert.deepEqual(measured.actualWrites.map((write) => write.field),
    fieldMaps[0].canonicalWrites.map((write) => write.field),
    "the source-bound write layout and production field map diverged");
  const rel = `${OUT}/fixtures/${fixtureName}.pdf`;
  fs.writeFileSync(path.join(ROOT, rel), packetBytes);
  const pageManifest = Array.from({ length: document.getPageCount() }, (_, index) => ({
    packetPage: index + 1,
    component: SOURCE_ID,
    documentId: SOURCE_ID,
    sourcePage: index + 1,
    sourceSha256: EXPECTED_SOURCE_SHA256
  }));
  return {
    fixture: fixtureName,
    file: rel,
    sha256: sha256(packetBytes),
    byteLength: packetBytes.length,
    pageCount: document.getPageCount(),
    pageManifest,
    documents: COMPONENTS,
    components: COMPONENTS,
    actualWrites: measured.actualWrites,
    measurement: measured,
    glyphs: measured.addedGlyphsReadFromOutputBytes
  };
}

function requiredBeforeFiling(fieldMaps) {
  return fieldMaps.flatMap((map) => map.canonicalRefusals
    .filter((field) => field.requiredBeforeFiling === true)
    .map((field) => ({
      document: map.formNumber,
      field: field.field,
      page: field.page,
      printedContext: field.printedLabel,
      disclosureLabel: field.effectiveLabel,
      identity: field.identity,
      why: field.why,
      participantMustSupply: field.participantMustSupply
    })));
}

function participantInstructions(items) {
  const out = [
    "# Before you submit the Florida juvenile-diversion expunction application",
    "",
    "This review artifact contains the complete five-page FDLE40-025 application packet for juvenile-diversion expunction under section 943.0582, Florida Statutes. The first two pages are the application and written certified statement, page 3 is the fingerprint card, and pages 4 and 5 are the official information and checklist.",
    "",
    "This is the statewide FDLE agency route for a qualifying juvenile diversion record. It does not require filing a petition with a court, and this route does not consume the ordinary once-per-lifetime allowance. The application still depends on the State Attorney or diversion program certifying successful completion and on FDLE's review.",
    "",
    "## Required before submission",
    "",
    "| Blank printed in the official packet | What you must supply |",
    "| --- | --- |"
  ];
  for (const item of items) {
    out.push(`| ${item.disclosureLabel.replaceAll("|", "-")} | ${item.participantMustSupply.replaceAll("|", "-")} |`);
  }
  out.push(
    "| Certification of successful diversion completion | Obtain the certification from the State Attorney's office or diversion program and make sure it matches the program and completion date you supplied. The certifying office completes the certification section on page 2. |",
    "| Proof of program completion | Obtain written proof of successful completion from the diversion program. For a pretrial intervention or another diversion program, the official checklist says a completion certificate or successful-completion letter may substitute for a certified disposition. |",
    "| Completed fingerprint form/card | Have fingerprints taken by an authorized law-enforcement member or an FDLE-authorized vendor. The physical paper fingerprint card must include the applicant's name, date of birth, signature, and date, plus the official signature and agency ORI or stamp. |",
    "| Applicant signature and acknowledgment | Sign the application in the presence of a notary public or deputy clerk, as the official checklist directs. Leave the acknowledgment fields for that official. |",
    "| Original supporting documents | The official checklist says submitted documentation must be original and copies will not be accepted. Keep copies for your records before submission. |",
    "| Processing fee | The checklist describes a $75 payment but expressly says the fee is not required for juvenile-diversion expunction applications. The track record does not state a separate fee or waiver procedure; confirm current FDLE instructions before sending anything. |",
    "| Attorney letterhead, if represented | If represented, include the attorney's letter of representation on letterhead with the mailing address, as the official checklist directs. |",
    "",
    "## What the certifying office completes",
    "",
    "The State Attorney or Statewide Prosecutor completes the written certified statement on page 2. That office supplies the reviewing officer, county, circuit, charge, statute violation, case number, action, certification date, signature, and title. Those fields remain blank in this packet. Do not fill them yourself and do not represent that an office has certified a fact before it does so.",
    "",
    "The fingerprinting official completes the official signature, ORI or agency stamp, and fingerprint impressions on page 3. The applicant signs and dates the person-fingerprinted block at that appointment. Notary fields and all signatures remain blank until the person or official who owns them completes them.",
    "",
    "## Review and stop conditions",
    "",
    "Review each prefilled identity, agency, date, and charge against the participant's records. Add every arrest and charge that belongs in the application and leave unused optional rows empty. The application is administrative and FDLE decides it; no court petition, court service, or court case number is created by this route.",
    "",
    "Stop and get help before submission if: The State Attorney or the program declines to certify. Also stop for: Any immigration matter. Those stop conditions are part of this route's participant handoff; do not infer eligibility around either one.",
    "",
    "Any field marked optional by the official form, including aliases and Social Security number, remains optional. The Florida driver's-license number and place of birth are left for the participant to supply when applicable because this fixture does not hold those facts; do not invent them.",
    "",
    `Route: ${ROUTE_KEY}`,
    ""
  );
  return out.join("\n");
}

/** The submission steps, as their own function so they can be read and tested
 *  without a source binary in custody. */
function filingInstructions() {
  return [
    "# Submission instructions - FDLE juvenile diversion expunction",
    "",
    "1. Review page 1, confirm the participant identity and diversion facts, and list every arrest date and charge included in the request.",
    "2. Obtain the certification of successful diversion completion from the State Attorney's office or diversion program. The certifying office completes the written certified statement on page 2; leave its fields blank until that office completes them.",
    "3. Obtain written proof of program completion from the diversion program. For pretrial intervention or another diversion program, the official checklist says a completion certificate or successful-completion letter may substitute for a certified disposition.",
    "4. Have fingerprints taken by an authorized law-enforcement member or an FDLE-authorized vendor. Submit the physical paper fingerprint card with the official signature and ORI or agency stamp.",
    "5. Sign page 1 in the presence of a notary public or deputy clerk, and sign and date the person-fingerprinted block at the fingerprinting appointment. Do not prefill official-owned fields.",
    "6. Assemble the application with the certification, completion proof, fingerprints, and any original supporting documents required by the official checklist. The checklist states that its $75 processing fee is not required for juvenile-diversion expunction applications; the track record states no separate fee or waiver procedure, so confirm current FDLE instructions before submission.",
    "7. Mail the complete packet to Florida Department of Law Enforcement, ATTN: Seal & Expunge Section, P.O. Box 1489, Tallahassee, FL 32302-1489, as printed on page 4. Confirm current submission instructions before mailing.",
    "",
    "This is an FDLE agency submission under section 943.0582, not a court petition or court filing. Keep copies of the complete packet and delivery proof.",
    "",
    `Route: ${ROUTE_KEY}`,
    ""
    ].join("\n");
}

function countCompleteness(fieldMaps, artifacts, instructions) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((counter) => [counter, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };
  const normalize = (field) => ({
    id: field.field,
    name: field.fieldName ?? field.field,
    label: field.effectiveLabel ?? field.printedLabel ?? field.field,
    reason: field.reason ?? "",
    refusalClass: field.category ?? null,
    page: field.page,
    document: field.document,
    factId: field.factId ?? null,
    isSelectionControl: field.isSelectionControl === true || field.kind === "selection_control",
    declared: {
      disposition: field.completenessDisposition ?? null,
      ...(Object.hasOwn(field, "requiredBeforeFiling")
        ? { requiredBeforeFiling: field.requiredBeforeFiling === true } : {}),
      routeDetermined: field.routeDetermined === true,
      factId: field.factId ?? null,
      identity: field.identity ?? field.field
    }
  });
  const writes = fieldMaps.flatMap((map) => map.canonicalWrites.map(normalize));
  const blanks = fieldMaps.flatMap((map) => map.canonicalRefusals.map(normalize));
  const available = new Set(writes.map((field) => field.factId).filter(Boolean));
  const ledger = [];
  for (const blank of blanks) {
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, {
      ...blank.declared,
      factAvailable: blank.declared.factId ? available.has(blank.declared.factId) : false
    });
    ledger.push({ ...blank, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") {
      note("knownRequiredFieldsMissing", { field: blank.id, basis: verdict.basis });
    } else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") {
      note("requiredOptionsMissing", { field: blank.id, basis: verdict.basis });
    } else {
      note("unclassifiedBlanks", { field: blank.id, basis: verdict.basis });
    }
  }
  const haystack = instructions.toLowerCase();
  for (const blank of ledger.filter((field) => field.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [blank.label, blank.id, blank.declared.identity].filter(Boolean);
    if (!needles.some((needle) => haystack.includes(String(needle).toLowerCase().slice(0, 60)))) {
      note("requiredFactsNotCollected", { field: blank.id });
    }
  }
  const rows = new Map();
  for (const field of [
    ...writes.map((entry) => ({ ...entry, written: true })),
    ...blanks.map((entry) => ({ ...entry, written: false }))
  ]) {
    const key = rowKeyOf(field);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(field);
  }
  for (const [key, fields] of rows) {
    if (!fields.some((field) => field.written)) continue;
    const missing = fields.filter((field) => !field.written
      && classifyField(field.label, field.isSelectionControl).requirement === "REQUIRED_KNOWN");
    if (missing.length) note("incompleteRows", { row: key, fields: missing.map((field) => field.id) });
  }
  for (const field of writes) {
    if (classifyField(field.label, field.isSelectionControl).requirement === "PROTECTED") {
      note("protectedWrites", { field: field.id });
    }
  }
  for (const artifact of artifacts) {
    const measurement = artifact.measurement;
    const visible = measurement.addedGlyphsReadFromOutputBytes
      + measurement.flattenedWidgetAppearancesReadFromOutputBytes;
    if (artifact.actualWrites.length > 0 && visible === 0) {
      note("invisibleWrites", { fixture: artifact.fixture });
    }
    if (measurement.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes > 0) {
      note("visualDefects", {
        fixture: artifact.fixture,
        glyphsOutsideMeasuredBoxes: measurement.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
        sample: measurement.outside.slice(0, 8)
      });
    }
  }
  return { counters, findings, ledger };
}

/* Keep split and whole-name placements tied to the same held participant facts.
 * The boundary fixture includes punctuation and a hyphenated surname so a
 * short hand-written page-2 identity cannot silently diverge from pages 1/3. */
function assertFixtureNamesAreConsistent() {
  for (const [name, facts] of Object.entries(FIXTURES)) {
    const whole = String(facts["participant.full_name"] ?? "");
    for (const part of ["participant.first_name", "participant.middle_name", "participant.last_name"]) {
      const value = String(facts[part] ?? "");
      if (!value) continue;
      assert.ok(whole.includes(value),
        `${FAMILY_ID}/${name}: participant.full_name "${whole}" does not contain ${part} "${value}". `
        + "One packet would print two different applicant identities. Fix the fixture facts; "
        + "never drop a held name part and never invent one.");
    }
  }
}

function assertJuvenileDiversionGuide(participantMd, filingMd) {
  const required = [
    ["juvenile diversion route", /juvenile[- ]diversion/i],
    ["section 943.0582", /943\.0582/],
    ["completion certification", /certif(?:ication|y|ied)/i],
    ["completion proof", /proof of (?:program )?completion|completion certificate/i],
    ["fingerprints", /fingerprints?/i],
    ["agency submission", /FDLE agency submission|administrative/i],
    ["State Attorney or program owner", /State Attorney.*program|program.*State Attorney/i]
  ];
  for (const [what, pattern] of required) {
    for (const [label, text] of [["participant-instructions.md", participantMd], ["filing-instructions.md", filingMd]]) {
      assert.ok(pattern.test(text), `${FAMILY_ID}: ${label} does not disclose ${what}.`);
    }
  }
  for (const stop of ["The State Attorney or the program declines to certify.", "Any immigration matter."]) {
    assert.ok(participantMd.includes(stop), `${FAMILY_ID}: participant guide omits stop condition ${stop}`);
  }
  assert.match(participantMd, /does not consume the ordinary once-per-lifetime allowance/i,
    `${FAMILY_ID}: participant guide must disclose the track's allowance treatment`);
  assert.match(participantMd, /fee is not required for juvenile-diversion expunction/i,
    `${FAMILY_ID}: participant guide must preserve the official juvenile-diversion fee exception`);
}

async function run(argv = process.argv.slice(2)) {
  process.chdir(ROOT);
  /* Every gate that needs no source binary runs before the source gate. */
  const fieldMaps = maps();
  assertFixtureNamesAreConsistent();
  const rbf = requiredBeforeFiling(fieldMaps);
  const instructions = participantInstructions(rbf);
  const filing = filingInstructions();
  assertJuvenileDiversionGuide(instructions, filing);
  const { sourcePath, bytes } = sourceBytes();
  if (argv.includes("--check")) {
    const checked = await checkStoredFixtures(bytes);
    return {
      familyId: FAMILY_ID,
      status: "CHECK_ONLY",
      sourceSha256: sha256(bytes),
      sourceByteLength: bytes.length,
      components: COMPONENTS,
      writes: fieldMaps[0].canonicalWrites.length,
      blanks: fieldMaps[0].canonicalRefusals.length,
      artifacts: checked
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  const artifacts = [];
  for (const fixtureName of ["canonical", "boundary"]) {
    artifacts.push(await buildFixture(bytes, fixtureName, FIXTURES[fixtureName], fieldMaps));
  }
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructions);
  fs.writeFileSync(path.join(ROOT, OUT, "filing-instructions.md"), filing);
  const counted = countCompleteness(fieldMaps, artifacts, instructions);
  assert.ok(PASS_COUNTERS.every((counter) => counted.counters[counter] === 0),
    `builder completeness counters are nonzero: ${JSON.stringify(counted.counters)}`);

  const authorityRecords = [
    "data/record-clearing/legal-design-intake/FL.memo.json",
    "data/record-clearing/legal-design-packet-set-manifests.json",
    "src/lib/rcap-engine/compiled/profiles/FL-florida.json",
    "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
    "data/rcap-grade-a/source-wave-integration/SOURCE_RECOVERY_WAVE1_2026-09-11.json"
  ].map(hashRepoFile);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID,
    worklistGroupId: FAMILY_ID,
    jurisdiction: "FL",
    implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_BOUND_BY_HELD_BYTES",
    acquisitionCommissioned: false,
    bindingMethod: "the owner-custodied source byte expressly retained for this family is read from its recovered reference path and asserted by SHA-256 and byte length; no acquisition, research, or substitution occurs",
    allSourcesExact: true,
    routeKeys: [ROUTE_KEY],
    sourceBinaryCommitted: true,
    mountedReadOnlySource: {
      documentId: SOURCE_ID,
      sourceId: `official-form:${SOURCE_ID}`,
      custodyPath: sourcePath,
      sha256: EXPECTED_SOURCE_SHA256,
      byteLength: EXPECTED_SOURCE_LENGTH,
      pageCount: EXPECTED_SOURCE_PAGES,
      printedFormNumber: "FDLE40-025",
      revision: "Revised July 2022"
    },
    documents: [{
      documentId: SOURCE_ID,
      formNumber: "FDLE40-025",
      kind: "held_official_pdf",
      role: "primary_filing",
      sha256: EXPECTED_SOURCE_SHA256,
      byteLength: EXPECTED_SOURCE_LENGTH,
      pageCount: EXPECTED_SOURCE_PAGES
    }],
    authorityRecords,
    formIdentityNote: "The held official source is the FDLE renderer output titled Application for a Juvenile Diversion Expunction, printed form FDLE40-025, Revised July 2022.",
    commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "participant eligibility",
      "source freshness beyond the exact PF21 binding and committed acquisition return",
      "independent verification, raster acceptance, counsel approval, or fulfillment authority"
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    jurisdiction: "FL",
    renderStrategy: "official_pdf_overlay",
    implementationStrategy: "official_pdf_fill",
    routeKeys: [ROUTE_KEY],
    legalName: "Florida Juvenile Diversion Expunction under Fla. Stat. Sec. 943.0582",
    statute: "Fla. Stat. Sec. 943.0582; Fla. Admin. Code R. 11C-7.009",
    officialForm: "FDLE40-025",
    componentSet: COMPONENTS,
    instrumentKinds: ["primary_filing"],
    dispositionVocabulary: [SIGNATURE, AGENCY_OWNED],
    routeSelectionsMade: [{
      routeKey: ROUTE_KEY,
      selection: "FDLE Juvenile Diversion Expunction under section 943.0582",
      sourceSupport: "the exact FDLE40-025 source and committed fl-juvenile-diversion legal-design records"
    }],
    routeSelectionNote: "This family is fixed to the juvenile-diversion-expunction branch; the packet presents no other Florida relief election.",
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    requiredSupportingItems: [
      "completed State Attorney or Statewide Prosecutor written certified statement",
      "certification of successful diversion completion",
      "proof of diversion program completion",
      "completed physical fingerprint card",
      "original supporting documents",
      "applicant signature and notary or deputy-clerk acknowledgment",
      "attorney letterhead if represented"
    ],
    maps: fieldMaps,
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId: FAMILY_ID,
    renderedFresh: true,
    derivedFromBytes: true,
    componentSet: COMPONENTS,
    pdfs: artifacts.map((artifact) => ({
      file: artifact.file,
      documentId: SOURCE_ID,
      role: "assembled_official_application_packet",
      fixture: artifact.fixture,
      sha256: artifact.sha256,
      byteLength: artifact.byteLength,
      pageCount: artifact.pageCount
    })),
    artifacts: artifacts.map(({ actualWrites, glyphs, measurement, ...artifact }) => artifact),
    packets: artifacts.map((artifact) => ({ fixture: artifact.fixture, documents: artifact.documents })),
    everyPageRastered: false,
    byteDerivedHashes: true,
    rasterEngine: null,
    rasterSkipped: true,
    rasterPages: [],
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1",
    familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    note: "Every reported fact value and geometry counter is derived from a source-vs-output text-run diff over the final PDF bytes. The pinned source is flat and contains no widget appearance objects.",
    documents: artifacts.map((artifact) => ({
      fixture: artifact.fixture,
      valuesReportedByFinalizer: artifact.actualWrites.length,
      addedGlyphsReadFromOutputBytes: artifact.measurement.addedGlyphsReadFromOutputBytes,
      widgetAppearancesReadFromSourceBytes: artifact.measurement.widgetAppearancesReadFromSourceBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: artifact.measurement.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: artifact.measurement.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      sourceRegionsMeasured: artifact.measurement.sourceRegionsMeasured,
      addedTextRunsReadFromOutputBytes: artifact.measurement.addedTextRunsReadFromOutputBytes,
      refusedFieldsWithInk: [],
      actualWrites: artifact.actualWrites
    })),
    artifacts: artifacts.map((artifact) => ({
      fixture: artifact.fixture,
      valuesReportedByFinalizer: artifact.actualWrites.length,
      addedGlyphsReadFromOutputBytes: artifact.measurement.addedGlyphsReadFromOutputBytes,
      widgetAppearancesReadFromSourceBytes: artifact.measurement.widgetAppearancesReadFromSourceBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: artifact.measurement.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: artifact.measurement.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      sourceRegionsMeasured: artifact.measurement.sourceRegionsMeasured,
      addedTextRunsReadFromOutputBytes: artifact.measurement.addedTextRunsReadFromOutputBytes,
      refusedFieldsWithInk: []
    })),
    blockingFindings: artifacts.flatMap((artifact) => artifact.measurement.outside.map((finding) => ({
      fixture: artifact.fixture,
      check: "added_glyphs_outside_named_source_region",
      ...finding
    })))
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1",
    familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    requiredSupportingItems: [
      "completed prosecutor certified statement",
      "certification and proof of diversion program completion",
      "completed physical fingerprint card",
      "original supporting documents"
    ],
    protectedBlanks: fieldMaps[0].canonicalRefusals
      .filter((field) => field.requiredBeforeFiling !== true)
      .map((field) => ({
        document: SOURCE_ID,
        field: field.field,
        label: field.effectiveLabel,
        refusalClass: field.category ?? null,
        why: field.why ?? field.reason
      })),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1",
    familyId: FAMILY_ID,
    whatThisIs: "the builder's fail-fast count of the nine repository completeness counters",
    whatThisIsNot: "an independent verification or raster verdict",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((counter) => counted.counters[counter] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, field) => {
      acc[field.disposition] = (acc[field.disposition] ?? 0) + 1;
      return acc;
    }, {})
  });

  writeJson(`${OUT}/packet-set-manifest.json`, {
    schemaVersion: "rcap-packet-set-manifest/v1",
    familyId: FAMILY_ID,
    routeKey: ROUTE_KEY,
    implementationStrategy: "official_pdf_fill",
    components: [{
      documentId: SOURCE_ID,
      printedFormNumber: "FDLE40-025",
      role: "primary_filing",
      sourceSha256: EXPECTED_SOURCE_SHA256,
      sourceByteLength: EXPECTED_SOURCE_LENGTH,
      sourcePageCount: EXPECTED_SOURCE_PAGES,
      renderedInBothFixtures: true
    }],
    instructions: ["participant-instructions.md", "filing-instructions.md"],
    rasterState: "BUILT_RASTER_PENDING",
    selfVerified: false,
    commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1",
    familyId: FAMILY_ID,
    buildStatus: "state_built",
    reviewStatus: "qa_review_pending",
    builtBy: BUILD_SCRIPT,
    renderedArtifacts: 2,
    rasterPages: 0,
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING",
    selfVerified: false,
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0,
    productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1",
    familyId: FAMILY_ID,
    blocking: [],
    findings: [
      {
        finding: "The exact held source is a five-page flat FDLE PDF, printed FDLE40-025 and Revised July 2022.",
        consequence: "The build asserts the assigned SHA-256 and byte length, overlays measured participant fields, and preserves all five pages."
      },
      {
        finding: "The prosecutor statement, notary acknowledgment, fingerprint-official fields, fingerprint impressions, and participant signature/date fields have separate completion owners.",
        consequence: "Every one remains blank and the participant instructions name who completes it."
      },
      {
        finding: "The official checklist requires the written certified statement, completion documentation, physical fingerprints, and original documents; it expressly excludes the $75 fee for juvenile-diversion expunction.",
        consequence: "Each required submission item is disclosed, and no absent certification, completion proof, or fingerprint card is represented as present."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1",
    familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review, source-freshness review, and counsel review",
    buildStatus: "state_built",
    status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false,
    live: false,
    commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "Confirm the juvenile-diversion eligibility and stop copy against section 943.0582 before promotion.",
      "Confirm current FDLE submission mechanics before promotion; the held checklist excludes the processing fee for this route."
    ],
    mattersForTheReviewersAttention: [
      "The PDF overlay has not been raster-reviewed.",
      "The exact assigned source byte is bound; source-freshness review remains pending.",
      "The builder has not independently verified its own packet."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: "COMPLETED",
    counters: counted.counters,
    directory: OUT,
    implementationStrategy: "official_pdf_fill",
    components: COMPONENTS,
    writes: fieldMaps[0].canonicalWrites.length,
    requiredBeforeFiling: rbf.length,
    artifactHashes: artifacts.map((artifact) => ({
      fixture: artifact.fixture,
      packetSha256: artifact.sha256,
      byteLength: artifact.byteLength,
      pages: artifact.pageCount
    })),
    rasterState: "BUILT_RASTER_PENDING",
    nineCountersZero: PASS_COUNTERS.every((counter) => counted.counters[counter] === 0),
    packetsSelfVerified: 0,
    commercialRoutesOpened: 0,
    productionTouched: false
  };
}

export {
  FIXTURES,
  WRITE_LAYOUT,
  checkStoredFixtures,
  measureOverlay,
  overlayOfficialPdf,
  renderAndMeasure,
  run
};

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  run()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error); process.exit(1); });
}
