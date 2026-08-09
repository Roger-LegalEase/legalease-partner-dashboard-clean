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

// What the packet set declares, and what this implementation actually renders.
//
// A proof that reports four rendered components and stops is read as a finished
// packet. Wyoming is where that became visible: wy_nc_1401 declares five
// required components, four of them custom pleading and the fifth
// process_guidance, and the custom-pleading implementation renders four. The
// packet is real, deterministic and reviewable, and it is not what the
// participant files, because a required component of its own set has no
// implementation yet.
//
// Derived from the committed packet-set manifest and the job's own lane, so it
// applies to every family on the same terms and states rather than implies the
// distinction between an implemented component, a component owned by another
// lane, technical fixtures and a filing-complete packet.
const componentScope = buildComponentScope();
const assembledFilingSet = buildAssembledFilingSet(componentScope);
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
  ...(componentScope ? { componentScope } : {}),
  ...(assembledFilingSet ? { assembledFilingSet } : {}),
  samplePackets,
  deterministic: true,
  generatedPacketBytesTracked: false,
  runtimeStatus: "runtime_disabled",
  // What this proof is, and what it is not, stated rather than inferred.
  // A packet proof is the technical evidence: the verifier ran, the packets
  // assembled deterministically, the pages are what they say they are. It is
  // not a reading of the finished document by a person, it is not a legal
  // review of the completed output, and it is not a readiness claim. Those are
  // separate work with separate owners, and a reader should not have to derive
  // their absence from the absence of a field.
  technicalEvidence: "complete",
  visualProof: "pending",
  visualReview: "formal_visual_review_pending",
  completedOutputLegalReview: "pending",
  counselAdopted: false,
  packetReady: false,
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

    // A fixture the design deliberately produces no filing for.
    //
    // Nevada's automatic-sealing branch is a real, exercised fixture whose
    // correct outcome is that no packet exists: the court seals the record
    // without a filing, so there is nothing to assemble and nothing to hash.
    // Its verifier says exactly that in the sha256 column, which is honest and
    // which the row parsers below cannot read, so the whole family's proof
    // could not be regenerated at all.
    //
    // It is admitted as a declared non-packet rather than as a packet: it must
    // state zero components and zero pages, it contributes no sample, and it
    // relaxes nothing for a row that claims a packet. A row claiming components
    // or pages without a digest is still malformed and still fails.
    const declaredNonPacket = line.match(
      /^\s+(\S+)\s+(\S+)\s+(?:canonical|variant)\s+0\s+components?\s+0\s+pages?\s+sha256=(?![0-9a-f]{64}$)\S.*$/
    );
    if (declaredNonPacket) continue;

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


/**
 * Declared-versus-implemented components for every assigned track.
 *
 * `null` where the packet-set manifest carries no set for the assigned tracks,
 * so a family the manifest does not describe records nothing rather than
 * recording a guess. Absence of a declaration is never read as completeness.
 */
/**
 * The job that builds one component, from the live plan.
 *
 * Three ways a job can claim a component and no more: naming it directly in
 * `implementationComponentIds`, carrying it in an official-PDF assignment, or
 * owning the whole guidance track it belongs to. A component nobody claims
 * returns null, which is a gap rather than a silence.
 */
function ownerOfComponent(component) {
  const claimants = [];
  for (const entry of plan.jobs ?? []) {
    if (entry.status === "cancelled") continue;
    if (entry.jobId === job.jobId) continue;
    if ((entry.implementationComponentIds ?? []).includes(component.componentId)) {
      claimants.push(entry);
      continue;
    }
    if (
      (entry.officialPdfAssignment?.componentUses ?? []).some(
        (use) => use.componentId === component.componentId
      )
    ) {
      claimants.push(entry);
      continue;
    }
    if (
      entry.lane === "guidance_implementation" &&
      !entry.implementationComponentIds &&
      (entry.trackIds ?? []).includes(component.trackId) &&
      component.outputStrategy === "process_guidance"
    ) {
      claimants.push(entry);
    }
  }
  if (claimants.length !== 1) return null;
  const owner = claimants[0];
  return {
    jobId: owner.jobId,
    lane: owner.lane,
    status: owner.status,
    completionCommit: owner.completionCommit ?? null
  };
}

