import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  accessCodeDisplayHint,
  hashAccessCode,
  normalizeAccessCode
} from "@/lib/partners/access-code-crypto";

// Server-authoritative access-code management + validation. All raw codes are
// normalized and hashed here; only hashes reach Supabase. Mutations run through
// the service-role admin client after the caller has already been authorized
// (partner administrator for its own slug, or an internal admin) at the route layer.

export type PartnerAccessMode = "open" | "optional_code" | "required_code" | "invite_only";
export type PartnerAccessCodeType = "shared" | "single_use" | "limited_use";
export type PartnerAccessCodeLifecycle = "draft" | "scheduled" | "live" | "paused" | "revoked";

export const PARTNER_ACCESS_MODES: PartnerAccessMode[] = [
  "open",
  "optional_code",
  "required_code",
  "invite_only"
];
export const PARTNER_ACCESS_CODE_TYPES: PartnerAccessCodeType[] = [
  "shared",
  "single_use",
  "limited_use"
];

export type PartnerAccessCodeValidationReason = "invalid" | "inactive" | "expired" | "exhausted";

export type PartnerAccessCodeValidation = {
  valid: boolean;
  reason: PartnerAccessCodeValidationReason | null;
  campaignName: string | null;
  codeType: PartnerAccessCodeType | null;
};

// Display-safe shape. code_hash is never included so it cannot reach a browser.
export type PartnerAccessCodeView = {
  id: string;
  partnerSlug: string;
  displayHint: string | null;
  campaignName: string | null;
  description: string | null;
  codeType: PartnerAccessCodeType;
  maxUses: number | null;
  usesCount: number;
  isActive: boolean;
  lifecycleStatus: PartnerAccessCodeLifecycle | "expired" | "exhausted";
  jurisdictions: string[];
  programId: string | null;
  eventId: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  // Code/campaign analytics (privacy-safe, derived from lifecycle events).
  screeningsStarted: number;
  screeningsCompleted: number;
  eligiblePackets: number;
  guidanceOnly: number;
  ineligible: number;
  packetsGenerated: number;
  packetCreditsUsed: number;
  overagePackets: number;
  conversionRate: number;
};

export type PartnerCodeAnalyticsRow = {
  screeningsStarted: number;
  screeningsCompleted: number;
  eligiblePackets: number;
  guidanceOnly: number;
  ineligible: number;
  packetsGenerated: number;
  packetCreditsUsed: number;
  overagePackets: number;
  conversionRate: number;
};

export type CreatePartnerAccessCodeInput = {
  partnerSlug: string;
  rawCode: string;
  campaignName?: string | null;
  description?: string | null;
  codeType?: PartnerAccessCodeType;
  maxUses?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  createdBy?: string | null;
  jurisdictions?: string[] | null;
  programId?: string | null;
  eventId?: string | null;
};

export class PartnerAccessCodeError extends Error {
  constructor(
    readonly code:
      | "supabase_unconfigured"
      | "unknown_partner"
      | "invalid_input"
      | "duplicate_code"
      | "not_found"
      | "launch_not_ready"
      | "read_failed"
      | "write_failed",
    message: string
  ) {
    super(message);
    this.name = "PartnerAccessCodeError";
  }
}

type AccessCodeRow = {
  id: string;
  partner_slug: string;
  code_display_hint: string | null;
  campaign_name: string | null;
  description: string | null;
  code_type: PartnerAccessCodeType;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  lifecycle_status: PartnerAccessCodeLifecycle;
  jurisdictions: string[] | null;
  program_id: string | null;
  event_id: string | null;
  starts_at: string | null;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
};

const SAFE_COLUMNS =
  "id, partner_slug, code_display_hint, campaign_name, description, code_type, max_uses, uses_count, is_active, lifecycle_status, jurisdictions, program_id, event_id, starts_at, expires_at, last_used_at, created_at";

// ---------------------------------------------------------------------------
// Validation (read-only). Used by the public code-check route.
// ---------------------------------------------------------------------------

