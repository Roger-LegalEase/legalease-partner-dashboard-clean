import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { RECOVERY_COOKIE, COMPLETED_COOKIE, encodeCompletion, readCompletion, retentionDeadline, RETENTION_SECONDS, hash, mintRecovery, encodeRecovery, parseRecovery, authenticRecovery, recoveryOptions, type Recovery } from "@/lib/clinic-mode/reset-recovery";

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
  let authenticatedActor: string | null = null;
  let completionUntil: number | undefined;
  let expiredLocator = false;
  let locatorDeadline: number | undefined;
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
    authenticatedActor = owner;
    if (error && request.cookies.getAll().some(c => c.name.startsWith("sb-"))) { state = "authentication_unavailable"; throw new Error("Authentication lookup failed"); }
    let proof: Recovery;
    let trusted = false;
    const completed = request.cookies.get(COMPLETED_COOKIE)?.value;
    if (!existing && completed && !owner && !rawSession && !rawDevice) {
      const receipt = readCompletion(completed);
      proof = { version: 1, owner: "", handoff: "0".repeat(64), device: "0".repeat(64), expires: receipt.until, reconcileUntil: receipt.until, retainUntil: receipt.until, issuedAt: receipt.until - RETENTION_SECONDS * 1000, empty: true };
      trusted = true;
      cleanEntryPath = receipt.cleanEntryPath;
    } else if (existing) {
      proof = parseRecovery(existing);
      trusted = authenticRecovery(existing);
      if ((rawSession && hash(rawSession) !== proof.handoff)
        || (rawDevice && hash(rawDevice) !== proof.device)) {
        state = "identity_mismatch";
        throw new Error("Wrong participant or handoff");
      }
    } else if (owner && rawSession && rawDevice && action === "prepare") {
      // Recover a missing locator only from BOTH exact device handoff cookies.
      // Never accept a client session ID or select by participant/event/latest.
      const db = getSupabaseAdminClient();
      if (!db) throw new Error("Database unavailable");
      const exact = await db.from("clinic_assisted_sessions").select("participant_user_id,created_at")
        .eq("handoff_token_hash", hash(rawSession)).eq("device_nonce_hash", hash(rawDevice)).maybeSingle();
      if (exact.error || !exact.data) { state = "handoff_identity_required"; throw new Error("Exact handoff unavailable"); }
      const issuedAt = Date.parse(exact.data.created_at);
      if (!Number.isFinite(issuedAt) || issuedAt + RETENTION_SECONDS * 1000 <= Date.now()) {
        state = "handoff_identity_required"; throw new Error("Handoff recovery retention ended");
      }
      proof = { ...mintRecovery(String(exact.data.participant_user_id), hash(rawSession), hash(rawDevice)),
        issuedAt, retainUntil: issuedAt + RETENTION_SECONDS * 1000 };
    } else if (!owner && (!error || error.name === "AuthSessionMissingError") && !request.cookies.getAll().some(c => c.name.startsWith("sb-")) && !rawSession && !rawDevice && !pending && action === "prepare") {
      // Only an actually clean, anonymous device. A pending marker, missing
      // authenticated handoff or failed auth lookup can never use this branch.
      proof = mintRecovery("", "0".repeat(64), "0".repeat(64), true);
    } else {
      state = owner ? "handoff_identity_required" : "authentication_required";
      throw new Error("Recovery identity unavailable");
    }
    if (retentionDeadline(proof) <= Date.now()) {
      expiredLocator = true; state = "handoff_identity_required"; throw new Error("Locator retention ended");
    }
    completionUntil = retentionDeadline(proof);
    const freshOwner = Boolean(owner && owner === proof.owner);
    const closeAuthority = trusted && !proof.staffOnly && proof.expires > Date.now();
    // v1 historical proofs did not grant a separate reconciliation interval.
    const reconcileAuthority = trusted && (proof.reconcileUntil ?? proof.expires) > Date.now();
    if (!owner && !closeAuthority && !reconcileAuthority && !(proof.empty && !existing)) {
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
      const lookup = () => db.from("clinic_assisted_sessions").select("id,participant_user_id,status,event_id,created_at")
        .eq("handoff_token_hash", proof.handoff).eq("device_nonce_hash", proof.device)
        .eq("participant_user_id", proof.owner).maybeSingle();
      const session = await lookup();
      if (session.error || !session.data) { state = "lookup_failed"; throw new Error("Exact handoff unavailable"); }
      // Canonical creation time prevents fresh authentication, removed cookies
      // or a re-signed locator from starting another retention period.
      const createdAt = Date.parse(session.data.created_at);
      if (!Number.isFinite(createdAt)) { state = "lookup_failed"; throw new Error("Handoff creation time unavailable"); }
      proof = { ...proof, retainUntil: Math.min(retentionDeadline(proof), createdAt + RETENTION_SECONDS * 1000) };
      completionUntil = retentionDeadline(proof);
      locatorDeadline = completionUntil;
      if (completionUntil <= Date.now()) { expiredLocator = true; state = "handoff_identity_required"; throw new Error("Handoff recovery retention ended"); }
      let staff = false;
      if (owner && !freshOwner) {
        // A staff identity must still prove current assist authority, including
        // when the canonical session is already closed (RPC is idempotent).
        const boundDevice = trusted || Boolean(rawSession && rawDevice && hash(rawSession) === proof.handoff && hash(rawDevice) === proof.device);
        if (boundDevice) {
          const event = await db.from("clinic_events").select("partner_slug").eq("id", session.data.event_id).maybeSingle();
          const partner = await db.from("partner_users").select("id,partner_slug").eq("auth_user_id", owner).eq("status", "active").maybeSingle();
          if (!event.error && event.data && !partner.error && partner.data && partner.data.partner_slug === event.data.partner_slug) {
            const member = await db.from("clinic_event_staff").select("id").eq("event_id", session.data.event_id)
              .eq("partner_user_id", partner.data.id).eq("status", "approved").contains("permissions", ["assist"]).maybeSingle();
            staff = !member.error && Boolean(member.data);
          }
        }
        if (!staff) { state = "identity_mismatch"; throw new Error("Authorized event staff required"); }
      }
      closed = CLOSED.has(session.data.status);
      // Fresh participant authentication is independent authority to end their
      // exact handoff; expired signature alone never renews close permission.
      if (!closed && !freshOwner && !staff && !closeAuthority) { state = "authentication_required"; throw new Error("Close authority expired"); }
      if (action !== "prepare" && !closed) {
        if (action === "complete") throw new Error("Closure not committed");
        const closure = await db.rpc("clinic_end_assisted_session", { p_session_id: session.data.id, p_actor_user_id: staff ? owner : proof.owner, p_reason: reason });
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
      // Staff preparation cannot mint anonymous participant close authority.
      if (staff) proof = { ...proof, staffOnly: true };
      state = closed ? "closed" : "pending";
    }
    if (action === "prepare") {
      // Do not sign out on preparation, including any failed preparation. Only
      // acknowledge a validated durable proof; browser must receive it first.
      if ((!existing && !completed) || (!trusted || proof.expires <= Date.now()) && freshOwner || proof.staffOnly && owner) {
        const renewed = mintRecovery(proof.owner, proof.handoff, proof.device, proof.empty);
        proof = { ...renewed, issuedAt: proof.issuedAt ?? proof.expires - 8 * 60 * 60 * 1000,
          retainUntil: retentionDeadline(proof), reconcileUntil: retentionDeadline(proof), ...(proof.staffOnly ? { staffOnly: true as const } : {}) };
        issued = { proof, value: encodeRecovery(proof) };
      }
      prepared = true;
    } else {
      revocationConfirmed = closed;
    }
    durable = Boolean(existing && (trusted || freshOwner) && !proof.staffOnly);
  } catch {
    // Preparation failure preserves the last usable authentication and handoff.
    // Errors expose no identifiers, database messages or proof bytes.
    if (existing) {
      try { const proof = parseRecovery(existing); durable = !expiredLocator && (!authenticatedActor || authenticatedActor === proof.owner) && authenticRecovery(existing) && !proof.staffOnly && proof.expires > Date.now() && retentionDeadline(proof) > Date.now() && state !== "identity_mismatch"; } catch { /* No authority. */ }
    }
  }
  const mayClear = action !== "prepare" && (revocationConfirmed || durable);
  if (mayClear && authClient) {
    try { signOutConfirmed = !(await authClient.auth.signOut({ scope: "local" })).error; } catch { /* Preserve truthful failure. */ }
  }
  const success = action !== "prepare" && revocationConfirmed && signOutConfirmed;
  const response = NextResponse.json({ success, prepared, revocationConfirmed, signOutConfirmed, state, ...(action === "complete" && success ? { cleanEntryPath } : {}) }, { status: prepared || success ? 200 : 409 });
  const options = { path: "/", httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production" };
  // Next response-cookie round trips can drop a zero Max-Age. The explicit
  // past expiry preserves deletion through the full application response.
  if (mayClear) {
    for (const name of new Set(["clinic_session", "clinic_device", "clinic_event", "clinic_entry", ...request.cookies.getAll().map(c => c.name)
      .filter(name => name !== RECOVERY_COOKIE && name !== COMPLETED_COOKIE && name !== "clinic_reset_pending" && /^(sb-|clinic_|screening_|briefcase_)/.test(name))])) response.cookies.set(name, "", { ...options, maxAge: 0, expires: new Date(0) });
    response.headers.set("Clear-Site-Data", '"cache", "storage"');
  }
  if (existing && !issued && !(action === "complete" && success)) {
    try {
      const prior = parseRecovery(existing);
      if (authenticRecovery(existing)) response.cookies.set(RECOVERY_COOKIE, existing, { ...recoveryOptions(prior), expires: new Date(Math.min(retentionDeadline(prior), locatorDeadline ?? Infinity)) });
    } catch { /* Invalid data does not acquire a retention extension. */ }
  }
  if (expiredLocator) response.cookies.set(RECOVERY_COOKIE, "", { ...options, maxAge: 0, expires: new Date(0) });
  if (issued) response.cookies.set(RECOVERY_COOKIE, issued.value, recoveryOptions(issued.proof));
  if (action === "complete" && success) {
    response.cookies.set("clinic_reset_pending", "", { ...options, httpOnly: false, maxAge: 0, expires: new Date(0) });
    response.cookies.set(RECOVERY_COOKIE, "", { ...options, maxAge: 0, expires: new Date(0) });
    // Replace participant-bearing state only after the browser's cleanup phase.
    // A lost response or interrupted final navigation can retry using this
    // non-identifying receipt. It grants no session lookup or closure authority.
    if (completionUntil) response.cookies.set(COMPLETED_COOKIE, encodeCompletion(cleanEntryPath, completionUntil), { ...options, expires: new Date(completionUntil) });
  } else if (!pending) response.cookies.set("clinic_reset_pending", "1", { ...options, httpOnly: false, maxAge: 400 * 24 * 60 * 60 });
  response.headers.set("Cache-Control", "no-store, private, max-age=0, must-revalidate");
  return response;
}
