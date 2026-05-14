import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  parseCheckrWebhookEvent,
  processCheckrWebhookEvent,
  type CheckrWebhookDatabase,
  verifyCheckrSignature
} from "@/lib/checkr-webhooks";
import { rateLimitedResponse } from "@/lib/security/api-errors";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const signature = request.headers.get("x-checkr-signature");
  const payload = await request.text();

  if (!signature || !verifyCheckrSignature(payload, signature, env.CHECKR_WEBHOOK_SECRET)) {
    const rateLimit = await checkRateLimit({
      key: rateLimitKey(request, "webhook:checkr:invalid-signature"),
      limit: 30,
      windowMs: 60_000
    });

    if (!rateLimit.allowed) {
      return rateLimitedResponse(rateLimit.resetAt);
    }

    return NextResponse.json({ error: "Invalid Checkr signature." }, { status: 400 });
  }

  const event = parseCheckrWebhookEvent(payload);
  const result = await processCheckrWebhookEvent(event, prisma as unknown as CheckrWebhookDatabase);

  return NextResponse.json(result, { status: 202 });
}
