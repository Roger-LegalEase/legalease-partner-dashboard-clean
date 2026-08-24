import { NextRequest, NextResponse } from "next/server";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";
import { buildWilmaContext } from "@/lib/expungement-ai/wilma-context";
import { isWilmaKillSwitchActive, wilmaKillSwitchResponse } from "@/lib/expungement-ai/wilma-kill-switch";
import { guardWilmaResponse } from "@/lib/expungement-ai/wilma-safety";
import { createWilmaTelemetryRecord, logWilmaExchange } from "@/lib/expungement-ai/wilma-telemetry";
import { generateWilmaReply, normalizeWilmaHistory, type WilmaTurn } from "@/lib/expungement-ai/wilma-model";
import { type WilmaPageContext } from "@/lib/expungement-ai/wilma";
import { normalizeLocale, t, type Locale } from "@/lib/expungement-ai/localization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WilmaChatRequest = {
  message?: string;
  pageContext?: WilmaPageContext;
  state?: string;
  briefcaseItemId?: string;
  locale?: string;
  /** UX-GLOBAL-011 — the question on screen. Bounded and sanitized below. */
  activeQuestion?: { id?: string; prompt?: string; helperText?: string; stage?: string };
  // Prior turns in this conversation, oldest first, excluding the current message.
  // Normalized (validated, bounded) server-side before reaching the model.
  history?: WilmaTurn[];
};

export async function POST(request: NextRequest) {
  const auth = await requireConsumerBriefcaseSession();
  const body = await request.json().catch(() => null) as WilmaChatRequest | null;
  const message = body?.message?.trim();
  const pageContext = body?.pageContext ?? "briefcase";
  const locale: Locale = normalizeLocale(body?.locale);

  if (!message) {
    return NextResponse.json({ error: t(locale, "wilma.message_required", "message is required.") }, { status: 400 });
  }

  if (isWilmaKillSwitchActive()) {
    return NextResponse.json(wilmaKillSwitchResponse(locale));
  }

  const briefcaseItem = body?.briefcaseItemId ? await getBriefcaseItem(auth.userId, body.briefcaseItemId) : null;
  // Bounded: an id, a prompt and helper copy, each length-capped. Anything else
  // a caller sends on this field is dropped rather than forwarded to the model.
  const rawQuestion = body?.activeQuestion;
  const activeQuestion = rawQuestion?.id && rawQuestion?.prompt
    ? {
      id: String(rawQuestion.id).slice(0, 120),
      prompt: String(rawQuestion.prompt).slice(0, 400),
      ...(rawQuestion.helperText ? { helperText: String(rawQuestion.helperText).slice(0, 600) } : {}),
      ...(rawQuestion.stage ? { stage: String(rawQuestion.stage).slice(0, 80) } : {})
    }
    : null;

  const context = buildWilmaContext({
    state: body?.state,
    pageContext,
    briefcaseItem,
    activeQuestion
  });

  const history = normalizeWilmaHistory(body?.history);
  const reply = await generateWilmaReply({ message, context, history, locale });
  const draftResponse = reply.text;
  const guardResult = guardWilmaResponse({ userMessage: message, draftResponse, context, locale });
  const telemetry = createWilmaTelemetryRecord({
    sessionId: auth.userId,
    state: context.state,
    userMessage: message,
    wilmaResponse: guardResult.response,
    context,
    guardResult,
    modelVersion: reply.modelVersion
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
