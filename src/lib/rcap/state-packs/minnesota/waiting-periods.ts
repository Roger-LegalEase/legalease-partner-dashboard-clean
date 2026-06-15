// Minnesota waiting periods. Sourced from the Minnesota Expungement Reference
// for Wilma (Nationwide Record Clearing), sections 3-4, corroborated by Minn.
// Stat. §§ 609A.02 and 609A.015.
export const mnWaitingPeriodNotes = {
  // Petition eligibility (§ 609A.02)
  petitionResolvedInFavor:
    "Resolved in favor of the person (§ 609A.02, subd. 3(a)(1)): petition available with no fixed waiting period; note that not guilty by reason of mental illness is NOT a resolution in favor.",
  petitionDiversionStay:
    "Diversion or stay of adjudication (§ 609A.02): petition available after successful completion with no new crime charged for at least 1 year after completion.",
  petitionPettyOrMisdemeanor:
    "Petty-misdemeanor or misdemeanor conviction (§ 609A.02): petition available after no new conviction for at least 2 years after discharge of the sentence.",
  petitionGrossMisdemeanor:
    "Gross-misdemeanor conviction (§ 609A.02): petition available after no new conviction for at least 3 years after discharge.",
  petitionFelony:
    "Certain listed felonies (§ 609A.02, subd. 3(b)): petition available 4 or 5 years after discharge depending on the offense; verify the exact statute is on the eligible list.",
  // Automatic Clean Slate (§ 609A.015)
  automaticPettyMisdemeanor: "Automatic Clean Slate (§ 609A.015): petty misdemeanor — 2 years after discharge.",
  automaticMisdemeanor: "Automatic Clean Slate (§ 609A.015): misdemeanor — 2 years after discharge.",
  automaticGrossMisdemeanor: "Automatic Clean Slate (§ 609A.015): gross misdemeanor — 3 years after discharge.",
  automaticFelonyControlledSubstance:
    "Automatic Clean Slate (§ 609A.015): fifth-degree controlled-substance felony under § 152.025 — 4 years after discharge.",
  automaticOtherFelony:
    "Automatic Clean Slate (§ 609A.015): other qualifying felony — 5 years after discharge.",
  automaticConditions:
    "Automatic Clean Slate also requires no disqualifying new conviction and that the person is not charged at the time eligibility is reviewed.",
  diversionAutomatic:
    "Diversion or stay of adjudication, automatic (§ 609A.015): certain nonfelony cases qualify after successful completion and at least 1 year without a new charge/conviction, except petty misdemeanors.",
  // Process timing
  hearingTiming:
    "Petition hearing (§ 609A.03): may not be held sooner than 60 days after service; Minnesota Courts guidance schedules the hearing at least 63 days after service, and the overall process usually takes at least 4-6 months.",
  orderStay:
    "Granted order (§ 609A.03): generally stayed for 60 days after filing and during any appeal period before it takes effect."
};