export async function validatePartnerAccessCode(
  partnerSlug: string,
  rawCode: string,
  jurisdiction?: string | null
): Promise<PartnerAccessCodeValidation> {
  const slug = normalizeSlug(partnerSlug);
  const normalized = normalizeAccessCode(rawCode);
  if (!normalized) {
    return { valid: false, reason: "invalid", campaignName: null, codeType: null };
  }

  const supabase = requireAdminClient();
  const { data, error } = await supabase.rpc("validate_partner_access_code", {
    p_partner_slug: slug,
    p_code_hash: hashAccessCode(normalized)
  });

  if (error) {
    throw new PartnerAccessCodeError("read_failed", "Could not validate the access code.");
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { valid: false, reason: "invalid", campaignName: null, codeType: null };
  }

  const scopeAllowed = Boolean(row.valid) && await codeAllowsJurisdiction(
    supabase,
    slug,
    hashAccessCode(normalized),
    jurisdiction
  );
  return {
    valid: scopeAllowed,
    reason: scopeAllowed ? null : ((row.reason ?? "invalid") as PartnerAccessCodeValidationReason),
    campaignName: row.campaign_name ?? null,
    codeType: (row.code_type ?? null) as PartnerAccessCodeType | null
  };
}

// ---------------------------------------------------------------------------
// Management (mutations). Callers must already be authorized for partnerSlug.
// ---------------------------------------------------------------------------

export async function createPartnerAccessCode(input: CreatePartnerAccessCodeInput): Promise<PartnerAccessCodeView> {
  const slug = normalizeSlug(input.partnerSlug);
  const supabase = requireAdminClient();
  await assertPartnerExists(supabase, slug);

  const normalized = normalizeAccessCode(input.rawCode);
  if (normalized.length < 3) {
    throw new PartnerAccessCodeError("invalid_input", "An access code must be at least 3 characters.");
  }

  const codeType: PartnerAccessCodeType = input.codeType ?? "shared";
  if (!PARTNER_ACCESS_CODE_TYPES.includes(codeType)) {
    throw new PartnerAccessCodeError("invalid_input", "Unknown access code type.");
  }

  let maxUses = normalizeMaxUses(input.maxUses);
  if (codeType === "limited_use" && (maxUses == null || maxUses < 1)) {
    throw new PartnerAccessCodeError("invalid_input", "Limited-use codes require a positive maximum number of uses.");
  }
  if (codeType === "single_use") {
    maxUses = 1;
  }
  if (codeType === "shared") {
    maxUses = null;
  }

  const startsAt = normalizeTimestamp(input.startsAt, "Start time");
  const expiresAt = normalizeTimestamp(input.expiresAt, "Expiration time");
  if (startsAt && expiresAt && new Date(expiresAt) <= new Date(startsAt)) {
    throw new PartnerAccessCodeError("invalid_input", "Expiration must be after the start time.");
  }
  const jurisdictions = normalizeJurisdictions(input.jurisdictions);
  const actorUserId = normalizeUuid(input.createdBy, "Actor");
  if (!actorUserId) {
    throw new PartnerAccessCodeError("invalid_input", "An authenticated administrator is required.");
  }

  const { data: codeId, error } = await supabase.rpc("create_partner_access_code", {
    p_actor_user_id: actorUserId,
    p_partner_slug: slug,
    p_code_hash: hashAccessCode(normalized),
    p_code_display_hint: accessCodeDisplayHint(normalized),
    p_campaign_name: cleanText(input.campaignName),
    p_description: cleanText(input.description),
    p_code_type: codeType,
    p_max_uses: maxUses,
    p_jurisdictions: jurisdictions,
    p_program_id: normalizeProgramId(input.programId),
    p_event_id: normalizeUuid(input.eventId, "Event"),
    p_starts_at: startsAt,
    p_expires_at: expiresAt
  });

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new PartnerAccessCodeError("duplicate_code", "That access code already exists for this organization.");
    }
    throw new PartnerAccessCodeError("write_failed", "Could not create the access code.");
  }

  if (typeof codeId !== "string") {
    throw new PartnerAccessCodeError("write_failed", "Could not create the access code.");
  }

  const { data, error: readError } = await supabase.from("partner_access_codes")
    .select(SAFE_COLUMNS).eq("id", codeId).eq("partner_slug", slug).maybeSingle<AccessCodeRow>();
  if (readError || !data) {
    throw new PartnerAccessCodeError("read_failed", "Could not read the created access code.");
  }

  return viewFromRow(data, EMPTY_ANALYTICS);
}

