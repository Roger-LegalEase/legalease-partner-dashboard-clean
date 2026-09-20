#!/usr/bin/env node
/**
 * The derivation reconciliation, driven against every way it could be abused.
 *
 * `verify-specification-derivation-reconciliation.mjs` proves the reconciliation
 * is true. This proves the exit it opens is narrow: that each condition carries
 * weight, and that nothing but a recorded, matching, still-true reconciliation
 * moves a specification digest.
 *
 * Every case runs the real consumer over an edited copy of the real evidence,
 * in a scratch tree, so a refusal is attributable to the field it changed.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {
  derivationReconciledSpecificationSha256, assertDerivationRecord, reconciledSpecificationDigests,
  DERIVATION_RECONCILIATION_PATH as RECONCILIATION
} from "./lib/specification-derivation-reconciliation.mjs";

const root = process.cwd();
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const record = JSON.parse(fs.readFileSync(RECONCILIATION, "utf8"));
let passed = 0;
const check = (label, run) => { run(); passed += 1; console.log(`PASS ${label}`); };

/** The real consumer, reading from a scratch tree that may hold an edited record. */
function loadFrom(scratch, family, overrides = {}) {
  const readBytes = (rel) => fs.readFileSync(path.join(scratch, rel));
  return derivationReconciledSpecificationSha256({
    familyId: family.familyId,
    routeId: family.routeIds[0],
    specificationPath: family.specificationPath,
    specificationBytes: readBytes(family.specificationPath),
    recordSpecificationSha256: family.priorSpecificationSha256,
    readBytes,
    ...overrides
  });
}

/** A scratch tree holding the reconciliation, the specifications and the artifacts. */
function scratchTree(edited) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "spec-derivation-"));
  const copy = (rel) => {
    fs.mkdirSync(path.dirname(path.join(scratch, rel)), { recursive: true });
    fs.copyFileSync(path.join(root, rel), path.join(scratch, rel));
  };
  for (const family of record.families) {
    copy(family.specificationPath);
    for (const artifact of family.approvedArtifacts) copy(artifact.path);
    for (const providerPath of family.providerPaths) copy(providerPath);
  }
  fs.mkdirSync(path.dirname(path.join(scratch, RECONCILIATION)), { recursive: true });
  if (edited === undefined) copy(RECONCILIATION);
  else fs.writeFileSync(path.join(scratch, RECONCILIATION), `${JSON.stringify(edited, null, 2)}\n`);
  return scratch;
}

const family = record.families.find((entry) => entry.familyId === "ms-misd-addl-set");
const clone = () => JSON.parse(JSON.stringify(record));

