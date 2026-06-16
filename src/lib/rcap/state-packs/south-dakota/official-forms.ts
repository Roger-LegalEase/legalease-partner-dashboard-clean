// Official South Dakota forms catalog. Sourced from the South Dakota Expungement
// Reference for Wilma (sections 3 and 15) and the official UJS expungement
// packet/form files present in the Nationwide source folder. Research metadata
// only — the per-form field map is supporting research, no overlay is built, and
// no renderer is wired. South Dakota's Unified Judicial System (UJS) publishes the
// official expungement packet: UJS-390 instructions, UJS-232 case filing
// statement, UJS-391 motion + statement of mailing, UJS-392 waiver of hearing,
// UJS-393 notice of hearing, UJS-394 order of expungement, and UJS-395 notice of
// entry of order.
export interface SdOfficialForm {
  formId: string | null;
  officialName: string;
  role:
    | "instructions"
    | "case_filing_statement"
    | "motion"
    | "waiver"
    | "notice_of_hearing"
    | "order"
    | "notice_of_entry";
  citation: string | null;
  blankPdfInSource: boolean;
  sourceFileName: string | null;
}

export const sdOfficialForms: SdOfficialForm[] = [
  {
    formId: "UJS-390",
    officialName: "Instructions for Expungement",
    role: "instructions",
    citation: "SDCL § 23A-3-27",
    blankPdfInSource: true,
    sourceFileName: "ujs-390-expungement-instructions.pdf"
  },
  {
    formId: "UJS-232",
    officialName: "Case Filing Statement (Written)",
    role: "case_filing_statement",
    citation: "SDCL § 23A-3-27",
    blankPdfInSource: true,
    sourceFileName: "ujs-232-case-filing-statement-written.pdf"
  },
  {
    formId: "UJS-391",
    officialName: "Motion for Expungement and Affidavit (Statement) of Mailing",
    role: "motion",
    citation: "SDCL § 23A-3-27",
    blankPdfInSource: true,
    sourceFileName: "ujs391-motion-for-expungement-and-affidavit-of-mailing-final-07_2025.pdf"
  },
  {
    formId: "UJS-392",
    officialName: "Waiver of Expungement Hearing",
    role: "waiver",
    citation: "SDCL § 23A-3-27",
    blankPdfInSource: true,
    sourceFileName: "ujs-392-waiver-of-expungement-hearing-07_2025.pdf"
  },
  {
    formId: "UJS-393",
    officialName: "Notice of Hearing for Expungement of Record",
    role: "notice_of_hearing",
    citation: "SDCL § 23A-3-27",
    blankPdfInSource: true,
    sourceFileName: "ujs-393-notice-of-hearing-for-expungement-of-record_08_2025.pdf"
  },
  {
    formId: "UJS-394",
    officialName: "Order of Expungement",
    role: "order",
    citation: "SDCL § 23A-3-27",
    blankPdfInSource: true,
    sourceFileName: "ujs-394-order-of-expungement_06_2023.pdf"
  },
  {
    formId: "UJS-395",
    officialName: "Notice of Entry of Expungement Order",
    role: "notice_of_entry",
    citation: "SDCL § 23A-3-27",
    blankPdfInSource: true,
    sourceFileName: "ujs-395-notice-of-entry-of-expungement-order_06_2023.pdf"
  }
];
