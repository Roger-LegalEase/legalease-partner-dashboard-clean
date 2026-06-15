// Official Minnesota Judicial Branch expungement forms catalog. Sourced from the
// Minnesota Expungement Reference for Wilma (section 5) and the official EXP form
// PDFs present in the Nationwide source folder. Research metadata only — no PDF
// field map exists yet and no renderer is wired. Minnesota is an overlay /
// official-form state (mandatory statewide EXP forms). EXP101 also has Hmong,
// Somali, and Spanish translations in the source folder. Note: EXP103 (Notice to
// Crime Victim) is referenced by the forms list but its blank PDF is NOT present
// in the Nationwide source folder (source gap).
export interface MnOfficialForm {
  formNumber: string;
  officialName: string;
  role: "instructions" | "petition" | "victim_notice" | "proof_of_service" | "order";
  citation: string | null;
  blankPdfInSource: boolean;
  sourceFileName: string | null;
}

export const mnOfficialForms: MnOfficialForm[] = [
  {
    formNumber: "EXP101",
    officialName: "Instructions — Expungement",
    role: "instructions",
    citation: "Minn. Stat. ch. 609A",
    blankPdfInSource: true,
    sourceFileName: "EXP101.pdf"
  },
  {
    formNumber: "EXP102",
    officialName: "Notice of Hearing and Petition for Expungement",
    role: "petition",
    citation: "Minn. Stat. §§ 609A.02, 609A.03",
    blankPdfInSource: true,
    sourceFileName: "EXP102_Current-2.pdf"
  },
  {
    formNumber: "EXP103",
    officialName: "Notice to Crime Victim",
    role: "victim_notice",
    citation: "Minn. Stat. § 609A.03",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    formNumber: "EXP104",
    officialName: "Proof of Service — Criminal Expungement",
    role: "proof_of_service",
    citation: "Minn. Stat. § 609A.03",
    blankPdfInSource: true,
    sourceFileName: "EXP104_Current.pdf"
  },
  {
    formNumber: "EXP105",
    officialName: "Order Concerning Sealing/Expunging Records under § 609A.02, subd. 3",
    role: "order",
    citation: "Minn. Stat. § 609A.02, subd. 3",
    blankPdfInSource: true,
    sourceFileName: "EXP105_Current.pdf"
  },
  {
    formNumber: "EXP106",
    officialName: "Order under § 609A.02, subd. 1 or 2",
    role: "order",
    citation: "Minn. Stat. § 609A.02, subd. 1 or 2",
    blankPdfInSource: true,
    sourceFileName: "EXP106_Current.pdf"
  },
  {
    formNumber: "EXP107",
    officialName: "Order to Seal / Expunge Judicial Records Only",
    role: "order",
    citation: "Minn. Stat. ch. 609A",
    blankPdfInSource: true,
    sourceFileName: "EXP107_Current.pdf"
  }
];

// Order-form selection (from the Wilma reference, section 5):
// - EXP105: conviction, diversion, stay, or listed felony under § 609A.02 subd. 3
// - EXP106: controlled-substance dismissal/discharge, or juvenile prosecuted as
//   an adult, under subd. 1 or 2
// - EXP107: court/judicial records only
export const mnOrderFormSelection: Array<{ situation: string; orderForm: string }> = [
  {
    situation: "Conviction, diversion, stay, or listed felony under § 609A.02, subd. 3",
    orderForm: "EXP105"
  },
  {
    situation:
      "Controlled-substance dismissal/discharge or juvenile prosecuted as adult under § 609A.02, subd. 1 or 2",
    orderForm: "EXP106"
  },
  { situation: "Court records only / judicial-only relief", orderForm: "EXP107" }
];
