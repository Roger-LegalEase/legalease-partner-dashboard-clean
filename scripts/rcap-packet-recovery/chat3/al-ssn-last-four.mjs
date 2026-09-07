/** CR-65 (10/2024), page 1: Text2 is SSN last four, never a case identifier. */
import assert from "node:assert/strict";

export const SSN_LAST_FOUR_FIELD = "Text2";
export const SSN_LAST_FOUR_FACT = "participant.ssn_last_four";
export const SSN_LAST_FOUR_LABEL = "CR-65 page 1: Social Security number, last four digits only";

export function ssnLastFour(facts) {
  const value = Object.hasOwn(facts, "ssnLast4") ? facts.ssnLast4 : undefined;
  if (value === undefined || value === null || value === "") return null;
  // Do not coerce, trim, slice, parse, or derive this value from any other fact.
  assert.ok(typeof value === "string" && /^[0-9]{4}$/.test(value),
    "INVALID_SSN_LAST_FOUR: supply a separately held four-digit string or leave it missing");
  return value;
}

export function ssnLastFourRefusal() {
  return {
    effectiveLabel: SSN_LAST_FOUR_LABEL,
    reason: "No separately held SSN-last-four fact is available. Enter only your actual last four digits before filing; never copy the case number or another identifier.",
    completenessDisposition: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true, factAvailable: false, routeDetermined: false,
    factId: SSN_LAST_FOUR_FACT, role: "participant"
  };
}
