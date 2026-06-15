import type { JurisdictionCode, ReliefTrack } from "./types";

export interface JurisdictionConfig {
  jurisdictionCode: JurisdictionCode;
  name: string;
  productionReady: boolean;
  enabledReliefTracks: ReliefTrack[];
  vocabulary: Record<ReliefTrack, {
    primaryReliefTerm: string;
    allowedTerms: string[];
    prohibitedTerms: string[];
  }>;
}

export const nebraskaJurisdiction: JurisdictionConfig = {
  jurisdictionCode: "NE",
  name: "Nebraska",
  productionReady: false,
  enabledReliefTracks: ["adult_set_aside_conviction", "adult_record_sealing"],
  vocabulary: {
    adult_set_aside_conviction: {
      primaryReliefTerm: "set aside",
      allowedTerms: ["set aside", "set-aside", "setting aside"],
      prohibitedTerms: ["expungement", "expunge", "expunged", "seal", "sealing", "sealed"]
    },
    adult_record_sealing: {
      primaryReliefTerm: "sealing",
      allowedTerms: ["seal", "sealing", "sealed"],
      prohibitedTerms: ["expungement", "expunge", "expunged"]
    }
  }
};

export const recordClearingJurisdictions = [nebraskaJurisdiction] as const;

export function getJurisdictionConfig(jurisdictionCode: JurisdictionCode): JurisdictionConfig {
  const config = recordClearingJurisdictions.find((jurisdiction) => jurisdiction.jurisdictionCode === jurisdictionCode);
  if (!config) throw new Error(`Unsupported record-clearing jurisdiction: ${jurisdictionCode}`);
  return config;
}
