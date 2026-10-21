/**
 * One condition expression, used by every place a contract has to test a fact.
 *
 * Branch selectors, packet-release preconditions and failure dispositions were
 * three different mechanisms: a date-only selector, a presence check, and prose.
 * The presence check is the dangerous one. It treated any non-empty string as
 * satisfaction, so a Georgia consent precondition would have been satisfied by
 * "refused", "no", "unknown", "request sent" and "no known objection" — every
 * one of which the controlling report says is NOT written consent.
 *
 * So there is one expression language, it tests truth rather than presence, and
 * a condition that cannot be evaluated is unsatisfied rather than passed over.
 */

/** Where a fact came from, and therefore what it may be trusted to decide. */
export type FactProvenance =
  /** Typed into anonymous screening. May identify a candidate route; may not authorise anything. */
  | "screening_answer"
  /** Given by an authenticated participant against their own matter. */
  | "participant_authenticated"
  /** Read from a record the server holds and verified at final verification. */
  | "verified_record"
  /** Backed by a document the server has and has checked. */
  | "server_verified_document";

/** The point in the matter's life at which a resolution is being asked for. */
export type LifecyclePhase =
  | "PRELIMINARY_SCREENING"
  | "FINAL_VERIFICATION"
  | "PACKET_GENERATION"
  | "PAYMENT_OR_SPONSORSHIP"
  | "BRIEFCASE_PRESENTATION";

/**
 * A fact with its provenance. A bare string is not accepted anywhere a
 * condition can authorise something: knowing the value without knowing where it
 * came from is how a screening estimate ends up selecting a statute.
 */
export type FactSnapshot = {
  value: string | boolean | null;
  provenance: FactProvenance;
  matterId?: string;
  ownerUserId?: string;
  snapshotHash?: string;
  verifiedAt?: string;
};

export type FactSnapshotMap = Record<string, FactSnapshot | undefined>;

export type ConditionOperator =
  | "equals" | "not_equals"
  | "in" | "not_in"
  | "exists"
  | "is_true" | "is_false"
  | "date_before" | "date_on_or_after"
  /**
   * At least N years/months/days have passed since the fact's date, measured
   * against the evaluation date rather than a literal.
   *
   * An eligibility clock written as `date_before "2025-08-28"` is only correct
   * on the day it was written. A Missouri participant whose twenty-first
   * birthday fell on 2025-10-01 became eligible on 2026-10-01 and would have
   * been refused forever by that literal, because their birthday was not before
   * the frozen cutoff and never would be.
   */
  | "elapsed_at_least"
  | "verified_document_status"
  | "all" | "any";

export type Condition = {
  operator: ConditionOperator;
  /** The fact tested. Absent only for `all` / `any`. */
  factId?: string;
  /** For equals / not_equals / date comparisons / verified_document_status. */
  value?: string;
  /** For in / not_in. */
  values?: string[];
  /** For all / any. */
  conditions?: Condition[];
  /** For elapsed_at_least. */
  elapsed?: { value: number; unit: "days" | "months" | "years" };
  /**
   * The weakest provenance that may satisfy this condition. A fact whose
   * provenance is weaker fails, and says so, rather than being accepted because
   * the value happened to look right.
   */
  requiredProvenance?: FactProvenance;
  /** The earliest phase at which this condition may control an outcome. */
  requiredPhase?: LifecyclePhase;
};

export type ConditionResult = {
  satisfied: boolean;
  /** Facts the condition needed and did not get, in the order encountered. */
  missingFactIds: string[];
  /** Why it was not satisfied. Null when it was. */
  reason: string | null;
};

/** Provenance strength, weakest first. A condition may demand at least a level. */
const PROVENANCE_RANK: Record<FactProvenance, number> = {
  screening_answer: 0,
  participant_authenticated: 1,
  verified_record: 2,
  server_verified_document: 3
};

/** Phase order. A condition may not control before the phase it requires. */
export const PHASE_ORDER: readonly LifecyclePhase[] = [
  "PRELIMINARY_SCREENING", "FINAL_VERIFICATION", "PACKET_GENERATION",
  "PAYMENT_OR_SPONSORSHIP", "BRIEFCASE_PRESENTATION"
];

const PHASE_RANK: Record<LifecyclePhase, number> = {
  PRELIMINARY_SCREENING: 0,
  FINAL_VERIFICATION: 1,
  PACKET_GENERATION: 2,
  PAYMENT_OR_SPONSORSHIP: 3,
  BRIEFCASE_PRESENTATION: 4
};

const parseDate = (value: unknown) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const at = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(at.getTime()) ? null : at;
};

const unsatisfied = (reason: string, missingFactIds: string[] = []): ConditionResult =>
  ({ satisfied: false, missingFactIds, reason });

/**
 * Add a calendar duration to a date, in UTC.
 *
 * Month and year arithmetic clamps to the last valid day, so 29 February plus
 * one year is 28 February rather than rolling into March. A leap-day birthday
 * must not make somebody a day late for their own eligibility.
 */
export function addDuration(from: Date, value: number, unit: "days" | "months" | "years"): Date {
  const at = new Date(from.getTime());
  if (unit === "days") { at.setUTCDate(at.getUTCDate() + value); return at; }
  const months = unit === "years" ? value * 12 : value;
  const day = at.getUTCDate();
  at.setUTCDate(1);
  at.setUTCMonth(at.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 0)).getUTCDate();
  at.setUTCDate(Math.min(day, lastDay));
  return at;
}

