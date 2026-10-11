import assert from "node:assert/strict";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { packetSpecificationFor } = await import("../src/lib/rcap/grade-a/packet-specification.ts");
const { composeGradeAPacket } = await import("../src/lib/rcap/grade-a/composer.ts");
const { packetCollectionFor } = await import("../src/lib/expungement-ai/packet-information.ts");
const { prepayGateFactIds } = await import("../src/lib/expungement-ai/packet-collection.ts");
const routes = [
  "MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
  "MS:additional-municipal-court-misdemeanor-relief-21-23-7-6",
  "MS:first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1"
];
for (const routeKey of routes) {
  const spec = packetSpecificationFor(routeKey);
  assert.ok(spec, routeKey);
  const fields = ["service_date", "service_manner"];
  for (const id of fields) {
    assert.ok(spec.fieldOwnership.participantCompletesBeforeFilingFields.includes(id), `${routeKey}:${id} has explicit later ownership`);
    const treatments = spec.documents.flatMap((document) => document.sections).filter((section) => section.fields?.includes(id));
    assert.ok(treatments.length);
    assert.ok(treatments.every((section) => section.fieldTreatments[id] === "ruled_blank"), "the authoritative documents require a printed blank");
  }
  const requiredInputIds = spec.requiredFacts.map((fact) => fact.factId);
  const resolution = packetCollectionFor({ jurisdiction: "MS", pathwayId: routeKey.slice(3), requiredInputIds, screeningAnswers: {}, serverFacts: {} });
  for (const id of fields) {
    assert.equal(resolution.facts.find((fact) => fact.factId === id).actor, "participant_before_filing");
    assert.equal(prepayGateFactIds(resolution).includes(id), false);
  }
  // Structural composer witness only, never a legal eligibility/funding acceptance case.
  const facts = Object.fromEntries(requiredInputIds.map((id) => [id, `SYNTHETIC STRUCTURAL ${id}`]));
  // These existing identity sections also read components missing from the two
  // additional-relief specifications' requiredFacts. GA-49 tracks that separate
  // contract mismatch; supply their explicit consumers for this bounded test.
  for (const id of ["mailing_address", "phone_number", "email_address"]) {
    facts[id] = `SYNTHETIC STRUCTURAL ${id}`;
  }
  const matter = { jurisdiction: "MS", pathwayId: routeKey.slice(3), routeKey, facts, verifiedAt: "2026-10-11T00:00:00.000Z", verificationHash: "structural-test-only", generationPurpose: "internal_review" };
  const withUnusedServiceFacts = composeGradeAPacket(spec, matter);
  for (const id of fields) delete facts[id];
  const withApprovedBlanks = composeGradeAPacket(spec, matter);
  assert.deepEqual(withApprovedBlanks, withUnusedServiceFacts, "removing unused service values must preserve the entire composed document set");
  // A mutation removes a genuinely printed fact and must still fail closed.
  const consumed = "participant_full_legal_name";
  assert.ok(consumed, "negative control has an actual consumed field");
  const invalidFacts = { ...facts }; delete invalidFacts[consumed];
  assert.throws(() => composeGradeAPacket(spec, { ...matter, facts: invalidFacts }), /missing|blank/i);
}
console.log("PASS: all six service-field appearances follow declared later ownership, preserve composed document output, and retain genuine missing-input refusals. Protected PDF acceptance is separate.");
