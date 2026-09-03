import {
  CLINIC_EVENT_STATUSES,
  CLINIC_STAFF_PERMISSIONS,
  type ClinicEventStatus,
  type ClinicStaffPermission,
  type CreateClinicAccessCodeInput,
  type CreateClinicEventInput,
  type SetClinicStaffInput
} from "@/lib/clinic-mode/types";

export class ClinicValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClinicValidationError";
  }
}

export function parseCreateClinicEvent(value: unknown): CreateClinicEventInput {
  const body = record(value);
  const startsAt = isoDate(body.startsAt, "startsAt");
  const endsAt = isoDate(body.endsAt, "endsAt");
  if (Date.parse(endsAt) <= Date.parse(startsAt)) throw new ClinicValidationError("endsAt must be after startsAt.");
  return {
    partnerSlug: optionalSlug(body.partnerSlug),
    jurisdiction: optionalJurisdiction(body.jurisdiction),
    publicSlug: slug(body.publicSlug, "publicSlug"),
    name: text(body.name, "name", 3, 160),
    startsAt,
    endsAt,
    timezone: text(body.timezone, "timezone", 3, 80),
    locationName: text(body.locationName, "locationName", 2, 180),
    geography: text(body.geography, "geography", 2, 160),
    capacity: integer(body.capacity, "capacity", 1, 100000),
    sponsorshipAllocation: nullableInteger(body.sponsorshipAllocation, "sponsorshipAllocation", 0, 100000)
  };
}

export function parseClinicEventStatus(value: unknown): ClinicEventStatus {
  if (typeof value !== "string" || !CLINIC_EVENT_STATUSES.includes(value as ClinicEventStatus)) {
    throw new ClinicValidationError("A valid Clinic event status is required.");
  }
  return value as ClinicEventStatus;
}

export function parseSetClinicStaff(value: unknown): SetClinicStaffInput {
  const body = record(value);
  const status = body.status;
  if (status !== "approved" && status !== "suspended" && status !== "revoked") {
    throw new ClinicValidationError("A valid staff status is required.");
  }
  if (!Array.isArray(body.permissions) || body.permissions.length === 0) {
    throw new ClinicValidationError("At least one staff permission is required.");
  }
  const permissions = [...new Set(body.permissions.map((permission) => {
    if (typeof permission !== "string" || !CLINIC_STAFF_PERMISSIONS.includes(permission as ClinicStaffPermission)) {
      throw new ClinicValidationError("A staff permission is invalid.");
    }
    return permission as ClinicStaffPermission;
  }))];
  return { partnerUserId: uuid(body.partnerUserId, "partnerUserId"), status, permissions };
}

export function parseCreateClinicAccessCode(value: unknown): CreateClinicAccessCodeInput {
  const body = record(value);
  const startsAt = nullableIsoDate(body.startsAt, "startsAt");
  const expiresAt = nullableIsoDate(body.expiresAt, "expiresAt");
  if (startsAt && expiresAt && Date.parse(expiresAt) <= Date.parse(startsAt)) {
    throw new ClinicValidationError("expiresAt must be after startsAt.");
  }
  return {
    maxUses: nullableInteger(body.maxUses, "maxUses", 1, 100000),
    startsAt,
    expiresAt
  };
}

export function parseEventId(value: string): string {
  return uuid(value, "eventId");
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ClinicValidationError("A JSON object is required.");
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, min: number, max: number) {
  if (typeof value !== "string") throw new ClinicValidationError(`${field} is required.`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) throw new ClinicValidationError(`${field} is invalid.`);
  return normalized;
}

function slug(value: unknown, field: string) {
  const normalized = text(value, field, 3, 120).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) throw new ClinicValidationError(`${field} must be URL-safe.`);
  return normalized;
}

function optionalSlug(value: unknown) {
  return value === undefined || value === null || value === "" ? undefined : slug(value, "partnerSlug");
}

function optionalJurisdiction(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^[A-Za-z]{2,3}$/.test(value.trim())) {
    throw new ClinicValidationError("jurisdiction must be a two- or three-letter code.");
  }
  return value.trim().toUpperCase();
}

function integer(value: unknown, field: string, min: number, max: number) {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) throw new ClinicValidationError(`${field} is invalid.`);
  return Number(value);
}

function nullableInteger(value: unknown, field: string, min: number, max: number) {
  return value === null || value === undefined || value === "" ? null : integer(value, field, min, max);
}

function isoDate(value: unknown, field: string) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new ClinicValidationError(`${field} must be an ISO date.`);
  return new Date(value).toISOString();
}

function nullableIsoDate(value: unknown, field: string) {
  return value === null || value === undefined || value === "" ? null : isoDate(value, field);
}

function uuid(value: unknown, field: string) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ClinicValidationError(`${field} must be a UUID.`);
  }
  return value.toLowerCase();
}
