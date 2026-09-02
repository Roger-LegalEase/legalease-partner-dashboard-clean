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

/**
 * Two flags carry the DET-FEE-AND-WAIVER-001 amendment A4 repair.
 *
 * `statesBciApplicationFee` replaces the sentence A4 condemns -- the packet
 * telling the participant in bold that it "does not state an amount because BCI
 * sets it per applicant" while its own delivered canonical PDF prints $65.00
 * three times. A4 calls that a rule of internal consistency rather than an
 * obligation-scoping question: a packet may never tell a participant that it
 * does not state something it does state.
 *
 * `statesManifestPreFilingItems` adds the requiredBeforeFiling items the
 * family's own committed packet-set manifest holds and the delivered
 * instructions omit. It is set only on the two families independently scored
 * FAIL on REQUIRED_BEFORE_FILING for exactly that omission.
 *
 * WHY THESE ARE FLAGS AND NOT UNCONDITIONAL. Only the flagged families are
 * claimed by this repair. The defect is NOT narrower than the flag:
 * ut_pet_limitations-set and ut_pet_dismissed_without_prejudice-set ship
 * participant-instructions.md bytes IDENTICAL to these three (SHA-256
 * d11ba889207735fb413c6ab7d719e194e3a6d3e2a2ca96351e2eca4a5dd319f5), so they
 * carry the same false BCI-fee sentence word for word -- and both currently
 * hold PASS_COMPLETE_INDEPENDENT verdicts resting on that text. Setting the
 * flag unconditionally would rewrite two families this lane holds no claim on
 * and would silently invalidate two independent passes. Extending the repair is
 * one word per family once each is claimed, and it should happen: the sentence
 * is as false there as it is here.
 */
