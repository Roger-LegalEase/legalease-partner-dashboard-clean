// The render worker contract.
//
// The worker runs outside the request path, in a container, with no outbound
// network during render. It is not trusted to describe its own work: every fact
// that determines the output — the route, the source bytes, the profile version,
// the renderer version — is derived on the server and written to the job before
// the worker ever sees it. The worker claims a job by id, renders, and reports
// bytes. If it reports anything else, the checks here reject it.
//
// Nothing in this module touches the database or the network, so all of it is
// exercised directly by the verifier.

import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { packetRouteCanRender, resolvePacketRoute, type PacketRouteResolution } from "@/lib/rcap/documents/packet-route-resolver";
import { PACKET_RENDERER_KIND, PACKET_RENDERER_VERSION } from "@/lib/rcap/documents/packet-document-renderer";

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

export const RENDERER_KINDS = ["packet_document_v1", "official_pdf_overlay_v1", "xfa_static_variant_v1"] as const;
export type RendererKind = (typeof RENDERER_KINDS)[number];

/**
 * Mirrors the trigger in phase-48. Kept in both places on purpose: the database
 * is the authority, and this copy lets the server refuse an illegal transition
 * before it costs a round trip. The verifier holds them identical.
 */
const ALLOWED_TRANSITIONS: Record<RenderJobStatus, readonly RenderJobStatus[]> = {
  queued: ["claimed", "failed"],
  claimed: ["rendering", "failed", "queued"],
  rendering: ["validating", "failed"],
  validating: ["artifact_validated", "failed"],
  artifact_validated: ["delivered"],
  delivered: [],
  failed: ["queued"]
};

/** Statuses at which an artifact provably exists. Nothing else may consume. */
export const CREDIT_ELIGIBLE_STATUSES: readonly RenderJobStatus[] = ["artifact_validated", "delivered"];

export type RenderJobSpec = {
  packetId: string;
  routeId: string;
  rendererKind: RendererKind;
  rendererVersion: string;
  sourceSha256: string | null;
  profileId: string;
  profileVersion: string;
  inputHash: string;
  partnerSlug: string | null;
  briefcaseItemId: string | null;
};

export type RenderJobClaim = {
  id: string;
  packetId: string;
  routeId: string;
  rendererKind: string;
  rendererVersion: string;
  sourceSha256: string | null;
  profileId: string;
  profileVersion: string;
  inputHash: string;
  attemptCount: number;
};

export type RenderOutputReport = {
  jobId: string;
  bytes: Buffer;
  containerDigest: string;
};

export type RenderOutputValidation =
  | {
      ok: true;
      outputSha256: string;
      normalizedOutputSha256: string;
      byteCount: number;
      pageCount: number;
    }
  | { ok: false; errorCode: RenderErrorCode; detail: string };

export type RenderErrorCode =
  | "output_empty"
  | "output_not_pdf"
  | "output_unparseable"
  | "output_no_pages"
  | "output_geometry_unexpected"
  | "unknown_job"
  | "job_not_claimable"
  | "renderer_kind_unknown"
  | "source_sha_not_allowed"
  | "profile_version_unknown"
  | "container_digest_missing";

export class RenderContractError extends Error {
  readonly errorCode: RenderErrorCode;
  constructor(errorCode: RenderErrorCode, message: string) {
    super(message);
    this.name = "RenderContractError";
    this.errorCode = errorCode;
  }
}

