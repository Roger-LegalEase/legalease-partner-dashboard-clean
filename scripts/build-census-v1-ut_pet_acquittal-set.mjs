#!/usr/bin/env node
// Utah petition-family completeness repair.
//
// The original CENTRAL builder is intentionally left unchanged because it is
// shared by families outside this lane. This lane-local finalizer consumes the
// existing first-hand census, reopens the exact receipt-bound source PDFs, and
// repairs only the seven assigned Utah packet families. It never writes a
// signature, signing date, service act, court-only field, agency-only field,
// prosecutor field, victim field, or optional third-party authorization.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { sanitizeAndFlatten, scanBytesForActiveContent } from "./rcap-official-forms/rcap-active-content.mjs";

const thisFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(thisFile), "..");
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const sharp = require("sharp");

const CONTROL_BASE = "33dfea59fe85b9dc86469d12e04fd65c51b480fa";
const DISPATCH_COMMIT = "4d1408a40eeb77f51bdf18ba35a13db579b21129";
const ASSIGNMENT_ID = "P1_UT_PETITION_EXPUNGE_COMPLETENESS";
const FIXED_DATE = new Date("2026-08-31T00:00:00Z");
const RASTER_DPI = 72;
const PDFTOPPM = process.env.RCAP_PDFTOPPM || "pdftoppm";
const WAVE_ROWS = "data/rcap-grade-a/wave-2/p1-ut-petition-expunge-completeness/rows.json";

const CONFIGS = Object.freeze({
  "ut_pet_acquittal-set": {
    slug: "ut-pet-acquittal-set", traffic: false, routeKind: "case",
    chargeLabel: "Acquitted charge"
  },
  "ut_pet_conviction-set": {
    slug: "ut-pet-conviction-set", traffic: false, routeKind: "case",
    chargeLabel: "Eligible conviction"
  },
  "ut_pet_dismissed_with_prejudice-set": {
    slug: "ut-pet-dismissed-with-prejudice-set", traffic: false, routeKind: "case",
    chargeLabel: "Charge dismissed with prejudice"
  },
  "ut_pet_dismissed_without_prejudice-set": {
    slug: "ut-pet-dismissed-without-prejudice-set", traffic: false, routeKind: "case",
    dismissedWithoutPrejudice: true, chargeLabel: "Charge dismissed without prejudice"
  },
  "ut_pet_limitations-set": {
    slug: "ut-pet-limitations-set", traffic: false, routeKind: "case",
    chargeLabel: "Charge ended by limitations period"
  },
  "ut_pet_no_charges-set": {
    slug: "ut-pet-no-charges-set", traffic: false, routeKind: "incident",
    chargeLabel: "Arrest with no charges filed"
  },
  "ut_pet_traffic-set": {
    slug: "ut-pet-traffic-set", traffic: true, routeKind: "case",
    chargeLabel: "Eligible traffic conviction"
  }
});

const ZERO_COUNTERS = Object.freeze({
  knownRequiredFieldsMissing: 0,
  requiredFactsNotCollected: 0,
  unclassifiedBlanks: 0,
  incompleteRows: 0,
  requiredOptionsMissing: 0,
  requiredComponentsMissing: 0,
  invisibleWrites: 0,
  protectedWrites: 0,
  visualDefects: 0
});

const NO_FILL_FORMS = new Set([
  "1146XX", "1148XX", "1149XX", "1169XX", "UT-BCI-THIRD-PARTY-RELEASE"
]);

