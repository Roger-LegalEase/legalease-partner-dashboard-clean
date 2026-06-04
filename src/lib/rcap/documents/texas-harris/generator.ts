import type { RcapIntakeSession } from "@/lib/rcap-intake/types";
import { buildFilingNextStepsPacket } from "@/lib/rcap/documents/filing-next-steps";
import { texasHarrisFeeNotes, texasHarrisFilingInstructions, texasHarrisCountyCourtInstructions } from "@/lib/rcap/state-packs/texas-harris/filing-instructions";
import { texasHarrisPathwayLabels } from "@/lib/rcap/state-packs/texas-harris/pathways";
import { texasHarrisFieldLabels } from "@/lib/rcap/state-packs/texas-harris/required-fields";
import { texasHarrisPlainLanguage, texasHarrisSafetyDisclaimer } from "@/lib/rcap/state-packs/texas-harris/safety-language";
import { mapTexasHarrisIntakeToDocumentFields } from "./field-mapper";
import type { TexasHarrisDocumentGenerationResult, TexasHarrisDocumentPacketInput, TexasHarrisMappedDocumentFields } from "./types";

const sourceHtmlPath = "reference/texas-harris/tx-harris-expunction-nondisclosure-forms.html";
const sourcePdfPath = "reference/texas-harris/Texas-HarrisCounty-Expunction-Nondisclosure-Agent-Reference.pdf";

export function generateTexasHarrisDocumentDraft(
  session: RcapIntakeSession,
  packet: Partial<TexasHarrisDocumentPacketInput> = {}
): TexasHarrisDocumentGenerationResult {
  const fields = mapTexasHarrisIntakeToDocumentFields(session, packet);
  const status = fields.missingFields.length > 0 || fields.pathway === "final_conviction_pardon_review" || fields.pathway === "more_information_needed" ? "missing_information" : "preview_generated";
  const draftTitle = selectDraftTitle(fields);
  const draftPlainText = renderPlainText(draftTitle, fields);
  const resultWithoutNextSteps = {
    state: "TX",
    county: "Harris",
    remedyType: fields.remedyType,
    pathway: fields.pathway,
    documentTypes: fields.documentTypes,
    eligibilitySignal: fields.eligibilitySignal,
    status,
    missingFields: fields.missingFields,
    draftTitle,
    draftHtml: `<article class="texas-harris-document-preview" data-source-html="${sourceHtmlPath}" data-source-pdf="${sourcePdfPath}"><h1>${escapeHtml(draftTitle)}</h1><pre>${escapeHtml(draftPlainText)}</pre></article>`,
    draftPlainText,
    filingInstructions: [...texasHarrisFilingInstructions, ...texasHarrisFeeNotes],
    countyCourtInstructions: texasHarrisCountyCourtInstructions,
    safetyDisclaimer: texasHarrisSafetyDisclaimer,
    nextStep: status === "missing_information" ? "Confirm the Texas DPS criminal history, certified disposition, Harris County court route, statutory basis, waiting-period facts, disqualifier checks, and notice parties before filing." : "Review this Harris County draft against the DPS criminal history, certified disposition, and source packet before filing.",
    briefcaseItemTitle: `${draftTitle} packet`,
    fields
  } satisfies Omit<TexasHarrisDocumentGenerationResult, "filingNextStepsPacket">;
  return {
    ...resultWithoutNextSteps,
    filingNextStepsPacket: buildFilingNextStepsPacket({
      ...resultWithoutNextSteps,
      county: "Harris",
      courtType: fields.courtType === "municipal_class_c" ? "Municipal Courts" : "Harris County District Clerk",
      courtCounty: "Harris",
      courtName: fields.courtType === "municipal_class_c" ? "Municipal Courts / 1400 Lubbock" : "Harris County District Clerk / 201 Caroline St.",
      documentType: fields.documentTypes[0]
    })
  };
}

