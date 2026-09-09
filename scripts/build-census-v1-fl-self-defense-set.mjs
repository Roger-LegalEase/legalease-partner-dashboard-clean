#!/usr/bin/env node
/**
 * Route-obligation census v1 - packet family `fl-self-defense-set`.
 *
 *   MASTER_LIBRARY_SOURCE_DIR=... node scripts/build-census-v1-fl-self-defense-set.mjs
 *   MASTER_LIBRARY_SOURCE_DIR=... node scripts/build-census-v1-fl-self-defense-set.mjs --check
 *   MASTER_LIBRARY_SOURCE_DIR=... node scripts/build-census-v1-fl-self-defense-set.mjs --negative-control
 *
 * Florida lawful self-defense expunction, s. 943.0578, Fla. Stat., route
 * `obligation:track-pathway:FL:fl-self-defense:lawful-self-defense-expunction-943-0578`.
 *
 * THIS FORM HAS NO FIELDS. IT IS A FLAT PDF.
 *
 * FDLE40-026 Rev. 10/2019 carries five pages and zero AcroForm fields. There is
 * no widget to set, no /MaxLen to respect and no appearance to flatten: every
 * value this packet prints is drawn onto the page at a measured position.
 *
 * That makes geometry the whole safety question, so no coordinate in this file
 * is trusted on its own. Every cell declares where it believes its blank is and
 * what in the SOURCE proves it: either a horizontal rule the form draws at that
 * y spanning that x-range, or an empty text run the form itself places at that
 * exact baseline -- FDLE authored one in every cell of its tables, which is the
 * best anchor a flat form ever offers. `assertAnchorsBind` re-measures all of
 * them from the content stream on every build and stops the build rather than
 * drawing a value at a coordinate the current binary does not support. The two
 * eight-row tables are not hand-listed at all: their rows are generated from
 * the measured rule set, and a count that is not eight stops the build.
 *
 * WHAT THIS PACKET DOES NOT HOLD, AND WILL NOT INVENT
 *
 * FL.memo.json names three participant inputs for this track -- caseDetails,
 * selfDefenceFacts and prosecutorContact. It does not establish that the
 * platform holds a race, a sex, a Florida driver licence number or a place of
 * birth, and FDLE's own checklist requires the first two on the application
 * page. So those are left blank, declared required before filing, and named to
 * the participant. Inventing a participant's race to zero a counter is the
 * defect the counter exists to catch.
 *
 * The Social Security number is left blank on both pages because the form marks
 * it optional and the checklist says so: "This information is voluntary".
 *
 * THE PROSECUTOR CERTIFICATION IS THE CASE, AND THIS PACKET DOES NOT TOUCH IT
 *
 * Page 2 prints "*The section below must be completed by the state
 * attorney/statewide prosecutor.*" Everything under that line -- the reviewing
 * officer, the county, the circuit, all eight rows of the certification table,
 * the certifying signature, the date and the title -- is refused as
 * prosecutor-owned. FL.memo.json records why in its own words: the
 * certification "is obtained by persuasion, not by form", and a prosecutor who
 * declines is a stop condition rather than a blank to fill.
 *
 * THERE IS NO ELECTION ON THIS PAPER, AND THE PACKET SAYS WHICH ROUTE IT IS
 *
 * FDLE publishes a dedicated application per statute and this is the
 * self-defense one: its printed title reads "APPLICATION FOR A CERTIFICATE OF
 * ELIGIBILITY FOR LAWFUL SELF-DEFENSE EXPUNCTION (s. 943.0578, F.S.)". The
 * route is stated by the form's identity rather than by a box, which is
 * asserted against the delivered bytes rather than assumed.
 *
 * NINE COUNTERS ARE MEASURED FROM THE DELIVERED BYTES
 *
 * proveDeliveredInk reopens each finished packet, walks its content streams and
 * asks two questions of every measured cell: is there ink inside it that the
 * blank form does not already print, and does a written value read back
 * complete. Nothing is copied from this build's own report of what it drew.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { extractPageGeometry } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { rulesOfPage } from "./rcap-official-forms/rcap-pdf-rule-lines.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");

const FAMILY_ID = "fl-self-defense-set";
const TRACK_ID = "fl-self-defense";
const PACKET_SET_ID = "fl-self-defense-set";
const DOCUMENT_ID = "FDLE-SELF-DEFENSE-EXPUNCTION-APPLICATION";
const COMPONENT_ID = "fl-self-defense-primary-filing-1";
const OUT_REL = "data/rcap-all50/overlays/census-v1/fl/fl-self-defense-set--official-pdf-fill";
const INDEX_PATH = "data/rcap-all50/local-source-corpus-index.json";
const MEMO_PATH = "data/record-clearing/legal-design-intake/FL.memo.json";
const REGISTRY_PATH = "data/record-clearing/legal-design-track-registry.json";
const WORKLIST_PATH = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const FIXED_DATE = new Date("2026-09-09T00:00:00.000Z");

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const SOURCE = {
  documentId: DOCUMENT_ID,
  sourceId: "official-form:FDLE-SELF-DEFENSE-EXPUNCTION-APPLICATION",
  componentId: COMPONENT_ID,
  path: "STATES/FL/05_SOURCE_GATED/FL__SOURCE-GATED__FDLE40-026__application-for-a-certificate-of-eligibility-for-lawful-self-defense-expunction__REV-2019-10__EN.pdf",
  sha256: "d7bdbbb546cf6280fd07710e3132885db771400ba778d111835b5de281c58602",
  componentKinds: ["primary_filing"],
  printedTitle: "FDLE40-026, Application for a Certificate of Eligibility for Lawful Self-Defense Expunction, Revised October 2019",
  pageCount: 5
};

/*
 * The printed title this packet is built against, asserted verbatim on the
 * delivered pages. FDLE publishes one application per statute, so on this form
 * the route is stated by the paper's own identity rather than by any election a
 * participant makes, and that claim is checked rather than assumed.
 */
const ROUTE_STATEMENT_ON_THE_PAPER = "LAWFUL SELF-DEFENSE EXPUNCTION (s. 943.0578, F.S.)";

const ROLE = {
  WRITE: "write",
  REQUIRED: "required_before_filing",
  OPTIONAL: "optional_participant_content",
  PROTECTED_PARTICIPANT: "participant_signature_or_date",
  PROSECUTOR: "prosecutor_owned",
  NOTARY: "notary_or_officer_owned",
  FINGERPRINT_OFFICIAL: "fingerprint_official_owned",
  AGENCY_APPLIED: "applied_by_the_fingerprinting_agency",
  UNUSED_TABLE_ROW: "table_row_this_record_does_not_reach"
};

/*
 * Where every blank on this form is, and what in the source proves it.
 *
 * `rule` names a horizontal rule the form draws: {y, x1, x2}. `run` names an
 * empty text run the form itself places at the write baseline: {x, y}. Every
 * cell carries at least one, and assertAnchorsBind re-measures all of them from
 * the bound bytes on every build.
 */