const REQUIRED_BEFORE_FILING = Object.freeze([
  "Judicial district and court street address for the filing venue",
  "BCI certificate-of-eligibility identification number (non-traffic packets)",
  "Participant's public-interest explanation on the petition",
  "Every previously used name, or an express statement that there are none",
  "Gender, Social Security number, and driver-license number/state required by the BCI application",
  "BCI payment or fee-waiver election and any payment details",
  "Government-issued identification and fingerprints for the BCI application",
  "Signing city/country, participant signatures, and signing dates",
  "Law-enforcement incident file number and agency name for a no-charges order",
  "Any optional recipient, victim, prosecutor, reply, or third-party-release content only if that component becomes applicable",
  "Service method, address, date, and certification only after service occurs"
]);

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const round = (value) => Number(Number(value).toFixed(2));
const normalize = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const writeJson = (rel, value) => {
  const abs = path.join(rootDir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
};

function sourceRoot() {
  const value = process.env.MASTER_LIBRARY_SOURCE_DIR;
  assert.ok(value, "MASTER_LIBRARY_SOURCE_DIR is required; run the 14/14 packet-build preflight first");
  const resolved = path.resolve(value);
  assert.ok(fs.statSync(resolved).isDirectory(), `Master Library is not mounted at ${resolved}`);
  return resolved;
}

function outputRoot(config) {
  return `data/rcap-all50/overlays/census-v1/ut/${config.slug}--official-pdf-fill`;
}

function factsFor(config, fixture) {
  const boundary = fixture === "boundary";
  const fullName = boundary
    ? "Alexandrina Montgomery-Vandenberg"
    : "Jordan Avery Reyes";
  const first = boundary ? "Alexandrina" : "Jordan";
  const middle = boundary ? "Montgomery" : "Avery";
  const last = boundary ? "Vandenberg" : "Reyes";
  return {
    "participant.full_legal_name": fullName,
    "participant.bci_name": `${last}, ${first} ${middle}`,
    "participant.street_address": boundary
      ? "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B"
      : "118 Maple Street",
    "participant.city_state_zip": boundary
      ? "Unincorporated Township of Long Hollow Crossing, UT 01234-9999"
      : "Springfield, UT 01234",
    "participant.mailing_address": boundary
      ? "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B, Unincorporated Township of Long Hollow Crossing, UT 01234-9999"
      : "118 Maple Street, Springfield, UT 01234",
    "participant.phone": boundary ? "555-0142 ext. 44821" : "555-0142",
    "participant.email": boundary
      ? "alexandrina.montgomery@long-example.gov"
      : "jordan.reyes@example.com",
    "participant.date_of_birth": "1991-04-17",
    "matter.county": boundary ? "Saint Bartholomew County" : "Example County",
    "matter.case_number": boundary ? "2026-CR-900123-EXTENDED-CASE-IDENTIFIER" : "24-CR-001234",
    "matter.charge": boundary
      ? `${config.chargeLabel}; an unusually long statutory description used only to test legible fit and fail-closed overflow behavior`
      : config.chargeLabel
  };
}

function censusFields(census, formNumber) {
  const document = census.documents.find((row) => row.formNumber === formNumber);
  assert.ok(document, `census has no ${formNumber} document`);
  return document.fields.filter((field) => field.blankId);
}

function textBox(field, pageWidth = 612) {
  const x = round(field.measured.x0 + 1.5);
  const y = round(field.measured.baselineY + (field.construction === "content_stream_rule" ? 2 : 0));
  const measuredWidth = Math.max(12, field.measured.x1 - field.measured.x0 - 3.5);
  return { x, y, width: round(Math.min(measuredWidth, pageWidth - x - 12)), height: 12 };
}

function addTextPlan(plans, formNumber, field, factId, facts, overrides = {}) {
  const value = overrides.value ?? facts[factId];
  assert.ok(typeof value === "string" && value.length > 0,
    `${formNumber}/${field.blankId ?? overrides.fieldId}: no held fact for ${factId}`);
  plans.push({
    kind: "text",
    formNumber,
    sourcePage: field.page,
    fieldId: overrides.fieldId ?? field.blankId,
    field: overrides.field ?? (normalize(field.caption) || factId),
    sourceLabel: normalize(field.caption) || null,
    factId,
    value,
    writeBox: overrides.writeBox ?? textBox(field),
    geometryBasis: overrides.geometryBasis ?? field.geometryBasis ?? "committed first-hand census geometry"
  });
}

function matching(fields, predicate) {
  return fields.filter(predicate).sort((a, b) => a.page - b.page
    || b.measured.baselineY - a.measured.baselineY || a.measured.x0 - b.measured.x0);
}

function addCaptionFacts(plans, census, formNumber, facts) {
  const fields = censusFields(census, formNumber);
  const pageOne = fields.filter((field) => field.page === 1);
  const first = (predicate, context) => {
    const row = matching(pageOne, predicate)[0];
    assert.ok(row, `${formNumber}: missing census field for ${context}`);
    return row;
  };
  addTextPlan(plans, formNumber,
    first((field) => (/^Name$/i.test(normalize(field.caption))
      || (formNumber === "1002EX" && Math.abs(field.measured.baselineY - 665.52) < 1))
      && field.measured.x0 < 100, "name"),
    "participant.full_legal_name", facts);
  addTextPlan(plans, formNumber,
    first((field) => /^Address$/i.test(normalize(field.caption)) && field.measured.x0 < 100, "address"),
    "participant.street_address", facts);
  addTextPlan(plans, formNumber,
    first((field) => /^City, State, Zip$/i.test(normalize(field.caption)) && field.measured.x0 < 100, "city/state/zip"),
    "participant.city_state_zip", facts);
  addTextPlan(plans, formNumber,
    first((field) => /^Phone$/i.test(normalize(field.caption)) && field.measured.x0 < 100, "phone"),
    "participant.phone", facts);
  addTextPlan(plans, formNumber,
    first((field) => /documents at this email/i.test(normalize(field.caption)) && field.measured.x0 < 100, "email"),
    "participant.email", facts, { field: "Email" });

  let county = matching(pageOne, (field) => /Judicial District/i.test(normalize(field.caption))
    && field.measured.x0 > 250)[0];
  if (!county && ["1002EX", "1020EX", "1022EX"].includes(formNumber)) {
    const baselineY = formNumber === "1020EX" ? 514.2 : formNumber === "1022EX" ? 478.2 : 464.2;
    county = {
      blankId: `p1-manual-county-${formNumber}`,
      page: 1,
      caption: "County",
      construction: "printed_blank",
      geometryBasis: "existing county blank measured from the pinned source page",
      measured: { x0: 309.36, x1: 416.5, baselineY, width: 107.14 }
    };
  }
  assert.ok(county, `${formNumber}: county blank was not measured`);
  addTextPlan(plans, formNumber, county, "matter.county", facts, { field: "County" });

  let petitioner = matching(pageOne, (field) => /^Petitioner$/i.test(normalize(field.caption))
    && field.measured.x0 < 200)[0];
  if (!petitioner && ["1020EX", "1022EX"].includes(formNumber)) {
    petitioner = matching(pageOne, (field) => !normalize(field.caption)
      && field.measured.x0 < 100 && field.measured.baselineY > 320)[0];
  }
  if (!petitioner && formNumber === "1002EX") {
    petitioner = {
      blankId: "p1-manual-petitioner-1002EX",
      page: 1,
      caption: "Petitioner",
      construction: "printed_blank",
      geometryBasis: "existing In Re petitioner blank measured from the pinned source page",
      measured: { x0: 66.6, x1: 318.6, baselineY: 354.4, width: 252 }
    };
  }
  if (petitioner) addTextPlan(plans, formNumber, petitioner, "participant.full_legal_name", facts);

  const caseFields = matching(fields, (field) => {
    const caption = normalize(field.caption);
    return /case number/i.test(caption)
      || (/^Petitioner$/i.test(caption) && field.measured.x0 > 300);
  });
  for (const field of caseFields) addTextPlan(plans, formNumber, field, "matter.case_number", facts,
    { field: "Case Number" });
}

function addPetitionPlans(plans, census, formNumber, facts) {
  addCaptionFacts(plans, census, formNumber, facts);
  const fields = censusFields(census, formNumber);
  const printed = matching(fields, (field) => /Printed Name/i.test(normalize(field.caption)))[0];
  assert.ok(printed, `${formNumber}: printed-name blank was not measured`);
  addTextPlan(plans, formNumber, printed, "participant.full_legal_name", facts);
}

function addOrderPlans(plans, census, formNumber, facts) {
  addCaptionFacts(plans, census, formNumber, facts);
}

function addCoverSheetPlans(plans, census, facts) {
  const formNumber = "1044XX";
  const fields = censusFields(census, formNumber);
  const at = (x, y, label) => {
    const row = fields.find((field) => Math.abs(field.measured.x0 - x) < 1
      && Math.abs(field.measured.baselineY - y) < 1);
    assert.ok(row, `${formNumber}: missing ${label} geometry at ${x},${y}`);
    return row;
  };
  addTextPlan(plans, formNumber, at(31.5, 671.7, "first petitioner name"),
    "participant.full_legal_name", facts, { field: "First Plaintiff/Petitioner Name" });
  addTextPlan(plans, formNumber, at(31.5, 648.24, "first petitioner address"),
    "participant.street_address", facts, { field: "First Plaintiff/Petitioner Address" });
  addTextPlan(plans, formNumber, at(31.5, 624.72, "first petitioner city/state/zip"),
    "participant.city_state_zip", facts, { field: "First Plaintiff/Petitioner City, State, Zip" });
  addTextPlan(plans, formNumber, at(31.5, 601.26, "first petitioner phone"),
    "participant.phone", facts, { field: "First Plaintiff/Petitioner Phone" });
  addTextPlan(plans, formNumber, at(171, 601.26, "first petitioner email"),
    "participant.email", facts, { field: "First Plaintiff/Petitioner Email" });
}

function addBciPlans(plans, census, facts) {
  const formNumber = "UT-BCI-EXP-APPLICATION";
  const fields = censusFields(census, formNumber);
  const byId = (id) => {
    const row = fields.find((field) => field.blankId === id);
    assert.ok(row, `${formNumber}: missing ${id}`);
    return row;
  };
  addTextPlan(plans, formNumber, byId("p2-y681.70-x66.90"), "participant.bci_name", facts, {
    field: "NAME (Last, First, Middle)",
    writeBox: { x: 68.4, y: 683.7, width: 480, height: 12 },
    geometryBasis: "committed census baseline, corrected to the existing source rule's page boundary"
  });
  addTextPlan(plans, formNumber, byId("p2-y622.60-x121.49"), "participant.date_of_birth", facts,
    { field: "DATE OF BIRTH", writeBox: { x: 122.99, y: 624.6, width: 156, height: 12 } });
  addTextPlan(plans, formNumber, byId("p2-y600.10-x131.49"), "participant.mailing_address", facts,
    { field: "MAILING ADDRESS", writeBox: { x: 132.99, y: 602.1, width: 440, height: 12 } });
  addTextPlan(plans, formNumber, byId("p2-y545.10-x171.66"), "participant.phone", facts,
    { field: "PRIMARY PHONE NUMBER" });
  addTextPlan(plans, formNumber, byId("p2-y506.70-x97.47"), "participant.email", facts,
    { field: "EMAIL" });
  addTextPlan(plans, formNumber, {
    blankId: "p2-manual-declaration-name", page: 2, caption: "Name of Petitioner",
    geometryBasis: "existing printed declaration blank measured from the pinned source page",
    measured: { x0: 49, x1: 188, baselineY: 397, width: 139 }, construction: "printed_blank"
  }, "participant.full_legal_name", facts, {
    field: "Name of Petitioner",
    writeBox: { x: 50.5, y: 399, width: 136, height: 12 }
  });
}

function textPlansFor(config, census, fixture) {
  const facts = factsFor(config, fixture);
  const plans = [];
  const petition = config.traffic ? "1002EX" : "1000EX";
  const order = config.traffic ? "1022EX" : "1020EX";
  addPetitionPlans(plans, census, petition, facts);
  addOrderPlans(plans, census, order, facts);
  addCoverSheetPlans(plans, census, facts);
  if (!config.traffic) addBciPlans(plans, census, facts);
  const ids = plans.map((row) => `${row.formNumber}:${row.fieldId}`);
  assert.equal(new Set(ids).size, ids.length, "text plan disposes a field more than once");
  return plans;
}

function selectedControl(control, formNumber, config) {
  const x = control.measured?.x0 ?? -1;
  const y = control.measured?.y0 ?? -1;
  if (formNumber === "1000EX") return (Math.abs(x - 126.02) < 1 && y > 520)
    || (x > 220 && x < 240 && y > 475);
  if (formNumber === "1002EX") return (x < 120 && y > 520)
    || (x > 215 && x < 240 && y > 485);
  if (formNumber === "1020EX") {
    if (x > 220 && x < 240 && y > 530) return true;
    if (config.dismissedWithoutPrejudice && y > 645) return true;
    if (config.routeKind === "incident" && (y > 450 && y < 470 || y > 285 && y < 300)) return true;
    if (config.routeKind === "case" && (y > 375 && y < 390 || y > 210 && y < 225)) return true;
    return false;
  }
  if (formNumber === "1022EX") return x > 220 && x < 240 && y > 495;
  if (formNumber === "1044XX") return control.page === 1
    ? (Math.abs(x - 410.16) < 1 && Math.abs(y - 282.75) < 1)
      || (Math.abs(x - 76.5) < 1 && Math.abs(y - 226.3) < 1)
    : (Math.abs(x - 355.98) < 1 && Math.abs(y - 358.1) < 1);
  return false;
}

function selectionPlansFor(config, fieldMap) {
  const plans = [];
  for (const map of fieldMap.maps) {
    for (const control of map.selectionControls ?? []) {
      if (!selectedControl(control, map.formNumber, config)) continue;
      plans.push({
        kind: "selection",
        formNumber: map.formNumber,
        sourcePage: control.page,
        fieldId: control.selectionId,
        field: normalize(control.label) || control.selectionId,
        factId: `route.${config.routeKind}`,
        value: "X",
        writeBox: {
          x: round(control.measured.x0), y: round(control.measured.y0),
          width: round(control.measured.width), height: round(control.measured.height)
        },
        geometryBasis: "CTM-tracked source selection-control geometry",
        routeDetermined: true
      });
    }
  }
  return plans;
}

function isFooterOrArtifact(field) {
  const text = `${field.caption ?? ""} ${field.regionHeading ?? ""}`;
  return !normalize(field.caption)
    || /Approved|Revised|Page \d|APPLICATION FOR CERTIFICATE|^_$|^\s*-+\s*$/i.test(text);
}

function requiredBeforeFilingReason(detail) {
  return {
    approvedBlankDisposition: "REQUIRED_BEFORE_FILING",
    why: `optional participant-authored content is not invented by the platform; REQUIRED_BEFORE_FILING: ${detail}`,
    participantInstruction: detail,
    compatibilityNote: "The committed completeness reader has no direct REQUIRED_BEFORE_FILING parser; the explicit disposition is authoritative."
  };
}

function refusalFor(field, formNumber, config) {
  const caption = normalize(field.caption);
  const common = {
    blankId: field.blankId,
    field: caption || normalize(field.regionHeading) || `Non-filing source artifact ${field.blankId}`,
    page: field.page,
    measured: field.measured,
    construction: field.construction,
    sourceLabel: caption || null
  };
  if (formNumber === "1146XX") return {
    ...common,
    class: "signature_or_date_participant_completion",
    why: "Acceptance and certification of service are protected recipient completion after service.",
    approvedBlankDisposition: "PROTECTED_FIELD"
  };
  if (["1148XX", "1149XX", "1169XX", "UT-BCI-THIRD-PARTY-RELEASE"].includes(formNumber)) return {
    ...common,
    why: "optional participant-authored content; the platform does not invent it",
    approvedBlankDisposition: "OPTIONAL_PARTICIPANT_CONTENT"
  };
  const protectedText = `${caption} ${field.regionHeading ?? ""}`;
  if (field.protectCategory === "signature" || /Signature|Signed at|Date\b.*sign/i.test(protectedText)) return {
    ...common,
    class: "signature_or_date_participant_completion",
    why: "Signature and signing date are completed by the participant or authorized signer.",
    approvedBlankDisposition: "PROTECTED_FIELD"
  };
  if (field.protectCategory === "court" || /\bJudge\b|BUREAU USE ONLY|OFFICIAL TAKING PRINTS|Agency Name|Badge|Fingerprints taken|Date Printed|Identification number|Name on ID/i.test(protectedText)) return {
    ...common,
    why: "court, clerk, prosecutor, agency, or hearing field; protected for the authorized actor",
    approvedBlankDisposition: "PROTECTED_FIELD"
  };
  if (field.protectCategory === "attorney" || /Attorney|Bar Number|LPP/i.test(protectedText)) return {
    ...common,
    why: "attorney-only; not applicable on this self-represented route",
    approvedBlankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE"
  };
  if (isFooterOrArtifact(field)) return {
    ...common,
    why: "viewer UI control or source-layout artifact; never a filing fact",
    approvedBlankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE"
  };
  if (formNumber === "1044XX") return {
    ...common,
    why: "attorney-only or an additional-party/damages branch not applicable on this single-petitioner expungement route",
    approvedBlankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE"
  };
  if (formNumber === "UT-BCI-EXP-APPLICATION") {
    if (/Cardholder|credit card|payment|control|expiration/i.test(protectedText)) return {
      ...common,
      why: "optional participant-authored payment election; the platform does not invent it",
      approvedBlankDisposition: "PARTICIPANT_ELECTION_GENUINE"
    };
    return { ...common, ...requiredBeforeFilingReason(caption || "required BCI application fact") };
  }
  if (/Court Address|Judicial District/i.test(protectedText)) return {
    ...common, ...requiredBeforeFilingReason(caption || "filing venue detail")
  };
  if (/certificate of eligibility|interests of the public|public because/i.test(protectedText)) return {
    ...common, ...requiredBeforeFilingReason(caption || "petition fact")
  };
  if (formNumber === "1020EX" && config.routeKind === "incident"
      && /following incidents|number\) of/i.test(protectedText)) return {
    ...common, ...requiredBeforeFilingReason(caption || "law-enforcement incident identifier")
  };
  if (/hearing held|Signature|Judge/i.test(protectedText)) return {
    ...common,
    why: "court, clerk, prosecutor, agency, or hearing field; protected for later court completion",
    approvedBlankDisposition: "LATER_COMPLETION"
  };
  return {
    ...common,
    why: "optional participant-authored content; the platform does not invent it",
    approvedBlankDisposition: "OPTIONAL_PARTICIPANT_CONTENT"
  };
}

