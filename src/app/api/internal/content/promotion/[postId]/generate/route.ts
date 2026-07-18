import { NextResponse } from "next/server";

import { denyUnlessContentCapability } from "@/lib/content/auth";
import {
  PROMOTION_AI_NOT_CONFIGURED_MESSAGE,
  promotionGenerationInputSchema
} from "@/lib/content/promotion-generation-contract";
import {
  PromotionGenerationError,
  checkPromotionGenerationRateLimit,
  generatePromotionCampaign,
  loadPromotionProviderSource,
  promotionAiConfig
} from "@/lib/content/promotion-generation";
import { promotionPostIsInScope } from "@/lib/content/promotion-package";
import {
  jsonError,
  readJsonBody,
  requireSupabase,
  UUID_PATTERN,
  type RouteContext
} from "@/lib/content/route-support";
import { recordAudit } from "@/lib/content/workflow";
import {
  getSafeRequestId,
  logSecurityInfo,
  logSecurityWarn
} from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/internal/content/promotion/[postId]/generate";

/**
 * Produce reviewable suggestions from the SAVED post. This route never persists copy or approval.
 * The browser supplies campaign controls only; article text, workflow, author, and URL are loaded
 * behind the capability gate and narrowed to the authenticated partner scope.
 */
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const gate = await denyUnlessContentCapability("social.draft", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const { postId } = await params;
  if (!UUID_PATTERN.test(postId)) return jsonError(400, "Invalid post id.");

  const parsed = await readJsonBody(request, promotionGenerationInputSchema, context);
  if (!parsed.ok) return parsed.response;

  const config = promotionAiConfig();
  if (!config.configured) {
    return jsonError(503, PROMOTION_AI_NOT_CONFIGURED_MESSAGE, {
      code: "promotion_ai_not_configured",
      reason: config.reason
    });
  }

  const rateLimit = checkPromotionGenerationRateLimit(`${gate.session.userId}:${postId}`);
  if (!rateLimit.ok) {
    return NextResponse.json(
      {
        success: false,
        error: "Campaign drafting is temporarily rate limited. Your existing drafts were not changed.",
        code: "promotion_generation_rate_limited",
        retryAfterSeconds: rateLimit.retryAfterSeconds
      },
      { status: 429, headers: { "retry-after": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const { client, response } = requireSupabase(context);
  if (!client) return response;

  const loaded = await loadPromotionProviderSource(client, postId);
  if (!loaded || !promotionPostIsInScope(gate.session, loaded.post)) {
    return jsonError(404, "Post not found.");
  }

  const channels = parsed.data.channels ?? [];
  try {
    const generated = await generatePromotionCampaign({
      source: loaded.source,
      input: parsed.data,
      apiKey: config.apiKey,
      model: config.model
    });

    await recordAudit({
      actorId: gate.session.userId,
      actorRole: gate.session.role,
      action: "promotion_generated",
      entityType: "content_post",
      entityId: postId,
      detail: {
        source_version: loaded.post.version,
        channels: channels.length ? channels : "all",
        generation_mode: parsed.data.mode,
        provider: "openai",
        model: config.model,
        success: true,
        issue_count: generated.issues.length
      }
    });

    logSecurityInfo({
      event: "content promotion generated",
      route: ROUTE,
      outcome: "ok",
      requestId,
      metadata: { row_id: postId }
    });

    return NextResponse.json(
      {
        success: true,
        generatedAt: new Date().toISOString(),
        sourceVersion: loaded.post.version,
        suggestions: generated.output,
        issues: generated.issues
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    const timedOut =
      (error instanceof PromotionGenerationError && error.code === "timeout") ||
      (error instanceof Error && /timeout|timed out/i.test(`${error.name} ${error.message}`));
    const invalid = error instanceof PromotionGenerationError && error.code === "invalid_provider_output";
    const code = timedOut ? "promotion_generation_timeout" : invalid ? "invalid_provider_output" : "promotion_generation_failed";

    await recordAudit({
      actorId: gate.session.userId,
      actorRole: gate.session.role,
      action: "promotion_generation_failed",
      entityType: "content_post",
      entityId: postId,
      detail: {
        source_version: loaded.post.version,
        channels: channels.length ? channels : "all",
        generation_mode: parsed.data.mode,
        provider: "openai",
        model: config.model,
        success: false,
        failure_code: code
      }
    });

    logSecurityWarn({
      event: "content promotion generation failed",
      route: ROUTE,
      outcome: code,
      requestId,
      metadata: { row_id: postId, error_code: code }
    });

    return jsonError(
      timedOut ? 504 : 502,
      timedOut
        ? "Campaign drafting timed out. Try again; your existing drafts were not changed."
        : invalid
          ? "The drafting provider returned an invalid campaign. Nothing was applied or saved."
          : "Campaign drafting failed. Try again; your existing drafts were not changed.",
      { code }
    );
  }
}
