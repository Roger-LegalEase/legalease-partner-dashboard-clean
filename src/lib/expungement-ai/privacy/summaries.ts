import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { listPrivacyRequests } from "@/lib/expungement-ai/privacy/store";

export type ParticipantPrivacyRequestSummary = {
  requestId: string;
  type: string;
  status: string;
  requestedAt: string;
  completedAt: string | null;
  receiptCode: string | null;
  heldForLegalReason: string | null;
};

/**
 * The participant's own request history, for server rendering.
 *
 * Owner-filtered twice for the same reason the export is: this reads through the
 * service-role client, so the owner bound in the query is the boundary, and the
 * filter after it is the assertion that the boundary held. Returns the summary
 * only — never the proof hash, never the step ledger.
 */
export async function listParticipantPrivacyRequestSummaries(
  userId: string
): Promise<ParticipantPrivacyRequestSummary[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase || !userId) return [];

  const rows = await listPrivacyRequests(supabase, userId);
  return rows
    .filter((row) => row.user_id === userId)
    .map((row) => ({
      requestId: row.id,
      type: row.request_type,
      status: row.status,
      requestedAt: row.requested_at,
      completedAt: row.completed_at,
      receiptCode: row.receipt_code,
      heldForLegalReason: row.legal_hold_active === true ? row.legal_hold_reason : null
    }));
}
