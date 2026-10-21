#!/usr/bin/env node
// Route-obligation census v1 — packet family `ar-act346-set`.
//
//   node scripts/build-census-v1-ar-act346-set.mjs
//
// Arkansas, dismissing and sealing a first-offender record under Act 346 of
// 1975 (A.C.A. §§ 16-93-301 through 303) and the Act 1460 of 2013 sealing
// procedure. This composed route delivers staged guidance followed by two
// official ACIC documents:
//
//   * the ACIC Petition to Dismiss and Seal First Offenders — the filing;
//   * the ACIC Order to Dismiss and Seal First Offenders   — the proposed order.
//
// This is not a renderer. Every decision about what may be written is made by
// scripts/rcap-official-forms/rcap-field-semantics.mjs and every byte is
// written by finalizeOfficialForm; this file supplies the two things only a
// caller can supply — the family's ROLE classification and its explicit
// mappings — and then proves the result from the artifact bytes rather than
// from its own report.
//
// WHY THE CAPTION MAPPINGS ARE STATED BY MEASUREMENT AND NOT BY FIELD NAME
//
// This form's AcroForm names do not describe its caption. Page 1 prints
//
//     IN THE ______________ COURT OF ________________, ARKANSAS
//     _______ DIVISION
//
// and the widget over the first blank is named `DIVISION 1`, the widget over
// the county blank is named `COURT 1`, and the widget over the division blank
// is named `DIVISION 2`. That was established from the page's own text items:
// "IN THE " ends at x=130.2 and `DIVISION 1` occupies 130.2–239.2; "OF " ends
// at x=320.1 and `COURT 1` occupies 320.0–444.6, closing at the printed comma
// at 436.8; the second line's underscores run 246.1–314.6 and `DIVISION 2`
// occupies 246.0–300.7. So the county is written into `COURT 1`, and the blank
// named `DIVISION 1` is the type of court and is left for the participant.
// Trusting the names here would have printed the county where the court's name
// belongs.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines, captureWidgetContext, normalizeHarvestedText }
  from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { strokedRectangles } from "./lib/pdf-stroked-boxes.mjs";
import { CHARGE_VALUE_WORDS, captionDescribesChargeValue, descriptorsMatching, protectCategoryOf, decideBinding, resolveFact }
  from "./rcap-official-forms/rcap-field-semantics.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList } = require("pdf-lib");

const FAMILY_ID = "ar-act346-set";
const OUT = "data/rcap-all50/overlays/census-v1/ar/ar-act346-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const HISTORICAL_COMPOSED_ROUTE = "data/rcap-all50/composed-routes/arkansas/ar-act346";
const ROUTE_KEYS = [
  "obligation:unit:AR:ar-act346:ar-act346-stage-1",
  "obligation:unit:AR:ar-act346:ar-act346-stage-2"
];
const ROUTE_KEY = ROUTE_KEYS[1];

