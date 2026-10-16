import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";
import { NY_16059_FACT_IDS, NY_16059_LEGACY_IDS } from "@/lib/rcap-engine/new-york-16059-questions";
import { NY_16059_CUSTODY_CONFIRMATION_ID, NY_16059_RELEASE_CONFIRMATION_ID } from "@/lib/rcap-engine/new-york-16059-questions";

export const NY_CLOCK_CONFIRMATION_IDS = [NY_16059_CUSTODY_CONFIRMATION_ID, NY_16059_RELEASE_CONFIRMATION_ID];
export const NY_CLOCK_CONFIRMATION_INPUT_IDS = [...new Set([
  ...NY_16059_FACT_IDS.filter(id => !NY_CLOCK_CONFIRMATION_IDS.includes(id)), ...NY_16059_LEGACY_IDS,
  "sentencing_date", "release_date", "case_outcome", "offense_level", "sentence_completion_date",
  "new_convictions_during_waiting_period", "ny_16059_later_conviction_entered", "ny_16059_undisposed_arrest",
  "ny_16059_pending_charge", "ny_16059_sex_offender_registration"
])];

/** Preserve the prior scalar inside the existing unsure wrapper; never infer a fresh attestation. */
function unconfirmed(value: AnswerValue): AnswerValue {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...value, unknown: true }
    : typeof value === "string" || typeof value === "number" || value === null
      ? { value, unknown: true } : value;
}

export function invalidateNyClockConfirmations(answers: Record<string, AnswerValue>, jurisdiction: string,
  changedId: string, nextValue: AnswerValue): Record<string, AnswerValue> {
  if (jurisdiction !== "NY" || !NY_CLOCK_CONFIRMATION_INPUT_IDS.includes(changedId)
    || JSON.stringify(answers[changedId]) === JSON.stringify(nextValue)) return answers;
  const next = { ...answers };
  for (const id of NY_CLOCK_CONFIRMATION_IDS) {
    if (Object.hasOwn(next, id)) next[id] = unconfirmed(next[id]);
  }
  return next;
}