const CONFIGS = Object.freeze({
  "ut_pet_acquittal-set": {
    slug: "ut-pet-acquittal-set", traffic: false, routeKind: "case",
    chargeLabel: "Acquitted charge", statesBciApplicationFee: true
  },
  "ut_pet_conviction-set": {
    slug: "ut-pet-conviction-set", traffic: false, routeKind: "case",
    chargeLabel: "Eligible conviction",
    statesBciApplicationFee: true, statesManifestPreFilingItems: true
  },
  "ut_pet_dismissed_with_prejudice-set": {
    slug: "ut-pet-dismissed-with-prejudice-set", traffic: false, routeKind: "case",
    chargeLabel: "Charge dismissed with prejudice", dismissedWithPrejudice: true,
    statesBciApplicationFee: true, statesManifestPreFilingItems: true
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

const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";

/**
 * The held publications the filing instructions quote, and nothing else.
 *
 * Independent verification failed filingDestination, feeAndWaiver and service
 * on these packets because the instructions treated the venue as a blank to
 * fill, stated no fee and no waiver route, and named no one to serve. None of
 * those is a fact this lane may invent, and none of them had to be: Utah
 * publishes all three, and the bytes are already in the committed corpus.
 *
 * Every statement the instructions make about where to file, what it costs and
 * who receives a copy is quoted from one of these, and each is re-hashed
 * against the committed corpus index on every build. A drifted source refuses
 * the build rather than shipping a stale instruction a participant would act
 * on.
 */
const CITED_AUTHORITIES = Object.freeze([
  {
    id: "UT-BCI-EXP-INSTRUCTIONS",
    title: "Expungement Applicant Instructions (Utah Bureau of Criminal Identification)",
    pathInArchive: "STATES/UT/03_INSTRUCTIONS/UT__INSTRUCTIONS__UT-BCI-EXP-INSTRUCTIONS__bci-expungement-applicant-instructions__REV-UNKNOWN__EN.pdf",
    supports: ["filingDestination", "feeAndWaiver", "service"],
    // The traffic route obtains no certificate, so this publication's BCI steps
    // do not apply to it. Its court step -- mail or email the prosecutor copies
    // of what you file -- is the only thing the traffic instructions quote from
    // it, and the instructions say so and send the reader to the clerk to
    // confirm the method for a traffic petition.
    trafficRoute: true,
    trafficSupports: ["service"]
  },
  {
    id: "UT-BCI-INDIGENT-INSTRUCTIONS",
    title: "Indigent Expungement Applicant Instructions (Utah Bureau of Criminal Identification)",
    pathInArchive: "STATES/UT/03_INSTRUCTIONS/UT__INSTRUCTIONS__UT-BCI-INDIGENT-INSTRUCTIONS__bci-indigent-expungement-instructions__REV-UNKNOWN__EN.pdf",
    supports: ["feeAndWaiver"],
    trafficRoute: false
  },
  {
    id: "1044XX",
    title: "District Court Cover Sheet for Civil Actions (Utah State Courts)",
    pathInArchive: "STATES/UT/02_PACKET_FORMS/UT__FORM__1044XX__district-court-cover-sheet-for-civil-actions__REV-2026-05-06__EN.pdf",
    supports: ["filingDestination", "feeAndWaiver"],
    trafficRoute: true
  },
  {
    id: "1305GE",
    title: "Motion to Waive Fees for Expungement - Criminal (Utah State Courts)",
    pathInArchive: "STATES/UT/04_SUPPORTING_PROCESS/UT__SUPPORT__1305GE__motion-to-waive-fees-for-expungement__REV-2019-06-24__EN.pdf",
    supports: ["feeAndWaiver"],
    trafficRoute: true
  },
  {
    id: "1146XX",
    title: "Acceptance of Service - Expungement (Prosecutor) (Utah State Courts)",
    pathInArchive: "STATES/UT/05_SOURCE_GATED/UT__SOURCE-GATED__1146XX__acceptance-of-service-expungement__REV-2019-05-01__EN.pdf",
    supports: ["service"],
    trafficRoute: true
  }
]);

/**
 * Re-hashes every cited publication and returns its recorded identity.
 *
 * No hash is written into this file. The committed corpus index is the record,
 * the bytes on disk are the thing, and the build refuses when they disagree --
 * so an instruction quoting a superseded revision cannot ship quietly.
 */
function resolveCitedAuthorities(config) {
  const index = readJson(CORPUS_INDEX);
  const raw = index.entries ?? index.files ?? index;
  const entries = Array.isArray(raw) ? raw : Object.values(raw);
  const master = sourceRoot();
  const resolved = [];
  for (const authority of CITED_AUTHORITIES) {
    if (config.traffic && authority.trafficRoute !== true) continue;
    const entry = entries.find((row) => (row.path ?? row.relativePath) === authority.pathInArchive);
    assert.ok(entry, `${authority.id}: not in the committed corpus index at ${authority.pathInArchive}`);
    const bytes = fs.readFileSync(path.join(master, authority.pathInArchive));
    const digest = sha256(bytes);
    const indexed = String(entry.sha256 ?? entry.sha ?? "");
    assert.equal(digest, indexed,
      `${authority.id}: SHA-256 drift; the index records ${indexed} and the held bytes hash to ${digest}`);
    resolved.push({
      id: authority.id, title: authority.title, pathInArchive: authority.pathInArchive,
      sha256: digest, byteLength: bytes.length,
      supports: (config.traffic && authority.trafficSupports) ? authority.trafficSupports : authority.supports,
      verifiedBy: "re-hashed on this build against the committed corpus index"
    });
  }
  return resolved;
}

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

/**
 * Where each page's agency-use region begins, measured off the census.
 *
 * A form that prints "BUREAU USE ONLY" is drawing a boundary on its own face:
 * everything under that heading is completed by the issuing agency, not by the
 * participant. Reading the heading's own caption caught only the heading blank
 * itself, so UT-BCI-EXP-APPLICATION's "SID#R&F" rule -- which sits INSIDE that
 * box at page 2 y=37.35, twenty points below the heading at y=58.14, and which
 * the census independently marks protectCategory "government_identifier" --
 * was classified REQUIRED_BEFORE_FILING and asked of the participant. A blank
 * the bureau completes is not an item the participant must supply before
 * filing.
 *
 * The rule is geometric and names no form: on any page, the highest agency-use
 * heading sets a baseline, and every blank at or below it belongs to the
 * agency. Nothing above the heading is touched -- the SSN and driver-licence
 * blanks the participant really does supply sit hundreds of points higher.
 */
const AGENCY_USE_HEADING = /\b(?:BUREAU|OFFICE|AGENCY|OFFICIAL|COURT|CLERK)\s+USE\s+ONLY\b/i;

function agencyUseBaselines(fields) {
  const byPage = new Map();
  for (const field of fields) {
    if (!AGENCY_USE_HEADING.test(`${field.caption ?? ""} ${field.regionHeading ?? ""}`)) continue;
    const baseline = field.measured?.baselineY;
    if (typeof baseline !== "number") continue;
    const current = byPage.get(field.page);
    if (current === undefined || baseline > current) byPage.set(field.page, baseline);
  }
  return byPage;
}

function inAgencyUseRegion(field, agencyBaselines) {
  const baseline = agencyBaselines.get(field.page);
  if (typeof baseline !== "number") return false;
  const y = field.measured?.baselineY;
  return typeof y === "number" && y <= baseline;
}

function requiredBeforeFilingReason(detail) {
  return {
    approvedBlankDisposition: "REQUIRED_BEFORE_FILING",
    why: `optional participant-authored content is not invented by the platform; REQUIRED_BEFORE_FILING: ${detail}`,
    participantInstruction: detail,
    compatibilityNote: "The committed completeness reader has no direct REQUIRED_BEFORE_FILING parser; the explicit disposition is authoritative."
  };
}

function refusalFor(field, formNumber, config, agencyBaselines = new Map()) {
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
  if (inAgencyUseRegion(field, agencyBaselines)) return {
    ...common,
    why: `court, clerk, prosecutor, agency, or hearing field; protected for the authorized actor — the form prints an agency-use-only heading on page ${field.page} at y=${round(agencyBaselines.get(field.page))} and this blank sits at y=${round(field.measured?.baselineY)}, inside that box`,
    agencyUseRegionBaselineY: round(agencyBaselines.get(field.page)),
    approvedBlankDisposition: "PROTECTED_FIELD"
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
  // The traffic route obtains no certificate of eligibility -- 1002EX prints
  // "1. Certificate of eligibility is not required" as a heading, and the route
  // is ut-traffic-direct-court-no-bci. The measured rule at page 1 y=296.76 is
  // the bottom border of the caption table's left cell, twenty-three points
  // below that printed heading, and the caption was taken from the heading
  // because it was the nearest overlapping printed line. Asking a traffic
  // petitioner for a certificate number the route does not use is asking for a
  // fact that does not exist.
  if (config.traffic && /certificate of eligibility/i.test(protectedText)) return {
    ...common,
    why: "source-layout artifact; never a filing fact — nothing is printed at the measured position, the caption was taken from the numbered heading above it, and on this route no certificate of eligibility is obtained at all",
    routeSelection: "ut-traffic-direct-court-no-bci",
    captionTakenFromNearestOverlappingPrintedLine: true,
    approvedBlankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE"
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

function repairFieldMap(config, original, census, canonicalPlans, boundaryPlans, citedAuthorities = []) {
  const selectedIds = new Set(canonicalPlans.filter((row) => row.kind === "selection").map((row) => row.fieldId));
  const textIds = new Set(canonicalPlans.filter((row) => row.kind === "text")
    .map((row) => `${row.formNumber}:${row.fieldId}`));
  const canonicalText = canonicalPlans.filter((row) => row.kind === "text");
  const boundaryText = boundaryPlans.filter((row) => row.kind === "text");
  const blankLedger = [];
  const maps = original.maps.map((oldMap) => {
    const fields = censusFields(census, oldMap.formNumber);
    const agencyBaselines = agencyUseBaselines(fields);
    const roleRefusals = fields
      .filter((field) => !textIds.has(`${oldMap.formNumber}:${field.blankId}`))
      .map((field) => refusalFor(field, oldMap.formNumber, config, agencyBaselines));
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
        filingDestinationStated: true,
        feeAndWaiverRouteStated: true,
        serviceRecipientAndMethodStated: true,
        citedAuthorities,
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

/**
 * The filing instructions the packet ships with.
 *
 * The previous version listed the blanks and stopped there. Independent
 * verification failed it on three counts and each finding was right:
 *
 *   filingDestination -- it never said where the packet goes. It listed
 *     "Judicial district and court street address for the filing venue" as a
 *     blank the participant must supply, which is the opposite of naming a
 *     destination, and a route-determined mark in the caption box is not the
 *     instructions naming a court.
 *   feeAndWaiver -- the packet marks the $150 cover-sheet row but no text ever
 *     stated the fee, and no waiver route was named or referenced anywhere.
 *   service -- "Service method, address, date, and certification only after
 *     service occurs" hands the participant the recipient and the method as
 *     blanks. It names neither.
 *
 * None of the three needed inventing. Utah publishes all of them and the bytes
 * are held: the cover sheet prints the fee, the BCI applicant instructions name
 * the court step and the prosecutor service step, and 1305GE is the waiver
 * motion.
 *
 * A later independent read found the money paragraph still wrong, in the
 * opposite direction. It said in bold that the packet "does not state an amount
 * because BCI sets it per applicant" -- while the BCI application this packet
 * DELIVERS prints "$65.00" three times. Two BCI amounts had been collapsed into
 * one refusal: the $65.00 application fee, which is flat, printed and held, and
 * the per-incident certificate price, which genuinely is set per applicant in
 * BCI's letter. Refusing the second never licensed denying the first, and a
 * reader told the packet states no amount who then finds $65.00 on the form
 * they must submit cannot tell what they have missed. The instruction now
 * states the $65.00, states BCI's own indigency waiver and the sequencing rule
 * the application prints ("you MUST complete the fee waiver form before
 * submitting your application"), and keeps the honest refusal for the
 * certificate price -- which is still not guessed.
 * See DET-FEE-AND-WAIVER-001 amendment A4.
 */
function participantInstructions(config, authorities) {
  const items = REQUIRED_BEFORE_FILING.filter((item) => {
    if (config.traffic && /BCI certificate|previously used name|Gender|BCI payment|Government-issued/i.test(item)) return false;
    if (config.routeKind !== "incident" && /Law-enforcement incident/i.test(item)) return false;
    return true;
  });
  const petition = config.traffic ? "1002EX" : "1000EX";
  const order = config.traffic ? "1022EX" : "1020EX";
  const out = [];

  out.push("# Filing instructions and what you must supply", "");
  out.push("This is a review fixture built from exact held official Utah forms. The platform filled in what it holds about you and about your case. Everything below is either a direction taken from Utah's own published instructions, or a fact you supply yourself.", "");

  out.push("## Where you file this", "");
  if (config.traffic) {
    out.push(`File the cover sheet (1044XX), the petition (${petition}) and the proposed order (${order}) with the **Utah district court for the county where the case was heard**. That court is the one printed on your own case paperwork, and its case number is on the caption of every page of this packet.`, "");
    out.push("This route needs no certificate of eligibility. Form 1002EX says so on its own face: paragraph 1 reads \"Certificate of eligibility is not required\". You do not apply to the Bureau of Criminal Identification for this petition.", "");
  } else {
    out.push("Filing this packet has **two destinations, in this order**.", "");
    out.push("1. **The Utah Bureau of Criminal Identification (BCI)** issues the certificate of eligibility this petition depends on. BCI's own Expungement Applicant Instructions direct you to apply to BCI, and BCI then sends a letter naming which incidents are eligible and what each certificate costs. Paragraph 1 of the petition (1000EX) is where that certificate's identification number goes.");
    out.push(`2. **The Utah district court for the county where the case was heard.** BCI's instructions direct you to "File a Cover Sheet, Petition to Expunge and Order on Petition to Expunge with the appropriate court" — in this packet, 1044XX, ${petition} and ${order} — and to take the certificate list "to the court that is listed for that case".`, "");
    out.push("BCI's instructions also set a deadline between the two steps: you have **180 days, including weekends and holidays, from the date on the BCI letter** to petition the court. After that the certificates expire and you must reapply.", "");
  }
  out.push("The caption on the petition and the order is already marked **District Court**, and the county is written from your case. The judicial district number and the court's street address are still blank and are yours to write; the clerk of that court will confirm both.", "");

  out.push("## What it costs, and how to ask for a waiver", "");
  out.push("**The court filing fee is $150.** The district court cover sheet in this packet (1044XX, page 2) prints the row `$150 [ ] Expungement Petition - Criminal (E)`, and this packet has already selected that row for you.", "");
  out.push("**If you cannot pay it, Utah has a waiver route for exactly this filing.** It is the *Motion to Waive Fees for Expungement – Criminal*, Utah court form **1305GE**, brought under Utah Code 78A-2-302 and Code of Judicial Administration Rule 4-508. That form is not included in this review fixture; ask the clerk of the court named above for it, or get it from the Utah State Courts self-help forms for expungement. It asks you to name the filing fee amount from the cover sheet and to say why you qualify.", "");
  if (!config.traffic && config.statesBciApplicationFee) {
    // Two BCI money items, and the packet used to deny both by refusing one.
    // The $65.00 application fee is printed three times on the BCI application
    // this packet delivers; the per-incident certificate price is genuinely set
    // per applicant in BCI's letter. Refusing the second never licensed denying
    // the first (DET-FEE-AND-WAIVER-001 amendment A4).
    out.push("**BCI charges two separate amounts. They are not the same thing, and only one of them is fixed.**", "");
    out.push("**The BCI application fee is $65.00, and it is non-refundable.** It is printed on the BCI *Application for Certificate of Eligibility* included in this packet: \"The application fee is $65.00 and non-refundable\", and again on the payment block, \"Application fee is $65.00\". Your application will not be processed unless it arrives with that fee. Checks and money orders are payable to \"BCI\"; the application also takes Visa, MasterCard, Discover or AMEX; cash is accepted only if you apply in person, and the form says in capitals not to send cash in the mail.", "");
    out.push("**If you cannot pay the $65.00, BCI has its own waiver and you must complete it before you apply.** The application's own instructions are explicit: if you check the box saying you believe you are indigent, you \"MUST complete the fee waiver form before submitting your application\", and BCI will not process the application until the completed waiver form arrives with it. BCI publishes the form and separate *Indigent Expungement Applicant Instructions* at bci.utah.gov/expungements, and returns your waiver form to you with your certificates if you are eligible.", "");
    out.push("**The certificates themselves cost more than the application, and this packet does not state that amount because BCI sets it per applicant.** A certificate must be purchased for each eligible incident you want expunged, and BCI's instructions tell you to \"pay all associated fees as indicated in the BCI letter\" — that letter is where your own certificate price appears. Ask the Bureau of Criminal Identification what your certificates will cost. Do not assume the court's $150 waiver covers either BCI amount: the court and BCI are two different offices with two different waivers.", "");
  } else if (!config.traffic) {
    out.push("**The BCI certificate carries a separate fee, and this packet does not state an amount because BCI sets it per applicant.** BCI's instructions tell you to \"pay all associated fees as indicated in the BCI letter\", and a certificate must be purchased for each eligible incident you want expunged. BCI publishes separate *Indigent Expungement Applicant Instructions* under which BCI sends a fee waiver together with the certificate list. Ask the Bureau of Criminal Identification what your certificates cost and whether you qualify for its fee waiver; do not assume the court's $150 waiver covers BCI's fee, because they are two different offices.", "");
  }
  if (config.dismissedWithPrejudice) {
    // The committed track registry for this route: "The same disposition is
    // separately eligible for automatic expungement 180 days after dismissal
    // under 77-40a-206, so the petition is the faster paid route to the same
    // result and the free route must be disclosed before payment."
    out.push("**Before you pay any of this, know that there is a free route to the same result.** A case dismissed with prejudice is separately eligible for **automatic expungement 180 days after the dismissal** under Utah Code 77-40a-206, where no appeal was filed. That route costs nothing and needs no petition, no BCI certificate and no filing fee. This petition is the *faster* paid route to the same result, not the only one. If you are not in a hurry, waiting out the 180 days is free.", "");
  }

  out.push("## Who must receive a copy, and how", "");
  if (config.traffic) {
    out.push("**The prosecutor must receive a copy of what you file.** This packet includes form 1146XX, *Acceptance of Service – Expungement (Prosecutor)*, whose printed text is the prosecutor acknowledging \"receipt of a copy of the Petition for Expungement\" — the form exists because the prosecutor gets a copy.", "");
    out.push("For an expungement petition Utah's published applicant instructions direct you to **mail or email the prosecutor copies of what you file**. Because this is the traffic route rather than the BCI route, confirm the method and the prosecutor's current address with the clerk of the district court where you file, or with the Utah State Courts Self-Help Center on **888-583-0009**, before you serve.", "");
  } else {
    out.push("**The prosecutor must receive a copy of what you file, by mail or by email.** BCI's Expungement Applicant Instructions state the step plainly: after filing with the court, \"Mail or email the prosecutor copies of what you file.\" This packet includes form 1146XX, *Acceptance of Service – Expungement (Prosecutor)*, for the prosecutor to acknowledge receipt.", "");
    out.push("The prosecutor or a victim in your case may object; if the court schedules a hearing, attend it. The Utah State Courts Self-Help Center answers questions about this on **888-583-0009**.", "");
  }
  out.push("Fill in the service method, the address you used and the date **only after service has actually happened**. A certificate of service dated before service is a false statement, so this packet leaves it blank.", "");

  out.push("## The facts you must supply before filing", "");
  out.push("This review fixture deliberately leaves the following facts or acts blank. Supply them from your own records or complete them when the named event occurs; do not guess.", "");
  out.push(...items.map((item) => `- ${item}`), "");

  if (config.statesManifestPreFilingItems) {
    // The list above is scoped to blanks on paper. The committed packet-set
    // manifest's requiredBeforeFiling entries are scoped to what the
    // participant must have IN HAND, and the difference includes a money bar
    // the manifest says defeats the petition. Every item below is quoted from
    // this family's own manifest entry; nothing here is inferred.
    out.push("**You must also have these in hand before you file. They are not blanks on the forms, and the packet cannot fill them for you.**", "");
    out.push("- **Proof that fines, fees, interest and restitution on this case are paid in full.** Ask the clerk of the sentencing court for a current balance on the case, and check with the Office of State Debt Collection if any balance was entered as a civil judgment and transferred to it. **An unpaid balance defeats the petition, and it will also defeat the BCI certificate.** Check that against your own answer that everything is paid, and correct the packet if they disagree.");
    out.push("- **A complete list of every criminal case you have ever had, in any state, including cases that were already expunged.** Assemble it before you apply to BCI. BCI assesses eligibility against your total criminal history in all states, previously expunged cases included, so **an incomplete list produces a denial rather than a certificate.** Court clerks in each jurisdiction and the state criminal-history repositories are where the missing pieces come from.");
    if (config.dismissedWithPrejudice) {
      out.push("- **A certified copy of the order of dismissal.** Ask the clerk of the court that handled the case. It carries the dismissal date and states whether the dismissal was with or without prejudice — which decides which track applies, and this packet is built for the *with prejudice* track.");
      out.push("- **The dismissal date, checked against that certified copy.** Correct the packet if the date you gave and the date on the order disagree.");
    }
    out.push("");
  }

  out.push("Signatures, signature dates, service certifications, court-only fields, agency-only fields, prosecutor-only fields, victim fields, and optional third-party authorizations remain protected.", "");

  out.push("## What this packet is not", "");
  out.push("This is a prepared set of official Utah forms built for review. It is not legal advice, it is not filed for you, and it does not decide whether the court will grant expungement.", "");

  out.push("## Where these directions come from", "");
  out.push("Every direction above is quoted from a publication held in this repository and re-hashed on the build that produced this packet:", "");
  for (const authority of authorities) {
    out.push(`- **${authority.id}** — ${authority.title}; SHA-256 \`${authority.sha256}\` (${authority.supports.join(", ")})`);
  }
  out.push("");
  return `${out.join("\n")}\n`;
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

  // Before any instruction quotes them: every cited publication is re-hashed
  // against the committed corpus index, so a drifted source refuses the build.
  const citedAuthorities = resolveCitedAuthorities(config);

  const base = await sourcePacket(receipt);
  const canonicalPlans = [...textPlansFor(config, census, "canonical"), ...selectionPlansFor(config, originalMap)];
  const boundaryPlans = [...textPlansFor(config, census, "boundary"), ...selectionPlansFor(config, originalMap)];
  const repaired = repairFieldMap(config, originalMap, census, canonicalPlans, boundaryPlans, citedAuthorities);

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
  fs.writeFileSync(path.join(rootDir, `${out}/participant-instructions.md`), participantInstructions(config, citedAuthorities));
  writeJson(`${out}/build-findings.json`, {
    schemaVersion: "rcap-build-findings/v1-completeness-repair",
    familyId,
    blocking: [],
    findingCount: 0,
    citedAuthorities,
    observations: [
      "Known participant and case facts are written at committed source-measured geometry.",
      "Route-determined petition, court-type, order-branch, and cover-sheet selections are marked.",
      "Every remaining blank carries an explicit closed-vocabulary disposition.",
      "Genuinely missing facts are surfaced in participant-instructions.md as required before filing.",
      "Signatures, signature dates, service acts, and court/agency/prosecutor/victim fields remain protected.",
      "The filing destination, the $150 court fee, the 1305GE waiver route and the prosecutor service step are stated in participant-instructions.md and quoted from the cited held publications, each re-hashed against the committed corpus index on this build.",
      ...(config.statesBciApplicationFee ? ["The BCI application fee of $65.00, and BCI's own indigency waiver and its before-you-apply sequencing rule, are stated in participant-instructions.md and quoted from the BCI Application for Certificate of Eligibility this packet delivers. The per-incident certificate price is still refused rather than guessed, and the refusal now says which of the two BCI amounts it applies to (DET-FEE-AND-WAIVER-001 amendment A4)."] : []),
      ...(config.statesManifestPreFilingItems ? ["The requiredBeforeFiling items this family's committed packet-set manifest holds and the earlier instructions omitted - the paid-in-full bar on fines, fees, interest and restitution, and the all-states case list BCI reviews - are stated in participant-instructions.md, quoted from that manifest."] : []),
      ...(config.dismissedWithPrejudice ? ["The free alternative the committed track registry says must be disclosed before payment - automatic expungement 180 days after the dismissal under Utah Code 77-40a-206 - is stated in participant-instructions.md ahead of every amount the packet asks the participant to pay."] : []),
      "Blanks printed inside the form's own agency-use-only box are protected for the issuing agency rather than asked of the participant.",
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
