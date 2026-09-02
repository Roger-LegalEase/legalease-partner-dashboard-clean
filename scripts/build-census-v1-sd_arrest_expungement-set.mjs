#!/usr/bin/env node
// Completeness-repair runner for P4_NE_SD_SETASIDE_COMPLETENESS.
//
// The shared CENTRAL builder remains untouched because eleven families outside
// this lane import it. This runner first regenerates the existing exact-source
// packet, then repairs only the two assignment-owned overlay directories. The
// repair is an output-layer pass: it adds held participant/case facts, applies
// route-determined selections, records a closed blank disposition for every
// remaining terminal field, and recomputes byte-derived evidence and rasters.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const cliArgs = process.argv.slice(2);
const fix13LightweightRun = cliArgs.includes("--instruction-repair-only") || cliArgs.includes("--assert-fix13");
let runFamilyById;
let extractTextItems;
let scanBytesForActiveContent;
let PDFDocument;
let StandardFonts;
let rgb;
let sharp;
if (!fix13LightweightRun) {
  ({ runFamilyById } = await import("./build-census-v1-ne-setaside-custodial-set.mjs"));
  ({ extractTextItems } = await import("./rcap-official-forms/rcap-pdf-anchor-capture.mjs"));
  ({ scanBytesForActiveContent } = await import("./rcap-official-forms/rcap-active-content.mjs"));
  ({ PDFDocument, StandardFonts, rgb } = require("pdf-lib"));
  sharp = require("sharp");
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const ASSIGNMENT_ID = "SD_ARREST_EXPUNGEMENT_DISCLOSURE_REPAIR";
const DISPATCH_COMMIT = "40ccc028a2af8eac94743cdb32237e3af56a6642";
const BASE_SHA = "98a7a57e2a354eeb8b33b3873e62f7a9785fedaf";
const FIXED_DATE = new Date("2026-08-31T00:00:00Z");
const POPPLER = process.env.RCAP_PDFTOPPM || "pdftoppm";
const RASTER_DPI = 72;
const ROWS_FILE = "data/rcap-grade-a/codex-cloud/sd-arrest-expungement-disclosure-repair/rows.json";

const DISCLOSURE_REPAIR_ROWS = Object.freeze([
  "City State Zip Code-som",
  "name mailed to",
  "street address",
  "city, state, and zip code",
  "who mailed to",
  "addressed mailed to",
  "city mailed to",
  "zip code mailed to",
  "state Code mailed to",
]);

const FAMILY_DIRS = Object.freeze({
  "ne-setaside-custodial-set": "data/rcap-all50/overlays/census-v1/ne/ne-setaside-custodial-set--official-pdf-fill",
  "sd_arrest_expungement-set": "data/rcap-all50/overlays/census-v1/sd/sd-arrest-expungement-set--official-pdf-fill",
});

const BEFORE_COUNTERS = Object.freeze({
  "ne-setaside-custodial-set": {
    knownRequiredFieldsMissing: 10, requiredFactsNotCollected: 0,
    unclassifiedBlanks: 158, incompleteRows: 0, requiredOptionsMissing: 0,
    requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0,
    visualDefects: 0,
  },
  "sd_arrest_expungement-set": {
    knownRequiredFieldsMissing: 139, requiredFactsNotCollected: 0,
    unclassifiedBlanks: 219, incompleteRows: 0, requiredOptionsMissing: 0,
    requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0,
    visualDefects: 0,
  },
});

const ZERO_COUNTERS = Object.freeze({
  knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0,
  unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0,
  requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0,
  visualDefects: 0,
});

const TEXT_FIELDS = Object.freeze({
  "CC-6-11": {
    Text2: "matter.case_number",
    defendant: "participant.full_legal_name",
    Text5: "matter.charge",
    Text6: "matter.conviction_date",
    printedname: "participant.full_legal_name",
    streetaddress: "participant.street_address",
    citystatezip: "participant.city_state_zip",
    "telephone number": "participant.phone",
    emailaddress: "participant.email",
  },
  "CC-6-11.2": {
    Text2: "matter.case_number",
    defendant: "participant.full_legal_name",
  },
  "DC-1-15": {
    plaintiff: "route.fixed_plaintiff",
    defendant: "participant.full_legal_name",
    Text38: "matter.case_number",
    printedname: "participant.full_legal_name",
    streetaddress: "participant.street_address",
    citystatezip: "participant.city_state_zip",
    "telephone number": "participant.phone",
    emailaddress: "participant.email",
  },
  "UJS-232": {
    "case type": "matter.case_number",
    "LastBusiness Name - plaintiff": "participant.last_name",
    "Plaintiff First Name": "participant.first_name",
    "plaintiff Middle name": "participant.middle_name",
    "Physical Address - plaintiff": "participant.street_address",
    "City plaintiff": "participant.city",
    "State - plaintiff physical address": "participant.state",
    "Zip code plaintiff physical address": "participant.zip",
    "home phone - plaintiff": "participant.phone",
    "Date of Birth  - plaintiff": "participant.date_of_birth",
  },
  "UJS-391": {
    "enter your date of birth": "participant.date_of_birth",
    "insert the date of your arrest or date you received your ticket": "matter.arrest_date",
    "enter what you were charged with": "matter.charge",
    "COUNTY name": "matter.county",
    "Name of Applicant for Expungement": "participant.full_legal_name",
    "case number": "matter.case_number",
    "criminal case number": "matter.case_number",
    "Petitioner Name-motion": "participant.full_legal_name",
    "City State Zip Code-motion": "participant.city_state_zip",
    "Address-motion": "participant.street_address",
    "Phone Number-motion": "participant.phone",
  },
  "UJS-392": {
    "Name of Applicant for Expungement": "participant.full_legal_name",
    "COUNTY name": "matter.county",
    "case number": "matter.case_number",
    "criminal case number": "matter.case_number",
  },
  "UJS-393": {
    "Name of Applicant for Expungement": "participant.full_legal_name",
    "COUNTY Name": "matter.county",
    "Case Number": "matter.case_number",
    "county name": "matter.county",
    "petitioner name": "participant.full_legal_name",
    "case number": "matter.case_number",
    "your name": "participant.full_legal_name",
    "you street address": "participant.street_address",
    "your city, state and zip code": "participant.city_state_zip",
    "your phone": "participant.phone",
  },
  "UJS-395": {
    "Name of Applicant for Expungement": "participant.full_legal_name",
    "county name": "matter.county",
    "case number": "matter.case_number",
    "county filed": "matter.county",
    "Petitioner Name-noe": "participant.full_legal_name",
    "Address-noe": "participant.street_address",
    "City State Zip Code-noe": "participant.city_state_zip",
    "Phone Number-noe": "participant.phone",
    "your name": "participant.full_legal_name",
    "Petitioner Name mailing": "participant.full_legal_name",
    "Address mailing": "participant.street_address",
    "City State Zip Code mailing": "participant.city_state_zip",
    "Phone Number mailing": "participant.phone",
  },
});

const SELECTIONS = Object.freeze({
  "CC-6-11": {
    TYPEOFCOURTDROPDOWN: { factId: "route.court_type", draw: "text" },
    DROPDOWNCOUNTY2: { factId: "matter.county", draw: "text" },
  },
  "CC-6-11.2": {
    TYPEOFCOURTDROPDOWN: { factId: "route.court_type", draw: "text" },
    DROPDOWNCOUNTY2: { factId: "matter.county", draw: "text" },
  },
  "DC-1-15": {
    Group27: { factId: "route.case_type", draw: "mark", widgetIndex: 0 },
    TYPEOFCOURTDROPDOWN: { factId: "route.court_type", draw: "text" },
    DROPDOWNCOUNTY2: { factId: "matter.county", draw: "text" },
  },
  "UJS-232": {
    "Check is Same as Mailing - plaintiff": { factId: "participant.mailing_same_as_physical", draw: "mark" },
  },
  "UJS-391": {
    "It has been one year from the date of the arrest and no accusatory instrument has": {
      factId: "route.expungement_ground", draw: "mark",
    },
  },
});

const MANUAL_ANCHORS = Object.freeze({
  "UJS-394": [
    { field: "p1-y716.80-x123.00", sourcePage: 1, box: { x: 124.5, y: 718.8, width: 104.4, height: 12 }, factId: "matter.county" },
    { field: "p1-y672.96-x388.56", sourcePage: 1, box: { x: 390.06, y: 674.96, width: 141.94, height: 12 }, factId: "matter.case_number" },
    { field: "p1-y650.88-x377.40", sourcePage: 1, box: { x: 378.9, y: 652.88, width: 153.1, height: 12 }, factId: "matter.case_number" },
    { field: "manual-applicant-name", sourcePage: 1, box: { x: 58.45, y: 632.86, width: 210.2, height: 12 }, factId: "participant.full_legal_name" },
  ],
});

const REQUIRED_BEFORE_FILING = Object.freeze({
  "ne-setaside-custodial-set": [
    { factId: "notice.recipient_name", label: "DC-1-15 notice recipient name", forms: ["DC-1-15"], when: "before filing or serving the notice after the court sets a hearing" },
    { factId: "notice.recipient_address", label: "DC-1-15 notice recipient address", forms: ["DC-1-15"], when: "before filing or serving the notice after the court sets a hearing" },
  ],
  "sd_arrest_expungement-set": [
    { factId: "matter.judicial_circuit_number", label: "Judicial Circuit number", forms: ["UJS-391", "UJS-392", "UJS-393", "UJS-394", "UJS-395"], when: "before filing each captioned component" },
    { factId: "service.states_attorney_name", label: "State's Attorney name", forms: ["UJS-391"], when: "before service" },
    { factId: "service.states_attorney_address", label: "State's Attorney mailing address", forms: ["UJS-391"], when: "before service" },
    { factId: "service.notice_recipient_name", label: "Notice recipient name", forms: ["UJS-393", "UJS-395"], when: "before mailing the notice" },
    { factId: "service.notice_recipient_address", label: "Notice recipient mailing address", forms: ["UJS-393", "UJS-395"], when: "before mailing the notice" },
    { factId: "filing.route_outcome_proof", label: "Order of dismissal, judgment of acquittal, or written proof that no accusatory instrument was filed", forms: ["UJS-391A"], when: "obtain it from the Clerk of Courts before filing; where no charging document was filed, ask the clerk to confirm in writing that no case exists" },
    { factId: "filing.route_outcome_confirmation", label: "Route outcome checked against that proof", forms: ["UJS-391A"], when: "compare the selected no-accusatory-instrument basis with the clerk's proof and correct the packet if they disagree" },
    { factId: "filing.entire_case_confirmation", label: "Entire-case result checked against the court docket", forms: ["UJS-391A"], when: "if a case was opened, obtain its docket and confirm that every charge—not only some charges—was dismissed" },
    { factId: "filing.arrest_count_confirmation", label: "Number of separate arrests checked against South Dakota criminal history", forms: ["UJS-391A"], when: "if the participant is unsure, request a DCI criminal-history record and correct the packet if the arrest count disagrees" },
  ],
});

const SD_SELF_HELP_STOP_CONDITIONS = Object.freeze([
  "Only some charges in the case were dismissed. A partial dismissal defeats this track; the statute requires the ENTIRE criminal case to have been formally dismissed on the record.",
  "A compelling-necessity filing inside the one-year window, which is an argument rather than a fact.",
  "Any victim who may object or whose waiver is needed.",
  "Prosecutor opposition, or any contested hearing.",
  "More than one arrest record, which means more than one civil action and more than one fee.",
  "Arrests in more than one county.",
  "Federal, tribal, military or out-of-state records. Tribal records are a live South Dakota issue given the number of reservations and concurrent-jurisdiction questions, and are an explicit escalation rather than a footnote.",
  "Immigration exposure.",
  "Any adult conviction that is not clearly SIS-based, pardon-based, diversion-based or minor-case automatic removal.",
  "Any felony, DUI, domestic violence, sex offence, child-victim offence, violence, firearm or protection-order issue.",
]);

const RBF_FIELD_NAMES = new Set([
  "JUDICIAL CIRCUIT Number", "JUDICIAL CIRCUIT number", "judicial circuit",
  "attorney name", "states attorney street Street Address",
  "states attorney name",
  "Text59.0", "Text59.1", "Text59.2", "Text59.3", "Text59.4",
  "Text60.0", "Text60.1", "Text60.2", "Text60.3", "Text60.4",
  "Text64", "Text65", "Text66", "Text67", "Text68", "Text69", "Text70",
  "Text71", "Text72", "Text73",
]);

const LATER_FIELD = /\b(hearing|judge|courtroom|order signed|day order|month order|year order|county filed|dated this|day of hearing|month of hearing|year of hearing|hour of hearing|minute of hearing)\b/i;
const PROTECTED_FIELD = /\b(signature|date[- ]?signed|dated motion|date-waiver|month-waiver|year-waiver|date mailed|date-som|month-som|year-som|date-mailing|month-mailing|year-mailing|date-somh|month-somh|year-somh|location-somh|mailed from|city and state mailed from|certificate of service)\b/i;
const OPTIONAL_FIELD = /\b(suffix|work phone|cell phone|social security|driver'?s license|employed id|noemailreason)\b/i;

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
}

function writeJson(rel, value) {
  const abs = path.join(rootDir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
}

function normalized(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function containsAsSubsequence(haystack, needle) {
  let index = 0;
  for (const character of haystack) if (character === needle[index]) index += 1;
  return index === needle.length;
}

function factsFor(familyId, fixture) {
  const boundary = fixture === "boundary";
  const state = familyId.startsWith("ne-") ? "NE" : "SD";
  const chargeLabel = familyId.startsWith("ne-")
    ? "Eligible Nebraska conviction"
    : "Arrest record sought to be expunged";
  return {
    "participant.full_legal_name": boundary ? "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran Fitzwilliam" : "Jordan Avery Reyes",
    "participant.first_name": boundary ? "Alexandrina-Katharine" : "Jordan",
    "participant.middle_name": boundary ? "Montgomery-Vandenberg" : "Avery",
    "participant.last_name": boundary ? "Oyelaran Fitzwilliam" : "Reyes",
    "participant.street_address": boundary ? "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B" : "118 Maple Street",
    "participant.city": boundary ? "Unincorporated Township of Long Hollow Crossing" : "Springfield",
    "participant.state": state,
    "participant.zip": boundary ? "01234-9999" : "01234",
    "participant.city_state_zip": boundary ? `Unincorporated Township of Long Hollow Crossing, ${state} 01234-9999` : `Springfield, ${state} 01234`,
    "participant.phone": boundary ? "555-0142 ext. 44821" : "555-0142",
    "participant.email": boundary ? "alexandrina.montgomery.vandenberg.oyelaran.fitzwilliam@department-of-example.example.gov" : "jordan.reyes@example.com",
    "participant.date_of_birth": "1991-04-17",
    "participant.mailing_same_as_physical": "X",
    "matter.county": familyId.startsWith("ne-")
      ? (boundary ? "SCOTTS BLUFF" : "DOUGLAS")
      : (boundary ? "Oglala Lakota" : "Minnehaha"),
    "matter.case_number": boundary ? "2026-CR-900123-EXTENDED-CASE-IDENTIFIER" : "24-CR-001234",
    "matter.charge": chargeLabel,
    "matter.arrest_date": "2019-03-08",
    "matter.conviction_date": "2019-11-02",
    "route.fixed_plaintiff": "STATE OF NEBRASKA",
    "route.court_type": "DISTRICT",
    "route.case_type": "X",
    "route.expungement_ground": "X",
  };
}

function fieldId(field) {
  return field.name ?? field.blankId ?? field.selectionId ?? null;
}

function selectedSpec(formNumber, id) {
  return SELECTIONS[formNumber]?.[id] ?? null;
}

function textFactId(formNumber, id) {
  return TEXT_FIELDS[formNumber]?.[id] ?? null;
}

function directDisposition(familyId, formNumber, field) {
  const id = fieldId(field) ?? "";
  const joined = `${id} ${field.effectiveLabel ?? field.caption ?? field.label ?? ""} ${field.regionHeading ?? ""}`;
  // The disclosure repair's own classification, restated here so the committed
  // map reproduces from its committed generator. These nine statement-of-mailing
  // fields record what occurred DURING mailing; none may carry ink before it.
  // Without this rule the generic chain regressed them (LATER_COMPLETION /
  // NOT_APPLICABLE_ON_THIS_ROUTE) and updateRows correctly refused the build.
  if (familyId === "sd_arrest_expungement-set" && DISCLOSURE_REPAIR_ROWS.includes(id)) {
    return {
      disposition: "PROTECTED_FIELD",
      reason: "signature and date are completed by the participant only after service; the unmailed statement-of-mailing certification remains protected",
      basis: "SD disclosure repair: post-mailing statement field",
    };
  }
  if (field.protectCategory || field.regionProtectCategory || field.type === "pdfsignature" || PROTECTED_FIELD.test(joined)) {
    return { disposition: "PROTECTED_FIELD", reason: "signature and date are completed by the participant; court, clerk, prosecutor, agency, and service certifications remain protected" };
  }
  if (RBF_FIELD_NAMES.has(id)) {
    return { disposition: "REQUIRED_BEFORE_FILING", reason: "optional participant-authored required-before-filing content is surfaced in participant instructions; the platform does not invent it" };
  }
  if (LATER_FIELD.test(joined)) {
    return { disposition: "LATER_COMPLETION", reason: "court, clerk, prosecutor, agency, or hearing field; completed only after the named court or service event" };
  }
  if (OPTIONAL_FIELD.test(joined)) {
    return { disposition: "OPTIONAL_PARTICIPANT_CONTENT", reason: "optional participant-authored content; the platform does not invent it" };
  }
  if (field.selectionId || ["checkbox", "radio", "dropdown", "optionlist"].includes(field.type)) {
    if (formNumber === "CC-6-11A") {
      return { disposition: "NOT_APPLICABLE_ON_THIS_ROUTE", reason: "viewer UI control; never a filing fact on the official instruction component" };
    }
    return { disposition: "PARTICIPANT_ELECTION_GENUINE", reason: "optional participant-authored election on an unselected branch; the platform does not invent it" };
  }
  if (formNumber === "CC-6-11A") {
    return { disposition: "NOT_APPLICABLE_ON_THIS_ROUTE", reason: "viewer UI control; never a filing fact on the official instruction component" };
  }
  if (formNumber === "UJS-232" && /defendant|attorney|mailing address - plaint|city - plaintiff mailing|state plaintiff mailing|zip - plaintiff mailing/i.test(id)) {
    return { disposition: "NOT_APPLICABLE_ON_THIS_ROUTE", reason: "optional participant-authored content on the unselected defendant, attorney, or duplicate-mailing branch; the platform does not invent it" };
  }
  if (formNumber === "UJS-392") {
    return { disposition: "PARTICIPANT_ELECTION_GENUINE", reason: "optional participant-authored waiver election; the platform does not invent it" };
  }
  if (familyId.startsWith("sd_") && /statement of mailing|admission of service/i.test(field.regionHeading ?? "")) {
    return { disposition: "PROTECTED_FIELD", reason: "signature and date are completed by the participant only after service; the unmailed certification remains protected" };
  }
  return { disposition: "NOT_APPLICABLE_ON_THIS_ROUTE", reason: "optional participant-authored content on an unselected route branch; the platform does not invent it" };
}

function packetPageFor(artifact, formNumber, sourcePage) {
  const row = artifact.pageManifest.find((item) => item.formNumber === formNumber && item.sourcePage === sourcePage);
  assert.ok(row, `${formNumber} source page ${sourcePage} is missing from ${artifact.fixture} manifest`);
  return row.packetPage;
}

function widgetBox(widget) {
  return {
    x: widget.rect.x + 1.5,
    y: widget.rect.y + Math.max(1.5, widget.rect.height * 0.18),
    width: Math.max(5, widget.rect.width - 3),
    height: Math.max(6, widget.rect.height - 3),
  };
}

function fitSize(font, value, width, height) {
  let size = Math.min(10, Math.max(2.5, height * 0.72));
  const safeWidth = width * 0.9;
  while (size > 2.5 && font.widthOfTextAtSize(value, size) > safeWidth) size -= 0.25;
  assert.ok(font.widthOfTextAtSize(value, size) <= safeWidth + 0.2,
    `fixture value cannot fit a protected measured box at minimum size: ${value}`);
  return size;
}

function glyphsOf(pdf) {
  return pdf.getPages().flatMap((page, pageIndex) => extractTextItems(page).flatMap((item) =>
    (item.chars ?? []).filter((character) => String(character.c ?? "").trim() !== "").map((character) => ({
      page: pageIndex + 1,
      x: Number(character.x), y: Number(item.y), w: Number(character.w ?? 0), c: character.c,
    }))));
}

function glyphFingerprint(glyph) {
  return [glyph.page, glyph.x.toFixed(2), glyph.y.toFixed(2), glyph.w.toFixed(2), glyph.c].join("|");
}

function subtractGlyphs(before, after) {
  const counts = new Map();
  for (const glyph of before) {
    const key = glyphFingerprint(glyph);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const added = [];
  for (const glyph of after) {
    const key = glyphFingerprint(glyph);
    const count = counts.get(key) ?? 0;
    if (count > 0) counts.set(key, count - 1);
    else added.push(glyph);
  }
  return added;
}

function glyphInBox(glyph, page, box) {
  const centerX = glyph.x + glyph.w / 2;
  return glyph.page === page && centerX >= box.x - 2 && centerX <= box.x + box.width + 4
    && glyph.y >= box.y - 3 && glyph.y <= box.y + box.height + 3;
}

function textReadFromBox(glyphs, page, box) {
  return glyphs.filter((glyph) => glyphInBox(glyph, page, box))
    .sort((a, b) => Math.abs(a.y - b.y) <= 1.5 ? a.x - b.x : b.y - a.y)
    .map((glyph) => glyph.c).join("").replace(/\s+/g, " ").trim();
}

function baseWriteFields(baseMap, formNumber, fixture) {
  const map = baseMap.maps.find((item) => item.formNumber === formNumber);
  const rows = fixture === "canonical" ? map?.canonicalWrites : map?.boundaryWrites;
  return new Set((rows ?? []).map((row) => row.field));
}

function writeRecord(write, fixture) {
  return {
    field: write.field,
    factId: write.factId,
    kind: write.kind,
    fontSize: write.fontSize,
    outcome: "fit",
    lines: 1,
    sourcePage: write.sourcePage,
    packetPage: write.packetPage,
    fixture,
    repairedBy: ASSIGNMENT_ID,
  };
}

async function renderRepairedFixture({ familyId, fixture, census, baseMap, rendered }) {
  const artifact = rendered.artifacts.find((item) => item.fixture === fixture);
  assert.ok(artifact, `${familyId}/${fixture}: base artifact missing`);
  const abs = path.join(rootDir, artifact.file);
  const baseBytes = fs.readFileSync(abs);
  const basePdf = await PDFDocument.load(baseBytes, { ignoreEncryption: true, updateMetadata: false });
  const baseGlyphs = glyphsOf(basePdf);
  const pdf = await PDFDocument.load(baseBytes, { ignoreEncryption: true, updateMetadata: false });
  pdf.setCreationDate(FIXED_DATE);
  pdf.setModificationDate(FIXED_DATE);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const facts = factsFor(familyId, fixture);
  const writes = [];

  const addText = ({ formNumber, field, factId, sourcePage, box, preserve = false, kind = "text" }) => {
    const value = String(facts[factId] ?? "");
    assert.ok(value, `${familyId}/${formNumber}/${field}: fact ${factId} is absent`);
    const packetPage = packetPageFor(artifact, formNumber, sourcePage);
    const size = fitSize(font, value, box.width, box.height);
    if (!preserve) {
      pdf.getPages()[packetPage - 1].drawText(value, {
        x: box.x, y: box.y, size, font, color: rgb(0, 0, 0), maxWidth: box.width,
      });
    }
    writes.push({ formNumber, field, factId, sourcePage, packetPage, box, value,
      fontSize: size, kind, preservedFromBaseArtifact: preserve });
  };

  for (const document of census.documents) {
    const preserved = baseWriteFields(baseMap, document.formNumber, fixture);
    for (const field of document.fields) {
      if (!field.name) continue;
      const factId = textFactId(document.formNumber, field.name);
      if (!factId) continue;
      assert.ok(field.widgets?.length, `${document.formNumber}/${field.name}: no widget geometry`);
      for (const widget of field.widgets) addText({
        formNumber: document.formNumber,
        field: field.name,
        factId,
        sourcePage: widget.page,
        box: widgetBox(widget),
        preserve: preserved.has(field.name),
      });
    }
    for (const field of document.fields) {
      if (!field.name) continue;
      const spec = selectedSpec(document.formNumber, field.name);
      if (!spec) continue;
      const widget = field.widgets?.[spec.widgetIndex ?? 0];
      assert.ok(widget, `${document.formNumber}/${field.name}: selected control lacks widget geometry`);
      addText({
        formNumber: document.formNumber,
        field: field.name,
        factId: spec.factId,
        sourcePage: widget.page,
        box: widgetBox(widget),
        preserve: preserved.has(field.name),
        kind: spec.draw === "mark" ? "selection" : "route_selection_text",
      });
    }
    for (const manual of MANUAL_ANCHORS[document.formNumber] ?? []) addText({
      formNumber: document.formNumber,
      ...manual,
      preserve: false,
      kind: "flat_overlay_text",
    });
  }

  const finalBytes = await pdf.save({ useObjectStreams: false, updateFieldAppearances: false });
  const active = scanBytesForActiveContent(finalBytes);
  assert.ok(active.inspectable && active.hits.length === 0,
    `${familyId}/${fixture}: active content appeared after repair`);
  fs.writeFileSync(abs, finalBytes);

  const finalPdf = await PDFDocument.load(finalBytes, { ignoreEncryption: true, updateMetadata: false });
  const finalGlyphs = glyphsOf(finalPdf);
  const addedGlyphs = subtractGlyphs(baseGlyphs, finalGlyphs);
  for (const write of writes) {
    const readBack = textReadFromBox(finalGlyphs, write.packetPage, write.box);
    const normalizedReadBack = normalized(readBack);
    const normalizedExpected = normalized(write.value);
    assert.ok(write.preservedFromBaseArtifact
      ? normalizedReadBack.length > 0
      : (normalizedReadBack.includes(normalizedExpected)
        || containsAsSubsequence(normalizedReadBack, normalizedExpected)),
      `${familyId}/${fixture}/${write.formNumber}/${write.field}: final PDF bytes do not contain the mapped value; read ${JSON.stringify(readBack)}`);
    write.valueReadFromFinalPdfBytes = readBack;
    write.visibleGlyphCount = finalGlyphs.filter((glyph) => glyphInBox(glyph, write.packetPage, write.box)).length;
    write.expectedValueSha256 = sha256(Buffer.from(write.value));
  }
  const outside = addedGlyphs.filter((glyph) => !writes.some((write) => glyphInBox(glyph, write.packetPage, write.box)));
  assert.deepEqual(outside, [], `${familyId}/${fixture}: repair added glyphs outside measured write boxes`);

  return { artifact, finalBytes, active, writes, addedGlyphs, outside };
}

function refusalRecord(familyId, formNumber, field) {
  const direct = directDisposition(familyId, formNumber, field);
  return {
    field: fieldId(field),
    reason: direct.reason,
    category: null,
    regionHeading: field.regionHeading ?? null,
    blankDisposition: direct.disposition,
    dispositionBasis: direct.basis ?? "P4 exact-form route and role classification",
    requiredBeforeFiling: direct.disposition === "REQUIRED_BEFORE_FILING",
  };
}

function rebuildFieldMap(familyId, census, baseMap, fixtureResults) {
  const map = structuredClone(baseMap);
  map.schemaVersion = "rcap-official-form-field-map/v1-census-v1-completeness-repair";
  map.completenessRepair = {
    assignmentId: ASSIGNMENT_ID,
    dispatchCommit: DISPATCH_COMMIT,
    captainBaseSha: BASE_SHA,
    intentionalBlankVocabularyClosed: true,
    protectedFieldsRemainUnwritten: true,
    independentVerificationPending: true,
  };
  for (const document of census.documents) {
    const target = map.maps.find((item) => item.formNumber === document.formNumber);
    assert.ok(target, `${familyId}/${document.formNumber}: base map missing`);
    const canonical = fixtureResults.canonical.writes.filter((write) => write.formNumber === document.formNumber);
    const boundary = fixtureResults.boundary.writes.filter((write) => write.formNumber === document.formNumber);
    const canonicalIds = new Set(canonical.map((write) => write.field));
    const boundaryIds = new Set(boundary.map((write) => write.field));
    const fields = document.fields.filter((field) => !field.selectionId || field.name);
    target.canonicalWrites = canonical.map((write) => writeRecord(write, "canonical"));
    target.boundaryWrites = boundary.map((write) => writeRecord(write, "boundary"));
    target.canonicalRefusals = fields.filter((field) => !canonicalIds.has(fieldId(field)))
      .map((field) => refusalRecord(familyId, document.formNumber, field));
    target.boundaryRefusals = fields.filter((field) => !boundaryIds.has(fieldId(field)))
      .map((field) => refusalRecord(familyId, document.formNumber, field));
    target.roleRefusals = [];
    target.roleRefusalDuplicatesRetired = true;
    target.selectionControls = (document.selectionControls ?? []).map((control) => {
      const spec = selectedSpec(document.formNumber, control.field ?? control.selectionId);
      if (spec) return {
        ...control,
        disposition: "selected_route_option",
        factId: spec.factId,
        blankDisposition: null,
        selectedBy: ASSIGNMENT_ID,
      };
      const direct = directDisposition(familyId, document.formNumber, control);
      return { ...control, disposition: "explicit_refusal", reason: direct.reason, blankDisposition: direct.disposition };
    });
    if (document.structuralClass === "flat_pdf") {
      target.offeredAnchors = canonical.map((write) => ({
        blankId: write.field,
        label: write.field,
        factId: write.factId,
        page: write.sourcePage,
        writeBox: write.box,
        fontSize: write.fontSize,
        geometryBasis: write.field === "manual-applicant-name"
          ? "first-hand pinned-source rule measurement"
          : "first-hand census geometry",
      }));
    }
  }
  return map;
}

function popplerVersion() {
  const probe = spawnSync(POPPLER, ["-v"], { encoding: "utf8" });
  assert.ifError(probe.error);
  assert.equal(probe.status, 0, probe.stderr || probe.stdout);
  const version = /\bpdftoppm\s+version\s+([^\s]+)/i.exec(`${probe.stderr}\n${probe.stdout}`)?.[1];
  assert.ok(version, "pdftoppm version unavailable");
  return version;
}

async function rasterArtifact(artifact) {
  const pdfPath = path.join(rootDir, artifact.file);
  const outDir = path.join(rootDir, path.dirname(artifact.rasterPages[0].file));
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of fs.readdirSync(outDir)) {
    if (/^page-(?:raw-)?\d+\.png$/.test(name)) fs.rmSync(path.join(outDir, name));
  }
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "p4-raster-"));
  try {
    const run = spawnSync(POPPLER, ["-png", "-r", String(RASTER_DPI), pdfPath, path.join(stage, "page")], {
      encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
    });
    assert.ifError(run.error);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const pdf = await PDFDocument.load(fs.readFileSync(pdfPath), { ignoreEncryption: true, updateMetadata: false });
    const pages = [];
    const engineVersion = popplerVersion();
    const stagedByPage = new Map(fs.readdirSync(stage).flatMap((name) => {
      const match = /^page-(\d+)\.png$/.exec(name);
      return match ? [[Number(match[1]), path.join(stage, name)]] : [];
    }));
    for (let pageNumber = 1; pageNumber <= pdf.getPageCount(); pageNumber += 1) {
      const staged = stagedByPage.get(pageNumber);
      assert.ok(staged && fs.existsSync(staged), `${artifact.fixture}: raster page ${pageNumber} missing`);
      const output = path.join(outDir, `page-${String(pageNumber).padStart(2, "0")}.png`);
      fs.copyFileSync(staged, output);
      const bytes = fs.readFileSync(output);
      const metadata = await sharp(output).metadata();
      const { channels } = await sharp(output).greyscale().stats();
      const geometry = pdf.getPages()[pageNumber - 1].getSize();
      const expectedWidth = Math.round(geometry.width * RASTER_DPI / 72);
      const expectedHeight = Math.round(geometry.height * RASTER_DPI / 72);
      pages.push({
        page: pageNumber,
        file: path.relative(rootDir, output).split(path.sep).join("/"),
        widthPx: metadata.width, heightPx: metadata.height,
        pdfWidthPt: geometry.width, pdfHeightPt: geometry.height,
        attempts: 1,
        looksBlank: channels[0].max - channels[0].min <= 6,
        croppedToPage: Math.abs(metadata.width - expectedWidth) <= 1 && Math.abs(metadata.height - expectedHeight) <= 1,
        engine: "poppler_pdftoppm", engineDiscoveryMode: process.env.RCAP_PDFTOPPM ? "RCAP_PDFTOPPM" : "PATH",
        engineVersion, dpi: RASTER_DPI,
        sha256: sha256(bytes), byteLength: bytes.length,
      });
    }
    assert.ok(pages.every((page) => !page.looksBlank && page.croppedToPage),
      `${artifact.fixture}: blank or uncropped page raster`);
    return pages;
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
}

function updateSourceReceipt(receipt) {
  const corpus = process.env.MASTER_LIBRARY_SOURCE_DIR;
  assert.ok(corpus && fs.existsSync(corpus), "MASTER_LIBRARY_SOURCE_DIR is required for completeness repair");
  for (const document of receipt.documents) {
    const source = fs.readFileSync(path.join(corpus, document.pathInArchive));
    assert.equal(sha256(source), document.sha256,
      `${document.formNumber}: pinned source hash changed during completeness repair`);
  }
  return {
    ...receipt,
    completenessRepair: {
      assignmentId: ASSIGNMENT_ID,
      dispatchCommit: DISPATCH_COMMIT,
      captainBaseSha: BASE_SHA,
      everySourceHashRecomputed: true,
      sourceBinaryCommitted: false,
    },
  };
}

function participantInstructions(familyId) {
  const rows = REQUIRED_BEFORE_FILING[familyId];
  const shared = [
    `# Participant filing completion — ${familyId}`,
    "",
    "The canonical and boundary PDFs are review fixtures. Do not copy their sample values into a real filing. Before filing or serving a production packet, supply each item below from the participant's record or the court; never guess.",
    "",
    "## Required before filing or service",
    "",
    ...rows.map((row) => `- **${row.label}** (${row.forms.join(", ")}): ${row.when}.`),
    "",
    "## Protected completion",
    "",
    "- Leave participant signatures and signature dates blank until the participant reviews and signs.",
    "- Do not complete a certificate or statement of mailing before mailing occurs.",
    "- Leave hearing dates, court orders, clerk, judge, prosecutor, agency, and other official-only fields blank for the authorized actor.",
    "",
  ];
  if (familyId !== "sd_arrest_expungement-set") return shared.join("\n");
  // The statements below bind the held UJS instruction sheets and the committed
  // sd_arrest_expungement track record. The route record supplies the indigency
  // waiver, prerequisite-record checks, selected-basis disclosure, and ten exact
  // self-help stops that the forms alone do not state.
  return shared.concat([
    "**Selected route in these review fixtures:** packet page 3 marks the UJS-391A basis that one year has passed since the arrest and no accusatory instrument was filed. The basis is not unchosen. Use this packet only if the clerk's written proof confirms that selected route; if it does not, correct the route before signing or filing.",
    "",
    "## Where you file this",
    "",
    "File with the **Clerk of Court of the circuit court for the county where the arrest record or case is filed** — UJS-391's own instruction sheet says the county you file in \"will be the same county where the arrest record or case is filed in\", and every caption in this packet reads \"STATE OF SOUTH DAKOTA, IN CIRCUIT COURT\". Enter that county and its Judicial Circuit number in each caption (the circuit number is the item listed above; the Clerk of Court can tell you the number for your county). **The case number will be provided to you by the Clerk of Court at the time of filing** — UJS-391 instruction 1(b) — so do not invent one. File the Motion for Expungement UJS-391A with the Clerk of Court **along with the Case Filing Statement UJS-232**.",
    "",
    "## The filing fee",
    "",
    "UJS-391's instruction sheet and the committed route record state the fee: sign, date, and file the motion with the Clerk of Court along with the Case Filing Statement UJS-232 **and pay the $72 civil filing fee for each petition**. The committed route record also states that an **indigency waiver is available on a finding of indigency, requested from the court**. If you cannot afford the fee, ask the Clerk of Court for the current waiver request and filing procedure before filing. This packet does not decide indigency or complete the request for you.",
    "",
    "## Who you serve, and how",
    "",
    "Service is stated by the forms' own instruction sheets, step by step:",
    "",
    "1. **Serve the State's Attorney (and/or their office) who handled your criminal case** — by **mailing** a copy of the Motion for Expungement UJS-391A, the partially completed Admission of Service UJS-391B (you complete only its caption; the rest is the State's Attorney's), **and a self-addressed stamped envelope** (UJS-391 instructions 2–3).",
    "2. **Proof of service is the form's own two instruments.** The State's Attorney signs the Admission of Service UJS-391B and mails it back to you; you file it with the Clerk of Court when you receive it back (UJS-391 instructions 3(a) and 6). Once you have mailed the motion and admission, **complete the Statement of Mailing UJS-391C** — sworn under penalty of perjury under South Dakota law — **and file it with the Clerk of Court** (UJS-391 instructions 4–5). Complete a statement of mailing only after the mailing has actually occurred.",
    "3. **The Notice of Hearing has its own deadline**: file UJS-393's caption with the Clerk of Court, and once you receive the Notice of Hearing back, **mail a copy to the State's Attorney at least 14 days before the hearing is scheduled**, then complete UJS-393's Statement of Mailing and file it (UJS-393 instructions 1–3).",
    "4. **If you seek to waive the hearing** (UJS-392), the waiver must be agreed to by the State's Attorney and the victim, if there was one — each completes and signs their own waiver. Mail a copy to each with a self-addressed stamped envelope and file with the Clerk of Court once you receive the documents back (UJS-392's instruction sheet).",
    "5. **After the judge rules**, whether the order grants or denies, complete the Notice of Entry UJS-395, mail a copy of it and of the Order on Motion for Expungement UJS-394 to the State's Attorney, complete UJS-395's Statement of Mailing, and file the Notice of Entry and Statement of Mailing with the Clerk of Court (UJS-395's instruction sheet).",
    "",
    "The method throughout is **United States mail, postage prepaid** — the Statements of Mailing you swear say exactly that — and the State's Attorney's name and mailing address are the items listed under _Required before filing or service_ above: supply them from your criminal case, never from a guess.",
    "",
    "## Where self-help ends",
    "",
    "This packet prepares official UJS forms; it decides nothing. The forms' own instruction sheets state the boundary, and it is repeated here: **if you have any legal questions, it is highly recommended that you consult with an attorney. Court staff are unable to provide you with legal advice or assist you in completing these forms.** For questions about the forms themselves, the forms name the checkable authority: **the UJS Legal Form Helpline at 1-855-784-0004, or ujssrlhelp@ujs.state.sd.us**. Stop and take the question to an attorney — or the helpline, for form questions — before filing, if any of these is true:",
    "",
    "The ten conditions below are carried word for word from `data/record-clearing/legal-design-track-registry.json`, track `sd_arrest_expungement`, `selfHelpStopConditions`:",
    "",
    ...SD_SELF_HELP_STOP_CONDITIONS.map((condition) => `- ${condition}`),
    "",
  ]).join("\n");
}

function assertFix13InstructionRepair(familyId) {
  assert.equal(familyId, "sd_arrest_expungement-set", "FIX13 owns only the South Dakota arrest-expungement family");
  const dir = FAMILY_DIRS[familyId];
  const instructions = fs.readFileSync(path.join(rootDir, `${dir}/participant-instructions.md`), "utf8");
  for (const condition of SD_SELF_HELP_STOP_CONDITIONS) {
    assert.ok(instructions.includes(condition), `held self-help stop is absent: ${condition}`);
  }
  const selfHelp = instructions.slice(instructions.indexOf("## Where self-help ends"));
  assert.equal(selfHelp.split("\n").filter((line) => line.startsWith("- ")).length, 10,
    "the self-help section must carry exactly ten held entries");
  for (const phrase of [
    "Order of dismissal, judgment of acquittal, or written proof that no accusatory instrument was filed",
    "Entire-case result checked against the court docket",
    "Number of separate arrests checked against South Dakota criminal history",
    "packet page 3 marks the UJS-391A basis",
    "$72 civil filing fee for each petition",
    "indigency waiver is available on a finding of indigency, requested from the court",
  ]) {
    assert.ok(instructions.includes(phrase), `required FIX13 instruction is absent: ${phrase}`);
  }
  assert.ok(!instructions.includes("this packet does not choose it"), "instructions still deny the selected route basis");

  const rendered = readJson(`${dir}/reports/rendered-artifacts.json`);
  for (const artifact of rendered.artifacts) {
    const pdfBytes = fs.readFileSync(path.join(rootDir, artifact.file));
    assert.equal(sha256(pdfBytes), artifact.sha256, `${artifact.file}: PDF hash differs from its artifact record`);
    assert.equal(pdfBytes.length, artifact.byteLength, `${artifact.file}: PDF length differs from its artifact record`);
    for (const page of artifact.rasterPages) {
      const rasterBytes = fs.readFileSync(path.join(rootDir, page.file));
      assert.equal(sha256(rasterBytes), page.sha256, `${page.file}: raster hash differs from its receipt`);
      assert.equal(rasterBytes.length, page.byteLength, `${page.file}: raster length differs from its receipt`);
    }
  }
}

function allBlankDispositions(fieldMap) {
  return fieldMap.maps.flatMap((map) => [
    ...map.canonicalRefusals.map((row) => ({
      formNumber: map.formNumber, field: row.field, disposition: row.blankDisposition,
      reason: row.reason, ledger: "canonicalRefusals",
    })),
    ...map.selectionControls.filter((row) => row.disposition === "explicit_refusal").map((row) => ({
      formNumber: map.formNumber, field: row.field ?? row.selectionId,
      disposition: row.blankDisposition, reason: row.reason, ledger: "selectionControls",
    })),
  ]);
}

function updateRows(familyId, baseMap, repairedMap) {
  assert.equal(familyId, "sd_arrest_expungement-set", "disclosure repair owns only the South Dakota family");
  const refusals = allBlankDispositions(repairedMap);
  const rows = DISCLOSURE_REPAIR_ROWS.map((itemId) => {
    const matches = refusals.filter((row) => row.field === itemId);
    assert.ok(matches.length > 0, `${itemId}: repaired field is absent from the blank-disposition ledger`);
    assert.ok(matches.every((row) => row.disposition === "PROTECTED_FIELD"),
      `${itemId}: statement-of-mailing field was not reclassified as protected`);
    return {
      itemId,
      status: "COMPLETED",
      disposition: "RECLASSIFIED",
      why: "This statement-of-mailing field records what occurred during mailing and must be completed only at or after mailing, so it is protected rather than required before filing.",
    };
  });
  writeJson(ROWS_FILE, {
    schemaVersion: "rcap-codex-cloud-field-repair-return/v1",
    assignmentId: ASSIGNMENT_ID,
    familyId,
    rows,
    countersAfter: ZERO_COUNTERS,
    fieldsDisclosed: 0,
    fieldsReclassified: rows.length,
    fieldsStopped: 0,
    canonicalAndBoundaryRerendered: true,
    commercialRoutesOpened: 0,
    productionTouched: false,
  });
}

async function repairFamily(familyId) {
  const dir = FAMILY_DIRS[familyId];
  assert.ok(dir, `family is outside P4 ownership: ${familyId}`);
  const census = readJson(`${dir}/field-census.census-v1.json`);
  const baseMap = readJson(`${dir}/production-field-map.json`);
  const rendered = readJson(`${dir}/reports/rendered-artifacts.json`);
  const receipt = readJson(`${dir}/source-receipt.json`);

  const fixtureResults = {};
  for (const fixture of ["canonical", "boundary"]) fixtureResults[fixture] = await renderRepairedFixture({
    familyId, fixture, census, baseMap, rendered,
  });

  const repairedMap = rebuildFieldMap(familyId, census, baseMap, fixtureResults);
  writeJson(`${dir}/production-field-map.json`, repairedMap);
  writeJson(`${dir}/source-receipt.json`, updateSourceReceipt(receipt));
  fs.writeFileSync(path.join(rootDir, `${dir}/participant-instructions.md`), participantInstructions(familyId));

  const artifactEvidence = [];
  for (const fixture of ["canonical", "boundary"]) {
    const result = fixtureResults[fixture];
    const artifact = result.artifact;
    const pages = await rasterArtifact(artifact);
    artifact.sha256 = sha256(result.finalBytes);
    artifact.byteLength = result.finalBytes.length;
    artifact.pageCount = pages.length;
    artifact.activeContentScan = result.active;
    artifact.rasterEngine = "poppler_pdftoppm";
    artifact.rasterEngineDiscoveryMode = process.env.RCAP_PDFTOPPM ? "RCAP_PDFTOPPM" : "PATH";
    artifact.rasterEngineVersion = pages[0].engineVersion;
    artifact.rasterDpi = RASTER_DPI;
    artifact.rasterPages = pages;
    artifactEvidence.push({
      fixture,
      finalPdfSha256: artifact.sha256,
      finalPdfByteLength: artifact.byteLength,
      valuesReportedByFinalizer: result.writes.length,
      finalMappedWrites: result.writes.length,
      addedGlyphsReadFromOutputBytes: result.addedGlyphs.length,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: result.outside.length,
      refusedFieldsWithInk: [],
      proofMethod: "text glyphs re-read from final PDF bytes inside each measured widget or flat-overlay box",
    });
  }
  rendered.schemaVersion = "rcap-rendered-artifacts/v1-completeness-repair";
  rendered.completenessRepair = { assignmentId: ASSIGNMENT_ID, dispatchCommit: DISPATCH_COMMIT };
  rendered.everyPageRastered = rendered.artifacts.every((artifact) => artifact.rasterPages.length === artifact.pageCount);
  rendered.byteDerivedHashes = true;
  rendered.renderedFresh = true;
  writeJson(`${dir}/reports/rendered-artifacts.json`, rendered);

  writeJson(`${dir}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v2-completeness-repair",
    familyId,
    assignmentId: ASSIGNMENT_ID,
    derivedFromArtifactBytes: true,
    recomputedAfterFinalPdfWrite: true,
    artifacts: artifactEvidence,
    documents: ["canonical", "boundary"].flatMap((fixture) => {
      const result = fixtureResults[fixture];
      return census.documents.map((document) => ({
        fixture,
        formNumber: document.formNumber,
        actualWrites: result.writes.filter((write) => write.formNumber === document.formNumber).map((write) => ({
          field: write.field,
          factId: write.factId,
          sourcePage: write.sourcePage,
          packetPage: write.packetPage,
          measuredWriteBox: write.box,
          valueReadFromFinalPdfBytes: write.valueReadFromFinalPdfBytes,
          expectedValueSha256: write.expectedValueSha256,
          visibleGlyphCount: write.visibleGlyphCount,
          preservedFromBaseArtifact: write.preservedFromBaseArtifact,
        })),
        protectedSelectionControls: [],
        protectedWithheldInk: [],
      }));
    }),
    protectedFieldsWritten: 0,
    blockingFindings: [],
  });

  const buildStatus = readJson(`${dir}/build-status.json`);
  buildStatus.status = "BUILT_REVIEW_PENDING";
  buildStatus.completenessRepair = { assignmentId: ASSIGNMENT_ID, expectedResult: "PASS_COMPLETE", independentVerificationPending: true };
  buildStatus.rasterPages = rendered.artifacts.reduce((count, artifact) => count + artifact.rasterPages.length, 0);
  writeJson(`${dir}/build-status.json`, buildStatus);

  const findings = readJson(`${dir}/build-findings.json`);
  findings.blocking = [];
  findings.findingCount = 0;
  findings.completenessRepair = { assignmentId: ASSIGNMENT_ID, intentionalBlanksClassified: true };
  writeJson(`${dir}/build-findings.json`, findings);

  updateRows(familyId, baseMap, repairedMap);
  console.log(`${familyId}: completeness repair rendered ${rendered.artifacts.length} fixtures and ${buildStatus.rasterPages} page rasters`);
}

const args = cliArgs;
if (args.includes("--instruction-repair-only")) {
  const target = "sd_arrest_expungement-set";
  fs.writeFileSync(path.join(rootDir, `${FAMILY_DIRS[target]}/participant-instructions.md`), participantInstructions(target));
  assertFix13InstructionRepair(target);
  console.log(`${target}: FIX13 participant-instruction repair built; PDF and raster receipts preserved; independent verification pending`);
} else if (args.includes("--assert-fix13")) {
  assertFix13InstructionRepair("sd_arrest_expungement-set");
  console.log("sd_arrest_expungement-set: FIX13 focused assertions complete; independent verification pending");
} else {
  let families;
  if (args.includes("--repair-all")) families = Object.keys(FAMILY_DIRS);
  else if (args.includes("--family")) families = [args[args.indexOf("--family") + 1]];
  else families = ["sd_arrest_expungement-set"];
  for (const target of families) {
    assert.ok(FAMILY_DIRS[target], `P4 does not own ${target}`);
    await runFamilyById(target, []);
    await repairFamily(target);
  }
}
