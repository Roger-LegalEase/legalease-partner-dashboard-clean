import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CT_DESTRUCTION, CT_PROVISIONAL, CT_ABSOLUTE, WA_AUTOMATIC, GA_GUIDANCE,
  GA_PETITION, WA_GUIDANCE_ROUTES, WA_MOTION_ROUTE,
  loadTreatmentReconciliations, reconcileFamilyBuildInputs, preserveTreatmentAcceptance
} from "./treatment-reconciliation.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const queue = read("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json");
const census = read("data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json");
const treatments = loadTreatmentReconciliations(root);
assert.equal(treatments.size, 5);
const originalIds = queue.families.map(row => row.familyId);
const projected = queue.families.map(row => ({ ...row,
  ...reconcileFamilyBuildInputs({ familyId: row.familyId,
    routes: row.routeKeys.map(key => census.routes.find(route => route.routeKey === key)),
    implementationStrategy: row.implementationStrategy, sourceReconciliation: row.sourceReconciliation
  }, treatments)
}));
assert.deepEqual(projected.map(row => row.familyId), originalIds, "no family may disappear, appear or change identity");
assert.equal(new Set(originalIds).size, 346);
for (const familyId of [CT_DESTRUCTION, CT_PROVISIONAL, CT_ABSOLUTE]) {
  const row = projected.find(row => row.familyId === familyId);
  assert.equal(row.implementationStrategy, "process_guidance");
  assert.equal(row.treatment.stages[0].participantFilesGeneratedOutput, false);
  assert.equal(row.treatment.separateParticipantAction.dischargedByGuide, false);
  assert.equal(row.state, queue.families.find(item => item.familyId === familyId).state);
}
const washington = projected.find(row => row.familyId === WA_AUTOMATIC);
assert.deepEqual(washington.routes.map(row => row.routeKey), WA_GUIDANCE_ROUTES);
assert.deepEqual(washington.sourceReconciliation.additionalRequiredSourceIds, []);
assert.ok(washington.routes.every(row => row.processActor === "court" && !row.participantCanInitiate));
assert.equal(washington.treatment.preservedSeparateObligations[0].routeKey, WA_MOTION_ROUTE);
assert.equal(washington.treatment.preservedSeparateObligations[0].dischargedByThisFamily, false);
assert.ok(census.routes.some(row => row.routeKey === WA_MOTION_ROUTE && row.participantCanInitiate));
const georgia = projected.find(row => row.familyId === GA_GUIDANCE).treatment;
assert.deepEqual(georgia.stages.map(row => row.outputKind), ["process_guidance", "custom_pleading", "process_guidance"]);
assert.equal(georgia.stages[1].familyId, GA_PETITION);
assert.ok(originalIds.includes(GA_PETITION), "reuse the actual existing petition family; do not create another identity");
assert.ok(georgia.stages.every(row => row.familyId !== "ga-nonconv-pre2013-set"));
for (const row of projected.filter(row => !treatments.has(row.familyId))) {
  const original = queue.families.find(item => item.familyId === row.familyId);
  assert.equal(row.implementationStrategy, original.implementationStrategy);
  assert.equal(row.sourceReconciliation, original.sourceReconciliation);
  assert.equal(row.state, original.state);
}
for (const treatment of treatments.values()) {
  for (const state of ["LEGITIMATE_GUIDANCE_ONLY", "GUIDANCE_READY", "VERIFIED_PASS", "COMPLETE_PACKET_PROVEN"]) {
    assert.equal(preserveTreatmentAcceptance(state, treatment), "PRODUCT_PATH_PENDING", "mapping must not earn a guide/stage acceptance");
  }
  for (const state of ["FAIL_REPAIR_REQUIRED", "SOURCE_BLOCKED", "PRODUCT_PATH_PENDING", "LEGAL_BLOCKED"]) {
    assert.equal(preserveTreatmentAcceptance(state, treatment), state, "preserve measured failures");
  }
}
assert.equal(preserveTreatmentAcceptance("COMPLETE_PACKET_PROVEN", null), "COMPLETE_PACKET_PROVEN");
console.log("Treatment reconciliation: all 346 identities preserved; CT guidance scopes, WA court/motion separation, GA three owed stages and no terminal grants verified.");
