export const pilotRequestStatuses = [
  "new",
  "reviewed",
  "qualified",
  "follow_up_sent",
  "converted_to_partner",
  "not_a_fit"
] as const;

export type PilotRequestStatus = (typeof pilotRequestStatuses)[number];

export const pilotRequestStatusLabels: Record<PilotRequestStatus, string> = {
  new: "New",
  reviewed: "Reviewed",
  qualified: "Qualified",
  follow_up_sent: "Follow-up sent",
  converted_to_partner: "Converted to partner",
  not_a_fit: "Not a fit"
};

export function isPilotRequestStatus(value: unknown): value is PilotRequestStatus {
  return typeof value === "string" && pilotRequestStatuses.includes(value as PilotRequestStatus);
}
