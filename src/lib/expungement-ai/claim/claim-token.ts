import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * The claim token is the only thing the browser holds between a preliminary
 * result and the matter it becomes.
 *
 * Contract §7: cryptographically random, opaque, single purpose, single use,
 * short lived, stored hashed at rest, bound to the pending result, kept out of
 * analytics and application logs, stripped from the URL immediately after use,
 * never in localStorage.
 *
 * It replaces the previous arrangement in which possession of `pending_id` was
 * the entire authorization. The pending id now never leaves the server: the
 * claim resolves its row from the hash of the presented token.
 */

// 32 random bytes -> 43 base64url characters, inside the
// ^[A-Za-z0-9_-]{32,200}$ shape the claim function enforces.
const TOKEN_BYTES = 32;
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{32,200}$/;

export function mintClaimToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function claimTokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isWellFormedClaimToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_SHAPE.test(value);
}

/**
 * Constant-time comparison for the rare case where two hashes are compared in
 * application code. The claim itself compares inside the database, under the
 * row lock, which is the only comparison that decides ownership.
 */
export function claimTokenHashEquals(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

/**
 * Never interpolate a claim token into a log line, an analytics event, an error
 * message, or a stored record. Use this when a value has to be referenced at
 * all.
 */
export function redactClaimToken(token: string | null | undefined): string {
  if (!token) return "absent";
  return `claim_token:${claimTokenHash(token).slice(0, 8)}`;
}
