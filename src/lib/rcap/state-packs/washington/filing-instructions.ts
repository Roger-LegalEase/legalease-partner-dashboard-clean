// Washington filing workflow. Sourced from the "Washington State Record Relief —
// Wilma Agent Training Reference" (Nationwide Record Clearing), section 12,
// corroborated by RCW 9.96.060, 9.94A.640, and 10.97.060 and Washington Courts /
// WSP / Washington LawHelp guidance. Washington uses official Washington Courts
// (CrRLJ/CR/JU) forms and the WSP deletion process; this pack is shadow-only
// research and wires no renderer. Local county superior court rules may require
// additional documents.
export const waFilingInstructions = [
  "Classify the case first: adult conviction (misdemeanor/gross misdemeanor vs. felony class), non-conviction (dismissal/acquittal/no-charge/diversion), Blake drug-possession, cannabis, victim/survivor, juvenile, or treaty Indian fishing-rights. Confirm the court type (district, municipal, superior, or juvenile) and county.",
  "Misdemeanor / gross-misdemeanor vacation: file the petition in the SENTENCING court using CrRLJ 09.0100 (Petition and Declaration for Order Vacating Conviction) and proposed CrRLJ 09.0200 (Order). If the prosecutor agrees, a hearing may not be needed, but local practices vary by county; CrRLJ 09.0150 (Notice of Hearing) and CrRLJ 09.0300 (instructions) support the process.",
  "Felony vacation: confirm discharge under RCW 9.94A.637 (a Certificate of Discharge is usually needed), then file in the sentencing superior court using CR 08.0900 (Motion and Declaration for Order Vacating Record of Felony Conviction) and proposed CR 08.0920 (Order); CR 08.0930 is the information sheet. Serve the prosecutor; a hearing may be required.",
  "Cannabis misdemeanor vacation: use CrRLJ 09.0800 (Petition and Declaration for Order to Vacate Cannabis Conviction) and proposed CrRLJ 09.0870 (Order); the court SHALL vacate if the applicant qualifies (21+ at offense and a qualifying cannabis statute/date).",
  "Non-conviction deletion: use the WSP non-conviction deletion request process for CHRI deletion under RCW 10.97.060 — this is separate from a court vacate order. Dismissal/acquittal information is non-conviction and is not disseminated to the public, but it remains available for criminal-justice inquiries unless deleted under RCW 10.97.060 or by court order.",
  "Blake drug-possession: use the Washington Courts Blake motions and orders to vacate drug-possession convictions, refund paid LFOs, and waive unpaid balances in superior, district, or municipal court, depending on the case.",
  "Victim/survivor vacation: use RCW 9.96.080 (misdemeanor/gross misdemeanor) or RCW 9.94A.648 (Class B/C felony); include the required affidavit proving the victimization connection by a preponderance of the evidence, and route to manual/legal review.",
  "Juvenile sealing: confirm whether the case should have been administratively sealed (scheduled after age 18 / end of probation / parole completion) or requires a motion using JU 10.0300 (Motion and Declaration to Seal), JU 10.0315 (Notice of Respondent's Motion to Seal), and proposed JU 10.0320 (Order) (RCW 13.50.260).",
  "After the order is granted (misdemeanor/gross-misdemeanor vacation): the clerk must immediately transmit the vacation order to WSP and local law enforcement, which update records and send the order to the FBI. Start record collection with the WSP criminal-history record and the court docket.",
  "Treaty Indian fishing-rights conviction: use the separate Washington Courts forms (CrRLJ CR 09.0500 Motion, CrRLJ CR 09.0600 Notice of Hearing, CrRLJ CR 09.0700 Order)."
];
