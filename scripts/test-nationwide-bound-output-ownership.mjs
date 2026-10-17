import assert from "node:assert/strict";
import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { packetSpecificationFor } = await import("../src/lib/rcap/grade-a/packet-specification.ts");
const { composeParticipantDeliveryPacket } = await import("../src/lib/rcap/grade-a/participant-packet.ts");
const { packetCollectionFor, editablePacketInputIds } = await import("../src/lib/expungement-ai/packet-information.ts");
const { prepayGateFactIds } = await import("../src/lib/expungement-ai/packet-collection.ts");

function fixture(routeKey) {
  const spec = packetSpecificationFor(routeKey);
  const facts = Object.fromEntries(spec.requiredFacts.map(({ factId }) => [factId, `SYNTHETIC STRUCTURAL ${factId}`]));
  Object.assign(facts, { mailing_address: "123 Synthetic Street", phone_number: "202-555-0100", email_address: "synthetic@example.invalid" });
  return { spec, matter: { routeKey, jurisdiction: routeKey.slice(0, 2), pathwayId: routeKey.slice(3), facts,
    verifiedAt: "2026-10-11T00:00:00.000Z", verificationHash: "structural-test-only", generationPurpose: "internal_review" } };
}

for (const routeKey of ["GA:restriction-and-sealing-of-a-pardoned-felony", "GA:sb-288-misdemeanor-conviction-restriction-and-sealing", "IL:felony-prostitution-relief"]) {
  if (process.env.ND_ONLY === "1") continue;
  const { spec, matter } = fixture(routeKey);
  const factId = routeKey.startsWith("GA:") ? "participant_narrative" : "adverse_consequences";
  const requiredInputIds = spec.requiredFacts.map((fact) => fact.factId);
  assert.ok(requiredInputIds.includes(factId), "authoritative requirement remains");
  const withDraft = composeParticipantDeliveryPacket(spec, matter);
  delete matter.facts[factId];
  assert.deepEqual(composeParticipantDeliveryPacket(spec, matter), withDraft, "actual family output preserves approved blanks");
  const collection = packetCollectionFor({ jurisdiction: matter.jurisdiction, pathwayId: matter.pathwayId, requiredInputIds, screeningAnswers: {}, serverFacts: {} });
  const disposition = collection.facts.find((fact) => fact.factId === factId);
  assert.equal(disposition.actor, "participant_before_filing");
  assert.equal(disposition.collection, "external_actor");
  assert.ok(disposition.reason, "explicit later disposition remains available for handoff");
  assert.equal(prepayGateFactIds(collection).includes(factId), false);
  assert.equal(editablePacketInputIds({ stateCode: matter.jurisdiction, pathwayId: matter.pathwayId, requiredInputIds,
    serverFacts: {}, screeningAnswers: {}, prefilledAnswers: {}, packetAnswers: { [factId]: "Preserved synthetic draft" } }).has(factId), false);
  for (const consumed of ["participant_full_legal_name", "mailing_address", "phone_number", "email_address"]) {
    const missing = { ...matter.facts }; delete missing[consumed];
    assert.throws(() => composeParticipantDeliveryPacket(spec, { ...matter, facts: missing }), /missing|blank/i, `${routeKey}:${consumed}`);
  }
}

const { spec, matter } = fixture("ND:first-offense-possession-sealing");
matter.facts.participant_full_legal_name = "Explicit Synthetic ND Participant";
matter.facts.date_of_birth = "1991-04-17";
matter.facts.contact_information = "123 Synthetic Service Street, Example City";
matter.facts.residency_or_location = "Synthetic Judicial District";
const packet = composeParticipantDeliveryPacket(spec, matter);
const prefix = "nd-marijuana-first-offense-seal-";
assert.deepEqual(packet.documents.map(document => document.documentId), [
  prefix + "primary-filing-1", prefix + "proposed-order-2",
  prefix + "legal-effect-explanation-3", prefix + "filing-instructions-4"
]);
for (const document of packet.documents.slice(0, 2)) {
  assert.equal(document.captionTreatment, "full_independent_caption");
  const caption = document.blocks.find(block => block.kind === "pleading_caption");
  assert.ok(caption);
  assert.ok(caption.courtLines.some(line => line.blank));
  assert.ok(caption.caseNumber.includes("..."));
}
const output = JSON.stringify(packet);
assert.ok(!output.includes(matter.facts.contact_information));
assert.ok(!output.includes(matter.facts.residency_or_location));
assert.ok(output.includes("[C9 - mj county] Which North Dakota county?"));
assert.ok(output.includes("[C10 - mj court type] Was the case in district court or municipal court?"));
assert.ok(output.includes("SIGNATURE OF PETITIONER"));
assert.ok(output.includes("EVERY DECISION ON THIS PAGE IS THE COURT'S"));
for (const id of ["contact_information", "residency_or_location"]) {
  const facts = { ...matter.facts }; delete facts[id];
  assert.deepEqual(composeParticipantDeliveryPacket(spec, { ...matter, facts }), packet);
}
for (const id of ["mailing_address", "phone_number", "email_address"]) {
  const facts = { ...matter.facts }; delete facts[id];
  assert.equal(composeParticipantDeliveryPacket(spec, { ...matter, facts }).documents.length, 4);
}
const unsupported = structuredClone(spec);
unsupported.documents[0].documentContract.serviceTreatment = "participant_serves";
assert.throws(() => composeParticipantDeliveryPacket(unsupported, matter), /unmatched source contracts/);
if (process.env.QUESTION_OUTPUT_EVIDENCE_DIR) {
  const directory = path.resolve(process.env.QUESTION_OUTPUT_EVIDENCE_DIR);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "nd-canonical-composition-boundary.json"), JSON.stringify({
    scope: "Synthetic source composition only. Prior generic caption refusal retained historically; current four-component bridge needs separate owner-bound render acceptance. No commercial output or legal sufficiency claim.",
    documents: packet.documents, renderResult: "NOT_RUN"
  }, null, 2) + "\n");
}
console.log("PASS: existing GA/IL narrative controls retained; ND now uses the exact four-component family, with separate optional contacts, source county/court-type handbacks, and blank execution/court fields. Composition evidence only.");