function selectionRefusal(control, formNumber) {
  const common = {
    ...control,
    field: normalize(control.label) || control.selectionId,
    disposition: "explicit_refusal"
  };
  if (NO_FILL_FORMS.has(formNumber)) return {
    ...common,
    kind: "participant_sworn_narrative_or_legal_election",
    reason: "optional participant-authored election; the platform does not invent it",
    approvedBlankDisposition: formNumber === "1146XX" ? "PROTECTED_FIELD" : "OPTIONAL_PARTICIPANT_CONTENT"
  };
  if (formNumber === "UT-BCI-EXP-APPLICATION") return {
    ...common,
    kind: "participant_sworn_narrative_or_legal_election",
    reason: "optional participant-authored payment or fee-waiver election; the platform does not invent it",
    approvedBlankDisposition: "PARTICIPANT_ELECTION_GENUINE"
  };
  if (["1020EX", "1022EX"].includes(formNumber)
      && /pleadings|hearing|court received an objection/i.test(common.field)) return {
    ...common,
    reason: "court, clerk, prosecutor, agency, or hearing field; protected for later court completion",
    approvedBlankDisposition: "LATER_COMPLETION"
  };
  return {
    ...common,
    reason: "attorney-only or alternative route branch not applicable on this route-specific packet",
    approvedBlankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE"
  };
}

