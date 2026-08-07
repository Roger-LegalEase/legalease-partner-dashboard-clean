#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  loadFactoryPlan,
  loadJob
} from "./lib/rcap-factory/index.mjs";
import { isWorkerScaffoldCheckout } from "./lib/rcap-factory/validation.mjs";

const ROOT = path.resolve(process.cwd());
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const jobId = args[0];

if (args.length !== 1) {
  fail("Usage: node scripts/rcap-factory-generate-packet-proof.mjs <jobId>");
}
if (
  fs.existsSync(path.join(ROOT, "tmp/rcap-factory/job.json")) ||
  isWorkerScaffoldCheckout(ROOT)
) {
  fail(
    "Participant packet proofs are integration-owned; refusing generation from a worker scaffold."
  );
}

const plan = await loadFactoryPlan({ rootDir: ROOT, root: ROOT });
const productionPlan = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "planning/record-clearing-100-percent/production-plan.json"
    ),
    "utf8"
  )
);
const repositoryRoot = gitOutput(["rev-parse", "--show-toplevel"]);
const currentBranch = gitOutput(["branch", "--show-current"]);
if (
  path.resolve(repositoryRoot) !== ROOT ||
  typeof productionPlan.branch !== "string" ||
  currentBranch !== productionPlan.branch
) {
  fail(
    `Participant packet proofs may run only from the integration checkout on ${productionPlan.branch}; ` +
      `found ${currentBranch || "detached HEAD"} at ${repositoryRoot || ROOT}.`
  );
}
const loaded = await loadJob(jobId, { rootDir: ROOT, root: ROOT });
const job = loaded?.job ?? loaded;

if (!job || job.status !== "completed") {
  fail(`${jobId} is not a completed factory job.`);
}
if (job.participantPacketProofRequired !== true) {
  fail(`${jobId} does not require participant packet proof.`);
}
if (!job.regressionVerifier) {
  fail(`${jobId} has no committed regression verifier.`);
}
if (!/^[0-9a-f]{40}$/.test(job.completionCommit ?? "")) {
  fail(`${jobId} has no exact completion commit.`);
}
if (!gitObjectExists(`HEAD:${job.regressionVerifier}`)) {
  fail(`${job.regressionVerifier} is not committed at HEAD.`);
}

const proofPath =
  `data/record-clearing/production-factory/packet-proofs/${jobId}.json`;
if (!(job.integrationOwnedOutputs ?? []).includes(proofPath)) {
  fail(`${proofPath} is not an integration-owned output for ${jobId}.`);
}

const verification = spawnSync(
  process.execPath,
  [path.join(ROOT, job.regressionVerifier)],
  {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    env: {
      ...process.env,
      RCAP_FACTORY_VALIDATION_SCOPE: "integration"
    }
  }
);
if (verification.status !== 0) {
  process.stderr.write(verification.stdout ?? "");
  process.stderr.write(verification.stderr ?? "");
  fail(`${job.regressionVerifier} failed; packet proof was not written.`);
}

// Canonical samples are the legal coverage: one final assembled packet for each
// assigned track, no more and no fewer. A regression variant is extra technical
// evidence for a conditional branch of a track that already has a canonical
// sample — Oklahoma's reclassified felony, Nevada's acquitted non-conviction,
// South Dakota's teaching-licence sheet. Counting a variant as a track would
// claim legal coverage the design does not have, so variants are partitioned
// out of track coverage and counted only as fixtures and pages.
const samples = parseSamples(verification.stdout ?? "");
const canonicalSamples = samples.filter(
  (sample) => sample.sampleRole === "canonical"
);
const variantSamples = samples.filter(
  (sample) => sample.sampleRole === "variant"
);
const assignedTrackIds = new Set(job.trackIds);
const expectedTrackIds = [...job.trackIds].sort();
const canonicalTrackIds = canonicalSamples.map((sample) => sample.trackId).sort();

