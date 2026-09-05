import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createServerSupabaseAuthClient } from "@/lib/supabase/auth-server";
import type {
  ConsumerBriefcaseItem,
  CreateConsumerBriefcaseItemInput,
  ExpungementAiEligibilityResult
} from "@/lib/expungement-ai/types";
import { findItemForSession } from "@/lib/expungement-ai/save-result-policy";
import { componentDeferralBundle, componentDeferralForTrack, exactDeferralBundle, exactDeferralForPathway, exactDeferralForTrack, terminalTreatmentBundle, terminalTreatmentForTrack } from "@/lib/rcap/documents/guidance-packet-registry";

// Production-ready path: use the request user's Supabase auth client and consumer_briefcase_items RLS.
// Safe fallback path: local/unconfigured shells return deterministic items without service-role writes.
const startedAt = "2026-06-17T00:00:00.000Z";
const fallbackItemsByUser = new Map<string, ConsumerBriefcaseItem[]>();

type ConsumerBriefcaseRow = {
  id: string;
  user_id: string;
  item_type: ConsumerBriefcaseItem["type"];
  jurisdiction: string;
  pathway_label: string | null;
  result_code: ExpungementAiEligibilityResult["resultCode"] | null;
  packet_type: ExpungementAiEligibilityResult["packetType"] | null;
  payment_allowed: boolean;
  status: ConsumerBriefcaseItem["status"];
  summary_json: Record<string, unknown>;
  next_steps_json: string[];
  artifact_refs_json: Record<string, unknown>;
  payment_status: ConsumerBriefcaseItem["paymentStatus"] | null;
  payment_provider: ConsumerBriefcaseItem["paymentProvider"] | null;
  checkout_session_id: string | null;
  payment_intent_id: string | null;
  amount_cents: 5000 | null;
  receipt_url: string | null;
  packet_status: ConsumerBriefcaseItem["packetStatus"] | null;
  reminder_at: string | null;
  source_session_id: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Persist a completed screening result as a Briefcase matter, with duplicate protection.
 * The same (userId, sourceSessionId) never creates a second matter: if one already exists we reuse
 * it instead of inserting again, so a double click (or a save-after-login retry) is idempotent.
 */
export async function saveScreeningResultToBriefcase(
  input: CreateConsumerBriefcaseItemInput
): Promise<ConsumerBriefcaseItem> {
  if (input.sourceSessionId) {
    const existing = findItemForSession(await listBriefcaseItems(input.userId), input.sourceSessionId);
    if (existing) return existing;
  }
  return createBriefcaseItem(input);
}

export class AuthoritativeBriefcasePersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthoritativeBriefcasePersistenceError";
  }
}

/**
 * Persist a matter whose route and commercial posture were just recomputed by
 * the server-owned evaluator. This is intentionally separate from the legacy
 * authenticated writer: Phase 55 removes browser-role access to route identity
 * and payment_allowed, so only this service-role boundary may insert them.
 */
export async function saveAuthoritativeScreeningResultToBriefcase(input: {
  authenticatedUserId: string;
  item: CreateConsumerBriefcaseItemInput;
}): Promise<ConsumerBriefcaseItem> {
  if (!input.authenticatedUserId || input.item.userId !== input.authenticatedUserId) {
    throw new AuthoritativeBriefcasePersistenceError("authenticated owner does not match authoritative matter owner");
  }
  if (input.item.itemType !== "result" || !input.item.sourceSessionId) {
    throw new AuthoritativeBriefcasePersistenceError("authoritative screening persistence requires a source-bound result");
  }

  const clamped = clampAuthoritativeMatterInput(input.item);
  const fallbackItem = fallbackItemFromCreateInput(clamped);
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    if (isCompletelyUnconfiguredSupabase()) {
      rememberFallbackItem(clamped.userId, fallbackItem);
      return fallbackItem;
    }
    throw new AuthoritativeBriefcasePersistenceError("service-role Briefcase persistence is unavailable");
  }

  const existing = await supabase
    .from("consumer_briefcase_items")
    .select("*")
    .eq("user_id", input.authenticatedUserId)
    .eq("source_session_id", clamped.sourceSessionId)
    .maybeSingle<ConsumerBriefcaseRow>();
  if (existing.error) {
    throw new AuthoritativeBriefcasePersistenceError("could not verify authoritative matter idempotency");
  }
  if (existing.data) {
    if (!rowMatchesAuthoritativeMatter(existing.data, clamped)) {
      throw new AuthoritativeBriefcasePersistenceError("source-bound matter conflicts with authoritative evaluation");
    }
    return rowToBriefcaseItem(existing.data);
  }

  const paymentStatus = clamped.paymentAllowed ? "unpaid" : "not_applicable";
  const amountCents = clamped.paymentAllowed ? 5000 : null;
  const inserted = await supabase
    .from("consumer_briefcase_items")
    .insert({
      user_id: input.authenticatedUserId,
      item_type: clamped.itemType,
      jurisdiction: clamped.jurisdiction,
      pathway_label: clamped.pathwayLabel ?? null,
      result_code: clamped.resultCode ?? null,
      packet_type: clamped.packetType ?? null,
      payment_allowed: clamped.paymentAllowed,
      status: clamped.status,
      summary_json: { text: clamped.summary },
      next_steps_json: clamped.nextSteps,
      artifact_refs_json: clamped.artifactRefs ?? {},
      payment_status: paymentStatus,
      amount_cents: amountCents,
      packet_status: clamped.packetStatus ?? "not_started",
      reminder_at: clamped.reminderAt ?? null,
      source_session_id: clamped.sourceSessionId
    })
    .select("*")
    .single<ConsumerBriefcaseRow>();

  if (inserted.error || !inserted.data) {
    throw new AuthoritativeBriefcasePersistenceError("authoritative Briefcase insert failed");
  }
  return rowToBriefcaseItem(inserted.data);
}

