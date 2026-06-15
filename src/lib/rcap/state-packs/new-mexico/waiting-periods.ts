// New Mexico waiting periods. Sourced from the New Mexico Expungement Reference
// for Wilma (Nationwide Record Clearing), sections 5 and 8-10, corroborated by
// NMSA 1978 §§ 29-3A-4, 29-3A-5(C)(4), 29-3A-8, and 29-3A-9.
export const nmWaitingPeriodNotes = {
  // Identity theft (§ 29-3A-3)
  identityTheft:
    "Identity theft (§ 29-3A-3): no fixed waiting period; after a hearing showing the person is a victim of identity theft, the court must order expungement within 30 days.",
  // Release without conviction (§ 29-3A-4)
  releaseWithoutConviction:
    "Release without conviction (§ 29-3A-4): file 1 year after the final disposition; attach a DPS record of arrest and prosecutions dated no earlier than 90 days before filing; the court must order expungement within 30 days of the hearing if no other charge/proceeding is pending.",
  // Conviction expungement (§ 29-3A-5(C)(4)) — measured from the last sentence-completion date in any jurisdiction
  convictionMunicipalOrdinance: "Conviction (§ 29-3A-5): municipal-ordinance conviction — 2 years.",
  convictionMisdemeanor: "Conviction (§ 29-3A-5): misdemeanor not otherwise listed — 2 years.",
  convictionAggravatedBattery:
    "Conviction (§ 29-3A-5): misdemeanor aggravated battery under § 30-3-5(B) — 4 years.",
  convictionFourthDegreeFelony: "Conviction (§ 29-3A-5): fourth-degree felony not otherwise listed — 4 years.",
  convictionThirdDegreeFelony: "Conviction (§ 29-3A-5): third-degree felony not otherwise listed — 6 years.",
  convictionSecondDegreeFelony: "Conviction (§ 29-3A-5): second-degree felony not otherwise listed — 8 years.",
  convictionFirstDegreeFelony: "Conviction (§ 29-3A-5): first-degree felony — 10 years.",
  convictionHouseholdMemberAct:
    "Conviction (§ 29-3A-5): Crimes Against Household Members Act offense — 10 years.",
  convictionClockStart:
    "The conviction waiting period is measured from the last date the person completed a sentence for a conviction in any jurisdiction; fines/fees owed to the state and victim restitution must also be paid before filing.",
  // Cannabis (§§ 29-3A-8, 29-3A-9)
  cannabisAutomatic:
    "Cannabis automatic expungement (§ 29-3A-8): public records are automatically expunged 2 years after the conviction date, or 2 years after the arrest date if there was no conviction; for minors, retained 2 years or until age 18 (whichever is first), then expunged.",
  cannabisSentenceReview:
    "Cannabis sentence dismissal / vacatur (§ 29-3A-9): a currently or formerly incarcerated person may petition at any time to modify the sentence or vacate the conviction; no fee or cost may be imposed for sentence review under this section.",
  // DNA (§ 29-16-10)
  dnaNoFelonyWithinOneYear:
    "DNA expungement (§ 29-16-10): where an arrest did not result in a felony charge within one year, a sworn affidavit to that effect supports the request (along with certified disposition documents for other qualifying outcomes)."
};
