import type { EngineProfile } from "@/lib/rcap-engine/contracts";

// Information only: no inference that court conditions are satisfied, that a
// generic offense level is the highest charge, or that Chapter 24-14 applies.
// Five years/no further conviction for public removal are distinct from the
// public pardon certificate's five-year period; neither is a generic debt rule.
export const SD_GUIDANCE_FINANCIAL_ROUTES = ["automatic-public-record-removal-for-petty-municipal-and-class-2-misdemeanor-cases", "pardon-based-sealing"] as const;
const EXPECTED = {
  "automatic-public-record-removal-for-petty-municipal-and-class-2-misdemeanor-cases": {
    "id": "automatic-public-record-removal-for-petty-municipal-and-class-2-misdemeanor-cases",
    "sourceRef": "section:101-111; section:15-26; pathways:15-26; corpus-unit:10; corpus-unit:40",
    "ruleClauses": [
      "South Dakota automatically removes certain minor cases from the public record after five years if all court-ordered conditions are satisfied and the person has no further convictions during that five-year period. This applies when the highest charged offense in the case was a petty offense, municipal ordinance violation, or Class 2 misdemeanor. (\"https://law.justia.com/codes/south-dakota/title-23a/chapter-03/section-23a-3-34/\")",
      "The record is not gone for every purpose. It remains available to court personnel or by court order and may be used to enhance a penalty for a later criminal offense. (\"https://law.justia.com/codes/south-dakota/title-23a/chapter-03/section-23a-3-34/\")",
      "possible_auto_public_record_removal_minor_offense_5_years",
      "not_eligible_minor_auto_removal_conditions_unpaid",
      "not_eligible_minor_auto_removal_new_conviction",
      "record_may_still_enhance_later_offense",
      "Some low-level South Dakota cases are removed from public view after five years if the case was only a petty offense, municipal ordinance violation, or Class 2 misdemeanor, all conditions were completed, and there were no new convictions. But the record may still be used by the court or to enhance later penalties.",
      "Pathway Main authority Best used for",
      "Arrest record expungement SDCL 23A-3-26 to 23A-3-32 No accusatory instrument, dismissal, acquittal",
      "Diversion expungement SDCL 23A-3-35 to 23A-3-37 Successful diversion completion",
      "Automatic public-record removal for minor cases SDCL 23A-3-34 Petty offense, municipal ordinance, or Class 2 misdemeanor highest charge",
      "Suspended imposition sealing SDCL 23A-27-13 to 23A-27-17 Successful suspended imposition of sentence",
      "Drug deferred/special dismissal route SDCL 23A-27-53 Certain controlled-substance cases after treatment/compliance",
      "Pardon sealing SDCL 24-14-11 Governor\u0019s pardon through Chapter 24-14 process",
      "Juvenile delinquency sealing SDCL 26-7A-115 to 26-7A-116 Juvenile records after statutory waiting and rehabilitation showing",
      "Juvenile trafficking expungement SDCL 26-7A-115.1 Delinquency records caused by trafficking or sexual exploitation",
      "Pathway Main authority Best used for Arrest record expungement SDCL 23A-3-26 to 23A-3-32 No accusatory instrument, dismissal, acquittal Diversion expungement SDCL 23A-3-35 to 23A-3-37 Successful diversion completion Automatic public-record removal for minor cases SDCL 23A-3-34 Petty offense, municipal ordinance, or Class 2 misdemeanor highest charge Suspended imposition sealing SDCL 23A-27-13 to 23A-27-17 Successful suspended imposition of sentence Drug deferred/special dismissal route SDCL 23A-27-53 Certain controlled-substance cases after treatment/compliance Pardon sealing SDCL 24-14-11 Governor\u0019s pardon through Chapter 24-14 process Juvenile delinquency sealing SDCL 26-7A-115 to 26-7A-116 Juvenile records after statutory waiting and rehabilitation showing Juvenile trafficking expungement SDCL 26-7A-115.1 Delinquency records caused by trafficking or sexual exploitation",
      "Automatic public-record removal for petty, municipal, and Class 2 misdemeanor cases South Dakota automatically removes certain minor cases from the public record after five years if all court-ordered conditions are satisfied and the person has no further convictions during that five-year period."
    ],
    "automatic": true,
    "filingRequired": false,
    "routeType": "automatic",
    "waitingRules": [
      "South Dakota automatically removes certain minor cases from the public record after five years if all court-ordered conditions are satisfied and the person has no further convictions during that five-year period. This applies when the highest charged offense in the case was a petty offense, municipal ordinance violation, or Class 2 misdemeanor. (\"https://law.justia.com/codes/south-dakota/title-23a/chapter-03/section-23a-3-34/\")",
      "Some low-level South Dakota cases are removed from public view after five years if the case was only a petty offense, municipal ordinance violation, or Class 2 misdemeanor, all conditions were completed, and there were no new convictions. But the record may still be used by the court or to enhance later penalties.",
      "Arrest occurred, but no accusatory instrument was filed After 1 year from arrest",
      "Prosecutor formally dismissed the entire criminal case After 1 year from formal dismissal",
      "Prosecutor formally dismissed the entire criminal case and there is compelling necessity Within 1 year from dismissal, if compelling necessity is shown",
      "not_eligible_yet_waiting_period",
      "South Dakota has a special diversion path. A person who successfully completes a diversion program may be eligible for expungement of the entire criminal record related to the arrest if they are not charged with a new crime, other than petty offenses and minor traffic violations, within one year and thirty days after successful completion. (\"https://law.justia.com/codes/south-dakota/title-23a/chapter-03/section-23a-3-35/\")",
      "If you completed a South Dakota diversion program and stayed clear of new charges for one year and thirty days, the State\u0019s Attorney should file the dismissal and diversion-completion notice, and the court should grant expungement without a separate motion.",
      "South Dakota has a special deferred route for certain drug charges under SDCL 23A-27-53. For a guilty plea to specified controlled-substance offenses, the court may defer sentencing and require probation, treatment, testing, service, or other conditions. After one year, if the person completed treatment and all required conditions, the court must dismiss the original charge under the listed drug statutes when the person pleads guilty to the specified lesser offense. The statute also says the person is not eligible if there are aggravating circumstances or if the person is serving a sentence with the executive branch. (\"https://law.justia.com/codes/south-dakota/title-23a/chapter-27/section-23a-27-53/\")",
      "A South Dakota pardon through Chapter 24-14 releases the person from penalties and disabilities resulting from the offense. When the Governor grants a pardon under that chapter, the Governor orders official records relating to the arrest, charging document, trial, finding of guilt, pardon application, and Board of Pardons and Paroles proceedings sealed. A public document certifying the pardon remains filed with the Secretary of State for five years, then is sealed. (\"https://law.justia.com/codes/south-dakota/title-24/chapter-14/section-24-14-11/\")",
      "A juvenile, parent, guardian, or guardian ad litem may petition to seal juvenile delinquency records. The petition may be filed only after one year has passed from the juvenile\u0019s unconditional release from court jurisdiction or Department of Corrections discharge, whichever is later. The court may seal records if the child has not been adjudicated delinquent since release/discharge, has no pending or instituted serious proceeding of the types listed in the statute, and the court finds rehabilitation has been attained. (\"https://law.justia.com/codes/south-dakota/title-26/chapter-07a/section-26-7a-115/\")",
      "not_eligible_juvenile_waiting_period",
      "Juvenile delinquency sealing SDCL 26-7A-115 to 26-7A-116 Juvenile records after statutory waiting and rehabilitation showing",
      "Pathway Main authority Best used for Arrest record expungement SDCL 23A-3-26 to 23A-3-32 No accusatory instrument, dismissal, acquittal Diversion expungement SDCL 23A-3-35 to 23A-3-37 Successful diversion completion Automatic public-record removal for minor cases SDCL 23A-3-34 Petty offense, municipal ordinance, or Class 2 misdemeanor highest charge Suspended imposition sealing SDCL 23A-27-13 to 23A-27-17 Successful suspended imposition of sentence Drug deferred/special dismissal route SDCL 23A-27-53 Certain controlled-substance cases after treatment/compliance Pardon sealing SDCL 24-14-11 Governor\u0019s pardon through Chapter 24-14 process Juvenile delinquency sealing SDCL 26-7A-115 to 26-7A-116 Juvenile records after statutory waiting and rehabilitation showing Juvenile trafficking expungement SDCL 26-7A-115.1 Delinquency records caused by trafficking or sexual exploitation",
      "Automatic public-record removal for petty, municipal, and Class 2 misdemeanor cases South Dakota automatically removes certain minor cases from the public record after five years if all court-ordered conditions are satisfied and the person has no further convictions during that five-year period."
    ],
    "legalAuthority": null,
    "lawrenceRatification": null
  },
  "pardon-based-sealing": {
    "id": "pardon-based-sealing",
    "sourceRef": "section:137-148; corpus-unit:56",
    "ruleClauses": [
      "A South Dakota pardon through Chapter 24-14 releases the person from penalties and disabilities resulting from the offense. When the Governor grants a pardon under that chapter, the Governor orders official records relating to the arrest, charging document, trial, finding of guilt, pardon application, and Board of Pardons and Paroles proceedings sealed. A public document certifying the pardon remains filed with the Secretary of State for five years, then is sealed. (\"https://law.justia.com/codes/south-dakota/title-24/chapter-14/section-24-14-11/\")",
      "A pardon still may count as a prior conviction for later sentencing, habitual-offender proceedings, and later DUI sentencing. DCI retains a nonpublic record for use by law enforcement, prosecutors, and courts. (\"https://law.justia.com/codes/south-dakota/title-24/chapter-14/section-24-14-11/\")",
      "The South Dakota Department of Corrections explains that only the Governor can grant a pardon, the Board of Pardons and Paroles reviews applications and makes recommendations, and South Dakota law does not allow sealing unless the pardon goes through the Chapter 24-14 Board process. (\"https://docpardon.sd.gov/faq.aspx\")",
      "possible_pardon_sealing_chapter_24_14",
      "pardon_still_counts_for_later_sentencing",
      "needs_board_process_for_sealing",
      "A South Dakota pardon can lead to sealing, but only if it goes through the Chapter 24-14 pardon process. A pardon does not erase the case for every purpose, and it can still count as a prior conviction in later sentencing situations.",
      "Pardon-based sealing A South Dakota pardon through Chapter 24-14 releases the person from penalties and disabilities resulting from the offense."
    ],
    "automatic": true,
    "filingRequired": false,
    "routeType": "automatic_guidance",
    "waitingRules": [
      "event-triggered by issuance of a qualifying Chapter 24-14 pardon; no additional post-pardon waiting period applies"
    ],
    "legalAuthority": {
      "decisionId": "LD-SD-01",
      "ruleId": "SD-24-14-11-PARDON-EVENT-SEALING",
      "mechanism": "Pardon-based sealing",
      "statute": "S.D. Codified Laws § 24-14-11",
      "stage": "automatic",
      "outcomeMode": "guidance_status",
      "paymentAuthority": "closed",
      "timing": {
        "kind": "event_trigger",
        "anchorText": "event-triggered by issuance of a qualifying Chapter 24-14 pardon; no additional post-pardon waiting period applies"
      },
      "requiredFacts": [
        "Pardon order/date?",
        "Issuing authority?",
        "Exact conviction?",
        "Whether pardon was under Chapter 24-14?",
        "Record-sealing status?",
        "Other counts?"
      ],
      "screeningFactIds": [
        "case_outcome"
      ],
      "exclusions": [
        "Pardon granted under the South Dakota chapter that carries statutory sealing",
        "Exact conviction and pardon scope verified"
      ],
      "packetFamily": null,
      "notes": "A pardon obtained outside the covered chapter, or out of state, does not automatically receive the same sealing effect and must be routed to legal review rather than checkout."
    },
    "lawrenceRatification": null
  }
} as const;