function rowMatchesAuthoritativeMatter(
  row: ConsumerBriefcaseRow,
  input: CreateConsumerBriefcaseItemInput
) {
  return row.user_id === input.userId
    && row.item_type === input.itemType
    && row.jurisdiction === input.jurisdiction
    && row.pathway_label === (input.pathwayLabel ?? null)
    && row.result_code === (input.resultCode ?? null)
    && row.packet_type === (input.packetType ?? null)
    && row.payment_allowed === input.paymentAllowed
    && row.status === input.status
    && row.source_session_id === input.sourceSessionId;
}

function isCompletelyUnconfiguredSupabase() {
  return process.env.NODE_ENV !== "production"
    && !process.env.NEXT_PUBLIC_SUPABASE_URL
    && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    && !process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * True when the screening session was started through an RCAP partner program. Used to drop the
 * payment gate when saving the result (partner sessions are sponsored). Reuses the same lookup as
 * isPartnerSponsoredPacketItem.
 */
export async function isRcapPartnerScreeningSession(sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("screening_sessions")
    .select("session_id")
    .eq("session_id", sessionId)
    .eq("flow_mode", "rcap")
    .eq("partner_benefit_active", true)
    .not("partner_slug", "is", null)
    .maybeSingle<{ session_id: string }>();

  return !error && Boolean(data?.session_id);
}

/**
 * Merge owner-scoped matter metadata without discarding render, download, or
 * treatment refs written by another part of the lifecycle. Arrays replace;
 * plain objects merge recursively.
 */
export async function mergeBriefcaseArtifactRefs(
  userId: string,
  itemId: string,
  patch: Record<string, unknown>
): Promise<ConsumerBriefcaseItem | null> {
  const supabase = await getConsumerBriefcaseClient();

  if (!supabase) {
    const items = fallbackItemsForUser(userId);
    const index = items.findIndex((item) => item.id === itemId);
    if (index === -1) return null;
    items[index] = {
      ...items[index],
      artifactRefs: mergeArtifactObjects(items[index].artifactRefs ?? {}, patch)
    };
    fallbackItemsByUser.set(userId, items);
    return items[index];
  }

  // Optimistic concurrency: a webhook or render worker may attach an artifact
  // between our read and write. Match updated_at and retry from the winner's
  // bytes instead of overwriting them with a stale snapshot.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await supabase
      .from("consumer_briefcase_items")
      .select("artifact_refs_json, updated_at")
      .eq("user_id", userId)
      .eq("id", itemId)
      .maybeSingle<{ artifact_refs_json: Record<string, unknown>; updated_at: string }>();
    if (current.error || !current.data) return null;

    const nextUpdatedAt = new Date(Date.now() + attempt).toISOString();
    const updated = await supabase
      .from("consumer_briefcase_items")
      .update({
        artifact_refs_json: mergeArtifactObjects(current.data.artifact_refs_json ?? {}, patch),
        updated_at: nextUpdatedAt
      })
      .eq("user_id", userId)
      .eq("id", itemId)
      .eq("updated_at", current.data.updated_at)
      .select("*")
      .maybeSingle<ConsumerBriefcaseRow>();

    if (updated.data) return rowToBriefcaseItem(updated.data);
    if (updated.error) return null;
  }
  return null;
}

function mergeArtifactObjects(
  current: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    const existing = merged[key];
    // packetInformation.serverFacts is an explicit protected-authority
    // allowlist, not an extensible participant map. Replace it so legacy or
    // forged keys cannot survive the ordinary recursive envelope merge.
    merged[key] = key === "serverFacts" && isPlainObject(value)
      ? { ...value }
      : isPlainObject(existing) && isPlainObject(value)
        ? mergeArtifactObjects(existing, value)
        : value;
  }
  return merged;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

