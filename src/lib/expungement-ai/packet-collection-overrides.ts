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

/**
 * Facts the accepted baseline already carried forward without asking.
 *
 * Only Mississippi's non-conviction route ever did this, and only for these
 * two: `offense_category`, which has no question of its own and is the
 * classification of the offense the participant already chose as the charge
 * level, and `sentence_completion_date`, which the profile defines as a
 * completion status and which carried only from an explicit "yes" to
 * everything the court ordered.
 *
 * This list is what lets the collection policy materialise a fact the
 * evaluator reads. Everything else the evaluator reads is asked, so the
 * authoritative re-evaluation only ever sees values the participant actually
 * gave and the route cannot drift. Adding an entry here changes what the
 * evaluator is fed and is a decision about routing, not about presentation.
 */
const BASELINE_CARRIED_FACT_IDS: Readonly<Record<string, readonly string[]>> = {
  "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal": [
    "offense_category",
    "sentence_completion_date"
  ]
};

export function baselineCarriedFactIds(routeKey: string): ReadonlySet<string> {
  return new Set(BASELINE_CARRIED_FACT_IDS[routeKey] ?? []);
}
