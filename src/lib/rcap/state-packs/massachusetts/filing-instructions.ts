// Massachusetts filing workflow. Sourced from the Massachusetts Sealing &
// Expungement — Wilma Agent Training Reference (Nationwide Record Clearing),
// sections 9-11, corroborated by M.G.L. c. 276, §§ 100A-100K and Mass.gov / Trial
// Court guidance. Massachusetts uses official Trial Court / Probation Service
// forms; this pack is shadow-only research and wires no renderer.
export const maFilingInstructions = [
  "Get the record first: tell users to obtain their Massachusetts CORI through iCORI. The CORI report is the baseline for deciding whether the case is a conviction, dismissal, nolle prosequi, CWOF, juvenile matter, or another disposition, and its level (misdemeanor/felony).",
  "Route by disposition: conviction -> sealing first (expungement only if narrow criteria fit); not guilty/no bill/no probable cause -> § 100C sealing; dismissal/nolle -> § 100C court sealing (substantial-justice finding); juvenile/youthful offender -> § 100B sealing first, then time-based expungement only if strict criteria fit; pending -> no route yet (manual/legal review).",
  "Conviction sealing: complete the Petition to Seal Conviction Records and file with the Massachusetts Probation Service / Office of the Commissioner of Probation (1 Ashburton Place, Room 405, Boston, MA 02108).",
  "Dismissal / nolle prosequi sealing: file the Petition to Seal Criminal Records for Nolle Prosequi or Dismissal with the COURT, not just the Commissioner of Probation. District Court cases are filed at the clerk's office where the case started; Boston Municipal Court cases are filed in the BMC division where the person lives (or, if no longer in BMC territory, the BMC division where the most recent eligible record is from).",
  "Time-based expungement: use the Petition to Expunge Form (Massachusetts Probation Service) and send it to the Commissioner of Probation; the Commissioner certifies eligibility under §§ 100I/100J and notifies the DA, and the court decides on the best interests of justice.",
  "Non-time-based expungement (§ 100K): use the Petition for Expungement Form and file in the court connected to the record (false ID, identity theft, error, fraud, or an offense no longer criminal).",
  "Marijuana-only expungement: use the Petition for Expungement of Marijuana Offenses Form and file in the court that handled the case, after verifying the record was marijuana-only and the conduct is now decriminalized/legalized.",
  "Confirm the facts before claiming eligibility: collect full name and prior names, DOB, docket number, court, offense name/statute, disposition and date, sentence/probation/parole/custody completion date, pending charges, new convictions during the waiting period, out-of-state/federal records, and whether the offense involved sex-offender registration, firearms, domestic violence, OUI, serious injury, a dangerous weapon, an elderly/disabled victim, or a restraining-order violation."
];
