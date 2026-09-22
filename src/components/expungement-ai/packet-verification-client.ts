import type { BriefcaseCommercialActions } from "@/lib/expungement-ai/briefcase-presentation-authority";
import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";

export type PacketVerificationClientResult = {
  ok: boolean;
  commercialActions: BriefcaseCommercialActions;
  readyToGenerate: boolean;
  reviewReason: string | null;
  missingInputIds: string[];
};

export type VerificationMode = "consumer" | "paid" | "sponsored";

export type PacketVerificationActions = {
  openPacket: boolean;
  checkout: boolean;
  generation:
    | { mode: "sponsored_sync" }
    | { mode: "paid_durable"; label: "Prepare updated packet" }
    | null;
};

/** Keep every post-verification action behind one directly testable policy boundary. */
export function packetVerificationActions({
  verified,
  packetReady,
  mode,
  commercialActions
}: {
  verified: boolean;
  packetReady: boolean;
  mode: VerificationMode;
  commercialActions?: BriefcaseCommercialActions;
}): PacketVerificationActions {
  if (!verified) {
    return { openPacket: false, checkout: false, generation: null };
  }

  if (mode === "paid") {
    return {
      openPacket: packetReady,
      checkout: false,
      generation: commercialActions?.generationAllowed === true ? { mode: "paid_durable", label: "Prepare updated packet" } : null
    };
  }

  if (mode === "sponsored") {
    return {
      openPacket: packetReady,
      checkout: false,
      generation: !packetReady && commercialActions?.generationAllowed === true ? { mode: "sponsored_sync" } : null
    };
  }

  return {
    openPacket: packetReady,
    checkout: !packetReady && commercialActions?.checkoutAllowed === true,
    generation: null
  };
}

function responseRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  return record.data && typeof record.data === "object" && !Array.isArray(record.data)
    ? record.data as Record<string, unknown>
    : record;
}

/** Cross the final-verification boundary using the server-owned Lane B contract. */
export async function requestPacketVerification({
  itemId,
  answers,
  endpoint,
  fetchImpl = fetch
}: {
  itemId: string;
  answers: Record<string, AnswerValue>;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}): Promise<PacketVerificationClientResult> {
  const response = await fetchImpl(
    endpoint ?? `/api/expungement-ai/briefcase/${encodeURIComponent(itemId)}/packet-information`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, verify: true })
    }
  ).catch(() => null);
  const result = responseRecord(await response?.json().catch(() => null));
  const actions = result?.commercialActions && typeof result.commercialActions === "object"
    ? result.commercialActions as Record<string, unknown> : {};
  return {
    commercialActions: {
      fulfillmentAvailable: response?.ok === true && actions.fulfillmentAvailable === true,
      checkoutAllowed: response?.ok === true && actions.checkoutAllowed === true,
      generationAllowed: response?.ok === true && actions.generationAllowed === true
    },
    ok: response?.ok === true,
    readyToGenerate: result?.readyToGenerate === true,
    reviewReason: typeof result?.reviewReason === "string" ? result.reviewReason : null,
    missingInputIds: Array.isArray(result?.missingInputIds)
      ? result.missingInputIds.filter((id): id is string => typeof id === "string")
      : []
  };
}
