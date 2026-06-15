// Georgia forms / petitions catalog. Sourced from the Georgia Agent Training
// Reference (section 5) and the official GBI "Request to Restrict Arrest Record"
// form present in the Nationwide source folder. Research metadata only — no PDF
// field map exists yet and no renderer is wired. The GBI form is an
// administrative agency application (not a court pleading); the SB 288 petition
// and the § 35-3-37(m) motion are court documents.
export interface GaOfficialForm {
  formName: string;
  kind: "agency_application" | "court_petition" | "court_motion";
  pathway: string;
  citation: string;
  officialPdfInSource: boolean;
  sourceFileName: string | null;
}

export const gaOfficialForms: GaOfficialForm[] = [
  {
    formName: "Request to Restrict Arrest Record (GBI/GCIC)",
    kind: "agency_application",
    pathway:
      "Non-conviction restriction, mainly pre-July-1-2013 arrests or to correct a record not auto-restricted; Section Three is completed by the prosecutor",
    citation: "O.C.G.A. § 35-3-37(h)",
    officialPdfInSource: true,
    sourceFileName: "Request to Restrict Record Application and Instructions form.pdf"
  },
  {
    formName: "Petition for Record Restriction and Sealing",
    kind: "court_petition",
    pathway:
      "SB 288 misdemeanor-conviction restriction and sealing, filed in the Superior/State Court of the county of conviction, with a proposed order and the GCIC history attached",
    citation: "O.C.G.A. § 35-3-37(j)(4)",
    officialPdfInSource: false,
    sourceFileName: null
  },
  {
    formName: "Petition for Restriction of a Pardoned Felony",
    kind: "court_petition",
    pathway: "Felony conviction pardoned by the State Board of Pardons and Paroles",
    citation: "O.C.G.A. § 35-3-37(j)(7)",
    officialPdfInSource: false,
    sourceFileName: null
  },
  {
    formName: "Motion / Petition to Seal Court Records",
    kind: "court_motion",
    pathway: "Separate second step to seal the clerk of court's file after restriction",
    citation: "O.C.G.A. § 35-3-37(m)",
    officialPdfInSource: false,
    sourceFileName: null
  }
];

// Note: Georgia statewide court petitions for SB 288 / sealing are not a single
// mandatory statewide PDF; counties vary. The only official PDF present in the
// Nationwide source is the GBI agency application above.