/**
 * The Briefcase-side exact-deferral clamp.
 *
 * What the participant keeps for a deferred route is the whole point of the
 * treatment: the exact reason, where to go, what to do next, what to gather,
 * what not to file or assume, and how to come back. All of it is written from
 * the committed packet in the participant's own locale, at the single write
 * path, with payment and credit closed.
 */
/**
 * The three release clamps every server-authoritative matter must pass before it
 * is persisted, in the order the Briefcase persistence path has always applied
 * them. Exported so the shared claim service applies exactly the same rules
 * rather than growing a second, drifting copy of them.
 */
export function clampAuthoritativeMatterInput(
  input: CreateConsumerBriefcaseItemInput
): CreateConsumerBriefcaseItemInput {
  return clampComponentDeferral(clampExactDeferral(clampTerminalTreatment(input)));
}

function clampExactDeferral(input: CreateConsumerBriefcaseItemInput): CreateConsumerBriefcaseItemInput {
  const declaredTrackId = input.selectedTrackId
    ?? (typeof input.artifactRefs?.selectedTrackId === "string" ? input.artifactRefs.selectedTrackId : null);
  const byPathway = exactDeferralForPathway(input.jurisdiction, input.pathwayLabel ?? null);
  const deferral = exactDeferralForTrack(declaredTrackId) ?? byPathway;
  const declared = input.treatmentClassification === "exact_supported_deferral"
    || input.artifactRefs?.treatmentClassification === "exact_supported_deferral";
  if (!declared && !deferral) return input;

  const trackId = deferral?.trackId ?? declaredTrackId;
  const localeHint = typeof input.artifactRefs?.locale === "string" ? input.artifactRefs.locale : "en";
  const bundle = exactDeferralBundle(trackId, localeHint);

  return {
    ...input,
    paymentAllowed: false,
    status: "guidance_saved",
    resultCode: "guidance_only",
    packetType: "guidance_packet",
    paymentStatus: "not_applicable",
    paymentProvider: undefined,
    checkoutSessionId: undefined,
    paymentIntentId: undefined,
    amountCents: undefined,
    receiptUrl: undefined,
    packetStatus: "not_started",
    summary: bundle?.summary ?? input.summary,
    nextSteps: bundle?.nextSteps ?? input.nextSteps,
    selectedTrackId: trackId,
    treatmentClassification: "exact_supported_deferral",
    artifactRefs: {
      ...(input.artifactRefs ?? {}),
      selectedTrackId: trackId,
      treatmentClassification: "exact_supported_deferral",
      ...(bundle ? { exactDeferralTreatment: bundle } : {})
    }
  };
}

/**
 * The Briefcase-side component-deferral clamp.
 *
 * It sits at the single write path, so every caller — the save endpoint, the
 * adapter, a future one — persists the same thing for an affected route: a
 * guidance item, payment closed, no amount, no checkout id, packet not started,
 * and the exact treatment metadata in the existing artifact_refs_json column.
 * The summary and next steps come from the registry in the participant's
 * locale, so the saved item itself carries what is preserved, what is
 * outstanding, where to go and how to return.
 */
function clampComponentDeferral(input: CreateConsumerBriefcaseItemInput): CreateConsumerBriefcaseItemInput {
  const trackId = input.selectedTrackId
    ?? (typeof input.artifactRefs?.selectedTrackId === "string" ? input.artifactRefs.selectedTrackId : null);
  const declared = input.treatmentClassification === "component_deferral"
    || input.artifactRefs?.treatmentClassification === "component_deferral";
  const deferral = componentDeferralForTrack(trackId);
  if (!declared && !deferral) return input;

  const localeHint = typeof input.artifactRefs?.locale === "string" ? input.artifactRefs.locale : "en";
  const bundle = componentDeferralBundle(trackId, localeHint);

  return {
    ...input,
    paymentAllowed: false,
    status: "guidance_saved",
    resultCode: "guidance_only",
    packetType: "guidance_packet",
    paymentStatus: "not_applicable",
    paymentProvider: undefined,
    checkoutSessionId: undefined,
    paymentIntentId: undefined,
    amountCents: undefined,
    receiptUrl: undefined,
    packetStatus: "not_started",
    summary: bundle?.summary ?? input.summary,
    nextSteps: bundle?.nextSteps ?? input.nextSteps,
    selectedTrackId: trackId,
    treatmentClassification: "component_deferral",
    deferralComponentIds: bundle?.componentIds ?? input.deferralComponentIds ?? [],
    artifactRefs: {
      ...(input.artifactRefs ?? {}),
      selectedTrackId: trackId,
      treatmentClassification: "component_deferral",
      deferralComponentIds: bundle?.componentIds ?? input.deferralComponentIds ?? [],
      ...(bundle ? { componentDeferralTreatment: bundle } : {})
    }
  };
}

