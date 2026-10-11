import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

// A temporary browser capability, issued only after canonical RCAP admission.
// It contains no answers and grants neither account nor matter authority.
// The screening_ prefix is cleared by the existing shared-device reset.
export const RCAP_DRAFT_COOKIE = "screening_rcap_draft";
const lifetime = 30 * 60;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function sign(value: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Temporary screening storage is unavailable.");
  return createHmac("sha256", secret).update(`rcap-screening-draft-v1:${value}`).digest("base64url");
}
export function sealRcapDraft(sessionId: string, now = Date.now()) {
  if (!uuid.test(sessionId)) throw new Error("Invalid screening session.");
  const value = `${sessionId}.${now + lifetime * 1000}`;
  return `${value}.${sign(value)}`;
}
export function permitsRcapDraft(token: string | undefined, sessionId: string, now = Date.now()) {
  try {
    if (!token || token.length > 200 || !uuid.test(sessionId)) return false;
    const [id, until, signature, extra] = token.split(".");
    if (extra || id !== sessionId || !signature || !Number.isFinite(Number(until)) || Number(until) <= now) return false;
    const actual = Buffer.from(signature), expected = Buffer.from(sign(`${id}.${until}`));
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}
export const rcapDraftCookieOptions = {
  httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const,
  path: "/", maxAge: lifetime
};
export async function issueRcapDraft(sessionId: string) {
  (await cookies()).set(RCAP_DRAFT_COOKIE, sealRcapDraft(sessionId), rcapDraftCookieOptions);
}

export async function authorizedRcapDraft(token: string | undefined, sessionId: string) {
  if (!permitsRcapDraft(token, sessionId)) return null;
  const db = getSupabaseAdminClient();
  if (!db) throw new Error("storage_unavailable");
  const result = await db.from("screening_sessions")
    .select("session_id,jurisdiction,partner_slug,answers,current_question_id,updated_at")
    .eq("session_id", sessionId).eq("flow_mode", "rcap").eq("partner_benefit_active", true).maybeSingle();
  if (result.error) throw new Error("storage_unavailable");
  if (!result.data?.partner_slug) return null;
  const [scope, clinic, claimed] = await Promise.all([
    db.rpc("rcap_program_screening_jurisdictions", {p_slug: result.data.partner_slug}),
    db.from("clinic_assisted_sessions").select("id").eq("screening_session_id", sessionId).limit(1),
    db.from("consumer_briefcase_items").select("id").eq("source_session_id", sessionId).limit(1)
  ]);
  if (scope.error || clinic.error || claimed.error) throw new Error("storage_unavailable");
  // Clinic sessions keep their existing scoped consent/reset path. A public
  // admission cookie can never restore an assisted or already-claimed matter.
  if (!Array.isArray(scope.data) || !scope.data.includes(result.data.jurisdiction) || clinic.data?.length || claimed.data?.length) return null;
  return {db, row: result.data};
}
