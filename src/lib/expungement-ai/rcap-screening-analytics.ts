import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { ExpungementAiResultCode } from "@/lib/expungement-ai/types";

// Privacy-conscious partner analytics: we record only a coarse outcome CATEGORY,
// never screening answers or record detail. Emission is best-effort and never
// blocks the screening/result flow. The RPC itself is gated to partner-benefit
// sessions, so DTC and un-attributed sessions never produce analytics rows.

export type ScreeningOutcomeCategory =
  | "eligible_packet"
  | "eligible_packet_with_caution"
  | "guidance_only"
  | "ineligible"
  | "incomplete";

export function outcomeCategoryForResultCode(resultCode: ExpungementAiResultCode): ScreeningOutcomeCategory {
  switch (resultCode) {
    case "packet_ready":
      return "eligible_packet";
    case "packet_ready_with_caution":
      return "eligible_packet_with_caution";
    case "guidance_only":
    case "not_covered_yet":
      return "guidance_only";
    case "likely_not_eligible":
    case "hard_stop":
      return "ineligible";
    case "needs_more_info":
    case "not_yet":
    case "needs_review":
    default:
      return "incomplete";
  }
}

export function packetRouteAvailableForResultCode(resultCode: ExpungementAiResultCode): boolean {
  return resultCode === "packet_ready" || resultCode === "packet_ready_with_caution";
}

export async function recordScreeningCompleted(sessionId: string): Promise<void> {
  await emit(sessionId, "screening_completed");
}

export async function recordScreeningEligibilityResult(
  sessionId: string,
  resultCode: ExpungementAiResultCode
): Promise<void> {
  await emit(
    sessionId,
    "eligibility_result_recorded",
    outcomeCategoryForResultCode(resultCode),
    packetRouteAvailableForResultCode(resultCode)
  );
}

async function emit(
  sessionId: string,
  eventType: "screening_completed" | "eligibility_result_recorded",
  outcomeCategory?: ScreeningOutcomeCategory,
  packetRouteAvailable?: boolean
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  try {
    await supabase.rpc("record_rcap_screening_analytics_event", {
      p_session_id: sessionId,
      p_event_type: eventType,
      p_outcome_category: outcomeCategory ?? null,
      p_packet_route_available: packetRouteAvailable ?? null
    });
  } catch {
    // Analytics is best-effort; never disrupt the screening/result flow.
  }
}
