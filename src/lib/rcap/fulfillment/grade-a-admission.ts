import "server-only";

import fs from "node:fs";
import path from "node:path";

import {
  COMPLETE_PACKET_PROVEN,
  admitCommercialAction,
  evaluateFulfillmentAuthority,
  routeIdFor,
  sanitizeAdmissionRequest,
  type AdmissionRequestIdentity,
  type CommercialAdmissionDecision,
  type CommercialAdmissionPoint,
  type FulfillmentAuthorityDecision,
  type FulfillmentObservation
} from "@/lib/rcap/fulfillment/grade-a-authority";
import {
  getCurrentFulfillmentRecord,
  listCurrentFulfillmentRecords
} from "@/lib/rcap/fulfillment/grade-a-registry";

/**
 * The interface every commercial admission point consumes.
 *
 * This is the whole public surface. A caller passes a route identity and the
 * admission it wants to make; it gets back an admitted/denied decision and the
 * authority that produced it. There is no second entry point, no "quick check",
 * and no boolean a caller may pass in — a consumer of this module cannot express
 * a claim about the route, only a question about it.
 *
 * Consumer and sponsored paths call the same function. That is not a
 * convenience: the whole reason a sponsored packet is safe is that it is admitted
 * by the same proof a paid one is, and a separate sponsored code path would be a
 * separate rule the moment either changed.
 */

const OBSERVATION_PATH = "data/rcap-grade-a/fulfillment-observation-snapshot.json";

type ObservationDocument = {
  schemaVersion?: unknown;
  observedAt?: unknown;
  routes?: Record<string, FulfillmentObservation>;
};

let cachedObservations: Map<string, FulfillmentObservation> | null = null;

/**
 * The server's view of the current world, per route.
 *
 * It is generated from the repository's own evidence by
 * `scripts/generate-rcap-grade-a-fulfillment-authority.mjs`, never assembled
 * from a request. A route with no observation gets null, and a null observation
 * closes authority — which is the correct answer, because "we cannot see the
 * current world" and "the world is unchanged" are not the same statement.
 */
export function resolveObservation(routeId: string): FulfillmentObservation | null {
  if (!cachedObservations) {
    cachedObservations = new Map();
    try {
      const raw = fs.readFileSync(path.join(process.cwd(), OBSERVATION_PATH), "utf8");
      const parsed = JSON.parse(raw) as ObservationDocument;
      const routes = parsed?.routes;
      if (routes && typeof routes === "object" && !Array.isArray(routes)) {
        for (const [key, value] of Object.entries(routes)) {
          if (value && typeof value === "object") cachedObservations.set(key, value);
        }
      }
    } catch {
      // Fail closed: an unreadable snapshot observes nothing, so every route is
      // STALE rather than assumed current.
      cachedObservations = new Map();
    }
  }
  return cachedObservations.get(routeId) ?? null;
}

/** Test-only: drop the process cache so a verifier can reload after a fixture write. */
export function resetObservationCache(): void {
  cachedObservations = null;
}

/**
 * Server-side authority for a route. This is the function that answers "is this
 * route commercially eligible", and it is the only one.
 */
export function fulfillmentAuthorityFor(routeId: string): FulfillmentAuthorityDecision {
  return evaluateFulfillmentAuthority(getCurrentFulfillmentRecord(routeId), resolveObservation(routeId), routeId);
}

export function fulfillmentAuthorityForRoute(jurisdiction: string, pathwayId: string): FulfillmentAuthorityDecision {
  return fulfillmentAuthorityFor(routeIdFor(jurisdiction, pathwayId));
}

/**
 * Admit — or refuse — one commercial action.
 *
 * Call this at the top of every admission point, before any provider is
 * dispatched, any session is opened, any credit is decremented and any artifact
 * is marked deliverable. A denial carries a `denialCode` a route can map to its
 * own typed refusal.
 */
export function admitCommercial(
  admissionPoint: CommercialAdmissionPoint,
  request: AdmissionRequestIdentity
): CommercialAdmissionDecision {
  return admitCommercialAction({
    admissionPoint,
    request,
    record: getCurrentFulfillmentRecord(request.routeId),
    observation: resolveObservation(request.routeId)
  });
}

export type UntrustedAdmissionOutcome =
  | { ok: true; decision: CommercialAdmissionDecision }
  | { ok: false; denialCode: "client_supplied_authority" | "route_identity_required"; rejectedKeys: string[]; reason: string };

/**
 * Admit a commercial action from an untrusted request body.
 *
 * A body carrying any authority-bearing key is refused outright rather than
 * sanitised and honoured. Silently dropping the key would be safe for this
 * request and useless for the next one: refusing makes the attempt visible at
 * the point it happens.
 */
export function admitCommercialFromUntrustedBody(
  admissionPoint: CommercialAdmissionPoint,
  body: unknown
): UntrustedAdmissionOutcome {
  const sanitized = sanitizeAdmissionRequest(body);

  if (sanitized.rejectedKeys.length > 0) {
    return {
      ok: false,
      denialCode: "client_supplied_authority",
      rejectedKeys: sanitized.rejectedKeys,
      reason: `A request may name a route; it may not assert authority over it. Rejected: ${sanitized.rejectedKeys.join(", ")}.`
    };
  }

  if (!sanitized.identity) {
    return {
      ok: false,
      denialCode: "route_identity_required",
      rejectedKeys: [],
      reason: "A routeId and jurisdiction are required to ask about a route."
    };
  }

  return { ok: true, decision: admitCommercial(admissionPoint, sanitized.identity) };
}

/**
 * The generated commercial projection: every route this authority currently
 * proves. It is derived, never authored — a route appears here because its
 * record proves it, and removing it from here does not remove the proof.
 */
export function provenCommercialRoutes(): readonly string[] {
  return Object.freeze(
    listCurrentFulfillmentRecords()
      .filter((record) => evaluateFulfillmentAuthority(record, resolveObservation(record.routeId), record.routeId).state === COMPLETE_PACKET_PROVEN)
      .map((record) => record.routeId)
      .sort()
  );
}

export const GRADE_A_OBSERVATION_PATH = OBSERVATION_PATH;
