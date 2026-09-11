#!/usr/bin/env node
/**
 * PF20 deterministic overlay builder for FDLE40-028, Florida's five-page
 * early-juvenile-expunction application packet.
 *
 * The source is read from the existing shared acquisition staging location,
 * asserted by byte length and SHA-256 before any output is written, and never
 * copied into the repository as a standalone source asset.
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

const FAMILY_ID = "fl-early-juvenile-set";
const ROUTE_KEY = "obligation:track-pathway:FL:fl-early-juvenile:early-juvenile-expunction-943-0515";
const OUT = "data/rcap-all50/overlays/census-v1/fl/fl-early-juvenile-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-fl-early-juvenile-set.mjs";
const SOURCE_ID = "FDLE-EARLY-JUVENILE-EXPUNCTION-APPLICATION";
const COMPONENTS = [SOURCE_ID];
const EXPECTED_SOURCE_SHA256 = "d9417ea382c9c1ea170153b5aa25e63230799de836b8aefca0ee80a47e23f6eb";
const EXPECTED_SOURCE_LENGTH = 22449;
const EXPECTED_SOURCE_PAGES = 5;
const DEFAULT_SOURCE = "/workspaces/.legalease-source-staging/CODEX-CS2-SRC2/acquired/FDLE-early-juvenile-expunction-blank.pdf";
const SIGNATURE = "signature_or_date_participant_completion";
const AGENCY_OWNED = "court_prosecutor_clerk_or_agency_owned";

const FIXTURES = Object.freeze({
  canonical: {
    "participant.full_name": "Jordan Avery Reyes",
    "participant.last_name": "Reyes",
    "participant.first_name": "Jordan",
    "participant.middle_name": "Avery",
    "participant.dob": "10/12/2007",
    "participant.race": "W",
    "participant.sex": "X",
    "participant.phone": "850-555-0142",
    "participant.street": "42 Larkspur Street",
    "participant.city": "Tallahassee",
    "participant.state": "FL",
    "participant.zip": "32301",
    "participant.email": "jordan.reyes@example.org",
    "matter.arresting_agency": "Tallahassee Police Department",
    "matter.arrest_date": "03/15/2024",
    "matter.charge": "Trespass in a structure or conveyance, Fla. Stat. 810.08"
  },
  boundary: {
    /* FIX171, CHATB-FL-03. Was "Maria-Alejandra O'Shaughnessy-Whitfield": the
     * whole name dropped the middle name the same fixture holds, so page 2 (the
     * whole name) and pages 1 and 3 (the parts) named two different applicants.
     * Nothing is invented -- Isabel is this fixture's own participant.middle_name.
     * Measured with the builder's own fitter before the change: 182.59 pt at
     * 8.5 pt Helvetica against the 257 pt page-2 rectangle, so it fits without
     * shrinking. assertFixtureNamesAreConsistent refuses if they part again. */
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
    "matter.charge": "Criminal mischief, Fla. Stat. 806.13"
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
  { id: "page1_arresting_agency", factId: "matter.arresting_agency", page: 1, x: 136, y: 467, width: 427,
    region: [130.812, 563.107, 464.674, 477.863], anchor: { text: "Arresting Agency:", x: 51.892, y: 468.619, ruleY: 464.674 } },
  { id: "page1_arrest_date_1", factId: "matter.arrest_date", page: 1, x: 63, y: 427, width: 64, preferred: 7.5,
    region: [61.872, 129.562, 424.524, 442.463], anchor: { text: "Date(s) of Arrest", x: 64.381, y: 448.93, ruleY: 424.524 } },
  { id: "page1_charge_1", factId: "matter.charge", page: 1, x: 136, y: 427, width: 426, preferred: 7.5,
    region: [134.562, 563.107, 424.524, 442.463], anchor: { text: "Charge(s) Description", x: 307.05, y: 448.93, ruleY: 424.524 } },
  { id: "page2_name", factId: "participant.full_name", printedFormat: "last_comma_first_middle", page: 2, x: 45, y: 670, width: 257,
    region: [40.975, 306, 666.15, 693.4], anchor: { text: "Name (Last, First Middle)", x: 43.825, y: 685.276, ruleY: 666.15 } },
  { id: "page2_dob", factId: "participant.dob", page: 2, x: 309, y: 670, width: 125,
    region: [306, 438.3, 666.15, 693.4], anchor: { text: "DOB (MM/DD/YYYY)", x: 308.425, y: 685.276, ruleY: 666.15 } },
  { id: "page2_phone", factId: "participant.phone", page: 2, x: 441, y: 670, width: 126,
    region: [438.3, 571.025, 666.15, 693.4], anchor: { text: "Phone", x: 440.725, y: 685.276, ruleY: 666.15 } },
  { id: "page3_last_name", factId: "participant.last_name", page: 3, x: 75, y: 704, width: 139,
    region: [71.96, 214.86, 687.425, 711], anchor: { text: "Name:", x: 41.4, y: 701.845, ruleY: 687.425 } },
  { id: "page3_first_name", factId: "participant.first_name", page: 3, x: 217, y: 704, width: 150,
    region: [214.86, 387.558, 687.425, 711], anchor: { text: "First", x: 221.328, y: 689.845, ruleY: 687.425 } },
  { id: "page3_middle_name", factId: "participant.middle_name", page: 3, x: 375, y: 704, width: 187,
    region: [367, 561.342, 687.425, 711], anchor: { text: "Middle", x: 390.672, y: 689.845, ruleY: 687.425 } },
  { id: "page3_race", factId: "participant.race", page: 3, x: 79, y: 632, width: 60,
    region: [75.84, 142.56, 615.425, 641.845], anchor: { text: "RACE:", x: 41.4, y: 617.845, ruleY: 615.425 } },
  { id: "page3_sex", factId: "participant.sex", page: 3, x: 176, y: 632, width: 45,
    region: [173.36, 198.38, 615.425, 641.845], anchor: { text: "SEX:", x: 147.24, y: 617.845, ruleY: 615.425 } },
  { id: "page3_dob", factId: "participant.dob", page: 3, x: 231, y: 632, width: 70, preferred: 7.5,
    region: [228.49, 281.31, 615.425, 641.845], anchor: { text: "DOB:", x: 200.16, y: 617.845, ruleY: 615.425 } }
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
  const sourcePath = process.env.PF20_FL_EARLY_JUVENILE_SOURCE || DEFAULT_SOURCE;
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
    optionalRow("page1_alias_last", "Alias last name (optional participant-authored content)", 1, "the fixture carries no alias"),
    optionalRow("page1_alias_first", "Alias first name (optional participant-authored content)", 1, "the fixture carries no alias"),
    optionalRow("page1_alias_middle", "Alias middle name (optional participant-authored content)", 1, "the fixture carries no alias"),
    optionalRow("page1_ssn", "Social Security number (optional)", 1, "the official application marks it optional"),
    rbfRow("page1_driver_license", "Florida driver's license number", 1,
      "the applicant's Florida driver-license number, if issued", "the fixture does not hold this sensitive identifier"),
    protectedRow("page1_applicant_signature", "Applicant signature", 1, SIGNATURE,
      "the applicant signs in the presence of a notary public or deputy clerk"),
    protectedRow("page1_signature_date", "Date beside applicant signature", 1, SIGNATURE,
      "the applicant supplies the true date when signing"),
    protectedRow("page1_notary_state_county", "Notary state and county", 1, AGENCY_OWNED,
      "the notary or deputy clerk completes the acknowledgment"),
    protectedRow("page1_notary_date", "Notary acknowledgment date", 1, AGENCY_OWNED,
      "the notary or deputy clerk completes the acknowledgment"),
    protectedRow("page1_notary_signature", "Notary signature", 1, AGENCY_OWNED,
      "the notary or deputy clerk signs"),
    protectedRow("page1_notary_commission", "Notary commissioned name or stamp", 1, AGENCY_OWNED,
      "the notary or deputy clerk completes it"),
    protectedRow("page1_notary_identification", "Notary identification determination", 1, AGENCY_OWNED,
      "the notary or deputy clerk completes it")
  ];

  for (let row = 2; row <= 6; row += 1) {
    refusals.push(optionalRow(`page1_arrest_date_${row}`, `Charge row ${row} arrest date (optional additional charge)`, 1,
      "the fixture contains no additional arrest in this row"));
    refusals.push(optionalRow(`page1_charge_${row}`, `Charge row ${row} charge description (optional additional charge)`, 1,
      "the fixture contains no additional charge in this row"));
  }

  for (const [id, label] of [
    ["page2_state_attorney", "State Attorney or Statewide Prosecutor"],
    ["page2_reviewing_officer", "Reviewing officer"],
    ["page2_county", "County"],
    ["page2_circuit", "Circuit"],
    ["page2_approved", "[ ] Approved for expunction per F.S. 943.0515(1)(b)2"],
    ["page2_not_approved", "[ ] Not approved for expunction per F.S. 943.0515(1)(b)2"],
    ["page2_signature", "Signature of prosecuting authority"],
    ["page2_signature_date", "Date beside prosecuting-authority signature"],
    ["page2_title", "Title of prosecuting authority"]
  ]) {
    const row = protectedRow(id, label, 2, AGENCY_OWNED,
      "the State Attorney or Statewide Prosecutor completes the certified statement");
    if (label.startsWith("[ ]")) Object.assign(row, { kind: "selection_control", isSelectionControl: true });
    refusals.push(row);
  }
  for (let row = 1; row <= 6; row += 1) {
    for (const [suffix, label] of [
      ["charge", "charge description"],
      ["statute", "statute violation"],
      ["case", "case number"],
      ["action", "action"]
    ]) {
      refusals.push(protectedRow(`page2_${suffix}_${row}`, `State Attorney row ${row} ${label}`, 2, AGENCY_OWNED,
        "the State Attorney or Statewide Prosecutor completes the certified statement"));
    }
  }

  refusals.push(
    optionalRow("page3_alias_last", "Fingerprint card alias last name (optional participant-authored content)", 3, "the fixture carries no alias"),
    optionalRow("page3_alias_first", "Fingerprint card alias first name (optional participant-authored content)", 3, "the fixture carries no alias"),
    optionalRow("page3_alias_middle", "Fingerprint card alias middle name (optional participant-authored content)", 3, "the fixture carries no alias"),
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
      const rule = page.paths.find((item) => Math.abs(item.height) <= 0.5
        && close(item.y, placement.anchor.ruleY)
        && item.x < placement.region[1] && item.x + item.width > placement.region[0]);
      assert.ok(rule, `${placement.id}: source blank rule y=${placement.anchor.ruleY} moved or disappeared`);
    }
  }
}

