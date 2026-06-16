// New Hampshire waiting periods. Sourced from the New Hampshire Expungement /
// Annulment Reference for Wilma (Nationwide Record Clearing), sections 3 and 19,
// corroborated by RSA 651:5, RSA 651:5-b, and RSA 265-A:21.
export const nhWaitingPeriodNotes = {
  violation: "Conviction annulment (RSA 651:5): violation — 1 year after all sentence terms completed.",
  classBMisdemeanor: "Conviction annulment (RSA 651:5): Class B misdemeanor — 2 years.",
  classAMisdemeanor: "Conviction annulment (RSA 651:5): Class A misdemeanor — 3 years.",
  classBFelony: "Conviction annulment (RSA 651:5): Class B felony — 5 years.",
  classAFelony: "Conviction annulment (RSA 651:5): Class A felony — 10 years.",
  sexualAssault: "Conviction annulment (RSA 651:5): sexual assault under RSA 632-A:4 — 10 years.",
  indecentExposureLewdness:
    "Conviction annulment (RSA 651:5): felony indecent exposure or lewdness under RSA 645:1, II — 10 years.",
  domesticViolence:
    "Conviction annulment (RSA 651:5): misdemeanor domestic violence under RSA 631:2-b — 10 years.",
  controlledDrugAct:
    "Conviction annulment (RSA 651:5): Class A misdemeanor or felony offense under RSA 318-B:26, II — 2 years.",
  dwi:
    "DWI/DUI-type offense (RSA 265-A:21): special rule — generally a 10-year waiting period after conviction; verify the exact statute.",
  clockStart:
    "Calculate eligibility from the date all terms and conditions of the sentence were completed, unless a special statute (e.g., certain DWI/motor-vehicle rules) calculates differently.",
  favorableOutcomePre2019:
    "Favorable outcome disposed of before January 1, 2019: petition may be filed at any time.",
  favorableOutcomePost2019:
    "Favorable outcome disposed of on/after January 1, 2019: generally annulled 30 days after the not-guilty/dismissed/not-prosecuted finding if no appeal is taken.",
  marijuanaPossession:
    "Marijuana possession (RSA 651:5-b): no waiting period — petition at any time; offense before September 16, 2017 and 3/4 ounce or less; prosecutor has 10 days to object.",
  multipleConvictions:
    "Multiple convictions (RSA 651:5): no annulment until the time requirements for ALL offenses of record have been met and no offense is barred."
};
