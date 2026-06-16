import type { MePathway } from "./pathways";

// Required-field keys derived from the Maine Criminal Record Sealing — Wilma Agent
// Training Reference (the CR-218 prerequisites in §§ 2262-2264, the intake
// questions in section 13, and the "do not say eligible unless" rules in section
// 15). These describe the data each Maine pathway needs; they are not a field map
// to the CR-218/CR-289/JV-043 PDFs (no field map exists yet) and no renderer is
// wired.
export type MeDocumentFieldKey =
  | "defendantName"
  | "dateOfBirth"
  | "adultOrJuvenile"
  | "court"
  | "county"
  | "docketNumber"
  | "offenseName"
  | "offenseClass"
  | "chapter11Check"
  | "marijuanaPre2017Check"
  | "convictionDate"
  | "sentenceFullySatisfiedDate"
  | "laterMaineConvictionCheck"
  | "laterDeferredDispositionDismissalCheck"
  | "laterOtherJurisdictionConvictionCheck"
  | "pendingChargesCheck"
  | "dispositionType"
  | "eligibilitySection"
  | "traffickingExploitationFacts"
  | "prostitutionFormerOffenseCheck"
  | "disqualifyingLaterConvictionCheck"
  | "dischargeDate"
  | "laterAdjudicationOrConvictionCheck"
  | "sbiRecordObtained"
  | "feeWaiverRequest";

export const meRequiredFields: Record<MePathway, MeDocumentFieldKey[]> = {
  general_adult_conviction_sealing: [
    "defendantName",
    "dateOfBirth",
    "court",
    "county",
    "docketNumber",
    "offenseName",
    "offenseClass",
    "chapter11Check",
    "marijuanaPre2017Check",
    "convictionDate",
    "sentenceFullySatisfiedDate",
    "laterMaineConvictionCheck",
    "laterDeferredDispositionDismissalCheck",
    "laterOtherJurisdictionConvictionCheck",
    "pendingChargesCheck",
    "eligibilitySection",
    "sbiRecordObtained",
    "feeWaiverRequest"
  ],
  engaging_in_prostitution_sealing: [
    "defendantName",
    "dateOfBirth",
    "court",
    "docketNumber",
    "offenseName",
    "prostitutionFormerOffenseCheck",
    "sentenceFullySatisfiedDate",
    "disqualifyingLaterConvictionCheck",
    "sbiRecordObtained"
  ],
  trafficking_survivor_sealing: [
    "defendantName",
    "dateOfBirth",
    "court",
    "docketNumber",
    "offenseName",
    "convictionDate",
    "traffickingExploitationFacts"
  ],
  non_conviction_confidentiality: [
    "defendantName",
    "dateOfBirth",
    "court",
    "docketNumber",
    "offenseName",
    "dispositionType",
    "sbiRecordObtained"
  ],
  pardon_confidentiality: [
    "defendantName",
    "dateOfBirth",
    "offenseName",
    "convictionDate",
    "sbiRecordObtained"
  ],
  juvenile_automatic_sealing: [
    "defendantName",
    "dateOfBirth",
    "adultOrJuvenile",
    "court",
    "docketNumber",
    "offenseClass",
    "dischargeDate"
  ],
  juvenile_petition_sealing: [
    "defendantName",
    "dateOfBirth",
    "adultOrJuvenile",
    "court",
    "docketNumber",
    "offenseClass",
    "dischargeDate",
    "laterAdjudicationOrConvictionCheck",
    "pendingChargesCheck"
  ],
  needs_review: ["offenseName", "offenseClass", "dispositionType"]
};

export const meFieldLabels: Record<MeDocumentFieldKey, string> = {
  defendantName: "Defendant full legal name",
  dateOfBirth: "Date of birth",
  adultOrJuvenile: "Whether the case is adult or juvenile",
  court: "Court where the case was handled",
  county: "County",
  docketNumber: "Docket number",
  offenseName: "Exact offense name",
  offenseClass: "Offense class (e.g., Class E)",
  chapter11Check: "Whether the offense is under Title 17-A, Chapter 11 (excluded from the general route)",
  marijuanaPre2017Check: "Whether it is a listed marijuana offense committed before January 30, 2017",
  convictionDate: "Conviction date",
  sentenceFullySatisfiedDate:
    "Date all sentence components were fully satisfied (jail, probation, administrative release, license suspension, fines, restitution, community service)",
  laterMaineConvictionCheck: "Whether there has been any later Maine conviction",
  laterDeferredDispositionDismissalCheck:
    "Whether there has been a later deferred-disposition dismissal",
  laterOtherJurisdictionConvictionCheck:
    "Whether there has been a later out-of-state/federal/tribal conviction",
  pendingChargesCheck: "Whether any criminal charges are pending anywhere",
  dispositionType:
    "Disposition type (conviction, dismissal, declined, no bill, acquittal, never charged, etc.)",
  eligibilitySection: "The eligibility section the motion is brought under",
  traffickingExploitationFacts:
    "Facts connecting the conviction to sex trafficking or sexual exploitation (§ 2262-B; trauma-sensitive)",
  prostitutionFormerOffenseCheck:
    "Whether the conviction was the former Class E engaging-in-prostitution offense (former § 853-A)",
  disqualifyingLaterConvictionCheck:
    "Whether there is a disqualifying later trafficking/prostitution-related conviction",
  dischargeDate: "Discharge date from the juvenile disposition",
  laterAdjudicationOrConvictionCheck:
    "Whether there has been a later juvenile adjudication or adult conviction",
  sbiRecordObtained: "Whether the Maine SBI criminal-history record has been obtained",
  feeWaiverRequest: "Whether a fee waiver is requested (CV-067 + CV-191)"
};
