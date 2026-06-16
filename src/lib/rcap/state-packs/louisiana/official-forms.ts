// Official Louisiana expungement forms catalog. Sourced from the Louisiana
// Expungement Reference for Wilma (section 2) and the Louisiana Laws HTML source
// files present in the Nationwide folder. Research metadata only — no PDF field
// map exists yet and no renderer is wired. Louisiana's forms are STATUTORY: they
// are built into the Code of Criminal Procedure, and art. 986 provides that only
// the forms in arts. 987-995 and 998 are used for standard expungement motions,
// interim expungements, and related filings. The source folder contains the
// Louisiana Laws HTML pages (statutory text), not separate blank PDF form files —
// so blankPdfInSource is false for every entry (the "form" is the codal form).
export interface LaOfficialForm {
  article: string;
  officialName: string;
  role: "set_aside" | "fee_waiver" | "motion" | "affidavit" | "order" | "supplemental";
  citation: string;
  blankPdfInSource: boolean;
  sourceFileName: string | null;
}

export const laOfficialForms: LaOfficialForm[] = [
  {
    article: "Art. 987",
    officialName: "Motion to Set Aside Conviction and Dismiss Prosecution",
    role: "set_aside",
    citation: "La. Code Crim. Proc. art. 987",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    article: "Art. 988",
    officialName: "Certification of Fee Waiver",
    role: "fee_waiver",
    citation: "La. Code Crim. Proc. art. 988",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    article: "Art. 989",
    officialName: "Motion for Expungement",
    role: "motion",
    citation: "La. Code Crim. Proc. art. 989",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    article: "Art. 990",
    officialName: "Affidavit of Response",
    role: "affidavit",
    citation: "La. Code Crim. Proc. art. 990",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    article: "Art. 991",
    officialName: "Order",
    role: "order",
    citation: "La. Code Crim. Proc. art. 991",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    article: "Art. 992",
    officialName: "Order of Expungement of Arrest/Conviction Record",
    role: "order",
    citation: "La. Code Crim. Proc. art. 992",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    article: "Art. 993",
    officialName: "Supplemental Forms (extra charges/counts)",
    role: "supplemental",
    citation: "La. Code Crim. Proc. art. 993",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    article: "Art. 994",
    officialName: "Motion for Interim Expungement",
    role: "motion",
    citation: "La. Code Crim. Proc. art. 994",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    article: "Art. 995",
    officialName: "Order of Interim Expungement",
    role: "order",
    citation: "La. Code Crim. Proc. art. 995",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    article: "Art. 998",
    officialName:
      "Motion for Expungement for Misdemeanor Conviction for a First Offense Possession of Marijuana",
    role: "motion",
    citation: "La. Code Crim. Proc. art. 998",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    article: "Art. 999.1",
    officialName: "Order of Expungement under Code of Criminal Procedure Article 999",
    role: "order",
    citation: "La. Code Crim. Proc. art. 999.1",
    blankPdfInSource: false,
    sourceFileName: null
  }
];

// Statutory source files present in the Nationwide folder (Louisiana Laws HTML,
// Louisiana State Legislature) used to build/verify this pack.
export const laStatutorySourceFiles: string[] = [
  "Louisiana Laws - Louisiana State Legislature.html",
  "2 Louisiana Laws - Louisiana State Legislature.html",
  "3Louisiana Laws - Louisiana State Legislature.html",
  "4Louisiana Laws - Louisiana State Legislature.html",
  "5Louisiana Laws - Louisiana State Legislature.html",
  "6Louisiana Laws - Louisiana State Legislature.html",
  "7Louisiana Laws - Louisiana State Legislature.html"
];
