import "server-only";

import type { EngineProfile } from "@/lib/rcap-engine/contracts";

/**
 * Which parts of the engine read a given fact.
 *
 * This lives in its own module so the public projection never names an internal
 * decision-rule collection. The projection asks this for a map of question id to
 * consumer and nothing else: no rule, no clause and no rule text crosses back,
 * and none of it can reach a public payload.
 */
/**
 * UX-GLOBAL-019 — the engine consumers of one fact, computed from the compiled
 * profile's own structure.
 *
 * Customer-facing prompt text is no longer the lifecycle authority. It never was
 * evidence: a prompt is written for a reader, and matching words in it decided
 * whether the evaluator would ever be given the answer. Six shared facts the
 * evaluator consumes before it will open a packet were classified postpay by
 * that matching, `deriveScreens` dropped them, and no participant was ever
 * asked. The repository's own recorded witnesses could not be reproduced in a
 * browser as a direct result.
 *
 * These are structural reads. None of them looks at prompt copy.
 */
export type FactConsumer =
  | "eligibility"
  | "remedy_selection"
  | "waiting_rule_evaluation"
  | "deferral_or_treatment"
  | "packet_readiness"
  | "checkout"
  | "packet_generation";

/** Consumers that must have their fact BEFORE a packet is offered or paid for. */
export const PREPAY_CONSUMERS: ReadonlySet<FactConsumer> = new Set<FactConsumer>([
  "eligibility",
  "remedy_selection",
  "waiting_rule_evaluation",
  "deferral_or_treatment"
]);

function collectFieldIds(value: unknown, into: Set<string>) {
  if (!value) return;
  if (Array.isArray(value)) { for (const entry of value) { if (typeof entry === "string") into.add(entry); else collectFieldIds(entry, into); } return; }
  if (typeof value !== "object") return;
  const node = value as Record<string, unknown>;
  for (const key of ["fields", "fieldIds", "fieldsReferenced", "triggerFields", "requiredInputIds", "questionIds"]) {
    const entry = node[key];
    if (Array.isArray(entry)) for (const id of entry) if (typeof id === "string") into.add(id);
  }
  for (const entry of Object.values(node)) if (entry && typeof entry === "object") collectFieldIds(entry, into);
}

export function factConsumerIndex(profile: EngineProfile): Map<string, Set<FactConsumer>> {
  const index = new Map<string, Set<FactConsumer>>();
  const add = (ids: Iterable<string>, consumer: FactConsumer) => {
    for (const id of ids) {
      if (!id) continue;
      if (!index.has(id)) index.set(id, new Set());
      index.get(id)!.add(consumer);
    }
  };

  const eligibility = new Set<string>();
  collectFieldIds(profile.orderedDecisionRules, eligibility);
  collectFieldIds(profile.exclusionRules, eligibility);
  add(eligibility, "eligibility");

  const remedy = new Set<string>();
  for (const pathway of (profile.pathways ?? [])) {
    collectFieldIds((pathway as { triggerFields?: unknown }).triggerFields, remedy);
    collectFieldIds((pathway as { ruleClauses?: unknown }).ruleClauses, remedy);
  }
  add(remedy, "remedy_selection");

  const waiting = new Set<string>();
  collectFieldIds(profile.waitingPeriodRules, waiting);
  add(waiting, "waiting_rule_evaluation");

  const generation = new Set<string>();
  collectFieldIds((profile as { packetGenerator?: unknown }).packetGenerator, generation);
  add(generation, "packet_generation");

  return index;
}

