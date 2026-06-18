import { NextRequest, NextResponse } from "next/server";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";
import { buildWilmaContext } from "@/lib/expungement-ai/wilma-context";
import { isWilmaKillSwitchActive, wilmaKillSwitchResponse } from "@/lib/expungement-ai/wilma-kill-switch";
import { guardWilmaResponse } from "@/lib/expungement-ai/wilma-safety";
import { createWilmaTelemetryRecord, logWilmaExchange } from "@/lib/expungement-ai/wilma-telemetry";
import { draftWilmaPlaceholderResponse, type WilmaPageContext } from "@/lib/expungement-ai/wilma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WilmaChatRequest = {
  message?: string;
  pageContext?: WilmaPageContext;
  state?: string;
  briefcaseItemId?: string;
};

export async function POST(request: NextRequest) {
  const auth = await requireConsumerBriefcaseSession();
  const body = await request.json().catch(() => null) as WilmaChatRequest | null;
  const message = body?.message?.trim();
  const pageContext = body?.pageContext ?? "briefcase";

  if (!message) {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }

  if (isWilmaKillSwitchActive()) {
    return NextResponse.json(wilmaKillSwitchResponse());
  }

  const briefcaseItem = body?.briefcaseItemId ? await getBriefcaseItem(auth.userId, body.briefcaseItemId) : null;
  const context = buildWilmaContext({
    state: body?.state,
    pageContext,
    briefcaseItem
  });

  const draftResponse = draftWilmaPlaceholderResponse(message);
  const guardResult = guardWilmaResponse({ userMessage: message, draftResponse, context });
  const telemetry = createWilmaTelemetryRecord({
    sessionId: auth.userId,
    state: context.state,
    userMessage: message,
    wilmaResponse: guardResult.response,
    context,
    guardResult
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
