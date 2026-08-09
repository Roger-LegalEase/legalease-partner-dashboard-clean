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
    jobIds: [],
    note:
      "Empty because it succeeded. Hawaii's custom pleading is integrated and completed — five tracks, thirty pages — and its replacement proof is generated. Wyoming had already left this shard: all three of its tracks carry unresolved governing-mechanism questions, its packet components wait on a 23-county local-template survey nobody has run, and two tracks carry open waiting-period and eligibility questions. It returns when D2 and the Wyoming owners answer, not before."
  },
  {
    shard: "B2",
    lane: "custom_pleading",
    ownerSession: "SESSION_B",
    jobIds: [
    ],
    note:
      "The split worked and is now spent. Both clean-track assignments — Ohio's four and Washington's two — are integrated and completed with proofs generated. oh_marijuana_expungement and wa_crop_certificate_of_restoration were excluded from those assignments and remain excluded; neither is forced ready, and each now has its own memo-amendment owner plus a source owner in this wave. The earlier note on this shard was wrong to say both assignments had no venue blocker — Washington's CROP track carries exactly that, which is why WA has a venue decision behind it."
  },
  {
    shard: "B4",
    lane: "custom_pleading",
    ownerSession: "SESSION_B",
    jobIds: [],
    note:
      "Empty because it delivered. North Dakota's correction is integrated: the caption composer appended 'OF <COUNTY> COUNTY' unconditionally and produced 'IN THE MUNICIPAL COURT OF CASS COUNTY', a court that does not exist — North Dakota municipal courts are city courts named for a municipality under N.D.C.C. ch. 40-18.1 — ch. 40-18, which the defective composer followed, was repealed by S.L. 2025, ch. 379, § 4. Unlike the Indiana and Mississippi fixture defects, this one was in the composer, and that is where it was fixed. The verifier the reviewer could not get to run now runs and passes across all nine fixtures. The replacement packet proof and review manifest are generated, the new bytes reopened the technical review rather than letting a stale approval carry over, and the completed-output legal review stays blocked behind it. This shard refills when a review finds something, not on a schedule."
  },
  {
    shard: "B3",
    lane: "custom_pleading",
    ownerSession: "SESSION_B",
    jobIds: ["rcap-ky-custom-pleading-clean-tracks"],
    note:
      "Both promoted rows changed shape rather than being reranked. Kentucky was one assignment over two tracks and is now one over one: ky_void_seal_controlled_substance carries an eligibility bar its own memo records and the controlling review does not — KRS 218A.275(12) absolutely bars anyone previously dismissed after a KRS 218A.14151 deferred prosecution — and that decides whether the participant receives a packet at all, not how one is worded. It is split out to a Session D owner and the combined assignment is superseded, not completed. The marijuana/synthetic/salvia sibling carries no such bar and is here on its own so one unresolved eligibility question does not hold a deliverable track for a second wave. Virginia leaves the shard entirely: both its tracks are blocked on two independent questions — which version of Va. Code § 19.2-392.2 governs a packet generated now, and whether the Office of the Executive Secretary publishes a statewide instrument for either route. The second one decides whether a custom pleading is even the right document, so drafting first would risk building the wrong artifact rather than an early draft of the right one. Nebraska is still deliberately not promoted: unresolved venue and packet-component questions, and its branch is a lease."
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
    jobIds: ["rcap-wy-published-source-filing-requirements-memo-amendment"],
    // D2 carries the Wyoming reads; D1's carried work is not reranked.
    note:
      "Refilled by the Wyoming published-source review. The project owner supplied a review of published sources — not a completed 23-county telephone survey, and it is not recorded as one — settling that Wyoming publishes no statewide petition form and no statewide proposed-order template. Both documents are therefore controlled custom pleading, which turns a standing correct_form blocker into an affirmative conclusion. A decision record cannot amend a state memo, so this owner carries the conclusions and the statutory per-route filing fees into WY.memo.json; Session B then implements from the corrected memo rather than from the decision, and Wyoming custom pleading is blocked on exactly this one job and nothing else. Earlier in the pass: both reads that refilled this shard delivered inside the same pass and are integrated: Kentucky's KRS 218A.275(12) eligibility bar, which decides whether that route offers a packet at all, and Virginia's 2026-2027 statutory cutover. Virginia custom pleading now narrows from two blocking questions to one — the official-form identity, which is Session F's and sits in F4. D2 still carries nothing new; both Wyoming reads also landed this pass. Ohio carried the marijuana mechanism into OH.memo.json with the two accuracy defects fixed — the fee is division (G), and the 60-day and 30-day figures do not govern this route. Washington carried the CROP venue conclusion. Iowa remapped the six components that two completed resolutions found pointing at documents that do not exist as such. None of the three made a track ready, which was the point. The Ohio memo now carries three recorded states rather than two; the earlier automatic-sealing amendment stays complete rather than reopening because a successor touched the same file."
  },
  {
    shard: "D2",
    lane: "legal_design_normalization",
    ownerSession: "SESSION_D",
    jobIds: [],
    note:
      "Both Wyoming reads delivered and are integrated: the statutory sweep of the 2025 and 2026 sessions with the missing enactment dates and the felony-deferral gap, and the substantive reads on the status-offence definition and the restoration asymmetry between sections 7-13-1501 and 7-13-1502(m). Neither owned WY.memo.json, so the memo amendment they imply is a separate owner and Wyoming custom pleading stays blocked until it lands. The governing-mechanism branch was a refused baseline lease at the start of this pass and carried real work by the end of it; refusing it then and adopting it now is one rule applied twice."
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
      "rcap-de-attended-retrieval-five-current-forms",
      "rcap-wy-local-template-and-handout-survey",
      "rcap-co-jdf-2371-source-materialization"
    ],
    note:
      "Minnesota left this shard satisfied: the project owner supplied all five current EXP forms and they are measured exactly under external custody, with EXP105 and EXP106 preserved as separate identities for their separate statutory routes. Delaware stays, and stays open on purpose — the drop supplied three of its five documents, and CIV_EXP_02_B and FORM-281 are still missing. A partially satisfied retrieval is not a finished one, so its two blockers are preserved rather than retired. Colorado JDF-2371 joins the shard because its licence gate opened: that job had been hard-coded blocked with the licence written only in a comment, so it stayed shut when the grant landed. It now derives from the licence and is ready to materialize. The Wyoming survey still needs a person telephoning clerks in 23 counties and is not a download."
  },
  {
    shard: "F2",
    lane: "source_acquisition",
    ownerSession: "SESSION_F",
    jobIds: [
      "rcap-mo-issuer-contact-authorization",
      "rcap-in-written-permission-authorization",
      "rcap-ks-form-currentness-verification"
    ],
    note:
      "The permission and follow-up owners the completed decisions created. Three have now left the shard satisfied: Colorado's grant is recorded as a successor decision, Kansas delivered its written-permission authorization, and Washington resolved the CRO form-family source identity. Indiana remains, still sitting at a withheld licence with no route out but the asking. The Missouri request is drafted and deliberately unsent and what remains is the human authorization to send it. None of these jobs sends anything: drafting is the deliverable and sending is a separate human act. The Ohio survey left the shard too: its local-form and fee question is answered and integrated. Kansas joins with a currentness owner and not a licence one: the project owner reports a hard-copy grant whose scan has not arrived, and permission would not answer this question in any case. Nine Council documents, three of them recorded from 2013 and 2016, behind an Akamai perimeter that returns 403 to automation. Whether those revisions are still current is independent of who may reproduce them, and a packet built on a superseded form is wrong whoever authorized it."
  },
  {
    shard: "F3",
    lane: "source_acquisition",
    ownerSession: "SESSION_F",
    jobIds: [
      "rcap-de-direct-issuer-request",
      "rcap-ma-attended-retrieval-100k-petition-for-expungement",
      "rcap-ma-attended-retrieval-mps-petition-to-expunge",
      "rcap-ma-attended-retrieval-ocp-petition-to-seal",
      "rcap-ma-attended-retrieval-tc0021",
      "rcap-ma-attended-retrieval-tc0057"
    ],
    note:
      "The shard emptied and refilled. All three of its previous rows — the Florida and Iowa not-required design reconciliations and the Iowa in-repo identity reconciliation — are complete and integrated; DCI-76 resolved to page 1 of a retained three-page packet and its remap is now D1's. What replaces them is the Massachusetts attended-retrieval set and the Delaware direct-issuer request. Every one of these is human-attended or human-sent work: the five Massachusetts documents sit behind a perimeter that refuses automation, and the Delaware request is drafted and sent by a person or not at all. They are ranked, not promised, and none of them may create a receipt from an unattended retrieval."
  },
  {
    // F4 carries a job whose lane is legal_design_normalization rather than
    // source_acquisition. That is deliberate and is not an error to tidy: the
    // acquisition lane is keyed to acquisition records for documents whose
    // identity is already established, and CC-1201's identity is precisely what
    // is unknown. Filing it there would require inventing the acquisition rows
    // that name the very form this job exists to find. The shard's `lane` is a
    // label for the shard, not a constraint on its members, so the work sits
    // with the session that does source and authority without the job having to
    // claim an identity it does not have.
    shard: "F4",
    lane: "source_acquisition",
    ownerSession: "SESSION_F",
    jobIds: ["rcap-va-cc-1201-source-identity-materialization"],
    note:
      "The Virginia official-form question, and one of the two things blocking Virginia custom pleading. Establish whether the Office of the Executive Secretary publishes a separate statewide instrument for va_exp_absolute_pardon or va_exp_identity_used_by_another, and for each instrument in the current CC-1201 series: exact identity, title, role, revision and currentness, statewide against local scope, whether it is mandatory, a standard or pattern form, optional or nonexistent, and the source, Edition and output-strategy consequences. The output-strategy consequence is the point — if a statewide instrument exists, the route is official-PDF work and the custom pleading is the wrong document. Every plausible CC-1201 and CC-1203 path returned 404 on the normalization pass while CC-1473 retrieved cleanly from the same library: that is a retrieval failure, not a finding, and failure to find a form is never proof that no form exists. CC-1473 may not be substituted outside § 19.2-392.2(A)."
  },
  {
    shard: "R1",
    lane: "legal_output_review",
    ownerSession: "SESSION_R",
    jobIds: [
      "rcap-in-custom-pleading-technical-visual-review",
      "rcap-ms-custom-pleading-technical-visual-review",
      "rcap-nd-custom-pleading-technical-visual-review"
    ],
    reviewKind: "technical_visual_review",
    note:
      "Technical and visual review only; this shard does not own any legal-review path. All three are here for one reason: their corrections landed, their replacement packets are generated, and the new bytes reopened reviews that had already been recorded. North Dakota joins Indiana and Mississippi this wave — its own held review is what produced the correction, and the correction replaced the output that review was written about, so the review it produced no longer describes anything on disk. A technical approval does not survive the output it approved being replaced, including when the approval and the replacement come from the same finding."
  },
  {
    shard: "R2",
    lane: "legal_output_review",
    ownerSession: "SESSION_R",
    jobIds: [
      "rcap-ok-guidance-implementation-completed-output-review",
      "rcap-tn-guidance-implementation-completed-output-review",
      "rcap-nc-guidance-implementation-completed-output-review"
    ],
    reviewKind: "completed_output_legal_review",
    note:
      "Completed-output legal review only; this shard does not own any technical-review path. These three are the families whose technical and visual review is recorded and approved. Recommendations only — recommend_adopt, recommend_correction or recommend_hold. Counsel remains the adopter."
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
    jobIds: [],
    note:
      "Empty because its whole candidate list was promoted into the active F3 this wave: the Delaware direct-issuer request and all five Massachusetts attended retrievals. Nothing is queued behind them — every other ready acquisition job is already seated in an active shard."
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

  // Preflight. Every proposed assignment is checked against the live plan and
  // the discovery report before it is frozen, because each of these has
  // actually happened: a job advertised ready whose decision was already
  // integrated, a lease mistaken for a completion, and a whole-state
  // assignment whose clean tracks could have been split out.
  const preflight = (jobId, status, definitionShard) => {
    const job = byJobId.get(jobId);
    const problems = [];
    if (!job) {
      problems.push("absent from the live plan");
      return problems;
    }
    if (status !== "active") return problems;
    if (job.status === "completed") {
      problems.push("already completed; it must not be refrozen");
    }
    if (job.status === "cancelled") {
      problems.push("cancelled or superseded; it must not be refrozen");
    }
    if (alreadyCompleted.has(jobId)) {
      problems.push("already has a pushed worker completion awaiting integration");
    }
    // A baseline lease is a worker holding the job, not a completion. It does
    // not stop the job being frozen — the work is genuinely outstanding — but
    // it must never be counted as something awaiting integration.
    const leased = (discovery?.jobs ?? []).some(
      (entry) => entry.jobId === jobId && entry.classification === "baseline_lease"
    );
    if (leased && definitionShard === "INTEGRATION") {
      problems.push(
        "its only branch is a baseline lease carrying no worker commit, so there is nothing to integrate"
      );
    }
    // A whole-state implementation assignment that still contains a track the
    // captain has already split out.
    const split = (job.supersededBy ?? []).length > 0;
    if (split) problems.push("superseded by a split assignment");
    return problems;
  };

  const buildShard = (definition, status) => {
    const jobIds = definition.fromDiscovery
      ? [...alreadyCompleted].sort((left, right) => left.localeCompare(right))
      : definition.jobIds;
    for (const jobId of jobIds) {
      const problems = preflight(jobId, status, definition.shard);
      if (problems.length > 0) {
        throw new Error(
          `${definition.shard} may not freeze ${jobId}: ${problems.join("; ")}`
        );
      }
    }
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
    shardIdentifiersAreNotSessions:
      "R1 and R2 are shard identifiers, not sessions. Both are owned by SESSION_R, which is the single human review session: R1 carries its technical and visual reads, R2 carries its completed-output legal reads, and the split exists so the two kinds of review cannot be recorded against each other's paths. They were briefly written as ownerSession SESSION_R1 and SESSION_R2, which reads as two review sessions and would have someone opening a second one. The human pool is exactly A, B, C, D, E, F and R; every shard here names one of those seven and no shard may name anything else.",
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
