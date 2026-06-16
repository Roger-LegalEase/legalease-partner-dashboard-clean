// Vermont disqualifying offenses and escalation/blocks. Sourced from the "Vermont
// Expungement & Sealing — Wilma Agent Training Reference" (Nationwide Record
// Clearing), sections 5–10, reflecting the qualifying-crime exclusions, the
// felony-sealing qualifying-list requirement, the DUI/CDL rule, and the pending-
// charge and re-filing rules. Screening notes, not an exhaustive legal test;
// verify the exact current V.S.A. text.
export const vtDisqualifyingOffenseNotes = [
  "Misdemeanor sealing exclusions (qualifying-crime definition): the qualifying-crime definition excludes listed crimes, child sexual exploitation, abuse-prevention/stalking/sexual-assault/protective-order violations, vulnerable-adult abuse/exploitation, voyeurism, animal cruelty, sex-offender-registry failure, hate-motivated crimes, cruelty to a child, mistreatment of persons with impaired cognitive function, female genital mutilation, sexual exploitation of a minor, extreme-risk-protection-order violation, CDL motor-vehicle offenses, and any offense requiring sex-offender registration. Route these to manual review.",
  "Felony sealing is statute-specific (13 V.S.A. § 7602(d); § 7601(4)(B)): do not route a felony as eligible unless the exact statute is on Vermont's qualifying felony list (certain burglary, designated property offenses, certain regulated-drug offenses) or the person has an unconditional pardon from the Governor.",
  "Expungement is narrow (13 V.S.A. § 7602): an ordinary conviction is NOT expungeable unless the underlying conduct is no longer prohibited by law or no longer a criminal offense; otherwise route to sealing analysis.",
  "DUI (13 V.S.A. § 7602(e)): DUI sealing requires 10 years and no CDL/commercial permit; CDL/commercial-permit holders are barred from DUI sealing, and a DUI committed under 25 should be checked under the under-25 route (33 V.S.A. § 5119).",
  "Mixed dockets (13 V.S.A. § 7609): for the age 18–21 route, a record containing both qualifying and nonqualifying offenses is not eligible — flag for manual review.",
  "Pending charges: the court cannot act on a sealing/expungement petition while any criminal charge is pending; always confirm no pending charges before filing.",
  "Denied-petition wait: after a denied petition, the person generally must wait at least 2 years before filing again unless the court authorizes a shorter period.",
  "Escalation categories (legal review): any felony (qualifying-list analysis); domestic violence, stalking, sex, child/vulnerable-adult, protective-order, animal-cruelty, hate-crime, or registration-related offenses; DUI/CDL matters; under-25 rehabilitation showings; pending charges; denied-petition re-filing; and federal, out-of-state, immigration, or firearm-rights questions.",
  "Scope limits: Vermont relief does not erase already-existing private background-check copies, does not clear federal or out-of-state cases, and does not by itself fix immigration consequences; a sealed record is not destroyed and remains available for the statutory exceptions."
];
