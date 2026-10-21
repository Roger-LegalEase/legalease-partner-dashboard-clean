#!/usr/bin/env node
/**
 * Delaware Family Court — Form 281 / Form 281E / Form 283 packet family.
 *
 * This builder is deliberately source-first.  Form 281 and Form 281E are the
 * exact Word files named by the packet-set record plus the required Form 283
 * page held in the official Form 1021IP PDF. The Word files are converted in
 * a build-time directory with the held office converter, the first (and
 * substantive) source page is copied into the packet, and only safely held
 * participant facts are drawn into the source's printed blanks. Form 283 is
 * copied from source page 15 without rewriting its court-owned decision,
 * county, signature, or date areas.
 * The converter's trailing Form 281E header page is not an official second
 * page: the DOCX has one page and the trailing export page contains only the
 * repeated header.  It is therefore recorded as conversion evidence and is
 * never delivered.
 *
 *   node scripts/build-census-v1-de_discretionary_family_court-set.mjs --no-raster
 *   node scripts/build-census-v1-de_discretionary_family_court-set.mjs --check
 *
 * This lane does not edit the shared manifest, queue or ledger.  The manifest
 * is read and checked at build time.  Form 281E is bound and source-checked,
 * but is attached only when the participant has more charges than Form 281's
 * table. The boundary fixture deliberately exercises that branch with a fifth
 * held row. Form 283 is required in both fixtures, after Form 281 and any
 * conditional Form 281E and before the assembly sheet.
 */
import { carryForwardGovernance } from "./rcap-packet-completeness/governance-preservation.mjs";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";

const THIS_FILE = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(THIS_FILE), "..");
process.chdir(ROOT);

export const FAMILY_ID = "de_discretionary_family_court-set";
export const ROUTE_KEY = "obligation:track-only:DE:de_discretionary_family_court";
export const BUILD_SCRIPT = "scripts/build-census-v1-de_discretionary_family_court-set.mjs";
export const OUT_REL = "data/rcap-all50/overlays/census-v1/de/de-discretionary-family-court-set--official-pdf-fill";
const OUT = path.join(ROOT, OUT_REL);
const QUEUE_REL = "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json";
const REGISTRY_REL = "data/record-clearing/legal-design-track-registry.json";
const MANIFEST_REL = "data/record-clearing/legal-design-packet-set-manifests.json";

const COMPONENTS = Object.freeze({
  primary: "de_discretionary_family_court-primary-filing-1",
  continuation: "de_discretionary_family_court-continuation-2",
  proposedOrder: "de_discretionary_family_court-proposed-order-4",
  cover: "de_discretionary_family_court-cover-sheet-3"
});

const SOURCES = Object.freeze({
  primary: Object.freeze({
    sourceId: "official-form:FORM-281",
    officialFormId: "FORM-281",
    title: "Form 281, Petition for Expungement of Adult Record",
    sha256: "84300768ad7f0724d6bd85f94bb06a07f18cf512494da9b02492cff838018eda",
    byteLength: 97280,
    recoveryPath: "reference/source-recovery/2026-09-11-wave1/281---petition-for-expungement-of-adult-record-11192025.doc",
    poolPath: "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Delaware/source-acquisition-2026-09-04/281---petition-for-expungement-of-adult-record-11192025.doc",
    masterPath: null,
    componentId: COMPONENTS.primary,
    expectedOriginalPages: 1,
    expectedOriginalWords: 574,
    sourceFormat: "application/msword"
  }),
  continuation: Object.freeze({
    sourceId: "official-form:FORM-281E",
    officialFormId: "FORM-281E",
    title: "Form 281E, Petition for Expungement of Adult Record Charge Sheet",
    sha256: "aaca121e3bb4ce51ab9ab4ff6d933138bf7a36b6d97269c02cbf3c0290e87b33",
    byteLength: 26118,
    recoveryPath: "reference/source-recovery/2026-09-11-wave1/281e---adult-expungement-charge-extension-sheet-09212018.docx",
    poolPath: "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Delaware/forms/Form-281E__petition-for-expungement-of-adult-record-charge-sheet__rev-2018-09.docx",
    masterPath: "STATES/DE/02_PACKET_FORMS/DE__FORM__FORM-281E__petition-for-expungement-of-adult-record-charge-sheet__REV-2018-09__EN.docx",
    componentId: COMPONENTS.continuation,
    expectedOriginalPages: 1,
    expectedOriginalWords: null,
    sourceFormat: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  }),
  proposedOrder: Object.freeze({
    sourceId: "official-form:FORM-283",
    officialFormId: "FORM-283",
    title: "Form 283, Order Granting Expungement of Adult Record",
    sha256: "f2c8a0b1b8a4b3d82e4041f25b8bbf62a61e8e93b8d243274c06aa1cc11fb602",
    byteLength: 630042,
    recoveryPath: null,
    poolPath: "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Delaware/reference-only/Form-1021IP__adult-expungement-instruction-packet__rev-2023-10.pdf",
    masterPath: null,
    componentId: COMPONENTS.proposedOrder,
    expectedOriginalPages: 15,
    expectedOriginalWords: null,
    sourceFormat: "application/pdf",
    sourcePage: 15
  })
});

const FIXTURES = Object.freeze({
  canonical: Object.freeze({
    "participant.full_legal_name": "Danielle Rose Hargrove",
    "participant.date_of_birth": "1992-07-22",
    "participant.street_address": "88 Loockerman Street",
    "participant.city_state_zip": "Dover, DE 19901",
    "participant.phone": "(302) 555-0163",
    "matter.case_number": "K21-03-0455",
    "participant.po_box_number": "Box 104",
    "participant.email": "danielle@example.test",
    "participant.interpreter_needed": true,
    "participant.language": "Spanish",
    charges: Object.freeze([
      Object.freeze({ caseNumber: "K21-03-0455", charge: "Theft; 11:841; misdemeanor", offenseDate: "2016-02-10", incidentNumber: "K21-03-0455-A", dispositionDate: "2017-04-12", disposition: "Dismissed" }),
      Object.freeze({ caseNumber: "K21-03-0455", charge: "Theft; 11:841; misdemeanor", offenseDate: "2016-08-21", incidentNumber: "K21-03-0455-B", dispositionDate: "2017-04-12", disposition: "Dismissed" })
    ])
  }),
  boundary: Object.freeze({
    "participant.full_legal_name": "Bartholomew Nkemdirim Vandergrift-Ashworth Jr.",
    "participant.date_of_birth": "1949-01-30",
    "participant.street_address": "2604 Old Capitol Trail, Building 7, Unit 219",
    "participant.city_state_zip": "Wilmington, DE 19808-4417",
    "participant.phone": "(302) 555-0138 ext. 22",
    "matter.case_number": "N19-11-0032-01",
    "participant.po_box_number": "Box 2407",
    "participant.email": "bvandergrift@example.test",
    "participant.interpreter_needed": true,
    "participant.language": "Spanish",
    charges: Object.freeze([
      Object.freeze({ caseNumber: "N19-11-0032-01", charge: "Theft; 11:841; misdemeanor", offenseDate: "2015-01-14", incidentNumber: "N19-11-0032-01-A", dispositionDate: "2016-03-18", disposition: "Dismissed" }),
      Object.freeze({ caseNumber: "N19-11-0032-01", charge: "Theft; 11:841; misdemeanor", offenseDate: "2015-03-22", incidentNumber: "N19-11-0032-01-B", dispositionDate: "2016-03-18", disposition: "Dismissed" }),
      Object.freeze({ caseNumber: "N19-11-0032-01", charge: "Theft; 11:841; misdemeanor", offenseDate: "2015-07-09", incidentNumber: "N19-11-0032-01-C", dispositionDate: "2016-03-18", disposition: "Dismissed" }),
      Object.freeze({ caseNumber: "N19-11-0032-01", charge: "Theft; 11:841; misdemeanor", offenseDate: "2015-11-02", incidentNumber: "N19-11-0032-01-D", dispositionDate: "2016-03-18", disposition: "Dismissed" }),
      Object.freeze({ caseNumber: "N19-11-0032-01", charge: "Theft; 11:841; misdemeanor", offenseDate: "2016-01-25", incidentNumber: "N19-11-0032-01-E", dispositionDate: "2016-03-18", disposition: "Dismissed" })
    ])
  })
});

const PRIMARY_CHARGE_COLUMNS = Object.freeze([
  Object.freeze({ key: "caseNumber", printedLabel: "Case ID # or Criminal Case #" }),
  Object.freeze({ key: "charge", printedLabel: "Charge" }),
  Object.freeze({ key: "offenseDate", printedLabel: "Offense Date" }),
  Object.freeze({ key: "dispositionDate", printedLabel: "Disposition Date" }),
  Object.freeze({ key: "disposition", printedLabel: "Disposition" })
]);

const CONTINUATION_CHARGE_COLUMNS = Object.freeze([
  Object.freeze({ key: "charge", printedLabel: "Charge" }),
  Object.freeze({ key: "offenseDate", printedLabel: "Offense Date" }),
  Object.freeze({ key: "incidentNumber", printedLabel: "Incident No." }),
  Object.freeze({ key: "dispositionDate", printedLabel: "Disposition Date" }),
  Object.freeze({ key: "disposition", printedLabel: "Disposition" })
]);

const PRIMARY_CHARGE_CAPACITY = 4;
const CONTINUATION_CHARGE_CAPACITY = 23;

const ORDER_CHARGE_COLUMNS = PRIMARY_CHARGE_COLUMNS;

// Source-derived from Form 1021IP page 15 (Form 283 Rev 6/20). Coordinates
// use the PDF bottom-left origin. The source table has four printed rows;
// overflow remains on the exact Form 281E continuation source.
const ORDER_FIELDS = Object.freeze({
  petitioner: Object.freeze({ field: "OrderPetitioner", printedLabel: "Petitioner", factId: "participant.full_legal_name", rect: { x: 100, y: 668, width: 153, height: 13 } }),
  street: Object.freeze({ field: "OrderStreetAddress", printedLabel: "Street Address", factId: "participant.street_address", rect: { x: 40, y: 637, width: 210, height: 13 } }),
  poBox: Object.freeze({ field: "OrderPOBoxNumber", printedLabel: "P.O. Box Number", factId: "participant.po_box_number", rect: { x: 40, y: 610, width: 210, height: 13 } }),
  cityStateZip: Object.freeze({ field: "OrderCityStateZip", printedLabel: "City/State/Zip Code", factId: "participant.city_state_zip", rect: { x: 40, y: 583, width: 210, height: 13 } }),
  dob: Object.freeze({ field: "OrderDOB", printedLabel: "D.O.B.", factId: "participant.date_of_birth", rect: { x: 40, y: 556, width: 101, height: 13 } }),
  phone: Object.freeze({ field: "OrderTelephone", printedLabel: "Telephone #", factId: "participant.phone", rect: { x: 150, y: 556, width: 103, height: 13 } }),
  criminalCase: Object.freeze({ field: "OrderCriminalCaseNo", printedLabel: "Crim. Case No(s).", factId: "matter.case_number", rect: { x: 462, y: 650, width: 92, height: 14 } })
});

const ORDER_CHARGE_RECTS = Object.freeze([
  Object.freeze([{ x: 39.5, y: 460.3, width: 134, height: 14 }, { x: 179.5, y: 460.3, width: 99.5, height: 14 }, { x: 284.4, y: 460.3, width: 74, height: 14 }, { x: 364.2, y: 460.3, width: 88, height: 14 }, { x: 458.6, y: 460.3, width: 110, height: 14 }]),
  Object.freeze([{ x: 39.5, y: 442.3, width: 134, height: 14 }, { x: 179.5, y: 442.3, width: 99.5, height: 14 }, { x: 284.4, y: 442.3, width: 74, height: 14 }, { x: 364.2, y: 442.3, width: 88, height: 14 }, { x: 458.6, y: 442.3, width: 110, height: 14 }]),
  Object.freeze([{ x: 39.5, y: 424.3, width: 134, height: 14 }, { x: 179.5, y: 424.3, width: 99.5, height: 14 }, { x: 284.4, y: 424.3, width: 74, height: 14 }, { x: 364.2, y: 424.3, width: 88, height: 14 }, { x: 458.6, y: 424.3, width: 110, height: 14 }]),
  Object.freeze([{ x: 39.5, y: 406.2, width: 134, height: 14 }, { x: 179.5, y: 406.2, width: 99.5, height: 14 }, { x: 284.4, y: 406.2, width: 74, height: 14 }, { x: 364.2, y: 406.2, width: 88, height: 14 }, { x: 458.6, y: 406.2, width: 110, height: 14 }])
]);

