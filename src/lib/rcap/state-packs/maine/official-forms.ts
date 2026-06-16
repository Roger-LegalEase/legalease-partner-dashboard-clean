// Official Maine Judicial Branch forms catalog. Sourced from the Maine Criminal
// Record Sealing — Wilma Agent Training Reference (section 3) and the official MJB
// form PDFs present in the Nationwide source folder. Research metadata only — no
// PDF field map exists yet and no renderer is wired. Maine uses official statewide
// forms (CR-218 revised 7/1/2024; CR-289 revised 10/1/2024). NOTE: the fee-waiver
// forms CV-067 and CV-191 are referenced by the reference but are NOT present as
// blank PDFs in the source folder (source gap).
export interface MeOfficialForm {
  formNumber: string;
  officialName: string;
  role: "adult_sealing" | "prostitution_sealing" | "juvenile_sealing" | "fee_waiver" | "financial_affidavit";
  citation: string | null;
  blankPdfInSource: boolean;
  sourceFileName: string | null;
}

export const meOfficialForms: MeOfficialForm[] = [
  {
    formNumber: "CR-218",
    officialName: "Motion to Seal Criminal History",
    role: "adult_sealing",
    citation: "15 M.R.S. §§ 2263-2264",
    blankPdfInSource: true,
    sourceFileName: "MJB-Form-cr-218.pdf"
  },
  {
    formNumber: "CR-289",
    officialName: "Motion to Seal Conviction for Engaging in Prostitution",
    role: "prostitution_sealing",
    citation: "15 M.R.S. § 2262-A",
    blankPdfInSource: true,
    sourceFileName: "MJB-Form-cr-289.pdf"
  },
  {
    formNumber: "JV-043",
    officialName: "Petition to Seal Juvenile Case Records",
    role: "juvenile_sealing",
    citation: "15 M.R.S. § 3308-C",
    blankPdfInSource: true,
    sourceFileName: "MJB-Form-jv-043.pdf"
  },
  {
    formNumber: "CV-067",
    officialName: "Application to Proceed Without Payment of Fees",
    role: "fee_waiver",
    citation: null,
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    formNumber: "CV-191",
    officialName: "Financial Affidavit",
    role: "financial_affidavit",
    citation: null,
    blankPdfInSource: false,
    sourceFileName: null
  }
];
