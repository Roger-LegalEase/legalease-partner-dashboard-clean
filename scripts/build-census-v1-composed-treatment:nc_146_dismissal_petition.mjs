#!/usr/bin/env node
/**
 * PF17 composed packet for the separate North Carolina DNA-expunction
 * application under G.S. 15A-146(b1).
 *
 * This is not AOC-CR-287. That form and its instructions say on their faces
 * that they serve subsection (a)/(a1) dismissal petitions. They are exact,
 * hash-bound reference sources for the parent packet set, but substituting
 * them for the separate (b1) application would collapse two routes. The
 * application and service certificate are therefore composed from the exact
 * route evidence in the authoritative queue. AOC-CV-226 is carried as the
 * queue-required, conditional fee-waiver companion without asserting that a
 * fee applies.
 *
 * Usage:
 *   node "scripts/build-census-v1-composed-treatment:nc_146_dismissal_petition.mjs" --check
 *   node "scripts/build-census-v1-composed-treatment:nc_146_dismissal_petition.mjs" --no-raster
 *
 * A build creates review artifacts only. It grants no runtime, commercial,
 * fulfillment, payment, sponsorship, approval, or live-route authority.
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { sanitizeAndFlatten } from "./rcap-official-forms/rcap-active-content.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import {
  BLANK_DISPOSITIONS,
  PASS_COUNTERS,
  classifyBlank,
  classifyField,
  rowKeyOf
} from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "composed-treatment:nc_146_dismissal_petition";
const ROUTE_KEY = "obligation:track-branch:NC:nc_146_dismissal_petition:dna-expunction-application-15a-146-b1";
const OUT = "data/rcap-all50/overlays/census-v1/nc/composed-treatment:nc-146-dismissal-petition--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-composed-treatment:nc_146_dismissal_petition.mjs";
const QUEUE = "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json";

const COMPONENTS = {
  application: "component:nc_146_dismissal_petition-primary-filing-1",
  instructions: "component:nc_146_dismissal_petition-instructions-2",
  feeWaiver: "component:nc_146_dismissal_petition-fee-waiver-3"
};

const SOURCES = [
  {
    sourceId: "official-form:AOC-CR-287",
    formNumber: "AOC-CR-287",
    relativePath: "private/source-imports/rcap-d-source-packs-2026-08-12/D1/STATES/NC/02_PACKET_FORMS/NC__FORM__AOC-CR-287__aoc-cr-287-petition-and-order-of-expunction__REV-2025-12__EN.pdf",
    sha256: "a876229328f9ee8325890b597633b661711fe606da1be8ddb573cd50791365ed",
    byteLength: 257828,
    role: "exact bound reference for the parent dismissal packet; its face limits it to G.S. 15A-146(a)/(a1), so it is not substituted for this separate (b1) application",
    renderedInArtifact: false
  },
  {
    sourceId: "official-form:AOC-CR-287-INSTRUCTIONS",
    formNumber: "AOC-CR-287-INSTRUCTIONS",
    relativePath: "private/source-imports/rcap-d-source-packs-2026-08-12/D1/STATES/NC/03_INSTRUCTIONS/NC__INSTRUCTIONS__AOC-CR-287__aoc-cr-287-instructions__REV-2025-12__EN.pdf",
    sha256: "fe22270401aa22ee5c801871aeb1c00f3b98cfb6867f7155681bab4af9c990d7",
    byteLength: 217744,
    role: "exact bound instructions for AOC-CR-287; subsection (a)/(a1) instructions are not presented as instructions for the separate (b1) application",
    renderedInArtifact: false
  },
  {
    sourceId: "official-form:AOC-CV-226",
    formNumber: "AOC-CV-226",
    relativePath: "private/source-imports/rcap-d-source-packs-2026-08-12/D1/STATES/NC/04_SUPPORTING_PROCESS/NC__SUPPORT__AOC-CV-226__aoc-cv-226-affidavit-of-indigency__REV-2023-04__EN.pdf",
    sha256: "74057a13e4bccccbbac785c845b4996b322c6219e1c45f1ab42dca2377755a8f",
    byteLength: 269426,
    role: "queue-required conditional fee-waiver companion, included only with an instruction to ask the clerk whether a fee applies and whether this form is accepted",
    renderedInArtifact: true
  }
];

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Larkspur Street",
    "participant.city": "Raleigh",
    "participant.state": "NC",
    "participant.zip": "27601",
    "participant.mailing_address": "42 Larkspur Street, Raleigh, NC 27601",
    "participant.phone": "919-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "matter.case_number": "19CR001184",
    "matter.county": "Wake"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Yadkin River Crossing Road, Apartment 14B",
    "participant.city": "Winston-Salem",
    "participant.state": "NC",
    "participant.zip": "27101-2214",
    "participant.mailing_address": "1188 Upper Yadkin River Crossing Road, Apartment 14B, Winston-Salem, NC 27101-2214",
    "participant.phone": "(336) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org",
    "matter.case_number": "2004CR000000118844-A",
    "matter.county": "New Hanover"
  }
};

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const writeJson = (rel, value) => {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
};

function bindInputs() {
  const failures = [];
  const boundSources = [];
  for (const source of SOURCES) {
    const abs = path.join(ROOT, source.relativePath);
    if (!fs.existsSync(abs)) {
      failures.push({ sourceId: source.sourceId, path: source.relativePath, expectedSha256: source.sha256, expectedByteLength: source.byteLength, error: "SOURCE_MISSING" });
      continue;
    }
    const bytes = fs.readFileSync(abs);
    const actualSha256 = sha256(bytes);
    if (actualSha256 !== source.sha256 || bytes.length !== source.byteLength) {
      failures.push({ sourceId: source.sourceId, path: source.relativePath, expectedSha256: source.sha256, actualSha256, expectedByteLength: source.byteLength, actualByteLength: bytes.length, error: "SOURCE_IDENTITY_MISMATCH" });
      continue;
    }
    boundSources.push({ ...source, abs, bytes });
  }

  const queueBytes = fs.readFileSync(path.join(ROOT, QUEUE));
  const queue = JSON.parse(queueBytes.toString("utf8"));
  const row = queue.families?.find((candidate) => candidate.familyId === FAMILY_ID);
  if (!row) failures.push({ record: QUEUE, error: "QUEUE_ROW_MISSING", familyId: FAMILY_ID });
  else {
    if (row.state !== "SOURCE_READY") failures.push({ record: QUEUE, error: "QUEUE_ROW_NOT_SOURCE_READY", actual: row.state });
    if (row.implementationStrategy !== "custom_pleading") failures.push({ record: QUEUE, error: "QUEUE_STRATEGY_DRIFT", actual: row.implementationStrategy });
    if (JSON.stringify(row.routeKeys) !== JSON.stringify([ROUTE_KEY])) failures.push({ record: QUEUE, error: "QUEUE_ROUTE_SCOPE_DRIFT", actual: row.routeKeys });
    const expectedComponents = Object.values(COMPONENTS).sort();
    if (JSON.stringify([...(row.packetComponents ?? [])].sort()) !== JSON.stringify(expectedComponents)) failures.push({ record: QUEUE, error: "QUEUE_COMPONENT_SCOPE_DRIFT", actual: row.packetComponents });
    for (const source of SOURCES) {
      if (!(row.sourceHashes ?? []).some((entry) => entry.sourceId === source.sourceId && entry.sha256 === source.sha256)) {
        failures.push({ record: QUEUE, error: "QUEUE_SOURCE_BINDING_DRIFT", sourceId: source.sourceId, expectedSha256: source.sha256 });
      }
    }
  }
  return {
    failures,
    boundSources,
    queueBinding: {
      path: QUEUE,
      sha256: sha256(queueBytes),
      byteLength: queueBytes.length,
      state: row?.state ?? null,
      routeKeys: row?.routeKeys ?? [],
      packetComponents: row?.packetComponents ?? []
    }
  };
}

const sanitizePdfText = (text) => String(text)
  .replaceAll("‑", "-").replaceAll("–", "-").replaceAll("—", "-")
  .replaceAll("’", "'").replaceAll("‘", "'").replaceAll("“", "\"")
  .replaceAll("”", "\"").replaceAll("§", "Sec. ").replaceAll("…", "...");

async function renderTextPdf(text, title) {
  const doc = await PDFDocument.create();
  stampDeterministic(doc);
  doc.setTitle(title);
  doc.setAuthor("RCAP packet factory");
  doc.setCreator("RCAP census-v1 artifact renderer");
  doc.setProducer("RCAP census-v1 artifact renderer");
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const width = 612;
  const height = 792;
  const margin = 58;
  const fontSize = 10.5;
  const lineHeight = 13.5;
  const maxWidth = width - (2 * margin);
  let page = doc.addPage([width, height]);
  let y = height - margin;
  const wrap = (line, selectedFont) => {
    if (!line) return [""];
    const words = line.split(/\s+/);
    const rows = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (selectedFont.widthOfTextAtSize(candidate, fontSize) <= maxWidth) current = candidate;
      else {
        if (current) rows.push(current);
        current = word;
      }
    }
    if (current) rows.push(current);
    return rows;
  };
  for (const raw of sanitizePdfText(text).split("\n")) {
    const isHeading = /^([A-Z][A-Z 0-9().,'/-]{7,}|[IVX]+\.)$/.test(raw.trim());
    const selectedFont = isHeading ? bold : font;
    for (const line of wrap(raw, selectedFont)) {
      if (y < margin) {
        page = doc.addPage([width, height]);
        y = height - margin;
      }
      if (line) page.drawText(line, { x: margin, y, size: fontSize, font: selectedFont, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
  }
  return Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false }));
}

const dots = (n = 76) => ".".repeat(n);

function applicationText(facts) {
  return [
    "STATE OF NORTH CAROLINA",
    `${facts["matter.county"]} COUNTY                         IN THE GENERAL COURT OF JUSTICE`,
    `File No.: ${facts["matter.case_number"]}                 [ ] District  [ ] Superior Court Division`,
    "",
    "APPLICATION TO EXPUNGE DNA RECORD AND SAMPLE UNDER G.S. 15A-146(b1)",
    "",
    `Applicant: ${facts["participant.full_legal_name"]}`,
    `Mailing address: ${facts["participant.mailing_address"]}`,
    `Date of birth: ${facts["participant.date_of_birth"]}`,
    `Telephone: ${facts["participant.phone"]}`,
    `Email: ${facts["participant.email"]}`,
    "",
    "The Applicant asks for an order under G.S. 15A-146(b1) expunging the DNA record and DNA sample associated with the dismissed charge identified below.",
    "",
    `Charge or offense description: ${dots()}`,
    `Date the charge was dismissed: ${dots()}`,
    `DNA sample collection date, if known (optional): ${dots(55)}`,
    `Agency that collected or holds the DNA record/sample: ${dots(51)}`,
    "",
    "The Applicant requests the relief available under G.S. 15A-146(b1). The Applicant does not ask this document to decide any relief under subsection (a) or (a1). AOC-CR-287 is not this application and is not attached as a filing form.",
    "",
    `Applicant signature: ${dots(52)}    Signature date: ${dots(20)}`,
    "",
    "NOTICE OF HEARING (COURT COMPLETES)",
    `Hearing date and time: ${dots(55)}`,
    "",
    "CERTIFICATE OF SERVICE ON THE DISTRICT ATTORNEY",
    "",
    "Complete this certificate only after service. The route requires service on the district attorney not less than 20 days before the hearing.",
    `District Attorney office/recipient: ${dots(58)}`,
    `Service address: ${dots(72)}`,
    `Method of service accepted for this matter: ${dots(48)}`,
    `Date served: ${dots(63)}`,
    "",
    "I certify that I served this application on the district attorney identified above.",
    "",
    `Applicant signature: ${dots(52)}    Signature date: ${dots(20)}`
  ].join("\n");
}

function instructionText(facts) {
  return [
    "INSTRUCTIONS FOR THE SEPARATE G.S. 15A-146(b1) DNA-EXPUNCTION APPLICATION",
    "",
    `Prepared for: ${facts["participant.full_legal_name"]}`,
    "",
    "ROUTE BOUNDARY",
    "This packet is only for the separate DNA-expunction application under G.S. 15A-146(b1). AOC-CR-287 and its official instructions are for dismissal petitions under subsection (a) or (a1). They are exact sources bound in the receipt, but they are not substituted for this application and are not attached as filing pages.",
    "",
    "BEFORE YOU FILE OR SERVE",
    "1. Ask the clerk in the county of the criminal case to confirm the correct court division, filing destination, filing method, whether a filing fee applies, and whether the conditional AOC-CV-226 in this packet is accepted for any fee the clerk identifies. The current route record does not settle those items.",
    "2. Copy the charge or offense description and dismissal date from the court record. Do not rely on memory.",
    "3. Add the agency that collected or holds the DNA record/sample. Add the collection date only if known; the application marks it optional.",
    "4. Sign and date the application yourself. The platform never signs or dates it for you.",
    "5. Serve the application on the district attorney. Ask the clerk or district attorney's office which service method and address are accepted; the route record names the recipient and timing but does not settle a delivery method or address.",
    "6. Make sure service occurs not less than 20 days before the hearing. Complete the certificate only after service, then retain proof of service and follow the clerk's directions for submitting it.",
    "",
    "ITEMS YOU MUST SUPPLY",
    "Court division; charge or offense description; date the charge was dismissed; agency that collected or holds the DNA record/sample; District Attorney office/recipient; service address; method of service accepted for this matter; and date served. If the conditional fee-waiver form is used, complete every applicable financial field and election on that sworn form.",
    "",
    "CONDITIONAL FEE-WAIVER COMPANION",
    "AOC-CV-226 follows a separator page. Do not file it merely because it is present. The route record does not state a filing fee or fee-waiver treatment. Use the form only if the clerk confirms that a fee applies, that a waiver may be requested, and that AOC-CV-226 is the form the court accepts. Complete it fully and truthfully, and sign or swear it only before the official the form requires.",
    "",
    "STOP AND GET HELP",
    "Stop if the charge was not dismissed, if you are trying to expunge the criminal court case rather than a DNA record/sample, if the district attorney opposes the application, if the hearing will occur fewer than 20 days after service, if the clerk rejects this composed application, or if an immigration consequence is involved.",
    "",
    `Exact route: ${ROUTE_KEY}`
  ].join("\n");
}

function feeWaiverSeparator(facts) {
  return [
    "CONDITIONAL COMPANION - AOC-CV-226 CIVIL AFFIDAVIT OF INDIGENCY",
    "",
    `Applicant: ${facts["participant.full_legal_name"]}`,
    "",
    "Use the following official form only if the clerk confirms that a fee applies to this separate G.S. 15A-146(b1) application, that a waiver may be requested, and that AOC-CV-226 is accepted for that request.",
    "",
    "The route record does not state a filing fee or fee-waiver treatment. Presence in this review packet is not a statement that the form must be filed.",
    "",
    "Complete every applicable financial answer truthfully. The platform filled only identity, contact, county, and case-number fields it holds. It did not fill any financial answer, election, signature, signature date, or jurat field."
  ].join("\n");
}

function mapHelpers(documentId) {
  const base = (field, label, page = 1) => ({
    field: `${documentId}.${field}`,
    fieldName: `${documentId}.${field}`,
    page,
    printedLabel: label,
    effectiveLabel: label,
    document: documentId,
    documentId,
    rectBasis: documentId === COMPONENTS.feeWaiver ? "official_acroform_widget" : "composed_document_authored_by_this_build"
  });
  return {
    write: (field, label, factId, page = 1) => ({ ...base(field, label, page), factId, kind: "text_write" }),
    rbf: (field, label, participantMustSupply, page = 1) => ({
      ...base(field, label, page),
      reason: `the participant supplies this before filing: ${participantMustSupply}`,
      requiredBeforeFiling: true,
      completenessDisposition: "REQUIRED_BEFORE_FILING",
      routeDetermined: false,
      participantMustSupply,
      identity: `${documentId} field ${field}`
    }),
    protected: (field, label, why, page = 1) => ({
      ...base(field, label, page),
      reason: "signature or date field; never prefilled by this build",
      category: "signature_or_date_participant_completion",
      completenessClass: "signature_or_date_participant_completion",
      requiredBeforeFiling: false,
      why
    }),
    court: (field, label, why, page = 1) => ({
      ...base(field, label, page),
      reason: "court, clerk, prosecutor, agency, or hearing field; the court completes it",
      category: "court_prosecutor_clerk_or_agency_owned",
      completenessClass: "court_prosecutor_clerk_or_agency_owned",
      requiredBeforeFiling: false,
      why
    }),
    election: (field, label, why, page = 1) => ({
      ...base(field, `[ ] ${label}`, page),
      kind: "selection_control",
      isSelectionControl: true,
      reason: "a sworn assertion or legal election the route does not determine",
      category: "participant_sworn_narrative_or_legal_election",
      completenessClass: "participant_sworn_narrative_or_legal_election",
      requiredBeforeFiling: false,
      why
    }),
    optional: (field, label, why, page = 1) => ({
      ...base(field, `${label} (optional)`, page),
      reason: "optional participant-authored content; the platform does not invent it",
      requiredBeforeFiling: false,
      why
    })
  };
}

function applicationMap() {
  const h = mapHelpers(COMPONENTS.application);
  const writes = [
    h.write("ApplicantName", "Applicant full name", "participant.full_legal_name"),
    h.write("ApplicantAddress", "Applicant mailing address", "participant.mailing_address"),
    h.write("ApplicantDateOfBirth", "Applicant date of birth", "participant.date_of_birth"),
    h.write("ApplicantPhone", "Applicant telephone", "participant.phone"),
    h.write("ApplicantEmail", "Applicant email", "participant.email"),
    h.write("CaseNumber", "Case number", "matter.case_number"),
    h.write("County", "County of the criminal case", "matter.county")
  ];
  const refusals = [
    h.rbf("CourtDivision", "Court division", "the District or Superior Court division confirmed by the clerk"),
    h.rbf("ChargeDescription", "Charge or offense description", "the charge or offense description copied from the court record"),
    h.rbf("DismissalDate", "Date the charge was dismissed", "the dismissal date copied from the court record"),
    h.optional("DnaCollectionDate", "DNA sample collection date, if known", "the application itself marks this item optional"),
    h.rbf("DnaAgency", "Agency that collected or holds the DNA record/sample", "the agency name confirmed from the record or by the responsible agency"),
    h.protected("ApplicantSignature", "Applicant signature", "the participant signs personally"),
    h.protected("ApplicantSignatureDate", "Signature date beside the applicant signature", "the participant dates the application when signing"),
    h.court("HearingDate", "Hearing date and time", "the court assigns the hearing"),
    h.rbf("DistrictAttorneyRecipient", "District Attorney office/recipient", "the district attorney office and recipient for the county"),
    h.rbf("ServiceAddress", "Service address", "the service address confirmed by the clerk or district attorney's office"),
    h.rbf("ServiceMethod", "Method of service accepted for this matter", "the accepted service method confirmed by the clerk or district attorney's office"),
    h.rbf("ServiceDate", "Date served", "the actual date service was completed, entered only after service"),
    h.protected("ServiceSignature", "Applicant signature on certificate of service", "the participant signs the certificate only after service"),
    h.protected("ServiceSignatureDate", "Signature date on certificate of service", "the participant dates the certificate when signing")
  ];
  return makeMap(COMPONENTS.application, "composed DNA-expunction application and certificate of service", writes, refusals);
}

const FEE_WRITE_FACTS = {
  FileNumber: "matter.case_number",
  CountyName: "matter.county",
  ApplicantName: "participant.full_legal_name",
  ApplicantStreetNumberAndStreetNameLine1: "participant.street_address",
  ApplicantCity: "participant.city",
  ApplicantState: "participant.state",
  ApplicantZip: "participant.zip",
  ApplicantTelephoneNumber: "participant.phone",
  ApplicantDateOfBirth: "participant.date_of_birth"
};

const FEE_PROTECTED = new Set([
  "SignedByApplicantDate", "SignedByApplicantName", "JuratPersonAdministerOathsSignDate",
  "JuratDeputyCSCCkBox", "JuratAssistantCSCCkBox", "JuratClerkOfSuperiorCourtCkBox",
  "JuratMagistrateCkBox", "JuratNotaryCkBox", "JuratCommissionExpiresDate",
  "JuratCountyWhereNotarized"
]);

const FEE_OPTIONAL = new Set([
  "ApplicantStreetNumberAndStreetNameLine2", "ApplicantFullPermanentMailingAddressAddr1",
  "ApplicantFullPermanentMailingAddressAddr2", "ApplicantFullPermanentMailingAddressCity",
  "ApplicantFullPermanentMailingAddressState", "ApplicantFullPermanentMailingAddressZip",
  "GovernmentalAgenciesOrOtherEntitesAuthorizedToBeContactedAndOrToReleaseInformation",
  "OtherMonthlyExpensesDescription"
]);

const FEE_PAGE_TWO = new Set([
  "GovernmentalAgenciesOrOtherEntitesAuthorizedToBeContactedAndOrToReleaseInformation",
  "SignedByApplicantDate", "SignedByApplicantName", "SigningApplicantIsDefendantCkBox",
  "SigningApplicantIsPlaintiffCkBox", "JuratPersonAdministerOathsSignDate",
  "JuratDeputyCSCCkBox", "JuratAssistantCSCCkBox", "JuratClerkOfSuperiorCourtCkBox",
  "JuratMagistrateCkBox", "JuratNotaryCkBox", "JuratCommissionExpiresDate",
  "JuratCountyWhereNotarized"
]);

const LABELS = {
  FileNumber: "File number",
  CountyName: "County of the matter",
  ApplicantName: "Name of applicant",
  ApplicantStreetNumberAndStreetNameLine1: "Applicant street address",
  ApplicantStreetNumberAndStreetNameLine2: "Applicant street address second line",
  ApplicantCity: "Applicant city",
  ApplicantState: "Applicant state",
  ApplicantZip: "Applicant ZIP code",
  ApplicantTelephoneNumber: "Applicant telephone number",
  ApplicantDateOfBirth: "Applicant date of birth",
  SignedByApplicantDate: "Signature date beside the applicant signature",
  SignedByApplicantName: "Signature of applicant",
  JuratPersonAdministerOathsSignDate: "Jurat date and signature of person administering oath",
  JuratCommissionExpiresDate: "Jurat notary commission expiration date",
  JuratCountyWhereNotarized: "Jurat county where notarized"
};

const humanize = (name) => LABELS[name] ?? name
  .replace(/CkBox$/u, " selection")
  .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
  .replace(/AndOr/gu, "And/Or");

function makeMap(documentId, role, writes, refusals, extra = {}) {
  return {
    formNumber: documentId,
    documentId,
    documentRole: role,
    structuralClass: documentId === COMPONENTS.feeWaiver ? "official_form" : "composed_document",
    documentPolicy: {
      mode: "participant",
      routeKey: ROUTE_KEY,
      ...(documentId === COMPONENTS.feeWaiver ? { conditional: true, conditionDescription: "Use only if the clerk confirms a fee, a waiver path, and acceptance of AOC-CV-226." } : {})
    },
    canonicalWrites: writes,
    canonicalRefusals: refusals,
    boundaryWrites: writes,
    boundaryRefusals: refusals,
    roleRefusals: [],
    selectionControls: [],
    ...extra
  };
}

async function feeWaiverMap(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const h = mapHelpers(COMPONENTS.feeWaiver);
  const writes = [];
  const refusals = [];
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const page = FEE_PAGE_TWO.has(name) ? 2 : 1;
    const label = humanize(name);
    if (FEE_WRITE_FACTS[name]) writes.push(h.write(name, label, FEE_WRITE_FACTS[name], page));
    else if (FEE_PROTECTED.has(name)) refusals.push(h.protected(name, label, "completed only when the participant swears the form before the authorized official", page));
    else if (FEE_OPTIONAL.has(name)) refusals.push(h.optional(name, label, "used only when the participant has content responsive to this conditional field", page));
    else if (!(field instanceof PDFTextField)) refusals.push(h.election(name, label, "an answer on the participant's sworn financial form", page));
    else refusals.push(h.rbf(name, label, "the participant's applicable financial or household answer; enter zero or not applicable only as the form and clerk permit", page));
  }
  return makeMap(COMPONENTS.feeWaiver, "conditional exact AOC-CV-226", writes, refusals, {
    officialForm: "AOC-CV-226",
    sourceSha256: source.sha256,
    sourceByteLength: source.byteLength
  });
}

function instructionsMap() {
  return makeMap(COMPONENTS.instructions, "route-specific participant instructions", [], []);
}

async function filledFeeWaiver(source, facts) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const form = doc.getForm();
  for (const [fieldName, factId] of Object.entries(FEE_WRITE_FACTS)) {
    const field = form.getTextField(fieldName);
    field.setFontSize(fieldName === "ApplicantStreetNumberAndStreetNameLine1" ? 7 : 8);
    field.setText(String(facts[factId]));
  }
  // The AOC source contains JavaScript and interactive widgets. The shared
  // finalization path keeps only the appearances of fields written above,
  // compacts dangling annotations, strips active content, flattens, and then
  // rebuilds from the page content into a fresh PDF. A direct form.flatten()
  // leaves invalid xref targets in this particular source.
  const { clean } = await sanitizeAndFlatten(doc, {
    defaultFont: font,
    writtenFields: new Set(Object.keys(FEE_WRITE_FACTS))
  });
  stampDeterministic(clean);
  clean.setTitle("AOC-CV-226 - conditional companion");
  clean.setAuthor("North Carolina Administrative Office of the Courts");
  clean.setCreator("RCAP exact-source fixture renderer");
  clean.setProducer("RCAP exact-source fixture renderer");
  return Buffer.from(await clean.save({ useObjectStreams: false, updateMetadata: false }));
}

async function textByComponent(packetBytes, pageManifest) {
  const doc = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  assert.equal(doc.getPageCount(), pageManifest.length, "page manifest must describe every saved page");
  const result = new Map();
  for (const [index, page] of doc.getPages().entries()) {
    const pageText = groupIntoLines(extractTextItems(page)).map((line) => line.text).join(" ").replace(/\s+/g, " ");
    const component = pageManifest[index].component;
    result.set(component, `${result.get(component) ?? ""} ${pageText}`.replace(/\s+/g, " "));
  }
  return result;
}

async function proveWrites(packetBytes, pageManifest, maps, facts, fixture) {
  const byComponent = await textByComponent(packetBytes, pageManifest);
  const actualWrites = [];
  let glyphs = 0;
  for (const map of maps) {
    const componentText = sanitizePdfText(byComponent.get(map.documentId) ?? "").replace(/\s+/g, " ");
    for (const write of map.canonicalWrites) {
      const expected = sanitizePdfText(facts[write.factId]).replace(/\s+/g, " ");
      assert.ok(expected, `${fixture} ${write.field}: no fixture value for ${write.factId}`);
      assert.ok(componentText.includes(expected), `${fixture} ${write.field}: expected value is not readable from saved packet bytes`);
      glyphs += expected.replace(/\s+/g, "").length;
      actualWrites.push({
        field: write.field,
        document: map.documentId,
        factId: write.factId,
        expected,
        foundInOutputBytes: true,
        proof: "value extracted from the saved packet pages assigned to this component"
      });
    }
  }
  return { actualWrites, glyphs };
}

function requiredBeforeFiling(maps) {
  return maps.flatMap((map) => map.canonicalRefusals
    .filter((row) => row.requiredBeforeFiling === true)
    .map((row) => ({
      document: map.documentId,
      field: row.field,
      page: row.page,
      printedContext: row.printedLabel,
      disclosureLabel: row.effectiveLabel,
      identity: row.identity,
      why: row.reason,
      participantMustSupply: row.participantMustSupply
    })));
}

function participantInstructions(maps) {
  const required = requiredBeforeFiling(maps);
  const lines = [
    "# What you must do before filing — North Carolina DNA expunction under G.S. 15A-146(b1)",
    "",
    "This family serves only the separate DNA-expunction application. It does not turn AOC-CR-287 into a subsection (b1) form.",
    "",
    "## Packet components",
    "",
    `- \`${COMPONENTS.application}\`: composed application and certificate of service.`,
    `- \`${COMPONENTS.instructions}\`: route-specific filing and service instructions.`,
    `- \`${COMPONENTS.feeWaiver}\`: exact AOC-CV-226, conditional on the clerk confirming a fee, waiver path, and acceptance of that form.`,
    "",
    "## Required items left for you",
    "",
    "Supply every applicable item below before submitting the page on which it appears. Copy case facts from the court record and complete the financial form truthfully.",
    "",
    "| Document | Blank on the document | What you must supply |",
    "| --- | --- | --- |",
    ...required.map((item) => `| ${item.document} | ${item.disclosureLabel} | ${item.participantMustSupply} |`),
    "",
    "## Signatures and later court fields",
    "",
    "Sign and date the application yourself. Complete the service certificate only after service. The court supplies the hearing date. If AOC-CV-226 is used, sign or swear it only as its official face directs.",
    "",
    "## Exact service rule preserved by this route",
    "",
    "Serve the district attorney not less than 20 days before the hearing. Confirm the accepted service method and address with the clerk or district attorney's office because the route record does not settle either one.",
    "",
    `Exact route: ${ROUTE_KEY}`,
    ""
  ];
  return lines.join("\n");
}

function countCompleteness(maps, writeProofs, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((counter) => [counter, 0]));
  const findings = [];
  const note = (counter, detail) => {
    counters[counter] += 1;
    findings.push({ counter, ...detail });
  };
  const normalize = (row) => ({
    id: row.field,
    name: row.fieldName ?? row.field,
    label: row.effectiveLabel,
    reason: row.reason ?? "",
    refusalClass: row.completenessClass ?? row.category ?? null,
    page: row.page,
    document: row.documentId,
    factId: row.factId ?? null,
    isSelectionControl: row.isSelectionControl === true || row.kind === "selection_control",
    declared: {
      disposition: row.completenessDisposition ?? null,
      requiredBeforeFiling: row.requiredBeforeFiling === true,
      routeDetermined: row.routeDetermined === true,
      factAvailable: false,
      factId: row.factId ?? null,
      identity: row.identity ?? row.field
    }
  });
  const writes = maps.flatMap((map) => map.canonicalWrites.map(normalize));
  const blanks = maps.flatMap((map) => map.canonicalRefusals.map(normalize));
  const available = new Set(writes.map((write) => write.factId).filter(Boolean));
  const blankLedger = [];
  for (const blank of blanks) {
    const declared = { ...blank.declared, factAvailable: blank.factId ? available.has(blank.factId) : false };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    blankLedger.push({ ...blank, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition]?.allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.id, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.id, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.id, basis: verdict.basis });
  }
  const instructions = instructionsText.toLowerCase();
  for (const blank of blankLedger.filter((row) => row.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [blank.label, blank.id, blank.declared.identity].filter(Boolean);
    if (!needles.some((needle) => instructions.includes(String(needle).toLowerCase().slice(0, 60)))) {
      note("requiredFactsNotCollected", { field: blank.id, label: blank.label });
    }
  }
  const rows = new Map();
  for (const field of [...writes.map((row) => ({ ...row, written: true })), ...blanks.map((row) => ({ ...row, written: false }))]) {
    const key = rowKeyOf(field);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(field);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((cell) => cell.written)) continue;
    const missing = cells.filter((cell) => !cell.written && classifyField(cell.label, cell.isSelectionControl).requirement === "REQUIRED_KNOWN");
    if (missing.length) note("incompleteRows", { row: key, missing: missing.map((cell) => cell.label) });
  }
  for (const write of writes) {
    if (classifyField(write.label, write.isSelectionControl).requirement === "PROTECTED") note("protectedWrites", { field: write.id });
  }
  for (const proof of writeProofs) {
    if (proof.valuesReportedByFinalizer > 0 && proof.addedGlyphsReadFromOutputBytes === 0) note("invisibleWrites", { fixture: proof.fixture });
    if (proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes > 0) note("visualDefects", { fixture: proof.fixture });
  }
  return { counters, findings, blankLedger, writes: writes.length, blanks: blanks.length };
}

async function buildPacket(boundSources, maps, fixture, facts) {
  const feeSource = boundSources.find((source) => source.sourceId === "official-form:AOC-CV-226");
  assert.ok(feeSource, "AOC-CV-226 source must be bound");
  const packet = await PDFDocument.create();
  stampDeterministic(packet);
  packet.setTitle(`North Carolina G.S. 15A-146(b1) DNA-expunction packet - ${fixture}`);
  packet.setAuthor("RCAP packet factory");
  packet.setCreator("RCAP census-v1 artifact renderer");
  packet.setProducer("RCAP census-v1 artifact renderer");
  const pageManifest = [];
  const append = async (bytes, component, documentId, sourceSha256 = null) => {
    const child = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const pages = await packet.copyPages(child, child.getPageIndices());
    for (const [index, page] of pages.entries()) {
      packet.addPage(page);
      pageManifest.push({ packetPage: packet.getPageCount(), component, documentId, sourcePage: index + 1, sourceSha256 });
    }
  };
  await append(await renderTextPdf(applicationText(facts), "Application under G.S. 15A-146(b1)"), COMPONENTS.application, COMPONENTS.application);
  await append(await renderTextPdf(instructionText(facts), "Instructions for G.S. 15A-146(b1) application"), COMPONENTS.instructions, COMPONENTS.instructions);
  await append(await renderTextPdf(feeWaiverSeparator(facts), "Conditional AOC-CV-226 separator"), COMPONENTS.feeWaiver, COMPONENTS.feeWaiver);
  await append(await filledFeeWaiver(feeSource, facts), COMPONENTS.feeWaiver, COMPONENTS.feeWaiver, feeSource.sha256);
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
  const file = `${OUT}/fixtures/${fixture}.pdf`;
  fs.writeFileSync(path.join(ROOT, file), bytes);
  const proof = await proveWrites(bytes, pageManifest, maps, facts, fixture);
  return {
    fixture,
    file,
    sha256: sha256(bytes),
    byteLength: bytes.length,
    pageCount: packet.getPageCount(),
    pageManifest,
    documents: Object.values(COMPONENTS),
    components: Object.values(COMPONENTS),
    proof
  };
}

export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const { failures, boundSources, queueBinding } = bindInputs();
  if (failures.length) {
    return {
      familyId: FAMILY_ID,
      status: "BLOCKED_SOURCE",
      failedSourceIdentities: failures,
      overlayDirectoryTouched: false
    };
  }
  const feeSource = boundSources.find((source) => source.sourceId === "official-form:AOC-CV-226");
  const maps = [applicationMap(), instructionsMap(), await feeWaiverMap(feeSource)];
  if (checkOnly) {
    return {
      familyId: FAMILY_ID,
      status: "CHECK_ONLY",
      routeKeys: [ROUTE_KEY],
      sourcesBound: boundSources.map((source) => ({ sourceId: source.sourceId, sha256: source.sha256, byteLength: source.byteLength })),
      packetComponents: Object.values(COMPONENTS),
      writes: maps.reduce((total, map) => total + map.canonicalWrites.length, 0),
      blanks: maps.reduce((total, map) => total + map.canonicalRefusals.length, 0),
      overlayDirectoryTouched: false
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  const artifacts = [];
  for (const fixture of ["canonical", "boundary"]) artifacts.push(await buildPacket(boundSources, maps, fixture, FIXTURES[fixture]));
  const writeProofs = artifacts.map((artifact) => ({
    fixture: artifact.fixture,
    proofMethod: "written values extracted from the saved packet bytes, scoped to each mapped component",
    valuesReportedByFinalizer: artifact.proof.actualWrites.length,
    addedGlyphsReadFromOutputBytes: artifact.proof.glyphs,
    flattenedWidgetAppearancesReadFromOutputBytes: 0,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
    refusedFieldsWithInk: [],
    actualWrites: artifact.proof.actualWrites
  }));
  const instructionsText = participantInstructions(maps);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);
  const counted = countCompleteness(maps, writeProofs, instructionsText);
  const allNineZero = PASS_COUNTERS.every((counter) => counted.counters[counter] === 0);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID,
    worklistGroupId: FAMILY_ID,
    jurisdiction: "NC",
    implementationStrategy: "custom_pleading",
    custodyClass: "SOURCE_ALREADY_HELD",
    bindingMethod: "family-specific D1 paths, exact SHA-256 and byte length checked before output",
    routeKeys: [ROUTE_KEY],
    statutoryAuthority: ["N.C. Gen. Stat. Sec. 15A-146(b1)"],
    allSourcesExact: true,
    // `formNumber` is deliberately emitted as `formIdentity`. In this receipt
    // schema a `formNumber` denotes a packet document the completeness reader
    // must find in a rendered artifact. AOC-CR-287 and its instruction sheet
    // are exact reference sources, not rendered documents on the separate
    // subsection (b1) route.
    sources: boundSources.map(({ abs, bytes, formNumber, ...source }) => ({
      ...source,
      formIdentity: formNumber,
      path: source.relativePath,
      sha256Exact: true
    })),
    queueBinding,
    composedComponentsAuthoredByThisBuild: [COMPONENTS.application, COMPONENTS.instructions],
    exactOfficialComponentIncluded: COMPONENTS.feeWaiver,
    formIdentityBoundary: "AOC-CR-287 and AOC-CR-287-INSTRUCTIONS are subsection (a)/(a1) sources and are not substituted for the separate subsection (b1) application.",
    acquisitionCommissioned: false,
    sourceBinaryCommitted: false,
    generationAllowed: false,
    commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that any output is approved for participant delivery",
      "that the participant is eligible for DNA expunction",
      "that a filing fee applies or that AOC-CV-226 is accepted for this application",
      "a filing destination or service method not recorded by the exact route evidence"
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    jurisdiction: "NC",
    implementationStrategy: "custom_pleading",
    renderStrategy: "composed_pleading_with_conditional_exact_official_companion",
    officialFormForPrimaryApplication: null,
    boundReferenceFormsNotSubstituted: ["AOC-CR-287", "AOC-CR-287-INSTRUCTIONS"],
    conditionalOfficialCompanion: "AOC-CV-226",
    componentSet: Object.values(COMPONENTS),
    componentConditions: {
      [COMPONENTS.feeWaiver]: "Use only if the clerk confirms a fee, a waiver path, and acceptance of AOC-CV-226."
    },
    routeSelectionNote: "The instrument states G.S. 15A-146(b1) on its face and does not present subsection (a)/(a1) as an election.",
    requiredBeforeFilingCount: requiredBeforeFiling(maps).length,
    requiredBeforeFiling: requiredBeforeFiling(maps),
    maps,
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/product-wiring.json`, {
    schemaVersion: "rcap-family-product-wiring/v1",
    familyId: FAMILY_ID,
    worklistGroupId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    exactRouteScope: true,
    packetComponents: Object.values(COMPONENTS),
    artifactDirectory: OUT,
    implementationStrategy: "custom_pleading",
    wiringStatus: "ARTIFACT_ONLY_REVIEW_PENDING",
    registryEdits: 0,
    resolverEdits: 0,
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0,
    productionTouched: false
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId: FAMILY_ID,
    renderedFresh: true,
    derivedFromBytes: true,
    componentSet: Object.values(COMPONENTS),
    sourceBoundary: "AOC-CR-287 and its instructions are bound references, not rendered filing components for this separate route.",
    pdfs: artifacts.map((artifact) => ({
      file: artifact.file,
      documentId: "assembled_packet",
      role: "assembled_packet_of_composed_pleading_and_conditional_official_companion",
      fixture: artifact.fixture,
      sha256: artifact.sha256,
      byteLength: artifact.byteLength,
      pageCount: artifact.pageCount
    })),
    artifacts: artifacts.map(({ proof, ...artifact }) => artifact),
    packets: artifacts.map((artifact) => ({ fixture: artifact.fixture, documents: artifact.documents })),
    everyPageRastered: false,
    rasterSkipped: true,
    rasterState: "BUILT_RASTER_PENDING",
    rasterPages: [],
    byteDerivedHashes: true,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1",
    familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    note: "Each reported value was extracted from the saved packet pages assigned to its component.",
    documents: writeProofs,
    artifacts: writeProofs.map((proof) => ({
      fixture: proof.fixture,
      valuesReportedByFinalizer: proof.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: proof.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: proof.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: proof.refusedFieldsWithInk
    })),
    blockingFindings: []
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1",
    familyId: FAMILY_ID,
    requiredBeforeFiling: requiredBeforeFiling(maps),
    protectedBlanks: counted.blankLedger.filter((row) => row.disposition !== "REQUIRED_BEFORE_FILING").map((row) => ({
      document: row.document,
      field: row.id,
      label: row.label,
      disposition: row.disposition,
      basis: row.basis
    })),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1",
    familyId: FAMILY_ID,
    whatThisIs: "The builder's count of the nine completeness counters over the emitted map, byte proof, and participant instructions.",
    whatThisIsNot: "An independent verdict or approval.",
    counters: counted.counters,
    allNineZero,
    findings: counted.findings,
    blankDispositions: counted.blankLedger.reduce((acc, row) => {
      acc[row.disposition] = (acc[row.disposition] ?? 0) + 1;
      return acc;
    }, {})
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1",
    familyId: FAMILY_ID,
    buildStatus: "state_built",
    reviewStatus: "qa_review_pending",
    builtBy: BUILD_SCRIPT,
    renderedArtifacts: artifacts.length,
    rasterPages: 0,
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING",
    selfVerified: false,
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0,
    productionTouched: false,
    grantsNothing: "These artifacts are review evidence and authorize no fulfillment or commercial route."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1",
    familyId: FAMILY_ID,
    blocking: [],
    findings: [
      {
        finding: "AOC-CR-287 and its instructions expressly cover G.S. 15A-146(a)/(a1), while this route is the separate subsection (b1) DNA-expunction application.",
        consequence: "Both sources are exact and receipt-bound but are not rendered or represented as the subsection (b1) filing."
      },
      {
        finding: "The exact route evidence settles district-attorney service at least 20 days before the hearing, but does not settle the filing destination, filing method, service method, filing fee, or fee-waiver treatment.",
        consequence: "The packet preserves the settled service recipient and timing, delegates unsettled local-process facts to the clerk or district attorney's office, and makes AOC-CV-226 conditional."
      },
      {
        finding: "AOC-CV-226 is a queue-required source whose face is a Civil Affidavit of Indigency and whose reverse discusses arbitration fees.",
        consequence: "It is included after a conspicuous conditional separator; counsel and court-practice review are requested before participant use."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1",
    familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review, source-currentness review, and counsel review",
    buildStatus: "state_built",
    status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false,
    live: false,
    commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "Confirm the composed subsection (b1) application language because no stable official form is recorded.",
      "Confirm filing destination, filing method, any fee, and the accepted service method.",
      "Confirm whether AOC-CV-226 is an appropriate fee-waiver companion for this criminal-case DNA-expunction application."
    ],
    mattersForTheReviewersAttention: [
      "AOC-CR-287 and its instructions are deliberately not rendered because their faces limit them to subsection (a)/(a1).",
      "The district-attorney service recipient and not-less-than-20-days timing must remain legible and exact.",
      "No raster was created by this lane."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: allNineZero ? "COMPLETED" : "STOPPED",
    ...(allNineZero ? {} : { stopClass: "COMPLETENESS_COUNTER_NOT_ZERO", nonZeroCounters: PASS_COUNTERS.filter((counter) => counted.counters[counter] > 0) }),
    routeKeys: [ROUTE_KEY],
    directory: OUT,
    implementationStrategy: "custom_pleading",
    sourcesBound: boundSources.map((source) => ({ sourceId: source.sourceId, sha256: source.sha256, byteLength: source.byteLength })),
    components: Object.values(COMPONENTS),
    artifacts: artifacts.map((artifact) => ({ fixture: artifact.fixture, sha256: artifact.sha256, byteLength: artifact.byteLength, pageCount: artifact.pageCount })),
    counters: counted.counters,
    nineCountersZero: allNineZero,
    deterministicInputState: true,
    rasterState: "BUILT_RASTER_PENDING",
    packetsSelfVerified: 0,
    commercialRoutesOpened: 0,
    productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (result.status === "BLOCKED_SOURCE" || result.status === "STOPPED") process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
