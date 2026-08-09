#!/usr/bin/env node
// Participant packet-proof sample model — focused schema verification.
//
// A packet proof used to assume one emitted packet per assigned track. Oklahoma,
// Nevada and South Dakota render regression variants as well — a reclassified
// felony, an acquitted non-conviction, a teaching-licence sheet — and counting
// those as tracks would claim legal coverage the design does not have.
//
// These cases hold the partition: canonical samples are the legal coverage, one
// per assigned track; variants are technical evidence hanging off a track that
// already has one. Everything that could blur the two fails closed.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATOR = "scripts/rcap-factory-generate-packet-proof.mjs";
const PROOF_DIR = "data/record-clearing/production-factory/packet-proofs";

let checks = 0;
const check = (name, fn) => {
  fn();
  checks += 1;
};

const generatorSource = fs.readFileSync(path.join(ROOT, GENERATOR), "utf8");

check("the generator partitions canonical samples from variants", () => {
  // The partition is what decides legal coverage, so it has to be explicit in
  // the generator rather than inferred from a fixture-id suffix.
  assert.match(generatorSource, /sampleRole === "canonical"/u);
  assert.match(generatorSource, /sampleRole === "variant"/u);
  assert.match(
    generatorSource,
    /finalPdfCount: canonicalSamples\.length/u,
    "final track coverage must count canonical samples only"
  );
});

check("every assigned track needs exactly one canonical sample", () => {
  assert.match(
    generatorSource,
    /canonicalSamples\.length !== expectedTrackIds\.length/u
  );
  assert.match(
    generatorSource,
    /new Set\(canonicalTrackIds\)\.size !== canonicalTrackIds\.length/u,
    "a duplicate canonical sample for one track must fail"
  );
  assert.match(
    generatorSource,
    /JSON\.stringify\(canonicalTrackIds\) !== JSON\.stringify\(expectedTrackIds\)/u,
    "a canonical sample for an unassigned track must fail"
  );
});

check("a variant must reference an assigned track that has a canonical", () => {
  assert.match(generatorSource, /!assignedTrackIds\.has\(variant\.trackId\)/u);
  assert.match(
    generatorSource,
    /!canonicalTrackIds\.includes\(variant\.trackId\)/u
  );
});

check("indistinguishable duplicate variants fail", () => {
  assert.match(generatorSource, /variantFingerprints/u);
  assert.match(
    generatorSource,
    /new Set\(variantFingerprints\)\.size !== variantFingerprints\.length/u
  );
});

check("variants contribute to fixture and page totals, not to tracks", () => {
  assert.match(generatorSource, /technicalFixtureCount: samples\.length/u);
  assert.match(generatorSource, /technicalFixturePageCount/u);
  assert.match(generatorSource, /variantPacketCount: variantSamples\.length/u);
  // Track coverage is canonical-only in both totals that feed review.
  assert.match(
    generatorSource,
    /assembledPageCount: canonicalSamples\.reduce/u
  );
});

check("a job with no variants writes the record it always wrote", () => {
  // Migration invariant: an unvarying proof gains no keys, so every existing
  // one-sample-per-track proof stays valid without being regenerated.
  assert.match(generatorSource, /variantSamples\.length > 0\n\s*\?\s*\{/u);
  const unvarying = [
    "rcap-ne-guidance-implementation",
    "rcap-nd-guidance-implementation",
    "rcap-ut-guidance-implementation"
  ];
  for (const jobId of unvarying) {
    const proof = JSON.parse(
      fs.readFileSync(path.join(ROOT, PROOF_DIR, `${jobId}.json`), "utf8")
    );
    assert.equal(
      Object.hasOwn(proof, "variantPacketCount"),
      false,
      `${jobId} must not carry variant totals`
    );
    for (const sample of proof.samplePackets) {
      assert.deepEqual(
        Object.keys(sample).sort(),
        [
          "assembledFileName",
          "assembledPageCount",
          "assembledSha256",
          "trackId"
        ],
        `${jobId} sample keys drifted`
      );
    }
    assert.equal(proof.finalPdfCount, proof.samplePackets.length);
  }
});

check("a proof that carries variants states the model explicitly", () => {
  // Nevada advanced from 6/4 to 8/6 when its proof could be regenerated at all.
  // The generator rejected the whole family on one honest verifier row — the
  // automatic-sealing branch, whose correct outcome is that no filing exists and
  // which says so in the digest column — so the committed proof had been frozen
  // at the shape it had before two probation-family fixtures were added. The
  // counts are the verifier's own, not an adjustment.
  const varying = [
    ["rcap-ok-custom-pleading", 8, 3],
    ["rcap-nv-custom-pleading", 8, 6],
    ["rcap-sd-guidance-implementation", 4, 1]
  ];
  for (const [jobId, canonical, variants] of varying) {
    const proofPath = path.join(ROOT, PROOF_DIR, `${jobId}.json`);
    if (!fs.existsSync(proofPath)) continue;
    const proof = JSON.parse(fs.readFileSync(proofPath, "utf8"));
    assert.equal(proof.canonicalPacketCount, canonical, jobId);
    assert.equal(proof.variantPacketCount, variants, jobId);
    assert.equal(proof.finalPdfCount, canonical, `${jobId} track coverage`);
    assert.equal(
      proof.technicalFixtureCount,
      canonical + variants,
      `${jobId} fixture total`
    );
    const canonicalTracks = proof.samplePackets
      .filter((sample) => sample.sampleRole === "canonical")
      .map((sample) => sample.trackId);
    assert.equal(
      new Set(canonicalTracks).size,
      canonicalTracks.length,
      `${jobId} has a duplicate canonical sample`
    );
    for (const sample of proof.samplePackets) {
      assert.ok(
        ["canonical", "variant"].includes(sample.sampleRole),
        `${jobId} sample ${sample.trackId} has no role`
      );
      if (sample.sampleRole === "variant") {
        assert.ok(
          canonicalTracks.includes(sample.variantOfTrackId),
          `${jobId} variant references a track with no canonical sample`
        );
      }
    }
  }
});

check("the three role-emitting verifiers state the role themselves", () => {
  for (const verifier of [
    "scripts/verify-rcap-oklahoma-custom-pleading.mjs",
    "scripts/verify-rcap-nevada-custom-pleading.mjs",
    "scripts/verify-rcap-south-dakota-guidance-implementation.mjs"
  ]) {
    const source = fs.readFileSync(path.join(ROOT, verifier), "utf8");
    assert.match(
      source,
      /sampleRole/u,
      `${verifier} must emit an explicit sample role`
    );
  }
});

check("a worker scaffold still cannot write a packet proof", () => {
  assert.match(generatorSource, /isWorkerScaffoldCheckout/u);
  assert.match(generatorSource, /integration-owned/u);
});

console.log(`Participant packet-proof sample model verified: ${checks} checks.`);
console.log(
  "  canonical samples are legal coverage; variants are technical evidence only"
);
