// Official Rhode Island forms catalog. Sourced from the "Rhode Island
// Expungement / Sealing Reference for Wilma" (section 5) and the official court
// form PDFs present in the Nationwide source folder. Research metadata only — a
// finalized PDF field map still requires per-form review and no renderer is
// wired. The Rhode Island Judiciary provides court-specific Motion to Expunge or
// Seal Record / Affidavit forms, revised February 2025; the forms require the
// defendant's name, case number, BCI number, counts, charges, dispositions, and
// the charging police department, and require the filer to select whether they
// are asking to seal or expunge.
export interface RiOfficialForm {
  formId: string | null;
  officialName: string;
  role: "district_court_motion" | "superior_court_felony" | "superior_court_misdemeanor" | "family_court_motion";
  citation: string | null;
  blankPdfInSource: boolean;
  sourceFileName: string | null;
}

export const riOfficialForms: RiOfficialForm[] = [
  {
    formId: "DC-33",
    officialName:
      "District Court — Motion to Expunge or Seal Record and Affidavit (DC-33) (revised February 2025)",
    role: "district_court_motion",
    citation: "R.I. Gen. Laws ch. 12-1.3; § 12-1-12 / § 12-1-12.1",
    blankPdfInSource: true,
    sourceFileName: "Motion and Affidavit to Expunge or Seal Record - Misdemeanor (2).pdf"
  },
  {
    formId: "Superior-55",
    officialName:
      "Superior Court — Motion to Expunge or Seal Record — Felony (Superior-55) (revised February 2025)",
    role: "superior_court_felony",
    citation: "R.I. Gen. Laws ch. 12-1.3; § 12-1.3-2",
    blankPdfInSource: true,
    sourceFileName: "Motion and Affidavit to Expunge or Seal Record - Felony.pdf"
  },
  {
    formId: null,
    officialName:
      "Superior Court — Motion to Expunge or Seal Record — Misdemeanor (revised February 2025)",
    role: "superior_court_misdemeanor",
    citation: "R.I. Gen. Laws ch. 12-1.3",
    blankPdfInSource: true,
    sourceFileName: "Motion and Affidavit to Expunge or Seal Record - Misdemeanor-superior.pdf"
  },
  {
    formId: null,
    officialName:
      "Family Court — Motion to Expunge or Seal Record and Affidavit — Misdemeanor (revised February 2025)",
    role: "family_court_motion",
    citation: "R.I. Gen. Laws ch. 12-1.3",
    blankPdfInSource: true,
    sourceFileName: "Motion to Expunge or Seal and Affidavit.pdf"
  }
];
