import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The Corrections A shared handoff (9c0e1fdb4) was delivered as a one-shot evaluator patch. The evaluator's route
// sets are now derived from the ratification registry (evaluator.ts ROUTE_RATIFICATION_REGISTRY), so the patch can no
// longer be regenerated. This verifies the handoff's realized state instead (Roger item 31: replace, not retire).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const handoff = readJson("data/expungement-ai/corrections-a/closure.json").sharedHandoff;
const registry = new Map(readJson("data/record-clearing/legal-decisions/route-ratification-registry.json")
  .routes.map((entry) => [entry.routeKey, entry.status]));
const metadata = new Map(Object.entries(readJson("data/expungement-ai/route-product-metadata.json").routes));
const evaluator = read("src/lib/rcap-engine/evaluator.ts");
const projection = read("src/lib/rcap-engine/public-profile-projection.ts");

assert.ok(evaluator.includes('.filter((entry) => entry.status === "ratified_deployable")'),
  "ratified-deployable routes must be derived from the ratification registry");
for (const routeKey of new Set([...handoff.removeFromRatifiedDeployable, ...handoff.addToIntentionalUnsupported])) {
  assert.equal(registry.get(routeKey), "intentional_unsupported", `${routeKey}: handoff route must stay intentional_unsupported`);
}
// evaluatorTier is a generated label whose taxonomy has since changed; the participant-facing fields are the handoff.
for (const [routeKey, expected] of Object.entries(handoff.routeProductMetadata)) {
  const current = metadata.get(routeKey);
  assert.ok(current, `${routeKey}: route product metadata missing`);
  for (const field of ["serviceBehavior", "paymentProductEligible", "checkoutEligibility"]) {
    assert.equal(current[field], expected[field], `${routeKey}: ${field} differs from the Corrections A handoff`);
  }
}
assert.match(evaluator, /timingFromExactAnchor\(profile, answers, rule, pathway, "conviction_date", \{ value: 90/,
  "Louisiana Art. 998 exact conviction-date anchor missing");
assert.match(evaluator, /timingFromExactAnchor\(profile, answers, rule, pathway, "disposition_date", \{ value: 60/,
  "Alaska TF-810 exact disposition-date anchor missing");
for (const questionId of [
  "ms_last_conviction_date_any_court",
  "ms_successful_sentence_completion_date",
  "ms_mip_dismissal_or_discharge_date",
  "ms_mip_sentence_completion_date",
  "ms_mip_fine_imposed",
  "ms_mip_fine_payment_date"
]) {
  assert.ok(projection.includes(questionId), `${questionId}: Mississippi public timing fact missing from the public projection`);
}

console.log("verify-corrections-a-shared-patch: GREEN");
console.log(JSON.stringify({
  intentionalUnsupported: new Set([...handoff.removeFromRatifiedDeployable, ...handoff.addToIntentionalUnsupported]).size,
  routeProductMetadata: Object.keys(handoff.routeProductMetadata).length
}, null, 2));
