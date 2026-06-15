// Official Maryland Judiciary forms catalog. Sourced from the Maryland Wilma
// Agent Training Reference (Nationwide Record Clearing), section 3. Maryland
// requires these mandatory official forms; this catalog is research metadata
// only — no PDF field map exists yet and no renderer is wired. The 072A/B/C/D
// blank PDFs are present in the Nationwide source folder ("LegalEase Maryland
// forms": ccdccr072A.pdf, ccdccr072B.pdf, ccdccr072c.pdf, ccdccr072d.pdf).
export interface MdOfficialForm {
  formNumber: string;
  officialName: string;
  route: string;
  citation: string;
  blankPdfInSource: boolean;
  sourceFileName: string | null;
}

export const mdOfficialForms: MdOfficialForm[] = [
  {
    formNumber: "CC-DC-CR-072A",
    officialName: "Petition for Expungement of Records",
    route:
      "Acquittal, dismissal, PBJ, nolle prosequi, stet, not criminally responsible, juvenile transfer (non-conviction)",
    citation: "Md. Code, Crim. Proc. § 10-105",
    blankPdfInSource: true,
    sourceFileName: "ccdccr072A.pdf"
  },
  {
    formNumber: "CC-DC-CR-072B",
    officialName: "Petition for Expungement of Records — Guilty Disposition",
    route: "Eligible guilty disposition, non-cannabis",
    citation: "Md. Code, Crim. Proc. § 10-110",
    blankPdfInSource: true,
    sourceFileName: "ccdccr072B.pdf"
  },
  {
    formNumber: "CC-DC-CR-072C",
    officialName: "Petition for Expungement of Records (early all-favorable filing)",
    route:
      "Early filing for all acquittal / dismissal / not guilty / nolle cases, less than 3 years (automatic-expungement early route)",
    citation: "Md. Code, Crim. Proc. § 10-105.1",
    blankPdfInSource: true,
    sourceFileName: "ccdccr072c.pdf"
  },
  {
    formNumber: "CC-DC-CR-072D",
    officialName: "Petition for Expungement of Records (marijuana / cannabis-related)",
    route: "Marijuana / cannabis-related offenses",
    citation: "Md. Code, Crim. Proc. §§ 10-105, 10-110",
    blankPdfInSource: true,
    sourceFileName: "ccdccr072d.pdf"
  },
  {
    formNumber: "CC-DC-CR-078",
    officialName: "General Waiver and Release",
    route: "Early filing release for acquittal / dismissal / nolle before the 3-year period",
    citation: "Md. Code, Crim. Proc. § 10-105(c)",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    formNumber: "DC-CR-071",
    officialName: "Application for Expungement of Police Record",
    route:
      "Police-record expungement after a law-enforcement agency denial or no action for more than 60 days",
    citation: "Md. Code, Crim. Proc. § 10-103",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    formNumber: "CC-DC-CR-148",
    officialName: "Petition for Shielding Under Maryland Second Chance Act",
    route: "Shielding of an eligible conviction",
    citation: "Md. Code, Crim. Proc. §§ 10-301 to 10-306",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    formNumber: "CC-DC-CR-072G2",
    officialName: "List of Expungeable Charges Under Criminal Procedure § 10-110",
    route: "Reference list used to confirm § 10-110 conviction eligibility (not a petition)",
    citation: "Md. Code, Crim. Proc. § 10-110",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    formNumber: "JUV-11-506.1 / juvenile forms index",
    officialName: "Juvenile expungement petition (court-referenced form)",
    route: "Juvenile / minor record expungement",
    citation: "Md. Code, Cts. & Jud. Proc. § 3-8A-27.1; Md. Rule 11-506",
    blankPdfInSource: false,
    sourceFileName: null
  }
];
