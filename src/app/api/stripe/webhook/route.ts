import { NextResponse } from "next/server";
import { stripe } from "@/lib/billing/stripe";
import { processStripeWebhookEvent, type BillingDatabase } from "@/lib/billing/webhooks";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { rateLimitedResponse, safeErrorResponse } from "@/lib/security/api-errors";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return rateLimitInvalidAttempt(request, "webhook:stripe:missing-signature");
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
    const result = await processStripeWebhookEvent(event, prisma as unknown as BillingDatabase);
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    const rateLimit = await checkRateLimit({
      key: rateLimitKey(request, "webhook:stripe:invalid-signature"),
      limit: 30,
      windowMs: 60_000
    });

    if (!rateLimit.allowed) {
      return rateLimitedResponse(rateLimit.resetAt);
    }

    return safeErrorResponse(error, "Invalid Stripe webhook.", 400);
  }
}

async function rateLimitInvalidAttempt(request: Request, scope: string) {
  const rateLimit = await checkRateLimit({
    key: rateLimitKey(request, scope),
    limit: 30,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit.resetAt);
  }

  return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
}
