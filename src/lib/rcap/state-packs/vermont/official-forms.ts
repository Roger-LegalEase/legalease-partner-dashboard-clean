// Official Vermont forms catalog. Sourced from the "Vermont Expungement & Sealing
// — Wilma Agent Training Reference" (section 3) and the official Vermont Judiciary
// expungement/sealing form PDFs present in the Nationwide source folder. Research
// metadata only — no per-form field map, no overlay, and no renderer is wired. The
// expungement petition (200-00129), filing guide (200-00130A), prosecutor response
// (200-00131), stipulation-to-seal and stipulation-to-expunge forms (200-00132 /
// 200-00132A), special-index sealing request (200-00631), and juvenile-diversion
// expungement petition (400-00171) are present locally as blank official PDFs. The
// sealing petition (200-00130), fee-waiver application (600-00229), and criminal-
// record-check request (200-00331) are documented in the source but are not present
// as local blank PDFs (the fee-waiver application is present only as captured HTML).
export interface VtOfficialForm {
  formId: string;
  officialName: string;
  role:
    | "petition_expunge"
    | "petition_seal"
    | "filing_guide"
    | "prosecutor_response"
    | "stipulation_seal"
    | "stipulation_expunge"
    | "juvenile_diversion_expunge"
    | "special_index_request"
    | "fee_waiver"
    | "record_check_request";
  citation: string | null;
  blankPdfInSource: boolean;
  sourceFileName: string | null;
}

export const vtOfficialForms: VtOfficialForm[] = [
  {
    formId: "200-00129",
    officialName: "Petition to Expunge Criminal History",
    role: "petition_expunge",
    citation: "13 V.S.A. § 7602",
    blankPdfInSource: true,
    sourceFileName: "200-00129 – Petition to Expunge Criminal History.pdf"
  },
  {
    formId: "200-00130A",
    officialName: "Filing a Petition to Expunge or Seal a Criminal Record",
    role: "filing_guide",
    citation: "13 V.S.A. §§ 7601–7611",
    blankPdfInSource: true,
    sourceFileName: "200-00130A - Filing a Petition to Expunge or Seal a Criminal Record.pdf"
  },
  {
    formId: "200-00131",
    officialName: "Response to Petition to Expunge or Seal",
    role: "prosecutor_response",
    citation: "13 V.S.A. §§ 7601–7611",
    blankPdfInSource: true,
    sourceFileName: "200-00131.pdf"
  },
  {
    formId: "200-00132",
    officialName: "Stipulation to Seal Criminal History Record + Order",
    role: "stipulation_seal",
    citation: "13 V.S.A. § 7602",
    blankPdfInSource: true,
    sourceFileName: "200-00132 – Stipulation to Seal Criminal History Record + Order.pdf"
  },
  {
    formId: "200-00132A",
    officialName: "Stipulation to Expunge Criminal History Record + Order",
    role: "stipulation_expunge",
    citation: "13 V.S.A. § 7602",
    blankPdfInSource: true,
    sourceFileName: "200-00132A – Stipulation to Expunge Criminal History Record + Order.pdf"
  },
  {
    formId: "200-00631",
    officialName: "Request for Sealing Order in Special Index",
    role: "special_index_request",
    citation: "13 V.S.A. §§ 7601–7611",
    blankPdfInSource: true,
    sourceFileName: "200-00631.pdf"
  },
  {
    formId: "400-00171",
    officialName: "Petition to Expunge — Juvenile Diversion",
    role: "juvenile_diversion_expunge",
    citation: "33 V.S.A. § 5119",
    blankPdfInSource: true,
    sourceFileName: "400-00171.pdf"
  },
  {
    formId: "200-00130",
    officialName: "Petition to Seal Criminal History",
    role: "petition_seal",
    citation: "13 V.S.A. § 7602",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    formId: "600-00229",
    officialName: "Application to Waive Filing Fees and Service Costs",
    role: "fee_waiver",
    citation: "32 V.S.A. § 1431",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    formId: "200-00331",
    officialName: "Criminal Record Check Request",
    role: "record_check_request",
    citation: null,
    blankPdfInSource: false,
    sourceFileName: null
  }
];
