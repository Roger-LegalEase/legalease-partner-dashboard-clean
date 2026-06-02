import type { RcapIntakeSession } from "@/lib/rcap-intake/types";
import { getIllinoisCountyCourtInstructions } from "@/lib/rcap/state-packs/illinois/county-court-instructions";
import { illinoisFilingInstructions } from "@/lib/rcap/state-packs/illinois/filing-instructions";
import { illinoisFieldLabels } from "@/lib/rcap/state-packs/illinois/required-fields";
import { illinoisCleanSlateTransition } from "@/lib/rcap/state-packs/illinois/clean-slate-transition";
import { illinoisPlainLanguage, illinoisSafetyDisclaimer } from "@/lib/rcap/state-packs/illinois/safety-language";
import { mapIllinoisIntakeToDocumentFields } from "./field-mapper";
import type { IllinoisDocumentGenerationResult, IllinoisDocumentPacketInput } from "./types";

export function generateIllinoisDocumentDraft(
  session: RcapIntakeSession,
  packet: Partial<IllinoisDocumentPacketInput> = {}
): IllinoisDocumentGenerationResult {
  const fields = mapIllinoisIntakeToDocumentFields(session, packet);
  const status = fields.missingFields.length > 0 || fields.pathway === "excluded_or_needs_review" ? "missing_information" : "preview_generated";
  const draftTitle = fields.remedyType === "sealing" ? "Illinois Request to Expunge and/or Seal - Sealing Draft" : fields.remedyType === "expungement" ? "Illinois Request to Expunge and/or Seal - Expungement Draft" : "More information or review needed";
  const countyCourtInstructions = getIllinoisCountyCourtInstructions({
    county: fields.county,
    cookCountyDistrict: fields.cookCountyDistrict,
    remedyType: fields.remedyType,
    hasFeeBarrier: fields.feeWaiverRequested
  });
  const draftPlainText = renderPlainText(draftTitle, fields);
  return {
    state: "IL",
    remedyType: fields.remedyType,
    pathway: fields.pathway,
    documentTypes: fields.documentTypes,
    eligibilitySignal: fields.eligibilitySignal,
    status,
    missingFields: fields.missingFields,
    draftTitle,
    draftHtml: `<article class="illinois-document-preview"><h1>${escapeHtml(draftTitle)}</h1><pre>${escapeHtml(draftPlainText)}</pre></article>`,
    draftPlainText,
    filingInstructions: [...illinoisFilingInstructions, illinoisCleanSlateTransition.warning],
    countyCourtInstructions,
    safetyDisclaimer: illinoisSafetyDisclaimer,
    nextStep: status === "missing_information" ? "A RAP sheet or record review may help fill in the missing details before filing is considered." : "Review this draft, verify county and circuit court instructions, and do not file until the packet has been checked.",
    briefcaseItemTitle: `${draftTitle} packet`,
    fields
  };
}

function renderPlainText(title: string, fields: ReturnType<typeof mapIllinoisIntakeToDocumentFields>) {
  const name = [fields.petitionerFirstName, fields.petitionerLastName].filter(Boolean).join(" ").trim() || "[PETITIONER NAME TO BE CONFIRMED]";
  const county = fields.county || "[COUNTY TO BE CONFIRMED]";
  const charge = fields.charge || "[CHARGE TO BE CONFIRMED]";
  const disposition = fields.disposition || "[HOW THE CASE ENDED TO BE CONFIRMED]";
  const missing = fields.missingFields.map((field) => `- ${illinoisFieldLabels[field]}`).join("\n");
  const missingBlock = fields.missingFields.length > 0
    ? ["MORE INFORMATION NEEDED", missing].join("\n")
    : "No required foundation fields are currently marked missing.";

  return [
    title.toUpperCase(),
    "",
    illinoisPlainLanguage.expungementVsSealing,
    "",
    `Petitioner: ${name}`,
    `County / Circuit Court: ${county} County Circuit Court`,
    `Case or arrest number: ${fields.caseOrArrestNumber || "[CASE OR ARREST NUMBER TO BE CONFIRMED]"}`,
    `Charge: ${charge}`,
    `How the case ended: ${disposition}`,
    `Remedy path: ${fields.remedyType}`,
    `RAP sheet confirmed: ${fields.hasRapSheet ? "yes" : "not yet"}`,
    "",
    "CASE LIST PREVIEW",
    `This draft organizes the listed case for ${fields.remedyType === "sealing" ? "sealing" : "expungement"} review. It is not a final legal filing.`,
    "",
    fields.remedyType === "expungement" ? "ADDITIONAL ARRESTS / CASES FOR EXPUNGEMENT PLACEHOLDER" : "ADDITIONAL ARRESTS / CASES FOR SEALING PLACEHOLDER",
    "",
    "NOTICE OF FILING PLACEHOLDER",
    illinoisPlainLanguage.agencyObjection,
    "",
    "ORDER GRANTING PLACEHOLDER",
    "Some courts require a proposed order. This placeholder should be checked against current statewide forms and local court instructions.",
    "",
    "ORDER DENYING REFERENCE",
    "Illinois companion forms may include an order denying reference. This is included for form-suite awareness, not as a prediction.",
    "",
    fields.feeWaiverRequested ? "FEE WAIVER INSTRUCTIONS: Ask the clerk about a fee waiver application if filing costs may be hard to pay." : "",
    "",
    "PRIVATE FIELD PLACEHOLDERS",
    "[DOB TO BE ADDED BY PETITIONER IF REQUIRED]",
    "[SENSITIVE IDENTIFIER TO BE ADDED BY PETITIONER IF REQUIRED]",
    "",
    missingBlock,
    "",
    illinoisCleanSlateTransition.warning
  ].filter(Boolean).join("\n");
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
