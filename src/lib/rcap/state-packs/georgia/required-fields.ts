import type { GaPathway } from "./pathways";

// Required-field keys derived from the Georgia Agent Training Reference (the GBI
// Request to Restrict Arrest Record sections and the SB 288 petition recitals)
// and the official GBI form structure. These describe the data each Georgia
// pathway needs; they are not a field map to any specific PDF (no PDF field map
// exists yet) and no renderer is wired.
export type GaDocumentFieldKey =
  | "applicantName"
  | "dateOfBirth"
  | "race"
  | "sex"
  | "ssn"
  | "telephone"
  | "email"
  | "streetAddress"
  | "cityStateZip"
  | "arrestingAgency"
  | "arrestDate"
  | "arrestDateProng"
  | "offensesArrestedFor"
  | "chargeOffenseCode"
  | "disposition"
  | "dispositionDate"
  | "sidNumber"
  | "otnNumber"
  | "caseCitationDocket"
  | "convictionDate"
  | "sentenceCompletionDate"
  | "convictionFreeFourYears"
  | "priorRestrictionsCount"
  | "pendingChargesCheck"
  | "excludedOffenseCheck"
  | "pardonDate"
  | "newOffenseSincePardonCheck"
  | "ageAtArrest"
  | "interestsOfJusticeBasis"
  | "countyOfConviction"
  | "courtName"
  | "prosecutingAttorney"
  | "gcicHistoryAttached";

export const gaRequiredFields: Record<GaPathway, GaDocumentFieldKey[]> = {
  nonconviction_restriction: [
    "applicantName",
    "dateOfBirth",
    "ssn",
    "streetAddress",
    "cityStateZip",
    "arrestingAgency",
    "arrestDate",
    "arrestDateProng",
    "offensesArrestedFor",
    "disposition",
    "dispositionDate",
    "prosecutingAttorney"
  ],
  automatic_restriction: [
    "applicantName",
    "dateOfBirth",
    "arrestDate",
    "offensesArrestedFor",
    "disposition",
    "dispositionDate",
    "gcicHistoryAttached"
  ],
  sb288_misdemeanor_restriction: [
    "applicantName",
    "dateOfBirth",
    "countyOfConviction",
    "courtName",
    "caseCitationDocket",
    "chargeOffenseCode",
    "convictionDate",
    "sentenceCompletionDate",
    "convictionFreeFourYears",
    "priorRestrictionsCount",
    "pendingChargesCheck",
    "excludedOffenseCheck",
    "interestsOfJusticeBasis",
    "prosecutingAttorney",
    "gcicHistoryAttached"
  ],
  pardoned_felony_restriction: [
    "applicantName",
    "dateOfBirth",
    "countyOfConviction",
    "courtName",
    "chargeOffenseCode",
    "convictionDate",
    "pardonDate",
    "newOffenseSincePardonCheck",
    "pendingChargesCheck",
    "prosecutingAttorney",
    "gcicHistoryAttached"
  ],
  youthful_first_offender_restriction: [
    "applicantName",
    "dateOfBirth",
    "ageAtArrest",
    "countyOfConviction",
    "chargeOffenseCode",
    "convictionDate",
    "disposition",
    "excludedOffenseCheck"
  ],
  court_record_sealing: [
    "applicantName",
    "countyOfConviction",
    "courtName",
    "caseCitationDocket",
    "disposition",
    "prosecutingAttorney"
  ],
  needs_review: ["offensesArrestedFor", "disposition", "arrestDate"]
};

export const gaFieldLabels: Record<GaDocumentFieldKey, string> = {
  applicantName: "Applicant / petitioner full legal name",
  dateOfBirth: "Date of birth",
  race: "Race (GBI form field)",
  sex: "Sex (GBI form field)",
  ssn: "Social Security Number (GBI form field)",
  telephone: "Telephone number",
  email: "Email",
  streetAddress: "Street address",
  cityStateZip: "City, state, and ZIP code",
  arrestingAgency: "Arresting agency",
  arrestDate: "Date of arrest (one date of arrest per GBI request)",
  arrestDateProng: "Whether the arrest was before, or on/after, July 1, 2013",
  offensesArrestedFor: "Offense(s) arrested for",
  chargeOffenseCode: "Exact offense and O.C.G.A. Code section (to screen the excluded list)",
  disposition: "Disposition (dismissed, nolle prosequi, acquittal, dead docket, diversion, conviction, etc.)",
  dispositionDate: "Date of disposition",
  sidNumber: "State Identification Number (SID), completed by the arresting agency",
  otnNumber: "Offender Tracking Number (OTN), completed by the arresting agency",
  caseCitationDocket: "Case / citation / docket number",
  convictionDate: "Conviction date (conviction pathways)",
  sentenceCompletionDate: "Date all sentence terms were completed (jail served and probation terminated)",
  convictionFreeFourYears: "Whether the person has had no convictions for at least four years before filing",
  priorRestrictionsCount: "Number of misdemeanor convictions previously restricted (two-in-a-lifetime cap)",
  pendingChargesCheck: "Whether any charges are currently pending",
  excludedOffenseCheck: "Whether the offense is on the § 35-3-37(j)(4) excluded list",
  pardonDate: "Date of the Board of Pardons and Paroles pardon (pardoned-felony pathway)",
  newOffenseSincePardonCheck: "Whether there has been any new offense since the pardon",
  ageAtArrest: "Age at the time of arrest (youthful / family-violence under-21 carve-out)",
  interestsOfJusticeBasis: "Interests-of-justice basis (harm to petitioner vs. public interest in access)",
  countyOfConviction: "County of conviction / county where the case was handled",
  courtName: "Court (Superior or State Court of the county)",
  prosecutingAttorney: "Prosecuting attorney (Attorney General, district attorney, or solicitor-general)",
  gcicHistoryAttached: "Whether a current GCIC criminal history is attached"
};