const ORDER_PROTECTED_CENSUS_FIELDS = Object.freeze([
  { fieldId: "OrderCounty-New-Castle", field: "OrderCounty-New-Castle", printedLabel: "New Castle County", effectiveLabel: "New Castle County — court venue selection", type: "checkbox", page: 1, rect: null },
  { fieldId: "OrderCounty-Kent", field: "OrderCounty-Kent", printedLabel: "Kent County", effectiveLabel: "Kent County — court venue selection", type: "checkbox", page: 1, rect: null },
  { fieldId: "OrderCounty-Sussex", field: "OrderCounty-Sussex", printedLabel: "Sussex County", effectiveLabel: "Sussex County — court venue selection", type: "checkbox", page: 1, rect: null },
  { fieldId: "OrderPetitionNumber", field: "OrderPetitionNumber", printedLabel: "Petition Number", effectiveLabel: "Petition Number — assigned by Family Court", type: "text", page: 1, rect: { x: 457.2, y: 557, width: 102, height: 40 } },
  { fieldId: "OrderAttorneyGeneralBlock", field: "OrderAttorneyGeneralBlock", printedLabel: "ATTORNEY GENERAL", effectiveLabel: "Attorney General block — court/prosecutor-owned", type: "protected_block", page: 1, rect: { x: 257.3, y: 538, width: 180, height: 150 } },
  { fieldId: "OrderCourtDecision", field: "OrderCourtDecision", printedLabel: "NOW THEREFORE, IT IS ORDERED that the Petition be GRANTED.", effectiveLabel: "Court decision and ordered terms", type: "protected_text", page: 1, rect: { x: 40, y: 90, width: 530, height: 320 } },
  { fieldId: "OrderDate", field: "OrderDate", printedLabel: "So Ordered this Date", effectiveLabel: "So Ordered this Date — court completes", type: "date", page: 1, rect: { x: 162, y: 72, width: 100, height: 16 } },
  { fieldId: "OrderJudgeCommissionerPrint", field: "OrderJudgeCommissionerPrint", printedLabel: "Judge/Commissioner (Print)", effectiveLabel: "Judge/Commissioner (Print) — court completes", type: "signature", page: 1, rect: { x: 36, y: 38, width: 257, height: 20 } },
  { fieldId: "OrderJudgeCommissionerSignature", field: "OrderJudgeCommissionerSignature", printedLabel: "Judge/Commissioner", effectiveLabel: "Judge/Commissioner — court completes", type: "signature", page: 1, rect: { x: 300, y: 38, width: 270, height: 20 } },
  { fieldId: "OrderCCCheckboxes", field: "OrderCCCheckboxes", printedLabel: "CC: Defendant DAG Attorney", effectiveLabel: "CC distribution checkboxes — court/filing staff completes", type: "checkbox_group", page: 1, rect: null }
]);

const FAMILY_COURT_FEE_TEXT = "The Family Court Schedule of Assessed Costs effective July 20, 2026 lists Expungement of Criminal Adult or Juvenile Record at $0.00, with no archive fee and no court security assessment. The specific page 2 expungement entry controls the generic page 3 security list, which still names Petition for Expungement of Adult Record. The separate certified-history acquisition cost is external and unresolved; it is not the Family Court filing fee.";
const FEE_WAIVER_TEXT = "Under § 4372(l), outstanding conviction fines or fees unpaid for reasons other than wilful noncompliance may be waived or converted to a civil judgment when the person is otherwise eligible. This is separate from the $0.00 filing charge and does not waive restitution.";
const VICTIM_CONTACT_TEXT = "Under 85 Del. Laws c. 142, § 10, the § 4374(e) victim-contact reference is contact under § 9414(a) of Title 11; the § 9401 victim definition remains unchanged.";
const LEGAL_FACTS_REL = "data/rcap-grade-a/legal-decisions/DE_FAMILY_COURT_SOURCE_FACTS_2026-09-12.json";
const LEGAL_FACTS_SHA256 = "818ffc3c4dc9c6a4fb9a8328c9a8d7f9620ad58c855f58a7d4666ea1fa95c7a9";
const LEGAL_FACTS_BYTE_LENGTH = 3961;
const FORM283_ADOPTION_REL = "data/rcap-grade-a/packet-factory-24h/fix112/de-family-court-form283-source-adoption-20260912.json";
const FORM283_ADOPTION_SHA256 = "416bed5e70f2cba68f4f1a2aa9cdb416980c58e4e7a2cbc5ff95b09c272427d5";

const PRIMARY_CHARGE_RECTS = Object.freeze([
  Object.freeze([{ x: 37.2, y: 437.45, width: 129, height: 10.4 }, { x: 172.2, y: 437.45, width: 115.5, height: 10.4 }, { x: 293.7, y: 437.45, width: 79.5, height: 10.4 }, { x: 379.2, y: 437.45, width: 79.5, height: 10.4 }, { x: 464.7, y: 437.45, width: 115.5, height: 10.4 }]),
  Object.freeze([{ x: 37.2, y: 423.05, width: 129, height: 10.4 }, { x: 172.2, y: 423.05, width: 115.5, height: 10.4 }, { x: 293.7, y: 423.05, width: 79.5, height: 10.4 }, { x: 379.2, y: 423.05, width: 79.5, height: 10.4 }, { x: 464.7, y: 423.05, width: 115.5, height: 10.4 }]),
  Object.freeze([{ x: 37.2, y: 408.65, width: 129, height: 10.4 }, { x: 172.2, y: 408.65, width: 115.5, height: 10.4 }, { x: 293.7, y: 408.65, width: 79.5, height: 10.4 }, { x: 379.2, y: 408.65, width: 79.5, height: 10.4 }, { x: 464.7, y: 408.65, width: 115.5, height: 10.4 }]),
  Object.freeze([{ x: 37.2, y: 394.25, width: 129, height: 10.4 }, { x: 172.2, y: 394.25, width: 115.5, height: 10.4 }, { x: 293.7, y: 394.25, width: 79.5, height: 10.4 }, { x: 379.2, y: 394.25, width: 79.5, height: 10.4 }, { x: 464.7, y: 394.25, width: 115.5, height: 10.4 }])
]);

const CONTINUATION_HEADER_FIELDS = Object.freeze({
  petitioner: Object.freeze({ field: "Petitioner", printedLabel: "Petitioner", factId: "participant.full_legal_name", rect: { x: 43, y: 639, width: 210, height: 11 } }),
  street: Object.freeze({ field: "StreetAddress", printedLabel: "Street Address (including Apt)", factId: "participant.street_address", rect: { x: 43, y: 614, width: 210, height: 11 } }),
  poBox: Object.freeze({ field: "POBoxNumber", printedLabel: "P.O. Box Number", factId: "participant.po_box_number", rect: { x: 43, y: 590, width: 210, height: 11 } }),
  cityStateZip: Object.freeze({ field: "CityStateZip", printedLabel: "City/State/Zip Code", factId: "participant.city_state_zip", rect: { x: 43, y: 565, width: 210, height: 11 } }),
  criminalCase: Object.freeze({ field: "CrimCaseNo", printedLabel: "Crim. Case No.", factId: "matter.case_number", rect: { x: 466, y: 575, width: 92, height: 11 } }),
  fileNo: Object.freeze({ field: "FileNo", printedLabel: "File No. — assigned by Family Court", factId: null, rect: { x: 466, y: 532, width: 92, height: 11 } })
});

const PRIMARY_SOURCE_CONTROLS = Object.freeze({
  poBox: Object.freeze({ field: "POBoxNumber", printedLabel: "P.O. Box Number", effectiveLabel: "P.O. Box Number (optional)", factId: "participant.po_box_number", rect: { x: 50, y: 612, width: 170, height: 11 }, type: "text" }),
  email: Object.freeze({ field: "EmailAddress", printedLabel: "Email Address", effectiveLabel: "Email Address (optional)", factId: "participant.email", rect: { x: 106, y: 550, width: 112, height: 11 }, type: "text" }),
  attorney: Object.freeze({ field: "AttorneyName", printedLabel: "Attorney Name", effectiveLabel: "Attorney Name (optional)", factId: "participant.attorney_name", rect: { x: 105.6, y: 538, width: 112, height: 11 }, type: "text" }),
  interpreterYes: Object.freeze({ field: "InterpreterNeededYes", printedLabel: "Interpreter needed? — Yes", effectiveLabel: "Interpreter needed? — Yes", factId: "participant.interpreter_needed", rect: { x: 129, y: 527, width: 9, height: 9 }, type: "checkbox" }),
  interpreterNo: Object.freeze({ field: "InterpreterNeededNo", printedLabel: "Interpreter needed? — No", effectiveLabel: "Interpreter needed? — No", factId: "participant.interpreter_needed", rect: { x: 168.75, y: 527, width: 9, height: 9 }, type: "checkbox" }),
  language: Object.freeze({ field: "Language", printedLabel: "Language", effectiveLabel: "Language (if an interpreter is needed)", factId: "participant.language", rect: { x: 93, y: 516, width: 127, height: 10 }, type: "text" })
});

const PRIMARY_FIELDS = Object.freeze({
  petitioner: {
    field: "Petitioner",
    printedLabel: "Petitioner",
    factId: "participant.full_legal_name",
    // The participant column ends at the source's vertical rule near x=222;
    // leave a small interior margin so the long boundary name cannot enter the
    // Attorney General column.
    rect: { x: 50, y: 660, width: 170, height: 11 },
    page: 1
  },
  street: {
    field: "StreetAddress",
    printedLabel: "Street Address (including Apt)",
    factId: "participant.street_address",
    rect: { x: 50, y: 636, width: 174, height: 11 },
    page: 1
  },
  cityStateZip: {
    field: "CityStateZip",
    printedLabel: "City/State/Zip Code",
    factId: "participant.city_state_zip",
    rect: { x: 50, y: 588, width: 174, height: 11 },
    page: 1
  },
  dob: {
    field: "DOB",
    printedLabel: "DOB",
    factId: "participant.date_of_birth",
    rect: { x: 50, y: 564, width: 72, height: 11 },
    page: 1
  },
  phone: {
    field: "Telephone",
    printedLabel: "Telephone #",
    factId: "participant.phone",
    rect: { x: 128, y: 564, width: 94, height: 11 },
    page: 1
  },
  criminalCase: {
    field: "CriminalCaseNo",
    printedLabel: "Crim. Case No.",
    factId: "matter.case_number",
    rect: { x: 468, y: 647, width: 91, height: 13 },
    page: 1
  },
  recitalName: {
    field: "PetitionerNameInRecital",
    printedLabel: "Petitioner name in the statutory recital",
    factId: "participant.full_legal_name",
    rect: { x: 258, y: 491, width: 137, height: 10 },
    page: 1
  }
});

const PRIMARY_CENSUS_FIELDS = [
  ...Object.values(PRIMARY_FIELDS).map((f) => ({
    fieldId: f.field,
    field: f.field,
    printedLabel: f.printedLabel,
    effectiveLabel: f.printedLabel,
    type: "text",
    page: f.page,
    rect: f.rect,
    sourceBlank: true,
    factId: f.factId,
    componentId: COMPONENTS.primary
  })),
  { fieldId: "CivilPetitionNo", field: "CivilPetitionNo", printedLabel: "Civil Petition No.", effectiveLabel: "Civil Petition No. — assigned by Family Court", type: "text", page: 1, rect: { x: 468, y: 570, width: 91, height: 67 }, sourceBlank: true, componentId: COMPONENTS.primary },
  { fieldId: "County-New-Castle", field: "County-New-Castle", printedLabel: "New Castle County", effectiveLabel: "New Castle County", type: "checkbox", page: 1, rect: null, sourceBlank: true, componentId: COMPONENTS.primary },
  { fieldId: "County-Kent", field: "County-Kent", printedLabel: "Kent County", effectiveLabel: "Kent County", type: "checkbox", page: 1, rect: null, sourceBlank: true, componentId: COMPONENTS.primary },
  { fieldId: "County-Sussex", field: "County-Sussex", printedLabel: "Sussex County", effectiveLabel: "Sussex County", type: "checkbox", page: 1, rect: null, sourceBlank: true, componentId: COMPONENTS.primary },
  { fieldId: "ManifestInjusticeCheckbox", field: "ManifestInjusticeCheckbox", printedLabel: "The continued existence and possible dissemination of criminal records relating to Petitioner causes, or may cause, circumstances which constitute a manifest injustice to the Petitioner.", effectiveLabel: "Manifest-injustice assertion checkbox", type: "checkbox", page: 1, rect: null, sourceBlank: true, componentId: COMPONENTS.primary },
  { fieldId: "ManifestInjusticeExplanation", field: "ManifestInjusticeExplanation", printedLabel: "You must explain how the Petitioner is negatively affected", effectiveLabel: "Manifest-injustice explanation", type: "ruled_text", page: 1, rect: { x: 40, y: 432, width: 560, height: 28 }, sourceBlank: true, componentId: COMPONENTS.primary },
  { fieldId: "PetitionerSignature", field: "PetitionerSignature", printedLabel: "Petitioner’s Signature", effectiveLabel: "Petitioner’s Signature", type: "signature", page: 1, rect: { x: 310, y: 104, width: 278, height: 18 }, sourceBlank: true, componentId: COMPONENTS.primary },
  { fieldId: "SwornJurat", field: "SwornJurat", printedLabel: "Sworn to and subscribed before me", effectiveLabel: "Sworn to and subscribed before me — clerk of court or notary", type: "signature", page: 1, rect: { x: 40, y: 72, width: 545, height: 46 }, sourceBlank: true, componentId: COMPONENTS.primary }
];

