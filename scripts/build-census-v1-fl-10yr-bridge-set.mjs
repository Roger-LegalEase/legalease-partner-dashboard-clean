#!/usr/bin/env node
/**
 * PF17 — Florida ten-year sealed-record bridge to court-ordered expunction.
 *
 * The held FDLE40-021 expunction application is a flat official PDF.  This
 * builder writes only held participant and case facts onto its measured rules,
 * preserves all six official pages, and appends the Rule 3.989 petition and
 * proposed order that owner determination FL-RULE-3989 authorizes the factory
 * to compose from the committed authority record. The builder reads the
 * governed source byte without altering or repinning it.
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
import { carryForwardGovernance } from "./rcap-packet-completeness/governance-preservation.mjs";
import { preserveIdentityRefresh } from "./rcap-packet-completeness/identity-refresh.mjs";

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
const DEFAULT_SOURCE = "reference/source-recovery/2026-09-11-wave1/CODEX-CS2-SRC2__FL-10YR-BRIDGE-SET__FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION__ced5d88f7305.pdf";
const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

// Measured from the exact flat source's own content stream. The page-3 blanks
// are literal space runs with these x/width/baseline values; page 1 uses the
// cell bounds and printed parenthesis positions carried by the same stream.
const SOURCE_PLACEMENTS = Object.freeze({
  page1_last_name: { page: 1, x: 45, y: 696, width: 202, sourceBlank: { x: 44.817, leftLabelBaseline: 707.939, nextRowBaseline: 681.889 } },
  page1_first_name: { page: 1, x: 256, y: 696, width: 150, sourceBlank: { x: 255.703, leftLabelBaseline: 707.939, nextRowBaseline: 681.889 } },
  page1_middle_name: { page: 1, x: 415, y: 696, width: 148, sourceBlank: { x: 413.867, leftLabelBaseline: 707.939, nextRowBaseline: 681.889 } },
  page1_phone: {
    page: 1, format: "printed_parentheses", y: 576,
    areaCode: { x: 359, width: 20, sourceBlank: { x: 358.202, width: 21.684, baseline: 574.612 } },
    localNumber: { x: 386, width: 72, sourceBlank: { x: 384.215, width: 75.101, baseline: 574.612 } }
  },
  page3_last_name: { page: 3, x: 65, y: 691, width: 149, sourceBlank: { x: 64.74, width: 150.12, baseline: 689.845 } },
  page3_first_name: { page: 3, x: 246, y: 691, width: 141, sourceBlank: { x: 245.778, width: 141.78, baseline: 689.845 } },
  page3_middle_name: { page: 3, x: 426, y: 691, width: 135, sourceBlank: { x: 425.122, width: 136.22, baseline: 689.845 } },
  page3_race: { page: 3, x: 76, y: 619, width: 66, sourceBlank: { x: 75.84, width: 66.72, baseline: 617.845 } },
  page3_sex: { page: 3, x: 174, y: 619, width: 24, sourceBlank: { x: 173.36, width: 25.02, baseline: 617.845 } },
  page3_dob: { page: 3, x: 229, y: 619, width: 52, sourceBlank: { x: 228.49, width: 52.82, baseline: 617.845 } }
});

// Every declared write on the exact six-page source has an output box. These
// boxes are also the ruler for the source/output byte difference below. The
// ten corrected boxes above retain the additional source-caption measurements
// that explain this repair; the remaining boxes preserve the existing map.
const SOURCE_WRITE_BOXES = Object.freeze({
  ...SOURCE_PLACEMENTS,
  page1_dob: { page: 1, x: 45, y: 573, width: 106 },
  page1_race: { page: 1, x: 157, y: 573, width: 116 },
  page1_sex: { page: 1, x: 283, y: 573, width: 64 },
  page1_mailing_address: { page: 1, x: 45, y: 547, width: 334 },
  page1_mailing_city: { page: 1, x: 388, y: 547, width: 113 },
  page1_mailing_state: { page: 1, x: 508, y: 547, width: 22 },
  page1_mailing_zip: { page: 1, x: 535, y: 547, width: 32 },
  page1_permanent_address: { page: 1, x: 45, y: 521, width: 334 },
  page1_permanent_city: { page: 1, x: 388, y: 521, width: 113 },
  page1_permanent_state: { page: 1, x: 508, y: 521, width: 22 },
  page1_permanent_zip: { page: 1, x: 535, y: 521, width: 32 },
  page1_email: { page: 1, x: 230, y: 495, width: 334 },
  page1_arresting_agency: { page: 1, x: 143, y: 459, width: 420 },
  page1_arrest_date_1: { page: 1, x: 63, y: 419, width: 64 },
  page1_charge_1: { page: 1, x: 136, y: 419, width: 426 },
  page2_name: { page: 2, x: 45, y: 686, width: 257 },
  page2_dob: { page: 2, x: 309, y: 686, width: 125 },
  page2_phone: { page: 2, x: 441, y: 686, width: 126 }
});

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
    "participant.full_name": "Maria-Alejandra Isabel O'Shaughnessy-Whitfield",
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

const joinedLegalName = facts => [facts["participant.first_name"], facts["participant.middle_name"],
  facts["participant.last_name"]].filter(Boolean).join(" ");
const certifiedStatementName = facts => `${facts["participant.last_name"]}, ${facts["participant.first_name"]}`
  + (facts["participant.middle_name"] ? ` ${facts["participant.middle_name"]}` : "");

function assertHeldNameParts(facts) {
  for (const key of ["participant.last_name", "participant.first_name", "participant.middle_name"])
    assert.ok(String(facts[key] ?? "").trim(), `held legal-name part is missing: ${key}`);
  assert.equal(facts["participant.full_name"], joinedLegalName(facts),
    "participant.full_name must preserve held first, middle and last name parts");
}

function writeJson(rel, value) {
  const absolute = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  /* A hand-written identityRefresh on a source pin this build did not move
   * survives the rebuild; one whose source moved again does not. See
   * scripts/rcap-packet-completeness/identity-refresh.mjs. */
  fs.writeFileSync(absolute, `${JSON.stringify(preserveIdentityRefresh(fs, absolute, value), null, 2)}\n`);
}

