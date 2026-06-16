// Official Utah forms catalog. Sourced from the "Utah Expungement Reference for
// Wilma" (section 3) and the official Utah Courts expungement form PDFs present in
// the Nationwide source folder, plus the Utah Bureau of Criminal Identification
// (BCI) forms referenced in the Wilma source. Research metadata only — no per-form
// field map, no overlay, and no renderer is wired. The traffic and cannabis
// petition/order forms (1002EX/1022EX, 1003EX/1023EX) and the optional support
// forms (victim statement, petitioner reply, AP&P response forms, notice of
// hearing, acceptance of service, consent/waiver of hearing, civil filing cover
// sheet) are present locally as blank official PDFs. The BCI Certificate of
// Eligibility application and the certificate-based petition/order forms are
// documented in the source but are not present as local blank PDFs.
export interface UtOfficialForm {
  formId: string | null;
  officialName: string;
  role:
    | "petition"
    | "order"
    | "cover_sheet"
    | "victim_statement"
    | "petitioner_reply"
    | "agency_response"
    | "notice_of_hearing"
    | "acceptance_of_service"
    | "consent_waiver"
    | "certificate_application"
    | "instructions";
  citation: string | null;
  blankPdfInSource: boolean;
  sourceFileName: string | null;
}

export const utOfficialForms: UtOfficialForm[] = [
  {
    formId: "1002EX",
    officialName: "Petition to Expunge Records — Traffic Conviction",
    role: "petition",
    citation: "Utah Code Title 77, Chapter 40a",
    blankPdfInSource: true,
    sourceFileName: "1002EX_Petition_to_Expunge_Records_Traffic_Conviction.pdf"
  },
  {
    formId: "1022EX",
    officialName: "Order — Traffic Records Conviction",
    role: "order",
    citation: "Utah Code Title 77, Chapter 40a",
    blankPdfInSource: true,
    sourceFileName: "1022EX_Order_Traffic_Records_Conviction.pdf"
  },
  {
    formId: "1003EX",
    officialName: "Petition to Expunge Records — Cannabis Conviction",
    role: "petition",
    citation: "Utah Code Title 77, Chapter 40a",
    blankPdfInSource: true,
    sourceFileName: "1003EX_Petition_to_Expunge_Records_Cannabis_Conviction.pdf"
  },
  {
    formId: "1023EX",
    officialName: "Order — Cannabis Conviction",
    role: "order",
    citation: "Utah Code Title 77, Chapter 40a",
    blankPdfInSource: true,
    sourceFileName: "1023EX_Order_Cannabis_Conviction.pdf"
  },
  {
    formId: null,
    officialName: "Civil Filing Cover Sheet",
    role: "cover_sheet",
    citation: null,
    blankPdfInSource: true,
    sourceFileName: "Civil_Filing_Cover_Sheet.pdf"
  },
  {
    formId: null,
    officialName: "Victim Statement",
    role: "victim_statement",
    citation: "Utah Code Title 77, Chapter 40a",
    blankPdfInSource: true,
    sourceFileName: "02_Victim_Statement.pdf"
  },
  {
    formId: null,
    officialName: "Petitioner Reply (to victim/prosecutor statement)",
    role: "petitioner_reply",
    citation: "Utah Code Title 77, Chapter 40a",
    blankPdfInSource: true,
    sourceFileName: "03_Petitioner_Reply.pdf"
  },
  {
    formId: null,
    officialName: "Request for Adult Probation & Parole Response",
    role: "agency_response",
    citation: "Utah Code Title 77, Chapter 40a",
    blankPdfInSource: true,
    sourceFileName: "04_Request_Response_APP.pdf"
  },
  {
    formId: null,
    officialName: "Adult Probation & Parole Response",
    role: "agency_response",
    citation: "Utah Code Title 77, Chapter 40a",
    blankPdfInSource: true,
    sourceFileName: "05_Response_APP.pdf"
  },
  {
    formId: null,
    officialName: "Notice of Hearing",
    role: "notice_of_hearing",
    citation: "Utah Code Title 77, Chapter 40a",
    blankPdfInSource: true,
    sourceFileName: "06_Notice_of_Hearing.pdf"
  },
  {
    formId: null,
    officialName: "Acceptance of Service",
    role: "acceptance_of_service",
    citation: "Utah Code Title 77, Chapter 40a",
    blankPdfInSource: true,
    sourceFileName: "09_Acceptance_of_service.pdf"
  },
  {
    formId: null,
    officialName: "Consent and Waiver of Hearing",
    role: "consent_waiver",
    citation: "Utah Code Title 77, Chapter 40a",
    blankPdfInSource: true,
    sourceFileName: "09_Consent-waiver_of_hearing.pdf"
  },
  {
    formId: null,
    officialName: "BCI Application for Certificate of Eligibility",
    role: "certificate_application",
    citation: "Utah Code Title 77, Chapter 40a",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    formId: null,
    officialName: "Petition to Expunge Records (certificate-based) and Order on Petition",
    role: "petition",
    citation: "Utah Code Title 77, Chapter 40a",
    blankPdfInSource: false,
    sourceFileName: null
  }
];
