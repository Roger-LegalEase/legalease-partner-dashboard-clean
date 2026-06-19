import { getAllJurisdictionProfiles } from "@/lib/rcap-engine/profile-registry";

export type ConsumerStateOption = {
  abbreviation: string;
  label: string;
};

export function getConsumerStateOptions(): ConsumerStateOption[] {
  return getAllJurisdictionProfiles()
    .map((profile) => ({
      abbreviation: profile.jurisdiction.code,
      label: profile.jurisdiction.name
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
