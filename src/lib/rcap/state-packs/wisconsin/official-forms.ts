// Official Wisconsin forms catalog. Sourced from the "Wisconsin Expungement — Wilma
// Agent Training Reference" (section 3) and the official Wisconsin Court System
// CR-266/CR-267 form PDFs present in the Nationwide source folder. Research metadata
// only — no per-form field map, no overlay, and no renderer is wired.
//
// SOURCE FLAG: CR-266 (adult petition) and CR-267 (adult order) ARE present locally
// as blank official PDFs (forms-download/CR-266_en.pdf and the CR-266/CR-267 PDFs in
// the Wisconsin folder). The juvenile JD-1780, the DOJ-CIB DJ-LE-250B fingerprint
// removal request, and the DJ-LE-247 record-challenge form are documented by form
// number in the Wilma source and on the cited official pages but are NOT present as
// local blank PDFs. The missing-official-forms audit flagged Wisconsin as
// needs_web_research for collecting these blank official PDFs before any live/overlay
// stage; that gap does not affect this shadow-only research pack.
export interface WiOfficialForm {
  formId: string;
  officialName: string;
  role:
    | "adult_petition"
    | "adult_order"
    | "juvenile_petition"
    | "doj_fingerprint_removal"
    | "doj_record_challenge";
  citation: string | null;
  blankPdfInSource: boolean;
  sourceFileName: string | null;
}

export const wiOfficialForms: WiOfficialForm[] = [
  {
    formId: "CR-266",
    officialName:
      "Petition to Expunge Criminal Court Record of Conviction — Non-Probation/Non-Incarceration",
    role: "adult_petition",
    citation: "Wis. Stat. § 973.015",
    blankPdfInSource: true,
    sourceFileName: "CR-266.pdf"
  },
  {
    formId: "CR-267",
    officialName:
      "Order on Petition to Expunge Court Record of Conviction — Non-Probation/Non-Incarceration",
    role: "adult_order",
    citation: "Wis. Stat. § 973.015",
    blankPdfInSource: true,
    sourceFileName: "CR-267.pdf"
  },
  {
    formId: "JD-1780",
    officialName: "Petition to Expunge Court Record of Adjudication / Recommendation of District Attorney",
    role: "juvenile_petition",
    citation: "Wis. Stat. § 938.355(4m)",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    formId: "DJ-LE-250B",
    officialName: "Fingerprint Record Removal Request",
    role: "doj_fingerprint_removal",
    citation: "Wis. Stat. § 165.84",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    formId: "DJ-LE-247",
    officialName: "Wisconsin Criminal History Record Challenge Form",
    role: "doj_record_challenge",
    citation: null,
    blankPdfInSource: false,
    sourceFileName: null
  }
];