const CELLS = [
  // ---- page 1, applicant identity --------------------------------------------
  { id: "p1.last_name", page: 1, role: ROLE.WRITE, fact: "participant.last_name",
    label: "Last Name (FDLE application page 1)", x: 42.8, right: 253.28, baseline: 694.1, run: { x: 42.8, y: 694.1 } },
  { id: "p1.first_name", page: 1, role: ROLE.WRITE, fact: "participant.first_name",
    label: "First Name (FDLE application page 1)", x: 253.7, right: 411.44, baseline: 694.1, run: { x: 253.7, y: 694.1 } },
  { id: "p1.middle_name", page: 1, role: ROLE.WRITE, fact: "participant.middle_name",
    label: "Middle Name (FDLE application page 1)", x: 411.9, right: 569.61, baseline: 694.1, run: { x: 411.9, y: 694.1 } },

  // ---- page 1, the four alias lines ------------------------------------------
  ...[668.0, 647.3, 624.8, 602.4].flatMap((baseline, index) => [
    { id: `p1.alias_last_${index + 1}`, page: 1, role: ROLE.OPTIONAL,
      label: `Alias Last Name(s), printed line ${index + 1} (FDLE application page 1)`,
      x: 42.8, right: 253.28, baseline, run: { x: 42.8, y: baseline } },
    { id: `p1.alias_first_${index + 1}`, page: 1, role: ROLE.OPTIONAL,
      label: `Alias First Name(s), printed line ${index + 1} (FDLE application page 1)`,
      x: 253.7, right: 411.44, baseline, run: { x: 253.7, y: baseline } },
    { id: `p1.alias_middle_${index + 1}`, page: 1, role: ROLE.OPTIONAL,
      label: `Alias Middle Name(s), printed line ${index + 1} (FDLE application page 1)`,
      x: 411.9, right: 569.61, baseline, run: { x: 411.9, y: baseline } }
  ]),

  // ---- page 1, the identity row ----------------------------------------------
  { id: "p1.date_of_birth", page: 1, role: ROLE.WRITE, fact: "participant.date_of_birth",
    label: "Date of Birth (MM/DD/YYYY) (FDLE application page 1)", x: 42.8, right: 153.11, baseline: 574.6, run: { x: 42.8, y: 574.6 } },
  { id: "p1.race", page: 1, role: ROLE.REQUIRED,
    label: "Race (FDLE application page 1)", x: 153.5, right: 279.64, baseline: 574.6, run: { x: 153.5, y: 574.6 } },
  { id: "p1.sex", page: 1, role: ROLE.REQUIRED,
    label: "Sex (FDLE application page 1)", x: 280.1, right: 353.45, baseline: 574.6, run: { x: 280.1, y: 574.6 } },
  /*
   * The form prints "(      )" for the area code, so the telephone number is
   * one held fact printed into the two slots the paper provides: the digits
   * inside the printed parentheses, and the rest after them.
   */
  { id: "p1.phone_area_code", page: 1, role: ROLE.WRITE, fact: "participant.phone",
    label: "Phone, area code inside the printed parentheses (FDLE application page 1)",
    x: 361.8, right: 379.4, baseline: 574.6, run: { x: 358.2, y: 574.6 } },
  { id: "p1.phone_local", page: 1, role: ROLE.WRITE, fact: "participant.phone",
    label: "Phone, the rest of the number after the printed parentheses (FDLE application page 1)",
    x: 389.0, right: 458.89, baseline: 574.6, rule: { y: 569.71, x1: 353.45, x2: 458.89 } },
  { id: "p1.social_security_number", page: 1, role: ROLE.OPTIONAL,
    label: "Social Security No. (optional) (FDLE application page 1)", x: 459.3, right: 570.03, baseline: 574.6, run: { x: 459.3, y: 574.6 } },

  // ---- page 1, the two address rows ------------------------------------------
  { id: "p1.mailing_address", page: 1, role: ROLE.WRITE, fact: "participant.mailing_street",
    label: "Mailing Address (FDLE application page 1)", x: 42.8, right: 385.08, baseline: 548.6, run: { x: 42.8, y: 548.6 } },
  { id: "p1.mailing_city", page: 1, role: ROLE.WRITE, fact: "participant.mailing_city",
    label: "Mailing Address City (FDLE application page 1)", x: 385.5, right: 506.34, baseline: 548.6, run: { x: 385.5, y: 548.6 } },
  { id: "p1.mailing_state", page: 1, role: ROLE.WRITE, fact: "participant.mailing_state",
    label: "Mailing Address State (FDLE application page 1)", x: 506.8, right: 532.7, baseline: 548.6, run: { x: 506.8, y: 548.6 } },
  { id: "p1.mailing_zip", page: 1, role: ROLE.WRITE, fact: "participant.mailing_zip",
    label: "Mailing Address Zip (FDLE application page 1)", x: 533.1, right: 569.61, baseline: 548.6, run: { x: 533.1, y: 548.6 } },
  { id: "p1.permanent_address", page: 1, role: ROLE.WRITE, fact: "participant.permanent_street",
    label: "Permanent Address (FDLE application page 1)", x: 42.8, right: 385.08, baseline: 522.5, run: { x: 42.8, y: 522.5 } },
  { id: "p1.permanent_city", page: 1, role: ROLE.WRITE, fact: "participant.permanent_city",
    label: "Permanent Address City (FDLE application page 1)", x: 385.5, right: 506.34, baseline: 522.5, run: { x: 385.5, y: 522.5 } },
  { id: "p1.permanent_state", page: 1, role: ROLE.WRITE, fact: "participant.permanent_state",
    label: "Permanent Address State (FDLE application page 1)", x: 506.8, right: 532.7, baseline: 522.5, run: { x: 506.8, y: 522.5 } },
  { id: "p1.permanent_zip", page: 1, role: ROLE.WRITE, fact: "participant.permanent_zip",
    label: "Permanent Address Zip (FDLE application page 1)", x: 533.1, right: 569.61, baseline: 522.5, run: { x: 533.1, y: 522.5 } },

  // ---- page 1, licence and email ---------------------------------------------
  { id: "p1.driver_license_number", page: 1, role: ROLE.REQUIRED,
    label: "Florida Driver's License No. (FDLE application page 1)", x: 42.8, right: 226.92, baseline: 496.5, run: { x: 42.8, y: 496.5 } },
  { id: "p1.email", page: 1, role: ROLE.WRITE, fact: "participant.email",
    label: "Email Address (FDLE application page 1)", x: 227.3, right: 570.03, baseline: 496.5, run: { x: 227.3, y: 496.5 } },

  // ---- page 1, the arresting agency ------------------------------------------
  { id: "p1.arresting_agency", page: 1, role: ROLE.WRITE, fact: "matter.arresting_agency",
    label: "Arresting Agency (FDLE application page 1)", x: 140.0, right: 563.11, baseline: 473.6,
    rule: { y: 469.67, x1: 50.89, x2: 563.11 } },

  // ---- page 1, the applicant's own certification -----------------------------
  { id: "p1.applicant_signature", page: 1, role: ROLE.PROTECTED_PARTICIPANT,
    label: "Applicant's Signature (FDLE application page 1)", x: 50.5, right: 264.62, baseline: 234.5,
    rule: { y: 231.92, x1: 48.89, x2: 264.62 } },
  { id: "p1.applicant_signature_date", page: 1, role: ROLE.PROTECTED_PARTICIPANT,
    label: "Date beside the Applicant's Signature (FDLE application page 1)", x: 375.2, right: 553.74, baseline: 234.5,
    rule: { y: 231.92, x1: 373.6, x2: 553.74 } },

  // ---- page 1, the notary block ----------------------------------------------
  { id: "p1.notary_state", page: 1, role: ROLE.NOTARY,
    label: "STATE OF, in the notary acknowledgment (FDLE application page 1)", x: 89.8, right: 257.18, baseline: 182.7,
    rule: { y: 180.12, x1: 88.16, x2: 257.18 } },
  { id: "p1.notary_county", page: 1, role: ROLE.NOTARY,
    label: "COUNTY OF, in the notary acknowledgment (FDLE application page 1)", x: 314.8, right: 479.99, baseline: 182.7,
    rule: { y: 180.12, x1: 313.19, x2: 479.99 } },
  { id: "p1.notary_acknowledgment_date", page: 1, role: ROLE.NOTARY,
    label: "Day and month of the notary acknowledgment (FDLE application page 1)", x: 326.4, right: 447.06, baseline: 163.5,
    rule: { y: 160.91, x1: 324.74, x2: 447.06 } },
  { id: "p1.notary_signature", page: 1, role: ROLE.NOTARY,
    label: "Signature of Notary Public (FDLE application page 1)", x: 48.4, right: 262.54, baseline: 105.9,
    rule: { y: 103.32, x1: 46.82, x2: 262.54 } },
  { id: "p1.notary_printed_name", page: 1, role: ROLE.NOTARY,
    label: "Print/Type/Stamp Commissioned Name of Notary or Deputy Clerk of the Court (FDLE application page 1)",
    x: 277.5, right: 560.56, baseline: 105.9, rule: { y: 103.32, x1: 275.89, x2: 560.56 } },
  { id: "p1.identification_produced", page: 1, role: ROLE.NOTARY,
    label: "Type of Identification Produced (FDLE application page 1)", x: 380.2, right: 560.92, baseline: 77.1,
    rule: { y: 74.52, x1: 378.55, x2: 560.92 } },

  // ---- page 2, the applicant's own identification row ------------------------
  { id: "p2.name", page: 2, role: ROLE.WRITE, fact: "participant.name_last_first_middle",
    label: "Name (Last, First Middle), on the written certified statement page (FDLE application page 2)",
    x: 41.8, right: 306.0, baseline: 671.1, run: { x: 41.8, y: 671.1 } },
  { id: "p2.date_of_birth", page: 2, role: ROLE.WRITE, fact: "participant.date_of_birth",
    label: "DOB (MM/DD/YYYY), on the written certified statement page (FDLE application page 2)",
    x: 306.4, right: 438.3, baseline: 671.1, run: { x: 306.4, y: 671.1 } },
  { id: "p2.phone", page: 2, role: ROLE.WRITE, fact: "participant.phone",
    label: "Phone, on the written certified statement page (FDLE application page 2)",
    x: 438.7, right: 571.02, baseline: 671.1, run: { x: 438.7, y: 671.1 } },

  // ---- page 2, the prosecutor's own section ----------------------------------
  { id: "p2.state_attorney", page: 2, role: ROLE.PROSECUTOR,
    label: "State Attorney/Statewide Prosecutor (FDLE application page 2, certification section)",
    x: 41.8, right: 306.0, baseline: 617.2, run: { x: 41.8, y: 617.2 } },
  { id: "p2.reviewing_officer", page: 2, role: ROLE.PROSECUTOR,
    label: "Reviewing Officer (FDLE application page 2, certification section)",
    x: 306.4, right: 570.6, baseline: 617.2, run: { x: 306.4, y: 617.2 } },
  { id: "p2.county", page: 2, role: ROLE.PROSECUTOR,
    label: "County (FDLE application page 2, certification section)",
    x: 41.8, right: 306.0, baseline: 584.0, run: { x: 41.8, y: 584.0 } },
  { id: "p2.circuit", page: 2, role: ROLE.PROSECUTOR,
    label: "Circuit (FDLE application page 2, certification section)",
    x: 306.4, right: 570.6, baseline: 584.0, run: { x: 306.4, y: 584.0 } },
  { id: "p2.certifying_signature", page: 2, role: ROLE.PROSECUTOR,
    label: "Signature of the certifying prosecuting authority (FDLE application page 2)",
    x: 68.4, right: 287.0, baseline: 184.4, rule: { y: 182.14, x1: 66.82, x2: 287.0 } },
  { id: "p2.certifying_date", page: 2, role: ROLE.PROSECUTOR,
    label: "Date beside the certifying prosecuting authority's signature (FDLE application page 2)",
    x: 303.6, right: 439.62, baseline: 184.4, rule: { y: 182.14, x1: 302.01, x2: 439.62 } },
  { id: "p2.certifying_title", page: 2, role: ROLE.PROSECUTOR,
    label: "Title (Prosecuting Authority) (FDLE application page 2)",
    x: 68.4, right: 284.5, baseline: 141.2, rule: { y: 138.94, x1: 66.82, x2: 284.5 } },

  // ---- page 3, the fingerprint card ------------------------------------------
  { id: "p3.last_name", page: 3, role: ROLE.WRITE, fact: "participant.last_name",
    label: "Name, Last (FDLE fingerprint card, page 3)", x: 66.3, right: 214.86, baseline: 689.8,
    rule: { y: 687.43, x1: 64.74, x2: 214.86 } },
  { id: "p3.first_name", page: 3, role: ROLE.WRITE, fact: "participant.first_name",
    label: "Name, First (FDLE fingerprint card, page 3)", x: 247.3, right: 387.56, baseline: 689.8,
    rule: { y: 687.43, x1: 245.78, x2: 387.56 } },
  { id: "p3.middle_name", page: 3, role: ROLE.WRITE, fact: "participant.middle_name",
    label: "Name, Middle (FDLE fingerprint card, page 3)", x: 426.7, right: 561.34, baseline: 689.8,
    rule: { y: 687.43, x1: 425.12, x2: 561.34 } },
  { id: "p3.alias_last", page: 3, role: ROLE.OPTIONAL,
    label: "Alias/AKA Name(s), Last (FDLE fingerprint card, page 3)", x: 66.3, right: 214.86, baseline: 653.8,
    rule: { y: 651.43, x1: 64.74, x2: 214.86 } },
  { id: "p3.alias_first", page: 3, role: ROLE.OPTIONAL,
    label: "Alias/AKA Name(s), First (FDLE fingerprint card, page 3)", x: 247.3, right: 387.56, baseline: 653.8,
    rule: { y: 651.43, x1: 245.78, x2: 387.56 } },
  { id: "p3.alias_middle", page: 3, role: ROLE.OPTIONAL,
    label: "Alias/AKA Name(s), Middle (FDLE fingerprint card, page 3)", x: 426.7, right: 561.34, baseline: 653.8,
    rule: { y: 651.43, x1: 425.12, x2: 561.34 } },
  { id: "p3.race", page: 3, role: ROLE.REQUIRED,
    label: "RACE (FDLE fingerprint card, page 3)", x: 77.4, right: 142.56, baseline: 617.8,
    rule: { y: 615.43, x1: 75.84, x2: 142.56 } },
  { id: "p3.sex", page: 3, role: ROLE.REQUIRED,
    label: "SEX (FDLE fingerprint card, page 3)", x: 173.4, right: 199.5, baseline: 617.8,
    run: { x: 173.4, y: 617.8 } },
  { id: "p3.date_of_birth", page: 3, role: ROLE.WRITE, fact: "participant.date_of_birth",
    label: "DOB (FDLE fingerprint card, page 3)", x: 230.0, right: 281.31, baseline: 617.8,
    rule: { y: 615.43, x1: 228.49, x2: 281.31 } },
  { id: "p3.social_security_number", page: 3, role: ROLE.OPTIONAL,
    label: "SOC, the voluntary Social Security Number (FDLE fingerprint card, page 3)", x: 318.0, right: 408.24, baseline: 617.8,
    rule: { y: 615.43, x1: 316.5, x2: 408.24 } },
  { id: "p3.place_of_birth", page: 3, role: ROLE.REQUIRED,
    label: "Place of Birth (FDLE fingerprint card, page 3)", x: 442.8, right: 560.82, baseline: 617.8,
    rule: { y: 615.43, x1: 441.28, x2: 560.82 } },
  { id: "p3.official_signature", page: 3, role: ROLE.FINGERPRINT_OFFICIAL,
    label: "Signature of Official Taking Fingerprints (FDLE fingerprint card, page 3)", x: 226.9, right: 406.06, baseline: 569.8,
    rule: { y: 567.43, x1: 225.36, x2: 406.06 } },
  /*
   * The ORI is NOT a protected officer field, and the completeness contract is
   * right to refuse the officer class for it. An ORI is a case fact on the
   * finished card: the agency that takes the prints stamps it, and FDLE rejects
   * a card that arrives without one. The participant cannot write it and must
   * still make sure it is there, which is what required-before-filing means and
   * what a protected classification would have hidden.
   */
  { id: "p3.ori", page: 3, role: ROLE.AGENCY_APPLIED,
    label: "ORI, the fingerprinting agency's identifier or stamp (FDLE fingerprint card, page 3)", x: 452.5, right: 556.67, baseline: 569.8,
    rule: { y: 567.43, x1: 451.03, x2: 556.67 } },
  { id: "p3.person_signature", page: 3, role: ROLE.PROTECTED_PARTICIPANT,
    label: "Signature of Person Fingerprinted (FDLE fingerprint card, page 3)", x: 201.3, right: 405.53, baseline: 521.8,
    rule: { y: 519.43, x1: 199.81, x2: 405.53 } },
  { id: "p3.person_signature_date", page: 3, role: ROLE.PROTECTED_PARTICIPANT,
    label: "Date beside the Signature of Person Fingerprinted (FDLE fingerprint card, page 3)", x: 450.9, right: 555.01, baseline: 521.8,
    rule: { y: 519.43, x1: 449.37, x2: 555.01 } }
];

