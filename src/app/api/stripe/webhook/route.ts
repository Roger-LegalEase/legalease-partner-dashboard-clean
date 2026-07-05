import { handleStripeWebhookPost } from "@/lib/stripe/webhook-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleStripeWebhookPost(request, {
    route: "/api/stripe/webhook",
    secretEnvVar: "STRIPE_WEBHOOK_SECRET"
  });
}
