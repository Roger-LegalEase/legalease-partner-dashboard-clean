import {
  wyEligibilityRules,
  wyWaitingPeriodNotes,
  wyFilingInstructions,
  wyDisqualifyingOffenseNotes,
  wyPlainLanguage,
  wySafetyDisclaimer
} from "../rcap/state-packs/wyoming";
import type {
  PleadingTrackConfig,
  PleadingPresentation
} from "./renderers/custom-pleading-renderer";

export type WyPleadingTrack =
  | "adult_nonconviction_expungement"
  | "adult_misdemeanor_conviction_expungement"
  | "adult_felony_conviction_expungement";

export interface WyPleadingEligibilityPath {
  id: string;
  label: string;
  statute: { citation: string | null; description: string };
}

// Wyoming expungement petitions are filed in the original criminal case; the
// State of Wyoming is the respondent and the filer is the petitioner. For adults,
// expungement seals records from public dissemination (visible to law enforcement),
// so the requested relief is worded as sealing, not destruction.
const wyPresentation: PleadingPresentation = {
  sovereignPartyName: "STATE OF WYOMING",
  sovereignPartyProper: "the State of Wyoming",
  sovereignRole: "Respondent",
  movantRole: "Petitioner",
  filingNoun: "Petition",
  divisionLine: "",
  usesCounty: false,
  courtName: "District Court of {county} County, State of Wyoming",
  venueDescriptor: "{county} County, Wyoming",
  recordCustodianLead: "The Wyoming Division of Criminal Investigation and the clerk of court",
  verificationVerb: "verify",
  verificationPenaltyLabel: "the penalties for a false statement",
  serviceRecipientLabel: "the prosecuting attorney",
  serviceRecipientAddressLabel:
    "[PROSECUTING ATTORNEY / DCI ADDRESSES — CONFIRM BEFORE SERVICE]",
  reliefActionVerb: "expunge",
  orderActionVerb: "expunge"
};

// Wyoming requires a verified Petition for Expungement; the source does not cite a
// separate verification statute, so the citation is left null and flagged.
const wyVerificationStatute = {
  citation: null,
  description:
    "Wyoming requires a verified Petition for Expungement; confirm the verification/notarization form with the court. The source does not cite a separate verification statute."
};

const wyCommonCounselFlags = [
  `Adult expungement is sealing: ${wyPlainLanguage.adultExpungementIsSealing}`,
  `Scope limits: ${wyDisqualifyingOffenseNotes[5]}`,
  `Deferred-disposition trap: ${wyPlainLanguage.deferredTrap}`,
  wyVerificationStatute.description,
  "File in the correct Wyoming court (the court where the proceeding occurred for non-conviction routes, or the convicting court for conviction routes — district, circuit, or municipal as applicable); do not invent a statewide form number. Confirm before filing."
];

export const wyNonconvictionExpungementConfig: PleadingTrackConfig = {
  jurisdictionCode: "WY",
  trackId: "adult_nonconviction_expungement",
  templateGrade: "legal_ops_custom_pleading",
  templateLifecycle: "replacement_candidate",
  primaryReliefTerm: "expungement",
  documentTitleFull: "PETITION FOR EXPUNGEMENT PURSUANT TO W.S. § 7-13-1401",
  courtCaption: "IN THE DISTRICT COURT OF THE STATE OF WYOMING",
  primaryStatutoryAuthority: [
    {
      citation: "Wyo. Stat. § 7-13-1401",
      description: wyEligibilityRules[1]
    }
  ],
  verificationStatute: wyVerificationStatute,
  includeProposedOrder: true,
  includeCertificateOfService: true,
  serviceNote: wyFilingInstructions[1],
  presentation: {
    ...wyPresentation,
    serviceRecipientLabel: "the prosecuting attorney",
    recordsScopePhrase:
      "the criminal records, sealing them from public dissemination as provided by W.S. § 7-13-1401"
  },
  counselFlags: [
    ...wyCommonCounselFlags,
    `Waiting period and objection: ${wyWaitingPeriodNotes.nonConviction} ${wyWaitingPeriodNotes.objectionNonConviction}`,
    `Deferred-disposition exclusion: ${wyDisqualifyingOffenseNotes[3]}`
  ]
};

