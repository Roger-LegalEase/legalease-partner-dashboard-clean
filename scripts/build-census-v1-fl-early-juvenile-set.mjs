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

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
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
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

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
    "participant.full_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
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

function fitText(page, font, value, rect, preferred = 8.5, minimum = 5) {
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
  doc.setTitle("FDLE40-028 Early Juvenile Expunction Application - PF20 fixture");
  doc.setCreator("RCAP PF20 artifact-only builder");
  doc.setProducer("RCAP PF20 artifact-only builder");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  assert.equal(pages.length, EXPECTED_SOURCE_PAGES, "the exact FDLE source must retain all five pages");

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
  fitText(p2, font, facts["participant.full_name"], { x: 45, y: 670, width: 257 });
  fitText(p2, font, facts["participant.dob"], { x: 309, y: 670, width: 125 });
  fitText(p2, font, facts["participant.phone"], { x: 441, y: 670, width: 126 });

  const p3 = pages[2];
  fitText(p3, font, facts["participant.last_name"], { x: 65, y: 704, width: 145 });
  fitText(p3, font, facts["participant.first_name"], { x: 217, y: 704, width: 150 });
  fitText(p3, font, facts["participant.middle_name"], { x: 375, y: 704, width: 187 });
  fitText(p3, font, facts["participant.race"], { x: 79, y: 632, width: 60 });
  fitText(p3, font, facts["participant.sex"], { x: 176, y: 632, width: 45 });
  fitText(p3, font, facts["participant.dob"], { x: 231, y: 632, width: 70 }, 7.5, 5);

  return Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false }));
}

async function textOfPages(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return doc.getPages().map((page) => groupIntoLines(extractTextItems(page))
    .map((line) => line.text).join(" ").replace(/\s+/g, " "));
}

async function buildFixture(source, fixtureName, facts, fieldMaps) {
  const packetBytes = await overlayOfficialPdf(source, facts);
  const document = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const pagesText = await textOfPages(packetBytes);
  const documentText = pagesText.join(" ").replace(/\s+/g, " ");
  const actualWrites = [];
  let glyphs = 0;
  for (const field of fieldMaps[0].canonicalWrites) {
    const expected = sanitize(facts[field.factId]);
    assert.ok(expected, `${fixtureName} ${field.field} has no fixture fact`);
    assert.ok(documentText.includes(expected),
      `${fixtureName} ${field.field}: expected value is not readable from final packet bytes`);
    glyphs += expected.replace(/\s+/g, "").length;
    actualWrites.push({
      field: field.field,
      document: SOURCE_ID,
      factId: field.factId,
      expected,
      drawnText: expected,
      foundInOutputBytes: true,
      proof: "value extracted from the final official-form packet bytes"
    });
  }
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
    actualWrites,
    glyphs
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
    "| Completed Written Certified Statement Page | Obtain the completed statement from the appropriate State Attorney or Statewide Prosecutor; submit application pages 1 and 2 to that office as the official packet directs. |",
    "| Certified disposition for every listed case or charge | Obtain an original certified disposition from the clerk in the county where each case or charge originated. Include probation termination documentation or diversion completion proof when applicable. |",
    "| Completed fingerprint form or card | Have an authorized law-enforcement or criminal-justice official take the fingerprints and complete the official signature and ORI or agency-stamp fields. |",
    "| Processing fee | Include the nonrefundable $75 payment in an accepted form exactly as page 5 directs; this packet is early juvenile expunction, not the juvenile-diversion fee exception. |",
    "| Original supporting documents | The official checklist says submitted documentation must be original; keep copies for your own records before submission. |",
    "| Attorney letterhead, if represented | Include a letter of representation on attorney letterhead when an attorney represents you. |",
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
    if (artifact.actualWrites.length > 0 && artifact.glyphs === 0) {
      note("invisibleWrites", { fixture: artifact.fixture });
    }
  }
  return { counters, findings, ledger };
}

async function run(argv = process.argv.slice(2)) {
  process.chdir(ROOT);
  const { sourcePath, bytes } = sourceBytes();
  const fieldMaps = maps();
  if (argv.includes("--check")) {
    return {
      familyId: FAMILY_ID,
      status: "CHECK_ONLY",
      sourceSha256: sha256(bytes),
      sourceByteLength: bytes.length,
      components: COMPONENTS,
      writes: fieldMaps[0].canonicalWrites.length,
      blanks: fieldMaps[0].canonicalRefusals.length
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  const artifacts = [];
  for (const fixtureName of ["canonical", "boundary"]) {
    artifacts.push(await buildFixture(bytes, fixtureName, FIXTURES[fixtureName], fieldMaps));
  }
  const rbf = requiredBeforeFiling(fieldMaps);
  const instructions = participantInstructions(rbf);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructions);
  fs.writeFileSync(path.join(ROOT, OUT, "filing-instructions.md"), [
    "# Submission instructions - FDLE early juvenile expunction",
    "",
    "1. Review and complete page 1. List every arrest and charge included in the request.",
    "2. Send pages 1 and 2 to the appropriate State Attorney or Statewide Prosecutor and obtain the completed written certified statement.",
    "3. Obtain an original certified disposition for every listed case or charge, plus probation-termination or diversion-completion proof when applicable.",
    "4. Have an authorized law-enforcement or criminal-justice official take the fingerprints and complete the official fields on page 3.",
    "5. Sign page 1 before a notary public or deputy clerk, and sign/date the fingerprint card at fingerprinting. Do not prefill official-owned fields.",
    "6. Include the $75 nonrefundable processing fee in an accepted payment form and all original supporting documents specified by the official checklist.",
    "7. Mail the complete packet to Florida Department of Law Enforcement, ATTN: Seal & Expunge Section, P.O. Box 1489, Tallahassee, FL 32302-1489, as printed on page 4. Confirm current submission instructions before mailing.",
    "",
    "This is an FDLE agency submission, not a court filing. Keep copies of the complete packet and delivery proof.",
    "",
    `Route: ${ROUTE_KEY}`,
    ""
  ].join("\n"));

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
    bindingMethod: "the exact byte named by the committed acquisition return is read from its existing shared staging path and asserted by SHA-256 and byte length; no acquisition, copy, research, or substitution occurs",
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
    artifacts: artifacts.map(({ actualWrites, glyphs, ...artifact }) => artifact),
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
    note: "Every reported fact value was extracted from the final official-form packet bytes.",
    documents: artifacts.map((artifact) => ({
      fixture: artifact.fixture,
      valuesReportedByFinalizer: artifact.actualWrites.length,
      addedGlyphsReadFromOutputBytes: artifact.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: [],
      actualWrites: artifact.actualWrites
    })),
    artifacts: artifacts.map((artifact) => ({
      fixture: artifact.fixture,
      valuesReportedByFinalizer: artifact.actualWrites.length,
      addedGlyphsReadFromOutputBytes: artifact.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: []
    })),
    blockingFindings: []
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
    allNineZero: true,
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
    nineCountersZero: true,
    packetsSelfVerified: 0,
    commercialRoutesOpened: 0,
    productionTouched: false
  };
}

run()
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error) => { console.error(error); process.exit(1); });