async function overlayOfficialPdf(bytes, facts, layout = WRITE_LAYOUT) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  stampDeterministic(doc);
  doc.setTitle("FDLE40-028 Early Juvenile Expunction Application - PF20 fixture");
  doc.setCreator("RCAP PF20 artifact-only builder");
  doc.setProducer("RCAP PF20 artifact-only builder");
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
    "# Before you submit the Florida early-juvenile-expunction application",
    "",
    "This review artifact contains the complete five-page FDLE40-028 application packet for the early-juvenile route under section 943.0515, Florida Statutes. The first two pages are the application and prosecutor certified statement; page 3 is the fingerprint card; pages 4 and 5 are the official information and checklist.",
    "",
    "The fixture is routed only for an applicant age 18 or older but under 21 whose identified conduct occurred before age 18 and who must be able to make the five-year certification printed above the applicant signature. The age rule is a screening and warning rule, not a field this builder guesses. Stop if the age deadline has passed, the State Attorney will not approve, any record fact is disputed, or any immigration matter is pending or possible.",
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
    "| Completed Written Certified Statement Page | Obtain the completed statement from the appropriate State Attorney or Statewide Prosecutor; submit application pages 1 and 2 to that office as the official packet directs. If the arrests or charges in this request were prosecuted in more than one judicial circuit, obtain the approval of the State Attorney (or the Statewide Prosecutor) of EVERY affected circuit. Stop and get help if any required approval is missing or refused: this packet cannot proceed without all of them, and nobody here may sign or decide for a prosecutor. |",
    "| Certified disposition for every listed case or charge | Obtain an original certified disposition from the clerk in the county where each case or charge originated. Include probation termination documentation or diversion completion proof when applicable. |",
    "| Completed fingerprint form or card | Have an authorized law-enforcement or criminal-justice official take the fingerprints and complete the official signature and ORI or agency-stamp fields. |",
    "| Processing fee | Include the nonrefundable $75 payment in an accepted form exactly as page 5 directs, unless the executive director of FDLE waives it. This packet is early juvenile expunction, not the juvenile-diversion fee exception, and that exception is not the waiver. |",
    "| Original supporting documents | The official checklist says submitted documentation must be original; keep copies for your own records before submission. |",
    "| Attorney letterhead, if represented | Include a letter of representation on attorney letterhead when an attorney represents you. |",
    "",
    "## The $75 fee, and the waiver the statute provides for",
    "",
    "The fee for this application is $75, and it is nonrefundable. It is paid unless the",
    "executive director of the Florida Department of Law Enforcement waives it: section",
    "943.0515, Florida Statutes, provides for that waiver and gives the decision to the",
    "executive director. Nobody here can grant it, predict it, or decide that you qualify.",
    "",
    "If you want to ask for it, ask FDLE's Seal & Expunge Section for the current",
    "instructions for requesting a fee waiver on an early juvenile expunction, at the same",
    "address the packet is mailed to. The request steps are not printed on this packet and",
    "are not stated here, because this packet's own held source does not carry them and",
    "nothing has been substituted for them.",
    "",
    "Until the executive director actually grants a waiver, the $75 is still owed and the",
    "packet still goes in with the payment. Do not treat this as a court fee-waiver motion,",
    "an indigency finding, or the juvenile-diversion fee exception; none of those is this.",
    "",
    "## Every circuit the request touches must approve",
    "",
    "The State Attorney or Statewide Prosecutor completes the written certified statement",
    "on page 2. If the arrests or charges you are asking to expunge were prosecuted in more",
    "than one judicial circuit, section 943.0515, Florida Statutes, requires the approval of",
    "the prosecutor of EVERY affected circuit, not just one of them. Getting each approval is",
    "not routine paperwork and it is not service of process: it is a decision each office",
    "makes for itself, and it may be refused.",
    "",
    "Stop and get help before sending anything if any required approval is missing or",
    "refused. Every prosecutor field, decision and signature stays blank in this packet.",
    "",
    "## Protected fields left blank",
    "",
    "The applicant signs and dates page 1 only in the presence of a notary public or deputy clerk. That official completes the acknowledgment. The State Attorney or Statewide Prosecutor completes every field below the applicant identity row on page 2, including the approval decision. The fingerprint official completes the official signature, ORI or stamp, and impressions on page 3. The applicant signs and dates the fingerprint card while being fingerprinted.",
    "",
    "Review every prefilled fact against the source records before signing. Add every arrest and charge that belongs in the request; do not leave a partly completed additional row.",
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
    "# Submission instructions - FDLE early juvenile expunction",
    "",
    "1. Review and complete page 1. List every arrest and charge included in the request.",
    "2. Send pages 1 and 2 to the appropriate State Attorney or Statewide Prosecutor and obtain the completed written certified statement. If the included arrests or charges span more than one judicial circuit, obtain that approval from the prosecutor of every affected circuit; section 943.0515, Florida Statutes, requires all of them. Do not send the packet if any one of them is missing or refused.",
    "3. Obtain an original certified disposition for every listed case or charge, plus probation-termination or diversion-completion proof when applicable.",
    "4. Have an authorized law-enforcement or criminal-justice official take the fingerprints and complete the official fields on page 3.",
    "5. Sign page 1 before a notary public or deputy clerk, and sign/date the fingerprint card at fingerprinting. Do not prefill official-owned fields.",
    "6. Include the $75 nonrefundable processing fee in an accepted payment form and all original supporting documents specified by the official checklist. Section 943.0515, Florida Statutes, lets the executive director of FDLE waive that fee; ask FDLE's Seal & Expunge Section for the current waiver-request instructions if you want to seek it. The request steps are not stated here because this packet's held source does not carry them. Absent an actual waiver, the $75 is still owed and goes in with the packet.",
    "7. Mail the complete packet to Florida Department of Law Enforcement, ATTN: Seal & Expunge Section, P.O. Box 1489, Tallahassee, FL 32302-1489, as printed on page 4. Confirm current submission instructions before mailing.",
    "",
    "This is an FDLE agency submission, not a court filing. Keep copies of the complete packet and delivery proof.",
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

