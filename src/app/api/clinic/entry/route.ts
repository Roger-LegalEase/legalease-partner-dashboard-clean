import { createHash, createHmac, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { assertSameOrigin, readBoundedJson, requireRequestId } from "@/lib/partners/onboarding/request-security";
import { clinicErrorResponse } from "@/app/api/clinic/error-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body:Record<string,unknown>;
  try{assertSameOrigin(request);body=await readBoundedJson(request);if(body.requestId!==undefined)requireRequestId(body.requestId);}catch(error){return clinicErrorResponse(error);}
  const eventSlug = typeof body?.eventSlug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.eventSlug) ? body.eventSlug : "";
  const normalizedCode = typeof body?.code === "string" ? body.code.normalize("NFKC").trim().toUpperCase() : "";
  if (!eventSlug || normalizedCode.length < 8 || normalizedCode.length > 120) {
    return NextResponse.json({ success: false, error: "A valid event code is required." }, { status: 400 });
  }
  const db = getSupabaseAdminClient();
  if (!db) return NextResponse.json({ success: false, error: "Clinic entry is temporarily unavailable." }, { status: 503 });

  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key)return NextResponse.json({success:false,error:"Clinic entry is temporarily unavailable."},{status:503});
  const entryToken = body.requestId ? createHmac("sha256",key).update(JSON.stringify(["clinic-entry-v1",eventSlug,normalizedCode,body.requestId])).digest("base64url") : randomBytes(32).toString("base64url");
  const result = await db.rpc("clinic_redeem_event_code_with_reset", {
    p_public_slug: eventSlug,
    p_code_hash: createHash("sha256").update(normalizedCode).digest("hex"),
    p_redemption_nonce_hash: createHash("sha256").update(entryToken).digest("hex")
  });
  const row = (Array.isArray(result.data) ? result.data[0] : result.data) as { outcome?: string; event_id?: string } | null;
  if (result.error || !row || !["redeemed", "already_redeemed"].includes(row.outcome ?? "")) {
    const errors:Record<string,string>={event_outside_schedule:"This clinic is outside its scheduled hours. Check the event time with staff.",code_expired:"This event code has expired. Ask Clinic staff for a current code.",code_inactive:"This event code is no longer active. Ask Clinic staff for a current code.",code_not_started:"This event code is scheduled for a later time. Check its start time with staff.",invalid_code:"That code does not match this event. Check the code with Clinic staff.",code_unavailable:"This code or event has reached its limit. Ask Clinic staff about available entry.",event_unavailable:"This clinic is not currently open. Ask staff for the current event link."};
    return NextResponse.json({ success: false, error: errors[row?.outcome??""]??"Clinic entry could not be verified. Retry or ask event staff for help." }, { status: 403 });
  }
  // Exact readback also refuses replay of an entry the participant has ended.
  const entryHash = createHash("sha256").update(entryToken).digest("hex");
  const current = await db.from("clinic_event_access_redemptions").select("closed_at")
    .eq("redemption_nonce_hash", entryHash).maybeSingle();
  if (current.error || !current.data) return NextResponse.json({ success: false, error: "Clinic entry could not be verified. Retry or ask event staff for help." }, { status: 503 });
  if (current.data.closed_at) return NextResponse.json({ success: false, error: "This Clinic entry has ended. Reload the event page to enter again." }, { status: 409 });
  const response = NextResponse.json({ success: true, next: `/clinic/${eventSlug}/assist` });
  response.cookies.set("clinic_entry", entryToken, {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 8 * 60 * 60
  });
  response.headers.set("Cache-Control", "no-store, private, max-age=0");
  return response;
}
