import {
  pennsylvaniaEligibilityRules,
  pennsylvaniaWaitingPeriods,
  pennsylvaniaFilingInstructions,
  pennsylvaniaDisqualifyingOffenseNotes,
  pennsylvaniaPathwayLabels
} from "../rcap/state-packs/pennsylvania";
import type { PleadingTrackConfig } from "./renderers/custom-pleading-renderer";

export type PaPleadingTrack = "adult_expungement" | "adult_limited_access" | "adult_clean_slate";

export interface PaPleadingEligibilityPath {
  id: string;
  label: string;
  statute: { citation: string | null; description: string; counselFlag?: string };
}

// 18 Pa.C.S. § 4904 — verified from legacy generator body text verbatim.
const verificationStatute = {
  citation: "18 Pa.C.S. § 4904",
  description: "Unsworn falsification to authorities — verification penalty basis for petition"
};

// Service requirement: state pack filing-instructions[3], sourced from Nationwide Wilma RTF.
const commonServiceNote = pennsylvaniaFilingInstructions[3];

// Citations confirmed from:
//   - src/lib/rcap/state-packs/pennsylvania/eligibility-rules.ts (§ 9122, § 9122.1, § 9122.2)
//   - private/Nationwide Record Clearing/LegalEase Pennsylvania/Wilma RTF (Rule 790, 490, 320, 791)
export const pennsylvaniaExpungementConfig: PleadingTrackConfig = {
  jurisdictionCode: "PA",
  trackId: "adult_expungement",
  templateGrade: "legal_ops_custom_pleading",
  templateLifecycle: "replacement_candidate",
  primaryReliefTerm: "expungement",
  documentTitleFull: "PETITION FOR EXPUNGEMENT PURSUANT TO Pa.R.Crim.P. 790",
  courtCaption: "IN THE COURT OF COMMON PLEAS",
  primaryStatutoryAuthority: [
    {
      citation: "Pa.R.Crim.P. 790",
      description: "Pennsylvania Rule of Criminal Procedure 790 — expungement petition procedure and form"
    },
    {
      citation: "18 Pa.C.S. § 9122",
      description: pennsylvaniaEligibilityRules[0]
    },
    {
      citation: "Pa.R.Crim.P. 490",
      description: "Pennsylvania Rule of Criminal Procedure 490 — automatic acquittal expungement"
    },
    {
      citation: "Pa.R.Crim.P. 320",
      description: "Pennsylvania Rule of Criminal Procedure 320 — ARD expungement on successful completion"
    }
  ],
  verificationStatute,
  includeProposedOrder: true,
  includeCertificateOfService: true,
  serviceNote: commonServiceNote,
  counselFlags: [
    `PATCH report: ${pennsylvaniaFilingInstructions[0]}`,
    "Applicable expungement rule (Pa.R.Crim.P. 790, 490, or 320) depends on specific case type and disposition — confirm the correct pathway with counsel before filing.",
    `Disqualifying offenses: ${pennsylvaniaDisqualifyingOffenseNotes[0]}`
  ]
};

export const pennsylvaniaLimitedAccessConfig: PleadingTrackConfig = {
  jurisdictionCode: "PA",
  trackId: "adult_limited_access",
  templateGrade: "legal_ops_custom_pleading",
  templateLifecycle: "replacement_candidate",
  primaryReliefTerm: "limited access",
  documentTitleFull: "PETITION FOR LIMITED ACCESS (RECORD SEALING)",
  courtCaption: "IN THE COURT OF COMMON PLEAS",
  primaryStatutoryAuthority: [
    {
      citation: "18 Pa.C.S. § 9122.1",
      description: pennsylvaniaEligibilityRules[1]
    },
    {
      citation: "Pa.R.Crim.P. 791",
      description: "Pennsylvania Rule of Criminal Procedure 791 — petition for limited access"
    }
  ],
  verificationStatute,
  includeProposedOrder: true,
  includeCertificateOfService: true,
  serviceNote: commonServiceNote,
  counselFlags: [
    `Offense-grade distinction: ${pennsylvaniaDisqualifyingOffenseNotes[1]}`,
    `Restitution requirement: ${pennsylvaniaDisqualifyingOffenseNotes[4]}`,
    "Property-felony sealing (Clean Slate 3.0): confirm current statute text, 10-year waiting period, and restitution-paid status with counsel before filing."
  ]
};

