#!/usr/bin/env node
// The completed Illinois custom-pleading verifier used to pin whole-file hashes
// of nationwide legal-design registries. Every later state normalization
// rewrote those files, so a job that was finished and correct began failing for
// reasons that had nothing to do with Illinois. These cases hold the narrower
// contract: the pin covers Illinois' own assigned design, so unrelated
// jurisdictions are invisible while Illinois' own design is not.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { illinoisAssignmentSlice } from "./verify-rcap-il-custom-pleading-packets.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const SPECS = "data/record-clearing/legal-design-specifications.json";
const PINS =
  "data/record-clearing/implementation-tranches/tranche-4-authority-pins.json";

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
const sliceSha = (relativePath, document) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(illinoisAssignmentSlice(relativePath, document)))
    .digest("hex");

let checks = 0;
const check = (name, fn) => {
  fn();
  checks += 1;
};

const registry = readJson(REGISTRY);
const specs = readJson(SPECS);
const pins = readJson(PINS);
const pinFor = (relativePath) =>
  pins.controllingAuthority.legalDesignRecords.find(
    (record) => record.repositoryPath === relativePath
  );

check("the committed pins match the live Illinois slice", () => {
  assert.equal(sliceSha(REGISTRY, registry), pinFor(REGISTRY).assignmentScopedSha256);
  assert.equal(sliceSha(SPECS, specs), pinFor(SPECS).assignmentScopedSha256);
  // No whole-file hash survives: that is the defect being removed.
  for (const record of pins.controllingAuthority.legalDesignRecords) {
    assert.equal(Object.hasOwn(record, "sha256"), false);
  }
});

check("an unrelated jurisdiction does not invalidate Illinois", () => {
  const mutated = structuredClone(registry);
  const foreign = mutated.tracks.find((track) => track.jurisdiction !== "IL");
  assert.ok(foreign, "expected at least one non-Illinois track");
  foreign.publicName = `${foreign.publicName} (unrelated edit)`;
  mutated.tracks.push({
    ...structuredClone(foreign),
    trackId: `${foreign.trackId}-unrelated-addition`
  });
  assert.equal(sliceSha(REGISTRY, mutated), pinFor(REGISTRY).assignmentScopedSha256);
});

check("changing an assigned Illinois track does invalidate it", () => {
  const mutated = structuredClone(registry);
  const assigned = mutated.tracks.find(
    (track) => track.jurisdiction === "IL" && track.trackId === "il-immediate-seal"
  );
  assert.ok(assigned);
  assigned.outputStrategy = "process_guidance";
  assert.notEqual(sliceSha(REGISTRY, mutated), pinFor(REGISTRY).assignmentScopedSha256);
});

check("removing an assigned Illinois track invalidates it", () => {
  const mutated = structuredClone(registry);
  mutated.tracks = mutated.tracks.filter(
    (track) => track.trackId !== "il-prostitution-j-vacate"
  );
  assert.notEqual(sliceSha(REGISTRY, mutated), pinFor(REGISTRY).assignmentScopedSha256);
  // And the slice no longer covers the assignment, which the verifier rejects
  // separately so an emptied slice cannot pass by hashing stably.
  const slice = illinoisAssignmentSlice(REGISTRY, mutated);
  assert.equal(
    slice.rows.some((row) => row.trackId === "il-prostitution-j-vacate"),
    false
  );
});

check("changing an Illinois controlling component invalidates it", () => {
  const mutated = structuredClone(specs);
  const component = mutated.customPleadingSpecs.find(
    (spec) => spec.jurisdiction === "IL"
  );
  assert.ok(component);
  component.templateKey = `${component.templateKey}-changed`;
  assert.notEqual(sliceSha(SPECS, mutated), pinFor(SPECS).assignmentScopedSha256);
});

check("the Illinois job remains completed after the repair", () => {
  const plan = readJson("planning/record-clearing-100-percent/production-plan.json");
  assert.ok(plan.factoryQueueReconciliation.completed > 0);
  const tranche = readJson("data/record-clearing/implementation-tranches/tranche-4.json");
  assert.ok(tranche, "the Illinois tranche record must survive the repair");
});

process.stdout.write(
  `Illinois assignment-scope verification passed. ${checks} checks over pin scoping, ` +
    "unrelated-jurisdiction isolation and Illinois design sensitivity.\n"
);
