import { assertSameOrigin, readBoundedJson, requireRequestId } from "@/lib/partners/onboarding/request-security";
import { clinicErrorResponse } from "@/app/api/clinic/error-response";
import { getProgramPacketFunding } from "@/lib/partners/onboarding/program-packet-funding";
import { canUseClinicPractice } from "@/lib/partners/onboarding/practice-receipt";
import { saveScreeningSession } from "@/lib/expungement-ai/screening-session-persistence";
import { SupabaseScreeningResumeStorage } from "@/lib/expungement-ai/screening-resume-service";
import { clinicConsumerContinuation } from "@/lib/expungement-ai/claim/clinic-acquisition";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getClinicEntryContext, listApprovedClinicStaff } from "@/lib/clinic-mode/participant-service";
import { claimRcapPartnerScreeningSession } from "@/lib/expungement-ai/rcap-partner-intake";
import { getServerAuthState } from "@/lib/supabase/auth-server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

import { RECOVERY_COOKIE, COMPLETED_COOKIE, hash, mintRecovery, encodeRecovery, recoveryOptions } from "@/lib/clinic-mode/reset-recovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body:Record<string,unknown>;
  try{assertSameOrigin(request);body=await readBoundedJson(request);if(body.requestId!==undefined)requireRequestId(body.requestId);}catch(error){return clinicErrorResponse(error);}
  if (request.cookies.get("clinic_reset_pending")?.value) {
    return NextResponse.json({ success: false, error: "Finish resetting this device before starting another participant." }, { status: 409 });
  }
  const auth = await getServerAuthState();
  if (!auth.isAuthenticated) return NextResponse.json({ success: false, error: "Participant sign-in is required." }, { status: 401 });
  const eventSlug = typeof body?.eventSlug === "string" ? body.eventSlug : "";
  const eventStaffId = typeof body?.eventStaffId === "string" ? body.eventStaffId : "";
  const requestedJurisdiction = typeof body?.jurisdiction === "string" ? body.jurisdiction.trim().toUpperCase() : "";
  const consent = body?.consent === true;
  if (!consent || !uuid(eventStaffId) || !/^[A-Z]{2,3}$/.test(requestedJurisdiction)) {
    return NextResponse.json({ success: false, error: "Consent, approved staff, and a state are required." }, { status: 400 });
  }
  try {
    const entry = await getClinicEntryContext(eventSlug);
    const jurisdiction = entry.jurisdiction ?? requestedJurisdiction;
    if (entry.jurisdiction && requestedJurisdiction !== entry.jurisdiction) {
      return NextResponse.json({ success: false, error: "This Clinic event is fixed to another jurisdiction." }, { status: 400 });
    }
    const staff = await listApprovedClinicStaff(entry.eventId);
    if (!staff.some(person => person.id === eventStaffId)) {
      return NextResponse.json({ success: false, error: "Approved staff for this event are required." }, { status: 403 });
    }
    const db = getSupabaseAdminClient();
    if (!db) return NextResponse.json({ success: false, error: "Clinic assistance is temporarily unavailable." }, { status: 503 });
    const practice = await canUseClinicPractice(entry.partnerSlug, auth);
    const funding = await getProgramPacketFunding(entry.partnerSlug, jurisdiction);
    const capacity = practice || funding === "consumer" ? { data: true, error: null } : await db.rpc("clinic_entry_sponsor_capacity", { p_event: entry.eventId, p_partner: entry.partnerSlug });
    if (capacity.error || typeof capacity.data !== "boolean") {
      return NextResponse.json({ success: false, error: "Sponsor capacity could not be confirmed. Please retry." }, { status: 503 });
    }
    const fallback = () => NextResponse.json({ success: true, outcome: "sponsor_capacity_exhausted",
      consumerUrl: clinicConsumerContinuation(auth.userId, jurisdiction, `clinic:${entry.eventSlug}`)
    }, { headers: { "Cache-Control": "no-store, private, max-age=0" } });
    if (!capacity.data) return fallback();
    // Practice uses the existing free-screening storage and Clinic consent/permission
    // transactions. It creates no sponsor allowance, payment, or launch authority.
    const requestId=typeof body.requestId==="string"?body.requestId:randomUUID();
    const screening = practice
      ? { ok: true as const, sessionId: (await saveScreeningSession(new SupabaseScreeningResumeStorage(db), {jurisdiction, answers: {}})).sessionId }
      : await claimRcapPartnerScreeningSession({ partnerSlug: entry.partnerSlug, jurisdiction, clinicRedemptionHash: entry.entryRedemptionHash, requestId, participantUserId:auth.userId });
    if (!screening.ok) return screening.reason === "capacity_full" ? fallback() : NextResponse.json({ success: false, error: "The partner screening is unavailable." }, { status: 409 });
    const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!secret)throw new Error("Clinic assistance signing is unavailable.");
    const nonce=(kind:string)=>createHmac("sha256",secret).update(JSON.stringify(["clinic-assistance-v1",kind,auth.userId,entry.eventId,eventStaffId,entry.entryRedemptionHash,requestId])).digest("base64url");
    const sessionToken = nonce("session");
    const deviceToken = nonce("device");
    const recovery = mintRecovery(auth.userId, hash(sessionToken), hash(deviceToken));
    const recoveryValue = encodeRecovery(recovery); // Fail before creating a session if recovery cannot be issued.
    const sessionResult = await db.rpc("clinic_start_assisted_session_for_entry", {
      p_entry_hash: entry.entryRedemptionHash,
      p_event_id: entry.eventId, p_event_staff_id: eventStaffId,
      p_participant_user_id: auth.userId, p_screening_session_id: screening.sessionId,
      p_handoff_token_hash: sha(sessionToken), p_device_nonce_hash: sha(deviceToken),
      p_consent_version: practice ? "clinic-practice-assistance-v1" : "clinic-assistance-v1", p_consented_at: new Date().toISOString(), p_ttl_minutes: 30
    });
    if (sessionResult.error || typeof sessionResult.data !== "string") {
      return NextResponse.json({ success: false, error: "Assisted session could not be started." }, { status: 409 });
    }
    const previousCase=await db.from("clinic_cases").select("id").eq("event_id",entry.eventId).eq("assisted_session_id",sessionResult.data).eq("participant_user_id",auth.userId).maybeSingle();
    if(previousCase.error)throw new Error("Clinic case readback is unavailable.");
    const caseResult = previousCase.data ? {error:null} : await db.rpc("clinic_upsert_case", {
      p_event_id: entry.eventId, p_assisted_session_id: sessionResult.data,
      p_participant_user_id: auth.userId, p_screening_session_id: screening.sessionId,
      p_matter_id: null, p_queue_status: "started", p_route_disposition: "pending", p_jurisdiction: jurisdiction
    });
    if (caseResult.error) {
      await db.rpc("clinic_end_assisted_session", { p_session_id: sessionResult.data, p_actor_user_id: auth.userId, p_reason: "security_reset" });
      return NextResponse.json({ success: false, error: "We could not link your account to this Clinic case." }, { status: 409 });
    }
    const response = NextResponse.json({ success: true, screeningUrl: `/clinic/${entry.eventSlug}/screening/${jurisdiction.toLowerCase()}` });
    const options = { httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 60 };
    // Non-identifying device marker keeps recovery visible after locator expiry.
    // It confers neither read nor assistance authority and is removed on reset.
    response.cookies.set("clinic_shared_device", "1", { ...options, maxAge: 400 * 24 * 60 * 60 });
    response.cookies.set(COMPLETED_COOKIE, "", { ...options, maxAge: 0, expires: new Date(0) });
    response.cookies.set(RECOVERY_COOKIE, recoveryValue, recoveryOptions(recovery));
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
