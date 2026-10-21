import assert from "node:assert/strict";
import fs from "node:fs";
import { withIllinoisRegistry } from "./test-rcap-il-authority-fixture.mjs";
const { packetFulfillmentAuthority } = await import("../src/lib/expungement-ai/packet-fulfillment-authority.ts");
const { fulfillmentAuthorityFor } = await import("../src/lib/rcap/fulfillment/grade-a-admission.ts");
const route = "IL:felony-prostitution-relief";
const binding = { trackId: "il-prostitution-j-vacate", packetFamilyId: "il-prostitution-j-vacate-set" };
const lookup = (selected = binding, state = "IL", pathway = "felony-prostitution-relief") => packetFulfillmentAuthority(state, pathway, "packet generation", selected);
assert.equal(JSON.parse(fs.readFileSync("data/rcap-ledger/packet-fulfillment-records.json")).records.some((r) => r.routeKey === route), false);
await withIllinoisRegistry(async () => {
  const decision = lookup();
  assert.equal(decision.allowed, true, JSON.stringify(decision));
  assert.equal(decision.record.artifactProvider, "rcap_grade_a_composer_v1");
  assert.equal(decision.record.packetSpecificationId, "il-felony-prostitution-relief");
  assert.equal(decision.record.packetFamily, binding.packetFamilyId);
  for (const trackId of [undefined, null, "*", "il-prostitution-j-auto"]) {
    assert.equal(lookup({ ...binding, trackId }).allowed, false);
  }
  for (const packetFamilyId of [null, "*", "il-prostitution-j-auto-set"]) {
    assert.equal(lookup({ ...binding, packetFamilyId }).allowed, false);
  }
  assert.equal(lookup(binding, "TX").allowed, false);
  assert.equal(lookup(binding, "IL", "*").allowed, false);
});
const mutations = {
  missing: (f) => { f.document.records = []; },
  revoked: (f) => { f.document.records[0].revocation = { revoked: true, reason: "synthetic revocation", revokedBy: "test", revokedAt: "2026-09-05" }; },
  stale: (f) => { f.observation.fixtureSha256 = "f".repeat(64); },
  incomplete: (f) => { f.document.records[0].packetCompleteness = null; },
  superseded: (f) => { f.document.records[0].supersededBy = "synthetic-successor"; },
  wrongFamily: (f) => { f.document.records[0].packetFamilyId = "il-prostitution-j-auto-set"; },
  wildcardRoute: (f) => { f.document.records[0].routeId = "IL:*"; },
  wrongSpecification: (f) => { f.document.records[0].packetSpecification.sha256 = f.observation.packetSpecificationSha256 = "a".repeat(64); }
};
for (const [name, mutation] of Object.entries(mutations)) {
  await withIllinoisRegistry(async () => assert.equal(lookup().allowed, false, name), mutation);
}
const current = fulfillmentAuthorityFor(route);
assert.equal(lookup().allowed, current.commercialStatus === "commercially_eligible");
if (current.state === "REVOKED") assert.match(lookup().reason, /REVOKED/);
console.log(`Consumer authority: synthetic valid and 15 negative bindings PASS; committed registry ${current.state}, allowed=${lookup().allowed}`);
