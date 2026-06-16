// Washington waiting periods. Sourced from the "Washington State Record Relief —
// Wilma Agent Training Reference" (Nationwide Record Clearing), section 11,
// corroborated by RCW 9.96.060, 9.94A.640, 10.97.060, and 13.50.260. Citations are
// RCW.
export const waWaitingPeriodNotes = {
  misdemeanorVacation:
    "Ordinary misdemeanor/gross-misdemeanor vacation (RCW 9.96.060): 3 years from the later of release from supervision/probation, release from confinement, or sentencing date, with no new conviction in the prior 3 years.",
  dvMisdemeanorVacation:
    "Domestic violence misdemeanor/gross-misdemeanor vacation (RCW 9.96.060): 5 years after completing original sentence conditions, including treatment, excluding payment of financial obligations; plus the DV-specific disclosure and prior-conviction checks.",
  felonyClassBVacation:
    "Felony Class B vacation (RCW 9.94A.640): 10 years from the latest of release from community custody, release from confinement, or sentencing date, with no new conviction in the prior 10 years.",
  felonyClassCVacation:
    "Felony Class C vacation (RCW 9.94A.640): 5 years from the latest release/sentencing trigger, with no new conviction in the prior 5 years.",
  felonyClassA:
    "Class A felonies are not available under the normal RCW 9.94A.640 vacation route.",
  nonConvictionDeletionFavorable:
    "Non-conviction deletion (RCW 10.97.060): 2 years after a favorable disposition.",
  nonConvictionDeletionNoConviction:
    "Non-conviction deletion (RCW 10.97.060): 3 years from arrest/citation/warrant where no conviction was obtained, unless the person is a fugitive or the case is under active prosecution.",
  cannabisVacation:
    "Misdemeanor cannabis vacation (RCW 9.96.060): no ordinary waiting period stated in the cannabis subsection if the applicant qualifies (21+ at offense, qualifying cannabis statute).",
  blakeVacatur:
    "Blake drug-possession vacatur: not a normal waiting-period route — eligibility is based on the void-conviction category, not elapsed time.",
  juvenileAdministrativeSealing:
    "Juvenile administrative sealing (RCW 13.50.260): scheduled after the latest of the 18th birthday, anticipated end of probation, or anticipated release/completion of parole.",
  juvenileMotionClassA:
    "Juvenile Class A motion sealing (RCW 13.50.260): 5 consecutive years in the community, plus the additional statutory requirements.",
  juvenileMotionOther:
    "Juvenile Class B/C, gross-misdemeanor, misdemeanor, and diversion sealing (RCW 13.50.260): 2 consecutive years in the community, plus the additional statutory requirements."
};