function selectDraftTitle(fields: TexasHarrisMappedDocumentFields) {
  if (fields.remedyType === "expunction") return "Harris County Texas Chapter 55A Expunction Packet Draft";
  if (fields.remedyType === "nondisclosure") return "Harris County Texas Chapter 411 Order of Nondisclosure Packet Draft";
  return "Harris County Texas Record Relief Review Needed";
}

function renderPlainText(title: string, fields: TexasHarrisMappedDocumentFields) {
  const name = [fields.petitionerFirstName, fields.petitionerLastName].filter(Boolean).join(" ").trim() || "[PETITIONER NAME TO BE CONFIRMED]";
  const court = fields.courtType === "municipal_class_c" ? "Municipal Courts / 1400 Lubbock" : fields.courtType && fields.courtType !== "unknown" ? "Harris County District Clerk / 201 Caroline St." : "[HARRIS COUNTY COURT TYPE TO BE CONFIRMED]";
  const missing = fields.missingFields.map((field) => `- ${texasHarrisFieldLabels[field]}`).join("\n");
  const missingBlock = fields.missingFields.length > 0 ? ["MORE INFORMATION NEEDED", missing].join("\n") : "No required foundation fields are currently marked missing.";
  const caption = [
    "HARRIS COUNTY CAPTION FORMAT",
    "CAUSE NO. " + (fields.caseNumber || "[CAUSE / CASE NUMBER TO BE CONFIRMED]"),
    `IN RE: ${name}`,
    "IN THE DISTRICT COURT / COUNTY CRIMINAL COURT / MUNICIPAL COURT",
    "HARRIS COUNTY, TEXAS",
    `Court route: ${court}`
  ];
  const body = fields.remedyType === "expunction" ? expunctionBody(fields) : fields.remedyType === "nondisclosure" ? nondisclosureBody(fields) : reviewBody(fields);

  return [
    title.toUpperCase(),
    "",
    texasHarrisPlainLanguage.noGenericWorkflow,
    texasHarrisPlainLanguage.reliefTypes,
    "",
    `Pathway: ${texasHarrisPathwayLabels[fields.pathway]}`,
    `Remedy type: ${fields.remedyType}`,
    "",
    ...caption,
    "",
    ...body,
    "",
    "DEFAULT AGENCY / NOTICE PARTY LIST",
    ...fields.noticeParties.map((party) => `- ${party}`),
    "- Any other agency identified from the user's DPS/criminal history or arrest paperwork.",
    "",
    "SIGNATURE AND VERIFICATION",
    `Petitioner address: ${fields.petitionerAddress || "[ADDRESS TO BE CONFIRMED]"}`,
    "Petitioner signature: ______________________________",
    "Verification / notary block: petitioner swears or verifies the petition facts before a notary or other authorized officer where required.",
    "",
    "FILING NEXT-STEPS SOURCE ITEMS",
    "- Get Texas DPS criminal history.",
    "- Get certified disposition from the arresting agency when needed.",
    "- Confirm expunction vs. nondisclosure eligibility before filing.",
    "- File district/county matters with the Harris County District Clerk at 201 Caroline St.",
    "- Route Class C / municipal matters through Municipal Courts at 1400 Lubbock where applicable.",
    "- For nondisclosure, serve the petition on the State through the Harris County District Attorney.",
    "- For expunction, name every agency that may hold records; a missed agency may keep a copy of the record.",
    "- The Harris source form includes a verification page requiring the petitioner to swear to the petition facts before a Texas notary or other authorized officer.",
    "- For expunction, attach the Texas DPS criminal history and, in Harris County, a certified disposition from the arresting agency when needed.",
    "- Expunction may require a hearing.",
    "- Nondisclosure may be decided on the papers.",
    "- Keep a certified copy of the signed order and track execution by agencies after the order is signed.",
    "",
    missingBlock,
    "",
    `Source materials preserved: ${sourcePdfPath}; ${sourceHtmlPath}`,
    "Source-backed packet wording, verification language, default agency list, attachment notes, and nondisclosure service note have been incorporated from the preserved Harris County HTML packet.",
    "Workflow gap: the preserved Harris County source materials do not state current filing method, copy counts, or agency-specific service mechanics. Confirm those details with the clerk or current court instructions before final filing."
  ].join("\n");
}