/**
 * The Briefcase-side terminal-treatment clamp.
 *
 * These treatments are candidates, not decisions, so this clamp does two jobs at
 * once. It saves the same closed guidance item every other deferral saves —
 * payment off, no amount, no checkout id, packet not started, the participant's
 * own locale — and it stamps pending_independent_review onto the persisted item,
 * so a row written today cannot later be mistaken for an approved treatment. It
 * runs innermost so an accepted exact deferral or an accepted component deferral
 * for the same track still has the final word.
 */
function clampTerminalTreatment(input: CreateConsumerBriefcaseItemInput): CreateConsumerBriefcaseItemInput {
  const trackId = input.selectedTrackId
    ?? (typeof input.artifactRefs?.selectedTrackId === "string" ? input.artifactRefs.selectedTrackId : null);
  const candidate = terminalTreatmentForTrack(trackId);
  const declared = input.treatmentClassification === "terminal_treatment_candidate"
    || input.artifactRefs?.treatmentClassification === "terminal_treatment_candidate";
  if (!declared && !candidate) return input;

  const localeHint = typeof input.artifactRefs?.locale === "string" ? input.artifactRefs.locale : "en";
  const bundle = terminalTreatmentBundle(trackId, localeHint);

  return {
    ...input,
    paymentAllowed: false,
    status: "guidance_saved",
    resultCode: "guidance_only",
    packetType: "guidance_packet",
    paymentStatus: "not_applicable",
    paymentProvider: undefined,
    checkoutSessionId: undefined,
    paymentIntentId: undefined,
    amountCents: undefined,
    receiptUrl: undefined,
    packetStatus: "not_started",
    summary: bundle?.stopReason ?? input.summary,
    nextSteps: bundle?.nextSteps ?? input.nextSteps,
    selectedTrackId: trackId,
    treatmentClassification: "terminal_treatment_candidate",
    artifactRefs: {
      ...(input.artifactRefs ?? {}),
      selectedTrackId: trackId,
      treatmentClassification: "terminal_treatment_candidate",
      treatmentReviewState: "pending_independent_review",
      ...(bundle ? { terminalTreatment: bundle } : {})
    }
  };
}

export async function createBriefcaseItem(rawInput: CreateConsumerBriefcaseItemInput): Promise<ConsumerBriefcaseItem> {
  const input = clampComponentDeferral(clampExactDeferral(clampTerminalTreatment(rawInput)));
  const fallbackItem = fallbackItemFromCreateInput(input);
  if (isCompletelyUnconfiguredSupabase()) {
    rememberFallbackItem(input.userId, fallbackItem);
    return fallbackItem;
  }
  // Configured deployments may only create result matters through
  // saveAuthoritativeScreeningResultToBriefcase. This legacy helper retains a
  // deterministic unconfigured preview path, but never attempts an
  // authenticated-role INSERT of Phase55-owned identity/payment columns.
  throw new AuthoritativeBriefcasePersistenceError(
    "direct Briefcase creation is retired; use server-authoritative screening persistence"
  );
}

export async function listBriefcaseItems(userId: string): Promise<ConsumerBriefcaseItem[]> {
  const supabase = await getConsumerBriefcaseClient();
  if (!supabase) return fallbackItemsForUser(userId);

  const { data, error } = await supabase
    .from("consumer_briefcase_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<ConsumerBriefcaseRow[]>();

  if (error || !data) return fallbackItemsForUser(userId);
  return data.map(rowToBriefcaseItem);
}

export async function getBriefcaseItem(userId: string, itemId: string): Promise<ConsumerBriefcaseItem | null> {
  const supabase = await getConsumerBriefcaseClient();
  if (!supabase) return fallbackItemsForUser(userId).find((item) => item.id === itemId) ?? null;

  const { data, error } = await supabase
    .from("consumer_briefcase_items")
    .select("*")
    .eq("user_id", userId)
    .eq("id", itemId)
    .maybeSingle<ConsumerBriefcaseRow>();

  if (error || !data) return null;
  return rowToBriefcaseItem(data);
}

export async function getBriefcaseItemForWebhook(userId: string, itemId: string): Promise<ConsumerBriefcaseItem | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return fallbackItemsForUser(userId).find((item) => item.id === itemId) ?? null;

  const { data, error } = await supabase
    .from("consumer_briefcase_items")
    .select("*")
    .eq("user_id", userId)
    .eq("id", itemId)
    .maybeSingle<ConsumerBriefcaseRow>();

  if (error || !data) return null;
  return rowToBriefcaseItem(data);
}