function buildComponentScope() {
  const manifestPath = path.join(
    ROOT,
    "data/record-clearing/legal-design-packet-set-manifests.json"
  );
  if (!fs.existsSync(manifestPath)) return null;
  let sets;
  try {
    sets = JSON.parse(fs.readFileSync(manifestPath, "utf8")).packetSets ?? [];
  } catch {
    return null;
  }
  // The output strategy this job's lane implements. A lane the map does not
  // name implements nothing this can classify, and says so by returning null
  // rather than by treating every declared component as implemented.
  const laneStrategy = {
    custom_pleading: "custom_pleading",
    guidance_implementation: "process_guidance",
    acroform_fill: "official_pdf_fill",
    flat_pdf_overlay: "official_pdf_fill"
  }[job.lane];
  if (!laneStrategy) return null;

  const tracks = [];
  for (const trackId of [...job.trackIds].sort()) {
    const set = sets.find((entry) => entry.trackId === trackId);
    if (!set) continue;
    const describe = (component) => ({
      componentId: component.componentId,
      trackId,
      role: component.role,
      order: component.order,
      requirement: component.requirement,
      outputStrategy: component.outputStrategy
    });
    const implemented = (set.components ?? [])
      .filter((component) => component.outputStrategy === laneStrategy)
      .map(describe);
    const excluded = (set.components ?? [])
      .filter((component) => component.outputStrategy !== laneStrategy)
      .map((component) => ({
        ...describe(component),
        excludedBecause:
          `declared under ${component.outputStrategy}, which this ${job.lane} ` +
          "implementation does not own"
      }));
    const outstanding = excluded.filter(
      (component) => component.requirement === "required"
    );
    // Who builds the components this lane does not, and whether they have.
    //
    // "Excluded from this lane" and "nobody is building it" are different
    // facts, and reporting only the first reads a delivered component as a gap.
    // Wyoming is the case: its filing-instructions component belongs to the
    // guidance lane, that lane has an owner and the owner has delivered, and
    // the track is component-complete while this proof's own assembled output
    // is still four documents of five.
    const elsewhere = excluded.map((component) => {
      const owner = ownerOfComponent(component);
      return {
        ...component,
        ...(owner
          ? {
              implementedBy: owner.jobId,
              implementedByLane: owner.lane,
              implementationStatus: owner.status,
              ...(owner.completionCommit
                ? { implementationCommit: owner.completionCommit }
                : {})
            }
          : { implementedBy: null, implementationStatus: "no_owner" })
      };
    });
    const unowned = elsewhere.filter(
      (component) =>
        component.requirement === "required" &&
        component.implementationStatus !== "completed"
    );
    tracks.push({
      trackId,
      packetSetId: set.packetSetId,
      declaredComponentCount: (set.components ?? []).length,
      implementedComponents: implemented,
      excludedComponents: elsewhere,
      // This lane's own coverage. Unchanged in meaning: false wherever a
      // required component of the track is built somewhere else.
      filingComplete: outstanding.length === 0,
      ...(outstanding.length > 0
        ? {
            filingCompleteBlockedBy: outstanding.map(
              (component) => component.componentId
            )
          }
        : {}),
      // The track's own question, and a different one: does every required
      // component have an integrated implementation, in whatever lane owns it.
      componentImplementationComplete: unowned.length === 0,
      ...(unowned.length > 0
        ? {
            componentImplementationBlockedBy: unowned.map(
              (component) => component.componentId
            )
          }
        : {}),
      // The page set, split by what the participant does with it. A guidance
      // sheet travels in the packet and is not filed; a pleading is filed. The
      // split is read from each component's declared role and strategy, so it
      // cannot drift from the packet set.
      courtFilingComponents: (set.components ?? [])
        .filter((component) => component.outputStrategy !== "process_guidance")
        .map((component) => component.componentId),
      participantOnlyComponents: (set.components ?? [])
        .filter((component) => component.outputStrategy === "process_guidance")
        .map((component) => component.componentId)
    });
  }
  if (tracks.length === 0) return null;
  return {
    basis:
      "data/record-clearing/legal-design-packet-set-manifests.json — declared " +
      "components per track, partitioned by the output strategy this job's lane " +
      "implements.",
    implementedOutputStrategy: laneStrategy,
    filingComplete: tracks.every((track) => track.filingComplete),
    filingCompleteMeaning:
      "False means a required component of the track's own packet set is not " +
      "implemented here, so the assembled fixture is technical evidence and is " +
      "not the complete filing. It says nothing about legal review, counsel " +
      "adoption, packet readiness or runtime, which remain separate and closed.",
    tracks
  };
}

