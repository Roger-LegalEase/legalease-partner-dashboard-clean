import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { classifyBlank } from "./rcap-packet-completeness/completeness-contract.mjs";
import { verifyControllingReservation, RESERVATION_REGISTRY_PATH } from "./rcap-packet-completeness/controlling-record-reservation.mjs";

// The KS 22-4908 KBI cover-sheet DOB, read from the committed family outputs.
const DIR = "data/rcap-all50/overlays/census-v1/ks/ks-22-4908-registration-relief-set--official-pdf-fill";
const read = (f) => JSON.parse(fs.readFileSync(`${DIR}/${f}`, "utf8"));
const maps = read("production-field-map.json").maps;
const receipt = read("source-receipt.json");
const instructions = fs.readFileSync(`${DIR}/participant-instructions.md`, "utf8");
const row = maps.flatMap((m) => m.canonicalRefusals).find((r) => r.controllingReservation);
const blank = { id: row.field, name: row.field, document: row.document, label: row.effectiveLabel, isSelectionControl: false };
const registrySha256 = receipt.committedRecords.find((r) => r.recordId.startsWith("legal-design-track-registry:")).sha256;
const titleOf = (componentId) => receipt.documents.find((d) => d.componentId === componentId)?.officialTitle;
const fixtureWrites = maps.flatMap((m) => [...m.canonicalWrites, ...m.boundaryWrites]).map((w) => ({ document: w.document, field: w.field }));
const inputs = (over = {}) => ({
  root: process.cwd(), claim: row.controllingReservation, blank, registrySha256,
  documentTitle: titleOf(row.controllingReservation.componentId), fixtureWrites, instructions, ...over
});
const declared = (proof, over = {}) => ({ disposition: "PARTICIPANT_RESERVED_BY_CONTROLLING_RECORD", requiredBeforeFiling: false, routeDetermined: false, factId: row.factId, factAvailable: true, controllingReservation: proof, ...over });
const classify = (proof, over = {}, field = blank) => classifyBlank(field, row.reason, null, declared(proof, over)).disposition;

test("the committed KS 4908 cover-sheet DOB reservation verifies and is allowed", () => {
  assert.equal(row.field, "DOB");
  assert.equal(classify(verifyControllingReservation(inputs())), "PARTICIPANT_RESERVED_BY_CONTROLLING_RECORD");
});

test("mutant 1: no manualCompletionItems entry with that item in the bound registry", () => {
  const proof = verifyControllingReservation(inputs({ claim: { ...row.controllingReservation, item: "Year of birth on the order cover sheet" } }));
  assert.match(proof.failure, /no manualCompletionItems entry/);
  assert.equal(classify(proof), "KNOWN_FACT_NOT_WRITTEN");
});

test("mutant 2: the reserved blank is written in one fixture", () => {
  const proof = verifyControllingReservation(inputs({ fixtureWrites: [...fixtureWrites, { document: blank.document, field: blank.id }] }));
  assert.match(proof.failure, /written in at least one fixture/);
  assert.equal(classify(proof), "KNOWN_FACT_NOT_WRITTEN");
});

test("a blank that names no bare field cannot be held against the fixture writes", () => {
  const proof = verifyControllingReservation(inputs({ blank: { ...blank, name: undefined } }));
  assert.match(proof.failure, /names no field/);
});

test("mutant 3: the reserved blank or the registry entry is missing from the disclosure", () => {
  // Each text is removed on its own, so the label check and the entry check are each the only thing refusing.
  for (const drop of [blank.label, row.controllingReservation.item]) {
    const proof = verifyControllingReservation(inputs({ instructions: instructions.replaceAll(drop, "the blank") }));
    assert.match(proof.failure, /missing from the participant disclosure/, drop);
    assert.equal(classify(proof), "KNOWN_FACT_NOT_WRITTEN");
  }
});

test("mutant 4: the reservation is claimed on a component other than the one the registry names", () => {
  const other = "ks-22-4908-registration-relief-primary-filing-1";
  for (const over of [{ claim: { ...row.controllingReservation, componentId: other } }, { documentTitle: titleOf(other) }]) {
    const proof = verifyControllingReservation(inputs(over));
    assert.match(proof.failure, /different component/);
    assert.equal(classify(proof), "KNOWN_FACT_NOT_WRITTEN");
  }
});

