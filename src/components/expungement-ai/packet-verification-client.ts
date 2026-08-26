import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";

export type PacketVerificationClientResult = {
  ok: boolean;
  readyToGenerate: boolean;
  reviewReason: string | null;
  missingInputIds: string[];
};

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
  return {
    ok: response?.ok === true,
    readyToGenerate: result?.readyToGenerate === true,
    reviewReason: typeof result?.reviewReason === "string" ? result.reviewReason : null,
    missingInputIds: Array.isArray(result?.missingInputIds)
      ? result.missingInputIds.filter((id): id is string => typeof id === "string")
      : []
  };
}
