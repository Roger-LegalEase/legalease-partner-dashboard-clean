// Nevada record-sealing source forms catalog. Sourced from the Nevada
// Record-Sealing Reference for Wilma (section 8 packet components) and the form
// PDFs present in the Nationwide source folder. Research metadata only — no PDF
// field map exists yet and no renderer is wired. Unlike a mandatory-statewide-form
// state, Nevada procedures vary by county and the packet is a set of pleadings
// (petition, affidavit, stipulation, proposed order) prepared from the verified
// criminal-history record; district and justice courts use different packets.
//
// SOURCE GAP: the exact published titles / form numbers inside these PDFs could
// not be machine-extracted in this environment, so officialName below reflects
// the source-folder filename and the Wilma-described role, not a verbatim PDF
// title. Confirm the current county/court form titles before any field mapping.
export interface NvSourceForm {
  formId: string | null;
  officialName: string;
  role: "petition" | "affidavit" | "stipulation" | "order" | "instructions" | "court_packet" | "dps_form";
  court: "district" | "justice" | "any" | "dps";
  blankPdfInSource: boolean;
  sourceFileName: string | null;
}

export const nvSourceForms: NvSourceForm[] = [
  {
    formId: "DPS-006",
    officialName: "Nevada DPS record-sealing / criminal-history form (DPS-006)",
    role: "dps_form",
    court: "dps",
    blankPdfInSource: true,
    sourceFileName: "DPS-006.pdf"
  },
  {
    formId: null,
    officialName: "District Court record-sealing form (updated 2018)",
    role: "petition",
    court: "district",
    blankPdfInSource: true,
    sourceFileName: "dc-record-sealing-form-updated-2018.pdf"
  },
  {
    formId: null,
    officialName: "Justice Court record-sealing form (updated 2018)",
    role: "petition",
    court: "justice",
    blankPdfInSource: true,
    sourceFileName: "jc-record-sealing-form-updated-2018.pdf"
  },
  {
    formId: null,
    officialName: "District Court record-sealing forms packet",
    role: "court_packet",
    court: "district",
    blankPdfInSource: true,
    sourceFileName: "district-court-forms.pdf"
  },
  {
    formId: null,
    officialName: "Justice Court record-sealing forms packet",
    role: "court_packet",
    court: "justice",
    blankPdfInSource: true,
    sourceFileName: "justice-court-forms.pdf"
  },
  {
    formId: null,
    officialName: "Sealing Records booklet (instructions / overview)",
    role: "instructions",
    court: "any",
    blankPdfInSource: true,
    sourceFileName: "sealing-records-booklet.pdf"
  }
];

// Packet components described by the Wilma reference (section 8): Petition to Seal
// Records, Affidavit/Declaration in Support, Stipulation to Seal Records, proposed
// Order to Seal Records, current verified Nevada criminal-history report, case
// dispositions/judgment/docket entries, agency/custodian list, and a civil cover
// sheet / fee-waiver request if required locally.
export const nvPacketComponents: string[] = [
  "Petition to Seal Records",
  "Affidavit or Declaration in Support of Petition",
  "Stipulation to Seal Records (for prosecutor review)",
  "Order to Seal Records (proposed)",
  "Current verified Nevada criminal-history report",
  "Case dispositions / judgment / docket entries",
  "Agency / custodian list for all record holders",
  "Civil cover sheet and fee-waiver request, if required locally"
];