test("mutant 5: the registry entry's text is edited, even under a renewed registry pin", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reservation-registry-"));
  try {
    const registry = JSON.parse(fs.readFileSync(RESERVATION_REGISTRY_PATH, "utf8"));
    const entry = registry.tracks.find((t) => t.trackId === row.controllingReservation.trackId).manualCompletionItems
      .find((e) => e.item === row.controllingReservation.item);
    entry.why = "Left for the participant.";
    const bytes = Buffer.from(JSON.stringify(registry));
    fs.mkdirSync(path.dirname(path.join(root, RESERVATION_REGISTRY_PATH)), { recursive: true });
    fs.writeFileSync(path.join(root, RESERVATION_REGISTRY_PATH), bytes);
    for (const [pin, why] of [[registrySha256, /does not bind the registry bytes/], [crypto.createHash("sha256").update(bytes).digest("hex"), /text is not the text/]]) {
      const proof = verifyControllingReservation(inputs({ root, registrySha256: pin }));
      assert.match(proof.failure, why);
      assert.equal(classify(proof), "KNOWN_FACT_NOT_WRITTEN");
    }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("registry bytes other than the ones the packet pins are not the bound registry", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reservation-registry-"));
  try {
    const registry = JSON.parse(fs.readFileSync(RESERVATION_REGISTRY_PATH, "utf8"));
    registry.note = `${registry.note ?? ""} (edited)`;
    fs.mkdirSync(path.dirname(path.join(root, RESERVATION_REGISTRY_PATH)), { recursive: true });
    fs.writeFileSync(path.join(root, RESERVATION_REGISTRY_PATH), JSON.stringify(registry));
    const proof = verifyControllingReservation(inputs({ root }));
    assert.match(proof.failure, /does not bind the registry bytes/);
    assert.equal(classify(proof), "KNOWN_FACT_NOT_WRITTEN");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a serialized proof, a required-before-filing declaration or an election is never a reservation", () => {
  const proof = verifyControllingReservation(inputs());
  assert.equal(classify(JSON.parse(JSON.stringify(proof))), "KNOWN_FACT_NOT_WRITTEN");
  assert.equal(classify(proof, { requiredBeforeFiling: true }), "KNOWN_FACT_NOT_WRITTEN");
  assert.equal(classify(proof, { disposition: "REQUIRED_BEFORE_FILING" }), "KNOWN_FACT_NOT_WRITTEN");
  assert.equal(classify(proof, {}, { ...blank, isSelectionControl: true }), "ROUTE_OPTION_NOT_SELECTED");
});

test("auditFamily refuses the reservation when a bare DOB write appears in actual-writes (A1) or the cover-sheet canonicalWrites (A2)", async () => {
  // Imported here: the corpus reader needs the master-library environment; the tests above do not.
  const { auditPreparedInputs } = await import("./rcap-packet-completeness/verify-packet-completeness.mjs");
  const real = { fieldMap: read("production-field-map.json"), actualWrites: read("reports/actual-writes.json"),
    rendered: read("reports/rendered-artifacts.json"), receipt, census: read("field-census.census-v1.json"),
    approval: read("approval-request.json"), instructions };
  const audit = (mutate) => { const p = structuredClone(real); mutate(p); return auditPreparedInputs(DIR, "ks-22-4908-registration-relief-set", p); };
  const dob = { field: "DOB", document: blank.document, documentId: blank.document, value: "02/14/1999" };
  const reserved = (r) => (r.controllingReservationMeasurements ?? []).filter((m) => m.document === blank.document);

  const control = audit(() => {});
  assert.equal(control.result, "PASS_COMPLETE");
  assert.equal(reserved(control).length, 1, "the committed reservation verifies on the reader path");

  const a1 = audit((p) => p.actualWrites.documents.find((d) => d.documentId === blank.document).actualWrites.push(dob));
  const a2 = audit((p) => p.fieldMap.maps.find((m) => m.documentId === blank.document).canonicalWrites.push(dob));
  for (const [name, r] of [["A1", a1], ["A2", a2]]) {
    assert.equal(reserved(r).length, 0, `${name}: a written DOB is not a reservation`);
    assert.notEqual(r.result, "PASS_COMPLETE", `${name}: the audit fails`);
    assert.ok(r.findings.some((f) => f.counter === "knownRequiredFieldsMissing" && String(f.field).endsWith(":DOB")), `${name}: the DOB is a known fact not written`);
  }
});