export async function setPartnerAccessCodeLifecycle(input: {
  partnerSlug: string;
  codeId: string;
  status: "live" | "paused" | "revoked";
  actorUserId: string;
}): Promise<PartnerAccessCodeView> {
  const slug = normalizeSlug(input.partnerSlug);
  const codeId = cleanText(input.codeId);
  if (!codeId) throw new PartnerAccessCodeError("invalid_input", "codeId is required.");

  const supabase = requireAdminClient();
  const { data: outcome, error } = await supabase.rpc("set_partner_access_code_lifecycle", {
    p_actor_user_id: input.actorUserId,
    p_partner_slug: slug,
    p_code_id: codeId,
    p_status: input.status
  });
  if (error) {
    throw new PartnerAccessCodeError("write_failed", "Could not update the access code.");
  }
  if (outcome === "not_found") {
    throw new PartnerAccessCodeError("not_found", "Access code not found for this organization.");
  }
  if (outcome === "partner_not_launch_ready") {
    throw new PartnerAccessCodeError("launch_not_ready", "The partner must be approved, published, and active before a code can go live.");
  }
  if (!["updated", "unchanged"].includes(String(outcome))) {
    throw new PartnerAccessCodeError("write_failed", "Could not update the access code.");
  }

  const { data, error: readError } = await supabase.from("partner_access_codes")
    .select(SAFE_COLUMNS).eq("id", codeId).eq("partner_slug", slug).maybeSingle<AccessCodeRow>();
  if (readError || !data) throw new PartnerAccessCodeError("read_failed", "Could not read the updated access code.");

  const { byCode } = await codeAnalyticsMap(supabase, slug);
  return viewFromRow(data, byCode[codeId] ?? EMPTY_ANALYTICS);
}

export async function setPartnerAccessCodeActive(input: {
  partnerSlug: string;
  codeId: string;
  isActive: boolean;
  actorUserId: string;
}): Promise<PartnerAccessCodeView> {
  return setPartnerAccessCodeLifecycle({
    partnerSlug: input.partnerSlug,
    codeId: input.codeId,
    status: input.isActive ? "live" : "paused",
    actorUserId: input.actorUserId
  });
}

export async function listPartnerAccessCodes(partnerSlug: string): Promise<PartnerAccessCodeView[]> {
  const slug = normalizeSlug(partnerSlug);
  const supabase = requireAdminClient();

  const { data, error } = await supabase
    .from("partner_access_codes")
    .select(SAFE_COLUMNS)
    .eq("partner_slug", slug)
    .order("created_at", { ascending: false });

  if (error) {
    throw new PartnerAccessCodeError("read_failed", "Could not read access codes.");
  }

  const rows = (data ?? []) as AccessCodeRow[];
  const { byCode } = await codeAnalyticsMap(supabase, slug);
  return rows.map((row) => viewFromRow(row, byCode[row.id] ?? EMPTY_ANALYTICS));
}

export type PartnerAccessCodeAnalytics = {
  partnerSlug: string;
  accessMode: PartnerAccessMode;
  packetCap: number;
  packetsUsed: number;
  remainingBalance: number;
  overagePackets: number;
  overageAmountCents: number;
  overagePacketPriceCents: number;
  overageEnabled: boolean;
  pauseAtCap: boolean;
  codes: PartnerAccessCodeView[];
  // Attribution through the partner page with no code (open / optional no-code).
  directAttribution: PartnerCodeAnalyticsRow;
};

export async function getPartnerAccessCodeAnalytics(partnerSlug: string): Promise<PartnerAccessCodeAnalytics> {
  const slug = normalizeSlug(partnerSlug);
  const supabase = requireAdminClient();

  const [{ data: partnerRow }, { data: entRow }, codes, analyticsMap] = await Promise.all([
    supabase.from("partner_records").select("access_mode").eq("partner_slug", slug).maybeSingle<{ access_mode: string | null }>(),
    supabase
      .from("partner_entitlement")
      .select("screenings_allowed, screenings_used, overage_packets, overage_amount_cents, overage_packet_price_cents, overage_enabled, pause_at_cap")
      .eq("partner_slug", slug)
      .maybeSingle<{
        screenings_allowed: number;
        screenings_used: number;
        overage_packets: number;
        overage_amount_cents: number;
        overage_packet_price_cents: number;
        overage_enabled: boolean;
        pause_at_cap: boolean;
      }>(),
    listPartnerAccessCodes(slug),
    codeAnalyticsMap(supabase, slug)
  ]);

  const packetCap = entRow?.screenings_allowed ?? 0;
  const packetsUsed = entRow?.screenings_used ?? 0;

  return {
    partnerSlug: slug,
    accessMode: normalizeAccessMode(partnerRow?.access_mode),
    packetCap,
    packetsUsed,
    remainingBalance: Math.max(0, packetCap - packetsUsed),
    overagePackets: entRow?.overage_packets ?? 0,
    overageAmountCents: entRow?.overage_amount_cents ?? 0,
    overagePacketPriceCents: entRow?.overage_packet_price_cents ?? 5000,
    overageEnabled: Boolean(entRow?.overage_enabled),
    pauseAtCap: Boolean(entRow?.pause_at_cap),
    codes,
    directAttribution: analyticsMap.direct
  };
}

