import type { PleadingTrackConfig } from "./renderers/custom-pleading-renderer";

export type PaPleadingTrack = "adult_expungement" | "adult_limited_access" | "adult_clean_slate";

export interface PaPleadingEligibilityPath {
  id: string;
  label: string;
  statute: { citation: string | null; description: string; counselFlag?: string };
}

// Confirmed from existing PA generator: 18 Pa.C.S. § 4904 quoted verbatim in verification block.
const verificationStatute = {
  citation: "18 Pa.C.S. § 4904",
  description: "Unsworn falsification to authorities — verification penalty basis for petition"
};

// Citations confirmed from legacy generator:
//   Pa.R.Crim.P. 790 — source HTML/PDF paths name the rule; generator title quotes it.
//   18 Pa.C.S. § 9122 — selectReason() quotes "Non-conviction record under 18 Pa.C.S. § 9122."
//   18 Pa.C.S. § 4904 — generator body quotes it verbatim.
// All other expungement basis citations (summary, ARD, pardon, age-70, deceased) are NOT cited
// in the existing generator and are flagged for counsel below.

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
      description: "Pennsylvania Rule of Criminal Procedure 790 — Expungement Petition procedure and form"
    },
    {
      citation: "18 Pa.C.S. § 9122",
      description: "Criminal history record information — grounds and procedure for expungement"
    }
  ],
  verificationStatute,
  includeProposedOrder: true,
  includeCertificateOfService: true,
  serviceNote:
    "Petitioner shall serve a copy of this petition upon the attorney for the Commonwealth when filing with the Clerk of Courts.",
  counselFlags: [
    "Summary conviction 5-year expungement basis: verify current PA statute citation with counsel before filing (not cited in existing generator — known only as '5 years arrest/prosecution-free')",
    "ARD expungement basis: specific statute citation required — confirm current Rule 790 practice and ARD disposition treatment with counsel (not cited in existing generator)",
    "Gubernatorial pardon expungement basis: verify current PA statute citation with counsel (not cited in existing generator)",
    "Age 70 expungement basis: verify current PA statute citation with counsel (generator describes '10 years after final release and arrest-free' but cites no section)",
    "Deceased-for-3-years expungement basis: verify current PA statute citation with counsel (not cited in existing generator)"
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
      citation: null,
      description:
        "Pennsylvania limited access / record sealing statute — citation required; confirm current provision with counsel before filing (not cited in existing generator)"
    }
  ],
  verificationStatute,
  includeProposedOrder: true,
  includeCertificateOfService: true,
  serviceNote:
    "Petitioner shall serve a copy of this petition upon the attorney for the Commonwealth when filing with the Clerk of Courts.",
  counselFlags: [
    "Limited access (sealing) statutory citation required — existing PA generator does not cite the sealing statute; counsel must confirm current PA limited access statute before any filing",
    "Misdemeanor sealing basis: confirm current statute, 7-year conviction-free waiting period (from existing generator), and current court requirements with counsel",
    "Property felony sealing basis: confirm current statute, 10-year waiting period, and restitution-paid requirement with counsel"
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
      citation: null,
      description:
        "Pennsylvania Clean Slate Act — citation required; confirm current provision with counsel (not cited in existing generator)"
    }
  ],
  verificationStatute,
  includeProposedOrder: false,
  includeCertificateOfService: false,
  serviceNote: null,
  counselFlags: [
    "Clean Slate statutory citation required — confirm current PA Clean Slate Act provision with counsel",
    "Clean Slate automatic sealing is not expungement; do not use Pa.R.Crim.P. 790 expungement petition form for Clean Slate matters"
  ]
};

export const pennsylvaniaPleadingConfigs: Record<PaPleadingTrack, PleadingTrackConfig> = {
  adult_expungement: pennsylvaniaExpungementConfig,
  adult_limited_access: pennsylvaniaLimitedAccessConfig,
  adult_clean_slate: pennsylvaniaCleanSlateConfig
};

// Eligibility paths — confirmed sources noted inline.
export const pennsylvaniaEligibilityPaths: Record<string, PaPleadingEligibilityPath> = {
  non_conviction: {
    id: "non_conviction",
    label: "Non-conviction record under 18 Pa.C.S. § 9122",
    statute: {
      citation: "18 Pa.C.S. § 9122",
      description: "Non-conviction expungement — confirmed from existing PA generator selectReason()"
    }
  },
  summary_5_years: {
    id: "summary_5_years",
    label: "Summary conviction — 5 years arrest/prosecution-free",
    statute: {
      citation: null,
      description: "Summary conviction expungement after 5 years",
      counselFlag:
        "Summary conviction 5-year expungement basis: verify current PA statute citation with counsel"
    }
  },
  ard: {
    id: "ard",
    label: "Successful ARD (Accelerated Rehabilitative Disposition) completion",
    statute: {
      citation: null,
      description: "ARD completion treated as non-conviction for expungement purposes",
      counselFlag:
        "ARD expungement basis: confirm specific statute citation and current practice with counsel"
    }
  },
  pardon: {
    id: "pardon",
    label: "Full gubernatorial pardon",
    statute: {
      citation: null,
      description: "Expungement following full gubernatorial pardon",
      counselFlag: "Pardon expungement basis: verify current PA statute citation with counsel"
    }
  },
  age_70: {
    id: "age_70",
    label: "Age 70 or older — 10 years after final release and arrest-free period",
    statute: {
      citation: null,
      description: "Age 70+ expungement pathway",
      counselFlag: "Age 70 expungement basis: verify current PA statute citation with counsel"
    }
  },
  deceased: {
    id: "deceased",
    label: "Deceased for 3 years",
    statute: {
      citation: null,
      description: "Deceased-for-3-years expungement pathway",
      counselFlag: "Deceased expungement basis: verify current PA statute citation with counsel"
    }
  },
  limited_access_misdemeanor: {
    id: "limited_access_misdemeanor",
    label: "Misdemeanor conviction — 7 years conviction-free",
    statute: {
      citation: null,
      description: "Misdemeanor limited access / sealing",
      counselFlag: "Misdemeanor sealing basis: statute citation required — confirm with counsel"
    }
  },
  limited_access_property_felony: {
    id: "limited_access_property_felony",
    label: "Third-degree property felony — 10 years and restitution paid",
    statute: {
      citation: null,
      description: "Property felony limited access / sealing",
      counselFlag: "Property felony sealing basis: statute citation required — confirm with counsel"
    }
  }
};

export function getPaPleadingConfig(trackId: PaPleadingTrack): PleadingTrackConfig {
  return pennsylvaniaPleadingConfigs[trackId];
}