export async function isPartnerSponsoredPacketItem(item: ConsumerBriefcaseItem): Promise<boolean> {
  if (!item.sourceSessionId) return false;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("screening_sessions")
    .select("session_id")
    .eq("session_id", item.sourceSessionId)
    .eq("flow_mode", "rcap")
    .eq("partner_benefit_active", true)
    .not("partner_slug", "is", null)
    .maybeSingle<{ session_id: string }>();

  return !error && Boolean(data?.session_id);
}

/**
 * Resolve the strictly sponsored subset once on a server-rendered Briefcase
 * surface. Presentation code receives item ids rather than inferring partner
 * coverage from browser-controlled fields or a syntactically valid UUID.
 */
export async function sponsoredBriefcaseItemIds(
  items: ConsumerBriefcaseItem[]
): Promise<string[]> {
  const sponsored = await Promise.all(items.map(async (item) => (
    await isPartnerSponsoredPacketItem(item) ? item.id : null
  )));
  return sponsored.filter((itemId): itemId is string => itemId !== null);
}

// Resolves the partner slug that sponsors a Briefcase item, from the RCAP
// screening session that produced it. Returns null for DTC items (no partner
// session). Used to build partner packet-builder links from the item's actual
// partner instead of a hardcoded slug.
export async function partnerSlugForPacketItem(item: ConsumerBriefcaseItem): Promise<string | null> {
  if (!item.sourceSessionId) return null;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("screening_sessions")
    .select("partner_slug")
    .eq("session_id", item.sourceSessionId)
    .eq("flow_mode", "rcap")
    .not("partner_slug", "is", null)
    .maybeSingle<{ partner_slug: string | null }>();

  if (error || !data?.partner_slug) return null;
  return data.partner_slug;
}

export async function updateBriefcaseItemStatus(
  userId: string,
  itemId: string,
  status: ConsumerBriefcaseItem["status"]
): Promise<ConsumerBriefcaseItem | null> {
  const supabase = await getConsumerBriefcaseClient();

  if (!supabase) {
    const items = fallbackItemsForUser(userId);
    const index = items.findIndex((item) => item.id === itemId);
    if (index === -1) return null;
    items[index] = { ...items[index], status };
    fallbackItemsByUser.set(userId, items);
    return items[index];
  }

  const { data, error } = await supabase
    .from("consumer_briefcase_items")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", itemId)
    .select("*")
    .single<ConsumerBriefcaseRow>();

  if (error || !data) return null;
  return rowToBriefcaseItem(data);
}

/**
 * Records the Checkout Session the user was sent to, before any money moves.
 *
 * Split out from the old combined payment-metadata writer for two reasons.
 * Phase 52 revokes `checkout_session_id` from `authenticated` along with the
 * rest of the payment columns, so this cannot run as the participant any more.
 * And keeping it separate means the only code that can write `payment_status =
 * 'paid'` is the server-only payment writer — this helper's type does not admit
 * the value, and the `paid_requires_server_evidence` constraint would refuse it
 * anyway, since nothing here supplies a provider event or a named authority.
 */
export async function updateBriefcaseCheckoutSessionMetadata(
  userId: string,
  itemId: string,
  metadata: {
    paymentStatus: "unpaid";
    paymentProvider: NonNullable<ConsumerBriefcaseItem["paymentProvider"]>;
    checkoutSessionId: string;
    amountCents: NonNullable<ConsumerBriefcaseItem["amountCents"]>;
    packetStatus: ConsumerBriefcaseItem["packetStatus"];
  }
): Promise<ConsumerBriefcaseItem | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    const items = fallbackItemsForUser(userId);
    const index = items.findIndex((item) => item.id === itemId);
    if (index === -1) return null;
    items[index] = { ...items[index], ...metadata };
    fallbackItemsByUser.set(userId, items);
    return items[index];
  }

  const { data, error } = await supabase
    .from("consumer_briefcase_items")
    .update({
      payment_status: metadata.paymentStatus,
      payment_provider: metadata.paymentProvider,
      checkout_session_id: metadata.checkoutSessionId,
      amount_cents: metadata.amountCents,
      packet_status: metadata.packetStatus,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId)
    .eq("id", itemId)
    .select("*")
    .single<ConsumerBriefcaseRow>();

  if (error || !data) return null;
  return rowToBriefcaseItem(data);
}

/**
 * Packet status is not a payment fact, so it stays an ordinary application
 * write and keeps working after Phase 52.
 */
