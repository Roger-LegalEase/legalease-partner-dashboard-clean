import type { RcapIntakeSession } from "@/lib/rcap-intake/types";
import { getPennsylvaniaCountyCourtInstructions } from "@/lib/rcap/state-packs/pennsylvania/county-court-instructions";
import { pennsylvaniaFeeNotes } from "@/lib/rcap/state-packs/pennsylvania/fee-notes";
import { pennsylvaniaFilingInstructions } from "@/lib/rcap/state-packs/pennsylvania/filing-instructions";
import { pennsylvaniaFieldLabels } from "@/lib/rcap/state-packs/pennsylvania/required-fields";
import { pennsylvaniaPathwayLabels } from "@/lib/rcap/state-packs/pennsylvania/pathways";
import { pennsylvaniaPlainLanguage, pennsylvaniaSafetyDisclaimer } from "@/lib/rcap/state-packs/pennsylvania/safety-language";
import { pennsylvaniaWaitingPeriods } from "@/lib/rcap/state-packs/pennsylvania/waiting-periods";
import { mapPennsylvaniaIntakeToDocumentFields } from "./field-mapper";
import type { PennsylvaniaDocumentGenerationResult, PennsylvaniaDocumentPacketInput, PennsylvaniaMappedDocumentFields } from "./types";

const sourceHtmlPath = "reference/pennsylvania/pa-petition-expungement-790.html";
const sourcePdfPath = "reference/pennsylvania/Pennsylvania-Expungement-Sealing-Agent-Reference.pdf";
const sourceRule790PdfPath = "reference/pennsylvania/222612-petitionforexpungement790030912-000077.pdf";

export function generatePennsylvaniaDocumentDraft(
  session: RcapIntakeSession,
  packet: Partial<PennsylvaniaDocumentPacketInput> = {}
): PennsylvaniaDocumentGenerationResult {
  const fields = mapPennsylvaniaIntakeToDocumentFields(session, packet);
  const status = fields.missingFields.length > 0 || fields.pathway === "excluded_or_needs_review" ? "missing_information" : "preview_generated";
  const draftTitle = selectDraftTitle(fields);
  const draftPlainText = renderPlainText(draftTitle, fields);
  const countyCourtInstructions = getPennsylvaniaCountyCourtInstructions({ county: fields.county });
  return {
    state: "PA",
    remedyType: fields.remedyType,
    pathway: fields.pathway,
    documentTypes: fields.documentTypes,
    eligibilitySignal: fields.eligibilitySignal,
    status,
    missingFields: fields.missingFields,
    draftTitle,
    draftHtml: `<article class="pennsylvania-document-preview" data-source-html="${sourceHtmlPath}" data-source-pdf="${sourcePdfPath}" data-rule-790-pdf="${sourceRule790PdfPath}"><h1>${escapeHtml(draftTitle)}</h1><pre>${escapeHtml(draftPlainText)}</pre></article>`,
    draftPlainText,
    filingInstructions: [...pennsylvaniaFilingInstructions, ...pennsylvaniaFeeNotes],
    countyCourtInstructions,
    safetyDisclaimer: pennsylvaniaSafetyDisclaimer,
    nextStep: status === "missing_information" ? "A PATCH report, docket, grade, restitution status, and record review may help fill in missing details before filing is considered." : "Review this draft against the PATCH report, court docket, and county instructions before any filing is considered.",
    briefcaseItemTitle: `${draftTitle} packet`,
    fields
  };
}

function selectDraftTitle(fields: PennsylvaniaMappedDocumentFields) {
  if (fields.remedyType === "expungement") return "Pennsylvania Pa.R.Crim.P. 790 Expungement Petition Draft";
  if (fields.remedyType === "limited_access") return "Pennsylvania Limited Access / Sealing Review Draft";
  if (fields.remedyType === "clean_slate") return "Pennsylvania Clean Slate Verification Draft";
  return "Pennsylvania Record Relief Review Needed";
}

