#!/usr/bin/env node
//
// Captain-only: freeze the next parallel wave as a shard manifest.
//
// The claim schema records who owns a job. It does not record which shard of
// which wave that ownership belongs to, what the shard's capacity is, or which
// jobs are queued behind it. Adding those fields to a claim would change the
// job manifest, and the job manifest is what the branch fingerprint is computed
// from — a coordination detail would rename a branch out from under a worker,
// which is the exact defect `assignmentClaim` was taken out of the fingerprint
// to fix. So the shard record lives beside the claims rather than inside them,
// and every field here is derived from the live plan.
//
// Two states, kept apart deliberately. An `active` shard is reserved and is
// being worked. A `candidate` shard is the next wave's ranking, computed now so
// the next captain promotes rather than re-ranks from scratch, and it reserves
// nothing.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildFactoryPlan } from "./lib/rcap-factory/index.mjs";
import { assignmentFingerprint, scaffoldKeyFor } from "./lib/rcap-factory/scaffold.mjs";
import { canonicalSha256 } from "./lib/rcap-factory/canonical-json.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const WAVE_SHARD_MANIFEST_PATH =
  "data/record-clearing/production-factory/wave-shard-manifest.json";

/**
 * Wave 3 — the shards this pass freezes.
 *
 * Jobs that already carry a pushed, verified worker completion are deliberately
 * absent from every assignment shard: commissioning one of those is what this
 * wave's discovery command exists to prevent. They are listed in the
 * integration shard instead.
 */
const ACTIVE_SHARDS = [
  {
    shard: "B1",
    lane: "custom_pleading",
    ownerSession: "SESSION_B",
    jobIds: ["rcap-nv-custom-pleading", "rcap-wy-custom-pleading"],
    note:
      "Nevada first: it is an expansion of an integrated implementation, so six of its eight assigned tracks are already built and must stay value-identical. Its incremental scope is nv_seal_probation_family and nv_repository_removal, 14 components."
  },
  {
    shard: "B2",
    lane: "custom_pleading",
    ownerSession: "SESSION_B",
    jobIds: ["rcap-oh-custom-pleading", "rcap-wa-custom-pleading"],
    note: "The two largest clean ready pleading assignments with complete legal design, no active memo correction and no source or venue blocker."
  },
  {
    shard: "C1",
    lane: "guidance_implementation",
    ownerSession: "SESSION_C",
    jobIds: ["rcap-nv-guidance-implementation"],
    note:
      "The corrected Nevada pure-guidance assignment, re-scoped to nv_seal_deferred alone. It is the only ready guidance job in the plan that does not already have a pushed worker completion."
  },
  {
    shard: "C2",
    lane: "guidance_implementation",
    ownerSession: "SESSION_C",
    jobIds: [],
    note:
      "Empty by evidence, not by omission. New Jersey, Texas and Vermont were the next guidance priorities and all three already carry verified worker completions on pushed branches. They are integration work, not assignments, and appear in the INTEGRATION shard."
  },
  {
    shard: "D1",
    lane: "legal_design_normalization",
    ownerSession: "SESSION_D",
    jobIds: [
      "rcap-hi-expungement-stage-one-and-hcjdc-159b-memo-correction",
      "rcap-fl-rule-3-989-sworn-statement-and-3-9895-memo-correction",
      "rcap-il-rule-298-fw-civ-component-remap-memo-correction"
    ],
    note: "Three memo corrections, three different memos. Each unblocks an implementation family."
  },
  {
    shard: "D2",
    lane: "legal_design_normalization",
    ownerSession: "SESSION_D",
    jobIds: ["rcap-hi-stage-one-court-fee-addendum"],
    note:
      "The Hawaii fee addendum owns a decision record, not HI.memo.json, so it can run beside D1's Hawaii memo correction without two jobs owning one memo. It blocks nothing."
  },
  {
    shard: "E1",
    lane: "acroform_fill",
    ownerSession: "SESSION_E",
    jobIds: [],
    note:
      "Empty because no official-PDF implementation job is ready. Every acroform_fill, flat_pdf_overlay and composed_route job in the plan is blocked on a source, licence or edition gate that this pass did not close. Forcing a family ready would put an unresolved source in front of a participant."
  },
  {
    shard: "E2",
    lane: "flat_pdf_overlay",
    ownerSession: "SESSION_E",
    jobIds: [],
    note: "Empty for the same reason as E1."
  },
  {
    shard: "F1",
    lane: "source_acquisition",
    ownerSession: "SESSION_F",
    jobIds: [
      "rcap-fl-public-official-download",
      "rcap-id-shield-revision-and-bci-identity-correction",
      "rcap-il-notice-of-court-date-statewide-role-correction"
    ],
    note: "Families one source decision from readiness, with official evidence available."
  },
  {
    shard: "F2",
    lane: "source_acquisition",
    ownerSession: "SESSION_F",
    jobIds: [
      "rcap-ia-source-identity-resolution-certification-of-service",
      "rcap-me-form-face-title-correction",
      "rcap-mi-mc-227-revision-3-25-correction"
    ],
    note: "Exact source identities and face-of-document corrections."
  },
  {
    shard: "F3",
    lane: "source_acquisition",
    ownerSession: "SESSION_F",
    jobIds: [
      "rcap-mn-in-repo-identity-reconciliation-needs-edition-reclass-not-acquisition",
      "rcap-mn-official-download-automation-blocked",
      "rcap-de-official-download-automation-blocked"
    ],
    note: "In-repository identity reconciliation and blocked-automation dispositions."
  },
  {
    shard: "R1",
    lane: "legal_output_review",
    ownerSession: "SESSION_R1",
    jobIds: [
      "rcap-in-custom-pleading-completed-output-review",
      "rcap-ms-custom-pleading-completed-output-review",
      "rcap-ok-guidance-implementation-completed-output-review",
      "rcap-tn-guidance-implementation-completed-output-review",
      "rcap-nc-guidance-implementation-completed-output-review"
    ],
    reviewKind: "technical_and_visual",
    note:
      "Page inspection may be divided among read-only vision workers; one primary review agent writes the result. The review is not performed by the integration captain, and it does not mark itself complete."
  },
  {
    shard: "R2",
    lane: "legal_output_review",
    ownerSession: "SESSION_R2",
    jobIds: [
      "rcap-ky-guidance-implementation-completed-output-review",
      "rcap-nd-custom-pleading-completed-output-review",
      "rcap-nh-guidance-implementation-completed-output-review",
      "rcap-nm-guidance-implementation-completed-output-review",
      "rcap-ny-guidance-implementation-completed-output-review"
    ],
    reviewKind: "completed_output_legal_review_preparation",
    note:
      "Produces counsel-ready recommendations — adopt, correct or hold. Counsel remains the adopter; this shard may not record adoption and may not mark a packet ready."
  },
  {
    shard: "INTEGRATION",
    lane: "captain",
    ownerSession: "SESSION_A",
    jobIds: [],
    fromDiscovery: true,
    note:
      "Jobs whose completions are already pushed and verified. These are integration work for the next captain, not assignments. Populated from the discovery report rather than by hand."
  }
];

