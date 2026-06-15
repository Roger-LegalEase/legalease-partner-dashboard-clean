// Nevada waiting periods. Sourced from the Nevada Record-Sealing Reference for
// Wilma (Nationwide Record Clearing), sections 3-4 and 11-14, corroborated by the
// cited NRS sections. Conviction waits run from release from custody, discharge
// from parole/probation, or release from a suspended sentence, whichever is later.
export const nvWaitingPeriodNotes = {
  // NRS 179.245 conviction sealing
  categoryAFelony: "Conviction sealing (NRS 179.245): Category A felony — 10 years.",
  crimeOfViolence: "Conviction sealing (NRS 179.245): crime of violence — 10 years.",
  residentialBurglary:
    "Conviction sealing (NRS 179.245): residential burglary under NRS 205.060 — 10 years.",
  categoryBCDFelony: "Conviction sealing (NRS 179.245): Category B, C, or D felony — 5 years.",
  categoryEFelony: "Conviction sealing (NRS 179.245): Category E felony — 2 years.",
  grossMisdemeanor: "Conviction sealing (NRS 179.245): gross misdemeanor — 2 years.",
  specialSevenYear:
    "Conviction sealing (NRS 179.245): non-felony Medicaid fraud, non-felony DUI, or non-felony battery domestic violence — 7 years.",
  misdemeanorViolenceCategory:
    "Conviction sealing (NRS 179.245): misdemeanor battery, harassment, stalking, or protection-order violation — 2 years.",
  otherMisdemeanor: "Conviction sealing (NRS 179.245): any other misdemeanor — 1 year.",
  clockStart:
    "The NRS 179.245 waiting-period clock runs from release from actual custody, discharge from parole/probation, or release from a suspended sentence, whichever applies and is later.",
  cleanPeriod:
    "NRS 179.245 clean-period rule: during the waiting period the person must not have pending charges and must not have been convicted of another offense, except minor moving or standing traffic violations.",
  // No-conviction route (NRS 179.255)
  dismissedOrAcquitted:
    "No-conviction route (NRS 179.255): if charges were dismissed or the person was acquitted, a petition may be filed at any time after the dismissal/acquittal.",
  declinedProsecution:
    "No-conviction route (NRS 179.255): if prosecution was declined, file after the statute of limitations runs, 8 years after arrest, or by stipulation.",
  noStipulationObjectionWindow:
    "No-conviction route (NRS 179.255): with no stipulation, if there is no objection within 30 days and the statutory findings are met the court may seal without a hearing; an objection requires a hearing.",
  // Other pathways
  deferredJudgment:
    "Deferred judgment (NRS 176.211): the court must order sealing on successful completion of the deferred-judgment terms, unless the Division/prosecutor petitions for good cause not to seal.",
  probationSpecialtyDomesticOrDui:
    "Probation / specialty routes (NRS 176A.245, 176A.265, 176A.295): certain domestic-battery or DUI-related charges may require waiting 7 years after the conditional dismissal or set-aside before filing a petition.",
  reentryProgram:
    "Reentry program sealing (NRS 179.259): available 4 years after completion of a qualifying reentry program for a single nonviolent felony.",
  decriminalizedObjectionWindow:
    "Decriminalized offense (NRS 179.271): the prosecutor has 10 judicial days to object; if no objection, the court must grant; no fee may be charged.",
  controlledSubstance:
    "Controlled-substance possession not for sale (NRS 453.3365): the court may seal 3 years after conviction and sentencing if all terms are completed and the court finds rehabilitation after a hearing."
};
