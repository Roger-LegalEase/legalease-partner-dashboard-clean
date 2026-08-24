import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";

/**
 * UX-GLOBAL-004 — one canonical fact store for a matter.
 *
 * The defect this replaces: `packetInformationModelFor` seeded its answer store
 * with `requiredInputIds.filter((id) => id in screeningAnswers)`. Two things
 * followed from that one line.
 *
 * 1. Carry-forward was scoped to the packet plan's required-input list. Any fact
 *    the participant had already given screening whose id was not literally in
 *    that list — ownership_scope, jurisdiction_scope, resolved_timing_bucket,
 *    court_requirements_completed — was dropped on the floor. The accuracy
 *    review page renders three of those four for every state and offers an
 *    "Edit" link into `?edit=<id>`, which filters `model.questions`; because the
 *    facts were never carried, that link resolved to an empty question set in 50
 *    of 51 states.
 * 2. Where an id did match, the fact was carried but the question was still put
 *    to the participant a second time, prefilled.
 *
 * Mississippi's non-conviction route carried a hand-written block that repaired
 * (1) for exactly one state and one pathway. That block was the proof the
 * generic mechanism did not work; this module is that block generalised.
 *
 * The generalisation invents nothing. A screening answer is the participant's
 * own answer under its own id, so carrying every one of them forward is a
 * transcription, not a legal judgement. The two cross-id derivations Mississippi
 * performed ARE judgements — they assert that one fact answers a differently
 * named field — so they stay declared, scoped, and provenanced here rather than
 * being spread to states no one has reviewed them for.
 */

export type CanonicalFactOrigin =
  | "server_fact"
  | "screening_answer"
  | "declared_derivation"
  | "prefilled_answer"
  | "saved_answer";

/**
 * A declared assertion that one fact answers a differently-named packet field.
 *
 * `transform`:
 * - `copy` — the value carries across unchanged.
 * - `yes_no_flag` — the source is a yes/no confirmation and the target field
 *   records it as "Yes"/"No". Any value other than a literal `yes` reads as
 *   "No", which is the pre-existing Mississippi behaviour preserved verbatim.
 *
 * A derivation only ever fills a gap. It never overwrites a fact the
 * participant, the server, or an earlier save already supplied.
 */
export type DeclaredDerivation = {
  targetId: string;
  sourceId: string;
  transform: "copy" | "yes_no_flag";
  jurisdictions: string[];
  /** `null` means every pathway in those jurisdictions. */
  pathwayIds: string[] | null;
  provenance: string;
};

const MS_NON_CONVICTION = "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";

export const DECLARED_DERIVATIONS: DeclaredDerivation[] = [
  {
    targetId: "offense_category",
    sourceId: "offense_level",
    transform: "copy",
    jurisdictions: ["MS"],
    pathwayIds: [MS_NON_CONVICTION],
    provenance: "Pre-existing Mississippi non-conviction rule: the packet's offense category is carried forward from the charge level when they match. Declared for MS only; extending it needs the same review for each additional state."
  },
  {
    targetId: "sentence_completion_date",
    sourceId: "court_requirements_completed",
    transform: "yes_no_flag",
    jurisdictions: ["MS"],
    pathwayIds: [MS_NON_CONVICTION],
    provenance: "Pre-existing Mississippi non-conviction rule: this route's packet records sentence completion as a Yes/No confirmation rather than a date, taken from the court-requirements confirmation."
  }
];

/**
 * Screening facts that stay editable in the packet questionnaire even when the
 * packet plan does not list them as a required input.
 *
 * These are the facts the accuracy review page renders as "Important
 * confirmations" and offers an "Edit" link for. The link targets
 * `/packet-information?edit=<id>`; before the canonical store it resolved to an
 * empty question set in 50 of 51 jurisdictions, because the fact was only ever
 * carried for one Mississippi pathway. Making them editable does not make them
 * blocking — see ROUTE_CRITICAL_CONTEXT_FACTS for that, which is declared per
 * route.
 */
export const REVIEWED_CONTEXT_FACT_IDS = [
  "ownership_scope",
  "jurisdiction_scope",
  "resolved_timing_bucket",
  "court_requirements_completed"
];

