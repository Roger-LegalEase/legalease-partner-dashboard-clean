import type { RouteCollectionOverride } from "@/lib/expungement-ai/packet-collection";

/**
 * Per-route corrections to the generic collection policy.
 *
 * The generic policy reads authority that already exists — the specification's
 * `fieldOwnership` and per-fact `use` statements, the evaluator's route-
 * relevant facts, each route's own safety gate — and that is deliberately
 * where nearly all of the classification comes from. Hand-authoring a
 * questionnaire per route is exactly the failure this correction exists to
 * undo, so an override is a last resort and each one carries the reason it
 * could not be generic.
 *
 * An override may MOVE a fact between classes, name the fact a condition
 * depends on, place a fact in a different section, or hand a fact to a human
 * to classify. There is deliberately no shape here that can remove a fact:
 * every required fact keeps a disposition whatever an override says.
 */
const OVERRIDES: ReadonlyArray<RouteCollectionOverride> = [
  // No route currently needs one. The generic policy classifies every required
  // fact of every route with a packet plan; `packet-collection-audit.json`
  // reports zero unresolved facts, and that report is a release control.
];

const BY_ROUTE_KEY = new Map(OVERRIDES.map((override) => [override.routeKey, override]));

export function routeCollectionOverrideFor(routeKey: string): RouteCollectionOverride | null {
  return BY_ROUTE_KEY.get(routeKey) ?? null;
}

export function routeCollectionOverrideKeys(): string[] {
  return [...BY_ROUTE_KEY.keys()].sort();
}
