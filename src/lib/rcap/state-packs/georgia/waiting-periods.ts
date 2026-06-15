// Georgia waiting periods. Sourced from the Georgia Record Restriction & Sealing
// Agent Training Reference (Nationwide Record Clearing), section 2.
export const gaWaitingPeriodNotes = {
  nonConviction:
    "Non-conviction restriction (§ 35-3-37(h)): generally no waiting period. For arrests on or after July 1, 2013 the record is restricted automatically once the qualifying disposition is entered into GCIC.",
  deadDocket:
    "Dead docket (§ 35-3-37(h)): eligible after the required period on the dead docket has passed.",
  pretrialDiversion:
    "Pretrial diversion (§ 35-3-37(h)): restriction is available on successful completion of the program.",
  sb288:
    "SB 288 misdemeanor conviction (§ 35-3-37(j)(4)): at least four years since the sentence was completed (all jail time served and probation terminated), the person must have no convictions for at least four years before filing, and no pending charges. The four-year window is measured backward from the filing date and is broken by any intervening conviction, which resets the clock.",
  pardonedFelony:
    "Pardoned felony (§ 35-3-37(j)(7)): available after the Board of Pardons and Paroles pardon, provided there is no new offense since the pardon and no pending charges.",
  misdemeanorBefore21:
    "Misdemeanor committed before age 21 (§ 35-3-37): restrictable per statute, subject to exceptions for serious traffic, sexual, and certain other offenses.",
  sb288LifetimeCap:
    "The SB 288 two-misdemeanor cap is a lifetime limit, not per filing: a person who has already restricted two misdemeanor convictions cannot restrict a third.",
  sb288ObjectionWindow:
    "On an SB 288 petition the prosecuting attorney has 90 days to object; if unopposed the court may grant on the papers, otherwise it holds an interests-of-justice hearing.",
  nonConvictionAppeal:
    "If the prosecutor denies a non-conviction restriction application, the person may appeal to the Superior Court within 30 days."
};
