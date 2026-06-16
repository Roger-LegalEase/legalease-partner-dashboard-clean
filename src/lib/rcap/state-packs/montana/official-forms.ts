// Official Montana forms catalog. Sourced from the Montana Expungement Reference
// for Wilma (section 8) and the official court packet/form files present in the
// Nationwide source folder. Research metadata only — no PDF field map exists yet
// and no renderer is wired. Montana provides an official self-represented
// misdemeanor expungement packet (srmisexp2025.pdf), MMRTA marijuana Form A/B
// (form-a.docx / form-b.docx), a DOJ Expungement/Removal Request form, and a DOJ
// non-conviction removal flowchart. The "20240429-Updated...docx" is the DOJ
// removal-request DOCX; the "2023-Updated...pdf" is the prior PDF version.
export interface MtOfficialForm {
  formId: string | null;
  officialName: string;
  role: "misdemeanor_packet" | "marijuana_form" | "doj_request" | "flowchart";
  citation: string | null;
  blankPdfInSource: boolean;
  sourceFileName: string | null;
}

export const mtOfficialForms: MtOfficialForm[] = [
  {
    formId: "srmisexp2025",
    officialName:
      "Self-Represented Misdemeanor Expungement Packet (Petition, Order Expunging Misdemeanor Records, Statement of Inability to Pay, and proposed orders)",
    role: "misdemeanor_packet",
    citation: "Mont. Code Ann. Title 46, ch. 18, part 11",
    blankPdfInSource: true,
    sourceFileName: "srmisexp2025.pdf"
  },
  {
    formId: "MMRTA Form A",
    officialName: "MMRTA Form A — currently serving sentence (expungement or resentencing)",
    role: "marijuana_form",
    citation: "Mont. Code Ann. § 16-12-113",
    blankPdfInSource: true,
    sourceFileName: "form-a.docx"
  },
  {
    formId: "MMRTA Form B",
    officialName: "MMRTA Form B — sentence completed (expungement or redesignation)",
    role: "marijuana_form",
    citation: "Mont. Code Ann. § 16-12-113",
    blankPdfInSource: true,
    sourceFileName: "form-b.docx"
  },
  {
    formId: null,
    officialName: "Montana DOJ Expungement/Removal Request Form (2024 update)",
    role: "doj_request",
    citation: null,
    blankPdfInSource: true,
    sourceFileName: "20240429-Updated-ExpungementRemovalRequestForm.docx"
  },
  {
    formId: null,
    officialName: "Montana DOJ Expungement/Removal Request Form (2023 PDF)",
    role: "doj_request",
    citation: null,
    blankPdfInSource: true,
    sourceFileName: "2023-Updated-ExpungementRemovalRequestForm.pdf"
  },
  {
    formId: null,
    officialName: "Records Removal Flowchart (DOJ non-conviction removal overview)",
    role: "flowchart",
    citation: "Mont. Code Ann. § 44-5-202",
    blankPdfInSource: true,
    sourceFileName: "Records_Removal_Flowchart_Simple.pdf"
  }
];
