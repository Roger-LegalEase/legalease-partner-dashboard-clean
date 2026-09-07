import { requireParticipantPrivacyApiSession } from "@/lib/expungement-ai/privacy/api-session";
import { privacyJson } from "@/lib/expungement-ai/privacy/request-security";
import {
  listPrivacyRequests,
  PrivacyStoreUnavailableError,
  requirePrivacyAdminClient
} from "@/lib/expungement-ai/privacy/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The participant's own history of privacy requests and receipts.
 *
 * Read-only, owner-filtered, and it never returns the recent-auth proof hash or
 * the internal step ledger: a receipt says what happened, and the step ledger
 * names internal systems.
 */
export async function GET() {
  const session = await requireParticipantPrivacyApiSession();
  if (!session.ok) return session.response;

  let supabase;
  try {
    supabase = requirePrivacyAdminClient();
  } catch (error) {
    if (error instanceof PrivacyStoreUnavailableError) return privacyJson({ requests: [] });
    throw error;
  }

  const rows = await listPrivacyRequests(supabase, session.userId);
  return privacyJson({
    requests: rows
      .filter((row) => row.user_id === session.userId)
      .map((row) => ({
        requestId: row.id,
        type: row.request_type,
        status: row.status,
        requestedAt: row.requested_at,
        completedAt: row.completed_at,
        receiptCode: row.receipt_code,
        matterId: row.target_matter_item_id,
        heldForLegalReason: row.legal_hold_active === true ? row.legal_hold_reason : null,
        retentionTreatment: row.retention_treatment,
        receipt: row.completion_receipt
      }))
  });
}