/**
 * Wave 4 — ranked now, reserved by nobody.
 */
const CANDIDATE_SHARDS = [
  {
    shard: "B1",
    lane: "custom_pleading",
    jobIds: ["rcap-ky-custom-pleading", "rcap-va-custom-pleading"]
  },
  {
    shard: "B2",
    lane: "custom_pleading",
    jobIds: ["rcap-ne-custom-pleading", "rcap-nc-custom-pleading"]
  },
  {
    shard: "C1",
    lane: "guidance_implementation",
    jobIds: [],
    note: "No unbuilt guidance assignment remains ready. The lane refills when a memo correction lands."
  },
  {
    shard: "D1",
    lane: "legal_design_normalization",
    jobIds: ["rcap-vt-200-00130-source-identity-resolution"]
  },
  {
    shard: "E1",
    lane: "acroform_fill",
    jobIds: [],
    note: "Refills when the first Edition 1.3 tranche publishes and its families' sources become worker-assignable."
  },
  {
    shard: "F1",
    lane: "source_acquisition",
    jobIds: [
      "rcap-mo-official-download-automation-blocked",
      "rcap-in-commercial-license",
      "rcap-mo-direct-issuer-request"
    ]
  },
  {
    shard: "F2",
    lane: "source_acquisition",
    jobIds: [
      "rcap-az-not-required-design-reconciliation",
      "rcap-fl-not-required-design-reconciliation",
      "rcap-ia-not-required-design-reconciliation"
    ]
  },
  {
    shard: "F3",
    lane: "source_acquisition",
    jobIds: [
      "rcap-ma-attended-retrieval-100k-petition-for-expungement",
      "rcap-ma-attended-retrieval-mps-petition-to-expunge",
      "rcap-ma-attended-retrieval-ocp-petition-to-seal"
    ],
    note: "Attended retrievals. Each needs a person at a terminal, so these are ranked but not promised."
  },
  {
    shard: "R1",
    lane: "legal_output_review",
    jobIds: [
      "rcap-oh-guidance-implementation-completed-output-review",
      "rcap-ri-guidance-implementation-completed-output-review",
      "rcap-sc-custom-pleading-completed-output-review",
      "rcap-wi-custom-pleading-completed-output-review"
    ]
  }
];