export const pennsylvaniaCleanSlateConfig: PleadingTrackConfig = {
  jurisdictionCode: "PA",
  trackId: "adult_clean_slate",
  templateGrade: "legal_ops_custom_pleading",
  templateLifecycle: "replacement_candidate",
  primaryReliefTerm: "Clean Slate",
  documentTitleFull: "CLEAN SLATE VERIFICATION NOTES — INFORMATIONAL ONLY, NOT A COURT FILING",
  courtCaption: "IN THE COURT OF COMMON PLEAS",
  primaryStatutoryAuthority: [
    {
      citation: "18 Pa.C.S. § 9122.2",
      description: pennsylvaniaEligibilityRules[2]
    }
  ],
  verificationStatute,
  includeProposedOrder: false,
  includeCertificateOfService: false,
  serviceNote: null,
  counselFlags: [
    "Clean Slate automatic sealing under § 9122.2 is not expungement; do not use Pa.R.Crim.P. 790 petition for Clean Slate matters.",
    `PATCH verification recommended: ${pennsylvaniaFilingInstructions[5]}`
  ]
};

export const pennsylvaniaPleadingConfigs: Record<PaPleadingTrack, PleadingTrackConfig> = {
  adult_expungement: pennsylvaniaExpungementConfig,
  adult_limited_access: pennsylvaniaLimitedAccessConfig,
  adult_clean_slate: pennsylvaniaCleanSlateConfig
};

// All citations confirmed from state pack (§ 9122, § 9122.1, § 9122.2) and Nationwide Wilma RTF
// (Pa.R.Crim.P. 790, 490, 320, 791). Waiting-period text from state pack waiting-periods.ts.
export const pennsylvaniaEligibilityPaths: Record<string, PaPleadingEligibilityPath> = {
  non_conviction: {
    id: "non_conviction",
    label: pennsylvaniaPathwayLabels.expungement_non_conviction,
    statute: {
      citation: "18 Pa.C.S. § 9122",
      description: "Non-conviction expungement under § 9122"
    }
  },
  summary_5_years: {
    id: "summary_5_years",
    label: pennsylvaniaPathwayLabels.expungement_summary_5_years,
    statute: {
      citation: "18 Pa.C.S. § 9122",
      description: `Summary conviction expungement — ${pennsylvaniaWaitingPeriods[2]}`
    }
  },
  ard: {
    id: "ard",
    label: pennsylvaniaPathwayLabels.expungement_ard,
    statute: {
      citation: "Pa.R.Crim.P. 320 / 18 Pa.C.S. § 9122",
      description: `ARD expungement — ${pennsylvaniaWaitingPeriods[3]}`
    }
  },
  pardon: {
    id: "pardon",
    label: pennsylvaniaPathwayLabels.expungement_pardon,
    statute: {
      citation: "18 Pa.C.S. § 9122",
      description: `Pardon expungement — ${pennsylvaniaWaitingPeriods[4]}`
    }
  },
  age_70: {
    id: "age_70",
    label: pennsylvaniaPathwayLabels.expungement_age_70,
    statute: {
      citation: "18 Pa.C.S. § 9122",
      description: `Age 70+ expungement — ${pennsylvaniaWaitingPeriods[5]}`
    }
  },
  deceased: {
    id: "deceased",
    label: pennsylvaniaPathwayLabels.expungement_deceased,
    statute: {
      citation: "18 Pa.C.S. § 9122",
      description: "Deceased for 3 years — expungement of records of decedent"
    }
  },
  limited_access_misdemeanor: {
    id: "limited_access_misdemeanor",
    label: pennsylvaniaPathwayLabels.limited_access_misdemeanor,
    statute: {
      citation: "18 Pa.C.S. § 9122.1",
      description: `Misdemeanor limited access — ${pennsylvaniaWaitingPeriods[6]}`
    }
  },
  limited_access_property_felony: {
    id: "limited_access_property_felony",
    label: pennsylvaniaPathwayLabels.limited_access_property_felony,
    statute: {
      citation: "18 Pa.C.S. § 9122.1",
      description: `Property felony limited access — ${pennsylvaniaWaitingPeriods[8]}`
    }
  }
};

export function getPaPleadingConfig(trackId: PaPleadingTrack): PleadingTrackConfig {
  return pennsylvaniaPleadingConfigs[trackId];
}
