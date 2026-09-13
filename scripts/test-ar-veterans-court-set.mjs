#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DOCUMENTS, policyFor, resolveSource } from "./build-census-v1-ar-veterans-court-set.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data/rcap-all50/overlays/census-v1/ar/ar-veterans-court-set--official-pdf-fill");
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const json = (p) => JSON.parse(fs.readFileSync(path.join(OUT, p), "utf8"));
const census = json("field-census.census-v1.json");
const receipt = json("source-receipt.json");
const map = json("production-field-map.json");
const actual = json("reports/actual-writes.json");
const rendered = json("reports/rendered-artifacts.json");
const status = json("build-status.json");
const branches = json("reports/conditional-branches.json");
const guides = fs.readFileSync(path.join(OUT, "stage-1-process-guidance.md"), "utf8") + fs.readFileSync(path.join(OUT, "participant-instructions.md"), "utf8");

assert.equal(census.documents.length, 2);
assert.equal(receipt.committedRecords.length, 2);
assert.deepEqual(receipt.committedRecords.map((r) => [r.documentId, r.sha256, r.byteLength]), DOCUMENTS.map((d) => [d.documentId, d.sha256, d.byteLength]));
for (const d of DOCUMENTS) {
  const rec = receipt.committedRecords.find((r) => r.documentId === d.documentId);
  assert.equal(sha(path.join(ROOT, d.repoPath)), d.sha256, `${d.documentId} source hash`);
  assert.equal(fs.statSync(path.join(ROOT, d.repoPath)).size, d.byteLength, `${d.documentId} source length`);
  assert.equal(rec.bindingResult, "BOUND_EXACT");
  const c = census.documents.find((x) => x.documentId === d.documentId);
  const before = JSON.stringify(d);
  const policy = policyFor(d, c);
  assert.equal(JSON.stringify(d), before, `${d.documentId} policy did not mutate input`);
  const ids = c.blanks.map((b) => b.blankId);
  assert.equal(new Set(ids).size, ids.length, `${d.documentId} measured blank IDs are unique`);
  assert.equal(policy.roleRefusals.length + policy.allowed.size, ids.length);
  assert.equal(new Set(policy.roleRefusals.map((r) => r.blankId)).size, policy.roleRefusals.length);
}

// The identity gate rejects every altered role/path/hash/length before bytes can bind.
assert.throws(() => resolveSource({ ...DOCUMENTS[0], documentRole: "PROPOSED_ORDER" }), /SOURCE_BINDING_IDENTITY_MISMATCH/);
assert.throws(() => resolveSource({ ...DOCUMENTS[0], repoPath: DOCUMENTS[1].repoPath }), /SOURCE_BINDING_IDENTITY_MISMATCH/);
assert.throws(() => resolveSource({ ...DOCUMENTS[0], sha256: "0".repeat(64) }), /SOURCE_BINDING_IDENTITY_MISMATCH/);
assert.throws(() => resolveSource({ ...DOCUMENTS[0], byteLength: DOCUMENTS[0].byteLength + 1 }), /SOURCE_BINDING_IDENTITY_MISMATCH/);

const petitionAllowed = new Set(["participant.full_legal_name", "participant.date_of_birth", "matter.case_number", "matter.charge"]);
const orderAllowed = new Set(["participant.full_legal_name", "matter.case_number"]);
for (const row of actual.documents) {
  const allowed = row.documentId === "AR-ACIC-PETITION-VETERANS-COURT" ? petitionAllowed : orderAllowed;
  for (const write of row.valuesReportedByFinalizer) assert.ok(allowed.has(write.factId), `${row.documentId} wrote unexpected ${write.factId}`);
  assert.equal(row.findings.length, 0);
}
assert.ok(map.documents.find((d) => d.documentId === "AR-ACIC-ORDER-VETERANS-COURT").roleRefusals.length >= 40);
assert.ok(map.documents.find((d) => d.documentId === "AR-ACIC-ORDER-VETERANS-COURT").roleRefusals.every((r) => ["court_owned_finding_or_execution", "judge_owned_rehabilitation_finding"].includes(r.class)));
assert.ok(map.documents.find((d) => d.documentId === "AR-ACIC-ORDER-VETERANS-COURT").roleRefusals.some((r) => r.class === "judge_owned_rehabilitation_finding"));
assert.match(guides, /Act 691 of 2025/);
assert.match(guides, /16-90-1601/);
assert.match(guides, /16-90-1602/);
assert.match(guides, /within 3 days/);
assert.match(guides, /30 days/);
assert.match(guides, /\$0/);
assert.match(guides, /post-adjudication/);
assert.match(guides, /same-level cross-court/);
assert.equal(branches.crossCourt.status, "CONDITIONAL_HANDOFF");
assert.equal(branches.postAdjudication.status, "HANDOFF_REQUIRED");
assert.ok(branches.crossCourt.conditions.length >= 4);
assert.ok(branches.actorProtection.judgeFindings.includes("blank"));
assert.match(guides, /stale/);
assert.equal(status.buildStatus, "state_built");
assert.equal(status.independentVerificationStatus, "PENDING");
assert.equal(status.generationAllowed, false);
assert.equal(status.runtimeSelectable, false);
assert.equal(status.productionTouched, false);
for (const a of rendered.artifacts) {
  assert.equal(sha(path.join(ROOT, a.file)), a.sha256, `${a.document}/${a.fixture} artifact hash`);
  assert.equal(fs.statSync(path.join(ROOT, a.file)).size, a.byteLength, `${a.document}/${a.fixture} artifact length`);
}
const report = {
  schemaVersion: "rcap-ar-veterans-focused-self-test/v1", familyId: "ar-veterans-court-set", status: "PASS",
  tests: [
    "exact source SHA-256 and byte-length bindings",
    "role/path/hash/length identity rejection",
    "policy input immutability and unique measured blank IDs",
    "participant fact allowlist and proposed-order actor protection",
    "artifact hash/length proof and pending review non-grants",
    "current-law, service, fee, cross-court and post-adjudication guidance disclosures"
  ],
  sourceHashesUnchanged: true,
  artifactHashesMatchRenderedRecord: true,
  noPacketPassOrProductionAuthority: true
};
fs.writeFileSync(path.join(OUT, "reports/focused-self-test.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
