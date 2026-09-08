/** Input validation for one already-selected Illinois education-sealing record.
 * This is not an eligibility test or legal approval. It never supplies facts.
 */
import assert from "node:assert/strict";

export function validateSealingRecord(facts) {
  assert.ok(facts && typeof facts === "object", "REQUIRED_BEFORE_FILING: record facts are missing");
  for (const [key, label] of [
    ["caseNumber", "arrest or case number"], ["arrestAgency", "arresting agency"],
    ["charge", "actual charge from the certified disposition"],
    ["arrestDate", "arrest date"], ["outcome", "recorded outcome"],
    ["full", "participant name"], ["street", "participant address"],
    ["phone", "participant telephone"], ["email", "participant email"]
  ]) {
    assert.ok(typeof facts[key] === "string" && facts[key].trim().length > 0,
      `REQUIRED_BEFORE_FILING: ${label} is missing; no substitute will be written`);
  }
  const charge = facts.charge.trim();
  assert.ok(!/^(?:unknown|not sure|undefined|null|n\/?a|tbd|[-_]+)$/i.test(charge),
    "REQUIRED_BEFORE_FILING: an unknown-charge token is not a charge fact");
  assert.ok(!/^(?:complete|enter|supply|insert|list|provide|charge exactly|charges exactly)\b/i.test(charge)
    && !/exactly as (?:shown|printed)|extended statutory description|materially exceeds one line/i.test(charge),
    "REQUIRED_BEFORE_FILING: instructional or boundary-test prose is not a charge fact");
  assert.notEqual(charge, facts.caseNumber.trim(),
    "REQUIRED_BEFORE_FILING: a case number is not a charge fact");
  return facts;
}
