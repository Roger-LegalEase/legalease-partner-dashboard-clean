import type { SdPathway } from "./pathways";

// Required-field keys derived from the South Dakota Expungement Reference for
// Wilma (the intake checklist in sections 14 and 16 and the packet logic in
// section 15). These describe the data each South Dakota pathway needs; they are
// not a field map to the UJS form PDFs (the per-form field map is supporting
// research only) and no renderer is wired.
export type SdDocumentFieldKey =
  | "petitionerName"
  | "formerNamesAliases"
  | "dateOfBirth"
  | "mailingAddress"
  | "phoneEmail"
  | "parentGuardianInfo"
  | "filingCourt"
  | "county"
  | "caseNumber"
  | "arrestDate"
  | "arrestingAgency"
  | "prosecutingAgency"
  | "originalCharge"
  | "highestCharge"
  | "accusatoryInstrumentFiled"
  | "caseFormallyDismissed"
  | "dismissalDate"
  | "acquittalStatus"
  | "compellingNecessity"
  | "victimIssue"
  | "diversionCompletionDate"
  | "newChargeWithinDiversionWindow"
  | "statesAttorneyDismissalNotice"
  | "minorOffenseLevel"
  | "conditionsSatisfied"
  | "newConvictionsInFiveYears"
  | "sisFelonyOrMisdemeanor"
  | "priorFelonyConviction"
  | "priorSis"
  | "sisDischargeOrder"
  | "drugDeferredStatus"
  | "treatmentCompletionProof"
  | "aggravatingCircumstances"
  | "pardonGranted"
  | "chapter2414BoardProcess"
  | "juvenileReleaseDischargeDate"
  | "laterDelinquencyAdjudication"
  | "pendingSeriousProceeding"
  | "rehabilitationEvidence"
  | "traffickingExploitationFacts"
  | "feeWaiverRequest";

export const sdRequiredFields: Record<SdPathway, SdDocumentFieldKey[]> = {
  adult_arrest_record_expungement: [
    "petitionerName",
    "formerNamesAliases",
    "dateOfBirth",
    "mailingAddress",
    "phoneEmail",
    "filingCourt",
    "county",
    "caseNumber",
    "arrestDate",
    "arrestingAgency",
    "prosecutingAgency",
    "originalCharge",
    "highestCharge",
    "accusatoryInstrumentFiled",
    "caseFormallyDismissed",
    "dismissalDate",
    "acquittalStatus",
    "compellingNecessity",
    "victimIssue",
    "feeWaiverRequest"
  ],
  diversion_expungement: [
    "petitionerName",
    "county",
    "filingCourt",
    "caseNumber",
    "originalCharge",
    "diversionCompletionDate",
    "newChargeWithinDiversionWindow",
    "statesAttorneyDismissalNotice"
  ],
  minor_case_automatic_removal: [
    "petitionerName",
    "county",
    "caseNumber",
    "highestCharge",
    "minorOffenseLevel",
    "conditionsSatisfied",
    "newConvictionsInFiveYears"
  ],
  suspended_imposition_sealing: [
    "petitionerName",
    "county",
    "filingCourt",
    "caseNumber",
    "originalCharge",
    "sisFelonyOrMisdemeanor",
    "priorFelonyConviction",
    "priorSis",
    "sisDischargeOrder"
  ],
  drug_deferred_dismissal: [
    "petitionerName",
    "county",
    "filingCourt",
    "caseNumber",
    "originalCharge",
    "drugDeferredStatus",
    "treatmentCompletionProof",
    "aggravatingCircumstances"
  ],
  pardon_sealing: [
    "petitionerName",
    "county",
    "originalCharge",
    "pardonGranted",
    "chapter2414BoardProcess"
  ],
  juvenile_delinquency_sealing: [
    "petitionerName",
    "parentGuardianInfo",
    "county",
    "filingCourt",
    "caseNumber",
    "juvenileReleaseDischargeDate",
    "laterDelinquencyAdjudication",
    "pendingSeriousProceeding",
    "rehabilitationEvidence"
  ],
  juvenile_trafficking_expungement: [
    "petitionerName",
    "parentGuardianInfo",
    "county",
    "filingCourt",
    "caseNumber",
    "traffickingExploitationFacts"
  ],
  needs_review: ["originalCharge", "highestCharge", "caseNumber", "dismissalDate"]
};

export const sdFieldLabels: Record<SdDocumentFieldKey, string> = {
  petitionerName: "Full legal name",
  formerNamesAliases: "Former names and aliases",
  dateOfBirth: "Date of birth",
  mailingAddress: "Current mailing address",
  phoneEmail: "Phone and email",
  parentGuardianInfo: "Parent/guardian information (for juvenile matters)",
  filingCourt: "Court with jurisdiction over the case or arrest (where the motion is filed)",
  county: "County",
  caseNumber: "Case number",
  arrestDate: "Arrest date",
  arrestingAgency: "Arresting agency",
  prosecutingAgency: "Prosecuting agency / State's Attorney (for service)",
  originalCharge: "Original charge",
  highestCharge: "Highest charge in the case",
  accusatoryInstrumentFiled: "Whether an accusatory instrument was filed",
  caseFormallyDismissed: "Whether the whole case was formally dismissed",
  dismissalDate: "Date of formal dismissal",
  acquittalStatus: "Whether the person was acquitted (and date)",
  compellingNecessity:
    "Whether filing within one year of dismissal based on compelling necessity (attorney review)",
  victimIssue: "Whether there was a victim (hearing-waiver/notice issue)",
  diversionCompletionDate: "Diversion completion date",
  newChargeWithinDiversionWindow:
    "Whether any new charge occurred within one year and thirty days after diversion completion",
  statesAttorneyDismissalNotice:
    "Whether the State's Attorney filed the dismissal of all charges and the diversion-completion notice",
  minorOffenseLevel:
    "Whether the highest charge was a petty offense, municipal ordinance violation, or Class 2 misdemeanor",
  conditionsSatisfied: "Whether all court-ordered conditions were satisfied",
  newConvictionsInFiveYears: "Any new convictions within the five-year period",
  sisFelonyOrMisdemeanor: "Whether the suspended imposition was a felony or misdemeanor SIS",
  priorFelonyConviction: "Whether there is a prior felony conviction",
  priorSis: "Whether the person previously used a felony or misdemeanor SIS",
  sisDischargeOrder: "Discharge and dismissal order on the suspended imposition",
  drugDeferredStatus: "Status of the controlled-substance deferred case (plea, deferral, conditions)",
  treatmentCompletionProof: "Proof of treatment and condition completion",
  aggravatingCircumstances:
    "Whether any aggravating circumstances exist or the person is serving an executive-branch sentence",
  pardonGranted: "Whether the Governor granted a pardon",
  chapter2414BoardProcess: "Whether the pardon went through the Chapter 24-14 Board process",
  juvenileReleaseDischargeDate:
    "Date of unconditional release from court jurisdiction or DOC discharge (whichever is later)",
  laterDelinquencyAdjudication: "Any later delinquency adjudication since release/discharge",
  pendingSeriousProceeding: "Any pending or instituted serious proceeding of the listed types",
  rehabilitationEvidence: "Rehabilitation evidence",
  traffickingExploitationFacts: "Trafficking or sexual-exploitation facts underlying the delinquency",
  feeWaiverRequest: "Whether a fee waiver / indigency request is filed for the $72 filing fee"
};
