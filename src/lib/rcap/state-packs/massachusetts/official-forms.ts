// Official Massachusetts Trial Court / Probation Service forms catalog. Sourced
// from the Massachusetts Sealing & Expungement — Wilma Agent Training Reference
// (section 9) and the official petition PDFs present in the Nationwide source
// folder. Research metadata only — no PDF field map exists yet and no renderer is
// wired. NOTE: the time-based "Petition to Expunge Form" and the "Petition for
// Expungement of Marijuana Offenses Form" are referenced but are NOT present as
// blank PDFs in the source folder (source gap). The § 100K "Petition for
// Expungement" PDF present in the folder is the non-time-based expungement form.
export interface MaOfficialForm {
  officialName: string;
  role: "conviction_sealing" | "non_conviction_sealing" | "time_based_expungement" | "non_time_based_expungement" | "marijuana_expungement" | "opt_out_notice";
  citation: string;
  blankPdfInSource: boolean;
  sourceFileName: string | null;
}

export const maOfficialForms: MaOfficialForm[] = [
  {
    officialName: "Petition to Seal (Conviction Records) — Massachusetts Probation Service",
    role: "conviction_sealing",
    citation: "M.G.L. c. 276, § 100A",
    blankPdfInSource: true,
    sourceFileName: "fillable-jud-mps-Petition-to-Seal.pdf"
  },
  {
    officialName: "Petition to Seal Criminal Records for Nolle Prosequi or Dismissal",
    role: "non_conviction_sealing",
    citation: "M.G.L. c. 276, § 100C",
    blankPdfInSource: true,
    sourceFileName: "jud-tc-Petition-to-Seal-Criminal-Records-for-Nolle-Prosequi-or-Dismissal.pdf"
  },
  {
    officialName: "Petition for Expungement (non-time-based)",
    role: "non_time_based_expungement",
    citation: "M.G.L. c. 276, § 100K",
    blankPdfInSource: true,
    sourceFileName: "jud-Petition-for-Expungement.pdf"
  },
  {
    officialName: "OCP004 — 10-Day Notice Package / Opt-Out of Sealing Form (version 2-8-2024)",
    role: "opt_out_notice",
    citation: "M.G.L. c. 276, § 100C",
    blankPdfInSource: true,
    sourceFileName:
      "OCP004%20-%2010days%20NOTICE%20PACKAGE%20Opt-Out%20of%20Sealing%20Form%20version%202-8-2024.pdf"
  },
  {
    officialName: "Petition to Expunge Form (time-based, Massachusetts Probation Service)",
    role: "time_based_expungement",
    citation: "M.G.L. c. 276, §§ 100F-100J",
    blankPdfInSource: false,
    sourceFileName: null
  },
  {
    officialName: "Petition for Expungement of Marijuana Offenses Form",
    role: "marijuana_expungement",
    citation: "M.G.L. c. 276, § 100K",
    blankPdfInSource: false,
    sourceFileName: null
  }
];