export async function updateBriefcasePacketStatusForWebhook(
  userId: string,
  itemId: string,
  packetStatus: ConsumerBriefcaseItem["packetStatus"]
): Promise<ConsumerBriefcaseItem | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    const items = fallbackItemsForUser(userId);
    const index = items.findIndex((item) => item.id === itemId);
    if (index === -1) return null;
    items[index] = { ...items[index], packetStatus };
    fallbackItemsByUser.set(userId, items);
    return items[index];
  }

  const { data, error } = await supabase
    .from("consumer_briefcase_items")
    .update({ packet_status: packetStatus, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", itemId)
    .select("*")
    .single<ConsumerBriefcaseRow>();

  if (error || !data) return null;
  return rowToBriefcaseItem(data);
}

export async function updateBriefcasePacketMetadata(
  userId: string,
  itemId: string,
  metadata: {
    packetStatus: ConsumerBriefcaseItem["packetStatus"];
    artifactRefs?: Record<string, unknown>;
  }
): Promise<ConsumerBriefcaseItem | null> {
  const supabase = await getConsumerBriefcaseClient();

  if (!supabase) {
    const items = fallbackItemsForUser(userId);
    const index = items.findIndex((item) => item.id === itemId);
    if (index === -1) return null;
    items[index] = {
      ...items[index],
      packetStatus: metadata.packetStatus,
      ...(metadata.artifactRefs ? {
        artifactRefs: mergeArtifactObjects(items[index].artifactRefs ?? {}, metadata.artifactRefs)
      } : {})
    };
    fallbackItemsByUser.set(userId, items);
    return items[index];
  }

  if (metadata.artifactRefs) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const current = await supabase
        .from("consumer_briefcase_items")
        .select("artifact_refs_json, updated_at")
        .eq("user_id", userId)
        .eq("id", itemId)
        .maybeSingle<{ artifact_refs_json: Record<string, unknown>; updated_at: string }>();
      if (current.error || !current.data) return null;
      const updated = await supabase
        .from("consumer_briefcase_items")
        .update({
          packet_status: metadata.packetStatus,
          ...(metadata.artifactRefs ? {
            artifact_refs_json: mergeArtifactObjects(current.data.artifact_refs_json ?? {}, metadata.artifactRefs)
          } : {}),
          updated_at: new Date(Date.now() + attempt).toISOString()
        })
        .eq("user_id", userId)
        .eq("id", itemId)
        .eq("updated_at", current.data.updated_at)
        .select("*")
        .maybeSingle<ConsumerBriefcaseRow>();
      if (updated.data) return rowToBriefcaseItem(updated.data);
      if (updated.error) return null;
    }
    return null;
  }

  const updates: {
    packet_status: ConsumerBriefcaseItem["packetStatus"];
    artifact_refs_json?: Record<string, unknown>;
    updated_at: string;
  } = {
    packet_status: metadata.packetStatus,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("consumer_briefcase_items")
    .update(updates)
    .eq("user_id", userId)
    .eq("id", itemId)
    .select("*")
    .single<ConsumerBriefcaseRow>();

  if (error || !data) return null;
  return rowToBriefcaseItem(data);
}

export async function updateBriefcasePacketMetadataForWebhook(
  userId: string,
  itemId: string,
  metadata: {
    packetStatus: ConsumerBriefcaseItem["packetStatus"];
    artifactRefs?: Record<string, unknown>;
  }
): Promise<ConsumerBriefcaseItem | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return updateBriefcasePacketMetadata(userId, itemId, metadata);

  if (metadata.artifactRefs) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const current = await supabase
        .from("consumer_briefcase_items")
        .select("artifact_refs_json, updated_at")
        .eq("user_id", userId)
        .eq("id", itemId)
        .maybeSingle<{ artifact_refs_json: Record<string, unknown>; updated_at: string }>();
      if (current.error || !current.data) return null;
      const updated = await supabase
        .from("consumer_briefcase_items")
        .update({
          packet_status: metadata.packetStatus,
          ...(metadata.artifactRefs ? {
            artifact_refs_json: mergeArtifactObjects(current.data.artifact_refs_json ?? {}, metadata.artifactRefs)
          } : {}),
          updated_at: new Date(Date.now() + attempt).toISOString()
        })
        .eq("user_id", userId)
        .eq("id", itemId)
        .eq("updated_at", current.data.updated_at)
        .select("*")
        .maybeSingle<ConsumerBriefcaseRow>();
      if (updated.data) return rowToBriefcaseItem(updated.data);
      if (updated.error) return null;
    }
    return null;
  }

  const updates: {
    packet_status: ConsumerBriefcaseItem["packetStatus"];
    artifact_refs_json?: Record<string, unknown>;
    updated_at: string;
  } = {
    packet_status: metadata.packetStatus,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("consumer_briefcase_items")
    .update(updates)
    .eq("user_id", userId)
    .eq("id", itemId)
    .select("*")
    .single<ConsumerBriefcaseRow>();

  if (error || !data) return null;
  return rowToBriefcaseItem(data);
}

