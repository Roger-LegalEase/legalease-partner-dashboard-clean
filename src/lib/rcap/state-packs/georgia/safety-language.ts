// Georgia safety / plain-language. Sourced from the Georgia Agent Training
// Reference (Nationwide Record Clearing): the "VERIFY BEFORE RELYING" and
// "AGENT GUIDANCE" notes, corroborated by Georgia.gov ("not permanently deleted
// or destroyed") and the GBI page.
export const gaSafetyDisclaimer =
  "This Georgia RCAP draft is legal information, not legal advice, and does not guarantee eligibility or any court outcome. Georgia does not use 'expungement': the remedy is record restriction plus a separate sealing of the clerk of court's file, and neither destroys the record — criminal-justice agencies retain access. Eligibility turns on the disposition, the July 1, 2013 arrest-date line, prosecutor approval, and (for convictions) the SB 288 excluded-offense list and two-misdemeanor lifetime cap. Verify the current text of O.C.G.A. § 35-3-37 before relying on any rule here.";

export const gaPlainLanguage = {
  notExpungement:
    "Never tell a Georgia user their record will be 'expunged' or erased. The accurate framing is restricted and (separately) sealed: a restricted record does not appear on a public/background-check GCIC report, but it still exists and remains available to criminal-justice agencies.",
  twoStep:
    "Restriction and sealing are two separate steps in two venues. Restriction (hiding the record) runs through the GBI/GCIC and the prosecutor; sealing the clerk of court's file runs through the Superior/State Court under § 35-3-37(m). A record must be restricted before the court file can be sealed; 'restricted' is not the same as the court file being 'sealed.'",
  julyLine:
    "The July 1, 2013 arrest date is decisive: non-conviction arrests on or after that date are generally restricted automatically when the qualifying disposition is entered into GCIC (no filing), while earlier arrests require an application at the arresting agency with prosecutor approval.",
  excludedOffenses:
    "For SB 288 misdemeanor restriction, map the user's actual offense to its O.C.G.A. Code section and check it against the § 35-3-37(j)(4) excluded list before saying it is eligible. DUI and most theft are excluded (theft by shoplifting and refund fraud are carve-ins), and family-violence misdemeanors qualify only if the person was under 21 at arrest.",
  scopeLimits:
    "Georgia restriction reaches Georgia records only; it does not clear out-of-state or federal records (the FBI Identity History Summary is the federal equivalent) and does not automatically update private background-check companies."
};
