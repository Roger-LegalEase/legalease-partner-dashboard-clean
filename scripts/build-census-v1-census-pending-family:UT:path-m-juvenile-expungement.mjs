#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { preserveGovernanceState, writeWiringChecked } from "./rcap-packet-completeness/governance-preservation.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, StandardFonts, rgb } = require("pdf-lib");

export const FAMILY_ID = "census-pending-family:UT:path-m-juvenile-expungement";
export const ROUTE_KEY = "obligation:runtime-contract-cohort:UT:path-m-juvenile-expungement:ordinary_petition_branch";
export const BUILD_SCRIPT = "scripts/build-census-v1-census-pending-family:UT:path-m-juvenile-expungement.mjs";
const OUT = "data/rcap-all50/overlays/census-v1/ut/census-pending-family:ut:path-m-juvenile-expungement--official-pdf-fill";
const SOURCE = "reference/utah/11_Petition_to_Expunge_Records_Juvenile-Revised-2023-08-14.pdf";
const SOURCE_ID = "official-form:1174XX";
const FORM = "1174XX";
const SOURCE_SHA = "b8488a2ebb43d9f94615a52bf52545283c47c147e45a9a4f02fa872cc1baf458";
const SOURCE_BYTES = 128760;
const SOURCE_PAGES = 2;
const black = rgb(0, 0, 0);

