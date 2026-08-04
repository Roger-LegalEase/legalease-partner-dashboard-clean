#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  ADOPTION_RECORD_PATHS,
  buildCurrentCounselAdoptionRecords
} from "./lib/rcap-counsel-adoption.mjs";

const rootDir = path.resolve(process.cwd());
const expected = await buildCurrentCounselAdoptionRecords({ rootDir });
let approvedRoutes = 0;

for (const relativePath of ADOPTION_RECORD_PATHS) {
  const actual = JSON.parse(
    fs.readFileSync(path.join(rootDir, relativePath), "utf8")
  );
  const expectedRecord = expected.get(relativePath);
  assert.deepEqual(actual, expectedRecord, `${relativePath} has drifted`);
  assert.equal(actual.status, "counsel_adopted");
  assert.equal(actual.adoptedOn, "2026-08-04");
  assert.equal(actual.approvedByRole, "licensed_counsel");
  assert.equal(
    actual.approvalBasis,
    "counsel_approved_all_current_implemented_legal_output_recommendations"
  );
  assert.equal(actual.counselIdentityReference, null);
  assert.equal(actual.blanketFutureApproval, false);
  assert.equal(actual.productionEnabled, false);
  for (const scope of actual.completedScopes) {
    approvedRoutes += scope.approvedRouteIds.length;
    assert.equal(scope.status, "counsel_adopted");
    assert.equal(scope.runtime.runtimeStatus, "runtime_disabled");
    assert.equal(scope.runtime.generationAllowed, false);
    assert.equal(scope.runtime.packetReady, false);
    assert.equal(scope.runtime.jurisdictionEnabled, false);
    assert.equal(scope.runtime.productionEnabled, false);
    assert.equal(scope.fullCanonicalParentComplete, false);
    assert.match(scope.templateFamilySha256, /^[0-9a-f]{64}$/);
    assert.equal(
      scope.hashBoundScope.schemaVersion,
      "rcap-counsel-adoption-hash-scope/v1"
    );
    assert.equal(Object.hasOwn(scope, "coverage"), false);
    assert.ok(scope.templateHashes.length > 0);
    assert.ok(scope.sourceHashes.length > 0);
    assert.ok(
      scope.sourceHashes.every(
        (entry) =>
          typeof entry.sourceRole === "string" &&
          entry.sourceRole.length > 0
      )
    );
    assert.equal(
      scope.legalDesignSpecificationHashes.length,
      scope.approvedRouteIds.length
    );
    assert.ok(scope.reviewArtifacts.length >= 2);
    assert.ok(scope.representativePackets.length >= scope.approvedRouteIds.length);
    assert.ok(scope.renewalTriggers.includes("final_packet_bytes_except_proven_container_only_changes"));
  }
}

assert.equal(approvedRoutes, 15);
const custom = expected.get(ADOPTION_RECORD_PATHS[0]);
const georgia = custom.completedScopes.find((scope) => scope.jurisdiction === "GA");
assert.deepEqual(georgia.excludedRouteIds, ["ga-jail-k2"]);
assert.deepEqual(
  georgia.preservedCounselQuestions.map((question) => question.id),
  [
    "filing-fee-and-waiver",
    "combined-restriction-and-sealing-motion",
    "municipal-court-reach",
    "otn-absent-at-generation",
    "balancing-posture",
    "hearing-request-in-the-alternative"
  ]
);
assert.ok(
  georgia.knownLimitations.some((entry) =>
    entry.includes("Seven cited, non-generation-target Georgia sources")
  )
);
const maryland = expected.get(ADOPTION_RECORD_PATHS[1]).completedScopes[0];
assert.deepEqual(maryland.approvedRouteIds, ["md_second_chance_shielding"]);
assert.equal(maryland.mappingHashes.length, 2);

console.log(
  "RCAP counsel adoption verification passed: 15 exact routes, hash-bound, runtime disabled."
);
