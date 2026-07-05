import { POST as handleCanonicalStripeWebhookPost } from "@/app/api/stripe/webhook/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleCanonicalStripeWebhookPost(request);
}
