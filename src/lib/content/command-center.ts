import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import type { ContentEventEnvelope, ContentEventType, SocialChannel } from "@/lib/content/types";

/**
 * Outbound integration boundary to the LegalEase Command Center.
 *
 * DIVISION OF OWNERSHIP (do not blur this line):
 *   LegalEase (this repo) owns  — content, social drafts, social assets, promotion approval, the
 *                                 outbound request, and ingestion of status callbacks.
 *   Command Center owns         — connected social accounts, scheduling, external publishing,
 *                                 external platform IDs, retry operations, engagement reporting.
 *
 * This module never publishes to a social network. It signs and hands off a promotion package, and
 * it records what the Command Center reports back.
 *
 * DELIVERY CONTRACT
 *   - Transactional outbox: the row is written in the same transaction as the approval, so an
 *     approval can never be recorded without its delivery being queued (or vice versa).
 *   - Stable event_id + idempotency_key: retries are safe; the receiver de-duplicates.
 *   - HMAC-SHA256 over `${timestamp}.${canonical_json}` with a shared secret, in the
 *     X-LegalEase-Signature header as `t=<unix>,v1=<hex>` (Stripe-style, so replay protection is
 *     structurally impossible to forget: the timestamp is inside the signed material).
 *   - The receiver MUST reject a signature whose timestamp is outside a tolerance window, which is
 *     what makes a captured-and-replayed request fail even though its signature is valid.
 *
 * HONEST DISABLED STATE: with no endpoint/secret configured this module reports `unconfigured` and
 * the CMS surfaces "not connected" plus a local JSON export. It never pretends to have sent.
 */

export const SIGNATURE_HEADER = "x-legalease-signature";
export const EVENT_ID_HEADER = "x-legalease-event-id";
export const IDEMPOTENCY_HEADER = "x-legalease-idempotency-key";

/** Replay window. A signed request older (or newer) than this is rejected by the receiver. */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export type CommandCenterConfig =
  | { configured: true; endpoint: string; secret: string }
  | { configured: false; reason: "disabled" | "missing_endpoint" | "missing_secret" };

/**
 * Read the integration config. Fail-closed and explicit: the caller can tell the difference
 * between "switched off", "half-configured", and "ready", and the CMS shows exactly that.
 */
export function getCommandCenterConfig(): CommandCenterConfig {
  const enabled = process.env.COMMAND_CENTER_CONTENT_EVENTS_ENABLED?.trim().toLowerCase() === "true";
  if (!enabled) {
    return { configured: false, reason: "disabled" };
  }

  const endpoint = process.env.COMMAND_CENTER_CONTENT_EVENTS_ENDPOINT?.trim();
  if (!endpoint) {
    return { configured: false, reason: "missing_endpoint" };
  }

  const secret = process.env.COMMAND_CENTER_CONTENT_SIGNING_SECRET?.trim();
  if (!secret) {
    return { configured: false, reason: "missing_secret" };
  }

  return { configured: true, endpoint, secret };
}

/**
 * Canonical JSON: object keys sorted recursively, no incidental whitespace. Both sides must derive
 * the identical byte string or every signature fails, so this is deliberately boring and total.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortValue(source[key]);
    }
    return sorted;
  }
  return value;
}

/** Sign the canonical payload. The timestamp is part of the signed material — that is the replay guard. */
export function signPayload(canonicalPayload: string, secret: string, timestampSeconds: number): string {
  const material = `${timestampSeconds}.${canonicalPayload}`;
  const digest = createHmac("sha256", secret).update(material).digest("hex");
  return `t=${timestampSeconds},v1=${digest}`;
}

export type SignatureVerification =
  | { valid: true }
  | { valid: false; reason: "malformed" | "stale" | "mismatch" };

/**
 * Verify an inbound signature (used by the status-callback route, where the Command Center is the
 * sender). Constant-time compare, and a stale timestamp is rejected even when the digest matches —
 * a valid signature replayed an hour later must not be accepted.
 */
export function verifySignature(
  canonicalPayload: string,
  secret: string,
  header: string | null,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): SignatureVerification {
  if (!header) return { valid: false, reason: "malformed" };

  const parts = header.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, val] = part.split("=");
    if (key && val) acc[key.trim()] = val.trim();
    return acc;
  }, {});

  const timestamp = Number.parseInt(parts.t ?? "", 10);
  const provided = parts.v1;
  if (!Number.isFinite(timestamp) || !provided) {
    return { valid: false, reason: "malformed" };
  }

  if (Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
    return { valid: false, reason: "stale" };
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${canonicalPayload}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");
  if (expectedBuf.length !== providedBuf.length) {
    return { valid: false, reason: "mismatch" };
  }
  if (!timingSafeEqual(expectedBuf, providedBuf)) {
    return { valid: false, reason: "mismatch" };
  }

  return { valid: true };
}