if (
  canonicalSamples.length !== expectedTrackIds.length ||
  new Set(canonicalTrackIds).size !== canonicalTrackIds.length ||
  JSON.stringify(canonicalTrackIds) !== JSON.stringify(expectedTrackIds)
) {
  fail(
    `${job.regressionVerifier} emitted ${canonicalSamples.length} canonical ` +
      `packet hashes for ${job.trackIds.length} assigned tracks; each assigned ` +
      "track needs exactly one canonical final packet."
  );
}
for (const variant of variantSamples) {
  if (!assignedTrackIds.has(variant.trackId)) {
    fail(
      `${variant.fixtureId ?? variant.trackId} is a variant of ${variant.trackId}, ` +
        "which this job is not assigned."
    );
  }
  if (!canonicalTrackIds.includes(variant.trackId)) {
    fail(
      `${variant.fixtureId ?? variant.trackId} is a variant of ${variant.trackId}, ` +
        "which has no canonical sample."
    );
  }
}
// Two variants of one track that render the same bytes prove the same thing
// twice and cannot be told apart in review.
const variantFingerprints = variantSamples.map(
  (variant) => `${variant.trackId}|${variant.assembledSha256}`
);
if (new Set(variantFingerprints).size !== variantFingerprints.length) {
  fail(
    `${job.regressionVerifier} emitted indistinguishable duplicate variants.`
  );
}

// A job with no variants writes exactly the record it always wrote, so every
// existing one-sample-per-track proof stays valid without regeneration.
const variantEvidence =
  variantSamples.length > 0
    ? {
        canonicalPacketCount: canonicalSamples.length,
        variantPacketCount: variantSamples.length,
        technicalFixtureCount: samples.length,
        technicalFixturePageCount: samples.reduce(
          (total, sample) => total + sample.assembledPageCount,
          0
        )
      }
    : {};
const samplePackets =
  variantSamples.length > 0
    ? samples.map((sample) => ({
        trackId: sample.trackId,
        ...(sample.fixtureId ? { fixtureId: sample.fixtureId } : {}),
        sampleRole: sample.sampleRole,
        ...(sample.sampleRole === "variant"
          ? {
              variantOfTrackId: sample.trackId,
              ...(sample.variantPurpose
                ? { variantPurpose: sample.variantPurpose }
                : {})
            }
          : {}),
        assembledFileName: sample.assembledFileName,
        assembledSha256: sample.assembledSha256,
        assembledPageCount: sample.assembledPageCount
      }))
    : samples.map((sample) => ({
        trackId: sample.trackId,
        assembledFileName: sample.assembledFileName,
        assembledSha256: sample.assembledSha256,
        assembledPageCount: sample.assembledPageCount
      }));

const proof = {
  schemaVersion: "rcap-participant-packet-proof/v1",
  jobId: job.jobId,
  parentJobId: job.parentJobId,
  jurisdiction: job.jurisdiction,
  completionCommit: job.completionCommit,
  authorityEdition: plan.authorityEdition,
  verifier: {
    path: job.regressionVerifier,
    sha256: fileSha256(path.join(ROOT, job.regressionVerifier)),
    result: "passed"
  },
  implementationOutputs: job.expectedOutputs.map((relativePath) => ({
    path: relativePath,
    sha256: fileSha256(path.join(ROOT, relativePath))
  })),
  // Final track coverage counts canonical samples only. Variants are recorded
  // beside them, never inside them.
  finalPdfCount: canonicalSamples.length,
  assembledPageCount: canonicalSamples.reduce(
    (total, sample) => total + sample.assembledPageCount,
    0
  ),
  ...variantEvidence,
  samplePackets,
  deterministic: true,
  generatedPacketBytesTracked: false,
  runtimeStatus: "runtime_disabled",
  visualProof: "pending",
  counselAdopted: false,
  productionEnabled: false
};

const absoluteProofPath = path.join(ROOT, proofPath);
fs.mkdirSync(path.dirname(absoluteProofPath), { recursive: true });
fs.writeFileSync(absoluteProofPath, `${JSON.stringify(proof, null, 2)}\n`);

console.log(`RCAP participant packet proof generated: ${jobId}`);
console.log(`Tracked proof: ${proofPath}`);
console.log(
  `${proof.finalPdfCount} packet(s), ${proof.assembledPageCount} page(s)`
);

/**
 * Reads the result rows a focused verifier prints.
 *
 * A verifier that renders regression variants states each row's role itself, so
 * the canonical/variant partition is derived from the verifier that rendered
 * the bytes rather than guessed downstream from a fixture-id suffix. A verifier
 * that emits one packet per track says nothing about roles, and every one of
 * its rows is canonical — which is what the older formats below mean.
 */