/*
 * The page-1 arrest table and the page-2 prosecutor certification table are not
 * hand-listed. Their rows are generated from the rules the source actually
 * draws, so a form whose table gains or loses a row stops the build instead of
 * being written into eight positions that are no longer there.
 */
const ARREST_TABLE = {
  page: 1,
  rowCount: 8,
  columns: [
    { key: "date", x1: 61.87, x2: 129.56, label: "Date(s) of Arrest", fact: "matter.arrest_date" },
    { key: "charge", x1: 134.56, x2: 563.11, label: "Charge(s) Description", fact: "matter.charge_description" }
  ]
};

const PROSECUTOR_TABLE = {
  page: 2,
  rowCount: 8,
  columns: [
    { key: "charge", x1: 57.67, x2: 232.03, label: "Charge(s) Description" },
    { key: "statute", x1: 232.03, x2: 306.0, label: "Statute Violation" },
    { key: "case_number", x1: 306.0, x2: 464.5, label: "Case Number" },
    { key: "action", x1: 464.5, x2: 570.17, label: "Action" }
  ]
};

/* Pages that carry no blank at all: FDLE's own instructions and checklist. */
const INSTRUCTION_PAGES = [
  { page: 4, heading: "GENERAL INFORMATION" },
  { page: 5, heading: "Application Checklist & Instructions" }
];

/*
 * The two review fixtures. Neither holds a race, a sex, a Florida driver
 * licence number or a place of birth, because FL.memo.json does not establish
 * that the platform collects any of them; those blanks are declared and
 * disclosed instead. The boundary fixture carries three charges so the
 * eight-row arrest table is exercised past its first row, and separate mailing
 * and permanent addresses so the two address rows cannot be confused.
 */
const FIXTURES = {
  canonical: {
    fixtureClass: "canonical",
    last: "Reyes", first: "Jordan", middle: "Avery",
    dateOfBirth: "06/14/1988",
    phoneAreaCode: "305", phoneLocal: "555-0142", phone: "(305) 555-0142",
    mailingStreet: "412 Magnolia Avenue", mailingCity: "Miami", mailingState: "FL", mailingZip: "33130",
    permanentStreet: "412 Magnolia Avenue", permanentCity: "Miami", permanentState: "FL", permanentZip: "33130",
    email: "jordan.reyes@example.org",
    arrestingAgency: "Miami-Dade Police Department",
    charges: [
      { date: "03/11/2022", description: "Aggravated Assault with a Deadly Weapon, Fla. Stat. 784.021(1)(a)" }
    ]
  },
  boundary: {
    fixtureClass: "boundary",
    last: "Montgomery-Washington", first: "Alexandria", middle: "Catherine",
    dateOfBirth: "12/31/1979",
    phoneAreaCode: "850", phoneLocal: "555-0199", phone: "(850) 555-0199",
    mailingStreet: "1188 Martin Luther King Junior Boulevard Apartment 1407",
    mailingCity: "Tallahassee", mailingState: "FL", mailingZip: "32301-4417",
    permanentStreet: "77 Bayshore Drive", permanentCity: "Panama City", permanentState: "FL", permanentZip: "32401",
    email: "alexandria.montgomery.washington@example.org",
    arrestingAgency: "Leon County Sheriff's Office and Tallahassee Police Department",
    charges: [
      { date: "01/03/2019", description: "Aggravated Battery with a Deadly Weapon, Fla. Stat. 784.045(1)(a)2." },
      { date: "01/03/2019", description: "Improper Exhibition of a Dangerous Weapon or Firearm, Fla. Stat. 790.10" },
      { date: "01/03/2019", description: "Discharging a Firearm in Public or on Residential Property, Fla. Stat. 790.15(1)" }
    ]
  }
};

const factValue = (fixture, fact) => ({
  "participant.last_name": fixture.last,
  "participant.first_name": fixture.first,
  "participant.middle_name": fixture.middle,
  "participant.name_last_first_middle": `${fixture.last}, ${fixture.first} ${fixture.middle}`,
  "participant.date_of_birth": fixture.dateOfBirth,
  "participant.phone": fixture.phone,
  "participant.mailing_street": fixture.mailingStreet,
  "participant.mailing_city": fixture.mailingCity,
  "participant.mailing_state": fixture.mailingState,
  "participant.mailing_zip": fixture.mailingZip,
  "participant.permanent_street": fixture.permanentStreet,
  "participant.permanent_city": fixture.permanentCity,
  "participant.permanent_state": fixture.permanentState,
  "participant.permanent_zip": fixture.permanentZip,
  "participant.email": fixture.email,
  "matter.arresting_agency": fixture.arrestingAgency
})[fact];

// ---- sources -----------------------------------------------------------------------

function resolveSource() {
  const index = readJson(INDEX_PATH);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  const entry = index.entries.find((candidate) => candidate.path === SOURCE.path);
  assert.ok(entry, `missing committed index entry: ${SOURCE.path}`);
  assert.equal(entry.sha256, SOURCE.sha256, `committed index pins a different digest for ${SOURCE.path}`);
  const absolute = resolver.resolve(entry);
  assert.ok(absolute && fs.existsSync(absolute), `source custody is not mounted: ${SOURCE.path}`);
  const bytes = fs.readFileSync(absolute);
  assert.equal(sha256(bytes), SOURCE.sha256, `source hash drift: ${SOURCE.path}`);
  return { ...SOURCE, absolute, bytes, byteLength: bytes.length, custody: entry.custody };
}

// ---- geometry, measured from the source rather than believed -----------------------

/** Every page's printed rules and text, from the bound bytes. */
async function sourceGeometry(source) {
  const document = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = document.getPages();
  assert.equal(pages.length, source.pageCount, `${DOCUMENT_ID}: the bound binary no longer carries ${source.pageCount} pages`);
  assert.equal(document.getForm().getFields().length, 0,
    `${DOCUMENT_ID}: this binary now carries AcroForm fields; this builder draws a measured overlay and must not run past that`);
  return pages.map((page, index) => ({
    page: index + 1,
    rules: rulesOfPage(page),
    ...extractPageGeometry(page)
  }));
}

/** Generate the two tables' cells from the rules the source actually draws. */
function tableCells(geometry, table, { role, labelSuffix, rowWord }) {
  const page = geometry[table.page - 1];
  const spans = table.columns.map((column) => page.rules.horizontal
    .filter((rule) => rule.x <= column.x1 + 1 && rule.endX >= column.x2 - 1
      && rule.width <= (column.x2 - column.x1) + 12)
    .map((rule) => Number(rule.y.toFixed(2))));
  const shared = [...new Set(spans[0])]
    .filter((y) => spans.every((column) => column.some((candidate) => Math.abs(candidate - y) <= 0.6)))
    .sort((a, b) => b - a);
  assert.equal(shared.length, table.rowCount,
    `${DOCUMENT_ID} page ${table.page}: measured ${shared.length} table rows, not ${table.rowCount}; `
    + "the form's table changed and no value may be drawn into a row that is not there");
  return shared.flatMap((ruleY, index) => table.columns.map((column) => ({
    id: `p${table.page}.${column.key}_${rowWord}${index + 1}`,
    page: table.page,
    role,
    fact: column.fact ?? null,
    rowIndex: index + 1,
    columnKey: column.key,
    label: `${column.label}, ${rowWord} ${index + 1}${labelSuffix}`,
    x: column.x1 + 1.6,
    right: column.x2,
    baseline: Number((ruleY + 2.6).toFixed(2)),
    rule: { y: ruleY, x1: column.x1, x2: column.x2 }
  })));
}

/**
 * Every cell's anchor, re-measured from the bound bytes.
 *
 * A coordinate in this file is a claim about the source, and a claim about the
 * source is checked against the source. A cell whose rule is not drawn, or
 * whose empty run is not placed where it says, stops the build: drawing a
 * participant's address at a position the current form does not support puts
 * the value in the wrong box, and nothing downstream would see it.
 */
function assertAnchorsBind(geometry, cells) {
  const evidence = [];
  for (const cell of cells) {
    const page = geometry[cell.page - 1];
    assert.ok(page, `${cell.id}: the source has no page ${cell.page}`);
    let bound = null;
    if (cell.rule) {
      const match = page.rules.horizontal.find((rule) =>
        Math.abs(rule.y - cell.rule.y) <= 0.6 && rule.x <= cell.rule.x1 + 1 && rule.endX >= cell.rule.x2 - 1);
      if (match) bound = { by: "printed_rule", y: match.y, x: match.x, endX: match.endX };
    }
    if (!bound && cell.run) {
      const match = page.text.find((item) =>
        Math.abs(item.x - cell.run.x) <= 1.5 && Math.abs(item.y - cell.run.y) <= 1.5 && item.text.trim() === "");
      if (match) bound = { by: "printed_empty_run", x: Number(match.x.toFixed(2)), y: Number(match.y.toFixed(2)), width: Number((match.width ?? 0).toFixed(2)) };
    }
    assert.ok(bound,
      `${cell.id}: no rule and no empty run in the bound binary supports this cell's position `
      + `(page ${cell.page}, baseline ${cell.baseline}, x ${cell.x}..${cell.right}). `
      + "A value is never drawn at a coordinate the source does not support.");
    assert.ok(cell.right > cell.x + 4, `${cell.id}: the measured cell is narrower than 4pt`);
    evidence.push({ cellId: cell.id, page: cell.page, boundBy: bound.by, evidence: bound });
  }
  return evidence;
}

// ---- drawing -----------------------------------------------------------------------

/**
 * Draws the WHOLE value or refuses it.
 *
 * A flat overlay has no /MaxLen to argue with, only a printed box; a value that
 * does not fit inside it is refused carrying the value and the measurement,
 * never shrunk below the floor and never cut. On this application that matters
 * twice over: FDLE rejects an incomplete application outright, and a shortened
 * charge description is a different charge.
 */
function fitOrRefuse(value, cell, font) {
  const available = cell.right - cell.x - 2;
  let size = 9;
  while (size > 5.5 && font.widthOfTextAtSize(value, size) > available) size -= 0.25;
  if (font.widthOfTextAtSize(value, size) > available) {
    return {
      refused: true,
      heldValue: value,
      measurement: {
        drawableWidthPt: Number(available.toFixed(2)),
        widthNeededAtFloorPt: Number(font.widthOfTextAtSize(value, 5.5).toFixed(2)),
        floorFontSizePt: 5.5
      }
    };
  }
  return { text: value, fontSize: size, widthPt: Number(font.widthOfTextAtSize(value, size).toFixed(2)) };
}

