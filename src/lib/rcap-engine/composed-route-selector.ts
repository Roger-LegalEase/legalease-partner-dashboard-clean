import "server-only";

/**
 * The single authority on which composed-route track a screening evaluation is
 * running against.
 *
 * There is exactly one reason this module exists: a composed route's track id
 * decides whether payment opens, and a participant must not be able to name it.
 * Every caller that needs a track id calls here; nobody reads one off a request
 * body, a URL, a display label, or a jurisdiction code.
 *
 * Only exact evidence-backed pathway/track pairs appear below. Routes without
 * a mapped identity remain unselected; client input cannot fill that gap.
 */

export type ComposedRouteSelection =
  | { status: "no_composed_route"; trackId: null }
  | { status: "identity_unavailable"; trackId: null; reason: string }
  | { status: "selected"; trackId: string };

export type ComposedRouteSelectorInput = {
  jurisdiction: string;
  pathwayId?: string | null;
};

/**
 * Evidence-backed jurisdiction+pathway to composed-route mappings.
 *
 * A row is added only when a compiled pathway is proven to be
 * the same legal route as the composed track — reviewed, not inferred. Until
 * then the route is unavailable, and an unavailable route sells nothing.
 */
const AUTHORITATIVE_TRACK_BY_PATHWAY: ReadonlyMap<string, string> = new Map([
  // Exact owner-approved route/track crosswalk; never derived from client fields.
  ["MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal", "ms-nonconv"]
]);

export function selectComposedRoute(input: ComposedRouteSelectorInput): ComposedRouteSelection {
  const jurisdiction = String(input.jurisdiction ?? "").trim().toUpperCase();
  const pathwayId = String(input.pathwayId ?? "").trim();
  if (!jurisdiction || !pathwayId) return { status: "no_composed_route", trackId: null };

  const trackId = AUTHORITATIVE_TRACK_BY_PATHWAY.get(`${jurisdiction}:${pathwayId}`);
  if (!trackId) return { status: "no_composed_route", trackId: null };
  if (trackId.trim().length === 0) {
    return { status: "identity_unavailable", trackId: null, reason: "mapped_track_id_is_empty" };
  }
  return { status: "selected", trackId };
}

/** Request-body keys a client is never permitted to supply. */
export const FORBIDDEN_CLIENT_ROUTE_IDENTITY_FIELDS = [
  "selectedTrackId",
  "treatmentClassification",
  "deferralComponentIds",
  "participantTreatment",
  "componentTreatments"
] as const;

/** True when a client body attempts to assert route or treatment identity. */
export function forbiddenRouteIdentityFields(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const record = body as Record<string, unknown>;
  return FORBIDDEN_CLIENT_ROUTE_IDENTITY_FIELDS.filter((field) => field in record);
}
