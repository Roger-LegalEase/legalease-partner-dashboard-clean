import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { RECENT_AUTH_PROOF_TTL_SECONDS, type RecentAuthPurpose } from "@/lib/expungement-ai/privacy/contract";

/**
 * Recent-authentication proof for destructive participant actions.
 *
 * Why a proof token rather than "is the session fresh?": a Supabase access token
 * is refreshed silently in the background, so its age measures the last refresh,
 * not the last time a human proved they hold the credential. Someone who walks
 * up to an unlocked browser passes an age check and fails this one.
 *
 * The proof is minted only by the reauthentication route, which verifies the
 * account password server-side. It is bound to:
 *
 *   the account   — a proof for User A cannot authorize User B's deletion;
 *   the purpose   — a proof minted to delete one matter cannot delete the account;
 *   a deadline    — ten minutes;
 *   a nonce       — so two proofs are never the same string.
 *
 * Single use is enforced one layer down, by the unique index on
 * participant_privacy_requests.recent_auth_proof_hash: a replayed proof lands on
 * the request it already authorized, which is idempotent, and cannot open a
 * second one.
 *
 * Nothing is stored at mint time on purpose. A stateless proof cannot be read
 * out of a table by an attacker who reaches the database, and its blast radius
 * is bounded by the ten minutes and the single-use index instead.
 */
const PROOF_VERSION = "v1";

export type RecentAuthProof = {
  token: string;
  issuedAt: string;
  expiresAt: string;
  purpose: RecentAuthPurpose;
};

export type RecentAuthVerification =
  | { ok: true; userId: string; purpose: RecentAuthPurpose; issuedAt: string; proofHash: string }
  | { ok: false; reason: "malformed" | "wrong_user" | "wrong_purpose" | "expired" | "bad_signature" };

function getProofSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.PARTICIPANT_PRIVACY_PROOF_SECRET;
  if (secret && secret.length >= 24) return secret;
  if ((env.VERCEL_ENV ?? "") === "production" || (env.NODE_ENV ?? "") === "production") {
    throw new Error("PARTICIPANT_PRIVACY_PROOF_SECRET is required in production.");
  }
  return "development-only-participant-privacy-proof-secret";
}

function sign(payload: string, env: NodeJS.ProcessEnv): string {
  return createHmac("sha256", getProofSecret(env)).update(payload).digest("hex");
}

export function mintRecentAuthProof({
  userId,
  purpose,
  now = Date.now(),
  env = process.env,
  nonce = randomBytes(16).toString("hex")
}: {
  userId: string;
  purpose: RecentAuthPurpose;
  now?: number;
  env?: NodeJS.ProcessEnv;
  nonce?: string;
}): RecentAuthProof {
  const issuedAtMs = Math.floor(now / 1000) * 1000;
  const expiresAtMs = issuedAtMs + RECENT_AUTH_PROOF_TTL_SECONDS * 1000;
  const payload = [PROOF_VERSION, userId, purpose, String(issuedAtMs), String(expiresAtMs), nonce].join(".");
  return {
    token: `${payload}.${sign(payload, env)}`,
    issuedAt: new Date(issuedAtMs).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    purpose
  };
}

/** SHA-256 of the token. This — never the token — is what the request row stores. */
export function recentAuthProofHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyRecentAuthProof({
  token,
  userId,
  purpose,
  now = Date.now(),
  env = process.env
}: {
  token: unknown;
  userId: string;
  purpose: RecentAuthPurpose;
  now?: number;
  env?: NodeJS.ProcessEnv;
}): RecentAuthVerification {
  if (typeof token !== "string" || token.length < 32 || token.length > 512) {
    return { ok: false, reason: "malformed" };
  }
  const parts = token.split(".");
  if (parts.length !== 7 || parts[0] !== PROOF_VERSION) return { ok: false, reason: "malformed" };

  const [, tokenUserId, tokenPurpose, issuedAtRaw, expiresAtRaw, nonce, signature] = parts;
  const payload = [PROOF_VERSION, tokenUserId, tokenPurpose, issuedAtRaw, expiresAtRaw, nonce].join(".");

  // Signature first, and in constant time. Comparing the user or the deadline
  // before the signature would answer questions about unsigned input.
  const expected = Buffer.from(sign(payload, env), "utf8");
  const provided = Buffer.from(signature, "utf8");
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return { ok: false, reason: "bad_signature" };
  }

  const issuedAtMs = Number(issuedAtRaw);
  const expiresAtMs = Number(expiresAtRaw);
  if (!Number.isFinite(issuedAtMs) || !Number.isFinite(expiresAtMs)) return { ok: false, reason: "malformed" };
  if (tokenUserId !== userId) return { ok: false, reason: "wrong_user" };
  if (tokenPurpose !== purpose) return { ok: false, reason: "wrong_purpose" };
  if (now >= expiresAtMs) return { ok: false, reason: "expired" };

  return {
    ok: true,
    userId: tokenUserId,
    purpose: tokenPurpose as RecentAuthPurpose,
    issuedAt: new Date(issuedAtMs).toISOString(),
    proofHash: recentAuthProofHash(token)
  };
}