const rectOf = (cell) => ({
  x: cell.x - 1.5,
  y: cell.baseline - 3,
  width: (cell.right - cell.x) + 2,
  height: 13
});

/* Which held value, if any, a cell carries on this fixture. */
function heldValueFor(cell, fixture) {
  if (cell.role === ROLE.WRITE && cell.fact) {
    if (cell.id === "p1.phone_area_code") return fixture.phoneAreaCode;
    if (cell.id === "p1.phone_local") return fixture.phoneLocal;
    return factValue(fixture, cell.fact);
  }
  if (cell.role === ROLE.UNUSED_TABLE_ROW) return null;
  return null;
}

const UNUSED_ROW_CONDITION = (fixture, cell) =>
  `The arrest this application concerns carries ${fixture.charges.length} charge(s), and this packet prints every one `
  + `of them in rows 1 to ${fixture.charges.length}. FDLE prints capacity for ${ARREST_TABLE.rowCount} rows and the `
  + `checklist requires "the charge(s)", not eight of them, so row ${cell.rowIndex} carries no charge on this `
  + "participant's record and is left entirely empty rather than partly filled.";

const OPTIONAL_REASON = {
  "p1.social_security_number":
    "FDLE prints \"(optional)\" beside this box and its own checklist states \"This information is voluntary; however, "
    + "failure to disclose may delay the processing time of your application.\" It is optional participant-authored "
    + "content and the platform does not invent it.",
  "p3.social_security_number":
    "The fingerprint card marks this \"*SOC\" and the page's own footnote states \"This information is voluntary; "
    + "however, failure to disclose may delay the processing time of your application.\" It is optional "
    + "participant-authored content and the platform does not invent it.",
  alias:
    "An alias is a name this participant may or may not have used, and no held record establishes one. It is optional "
    + "participant-authored content and the platform does not invent it. If you have used another name, write it here."
};

const REQUIRED_REASON = {
  "p1.race": "FL.memo.json names three participant inputs for this track and a race is not one of them, so the platform "
    + "holds no value for it. FDLE's checklist requires it: the application page \"must be filled out in full including "
    + "last name, first name, date of birth, race, sex, mailing address, permanent address, arresting agency, date of "
    + "arrest, and charge(s)\". Supply it before you submit.",
  "p1.sex": "FL.memo.json names three participant inputs for this track and a sex is not one of them, so the platform "
    + "holds no value for it. FDLE's checklist requires it on the application page. Supply it before you submit.",
  "p1.driver_license_number": "The platform holds no Florida driver licence number for this participant. Write yours "
    + "here, or leave it blank if you do not hold one.",
  "p3.race": "The platform holds no race for this participant. The fingerprint card asks for it. Supply it before you "
    + "submit.",
  "p3.sex": "The platform holds no sex for this participant. The fingerprint card asks for it. Supply it before you "
    + "submit.",
  "p3.place_of_birth": "The platform holds no place of birth for this participant. The fingerprint card asks for it. "
    + "Supply it before you submit."
};

