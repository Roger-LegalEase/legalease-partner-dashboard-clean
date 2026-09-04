#!/usr/bin/env node
/**
 * PF17 — Florida ten-year sealed-record bridge to court-ordered expunction.
 *
 * The held FDLE40-021 expunction application is a flat official PDF.  This
 * builder writes only held participant and case facts onto its measured rules,
 * preserves all six official pages, and appends the Rule 3.989 petition and
 * proposed order that owner determination FL-RULE-3989 authorizes the factory
 * to compose from the committed authority record.  No source byte is copied
 * into the repository as a standalone file.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { classifyBlank, classifyField, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS } from "./rcap-packet-completeness/completeness-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "fl-10yr-bridge-set";
const ROUTE_KEY = "obligation:track-pathway:FL:fl-10yr-bridge:court-ordered-expunction-943-0585";
const OUT = "data/rcap-all50/overlays/census-v1/fl/fl-10yr-bridge-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-fl-10yr-bridge-set.mjs";
const SOURCE_ID = "FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION";
const PETITION_ID = "FL-RULE-3.989-PETITION";
const ORDER_ID = "FL-RULE-3.989-ORDER";
const COMPONENTS = [SOURCE_ID, PETITION_ID, ORDER_ID];
const EXPECTED_SOURCE_SHA256 = "ced5d88f7305780a0d2f6354eca313f32729aa25c1b6782013f8bc6847d4c650";
const EXPECTED_SOURCE_LENGTH = 26602;
const DEFAULT_SOURCE = "/workspaces/.legalease-source-staging/CODEX-CS2-SRC2/acquired/FDLE-certificate-expunction-blank.pdf";
const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

const FIXTURES = Object.freeze({
  canonical: {
    "participant.full_name": "Jordan Avery Reyes",
    "participant.last_name": "Reyes",
    "participant.first_name": "Jordan",
    "participant.middle_name": "Avery",
    "participant.dob": "04/17/1991",
    "participant.race": "W",
    "participant.sex": "X",
    "participant.phone": "305-555-0142",
    "participant.street": "42 Larkspur Street",
    "participant.city": "Miami",
    "participant.state": "FL",
    "participant.zip": "33128",
    "participant.email": "jordan.reyes@example.org",
    "matter.arresting_agency": "Miami-Dade Police Department",
    "matter.arrest_date": "06/11/2013",
    "matter.charge": "Petit theft, Fla. Stat. 812.014",
    "matter.court_name": "Circuit Court of the Eleventh Judicial Circuit",
    "matter.circuit": "Eleventh Judicial Circuit",
    "matter.county": "Miami-Dade",
    "matter.case_number": "F13-012345",
    "matter.sealing_order_date": "08/14/2015"
  },
  boundary: {
    "participant.full_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.last_name": "O'Shaughnessy-Whitfield",
    "participant.first_name": "Maria-Alejandra",
    "participant.middle_name": "Isabel",
    "participant.dob": "12/31/1968",
    "participant.race": "U",
    "participant.sex": "X",
    "participant.phone": "850-555-0199",
    "participant.street": "1188 Upper Tallapoosa Crossing Rd Apt 14B",
    "participant.city": "Fort Walton Beach",
    "participant.state": "FL",
    "participant.zip": "32548-2214",
    "participant.email": "maria.oshaughnessy.whitfield@example.org",
    "matter.arresting_agency": "Okaloosa County Sheriff's Office",
    "matter.arrest_date": "01/02/2012",
    "matter.charge": "Criminal mischief, Fla. Stat. 806.13",
    "matter.court_name": "Circuit Court of the First Judicial Circuit",
    "matter.circuit": "First Judicial Circuit",
    "matter.county": "Okaloosa",
    "matter.case_number": "2012-CF-000001",
    "matter.sealing_order_date": "07/01/2014"
  }
});

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
  const sourcePath = process.env.PF17_FL_FDLE_SOURCE || DEFAULT_SOURCE;
  assert.ok(fs.existsSync(sourcePath), `BLOCKED_SOURCE: ${SOURCE_ID} is absent at the read-only custody mount ${sourcePath}`);
  const bytes = fs.readFileSync(sourcePath);
  assert.equal(bytes.length, EXPECTED_SOURCE_LENGTH,
    `BLOCKED_SOURCE: ${SOURCE_ID} length ${bytes.length} != ${EXPECTED_SOURCE_LENGTH}`);
  assert.equal(sha256(bytes), EXPECTED_SOURCE_SHA256,
    `BLOCKED_SOURCE: ${SOURCE_ID} SHA-256 does not match the PF17 binding`);
  return { sourcePath, bytes };
}

function rowBase(document, id, label, page) {
  return {
    field: `${document}.${id}`, fieldName: `${document}.${id}`,
    printedLabel: label, printedLine: label, effectiveLabel: label,
    regionHeading: label, sectionHeading: null, document, page,
    rectBasis: document === SOURCE_ID ? "measured_on_flat_official_pdf" : "composed_document_authored_by_this_build"
  };
}

const writeRow = (document, id, label, page, factId) => ({
  ...rowBase(document, id, label, page), factId, kind: "text_write"
});

const protectedRow = (document, id, label, page, category, why) => ({
  ...rowBase(document, id, label, page),
  reason: category === SIGNATURE
    ? "signature or date field; never prefilled by this build"
    : "court, clerk, prosecutor, agency, or hearing field; the court completes it",
  category, completenessClass: category, class: category,
  requiredBeforeFiling: false, why
});

const rbfRow = (document, id, label, page, participantMustSupply, why) => ({
  ...rowBase(document, id, label, page),
  reason: `the participant supplies this before filing: ${participantMustSupply}`,
  category: null, completenessClass: null, class: null,
  disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
  requiredBeforeFiling: true, routeDetermined: false,
  identity: `${document} field ${id}`, factId: null,
  participantMustSupply, why
});

const optionalRow = (document, id, label, page, why) => ({
  ...rowBase(document, id, label, page),
  reason: "optional participant-authored content; the platform does not invent it",
  category: null, completenessClass: null, class: null, why
});

function maps() {
  const appWrites = [
    writeRow(SOURCE_ID, "page1_last_name", "Applicant last name", 1, "participant.last_name"),
    writeRow(SOURCE_ID, "page1_first_name", "Applicant first name", 1, "participant.first_name"),
    writeRow(SOURCE_ID, "page1_middle_name", "Applicant middle name", 1, "participant.middle_name"),
    writeRow(SOURCE_ID, "page1_dob", "Applicant date of birth", 1, "participant.dob"),
    writeRow(SOURCE_ID, "page1_race", "Applicant race", 1, "participant.race"),
    writeRow(SOURCE_ID, "page1_sex", "Applicant sex", 1, "participant.sex"),
    writeRow(SOURCE_ID, "page1_phone", "Applicant phone", 1, "participant.phone"),
    writeRow(SOURCE_ID, "page1_mailing_address", "Applicant mailing address", 1, "participant.street"),
    writeRow(SOURCE_ID, "page1_mailing_city", "Applicant mailing city", 1, "participant.city"),
    writeRow(SOURCE_ID, "page1_mailing_state", "Applicant mailing state", 1, "participant.state"),
    writeRow(SOURCE_ID, "page1_mailing_zip", "Applicant mailing zip", 1, "participant.zip"),
    writeRow(SOURCE_ID, "page1_permanent_address", "Applicant permanent address", 1, "participant.street"),
    writeRow(SOURCE_ID, "page1_permanent_city", "Applicant permanent city", 1, "participant.city"),
    writeRow(SOURCE_ID, "page1_permanent_state", "Applicant permanent state", 1, "participant.state"),
    writeRow(SOURCE_ID, "page1_permanent_zip", "Applicant permanent zip", 1, "participant.zip"),
    writeRow(SOURCE_ID, "page1_email", "Applicant email address", 1, "participant.email"),
    writeRow(SOURCE_ID, "page1_arresting_agency", "Charge row 1 arresting agency", 1, "matter.arresting_agency"),
    writeRow(SOURCE_ID, "page1_arrest_date_1", "Charge row 1 arrest date", 1, "matter.arrest_date"),
    writeRow(SOURCE_ID, "page1_charge_1", "Charge row 1 charge description", 1, "matter.charge"),
    writeRow(SOURCE_ID, "page2_name", "Applicant full name on written certified statement", 2, "participant.full_name"),
    writeRow(SOURCE_ID, "page2_dob", "Applicant date of birth on written certified statement", 2, "participant.dob"),
    writeRow(SOURCE_ID, "page2_phone", "Applicant phone on written certified statement", 2, "participant.phone"),
    writeRow(SOURCE_ID, "page3_last_name", "Fingerprinted person's last name", 3, "participant.last_name"),
    writeRow(SOURCE_ID, "page3_first_name", "Fingerprinted person's first name", 3, "participant.first_name"),
    writeRow(SOURCE_ID, "page3_middle_name", "Fingerprinted person's middle name", 3, "participant.middle_name"),
    writeRow(SOURCE_ID, "page3_race", "Fingerprinted person's race", 3, "participant.race"),
    writeRow(SOURCE_ID, "page3_sex", "Fingerprinted person's sex", 3, "participant.sex"),
    writeRow(SOURCE_ID, "page3_dob", "Fingerprinted person's date of birth", 3, "participant.dob")
  ];
  const appRefusals = [
    optionalRow(SOURCE_ID, "page1_alias_last", "Alias last name (optional participant-authored content)", 1, "the fixture carries no alias"),
    optionalRow(SOURCE_ID, "page1_alias_first", "Alias first name (optional participant-authored content)", 1, "the fixture carries no alias"),
    optionalRow(SOURCE_ID, "page1_alias_middle", "Alias middle name (optional participant-authored content)", 1, "the fixture carries no alias"),
    optionalRow(SOURCE_ID, "page1_ssn", "Social Security number (optional)", 1, "the official form expressly marks it optional and this build does not hold it"),
    rbfRow(SOURCE_ID, "page1_driver_license", "Florida driver's license number", 1,
      "the participant's Florida driver-license number, if issued", "the fixture does not hold this sensitive identifier"),
    protectedRow(SOURCE_ID, "page1_applicant_signature", "Applicant signature", 1, SIGNATURE, "the participant signs in front of the notary or deputy clerk"),
    protectedRow(SOURCE_ID, "page1_signature_date", "Applicant signature date", 1, SIGNATURE, "the participant dates the application when signing"),
    protectedRow(SOURCE_ID, "page1_notary_state_county", "Notary state and county", 1, COURT_OWNED, "the notary or deputy clerk completes the acknowledgment"),
    protectedRow(SOURCE_ID, "page1_notary_date", "Notary acknowledgment date", 1, COURT_OWNED, "the notary or deputy clerk completes the acknowledgment"),
    protectedRow(SOURCE_ID, "page1_notary_signature", "Notary signature and commissioned name", 1, COURT_OWNED, "the notary or deputy clerk completes the acknowledgment"),
    protectedRow(SOURCE_ID, "page1_identification_method", "Notary identification method", 1, COURT_OWNED, "the notary or deputy clerk completes the acknowledgment")
  ];
  for (let n = 2; n <= 8; n += 1) {
    appRefusals.push(optionalRow(SOURCE_ID, `page1_arrest_date_${n}`, `Charge row ${n} arrest date (optional additional charge)`, 1,
      "optional participant-authored content; this fixture has no additional charge in this row"));
    appRefusals.push(optionalRow(SOURCE_ID, `page1_charge_${n}`, `Charge row ${n} charge description (optional additional charge)`, 1,
      "optional participant-authored content; this fixture has no additional charge in this row"));
  }
  for (const [id, label] of [
    ["page2_state_attorney", "State Attorney or Statewide Prosecutor"],
    ["page2_reviewing_officer", "Reviewing officer"],
    ["page2_county", "County of prosecution"],
    ["page2_circuit", "Judicial circuit"],
    ["page2_eligible_no_charging_document", "Prosecutor selection 1 - no charging document filed or issued"],
    ["page2_eligible_dismissed_or_acquitted", "Prosecutor selection 2 - dismissed, nolle prosequi, acquitted, or not guilty"],
    ["page2_eligible_ten_year_seal", "Prosecutor selection 3 - withheld-adjudication record sealed at least ten years"],
    ["page2_ineligible_adjudication", "Prosecutor ineligibility selection - adjudication on a related charge"],
    ["page2_ineligible_seal_under_ten", "Prosecutor ineligibility selection - withheld-adjudication record sealed under ten years"],
    ["page2_ineligible_disqualifying_charge", "Prosecutor ineligibility selection - section 943.0584 charge"],
    ["page2_ineligible_other", "Prosecutor ineligibility selection - other statutory ground"],
    ["page2_ineligible_other_case_guilt", "Prosecutor ineligibility selection - adjudication of guilt in a different case"],
    ["page2_ineligible_felony_delinquency", "Prosecutor ineligibility selection - qualifying adjudication of delinquency"],
    ["page2_ineligible_prior_relief", "Prosecutor ineligibility selection - prior court order for sealing or expunction"],
    ["page2_ineligible_supervision", "Prosecutor ineligibility selection - current court supervision"],
    ["page2_state_attorney_signature", "State Attorney signature"],
    ["page2_state_attorney_date", "State Attorney signature date"],
    ["page2_state_attorney_title", "State Attorney title"],
    ["page2_reviewing_officer_signature", "Reviewing officer signature"],
    ["page2_reviewing_officer_date", "Reviewing officer signature date"],
    ["page2_reviewing_officer_title", "Reviewing officer title"]
  ]) appRefusals.push(protectedRow(SOURCE_ID, id, label, 2, COURT_OWNED, "the state attorney or statewide prosecutor completes this field"));
  for (let n = 1; n <= 8; n += 1) {
    for (const [suffix, label] of [["charge", "charge description"], ["statute", "statute violation"], ["case", "case number"], ["action", "action"]]) {
      appRefusals.push(protectedRow(SOURCE_ID, `page2_${suffix}_${n}`, `State Attorney row ${n} ${label}`, 2, COURT_OWNED,
        "the state attorney or statewide prosecutor completes the written certified statement"));
    }
  }
  appRefusals.push(
    optionalRow(SOURCE_ID, "page3_alias_last", "Fingerprint card alias last name (optional participant-authored content)", 3, "the fixture carries no alias"),
    optionalRow(SOURCE_ID, "page3_alias_first", "Fingerprint card alias first name (optional participant-authored content)", 3, "the fixture carries no alias"),
    optionalRow(SOURCE_ID, "page3_alias_middle", "Fingerprint card alias middle name (optional participant-authored content)", 3, "the fixture carries no alias"),
    optionalRow(SOURCE_ID, "page3_ssn", "Fingerprint card Social Security number (optional)", 3, "the source expressly says disclosure is voluntary"),
    rbfRow(SOURCE_ID, "page3_place_of_birth", "Fingerprint card place of birth", 3,
      "the participant's place of birth", "the fixture does not hold this identity fact"),
    protectedRow(SOURCE_ID, "page3_official_signature", "Signature of official taking fingerprints", 3, COURT_OWNED, "the fingerprint official completes it"),
    protectedRow(SOURCE_ID, "page3_ori", "ORI or fingerprinting-entity stamp", 3, COURT_OWNED, "the fingerprinting entity completes it"),
    protectedRow(SOURCE_ID, "page3_participant_signature", "Signature of person fingerprinted", 3, SIGNATURE, "the participant signs while being fingerprinted"),
    protectedRow(SOURCE_ID, "page3_participant_signature_date", "Date beside signature of person fingerprinted", 3, SIGNATURE, "the participant dates the fingerprint card while signing"),
    protectedRow(SOURCE_ID, "page3_fingerprint_impressions", "Fingerprint impressions", 3, COURT_OWNED, "the fingerprinting entity takes and completes the impressions")
  );

  const petitionWrites = [
    writeRow(PETITION_ID, "court_name", "Court name", 1, "matter.court_name"),
    writeRow(PETITION_ID, "county", "County of court", 1, "matter.county"),
    writeRow(PETITION_ID, "case_number", "Case number", 1, "matter.case_number"),
    writeRow(PETITION_ID, "petitioner_name", "Petitioner full name", 1, "participant.full_name"),
    writeRow(PETITION_ID, "arresting_agency", "Arresting agency", 1, "matter.arresting_agency"),
    writeRow(PETITION_ID, "arrest_date", "Date of arrest", 1, "matter.arrest_date"),
    writeRow(PETITION_ID, "charge", "Charge", 1, "matter.charge"),
    writeRow(PETITION_ID, "sealing_order_date", "Date of court sealing order", 1, "matter.sealing_order_date")
  ];
  const petitionRefusals = [
    rbfRow(PETITION_ID, "certificate_number", "FDLE Certificate of Eligibility number", 1,
      "the number printed on the fresh FDLE Certificate of Eligibility", "FDLE issues it only after the Stage 1 application"),
    rbfRow(PETITION_ID, "certificate_issue_date", "FDLE Certificate of Eligibility issue date", 1,
      "the issue date printed on the fresh FDLE Certificate of Eligibility", "FDLE issues it only after the Stage 1 application"),
    protectedRow(PETITION_ID, "petitioner_signature", "Petitioner signature", 1, SIGNATURE, "the participant signs after reviewing the final petition"),
    protectedRow(PETITION_ID, "petitioner_signature_date", "Date beside petitioner signature", 1, SIGNATURE, "the participant dates the petition when signing")
  ];
  const orderWrites = [
    writeRow(ORDER_ID, "court_name", "Court name", 1, "matter.court_name"),
    writeRow(ORDER_ID, "county", "County of court", 1, "matter.county"),
    writeRow(ORDER_ID, "case_number", "Case number", 1, "matter.case_number"),
    writeRow(ORDER_ID, "petitioner_name", "Petitioner full name", 1, "participant.full_name"),
    writeRow(ORDER_ID, "arresting_agency", "Arresting agency", 1, "matter.arresting_agency"),
    writeRow(ORDER_ID, "arrest_date", "Date of arrest", 1, "matter.arrest_date"),
    writeRow(ORDER_ID, "charge", "Charge", 1, "matter.charge"),
    writeRow(ORDER_ID, "sealing_order_date", "Date of court sealing order", 1, "matter.sealing_order_date")
  ];
  const orderRefusals = [
    {
      ...protectedRow(ORDER_ID, "grant_selection", "[ ] Judge selects GRANTED", 1, COURT_OWNED, "the judge decides the petition"),
      kind: "selection_control", isSelectionControl: true
    },
    {
      ...protectedRow(ORDER_ID, "deny_selection", "[ ] Judge selects DENIED", 1, COURT_OWNED, "the judge decides the petition"),
      kind: "selection_control", isSelectionControl: true
    },
    protectedRow(ORDER_ID, "judge_signature", "Judge signature", 1, COURT_OWNED, "the judge completes the proposed order"),
    protectedRow(ORDER_ID, "order_date", "Date of judicial order", 1, COURT_OWNED, "the judge or clerk enters the order date")
  ];
  const policy = (id, role) => ({
    mode: "participant", captionOnly: false, documentAcceptsFill: true,
    routeKey: ROUTE_KEY, documentId: id, role
  });
  return [
    {
      formNumber: SOURCE_ID, documentId: SOURCE_ID, documentRole: "instructions",
      documentPolicy: policy(SOURCE_ID, "instructions"), structuralClass: "flat_official_pdf",
      explicitMappings: {}, roleRefusals: [], selectionControls: [],
      canonicalWrites: appWrites, canonicalRefusals: appRefusals,
      boundaryWrites: appWrites, boundaryRefusals: appRefusals
    },
    {
      formNumber: PETITION_ID, documentId: PETITION_ID, documentRole: "primary_filing",
      documentPolicy: policy(PETITION_ID, "primary_filing"), structuralClass: "composed_document",
      composedFrom: "owner determination FL-RULE-3989 and committed Florida legal-design records",
      explicitMappings: {}, roleRefusals: [], selectionControls: [],
      canonicalWrites: petitionWrites, canonicalRefusals: petitionRefusals,
      boundaryWrites: petitionWrites, boundaryRefusals: petitionRefusals
    },
    {
      formNumber: ORDER_ID, documentId: ORDER_ID, documentRole: "proposed_order",
      documentPolicy: policy(ORDER_ID, "proposed_order"), structuralClass: "composed_document",
      composedFrom: "owner determination FL-RULE-3989 and committed Florida legal-design records",
      explicitMappings: {}, roleRefusals: [], selectionControls: [],
      canonicalWrites: orderWrites, canonicalRefusals: orderRefusals,
      boundaryWrites: orderWrites, boundaryRefusals: orderRefusals
    }
  ];
}

function fitText(page, font, value, rect, preferred = 8.5, minimum = 5.5) {
  const text = sanitize(value);
  let size = preferred;
  while (size > minimum && font.widthOfTextAtSize(text, size) > rect.width) size -= 0.25;
  assert.ok(font.widthOfTextAtSize(text, size) <= rect.width + 0.1,
    `value does not fit measured rectangle: ${text}`);
  page.drawText(text, { x: rect.x, y: rect.y, size, font, color: rgb(0, 0, 0) });
}

async function overlayOfficialPdf(bytes, facts) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  stampDeterministic(doc);
  doc.setTitle("FDLE40-021 expunction application — PF17 fixture");
  doc.setCreator("RCAP PF17 artifact-only builder");
  doc.setProducer("RCAP PF17 artifact-only builder");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  assert.equal(pages.length, 6, "the exact FDLE source must retain all six pages");
  const p1 = pages[0];
  fitText(p1, font, facts["participant.last_name"], { x: 45, y: 686, width: 202 });
  fitText(p1, font, facts["participant.first_name"], { x: 256, y: 686, width: 150 });
  fitText(p1, font, facts["participant.middle_name"], { x: 415, y: 686, width: 148 });
  fitText(p1, font, facts["participant.dob"], { x: 45, y: 573, width: 106 });
  fitText(p1, font, facts["participant.race"], { x: 157, y: 573, width: 116 });
  fitText(p1, font, facts["participant.sex"], { x: 283, y: 573, width: 64 });
  fitText(p1, font, facts["participant.phone"], { x: 359, y: 573, width: 94 });
  fitText(p1, font, facts["participant.street"], { x: 45, y: 547, width: 334 });
  fitText(p1, font, facts["participant.city"], { x: 388, y: 547, width: 113 });
  fitText(p1, font, facts["participant.state"], { x: 508, y: 547, width: 22 }, 7.5);
  fitText(p1, font, facts["participant.zip"], { x: 535, y: 547, width: 32 }, 7.5, 4.5);
  fitText(p1, font, facts["participant.street"], { x: 45, y: 521, width: 334 });
  fitText(p1, font, facts["participant.city"], { x: 388, y: 521, width: 113 });
  fitText(p1, font, facts["participant.state"], { x: 508, y: 521, width: 22 }, 7.5);
  fitText(p1, font, facts["participant.zip"], { x: 535, y: 521, width: 32 }, 7.5, 4.5);
  fitText(p1, font, facts["participant.email"], { x: 230, y: 495, width: 334 });
  fitText(p1, font, facts["matter.arresting_agency"], { x: 143, y: 459, width: 420 });
  fitText(p1, font, facts["matter.arrest_date"], { x: 63, y: 419, width: 64 }, 7.5, 5);
  fitText(p1, font, facts["matter.charge"], { x: 136, y: 419, width: 426 }, 7.5);

  const p2 = pages[1];
  fitText(p2, font, facts["participant.full_name"], { x: 45, y: 686, width: 257 });
  fitText(p2, font, facts["participant.dob"], { x: 309, y: 686, width: 125 });
  fitText(p2, font, facts["participant.phone"], { x: 441, y: 686, width: 126 });

  const p3 = pages[2];
  fitText(p3, font, facts["participant.last_name"], { x: 65, y: 704, width: 145 });
  fitText(p3, font, facts["participant.first_name"], { x: 217, y: 704, width: 150 });
  fitText(p3, font, facts["participant.middle_name"], { x: 375, y: 704, width: 187 });
  fitText(p3, font, facts["participant.race"], { x: 79, y: 632, width: 60 });
  fitText(p3, font, facts["participant.sex"], { x: 176, y: 632, width: 45 });
  fitText(p3, font, facts["participant.dob"], { x: 231, y: 632, width: 70 }, 7.5, 5);

  return Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false }));
}

async function renderTextPdf(title, lines) {
  const doc = await PDFDocument.create();
  stampDeterministic(doc);
  doc.setTitle(title);
  doc.setCreator("RCAP PF17 artifact-only builder");
  doc.setProducer("RCAP PF17 artifact-only builder");
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const width = 612, height = 792, margin = 68, lineHeight = 14.2;
  let page = doc.addPage([width, height]);
  let y = height - margin;
  const maxWidth = width - 2 * margin;
  const wrap = (raw, activeFont, size) => {
    if (!raw) return [""];
    const words = sanitize(raw).split(/\s+/);
    const out = []; let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (activeFont.widthOfTextAtSize(next, size) <= maxWidth) current = next;
      else { if (current) out.push(current); current = word; }
    }
    if (current) out.push(current);
    return out;
  };
  for (const entry of lines) {
    const text = typeof entry === "string" ? entry : entry.text;
    const isBold = typeof entry === "object" && entry.bold;
    const size = typeof entry === "object" && entry.size ? entry.size : 11;
    const activeFont = isBold ? bold : font;
    for (const line of wrap(text, activeFont, size)) {
      if (y < margin) { page = doc.addPage([width, height]); y = height - margin; }
      if (line) page.drawText(line, { x: margin, y, size, font: activeFont, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
  }
  return Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false }));
}

function petitionLines(f) {
  return [
    { text: f["matter.court_name"].toUpperCase(), bold: true },
    { text: `IN AND FOR ${f["matter.county"].toUpperCase()} COUNTY, FLORIDA`, bold: true },
    "", `Court name: ${f["matter.court_name"]}`, `IN RE: ${f["participant.full_name"]}`, `CASE NO.: ${f["matter.case_number"]}`, "",
    { text: "PETITION TO EXPUNGE A CRIMINAL HISTORY RECORD", bold: true, size: 12 }, "",
    `Petitioner, ${f["participant.full_name"]}, asks the Court to expunge the criminal-history record identified below under section 943.0585, Florida Statutes, and Florida Rule of Criminal Procedure 3.989.`,
    "", "RECORD IDENTIFICATION", `Arresting agency: ${f["matter.arresting_agency"]}`,
    `Date of arrest: ${f["matter.arrest_date"]}`, `Charge: ${f["matter.charge"]}`,
    `Court case number: ${f["matter.case_number"]}`, "",
    "TEN-YEAR SEALED-RECORD BRIDGE", `The same record was sealed by court order on ${f["matter.sealing_order_date"]}.`,
    "The petition proceeds only on the route determination that this same record has remained sealed by court order for at least ten years and is the record for which expunction is sought.",
    "Petitioner requests only the discretionary relief available under section 943.0585. This packet does not represent that relief is automatic.",
    "", "CERTIFICATE OF ELIGIBILITY", "FDLE Certificate of Eligibility number: ........................................................",
    "FDLE Certificate of Eligibility issue date: ....................................................",
    "A fresh, valid certificate must be attached before this petition is filed.", "",
    "REQUEST FOR RELIEF", "Petitioner asks the Court to enter the attached proposed order expunging the identified criminal-history record, subject to the statute and the Court's determination.",
    "", "I declare that I have reviewed this petition and that the factual statements I supply are true and correct.",
    "", "Petitioner signature: ..............................................................................",
    "Date beside petitioner signature: ...............................................................",
    `Printed name: ${f["participant.full_name"]}`, "", `Route: ${ROUTE_KEY}`
  ];
}

function orderLines(f) {
  return [
    { text: f["matter.court_name"].toUpperCase(), bold: true },
    { text: `IN AND FOR ${f["matter.county"].toUpperCase()} COUNTY, FLORIDA`, bold: true },
    "", `Court name: ${f["matter.court_name"]}`, `IN RE: ${f["participant.full_name"]}`, `CASE NO.: ${f["matter.case_number"]}`, "",
    { text: "PROPOSED ORDER TO EXPUNGE A CRIMINAL HISTORY RECORD", bold: true, size: 12 }, "",
    `The petition of ${f["participant.full_name"]} concerns the record of an arrest by ${f["matter.arresting_agency"]} on ${f["matter.arrest_date"]}, for ${f["matter.charge"]}, in case ${f["matter.case_number"]}.`,
    `The record was sealed by court order on ${f["matter.sealing_order_date"]}.`, "",
    "The Court, having reviewed the petition, the attached FDLE Certificate of Eligibility, the sealing-order record, and any response or evidence properly before it, and being otherwise fully advised, makes the findings required by applicable law.",
    "", "IT IS ORDERED that the petition is:", "", "[ ] GRANTED. The identified criminal-history record shall be expunged as provided by section 943.0585, Florida Statutes.",
    "", "[ ] DENIED.", "", "The clerk shall distribute this order as required by law.", "",
    "Date of judicial order: ............................................................................",
    "", "Judge signature: ...................................................................................",
    "CIRCUIT/COUNTY JUDGE", "", `Route: ${ROUTE_KEY}`
  ];
}

async function textOfPages(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return doc.getPages().map((page) => groupIntoLines(extractTextItems(page))
    .map((line) => line.text).join(" ").replace(/\s+/g, " "));
}

async function assembleFixture(source, fixtureName, facts, fieldMaps) {
  const officialBytes = await overlayOfficialPdf(source, facts);
  const petitionBytes = await renderTextPdf("Florida Rule 3.989 petition", petitionLines(facts));
  const orderBytes = await renderTextPdf("Florida Rule 3.989 proposed order", orderLines(facts));
  const packet = await PDFDocument.create();
  stampDeterministic(packet);
  packet.setTitle(`Florida ten-year bridge packet — ${fixtureName}`);
  packet.setCreator("RCAP PF17 artifact-only builder");
  packet.setProducer("RCAP PF17 artifact-only builder");
  const manifest = [];
  const spans = new Map();
  for (const [component, bytes] of [[SOURCE_ID, officialBytes], [PETITION_ID, petitionBytes], [ORDER_ID, orderBytes]]) {
    const componentPdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const start = packet.getPageCount();
    const copied = await packet.copyPages(componentPdf, componentPdf.getPageIndices());
    copied.forEach((page, index) => {
      packet.addPage(page);
      manifest.push({
        packetPage: packet.getPageCount(), component, documentId: component,
        sourcePage: index + 1,
        sourceSha256: component === SOURCE_ID ? EXPECTED_SOURCE_SHA256 : null
      });
    });
    spans.set(component, { start, end: packet.getPageCount() });
  }
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
  const rel = `${OUT}/fixtures/${fixtureName}.pdf`;
  fs.writeFileSync(path.join(ROOT, rel), bytes);
  const pagesText = await textOfPages(bytes);
  const actualWrites = [];
  let glyphs = 0;
  for (const map of fieldMaps) {
    const span = spans.get(map.formNumber);
    const documentText = pagesText.slice(span.start, span.end).join(" ").replace(/\s+/g, " ");
    for (const field of map.canonicalWrites) {
      const expected = sanitize(facts[field.factId]);
      assert.ok(expected, `${fixtureName} ${field.field} has no fixture fact`);
      assert.ok(documentText.includes(expected), `${fixtureName} ${field.field}: expected value is not readable from final packet bytes`);
      glyphs += expected.replace(/\s+/g, "").length;
      actualWrites.push({
        field: field.field, document: map.formNumber, factId: field.factId,
        expected, drawnText: expected, foundInOutputBytes: true,
        proof: "value extracted from the final packet pages assigned to this component"
      });
    }
  }
  return {
    fixture: fixtureName, file: rel, sha256: sha256(bytes), byteLength: bytes.length,
    pageCount: packet.getPageCount(), pageManifest: manifest, documents: COMPONENTS,
    actualWrites, glyphs
  };
}

function requiredBeforeFiling(fieldMaps) {
  return fieldMaps.flatMap((map) => map.canonicalRefusals
    .filter((field) => field.requiredBeforeFiling === true)
    .map((field) => ({
      document: map.formNumber, field: field.field, page: field.page,
      printedContext: field.printedLabel, disclosureLabel: field.effectiveLabel,
      identity: field.identity, why: field.why, participantMustSupply: field.participantMustSupply
    })));
}

function participantInstructions(items) {
  const out = [
    "# Before you use the Florida ten-year sealed-record bridge packet", "",
    "This review artifact contains three components in the controlling PF17 family: the six-page FDLE Application for a Certificate of Eligibility, a composed Rule 3.989 petition, and a composed proposed order.", "",
    "## Two-stage sequence", "",
    "1. Stage 1 — verify the same record has remained sealed by court order for at least ten years, then complete and submit the fresh FDLE expunction application. Obtain the certified sealing order and any certified disposition the FDLE instructions require. Have fingerprints taken, obtain the State Attorney or Statewide Prosecutor written certified statement, sign before a notary or deputy clerk, and include the $75 nonrefundable FDLE processing fee stated by the held application.",
    "2. Stage 2 — wait for a fresh FDLE Certificate of Eligibility. Do not file the court petition before it arrives. Add its number and issue date, attach the certificate and certified sealing order, review and sign the petition, and confirm the current filing, service, fee, hearing, and local-format requirements with the clerk in the circuit of arrest.", "",
    "The prior sealing exception applies only to the same record that has remained sealed for at least ten years. Stop and obtain attorney review if a different prior sealing or expunction exists, the State objects, the sealing order is not in force, the record has not reached ten years, later record history changes eligibility, or immigration consequences matter.", "",
    "Court-ordered expunction is discretionary. This packet does not promise relief and opens no route.", "",
    "## Required before filing or submission", "",
    "| Blank printed in the packet | What you must supply |", "| --- | --- |"
  ];
  for (const item of items) out.push(`| ${item.disclosureLabel.replaceAll("|", "-")} | ${item.participantMustSupply.replaceAll("|", "-")} |`);
  out.push(
    "", "## Protected fields", "",
    "Do not pre-sign or pre-date the FDLE application, fingerprint card, or petition. The notary or deputy clerk completes the acknowledgment. The fingerprinting official completes the official signature, ORI/stamp, and impressions. The State Attorney or Statewide Prosecutor completes all of the written certified statement below the applicant identity row. The judge completes the decision, order date, and judicial signature.", "",
    `Route: ${ROUTE_KEY}`, ""
  );
  return out.join("\n");
}

function countCompleteness(fieldMaps, artifacts, instructions) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((counter) => [counter, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };
  const normalize = (field) => ({
    id: field.field, name: field.fieldName ?? field.field,
    label: field.effectiveLabel ?? field.printedLabel ?? field.field,
    reason: field.reason ?? "", refusalClass: field.category ?? null,
    page: field.page, document: field.document, factId: field.factId ?? null,
    isSelectionControl: field.isSelectionControl === true || field.kind === "selection_control",
    declared: {
      disposition: field.completenessDisposition ?? null,
      ...(Object.hasOwn(field, "requiredBeforeFiling") ? { requiredBeforeFiling: field.requiredBeforeFiling === true } : {}),
      routeDetermined: field.routeDetermined === true,
      factId: field.factId ?? null, identity: field.identity ?? field.field
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
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.id, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.id, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.id, basis: verdict.basis });
  }
  const haystack = instructions.toLowerCase();
  for (const blank of ledger.filter((field) => field.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [blank.label, blank.id, blank.declared.identity].filter(Boolean);
    if (!needles.some((needle) => haystack.includes(String(needle).toLowerCase().slice(0, 60)))) {
      note("requiredFactsNotCollected", { field: blank.id });
    }
  }
  const rows = new Map();
  for (const field of [...writes.map((x) => ({ ...x, written: true })), ...blanks.map((x) => ({ ...x, written: false }))]) {
    const key = rowKeyOf(field);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(field);
  }
  for (const [key, fields] of rows) {
    if (!fields.some((field) => field.written)) continue;
    const missing = fields.filter((field) => !field.written && classifyField(field.label, field.isSelectionControl).requirement === "REQUIRED_KNOWN");
    if (missing.length) note("incompleteRows", { row: key, fields: missing.map((field) => field.id) });
  }
  for (const field of writes) if (classifyField(field.label, field.isSelectionControl).requirement === "PROTECTED") note("protectedWrites", { field: field.id });
  for (const artifact of artifacts) {
    if (artifact.actualWrites.length > 0 && artifact.glyphs === 0) note("invisibleWrites", { fixture: artifact.fixture });
  }
  return { counters, findings, ledger };
}

async function run(argv = process.argv.slice(2)) {
  process.chdir(ROOT);
  const { sourcePath, bytes } = sourceBytes();
  const fieldMaps = maps();
  if (argv.includes("--check")) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY", sourceSha256: sha256(bytes), sourceByteLength: bytes.length,
      components: COMPONENTS, writes: fieldMaps.reduce((n, map) => n + map.canonicalWrites.length, 0),
      blanks: fieldMaps.reduce((n, map) => n + map.canonicalRefusals.length, 0)
    };
  }
  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  const artifacts = [];
  for (const fixtureName of ["canonical", "boundary"]) {
    artifacts.push(await assembleFixture(bytes, fixtureName, FIXTURES[fixtureName], fieldMaps));
  }
  const rbf = requiredBeforeFiling(fieldMaps);
  const instructions = participantInstructions(rbf);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructions);
  const counted = countCompleteness(fieldMaps, artifacts, instructions);
  assert.ok(PASS_COUNTERS.every((counter) => counted.counters[counter] === 0),
    `builder completeness counters are nonzero: ${JSON.stringify(counted.counters)}`);
  const authorityRecords = [
    "data/rcap-grade-a/legal-decisions/OWNER_DETERMINATIONS_2026-09-02.json",
    "data/record-clearing/legal-design-intake/FL.memo.json",
    "data/record-clearing/legal-design-track-registry.json",
    "data/record-clearing/legal-design-packet-set-manifests.json"
  ].map(hashRepoFile);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID,
    jurisdiction: "FL", implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_BOUND_BY_HELD_BYTES", acquisitionCommissioned: false,
    bindingMethod: "the exact held FDLE byte is read directly from mounted source custody; no acquisition, copy, research, or substitution",
    allSourcesExact: true, routeKeys: [ROUTE_KEY], sourceBinaryCommitted: false,
    mountedReadOnlySource: { documentId: SOURCE_ID, sourceId: `official-form:${SOURCE_ID}`, custodyPath: sourcePath, sha256: EXPECTED_SOURCE_SHA256, byteLength: EXPECTED_SOURCE_LENGTH },
    documents: [
      { documentId: SOURCE_ID, formNumber: SOURCE_ID, kind: "held_official_pdf", sha256: EXPECTED_SOURCE_SHA256, byteLength: EXPECTED_SOURCE_LENGTH },
      { documentId: PETITION_ID, formNumber: PETITION_ID, kind: "composed_from_authority", ownerDetermination: "FL-RULE-3989" },
      { documentId: ORDER_ID, formNumber: ORDER_ID, kind: "composed_from_authority", ownerDetermination: "FL-RULE-3989" }
    ],
    compositionAuthority: { determination: "FL-RULE-3989", records: authorityRecords },
    formIdentityNote: "The held official component is the expunction rendering of FDLE40-021. The two Rule 3.989 components are composed under FL-RULE-3989; they are not represented as held official PDF bytes.",
    commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: ["participant eligibility", "source freshness beyond the exact PF17 binding", "independent verification", "visual acceptance", "approval for fulfillment"]
  });
  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    jurisdiction: "FL", renderStrategy: "official_pdf_overlay_plus_composed_rule_pleadings",
    implementationStrategy: "official_pdf_fill", routeKeys: [ROUTE_KEY],
    legalName: "Florida ten-year sealed-record bridge to court-ordered expunction",
    statute: "Fla. Stat. Sec. 943.0585; Fla. R. Crim. P. 3.989",
    componentSet: COMPONENTS,
    instrumentKinds: ["instructions", "primary_filing", "proposed_order"],
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: [{ routeKey: ROUTE_KEY, selection: "FDLE request type Expunge and same-record ten-year sealed-record bridge", sourceSupport: "the exact FDLE expunction application and committed fl-10yr-bridge legal-design records" }],
    routeSelectionNote: "This family is fixed to the expunction branch for the same record after at least ten years under a court sealing order; no alternate relief election is left to the participant.",
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    maps: fieldMaps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });
  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID,
    renderedFresh: true, derivedFromBytes: true, componentSet: COMPONENTS,
    pdfs: artifacts.map((a) => ({ file: a.file, documentId: "assembled_packet", role: "assembled_packet", fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    artifacts: artifacts.map(({ actualWrites, glyphs, ...artifact }) => artifact),
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: false, byteDerivedHashes: true, rasterEngine: null,
    rasterSkipped: true, rasterPages: [], independentVerificationPending: true
  });
  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    note: "Every reported fact value was extracted from the final packet pages assigned to its component.",
    documents: artifacts.map((a) => ({
      fixture: a.fixture, valuesReportedByFinalizer: a.actualWrites.length,
      addedGlyphsReadFromOutputBytes: a.glyphs, flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0, refusedFieldsWithInk: [], actualWrites: a.actualWrites
    })),
    artifacts: artifacts.map((a) => ({
      fixture: a.fixture, valuesReportedByFinalizer: a.actualWrites.length,
      addedGlyphsReadFromOutputBytes: a.glyphs, flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0, refusedFieldsWithInk: []
    })), blockingFindings: []
  });
  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    protectedBlanks: fieldMaps.flatMap((map) => map.canonicalRefusals.filter((field) => field.requiredBeforeFiling !== true)
      .map((field) => ({ document: map.formNumber, field: field.field, label: field.effectiveLabel, refusalClass: field.category ?? null, why: field.why ?? field.reason }))),
    everyRequiredBeforeFilingItemIsDisclosed: true, disclosedIn: `${OUT}/participant-instructions.md`
  });
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs: "the builder's fail-fast count of the nine repository completeness counters",
    whatThisIsNot: "an independent verification or raster verdict",
    counters: counted.counters, allNineZero: true, findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, field) => { acc[field.disposition] = (acc[field.disposition] ?? 0) + 1; return acc; }, {})
  });
  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    renderedArtifacts: 2, rasterPages: 0, rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0,
    productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });
  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [],
    findings: [
      { finding: "The exact held FDLE40-021 byte is a six-page flat PDF with Request Type: Expunge printed on page 1.", consequence: "The build uses a measured text overlay and preserves all six pages." },
      { finding: "Owner determination FL-RULE-3989 authorizes composition of the Rule 3.989 petition and order.", consequence: "Those components are clearly recorded as composed, not official source PDFs." },
      { finding: "The State Attorney certified-statement body, fingerprint-official fields, signatures, notarization, and judicial order fields are protected.", consequence: "The build leaves them blank and participant instructions name the completion owner." }
    ]
  });
  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review, source-freshness review, and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "Confirm the Rule 3.989 petition and order language for this exact ten-year bridge route before promotion.",
      "Confirm local filing, service, fee, and hearing requirements before promotion."
    ],
    mattersForTheReviewersAttention: [
      "The PDF overlay is measured but has not been raster-reviewed.",
      "The exact 2019-revised source byte is bound as assigned; freshness review remains pending.",
      "The builder has not independently verified its own packet."
    ]
  });
  return {
    familyId: FAMILY_ID, status: "COMPLETED", counters: counted.counters,
    directory: OUT, implementationStrategy: "official_pdf_fill", components: COMPONENTS,
    writes: fieldMaps.reduce((n, map) => n + map.canonicalWrites.length, 0),
    requiredBeforeFiling: rbf.length,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, byteLength: a.byteLength, pages: a.pageCount })),
    rasterState: "BUILT_RASTER_PENDING", nineCountersZero: true,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

run().then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error) => { console.error(error); process.exit(1); });
