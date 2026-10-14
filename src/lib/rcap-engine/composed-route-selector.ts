import "server-only";
import { GA_PARDON_ROUTE, GA_PARDON_SOURCE, GA_PARDON_FACT_IDS, georgiaPardonFacts } from "@/lib/rcap-engine/georgia-pardon-facts";

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
  /** Registry identity plus answers already evaluated on the server. Never a requested track. */
  georgiaPardonSource?: {
    profileVersion: string; sourceFingerprint: string; today: string;
    answers: Readonly<Record<string, unknown>>;
  };
};

/** Screening answers -> record class. Server-side, so the mapping is auditable. */
export function dispositionFromAnswers(answers: Record<string, unknown> | undefined): ComposedRouteDisposition {
  const outcome = typeof answers?.case_outcome === "string" ? answers.case_outcome : "";
  // Charge severity is not the final disposition: a felony charge can end in
  // a misdemeanor conviction or dismissal. Only an explicit final felony
  // conviction can reach a track restricted to that record class.
  switch (outcome.trim().toLowerCase()) {
    case "felony conviction": return "felony_conviction";
    case "misdemeanor conviction": return "other_conviction";
    case "pardoned conviction": return "other_conviction";
    case "arrest or citation with no charge filed":
    case "dismissed, no-billed, nolle prosequi, or not prosecuted":
    case "acquitted or found not guilty": return "non_conviction";
    // The shared program option says neither which order was entered nor how
    // it terminated. IL § 5.2(a)(1)(C), for example, treats successful and
    // unsuccessful supervision differently. Juvenile adjudication and the
    // combined other-conviction/adjudication answer are also not proof of an
    // adult conviction. Preserve uncertainty until those facts are supplied.
    default: return "unknown";
  }
}

/** LD-MS-01 separates admission from post-completion relief. The order and
 * actual closure, not an optional remedy label, identify these existing routes.
 * This selects a candidate only; all eligibility and commercial gates remain.
 */
export function mississippiProgramRouteFromAnswers(answers: Record<string, unknown>):
  | { status: "not_applicable" }
  | { status: "clarification"; missingQuestionIds: string[] }
  | { status: "selected"; pathwayId: string } {
  const program = answers.ms_program_order;
  const stage = answers.ms_program_record_status;
  const routes: Record<string, [string, string]> = {
    "99-15-26": ["nonadjudication-99-15-26-active-case-admission", "nonadjudication-under-99-15-26"],
    "99-15-101": ["pretrial-intervention-active-case-admission", "pretrial-intervention-or-diversion-expungement"],
    "41-29-150": ["controlled-substance-conditional-discharge-active-case-admission", "first-offense-controlled-substance-conditional-discharge-relief"]
  };
  if (program === undefined || program === "no_program_order") {
    return answers.case_outcome === "Diversion, deferred disposition, supervision, or similar program"
      ? { status: "clarification", missingQuestionIds: ["ms_program_order"] }
      : { status: "not_applicable" };
  }
  if (typeof program !== "string" || !Object.hasOwn(routes, program)) {
    return { status: "clarification", missingQuestionIds: ["ms_program_order"] };
  }
  // A conviction or revocation is not silently reclassified as successful
  // completion. The exact disposition/order needs clarification first.
  if (["Misdemeanor conviction", "Felony conviction", "Pardoned conviction"].includes(String(answers.case_outcome))) {
    return { status: "clarification", missingQuestionIds: ["case_outcome", "ms_program_record_status"] };
  }
  if (stage === "active") return { status: "selected", pathwayId: routes[program][0] };
  const finalDisposition = answers.ms_program_final_disposition;
  if (finalDisposition !== undefined) {
    const expected = program === "99-15-26" ? ["dismissed_and_closed"]
      : program === "99-15-101" ? ["dismissed_and_closed", "charges_dropped", "no_disposition"]
        : ["discharged_and_dismissed"];
    if (!expected.includes(String(finalDisposition))) {
      return { status: "clarification", missingQuestionIds: ["ms_program_final_disposition"] };
    }
  }
  if (stage === "completed_and_closed") return { status: "selected", pathwayId: routes[program][1] };
  // Section99-15-123(3) includes no disposition after completion. That is
  // distinct from a missing required dismissal under99-15-26 or41-29-150.
  // A generic "no closure" answer cannot establish which event occurred.
  if (program === "99-15-101" && stage === "completed_without_closure"
    && (finalDisposition === "no_disposition" || finalDisposition === "charges_dropped")) {
    return { status: "selected", pathwayId: routes[program][1] };
  }
  return { status: "clarification", missingQuestionIds: ["ms_program_record_status"] };
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

  if (jurisdiction === "GA" && pathwayId === GA_PARDON_ROUTE) {
    // GA.memo distinguishes ga-pardon-j7 from ga-seal-m despite their shared
    // historical pathway. Only explicit pardon-record intent and established
    // GA02 predicates identify this candidate. Selection grants no entitlement
    // or court balancing result; absent/uncertain facts keep their current hold.
    const source = input.georgiaPardonSource;
    if (!source || source.profileVersion !== "2026-06-19-source-conversion-1"
      || source.sourceFingerprint !== "2e9c9d5f9ad17fefb315d71b4336f0ffd2de6c1b614453cd06abd45f06cf2812"
      || GA_PARDON_SOURCE !== "GA-02:2026-10-13;GA.memo:ga-pardon-j7;OCGA35-3-37(j)(7)") return { status: "no_composed_route", trackId: null };
    const date = new Date(`${source.today}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source.today) || !Number.isFinite(date.getTime())
      || date.toISOString().slice(0, 10) !== source.today) return { status: "no_composed_route", trackId: null };
    const answers: Record<string, unknown> = {};
    for (const id of ["case_outcome", "pending_cases", "ga_record_help", ...GA_PARDON_FACT_IDS]) {
      const raw = source.answers[id];
      const wrapper = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
      answers[id] = wrapper ? wrapper.unknown === false ? wrapper.value : undefined : raw;
    }
    if (answers.ga_record_help !== "pardon_record") return { status: "no_composed_route", trackId: null };
    const decision = georgiaPardonFacts(answers, source.today);
    if (decision.status !== "review" || decision.ids.length
      || !["court_review", "court_review_traffic"].includes(decision.code)) return { status: "no_composed_route", trackId: null };
    return { status: "selected", trackId: "ga-pardon-j7" };
  }

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