function parseSamples(stdout) {
  const samples = [];
  for (const line of stdout.split(/\r?\n/)) {
    // Role-bearing custom-pleading form:
    //   ok-felony-reclassified-2  ok_18_19_felony_conviction  variant  2 components  6 pages  sha256=<64 hex>
    const roleLabelled = line.match(
      /^\s+(\S+)\s+(\S+)\s+(canonical|variant)\s+\d+\s+components?\s+(\d+)\s+pages?\s+sha256=([0-9a-f]{64})$/
    );
    // Role-bearing guidance form:
    //   sd_sis_sealing  variant  12p  <64 hex>
    const roleTable = line.match(
      /^\s+(\S+)\s+(canonical|variant)\s+(\d+)p\s+([0-9a-f]{64})$/
    );
    const colon = line.match(
      /^-\s+(\S+):\s+(\d+)\s+pages\s+([0-9a-f]{64})$/
    );
    const table = line.match(
      /^\s+(\S+)\s+(?:\d+c\s+)?(\d+)p\s+([0-9a-f]{64})$/
    );
    // Labelled table form, emitted by the custom-pleading verifiers:
    //   tx_exp_dismissed  3 components  7 pages  sha256=<64 hex>
    const labelled = line.match(
      /^\s+(\S+)\s+\d+\s+components?\s+(\d+)\s+pages?\s+sha256=([0-9a-f]{64})$/
    );

    let parsed = null;
    if (roleLabelled) {
      parsed = {
        fixtureId: roleLabelled[1],
        trackId: roleLabelled[2],
        sampleRole: roleLabelled[3],
        assembledPageCount: Number(roleLabelled[4]),
        assembledSha256: roleLabelled[5]
      };
    } else if (roleTable) {
      parsed = {
        fixtureId: null,
        trackId: roleTable[1],
        sampleRole: roleTable[2],
        assembledPageCount: Number(roleTable[3]),
        assembledSha256: roleTable[4]
      };
    } else if (colon ?? table ?? labelled) {
      const match = colon ?? table ?? labelled;
      parsed = {
        fixtureId: null,
        trackId: match[1],
        sampleRole: "canonical",
        assembledPageCount: Number(match[2]),
        assembledSha256: match[3]
      };
    }

    if (!parsed) {
      const malformedColon =
        /^-\s+\S+:\s+\S+\s+pages?\s+\S+\s*$/.test(line);
      const malformedTable =
        /^\s+\S+\s+(?:\S+c\s+)?\S+p\s+\S+\s*$/.test(line);
      const malformedLabelled =
        /^\s+\S+\s+\S+\s+components?\s+\S+\s+pages?\s+sha256=\S*$/.test(line);
      const malformedRole =
        /^\s+\S+\s+(?:\S+\s+)?(?:canonical|variant)\s+\S+/.test(line);
      if (
        malformedColon ||
        malformedTable ||
        malformedLabelled ||
        malformedRole
      ) {
        fail(`Malformed packet result emitted by the verifier: ${line.trim()}`);
      }
      continue;
    }
    if (
      !Number.isInteger(parsed.assembledPageCount) ||
      parsed.assembledPageCount < 1
    ) {
      fail(`Invalid page count emitted for ${parsed.fixtureId ?? parsed.trackId}.`);
    }
    samples.push({
      ...parsed,
      assembledFileName: `${parsed.fixtureId ?? parsed.trackId}-technical-fixture.pdf`
    });
  }
  // Canonical rows sort by track so an unvarying job keeps its existing order;
  // a variant sorts immediately after the canonical sample it belongs to.
  return samples.sort(
    (left, right) =>
      left.trackId.localeCompare(right.trackId) ||
      left.sampleRole.localeCompare(right.sampleRole) ||
      (left.fixtureId ?? "").localeCompare(right.fixtureId ?? "")
  );
}

function gitOutput(args) {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8"
  });
  if (result.status !== 0 || result.error) {
    fail(
      result.error?.message ||
        result.stderr?.trim() ||
        `git ${args.join(" ")} failed.`
    );
  }
  return result.stdout.trim();
}

function gitObjectExists(specification) {
  return (
    spawnSync(
      "git",
      ["cat-file", "-e", specification],
      { cwd: ROOT, encoding: "utf8" }
    ).status === 0
  );
}

function fileSha256(absolutePath) {
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    fail(`Expected proof input is missing: ${path.relative(ROOT, absolutePath)}`);
  }
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(absolutePath))
    .digest("hex");
}

function fail(message) {
  console.error(`RCAP participant packet proof generation failed: ${message}`);
  process.exit(1);
}
