export const CLINIC_EVENT_STATUSES = ["draft", "published", "paused", "closed", "archived"] as const;
export type ClinicEventStatus = (typeof CLINIC_EVENT_STATUSES)[number];

export const CLINIC_STAFF_PERMISSIONS = ["assist", "queue", "follow_up", "reporting", "incident"] as const;
export type ClinicStaffPermission = (typeof CLINIC_STAFF_PERMISSIONS)[number];

export type ClinicEvent = {
  id: string;
  partnerSlug: string;
  publicSlug: string;
  name: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  locationName: string;
  geography: string;
  capacity: number;
  status: ClinicEventStatus;
  sponsorshipAllocation: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ClinicEventStaff = {
  id: string;
  eventId: string;
  partnerUserId: string;
  status: "approved" | "suspended" | "revoked";
  permissions: ClinicStaffPermission[];
  approvedAt: string;
};

export type ClinicAccessCodeSummary = {
  id: string;
  eventId: string;
  codeHint: string;
  maxUses: number | null;
  usesCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
};

export type ClinicAuditEntry = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
};

export type ClinicEventWorkspace = {
  event: ClinicEvent;
  entryUrl: string;
  qrDataUrl: string;
  staff: ClinicEventStaff[];
  accessCodes: ClinicAccessCodeSummary[];
  audit: ClinicAuditEntry[];
};

export type CreateClinicEventInput = {
  partnerSlug?: string;
  publicSlug: string;
  name: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  locationName: string;
  geography: string;
  capacity: number;
  sponsorshipAllocation: number | null;
};

export type SetClinicStaffInput = {
  partnerUserId: string;
  status: ClinicEventStaff["status"];
  permissions: ClinicStaffPermission[];
};

export type CreateClinicAccessCodeInput = {
  maxUses: number | null;
  startsAt: string | null;
  expiresAt: string | null;
};