export async function updatePartnerAccessMode(input: {
  partnerSlug: string;
  accessMode: PartnerAccessMode;
}): Promise<PartnerAccessMode> {
  const slug = normalizeSlug(input.partnerSlug);
  if (!PARTNER_ACCESS_MODES.includes(input.accessMode)) {
    throw new PartnerAccessCodeError("invalid_input", "Unknown access mode.");
  }
  const supabase = requireAdminClient();
  const { data, error } = await supabase
    .from("partner_records")
    .update({ access_mode: input.accessMode })
    .eq("partner_slug", slug)
    .select("access_mode")
    .maybeSingle<{ access_mode: string }>();

  if (error) {
    throw new PartnerAccessCodeError("write_failed", "Could not update the partner access mode.");
  }
  if (!data) {
    throw new PartnerAccessCodeError("unknown_partner", "Unknown partner_slug.");
  }
  return normalizeAccessMode(data.access_mode);
}

export async function getPartnerAccessMode(partnerSlug: string): Promise<PartnerAccessMode> {
  const slug = normalizeSlug(partnerSlug);
  const supabase = getSupabaseAdminClient();
  if (!supabase) return "open";
  const { data } = await supabase
    .from("partner_records")
    .select("access_mode")
    .eq("partner_slug", slug)
    .maybeSingle<{ access_mode: string | null }>();
  return normalizeAccessMode(data?.access_mode);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

type AnalyticsRpcRow = {
  partner_access_code_id: string | null;
  screenings_started: number | string;
  screenings_completed: number | string;
  eligible_packet: number | string;
  guidance_only: number | string;
  ineligible: number | string;
  packets_generated: number | string;
  overage_packets: number | string;
};

const EMPTY_ANALYTICS: PartnerCodeAnalyticsRow = {
  screeningsStarted: 0,
  screeningsCompleted: 0,
  eligiblePackets: 0,
  guidanceOnly: 0,
  ineligible: 0,
  packetsGenerated: 0,
  packetCreditsUsed: 0,
  overagePackets: 0,
  conversionRate: 0
};

function analyticsFromRpcRow(row: AnalyticsRpcRow): PartnerCodeAnalyticsRow {
  const started = Number(row.screenings_started) || 0;
  const completed = Number(row.screenings_completed) || 0;
  const generated = Number(row.packets_generated) || 0;
  const overage = Number(row.overage_packets) || 0;
  return {
    screeningsStarted: started,
    screeningsCompleted: completed,
    eligiblePackets: Number(row.eligible_packet) || 0,
    guidanceOnly: Number(row.guidance_only) || 0,
    ineligible: Number(row.ineligible) || 0,
    packetsGenerated: generated,
    packetCreditsUsed: Math.max(0, generated - overage),
    overagePackets: overage,
    conversionRate: completed > 0 ? Math.round((generated / completed) * 1000) / 1000 : 0
  };
}

// Per-code lifecycle-event aggregates. The NULL-code row (direct partner-page
// attribution) is returned under the "direct" key.
async function codeAnalyticsMap(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  partnerSlug: string
): Promise<{ byCode: Record<string, PartnerCodeAnalyticsRow>; direct: PartnerCodeAnalyticsRow }> {
  const byCode: Record<string, PartnerCodeAnalyticsRow> = {};
  let direct = EMPTY_ANALYTICS;

  const { data, error } = await supabase.rpc("get_partner_code_analytics", { p_partner_slug: partnerSlug });
  if (error || !data) return { byCode, direct };

  for (const row of data as AnalyticsRpcRow[]) {
    const analytics = analyticsFromRpcRow(row);
    if (row.partner_access_code_id) {
      byCode[row.partner_access_code_id] = analytics;
    } else {
      direct = analytics;
    }
  }
  return { byCode, direct };
}

function viewFromRow(row: AccessCodeRow, analytics: PartnerCodeAnalyticsRow): PartnerAccessCodeView {
  return {
    id: row.id,
    partnerSlug: row.partner_slug,
    displayHint: row.code_display_hint,
    campaignName: row.campaign_name,
    description: row.description,
    codeType: row.code_type,
    maxUses: row.max_uses,
    usesCount: row.uses_count,
    isActive: row.is_active,
    lifecycleStatus: derivedLifecycle(row),
    jurisdictions: row.jurisdictions ?? [],
    programId: row.program_id,
    eventId: row.event_id,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    ...analytics
  };
}

function requireAdminClient() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new PartnerAccessCodeError("supabase_unconfigured", "Supabase service-role access is not configured.");
  }
  return supabase;
}

