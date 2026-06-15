import {
  ndEligibilityRules,
  ndWaitingPeriodNotes,
  ndFilingInstructions,
  ndDisqualifyingOffenseNotes,
  ndPlainLanguage,
  ndSafetyDisclaimer
} from "../rcap/state-packs/north-dakota";
import type {
  PleadingTrackConfig,
  PleadingPresentation
} from "./renderers/custom-pleading-renderer";

export type NdPleadingTrack = "adult_conviction_sealing" | "adult_dui_sealing";

export interface NdPleadingEligibilityPath {
  id: string;
  label: string;
  statute: { citation: string | null; description: string };
}

// North Dakota criminal cases caption "State of North Dakota, Plaintiff, v.
// [Name], Defendant"; a petition to seal is filed in the existing criminal case
// and the source refers to the filer as the petitioner.
const ndPresentation: PleadingPresentation = {
  sovereignPartyName: "STATE OF NORTH DAKOTA",
  sovereignPartyProper: "the State of North Dakota",
  sovereignRole: "Plaintiff",
  movantRole: "Petitioner",
  filingNoun: "Petition",
  divisionLine: "",
  usesCounty: false,
  courtName: "District Court of {county} County, North Dakota",
  venueDescriptor: "{county} County, North Dakota",
  recordCustodianLead: "The Clerk of the District Court and the prosecuting attorney",
  verificationVerb: "verify",
  verificationPenaltyLabel: "the penalties for a false statement",
  serviceRecipientLabel: "the prosecuting attorney",
  serviceRecipientAddressLabel: "[PROSECUTING ATTORNEY ADDRESS — CONFIRM WITH CLERK OF COURT]"
};

// North Dakota sealing reaches court and prosecution records only (not BCI
// criminal-history or CJDISS data), so the requested-relief scope is narrowed.
const ndRecordsScopePhrase = "the criminal record (court and prosecution records)";

// The source does not state a verification statute for the petition; left null
// and flagged rather than invented.
const ndVerificationStatute = {
  citation: null,
  description:
    "North Dakota petition verification: confirm the required verification/notarization form and any applicable statute with counsel; the source does not specify one."
};

const ndServiceNote = ndFilingInstructions[3];

const ndCommonCounselFlags = [
  `Sealing is not expungement: ${ndPlainLanguage.sealingNotExpungement}`,
  `Agency scope: ${ndDisqualifyingOffenseNotes[4]}`,
  `Attorney review: ${ndDisqualifyingOffenseNotes[5]}`,
  ndVerificationStatute.description,
  "Caption should name the specific county and judicial district and be filed in the existing North Dakota criminal case per local rules; confirm before filing."
];

export const ndConvictionSealingConfig: PleadingTrackConfig = {
  jurisdictionCode: "ND",
  trackId: "adult_conviction_sealing",
  templateGrade: "legal_ops_custom_pleading",
  templateLifecycle: "replacement_candidate",
  primaryReliefTerm: "sealing",
  documentTitleFull:
    "PETITION TO SEAL CRIMINAL RECORDS PURSUANT TO N.D.C.C. CHAPTER 12-60.1",
  courtCaption: "IN THE DISTRICT COURT OF THE STATE OF NORTH DAKOTA",
  // Sealing-focused descriptions for the rendered pleading body. The sealing-vs-
  // expungement contrast (ndEligibilityRules[0]) is user-facing safety guidance,
  // surfaced via counsel flags / safety language, not the court pleading text.
  primaryStatutoryAuthority: [
    {
      citation: "N.D.C.C. Chapter 12-60.1",
      description: ndEligibilityRules[1]
    },
    {
      citation: "N.D.C.C. § 12-60.1-02",
      description: ndEligibilityRules[8]
    }
  ],
  verificationStatute: ndVerificationStatute,
  includeProposedOrder: true,
  includeCertificateOfService: true,
  serviceNote: ndServiceNote,
  presentation: {
    ...ndPresentation,
    reliefActionVerb: "seal",
    orderActionVerb: "seal",
    recordsScopePhrase: ndRecordsScopePhrase
  },
  counselFlags: [
    ...ndCommonCounselFlags,
    `Waiting period — misdemeanor: ${ndWaitingPeriodNotes.misdemeanorConvictionSealing} Felony: ${ndWaitingPeriodNotes.felonyConvictionSealing} ${ndWaitingPeriodNotes.sentenceCompletionNote}`,
    `Burden and timing: ${ndFilingInstructions[5]}`,
    `Excluded offenses — registration: ${ndDisqualifyingOffenseNotes[0]} Violence/intimidation: ${ndDisqualifyingOffenseNotes[1]}`
  ]
};