/*
 * FIX171, KNOWN_PREFILLS. THE TWO NAMES A FIXTURE MAY NOT HAVE.
 *
 * The Florida independent review (CHATB-FL-03) found the boundary packet
 * printing "Maria-Alejandra O'Shaughnessy-Whitfield" on page 2 while pages 1
 * and 3 carry the held middle name Isabel, and noted that comparing the write
 * to drawnText cannot catch it: the report faithfully reproduces the incomplete
 * expectation, because the expectation itself is short. The cause is here, in
 * FIXTURES: `participant.full_name` was written out by hand beside the split
 * parts and does not contain `participant.middle_name`. Page 2 writes the full
 * name and pages 1 and 3 write the parts, so one packet states two different
 * identities for the same applicant.
 *
 * Nothing is synthesized to paper over that. The check refuses a fixture whose
 * whole name does not contain each of its own parts, so the two facts cannot
 * disagree again; correcting the DRAWN page-2 value in the printed
 * "Last, First Middle" order needs a rebuild, and this family has no source
 * binary in custody to rebuild from.
 */
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

/*
 * FIX171, FEE_AND_WAIVER and SERVICE. TWO THINGS THE GUIDE MAY NOT LEAVE OUT.
 *
 * CHATB-FL-04: both instruction files presented the $75 as unconditional and
 * explained only that the juvenile-diversion exception is not this route, while
 * section 943.0515 provides for a waiver by FDLE's executive director. A fee
 * stated as unconditional is a participant paying money the statute may not
 * require of them.
 *
 * CHATB-FL-07: both files said "the appropriate State Attorney or Statewide
 * Prosecutor", singular, while section 943.0515 requires the approval of every
 * affected circuit. A participant whose charges span circuits would have sent a
 * packet that cannot be granted.
 *
 * The statute's own words are NOT quoted here. Egress to flsenate.gov is
 * blocked in this container, so this lane did not read the section text; what is
 * carried is the finding of the independent review that did read it, at
 * data/rcap-grade-a/chat-parallel-2026-09-07/review/fl-complete-independent-review.json.
 * The waiver REQUEST MECHANICS are stated nowhere, because no held source in
 * this repository carries them, and the guide says so rather than inventing a
 * procedure.
 */
