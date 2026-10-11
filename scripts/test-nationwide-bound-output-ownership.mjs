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
matter.facts.contact_information = "123 Synthetic Service Street, Example City";
matter.facts.residency_or_location = "Synthetic Judicial District";
const packet = composeParticipantDeliveryPacket(spec, matter);
const motion = packet.documents.find((document) => document.documentId === "nd-motion-to-seal");
const order = packet.documents.find((document) => document.documentId === "nd-proposed-order");
assert.ok(motion); assert.ok(order);
for (const document of [motion, order]) {
  assert.ok(document.blocks.some((block) => block.kind === "labelled" && block.label === "County or judicial district" && block.value === matter.facts.residency_or_location));
}
assert.ok(motion.blocks.some((block) => block.kind === "labelled" && block.label === "Service address" && block.value === matter.facts.contact_information));
const signature = motion.blocks.find((block) => block.kind === "signature");
assert.deepEqual(signature.lines, ["Signature", "Date"]);
assert.equal(signature.note, "No notarization is required for this filing.");
assert.equal(order.blocks.find((block) => block.kind === "signature").label, "");
const changed = composeParticipantDeliveryPacket(spec, { ...matter, facts: { ...matter.facts, contact_information: "456 Different Synthetic Service Street" } });
assert.notDeepEqual(changed, packet, "address is an actual output dependency");
for (const id of ["contact_information", "residency_or_location"]) {
  const facts = { ...matter.facts }; delete facts[id];
  assert.throws(() => composeParticipantDeliveryPacket(spec, { ...matter, facts }), /missing|blank/i);
}
const unsupported = structuredClone(spec);
unsupported.documents.find((document) => document.documentId === motion.documentId).sections.find((section) => section.kind === "signature_block").fieldTreatments = { contact_information: "ruled_blank" };
assert.throws(() => composeParticipantDeliveryPacket(unsupported, matter), /unsupported.*signature structure/);
if (process.env.QUESTION_OUTPUT_EVIDENCE_DIR) {
  const { renderGradeAPacketPdf } = await import("../src/lib/rcap/grade-a/renderer.ts");
  const directory = path.resolve(process.env.QUESTION_OUTPUT_EVIDENCE_DIR);
  fs.mkdirSync(directory, { recursive: true });
  await assert.rejects(() => renderGradeAPacketPdf(packet, { variant: "court_only" }), /no resolved caption treatment/);
  fs.writeFileSync(path.join(directory, "nd-composition-and-render-boundary.json"), JSON.stringify({
    scope: "Synthetic composition only. Existing unresolved caption contract still refuses court-only PDF; no commercial output or legal sufficiency claim.",
    motion, order, renderResult: "REFUSED_UNRESOLVED_CAPTION_CONTRACT"
  }, null, 2) + "\n");
  console.log("PASS: existing unresolved ND caption contract still refuses court-only PDF; composition model retained separately. Renderer authority unchanged.");
}
console.log("PASS: three explicit later narrative requirements retain approved family output and genuine missing-contact refusals; ND two captions and service-address dependency are bound without filling signature/court blanks. Structural evidence, not protected legal acceptance.");
