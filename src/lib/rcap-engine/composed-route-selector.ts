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
  | { status: "route_conditions_unmet"; trackId: null; reason: string }
  | { status: "selected"; trackId: string };

/**
 * The record classes a mapped track may require.
 *
 * Derived here from the screening answers the server already evaluated, never
 * read as a track name. A participant can say what happened to their case; they
 * still cannot say which composed route that makes them eligible for.
 */
export type ComposedRouteDisposition = "felony_conviction" | "other_conviction" | "non_conviction" | "unknown";

export type ComposedRouteSelectorInput = {
  jurisdiction: string;
  pathwayId?: string | null;
  /** Server-derived from the evaluated answers. Never accepted from a client. */
  disposition?: ComposedRouteDisposition;
};

/** Screening answers -> record class. Server-side, so the mapping is auditable. */
export function dispositionFromAnswers(answers: Record<string, unknown> | undefined): ComposedRouteDisposition {
  const outcome = typeof answers?.case_outcome === "string" ? answers.case_outcome : "";
  const level = typeof answers?.offense_level === "string" ? answers.offense_level : "";
  if (!outcome) return "unknown";
  const convicted = /conviction|adjudication/i.test(outcome) && !/no-billed|nolle|dismiss|acquit|not prosecuted|no charge/i.test(outcome);
  if (!convicted) return "non_conviction";
  return /^felony$/i.test(level.trim()) ? "felony_conviction" : "other_conviction";
}

/**
 * Evidence-backed jurisdiction+pathway to composed-route mappings.
 *
 * A row is added only when a compiled pathway is proven to be
 * the same legal route as the composed track — reviewed, not inferred. Until
 * then the route is unavailable, and an unavailable route sells nothing.
 */
type AuthoritativeTrack = {
  trackId: string;
  /** Empty means the track applies to the pathway on any record class. */
  requiresDisposition?: readonly ComposedRouteDisposition[];
  /** Why the track is narrower than the compiled pathway, when it is. */
  narrowerThanPathwayBecause?: string;
};

const AUTHORITATIVE_TRACK_BY_PATHWAY: ReadonlyMap<string, AuthoritativeTrack> = new Map([
  // Exact owner-approved route/track crosswalk; never derived from client fields.
  ["MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal", { trackId: "ms-nonconv" }],

  // Illinois 20 ILCS 2630/5.2(j). The compiled pathway is deliberately broader
  // than this track: its own summary is "automatic sealing AND/OR motion to
  // vacate and expunge", and the adopted memo carries both mechanisms as
  // separate tracks. Only one of them is something a participant files.
  //
  //   il-prostitution-j-auto   statutory automatic sealing by the Illinois State
  //                            Police and circuit clerks, to be completed by
  //                            2028. There is no petition for a participant to
  //                            file, so it sells nothing and is guidance.
  //   il-prostitution-j-vacate the motion to vacate and expunge, filed by the
  //                            participant with the circuit court. This one.
  //
  // The adopted record grade-a-il-felony-prostitution-relief-v1 binds this exact
  // route to this exact track and family, and that record is conviction-only on
  // its face: eligibleRecordTypes ["conviction"], eligibleDispositions
  // ["class_4_felony_prostitution_conviction"], required facts that are all
  // conviction facts, and a first verification requirement reading "the record
  // itself clearly shows a Class 4 felony prostitution conviction". A dismissal
  // is therefore not this route, and mapping it here unconditionally would sell
  // a vacatur motion to someone with nothing to vacate.
  ["IL:felony-prostitution-relief", {
    trackId: "il-prostitution-j-vacate",
    requiresDisposition: ["felony_conviction"],
    narrowerThanPathwayBecause:
      "20 ILCS 2630/5.2(j)(3) vacatur applies to a Class 4 felony prostitution conviction; "
      + "a non-conviction record falls to the automatic-sealing branch, which no participant files"
  }]
]);

export function selectComposedRoute(input: ComposedRouteSelectorInput): ComposedRouteSelection {
  const jurisdiction = String(input.jurisdiction ?? "").trim().toUpperCase();
  const pathwayId = String(input.pathwayId ?? "").trim();
  if (!jurisdiction || !pathwayId) return { status: "no_composed_route", trackId: null };

  const mapped = AUTHORITATIVE_TRACK_BY_PATHWAY.get(`${jurisdiction}:${pathwayId}`);
  if (!mapped) return { status: "no_composed_route", trackId: null };
  if (mapped.trackId.trim().length === 0) {
    return { status: "identity_unavailable", trackId: null, reason: "mapped_track_id_is_empty" };
  }
  // A mapped track whose record class does not match is not this participant's
  // route. That is a refusal, not a fallback to some other track: nothing is
  // selected and payment stays closed.
  if (mapped.requiresDisposition?.length) {
    const disposition = input.disposition ?? "unknown";
    if (!mapped.requiresDisposition.includes(disposition)) {
      return {
        status: "route_conditions_unmet",
        trackId: null,
        reason: mapped.narrowerThanPathwayBecause ?? "the mapped track does not cover this record class"
      };
    }
  }
  return { status: "selected", trackId: mapped.trackId };
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
