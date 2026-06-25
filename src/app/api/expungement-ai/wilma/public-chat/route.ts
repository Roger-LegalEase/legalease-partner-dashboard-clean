import { NextRequest, NextResponse } from "next/server";
import { buildPublicWilmaContext } from "@/lib/expungement-ai/wilma-context";
import { isWilmaKillSwitchActive, wilmaKillSwitchResponse } from "@/lib/expungement-ai/wilma-kill-switch";
import { guardWilmaResponse } from "@/lib/expungement-ai/wilma-safety";
import { createWilmaTelemetryRecord, logWilmaExchange } from "@/lib/expungement-ai/wilma-telemetry";
import {
  generateWilmaReply,
  normalizeWilmaHistory,
  WILMA_PUBLIC_MODEL,
  MAX_HISTORY_TURNS_PUBLIC,
  MAX_TURN_CHARS_PUBLIC,
  MAX_MESSAGE_CHARS_PUBLIC,
  type WilmaTurn
} from "@/lib/expungement-ai/wilma-model";
import {
  consumePublicRateLimit,
  isPublicSpendCapExhausted,
  recordPublicSpend,
  requestCostMicroUsd,
  getClientIp,
  hashIp
} from "@/lib/expungement-ai/wilma-rate-limit";
import { verifyTurnstileToken } from "@/lib/expungement-ai/wilma-bot-challenge";
import type { WilmaPageContext } from "@/lib/expungement-ai/wilma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ANONYMOUS, UNAUTHENTICATED landing endpoint. By construction this path is fully anonymous:
// it never consults the consumer session, never loads a saved case, and never reads a case id
// — state content only, no case visibility. The guard, kill-switch, system prompt, and
// telemetry all still apply, exactly like the authenticated route.
type PublicWilmaRequest = {
  message?: string;
  pageContext?: WilmaPageContext;
  state?: string;
  history?: WilmaTurn[];
  turnstileToken?: string;
  conversationId?: string;
};

// Only non-case-bearing surfaces are valid on the anonymous path.
const PUBLIC_PAGE_CONTEXTS: WilmaPageContext[] = ["landing", "pricing", "start"];

const RATE_LIMIT_COPY = "I'm getting a lot of questions right at this moment — give me a few seconds and try again. The free screening tool is always available in the meantime.";
const BOT_COPY = "I couldn't verify this request. Refresh the page and try again, or head straight to the free screening tool.";
const TURNS_COPY = "We've covered a lot here. This is a great point to start the free screening — it checks your details against your state's rules and saves your place.";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as PublicWilmaRequest | null;
  const message = body?.message?.trim();
  const requestedContext = body?.pageContext;
  const pageContext: WilmaPageContext = requestedContext && PUBLIC_PAGE_CONTEXTS.includes(requestedContext)
    ? requestedContext
    : "landing";

  if (!message) {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }

  // 1. Kill-switch — before any other work or model call.
  if (isWilmaKillSwitchActive()) {
    return NextResponse.json(wilmaKillSwitchResponse());
  }

  // 2. Message length — reject overlong input before spending tokens.
  if (message.length > MAX_MESSAGE_CHARS_PUBLIC) {
    return NextResponse.json(
      { response: `Mind keeping it under ${MAX_MESSAGE_CHARS_PUBLIC} characters? Shorter questions are easier for me to answer well.`, blocked: false },
      { status: 400 }
    );
  }

  const clientIp = getClientIp(request.headers);
  const ipHash = hashIp(clientIp);

  // 3. Bot challenge (Turnstile). Disabled when no secret is configured (staging).
  const challenge = await verifyTurnstileToken(body?.turnstileToken, clientIp);
  if (!challenge.ok) {
    return NextResponse.json({ response: BOT_COPY, blocked: false, challenge: challenge.reason }, { status: 403 });
  }

  // 4. Per-IP rate limit + per-conversation turn cap.
  const decision = await consumePublicRateLimit(ipHash, body?.conversationId);
  if (decision.kind === "rate_limited") {
    return NextResponse.json(
      { response: RATE_LIMIT_COPY, blocked: false, scope: decision.scope },
      { status: 429, headers: { "retry-after": String(decision.retryAfterSeconds) } }
    );
  }
  if (decision.kind === "turns_exceeded") {
    return NextResponse.json({ response: TURNS_COPY, blocked: false });
  }

  // 5. Public context — state content only, NEVER a case. A case id is never read here.
  const context = buildPublicWilmaContext({ state: body?.state, pageContext });
  const history = normalizeWilmaHistory(body?.history, {
    maxTurns: MAX_HISTORY_TURNS_PUBLIC,
    maxTurnChars: MAX_TURN_CHARS_PUBLIC
  });

  // 6. Global daily spend cap. When the store is unreachable ("store_unavailable" above, or
  // "unknown" here) we fail safe: skip the model and serve the deterministic fallback.
  const capState = decision.kind === "store_unavailable" ? "unknown" : await isPublicSpendCapExhausted();
  const forceFallback = decision.kind === "store_unavailable" || capState === true || capState === "unknown";

  // 7. Generate (live gpt-4o, or deterministic fallback). Locked to the tested model.
  const reply = await generateWilmaReply({
    message,
    context,
    history,
    surface: "public_landing",
    model: WILMA_PUBLIC_MODEL,
    forceFallback
  });

  // 8. Meter spend against the daily cap when a live call actually happened.
  if (reply.usage) {
    await recordPublicSpend(requestCostMicroUsd(reply.usage));
  }

  // 9. Guard — polices every output before it reaches the user.
  const guardResult = guardWilmaResponse({ userMessage: message, draftResponse: reply.text, context });

  // 10. Telemetry — pseudonymous (hashed IP / conversation id), PII-redacted, public surface.
  const telemetry = createWilmaTelemetryRecord({
    sessionId: body?.conversationId || ipHash,
    state: context.state,
    userMessage: message,
    wilmaResponse: guardResult.response,
    context,
    guardResult,
    modelVersion: reply.modelVersion,
    surface: "public_landing"
  });
  await logWilmaExchange(telemetry);

  return NextResponse.json({
    response: guardResult.response,
    blocked: guardResult.blocked,
    guardFlags: guardResult.flags,
    redirectOccurred: guardResult.redirectOccurred,
    redirectTarget: guardResult.redirectTarget,
    injectedStateContentIds: context.injectedStateContentIds
  });
}
