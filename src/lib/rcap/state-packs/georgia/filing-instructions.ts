// Georgia filing / application workflow. Sourced from the Georgia Record
// Restriction & Sealing Agent Training Reference (Nationwide Record Clearing),
// section 6, corroborated by the GBI/GCIC and Georgia Courts process guidance.
// Georgia has two distinct processes depending on pathway; this pack is
// shadow-only research and wires no renderer.
export const gaFilingInstructions = [
  "Step one for every Georgia matter: obtain and review the GCIC criminal history to confirm each charge has a final, qualifying disposition and to see whether automatic restriction already occurred.",
  "Non-conviction restriction — agency/prosecutor process (§ 35-3-37(h)): if the arrest was before July 1, 2013, get the GBI Request to Restrict Arrest Record form from the arresting agency; if on or after July 1, 2013, contact the prosecutor to confirm automatic restriction.",
  "Submit the non-conviction application to the arresting agency / prosecutor; the prosecutor completes Section Three (approve or deny). If approved, the prosecutor enters the restriction code in the GCIC CCH interface, or the approved application plus the GCIC processing fee is forwarded to GCIC.",
  "GCIC processes complete applications (typically 2-3 weeks) and mails a completion letter. If the prosecutor denies, appeal to the Superior Court within 30 days.",
  "SB 288 conviction restriction — court process (§ 35-3-37(j)(4)): first confirm eligibility — sentence complete, four conviction-free years, no pending charges, not an excluded offense, and within the two-misdemeanor lifetime cap.",
  "Prepare a Petition for Record Restriction and Sealing citing § 35-3-37(j)(4), attaching the GCIC criminal history and proof of sentence completion, plus a proposed order; file in the Superior or State Court of the county of conviction and pay the county-set filing fee.",
  "Serve the prosecuting attorney, who has 90 days to object; if unopposed the court may grant on the papers, otherwise it holds an interests-of-justice hearing. If granted, the court orders GCIC and the arresting agency to restrict.",
  "Sealing the clerk's file (§ 35-3-37(m)) is a separate, second step: after restriction, file a motion/petition to seal the clerk of court's case file with a proposed sealing order. Do not stop at restriction if the user wants the court record closed too.",
  "Identify the arrest date early — the July 1, 2013 line decides whether non-conviction restriction is automatic (post-2013, no filing) or application-based (pre-2013)."
];
