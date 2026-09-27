import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const RECOVERY = "clinic_reset_recovery";
const CLOSED = new Set(["ended", "expired", "reset"]);
type Recovery = { version: 1; owner: string; handoff: string; device: string; expires: number };
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

// This capability authorizes only ending the original owner's exact handoff.
// It never authorizes reads, authentication, another session, or packet access.
// Reuse the existing server-only key with domain separation; no new secret.
function sign(value: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Reset recovery is unavailable");
  return createHmac("sha256", key).update(`clinic-reset-v1:${value}`).digest("base64url");
}
function encode(value: Recovery) {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
function decode(value: string): Recovery {
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) throw new Error("Invalid reset recovery");
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("Invalid reset recovery");
  const proof = JSON.parse(Buffer.from(payload, "base64url").toString()) as Recovery;
  if (proof.version !== 1 || typeof proof.owner !== "string" || !/^[a-f0-9]{64}$/.test(proof.handoff)
    || !/^[a-f0-9]{64}$/.test(proof.device) || !Number.isFinite(proof.expires) || proof.expires <= Date.now()) throw new Error("Expired reset recovery");
  return proof;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expectedOrigin = `${request.nextUrl.protocol}//${request.headers.get("host") ?? request.nextUrl.host}`;
  if ((origin && origin !== expectedOrigin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ success: false, revocationConfirmed: false }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as { reason?: unknown; action?: unknown } | null;
  const action = body?.action ?? "close";
  const reason = ["staff_reset", "inactivity", "security_reset", "participant_request"].includes(String(body?.reason)) ? String(body?.reason) : "staff_reset";
  const cookieOptions = { path: "/", httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", maxAge: 8 * 60 * 60 };
  const rawSession = request.cookies.get("clinic_session")?.value;
  const rawDevice = request.cookies.get("clinic_device")?.value;
  let recovery = request.cookies.get(RECOVERY)?.value;
  let revocationConfirmed = false;
  let prepared = false;
  let signOutConfirmed = false;
  let status = 409;
  const authClient = await createServerSupabaseAuthClient();
  try {
    if (!["prepare", "close", "complete"].includes(String(action))) throw new Error("Invalid reset action");
    const { data, error } = await authClient.auth.getUser();
    const owner = error ? null : data.user?.id ?? null;
    let proof: Recovery;
    if (recovery) {
      proof = decode(recovery);
      // An old receipt cannot certify or close a new participant's handoff.
      if ((owner && owner !== proof.owner) || (rawSession && hash(rawSession) !== proof.handoff)
        || (rawDevice && hash(rawDevice) !== proof.device)) {
        return NextResponse.json({ success: false, prepared: false, revocationConfirmed: false, signOutConfirmed: false }, {
          status: 409, headers: { "Cache-Control": "no-store" }
        });
      }
    } else {
      if (!owner || !rawSession || !rawDevice || action === "complete") throw new Error("Reset identity unavailable");
      proof = { version: 1, owner, handoff: hash(rawSession), device: hash(rawDevice), expires: Date.now() + 8 * 60 * 60 * 1000 };
      recovery = encode(proof);
    }
    // Prepare is acknowledged by the browser before any destructive sign-out.
    // A lost close response therefore still has its durable HttpOnly proof.
    if (action === "prepare") {
      prepared = true;
      status = 200;
    } else {
      const db = getSupabaseAdminClient();
      if (!db) throw new Error("Reset database unavailable");
      const lookup = () => db.from("clinic_assisted_sessions").select("id,participant_user_id,status")
        .eq("handoff_token_hash", proof.handoff).eq("device_nonce_hash", proof.device)
        .eq("participant_user_id", proof.owner).maybeSingle();
      const session = await lookup();
      if (session.error || !session.data) throw new Error("Reset lookup failed");
      if (!CLOSED.has(session.data.status)) {
        if (action === "complete") throw new Error("Reset not committed");
        const closure = await db.rpc("clinic_end_assisted_session", {
          p_session_id: session.data.id, p_actor_user_id: proof.owner, p_reason: reason
        });
        if (closure.error || !["ended", "already_ended"].includes(closure.data)) throw new Error("Reset closure failed");
      }
      const readback = await lookup();
      if (readback.error || !readback.data || readback.data.id !== session.data.id || !CLOSED.has(readback.data.status)) throw new Error("Reset readback failed");
      revocationConfirmed = true;
    }
  } catch {
    // Do not echo identifiers, credentials, database errors or capability bytes.
    // Unknown closure is a refusal, including when all auth cookies are gone.
  }
  if (!prepared) {
    try {
      const result = await authClient.auth.signOut({ scope: "local" });
      signOutConfirmed = !result.error;
    } catch { signOutConfirmed = false; }
    status = revocationConfirmed && signOutConfirmed ? 200 : 409;
  }
  const success = !prepared && revocationConfirmed && signOutConfirmed;
  const response = NextResponse.json({ success, prepared, revocationConfirmed, signOutConfirmed }, { status });
  if (!prepared) {
    const names = new Set(["clinic_session", "clinic_device", "clinic_event", "clinic_entry",
      ...request.cookies.getAll().map(({ name }) => name).filter((name) => name !== RECOVERY && name !== "clinic_reset_pending" && /^(sb-|clinic_|screening_|briefcase_)/.test(name))]);
    for (const name of names) response.cookies.set(name, "", { ...cookieOptions, maxAge: 0 });
    // Recovery cookies must survive interrupted cleanup. Clear them only on
    // confirmed handover; clearing all cookies here loses the retry identity.
    response.headers.set("Clear-Site-Data", '"cache", "storage"');
  }
  if (recovery) response.cookies.set(RECOVERY, recovery, cookieOptions);
  response.cookies.set("clinic_reset_pending", action === "complete" && success ? "" : "1", {
    ...cookieOptions, httpOnly: false, maxAge: action === "complete" && success ? 0 : cookieOptions.maxAge
  });
  response.headers.set("Cache-Control", "no-store, private, max-age=0, must-revalidate");
  return response;
}
