// Rhode Island waiting periods. Sourced from the "Rhode Island Expungement /
// Sealing Reference for Wilma" (Nationwide Record Clearing), sections 2 and 15,
// corroborated by R.I. Gen. Laws §§ 12-1.3-2, 12-1.3-3, 12-19-19, 12-1-12.1,
// 12-10-12, 12-1.3-5, 11-34.1-5.
export const riWaitingPeriodNotes = {
  firstOffenderMisdemeanorFiveYear:
    "First-offender single misdemeanor conviction expungement (§ 12-1.3-2): 5 years from completion of sentence.",
  firstOffenderFelonyTenYear:
    "First-offender single felony conviction expungement (§ 12-1.3-2): 10 years from completion of sentence.",
  clockStart:
    "Calculate the first-offender waiting period from completion of sentence, not from the arrest or conviction date.",
  multipleMisdemeanorTenYear:
    "Multiple-misdemeanor expungement (§ 12-1.3-3): 10 years after completion of the LAST sentence, with no felony/misdemeanor arrest or conviction in the 10 years before filing (more than one but fewer than six misdemeanors, no felony).",
  multipleMisdemeanorExclusions:
    "Multiple-misdemeanor exclusions (§ 12-1.3-3): domestic violence under Title 12 ch. 29, DUI (§ 31-27-2), and chemical-test refusal (§ 31-27-2.1) are excluded from this path — escalate for exact statutory review.",
  deferredImmediate:
    "Deferred-sentence expungement (§ 12-19-19; § 12-1.3-2(e)): immediately eligible for consideration after the court finds, following a hearing, compliance with all terms of the deferral agreement (including fines, fees, costs, assessments, and restitution). Not automatic.",
  nonConvictionSealing:
    "Non-conviction sealing/destruction (§ 12-1-12 / § 12-1-12.1): ID records are generally destroyed within 60 days after acquittal, dismissal, no true bill, no information, or other exoneration; court/BCI records are sealed.",
  rule48aAutomatic:
    "District Court Rule 48(a) dismissals ON OR AFTER January 1, 2023: court automatically seals not less than 10 and not more than 20 days after dismissal.",
  rule48aPre2023:
    "District Court Rule 48(a) dismissals BEFORE January 1, 2023: clerk administratively seals at the defendant's request; the order is sent electronically to BCI and carried out within 90 days of receipt.",
  filedComplaint:
    "Filed-complaint expungement (§ 12-10-12): automatic expungement if no action is taken during the filing period; for domestic-violence filings, expungement if no new DV charge during the 3-year period after filing (or such a charge is dismissed or results in acquittal).",
  marijuanaAutomatic:
    "Marijuana possession-only automatic expungement (§ 12-1.3-5): no waiting period — entitled to automatic expungement; eligible records were to be expunged before July 1, 2024, with an expedited procedure available; amount presumed 2 oz. or less if unstated.",
  commercialSexualActivityOneYear:
    "Commercial-sexual-activity relief (§ 11-34.1-5): one year after completion of sentence; the court may grant regardless of first-offender status.",
  noticeTenDay:
    "Notice: for conviction expungement (and a motion to seal), the filer must give notice of the hearing date to the Rhode Island Department of Attorney General and the charging police department at least 10 days before the hearing; the clerk fills in the hearing date.",
  financialObligations:
    "Financial obligations: all court-imposed or court-related fines, fees, costs, assessments, charges, and restitution must be paid, waived, or reduced by court order (except eligible marijuana amounts under § 12-1.3-5, which are waived)."
};
