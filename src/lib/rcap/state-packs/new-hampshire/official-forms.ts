// Official New Hampshire Judicial Branch annulment forms catalog. Sourced from
// the New Hampshire Expungement / Annulment Reference for Wilma (section 7) and
// the NHJB form PDFs present in the Nationwide source folder. Research metadata
// only — no PDF field map exists yet and no renderer is wired. The reference names
// NHJB-2317-DSe (Petition to Annul Record) and the Annulment of Criminal Records
// Checklist. SOURCE GAP: the source folder also contains nhjb-2981-d.pdf,
// nhjb-3056-dse.pdf, nhjb-3057-dse.pdf, and nhjb-3124-ds.pdf, whose roles are NOT
// described in the reference text — they are cataloged as present-but-unconfirmed
// (titles not asserted) and must be identified against the NHJB forms list before
// any field mapping.
export interface NhOfficialForm {
  formNumber: string;
  officialName: string | null;
  role: "petition" | "checklist" | "resource" | "unconfirmed";
  citation: string | null;
  blankPdfInSource: boolean;
  sourceFileName: string;
}

export const nhOfficialForms: NhOfficialForm[] = [
  {
    formNumber: "NHJB-2317-DSe",
    officialName: "Petition to Annul Record",
    role: "petition",
    citation: "RSA 651:5",
    blankPdfInSource: true,
    sourceFileName: "nhjb-2317-dse.pdf"
  },
  {
    formNumber: "annulmentchecklist",
    officialName: "Annulment of Criminal Records Checklist",
    role: "checklist",
    citation: "RSA 651:5",
    blankPdfInSource: true,
    sourceFileName: "annulmentchecklist.pdf"
  },
  {
    formNumber: "NHJB-2981-D",
    officialName: null,
    role: "unconfirmed",
    citation: null,
    blankPdfInSource: true,
    sourceFileName: "nhjb-2981-d.pdf"
  },
  {
    formNumber: "NHJB-3056-DSe",
    officialName: null,
    role: "unconfirmed",
    citation: null,
    blankPdfInSource: true,
    sourceFileName: "nhjb-3056-dse.pdf"
  },
  {
    formNumber: "NHJB-3057-DSe",
    officialName: null,
    role: "unconfirmed",
    citation: null,
    blankPdfInSource: true,
    sourceFileName: "nhjb-3057-dse.pdf"
  },
  {
    formNumber: "NHJB-3124-DS",
    officialName: null,
    role: "unconfirmed",
    citation: null,
    blankPdfInSource: true,
    sourceFileName: "nhjb-3124-ds.pdf"
  }
];
