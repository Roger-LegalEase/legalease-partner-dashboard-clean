// Official Washington forms catalog. Sourced from the "Washington State Record
// Relief — Wilma Agent Training Reference" (section 3) and the official Washington
// Courts (CrRLJ/CR/JU) form files present in the Nationwide source folder. Research
// metadata only — no per-form field map, no overlay, and no renderer is wired.
// `blankPdfInSource` marks whether a blank official form FILE is present locally;
// `sourceFileName` shows the actual filename (some treaty-fishing and juvenile
// forms are published by Washington Courts as .doc rather than .pdf). The Blake
// drug-possession motions/orders and the WSP non-conviction deletion request are
// documented in the source but are not present as local blank form files.
export interface WaOfficialForm {
  formId: string | null;
  officialName: string;
  role:
    | "petition"
    | "order"
    | "instructions"
    | "notice_of_hearing"
    | "agency_request";
  citation: string | null;
  blankPdfInSource: boolean;
  sourceFileName: string | null;
}

export const waOfficialForms: WaOfficialForm[] = [
  {
    formId: "CrRLJ 09.0100",
    officialName: "Petition and Declaration for Order Vacating Conviction",
    role: "petition",
    citation: "RCW 9.96.060",
    blankPdfInSource: true,
    sourceFileName: "CrRLJ 09.0100 Petition to Vacate Conviction_(f)(U).pdf"
  },
  {
    formId: "CrRLJ 09.0200",
    officialName: "Order on Petition Re: Vacating Conviction",
    role: "order",
    citation: "RCW 9.96.060",
    blankPdfInSource: true,
    sourceFileName: "CrRLJ 09.0200 Ord Pet Vacate Conviction_(f)(U).pdf"
  },
  {
    formId: "CrRLJ 09.0300",
    officialName: "Instructions for Vacating Misdemeanor and Gross Misdemeanor Convictions",
    role: "instructions",
    citation: "RCW 9.96.060",
    blankPdfInSource: true,
    sourceFileName: "CrRLJ 09.0300 InstructVacateMisdConvictions_2022 07.pdf"
  },
  {
    formId: "CrRLJ 09.0150",
    officialName: "Notice of Hearing",
    role: "notice_of_hearing",
    citation: "RCW 9.96.060",
    blankPdfInSource: true,
    sourceFileName: "CrRLJ 09_0150 Notice of Hearing_2019 07.pdf"
  },
  {
    formId: "CrRLJ 09.0800",
    officialName: "Petition and Declaration for Order to Vacate Cannabis Conviction",
    role: "petition",
    citation: "RCW 9.96.060",
    blankPdfInSource: true,
    sourceFileName: "CrRLJ 09.0800 PetitionDeclVacateConviction_Cannabis_2022 07(2).pdf"
  },
  {
    formId: "CrRLJ 09.0870",
    officialName: "Order on Petition to Vacate Cannabis Conviction",
    role: "order",
    citation: "RCW 9.96.060",
    blankPdfInSource: true,
    sourceFileName: "CrRLJ 09.0870 OrderPetVacateConviction_Cannabis_2022 07(2).pdf"
  },
  {
    formId: "CR 08.0900",
    officialName: "Motion and Declaration for Order Vacating Record of Felony Conviction",
    role: "petition",
    citation: "RCW 9.94A.640",
    blankPdfInSource: true,
    sourceFileName: "CR08.0900_Mt and Decl for Or Vacating Record of Felony_2025 07.pdf"
  },
  {
    formId: "CR 08.0920",
    officialName: "Order on Motion Re: Vacating Record of Felony Conviction",
    role: "order",
    citation: "RCW 9.94A.640",
    blankPdfInSource: true,
    sourceFileName: "CR08.0920_Order re Vacating Record of Felony Conviction 2025 07.pdf"
  },
  {
    formId: "CR 08.0930",
    officialName: "Vacation of Record of Felony Conviction — Information",
    role: "instructions",
    citation: "RCW 9.94A.640",
    blankPdfInSource: true,
    sourceFileName: "CR08.0930_Vacating Record of Felony Conviction_2023 01.pdf"
  },
  {
    formId: "JU 10.0300",
    officialName: "Motion and Declaration to Seal Records of Juvenile Offender",
    role: "petition",
    citation: "RCW 13.50.260",
    blankPdfInSource: true,
    sourceFileName: "JU10_0300_MTAFseal.doc"
  },
  {
    formId: "JU 10.0315",
    officialName: "Notice of Respondent's Motion to Seal Records of Juvenile Offender",
    role: "notice_of_hearing",
    citation: "RCW 13.50.260",
    blankPdfInSource: true,
    sourceFileName: "JU10_0315_NT of Resp MT to Seal Records of JU Offender  13.50.050.doc"
  },
  {
    formId: "JU 10.0320",
    officialName: "Order Re: Sealing Records of Juvenile Offender",
    role: "order",
    citation: "RCW 13.50.260",
    blankPdfInSource: true,
    sourceFileName: "JU 10_0320 Order re Sealing Records of Juvenile Offender_2022 01.pdf"
  },
  {
    formId: "CrRLJ CR 09.0500",
    officialName: "Motion and Declaration to Vacate Conviction — Treaty Indian Fishing Rights",
    role: "petition",
    citation: "RCW 9.96.060",
    blankPdfInSource: true,
    sourceFileName: "CrRLJ CR 09_0500 Motion and Decl Vacate Conv Treaty Indian Fishing rights.doc"
  },
  {
    formId: "CrRLJ CR 09.0600",
    officialName: "Notice of Hearing — Treaty Indian Fishing Rights",
    role: "notice_of_hearing",
    citation: "RCW 9.96.060",
    blankPdfInSource: true,
    sourceFileName: "CrRLJ CR 09_0600 Notice of Hearing.doc"
  },
  {
    formId: "CrRLJ CR 09.0700",
    officialName: "Order Vacating Conviction — Treaty Indian Fishing Rights",
    role: "order",
    citation: "RCW 9.96.060",
    blankPdfInSource: true,
    sourceFileName: "CrRLJ CR 09_0700 Or Vacating Conv treaty Indian Fishing Rights_final.doc"
  },
  {
    formId: null,
    officialName: "Blake Motion to Vacate Drug Possession Conviction and Refund Paid LFO Amounts (with Blake order forms)",
    role: "petition",
    citation: "State v. Blake",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    formId: null,
    officialName: "WSP Request for Expungement/Deletion of Non-Conviction Records",
    role: "agency_request",
    citation: "RCW 10.97.060",
    blankPdfInSource: false,
    sourceFileName: null
  }
];
