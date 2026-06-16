// Ohio sealing/expungement source documents catalog. Sourced from the Ohio
// Sealing & Expungement — Wilma Agent Training Reference (section 3) and the PDFs
// present in the Nationwide source folder. Research metadata only — no PDF field
// map exists yet and no renderer is wired. Ohio does NOT have one mandatory
// statewide form packet: each court provides its own application, so the user must
// obtain the form from the court where the charge was filed. The folder contains
// instructions, a cover sheet, an application EXAMPLE (a worked sample, not a
// blank official form), a Certificate of Qualification for Employment (CQE) sample
// petition (a distinct remedy, included for reference), and the BCI
// sealing/expungement request form used when sending a signed order to BCI.
export interface OhSourceForm {
  officialName: string;
  role: "instructions" | "cover_sheet" | "application_example" | "cqe_sample" | "bci_request";
  citation: string | null;
  blankPdfInSource: boolean;
  isExampleOnly: boolean;
  sourceFileName: string;
}

export const ohSourceForms: OhSourceForm[] = [
  {
    officialName: "Sealing or Expunging Instructions",
    role: "instructions",
    citation: "Ohio Rev. Code §§ 2953.32, 2953.33",
    blankPdfInSource: true,
    isExampleOnly: false,
    sourceFileName: "SealingorExpunging%20Inst_202504091343476141.pdf"
  },
  {
    officialName: "Cover Sheet — Sealing and Expungement (04-13-2026)",
    role: "cover_sheet",
    citation: null,
    blankPdfInSource: true,
    isExampleOnly: false,
    sourceFileName: "Cover-Sheet-Sealing-and-Expungement-04132026.pdf"
  },
  {
    officialName: "Sealing and Expungement Application — worked EXAMPLE",
    role: "application_example",
    citation: "Ohio Rev. Code § 2953.32",
    blankPdfInSource: true,
    isExampleOnly: true,
    sourceFileName: "SEALING-AND-EXPUNGEMENT-APP-EXAMPLE.pdf"
  },
  {
    officialName: "Certificate of Qualification for Employment (CQE) — sample petition (distinct remedy)",
    role: "cqe_sample",
    citation: null,
    blankPdfInSource: true,
    isExampleOnly: true,
    sourceFileName: "SysServ_CQE_sample_petition.pdf"
  },
  {
    officialName: "BCI Sealings and/or Expungements Request form",
    role: "bci_request",
    citation: "Ohio Rev. Code § 2953.32",
    blankPdfInSource: true,
    isExampleOnly: false,
    sourceFileName: "sealingsExpungementsRequest.pdf"
  }
];

// Generic application form names the reference says to look for at the court where
// the case was filed (Ohio has no single mandatory statewide packet):
export const ohGenericFormNames: string[] = [
  "Application to Seal/Expunge Criminal Record (conviction)",
  "Application to Seal/Expunge Official Records After Dismissal, Not Guilty Finding, or No Bill",
  "Application for Expungement of Marijuana or Hashish Possession Offense",
  "Application to Expunge Conviction as Victim of Human Trafficking",
  "Juvenile Application to Seal / Expunge Juvenile Record"
];
