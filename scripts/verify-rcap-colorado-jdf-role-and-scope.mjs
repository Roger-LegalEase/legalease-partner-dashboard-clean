#!/usr/bin/env node
// Colorado JDF 2370 / JDF 2371 role and scope regression.
//
// Two mistakes produced the same visible symptom — a Colorado sealing track
// whose primary filing pointed at a document that cannot be filed — and both
// are the kind that come back quietly.
//
// The first is role substitution. JDF 2370 is the issuer's guide. It is
// participant-facing, it is retained by the adopted edition, and it sits right
// next to the motion in the same statutory family, which is exactly what makes
// it an easy stand-in. A guide cannot satisfy a primary_filing component, and
// nothing about being retained, being current or being participant-facing
// changes that.
//
// The second is a scope heuristic reading a certificate-of-service address
// block as evidence that a form is court-specific. Every Colorado motion
// served on the district attorney carries city, state and ZIP fields,
// including statewide Judicial Department forms. The tell is the sibling: JDF
// 2370 has no service block and the same scanner scored it statewide.
//
// This asserts the corrected facts and the boundary around them. It does not
// assert that the Colorado family is ready — it is not, and this file is not
// where that would be decided.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const read = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));

const DECISION_PATH =
  "data/record-clearing/production-factory/source-acquisition/" +
  "rcap-co-jdf-2370-role-and-jdf-2371-mapping-correction.json";
const REGISTRY_PATH = "data/record-clearing/source-artifact-registry.json";
const JDF_2371_ARTIFACT_ID =
  "jdf-2371-motion-to-seal-conviction-records-conduct-no-longer-prohibited-rev-2025-07-01";
const JDF_2370_ARTIFACT_ID =
  "jdf-2370-guide-to-sealing-conviction-records-conduct-no-longer-prohibited-rev-2025-07-01";

const checks = [];
let failures = 0;

