import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const FIRST_ADMIN_ROLE = "partner_admin" as const;
export const FIRST_ADMIN_INVITATION_HOURS = 72;
export const FIRST_ADMIN_TOKEN_BYTES = 32;

export const firstAdminInvitationStatuses = [
  "pending",
  "claiming",
  "claimed",
  "accepting",
  "accepted",
  "expired",
  "revoked",
  "superseded",
  "attention"
] as const;

export type FirstAdminInvitationStatus =
  (typeof firstAdminInvitationStatuses)[number];

export type FirstAdminInvitationPayload = {
  schema_version: 1;
  revision: number;
  invitation_id: string;
  idempotency_key: string;
  full_name: string;
  email: string;
  role: typeof FIRST_ADMIN_ROLE;
  status: FirstAdminInvitationStatus;
  token_hash: string;
  created_at: string;
  expires_at: string;
  created_by: string;
  auth_user_id?: string;
  claim_started_at?: string;
  claimed_at?: string;
  accepted_at?: string;
  revoked_at?: string;
  superseded_at?: string;
  delivery_status?: "not_requested" | "requested" | "sent" | "failed";
  // The delivery request this invitation last acted on. Delivery is separate
  // from invitation creation and carries its own key, so a retried send returns
  // the previous outcome instead of producing a second email or a second
  // delivery record.
  delivery_idempotency_key?: string;
};

export type FirstAdminInput = {
  fullName?: unknown;
  email?: unknown;
  idempotencyKey?: unknown;
  expirationHours?: unknown;
};

