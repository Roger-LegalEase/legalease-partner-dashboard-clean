// Shared resolution contract.
//
// Resolves a participant to exactly one relief track and its packet set, or
// fails closed with a typed reason. There is no default jurisdiction, default
// track, default county, default form, default source, and no fallback to
// another jurisdiction under any name.

import { RELIEF_TRACKS } from "@/lib/rcap/packets/registry";
import {
  computeRuntimeStatus,
  describeOutcome,
  type PacketComponent,
  type ReliefTrack,
  type RuntimeStatus
} from "@/lib/rcap/packets/types";
import { canonicalCountyKey, canonicalJurisdictionCode } from "@/lib/rcap/jurisdictions/packet-capability";

export type ResolutionFailureReason =
  | "unknown_jurisdiction"
  | "unknown_relief_track"
  | "record_type_not_supported"
  | "disposition_not_supported"
  | "court_level_not_supported"
  | "geography_required"
  | "geography_not_supported"
  | "track_not_runtime_enabled"
  | "missing_required_input";

export class PacketResolutionError extends Error {
  readonly code = "packet_resolution_failed" as const;

  constructor(
    readonly reason: ResolutionFailureReason,
    /** Identifiers only. Never a participant value. */
    readonly detail: {
      jurisdiction: string | null;
      trackId: string | null;
      geography: string | null;
      runtimeStatus: RuntimeStatus | null;
      missingInputs?: readonly string[];
    },
    message: string
  ) {
    super(message);
    this.name = "PacketResolutionError";
  }
}

export type PacketResolutionRequest = {
  jurisdiction: string | null | undefined;
  trackId?: string | null;
  recordType?: string | null;
  disposition?: string | null;
  courtLevel?: string | null;
  /** County, circuit, district, court or agency key. */
  geography?: string | null;
  /** Participant facts, used for conditional packet components. */
  facts?: Record<string, unknown>;
  /**
   * Permits resolving a non-production technical fixture. Refused outside an
   * explicitly enabled non-production environment.
   */
  allowTechnicalFixtures?: boolean;
};

export type ResolvedPacket = {
  track: ReliefTrack;
  outputStrategy: ReliefTrack["outputStrategy"];
  runtimeStatus: RuntimeStatus;
  packetSetId: string;
  packetSetVersion: string;
  /** Only the components that actually apply to this request, in order. */
  components: readonly PacketComponent[];
  requiredInputs: readonly ReliefTrack["requiredInputs"][number][];
  geographicRestrictions: {
    scope: ReliefTrack["geographicScope"];
    servesGeographyKeys: readonly string[];
    resolvedGeography: string | null;
  };
  statuses: ReliefTrack["statuses"];
  sourceReferences: readonly { componentId: string; sourcePath: string; sourceSha256: string }[];
  customerDeliverableDescription: string;
  isFilingPacket: boolean;
};

/** True only when technical fixtures may be resolved at all. */
export function technicalFixturesEnabled(
  environment: Readonly<Record<string, string | undefined>> = process.env
): boolean {
  return (
    environment.NODE_ENV !== "production" &&
    environment.RCAP_TECHNICAL_FIXTURES_ENABLED?.trim().toLowerCase() === "true"
  );
}

