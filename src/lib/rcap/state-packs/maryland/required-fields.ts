import type { MdPathway } from "./pathways";

// Required-field keys derived from the Maryland Wilma Agent Training Reference
// intake questions (section 15) and the per-route eligibility checks. These map
// to the data an official Maryland Judiciary form / petition needs; they are not
// a field map to any specific PDF (no PDF field mapping exists yet).
export type MdDocumentFieldKey =
  | "petitionerName"
  | "petitionerAliases"
  | "dateOfBirth"
  | "petitionerAddress"
  | "adultOrJuvenile"
  | "countyOrCity"
  | "courtType"
  | "caseNumber"
  | "arrestNoChargeFlag"
  | "arrestDate"
  | "arrestingAgency"
  | "allChargesInIncident"
  | "perChargeDisposition"
  | "dispositionDate"
  | "offenseStatute"
  | "offenseLevel"
  | "convictionExpungeableListCheck"
  | "cannabisChargeFlag"
  | "minorTrafficFlag"
  | "unitRuleReview"
  | "sentenceCompletionDate"
  | "probationDischargeDate"
  | "treatmentCompletionDate"
  | "restitutionStatus"
  | "duiPbjFlag"
  | "newConvictionDuringWaitCheck"
  | "pendingChargesCheck"
  | "domesticallyRelatedFlag"
  | "victimListedFlag"
  | "pardonVacaturNoLongerCrimeFlag"
  | "waiverAndReleaseFlag"
  | "priorShieldingCheck"
  | "remedyPreference"
  | "statesAttorney"
  | "serviceMethod";

export const mdRequiredFields: Record<MdPathway, MdDocumentFieldKey[]> = {
  adult_nonconviction_expungement: [
    "petitionerName",
    "dateOfBirth",
    "countyOrCity",
    "courtType",
    "caseNumber",
    "allChargesInIncident",
    "perChargeDisposition",
    "dispositionDate",
    "unitRuleReview",
    "probationDischargeDate",
    "duiPbjFlag",
    "treatmentCompletionDate",
    "waiverAndReleaseFlag",
    "pendingChargesCheck",
    "statesAttorney",
    "serviceMethod"
  ],
  automatic_expungement: [
    "petitionerName",
    "countyOrCity",
    "courtType",
    "caseNumber",
    "allChargesInIncident",
    "perChargeDisposition",
    "dispositionDate",
    "unitRuleReview",
    "pendingChargesCheck"
  ],
  early_favorable_filing: [
    "petitionerName",
    "countyOrCity",
    "courtType",
    "caseNumber",
    "allChargesInIncident",
    "perChargeDisposition",
    "dispositionDate",
    "unitRuleReview",
    "pendingChargesCheck",
    "statesAttorney",
    "serviceMethod"
  ],
  police_record_expungement: [
    "petitionerName",
    "dateOfBirth",
    "arrestNoChargeFlag",
    "arrestDate",
    "arrestingAgency",
    "countyOrCity",
    "courtType",
    "pendingChargesCheck"
  ],
  adult_conviction_expungement: [
    "petitionerName",
    "dateOfBirth",
    "countyOrCity",
    "courtType",
    "caseNumber",
    "allChargesInIncident",
    "perChargeDisposition",
    "offenseStatute",
    "offenseLevel",
    "convictionExpungeableListCheck",
    "unitRuleReview",
    "sentenceCompletionDate",
    "restitutionStatus",
    "newConvictionDuringWaitCheck",
    "domesticallyRelatedFlag",
    "victimListedFlag",
    "pendingChargesCheck",
    "statesAttorney",
    "serviceMethod"
  ],
  cannabis_expungement: [
    "petitionerName",
    "countyOrCity",
    "courtType",
    "caseNumber",
    "offenseStatute",
    "offenseLevel",
    "perChargeDisposition",
    "sentenceCompletionDate",
    "unitRuleReview",
    "statesAttorney",
    "serviceMethod"
  ],
  second_chance_shielding: [
    "petitionerName",
    "countyOrCity",
    "courtType",
    "caseNumber",
    "offenseStatute",
    "perChargeDisposition",
    "sentenceCompletionDate",
    "priorShieldingCheck",
    "pendingChargesCheck",
    "remedyPreference"
  ],
  juvenile_expungement: [
    "petitionerName",
    "dateOfBirth",
    "adultOrJuvenile",
    "countyOrCity",
    "courtType",
    "caseNumber",
    "perChargeDisposition",
    "newConvictionDuringWaitCheck",
    "pendingChargesCheck"
  ],
  needs_review: ["allChargesInIncident", "perChargeDisposition", "unitRuleReview"]
};

export const mdFieldLabels: Record<MdDocumentFieldKey, string> = {
  petitionerName: "Petitioner full legal name",
  petitionerAliases: "Prior names / aliases",
  dateOfBirth: "Date of birth",
  petitionerAddress: "Petitioner mailing address and phone",
  adultOrJuvenile: "Whether this is an adult case or a juvenile case",
  countyOrCity: "Maryland county or Baltimore City",
  courtType: "Court type (District Court or Circuit Court) and location",
  caseNumber: "Case number",
  arrestNoChargeFlag: "Whether the person was arrested with no charge filed",
  arrestDate: "Arrest date (and whether on/after Oct. 1, 2007)",
  arrestingAgency: "Arresting law-enforcement agency",
  allChargesInIncident: "Every charge in the same case or incident (unit-rule input)",
  perChargeDisposition:
    "Disposition of each charge (guilty, PBJ, stet, nolle prosequi, dismissal, not guilty, acquittal, NCR, juvenile transfer, other)",
  dispositionDate: "Date of disposition",
  offenseStatute: "Exact offense statute, degree, and CJIS charge code if available",
  offenseLevel: "Offense level (misdemeanor / felony)",
  convictionExpungeableListCheck:
    "Whether the exact conviction statute is on the § 10-110 eligible list (CC-DC-CR-072G2)",
  cannabisChargeFlag: "Whether any charge is cannabis possession or PWID cannabis",
  minorTrafficFlag: "Whether any charge is a minor traffic violation",
  unitRuleReview: "Unit-rule review — whether every charge in the incident is expungeable (§ 10-107)",
  sentenceCompletionDate:
    "Date the entire sentence was completed, including incarceration, parole, probation, mandatory supervision, treatment, and restitution",
  probationDischargeDate: "Date of discharge from probation (for PBJ timing)",
  treatmentCompletionDate: "Date required treatment was completed (treatment nolle)",
  restitutionStatus: "Whether court-ordered restitution was paid or inability to pay can be shown",
  duiPbjFlag: "Whether a PBJ was for a Transportation § 21-902 DUI/DWI (15-year rule)",
  newConvictionDuringWaitCheck: "Whether there was a new conviction during the applicable waiting period",
  pendingChargesCheck: "Whether any criminal proceeding is currently pending",
  domesticallyRelatedFlag: "Whether the case was domestically related (15-year § 10-110 rule)",
  victimListedFlag: "Whether any victim was listed in the case",
  pardonVacaturNoLongerCrimeFlag:
    "Whether the case was pardoned, vacated, or based on conduct that is no longer a crime",
  waiverAndReleaseFlag:
    "Whether a General Waiver and Release (CC-DC-CR-078) is being filed to proceed before the 3-year period",
  priorShieldingCheck: "Whether the person has previously used the one-time lifetime shielding petition",
  remedyPreference: "Whether the person needs expungement or whether shielding would be enough as a fallback",
  statesAttorney: "State's Attorney to be served by the court",
  serviceMethod: "Service method"
};
