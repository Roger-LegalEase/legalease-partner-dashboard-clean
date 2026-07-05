import { handleStripeWebhookPost } from "@/lib/stripe/webhook-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleStripeWebhookPost(request, {
    route: "/api/method/expungement.api.payment.stripe_webhook",
    secretEnvVar: "STRIPE_LEGACY_WEBHOOK_SECRET",
    logLegacyDiagnostics: true
  });
}