export function resolvePacket(request: PacketResolutionRequest): ResolvedPacket {
  const jurisdiction = canonicalJurisdictionCode(request.jurisdiction);
  const geography = canonicalCountyKey(request.geography);

  if (!jurisdiction) {
    throw new PacketResolutionError(
      "unknown_jurisdiction",
      { jurisdiction: null, trackId: null, geography, runtimeStatus: null },
      "The requested jurisdiction is not recognized."
    );
  }

  const trackId = typeof request.trackId === "string" ? request.trackId.trim() : "";
  const candidates = RELIEF_TRACKS.filter((track) => track.jurisdiction === jurisdiction);
  const track = trackId ? candidates.find((entry) => entry.trackId === trackId) : undefined;

  if (!track) {
    throw new PacketResolutionError(
      "unknown_relief_track",
      { jurisdiction, trackId: trackId || null, geography, runtimeStatus: null },
      trackId
        ? `No relief track ${trackId} is defined for ${jurisdiction}.`
        : `No relief track was named, and ${jurisdiction} has no resolvable default. A relief track must be named explicitly.`
    );
  }

  // A fixture is never resolvable unless fixtures are explicitly enabled in a
  // non-production environment AND the caller opted in.
  if (track.technicalFixture && !(request.allowTechnicalFixtures && technicalFixturesEnabled())) {
    throw new PacketResolutionError(
      "track_not_runtime_enabled",
      { jurisdiction, trackId: track.trackId, geography, runtimeStatus: track.statuses.runtime },
      "This relief track is a non-production technical fixture and is not available."
    );
  }

  if (request.recordType && !track.recordTypes.includes(request.recordType)) {
    throw new PacketResolutionError(
      "record_type_not_supported",
      { jurisdiction, trackId: track.trackId, geography, runtimeStatus: track.statuses.runtime },
      "This relief track does not support the requested record type."
    );
  }

  if (request.disposition && !track.dispositions.includes(request.disposition)) {
    throw new PacketResolutionError(
      "disposition_not_supported",
      { jurisdiction, trackId: track.trackId, geography, runtimeStatus: track.statuses.runtime },
      "This relief track does not support the requested disposition."
    );
  }

  if (request.courtLevel && request.courtLevel !== track.courtLevel) {
    throw new PacketResolutionError(
      "court_level_not_supported",
      { jurisdiction, trackId: track.trackId, geography, runtimeStatus: track.statuses.runtime },
      "This relief track does not serve the requested court level."
    );
  }

  // Geography. A track tied to a place must be given a place it actually
  // serves; it never widens to cover the rest of the jurisdiction.
  //
  // `agency_specific` is deliberately excluded: its scope is an agency, not a
  // court geography, so requiring a county would reject every valid request.
  const PLACE_SCOPED = ["county", "circuit", "district", "court_specific"] as const;
  if ((PLACE_SCOPED as readonly string[]).includes(track.geographicScope)) {
    if (!geography) {
      throw new PacketResolutionError(
        "geography_required",
        { jurisdiction, trackId: track.trackId, geography: null, runtimeStatus: track.statuses.runtime },
        "This relief track is not statewide and requires a specific geography."
      );
    }
    if (!track.geographyKeys.includes(geography)) {
      throw new PacketResolutionError(
        "geography_not_supported",
        { jurisdiction, trackId: track.trackId, geography, runtimeStatus: track.statuses.runtime },
        "This relief track does not serve the requested geography."
      );
    }
  }

  const facts = request.facts ?? {};
  const missingInputs = track.requiredInputs
    .filter((input) => input.required)
    .filter((input) => {
      const value = facts[input.key];
      return value === undefined || value === null || String(value).trim() === "";
    })
    .map((input) => input.key);

  if (missingInputs.length > 0) {
    throw new PacketResolutionError(
      "missing_required_input",
      { jurisdiction, trackId: track.trackId, geography, runtimeStatus: track.statuses.runtime, missingInputs },
      "Required information is missing for this relief track."
    );
  }

  // Recomputed rather than read, so an expiry or source change withdraws
  // readiness without anyone remembering to update a stored field.
  const runtimeStatus = computeRuntimeStatus({
    statuses: track.statuses,
    sourceCurrent: track.sourceCurrent,
    runtimeDisabled: track.runtimeDisabled,
    outputStrategy: track.outputStrategy
  });

  const components = [...track.packetSet.components]
    .filter((component) => {
      if (component.requirement === "required") return true;
      if (!component.conditionKey) return false;
      return Boolean(facts[component.conditionKey]);
    })
    .sort((left, right) => left.order - right.order);

  const sourceReferences = components
    .filter((component) => component.sourcePath && component.sourceSha256)
    .map((component) => ({
      componentId: component.componentId,
      sourcePath: component.sourcePath as string,
      sourceSha256: component.sourceSha256 as string
    }));

  return {
    track,
    outputStrategy: track.outputStrategy,
    runtimeStatus,
    packetSetId: track.packetSet.packetSetId,
    packetSetVersion: track.packetSet.version,
    components,
    requiredInputs: track.requiredInputs,
    geographicRestrictions: {
      scope: track.geographicScope,
      servesGeographyKeys: track.geographyKeys,
      resolvedGeography: geography
    },
    statuses: { ...track.statuses, runtime: runtimeStatus },
    sourceReferences,
    customerDeliverableDescription: track.customerDeliverableDescription,
    isFilingPacket: track.outputStrategy !== "process_guidance"
  };
}

export function tryResolvePacket(
  request: PacketResolutionRequest
): { ok: true; resolved: ResolvedPacket } | { ok: false; reason: ResolutionFailureReason; message: string } {
  try {
    return { ok: true, resolved: resolvePacket(request) };
  } catch (error) {
    if (error instanceof PacketResolutionError) {
      return { ok: false, reason: error.reason, message: error.message };
    }
    throw error;
  }
}

export { describeOutcome };