export function evaluateCondition(
  condition: Condition,
  facts: FactSnapshotMap,
  phase: LifecyclePhase,
  /**
   * The date the matter is evaluated as of. Required for elapsed_at_least: a
   * clock with no as-of date has to invent one, and a hidden new Date() makes
   * the same matter eligible in one caller and not another.
   */
  asOf?: Date
): ConditionResult {
  if (condition.operator === "all" || condition.operator === "any") {
    const parts = (condition.conditions ?? []).map((child) => evaluateCondition(child, facts, phase, asOf));
    const missing = [...new Set(parts.flatMap((part) => part.missingFactIds))];
    if (condition.operator === "all") {
      const failed = parts.find((part) => !part.satisfied);
      return failed
        ? { satisfied: false, missingFactIds: missing, reason: failed.reason }
        : { satisfied: true, missingFactIds: [], reason: null };
    }
    const met = parts.some((part) => part.satisfied);
    return met
      ? { satisfied: true, missingFactIds: [], reason: null }
      : { satisfied: false, missingFactIds: missing, reason: parts[0]?.reason ?? "no alternative was satisfied" };
  }

  const factId = condition.factId;
  if (!factId) return unsatisfied(`${condition.operator} names no fact`);

  // A condition that may only control from a later phase does not control now.
  // It is not satisfied and it is not a missing fact: it is simply not yet the
  // question being asked, so preliminary screening never demands an exact date.
  if (condition.requiredPhase && PHASE_RANK[phase] < PHASE_RANK[condition.requiredPhase]) {
    return unsatisfied(`${factId} may only decide from ${condition.requiredPhase}; this is ${phase}`);
  }

  const fact = facts[factId];
  if (!fact || fact.value === null || fact.value === undefined || String(fact.value).trim() === "") {
    return unsatisfied(`${factId} is absent`, [factId]);
  }

  if (condition.requiredProvenance
    && PROVENANCE_RANK[fact.provenance] < PROVENANCE_RANK[condition.requiredProvenance]) {
    return unsatisfied(
      `${factId} came from ${fact.provenance}; this condition requires at least ${condition.requiredProvenance}`,
      [factId]
    );
  }

  const raw = fact.value;
  const text = typeof raw === "string" ? raw.trim() : String(raw);

  switch (condition.operator) {
    case "exists":
      return { satisfied: true, missingFactIds: [], reason: null };
    case "equals":
      return text === condition.value
        ? { satisfied: true, missingFactIds: [], reason: null }
        : unsatisfied(`${factId} is "${text}", not "${condition.value}"`);
    case "not_equals":
      return text !== condition.value
        ? { satisfied: true, missingFactIds: [], reason: null }
        : unsatisfied(`${factId} is "${text}", which this condition excludes`);
    case "in":
      return (condition.values ?? []).includes(text)
        ? { satisfied: true, missingFactIds: [], reason: null }
        : unsatisfied(`${factId} is "${text}", not one of ${(condition.values ?? []).join(", ")}`);
    case "not_in":
      return !(condition.values ?? []).includes(text)
        ? { satisfied: true, missingFactIds: [], reason: null }
        : unsatisfied(`${factId} is "${text}", which this condition excludes`);
    case "is_true":
      return raw === true || text === "true"
        ? { satisfied: true, missingFactIds: [], reason: null }
        : unsatisfied(`${factId} is not true`);
    case "is_false":
      return raw === false || text === "false"
        ? { satisfied: true, missingFactIds: [], reason: null }
        : unsatisfied(`${factId} is not false`);
    case "date_before":
    case "date_on_or_after": {
      const at = parseDate(text);
      const boundary = parseDate(condition.value);
      if (!at) return unsatisfied(`${factId} is not a readable date`, [factId]);
      if (!boundary) return unsatisfied(`${condition.value} is not a readable boundary date`);
      const matches = condition.operator === "date_before"
        ? at.getTime() < boundary.getTime()
        : at.getTime() >= boundary.getTime();
      return matches
        ? { satisfied: true, missingFactIds: [], reason: null }
        : unsatisfied(`${factId} ${text} does not satisfy ${condition.operator} ${condition.value}`);
    }
    case "elapsed_at_least": {
      const at = parseDate(text);
      if (!at) return unsatisfied(`${factId} is not a readable date`, [factId]);
      if (!condition.elapsed) return unsatisfied(`${factId}: elapsed_at_least names no duration`);
      if (!asOf) return unsatisfied(`${factId}: elapsed_at_least needs an evaluation date and none was supplied`);
      const due = addDuration(at, condition.elapsed.value, condition.elapsed.unit);
      return asOf.getTime() >= due.getTime()
        ? { satisfied: true, missingFactIds: [], reason: null }
        : unsatisfied(`${condition.elapsed.value} ${condition.elapsed.unit} from ${text} falls due ${due.toISOString().slice(0, 10)}, which is after the evaluation date ${asOf.toISOString().slice(0, 10)}`);
    }
    case "verified_document_status": {
      // A document-backed condition demands the document, not a description of
      // it. Provenance below server_verified_document never satisfies this,
      // whatever the participant typed.
      if (PROVENANCE_RANK[fact.provenance] < PROVENANCE_RANK.server_verified_document) {
        return unsatisfied(`${factId} claims "${text}" but its provenance is ${fact.provenance}; a document-backed condition requires server_verified_document`, [factId]);
      }
      return text === condition.value
        ? { satisfied: true, missingFactIds: [], reason: null }
        : unsatisfied(`${factId} document status is "${text}", not "${condition.value}"`);
    }
    default:
      return unsatisfied(`unknown operator ${String(condition.operator)}`);
  }
}