function hashRepoFile(rel) {
  const bytes = fs.readFileSync(path.join(ROOT, rel));
  return { path: rel, sha256: sha256(bytes), byteLength: bytes.length };
}

const readRepoJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

/*
 * THE SERVICE REQUIREMENT THE RECORDS HELD AND THE PAGE NEVER PRINTED.
 *
 * Three records this family binds carry a service requirement for the court
 * stage, in identical words. The participant page printed none of them: it named
 * service only inside a list of things to "confirm ... with the clerk", which
 * tells a self-represented filer that service is a local detail to ask about
 * rather than a requirement the record already settles. VF02 read that as a
 * SERVICE failure on the delivered bytes and it is one.
 *
 * WHY THIS IS ASSERTED AND NOT PINNED. The receipt already binds all three of
 * these records by whole-file SHA-256, and two of those three pins are stale at
 * this base for reasons that have nothing to do with Florida -- other lanes
 * rewrite the shared records several times a week. A whole-file pin cannot say
 * whether THIS SENTENCE moved, which is the only thing the page depends on. So
 * the sentence is asserted verbatim, from every record that carries it, at build
 * time: if any of them changes the wording, this build fails instead of printing
 * a requirement the record no longer states.
 *
 * NOTHING HERE IS AUTHORED. The quoted sentence is the record's own. The records
 * name no recipient and no method for this track, and the page says exactly that
 * rather than borrowing the recipients named on Florida's other tracks.
 */
const SERVICE_TRACK_ID = "fl-10yr-bridge";

function serviceRequirement() {
  const memoTrack = readRepoJson("data/record-clearing/legal-design-intake/FL.memo.json")
    .tracks.find((track) => track.trackId === SERVICE_TRACK_ID);
  const registryTrack = readRepoJson("data/record-clearing/legal-design-track-registry.json")
    .tracks.find((track) => track.trackId === SERVICE_TRACK_ID);
  const packetSet = readRepoJson("data/record-clearing/legal-design-packet-set-manifests.json")
    .packetSets.find((entry) => entry.packetSetId === FAMILY_ID);
  assert.ok(memoTrack, `FL.memo.json carries no track ${SERVICE_TRACK_ID}`);
  assert.ok(registryTrack, `legal-design-track-registry.json carries no track ${SERVICE_TRACK_ID}`);
  assert.ok(packetSet, `legal-design-packet-set-manifests.json carries no packet set ${FAMILY_ID}`);

  const servePartyActions = packetSet.participantActionRequired.filter((action) => action.kind === "serve_party");
  assert.equal(servePartyActions.length, 1,
    `expected exactly one serve_party action on ${FAMILY_ID}, found ${servePartyActions.length}`);
  const [serveParty] = servePartyActions;
  assert.equal(serveParty.requirement, "required",
    `the serve_party action on ${FAMILY_ID} is no longer 'required' (${serveParty.requirement}); `
    + "the participant page states that it is, so the page must be re-derived rather than reprinted");

  const stated = [
    { record: "data/record-clearing/legal-design-intake/FL.memo.json", sentence: memoTrack.rules?.service },
    { record: "data/record-clearing/legal-design-track-registry.json", sentence: registryTrack.rules?.service },
    { record: "data/record-clearing/legal-design-packet-set-manifests.json", sentence: serveParty.description }
  ];
  const [first, ...rest] = stated;
  assert.ok(typeof first.sentence === "string" && first.sentence.trim().length > 0,
    `${first.record} states no service requirement for ${SERVICE_TRACK_ID}`);
  for (const other of rest) {
    assert.equal(other.sentence, first.sentence,
      `the service requirement is stated differently by ${other.record} (${JSON.stringify(other.sentence)}) `
      + `than by ${first.record} (${JSON.stringify(first.sentence)}); this build will not choose between them`);
  }

  /* The records settle THAT a certificate of service is owed, not to whom or by
   * what method. The page must not fill that in from anywhere else. */
  const namesRecipientOrMethod =
    /\b(recipient|by mail|certified mail|e-?service|hand deliver|state attorney|prosecutor)\b/i.test(first.sentence);
  assert.equal(namesRecipientOrMethod, false,
    `the service sentence now names a recipient or a method (${JSON.stringify(first.sentence)}); `
    + "the participant page states that the records name neither, so that sentence must be re-derived");

  const components = packetSet.components.map((component) => component.role);
  assert.equal(components.includes("certificate_of_service"), false,
    "the packet set now declares a certificate_of_service component; the participant page states that this packet "
    + "contains none, so that statement must be re-derived");

  return { sentence: first.sentence, statedBy: stated.map((entry) => entry.record) };
}

function courtStageRequirements() {
  const memoTrack = readRepoJson("data/record-clearing/legal-design-intake/FL.memo.json")
    .tracks.find((track) => track.trackId === SERVICE_TRACK_ID);
  const registryTrack = readRepoJson("data/record-clearing/legal-design-track-registry.json")
    .tracks.find((track) => track.trackId === SERVICE_TRACK_ID);
  const packetSet = readRepoJson("data/record-clearing/legal-design-packet-set-manifests.json")
    .packetSets.find((entry) => entry.packetSetId === FAMILY_ID);
  assert.ok(memoTrack && registryTrack && packetSet, "Florida bridge requirement records are incomplete");

  const sworn = "Notarised signature on the FDLE application; sworn affidavit at the court stage.";
  const notarization = "Required on the FDLE application and on the affidavit unless sworn before a deputy clerk.";
  const obtainOrder = "Obtain Certified copy of the sealing order. Ask the clerk of the court that sealed the record for a certified copy of the order.";
  const compareOrder = "Check your answer to \"On what date was the record sealed by court order?\" against Certified copy of the sealing order, and correct the packet if they disagree.";
  for (const track of [memoTrack, registryTrack]) {
    assert.equal(track.rules?.participantSignature, sworn,
      "Florida bridge sworn court-stage requirement changed");
    assert.equal(track.rules?.notarization, notarization,
      "Florida bridge affidavit oath requirement changed");
    assert.ok((track.selfHelpStopConditions ?? track.selfHelpBoundaries ?? []).includes("Any hearing."),
      "Florida bridge Any hearing self-help stop is absent");
  }
  const requiredActions = packetSet.participantActionRequired.filter(action => action.requirement === "required");
  for (const [kind, description] of [["sign", sworn], ["notarize", notarization],
    ["obtain_document", obtainOrder], ["confirm_answer", compareOrder]]) {
    assert.equal(requiredActions.filter(action => action.kind === kind && action.description === description).length, 1,
      `Florida bridge packet set does not carry the exact required ${kind} action`);
  }
  return {
    swornAffidavit: sworn, notarizationOrDeputyClerk: notarization,
    obtainCertifiedSealingOrder: obtainOrder, compareAndCorrectSealingDate: compareOrder,
    hearingStop: "Any hearing.",
    statedBy: [
      "data/record-clearing/legal-design-intake/FL.memo.json",
      "data/record-clearing/legal-design-track-registry.json",
      "data/record-clearing/legal-design-packet-set-manifests.json"
    ]
  };
}