function assertFeeWaiverAndEveryCircuitAreDisclosed(participantMd, filingMd) {
  const required = [
    ["the fee waiver and who decides it", /waive|waiver/i, /executive director/i],
    ["the every-affected-circuit approval", /every affected circuit|EVERY affected circuit|every affected circuit/i, null]
  ];
  for (const [what, first, second] of required) {
    for (const [label, text] of [["participant-instructions.md", participantMd], ["filing-instructions.md", filingMd]]) {
      assert.ok(first.test(text) && (!second || second.test(text)),
        `${FAMILY_ID}: ${label} does not disclose ${what}. `
        + "CHATB-FL-04 and CHATB-FL-07 are open findings; a guide that drops either one is the defect returning.");
    }
  }
  assert.ok(/\$75/.test(participantMd) && /\$75/.test(filingMd),
    `${FAMILY_ID}: the guide must carry the record's own fee amount, $75, on both files.`);
}

async function run(argv = process.argv.slice(2)) {
  process.chdir(ROOT);
  /* FIX171. Every gate that needs no source binary runs BEFORE the source gate,
   * so a container that does not hold the bytes still exercises them. */
  const fieldMaps = maps();
  assertFixtureNamesAreConsistent();
  const rbf = requiredBeforeFiling(fieldMaps);
  const instructions = participantInstructions(rbf);
  const filing = filingInstructions();
  assertFeeWaiverAndEveryCircuitAreDisclosed(instructions, filing);
  const { sourcePath, bytes } = sourceBytes();
  if (argv.includes("--check")) {
    const checked = [];
    for (const fixture of ["canonical", "boundary"]) {
      const result = await renderAndMeasure(bytes, FIXTURES[fixture]);
      checked.push({
        fixture,
        outputSha256: sha256(result.bytes),
        pageCount: (await PDFDocument.load(result.bytes)).getPageCount(),
        sourceRegionsMeasured: result.measured.sourceRegionsMeasured,
        addedGlyphsReadFromOutputBytes: result.measured.addedGlyphsReadFromOutputBytes,
        widgetAppearancesReadFromSourceBytes: result.measured.widgetAppearancesReadFromSourceBytes,
        flattenedWidgetAppearancesReadFromOutputBytes:
          result.measured.flattenedWidgetAppearancesReadFromOutputBytes,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes:
          result.measured.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes
      });
    }
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
    "data/rcap-grade-a/packet-factory-24h/disc03/CODEX_CS2_SRC2_ACQUISITION.json",
    "data/record-clearing/legal-design-intake/FL.memo.json",
    "src/lib/rcap-engine/compiled/profiles/FL-florida.json",
    "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json"
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
    sourceBinaryCommitted: false,
    mountedReadOnlySource: {
      documentId: SOURCE_ID,
      sourceId: `official-form:${SOURCE_ID}`,
      custodyPath: sourcePath,
      sha256: EXPECTED_SOURCE_SHA256,
      byteLength: EXPECTED_SOURCE_LENGTH,
      pageCount: EXPECTED_SOURCE_PAGES,
      printedFormNumber: "FDLE40-028",
      revision: "Revised October 2019"
    },
    documents: [{
      documentId: SOURCE_ID,
      formNumber: "FDLE40-028",
      kind: "held_official_pdf",
      role: "primary_filing",
      sha256: EXPECTED_SOURCE_SHA256,
      byteLength: EXPECTED_SOURCE_LENGTH,
      pageCount: EXPECTED_SOURCE_PAGES
    }],
    authorityRecords,
    formIdentityNote: "The held official source is the FDLE renderer output titled Application for a Early Juvenile Expunction, printed form FDLE40-028, Revised October 2019.",
    commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "participant eligibility",
      "source freshness beyond the exact PF20 binding and committed acquisition return",
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
    legalName: "Florida Early Juvenile Expunction under Fla. Stat. Sec. 943.0515",
    statute: "Fla. Stat. Sec. 943.0515; Fla. Admin. Code R. 11C-7.010",
    officialForm: "FDLE40-028",
    componentSet: COMPONENTS,
    instrumentKinds: ["primary_filing"],
    dispositionVocabulary: [SIGNATURE, AGENCY_OWNED],
    routeSelectionsMade: [{
      routeKey: ROUTE_KEY,
      selection: "FDLE Early Juvenile Expunction under section 943.0515",
      sourceSupport: "the exact FDLE40-028 source and committed fl-early-juvenile legal-design records"
    }],
    routeSelectionNote: "This family is fixed to the early-juvenile-expunction branch; the packet presents no other Florida relief election.",
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    requiredSupportingItems: [
      "completed State Attorney or Statewide Prosecutor written certified statement",
      "original certified disposition for every listed case or charge",
      "probation termination or diversion completion proof when applicable",
      "completed fingerprint card",
      "$75 processing fee in an accepted payment form",
      "original supporting documents",
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
      "certified dispositions and applicable completion records",
      "completed fingerprint card",
      "$75 processing fee",
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
      printedFormNumber: "FDLE40-028",
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
        finding: "The exact held source is a five-page flat FDLE PDF, printed FDLE40-028 and Revised October 2019.",
        consequence: "The build asserts the assigned SHA-256 and byte length, overlays measured participant fields, and preserves all five pages."
      },
      {
        finding: "The prosecutor statement, notary acknowledgment, fingerprint-official fields, fingerprint impressions, and participant signature/date fields have separate completion owners.",
        consequence: "Every one remains blank and the participant instructions name who completes it."
      },
      {
        finding: "The official checklist requires certified dispositions, fingerprints, original documents, and a $75 processing fee.",
        consequence: "Each is disclosed as required before submission; no absent attachment is represented as present."
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
      "Confirm the early-juvenile screening and stop copy against section 943.0515 before promotion.",
      "Confirm the current FDLE submission mechanics and fee before promotion."
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

export { FIXTURES, WRITE_LAYOUT, measureOverlay, overlayOfficialPdf, renderAndMeasure, run };

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  run()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error); process.exit(1); });
}
