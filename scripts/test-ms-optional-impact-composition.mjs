import assert from "node:assert/strict";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);
const packet = await import("../src/lib/expungement-ai/packet-information.ts");
const { evaluateAuthoritativeScreeningResult } = await import("../src/lib/expungement-ai/authoritative-screening-result.ts");
const { scalarAnswerText } = await import("../src/lib/expungement-ai/question-answer-state.ts");
const { packetSpecificationFor } = await import("../src/lib/rcap/grade-a/packet-specification.ts");
const { composeGradeAPacket } = await import("../src/lib/rcap/grade-a/composer.ts");
const { buildMsNonConvictionVerification, MS_NONCONVICTION_ROUTE } = await import("./lib/rcap-ms-nonconviction-fixture.mjs");

// Existing synthetic fixture and actual verification functions, in memory only.
// This test creates no account, entitlement, payment, database row or delivered PDF.
const routeKey = `MS:${MS_NONCONVICTION_ROUTE.pathwayId}`;
const specification = packetSpecificationFor(routeKey);
const marker = "SYNTHETIC OPTIONAL PERSONAL IMPACT STATEMENT";
function verifiedMatter(parent, statement) {
  const fixture = buildMsNonConvictionVerification({
    ...packet,
    evaluateAuthoritativeScreeningResult,
    matterId: "synthetic-optional-impact-regression",
    capturedAt: "2026-10-11T12:00:00.000Z",
    answerOverrides: { personal_impact_confirmed: parent, personal_impact_statement: statement }
  });
  packet.requireCurrentPacketVerificationRecord(fixture.item, fixture.verification);
  const model = packet.protectedPacketInformationModelFor(fixture.verification);
  const snapshot = fixture.snapshot;
  const facts = Object.fromEntries(Object.entries({
    ...snapshot.screeningAnswers, ...snapshot.prefilledAnswers, ...snapshot.packetAnswers, ...model.initialAnswers
  }).map(([key, value]) => [key, scalarAnswerText(value) ?? ""]));
  return {
    model,
    matter: { routeKey, jurisdiction: "MS", pathwayId: MS_NONCONVICTION_ROUTE.pathwayId,
      facts, verificationHash: fixture.hash, verifiedAt: snapshot.capturedAt, generationPurpose: "internal_review" }
  };
}
const yes = verifiedMatter("Yes", marker);
const retainedNo = verifiedMatter("No", marker);
const absentNo = verifiedMatter("No", undefined);
const emptyNo = verifiedMatter("No", "");
const yesPacket = composeGradeAPacket(specification, yes.matter);
const noPacket = composeGradeAPacket(specification, absentNo.matter);
assert.ok(JSON.stringify(yesPacket.documents).includes(marker));
assert.ok(!JSON.stringify(noPacket.documents).includes(marker));
assert.deepEqual(noPacket.documents, composeGradeAPacket(specification, retainedNo.matter).documents);
assert.deepEqual(noPacket.documents, composeGradeAPacket(specification, emptyNo.matter).documents);
assert.ok(!absentNo.model.builderQuestions.some(question => question.id === "personal_impact_statement"));
assert.deepEqual(absentNo.model.missingInputIds, []);
assert.ok(!absentNo.matter.facts.personal_impact_statement);
for (const [parent, statement] of [
  ["Yes", undefined], ["Yes", ""], [undefined, undefined], ["I am not sure", undefined],
  [{ unknown: true }, undefined], [{ unknown: "bad", value: "No" }, undefined], ["Sometimes", undefined]
]) {
  assert.throws(() => verifiedMatter(parent, statement), /did not reach a real verification/,
    "a missing required narrative or unresolved parent cannot establish verification");
}

// An optional assertion is not a waiver for another actual consumer.
for (const kind of ["fields", "body", "jurat", "assertion-facts", "assertion-text", "declaration-same-id"]) {
  const changed = structuredClone(specification);
  const section = { kind: "pleading_paragraph", heading: "Synthetic direct-consumer control" };
  if (kind === "fields") section.fields = ["personal_impact_statement"];
  if (kind === "body") section.body = "{{personal_impact_statement}}";
  if (kind === "jurat") section.jurat = "{{personal_impact_statement}}";
  if (kind.startsWith("assertion-") || kind === "declaration-same-id") {
    section.kind = kind === "declaration-same-id" ? "declaration" : "pleading_numbered_assertions";
    section.assertions = [{ id: kind === "declaration-same-id" ? "personal-impact" : "synthetic-direct-consumer",
      text: kind === "assertion-facts" ? "Synthetic reference" : "{{personal_impact_statement}}",
      facts: kind === "assertion-text" ? [] : ["personal_impact_statement"] }];
  }
  changed.documents.find(document => document.sections.some(section => section.kind === "pleading_numbered_assertions")).sections.push(section);
  assert.throws(() => composeGradeAPacket(changed, absentNo.matter),
    error => error.missingFactIds?.includes("personal_impact_statement"), kind);
}
const other = structuredClone(specification);
other.routeKey = "ZZ:synthetic-other-route";
other.routeKeys = [other.routeKey];
assert.throws(() => composeGradeAPacket(other, { ...absentNo.matter, routeKey: other.routeKey }),
  error => error.missingFactIds?.includes("personal_impact_statement"), "same fact on another route is not exempt");
for (const id of ["actual_arrest", "release_confirmed"]) for (const value of ["No", "I am not sure"]) {
  assert.throws(() => composeGradeAPacket(specification, {
    ...retainedNo.matter, facts: { ...retainedNo.matter.facts, [id]: value }
  }), /route-specific filing gate/);
}
console.log("PASS: verified MS optional impact branches agree with composition; direct consumers, unknown parents, other routes and arrest/release refusals remain enforced.");
