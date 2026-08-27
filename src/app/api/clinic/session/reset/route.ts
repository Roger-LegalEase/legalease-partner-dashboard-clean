import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authClient = await createServerSupabaseAuthClient();
  const rawSession = request.cookies.get("clinic_session")?.value;
  const cookieNames = new Set([
    "clinic_session", "clinic_device", "clinic_event", "clinic_entry",
    ...request.cookies.getAll().map((cookie) => cookie.name).filter((name) => name.startsWith("sb-"))
  ]);
  const body = await request.json().catch(() => null) as { reason?: unknown } | null;
  const reason = ["staff_reset", "inactivity", "security_reset", "participant_request"].includes(String(body?.reason)) ? String(body?.reason) : "staff_reset";
  const { data: authData, error: authError } = await authClient.auth.getUser();
  const authUserId = authError ? null : authData.user?.id ?? null;
  const db = getSupabaseAdminClient();
  if (rawSession && authUserId && db) {
    const session = await db.from("clinic_assisted_sessions").select("id,participant_user_id")
      .eq("handoff_token_hash", createHash("sha256").update(rawSession).digest("hex"))
      .eq("participant_user_id", authUserId).maybeSingle();
    if (session.data) await db.rpc("clinic_end_assisted_session", { p_session_id: session.data.id, p_actor_user_id: authUserId, p_reason: reason });
  }
  let signOutConfirmed = false;
  try {
    const signOut = await authClient.auth.signOut({ scope: "local" });
    signOutConfirmed = !signOut.error;
  } catch {
    signOutConfirmed = false;
  }
  const response = NextResponse.json({ success: true, signOutConfirmed });
  for (const name of cookieNames) response.cookies.set(name, "", { path: "/", expires: new Date(0), httpOnly: true, sameSite: "strict" });
  response.headers.set("Cache-Control", "no-store, private, max-age=0, must-revalidate");
  response.headers.set("Clear-Site-Data", '"cache", "cookies", "storage"');
  return response;
}
