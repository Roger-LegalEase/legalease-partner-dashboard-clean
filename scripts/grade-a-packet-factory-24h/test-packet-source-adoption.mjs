import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { assessPacketSourceAdoption } from "./packet-source-adoption.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-packet-source-adoption-"));
const directory = "family";
const expectedSha = "a".repeat(64);
const reconciliation = { requiredPacketSourceBindings: [{ sourceId: "official-form:4-222", sha256: expectedSha }] };
const writeReceipt = (documents) => {
  fs.mkdirSync(path.join(root, directory), { recursive: true });
  fs.writeFileSync(path.join(root, directory, "source-receipt.json"), JSON.stringify({
    schemaVersion: "rcap-family-source-receipt/v1", documents,
  }));
};

try {
  assert.equal(assessPacketSourceAdoption(root, directory, {}), null,
    "an unrelated family with no required binding remains untouched");

  const missingReceipt = assessPacketSourceAdoption(root, directory, reconciliation);
  assert.equal(missingReceipt.ready, false);
  assert.equal(missingReceipt.status, "PACKET_SOURCE_RECEIPT_MISSING_OR_INVALID");

  writeReceipt([{ sourceIds: ["official-form:4-222"], sha256: "b".repeat(64) }]);
  const stale = assessPacketSourceAdoption(root, directory, reconciliation);
  assert.equal(stale.ready, false);
  assert.equal(stale.status, "PACKET_SOURCE_ADOPTION_REQUIRED");
  assert.deepEqual(stale.mismatches[0].observedSha256, ["b".repeat(64)]);

  writeReceipt([{ sourceIds: ["official-form:other"], sha256: expectedSha }]);
  const missingIdentity = assessPacketSourceAdoption(root, directory, reconciliation);
  assert.equal(missingIdentity.ready, false);
  assert.equal(missingIdentity.mismatches[0].mismatch, "SOURCE_ID_MISSING");

  writeReceipt([{ sourceIds: ["official-form:4-222"], sha256: expectedSha }]);
  const current = assessPacketSourceAdoption(root, directory, reconciliation);
  assert.equal(current.ready, true);
  assert.equal(current.status, "PACKET_SOURCE_ADOPTION_CURRENT");
  assert.deepEqual(current.mismatches, []);

  console.log("PASS packet source adoption: missing, stale and current receipt bindings; unrelated family unchanged");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
