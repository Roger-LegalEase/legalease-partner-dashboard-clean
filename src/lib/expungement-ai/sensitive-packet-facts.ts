import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";
import { isCalendarDate, isFullSsnFormat, scalarAnswerText } from "@/lib/expungement-ai/question-answer-state";

export const MCIC_AUTHORITY_FACT_IDS = ["mcic_identifier_delivery_method", "mcic_identifier_method_confirmation_source"] as const;
export function requiresMcicIdentifierAuthority(state: string, pathway: string | null | undefined) {
  return state === "MS" && pathway === "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
}

/** Reuse the existing court-confirmation contract; this never approves a channel. */
export function mcicIdentifierAuthority(facts: Readonly<Record<string, unknown>>, at: string): { safe: boolean; violations: string[] } {
  const value = (id: string) => {
    const answer = facts[id];
    return answer && typeof answer === "object" && "unknown" in answer && answer.unknown === true ? "" : scalarAnswerText(answer)?.trim() ?? "";
  };
  const allowed = new Set([
    "Confidential court-approved MCIC identifier addendum", "Court-approved MCIC identifier sheet",
    "Court-approved nonpublic certified copy", "Court-approved signed-order identifier channel"
  ]);
  const violations: string[] = [];
  if (!allowed.has(value(MCIC_AUTHORITY_FACT_IDS[0]))) violations.push("the MCIC identifier-delivery method is not a protected court-approved channel");
  const match = /^Confirmed by (?:the )?[A-Za-z0-9 .,'-]*(?:Court|Clerk)(?:'s Office)? on (\d{4}-\d{2}-\d{2})$/i.exec(value(MCIC_AUTHORITY_FACT_IDS[1]));
  const timestamp = new Date(at).getTime();
  // Preserve the existing confirmation predicate's rejection of years 0000–0099.
  if (!match || !isCalendarDate(match[1]) || Number(match[1].slice(0, 4)) < 100 || !Number.isFinite(timestamp) || new Date(`${match[1]}T00:00:00.000Z`).getTime() > timestamp) violations.push("the court of origin has not confirmed the MCIC identifier-delivery method");
  return { safe: violations.length === 0, violations };
}

export function fullSsnLastFour(value: unknown): string | null {
  const text = scalarAnswerText(value)?.trim() ?? "";
  if (value && typeof value === "object" && "unknown" in value && value.unknown === true) return null;
  const digits = text.replace(/\D/g, "");
  return isFullSsnFormat(text) ? digits.slice(-4) : null;
}

/** No mask is ever persisted as an answer. This is a display-only projection. */
export function maskedSensitiveAnswer(value: unknown): string {
  const lastFour = fullSsnLastFour(value);
  return lastFour ? `XXX-XX-${lastFour}` : "Sensitive value hidden";
}

/** Owner editing readback still respects the same purpose-specific prerequisite. */
export function packetAnswersForOwnerEditing(state: string, pathway: string | null, answers: Record<string, AnswerValue>, at: string, editingSensitiveIdentifier = false): Record<string, AnswerValue> {
  if (editingSensitiveIdentifier && (!requiresMcicIdentifierAuthority(state, pathway) || mcicIdentifierAuthority(answers, at).safe)) return answers;
  return Object.fromEntries(Object.entries(answers).filter(([id]) => id !== "social_security_number"));
}