function renderPlainText(title: string, fields: PennsylvaniaMappedDocumentFields) {
  const name = [fields.petitionerFirstName, fields.petitionerLastName].filter(Boolean).join(" ").trim() || "[PETITIONER NAME TO BE CONFIRMED]";
  const county = fields.county || "[COUNTY TO BE CONFIRMED]";
  const charge = fields.charge || "[CHARGE TO BE CONFIRMED]";
  const disposition = fields.disposition || "[DISPOSITION TO BE CONFIRMED]";
  const missing = fields.missingFields.map((field) => `- ${pennsylvaniaFieldLabels[field]}`).join("\n");
  const missingBlock = fields.missingFields.length > 0 ? ["MORE INFORMATION NEEDED", missing].join("\n") : "No required foundation fields are currently marked missing.";
  const reason = selectReason(fields);
  const petitionBlock = fields.remedyType === "expungement"
    ? [
        "Pa.R.Crim.P. 790 PETITION SOURCE FIELDS",
        `In the Court of Common Pleas, County of ${county}`,
        `Judicial District: ${fields.judicialDistrict || "[JUDICIAL DISTRICT TO BE CONFIRMED]"}`,
        `Commonwealth of Pennsylvania v. ${name}`,
        `Docket number: ${fields.docketNumber || "[DOCKET NUMBER TO BE CONFIRMED]"}`,
        `OTN: ${fields.otn || "[OTN TO BE CONFIRMED]"}`,
        `Judge / address: ${fields.judgeName || "[JUDGE TO BE CONFIRMED]"} / ${fields.judgeAddress || "[JUDGE ADDRESS TO BE CONFIRMED]"}`,
        `Arresting agency: ${fields.arrestingAgency || "[ARRESTING AGENCY TO BE CONFIRMED]"}`,
        `Arrest date: ${fields.arrestDate || "[ARREST DATE TO BE CONFIRMED]"}`,
        `Complaint date: ${fields.complaintDate || "[COMPLAINT DATE TO BE CONFIRMED]"}`,
        `Affiant: ${fields.affiantName || "[AFFIANT TO BE CONFIRMED]"}`,
        "",
        "CHARGE ROW",
        `Title: ${fields.statuteTitle || "[TITLE]"}`,
        `Section: ${fields.statuteSection || "[SECTION]"}`,
        `Subsection: ${fields.statuteSubsection || "[SUBSECTION]"}`,
        `Description: ${charge}`,
        `Grade: ${fields.offenseGrade || "[GRADE TO BE CONFIRMED]"}`,
        `Disposition: ${disposition}`,
        "",
        `Fine/cost/restitution status: ${restitutionText(fields)}`,
        `Reason for expungement: ${reason}`,
        `PATCH report: ${patchText(fields)}`,
        "Service: petitioner shall serve a copy upon the attorney for the Commonwealth when filing with the Clerk of Courts.",
        "Verification: made subject to penalties for unsworn falsification to authorities under 18 Pa.C.S. § 4904.",
        "",
        "[DOB TO BE ADDED BY PETITIONER IF REQUIRED BY FORM]",
        "[SSN TO BE ADDED BY PETITIONER IF REQUIRED BY FORM]"
      ]
    : [
        fields.remedyType === "clean_slate" ? "CLEAN SLATE VERIFICATION NOTES" : "LIMITED ACCESS / SEALING REVIEW NOTES",
        `County / Court of Common Pleas: ${county}`,
        `Docket number: ${fields.docketNumber || "[DOCKET NUMBER TO BE CONFIRMED]"}`,
        `Charge: ${charge}`,
        `Grade: ${fields.offenseGrade || "[GRADE TO BE CONFIRMED]"}`,
        `Disposition: ${disposition}`,
        `Restitution status: ${restitutionText(fields)}`,
        `PATCH report: ${patchText(fields)}`,
        fields.remedyType === "clean_slate" ? `${pennsylvaniaPlainLanguage.cleanSlateCaution} This should not be read as proof that a record has already been sealed; data or alias gaps can cause missed records.` : "This conviction relief path is limited access / sealing, not expungement or record destruction.",
        "Do not use the Pa.R.Crim.P. 790 expungement petition as a final limited-access form without human review of current county and statutory requirements."
      ];

  return [
    title.toUpperCase(),
    "",
    pennsylvaniaPlainLanguage.reliefTypes,
    pennsylvaniaPlainLanguage.convictionCaution,
    "",
    `Pathway: ${pennsylvaniaPathwayLabels[fields.pathway]}`,
    `Remedy type: ${fields.remedyType}`,
    `Petitioner: ${name}`,
    "",
    ...petitionBlock,
    "",
    "WAITING PERIOD NOTES",
    ...pennsylvaniaWaitingPeriods.map((note) => `- ${note}`),
    "",
    missingBlock,
    "",
    `Source materials preserved: ${sourcePdfPath}; ${sourceHtmlPath}; ${sourceRule790PdfPath}`
  ].join("\n");
}

function selectReason(fields: PennsylvaniaMappedDocumentFields) {
  if (fields.pathway === "expungement_non_conviction") return "Non-conviction record under 18 Pa.C.S. § 9122.";
  if (fields.pathway === "expungement_no_disposition_18_months") return "Arrest with no disposition after 18 months and no pending proceedings.";
  if (fields.pathway === "expungement_summary_5_years") return "Summary conviction with 5 years arrest/prosecution-free.";
  if (fields.pathway === "expungement_ard") return "Successful ARD completion.";
  if (fields.pathway === "expungement_pardon") return "Full gubernatorial pardon.";
  if (fields.pathway === "expungement_age_70") return "Age 70+ pathway after required final release and arrest-free period.";
  if (fields.pathway === "expungement_deceased") return "Deceased for 3 years pathway.";
  return "More review needed before a Pennsylvania expungement reason is selected.";
}

function patchText(fields: PennsylvaniaMappedDocumentFields) {
  if (fields.hasPatchReport) return fields.patchWithin60Days === false ? "PATCH report present, but confirm it was obtained within 60 days before filing." : "PATCH report present; confirm it was obtained within 60 days before filing.";
  return fields.patchMissingReason ? `PATCH report not attached: ${fields.patchMissingReason}` : "PATCH report needed or reason for missing report needed.";
}

function restitutionText(fields: PennsylvaniaMappedDocumentFields) {
  if (fields.restitutionPaid) return "Victim restitution marked paid.";
  if (fields.victimRestitutionOwed) return "Victim restitution may be unpaid; this blocks sealing review until resolved.";
  if (fields.nonRestitutionCostsOnly) return "Only non-restitution fines/costs reported; these should not block sealing by themselves.";
  return "Restitution status needs confirmation.";
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
