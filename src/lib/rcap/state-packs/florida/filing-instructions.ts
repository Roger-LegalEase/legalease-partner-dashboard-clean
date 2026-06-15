// Florida filing workflow. Sourced from the Florida Wilma Agent Training
// Reference (Nationwide Record Clearing), section 14, corroborated by FDLE
// process pages and Fla. Stat. §§ 943.0585 / 943.059. The normal route is a
// two-stage process: FDLE Certificate of Eligibility first, then a court
// petition. This pack is shadow-only research and wires no renderer.
export const flFilingInstructions = [
  "Step 1 — Get the record: obtain the FDLE personal review / criminal history (FDLE charges no fee for a personal review), a clerk-certified disposition for each charge, arresting agency name, arrest or Notice to Appear date, charge name and statute, final disposition, proof of supervision/probation termination, and diversion-completion proof if applicable.",
  "Step 2 — Determine route (outcome-first): no charge / dismissal / acquittal points to an expunction check; a withhold of adjudication points to a sealing check; adjudicated guilty is usually ineligible for the normal route; and trafficking / self-defense / juvenile / mistaken-arrest facts point to the special routes.",
  "Step 3 — Apply to FDLE: for normal sealing/expunction, submit the FDLE Application for Certificate of Eligibility with a certified disposition, fingerprints, a signature notarized (or before a deputy clerk), and the $75 nonrefundable processing fee. Expunction also requires the State Attorney / Statewide Prosecutor certified-statement page.",
  "Step 4 — File in court: after FDLE issues the certificate, file the Petition to Seal or Expunge, the sworn statement/affidavit, the certificate, and a proposed order in the court with jurisdiction over the arrest (usually the county where the arrest occurred). The certificate is not the final step and does not guarantee relief.",
  "Step 5 — Serve required parties: serve the petition on the appropriate State Attorney or Statewide Prosecutor and the arresting agency; the State and arresting agency may respond.",
  "Step 6 — Order distribution: if granted, the clerk certifies the order to the State Attorney / Statewide Prosecutor and the arresting agency; the arresting agency forwards it to other agencies that received the record, and FDLE forwards the order to the FBI.",
  "Special routes use their own FDLE applications and do not follow the normal certificate-then-petition packet: human-trafficking victim expunction (§ 943.0583) is filed in a court in the circuit of arrest with no clerk fee; lawful self-defense (§ 943.0578) uses the FDLE self-defense process with prosecutor certification; juvenile diversion (§ 943.0582) and early juvenile (§ 943.0515) use their own FDLE applications; administrative expunction (§ 943.0581) runs through FDLE with arresting-agency or State Attorney endorsement."
];