/**
 * The assembled packet as the participant receives it, across every lane.
 *
 * This proof's own verifier renders the components this lane owns, so on a
 * multi-lane track its page count is the lane's and not the packet's. Wyoming's
 * custom-pleading verifier assembles four documents and nine pages; the packet
 * the participant receives is five components and thirteen pages, and the
 * verifier that proves that belongs to the guidance lane.
 *
 * So the other lane's committed verifier is run and its published figures are
 * read. Nothing is recomputed here and nothing is assumed: where a verifier
 * publishes no assembled figure, this records that it publishes none rather
 * than inventing one, and where it publishes no digest, no digest is asserted.
 */
function buildAssembledFilingSet(scope) {
  if (!scope) return null;
  const contributors = new Map();
  for (const track of scope.tracks) {
    for (const component of track.excludedComponents ?? []) {
      if (component.implementationStatus !== "completed") continue;
      if (!component.implementedBy) continue;
      contributors.set(component.implementedBy, track.trackId);
    }
  }
  if (contributors.size === 0) return null;

  const lanes = [];
  for (const [jobId, trackId] of [...contributors.entries()].sort()) {
    const contributor = (plan.jobs ?? []).find((entry) => entry.jobId === jobId);
    if (!contributor?.regressionVerifier) continue;
    const run = spawnSync(
      process.execPath,
      [path.join(ROOT, contributor.regressionVerifier)],
      {
        cwd: ROOT,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, RCAP_TECHNICAL_FIXTURES_ENABLED: "true" }
      }
    );
    if (run.status !== 0) {
      fail(
        `${contributor.regressionVerifier} did not pass, so its assembled figures cannot be recorded.`
      );
    }
    const output = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
    // The one line the guidance lane publishes its assembled figures on. Read
    // strictly: a shape this does not match records nothing rather than a guess.
    const context = output.match(
      /(\d+)\s+components?\s+in\s+order\s+1-(\d+),\s+assembled\s+to\s+(\d+)\s+pages,\s+with\s+the\s+sheet\s+at\s+pages\s+(\d+)-(\d+)\s+and\s+(\d+)\s+pages?\s+of\s+its\s+own/u
    );
    lanes.push({
      trackId,
      contributedBy: jobId,
      lane: contributor.lane,
      verifier: {
        path: contributor.regressionVerifier,
        sha256: fileSha256(path.join(ROOT, contributor.regressionVerifier)),
        result: "passed"
      },
      ...(context
        ? {
            assembledComponentCount: Number(context[1]),
            assembledPageCount: Number(context[3]),
            contributedPageRange: {
              startPage: Number(context[4]),
              endPage: Number(context[5])
            },
            contributedPageCount: Number(context[6])
          }
        : {
            assembledFiguresPublished: false,
            assembledFiguresNote:
              "This verifier publishes no assembled component or page figure in a readable form, so none is recorded."
          }),
      assembledSha256: null,
      assembledSha256Note:
        "No committed verifier publishes a digest for the assembled multi-lane packet. It is deterministic — the contributing verifier proves byte-identical output across two runs — but it is not published, so none is asserted here."
    });
  }
  if (lanes.length === 0) return null;
  return {
    meaning:
      "The packet the participant receives, assembled across every lane that contributes to the track. It is not this proof's own page count, which covers only the components this lane renders.",
    lanes
  };
}
