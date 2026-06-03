import fs from "node:fs";
import path from "node:path";
import type { RcapIntakeSession } from "@/lib/rcap-intake/types";
import { dcFilingInstructions } from "@/lib/rcap/state-packs/dc/filing-instructions";
import { dcFieldLabels } from "@/lib/rcap/state-packs/dc/required-fields";
import { dcCautionNotes } from "@/lib/rcap/state-packs/dc/disqualifying-offenses";
import { dcPlainLanguage, dcSafetyDisclaimer } from "@/lib/rcap/state-packs/dc/safety-language";
import { dcWaitingPeriodNotes } from "@/lib/rcap/state-packs/dc/waiting-periods";
import { mapDcIntakeToDocumentFields } from "./field-mapper";
import type { DcDocumentGenerationResult, DcDocumentPacketInput, DcMappedDocumentFields } from "./types";

const dcMotionPacketTemplatePath = path.join(process.cwd(), "reference/dc/dc-motion-to-seal-expunge.html");
const automaticProcessingDeadline = "October 1, 2027";

export function generateDcDocumentDraft(
  session: RcapIntakeSession,
  packet: Partial<DcDocumentPacketInput> = {}
): DcDocumentGenerationResult {
  const fields = mapDcIntakeToDocumentFields(session, packet);
  const status = fields.missingFields.length > 0 || fields.pathway === "needs_review" ? "missing_information" : "preview_generated";
  const draftTitle = titleFor(fields);
  const draftPlainText = renderPlainText(draftTitle, fields);

  return {
    state: "DC",
    remedyType: fields.remedyType,
    pathway: fields.pathway,
    documentTypes: fields.documentTypes,
    eligibilitySignal: fields.eligibilitySignal,
    status,
    missingFields: fields.missingFields,
    draftTitle,
    draftHtml: renderHtmlFromTemplate(fields, draftPlainText),
    draftPlainText,
    filingInstructions: dcFilingInstructions,
    countyCourtInstructions: [
      "DC Superior Court Criminal Division / Criminal Motion Seal Team should be checked for current filing instructions.",
      "Serve the prosecutor connected to the case: U.S. Attorney's Office for DC or DC Office of the Attorney General."
    ],
    safetyDisclaimer: dcSafetyDisclaimer,
    nextStep: status === "missing_information" ? "Gather the missing DC record details or request a record review before filing is considered." : "Review the DC motion packet, attach exhibits, serve the prosecutor, and file only after the packet has been checked.",
    briefcaseItemTitle: `${draftTitle} packet`,
    fields
  };
}

function titleFor(fields: DcMappedDocumentFields) {
  if (fields.pathway === "motion_actual_innocence_expungement") return "DC Motion to Expunge - Actual Innocence";
  if (fields.pathway === "motion_interests_of_justice_sealing") return "DC Motion to Seal - Interests of Justice";
  if (fields.pathway === "automatic_expungement") return "DC Possible Automatic Expungement Review";
  if (fields.pathway === "automatic_sealing") return "DC Possible Automatic Sealing Review";
  return "DC Record Relief - More Information Needed";
}

function renderPlainText(title: string, fields: DcMappedDocumentFields) {
  const name = [fields.petitionerFirstName, fields.petitionerLastName].filter(Boolean).join(" ").trim() || "[MOVANT NAME TO BE CONFIRMED]";
  const missing = fields.missingFields.map((field) => `- ${dcFieldLabels[field]}`).join("\n");
  const waitingPeriod = waitingPeriodFor(fields);
  const pathwayNotes = automaticPathwayNotes(fields);

  return [
    title.toUpperCase(),
    "",
    "SOURCE PACKET",
    "Prepared from reference/dc/DC-Expungement-Sealing-Agent-Reference.pdf and reference/dc/dc-motion-to-seal-expunge.html.",
    "",
    "DC RECORD RELIEF SUMMARY",
    dcPlainLanguage.motionCare,
    dcPlainLanguage.automaticCare,
    dcPlainLanguage.recordsScope,
    "",
    `Movant: ${name}`,
    `Case number: ${fields.caseNumber || "[CASE NUMBER TO BE ASSIGNED OR CONFIRMED]"}`,
    `Charge/offense: ${fields.charge || "[CHARGE TO BE CONFIRMED]"}`,
    `Arresting agency: ${fields.arrestingAgency || "[ARRESTING AGENCY TO BE CONFIRMED]"}`,
    `Offense/arrest date: ${fields.offenseDate || fields.arrestDate || "[DATE TO BE CONFIRMED]"}`,
    `Disposition: ${fields.disposition || "[DISPOSITION TO BE CONFIRMED]"}`,
    `Disposition date: ${fields.dispositionDate || "[DISPOSITION DATE TO BE CONFIRMED]"}`,
    `Sentence completion date: ${fields.sentenceCompletionDate || "[SENTENCE COMPLETION DATE TO BE CONFIRMED IF APPLICABLE]"}`,
    `Prosecutor service: ${prosecutorLabel(fields.prosecutorOffice)}`,
    "",
    "PATHWAY",
    `Pathway: ${fields.pathway.replaceAll("_", " ")}`,
    `Relief type: ${fields.remedyType}`,
    waitingPeriod,
    pathwayNotes,
    "",
    "MOTION PACKAGE PARTS",
    fields.pathway === "motion_actual_innocence_expungement" ? "Motion to Expunge under D.C. Code § 16-803" : "Motion to Seal under D.C. Code § 16-806",
    "Statement of Points and Authorities",
    "Proposed Order",
    "Certificate of Service",
    "Filing instructions",
    "",
    "STATEMENT OF POINTS AND AUTHORITIES DRAFT NOTES",
    fields.motionArgument || "[FACTS AND ARGUMENT TO BE ADDED AFTER RECORD REVIEW]",
    fields.actualInnocenceStatement ? `Actual innocence statement: ${fields.actualInnocenceStatement}` : "",
    fields.interestsOfJusticeStatement ? `Interests of justice statement: ${fields.interestsOfJusticeStatement}` : "",
    "",
    "CAUTIONS",
    ...dcCautionNotes,
    "",
    fields.missingFields.length > 0 ? ["MORE INFORMATION NEEDED", missing].join("\n") : "No required foundation fields are currently marked missing.",
    "",
    dcSafetyDisclaimer
  ].filter(Boolean).join("\n");
}

