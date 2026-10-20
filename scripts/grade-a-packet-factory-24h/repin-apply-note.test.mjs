// A refresh applied under a ruling records that ruling in its block (appliedUnder),
// so the receipt itself says why it refreshed without a measured row; the block
// stays a source-identity note and reads as unmoved.
//
//   node --test scripts/grade-a-packet-factory-24h/repin-apply-note.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { composeRefreshedReceipt, readsAsUnmoved } from "./repin-lapsed-source-identities.mjs";
import { annotationIsSourceBound } from "../rcap-packet-completeness/identity-refresh.mjs";

const REC = "data/record-clearing/legal-design-track-registry.json";
const receipt = { schemaVersion: "test", familyId: "test-family", committedRecords: [{ pathInRepository: REC, sha256: "a".repeat(64), byteLength: 1 }] };
const beforeText = `${JSON.stringify(receipt, null, 2)}\n`;
const plan = { familyId: "test-family", receiptPath: "x/source-receipt.json", beforeText, records: [{
  path: REC, was: { sha256: "a".repeat(64), byteLength: 1 }, becomes: { sha256: "b".repeat(64), byteLength: 2 },
  anchorsCompared: 1, anchorsIdentical: 1, anchorDetail: ["x: identical"], identicalAnchorSha256: { x: "c".repeat(64) },
  canonicalisation: "test", scope: { anchorIds: ["x"], derivation: {} }, entriesThatMovedInThisRecord: [], recovery: "test", on: new Date("2026-10-20T00:00:00Z") }] };

test("a note is recorded as appliedUnder and the block stays source-bound and unmoved", () => {
  const note = "no measured row; route-scoped anchors identical; fingerprint-only rule; SERVICE still owed";
  const { text } = composeRefreshedReceipt(plan, { note });
  const block = JSON.parse(text).committedRecords[0].identityRefresh;
  assert.equal(block.appliedUnder, note);
  assert.equal(annotationIsSourceBound(block).ok, true);
  assert.equal(readsAsUnmoved(beforeText, text).ok, true);
});

test("without a note the block carries no appliedUnder", () => {
  const { text } = composeRefreshedReceipt(plan);
  assert.equal("appliedUnder" in JSON.parse(text).committedRecords[0].identityRefresh, false);
});