export function southDakotaGuidanceFinancialContract(profile: EngineProfile, pathwayId: string | null | undefined): boolean {
  if (profile.jurisdiction.code !== "SD" || !pathwayId || !Object.hasOwn(EXPECTED, pathwayId)
    || profile.profileVersion !== "2026-06-19-source-conversion-1"
    || profile.source?.sourceCorpusSha256 !== "9751a66fc4ad5ef892db26209da7a07121035065b07f216db1bfa6689c6f1100") return false;
  const question = profile.questions.find(q => q.id === "financial_obligations");
  if (question?.type !== "yes_no_unsure" || question.required !== true
    || question.prompt !== "Have you paid off everything the court charged?"
    || question.helperText !== "fines, court costs, restitution") return false;
  const route = profile.pathways.find(p => p.id === pathwayId);
  return Boolean(route && Object.entries(EXPECTED[pathwayId as keyof typeof EXPECTED]).every(([key, value]) =>
    JSON.stringify((route as unknown as Record<string, unknown>)[key] ?? null) === JSON.stringify(value)));
}

/** No payment-completeness prerequisite to these two informational dispositions.
 * Preserve court conditions, highest charge, timing, subsequent convictions and pardon scope. */
export function southDakotaGuidanceFinancialApplies(profile: EngineProfile, pathwayId: string | null | undefined,
  _answers: Readonly<Record<string, unknown>>, id: string): boolean {
  return id !== "financial_obligations" || !southDakotaGuidanceFinancialContract(profile, pathwayId);
}