function renderHtmlFromTemplate(fields: DcMappedDocumentFields, draftPlainText: string) {
  const template = readDcMotionTemplate();
  const type = fields.pathway === "motion_actual_innocence_expungement" ? "expunge" : "seal";
  const populated = template
    .replace('<body data-type="seal">', `<body data-type="${type}">`)
    .replace('placeholder="Movant full name"', `placeholder="Movant full name" value="${escapeHtml(nameFor(fields))}"`)
    .replace('id="caseno"', `id="caseno" value="${escapeHtml(fields.caseNumber ?? "")}"`)
    .replace('id="offense"', `id="offense" value="${escapeHtml(fields.charge ?? "")}"`)
    .replace('id="offdate"', `id="offdate" value="${escapeHtml(fields.offenseDate ?? fields.arrestDate ?? "")}"`)
    .replace('id="agency"', `id="agency" value="${escapeHtml(fields.arrestingAgency ?? "")}"`);
  return `${populated}\n<!-- RCAP generated plain text fallback\n${escapeHtml(draftPlainText)}\n-->`;
}

function readDcMotionTemplate() {
  try {
    return fs.readFileSync(dcMotionPacketTemplatePath, "utf8");
  } catch {
    return "<article><h1>DC Motion Packet Template Missing</h1><p>The DC HTML template should be available at reference/dc/dc-motion-to-seal-expunge.html.</p></article>";
  }
}

function waitingPeriodFor(fields: DcMappedDocumentFields) {
  if (fields.pathway === "motion_actual_innocence_expungement") return dcWaitingPeriodNotes.actualInnocenceExpungement;
  if (fields.pathway === "automatic_sealing" && fields.caseOutcome !== "convicted") return dcWaitingPeriodNotes.nonConvictionAutomaticSealing;
  if (fields.pathway === "automatic_sealing") return dcWaitingPeriodNotes.misdemeanorAutomaticSealing;
  if (fields.convictionLevel === "felony") return dcWaitingPeriodNotes.felonyMotionSealing;
  if (fields.pathway === "motion_interests_of_justice_sealing") return dcWaitingPeriodNotes.misdemeanorMotionSealing;
  return dcWaitingPeriodNotes.monetaryPenaltyNote;
}

function automaticPathwayNotes(fields: DcMappedDocumentFields) {
  if (fields.pathway === "automatic_expungement") {
    return `Automatic expungement may apply to decriminalized, legalized, or unconstitutional offenses, including marijuana-related examples. Processing may be phased or scheduled through ${automaticProcessingDeadline} and should be checked.`;
  }
  if (fields.pathway === "automatic_sealing") {
    return `Automatic sealing may apply to eligible non-convictions and certain misdemeanor convictions. Processing may be phased or scheduled through ${automaticProcessingDeadline} and should be checked.`;
  }
  return "";
}

function prosecutorLabel(value?: DcDocumentPacketInput["prosecutorOffice"]) {
  if (value === "USAO") return "U.S. Attorney's Office for the District of Columbia";
  if (value === "OAG") return "District of Columbia Office of the Attorney General";
  return "[PROSECUTOR TO BE CONFIRMED]";
}

function nameFor(fields: DcMappedDocumentFields) {
  return [fields.petitionerFirstName, fields.petitionerLastName].filter(Boolean).join(" ").trim();
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
