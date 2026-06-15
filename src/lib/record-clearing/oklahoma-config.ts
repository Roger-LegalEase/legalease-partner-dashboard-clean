import {
  okEligibilityRules,
  okWaitingPeriodNotes,
  okFilingInstructions,
  okDisqualifyingOffenseNotes,
  okPlainLanguage,
  okSafetyDisclaimer
} from "../rcap/state-packs/oklahoma";
import type {
  PleadingTrackConfig,
  PleadingPresentation
} from "./renderers/custom-pleading-renderer";

export type OkPleadingTrack = "adult_section_18_19_expungement" | "adult_991c_deferred_expungement";

export interface OkPleadingEligibilityPath {
  id: string;
  label: string;
  statute: { citation: string | null; description: string };
}

// Oklahoma's statutory Petition to Expunge Records (22 O.S. § 18a) captions the
// movant first: "[Name], Petitioner, vs. THE STATE OF OKLAHOMA, Respondent." The
// verification is a declaration under penalty of perjury (statutory form), and a
// Section 19 order seals the court, arrest, and criminal history records.
const okPresentation: PleadingPresentation = {
  sovereignPartyName: "THE STATE OF OKLAHOMA",
  sovereignPartyProper: "the State of Oklahoma",
  sovereignRole: "Respondent",
  movantRole: "Petitioner",
  filingNoun: "Petition",
  divisionLine: "",
  usesCounty: false,
  courtName: "District Court of {county} County, State of Oklahoma",
  venueDescriptor: "{county} County, Oklahoma",
  recordCustodianLead:
    "The Oklahoma State Bureau of Investigation, the district attorney, and the court clerk",
  verificationVerb: "declare under penalty of perjury",
  verificationPenaltyLabel: "the penalties for a false statement",
  serviceRecipientLabel:
    "the district attorney, the arresting agency, the Oklahoma State Bureau of Investigation, and any other agency holding records",
  serviceRecipientAddressLabel:
    "[DISTRICT ATTORNEY / ARRESTING AGENCY / OSBI ADDRESSES — CONFIRM BEFORE SERVICE]",
  movantFirstInCaption: true
};

// The statutory Petition form uses a declaration under penalty of perjury, not a
// separate verification statute citation; left null and not invented.
const okVerificationStatute = {
  citation: null,
  description:
    "Oklahoma's statutory Petition to Expunge Records (22 O.S. § 18a) uses a declaration under penalty of perjury; confirm the current statutory form and any local requirements with counsel."
};

const okServiceNote = okFilingInstructions[3];

const okCommonCounselFlags = [
  `Expungement means sealing: ${okPlainLanguage.expungementMeansSealing}`,
  `Scope limits: ${okDisqualifyingOffenseNotes[4]}`,
  `Attorney/legal-aid review: ${okDisqualifyingOffenseNotes[3]}`,
  okVerificationStatute.description,
  "Caption should name the specific county and the exact eligibility category under 22 O.S. § 18; the petition is filed where the arrest information is located, and separate counties require separate petitions. Confirm before filing."
];

export const okSection1819ExpungementConfig: PleadingTrackConfig = {
  jurisdictionCode: "OK",
  trackId: "adult_section_18_19_expungement",
  templateGrade: "legal_ops_custom_pleading",
  templateLifecycle: "replacement_candidate",
  primaryReliefTerm: "expungement",
  documentTitleFull: "PETITION TO EXPUNGE RECORDS PURSUANT TO TITLE 22 O.S. SECTIONS 18 AND 19",
  courtCaption: "IN THE DISTRICT COURT OF THE STATE OF OKLAHOMA",
  primaryStatutoryAuthority: [
    {
      citation: "22 O.S. §§ 18-19",
      description: okEligibilityRules[1]
    },
    {
      citation: "22 O.S. § 19",
      description: okEligibilityRules[4]
    }
  ],
  verificationStatute: okVerificationStatute,
  includeProposedOrder: true,
  includeCertificateOfService: true,
  serviceNote: okServiceNote,
  presentation: {
    ...okPresentation,
    reliefActionVerb: "seal",
    orderActionVerb: "seal",
    recordsScopePhrase: "the court, arrest, and criminal history records (sealed pursuant to 22 O.S. § 19)"
  },
  counselFlags: [
    ...okCommonCounselFlags,
    `Waiting periods (Section 18): ${okWaitingPeriodNotes.otherMisdemeanorConviction} ${okWaitingPeriodNotes.oneNonviolentFelonyConviction} ${okWaitingPeriodNotes.twoFelonyConvictions}`,
    `Balancing test and notice: ${okFilingInstructions[4]} ${okWaitingPeriodNotes.section19Notice}`,
    `Excluded offenses: ${okDisqualifyingOffenseNotes[0]} ${okDisqualifyingOffenseNotes[1]}`
  ]
};

