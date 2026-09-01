import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getClinicEntryContext } from "@/lib/clinic-mode/participant-service";
import { claimRcapPartnerScreeningSession } from "@/lib/expungement-ai/rcap-partner-intake";
import { getServerAuthState } from "@/lib/supabase/auth-server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await getServerAuthState();
  if (!auth.isAuthenticated) return NextResponse.json({ success: false, error: "Participant sign-in is required." }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const eventSlug = typeof body?.eventSlug === "string" ? body.eventSlug : "";
  const eventStaffId = typeof body?.eventStaffId === "string" ? body.eventStaffId : "";
  const jurisdiction = typeof body?.jurisdiction === "string" ? body.jurisdiction.trim().toUpperCase() : "";
  const consent = body?.consent === true;
  if (!consent || !uuid(eventStaffId) || !/^[A-Z]{2,3}$/.test(jurisdiction)) {
    return NextResponse.json({ success: false, error: "Consent, approved staff, and a state are required." }, { status: 400 });
  }
  try {
    const entry = await getClinicEntryContext(eventSlug);
    const screening = await claimRcapPartnerScreeningSession({ partnerSlug: entry.partnerSlug, jurisdiction });
    if (!screening.ok) return NextResponse.json({ success: false, error: screening.reason === "capacity_full" ? "Sponsored screening capacity is full." : "The partner screening is unavailable." }, { status: 409 });
    const db = getSupabaseAdminClient();
    if (!db) return NextResponse.json({ success: false, error: "Clinic assistance is temporarily unavailable." }, { status: 503 });
    const sessionToken = randomBytes(32).toString("base64url");
    const deviceToken = randomBytes(32).toString("base64url");
    const sessionResult = await db.rpc("clinic_start_assisted_session", {
      p_event_id: entry.eventId, p_event_staff_id: eventStaffId,
      p_participant_user_id: auth.userId, p_screening_session_id: screening.sessionId,
      p_handoff_token_hash: sha(sessionToken), p_device_nonce_hash: sha(deviceToken),
      p_consent_version: "clinic-assistance-v1", p_consented_at: new Date().toISOString(), p_ttl_minutes: 30
    });
    if (sessionResult.error || typeof sessionResult.data !== "string") {
      return NextResponse.json({ success: false, error: "Assisted session could not be started." }, { status: 409 });
    }
    const caseResult = await db.rpc("clinic_upsert_case", {
      p_event_id: entry.eventId, p_assisted_session_id: sessionResult.data,
      p_participant_user_id: auth.userId, p_screening_session_id: screening.sessionId,
      p_matter_id: null, p_queue_status: "started", p_route_disposition: "pending", p_jurisdiction: jurisdiction
    });
    if (caseResult.error) {
      await db.rpc("clinic_end_assisted_session", { p_session_id: sessionResult.data, p_actor_user_id: auth.userId, p_reason: "security_reset" });
      return NextResponse.json({ success: false, error: "Participant ownership could not be bound to the Clinic case." }, { status: 409 });
    }
    const response = NextResponse.json({ success: true, screeningUrl: `/clinic/${entry.eventSlug}/screening/${jurisdiction.toLowerCase()}` });
    const options = { httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 60 };
    response.cookies.set("clinic_session", sessionToken, options);
    response.cookies.set("clinic_device", deviceToken, options);
    response.cookies.set("clinic_event", entry.eventSlug, options);
    response.headers.set("Cache-Control", "no-store, private, max-age=0");
    return response;
  } catch {
    return NextResponse.json({ success: false, error: "The Clinic entry handoff is invalid or expired." }, { status: 403 });
  }
}

function sha(value: string) { return createHash("sha256").update(value).digest("hex"); }
function uuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