// --- Promotion package ---------------------------------------------------------------------------

export type PromotionChannelPackage = {
  channel: SocialChannel;
  primary_caption: string | null;
  alternate_caption: string | null;
  founder_voice_caption: string | null;
  partner_caption: string | null;
  hashtags: string[];
  mention_tags: string[];
  link: string;
  asset: { url: string; width: number; height: number; template: string } | null;
};

export type PromotionPackage = {
  post: {
    id: string;
    slug: string;
    destination: string;
    content_type: string;
    title: string;
    subtitle: string | null;
    canonical_url: string;
    published_at: string | null;
    author: string | null;
  };
  channels: PromotionChannelPackage[];
};

/**
 * Build the signed envelope for a promotion request. `idempotencyKey` must be stable for a given
 * (post, campaign) so a retry — or a double-click in the CMS — cannot cause a second publish.
 */
export function buildPromotionEnvelope(options: {
  eventType: ContentEventType;
  idempotencyKey: string;
  payload: PromotionPackage | Record<string, unknown>;
  eventId?: string;
  issuedAt?: string;
}): ContentEventEnvelope {
  return {
    event_id: options.eventId ?? randomUUID(),
    event_type: options.eventType,
    idempotency_key: options.idempotencyKey,
    issued_at: options.issuedAt ?? new Date().toISOString(),
    source: "legalease_content",
    payload: options.payload as Record<string, unknown>
  };
}

/** Deterministic idempotency key. Same post + same campaign + same event => same key, forever. */
export function promotionIdempotencyKey(postId: string, campaignId: string, eventType: ContentEventType): string {
  return `${eventType}:${postId}:${campaignId}`;
}

// --- UTM ------------------------------------------------------------------------------------------

const CHANNEL_UTM_SOURCE: Record<SocialChannel, string> = {
  linkedin: "linkedin",
  x: "x",
  facebook: "facebook",
  instagram: "instagram",
  threads: "threads",
  email: "newsletter",
  partner_kit: "partner_kit"
};

/**
 * Build the tracked share link for a channel. Existing query params on the canonical URL are
 * preserved; UTM params are set (not appended blindly), so re-running this is idempotent.
 */
export function buildTrackedLink(
  canonicalUrl: string,
  channel: SocialChannel,
  campaign: string,
  overrides?: { source?: string | null; medium?: string | null; campaign?: string | null }
): string {
  const url = new URL(canonicalUrl);
  url.searchParams.set("utm_source", overrides?.source?.trim() || CHANNEL_UTM_SOURCE[channel]);
  url.searchParams.set("utm_medium", overrides?.medium?.trim() || (channel === "email" ? "email" : "social"));
  url.searchParams.set("utm_campaign", overrides?.campaign?.trim() || campaign);
  return url.toString();
}

// --- Delivery ---------------------------------------------------------------------------------------

export type DeliveryResult =
  | { ok: true; status: number }
  | { ok: false; kind: "unconfigured"; reason: string }
  | { ok: false; kind: "rejected"; status: number; body: string }
  | { ok: false; kind: "network"; error: string };

/**
 * Deliver one envelope. Returns a discriminated result rather than throwing, because the outbox
 * worker needs to distinguish "never configured" (do not retry, do not mark failed) from
 * "the receiver said no" (retry with backoff).
 */
export async function deliverEnvelope(envelope: ContentEventEnvelope): Promise<DeliveryResult> {
  const config = getCommandCenterConfig();
  if (!config.configured) {
    return { ok: false, kind: "unconfigured", reason: config.reason };
  }

  const canonical = canonicalJson(envelope);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signPayload(canonical, config.secret, timestamp);

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [SIGNATURE_HEADER]: signature,
        [EVENT_ID_HEADER]: envelope.event_id,
        [IDEMPOTENCY_HEADER]: envelope.idempotency_key
      },
      // Send the canonical bytes we signed, not a re-serialization — otherwise key ordering could
      // differ from the signed material and every signature would fail verification downstream.
      body: canonical
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { ok: false, kind: "rejected", status: response.status, body: body.slice(0, 500) };
    }

    return { ok: true, status: response.status };
  } catch (error) {
    return { ok: false, kind: "network", error: error instanceof Error ? error.message : String(error) };
  }
}

/** Exponential backoff with a cap. Used by the outbox worker to set next_attempt_at. */
export function nextAttemptDelaySeconds(attempts: number): number {
  return Math.min(60 * 60, 30 * 2 ** Math.max(0, attempts - 1));
}