function expunctionBody(fields: TexasHarrisMappedDocumentFields) {
  return [
    "PETITION FOR EXPUNCTION OF CRIMINAL RECORDS",
    "Statutory basis: Texas Code of Criminal Procedure Chapter 55A.",
    "Relief requested: expunction of records, which may erase, destroy, or return records and may allow denial of the arrest where Chapter 55A applies.",
    `Arrest date: ${fields.arrestDate || "[ARREST DATE TO BE CONFIRMED]"}`,
    `Arresting agency: ${fields.arrestingAgency || "[ARRESTING AGENCY TO BE CONFIRMED]"}`,
    `Agency case number: ${fields.agencyCaseNumber || "[AGENCY CASE NUMBER TO BE CONFIRMED]"}`,
    `Charge/offense: ${fields.charge || "[CHARGE TO BE CONFIRMED]"}`,
    `Disposition: ${fields.disposition || "[DISPOSITION TO BE CONFIRMED]"}`,
    `Disposition date: ${fields.dispositionDate || "[DISPOSITION DATE TO BE CONFIRMED]"}`,
    `Chapter 55A route/basis: ${fields.statutoryRoute || "[CHAPTER 55A ROUTE TO BE CONFIRMED]"}`,
    `Waiting-period facts: ${fields.waitingPeriodFacts || "[WAITING-PERIOD FACTS TO BE CONFIRMED]"}`,
    "PROPOSED ORDER OF EXPUNCTION: judge signature block and agency execution directions to be reviewed against the Harris County form packet."
  ];
}

function nondisclosureBody(fields: TexasHarrisMappedDocumentFields) {
  return [
    "PETITION FOR ORDER OF NONDISCLOSURE",
    "Statutory basis: Texas Government Code Chapter 411, Subchapter E-1.",
    "Relief requested: nondisclosure, which seals records from most private requesters but remains visible to law enforcement, courts, licensing agencies, and other entities allowed by law.",
    `Case number: ${fields.caseNumber || "[CASE NUMBER TO BE CONFIRMED]"}`,
    `Charge/offense: ${fields.charge || "[CHARGE TO BE CONFIRMED]"}`,
    `Disposition: ${fields.disposition || "[DISPOSITION TO BE CONFIRMED]"}`,
    `Disposition date: ${fields.dispositionDate || "[DISPOSITION DATE TO BE CONFIRMED]"}`,
    `Chapter 411 route/basis: ${fields.statutoryRoute || "[GOVERNMENT CODE CHAPTER 411 ROUTE TO BE CONFIRMED]"}`,
    `Waiting-period facts: ${fields.waitingPeriodFacts || "[WAITING-PERIOD FACTS TO BE CONFIRMED]"}`,
    `Disqualifier checks: ${fields.noDisqualifyingHistory === true ? "No disqualifying history marked by user; verify against DPS criminal history." : fields.disqualifierNotes || "[DISQUALIFIER CHECKS TO BE CONFIRMED]"}`,
    "PROPOSED ORDER OF NONDISCLOSURE: judge signature block and agency execution directions to be reviewed against the Harris County form packet."
  ];
}

function reviewBody(fields: TexasHarrisMappedDocumentFields) {
  return [
    "RECORD RELIEF REVIEW NEEDED",
    "Final conviction / likely no relief except pardon or another source-supported route.",
    `Charge/offense: ${fields.charge || "[CHARGE TO BE CONFIRMED]"}`,
    `Disposition: ${fields.disposition || "[DISPOSITION TO BE CONFIRMED]"}`,
    "Do not generate a final expunction or nondisclosure filing from this route without human review."
  ];
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