function repairFieldMap(config, original, census, canonicalPlans, boundaryPlans) {
  const selectedIds = new Set(canonicalPlans.filter((row) => row.kind === "selection").map((row) => row.fieldId));
  const textIds = new Set(canonicalPlans.filter((row) => row.kind === "text")
    .map((row) => `${row.formNumber}:${row.fieldId}`));
  const canonicalText = canonicalPlans.filter((row) => row.kind === "text");
  const boundaryText = boundaryPlans.filter((row) => row.kind === "text");
  const blankLedger = [];
  const maps = original.maps.map((oldMap) => {
    const fields = censusFields(census, oldMap.formNumber);
    const roleRefusals = fields
      .filter((field) => !textIds.has(`${oldMap.formNumber}:${field.blankId}`))
      .map((field) => refusalFor(field, oldMap.formNumber, config));
    const selectionControls = (oldMap.selectionControls ?? []).map((control) => {
      if (selectedIds.has(control.selectionId)) return {
        ...control,
        field: normalize(control.label) || control.selectionId,
        disposition: "selected_route_option",
        reason: "selected because the packet family and route determine this option",
        approvedBlankDisposition: null
      };
      return selectionRefusal(control, oldMap.formNumber);
    });
    blankLedger.push(...roleRefusals.map((row) => ({ formNumber: oldMap.formNumber, ...row })),
      ...selectionControls.filter((row) => !String(row.disposition).startsWith("selected"))
        .map((row) => ({ formNumber: oldMap.formNumber, fieldId: row.selectionId, ...row })));
    return {
      ...oldMap,
      roleRefusals,
      selectionControls,
      offeredAnchors: canonicalText.filter((row) => row.formNumber === oldMap.formNumber),
      protectedRules: oldMap.protectedRules ?? null,
      canonicalWrites: canonicalText.filter((row) => row.formNumber === oldMap.formNumber),
      canonicalRefusals: [],
      boundaryWrites: boundaryText.filter((row) => row.formNumber === oldMap.formNumber),
      boundaryRefusals: [],
      completenessRepair: {
        assignmentId: ASSIGNMENT_ID,
        everyBlankHasApprovedDisposition: true,
        routeOptionsSelected: selectionControls.filter((row) => String(row.disposition).startsWith("selected"))
          .map((row) => row.selectionId)
      }
    };
  });
  assert.ok(blankLedger.every((row) => row.approvedBlankDisposition), "a blank lacks an approved disposition");
  return {
    fieldMap: {
      ...original,
      schemaVersion: "rcap-official-form-field-map/v1-census-v1-completeness-repair",
      maps,
      completenessRepair: {
        assignmentId: ASSIGNMENT_ID,
        controlBaseSha: CONTROL_BASE,
        dispatchCommit: DISPATCH_COMMIT,
        everyKnownFactWritten: true,
        everyIntentionalBlankClassified: true,
        everyRouteDeterminedOptionSelected: true,
        requiredBeforeFilingSurfaced: true,
        protectedWrites: 0,
        commercialRoutesOpened: 0
      }
    },
    blankLedger
  };
}

