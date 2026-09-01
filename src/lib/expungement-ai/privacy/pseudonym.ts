import "server-only";

import { createHmac } from "node:crypto";

/**
 * Keyed pseudonymization for erased participants.
 *
 * A plain SHA-256 of an account id is NOT a pseudonym once the id space is
 * guessable — and a UUID space is guessable if you already hold the id, which is
 * exactly the position an attacker with a stale backup is in. Keying the digest
 * with a server secret means a retained accounting row cannot be re-linked to an
 * account by anyone who does not hold that secret, while the mapping stays
 * deterministic so two rows for the same erased participant still agree and the
 * books still balance.
 *
 * The secret is required in production for the same reason RATE_LIMIT_HASH_SECRET
 * is: a known development fallback in production is not a key.
 */
const SUBJECT_NAMESPACE = "participant-erasure-subject:v1";
const USER_ID_NAMESPACE = "participant-erasure-user-id:v1";

export function getParticipantPseudonymSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.PARTICIPANT_PRIVACY_PSEUDONYM_SECRET;
  if (secret && secret.length >= 24) return secret;
  if ((env.VERCEL_ENV ?? "") === "production" || (env.NODE_ENV ?? "") === "production") {
    throw new Error("PARTICIPANT_PRIVACY_PSEUDONYM_SECRET is required in production.");
  }
  return "development-only-participant-privacy-pseudonym-secret";
}

/** The 64-hex subject code that appears on a tombstone and on a receipt. */
export function participantSubjectPseudonym(userId: string, env: NodeJS.ProcessEnv = process.env): string {
  return createHmac("sha256", getParticipantPseudonymSecret(env))
    .update(`${SUBJECT_NAMESPACE}:${userId}`)
    .digest("hex");
}

/**
 * The uuid that replaces a participant's account id inside retained records.
 *
 * Shaped as a well-formed v4 UUID because the columns it lands in are uuid
 * columns, using the same version/variant pinning as consumer-identity.ts so the
 * two derivations look like one codebase rather than two.
 */
export function participantPseudonymUserId(userId: string, env: NodeJS.ProcessEnv = process.env): string {
  const h = createHmac("sha256", getParticipantPseudonymSecret(env))
    .update(`${USER_ID_NAMESPACE}:${userId}`)
    .digest("hex");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