function check(name, run) {
  try {
    run();
    checks.push(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    checks.push(`FAIL ${name}: ${error.message}`);
  }
}

const decision = read(DECISION_PATH);
const registry = read(REGISTRY_PATH);
const artifactById = new Map(
  registry.artifacts.map((artifact) => [artifact.artifactId, artifact])
);
const identityByKey = new Map(
  decision.identities.map((identity) => [identity.identityKey, identity])
);

check("JDF 2370 is instructions and cannot carry a participant filing", () => {
  const guide = identityByKey.get("CO:JDF-2370:INSTRUCTIONS:EN");
  assert.ok(guide, "the JDF 2370 identity is absent from the decision");
  assert.equal(guide.legalRole, "INSTRUCTIONS");
  assert.equal(guide.assetClass, "instructions");
  assert.equal(guide.roleVerdict, "instructions_confirmed");
  assert.equal(guide.signatureBlockPresent, false);
  assert.equal(guide.terminalDisposition, "role_mismatch");
});

check("JDF 2371 is the motion the participant files", () => {
  const motion = identityByKey.get("CO:JDF-2371:MOTION:EN");
  assert.ok(motion, "the JDF 2371 identity is absent from the decision");
  assert.equal(motion.legalRole, "MOTION");
  assert.equal(motion.assetClass, "packet_form");
  assert.equal(motion.roleVerdict, "primary_filing_carrier_confirmed");
  assert.equal(motion.signatureBlockPresent, true);
});

check("the motion slot names JDF 2371 and only JDF 2371", () => {
  const binding = decision.roleAndMappingResolution.correctBinding;
  assert.equal(binding.componentId, "co_decriminalized_conduct_seal-primary-filing-1");
  assert.equal(binding.documentId, "JDF-2371");
  assert.equal(binding.workflowKey, "CO:JDF-2371:MOTION:EN");
  const defect = decision.roleAndMappingResolution.defectConfirmed;
  assert.equal(defect.currentlyBoundDocumentId, "JDF-2370");
  assert.equal(defect.defect, "authority_role_mismatch");
  // The two documents stay distinct, and neither is confused with another JDF
  // family. JDF 2374 keeps the order slot it already held.
  const set = decision.roleAndMappingResolution.formSetOfRecord;
  assert.deepEqual(
    set.map((entry) => [entry.documentId, entry.role]),
    [
      ["JDF-2370", "INSTRUCTIONS"],
      ["JDF-2371", "MOTION"],
      ["JDF-2374", "ORDER"]
    ]
  );
  for (const unrelated of ["JDF-417", "JDF-418", "JDF-684"]) {
    assert.ok(
      !set.some((entry) => entry.documentId === unrelated),
      `${unrelated} was swept into the conduct-no-longer-prohibited set`
    );
  }
});

check("a service address block does not make a statewide form local", () => {
  const motion = artifactById.get(JDF_2371_ARTIFACT_ID);
  assert.ok(motion, "the JDF 2371 registry row is absent");
  // The marker is still recorded — the form really does carry a service block.
  // What changed is that the block no longer decides the scope.
  assert.deepEqual(motion.geographicMarkers, ["service_city_state_zip"]);
  assert.equal(motion.geographicScope, "statewide");
  assert.notEqual(motion.currency, "local_only");
  assert.equal(motion.scannerGeographicScope, "court_specific");
  assert.match(motion.geographicScopeCorrectionBasis, /service/i);

  const guide = artifactById.get(JDF_2370_ARTIFACT_ID);
  assert.ok(guide, "the JDF 2370 registry row is absent");
  assert.equal(guide.geographicScope, "statewide");
  assert.deepEqual(guide.geographicMarkers, []);

  assert.equal(decision.scopeFinding.verdict, "statewide_scope_confirmed");
});

check("no unrelated Colorado scope row moved", () => {
  // The correction is keyed to one artifact id. Every other Colorado row keeps
  // whatever the scanner gave it, including the ten that remain court-specific:
  // a general rule about service blocks would have rescoped all of them.
  // Scoped to Colorado. Other jurisdictions carry their own corrections — the
  // Hawaii HCJDC application hit the same false positive — and this regression
  // is about Colorado not being rescoped by side effect, not about being the
  // only correction in the repository.
  const corrected = registry.artifacts.filter(
    (artifact) =>
      artifact.jurisdiction === "CO" &&
      artifact.geographicScopeCorrectionBasis !== undefined
  );
  assert.deepEqual(
    corrected.map((artifact) => artifact.artifactId),
    [JDF_2371_ARTIFACT_ID]
  );
  const coloradoCourtSpecific = registry.artifacts.filter(
    (artifact) =>
      artifact.jurisdiction === "CO" &&
      artifact.geographicScope === "court_specific"
  );
  assert.equal(coloradoCourtSpecific.length, 10);
});

check("unmeasured technical values are not recorded as zero", () => {
  const motion = identityByKey.get("CO:JDF-2371:MOTION:EN");
  // Never measured. Null says so; 0 would be a measurement, and a field map
  // keyed on a zero denominator is worse than one that refuses to build.
  assert.equal(motion.terminalFields, null);
  assert.equal(motion.widgets, null);
  assert.notEqual(motion.terminalFields, 0);
  assert.notEqual(motion.widgets, 0);
  assert.equal(motion.logicalFields, 51);
  assert.match(motion.technicalMeasurementCaveat, /terminal/i);
});

check("the licence stays unresolved and public download is not permission", () => {
  assert.equal(decision.license.status, "unresolved_and_outside_this_assignment");
  assert.equal(decision.license.reproductionInPaidPacketDetermined, false);
  assert.equal(decision.license.commercialExclusionApplied, false);
});

check("no source was materialized and no edition amendment was claimed", () => {
  for (const identity of decision.identities) {
    assert.equal(identity.materializationState, "not_materialized_no_receipt");
  }
  assert.equal(decision.method.receiptsCreated, 0);
  assert.equal(decision.method.binariesMaterialized, 0);
  assert.equal(decision.edition13Impact.editionAmendmentRequired, false);
  assert.equal(decision.edition13Impact.publicationPerformed, false);
  assert.equal(decision.edition13Impact.edition12Treatment, "immutable_unchanged");
});

process.stdout.write(`${checks.join("\n")}\n`);
if (failures > 0) {
  process.stderr.write(
    `\nColorado JDF role-and-scope regression failed: ${failures} check(s).\n`
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    "\nColorado JDF role-and-scope regression passed.\n"
  );
}
