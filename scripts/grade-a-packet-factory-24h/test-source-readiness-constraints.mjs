import assert from "node:assert/strict";
import fs from "node:fs";
import { applyUnresolvedSourceConstraints as apply } from "./source-readiness-constraints.mjs";
import { applyUserSourceDeterminations } from "./user-source-adoption.mjs";
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
const good = { sourceId: "official-form:4-953", sha256: "a".repeat(64), path: "petition.pdf" };
const wrong = { sourceId: "official-form:4-222", sha256: "b".repeat(64), path: "sixth-district.pdf" };
const readiness = { ready: true, reasons: [], boundSources: [good, wrong], boundCount: 2 };
const decision = { disposition: "SOURCE_BLOCKED", unresolvedObligations: [wrong.sourceId], exactResidual: "District-local, not statewide." };
test("unresolved identity overrides a successful form-number join", () => assert.equal(apply(readiness, decision).ready, false));
test("wrong-scope bytes are not a usable binding", () => assert.deepEqual(apply(readiness, decision).boundSources, [good]));
test("rejected bytes remain attributable instead of disappearing", () => assert.deepEqual(apply(readiness, decision).rejectedBindings, [wrong]));
test("remaining bound count matches accepted bindings", () => assert.equal(apply(readiness, decision).boundCount, 1));
test("the exact recorded scope defect survives", () => assert.ok(apply(readiness, decision).reasons[0].includes(decision.exactResidual)));
test("duplicate copies cannot resolve a rejected identity", () => assert.equal(apply({...readiness, boundSources:[wrong, {...wrong,path:"copy.pdf"}]}, decision).boundCount, 0));
test("missing bytes are also blocked by an unresolved identity", () => assert.equal(apply({...readiness,boundSources:[]},decision).ready,false));
test("unrelated settled family stays untouched", () => assert.equal(apply(readiness,null),readiness));
test("a superseding settled decision removes only this constraint", () => assert.equal(apply(readiness,{...decision,disposition:"SOURCE_READY"}),readiness));
test("source constraints do not mutate their inputs", () => { const before=JSON.stringify({readiness,decision});apply(readiness,decision);assert.equal(JSON.stringify({readiness,decision}),before); });
const historicalDeterminations=JSON.parse(fs.readFileSync("data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json","utf8"));
const determinations=applyUserSourceDeterminations(process.cwd(),historicalDeterminations);
for (const family of determinations.reconciliation42.families.filter(f=>f.unresolvedObligations?.length)) {
  test(`real determination remains enforceable: ${family.familyId}`,()=>assert.equal(apply(readiness,family).ready,false));
}
if (process.argv.includes("--generated")) {
 const master=JSON.parse(fs.readFileSync("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json","utf8"));
 for (const id of ["nm_conviction-set","nm_identity_theft-set","nm_release_without_conviction-set"]) {
  const family=master.families.find(f=>f.familyId===id);
  test(`generated queue honors current exact source scope: ${id}`,()=> {
    assert.equal(family.sourceReadiness.ready,true);
    assert.ok(family.sourceReadiness.boundSources.some(x=>x.sourceId==="official-form:4-222"
      && x.path==="private/source-imports/user-upload-20260911/ef54fbdc9485157d8c85735ff3d66d5a39968ebde68c60de8a7eb094107348de.pdf"
      && x.sha256==="ef54fbdc9485157d8c85735ff3d66d5a39968ebde68c60de8a7eb094107348de"));
    assert.ok(family.failedObligationNames.length>0,"separate measured packet defects must remain");
    assert.notEqual(family.state,"SOURCE_BLOCKED");
  });
 }
}
console.log(JSON.stringify({passed,failed:0,createsApproval:false}));
