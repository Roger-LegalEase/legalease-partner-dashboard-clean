import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isSameOriginClinicMutation } from "@/lib/clinic-mode/request-security";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOriginClinicMutation(request)) {
    return NextResponse.json({ success: false, error: "Invalid request origin." }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as { eventSlug?: unknown; code?: unknown } | null;
  const eventSlug = typeof body?.eventSlug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.eventSlug) ? body.eventSlug : "";
  const normalizedCode = typeof body?.code === "string" ? body.code.normalize("NFKC").trim().toUpperCase() : "";
  if (!eventSlug || normalizedCode.length < 8 || normalizedCode.length > 120) {
    return NextResponse.json({ success: false, error: "A valid event code is required." }, { status: 400 });
  }
  const db = getSupabaseAdminClient();
  if (!db) return NextResponse.json({ success: false, error: "Clinic entry is temporarily unavailable." }, { status: 503 });

  const entryToken = randomBytes(32).toString("base64url");
  const result = await db.rpc("clinic_redeem_event_code", {
    p_public_slug: eventSlug,
    p_code_hash: createHash("sha256").update(normalizedCode).digest("hex"),
    p_redemption_nonce_hash: createHash("sha256").update(entryToken).digest("hex")
  });
  const row = (Array.isArray(result.data) ? result.data[0] : result.data) as { outcome?: string; event_id?: string } | null;
  if (result.error || !row || !["redeemed", "already_redeemed"].includes(row.outcome ?? "")) {
    return NextResponse.json({ success: false, error: "That event code is invalid, unavailable, or the event is full." }, { status: 403 });
  }
  const response = NextResponse.json({ success: true, next: `/clinic/${eventSlug}/assist` });
  response.cookies.set("clinic_entry", entryToken, {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 8 * 60 * 60
  });
  response.headers.set("Cache-Control", "no-store, private, max-age=0");
  return response;
}
