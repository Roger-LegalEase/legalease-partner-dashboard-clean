// Vermont waiting periods. Sourced from the "Vermont Expungement & Sealing — Wilma
// Agent Training Reference" (Nationwide Record Clearing), the routing table and
// section 16, corroborated by 13 V.S.A. §§ 7602, 7609, 7601–7611, 23 V.S.A.
// § 1201(a), and 33 V.S.A. § 5119. Citations are V.S.A. unless otherwise noted.
export const vtWaitingPeriodNotes = {
  expungementConductNoLongerCriminal:
    "Adult conviction expungement (13 V.S.A. § 7602): available after sentence/supervision is complete and restitution/surcharges are paid (or waived), but only where the underlying conduct is no longer a crime. No fixed years-based wait beyond sentence completion.",
  misdemeanorSealing:
    "Qualifying misdemeanor sealing (13 V.S.A. § 7602(c)): 3 years after completion of sentence terms and conditions, restitution/surcharges paid or waived.",
  felonySealing:
    "Qualifying felony sealing (13 V.S.A. § 7602(d); § 7601(4)(B)): 7 years after completion of sentence terms and conditions, restitution/surcharges paid or waived, only for listed felony categories or an unconditional pardon.",
  duiSealing:
    "DUI sealing (13 V.S.A. § 7602(e)): 10 years after sentence completion, no CDL/commercial permit; a DUI committed under age 25 may use the under-25 route (33 V.S.A. § 5119) instead.",
  nonConvictionSealing:
    "Non-conviction sealing: the court should seal within 60 days after final disposition (no probable cause at arraignment, dismissal before trial, or acquittal) unless a party objects; a petition or prosecutor stipulation may also be filed at any time.",
  youngAdult18To21:
    "Young adult sealing — age 18–21 (13 V.S.A. § 7609): 30 days after completing the sentence for a qualifying crime, restitution/surcharges paid or waived.",
  under25:
    "Under-25 sealing (33 V.S.A. § 5119(g)): 2 years after final discharge, plus no listed-crime conviction/adjudication in the prior 10 years, no pending listed-crime proceeding, and rehabilitation shown.",
  juvenile:
    "Juvenile delinquency sealing (33 V.S.A. § 5119): generally 2 years after final discharge for adjudications on/after July 1, 1996; dismissed juvenile matters sealed immediately (charged on/after July 1, 2006 and before age of majority) or after 2 years for older dismissed cases.",
  deniedPetition:
    "After a denied petition: the person generally must wait at least 2 years before filing another petition unless the court authorizes a shorter period.",
  pendingCharge:
    "Pending charge: the court cannot act on a sealing/expungement petition until any pending criminal charge is resolved."
};
