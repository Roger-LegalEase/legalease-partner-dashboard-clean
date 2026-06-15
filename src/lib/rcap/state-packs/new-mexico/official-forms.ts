// Official New Mexico expungement forms catalog. Sourced from the New Mexico
// Expungement Reference for Wilma (section 3, which lists the three court-petition
// forms 4-951 / 4-952 / 4-953) and the official New Mexico Rules of Court 4-95x
// PDFs present in the Nationwide source folder. Research metadata only — no PDF
// field map exists yet and no renderer is wired. New Mexico is an overlay /
// official-form state (mandatory statewide forms). The 4-955/4-958/4-959/4-960.x
// supporting forms are present as blank PDFs in the source folder; their titles
// below come from the source-folder filenames (the Wilma reference itemizes only
// the three petitions). The cannabis route uses the AOC's "Application for
// Expungement of Court Records involving Cannabis," which is NOT present as a
// blank PDF in the source folder (source gap).
export interface NmOfficialForm {
  formNumber: string | null;
  officialName: string;
  role: "petition" | "certificate_of_service" | "notice" | "affirmation" | "application";
  citation: string;
  blankPdfInSource: boolean;
  sourceFileName: string | null;
}

export const nmOfficialForms: NmOfficialForm[] = [
  {
    formNumber: "4-951",
    officialName: "Petition to Expunge Arrest Records and Public Records; Identity Theft",
    role: "petition",
    citation: "NMSA 1978 § 29-3A-3",
    blankPdfInSource: true,
    sourceFileName:
      "4-951-Petition-to-expunge-arrest-records-and-public-records-identity-theft.-1.pdf"
  },
  {
    formNumber: "4-952",
    officialName:
      "Petition to Expunge Arrest Records and Public Records; Upon Release Without Conviction",
    role: "petition",
    citation: "NMSA 1978 § 29-3A-4",
    blankPdfInSource: true,
    sourceFileName:
      "4-952-Petition-to-expunge-arrest-records-and-public-records-upon-release-without-conviction.-1.pdf"
  },
  {
    formNumber: "4-953",
    officialName: "Petition to Expunge Arrest Records and Public Records; Upon Conviction",
    role: "petition",
    citation: "NMSA 1978 § 29-3A-5",
    blankPdfInSource: true,
    sourceFileName:
      "4-953-Petition-to-expunge-arrest-records-and-public-records-upon-conviction.-1.pdf"
  },
  {
    formNumber: "4-955",
    officialName: "Certificate of Service; Expungement of Records Upon Release Without Conviction",
    role: "certificate_of_service",
    citation: "NMSA 1978 § 29-3A-4",
    blankPdfInSource: true,
    sourceFileName:
      "4-955-Certificate-of-service-expungement-of-records-upon-release-without-conviction.pdf"
  },
  {
    formNumber: "4-958",
    officialName: "Notice of Non-Objection to Petition to Expunge Records",
    role: "notice",
    citation: "NMSA 1978 §§ 29-3A-4, 29-3A-5",
    blankPdfInSource: true,
    sourceFileName: "4-958-Notice-of-non-objection-to-petition-to-expunge-records.pdf"
  },
  {
    formNumber: "4-959",
    officialName: "Notice of Completion of Briefing; Upon Release Without Conviction",
    role: "notice",
    citation: "NMSA 1978 § 29-3A-4",
    blankPdfInSource: true,
    sourceFileName: "4-959-Notice-of-completion-of-briefing-upon-release-without-conviction.pdf"
  },
  {
    formNumber: "4-960.1",
    officialName: "Notice of Hearing",
    role: "notice",
    citation: "NMSA 1978 §§ 29-3A-4, 29-3A-5",
    blankPdfInSource: true,
    sourceFileName: "4-960.1-Notice-of-hearing.pdf"
  },
  {
    formNumber: "4-960.2",
    officialName: "Affirmation in Support of Expungement; Upon Release Without Conviction",
    role: "affirmation",
    citation: "NMSA 1978 § 29-3A-4",
    blankPdfInSource: true,
    sourceFileName: "4-960.2-Affirmation-in-support-of-expungement-upon-release-without-conviction.pdf"
  },
  {
    formNumber: null,
    officialName: "Application for Expungement of Court Records involving Cannabis (AOC process)",
    role: "application",
    citation: "NMSA 1978 § 29-3A-8",
    blankPdfInSource: false,
    sourceFileName: null
  }
];

// Petition-to-pathway selection (from the Wilma reference, section 3):
// - 4-951: identity-theft route (§ 29-3A-3)
// - 4-952: release-without-conviction route (§ 29-3A-4)
// - 4-953: conviction route (§ 29-3A-5)
export const nmPetitionSelection: Array<{ situation: string; formNumber: string }> = [
  { situation: "Wrongly identified because of identity theft (§ 29-3A-3)", formNumber: "4-951" },
  { situation: "Released without conviction (§ 29-3A-4)", formNumber: "4-952" },
  { situation: "Eligible conviction after the waiting period (§ 29-3A-5)", formNumber: "4-953" }
];