function sourceBytes() {
  const requestedPath = process.env.PF17_FL_FDLE_SOURCE || DEFAULT_SOURCE;
  const sourcePath = path.isAbsolute(requestedPath) ? requestedPath : path.join(ROOT, requestedPath);
  assert.ok(fs.existsSync(sourcePath), `BLOCKED_SOURCE: ${SOURCE_ID} is absent at the read-only custody mount ${sourcePath}`);
  const bytes = fs.readFileSync(sourcePath);
  assert.equal(bytes.length, EXPECTED_SOURCE_LENGTH,
    `BLOCKED_SOURCE: ${SOURCE_ID} length ${bytes.length} != ${EXPECTED_SOURCE_LENGTH}`);
  assert.equal(sha256(bytes), EXPECTED_SOURCE_SHA256,
    `BLOCKED_SOURCE: ${SOURCE_ID} SHA-256 does not match the PF17 binding`);
  const relative = path.relative(ROOT, sourcePath);
  const custodyPath = relative && !relative.startsWith("..") && !path.isAbsolute(relative)
    ? relative.replaceAll(path.sep, "/") : sourcePath;
  return { sourcePath, custodyPath, bytes };
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
  ...rowBase(document, id, label, page), factId, kind: "text_write",
  ...(document === SOURCE_ID && SOURCE_PLACEMENTS[id]
    ? { sourceMeasuredPlacement: structuredClone(SOURCE_PLACEMENTS[id]) }
    : {})
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
  assertHeldNameParts(facts);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  stampDeterministic(doc);
  doc.setTitle("FDLE40-021 expunction application — PF17 fixture");
  doc.setCreator("RCAP PF17 artifact-only builder");
  doc.setProducer("RCAP PF17 artifact-only builder");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  assert.equal(pages.length, 6, "the exact FDLE source must retain all six pages");
  const p1 = pages[0];
  fitText(p1, font, facts["participant.last_name"], SOURCE_PLACEMENTS.page1_last_name);
  fitText(p1, font, facts["participant.first_name"], SOURCE_PLACEMENTS.page1_first_name);
  fitText(p1, font, facts["participant.middle_name"], SOURCE_PLACEMENTS.page1_middle_name);
  fitText(p1, font, facts["participant.dob"], { x: 45, y: 573, width: 106 });
  fitText(p1, font, facts["participant.race"], { x: 157, y: 573, width: 116 });
  fitText(p1, font, facts["participant.sex"], { x: 283, y: 573, width: 64 });
  const phone = /^(\d{3})-(\d{3}-\d{4})$/.exec(facts["participant.phone"]);
  assert.ok(phone, "participant.phone must use 000-000-0000 so it can fit the source parentheses");
  fitText(p1, font, phone[1], { ...SOURCE_PLACEMENTS.page1_phone.areaCode, y: SOURCE_PLACEMENTS.page1_phone.y }, 8.5, 7);
  fitText(p1, font, phone[2], { ...SOURCE_PLACEMENTS.page1_phone.localNumber, y: SOURCE_PLACEMENTS.page1_phone.y }, 8.5, 7);
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
  fitText(p2, font, certifiedStatementName(facts), { x: 45, y: 686, width: 257 });
  fitText(p2, font, facts["participant.dob"], { x: 309, y: 686, width: 125 });
  fitText(p2, font, facts["participant.phone"], { x: 441, y: 686, width: 126 });

  const p3 = pages[2];
  fitText(p3, font, facts["participant.last_name"], SOURCE_PLACEMENTS.page3_last_name);
  fitText(p3, font, facts["participant.first_name"], SOURCE_PLACEMENTS.page3_first_name);
  fitText(p3, font, facts["participant.middle_name"], SOURCE_PLACEMENTS.page3_middle_name);
  fitText(p3, font, facts["participant.race"], SOURCE_PLACEMENTS.page3_race);
  fitText(p3, font, facts["participant.sex"], SOURCE_PLACEMENTS.page3_sex);
  fitText(p3, font, facts["participant.dob"], SOURCE_PLACEMENTS.page3_dob, 7.5, 5);

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

const expectedWriteValue = (field, facts) => field.document === SOURCE_ID && field.field.endsWith(".page2_name")
  ? certifiedStatementName(facts) : sanitize(facts[field.factId]);

const nonWhitespaceGlyphCount = text => Array.from(String(text)).filter(character => !/\s/u.test(character)).length;
const itemIdentity = item => JSON.stringify([
  item.text, Number(item.x.toFixed(3)), Number(item.y.toFixed(3)), Number(item.size.toFixed(3)),
  item.width === null ? null : Number(item.width.toFixed(3)), item.baseFont
]);

function sourceWriteExpectations(fieldMaps, facts) {
  const writes = fieldMaps.find(map => map.formNumber === SOURCE_ID)?.canonicalWrites ?? [];
  return writes.flatMap(field => {
    const id = field.field.slice(field.field.lastIndexOf(".") + 1);
    const box = SOURCE_WRITE_BOXES[id];
    assert.ok(box, `source write has no declared output box: ${field.field}`);
    if (id === "page1_phone") {
      const match = /^(\d{3})-(\d{3}-\d{4})$/.exec(facts[field.factId]);
      assert.ok(match, "participant.phone must use 000-000-0000");
      return [
        { field: field.field, segment: "area_code", text: match[1], page: box.page,
          x: box.areaCode.x, y: box.y, width: box.areaCode.width },
        { field: field.field, segment: "local_number", text: match[2], page: box.page,
          x: box.localNumber.x, y: box.y, width: box.localNumber.width }
      ];
    }
    return [{ field: field.field, segment: null, text: expectedWriteValue(field, facts),
      page: box.page, x: box.x, y: box.y, width: box.width }];
  });
}

async function measureSourceOutputDifference(sourceBytes, packetBytes, facts, fieldMaps) {
  const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const packet = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  assert.equal(source.getPageCount(), 6, "source/output measurement expects the exact six-page source");
  assert.equal(packet.getPageCount(), 8, "source/output measurement expects the complete eight-page packet");
  const added = [];
  const missingSourceItems = [];
  let sourceTextItemsMatched = 0;
  for (let pageIndex = 0; pageIndex < source.getPageCount(); pageIndex += 1) {
    const sourceItems = extractTextItems(source.getPages()[pageIndex]);
    const remaining = new Map();
    for (const item of sourceItems) {
      const key = itemIdentity(item);
      if (!remaining.has(key)) remaining.set(key, []);
      remaining.get(key).push(item);
    }
    for (const item of extractTextItems(packet.getPages()[pageIndex])) {
      const key = itemIdentity(item);
      const sourceMatches = remaining.get(key) ?? [];
      if (sourceMatches.length) {
        sourceMatches.pop();
        sourceTextItemsMatched += 1;
      } else added.push({ page: pageIndex + 1, ...item });
    }
    for (const items of remaining.values()) {
      for (const item of items) missingSourceItems.push({ page: pageIndex + 1, text: item.text, x: item.x, y: item.y });
    }
  }

  const expectations = sourceWriteExpectations(fieldMaps, facts).map(entry => ({ ...entry, matched: false }));
  const measuredAddedTextRuns = [];
  const outsideAddedTextRuns = [];
  for (const item of added) {
    const expectation = expectations.find(entry => !entry.matched && entry.page === item.page
      && entry.text === item.text && Math.abs(entry.x - item.x) <= 0.02
      && Math.abs(entry.y - item.y) <= 0.02 && item.width !== null
      && item.width <= entry.width + 0.1);
    const measured = {
      page: item.page, text: item.text, x: item.x, y: item.y, width: item.width, size: item.size,
      nonWhitespaceGlyphs: nonWhitespaceGlyphCount(item.text)
    };
    if (expectation) {
      expectation.matched = true;
      measuredAddedTextRuns.push({ ...measured, field: expectation.field, segment: expectation.segment });
    } else outsideAddedTextRuns.push(measured);
  }
  const missingDeclaredWriteRuns = expectations.filter(entry => !entry.matched)
    .map(({ matched, ...entry }) => entry);
  const pageText = packet.getPages().map(page => groupIntoLines(extractTextItems(page))
    .map(line => line.text).join(" ").replace(/\s+/g, " "));
  const span = new Map([[SOURCE_ID, [0, 6]], [PETITION_ID, [6, 7]], [ORDER_ID, [7, 8]]]);
  const declaredWritesMissingFromFinalBytes = [];
  let declaredWritesVerifiedFromFinalBytes = 0;
  for (const map of fieldMaps) {
    const [start, end] = span.get(map.formNumber);
    const componentText = pageText.slice(start, end).join(" ");
    for (const field of map.canonicalWrites) {
      if (field.field.endsWith(".page1_phone")) {
        const runs = measuredAddedTextRuns.filter(run => run.field === field.field);
        if (runs.length === 2) declaredWritesVerifiedFromFinalBytes += 1;
        else declaredWritesMissingFromFinalBytes.push(field.field);
      } else if (componentText.includes(expectedWriteValue(field, facts))) declaredWritesVerifiedFromFinalBytes += 1;
      else declaredWritesMissingFromFinalBytes.push(field.field);
    }
  }
  const sourceFields = source.getForm().getFields().length;
  const outputFields = packet.getForm().getFields().length;
  return {
    method: "multiset difference of exact text runs on the six pinned source pages versus the first six final packet pages; every added run is consumed by one declared source write box",
    sourcePagesCompared: 6, sourceTextItemsMatched, missingSourceItems,
    sourceBoundDeclaredWrites: fieldMaps.find(map => map.formNumber === SOURCE_ID).canonicalWrites.length,
    composedDeclaredWrites: fieldMaps.filter(map => map.formNumber !== SOURCE_ID)
      .reduce((sum, map) => sum + map.canonicalWrites.length, 0),
    declaredWritesVerifiedFromFinalBytes, declaredWritesMissingFromFinalBytes,
    expectedAddedTextRuns: expectations.length, measuredAddedTextRuns, missingDeclaredWriteRuns,
    addedTextRunsReadFromOutputBytes: added.length,
    addedGlyphsReadFromOutputBytes: added.reduce((sum, item) => sum + nonWhitespaceGlyphCount(item.text), 0),
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: outsideAddedTextRuns
      .reduce((sum, item) => sum + item.nonWhitespaceGlyphs, 0),
    outsideAddedTextRuns,
    flattenedWidgetAppearancesReadFromOutputBytes: outputFields === 0 && sourceFields === 0 ? 0 : null,
    widgetMeasurement: {
      method: "enumerated AcroForm fields in the exact source and final packet bytes; neither contains a widget that could be filled or flattened",
      sourceInteractiveFields: sourceFields, outputInteractiveFields: outputFields,
      status: outputFields === 0 && sourceFields === 0 ? "MEASURED_NO_WIDGET_APPEARANCES" : "UNKNOWN"
    }
  };
}

function assertSourceOutputMeasurement(measurement, expectedDeclaredWrites) {
  assert.equal(measurement.missingSourceItems.length, 0, "final packet dropped or moved exact source text");
  assert.equal(measurement.missingDeclaredWriteRuns.length ?? 0, 0);
  assert.equal(measurement.declaredWritesMissingFromFinalBytes.length, 0,
    "a declared write is absent from final packet bytes");
  assert.equal(measurement.declaredWritesVerifiedFromFinalBytes, expectedDeclaredWrites,
    "not every declared write was verified from final bytes");
  assert.equal(measurement.measuredAddedTextRuns.length, measurement.expectedAddedTextRuns,
    "not every expected source write run was measured");
  assert.equal(measurement.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, 0,
    "final source pages contain undeclared or out-of-box added ink");
  assert.equal(measurement.flattenedWidgetAppearancesReadFromOutputBytes, 0,
    "widget appearance count is not measurable as zero for this flat source packet");
  return true;
}

function assertPlacementItems(itemsByPage, facts) {
  const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) <= 0.02,
    `${message}: ${actual} != ${expected}`);
  const findAt = (page, text, placement, label) => {
    const candidates = itemsByPage[page - 1].filter(item => item.text === sanitize(text));
    const item = candidates.find(candidate => Math.abs(candidate.x - placement.x) <= 0.02
      && Math.abs(candidate.y - placement.y) <= 0.02);
    assert.ok(item, `${label}: ${text} is absent from its measured source blank`);
    close(item.x, placement.x, `${label} x`);
    close(item.y, placement.y, `${label} y`);
    assert.ok(item.width <= placement.width + 0.1, `${label}: ${text} exceeds its measured width`);
    return item;
  };
  findAt(1, facts["participant.last_name"], SOURCE_PLACEMENTS.page1_last_name, "page 1 last name");
  findAt(1, facts["participant.first_name"], SOURCE_PLACEMENTS.page1_first_name, "page 1 first name");
  findAt(1, facts["participant.middle_name"], SOURCE_PLACEMENTS.page1_middle_name, "page 1 middle name");
  const phone = /^(\d{3})-(\d{3}-\d{4})$/.exec(facts["participant.phone"]);
  assert.ok(phone, "participant.phone must use 000-000-0000");
  findAt(1, phone[1], { ...SOURCE_PLACEMENTS.page1_phone.areaCode, y: SOURCE_PLACEMENTS.page1_phone.y }, "page 1 phone area code");
  findAt(1, phone[2], { ...SOURCE_PLACEMENTS.page1_phone.localNumber, y: SOURCE_PLACEMENTS.page1_phone.y }, "page 1 phone local number");
  findAt(2, certifiedStatementName(facts), { x: 45, y: 686, width: 257 }, "page 2 Last, First Middle name");
  for (const [key, factId] of [["page3_last_name", "participant.last_name"],
    ["page3_first_name", "participant.first_name"], ["page3_middle_name", "participant.middle_name"],
    ["page3_race", "participant.race"], ["page3_sex", "participant.sex"],
    ["page3_dob", "participant.dob"]]) {
    findAt(3, facts[factId], SOURCE_PLACEMENTS[key], `page 3 ${key.slice(6).replaceAll("_", " ")}`);
  }
  return true;
}

