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

const samples = parseSamples(verification.stdout ?? "");
const expectedTrackIds = [...job.trackIds].sort();
const actualTrackIds = samples.map((sample) => sample.trackId).sort();
if (
  samples.length !== expectedTrackIds.length ||
  new Set(actualTrackIds).size !== actualTrackIds.length ||
  JSON.stringify(actualTrackIds) !== JSON.stringify(expectedTrackIds)
) {
  fail(
    `${job.regressionVerifier} emitted ${samples.length} packet hashes for ` +
      `${job.trackIds.length} assigned tracks.`
  );
}

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
  finalPdfCount: samples.length,
  assembledPageCount: samples.reduce(
    (total, sample) => total + sample.assembledPageCount,
    0
  ),
  samplePackets: samples,
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

function parseSamples(stdout) {
  const samples = [];
  for (const line of stdout.split(/\r?\n/)) {
    const colon = line.match(
      /^-\s+(\S+):\s+(\d+)\s+pages\s+([0-9a-f]{64})$/
    );
    const table = line.match(
      /^\s+(\S+)\s+(?:\d+c\s+)?(\d+)p\s+([0-9a-f]{64})$/
    );
    const match = colon ?? table;
    if (!match) {
      const malformedColon =
        /^-\s+\S+:\s+\S+\s+pages?\s+\S+\s*$/.test(line);
      const malformedTable =
        /^\s+\S+\s+(?:\S+c\s+)?\S+p\s+\S+\s*$/.test(line);
      if (malformedColon || malformedTable) {
        fail(`Malformed packet result emitted by the verifier: ${line.trim()}`);
      }
      continue;
    }
    const assembledPageCount = Number(match[2]);
    if (!Number.isInteger(assembledPageCount) || assembledPageCount < 1) {
      fail(`Invalid page count emitted for ${match[1]}.`);
    }
    samples.push({
      trackId: match[1],
      assembledFileName: `${match[1]}-technical-fixture.pdf`,
      assembledSha256: match[3],
      assembledPageCount
    });
  }
  return samples.sort((left, right) =>
    left.trackId.localeCompare(right.trackId)
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
