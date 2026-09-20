import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getServerAuthState } from "@/lib/supabase/auth-server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { isRecentAuthPurpose, PRIVACY_RATE_LIMIT_POLICIES } from "@/lib/expungement-ai/privacy/contract";
import { mintRecentAuthProof } from "@/lib/expungement-ai/privacy/recent-auth";
import {
  assertSameOrigin,
  PrivacyOriginError,
  PrivacyRequestError,
  privacyClientIp,
  privacyJson,
  readPrivacyJsonBody
} from "@/lib/expungement-ai/privacy/request-security";
import { isParticipantAccountBlocked } from "@/lib/expungement-ai/privacy/account-status";
import { checkResumeRateLimit } from "@/lib/expungement-ai/screening-resume-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proves the person at the keyboard still holds the account password, and mints
 * a short-lived, purpose-bound proof for one destructive action.
 *
 * The password is checked against the identity provider on a throwaway client
 * that persists nothing and is signed out immediately with scope "local", so
 * this endpoint never mints a session the caller could keep and never disturbs
 * the session they already have. It is rate limited by account AND by address,
 * because either alone is a password oracle.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch (error) {
    if (error instanceof PrivacyOriginError) return privacyJson({ error: error.message, code: error.code }, error.status);
    throw error;
  }

  const auth = await getServerAuthState();
  if (!auth.isAuthenticated || !auth.email) {
    return privacyJson({ error: "Sign in to continue.", code: "not_authenticated" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await readPrivacyJsonBody(request);
  } catch (error) {
    if (error instanceof PrivacyRequestError) return privacyJson({ error: error.message, code: error.code }, error.status);
    throw error;
  }

  const purpose = body.purpose;
  if (!isRecentAuthPurpose(purpose)) {
    return privacyJson({ error: "Say which action this confirms.", code: "invalid_purpose" }, 400);
  }

  // A frozen account may still mint an account-deletion proof, and only that
  // one. Freezing is the first step of a deletion, so refusing every proof to a
  // frozen account would strand a half-finished erasure with no way for the
  // participant to resume it. Deleting one matter, on the other hand, is
  // ordinary product work and stays refused.
  if (purpose !== "account_deletion" && (await isParticipantAccountBlocked(auth.userId))) {
    return privacyJson({ error: "This account has been deleted.", code: "account_deleted" }, 403);
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return privacyJson({ error: "Enter your password to confirm.", code: "password_required" }, 400);
  }

  const admin = getSupabaseAdminClient();
  const ip = privacyClientIp(request);
  for (const [policy, keyParts] of [
    [PRIVACY_RATE_LIMIT_POLICIES.reauthUser, [auth.userId]],
    [PRIVACY_RATE_LIMIT_POLICIES.reauthIp, [ip]]
  ] as const) {
    const limit = await checkResumeRateLimit({
      supabase: admin,
      scope: policy.scope,
      keyParts: [...keyParts],
      maxAttempts: policy.maxAttempts,
      windowMs: policy.windowMs
    });
    if (!limit.ok) {
      return privacyJson(
        { error: "Too many attempts. Wait a few minutes and try again.", code: "rate_limited" },
        429
      );
    }
  }

  const verified = await verifyPassword(auth.email, password);
  if (!verified) {
    // One message for a wrong password and for a rejected attempt of any other
    // kind, so this cannot be used to learn anything about the account.
    return privacyJson({ error: "That password did not match.", code: "password_rejected" }, 401);
  }

  const proof = mintRecentAuthProof({ userId: auth.userId, purpose });
  return privacyJson({
    proof: proof.token,
    expiresAt: proof.expiresAt,
    purpose: proof.purpose
  });
}

async function verifyPassword(email: string, password: string): Promise<boolean> {
  let config: { url: string; anonKey: string };
  try {
    config = getSupabasePublicConfig();
  } catch {
    return false;
  }

  const client = createClient(config.url, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) return false;

  // Revoke the session this check just created, and only that one. A global
  // sign-out here would log the participant out of the browser they are
  // standing in, mid-flow.
  try {
    await client.auth.signOut({ scope: "local" });
  } catch {
    // The proof is already earned; a failed cleanup of a non-persisted session
    // is not a reason to refuse it.
  }
  return true;
}