export function saveEligibilityCheckToBriefcase(state: string, userId = "local-preview-user"): ConsumerBriefcaseItem {
  const item = {
    id: consumerBriefcaseId("check", state, "started"),
    type: "eligibility_check" as const,
    title: `${state} screening`,
    state,
    status: "check_saved" as const,
    createdAt: startedAt,
    summary: "Free screening started and saved to your Briefcase.",
    nextSteps: ["Finish the screening questions.", "Return here any time to continue."],
    paymentAllowed: false
  };
  rememberFallbackItem(userId, item);
  return item;
}

export function saveEligibilityResultToBriefcase(result: ExpungementAiEligibilityResult, userId = "local-preview-user"): ConsumerBriefcaseItem {
  const item = {
    id: result.briefcaseItemId ?? consumerBriefcaseId("result", result.state, result.resultCode),
    type: "result" as const,
    title: result.pathwayLabel ?? `${result.state} record-clearing result`,
    state: result.state,
    status: statusForResult(result.resultCode),
    resultCode: result.resultCode,
    createdAt: startedAt,
    summary: result.userLabel,
    nextSteps: result.nextSteps,
    paymentAllowed: result.paymentAllowed,
    pathwayLabel: result.pathwayLabel,
    packetType: result.packetType,
    ...(result.treatmentClassification === "component_deferral"
      ? {
        paymentAllowed: false,
        paymentStatus: "not_applicable" as const,
        packetStatus: "not_started" as const,
        selectedTrackId: result.selectedTrackId ?? null,
        treatmentClassification: "component_deferral" as const,
        deferralComponentIds: result.deferralComponentIds ?? [],
        artifactRefs: {
          selectedTrackId: result.selectedTrackId ?? null,
          treatmentClassification: "component_deferral",
          deferralComponentIds: result.deferralComponentIds ?? [],
          ...(result.componentDeferralTreatment ? { componentDeferralTreatment: result.componentDeferralTreatment } : {})
        }
      }
      : {})
  };
  rememberFallbackItem(userId, item);
  return item;
}

export function saveGeneratedPacketToBriefcase(result: ExpungementAiEligibilityResult, userId = "local-preview-user"): ConsumerBriefcaseItem {
  const item = {
    id: consumerBriefcaseId("packet", result.state, result.resultCode),
    type: "packet" as const,
    title: `${result.state} self-help packet`,
    state: result.state,
    status: "packet_ready" as const,
    resultCode: result.resultCode,
    createdAt: startedAt,
    summary: "Generated packet saved to Briefcase.",
    nextSteps: ["Download your packet.", "Review the filing checklist before you file."],
    paymentAllowed: false,
    pathwayLabel: result.pathwayLabel,
    packetType: result.packetType,
    packetStatus: "ready" as const
  };
  rememberFallbackItem(userId, item);
  return item;
}

export function getConsumerBriefcaseItems(userId = "local-preview-user"): ConsumerBriefcaseItem[] {
  const saved = fallbackItemsForUser(userId);
  if (saved.length > 0) return saved;

  return [
    saveEligibilityResultToBriefcase({
      resultCode: "packet_ready",
      userLabel: "Your self-help packet is ready to prepare.",
      state: "PA",
      pathwayLabel: "Pennsylvania non-conviction review",
      confidence: "high",
      paymentAllowed: true,
      priceCents: 5000,
      packetType: "custom_pleading",
      reasons: ["The engine found a packet-ready path."],
      nextSteps: ["Review the result.", "Pay once to generate the packet.", "Follow the filing checklist."],
      emailCaptureRecommended: false,
      disclaimer: consumerDisclaimer()
    }, userId),
    saveEligibilityResultToBriefcase({
      resultCode: "guidance_only",
      userLabel: "We saved guidance for this path.",
      state: "IL",
      pathwayLabel: "Illinois guidance matter",
      confidence: "medium",
      paymentAllowed: false,
      packetType: "guidance_packet",
      reasons: ["This in-scope path currently returns guidance instead of a packet."],
      nextSteps: ["Read the next steps.", "Gather your court record.", "Ask Wilma to explain the checklist."],
      emailCaptureRecommended: true,
      disclaimer: consumerDisclaimer()
    }, userId),
    {
      id: "wilma-conversation-sample",
      type: "wilma_conversation",
      title: "Wilma conversation",
      state: "PA",
      status: "check_saved",
      createdAt: startedAt,
      summary: "Wilma explained what a filing checklist is and pointed back to the free screening.",
      nextSteps: ["Continue the check from Briefcase."],
      paymentAllowed: false
    }
  ];
}

export function consumerDisclaimer() {
  return "Expungement.ai is self-help software, not a law firm. The court or agency makes the final decision. Review all documents before filing.";
}