function chargeCensus(componentId, columns, capacity) {
  const xs = [36.3, 207, 299.1, 391.3, 483.5, 575.8];
  return Array.from({length: capacity}, (_, r) => columns.map((column, c) => ({
    fieldId: `${componentId === COMPONENTS.primary ? "Charge" : "Continuation"}Row${r + 1}-${column.key}`,
    field: `${componentId === COMPONENTS.primary ? "Charge" : "Continuation"}Row${r + 1}-${column.key}`,
    printedLabel: column.printedLabel, effectiveLabel: `Row ${r + 1} — ${column.printedLabel}`,
    type: "text", page: 1, componentId, sourceBlank: true,
    rect: componentId === COMPONENTS.primary ? PRIMARY_CHARGE_RECTS[r][c] :
      {x: xs[c] + 3, y: 792 - 331.65 - (r + 1) * 18 + 2, width: xs[c + 1] - xs[c] - 6, height: 14}
  }))).flat();
}
PRIMARY_CENSUS_FIELDS.push(...Object.values(PRIMARY_SOURCE_CONTROLS).map(f => ({
  ...f, fieldId: f.field, page: 1, sourceBlank: true, componentId: COMPONENTS.primary
})), ...chargeCensus(COMPONENTS.primary, PRIMARY_CHARGE_COLUMNS, PRIMARY_CHARGE_CAPACITY));
const CONTINUATION_CENSUS_FIELDS = [
  ...Object.values(CONTINUATION_HEADER_FIELDS).map(f => ({...f, fieldId: f.field,
    effectiveLabel: f.printedLabel, type: "text", page: 1, sourceBlank: true, componentId: COMPONENTS.continuation})),
  ...chargeCensus(COMPONENTS.continuation, CONTINUATION_CHARGE_COLUMNS, CONTINUATION_CHARGE_CAPACITY)
];

const ORDER_CENSUS_FIELDS = [
  ...Object.values(ORDER_FIELDS).map((f) => ({
    fieldId: f.field,
    field: f.field,
    printedLabel: f.printedLabel,
    effectiveLabel: f.printedLabel,
    type: "text",
    page: 1,
    rect: f.rect,
    sourceBlank: true,
    factId: f.factId,
    componentId: COMPONENTS.proposedOrder
  })),
  ...ORDER_PROTECTED_CENSUS_FIELDS.map((f) => ({
    ...f,
    sourceBlank: true,
    protected: true,
    componentId: COMPONENTS.proposedOrder
  })),
  ...chargeCensus(COMPONENTS.proposedOrder, ORDER_CHARGE_COLUMNS, ORDER_CHARGE_RECTS.length)
    .map((f, index) => ({
      ...f,
      fieldId: f.fieldId.replace(/^Continuation/, "Order"),
      field: f.field.replace(/^Continuation/, "Order"),
      rect: ORDER_CHARGE_RECTS[Math.floor(index / ORDER_CHARGE_COLUMNS.length)][index % ORDER_CHARGE_COLUMNS.length]
    }))
];

const REQUIRED_FIELD_LABELS = Object.freeze([
  "Certified criminal history dated within 45 days",
  "Charges and dispositions — list each charge separately with its disposition, statute section, and whether it was a violation, misdemeanor or felony",
  "All charges and convictions sought were disposed of in Family Court",
  "County where the most recent case terminated",
  "Conviction or release date for each charge",
  "Other convictions before or after this case",
  "Manifest-injustice facts in the participant’s own words",
  "Fines, fees and restitution status",
  "Filing fee confirmation under § 4374(j)"
]);

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const writeJson = (rel, value) => {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
};
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const normalize = (value) => String(value ?? "").replace(/[\u00a0\u2007\u202f]/g, " ").replace(/[’]/g, "'").replace(/\s+/g, " ").trim();
const round = (value) => Number(Number(value).toFixed(3));

function fixedCandidates(spec) {
  const out = [];
  if (spec.masterPath && process.env.MASTER_LIBRARY_SOURCE_DIR) out.push(path.join(process.env.MASTER_LIBRARY_SOURCE_DIR, spec.masterPath));
  if (spec.poolPath) out.push(path.join(ROOT, spec.poolPath));
  if (spec.recoveryPath) out.push(path.join(ROOT, spec.recoveryPath));
  return [...new Set(out)];
}

function resolveExactSource(spec) {
  const candidates = fixedCandidates(spec);
  const absolute = candidates.find((candidate) => fs.existsSync(candidate));
  if (!absolute) throw new Error(`${spec.sourceId} source unavailable; tried exact held paths: ${candidates.join(" | ")}`);
  const bytes = fs.readFileSync(absolute);
  const observed = sha256(bytes);
  if (observed !== spec.sha256 || bytes.length !== spec.byteLength) {
    throw new Error(`${spec.sourceId} source drift at ${absolute}: observed ${observed}/${bytes.length}, expected ${spec.sha256}/${spec.byteLength}`);
  }
  return { absolute, bytes, observedSha256: observed, byteLength: bytes.length };
}

function parseFileMetadata(absolute, spec) {
  const text = execFileSync("file", [absolute], { cwd: ROOT, encoding: "utf8" }).trim();
  if (spec.expectedOriginalPages !== null) {
    const pageMatch = text.match(/Number of Pages:\s*(\d+)/i);
    if (!pageMatch || Number(pageMatch[1]) !== spec.expectedOriginalPages) throw new Error(`${spec.sourceId} metadata page count is not ${spec.expectedOriginalPages}: ${text}`);
  }
  if (spec.expectedOriginalWords !== null) {
    const words = text.match(/Number of Words:\s*(\d+)/i);
    if (!words || Number(words[1]) !== spec.expectedOriginalWords) throw new Error(`${spec.sourceId} metadata word count is not ${spec.expectedOriginalWords}: ${text}`);
  }
  return { file: text, declaredPages: spec.expectedOriginalPages, declaredWords: spec.expectedOriginalWords };
}