async function assertPartnerExists(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  partnerSlug: string
) {
  const { data, error } = await supabase
    .from("partner_records")
    .select("partner_slug")
    .eq("partner_slug", partnerSlug)
    .maybeSingle<{ partner_slug: string }>();
  if (error || !data) {
    throw new PartnerAccessCodeError("unknown_partner", "Unknown partner_slug.");
  }
}

function normalizeSlug(value: string): string {
  const slug = (value ?? "").trim();
  if (!slug) throw new PartnerAccessCodeError("unknown_partner", "partner_slug is required.");
  return slug;
}

function normalizeAccessMode(value: string | null | undefined): PartnerAccessMode {
  return value && (PARTNER_ACCESS_MODES as string[]).includes(value) ? (value as PartnerAccessMode) : "open";
}

function normalizeMaxUses(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  throw new PartnerAccessCodeError("invalid_input", "Maximum uses must be a positive whole number.");
}

function cleanText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function normalizeTimestamp(value: string | null | undefined, label: string): string | null {
  const text = cleanText(value);
  if (!text) return null;
  const date = new Date(text);
  if (!Number.isFinite(date.valueOf())) {
    throw new PartnerAccessCodeError("invalid_input", `${label} is invalid.`);
  }
  return date.toISOString();
}

function normalizeJurisdictions(values: string[] | null | undefined) {
  if (!values) return [];
  const normalized = [...new Set(values.map((value) => value.trim().toUpperCase()).filter(Boolean))];
  if (normalized.some((value) => !/^[A-Z]{2,3}$/.test(value))) {
    throw new PartnerAccessCodeError("invalid_input", "Choose valid state or jurisdiction codes.");
  }
  return normalized.sort();
}

function normalizeProgramId(value: string | null | undefined) {
  const normalized = cleanText(value);
  if (normalized && normalized.length > 120) {
    throw new PartnerAccessCodeError("invalid_input", "Program key is too long.");
  }
  return normalized;
}

function normalizeUuid(value: string | null | undefined, label: string) {
  const normalized = cleanText(value);
  if (!normalized) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
    throw new PartnerAccessCodeError("invalid_input", `${label} must be a valid identifier.`);
  }
  return normalized.toLowerCase();
}

function derivedLifecycle(row: AccessCodeRow): PartnerAccessCodeView["lifecycleStatus"] {
  const now = Date.now();
  if (row.expires_at && new Date(row.expires_at).valueOf() <= now) return "expired";
  if (row.max_uses != null && row.uses_count >= row.max_uses) return "exhausted";
  return row.lifecycle_status;
}

async function codeAllowsJurisdiction(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  partnerSlug: string,
  codeHash: string,
  jurisdiction?: string | null
) {
  if (!jurisdiction) return true;
  const normalized = jurisdiction.trim().toUpperCase();
  if (!/^[A-Z]{2,3}$/.test(normalized)) return false;
  const { data, error } = await supabase.from("partner_access_codes")
    .select("jurisdictions")
    .eq("partner_slug", partnerSlug)
    .eq("code_hash", codeHash)
    .maybeSingle<{ jurisdictions: string[] | null }>();
  if (error || !data) return false;
  const jurisdictions = data.jurisdictions ?? [];
  return jurisdictions.length === 0 || jurisdictions.includes(normalized);
}