export type ValidFirstAdminInput = {
  fullName: string;
  email: string;
  idempotencyKey: string;
  expirationHours: number;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function validateFirstAdminInput(
  input: FirstAdminInput
):
  | { ok: true; value: ValidFirstAdminInput }
  | { ok: false; error: string } {
  const fullName = normalizeWhitespace(input.fullName);
  const email = normalizeEmail(input.email);
  const idempotencyKey = normalizeString(input.idempotencyKey).toLowerCase();
  const expirationHours =
    input.expirationHours === undefined
      ? FIRST_ADMIN_INVITATION_HOURS
      : Number(input.expirationHours);

  if (fullName.length < 2 || fullName.length > 120) {
    return { ok: false, error: "Enter the administrator’s full name." };
  }
  if (!email || email.length > 254 || !emailPattern.test(email)) {
    return { ok: false, error: "Enter a valid work email address." };
  }
  if (!uuidPattern.test(idempotencyKey)) {
    return { ok: false, error: "Refresh the page and try again." };
  }
  if (
    !Number.isInteger(expirationHours) ||
    expirationHours < 1 ||
    expirationHours > FIRST_ADMIN_INVITATION_HOURS
  ) {
    return {
      ok: false,
      error: `Invitation expiration must be between 1 and ${FIRST_ADMIN_INVITATION_HOURS} hours.`
    };
  }

  return {
    ok: true,
    value: { fullName, email, idempotencyKey, expirationHours }
  };
}

export function createFirstAdminToken() {
  const rawToken = randomBytes(FIRST_ADMIN_TOKEN_BYTES).toString("base64url");
  return { rawToken, tokenHash: hashFirstAdminToken(rawToken) };
}

export function hashFirstAdminToken(rawToken: string) {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function isValidFirstAdminToken(rawToken: unknown): rawToken is string {
  return typeof rawToken === "string" && tokenPattern.test(rawToken);
}

export function secureFirstAdminTokenMatches(
  rawToken: string,
  expectedHash: string
) {
  if (!isValidFirstAdminToken(rawToken) || !/^[0-9a-f]{64}$/i.test(expectedHash)) {
    return false;
  }
  const actual = Buffer.from(hashFirstAdminToken(rawToken), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function firstAdminRecordId(partnerSlug: string) {
  const digest = createHash("sha256")
    .update(`legalease:first-admin:${normalizePartnerSlug(partnerSlug)}`, "utf8")
    .digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function normalizePartnerSlug(value: unknown) {
  const slug = normalizeString(value).toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?$/.test(slug)) {
    throw new Error("Partner not found.");
  }
  return slug;
}

export function normalizeEmail(value: unknown) {
  return normalizeString(value).toLowerCase();
}

export function isInvitationExpired(
  invitation: Pick<FirstAdminInvitationPayload, "expires_at">,
  now = new Date()
) {
  const expiresAt = new Date(invitation.expires_at);
  return (
    Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()
  );
}

export function effectiveInvitationStatus(
  invitation: FirstAdminInvitationPayload,
  now = new Date()
): FirstAdminInvitationStatus {
  if (
    ["pending", "claiming", "claimed"].includes(invitation.status) &&
    isInvitationExpired(invitation, now)
  ) {
    return "expired";
  }
  return invitation.status;
}

export function parseFirstAdminInvitationPayload(
  value: unknown
): FirstAdminInvitationPayload | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Record<string, unknown>;
  if (
    payload.schema_version !== 1 ||
    typeof payload.revision !== "number" ||
    !Number.isInteger(payload.revision) ||
    payload.revision < 1 ||
    typeof payload.invitation_id !== "string" ||
    !uuidPattern.test(payload.invitation_id) ||
    typeof payload.idempotency_key !== "string" ||
    !uuidPattern.test(payload.idempotency_key) ||
    typeof payload.full_name !== "string" ||
    typeof payload.email !== "string" ||
    normalizeEmail(payload.email) !== payload.email ||
    payload.role !== FIRST_ADMIN_ROLE ||
    typeof payload.status !== "string" ||
    !firstAdminInvitationStatuses.includes(
      payload.status as FirstAdminInvitationStatus
    ) ||
    typeof payload.token_hash !== "string" ||
    !/^[0-9a-f]{64}$/.test(payload.token_hash) ||
    typeof payload.created_at !== "string" ||
    typeof payload.expires_at !== "string" ||
    typeof payload.created_by !== "string"
  ) {
    return null;
  }
  return payload as FirstAdminInvitationPayload;
}

/**
 * Which administrator-setup path an invited email takes.
 *
 * The distinction matters because the two paths have different safety
 * properties. A brand-new email gets an account created for it. An email that
 * already belongs to exactly one confirmed account must NOT get a second
 * account, and must not have its password reset either — that would turn
 * "prove you own this mailbox" into "we changed your credentials", which is a
 * different and much larger claim. Anything else is ambiguous and fails closed.
 */
export type FirstAdminAccountPath =
  | "create_new_account"
  | "existing_confirmed_account"
  | "ambiguous";

export function decideFirstAdminAccountPath(input: {
  matchCount: number;
  confirmed: boolean;
}): FirstAdminAccountPath {
  if (input.matchCount === 0) return "create_new_account";
  if (input.matchCount === 1 && input.confirmed) {
    return "existing_confirmed_account";
  }
  return "ambiguous";
}

export function decidePostAcceptanceDestination(input: {
  onboardingEnabled: boolean;
  workspaceStatus?: string | null;
}) {
  if (
    input.onboardingEnabled &&
    !["live", "closed"].includes(input.workspaceStatus ?? "")
  ) {
    return "/partner/onboarding" as const;
  }
  return "/partner/dashboard" as const;
}

export function invitationPublicFields(
  invitation: FirstAdminInvitationPayload,
  now = new Date()
) {
  return {
    invitationId: invitation.invitation_id,
    fullName: invitation.full_name,
    email: invitation.email,
    role: invitation.role,
    status: effectiveInvitationStatus(invitation, now),
    createdAt: invitation.created_at,
    expiresAt: invitation.expires_at,
    deliveryStatus: invitation.delivery_status ?? "not_requested"
  };
}

function normalizeWhitespace(value: unknown) {
  return normalizeString(value).replace(/\s+/g, " ");
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
