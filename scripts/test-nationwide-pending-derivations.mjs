import assert from "node:assert/strict";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { resolvePacketCollection, prepayGateFactIds } = await import("../src/lib/expungement-ai/packet-collection.ts");
const { packetCollectionFor } = await import("../src/lib/expungement-ai/packet-information.ts");
const { packetPlanForPathway } = await import("../src/lib/rcap-engine/packet-planner.ts");
const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { MS_NONCONVICTION_SCREENING_ANSWERS: screeningAnswers, MS_NONCONVICTION_ROUTE: route } = await import("./lib/rcap-ms-nonconviction-fixture.mjs");
const profile = getProfileByJurisdiction("MS");
const plan = packetPlanForPathway(profile, route.pathwayId);
const resolveMs = (savedAnswers = {}) => packetCollectionFor({ jurisdiction: "MS", pathwayId: route.pathwayId, requiredInputIds: plan.requiredInputIds, serverFacts: { jurisdiction: "MS", pathway_id: route.pathwayId }, screeningAnswers, savedAnswers });
const originalPending = ["social_security_number_last_four", "court_type", "court_name", "filing_location"];
const initial = resolveMs();
for (const id of originalPending) {
  assert.ok(initial.pendingDerivations.some((fact) => fact.factId === id), `${id}: pending is explicit`);
  assert.equal(prepayGateFactIds(initial).includes(id), false, `${id}: no extra participant prompt`);
  assert.equal(initial.derivedFacts[id], undefined);
}
const complete = resolveMs({ social_security_number: "900-12-3456", court: { value: "Synthetic County Circuit Court", unknown: false }, county: { value: "Synthetic County", unknown: false } });
for (const id of originalPending) {
  assert.equal(complete.pendingDerivations.some((fact) => fact.factId === id), false, `${id}: valid output resolves pending`);
  assert.ok(complete.derivedFacts[id]);
}
for (const social_security_number of ["1234", "000000000", "invalid-but-nonempty", { value: "900123456", unknown: true }]) {
  assert.ok(resolveMs({ social_security_number }).pendingDerivations.some((fact) => fact.factId === "social_security_number_last_four"));
}
const age = (birth, offense) => resolvePacketCollection({
  jurisdiction: "TEST", pathwayId: "structural-only", requiredInputIds: ["age_at_offense", "date_of_birth", "offense_date"],
  serverFacts: {}, screeningAnswers: {}, savedAnswers: { date_of_birth: birth, offense_date: offense },
  questionById: new Map(["date_of_birth", "offense_date"].map((id) => [id, { id, type: "date", prompt: id }]))
});
for (const [birth, offense] of [["2000-02-30", "2020-01-01"], ["2000-02-29", "1999-01-01"], ["2000-02-29", "partial"], ["", "2020-01-01"]]) {
  assert.equal(age(birth, offense).facts.find((fact) => fact.factId === "age_at_offense").derivation.state, "pending");
}
assert.equal(age("2000-02-29", "2020-02-28").derivedFacts.age_at_offense, "19");
assert.equal(age("2000-02-29", "2020-03-01").derivedFacts.age_at_offense, "20");
// Saved uncertainty must not resurrect a stale valid screening dependency.
const changed = resolvePacketCollection({ jurisdiction: "TEST", pathwayId: "structural-only", requiredInputIds: ["court", "court_name"], serverFacts: {}, screeningAnswers: { court: "Synthetic Circuit Court" }, savedAnswers: { court: { value: "Synthetic Circuit Court", unknown: true } } });
assert.equal(changed.derivedFacts.court_name, undefined);
assert.ok(changed.pendingDerivations.some((fact) => fact.factId === "court_name"));
console.log("PASS: all four original pending outputs, valid outputs, malformed/unknown/lost dependencies, calendar arithmetic and no extra aggregate prompts. Protected save/reload acceptance remains separate.");