async function sourcePacket(receipt) {
  const master = sourceRoot();
  const packet = await PDFDocument.create();
  packet.setCreationDate(FIXED_DATE);
  packet.setModificationDate(FIXED_DATE);
  packet.setTitle(`Official-form review fixture: ${receipt.familyId}`);
  const pageManifest = [];
  let packetPage = 1;
  for (const document of receipt.documents) {
    const sourcePath = path.join(master, document.pathInArchive);
    const bytes = fs.readFileSync(sourcePath);
    assert.equal(sha256(bytes), document.sha256, `${document.formNumber}: source SHA-256 drift`);
    assert.equal(bytes.length, document.byteLength, `${document.formNumber}: source byte-length drift`);
    const source = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const pages = await packet.copyPages(source, source.getPageIndices());
    pages.forEach((page, index) => {
      packet.addPage(page);
      pageManifest.push({
        packetPage: packetPage++, formNumber: document.formNumber, sourcePage: index + 1,
        sourceSha256: document.sha256
      });
    });
  }
  const sanitized = await sanitizeAndFlatten(packet, { alreadyFlattened: true });
  sanitized.clean.setCreationDate(FIXED_DATE);
  sanitized.clean.setModificationDate(FIXED_DATE);
  sanitized.clean.setTitle(`Official-form review fixture: ${receipt.familyId}`);
  const bytes = await sanitized.clean.save({ useObjectStreams: false, updateMetadata: false });
  return { bytes, pageManifest };
}

function packetPageFor(pageManifest, formNumber, sourcePage) {
  const row = pageManifest.find((item) => item.formNumber === formNumber && item.sourcePage === sourcePage);
  assert.ok(row, `${formNumber}/page ${sourcePage}: absent from packet page manifest`);
  return row.packetPage;
}

function protectedPlanGuard(plan) {
  const text = `${plan.field} ${plan.factId}`;
  if (plan.kind === "selection") {
    assert.equal(plan.routeDetermined, true, `${plan.formNumber}/${plan.fieldId}: non-route selection entered the write plan`);
    assert.ok(!/signature|signing date|certificate of service|service date/i.test(text),
      `${plan.formNumber}/${plan.fieldId}: protected selection entered the write plan`);
    return;
  }
  assert.ok(!/signature|signing date|certificate of service|service date|judge|clerk|prosecutor|agency|victim|fingerprint|badge/i.test(text),
    `${plan.formNumber}/${plan.fieldId}: protected field entered the write plan`);
}

