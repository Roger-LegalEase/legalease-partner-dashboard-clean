import { mississippiDocumentTypes } from "@/lib/rcap/state-packs/mississippi/document-types";
import { mississippiFieldLabels } from "@/lib/rcap/state-packs/mississippi/required-fields";
import { mississippiFilingInstructions } from "@/lib/rcap/state-packs/mississippi/filing-instructions";
import { getMississippiCountyCourtInstructions } from "@/lib/rcap/state-packs/mississippi/county-court-instructions";
import { mississippiReviewLanguage, mississippiSafetyDisclaimer } from "@/lib/rcap/state-packs/mississippi/safety-language";
import type { RcapIntakeSession } from "@/lib/rcap-intake/types";
import { buildFilingNextStepsPacket } from "@/lib/rcap/documents/filing-next-steps";
import { mapMississippiIntakeToDocumentFields } from "./field-mapper";
import type { MississippiDocumentGenerationResult, MississippiDocumentPacketInput } from "./types";

export function generateMississippiPetitionDraft(
  session: RcapIntakeSession,
  packet: Partial<MississippiDocumentPacketInput> = {}
): MississippiDocumentGenerationResult {
  const fields = mapMississippiIntakeToDocumentFields(session, packet);
  const documentConfig = fields.pathway === "more_information_needed" ? undefined : mississippiDocumentTypes[fields.pathway];
  const draftTitle = documentConfig?.title ?? "More information needed";
  const status = fields.missingFields.length > 0 || fields.pathway === "more_information_needed" ? "missing_information" : "preview_generated";
  const nextStep =
    status === "missing_information"
      ? "A record review may help fill in the missing details before a petition draft is prepared."
      : "Review the draft carefully, confirm local court requirements, and do not file until the packet has been checked.";
  const draftPlainText = renderPlainText(draftTitle, fields);
  const draftHtml = renderHtml(draftTitle, fields, draftPlainText);
  const countyCourtInstructions = getMississippiCountyCourtInstructions({
    county: fields.courtCounty ?? fields.county,
    courtType: fields.courtType,
    pathway: fields.pathway
  });

  const resultWithoutNextSteps = {
    pathway: fields.pathway,
    documentType: fields.documentType,
    eligibilitySignal: fields.eligibilitySignal,
    status,
    missingFields: fields.missingFields,
    draftTitle,
    draftHtml,
    draftPlainText,
    filingInstructions: mississippiFilingInstructions,
    countyCourtInstructions,
    safetyDisclaimer: mississippiSafetyDisclaimer,
    nextStep,
    briefcaseItemTitle: `${draftTitle} draft`,
    fields
  } satisfies Omit<MississippiDocumentGenerationResult, "filingNextStepsPacket">;
  return {
    ...resultWithoutNextSteps,
    filingNextStepsPacket: buildFilingNextStepsPacket({
      ...resultWithoutNextSteps,
      state: "MS",
      county: fields.county,
      courtType: fields.courtType,
      courtCounty: fields.courtCounty,
      courtName: fields.courtName
    })
  };
}

function renderPlainText(draftTitle: string, fields: ReturnType<typeof mapMississippiIntakeToDocumentFields>) {
  if (fields.pathway === "more_information_needed") {
    return [
      "MORE INFORMATION NEEDED",
      "",
      mississippiReviewLanguage.moreInfo,
      "",
      "Missing details:",
      ...fields.missingFields.map((field) => `- ${mississippiFieldLabels[field]}`)
    ].join("\n");
  }

  const petitionerName = formatName(fields.petitionerFirstName, fields.petitionerLastName);
  const county = fields.courtCounty || fields.county || "[COUNTY TO BE CONFIRMED]";
  const courtType = fields.courtType || "[COURT TYPE TO BE CONFIRMED]";
  const causeNumber = fields.causeNumber || "[CAUSE NUMBER TO BE CONFIRMED]";
  const charge = fields.charge || "[CHARGE TO BE CONFIRMED]";
  const pathParagraph = pathwayParagraph(fields.pathway);

  return [
    `IN THE ${courtType.toUpperCase()} OF ${county.toUpperCase()} COUNTY, MISSISSIPPI`,
    "",
    `IN RE: ${petitionerName}`,
    `CAUSE NO.: ${causeNumber}`,
    "",
    draftTitle.toUpperCase(),
    "",
    `COMES NOW ${petitionerName}, Petitioner, and respectfully asks the Court to review this draft request concerning the record for ${charge}.`,
    pathParagraph,
    `Petitioner understands this draft does not decide eligibility and may need court records, account records, and local review before filing.`,
    "",
    "WHEREFORE, Petitioner respectfully requests that the Court review this matter and grant any relief that may be proper under current Mississippi law after required notice and review.",
    "",
    "Respectfully submitted,",
    petitionerName,
    "[SSN TO BE ADDED BY PETITIONER IF REQUIRED]",
    "",
    "CERTIFICATE OF SERVICE",
    "I certify that a copy of this draft petition would be provided to the appropriate parties if required by current Mississippi law and local court procedure.",
    "",
    "PROPOSED ORDER PLACEHOLDER",
    "A proposed order may be needed by some courts. This placeholder should be reviewed and completed only after the court, county, and local requirements are checked.",
    "",
    "[DOB TO BE ADDED BY PETITIONER IF REQUIRED]"
  ].join("\n\n");
}

function renderHtml(draftTitle: string, fields: ReturnType<typeof mapMississippiIntakeToDocumentFields>, plainText: string) {
  const missing = fields.missingFields.map((field) => `<li>${escapeHtml(mississippiFieldLabels[field])}</li>`).join("");
  return `
    <article class="mississippi-petition-preview">
      <header>
        <p class="caption">Mississippi RCAP draft packet</p>
        <h1>${escapeHtml(draftTitle)}</h1>
        <p>${escapeHtml(mississippiReviewLanguage.notFinal)}</p>
      </header>
      ${missing ? `<section class="missing"><h2>More information needed</h2><ul>${missing}</ul></section>` : ""}
      <pre>${escapeHtml(plainText)}</pre>
    </article>
  `;
}

function pathwayParagraph(pathway: string) {
  if (pathway === "non_conviction") {
    return "Based on information shared, this draft follows the dismissed or non-conviction petition path. The final basis should be checked against court records.";
  }
  if (pathway === "felony_conviction") {
    return "Based on information shared, this draft follows a felony conviction review path. Excluded offense screening, completion timing, and district attorney notice should be checked before filing.";
  }
  return "Based on information shared, this draft follows a misdemeanor conviction review path. Sentence completion, account balance, and non-traffic details should be checked before filing.";
}

function formatName(firstName?: string, lastName?: string) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || "[PETITIONER NAME TO BE CONFIRMED]";
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