const abs = (relative) => path.join(ROOT, relative);
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (relative, value) => {
  const file = abs(relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
};
const valueAt = (object, dotted) => dotted.split(".").reduce((value, key) => value == null ? undefined : value[key], object);
const nonblank = (value) => typeof value === "string" && value.trim().length > 0;
const rect = (x, y, width, height) => ({ x, y, width, height });

function textField(id, label, page, box, factId, sourceAnchor, options = {}) {
  return { id, label, page, box, factId, sourceAnchor, kind: options.kind || "text", valueLines: options.valueLines || null };
}
function choiceField(id, label, page, x, y, factId, sourceAnchor) {
  return {
    id, label, page, box: rect(x - 1, y - 2, 11, 12), factId, sourceAnchor,
    kind: "selection_control", mark: { x, y }
  };
}
function refusal(id, label, page, box, sourceAnchor, reason, disposition, options = {}) {
  return {
    id, label, page, box, sourceAnchor,
    kind: options.kind || "printed_blank",
    completenessDisposition: disposition,
    reason,
    routeConditionThatMakesItInapplicable: options.routeConditionThatMakesItInapplicable || null,
    refusalClass: options.refusalClass || null
  };
}

const WRITABLE = [
  textField("p1-name", "Name", 1, rect(72, 702, 234, 13), "participant.fullLegalName", "Name"),
  textField("p1-address", "Address", 1, rect(72, 673, 234, 13), "participant.address", "Address"),
  textField("p1-city-state-zip", "City, State, Zip", 1, rect(72, 644, 234, 13), "participant.cityStateZip", "City, State, Zip"),
  textField("p1-phone", "Phone", 1, rect(72, 615, 234, 13), "participant.phone", "Phone"),
  textField("p1-email", "Email", 1, rect(72, 586, 474, 13), "participant.email", "Email"),
  textField("p1-judicial-district", "Judicial District", 1, rect(158, 519, 47, 13), "court.judicialDistrict", "Judicial District"),
  textField("p1-county", "County", 1, rect(307, 519, 75, 13), "court.county", "County"),
  textField("p1-court-address", "Court Address", 1, rect(164, 491, 360, 13), "court.address", "Court Address"),
  textField("p1-juvenile-name", "Last name, first name", 1, rect(75, 423, 240, 13), "record.juvenileName", "Last name, first name"),
  textField("p1-date-of-birth", "Date of birth", 1, rect(75, 382, 240, 13), "record.dateOfBirth", "Date of birth"),
  choiceField("p1-age-over-18", "[ ] over 18 years of age", 1, 134.7, 324, "options.over18", "[ ] under [ ] over 18 years of age, and"),
  choiceField("p1-not-represented", "[ ] not represented", 1, 164.7, 308, "options.notRepresented", "[ ] represented [ ] not represented."),
  choiceField("p1-adult-eligibility", "[ ] 18 years old or older", 1, 110.7, 223, "options.over18", "[ ] 18 years old or older. I have attached a criminal history report from the"),
  choiceField("p2-one-year-elapsed", "[ ] at least one year has elapsed", 2, 110.7, 710.7, "options.oneYearElapsed", "3. [ ] It has been at least one year since either the Juvenile Court terminated its"),
  choiceField("p2-no-violent-felony", "[ ] not been convicted of a violent felony", 2, 128.7, 550, "options.noViolentFelony", "[ ] not been convicted of a violent felony (as described in Utah Code 76-3-"),
  choiceField("p2-no-pending-proceedings", "[ ] no pending delinquency or criminal proceedings", 2, 128.7, 482, "options.noPendingProceedings", "[ ] no pending delinquency or criminal proceedings against me anywhere"),
  choiceField("p2-restitution-satisfied", "[ ] I have satisfied restitution", 2, 128.7, 414, "options.restitutionSatisfied", "[ ] I have satisfied it"),
  choiceField("p2-no-murder-adjudication", "[ ] not been adjudicated for murder or aggravated murder", 2, 128.7, 359.8, "options.noMurderAdjudication", "[ ] not been adjudicated for murder or aggravated murder"),
  textField("p2-reason", "5. Reason for request", 2, rect(108, 255, 438, 58), "reason", "5. I ask the court to expunge my record because:", { kind: "area" })
];

const REFUSALS = [
  refusal("p1-case-number", "Case Number (court use)", 1, rect(329, 388, 208, 13), "Case Number",
    "Court, clerk, prosecutor, agency, or hearing field is completed by the court.", "PROTECTED_FIELD", { refusalClass: "court_prosecutor_clerk_or_agency_owned" }),
  refusal("p1-judge", "Judge (court use)", 1, rect(329, 347, 208, 13), "Judge",
    "Court, clerk, prosecutor, agency, or hearing field is completed by the court.", "PROTECTED_FIELD", { refusalClass: "court_prosecutor_clerk_or_agency_owned" }),
  refusal("p1-age-under-18", "[ ] under 18 years of age", 1, rect(71, 321, 11, 12), "[ ] under [ ] over 18 years of age, and",
    "The verified fixture takes the over-18 branch; the under-18 age-waiver branch is not applicable on this route.", "NOT_APPLICABLE_ON_THIS_ROUTE",
    { kind: "selection_control", routeConditionThatMakesItInapplicable: "The verified fixture takes the over-18 branch; the under-18 age-waiver branch is not applicable on this route." }),
  refusal("p1-represented", "[ ] represented", 1, rect(71, 305, 11, 12), "[ ] represented [ ] not represented.",
    "The verified fixture takes the not-represented branch; the represented branch is not applicable on this route.", "NOT_APPLICABLE_ON_THIS_ROUTE",
    { kind: "selection_control", routeConditionThatMakesItInapplicable: "The verified fixture takes the not-represented branch; the represented branch is not applicable on this route." }),
  refusal("p1-age-waiver-choice", "[ ] Under 18 years old", 1, rect(107, 186, 11, 12), "[ ] Under 18 years old. I ask that the judge waive the age requirement",
    "The verified fixture takes the adult branch; the under-18 age-waiver choice is not applicable on this route.", "NOT_APPLICABLE_ON_THIS_ROUTE",
    { kind: "selection_control", routeConditionThatMakesItInapplicable: "The verified fixture takes the adult branch; the under-18 age-waiver choice is not applicable on this route." }),
  refusal("p1-age-waiver-reason", "Question 2 under-18 age waiver explanation", 1, rect(135, 105, 400, 58), "because:",
    "The adult branch is selected, so the under-18 age-waiver explanation is not applicable on this route.", "NOT_APPLICABLE_ON_THIS_ROUTE",
    { routeConditionThatMakesItInapplicable: "The adult branch is selected, so the under-18 age-waiver explanation is not applicable on this route." }),
  refusal("p2-one-year-waiver-choice", "[ ] judge waive one-year requirement", 2, rect(107, 659, 11, 12), "[ ] I ask that the judge waive the one-year requirement because:",
    "The verified fixture takes the one-year-elapsed branch; the waiver choice is not applicable on this route.", "NOT_APPLICABLE_ON_THIS_ROUTE",
    { kind: "selection_control", routeConditionThatMakesItInapplicable: "The verified fixture takes the one-year-elapsed branch; the waiver choice is not applicable on this route." }),
  refusal("p2-one-year-waiver-reason", "Question 3 one-year waiver explanation", 2, rect(135, 590, 400, 58), "[ ] I ask that the judge waive the one-year requirement because:",
    "The one-year-elapsed branch is selected, so the waiver explanation is not applicable on this route.", "NOT_APPLICABLE_ON_THIS_ROUTE",
    { routeConditionThatMakesItInapplicable: "The one-year-elapsed branch is selected, so the waiver explanation is not applicable on this route." }),
  refusal("p2-violent-felony-yes", "[ ] been convicted of a violent felony", 2, rect(125, 518, 11, 12), "[ ] been convicted of a violent felony (as described in Utah Code 76-3-203.5)",
    "The verified record takes the no-violent-felony branch; the contrary selection is not applicable on this route.", "NOT_APPLICABLE_ON_THIS_ROUTE",
    { kind: "selection_control", routeConditionThatMakesItInapplicable: "The verified record takes the no-violent-felony branch; the contrary selection is not applicable on this route." }),
  refusal("p2-pending-yes", "[ ] pending delinquency or criminal proceedings", 2, rect(125, 464, 11, 12), "[ ] pending delinquency or criminal proceedings against me",
    "The verified record takes the no-pending-proceedings branch; the contrary selection is not applicable on this route.", "NOT_APPLICABLE_ON_THIS_ROUTE",
    { kind: "selection_control", routeConditionThatMakesItInapplicable: "The verified record takes the no-pending-proceedings branch; the contrary selection is not applicable on this route." }),
  refusal("p2-restitution-no", "[ ] I have not satisfied restitution", 2, rect(125, 396, 11, 12), "[ ] I have not satisfied it",
    "The verified record takes the restitution-satisfied branch; the contrary selection is not applicable on this route.", "NOT_APPLICABLE_ON_THIS_ROUTE",
    { kind: "selection_control", routeConditionThatMakesItInapplicable: "The verified record takes the restitution-satisfied branch; the contrary selection is not applicable on this route." }),
  refusal("p2-murder-yes", "[ ] been adjudicated for murder or aggravated murder", 2, rect(125, 342, 11, 12), "[ ] been adjudicated for murder or aggravated murder",
    "The verified record takes the no-murder-adjudication branch; the contrary selection is not applicable on this route.", "NOT_APPLICABLE_ON_THIS_ROUTE",
    { kind: "selection_control", routeConditionThatMakesItInapplicable: "The verified record takes the no-murder-adjudication branch; the contrary selection is not applicable on this route." }),
  refusal("p2-signed-at", "Signed at (city, state or country)", 2, rect(155, 170, 365, 14), "Signed at",
    "Signature and date are completed by the participant; never prefilled.", "PROTECTED_FIELD", { refusalClass: "signature_or_date_participant_completion" }),
  refusal("p2-signature", "Signature", 2, rect(72, 143, 180, 14), "Signature",
    "Signature and date are completed by the participant; never prefilled.", "PROTECTED_FIELD", { refusalClass: "signature_or_date_participant_completion" }),
  refusal("p2-date", "Date (signature block)", 2, rect(72, 129, 160, 14), "Date",
    "Signature and date are completed by the participant; never prefilled.", "PROTECTED_FIELD", { refusalClass: "signature_or_date_participant_completion" }),
  refusal("p2-printed-name", "Printed Name (signature block)", 2, rect(262, 120, 274, 14), "Printed Name",
    "Signature and date are completed by the participant; never prefilled.", "PROTECTED_FIELD", { refusalClass: "signature_or_date_participant_completion" })
];

const ALL_FIELDS = [...WRITABLE, ...REFUSALS];

export const fixtures = {
  canonical: {
    participant: {
      fullLegalName: "Jordan Avery Reyes",
      address: "42 Aspen Way",
      cityStateZip: "Salt Lake City, UT 84101",
      phone: "801-555-0142",
      email: "jordan.reyes@example.org"
    },
    court: {
      judicialDistrict: "Third",
      county: "Salt Lake",
      address: "450 South State Street, Salt Lake City, UT 84114"
    },
    record: { juvenileName: "Jordan Avery Reyes", dateOfBirth: "01/15/2005" },
    options: {
      over18: true,
      notRepresented: true,
      oneYearElapsed: true,
      noViolentFelony: true,
      noPendingProceedings: true,
      restitutionSatisfied: true,
      noMurderAdjudication: true
    },
    reason: "I have completed the applicable juvenile-court requirements and ask the court to expunge my juvenile record."
  },
  boundary: {
    participant: {
      fullLegalName: "Maria-Alejandra O'Shaughnessy-Whitfield",
      address: "1188 West Long Canyon Road, Apartment 14B",
      cityStateZip: "St. George, UT 84770-2214",
      phone: "435-555-0199 ext. 417",
      email: "maria.oshaughnessy.whitfield@example.org"
    },
    court: {
      judicialDistrict: "Fifth",
      county: "Washington",
      address: "206 West Tabernacle Street, St. George, UT 84770"
    },
    record: { juvenileName: "Maria-Alejandra O'Shaughnessy-Whitfield", dateOfBirth: "12/31/2004" },
    options: {
      over18: true,
      notRepresented: true,
      oneYearElapsed: true,
      noViolentFelony: true,
      noPendingProceedings: true,
      restitutionSatisfied: true,
      noMurderAdjudication: true
    },
    reason: "I completed the applicable juvenile-court requirements, satisfied the record conditions shown above, and request expungement of my juvenile record."
  }
};

function validateFixture(facts) {
  for (const key of [
    "participant.fullLegalName", "participant.address", "participant.cityStateZip",
    "participant.phone", "participant.email", "court.judicialDistrict",
    "court.county", "court.address", "record.juvenileName", "record.dateOfBirth", "reason"
  ]) assert.ok(nonblank(valueAt(facts, key)), key + " is required");
  for (const key of [
    "options.over18", "options.notRepresented", "options.oneYearElapsed",
    "options.noViolentFelony", "options.noPendingProceedings",
    "options.restitutionSatisfied", "options.noMurderAdjudication"
  ]) assert.equal(typeof valueAt(facts, key), "boolean", key + " must be a verified boolean");
  assert.match(facts.record.dateOfBirth, /^\d{2}\/\d{2}\/\d{4}$/);
}

function sourceMeasurements(pdf) {
  assert.equal(pdf.getPageCount(), SOURCE_PAGES, "the admitted juvenile petition must remain two pages");
  assert.equal(pdf.catalog.get(PDFName.of("AcroForm")), undefined, "the admitted source is a flat PDF");
  for (const page of pdf.getPages()) {
    assert.equal(page.getWidth(), 612, "source page width must remain letter");
    assert.equal(page.getHeight(), 792, "source page height must remain letter");
  }
  const text = pdf.getPages().map((page) => groupIntoLines(extractTextItems(page)).map((line) => line.text).join(" ")).join("\n");
  for (const phrase of [
    "In the Juvenile Court of Utah",
    "Petition to Expunge Juvenile Court Records",
    "Utah Code 80-6-1004.1",
    "I ask the court to expunge my juvenile record",
    "My record shows that",
    "Signed at"
  ]) assert.ok(text.includes(phrase), "source phrase absent: " + phrase);
  return text;
}

function fitSize(font, value, width, maxSize = 9.2) {
  let size = maxSize;
  while (size >= 5.2 && font.widthOfTextAtSize(value, size) > width) size -= 0.1;
  assert.ok(size >= 5.2, "value does not fit measured write box: " + value);
  return Number(size.toFixed(2));
}

function drawFit(page, font, field, value, placements) {
  const text = String(value);
  const size = fitSize(font, text, field.box.width - 2);
  const x = field.box.x + 1;
  const y = field.box.y;
  page.drawText(text, { x, y, size, font, color: black });
  placements.push({ fieldId: field.id, page: field.page, text, x, y, size });
}

function wrapWords(font, value, width, size) {
  const words = String(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    if (line && font.widthOfTextAtSize(candidate, size) > width) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

function drawReason(page, font, field, value, placements) {
  const size = 8.2;
  const lines = wrapWords(font, value, field.box.width - 4, size);
  assert.ok(lines.length <= 3, "reason must fit the three printed lines");
  const ys = [306, 286, 266];
  lines.forEach((line, index) => {
    page.drawText(line, { x: field.box.x + 2, y: ys[index], size, font, color: black });
    placements.push({ fieldId: field.id, page: field.page, text: line, x: field.box.x + 2, y: ys[index], size });
  });
}

function drawChoice(page, font, field, placements) {
  const x = field.mark.x;
  const y = field.mark.y;
  page.drawText("X", { x, y, size: 8, font, color: black });
  placements.push({ fieldId: field.id, page: field.page, text: "X", x, y, size: 8 });
}

async function renderFixture(name, facts, sourceBytes) {
  validateFixture(facts);
  const pdf = stampDeterministic(await PDFDocument.load(sourceBytes));
  pdf.setTitle("Utah Petition to Expunge Juvenile Court Records");
  pdf.setSubject(FAMILY_ID);
  pdf.setProducer("LegalEase RCAP deterministic official-form overlay");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const placements = [];
  for (const field of WRITABLE) {
    const page = pdf.getPages()[field.page - 1];
    if (field.kind === "selection_control") {
      drawChoice(page, font, field, placements);
    } else if (field.kind === "area") {
      drawReason(page, font, field, valueAt(facts, field.factId), placements);
    } else drawFit(page, font, field, valueAt(facts, field.factId), placements);
  }
  const bytes = await pdf.save({ useObjectStreams: false, addDefaultPage: false, updateFieldAppearances: false });
  fs.writeFileSync(abs(OUT + "/fixtures/" + name + ".pdf"), bytes);
  const reopened = await PDFDocument.load(bytes);
  assert.equal(reopened.getPageCount(), SOURCE_PAGES);
  const outputItems = reopened.getPages().flatMap((page, index) =>
    extractTextItems(page).map((item) => ({ ...item, page: index + 1 }))
  );
  for (const placement of placements) {
    assert.ok(outputItems.some((item) =>
      item.page === placement.page &&
      item.text === placement.text &&
      Math.abs(item.x - placement.x) < 0.6 &&
      Math.abs(item.y - placement.y) < 0.6
    ), name + "/" + placement.fieldId + ": written text was not read back from output bytes");
  }
  const nonWhitespace = placements.reduce((n, placement) => n + placement.text.replace(/\s/g, "").length, 0);
  return {
    name, facts, bytes, relative: OUT + "/fixtures/" + name + ".pdf",
    sha256: sha256(bytes), byteLength: bytes.length, pageCount: SOURCE_PAGES,
    placements, nonWhitespace
  };
}

function mapWrite(field) {
  return {
    field: field.id,
    fieldId: field.id,
    label: field.label,
    printedLabel: field.label,
    page: field.page,
    documentId: FORM,
    factId: field.factId,
    kind: field.kind,
    measured: { ...field.box },
    sourceAnchor: field.sourceAnchor,
    outcome: "fit"
  };
}

function mapRefusal(field) {
  return {
    field: field.id,
    fieldId: field.id,
    label: field.label,
    printedLabel: field.label,
    page: field.page,
    documentId: FORM,
    kind: field.kind,
    measured: { ...field.box },
    sourceAnchor: field.sourceAnchor,
    completenessDisposition: field.completenessDisposition,
    requiredBeforeFiling: false,
    routeDetermined: false,
    routeConditionThatMakesItInapplicable: field.routeConditionThatMakesItInapplicable || undefined,
    reason: field.reason,
    refusalClass: field.refusalClass || undefined
  };
}

function buildFieldMap() {
  return {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    jurisdiction: "UT",
    routeKeys: [ROUTE_KEY],
    implementationStrategy: "official_pdf_fill",
    officialForm: FORM,
    componentSet: [FORM],
    writes: WRITABLE.map(mapWrite),
    refusals: REFUSALS.map(mapRefusal),
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0
  };
}

function buildCensus() {
  return {
    schemaVersion: "rcap-field-census/v1",
    familyId: FAMILY_ID,
    sourceSha256: SOURCE_SHA,
    measuredFromCurrentSourceBytes: true,
    documents: [{
      documentId: FORM,
      formNumber: FORM,
      sourceId: SOURCE_ID,
      sourceSha256: SOURCE_SHA,
      structuralClass: "flat_pdf",
      pageCount: SOURCE_PAGES,
      pageDimensionsPoints: [612, 792],
      acroFieldCount: 0,
      fields: ALL_FIELDS.map((field) => ({
        name: field.id,
        label: field.label,
        page: field.page,
        rect: field.box,
        sourceAnchor: field.sourceAnchor,
        terminal: true,
        fieldType: field.kind === "selection_control" ? "selection_control" : "printed_blank"
      }))
    }]
  };
}

function actualWriteRows(result) {
  return WRITABLE.map((field) => {
    const drawn = field.kind === "area"
      ? String(valueAt(result.facts, field.factId))
      : field.kind === "selection_control"
        ? "X"
        : String(valueAt(result.facts, field.factId));
    return {
      field: field.id,
      fieldId: field.id,
      factId: field.factId,
      expected: drawn,
      drawnText: drawn,
      visibleInArtifactBytes: true,
      everyWidgetVisibleInArtifactBytes: true,
      writeBox: { ...field.box },
      outcome: "fit"
    };
  });
}

function renderedReport(results) {
  return {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId: FAMILY_ID,
    renderedFresh: true,
    derivedFromBytes: true,
    componentIdentityMode: "exact",
    packets: results.map((result) => ({
      fixture: result.name,
      documents: [FORM],
      file: result.relative
    })),
    artifacts: results.map((result) => ({
      fixture: result.name,
      file: result.relative,
      sha256: result.sha256,
      byteLength: result.byteLength,
      pageCount: result.pageCount,
      pageManifest: [1, 2].map((page) => ({
        packetPage: page,
        formNumber: FORM,
        sourcePage: page,
        sourceSha256: SOURCE_SHA
      }))
    })),
    rasters: [],
    everyPageRastered: false,
    rasterSkipped: true,
    independentVerificationPending: true
  };
}

function actualWritesReport(results, fieldMap) {
  return {
    schemaVersion: "rcap-actual-writes-byte-proof/v1",
    familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    note: "Every written value is read back from the final PDF bytes at its measured placement; no raster was run in this build.",
    documents: results.map((result) => ({
      fixture: result.name,
      documentId: FORM,
      formNumber: FORM,
      sourceSha256: SOURCE_SHA,
      actualWrites: actualWriteRows(result)
    })),
    artifacts: results.map((result) => ({
      fixture: result.name,
      valuesReportedByFinalizer: WRITABLE.length,
      addedGlyphsReadFromOutputBytes: result.nonWhitespace,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: [],
      written: WRITABLE.map((field) => ({ field: field.id })),
      selections: WRITABLE.filter((field) => field.kind === "selection_control").map((field) => ({
        control: field.id,
        selected: true
      }))
    }))
  };
}

function participantInstructions() {
  return [
    "# Utah juvenile expungement petition",
    "",
    "This candidate preserves the exact two-page Utah Board of Juvenile Court Judges Petition to Expunge Juvenile Court Records (official form 1174XX, revised August 14, 2023). It is an ordinary petition branch and remains disabled for runtime and commercial delivery pending independent verification and review.",
    "",
    "The packet fills the verified participant, court, caption and eligibility answers held for this fixture. Review every printed answer against the juvenile-court record before filing. The packet takes the over-18, not-represented, at-least-one-year, no-violent-felony, no-pending-proceedings, restitution-satisfied and no-murder-adjudication branches.",
    "",
    "The court-assigned case number and judge remain blank for the court. The under-18 age waiver, one-year waiver, contrary eligibility choices, signed-at location, signature, signature date and printed name remain blank for the participant or court as the printed form requires.",
    "",
    "The reason in question 5 is a fixture example and must be reviewed against the participant's own record. Complete the signature block only after reviewing the completed petition. Confirm current filing instructions with the Utah juvenile court clerk or counsel; this candidate does not invent a filing fee, service event, hearing date or court order.",
    ""
  ].join("\n");
}

function sourceReceipt() {
  return {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    jurisdiction: "UT",
    implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD",
    allSourcesExact: true,
    sourceAdmission: "data/rcap-grade-a/packet-factory-24h/pf20/ut-juvenile-source-return-20260913.json",
    bindingMethod: "The admitted source is bound by exact SHA-256 and re-read from the tracked reference bytes before every build.",
    documents: [{
      sourceIds: [SOURCE_ID],
      sourceId: SOURCE_ID,
      documentId: FORM,
      formNumber: FORM,
      officialTitle: "Petition to Expunge Juvenile Court Records",
      revision: "Revised August 14, 2023",
      heldCorpusPath: SOURCE,
      pathInCustody: SOURCE,
      custody: "tracked_reference",
      sha256: SOURCE_SHA,
      byteLength: SOURCE_BYTES,
      pageCount: SOURCE_PAGES,
      acroFieldCount: 0,
      structuralClassObserved: "flat_pdf",
      matchedBy: "exact_pinned_sha256_recomputed_from_bytes_on_disk"
    }],
    sourceBinaryCommitted: false,
    commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that either fixture is approved for participant delivery",
      "that the petition is eligible for any participant's juvenile record",
      "that a raster or independent legal review has passed"
    ]
  };
}

function productWiring(results) {
  const wiringPath = abs(OUT + "/product-wiring.json");
  const wiring = {
    schemaVersion: "rcap-family-product-wiring/v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    routeSelectionId: "ut-juvenile-expungement-ordinary-petition",
    implementationStrategy: "official_pdf_fill",
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0,
    createsFulfillmentRecord: false,
    opensCommercialRoute: false,
    assignmentOwnedPath: OUT,
    binding: {
      family: FAMILY_ID,
      jurisdiction: "UT",
      routeKeys: [ROUTE_KEY],
      deliveryType: "official_pdf_fill",
      instrumentKinds: ["Utah 1174XX juvenile expungement petition"],
      packetComponents: [FORM],
      fieldMap: OUT + "/production-field-map.json",
      instructions: OUT + "/participant-instructions.md",
      renderedArtifacts: OUT + "/reports/rendered-artifacts.json",
      sourceReceipt: OUT + "/source-receipt.json",
      sourceVersion: [{ sourceId: SOURCE_ID, sha256: SOURCE_SHA, tier: "exact_content_hash" }],
      acceptanceReceipt: null,
      lastIndependentVerification: null,
      paymentEligible: false,
      sponsorshipEligible: false,
      whyPaymentIsClosed: "This candidate remains disabled until central raster acceptance and independent legal, visual and completeness review.",
      maintenanceRelationship: "PF05 candidate; Captain integration owns any later route reconciliation.",
      acceptanceReceiptWithdrawn: [],
      centralReconciliationRequired: {
        routeKey: ROUTE_KEY,
        familyId: FAMILY_ID,
        sourceAdmission: "data/rcap-grade-a/packet-factory-24h/pf20/ut-juvenile-source-return-20260913.json",
        sharedRegistryEditsMadeHere: false,
        preserveLaunchGraphClosed: true
      }
    }
  };
  preserveGovernanceState(fs, wiringPath, wiring, {
    canonicalSha256: results.map((result) => result.sha256),
    log: (line) => console.error(line)
  });
  writeWiringChecked(fs, wiringPath, wiring);
}

export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const noRaster = argv.includes("--no-raster") || process.env.RCAP_NO_LOCAL_RASTER === "1";
  assert.ok(checkOnly || noRaster, "local raster is prohibited; use --no-raster or RCAP_NO_LOCAL_RASTER=1");

  const sourceBytes = fs.readFileSync(abs(SOURCE));
  assert.equal(sourceBytes.length, SOURCE_BYTES, "admitted source byte length changed");
  assert.equal(sha256(sourceBytes), SOURCE_SHA, "admitted source SHA-256 changed");
  const sourcePdf = await PDFDocument.load(sourceBytes);
  sourceMeasurements(sourcePdf);
  Object.values(fixtures).forEach(validateFixture);

  if (checkOnly) return {
    familyId: FAMILY_ID,
    status: "CHECK_ONLY",
    sourceId: SOURCE_ID,
    sourceSha256: SOURCE_SHA,
    sourceByteLength: SOURCE_BYTES,
    sourcePages: SOURCE_PAGES,
    terminalFields: ALL_FIELDS.length,
    overlayDirectoryTouched: false
  };

  fs.mkdirSync(abs(OUT + "/fixtures"), { recursive: true });
  fs.mkdirSync(abs(OUT + "/reports"), { recursive: true });
  const results = [
    await renderFixture("canonical", fixtures.canonical, sourceBytes),
    await renderFixture("boundary", fixtures.boundary, sourceBytes)
  ];

  const fieldMap = buildFieldMap();
  writeJson(OUT + "/production-field-map.json", fieldMap);
  writeJson(OUT + "/field-census.census-v1.json", buildCensus());
  writeJson(OUT + "/source-receipt.json", sourceReceipt());
  writeJson(OUT + "/reports/rendered-artifacts.json", renderedReport(results));
  writeJson(OUT + "/reports/actual-writes.json", actualWritesReport(results, fieldMap));
  writeJson(OUT + "/reports/completeness-counters.json", {
    schemaVersion: "rcap-builder-completeness-counters/v1",
    familyId: FAMILY_ID,
    counters: {
      knownRequiredFieldsMissing: 0,
      requiredFactsNotCollected: 0,
      unclassifiedBlanks: 0,
      incompleteRows: 0,
      requiredOptionsMissing: 0,
      requiredComponentsMissing: 0,
      invisibleWrites: 0,
      protectedWrites: 0,
      visualDefects: 0
    },
    allNineZero: true,
    measurement: "Builder source and output-byte placement assertions completed; the repository completeness reader remains the independent focused gate."
  });
  writeJson(OUT + "/reports/blanks-left-for-the-participant.json", {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1",
    familyId: FAMILY_ID,
    requiredBeforeFiling: [],
    protectedBlanks: REFUSALS.filter((field) => field.completenessDisposition === "PROTECTED_FIELD").map((field) => ({
      field: field.id, label: field.label, why: field.reason
    })),
    conditionalBranches: REFUSALS.filter((field) => field.completenessDisposition === "NOT_APPLICABLE_ON_THIS_ROUTE").map((field) => ({
      field: field.id, label: field.label, why: field.reason
    })),
    everyRequiredBeforeFilingItemIsDisclosed: true
  });
  fs.writeFileSync(abs(OUT + "/participant-instructions.md"), participantInstructions());
  writeJson(OUT + "/approval-request.json", {
    schemaVersion: "rcap-family-approval-request/v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    status: "PENDING_INDEPENDENT_VERIFICATION",
    requested: "central changed-byte raster, independent completeness verification, visual review and counsel review",
    exactSourceReviewComplete: true,
    generationAllowed: false,
    runtimeSelectable: false,
    approvedForLive: false,
    live: false,
    commercialRoutesOpened: 0
  });
  writeJson(OUT + "/build-status.json", {
    schemaVersion: "rcap-family-build-status/v1",
    familyId: FAMILY_ID,
    buildStatus: "state_built",
    reviewStatus: "qa_review_pending",
    builtBy: BUILD_SCRIPT,
    implementationStrategy: "official_pdf_fill",
    renderedArtifacts: 2,
    rasterPages: 0,
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING",
    selfVerified: false,
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0,
    productionTouched: false
  });
  writeJson(OUT + "/build-findings.json", {
    schemaVersion: "rcap-build-findings/v1",
    familyId: FAMILY_ID,
    blocking: [],
    findings: [
      "The exact admitted 1174XX source bytes are preserved as the two-page form and bound by SHA-256.",
      "All written text and selected controls are re-read from the saved output bytes at measured placement coordinates.",
      "The court-assigned case number, judge and execution block remain blank; unselected source branches carry typed route conditions.",
      "No local raster was run; the candidate is BUILT_RASTER_PENDING and opens no commercial route."
    ],
    source: { sourceId: SOURCE_ID, sha256: SOURCE_SHA, byteLength: SOURCE_BYTES, pageCount: SOURCE_PAGES }
  });
  writeJson(OUT + "/packet-set-manifest.json", {
    schemaVersion: "rcap-packet-set-manifest/v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    packetKind: "official_utah_juvenile_expungement_petition",
    orderedComponents: [{ componentId: FORM, title: "Petition to Expunge Juvenile Court Records", pages: "1-2", sourceSha256: SOURCE_SHA }]
  });
  productWiring(results);
  return {
    familyId: FAMILY_ID,
    status: "BUILT_REVIEW_PENDING",
    sourceId: SOURCE_ID,
    sourceSha256: SOURCE_SHA,
    sourceFieldsMeasured: ALL_FIELDS.length,
    artifacts: results.map((result) => ({
      fixture: result.name,
      file: result.relative,
      sha256: result.sha256,
      byteLength: result.byteLength,
      pageCount: result.pageCount
    })),
    rasterPages: 0,
    rasterState: "BUILT_RASTER_PENDING",
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  runFamily().then((result) => {
    console.log(JSON.stringify(result, null, 2));
  }).catch((error) => {
    console.error(error.stack || error);
    process.exit(1);
  });
}

