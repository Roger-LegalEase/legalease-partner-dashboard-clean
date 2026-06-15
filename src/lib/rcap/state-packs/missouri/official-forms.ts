// Official Missouri court forms catalog. Sourced from the Missouri Expungement
// Reference for Wilma (section 2) and the official Missouri court form PDFs in
// the Nationwide source folder. Research metadata only — no PDF field map exists
// yet and no renderer is wired. Missouri uses standardized statewide CR-series
// forms; county sites may host older copies, so the current form must be
// confirmed with the circuit clerk before filing. NOTE: the source folder also
// contains "Modified-MSPD-Pro-Se-FormFillable.pdf", a MODIFIED public-defender
// pro se adaptation — that is a modeled form, not citation authority, and is not
// cataloged here as an official form.
export interface MoOfficialForm {
  formNumber: string | null;
  officialName: string;
  pathway: string;
  citation: string;
  blankPdfInSource: boolean;
  sourceFileName: string | null;
}

export const moOfficialForms: MoOfficialForm[] = [
  {
    formNumber: "CR360",
    officialName: "Petition for Expungement — Section 610.140, RSMo",
    pathway: "Main general Missouri expungement petition",
    citation: "Mo. Rev. Stat. § 610.140",
    blankPdfInSource: true,
    sourceFileName: "EXPUNGEMENT FORM.pdf"
  },
  {
    formNumber: null,
    officialName: "Judgment and Order of Expungement — Section 610.140, RSMo",
    pathway: "Proposed/final order for general expungement",
    citation: "Mo. Rev. Stat. § 610.140",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    formNumber: null,
    officialName: "Petition for Expungement of Arrest Records",
    pathway: "Arrest-record expungement under §§ 610.122-610.123",
    citation: "Mo. Rev. Stat. §§ 610.122, 610.123",
    blankPdfInSource: true,
    sourceFileName: "petition-for-expungement-of-arrest-records.pdf"
  },
  {
    formNumber: "CR300",
    officialName: "Petition for Correction of Arrest Court Records — Identity Theft",
    pathway: "Identity-theft record correction/expungement",
    citation: "Mo. Rev. Stat. § 610.145",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    formNumber: "CR301",
    officialName: "Petition for Expungement — Mistaken Identity",
    pathway: "Mistaken-identity record correction/expungement",
    citation: "Mo. Rev. Stat. § 610.145",
    blankPdfInSource: true,
    sourceFileName: "petition-for-expungement-mistaken-identity.pdf"
  },
  {
    formNumber: "CR375",
    officialName: "Petition for Expungement — Marijuana-Related Offense(s)",
    pathway: "Marijuana-related expungement petition",
    citation: "Mo. Const. Art. XIV, § 2",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    formNumber: null,
    officialName: "Motion and Affidavit in Support of Request to Proceed as a Poor Person",
    pathway: "Fee-waiver / indigency request",
    citation: "N/A",
    blankPdfInSource: true,
    sourceFileName: "motion-and-affidavit-in-support-of-request-to-proceed-as-a-poor-person.pdf"
  },
  {
    formNumber: "FI-05",
    officialName: "Confidential Case Filing Information Sheet",
    pathway: "Confidential filing information sheet accompanying expungement filings",
    citation: "N/A",
    blankPdfInSource: true,
    sourceFileName: "Conf Case Filing Info Sheet(FI-05).pdf"
  }
];