/**
 * Context facts a specific route must hold a definite answer for before
 * payment.
 *
 * The pre-payment re-check validates every question in the packet's question
 * set. Adding a context fact to that set therefore makes it a payment
 * precondition, which is a legal-route judgement and not something to spread by
 * default. Mississippi's non-conviction route already treated these four that
 * way; this is that rule, declared and provenanced, instead of an inline state
 * check.
 */
export type RouteCriticalContextFacts = {
  jurisdictions: string[];
  /** `null` means every pathway in those jurisdictions. */
  pathwayIds: string[] | null;
  factIds: string[];
  provenance: string;
};

export const ROUTE_CRITICAL_CONTEXT_FACTS: RouteCriticalContextFacts[] = [
  {
    jurisdictions: ["MS"],
    pathwayIds: [MS_NON_CONVICTION],
    factIds: ["ownership_scope", "jurisdiction_scope", "resolved_timing_bucket", "court_requirements_completed"],
    provenance: "Pre-existing Mississippi non-conviction rule: these scope and timing facts are source-rule inputs for this packet, so the pre-payment re-check requires a definite answer for each. Declared for MS only; adding a state needs the same review."
  }
];

export function routeCriticalContextFactIds(jurisdictionCode: string, pathwayId: string | null) {
  const ids = new Set<string>();
  for (const entry of ROUTE_CRITICAL_CONTEXT_FACTS) {
    if (!entry.jurisdictions.includes(jurisdictionCode)) continue;
    if (entry.pathwayIds !== null && (pathwayId === null || !entry.pathwayIds.includes(pathwayId))) continue;
    for (const id of entry.factIds) ids.add(id);
  }
  return [...ids];
}

export type CanonicalFactStore = {
  answers: Record<string, AnswerValue>;
  origins: Record<string, CanonicalFactOrigin>;
};

function rawText(value: AnswerValue | undefined) {
  if (value && typeof value === "object" && !Array.isArray(value)) return String(value.value ?? "").trim();
  return String(value ?? "").trim();
}

export function derivationsFor(jurisdictionCode: string, pathwayId: string | null) {
  return DECLARED_DERIVATIONS.filter((derivation) => (
    derivation.jurisdictions.includes(jurisdictionCode)
    && (derivation.pathwayIds === null || (pathwayId !== null && derivation.pathwayIds.includes(pathwayId)))
  ));
}

/**
 * Build the matter's canonical facts.
 *
 * Precedence, lowest to highest: every screening answer, then declared
 * derivations filling remaining gaps, then server-side prefills, then whatever
 * the participant has saved in the packet questionnaire. Server facts are
 * reported separately by the caller because they are not participant-editable.
 */
export function buildCanonicalFactStore(input: {
  jurisdictionCode: string;
  pathwayId: string | null;
  screeningAnswers: Record<string, AnswerValue>;
  prefilledAnswers: Record<string, AnswerValue>;
  savedAnswers: Record<string, AnswerValue>;
}): CanonicalFactStore {
  const answers: Record<string, AnswerValue> = {};
  const origins: Record<string, CanonicalFactOrigin> = {};

  const put = (id: string, value: AnswerValue, origin: CanonicalFactOrigin) => {
    answers[id] = value;
    origins[id] = origin;
  };

  // Every screening answer, not just the ones the packet plan happens to name
  // with the same id. This is the correction: the participant already told us.
  for (const [id, value] of Object.entries(input.screeningAnswers)) put(id, value, "screening_answer");
  for (const derivation of derivationsFor(input.jurisdictionCode, input.pathwayId)) {
    if (derivation.targetId in answers) continue;
    if (!(derivation.sourceId in answers)) continue;
    const source = answers[derivation.sourceId];
    const value = derivation.transform === "copy"
      ? source
      : rawText(source) === "yes" ? "Yes" : "No";
    put(derivation.targetId, value, "declared_derivation");
  }
  for (const [id, value] of Object.entries(input.prefilledAnswers)) put(id, value, "prefilled_answer");
  for (const [id, value] of Object.entries(input.savedAnswers)) put(id, value, "saved_answer");

  return { answers, origins };
}
