import { redirect } from "next/navigation";

import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";

export const dynamic = "force-dynamic";

/**
 * Compatibility return for Checkout Sessions created before the free-
 * Briefcase flow moved its success URL to the exact matter.
 *
 * This route deliberately does not retrieve Stripe state, record payment, or
 * generate a packet. A signed webhook is the only payment writer and durable
 * render authorizer. The query carries only a candidate item id; owner-scoped
 * lookup decides whether it is safe to redirect to that matter.
 */
export default async function LegacyPacketReadyReturn({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const briefcaseItemId = first(params.briefcaseItemId);
  const next = briefcaseItemId
    ? `/briefcase/${encodeURIComponent(briefcaseItemId)}`
    : "/briefcase";
  const auth = await requireConsumerBriefcaseSession(next);
  const item = briefcaseItemId
    ? await getBriefcaseItem(auth.userId, briefcaseItemId)
    : null;

  redirect(item ? `/briefcase/${encodeURIComponent(item.id)}?payment=return` : "/briefcase");
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
