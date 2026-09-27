import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { RECOVERY_COOKIE, RETENTION_SECONDS, hash, mintRecovery, encodeRecovery, parseRecovery, authenticRecovery, recoveryOptions, type Recovery } from "@/lib/clinic-mode/reset-recovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const CLOSED = new Set(["ended", "expired", "reset"]);
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expectedOrigin = `${request.nextUrl.protocol}//${request.headers.get("host") ?? request.nextUrl.host}`;
  if ((origin && origin !== expectedOrigin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ success: false, revocationConfirmed: false }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as { reason?: unknown; action?: unknown } | null;
  const action = body?.action ?? "close";
  const reason = ["staff_reset", "inactivity", "security_reset", "participant_request"].includes(String(body?.reason)) ? String(body?.reason) : "staff_reset";
  const rawSession = request.cookies.get("clinic_session")?.value;
  const rawDevice = request.cookies.get("clinic_device")?.value;
  const existing = request.cookies.get(RECOVERY_COOKIE)?.value;
  const pending = request.cookies.has("clinic_reset_pending");
  let issued: { proof: Recovery; value: string } | undefined;
  let prepared = false, revocationConfirmed = false, signOutConfirmed = false, durable = false;
  let state = "recovery_unavailable";
  let cleanEntryPath = "/clinic";
  let authClient: Awaited<ReturnType<typeof createServerSupabaseAuthClient>> | undefined;
  try {
    if (!["prepare", "close", "complete"].includes(String(action))) throw new Error("Invalid action");
    authClient = await createServerSupabaseAuthClient();
    const { data, error } = await authClient.auth.getUser();
    const owner = error ? null : data.user?.id ?? null;
    if (error && request.cookies.getAll().some(c => c.name.startsWith("sb-"))) { state = "authentication_unavailable"; throw new Error("Authentication lookup failed"); }
    let proof: Recovery;
    let trusted = false;
    if (existing) {
      proof = parseRecovery(existing);
      trusted = authenticRecovery(existing);
      if ((owner && owner !== proof.owner) || (rawSession && hash(rawSession) !== proof.handoff)
        || (rawDevice && hash(rawDevice) !== proof.device)) {
        state = "identity_mismatch";
        throw new Error("Wrong participant or handoff");
      }
    } else if (owner && rawSession && rawDevice && action === "prepare") {
      proof = mintRecovery(owner, hash(rawSession), hash(rawDevice));
    } else if (!owner && (!error || error.name === "AuthSessionMissingError") && !request.cookies.getAll().some(c => c.name.startsWith("sb-")) && !rawSession && !rawDevice && !pending && action === "prepare") {
      // Only an actually clean, anonymous device. A pending marker, missing
      // authenticated handoff or failed auth lookup can never use this branch.
      proof = mintRecovery("", "0".repeat(64), "0".repeat(64), true);
    } else {
      state = owner ? "handoff_identity_required" : "authentication_required";
      throw new Error("Recovery identity unavailable");
    }
    const freshOwner = Boolean(owner && owner === proof.owner);
    const closeAuthority = trusted && proof.expires > Date.now();
    // v1 historical proofs did not grant a separate reconciliation interval.
    const reconcileAuthority = trusted && (proof.reconcileUntil ?? proof.expires) > Date.now();
    if (!freshOwner && !closeAuthority && !reconcileAuthority && !(proof.empty && !existing)) {
      state = "authentication_required";
      throw new Error("Fresh authentication required");
    }
    let closed = false;
    if (proof.empty) {
      if (owner || rawSession || rawDevice || (existing && (!trusted || !reconcileAuthority))) throw new Error("Invalid empty-device receipt");
      closed = true;
      state = "no_session";
    } else {
      const db = getSupabaseAdminClient();
      if (!db) throw new Error("Database unavailable");
      const lookup = () => db.from("clinic_assisted_sessions").select("id,participant_user_id,status,event_id")
        .eq("handoff_token_hash", proof.handoff).eq("device_nonce_hash", proof.device)
        .eq("participant_user_id", proof.owner).maybeSingle();
      const session = await lookup();
      if (session.error || !session.data) { state = "lookup_failed"; throw new Error("Exact handoff unavailable"); }
      closed = CLOSED.has(session.data.status);
      // Fresh participant authentication is independent authority to end their
      // exact handoff; expired signature alone never renews close permission.
      if (!closed && !freshOwner && !closeAuthority) { state = "authentication_required"; throw new Error("Close authority expired"); }
      if (action !== "prepare" && !closed) {
        if (action === "complete") throw new Error("Closure not committed");
        const closure = await db.rpc("clinic_end_assisted_session", { p_session_id: session.data.id, p_actor_user_id: proof.owner, p_reason: reason });
        if (closure.error || !["ended", "already_ended"].includes(closure.data)) { state = "closure_failed"; throw new Error("Closure failed"); }
        const readback = await lookup();
        if (readback.error || !readback.data || readback.data.id !== session.data.id || !CLOSED.has(readback.data.status)) throw new Error("Readback failed");
        closed = true;
      }
      if (action === "complete" && closed && session.data.event_id) {
        const event = await db.from("clinic_events").select("public_slug,status").eq("id", session.data.event_id).maybeSingle();
        if (event.error) { state = "entry_unavailable"; throw new Error("Event entry lookup failed"); }
        // Event association comes from the exact canonical handoff, not a
        // client redirect, expired clinic_event cookie or an unsigned locator.
        const slug = event.data?.public_slug;
        if (event.data?.status === "published" && typeof slug === "string" && slug.length <= 120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) cleanEntryPath = `/clinic/${slug}`;
      }
      state = closed ? "closed" : "pending";
    }
    if (action === "prepare") {
      // Do not sign out on preparation, including any failed preparation. Only
      // acknowledge a validated durable proof; browser must receive it first.
      if (!existing || (!trusted || proof.expires <= Date.now()) && freshOwner) {
        proof = mintRecovery(proof.owner, proof.handoff, proof.device, proof.empty);
        issued = { proof, value: encodeRecovery(proof) };
      }
      prepared = true;
    } else {
      revocationConfirmed = closed;
    }
    durable = Boolean(existing && (trusted || freshOwner));
  } catch {
    // Preparation failure preserves the last usable authentication and handoff.
    // Errors expose no identifiers, database messages or proof bytes.
    if (existing) {
      try { const proof = parseRecovery(existing); durable = authenticRecovery(existing) && proof.expires > Date.now() && state !== "identity_mismatch"; } catch { /* No authority. */ }
    }
  }
  const mayClear = action !== "prepare" && (revocationConfirmed || durable);
  if (mayClear && authClient) {
    try { signOutConfirmed = !(await authClient.auth.signOut({ scope: "local" })).error; } catch { /* Preserve truthful failure. */ }
  }
  const success = action !== "prepare" && revocationConfirmed && signOutConfirmed;
  const response = NextResponse.json({ success, prepared, revocationConfirmed, signOutConfirmed, state, ...(action === "complete" && success ? { cleanEntryPath } : {}) }, { status: prepared || success ? 200 : 409 });
  const options = { path: "/", httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production" };
  if (mayClear) {
    for (const name of new Set(["clinic_session", "clinic_device", "clinic_event", "clinic_entry", ...request.cookies.getAll().map(c => c.name)
      .filter(name => name !== RECOVERY_COOKIE && name !== "clinic_reset_pending" && /^(sb-|clinic_|screening_|briefcase_)/.test(name))])) response.cookies.set(name, "", { ...options, maxAge: 0 });
    response.headers.set("Clear-Site-Data", '"cache", "storage"');
  }
  if (issued) response.cookies.set(RECOVERY_COOKIE, issued.value, recoveryOptions(issued.proof));
  if (action === "complete" && success) {
    response.cookies.set("clinic_reset_pending", "", { ...options, httpOnly: false, maxAge: 0 });
    // Retain the read-only receipt for interrupted handover; next successful
    // assistance start replaces it with a proof for the new participant.
  } else if (!pending) response.cookies.set("clinic_reset_pending", "1", { ...options, httpOnly: false, maxAge: RETENTION_SECONDS });
  response.headers.set("Cache-Control", "no-store, private, max-age=0, must-revalidate");
  return response;
}
