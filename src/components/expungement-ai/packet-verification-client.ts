import { isPacketSaveReceipt } from "@/lib/expungement-ai/packet-save-contract";
import type { BriefcaseCommercialActions } from "@/lib/expungement-ai/briefcase-presentation-authority";
import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";

export type PacketVerificationClientResult = {
  ok: boolean;
  status: number;
  errorCode: string | null;
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
  expectedRevision,
  answers,
  endpoint,
  fetchImpl = fetch
}: {
  itemId: string;
  expectedRevision: number;
  answers: Record<string, AnswerValue>;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}): Promise<PacketVerificationClientResult> {
  const response = await fetchImpl(
    endpoint ?? `/api/expungement-ai/briefcase/${encodeURIComponent(itemId)}/packet-information`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, verify: true, expectedRevision })
    }
  ).catch(() => null);
  const result = responseRecord(await response?.json().catch(() => null));
  const actions = result?.commercialActions && typeof result.commercialActions === "object"
    ? result.commercialActions as Record<string, unknown> : {};
  const valid = response?.ok === true && isPacketSaveReceipt(result)
    && result.reviewPath === `/briefcase/${encodeURIComponent(itemId)}/review`
    && result.revision >= expectedRevision
    && ["fulfillmentAvailable", "checkoutAllowed", "generationAllowed"].every((key) => typeof actions[key] === "boolean");
  return {
    commercialActions: {
      fulfillmentAvailable: valid && actions.fulfillmentAvailable === true,
      checkoutAllowed: valid && actions.checkoutAllowed === true,
      generationAllowed: valid && actions.generationAllowed === true
    },
    ok: valid,
    status: response?.ok && !valid ? 0 : response?.status ?? 0,
    errorCode: typeof result?.error === "string" ? result.error : null,
    readyToGenerate: valid && result?.readyToGenerate === true,
    reviewReason: typeof result?.reviewReason === "string" ? result.reviewReason : null,
    missingInputIds: valid && Array.isArray(result?.missingInputIds)
      ? result.missingInputIds.filter((id): id is string => typeof id === "string")
      : []
  };
}
