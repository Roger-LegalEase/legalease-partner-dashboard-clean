// Exact resolution from a request to the official source template and mapping.
//
// This module replaces a resolver that named four states and returned the
// Mississippi template for everything else. Every failure path here is typed
// and explicit; there is no default branch and no fallback of any kind, so an
// unsupported jurisdiction cannot receive another jurisdiction's court form.

import {
  approvedAssets,
  canonicalCountyKey,
  canonicalJurisdictionCode,
  resolveEffectiveStatus,
  type JurisdictionPacketCapability,
  type PacketAssetBinding,
  type PacketCapabilityStatus
} from "@/lib/rcap/jurisdictions/packet-capability";

export type PacketResolutionFailureReason =
  /** The jurisdiction is not one of the 50 states plus DC. */
  | "unknown_jurisdiction"
  /** Recognized, but its capability does not permit producing a document. */
  | "jurisdiction_not_packet_ready"
  /** County-scoped support and the request named no supported county. */
  | "county_not_supported"
  /** Ready jurisdiction, but no binding for the requested remedy or form. */
  | "remedy_not_supported"
  /** A binding exists but its mapping has not been approved for live use. */
  | "mapping_not_approved";

export class JurisdictionNotPacketReadyError extends Error {
  readonly code = "jurisdiction_not_packet_ready" as const;

  constructor(
    readonly reason: PacketResolutionFailureReason,
    /** Safe for logs and API responses: identifiers only, never participant data. */
    readonly detail: {
      jurisdiction: string | null;
      county: string | null;
      remedyId: string | null;
      status: PacketCapabilityStatus | null;
    },
    message: string
  ) {
    super(message);
    this.name = "JurisdictionNotPacketReadyError";
  }
}

export type ResolvedPacketAsset = {
  readonly jurisdiction: string;
  readonly jurisdictionName: string;
  readonly county: string | null;
  readonly countyName: string | null;
  readonly remedyId: string;
  readonly formId: string;
  readonly sourceTemplatePath: string;
  readonly mappingPath: string;
};

export type PacketAssetRequest = {
  jurisdiction: string | null | undefined;
  county?: string | null;
  /** Remedy identity. Omit only when a jurisdiction has exactly one binding. */
  remedyId?: string | null;
  /** Optional narrowing when a remedy maps to more than one form. */
  formId?: string | null;
};

/**
 * Resolves a request to exactly one official source template and mapping.
 *
 * Throws {@link JurisdictionNotPacketReadyError} on every path that cannot be
 * satisfied. Callers should surface `reason` rather than substituting anything.
 */
export function resolvePacketAsset(
  request: PacketAssetRequest
): ResolvedPacketAsset {
  const code = canonicalJurisdictionCode(request.jurisdiction);
  const countyKey = canonicalCountyKey(request.county);
  const remedyId = normalizeIdentifier(request.remedyId);
  const formId = normalizeIdentifier(request.formId);

  if (!code) {
    throw new JurisdictionNotPacketReadyError(
      "unknown_jurisdiction",
      { jurisdiction: null, county: countyKey, remedyId, status: null },
      "The requested jurisdiction is not recognized."
    );
  }

  const { capability, county, status } = resolveEffectiveStatus({
    jurisdiction: code,
    county: request.county
  });

  // canonicalJurisdictionCode succeeded, so the registry has this jurisdiction.
  const resolved = capability as JurisdictionPacketCapability;

  if (resolved.countyScoped && !county) {
    throw new JurisdictionNotPacketReadyError(
      "county_not_supported",
      { jurisdiction: code, county: countyKey, remedyId, status },
      `${resolved.name} supports document packets only in specific counties.`
    );
  }

  if (status !== "packet_ready") {
    throw new JurisdictionNotPacketReadyError(
      "jurisdiction_not_packet_ready",
      { jurisdiction: code, county: countyKey, remedyId, status },
      `${resolved.name} is not currently able to produce a document packet.`
    );
  }

  const available = approvedAssets({ jurisdiction: code, county: request.county });

  if (available.length === 0) {
    throw new JurisdictionNotPacketReadyError(
      "mapping_not_approved",
      { jurisdiction: code, county: countyKey, remedyId, status },
      `${resolved.name} has no approved document mapping.`
    );
  }

  const matches = available.filter(
    (asset) =>
      (!remedyId || asset.remedyId === remedyId) &&
      (!formId || asset.formId === formId)
  );

  if (matches.length !== 1) {
    throw new JurisdictionNotPacketReadyError(
      "remedy_not_supported",
      { jurisdiction: code, county: countyKey, remedyId, status },
      matches.length === 0
        ? `${resolved.name} has no approved document for the requested remedy.`
        : `The request matched more than one ${resolved.name} document and must name a form.`
    );
  }

  return describe(resolved, county?.countyKey ?? null, county?.countyName ?? null, matches[0]!);
}

/**
 * Non-throwing form for surfaces that need to branch rather than fail, such as
 * deciding whether to offer a download action at all.
 */
export function tryResolvePacketAsset(
  request: PacketAssetRequest
):
  | { ok: true; asset: ResolvedPacketAsset }
  | { ok: false; reason: PacketResolutionFailureReason; message: string } {
  try {
    return { ok: true, asset: resolvePacketAsset(request) };
  } catch (error) {
    if (error instanceof JurisdictionNotPacketReadyError) {
      return { ok: false, reason: error.reason, message: error.message };
    }
    throw error;
  }
}

function describe(
  capability: JurisdictionPacketCapability,
  countyKey: string | null,
  countyName: string | null,
  asset: PacketAssetBinding
): ResolvedPacketAsset {
  return {
    jurisdiction: capability.code,
    jurisdictionName: capability.name,
    county: countyKey,
    countyName,
    remedyId: asset.remedyId,
    formId: asset.formId,
    sourceTemplatePath: asset.sourceTemplatePath,
    mappingPath: asset.mappingPath
  };
}

function normalizeIdentifier(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}