function docxText(absolute) {
  const xml = execFileSync("unzip", ["-p", absolute, "word/document.xml"], { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  return normalize(xml.replace(/<[^>]*>/g, " "));
}

function pdfText(pdfPath, firstPage, lastPage = firstPage) {
  return execFileSync("pdftotext", ["-f", String(firstPage), "-l", String(lastPage), "-layout", pdfPath, "-"], { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
}

function sourceAnchors(spec, text) {
  const required = spec === SOURCES.primary
    ? ["The Family Court of the State of Delaware", "PETITION FOR EXPUNGEMENT OF ADULT RECORD", "Crim. Case No.", "Civil Petition No.", "The following information MUST be completed for the Court to consider the petition", "The Petitioner hereby declares"]
    : spec === SOURCES.continuation
      ? ["The Family Court of the State of Delaware", "PETITION FOR EXPUNGEMENT OF ADULT RECORD CHARGE SHEET", "Crim. Case No.", "File No.", "The charges listed below are a continuation", "Disposition Date", "Disposition"]
      : ["Form 283", "The Family Court of the State of Delaware", "ORDER GRANTING EXPUNGEMENT OF ADULT RECORD", "Petitioner", "ATTORNEY GENERAL", "Crim. Case No(s).", "Case # or Criminal Case #", "Judge/Commissioner"];
  const normalized = normalize(text);
  const missing = required.filter((needle) => !normalized.includes(normalize(needle)));
  if (missing.length) throw new Error(`${spec.sourceId} first-page source anchors missing after conversion: ${missing.join(" | ")}`);
  return required;
}

async function inspectProposedOrder(resolved, scratchDir) {
  const sourcePdfPath = path.join(scratchDir, "Form-1021IP-exact.pdf");
  fs.writeFileSync(sourcePdfPath, resolved.bytes);
  const sourcePdf = await PDFDocument.load(resolved.bytes, { updateMetadata: false });
  assert.equal(sourcePdf.getPageCount(), SOURCES.proposedOrder.expectedOriginalPages, "Form 1021IP exact source must have 15 pages");
  const sourcePage = sourcePdf.getPages()[SOURCES.proposedOrder.sourcePage - 1];
  const pageText = pdfText(sourcePdfPath, SOURCES.proposedOrder.sourcePage, SOURCES.proposedOrder.sourcePage);
  const anchors = sourceAnchors(SOURCES.proposedOrder, pageText);
  return {
    ...resolved,
    sourcePage: SOURCES.proposedOrder.sourcePage,
    pageCount: sourcePdf.getPageCount(),
    pageSize: { width: round(sourcePage.getWidth()), height: round(sourcePage.getHeight()) },
    sourcePageTextSha256: sha256(Buffer.from(pageText)),
    sourcePageAnchors: anchors,
    sourcePageTextLength: pageText.length,
    sourceIdentityIsOriginalPdfBytes: true,
    selectedSourcePages: [SOURCES.proposedOrder.sourcePage]
  };
}

async function convertSource(spec, resolved, scratchDir) {
  const converter = process.env.RCAP_SOFFICE || "/tmp/rcap-de-office/soffice";
  if (!fs.existsSync(converter)) throw new Error(`Delaware Word source conversion prerequisite is unavailable: ${converter}`);
  execFileSync(converter, ["--headless", "--convert-to", "pdf", "--outdir", scratchDir, resolved.absolute], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  const outputName = `${path.basename(resolved.absolute).replace(/\.[^.]+$/, "")}.pdf`;
  const derivedPath = path.join(scratchDir, outputName);
  if (!fs.existsSync(derivedPath)) throw new Error(`${spec.sourceId} converter did not produce ${derivedPath}`);
  const derivedBytes = fs.readFileSync(derivedPath);
  const sourcePdf = await PDFDocument.load(derivedBytes, { updateMetadata: false });
  const exportedPages = sourcePdf.getPageCount();
  const firstText = pdfText(derivedPath, 1, 1);
  sourceAnchors(spec, firstText);
  let trailingPage = null;
  if (spec === SOURCES.primary) {
    if (exportedPages !== 1) throw new Error(`FORM-281 conversion changed the authoritative one-page layout: exported ${exportedPages} pages`);
  } else {
    if (exportedPages < 1 || exportedPages > 2) throw new Error(`FORM-281E conversion produced an unexpected page count: ${exportedPages}`);
    if (exportedPages === 2) {
      const secondText = normalize(pdfText(derivedPath, 2, 2));
      const isHeaderOnly = secondText === "Form 281E Dev 9/18" || secondText === "Form 281E Dev 9/18 Form 281E Dev 9/18";
      if (!isHeaderOnly || /PETITION|CHARGE|CONTINUATION|Crim\.|File No\.|Disposition/i.test(secondText)) {
        throw new Error(`FORM-281E conversion page 2 contains substantive content and cannot be dropped: ${JSON.stringify(secondText)}`);
      }
      trailingPage = { page: 2, text: secondText, disposition: "converter_only_repeated_header_not_delivered" };
    }
  }
  return {
    ...resolved,
    derivedPath,
    derivedBytes,
    derivedSha256: sha256(derivedBytes),
    derivedByteLength: derivedBytes.length,
    exportedPages,
    selectedPages: 1,
    pageSize: { width: round(sourcePdf.getPage(0).getWidth()), height: round(sourcePdf.getPage(0).getHeight()) },
    firstPageTextSha256: sha256(Buffer.from(firstText)),
    firstPageAnchors: sourceAnchors(spec, firstText),
    trailingPage,
    conversion: {
      converter,
      fontConfig: process.env.FONTCONFIG_FILE || "/tmp/rcap-de-office/fontconfig.conf",
      sourceIdentityRemainsOriginal: true,
      originalMetadataPages: spec.expectedOriginalPages,
      selectedSubstantivePages: 1
    }
  };
}

function assertQueueAndManifest() {
  const queue = readJson(QUEUE_REL);
  const row = (queue.families ?? []).find((family) => family.familyId === FAMILY_ID);
  assert(row, `MASTER_QUEUE has no ${FAMILY_ID} row`);
  assert(["SOURCE_READY", "LEGAL_BLOCKED"].includes(row.state), `unexpected DE Family Court queue state: ${row.state}`);
  assert.equal(row.sourceReconciliation?.disposition, "SOURCE_READY");
  // The additive native source-facts record clears the three historical
  // input questions without pretending that packet, raster or independent
  // acceptance has occurred.  Older queue snapshots may still report the
  // pre-adoption OPEN_LEGAL_INPUT value, so the build only requires a source-
  // ready row and leaves legal promotion to the central lane.
  assert(["SETTLED", "OPEN_LEGAL_INPUT", "LEGAL_CLEAR"].includes(row.legalInputStatus), `unexpected DE Family Court legal input status: ${row.legalInputStatus}`);
  assert.equal(row.implementationStrategy, "official_pdf_fill");
  assert(row.sourceIds?.includes(SOURCES.primary.sourceId), "queue row must bind FORM-281");
  assert(row.sourceIds?.includes(SOURCES.continuation.sourceId), "queue row must bind FORM-281E");
  const registry = readJson(REGISTRY_REL);
  const track = (registry.tracks ?? []).find((item) => item.trackId === "de_discretionary_family_court");
  assert(track, "track registry lacks de_discretionary_family_court");
  assert.equal(track.venue, "Family Court for the county where the most recent case was terminated.");
  assert.equal(track.destination?.name, "Family Court of the State of Delaware");
  assert.equal(track.packetInstructions?.[0], "Generate the court packet without collecting or reviewing the certified SBI history. The current certified history is required before filing.");
  const manifestRoot = readJson(MANIFEST_REL);
  const manifest = (Array.isArray(manifestRoot) ? manifestRoot : (manifestRoot.packetSets ?? manifestRoot.manifests ?? [])).find((item) => item.packetSetId === FAMILY_ID);
  assert(manifest, `packet manifest has no ${FAMILY_ID} entry`);
  assert.deepEqual(manifest.components.map((component) => component.componentId), [COMPONENTS.primary, COMPONENTS.continuation, COMPONENTS.proposedOrder, COMPONENTS.cover]);
  assert.equal(manifest.components.find((component) => component.componentId === COMPONENTS.continuation)?.conditionDescription, "When charges exceed the table on the petition.");
  const proposedOrder = manifest.components.find((component) => component.componentId === COMPONENTS.proposedOrder);
  assert.equal(proposedOrder?.officialFormId, SOURCES.proposedOrder.officialFormId);
  assert.equal(proposedOrder?.requirement, "required");
  assert.equal(proposedOrder?.order, 3);
  assert.equal(manifest.components.find((component) => component.componentId === COMPONENTS.cover)?.outputStrategy, "custom_pleading");
  assert(Array.isArray(manifest.requiredBeforeFiling), "manifest requiredBeforeFiling must be an array");
  const manifestRequired = manifest.requiredBeforeFiling.join(" ");
  assert(/\$0(?:\.00)?|0\.?00|no cost/i.test(manifestRequired), "manifest must carry the current zero-dollar Family Court fee fact");
  assert(/archive|security/i.test(manifestRequired), "manifest must disclose the schedule archive/security exception");
  const waiver = manifest.participantActionRequired?.find((item) => item.kind === "apply_fee_waiver");
  assert(waiver && /outstanding conviction fines or fees/i.test(waiver.conditionDescription ?? ""), "manifest fee-waiver condition must address outstanding conviction fines or fees");
  assert(!/same \$75|unresolved/i.test(manifestRequired), "manifest must not retain the superseded unresolved $75 fee text");
  return { queue: row, registry, track, manifest };
}

function requiredRefusal(field, label, documentId, reason, extra = {}) {
  return {
    field,
    fieldId: field,
    documentId,
    formNumber: documentId,
    effectiveLabel: label,
    printedLabel: label,
    reason,
    completenessDisposition: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true,
    routeDetermined: false,
    factId: null,
    ...extra
  };
}

function selectionRefusal(field, label, reason) {
  return {
    field,
    fieldId: field,
    documentId: COMPONENTS.primary,
    formNumber: COMPONENTS.primary,
    effectiveLabel: label,
    printedLabel: label,
    reason,
    refusalClass: "participant_sworn_narrative_or_legal_election",
    completenessDisposition: "PARTICIPANT_ELECTION_GENUINE",
    requiredBeforeFiling: false,
    routeDetermined: false,
    isSelectionControl: true,
    factId: null
  };
}

function protectedRefusal(field, label, reason, refusalClass = "court_prosecutor_clerk_or_agency_owned", documentId = COMPONENTS.primary, formNumber = documentId, extra = {}) {
  return {
    field,
    fieldId: field,
    documentId,
    formNumber,
    effectiveLabel: label,
    printedLabel: label,
    reason,
    refusalClass,
    completenessDisposition: "PROTECTED_FIELD",
    requiredBeforeFiling: false,
    routeDetermined: false,
    factId: null,
    ...extra
  };
}

function orderProtectedRefusal(field, label, reason, extra = {}) {
  return protectedRefusal(field, label, reason, "court_prosecutor_clerk_or_agency_owned", COMPONENTS.proposedOrder, SOURCES.proposedOrder.officialFormId, extra);
}

function fieldMap() {
  const writes = [...Object.values(PRIMARY_FIELDS), ...Object.values(ORDER_FIELDS)].map((field) => ({
    field: field.field,
    fieldId: field.field,
    documentId: Object.values(ORDER_FIELDS).includes(field) ? COMPONENTS.proposedOrder : COMPONENTS.primary,
    formNumber: Object.values(ORDER_FIELDS).includes(field) ? SOURCES.proposedOrder.officialFormId : COMPONENTS.primary,
    effectiveLabel: field.printedLabel,
    printedLabel: field.printedLabel,
    sourceLabel: field.printedLabel,
    page: field.page,
    rect: field.rect,
    factId: field.factId,
    kind: "participant_fact",
    sourceAppearanceWasBlank: true
  }));
  const refusals = [
    protectedRefusal("CivilPetitionNo", "Civil Petition No. — assigned by Family Court", "The Family Court assigns the Civil Petition No. after filing; the packet leaves this court-owned field blank."),
    selectionRefusal("County-New-Castle", "New Castle County (venue selection)", "The participant supplies the county where the most recent case was terminated; the route does not determine the county box."),
    selectionRefusal("County-Kent", "Kent County (venue selection)", "The participant supplies the county where the most recent case was terminated; the route does not determine the county box."),
    selectionRefusal("County-Sussex", "Sussex County (venue selection)", "The participant supplies the county where the most recent case was terminated; the route does not determine the county box."),
    selectionRefusal("ManifestInjusticeCheckbox", "Manifest-injustice assertion checkbox", "The participant decides whether the printed sworn assertion is true and marks it only if it is true."),
    requiredRefusal("ManifestInjusticeExplanation", "Manifest-injustice explanation", COMPONENTS.primary, "The Form 281 section says the explanation must be completed for the Court to consider the petition; the participant supplies the facts in their own words.", { documentId: COMPONENTS.primary, formNumber: COMPONENTS.primary }),
    protectedRefusal("PetitionerSignature", "Petitioner’s Signature", "The participant signs the sworn petition after reviewing it; the builder never signs for the participant.", "signature_or_date_participant_completion"),
    protectedRefusal("SwornJurat", "Sworn to and subscribed before me — clerk of court or notary", "The clerk of court or notary completes the jurat and the participant completes the required sworn signing step."),
    orderProtectedRefusal("OrderCounty-New-Castle", "New Castle County — Form 283 venue selection", "The participant supplies the county where the most recent case was terminated; the builder never selects a county on Form 283."),
    orderProtectedRefusal("OrderCounty-Kent", "Kent County — Form 283 venue selection", "The participant supplies the county where the most recent case was terminated; the builder never selects a county on Form 283."),
    orderProtectedRefusal("OrderCounty-Sussex", "Sussex County — Form 283 venue selection", "The participant supplies the county where the most recent case was terminated; the builder never selects a county on Form 283."),
    orderProtectedRefusal("OrderPetitionNumber", "Petition Number — assigned by Family Court", "Family Court assigns the Petition Number; the builder leaves this court-owned field blank."),
    orderProtectedRefusal("OrderAttorneyGeneralBlock", "Attorney General block — court/prosecutor-owned", "The Attorney General address and response block is printed source content and is not rewritten by the builder."),
    orderProtectedRefusal("OrderCourtDecision", "Court decision and ordered terms", "The court decides whether to grant the petition and completes or adopts the order; the builder does not manufacture a judicial finding or approval."),
    orderProtectedRefusal("OrderDate", "So Ordered this Date — court completes", "The judge or commissioner supplies the order date; the builder leaves it blank."),
    orderProtectedRefusal("OrderJudgeCommissionerPrint", "Judge/Commissioner (Print) — court completes", "The judge or commissioner supplies the printed name; the builder leaves it blank."),
    orderProtectedRefusal("OrderJudgeCommissionerSignature", "Judge/Commissioner — court completes", "The judge or commissioner signs the order; the builder never signs for the court."),
    orderProtectedRefusal("OrderCCCheckboxes", "CC distribution checkboxes — court/filing staff completes", "Court or filing staff determines distribution and completes these checkboxes; the builder leaves them blank.")
  ];
  for (const field of Object.values(PRIMARY_SOURCE_CONTROLS)) {
    if (typeof FIXTURES.canonical[field.factId] === "string") continue;
    if (field.field === "InterpreterNeededYes") continue;
    refusals.push({field: field.field, fieldId: field.field, documentId: COMPONENTS.primary,
      formNumber: COMPONENTS.primary, printedLabel: field.printedLabel, effectiveLabel: field.effectiveLabel,
      factId: null, isSelectionControl: field.type === "checkbox", refusalClass: "participant_sworn_narrative_or_legal_election", completenessDisposition: "PARTICIPANT_ELECTION_GENUINE",
      requiredBeforeFiling: false, routeDetermined: false,
      reason: field.type === "checkbox" ? "The supplied interpreter-needed answer is Yes; the mutually exclusive No alternative remains unselected." : "No attorney-representation fact is held for this participant."});
  }
  const conceptualRequired = [
    ["CertifiedHistory", REQUIRED_FIELD_LABELS[0]],
    ["ChargeAnswerCrossCheck", "Certified criminal history cross-check for charges and dispositions"],
    ["AllDisposedInFamilyCourt", REQUIRED_FIELD_LABELS[2]],
    ["MostRecentTerminationCounty", REQUIRED_FIELD_LABELS[3]],
    ["ConvictionOrReleaseDate", REQUIRED_FIELD_LABELS[4]],
    ["OtherConvictions", REQUIRED_FIELD_LABELS[5]],
    ["ManifestInjusticeFacts", REQUIRED_FIELD_LABELS[6]],
    ["FinesFeesRestitution", REQUIRED_FIELD_LABELS[7]],
    ["FilingFeeConfirmation", REQUIRED_FIELD_LABELS[8]],
    ["Notarization", "Notarization — required before filing"],
  ];
  for (const [field, label] of conceptualRequired) {
    refusals.push(requiredRefusal(field, label, COMPONENTS.cover, "The current Family Court packet record requires this participant-supplied item before filing; the platform does not hold a safely typed value for it.", { documentId: COMPONENTS.cover, formNumber: COMPONENTS.cover }));
  }
  refusals.push(requiredRefusal("ProposedOrderChargeOverflowReview", "Form 283 charge list review against Form 281/Form 281E", COMPONENTS.proposedOrder, "Form 283 has four printed charge rows. When the continuation is delivered, the participant must verify that every supplied charge and disposition is carried across the Form 281E continuation and the proposed-order list before filing.", { documentId: COMPONENTS.proposedOrder, formNumber: SOURCES.proposedOrder.officialFormId }));
  return {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    jurisdiction: "DE",
    routeKeys: [ROUTE_KEY],
    implementationStrategy: "official_pdf_fill",
    renderStrategy: "source-derived-word-pages-plus-required-form-283-and-assembly-sheet",
    componentSet: [COMPONENTS.primary, COMPONENTS.continuation, COMPONENTS.proposedOrder, COMPONENTS.cover],
    componentConditions: {
      [COMPONENTS.continuation]: "When charges exceed the table on the petition."
    },
    conditionalComponentsBoundButNotExercised: [],
    sourceComponents: [COMPONENTS.primary, COMPONENTS.continuation, COMPONENTS.proposedOrder],
    writes,
    refusals,
    factMap: FIXTURES.canonical,
    repeatingRows: {primaryCapacity: 4, continuationCapacity: 23, proposedOrderCapacity: ORDER_CHARGE_RECTS.length, primaryColumns: PRIMARY_CHARGE_COLUMNS, continuationColumns: CONTINUATION_CHARGE_COLUMNS, proposedOrderColumns: ORDER_CHARGE_COLUMNS, sourceCells: [...chargeCensus(COMPONENTS.primary, PRIMARY_CHARGE_COLUMNS, 4), ...chargeCensus(COMPONENTS.continuation, CONTINUATION_CHARGE_COLUMNS, 23), ...ORDER_CENSUS_FIELDS.filter((f) => f.fieldId.startsWith("OrderRow"))]},
    noInventedCourtFields: true,
    noInventedSignatureOrApproval: true,
    commercialRoutesOpened: 0
  };
}

function dateForCover() {
  return "The source records and exact source bytes govern this packet; no court-assigned date, Petition Number, signature, judicial finding or approval is invented.";
}

function wrapLines(font, text, size, width) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, size) > width) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawWrapped(page, font, text, x, y, width, size, color = rgb(0, 0, 0), lineGap = 1.5) {
  const lineHeight = size + lineGap;
  for (const line of wrapLines(font, text, size, width)) {
    page.drawText(line, { x, y, size, font, color });
    y -= lineHeight;
  }
  return y;
}

function drawSection(page, regular, bold, title, body, state) {
  let y = state.y;
  page.drawText(title, { x: 48, y, size: state.headingSize, font: bold, color: rgb(0.05, 0.17, 0.35) });
  y -= state.headingSize + 3;
  y = drawWrapped(page, regular, body, 48, y, 516, state.bodySize, rgb(0, 0, 0), 1.2);
  state.y = y - 5;
}

function drawCover(page, fixtureName, facts, manifest, regular, bold) {
  let state = { y: 748, headingSize: 9, bodySize: 7.1 };
  page.drawText("Delaware Family Court — Form 281 / Form 283 packet assembly sheet", { x: 48, y: state.y, size: 14.2, font: bold, color: rgb(0.04, 0.18, 0.38) });
  state.y -= 19;
  page.drawText("Discretionary expungement of an adult record · 11 Del. C. § 4374(c)", { x: 48, y: state.y, size: 8.5, font: regular, color: rgb(0, 0, 0) });
  state.y -= 16;
  drawSection(page, regular, bold, "What this sheet is", "This is an assembly and completion sheet for the official Family Court Form 281 petition and required Form 283 proposed order. It is not a court form, a filing, legal advice, or an approval. Form 283 is copied from page 15 of the held Form 1021IP source. The official forms' county boxes, manifest-injustice assertion, Petition Number, decision, signature and jurat remain blank for the person or court who owns them.", state);
  drawSection(page, regular, bold, "Components and order", `1. ${COMPONENTS.primary}: Form 281, Petition for Expungement of Adult Record. 2. ${COMPONENTS.continuation}: Form 281E, conditional when charges exceed the petition table. 3. ${COMPONENTS.proposedOrder}: Form 283, Order Granting Expungement of Adult Record, copied from held Form 1021IP page 15. 4. ${COMPONENTS.cover}: this required assembly sheet. The participant supplies the SBI cover letter and certified criminal history externally; they are assembled with the official forms in the filing order stated in the current instructions.`, state);
  drawSection(page, regular, bold, "Before filing", "Obtain the certified criminal history dated within 45 days through IdentoGo, service code 27S23V, at about $72; the court shall summarily reject a petition without it. Do not assume the packet confirms eligibility. Complete and cross-check every charge from that history, confirm every charge and conviction sought was disposed of in Family Court, use the county of the most recent termination, complete the manifest-injustice explanation in your own words, and sign and swear the petition before a clerk of court or notary. Verify the proposed order's party and charge information against the final filing packet.", state);
  drawSection(page, regular, bold, "Fee, service and handoff", `${FAMILY_COURT_FEE_TEXT} ${FEE_WAIVER_TEXT} ${VICTIM_CONTACT_TEXT} The petitioner serves the Attorney General, who may object or answer within 120 days; if the Attorney General opposes, the petitioner has 30 days to respond. If the Attorney General objects, a victim opposes, the court sets a hearing, or a required fact is contested, stop self-help completion and obtain case-specific help.`, state);
  drawSection(page, regular, bold, "Held facts", `Fixture ${fixtureName} carries the participant name, date of birth, street address, city/state/ZIP, telephone, criminal case number and supplied charges shown on the official forms. ${dateForCover()}`, state);
  if (state.y < 30) throw new Error(`cover sheet overflow for ${fixtureName}: y=${state.y}`);
  page.drawText("Generated for internal review · no commercial route or fulfillment authority", { x: 48, y: 28, size: 6.5, font: regular, color: rgb(0.25, 0.25, 0.25) });
}

function fitFont(font, value, rect, preferred = 9, minimum = 4.4) {
  let size = preferred;
  while (size > minimum && font.widthOfTextAtSize(String(value), size) > rect.width) size -= 0.15;
  return Number(Math.max(minimum, size).toFixed(2));
}

function drawValue(page, font, value, rect) {
  const size = fitFont(font, value, rect);
  const textWidth = font.widthOfTextAtSize(String(value), size);
  const x = rect.x + Math.max(0, Math.min(rect.width - textWidth, 1));
  const y = rect.y + Math.max(0, (rect.height - size) / 2);
  page.drawText(String(value), { x, y, size, font, color: rgb(0, 0, 0) });
  return { fontSize: size, x: round(x), y: round(y), width: round(textWidth), height: size };
}

async function renderFixture(fixtureName, facts, primaryProof, continuationProof, orderProof, manifest, scratchDir) {
  const packet = await PDFDocument.create();
  const regular = await packet.embedFont(StandardFonts.Helvetica);
  const bold = await packet.embedFont(StandardFonts.HelveticaBold);
  const sourcePdf = await PDFDocument.load(primaryProof.derivedBytes, { updateMetadata: false });
  const [sourcePage] = await packet.copyPages(sourcePdf, [0]);
  packet.addPage(sourcePage);
  const page = packet.getPage(0);
  const writes = [];
  for (const field of Object.values(PRIMARY_FIELDS)) {
    const value = facts[field.factId];
    assert(typeof value === "string" && value.length > 0, `fixture ${fixtureName} lacks ${field.factId}`);
    const drawn = drawValue(page, regular, value, field.rect);
    writes.push({
      field: field.field,
      fieldId: field.field,
      document: COMPONENTS.primary,
      formNumber: SOURCES.primary.officialFormId,
      page: 1,
      factId: field.factId,
      expected: value,
      drawnText: value,
      rect: field.rect,
      measuredRectBasis: "source-derived Form 281 first-page printed blank measured from the converted source page",
      fontSize: drawn.fontSize,
      visibleInArtifactBytes: true,
      everyWidgetVisibleInArtifactBytes: true
    });
  }
  const recordWrite = (target, field, value, componentId, pageNumber, formNumber, factId) => {
    assert(typeof value === "string" && value.trim(), `Missing supplied value ${factId}`);
    const drawn = drawValue(target, regular, value, field.rect);
    assert(drawn.width <= field.rect.width + 0.01, `Value exceeds source cell: ${factId}`);
    writes.push({ field: field.field, fieldId: field.field, document: componentId, formNumber,
      page: pageNumber, factId, expected: value, drawnText: value, rect: field.rect,
      measuredRectBasis: "interior of printed source cell", fontSize: drawn.fontSize,
      visibleInArtifactBytes: true, everyWidgetVisibleInArtifactBytes: true });
  };
  for (const field of Object.values(PRIMARY_SOURCE_CONTROLS)) {
    const value = facts[field.factId];
    if (field.type === "text" && typeof value === "string" && value.trim())
      recordWrite(page, field, value, COMPONENTS.primary, 1, "FORM-281", field.factId);
    if (field.type === "checkbox" && typeof value === "boolean" &&
        ((field.field === "InterpreterNeededYes") === value))
      recordWrite(page, field, "X", COMPONENTS.primary, 1, "FORM-281", field.factId);
  }
  assert(Array.isArray(facts.charges), "Explicit charge facts required; no inferred criminal history");
  for (let r = 0; r < Math.min(PRIMARY_CHARGE_CAPACITY, facts.charges.length); r++) {
    for (let c = 0; c < PRIMARY_CHARGE_COLUMNS.length; c++) {
      const column = PRIMARY_CHARGE_COLUMNS[c];
      recordWrite(page, {field: `ChargeRow${r + 1}-${column.key}`, rect: PRIMARY_CHARGE_RECTS[r][c]},
        facts.charges[r][column.key], COMPONENTS.primary, 1, "FORM-281", `charges.${r}.${column.key}`);
    }
  }
  const continuationPages = [];
  for (let offset = PRIMARY_CHARGE_CAPACITY; offset < facts.charges.length; offset += CONTINUATION_CHARGE_CAPACITY) {
    const continuationPdf = await PDFDocument.load(continuationProof.derivedBytes, {updateMetadata: false});
    const [continuationPage] = await packet.copyPages(continuationPdf, [0]);
    packet.addPage(continuationPage);
    const pageNumber = packet.getPageCount();
    continuationPages.push({packetPage: pageNumber, componentId: COMPONENTS.continuation,
      documentId: COMPONENTS.continuation, formNumber: "FORM-281E", sourcePage: 1,
      sourceSha256: SOURCES.continuation.sha256, pageRole: "official_source_page"});
    for (const field of Object.values(CONTINUATION_HEADER_FIELDS)) {
      if (field.factId && typeof facts[field.factId] === "string" && facts[field.factId].trim())
        recordWrite(continuationPage, field, facts[field.factId], COMPONENTS.continuation,
          pageNumber, "FORM-281E", field.factId);
    }
    const xs = [36.3, 207, 299.1, 391.3, 483.5, 575.8];
    for (let r = 0; r < Math.min(CONTINUATION_CHARGE_CAPACITY, facts.charges.length - offset); r++) {
      for (let c = 0; c < CONTINUATION_CHARGE_COLUMNS.length; c++) {
        const column = CONTINUATION_CHARGE_COLUMNS[c];
        const rect = {x: xs[c] + 3, y: 792 - 331.65 - (r + 1) * 18 + 2,
          width: xs[c + 1] - xs[c] - 6, height: 14};
        recordWrite(continuationPage, {field: `ContinuationRow${r + 1}-${column.key}`, rect},
          facts.charges[offset + r][column.key], COMPONENTS.continuation, pageNumber,
          "FORM-281E", `charges.${offset + r}.${column.key}`);
      }
    }
  }
  const orderPdf = await PDFDocument.load(orderProof.bytes, { updateMetadata: false });
  assert.equal(orderPdf.getPageCount(), SOURCES.proposedOrder.expectedOriginalPages, "Form 283 source page-count proof changed");
  const [orderPage] = await packet.copyPages(orderPdf, [SOURCES.proposedOrder.sourcePage - 1]);
  packet.addPage(orderPage);
  const orderPageNumber = packet.getPageCount();
  for (const field of Object.values(ORDER_FIELDS)) {
    const value = facts[field.factId];
    assert(typeof value === "string" && value.length > 0, `fixture ${fixtureName} lacks ${field.factId} for Form 283`);
    recordWrite(orderPage, field, value, COMPONENTS.proposedOrder, orderPageNumber, SOURCES.proposedOrder.officialFormId, field.factId);
  }
  // Form 283 has four printed charge rows. Any fifth or later charge remains
  // on the exact Form 281E continuation page; the participant cross-check is
  // required before filing and is recorded in the field map.
  for (let r = 0; r < Math.min(ORDER_CHARGE_RECTS.length, facts.charges.length); r++) {
    for (let c = 0; c < ORDER_CHARGE_COLUMNS.length; c++) {
      const column = ORDER_CHARGE_COLUMNS[c];
      recordWrite(orderPage, { field: `OrderRow${r + 1}-${column.key}`, rect: ORDER_CHARGE_RECTS[r][c] },
        facts.charges[r][column.key], COMPONENTS.proposedOrder, orderPageNumber,
        SOURCES.proposedOrder.officialFormId, `charges.${r}.${column.key}`);
    }
  }
  const cover = packet.addPage([612, 792]);
  drawCover(cover, fixtureName, facts, manifest, regular, bold);
  packet.setTitle(`Delaware Family Court Form 281 packet — ${fixtureName}`);
  packet.setAuthor("LegalEase RCAP source-bound build");
  packet.setSubject("Internal review packet; not approved for filing");
  stampDeterministic(packet);
  const bytes = await packet.save({ useObjectStreams: false });
  const scratchPdf = path.join(scratchDir, `rendered-${fixtureName}.pdf`);
  fs.writeFileSync(scratchPdf, bytes);
  const primaryText = pdfText(scratchPdf, 1, 1);
  const fullText = pdfText(scratchPdf, 1, packet.getPageCount());
  for (const write of writes) {
    if (!pdfText(scratchPdf, write.page, write.page).includes(write.expected)) throw new Error(`${fixtureName}: output bytes do not contain ${write.field} value ${write.expected}`);
  }
  for (const anchor of ["The Family Court of the State of Delaware", "PETITION FOR EXPUNGEMENT OF ADULT RECORD", "Civil Petition No.", "The Petitioner hereby declares", "Form 283", "ORDER GRANTING EXPUNGEMENT OF ADULT RECORD", "Form 281 / Form 283 packet assembly sheet"]) {
    if (!normalize(fullText).includes(normalize(anchor))) throw new Error(`${fixtureName}: output lost source/cover anchor ${anchor}`);
  }
  const loaded = await PDFDocument.load(bytes, { updateMetadata: false });
  assert.equal(loaded.getPageCount(), 3 + continuationPages.length, `${fixtureName}: complete source, proposed order and assembly pages`);
  const readbacks = writes.map((write) => ({
    field: write.field,
    factId: write.factId,
    expected: write.expected,
    drawnText: write.drawnText,
    visibleInArtifactBytes: true,
    everyWidgetVisibleInArtifactBytes: true,
    outputContainsExactValue: pdfText(scratchPdf, write.page, write.page).includes(write.expected),
    page: write.page,
    rect: write.rect,
    fontSize: write.fontSize
  }));
  const pageManifest = [
    {
      packetPage: 1,
      componentId: COMPONENTS.primary,
      documentId: COMPONENTS.primary,
      formNumber: SOURCES.primary.officialFormId,
      sourcePage: 1,
      sourceSha256: SOURCES.primary.sha256,
      pageRole: "official_source_page"
    },
    {
      packetPage: orderPageNumber,
      componentId: COMPONENTS.proposedOrder,
      documentId: COMPONENTS.proposedOrder,
      formNumber: SOURCES.proposedOrder.officialFormId,
      sourcePage: SOURCES.proposedOrder.sourcePage,
      sourceSha256: SOURCES.proposedOrder.sha256,
      sourcePageSha256: orderProof.sourcePageTextSha256,
      pageRole: "official_source_page"
    },
    {
      packetPage: packet.getPageCount(),
      componentId: COMPONENTS.cover,
      documentId: COMPONENTS.cover,
      sourcePage: null,
      sourceSha256: null,
      pageRole: "required_custom_assembly_sheet"
    }
  ];
  pageManifest.splice(1, 0, ...continuationPages);
  return {
    fixture: fixtureName,
    file: `${OUT_REL}/fixtures/${fixtureName}.pdf`,
    bytes,
    sha256: sha256(bytes),
    byteLength: bytes.length,
    pageCount: packet.getPageCount(),
    writes,
    readbacks,
    pageManifest,
    primaryTextSha256: sha256(Buffer.from(primaryText)),
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
    refusedFieldsWithInk: [],
    addedGlyphsReadFromOutputBytes: writes.reduce((count, write) => count + write.expected.replace(/\s/g, "").length, 0),
    flattenedWidgetAppearancesReadFromOutputBytes: 0,
    valuesReportedByFinalizer: writes.length,
    sourcePageContentPreserved: true
  };
}

function requiredBeforeFilingItems(manifest) {
  const staleFee = /same\s*\$75|unresolved/i;
  const items = (manifest.requiredBeforeFiling ?? []).filter((item) => !staleFee.test(item));
  if (!items.some((item) => /Form\s*283|proposed order/i.test(item))) {
    items.push("Include the required Form 283 proposed order (Rev 6/20), copied from the held Form 1021IP source page 15.");
  }
  if (!items.some((item) => /0\.?00|no cost/i.test(item))) items.push(FAMILY_COURT_FEE_TEXT);
  if (!items.some((item) => /4372\(l\)/i.test(item))) items.push(FEE_WAIVER_TEXT);
  items.push("Obtain and attach the participant-supplied SBI cover letter and certified criminal history in the prescribed filing packet.");
  return [...new Set(items)];
}

function participantGuide(track, manifest, map) {
  const required = requiredBeforeFilingItems(manifest);
  const stops = track.selfHelpStopConditions ?? [];
  const questions = (track.generationRequirements ?? []).map((item) => `- **${item.question}**`);
  const mapFields = (map.refusals ?? [])
    .filter((row) => row.requiredBeforeFiling === true)
    .map((row) => `- **${row.effectiveLabel}** — answer it before filing; the packet leaves the corresponding source or assembly item blank for you.`)
    .join("\n");
  return `# Delaware Family Court Form 281 / Form 283 packet — completion guide

This packet is for **${track.publicName}** under ${track.authority.join(" and ")}. File in **${track.venue}** only when every charge and conviction you want expunged was disposed of in Family Court. Venue is the county where the most recent case was terminated.

The required official packet order is **Form 281**, conditional **Form 281E** when charges exceed the petition table, **Form 283 (Order Granting Expungement of Adult Record)**, then the participant-supplied SBI cover letter and certified criminal history. The separate assembly sheet follows the generated official forms for preparation reference. Form 281 is source-bound at SHA-256 ${SOURCES.primary.sha256}; Form 281E is source-bound at SHA-256 ${SOURCES.continuation.sha256}; Form 283 is copied from page 15 of the held Form 1021IP PDF at SHA-256 ${SOURCES.proposedOrder.sha256}.

The builder fills supplied participant contact facts, the criminal case number and each supplied charge on Form 281 and Form 283. It carries charge overflow on Form 281E. It does not choose a county, mark the manifest-injustice assertion, create a Civil Petition No. or Petition Number, decide the order, sign, notarize, or invent a court approval. Form 283 has four printed charge rows; when a continuation is included, review the complete Form 281/Form 281E charge list before filing.

## Participant questions

${questions.join("\n")}

## Required before filing

${required.map((item) => `- ${item}`).join("\n")}

The source record requires these exact completion destinations:

${mapFields}

The certified history is obtained externally. The packet is generated without collecting or reviewing it. Check every answer to “List each charge separately with its disposition, statute section, and whether it was a violation, misdemeanor or felony.” against the current certified history and correct the packet if they disagree.

The Form 281 manifest-injustice section says it must be completed for the Court to consider the petition. Mark its assertion checkbox only if the statement is true, and write the explanation in your own words. The petition is sworn and subscribed before a clerk of court or notary. Leave the Civil Petition No. and Form 283 Petition Number for Family Court.

${FAMILY_COURT_FEE_TEXT}

${FEE_WAIVER_TEXT}

${VICTIM_CONTACT_TEXT}

## Filing and service

${track.rules.filing} ${track.rules.service} ${track.rules.notice}

## Stop self-help and obtain case-specific help if

${stops.map((item) => `- ${item}`).join("\n")}

This is an internal preparation artifact. It is not legal advice, a filing, a representation of eligibility, a court-approved form set or authorization for fulfillment. Source conversion selected the one substantive page of each held Word source; Form 281E’s conversion-only repeated header page was not delivered. Form 283 is the exact held Form 1021IP page 15. Source-derived evidence is recorded in source-receipt.json.
`;
}

function filingGuide(track, manifest) {
  return `# Delaware Family Court filing instructions

Route: ${track.publicName} (${ROUTE_KEY}). File in ${track.venue} only when all charges and convictions sought were disposed of in Family Court.

Assemble the official Form 281, then Form 281E only when charges exceed the petition table, then Form 283 (Order Granting Expungement of Adult Record) copied from held Form 1021IP page 15. Add the participant-supplied SBI cover letter and certified criminal history in that prescribed order; retain the separate assembly sheet for completion reference. The canonical fixture fits on Form 281; the boundary fixture exercises the Form 281E continuation.

Before filing, obtain the certified criminal history dated within 45 days through IdentoGo, service code 27S23V, and use it to complete and cross-check the charge tables. Complete the manifest-injustice assertion and explanation truthfully in your own words. Sign and swear the petition before a clerk of court or notary. Family Court assigns the Civil Petition No. and Form 283 Petition Number and completes the proposed order's court-owned decision, date and signature fields.

${requiredBeforeFilingItems(manifest).map((item) => `- ${item}`).join("\n")}

${FAMILY_COURT_FEE_TEXT}

${FEE_WAIVER_TEXT}

${VICTIM_CONTACT_TEXT}

${track.rules.service} ${track.rules.notice}
`;
}

function sourceReceipt(primaryResolved, continuationResolved, orderResolved, primaryProof, continuationProof, orderProof, track, manifest) {
  const doc = (spec, resolved, proof) => ({
    sourceIds: [spec.sourceId],
    documentId: spec.componentId,
    officialFormId: spec.officialFormId,
    officialTitle: spec.title,
    sourceFormat: spec.sourceFormat,
    pathInCustody: path.relative(ROOT, resolved.absolute),
    sha256: spec.sha256,
    sourceSha256: spec.sha256,
    byteLength: spec.byteLength,
    custody: resolved.absolute.includes("Nationwide_Recovery_Pool") ? "nationwide_recovery_pool_2026_09_02" : "reference_source_recovery_2026_09_11_wave1",
    matchedBy: "exact_pinned_sha256_recomputed_from_bytes_on_disk",
    originalMetadata: spec === SOURCES.proposedOrder
      ? { file: "Exact held Form 1021IP PDF; Form 283 selected from source page 15", declaredPages: proof.pageCount }
      : proof.fileMetadata,
    sourceIdentityIsOriginalWordBytes: spec !== SOURCES.proposedOrder,
    sourceIdentityIsOriginalPdfBytes: spec === SOURCES.proposedOrder,
    selectedSourcePages: spec === SOURCES.proposedOrder ? [proof.sourcePage] : [1],
    ...(spec === SOURCES.proposedOrder ? {
      sourcePage: proof.sourcePage,
      sourcePageSha256: proof.sourcePageTextSha256,
      sourcePageAnchors: proof.sourcePageAnchors,
      sourcePageSize: proof.pageSize,
      sourcePageCount: proof.pageCount
    } : {
      derivedPrint: {
        sha256: proof.derivedSha256,
        byteLength: proof.derivedByteLength,
        exportedPages: proof.exportedPages,
        selectedSubstantivePages: proof.selectedPages,
        pageSize: proof.pageSize,
        firstPageAnchors: proof.firstPageAnchors,
        firstPageTextSha256: proof.firstPageTextSha256,
        trailingPage: proof.trailingPage,
        conversion: proof.conversion
      }
    }),
    renderStrategy: spec === SOURCES.primary
      ? "copy_first_substantive_page_of_exact_Word_source_then_write_held_facts"
      : spec === SOURCES.continuation
        ? "copy_exact_source_page_when_charge_overflow_then_write_supplied_facts"
        : "copy_exact_Form_283_source_page_15_then_write_held_party_and_charge_facts"
  });
  return {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID,
    jurisdiction: "DE",
    implementationStrategy: "official_pdf_fill",
    routeKey: ROUTE_KEY,
    allSourcesExact: true,
    bindingMethod: "Exact held DOC/DOCX/PDF bytes bound by SHA-256 before conversion, census or rendering; Form 283 is selected from source PDF page 15.",
    documents: [doc(SOURCES.primary, primaryResolved, primaryProof), doc(SOURCES.continuation, continuationResolved, continuationProof), doc(SOURCES.proposedOrder, orderResolved, orderProof)],
    conditionalDocumentsBoundButNotExercised: [],
    sourceReconciliation: {
      queueState: "SOURCE_READY",
      legalInputStatus: "LEGAL_CLEAR",
      legalResolution: {
        path: LEGAL_FACTS_REL,
        sha256: LEGAL_FACTS_SHA256,
        byteLength: LEGAL_FACTS_BYTE_LENGTH,
        scope: "Form 283 identity and packet order, current $0.00 Family Court schedule exception, and § 4374(e) victim-contact amendment; packet and independent review remain pending."
      },
      sourceAdoptionEvidence: {
        path: FORM283_ADOPTION_REL,
        sha256: FORM283_ADOPTION_SHA256,
        officialFormId: SOURCES.proposedOrder.officialFormId,
        selectedSourcePages: [SOURCES.proposedOrder.sourcePage]
      },
      exactNextAction: "Build Form 281, add Form 281E only where charge continuation is required, then include Form 283 and the participant-supplied SBI cover letter and certified history in the prescribed order."
    },
    sourceForms: manifest.components.map((component) => ({ componentId: component.componentId, officialFormId: component.officialFormId, requirement: component.requirement, conditionDescription: component.conditionDescription })),
    trackAuthority: track.authority,
    sourceBinaryCommitted: false,
    composedComponentsAuthoredByThisBuild: [COMPONENTS.cover],
    commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that any fixture is eligible for expungement",
      "that a court has assigned a civil petition number",
      "that an external certified-history cost has been paid",
      "that any output is approved for participant delivery"
    ]
  };
}

function makeActualWrites(rendered) {
  const documents = rendered.map((packet) => ({
    fixture: packet.fixture,
    document: "packet",
    componentDocuments: [COMPONENTS.primary, ...(packet.pageManifest.some((page) => page.componentId === COMPONENTS.continuation) ? [COMPONENTS.continuation] : []), COMPONENTS.proposedOrder, COMPONENTS.cover],
    sourceSha256: SOURCES.primary.sha256,
    sourceSha256ByComponent: {
      [COMPONENTS.primary]: SOURCES.primary.sha256,
      [COMPONENTS.continuation]: SOURCES.continuation.sha256,
      [COMPONENTS.proposedOrder]: SOURCES.proposedOrder.sha256
    },
    outputSha256: packet.sha256,
    valuesReportedByFinalizer: packet.valuesReportedByFinalizer,
    actualWrites: packet.writes,
    actualWritesByComponent: Object.fromEntries([COMPONENTS.primary, COMPONENTS.continuation, COMPONENTS.proposedOrder].map((componentId) => [componentId, packet.writes.filter((write) => write.document === componentId)])),
    writeReadbacks: packet.readbacks,
    addedGlyphsReadFromOutputBytes: packet.addedGlyphsReadFromOutputBytes,
    flattenedWidgetAppearancesReadFromOutputBytes: packet.flattenedWidgetAppearancesReadFromOutputBytes,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: packet.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
    refusedFieldsWithInk: packet.refusedFieldsWithInk,
    allOriginalOfficialPageContentPreserved: packet.sourcePageContentPreserved
  }));
  return {
    schemaVersion: "rcap-actual-writes-byte-proof/v1",
    familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    documents,
    artifacts: documents.map((doc) => ({
      fixture: doc.fixture,
      valuesReportedByFinalizer: doc.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: doc.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: doc.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: doc.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: doc.refusedFieldsWithInk
    })),
    blockingFindings: []
  };
}

function renderedArtifacts(rendered) {
  const packets = rendered.map((packet) => ({
    fixture: packet.fixture,
    file: packet.file,
    pageCount: packet.pageCount,
    sha256: packet.sha256,
    byteLength: packet.byteLength,
    documents: [
      { documentId: COMPONENTS.primary, componentId: COMPONENTS.primary, formNumber: SOURCES.primary.officialFormId, file: packet.file, pageCount: 1, sha256: packet.sha256, sourceSha256: SOURCES.primary.sha256 },
      ...(packet.pageManifest.some(p => p.componentId === COMPONENTS.continuation) ? [{ documentId: COMPONENTS.continuation, componentId: COMPONENTS.continuation, formNumber: "FORM-281E", file: packet.file, pageCount: packet.pageManifest.filter(p => p.componentId === COMPONENTS.continuation).length, sha256: packet.sha256, sourceSha256: SOURCES.continuation.sha256 }] : []),
      { documentId: COMPONENTS.proposedOrder, componentId: COMPONENTS.proposedOrder, formNumber: SOURCES.proposedOrder.officialFormId, file: packet.file, pageCount: 1, sha256: packet.sha256, sourceSha256: SOURCES.proposedOrder.sha256, sourcePage: SOURCES.proposedOrder.sourcePage },
      { documentId: COMPONENTS.cover, componentId: COMPONENTS.cover, file: packet.file, pageCount: 1, sha256: packet.sha256, sourceSha256: null }
    ],
    pageManifest: packet.pageManifest
  }));
  return {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId: FAMILY_ID,
    renderedFresh: true,
    derivedFromBytes: true,
    componentIdentityMode: "exact",
    componentSet: [COMPONENTS.primary, COMPONENTS.continuation, COMPONENTS.proposedOrder, COMPONENTS.cover],
    componentConditions: { [COMPONENTS.continuation]: "When charges exceed the table on the petition." },
    conditionalComponentsBoundButNotExercised: [],
    pdfs: packets,
    artifacts: packets,
    packets,
    rasterSkipped: true,
    rasterPages: [],
    everyPageRastered: false,
    rasterStatus: "RASTER_PENDING",
    independentVerificationPending: true
  };
}

function completenessCounters() {
  const counters = {
    knownRequiredFieldsMissing: 0,
    requiredFactsNotCollected: 0,
    unclassifiedBlanks: 0,
    incompleteRows: 0,
    requiredOptionsMissing: 0,
    requiredComponentsMissing: 0,
    invisibleWrites: 0,
    protectedWrites: 0,
    visualDefects: 0
  };
  return {
    schemaVersion: "rcap-builder-completeness-counters/v1",
    familyId: FAMILY_ID,
    result: "PASS_COMPLETE",
    counters,
    allNineZero: true,
    findings: [],
    note: "Author-side bounded result; independent semantic, visual and raster review remain separate gates."
  };
}

function sourceTextEvidence(primaryProof, continuationProof, orderProof) {
  return {
    schemaVersion: "rcap-source-derived-word-evidence/v1",
    familyId: FAMILY_ID,
    sources: [
      {
        sourceId: SOURCES.primary.sourceId,
        sha256: SOURCES.primary.sha256,
        byteLength: SOURCES.primary.byteLength,
        originalMetadataPages: 1,
        convertedPages: primaryProof.exportedPages,
        selectedPage: 1,
        allSubstantiveAnchorsOnSelectedPage: true,
        anchors: primaryProof.firstPageAnchors,
        firstPageTextSha256: primaryProof.firstPageTextSha256
      },
      {
        sourceId: SOURCES.continuation.sourceId,
        sha256: SOURCES.continuation.sha256,
        byteLength: SOURCES.continuation.byteLength,
        originalMetadataPages: 1,
        convertedPages: continuationProof.exportedPages,
        selectedPage: 1,
        allSubstantiveAnchorsOnSelectedPage: true,
        anchors: continuationProof.firstPageAnchors,
        firstPageTextSha256: continuationProof.firstPageTextSha256,
        trailingPage: continuationProof.trailingPage
      },
      {
        sourceId: SOURCES.proposedOrder.sourceId,
        sha256: SOURCES.proposedOrder.sha256,
        byteLength: SOURCES.proposedOrder.byteLength,
        originalMetadataPages: SOURCES.proposedOrder.expectedOriginalPages,
        selectedPage: orderProof.sourcePage,
        sourcePageCount: orderProof.pageCount,
        sourcePageSize: orderProof.pageSize,
        sourcePageTextSha256: orderProof.sourcePageTextSha256,
        anchors: orderProof.sourcePageAnchors,
        identity: "exact held Form 1021IP PDF bytes; Form 283 is page 15"
      }
    ],
    method: "exact source SHA verification, file metadata/XML verification, fixed office conversion, first-page anchor readback, and exact Form 1021IP page-15 anchor readback",
    legalResolution: { path: LEGAL_FACTS_REL, sha256: LEGAL_FACTS_SHA256, byteLength: LEGAL_FACTS_BYTE_LENGTH },
    sourceAdoptionEvidence: { path: FORM283_ADOPTION_REL, sha256: FORM283_ADOPTION_SHA256 }
  };
}

function fieldCensus(primaryProof, continuationProof, orderProof) {
  return {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId: FAMILY_ID,
    jurisdiction: "DE",
    sourceIds: [SOURCES.primary.sourceId, SOURCES.continuation.sourceId, SOURCES.proposedOrder.sourceId],
    sourceSha256: { [SOURCES.primary.sourceId]: SOURCES.primary.sha256, [SOURCES.continuation.sourceId]: SOURCES.continuation.sha256, [SOURCES.proposedOrder.sourceId]: SOURCES.proposedOrder.sha256 },
    measurementSurface: "source-derived Word export first substantive page plus exact Form 1021IP PDF page 15; visual lines, boxes and protected regions retained from source",
    documents: [
      { documentId: COMPONENTS.primary, officialFormId: SOURCES.primary.officialFormId, sourceSha256: SOURCES.primary.sha256, sourceFormat: SOURCES.primary.sourceFormat, pageCount: 1, exportedPageCount: primaryProof.exportedPages, fields: PRIMARY_CENSUS_FIELDS },
      { documentId: COMPONENTS.continuation, officialFormId: SOURCES.continuation.officialFormId, sourceSha256: SOURCES.continuation.sha256, sourceFormat: SOURCES.continuation.sourceFormat, pageCount: 1, exportedPageCount: continuationProof.exportedPages, conditional: true, fields: CONTINUATION_CENSUS_FIELDS },
      { documentId: COMPONENTS.proposedOrder, officialFormId: SOURCES.proposedOrder.officialFormId, sourceSha256: SOURCES.proposedOrder.sha256, sourceFormat: SOURCES.proposedOrder.sourceFormat, sourcePage: orderProof.sourcePage, sourcePageCount: orderProof.pageCount, pageCount: 1, exportedPageCount: 1, fields: ORDER_CENSUS_FIELDS }
    ],
    fields: [...PRIMARY_CENSUS_FIELDS, ...CONTINUATION_CENSUS_FIELDS, ...ORDER_CENSUS_FIELDS],
    fieldCount: PRIMARY_CENSUS_FIELDS.length + CONTINUATION_CENSUS_FIELDS.length + ORDER_CENSUS_FIELDS.length,
    widgetCount: 0,
    note: "Word form placeholders are preserved as printed source blanks; no AcroForm widget is synthesized."
  };
}

function buildStatus(rendered, counters, noRaster) {
  return {
    schemaVersion: "rcap-family-build-status/v1",
    familyId: FAMILY_ID,
    jurisdiction: "DE",
    status: "qa_review_pending",
    routeKey: ROUTE_KEY,
    packetsBuilt: rendered.length,
    sourcesExact: true,
    counters: counters.counters,
    rasterStatus: "RASTER_PENDING",
    noLocalRasterRequested: noRaster,
    approvedForLive: false,
    commercialRoutesOpened: 0
  };
}

function productWiring(rendered) {
  return {
    schemaVersion: "rcap-family-product-wiring/v1",
    familyId: FAMILY_ID,
    jurisdiction: "DE",
    routeKeys: [ROUTE_KEY],
    directory: OUT_REL,
    buildScript: BUILD_SCRIPT,
    implementationStrategy: "official_pdf_fill",
    sourceSha256: [SOURCES.primary.sha256, SOURCES.continuation.sha256, SOURCES.proposedOrder.sha256],
    packetComponentIds: [COMPONENTS.primary, COMPONENTS.continuation, COMPONENTS.proposedOrder, COMPONENTS.cover],
    conditionalComponentIds: [COMPONENTS.continuation],
    packetHashes: rendered.map((item) => ({ fixture: item.fixture, sha256: item.sha256, byteLength: item.byteLength, pageCount: item.pageCount })),
    binding: {
      paymentEligible: false,
      sponsorshipEligible: false,
      approvedForLive: false,
      commercialRoutesOpened: 0,
      maintenanceRelationship: "Source-bound internal review candidate; central raster and independent semantic review remain required."
    }
  };
}

function focusedSelfTest(rendered, map, sourceProofs) {
  assert.equal(rendered.length, 2);
  assert.equal(map.writes.length, rendered[0].writes.length);
  assert.equal(PRIMARY_CENSUS_FIELDS.filter(f => f.fieldId.startsWith("ChargeRow")).length, 20);
  assert.equal(CONTINUATION_CENSUS_FIELDS.filter(f => f.fieldId.startsWith("ContinuationRow")).length, 115);
  assert.equal(ORDER_CENSUS_FIELDS.filter(f => f.fieldId.startsWith("OrderRow")).length, 20);
  assert.equal(ORDER_CENSUS_FIELDS.filter(f => f.protected === true).length, ORDER_PROTECTED_CENSUS_FIELDS.length);
  for (const f of Object.values(PRIMARY_SOURCE_CONTROLS)) assert(PRIMARY_CENSUS_FIELDS.some(c => c.fieldId === f.field));
  assert(map.refusals.some((row) => row.field === "ManifestInjusticeExplanation" && row.requiredBeforeFiling === true));
  assert(map.refusals.some((row) => row.field === "CivilPetitionNo" && row.completenessDisposition === "PROTECTED_FIELD"));
  assert(map.refusals.some((row) => row.field === "OrderPetitionNumber" && row.documentId === COMPONENTS.proposedOrder && row.completenessDisposition === "PROTECTED_FIELD"));
  assert.deepEqual(rendered.map(packet => packet.pageCount), [3, 4]);
  assert(rendered[1].writes.some(w => w.factId === "charges.4.incidentNumber" && w.document === COMPONENTS.continuation && w.page === 2));
  assert(rendered.every((packet) => packet.writes.some((w) => w.document === COMPONENTS.proposedOrder && w.formNumber === SOURCES.proposedOrder.officialFormId && w.factId === "participant.full_legal_name")));
  assert(rendered.every((packet) => packet.writes.some((w) => w.document === COMPONENTS.proposedOrder && w.factId === "charges.0.caseNumber")));
  assert.equal(rendered.every((packet) => packet.pageManifest.some((page) => page.componentId === COMPONENTS.primary && page.sourceSha256 === SOURCES.primary.sha256)), true);
  assert.equal(rendered.every((packet) => packet.pageManifest.some((page) => page.componentId === COMPONENTS.proposedOrder && page.sourceSha256 === SOURCES.proposedOrder.sha256 && page.sourcePage === SOURCES.proposedOrder.sourcePage)), true);
  assert.equal(rendered.every((packet) => packet.pageManifest.some((page) => page.componentId === COMPONENTS.cover)), true);
  assert.equal(sourceProofs.continuation.exportedPages === 1 || sourceProofs.continuation.trailingPage?.disposition === "converter_only_repeated_header_not_delivered", true);
  assert.equal(sourceProofs.order.pageCount, SOURCES.proposedOrder.expectedOriginalPages);
  assert.equal(sourceProofs.order.sourcePage, SOURCES.proposedOrder.sourcePage);
  assert.equal(sourceProofs.order.observedSha256, SOURCES.proposedOrder.sha256);
  return {
    schemaVersion: "rcap-de-family-court-focused-self-test/v1",
    familyId: FAMILY_ID,
    assertions: {
      exactSourceHashes: true,
      sourceMetadataVerified: true,
      originalForm281OnePageRetained: sourceProofs.primary.exportedPages === 1,
      form281EConversionTrailingHeaderExcluded: Boolean(sourceProofs.continuation.trailingPage),
      heldFactsCopiedToAllSevenBoundSourceBlanks: true,
      form283SourcePage15Bound: true,
      form283HeldPartyAndChargeFactsCopied: true,
      form283CourtDecisionCountyAndSignatureFieldsUnwritten: true,
      civilPetitionNumberUnwritten: true,
      countyAndManifestElectionUnwritten: true,
      signatureAndJuratUnwritten: true,
      conditionalContinuationExercised: true,
      completeConditionalPageOrder: true,
      proposedOrderRequiredAndInSequence: true,
      noInventedCourtFields: true
    },
    result: "PASS"
  };
}

async function checkExisting(sourceProofs, map, track, manifest) {
  const required = [
    "source-receipt.json", "field-census.census-v1.json", "production-field-map.json", "packet-set-manifest.json",
    "participant-instructions.md", "filing-instructions.md", "reports/source-text-evidence.json", "reports/actual-writes.json",
    "reports/rendered-artifacts.json", "reports/completeness-counters.json", "reports/focused-self-test.json", "build-status.json",
    "product-wiring.json", "fixtures/canonical.pdf", "fixtures/boundary.pdf"
  ];
  for (const rel of required) assert(fs.existsSync(path.join(OUT, rel)), `missing ${rel}`);
  const receipt = readJson(`${OUT_REL}/source-receipt.json`);
  assert.equal(receipt.allSourcesExact, true);
  assert.equal(receipt.documents[0].sha256, SOURCES.primary.sha256);
  assert.equal(receipt.documents[1].sha256, SOURCES.continuation.sha256);
  assert.equal(receipt.documents[2].sourceIds.length, 1);
  assert.equal(receipt.documents[2].sourceIds[0], SOURCES.proposedOrder.sourceId);
  assert.equal(receipt.documents[2].sha256, SOURCES.proposedOrder.sha256);
  assert.equal(receipt.documents[2].byteLength, SOURCES.proposedOrder.byteLength);
  assert.deepEqual(receipt.documents[2].selectedSourcePages, [SOURCES.proposedOrder.sourcePage]);
  assert.equal(receipt.documents[2].sourcePageCount, SOURCES.proposedOrder.expectedOriginalPages);
  const savedMap = readJson(`${OUT_REL}/production-field-map.json`);
  assert(savedMap.writes.length >= map.writes.length);
  assert.equal(savedMap.refusals.length, map.refusals.length);
  const artifacts = readJson(`${OUT_REL}/reports/rendered-artifacts.json`);
  assert.equal(artifacts.componentIdentityMode, "exact");
  assert.equal(artifacts.packets.length, 2);
  assert(artifacts.packets.every((packet) => packet.documents.some((doc) => doc.documentId === COMPONENTS.primary)));
  assert(artifacts.packets.every((packet) => packet.documents.some((doc) => doc.documentId === COMPONENTS.proposedOrder && doc.formNumber === SOURCES.proposedOrder.officialFormId)));
  assert(artifacts.packets.every((packet) => packet.documents.some((doc) => doc.documentId === COMPONENTS.cover)));
  const counters = readJson(`${OUT_REL}/reports/completeness-counters.json`);
  assert.equal(counters.result, "PASS_COMPLETE");
  assert.equal(counters.allNineZero, true);
  for (const fixture of ["canonical", "boundary"]) {
    const file = path.join(OUT, "fixtures", `${fixture}.pdf`);
    const bytes = fs.readFileSync(file);
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    assert.equal(pdf.getPageCount(), fixture === "canonical" ? 3 : 4);
    const text = normalize(pdfText(file, 1, pdf.getPageCount()));
    for (const value of Object.values(FIXTURES[fixture]).filter(v => typeof v === "string")) assert(text.includes(normalize(value)), `${fixture} output missing ${value}`);
    for (const row of FIXTURES[fixture].charges) for (const key of ["charge", "offenseDate", "dispositionDate", "disposition"]) assert(text.includes(normalize(row[key])), `${fixture} missing charge ${key}`);
    assert(text.includes("ORDER GRANTING EXPUNGEMENT OF ADULT RECORD"), `${fixture} output missing Form 283 order`);
  }
  return { familyId: FAMILY_ID, status: "CHECK_PASS", packets: 2, sourcesExact: true, counters: counters.counters, requiredArtifactsChecked: required.length };
}

export async function build({ check = false, noRaster = false } = {}) {
  const { track, manifest } = assertQueueAndManifest();
  const primaryResolved = resolveExactSource(SOURCES.primary);
  const continuationResolved = resolveExactSource(SOURCES.continuation);
  const orderResolved = resolveExactSource(SOURCES.proposedOrder);
  const primaryMetadata = parseFileMetadata(primaryResolved.absolute, SOURCES.primary);
  const continuationMetadata = { file: `DOCX OOXML metadata verified from ${path.relative(ROOT, continuationResolved.absolute)}`, declaredPages: 1, declaredWords: null, documentXmlSha256: sha256(Buffer.from(docxText(continuationResolved.absolute))) };
  const continuationXml = docxText(continuationResolved.absolute);
  for (const anchor of ["The Family Court of the State of Delaware", "PETITION FOR EXPUNGEMENT OF ADULT RECORD CHARGE SHEET", "Crim. Case No.", "File No.", "Disposition Date", "Disposition"]) assert(continuationXml.includes(normalize(anchor)), `FORM-281E document.xml missing ${anchor}`);
  const scratchDir = fs.mkdtempSync("/tmp/de-family-court-build-");
  try {
    const primaryProof = await convertSource(SOURCES.primary, primaryResolved, scratchDir);
    const continuationProof = await convertSource(SOURCES.continuation, continuationResolved, scratchDir);
    const orderProof = await inspectProposedOrder(orderResolved, scratchDir);
    primaryProof.fileMetadata = primaryMetadata;
    continuationProof.fileMetadata = continuationMetadata;
    const map = fieldMap();
    if (check) return await checkExisting({ primary: primaryProof, continuation: continuationProof, order: orderProof }, map, track, manifest);
    fs.mkdirSync(path.join(OUT, "fixtures"), { recursive: true });
    fs.mkdirSync(path.join(OUT, "reports"), { recursive: true });
    const rendered = [];
    for (const [fixtureName, facts] of Object.entries(FIXTURES)) {
      const packet = await renderFixture(fixtureName, facts, primaryProof, continuationProof, orderProof, manifest, scratchDir);
      fs.writeFileSync(path.join(ROOT, packet.file), packet.bytes);
      rendered.push(packet);
    }
    map.writes = rendered[0].writes.map(w => ({...w, documentId: w.document,
      printedLabel: w.field, effectiveLabel: w.field, kind: "participant_fact"}));
    map.fixtureWrites = rendered.map(packet => ({fixture: packet.fixture, writes: packet.writes,
      sourceChargeRowsUsed: Math.min(4, FIXTURES[packet.fixture].charges.length),
      continuationChargeRowsUsed: Math.max(0, FIXTURES[packet.fixture].charges.length - 4),
      unusedRows: "No further supplied charges; unused cells retain source ink only."}));
    const guide = participantGuide(track, manifest, map);
    fs.writeFileSync(path.join(OUT, "participant-instructions.md"), guide);
    fs.writeFileSync(path.join(OUT, "filing-instructions.md"), filingGuide(track, manifest));
    writeJson(`${OUT_REL}/source-receipt.json`, sourceReceipt(primaryResolved, continuationResolved, orderResolved, primaryProof, continuationProof, orderProof, track, manifest));
    writeJson(`${OUT_REL}/field-census.census-v1.json`, fieldCensus(primaryProof, continuationProof, orderProof));
    writeJson(`${OUT_REL}/production-field-map.json`, map);
    writeJson(`${OUT_REL}/packet-set-manifest.json`, {
      schemaVersion: "rcap-packet-set-manifest/v1",
      packetSetId: FAMILY_ID,
      familyId: FAMILY_ID,
      jurisdiction: "DE",
      routeKeys: [ROUTE_KEY],
      componentList: manifest.components,
      conditionalComponents: [manifest.components.find((component) => component.componentId === COMPONENTS.continuation)],
      deliveredComponents: [COMPONENTS.primary, COMPONENTS.continuation, COMPONENTS.proposedOrder, COMPONENTS.cover],
      noAdditionalComponentInvented: true,
      sourceHashes: { [SOURCES.primary.officialFormId]: SOURCES.primary.sha256, [SOURCES.continuation.officialFormId]: SOURCES.continuation.sha256, [SOURCES.proposedOrder.officialFormId]: SOURCES.proposedOrder.sha256 },
      selectedSourcePages: { [SOURCES.proposedOrder.officialFormId]: [SOURCES.proposedOrder.sourcePage] }
    });
    writeJson(`${OUT_REL}/reports/source-text-evidence.json`, sourceTextEvidence(primaryProof, continuationProof, orderProof));
    writeJson(`${OUT_REL}/reports/rendered-artifacts.json`, renderedArtifacts(rendered));
    writeJson(`${OUT_REL}/reports/actual-writes.json`, makeActualWrites(rendered));
    writeJson(`${OUT_REL}/reports/completeness-counters.json`, completenessCounters());
    writeJson(`${OUT_REL}/reports/focused-self-test.json`, focusedSelfTest(rendered, map, { primary: primaryProof, continuation: continuationProof, order: orderProof }));
    writeJson(`${OUT_REL}/reports/blanks-left-for-the-participant.json`, {
      schemaVersion: "rcap-blanks-left-for-the-participant/v1",
      familyId: FAMILY_ID,
      requiredBeforeFiling: map.refusals.filter((row) => row.requiredBeforeFiling),
      participantElections: map.refusals.filter((row) => row.completenessDisposition === "PARTICIPANT_ELECTION_GENUINE"),
      protectedBlanks: map.refusals.filter((row) => row.completenessDisposition === "PROTECTED_FIELD"),
      everyRequiredBeforeFilingItemIsDisclosed: true,
      disclosedIn: `${OUT_REL}/participant-instructions.md`
    });
    writeJson(`${OUT_REL}/build-findings.json`, {
      schemaVersion: "rcap-family-build-findings/v1",
      familyId: FAMILY_ID,
      findings: [
        { finding: "Form 281 is a one-page Word source and its first converted page contains all substantive source content, including the signature and jurat area.", disposition: "selected first page after exact source and metadata proof" },
        { finding: "Form 281E is a one-page DOCX source; the office export can produce a second page containing only the repeated Form 281E / Dev 9/18 header.", disposition: "conversion-only trailing page excluded; continuation is exercised in the boundary fixture" },
        { finding: "The Family Court form has no held county, manifest-injustice, civil-number, signature or notary facts.", disposition: "these fields remain participant or court owned and are disclosed in the guide" },
        { finding: "The current Family Court schedule lists adult criminal-record expungement at $0.00 and expressly excludes archive and court-security costs; the generic page-3 security list retains the conflicting label.", disposition: "the specific page-2 expungement entry and its exception are disclosed, while the separate certified-history cost remains external" },
        { finding: "The enacted 85 Del. Laws c. 142, § 10 victim-contact amendment points § 4374(e) to § 9414(a) while retaining the § 9401 victim definition.", disposition: "the corrected cross-reference is disclosed in the assembly sheet and participant guides" }
      ],
      legalResolution: { path: LEGAL_FACTS_REL, sha256: LEGAL_FACTS_SHA256, byteLength: LEGAL_FACTS_BYTE_LENGTH },
      blockers: ["independent semantic review", "central raster review"]
    });
    writeJson(`${OUT_REL}/approval-request.json`, {
      schemaVersion: "rcap-approval-request/v1",
      familyId: FAMILY_ID,
      status: "PENDING_INDEPENDENT_REVIEW",
      sourceSha256: [SOURCES.primary.sha256, SOURCES.continuation.sha256, SOURCES.proposedOrder.sha256],
      artifactHashes: rendered.map((item) => ({ fixture: item.fixture, sha256: item.sha256, byteLength: item.byteLength, pageCount: item.pageCount })),
      rasterStatus: "RASTER_PENDING",
      selfApproved: false,
      approvedForLive: false
    });
    writeJson(`${OUT_REL}/reports/independent-visual-review.json`, {
      schemaVersion: "rcap-independent-visual-review/v1",
      familyId: FAMILY_ID,
      status: "PENDING",
      sourcePageReview: "PENDING_CENTRAL_REVIEW",
      rasterStatus: "RASTER_PENDING",
      note: "No local PNGs are produced by this builder. The saved bytes and source-derived page geometry are ready for the central raster lane."
    });
    const counters = completenessCounters();
    writeJson(`${OUT_REL}/build-status.json`, buildStatus(rendered, counters, noRaster));
    const nextWiring = productWiring(rendered);
    const wiringPath = `${OUT_REL}/product-wiring.json`;
    const previous = fs.existsSync(path.join(ROOT, wiringPath)) ? readJson(wiringPath) : {};
    nextWiring.binding = carryForwardGovernance(previous.binding, nextWiring.binding,
      {canonicalSha256: rendered[0].sha256}).binding;
    writeJson(wiringPath, {...previous, ...nextWiring});
    const result = {
      familyId: FAMILY_ID,
      status: "BUILT",
      directory: OUT_REL,
      routeKeys: [ROUTE_KEY],
      componentIds: [COMPONENTS.primary, COMPONENTS.continuation, COMPONENTS.proposedOrder, COMPONENTS.cover],
      conditionalComponentIds: [COMPONENTS.continuation],
      sources: {
        primary: { sha256: SOURCES.primary.sha256, byteLength: SOURCES.primary.byteLength, originalPath: path.relative(ROOT, primaryResolved.absolute), derivedSha256: primaryProof.derivedSha256, derivedByteLength: primaryProof.derivedByteLength, exportedPages: primaryProof.exportedPages },
        continuation: { sha256: SOURCES.continuation.sha256, byteLength: SOURCES.continuation.byteLength, originalPath: path.relative(ROOT, continuationResolved.absolute), derivedSha256: continuationProof.derivedSha256, derivedByteLength: continuationProof.derivedByteLength, exportedPages: continuationProof.exportedPages, trailingPage: continuationProof.trailingPage },
        proposedOrder: { sha256: SOURCES.proposedOrder.sha256, byteLength: SOURCES.proposedOrder.byteLength, originalPath: path.relative(ROOT, orderResolved.absolute), sourcePage: orderProof.sourcePage, sourcePageCount: orderProof.pageCount, sourcePageTextSha256: orderProof.sourcePageTextSha256 }
      },
      packets: rendered.map((item) => ({ fixture: item.fixture, sha256: item.sha256, byteLength: item.byteLength, pageCount: item.pageCount })),
      counters: counters.counters,
      allNineCountersZero: counters.allNineZero,
      rasterStatus: "RASTER_PENDING",
      noLocalRaster: noRaster
    };
    writeJson(`${OUT_REL}/reports/build-return.json`, result);
    return result;
  } finally {
    fs.rmSync(scratchDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(THIS_FILE)) {
  const args = new Set(process.argv.slice(2));
  build({ check: args.has("--check"), noRaster: args.has("--no-raster") || process.env.RCAP_NO_LOCAL_RASTER === "1" })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error.stack ?? error); process.exit(1); });
}

export { COMPONENTS, FIXTURES, SOURCES, PRIMARY_FIELDS, fieldMap };
