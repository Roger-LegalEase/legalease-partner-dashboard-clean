import {
  dcEligibilityRules,
  dcFilingInstructions,
  dcCautionNotes,
  dcWaitingPeriodNotes,
  dcSafetyDisclaimer,
  dcPlainLanguage
} from "../rcap/state-packs/dc";
import type {
  PleadingTrackConfig,
  PleadingPresentation
} from "./renderers/custom-pleading-renderer";

export type DcPleadingTrack = "adult_motion_to_seal" | "adult_motion_to_expunge";

export interface DcPleadingEligibilityPath {
  id: string;
  label: string;
  statute: { citation: string | null; description: string };
}

// DC criminal motions are filed in Superior Court; the movant is the defendant in
// the underlying case, and the prosecuting authority is either the U.S. Attorney's
// Office for DC or the DC Office of the Attorney General depending on the case.
const dcPresentation: PleadingPresentation = {
  sovereignPartyName: "DISTRICT OF COLUMBIA",
  sovereignPartyProper: "the District of Columbia",
  sovereignRole: "Respondent",
  movantRole: "Movant",
  filingNoun: "Motion",
  divisionLine: "CRIMINAL DIVISION",
  usesCounty: false,
  courtName: "Superior Court of the District of Columbia",
  venueDescriptor: "the District of Columbia",
  recordCustodianLead:
    "The Metropolitan Police Department and the Superior Court of the District of Columbia",
  verificationVerb: "declare under penalty of perjury",
  verificationPenaltyLabel: "the penalties for making a false statement",
  serviceRecipientLabel:
    "the prosecutor of record (the United States Attorney's Office for the District of Columbia or the District of Columbia Office of the Attorney General)",
  serviceRecipientAddressLabel:
    "[PROSECUTOR ADDRESS — CONFIRM USAO-DC OR DC OAG FOR THIS CASE]"
};

// DC has no PA-style unsworn-falsification statute baked into these motions; the
// verification is a declaration under penalty of perjury. Citation left null and
// flagged for counsel rather than invented.
const dcVerificationStatute = {
  citation: null,
  description:
    "DC motion verification is a declaration under penalty of perjury; confirm the exact declaration/notarization form with counsel and current Superior Court practice."
};

// Shared service note sourced from the DC state pack filing instructions.
const dcServiceNote = dcFilingInstructions[3];

// Shared counsel/source flags sourced from the DC state pack. DC automatic relief
// is statutory but not yet operational, and several disqualifiers and showings
// require human review before filing.
const dcCommonCounselFlags = [
  `Automatic relief caution: ${dcPlainLanguage.automaticCare}`,
  `Prosecutor identity: ${dcFilingInstructions[3]}`,
  `Eligibility exclusions: ${dcCautionNotes[1]}`,
  `Records scope: ${dcCautionNotes[3]}`,
  dcVerificationStatute.description
];

export const dcMotionToSealConfig: PleadingTrackConfig = {
  jurisdictionCode: "DC",
  trackId: "adult_motion_to_seal",
  templateGrade: "legal_ops_custom_pleading",
  templateLifecycle: "replacement_candidate",
  primaryReliefTerm: "sealing",
  documentTitleFull: "MOTION TO SEAL CRIMINAL RECORDS PURSUANT TO D.C. CODE § 16-806",
  courtCaption: "SUPERIOR COURT OF THE DISTRICT OF COLUMBIA",
  primaryStatutoryAuthority: [
    {
      citation: "D.C. Code § 16-806",
      description: dcEligibilityRules[5]
    }
  ],
  verificationStatute: dcVerificationStatute,
  includeProposedOrder: true,
  includeCertificateOfService: true,
  serviceNote: dcServiceNote,
  presentation: { ...dcPresentation, reliefActionVerb: "seal", orderActionVerb: "seal" },
  counselFlags: [
    ...dcCommonCounselFlags,
    `Interests-of-justice showing: ${dcCautionNotes[0]}`,
    `Conviction sealing waiting periods — misdemeanor: ${dcWaitingPeriodNotes.misdemeanorMotionSealing} Felony: ${dcWaitingPeriodNotes.felonyMotionSealing} ${dcWaitingPeriodNotes.monetaryPenaltyNote}`,
    "By-motion sealing requires a preponderance-of-the-evidence interests-of-justice showing and a complete statement of the movant's unsealed and unexpunged history; confirm the full record before filing."
  ]
};

