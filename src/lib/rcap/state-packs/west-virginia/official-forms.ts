// Official West Virginia forms catalog. Sourced from the "West Virginia Expungement
// Reference for Wilma" (section 3) and the official West Virginia Judiciary
// expungement form PDFs present in the Nationwide source folder. Research metadata
// only — no per-form field map, no overlay, and no renderer is wired. All five
// listed forms (SCA-C900, SCA-C903, SCA-C906, SCA-C907, SCA-C912) are present
// locally as blank official PDFs.
export interface WvOfficialForm {
  formId: string;
  officialName: string;
  role: "instructions" | "motion" | "petition" | "victim_opposition";
  citation: string | null;
  blankPdfInSource: boolean;
  sourceFileName: string | null;
}

export const wvOfficialForms: WvOfficialForm[] = [
  {
    formId: "SCA-C900",
    officialName: "Instructions for Expungement of Records Petition",
    role: "instructions",
    citation: "W. Va. Code § 61-11-26",
    blankPdfInSource: true,
    sourceFileName: "SCA-C900.pdf"
  },
  {
    formId: "SCA-C903",
    officialName:
      "Motion for Expungement of Criminal Records Due to Acquittal or Dismissal for Reasons Other than Entry of a Plea",
    role: "motion",
    citation: "W. Va. Code § 61-11-25",
    blankPdfInSource: true,
    sourceFileName: "SCA-C-903.pdf"
  },
  {
    formId: "SCA-C906",
    officialName: "Petition for Expungement of Misdemeanor Violations and Traffic Citations",
    role: "petition",
    citation: "W. Va. Code § 61-11-26",
    blankPdfInSource: true,
    sourceFileName: "SCA-C906.pdf"
  },
  {
    formId: "SCA-C907",
    officialName: "Petition for Expungement of Felony Violations",
    role: "petition",
    citation: "W. Va. Code § 61-11-26",
    blankPdfInSource: true,
    sourceFileName: "SCA-C907.pdf"
  },
  {
    formId: "SCA-C912",
    officialName: "Victim's Notice of Opposition to Petition for Criminal Offense Expungement",
    role: "victim_opposition",
    citation: "W. Va. Code § 61-11-26",
    blankPdfInSource: true,
    sourceFileName: "SCA-C912.pdf"
  }
];