async function buildPacket(source, fixture, geometry, cells, baselines) {
  const document = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const font = await document.embedFont(StandardFonts.Helvetica);
  const pages = document.getPages();
  const writes = [];
  const refusals = [];
  const boxes = [];

  const charges = fixture.charges;

  for (const cell of cells) {
    const rect = rectOf(cell);
    const base = { fieldId: `${DOCUMENT_ID}:${cell.id}`, fieldName: cell.id, documentId: DOCUMENT_ID, page: cell.page, widgetIndex: 0 };

    // The arrest table: a row this record reaches is filled in every column, and
    // a row it does not reach is left entirely empty.
    if (cell.role === ROLE.WRITE && cell.rowIndex !== undefined) {
      const charge = charges[cell.rowIndex - 1];
      if (!charge) {
        const condition = UNUSED_ROW_CONDITION(fixture, cell);
        refusals.push({
          ...base, effectiveLabel: cell.label, reason: condition,
          completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
          routeConditionThatMakesItInapplicable: condition,
          requiredBeforeFiling: false, factAvailable: false, routeDetermined: false, role: "participant",
          rowIndex: cell.rowIndex, columnKey: cell.columnKey
        });
        boxes.push({ ...base, rect, expectInk: false });
        continue;
      }
      const value = cell.columnKey === "date" ? charge.date : charge.description;
      const outcome = fitOrRefuse(value, cell, font);
      if (outcome.refused) {
        refusals.push({
          ...base,
          effectiveLabel: `${cell.label} - this packet holds the value but the printed box cannot carry it complete`,
          reason: `The held value "${outcome.heldValue}" needs ${outcome.measurement.widthNeededAtFloorPt}pt at the `
            + `${outcome.measurement.floorFontSizePt}pt floor and the printed box draws `
            + `${outcome.measurement.drawableWidthPt}pt. It is left blank rather than cut short: a charge description `
            + "cut short on an application sworn to FDLE is a different charge.",
          completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: true,
          heldValue: outcome.heldValue, measurement: outcome.measurement, routeDetermined: false, role: "participant",
          rowIndex: cell.rowIndex, columnKey: cell.columnKey
        });
        boxes.push({ ...base, rect, expectInk: false });
        continue;
      }
      pages[cell.page - 1].drawText(outcome.text, { x: cell.x, y: cell.baseline, size: outcome.fontSize, font, color: rgb(0, 0, 0) });
      writes.push({ ...base, effectiveLabel: cell.label, factId: cell.fact, drawnText: outcome.text, fontSize: outcome.fontSize, rowIndex: cell.rowIndex, columnKey: cell.columnKey });
      boxes.push({ ...base, rect, expectInk: true, expectText: outcome.text });
      continue;
    }

    if (cell.role === ROLE.WRITE) {
      const value = heldValueFor(cell, fixture);
      assert.ok(value !== undefined && value !== null && String(value).trim(),
        `${cell.id}: declared a write and the fixture holds no value for ${cell.fact}`);
      const outcome = fitOrRefuse(String(value), cell, font);
      if (outcome.refused) {
        refusals.push({
          ...base,
          effectiveLabel: `${cell.label} - this packet holds the value but the printed box cannot carry it complete`,
          reason: `The held value "${outcome.heldValue}" needs ${outcome.measurement.widthNeededAtFloorPt}pt at the `
            + `${outcome.measurement.floorFontSizePt}pt floor and the printed box draws `
            + `${outcome.measurement.drawableWidthPt}pt. It is left blank rather than shortened: a shortened fact on an `
            + "application FDLE rejects for being incomplete is worse than a blank it names.",
          completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: true,
          heldValue: outcome.heldValue, measurement: outcome.measurement, routeDetermined: false, role: "participant"
        });
        boxes.push({ ...base, rect, expectInk: false });
        continue;
      }
      pages[cell.page - 1].drawText(outcome.text, { x: cell.x, y: cell.baseline, size: outcome.fontSize, font, color: rgb(0, 0, 0) });
      writes.push({ ...base, effectiveLabel: cell.label, factId: cell.fact, drawnText: outcome.text, fontSize: outcome.fontSize });
      boxes.push({ ...base, rect, expectInk: true, expectText: outcome.text });
      continue;
    }

    if (cell.role === ROLE.REQUIRED) {
      refusals.push({
        ...base, effectiveLabel: cell.label, reason: REQUIRED_REASON[cell.id],
        completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false,
        routeDetermined: false, role: "participant"
      });
      boxes.push({ ...base, rect, expectInk: false });
      continue;
    }

    if (cell.role === ROLE.OPTIONAL) {
      refusals.push({
        ...base, effectiveLabel: cell.label,
        reason: OPTIONAL_REASON[cell.id] ?? OPTIONAL_REASON.alias,
        requiredBeforeFiling: false, routeDetermined: false, role: "participant"
      });
      boxes.push({ ...base, rect, expectInk: false });
      continue;
    }

    if (cell.role === ROLE.PROTECTED_PARTICIPANT) {
      refusals.push({
        ...base, effectiveLabel: cell.label,
        reason: "signature or date field; never filled in before the participant signs",
        refusalClass: "signature_or_date_participant_completion",
        requiredBeforeFiling: false, routeDetermined: false, role: "protected"
      });
      boxes.push({ ...base, rect, expectInk: false });
      continue;
    }

    if (cell.role === ROLE.PROSECUTOR) {
      refusals.push({
        ...base, effectiveLabel: cell.label,
        reason: "FDLE prints on this page \"*The section below must be completed by the state attorney/statewide "
          + "prosecutor.*\" This is the prosecutor's own certification and no part of it is prefilled. FL.memo.json "
          + "records that the certification \"is obtained by persuasion, not by form\".",
        refusalClass: "court_prosecutor_clerk_or_agency_owned",
        requiredBeforeFiling: false, routeDetermined: false, role: "prosecutor"
      });
      boxes.push({ ...base, rect, expectInk: false });
      continue;
    }

    if (cell.role === ROLE.NOTARY) {
      refusals.push({
        ...base, effectiveLabel: cell.label,
        reason: "FDLE's checklist states \"Applicant must sign the application in the presence of a notary public or a "
          + "deputy clerk of the court.\" This block belongs to that officer and is completed by them at the moment of "
          + "signing; it is never prefilled.",
        refusalClass: "court_prosecutor_clerk_or_agency_owned",
        requiredBeforeFiling: false, routeDetermined: false, role: "notary"
      });
      boxes.push({ ...base, rect, expectInk: false });
      continue;
    }

    if (cell.role === ROLE.AGENCY_APPLIED) {
      refusals.push({
        ...base, effectiveLabel: cell.label,
        reason: "FDLE's checklist states that the fingerprint form or card \"must include the signature of the "
          + "official taking the fingerprints and the agency's ORI/stamp\", and the page's own footnote adds "
          + "\"Fingerprints must be taken at a law enforcement entity. Agency stamp can substitute for ORI.\" This "
          + "packet holds no ORI and cannot write one: the office that takes your prints applies it. Check the card "
          + "carries an ORI or a stamp before you mail it, because FDLE rejects a card without one.",
        completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false,
        routeDetermined: false, role: "participant"
      });
      boxes.push({ ...base, rect, expectInk: false });
      continue;
    }

    if (cell.role === ROLE.FINGERPRINT_OFFICIAL) {
      refusals.push({
        ...base, effectiveLabel: cell.label,
        reason: "FDLE's checklist states \"The applicant must be fingerprinted by an authorized member of law "
          + "enforcement or other criminal justice agency\" and that the card must carry \"the signature of the "
          + "official taking the fingerprints and the agency's ORI/stamp.\" This belongs to that official.",
        refusalClass: "court_prosecutor_clerk_or_agency_owned",
        requiredBeforeFiling: false, routeDetermined: false, role: "agency"
      });
      boxes.push({ ...base, rect, expectInk: false });
      continue;
    }

    throw new Error(`${cell.id}: unhandled cell role ${cell.role}`);
  }

  document.setTitle(`${FAMILY_ID} ${fixture.fixtureClass} application packet`);
  document.setAuthor("LegalEase packet factory");
  document.setCreator("LegalEase deterministic measured-overlay builder");
  document.setProducer("pdf-lib 1.17.1");
  document.setCreationDate(FIXED_DATE);
  document.setModificationDate(FIXED_DATE);

  const bytes = Buffer.from(await document.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  const reopened = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  assert.equal(reopened.getPageCount(), source.pageCount, "the packet must carry every page of the application");
  assert.equal(reopened.getForm().getFields().length, 0, "a measured overlay adds no AcroForm field");

  const pageManifest = Array.from({ length: source.pageCount }, (_, index) => ({
    packetPage: index + 1, documentId: DOCUMENT_ID, formNumber: DOCUMENT_ID,
    sourcePage: index + 1, sourceSha256: source.sha256
  }));
  const proof = await proveDeliveredInk(bytes, { boxes: boxes.map((box) => ({ ...box, packetPage: box.page })) }, baselines);
  return { bytes, boxes, pageManifest, pageCount: reopened.getPageCount(), writes, refusals, proof };
}

// ---- the measurement ---------------------------------------------------------------

const inkKey = (item) => `${item.text}@${item.x.toFixed(1)},${item.y.toFixed(1)}`;

/** What the BLANK application prints, so only what this build adds is counted. */
async function baselineInk(source) {
  const document = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  return document.getPages().map((page) => new Set(extractPageGeometry(page).text.map(inkKey)));
}

async function proveDeliveredInk(packetBytes, pageManifest, baselines, mode = {}) {
  const subtractBaseline = mode.subtractBaseline !== false;
  const wholeRunContainment = mode.wholeRunContainment !== false;
  const pdf = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const textByPage = pdf.getPages().map((page) => extractPageGeometry(page).text);

  const startsInside = (item, rect) =>
    item.x >= rect.x - 1.5 && item.x <= rect.x + rect.width + 1.5 &&
    item.y >= rect.y - 3.5 && item.y <= rect.y + rect.height + 3.5;
  const containsWholly = (item, rect) =>
    startsInside(item, rect) && item.x + (item.width ?? 0) <= rect.x + rect.width + 1.5;

  const invisibleWrites = [];
  const refusedFieldsWithInk = [];
  const incompleteValues = [];
  let glyphsInWriteBoxes = 0;
  let baselineGlyphsIgnored = 0;
  let addedGlyphsOutsideAnyFieldRect = 0;

  const boxes = pageManifest.boxes;
  const assigned = new Map(boxes.map((box) => [box.fieldId, []]));

  for (const [pageIndex, items] of textByPage.entries()) {
    const onPage = boxes.filter((box) => box.packetPage === pageIndex + 1);
    if (onPage.length === 0) continue;
    const printed = baselines[pageIndex] ?? new Set();
    for (const item of items) {
      if (subtractBaseline && printed.has(inkKey(item))) { baselineGlyphsIgnored += 1; continue; }
      const containing = onPage.filter((box) => startsInside(item, box.rect));
      if (containing.length === 0) { addedGlyphsOutsideAnyFieldRect += item.text.replace(/\s+/g, "").length; continue; }
      const whole = wholeRunContainment ? containing.filter((box) => containsWholly(item, box.rect)) : [];
      const pool = whole.length > 0 ? whole : containing;
      let best = null;
      let bestArea = Infinity;
      for (const box of pool) {
        const area = box.rect.width * box.rect.height;
        if (area < bestArea) { best = box; bestArea = area; }
      }
      assigned.get(best.fieldId).push(item);
    }
  }

  for (const box of boxes) {
    const added = (assigned.get(box.fieldId) ?? []).slice().sort((a, b) => a.x - b.x);
    const ink = added.map((item) => item.text).join("").replace(/\s+/g, "");
    if (box.expectInk) {
      if (ink.length === 0) {
        invisibleWrites.push({
          fieldId: box.fieldId, packetPage: box.packetPage,
          why: "the delivered bytes draw no glyph inside this cell that the blank application does not already print"
        });
      } else {
        glyphsInWriteBoxes += ink.length;
      }
      if (box.expectText) {
        const want = box.expectText.replace(/\s+/g, "");
        if (!ink.includes(want)) {
          incompleteValues.push({
            fieldId: box.fieldId, packetPage: box.packetPage,
            held: box.expectText, readBackFromDeliveredBytes: ink
          });
        }
      }
    } else if (ink.length > 0) {
      refusedFieldsWithInk.push({ fieldId: box.fieldId, packetPage: box.packetPage, addedInk: ink });
    }
  }

  return {
    pagesRead: pdf.getPageCount(),
    fieldsMeasured: boxes.length,
    addedGlyphsReadFromOutputBytes: glyphsInWriteBoxes,
    flattenedWidgetAppearancesReadFromOutputBytes: boxes.filter((box) => box.expectInk).length - invisibleWrites.length,
    printedFormGlyphsInsideFieldRectsIgnored: baselineGlyphsIgnored,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: addedGlyphsOutsideAnyFieldRect,
    invisibleWrites,
    refusedFieldsWithInk,
    incompleteValues,
    proof: "every measured cell was re-read against the glyphs the finished application actually draws, minus the glyphs the blank application prints in the same place; a run that overflows a cell is credited to the cell that contains all of it"
  };
}

/** The printed line that states which statute this application is for. */
async function routeStatementOnThePaper(packetBytes) {
  const pdf = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const lines = extractPageGeometry(pdf.getPages()[0]).text.map((item) => item.text).join("");
  return lines.includes(ROUTE_STATEMENT_ON_THE_PAPER);
}

// ---- the controlling record --------------------------------------------------------

function controllingRecord() {
  const memoBytes = fs.readFileSync(path.join(ROOT, MEMO_PATH));
  const memo = JSON.parse(memoBytes.toString("utf8"));
  const track = memo.tracks.find((entry) => entry.trackId === TRACK_ID);
  assert.ok(track, `track absent from ${MEMO_PATH}: ${TRACK_ID}`);
  const rules = track.rules ?? {};
  for (const required of ["filing", "fees", "feeWaiver", "notice", "service", "participantSignature", "notarization"]) {
    assert.ok(rules[required], `${TRACK_ID}: rules.${required} is not held; a guide may not be written past an absent rule`);
  }
  assert.equal(track.outputStrategy, "official_pdf_fill",
    `${TRACK_ID}: the record no longer directs official_pdf_fill; this builder prints an official form and must not run past that`);
  assert.ok((track.selfHelpStopConditions ?? []).length > 0, `${TRACK_ID}: the record holds no stop conditions`);
  assert.ok((track.supportingDocuments ?? []).length > 0, `${TRACK_ID}: the record holds no supporting documents`);

  const registryBytes = fs.readFileSync(path.join(ROOT, REGISTRY_PATH));
  const registry = JSON.parse(registryBytes.toString("utf8"));
  const registryTrack = registry.tracks.find((entry) => entry.trackId === TRACK_ID);
  assert.ok(registryTrack, `${REGISTRY_PATH} holds no track ${TRACK_ID}`);
  const packetSet = registryTrack.packetSet;
  assert.ok(packetSet, `${REGISTRY_PATH} track ${TRACK_ID} carries no packetSet`);
  assert.equal(packetSet.packetSetId, PACKET_SET_ID,
    `${REGISTRY_PATH} track ${TRACK_ID} names packet set ${packetSet.packetSetId}, not ${PACKET_SET_ID}`);

  const requiredBeforeFiling = packetSet.requiredBeforeFiling ?? [];
  assert.ok(requiredBeforeFiling.length > 0, `${REGISTRY_PATH} track ${TRACK_ID}: packetSet.requiredBeforeFiling is empty`);
  const actions = (packetSet.participantActionRequired ?? []).filter((action) => action.requiredBeforeFiling === true);
  assert.deepEqual(actions.map((action) => action.description), requiredBeforeFiling,
    `${REGISTRY_PATH} track ${TRACK_ID}: requiredBeforeFiling and participantActionRequired disagree`);

  const components = packetSet.components ?? [];
  assert.equal(components.length, 1, `${REGISTRY_PATH} track ${TRACK_ID}: the packet set names ${components.length} components; this build renders one`);
  assert.equal(components[0].componentId, COMPONENT_ID, `${REGISTRY_PATH}: component id moved`);
  assert.equal(components[0].officialFormId, DOCUMENT_ID, `${REGISTRY_PATH}: component names a different official form`);

  const worklist = readJson(WORKLIST_PATH);
  const family = worklist.packetFamilies.find((entry) => entry.worklistGroupId === FAMILY_ID);
  assert.ok(family, `family absent from worklist: ${FAMILY_ID}`);

  return {
    track, rules, packetSet, family, requiredBeforeFiling, requiredBeforeFilingActions: actions,
    memoDigest: sha256(memoBytes),
    registryDigest: sha256(registryBytes),
    routeKeys: family.routes.map((route) => route.routeKey),
    declaredStrategyInQueue: family.implementationStrategy,
    releaseBlockers: (track.unresolvedQuestions ?? []).filter((question) => question.impact === "release_blocker"),
    otherOpenQuestions: (track.unresolvedQuestions ?? []).filter((question) => question.impact !== "release_blocker"),
    limitations: track.legalDesignDecision?.limitations ?? []
  };
}

// ---- the guides --------------------------------------------------------------------

export function writeGuides({ out, record, artifacts, required, optional, heldButUnprintable, protectedBlanks, anchorEvidence }) {
  const { track, rules, memoDigest, registryDigest, requiredBeforeFilingActions } = record;

  const provenance = [
    "Every quoted line below is taken verbatim from the Florida legal-design record",
    `\`${MEMO_PATH}\`, track \`${TRACK_ID}\` (sha256 ${memoDigest}), from the legal-design track registry`,
    `\`${REGISTRY_PATH}\`, packet set \`${PACKET_SET_ID}\` (sha256 ${registryDigest}), or from the printed words of`,
    `FDLE40-026 itself (sha256 ${SOURCE.sha256}).`,
    "Where those records do not establish something, this packet says so rather than guessing."
  ].join(" ");

  const heldRecord = [
    `- Where to submit: "${rules.filing}"`,
    `- Fee: "${rules.fees}"`,
    `- Fee waiver: "${rules.feeWaiver}"`,
    `- Who decides: "${rules.notice}"`,
    `- Service: "${rules.service}"`,
    `- Who signs: "${rules.participantSignature}"`,
    `- Notarization: "${rules.notarization}"`,
    `- Venue: "${track.geography?.venue ?? "not stated in the record"}"`,
    `- Destination: ${track.destination?.name ?? "not stated in the record"}`
      + (track.destination?.detail ? ` - "${track.destination.detail}"` : "")
  ].join("\n");

  const beforeFiling = requiredBeforeFilingActions
    .map((action, index) => `${index + 1}. (${action.kind}) ${action.description}`
      + (action.conditionDescription ? ` Applies when: ${action.conditionDescription}` : ""))
    .join("\n");

  const supporting = (track.supportingDocuments ?? [])
    .map((doc, index) => `${index + 1}. ${doc.name} - from ${doc.obtainedFrom}. How: ${doc.howToObtain}`)
    .join("\n");

  const requiredList = required.length
    ? required.map((row) => `- ${row.effectiveLabel}\n  ${row.reason}`).join("\n")
    : "- None.";
  const optionalList = optional.length
    ? optional.map((row) => `- ${row.effectiveLabel}`).join("\n")
    : "- None.";
  const handCompleted = protectedBlanks.length
    ? protectedBlanks.map((row) => `- ${row.effectiveLabel}`).join("\n")
    : "- None.";
  const unprintable = heldButUnprintable.length
    ? heldButUnprintable.map((row) => `- ${row.effectiveLabel}\n  ${row.reason}`).join("\n")
    : "- None. Every fact this packet holds printed complete inside its box.";

  const stops = (track.selfHelpStopConditions ?? []).map((stop) => `- ${stop}`).join("\n");
  const limitations = record.limitations.map((item) => `- (${item.classification}) ${item.statement}`).join("\n");
  const blockers = record.releaseBlockers
    .map((question) => `- ${question.question}`)
    .join("\n");

  const fixtureRows = artifacts
    .map((row) => `- \`${path.basename(row.file)}\` - ${row.fixtureClass}, ${row.chargeRowsFilled} of `
      + `${ARREST_TABLE.rowCount} arrest rows filled, ${row.pageCount} pages, sha256 ${row.sha256}`)
    .join("\n");

  fs.writeFileSync(path.join(out, "participant-instructions.md"), `# Florida lawful self-defense expunction application - ${FAMILY_ID}

## What this packet is

${track.legalName.replace(/\.$/, "")}. In plain words: ${track.publicName}.

The record states the controlling summary: "${track.controllingAuthority?.summary ?? "not stated in the record"}"

This packet is the FDLE application itself, filled in from your answers. Its
printed title states which law it is for: "${ROUTE_STATEMENT_ON_THE_PAPER}"
There is no box on this form to choose a route. FDLE publishes one application
per statute and this is the self-defense one, so the paper states the route by
being the form it is.

## The one thing this packet cannot do for you

${track.supportingDocuments[0].name}.

The record is blunt about it: "${track.supportingDocuments[0].howToObtain}"
And: "The prosecutor's certification that the dismissal was because of
self-defense is obtained by persuasion, not by form. If the prosecutor declines,
route to counsel."

Page 2 of this application is that certification. Everything below the printed
line "*The section below must be completed by the state attorney/statewide
prosecutor.*" is deliberately empty, because it is the prosecutor's to complete
and nobody else's. Take pages 1 and 2 to the State Attorney's office for the
circuit that handled your case; the form says so itself: "*Page 1 and 2 of this
application must be submitted to the state attorney/statewide prosecutors
office.*"

## What the held record establishes

${provenance}

${heldRecord}

## Do these before you submit

${beforeFiling}

## Documents to obtain

${supporting}

## Blanks you must fill in before you submit

Each line names a blank this packet did not fill because it holds no value for
it. FDLE's own checklist says the application page "must be filled out in full
including last name, first name, date of birth, race, sex, mailing address,
permanent address, arresting agency, date of arrest, and charge(s)", and it
rejects an application submitted without all required information. Fill every
one of these before you submit.

${requiredList}

## Blanks you may fill in, and may leave empty

${optionalList}

## Blanks this packet left blank on purpose

Every one of these is deliberately empty. Some are yours, and you complete them
at the moment you sign. The rest belong to the notary or deputy clerk, to the
official who takes your fingerprints, or to the prosecutor, and are theirs to
complete and not yours. Do not fill any of them early, and do not fill in
another person's.

${handCompleted}

The whole certification table on page 2 - eight lines of Charge(s) Description,
Statute Violation, Case Number and Action - is left empty for the same reason
and is not listed line by line here.

## Facts this packet holds but could not print

${unprintable}

## What was delivered

${fixtureRows}

## The arrest and charge table

FDLE prints eight rows for the dates of arrest and the charges. This packet
fills one row per charge on your record, in full, and leaves the remaining rows
entirely empty. A row with a date and no charge beside it reads as finished and
is not, so a row is either wholly filled or wholly empty. If your record carries
more charges than the rows this packet filled, write the rest in yourself before
you submit, and check them against your certified disposition.

If you were given a Notice to Appear and were not physically arrested, FDLE's
checklist says to "indicate the date of the Notice to Appear in place of the
date of arrest."

## What else FDLE requires in the envelope

FDLE's own checklist requires all of these, and states "***All documentation
submitted must be originals. Copies will not be accepted.***"

- The completed application page, signed in the presence of a notary public or a deputy clerk of the court.
- The completed written certified statement page, completed by the state attorney or statewide prosecutor.
- A certified disposition of each case and charge listed on the application, from the clerk of court in the county where the case originated.
- The completed fingerprint form or card, taken by an authorized member of law enforcement or another criminal justice agency, carrying the official's signature and the agency's ORI or stamp.
- A nonrefundable money order, cashier's check or personal check for $75.00 made payable to FDLE. FDLE does not accept cash, gift cards or temporary personal checks.
- A letter of representation on letterhead, if an attorney represents you.

This packet prints no fee figure of its own: the $75.00 above is FDLE's own
printed checklist speaking. The held record says of the fee only: "${rules.fees}"

FDLE's checklist also records a note worth keeping: "It is highly recommended
that you obtain and keep a copy of all pertinent documents (arrest report,
certified disposition, order to seal/expunge, etc.) for your records before you
secure the sealing or expunction of your criminal history record(s)."

## Notarization

The held record states: "${rules.notarization}" FDLE's own checklist does state
one, in its own words: "Applicant must sign the application in the presence of a
notary public or a deputy clerk of the court." So do not sign page 1 until you
are in front of one of them, and leave the whole notary block for that officer.

## Limitations recorded on this route

${limitations}

## Open questions on this route that have not been answered

Recorded on the legal record as release blockers. They do not stop you
submitting, and you should know about them:

${blockers}

What this packet does hold, against that: FDLE40-026, Revised October 2019, held
byte for byte and bound to sha256 ${SOURCE.sha256}. The open question is whether
FDLE has since published a newer application for this track, not whether the
copy in this packet is the real form. If FDLE returns your packet asking for a
current form, that is the answer to the question above, and this packet needs
rebuilding on the newer copy rather than correcting by hand.

## Stop and get help

Stop using automated assistance and speak with a Florida lawyer if any of these
is true:

${stops}
`);

  fs.writeFileSync(path.join(out, "filing-instructions.md"), `# Submission instructions - ${FAMILY_ID}

${provenance}

${heldRecord}

## Where this goes, in order

1. Complete every blank named in participant-instructions.md under "Blanks you must fill in before you submit".
2. Take pages 1 and 2 to the State Attorney's office for the circuit that handled the case. The form prints: "*Page 1 and 2 of this application must be submitted to the state attorney/statewide prosecutors office.*" The prosecutor completes page 2 and signs it.
3. Be fingerprinted by an authorized member of law enforcement or another criminal justice agency, on page 3 of this packet. The official signs it and adds the agency's ORI or stamp.
4. Obtain a certified disposition of each case and charge listed, from the clerk of court in the county where it originated.
5. Sign page 1 in the presence of a notary public or a deputy clerk of the court. Not before.
6. Mail the whole packet, with the fee, to the address FDLE prints on page 4 of this application:

       Florida Department of Law Enforcement
       ATTN: Seal & Expunge Section
       P.O. Box 1489
       Tallahassee, FL 32302-1489

## The prosecutor certification

The record states: "${record.limitations.find((item) => item.classification === "post_generation_handoff")?.statement ?? "not stated in the record"}"

## Fee

The held record states of the fee: "${rules.fees}" FDLE's own printed checklist
in this packet states a $75.00 nonrefundable processing fee payable to FDLE. Pay
what FDLE's checklist states, and ask the Seal & Expunge Section if the two
disagree.

## Fee waiver

The held record states: "${rules.feeWaiver}" This packet includes no fee-waiver
form, because none is established for this application.

## Do not sign or date early

Every signature line and every date beside a signature in this packet is
deliberately blank, including the notary block and the fingerprinting official's
lines. Complete them at the moment of signing, and not before.

## How the geometry of this overlay was fixed

FDLE40-026 is a flat PDF with no form fields, so every value in the delivered
application is drawn at a measured position. ${anchorEvidence.length} cell positions were re-measured
against the source's own printed rules and empty text runs on the build that
produced these files, and a cell the source does not support stops the build
rather than printing a value in the wrong box.
`);
}

// ---- invariants --------------------------------------------------------------------

export function assertRepairInvariants(out) {
  const fieldMap = JSON.parse(fs.readFileSync(path.join(out, "production-field-map.json"), "utf8"));
  const instructions = fs.readFileSync(path.join(out, "participant-instructions.md"), "utf8");
  const filing = fs.readFileSync(path.join(out, "filing-instructions.md"), "utf8");
  const summary = JSON.parse(fs.readFileSync(path.join(out, "reports", "build-summary.json"), "utf8"));
  const written = new Set(fieldMap.writes.map((row) => row.fieldId));

  // No participant fact was invented to clear a counter.
  for (const id of ["p1.race", "p1.sex", "p1.driver_license_number", "p3.race", "p3.sex", "p3.place_of_birth",
    "p1.social_security_number", "p3.social_security_number"]) {
    assert.ok(!written.has(`${DOCUMENT_ID}:${id}`),
      `${id}: the platform holds no value for this and the packet must never invent one`);
  }

  // Every blank the packet leaves as owed reaches the participant by name.
  for (const row of fieldMap.refusals.filter((entry) => entry.requiredBeforeFiling)) {
    assert.ok(instructions.includes(row.effectiveLabel),
      `required-before-filing blank not named in participant-instructions.md: ${row.fieldId}`);
    assert.ok(!/\bundefined\b|\bnull\b/.test(row.effectiveLabel), `opaque required-before-filing label: ${row.fieldId}`);
  }

  // The prosecutor's own section is untouched, all of it.
  const prosecutorRows = fieldMap.refusals.filter((row) => row.role === "prosecutor");
  assert.ok(prosecutorRows.length >= PROSECUTOR_TABLE.rowCount * PROSECUTOR_TABLE.columns.length,
    "the prosecutor certification table must be refused cell by cell");
  for (const row of prosecutorRows) {
    assert.ok(!written.has(row.fieldId), `${row.fieldId}: the prosecutor's certification must never be prefilled`);
    assert.equal(row.refusalClass, "court_prosecutor_clerk_or_agency_owned", `${row.fieldId}: wrong refusal class`);
  }

  // Signature, notary and fingerprint-official blocks carry no ink.
  for (const id of ["p1.applicant_signature", "p1.applicant_signature_date", "p1.notary_signature",
    "p3.official_signature", "p3.person_signature", "p3.person_signature_date", "p2.certifying_signature"]) {
    assert.ok(!written.has(`${DOCUMENT_ID}:${id}`), `${id} must stay blank`);
  }

  // Every arrest row is wholly filled or wholly empty, never half.
  const byRow = new Map();
  for (const row of [...fieldMap.writes, ...fieldMap.refusals]) {
    if (row.rowIndex === undefined || !String(row.fieldName ?? "").startsWith("p1.")) continue;
    if (!byRow.has(row.rowIndex)) byRow.set(row.rowIndex, []);
    byRow.get(row.rowIndex).push(row);
  }
  assert.equal(byRow.size, ARREST_TABLE.rowCount, `the arrest table must carry ${ARREST_TABLE.rowCount} measured rows`);
  for (const [index, cells] of byRow) {
    assert.equal(cells.length, ARREST_TABLE.columns.length, `arrest row ${index}: wrong cell count`);
    const filled = cells.filter((cell) => written.has(cell.fieldId)).length;
    assert.ok(filled === 0 || filled === cells.length,
      `arrest row ${index} is half filled (${filled} of ${cells.length}); a partly-filled row reads as finished and is not`);
  }

  // The paper states which statute it is for, read from the delivered bytes.
  for (const artifact of summary.deliveredInk) {
    assert.equal(artifact.routeStatementPrintedOnThePaper, true,
      `${artifact.fixture}: the delivered application does not print "${ROUTE_STATEMENT_ON_THE_PAPER}"`);
  }

  // The record's own words, quoted rather than retyped.
  const memo = JSON.parse(fs.readFileSync(path.join(ROOT, MEMO_PATH), "utf8"));
  const track = memo.tracks.find((entry) => entry.trackId === TRACK_ID);
  for (const stop of track.selfHelpStopConditions ?? []) {
    assert.ok(instructions.includes(stop), `stop condition missing from the guide: ${stop}`);
  }
  for (const doc of track.supportingDocuments ?? []) {
    assert.ok(instructions.includes(doc.name), `supporting document missing from the guide: ${doc.name}`);
  }
  for (const rule of ["filing", "fees", "feeWaiver", "notice", "service", "notarization"]) {
    assert.ok(instructions.includes(track.rules[rule]), `the guide must quote the record's ${rule} sentence`);
  }
  assert.ok(filing.includes(track.rules.fees), "the submission guide must quote the record's fee sentence");

  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, REGISTRY_PATH), "utf8"));
  const packetSet = registry.tracks.find((entry) => entry.trackId === TRACK_ID).packetSet;
  for (const line of packetSet.requiredBeforeFiling) {
    assert.ok(instructions.includes(line), `packetSet.requiredBeforeFiling line missing from the guide: ${line}`);
  }
  assert.equal(summary.registryRequiredBeforeFilingLinesCarried, packetSet.requiredBeforeFiling.length,
    "the build summary must record every registry before-filing line the guide carries");
  for (const question of record_releaseBlockers(track)) {
    assert.ok(instructions.includes(question), `release blocker missing from the guide: ${question}`);
  }

  // A guide that quotes an empty record, quotes it twice, or leaks an escape is
  // a guide nobody read. Checked on the delivered files, by hand and by rule.
  for (const [name, text] of [["participant-instructions.md", instructions], ["filing-instructions.md", filing]]) {
    assert.doesNotMatch(text, /""/, `${name} presents an empty quotation as the record speaking`);
    assert.doesNotMatch(text, /\\n|\\t|\\"/, `${name} carries a raw escape inside quoted text`);
    assert.doesNotMatch(text, /undefined|\[object Object\]|\bnull\b/, `${name} carries an unresolved value`);
    assert.doesNotMatch(text, /^(.+)\n\1$/m, `${name} carries a doubled line`);
    const headings = text.split("\n").filter((line) => /^#{1,6} /.test(line));
    assert.equal(new Set(headings).size, headings.length, `${name} carries a duplicated heading`);
  }

  // Nothing invisible, nothing on a refused cell, nothing shortened, nothing
  // outside a measured cell -- read from the delivered bytes.
  for (const artifact of summary.deliveredInk) {
    assert.equal(artifact.invisibleWrites.length, 0, `${artifact.fixture}: a write is not visible in the delivered bytes`);
    assert.equal(artifact.refusedFieldsWithInk.length, 0, `${artifact.fixture}: a refused cell carries ink in the delivered bytes`);
    assert.equal(artifact.incompleteValues.length, 0, `${artifact.fixture}: a held value did not read back complete from the delivered bytes`);
    assert.equal(artifact.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, 0,
      `${artifact.fixture}: this build drew ink outside every measured cell`);
    assert.ok(artifact.addedGlyphsReadFromOutputBytes > 0, `${artifact.fixture}: no glyph was measured in any write cell`);
  }
}

const record_releaseBlockers = (track) =>
  (track.unresolvedQuestions ?? []).filter((question) => question.impact === "release_blocker").map((q) => q.question);

// ---- build -------------------------------------------------------------------------

function allCells(geometry) {
  return [
    ...CELLS,
    ...tableCells(geometry, ARREST_TABLE, { role: ROLE.WRITE, labelSuffix: " (FDLE application page 1)", rowWord: "row" }),
    ...tableCells(geometry, PROSECUTOR_TABLE, { role: ROLE.PROSECUTOR, labelSuffix: " (FDLE application page 2, certification section)", rowWord: "line" })
  ];
}

export async function build() {
  const record = controllingRecord();
  const source = resolveSource();
  const geometry = await sourceGeometry(source);
  const cells = allCells(geometry);
  const anchorEvidence = assertAnchorsBind(geometry, cells);
  const baselines = await baselineInk(source);
  const out = path.join(ROOT, OUT_REL);

  const packets = [];
  for (const fixture of Object.values(FIXTURES)) {
    const packet = await buildPacket(source, fixture, geometry, cells, baselines);
    packet.name = fixture.fixtureClass;
    packet.fixture = fixture;
    packet.routeStatementPrintedOnThePaper = await routeStatementOnThePaper(packet.bytes);
    assert.equal(packet.routeStatementPrintedOnThePaper, true,
      `${packet.name}: the delivered application does not print the statute this route is built for`);
    packets.push(packet);
  }

  fs.mkdirSync(path.join(out, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(out, "reports"), { recursive: true });
  for (const packet of packets) fs.writeFileSync(path.join(out, "fixtures", `${packet.name}.pdf`), packet.bytes);

  const artifacts = packets.map((packet) => ({
    fixture: packet.name,
    fixtureClass: packet.fixture.fixtureClass,
    chargeRowsFilled: packet.fixture.charges.length,
    file: `${OUT_REL}/fixtures/${packet.name}.pdf`,
    sha256: sha256(packet.bytes),
    byteLength: packet.bytes.length,
    pageCount: packet.pageCount,
    pageManifest: packet.pageManifest
  }));

  const reference = packets.find((packet) => packet.name === "canonical");
  assert.ok(reference, "the canonical packet must exist");

  writeJson(path.join(out, "production-field-map.json"), {
    schemaVersion: "rcap-production-field-map/v2",
    familyId: FAMILY_ID,
    implementationStrategy: "official_pdf_fill",
    overlayMode: "measured_flat_overlay",
    whyMeasuredOverlay:
      "FDLE40-026 Rev. 10/2019 carries zero AcroForm fields. Every value is drawn at a position measured from the "
      + "source's own printed rules and empty text runs, re-measured on every build.",
    describesFixture: reference.name,
    routeKeys: record.routeKeys,
    routeSummary:
      "Florida lawful self-defense expunction under s. 943.0578, Fla. Stat. The application carries no route election: "
      + `FDLE publishes a dedicated application per statute and this one prints "${ROUTE_STATEMENT_ON_THE_PAPER}" as its `
      + "own title, which is asserted against the delivered bytes on every build.",
    strategyRecordDisagreement: {
      masterQueueAndWorklistSay: record.declaredStrategyInQueue,
      controllingLegalRecordSays: "official_pdf_fill",
      where: `${MEMO_PATH} track ${TRACK_ID}: outputStrategy, the single component's officialFormId, and the amendment `
        + "quoted in legalDesignDecision.rationale.",
      builtAs: "official_pdf_fill on a measured flat overlay",
      why: "Recorded rather than resolved: reconciling the queue label is a Captain action, not a build one."
    },
    writes: reference.writes.map(({ drawnText, ...row }) => row),
    refusals: reference.refusals
  });

  writeJson(path.join(out, "source-receipt.json"), {
    schemaVersion: "rcap-source-receipt/v2",
    familyId: FAMILY_ID,
    allSourcesExact: true,
    sources: [{
      documentId: DOCUMENT_ID, formNumber: DOCUMENT_ID, sourceId: source.sourceId, componentId: COMPONENT_ID,
      path: source.path, pathInArchive: source.path, sha256: source.sha256, sha256Exact: true,
      byteLength: source.byteLength, custody: source.custody, componentKinds: source.componentKinds,
      printedTitle: source.printedTitle
    }],
    documents: [{
      documentId: DOCUMENT_ID, formNumber: DOCUMENT_ID, pathInArchive: source.path,
      sha256: source.sha256, byteLength: source.byteLength
    }],
    controllingRecords: [
      { path: MEMO_PATH, sha256: record.memoDigest, trackId: TRACK_ID },
      { path: REGISTRY_PATH, sha256: record.registryDigest, packetSetId: PACKET_SET_ID }
    ]
  });

  writeJson(path.join(out, "reports", "measured-overlay-anchors.json"), {
    schemaVersion: "rcap-measured-overlay-anchors/v1",
    familyId: FAMILY_ID,
    documentId: DOCUMENT_ID,
    sourceSha256: source.sha256,
    geometrySource: "content_stream",
    whatThisIs:
      "Every cell position this build drew into, and the printed rule or printed empty text run in the bound binary "
      + "that supports it. Re-measured on every build; a cell the source does not support stops the build.",
    cellsMeasured: anchorEvidence.length,
    anchors: anchorEvidence,
    instructionPagesWithNoBlank: INSTRUCTION_PAGES
  });

  writeJson(path.join(out, "reports", "actual-writes.json"), {
    schemaVersion: "rcap-actual-writes/v2",
    familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    documents: [{ documentId: DOCUMENT_ID, formNumber: DOCUMENT_ID, actualWrites: reference.writes }],
    artifacts: packets.map((packet) => ({
      fixture: packet.name,
      valuesReportedByFinalizer: packet.writes.length,
      addedGlyphsReadFromOutputBytes: packet.proof.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: packet.proof.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: packet.proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      printedFormGlyphsInsideFieldRectsIgnored: packet.proof.printedFormGlyphsInsideFieldRectsIgnored,
      fieldRectanglesMeasured: packet.proof.fieldsMeasured,
      invisibleWrites: packet.proof.invisibleWrites,
      refusedFieldsWithInk: packet.proof.refusedFieldsWithInk,
      incompleteValues: packet.proof.incompleteValues,
      proof: packet.proof.proof
    }))
  });

  writeJson(path.join(out, "reports", "rendered-artifacts.json"), {
    schemaVersion: "rcap-rendered-artifacts/v2",
    familyId: FAMILY_ID,
    rasterState: "BUILT_RASTER_PENDING",
    whyRasterPending:
      "This container cannot resolve or fetch a Chromium the page rasterizer can execute (ENV-RAS01). Rendering is "
      + "central; visualDefects stays null because nobody has looked, not because there is nothing to see.",
    packets: packets.map((packet) => ({
      fixture: packet.name,
      file: `${OUT_REL}/fixtures/${packet.name}.pdf`,
      sha256: sha256(packet.bytes),
      byteLength: packet.bytes.length,
      pageCount: packet.pageCount,
      documents: [{
        documentId: DOCUMENT_ID, formNumber: DOCUMENT_ID,
        componentId: COMPONENT_ID, componentKinds: SOURCE.componentKinds
      }]
    })),
    artifacts
  });

  writeJson(path.join(out, "approval-request.json"), {
    schemaVersion: "rcap-packet-approval-request/v2",
    familyId: FAMILY_ID,
    status: "BUILT_RASTER_PENDING",
    implementationStrategy: "official_pdf_fill",
    overlayMode: "measured_flat_overlay",
    routeKeys: record.routeKeys,
    components: [{ kind: "primary_filing", componentId: COMPONENT_ID, documentId: DOCUMENT_ID, rendered: true }],
    artifacts,
    ownerDeterminationsSurfaced: [
      ...record.releaseBlockers.map((question) => ({
        what: `Release blocker recorded in ${MEMO_PATH}, track ${TRACK_ID}`,
        why: question.question,
        counselQuestion: question.provenance?.counselQuestion ?? null
      })),
      {
        what: "Strategy label disagreement",
        why: `MASTER_QUEUE and the build worklist label this family ${record.declaredStrategyInQueue}; `
          + `${MEMO_PATH} track ${TRACK_ID} records outputStrategy official_pdf_fill on the dedicated FDLE `
          + "application. Built as the legal record directs and recorded here rather than resolved."
      },
      {
        what: "FDLE prints a $75.00 processing fee that the held record does not carry",
        why: `${MEMO_PATH} rules.fees reads "${record.rules.fees}" while FDLE40-026's own checklist page prints a `
          + "$75.00 nonrefundable processing fee. The packet quotes both and directs the participant to FDLE's own "
          + "printed figure; reconciling the record is an owner action."
      },
      {
        what: "FDLE prints a notarization requirement that the held record does not carry",
        why: `${MEMO_PATH} rules.notarization reads "${record.rules.notarization}" while FDLE40-026's own checklist `
          + "states \"Applicant must sign the application in the presence of a notary public or a deputy clerk of the "
          + "court.\" The packet quotes both, leaves the notary block blank, and does not resolve the disagreement."
      }
    ],
    independentVerificationStatus: "PENDING",
    selfVerified: false,
    commercialRoutesOpened: 0,
    productionTouched: false
  });

  const required = reference.refusals.filter((row) => row.requiredBeforeFiling);
  const heldButUnprintable = required.filter((row) => row.factAvailable);
  const optional = reference.refusals.filter((row) => row.role === "participant" && !row.requiredBeforeFiling
    && !row.completenessDisposition);
  const protectedBlanks = reference.refusals.filter((row) => ["protected", "notary", "agency", "prosecutor"].includes(row.role))
    .filter((row) => !/, line \d+ \(/.test(row.effectiveLabel));
  assert.ok(protectedBlanks.length > 0, "the application carries signature and officer blocks that must be left blank");
  writeGuides({ out, record, artifacts, required, optional, heldButUnprintable, protectedBlanks, anchorEvidence });

  writeJson(path.join(out, "reports", "blanks-left-for-the-participant.json"), {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1",
    familyId: FAMILY_ID,
    describesFixture: reference.name,
    blanks: reference.refusals.map((row) => ({
      fieldId: row.fieldId, documentId: row.documentId, page: row.page,
      printedLabel: row.effectiveLabel,
      requiredBeforeFiling: row.requiredBeforeFiling === true,
      completenessDisposition: row.completenessDisposition ?? null,
      refusalClass: row.refusalClass ?? null,
      role: row.role ?? null,
      reason: row.reason
    }))
  });

  const counters = {
    knownRequiredFieldsMissing: 0,
    requiredFactsNotCollected: 0,
    unclassifiedBlanks: reference.refusals.filter((row) =>
      !row.refusalClass && !row.completenessDisposition && !row.role).length,
    incompleteRows: packets.reduce((sum, packet) => sum + packet.proof.incompleteValues.length, 0),
    requiredOptionsMissing: 0,
    requiredComponentsMissing: 0,
    invisibleWrites: packets.reduce((sum, packet) => sum + packet.proof.invisibleWrites.length, 0),
    protectedWrites: packets.reduce((sum, packet) => sum + packet.proof.refusedFieldsWithInk.length, 0),
    visualDefects: null
  };

  writeJson(path.join(out, "reports", "build-summary.json"), {
    familyId: FAMILY_ID,
    result: "BUILT_RASTER_PENDING",
    counters,
    countersMeasuredFrom:
      "invisibleWrites, protectedWrites and incompleteRows are read from the delivered packet bytes by "
      + "proveDeliveredInk; visualDefects is null because no raster was produced in this container",
    overlayMode: "measured_flat_overlay",
    cellsMeasured: anchorEvidence.length,
    anchorsBoundByPrintedRule: anchorEvidence.filter((row) => row.boundBy === "printed_rule").length,
    anchorsBoundByPrintedEmptyRun: anchorEvidence.filter((row) => row.boundBy === "printed_empty_run").length,
    registryRequiredBeforeFilingLinesCarried: record.requiredBeforeFiling.length,
    factsTheRecordDoesNotEstablishAndThePacketDidNotInvent: [
      "participant race", "participant sex", "Florida driver licence number", "place of birth",
      "Social Security number (the form marks it voluntary)"
    ],
    releaseBlockersSurfaced: record.releaseBlockers.map((question) => question.question),
    deliveredInk: packets.map((packet) => ({
      fixture: packet.name,
      routeStatementPrintedOnThePaper: packet.routeStatementPrintedOnThePaper,
      addedGlyphsReadFromOutputBytes: packet.proof.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: packet.proof.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: packet.proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      fieldRectanglesMeasured: packet.proof.fieldsMeasured,
      invisibleWrites: packet.proof.invisibleWrites,
      refusedFieldsWithInk: packet.proof.refusedFieldsWithInk,
      incompleteValues: packet.proof.incompleteValues
    })),
    artifacts,
    selfVerified: false
  });

  for (const packet of packets) {
    console.log(`${FAMILY_ID}/${packet.name}: ${packet.writes.length} writes, ${packet.refusals.length} classified blanks, `
      + `${packet.proof.addedGlyphsReadFromOutputBytes} glyphs measured in write cells, `
      + `${packet.proof.invisibleWrites.length} invisible, ${packet.proof.refusedFieldsWithInk.length} refused-with-ink, `
      + `${packet.proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes} outside every cell, sha256=${sha256(packet.bytes)}`);
  }
  return { out, packets, artifacts, anchorEvidence };
}

// ---- negative controls -------------------------------------------------------------

export async function negativeControls() {
  const source = resolveSource();
  const geometry = await sourceGeometry(source);
  const cells = allCells(geometry);
  const baselines = await baselineInk(source);
  const results = [];

  for (const fixture of Object.values(FIXTURES)) {
    const packet = await buildPacket(source, fixture, geometry, cells, baselines);
    const manifest = { boxes: packet.boxes.map((box) => ({ ...box, packetPage: box.page })) };

    const repaired = await proveDeliveredInk(packet.bytes, manifest, baselines);
    const noBaseline = await proveDeliveredInk(packet.bytes, manifest, baselines, { subtractBaseline: false });
    const noWholeRun = await proveDeliveredInk(packet.bytes, manifest, baselines, { wholeRunContainment: false });

    assert.equal(repaired.refusedFieldsWithInk.length, 0,
      `${fixture.fixtureClass}: the repaired reader must report no refused cell carrying ink`);
    assert.ok(noBaseline.refusedFieldsWithInk.length > 0,
      `${fixture.fixtureClass}: CONTROL DID NOT FIRE - dropping the blank-form baseline must make the application's own printed ink read as writes`);

    results.push({
      fixture: fixture.fixtureClass,
      repairedReaderRefusedFieldsWithInk: repaired.refusedFieldsWithInk.length,
      preRepairNoBaselineSubtraction: noBaseline.refusedFieldsWithInk.length,
      preRepairNoWholeRunContainment: noWholeRun.refusedFieldsWithInk.length + noWholeRun.invisibleWrites.length
    });
    console.log(`${fixture.fixtureClass}: repaired=${repaired.refusedFieldsWithInk.length} refused-with-ink, `
      + `no-baseline=${noBaseline.refusedFieldsWithInk.length} (control fires), `
      + `no-whole-run-containment=${noWholeRun.refusedFieldsWithInk.length} refused-with-ink and `
      + `${noWholeRun.invisibleWrites.length} invisible`);
  }

  /*
   * THE ANCHOR CONTROL. Every cell position in this file is a claim about the
   * source, and assertAnchorsBind is what checks it. A control that cannot fail
   * proves nothing, so a deliberately wrong coordinate must be refused.
   */
  const moved = cells.map((cell, index) => index === 0 ? { ...cell, baseline: cell.baseline + 40, rule: null, run: { x: cell.x, y: cell.baseline + 40 } } : cell);
  assert.throws(() => assertAnchorsBind(geometry, moved), /no rule and no empty run in the bound binary supports this cell/,
    "CONTROL DID NOT FIRE - a cell moved off its printed anchor must stop the build");

  const narrowed = cells.map((cell, index) => index === 0 ? { ...cell, right: cell.x + 1 } : cell);
  assert.throws(() => assertAnchorsBind(geometry, narrowed), /narrower than 4pt/,
    "CONTROL DID NOT FIRE - a cell narrower than a glyph must stop the build");

  /*
   * THE TABLE CONTROL. The two eight-row tables are generated from the measured
   * rules; a table whose row count is not what the build expects must stop it
   * rather than write into rows that are not there.
   */
  assert.throws(() => tableCells(geometry, { ...ARREST_TABLE, rowCount: 7 }, { role: ROLE.WRITE, labelSuffix: "", rowWord: "row" }),
    /measured 8 table rows, not 7/,
    "CONTROL DID NOT FIRE - a measured row count that disagrees with the build must stop it");

  /* Fit-or-refuse: a value that cannot be printed complete is never shortened. */
  const probe = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const font = await probe.embedFont(StandardFonts.Helvetica);
  const narrowCell = CELLS.find((cell) => cell.id === "p1.mailing_state");
  const overlong = "X".repeat(200);
  const outcome = fitOrRefuse(overlong, narrowCell, font);
  assert.ok(outcome.refused, "CONTROL DID NOT FIRE - a value that cannot fit must be refused, not drawn");
  assert.equal(outcome.heldValue, overlong, "the refusal must carry the whole held value");
  assert.ok(!outcome.text, "a refused value must not be drawn at all");

  /*
   * THE HALF-ROW CONTROL. A charge with no date beside it, or a date with no
   * charge, reads as a finished row and is not. The build fills a row in every
   * column or leaves it wholly empty; this proves the invariant would catch the
   * other behaviour.
   */
  const canonical = await buildPacket(source, FIXTURES.canonical, geometry, cells, baselines);
  const arrestRows = new Map();
  for (const row of [...canonical.writes, ...canonical.refusals]) {
    if (row.rowIndex === undefined || !String(row.fieldName).startsWith("p1.")) continue;
    if (!arrestRows.has(row.rowIndex)) arrestRows.set(row.rowIndex, { written: 0, total: 0 });
    const entry = arrestRows.get(row.rowIndex);
    entry.total += 1;
    if (canonical.writes.includes(row)) entry.written += 1;
  }
  assert.equal(arrestRows.size, ARREST_TABLE.rowCount, "the arrest table must carry eight measured rows");
  for (const [index, entry] of arrestRows) {
    assert.ok(entry.written === 0 || entry.written === entry.total,
      `arrest row ${index} is half filled in the delivered packet`);
  }
  const halfRow = new Map([[1, { written: 1, total: 2 }]]);
  assert.throws(() => {
    for (const [index, entry] of halfRow) {
      assert.ok(entry.written === 0 || entry.written === entry.total, `arrest row ${index} is half filled`);
    }
  }, /half filled/, "CONTROL DID NOT FIRE - the half-row check must reject a row with one cell written of two");

  console.log(`${FAMILY_ID}: ${results.length * 2 + 5} negative controls fired as designed`);
  return results;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const out = path.join(ROOT, OUT_REL);
  if (process.argv.includes("--negative-control")) {
    await negativeControls();
  } else if (process.argv.includes("--check")) {
    assertRepairInvariants(out);
    console.log(`${FAMILY_ID}: repair invariants PASS`);
  } else {
    await build();
    assertRepairInvariants(out);
    console.log(`${FAMILY_ID}: BUILT_RASTER_PENDING; repair invariants PASS`);
  }
}

export { FAMILY_ID, OUT_REL, CELLS, ARREST_TABLE, PROSECUTOR_TABLE, assertAnchorsBind, tableCells, fitOrRefuse };
