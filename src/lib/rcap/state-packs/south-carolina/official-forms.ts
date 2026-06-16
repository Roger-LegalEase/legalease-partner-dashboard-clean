// Official South Carolina forms catalog. Sourced from the "South Carolina
// Expungement — Wilma Agent Training Reference" (section 3) and the official SCCA
// form files present in the Nationwide source folder (LegalEase South Carolina):
// SCCA223A1.pdf, SCCA223A1(a).pdf, SCCA223B1.pdf, SCCA223D1.pdf, SCCA223E.pdf,
// SCCA492.pdf. The Wilma reference also names SCCA 223C (old unlawful handgun
// possession / § 17-1-65 route). Research metadata only — supporting PDF field-map
// detail lives in the south-carolina-scca223a1 field-map draft (visual_review_
// required, hard-blocked); no field map is wired and no renderer is wired here.
export interface ScOfficialForm {
  formId: string | null;
  officialName: string;
  role:
    | "expungement_application_packet"
    | "expungement_order"
    | "objection"
    | "summary_court_application"
    | "old_handgun_order"
    | "supporting_form";
  citation: string | null;
  blankPdfInSource: boolean;
  sourceFileName: string | null;
}

export const scOfficialForms: ScOfficialForm[] = [
  {
    formId: "SCCA 223A1",
    officialName:
      "Application for Expungement (SCCA 223A1 packet) — the South Carolina Judicial Branch expungement application used to start the expungement process",
    role: "expungement_application_packet",
    citation: "S.C. Code § 17-22-910",
    blankPdfInSource: true,
    sourceFileName: "SCCA223A1.pdf"
  },
  {
    formId: "SCCA 223A1(a)",
    officialName: "Application for Expungement — supplemental/continuation page (SCCA 223A1(a))",
    role: "expungement_application_packet",
    citation: "S.C. Code § 17-22-910",
    blankPdfInSource: true,
    sourceFileName: "SCCA223A1(a).pdf"
  },
  {
    formId: "SCCA 223B1",
    officialName: "Order for Expungement (SCCA 223B1) — order directing destruction/sealing of records",
    role: "expungement_order",
    citation: "S.C. Code § 17-22-950",
    blankPdfInSource: true,
    sourceFileName: "SCCA223B1.pdf"
  },
  {
    formId: "SCCA 223D",
    officialName:
      "Notice of Objection to Expungement (SCCA 223D) — used by a prosecutor/law enforcement to object within 30 days on limited grounds",
    role: "objection",
    citation: "S.C. Code § 17-22-950",
    blankPdfInSource: true,
    sourceFileName: "SCCA223D1.pdf"
  },
  {
    formId: "SCCA 223E",
    officialName:
      "Summary Court Application for Expungement — Not Fingerprinted (SCCA 223E) — defendant applies at no cost when not fingerprinted",
    role: "summary_court_application",
    citation: "S.C. Code § 17-22-950",
    blankPdfInSource: true,
    sourceFileName: "SCCA223E.pdf"
  },
  {
    formId: "SCCA 223C",
    officialName:
      "Order/Form for Expungement of Old Unlawful Handgun Possession (SCCA 223C) — pre-Constitutional-Carry § 17-1-65 route; application before March 7, 2029",
    role: "old_handgun_order",
    citation: "S.C. Code § 17-1-65",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    formId: "SCCA 492",
    officialName: "SCCA 492 — supporting South Carolina Judicial Branch form referenced for expungement matters",
    role: "supporting_form",
    citation: "S.C. Code § 17-22-910",
    blankPdfInSource: true,
    sourceFileName: "SCCA492.pdf"
  }
];