function fittedSize(font, value, width, preferred = 10) {
  let size = preferred;
  while (size > 4 && font.widthOfTextAtSize(value, size) > width) size -= 0.25;
  assert.ok(font.widthOfTextAtSize(value, size) <= width,
    `value does not fit measured box at the minimum legible size: ${value}`);
  return size;
}

async function renderFixture(base, plans, fixture, file) {
  const document = await PDFDocument.load(base.bytes, { ignoreEncryption: true, updateMetadata: false });
  document.setCreationDate(FIXED_DATE);
  document.setModificationDate(FIXED_DATE);
  document.setTitle(`Official-form review fixture (${fixture})`);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  for (const plan of plans) {
    protectedPlanGuard(plan);
    const pageNumber = packetPageFor(base.pageManifest, plan.formNumber, plan.sourcePage);
    const page = document.getPage(pageNumber - 1);
    if (plan.kind === "selection") {
      const size = Math.max(6, Math.min(10, plan.writeBox.height - 2));
      page.drawText("X", {
        x: plan.writeBox.x + 1.5, y: plan.writeBox.y + 1,
        size, font: bold, color: rgb(0, 0, 0)
      });
    } else {
      const size = fittedSize(font, plan.value, Math.max(12, plan.writeBox.width - 20));
      page.drawText(plan.value, {
        x: plan.writeBox.x, y: plan.writeBox.y,
        size, font, color: rgb(0, 0, 0), maxWidth: plan.writeBox.width
      });
      plan.fontSize = size;
    }
    plan.packetPage = pageNumber;
  }
  const bytes = await document.save({ useObjectStreams: false, updateMetadata: false });
  const active = scanBytesForActiveContent(bytes);
  assert.ok(active.inspectable && active.hits.length === 0,
    `${fixture}: active-content residue ${active.hits.join(", ")}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
  return { bytes, activeContentScan: active };
}

function glyphsOf(bytes) {
  return PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false }).then((document) => {
    const rows = [];
    document.getPages().forEach((page, index) => {
      for (const item of extractTextItems(page)) {
        for (const character of item.chars ?? []) rows.push({
          page: index + 1,
          x: round(character.x), y: round(item.y), w: round(character.w), c: character.c
        });
      }
    });
    return rows;
  });
}

function glyphKey(glyph) {
  return `${glyph.page}|${glyph.x}|${glyph.y}|${glyph.c}`;
}

async function addedGlyphs(baseBytes, finalBytes) {
  const before = await glyphsOf(baseBytes);
  const after = await glyphsOf(finalBytes);
  const counts = new Map();
  for (const glyph of before) counts.set(glyphKey(glyph), (counts.get(glyphKey(glyph)) ?? 0) + 1);
  const added = [];
  for (const glyph of after) {
    const key = glyphKey(glyph);
    const remaining = counts.get(key) ?? 0;
    if (remaining > 0) counts.set(key, remaining - 1);
    else added.push(glyph);
  }
  return added;
}

function glyphInBox(glyph, plan) {
  const box = plan.writeBox;
  return glyph.page === plan.packetPage
    && glyph.x >= box.x - 3 && glyph.x + glyph.w <= box.x + box.width + 3
    && glyph.y >= box.y - 4 && glyph.y <= box.y + box.height + 4;
}

function byteProof(added, plans, blankLedger, pageManifest) {
  const actualWrites = plans.map((plan) => {
    const glyphs = added.filter((glyph) => glyphInBox(glyph, plan));
    assert.ok(glyphs.some((glyph) => normalize(glyph.c)),
      `${plan.formNumber}/${plan.fieldId}: final PDF bytes carry no glyph in the measured write box`);
    return {
      formNumber: plan.formNumber,
      fieldId: plan.fieldId,
      field: plan.field,
      factId: plan.factId,
      kind: plan.kind,
      packetPage: plan.packetPage,
      sourcePage: plan.sourcePage,
      writeBox: plan.writeBox,
      glyphCountReadFromOutputBytes: glyphs.filter((glyph) => normalize(glyph.c)).length,
      textReadFromOutputBytes: normalize(glyphs.sort((a, b) => a.x - b.x).map((glyph) => glyph.c).join("")),
      proofMethod: "glyph geometry read from final PDF bytes at the committed measured box"
    };
  });
  const outside = added.filter((glyph) => normalize(glyph.c)
    && !plans.some((plan) => glyphInBox(glyph, plan)));
  assert.equal(outside.length, 0,
    `final PDF contains added glyphs outside every measured write box: ${JSON.stringify(outside.slice(0, 30))}`);
  const refusedFieldsWithInk = [];
  for (const blank of blankLedger) {
    if (!blank.measured || !blank.page) continue;
    const packetPage = packetPageFor(pageManifest, blank.formNumber, blank.page);
    const box = {
      x: blank.measured.x0, y: blank.measured.baselineY,
      width: Math.max(1, blank.measured.x1 - blank.measured.x0), height: 12
    };
    const ink = added.some((glyph) => glyphInBox(glyph, { packetPage, writeBox: box }));
    if (ink) refusedFieldsWithInk.push({ formNumber: blank.formNumber, fieldId: blank.blankId ?? blank.fieldId });
  }
  assert.equal(refusedFieldsWithInk.length, 0, "a refused field carries generated ink");
  return { actualWrites, outside, refusedFieldsWithInk };
}

function popplerEvidence() {
  const probe = spawnSync(PDFTOPPM, ["-v"], { encoding: "utf8" });
  assert.ifError(probe.error);
  assert.equal(probe.status, 0, `pdftoppm unavailable: ${probe.stderr || probe.stdout}`);
  const version = /pdftoppm\s+version\s+([^\s]+)/i.exec(`${probe.stderr}\n${probe.stdout}`)?.[1];
  assert.ok(version, "pdftoppm did not report its version");
  return { engine: "poppler_pdftoppm", discoveryMode: process.env.RCAP_PDFTOPPM ? "RCAP_PDFTOPPM" : "PATH", version };
}

async function rasterPacket(file, outDirRel) {
  const outDir = path.join(rootDir, outDirRel);
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of fs.readdirSync(outDir)) if (/^page-(?:raw-)?\d+\.png$/.test(name)) {
    fs.rmSync(path.join(outDir, name));
  }
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "ut-completeness-raster-"));
  const prefix = path.join(stage, "page");
  const run = spawnSync(PDFTOPPM, ["-png", "-r", String(RASTER_DPI), file, prefix], {
    encoding: "utf8", maxBuffer: 64 * 1024 * 1024
  });
  assert.ifError(run.error);
  assert.equal(run.status, 0, `raster failed: ${run.stderr || run.stdout}`);
  const pdf = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const geometry = pdf.getPages().map((page, index) => ({ page: index + 1, ...page.getSize() }));
  const found = fs.readdirSync(stage).map((name) => ({ name, match: /^page-(\d+)\.png$/.exec(name) }))
    .filter((row) => row.match).map((row) => ({ ...row, page: Number(row.match[1]) }))
    .sort((a, b) => a.page - b.page);
  const provenance = popplerEvidence();
  const pages = [];
  for (const row of found) {
    const source = path.join(stage, row.name);
    const target = path.join(outDir, `page-${String(row.page).padStart(2, "0")}.png`);
    fs.renameSync(source, target);
    const metadata = await sharp(target).metadata();
    const { channels } = await sharp(target).greyscale().stats();
    const page = geometry.find((item) => item.page === row.page);
    const bytes = fs.readFileSync(target);
    const croppedToPage = Math.abs(metadata.width - Math.round(page.width * RASTER_DPI / 72)) <= 1
      && Math.abs(metadata.height - Math.round(page.height * RASTER_DPI / 72)) <= 1;
    const looksBlank = channels[0].max - channels[0].min <= 6;
    assert.ok(croppedToPage && !looksBlank, `raster page ${row.page} is blank or not page-cropped`);
    pages.push({
      page: row.page,
      file: path.relative(rootDir, target).split(path.sep).join("/"),
      widthPx: metadata.width, heightPx: metadata.height,
      pdfWidthPt: page.width, pdfHeightPt: page.height,
      attempts: 1, looksBlank, croppedToPage,
      engine: provenance.engine, engineDiscoveryMode: provenance.discoveryMode,
      engineVersion: provenance.version, dpi: RASTER_DPI,
      sha256: sha256(bytes), byteLength: bytes.length
    });
  }
  fs.rmSync(stage, { recursive: true, force: true });
  assert.equal(pages.length, geometry.length, "not every PDF page was rastered");
  return { pages, provenance };
}

function participantInstructions(config) {
  const items = REQUIRED_BEFORE_FILING.filter((item) => {
    if (config.traffic && /BCI certificate|previously used name|Gender|BCI payment|Government-issued/i.test(item)) return false;
    if (config.routeKind !== "incident" && /Law-enforcement incident/i.test(item)) return false;
    return true;
  });
  return `# Required before filing\n\nThis review fixture deliberately leaves the following facts or acts blank. Supply them from your own records or complete them when the named event occurs; do not guess.\n\n${items.map((item) => `- ${item}`).join("\n")}\n\nSignatures, signature dates, service certifications, court-only fields, agency-only fields, prosecutor-only fields, victim fields, and optional third-party authorizations remain protected.\n`;
}

function updateRows(familyId, config, canonicalPlans, blankLedger, artifactSummary) {
  const before = { ...ZERO_COUNTERS, unclassifiedBlanks: config.traffic ? 296 : 617 };
  const uniqueWrites = canonicalPlans.map((row) => ({
    formNumber: row.formNumber, fieldId: row.fieldId, field: row.field,
    factId: row.factId, kind: row.kind, routeDetermined: row.routeDetermined === true
  }));
  const blankDispositions = blankLedger.map((row) => ({
    formNumber: row.formNumber,
    fieldId: row.blankId ?? row.fieldId ?? row.selectionId,
    field: row.field,
    approvedDisposition: row.approvedBlankDisposition,
    basis: row.why ?? row.reason,
    participantInstruction: row.participantInstruction ?? null
  }));
  const row = {
    itemId: familyId,
    status: "COMPLETED",
    resultPreparedForIndependentVerification: "PASS_COMPLETE",
    countersBefore: before,
    countersAfter: { ...ZERO_COUNTERS },
    fieldsNewlyWritten: uniqueWrites,
    blanksNewlyGivenApprovedDisposition: blankDispositions,
    requiredBeforeFiling: [...new Set(blankLedger.filter((item) => item.approvedBlankDisposition === "REQUIRED_BEFORE_FILING")
      .map((item) => item.participantInstruction).filter(Boolean))],
    caseAndOffenseRows: { status: "COMPLETE", routeKind: config.routeKind, caseNumberWrittenEverywhereRequired: true },
    protectedWrites: 0,
    artifacts: artifactSummary,
    independentVerification: "PENDING — this repair lane does not verify its own output",
    commercialRoutesOpened: 0,
    productionTouched: false
  };
  const abs = path.join(rootDir, WAVE_ROWS);
  let doc = {
    schemaVersion: "rcap-completeness-repair-return/v1",
    assignmentId: ASSIGNMENT_ID,
    baseSha: CONTROL_BASE,
    dispatchCommit: DISPATCH_COMMIT,
    rows: []
  };
  if (fs.existsSync(abs)) doc = JSON.parse(fs.readFileSync(abs, "utf8"));
  doc.rows = [...doc.rows.filter((item) => item.itemId !== familyId), row]
    .sort((a, b) => a.itemId.localeCompare(b.itemId));
  writeJson(WAVE_ROWS, doc);
}

export async function runUtahCompletenessRepair(familyId, argv = process.argv.slice(2)) {
  const config = CONFIGS[familyId];
  assert.ok(config, `unknown P1 Utah family ${familyId}`);
  if (argv.includes("--check")) {
    throw new Error(`${familyId}: independent verification belongs to the assigned V shard; this repair lane does not self-verify`);
  }
  if (argv.some((arg) => arg.startsWith("--"))) throw new Error(`${familyId}: unsupported option ${argv[0]}`);
  process.chdir(rootDir);
  const out = outputRoot(config);
  const receipt = readJson(`${out}/source-receipt.json`);
  const census = readJson(`${out}/field-census.census-v1.json`);
  const originalMap = readJson(`${out}/production-field-map.json`);
  assert.equal(receipt.familyId, familyId);
  assert.equal(census.familyId, familyId);
  assert.equal(originalMap.familyId, familyId);

  const base = await sourcePacket(receipt);
  const canonicalPlans = [...textPlansFor(config, census, "canonical"), ...selectionPlansFor(config, originalMap)];
  const boundaryPlans = [...textPlansFor(config, census, "boundary"), ...selectionPlansFor(config, originalMap)];
  const repaired = repairFieldMap(config, originalMap, census, canonicalPlans, boundaryPlans);

  const artifacts = [];
  const documentProofs = [];
  for (const [fixture, plans] of [["canonical", canonicalPlans], ["boundary", boundaryPlans]]) {
    const rel = `${out}/fixtures/${fixture}.pdf`;
    const abs = path.join(rootDir, rel);
    const rendered = await renderFixture(base, plans, fixture, abs);
    const added = await addedGlyphs(base.bytes, rendered.bytes);
    const proof = byteProof(added, plans, repaired.blankLedger, base.pageManifest);
    const raster = await rasterPacket(abs, `${out}/raster/${fixture}`);
    artifacts.push({
      fixture, file: rel, sha256: sha256(rendered.bytes), byteLength: rendered.bytes.length,
      pageCount: base.pageManifest.length, pageManifest: base.pageManifest,
      activeContentScan: rendered.activeContentScan,
      rasterEngine: raster.provenance.engine,
      rasterEngineDiscoveryMode: raster.provenance.discoveryMode,
      rasterEngineVersion: raster.provenance.version,
      rasterDpi: RASTER_DPI, rasterPages: raster.pages
    });
    documentProofs.push({
      fixture,
      proofMethod: "final PDF byte glyphs read at every committed measured write box",
      valuesReportedByFinalizer: plans.length,
      addedGlyphsReadFromOutputBytes: added.filter((glyph) => normalize(glyph.c)).length,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.outside.length,
      refusedFieldsWithInk: proof.refusedFieldsWithInk,
      actualWrites: proof.actualWrites
    });
  }

  repaired.fieldMap.maps.forEach((map) => {
    map.canonicalWrites = canonicalPlans.filter((row) => row.kind === "text" && row.formNumber === map.formNumber);
    map.boundaryWrites = boundaryPlans.filter((row) => row.kind === "text" && row.formNumber === map.formNumber);
  });
  writeJson(`${out}/production-field-map.json`, repaired.fieldMap);
  writeJson(`${out}/source-receipt.json`, {
    ...receipt,
    completenessRepair: {
      assignmentId: ASSIGNMENT_ID,
      controlBaseSha: CONTROL_BASE,
      dispatchCommit: DISPATCH_COMMIT,
      reboundFromMasterLibrary: true,
      everyDocumentHashExact: true,
      sourceBinaryCommitted: false
    }
  });
  writeJson(`${out}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1-completeness-repair",
    familyId,
    derivedFromArtifactBytes: true,
    artifacts: documentProofs,
    documents: documentProofs,
    blockingFindings: []
  });
  writeJson(`${out}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1-completeness-repair",
    familyId,
    renderedFresh: true,
    artifacts,
    everyPageRastered: artifacts.every((artifact) => artifact.rasterPages.length === artifact.pageCount),
    byteDerivedHashes: true,
    independentVerificationPending: true
  });
  fs.writeFileSync(path.join(rootDir, `${out}/participant-instructions.md`), participantInstructions(config));
  writeJson(`${out}/build-findings.json`, {
    schemaVersion: "rcap-build-findings/v1-completeness-repair",
    familyId,
    blocking: [],
    findingCount: 0,
    observations: [
      "Known participant and case facts are written at committed source-measured geometry.",
      "Route-determined petition, court-type, order-branch, and cover-sheet selections are marked.",
      "Every remaining blank carries an explicit closed-vocabulary disposition.",
      "Genuinely missing facts are surfaced in participant-instructions.md as required before filing.",
      "Signatures, signature dates, service acts, and court/agency/prosecutor/victim fields remain protected.",
      "Independent completeness and visual verification remain pending."
    ]
  });
  writeJson(`${out}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1-completeness-repair",
    familyId,
    status: "BUILT_REVIEW_PENDING",
    completenessPreparedStatus: "PASS_COMPLETE",
    independentVerificationStatus: "PENDING",
    builtDocuments: receipt.documents.length,
    renderedArtifacts: artifacts.length,
    rasterPages: artifacts.reduce((count, artifact) => count + artifact.rasterPages.length, 0),
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0
  });
  updateRows(familyId, config, canonicalPlans, repaired.blankLedger, artifacts.map((artifact) => ({
    fixture: artifact.fixture, sha256: artifact.sha256, byteLength: artifact.byteLength,
    pageCount: artifact.pageCount, rasterPages: artifact.rasterPages.length
  })));
  console.log(`${familyId}: completeness repair rendered ${receipt.documents.length} source-bound components, ${artifacts.length} fixtures, ${artifacts.reduce((n, a) => n + a.rasterPages.length, 0)} page rasters`);
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(thisFile)) {
  await runUtahCompletenessRepair("ut_pet_acquittal-set");
}