async function getConsumerBriefcaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  return createServerSupabaseAuthClient();
}

function fallbackItemFromCreateInput(input: CreateConsumerBriefcaseItemInput): ConsumerBriefcaseItem {
  return {
    id: consumerBriefcaseId(input.itemType, input.jurisdiction, input.resultCode ?? input.status),
    type: input.itemType,
    title: input.pathwayLabel ?? `${input.jurisdiction} Briefcase item`,
    state: input.jurisdiction,
    status: input.status,
    resultCode: input.resultCode,
    createdAt: startedAt,
    summary: input.summary,
    nextSteps: input.nextSteps,
    paymentAllowed: input.paymentAllowed,
    pathwayLabel: input.pathwayLabel,
    packetType: input.packetType,
    artifactRefs: input.artifactRefs,
    selectedTrackId: input.selectedTrackId ?? null,
    treatmentClassification: input.treatmentClassification ?? null,
    ...(input.deferralComponentIds ? { deferralComponentIds: input.deferralComponentIds } : {}),
    paymentStatus: input.paymentStatus ?? (input.paymentAllowed ? "unpaid" : "not_applicable"),
    paymentProvider: input.paymentProvider,
    checkoutSessionId: input.checkoutSessionId,
    paymentIntentId: input.paymentIntentId,
    amountCents: input.amountCents ?? (input.paymentAllowed ? 5000 : undefined),
    packetStatus: input.packetStatus,
    reminderAt: input.reminderAt,
    sourceSessionId: input.sourceSessionId
  };
}

function rowToBriefcaseItem(row: ConsumerBriefcaseRow): ConsumerBriefcaseItem {
  const summaryText = typeof row.summary_json?.text === "string" ? row.summary_json.text : "Saved Briefcase item.";

  return {
    id: row.id,
    type: row.item_type,
    title: row.pathway_label ?? `${row.jurisdiction} Briefcase item`,
    state: row.jurisdiction,
    status: row.status,
    resultCode: row.result_code ?? undefined,
    createdAt: row.created_at,
    summary: summaryText,
    nextSteps: Array.isArray(row.next_steps_json) ? row.next_steps_json : [],
    paymentAllowed: row.payment_allowed,
    pathwayLabel: row.pathway_label ?? undefined,
    packetType: row.packet_type ?? undefined,
    artifactRefs: row.artifact_refs_json,
    // Re-surfaced from the stored refs so downstream payment and render checks
    // read the same server-authored identity that was persisted.
    selectedTrackId: typeof row.artifact_refs_json?.selectedTrackId === "string" ? row.artifact_refs_json.selectedTrackId : null,
    treatmentClassification: row.artifact_refs_json?.treatmentClassification === "component_deferral"
      ? "component_deferral"
      : row.artifact_refs_json?.treatmentClassification === "exact_supported_deferral"
        ? "exact_supported_deferral"
        : null,
    ...(Array.isArray(row.artifact_refs_json?.deferralComponentIds)
      ? { deferralComponentIds: row.artifact_refs_json.deferralComponentIds as string[] }
      : {}),
    paymentStatus: row.payment_status ?? undefined,
    paymentProvider: row.payment_provider ?? undefined,
    checkoutSessionId: row.checkout_session_id ?? undefined,
    paymentIntentId: row.payment_intent_id ?? undefined,
    amountCents: row.amount_cents ?? undefined,
    packetStatus: row.packet_status ?? undefined,
    reminderAt: row.reminder_at ?? undefined,
    sourceSessionId: row.source_session_id ?? undefined
  };
}

function fallbackItemsForUser(userId: string) {
  return fallbackItemsByUser.get(userId) ?? [];
}

function rememberFallbackItem(userId: string, item: ConsumerBriefcaseItem) {
  const existing = fallbackItemsForUser(userId).filter((candidate) => candidate.id !== item.id);
  fallbackItemsByUser.set(userId, [item, ...existing]);
}

function statusForResult(resultCode: ExpungementAiEligibilityResult["resultCode"]): ConsumerBriefcaseItem["status"] {
  if (resultCode === "packet_ready" || resultCode === "packet_ready_with_caution") return "packet_ready";
  if (resultCode === "guidance_only" || resultCode === "not_covered_yet") return "guidance_saved";
  if (resultCode === "needs_more_info") return "needs_info";
  if (resultCode === "needs_review") return "needs_review";
  if (resultCode === "not_yet") return "waiting";
  if (resultCode === "likely_not_eligible") return "not_eligible";
  return "hard_stop";
}

function consumerBriefcaseId(kind: string, state: string, value: string) {
  return `expai-${kind}-${state.toLowerCase()}-${value.replaceAll("_", "-")}`;
}