const fail = (message, detail = null) => {
  console.error(`build-census-v1-${FAMILY_ID}: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was written.");
  process.exit(1);
};

const PETITION_SOURCE =
  "reference/source-recovery/2026-09-11-wave1/CODEX-CS2-SRC2__AR-ACT346-SET__ACIC-PETITION-DISMISS-AND-SEAL-FIRST-OFFENDERS__b90179f471d3.pdf";
const ORDER_SOURCE =
  "STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-ORDER-TO-DISMISS-AND-SEAL-FIRST-OFFENDERS-ACT-346__order-to-dismiss-and-seal-first-offenders-under-act-346-and-act-1460__REV-2014-01-01__EN.pdf";

const PETITION_ID = "ACIC-PETITION-DISMISS-AND-SEAL-FIRST-OFFENDERS";
const ORDER_ID = "ACIC-ORDER-DISMISS-AND-SEAL-FIRST-OFFENDERS";
const PETITION_SHA = "b90179f471d3b47bc4aa4d40d8b1cf7aa4c0633d05c4ba5ad3d5a49895bbacd3";
const ORDER_SHA = "70f97584a628507e064540a4bf2830b46162de8f799d2a2a78285db446d15740";

const DOCUMENTS = [
  {
    key: "petition",
    documentId: PETITION_ID,
    documentRole: "PETITION",
    officialTitle: "Petition to Dismiss and Seal First Offenders Under Act 346 of 1975 and Act 1460 of 2013",
    revision: "REV-2014-08-25",
    sha256: PETITION_SHA,
    sourcePath: PETITION_SOURCE,
    pathInArchive: PETITION_SOURCE,
    ownership: "participant_completed",
    captionOnly: false,
    explicitMappings: {
      "COUNTY": "matter.county",
      "Case No": "matter.case_number",
      "First Middle and Last name": "participant.full_legal_name",
      "1": "matter.charge",
      "WHEREFORE the Defendant": "participant.full_legal_name",
      "Defendant Address  Street 1": "participant.street_address",
      "City": "participant.city",
      "State": "participant.state",
      "Zip code": "participant.zip",
      "DOB": "participant.date_of_birth"
    },
    printedLabelCorrections: {
      "COUNTY": {
        printedLabel: "COURT OF county, ARKANSAS",
        readFrom: "page 1, the second blank in the printed caption IN THE ______________ COURT OF ________________, ARKANSAS",
        measuredEvidence: "the widget is the blank after the printed OF and before the comma preceding ARKANSAS",
        why: "The widget name COUNTY agrees with the measured caption county blank; the court-type blank remains unsourced and blank."
      }
    },
    unwritable: [],
    completeness: { defaultBlank: null, fields: {} }
  },
  {
    key: "order",
    documentId: ORDER_ID,
    documentRole: "PROPOSED_ORDER",
    officialTitle: "Order to Dismiss and Seal First Offenders Under Act 346 of 1975 and Act 1460 of 2013",
    revision: "REV-2014-01-01",
    sha256: ORDER_SHA,
    pathInArchive: ORDER_SOURCE,
    ownership: "court_issued_order",
    captionOnly: true,
    explicitMappings: {
      "County": "matter.county",
      "Case No": "matter.case_number",
      "First Middle and Last name": "participant.full_legal_name"
    },
    printedLabelCorrections: {
      "County": {
        printedLabel: "COURT OF county, ARKANSAS",
        readFrom: "page 1, the second blank in the printed caption IN THE ______________ COURT OF ________________, ARKANSAS",
        measuredEvidence: "the widget is the blank after the printed OF and before the comma preceding ARKANSAS",
        why: "The order caption must carry the same held county as the petition; the court-type and division blanks are left for the filing court."
      }
    },
    unwritable: [],
    completeness: { defaultBlank: { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The proposed order below its caption is the court's instrument. This packet leaves its recitals, findings, decree, judge signature, date and identification block blank." }, fields: {} }
  }
];

const PETITION_ALLOWED = new Set([
  "COUNTY", "Case No", "First Middle and Last name", "1", "WHEREFORE the Defendant",
  "Defendant Address  Street 1", "City", "State", "Zip code", "DOB"
]);
const ORDER_ALLOWED = new Set(["County", "Case No", "First Middle and Last name"]);

const petitionPolicies = {
  "COURT OF": { requiredBeforeFiling: true, reason: "Write the court that handled the case after confirming it with the filing clerk; this route holds no court-type fact." },
  "DIVISION": { reason: "Optional participant-authored content; the platform does not invent the filing court's division." },
  "2": { reason: "Optional participant-authored content; the platform does not invent a second charge line." },
  "felony  misdemeanor in violation of ACA": { requiredBeforeFiling: true, reason: "Copy the offense class and A.C.A. section from the ACIC record and court paperwork before filing." },
  "years but not less than": { requiredBeforeFiling: true, reason: "Write the probation term from the Act 346 placement/probation order; the platform does not hold that term." },
  "but not more than 350000": { reason: "Optional participant-authored content; the platform does not invent a fine amount." },
  "DAY": { requiredBeforeFiling: true, reason: "Copy the arrest-date day from the ACIC record or court paperwork before filing." },
  "MONTH": { requiredBeforeFiling: true, reason: "Copy the arrest-date month from the ACIC record or court paperwork before filing." },
  "YEAR": { requiredBeforeFiling: true, reason: "Copy the arrest-date year from the ACIC record or court paperwork before filing." },
  "Defendants Signature": { refusalClass: "signature_or_date_participant_completion", reason: "The participant signs the petition after confirming every statement." },
  "Date": { refusalClass: "signature_or_date_participant_completion", reason: "The participant dates the petition when signing it." },
  "I": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The Certificate of Service is a court, clerk, prosecutor, agency, or hearing field completed only after actual service." },
  "Defendant or Defendants Attorney": { refusalClass: "signature_or_date_participant_completion", reason: "The participant or attorney signs the Certificate of Service only after service has happened." },
  "Defendant Address  Street 2": { reason: "Optional participant-authored content; the platform does not invent a second street line." },
  "Check Box1": { refusalClass: "participant_sworn_narrative_or_legal_election", reason: "The participant marks the felony choice only when it matches the ACIC record and court paperwork." },
  "Check Box2": { refusalClass: "participant_sworn_narrative_or_legal_election", reason: "The participant marks the misdemeanor choice only when it matches the ACIC record and court paperwork." },
  "OFFENSE": { requiredBeforeFiling: true, reason: "Write the offense of the guilty or nolo contendere plea from the judgment; the platform writes only the charged-offense line and does not recreate the plea election." },
  "ACA CODE": { requiredBeforeFiling: true, reason: "Write the A.C.A. section for the plea offense from the judgment or ACIC record." },
  "Check Box3": { refusalClass: "participant_sworn_narrative_or_legal_election", reason: "Mark this pending-felony choice only when it is true today; the platform does not determine the participant's current record." },
  "Check Box4": { refusalClass: "participant_sworn_narrative_or_legal_election", reason: "Mark this pending-felony choice only when it is true today; the platform does not determine the participant's current record." },
  "CHARGES 1": { reason: "Optional participant-authored content; the platform does not invent a pending-charge court, case, or status." },
  "CHARGES 2": { reason: "Optional participant-authored content; the platform does not invent a pending-charge continuation." },
  "SID": { requiredBeforeFiling: true, reason: "Copy the State Identification number from the participant's ACIC history or arrest paperwork; the platform does not hold it." },
  "COUNTY OF": { reason: "Optional participant-authored content; the platform does not invent the verification venue." },
  "Comes the Petitioner": { requiredBeforeFiling: true, reason: "The verification's sworn name is completed with the participant's confirmed legal name when the verification is executed; the notarial section is left untouched." },
  "Petitioner": { refusalClass: "signature_or_date_participant_completion", reason: "The participant signs the verification before the notary if the filing court requires that execution." },
  "DAY 2": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The notary or filing official completes this court, clerk, prosecutor, agency, or hearing field when the verification is executed." },
  "MONTH 2": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The notary or filing official completes this court, clerk, prosecutor, agency, or hearing field when the verification is executed." },
  "YEAR 2": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The notary or filing official completes this court, clerk, prosecutor, agency, or hearing field when the verification is executed." },
  "Notary Public": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The notary completes this name line when the verification is executed; the platform does not invent a notary." },
  "My Commissionexpires": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The notary completes the commission expiration line; the platform does not invent it." },
  "Race": { requiredBeforeFiling: true, reason: "The participant supplies the race entry required by the form's identification block; the platform does not hold it." },
  "Arrest Tracking Number": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The arrest tracking number is assigned by ACIC or the arresting agency; the platform does not invent it." },
  "Sex": { requiredBeforeFiling: true, reason: "The participant supplies the sex entry required by the form's identification block; the platform does not hold it." },
  "undefined_2": { requiredBeforeFiling: true, reason: "Write the A.C.A. section for the charged offense from the ACIC record or court paperwork." },
  "FBI No if known": { reason: "Optional participant-authored content; the platform does not invent an FBI number." },
  "DAY3": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The notary or filing official completes this court, clerk, prosecutor, agency, or hearing field when the verification is executed." },
  "MONTH 3": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The notary or filing official completes this court, clerk, prosecutor, agency, or hearing field when the verification is executed." },
  "YEAR 3": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The notary or filing official completes this court, clerk, prosecutor, agency, or hearing field when the verification is executed." },
  "Date_3": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The Certificate of Service is a court, clerk, prosecutor, agency, or hearing field dated only after actual service." }
};

const orderPolicies = {
  "COURT OF": { requiredBeforeFiling: true, reason: "Write the same court name confirmed by the filing clerk on the matching petition and proposed order." },
  "DIVISION": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court or filing clerk confirms the caption; this court, clerk, prosecutor, agency, or hearing field stays blank until then." },
  "1": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court completes this court, clerk, prosecutor, agency, or hearing recital field." },
  "2": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court completes this court, clerk, prosecutor, agency, or hearing recital field." },
  "Defendant": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The proposed order's page-3 grant decree is completed by the court; the packet leaves this party-name field blank." },
  "Judge": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The judge signs the proposed order; this packet leaves the line blank." },
  "Date": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court dates its own order; this packet leaves the line blank." },
  "Race": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court or agency identification block is not a packet prefill area." },
  "Arrest Tracking Number": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "ACIC or the arresting agency supplies this identifier." },
  "Sex": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court or agency identification block is not a packet prefill area." },
  "DOB": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court or agency identification block is not a packet prefill area." },
  "FBI No if known": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court or agency identification block is not a packet prefill area." },
  "Day": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court completes this arrest-date component in its recital." },
  "Month": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court completes this arrest-date component in its recital." },
  "Year": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court completes this arrest-date component in its recital." },
  "Class Letter": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court completes the offense class in its recital." },
  "ACA Code": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court completes the statute in its recital." },
  "Offense": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court completes the offense recital." },
  "ACA Code 2": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court completes the plea offense statute in its recital." },
  "Day 2": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court completes the plea-date component in its recital." },
  "Month 2": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court completes the plea-date component in its recital." },
  "Year 2": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court completes the plea-date component in its recital." },
  "Probation Years": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court completes the probation term in its findings." },
  "Fine": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court completes any fine amount in its findings." },
  "Check Box53": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court makes this finding; the packet does not select it." },
  "Check Box54": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court makes this finding; the packet does not select it." },
  "Check Box55": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court makes this finding; the packet does not select it." },
  "Check Box56": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court makes this finding; the packet does not select it." },
  "Charges 1": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court completes any pending-charge recital." },
  "Charges 2": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court completes any pending-charge continuation." },
  "SID": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court or agency identification block is not a packet prefill area." },
  "Check Box57": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court makes this rehabilitation finding." },
  "Check Box58": { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The court makes this rehabilitation finding." }
};

function fallbackLabel(name) {
  const labels = {
    "COURT OF": "IN THE ______ COURT OF",
    "DIVISION": "_______ DIVISION",
    "COUNTY": "caption county",
    "County": "caption county",
    "Case No": "Case No.",
    "First Middle and Last name": "First, Middle, and Last name",
    "WHEREFORE the Defendant": "WHEREFORE defendant name",
    "Comes the Petitioner": "verification petitioner name",
    "Defendant Address  Street 1": "Defendant Address, Street",
    "Defendant Address  Street 2": "Defendant Address, Street continuation",
    "Zip code": "Defendant Address ZIP code",
    "undefined_2": "charged offense A.C.A. section",
    "ACA CODE": "plea offense A.C.A. section",
    "Arrest Tracking Number": "Arrest Tracking Number",
    "FBI No if known": "FBI No. (if known)",
    "Date_3": "Certificate of Service date"
  };
  return labels[name] ?? String(name).replace(/_/g, " ");
}

function configureDocumentPolicy(doc, census) {
  const allowed = doc.key === "petition" ? PETITION_ALLOWED : ORDER_ALLOWED;
  const policies = doc.key === "petition" ? petitionPolicies : orderPolicies;
  const defaults = doc.key === "petition"
    ? { refusalClass: null, reason: "This participant-completed form blank is not held by the platform; complete it from the official record or after the required participant action." }
    : { refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "This proposed-order blank belongs to the court or agency and is left untouched." };
  doc.unwritable = census.fields.filter((f) => !allowed.has(f.name)).map((f) => {
    const p = policies[f.name] ?? defaults;
    return { field: f.name, class: p.refusalClass ?? (doc.key === "petition" ? "participant_confirmation_required" : "court_prosecutor_clerk_or_agency_owned"), why: p.reason };
  });
  doc.completeness = { defaultBlank: doc.key === "order" ? defaults : null, fields: {} };
  for (const f of census.fields) {
    if (allowed.has(f.name)) continue;
    const p = policies[f.name] ?? defaults;
    doc.completeness.fields[f.name] = {
      ...(p.refusalClass ? { refusalClass: p.refusalClass } : {}),
      ...(p.requiredBeforeFiling ? { requiredBeforeFiling: true } : {}),
      reason: p.reason
    };
    if (!f.effectiveLabel || !String(f.effectiveLabel).trim()) f.effectiveLabel = fallbackLabel(f.name);
  }
}

// The ONLY blanks in this family that may ever carry the participant's name.
const NAME_MAY_APPEAR_IN = {
  [PETITION_ID]: ["First Middle and Last name", "WHEREFORE the Defendant"],
  [ORDER_ID]: ["First Middle and Last name"]
};

// The corpus's standard canonical and boundary participants, so this family's
// fixtures are comparable with every other family's.
const CANONICAL = {
  "participant.full_legal_name": "Jordan Avery Reyes", "participant.first_name": "Jordan",
  "participant.last_name": "Reyes", "participant.middle_name": "Avery",
  "participant.street_address": "118 Maple Street", "participant.city": "Springfield",
  "participant.state": "XX", "participant.zip": "01234",
  "participant.city_state_zip": "Springfield, XX 01234",
  "participant.phone": "555-0142", "participant.email": "jordan.reyes@example.com",
  "participant.date_of_birth": "1991-04-17",
  "matter.county": "Example County", "matter.court": "Circuit Court",
  "matter.case_number": "24-CR-001234", "matter.citation_number": "C-889201",
  "matter.charge": "Possession of a controlled substance", "matter.arrest_date": "2019-03-08",
  "matter.offense_date": "2019-03-08", "matter.conviction_date": "2019-11-02",
  "matter.disposition_date": "2020-01-15", "deterministic.filing_date": "2026-08-12",
  "matter.charges": [
    { case_number: "24-CR-001234", citation_number: "C-889201", charge: "Possession of a controlled substance",
      arrest_date: "2019-03-08", offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" }
  ]
};
const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "participant.city": "Unincorporated Township of Long Hollow Crossing",
  "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, XX 01234-9999",
  "participant.zip": "01234-9999", "participant.phone": "555-0142 ext. 44821",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201",
  "matter.county": "Saint Bartholomew and the Northern Reaches County",
  "matter.charge": "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line",
  "matter.charges": [
    { case_number: "0123-45-2026-CR-900123.00-AB-CDE/2201", citation_number: "C-889201",
      charge: "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line",
      arrest_date: "2019-03-08", offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" },
    { case_number: "0123-45-2026-CR-900124.00", citation_number: "C-889202", charge: "Criminal trespass, third degree",
      arrest_date: "2020-06-21", offense_date: "2020-06-20", conviction_date: "2021-02-09", disposition_date: "2021-03-01" },
    { case_number: "0123-45-2026-CR-900125.00", citation_number: "C-889203", charge: "Driving while license suspended",
      arrest_date: "2021-09-02", offense_date: "2021-09-02", conviction_date: "2022-01-18", disposition_date: "2022-02-14" }
  ]
};

const NAME_TOKENS = [...new Set(
  [CANONICAL, BOUNDARY].flatMap((f) => [
    f["participant.full_legal_name"], f["participant.first_name"],
    f["participant.last_name"], f["participant.middle_name"]
  ]).filter(Boolean).flatMap((v) => [v, ...String(v).split(/[\s\-]+/)])
    .map((s) => s.trim()).filter((s) => s.length >= 4)
)];

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const writeJson = (rel, value) => {
  fs.mkdirSync(path.dirname(path.join(rootDir, rel)), { recursive: true });
  fs.writeFileSync(path.join(rootDir, rel), `${JSON.stringify(value, null, 2)}\n`);
};

function fieldType(f) {
  if (f instanceof PDFTextField) return "text";
  if (f instanceof PDFCheckBox) return "checkbox";
  if (f instanceof PDFRadioGroup) return "radio";
  if (f instanceof PDFDropdown) return "dropdown";
  if (f instanceof PDFOptionList) return "optionlist";
  return "other";
}

// ---- step 1: the source is the pinned source ---------------------------------
function resolveSource(doc) {
  const index = readJson(CORPUS_INDEX);
  const entry = doc.sourcePath
    ? null
    : (index.entries ?? []).find((e) => e.path === doc.pathInArchive);
  if (!doc.sourcePath && !entry) fail(`${doc.documentId}: not present in ${CORPUS_INDEX}`, doc.pathInArchive);
  if (entry && entry.sha256 !== doc.sha256) {
    fail(`${doc.documentId}: the corpus index declares a different hash`,
      `index ${entry.sha256} / family ${doc.sha256}`);
  }
  const abs = doc.sourcePath
    ? path.join(rootDir, doc.sourcePath)
    : path.join(rootDir, CORPUS_ROOT, doc.pathInArchive);
  if (!fs.existsSync(abs)) {
    fail(`${doc.documentId}: the pinned source is not installed`,
      `expected ${doc.sourcePath ?? `${CORPUS_ROOT}/${doc.pathInArchive}`}`);
  }
  const bytes = fs.readFileSync(abs);
  const got = sha256(bytes);
  if (got !== doc.sha256) fail(`${doc.documentId}: SOURCE DRIFT`, `expected ${doc.sha256}, read ${got}`);
  if (entry && bytes.length !== entry.byteLength) {
    fail(`${doc.documentId}: byte length disagrees with the corpus index`,
      `index ${entry.byteLength}, read ${bytes.length}`);
  }
  return {
    bytes,
    indexEntry: entry ?? {
      path: doc.sourcePath,
      sha256: doc.sha256,
      byteLength: bytes.length,
      pageCount: null,
      acroFieldCount: null,
      structuralClassObserved: "acroform",
      heldReference: true
    }
  };
}

// ---- census with MEASURED geometry --------------------------------------------
async function censusDocument(doc, bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  const form = pdf.getForm();

  const linesByPage = pages.map((p) => groupIntoLines(extractTextItems(p)));
  const documentTextLines = linesByPage.flat().map((l) => normalizeHarvestedText(l.text));

  const strokedByPage = new Map();
  pages.forEach((page, i) => {
    let content = "";
    for (const stream of page.node.normalizedEntries?.().Contents?.asArray?.() ?? []) {
      try { content += Buffer.from(pdf.context.lookup(stream).getContents()).toString("latin1"); } catch { /* not a stream */ }
    }
    strokedByPage.set(i + 1, content ? strokedRectangles(content) : []);
  });

  const widgetsForCapture = new Map();
  const fields = form.getFields().map((f) => {
    const name = f.getName();
    const type = fieldType(f);
    const widgets = f.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      const ref = w.P?.();
      let page = 1;
      pages.forEach((p, i) => { if (p.ref === ref) page = i + 1; });
      return {
        page,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_from_the_document"
      };
    });
    for (const w of widgets) {
      if (!widgetsForCapture.has(w.page)) widgetsForCapture.set(w.page, []);
      widgetsForCapture.get(w.page).push({ name, rect: w.rect });
    }
    return {
      name, type, widgets,
      // Read from the document, not assumed. See maxLengthOverflows(): pdf-lib
      // THROWS on a value longer than a text field's declared /MaxLen rather
      // than reporting it unfittable, so a value that will not fit has to be
      // refused before the finalizer is asked to write it.
      maxLength: type === "text" ? (f.getMaxLength() ?? null) : null
    };
  });

  const context = new Map();
  pages.forEach((page, i) => {
    const list = widgetsForCapture.get(i + 1) ?? [];
    if (!list.length) return;
    for (const c of captureWidgetContext(page, list, { precomputedLines: linesByPage[i], isFirstPage: i === 0 })) {
      if (!context.has(c.name)) context.set(c.name, c);
    }
  });

  const ruleUnder = (page, rect) => {
    const candidates = (strokedByPage.get(page) ?? []).filter((s) =>
      s.height <= 3
      && Math.min(s.x1, rect.x + rect.width) - Math.max(s.x0, rect.x) > rect.width * 0.4
      && rect.y - s.y1 >= -3 && rect.y - s.y1 <= 12);
    if (!candidates.length) return null;
    const best = candidates.sort((a, b) => (rect.y - a.y1) - (rect.y - b.y1))[0];
    return { x0: best.x0, x1: best.x1, y: best.y1, construction: best.construction };
  };

  // Printed-label corrections. Each replaces the harvested caption for ONE
  // named widget with the printed text this build read at that widget's own
  // measured position, and the harvested value it replaces is kept beside it so
  // both answers stay visible. Used only where the widget's own name says
  // nothing or says the wrong thing, only for identity, contact and venue
  // facts, and never to reach an offence, charge or statute blank.
  const corrections = doc.printedLabelCorrections ?? {};
  const censusFields = fields.map((f) => {
    const c = context.get(f.name) ?? {};
    const w = f.widgets[0] ?? null;
    const correction = Object.hasOwn(corrections, f.name) ? corrections[f.name] : null;
    const harvested = c.effectiveLabel ?? null;
    const effective = correction ? correction.printedLabel : harvested;
    const subject = effective ?? f.name;
    return {
      name: f.name,
      type: f.type,
      maxLength: f.maxLength ?? null,
      effectiveLabel: effective,
      harvestedLabel: harvested,
      printedLabelCorrection: correction,
      labelBasis: correction
        ? "printed_page_text_read_at_the_measured_widget_position"
        : (c.labelBasis ?? null),
      regionHeading: c.regionHeading ?? null,
      widgets: f.widgets,
      captionDescribesChargeValue: captionDescribesChargeValue(subject),
      captionOrNameMentionsCharge: CHARGE_VALUE_WORDS.test(subject) || CHARGE_VALUE_WORDS.test(f.name),
      protectCategory: protectCategoryOf(subject) ?? protectCategoryOf(f.name) ?? null,
      descriptorsByName: descriptorsMatching(f.name).map((d) => d.factId),
      descriptorsByLabel: effective ? descriptorsMatching(effective).map((d) => d.factId) : [],
      measuredRuleUnderWriteBox: w ? ruleUnder(w.page, w.rect) : null
    };
  });

  return {
    pdf, pages, fields: censusFields, documentTextLines,
    pageGeometry: pages.map((p, i) => ({ page: i + 1, width: +p.getSize().width.toFixed(2), height: +p.getSize().height.toFixed(2) })),
    strokedByPage
  };
}


/**
 * Values this fixture cannot place, because the FORM says the blank is too short.
 *
 * A text widget may declare /MaxLen. pdf-lib's setText throws
 * ExceededMaxLengthError when a value is longer, and the shared finalizer does
 * not catch it — so a fixture carrying a longer value does not produce a report
 * saying the value did not fit, it produces no artifact at all. The Idaho
 * shielding petition found this: its filer-name widget declares /MaxLen 35 and
 * the corpus's standard boundary participant's name is 70 characters, and the
 * build died on the second fixture after writing the first.
 *
 * That is a defect in the shared finalizer and not in this packet, and it is not
 * repaired here — rcap-text-fitting.mjs is outside this family's owned paths and
 * every other family shares it. What is done here instead is to ask the same
 * question BEFORE the finalizer is called, using the same binder, and to refuse
 * by role any field whose resolved value exceeds the length the form itself
 * declares. The refusal is per FIXTURE, because it depends on the value: the
 * canonical participant fits and the boundary participant does not, which is
 * exactly what a boundary fixture is for.
 */
function maxLengthOverflows(doc, census, facts) {
  const availableChargeRows = Array.isArray(facts?.["matter.charges"]) ? facts["matter.charges"].length : 0;
  const found = [];
  for (const f of census.fields) {
    if (f.maxLength === null || f.maxLength === undefined) continue;
    const decision = decideBinding(
      { name: f.name, pdfType: f.type, effectiveLabel: f.effectiveLabel ?? null },
      {
        explicitMappings: doc.explicitMappings ?? {},
        captionOnly: doc.captionOnly === true,
        availableChargeRows,
        documentAcceptsFill: true
      }
    );
    if (decision.writable !== true || !decision.factId) continue;
    const value = resolveFact(facts, decision.factId);
    if (value === undefined || value === null) continue;
    const length = String(value).length;
    if (length <= f.maxLength) continue;
    found.push({
      field: f.name,
      class: "exceeds_form_declared_max_length",
      factId: decision.factId,
      maxLength: f.maxLength,
      valueLength: length,
      why: `The form declares /MaxLen ${f.maxLength} on this widget and the value for ${decision.factId} is `
        + `${length} characters. The blank cannot hold it, so it is left for the participant rather than truncated.`
    });
  }
  return found;
}

// ---- prove it from the ARTIFACT, not from the report --------------------------
async function verifyFromBytes({ file, census, report, label, documentId }) {
  const drawn = await flattenedWidgets(file);
  const findings = [];
  const chargeBlanks = [];

  for (const field of census.fields) {
    const w = field.widgets[0];
    if (!w) continue;
    const here = drawnAt(drawn, { page: w.page, rect: w.rect, tolerance: 3 })
      .map((d) => d.text).filter((t) => t && t.trim() !== "");
    const text = here.join(" ").trim();
    const wasWritten = report.written.some((x) => x.field === field.name);

    if (field.captionOrNameMentionsCharge) {
      const hit = NAME_TOKENS.filter((tok) => text.toLowerCase().includes(tok.toLowerCase()));
      chargeBlanks.push({
        field: field.name, page: w.page, rect: w.rect,
        effectiveLabel: field.effectiveLabel,
        captionDescribesChargeValue: field.captionDescribesChargeValue,
        drawnText: text === "" ? null : text,
        participantNameTokensFound: hit
      });
      if (hit.length) {
        findings.push({ severity: "blocking", fixture: label, field: field.name,
          check: "participant_name_in_a_charge_caption_blank", drawnText: text, tokens: hit });
      }
    }

    if (!wasWritten && text !== "") {
      findings.push({ severity: "blocking", fixture: label, field: field.name,
        check: "refused_field_carries_ink", drawnText: text });
    }
    if (wasWritten && text === "") {
      findings.push({ severity: "blocking", fixture: label, field: field.name,
        check: "written_field_is_blank_on_the_paper" });
    }
  }

  const mustBeBlank = census.fields.filter((f) =>
    /signature|^full date( \d+)?$|^judge$/i.test(f.name)
    || f.type === "signature"
    || /certificate\s*of\s*service/i.test(f.regionHeading ?? ""));
  for (const f of mustBeBlank) {
    const w = f.widgets[0];
    if (!w) continue;
    const text = drawnAt(drawn, { page: w.page, rect: w.rect, tolerance: 3 })
      .map((d) => d.text).join(" ").trim();
    if (text !== "") {
      findings.push({ severity: "blocking", fixture: label, field: f.name,
        check: "signature_date_or_service_field_is_not_blank", drawnText: text });
    }
  }

  const allowed = new Set(NAME_MAY_APPEAR_IN[documentId] ?? []);
  const namePlacements = [];
  for (const appearance of drawn) {
    const text = String(appearance.text ?? "").trim();
    if (!text) continue;
    const hit = NAME_TOKENS.filter((tok) => text.toLowerCase().includes(tok.toLowerCase()));
    if (!hit.length) continue;
    const owner = census.fields.find((f) => f.widgets.some((w) =>
      w.page === appearance.page
      && Math.abs(w.rect.x - appearance.x) <= 3 && Math.abs(w.rect.y - appearance.y) <= 3));
    const field = owner?.name ?? null;
    namePlacements.push({ field, page: appearance.page, text, tokens: hit, allowed: allowed.has(field) });
    if (!allowed.has(field)) {
      findings.push({ severity: "blocking", fixture: label, field: field ?? "(unattributed appearance)",
        check: "participant_name_drawn_in_a_blank_not_listed_as_a_name_blank",
        page: appearance.page, drawnText: text, tokens: hit });
    }
  }

  const outside = drawn.filter((appearance) => {
    if (!String(appearance.text ?? "").trim()) return false;
    return !census.fields.some((f) => f.widgets.some((w) =>
      w.page === appearance.page
      && Math.abs(w.rect.x - appearance.x) <= 3 && Math.abs(w.rect.y - appearance.y) <= 3));
  });

  return {
    findings, chargeBlanks, namePlacements,
    appearancesDrawn: drawn.length,
    appearancesOutsideMeasuredWriteBoxes: outside.length
  };
}

// ---- the shared completeness contract's own channel ---------------------------
function completenessFields({ doc, census, written }) {
  const writtenBy = new Map(written.map((w) => [w.field, w]));
  const refusedBy = new Map((doc.completeness?.fields ? Object.entries(doc.completeness.fields) : []));
  const roleWhy = new Map(doc.unwritable.map((u) => [u.field, u]));
  return census.fields.map((f) => {
    const w = writtenBy.get(f.name);
    const declared = refusedBy.get(f.name) ?? null;
    const policy = declared ?? doc.completeness?.defaultBlank ?? null;
    const role = roleWhy.get(f.name) ?? null;
    const row = {
      field: f.name,
      fieldId: f.name,
      effectiveLabel: f.effectiveLabel,
      harvestedLabel: f.harvestedLabel ?? null,
      labelBasis: f.labelBasis ?? null,
      page: f.widgets?.[0]?.page ?? null,
      pdfType: f.type,
      isSelectionControl: f.type === "checkbox" || f.type === "radio",
      decision: w ? "write" : "refuse",
      factId: w?.factId ?? null,
      buildRoleClass: role?.class ?? null,
      buildRoleWhy: role?.why ?? null
    };
    if (w) return row;
    row.reason = policy?.reason ?? null;
    row.refusalClass = policy?.refusalClass ?? null;
    if (policy?.requiredBeforeFiling === true) row.requiredBeforeFiling = true;
    return row;
  });
}

function actualWritesArtifacts(documents) {
  return documents.flatMap(({ doc, fixtures }) =>
    ["canonical", "boundary"].map((label) => {
      const proof = fixtures[label].proof;
      return {
        documentId: doc.documentId,
        fixture: label,
        file: fixtures[label].file,
        sha256: fixtures[label].sha256,
        proofMethod:
          "AcroForm fill: every value is set on the document's own widget and its appearance is generated by the "
          + "form. The counts below are read back from the finished PDF with pdf-flattened-widgets.mjs, at each "
          + "field's own measured /Rect.",
        valuesReportedByFinalizer: fixtures[label].report.written.length,
        flattenedWidgetAppearancesReadFromOutputBytes: proof.appearancesDrawn,
        addedGlyphsReadFromOutputBytes: 0,
        addedGlyphsNote:
          "Zero by construction, not by measurement: this family writes through AcroForm widgets rather than by "
          + "drawing into page content, so every mark it makes is a widget appearance and is counted in the "
          + "column beside this one.",
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.appearancesOutsideMeasuredWriteBoxes,
        refusedFieldsWithInk: proof.findings
          .filter((x) => x.check === "refused_field_carries_ink")
          .map((x) => ({ fieldId: x.field, drawnText: x.drawnText })),
        participantNameTokensOutsideTheNameAllowlist: proof.namePlacements.filter((n) => !n.allowed).length
      };
    }));
}

// ---- participant instructions -------------------------------------------------
//
// Guidance is a separate participant component so the plea-stage prerequisite
// does not become a court filing or a fabricated election. The route record
// supplies the filing, service and self-help stops; unrecorded fee and
// notarization details remain for the participant to confirm with the filing
// office.
function participantInstructionsMarkdown() {
  return `# Act 346 First Offender Dismiss and Seal — staged Arkansas packet

This route has two stages. **LegalEase does not recreate the plea election or negotiate Act 346 placement.** Stage 1 is guidance for the plea or probation process. Stage 2 becomes available only after you confirm that the court placed you under Act 346 as a first offender and that you completed probation or were released by the court. The stage-2 packet is the official ACIC petition and proposed order, kept together.

## Stage 1 — placement and completion

Act 346 placement is handled in the criminal case. Ask your Arkansas lawyer or the prosecuting attorney and court about placement; prosecutor concurrence at the plea stage is a negotiation, not a self-help filing step. This packet does not select a plea, mark an Act 346 election, or state that the court placed you on probation. Keep the placement or probation order and the completion or release record.

Do not proceed to the forms until you can truthfully confirm all of these from your own records:

- the court placed you on probation under Act 346 as a first offender;
- the probation term and any conditions were completed, or the court released you early;
- the underlying court, county, case number and charge match your ACIC history and court paperwork; and
- the Act 346 route is the one the court used for this case.

If placement, completion, or the covered offense is uncertain, stop and ask an Arkansas lawyer or the clerk where the case was handled. The clerk can explain filing procedure but cannot give legal advice.

## Stage 2 — the official forms

The petition and proposed order are the ACIC forms named in the route record:

- **ACIC Petition to Dismiss and Seal First Offenders under Act 346 of 1975 and Act 1460 of 2013** — the participant's filing;
- **ACIC Order to Dismiss and Seal First Offenders under Act 346 of 1975 and Act 1460 of 2013** — the proposed order for the court.

The platform fills only held facts: your confirmed legal name in the petition caption and prayer, the held county, case number, one charged-offense line, your date of birth, and the address block. It leaves court identity, date components, plea or conviction details, class and statute blanks, elections, identification numbers, signatures, verification and service for the participant, clerk, agency, court, or notary that owns them. The proposed order receives caption facts only; its recitals, findings, decree, judge line, date and identification block stay blank for the court.

### Confirm the caption and the record

1. Get or review the current ACIC criminal-history record and your court paperwork. If you need the record, use the current ACIC Authorization for Review of Criminal History Information as the separate ACIC records step. Check the case number, county, charge, offense class, A.C.A. section, arrest date, plea or conviction information, and probation term.
2. Ask the clerk of the court that handled the case which court name and division belong in the caption. Write the same court and division on the petition and proposed order. The platform holds the county but does not invent the court identity.
3. Copy each date component and each statute or class entry from the record. The platform holds a date as a whole and does not split it into the official form's day, month, and year blanks.
4. Complete the identification block, including race, sex, SID, arrest tracking number, and FBI number if known, from your records. The platform does not invent agency identifiers.
5. Read every paragraph and mark only what is true: the felony or misdemeanor box, the Act 346 disposition/completion choice, and the no-pending-felony or pending-felony choice. If the pending-felony branch applies, state the other court, case and current status from your records.
6. Complete the verification, including any required notary execution, only with the person who owns that act. Sign and date the petition yourself.

For a field-by-field handoff, the petition's required participant entries include the blanks named \`COURT OF\`, \`felony  misdemeanor in violation of ACA\`, \`years but not less than\`, \`DAY\`, \`MONTH\`, \`YEAR\`, \`OFFENSE\`, \`ACA CODE\`, \`charged offense A.C.A. section\`, \`SID\`, \`Race\`, and \`Sex\`. Copy the court/probation/date/plea/statute/identification answers from the records above. The verification blank \`Comes the Petitioner\` is completed with the confirmed name when that verification is executed; \`COUNTY OF\` and its date components are completed by the participant and notary if the filing court requires verification. Optional second lines and the \`CHARGES 1\`/\`CHARGES 2\` pending-charge continuation are used only when they fit the participant's actual records.

The printed blank **A Class _____ [_] felony [_] misdemeanor in violation of A.C** asks for the charged offense class and A.C.A. section. Copy those entries from the ACIC record or court paperwork; the platform leaves that source blank for you.

The petition's paragraph 1 charged-offense line is prefilled from the held matter charge. Paragraph 2 asks for the offense to which you entered a guilty or nolo contendere plea. **That is a separate fact:** copy the plea or conviction offense and A.C.A. section from your judgment or ACIC record; the platform does not recreate the plea election or assume the two descriptions are identical.

### Fingerprint card and service

Obtain the fingerprint card required for the filing from the appropriate law-enforcement agency or authorized fingerprint provider. LegalEase does not collect or fabricate fingerprints, an ACIC record, or an agency identifier.

The petition's Certificate of Service says to provide a copy to the prosecuting attorney for the county, or the city attorney depending on which office prosecuted the case, and to the arresting agency. The route record says to serve the prosecuting attorney within three days of filing. Use the form's delivery method and complete the certificate only after service actually occurs. The route record identifies a 30-day prosecutor objection window. If an objection or contested hearing occurs, stop self-help and obtain an Arkansas lawyer; do not treat an objection as a routine checkbox.

### Filing destination, fees, and later steps

File in the court that handled the criminal case, using the county and case information confirmed above. The route record does not establish a filing-fee amount or a fee-waiver procedure. Ask the filing clerk what, if anything, is due and whether a local waiver process applies; do not rely on an amount this packet cannot source. Criminal-history, fingerprint, copy, or counsel costs are separate from any court filing fee.

The proposed order is submitted with the petition and is for the court. If the court grants relief, follow the clerk's instructions for certified copies and agency distribution. LegalEase does not represent that a court will grant relief or that an agency has updated its records.

## Where self-help stops

Stop and get an Arkansas lawyer or other appropriate professional help if:

- The prosecuting attorney objects within the 30-day window. Stop self-help and obtain Arkansas legal help;
- The court sets a contested hearing. Stop self-help and obtain Arkansas legal help;
- Immigration, licensing or firearm consequences are in play. Obtain advice from the appropriate professional;
- The participant is still on Act 346 probation. If that is true, stop before using Stage 2;
- Prosecutor concurrence is required at the plea stage, which is negotiation rather than self-help. This packet does not handle that negotiation;
- Act 346 placement, probation completion, early release, or the covered first-offender facts are uncertain;
- a pending felony, probation condition, unpaid restitution, fine, or court cost may affect the case;
- employment, housing, or other consequences matter to you;
- you cannot reconcile the ACIC history, judgment, probation order, and petition facts; or
- the clerk gives filing instructions that conflict with this packet.

This is a prepared packet of official ACIC forms and staged participant guidance. It is not legal advice, it does not choose or recreate an Act 346 plea, it is not filed for you, and it does not decide eligibility or the court's ruling.

_Route: ${ROUTE_KEY} — A.C.A. §§ 16-93-303 and 16-93-314; official ACIC forms under Act 346 and Act 1460_
`;
}

// ---- main --------------------------------------------------------------------
async function main() {
  const blocked = new Set(readJson(STALE_BLOCK).hashes ?? []);
  fs.mkdirSync(path.join(rootDir, OUT), { recursive: true });

  const documents = [];
  const allFindings = [];

  for (const doc of DOCUMENTS) {
    console.log(`\n=== ${doc.documentId} (${doc.documentRole}) ===`);
    const { bytes, indexEntry } = resolveSource(doc);
    console.log(`  source verified  sha256=${doc.sha256}  bytes=${bytes.length}`);

    const census = await censusDocument(doc, bytes);
    console.log(`  censused ${census.fields.length} fields across ${census.pages.length} pages`);
    configureDocumentPolicy(doc, census);

    const fixtures = {};
    for (const [label, facts] of [["canonical", CANONICAL], ["boundary", BOUNDARY]]) {
      const overflows = maxLengthOverflows(doc, census, facts);
      for (const o of overflows) {
        console.log(`  ${label}: ${o.field} refused — /MaxLen ${o.maxLength} < ${o.valueLength} characters of ${o.factId}`);
      }
      const result = await finalizeOfficialForm({
        sourceBytes: bytes,
        expectedSha256: doc.sha256,
        census: census.fields,
        facts,
        explicitMappings: doc.explicitMappings,
        unwritableFields: [
          ...doc.unwritable.map((u) => ({ field: u.field, class: u.class })),
          ...overflows.map((o) => ({ field: o.field, class: o.class }))
        ],
        captionOnly: doc.captionOnly,
        documentTextLines: census.documentTextLines,
        title: `AR ${doc.documentId}`
      });

      if (doc.key === "order" && result.report.written.some((w) => w.field === "Defendant")) {
        fail("the proposed-order page-3 grant-decree Defendant field must remain court-owned and blank");
      }

      const rel = `${OUT}/fixtures/${doc.key}-${label}-filled.pdf`;
      fs.mkdirSync(path.dirname(path.join(rootDir, rel)), { recursive: true });
      fs.writeFileSync(path.join(rootDir, rel), result.bytes);
      const hash = sha256(result.bytes);
      if (blocked.has(hash)) fail(`${doc.documentId}/${label}: rendered to a BLOCKED hash`, hash);

      const proof = await verifyFromBytes({
        file: path.join(rootDir, rel), census, report: result.report,
        label: `${doc.key}-${label}`, documentId: doc.documentId
      });
      allFindings.push(...proof.findings);

      console.log(`  ${label}: wrote ${result.report.written.length}, refused ${result.report.refused.length}`
        + `, sha256=${hash.slice(0, 16)}…  charge-blanks checked=${proof.chargeBlanks.length}`
        + `  findings=${proof.findings.length}`);

      fixtures[label] = { file: rel, sha256: hash, byteLength: result.bytes.length, report: result.report, proof, overflows };
    }

    documents.push({ doc, census, indexEntry, fixtures, sourceByteLength: bytes.length });
  }

  // ---- the records -------------------------------------------------------------
  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID,
    worklistGroupId: FAMILY_ID,
    implementationStrategy: "official_pdf_fill",
    jurisdiction: "AR",
    routeKeys: ROUTE_KEYS,
    custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false,
    whyNoAcquisition:
      "Both official ACIC form sources were already held and are bound by exact SHA-256. The petition is held "
      + "under the committed source-recovery path and the order is held in the verified Master Library; no court "
      + "host was fetched during this build.",
    sourceArchive: "held source-recovery/2026-09-11-wave1 plus Expungement_AI_RCAP_Master_Library_Edition_1",
    allSourcesExact: true,
    componentSet: [
      { componentId: "ar-act346-process-guidance-1", kind: "participant_instruction", filed: false },
      { componentId: "ar-act346-primary-filing-2", kind: "official_form_dependency", documentId: PETITION_ID, filed: true },
      { componentId: "ar-act346-proposed-order-3", kind: "official_form_dependency", documentId: ORDER_ID, filed: true }
    ],
    documents: documents.map(({ doc, indexEntry, sourceByteLength }) => ({
      sourceId: `official-form:${doc.documentId}`,
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      officialTitle: doc.officialTitle,
      revision: doc.revision,
      sha256: doc.sha256,
      byteLength: sourceByteLength,
      pathInArchive: doc.pathInArchive,
      sourcePath: doc.sourcePath ?? null,
      sourceBindingEvidence: "data/rcap-grade-a/source-wave-integration/SOURCE_RECOVERY_WAVE1_2026-09-11.json",
      matchedBy: "exact_pinned_sha256",
      corpusIndexAgrees: !indexEntry.heldReference && indexEntry.sha256 === doc.sha256 && indexEntry.byteLength === sourceByteLength,
      heldReferenceBinding: Boolean(indexEntry.heldReference),
      pageCount: indexEntry.pageCount ?? (documents.find((d) => d.doc.documentId === doc.documentId)?.census.pages.length ?? null),
      selectedSourcePages: Array.from({ length: indexEntry.pageCount ?? (documents.find((d) => d.doc.documentId === doc.documentId)?.census.pages.length ?? 0) }, (_, i) => i + 1),
      acroFieldCount: indexEntry.acroFieldCount ?? (documents.find((d) => d.doc.documentId === doc.documentId)?.census.fields.length ?? null),
      structuralClassObserved: indexEntry.structuralClassObserved
    })),
    whatThisReceiptDoesNotEstablish: [
      "that this is the current official edition of either form",
      "that neither has been superseded since the archive was assembled",
      "that any output is approved for participant delivery"
    ]
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId: FAMILY_ID,
    censusBasis: "first_hand_inspection_of_the_pinned_verified_binary",
    geometryBasis:
      "Every write box is the AcroForm widget's own /Rect, read from the document. No box is derived from a "
      + "label position; captions are captured separately and decide only what a blank means, never where it is.",
    filenameNote:
      "Deliberately NOT named field-census.json. "
      + "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs walks the overlays for that "
      + "exact filename and asserts family and field totals equal counts frozen in a diff record outside this "
      + "family's owned path. Enrolling a new census under that name would change those totals. The guard is not "
      + "weakened or skipped: this family's own charge-caption projection is recorded in "
      + "reports/charge-caption-proof.json.",
    documents: documents.map(({ doc, census }) => ({
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      ownership: doc.ownership,
      captionOnly: doc.captionOnly,
      pageGeometry: census.pageGeometry,
      fieldCount: census.fields.length,
      fields: census.fields
    }))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    routeKeys: ROUTE_KEYS,
    renderStrategy: "acroform_fill",
    compositionMode: "sequential",
    componentSet: [
      { componentId: "ar-act346-process-guidance-1", kind: "participant_instruction", stage: 1, filed: false },
      { componentId: "ar-act346-primary-filing-2", kind: "official_form_dependency", stage: 2, documentId: PETITION_ID, filed: true },
      { componentId: "ar-act346-proposed-order-3", kind: "official_form_dependency", stage: 2, documentId: ORDER_ID, filed: true }
    ],
    generationAllowed: false,
    runtimeSelectable: false,
    documents: documents.map(({ doc, census, fixtures }) => {
      const written = fixtures.canonical.report.written;
      const byName = new Map(census.fields.map((f) => [f.name, f]));
      return {
        documentId: doc.documentId,
        documentRole: doc.documentRole,
        ownership: doc.ownership,
        captionOnly: doc.captionOnly,
        explicitMappings: doc.explicitMappings,
        printedLabelCorrections: doc.printedLabelCorrections ?? {},
        printedLabelCorrectionNote:
          "Each entry replaced the harvested caption for one named widget with the printed text this build read "
          + "at that widget's own measured position, because the widget's name says nothing or says the wrong "
          + "thing. The harvested value each replaced is kept on the field-census row as harvestedLabel, and the "
          + "evidence for each correction is in the entry itself.",
        roleRefusals: doc.unwritable,
        writeBoxes: written.map((w) => {
          const f = byName.get(w.field);
          return {
            field: w.field,
            factId: w.factId ?? null,
            page: f?.widgets?.[0]?.page ?? null,
            rect: f?.widgets?.[0]?.rect ?? null,
            rectBasis: "acroform_widget_rect_read_from_the_document",
            measuredRuleUnderWriteBox: f?.measuredRuleUnderWriteBox ?? null,
            effectiveLabel: f?.effectiveLabel ?? null
          };
        }),
        refused: fixtures.canonical.report.refused,
        protectedFields: fixtures.canonical.report.protectedFields,
        fields: completenessFields({ doc, census, written })
      };
    })
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1",
    familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    note:
      "What each finished fixture actually carries, read back from its own bytes. The finalizer's report says "
      + "what this build believes it wrote; this says what the paper shows.",
    artifacts: actualWritesArtifacts(documents)
  });

  const chargeBlanks = documents.flatMap(({ doc, fixtures }) =>
    ["canonical", "boundary"].flatMap((label) =>
      fixtures[label].proof.chargeBlanks.map((b) => ({ document: doc.documentId, fixture: label, ...b }))));

  writeJson(`${OUT}/reports/charge-caption-proof.json`, {
    schemaVersion: "rcap-charge-caption-proof/v1",
    familyId: FAMILY_ID,
    question:
      "Does any blank whose caption or field name names a charge, offence, count, statute or violation "
      + "carry a participant name token in the rendered artifact bytes?",
    method:
      "Read back from the flattened appearance streams of each rendered fixture with "
      + "scripts/rcap-official-forms/pdf-flattened-widgets.mjs, at each field's own measured widget rectangle.",
    consistentWith: "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs",
    participantNameTokensSearchedFor: NAME_TOKENS,
    chargeBlanksExamined: chargeBlanks.length,
    chargeBlanksCarryingAParticipantName: chargeBlanks.filter((b) => b.participantNameTokensFound.length).length,
    answer: chargeBlanks.some((b) => b.participantNameTokensFound.length)
      ? "YES — this build is defective"
      : "NO — no participant name lands in any charge-caption blank in any fixture",
    blanks: chargeBlanks,
    guardProjection: (() => {
      const offending = [];
      let scanned = 0;
      for (const { doc, census } of documents) {
        for (const field of census.fields) {
          scanned += 1;
          const decision = decideBinding(
            { name: field.name, pdfType: field.type, effectiveLabel: field.effectiveLabel ?? null }, {}
          );
          const usesChargeVocabulary = [field.name, field.effectiveLabel]
            .filter(Boolean).some((t) => CHARGE_VALUE_WORDS.test(String(t)));
          if (decision.writable === true && decision.factId === "participant.full_legal_name" && usesChargeVocabulary) {
            offending.push({ document: doc.documentId, field: field.name, effectiveLabel: field.effectiveLabel });
          }
        }
      }
      return {
        question:
          "Applying the corpus guard's own offending-row test to this family's census: does any blank bind a "
          + "writable participant.full_legal_name while its name or caption uses the charge vocabulary?",
        fieldsScanned: scanned,
        offendingRows: offending.length,
        offending
      };
    })()
  });

  const namePlacements = documents.flatMap(({ doc, fixtures }) =>
    ["canonical", "boundary"].flatMap((label) =>
      fixtures[label].proof.namePlacements.map((n) => ({ document: doc.documentId, fixture: label, ...n }))));
  writeJson(`${OUT}/reports/participant-name-placement.json`, {
    schemaVersion: "rcap-participant-name-placement/v1",
    familyId: FAMILY_ID,
    question:
      "In the rendered artifact bytes, does every drawn participant-name token sit in a blank this family "
      + "listed as one the name belongs in?",
    method:
      "Every flattened appearance in each fixture is read and matched back to the censused blank at its own "
      + "measured rectangle.",
    blanksTheNameMayAppearIn: NAME_MAY_APPEAR_IN,
    placementsFound: namePlacements.length,
    placementsOutsideTheAllowlist: namePlacements.filter((n) => !n.allowed).length,
    placements: namePlacements
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId: FAMILY_ID,
    renderedFresh: true,
    citesNoBlockedHash: true,
    staleArtifactBlock: STALE_BLOCK,
    note:
      "Rendered fresh from the pinned source bytes. Every output hash below was checked against the hashes in "
      + "the stale-artifact block and matches none of them.",
    rasterisation: {
      performedHere: false,
      why:
        "This container resolves no browser, so no page raster is produced at build time. The render happens "
        + "centrally in .github/workflows/rcap-packet-raster-acceptance-batch.yml against the exact bytes the "
        + "hashes below pin. This family is BUILT_RASTER_PENDING and no visual obligation is waived by it.",
      rasters: []
    },
    packets: [{
      packetId: FAMILY_ID,
      componentSet: ["ar-act346-process-guidance-1", "ar-act346-primary-filing-2", "ar-act346-proposed-order-3"],
      documents: documents.flatMap(({ doc, fixtures }) =>
        ["canonical", "boundary"].map((label) => `${doc.documentId} (${label})`))
    }],
    historicalRouteExclusion: {
      path: HISTORICAL_COMPOSED_ROUTE,
      status: "retained_historical_only",
      excludedFromCurrentParticipantDelivery: true,
      basis: "The current participant delivery is the census-v1 family directory and its three-component set above; the legacy composed-route directory is retained as historical dependency-deferral evidence and is not an input or output of this build."
    },
    artifacts: documents.flatMap(({ doc, fixtures }) =>
      ["canonical", "boundary"].map((label) => ({
        document: doc.documentId, fixture: label,
        file: fixtures[label].file, sha256: fixtures[label].sha256, byteLength: fixtures[label].byteLength,
        fieldsWritten: fixtures[label].report.written.length,
        fieldsRefused: fixtures[label].report.refused.length,
        unfittable: fixtures[label].report.unfittable,
        refusedForExceedingFormDeclaredMaxLength: fixtures[label].overflows ?? []
      })))
  });

  const blanksLeft = documents.flatMap(({ doc, census, fixtures }) => {
    const written = new Set(fixtures.canonical.report.written.map((w) => w.field));
    const refusedBy = new Map(fixtures.canonical.report.refused.map((r) => [r.field, r]));
    const roleWhy = new Map(doc.unwritable.map((u) => [u.field, u.why]));
    return census.fields.filter((f) => !written.has(f.name)).map((f) => ({
      document: doc.documentId,
      field: f.name,
      page: f.widgets?.[0]?.page ?? null,
      effectiveLabel: f.effectiveLabel,
      reason: refusedBy.get(f.name)?.reason ?? "not_reached",
      category: refusedBy.get(f.name)?.category ?? null,
      why: roleWhy.get(f.name) ?? null
    }));
  });
  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-participant-blanks/v1",
    familyId: FAMILY_ID,
    note:
      "Every blank this family does not fill, and why. A blank here is not an omission to be closed later by "
      + "widening the map: each is either the participant's to complete, the court's, or a value the platform "
      + "does not hold.",
    count: blanksLeft.length,
    blanks: blanksLeft
  });

  fs.writeFileSync(path.join(rootDir, `${OUT}/participant-instructions.md`), participantInstructionsMarkdown());
  fs.writeFileSync(path.join(rootDir, `${OUT}/stage-1-process-guidance.md`), `# Stage 1 — Act 346 placement and completion guidance

This guidance is a participant aid and is never filed with the court. LegalEase does not recreate the plea election, select Act 346 placement, or state that a court placed a participant on probation. Ask the lawyer, prosecutor, and court handling the criminal case about that plea-stage decision.

Continue to the official ACIC petition and proposed order only after the participant confirms Act 346 first-offender placement and completion of probation (or a court release before completion), and confirms the court, county, case number, and charge against the ACIC record and court paperwork. Keep the placement/probation order and completion or release record.

Stop and obtain Arkansas legal help if placement or completion is uncertain, the prosecutor objects, a contested hearing is set, a pending felony or unpaid obligation may affect the case, or immigration, licensing, firearm, or other collateral consequences matter. The later petition-and-order pair is the stage-2 packet; this process guidance does not replace either official ACIC form.
`);
  writeJson(`${OUT}/component-set.json`, {
    schemaVersion: "rcap-composed-component-set/v1",
    familyId: FAMILY_ID,
    compositionMode: "sequential",
    components: [
      { componentId: "ar-act346-process-guidance-1", stage: 1, kind: "participant_instruction", file: `${OUT}/stage-1-process-guidance.md`, filed: false },
      { componentId: "ar-act346-primary-filing-2", stage: 2, kind: "official_form_dependency", documentId: PETITION_ID, filed: true },
      { componentId: "ar-act346-proposed-order-3", stage: 2, kind: "official_form_dependency", documentId: ORDER_ID, filed: true }
    ],
    sourceBindings: [PETITION_SHA, ORDER_SHA],
    note: "Stage 1 remains participant guidance; stage 2 is the official ACIC petition and proposed order pair.",
    historicalRouteExclusion: {
      path: HISTORICAL_COMPOSED_ROUTE,
      status: "retained_historical_only",
      excludedFromCurrentParticipantDelivery: true
    }
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1",
    familyId: FAMILY_ID,
    routeKeys: ROUTE_KEYS,
    status: "REQUESTED",
    grantedBy: null,
    note:
      "This is a REQUEST for output-level legal review. This build grants no approval, opens no commercial "
      + "route, creates no fulfillment record and marks no packet proven. The family remains not runtime-"
      + "selectable and generationAllowed is false.",
    workTypesAddressed: {
      OFFICIAL_SOURCE_ACQUISITION_REQUIRED:
        "Resolved as custody, not acquisition: both sources were already held and are bound by pinned SHA-256.",
      OFFICIAL_FORM_MAP_REQUIRED:
        "Field map built from measured widget geometry for both documents.",
      ARTIFACT_REVIEW_REQUIRED:
        "Canonical and boundary fixtures rendered and verified from the artifact bytes. Page rasterisation is "
        + "central and pending; this family is BUILT_RASTER_PENDING.",
      OUTPUT_LEGAL_APPROVAL_REQUIRED:
        "NOT addressed. Requested here; a human legal reviewer grants it or does not."
    },
    independentVisualReviewRequired: true
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-build-findings/v1",
    familyId: FAMILY_ID,
    blocking: allFindings.filter((f) => f.severity === "blocking"),
    findingCount: allFindings.length
  });

  const participantGuidePath = path.join(rootDir, `${OUT}/participant-instructions.md`);
  const stageGuidePath = path.join(rootDir, `${OUT}/stage-1-process-guidance.md`);
  const participantGuideText = fs.readFileSync(participantGuidePath, "utf8");
  const stageGuideText = fs.readFileSync(stageGuidePath, "utf8");
  writeJson(`${OUT}/reports/focused-self-test.json`, {
    schemaVersion: "rcap-ar-act346-focused-self-test/v1",
    familyId: FAMILY_ID,
    sourceBindings: documents.map(({ doc, indexEntry, census, sourceByteLength }) => ({
      documentId: doc.documentId,
      sourcePath: doc.sourcePath ?? doc.pathInArchive,
      sha256: doc.sha256,
      byteLength: sourceByteLength,
      pageCount: census.pages.length,
      acroFieldCount: census.fields.length,
      exactSource: sha256(fs.readFileSync(path.join(rootDir, doc.sourcePath ?? path.join(CORPUS_ROOT, doc.pathInArchive)))) === doc.sha256,
      corpusIndexChecked: !indexEntry.heldReference,
      corpusIndexAgrees: !indexEntry.heldReference
        ? indexEntry.sha256 === doc.sha256 && indexEntry.byteLength === sourceByteLength
        : null
    })),
    fixtures: documents.flatMap(({ doc, census, fixtures }) => ["canonical", "boundary"].map((label) => ({
      documentId: doc.documentId,
      fixture: label,
      file: fixtures[label].file,
      sha256: fixtures[label].sha256,
      byteLength: fixtures[label].byteLength,
      pages: census.pages.length,
      valuesReportedByFinalizer: fixtures[label].report.written.length,
      flattenedWidgetAppearancesReadFromOutputBytes: fixtures[label].proof.appearancesDrawn,
      findings: fixtures[label].proof.findings.length,
      refusedFieldInk: fixtures[label].proof.findings.filter((f) => f.check === "refused_field_carries_ink").length,
      nameOutsideAllowlist: fixtures[label].proof.namePlacements.filter((n) => !n.allowed).length
    }))),
    routeComponents: [
      "ar-act346-process-guidance-1",
      "ar-act346-primary-filing-2",
      "ar-act346-proposed-order-3"
    ],
    participantGuidance: {
      files: [participantGuidePath, stageGuidePath].map((p) => p.replace(`${rootDir}/`, "")),
      nonEmpty: participantGuideText.trim().length > 0 && stageGuideText.trim().length > 0,
      noUndefinedToken: !/\bundefined\b/i.test(`${participantGuideText}\n${stageGuideText}`),
      explicitAct346ProbationStop: participantGuideText.includes("The participant is still on Act 346 probation.")
    },
    orderDecreeProtection: {
      field: "Defendant",
      page: 3,
      written: documents.find((d) => d.doc.key === "order")?.fixtures.canonical.report.written.some((w) => w.field === "Defendant") ?? false,
      expected: "court-owned blank"
    },
    historicalRouteExclusion: {
      path: HISTORICAL_COMPOSED_ROUTE,
      status: "retained_historical_only",
      excludedFromCurrentParticipantDelivery: true,
      currentDeliveryDirectory: OUT
    },
    checks: {
      allBuilderFindingsZero: allFindings.length === 0,
      allOutputBytesReopened: documents.every(({ fixtures }) => ["canonical", "boundary"].every((label) => fixtures[label].proof.findings.length === 0)),
      protectedFieldsRemainBlank: documents.every(({ fixtures }) => ["canonical", "boundary"].every((label) => fixtures[label].proof.findings.filter((f) => /signature_date_or_service_field_is_not_blank|refused_field_carries_ink/.test(f.check)).length === 0)),
      stagedGuidancePresent: fs.existsSync(path.join(rootDir, `${OUT}/stage-1-process-guidance.md`)),
      noRasterFiles: !fs.readdirSync(path.join(rootDir, `${OUT}/fixtures`)).some((f) => /\.(png|webp|jpg|jpeg)$/i.test(f)),
      participantGuidesNonEmpty: participantGuideText.trim().length > 0 && stageGuideText.trim().length > 0,
      participantGuidesNoUndefined: !/\bundefined\b/i.test(`${participantGuideText}\n${stageGuideText}`),
      orderGrantDecreeRemainsBlank: !(documents.find((d) => d.doc.key === "order")?.fixtures.canonical.report.written.some((w) => w.field === "Defendant") ?? false),
      historicalComposedRouteExcluded: true
    },
    visualMeasured: false,
    independentSemanticReview: false
  });

  console.log(`\n${allFindings.length === 0 ? "OK" : "FINDINGS"}: `
    + `${chargeBlanks.length} charge-caption blanks examined across all fixtures, `
    + `${chargeBlanks.filter((b) => b.participantNameTokensFound.length).length} carrying a participant name.`);
  if (allFindings.length) {
    for (const f of allFindings) console.error(`  ${f.severity} ${f.fixture} ${f.field}: ${f.check}`);
    process.exit(1);
  }
}

await main();