const write = process.argv.includes("--write");
const unsupported = process.argv.slice(2).filter((argument) => argument !== "--write");
if (unsupported.length > 0) {
  console.error(`Unsupported arguments: ${unsupported.join(", ")}`);
  process.exit(2);
}

try {
  const plan = buildFactoryPlan({ rootDir: ROOT });
  const byJobId = new Map(plan.jobs.map((job) => [job.jobId, job]));
  const packetSets = readJson(
    "data/record-clearing/legal-design-packet-set-manifests.json"
  );
  const componentsByTrack = new Map(
    (packetSets.manifests ?? packetSets.packetSets ?? []).map((entry) => [
      entry.trackId,
      (entry.components ?? []).length
    ])
  );
  // The committed discovery report, not a scratch file. A shard manifest that
  // read an ignored tmp/ path would produce an empty integration shard on any
  // checkout that had not just run discovery, and "no completions were waiting"
  // is precisely the false statement this wave exists to stop making.
  const discovery = readJsonIfPresent(
    "data/record-clearing/production-factory/completion-discovery.json"
  );
  const alreadyCompleted = new Set(
    (discovery?.jobs ?? [])
      .filter((entry) =>
        [
          "exact_completion",
          "valid_pre_claim_branch",
          "valid_legacy_branch"
        ].includes(entry.classification)
      )
      .map((entry) => entry.jobId)
  );

  const describe = (jobId) => {
    const job = byJobId.get(jobId);
    if (!job) throw new Error(`shard references unknown job ${jobId}`);
    const incrementalTrackIds = Array.isArray(job.implementedTrackIds)
      ? job.trackIds.filter(
          (trackId) => !job.implementedTrackIds.includes(trackId)
        )
      : job.trackIds;
    return {
      jobId,
      lane: job.lane,
      jurisdiction: job.jurisdiction,
      status: job.status,
      semanticFingerprint: assignmentFingerprint(job, job.model),
      branch: `rcap-factory/${scaffoldKeyFor(jobId, { job, model: job.model })}`,
      ownedPaths: [...job.ownedPaths],
      dependencies: [...job.dependencies],
      assignedTrackIds: [...job.trackIds],
      incrementalTrackIds,
      assignedComponents: job.trackIds.reduce(
        (total, trackId) => total + (componentsByTrack.get(trackId) ?? 0),
        0
      ),
      incrementalComponents: incrementalTrackIds.reduce(
        (total, trackId) => total + (componentsByTrack.get(trackId) ?? 0),
        0
      ),
      alreadyHasPushedCompletion: alreadyCompleted.has(jobId)
    };
  };

  const buildShard = (definition, status) => {
    const jobIds = definition.fromDiscovery
      ? [...alreadyCompleted].sort((left, right) => left.localeCompare(right))
      : definition.jobIds;
    const jobs = jobIds.filter((jobId) => byJobId.has(jobId)).map(describe);
    return {
      wave: status === "active" ? 3 : 4,
      shard: definition.shard,
      lane: definition.lane,
      status,
      ...(definition.ownerSession ? { ownerSession: definition.ownerSession } : {}),
      ...(definition.reviewKind ? { reviewKind: definition.reviewKind } : {}),
      ...(definition.note ? { note: definition.note } : {}),
      jobIds: jobs.map((entry) => entry.jobId),
      capacity: {
        jobs: jobs.length,
        assignedTracks: jobs.reduce(
          (total, entry) => total + entry.assignedTrackIds.length,
          0
        ),
        incrementalTracks: jobs.reduce(
          (total, entry) => total + entry.incrementalTrackIds.length,
          0
        ),
        assignedComponents: jobs.reduce(
          (total, entry) => total + entry.assignedComponents,
          0
        ),
        incrementalComponents: jobs.reduce(
          (total, entry) => total + entry.incrementalComponents,
          0
        )
      },
      jobs
    };
  };

  const shards = [
    ...ACTIVE_SHARDS.map((definition) => buildShard(definition, "active")),
    ...CANDIDATE_SHARDS.map((definition) => buildShard(definition, "candidate"))
  ];

  // A job may not be reserved by two active shards, and a candidate may not
  // duplicate an active reservation.
  const activeJobIds = shards
    .filter((shard) => shard.status === "active" && shard.shard !== "INTEGRATION")
    .flatMap((shard) => shard.jobIds);
  const duplicates = activeJobIds.filter(
    (jobId, index) => activeJobIds.indexOf(jobId) !== index
  );
  if (duplicates.length > 0) {
    throw new Error(`a job is reserved by two active shards: ${duplicates.join(", ")}`);
  }
  const candidateOverlap = shards
    .filter((shard) => shard.status === "candidate")
    .flatMap((shard) => shard.jobIds)
    .filter((jobId) => activeJobIds.includes(jobId));
  if (candidateOverlap.length > 0) {
    throw new Error(
      `a candidate shard queues a job that is already active: ${candidateOverlap.join(", ")}`
    );
  }
  // Two active jobs may not own one path.
  const owners = new Map();
  for (const shard of shards) {
    if (shard.status !== "active") continue;
    for (const job of shard.jobs) {
      for (const relativePath of job.ownedPaths) {
        const existing = owners.get(relativePath);
        if (existing && existing !== job.jobId) {
          throw new Error(
            `${relativePath} is owned by both ${existing} and ${job.jobId} in one active wave`
          );
        }
        owners.set(relativePath, job.jobId);
      }
    }
  }

  const manifest = {
    schemaVersion: "rcap-wave-shard-manifest/v1",
    generatedBy: "npm run rcap:freeze-wave-shards",
    note:
      "Shard metadata is recorded here rather than on a claim because a job manifest is what a branch fingerprint is computed from: a coordination field inside the assignment would rename a worker's branch. Nothing here alters a semantic fingerprint or a branch key.",
    reviewShardReservationNote:
      "The claim schema's ownerSession enum is SESSION_B through SESSION_F, and review is none of those. R1 and R2 are therefore reserved here rather than in job-claims.json. This manifest is the reservation of record for them; widening the claim enum would change the job manifest and, through it, worker branch identity.",
    baseline: {
      baseCommit: plan.baseCommit,
      authorityVersion: plan.authorityVersion,
      authorityEdition: plan.authorityEdition
    },
    sourceSnapshot: {
      normalizedTracks: plan.trackReconciliation.normalizedTracks,
      representedExactlyOnce: plan.trackReconciliation.representedExactlyOnce,
      implementationComplete: plan.trackReconciliation.implementationComplete,
      jobs: plan.jobs.length,
      generatedFrom: plan.generatedFrom.map((entry) => ({
        path: entry.path,
        sha256: entry.sha256
      }))
    },
    runtime: {
      packetReady: plan.sourceSummary.runtime.normalizedPacketReadyTracks,
      enabledJurisdictions: plan.sourceSummary.runtime.enabledJurisdictions,
      launchGates: plan.sourceSummary.runtime.launchGates
    },
    totals: {
      activeShards: shards.filter((shard) => shard.status === "active").length,
      candidateShards: shards.filter((shard) => shard.status === "candidate").length,
      activeJobs: activeJobIds.length,
      candidateJobs: shards
        .filter((shard) => shard.status === "candidate")
        .reduce((total, shard) => total + shard.jobIds.length, 0),
      awaitingIntegration:
        shards.find((shard) => shard.shard === "INTEGRATION")?.jobIds.length ?? 0
    },
    shards
  };
  manifest.manifestSha256 = canonicalSha256({ ...manifest });

  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  const absolute = path.join(ROOT, WAVE_SHARD_MANIFEST_PATH);
  if (write) {
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, serialized);
  } else {
    if (!fs.existsSync(absolute)) {
      throw new Error(`${WAVE_SHARD_MANIFEST_PATH} is missing; run with --write.`);
    }
    if (fs.readFileSync(absolute, "utf8") !== serialized) {
      throw new Error(`${WAVE_SHARD_MANIFEST_PATH} is stale; run with --write.`);
    }
  }

  console.log(
    `Wave shard manifest ${write ? "written" : "verified"}: ${WAVE_SHARD_MANIFEST_PATH}`
  );
  for (const shard of manifest.shards) {
    console.log(
      `  ${shard.status === "active" ? "wave 3" : "wave 4"} ${shard.shard.padEnd(12)} ${String(
        shard.capacity.jobs
      ).padStart(2)} job(s) ${String(shard.capacity.incrementalTracks).padStart(
        2
      )} track(s) ${String(shard.capacity.incrementalComponents).padStart(3)} component(s) ${
        shard.ownerSession ?? ""
      }`
    );
  }
  console.log(
    `  awaiting integration rather than assignment: ${manifest.totals.awaitingIntegration}`
  );
} catch (error) {
  console.error(`RCAP wave shard freeze failed: ${error.message}`);
  process.exitCode = 1;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function readJsonIfPresent(relativePath) {
  const absolute = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolute)) return null;
  try {
    return JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch {
    return null;
  }
}
