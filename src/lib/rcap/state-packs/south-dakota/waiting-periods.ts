// South Dakota waiting periods. Sourced from the South Dakota Expungement
// Reference for Wilma (Nationwide Record Clearing), sections 4, 7, 8, 9, 10, 12,
// corroborated by SDCL §§ 23A-3-27, 23A-3-34, 23A-3-35, 23A-27-13, 23A-27-53,
// 26-7A-115.
export const sdWaitingPeriodNotes = {
  arrestNoAccusatoryInstrument:
    "Adult arrest expungement (§ 23A-3-27): if an arrest occurred but no accusatory instrument was filed, apply after 1 year from the arrest.",
  arrestFormalDismissal:
    "Adult arrest expungement (§ 23A-3-27): if the prosecutor formally dismissed the entire criminal case, apply after 1 year from the formal dismissal.",
  arrestAcquittal:
    "Adult arrest expungement (§ 23A-3-27): if the person was acquitted, apply any time after acquittal — no waiting period.",
  arrestCompellingNecessity:
    "Adult arrest expungement (§ 23A-3-27): if the entire case was formally dismissed and there is compelling necessity, apply within 1 year from dismissal — route to attorney review for the compelling-necessity showing.",
  serviceOnStatesAttorney:
    "Adult arrest expungement (§ 23A-3-27): serve the motion on the prosecuting attorney (State's Attorney) at least 14 days before the hearing; the prosecutor may contest.",
  diversionWait:
    "Diversion expungement (§§ 23A-3-35 to 23A-3-37): eligible after one year and thirty days from successful diversion completion if no new crime (other than petty offenses / minor traffic) occurs in that window; the court then grants expungement without a motion.",
  minorCaseFiveYear:
    "Automatic minor-case removal (§ 23A-3-34): petty offense, municipal ordinance violation, or Class 2 misdemeanor cases are removed from the public record after 5 years if all conditions are satisfied and there are no new convictions during the 5-year period.",
  sisDischarge:
    "Suspended imposition of sentence sealing (§§ 23A-27-13 to 23A-27-17): sealing follows discharge and dismissal after completing all SIS conditions; once per felony and once per misdemeanor (no second felony SIS if one was already used).",
  drugDeferredOneYear:
    "Controlled-substance deferred route (§ 23A-27-53): after one year, if treatment and all required conditions are completed, the court must dismiss the original charge on the plea to the specified lesser offense; not available with aggravating circumstances or while serving an executive-branch sentence.",
  pardonProcess:
    "Pardon-based sealing (§ 24-14-11 / Chapter 24-14): no fixed statutory wait in the reference — sealing depends on completing the Governor's pardon through the Chapter 24-14 Board of Pardons and Paroles process; the public pardon certificate stays with the Secretary of State for five years, then is sealed.",
  juvenileOneYear:
    "Juvenile delinquency sealing (§§ 26-7A-115 to 26-7A-116): petition may be filed only after 1 year from the juvenile's unconditional release from court jurisdiction or DOC discharge, whichever is later, with no later adjudication, no pending serious proceeding, and a rehabilitation showing.",
  dciRetention:
    "Across the SIS, pardon, and arrest routes, DCI retains a nonpublic disposition record for law enforcement, prosecutors, and courts (later sentencing, habitual-offender, and future-eligibility determinations) even after the public record is sealed."
};
