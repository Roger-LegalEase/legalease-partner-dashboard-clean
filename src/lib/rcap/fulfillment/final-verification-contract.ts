/**
 * What "final verification" is bound to, stated exactly and computed here.
 *
 * WHY THIS FILE EXISTS
 *
 * `FinalVerificationProof.boundInputsSha256` is the value that makes "verified"
 * mean "verified against these inputs" rather than "verified at some point".
 * Until now it was a hash with no stated preimage: any 64 hex characters
 * satisfied the shape, nothing said what they had to be over, and two different
 * verifiers could each produce a valid-looking value that agreed about nothing.
 * A binding whose contents are unspecified binds nothing.
 *
 * So the contract is a function. The bound inputs are exactly:
 *
 *   participant        who the packet is for
 *   matter             which of their matters
 *   route              which route's authority is being exercised
 *   packet family      which family that route resolves to, server-side
 *   canonical facts    the fact snapshot the packet would be composed from
 *   specification      the canonical content hash of the versioned specification
 *   source hashes      every official source the record binds, by id
 *   artifact input     the digest of the filing-format artifact
 *   revision           which revision of the verification this is
 *
 * Everything a change to which should make the packet a different packet, and
 * nothing else. The clock is deliberately absent: a verification that expires by
 * time rather than by a changed input is a policy, not a binding, and this
 * product already re-verifies content on every delivery.
 *
 * THE PROPERTY THIS EXISTS TO GIVE
 *
 * A material Review and Edit change moves `factSnapshotSha256`, which moves this
 * hash, which makes the record's bound value disagree with the recomputed one.
 * The verification is then invalid by arithmetic, without anyone remembering to
 * invalidate it. `finalVerificationIsCurrent` is that comparison.
 */

import type { FinalVerificationSnapshot } from "@/lib/rcap/fulfillment/grade-a-request-context";

/** The exact preimage. Field order here is the contract; it is never reordered. */
export type FinalVerificationBoundInputs = {
  participantUserId: string;
  matterId: string;
  routeId: string;
  packetFamilyId: string | null;
  factSnapshotSha256: string;
  specificationSha256: string;
  officialSourceSha256ById: Record<string, string>;
  artifactInputSha256: string;
  verificationRevision: string;
};

export const FINAL_VERIFICATION_CONTRACT_VERSION = "rcap-final-verification-bound-inputs/v1";

/** The nine bound inputs, in the order the contract enumerates them. */
export const FINAL_VERIFICATION_BOUND_INPUT_KEYS = [
  "participantUserId",
  "matterId",
  "routeId",
  "packetFamilyId",
  "factSnapshotSha256",
  "specificationSha256",
  "officialSourceSha256ById",
  "artifactInputSha256",
  "verificationRevision"
] as const;

/**
 * Key-sorted at every depth. Without this the hash would depend on the order a
 * caller happened to build an object in, and two verifiers with identical inputs
 * could disagree.
 */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((k) => `${JSON.stringify(k)}:${stable(record[k])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The canonical preimage for a snapshot and the record it is being offered
 * against. The route-level identities come from the RECORD -- server-side,
 * already proven -- and the matter-level identities come from the snapshot. A
 * caller cannot supply the specification hash or the source digests, which is
 * the point: those are the half a request must not be able to choose.
 */
export function finalVerificationBoundInputs(input: {
  snapshot: FinalVerificationSnapshot;
  participantUserId: string;
  routeId: string;
  packetFamilyId: string | null;
  specificationSha256: string;
  officialSourceSha256ById: Record<string, string>;
  artifactInputSha256: string;
}): FinalVerificationBoundInputs {
  return {
    participantUserId: input.participantUserId,
    matterId: input.snapshot.matterId,
    routeId: input.routeId,
    packetFamilyId: input.packetFamilyId,
    factSnapshotSha256: input.snapshot.factSnapshotSha256,
    specificationSha256: input.specificationSha256,
    officialSourceSha256ById: input.officialSourceSha256ById,
    artifactInputSha256: input.artifactInputSha256,
    // A snapshot that carries no explicit revision is identified by itself.
    verificationRevision: input.snapshot.snapshotId
  };
}

export async function finalVerificationBoundInputsSha256(
  inputs: FinalVerificationBoundInputs
): Promise<string> {
  return sha256Hex(`${FINAL_VERIFICATION_CONTRACT_VERSION}\n${stable(inputs)}`);
}

/**
 * Whether a bound verification still describes the world it was taken in.
 *
 * Returns the reasons it does not, so a caller reports which input moved rather
 * than "stale". An empty list means current.
 */
export async function finalVerificationDivergence(input: {
  boundSha256: string | null;
  inputs: FinalVerificationBoundInputs;
  snapshot: FinalVerificationSnapshot;
}): Promise<string[]> {
  const reasons: string[] = [];
  if (input.snapshot.invalidated) {
    reasons.push(`final_verification: the snapshot is marked invalidated (${input.snapshot.invalidationReason ?? "no reason recorded"})`);
  }
  if (input.snapshot.outcome !== "VERIFIED_PACKET_READY") {
    reasons.push(`final_verification: the snapshot outcome is ${input.snapshot.outcome}`);
  }
  if (!input.boundSha256 || input.boundSha256.trim() === "") {
    reasons.push("final_verification: the record binds no inputs hash, so there is nothing to re-check");
    return reasons;
  }
  const recomputed = await finalVerificationBoundInputsSha256(input.inputs);
  if (recomputed !== input.boundSha256) {
    reasons.push(
      `final_verification: bound inputs ${input.boundSha256.slice(0, 12)}… no longer describe this matter (recomputed ${recomputed.slice(0, 12)}…); `
      + "a material Review and Edit change moves the fact snapshot and invalidates the verification by arithmetic"
    );
  }
  return reasons;
}
