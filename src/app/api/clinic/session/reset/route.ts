import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAuthClient, getServerAuthState } from "@/lib/supabase/auth-server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { reason?: unknown } | null;
  const reason = ["staff_reset", "inactivity", "security_reset", "participant_request"].includes(String(body?.reason)) ? String(body?.reason) : "staff_reset";
  const cookieStore = await cookies();
  const rawSession = cookieStore.get("clinic_session")?.value;
  const auth = await getServerAuthState();
  const db = getSupabaseAdminClient();
  if (rawSession && auth.isAuthenticated && db) {
    const session = await db.from("clinic_assisted_sessions").select("id,participant_user_id")
      .eq("handoff_token_hash", createHash("sha256").update(rawSession).digest("hex"))
      .eq("participant_user_id", auth.userId).maybeSingle();
    if (session.data) await db.rpc("clinic_end_assisted_session", { p_session_id: session.data.id, p_actor_user_id: auth.userId, p_reason: reason });
  }
  const authClient = await createServerSupabaseAuthClient();
  let signOutConfirmed = false;
  try {
    const signOut = await authClient.auth.signOut({ scope: "local" });
    signOutConfirmed = !signOut.error;
  } catch {
    signOutConfirmed = false;
  }
  const response = NextResponse.json({ success: true, signOutConfirmed });
  const cookieNames = new Set([
    "clinic_session", "clinic_device", "clinic_event", "clinic_entry",
    ...cookieStore.getAll().map((cookie) => cookie.name).filter((name) => name.startsWith("sb-"))
  ]);
  for (const name of cookieNames) response.cookies.set(name, "", { path: "/", expires: new Date(0), httpOnly: true, sameSite: "strict" });
  response.headers.set("Cache-Control", "no-store, private, max-age=0, must-revalidate");
  response.headers.set("Clear-Site-Data", '"cache", "cookies", "storage"');
  return response;
}
