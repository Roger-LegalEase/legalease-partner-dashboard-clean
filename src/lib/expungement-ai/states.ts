import { getAll51SelectableJurisdictions } from "@/lib/rcap/all51-launch-selector";

export type ConsumerStateOption = {
  abbreviation: string;
  label: string;
};

export function getConsumerStateOptions(): ConsumerStateOption[] {
  return getAll51SelectableJurisdictions()
    .map((record) => ({
      abbreviation: record.abbreviation,
      label: record.jurisdiction
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
