// Florida forms catalog. Sourced from the Florida Wilma Agent Training Reference
// (section 3) and the cited FDLE process pages. Research metadata only — no PDF
// field map exists yet and no renderer is wired. Florida's normal route is
// gated by an FDLE official application (Certificate of Eligibility); the court
// petition/sworn-statement/proposed-order are court documents that vary by
// circuit. No official Florida PDFs are present in the Nationwide source folder
// (only the Wilma RTF, the agent-reference PDF, and a modeled HTML artifact).
export interface FlOfficialForm {
  formName: string;
  kind: "fdle_application" | "prosecutor_statement" | "court_petition" | "court_attachment";
  pathway: string;
  citation: string;
}

export const flOfficialForms: FlOfficialForm[] = [
  {
    formName: "FDLE Application for Certificate of Eligibility",
    kind: "fdle_application",
    pathway: "Normal court-ordered sealing or expunction — required first step",
    citation: "Fla. Stat. §§ 943.0585, 943.059"
  },
  {
    formName: "State Attorney / Statewide Prosecutor Written Certified Statement",
    kind: "prosecutor_statement",
    pathway: "Expunction (and certain special routes) — attached to the FDLE application",
    citation: "Fla. Stat. § 943.0585"
  },
  {
    formName: "Petition to Seal or Expunge",
    kind: "court_petition",
    pathway: "Filed in court after FDLE issues the certificate, with the certificate attached",
    citation: "Fla. Stat. §§ 943.0585, 943.059"
  },
  {
    formName: "Sworn Statement / Affidavit",
    kind: "court_attachment",
    pathway: "Attached to the court petition — petitioner attests to meeting the requirements",
    citation: "Fla. Stat. §§ 943.0585, 943.059"
  },
  {
    formName: "Proposed Order to Seal or Expunge",
    kind: "court_attachment",
    pathway: "Attached to the court petition for the judge's signature",
    citation: "Fla. Stat. §§ 943.0585, 943.059"
  },
  {
    formName: "Human Trafficking Victim Expunction Petition",
    kind: "court_petition",
    pathway: "Special victim route — sworn statement and supporting documentation if available",
    citation: "Fla. Stat. § 943.0583"
  },
  {
    formName: "FDLE Lawful Self-Defense Expungement Application",
    kind: "fdle_application",
    pathway: "Lawful self-defense — uses the dedicated FDLE process, not the normal packet",
    citation: "Fla. Stat. § 943.0578"
  },
  {
    formName: "FDLE Juvenile Diversion Expungement Application",
    kind: "fdle_application",
    pathway: "Juvenile diversion route",
    citation: "Fla. Stat. § 943.0582"
  },
  {
    formName: "FDLE Early Juvenile Expungement Application",
    kind: "fdle_application",
    pathway: "Early juvenile route (age 18-20)",
    citation: "Fla. Stat. § 943.0515"
  },
  {
    formName: "FDLE Administrative Expunction Request",
    kind: "fdle_application",
    pathway: "Mistaken / unlawful arrest, with arresting-agency or State Attorney endorsement",
    citation: "Fla. Stat. § 943.0581"
  }
];
