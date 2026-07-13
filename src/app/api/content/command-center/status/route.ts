import { NextResponse } from "next/server";
import { z } from "zod";

import { SIGNATURE_HEADER, getCommandCenterConfig, verifySignature } from "@/lib/content/command-center";
import { jsonError, requireSupabase, storageFailure, UUID_PATTERN, type RouteContext } from "@/lib/content/route-support";
import { SOCIAL_CHANNELS } from "@/lib/content/types";
import { recordAudit } from "@/lib/content/workflow";
import { getSafeRequestId, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/content/command-center/status";

const DELIVERY_STATUSES = ["pending", "accepted", "scheduled", "published", "failed", "skipped"] as const;

const statusSchema = z.object({
  campaign_id: z.string().regex(UUID_PATTERN, "Must be a UUID."),
  channel: z.enum(SOCIAL_CHANNELS),
  delivery_status: z.enum(DELIVERY_STATUSES),
  external_reference: z.string().trim().max(300).nullish()
});

/** The Command Center may post the bare status object or wrap it in the standard event envelope. */
function unwrap(parsed: unknown): unknown {
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const record = parsed as Record<string, unknown>;
    if (record.payload && typeof record.payload === "object") {
      return record.payload;
    }
  }
  return parsed;
}

/**
 * Inbound delivery-status callback FROM the Command Center.
 *
 * The signature is verified over the RAW request text — the exact bytes that were signed. Parsing to
 * JSON and re-serializing would change key order and whitespace, and every signature would fail (or,
 * worse, tempt someone to verify a re-serialization that is not what the sender actually signed).
 *
 * Unsigned input is never accepted: with no shared secret configured this route answers 401 rather
 * than trusting the caller.
 */
export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const config = getCommandCenterConfig();
  if (!config.configured) {
    logSecurityWarn({ event: "content status callback unconfigured", route: ROUTE, outcome: "unconfigured", requestId });
    return jsonError(401, "Signature verification is not available.");
  }

  const rawBody = await request.text();
  const signature = request.headers.get(SIGNATURE_HEADER);

  // Rejects a missing/garbled signature, a forged digest, AND a captured-and-replayed request whose
  // timestamp has aged out of the tolerance window.
  const verification = verifySignature(rawBody, config.secret, signature);
  if (!verification.valid) {
    logSecurityWarn({
      event: "content status callback rejected",
      route: ROUTE,
      outcome: verification.reason,
      requestId,
      metadata: { error_code: verification.reason }
    });
    return jsonError(401, "Invalid signature.");
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  const parsed = statusSchema.safeParse(unwrap(parsedBody));
  if (!parsed.success) {
    logSecurityWarn({ event: "content status callback invalid", route: ROUTE, outcome: "invalid_payload", requestId });
    return jsonError(400, "Invalid status payload.");
  }
  const input = parsed.data;

  const { client, response } = requireSupabase(context);
  if (!client) return response;

  const { data, error } = await client
    .from("content_campaign_channels")
    .update({
      delivery_status: input.delivery_status,
      external_reference: input.external_reference ?? null,
      status_updated_at: new Date().toISOString()
    })
    .eq("campaign_id", input.campaign_id)
    .eq("channel", input.channel)
    .select("campaign_channel_id, campaign_id, channel, delivery_status, external_reference");

  if (error) return storageFailure(context, "content status callback update failed", error);
  if (!data || !data.length) {
    return jsonError(404, "No such campaign channel.");
  }

  await recordAudit({
    actorId: null,
    actorRole: null,
    action: "promotion_status_received",
    entityType: "content_post",
    entityId: null,
    detail: {
      campaign_id: input.campaign_id,
      channel: input.channel,
      delivery_status: input.delivery_status
    }
  });

  logSecurityInfo({
    event: "content status callback applied",
    route: ROUTE,
    outcome: "ok",
    requestId,
    metadata: { new_status: input.delivery_status }
  });

  return NextResponse.json({ success: true, channel: data[0] });
}
