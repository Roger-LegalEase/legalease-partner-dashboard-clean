// Durable packet render job contract.
//
// Pure types and predicates. This module performs no database access, no
// storage access and no network access, and holds no import-time side effects,
// so it is safe to import before supabase/phase-49-rcap-packet-render-jobs.sql
// has been applied.
//
// The status machine here is the same one the phase-49 trigger enforces.
// Keeping two copies is a drift risk, so scripts/verify-rcap-render-job-contract.mjs
// parses the transition table out of the SQL and fails if the two disagree.
// The database remains the authority; this copy exists so the worker can reject
// an illegal transition before spending a round trip on it.

export const RENDER_JOB_STATUSES = [
  "queued",
  "claimed",
  "rendering",
  "validating",
  "artifact_validated",
  "delivered",
  "failed"
] as const;

export type RenderJobStatus = (typeof RENDER_JOB_STATUSES)[number];

// Mirror of packet_render_jobs_guard_transition(). Order within each array is
// not significant; membership is.
export const RENDER_JOB_TRANSITIONS: Readonly<Record<RenderJobStatus, readonly RenderJobStatus[]>> =
  Object.freeze({
    queued: ["claimed", "failed"],
    claimed: ["rendering", "failed", "queued"],
    rendering: ["validating", "failed"],
    validating: ["artifact_validated", "failed"],
    artifact_validated: ["delivered"],
    delivered: [],
    failed: ["queued"]
  });

// Statuses in which a validated artifact is known to exist. Credit may move
// only from one of these, and only with output evidence attached.
export const CREDITABLE_STATUSES: readonly RenderJobStatus[] = ["artifact_validated", "delivered"];

export const RENDER_JOB_ERROR_CODES = [
  "source_not_whitelisted",
  "profile_unknown",
  "render_failed",
  "invalid_pdf_output",
  "page_count_mismatch",
  "protected_field_populated",
  "storage_write_failed",
  "storage_readback_failed",
  "checksum_mismatch",
  "timeout",
  "worker_crashed"
] as const;

export type RenderJobErrorCode = (typeof RENDER_JOB_ERROR_CODES)[number];