export const wyMisdemeanorConvictionExpungementConfig: PleadingTrackConfig = {
  jurisdictionCode: "WY",
  trackId: "adult_misdemeanor_conviction_expungement",
  templateGrade: "legal_ops_custom_pleading",
  templateLifecycle: "replacement_candidate",
  primaryReliefTerm: "expungement",
  documentTitleFull:
    "PETITION FOR EXPUNGEMENT OF RECORDS OF CONVICTION PURSUANT TO W.S. § 7-13-1501",
  courtCaption: "IN THE DISTRICT COURT OF THE STATE OF WYOMING",
  primaryStatutoryAuthority: [
    {
      citation: "Wyo. Stat. § 7-13-1501",
      description: wyEligibilityRules[2]
    }
  ],
  verificationStatute: wyVerificationStatute,
  includeProposedOrder: true,
  includeCertificateOfService: true,
  serviceNote: wyFilingInstructions[2],
  presentation: {
    ...wyPresentation,
    serviceRecipientLabel:
      "the prosecuting attorney and the Wyoming Division of Criminal Investigation",
    recordsScopePhrase:
      "the records of conviction, sealing them from public dissemination as provided by W.S. § 7-13-1501"
  },
  counselFlags: [
    ...wyCommonCounselFlags,
    `Waiting period and objection: ${wyWaitingPeriodNotes.misdemeanorStatusOffense} ${wyWaitingPeriodNotes.misdemeanorNonStatusOffense} ${wyWaitingPeriodNotes.objectionMisdemeanor}`,
    `Firearm and health-care bars: ${wyDisqualifyingOffenseNotes[0]} ${wyDisqualifyingOffenseNotes[2]}`,
    `One-time limit and danger finding: ${wyDisqualifyingOffenseNotes[4]}`
  ]
};

export const wyFelonyConvictionExpungementConfig: PleadingTrackConfig = {
  jurisdictionCode: "WY",
  trackId: "adult_felony_conviction_expungement",
  templateGrade: "legal_ops_custom_pleading",
  templateLifecycle: "replacement_candidate",
  primaryReliefTerm: "expungement",
  documentTitleFull:
    "PETITION FOR EXPUNGEMENT OF RECORDS OF CONVICTION PURSUANT TO W.S. § 7-13-1502",
  courtCaption: "IN THE DISTRICT COURT OF THE STATE OF WYOMING",
  primaryStatutoryAuthority: [
    {
      citation: "Wyo. Stat. § 7-13-1502",
      description: wyEligibilityRules[3]
    }
  ],
  verificationStatute: wyVerificationStatute,
  includeProposedOrder: true,
  includeCertificateOfService: true,
  serviceNote: wyFilingInstructions[3],
  presentation: {
    ...wyPresentation,
    serviceRecipientLabel:
      "the prosecuting attorney and the Wyoming Division of Criminal Investigation",
    recordsScopePhrase:
      "the records of conviction, sealing them from public dissemination as provided by W.S. § 7-13-1502"
  },
  counselFlags: [
    ...wyCommonCounselFlags,
    `Waiting period, restitution, and objection: ${wyWaitingPeriodNotes.felony} ${wyWaitingPeriodNotes.objectionFelony}`,
    `Firearm bar and felony exclusions: ${wyDisqualifyingOffenseNotes[0]} ${wyDisqualifyingOffenseNotes[1]}`,
    `One-time limit and danger finding: ${wyDisqualifyingOffenseNotes[4]}`
  ]
};

export const wyPleadingConfigs: Record<WyPleadingTrack, PleadingTrackConfig> = {
  adult_nonconviction_expungement: wyNonconvictionExpungementConfig,
  adult_misdemeanor_conviction_expungement: wyMisdemeanorConvictionExpungementConfig,
  adult_felony_conviction_expungement: wyFelonyConvictionExpungementConfig
};

// Eligibility paths — citations sourced from the WY state pack (§§ 7-13-1401,
// 7-13-1501, 7-13-1502) and waiting-period notes.
export const wyEligibilityPaths: Record<string, WyPleadingEligibilityPath> = {
  nonconviction: {
    id: "nonconviction",
    label: "Adult non-conviction expungement (§ 7-13-1401)",
    statute: {
      citation: "Wyo. Stat. § 7-13-1401",
      description: wyWaitingPeriodNotes.nonConviction
    }
  },
  misdemeanor_status: {
    id: "misdemeanor_status",
    label: "Adult misdemeanor status-offense expungement (§ 7-13-1501)",
    statute: {
      citation: "Wyo. Stat. § 7-13-1501",
      description: wyWaitingPeriodNotes.misdemeanorStatusOffense
    }
  },
  misdemeanor_non_status: {
    id: "misdemeanor_non_status",
    label: "Adult misdemeanor non-status-offense expungement (§ 7-13-1501)",
    statute: {
      citation: "Wyo. Stat. § 7-13-1501",
      description: wyWaitingPeriodNotes.misdemeanorNonStatusOffense
    }
  },
  felony: {
    id: "felony",
    label: "Adult felony expungement (§ 7-13-1502)",
    statute: {
      citation: "Wyo. Stat. § 7-13-1502",
      description: wyWaitingPeriodNotes.felony
    }
  }
};

export const wySafetyLanguage = wySafetyDisclaimer;

export function getWyPleadingConfig(trackId: WyPleadingTrack): PleadingTrackConfig {
  return wyPleadingConfigs[trackId];
}