export const ndDuiSealingConfig: PleadingTrackConfig = {
  jurisdictionCode: "ND",
  trackId: "adult_dui_sealing",
  templateGrade: "legal_ops_custom_pleading",
  templateLifecycle: "replacement_candidate",
  primaryReliefTerm: "sealing",
  documentTitleFull: "PETITION TO SEAL DUI RECORDS PURSUANT TO N.D.C.C. § 39-08-01.6",
  courtCaption: "IN THE DISTRICT COURT OF THE STATE OF NORTH DAKOTA",
  primaryStatutoryAuthority: [
    {
      citation: "N.D.C.C. § 39-08-01.6",
      description: ndEligibilityRules[3]
    }
  ],
  verificationStatute: ndVerificationStatute,
  includeProposedOrder: true,
  includeCertificateOfService: true,
  serviceNote: ndServiceNote,
  presentation: {
    ...ndPresentation,
    reliefActionVerb: "seal",
    orderActionVerb: "seal",
    recordsScopePhrase: ndRecordsScopePhrase
  },
  counselFlags: [
    ...ndCommonCounselFlags,
    `DUI clean period: ${ndWaitingPeriodNotes.duiSealing}`,
    `DUI exclusions: ${ndDisqualifyingOffenseNotes[2]}`,
    "DUI sealing uses § 39-08-01.6, not the general Chapter 12-60.1 process; it may be filed in municipal or district court depending on the case. Confirm the correct court before filing."
  ]
};

export const ndPleadingConfigs: Record<NdPleadingTrack, PleadingTrackConfig> = {
  adult_conviction_sealing: ndConvictionSealingConfig,
  adult_dui_sealing: ndDuiSealingConfig
};

// Eligibility paths — citations sourced from the ND state pack (Chapter 12-60.1
// conviction sealing, § 39-08-01.6 DUI sealing, § 12-60.1-05 nonconviction
// closing) and waiting-period notes.
export const ndEligibilityPaths: Record<string, NdPleadingEligibilityPath> = {
  conviction_sealing_misdemeanor: {
    id: "conviction_sealing_misdemeanor",
    label: "Misdemeanor conviction sealing under Chapter 12-60.1",
    statute: {
      citation: "N.D.C.C. § 12-60.1-02",
      description: ndWaitingPeriodNotes.misdemeanorConvictionSealing
    }
  },
  conviction_sealing_felony: {
    id: "conviction_sealing_felony",
    label: "Felony conviction sealing under Chapter 12-60.1",
    statute: {
      citation: "N.D.C.C. § 12-60.1-02",
      description: ndWaitingPeriodNotes.felonyConvictionSealing
    }
  },
  dui_sealing: {
    id: "dui_sealing",
    label: "DUI record sealing under § 39-08-01.6",
    statute: {
      citation: "N.D.C.C. § 39-08-01.6",
      description: ndWaitingPeriodNotes.duiSealing
    }
  },
  nonconviction_closing: {
    id: "nonconviction_closing",
    label: "Nonconviction court record closing under § 12-60.1-05",
    statute: {
      citation: "N.D.C.C. § 12-60.1-05",
      description: ndWaitingPeriodNotes.nonconvictionAutomaticClose
    }
  }
};

export const ndSafetyLanguage = ndSafetyDisclaimer;

export function getNdPleadingConfig(trackId: NdPleadingTrack): PleadingTrackConfig {
  return ndPleadingConfigs[trackId];
}