async function assertOfficialOverlayPlacements(bytes, facts) {
  assertHeldNameParts(facts);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  assert.equal(doc.getPageCount(), 8, "assembled packet must contain six source pages, petition, and order");
  const itemsByPage = doc.getPages().map(page => extractTextItems(page));
  assertPlacementItems(itemsByPage, facts);
  const pagesText = itemsByPage.map(items => groupIntoLines(items).map(line => line.text).join(" ").replace(/\s+/g, " "));
  assert.ok(pagesText[6].includes(joinedLegalName(facts)), "petition page must preserve the held full legal name");
  assert.ok(pagesText[7].includes(joinedLegalName(facts)), "order page must preserve the held full legal name");
  if (facts["participant.middle_name"] === "Isabel") {
    for (const page of [2, 7, 8]) assert.ok(pagesText[page - 1].includes("Isabel"),
      `boundary middle name Isabel must appear on page ${page}`);
  }
  return { pageCount: doc.getPageCount(), legalNamePages: [2, 7, 8] };
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
  await assertOfficialOverlayPlacements(bytes, facts);
  const declaredWriteCount = fieldMaps.reduce((sum, map) => sum + map.canonicalWrites.length, 0);
  const byteMeasurement = await measureSourceOutputDifference(source, bytes, facts, fieldMaps);
  assertSourceOutputMeasurement(byteMeasurement, declaredWriteCount);
  const rel = `${OUT}/fixtures/${fixtureName}.pdf`;
  fs.writeFileSync(path.join(ROOT, rel), bytes);
  const pagesText = await textOfPages(bytes);
  const actualWrites = [];
  let declaredValueNonWhitespaceCharacters = 0;
  for (const map of fieldMaps) {
    const span = spans.get(map.formNumber);
    const documentText = pagesText.slice(span.start, span.end).join(" ").replace(/\s+/g, " ");
    for (const field of map.canonicalWrites) {
      const expected = expectedWriteValue(field, facts);
      assert.ok(expected, `${fixtureName} ${field.field} has no fixture fact`);
      const splitPhone = field.document === SOURCE_ID && field.field.endsWith(".page1_phone");
      if (!splitPhone) assert.ok(documentText.includes(expected),
        `${fixtureName} ${field.field}: expected value is not readable from final packet bytes`);
      declaredValueNonWhitespaceCharacters += nonWhitespaceGlyphCount(expected);
      actualWrites.push({
        field: field.field, document: map.formNumber, factId: field.factId,
        expected,
        drawnText: splitPhone ? "area code and local number drawn separately around the source-printed parentheses" : expected,
        foundInOutputBytes: true,
        ...(field.sourceMeasuredPlacement
          ? { sourceMeasuredPlacement: field.sourceMeasuredPlacement, placementVerifiedInFinalBytes: true }
          : {}),
        proof: field.sourceMeasuredPlacement
          ? "text extracted at the exact source-measured x/y and within the measured width in final packet bytes"
          : "value extracted from the final packet pages assigned to this component"
      });
    }
  }
  return {
    fixture: fixtureName, file: rel, sha256: sha256(bytes), byteLength: bytes.length,
    pageCount: packet.getPageCount(), pageManifest: manifest, documents: COMPONENTS,
    actualWrites, declaredValueNonWhitespaceCharacters, byteMeasurement
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

function participantInstructions(items, service, requirements) {
  const out = [
    "# Before you use the Florida ten-year sealed-record bridge packet", "",
    "This review artifact contains three components in the controlling PF17 family: the six-page FDLE Application for a Certificate of Eligibility, a composed Rule 3.989 petition, and a composed proposed order.", "",
    "## Two-stage sequence", "",
    "1. Stage 1 — verify the same record has remained sealed by court order for at least ten years, then complete and submit the fresh FDLE expunction application. Ask the clerk of the court that sealed the record for a certified copy of the sealing order, and obtain any certified disposition the FDLE instructions require. Have fingerprints taken, obtain the State Attorney or Statewide Prosecutor written certified statement, sign before a notary or deputy clerk, and include the $75 nonrefundable FDLE processing fee stated by the held application.",
    "2. Stage 2 — wait for a fresh FDLE Certificate of Eligibility. Do not file the court petition before it arrives. Add its number and issue date, attach the certificate and certified sealing order, complete the separate sworn court-stage affidavit described below, review and sign the petition, prepare the certificate of service described below, and confirm the current filing, fee, and local-format requirements with the clerk in the circuit of arrest.", "",
    "The prior sealing exception applies only to the same record that has remained sealed for at least ten years. Stop and obtain attorney review if a different prior sealing or expunction exists, the State objects, the sealing order is not in force, the record has not reached ten years, later record history changes eligibility, immigration consequences matter, or any hearing is required or set.", "",
    "Court-ordered expunction is discretionary. This packet does not promise relief and opens no route.", "",
    "## Required before filing or submission", "",
    "| Blank printed in the packet | What you must supply |", "| --- | --- |"
  ];
  for (const item of items) out.push(`| ${item.disclosureLabel.replaceAll("|", "-")} | ${item.participantMustSupply.replaceAll("|", "-")} |`);
  out.push(
    "", "## Court-stage sworn completion and sealing-order check", "",
    "The ordinary declaration and signature line printed on the petition is not the required sworn affidavit. Before filing at the court stage, complete a separate sworn affidavit. Have that affidavit notarized unless you swear it before a deputy clerk.", "",
    "Obtain the currently accepted affidavit format from the circuit clerk or an attorney before filing.", "",
    "Ask the clerk of the court that sealed the record for a certified copy of the sealing order. Compare your answer to \"On what date was the record sealed by court order?\" against that certified copy, and correct the packet if they disagree.", "",
    "## Certificate of service", "",
    "The records this packet is built from state a service requirement for the court stage, in these words:", "",
    `> ${service.sentence}`, "",
    "A certificate of service is a short signed statement, filed together with the petition, saying who you gave a copy of it to and how. It is required on this route, and this packet does not contain one: the components here are the FDLE application, the petition, the proposed order, and these instructions.", "",
    "What the records do not settle is who must be served and by what method. They name no recipient and no method for this route, and this packet will not guess at either. Ask the clerk in the circuit of arrest who must be served and in what form, then prepare the certificate and file it with the petition. That this packet contains no certificate of service does not mean none is owed."
  );
  out.push(
    "", "## Protected fields", "",
    "Do not pre-sign or pre-date the FDLE application, fingerprint card, or petition. The notary or deputy clerk completes the acknowledgment. The fingerprinting official completes the official signature, ORI/stamp, and impressions. The State Attorney or Statewide Prosecutor completes all of the written certified statement below the applicant identity row. The judge completes the decision, order date, and judicial signature.", "",
    `Route: ${ROUTE_KEY}`, ""
  );
  return out.join("\n");
}

function assertGuidanceRequirements(instructions, requirements) {
  const requiredText = [
    "ordinary declaration and signature line printed on the petition is not the required sworn affidavit",
    "complete a separate sworn affidavit",
    "notarized unless you swear it before a deputy clerk",
    "Obtain the currently accepted affidavit format from the circuit clerk or an attorney before filing",
    "clerk of the court that sealed the record for a certified copy of the sealing order",
    "Compare your answer to \"On what date was the record sealed by court order?\" against that certified copy, and correct the packet if they disagree",
    "any hearing is required or set"
  ];
  for (const phrase of requiredText) assert.ok(instructions.includes(phrase),
    `participant instructions omit held requirement: ${phrase}`);
  assert.equal(requirements.hearingStop, "Any hearing.");
  return { requiredStatements: requiredText.length, hearingStop: requirements.hearingStop };
}

function reconcileProductWiring(canonicalSha256) {
  const rel = `${OUT}/product-wiring.json`;
  const wiring = readRepoJson(rel);
  const previousBinding = structuredClone(wiring.binding);
  const nextBinding = { ...structuredClone(previousBinding), acceptanceReceipt: null };
  carryForwardGovernance(previousBinding, nextBinding, { canonicalSha256 });
  wiring.binding = nextBinding;
  for (const component of wiring.proposedRepresentation?.components ?? []) {
    if (component.file === `${OUT}/fixtures/canonical.pdf`) component.sha256 = canonicalSha256;
  }
  writeJson(rel, wiring);
}

async function inspectCurrentBuild(source, fieldMaps, requirements) {
  const instructionsPath = path.join(ROOT, OUT, "participant-instructions.md");
  assert.ok(fs.existsSync(instructionsPath), "current participant instructions are absent");
  const instructions = fs.readFileSync(instructionsPath, "utf8");
  const guidance = assertGuidanceRequirements(instructions, requirements);
  const receipt = readRepoJson(`${OUT}/source-receipt.json`);
  assert.equal(receipt.mountedReadOnlySource?.custodyPath, DEFAULT_SOURCE,
    "source receipt must use the repository-reproducible governed custody path");
  assert.equal(receipt.mountedReadOnlySource?.sha256, EXPECTED_SOURCE_SHA256);
  assert.equal(receipt.mountedReadOnlySource?.byteLength, EXPECTED_SOURCE_LENGTH);
  assert.equal(sha256(source), EXPECTED_SOURCE_SHA256);

  const fieldMap = readRepoJson(`${OUT}/production-field-map.json`);
  assert.deepEqual(fieldMap.sourceMeasuredPlacements, SOURCE_PLACEMENTS,
    "production field map does not preserve the measured source placements");
  assert.deepEqual(fieldMap.sourceWriteBoxes, SOURCE_WRITE_BOXES,
    "production field map does not preserve every declared source write box");
  assert.deepEqual(fieldMap.courtStagePrerequisites, requirements,
    "production field map does not preserve the held court-stage prerequisites");
  assert.deepEqual(fieldMap.componentSet, COMPONENTS);
  const expectedMapCount = fieldMaps.reduce((sum, map) => sum + map.canonicalWrites.length, 0);
  assert.equal(fieldMap.maps.reduce((sum, map) => sum + map.canonicalWrites.length, 0), expectedMapCount);

  const rendered = readRepoJson(`${OUT}/reports/rendered-artifacts.json`);
  const actualWrites = readRepoJson(`${OUT}/reports/actual-writes.json`);
  assert.equal(rendered.artifacts.length, 2);
  const artifactResults = [];
  for (const fixtureName of ["canonical", "boundary"]) {
    const artifact = rendered.artifacts.find(entry => entry.fixture === fixtureName);
    assert.ok(artifact, `rendered artifact declaration missing ${fixtureName}`);
    const expectedFile = `${OUT}/fixtures/${fixtureName}.pdf`;
    assert.equal(artifact.file, expectedFile);
    const bytes = fs.readFileSync(path.join(ROOT, expectedFile));
    assert.equal(artifact.sha256, sha256(bytes), `${fixtureName} PDF hash declaration is stale`);
    assert.equal(artifact.byteLength, bytes.length, `${fixtureName} PDF length declaration is stale`);
    assert.equal(artifact.pageCount, 8, `${fixtureName} PDF must have eight pages`);
    assert.equal(artifact.pageManifest.length, 8, `${fixtureName} page manifest must cover every page`);
    assert.deepEqual(artifact.pageManifest.slice(0, 6).map(page => page.component), Array(6).fill(SOURCE_ID));
    assert.deepEqual(artifact.pageManifest.slice(0, 6).map(page => page.sourcePage), [1, 2, 3, 4, 5, 6]);
    assert.ok(artifact.pageManifest.slice(0, 6).every(page => page.sourceSha256 === EXPECTED_SOURCE_SHA256));
    assert.deepEqual(artifact.pageManifest.slice(6).map(page => page.component), [PETITION_ID, ORDER_ID]);
    await assertOfficialOverlayPlacements(bytes, FIXTURES[fixtureName]);
    const measurement = await measureSourceOutputDifference(source, bytes, FIXTURES[fixtureName], fieldMaps);
    assertSourceOutputMeasurement(measurement, expectedMapCount);
    const actualDocument = actualWrites.documents.find(entry => entry.fixture === fixtureName);
    const actualArtifact = actualWrites.artifacts.find(entry => entry.fixture === fixtureName);
    assert.ok(actualDocument && actualArtifact, `actual-writes report missing ${fixtureName}`);
    assert.deepEqual(actualDocument.sourceOutputDifferenceMeasurement, measurement,
      `${fixtureName} detailed source/output measurement is stale`);
    for (const key of ["addedGlyphsReadFromOutputBytes", "flattenedWidgetAppearancesReadFromOutputBytes",
      "nonWhitespaceGlyphsOutsideMeasuredWriteBoxes"]) {
      assert.equal(actualDocument[key], measurement[key], `${fixtureName} ${key} is stale`);
      assert.equal(actualArtifact[key], measurement[key], `${fixtureName} artifact ${key} is stale`);
    }
    assert.equal(actualArtifact.declaredWritesVerifiedFromFinalBytes, expectedMapCount);
    artifactResults.push({ fixture: fixtureName, sha256: artifact.sha256, byteLength: artifact.byteLength, pageCount: 8 });
  }
  const counters = readRepoJson(`${OUT}/reports/completeness-counters.json`);
  assert.equal(counters.allNineZero, true);
  assert.ok(PASS_COUNTERS.every(counter => counters.counters?.[counter] === 0));
  const blanks = readRepoJson(`${OUT}/reports/blanks-left-for-the-participant.json`);
  assert.equal(blanks.everyRequiredBeforeFilingItemIsDisclosed, true);
  assert.deepEqual(blanks.courtStagePrerequisites, requirements);
  const wiring = readRepoJson(`${OUT}/product-wiring.json`);
  const canonical = artifactResults.find(artifact => artifact.fixture === "canonical").sha256;
  assert.equal(wiring.binding?.acceptanceReceipt, null,
    "the superseded raster receipt must not claim the repaired canonical bytes");
  assert.ok(wiring.binding?.acceptanceReceiptWithdrawn?.some(entry =>
    entry.withdrawnReceipt?.workflowRunId === "33923497915"
    && entry.withdrawnReceipt?.boundToCanonicalSha256 === "705c4d23dbcef3ec16e4730387bf533f2cae7c022d0d4768ef77271f45f17f43"),
  "the prior exact raster receipt must remain as historical evidence");
  assert.ok((wiring.proposedRepresentation?.components ?? []).every(component => component.sha256 === canonical),
    "product wiring proposed-component hashes must identify the repaired canonical bytes");
  return { artifacts: artifactResults, sourceSha256: EXPECTED_SOURCE_SHA256, guidance };
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
    const measurement = artifact.byteMeasurement;
    const visible = [measurement.addedGlyphsReadFromOutputBytes,
      measurement.flattenedWidgetAppearancesReadFromOutputBytes]
      .filter(value => typeof value === "number").reduce((sum, value) => sum + value, 0);
    if (artifact.actualWrites.length > 0 && visible === 0) note("invisibleWrites", { fixture: artifact.fixture });
    if (measurement.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes > 0) note("visualDefects", {
      fixture: artifact.fixture,
      glyphsOutsideMeasuredBoxes: measurement.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes
    });
  }
  return { counters, findings, ledger };
}

async function run(argv = process.argv.slice(2)) {
  process.chdir(ROOT);
  const { custodyPath, bytes } = sourceBytes();
  const fieldMaps = maps();
  const requirements = courtStageRequirements();
  if (argv.includes("--check")) {
    const inspected = await inspectCurrentBuild(bytes, fieldMaps, requirements);
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY", sourceSha256: sha256(bytes), sourceByteLength: bytes.length,
      components: COMPONENTS, writes: fieldMaps.reduce((n, map) => n + map.canonicalWrites.length, 0),
      blanks: fieldMaps.reduce((n, map) => n + map.canonicalRefusals.length, 0),
      artifactsInspected: inspected.artifacts, requiredCourtStageActionsInspected: 4,
      selfHelpStopInspected: requirements.hearingStop, wroteFiles: 0
    };
  }
  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  const artifacts = [];
  for (const fixtureName of ["canonical", "boundary"]) {
    artifacts.push(await assembleFixture(bytes, fixtureName, FIXTURES[fixtureName], fieldMaps));
  }
  const rbf = requiredBeforeFiling(fieldMaps);
  const instructions = participantInstructions(rbf, serviceRequirement(), requirements);
  assertGuidanceRequirements(instructions, requirements);
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
    bindingMethod: "the exact held FDLE byte is read directly from governed repository custody; no acquisition, copy, research, or substitution",
    allSourcesExact: true, routeKeys: [ROUTE_KEY], sourceBinaryCommitted: true,
    mountedReadOnlySource: { documentId: SOURCE_ID, sourceId: `official-form:${SOURCE_ID}`, custodyPath, sha256: EXPECTED_SOURCE_SHA256, byteLength: EXPECTED_SOURCE_LENGTH },
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
    sourceMeasuredPlacements: SOURCE_PLACEMENTS,
    sourceWriteBoxes: SOURCE_WRITE_BOXES,
    courtStagePrerequisites: requirements,
    selfHelpStopConditions: [requirements.hearingStop],
    maps: fieldMaps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });
  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID,
    renderedFresh: true, derivedFromBytes: true, componentSet: COMPONENTS,
    pdfs: artifacts.map((a) => ({ file: a.file, documentId: "assembled_packet", role: "assembled_packet", fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    artifacts: artifacts.map(({ actualWrites, declaredValueNonWhitespaceCharacters, byteMeasurement, ...artifact }) => artifact),
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: false, byteDerivedHashes: true, rasterEngine: null,
    rasterSkipped: true, rasterPages: [], independentVerificationPending: true
  });
  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    note: "Every reported value was extracted from its final component; each affected flat-source write was also verified at its exact measured placement, including the phone segments around the source-printed parentheses.",
    documents: artifacts.map((a) => ({
      fixture: a.fixture, valuesReportedByFinalizer: a.actualWrites.length,
      declaredValueNonWhitespaceCharacters: a.declaredValueNonWhitespaceCharacters,
      addedGlyphsReadFromOutputBytes: a.byteMeasurement.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: a.byteMeasurement.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: a.byteMeasurement.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: [],
      refusedFieldInkMeasurement: "Every added source-page text run was consumed by a declared write box; no added run remained for a refused source field. The saved composed output contains only the authored blank labels and lines for protected fields.",
      sourceOutputDifferenceMeasurement: a.byteMeasurement,
      actualWrites: a.actualWrites
    })),
    artifacts: artifacts.map((a) => ({
      fixture: a.fixture, valuesReportedByFinalizer: a.actualWrites.length,
      addedGlyphsReadFromOutputBytes: a.byteMeasurement.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: a.byteMeasurement.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: a.byteMeasurement.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: [],
      measurementMethod: a.byteMeasurement.method,
      sourcePagesCompared: a.byteMeasurement.sourcePagesCompared,
      sourceBoundDeclaredWrites: a.byteMeasurement.sourceBoundDeclaredWrites,
      composedDeclaredWritesVerifiedFromFinalBytes: a.byteMeasurement.composedDeclaredWrites,
      declaredWritesVerifiedFromFinalBytes: a.byteMeasurement.declaredWritesVerifiedFromFinalBytes,
      addedTextRunsReadFromOutputBytes: a.byteMeasurement.addedTextRunsReadFromOutputBytes,
      widgetMeasurement: a.byteMeasurement.widgetMeasurement
    })), blockingFindings: []
  });
  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    courtStagePrerequisites: requirements,
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
      { finding: "The State Attorney certified-statement body, fingerprint-official fields, signatures, notarization, and judicial order fields are protected.", consequence: "The build leaves them blank and participant instructions name the completion owner." },
      { finding: requirements.swornAffidavit, consequence: "The instructions distinguish the petition declaration from the separately required sworn court-stage affidavit and preserve the four-component packet." },
      { finding: requirements.obtainCertifiedSealingOrder, consequence: requirements.compareAndCorrectSealingDate },
      { finding: requirements.hearingStop, consequence: "The participant instructions require an attorney-review stop when a hearing is required or set." }
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
  reconcileProductWiring(artifacts.find(artifact => artifact.fixture === "canonical").sha256);
  await inspectCurrentBuild(bytes, fieldMaps, requirements);
  return {
    familyId: FAMILY_ID, status: "COMPLETED", counters: counted.counters,
    directory: OUT, implementationStrategy: "official_pdf_fill", components: COMPONENTS,
    writes: fieldMaps.reduce((n, map) => n + map.canonicalWrites.length, 0),
    requiredBeforeFiling: rbf.length, requiredCourtStageActions: 4,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, byteLength: a.byteLength, pages: a.pageCount })),
    rasterState: "BUILT_RASTER_PENDING", nineCountersZero: true,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  run().then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error); process.exit(1); });
}

export {
  DEFAULT_SOURCE, EXPECTED_SOURCE_LENGTH, EXPECTED_SOURCE_SHA256, FIXTURES, OUT,
  SOURCE_PLACEMENTS, SOURCE_WRITE_BOXES, assertGuidanceRequirements, assertHeldNameParts,
  assertOfficialOverlayPlacements, assertPlacementItems, assertSourceOutputMeasurement,
  certifiedStatementName, courtStageRequirements, inspectCurrentBuild, joinedLegalName,
  maps, measureSourceOutputDifference, participantInstructions, run, sourceBytes
};