export const ok991cDeferredExpungementConfig: PleadingTrackConfig = {
  jurisdictionCode: "OK",
  trackId: "adult_991c_deferred_expungement",
  templateGrade: "legal_ops_custom_pleading",
  templateLifecycle: "replacement_candidate",
  primaryReliefTerm: "expungement",
  documentTitleFull: "MOTION TO EXPUNGE COURT RECORD PURSUANT TO 22 O.S. § 991c",
  courtCaption: "IN THE DISTRICT COURT OF THE STATE OF OKLAHOMA",
  primaryStatutoryAuthority: [
    {
      citation: "22 O.S. § 991c",
      description: okEligibilityRules[3]
    }
  ],
  verificationStatute: okVerificationStatute,
  includeProposedOrder: true,
  includeCertificateOfService: true,
  serviceNote: okServiceNote,
  presentation: {
    ...okPresentation,
    filingNoun: "Motion",
    reliefActionVerb: "expunge",
    orderActionVerb: "expunge",
    recordCustodianLead: "The court clerk",
    recordsScopePhrase:
      "the deferred-sentence plea and court record (the OSBI arrest record requires separate Section 18/19 relief)"
  },
  counselFlags: [
    ...okCommonCounselFlags,
    `991(c) limit: ${okPlainLanguage.section991cCaution}`,
    `Arrest record not removed: ${okDisqualifyingOffenseNotes[5]}`
  ]
};

export const okPleadingConfigs: Record<OkPleadingTrack, PleadingTrackConfig> = {
  adult_section_18_19_expungement: okSection1819ExpungementConfig,
  adult_991c_deferred_expungement: ok991cDeferredExpungementConfig
};

// Eligibility paths — citations sourced from the OK state pack (Section 18/19
// expungement, § 991c deferred court-record expungement) and waiting-period notes.
export const okEligibilityPaths: Record<string, OkPleadingEligibilityPath> = {
  misdemeanor_deferred_dismissal: {
    id: "misdemeanor_deferred_dismissal",
    label: "Misdemeanor deferred dismissal expungement (Section 18)",
    statute: {
      citation: "22 O.S. §§ 18-19",
      description: okWaitingPeriodNotes.misdemeanorDeferredDismissal
    }
  },
  nonviolent_felony_deferred_dismissal: {
    id: "nonviolent_felony_deferred_dismissal",
    label: "Nonviolent felony deferred dismissal expungement (Section 18)",
    statute: {
      citation: "22 O.S. §§ 18-19",
      description: okWaitingPeriodNotes.nonviolentFelonyDeferredDismissal
    }
  },
  one_nonviolent_felony_conviction: {
    id: "one_nonviolent_felony_conviction",
    label: "One nonviolent felony conviction expungement (Section 18)",
    statute: {
      citation: "22 O.S. §§ 18-19",
      description: okWaitingPeriodNotes.oneNonviolentFelonyConviction
    }
  },
  reclassified_felony: {
    id: "reclassified_felony",
    label: "Nonviolent felony reclassified as misdemeanor expungement (Section 18)",
    statute: {
      citation: "22 O.S. § 18a",
      description: okWaitingPeriodNotes.reclassifiedFelony
    }
  },
  section_991c_deferred: {
    id: "section_991c_deferred",
    label: "Section 991(c) deferred-sentence court-record expungement",
    statute: {
      citation: "22 O.S. § 991c",
      description: okEligibilityRules[3]
    }
  }
};

export const okSafetyLanguage = okSafetyDisclaimer;

export function getOkPleadingConfig(trackId: OkPleadingTrack): PleadingTrackConfig {
  return okPleadingConfigs[trackId];
}
