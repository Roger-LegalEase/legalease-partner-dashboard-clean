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
 * Wave 4 — the shards this pass freezes.
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
    jobIds: ["rcap-wy-custom-pleading", "rcap-hi-custom-pleading"],
    note:
      "Wyoming carries over unfinished. Hawaii is promoted: its stage-one filing vehicle was the longest-standing legal-design blocker in the plan and the integrated memo correction closed it, so the five conviction tracks are buildable for the first time."
  },
  {
    shard: "B2",
    lane: "custom_pleading",
    ownerSession: "SESSION_B",
    jobIds: ["rcap-oh-custom-pleading", "rcap-wa-custom-pleading"],
    note: "Carried over unfinished from the previous wave; not reranked."
  },
  {
    shard: "B3",
    lane: "custom_pleading",
    ownerSession: "SESSION_B",
    jobIds: ["rcap-ky-custom-pleading", "rcap-va-custom-pleading"],
    note:
      "Promoted from the previous wave's candidate ranking without reranking. Nebraska is deliberately not promoted: its memo still carries unresolved venue and packet-component questions, and its branch is a lease."
  },
  {
    shard: "C1",
    lane: "guidance_implementation",
    ownerSession: "SESSION_C",
    jobIds: [],
    note:
      "The guidance lane is exhausted: no guidance implementation job in the plan is ready. Every one is either completed or blocked behind a legal-design question. It refills when a memo correction lands, not before."
  },
  {
    shard: "D1",
    lane: "legal_design_normalization",
    ownerSession: "SESSION_D",
    jobIds: ["rcap-vt-200-00130-source-identity-resolution"],
    note:
      "The only ready legal-design job left. Every memo correction this wave commissioned is integrated."
  },
  {
    shard: "E1",
    lane: "acroform_fill",
    ownerSession: "SESSION_E",
    jobIds: [],
    note:
      "Still empty. No acroform_fill, flat_pdf_overlay or composed_route job is ready: each remains blocked on an authority asset the adopted edition does not manifest. Session E cannot start until the first Edition 1.3 tranche publishes."
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
      "rcap-mn-official-download-automation-blocked",
      "rcap-de-official-download-automation-blocked"
    ],
    note: "Carried over unfinished; not reranked."
  },
  {
    shard: "F2",
    lane: "source_acquisition",
    ownerSession: "SESSION_F",
    jobIds: [
      "rcap-mo-official-download-automation-blocked",
      "rcap-in-commercial-license",
      "rcap-mo-direct-issuer-request"
    ],
    note: "Promoted from the previous wave's candidate ranking."
  },
  {
    shard: "F3",
    lane: "source_acquisition",
    ownerSession: "SESSION_F",
    jobIds: [
      "rcap-fl-not-required-design-reconciliation",
      "rcap-ia-in-repo-identity-reconciliation-already-retained-under-another-identity",
      "rcap-ia-not-required-design-reconciliation"
    ],
    note:
      "Promoted from the previous wave's candidate ranking. All three had lease branches at the start of this pass and no worker commit; they are reissued to the same shard rather than recommissioned elsewhere."
  },
  {
    shard: "R1",
    lane: "legal_output_review",
    ownerSession: "SESSION_R1",
    jobIds: [
      "rcap-ks-custom-pleading-completed-output-review",
      "rcap-mo-custom-pleading-completed-output-review",
      "rcap-wv-custom-pleading-completed-output-review",
      "rcap-nj-guidance-implementation-completed-output-review",
      "rcap-tx-guidance-implementation-completed-output-review"
    ],
    reviewKind: "technical_and_visual",
    note:
      "Refilled: R1 delivered its first five results this pass, three technically approved and two returned correction_required. This shard reviews the wave-3 implementations."
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
      "Carried over unfinished; not reranked. Produces counsel-ready recommendations only — counsel remains the adopter."
  },
  {
    shard: "INTEGRATION",
    lane: "captain",
    ownerSession: "SESSION_A",
    jobIds: [],
    fromDiscovery: true,
    note:
      "Jobs whose completions are already pushed and verified, populated from the committed discovery report rather than by hand."
  }
];

/**
 * Wave 5 — ranked now, reserved by nobody.
 */
const CANDIDATE_SHARDS = [
  {
    shard: "B1",
    lane: "custom_pleading",
    jobIds: ["rcap-ct-custom-pleading", "rcap-id-custom-pleading"]
  },
  {
    shard: "B2",
    lane: "custom_pleading",
    jobIds: ["rcap-az-custom-pleading", "rcap-nc-custom-pleading"]
  },
  {
    shard: "C1",
    lane: "guidance_implementation",
    jobIds: [],
    note: "Exhausted. Refills only when a memo correction reopens a guidance route."
  },
  {
    shard: "E1",
    lane: "acroform_fill",
    jobIds: [],
    note:
      "Refills when the first Edition 1.3 tranche publishes and its families' sources become worker-assignable. Nothing may be forced ready before then."
  },
  {
    shard: "F1",
    lane: "source_acquisition",
    jobIds: [
      "rcap-de-direct-issuer-request",
      "rcap-ma-attended-retrieval-100k-petition-for-expungement",
      "rcap-ma-attended-retrieval-mps-petition-to-expunge"
    ],
    note: "The Massachusetts retrievals each need a person at a terminal, so they are ranked but not promised."
  },
  {
    shard: "R1",
    lane: "legal_output_review",
    jobIds: [
      "rcap-mn-custom-pleading-completed-output-review",
      "rcap-nv-guidance-implementation-completed-output-review",
      "rcap-vt-guidance-implementation-completed-output-review",
      "rcap-sc-custom-pleading-completed-output-review"
    ]
  },
  {
    shard: "R2",
    lane: "legal_output_review",
    jobIds: [
      "rcap-oh-guidance-implementation-completed-output-review",
      "rcap-ri-guidance-implementation-completed-output-review",
      "rcap-wi-custom-pleading-completed-output-review",
      "rcap-wv-guidance-implementation-completed-output-review"
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
      wave: status === "active" ? 4 : 5,
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
      `  ${shard.status === "active" ? "wave 4" : "wave 5"} ${shard.shard.padEnd(12)} ${String(
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