export const dcMotionToExpungeConfig: PleadingTrackConfig = {
  jurisdictionCode: "DC",
  trackId: "adult_motion_to_expunge",
  templateGrade: "legal_ops_custom_pleading",
  templateLifecycle: "replacement_candidate",
  primaryReliefTerm: "expungement",
  documentTitleFull: "MOTION TO EXPUNGE CRIMINAL RECORDS PURSUANT TO D.C. CODE § 16-803",
  courtCaption: "SUPERIOR COURT OF THE DISTRICT OF COLUMBIA",
  primaryStatutoryAuthority: [
    {
      citation: "D.C. Code § 16-803",
      description: dcEligibilityRules[4]
    }
  ],
  verificationStatute: dcVerificationStatute,
  includeProposedOrder: true,
  includeCertificateOfService: true,
  serviceNote: dcServiceNote,
  presentation: { ...dcPresentation, reliefActionVerb: "expunge", orderActionVerb: "expunge" },
  counselFlags: [
    ...dcCommonCounselFlags,
    `Actual-innocence basis: ${dcWaitingPeriodNotes.actualInnocenceExpungement}`,
    "By-motion expungement under § 16-803 requires an actual-innocence showing; an acquittal or dismissal alone does not create a presumption of innocence. Confirm the evidentiary basis with counsel."
  ]
};

export const dcPleadingConfigs: Record<DcPleadingTrack, PleadingTrackConfig> = {
  adult_motion_to_seal: dcMotionToSealConfig,
  adult_motion_to_expunge: dcMotionToExpungeConfig
};

// Eligibility paths — citations sourced from the DC state pack eligibility rules
// (§ 16-803 actual-innocence expungement, § 16-806 interests-of-justice sealing)
// and waiting-period notes.
export const dcEligibilityPaths: Record<string, DcPleadingEligibilityPath> = {
  motion_actual_innocence_expungement: {
    id: "motion_actual_innocence_expungement",
    label: "Motion to expunge based on actual innocence",
    statute: {
      citation: "D.C. Code § 16-803",
      description: dcWaitingPeriodNotes.actualInnocenceExpungement
    }
  },
  motion_interests_of_justice_sealing_misdemeanor: {
    id: "motion_interests_of_justice_sealing_misdemeanor",
    label: "Motion to seal misdemeanor conviction based on interests of justice",
    statute: {
      citation: "D.C. Code § 16-806",
      description: dcWaitingPeriodNotes.misdemeanorMotionSealing
    }
  },
  motion_interests_of_justice_sealing_felony: {
    id: "motion_interests_of_justice_sealing_felony",
    label: "Motion to seal eligible felony conviction based on interests of justice",
    statute: {
      citation: "D.C. Code § 16-806",
      description: dcWaitingPeriodNotes.felonyMotionSealing
    }
  },
  motion_interests_of_justice_sealing_non_conviction: {
    id: "motion_interests_of_justice_sealing_non_conviction",
    label: "Motion to seal non-conviction based on interests of justice",
    statute: {
      citation: "D.C. Code § 16-806",
      description: dcWaitingPeriodNotes.nonConvictionAutomaticSealing
    }
  }
};

export const dcSafetyLanguage = dcSafetyDisclaimer;

export function getDcPleadingConfig(trackId: DcPleadingTrack): PleadingTrackConfig {
  return dcPleadingConfigs[trackId];
}