try {
  const control = scratchTree();
  check("the real reconciliation admits the current specification", () => {
    const result = loadFrom(control, family);
    assert.ok(result, "the reconciliation refused its own family");
    assert.equal(result.specificationSha256, family.currentSpecificationSha256);
    assert.equal(result.createsApproval, false);
    assert.equal(result.approvesComposedOutput, false);
    assert.equal(result.changesApprovedArtifacts, false);
  });
  check("it declines a family it does not name rather than throwing", () => {
    assert.equal(loadFrom(control, { ...family, familyId: "not-a-family" }), null);
  });
  check("it refuses a route the family does not name", () => {
    assert.throws(() => loadFrom(control, family, { routeId: "MS:some-other-route" }), /does not reconcile/);
  });
  check("it refuses a starting digest the record does not hold", () => {
    assert.throws(() => loadFrom(control, family, { recordSpecificationSha256: "0".repeat(64) }),
      /starts from a specification digest the record does not hold/);
  });
  fs.rmSync(control, { recursive: true, force: true });

  // Editing the evidence at all breaks its byte pin, which is the first gate.
  check("it refuses evidence whose bytes were edited", () => {
    const edited = clone();
    edited.families[0].currentSpecificationSha256 = "0".repeat(64);
    const scratch = scratchTree(edited);
    try { assert.throws(() => loadFrom(scratch, family), /reconciliation bytes changed/); }
    finally { fs.rmSync(scratch, { recursive: true, force: true }); }
  });

  /*
   * Past the byte pin, every substantive condition is driven directly against
   * the record, so each refusal is attributable to the field it changed. Going
   * through the pinned entry point would refuse all of them for the same
   * reason -- the edited bytes -- and prove nothing about any condition.
   */
  const conditions = {
    "a record that claims to create an approval": (r) => { r.createsApproval = true; },
    "a record that claims to approve the composed output": (r) => { r.approvesComposedOutput = true; },
    "a record that claims to open a route": (r) => { r.opensAnyRoute = true; },
    "a record that claims publication proof": (r) => { r.establishesProviderOrPublicationProof = true; },
    "a record that claims the approved artifacts changed": (r) => { r.changesApprovedArtifacts = true; },
    "a record of another schema": (r) => { r.schemaVersion = "something-else/v1"; },
    "a record of another identity": (r) => { r.recordId = "SPEC-DERIVATION-RECONCILIATION-9999-01-01"; },
    "a build host recorded as reading the specification": (r) => {
      r.families.find((f) => f.familyId === family.familyId).buildHostReadsSpecification = true;
    },
    "an approved artifact recorded as changed": (r) => {
      r.families.find((f) => f.familyId === family.familyId).approvedArtifacts[0].bytesUnchanged = false;
    },
    "an approved artifact digest that is not the artifact on disk": (r) => {
      r.families.find((f) => f.familyId === family.familyId).approvedArtifacts[0].sha256 = "0".repeat(64);
    },
    "a family that names no approved artifact": (r) => {
      r.families.find((f) => f.familyId === family.familyId).approvedArtifacts = [];
    },
    "a prior specification that could already produce a packet": (r) => {
      r.families.find((f) => f.familyId === family.familyId).priorSpecificationProducesAPacket = true;
    },
    "a current specification that cannot produce a packet": (r) => {
      r.families.find((f) => f.familyId === family.familyId).currentSpecificationProducesAPacket = false;
    },
    "an assertion that is not in the owner-approved artifact": (r) => {
      r.families.find((f) => f.familyId === family.familyId)
        .transcriptionFidelity.notFoundVerbatim.push({ text: "INVENTED", classification: "UNEXPLAINED" });
    },
    "a reconciliation to the same digest": (r) => {
      const f = r.families.find((entry) => entry.familyId === family.familyId);
      f.priorSpecificationSha256 = f.currentSpecificationSha256;
    },
    "a family named twice": (r) => {
      r.families.push(JSON.parse(JSON.stringify(r.families.find((f) => f.familyId === family.familyId))));
    },
    "a different specification path": (r) => {
      r.families.find((f) => f.familyId === family.familyId).specificationPath =
        "data/record-clearing/packet-specifications/WY-felony-conviction-expungement.v1.json";
    }
  };

  const conditionScratch = scratchTree();
  const readScratch = (rel) => fs.readFileSync(path.join(conditionScratch, rel));
  check("the unedited record is admitted (control for the refusals below)", () => {
    assert.ok(assertDerivationRecord({
      record: clone(), familyId: family.familyId, routeId: family.routeIds[0],
      specificationPath: family.specificationPath,
      specificationBytes: readScratch(family.specificationPath),
      recordSpecificationSha256: family.priorSpecificationSha256, readBytes: readScratch
    }));
  });
  for (const [label, mutate] of Object.entries(conditions)) {
    const edited = clone();
    mutate(edited);
    check(`refuses ${label}`, () => {
      assert.throws(() => assertDerivationRecord({
        record: edited, familyId: family.familyId, routeId: family.routeIds[0],
        specificationPath: family.specificationPath,
        specificationBytes: readScratch(family.specificationPath),
        recordSpecificationSha256: family.priorSpecificationSha256, readBytes: readScratch
      }), /specification derivation/);
    });
  }
  fs.rmSync(conditionScratch, { recursive: true, force: true });

  check("a build host that starts reading the specification refuses", () => {
    const scratch = scratchTree();
    try {
      const providerPath = family.providerPaths[0];
      fs.appendFileSync(path.join(scratch, providerPath),
        "\n// data/record-clearing/packet-specifications/touched\n");
      assert.throws(() => loadFrom(scratch, family), /now reads the packet specification/);
    } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
  });

  check("an approved artifact whose bytes move refuses", () => {
    const scratch = scratchTree();
    try {
      fs.appendFileSync(path.join(scratch, family.approvedArtifacts[0].path), "\n");
      assert.throws(() => loadFrom(scratch, family), /no longer the approved artifact/);
    } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
  });

  check("a specification that moves past the reconciled digest refuses", () => {
    const scratch = scratchTree();
    try {
      fs.appendFileSync(path.join(scratch, family.specificationPath), "\n");
      assert.throws(() => loadFrom(scratch, family), /not the one it reconciles to/);
    } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
  });

  check("the digest map covers every reconciled route and nothing else", () => {
    const map = reconciledSpecificationDigests((rel) => fs.readFileSync(path.join(root, rel)));
    const routes = record.families.flatMap((f) => f.routeIds);
    assert.equal(map.size, routes.length);
    for (const routeId of routes) assert.ok(map.has(routeId), routeId);
  });
} finally { /* scratch trees are removed per case */ }

console.log(`${passed}/${passed} derivation-reconciliation controls passed; no approval, route or publication proof is created by any of them.`);
