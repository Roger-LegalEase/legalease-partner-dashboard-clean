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
  // Exact reviewed render consumers. Unscoped rule references remain protected
  // from cross-fact materialization; these records establish collection purpose
  // without adding an eligibility predicate or removing a required fact.
  {
    routeKey: "GA:sb-288-misdemeanor-conviction-restriction-and-sealing",
    classes: {"county": "render_required"},
    note: "GA-14 reviewed participant packet input; render/venue ownership, not an added eligibility predicate. Original unscoped references exclusion-29 retain materialization protection. Source: data/record-clearing/packet-specifications/GA-sb-288-misdemeanor-conviction-restriction-and-sealing.v1.json/requiredFacts/6; data/record-clearing/legal-design-intake/GA.memo.json/tracks/3/participantInputs/0; data/record-clearing/legal-design-intake/GA.memo.json/tracks/4/participantInputs/0; data/record-clearing/legal-design-intake/GA.memo.json/tracks/4/participantInputs/1"
  },
  {
    routeKey: "GA:restriction-and-sealing-of-a-pardoned-felony",
    classes: {"county": "render_required"},
    note: "GA-14 reviewed participant packet input; render/venue ownership, not an added eligibility predicate. Original unscoped references exclusion-29 retain materialization protection. Source: data/record-clearing/packet-specifications/GA-restriction-and-sealing-of-a-pardoned-felony.v1.json/requiredFacts/6; data/record-clearing/legal-design-intake/GA.memo.json/tracks/5/participantInputs/0; data/record-clearing/legal-design-intake/GA.memo.json/tracks/4/participantInputs/0; data/record-clearing/legal-design-intake/GA.memo.json/tracks/4/participantInputs/1"
  },
  {
    routeKey: "MO:general-arrest-charge-plea-trial-or-conviction-expungement-under-rsmo-610-140",
    classes: {"court": "render_required"},
    note: "GA-14 reviewed participant packet input; render/venue ownership, not an added eligibility predicate. Original unscoped references exclusion-22, wait-04, wait-05 retain materialization protection. Source: data/record-clearing/legal-design-intake/MO.memo.json/tracks/0/participantInputs/5"
  },
  {
    routeKey: "MO:first-intoxication-related-traffic-or-boating-expungement-under-610-130",
    classes: {"court": "render_required"},
    note: "GA-14 reviewed participant packet input; render/venue ownership, not an added eligibility predicate. Original unscoped references exclusion-22, wait-04, wait-05 retain materialization protection. Source: data/record-clearing/legal-design-intake/MO.memo.json/tracks/4/participantInputs/6"
  },
  {
    routeKey: "MO:stolen-or-mistaken-identity-expungement-under-610-145",
    classes: {"court": "render_required"},
    note: "GA-14 reviewed participant packet input; render/venue ownership, not an added eligibility predicate. Original unscoped references exclusion-22, wait-04, wait-05 retain materialization protection. Source: data/record-clearing/legal-design-intake/MO.memo.json/tracks/6/participantInputs/11"
  },
  {
    routeKey: "MO:first-minor-in-possession-alcohol-expungement-under-311-326",
    classes: {"court": "render_required"},
    note: "GA-14 reviewed participant packet input; render/venue ownership, not an added eligibility predicate. Original unscoped references exclusion-22, wait-04, wait-05 retain materialization protection. Source: data/record-clearing/legal-design-intake/MO.memo.json/tracks/8/participantInputs/5"
  },
  {
    routeKey: "OH:adult-conviction-sealing-or-expungement-under-ohio-rev-code-2953-32",
    classes: {"court": "render_required"},
    note: "GA-14 reviewed participant packet input; render/venue ownership, not an added eligibility predicate. Original unscoped references exclusion-01, exclusion-03, exclusion-04, wait-10, wait-11, wait-13 retain materialization protection. Source: data/record-clearing/legal-design-intake/OH.memo.json/tracks/3/participantInputs/2"
  },
  {
    routeKey: "OH:adult-non-conviction-sealing-or-expungement-under-2953-33",
    classes: {"court": "render_required"},
    note: "GA-14 reviewed participant packet input; render/venue ownership, not an added eligibility predicate. Original unscoped references exclusion-01, exclusion-03, exclusion-04, wait-10, wait-11, wait-13 retain materialization protection. Source: data/record-clearing/legal-design-intake/OH.memo.json/tracks/0/participantInputs/2"
  },
  {
    routeKey: "OH:marijuana-hashish-possession-expungement-under-2953-321",
    classes: {"court": "render_required"},
    note: "GA-14 reviewed participant packet input; render/venue ownership, not an added eligibility predicate. Original unscoped references exclusion-01, exclusion-03, exclusion-04, wait-10, wait-11, wait-13 retain materialization protection. Source: data/record-clearing/legal-design-intake/OH.memo.json/tracks/1/participantInputs/2"
  },
  {
    routeKey: "OH:certain-firearm-carry-conviction-expungement-under-2953-35",
    classes: {"court": "render_required"},
    note: "GA-14 reviewed participant packet input; render/venue ownership, not an added eligibility predicate. Original unscoped references exclusion-01, exclusion-03, exclusion-04, wait-10, wait-11, wait-13 retain materialization protection. Source: data/record-clearing/legal-design-intake/OH.memo.json/tracks/4/participantInputs/2"
  },
  {
    routeKey: "TX:expunction-after-acquittal-not-guilty-disposition-chapter-55a",
    classes: {"arrest_date": "render_required"},
    note: "GA-14 reviewed participant packet input; render/venue ownership, not an added eligibility predicate. Original unscoped references rule-56-for-arrest-only-expunctions-compute-from-the-arrest-dat, wait-15, wait-21 retain materialization protection. Source: data/record-clearing/legal-design-intake/TX.memo.json/tracks/3/participantInputs/1"
  },
  {
    routeKey: "TX:expunction-for-arrest-with-no-charge-filed-after-the-limitations-period",
    classes: {"arrest_date": "render_required"},
    note: "GA-14 reviewed participant packet input; render/venue ownership, not an added eligibility predicate. Original unscoped references rule-56-for-arrest-only-expunctions-compute-from-the-arrest-dat, wait-15, wait-21 retain materialization protection. Source: data/record-clearing/legal-design-intake/TX.memo.json/tracks/2/participantInputs/1; data/record-clearing/legal-design-intake/TX.memo.json/tracks/0/participantInputs/1"
  },
  {
    routeKey: "TX:expunction-after-qualifying-dismissal-or-quash",
    classes: {"arrest_date": "render_required"},
    note: "GA-14 reviewed participant packet input; render/venue ownership, not an added eligibility predicate. Original unscoped references rule-56-for-arrest-only-expunctions-compute-from-the-arrest-dat, wait-15, wait-21 retain materialization protection. Source: data/record-clearing/legal-design-intake/TX.memo.json/tracks/1/participantInputs/1"
  },
  {
    routeKey: "TX:expunction-after-pardon-or-actual-innocence-relief",
    classes: {"arrest_date": "render_required"},
    note: "GA-14 reviewed participant packet input; render/venue ownership, not an added eligibility predicate. Original unscoped references rule-56-for-arrest-only-expunctions-compute-from-the-arrest-dat, wait-15, wait-21 retain materialization protection. Source: data/record-clearing/legal-design-intake/TX.memo.json/tracks/4/participantInputs/1; data/record-clearing/legal-design-intake/TX.memo.json/tracks/5/participantInputs/1"
  },
  {
    routeKey: "TX:expunction-after-qualifying-class-c-deferred-disposition",
    classes: {"arrest_date": "render_required"},
    note: "GA-14 reviewed participant packet input; render/venue ownership, not an added eligibility predicate. Original unscoped references rule-56-for-arrest-only-expunctions-compute-from-the-arrest-dat, wait-15, wait-21 retain materialization protection. Source: data/record-clearing/legal-design-intake/TX.memo.json/tracks/1/participantInputs/1"
  },
  {
    routeKey: "MD:adult-non-conviction-expungement-under-crim-proc-10-105",
    classes: {"county": "render_required"},
    note: "GA-14 reviewed participant court/county venue input; render ownership, not a county-specific eligibility rule. Original unscoped rule-53-automatic-bar-verify-the-effective-date-for-their-count references retain materialization protection. Source: data/record-clearing/legal-design-intake/MD.memo.json/tracks/1/participantInputs/0; data/record-clearing/legal-design-intake/MD.memo.json/tracks/0/participantInputs/0"
  },
  {
    routeKey: "MD:eligible-conviction-expungement-under-crim-proc-10-110",
    classes: {"county": "render_required"},
    note: "GA-14 reviewed participant court/county venue input; render ownership, not a county-specific eligibility rule. Original unscoped rule-53-automatic-bar-verify-the-effective-date-for-their-count references retain materialization protection. Source: data/record-clearing/legal-design-intake/MD.memo.json/tracks/2/participantInputs/0"
  },
  {
    routeKey: "MD:cannabis-specific-expungement",
    classes: {"county": "render_required"},
    note: "GA-14 reviewed participant court/county venue input; render ownership, not a county-specific eligibility rule. Original unscoped rule-53-automatic-bar-verify-the-effective-date-for-their-count references retain materialization protection. Source: data/record-clearing/legal-design-intake/MD.memo.json/tracks/3/participantInputs/0"
  },
  {
    routeKey: "MD:second-chance-act-shielding",
    classes: {"county": "render_required"},
    note: "GA-14 reviewed participant court/county venue input; render ownership, not a county-specific eligibility rule. Original unscoped rule-53-automatic-bar-verify-the-effective-date-for-their-count references retain materialization protection. Source: data/record-clearing/legal-design-intake/MD.memo.json/tracks/5/participantInputs/0"
  },
  {
    routeKey: "MD:pardoned-conviction-expungement-under-crim-proc-10-105-a-8",
    classes: {"county": "render_required"},
    note: "GA-14 reviewed participant court/county venue input; render ownership, not a county-specific eligibility rule. Original unscoped rule-53-automatic-bar-verify-the-effective-date-for-their-count references retain materialization protection. Source: data/record-clearing/legal-design-intake/MD.memo.json/tracks/4/participantInputs/0"
  },
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