export interface RenderJob {
  id: string;
  packetId: string;
  routeId: string;
  rendererKind: string;
  sourceSha256: string;
  profileId: string;
  profileVersion: string;
  inputHash: string;
  status: RenderJobStatus;
  attemptCount: number;
  outputStoragePath: string | null;
  outputSha256: string | null;
  normalizedOutputSha256: string | null;
  pageCount: number | null;
  errorCode: RenderJobErrorCode | null;
  claimedBy: string | null;
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export function isSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

export function canTransition(from: RenderJobStatus, to: RenderJobStatus): boolean {
  return RENDER_JOB_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Whether a job carries the evidence its status claims.
 *
 * A job in a creditable status without a stored path and checksum is the exact
 * failure this contract exists to prevent: a status flip standing in for a
 * document that was never produced.
 */
export function hasValidatedOutput(job: Pick<RenderJob, "status" | "outputStoragePath" | "outputSha256">): boolean {
  if (!CREDITABLE_STATUSES.includes(job.status)) return false;
  if (typeof job.outputStoragePath !== "string" || job.outputStoragePath.trim() === "") return false;
  return isSha256(job.outputSha256);
}

/**
 * The single predicate every credit-moving call site must satisfy.
 *
 * Deliberately narrow: it takes the job, not a packet status, a boolean or a
 * caller's assurance. `packetStatus === "ready"` is what allowed credit to move
 * against an in-memory text string; a status alone can never satisfy this.
 */
export function mayConsumeCredit(job: Pick<RenderJob, "status" | "outputStoragePath" | "outputSha256">): boolean {
  return hasValidatedOutput(job);
}

export interface RenderInputGuardResult {
  ok: boolean;
  errorCode?: RenderJobErrorCode;
  reason?: string;
}

/**
 * Gate applied by the worker before rendering anything.
 *
 * The worker accepts only whitelisted source digests and known profile
 * versions, so a drifted, substituted or caller-supplied source cannot be
 * rendered. Fails closed: an unrecognised input is refused rather than
 * rendered on a guess.
 */
export function guardRenderInputs(input: {
  sourceSha256: string;
  profileId: string;
  profileVersion: string;
  allowedSourceSha256: readonly string[];
  knownProfileVersions: Readonly<Record<string, readonly string[]>>;
}): RenderInputGuardResult {
  if (!isSha256(input.sourceSha256)) {
    return { ok: false, errorCode: "source_not_whitelisted", reason: "source digest is not a sha256" };
  }
  if (!input.allowedSourceSha256.includes(input.sourceSha256)) {
    return { ok: false, errorCode: "source_not_whitelisted", reason: "source digest is not whitelisted" };
  }
  const versions = input.knownProfileVersions[input.profileId];
  if (!versions || versions.length === 0) {
    return { ok: false, errorCode: "profile_unknown", reason: "profile id is not known" };
  }
  if (!versions.includes(input.profileVersion)) {
    return { ok: false, errorCode: "profile_unknown", reason: "profile version is not known" };
  }
  return { ok: true };
}

export interface OutputValidationResult {
  ok: boolean;
  errorCode?: RenderJobErrorCode;
  reason?: string;
  pageCount?: number;
}

const PDF_MAGIC = "%PDF-";

/**
 * Validation applied to bytes read back out of storage, not to bytes held in
 * memory before the write. Reading back is the point: it proves the object
 * exists and is retrievable, which an in-memory buffer never does.
 */
export function validateRenderedPdf(input: {
  bytes: Uint8Array;
  expectedSha256: string;
  actualSha256: string;
  expectedPageCount?: number | null;
  countPages: (bytes: Uint8Array) => number;
}): OutputValidationResult {
  if (input.bytes.length === 0) {
    return { ok: false, errorCode: "invalid_pdf_output", reason: "empty object" };
  }

  const header = new TextDecoder("latin1").decode(input.bytes.subarray(0, PDF_MAGIC.length));
  if (header !== PDF_MAGIC) {
    return { ok: false, errorCode: "invalid_pdf_output", reason: "object is not a PDF" };
  }

  if (!isSha256(input.actualSha256) || input.actualSha256 !== input.expectedSha256) {
    return {
      ok: false,
      errorCode: "checksum_mismatch",
      reason: "stored bytes do not match the recorded digest"
    };
  }

  let pageCount: number;
  try {
    pageCount = input.countPages(input.bytes);
  } catch {
    return { ok: false, errorCode: "invalid_pdf_output", reason: "page structure could not be read" };
  }

  if (!Number.isInteger(pageCount) || pageCount < 1) {
    return { ok: false, errorCode: "invalid_pdf_output", reason: "no readable pages" };
  }

  if (
    typeof input.expectedPageCount === "number" &&
    input.expectedPageCount > 0 &&
    pageCount !== input.expectedPageCount
  ) {
    return {
      ok: false,
      errorCode: "page_count_mismatch",
      reason: `expected ${input.expectedPageCount} pages, read ${pageCount}`
    };
  }

  return { ok: true, pageCount };
}

/**
 * Retry policy. attemptCount is incremented by the claim, so a job that has
 * exhausted its attempts is failed rather than re-queued forever.
 */
export const MAX_RENDER_ATTEMPTS = 3;

export function shouldRetry(job: Pick<RenderJob, "attemptCount">, errorCode: RenderJobErrorCode): boolean {
  // Input-shaped failures are not transient: retrying an unwhitelisted source
  // or an unknown profile produces the same refusal and burns the queue.
  const terminal: readonly RenderJobErrorCode[] = [
    "source_not_whitelisted",
    "profile_unknown",
    "protected_field_populated",
    "page_count_mismatch"
  ];
  if (terminal.includes(errorCode)) return false;
  return job.attemptCount < MAX_RENDER_ATTEMPTS;
}