export function canTransition(from: RenderJobStatus, to: RenderJobStatus) {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function allowedTransitionsFrom(from: RenderJobStatus): readonly RenderJobStatus[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}

/**
 * A credit moves only from a status at which a validated artifact exists, and
 * only once. Every other answer is false, including for a job that failed after
 * validating, because the artifact still exists in that case and was already
 * counted.
 */
export function isCreditConsumable(job: { status: RenderJobStatus; consumedCredit: boolean }) {
  return CREDIT_ELIGIBLE_STATUSES.includes(job.status) && !job.consumedCredit;
}

/**
 * The unit of consumption is one distinct supported matter, not one packet and
 * not one download. Retries, corrected versions and re-downloads of the same
 * matter derive the same key and therefore cannot consume twice.
 */
export function consumptionUnitKey(input: { partnerSlug: string; personId: string; matterId: string }) {
  const partnerSlug = requireValue(input.partnerSlug, "partnerSlug");
  const personId = requireValue(input.personId, "personId");
  const matterId = requireValue(input.matterId, "matterId");
  return `${partnerSlug}:${personId}:${matterId}`;
}

/**
 * Deterministic over the facts that decide the output, and nothing else. Two
 * requests that would produce the same packet produce the same hash, which is
 * what makes an idempotent retry find the existing job rather than queue a
 * second one.
 */
export function computeInputHash(input: {
  packetId: string;
  routeId: string;
  rendererKind: string;
  rendererVersion: string;
  profileId: string;
  profileVersion: string;
  sourceSha256?: string | null;
  packetFields: Record<string, unknown>;
}) {
  const canonical = JSON.stringify({
    packetId: input.packetId,
    routeId: input.routeId,
    rendererKind: input.rendererKind,
    rendererVersion: input.rendererVersion,
    profileId: input.profileId,
    profileVersion: input.profileVersion,
    sourceSha256: input.sourceSha256 ?? null,
    packetFields: canonicalize(input.packetFields)
  });
  return sha256(Buffer.from(canonical, "utf8"));
}

/**
 * Builds the job from server-derived facts only. Fails closed: a route that
 * cannot render never produces a job, so a queued job is by construction a route
 * we support.
 */
export function buildRenderJobSpec(input: {
  packetId: string;
  state?: string | null;
  pathway?: string | null;
  profileId: string;
  profileVersion: string;
  sourceSha256?: string | null;
  partnerSlug?: string | null;
  briefcaseItemId?: string | null;
  packetFields: Record<string, unknown>;
}): { spec: RenderJobSpec; route: PacketRouteResolution } | { spec: null; route: PacketRouteResolution } {
  const route = resolvePacketRoute({ state: input.state, pathway: input.pathway });
  if (!packetRouteCanRender(route)) {
    return { spec: null, route };
  }

  const rendererKind = route.rendererKind as RendererKind;
  const rendererVersion = rendererKind === PACKET_RENDERER_KIND ? PACKET_RENDERER_VERSION : "0.0.0";
  const routeId = `${route.jurisdiction}:${route.pathwayId}`;

  const spec: RenderJobSpec = {
    packetId: requireValue(input.packetId, "packetId"),
    routeId,
    rendererKind,
    rendererVersion,
    sourceSha256: input.sourceSha256 ?? null,
    profileId: requireValue(input.profileId, "profileId"),
    profileVersion: requireValue(input.profileVersion, "profileVersion"),
    partnerSlug: input.partnerSlug ?? null,
    briefcaseItemId: input.briefcaseItemId ?? null,
    inputHash: computeInputHash({
      packetId: input.packetId,
      routeId,
      rendererKind,
      rendererVersion,
      profileId: input.profileId,
      profileVersion: input.profileVersion,
      sourceSha256: input.sourceSha256 ?? null,
      packetFields: input.packetFields
    })
  };

  return { spec, route };
}

/**
 * What the worker is allowed to act on. Everything is checked against
 * server-side allowlists, so a worker cannot widen its own scope by asking for
 * an unknown renderer, an unpinned source or an unknown profile version.
 */
export function assertClaimAcceptable(
  claim: RenderJobClaim,
  allowlists: {
    knownJobIds: ReadonlySet<string>;
    allowedSourceShas: ReadonlySet<string>;
    knownProfileVersions: ReadonlySet<string>;
    supportedRendererKinds?: ReadonlySet<string>;
  }
) {
  if (!allowlists.knownJobIds.has(claim.id)) {
    throw new RenderContractError("unknown_job", `Job ${claim.id} was not issued by the server.`);
  }

  const supported = allowlists.supportedRendererKinds ?? new Set<string>(RENDERER_KINDS);
  if (!supported.has(claim.rendererKind)) {
    throw new RenderContractError("renderer_kind_unknown", `Renderer kind ${claim.rendererKind} is not supported.`);
  }

  // A null source SHA is legitimate for a renderer that composes its own
  // document. A non-null one must be pinned to a source we admitted.
  if (claim.sourceSha256 !== null && !allowlists.allowedSourceShas.has(claim.sourceSha256)) {
    throw new RenderContractError("source_sha_not_allowed", `Source ${claim.sourceSha256} is not an admitted source.`);
  }

  if (!allowlists.knownProfileVersions.has(claim.profileVersion)) {
    throw new RenderContractError("profile_version_unknown", `Profile version ${claim.profileVersion} is not known.`);
  }

  return true;
}

/**
 * Validation happens on the bytes, after the render, before anything is marked
 * ready and before any credit moves. A status flip is not a validation.
 */
export async function validateRenderOutput(
  report: RenderOutputReport,
  expectations: { minimumPageCount?: number; expectedPageSize?: { width: number; height: number } } = {}
): Promise<RenderOutputValidation> {
  const { bytes } = report;

  if (!report.containerDigest || !report.containerDigest.trim()) {
    return { ok: false, errorCode: "container_digest_missing", detail: "The worker did not record its container digest." };
  }
  if (!bytes || bytes.length === 0) {
    return { ok: false, errorCode: "output_empty", detail: "The renderer produced no bytes." };
  }
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return { ok: false, errorCode: "output_not_pdf", detail: "The output does not carry a PDF header." };
  }

  // A truncated or damaged file can load without throwing and only fail when its
  // pages are read, so parsing and page access are guarded together. Anything
  // that cannot be read back is unparseable, not a validated artifact.
  let pageCount: number;
  let firstPageSize: { width: number; height: number } | null = null;
  try {
    const document = await PDFDocument.load(bytes);
    pageCount = document.getPageCount();
    const pages = document.getPages();
    firstPageSize = pages.length > 0 ? pages[0].getSize() : null;
  } catch (error) {
    return { ok: false, errorCode: "output_unparseable", detail: error instanceof Error ? error.message : "The output could not be parsed." };
  }

  if (pageCount < (expectations.minimumPageCount ?? 1)) {
    return { ok: false, errorCode: "output_no_pages", detail: `The output has ${pageCount} pages.` };
  }

  if (expectations.expectedPageSize) {
    const matches =
      firstPageSize !== null &&
      Math.round(firstPageSize.width) === Math.round(expectations.expectedPageSize.width) &&
      Math.round(firstPageSize.height) === Math.round(expectations.expectedPageSize.height);
    if (!matches) {
      const actual = firstPageSize ? `${Math.round(firstPageSize.width)}x${Math.round(firstPageSize.height)}` : "unknown";
      return { ok: false, errorCode: "output_geometry_unexpected", detail: `First page is ${actual}.` };
    }
  }

  let normalizedOutputSha256: string;
  try {
    normalizedOutputSha256 = await computeNormalizedFingerprint(bytes);
  } catch (error) {
    return { ok: false, errorCode: "output_unparseable", detail: error instanceof Error ? error.message : "The output could not be normalized." };
  }

  return {
    ok: true,
    outputSha256: sha256(bytes),
    normalizedOutputSha256,
    byteCount: bytes.length,
    pageCount
  };
}

/**
 * A fingerprint that ignores harmless metadata variance. The raw hash changes
 * whenever a timestamp does, so on its own it can neither prove a render is
 * unchanged nor catch a substituted document. This strips the metadata that
 * varies per run and hashes what is left, so the two hashes together tell the
 * difference between "same document, new run" and "different document".
 */
export async function computeNormalizedFingerprint(bytes: Buffer) {
  const document = await PDFDocument.load(bytes);
  const epoch = new Date(0);
  document.setCreationDate(epoch);
  document.setModificationDate(epoch);
  document.setProducer("");
  document.setCreator("");
  const normalized = await document.save({ useObjectStreams: false });
  return sha256(Buffer.from(normalized));
}

export function sha256(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Stable key order at every depth, so hashing does not depend on insertion order. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      if (source[key] === undefined) continue;
      result[key] = canonicalize(source[key]);
    }
    return result;
  }
  return value;
}

function requireValue(value: string, name: string) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) throw new RenderContractError("unknown_job", `${name} is required.`);
  return trimmed;
}
