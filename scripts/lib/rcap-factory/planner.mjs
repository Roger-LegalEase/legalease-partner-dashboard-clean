import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  FACTORY_LANES,
  FACTORY_SCHEMA_VERSION,
  assertValidFactoryPlan,
  normalizeRepoPath
} from "./schema.mjs";
import {
  NORMALIZATION_READINESS_FOUNDATION_JOB_ID,
  REMAINING_NORMALIZATION_JURISDICTIONS,
  buildNormalizationReadinessRecords,
  materializeNormalizationResearchInputs,
  normalizationFoundationComplete,
  validateFactoryJobClaims
} from "./normalization-readiness.mjs";
import {
  LEGAL_REVIEW_MATERIALIZATION_CONTRACT_PATH,
  OFFICIAL_PDF_RECONCILIATION_PATH,
  OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
  validateLegalReviewMaterializationContract,
  validateOfficialPdfSourceProjection
} from "./materialization-planning.mjs";
import {
  authorizationFor,
  buildSourceAuthorizationIndex,
  deriveSourceLifecycle,
  permitsGeneration
} from "./source-authorization.mjs";

export const FACTORY_INPUT_PATHS = Object.freeze({
  authority: "data/record-clearing/master-library/authority.json",
  normalizedTracks: "data/record-clearing/legal-design-track-registry.json",
  sourceRelationships: "data/record-clearing/legal-design-track-source-relationships.json",
  blockerLedger: "data/record-clearing/master-library/authoritative-blocker-ledger.json",
  sourceAcquisitionQueue: "data/record-clearing/master-library/source-acquisition-queue.json",
  implementationQueue: "data/record-clearing/legal-design-implementation-queue.json",
  packetSetManifests: "data/record-clearing/legal-design-packet-set-manifests.json",
  sourceArtifacts: "data/record-clearing/source-artifact-registry.json",
  allStateBuildStatus: "data/rcap-all50/all-state-build-manifest.json",
  promotionReadiness: "docs/record-clearing/promotion-readiness-matrix.json",
  runtimeRegistry: "src/lib/rcap/packets/registry.ts",
  packetCapabilityRegistry: "src/lib/rcap/jurisdictions/packet-capability.ts",
  statePromotionManifest: "src/lib/rcap/state-promotion-manifest.ts",
  all51ReviewSignoff: "docs/rcap-promotion/all51-final-review-signoff.json",
  trackSourceAudit: "data/record-clearing/master-library/track-source-audit.json",
  productionPlan: "planning/record-clearing-100-percent/production-plan.json",
  acquisitionDocuments:
    "planning/record-clearing-100-percent/acquisition-intelligence/documents.json",
  acquisitionCampaigns:
    "planning/record-clearing-100-percent/acquisition-intelligence/acquisition-campaign.json",
  acquisitionIssuers:
    "planning/record-clearing-100-percent/acquisition-intelligence/issuer-directory.json",
  acquisitionUnresolved:
    "planning/record-clearing-100-percent/acquisition-intelligence/unresolved.json",
  acquisitionReadme:
    "planning/record-clearing-100-percent/acquisition-intelligence/README.md",
  repositoryAssetAudit:
    "data/record-clearing/master-library/repository-asset-audit.json",
  normalizationReadiness:
    "data/record-clearing/production-factory/normalization-readiness-input.json",
  jobClaims:
    "data/record-clearing/production-factory/job-claims.json",
  legalReviewMaterialization:
    LEGAL_REVIEW_MATERIALIZATION_CONTRACT_PATH,
  officialPdfSourceReconciliation:
    OFFICIAL_PDF_RECONCILIATION_PATH,
  officialPdfSourceProjection:
    OFFICIAL_PDF_SOURCE_PROJECTION_PATH
});

export const GLOBAL_GENERATED_REGISTRIES = Object.freeze([
  "data/rcap-all50/all-state-build-manifest.json",
  "data/record-clearing/legal-design-batch-delta-report.json",
  "data/record-clearing/legal-design-guidance-rereview-queue.json",
  "data/record-clearing/legal-design-implementation-queue.json",
  "data/record-clearing/legal-design-legal-research-queue.json",
  "data/record-clearing/legal-design-packet-set-manifests.json",
  "data/record-clearing/legal-design-specifications.json",
  "data/record-clearing/legal-design-track-registry.json",
  "data/record-clearing/legal-design-track-source-relationships.json",
  "data/record-clearing/relief-track-registry.json",
  "data/record-clearing/source-artifact-registry.json",
  "data/record-clearing/production-factory/packet-proofs",
  "data/record-clearing/production-factory/official-pdf-proofs",
  "data/record-clearing/production-factory/review-manifests",
  "data/record-clearing/production-factory/source-materialization-receipts",
  "data/record-clearing/production-factory/normalization-readiness-input.json",
  LEGAL_REVIEW_MATERIALIZATION_CONTRACT_PATH,
  OFFICIAL_PDF_RECONCILIATION_PATH,
  OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
  "data/record-clearing/production-factory/job-claims.json",
  "src/lib/rcap/jurisdictions/packet-capability.ts",
  "src/lib/rcap/packets/registry.ts",
  "src/lib/rcap/state-promotion-manifest.ts",
  "src/lib/rcap/state-promotion-rules.ts"
]);

export const GLOBAL_WORKER_FORBIDDEN_PATHS = Object.freeze([
  ".env",
  ".env.development",
  ".env.development.local",
  ".env.local",
  ".env.production",
  ".env.production.local",
  ".env.test",
  ".env.test.local",
  ".github/workflows",
  "data/record-clearing/master-library/authority.json",
  "data/record-clearing/master-library/edition-1-2",
  "planning/record-clearing-100-percent/acquisition-intelligence",
  "planning/record-clearing-100-percent/jobs",
  "planning/record-clearing-100-percent/production-plan.json",
  "package-lock.json",
  "package.json",
  "supabase",
  ...GLOBAL_GENERATED_REGISTRIES
].sort());

export const WAVE_INTEGRATION_VALIDATION = Object.freeze([
  "npm run rcap:factory:test",
  "npm run rcap:verify-integrated-production-plan",
  "npm run rcap:verify-master-library-authority",
  "npm run typecheck",
  "npm test"
]);

const IMPLEMENTATION_DIR = "data/record-clearing/implementation-tranches";
const CANONICAL_JOBS_DIR = "planning/record-clearing-100-percent/jobs";
const REVIEW_MANIFEST_DIR = "data/record-clearing/production-factory/review-manifests";
// Technical/visual review and completed-output legal review are different
// competencies with different accountabilities, so they get different owners
// and different paths. The legal directory keeps its existing name: renaming
// it would churn provenance for no gain.
const TECHNICAL_REVIEW_DIR =
  "data/record-clearing/production-factory/technical-visual-reviews/completed-output";
const LEGAL_REVIEW_DIR =
  "data/record-clearing/production-factory/legal-output-reviews/completed-output";

/**
 * Whether a recorded technical result still describes the current output.
 *
 * A review is a reading of specific bytes. When a correction lands, the packet
 * proof is regenerated and its sample hashes move; the previous result then
 * describes a document that will never ship — neither its approval nor its
 * defect finding carries forward. Comparing the hashes the reviewer recorded
 * against the hashes now on disk is what makes the supersession automatic
 * rather than something a captain has to remember.
 */
function technicalReviewIsCurrent(rootDir, implementationJobId) {
  const root = rootDir ?? process.cwd();
  const resultPath = path.join(
    root,
    `${TECHNICAL_REVIEW_DIR}/${implementationJobId}.json`
  );
  const proofPath = path.join(
    root,
    `${PACKET_PROOF_DIR}/${implementationJobId}.json`
  );
  if (!fs.existsSync(resultPath) || !fs.existsSync(proofPath)) return false;
  let result;
  let proof;
  try {
    result = JSON.parse(fs.readFileSync(resultPath, "utf8"));
    proof = JSON.parse(fs.readFileSync(proofPath, "utf8"));
  } catch {
    return false;
  }
  const reviewed = new Set(
    (result.packets ?? []).map((entry) => entry.proofSha256).filter(Boolean)
  );
  if (reviewed.size === 0) return false;
  const current = new Set(
    [
      ...(proof.samplePackets ?? []),
      ...(proof.variantPackets ?? [])
    ]
      .map((entry) => entry.assembledSha256)
      .filter(Boolean)
  );
  if (current.size === 0) return false;
  for (const hash of reviewed) {
    if (!current.has(hash)) return false;
  }
  return true;
}

/**
 * Implementations whose current output is known defective.
 *
 * Read from the recorded technical result rather than asserted here, so a
 * corrected implementation clears the block by being re-reviewed rather than
 * by someone remembering to edit a list.
 */
/**
 * Status for an attended-retrieval assignment, from its own result record.
 *
 * These jobs ask a person to obtain a named set of documents, and a person can
 * come back with some of them. Presence of a result file is therefore not the
 * same as the assignment being done: Delaware's record exists and reports three
 * of five, with FORM-281 and CIV_EXP_02_B still missing. Closing it because a
 * file appeared would retire a live retrieval and lose the two blockers.
 *
 * So the record says whether it satisfied itself. `assignmentSatisfied: false`
 * keeps the assignment open with its findings recorded; absent means the older
 * records that predate the field are read as satisfied, which is what they were.
 */
function attendedRetrievalStatus(rootDir, outputPath) {
  const absolute = path.join(rootDir, outputPath);
  if (!fs.existsSync(absolute)) return "ready";
  try {
    const record = JSON.parse(fs.readFileSync(absolute, "utf8"));
    return record.assignmentSatisfied === false ? "ready" : "completed";
  } catch {
    return "ready";
  }
}

function implementationsRequiringCorrection(rootDir) {
  const requiring = new Set();
  for (const directory of [TECHNICAL_REVIEW_DIR, LEGAL_REVIEW_DIR]) {
    const absolute = path.join(rootDir ?? process.cwd(), directory);
    if (!fs.existsSync(absolute)) continue;
    for (const name of fs.readdirSync(absolute).sort()) {
      if (!name.endsWith(".json")) continue;
      let record;
      try {
        record = JSON.parse(
          fs.readFileSync(path.join(absolute, name), "utf8")
        );
      } catch {
        continue;
      }
      const implementationJobId = name.replace(/\.json$/u, "");
      // A review can find a defect without being able to dispose of it. North
      // Dakota's came back `held_on_source_or_design` with `correctionRequired`
      // false and a severity `correction_required` finding sitting inside it:
      // the reviewer saw that the municipal caption names a county, and could
      // not complete the review because the assigned verifier would not run.
      // Reading only the top-level result would file a real, evidenced defect
      // as a completed review with nobody assigned to it. A severity is a
      // finding about the output; a result is a statement about the review.
      const findingRequiresCorrection = (record?.findings ?? []).some(
        (finding) => finding?.severity === "correction_required"
      );
      // A defect finding against output that has since been corrected is
      // history, not a live blocker.
      if (
        (record?.result === "correction_required" || findingRequiresCorrection) &&
        technicalReviewIsCurrent(rootDir, implementationJobId)
      ) {
        requiring.add(implementationJobId);
      }
    }
  }
  return requiring;
}

/**
 * Completion state for a job whose deliverable is a legal-design decision
 * record. Present on disk means done; absent means ready.
 */
function decisionRecordCompletion(rootDir, slug, provenance = {}) {
  const absolute = path.join(
    rootDir ?? process.cwd(),
    `data/record-clearing/production-factory/legal-design-decisions/${slug}.json`
  );
  if (!fs.existsSync(absolute)) return { status: "ready" };
  return {
    status: "completed",
    ...(provenance.workerBranch ? { workerBranch: provenance.workerBranch } : {}),
    ...(provenance.workerCommit ? { workerCommit: provenance.workerCommit } : {}),
    ...(provenance.completionCommit
      ? { completionCommit: provenance.completionCommit }
      : {})
  };
}

/**
 * Completion state for a technical/visual review job.
 *
 * A recorded result completes it, whether the finding was approval or a
 * defect: the review happened either way, and a defect is a result, not an
 * absence.
 */
function technicalReviewCompletion(rootDir, implementationJobId) {
  const absolute = path.join(
    rootDir ?? process.cwd(),
    `${TECHNICAL_REVIEW_DIR}/${implementationJobId}.json`
  );
  if (!fs.existsSync(absolute)) return { status: "ready" };
  let record;
  try {
    record = JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch {
    return { status: "ready" };
  }
  if (record?.reviewKind !== "technical_visual_review") return { status: "ready" };
  // Superseded by corrected output: the review reopens against the new packet.
  if (!technicalReviewIsCurrent(rootDir, implementationJobId)) {
    return { status: "ready" };
  }
  return {
    status: "completed",
    ...(record.provenance?.originalWorkerBranch
      ? { workerBranch: record.provenance.originalWorkerBranch }
      : {}),
    ...(record.provenance?.originalWorkerCommit
      ? { workerCommit: record.provenance.originalWorkerCommit }
      : {})
  };
}

/**
 * True once a technical/visual review of this implementation's current output
 * is recorded and approved. A legacy combined artifact never counts: it was
 * produced under an ownership model that could not distinguish the two reads.
 */
function technicalReviewApproved(rootDir, implementationJobId) {
  const absolute = path.join(
    rootDir ?? process.cwd(),
    `${TECHNICAL_REVIEW_DIR}/${implementationJobId}.json`
  );
  if (!fs.existsSync(absolute)) return false;
  try {
    const record = JSON.parse(fs.readFileSync(absolute, "utf8"));
    return (
      record?.reviewKind === "technical_visual_review" &&
      record?.result === "technical_approved" &&
      technicalReviewIsCurrent(rootDir, implementationJobId)
    );
  } catch {
    return false;
  }
}

const PACKET_PROOF_DIR = "data/record-clearing/production-factory/packet-proofs";
const OFFICIAL_PDF_PROOF_DIR =
  "data/record-clearing/production-factory/official-pdf-proofs";
const SOURCE_MATERIALIZATION_RECEIPT_DIR =
  "data/record-clearing/production-factory/source-materialization-receipts";
const FACTORY_DATA_DIR = "data/record-clearing/production-factory";
const PACKET_IMPLEMENTATION_DIR = "src/lib/rcap/packets/jurisdictions";
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const EXISTING_IMPLEMENTATION_MATERIALIZATION_ONLY_IDENTITIES = new Set([
  "MD:CC-DC-CR-148",
  "MD:MDJ-008"
]);
const TERMINAL_INSTRUCTION =
  "Stop after focused validation and one commit containing only owned paths. " +
  "Do not regenerate global registries, stage broadly, deploy, or change packet_ready, " +
  "enabled-jurisdiction, launch, runtime, or promotion status.";
const TN_ROUTE_INVENTORY_DECISION_COMMIT =
  "952b83be3fe12a6e5fce29acc77a21532fce9a70";
const TN_ROUTE_INVENTORY_DECISION_SHA256 =
  "fbaef8de7c7f621688f10bdb6d249ad189d0b05253a654342239912d12d0c357";
const TN_ROUTE_MEMO_AMENDMENT_COMMIT =
  "de4015744197b0daf99bd453da2167b707a02695";
const TN_AMENDED_MEMO_SHA256 =
  "dfd8a621910fca5ed2fb57c2fc97784dc41699a57cf46d272946b8b6a64f1f48";
const TN_INTEGRATED_MEMO_SHA256 =
  "a1c91f3d17115d87879905066b4f2b9732e717cbcdc6b063ec83502aa54f20e8";
const NY_MRTA_PACKET_CAPABILITY_JOB_ID =
  "rcap-ny-mrta-destruction-request-packet-capability-correction";
const NY_INTEGRATED_MEMO_SHA256 =
  "560d30414b2615203cbe6767b69e8f7f3e7bc100123343e86f9c728f1b3cdf3e";
const NY_MRTA_PACKET_CAPABILITY_WORKER_COMMIT =
  "1d0f5be6dc557ff5fe7b3bbdec5c594d94e7ed32";
const NY_MRTA_PACKET_CAPABILITY_COMPLETION_COMMIT =
  "4dc1f8cdfb4af51ab0a6006862cddbdafb50295d";
const NY_AMENDED_MEMO_SHA256 =
  "28ccada5d1b5fa1dff73d6a44f4ec7e7521b46272317852f17c653550c9cc7b6";
const NY_DESTINATION_MEMO_SHA256 =
  "fcf1ac52c65f70db988f949fe4d95336781b024066ec7edc408641f627789c10";
const NY_MRTA_COMPOSED_TRACK_ID = "ny_mrta_marijuana";
const NY_MRTA_DESTRUCTION_REQUEST_FORM_ID = "MRTA-DESTRUCTION-REQUEST";
const SC_SOLICITOR_DELIVERABLE_DECISION_ID =
  "sc-solicitor-route-participant-deliverable-resolution";
const SC_SOLICITOR_DELIVERABLE_MEMO_CORRECTION_JOB_ID =
  "rcap-sc-solicitor-deliverable-memo-correction";
const SC_INTEGRATED_MEMO_SHA256 =
  "1cb55c352a0ec365439dac7b1bacbeb154466d55d976c53d537dd25f654a5e64";
const SC_MEMO_CORRECTION_COMMIT =
  "f38ce5b039b065b032e01ae45acb10e6c0c73454";
const VT_MEMO_CORRECTION_COMMIT =
  "343f91f4a839cde32c0a423fa434c416e368aac2";
const VT_600_00228_IDENTITY_COMMIT =
  "4d882023c10b9520facda87acad1c147937c7f65";
const VT_600_00228_DECISION_SHA256 =
  "34b8da62d143cfe9658d73b752ca85c516da5cbe83d3ddf4cb734b7df36fde8b";
const VT_INTEGRATED_MEMO_SHA256 =
  "d2ff010de0e1a862f49a287ee02cf11a9dfdc4bf28f553d65e660207b9b81817";
const TEMPLATE_HASH_WORKER_COMMIT =
  "e89416d74f3f5653abb4e561704d5874fa14ef24";
const ARKANSAS_ACIC_WORKER_COMMIT =
  "2784e3c85ba624c2f94dd8beb749fc0e9fd5e50f";
const GEORGIA_TRANCHE_WORKER_COMMIT =
  "080ed5d94e92442069b4000511f04194f734f36d";
const TRACK_PROMOTION_WORKER_COMMIT =
  "33ff72c8514d289152caa0ed846db0cdd1f79502";
const SOURCE_MATERIALIZATION_WORKER_COMMIT =
  "a3b28545af4e8953146a97907d22a28c7aec6726";
const ARKANSAS_PUBLIC_GAPS_WORKER_COMMIT =
  "d19f7ff100d6e240cc3ffb00ecfcdab1477527c3";
const ALABAMA_CR65_WORKER_COMMIT =
  "62be8a3822e42f3f64533ac64820135f20c84e72";
const GEORGIA_JAIL_GUIDANCE_WORKER_COMMIT =
  "ca5958590d1b52713c4489d58617586e82f33629";
const DC_CUSTOM_PLEADING_WORKER_COMMIT =
  "a25306af0e095faac1ce4d36c60b0f04c9221b31";
const ILLINOIS_CUSTOM_PLEADING_WORKER_COMMIT =
  "20379e6e8f7fd41e1fda6714ab05a06183123368";
const PENNSYLVANIA_NORMALIZATION_WORKER_COMMIT =
  "387656ac31a49f7338bd9d1e3e170df929659d98";
// Integrated normalization waves. Each record pins the exact worker commit, the
// memo blob SHA-256 that commit supplied, and the captain-equivalent commit that
// carries that blob into the integration branch without the worker's stale
// shared generated outputs. The memo on disk is re-hashed against `memoSha256`
// on every plan compile, so a record cannot drift from the blob it claims.
const COMPLETED_NORMALIZATIONS = Object.freeze([
  {
    jurisdiction: "WY",
    workerCommit: "c27e1d9d6bc732e159b4cbe68b3f4705ede0a9a3",
    completionCommit: "e49729d9f34adb3762a53b971ae23ab9389bdcfd",
    memoSha256:
      "8788564390c3d4ad1c9e9fd90e3dcf6311ccba4557b481a306790214f8d3c0bf"
  },
  {
    jurisdiction: "SD",
    workerCommit: "f87c45c5939803068090c3c0e6f09b5ad6164b3d",
    completionCommit: "307a05d8279dbe43992b70ff65c4501e319fcb99",
    memoSha256:
      "8d088d48642f09802aa1582be9924642a36026e3721b7aa2de2c33aecac31ae7"
  },
  {
    jurisdiction: "WI",
    originalWorkerCommit:
      "2180f1f5015f324aa92168fe43f13584209efe29",
    correctionCommit:
      "a592809c0bf0fc5814aa6e2fd7c966f8b1e1a5b5",
    workerCommit: "a592809c0bf0fc5814aa6e2fd7c966f8b1e1a5b5",
    completionCommit: "589db2c8c48114934b1ae58c7c8e096906889d35",
    memoSha256:
      "028ac578608bf73db912e355a18824d2100a2e3e8052d9ef3040d437dbf08c28"
  },
  {
    jurisdiction: "RI",
    originalWorkerCommit:
      "07c675237a275971555250e4a33c7995d7d372de",
    correctionCommit:
      "51d0ec038b9ae1193dc6860d372a8c52b22a9a0b",
    workerCommit: "51d0ec038b9ae1193dc6860d372a8c52b22a9a0b",
    completionCommit: "2f091c7e1e60b317a225e6f53f201f79019c05f0",
    memoSha256:
      "918bdea81d68d75e072b8034dc22ba2cce0d6c86451c9ebdc3607b1225cfd62f"
  },
  {
    jurisdiction: "WV",
    workerCommit: "c1d0c69b4817168bad97e157f6bedac5920160c2",
    completionCommit: "8fc211a0fb5d32a25aa3bb603a21a8625cddfcbc",
    memoSha256:
      "fe10623bba14a83fc8d14996baaf375775e1f90b916f047b5353553a4759fa5f"
  },
  {
    jurisdiction: "SC",
    workerCommit: "d0f6d52dabb5dd2de1f3875fb33ffcfae75e8a86",
    completionCommit: "e6d915c1dee80918ffdac3e1848140350768246b",
    memoSha256:
      "1cb55c352a0ec365439dac7b1bacbeb154466d55d976c53d537dd25f654a5e64",
    // The memo this job delivered carried the solicitor-route deliverable
    // question as an open release blocker on all eleven tracks, even though the
    // same memo had already answered it by setting custom_pleading on every one
    // of them. rcap-sc-solicitor-deliverable-memo-correction removed the stale
    // question under the adopted deliverable determination. Both hashes are real
    // historical states of the same file, so either satisfies the on-disk check.
    amendedByJobId: "rcap-sc-solicitor-deliverable-memo-correction",
    amendedMemoSha256:
      "8bf45532868694d4f66b13e0da92f1650af1ec3c2fb5b8bd7d9f3c455561ad2f"
  },
  {
    jurisdiction: "VA",
    workerCommit: "467a12d75fee5652e3bc1014a7735af3d6c10369",
    completionCommit: "8b6857900b9e2337449788d9f4f8ff35bf6da36c",
    memoSha256:
      "d1900eb5282f082c0d30f78d3071c75f0ecc477c295e29e430bbb978eb9d0e66"
  },
  {
    jurisdiction: "WA",
    workerCommit: "ee749ed1e397ddb4bb25957ee28d83de9662f892",
    completionCommit: "8244dc1bf5c2bc24e0d6725e412dc01bfe308533",
    memoSha256:
      "edf0f86c7eee382f6c0666e3a400b4b41bb5ffadc3a51610c12aacd6fe93b2f8",
    // The CROP memo amendment. Both hashes are real historical states of the
    // same file and either satisfies the on-disk check.
    amendedByJobId: "rcap-wa-crop-memo-amendment",
    amendedByWorkerCommit: "17e28158320047e5bb767e1848ddada700ffa408",
    amendedByWorkerBranch:
      "rcap-factory/rcap-wa-crop-memo-amendment-fbe07d37-cc57c34b",
    amendedMemoSha256:
      "8f43ce3e1b28cb4f4848f9e3705a5d151e02015685df3cb8be6e16463f0d3bb7"
  },
  {
    jurisdiction: "KY",
    workerCommit: "d8b175f3595f7d46a84d66c56d9b48fdf3ca9be0",
    workerBranch:
      "rcap-factory/rcap-ky-legal-design-normalization-0196bfa8-392f602",
    supersededWorkerBranch:
      "rcap-factory/rcap-ky-legal-design-normalization-0196bfa8",
    supersededWorkerCommit:
      "c5d3a3031444b549984e0c7611a7d25963e9648f",
    completionCommit: "9fbf2224ace529dac4939fb2bb3a5e0aa474b8d7",
    memoSha256:
      "2328bbcbf8eca7e74772761b22d79e9d99de75e8d50222c4f513e952bafeeb19"
  },
  {
    jurisdiction: "NC",
    workerCommit: "ea9c91e48de544f279227e2020fa6d999c0a914a",
    workerBranch:
      "rcap-factory/rcap-nc-legal-design-normalization-bfd75bf0-392f602",
    supersededWorkerBranch:
      "rcap-factory/rcap-nc-legal-design-normalization-bfd75bf0",
    supersededWorkerCommit:
      "c52fedc4050531ae45af839733a2075bf5bb6b2d",
    completionCommit: "1f87de96d5d554298b81280d4ae96076b1ce9847",
    memoSha256:
      "9d9ce9f4ac2b4483dfc33e640873059d9d79755597017e819aa24f64893053c7"
  },
  {
    jurisdiction: "ND",
    workerCommit: "4f8c914858f0d91e993011f2978dee5344b89f7b",
    completionCommit: "6be64021d57283bbbdcb431846810efb2bfb7740",
    memoSha256:
      "b39b420c37ac318ca070cb13eaf402ece23d6af90755827bba0647410276e8a0"
  },
  {
    jurisdiction: "NE",
    workerCommit: "218d0a0dd85636458381c9b6ec487c57f1f561e1",
    completionCommit: "c36e048b95fbdff24b6397db9e009d8351863dda",
    memoSha256:
      "4947fbc90c3b3733175a4d4c3d8758dcc85dd47219c9d5045ae55186ea99f7eb"
  },
  // Session D's final wave. Each of these four workers committed under
  // `feat(legal-design): normalize <State>` while the factory pins
  // `feat(record-clearing): normalize <XX> legal design`. A pushed worker commit
  // is not amended, so the memo blob was carried into a captain-equivalent
  // commit under the required subject. The mismatch is recorded rather than
  // smoothed over: the claim is exact memo-blob equivalence, and the worker
  // commit remains the immutable provenance.
  {
    jurisdiction: "UT",
    workerCommit: "3396640ce4e4027d985e19fd40ec88b2155ce61e",
    workerBranch:
      "rcap-factory/rcap-ut-legal-design-normalization-1d3455e0-205aee43",
    workerCommitSubject: "feat(legal-design): normalize Utah",
    subjectMismatchResolvedByCaptainEquivalentCommit: true,
    completionCommit: "2d575a5acc2fed8fb15f99da2b9417b43d9aecea",
    memoSha256:
      "cda96b6a4b448f51d03e29bbc32550ec6d9b9823d62383c9ef17802ebf08c52f"
  },
  {
    jurisdiction: "VT",
    workerCommit: "35632440dca30b1930b030076b90ae336d932c78",
    workerBranch:
      "rcap-factory/rcap-vt-legal-design-normalization-f5da9dd3-60ab765e",
    workerCommitSubject: "feat(legal-design): normalize Vermont",
    subjectMismatchResolvedByCaptainEquivalentCommit: true,
    completionCommit: "0e712995b866b0379805ed9a90ca72e295d9eada",
    memoSha256:
      "d2ff010de0e1a862f49a287ee02cf11a9dfdc4bf28f553d65e660207b9b81817",
    // The memo this job delivered bound all seven fee-waiver components to the
    // superseded 11/2019 object and still carried the 600-00229 numbering typo.
    // rcap-vt-600-00228-current-revision-memo-correction rebound them to the
    // current 04/2026 revision under the adopted identity decision. Both hashes
    // are real historical states of the same file.
    amendedByJobId: "rcap-vt-600-00228-current-revision-memo-correction",
    amendedMemoSha256:
      "4bcd3fa16e73781234c2ebaabbd24e20dc25967049a86c66b6064aaa25fab079"
  },
  {
    jurisdiction: "TX",
    workerCommit: "885ca4d7b92e8a6224fa5c038137e8d35c8a32a4",
    workerBranch:
      "rcap-factory/rcap-tx-legal-design-normalization-4e32efbe-534b7cb3",
    workerCommitSubject: "feat(legal-design): normalize Texas",
    subjectMismatchResolvedByCaptainEquivalentCommit: true,
    completionCommit: "3398a1e383b80ec27af0669cb7e170ef9c029e75",
    memoSha256:
      "f914dfdcdb52d94cc8142d04dac49ba73f2ad3cbbab41a6f98d367eec5bb97c3"
  },
  {
    jurisdiction: "TN",
    workerCommit: "9e62ce24ccf5194c9176945c95a145b5af962b6f",
    workerBranch:
      "rcap-factory/rcap-tn-legal-design-normalization-8fa40ddb-18688942",
    workerCommitSubject: "feat(legal-design): normalize Tennessee",
    subjectMismatchResolvedByCaptainEquivalentCommit: true,
    completionCommit: "6ebf62c3a42819125f5f038a00fabf9f9d38fb9f",
    memoSha256:
      "a1c91f3d17115d87879905066b4f2b9732e717cbcdc6b063ec83502aa54f20e8",
    // The nine-track memo this job delivered was later amended to thirteen by
    // rcap-tn-2026-route-memo-amendment, under the adopted 2026 route-inventory
    // decision. Both hashes are real historical states of the same file, so both
    // are recorded and either satisfies the on-disk check.
    amendedByJobId: "rcap-tn-2026-route-memo-amendment",
    amendedMemoSha256:
      "dfd8a621910fca5ed2fb57c2fc97784dc41699a57cf46d272946b8b6a64f1f48"
  },
  // Session B wave 2. These four committed under the pinned subject, so they
  // integrate through the ordinary path.
  {
    jurisdiction: "NM",
    workerCommit: "8be61c8284d7c79dac25e3cf6e9c3a3f86754826",
    workerBranch:
      "rcap-factory/rcap-nm-legal-design-normalization-ec78ec59-67f2f364",
    supersededWorkerBranch:
      "rcap-factory/rcap-nm-legal-design-normalization-ec78ec59",
    supersededWorkerCommit:
      "2c4324f810adff5af2e87c485c1a5be02b46f638",
    completionCommit: "fdbea70575c255729719c86b48e7f33c1ac6f361",
    memoSha256:
      "94fe9d381be4e2b03e78397bb67a76c30c5005854d178606604689d19e002f25"
  },
  {
    jurisdiction: "NH",
    workerCommit: "1c56757f674e5558f8bcbdf53369dcc2bfba4949",
    workerBranch:
      "rcap-factory/rcap-nh-legal-design-normalization-519f8407-8839f534",
    completionCommit: "aaf52e0265e3c8ded10aba2fc446b001fb761684",
    memoSha256:
      "6f85d27d53ecaaaff93fcacf069338bbb981123002636ee1e80fa98e41fe57c0"
  },
  {
    jurisdiction: "NJ",
    workerCommit: "b109c7a17d0c39456581c45e305e59349f3f43a9",
    workerBranch:
      "rcap-factory/rcap-nj-legal-design-normalization-537ab1ab-2e16374f",
    completionCommit: "0a0749812b1434f020bb38a35f741f884dc8c704",
    memoSha256:
      "a8bd80789f88f4e81853fdbf195e5538c2cc76ea71a4838fe84bdb517c9e6d22"
  },
  {
    jurisdiction: "NY",
    workerCommit: "127561d3c5a86b72ec5db44f9e39eceb9783a162",
    workerBranch:
      "rcap-factory/rcap-ny-legal-design-normalization-650ebb05-ba9fd4ce",
    completionCommit: "31e26aa7b6de3f279a9d677c186a9ad43accc57a",
    memoSha256:
      "560d30414b2615203cbe6767b69e8f7f3e7bc100123343e86f9c728f1b3cdf3e",
    // The memo this job delivered carried the participant-signed MRTA
    // destruction request as an official_pdf_fill component sitting inside a
    // process_guidance track, which put a packet-capable official-PDF component
    // in New York's pure-guidance lane.
    // rcap-ny-mrta-destruction-request-packet-capability-correction rebuilt
    // ny_mrta_marijuana as one composed sequential mechanism in two units under
    // CPL section 160.50(5): the automatic vacatur, dismissal and expungement,
    // then the conditional participant-signed destruction request. The source
    // slot denominator, the node count and the other fifteen tracks are
    // unchanged. Both hashes are real historical states of the same file, so
    // either satisfies the on-disk check.
    amendedByJobId: NY_MRTA_PACKET_CAPABILITY_JOB_ID,
    amendedByWorkerCommit: NY_MRTA_PACKET_CAPABILITY_WORKER_COMMIT,
    amendedByWorkerBranch:
      "rcap-factory/rcap-ny-mrta-destruction-request-packet-capability-correction-65c45a61-e68b4341",
    amendmentCompletionCommit: NY_MRTA_PACKET_CAPABILITY_COMPLETION_COMMIT,
    amendedMemoSha256: NY_AMENDED_MEMO_SHA256,
    // Second amendment. The MRTA source decision established that the
    // destruction request is filed with the court of conviction, one
    // application per court, and that the court forwards the matter onward.
    // The memo had recorded the Office of Court Administration as the
    // destination and said nothing was filed in a court on either stage, so a
    // packet built on it would have sent a person to the wrong place.
    // rcap-ny-mrta-destruction-request-destination-memo-correction corrected
    // that and nothing else. All three hashes are real historical states of
    // the same file.
    secondAmendedByJobId:
      "rcap-ny-mrta-destruction-request-destination-memo-correction",
    secondAmendedByWorkerCommit:
      "37630009b7d46a28418dfad681e28272efb24011",
    secondAmendedByWorkerBranch:
      "rcap-factory/rcap-ny-mrta-destruction-request-destination-memo-correction-9f1b58d7-1dc16479",
    secondAmendmentCompletionCommit: "5f5cf3def0b9cbc1e88084cc261bd60abaf48675",
    secondAmendedMemoSha256: NY_DESTINATION_MEMO_SHA256
  },
  // The final ordinary normalization wave. With these four every state and the
  // District of Columbia carries an integrated legal-design memo.
  {
    jurisdiction: "OR",
    workerCommit: "f78dc2ebae1d8bdcfcc21adb4ece0d3a24f02cc9",
    workerBranch:
      "rcap-factory/rcap-or-legal-design-normalization-e99e15eb-745b85a2",
    completionCommit: "81d4faf9bdc53cc8d25737e60be35dd512c241d8",
    memoSha256:
      "1dc9f4fab0f1e2572f192414f0a8d1fab4cc55e76c380c430828921b01dd450a"
  },
  {
    jurisdiction: "OH",
    workerCommit: "44e73b3a0e41022d68f8b8b44deaa5cc04fbbb99",
    workerBranch:
      "rcap-factory/rcap-oh-legal-design-normalization-fb610857-8118b1b3",
    completionCommit: "dae284f17b6b0c5bd31810a7f6331957a9d5db53",
    memoSha256:
      "ed0323da7859f0b94a9e801fbe0b896dbb1a6261c8cdf02e4a505df433300df1",
    // The integrated automatic-sealing current-law decision established what
    // the normalization had left open about the Ohio automatic routes. Both
    // hashes are real historical states of the same file and either satisfies
    // the on-disk check.
    amendedByJobId: "rcap-oh-automatic-sealing-memo-correction",
    amendedByWorkerCommit: "0ae8a4adc132051c9f9a2154a152885dfd6576ea",
    amendedByWorkerBranch:
      "rcap-factory/rcap-oh-automatic-sealing-memo-correction-3fc6dd43-1ae3d74c",
    amendedMemoSha256:
      "1253b1a70ddd14a38992a11dd3943a6771b183a5fa95454edc0ebc6660409a21",
    // The marijuana memo amendment. Third recorded state of the same file; the
    // first two stay on the record rather than being overwritten by the newest.
    secondAmendedByJobId: "rcap-oh-marijuana-memo-amendment",
    secondAmendedByWorkerCommit: "fb0ffe2ebb4fe81645d0a9618610110918aff5ad",
    secondAmendedByWorkerBranch:
      "rcap-factory/rcap-oh-marijuana-memo-amendment-8e081aef-1f28c5f8",
    secondAmendedMemoSha256:
      "c7882683f5f8a15d47b643574240682b1cb24308203a1a71e3b36cea91b5a0d1"
  },
  {
    jurisdiction: "NV",
    workerCommit: "e69480b1bb3072ec8fa9435ee281f70d0c22e914",
    workerBranch:
      "rcap-factory/rcap-nv-legal-design-normalization-972fc317-34dc8759",
    completionCommit: "eb79b1eacdbfc45c06eae10b98a0ce62210dbe15",
    memoSha256:
      "711b8df32c62507f6d4d711c9077630c873771e10631e0a9e5a48caaef788cc6",
    // The normalization classified all three non-petition Nevada tracks as pure
    // process guidance. The sealing-mechanism correction read NRS 179.259,
    // 176.211 and 179.285 through 179.301 in their operative text and found two
    // of the three carry an express participant instrument: nv_seal_probation_
    // family has a subsection 2 petition with a proposed order, and
    // nv_repository_removal is a written application to two recipients.
    // nv_seal_deferred stays pure guidance, now established rather than
    // assumed. The six implemented Nevada petition tracks are untouched.
    amendedByJobId: "rcap-nv-sealing-mechanism-and-packet-capability-correction",
    amendedByWorkerCommit: "9ef2c869faeee51b85cbaca960ef98d155c35eac",
    amendedByWorkerBranch:
      "rcap-factory/rcap-nv-sealing-mechanism-and-packet-capability-correction-d31659df-64b640c3",
    amendmentCompletionCommit: "2fccb6a47fc4706d2f235f26c15b7af29ebef634",
    amendedMemoSha256:
      "113a9728c08487ad09184fdd045da4d19b532adcca2b083059dbb24e1c84c3f5"
  },
  {
    jurisdiction: "OK",
    workerCommit: "25a4a8966a2f3c012c1486fc37ee218f21cdca14",
    workerBranch:
      "rcap-factory/rcap-ok-legal-design-normalization-52006e83-20128515",
    completionCommit: "5ef6b00d209f3a0c48fbd994de67e380a79e3c4e",
    memoSha256:
      "984994b2ede275028d8d1345738e673e369872fc226016257d367349ba86de1f",
    // The memo this job delivered recorded that the enrolled Senate Bill 2030
    // text and its effective date could not be obtained, and it built the
    // clean-slate design on the premise that the amendment might have narrowed
    // the eligible set. The current-law decision closed both: the act is
    // O.S.L. 2026, c. 282, effective 1 July 2026, sections 18b and 19d now
    // carry eligibility and the automatic process, section 19d(G) preserves
    // the petition route, and the eligible set widened rather than narrowed.
    // rcap-ok-sb-2030-current-law-memo-correction applied that to
    // ok_clean_slate and ok_osbi_portal alone. Both hashes are real historical
    // states of the same file, so either satisfies the on-disk check.
    amendedByJobId: "rcap-ok-sb-2030-current-law-memo-correction",
    amendedByWorkerCommit: "7d0f65327effc06ea42603aa7c1d312ee1b1bc48",
    amendedByWorkerBranch:
      "rcap-factory/rcap-ok-sb-2030-current-law-memo-correction-394ecefb-0b09bdd2",
    amendmentCompletionCommit: "5f5cf3def0b9cbc1e88084cc261bd60abaf48675",
    amendedMemoSha256:
      "4e0380c9738cb9c9be3747e125990d79c483afc2c31a99ac29e638ad8c94c385"
  }
]);

/**
 * The recorded states of one jurisdiction's memo, oldest first.
 *
 * A memo is amended more than once and every state stays on the record, so
 * "has this amendment landed" is a question about position in that chain rather
 * than about equality with one hash. Asking it as equality made an integrated
 * amendment reopen as soon as a later one edited the same file.
 */
function memoStateChainFor(jurisdiction) {
  const record = COMPLETED_NORMALIZATIONS.find(
    (entry) => entry.jurisdiction === jurisdiction
  );
  return [
    record?.memoSha256,
    record?.amendedMemoSha256,
    record?.secondAmendedMemoSha256
  ].filter(Boolean);
}

/** The memo state a named amendment job produced, if one is recorded. */
function memoStateProducedBy(jurisdiction, jobId) {
  const record = COMPLETED_NORMALIZATIONS.find(
    (entry) => entry.jurisdiction === jurisdiction
  );
  if (!record) return null;
  if (record.amendedByJobId === jobId) return record.amendedMemoSha256 ?? null;
  if (record.secondAmendedByJobId === jobId) {
    return record.secondAmendedMemoSha256 ?? null;
  }
  return null;
}

/**
 * True when the memo on disk has reached the given state or any state recorded
 * after it. Reaching a later state is evidence the earlier one was passed
 * through, not evidence it never happened.
 */
function memoHasReached(rootDir, jurisdiction, accepted) {
  // Callers pass one hash or several. Florida's continuation correction lists
  // two, because a later binding correction moved the same memo on again and
  // both states are its own delivered output as far as this job is concerned.
  const states = [accepted].flat().filter(Boolean);
  if (states.length === 0) return false;
  const absolute = path.join(
    rootDir,
    `data/record-clearing/legal-design-intake/${jurisdiction}.memo.json`
  );
  if (!fs.existsSync(absolute)) return false;
  const actual = sha256File(absolute);
  if (states.includes(actual)) return true;
  // Not an exact match, so fall back to position in the recorded chain: any
  // state recorded after the earliest one this job accepts also counts.
  const chain = memoStateChainFor(jurisdiction);
  const indexes = states
    .map((state) => chain.indexOf(state))
    .filter((index) => index !== -1);
  if (indexes.length === 0) return false;
  return chain.slice(Math.min(...indexes)).includes(actual);
}
const COMPLETED_GUIDANCE_IMPLEMENTATIONS = Object.freeze([
  {
    jurisdiction: "AK",
    completionCommit: "36509c7377c5653db07fd5c43b3948aad079164a",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/alaska/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-alaska-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "ak-juvenile",
      "ak-nonconviction-confidential",
      "ak-pardon",
      "ak-sej"
    ]
  },
  {
    jurisdiction: "CA",
    completionCommit: "26b4661089849a67eb99bfae6598ba101f75cbbc",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/california/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-california-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: ["ca-851-8", "ca-auto-arrest", "ca-auto-conviction"]
  },
  {
    jurisdiction: "CT",
    completionCommit: "fd9ef0bfc18f11d0b34d7504682a574e2a849d06",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/connecticut/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-connecticut-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "ct-absolute-pardon",
      "ct-cannabis-auto",
      "ct-destruction-request",
      "ct-diversion",
      "ct-nonconviction-auto",
      "ct-provisional-pardon"
    ]
  },
  {
    jurisdiction: "DC",
    completionCommit: "03505f1659072e28b245dfd9677426a995960bdd",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/district-of-columbia/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-district-of-columbia-guidance-implementation.mjs",
    verifierWorkerOwned: false,
    trackIds: ["dc_auto_expungement", "dc_auto_sealing"]
  },
  {
    jurisdiction: "MD",
    completionCommit: "8dfdc7ae28a6362825ae19621e8a7afd6d8cef6c",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/maryland/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-maryland-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "md_10103_1_automatic",
      "md_10103_legacy_police",
      "md_10104_pre_service",
      "md_10105_1_automatic",
      "md_10112_dpscs_cannabis"
    ]
  },
  {
    jurisdiction: "MI",
    completionCommit: "7dbe89fe733474a90cc1ad20b5c11dc1a6520aa5",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/michigan/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-michigan-guidance-implementation.mjs",
    verifierWorkerOwned: false,
    trackIds: [
      "mi_arrest_acquittal_dismissal",
      "mi_arrest_no_charge",
      "mi_auto_felony",
      "mi_auto_misd92",
      "mi_auto_misd93",
      "mi_deferral_status"
    ]
  },
  {
    jurisdiction: "MN",
    completionCommit: "bf6f368c8a4cd72e0fa488bd37336c073f116925",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/minnesota/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-minnesota-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "mn_auto_cannabis_nonfelony",
      "mn_auto_clean_slate",
      "mn_ceb_felony_cannabis",
      "mn_inherent_authority",
      "mn_mistaken_identity_court",
      "mn_mistaken_identity_iddata",
      "mn_pardon_auto_expungement"
    ]
  },
  {
    jurisdiction: "LA",
    completionCommit: "df4a5976692134bde5d6033a4ee988f3c83bd432",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/louisiana/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-louisiana-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "la-985-2-automated-expungement",
      "la-985-3-immediate-expungement",
      "la-999-expedited-expungement"
    ]
  },
  {
    jurisdiction: "CO",
    completionCommit: "7be280c8be25bc19e497d668d48abaadfd89ca44",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/colorado/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-colorado-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "co_auto_seal_arrest",
      "co_auto_seal_nonconviction"
    ]
  },
  {
    jurisdiction: "DE",
    completionCommit: "c7af8cf48d42c69590a966141f5373c4ab596675",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/delaware/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-delaware-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "de_attorney_general_expungement",
      "de_auto_expungement"
    ]
  },
  {
    jurisdiction: "GA",
    completionCommit: "de0e2debc59aab9f82672876c42c9d542f3bcb18",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/georgia/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-georgia-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "ga-fo-sentencing-post2026",
      "ga-rfo",
      "ga-time-expired"
    ]
  },
  {
    jurisdiction: "IL",
    completionCommit: "fd8d51980cab60c67aa13de01da80035a3d7a6a0",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/illinois/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-illinois-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "il-auto-seal-2028",
      "il-auto-seal-2029",
      "il-cannabis-auto",
      "il-prostitution-j-auto"
    ]
  },
  {
    jurisdiction: "PA",
    completionCommit: "8b996476aa44899b07643546688c60a2cbd09771",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/pennsylvania/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-pennsylvania-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "pa_9122_2_clean_slate",
      "pa_acquittal_auto",
      "pa_ard_expungement"
    ]
  },
  {
    jurisdiction: "MO",
    completionCommit: "1b598a7df58249d8d15dd3de207fc10ea186d723",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/missouri/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-missouri-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "mo-610-105-automatic-closure",
      "mo-610-141-automatic-drug"
    ]
  },
  {
    jurisdiction: "FL",
    completionCommit: "c20febac8959dd4345e678bd36bf56b5ed128f8a",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/florida/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-florida-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: ["fl-auto-seal"]
  },
  {
    jurisdiction: "AR",
    completionCommit: "9a1930abbc0c15bf771b6c10170db982f859759a",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/arkansas/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-arkansas-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: ["ar-preadjudication-probation"]
  },
  {
    jurisdiction: "HI",
    completionCommit: "04484c319cd4a77dbd348661c0e20e28db1a8bd7",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/hawaii/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-hawaii-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: ["hi_state_initiated_marijuana_pilot"]
  },
  {
    jurisdiction: "IN",
    completionCommit: "b2c10962970adc43fdf2f774787cfcfc9d88c7aa",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/indiana/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-indiana-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: ["in_auto_expungement"]
  },
  {
    jurisdiction: "MA",
    completionCommit: "dc8f5182a9499362e8c07ade983fb40a2bbfbb02",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/massachusetts/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-massachusetts-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: ["ma-autoseal"]
  },
  {
    jurisdiction: "ME",
    completionCommit: "253ad752bf597231dd9cb797544324cd604b49ee",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/maine/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-maine-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: ["me-deferred"]
  },
  {
    jurisdiction: "MT",
    completionCommit: "96dfa91f92a967b30b2dec6d94818131f20e022b",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/montana/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-montana-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: ["mt_auto_nonconviction"]
  },
  {
    jurisdiction: "VA",
    completionCommit: "e6367e3ee4a41a1d6baa4dc2294c699c0f23c5f0",
    modulePath: "src/lib/rcap/packets/jurisdictions/virginia/guidance.ts",
    verifierPath: "scripts/verify-rcap-virginia-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "va_auto_seal_clean_record",
      "va_auto_seal_convictions",
      "va_auto_seal_nonconvictions",
      "va_auto_seal_without_order",
      "va_exp_actual_innocence"
    ]
  },
  {
    jurisdiction: "SD",
    completionCommit: "c5ce6d306c60321d029eaba20cb95616eabe695a",
    modulePath: "src/lib/rcap/packets/jurisdictions/south-dakota/guidance.ts",
    verifierPath: "scripts/verify-rcap-south-dakota-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "sd_23a_3_34_auto",
      "sd_diversion",
      "sd_pardon_24_14_11",
      "sd_sis_sealing"
    ]
  },
  {
    jurisdiction: "WI",
    completionCommit: "1ba6e2e720b60809ce59e9c5b6137f7b3fa91b03",
    modulePath: "src/lib/rcap/packets/jurisdictions/wisconsin/guidance.ts",
    verifierPath: "scripts/verify-rcap-wisconsin-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "wi_def_961_47",
      "wi_exp_942_08_mandatory",
      "wi_exp_certificate_of_discharge",
      "wi_exp_trafficking_2m"
    ]
  },
  {
    jurisdiction: "NE",
    completionCommit: "ac4f9f2b106c79e00461861920b210aa537f57f2",
    modulePath: "src/lib/rcap/packets/jurisdictions/nebraska/guidance.ts",
    verifierPath: "scripts/verify-rcap-nebraska-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "ne-firearm-restoration-routing",
      "ne-immigration-routing",
      "ne-juvenile-sealing-routing",
      "ne-nonconviction-auto",
      "ne-out-of-jurisdiction-routing",
      "ne-pardon-routing",
      "ne-postconviction-routing"
    ]
  },
  {
    jurisdiction: "ND",
    completionCommit: "16cb75fde862b6c8f88e4537ee5ce4a0a4e78ef0",
    modulePath: "src/lib/rcap/packets/jurisdictions/north-dakota/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-north-dakota-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "nd-dna-profile-removal-routing",
      "nd-juvenile-records-routing",
      "nd-nonconviction-auto-close-verify",
      "nd-trafficking-vacatur-routing",
      "nd-unconstitutional-arrest-expungement-routing"
    ]
  },
  {
    jurisdiction: "UT",
    completionCommit: "4869d93aa5a1d56a5d4a395ad1b2bd8fabe2be7b",
    modulePath: "src/lib/rcap/packets/jurisdictions/utah/guidance.ts",
    verifierPath: "scripts/verify-rcap-utah-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "ut_adj_reduction_402",
      "ut_auto_clean_slate",
      "ut_auto_nonconviction",
      "ut_auto_traffic",
      "ut_pet_appellate"
    ]
  },
  {
    jurisdiction: "NH",
    workerBranch:
      "rcap-factory/rcap-nh-guidance-implementation-fd0fb14b-d92b88f4",
    workerCommit: "da44d49f6ed51350617ccd72c15996696da22a69",
    completionCommit: "6b33cd960db98b72cb5d68a799c99a13ed4effa4",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/new-hampshire/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-new-hampshire-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "nh_auto_nonconviction",
      "nh_auto_vacated",
      "nh_supreme_court_record"
    ]
  },
  {
    jurisdiction: "OH",
    workerBranch:
      "rcap-factory/rcap-oh-guidance-implementation-8596d292-7942d6c9",
    workerCommit: "ba0fb2ae215242436e3751e0f98917aced6122e2",
    completionCommit: "fe2b29e13b1e57bfa2de478f3187e7939d5105bb",
    modulePath: "src/lib/rcap/packets/jurisdictions/ohio/guidance.ts",
    verifierPath: "scripts/verify-rcap-ohio-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "oh_2953_36_trafficking",
      "oh_2953_39_prosecutor",
      "oh_2953_521_trafficking_nonconviction"
    ]
  },
  {
    jurisdiction: "NM",
    workerBranch:
      "rcap-factory/rcap-nm-guidance-implementation-cc1191cd-094e2990",
    workerCommit: "94806b16e4fc58fb8dc4bb76286da5709acd0da1",
    completionCommit: "77cf1525b3333d6f69f9a76f013f39b66ad5513a",
    modulePath: "src/lib/rcap/packets/jurisdictions/new-mexico/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-new-mexico-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: ["nm_cannabis", "nm_cannabis_sentence"]
  },
  {
    jurisdiction: "RI",
    workerBranch:
      "rcap-factory/rcap-ri-guidance-implementation-93ed9e83-4d5f5bb4",
    workerCommit: "d298fd6e2f9e8d5f5926ec5bec302afb4680f671",
    completionCommit: "77cf1525b3333d6f69f9a76f013f39b66ad5513a",
    modulePath: "src/lib/rcap/packets/jurisdictions/rhode-island/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-rhode-island-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: ["ri_commercial_sexual_activity", "ri_filed_complaints"]
  },
  {
    jurisdiction: "KY",
    workerBranch:
      "rcap-factory/rcap-ky-guidance-implementation-954fa2b8-47b9ecd0",
    workerCommit: "be9c9b593601146f02bbe56d0eb91fb384730495",
    completionCommit: "77cf1525b3333d6f69f9a76f013f39b66ad5513a",
    modulePath: "src/lib/rcap/packets/jurisdictions/kentucky/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-kentucky-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "ky_automatic_nonconviction_expungement_verification",
      "ky_diversion_disposition_routing"
    ]
  },
  {
    jurisdiction: "NY",
    workerBranch:
      "rcap-factory/rcap-ny-guidance-implementation-f88576f0-60d051c3",
    workerCommit: "ab900aa61ed9ae9fe96925cfc9168025bb775e5d",
    completionCommit: "69b215d3673600b18ead7422699eb4e6636de6fe",
    modulePath: "src/lib/rcap/packets/jurisdictions/new-york/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-new-york-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    // Also a valid completion preceding its SESSION_C reservation, which moved
    // the fingerprint from 60d051c3 to 1fa58117 and changed nothing else.
    completionProvenance: "valid_completion_preceding_coordination_claim",
    preClaimAssignmentFingerprint:
      "60d051c3d1a4b3a09a4bd42b76b2b1efb28c30a5c1a45ba7a6d5aa0d5c4d43f5",
    coordinationClaimCommit: "0f856532d40eef7528f1657da70ef825e6476fee",
    trackIds: [
      "ny_160_50_nonconviction",
      "ny_clean_slate_convictions",
      "ny_clean_slate_dwai",
      "ny_clean_slate_manual_review"
    ]
  },
  {
    jurisdiction: "WV",
    workerBranch:
      "rcap-factory/rcap-wv-guidance-implementation-fd54452a-0c4ab20f",
    workerCommit: "c43591e881429c374c0b76512bc9685f96f4944e",
    completionCommit: "07d5d840a85df8d8f74a48e2778658c7a62b50e9",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/west-virginia/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-west-virginia-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: [
      "wv_common_conv_procedure",
      "wv_common_nc_procedure",
      "wv_dui_test_and_lock_dismissal"
    ]
  },
  {
    jurisdiction: "OK",
    workerBranch:
      "rcap-factory/rcap-ok-guidance-implementation-916e92d6-4ccb90be",
    workerCommit: "7f5324eebc95936eda3d481e987d756c5056a2e8",
    completionCommit: "80630a60928012c001ff107bac376845bfd74680",
    modulePath: "src/lib/rcap/packets/jurisdictions/oklahoma/guidance.ts",
    verifierPath: "scripts/verify-rcap-oklahoma-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: ["ok_clean_slate", "ok_osbi_portal"],
    // The first delivery, under assignment 6122f3ae at
    // 2608a5f354dc8648fdbdf96c14e262d6028743ad, was structurally sound and its
    // copy had stopped being true: it told the participant four times that the
    // enrolled SB 2030 text could not be obtained and built a sheet on the
    // premise that the eligible set might have narrowed. It widened. That
    // module was integrated as correction_required and never registered. The
    // reissued 4ccb90be assignment carries the corrected copy. Both branches
    // are preserved exactly as pushed; the structure — two tracks, six
    // components, both process_guidance, no participant filing — is unchanged.
    correction: {
      reason: "sb_2030_current_law_copy",
      decisionJobId: "rcap-ok-sb-2030-current-text-and-currency",
      memoCorrectionJobId: "rcap-ok-sb-2030-current-law-memo-correction",
      originalAssignmentFingerprint: "6122f3ae",
      originalWorkerBranch:
        "rcap-factory/rcap-ok-guidance-implementation-916e92d6-6122f3ae",
      originalWorkerCommit: "2608a5f354dc8648fdbdf96c14e262d6028743ad",
      correctedModuleSha256:
        "c8002b240b1f68149a3d20e8acc29ae41e1542e8064bfc3f8b61f149e88ce2b1"
    }
  },
  {
    jurisdiction: "TN",
    workerBranch:
      "rcap-factory/rcap-tn-guidance-implementation-d122b02f-cebac062",
    workerCommit: "952e984d19d4a8a4ff7c91dcf97cc556d9441495",
    completionCommit: "80630a60928012c001ff107bac376845bfd74680",
    modulePath: "src/lib/rcap/packets/jurisdictions/tennessee/guidance.ts",
    verifierPath: "scripts/verify-rcap-tennessee-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: ["tn_acquittal_immediate", "tn_trafficking_40_32_105"]
  },
  {
    jurisdiction: "NC",
    workerBranch:
      "rcap-factory/rcap-nc-guidance-implementation-871e29d9-89c3bef8",
    workerCommit: "48440d6f30e7b56fbfbdbc633f17be735e6b0a1c",
    completionCommit: "80630a60928012c001ff107bac376845bfd74680",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/north-carolina/guidance.ts",
    verifierPath:
      "scripts/verify-rcap-north-carolina-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: ["nc_auto_146_a4"]
  },
  {
    jurisdiction: "NJ",
    workerBranch:
      "rcap-factory/rcap-nj-guidance-implementation-3c0bec01-8cd912b1",
    workerCommit: "dd5baf9bbf5824e615078877be3a21e6930ff65d",
    completionCommit: "d58816f8fc75aa5156ff5e26c682e21ed1b31d39",
    modulePath: "src/lib/rcap/packets/jurisdictions/new-jersey/guidance.ts",
    verifierPath: "scripts/verify-rcap-new-jersey-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: ["nj_automated_clean_slate"]
  },
  {
    jurisdiction: "NV",
    workerBranch:
      "rcap-factory/rcap-nv-guidance-implementation-51a140f2-bab248fd",
    workerCommit: "59ea67fd7ec896c7314271aa764e3968f27942f7",
    completionCommit: "d58816f8fc75aa5156ff5e26c682e21ed1b31d39",
    modulePath: "src/lib/rcap/packets/jurisdictions/nevada/guidance.ts",
    verifierPath: "scripts/verify-rcap-nevada-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    // The corrected assignment. The sealing-mechanism decision moved
    // nv_seal_probation_family and nv_repository_removal into the
    // custom-pleading lane, leaving this one route where the court seals on its
    // own finding and the participant files and serves nothing.
    trackIds: ["nv_seal_deferred"]
  },
  {
    jurisdiction: "TX",
    workerBranch:
      "rcap-factory/rcap-tx-guidance-implementation-c631297a-6a29783f",
    workerCommit: "fd759ae9d18346a22207cdf68abeaaa99dacb97a",
    completionCommit: "d58816f8fc75aa5156ff5e26c682e21ed1b31d39",
    modulePath: "src/lib/rcap/packets/jurisdictions/texas/guidance.ts",
    verifierPath: "scripts/verify-rcap-texas-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: ["tx_exp_discretionary"]
  },
  {
    jurisdiction: "VT",
    workerBranch:
      "rcap-factory/rcap-vt-guidance-implementation-4b5af8d1-93d13925",
    workerCommit: "ac32a9241db46ece07898f09c4e1fe15bad2869e",
    completionCommit: "d58816f8fc75aa5156ff5e26c682e21ed1b31d39",
    modulePath: "src/lib/rcap/packets/jurisdictions/vermont/guidance.ts",
    verifierPath: "scripts/verify-rcap-vermont-guidance-implementation.mjs",
    verifierWorkerOwned: true,
    trackIds: ["vt_diversion_post_charge", "vt_diversion_pre_charge"]
  }
]);
const COMPLETED_OFFICIAL_PDF_IMPLEMENTATIONS = Object.freeze([
  {
    jobId: "rcap-ak-acroform-fill",
    jurisdiction: "AK",
    lane: "acroform_fill",
    completionCommit: "27210a0ee9f2fa01b907ba54c91ed9040dd04c2d"
  },
  {
    jobId: "rcap-ct-acroform-fill",
    jurisdiction: "CT",
    lane: "acroform_fill",
    completionCommit: "777ca177419b934e61c40ea7776526d1ad605bdb"
  },
  {
    jobId: "rcap-ga-flat-pdf-overlay",
    jurisdiction: "GA",
    lane: "flat_pdf_overlay",
    completionCommit: "f2f2c2c4de39d631bdd04e78563265519f8d21bd"
  },
  {
    jobId: "rcap-nj-acroform-fill",
    jurisdiction: "NJ",
    lane: "acroform_fill",
    completionCommit: "0e4f3251477d6c368f9b672904c50ba67152d004"
  }
]);
const GUIDANCE_TYPED_STOP_TRACKS = new Set([
  "CT:ct-cleanslate-auto",
  "MI:mi_setaside_csc4_pre2015"
]);
const COMPLETED_GUIDANCE_TRACKS = new Set(
  COMPLETED_GUIDANCE_IMPLEMENTATIONS.flatMap((record) =>
    record.trackIds.map((trackId) => `${record.jurisdiction}:${trackId}`)
  )
);
/**
 * The worker branch and commit behind each integrated decision in this wave.
 * Kept beside the completion-commit map so a decision's provenance is one
 * lookup rather than an archaeology exercise across commit messages.
 */
const OK_CORRECTED_PLEADING_SHA256 = "d04d44153d43b92bfd84ab12f0502f1e2a9dd2dab72e6d64428f5382f267e056";
const MEMO_CORRECTION_COMPLETION_COMMITS = Object.freeze({
  "rcap-ok-sb-2030-current-law-memo-correction": "5f5cf3def0b9cbc1e88084cc261bd60abaf48675",
  "rcap-ny-mrta-destruction-request-destination-memo-correction":
    "5f5cf3def0b9cbc1e88084cc261bd60abaf48675",
  "rcap-la-arts-993-995-998-output-strategy-memo-correction":
    "5f5cf3def0b9cbc1e88084cc261bd60abaf48675",
  "rcap-fl-rule-3-989-continuation-component-correction":
    "2fccb6a47fc4706d2f235f26c15b7af29ebef634",
  "rcap-nv-sealing-mechanism-and-packet-capability-correction":
    "2fccb6a47fc4706d2f235f26c15b7af29ebef634",
  "rcap-co-jdf-2370-2371-component-remap-memo-correction":
    "0846d05dbb446e976985781293a371336cc86369",
  "rcap-oh-automatic-sealing-memo-correction":
    "0846d05dbb446e976985781293a371336cc86369",
  "rcap-il-rule-298-fw-civ-component-remap-memo-correction":
    "0846d05dbb446e976985781293a371336cc86369",
  "rcap-fl-rule-3-989-sworn-statement-and-3-9895-memo-correction":
    "0846d05dbb446e976985781293a371336cc86369",
  "rcap-hi-expungement-stage-one-and-hcjdc-159b-memo-correction":
    "f35f634669effa4bcec01a51a16205cd690ab5f8"
});
/**
 * Decision jobs whose output is a legal-design decision record rather than a
 * source-acquisition record or a memo. They close the same way everything else
 * does — on the committed artefact, pinned to the captain commit that carried
 * the worker blob in.
 */
const DECISION_RECORD_COMPLETION_COMMITS = Object.freeze({
  "rcap-hi-stage-one-expungement-filing-vehicle-current-law-reconciliation":
    "2fccb6a47fc4706d2f235f26c15b7af29ebef634",
  "rcap-hi-stage-one-court-fee-addendum":
    "0846d05dbb446e976985781293a371336cc86369",
  "rcap-oh-marijuana-governing-mechanism-reconciliation":
    "01b28373ad3c572fea667bb76f3fd8f4d6f08ed6",
  "rcap-wa-crop-venue-reconciliation":
    "01b28373ad3c572fea667bb76f3fd8f4d6f08ed6"
});
const WAVE_WORKER_BRANCHES = Object.freeze({
  "rcap-ok-sb-2030-current-text-and-currency":
    "rcap-factory/rcap-ok-sb-2030-current-text-and-currency-0d923f06-3494a6f1",
  "rcap-oh-automatic-sealing-current-law-reconciliation":
    "rcap-factory/rcap-oh-automatic-sealing-current-law-reconciliation-253ee8e2-eda71f22",
  "rcap-ny-mrta-destruction-request-source-identity-resolution":
    "rcap-factory/rcap-ny-mrta-destruction-request-source-identity-resolution-2e6e9693-4b55906b",
  "rcap-co-jdf-family-commercial-license":
    "rcap-factory/rcap-co-jdf-family-commercial-license-746756c2-c456b710",
  "rcap-la-arts-993-995-998-html-source-output-strategy-adjudication":
    "rcap-factory/rcap-la-arts-993-995-998-html-source-output-strategy-adjudicatio-eb9b6396-b289e8a2",
  "rcap-la-arts-993-995-998-html-authority-asset-capture":
    "rcap-factory/rcap-la-arts-993-995-998-html-authority-asset-capture-f485eec1-1ed101bf",
  "rcap-hi-in-repo-identity-reconciliation-hcjdc-159":
    "rcap-factory/rcap-hi-in-repo-identity-reconciliation-hcjdc-159-ebf47315-c9cce424",
  "rcap-fl-source-identity-resolution-rule-3-989-continuation":
    "rcap-factory/rcap-fl-source-identity-resolution-rule-3-989-continuation-5df99664-df05ce06",
  "rcap-hi-stage-one-expungement-filing-vehicle-current-law-reconciliation":
    "rcap-factory/rcap-hi-stage-one-expungement-filing-vehicle-current-law-reconci-dc16ca6f-200419fb",
  "rcap-hi-hcjdc-159b-technical-structure-and-edition-asset":
    "rcap-factory/rcap-hi-hcjdc-159b-technical-structure-and-edition-asset-3b5c467a-8be3d70f",
  "rcap-fl-rule-3-989-sworn-statement-identity-currentness":
    "rcap-factory/rcap-fl-rule-3-989-sworn-statement-identity-currentness-97e406a2-d2848759",
  "rcap-il-in-repo-identity-reconciliation-rule-298":
    "rcap-factory/rcap-il-in-repo-identity-reconciliation-rule-298-08992e9c-6ea35aa9",
  "rcap-co-jdf-2370-2371-component-remap-memo-correction":
    "rcap-factory/rcap-co-jdf-2370-2371-component-remap-memo-correction-719205bf-853907e5",
  "rcap-fl-rule-3-989-sworn-statement-and-3-9895-memo-correction":
    "rcap-factory/rcap-fl-rule-3-989-sworn-statement-and-3-9895-memo-correction-9a3f041c-15352e94",
  "rcap-hi-stage-one-court-fee-addendum":
    "rcap-factory/rcap-hi-stage-one-court-fee-addendum-e0b9c992-2250eaaa",
  "rcap-il-rule-298-fw-civ-component-remap-memo-correction":
    "rcap-factory/rcap-il-rule-298-fw-civ-component-remap-memo-correction-cffec689-888d2c32",
  "rcap-oh-automatic-sealing-memo-correction":
    "rcap-factory/rcap-oh-automatic-sealing-memo-correction-3fc6dd43-1ae3d74c",
  "rcap-or-2025-monetary-obligations-scope-reconciliation":
    "rcap-factory/rcap-or-2025-monetary-obligations-scope-reconciliation-8ab487db-fad36e98",
  "rcap-or-same-episode-rule-source-reconciliation":
    "rcap-factory/rcap-or-same-episode-rule-source-reconciliation-f5aaa678-7a2ff0c7",
  "rcap-al-public-official-download":
    "rcap-factory/rcap-al-public-official-download-e9f4cb65-11872439",
  "rcap-az-not-required-design-reconciliation":
    "rcap-factory/rcap-az-not-required-design-reconciliation-37df8651-ac2a8e25",
  "rcap-az-public-official-download":
    "rcap-factory/rcap-az-public-official-download-28224bed-cf3b6866",
  "rcap-fl-public-official-download-fdle-fac-supersession":
    "rcap-factory/rcap-fl-public-official-download-fdle-fac-supersession-dea68b51-e0574d6d",
  "rcap-ia-source-identity-resolution-certification-of-service":
    "rcap-factory/rcap-ia-source-identity-resolution-certification-of-service-c9c66ab8-3d91b395",
  "rcap-id-shield-revision-and-bci-identity-correction":
    "rcap-factory/rcap-id-shield-revision-and-bci-identity-correction-1b2ccea1-3ad254e5",
  "rcap-il-notice-of-court-date-statewide-role-correction":
    "rcap-factory/rcap-il-notice-of-court-date-statewide-role-correction-cda02799-c72c9d61",
  "rcap-in-in-repo-identity-reconciliation-already-retained-under-another-identity":
    "rcap-factory/rcap-in-in-repo-identity-reconciliation-already-retained-under-a-73efe34e-263c1ed6",
  "rcap-md-in-repo-identity-reconciliation-cc-dc-cr-072":
    "rcap-factory/rcap-md-in-repo-identity-reconciliation-cc-dc-cr-072-d9ad5023-6ff92051",
  "rcap-me-form-face-title-correction":
    "rcap-factory/rcap-me-form-face-title-correction-acd52ac7-554feb19",
  "rcap-mi-mc-227-revision-3-25-correction":
    "rcap-factory/rcap-mi-mc-227-revision-3-25-correction-051e1730-82d398c0",
  "rcap-mn-in-repo-identity-reconciliation-needs-edition-reclass-not-acquisition":
    "rcap-factory/rcap-mn-in-repo-identity-reconciliation-needs-edition-reclass-no-94c0b52e-0f81f937",
  "rcap-mo-superseded-source-replacement":
    "rcap-factory/rcap-mo-superseded-source-replacement-eb4c6af2-454baed8",
  "rcap-mt-in-repo-identity-reconciliation-needs-edition-reclass-not-acquisition":
    "rcap-factory/rcap-mt-in-repo-identity-reconciliation-needs-edition-reclass-no-b1b03c32-f1c23c68",
  "rcap-mt-public-official-download":
    "rcap-factory/rcap-mt-public-official-download-0d0f623b-7ffebf15",
  "rcap-fl-public-official-download":
    "rcap-factory/rcap-fl-public-official-download-be035cc6-321bcb1d",
  "rcap-mn-official-download-automation-blocked":
    "rcap-factory/rcap-mn-official-download-automation-blocked-31de2ec7-ef9a1be3",
  "rcap-de-official-download-automation-blocked":
    "rcap-factory/rcap-de-official-download-automation-blocked-e84ade59-86c9c49e",
  "rcap-oh-marijuana-governing-mechanism-reconciliation":
    "rcap-factory/rcap-oh-marijuana-governing-mechanism-reconciliation-d420b6d0-c9cae40e",
  "rcap-wa-crop-venue-reconciliation":
    "rcap-factory/rcap-wa-crop-venue-reconciliation-e071d790-6f566274",
  "rcap-de-form-281e-edition-metadata-correction":
    "rcap-factory/rcap-de-form-281e-edition-metadata-correction-0744303b-92c50189",
  "rcap-mo-official-download-automation-blocked":
    "rcap-factory/rcap-mo-official-download-automation-blocked-50816f4b-2fbfd970",
  "rcap-mo-direct-issuer-request":
    "rcap-factory/rcap-mo-direct-issuer-request-d4367b02-b2034986",
  "rcap-in-commercial-license":
    "rcap-factory/rcap-in-commercial-license-2108f6a8-95a539cf",
  "rcap-fl-not-required-design-reconciliation":
    "rcap-factory/rcap-fl-not-required-design-reconciliation-4a64d3e9-2cff6f3c",
  "rcap-ia-in-repo-identity-reconciliation-already-retained-under-another-identity":
    "rcap-factory/rcap-ia-in-repo-identity-reconciliation-already-retained-under-a-35e905d4-cab93041",
  "rcap-ia-not-required-design-reconciliation":
    "rcap-factory/rcap-ia-not-required-design-reconciliation-70dabf5c-967ec13b",
  "rcap-hi-custom-pleading":
    "rcap-factory/rcap-hi-custom-pleading-e5deb202-8ecf5490",
  "rcap-oh-custom-pleading-clean-tracks":
    "rcap-factory/rcap-oh-custom-pleading-clean-tracks-610f8666-d9d0681a",
  "rcap-wa-custom-pleading-clean-tracks":
    "rcap-factory/rcap-wa-custom-pleading-clean-tracks-665b428f-c0ae532b",
  "rcap-in-custom-pleading-technical-review-correction":
    "rcap-factory/rcap-in-custom-pleading-technical-review-correction-c4033be7-69158102",
  "rcap-ms-custom-pleading-technical-review-correction":
    "rcap-factory/rcap-ms-custom-pleading-technical-review-correction-768c6cc3-fc6539d6",
  "rcap-ks-custom-pleading-technical-visual-review":
    "rcap-factory/rcap-ks-custom-pleading-technical-visual-review-1e7fa76b-4d3ee611",
  "rcap-mn-custom-pleading-technical-visual-review":
    "rcap-factory/rcap-mn-custom-pleading-technical-visual-review-fa0ece63-f4067520",
  "rcap-mo-custom-pleading-technical-visual-review":
    "rcap-factory/rcap-mo-custom-pleading-technical-visual-review-344d5a07-52f77547",
  "rcap-nd-custom-pleading-technical-visual-review":
    "rcap-factory/rcap-nd-custom-pleading-technical-visual-review-beae4951-2febdb85",
  "rcap-nj-guidance-implementation-technical-visual-review":
    "rcap-factory/rcap-nj-guidance-implementation-technical-visual-review-d5ed9fc8-e480293a"
});
const WAVE_WORKER_COMMITS = Object.freeze({
  "rcap-ok-sb-2030-current-text-and-currency":
    "c163388bf8fa713df33a799674241e90f20217da",
  "rcap-oh-automatic-sealing-current-law-reconciliation":
    "8dc94e9ea1b84a2b43bebf1ef3557e9477be69f5",
  "rcap-ny-mrta-destruction-request-source-identity-resolution":
    "6a129eb6176b2827e33b5809c43736bfefb063ce",
  "rcap-co-jdf-family-commercial-license":
    "dab225425903abd07b786601e21a7b30fa0765da",
  "rcap-la-arts-993-995-998-html-source-output-strategy-adjudication":
    "6583072d8d273a564d76917c174936026b11d448",
  "rcap-la-arts-993-995-998-html-authority-asset-capture":
    "1fd2f13bde646aa3a4385579473f3996cc04906e",
  "rcap-hi-in-repo-identity-reconciliation-hcjdc-159":
    "552aae83e2755f82990bf7c64fd0b64ef578ee73",
  "rcap-fl-source-identity-resolution-rule-3-989-continuation":
    "22d3ff3e88641fd3c9c9807a0349c4c051237ec2",
  "rcap-hi-stage-one-expungement-filing-vehicle-current-law-reconciliation":
    "d694f08cd73c7ead441582b32d01dca2c83d40b4",
  "rcap-hi-hcjdc-159b-technical-structure-and-edition-asset":
    "f7dd582fa34c6b9eb9ab41f0a86e03f204995b4e",
  "rcap-fl-rule-3-989-sworn-statement-identity-currentness":
    "0350e4279896db1a82f2e4d59f5c31271c23c97a",
  "rcap-il-in-repo-identity-reconciliation-rule-298":
    "c7db252eaf3c88461344f066cb1601c51c95f8e9",
  "rcap-co-jdf-2370-2371-component-remap-memo-correction":
    "3942768cfd7c316272f4a3996365daeddad8b6f3",
  "rcap-fl-rule-3-989-sworn-statement-and-3-9895-memo-correction":
    "b99a78921510e1c56a2fa05e728dabefa19ccdcd",
  "rcap-hi-stage-one-court-fee-addendum":
    "de73f9d122fb94206607f022f3a0fafcf5157557",
  "rcap-il-rule-298-fw-civ-component-remap-memo-correction":
    "10d2b958acbf75a9038dfc39dc41cc0c1525164a",
  "rcap-oh-automatic-sealing-memo-correction":
    "0ae8a4adc132051c9f9a2154a152885dfd6576ea",
  "rcap-or-2025-monetary-obligations-scope-reconciliation":
    "e8890c3f9cf201dc991310e2aa27c7edf9060240",
  "rcap-or-same-episode-rule-source-reconciliation":
    "b71077316e2adacdb7d06f4aed1e74201d8da195",
  "rcap-al-public-official-download":
    "d6b8ffc2e8f23f2d23098d2dadfa88d20074e548",
  "rcap-az-not-required-design-reconciliation":
    "cc20c5f16ca06cb256989f722f333aaeb3d85d81",
  "rcap-az-public-official-download":
    "45b881e872aea8364f007bf9e461dd72b518d617",
  "rcap-fl-public-official-download-fdle-fac-supersession":
    "cafead7ae8dfadbf56443999e0ed536df86af252",
  "rcap-ia-source-identity-resolution-certification-of-service":
    "b0083cd8b687105d725a2f0f050767a37974414b",
  "rcap-id-shield-revision-and-bci-identity-correction":
    "005c561bee930f4cf264da6c0f14d893a9ff2259",
  "rcap-il-notice-of-court-date-statewide-role-correction":
    "75c24386b87c13995fe4feff19ad3e97715ba452",
  "rcap-in-in-repo-identity-reconciliation-already-retained-under-another-identity":
    "b8fda0a9f6cf7dc216cef0d1c409a47a2372093e",
  "rcap-md-in-repo-identity-reconciliation-cc-dc-cr-072":
    "7996fa0c600d57d297025545708fc0a64725ce4c",
  "rcap-me-form-face-title-correction":
    "ad999b1f64631420ec05096eddf6906149b851bc",
  "rcap-mi-mc-227-revision-3-25-correction":
    "4036aed2e3f565bf193b3c875f34613b2e0223e0",
  "rcap-mn-in-repo-identity-reconciliation-needs-edition-reclass-not-acquisition":
    "0e8b19671ce349a0c26651d24b29f4a51bf615be",
  "rcap-mo-superseded-source-replacement":
    "a23c05e55fa632f06e495d7fb067338528150904",
  "rcap-mt-in-repo-identity-reconciliation-needs-edition-reclass-not-acquisition":
    "84d29fc9e0da4cff0dff7a88c1e66d70457d6e83",
  "rcap-fl-public-official-download":
    "b4825b72e1d54f3dc9cf732ac52794b05cfedd56",
  "rcap-mn-official-download-automation-blocked":
    "540a94a3c087b86766c6b29c313002f0c600cb38",
  "rcap-de-official-download-automation-blocked":
    "fc58e592c9f134ff1331aafa9bd9adbf1fe0448b",
  "rcap-oh-marijuana-governing-mechanism-reconciliation":
    "130a59b173eb0fdbd48acfdb52f3d030264f1758",
  "rcap-wa-crop-venue-reconciliation":
    "18932f7e0368d9aeb58bd1db76c101e8855272f7",
  "rcap-de-form-281e-edition-metadata-correction":
    "ba7cb9d72f03136bd5184494868d0c78e646bb73",
  "rcap-mo-official-download-automation-blocked":
    "81d8e6e41b52f2fae7bd5084073b1dd12db8e885",
  "rcap-mo-direct-issuer-request":
    "723630565e9d94d8138056555a501734622b1d0e",
  "rcap-in-commercial-license":
    "be05ebcf6f2f8f728e62389e9c54bd9fde0cfa7c",
  "rcap-fl-not-required-design-reconciliation":
    "384209ec048fe4da6036c4312c10e8f874b222d4",
  "rcap-ia-in-repo-identity-reconciliation-already-retained-under-another-identity":
    "af80c625c56561e2d2f9ac51fb6035507c83ac4a",
  "rcap-ia-not-required-design-reconciliation":
    "103acfce679568d090fb1a8140d083d8460f4210",
  "rcap-hi-custom-pleading":
    "be84e3c36e224f4f722e7b43df455b8a9a33115d",
  "rcap-oh-custom-pleading-clean-tracks":
    "54031d2599095b7144fc6bbf8ce062d250c60c8a",
  "rcap-wa-custom-pleading-clean-tracks":
    "0b19dc56f1cbef0ab5f2a82433a8b81c7eda35ab",
  "rcap-in-custom-pleading-technical-review-correction":
    "0c3253e1fd539e41a3bbe28dbcb842a8d953a43d",
  "rcap-ms-custom-pleading-technical-review-correction":
    "57a49c24892e96c40fef2c91f8cfc41baae779df",
  "rcap-ks-custom-pleading-technical-visual-review":
    "cbfac551ca51230cc860e66bae82884579a35456",
  "rcap-mn-custom-pleading-technical-visual-review":
    "525a054e38ac02194114bcfecaa559e0353663bc",
  "rcap-mo-custom-pleading-technical-visual-review":
    "733a80626f9065cba36552d4b6361a609d1cc400",
  "rcap-nd-custom-pleading-technical-visual-review":
    "d716c3cc14b10a5a7d309ec112cf420dcebefdda",
  "rcap-nj-guidance-implementation-technical-visual-review":
    "adf1bdc91f2fe47f3a5a69dd7b5cc16307e8fb5f",
  "rcap-mt-public-official-download":
    "123fc9a4506b242270ad527686958de522563791"
});
const COMPLETED_AUTHORITY_JOB_COMMITS = new Map([
  [
    "rcap-co-in-repo-identity-reconciliation-needs-edition-reclass-not-acquisition",
    "6afe0d989bb079dbd1eab377b0547b9b6908d902"
  ],
  [
    "rcap-ak-public-official-download",
    "4acded00a77584b0ea9c9f00e490e2a6a92dd033"
  ],
  [
    "rcap-me-public-official-download",
    "6912e16bc73dbb85612dc5ede86c6a472e5c1e91"
  ],
  [
    "rcap-mi-public-official-download",
    "6ad135bcd8ef53b36a8c63948056fec546ba24d0"
  ],
  [
    "rcap-id-public-official-download",
    "95c47cdbf031b71164e8f2ea4fb71299f61aad9b"
  ],
  [
    "rcap-il-public-official-download",
    "17e9cad367543a4f7b21b30d754d09e51ffbd898"
  ],
  [
    "rcap-co-official-download-automation-blocked",
    "2666e25fe748c021f5c668030fcabc7dac8b3fc4"
  ],
  [
    "rcap-co-source-identity-resolution-jdf-417-order",
    "124559c3a6c0010ed1d6883660268b0fcf4585fd"
  ],
  [
    "rcap-ks-source-identity-resolution-criminal-cover-sheet",
    "facfa75f6e25472181a4a40eac6c61c6809e720f"
  ],
  [
    "rcap-ca-local-form-scope-correction-sdsc-crm-307",
    "610f36c450173fc856fbbb188171d67e64f18845"
  ],
  [
    "rcap-ks-commercial-license",
    "b0cfdae005c897083180e2d49e48059b0f495463"
  ],
  [
    "rcap-co-jdf-2370-role-and-jdf-2371-mapping-correction",
    "117e7a653e4b63999380ab7fab6afecb3635bc3a"
  ],
  [
    "rcap-ma-official-download-automation-blocked",
    "7cd0227027e29c6f2d82d4ac7b1289b5d4b7687a"
  ],
  [
    "rcap-la-public-official-download",
    "19c137d0a5ed42f0b89eb150abd3954e3cdc0f3e"
  ],
  [
    "rcap-ok-sb-2030-current-text-and-currency",
    "bf06ee8f97e18f61c2cc7159c8244caa8085efa1"
  ],
  [
    "rcap-oh-automatic-sealing-current-law-reconciliation",
    "bf06ee8f97e18f61c2cc7159c8244caa8085efa1"
  ],
  [
    "rcap-ny-mrta-destruction-request-source-identity-resolution",
    "bf06ee8f97e18f61c2cc7159c8244caa8085efa1"
  ],
  [
    "rcap-co-jdf-family-commercial-license",
    "bf06ee8f97e18f61c2cc7159c8244caa8085efa1"
  ],
  [
    "rcap-la-arts-993-995-998-html-source-output-strategy-adjudication",
    "bf06ee8f97e18f61c2cc7159c8244caa8085efa1"
  ],
  [
    "rcap-la-arts-993-995-998-html-authority-asset-capture",
    "5f5cf3def0b9cbc1e88084cc261bd60abaf48675"
  ],
  [
    "rcap-hi-in-repo-identity-reconciliation-hcjdc-159",
    "5f5cf3def0b9cbc1e88084cc261bd60abaf48675"
  ],
  [
    "rcap-fl-source-identity-resolution-rule-3-989-continuation",
    "5f5cf3def0b9cbc1e88084cc261bd60abaf48675"
  ],
  [
    "rcap-hi-hcjdc-159b-technical-structure-and-edition-asset",
    "2fccb6a47fc4706d2f235f26c15b7af29ebef634"
  ],
  [
    "rcap-fl-rule-3-989-sworn-statement-identity-currentness",
    "2fccb6a47fc4706d2f235f26c15b7af29ebef634"
  ],
  [
    "rcap-il-in-repo-identity-reconciliation-rule-298",
    "2fccb6a47fc4706d2f235f26c15b7af29ebef634"
  ],
  [
    "rcap-or-2025-monetary-obligations-scope-reconciliation",
    "0846d05dbb446e976985781293a371336cc86369"
  ],
  [
    "rcap-or-same-episode-rule-source-reconciliation",
    "0846d05dbb446e976985781293a371336cc86369"
  ],
  [
    "rcap-al-public-official-download",
    "0846d05dbb446e976985781293a371336cc86369"
  ],
  [
    "rcap-az-not-required-design-reconciliation",
    "0846d05dbb446e976985781293a371336cc86369"
  ],
  [
    "rcap-az-public-official-download",
    "0846d05dbb446e976985781293a371336cc86369"
  ],
  [
    "rcap-fl-public-official-download-fdle-fac-supersession",
    "0846d05dbb446e976985781293a371336cc86369"
  ],
  [
    "rcap-ia-source-identity-resolution-certification-of-service",
    "0846d05dbb446e976985781293a371336cc86369"
  ],
  [
    "rcap-id-shield-revision-and-bci-identity-correction",
    "0846d05dbb446e976985781293a371336cc86369"
  ],
  [
    "rcap-il-notice-of-court-date-statewide-role-correction",
    "0846d05dbb446e976985781293a371336cc86369"
  ],
  [
    "rcap-in-in-repo-identity-reconciliation-already-retained-under-another-identity",
    "0846d05dbb446e976985781293a371336cc86369"
  ],
  [
    "rcap-md-in-repo-identity-reconciliation-cc-dc-cr-072",
    "0846d05dbb446e976985781293a371336cc86369"
  ],
  [
    "rcap-me-form-face-title-correction",
    "0846d05dbb446e976985781293a371336cc86369"
  ],
  [
    "rcap-mi-mc-227-revision-3-25-correction",
    "0846d05dbb446e976985781293a371336cc86369"
  ],
  [
    "rcap-mn-in-repo-identity-reconciliation-needs-edition-reclass-not-acquisition",
    "0846d05dbb446e976985781293a371336cc86369"
  ],
  [
    "rcap-mo-superseded-source-replacement",
    "0846d05dbb446e976985781293a371336cc86369"
  ],
  [
    "rcap-mt-in-repo-identity-reconciliation-needs-edition-reclass-not-acquisition",
    "0846d05dbb446e976985781293a371336cc86369"
  ],
  [
    "rcap-mt-public-official-download",
    "0846d05dbb446e976985781293a371336cc86369"
  ],
  [
    "rcap-fl-public-official-download",
    "f35f634669effa4bcec01a51a16205cd690ab5f8"
  ],
  [
    "rcap-mn-official-download-automation-blocked",
    "508581b62d4ca36e8187733b1fc6ad0390c4597b"
  ],
  [
    "rcap-de-official-download-automation-blocked",
    "508581b62d4ca36e8187733b1fc6ad0390c4597b"
  ],
  [
    "rcap-de-form-281e-edition-metadata-correction",
    "01b28373ad3c572fea667bb76f3fd8f4d6f08ed6"
  ],
  [
    "rcap-mo-official-download-automation-blocked",
    "01b28373ad3c572fea667bb76f3fd8f4d6f08ed6"
  ],
  [
    "rcap-mo-direct-issuer-request",
    "01b28373ad3c572fea667bb76f3fd8f4d6f08ed6"
  ],
  [
    "rcap-in-commercial-license",
    "01b28373ad3c572fea667bb76f3fd8f4d6f08ed6"
  ],
  [
    "rcap-fl-not-required-design-reconciliation",
    "01b28373ad3c572fea667bb76f3fd8f4d6f08ed6"
  ],
  [
    "rcap-ia-in-repo-identity-reconciliation-already-retained-under-another-identity",
    "01b28373ad3c572fea667bb76f3fd8f4d6f08ed6"
  ],
  [
    "rcap-ia-not-required-design-reconciliation",
    "01b28373ad3c572fea667bb76f3fd8f4d6f08ed6"
  ]
]);
const NO_DOWNLOAD_AUTHORITY_FAMILIES = new Set([
  "in_repo_identity_reconciliation",
  "local_form_scope_correction",
  "source_identity_resolution",
  "not_required_design_reconciliation",
  "superseded_source_replacement"
]);

const LANE_CONFIGURATION = Object.freeze({
  platform_foundation: {
    strategyFamily: "platform_foundation",
    model: "codex",
    effort: "xhigh",
    output() {
      return "src/lib/rcap/packets/template-hash.ts";
    },
    commitSubject() {
      return "feat(record-clearing): hash packet template families";
    },
    stopCondition:
      "Implement only the bounded template-hash and verifier outputs. Stop before editing shared " +
      "generated registries, package scripts, runtime status, promotion status, or legal data. " +
      TERMINAL_INSTRUCTION
  },
  legal_design_normalization: {
    strategyFamily: "legal_design",
    model: "opus",
    effort: "high",
    output(state) {
      return `data/record-clearing/legal-design-intake/${state.code}.memo.json`;
    },
    commitSubject(state) {
      return `feat(record-clearing): normalize ${state.code} legal design`;
    },
    stopCondition:
      "Stop if controlling authority is absent or a legal conclusion would need to be inferred. " +
      TERMINAL_INSTRUCTION
  },
  source_acquisition: {
    strategyFamily: "source_acquisition",
    model: "opus",
    effort: "high",
    output(state) {
      return `${FACTORY_DATA_DIR}/source-acquisition/${state.slug}.json`;
    },
    commitSubject(state) {
      return `chore(record-clearing): stage ${state.code} source acquisition`;
    },
    stopCondition:
      "Stop with an explicit unresolved disposition when identity, provenance, currentness, or " +
      "commercial-use authority cannot be established; never alter an adopted Master Library edition. " +
      TERMINAL_INSTRUCTION
  },
  custom_pleading: {
    strategyFamily: "custom_pleading",
    model: "codex",
    effort: "high",
    output(state) {
      return `${PACKET_IMPLEMENTATION_DIR}/${state.slug}/custom-pleading.ts`;
    },
    commitSubject(state) {
      return `feat(record-clearing): implement ${state.code} custom pleading`;
    },
    stopCondition:
      "Stop if the normalized track does not supply a complete pleading specification or if local " +
      "language would have to be invented. " +
      TERMINAL_INSTRUCTION
  },
  acroform_fill: {
    strategyFamily: "official_pdf_fill",
    model: "codex",
    effort: "high",
    output(state) {
      return `${PACKET_IMPLEMENTATION_DIR}/${state.slug}/acroform.ts`;
    },
    commitSubject(state) {
      return `feat(record-clearing): implement ${state.code} AcroForm fill`;
    },
    stopCondition:
      "Stop when a field's participant ownership or semantic meaning is uncertain; detectable PDF " +
      "fields are not silently approved. " +
      TERMINAL_INSTRUCTION
  },
  flat_pdf_overlay: {
    strategyFamily: "official_pdf_fill",
    model: "codex",
    effort: "high",
    output(state) {
      return `${PACKET_IMPLEMENTATION_DIR}/${state.slug}/overlay.ts`;
    },
    commitSubject(state) {
      return `feat(record-clearing): implement ${state.code} PDF overlay`;
    },
    stopCondition:
      "Stop with unconfirmed coordinates when visual placement or field ownership is uncertain; do " +
      "not mark an overlay visually approved. " +
      TERMINAL_INSTRUCTION
  },
  composed_route: {
    strategyFamily: "composed",
    model: "codex",
    effort: "high",
    output(state) {
      return `${PACKET_IMPLEMENTATION_DIR}/${state.slug}/composed.ts`;
    },
    commitSubject(state) {
      return `feat(record-clearing): implement ${state.code} composed routes`;
    },
    stopCondition:
      "Stop if composition order, branch predicate, or unit strategy is unresolved; never select the " +
      "first available unit as a fallback. " +
      TERMINAL_INSTRUCTION
  },
  guidance_implementation: {
    strategyFamily: "process_guidance",
    model: "codex",
    effort: "high",
    output(state) {
      return `${PACKET_IMPLEMENTATION_DIR}/${state.slug}/guidance.ts`;
    },
    commitSubject(state) {
      return `feat(record-clearing): implement ${state.code} guidance`;
    },
    stopCondition:
      "Stop if the normalized packet instructions do not answer the route; never turn guidance into " +
      "a court filing or add legal advice. " +
      TERMINAL_INSTRUCTION
  },
  legal_output_review: {
    strategyFamily: "legal_output_review",
    model: "opus",
    effort: "high",
    output(state) {
      return `${FACTORY_DATA_DIR}/legal-output-reviews/${state.slug}.json`;
    },
    commitSubject(state) {
      return `docs(record-clearing): review ${state.code} legal output`;
    },
    stopCondition:
      "Record a recommendation and exact defects only. Stop without adopting counsel approval or " +
      "editing packet text, legal conclusions, track strategy, or authority classification. " +
      TERMINAL_INSTRUCTION
  },
  staging_promotion: {
    strategyFamily: "staging_promotion",
    model: "codex",
    effort: "high",
    output(state) {
      return `${FACTORY_DATA_DIR}/staging/${state.slug}.json`;
    },
    commitSubject(state) {
      return `chore(record-clearing): stage ${state.code} promotion evidence`;
    },
    stopCondition:
      "Produce dry-run staging evidence only. Stop before any runtime, promotion, live-routing, " +
      "packet_ready, enabled-jurisdiction, deployment, or production-environment change. " +
      TERMINAL_INSTRUCTION
  }
});

export function buildFactoryPlan(options = {}) {
  const rootDir = resolveRoot(options);
  const inputs = readFactoryInputs(rootDir);
  const baseCommit = resolveBaseCommit(rootDir, options.baseCommit);
  const authorityEdition = String(inputs.authority.edition);
  const authorityVersion = `master-library/${authorityEdition}`;

  const states = canonicalStates(inputs);
  const stateByCode = new Map(states.map((state) => [state.code, state]));
  const jobs = [];
  const jobsByLaneAndState = new Map();
  const claimsByJobId = new Map(
    (inputs.jobClaims.claims ?? [])
      .filter((claim) => claim.targetType === "compiled_job")
      .map((claim) => [claim.jobId, claim])
  );

  const addJob = ({
    lane,
    jurisdiction,
    trackIds = [],
    dependencies = [],
    requiredInputs = [],
    jobId: requestedJobId,
    strategyFamily,
    expectedOutputs,
    ownedPaths,
    forbiddenPaths,
    integrationOwnedOutputs,
    acquisitionIds = [],
    reconciliationIds = [],
    requiredOutputFields,
    downloadedSourceCount,
    completionCommit,
    workerBranch,
    workerCommit,
    implementationState,
    supersededBy,
    implementedTrackIds,
    priorCompletionCommit,
    regressionVerifier,
    participantPacketProofRequired,
    sourceMaterializationInputs,
    legalReviewMaterializationAssignment,
    officialPdfAssignment,
    officialPdfConsumerDependencies,
    normalizationReadiness,
    executionNote,
    model,
    effort,
    executionScope = "worker",
    status,
    focusedValidation,
    commitSubject,
    stopCondition
  }) => {
    const state =
      jurisdiction === "NATIONWIDE"
        ? { code: "NATIONWIDE", name: "Nationwide", slug: "nationwide" }
        : stateByCode.get(jurisdiction);
    if (!state) throw new Error(`Planner produced a job for unknown jurisdiction ${jurisdiction}.`);
    const config = LANE_CONFIGURATION[lane];
    if (!config) throw new Error(`Planner produced an unknown lane ${lane}.`);

    const jobId = requestedJobId ?? jobIdFor(jurisdiction, lane);
    const outputs = (expectedOutputs ?? [config.output(state)]).map((output) =>
      normalizeRepoPath(output, `${jobId} output`)
    );
    const reviewManifest = `${REVIEW_MANIFEST_DIR}/${jobId}.json`;
    const resolvedStrategyFamily = strategyFamily ?? config.strategyFamily;
    const assignmentField =
      acquisitionIds.length > 0
        ? "acquisitionIds"
        : reconciliationIds.length > 0
          ? "reconciliationIds"
          : null;
    const job = {
      jobId,
      lane,
      jurisdiction,
      trackIds: sortedUnique(trackIds.filter(Boolean)),
      strategyFamily: resolvedStrategyFamily,
      baseCommit,
      dependencies: sortedUnique(dependencies),
      ownedPaths: sortedUnique(ownedPaths ?? outputs),
      integrationOwnedOutputs: sortedUnique(
        integrationOwnedOutputs ?? [reviewManifest]
      ),
      forbiddenPaths: sortedUnique(
        forbiddenPaths ?? GLOBAL_WORKER_FORBIDDEN_PATHS
      ),
      requiredInputs: sortedUnique(requiredInputs),
      expectedOutputs: outputs,
      requiredOutputFields: sortedUnique(
        requiredOutputFields ??
          (lane === "source_acquisition" &&
          resolvedStrategyFamily !== "edition_publication" &&
          assignmentField
            ? [assignmentField, "downloadedSourceCount"]
            : [])
      ),
      focusedValidation:
        focusedValidation ??
        [`node scripts/rcap-factory-plan.mjs --check-job ${jobId}`],
      integrationValidation: [...WAVE_INTEGRATION_VALIDATION],
      model: model ?? config.model,
      effort: effort ?? config.effort,
      executionScope,
      status: status ?? (dependencies.length > 0 ? "blocked" : "ready"),
      commitSubject: commitSubject ?? config.commitSubject(state),
      stopCondition: stopCondition ?? config.stopCondition
    };
    if (acquisitionIds.length > 0) {
      job.acquisitionIds = sortedUnique(acquisitionIds);
    }
    if (reconciliationIds.length > 0) {
      job.reconciliationIds = sortedUnique(reconciliationIds);
    }
    if (Number.isInteger(downloadedSourceCount)) {
      job.downloadedSourceCount = downloadedSourceCount;
    }
    if (completionCommit) {
      job.completionCommit = completionCommit;
    }
    // The worker result an integrated completion actually came from. Recorded
    // where the captain's completion record pins it, so a review manifest can
    // bind the finished output to the branch and commit that produced it
    // rather than to the integration commit alone.
    if (workerBranch) {
      job.workerBranch = workerBranch;
    }
    if (workerCommit) {
      job.workerCommit = workerCommit;
    }
    // Delivered work that is integrated but must not be used as it stands.
    // "blocked" says the job cannot proceed; this says why, so a reader does
    // not mistake integrated code for usable code.
    if (implementationState) {
      job.implementationState = implementationState;
    }
    // A split assignment records what replaced it, so "cancelled" is never
    // read as "abandoned" or as "delivered".
    if (Array.isArray(supersededBy) && supersededBy.length > 0) {
      job.supersededBy = sortedUnique(supersededBy);
    }
    // A reissued expansion carries what the integrated commit already built, so
    // the tracks behind it stay attributed to that commit instead of silently
    // reverting to unbuilt when the lane widens.
    if (Array.isArray(implementedTrackIds) && implementedTrackIds.length > 0) {
      job.implementedTrackIds = sortedUnique(implementedTrackIds);
    }
    if (priorCompletionCommit) {
      job.priorCompletionCommit = priorCompletionCommit;
    }
    if (regressionVerifier) {
      job.regressionVerifier = normalizeRepoPath(
        regressionVerifier,
        `${jobId} regressionVerifier`
      );
    }
    if (participantPacketProofRequired !== undefined) {
      job.participantPacketProofRequired = participantPacketProofRequired;
    }
    if (sourceMaterializationInputs) {
      job.sourceMaterializationInputs = sourceMaterializationInputs;
    }
    if (legalReviewMaterializationAssignment) {
      job.legalReviewMaterializationAssignment =
        legalReviewMaterializationAssignment;
    }
    if (officialPdfAssignment) {
      job.officialPdfAssignment = officialPdfAssignment;
    }
    if (officialPdfConsumerDependencies) {
      job.officialPdfConsumerDependencies =
        officialPdfConsumerDependencies;
    }
    if (normalizationReadiness) {
      job.normalizationReadiness = normalizationReadiness;
    }
    if (executionNote) {
      job.executionNote = executionNote;
    }
    const assignmentClaim = claimsByJobId.get(jobId);
    if (
      assignmentClaim &&
      !["completed", "cancelled"].includes(job.status)
    ) {
      job.assignmentClaim = structuredClone(assignmentClaim);
    }

    jobs.push(job);
    const stateKey = `${lane}:${jurisdiction}`;
    jobsByLaneAndState.set(stateKey, [...(jobsByLaneAndState.get(stateKey) ?? []), job]);
    return job;
  };

  const jobsFor = (lane, jurisdiction) =>
    jobsByLaneAndState.get(`${lane}:${jurisdiction}`) ?? [];
  const firstJobFor = (lane, jurisdiction) => jobsFor(lane, jurisdiction)[0];

  addJob({
    lane: "platform_foundation",
    jurisdiction: "NATIONWIDE",
    jobId: "rcap-nationwide-template-family-hash-infrastructure",
    expectedOutputs: [
      "src/lib/rcap/packets/template-hash.ts",
      "scripts/verify-rcap-template-family-coverage.mjs"
    ],
    ownedPaths: [
      "src/lib/rcap/packets/template-hash.ts",
      "scripts/verify-rcap-template-family-coverage.mjs"
    ],
    requiredInputs: [
      FACTORY_INPUT_PATHS.normalizedTracks,
      FACTORY_INPUT_PATHS.packetSetManifests,
      FACTORY_INPUT_PATHS.packetCapabilityRegistry
    ],
    status: "completed",
    completionCommit: TEMPLATE_HASH_WORKER_COMMIT,
    stopCondition:
      `Terminal completed child: source commit ${TEMPLATE_HASH_WORKER_COMMIT} is integrated. ` +
      "Do not scaffold, execute, or regenerate this template-family hashing work."
  });
  addJob({
    lane: "platform_foundation",
    jurisdiction: "NATIONWIDE",
    jobId: "rcap-nationwide-track-promotion-contract",
    dependencies: ["rcap-nationwide-template-family-hash-infrastructure"],
    status: "completed",
    completionCommit: TRACK_PROMOTION_WORKER_COMMIT,
    expectedOutputs: [
      "docs/rcap-promotion/track-approval-template.json",
      "scripts/rcap-apply-track-promotion-batch.mjs",
      "scripts/verify-rcap-track-promotion.mjs"
    ],
    ownedPaths: [
      "docs/rcap-promotion/track-approval-template.json",
      "scripts/rcap-apply-track-promotion-batch.mjs",
      "scripts/verify-rcap-track-promotion.mjs"
    ],
    requiredInputs: [
      "src/lib/rcap/packets/template-hash.ts",
      "data/record-clearing/template-families/ADOPT-01-custom-pleading-family-adoption.json",
      "data/record-clearing/template-families/ADOPT-02-official-acroform-family-adoption.json",
      "docs/rcap-promotion/batch-approval-template.json",
      FACTORY_INPUT_PATHS.normalizedTracks,
      FACTORY_INPUT_PATHS.packetCapabilityRegistry,
      FACTORY_INPUT_PATHS.statePromotionManifest
    ],
    model: "codex",
    effort: "xhigh",
    focusedValidation: [
      "node scripts/rcap-factory-plan.mjs --check-job rcap-nationwide-track-promotion-contract",
      "node scripts/verify-rcap-track-promotion.mjs"
    ],
    commitSubject: "feat(record-clearing): add the per-track promotion contract",
    stopCondition:
      `Terminal completed child: source commit ${TRACK_PROMOTION_WORKER_COMMIT} is integrated. ` +
      "Preserve the fail-closed, hash-bound per-track approval and route-scoped staging contract. " +
      "Do not scaffold, execute, apply an approval batch, promote a track, enable runtime, or deploy."
  });
  const sourceMaterializationFoundation = addJob({
    lane: "platform_foundation",
    jurisdiction: "NATIONWIDE",
    jobId: "rcap-nationwide-source-materialization-contract",
    strategyFamily: "platform_foundation",
    expectedOutputs: [
      "docs/record-clearing/RCAP_SOURCE_MATERIALIZATION_CONTRACT.md",
      "scripts/verify-rcap-materialized-source.mjs",
      "scripts/verify-rcap-source-materialization-contract.mjs"
    ],
    requiredInputs: [
      FACTORY_INPUT_PATHS.authority,
      FACTORY_INPUT_PATHS.sourceArtifacts,
      FACTORY_INPUT_PATHS.sourceRelationships
    ],
    model: "codex",
    effort: "xhigh",
    status: "completed",
    completionCommit: SOURCE_MATERIALIZATION_WORKER_COMMIT,
    focusedValidation: [
      "node scripts/rcap-factory-plan.mjs --check-job rcap-nationwide-source-materialization-contract",
      "node scripts/verify-rcap-source-materialization-contract.mjs"
    ],
    commitSubject: "feat(record-clearing): define source materialization contract",
    stopCondition:
      `Terminal completed child: source commit ${SOURCE_MATERIALIZATION_WORKER_COMMIT} is integrated. ` +
      "Preserve the portable, hash-verifying, read-only source-materialization contract. Do not " +
      "scaffold, execute, acquire or reconstruct binaries, enable runtime, promote a route, or deploy."
  });

  const normalizedTracks = [...inputs.normalizedTracks.tracks].sort(compareTracks);
  const tracksByState = groupBy(normalizedTracks, (track) => track.jurisdiction);
  const outstanding = sortedUnique(inputs.implementationQueue.outstandingJurisdictions ?? []);
  const completedNormalizationJurisdictions =
    COMPLETED_NORMALIZATIONS.map(
      (record) => record.jurisdiction
    );
  // Decision records live under legal-design-decisions, not under
  // guidance-specifications: that directory has a strict authored
  // process-guidance component contract, and legal-design intake rejects any
  // file in it that is not one.
  const paPardonAdjudicationRecord =
    `${FACTORY_DATA_DIR}/legal-design-decisions/` +
    "pa-pardon-composed-unit-approval-adjudication.json";
  const paPardonAdjudicationClosed = fs.existsSync(
    path.join(rootDir, paPardonAdjudicationRecord)
  );
  const pennsylvaniaMemoPath =
    "data/record-clearing/legal-design-intake/PA.memo.json";
  const pennsylvaniaNormalizationComplete = fs.existsSync(
    path.join(rootDir, pennsylvaniaMemoPath)
  );
  const normalizationReadinessRecords = buildNormalizationReadinessRecords({
    input: inputs.normalizationReadiness,
    authority: inputs.authority,
    repositoryAssetAudit: inputs.repositoryAssetAudit,
    claims: inputs.jobClaims,
    outstandingJurisdictions: sortedUnique([
      ...outstanding,
      ...completedNormalizationJurisdictions,
      ...(pennsylvaniaNormalizationComplete ? ["PA"] : [])
    ])
  });
  const readinessFoundationComplete = normalizationFoundationComplete(
    inputs.normalizationReadiness
  );
  const normalizationReadinessFoundation = addJob({
    lane: "platform_foundation",
    jurisdiction: "NATIONWIDE",
    jobId: NORMALIZATION_READINESS_FOUNDATION_JOB_ID,
    strategyFamily: "normalization_readiness",
    dependencies: [sourceMaterializationFoundation.jobId],
    expectedOutputs: [
      FACTORY_INPUT_PATHS.normalizationReadiness,
      FACTORY_INPUT_PATHS.jobClaims,
      "docs/record-clearing/RCAP_NORMALIZATION_READINESS_CONTRACT.md",
      "scripts/lib/rcap-factory/normalization-readiness.mjs",
      "scripts/verify-rcap-normalization-readiness.mjs"
    ],
    ownedPaths: [
      FACTORY_INPUT_PATHS.normalizationReadiness,
      FACTORY_INPUT_PATHS.jobClaims,
      "docs/record-clearing/RCAP_NORMALIZATION_READINESS_CONTRACT.md",
      "scripts/lib/rcap-factory/normalization-readiness.mjs",
      "scripts/verify-rcap-normalization-readiness.mjs"
    ],
    forbiddenPaths: GLOBAL_WORKER_FORBIDDEN_PATHS.filter(
      (candidate) =>
        ![
          FACTORY_INPUT_PATHS.normalizationReadiness,
          FACTORY_INPUT_PATHS.jobClaims
        ].includes(candidate)
    ),
    requiredInputs: [
      FACTORY_INPUT_PATHS.authority,
      FACTORY_INPUT_PATHS.repositoryAssetAudit,
      "docs/record-clearing/RCAP_SOURCE_MATERIALIZATION_CONTRACT.md",
      "planning/record-clearing-100-percent/jobs/F-01-batch-3-expected-track-ids.json"
    ],
    model: "codex",
    effort: "xhigh",
    executionScope: "captain",
    status: readinessFoundationComplete ? "completed" : "in_progress",
    focusedValidation: [
      "node scripts/verify-rcap-normalization-readiness.mjs"
    ],
    commitSubject:
      "feat(record-clearing): materialize normalization readiness",
    stopCondition:
      "The integration captain owns this foundation. Complete it only after both reserved research " +
      "bundles cover all 24 jurisdictions exactly once and every review, inventory, expected source " +
      "ID, and authority-refresh gate validates. Do not normalize a jurisdiction or publish Edition 1.3."
  });

  const legalReviewContractIssues =
    validateLegalReviewMaterializationContract(
      inputs.legalReviewMaterialization
    );
  if (legalReviewContractIssues.length > 0) {
    throw new Error(
      "Invalid legal-review materialization contract:\n- " +
        legalReviewContractIssues.join("\n- ")
    );
  }
  const legalReviewMaterializers = new Map();
  const legalReviewArchiveAvailable =
    exactLegalReviewArchiveAvailable(
      inputs.legalReviewMaterialization
    );
  for (const assignment of inputs.legalReviewMaterialization.assignments) {
    const materializationComplete =
      legalReviewMaterializationVerified(rootDir, assignment);
    const job = addJob({
      lane: "platform_foundation",
      jurisdiction: assignment.jurisdiction,
      jobId: assignment.jobId,
      strategyFamily: "legal_review_materialization",
      dependencies: [sourceMaterializationFoundation.jobId],
      expectedOutputs: [
        assignment.activeReview.materializationDestination,
        assignment.receiptOutput
      ],
      ownedPaths: assignment.ownedPaths,
      requiredInputs: [
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.repositoryAssetAudit,
        FACTORY_INPUT_PATHS.normalizationReadiness,
        FACTORY_INPUT_PATHS.legalReviewMaterialization
      ],
      legalReviewMaterializationAssignment:
        structuredClone(assignment),
      model: "codex",
      effort: "xhigh",
      executionScope: "captain",
      status: materializationComplete
        ? "completed"
        : legalReviewArchiveAvailable
          ? "ready"
          : "blocked",
      focusedValidation: [assignment.verificationCommand],
      commitSubject:
        `chore(record-clearing): materialize ${assignment.jurisdiction} legal review`,
      stopCondition: assignment.stopCondition
    });
    job.assignmentClaim = structuredClone(assignment.assignmentClaim);
    legalReviewMaterializers.set(assignment.jurisdiction, job);
  }

  for (const record of COMPLETED_NORMALIZATIONS) {
    const memoPath =
      `data/record-clearing/legal-design-intake/${record.jurisdiction}.memo.json`;
    const absoluteMemoPath = path.join(rootDir, memoPath);
    if (
      !fs.existsSync(absoluteMemoPath) ||
      // Every recorded historical state of the same file is acceptable. A memo
      // can be amended more than once — New York was corrected for packet
      // capability and then again for the filing destination — and each hash
      // stays on the record rather than the latest overwriting the last.
      ![
        record.memoSha256,
        record.amendedMemoSha256,
        record.secondAmendedMemoSha256
      ]
        .filter(Boolean)
        .includes(sha256File(absoluteMemoPath))
    ) {
      throw new Error(
        `${record.jurisdiction} completed normalization memo does not match ` +
          `${[
            record.memoSha256,
            record.amendedMemoSha256,
            record.secondAmendedMemoSha256
          ]
            .filter(Boolean)
            .join(" or ")}.`
      );
    }
    const normalizationReadiness =
      normalizationReadinessRecords.get(record.jurisdiction);
    const reviewMaterializer =
      legalReviewMaterializers.get(record.jurisdiction);
    if (!normalizationReadiness || !reviewMaterializer) {
      throw new Error(
        `${record.jurisdiction} completed normalization lacks readiness or review materialization.`
      );
    }
    const workerProvenance = record.correctionCommit
      ? `Original worker ${record.originalWorkerCommit} was corrected by ` +
        `${record.correctionCommit}; the correction`
      : `Worker ${record.workerCommit}`;
    // A job reissued under a rebuilt assignment leaves an earlier worker branch
    // behind. That branch is preserved unrewritten for audit and must never be
    // integrated, so the replacement relationship is recorded on the job rather
    // than left to the branch names.
    const supersessionNote = record.supersededWorkerCommit
      ? ` Branch ${record.workerBranch} replaced ` +
        `${record.supersededWorkerBranch} at ${record.supersededWorkerCommit}; ` +
        "the superseded branch is preserved unchanged for audit and was not integrated."
      : "";
    // A worker that committed under the wrong subject cannot be amended once
    // pushed, so the mismatch travels with the job rather than disappearing into
    // a captain commit that looks ordinary.
    const subjectNote = record.subjectMismatchResolvedByCaptainEquivalentCommit
      ? ` Worker subject ${JSON.stringify(record.workerCommitSubject)} did not match the ` +
        "factory-pinned subject, so the exact memo blob was carried into the " +
        "captain-equivalent commit under the required subject; the claim is exact " +
        "memo-blob equivalence, not Git commit equivalence, and the worker branch " +
        "was not amended, rebased or force-pushed."
      : "";
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: record.jurisdiction,
      jobId: jobIdFor(
        record.jurisdiction,
        "legal_design_normalization"
      ),
      status: "completed",
      completionCommit: record.completionCommit,
      normalizationReadiness: {
        ...normalizationReadiness,
        readinessState: "normalization_complete",
        readinessBlockers: []
      },
      dependencies: [
        normalizationReadinessFoundation.jobId,
        reviewMaterializer.jobId
      ],
      expectedOutputs: [memoPath],
      ownedPaths: [memoPath],
      requiredInputs: [
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.repositoryAssetAudit,
        FACTORY_INPUT_PATHS.normalizationReadiness,
        FACTORY_INPUT_PATHS.jobClaims,
        FACTORY_INPUT_PATHS.blockerLedger,
        "data/record-clearing/master-library/edition-1-2-legal-design-reconciliation-queue.json",
        FACTORY_INPUT_PATHS.allStateBuildStatus,
        "planning/record-clearing-100-percent/jobs/F-01-batch-3-expected-track-ids.json",
        normalizationReadiness.reviewMaterialization
          .materializationDestination
      ],
      focusedValidation: [
        `node scripts/rcap-factory-plan.mjs --check-job ${jobIdFor(
          record.jurisdiction,
          "legal_design_normalization"
        )}`,
        normalizationReadiness.reviewMaterialization.verificationCommand,
        "node scripts/verify-rcap-legal-design-intake.mjs"
      ],
      executionNote:
        `${workerProvenance} supplied the exact memo blob ` +
        `${record.memoSha256}; captain-equivalent commit ${record.completionCommit} ` +
        "preserves that blob without stale shared generated outputs." +
        supersessionNote +
        subjectNote,
      stopCondition:
        `Terminal completed child: ${workerProvenance.toLowerCase()} is represented by ` +
        `captain-equivalent commit ${record.completionCommit}. Preserve the exact memo blob and ` +
        "data-derived blockers; do not normalize it again, enable runtime, promote, or deploy."
    });
  }

  if (pennsylvaniaNormalizationComplete) {
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "PA",
      jobId: "rcap-pa-legal-design-normalization",
      trackIds: (tracksByState.get("PA") ?? []).map((track) => track.trackId),
      status: "completed",
      completionCommit: PENNSYLVANIA_NORMALIZATION_WORKER_COMMIT,
      normalizationReadiness: {
        ...normalizationReadinessRecords.get("PA"),
        readinessState: "normalization_complete",
        readinessBlockers: []
      },
      expectedOutputs: [pennsylvaniaMemoPath],
      ownedPaths: [pennsylvaniaMemoPath],
      requiredInputs: [
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.repositoryAssetAudit,
        "data/record-clearing/master-library/edition-1-2-legal-design-reconciliation-queue.json",
        normalizationReadinessRecords.get("PA").reviewMaterialization
          .materializationDestination
      ],
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-pa-legal-design-normalization",
        normalizationReadinessRecords.get("PA").reviewMaterialization
          .verificationCommand,
        "node scripts/verify-rcap-legal-design-intake.mjs"
      ],
      commitSubject: "feat(record-clearing): normalize PA legal design",
      stopCondition:
        `Terminal completed child: source commit ${PENNSYLVANIA_NORMALIZATION_WORKER_COMMIT} ` +
        "is integrated. Preserve the bounded Pennsylvania design and its unresolved Track 11 " +
        "packet-identity question; do not normalize it again, adopt that unresolved route, enable " +
        "runtime, promote, or deploy."
    });
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "PA",
      jobId: "rcap-pa-clean-slate-correction-adjudication",
      strategyFamily: "legal_design_adjudication",
      trackIds: [],
      dependencies: ["rcap-pa-legal-design-normalization"],
      status: "blocked",
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/guidance-specifications/pa-clean-slate-correction-adjudication.json`
      ],
      ownedPaths: [
        `${FACTORY_DATA_DIR}/guidance-specifications/pa-clean-slate-correction-adjudication.json`
      ],
      requiredInputs: [
        pennsylvaniaMemoPath,
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "high",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-pa-clean-slate-correction-adjudication"
      ],
      commitSubject:
        "docs(record-clearing): adjudicate Pennsylvania clean-slate correction",
      stopCondition:
        "Resolve the Pennsylvania Track 11 packet identity and legal effect from controlling " +
        "authority. Do not invent a normalized track, filing, or remedy; do not inherit standing " +
        "counsel adoption; and do not enable, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "PA",
      jobId: "rcap-pa-pardon-composed-unit-approval-adjudication",
      strategyFamily: "legal_design_adjudication",
      trackIds: ["pa_pardon_expungement"],
      dependencies: ["rcap-pa-legal-design-normalization"],
      // Counsel answered this adjudication on 2026-08-06 and the decision record
      // is committed, so the job closes on the presence of that record rather
      // than on an assertion in a commit message.
      status: paPardonAdjudicationClosed ? "completed" : "blocked",
      expectedOutputs: [paPardonAdjudicationRecord],
      ownedPaths: [paPardonAdjudicationRecord],
      requiredInputs: [
        pennsylvaniaMemoPath,
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.packetSetManifests,
        "data/record-clearing/legal-design-composed-unit-approvals.json",
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "high",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-pa-pardon-composed-unit-approval-adjudication"
      ],
      commitSubject:
        "docs(record-clearing): adjudicate Pennsylvania pardon composition",
      stopCondition:
        "Determine whether pa_pardon_expungement is composed and, if so, the exact unit " +
        "structure, unit destinations, unit availability, and substantive composed-unit " +
        "approval. Do not fabricate an approval, alter the Pennsylvania memo, infer a route, " +
        "claim participant packet proof, enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  // Follow-ups opened by an integrated normalization memo. Each one exists
  // because the memo answered its own question honestly and left a distinct
  // question that must not be answered by quietly widening the memo. They are
  // registered only once the state they belong to is integrated, so the plan
  // never carries a follow-up to work that has not landed.
  const integratedNormalizations = new Set(completedNormalizationJurisdictions);

  if (integratedNormalizations.has("WV")) {
    // The West Virginia review surfaced a participant-facing mechanism under
    // W. Va. Code section 61-11-26(r) that the adopted ten-slot denominator does
    // not contain. Adding an eleventh slot to the integrated memo would change a
    // counsel-adopted structure on an engineering inference, so the mechanism is
    // carried here instead, blocked, until it is established on its own terms.
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "WV",
      jobId: "rcap-wv-61-11-26-r-normalization-addendum",
      strategyFamily: "legal_design_adjudication",
      trackIds: [],
      dependencies: ["rcap-wv-legal-design-normalization"],
      status: "blocked",
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/wv-61-11-26-r-normalization-addendum.json`
      ],
      ownedPaths: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/wv-61-11-26-r-normalization-addendum.json`
      ],
      requiredInputs: [
        "data/record-clearing/legal-design-intake/WV.memo.json",
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.normalizationReadiness,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "high",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-wv-61-11-26-r-normalization-addendum"
      ],
      commitSubject:
        "docs(record-clearing): adjudicate West Virginia 61-11-26(r) addendum",
      stopCondition:
        "Establish, for the W. Va. Code section 61-11-26(r) mechanism, its source-slot identity, " +
        "eligible population, filing vehicle, venue, destination, output strategy, and its exact " +
        "relationship to the existing section 61-11-26 routes. Do not add an eleventh slot or " +
        "track to the integrated West Virginia memo, do not restate the adopted ten-slot " +
        "denominator as eleven, and do not enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  if (integratedNormalizations.has("VA")) {
    // Virginia publishes two versions of section 19.2-392.2 and two of
    // section 19.2-392.6. The integrated memo builds against the text in force
    // and dates every affected track out at 2026-11-30. The successor text is
    // real, dated, and must not be activated early, so the cutover is its own
    // job rather than a conditional inside a live track.
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "VA",
      jobId: "rcap-va-2026-2027-statutory-cutover",
      strategyFamily: "legal_design_adjudication",
      trackIds: [],
      dependencies: ["rcap-va-legal-design-normalization"],
      // Derived, not hard-coded. This read `blocked` while the normalization it
      // names had already completed, so the job could never open and nothing on
      // it said why — the same shut gate as the Colorado licence and the
      // Maryland migration. It is the question Virginia's custom pleading waits
      // on, so leaving it shut blocks the lane behind it indefinitely.
      // The slug is the record's filename, which carries no `rcap-` prefix —
      // it must match expectedOutputs above or the job never closes.
      ...decisionRecordCompletion(rootDir, "va-2026-2027-statutory-cutover", {
        workerBranch: WAVE_WORKER_BRANCHES["rcap-va-2026-2027-statutory-cutover"],
        workerCommit: WAVE_WORKER_COMMITS["rcap-va-2026-2027-statutory-cutover"],
        completionCommit:
          DECISION_RECORD_COMPLETION_COMMITS["rcap-va-2026-2027-statutory-cutover"]
      }),
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/va-2026-2027-statutory-cutover.json`
      ],
      ownedPaths: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/va-2026-2027-statutory-cutover.json`
      ],
      requiredInputs: [
        "data/record-clearing/legal-design-intake/VA.memo.json",
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.packetSetManifests,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-va-2026-2027-statutory-cutover"
      ],
      commitSubject:
        "docs(record-clearing): plan the Virginia 2026-2027 statutory cutover",
      stopCondition:
        "Answer six questions and record each separately. Which version of Va. Code " +
        "section 19.2-392.2 governs a packet generated now; which version takes effect " +
        "December 1, 2026; whether a future-effective successor track or a versioned packet " +
        "is required, or whether the existing tracks carry the change; what the current " +
        "tracks' effectiveTo treatment should be against their present 2026-11-30 end date; " +
        "whether current-law packets can be built and delivered before the cutover at all; " +
        "and the exact packet-copy and routing consequences of the answer. " +
        "Cover the broader subsection A gateway and the multi-transaction single-petition " +
        "treatment, the section 19.2-392.6 changes effective July 1, 2027, and the resulting " +
        "screening and dated regression-test requirements. " +
        "\"Both versions exist\" is not an answer: a participant filing tomorrow files under " +
        "one of them, and the packet has to know which. " +
        "Do not activate future law early, do not retire a track that is still in force, and " +
        "do not enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });

    // Every plausible CC-1201 and CC-1203 path at the official circuit-court
    // form library returned 404 on the normalization pass while CC-1473
    // retrieved cleanly from the same library. That is a source-retrieval
    // failure, not a finding that the series does not exist, and CC-1473 is a
    // section 19.2-392.2(A) instrument that must not be substituted for it.
    // Kept out of the source_acquisition lane deliberately: that lane is keyed to
    // acquisition records for documents whose identity is already established,
    // and CC-1201's identity is precisely what is unknown. Inventing acquisition
    // rows to fit the lane would manufacture the identity this job exists to
    // determine.
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "VA",
      jobId: "rcap-va-cc-1201-source-identity-materialization",
      strategyFamily: "source_identity_resolution",
      trackIds: [],
      dependencies: ["rcap-va-legal-design-normalization"],
      // Derived for the same reason as the cutover job above.
      ...decisionRecordCompletion(
        rootDir,
        "va-cc-1201-source-identity-materialization",
        {
          workerBranch:
            WAVE_WORKER_BRANCHES["rcap-va-cc-1201-source-identity-materialization"],
          workerCommit:
            WAVE_WORKER_COMMITS["rcap-va-cc-1201-source-identity-materialization"],
          completionCommit:
            DECISION_RECORD_COMPLETION_COMMITS[
              "rcap-va-cc-1201-source-identity-materialization"
            ]
        }
      ),
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/va-cc-1201-source-identity-materialization.json`
      ],
      ownedPaths: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/va-cc-1201-source-identity-materialization.json`
      ],
      requiredInputs: [
        "data/record-clearing/legal-design-intake/VA.memo.json",
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.sourceRelationships,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "codex",
      effort: "high",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-va-cc-1201-source-identity-materialization"
      ],
      commitSubject:
        "chore(record-clearing): resolve Virginia CC-1201 source identity",
      stopCondition:
        "Establish whether the Office of the Executive Secretary publishes a separate " +
        "statewide instrument for either route assigned to Virginia custom pleading — " +
        "va_exp_absolute_pardon and va_exp_identity_used_by_another — and for each " +
        "instrument in the current CC-1201 series. " +
        "For every instrument found, record its exact identity and form number, title, role, " +
        "revision and currentness, whether its scope is statewide or local, whether it is " +
        "mandatory, a standard or pattern form, optional, or does not exist, its official URL " +
        "and content hash, its participant-facing status, the affected Virginia tracks and " +
        "components, and the source and Edition consequence together with the output-strategy " +
        "consequence — whether the route builds an official form or a custom pleading. " +
        "Failure to find a form is not proof that no form exists. Every plausible CC-1201 and " +
        "CC-1203 path returned 404 on the normalization pass while CC-1473 retrieved cleanly " +
        "from the same library, which is a retrieval failure and not a finding. Record " +
        "\"searched, not found\" as exactly that, with what was searched, and never as " +
        "\"no such form\". " +
        "Do not substitute CC-1473 outside Va. Code section 19.2-392.2(A), do not adopt an " +
        "unofficial mirror or aggregator copy as authority, do not commit a source binary, and " +
        "do not enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  if (integratedNormalizations.has("NC")) {
    // The integrated memo re-pins the G.S. 15A-145.8A youthful route from
    // AOC-CR-296 to AOC-CR-293 Rev. 3/25, read at source on the official AOC
    // host. AOC-CR-296 keeps its own role as the conditional district-attorney
    // component and is not the youthful petition. AOC-CR-293 and its
    // instructions still need a materialization contract, and that single
    // outstanding source must not hold the rest of the North Carolina packet
    // set, which is why this job is scoped to that document alone.
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "NC",
      jobId: "rcap-nc-aoc-cr-293-source-materialization",
      strategyFamily: "source_identity_resolution",
      trackIds: ["nc_145_8a_youthful"],
      dependencies: ["rcap-nc-legal-design-normalization"],
      status: "blocked",
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/nc-aoc-cr-293-source-materialization.json`
      ],
      ownedPaths: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/nc-aoc-cr-293-source-materialization.json`
      ],
      requiredInputs: [
        "data/record-clearing/legal-design-intake/NC.memo.json",
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.sourceRelationships,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "codex",
      effort: "high",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-nc-aoc-cr-293-source-materialization"
      ],
      commitSubject:
        "chore(record-clearing): materialize North Carolina AOC-CR-293",
      stopCondition:
        "Establish the portable materialization contract for AOC-CR-293 Rev. 03/2025 and its " +
        "instructions: official URL on the AOC host, content hash, byte count, media type, page " +
        "count, revision stamp and role. Keep AOC-CR-296 pinned to its conditional " +
        "district-attorney role and do not re-assign it to the youthful route. Do not hold any " +
        "other North Carolina track on this document, do not commit a source binary, and do not " +
        "enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  if (integratedNormalizations.has("NE")) {
    // The evidence supports DC 6:7.1 as a civil, appeals and emancipation fee
    // waiver. It does not establish it as a general criminal fee-waiver form,
    // and applying it across every criminal packet on that assumption would put
    // the wrong instrument in a participant's hands.
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "NE",
      jobId: "rcap-ne-dc-6-7-1-fee-waiver-scope-correction",
      strategyFamily: "legal_design_adjudication",
      trackIds: [],
      dependencies: ["rcap-ne-legal-design-normalization"],
      status: "blocked",
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/ne-dc-6-7-1-fee-waiver-scope-correction.json`
      ],
      ownedPaths: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/ne-dc-6-7-1-fee-waiver-scope-correction.json`
      ],
      requiredInputs: [
        "data/record-clearing/legal-design-intake/NE.memo.json",
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.packetSetManifests,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "high",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-ne-dc-6-7-1-fee-waiver-scope-correction"
      ],
      commitSubject:
        "docs(record-clearing): correct the Nebraska DC 6:7.1 fee-waiver scope",
      stopCondition:
        "Establish the actual scope of Nebraska form DC 6:7.1, whether a separate statewide " +
        "criminal fee-waiver form exists, or whether no standardized criminal waiver exists at " +
        "all, and identify every affected track and component. Do not apply a civil, appeals or " +
        "emancipation waiver across criminal packets without controlling authority, do not " +
        "silently resolve the classification, and do not enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  if (integratedNormalizations.has("KY")) {
    // KY-12 record segregation is integrated and validates. That is not the same
    // as being ratified: the composed route's two participant-initiated
    // KRS 17.142 branches remain fail-closed pending an express ratification,
    // and this record is where that stays visible instead of being implied by a
    // route that merely passes validation.
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "KY",
      jobId: "rcap-ky-17-142-segregation-ratification",
      strategyFamily: "legal_design_adjudication",
      trackIds: ["ky_criminal_record_segregation"],
      dependencies: ["rcap-ky-legal-design-normalization"],
      status: "blocked",
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/ky-17-142-segregation-ratification.json`
      ],
      ownedPaths: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/ky-17-142-segregation-ratification.json`
      ],
      requiredInputs: [
        "data/record-clearing/legal-design-intake/KY.memo.json",
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.packetSetManifests,
        "data/record-clearing/legal-design-composed-unit-approvals.json",
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "high",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-ky-17-142-segregation-ratification"
      ],
      commitSubject:
        "docs(record-clearing): ratify the Kentucky KRS 17.142 segregation route",
      stopCondition:
        "Record the counsel-authored provenance the two resolved units require, then ratify, or " +
        "refuse, the two participant-initiated KRS 17.142 segregation branches on their " +
        "own authority. Preserve AOC-497 as an order rather than a participant petition; " +
        "AOC-496.5, AOC-497.3 and AOC-336 as clerk or system generated; the April 30, 2027 " +
        "KRS 431.073 successor as future law that is not activated early; and the " +
        "KRS 218A.275(12) disqualifying treatment. A route validating is not a legal approval. " +
        "Do not enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  if (integratedNormalizations.has("VT")) {
    // Vermont form 600-00228 is the fee-waiver application seven sealing and
    // expungement tracks attach, and it is the single unresolved identity
    // holding rcap-vt-acroform-fill. Its number is also in doubt against
    // 600-00229, so this resolves the identity rather than assuming either.
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "VT",
      jobId: "rcap-vt-600-00228-source-identity-resolution",
      strategyFamily: "source_identity_resolution",
      trackIds: [],
      dependencies: ["rcap-vt-legal-design-normalization"],
      status: "completed",
      completionCommit: VT_600_00228_IDENTITY_COMMIT,
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/vt-600-00228-source-identity-resolution.json`
      ],
      ownedPaths: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/vt-600-00228-source-identity-resolution.json`
      ],
      requiredInputs: [
        "data/record-clearing/legal-design-intake/VT.memo.json",
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.sourceRelationships,
        OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "codex",
      effort: "high",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-vt-600-00228-source-identity-resolution"
      ],
      commitSubject:
        "chore(record-clearing): resolve the Vermont 600-00228 source identity",
      stopCondition:
        "Establish for the Vermont fee-waiver application its official document number, official " +
        "title, issuing authority, participant or outside-party role, current revision, statewide " +
        "scope, official source URL, any replacement or supersession, media type, page count, " +
        "whether a binary is publicly retrievable, its relationship to the seven affected Vermont " +
        "tracks and components, and an exact terminal disposition. Settle the 600-00228 against " +
        "600-00229 numbering question from the issuer's own publication rather than assuming " +
        "either. Do not regenerate a global registry, implement a renderer, edit VT.memo.json, " +
        "create a source receipt without exact bytes, publish an authority edition, or enable " +
        "runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });

    // The identity decision is integrated and controlling, and the memo's
    // 11/2019 note turned out not to be a stray historical remark. All seven
    // fee-waiver components bind officialSourceUrl to
    // /sites/default/files/documents/600-00228.pdf, which is exactly the
    // superseded legacy object, and seven participant-facing feeWaiver
    // paragraphs plus one sourceStatement still carry the resolved 600-00229
    // question to the participant. That is an implementation-controlling
    // binding and participant-facing copy, so the memo gets its own worker
    // rather than being edited during integration. This job owns one path.
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "VT",
      jobId: "rcap-vt-600-00228-current-revision-memo-correction",
      strategyFamily: "legal_design_normalization_amendment",
      trackIds: [],
      dependencies: [
        "rcap-vt-600-00228-source-identity-resolution",
        "rcap-vt-legal-design-normalization"
      ],
      status: "completed",
      completionCommit: VT_MEMO_CORRECTION_COMMIT,
      expectedOutputs: ["data/record-clearing/legal-design-intake/VT.memo.json"],
      ownedPaths: ["data/record-clearing/legal-design-intake/VT.memo.json"],
      requiredInputs: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/vt-600-00228-source-identity-resolution.json`,
        "data/record-clearing/legal-design-intake/VT.memo.json",
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.sourceRelationships
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "high",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-vt-600-00228-current-revision-memo-correction",
        "node scripts/verify-rcap-legal-design-intake.mjs",
        "node scripts/verify-rcap-vt-600-00228-source-contract.mjs"
      ],
      commitSubject:
        "feat(record-clearing): correct the Vermont fee-waiver source revision",
      executionNote:
        "Read the integrated decision record at " +
        `${FACTORY_DATA_DIR}/legal-design-decisions/` +
        `vt-600-00228-source-identity-resolution.json in full, at sha256 ` +
        `${VT_600_00228_DECISION_SHA256}. The memo you are amending is at sha256 ` +
        `${VT_INTEGRATED_MEMO_SHA256}. The current binary is 2,871,072 bytes, sha256 ` +
        "263d4e196cbca1bfba14ec730368fcc897dd2bb667d6a43ade7f612d42541654, 2 pages, a clean " +
        "AcroForm of 80 fields, revision 04/2026. The 11/2019 object the memo currently links " +
        "is 1,391,726 bytes with an incompatible 129-field structure and still returns HTTP 200.",
      stopCondition:
        "Apply the adopted 600-00228 identity to VT.memo.json and nothing else. Change exactly " +
        "three things: the 600-00228 revision treatment from 11/2019 to 04/2026, including the " +
        "officialSourceUrl on all seven fee-waiver components, which currently points at the " +
        "superseded /sites/default/files/documents/600-00228.pdf object rather than the " +
        "issuer's current pointer; the removal of the nonexistent 600-00229 identity from the " +
        "seven feeWaiver paragraphs, the vt_seal_dui sourceStatement and the authority " +
        "confirmation note, since it is a confirmed numbering typo and not an open discrepancy " +
        "to hand a participant; and the document's classification as a conditional " +
        "participant-completed fee-waiver application. " +
        "Preserve 14 source slots, 11 substantive tracks, every adopted merge, the stipulation " +
        "treatment as conditional procedure rather than a separate remedy, the three composed " +
        "alternatives inside vt_seal_nonconviction, and all unrelated Vermont substance. Do not " +
        "disturb the 32 V.S.A. section 1431(e) dangling cross-reference to 13 V.S.A. section " +
        "7602(a)(1)(C) or the unanchored 25-or-older gloss: both remain open release blockers. " +
        "Do not assert the form is mandatory, do not add a track, component or slot, do not " +
        "re-role the fee-waiver component, and do not make it unconditional. Own only " +
        "VT.memo.json: do not touch the decision record, a shared registry, a source receipt, " +
        "an authority record, the queue or projection, a blocker ledger, a factory plan, a " +
        "runtime file, a migration or a deployment file. Keep every route runtime-disabled and " +
        "packet_ready false. " +
        TERMINAL_INSTRUCTION
    });

    // Vermont's second unresolved identity. It is not the fee waiver's sibling
    // and it does not hold rcap-vt-acroform-fill: the live family contract
    // binds 200-00129 and 200-00132A there, and 200-00130 appears only on the
    // overlay and composed lanes. It is named separately so the Vermont family
    // is not read as source-complete once 600-00228 closes.
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "VT",
      jobId: "rcap-vt-200-00130-source-identity-resolution",
      strategyFamily: "source_identity_resolution",
      trackIds: [],
      dependencies: ["rcap-vt-legal-design-normalization"],
      // Closes on its committed decision record, like every other adjudication
      // here. It was pinned ready while the record was already integrated at
      // d40261d, so the job kept advertising work that was done.
      ...decisionRecordCompletion(
        rootDir,
        "vt-200-00130-source-identity-resolution",
        {
          workerBranch:
            "rcap-factory/rcap-vt-200-00130-source-identity-resolution-aa6ee8e4-15ad8e70",
          workerCommit: "ece22e89fd6dee718840c546a100432bd8b29f67",
          completionCommit: "d40261dd6f68b3019aba34a1561af7dcdb48c63e"
        }
      ),
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/vt-200-00130-source-identity-resolution.json`
      ],
      ownedPaths: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/vt-200-00130-source-identity-resolution.json`
      ],
      requiredInputs: [
        "data/record-clearing/legal-design-intake/VT.memo.json",
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.sourceRelationships,
        OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "codex",
      effort: "high",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-vt-200-00130-source-identity-resolution"
      ],
      commitSubject:
        "chore(record-clearing): resolve the Vermont 200-00130 source identity",
      stopCondition:
        "Establish for Vermont 200-00130 its official form number, official title, issuing " +
        "authority, participant or outside-party role, current revision, statewide scope, " +
        "official source URL, any replacement or supersession, whether a binary is publicly " +
        "retrievable, its bytes, SHA-256, media type, page count, AcroForm or flat-PDF " +
        "structure, the affected tracks and components, and an exact terminal disposition. The " +
        "adopted edition manifests an asset at REV-2025-07 with SHA-256 " +
        "ff914f49c2a78a8b96d48f1242b70ab12ff7cb25beeeb8b850505357fdf982ed and there is no " +
        "private-corpus candidate; confirm or refute that identity against the issuer rather " +
        "than adopting the manifest row. Read the Judiciary's own naming against the PDFs: the " +
        "integrated memo records 200-00130 as the sealing petition and 200-00129 as the " +
        "expungement petition, with the narrative text as the stale artefact. Do not conflate " +
        "it with instructions sheet 200-00130A, do not treat it as a sibling or alternative of " +
        "600-00228, and do not hold rcap-vt-acroform-fill on it. Do not edit VT.memo.json, " +
        "regenerate a global registry, create a source receipt without exact bytes, commit a " +
        "source binary, publish an authority edition, or enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  if (integratedNormalizations.has("SC")) {
    // The custom-pleading implementation stopped correctly: all eleven
    // solicitor-office tracks still carry unresolvedQuestions[0] as a
    // release_blocker on output_strategy, asking whether LegalEase may pre-fill
    // the prescribed order form. The adopted normalization already answered it
    // — it set custom_pleading on all eleven precisely because that is what
    // LegalEase may unambiguously generate — so what is stale is the memo's
    // record of the question, not the answer. The memo is worker-owned, so it
    // gets its own worker. This job owns exactly one path.
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "SC",
      jobId: "rcap-sc-solicitor-deliverable-memo-correction",
      strategyFamily: "legal_design_normalization_amendment",
      trackIds: [],
      dependencies: ["rcap-sc-legal-design-normalization"],
      status: "completed",
      completionCommit: SC_MEMO_CORRECTION_COMMIT,
      expectedOutputs: ["data/record-clearing/legal-design-intake/SC.memo.json"],
      ownedPaths: ["data/record-clearing/legal-design-intake/SC.memo.json"],
      requiredInputs: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/${SC_SOLICITOR_DELIVERABLE_DECISION_ID}.json`,
        "data/record-clearing/legal-design-intake/SC.memo.json",
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.packetSetManifests
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-sc-solicitor-deliverable-memo-correction",
        "node scripts/verify-rcap-legal-design-intake.mjs"
      ],
      commitSubject:
        "feat(record-clearing): correct the South Carolina solicitor deliverable",
      executionNote:
        "Read the controlling decision record at " +
        `${FACTORY_DATA_DIR}/legal-design-decisions/` +
        `${SC_SOLICITOR_DELIVERABLE_DECISION_ID}.json in full. The memo you are amending is at ` +
        `sha256 ${SC_INTEGRATED_MEMO_SHA256}. The stale artifact is unresolvedQuestions[0] on ` +
        "each of the eleven solicitor tracks, carrying impact release_blocker, affectedElement " +
        "output_strategy and classificationBasis counsel_confirmation_required. The other two " +
        "questions on those tracks are unrelated and stay.",
      stopCondition:
        "Apply the adopted solicitor-route deliverable determination to SC.memo.json and nothing " +
        "else. On each of the eleven solicitor tracks — sc_17_1_40_general_sessions, " +
        "sc_17_1_65_handgun, sc_22_5_910, sc_22_5_920_yoa, sc_22_5_930_drug, sc_34_11_90e_check, " +
        "sc_56_5_750f, sc_aep, sc_conditional_discharge_44_53_450, sc_pti_17_22_150 and sc_tep " +
        "— remove the resolved document-identity question and replace it with the adopted " +
        "treatment: the participant deliverable is a controlled application or request package " +
        "directed to the solicitor's office; LegalEase does not generate or portray the " +
        "solicitor's statutory expungement order as the participant's filing; SCCA 223A1 and " +
        "analogous prescribed order instruments remain solicitor and court documents; solicitor, " +
        "attestor and court fields remain outside-party work; and the solicitor's office obtains " +
        "and completes the required blank order form. " +
        "Preserve every unrelated South Carolina rule, including the single-incident fee question " +
        "under section 17-22-940(G) and the H.3730 and H.428 standing monitor, both of which stay " +
        "exactly as they are. Preserve SCCA 223E as official_pdf_fill on the unfingerprinted " +
        "section 17-22-950(B) branch of sc_17_22_950_summary and do not extend it to any " +
        "solicitor route. Preserve all twelve tracks, every source slot, and every solicitor, " +
        "court and outside-party boundary. Do not invent a participant-facing official form, do " +
        "not assert a new counsel approval, and do not change any output strategy. " +
        "Own only SC.memo.json: do not touch the decision record, a shared registry, a source " +
        "receipt, an authority record, the queue or projection, a blocker ledger, a factory plan, " +
        "a runtime file, a migration or a deployment file. Keep every route runtime-disabled and " +
        "packet_ready false. " +
        TERMINAL_INSTRUCTION
    });
  }

  const nyMemoPath = path.join(
    rootDir,
    "data/record-clearing/legal-design-intake/NY.memo.json"
  );
  // The amendment is complete when the memo on disk is the amended blob, not
  // when a commit says so.
  // The packet-capability correction stays complete once its successor
  // destination correction lands on top of it.
  const nyMrtaPacketCapabilityCorrected =
    fs.existsSync(nyMemoPath) &&
    [NY_AMENDED_MEMO_SHA256, NY_DESTINATION_MEMO_SHA256].includes(
      sha256File(nyMemoPath)
    );
  const nyMrtaDestinationCorrected =
    fs.existsSync(nyMemoPath) &&
    sha256File(nyMemoPath) === NY_DESTINATION_MEMO_SHA256;
  const nyMrtaSourceIdentityResolved = fs.existsSync(
    path.join(
      rootDir,
      `${FACTORY_DATA_DIR}/legal-design-decisions/` +
        "ny-mrta-destruction-request-source-identity-resolution.json"
    )
  );

  if (integratedNormalizations.has("NY")) {
    // ny_mrta_marijuana was normalized as process_guidance, but one of its
    // components was not guidance: destruction_request_instructions carried
    // outputStrategy official_pdf_fill and officialFormId
    // MRTA-DESTRUCTION-REQUEST, and the memo's own manual-completion item was
    // "Signing and sending the destruction request", which is the participant
    // acting on their own instrument. A participant-signed, participant-
    // submitted official form cannot sit inside a pure-guidance assignment: a
    // guidance worker would be handed a packet-capable component it has no
    // lane to build, which is why the guidance implementation was excluded
    // rather than attempted.
    //
    // Whether the request belonged in the design as a conditional
    // supporting_action or as a conditional unit of one composed mechanism was a
    // legal-design question about New York's marijuana relief that no integrated
    // decision settled. The correction job decided it against the full design:
    // one composed sequential mechanism in two units, the automatic relief
    // first and the conditional destruction request second. Like every other
    // memo amendment here, it closes on the amended blob being on disk, not on
    // a commit asserting it.
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "NY",
      jobId: NY_MRTA_PACKET_CAPABILITY_JOB_ID,
      strategyFamily: "legal_design_normalization_amendment",
      trackIds: [],
      dependencies: ["rcap-ny-legal-design-normalization"],
      status: nyMrtaPacketCapabilityCorrected ? "completed" : "ready",
      ...(nyMrtaPacketCapabilityCorrected
        ? {
            workerCommit: NY_MRTA_PACKET_CAPABILITY_WORKER_COMMIT,
            workerBranch:
              "rcap-factory/rcap-ny-mrta-destruction-request-packet-capability-correction-65c45a61-e68b4341",
            completionCommit: NY_MRTA_PACKET_CAPABILITY_COMPLETION_COMMIT
          }
        : {}),
      expectedOutputs: ["data/record-clearing/legal-design-intake/NY.memo.json"],
      ownedPaths: ["data/record-clearing/legal-design-intake/NY.memo.json"],
      requiredInputs: [
        "data/record-clearing/legal-design-intake/NY.memo.json",
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.packetSetManifests,
        FACTORY_INPUT_PATHS.sourceRelationships
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        `node scripts/rcap-factory-plan.mjs --check-job ${NY_MRTA_PACKET_CAPABILITY_JOB_ID}`,
        "node scripts/verify-rcap-legal-design-intake.mjs",
        "node scripts/verify-rcap-packet-capability-registry.mjs"
      ],
      commitSubject:
        "feat(record-clearing): correct the New York marijuana packet capability",
      executionNote:
        `The memo you are amending is at sha256 ${NY_INTEGRATED_MEMO_SHA256}. The conflict is ` +
        "one component: ny_mrta_marijuana-destruction-request-instructions-2, role " +
        "destruction_request_instructions, outputStrategy official_pdf_fill, officialFormId " +
        "MRTA-DESTRUCTION-REQUEST, on a track whose own outputStrategy is process_guidance. " +
        "The memo's manual-completion item for it reads 'Signing and sending the destruction " +
        "request', so the participant signs and submits it.",
      stopCondition:
        "Represent the participant-signed MRTA destruction request as packet-capable work and " +
        "nothing else. Decide from the controlling authority and the integrated New York design " +
        "whether it is a conditional supporting_action or a conditional unit of one composed " +
        "relief mechanism, state the basis, and bind MRTA-DESTRUCTION-REQUEST to the " +
        "official-PDF implementation lane. " +
        "Preserve the automatic or agency-controlled marijuana record process exactly as " +
        "normalized: the participant does not petition for what the State already did, and no " +
        "second remedy may be created for the same relief. Preserve the verification guidance, " +
        "the eligibility screen, the routing disclosure and the effect disclosure. Preserve the " +
        "participant signature and submission requirements on the request itself, and every " +
        "outside-party action. Leave every unrelated New York track, component and source slot " +
        "unchanged, including the separate CPL 160.57 eligibility question and the CPL 160.59 " +
        "packet. " +
        "Own only NY.memo.json: do not touch a decision record, a shared registry, a source " +
        "receipt, an authority record, the queue or projection, a blocker ledger, a factory " +
        "plan, a runtime file, a migration or a deployment file. Keep every route " +
        "runtime-disabled and packet_ready false. " +
        TERMINAL_INSTRUCTION
    });

    if (nyMrtaPacketCapabilityCorrected) {
      // The correction bound the participant's destruction request to the
      // official-PDF lane as the second unit of the composed mechanism, which
      // is what created a source consumer for MRTA-DESTRUCTION-REQUEST. The
      // document itself is still unidentified: Edition 1.2 retains it at
      // REV-UNKNOWN, no official landing page or binary URL is confirmed, and
      // no bytes are materialized. That is one exact identity/currentness
      // question and it has no owner anywhere in the plan, so the composed
      // route would otherwise sit blocked on nobody. Resolving it is authority
      // and source work, not packet work.
      addJob({
        lane: "legal_design_normalization",
        jurisdiction: "NY",
        jobId: "rcap-ny-mrta-destruction-request-source-identity-resolution",
        strategyFamily: "source_identity_resolution",
        trackIds: [],
        dependencies: [NY_MRTA_PACKET_CAPABILITY_JOB_ID],
        status: nyMrtaSourceIdentityResolved ? "completed" : "ready",
        ...(nyMrtaSourceIdentityResolved
          ? {
              workerBranch:
                WAVE_WORKER_BRANCHES[
                  "rcap-ny-mrta-destruction-request-source-identity-resolution"
                ],
              workerCommit:
                WAVE_WORKER_COMMITS[
                  "rcap-ny-mrta-destruction-request-source-identity-resolution"
                ],
              completionCommit: COMPLETED_AUTHORITY_JOB_COMMITS.get(
                "rcap-ny-mrta-destruction-request-source-identity-resolution"
              )
            }
          : {}),
        expectedOutputs: [
          `${FACTORY_DATA_DIR}/legal-design-decisions/ny-mrta-destruction-request-source-identity-resolution.json`
        ],
        ownedPaths: [
          `${FACTORY_DATA_DIR}/legal-design-decisions/ny-mrta-destruction-request-source-identity-resolution.json`
        ],
        requiredInputs: [
          "data/record-clearing/legal-design-intake/NY.memo.json",
          FACTORY_INPUT_PATHS.normalizedTracks,
          FACTORY_INPUT_PATHS.sourceRelationships,
          FACTORY_INPUT_PATHS.repositoryAssetAudit,
          OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
          FACTORY_INPUT_PATHS.blockerLedger
        ],
        participantPacketProofRequired: false,
        model: "codex",
        effort: "xhigh",
        focusedValidation: [
          "node scripts/rcap-factory-plan.mjs --check-job " +
            "rcap-ny-mrta-destruction-request-source-identity-resolution"
        ],
        commitSubject:
          `docs(record-clearing): resolve ${NY_MRTA_DESTRUCTION_REQUEST_FORM_ID} source identity`,
        stopCondition:
          "Establish for the Office of Court Administration application to destroy a marijuana " +
          `conviction record, retained in Edition 1.2 at ${NY_MRTA_DESTRUCTION_REQUEST_FORM_ID}: ` +
          "its exact official form title; the issuer; its official identity or form number; its " +
          "current revision, which Edition 1.2 records only as REV-UNKNOWN; the " +
          "participant-facing role; whether the scope is statewide; the official landing page; " +
          "the official binary URL; the byte count; the SHA-256; the MIME type; the page count; " +
          "whether it is encrypted; whether it carries XFA; whether it is an AcroForm or a flat " +
          "PDF; the signature requirements, including whether a designated agent may sign; the " +
          "submission destination; any supersession; the exact terminal disposition; and whether " +
          "a Master Library Edition 1.3 correction is required. " +
          "The consumer is the second unit of the composed ny_mrta_marijuana mechanism, " +
          "ny-mrta-destruction-request, which the participant or their designated agent signs " +
          "and sends under CPL section 160.50(5)(b)(i). Do not restate the automatic " +
          "expungement stage as a filing and do not disturb the first unit. " +
          "Do not acquire under a block, substitute a held or commercial copy for current " +
          "official bytes, invent a revision, a licence, a role or a structure, create a source " +
          "receipt without exact bytes and an exact SHA-256, edit NY.memo.json, regenerate a " +
          "global registry, implement a renderer, publish an authority edition, or enable " +
          "runtime, promote, or deploy. " +
          TERMINAL_INSTRUCTION
      });
    }
  }

  if (integratedNormalizations.has("NJ")) {
    // New Jersey's automated Clean Slate process does not yet exist. The
    // participant petition is the current route and is not held back by a system
    // that has not started; what is needed is a trigger to watch, so the packet
    // is cut over when the automation actually becomes operative rather than on
    // an announcement or an assumption.
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "NJ",
      jobId: "rcap-nj-clean-slate-automation-currentness-monitor",
      strategyFamily: "legal_design_adjudication",
      trackIds: [],
      dependencies: ["rcap-nj-legal-design-normalization"],
      status: "blocked",
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/nj-clean-slate-automation-currentness-monitor.json`
      ],
      ownedPaths: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/nj-clean-slate-automation-currentness-monitor.json`
      ],
      requiredInputs: [
        "data/record-clearing/legal-design-intake/NJ.memo.json",
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "high",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-nj-clean-slate-automation-currentness-monitor"
      ],
      commitSubject:
        "docs(record-clearing): monitor New Jersey Clean Slate automation",
      stopCondition:
        "Identify the controlling official trigger that establishes New Jersey's automated " +
        "Clean Slate process as operative, and specify the legal-design, screening and packet " +
        "cutover it requires. The current petition route stays active and must not be blocked " +
        "by the future system; do not create a second remedy for automation that does not yet " +
        "exist, do not treat an announcement as operation, and do not enable runtime, promote, " +
        "or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  if (integratedNormalizations.has("NY")) {
    // Two eligibility rules for CPL 160.57 that the sources do not agree on. The
    // worker kept both rather than choosing, which is the right call: deleting
    // either one on the strength of a targeted reading would silently change who
    // is eligible. The route stays release-disabled until the controlling text
    // settles it.
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "NY",
      jobId: "rcap-ny-cpl-160-57-eligibility-source-reconciliation",
      strategyFamily: "legal_design_adjudication",
      trackIds: [],
      dependencies: ["rcap-ny-legal-design-normalization"],
      status: "blocked",
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/ny-cpl-160-57-eligibility-source-reconciliation.json`
      ],
      ownedPaths: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/ny-cpl-160-57-eligibility-source-reconciliation.json`
      ],
      requiredInputs: [
        "data/record-clearing/legal-design-intake/NY.memo.json",
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.packetSetManifests,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-ny-cpl-160-57-eligibility-source-reconciliation"
      ],
      commitSubject:
        "docs(record-clearing): reconcile the New York CPL 160.57 eligibility sources",
      stopCondition:
        "Determine from the controlling current statutory text whether CPL 160.57 requires no " +
        "pending felony charge in another jurisdiction, whether the life-sentence exclusion " +
        "remains current, and whether the two are cumulative; identify the official source and " +
        "effective date that control, the exact screening questions that change, and whether the " +
        "answer affects eligibility, packet identity or release review only. Do not delete " +
        "either rule on a targeted reading, keep only the affected route release-disabled, do " +
        "not hold unrelated New York routes, and do not enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  const stateReconciliationJobs = [
    {
      jurisdiction: "OR",
      jobId: "rcap-or-same-episode-rule-source-reconciliation",
      slug: "or-same-episode-rule-source-reconciliation",
      subject:
        "docs(record-clearing): reconcile the Oregon same-episode rule",
      stop:
        "Establish, from the governing statute and enrolled act, whether the same-episode rule " +
        "operates as counsel's current treatment states or as the enacted text reads, identify " +
        "the conflicting language exactly, and record the affected Oregon track IDs, the " +
        "eligibility and screening impact, the packet impact, and whether the conflict is " +
        "build-level or release-level. The worker deliberately did not override counsel; do not " +
        "resolve the conflict by preferring one source because it is more convenient."
    },
    {
      jurisdiction: "OR",
      jobId: "rcap-or-2025-monetary-obligations-scope-reconciliation",
      slug: "or-2025-monetary-obligations-scope-reconciliation",
      subject:
        "docs(record-clearing): reconcile the Oregon 2025 monetary-obligations scope",
      stop:
        "Establish the scope of the 2025 monetary-obligations relief from the enrolled act and " +
        "current codified text: which obligations it reaches, which it does not, its effective " +
        "date, the affected Oregon track IDs, the eligibility and screening impact, the packet " +
        "impact, and whether the conflict is build-level or release-level."
    },
    {
      jurisdiction: "OH",
      jobId: "rcap-oh-automatic-sealing-current-law-reconciliation",
      slug: "oh-automatic-sealing-current-law-reconciliation",
      subject:
        "docs(record-clearing): reconcile Ohio automatic sealing against current law",
      stop:
        "The SB 288 analysis did not establish the automatic-sealing route previously claimed, " +
        "and absence from that analysis is not proof that no route exists. Determine from current " +
        "Ohio law whether an automatic-sealing route exists, its governing provision, effective " +
        "date, covered dispositions, and whether any participant submission exists at all; then " +
        "state whether the affected Ohio track should remain, change strategy, narrow or defer, " +
        "with its packet and screening impact. Keep the affected route fail-closed at the memo's " +
        "chosen blocker level and do not hold unrelated Ohio routes."
    },
    {
      jurisdiction: "OK",
      jobId: "rcap-ok-sb-2030-current-text-and-currency",
      slug: "ok-sb-2030-current-text-and-currency",
      subject:
        "chore(record-clearing): obtain the Oklahoma SB 2030 current text",
      stop:
        "Obtain the enrolled Senate Bill 2030 text and the current codified sections 18 and 19, " +
        "which have changed repeatedly, and reconcile the effective date, the waiting periods, " +
        "free-route eligibility, and the relationship between the free route and the petition " +
        "route, with the screening and packet impact of each. SB 2030 preserves the right to " +
        "petition: this is a source-currentness question and must not become a denial of the " +
        "known petition routes, which remain participant-packet-capable. Do not declare any " +
        "participant Clean Slate eligible from the unresolved screen, and do not state a settled " +
        "waiting period where the current text is required to establish it."
    }
  ];
  for (const entry of stateReconciliationJobs) {
    if (!integratedNormalizations.has(entry.jurisdiction)) continue;
    // Closes on the presence of its committed decision record, like every
    // other adjudication here, not on a commit asserting it.
    const decisionRecord =
      `${FACTORY_DATA_DIR}/legal-design-decisions/${entry.slug}.json`;
    const decided = fs.existsSync(path.join(rootDir, decisionRecord));
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: entry.jurisdiction,
      jobId: entry.jobId,
      strategyFamily: "legal_design_adjudication",
      trackIds: [],
      dependencies: [
        `rcap-${entry.jurisdiction.toLowerCase()}-legal-design-normalization`
      ],
      status: decided ? "completed" : "ready",
      ...(decided && COMPLETED_AUTHORITY_JOB_COMMITS.has(entry.jobId)
        ? {
            workerBranch: WAVE_WORKER_BRANCHES[entry.jobId],
            workerCommit: WAVE_WORKER_COMMITS[entry.jobId],
            completionCommit: COMPLETED_AUTHORITY_JOB_COMMITS.get(entry.jobId)
          }
        : {}),
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/${entry.slug}.json`
      ],
      ownedPaths: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/${entry.slug}.json`
      ],
      requiredInputs: [
        `data/record-clearing/legal-design-intake/${entry.jurisdiction}.memo.json`,
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        `node scripts/rcap-factory-plan.mjs --check-job ${entry.jobId}`
      ],
      commitSubject: entry.subject,
      stopCondition: `${entry.stop} Do not edit the state memo, regenerate a global registry, ` +
        "implement a renderer, or enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  const tnRouteInventoryDecisionRecord =
    `${FACTORY_DATA_DIR}/legal-design-decisions/tn-2026-route-inventory-addendum.json`;
  const tnRouteInventoryDecided = fs.existsSync(
    path.join(rootDir, tnRouteInventoryDecisionRecord)
  );
  const tnMemoPath = path.join(
    rootDir,
    "data/record-clearing/legal-design-intake/TN.memo.json"
  );
  // The amendment is complete when the memo on disk is the amended blob, not
  // when a commit says so.
  const tnRouteMemoAmended =
    fs.existsSync(tnMemoPath) &&
    sha256File(tnMemoPath) === TN_AMENDED_MEMO_SHA256;

  if (integratedNormalizations.has("TN")) {
    // The integrated Tennessee memo normalizes the nine slots its adopted
    // denominator covers. Current authority surfaced four further statutory
    // routes outside that denominator, and neither silently absorbing them into
    // the nine nor dropping them is honest. They are carried here instead, so
    // Tennessee is explicitly inventory-incomplete rather than quietly
    // presented as mechanism-complete.
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "TN",
      jobId: "rcap-tn-2026-route-inventory-addendum",
      strategyFamily: "legal_design_adjudication",
      trackIds: [],
      dependencies: ["rcap-tn-legal-design-normalization"],
      // Closes on the presence of its committed decision record, not on an
      // assertion in a commit message.
      status: tnRouteInventoryDecided ? "completed" : "ready",
      ...(tnRouteInventoryDecided
        ? { completionCommit: TN_ROUTE_INVENTORY_DECISION_COMMIT }
        : {}),
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/tn-2026-route-inventory-addendum.json`
      ],
      ownedPaths: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/tn-2026-route-inventory-addendum.json`
      ],
      requiredInputs: [
        "data/record-clearing/legal-design-intake/TN.memo.json",
        "docs/record-clearing/normalization-readiness-research/tn-codification-authority.receipt.json",
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.normalizationReadiness,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-tn-2026-route-inventory-addendum"
      ],
      commitSubject:
        "docs(record-clearing): inventory the Tennessee 2026 statutory routes",
      stopCondition:
        "Establish, for each of the four routes outside the adopted nine-slot denominator — " +
        "T.C.A. section 40-32-107(c) illegal voting; section 40-32-107(d) post-pardon as " +
        "broadened by Public Chapter 719; section 40-32-107(e) the Recovery Court Renewal Act " +
        "route added by Public Chapter 1061; and section 40-32-109 arrest-record expunction " +
        "where no court history exists — a stable source ID, mechanism name, governing " +
        "subsection, eligible population, legal effect, participant filing actor, venue, " +
        "destination and packet strategy, together with its relationship to the existing nine " +
        "tracks, whether any existing track must be narrowed or replaced, the revised " +
        "source-slot denominator and node count, and the required source and form identities. " +
        "Do not add a normalized route to the integrated Tennessee memo from this job, do not " +
        "describe Tennessee as mechanism-complete until this addendum is integrated, and do not " +
        "enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });

    if (tnRouteInventoryDecided) {
      // The decision is integrated and controlling; TN.memo.json is still the
      // nine-track design. Applying the decision means editing the memo, and the
      // memo is worker-owned — so it gets its own worker rather than being
      // amended during integration. This job owns exactly one path.
      addJob({
        lane: "legal_design_normalization",
        jurisdiction: "TN",
        jobId: "rcap-tn-2026-route-memo-amendment",
        strategyFamily: "legal_design_normalization_amendment",
        trackIds: [],
        dependencies: [
          "rcap-tn-2026-route-inventory-addendum",
          "rcap-tn-legal-design-normalization"
        ],
        status: tnRouteMemoAmended ? "completed" : "ready",
        ...(tnRouteMemoAmended
          ? { completionCommit: TN_ROUTE_MEMO_AMENDMENT_COMMIT }
          : {}),
        expectedOutputs: ["data/record-clearing/legal-design-intake/TN.memo.json"],
        ownedPaths: ["data/record-clearing/legal-design-intake/TN.memo.json"],
        requiredInputs: [
          tnRouteInventoryDecisionRecord,
          "data/record-clearing/legal-design-intake/TN.memo.json",
          "docs/record-clearing/normalization-readiness-research/tn-codification-authority.receipt.json",
          FACTORY_INPUT_PATHS.authority,
          FACTORY_INPUT_PATHS.normalizationReadiness
        ],
        participantPacketProofRequired: false,
        model: "opus",
        effort: "xhigh",
        focusedValidation: [
          "node scripts/rcap-factory-plan.mjs --check-job rcap-tn-2026-route-memo-amendment",
          "node scripts/verify-rcap-legal-design-intake.mjs"
        ],
        commitSubject:
          "feat(record-clearing): amend TN legal design for the 2026 routes",
        executionNote:
          "Read the integrated decision record at " +
          `${tnRouteInventoryDecisionRecord} in full, at sha256 ` +
          `${TN_ROUTE_INVENTORY_DECISION_SHA256}. Do not reconstruct the four routes from a ` +
          "summary of it: the actor boundaries, filing vehicles and preserved questions are " +
          "stated there and nowhere else. The memo you are amending is at sha256 " +
          `${TN_INTEGRATED_MEMO_SHA256}, reviewed through 2026-08-05.`,
        stopCondition:
          "Apply the adopted 2026 route inventory to TN.memo.json and nothing else. Reconcile to " +
          "13 source slots, 13 normalized nodes, 13 imported, 0 deferred, 11 custom_pleading, " +
          "2 process_guidance, 0 official_pdf_fill and 0 composed tracks, adding exactly " +
          "tn_illegal_voting, tn_post_pardon, tn_recovery_court and tn_arrest_no_court_record as " +
          "relief tracks. Narrow tn_nonconviction_petition for the no-court-history population " +
          "and route it to tn_arrest_no_court_record, carrying the participant question about a " +
          "court file or prior action and the fee and clerk-certification distinctions. Add " +
          "post-pardon and recovery-court routing to tn_eligible_conviction and tn_two_offense " +
          "without changing the underlying two-offense mechanism. Every other existing track " +
          "object stays substantively unchanged. " +
          "For tn_illegal_voting, tn_post_pardon and tn_recovery_court the district attorney " +
          "prepares the statutory petition and proposed order: generate only the participant's " +
          "request to the district attorney and their controlled eligibility information, and do " +
          "not characterize that artifact as the DA's petition or proposed order. For " +
          "tn_arrest_no_court_record the participant prepares the operative section 40-32-109 " +
          "petition; preserve the clerk search, clerk certification, the mandatory clerk fee, " +
          "that no waiver was identified, that no TBI certificate applies, and the court's " +
          "statutory exemption from the ordinary TBI process. " +
          "Preserve the prior-expunction asymmetry as a typed release or legal-design question: " +
          "subsections (a), (b) and (c) bar prior grants under (a), (b) and (c); (e) bars (a), " +
          "(b), (c) and (e); (d) contains no bar and is named by none of them. Do not invent a " +
          "reciprocal bar and do not resolve the asymmetry by implication. " +
          "Keep every route runtime-disabled and packet_ready false. Own only TN.memo.json: do " +
          "not touch the decision record, a shared registry, composed approvals, a source " +
          "receipt, an authority record, the queue or projection, a blocker ledger, a factory " +
          "plan, a runtime file, a migration or a deployment file. " +
          TERMINAL_INSTRUCTION
      });
    }
  }

  if (integratedNormalizations.has("ND")) {
    // nd-deferred-imposition-records imports and validates, but its two units
    // are marked resolved without counsel-authored provenance on the track, so
    // the composed-unit approval gate refuses it. The memo is worker-owned and
    // is not rewritten during integration; the route stays integrated and
    // unapproved until the provenance the units assert is actually recorded.
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "ND",
      jobId: "rcap-nd-deferred-imposition-unit-provenance-correction",
      strategyFamily: "legal_design_adjudication",
      trackIds: ["nd-deferred-imposition-records"],
      dependencies: ["rcap-nd-legal-design-normalization"],
      status: "blocked",
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/nd-deferred-imposition-unit-provenance-correction.json`
      ],
      ownedPaths: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/nd-deferred-imposition-unit-provenance-correction.json`
      ],
      requiredInputs: [
        "data/record-clearing/legal-design-intake/ND.memo.json",
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.packetSetManifests,
        "data/record-clearing/legal-design-composed-unit-approvals.json",
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "high",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-nd-deferred-imposition-unit-provenance-correction"
      ],
      commitSubject:
        "docs(record-clearing): correct North Dakota deferred-imposition unit provenance",
      stopCondition:
        "Record, from the controlling source, the counsel-authored provenance for " +
        "nd_deferred_verify_automatic_seal and nd_deferred_dismissal_motion, or reclassify a unit " +
        "that the source does not resolve. Preserve N.D.R.Crim.P. 32.1 as the rule implementing " +
        "the deferred-imposition statutes rather than a second mechanism, the controlled custom " +
        "pleadings where no statewide petition form exists, the mandatory proposed order, " +
        "Admin. R. 41 section 4(a)(7), SFN 61663 as the pardon form, and nd_remote_access as " +
        "official_pdf_fill. Do not approve the composition on an inference, and do not enable " +
        "runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  for (const jurisdiction of outstanding) {
    if (jurisdiction === "PA" && pennsylvaniaNormalizationComplete) continue;
    const normalizationReadiness = normalizationReadinessRecords.get(jurisdiction);
    const readinessStatus =
      normalizationReadiness.readinessState === "normalization_complete"
        ? "completed"
        : normalizationReadiness.readinessState === "normalization_in_progress"
          ? "in_progress"
          : normalizationReadiness.readinessState === "ready_for_normalization"
            ? "ready"
            : "blocked";
    const status =
      readinessStatus === "ready" && !readinessFoundationComplete
        ? "blocked"
        : readinessStatus;
    const reviewMaterializer = legalReviewMaterializers.get(jurisdiction);
    if (!reviewMaterializer) {
      throw new Error(
        `${jurisdiction} has no canonical legal-review materialization owner.`
      );
    }
    addJob({
      lane: "legal_design_normalization",
      jurisdiction,
      status,
      normalizationReadiness,
      dependencies:
        status === "in_progress"
          ? [reviewMaterializer.jobId]
          : [
              normalizationReadinessFoundation.jobId,
              reviewMaterializer.jobId
            ],
      requiredInputs: [
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.repositoryAssetAudit,
        FACTORY_INPUT_PATHS.normalizationReadiness,
        FACTORY_INPUT_PATHS.jobClaims,
        FACTORY_INPUT_PATHS.blockerLedger,
        "data/record-clearing/master-library/edition-1-2-legal-design-reconciliation-queue.json",
        FACTORY_INPUT_PATHS.allStateBuildStatus,
        "planning/record-clearing-100-percent/jobs/F-01-batch-3-expected-track-ids.json",
        normalizationReadiness.reviewMaterialization.materializationDestination
      ],
      focusedValidation: [
        `node scripts/rcap-factory-plan.mjs --check-job ${jobIdFor(
          jurisdiction,
          "legal_design_normalization"
        )}`,
        normalizationReadiness.reviewMaterialization.verificationCommand
      ]
    });
  }

  const authorityGroups = acquisitionAuthorityGroups(inputs);
  for (const group of authorityGroups) {
    const normalization = firstJobFor("legal_design_normalization", group.jurisdiction);
    addJob({
      lane: "source_acquisition",
      jurisdiction: group.jurisdiction,
      jobId: group.jobId,
      trackIds: group.trackIds,
      strategyFamily: group.strategyFamily,
      acquisitionIds: group.acquisitionIds,
      reconciliationIds: group.reconciliationIds,
      downloadedSourceCount: NO_DOWNLOAD_AUTHORITY_FAMILIES.has(
        group.strategyFamily
      )
        ? 0
        : undefined,
      dependencies: normalization ? [normalization.jobId] : [],
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/source-acquisition/${group.jobId}.json`
      ],
      requiredInputs: [
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.sourceRelationships,
        FACTORY_INPUT_PATHS.blockerLedger,
        FACTORY_INPUT_PATHS.sourceAcquisitionQueue,
        FACTORY_INPUT_PATHS.sourceArtifacts,
        FACTORY_INPUT_PATHS.acquisitionDocuments,
        FACTORY_INPUT_PATHS.acquisitionCampaigns,
        FACTORY_INPUT_PATHS.acquisitionUnresolved
      ],
      model:
        group.jobId === "rcap-al-in-repo-identity-reconciliation-cr-65"
          ? "codex"
          : group.model,
      effort:
        group.jobId === "rcap-al-in-repo-identity-reconciliation-cr-65"
          ? "xhigh"
          : group.effort,
      commitSubject: group.commitSubject,
      stopCondition: authorityStopCondition(group.strategyFamily, group),
      status:
        [
          "rcap-ar-in-repo-identity-reconciliation-acic",
          "rcap-ar-public-official-download-acic-gaps",
          "rcap-al-in-repo-identity-reconciliation-cr-65"
        ].includes(group.jobId) ||
        COMPLETED_AUTHORITY_JOB_COMMITS.has(group.jobId)
          ? "completed"
          : undefined,
      completionCommit:
        COMPLETED_AUTHORITY_JOB_COMMITS.get(group.jobId) ??
        (group.jobId === "rcap-ar-in-repo-identity-reconciliation-acic"
          ? ARKANSAS_ACIC_WORKER_COMMIT
          : group.jobId === "rcap-ar-public-official-download-acic-gaps"
            ? ARKANSAS_PUBLIC_GAPS_WORKER_COMMIT
            : group.jobId === "rcap-al-in-repo-identity-reconciliation-cr-65"
              ? ALABAMA_CR65_WORKER_COMMIT
              : undefined),
      executionNote:
        group.jobId === "rcap-al-in-repo-identity-reconciliation-cr-65"
          ? "Canonical model remains codex. Execution by Opus was a user-directed override and does not change the assignment model."
          : undefined
    });
  }

  addAuthorityCorrectionFollowups({ addJob });
  addIntegratedAuthorityDecisionOwners({ addJob, rootDir });
  addWaveCorrectionAssignments({ addJob, rootDir });

  addJob({
    lane: "source_acquisition",
    jurisdiction: "AR",
    jobId: "rcap-ar-acic-mixed-footer-revision-adjudication",
    trackIds: ["ar-act346"],
    strategyFamily: "source_identity_resolution",
    reconciliationIds: [
      "revision:AR:ACIC-PETITION-DISMISS-AND-SEAL-FIRST-OFFENDERS"
    ],
    downloadedSourceCount: 0,
    dependencies: ["rcap-ar-public-official-download-acic-gaps"],
    status: "blocked",
    expectedOutputs: [
      `${FACTORY_DATA_DIR}/source-acquisition/rcap-ar-acic-mixed-footer-revision-adjudication.json`
    ],
    requiredInputs: [
      `${FACTORY_DATA_DIR}/source-acquisition/rcap-ar-public-official-download-acic-gaps.json`,
      FACTORY_INPUT_PATHS.authority,
      FACTORY_INPUT_PATHS.sourceAcquisitionQueue
    ],
    model: "opus",
    effort: "high",
    commitSubject: "docs(record-clearing): adjudicate AR mixed form revision",
    stopCondition:
      "Adjudicate only which recorded page-level footer controls the existing " +
      "ACIC-PETITION-DISMISS-AND-SEAL-FIRST-OFFENDERS binary. Do not redownload or modify the " +
      "binary, change packet implementation, infer unrelated authority, enable runtime, or promote. " +
      TERMINAL_INSTRUCTION
  });

  // The first incremental successor tranche.
  //
  // The monolithic Edition 1.3 job below depends on every authority job in the
  // plan, which means the Hawaii application — bytes measured, identity
  // resolved, role, scope, revision and structure all settled — waits on an
  // unrelated Massachusetts retrieval nobody has been able to attend. Official
  // PDF work is the critical path and that gate is what holds it.
  //
  // This job publishes a closed tranche instead: only rows that satisfy every
  // admission criterion exactly, with everything else named in the successor
  // backlog rather than silently omitted. It is ready when the generated plan
  // actually admits a row, so it cannot become a job that publishes nothing.
  const successorPlanPath =
    "data/record-clearing/master-library/edition-successor-plan.json";
  const successorPlan = (() => {
    const absolute = path.join(rootDir, successorPlanPath);
    if (!fs.existsSync(absolute)) return null;
    try {
      return JSON.parse(fs.readFileSync(absolute, "utf8"));
    } catch {
      return null;
    }
  })();
  const trancheRows = successorPlan?.candidateTranche?.rows ?? [];
  if (trancheRows.length > 0) {
    addJob({
      lane: "source_acquisition",
      jurisdiction: "NATIONWIDE",
      jobId: "rcap-nationwide-master-library-edition-1-3-tranche-1-publication",
      strategyFamily: "edition_publication",
      dependencies: [
        ...new Set(trancheRows.map((row) => row.jobId))
      ].sort((left, right) => left.localeCompare(right)),
      status: "ready",
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/authority/master-library-edition-1-3-tranche-1-publication.json`
      ],
      requiredInputs: [
        successorPlanPath,
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.sourceArtifacts,
        FACTORY_INPUT_PATHS.acquisitionDocuments
      ],
      model: "opus",
      effort: "xhigh",
      executionScope: "captain",
      participantPacketProofRequired: false,
      commitSubject:
        "docs(record-clearing): publish Master Library Edition 1.3 tranche 1",
      executionNote:
        `Tranche manifest ${successorPlan.trancheManifestSha256}. ` +
        `${trancheRows.length} admitted row(s); ` +
        `${successorPlan.successorBacklog?.length ?? 0} deferred to the next successor, each with an exact blocker.`,
      stopCondition:
        "Publish exactly the rows the generated successor plan admits, and no others. Every " +
        "published row carries exact authority, exact source identity, exact bytes where bytes " +
        "apply, exact role, exact scope, a resolved licence, the deterministic tranche manifest " +
        "digest and predecessor lineage. " +
        "Edition 1.2 is immutable and is never amended, overwritten or reconstructed: a tranche " +
        "is a new edition. Every deferred row stays named in the successor backlog — a row may " +
        "be deferred, never silently omitted. " +
        "Do not admit a row on a near miss, do not infer a missing digest, byte count, role, " +
        "scope or licence, and do not publish while the predecessor lineage is incomplete. " +
        "Publishing establishes identity and nothing else: packet readiness, runtime " +
        "registration, counsel adoption and production enablement all remain separate and stay " +
        "where they are. " +
        TERMINAL_INSTRUCTION
    });
  }

  const authorityJobs = jobs.filter((job) => job.lane === "source_acquisition");
  const editionPublication = addJob({
    lane: "source_acquisition",
    jurisdiction: "NATIONWIDE",
    jobId: "rcap-nationwide-master-library-edition-1-3-publication",
    strategyFamily: "edition_publication",
    dependencies: authorityJobs.map((job) => job.jobId),
    expectedOutputs: [
      `${FACTORY_DATA_DIR}/authority/master-library-edition-1-3-publication.json`
    ],
    requiredInputs: [
      FACTORY_INPUT_PATHS.authority,
      FACTORY_INPUT_PATHS.trackSourceAudit,
      FACTORY_INPUT_PATHS.productionPlan,
      FACTORY_INPUT_PATHS.acquisitionDocuments
    ],
    model: "opus",
    effort: "xhigh",
    executionScope: "captain",
    commitSubject: "docs(record-clearing): prepare Master Library Edition 1.3 publication",
    stopCondition:
      "Prepare the bounded Edition 1.3 publication record only after every authority dependency has " +
      "a final disposition. Never amend or overwrite Edition 1.2, never infer a legal conclusion, " +
      "and stop before publication, generation enablement, promotion, or deployment. " +
      TERMINAL_INSTRUCTION
  });

  addCompletedMarylandChild({ addJob });
  addMarylandLegacyEvidenceMigrationJob({ addJob, rootDir, jobs });
  addOfficialPdfQueueRegenerationJob({ addJob });
  addCompletedGeorgiaChild({ addJob });
  addCompletedDcCustomPleadingChild({ addJob });
  addCompletedIllinoisCustomPleadingChild({ addJob });
  addDcCustomPleadingReconciliationChild({ addJob });
  addCompletedGuidanceChildren({ addJob });
  addGuidanceTypedStopChildren({ addJob });
  addGeorgiaRfoPostConsentAdjudicationChild({ addJob });
  addMassachusettsPre2024OcpRequestAdjudicationChild({ addJob });

  const implementedTrackIds = implementedTracks(inputs.implementationRecords);
  const pendingTracks = normalizedTracks.filter(
    (track) =>
      !implementedTrackIds.has(`${track.jurisdiction}:${track.trackId}`) &&
      !COMPLETED_GUIDANCE_TRACKS.has(
        `${track.jurisdiction}:${track.trackId}`
      ) &&
      !GUIDANCE_TYPED_STOP_TRACKS.has(
        `${track.jurisdiction}:${track.trackId}`
      ) &&
      !isMarylandAuthorityOnlyRoute(track, inputs.canonicalParentJobs) &&
      !isCanonicalNonImplementationTrack(track, inputs.canonicalParentJobs) &&
      !isGeorgiaJailGuidanceSpecificationTrack(track) &&
      !isDcCustomPleadingStopTrack(track)
  );
  const classifications = classifyOfficialPdfTracks(inputs, pendingTracks, rootDir);

  addTrackLaneJobs({
    lane: "custom_pleading",
    tracks: pendingTracks.filter(
      (track) => track.outputStrategy === "custom_pleading" && !isComposedTrack(track)
    ),
    inputs,
    addJob,
    rootDir,
    jobsByLaneAndState
  });
  addGeorgiaJailGuidanceSpecificationChildren({ addJob });
  addTrackLaneJobs({
    lane: "acroform_fill",
    tracks: classifications.acroform,
    inputs,
    addJob,
    rootDir,
    jobsByLaneAndState,
    sourceMaterializationFoundationJobId: sourceMaterializationFoundation.jobId
  });
  addTrackLaneJobs({
    lane: "flat_pdf_overlay",
    tracks: classifications.overlay,
    inputs,
    addJob,
    rootDir,
    jobsByLaneAndState,
    sourceMaterializationFoundationJobId: sourceMaterializationFoundation.jobId
  });
  addTrackLaneJobs({
    lane: "composed_route",
    tracks: pendingTracks.filter(isComposedTrack),
    inputs,
    addJob,
    rootDir,
    jobsByLaneAndState,
    sourceMaterializationFoundationJobId: sourceMaterializationFoundation.jobId
  });
  addTrackLaneJobs({
    lane: "guidance_implementation",
    tracks: pendingTracks.filter(
      (track) => track.outputStrategy === "process_guidance" && !isComposedTrack(track)
    ),
    inputs,
    addJob,
    rootDir,
    jobsByLaneAndState
  });

  addJob({
    lane: "flat_pdf_overlay",
    jurisdiction: "GA",
    jobId: "rcap-ga-flat-pdf-overlay",
    trackIds: ["ga-nonconv-pre2013"],
    dependencies: [sourceMaterializationFoundation.jobId],
    status: "completed",
    completionCommit:
      "f2f2c2c4de39d631bdd04e78563265519f8d21bd",
    requiredInputs: [
      FACTORY_INPUT_PATHS.authority,
      FACTORY_INPUT_PATHS.normalizedTracks,
      FACTORY_INPUT_PATHS.officialPdfSourceProjection
    ],
    expectedOutputs: [
      "src/lib/rcap/packets/jurisdictions/georgia/official-overlay.ts",
      "scripts/verify-rcap-georgia-official-overlay.mjs"
    ],
    ownedPaths: [
      "src/lib/rcap/packets/jurisdictions/georgia/official-overlay.ts",
      "scripts/verify-rcap-georgia-official-overlay.mjs"
    ],
    integrationOwnedOutputs: [
      `${OFFICIAL_PDF_PROOF_DIR}/rcap-ga-flat-pdf-overlay.json`,
      `${REVIEW_MANIFEST_DIR}/rcap-ga-flat-pdf-overlay.json`
    ],
    regressionVerifier:
      "scripts/verify-rcap-georgia-official-overlay.mjs",
    participantPacketProofRequired: true,
    focusedValidation: [
      "node scripts/rcap-factory-plan.mjs --check-job rcap-ga-flat-pdf-overlay",
      "node scripts/verify-rcap-georgia-official-overlay.mjs"
    ],
    commitSubject:
      "feat(record-clearing): implement Georgia official PDF overlay",
    executionNote:
      "The exact source-bound worker implementation and deterministic technical fixture are " +
      "integrated. Formal visual review, completed-output legal review, counsel adoption, packet " +
      "readiness, runtime registration, and production enablement remain separate.",
    stopCondition:
      "Terminal completed child: source commit " +
      "f2f2c2c4de39d631bdd04e78563265519f8d21bd is integrated with an " +
      "integration-owned official-PDF proof. Preserve source immutability, the page-2-only " +
      "overlay map, protected regions, and the runtime-disabled boundary. Do not scaffold, " +
      "execute, enable, promote, or deploy this job."
  });

  addJob({
    lane: "acroform_fill",
    jurisdiction: "IA",
    jobId: "rcap-ia-acroform-fill",
    trackIds: ["ia-dci77"],
    dependencies: [sourceMaterializationFoundation.jobId],
    status: "blocked",
    requiredInputs: [
      FACTORY_INPUT_PATHS.authority,
      FACTORY_INPUT_PATHS.normalizedTracks,
      FACTORY_INPUT_PATHS.officialPdfSourceProjection
    ],
    expectedOutputs: [
      "src/lib/rcap/packets/jurisdictions/iowa/official-acroform.ts",
      "scripts/verify-rcap-iowa-official-acroform.mjs"
    ],
    ownedPaths: [
      "src/lib/rcap/packets/jurisdictions/iowa/official-acroform.ts",
      "scripts/verify-rcap-iowa-official-acroform.mjs"
    ],
    regressionVerifier:
      "scripts/verify-rcap-iowa-official-acroform.mjs",
    participantPacketProofRequired: true,
    focusedValidation: [
      "node scripts/rcap-factory-plan.mjs --check-job rcap-ia-acroform-fill",
      "node scripts/verify-rcap-iowa-official-acroform.mjs"
    ],
    commitSubject:
      "feat(record-clearing): implement Iowa DCI-77 AcroForm",
    stopCondition:
      "Implement only the exact assigned Iowa DCI-77 official AcroForm. Do not broaden into the " +
      "overlay family, acquire sources, change legal design, enable runtime, promote, or deploy. " +
      TERMINAL_INSTRUCTION
  });

  addJob({
    lane: "acroform_fill",
    jurisdiction: "MD",
    jobId: "rcap-md-official-pdf-supporting-components",
    trackIds: [
      "md_10105_early",
      "md_10110_conviction",
      "md_cannabis_petition",
      "md_pardon_expungement"
    ],
    dependencies: [sourceMaterializationFoundation.jobId],
    status: "blocked",
    requiredInputs: [
      FACTORY_INPUT_PATHS.authority,
      FACTORY_INPUT_PATHS.normalizedTracks,
      FACTORY_INPUT_PATHS.officialPdfSourceProjection
    ],
    expectedOutputs: [
      "src/lib/rcap/packets/jurisdictions/maryland/official-components.ts",
      "scripts/verify-rcap-maryland-official-components.mjs"
    ],
    ownedPaths: [
      "src/lib/rcap/packets/jurisdictions/maryland/official-components.ts",
      "scripts/verify-rcap-maryland-official-components.mjs"
    ],
    regressionVerifier:
      "scripts/verify-rcap-maryland-official-components.mjs",
    participantPacketProofRequired: true,
    focusedValidation: [
      "node scripts/rcap-factory-plan.mjs --check-job rcap-md-official-pdf-supporting-components",
      "node scripts/verify-rcap-maryland-official-components.mjs"
    ],
    commitSubject:
      "feat(record-clearing): implement Maryland official PDF supporting components",
    stopCondition:
      "Implement only the exact assigned Maryland supporting official-PDF components. Preserve " +
      "the completed shielding implementation, leave all routes runtime-disabled, and stop before " +
      "source acquisition, legal-design changes, packet readiness, promotion, or deployment. " +
      TERMINAL_INSTRUCTION
  });

  const officialPdfAssignmentResult = applyOfficialPdfAssignments({
    rootDir,
    jobs,
    inputs,
    sourceMaterializationFoundationJobId:
      sourceMaterializationFoundation.jobId
  });
  addAuthorityBackedSourceMaterializationJobs({
    rootDir,
    addJob,
    inputs,
    unownedAssignableIdentities:
      officialPdfAssignmentResult.unownedAssignableIdentities,
    sourceMaterializationFoundationJobId:
      sourceMaterializationFoundation.jobId
  });

  // Two review assignments per implementation family, with different owners
  // and different output paths.
  //
  // There was one job, and it asked a single worker for a page-by-page visual
  // review *and* a completed-output legal review, into one file. Those are
  // different competencies and different accountabilities: a technical
  // reviewer confirming that no page is blank and no execution block is
  // pre-filled is not the person qualified to say the venue is right, and
  // neither of them is counsel. One artifact for both meant technical approval
  // could read as legal approval, which is the one inference that must never
  // be available.
  for (const implementationJobId of COMPLETED_OUTPUT_REVIEW_ASSIGNMENTS) {
    const implementation = jobs.find(
      (job) => job.jobId === implementationJobId
    );
    if (!implementation || implementation.status !== "completed") continue;
    const packetProof = `${PACKET_PROOF_DIR}/${implementationJobId}.json`;
    const reviewManifest =
      `${REVIEW_MANIFEST_DIR}/${implementationJobId}.json`;
    if (
      !fs.existsSync(path.join(rootDir, packetProof)) ||
      !fs.existsSync(path.join(rootDir, reviewManifest))
    ) {
      continue;
    }
    const technicalResultPath =
      `${TECHNICAL_REVIEW_DIR}/${implementationJobId}.json`;
    const legalResultPath =
      `${LEGAL_REVIEW_DIR}/${implementationJobId}.json`;
    const correctionRequired =
      implementationsRequiringCorrection(rootDir).has(implementationJobId);
    const technicalApproved =
      technicalReviewApproved(rootDir, implementationJobId);

    addJob({
      lane: "legal_output_review",
      jurisdiction: implementation.jurisdiction,
      jobId: `${implementationJobId}-technical-visual-review`,
      strategyFamily: "technical_visual_review",
      trackIds: implementation.trackIds,
      dependencies: [implementationJobId],
      // Recorded once a technical result exists for this output. A
      // correction-required implementation is not re-opened here: the current
      // output was reviewed and found defective, and the re-review belongs to
      // the corrected packet, which does not exist yet.
      ...technicalReviewCompletion(rootDir, implementationJobId),
      expectedOutputs: [technicalResultPath],
      ownedPaths: [technicalResultPath],
      requiredInputs: [
        packetProof,
        reviewManifest,
        ...(implementation.expectedOutputs ?? [])
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "high",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job " +
          `${implementationJobId}-technical-visual-review`
      ],
      commitSubject:
        `docs(record-clearing): technically review ${implementationJobId} output`,
      executionNote:
        "Technical and visual review only. Page inspection may be divided among read-only " +
        "vision workers; one primary reviewer writes the result.",
      stopCondition:
        "Read every rendered page and record what is physically on it: deterministic " +
        "rendering against the recorded packet hashes, page counts, clipping, overlap, blank " +
        "pages, stranded headings, execution blocks, protected fields, appearance streams, " +
        "page order, official-source visual fidelity and generated-file tracking. " +
        "This is not a legal review. Do not assess the governing mechanism, eligibility, " +
        "waiting period, venue, filing actor, destination, required allegations or any " +
        "participant-facing legal statement, and do not write to the completed-output " +
        "legal-review result — a different owner holds that path. " +
        "Technical approval establishes nothing beyond itself: it is not legal approval, not " +
        "counsel adoption, not packet readiness and not production enablement. Do not mark " +
        "counsel adoption, do not mark any route packet-ready, and do not enable runtime, " +
        "promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });

    addJob({
      lane: "legal_output_review",
      jurisdiction: implementation.jurisdiction,
      jobId: `${implementationJobId}-completed-output-review`,
      strategyFamily: "completed_output_legal_review",
      trackIds: implementation.trackIds,
      dependencies: [
        implementationJobId,
        `${implementationJobId}-technical-visual-review`
      ],
      // A legal read of output that is already known defective reviews a
      // document nobody will ship. It waits for the correction and the
      // re-review, and says so rather than sitting ready.
      status: correctionRequired || !technicalApproved ? "blocked" : "ready",
      expectedOutputs: [legalResultPath],
      ownedPaths: [legalResultPath],
      requiredInputs: [
        packetProof,
        reviewManifest,
        technicalResultPath,
        ...(implementation.expectedOutputs ?? []),
        `data/record-clearing/legal-design-intake/${implementation.jurisdiction}.memo.json`,
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.packetSetManifests,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job " +
          `${implementationJobId}-completed-output-review`
      ],
      commitSubject:
        `docs(record-clearing): review ${implementationJobId} completed output`,
      executionNote: correctionRequired
        ? "Blocked behind an implementation correction: the reviewed output is known " +
          "defective and the corrected packet has not been produced or technically reviewed."
        : technicalApproved
          ? "Technical and visual review is recorded and approved. This job is the formal " +
            "legal read of the finished participant-facing output, which no verifier performs."
          : "Blocked until technical and visual review of this output is recorded.",
      stopCondition:
        "Perform, and record the result of, a completed-output legal review of the assembled " +
        "documents. Verify the governing mechanism, the eligibility boundary, the waiting " +
        "period, the venue, the filing actor, the destination, the required allegations, the " +
        "document roles, the source identity, the outside-party boundaries, service, the fee " +
        "statements, the proposed-order treatment, the self-help stops and every " +
        "participant-facing legal statement. Confirm that nothing generated is presented as " +
        "another party's or a court's instrument and that every outside-party field is left " +
        "blank rather than filled. " +
        "Record exact defects and exactly one recommendation: recommend_adopt, " +
        "recommend_correction or recommend_hold. " +
        "This is not a technical review and you do not own the technical result. Recording a " +
        "recommendation is not adopting it: counsel is the adopter. Do not mark counsel " +
        "adoption, do not edit packet text, legal conclusions, track strategy or authority " +
        "classification, do not mark any route packet-ready, and do not enable runtime, " +
        "promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  // Owners created by the integrated D1 and F results. Each is exactly one
  // question with exactly one owner; none of them re-asks something a worker
  // has already answered.
  for (const owner of INTEGRATED_RESULT_FOLLOW_UP_OWNERS) {
    if (owner.requires && !fs.existsSync(path.join(rootDir, owner.requires))) {
      continue;
    }
    const isMemo = owner.ownsMemo === true;
    const outputPath = isMemo
      ? `data/record-clearing/legal-design-intake/${owner.jurisdiction}.memo.json`
      : owner.lane === "source_acquisition"
        ? `${FACTORY_DATA_DIR}/source-acquisition/${owner.jobId}.json`
        : `${FACTORY_DATA_DIR}/legal-design-decisions/${owner.jobId}.json`;
    addJob({
      lane: owner.lane,
      jurisdiction: owner.jurisdiction,
      jobId: owner.jobId,
      strategyFamily: owner.strategyFamily,
      trackIds: [],
      dependencies: owner.dependencies ?? [],
      ...(owner.lane === "source_acquisition"
        ? {
            reconciliationIds: [`followup:${owner.jurisdiction}:${owner.jobId}`],
            downloadedSourceCount: 0
          }
        : {}),
      // A memo always exists, so presence cannot say whether this amendment
      // landed. Its recorded output state can: the job is complete once the
      // memo has reached the state it produced, or any state recorded after it.
      status: isMemo
        ? memoHasReached(
            rootDir,
            owner.jurisdiction,
            memoStateProducedBy(owner.jurisdiction, owner.jobId)
          )
          ? "completed"
          : "ready"
        : fs.existsSync(path.join(rootDir, outputPath))
          ? "completed"
          : "ready",
      expectedOutputs: [outputPath],
      ownedPaths: [outputPath],
      requiredInputs: [
        ...(owner.requires ? [owner.requires] : []),
        `data/record-clearing/legal-design-intake/${owner.jurisdiction}.memo.json`,
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: owner.model ?? "opus",
      effort: "xhigh",
      focusedValidation: [
        `node scripts/rcap-factory-plan.mjs --check-job ${owner.jobId}`
      ],
      commitSubject: owner.subject,
      executionNote: owner.note,
      stopCondition: `${owner.stop} ${TERMINAL_INSTRUCTION}`
    });
  }

  // Written-permission owners, derived from the licence decisions themselves.
  //
  // A licence decision that withholds generation answers "may we?" with no. It
  // does not create the work of going and asking, and until someone owns that,
  // a jurisdiction sits permanently at generation_permission_required with no
  // route out. Deriving these from the corpus rather than naming Indiana keeps
  // Colorado, Indiana and Kansas on the same footing and picks up the next one
  // automatically. Seeking permission is a human act: no worker may send it.
  {
    const authorization = buildSourceAuthorizationIndex(rootDir);
    for (const [jurisdiction, decision] of [...authorization.decisions].sort(
      ([left], [right]) => left.localeCompare(right)
    )) {
      const jobId = `rcap-${jurisdiction.toLowerCase()}-written-permission-authorization`;
      const outputPath = `${FACTORY_DATA_DIR}/source-acquisition/${jobId}.json`;
      const delivered = fs.existsSync(path.join(rootDir, outputPath));
      // A delivered permission decision stays in the plan. Colorado showed why:
      // the moment its grant landed, `permitsGeneration` went true and the very
      // job that had obtained the grant stopped being generated — taking its
      // claim and its provenance with it. This is the same disappearing act the
      // technical-review corrections pulled, and it has the same fix. A job that
      // produced a result is history; it is not made hypothetical by its own
      // success.
      if (permitsGeneration(decision.verdict) && !delivered) continue;
      addJob({
        lane: "source_acquisition",
        jurisdiction,
        jobId,
        strategyFamily: "written_permission_request",
        reconciliationIds: [`permission:${jurisdiction}`],
        downloadedSourceCount: 0,
        trackIds: [],
        dependencies: [decision.supersedes ?? decision.decisionJobId].filter(
          (id) => id !== jobId
        ),
        status: delivered ? "completed" : "ready",
        expectedOutputs: [outputPath],
        ownedPaths: [outputPath],
        requiredInputs: [
          `${FACTORY_DATA_DIR}/source-acquisition/${
            decision.supersedes ?? decision.decisionJobId
          }.json`,
          FACTORY_INPUT_PATHS.authority,
          FACTORY_INPUT_PATHS.sourceArtifacts
        ],
        participantPacketProofRequired: false,
        model: "codex",
        effort: "xhigh",
        focusedValidation: [`node scripts/rcap-factory-plan.mjs --check-job ${jobId}`],
        commitSubject: `chore(record-clearing): own the ${jurisdiction} written-permission question`,
        executionNote:
          `${decision.decisionJobId} settled that ${jurisdiction} generation is not permitted ` +
          `(${decision.verdict}). That decision stands and is not reopened here. This job owns ` +
          "the separate question of who asks the publisher for written permission, and records " +
          "the answer when it comes.",
        stopCondition:
          "Identify the rights holder, the correct contact route and the exact scope a request " +
          "would have to cover, and draft the request. " +
          "Do not send it. Sending is a human act requiring separate authorization, exactly as " +
          "with the Missouri issuer request. Do not contact a publisher, court or clerk. Do not " +
          "treat a drafted request as permission, a granted licence, or an acquisition. Do not " +
          "reopen or relitigate the licence decision, and do not record counsel adoption. " +
          "Until written permission is actually granted and recorded, the retained " +
          `${jurisdiction} binaries stay materialized and hash-verified but not generation-` +
          "authorized: no receipt may be deleted or altered, no source may become worker-ready, " +
          `no ${jurisdiction} packet may be generated, and runtime stays disabled. ` +
          TERMINAL_INSTRUCTION
      });
    }
  }

  // The Wyoming owners. Each closes on its committed decision record.
  for (const owner of WYOMING_LEGAL_DESIGN_OWNERS) {
    const decisionPath =
      `${FACTORY_DATA_DIR}/legal-design-decisions/${owner.jobId}.json`;
    const acquisitionPathFor =
      `${FACTORY_DATA_DIR}/source-acquisition/${owner.jobId}.json`;
    const outputPath =
      owner.lane === "source_acquisition" ? acquisitionPathFor : decisionPath;
    const present = fs.existsSync(path.join(rootDir, outputPath));
    addJob({
      lane: owner.lane,
      jurisdiction: "WY",
      jobId: owner.jobId,
      strategyFamily: owner.strategyFamily,
      trackIds: [],
      dependencies: [],
      ...(owner.lane === "source_acquisition"
        ? { reconciliationIds: [`survey:WY:${owner.jobId}`], downloadedSourceCount: 0 }
        : {}),
      status: present ? "completed" : "ready",
      expectedOutputs: [outputPath],
      ownedPaths: [outputPath],
      requiredInputs: [
        "data/record-clearing/legal-design-intake/WY.memo.json",
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.packetSetManifests,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: owner.model,
      effort: "xhigh",
      focusedValidation: [
        `node scripts/rcap-factory-plan.mjs --check-job ${owner.jobId}`
      ],
      commitSubject: owner.subject,
      executionNote: owner.note,
      stopCondition: `${owner.stop} ${TERMINAL_INSTRUCTION}`
    });
  }

  // The clean halves of the split whole-state assignments, plus the
  // legal-design owners for the questions that forced the split.
  for (const split of ATOMIC_IMPLEMENTATION_SPLITS) {
    const original = jobs.find(
      (job) =>
        job.lane === split.lane &&
        job.jurisdiction === split.jurisdiction &&
        job.trackIds.length > 0 &&
        split.blockedTrackIds.every((trackId) => job.trackIds.includes(trackId))
    );
    if (!original) continue;
    const state = (inputs.allStateBuildStatus.states ?? []).find(
      (candidate) => candidate.code === split.jurisdiction
    );
    if (!state) continue;

    addJob({
      lane: split.lane,
      jurisdiction: split.jurisdiction,
      jobId: split.cleanJobId,
      strategyFamily: "custom_pleading",
      trackIds: split.cleanTrackIds,
      dependencies: [],
      ...(SPLIT_CLEAN_COMPLETIONS[split.cleanJobId]
        ? {
            status: "completed",
            ...SPLIT_CLEAN_COMPLETIONS[split.cleanJobId],
            integrationOwnedOutputs: [
              `${PACKET_PROOF_DIR}/${split.cleanJobId}.json`,
              `${REVIEW_MANIFEST_DIR}/${split.cleanJobId}.json`
            ]
          }
        : { status: "ready" }),
      expectedOutputs: original.expectedOutputs,
      ownedPaths: original.expectedOutputs,
      requiredInputs: original.requiredInputs,
      regressionVerifier: original.regressionVerifier,
      participantPacketProofRequired: true,
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        `node scripts/rcap-factory-plan.mjs --check-job ${split.cleanJobId}`,
        `node ${original.regressionVerifier}`
      ],
      commitSubject:
        `feat(record-clearing): implement ${split.jurisdiction} custom pleading`,
      executionNote:
        `The clean tracks of the ${split.jurisdiction} assignment, split out so they can be ` +
        `delivered atomically: ${split.cleanTrackIds.join(", ")}. ` +
        `${split.blockedTrackIds.join(", ")} is deliberately excluded and stays with the ` +
        "original assignment, which is blocked on its own legal-design question. Do not " +
        "implement it here and do not infer its mechanism from these tracks.",
      stopCondition:
        `Implement exactly ${split.cleanTrackIds.join(", ")} and nothing else. ` +
        `${split.blockedTrackIds.join(", ")} is not yours: it carries an unresolved release ` +
        "blocker and belongs to the original assignment. Take every component, role, " +
        "recipient and destination from the corrected memo and nowhere else, produce the " +
        "participant packet proof the lane requires, and keep runtime disabled. " +
        TERMINAL_INSTRUCTION
    });

    addJob({
      lane: "legal_design_normalization",
      jurisdiction: split.jurisdiction,
      jobId: split.correctionJobId,
      strategyFamily: "legal_design_adjudication",
      trackIds: [],
      dependencies: [],
      ...decisionRecordCompletion(rootDir, split.correctionJobId, {
        workerBranch: WAVE_WORKER_BRANCHES[split.correctionJobId],
        workerCommit: WAVE_WORKER_COMMITS[split.correctionJobId],
        completionCommit:
          DECISION_RECORD_COMPLETION_COMMITS[split.correctionJobId]
      }),
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/${split.correctionJobId}.json`
      ],
      ownedPaths: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/${split.correctionJobId}.json`
      ],
      requiredInputs: [
        `data/record-clearing/legal-design-intake/${split.jurisdiction}.memo.json`,
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.packetSetManifests,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        `node scripts/rcap-factory-plan.mjs --check-job ${split.correctionJobId}`
      ],
      // The subject and stop condition live on the split definition, beside the
      // question they describe. They were a jurisdiction ternary, which reads as
      // "Ohio or else Washington" and silently hands a third split Washington's
      // CROP venue instructions — Kentucky would have been commissioned to
      // reconcile a Washington statute.
      commitSubject: split.correctionSubject,
      executionNote:
        `Owns the question that blocked ${split.blockedTrackIds.join(", ")} and forced the ` +
        `${split.jurisdiction} assignment to be split. It owns a decision record only.`,
      stopCondition: split.correctionStop
    });
  }

  // Implementation corrections opened by technical review.
  //
  // Each is a reissue of the assignment that produced the defect, owning the
  // same module and verifier — not a second job racing the first for the same
  // two files. Each is pinned to the exact blobs and evidence the reviewer
  // read, so a correction written against a module that has since moved is
  // caught rather than silently applied to something else.
  const reviewCorrections = [
    {
      implementationJobId: "rcap-in-custom-pleading",
      jurisdiction: "IN",
      modulePath: "src/lib/rcap/packets/jurisdictions/indiana/custom-pleading.ts",
      verifierPath: "scripts/verify-rcap-indiana-custom-pleading.mjs",
      moduleSha256:
        "aff728a43c2e97c654f48185b46d51c020f9cf56f932f5ad0e5a37061eb79df8",
      verifierSha256:
        "ef4cda4cb5428b22c60b89744975f73eda02d7aed4c78bccaa8d5d8c4f64ae21",
      packetProofSha256:
        "89b7ba8a8b105dcb0cd48aba42ef2ffe4c8b371773fdb4195def2425f2de62e5",
      technicalReviewSha256:
        "452f0dd5eea085b3f7302110a71d222a8e40f23e362e3fb1ab410f2f61c888c8",
      fixtureIds: ["in-collateral-action-section-4-marked-expunged-2"],
      commitSubject:
        "fix(record-clearing): reconcile the Indiana collateral-action variant",
      executionNote:
        "One variant packet, one contradiction. collateralActionType says specialized " +
        "driving privileges; the inherited relationship narrative describes a civil " +
        "forfeiture, and both render on the same page.",
      stop:
        "Make the action type and the relationship narrative describe one action. The " +
        "fixture's collateralActionType and the participant's own words in Section III " +
        "currently contradict each other on a single page, and variantPurpose does not " +
        "disclose that the action-type branch is what this variant exercises: state every " +
        "material branch it covers. " +
        "Correct the fixture and the variant's declared purpose, not the pleading template: " +
        "the template renders whatever the fixture supplies and is not the defect. Preserve " +
        "the Indiana memo, the legal-design specifications, component identity and roles, " +
        "packet structure, and every unrelated canonical and variant packet " +
        "value-identically."
    },
    {
      implementationJobId: "rcap-ms-custom-pleading",
      jurisdiction: "MS",
      modulePath:
        "src/lib/rcap/packets/jurisdictions/mississippi/custom-pleading.ts",
      verifierPath: "scripts/verify-rcap-mississippi-custom-pleading.mjs",
      moduleSha256:
        "8a54e7f002d23b853a9597c6ce13e0e51b8ae66c76ec038e0e4f368efb8f0e04",
      verifierSha256:
        "28ed0a99ce7152fb5434f899618e820e5864bd902927eb4413d60e02570f2016",
      packetProofSha256:
        "b441744b2bb2abe1ec85f14d46d9657949252398441108971e3ba0a5ef8b7a61",
      technicalReviewSha256:
        "1dcd516a2d2d26213c2d4c478f582a160dd9c1367295c877c6d31b54acd87571",
      fixtureIds: [
        "ms-drug-cd-paraphernalia-justice-court-2",
        "ms-mip-convicted-and-sentence-completed-2"
      ],
      commitSubject:
        "fix(record-clearing): reconcile the Mississippi variant venues",
      executionNote:
        "Two variant packets whose dependent facts describe two different counties at " +
        "once. A caption in one county, a residence, arresting agency and prosecuting " +
        "authority in another.",
      stop:
        "Make each affected fixture describe one coherent jurisdiction. Reconcile, per " +
        "fixture: court level, court county, participant residence, arresting agency, " +
        "prosecuting authority, prosecutorial district, the approved-as-to-form addressee, " +
        "the certificate-of-service recipient and the cause-number style, so that the " +
        "caption, the body, the proposed order and the certificate of service all name the " +
        "same forum and the same parties. " +
        "Do not change the legal template to accommodate contradictory fixture data: the " +
        "template is correct and the fixtures are not. Preserve the Mississippi memo, the " +
        "legal design, every canonical packet, every unaffected variant, component roles " +
        "and the outside-party protections value-identically."
    },
    {
      implementationJobId: "rcap-nd-custom-pleading",
      jurisdiction: "ND",
      modulePath:
        "src/lib/rcap/packets/jurisdictions/north-dakota/custom-pleading.ts",
      verifierPath: "scripts/verify-rcap-north-dakota-custom-pleading.mjs",
      moduleSha256:
        "88554f072ae809ca0484a023bd4093d40fd53968cdfa9e43a8ab4d78e0e66b48",
      verifierSha256:
        "7f0432d2aac94c0c4712d036e86d1e79260a3ae879459ef308abaee6edf3add7",
      packetProofSha256:
        "d049698d41698a4859815dfa94330b65ffd12c6a5f42985081bedae6448f6217",
      technicalReviewSha256:
        "61df6b83b78a098c06a1e3289f240f2411810b4607b419dde4ba060851c911a5",
      fixtureIds: [
        "nd-dui-seal-municipal-ordinance-2",
        "nd-misdemeanor-seal-municipal-court-2"
      ],
      commitSubject:
        "fix(record-clearing): name the North Dakota municipal court correctly",
      executionNote:
        "Two variant packets caption a court that does not exist. North Dakota municipal " +
        "courts are city courts, established by and named for a municipality under " +
        "N.D.C.C. ch. 40-18.1; there is no municipal court of a county. " +
        // The assignment first cited ch. 40-18, which is the chapter the defect
        // itself followed: it was repealed by S.L. 2025, ch. 379, § 4 and
        // replaced by ch. 40-18.1. Citing the repealed chapter in the assignment
        // that fixes reliance on the repealed chapter would send the next reader
        // to the wrong law to check the work.
        "Chapter 40-18 — the chapter the defective composer followed — was repealed by " +
        "S.L. 2025, ch. 379, § 4. The governing provisions are § 40-18.1-01(1), " +
        "§ 40-18.1-02(1) and § 40-18.1-01(6), the last of which requires the identity of " +
        "the individual court to be expressed in the caption.",
      stop:
        "The caption composer appends 'OF <COUNTY> COUNTY' unconditionally, so selecting " +
        "the municipal court type renders 'IN THE MUNICIPAL COURT OF CASS COUNTY, STATE OF " +
        "NORTH DAKOTA'. Make the municipal route caption the municipality. The city is " +
        "already available on the fixture — its ordinance citation reads 'Fargo Municipal " +
        "Code § 8-0301' — and is simply not used. " +
        "Unlike the Indiana and Mississippi corrections, this one is in the composer and " +
        "not the fixture: the fixture data is coherent and the caption logic is wrong. " +
        // "Notice component" named nothing in this packet set. The third
        // captioned component on these routes is the proof of service —
        // `nd-seal-<track>-proof-of-service` — and a worker looking for a
        // notice component would have found no such thing and had to guess.
        "Correct the caption on the petition, the proposed order and the proof-of-service " +
        "component for the municipal route only. " +
        "Do not change the district-route captions: for those the county name is correct " +
        "and they are unaffected. Preserve the North Dakota memo, the legal design, every " +
        "canonical packet, every unaffected variant, component roles and the outside-party " +
        "protections value-identically."
    }
  ];
  for (const correction of reviewCorrections) {
    const implementation = jobs.find(
      (job) => job.jobId === correction.implementationJobId
    );
    if (!implementation) continue;
    // A delivered correction stays in the plan. Without this it disappeared the
    // moment its own fix landed — the regenerated proof made the defect finding
    // stale, the job that fixed it stopped being generated, and its completion
    // provenance and claim went with it.
    const correctionJobId =
      `${correction.implementationJobId}-technical-review-correction`;
    if (
      !implementationsRequiringCorrection(rootDir).has(
        correction.implementationJobId
      ) &&
      !CORRECTION_COMPLETIONS[correctionJobId]
    ) {
      continue;
    }
    addJob({
      lane: "custom_pleading",
      jurisdiction: correction.jurisdiction,
      jobId: `${correction.implementationJobId}-technical-review-correction`,
      strategyFamily: "implementation_correction",
      trackIds: implementation.trackIds,
      dependencies: [
        correction.implementationJobId,
        `${correction.implementationJobId}-technical-visual-review`
      ],
      ...(CORRECTION_COMPLETIONS[
        `${correction.implementationJobId}-technical-review-correction`
      ]
        ? {
            status: "completed",
            ...CORRECTION_COMPLETIONS[
              `${correction.implementationJobId}-technical-review-correction`
            ]
          }
        : { status: "ready" }),
      expectedOutputs: [correction.modulePath, correction.verifierPath],
      ownedPaths: [correction.modulePath, correction.verifierPath],
      requiredInputs: [
        `${PACKET_PROOF_DIR}/${correction.implementationJobId}.json`,
        `${REVIEW_MANIFEST_DIR}/${correction.implementationJobId}.json`,
        `${TECHNICAL_REVIEW_DIR}/${correction.implementationJobId}.json`,
        `data/record-clearing/legal-design-intake/${correction.jurisdiction}.memo.json`,
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.packetSetManifests
      ],
      regressionVerifier: correction.verifierPath,
      participantPacketProofRequired: true,
      // These tracks are built. The correction owns the module they live in
      // and repairs its current output; it does not re-implement them, and
      // they stay attributed to the commit that produced them.
      implementedTrackIds: implementation.trackIds,
      priorCompletionCommit: implementation.completionCommit,
      // The correction regenerates the implementation's evidence, and like
      // every job it also carries its own review manifest.
      integrationOwnedOutputs: [
        `${REVIEW_MANIFEST_DIR}/${correction.implementationJobId}-technical-review-correction.json`,
        `${PACKET_PROOF_DIR}/${correction.implementationJobId}.json`,
        `${REVIEW_MANIFEST_DIR}/${correction.implementationJobId}.json`
      ],
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job " +
          `${correction.implementationJobId}-technical-review-correction`,
        `node ${correction.verifierPath}`
      ],
      commitSubject: correction.commitSubject,
      executionNote:
        `${correction.executionNote} Pinned to the exact evidence the reviewer read: ` +
        `module ${correction.moduleSha256.slice(0, 12)}, verifier ` +
        `${correction.verifierSha256.slice(0, 12)}, packet proof ` +
        `${correction.packetProofSha256.slice(0, 12)}, technical review ` +
        `${correction.technicalReviewSha256.slice(0, 12)}. Affected fixture(s): ` +
        `${correction.fixtureIds.join(", ")}.`,
      stopCondition:
        `${correction.stop} ` +
        "Regenerate only the technical evidence the change affects. The historical " +
        "completion of this implementation stays on the record; what changes is the " +
        "current output's status. Leave the current output correction-required until a " +
        "replacement packet proof validates — the integration captain owns the proof, the " +
        "review manifest and the supersession of the previous technical result, and a new " +
        "technical review is required before legal review resumes. " +
        "Do not create a second job owning this module or verifier, do not carry the " +
        "previous approval forward, do not mark counsel adoption, do not mark any route " +
        "packet-ready, and do not enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  const implementationLanes = [
    "legal_design_normalization",
    "custom_pleading",
    "acroform_fill",
    "flat_pdf_overlay",
    "composed_route",
    "guidance_implementation"
  ];
  for (const [jurisdiction, tracks] of [...tracksByState.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const dependencies = implementationLanes
      .flatMap((lane) =>
        (jobsByLaneAndState.get(`${lane}:${jurisdiction}`) ?? []).map((job) => job.jobId)
      );
    dependencies.push(
      ...(jobsByLaneAndState.get(`source_acquisition:${jurisdiction}`) ?? []).map(
        (job) => job.jobId
      )
    );
    dependencies.push(editionPublication.jobId);

    const review = addJob({
      lane: "legal_output_review",
      jurisdiction,
      trackIds: tracks.map((track) => track.trackId),
      dependencies,
      requiredInputs: [
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.packetSetManifests,
        FACTORY_INPUT_PATHS.blockerLedger,
        ...dependencies.flatMap((jobId) => jobs.find((job) => job.jobId === jobId)?.expectedOutputs ?? [])
      ]
    });
    addJob({
      lane: "staging_promotion",
      jurisdiction,
      trackIds: tracks.map((track) => track.trackId),
      dependencies: [review.jobId],
      requiredInputs: [
        review.expectedOutputs[0],
        `${REVIEW_MANIFEST_DIR}/${review.jobId}.json`,
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.runtimeRegistry,
        FACTORY_INPUT_PATHS.packetCapabilityRegistry,
        FACTORY_INPUT_PATHS.statePromotionManifest,
        FACTORY_INPUT_PATHS.promotionReadiness
      ]
    });
  }

  attachCanonicalParents(jobs, inputs.canonicalParentJobs, inputs.normalizedTracks);
  const compiledJobClaims = buildCompiledJobClaims(
    inputs.jobClaims,
    jobs
  );
  assertFactoryClaimTargets(
    compiledJobClaims,
    jobs,
    inputs.canonicalParentJobs.map((record) => record.data)
  );
  jobs.sort(compareJobs);
  const lanes = FACTORY_LANES.map((lane) => ({
    lane,
    jobIds: jobs.filter((job) => job.lane === lane).map((job) => job.jobId)
  }));
  const waves = lanes.map((entry, index) => ({
    waveId: `wave-${String(index + 1).padStart(2, "0")}-${entry.lane.replaceAll("_", "-")}`,
    jobIds: entry.jobIds,
    integrationValidation: [...WAVE_INTEGRATION_VALIDATION]
  }));

  const plan = {
    schemaVersion: FACTORY_SCHEMA_VERSION,
    authorityVersion,
    authorityEdition,
    baseCommit,
    generatedFrom: inputs.generatedFrom,
    sourceSummary: buildSourceSummary(inputs, classifications),
    normalizationReadiness: buildNormalizationReadinessSummary(
      normalizationReadinessRecords,
      inputs.normalizationReadiness
    ),
    materializationPlanning: buildMaterializationPlanningSummary(
      jobs,
      inputs
    ),
    sourceEvidenceRetention: buildSourceEvidenceRetention(jobs, rootDir),
    jobClaims: compiledJobClaims,
    canonicalPlan: buildCanonicalPlanSummary(inputs.canonicalParentJobs),
    parentJobReconciliation: buildParentJobReconciliation(
      inputs.canonicalParentJobs,
      jobs
    ),
    authorityJobFamilies: [...AUTHORITY_FAMILY_LABELS],
    acquisitionReconciliation: buildAcquisitionReconciliation(inputs, jobs),
    trackReconciliation: buildTrackReconciliation(
      normalizedTracks,
      jobs,
      inputs.implementationRecords
    ),
    lanes,
    waves,
    jobs
  };

  return assertValidFactoryPlan(plan);
}

export function readFactoryInputs(rootDir) {
  const json = (key) => readJson(rootDir, FACTORY_INPUT_PATHS[key]);
  const authority = json("authority");
  const normalizedTracks = json("normalizedTracks");
  const sourceRelationships = json("sourceRelationships");
  const blockerLedger = json("blockerLedger");
  const sourceAcquisitionQueue = json("sourceAcquisitionQueue");
  const implementationQueue = json("implementationQueue");
  const packetSetManifests = json("packetSetManifests");
  const sourceArtifacts = json("sourceArtifacts");
  const allStateBuildStatus = json("allStateBuildStatus");
  const promotionReadiness = json("promotionReadiness");
  const all51ReviewSignoff = json("all51ReviewSignoff");
  const trackSourceAudit = json("trackSourceAudit");
  const productionPlan = json("productionPlan");
  const acquisitionDocuments = json("acquisitionDocuments");
  const acquisitionCampaigns = json("acquisitionCampaigns");
  const acquisitionIssuers = json("acquisitionIssuers");
  const acquisitionUnresolved = json("acquisitionUnresolved");
  const repositoryAssetAudit = json("repositoryAssetAudit");
  const normalizationReadinessInput = json("normalizationReadiness");
  const jobClaims = json("jobClaims");
  const legalReviewMaterialization = json("legalReviewMaterialization");
  const officialPdfSourceReconciliation =
    json("officialPdfSourceReconciliation");
  const officialPdfSourceProjection = json("officialPdfSourceProjection");
  const normalizationReadiness = applyLegalReviewMaterializationReceipts({
    input: materializeNormalizationResearchInputs({
      input: normalizationReadinessInput,
      rootDir,
      repositoryAssetAudit
    }),
    contract: legalReviewMaterialization,
    rootDir
  });

  // Runtime and promotion records are TypeScript only because the application
  // imports them directly. Read them as data without executing application code.
  const runtimeRegistrySource = readText(rootDir, FACTORY_INPUT_PATHS.runtimeRegistry);
  const packetCapabilitySource = readText(rootDir, FACTORY_INPUT_PATHS.packetCapabilityRegistry);
  const promotionManifestSource = readText(rootDir, FACTORY_INPUT_PATHS.statePromotionManifest);
  const statePromotionRecords = parseEmbeddedPromotionManifest(promotionManifestSource);

  const implementationPaths = listJsonFiles(rootDir, IMPLEMENTATION_DIR);
  const canonicalJobPaths = listJsonFiles(rootDir, CANONICAL_JOBS_DIR);
  const canonicalParentJobs = canonicalJobPaths.map((file) => ({
    path: file,
    data: readJson(rootDir, file)
  }));
  const implementationRecords = implementationPaths
    .filter((file) => /^tranche-\d+\.json$/.test(path.posix.basename(file)))
    .map((file) => ({ path: file, data: readJson(rootDir, file) }));
  const reviewRecords = implementationPaths
    .filter((file) => /(?:review-manifest|visual-review)\.json$/.test(file))
    .map((file) => ({ path: file, data: readJson(rootDir, file) }));

  const generatedFromPaths = [
    ...Object.values(FACTORY_INPUT_PATHS),
    ...(normalizationReadiness.researchInputs ?? []).flatMap((entry) => [
      entry.bundlePath,
      entry.manifestPath
    ]),
    ...implementationPaths,
    ...canonicalJobPaths
  ];
  const generatedFrom = sortedUnique(generatedFromPaths).map((relativePath) => ({
    path: relativePath,
    sha256: sha256File(path.join(rootDir, relativePath))
  }));

  return {
    authority,
    normalizedTracks,
    sourceRelationships,
    blockerLedger,
    sourceAcquisitionQueue,
    implementationQueue,
    packetSetManifests,
    sourceArtifacts,
    allStateBuildStatus,
    promotionReadiness,
    all51ReviewSignoff,
    trackSourceAudit,
    productionPlan,
    acquisitionDocuments,
    acquisitionCampaigns,
    acquisitionIssuers,
    acquisitionUnresolved,
    repositoryAssetAudit,
    normalizationReadiness,
    jobClaims,
    legalReviewMaterialization,
    officialPdfSourceReconciliation,
    officialPdfSourceProjection,
    runtimeRegistrySource,
    packetCapabilitySource,
    statePromotionRecords,
    canonicalParentJobs,
    implementationRecords,
    reviewRecords,
    generatedFrom
  };
}

function addTrackLaneJobs({
  lane,
  tracks,
  inputs,
  addJob,
  rootDir,
  jobsByLaneAndState,
  sourceMaterializationFoundationJobId
}) {
  const groups = groupBy(tracks, (track) => track.jurisdiction);
  for (const [jurisdiction, stateTracks] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const sourceBacked = ["acroform_fill", "flat_pdf_overlay", "composed_route"].includes(
      lane
    );
    const sourceJobs = sourceBacked
      ? (jobsByLaneAndState.get(`source_acquisition:${jurisdiction}`) ?? []).filter(
          (job) =>
            job.trackIds.length === 0 ||
            job.trackIds.some((trackId) =>
              stateTracks.some((track) => track.trackId === trackId)
            )
        )
      : [];
    const overrides = implementationJobOverrides(
      lane,
      jurisdiction,
      inputs,
      rootDir,
      stateTracks
    );
    const state = (inputs.allStateBuildStatus.states ?? []).find(
      (candidate) => candidate.code === jurisdiction
    );
    if (!state) throw new Error(`Missing state identity for ${jurisdiction}.`);
    const defaultOutput = LANE_CONFIGURATION[lane].output(state);
    const defaultVerifier =
      `scripts/verify-rcap-${state.slug}-${lane.replaceAll("_", "-")}.mjs`;
    const regressionVerifier = overrides.regressionVerifier ?? defaultVerifier;
    const dependencies = [
      ...sourceJobs.map((job) => job.jobId),
      ...(sourceBacked && sourceMaterializationFoundationJobId
        ? [sourceMaterializationFoundationJobId]
        : []),
      ...(lane === "composed_route" && jurisdiction === "PA"
        ? ["rcap-pa-pardon-composed-unit-approval-adjudication"]
        : [])
    ];
    const requiredInputs = [
      FACTORY_INPUT_PATHS.authority,
      FACTORY_INPUT_PATHS.normalizedTracks,
      FACTORY_INPUT_PATHS.sourceRelationships,
      FACTORY_INPUT_PATHS.blockerLedger,
      FACTORY_INPUT_PATHS.packetSetManifests,
      FACTORY_INPUT_PATHS.sourceArtifacts,
      ...(lane === "composed_route" && jurisdiction === "PA"
        ? ["data/record-clearing/legal-design-composed-unit-approvals.json"]
        : []),
      ...inputs.implementationRecords.map((record) => record.path),
      ...(overrides.requiredInputs ?? [])
    ];
    const { requiredInputs: _overrideInputs, ...jobOverrides } = overrides;
    addJob({
      lane,
      jurisdiction,
      trackIds: stateTracks.map((track) => track.trackId),
      dependencies,
      status: sourceBacked ? "blocked" : undefined,
      requiredInputs,
      expectedOutputs:
        overrides.expectedOutputs ?? [defaultOutput, regressionVerifier],
      regressionVerifier,
      participantPacketProofRequired: true,
      focusedValidation:
        overrides.focusedValidation ?? [
          `node scripts/rcap-factory-plan.mjs --check-job ${jobIdFor(
            jurisdiction,
            lane
          )}`,
          `node ${regressionVerifier}`
        ],
      ...jobOverrides
    });
  }
}

// Integrated custom-pleading workers. Each record pins the exact worker commit
// whose module and focused verifier are carried into the integration branch. The
// module and verifier stay worker-owned; the participant packet proof and the
// review manifest are integration-owned.
const COMPLETED_CUSTOM_PLEADING_IMPLEMENTATIONS = Object.freeze([
  {
    jurisdiction: "TX",
    completionCommit: "4bce6e3d7aebb30a246af55bf6919bbdd2192999",
    modulePath: "src/lib/rcap/packets/jurisdictions/texas/custom-pleading.ts",
    verifierPath: "scripts/verify-rcap-texas-custom-pleading.mjs"
  },
  {
    jurisdiction: "TN",
    completionCommit: "50aec291f44526bdf86bf3e04d1fc9bd36241ad6",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/tennessee/custom-pleading.ts",
    verifierPath: "scripts/verify-rcap-tennessee-custom-pleading.mjs"
  },
  {
    jurisdiction: "OK",
    completionCommit: "1602ca5ebbf69b9688a3b941b017da6ee6da8609",
    modulePath: "src/lib/rcap/packets/jurisdictions/oklahoma/custom-pleading.ts",
    verifierPath: "scripts/verify-rcap-oklahoma-custom-pleading.mjs",
    // The original implementation was completed and correct in structure. An
    // integrated current-law decision then showed one citation in its rendered
    // text to be stale — 22 O.S. section 19(N) rather than 19(L) — and the
    // packet still said the enrolled SB 2030 text had not been obtained. That
    // error happened; it is recorded, not erased. What the correction changes
    // is the copy, not the completion: the same eleven fixture identifiers,
    // the same tracks, components, roles, inputs, venue and destination.
    correction: {
      reason: "sb_2030_current_law_citation_and_copy",
      decisionJobId: "rcap-ok-sb-2030-current-text-and-currency",
      memoCorrectionJobId: "rcap-ok-sb-2030-current-law-memo-correction",
      implementationCorrectionJobId:
        "rcap-ok-custom-pleading-sb-2030-citation-correction",
      originalWorkerCommit: "1602ca5ebbf69b9688a3b941b017da6ee6da8609",
      correctionWorkerBranch:
        "rcap-factory/rcap-ok-custom-pleading-sb-2030-citation-correction-5783c7be-0fa7501a",
      correctionWorkerCommit:
        "6a0fb848b623c9fefc660503ad0b8ffdca013755",
      correctionCompletionCommit:
        "a9722b4e02bf611ea8304b3410601cb2a938d663",
      byteIdenticalFixtures: ["ok-991c-positive-1"],
      repaginatedFixtures: ["ok-deferred-dismissal-positive-1"]
    },
    workerBranch:
      "rcap-factory/rcap-ok-custom-pleading-sb-2030-citation-correction-5783c7be-0fa7501a",
    workerCommit: "6a0fb848b623c9fefc660503ad0b8ffdca013755"
  },
  {
    jurisdiction: "NV",
    completionCommit: "f35f634669effa4bcec01a51a16205cd690ab5f8",
    modulePath: "src/lib/rcap/packets/jurisdictions/nevada/custom-pleading.ts",
    verifierPath: "scripts/verify-rcap-nevada-custom-pleading.mjs",
    // The expansion landed. The sealing-mechanism correction moved
    // nv_seal_probation_family and nv_repository_removal into this lane, the
    // job was reissued as a controlled expansion of the same assignment, and
    // the reissued worker built both while leaving the original six
    // value-identical. Nothing is unbuilt, so no implementedTrackIds pin is
    // needed any more; the pin existed to stop the widened lane asserting an
    // implementation nobody had produced.
    expansion: {
      reason: "nv_sealing_mechanism_and_packet_capability_correction",
      decisionJobId: "rcap-nv-sealing-mechanism-and-packet-capability-correction",
      addedTrackIds: ["nv_repository_removal", "nv_seal_probation_family"],
      originalTrackIds: [
        "nv_seal_conviction",
        "nv_seal_decrim",
        "nv_seal_multi",
        "nv_seal_nonconviction",
        "nv_seal_pardon",
        "nv_seal_reentry"
      ],
      originalCompletionCommit: "eccb51f2846f3df93a806981a09e991c6e841c8a",
      preExpansionWorkerBranch:
        "rcap-factory/rcap-nv-custom-pleading-1783e4ea-b7cfd8fd",
      preExpansionWorkerCommit: "a1c94ad6791710551495134ee53b05b969842d84"
    },
    workerBranch: "rcap-factory/rcap-nv-custom-pleading-1783e4ea-47bc6eb9",
    workerCommit: "72c50ff282c1543a96d22ded56f03ae7d26a1501"
  },
  {
    jurisdiction: "SC",
    workerBranch: "rcap-factory/rcap-sc-custom-pleading-e4099c88-468b1409",
    workerCommit: "82274eb79ffd869c6d56558a1b508e308a01d200",
    completionCommit: "6f139ff4f2d1b85646f3edd3e434d48fc5b676b6",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/south-carolina/custom-pleading.ts",
    verifierPath: "scripts/verify-rcap-south-carolina-custom-pleading.mjs"
  },
  {
    jurisdiction: "ND",
    workerBranch: "rcap-factory/rcap-nd-custom-pleading-8e2164b3-eefc48ea",
    workerCommit: "9e4e4099c43a1276958f83fd31f0f4bf95d937a2",
    completionCommit: "69b215d3673600b18ead7422699eb4e6636de6fe",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/north-dakota/custom-pleading.ts",
    verifierPath: "scripts/verify-rcap-north-dakota-custom-pleading.mjs",
    // The worker finished before the captain reserved the job for SESSION_B
    // while freezing the next wave. That reservation moved the branch
    // fingerprint from eefc48ea to 936d912d and nothing else: tracks,
    // components, owned paths, expected outputs, commit subject, legal-design
    // inputs and renderer interfaces were byte-identical across the change.
    // The completion is valid on its pre-claim branch and the branch is left
    // exactly as the worker pushed it.
    completionProvenance: "valid_completion_preceding_coordination_claim",
    preClaimAssignmentFingerprint:
      "eefc48eaa4a862b932db555664559b28a7c8af7da9eda901f004bf2a092d0ca4",
    coordinationClaimCommit: "0f856532d40eef7528f1657da70ef825e6476fee"
  },
  {
    jurisdiction: "WI",
    workerBranch: "rcap-factory/rcap-wi-custom-pleading-e5a9d38e-7dc4fef6",
    workerCommit: "0120a3213552dc307788fd6026b130241aa91db8",
    completionCommit: "69b215d3673600b18ead7422699eb4e6636de6fe",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/wisconsin/custom-pleading.ts",
    verifierPath: "scripts/verify-rcap-wisconsin-custom-pleading.mjs"
  },
  {
    jurisdiction: "IN",
    workerBranch: "rcap-factory/rcap-in-custom-pleading-9b3c28db-edb78958",
    workerCommit: "e51ea26a73b6eb1def2c35d0e18696491f3e3f2e",
    completionCommit: "80630a60928012c001ff107bac376845bfd74680",
    modulePath: "src/lib/rcap/packets/jurisdictions/indiana/custom-pleading.ts",
    verifierPath: "scripts/verify-rcap-indiana-custom-pleading.mjs",
    // An older Indiana branch exists at
    // rcap-factory/rcap-in-custom-pleading-9b3c28db, commit b5daae4e, parented
    // on the retired baseline 4eee199a under the legacy pre-fingerprint key.
    // It is an incompatible assignment, it was not integrated, and it is left
    // exactly as it was pushed.
    supersededWorkerBranch: "rcap-factory/rcap-in-custom-pleading-9b3c28db",
    supersededWorkerCommit: "b5daae4e87f32f53c38653da468d2a904b94c405"
  },
  {
    jurisdiction: "HI",
    workerBranch: "rcap-factory/rcap-hi-custom-pleading-e5deb202-8ecf5490",
    workerCommit: "be84e3c36e224f4f722e7b43df455b8a9a33115d",
    completionCommit: "8b892f0ef579788bb5de9b43c59996a0b41e0006",
    modulePath: "src/lib/rcap/packets/jurisdictions/hawaii/custom-pleading.ts",
    verifierPath: "scripts/verify-rcap-hawaii-custom-pleading.mjs"
  },
  {
    jurisdiction: "MS",
    workerBranch: "rcap-factory/rcap-ms-custom-pleading-60280abf-326c2c07",
    workerCommit: "9d25ed6e0391037a171f9bf3660cfff13f490a75",
    completionCommit: "80630a60928012c001ff107bac376845bfd74680",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/mississippi/custom-pleading.ts",
    verifierPath: "scripts/verify-rcap-mississippi-custom-pleading.mjs"
  },
  {
    jurisdiction: "KS",
    workerBranch: "rcap-factory/rcap-ks-custom-pleading-aa0987a3-d844e08a",
    workerCommit: "23b7554ac8431e98efb62d99d954cd64bfa330dd",
    completionCommit: "d58816f8fc75aa5156ff5e26c682e21ed1b31d39",
    modulePath: "src/lib/rcap/packets/jurisdictions/kansas/custom-pleading.ts",
    verifierPath: "scripts/verify-rcap-kansas-custom-pleading.mjs"
  },
  {
    jurisdiction: "MN",
    workerBranch: "rcap-factory/rcap-mn-custom-pleading-b5f21a53-e54a4052",
    workerCommit: "5dc96c76d15fc906ee03e64f560793d9254cf76a",
    completionCommit: "d58816f8fc75aa5156ff5e26c682e21ed1b31d39",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/minnesota/custom-pleading.ts",
    verifierPath: "scripts/verify-rcap-minnesota-custom-pleading.mjs"
  },
  {
    jurisdiction: "MO",
    workerBranch: "rcap-factory/rcap-mo-custom-pleading-f79c2260-ef8dec21",
    workerCommit: "55500bb29f35fa656518b108f894b55301d7afe4",
    completionCommit: "d58816f8fc75aa5156ff5e26c682e21ed1b31d39",
    modulePath: "src/lib/rcap/packets/jurisdictions/missouri/custom-pleading.ts",
    verifierPath: "scripts/verify-rcap-missouri-custom-pleading.mjs"
  },
  {
    jurisdiction: "WV",
    workerBranch: "rcap-factory/rcap-wv-custom-pleading-1caeb874-b7ae9b0c",
    workerCommit: "67aaebf9647876abb5cf1c1a0bc2060ffe680af6",
    completionCommit: "d58816f8fc75aa5156ff5e26c682e21ed1b31d39",
    modulePath:
      "src/lib/rcap/packets/jurisdictions/west-virginia/custom-pleading.ts",
    verifierPath: "scripts/verify-rcap-west-virginia-custom-pleading.mjs"
  }
]);

/**
 * Implementations whose completed output has been handed to formal review.
 *
 * A completed implementation carries technical evidence — a deterministic
 * verifier, an integration-owned packet proof and a review manifest — and none
 * of that is a reading of the finished document. Page-by-page visual review and
 * completed-output legal review are separate work with a separate recommendation
 * for or against counsel adoption, and until they have an owner they are not
 * pending, they are simply absent.
 *
 * This is an explicit captain-owned wave record rather than a sweep over every
 * completed implementation: handing an output to review is a decision about that
 * output, and back-filling one for every previously integrated implementation
 * would assert a review assignment nobody made.
 */
/**
 * Whole-state implementation assignments the captain has split because one
 * track carries an unresolved release blocker. The clean tracks are delivered
 * as their own assignment with their own fingerprint; the blocked track stays
 * with the original job, which stays incomplete.
 */
/**
 * The Wyoming questions that block its custom-pleading lane, each with an
 * owner. They are grouped by the kind of work rather than one job per bullet:
 * a statutory sweep and a substantive design reading are different reads, and
 * the county survey is neither — it needs a person telephoning clerks.
 */
const WYOMING_LEGAL_DESIGN_OWNERS = Object.freeze([
  {
    jobId: "rcap-wy-governing-mechanism-and-currency-reconciliation",
    lane: "legal_design_normalization",
    strategyFamily: "legal_design_adjudication",
    model: "opus",
    subject:
      "docs(record-clearing): reconcile the Wyoming governing mechanisms",
    note:
      "Every assigned Wyoming track carries an unresolved governing-mechanism question, and two of them turn on whether a 2025 or 2026 session amended the controlling section.",
    stop:
      "Establish, from the Wyoming Legislature's own publication and the session laws: " +
      "whether the 2025 or 2026 regular sessions amended Wyo. Stat. sections 7-13-1401, " +
      "7-13-1501 or 7-13-1502, sweeping each session rather than reporting that no " +
      "amendment was identified; the original enactment date of each section, which the " +
      "official publication prints no history note for; whether any Wyoming mechanism " +
      "reaches a completed felony deferral where section 7-13-1401 is barred and section " +
      "7-13-1502 requires a conviction; and whether the internal citation to docket " +
      "S-25-0140 is accurate and says what it is cited for. " +
      "An unswept session is not evidence of no amendment. Where a question cannot be " +
      "closed from the published record, say so and say what would close it. Own only the " +
      "decision record: WY.memo.json belongs to a separate amendment. Do not implement a " +
      "packet, do not declare a track ready, and do not enable runtime, promote, or deploy."
  },
  {
    jobId: "rcap-wy-eligibility-waiting-period-and-effect-reconciliation",
    lane: "legal_design_normalization",
    strategyFamily: "legal_design_adjudication",
    model: "opus",
    subject:
      "docs(record-clearing): reconcile the Wyoming waiting periods and effect",
    note:
      "The misdemeanour route's waiting period turns on a definition nobody has pinned, and the felony route has an express restoration provision the misdemeanour route appears to lack.",
    stop:
      "Establish: what Wyo. Stat. section 7-1-107(b)(iii) defines as a status offence and " +
      "which common Wyoming charges fall inside it, on which the one-year and five-year " +
      "waiting periods depend; and whether an expungement under section 7-13-1501 restores " +
      "any right, given that section 7-13-1502(m) carries an express restoration provision " +
      "and 7-13-1501 does not appear to. " +
      "Do not resolve the asymmetry by reading 7-13-1502(m) across into 7-13-1501: they are " +
      "differently drafted and the difference may be deliberate. Own only the decision " +
      "record. Do not implement a packet, do not declare a track ready, and do not enable " +
      "runtime, promote, or deploy."
  },
  {
    // Session A does not edit a worker-owned memo. The published-source review
    // settles facts WY.memo.json does not yet carry — no statewide petition or
    // proposed-order template, the four excluded documents, the statutory fee
    // per route — and a memo amendment is a legal-design act with its own owner.
    jobId: "rcap-wy-published-source-filing-requirements-memo-amendment",
    lane: "legal_design_normalization",
    strategyFamily: "legal_design_normalization_amendment",
    model: "opus",
    subject:
      "fix(record-clearing): amend the Wyoming memo for the published filing requirements",
    note:
      "The project owner's published-source review answers the statewide packet-component question, and the decision record cannot amend the state memo itself. This job does. It owns WY.memo.json and nothing else.",
    stop:
      "Carry the recorded published-source conclusions into WY.memo.json: Wyoming publishes " +
      "no statewide petition form and no statewide proposed-order template, so the verified " +
      "petition and the Order for Expungement are controlled custom pleading rather than an " +
      "unresolved correct_form question; the participant prepares the order; no civil summons " +
      "and no praecipe are required; where the statute requires service it is the petition " +
      "that is served on the prosecuting attorney and DCI; prosecutor notice to identifiable " +
      "victims is outside-party work; and the proposed order must be available for the judge, " +
      "with initial-filing practice court-specific rather than statewide. " +
      "Record the statutory filing fee per route — $0 under W.S. section 7-13-1401, $100 per " +
      "petition under 7-13-1501, $300 per petition under 7-13-1502, $0 under 14-6-241 — and " +
      "keep copy, certification, postage and record-retrieval charges distinct from it. Do not " +
      "describe a waiver procedure; none is established. " +
      "Retire the correct_form blocker on the affirmative conclusion, not by deletion. Do not " +
      "record the 23-county survey as complete: no county has been telephoned, and its " +
      "remaining scope is unpublished local preference. Keep Casper Municipal Court separate " +
      "and do not bind its packets to any statewide track or to Natrona County Circuit or " +
      "District Court. " +
      "Own only WY.memo.json. Do not implement a packet, do not declare a track ready, and do " +
      "not enable runtime, promote, or deploy."
  },
  {
    jobId: "rcap-wy-local-template-and-handout-survey",
    lane: "source_acquisition",
    strategyFamily: "official_download_automation_blocked",
    model: "codex",
    subject:
      "chore(record-clearing): survey the Wyoming local templates under attended access",
    note:
      "A 23-county clerk survey and a handout-currency check, narrowed by the project owner's " +
      "published-source review. It no longer gates the packet components: the statewide " +
      "question — what the participant files — is answered, and what remains is unpublished " +
      "local preference, which is release-level. The survey is NOT complete and must never be " +
      "recorded as complete: no county has been telephoned.",
    stop:
      "Establish, by attended human contact with the Wyoming courts: which of the 23 " +
      "counties publish a local expungement template, what each published template is, and " +
      "whether the Wyoming Judicial Branch's Expungement Basics handout is current — it " +
      "carries a 10/2015 revision date while being served from a 2025 upload path, and " +
      "those cannot both be right. " +
      "This is a survey, not a download: do not infer a county's practice from a " +
      "neighbouring county, do not treat a search result as an enumeration, and do not " +
      "record a county as having no template merely because none was found. Record exactly " +
      "what each clerk said and what remains unanswered. " +
      "Do not create a source receipt from an unattended retrieval, do not stamp a revision " +
      "onto held bytes, and do not enable runtime, promote, or deploy. " +
      "Scope is now local practice only: local cover sheet, copy count, filing method, " +
      "electronic against paper filing, chambers-copy requirement, whether the proposed order " +
      "is filed initially or brought to a hearing, any unpublished local template, and any " +
      "additional local service document. The statewide packet-component question is settled " +
      "and is not reopened here. If a county's answer changes the statewide legal document " +
      "rather than the way it is filed, stop and say so: that is a legal-design question with " +
      "its own owner, not a filing preference."
  }
]);

/**
 * The split clean assignments that have been delivered. Keyed by the clean job
 * id, because the whole-state job it replaced is superseded and must never
 * pick this up.
 */
/** Delivered implementation corrections, keyed by correction job id. */
const CORRECTION_COMPLETIONS = Object.freeze({
  "rcap-in-custom-pleading-technical-review-correction": {
    workerBranch:
      "rcap-factory/rcap-in-custom-pleading-technical-review-correction-c4033be7-69158102",
    workerCommit: "0c3253e1fd539e41a3bbe28dbcb842a8d953a43d",
    completionCommit: "8b892f0ef579788bb5de9b43c59996a0b41e0006"
  },
  "rcap-ms-custom-pleading-technical-review-correction": {
    workerBranch:
      "rcap-factory/rcap-ms-custom-pleading-technical-review-correction-768c6cc3-fc6539d6",
    workerCommit: "57a49c24892e96c40fef2c91f8cfc41baae779df",
    completionCommit: "7e4526cd9acf20ec4b17ac27e74303947e9cda23"
  },
  // The municipal-court caption fix. Unlike Indiana and Mississippi, the defect
  // was in the caption composer rather than a fixture, so the correction owns
  // the module and the verifier the reviewer could not run.
  "rcap-nd-custom-pleading-technical-review-correction": {
    workerBranch:
      "rcap-factory/rcap-nd-custom-pleading-technical-review-correction-d296572c-29bd4a46",
    workerCommit: "18e36165cafe75318063aa024ad4f67e7d16e5a6",
    completionCommit: "fcd42dda5864ba021072628649a6dce4430f813a"
  }
});

const SPLIT_CLEAN_COMPLETIONS = Object.freeze({
  "rcap-oh-custom-pleading-clean-tracks": {
    workerBranch:
      "rcap-factory/rcap-oh-custom-pleading-clean-tracks-610f8666-d9d0681a",
    workerCommit: "54031d2599095b7144fc6bbf8ce062d250c60c8a",
    completionCommit: "8b892f0ef579788bb5de9b43c59996a0b41e0006"
  },
  "rcap-wa-custom-pleading-clean-tracks": {
    workerBranch:
      "rcap-factory/rcap-wa-custom-pleading-clean-tracks-665b428f-c0ae532b",
    workerCommit: "0b19dc56f1cbef0ab5f2a82433a8b81c7eda35ab",
    completionCommit: "8b892f0ef579788bb5de9b43c59996a0b41e0006"
  }
});

/**
 * Follow-up owners created by integrated results. Each carries only what its
 * source record actually left open.
 */
const INTEGRATED_RESULT_FOLLOW_UP_OWNERS = Object.freeze([
  {
    jobId: "rcap-oh-marijuana-memo-amendment",
    jurisdiction: "OH",
    lane: "legal_design_normalization",
    strategyFamily: "legal_design_normalization_amendment",
    ownsMemo: true,
    requires:
      "data/record-clearing/production-factory/legal-design-decisions/rcap-oh-marijuana-governing-mechanism-reconciliation.json",
    dependencies: ["rcap-oh-marijuana-governing-mechanism-reconciliation"],
    subject: "fix(record-clearing): amend the Ohio marijuana expungement design",
    note:
      "The integrated decision settled the mechanism and named two accuracy defects the memo carries. It could not amend the memo itself; this job does.",
    stop:
      "Carry the integrated governing-mechanism decision into OH.memo.json and retire the " +
      "governing-mechanism release blocker on oh_marijuana_expungement against it. ORC " +
      "2953.321 is the complete and sole marijuana record-clearing route; Issue 2 created no " +
      "record-clearing mechanism and no automatic route; the participant applies; the filing " +
      "court is the sentencing court; the decision is discretionary; prosecutor objection and " +
      "the division (D)(1) probation investigation are outside-party processes; no separate " +
      "route or node is created. " +
      "Fix the two accuracy defects the decision found: the fee division is (G), not (H), and " +
      "the 60-day notice and 30-day objection figures do not govern this route and must be " +
      "replaced with what division (D) actually says. Carry the participant-expectation copy " +
      "the decision supports — probation investigation, prosecutor objection, hearing and " +
      "notice treatment — without predicting an outcome. " +
      "Do not make the track ready: the local-form question and the fee and indigency " +
      "treatment remain open and have their own owners. Do not add this track to the clean " +
      "four-track Ohio assignment. Own only OH.memo.json."
  },
  {
    jobId: "rcap-oh-2953-321-local-form-and-fee-survey",
    jurisdiction: "OH",
    lane: "source_acquisition",
    strategyFamily: "official_download_automation_blocked",
    model: "codex",
    requires:
      "data/record-clearing/production-factory/legal-design-decisions/rcap-oh-marijuana-governing-mechanism-reconciliation.json",
    dependencies: ["rcap-oh-marijuana-governing-mechanism-reconciliation"],
    subject:
      "chore(record-clearing): survey the Ohio 2953.321 local forms and fee practice",
    note:
      "The one question the mechanism decision expressly left open, plus the fee and indigency treatment that governs what a participant is told.",
    stop:
      "Establish: whether local Ohio courts publish an ORC 2953.321 application packet, how " +
      "many materially different local packets exist, and whether any local form is mandatory " +
      "or merely optional; and how the section 2953.321(G) fifty-dollar fee is applied, " +
      "including the applicable indigency or waiver process. " +
      "No local form may be promoted to statewide use without authority saying it applies " +
      "statewide, and a form found in one county is evidence about that county only. Do not " +
      "promise a fee waiver the authority does not establish, and do not record a county as " +
      "publishing nothing merely because nothing was found. " +
      "Do not create a source receipt from an unattended retrieval and do not make the " +
      "marijuana track ready."
  },
  {
    jobId: "rcap-wa-crop-memo-amendment",
    jurisdiction: "WA",
    lane: "legal_design_normalization",
    strategyFamily: "legal_design_normalization_amendment",
    ownsMemo: true,
    requires:
      "data/record-clearing/production-factory/legal-design-decisions/rcap-wa-crop-venue-reconciliation.json",
    dependencies: ["rcap-wa-crop-venue-reconciliation"],
    subject: "fix(record-clearing): amend the Washington CROP venue and form design",
    note:
      "The venue decision closed one blocker and deliberately reopened another in the opposite direction: the AOC pattern set exists, which the memo had concluded it did not.",
    stop:
      "Carry the integrated venue decision into WA.memo.json and retire the venue release " +
      "blocker against it. The qualified court is a superior court; the permissible courts " +
      "are the superior court of the applicant's county of residence or of the county of " +
      "conviction or adjudication; where a court of limited jurisdiction entered the " +
      "conviction the relevant court is that county's superior court; the residence-county " +
      "superior court may decline and dismiss without prejudice; the conviction-county " +
      "superior court may not decline to consider it; there is no statutory transfer " +
      "procedure; clerk confirmation is prudent practice and not a legal prerequisite; and " +
      "one statewide packet is possible as to venue. Replace the geography.venue and " +
      "destination clerk-confirmation language accordingly and add the residence-county " +
      "decline disclosure. " +
      "Reopen the form build blocker in the opposite direction from the memo's conclusion: " +
      "the CRO pattern set exists. Decide custom_pleading against official_pdf_fill for this " +
      "route, and record the RCW 9.97.020(2)(a) discretion over whether a certificate covers " +
      "all criminal history or only the selected court's convictions. " +
      "Do not guess whether the CRO forms are mandatory, pattern or optional — that belongs " +
      "to the form-family owner. Do not make CROP ready, do not add it to the clean two-track " +
      "Washington assignment, and own only WA.memo.json."
  },
  {
    jobId: "rcap-wa-cro-form-family-source-identity",
    jurisdiction: "WA",
    lane: "source_acquisition",
    strategyFamily: "source_identity_resolution",
    model: "codex",
    requires:
      "data/record-clearing/production-factory/legal-design-decisions/rcap-wa-crop-venue-reconciliation.json",
    dependencies: ["rcap-wa-crop-venue-reconciliation"],
    subject: "chore(record-clearing): resolve the Washington CRO form family",
    note:
      "CRO 01.0100, 01.0200, 01.0300, 01.0600, 01.0700, the instructions and the brochure. The venue decision named the family and commissioned this.",
    stop:
      "Establish for the CRO family: the source identity, current revision, official title, " +
      "participant or outside-party role, statewide scope and structural measurements of the " +
      "five operative binaries — CRO 01.0100 Petition, 01.0200 Notice of Filing, 01.0300 " +
      "Proof of Service, 01.0600 Order of Dismissal and 01.0700 Order and Certificate — with " +
      "the current instructions and brochure; whether the forms are mandatory, standard or " +
      "pattern, or optional; the exact mapping of participant petition, notice, proof of " +
      "service and proposed order or certificate, and which documents are not part of the " +
      "participant packet at all — the order of dismissal in particular; whether any local " +
      "superior court requires additional documents; and the filing fee amount with its GR 34 " +
      "waiver treatment. " +
      "Do not guess the mandatory-versus-pattern question: it changes whether the packet may " +
      "reproduce the form or must reference it. Do not generate any CRO form before exact " +
      "acquisition and the licensing and source gates pass, do not create a receipt without " +
      "an authorized source contract, and do not make CROP ready."
  },
  {
    jobId: "rcap-ia-rule-2-86-and-dci-76-component-remap",
    jurisdiction: "IA",
    lane: "legal_design_normalization",
    // The remap arises from two completed authority decisions rather than from
    // an Iowa normalization pod, so it homes to the authority family that
    // produced it. Same footing as the Louisiana output-strategy correction.
    strategyFamily: "legal_design_normalization_amendment",
    requires:
      "data/record-clearing/production-factory/source-acquisition/rcap-ia-source-identity-resolution-certification-of-service.json",
    dependencies: [
      "rcap-ia-source-identity-resolution-certification-of-service",
      "rcap-ia-in-repo-identity-reconciliation-already-retained-under-another-identity"
    ],
    subject: "fix(record-clearing): remap the Iowa components onto their real documents",
    note:
      "Two completed identity resolutions found six components pointing at documents that do not exist as such. Both stopped at the relationship boundary; this owns it.",
    stop:
      "Carry both integrated Iowa resolutions into the track-source relationships and the " +
      "acquisition queue. " +
      "Re-model the five certificate_of_service components as section references into their " +
      "own track's parent Rule 2.86 form, by form and page — Forms 1 through 5 at pages 3, 3, " +
      "2, 2 and 2 — rather than as bound documents, and retire the standalone identity " +
      "'Certification of Service by Mailing or Delivery', which names no published document. " +
      "Close acquire:IA:certification-of-service-by-mailing-or-delivery without acquisition " +
      "and clear its blocker-ledger rows. Record the certification as conditional on the " +
      "paper-filing path, since EDMS service under rule 16.315(1)(b) makes it unnecessary on " +
      "the eFile system. Do not carry a mandatory-statewide flag onto these forms from " +
      "Chapter 17; the standard is substantial compliance. " +
      "Map ia-dci77-attachment-2 to page 1 of the retained three-page Department of Public " +
      "Safety packet at revision 9/22/21, pin sha256 " +
      "321062c91b3d9e2c8f255d62d20186352a2b5884e0ccd4310a18a3a073d7f516 on the relationship, " +
      "close acquire:IA:dci-76-criminal-history-record-check-billing-form without " +
      "acquisition, and correct the queue row's repositoryStatus and requiredAcquisition, " +
      "which contradict the row's own rationale. Record the one-billing-form-per-submission " +
      "rule printed on the form face so assembly does not emit one per request. " +
      "Do not acquire anything, do not create a receipt, and do not map in a similar file. " +
      "The five Rule 2.86 parent forms remain unmanifested behind an iowacourts.gov block and " +
      "Iowa licensing is unverified, so the Iowa official-PDF family stays fail-closed and no " +
      "Iowa track becomes ready. The Rule 2.81(2) thirty-day record-check window and the " +
      "billing-form cardinality are legal-design questions and are not decided here."
  },
  {
    jobId: "rcap-mo-issuer-contact-authorization",
    jurisdiction: "MO",
    lane: "source_acquisition",
    strategyFamily: "direct_issuer_request",
    model: "codex",
    requires:
      "data/record-clearing/production-factory/source-acquisition/rcap-mo-direct-issuer-request.json",
    dependencies: ["rcap-mo-direct-issuer-request"],
    subject:
      "chore(record-clearing): record the Missouri issuer-contact authorization",
    note:
      "The request draft is complete and deliberately unsent. Sending it is a human act that needs separate authorization; this records the dependency and its outcome, and nothing else.",
    stop:
      "This job does not send the request. The Missouri direct-issuer request is drafted, " +
      "bounded and unsent, and it stays unsent until a person with authority sends it. " +
      "Record the dependency and, once a human has been authorized and has acted, the " +
      "outcome: the publication location of the four proposed orders, their current " +
      "revision, and whether they are publicly issued at all. " +
      "Do not send the request, do not claim contact occurred, do not claim receipt, do not " +
      "claim a revision, and do not claim the documents do not exist. A drafted request is " +
      "not an acquisition. The Missouri official-PDF family stays blocked."
  }
]);

const ATOMIC_IMPLEMENTATION_SPLITS = Object.freeze([
  {
    lane: "custom_pleading",
    jurisdiction: "OH",
    cleanJobId: "rcap-oh-custom-pleading-clean-tracks",
    correctionJobId: "rcap-oh-marijuana-governing-mechanism-reconciliation",
    cleanTrackIds: [
      "oh_2953_32_expungement",
      "oh_2953_32_sealing",
      "oh_2953_33_nonconviction",
      "oh_2953_35_firearm"
    ],
    blockedTrackIds: ["oh_marijuana_expungement"],
    blockedQuestion:
      "the Ohio marijuana-expungement governing mechanism: whether ORC 2953.321 is the " +
      "complete participant application mechanism, or whether Issue 2 created a separate or " +
      "automatic mechanism alongside it.",
    correctionSubject:
      "docs(record-clearing): reconcile the Ohio marijuana expungement mechanism",
    correctionStop:
      "Establish, from the current Ohio statutory text and the enacted initiative, " +
      "whether ORC 2953.321 is the complete participant application mechanism for " +
      "marijuana expungement, or whether Issue 2 created a separate or automatic " +
      "mechanism alongside it. Determine which applies to oh_marijuana_expungement, " +
      "what the participant files if anything, where it goes, and whether the route is " +
      "participant-initiated at all. " +
      "Do not resolve the question by analogy to the four sibling Ohio routes, which " +
      "are differently drafted. Do not declare the track ready, do not implement a " +
      "packet, and own only the decision record: OH.memo.json belongs to a separate " +
      "amendment. "
  },
  {
    lane: "custom_pleading",
    jurisdiction: "WA",
    cleanJobId: "rcap-wa-custom-pleading-clean-tracks",
    correctionJobId: "rcap-wa-crop-venue-reconciliation",
    cleanTrackIds: [
      "wa_del_nonconviction",
      "wa_vac_post_probation_9_95_240"
    ],
    blockedTrackIds: ["wa_crop_certificate_of_restoration"],
    blockedQuestion:
      "the Washington CROP venue question under RCW 9.97.020: which court the application may " +
      "statutorily be filed in, and which courts will actually entertain it.",
    correctionSubject: "docs(record-clearing): reconcile the Washington CROP venue",
    correctionStop:
      "Establish, for wa_crop_certificate_of_restoration under RCW 9.97.020, which " +
      "court the application may statutorily be filed in and which courts will " +
      "actually entertain it — those are different questions and the answer must " +
      "distinguish them. Determine the filing process, the correct form if one exists, " +
      "and what a participant is told when the statutory venue and the practical venue " +
      "diverge. " +
      "Do not resolve the venue by choosing the convenient reading, do not declare the " +
      "track ready, do not implement a packet, and own only the decision record: " +
      "WA.memo.json belongs to a separate amendment. "
  },
  {
    // Kentucky's two custom-pleading tracks are siblings in structure and not in
    // readiness. The controlled-substance track carries an eligibility bar that
    // its own memo records and the controlling review does not: KRS 218A.275(12)
    // absolutely bars anyone who previously had a possession charge dismissed
    // after a deferred prosecution under KRS 218A.14151. That is not a drafting
    // detail — it decides whether the participant receives a packet at all, and
    // a pleading built without asking the question would be handed to people who
    // cannot use it.
    //
    // The marijuana/synthetic/salvia track carries no such bar. Splitting keeps
    // one unresolved eligibility question from holding a deliverable track for a
    // second wave, which is the whole reason this machinery exists.
    lane: "custom_pleading",
    jurisdiction: "KY",
    cleanJobId: "rcap-ky-custom-pleading-clean-tracks",
    correctionJobId: "rcap-ky-void-seal-eligibility-bar-reconciliation",
    cleanTrackIds: ["ky_void_seal_marijuana_synthetic_salvia"],
    blockedTrackIds: ["ky_void_seal_controlled_substance"],
    blockedQuestion:
      "the KRS 218A.275(12) eligibility bar: whether a prior KRS 218A.14151 deferred-prosecution " +
      "dismissal absolutely bars voiding, what participant question must be asked before a packet " +
      "is offered, and whether the route remains packet-capable once the bar is encoded.",
    correctionSubject:
      "docs(record-clearing): reconcile the Kentucky void-and-seal eligibility bar",
    correctionStop:
      "Read the controlling Kentucky authority and encode the KRS 218A.275(12) bar for " +
      "ky_void_seal_controlled_substance: a person whose possession charge was previously " +
      "dismissed after a deferred prosecution under KRS 218A.14151 is absolutely barred from " +
      "voiding. KY.memo.json already records the exclusion and states that the controlling " +
      "review does not; establish which is right from the statute rather than from either " +
      "record, and say so. " +
      "Determine the exact participant question that must be asked before a packet is offered " +
      "and the stop that follows a disqualifying answer. This is an eligibility gate, not " +
      "pleading copy: it decides whether the participant receives a packet at all, so a packet " +
      "that asks nothing and files anyway is the failure being prevented. " +
      "Then answer whether the route remains packet-capable once the bar is encoded — a route " +
      "that stops most applicants may still be worth building, and a route that can never " +
      "produce a filing is not, and that is a finding, not a disappointment. " +
      "Preserve every unrelated Kentucky track value-identically, including " +
      "ky_void_seal_marijuana_synthetic_salvia, which is split out and is being implemented in " +
      "parallel: do not touch its design and do not infer its eligibility from this one. " +
      "Do not declare the track ready, do not implement a packet, and own only the decision " +
      "record: KY.memo.json belongs to a separate amendment. "
  }
]);

const COMPLETED_OUTPUT_REVIEW_ASSIGNMENTS = Object.freeze([
  "rcap-sc-custom-pleading",
  "rcap-nh-guidance-implementation",
  "rcap-oh-guidance-implementation",
  "rcap-wv-guidance-implementation",
  "rcap-nd-custom-pleading",
  "rcap-wi-custom-pleading",
  "rcap-ny-guidance-implementation",
  "rcap-nm-guidance-implementation",
  "rcap-ri-guidance-implementation",
  "rcap-ky-guidance-implementation",
  "rcap-in-custom-pleading",
  "rcap-ms-custom-pleading",
  "rcap-ok-guidance-implementation",
  "rcap-tn-guidance-implementation",
  "rcap-nc-guidance-implementation",
  "rcap-ks-custom-pleading",
  "rcap-mn-custom-pleading",
  "rcap-mo-custom-pleading",
  "rcap-wv-custom-pleading",
  "rcap-nj-guidance-implementation",
  "rcap-nv-guidance-implementation",
  "rcap-tx-guidance-implementation",
  "rcap-vt-guidance-implementation",
  "rcap-hi-custom-pleading",
  "rcap-oh-custom-pleading-clean-tracks",
  "rcap-wa-custom-pleading-clean-tracks"
]);

// The deliverable-identity question South Carolina's custom-pleading job waits
// on is a real property of the normalized design, so readiness is read from it
// rather than pinned to a memo hash or asserted by hand. Zero unresolved
// output-strategy questions across the assigned tracks means the correction
// landed; one means it did not, whatever any status field claims.
// A guidance assignment must be guidance all the way down. A component that
// declares an official-PDF output strategy and an official form is packet-
// capable work, and handing it to a guidance worker gives them a component they
// have no lane to build. New York's ny_mrta_marijuana carries exactly one such
// component; the count is read from the normalized design so the gate lifts by
// itself once the correction lands, and returns by itself if it regresses.
function packetCapableGuidanceComponentCount(inputs, jurisdiction) {
  return (inputs?.normalizedTracks?.tracks ?? [])
    .filter(
      (track) =>
        track.jurisdiction === jurisdiction &&
        track.outputStrategy === "process_guidance"
    )
    .flatMap((track) => track.packetSet?.components ?? track.components ?? [])
    .filter(
      (component) =>
        component?.outputStrategy === "official_pdf_fill" &&
        typeof component?.officialFormId === "string" &&
        component.officialFormId.length > 0
    ).length;
}

function unresolvedOutputStrategyQuestionCount(inputs, jurisdiction, lane) {
  return (inputs?.normalizedTracks?.tracks ?? [])
    .filter(
      (track) =>
        track.jurisdiction === jurisdiction && track.outputStrategy === lane
    )
    .flatMap((track) => track.unresolvedQuestions ?? [])
    .filter((question) => question.affectedElement === "output_strategy")
    .length;
}

/**
 * Tracks a completed implementation's own assignment now carries but never
 * built.
 *
 * A legal-design correction can widen an implementation lane after that lane's
 * job was completed. The job's track list is read from the normalized design,
 * so the widened tracks join the assignment silently, and a job left marked
 * completed would then assert an implementation for them. Reading the delta
 * against the pinned implemented set turns that into an expansion assignment
 * instead: the built tracks stay complete against the commit that produced
 * them, and the added tracks become work.
 */
/**
 * True once the Hawaii stage-one and HCJDC 159(b) memo correction is the memo
 * on disk. Closes on the delivered blob, not on a commit asserting it closed.
 */
function hawaiiStageOneMemoCorrected(rootDir) {
  const memo = path.join(
    rootDir,
    "data/record-clearing/legal-design-intake/HI.memo.json"
  );
  return (
    fs.existsSync(memo) &&
    sha256File(memo) ===
      "200088e191a176e48d3a53dc111a901728100aebdfe972eeabd426e3a96048fc"
  );
}

function unbuiltAssignedTracks(record, stateTracks) {
  if (!Array.isArray(record?.implementedTrackIds)) return [];
  const built = new Set(record.implementedTrackIds);
  return (stateTracks ?? [])
    .map((track) => track.trackId)
    .filter((trackId) => !built.has(trackId))
    .sort((left, right) => left.localeCompare(right));
}

function implementationJobOverrides(
  lane,
  jurisdiction,
  inputs,
  rootDir,
  stateTracks
) {
  // B2 returned Ohio and Washington unimplemented, each for the same reason:
  // one track in an otherwise clean whole-state assignment carries an
  // unresolved release blocker, and a worker cannot atomically deliver four
  // fifths of a job. Splitting is the captain's call, not the worker's, so the
  // clean tracks move to their own assignment and the blocked track stays with
  // the original job — which remains incomplete, blocked on the legal-design
  // correction that owns its question.
  // Wyoming stopped for a different reason from Ohio and Washington: there are
  // no clean tracks to split out. All three carry unresolved governing-
  // mechanism questions, all three wait on a local-template survey nobody has
  // run, and two carry unresolved eligibility or waiting-period questions. A
  // pleading cannot be drafted against that, and the assignment was standing
  // ready with every one of those questions open.
  if (lane === "custom_pleading" && jurisdiction === "WY") {
    // Wyoming waited on three questions. Two were legal-design reads and both
    // are integrated. The third was a 23-county clerk survey, and it was the
    // wrong gate: it was holding the statewide packet on unpublished local
    // preference. A published-source review has now settled what the
    // participant files — Wyoming publishes no statewide petition and no
    // statewide proposed-order template, so both are custom pleading, and that
    // is an answer rather than an unresolved correct_form question.
    //
    // What the survey still asks is how a given county wants it filed: cover
    // sheet, copy count, paper or electronic, chambers copy, whether the
    // proposed order goes in at filing or is carried to the hearing. Those are
    // release-level and none of them changes the document. So the survey stays
    // open, keeps its blockers, and no longer gates generation.
    const settled = fs.existsSync(
      path.join(
        rootDir,
        `${FACTORY_DATA_DIR}/legal-design-decisions/wy-published-source-filing-requirements.json`
      )
    );
    const designOwners = WYOMING_LEGAL_DESIGN_OWNERS.map((entry) => entry.jobId).filter(
      (jobId) => jobId !== "rcap-wy-local-template-and-handout-survey"
    );
    const openDesign = designOwners.filter(
      (jobId) =>
        !fs.existsSync(
          path.join(
            rootDir,
            `${FACTORY_DATA_DIR}/legal-design-decisions/${jobId.replace(/^rcap-/u, "")}.json`
          )
        ) &&
        !fs.existsSync(
          path.join(rootDir, `${FACTORY_DATA_DIR}/legal-design-decisions/${jobId}.json`)
        )
    );
    if (!settled || openDesign.length > 0) {
      return {
        status: "blocked",
        dependencies: settled ? openDesign : designOwners,
        model: "opus",
        effort: "xhigh",
        executionNote:
          settled
            ? "Blocked on the remaining Wyoming legal-design reads. The statewide " +
              "packet-component question is settled and is not what is holding this."
            : "Blocked on Wyoming's own open questions, not on a source or licence gate.",
        stopCondition:
          "Blocked on the Wyoming legal-design questions owned by " +
          `${(settled ? openDesign : designOwners).join(", ")}. ` +
          "Do not draft a pleading against an unresolved governing mechanism and do not infer " +
          "a waiting period or an eligibility branch. Do not enable runtime, promote, or " +
          "deploy. " +
          TERMINAL_INSTRUCTION
      };
    }
    return {
      model: "opus",
      effort: "xhigh",
      executionNote:
        "The statewide core packet is settled by the project owner's published-source review, " +
        "recorded at " +
        `${FACTORY_DATA_DIR}/legal-design-decisions/wy-published-source-filing-requirements.json. ` +
        "Wyoming publishes no statewide petition form and no statewide proposed-order " +
        "template, so both are controlled custom pleading. The 23-county survey is NOT " +
        "complete and is deliberately not a dependency: what it still asks is local filing " +
        "preference, which is release-level and changes no document.",
      stopCondition:
        "Implement exactly the statewide core participant packet for wy_nc_1401, " +
        "wy_misd_1501 and wy_fel_1502: a verified petition, a proposed Order for " +
        "Expungement, filing and service instructions, and a route-specific supporting-item " +
        "checklist. " +
        "Include no summons and no praecipe — neither is required by the statewide statutes " +
        "or guidance. Where the applicable statute requires service, it is the petition that " +
        "is served on the prosecuting attorney and DCI, not a summons. " +
        "Write nothing that belongs to another actor: no prosecutor notice to victims, no " +
        "prosecutor response, no DCI action, no judicial findings, no judge signature, no " +
        "clerk certification, and no completed proof of service before service has happened. " +
        "Carry the statutory filing fee per route from the decision record — $0 under " +
        "W.S. § 7-13-1401, $100 per petition under § 7-13-1501, $300 per petition under " +
        "§ 7-13-1502 — and keep copy, certification, postage and record-retrieval charges " +
        "distinct from it. Do not describe a fee waiver; none is established. " +
        "The proposed order must be available for the judge. Whether it accompanies the " +
        "initial filing is court-specific, so the instructions must say so rather than assert " +
        "one practice statewide. " +
        "Use no Casper Municipal Court form. Casper is the only published local-form " +
        "exception, its packets bind to that court alone, and they may not be promoted to " +
        "Natrona County Circuit or District Court or to statewide use. " +
        "Do not enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    };
  }

  const atomicSplit = ATOMIC_IMPLEMENTATION_SPLITS.find(
    (entry) => entry.lane === lane && entry.jurisdiction === jurisdiction
  );
  if (atomicSplit) {
    const present = new Set((stateTracks ?? []).map((track) => track.trackId));
    if (atomicSplit.blockedTrackIds.every((trackId) => present.has(trackId))) {
      // Superseded, not completed and not delivered. This exact assignment —
      // all five Ohio tracks, or all three Washington tracks, in one atomic
      // delivery — is not going to happen, because one of its tracks cannot be
      // implemented until a legal-design question is answered. Saying so is
      // honest; leaving it "ready" would advertise work no worker can finish,
      // and only one job may own the module, so it cannot sit blocked holding
      // the file the clean assignment has to write.
      return {
        status: "cancelled",
        trackIds: [...atomicSplit.blockedTrackIds],
        supersededBy: [atomicSplit.cleanJobId, atomicSplit.correctionJobId],
        model: "opus",
        effort: "xhigh",
        executionNote:
          `Split by the captain and superseded. B2 could not deliver this assignment ` +
          `atomically: ${atomicSplit.blockedTrackIds.join(", ")} carries an unresolved ` +
          `release blocker. The clean tracks moved to ${atomicSplit.cleanJobId}, and the ` +
          `blocked track's question is owned by ${atomicSplit.correctionJobId}. This ` +
          "assignment was never completed and its blocked track is not implemented; a " +
          "follow-up assignment adds it once the mechanism is established.",
        stopCondition:
          `Superseded assignment: do not execute. ${atomicSplit.blockedTrackIds.join(", ")} ` +
          `remains unimplemented, blocked on ${atomicSplit.blockedQuestion} ` +
          "Do not implement it against an unresolved mechanism, do not infer one from the " +
          "sibling tracks, and do not enable runtime, promote, or deploy."
      };
    }
  }

  const completedOfficialPdf = COMPLETED_OFFICIAL_PDF_IMPLEMENTATIONS.find(
    (record) =>
      record.lane === lane && record.jurisdiction === jurisdiction
  );
  if (completedOfficialPdf) {
    const reviewManifest =
      `${REVIEW_MANIFEST_DIR}/${completedOfficialPdf.jobId}.json`;
    const implementationProof =
      `${OFFICIAL_PDF_PROOF_DIR}/${completedOfficialPdf.jobId}.json`;
    return {
      status: "completed",
      completionCommit: completedOfficialPdf.completionCommit,
      integrationOwnedOutputs: [implementationProof, reviewManifest],
      participantPacketProofRequired: true,
      executionNote:
        "The exact source-bound worker implementation and deterministic technical fixtures are " +
        "integrated. Formal visual review, completed-output legal review, counsel adoption, " +
        "packet readiness, runtime registration, and production enablement remain separate.",
      stopCondition:
        `Terminal completed child: source commit ${completedOfficialPdf.completionCommit} is ` +
        "integrated with an integration-owned official-PDF proof. Preserve source immutability, " +
        "fixture variants, expected no-document outcomes, protected field ownership, and the " +
        "runtime-disabled boundary. Do not scaffold, execute, enable, promote, or deploy this job."
    };
  }
  const completedCustomPleading = COMPLETED_CUSTOM_PLEADING_IMPLEMENTATIONS.find(
    (record) =>
      lane === "custom_pleading" && record.jurisdiction === jurisdiction
  );
  if (completedCustomPleading) {
    const jobId = jobIdFor(jurisdiction, lane);
    const workerOutputs = [
      completedCustomPleading.modulePath,
      completedCustomPleading.verifierPath
    ];
    const unbuilt = unbuiltAssignedTracks(completedCustomPleading, stateTracks);
    if (unbuilt.length > 0) {
      // Reissued as a controlled expansion of the same assignment, not as a
      // second job owning the same two files. The changed assignment produces a
      // new branch through the ordinary fingerprint machinery and the delivered
      // worker branch is left untouched for audit.
      return {
        status: "ready",
        dependencies: completedCustomPleading.expansionDependencies ?? [],
        model: "opus",
        effort: "xhigh",
        expectedOutputs: workerOutputs,
        ownedPaths: workerOutputs,
        implementedTrackIds: completedCustomPleading.implementedTrackIds,
        priorCompletionCommit: completedCustomPleading.completionCommit,
        integrationOwnedOutputs: [
          `${PACKET_PROOF_DIR}/${jobId}.json`,
          `${REVIEW_MANIFEST_DIR}/${jobId}.json`
        ],
        regressionVerifier: completedCustomPleading.verifierPath,
        participantPacketProofRequired: true,
        focusedValidation: [
          `node scripts/rcap-factory-plan.mjs --check-job ${jobId}`,
          `node ${completedCustomPleading.verifierPath}`
        ],
        commitSubject:
          `feat(record-clearing): expand ${jurisdiction} custom pleading`,
        executionNote:
          `Expansion of an integrated implementation. ${completedCustomPleading.implementedTrackIds.join(
            ", "
          )} are built and integrated at ${completedCustomPleading.completionCommit}; ` +
          `${unbuilt.join(", ")} joined this lane through an integrated legal-design ` +
          "correction and are not built. Preserve every existing track, fixture and typed " +
          "stop value-identically and add only what the correction established.",
        stopCondition:
          `Add ${unbuilt.join(", ")} to the existing module and verifier. The ` +
          `${completedCustomPleading.implementedTrackIds.length} already-implemented tracks ` +
          "and their fixtures must stay value-identical; a diff that changes one of them is " +
          "the wrong change. Take each added track's components, roles, recipients and " +
          "destination from the corrected memo and nowhere else. Do not create a second " +
          "module, do not create a second job for these paths, do not present anything " +
          "generated as an official form, produce the participant packet proof the lane " +
          "requires, and keep runtime disabled. " +
          TERMINAL_INSTRUCTION
      };
    }
    return {
      status: "completed",
      completionCommit: completedCustomPleading.completionCommit,
      ...(completedCustomPleading.workerBranch
        ? { workerBranch: completedCustomPleading.workerBranch }
        : {}),
      ...(completedCustomPleading.workerCommit
        ? { workerCommit: completedCustomPleading.workerCommit }
        : {}),
      model: "opus",
      effort: "xhigh",
      expectedOutputs: workerOutputs,
      ownedPaths: workerOutputs,
      integrationOwnedOutputs: [
        `${PACKET_PROOF_DIR}/${jobId}.json`,
        `${REVIEW_MANIFEST_DIR}/${jobId}.json`
      ],
      regressionVerifier: completedCustomPleading.verifierPath,
      participantPacketProofRequired: true,
      focusedValidation: [
        `node scripts/rcap-factory-plan.mjs --check-job ${jobId}`,
        `node ${completedCustomPleading.verifierPath}`
      ],
      commitSubject:
        `feat(record-clearing): implement ${jurisdiction} custom pleading`,
      stopCondition:
        `Terminal completed child: source commit ${completedCustomPleading.completionCommit} ` +
        "is integrated. Preserve the drafted pleading contents, actor boundaries, and typed " +
        "stops. No document here is presented as an official form. Visual proof and hash-bound " +
        "counsel adoption remain separate; runtime stays disabled. Do not scaffold, execute, " +
        "regenerate, enable, promote, or deploy this job."
    };
  }
  // Hawaii's custom-pleading lane owns the stage-one filing made in the
  // sentencing court. The integrated design did not establish what that filing
  // is — whether a statewide court form exists, whether the vehicle is a motion
  // or a petition, what must be alleged, how it is served, the eligibility
  // standard on four of the five tracks, count limits, or the extent of the
  // court's discretion — and a worker handed it would have had to invent one.
  //
  // The stage-one filing-vehicle decision established all of it and the memo
  // correction carried it into HI.memo.json. The gate reads the corrected memo
  // rather than a status set by hand, so it lifts by itself now and closes by
  // itself if the memo is ever replaced.
  if (
    lane === "custom_pleading" &&
    jurisdiction === "HI" &&
    fs.existsSync(
      path.join(
        rootDir,
        `${FACTORY_DATA_DIR}/source-acquisition/` +
          "rcap-hi-in-repo-identity-reconciliation-hcjdc-159.json"
      )
    ) &&
    !hawaiiStageOneMemoCorrected(rootDir)
  ) {
    return {
      status: "blocked",
      dependencies: [
        "rcap-hi-stage-one-expungement-filing-vehicle-current-law-reconciliation",
        "rcap-hi-expungement-stage-one-and-hcjdc-159b-memo-correction"
      ],
      model: "opus",
      effort: "xhigh",
      executionNote:
        "Do not scaffold or execute until the Hawaii stage-one filing vehicle is established " +
        "and the memo correction that carries it is integrated.",
      stopCondition:
        "Blocked on the Hawaii stage-one legal design. This lane owns the filing made in the " +
        "sentencing court before any application reaches the Criminal Justice Data Center, and " +
        "the design does not establish whether a statewide court form exists, whether the " +
        "vehicle is a motion or a petition, what must be alleged, how it is served, the " +
        "eligibility standard on four of the five tracks, whether counts are limited, or how " +
        "much discretion the court has. HCJDC 159(b) is the stage-two agency application and " +
        "is not the stage-one filing. Do not scaffold, do not create an implementation branch, " +
        "do not resolve the filing vehicle inside an implementation, and do not enable " +
        "runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    };
  }
  if (lane === "guidance_implementation" && jurisdiction === "NY") {
    const packetCapableComponents = packetCapableGuidanceComponentCount(
      inputs,
      "NY"
    );
    if (packetCapableComponents > 0) {
      return {
        status: "blocked",
        dependencies: [NY_MRTA_PACKET_CAPABILITY_JOB_ID],
        model: "opus",
        effort: "xhigh",
        executionNote:
          "Do not scaffold or execute until " +
          `${NY_MRTA_PACKET_CAPABILITY_JOB_ID} is complete. The assignment still carries ` +
          `${packetCapableComponents} packet-capable component(s) inside a pure-guidance ` +
          "track.",
        stopCondition:
          "Blocked on the marijuana packet-capability correction. " +
          `${packetCapableComponents} component(s) on a process_guidance track still declare ` +
          "an official-PDF output strategy and an official form — " +
          "ny_mrta_marijuana-destruction-request-instructions-2 carrying " +
          "MRTA-DESTRUCTION-REQUEST, which the participant signs and sends. A guidance worker " +
          "has no lane to build it. Do not scaffold, do not create an implementation branch, " +
          "do not resolve the packet-capability question inside an implementation, and do not " +
          "enable runtime, promote, or deploy. " +
          TERMINAL_INSTRUCTION
      };
    }
  }
  if (lane === "custom_pleading" && jurisdiction === "VA") {
    // Virginia's two custom-pleading tracks are blocked by two independent
    // questions, and neither can be answered inside an implementation.
    //
    // The first is which law governs. Va. Code § 19.2-392.2 has a version in
    // force and a version effective 2026-12-01, and the assigned tracks are
    // currently dated out at 2026-11-30. A worker cannot draft a pleading
    // without knowing which text it is drafted under.
    //
    // The second is what document is being built at all. If the Office of the
    // Executive Secretary publishes a statewide instrument for either route,
    // the route is official-PDF work and not custom pleading, and the pleading
    // would be the wrong artifact — not a rough draft of the right one.
    //
    // Both gates derive from their decision records, so each lifts by itself
    // when its owner delivers and returns by itself if the record is removed.
    const cutoverResolved = fs.existsSync(
      path.join(
        rootDir,
        `${FACTORY_DATA_DIR}/legal-design-decisions/va-2026-2027-statutory-cutover.json`
      )
    );
    const formIdentityResolved = fs.existsSync(
      path.join(
        rootDir,
        `${FACTORY_DATA_DIR}/legal-design-decisions/` +
          "va-cc-1201-source-identity-materialization.json"
      )
    );
    if (!cutoverResolved || !formIdentityResolved) {
      const open = [
        ...(cutoverResolved
          ? []
          : ["rcap-va-2026-2027-statutory-cutover"]),
        ...(formIdentityResolved
          ? []
          : ["rcap-va-cc-1201-source-identity-materialization"])
      ];
      return {
        status: "blocked",
        dependencies: open,
        model: "opus",
        effort: "xhigh",
        executionNote:
          "Do not scaffold or execute until " +
          `${open.join(" and ")} ` +
          (open.length > 1 ? "are" : "is") +
          " complete. Two independent questions are open: which version of " +
          "Va. Code § 19.2-392.2 governs a packet generated now, and whether the Office of " +
          "the Executive Secretary publishes a statewide instrument for either assigned route.",
        stopCondition:
          "Blocked on the Virginia governing-law and official-form questions, which are " +
          "separately owned and separately unresolved. " +
          (cutoverResolved
            ? ""
            : "The statutory cutover is undetermined: § 19.2-392.2 has a version in force and " +
              "a version effective 2026-12-01, the assigned tracks end 2026-11-30, and whether " +
              "a current-law packet may be built before the cutover is exactly what is being " +
              "decided. ") +
          (formIdentityResolved
            ? ""
            : "The form identity is undetermined: if a statewide instrument exists for either " +
              "route then the route is official-PDF work and a custom pleading is the wrong " +
              "document, not an early version of the right one. ") +
          "Do not scaffold, do not create an implementation branch, do not resolve either " +
          "question inside an implementation, do not pick the version that makes the work " +
          "possible, and do not treat a failed form search as proof that no form exists. Do " +
          "not enable runtime, promote, or deploy. " +
          TERMINAL_INSTRUCTION
      };
    }
  }
  if (lane === "custom_pleading" && jurisdiction === "SC") {
    // Scaffolding this job while the memo still asks whether LegalEase may
    // pre-fill the prescribed order form would hand a worker eleven tracks
    // whose deliverable identity reads as undecided, which is exactly why the
    // first attempt stopped without a commit. Readiness is derived from the
    // normalized design itself, not from a status field: the gate lifts only
    // when the assigned tracks carry no unresolved output-strategy question.
    const openDeliverableQuestions = unresolvedOutputStrategyQuestionCount(
      inputs,
      "SC",
      "custom_pleading"
    );
    if (openDeliverableQuestions > 0) {
      return {
        status: "blocked",
        dependencies: [SC_SOLICITOR_DELIVERABLE_MEMO_CORRECTION_JOB_ID],
        model: "opus",
        effort: "xhigh",
        executionNote:
          "Do not scaffold or execute until " +
          `${SC_SOLICITOR_DELIVERABLE_MEMO_CORRECTION_JOB_ID} is complete. The controlling ` +
          "determination is recorded at " +
          `${FACTORY_DATA_DIR}/legal-design-decisions/` +
          `${SC_SOLICITOR_DELIVERABLE_DECISION_ID}.json; the memo has not yet been corrected ` +
          "against it.",
        stopCondition:
          `Blocked on the solicitor-deliverable memo correction. ${openDeliverableQuestions} ` +
          "assigned tracks still carry a release_blocker question on output_strategy asking " +
          "whether LegalEase may pre-fill the prescribed expungement order form. The answer is " +
          "recorded and is no; the memo has not yet been corrected to say so. Do not scaffold, " +
          "do not create an implementation branch, do not resolve the question inside an " +
          "implementation, and do not enable runtime, promote, or deploy. " +
          TERMINAL_INSTRUCTION
      };
    }
    return {
      model: "opus",
      effort: "xhigh",
      executionNote:
        "The controlling deliverable determination is recorded at " +
        `${FACTORY_DATA_DIR}/legal-design-decisions/` +
        `${SC_SOLICITOR_DELIVERABLE_DECISION_ID}.json and the memo is corrected against it, so ` +
        "the eleven assigned tracks carry no unresolved output-strategy question. Generate the " +
        "participant deliverable the determination names and nothing else.",
      stopCondition:
        "Generate, for each of the eleven solicitor-office routes, a controlled application or " +
        "request package directed to the solicitor's office. Do not generate the solicitor's " +
        "statutory expungement order and do not portray any generated document as the " +
        "participant's filing of it: SCCA 223A1, SCCA 223C and analogous prescribed order " +
        "instruments remain solicitor and court documents, and the solicitor's office obtains " +
        "and completes the blank order form under section 17-22-930. Leave every solicitor, " +
        "attestor, clerk and court field blank. SCCA 223E is the participant-facing official " +
        "application only on the unfingerprinted section 17-22-950(B) branch and belongs to no " +
        "solicitor route. Do not invent a participant-facing official form. Preserve the " +
        "single-incident fee question, the same-incident aggregation question, multi-county " +
        "venue and the H.3730 and H.428 monitor. Keep every route runtime-disabled and " +
        "packet_ready false. " +
        TERMINAL_INSTRUCTION
    };
  }
  if (lane === "custom_pleading" && jurisdiction === "IL") {
    const tranchePrefix =
      "data/record-clearing/implementation-tranches/tranche-4";
    return {
      model: "opus",
      effort: "xhigh",
      regressionVerifier:
        "scripts/verify-rcap-il-custom-pleading-packets.mjs",
      participantPacketProofRequired: true,
      expectedOutputs: [
        "src/lib/rcap/packets/jurisdictions/illinois/custom-pleading.ts",
        "src/lib/rcap/packets/registry-il-custom-pleading.ts",
        `${tranchePrefix}.json`,
        `${tranchePrefix}-authority-pins.json`,
        `${tranchePrefix}-component-guidance.json`,
        `${tranchePrefix}-field-ownership.json`,
        `${tranchePrefix}-fixtures.json`,
        `${tranchePrefix}-review-manifest.json`,
        `${tranchePrefix}-visual-review.json`,
        `${tranchePrefix}-legal-output-recommendation.json`,
        "scripts/rcap-generate-il-custom-pleading-review.mjs",
        "scripts/verify-rcap-il-custom-pleading-packets.mjs"
      ],
      requiredInputs: [
        "data/record-clearing/implementation-tranches/tranche-1.json",
        "data/record-clearing/implementation-tranches/tranche-3.json",
        "src/lib/rcap/packets/assemble.ts",
        "src/lib/rcap/packets/engines/custom-pleading.ts",
        "src/lib/rcap/packets/registry-ga-superior-court-pleading-family.ts"
      ],
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-il-custom-pleading",
        "node scripts/verify-rcap-il-custom-pleading-packets.mjs"
      ],
      stopCondition:
        "Generate one deterministic final participant-facing PDF for each assigned Illinois custom-" +
        "pleading track through the real persistence and assembly path, with positive and typed-stop " +
        "fixtures, technical proof, rendered-page visual proof, and a legal recommendation awaiting " +
        "counsel adoption. Reuse the Mississippi and Georgia architecture without editing any live " +
        "Illinois generator, shared generated registry, runtime route, packet_ready, enablement, or " +
        "promotion state. " +
        TERMINAL_INSTRUCTION
    };
  }
  return {};
}

function addAuthorityCorrectionFollowups({ addJob }) {
  const records = [
    {
      jurisdiction: "CO",
      jobId: "rcap-co-jdf-2370-role-and-jdf-2371-mapping-correction",
      dependency:
        "rcap-co-in-repo-identity-reconciliation-needs-edition-reclass-not-acquisition",
      reconciliationIds: [
        "role:CO:JDF-2370:instructions",
        "mapping:CO:JDF-2371:motion"
      ],
      reason:
        "Bind JDF-2370 as instructions and the retained JDF-2371 as the unbound motion, using only the recorded form-face evidence."
    },
    {
      jurisdiction: "ME",
      jobId: "rcap-me-form-face-title-correction",
      dependency: "rcap-me-public-official-download",
      reconciliationIds: ["title:ME:CR-289", "title:ME:CR-307"],
      reason:
        "Correct titles only from each form-face heading; never substitute a footer line or change packet identity without exact evidence."
    },
    {
      jurisdiction: "IL",
      jobId: "rcap-il-notice-of-court-date-statewide-role-correction",
      dependency: "rcap-il-public-official-download",
      reconciliationIds: [
        "scope:IL:CXP-NOTICE-OF-COURT-DATE-FOR-MOTION:statewide"
      ],
      reason:
        "Reconcile the Notice of Court Date as an Illinois statewide-accepted form, without changing unrelated route design."
    },
    {
      jurisdiction: "MI",
      jobId: "rcap-mi-mc-227-revision-3-25-correction",
      dependency: "rcap-mi-public-official-download",
      reconciliationIds: ["revision:MI:MC-227:3-25"],
      reason:
        "Record the printed MC-227 Rev. 3/25 identity and preserve the three assigned sub-form rows as components, not separate documents."
    },
    {
      jurisdiction: "ID",
      jobId: "rcap-id-shield-revision-and-bci-identity-correction",
      dependency: "rcap-id-public-official-download",
      reconciliationIds: [
        "revision:ID:PETITION-TO-SHIELD:01-01-2024",
        "revision:ID:BCI:REV-UNKNOWN"
      ],
      reason:
        "Record the shield footer as 01/01/2024, retain BCI as REV-UNKNOWN, and never invent an Order to Shield."
    }
  ];
  for (const record of records) {
    const evidencePath =
      `${FACTORY_DATA_DIR}/source-acquisition/${record.dependency}.json`;
    addJob({
      lane: "source_acquisition",
      jurisdiction: record.jurisdiction,
      jobId: record.jobId,
      strategyFamily: "source_identity_resolution",
      reconciliationIds: record.reconciliationIds,
      downloadedSourceCount: 0,
      dependencies: [record.dependency],
      // These close the same way every other authority job does: on the
      // captain's recorded integration commit for the decision record, not on
      // the file merely existing.
      status: COMPLETED_AUTHORITY_JOB_COMMITS.has(record.jobId)
        ? "completed"
        : "ready",
      ...(COMPLETED_AUTHORITY_JOB_COMMITS.has(record.jobId)
        ? {
            completionCommit: COMPLETED_AUTHORITY_JOB_COMMITS.get(record.jobId)
          }
        : {}),
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/source-acquisition/${record.jobId}.json`
      ],
      requiredInputs: [
        evidencePath,
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.sourceRelationships,
        FACTORY_INPUT_PATHS.sourceArtifacts
      ],
      model: "opus",
      effort: "high",
      commitSubject:
        `docs(record-clearing): reconcile ${record.jurisdiction} source identity`,
      stopCondition:
        `${record.reason} Do not download a binary, mutate Edition 1.2, infer a legal ` +
        "conclusion, implement a packet, enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }
}

/**
 * Owners created by the integrated Colorado, Massachusetts and Louisiana
 * authority decisions.
 *
 * Each decision established an exact answer and stopped at a boundary it was
 * barred from crossing. What it handed back needs a named owner, or the
 * question is not open — it is lost. None of these jobs may acquire, license,
 * materialize or render anything; each resolves one question.
 */
/**
 * Corrections owed by the integrated Oklahoma, Ohio, New York, Colorado,
 * Louisiana and Nevada decisions.
 *
 * A decision that changes what a participant is told does not finish when it is
 * written down. Every one of these owns exactly one path, and none of them is
 * work Session A may do itself: a state memo is worker-owned legal design, and
 * participant-facing packet copy is worker-owned implementation. Creating the
 * owner is how the question stays open instead of becoming lost.
 */
function addWaveCorrectionAssignments({ addJob, rootDir }) {
  // A memo correction is complete when the corrected blob is on disk, and an
  // authority job when its decision record is. Neither closes on a commit
  // asserting it.
  // Every recorded historical state of the same memo is acceptable. A memo can
  // be amended more than once — Florida's continuation re-scope was followed by
  // the Rule 3.989(a) and 3.9895(b) binding correction — and a completed
  // correction does not stop being complete because a later one landed on top
  // of it. Pinning only the newest hash reopened the earlier job and put two
  // active owners on one memo.
  const memoCorrected = (code, ...accepted) => {
    const absolute = path.join(
      rootDir,
      `data/record-clearing/legal-design-intake/${code}.memo.json`
    );
    if (!fs.existsSync(absolute)) return false;
    const actual = sha256File(absolute);
    return accepted.flat().filter(Boolean).includes(actual);
  };
  const completionOf = (jobId) =>
    COMPLETED_AUTHORITY_JOB_COMMITS.has(jobId) &&
    fs.existsSync(
      path.join(rootDir, `${FACTORY_DATA_DIR}/source-acquisition/${jobId}.json`)
    )
      ? {
          status: "completed",
          workerBranch: WAVE_WORKER_BRANCHES[jobId],
          workerCommit: WAVE_WORKER_COMMITS[jobId],
          completionCommit: COMPLETED_AUTHORITY_JOB_COMMITS.get(jobId)
        }
      : { status: "ready" };
  // A memo amendment closes when its own output landed, and stays closed when a
  // later amendment edits the same memo again.
  //
  // This compared the memo's current hash against this amendment's hash alone,
  // so the moment Ohio's marijuana amendment landed on top of the
  // automatic-sealing one, the earlier amendment stopped matching and reverted
  // to `ready`. Two active jobs then owned `OH.memo.json` and the whole plan
  // failed validation on the collision — an integrated amendment reopening
  // itself because a successor touched the same file, which is the disappearing
  // act the Colorado permission gate and the Maryland migration gate both had.
  //
  // The recorded states of a memo are ordered: original, amended, second
  // amended. An amendment is done once the file has reached its state, so it is
  // complete when the current hash is its own or any state recorded after it.
  // Reaching a later state is evidence the earlier one was passed through, not
  // evidence it never happened.
  const memoCompletionOf = (jobId, code, sha, workerBranch, workerCommit) =>
    memoHasReached(rootDir, code, sha)
      ? {
          status: "completed",
          workerBranch,
          workerCommit,
          completionCommit: MEMO_CORRECTION_COMPLETION_COMMITS[jobId]
        }
      : { status: "ready" };
  // A decision job closes on its committed decision record, exactly as an
  // authority job closes on its acquisition record. The record has to be on
  // disk; a completion commit alone asserts nothing.
  const decisionCompletionOf = (jobId, slug) =>
    DECISION_RECORD_COMPLETION_COMMITS[jobId] &&
    fs.existsSync(
      path.join(rootDir, `${FACTORY_DATA_DIR}/legal-design-decisions/${slug}.json`)
    )
      ? {
          status: "completed",
          workerBranch: WAVE_WORKER_BRANCHES[jobId],
          workerCommit: WAVE_WORKER_COMMITS[jobId],
          completionCommit: DECISION_RECORD_COMPLETION_COMMITS[jobId]
        }
      : { status: "ready" };
  const memoPath = (code) =>
    `data/record-clearing/legal-design-intake/${code}.memo.json`;
  const decisionPath = (slug) =>
    `${FACTORY_DATA_DIR}/legal-design-decisions/${slug}.json`;
  const acquisitionPath = (jobId) =>
    `${FACTORY_DATA_DIR}/source-acquisition/${jobId}.json`;
  const present = (relative) => fs.existsSync(path.join(rootDir, relative));
  // The corrected Oklahoma pleading module, identified by its exact blob.
  const okCustomPleadingModule = path.join(
    rootDir,
    "src/lib/rcap/packets/jurisdictions/oklahoma/custom-pleading.ts"
  );
  const okCustomPleadingCorrected =
    fs.existsSync(okCustomPleadingModule) &&
    sha256File(okCustomPleadingModule) === OK_CORRECTED_PLEADING_SHA256;

  // --- Oklahoma -------------------------------------------------------
  //
  // SB 2030 is enacted and in force. The memo still says the enrolled text
  // could not be obtained, and the guidance packet tells the participant so
  // four times while building a whole sheet on the premise that the eligible
  // set may have narrowed against them. It widened. Neither statement can be
  // corrected here: one is legal design, the other is participant-facing copy.
  const okDecision = decisionPath("ok-sb-2030-current-text-and-currency");
  if (present(okDecision)) {
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "OK",
      jobId: "rcap-ok-sb-2030-current-law-memo-correction",
      strategyFamily: "legal_design_normalization_amendment",
      trackIds: [],
      dependencies: [
        "rcap-ok-legal-design-normalization",
        "rcap-ok-sb-2030-current-text-and-currency"
      ],
      ...memoCompletionOf(
        "rcap-ok-sb-2030-current-law-memo-correction",
        "OK",
        "4e0380c9738cb9c9be3747e125990d79c483afc2c31a99ac29e638ad8c94c385",
        "rcap-factory/rcap-ok-sb-2030-current-law-memo-correction-394ecefb-0b09bdd2",
        "7d0f65327effc06ea42603aa7c1d312ee1b1bc48"
      ),
      expectedOutputs: [memoPath("OK")],
      ownedPaths: [memoPath("OK")],
      requiredInputs: [
        okDecision,
        memoPath("OK"),
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job " +
          "rcap-ok-sb-2030-current-law-memo-correction",
        "node scripts/verify-rcap-legal-design-intake.mjs"
      ],
      commitSubject:
        "feat(record-clearing): correct the Oklahoma memo to current law",
      stopCondition:
        "Bring ok_clean_slate and ok_osbi_portal onto the enacted text. Remove the statement " +
        "that the enrolled text and effective date could not be obtained; record Senate Bill " +
        "2030 as O.S.L. 2026, c. 282, effective 1 July 2026; represent 22 O.S. sections 18b " +
        "and 19d as the provisions that now carry eligibility and the automatic process, the " +
        "former section 18(C) route having been repealed; preserve the petition routes, which " +
        "section 19d(G) expressly keeps; distinguish statutory eligibility, which exists today, " +
        "from administration, which is not operating; record the 1 November 2026 portal " +
        "deadline, the 1 November 2027 automatic-process date and the 1 November 2029 " +
        "completion date; and remove the premise that the amendment narrowed the eligible set, " +
        "which it did not — it widened it. Correct the section 19 ten-year obliteration " +
        "citation from the stale subsection (N) treatment to subsection (L) only where the " +
        "decision establishes it, and record that the codified confirmation is still " +
        "outstanding. Preserve the appropriation, portal-procedure, rulemaking and codification " +
        "questions as residual questions rather than closing them. " +
        "Leave every unrelated Oklahoma track value-identical, do not change any output " +
        "strategy, do not declare any participant eligible, and keep runtime disabled. " +
        TERMINAL_INSTRUCTION
    });

    addJob({
      lane: "custom_pleading",
      jurisdiction: "OK",
      jobId: "rcap-ok-custom-pleading-sb-2030-citation-correction",
      strategyFamily: "custom_pleading_citation_correction",
      trackIds: [],
      dependencies: [
        "rcap-ok-sb-2030-current-text-and-currency",
        "rcap-ok-custom-pleading"
      ],
      // Closes on the corrected module blob being on disk, like every other
      // correction here, not on a commit asserting it.
      ...(okCustomPleadingCorrected
        ? {
            status: "completed",
            workerBranch:
              "rcap-factory/rcap-ok-custom-pleading-sb-2030-citation-correction-5783c7be-0fa7501a",
            workerCommit: "6a0fb848b623c9fefc660503ad0b8ffdca013755",
            completionCommit: "a9722b4e02bf611ea8304b3410601cb2a938d663"
          }
        : { status: "ready" }),
      expectedOutputs: [
        "src/lib/rcap/packets/jurisdictions/oklahoma/custom-pleading.ts",
        "scripts/verify-rcap-oklahoma-custom-pleading.mjs"
      ],
      ownedPaths: [
        "src/lib/rcap/packets/jurisdictions/oklahoma/custom-pleading.ts",
        "scripts/verify-rcap-oklahoma-custom-pleading.mjs"
      ],
      requiredInputs: [
        okDecision,
        memoPath("OK"),
        "src/lib/rcap/packets/jurisdictions/oklahoma/custom-pleading.ts"
      ],
      participantPacketProofRequired: true,
      regressionVerifier: "scripts/verify-rcap-oklahoma-custom-pleading.mjs",
      model: "opus",
      effort: "high",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job " +
          "rcap-ok-custom-pleading-sb-2030-citation-correction",
        "node scripts/verify-rcap-oklahoma-custom-pleading.mjs"
      ],
      commitSubject:
        "fix(record-clearing): correct the OK pleading SB 2030 citation",
      stopCondition:
        "Correct only the affected 22 O.S. section 19 obliteration citation and the verifier " +
        "assertions that depend on it, together with the typed screen and petition paragraph " +
        "that still say the enrolled text has not been read — it has. The screen itself should " +
        "survive: telling a participant to check before paying for a petition they may not need " +
        "is right, and only its stated reason changes. " +
        "The module was written not to depend on the paragraph numbering and that decision " +
        "stands: keep screening on the description of the category rather than on a paragraph " +
        "number, and keep asserting no waiting period. Preserve all packet text, eligibility " +
        "boundaries, fixtures, hashes and legal roles except where the citation correction " +
        "deterministically changes a rendered source line. Do not reopen the completed pleading " +
        "structure and do not restate a stale paragraph number as current. " +
        TERMINAL_INSTRUCTION
    });
  }

  // --- Ohio -----------------------------------------------------------
  //
  // The decision answers the build question, but the memo still names the node
  // after an unverified Senate Bill 288 claim and narrates an unconfirmed
  // secondary source. That text is legal design and cannot be corrected here.
  const ohDecision = decisionPath(
    "oh-automatic-sealing-current-law-reconciliation"
  );
  if (present(ohDecision)) {
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "OH",
      jobId: "rcap-oh-automatic-sealing-memo-correction",
      strategyFamily: "legal_design_normalization_amendment",
      trackIds: [],
      dependencies: [
        "rcap-oh-legal-design-normalization",
        "rcap-oh-automatic-sealing-current-law-reconciliation"
      ],
      ...memoCompletionOf(
        "rcap-oh-automatic-sealing-memo-correction",
        "OH",
        "1253b1a70ddd14a38992a11dd3943a6771b183a5fa95454edc0ebc6660409a21",
        "rcap-factory/rcap-oh-automatic-sealing-memo-correction-3fc6dd43-1ae3d74c",
        "0ae8a4adc132051c9f9a2154a152885dfd6576ea"
      ),
      expectedOutputs: [memoPath("OH")],
      ownedPaths: [memoPath("OH")],
      requiredInputs: [
        ohDecision,
        memoPath("OH"),
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "high",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job " +
          "rcap-oh-automatic-sealing-memo-correction",
        "node scripts/verify-rcap-legal-design-intake.mjs"
      ],
      commitSubject:
        "feat(record-clearing): settle the Ohio automatic-sealing node",
      stopCondition:
        "Turn oh_automatic_sealing from an open question into a settled negative. Drop the " +
        "'(Senate Bill 288, unverified)' parenthetical from the legal name, and replace the " +
        "account of the unconfirmed secondary source with the determination: current Ohio law " +
        "provides neither automatic sealing nor automatic expungement of an adult criminal " +
        "record; every adult route is begun by the person's application or by a prosecutor " +
        "motion under Ohio Rev. Code section 2953.39 and decided at the court's discretion; the " +
        "one automatic provision, section 2151.356, is juvenile and reaches no adult record. " +
        "The node stays deferred and unreachable at the memo's chosen blocker level, keeps " +
        "Ohio's eighteen slots and eighteen nodes, gains no components and no output strategy, " +
        "and is not deleted — it is the record of a question the product must be able to " +
        "answer. Do not create a relief mechanism that does not exist, do not broaden or narrow " +
        "the node, do not touch any other Ohio track, and keep runtime disabled. " +
        TERMINAL_INSTRUCTION
    });
  }

  // --- New York -------------------------------------------------------
  //
  // The source decision found the application is filed with the court of
  // conviction, one per court. The memo says it goes to the Office of Court
  // Administration and that nothing is filed in a court on either stage. A
  // packet built on that would send a person to the wrong place.
  const nyMrtaSource = decisionPath(
    "ny-mrta-destruction-request-source-identity-resolution"
  );
  if (present(nyMrtaSource)) {
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "NY",
      jobId: "rcap-ny-mrta-destruction-request-destination-memo-correction",
      strategyFamily: "legal_design_normalization_amendment",
      trackIds: [],
      dependencies: [
        "rcap-ny-legal-design-normalization",
        NY_MRTA_PACKET_CAPABILITY_JOB_ID,
        "rcap-ny-mrta-destruction-request-source-identity-resolution"
      ],
      ...memoCompletionOf(
        "rcap-ny-mrta-destruction-request-destination-memo-correction",
        "NY",
        "fcf1ac52c65f70db988f949fe4d95336781b024066ec7edc408641f627789c10",
        "rcap-factory/rcap-ny-mrta-destruction-request-destination-memo-correction-9f1b58d7-1dc16479",
        "37630009b7d46a28418dfad681e28272efb24011"
      ),
      expectedOutputs: [memoPath("NY")],
      ownedPaths: [memoPath("NY")],
      requiredInputs: [
        nyMrtaSource,
        memoPath("NY"),
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.packetSetManifests,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job " +
          "rcap-ny-mrta-destruction-request-destination-memo-correction",
        "node scripts/verify-rcap-legal-design-intake.mjs",
        "node scripts/verify-rcap-packet-capability-registry.mjs"
      ],
      commitSubject:
        "feat(record-clearing): correct the NY MRTA filing destination",
      stopCondition:
        "Correct where the destruction request goes and who signs it, and change nothing else. " +
        "Keep ny_mrta_marijuana as one sequential composed mechanism with automatic expungement " +
        "as unit 1 and the participant-signed destruction request as conditional unit 2. " +
        "Change unit 2's destination from the Office of Court Administration to the court of " +
        "conviction, and state that one application is required for each court of conviction. " +
        "Remove the statement that nothing is filed in a court on the destruction stage, while " +
        "preserving that no participant filing exists on the automatic stage. Distinguish the " +
        "participant's submission to the court from the court's later forwarding to the " +
        "prosecutor, law enforcement and DCJS — those are the court's acts, not the " +
        "participant's. Bind the exact current title, APPLICATION TO DESTROY EXPUNGED MARIHUANA " +
        "CONVICTION RECORD, and record March 2025 as document-metadata dating rather than a " +
        "printed issuer revision; the form carries no official form number. " +
        "Preserve the current form's defendant-only signature block, and preserve CPL section " +
        "160.50(5)(b)(i)'s designated-agent language as an unresolved form-implementation " +
        "question: the statute permits an agent and the current form provides no agent " +
        "signature line. LegalEase must not generate an agent-signature version while that is " +
        "open. Leave every unrelated New York track value-identical and keep runtime disabled. " +
        TERMINAL_INSTRUCTION
    });
  }

  // --- Colorado -------------------------------------------------------
  const coLicense = acquisitionPath("rcap-co-jdf-family-commercial-license");
  if (present(coLicense)) {
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "CO",
      jobId: "rcap-co-jdf-2370-2371-component-remap-memo-correction",
      strategyFamily: "legal_design_normalization_amendment",
      trackIds: [],
      dependencies: [
        "rcap-co-jdf-2370-role-and-jdf-2371-mapping-correction",
        "rcap-co-jdf-family-commercial-license"
      ],
      ...memoCompletionOf(
        "rcap-co-jdf-2370-2371-component-remap-memo-correction",
        "CO",
        "40b2ce6bd30ae7b2b92c384761165716b84bfe470c22cd93e7b2ef9e3da56a50",
        "rcap-factory/rcap-co-jdf-2370-2371-component-remap-memo-correction-719205bf-853907e5",
        "3942768cfd7c316272f4a3996365daeddad8b6f3"
      ),
      expectedOutputs: [memoPath("CO")],
      ownedPaths: [memoPath("CO")],
      requiredInputs: [
        acquisitionPath("rcap-co-jdf-2370-role-and-jdf-2371-mapping-correction"),
        coLicense,
        memoPath("CO"),
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.sourceRelationships
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "high",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job " +
          "rcap-co-jdf-2370-2371-component-remap-memo-correction",
        "node scripts/verify-rcap-legal-design-intake.mjs",
        "node scripts/verify-rcap-colorado-jdf-role-and-scope.mjs"
      ],
      commitSubject:
        "fix(record-clearing): remap the Colorado JDF primary filing",
      stopCondition:
        "Rebind one component. JDF 2370 is the issuer's guide and stays the track's " +
        "instructions asset; remove it from the affected primary_filing component, which it " +
        "cannot satisfy, and bind JDF 2371, the participant's motion, in its place. Preserve " +
        "statewide scope for both, and preserve JDF 2374 as the outside-party order where the " +
        "design already carries it. " +
        "Preserve the licence disposition exactly as adopted: written permission from the " +
        "Colorado Judicial Department is required before any participant-facing reproduction, " +
        "prefill or paid distribution, so make no participant-facing generation claim here and " +
        "do not read a corrected mapping as a cleared licence. Leave every unrelated Colorado " +
        "form mapping value-identical and keep runtime disabled. " +
        TERMINAL_INSTRUCTION
    });
  }

  // --- Louisiana ------------------------------------------------------
  const laStrategy = acquisitionPath(
    "rcap-la-arts-993-995-998-html-source-output-strategy-adjudication"
  );
  if (present(laStrategy)) {
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "LA",
      jobId: "rcap-la-arts-993-995-998-output-strategy-memo-correction",
      strategyFamily: "legal_design_normalization_amendment",
      trackIds: [],
      dependencies: [
        "rcap-la-public-official-download",
        "rcap-la-arts-993-995-998-html-source-output-strategy-adjudication"
      ],
      ...memoCompletionOf(
        "rcap-la-arts-993-995-998-output-strategy-memo-correction",
        "LA",
        "8d834f459d38b5c7fca9d2460aa9e1665d0339f50e22466b25b07d42dd504d10",
        "rcap-factory/rcap-la-arts-993-995-998-output-strategy-memo-correction-6c19814d-125d3ccb",
        "f42f75fbae4df78fe4a0879c9e84989e1d9df64c"
      ),
      expectedOutputs: [memoPath("LA")],
      ownedPaths: [memoPath("LA")],
      requiredInputs: [
        laStrategy,
        acquisitionPath("rcap-la-public-official-download"),
        memoPath("LA"),
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.sourceRelationships
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job " +
          "rcap-la-arts-993-995-998-output-strategy-memo-correction",
        "node scripts/verify-rcap-legal-design-intake.mjs"
      ],
      commitSubject:
        "feat(record-clearing): move the Louisiana articles to custom pleading",
      stopCondition:
        "Change six component output strategies from official_pdf_fill to custom_pleading: the " +
        "art. 993 continuation on la-976-arrest-no-conviction, la-977-misdemeanor-conviction, " +
        "la-978-felony-conviction and la-985-expungement-by-redaction; the art. 995 proposed " +
        "order on la-985-1-interim-expungement; and the art. 998 primary filing on " +
        "la-977d-marijuana-first-offense. There is no official PDF for any of them — the " +
        "Legislature publishes the controlling text as HTML — and process_guidance is wrong " +
        "because a participant submission exists. " +
        "Preserve each officialFormId as the authority and source identity where the schema " +
        "permits it; the document is still the authority even though the strategy changed. " +
        "Preserve each track-level mechanism, the exact statewide statutory text, and the " +
        "participant and outside-party roles: on art. 995 the judge signs, so every decretal " +
        "election, the granted or denied choice, the reasons-for-denial boxes, the date, the " +
        "place and the signature must stay blank. Preserve art. 986 statewide exclusivity, " +
        "under which the court name is the only authorized variation, and prohibit the local " +
        "Louisiana Supreme Court packet as a statewide substitute. Leave every unrelated " +
        "Louisiana track value-identical and keep runtime disabled. " +
        TERMINAL_INSTRUCTION
    });

    addJob({
      lane: "source_acquisition",
      jurisdiction: "LA",
      jobId: "rcap-la-arts-993-995-998-html-authority-asset-capture",
      strategyFamily: "public_official_download",
      reconciliationIds: ["asset:LA:ARTS-993-995-998:html-retention"],
      downloadedSourceCount: 0,
      dependencies: [
        "rcap-la-arts-993-995-998-html-source-output-strategy-adjudication"
      ],
      ...completionOf("rcap-la-arts-993-995-998-html-authority-asset-capture"),
      expectedOutputs: [
        acquisitionPath("rcap-la-arts-993-995-998-html-authority-asset-capture")
      ],
      requiredInputs: [
        laStrategy,
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.acquisitionDocuments
      ],
      model: "codex",
      effort: "xhigh",
      commitSubject:
        "chore(record-clearing): capture the Louisiana article HTML authority",
      stopCondition:
        "Capture the official HTML representations of C.Cr.P. arts. 993, 995 and 998 from the " +
        "Louisiana Legislature so Edition 1.3 can retain them as packet_form authority assets " +
        "under STATES/LA/02_PACKET_FORMS, exactly as their six siblings already are. Record for " +
        "each: the retrieval URL, the byte count, the SHA-256, the MIME type, the statutory " +
        "heading as official title, and the Acts-based revision — ACTS-2020-73 for art. 993, " +
        "ACTS-2014-145 for art. 995 and ACTS-2023-342 for art. 998. The digests must be " +
        "suitable for deterministic authority verification. " +
        "Do not convert the HTML to a PDF and do not present it as one, do not treat the " +
        "capture date SOURCE-2026-07-31 as an issuer revision, do not substitute the local " +
        "Louisiana Supreme Court packet, do not publish or amend an edition, and keep runtime " +
        "disabled. " +
        TERMINAL_INSTRUCTION
    });
  }

  // --- New York MRTA source materialization ---------------------------
  //
  // The bytes are not in doubt. The adopted edition holds this exact file at
  // 272,798 bytes and the digest the source decision measured, so the binary
  // ties to the retained asset with certainty.
  //
  // What is in doubt is everything the edition says about it. The identity
  // still disposition as unresolved in the source-assignment projection,
  // because the edition records the wrong title — dropping "Expunged" and
  // spelling "Marijuana" for the issuer's "Marihuana" — and REV-UNKNOWN for a
  // form whose edition is datable. Writing a receipt against that today would
  // mean minting an exact source contract the authority layer has not issued,
  // which is the one thing the materialization boundary exists to prevent. It
  // waits for the Edition 1.3 metadata correction, which needs no new bytes.
  if (present(nyMrtaSource)) {
    addJob({
      lane: "source_acquisition",
      jurisdiction: "NY",
      jobId: "rcap-ny-mrta-destruction-request-source-materialization",
      strategyFamily: "source_identity_resolution",
      reconciliationIds: [
        "materialization:NY:MRTA-DESTRUCTION-REQUEST:application"
      ],
      downloadedSourceCount: 0,
      // Not a dependency edge on the edition job: that job depends on every
      // authority job, so naming it here would close a cycle. The edition
      // prerequisite is a gate on doing the work, recorded in the stop
      // condition, and the status is pinned blocked rather than derived.
      dependencies: [
        "rcap-ny-mrta-destruction-request-source-identity-resolution"
      ],
      status: "blocked",
      executionNote:
        "Blocked on the Edition 1.3 metadata correction for " +
        "NY:MRTA-DESTRUCTION-REQUEST:APPLICATION:EN. The retained bytes are already the " +
        "issuer's current bytes; only the title, revision label, canonical path and issuer " +
        "metadata are wrong, and no new binary is required.",
      expectedOutputs: [
        acquisitionPath(
          "rcap-ny-mrta-destruction-request-source-materialization"
        )
      ],
      requiredInputs: [
        nyMrtaSource,
        FACTORY_INPUT_PATHS.authority,
        OFFICIAL_PDF_SOURCE_PROJECTION_PATH
      ],
      model: "codex",
      effort: "xhigh",
      commitSubject:
        "chore(record-clearing): materialize the NY MRTA destruction request",
      stopCondition:
        "Materialize NY:MRTA-DESTRUCTION-REQUEST:APPLICATION:EN through the portable authority " +
        "archive only, at the pinned identity: 272798 bytes, sha256 " +
        "55c8ec044ecd2adf30508b6a2403c690fc441419d6fba0ccc657eba182298544, application/pdf, " +
        "PDF 1.7, one page at 612 by 792 points, rotation 0, unencrypted, no XFA, clean " +
        "AcroForm. Verify the bytes and digest, verify the PDF structure, write the file at " +
        "mode 0444 under sealed 0555 directories, create the canonical receipt, then re-read " +
        "and re-hash the external copy. Do not commit the PDF. " +
        "Any field or ownership map keys on the 33 terminal field names, never on the 44 " +
        "widgets: seven fields carry more than one widget — the six-way court-type election and " +
        "six clerk Yes/No pairs — and keying on 44 writes eleven values twice. Of the 33, 25 " +
        "are participant-side; the six clerk-only fields and the two UI buttons are never " +
        "written. " +
        "Do not proceed while the Edition 1.3 metadata correction is outstanding. The edition " +
        "holds the right bytes under the wrong title and revision label, the identity still " +
        "disposition as unresolved in the source-assignment projection, and a receipt written " +
        "against that would assert an exact source contract the authority layer has not issued. " +
        "Do not create a completed official-PDF implementation, and do not enable runtime, " +
        "promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  // --- Hawaii ---------------------------------------------------------
  //
  // The HCJDC decision resolved stage two: one document, HCJDC 159(b), the
  // statewide Expungement Application. It resolved nothing about stage one,
  // and stage one is where the custom-pleading lane actually works — the
  // filing made in the sentencing court before any application reaches HCJDC.
  // The design does not say whether a statewide court form exists, whether a
  // motion or a petition is required, what must be alleged, how it is served,
  // what the eligibility standard is on four of the five tracks, whether
  // counts are limited, or how much discretion the court has. A pleading
  // cannot be drafted against that, and guessing would put an invented
  // vehicle in front of a participant.
  const hiHcjdcDecision = acquisitionPath(
    "rcap-hi-in-repo-identity-reconciliation-hcjdc-159"
  );
  if (present(hiHcjdcDecision)) {
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "HI",
      jobId:
        "rcap-hi-stage-one-expungement-filing-vehicle-current-law-reconciliation",
      strategyFamily: "legal_design_adjudication",
      trackIds: [],
      dependencies: ["rcap-hi-in-repo-identity-reconciliation-hcjdc-159"],
      ...decisionCompletionOf(
        "rcap-hi-stage-one-expungement-filing-vehicle-current-law-reconciliation",
        "hi-stage-one-expungement-filing-vehicle-current-law-reconciliation"
      ),
      expectedOutputs: [
        decisionPath(
          "hi-stage-one-expungement-filing-vehicle-current-law-reconciliation"
        )
      ],
      ownedPaths: [
        decisionPath(
          "hi-stage-one-expungement-filing-vehicle-current-law-reconciliation"
        )
      ],
      requiredInputs: [
        hiHcjdcDecision,
        memoPath("HI"),
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.packetSetManifests,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job " +
          "rcap-hi-stage-one-expungement-filing-vehicle-current-law-reconciliation"
      ],
      commitSubject:
        "docs(record-clearing): reconcile the Hawaii stage-one filing vehicle",
      stopCondition:
        "Establish, track by track for hi_first_time_drug_offender_expungement, " +
        "hi_first_time_property_offender_expungement, " +
        "hi_marijuana_three_grams_expungement, " +
        "hi_pre_2004_drug_offender_expungement and hi_under_21_dui_expungement: the governing " +
        "statute and its current text; who makes the stage-one filing; that the venue is the " +
        "sentencing court; whether the vehicle is a motion, a petition, an application or " +
        "something else; whether any official statewide court form exists; the required " +
        "allegations; the eligibility standard; any limit on counts; the extent of the court's " +
        "discretion; service; notice; any fee; how a proposed order is treated; the self-help " +
        "stops; and whether a controlled custom pleading is permitted at all. " +
        "Do not invent a filing vehicle, do not infer one from the shape of another state's " +
        "packet, and do not treat the HCJDC application as the stage-one filing — it is the " +
        "stage-two agency application and the decision that resolved it says nothing about " +
        "stage one. Own only the decision record: HI.memo.json is not yours. " +
        "Do not implement a packet, enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });

    // The memo needs both answers at once — the stage-one design and the
    // single stage-two identity — so it waits for the decision rather than
    // being corrected twice.
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "HI",
      jobId: "rcap-hi-expungement-stage-one-and-hcjdc-159b-memo-correction",
      strategyFamily: "legal_design_normalization_amendment",
      trackIds: [],
      dependencies: [
        "rcap-hi-in-repo-identity-reconciliation-hcjdc-159",
        "rcap-hi-stage-one-expungement-filing-vehicle-current-law-reconciliation",
        "rcap-hi-hcjdc-159b-technical-structure-and-edition-asset"
      ],
      // Ready when all three decisions it must reconcile are on disk: the
      // stage-one filing vehicle, the stage-two identity, and the measured
      // structure of the document that identity names. Read from the records
      // themselves so the gate lifts by itself and closes by itself.
      ...memoCompletionOf(
        "rcap-hi-expungement-stage-one-and-hcjdc-159b-memo-correction",
        "HI",
        "200088e191a176e48d3a53dc111a901728100aebdfe972eeabd426e3a96048fc",
        "rcap-factory/rcap-hi-expungement-stage-one-and-hcjdc-159b-memo-correction-00b6c384-14d358d0",
        "9f78550a01c86311ccfccd06841c398581e1e091"
      ),
      expectedOutputs: [memoPath("HI")],
      ownedPaths: [memoPath("HI")],
      requiredInputs: [
        hiHcjdcDecision,
        decisionPath(
          "hi-stage-one-expungement-filing-vehicle-current-law-reconciliation"
        ),
        acquisitionPath("rcap-hi-hcjdc-159b-technical-structure-and-edition-asset"),
        memoPath("HI"),
        FACTORY_INPUT_PATHS.normalizedTracks
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job " +
          "rcap-hi-expungement-stage-one-and-hcjdc-159b-memo-correction",
        "node scripts/verify-rcap-legal-design-intake.mjs"
      ],
      commitSubject:
        "feat(record-clearing): reconcile the Hawaii expungement design",
      stopCondition:
        "Reconcile both stages in one pass. Stage one: carry the filing vehicle, venue, " +
        "required allegations, eligibility standard, count limits, discretion, service, notice, " +
        "fee and proposed-order treatment the stage-one decision establishes, for all five " +
        "affected tracks. Stage two: represent one document, not two — HCJDC 159(b), " +
        "Expungement Application, issued by the Hawaii Criminal Justice Data Center at " +
        "revision 06/03/2026, statewide, a participant primary filing sent to HCJDC. The " +
        "11/15/2019 revision is superseded and may never be selected as current. " +
        "Do not begin before the stage-one decision is integrated, do not invent a stage-one " +
        "vehicle it did not establish, leave every unrelated Hawaii track value-identical, and " +
        "keep runtime disabled. " +
        TERMINAL_INSTRUCTION
    });
  }

  // Edition 1.3 must admit the Hawaii application before it can be
  // materialized, and a renderer for a zero-field flat PDF keys on page
  // geometry — which nobody has measured. The identity decision was barred
  // from opening the binary and said so rather than recording zeros.
  if (present(hiHcjdcDecision)) {
    addJob({
      lane: "source_acquisition",
      jurisdiction: "HI",
      jobId: "rcap-hi-hcjdc-159b-technical-structure-and-edition-asset",
      strategyFamily: "source_identity_resolution",
      reconciliationIds: ["structure:HI:HCJDC-159B:geometry-and-edition-asset"],
      downloadedSourceCount: 0,
      dependencies: ["rcap-hi-in-repo-identity-reconciliation-hcjdc-159"],
      ...completionOf("rcap-hi-hcjdc-159b-technical-structure-and-edition-asset"),
      expectedOutputs: [
        acquisitionPath("rcap-hi-hcjdc-159b-technical-structure-and-edition-asset")
      ],
      requiredInputs: [
        hiHcjdcDecision,
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.sourceArtifacts
      ],
      model: "codex",
      effort: "xhigh",
      commitSubject:
        "docs(record-clearing): measure the Hawaii HCJDC 159(b) structure",
      stopCondition:
        "Measure what the identity decision was barred from opening: the widget annotation " +
        "count, the page dimensions and the page rotation of HCJDC 159(b), at 181711 bytes and " +
        "sha256 1cb4f3acc20d569820379410c3aeb67c59fe3e24866932696371f25efaad935a. It is a flat " +
        "PDF with zero form fields, so there is no field map to build and a renderer for it " +
        "would be an overlay keyed on exactly that geometry. " +
        "Record the complete Edition 1.3 asset row the successor edition needs: canonical " +
        "identity HCJDC 159(b), title Expungement Application, issuer the Hawaii Criminal " +
        "Justice Data Center, revision REV-2026-06-03, participant primary filing, statewide " +
        "scope, byte count, digest, flat-PDF class, source URL, and the supersession of the " +
        "11/15/2019 revision. " +
        "Do not record an unmeasured value as zero, do not write a materialization receipt " +
        "before the edition admits the asset, do not publish or amend an edition, and do not " +
        "enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  // The stage-one decision established the vehicle, the venue, the allegations
  // and the eligibility standard, and left exactly one procedural question
  // where it found it: no statute imposes a stage-one fee, and clerk practice
  // was not conclusively established. That is its own finding and it is not
  // reopened here.
  //
  // A separate reading of HRS 607-4(a) and 607-5(a) reports that the district-
  // and circuit-court fee schedules exclude adult criminal cases outright,
  // which would close the question in the negative rather than leave it open.
  // That belongs to an owner, not to a captain commit amending someone else's
  // decision, so it gets a narrow addendum of its own that owns one new record
  // and touches nothing else.
  //
  // It is not a build blocker. A fee, or its absence, is participant-facing
  // copy and a filing instruction; it does not change what pleading is
  // generated, and the incumbent decision classifies it as a release blocker.
  // The Hawaii memo correction and the stage-one custom pleading do not wait
  // on it.
  if (
    present(
      decisionPath(
        "hi-stage-one-expungement-filing-vehicle-current-law-reconciliation"
      )
    )
  ) {
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "HI",
      jobId: "rcap-hi-stage-one-court-fee-addendum",
      strategyFamily: "legal_design_adjudication",
      trackIds: [],
      dependencies: [
        "rcap-hi-stage-one-expungement-filing-vehicle-current-law-reconciliation"
      ],
      ...decisionCompletionOf(
        "rcap-hi-stage-one-court-fee-addendum",
        "hi-stage-one-court-fee-addendum"
      ),
      expectedOutputs: [decisionPath("hi-stage-one-court-fee-addendum")],
      ownedPaths: [decisionPath("hi-stage-one-court-fee-addendum")],
      requiredInputs: [
        decisionPath(
          "hi-stage-one-expungement-filing-vehicle-current-law-reconciliation"
        ),
        memoPath("HI"),
        FACTORY_INPUT_PATHS.normalizedTracks
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "high",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job " +
          "rcap-hi-stage-one-court-fee-addendum"
      ],
      commitSubject:
        "docs(record-clearing): settle the Hawaii stage-one filing fee",
      executionNote:
        "Release-blocker copy, not a build blocker. The five stage-one pleadings are " +
        "specified and generable without this answer, and neither the Hawaii memo " +
        "correction nor rcap-hi-custom-pleading waits on it.",
      stopCondition:
        "Answer one question: whether a participant filing a stage-one expungement motion " +
        "under HRS 706-622.5, 706-622.8, 706-622.9 or 291E-64 pays a court filing fee. " +
        "Read HRS 607-4 and 607-5 in full, including subsection (a) of each and any exclusion " +
        "for criminal cases, from the Legislature's own publication; read the Judiciary's " +
        "published fee schedules for the district and circuit courts; and read Haw. R. Penal " +
        "P. Form B against the filings it is actually appended for. State whether a fee is " +
        "charged, waived, not charged, or unestablished, and say which of those the evidence " +
        "supports rather than choosing the convenient one. " +
        "Own only the addendum record. The stage-one decision is integrated and is not yours " +
        "to amend, contradict or restate: where you agree with it say so and cite it, and " +
        "where you disagree record the disagreement in your own record and stop. HI.memo.json " +
        "belongs to rcap-hi-expungement-stage-one-and-hcjdc-159b-memo-correction. " +
        "Do not implement a packet, enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  // --- Florida --------------------------------------------------------
  //
  // FL-RULE-3.989-CONTINUATION names nothing. Rule 3.989 has four forms and no
  // continuation page, and the Supreme Court of Florida has never promulgated
  // one. The component that carries it needs re-scoping, not another
  // acquisition attempt against a document that does not exist.
  const flContinuationDecision = acquisitionPath(
    "rcap-fl-source-identity-resolution-rule-3-989-continuation"
  );
  if (present(flContinuationDecision)) {
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "FL",
      jobId: "rcap-fl-rule-3-989-continuation-component-correction",
      strategyFamily: "legal_design_normalization_amendment",
      trackIds: [],
      dependencies: [
        "rcap-fl-source-identity-resolution-rule-3-989-continuation"
      ],
      ...memoCompletionOf(
        "rcap-fl-rule-3-989-continuation-component-correction",
        "FL",
        [
          // As this correction delivered it, and as the Rule 3.989(a) /
          // 3.9895(b) binding correction later left it.
          "25aa993019c36979db11363907d3c64700afab6e4964e7ad59a9c8a075b84239",
          "9b497440290abd5e254b3bd9e1ff6e5dda56abf4c2bfca63dc351090d76e4065"
        ],
        "rcap-factory/rcap-fl-rule-3-989-continuation-component-correction-d37ecf99-270be4d4",
        "074b07810b2905888b766c3475e9e072a7b11c05"
      ),
      expectedOutputs: [memoPath("FL")],
      ownedPaths: [memoPath("FL")],
      requiredInputs: [
        flContinuationDecision,
        memoPath("FL"),
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.sourceRelationships,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job " +
          "rcap-fl-rule-3-989-continuation-component-correction",
        "node scripts/verify-rcap-legal-design-intake.mjs"
      ],
      commitSubject:
        "fix(record-clearing): re-scope the Florida continuation component",
      stopCondition:
        "Take the affected track and component from the integrated decision rather than from " +
        "this instruction, and retire the FL-RULE-3.989-CONTINUATION identity, which names no " +
        "document. Preserve the relief mechanism and the node denominator: this is a re-scope, " +
        "not a deletion of a route. " +
        "Decide which of the two needs the component was carrying and represent it honestly. " +
        "Where the need is additional directly related arrests, express it through the " +
        "order-drafting requirement of sections 943.0585(4)(c) and 943.059(4)(c) — the " +
        "statute makes the order's own wording the operative mechanism — either by merging the " +
        "component into the existing proposed-order component or by making it a controlled " +
        "repeatable order-data requirement. Where the need is a local circuit cover sheet, " +
        "model it as local packet variation, which the track's geography record already " +
        "contemplates. " +
        "Do not create a second official form, do not create a local-form dependency, do not " +
        "convert rule text into an official PDF, and do not invent a continuation page. Keep " +
        "FDLE Form 40-021 separate: it is a pre-court agency application, not a court form. " +
        "Leave unrelated Florida tracks value-identical and keep runtime disabled. " +
        TERMINAL_INSTRUCTION
    });

    // Rule 3.989(a) is titled Sworn Statement and has been since SC19-1983.
    // The retained identity still says Affidavit, which may be nothing worse
    // than stale metadata — but that is a question, not an assumption.
    addJob({
      lane: "source_acquisition",
      jurisdiction: "FL",
      jobId: "rcap-fl-rule-3-989-sworn-statement-identity-currentness",
      strategyFamily: "source_identity_resolution",
      reconciliationIds: ["identity:FL:FL-RULE-3.989-AFFIDAVIT:sworn-statement"],
      downloadedSourceCount: 0,
      dependencies: [
        "rcap-fl-source-identity-resolution-rule-3-989-continuation"
      ],
      ...completionOf("rcap-fl-rule-3-989-sworn-statement-identity-currentness"),
      expectedOutputs: [
        acquisitionPath("rcap-fl-rule-3-989-sworn-statement-identity-currentness")
      ],
      requiredInputs: [
        flContinuationDecision,
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.sourceArtifacts
      ],
      model: "opus",
      effort: "high",
      commitSubject:
        "docs(record-clearing): resolve the FL Rule 3.989(a) identity",
      stopCondition:
        "Determine whether FL-RULE-3.989-AFFIDAVIT is stale. Rule 3.989(a) is titled Sworn " +
        "Statement and has been since SC19-1983; the retained identity still says Affidavit. " +
        "Establish the exact current identity, official title, participant-facing role and " +
        "effective date, whether the Affidavit label is merely stale metadata on the same " +
        "instrument or names something the rule no longer contains, the affected Florida " +
        "tracks and components, and the Edition 1.3 effect. " +
        "Do not alter the identity without this answer, do not invent a second form, and do " +
        "not enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  // The currentness decision answered two things at once. Rule 3.989(a) has
  // been titled "Sworn Statement in Support of Petition" since SC19-1983 and
  // the retained identity still says Affidavit, which is stale metadata on the
  // same instrument — fl-expunction-affidavit-3 and fl-sealing-affidavit-3 are
  // naming corrections and nothing more. fl-trafficking-affidavit-2 is not:
  // the same 2019 opinion moved the human-trafficking forms out of Rule 3.989
  // into Rule 3.9895, and that component's own legal basis is
  // section 943.0583, so it is bound to the wrong rule and needs
  // Rule 3.9895(b). One memo, one owner, one correction.
  if (
    present(
      acquisitionPath("rcap-fl-rule-3-989-sworn-statement-identity-currentness")
    )
  ) {
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "FL",
      jobId: "rcap-fl-rule-3-989-sworn-statement-and-3-9895-memo-correction",
      strategyFamily: "legal_design_normalization_amendment",
      trackIds: [],
      dependencies: [
        "rcap-fl-rule-3-989-sworn-statement-identity-currentness",
        "rcap-fl-rule-3-989-continuation-component-correction"
      ],
      ...memoCompletionOf(
        "rcap-fl-rule-3-989-sworn-statement-and-3-9895-memo-correction",
        "FL",
        "9b497440290abd5e254b3bd9e1ff6e5dda56abf4c2bfca63dc351090d76e4065",
        "rcap-factory/rcap-fl-rule-3-989-sworn-statement-and-3-9895-memo-correction-9a3f041c-15352e94",
        "b99a78921510e1c56a2fa05e728dabefa19ccdcd"
      ),
      expectedOutputs: [memoPath("FL")],
      ownedPaths: [memoPath("FL")],
      requiredInputs: [
        acquisitionPath(
          "rcap-fl-rule-3-989-sworn-statement-identity-currentness"
        ),
        memoPath("FL"),
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.sourceRelationships,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job " +
          "rcap-fl-rule-3-989-sworn-statement-and-3-9895-memo-correction",
        "node scripts/verify-rcap-legal-design-intake.mjs"
      ],
      commitSubject:
        "fix(record-clearing): correct the Florida sworn-statement bindings",
      executionNote:
        "Three components, two defects. fl-expunction-affidavit-3 and " +
        "fl-sealing-affidavit-3 carry a stale title on the right instrument. " +
        "fl-trafficking-affidavit-2 carries the wrong rule.",
      stopCondition:
        "Take the affected components, their defects and the correct instruments from the " +
        "integrated decision rather than from this instruction. Rule 3.989(a) is titled " +
        "\"Sworn Statement in Support of Petition\" and the instrument is printed inside the " +
        "rule, so the authority is rule text and there is no standalone official binary to " +
        "acquire. Bind fl-trafficking-affidavit-2 to Fla. R. Crim. P. 3.9895(b), \"Sworn " +
        "Statement in Support of Petition; Human Trafficking Victim.\", which implements " +
        "section 943.0583, Fla. Stat. and whose averments are not Rule 3.989(a)'s. " +
        "Do not invent a form number, do not create a standalone PDF identity for rule text, " +
        "do not create a second component for either instrument, and do not reopen the " +
        "retired continuation, which is already corrected. Leave every unrelated Florida " +
        "route value-identical and keep runtime disabled. " +
        TERMINAL_INSTRUCTION
    });
  }

  // --- Illinois --------------------------------------------------------
  //
  // Rule 298 is the procedure for a civil fee-waiver application, not the
  // application. The rule itself directs the applicant to a separately
  // approved form, and the repository already retains exactly that form —
  // the FW-CIV Application, ATJ 601.9 (08/25), at the correct digest under
  // the correct workflow key. Nine components are bound to the rule number
  // instead of to the document. The bytes are right; the mapping is wrong.
  if (
    present(
      acquisitionPath("rcap-il-in-repo-identity-reconciliation-rule-298")
    )
  ) {
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "IL",
      jobId: "rcap-il-rule-298-fw-civ-component-remap-memo-correction",
      strategyFamily: "legal_design_normalization_amendment",
      trackIds: [],
      dependencies: ["rcap-il-in-repo-identity-reconciliation-rule-298"],
      ...memoCompletionOf(
        "rcap-il-rule-298-fw-civ-component-remap-memo-correction",
        "IL",
        "fc64a4b6bb182a3f77091613809b140c9f600c3512c2670ee5d2447498114106",
        "rcap-factory/rcap-il-rule-298-fw-civ-component-remap-memo-correction-cffec689-888d2c32",
        "10d2b958acbf75a9038dfc39dc41cc0c1525164a"
      ),
      expectedOutputs: [memoPath("IL")],
      ownedPaths: [memoPath("IL")],
      requiredInputs: [
        acquisitionPath("rcap-il-in-repo-identity-reconciliation-rule-298"),
        memoPath("IL"),
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.sourceRelationships,
        FACTORY_INPUT_PATHS.sourceArtifacts
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job " +
          "rcap-il-rule-298-fw-civ-component-remap-memo-correction",
        "node scripts/verify-rcap-legal-design-intake.mjs"
      ],
      commitSubject:
        "fix(record-clearing): remap the Illinois fee-waiver components",
      executionNote:
        "Nine components across nine tracks, taken from the integrated decision. The " +
        "fee_waiver role is correct on all nine and does not change. No new bytes are " +
        "needed: the retained binary is already the right one at 1,051,549 bytes, sha256 " +
        "b2da395f…, PDF 1.6, 4 pages, AcroForm, no XFA, 121 terminal fields, 130 widgets.",
      stopCondition:
        "Rebind the nine affected components from the Rule 298 identity to the participant " +
        "form the rule points at: the FW-CIV Application, ATJ 601.9 (08/25), \"Application " +
        "for Waiver of Court Fees (Civil)\". Take the components and their track ids from " +
        "the integrated decision. Ill. S. Ct. R. 298 stays recorded as procedural authority; " +
        "it is not a participant form and may not be bound as one. " +
        "Do not substitute the attorney certification, the instructions, the order, the " +
        "appellate suite, the supreme-court suite or the criminal fee-waiver suite — each is " +
        "a different document with a different role. Do not acquire, materialize or " +
        "re-digest anything: the exact asset and its bytes are already retained and are " +
        "preserved unchanged. Leave every unrelated Illinois route value-identical and keep " +
        "runtime disabled. " +
        TERMINAL_INSTRUCTION
    });
  }

  // --- Louisiana implementation ---------------------------------------
  //
  // The six corrected components need a pleading, and it is one job: the same
  // three articles, the same statutory text, the same court-name-only
  // variation. Splitting it per track would author the same sheet six times.
  const laMemoCorrected = memoCorrected(
    "LA",
    "8d834f459d38b5c7fca9d2460aa9e1665d0339f50e22466b25b07d42dd504d10"
  );
  if (laMemoCorrected) {
    addJob({
      lane: "custom_pleading",
      jurisdiction: "LA",
      jobId: "rcap-la-arts-993-995-998-custom-pleading",
      strategyFamily: "custom_pleading",
      trackIds: [
        "la-976-arrest-no-conviction",
        "la-977-misdemeanor-conviction",
        "la-977d-marijuana-first-offense",
        "la-978-felony-conviction",
        "la-985-1-interim-expungement",
        "la-985-expungement-by-redaction"
      ],
      dependencies: [
        "rcap-la-arts-993-995-998-output-strategy-memo-correction",
        "rcap-la-arts-993-995-998-html-authority-asset-capture",
        "rcap-nationwide-master-library-edition-1-3-publication"
      ],
      expectedOutputs: [
        "src/lib/rcap/packets/jurisdictions/louisiana/arts-993-995-998-custom-pleading.ts",
        "scripts/verify-rcap-louisiana-arts-993-995-998-custom-pleading.mjs"
      ],
      ownedPaths: [
        "src/lib/rcap/packets/jurisdictions/louisiana/arts-993-995-998-custom-pleading.ts",
        "scripts/verify-rcap-louisiana-arts-993-995-998-custom-pleading.mjs"
      ],
      requiredInputs: [
        acquisitionPath("rcap-la-arts-993-995-998-html-authority-asset-capture"),
        acquisitionPath(
          "rcap-la-arts-993-995-998-html-source-output-strategy-adjudication"
        ),
        memoPath("LA"),
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.packetSetManifests
      ],
      participantPacketProofRequired: true,
      regressionVerifier:
        "scripts/verify-rcap-louisiana-arts-993-995-998-custom-pleading.mjs",
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job " +
          "rcap-la-arts-993-995-998-custom-pleading",
        "node scripts/verify-rcap-louisiana-arts-993-995-998-custom-pleading.mjs"
      ],
      commitSubject:
        "feat(record-clearing): implement the Louisiana article pleadings",
      executionNote:
        "Six components across six tracks: the Article 993 continuation on four tracks, the " +
        "Article 995 proposed order on la-985-1-interim-expungement, and the Article 998 " +
        "primary filing on la-977d-marijuana-first-offense. Every genuine official-PDF sibling " +
        "component on these same tracks stays in the official-PDF lane and is not yours.",
      stopCondition:
        "Generate controlled custom pleadings from the exact statewide statutory wording " +
        "captured from the Legislature's own HTML — not paraphrase, and not the local " +
        "Louisiana Supreme Court packet, which Article 986 excludes as a statewide substitute. " +
        "Article 986 permits the court name to vary and nothing else. " +
        "Keep Article 993 as one sheet with its three Yes/No sections; the packet's " +
        "three-variant split is a rendering convention and the wrong model. Fix the repeating " +
        "charge capacity at authoring time and stop when a participant exceeds it — never drop " +
        "a charge silently. On the Article 995 proposed order the judge signs: every decretal " +
        "election, the granted or denied choice, the reasons-for-denial boxes, the date, the " +
        "place and the signature render blank, and no participant signature label appears on " +
        "it. Carry both statutory signature blocks Article 998 prints. " +
        "Nothing generated may be presented as an official PDF; there is none. Keep runtime " +
        "disabled and produce the participant packet proof the lane requires. " +
        TERMINAL_INSTRUCTION
    });
  }

  // --- Nevada ---------------------------------------------------------
  //
  // The Nevada guidance worker stopped rather than guessing, and it was right
  // to: the design does not establish whether these routes are automatic, what
  // the participant must file, or what the output strategy is. A guidance
  // worker cannot answer that from a packet.
  addJob({
    lane: "legal_design_normalization",
    jurisdiction: "NV",
    jobId: "rcap-nv-sealing-mechanism-and-packet-capability-correction",
    strategyFamily: "legal_design_normalization_amendment",
    trackIds: [],
    dependencies: [],
    ...memoCompletionOf(
      "rcap-nv-sealing-mechanism-and-packet-capability-correction",
      "NV",
      "113a9728c08487ad09184fdd045da4d19b532adcca2b083059dbb24e1c84c3f5",
      "rcap-factory/rcap-nv-sealing-mechanism-and-packet-capability-correction-d31659df-64b640c3",
      "9ef2c869faeee51b85cbaca960ef98d155c35eac"
    ),
    expectedOutputs: [memoPath("NV")],
    ownedPaths: [memoPath("NV")],
    requiredInputs: [
      memoPath("NV"),
      FACTORY_INPUT_PATHS.normalizedTracks,
      FACTORY_INPUT_PATHS.packetSetManifests,
      FACTORY_INPUT_PATHS.blockerLedger
    ],
    participantPacketProofRequired: false,
    model: "opus",
    effort: "xhigh",
    focusedValidation: [
      "node scripts/rcap-factory-plan.mjs --check-job " +
        "rcap-nv-sealing-mechanism-and-packet-capability-correction",
      "node scripts/verify-rcap-legal-design-intake.mjs"
    ],
    commitSubject:
      "feat(record-clearing): settle the Nevada sealing mechanism",
    stopCondition:
      "Establish, for nv_repository_removal, nv_seal_deferred and nv_seal_probation_family, " +
      "what the current Nevada statutes actually provide: whether each route operates " +
      "automatically or on the participant's application, the governing mechanism, whether a " +
      "participant filing exists and what it is, the output strategy that follows, the " +
      "exclusions, the waiting periods, any notice requirement and any fee. " +
      "The guidance worker stopped because none of that is established, and stopping was " +
      "correct — do not resolve it by inferring a mechanism from the shape of a packet. " +
      "Resolve only the affected Nevada tracks, leave every unrelated Nevada track " +
      "value-identical, and keep runtime disabled. " +
      TERMINAL_INSTRUCTION
  });
}

function addIntegratedAuthorityDecisionOwners({ addJob, rootDir }) {
  // These close on their committed decision record, like every other authority
  // job, and carry the worker branch and commit that produced it.
  const decided = (jobId) =>
    fs.existsSync(
      path.join(
        rootDir,
        `${FACTORY_DATA_DIR}/source-acquisition/${jobId}.json`
      )
    );
  const completion = (jobId) =>
    decided(jobId) && COMPLETED_AUTHORITY_JOB_COMMITS.has(jobId)
      ? {
          status: "completed",
          workerBranch: WAVE_WORKER_BRANCHES[jobId],
          workerCommit: WAVE_WORKER_COMMITS[jobId],
          completionCommit: COMPLETED_AUTHORITY_JOB_COMMITS.get(jobId)
        }
      : { status: "ready" };

  // --- Colorado --------------------------------------------------------
  //
  // The decision confirmed JDF 2371's identity and bytes but recorded the
  // licence as unresolved and outside its assignment. Public availability of
  // the JDF series is not permission to reproduce it in a paid packet, and no
  // Colorado licence owner exists anywhere in the plan.
  addJob({
    lane: "source_acquisition",
    jurisdiction: "CO",
    jobId: "rcap-co-jdf-family-commercial-license",
    strategyFamily: "commercial_license",
    reconciliationIds: ["license:CO:JDF-FAMILY:commercial-use"],
    downloadedSourceCount: 0,
    dependencies: ["rcap-co-jdf-2370-role-and-jdf-2371-mapping-correction"],
    ...completion("rcap-co-jdf-family-commercial-license"),
    expectedOutputs: [
      `${FACTORY_DATA_DIR}/source-acquisition/rcap-co-jdf-family-commercial-license.json`
    ],
    requiredInputs: [
      `${FACTORY_DATA_DIR}/source-acquisition/rcap-co-jdf-2370-role-and-jdf-2371-mapping-correction.json`,
      FACTORY_INPUT_PATHS.authority,
      FACTORY_INPUT_PATHS.acquisitionDocuments
    ],
    model: "opus",
    effort: "xhigh",
    commitSubject:
      "docs(record-clearing): determine the Colorado JDF commercial licence",
    stopCondition:
      "Determine whether LegalEase may reproduce Colorado Judicial Department forms — JDF 2370, " +
      "2371 and 2374 — inside a paid participant packet, and on what terms. Establish the " +
      "publisher's licensing and commercial-use terms from the issuer's own statement. " +
      "Public download availability is not permission and may not be treated as a licence. " +
      "Record an exact terminal disposition: permitted, permitted subject to conditions, " +
      "prohibited, or unresolved with the exact question outstanding. " +
      "Do not download a binary, materialize a source, write a receipt, mutate Edition 1.2, " +
      "publish an edition, implement a renderer, enable runtime, promote, or deploy. " +
      TERMINAL_INSTRUCTION
  });

  // The bytes are retained by the adopted edition, but no receipt exists and
  // the identity is absent from the materialized source root. Materialization
  // is gated on the licence: an unresolved licence is not permission to
  // reproduce.
  //
  // That gate used to be a hard-coded `blocked`, with the reason written only
  // in this comment. It was accurate while Colorado's answer was no, and it
  // silently became wrong the moment the answer changed — the licence cleared
  // and the job it had been holding stayed shut, for no reason a reader could
  // see. Derive it instead, so the gate opens when its stated condition is met
  // and closes when it is not.
  const coloradoGeneration = authorizationFor(
    buildSourceAuthorizationIndex(rootDir),
    { jurisdiction: "CO" }
  );
  addJob({
    lane: "source_acquisition",
    jurisdiction: "CO",
    jobId: "rcap-co-jdf-2371-source-materialization",
    strategyFamily: "source_identity_resolution",
    reconciliationIds: ["materialization:CO:JDF-2371:motion"],
    downloadedSourceCount: 0,
    dependencies: [
      "rcap-co-jdf-2370-role-and-jdf-2371-mapping-correction",
      "rcap-co-jdf-family-commercial-license"
    ],
    status: fs.existsSync(
      path.join(
        rootDir,
        `${FACTORY_DATA_DIR}/source-acquisition/rcap-co-jdf-2371-source-materialization.json`
      )
    )
      ? "completed"
      : coloradoGeneration.generationAllowed
        ? "ready"
        : "blocked",
    expectedOutputs: [
      `${FACTORY_DATA_DIR}/source-acquisition/rcap-co-jdf-2371-source-materialization.json`
    ],
    requiredInputs: [
      `${FACTORY_DATA_DIR}/source-acquisition/rcap-co-jdf-2370-role-and-jdf-2371-mapping-correction.json`,
      FACTORY_INPUT_PATHS.authority,
      OFFICIAL_PDF_SOURCE_PROJECTION_PATH
    ],
    model: "codex",
    effort: "xhigh",
    commitSubject:
      "chore(record-clearing): materialize the Colorado JDF-2371 motion",
    stopCondition:
      "Materialize CO:JDF-2371:MOTION:EN through the portable authority archive only, at the " +
      "pinned identity: 669287 bytes, sha256 " +
      "642558b85e3f3df8c15808369685bbe56398523c7794b6a949d20fd7b4f8b6d6, revision REV-2025-07-01, " +
      "statewide scope, role MOTION. On materialization, measure and record the page count, the " +
      "terminal-field names and the widget count, which have never been measured; a field or " +
      "ownership map must key on re-inspected terminal field names, never on the logical field " +
      "count 51. Do not record an unmeasured value as zero. " +
      "Do not proceed while the Colorado licence is unresolved, do not copy from the private " +
      "corpus, do not materialize from a repository-only capture, do not alter the bytes, and do " +
      "not enable runtime, promote, or deploy. " +
      TERMINAL_INSTRUCTION
  });

  // --- Minnesota -------------------------------------------------------
  //
  // The official channel answers automation with a Cloudflare managed
  // challenge: HTTP 403 carrying `cf-mitigated: challenge`, on the site root
  // and on the forms index alike. That is a block, not a missing document.
  // All five identities are already retained, so nothing here is unidentified
  // and no Edition amendment is owed for these rows. What is unverified is
  // currentness: whether the retained bytes are still the issuer's current
  // revision. One owner answers that by comparison, and the family stays
  // blocked until the comparison integrates.
  const mnBlockedDecision = path.join(
    rootDir,
    `${FACTORY_DATA_DIR}/source-acquisition/rcap-mn-official-download-automation-blocked.json`
  );
  if (fs.existsSync(mnBlockedDecision)) {
    addJob({
      lane: "source_acquisition",
      jurisdiction: "MN",
      jobId: "rcap-mn-attended-retrieval-currentness-comparison",
      strategyFamily: "official_download_automation_blocked",
      reconciliationIds: ["retrieval:MN:exp101-exp102-exp104-exp105-exp106"],
      downloadedSourceCount: 0,
      dependencies: ["rcap-mn-official-download-automation-blocked"],
      status: attendedRetrievalStatus(
        rootDir,
        `${FACTORY_DATA_DIR}/source-acquisition/rcap-mn-attended-retrieval-currentness-comparison.json`
      ),
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/source-acquisition/rcap-mn-attended-retrieval-currentness-comparison.json`
      ],
      requiredInputs: [
        `${FACTORY_DATA_DIR}/source-acquisition/rcap-mn-official-download-automation-blocked.json`,
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.sourceArtifacts,
        FACTORY_INPUT_PATHS.acquisitionDocuments
      ],
      model: "codex",
      effort: "xhigh",
      commitSubject:
        "chore(record-clearing): compare the Minnesota forms under attended access",
      executionNote:
        "EXP101, EXP102, EXP104, EXP105 and EXP106 are all retained. Identity is not the " +
        "question and none of them may be relabelled missing. The question is currentness.",
      stopCondition:
        "Retrieve the five current official Minnesota expungement documents — EXP101, EXP102, " +
        "EXP104, EXP105 and EXP106 — through a legitimate human-in-browser session on the " +
        "Judicial Branch's own site, and record for each the exact byte count, SHA-256, MIME " +
        "type, page count, structural class, source URL and the revision block read from the " +
        "form face. Then compare each against the retained corpus and state, per document, " +
        "whether the retained bytes are current, superseded, or cannot be determined. " +
        "The HTTP 403 is a Cloudflare managed challenge and is a block, not evidence that a " +
        "document is absent. Do not evade the challenge, do not spoof a user agent, do not " +
        "solve or replay a challenge token, do not retrieve through a mirror, a cache, a " +
        "scraper service or any route the issuer does not offer, and do not share or reuse " +
        "credentials or session cookies. " +
        "Do not relabel any of the five retained assets as missing, do not create a source " +
        "receipt from the blocked live channel, and do not stamp a retrieved revision onto " +
        "held bytes. EXP105 and EXP106 are separate orders for separate statutory routes and " +
        "must not be merged. " +
        "Do not amend or publish an edition, choose a renderer, enable runtime, promote, or " +
        "deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  // --- Kansas ----------------------------------------------------------
  //
  // Kansas has two independent gates and they are constantly confused for one
  // another, because both look like "the forms are not usable yet".
  //
  // The licence gate is the Council's commercial-use term. The currentness gate
  // is whether the nine recorded revisions are still the Council's current
  // revisions — unanswerable by machine, because the Legal Forms pages return
  // HTTP 403 behind an Akamai perimeter, and three of the nine date from 2013
  // and 2016.
  //
  // A grant of permission would answer the first and would not touch the second.
  // Permission to reproduce a revision does not make that revision current, and
  // a packet built on a superseded form is wrong whoever authorized it. So this
  // owner exists whatever the licence does, and it is deliberately not dependent
  // on the permission record.
  const ksCommercialLicense = path.join(
    rootDir,
    `${FACTORY_DATA_DIR}/source-acquisition/rcap-ks-commercial-license.json`
  );
  if (fs.existsSync(ksCommercialLicense)) {
    addJob({
      lane: "source_acquisition",
      jurisdiction: "KS",
      jobId: "rcap-ks-form-currentness-verification",
      strategyFamily: "official_download_automation_blocked",
      reconciliationIds: ["currentness:KS:judicial-council-record-clearing-forms"],
      downloadedSourceCount: 0,
      dependencies: [],
      status: attendedRetrievalStatus(
        rootDir,
        `${FACTORY_DATA_DIR}/source-acquisition/rcap-ks-form-currentness-verification.json`
      ),
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/source-acquisition/rcap-ks-form-currentness-verification.json`
      ],
      ownedPaths: [
        `${FACTORY_DATA_DIR}/source-acquisition/rcap-ks-form-currentness-verification.json`
      ],
      requiredInputs: [
        `${FACTORY_DATA_DIR}/source-acquisition/rcap-ks-commercial-license.json`,
        `${FACTORY_DATA_DIR}/source-acquisition/rcap-ks-written-permission-authorization.json`,
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.sourceArtifacts,
        FACTORY_INPUT_PATHS.acquisitionDocuments
      ],
      participantPacketProofRequired: false,
      model: "codex",
      effort: "xhigh",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-ks-form-currentness-verification"
      ],
      commitSubject:
        "chore(record-clearing): verify the Kansas Judicial Council form revisions",
      executionNote:
        "Currentness only. This job does not ask whether Kansas permits reproduction and its " +
        "answer does not depend on the answer to that question.",
      stopCondition:
        "For each of the nine Kansas Judicial Council record-clearing documents recorded in " +
        "the excluded set of rcap-ks-commercial-license, determine from the Council's own " +
        "current publication: the current official title, the current form number, the current " +
        "printed revision as read from the form face, whether the retained bytes are that " +
        "revision, whether a successor revision exists, and — if a permission document is " +
        "later evidenced — whether that permission covers the successor revision. " +
        "Record each of the six answers separately per document. \"Still current\" and \"could " +
        "not be determined\" are different findings and the second is acceptable; asserting " +
        "the first without seeing the form face is not. " +
        "The HTTP 403 is an Akamai perimeter and is a block, not evidence that a document is " +
        "absent or that a revision is current. Do not evade the perimeter, do not spoof a user " +
        "agent, do not retrieve through a mirror, a cache, a scraper service or any route the " +
        "issuer does not offer. Retrieve through a legitimate human-in-browser session or " +
        "record that you could not. " +
        "Permission is not currentness. Do not infer that a granted permission makes the " +
        "revision it names current, do not stamp a retrieved revision onto held bytes, and do " +
        "not relabel a retained asset missing. If a permission letter itself reproduces a form " +
        "or names its revision, that evidence counts only so far as it goes to currentness. " +
        "Do not adopt a licence, do not set generationAllowed, do not create a source receipt " +
        "from a blocked channel, do not amend or publish an edition, do not enable runtime, " +
        "promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  // Reinstating the six Kansas routes the licence exclusion closed.
  //
  // `rcap-ks-commercial-license` excluded nine documents and six tracks as
  // terminal, and stated its own reopening condition: express permission from
  // the Council, adopted as a licence, at which point the nine acquisition keys
  // reopen. That condition is now met by the project-owner attestation.
  //
  // Nothing in the factory acted on it. A terminal disposition is terminal until
  // something reconsiders it, and no job reconsidered this one — the routes would
  // have sat excluded forever with the reason for their exclusion no longer true.
  // That is the shut-gate pattern, in its most consequential form yet: six routes
  // in a jurisdiction the product could now serve.
  //
  // It waits on currentness, and only on currentness. Reinstating a route onto a
  // revision nobody has confirmed would rebuild the packet on a form that may be
  // superseded, and permission to reproduce a 2013 revision says nothing about
  // whether the Council still publishes it.
  const ksPermission = path.join(
    rootDir,
    `${FACTORY_DATA_DIR}/source-acquisition/rcap-ks-project-owner-permission-authorization.json`
  );
  const ksCurrentness = path.join(
    rootDir,
    `${FACTORY_DATA_DIR}/source-acquisition/rcap-ks-form-currentness-verification.json`
  );
  if (fs.existsSync(ksPermission)) {
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: "KS",
      jobId: "rcap-ks-excluded-route-reinstatement",
      strategyFamily: "legal_design_adjudication",
      trackIds: [],
      dependencies: ["rcap-ks-form-currentness-verification"],
      ...decisionRecordCompletion(rootDir, "ks-excluded-route-reinstatement", {
        workerBranch: WAVE_WORKER_BRANCHES["rcap-ks-excluded-route-reinstatement"],
        workerCommit: WAVE_WORKER_COMMITS["rcap-ks-excluded-route-reinstatement"],
        completionCommit:
          DECISION_RECORD_COMPLETION_COMMITS["rcap-ks-excluded-route-reinstatement"]
      }),
      ...(fs.existsSync(ksCurrentness) ? {} : { status: "blocked" }),
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/ks-excluded-route-reinstatement.json`
      ],
      ownedPaths: [
        `${FACTORY_DATA_DIR}/legal-design-decisions/ks-excluded-route-reinstatement.json`
      ],
      requiredInputs: [
        `${FACTORY_DATA_DIR}/source-acquisition/rcap-ks-commercial-license.json`,
        `${FACTORY_DATA_DIR}/source-acquisition/rcap-ks-project-owner-permission-authorization.json`,
        "data/record-clearing/legal-design-intake/KS.memo.json",
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.packetSetManifests,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      participantPacketProofRequired: false,
      model: "opus",
      effort: "xhigh",
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-ks-excluded-route-reinstatement"
      ],
      commitSubject:
        "docs(record-clearing): reinstate the Kansas routes the licence closed",
      executionNote:
        "The licence exclusion that closed these six routes has been superseded by an adopted " +
        "permission. This job decides what that means for each route. It owns a decision " +
        "record only and implements nothing.",
      stopCondition:
        "For each of the six Kansas tracks the exclusion closed — ks-21-6614-conviction, " +
        "ks-21-6614-diversion, ks-21-6614-prostitution-coercion, ks-21-6614-specialty-court, " +
        "ks-22-2410-arrest and ks-22-4908-registration-relief — determine whether the route is " +
        "reinstated now that the licence is adopted, which of the nine covered documents each " +
        "route needs, what output strategy each takes, and what remains open. " +
        "Reinstatement is per route and is not automatic. The exclusion was terminal and " +
        "correct; the fact it rested on has changed, and a route may still be held by identity, " +
        "role, scope or a legal-design question that the licence never touched. Say which, per " +
        "route, rather than reinstating the set. " +
        "Bind only the nine documents the permission covers, and only at revisions the " +
        "currentness owner has confirmed. Permission to reproduce a revision does not make it " +
        "current, and a route reinstated onto a superseded form is worse than one left closed. " +
        "The permission does not authorize filling judicial findings, judge signatures, clerk, " +
        "prosecutor or outside-party fields, court dates or service-completion facts, and no " +
        "reinstated route may assume otherwise. " +
        "Do not rewrite the exclusion, do not implement a packet, do not create a receipt, do " +
        "not mark a track ready, and do not enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  // --- Delaware --------------------------------------------------------
  //
  // The worst kind of block: HTTP 200 with a 247-byte F5/BIG-IP rejection body
  // reading "The requested URL was rejected" and a rotating support ID. A
  // status-only pipeline writes that page to disk and pins it as the form.
  // Five current documents are named from a retained official index and none
  // of their bytes were obtained.
  const deBlockedDecision = path.join(
    rootDir,
    `${FACTORY_DATA_DIR}/source-acquisition/rcap-de-official-download-automation-blocked.json`
  );
  if (fs.existsSync(deBlockedDecision)) {
    addJob({
      lane: "source_acquisition",
      jurisdiction: "DE",
      jobId: "rcap-de-attended-retrieval-five-current-forms",
      strategyFamily: "official_download_automation_blocked",
      reconciliationIds: ["retrieval:DE:civ-exp-and-form-281"],
      downloadedSourceCount: 0,
      dependencies: ["rcap-de-official-download-automation-blocked"],
      status: attendedRetrievalStatus(
        rootDir,
        `${FACTORY_DATA_DIR}/source-acquisition/rcap-de-attended-retrieval-five-current-forms.json`
      ),
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/source-acquisition/rcap-de-attended-retrieval-five-current-forms.json`
      ],
      requiredInputs: [
        `${FACTORY_DATA_DIR}/source-acquisition/rcap-de-official-download-automation-blocked.json`,
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.sourceArtifacts,
        FACTORY_INPUT_PATHS.acquisitionDocuments
      ],
      model: "codex",
      effort: "xhigh",
      commitSubject:
        "chore(record-clearing): retrieve the Delaware forms under attended access",
      executionNote:
        "Five documents: CIV_EXP_02_A Expungement Petition Form (Superior Court, 06/12/2024), " +
        "CIV_EXP_02_B Additional Charges Extension Sheet (06/12/2024), CIV_EXP_04_A Order " +
        "Granting (05/29/2024), CIV_EXP_08_A New Order Granting after Pardon (05/30/2024), and " +
        "FORM-281 Petition For Expungement of Adult Record (Family Court, 11/26/2025).",
      stopCondition:
        "Obtain the five named current Delaware documents by attended human-in-browser " +
        "retrieval from the Judiciary's own site, and record for each the exact byte count, " +
        "SHA-256, MIME type, page count, structural class, source URL and the revision read " +
        "from the form face. " +
        "An HTTP 200 carrying an F5 rejection body is not a successful response and must never " +
        "be recorded as one. Do not evade the perimeter, do not spoof an agent, and do not " +
        "retrieve through any route the issuer does not offer. " +
        "Do not substitute an unofficial replica for official bytes: a LegalEase " +
        "\"Faithful Replica\" is not the issuer's document and may not satisfy any of these " +
        "five identities. Do not create a receipt or an exact source contract until official " +
        "bytes are in hand and the licensing question behind the same perimeter is answered — " +
        "retrieval establishes identity and bytes, not permission to reproduce. " +
        "Form 281 and Form 281E are different documents seven years apart: do not satisfy " +
        "FORM-281 with the retained 281E extension sheet. " +
        "Do not amend or publish an edition, enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });

    // The edition row is wrong on its own face: it calls one document a
    // PETITION in its workflow key and a continuation sheet in its notes. The
    // notes are right. Left uncorrected, a worker looking for the Delaware
    // Family Court adult petition finds a row titled "Petition for Expungement
    // of Adult Record…" with role PETITION and binds a 2018 extension sheet to
    // a primary filing, while the actual 2025 petition stays unmanifested.
    addJob({
      lane: "source_acquisition",
      jurisdiction: "DE",
      jobId: "rcap-de-form-281e-edition-metadata-correction",
      strategyFamily: "in_repo_identity_reconciliation",
      reconciliationIds: ["identity:DE:FORM-281E:role-and-title"],
      downloadedSourceCount: 0,
      dependencies: ["rcap-de-official-download-automation-blocked"],
      ...(COMPLETED_AUTHORITY_JOB_COMMITS.has(
        "rcap-de-form-281e-edition-metadata-correction"
      ) &&
      fs.existsSync(
        path.join(
          rootDir,
          `${FACTORY_DATA_DIR}/source-acquisition/rcap-de-form-281e-edition-metadata-correction.json`
        )
      )
        ? {
            status: "completed",
            workerBranch:
              WAVE_WORKER_BRANCHES["rcap-de-form-281e-edition-metadata-correction"],
            workerCommit:
              WAVE_WORKER_COMMITS["rcap-de-form-281e-edition-metadata-correction"],
            completionCommit: COMPLETED_AUTHORITY_JOB_COMMITS.get(
              "rcap-de-form-281e-edition-metadata-correction"
            )
          }
        : { status: "ready" }),
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/source-acquisition/rcap-de-form-281e-edition-metadata-correction.json`
      ],
      requiredInputs: [
        `${FACTORY_DATA_DIR}/source-acquisition/rcap-de-official-download-automation-blocked.json`,
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.sourceArtifacts
      ],
      model: "opus",
      effort: "xhigh",
      commitSubject:
        "chore(record-clearing): correct the Delaware Form 281E edition row",
      executionNote:
        "Metadata only. The retained 281E bytes are not re-measured, not replaced and not " +
        "removed, and no Form 281 bytes are added by this job.",
      stopCondition:
        "Establish, from the retained official evidence and the official index alone, that " +
        "Form 281E is a charge and additional-charges continuation sheet and not a primary " +
        "petition. Record that its `document_role: PETITION` classification is wrong, that its " +
        "workflow key DE:FORM-281E:PETITION:EN must identify a continuation or extension-sheet " +
        "role instead, and that the 2018 continuation sheet may not satisfy a current FORM-281 " +
        "primary-filing component. " +
        "Take the corrected title from the retained form face or the official index — the " +
        "index reads \"281E - Adult Expungement Charge Extension Sheet\" — and do not splice " +
        "Form 281's title onto it. The recorded string \"Petition for Expungement of Adult " +
        "Record Charge Sheet\" is not the issuer's and must not be preserved. Where the source " +
        "does not establish a title, say so rather than inventing one. " +
        "Form 281 remains a separate, unmanifested, current petition identity and stays " +
        "unmanifested until attended retrieval supplies its bytes; do not add them here. " +
        "Record the correction for the next Edition candidate. Do not mutate Edition 1.2, do " +
        "not publish an edition, do not create a receipt, and do not enable runtime, promote, " +
        "or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  // --- Massachusetts ---------------------------------------------------
  //
  // Five distinct documents, each needing a human in a browser because
  // www.mass.gov returns HTTP 403 to every automated request on the assigned
  // endpoints. The Part A box-4 row is deliberately absent: the decision found
  // it is not a distinct document and is satisfied by its sibling acquisition,
  // so a second job for it would invent a document.
  const massachusettsAttendedRetrievals = [
    {
      slug: "100k-petition-for-expungement",
      acquisitionId: "acquire:MA:petition-for-expungement-g-l-c-276-100k",
      document: "the G.L. c. 276 s. 100K petition for expungement"
    },
    {
      slug: "tc0021",
      acquisitionId: "acquire:MA:tc0021",
      document: "TC0021"
    },
    {
      slug: "tc0057",
      acquisitionId: "acquire:MA:tc0057",
      document:
        "TC0057, whose revision is unresolved between Rev. 3/24, TC0057 (2/24) and REV-UNKNOWN"
    },
    {
      slug: "ocp-petition-to-seal",
      acquisitionId:
        "acquire:MA:petition-to-seal-office-of-the-commissioner-of-probation",
      document:
        "the Office of the Commissioner of Probation petition to seal, including its Part A box-4 selection, which is part of this document and not a separate one"
    },
    {
      slug: "mps-petition-to-expunge",
      acquisitionId: "acquire:MA:massachusetts-probation-service-petition-to-expunge",
      document:
        "the Massachusetts Probation Service petition to expunge, served through the Trial Court's interactive XFA form host"
    }
  ];
  for (const retrieval of massachusettsAttendedRetrievals) {
    addJob({
      lane: "source_acquisition",
      jurisdiction: "MA",
      jobId: `rcap-ma-attended-retrieval-${retrieval.slug}`,
      strategyFamily: "official_download_automation_blocked",
      // The acquisition row itself stays owned by the completed decision that
      // dispositioned it. Re-declaring it here would make one acquisition map
      // to two jobs; this job owns the retrieval, not the row.
      reconciliationIds: [`retrieval:MA:${retrieval.slug}`],
      downloadedSourceCount: 0,
      dependencies: ["rcap-ma-official-download-automation-blocked"],
      status: "ready",
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/source-acquisition/rcap-ma-attended-retrieval-${retrieval.slug}.json`
      ],
      requiredInputs: [
        `${FACTORY_DATA_DIR}/source-acquisition/rcap-ma-official-download-automation-blocked.json`,
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.acquisitionDocuments
      ],
      model: "codex",
      effort: "xhigh",
      commitSubject:
        `chore(record-clearing): retrieve MA ${retrieval.slug} under attended access`,
      stopCondition:
        `Obtain ${retrieval.document} by attended human-in-browser retrieval from the ` +
        "Commonwealth's own official index at " +
        "https://www.mass.gov/lists/court-forms-for-criminal-records, and record the retrieved " +
        "byte count, SHA-256, MIME type, page count, encryption, XFA presence, structural class " +
        "and the revision block read from the form face. " +
        "The HTTP 403 is an automation block, not evidence the document does not exist. Do not " +
        "evade the block, do not spoof an agent, and do not retrieve through any route the issuer " +
        "does not offer. Do not substitute a held or commercial copy for current official bytes: " +
        "the retained Massachusetts Probation Service copy is a legacy artifact, is not current " +
        "materialization evidence and is not eligible for a receipt. " +
        "Do not stamp an index revision onto held bytes, mutate Edition 1.2, publish an edition, " +
        "choose a renderer, enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }

  // The repository contradicts itself about TC0021: a measured registry row
  // says clean AcroForm, 29 fields, xfa false, while free text on the same
  // record and the Edition 1.2 manifest say XFA. PROB0002 being confirmed XFA
  // settles nothing about TC0021, and resolving one by analogy to the other is
  // exactly the error to avoid.
  addJob({
    lane: "source_acquisition",
    jurisdiction: "MA",
    jobId: "rcap-ma-tc0021-source-structure-resolution",
    strategyFamily: "source_identity_resolution",
    reconciliationIds: ["structure:MA:TC0021:acroform-or-xfa"],
    downloadedSourceCount: 0,
    dependencies: [
      "rcap-ma-official-download-automation-blocked",
      "rcap-ma-attended-retrieval-tc0021"
    ],
    status: "blocked",
    expectedOutputs: [
      `${FACTORY_DATA_DIR}/source-acquisition/rcap-ma-tc0021-source-structure-resolution.json`
    ],
    requiredInputs: [
      `${FACTORY_DATA_DIR}/source-acquisition/rcap-ma-official-download-automation-blocked.json`,
      FACTORY_INPUT_PATHS.authority,
      FACTORY_INPUT_PATHS.sourceArtifacts
    ],
    model: "codex",
    effort: "xhigh",
    commitSubject:
      "docs(record-clearing): resolve the MA TC0021 form structure",
    stopCondition:
      "Determine from the retrieved TC0021 binary itself whether it is a clean AcroForm or an XFA " +
      "form, and state which of the repository's two contradicting statements is wrong: the " +
      "measured source-artifact row reading clean_acroform / 29 fields / xfa=false, or the free " +
      "text on the same record and the Edition 1.2 manifest row reading XFA. Record the terminal " +
      "field names, the widget count and the structural class as measured. " +
      "Do not resolve this by analogy to PROB0002, whose XFA structure is confirmed and says " +
      "nothing about TC0021, and do not treat the mass.gov Acrobat Reader warning as proof. Do " +
      "not choose a renderer, enable runtime, promote, or deploy. " +
      TERMINAL_INSTRUCTION
  });

  // --- Louisiana -------------------------------------------------------
  //
  // The queue expected a PDF and the lane was set to flat_pdf_overlay on that
  // expectation. The issuer publishes no PDF: Law.aspx and LawPrint.aspx return
  // text/html. A lane cannot stay ready on a source that does not exist, and
  // inventing an HTML renderer here would be worse than leaving it open.
  addJob({
    lane: "source_acquisition",
    jurisdiction: "LA",
    jobId:
      "rcap-la-arts-993-995-998-html-source-output-strategy-adjudication",
    strategyFamily: "not_required_design_reconciliation",
    reconciliationIds: ["lane:LA:ARTS-993-995-998:html-output-strategy"],
    downloadedSourceCount: 0,
    dependencies: ["rcap-la-public-official-download"],
    ...completion(
      "rcap-la-arts-993-995-998-html-source-output-strategy-adjudication"
    ),
    expectedOutputs: [
      `${FACTORY_DATA_DIR}/source-acquisition/rcap-la-arts-993-995-998-html-source-output-strategy-adjudication.json`
    ],
    requiredInputs: [
      `${FACTORY_DATA_DIR}/source-acquisition/rcap-la-public-official-download.json`,
      "data/record-clearing/legal-design-intake/LA.memo.json",
      FACTORY_INPUT_PATHS.authority,
      FACTORY_INPUT_PATHS.sourceRelationships,
      OFFICIAL_PDF_SOURCE_PROJECTION_PATH
    ],
    model: "opus",
    effort: "xhigh",
    commitSubject:
      "docs(record-clearing): adjudicate the Louisiana HTML source output strategy",
    stopCondition:
      "Decide the output strategy for C.Cr.P. arts. 993, 995 and 998, which the Louisiana " +
      "Legislature publishes only as HTML statutory text. Choose exactly one expressly supported " +
      "strategy: a controlled custom pleading generated from the statewide statutory text; a " +
      "supported official HTML-to-document treatment the current factory already recognises; or " +
      "another strategy this repository expressly supports. " +
      "Preserve art. 986 statewide exclusivity, which permits only the court-name variation, and " +
      "prohibit the local Louisiana Supreme Court city or parish packet as a statewide " +
      "substitute. Preserve art. 993 as one statutory sheet with three Yes/No sections; the " +
      "packet's three-variant split is a rendering convention of a non-mandatory packet and is " +
      "the wrong denominator. Identify every affected track and component, and the source and " +
      "renderer implications of the chosen strategy. " +
      "Do not invent an unsupported HTML renderer, do not create a PDF receipt for an HTML-only " +
      "source, do not treat the capture date SOURCE-2026-07-31 as an issuer revision, do not " +
      "publish an edition, and keep runtime disabled. " +
      TERMINAL_INSTRUCTION
  });
}

function addCompletedGuidanceChildren({ addJob }) {
  for (const record of COMPLETED_GUIDANCE_IMPLEMENTATIONS) {
    const reviewManifest =
      `${REVIEW_MANIFEST_DIR}/rcap-${record.jurisdiction.toLowerCase()}-guidance-implementation.json`;
    const packetProof =
      `${PACKET_PROOF_DIR}/rcap-${record.jurisdiction.toLowerCase()}-guidance-implementation.json`;
    const workerOutputs = record.verifierWorkerOwned
      ? [record.modulePath, record.verifierPath]
      : [record.modulePath];
    const integrationOwnedOutputs = record.verifierWorkerOwned
      ? [packetProof, reviewManifest]
      : [record.verifierPath, packetProof, reviewManifest];
    addJob({
      lane: "guidance_implementation",
      jurisdiction: record.jurisdiction,
      jobId: `rcap-${record.jurisdiction.toLowerCase()}-guidance-implementation`,
      trackIds: record.trackIds,
      status: "completed",
      completionCommit: record.completionCommit,
      ...(record.workerBranch ? { workerBranch: record.workerBranch } : {}),
      ...(record.workerCommit ? { workerCommit: record.workerCommit } : {}),
      model: "opus",
      effort: "xhigh",
      expectedOutputs: workerOutputs,
      ownedPaths: workerOutputs,
      integrationOwnedOutputs,
      requiredInputs: [
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.packetSetManifests,
        FACTORY_INPUT_PATHS.blockerLedger,
        "src/lib/rcap/packets/engines/process-guidance.ts",
        "src/lib/rcap/packets/assemble.ts"
      ],
      regressionVerifier: record.verifierPath,
      participantPacketProofRequired: true,
      focusedValidation: [
        `node scripts/rcap-factory-plan.mjs --check-job rcap-${record.jurisdiction.toLowerCase()}-guidance-implementation`,
        `node ${record.verifierPath}`
      ],
      commitSubject:
        `feat(record-clearing): implement ${record.jurisdiction} guidance`,
      stopCondition:
        `Terminal completed child: source commit ${record.completionCommit} is integrated. ` +
        "Preserve the deterministic guidance outputs and typed route boundaries. Visual proof and " +
        "hash-bound counsel adoption remain separate; runtime stays disabled. Do not scaffold, " +
        "execute, regenerate, enable, promote, or deploy this job."
    });
  }
}

function addGuidanceTypedStopChildren({ addJob }) {
  const records = [
    {
      jurisdiction: "CT",
      jobId: "rcap-ct-cleanslate-auto-guidance-adjudication",
      trackId: "ct-cleanslate-auto",
      dependency: "rcap-ct-guidance-implementation",
      modulePath:
        "src/lib/rcap/packets/jurisdictions/connecticut/guidance.ts",
      verifierPath:
        "scripts/verify-rcap-connecticut-guidance-implementation.mjs",
      outputPath:
        `${FACTORY_DATA_DIR}/guidance-specifications/ct-cleanslate-auto-adjudication.json`,
      reason:
        "Resolve the operative-date basis and missing DESPP section list before any participant artifact exists."
    },
    {
      jurisdiction: "MI",
      jobId: "rcap-mi-csc4-pre2015-guidance-adjudication",
      trackId: "mi_setaside_csc4_pre2015",
      dependency: "rcap-mi-guidance-implementation",
      modulePath:
        "src/lib/rcap/packets/jurisdictions/michigan/guidance.ts",
      verifierPath:
        "scripts/verify-rcap-michigan-guidance-implementation.mjs",
      outputPath:
        `${FACTORY_DATA_DIR}/guidance-specifications/mi-setaside-csc4-pre2015-adjudication.json`,
      reason:
        "Resolve the bespoke prior-record, age-at-offence, and continuing SORA questions before self-help guidance exists."
    },
    {
      jurisdiction: "UT",
      jobId: "rcap-ut-clean-slate-cutover-copy-adjudication",
      // The tension reaches both automatic routes: 205(1)(a) governs the Clean
      // Slate conviction route and 206(1)(a) the acquittal and dismissal route.
      trackIds: ["ut_auto_clean_slate", "ut_auto_nonconviction"],
      subjectSlug: "ut-clean-slate-cutover-copy",
      dependency: "rcap-ut-guidance-implementation",
      modulePath: "src/lib/rcap/packets/jurisdictions/utah/guidance.ts",
      verifierPath: "scripts/verify-rcap-utah-guidance-implementation.mjs",
      outputPath:
        `${FACTORY_DATA_DIR}/guidance-specifications/ut-clean-slate-cutover-copy-adjudication.json`,
      reason:
        "Sections 77-40a-205(1)(a) and 77-40a-206(1)(a) still condition the court's order on a form " +
        "submitted during the retired 1 October 2024 to 1 January 2026 window, and neither was conformed " +
        "to the 77-40a-204(3) cutover that made identification court-initiated. The implemented sheets " +
        "report current Utah Courts practice, state plainly that part of the statutory text has not been " +
        "squared with it, and take no view on how it resolves. Settle the participant-facing copy for that " +
        "unresolved tension before any further Utah automatic-route wording is treated as final."
    }
  ];
  for (const record of records) {
    addJob({
      lane: "guidance_implementation",
      strategyFamily: "legal_design_adjudication",
      jurisdiction: record.jurisdiction,
      jobId: record.jobId,
      trackIds: record.trackIds ?? [record.trackId],
      dependencies: [record.dependency],
      status: "blocked",
      expectedOutputs: [record.outputPath],
      ownedPaths: [record.outputPath],
      integrationOwnedOutputs: [
        record.verifierPath,
        `${REVIEW_MANIFEST_DIR}/${record.jobId}.json`
      ],
      requiredInputs: [
        record.modulePath,
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.blockerLedger
      ],
      regressionVerifier: record.verifierPath,
      participantPacketProofRequired: false,
      focusedValidation: [
        `node scripts/rcap-factory-plan.mjs --check-job ${record.jobId}`,
        `node ${record.verifierPath}`
      ],
      model: "opus",
      effort: "xhigh",
      commitSubject:
        `docs(record-clearing): adjudicate ${record.subjectSlug ?? record.trackId} guidance`,
      stopCondition:
        `${record.reason} Preserve the typed stop and do not draft a packet, infer a legal ` +
        "conclusion, apply counsel adoption, enable runtime, promote, or deploy. " +
        TERMINAL_INSTRUCTION
    });
  }
}

function addGeorgiaRfoPostConsentAdjudicationChild({ addJob }) {
  const jobId = "rcap-ga-rfo-post-consent-petition-adjudication";
  const verifierPath =
    "scripts/verify-rcap-georgia-guidance-implementation.mjs";
  const outputPath =
    `${FACTORY_DATA_DIR}/guidance-specifications/ga-rfo-post-consent-petition-adjudication.json`;
  addJob({
    lane: "guidance_implementation",
    strategyFamily: "legal_design_adjudication",
    jurisdiction: "GA",
    jobId,
    trackIds: ["ga-rfo"],
    dependencies: ["rcap-ga-guidance-implementation"],
    status: "blocked",
    expectedOutputs: [outputPath],
    ownedPaths: [outputPath],
    integrationOwnedOutputs: [
      verifierPath,
      `${REVIEW_MANIFEST_DIR}/${jobId}.json`
    ],
    requiredInputs: [
      "data/record-clearing/legal-design-intake/GA.memo.json",
      FACTORY_INPUT_PATHS.normalizedTracks,
      FACTORY_INPUT_PATHS.blockerLedger,
      "src/lib/rcap/packets/jurisdictions/georgia/guidance.ts"
    ],
    regressionVerifier: verifierPath,
    participantPacketProofRequired: false,
    focusedValidation: [
      `node scripts/rcap-factory-plan.mjs --check-job ${jobId}`,
      `node ${verifierPath}`
    ],
    executionNote:
      "Georgia normalization is the integrated GA legal-design memo from " +
      "3dfa302b25aafcf32ca4463c1effc6ec874fbcd8. The completed pre-consent " +
      "guidance implementation remains a separate, useful dependency.",
    model: "opus",
    effort: "xhigh",
    commitSubject:
      "docs(record-clearing): adjudicate GA post-consent petition delivery",
    stopCondition:
      "After the required prosecutor consent is obtained, should LegalEase provide a " +
      "conditional participant petition packet under § 42-8-66, or should direct delivery " +
      "remain outside current product scope? Preserve the current pre-consent assessment, " +
      "participant factual record, and attorney/prosecutor handoff. LegalEase does not obtain " +
      "or negotiate prosecutor consent. Do not invent consent, generate a post-consent petition, " +
      "claim counsel adoption, enable runtime, promote, or deploy. " +
      TERMINAL_INSTRUCTION
  });
}

function addMassachusettsPre2024OcpRequestAdjudicationChild({ addJob }) {
  const jobId =
    "rcap-ma-pre-2024-autoseal-ocp-request-adjudication";
  const outputPath =
    `${FACTORY_DATA_DIR}/guidance-specifications/ma-pre-2024-autoseal-ocp-request-adjudication.json`;
  addJob({
    lane: "guidance_implementation",
    strategyFamily: "legal_design_adjudication",
    jurisdiction: "MA",
    jobId,
    trackIds: [],
    dependencies: ["rcap-ma-guidance-implementation"],
    status: "blocked",
    expectedOutputs: [outputPath],
    ownedPaths: [outputPath],
    integrationOwnedOutputs: [
      "scripts/verify-rcap-massachusetts-guidance-implementation.mjs",
      `${REVIEW_MANIFEST_DIR}/${jobId}.json`
    ],
    requiredInputs: [
      "data/record-clearing/legal-design-intake/MA.memo.json",
      FACTORY_INPUT_PATHS.normalizedTracks,
      FACTORY_INPUT_PATHS.blockerLedger,
      "src/lib/rcap/packets/jurisdictions/massachusetts/guidance.ts"
    ],
    regressionVerifier:
      "scripts/verify-rcap-massachusetts-guidance-implementation.mjs",
    participantPacketProofRequired: false,
    focusedValidation: [
      `node scripts/rcap-factory-plan.mjs --check-job ${jobId}`,
      "node scripts/verify-rcap-massachusetts-guidance-implementation.mjs"
    ],
    executionNote:
      "The integrated Massachusetts legal-design normalization is preserved through the " +
      "required MA memo and normalized registry inputs. The completed ma-autoseal guidance " +
      "implementation is a separate valid dependency. The possible OCP correspondence has no " +
      "normalized track or supporting-action node, so this adjudication remains trackless.",
    model: "opus",
    effort: "xhigh",
    commitSubject:
      "docs(record-clearing): adjudicate pre-2024 Massachusetts OCP request",
    stopCondition:
      "For a qualifying pre-March 11, 2024 record that did not receive automatic sealing, " +
      "determine whether LegalEase should generate a participant-written request to the Office " +
      "of the Commissioner of Probation, and whether that correspondence is a supporting action, " +
      "a correction route, or a component of ma-autoseal. Resolve current legal authority, exact " +
      "destination, required contents, whether the request initiates relief or corrects " +
      "implementation, statewide scope, official-form availability, controlled-correspondence " +
      "capability, node type, output strategy, and the post-denial or nonresponse handoff. Do not " +
      "generate an OCP request, invent a normalized node or official form, alter the completed " +
      "ma-autoseal packet, claim counsel adoption, enable runtime, promote, or deploy. " +
      TERMINAL_INSTRUCTION
  });
}

function georgiaTrancheOutputs() {
  const tranchePrefix = "data/record-clearing/implementation-tranches/tranche-3";
  return [
    "src/lib/rcap/packets/registry-ga-superior-court-pleading-family.ts",
    "src/lib/rcap/packets/engines/pleading-templates-ga.ts",
    "src/lib/rcap/packets/engines/guidance-templates-ga.ts",
    `${tranchePrefix}.json`,
    `${tranchePrefix}-authority-pins.json`,
    `${tranchePrefix}-component-guidance.json`,
    `${tranchePrefix}-field-ownership.json`,
    `${tranchePrefix}-fixtures.json`,
    `${tranchePrefix}-review-manifest.json`,
    `${tranchePrefix}-visual-review.json`,
    `${tranchePrefix}-legal-output-recommendation.json`,
    "scripts/rcap-generate-ga-superior-court-pleading-family-review.mjs",
    "scripts/verify-rcap-ga-superior-court-pleading-family-packets.mjs"
  ];
}

function addCompletedGeorgiaChild({ addJob }) {
  const outputs = georgiaTrancheOutputs();
  addJob({
    lane: "custom_pleading",
    jurisdiction: "GA",
    jobId: "rcap-ga-custom-pleading",
    trackIds: [
      "ga-felony-j1",
      "ga-vacated-j2",
      "ga-deaddocket-j3",
      "ga-misd-j4",
      "ga-fugitive-j5",
      "ga-pardon-j7",
      "ga-seal-m",
      "ga-fo-active-pre2026",
      "ga-fo-discharged-pre2026"
    ],
    status: "completed",
    model: "opus",
    effort: "xhigh",
    completionCommit: GEORGIA_TRANCHE_WORKER_COMMIT,
    regressionVerifier:
      "scripts/verify-rcap-ga-superior-court-pleading-family-packets.mjs",
    participantPacketProofRequired: true,
    expectedOutputs: outputs,
    ownedPaths: outputs,
    requiredInputs: [
      "planning/record-clearing-100-percent/jobs/IMP-CP-01-ga-superior-court-pleading-family.json",
      "data/record-clearing/implementation-tranches/tranche-1.json",
      "src/lib/rcap/packets/assemble.ts",
      "src/lib/rcap/packets/engines/custom-pleading.ts",
      "src/lib/rcap/packets/registry-mississippi.ts"
    ],
    focusedValidation: [
      "node scripts/rcap-factory-plan.mjs --check-job rcap-ga-custom-pleading",
      "node scripts/verify-rcap-ga-superior-court-pleading-family-packets.mjs"
    ],
    commitSubject: "feat(record-clearing): implement GA custom pleading",
    stopCondition:
      `Terminal completed child: source commit ${GEORGIA_TRANCHE_WORKER_COMMIT} is integrated. ` +
      "Preserve the nine deterministic participant packets, technical and visual proof, legal " +
      "recommendations awaiting counsel adoption, runtime-disabled posture, and packet_ready=false. " +
      "Do not scaffold, execute, regenerate, or promote this Georgia engineering."
  });
}

function addGeorgiaJailGuidanceSpecificationChildren({ addJob }) {
  addJob({
    lane: "legal_design_normalization",
    jurisdiction: "GA",
    jobId: "rcap-ga-guidance-specification-jail-k2",
    trackIds: ["ga-jail-k2"],
    strategyFamily: "legal_design",
    model: "opus",
    effort: "xhigh",
    status: "completed",
    completionCommit: GEORGIA_JAIL_GUIDANCE_WORKER_COMMIT,
    expectedOutputs: [
      `${FACTORY_DATA_DIR}/guidance-specifications/ga-jail-k2-process-guidance-3.json`
    ],
    requiredInputs: [
      "planning/record-clearing-100-percent/jobs/IMP-CP-02-guidance-spec-unblock-family.json",
      "data/record-clearing/implementation-tranches/tranche-3.json",
      "data/record-clearing/implementation-tranches/tranche-3-component-guidance.json",
      "data/record-clearing/implementation-tranches/tranche-3-review-manifest.json",
      "data/record-clearing/implementation-tranches/tranche-3-legal-output-recommendation.json"
    ],
    focusedValidation: [
      "node scripts/rcap-factory-plan.mjs --check-job rcap-ga-guidance-specification-jail-k2"
    ],
    commitSubject: "docs(record-clearing): specify GA jail restriction guidance",
    stopCondition:
      `Terminal completed child: source commit ${GEORGIA_JAIL_GUIDANCE_WORKER_COMMIT} is integrated. ` +
      "Preserve the bounded ga-jail-k2-process-guidance-3 specification and its two unresolved " +
      "release questions. It is not a complete packet and does not weaken the typed stop."
  });
  addJob({
    lane: "platform_foundation",
    jurisdiction: "GA",
    jobId: "rcap-ga-jail-k2-primary-filing-template",
    trackIds: ["ga-jail-k2"],
    dependencies: ["rcap-ga-guidance-specification-jail-k2"],
    status: "blocked",
    expectedOutputs: [
      "src/lib/rcap/packets/engines/pleading-templates-ga-jail-k2-request.ts",
      "scripts/verify-rcap-ga-jail-k2-primary-filing-template.mjs"
    ],
    requiredInputs: [
      `${FACTORY_DATA_DIR}/guidance-specifications/ga-jail-k2-process-guidance-3.json`,
      "src/lib/rcap/packets/engines/pleading-templates-ga.ts"
    ],
    focusedValidation: [
      "node scripts/rcap-factory-plan.mjs --check-job rcap-ga-jail-k2-primary-filing-template",
      "node scripts/verify-rcap-ga-jail-k2-primary-filing-template.mjs"
    ],
    model: "codex",
    effort: "high",
    commitSubject: "feat(record-clearing): draft GA jail request template",
    stopCondition:
      "Draft only ga-jail-k2-primary-filing-1 from the integrated specification. Do not implement " +
      "the attachment, assemble a packet, resolve release questions, weaken the typed stop, adopt " +
      "counsel output, enable runtime, or promote. " +
      TERMINAL_INSTRUCTION
  });
  addJob({
    lane: "platform_foundation",
    jurisdiction: "GA",
    jobId: "rcap-ga-jail-k2-attachment-template",
    trackIds: ["ga-jail-k2"],
    dependencies: ["rcap-ga-guidance-specification-jail-k2"],
    status: "blocked",
    expectedOutputs: [
      "src/lib/rcap/packets/engines/pleading-templates-ga-jail-k2-attachment.ts",
      "scripts/verify-rcap-ga-jail-k2-attachment-template.mjs"
    ],
    requiredInputs: [
      `${FACTORY_DATA_DIR}/guidance-specifications/ga-jail-k2-process-guidance-3.json`,
      "src/lib/rcap/packets/engines/pleading-templates-ga.ts"
    ],
    focusedValidation: [
      "node scripts/rcap-factory-plan.mjs --check-job rcap-ga-jail-k2-attachment-template",
      "node scripts/verify-rcap-ga-jail-k2-attachment-template.mjs"
    ],
    model: "codex",
    effort: "high",
    commitSubject: "feat(record-clearing): draft GA jail attachment template",
    stopCondition:
      "Draft only ga-jail-k2-attachment-2 from the integrated specification. Do not implement the " +
      "request, assemble a packet, resolve release questions, weaken the typed stop, adopt counsel " +
      "output, enable runtime, or promote. " +
      TERMINAL_INSTRUCTION
  });
  addJob({
    lane: "legal_design_normalization",
    jurisdiction: "GA",
    jobId: "rcap-ga-jail-k2-release-question-adjudication",
    trackIds: ["ga-jail-k2"],
    dependencies: ["rcap-ga-guidance-specification-jail-k2"],
    status: "blocked",
    expectedOutputs: [
      `${FACTORY_DATA_DIR}/guidance-specifications/ga-jail-k2-release-question-adjudication.json`
    ],
    requiredInputs: [
      `${FACTORY_DATA_DIR}/guidance-specifications/ga-jail-k2-process-guidance-3.json`
    ],
    model: "opus",
    effort: "high",
    commitSubject: "docs(record-clearing): adjudicate GA jail release questions",
    stopCondition:
      "Adjudicate only the preserved waiting-period and facility-form questions. Do not implement " +
      "templates or a packet, weaken the typed stop, apply counsel adoption, enable runtime, or promote. " +
      TERMINAL_INSTRUCTION
  });
  const packetVerifier =
    "scripts/verify-rcap-ga-jail-k2-packet.mjs";
  addJob({
    lane: "custom_pleading",
    jurisdiction: "GA",
    jobId: "rcap-ga-jail-k2-packet-implementation",
    trackIds: ["ga-jail-k2"],
    dependencies: [
      "rcap-ga-jail-k2-primary-filing-template",
      "rcap-ga-jail-k2-attachment-template",
      "rcap-ga-jail-k2-release-question-adjudication"
    ],
    status: "blocked",
    expectedOutputs: [
      "src/lib/rcap/packets/jurisdictions/georgia/jail-k2.ts",
      packetVerifier
    ],
    requiredInputs: [
      `${FACTORY_DATA_DIR}/guidance-specifications/ga-jail-k2-process-guidance-3.json`,
      "data/record-clearing/legal-design-specifications.json"
    ],
    regressionVerifier: packetVerifier,
    participantPacketProofRequired: true,
    focusedValidation: [
      "node scripts/rcap-factory-plan.mjs --check-job rcap-ga-jail-k2-packet-implementation",
      `node ${packetVerifier}`
    ],
    model: "codex",
    effort: "xhigh",
    commitSubject: "feat(record-clearing): implement GA jail restriction packet",
    stopCondition:
      "Implement the complete three-component ga-jail-k2 participant packet only after both " +
      "templates and release-question adjudication exist. Preserve the typed stop until all proofs " +
      "pass; do not apply counsel adoption, enable runtime, promote, or deploy. " +
      TERMINAL_INSTRUCTION
  });
}

function isGeorgiaJailGuidanceSpecificationTrack(track) {
  return track.jurisdiction === "GA" && track.trackId === "ga-jail-k2";
}

const DC_CUSTOM_PLEADING_TYPED_STOP_TRACKS = Object.freeze([
  "dc_seal_nonconviction",
  "dc_seal_fugitive",
  "dc_seal_conviction",
  "dc_yra_set_aside"
]);

function isDcCustomPleadingStopTrack(track) {
  return (
    track.jurisdiction === "DC" &&
    DC_CUSTOM_PLEADING_TYPED_STOP_TRACKS.includes(track.trackId)
  );
}

function addCompletedDcCustomPleadingChild({ addJob }) {
  const tranchePrefix = "data/record-clearing/implementation-tranches/tranche-5";
  const workerOutput =
    "src/lib/rcap/packets/jurisdictions/district-of-columbia/custom-pleading.ts";
  const verifier = "scripts/verify-rcap-dc-custom-pleading-packets.mjs";
  const integrationOutputs = [
    `${REVIEW_MANIFEST_DIR}/rcap-dc-custom-pleading.json`,
    `${tranchePrefix}.json`,
    `${tranchePrefix}-fixtures.json`,
    `${tranchePrefix}-legal-output-recommendation.json`,
    `${tranchePrefix}-review-manifest.json`,
    "scripts/rcap-generate-dc-custom-pleading-review.mjs",
    verifier
  ];
  addJob({
    lane: "custom_pleading",
    jurisdiction: "DC",
    jobId: "rcap-dc-custom-pleading",
    trackIds: [
      "dc_innocence_expungement",
      "dc_correct_misattributed_arrest"
    ],
    status: "completed",
    completionCommit: DC_CUSTOM_PLEADING_WORKER_COMMIT,
    model: "opus",
    effort: "xhigh",
    expectedOutputs: [workerOutput],
    ownedPaths: [workerOutput],
    integrationOwnedOutputs: integrationOutputs,
    requiredInputs: [
      FACTORY_INPUT_PATHS.normalizedTracks,
      FACTORY_INPUT_PATHS.packetSetManifests,
      "src/lib/rcap/packets/assemble.ts"
    ],
    regressionVerifier: verifier,
    participantPacketProofRequired: true,
    focusedValidation: [
      "node scripts/rcap-factory-plan.mjs --check-job rcap-dc-custom-pleading",
      `node ${verifier}`
    ],
    commitSubject: "feat(record-clearing): implement DC custom pleadings",
    stopCondition:
      `Terminal completed child: source commit ${DC_CUSTOM_PLEADING_WORKER_COMMIT} is integrated. ` +
      "Preserve the two deterministic participant packets and four typed stops. Runtime remains " +
      "disabled and the new hashes remain awaiting counsel adoption."
  });
}

function addDcCustomPleadingReconciliationChild({ addJob }) {
  addJob({
    lane: "legal_design_normalization",
    jurisdiction: "DC",
    jobId: "rcap-dc-custom-pleading-legal-design-reconciliation",
    trackIds: DC_CUSTOM_PLEADING_TYPED_STOP_TRACKS,
    strategyFamily: "legal_design",
    status: "blocked",
    expectedOutputs: [
      `${FACTORY_DATA_DIR}/guidance-specifications/dc-custom-pleading-stop-reconciliation.json`
    ],
    requiredInputs: [
      "src/lib/rcap/packets/jurisdictions/district-of-columbia/custom-pleading.ts",
      "data/record-clearing/legal-design-track-registry.json"
    ],
    model: "opus",
    effort: "high",
    commitSubject: "docs(record-clearing): reconcile DC pleading typed stops",
    stopCondition:
      "Resolve only the four recorded D.C. typed-stop specifications, including branch and " +
      "attestation prerequisites. Do not invent the Master Grid, decide the September 11, 2026 " +
      "statutory reversion, implement packets, adopt counsel output, enable runtime, or promote. " +
      TERMINAL_INSTRUCTION
  });
}

function addCompletedIllinoisCustomPleadingChild({ addJob }) {
  const tranchePrefix = "data/record-clearing/implementation-tranches/tranche-4";
  const outputs = [
    "src/lib/rcap/packets/jurisdictions/illinois/custom-pleading.ts",
    "src/lib/rcap/packets/registry-il-custom-pleading.ts",
    `${tranchePrefix}.json`,
    `${tranchePrefix}-authority-pins.json`,
    `${tranchePrefix}-component-guidance.json`,
    `${tranchePrefix}-field-ownership.json`,
    `${tranchePrefix}-fixtures.json`,
    `${tranchePrefix}-review-manifest.json`,
    `${tranchePrefix}-visual-review.json`,
    `${tranchePrefix}-legal-output-recommendation.json`,
    "scripts/rcap-generate-il-custom-pleading-review.mjs",
    "scripts/verify-rcap-il-custom-pleading-packets.mjs"
  ];
  addJob({
    lane: "custom_pleading",
    jurisdiction: "IL",
    jobId: "rcap-il-custom-pleading",
    trackIds: ["il-immediate-seal", "il-prostitution-j-vacate"],
    status: "completed",
    completionCommit: ILLINOIS_CUSTOM_PLEADING_WORKER_COMMIT,
    model: "opus",
    effort: "xhigh",
    expectedOutputs: outputs,
    ownedPaths: outputs,
    requiredInputs: [
      "data/record-clearing/implementation-tranches/tranche-4.json",
      "src/lib/rcap/packets/assemble.ts"
    ],
    regressionVerifier:
      "scripts/verify-rcap-il-custom-pleading-packets.mjs",
    participantPacketProofRequired: true,
    focusedValidation: [
      "node scripts/rcap-factory-plan.mjs --check-job rcap-il-custom-pleading",
      "node scripts/verify-rcap-il-custom-pleading-packets.mjs"
    ],
    commitSubject: "feat(record-clearing): implement IL custom pleadings",
    stopCondition:
      `Terminal completed child: source commit ${ILLINOIS_CUSTOM_PLEADING_WORKER_COMMIT} is integrated. ` +
      "Preserve the three assembled PDFs and technical/visual proof. il-immediate-seal remains " +
      "fail-closed on its delivery-model reconciliation and both routes await counsel adoption."
  });
}

function addCompletedMarylandChild({ addJob }) {
  const job = addJob({
    lane: "acroform_fill",
    jurisdiction: "MD",
    jobId: "rcap-md-second-chance-shielding-completed",
    trackIds: ["md_second_chance_shielding"],
    status: "completed",
    model: "opus",
    effort: "xhigh",
    regressionVerifier: "scripts/verify-rcap-tranche-2-packets.mjs",
    participantPacketProofRequired: true,
    expectedOutputs: [
      "data/record-clearing/implementation-tranches/tranche-2.json",
      "data/record-clearing/implementation-tranches/tranche-2-authority-pins.json",
      "data/record-clearing/implementation-tranches/tranche-2-component-guidance.json",
      "data/record-clearing/implementation-tranches/tranche-2-field-ownership.json",
      "data/record-clearing/implementation-tranches/tranche-2-fixtures.json",
      "data/record-clearing/implementation-tranches/tranche-2-review-manifest.json",
      "data/record-clearing/implementation-tranches/tranche-2-visual-review.json",
      "data/record-clearing/implementation-tranches/tranche-2-legal-output-recommendation.json",
      "src/lib/rcap/packets/registry-maryland.ts",
      "src/lib/rcap/packets/tranche-2-maryland-facts.ts",
      "src/lib/rcap/packets/engines/guidance-templates-maryland.ts",
      "scripts/rcap-generate-tranche-2-review.mjs",
      "scripts/verify-rcap-tranche-2-packets.mjs"
    ],
    ownedPaths: [
      "data/record-clearing/implementation-tranches/tranche-2.json",
      "data/record-clearing/implementation-tranches/tranche-2-authority-pins.json",
      "data/record-clearing/implementation-tranches/tranche-2-component-guidance.json",
      "data/record-clearing/implementation-tranches/tranche-2-field-ownership.json",
      "data/record-clearing/implementation-tranches/tranche-2-fixtures.json",
      "data/record-clearing/implementation-tranches/tranche-2-review-manifest.json",
      "data/record-clearing/implementation-tranches/tranche-2-visual-review.json",
      "data/record-clearing/implementation-tranches/tranche-2-legal-output-recommendation.json",
      "src/lib/rcap/packets/registry-maryland.ts",
      "src/lib/rcap/packets/tranche-2-maryland-facts.ts",
      "src/lib/rcap/packets/engines/guidance-templates-maryland.ts",
      "scripts/rcap-generate-tranche-2-review.mjs",
      "scripts/verify-rcap-tranche-2-packets.mjs"
    ],
    requiredInputs: [
      "planning/record-clearing-100-percent/jobs/IMP-OF-01-md-district-court-form-family.json",
      "data/record-clearing/implementation-tranches/tranche-2-authority-pins.json",
      "data/record-clearing/implementation-tranches/tranche-2-review-manifest.json",
      "data/record-clearing/implementation-tranches/tranche-2-visual-review.json",
      "data/record-clearing/implementation-tranches/tranche-2-legal-output-recommendation.json"
    ],
    focusedValidation: [
      "node scripts/verify-rcap-tranche-2-packets.mjs"
    ],
    commitSubject: "feat(record-clearing): implement MD official-form routes",
    stopCondition:
      "Terminal completed child only: source commit e209f3469b1b426d30d6d05550e84dfb0b24c147 " +
      "is integrated by patch-equivalent commit 4ccf8ce2f96b5aef19dc6e53715db35cc685776a. " +
      "Do not scaffold, execute, regenerate, alter, or promote this Maryland engineering. Preserve its " +
      "technical, visual, final-PDF, and legal-recommendation proof while counsel adoption, staging, " +
      "and production remain outstanding."
  });
  // Maryland's engineering was completed under the implementation-tranche model,
  // before official-PDF jobs carried an assignment, exact identity keys, a
  // current proof and a review manifest. The historical completion is real and
  // is not erased — but it is not the same thing as a job that is complete under
  // the current factory evidence chain, and counting it as one overstates how
  // many official-PDF implementations that chain has actually produced.
  job.legacyCompletion = {
    schemaVersion: "rcap-legacy-official-pdf-completion/v1",
    evidenceModel: "implementation_tranche_2",
    state: "legacy_completion_evidence_migration_required",
    currentFactoryEvidenceChainComplete: false,
    missingCurrentEvidence: [
      "official_pdf_assignment",
      "exact_identity_keys",
      "current_official_pdf_proof",
      "current_review_manifest"
    ],
    preservedHistoricalEvidence: [
      "data/record-clearing/implementation-tranches/tranche-2.json",
      "data/record-clearing/implementation-tranches/tranche-2-review-manifest.json",
      "data/record-clearing/implementation-tranches/tranche-2-visual-review.json",
      "data/record-clearing/implementation-tranches/tranche-2-legal-output-recommendation.json"
    ],
    migrationJobId: "rcap-md-legacy-official-pdf-evidence-migration",
    packetReimplementationRequired: false
  };
  return job;
}

/**
 * Captain-owned regeneration of the nationwide official-PDF queue and its
 * portable source projection.
 *
 * Nothing owned these outputs. They were generated once, by hand, and then went
 * stale for two days while the integrated audit moved underneath them — which is
 * exactly how a queue ends up asserting that Pennsylvania cannot be in the audit
 * it is built from. Giving them an owner makes regeneration a rerunnable step
 * after every authority wave rather than a rediscovery.
 *
 * The job owns derived records only. It acquires nothing, normalizes nothing,
 * implements no renderer, and holds no source binary.
 */
function addOfficialPdfQueueRegenerationJob({ addJob }) {
  return addJob({
    lane: "platform_foundation",
    jurisdiction: "NATIONWIDE",
    jobId: "rcap-nationwide-official-pdf-queue-projection-regeneration",
    strategyFamily: "official_pdf_queue_projection_regeneration",
    executionScope: "captain",
    status: "completed",
    model: "opus",
    effort: "xhigh",
    participantPacketProofRequired: false,
    expectedOutputs: [
      `${FACTORY_DATA_DIR}/official-pdf-production-queue.json`,
      `${FACTORY_DATA_DIR}/official-pdf-source-assignment-projection.json`,
      `${FACTORY_DATA_DIR}/official-pdf-source-contract-reconciliation.json`
    ],
    ownedPaths: [
      `${FACTORY_DATA_DIR}/official-pdf-production-queue.json`,
      `${FACTORY_DATA_DIR}/official-pdf-source-assignment-projection.json`,
      `${FACTORY_DATA_DIR}/official-pdf-source-contract-reconciliation.json`
    ],
    // These three stay forbidden to every worker; the exemption is exactly the
    // point of a captain-owned regeneration job, and it is scoped to the three
    // records this job owns.
    forbiddenPaths: GLOBAL_WORKER_FORBIDDEN_PATHS.filter(
      (candidate) =>
        ![
          `${FACTORY_DATA_DIR}/official-pdf-production-queue.json`,
          `${FACTORY_DATA_DIR}/official-pdf-source-assignment-projection.json`,
          `${FACTORY_DATA_DIR}/official-pdf-source-contract-reconciliation.json`
        ].includes(candidate)
    ),
    requiredInputs: [
      FACTORY_INPUT_PATHS.trackSourceAudit,
      FACTORY_INPUT_PATHS.repositoryAssetAudit,
      FACTORY_INPUT_PATHS.sourceArtifacts,
      FACTORY_INPUT_PATHS.sourceRelationships,
      FACTORY_INPUT_PATHS.authority,
      FACTORY_INPUT_PATHS.normalizationReadiness
    ],
    focusedValidation: [
      "node scripts/generate-rcap-official-pdf-production-queue.mjs",
      "node scripts/verify-rcap-official-pdf-production-queue.mjs",
      "node scripts/verify-rcap-official-pdf-source-contract-reconciliation.mjs",
      "node scripts/verify-rcap-materialization-planning.mjs"
    ],
    commitSubject:
      "chore(record-clearing): regenerate the official-PDF queue and projection",
    stopCondition:
      "Regenerate the nationwide official-PDF production queue, its source-contract " +
      "reconciliation and the portable source-assignment projection from the current " +
      "integrated track-source audit, the completed source-acquisition decisions and the " +
      "current authority and exclusion records. Fail closed when an upstream record is " +
      "internally inconsistent. Do not acquire, download or commit a source binary, do not " +
      "normalize legal design, do not implement a renderer, do not promote a blocked identity, " +
      "and do not enable runtime, promote, or deploy. " +
      TERMINAL_INSTRUCTION
  });
}

/**
 * Migrates Maryland's tranche-era completion evidence into the current
 * official-PDF schema. The packet is not reimplemented — the engineering is
 * done and its historical proof is preserved; what is missing is the modern
 * assignment, identity keys, proof and review manifest that make a completion
 * legible to the current factory.
 */
function addMarylandLegacyEvidenceMigrationJob({ addJob, rootDir, jobs }) {
  const outputPath = `${FACTORY_DATA_DIR}/legal-design-decisions/md-legacy-official-pdf-evidence-migration.json`;
  // The status was the literal string "blocked", and the thing it named as the
  // block — the Maryland shielding implementation — had already completed. So
  // the gate could not open no matter what happened, and nothing on the job
  // said why it was still shut. Same shape as the Colorado licence gate and the
  // same fix: derive it from the conditions it claims to be waiting on.
  //
  // Two conditions, both stated in the stop condition. The implementation must
  // be complete, and the two sources it consumes must be reachable through the
  // portable lifecycle rather than the `private/` path the legacy evidence
  // named — which is the entire point of the migration and cannot be assumed.
  const dependencyComplete =
    jobs.find((entry) => entry.jobId === "rcap-md-second-chance-shielding-completed")
      ?.status === "completed";
  const portableSourcesReceipted = [
    "rcap-md-cc-dc-cr-148-eee9a06118",
    "rcap-md-mdj-008-bdcaa0d6fd"
  ].every((identityKey) => {
    const receiptPath = path.join(
      rootDir,
      `${FACTORY_DATA_DIR}/source-materialization-receipts/${identityKey}.json`
    );
    if (!fs.existsSync(receiptPath)) return false;
    try {
      const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
      return (
        receipt.workerReady === true &&
        receipt.hashAndMediaVerified === true &&
        typeof receipt.materializationDestination === "string" &&
        !receipt.materializationDestination.startsWith("private/")
      );
    } catch {
      return false;
    }
  });
  return addJob({
    lane: "platform_foundation",
    jurisdiction: "MD",
    jobId: "rcap-md-legacy-official-pdf-evidence-migration",
    strategyFamily: "legacy_completion_evidence_migration",
    executionScope: "captain",
    status: fs.existsSync(path.join(rootDir, outputPath))
      ? "completed"
      : dependencyComplete && portableSourcesReceipted
        ? "ready"
        : "blocked",
    dependencies: ["rcap-md-second-chance-shielding-completed"],
    model: "opus",
    effort: "high",
    participantPacketProofRequired: false,
    expectedOutputs: [
      `${FACTORY_DATA_DIR}/legal-design-decisions/md-legacy-official-pdf-evidence-migration.json`
    ],
    ownedPaths: [
      `${FACTORY_DATA_DIR}/legal-design-decisions/md-legacy-official-pdf-evidence-migration.json`
    ],
    requiredInputs: [
      "data/record-clearing/implementation-tranches/tranche-2.json",
      "data/record-clearing/implementation-tranches/tranche-2-review-manifest.json",
      `${FACTORY_DATA_DIR}/official-pdf-source-assignment-projection.json`,
      FACTORY_INPUT_PATHS.sourceArtifacts
    ],
    focusedValidation: [
      "node scripts/rcap-factory-plan.mjs --check-job rcap-md-legacy-official-pdf-evidence-migration"
    ],
    commitSubject:
      "chore(record-clearing): migrate Maryland legacy official-PDF evidence",
    stopCondition:
      "Reconcile CC-DC-CR-148 and MDJ-008 to receipt-backed portable source paths and current " +
      "source hashes, and produce the modern proof, review manifest and completion provenance " +
      "the current official-PDF evidence chain requires. Preserve the historical tranche-2 " +
      "record unchanged, do not reimplement the packet, do not rerun Maryland legal design, do " +
      "not copy a source PDF into Git, and do not enable runtime, promote, or deploy. " +
      TERMINAL_INSTRUCTION
  });
}

const FACTORY_TO_CANONICAL_IMPLEMENTATION_LANE = Object.freeze({
  custom_pleading: "implementation-pleading",
  acroform_fill: "implementation-acroform",
  flat_pdf_overlay: "implementation-overlay",
  composed_route: "implementation-composed",
  guidance_implementation: "implementation-guidance"
});

const REVIEW_PARENT_BY_IMPLEMENTATION_LANE = Object.freeze({
  "implementation-pleading": "REV-01-custom-pleading-family-review",
  "implementation-acroform": "REV-02-official-acroform-family-review",
  "implementation-overlay": "REV-03-overlay-family-review",
  "implementation-guidance": "REV-04-guidance-family-review",
  "implementation-composed": "REV-05-composed-family-review"
});

const PARTNER_PRIORITY_STAGING_JURISDICTIONS = new Set([
  "MS",
  "GA",
  "MD",
  "CA",
  "DC",
  "IL"
]);

function attachCanonicalParents(jobs, canonicalParentRecords, normalizedTracks) {
  const parents = canonicalParentRecords.map((record) => record.data);
  const parentById = new Map(parents.map((parent) => [parent.jobId, parent]));
  assertCanonicalParentPlan(parents);
  const declaredOutputStrategyByTrackId = new Map(
    (normalizedTracks?.tracks ?? []).map((track) => [
      `${track.jurisdiction}:${track.trackId}`,
      track.outputStrategy
    ])
  );

  for (const job of jobs) {
    const parentJobId = resolveCanonicalParentJobId(
      job,
      parents,
      jobs,
      declaredOutputStrategyByTrackId
    );
    if (!parentById.has(parentJobId)) {
      throw new Error(
        `${job.jobId} resolved unknown canonical parent ${parentJobId ?? "none"}.`
      );
    }
    const parentRecord = canonicalParentRecords.find(
      (record) => record.data.jobId === parentJobId
    );
    job.parentJobId = parentJobId;
    job.canonicalWave = parentRecord.data.wave;
    job.canonicalLane = parentRecord.data.lane;
    job.requiredInputs = sortedUnique([
      ...job.requiredInputs,
      parentRecord.path
    ]);
  }
}

function assertCanonicalParentPlan(parents) {
  if (parents.length !== 72) {
    throw new Error(`Canonical plan must contain 72 parent jobs; found ${parents.length}.`);
  }
  const ids = parents.map((parent) => parent.jobId);
  if (new Set(ids).size !== 72 || ids.some((jobId) => typeof jobId !== "string")) {
    throw new Error("Canonical parent job IDs must be present and unique.");
  }
  const waves = new Set(parents.map((parent) => parent.wave));
  if (
    waves.size !== 8 ||
    [...waves].some((wave) => !Number.isInteger(wave) || wave < 0 || wave > 7)
  ) {
    throw new Error("Canonical parent plan must retain waves 0 through 7.");
  }
  const lanes = new Set(parents.map((parent) => parent.lane));
  if (lanes.size !== 11) {
    throw new Error(`Canonical parent plan must retain 11 lanes; found ${lanes.size}.`);
  }
}

function resolveCanonicalParentJobId(job, parents, jobs, declaredOutputStrategyByTrackId) {
  if (job.jobId === "rcap-nationwide-track-promotion-contract") {
    return "F-03-track-promotion-contract";
  }
  if (job.jobId === "rcap-nationwide-source-materialization-contract") {
    return "AUTH-06-source-gate-clearance";
  }
  if (job.jobId === NORMALIZATION_READINESS_FOUNDATION_JOB_ID) {
    return "F-01-batch-3-expected-track-ids";
  }
  if (job.jobId === "rcap-md-official-pdf-supporting-components") {
    return "IMP-OF-01-md-district-court-form-family";
  }
  if (
    [
      "rcap-ga-guidance-specification-jail-k2",
      "rcap-ga-jail-k2-primary-filing-template",
      "rcap-ga-jail-k2-attachment-template",
      "rcap-ga-jail-k2-release-question-adjudication"
    ].includes(job.jobId)
  ) {
    return "IMP-CP-02-guidance-spec-unblock-family";
  }
  if (
    job.jobId ===
    "rcap-ma-pre-2024-autoseal-ocp-request-adjudication"
  ) {
    return "IMP-GU-01-automatic-relief-guidance-clean-slate";
  }
  if (job.strategyFamily === "legal_review_materialization") {
    const matches = parents.filter(
      (parent) =>
        parent.lane === "normalization" &&
        (parent.jurisdictions ?? []).includes(job.jurisdiction)
    );
    if (matches.length !== 1) {
      throw new Error(
        `${job.jobId} must map to one canonical normalization parent; found ${matches.length}.`
      );
    }
    return matches[0].jobId;
  }
  if (job.jobId === "rcap-dc-custom-pleading-legal-design-reconciliation") {
    return "IMP-CP-03-dc-superior-court-motion-family";
  }
  if (job.lane === "platform_foundation") {
    return "F-02-template-family-hash-infrastructure";
  }
  // The Colorado remap is a component-remap correction that happens to be
  // carried out in a memo, so it belongs to the remap family that already owns
  // the identical Illinois, Iowa and Indiana corrections — not to a Colorado
  // normalization parent, which does not exist.
  if (
    job.jobId === "rcap-co-jdf-2370-2371-component-remap-memo-correction"
  ) {
    return "AUTH-02-component-remap-corrections";
  }
  if (job.lane === "legal_design_normalization") {
    const matches = parents.filter(
      (parent) =>
        parent.lane === "normalization" &&
        (parent.jurisdictions ?? []).includes(job.jurisdiction)
    );
    if (matches.length === 1) return matches[0].jobId;
    // The normalization pods cover the twenty-six jurisdictions that were
    // normalized through them. A legal-design amendment can arise outside that
    // set — Louisiana's output-strategy correction exists because an authority
    // decision changed what the source is, not because Louisiana was being
    // normalized — and such an amendment belongs to the authority family whose
    // decision produced it. A jurisdiction inside a pod still maps to its pod,
    // so this cannot quietly re-home an ordinary normalization amendment.
    if (
      matches.length === 0 &&
      [
        "legal_design_normalization_amendment",
        "legal_design_adjudication"
      ].includes(job.strategyFamily)
    ) {
      return canonicalAuthorityParentJobId(job);
    }
    throw new Error(
      `${job.jobId} must map to one canonical normalization parent; found ${matches.length}.`
    );
  }
  if (job.lane === "source_acquisition") {
    return canonicalAuthorityParentJobId(job);
  }
  if (Object.hasOwn(FACTORY_TO_CANONICAL_IMPLEMENTATION_LANE, job.lane)) {
    return canonicalImplementationParentJobId(job, parents);
  }
  if (job.lane === "legal_output_review") {
    return canonicalReviewParentJobId(
      job,
      parents,
      jobs,
      declaredOutputStrategyByTrackId
    );
  }
  if (job.lane === "staging_promotion") {
    return PARTNER_PRIORITY_STAGING_JURISDICTIONS.has(job.jurisdiction)
      ? "STG-01-staging-promotion-partner-priority"
      : "STG-02-staging-promotion-remainder";
  }
  throw new Error(`${job.jobId} has no canonical parent mapping rule.`);
}

function canonicalAuthorityParentJobId(job) {
  if (job.strategyFamily === "edition_publication") {
    return "AUTH-04-edition-1-3-publication";
  }
  if (job.jurisdiction === "KS") {
    return "EXC-01-ks-commercial-use-determination";
  }
  if (
    (job.reconciliationIds?.length ?? 0) > 0 &&
    ["IL", "IA", "IN"].includes(job.jurisdiction)
  ) {
    return "AUTH-02-component-remap-corrections";
  }
  if (["AR", "AL", "HI", "MO", "FL"].includes(job.jurisdiction)) {
    return "AUTH-03-acquisition-campaign-tier-1";
  }
  if (["AZ", "IA", "IN", "DE", "MA", "MN", "LA"].includes(job.jurisdiction)) {
    return "AUTH-05-acquisition-campaign-tier-2";
  }
  if (["MD", "MT"].includes(job.jurisdiction)) {
    return "AUTH-06-source-gate-clearance";
  }
  return "AUTH-01-in-repo-authority-pinning";
}

function canonicalImplementationParentJobId(job, parents) {
  const requestedLane = FACTORY_TO_CANONICAL_IMPLEMENTATION_LANE[job.lane];
  const candidates = parents
    .filter((parent) => String(parent.lane ?? "").startsWith("implementation-"))
    .map((parent) => ({
      parent,
      matchingTracks: job.trackIds.filter((trackId) =>
        (parent.tracks ?? []).includes(trackId)
      ).length,
      laneMatch: parent.lane === requestedLane
    }))
    .filter((candidate) => candidate.matchingTracks > 0)
    .sort(
      (left, right) =>
        Number(right.laneMatch) - Number(left.laneMatch) ||
        right.matchingTracks - left.matchingTracks ||
        left.parent.jobId.localeCompare(right.parent.jobId)
    );
  if (candidates.length === 0) {
    const dynamicCandidates = parents.filter(
      (parent) =>
        parent.lane === requestedLane &&
        (parent.tracks ?? []).length === 0 &&
        (parent.jurisdictions ?? []).includes(job.jurisdiction) &&
        typeof parent.tracksResolvedFrom === "string" &&
        parent.tracksResolvedFrom.length > 0
    );
    if (dynamicCandidates.length !== 1) {
      throw new Error(
        `${job.jobId} has no canonical implementation parent; found ` +
          `${dynamicCandidates.length} jurisdiction-scoped dynamic candidates.`
      );
    }
    return dynamicCandidates[0].jobId;
  }
  return candidates[0].parent.jobId;
}

const CANONICAL_IMPLEMENTATION_LANE_BY_OUTPUT_STRATEGY = Object.freeze({
  custom_pleading: "implementation-pleading",
  official_pdf_fill: "implementation-acroform",
  process_guidance: "implementation-guidance",
  composed: "implementation-composed"
});

function canonicalReviewParentJobId(job, parents, jobs, declaredOutputStrategyByTrackId = new Map()) {
  const scores = new Map();
  for (const parent of parents.filter((entry) =>
    String(entry.lane ?? "").startsWith("implementation-")
  )) {
    const count = job.trackIds.filter((trackId) =>
      (parent.tracks ?? []).includes(trackId)
    ).length;
    if (count > 0) {
      const reviewParent = REVIEW_PARENT_BY_IMPLEMENTATION_LANE[parent.lane];
      scores.set(reviewParent, (scores.get(reviewParent) ?? 0) + count);
    }
  }
  let ranked = [...scores.entries()].sort(
    ([leftId, leftCount], [rightId, rightCount]) =>
      rightCount - leftCount || leftId.localeCompare(rightId)
  );
  if (ranked.length === 0) {
    for (const dependencyId of job.dependencies) {
      const dependency = jobs.find(
        (candidate) => candidate.jobId === dependencyId
      );
      const implementationLane =
        FACTORY_TO_CANONICAL_IMPLEMENTATION_LANE[dependency?.lane];
      if (!implementationLane) continue;
      const count = dependency.trackIds.filter((trackId) =>
        job.trackIds.includes(trackId)
      ).length;
      if (count === 0) continue;
      const reviewParent =
        REVIEW_PARENT_BY_IMPLEMENTATION_LANE[implementationLane];
      scores.set(
        reviewParent,
        (scores.get(reviewParent) ?? 0) + count
      );
    }
    ranked = [...scores.entries()].sort(
      ([leftId, leftCount], [rightId, rightCount]) =>
        rightCount - leftCount || leftId.localeCompare(rightId)
    );
  }
  if (ranked.length === 0) {
    // A jurisdiction whose official-form components have no implementation job
    // yet — because no receipt or corpus row has established their technical
    // structure — still has output to review eventually. Fall back to the review
    // family its own declared output strategies imply, rather than refusing to
    // compile a plan because implementation has not started.
    const declared = new Map();
    for (const trackId of job.trackIds) {
      const strategy = declaredOutputStrategyByTrackId.get(
        `${job.jurisdiction}:${trackId}`
      );
      const lane = CANONICAL_IMPLEMENTATION_LANE_BY_OUTPUT_STRATEGY[strategy];
      if (!lane) continue;
      const reviewParent = REVIEW_PARENT_BY_IMPLEMENTATION_LANE[lane];
      declared.set(reviewParent, (declared.get(reviewParent) ?? 0) + 1);
    }
    ranked = [...declared.entries()].sort(
      ([leftId, leftCount], [rightId, rightCount]) =>
        rightCount - leftCount || leftId.localeCompare(rightId)
    );
  }
  if (ranked.length === 0) {
    throw new Error(`${job.jobId} has no canonical family-review parent.`);
  }
  return ranked[0][0];
}

function buildCanonicalPlanSummary(canonicalParentRecords) {
  const parents = canonicalParentRecords.map((record) => record.data);
  assertCanonicalParentPlan(parents);
  return {
    parentJobs: parents.length,
    waves: new Set(parents.map((parent) => parent.wave)).size,
    lanes: new Set(parents.map((parent) => parent.lane)).size,
    completedParentJobs: parents.filter((parent) => parent.status === "completed")
      .length,
    childMappingPolicy: {
      cardinality: "exactly_one_execution_owner",
      implementationSelection:
        "canonical lane match, then greatest matching-track count, then lexical parentJobId",
      reviewSelection:
        "greatest represented implementation-family count, then lexical review parentJobId",
      aggregation:
        "A mechanical jurisdiction child may aggregate tracks represented by multiple canonical " +
        "family parents; its one parentJobId is the deterministic execution owner. Canonical " +
        "normalized-track representation is verified separately and is not inferred from child bundles."
    },
    jobIds: parents.map((parent) => parent.jobId).sort()
  };
}

function buildParentJobReconciliation(canonicalParentRecords, jobs) {
  const parentIds = canonicalParentRecords.map((record) => record.data.jobId).sort();
  const known = new Set(parentIds);
  const mapped = jobs.filter(
    (job) => typeof job.parentJobId === "string" && known.has(job.parentJobId)
  );
  const byParentJob = Object.fromEntries(
    parentIds.map((parentJobId) => [
      parentJobId,
      mapped.filter((job) => job.parentJobId === parentJobId).length
    ])
  );
  return {
    canonicalParentJobs: parentIds.length,
    compiledChildJobs: jobs.length,
    childrenMappedExactlyOnce: mapped.length,
    unmappedChildren: jobs.length - mapped.length,
    unknownParentReferences: jobs.filter(
      (job) => !known.has(job.parentJobId)
    ).length,
    parentsWithCompiledChildren: Object.values(byParentJob).filter(
      (count) => count > 0
    ).length,
    byParentJob
  };
}

const AUTHORITY_FAMILY_BY_RESEARCH_STATUS = Object.freeze({
  public_official_download: "public_official_download",
  official_download_automation_blocked: "official_download_automation_blocked",
  official_request_required: "direct_issuer_request",
  commercial_license_required: "commercial_license",
  local_court_selection_required: "local_form_scope_correction",
  identity_unresolved: "source_identity_resolution",
  not_required_custom_pleading: "not_required_design_reconciliation",
  not_required_no_filing_route: "not_required_design_reconciliation",
  superseded: "superseded_source_replacement"
});

const AUTHORITY_FAMILY_LABELS = Object.freeze([
  "in_repo_identity_reconciliation",
  "public_official_download",
  "official_download_automation_blocked",
  "direct_issuer_request",
  "commercial_license",
  "local_form_scope_correction",
  "source_identity_resolution",
  "not_required_design_reconciliation",
  "superseded_source_replacement",
  "edition_publication"
]);

function acquisitionAuthorityGroups(inputs) {
  const documents = inputs.acquisitionDocuments.documents ?? [];
  if (documents.length !== 109) {
    throw new Error(
      `Acquisition intelligence must contain 109 documents; found ${documents.length}.`
    );
  }

  const byId = new Map();
  for (const document of documents) {
    if (!document?.acquisitionId || byId.has(document.acquisitionId)) {
      throw new Error(
        `Acquisition intelligence has a missing or duplicate acquisitionId ${document?.acquisitionId}.`
      );
    }
    byId.set(document.acquisitionId, document);
  }

  const groups = [];
  const assigned = new Set();
  const addGroup = ({
    jobId,
    jurisdiction,
    strategyFamily,
    acquisitionIds = [],
    reconciliationIds = [],
    trackIds,
    model = "opus",
    effort = "high",
    commitSubject
  }) => {
    const ids = sortedUnique(acquisitionIds);
    for (const acquisitionId of ids) {
      if (!byId.has(acquisitionId)) {
        throw new Error(`${jobId} names unknown acquisition record ${acquisitionId}.`);
      }
      if (assigned.has(acquisitionId)) {
        throw new Error(`${acquisitionId} is assigned to more than one authority job.`);
      }
      assigned.add(acquisitionId);
    }
    const records = ids.map((acquisitionId) => byId.get(acquisitionId));
    groups.push({
      jobId,
      jurisdiction,
      strategyFamily,
      acquisitionIds: ids,
      reconciliationIds: sortedUnique(reconciliationIds),
      trackIds: sortedUnique(
        trackIds ?? records.flatMap((record) => record.trackIds ?? [])
      ),
      model,
      effort,
      commitSubject:
        commitSubject ??
        `chore(record-clearing): reconcile ${jurisdiction} ${strategyFamily.replaceAll("_", " ")}`
    });
  };
  const take = (predicate) =>
    documents
      .filter((document) => !assigned.has(document.acquisitionId) && predicate(document))
      .map((document) => document.acquisitionId);

  const arkansasPublicGaps = new Set([
    "acquire:AR:acic-order-veterans-court",
    "acquire:AR:acic-petition-dismiss-and-seal-first-offenders",
    "acquire:AR:acic-uniform-petition-to-seal"
  ]);
  addGroup({
    jobId: "rcap-ar-in-repo-identity-reconciliation-acic",
    jurisdiction: "AR",
    strategyFamily: "in_repo_identity_reconciliation",
    acquisitionIds: take(
      (document) =>
        document.jurisdiction === "AR" &&
        !arkansasPublicGaps.has(document.acquisitionId)
    ),
    effort: "xhigh",
    commitSubject: "chore(record-clearing): reconcile retained Arkansas ACIC identities"
  });
  addGroup({
    jobId: "rcap-ar-public-official-download-acic-gaps",
    jurisdiction: "AR",
    strategyFamily: "public_official_download",
    acquisitionIds: take((document) =>
      arkansasPublicGaps.has(document.acquisitionId)
    ),
    effort: "xhigh",
    commitSubject: "chore(record-clearing): acquire three missing Arkansas ACIC sources"
  });
  addGroup({
    jobId: "rcap-md-in-repo-identity-reconciliation-cc-dc-cr-072",
    jurisdiction: "MD",
    strategyFamily: "in_repo_identity_reconciliation",
    acquisitionIds: take((document) => document.jurisdiction === "MD"),
    effort: "xhigh",
    commitSubject: "chore(record-clearing): reconcile retained Maryland petition identities"
  });
  addGroup({
    jobId: "rcap-al-in-repo-identity-reconciliation-cr-65",
    jurisdiction: "AL",
    strategyFamily: "in_repo_identity_reconciliation",
    acquisitionIds: take(
      (document) => document.acquisitionId === "acquire:AL:cr-65"
    ),
    effort: "xhigh",
    commitSubject: "chore(record-clearing): reconcile retained Alabama CR-65 identity"
  });
  addGroup({
    jobId: "rcap-hi-in-repo-identity-reconciliation-hcjdc-159",
    jurisdiction: "HI",
    strategyFamily: "in_repo_identity_reconciliation",
    acquisitionIds: take((document) => document.jurisdiction === "HI"),
    effort: "xhigh",
    commitSubject: "chore(record-clearing): reconcile Hawaii shared HCJDC source"
  });
  addGroup({
    jobId: "rcap-fl-public-official-download-fdle-fac-supersession",
    jurisdiction: "FL",
    strategyFamily: "public_official_download",
    acquisitionIds: take(
      (document) =>
        document.jurisdiction === "FL" &&
        document.documentId?.startsWith("FDLE-") &&
        document.finalResearchStatus === "public_official_download"
    ),
    effort: "xhigh",
    commitSubject: "chore(record-clearing): acquire Florida FAC forms and record supersession"
  });

  const exactIdentityJobs = new Map([
    [
      "acquire:CO:jdf-417-order",
      "rcap-co-source-identity-resolution-jdf-417-order"
    ],
    [
      "acquire:FL:fl-rule-3-989-continuation",
      "rcap-fl-source-identity-resolution-rule-3-989-continuation"
    ],
    [
      "acquire:IA:certification-of-service-by-mailing-or-delivery",
      "rcap-ia-source-identity-resolution-certification-of-service"
    ],
    [
      "acquire:KS:ks-criminal-cover-sheet-10-14-2025",
      "rcap-ks-source-identity-resolution-criminal-cover-sheet"
    ]
  ]);
  for (const [acquisitionId, jobId] of exactIdentityJobs) {
    const document = byId.get(acquisitionId);
    addGroup({
      jobId,
      jurisdiction: document.jurisdiction,
      strategyFamily: "source_identity_resolution",
      acquisitionIds: take((entry) => entry.acquisitionId === acquisitionId),
      effort: "xhigh",
      commitSubject: `docs(record-clearing): resolve ${document.documentId} source identity`
    });
  }

  addGroup({
    jobId: "rcap-ca-local-form-scope-correction-sdsc-crm-307",
    jurisdiction: "CA",
    strategyFamily: "local_form_scope_correction",
    acquisitionIds: take(
      (document) => document.acquisitionId === "acquire:CA:sdsc-crm-307"
    ),
    effort: "xhigh",
    commitSubject: "docs(record-clearing): correct San Diego CRM-307 source scope"
  });

  const remainingBuckets = groupBy(
    documents.filter((document) => !assigned.has(document.acquisitionId)),
    (document) => {
      const family = AUTHORITY_FAMILY_BY_RESEARCH_STATUS[document.finalResearchStatus];
      if (!family) {
        throw new Error(
          `${document.acquisitionId} has unsupported finalResearchStatus ${document.finalResearchStatus}.`
        );
      }
      return `${document.jurisdiction}:${family}`;
    }
  );
  for (const [bucket, records] of [...remainingBuckets.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const [jurisdiction, strategyFamily] = bucket.split(":");
    const suffix = strategyFamily.replaceAll("_", "-");
    addGroup({
      jobId: `rcap-${jurisdiction.toLowerCase()}-${suffix}`,
      jurisdiction,
      strategyFamily,
      acquisitionIds: records.map((record) => record.acquisitionId),
      effort: ["commercial_license", "source_identity_resolution"].includes(strategyFamily)
        ? "xhigh"
        : "high"
    });
  }

  const exclusions = inputs.acquisitionDocuments.inventoryDerivation?.excludedFromScope ?? [];
  const exclusionBuckets = groupBy(exclusions, (entry) => {
    if (
      entry.acquisitionKey ===
      "acquire:IL:ill-s-ct-r-298-application-for-waiver-of-court-fees"
    ) {
      return "IL:rule-298";
    }
    return `${entry.jurisdiction}:${entry.exclusionReason}`;
  });
  for (const [bucket, records] of [...exclusionBuckets.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const jurisdiction = records[0].jurisdiction;
    const specialIllinois = bucket === "IL:rule-298";
    addGroup({
      jobId: specialIllinois
        ? "rcap-il-in-repo-identity-reconciliation-rule-298"
        : `rcap-${jurisdiction.toLowerCase()}-in-repo-identity-reconciliation-${slugify(
            records[0].exclusionReason
          )}`,
      jurisdiction,
      strategyFamily: "in_repo_identity_reconciliation",
      reconciliationIds: records.map((record) => record.acquisitionKey),
      trackIds: sortedUnique(
        (inputs.sourceAcquisitionQueue.rows ?? [])
          .filter((row) =>
            records.some((record) => record.acquisitionKey === row.acquisitionKey)
          )
          .map((row) => row.trackId)
          .filter(Boolean)
      ),
      effort: specialIllinois ? "xhigh" : "high",
      commitSubject: specialIllinois
        ? "chore(record-clearing): reconcile Illinois Rule 298 retained identity"
        : undefined
    });
  }

  if (assigned.size !== documents.length) {
    const missing = documents
      .filter((document) => !assigned.has(document.acquisitionId))
      .map((document) => document.acquisitionId);
    throw new Error(
      `Acquisition aggregation omitted ${missing.length} records: ${missing.join(", ")}.`
    );
  }

  return groups.sort((left, right) => left.jobId.localeCompare(right.jobId));
}

function authorityStopCondition(strategyFamily, group = {}) {
  const byFamily = {
    in_repo_identity_reconciliation:
      "Use retained repository assets and deterministic identity mapping only. Do not download, " +
      "contact an issuer, alter legal design, or edit any adopted Master Library edition.",
    public_official_download:
      "Use only the assigned public official sources, record provenance and hashes, and stop if " +
      "identity, revision, or issuer authority is uncertain. Do not alter legal conclusions.",
    official_download_automation_blocked:
      "Preserve the 403/WAF or automation-blocked disposition distinctly. Record attended-retrieval " +
      "evidence only; never relabel the source as generically missing or infer an alternative.",
    direct_issuer_request:
      "Prepare a bounded issuer request and record its exact disposition. Do not send it without " +
      "separate authorization, and never relabel a direct-request source as a failed download.",
    commercial_license:
      "Treat availability and commercial permission as separate gates. generationAllowed must remain " +
      "false unless a written adopted license is present; never relabel the route as custom pleading.",
    local_form_scope_correction:
      "Set legalDesignReconciliationRequired=true and preserve the form's local scope. Do not promote " +
      "a local form statewide or modify the jurisdiction memo.",
    source_identity_resolution:
      "Resolve only the assigned identity from official evidence. Stop unresolved rather than guessing, " +
      "mapping a similar file, or changing legal design.",
    not_required_design_reconciliation:
      "Preserve the exact not-required reason, including custom pleading versus no participant filing. " +
      "Do not collapse it into source missing or alter an adopted strategy.",
    superseded_source_replacement:
      "Keep the supersession chain explicit and prevent the superseded identity from remaining the active " +
      "target. Do not silently discard either identity."
  };
  const instruction = byFamily[strategyFamily];
  if (!instruction) {
    throw new Error(`No authority safeguard is defined for ${strategyFamily}.`);
  }
  const jobSpecific = {
    "rcap-ar-public-official-download-acic-gaps":
      "For ACIC-UNIFORM-PETITION-TO-SEAL, preserve and bind the already-retained felony half. " +
      "Retrieve and hash only the missing misdemeanor half; do not re-download or replace the " +
      "retained felony identity.",
    "rcap-ks-source-identity-resolution-criminal-cover-sheet":
      "Resolving the cover-sheet identity does not clear the Kansas Judicial Council commercial-license gate. " +
      "Keep generation disallowed and do not substitute a custom pleading.",
    "rcap-in-commercial-license":
      "The four logical dossier identities resolve to two shared licensed PDF bundles. Acquire or license each " +
      "bundle once, retain all four identity mappings, and do not duplicate binaries."
  }[group.jobId];
  return `${instruction}${jobSpecific ? ` ${jobSpecific}` : ""} ${TERMINAL_INSTRUCTION}`;
}

function isMarylandAuthorityOnlyRoute(track, canonicalParentRecords) {
  if (track.jurisdiction !== "MD") return false;
  const completedMarylandParent = canonicalParentRecords.find(
    ({ data }) => data.jobId === "IMP-OF-01-md-district-court-form-family"
  )?.data;
  return (completedMarylandParent?.authorityOnlyRoutes ?? []).includes(track.trackId);
}

function isCanonicalNonImplementationTrack(track, canonicalParentRecords) {
  const matchingParents = canonicalParentRecords
    .map(({ data }) => data)
    .filter((parent) => (parent.tracks ?? []).includes(track.trackId));
  return (
    matchingParents.length > 0 &&
    matchingParents.every(
      (parent) => !String(parent.lane ?? "").startsWith("implementation-")
    )
  );
}

function classifyOfficialPdfTracks(inputs, tracks, rootDir) {
  const relationshipsByTrack = groupBy(
    inputs.sourceRelationships.relationships ?? [],
    (relationship) => `${relationship.jurisdiction}:${relationship.trackId}`
  );
  const artifactsByState = groupBy(
    (inputs.sourceArtifacts.artifacts ?? []).filter(
      (artifact) =>
        artifact.fileType === "pdf" &&
        artifact.presence === "present" &&
        artifact.currency !== "reference_only"
    ),
    (artifact) => artifact.jurisdiction
  );
  // Canonical source hierarchy for lane classification.
  //
  // A verified materialization receipt is the strongest evidence there is: its
  // structure was measured on the exact byte the worker will read. It therefore
  // outranks the private repository corpus, which is only an inventory of what
  // happens to sit in this checkout — a document retained solely in the adopted
  // authority archive has no corpus row at all, and letting that absence decide
  // the lane is what stranded New Jersey's CN-10557 and New York's CPL 160.59
  // packet with no owner despite both being exact, assignable identities.
  //
  // No inference from filename, folder or a similarly named private file. Where
  // neither a receipt nor a recorded technical class exists, the track stays
  // unclassified and the identity remains materialization-required rather than
  // being guessed into a lane.
  const receiptClassByTrack = new Map();
  const receiptDir = path.join(
    rootDir ?? process.cwd(),
    "data/record-clearing/production-factory/source-materialization-receipts"
  );
  if (fs.existsSync(receiptDir)) {
    for (const name of fs.readdirSync(receiptDir).sort()) {
      if (!name.endsWith(".json")) continue;
      const receipt = JSON.parse(
        fs.readFileSync(path.join(receiptDir, name), "utf8")
      );
      const structuralClass = receipt.sourceStructure?.structuralClass;
      if (
        receipt.workerReady !== true ||
        receipt.hashAndMediaVerified !== true ||
        !["clean_acroform", "dirty_acroform", "flat_pdf", "scanned_pdf"].includes(
          structuralClass
        )
      ) {
        continue;
      }
      for (const binding of receipt.usageBindings ?? []) {
        if (!binding.trackId) continue;
        const key = `${receipt.jurisdiction}:${binding.trackId}`;
        const classes = receiptClassByTrack.get(key) ?? new Set();
        classes.add(structuralClass);
        receiptClassByTrack.set(key, classes);
      }
    }
  }

  const acroform = [];
  const overlay = [];
  const unclassified = [];

  for (const track of tracks.filter(
    (entry) => entry.outputStrategy === "official_pdf_fill" && !isComposedTrack(entry)
  )) {
    const trackKey = `${track.jurisdiction}:${track.trackId}`;
    const relationships = relationshipsByTrack.get(trackKey) ?? [];
    const artifacts = artifactsByState.get(track.jurisdiction) ?? [];
    const receiptClasses = receiptClassByTrack.get(trackKey) ?? new Set();
    const corpus = new Set();
    for (const relationship of relationships) {
      for (const artifact of artifacts) {
        if (relationshipMatchesArtifact(relationship, artifact)) {
          corpus.add(artifact.technicalClass);
        }
      }
    }
    // A receipt was measured on the exact byte the worker will read and is
    // keyed on the identity. Corpus evidence is a name match against whatever
    // happens to sit in this checkout, so it can attach a neighbouring
    // document: Vermont's petition 200-00130 matches the scanned instructions
    // sheet 200-00130A, and six sealing tracks whose petition is a verified
    // 48-field AcroForm would otherwise be routed to the coordinate-overlay
    // lane on the strength of a scan of a document they do not use. Where a
    // receipt exists it decides alone. Where none exists the corpus still
    // speaks, so no track loses a classification it already had.
    const classes = receiptClasses.size > 0 ? new Set(receiptClasses) : corpus;

    if ([...classes].some((value) => ["flat_pdf", "scanned_pdf"].includes(value))) {
      overlay.push(track);
    } else if (
      [...classes].some((value) => ["clean_acroform", "dirty_acroform"].includes(value))
    ) {
      acroform.push(track);
    } else if (
      classes.size === 0 ||
      ![...classes].some((value) =>
        ["clean_acroform", "dirty_acroform", "flat_pdf", "scanned_pdf"].includes(value)
      )
    ) {
      unclassified.push(track);
    }
  }

  // Deduplicate defensively: a track reaching a lane twice would compile a
  // second implementation job under the same id.
  const dedupe = (list) => {
    const seen = new Set();
    return list.filter((track) => {
      const key = `${track.jurisdiction}:${track.trackId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  return {
    acroform: dedupe(acroform).sort(compareTracks),
    overlay: dedupe(overlay).sort(compareTracks),
    unclassified: dedupe(unclassified).sort(compareTracks)
  };
}

function applyOfficialPdfAssignments({
  rootDir,
  jobs,
  inputs,
  sourceMaterializationFoundationJobId
}) {
  const projectionIssues = validateOfficialPdfSourceProjection(
    inputs.officialPdfSourceProjection
  );
  if (projectionIssues.length > 0) {
    throw new Error(
      "Invalid official-PDF source projection:\n- " +
        projectionIssues.join("\n- ")
    );
  }
  const projectionPath = FACTORY_INPUT_PATHS.officialPdfSourceProjection;
  const projectionSha256 = sha256File(path.join(rootDir, projectionPath));
  const materializationRoot =
    typeof process.env.RCAP_SOURCE_MATERIALIZATION_ROOT === "string" &&
    process.env.RCAP_SOURCE_MATERIALIZATION_ROOT.trim() !== ""
      ? process.env.RCAP_SOURCE_MATERIALIZATION_ROOT
      : null;
  const unownedAssignableIdentities = [];
  const sourceJobs = jobs.filter(
    (job) =>
      ["acroform_fill", "flat_pdf_overlay", "composed_route"].includes(
        job.lane
      ) &&
      (
        job.status !== "completed" ||
        COMPLETED_OFFICIAL_PDF_IMPLEMENTATIONS.some(
          (record) => record.jobId === job.jobId
        )
      )
  );
  const assignmentRows = inputs.officialPdfSourceProjection.identities.filter(
    (identity) => identity.assignmentEligible
  );
  const rowsByOwner = new Map(sourceJobs.map((job) => [job.jobId, []]));
  const consumersByJob = new Map(sourceJobs.map((job) => [job.jobId, []]));

  for (const identity of assignmentRows) {
    let candidates = sourceJobs
      .filter(
        (job) =>
          job.jurisdiction === identity.jurisdiction &&
          job.trackIds.some((trackId) =>
            identity.trackIds.includes(trackId)
          )
      )
      .sort(
        (left, right) =>
          officialPdfOwnerScore(right, identity) -
            officialPdfOwnerScore(left, identity) ||
          left.jobId.localeCompare(right.jobId)
      );
    if (candidates.length === 0) {
      candidates = sourceJobs
        .filter(
          (job) =>
            job.jurisdiction === identity.jurisdiction &&
            job.lane === identity.implementationFamily
        )
        .sort((left, right) => left.jobId.localeCompare(right.jobId));
    }
    if (candidates.length === 0) {
      // The source projection resolved this identity from the adopted authority
      // archive, but no official-PDF implementation job covers its tracks: the
      // lane classifier reads the private repository corpus, which holds no row
      // for a document retained only in the archive. That is a real gap in the
      // implementation lane, not in the source, so it is recorded as a typed
      // blocker on the identity rather than crashing the plan or inventing a
      // lane owner for it.
      unownedAssignableIdentities.push({
        identityKey: identity.identityKey,
        jurisdiction: identity.jurisdiction,
        documentId: identity.officialDocument?.documentId ?? null,
        implementationFamily: identity.implementationFamily ?? null,
        trackIds: [...(identity.trackIds ?? [])],
        blocker: "implementation_lane_owner_absent",
        identity
      });
      continue;
    }
    const owner = candidates[0];
    rowsByOwner.get(owner.jobId).push(identity);
    for (const consumer of candidates.slice(1)) {
      const uses = identity.componentUses.filter((use) =>
        consumer.trackIds.includes(use.trackId)
      );
      if (uses.length === 0) continue;
      consumersByJob.get(consumer.jobId).push({
        identityKey: identity.identityKey,
        ownerJobId: owner.jobId,
        componentUses: uses
      });
      if (
        consumer.lane === "composed_route" &&
        owner.jobId !== consumer.jobId
      ) {
        consumer.dependencies = sortedUnique([
          ...consumer.dependencies,
          owner.jobId
        ]);
      }
    }
  }

  for (const job of sourceJobs) {
    const assignedRows = (rowsByOwner.get(job.jobId) ?? []).sort((left, right) =>
      left.identityKey.localeCompare(right.identityKey)
    );
    const materializationInputs = assignedRows.map((identity) => {
      const verification = inspectOfficialPdfMaterialization({
        identity,
        materializationRoot,
        ownerJobId: job.jobId,
        rootDir
      });
      return officialPdfMaterializationInput(identity, verification, {
        consumerJobId: job.jobId,
        rootDir
      });
    });
    const relatedBlocked = inputs.officialPdfSourceProjection.identities
      .filter(
        (identity) =>
          identity.jurisdiction === job.jurisdiction &&
          identity.trackIds.some((trackId) => job.trackIds.includes(trackId)) &&
          !identity.assignmentEligible
      )
      .map((identity) => ({
        identityKey: identity.identityKey,
        disposition: identity.disposition
      }))
      .sort((left, right) => left.identityKey.localeCompare(right.identityKey));
    const consumers = (consumersByJob.get(job.jobId) ?? []).sort((left, right) =>
      left.identityKey.localeCompare(right.identityKey)
    );
    if (materializationInputs.length > 0) {
      job.sourceMaterializationInputs = materializationInputs;
      job.integrationOwnedOutputs = sortedUnique([
        ...job.integrationOwnedOutputs,
        ...materializationInputs.map((input) => input.receiptOutput)
      ]);
      job.requiredInputs = sortedUnique([
        ...job.requiredInputs,
        projectionPath,
        ...materializationInputs.map(
          (input) => input.materializationDestination
        )
      ]);
      job.focusedValidation = sortedUnique([
        ...job.focusedValidation,
        ...materializationInputs.map((input) => input.verificationCommand)
      ]);
      job.dependencies = sortedUnique([
        ...job.dependencies,
        sourceMaterializationFoundationJobId
      ]);
    } else {
      delete job.sourceMaterializationInputs;
      job.requiredInputs = sortedUnique([...job.requiredInputs, projectionPath]);
    }
    job.officialPdfAssignment = {
      schemaVersion: "rcap-official-pdf-child-assignment/v1",
      projectionPath,
      projectionSha256,
      assignmentState: "blocked_no_exact_identity_assignment",
      identityKeys: assignedRows.map((identity) => identity.identityKey),
      newImplementationIdentityKeys: assignedRows
        .filter(
          (identity) =>
            !EXISTING_IMPLEMENTATION_MATERIALIZATION_ONLY_IDENTITIES.has(
              `${identity.jurisdiction}:${identity.officialDocument.documentId}`
            )
        )
        .map((identity) => identity.identityKey),
      existingImplementationMaterializationOnlyIdentityKeys: assignedRows
        .filter((identity) =>
          EXISTING_IMPLEMENTATION_MATERIALIZATION_ONLY_IDENTITIES.has(
            `${identity.jurisdiction}:${identity.officialDocument.documentId}`
          )
        )
        .map((identity) => identity.identityKey),
      documentIds: sortedUnique(
        assignedRows.map(
          (identity) => identity.officialDocument.documentId
        )
      ),
      exactTrackIds: sortedUnique(
        assignedRows.flatMap((identity) => identity.trackIds)
      ),
      exactComponentIds: sortedUnique(
        assignedRows.flatMap((identity) => identity.componentIds)
      ),
      componentUses: assignedRows.flatMap((identity) =>
        identity.componentUses.map((use) => ({
          ...use,
          identityKey: identity.identityKey
        }))
      ),
      implementationFamilies: sortedUnique(
        assignedRows
          .map((identity) => identity.implementationFamily)
          .filter(Boolean)
      ),
      fieldOwnershipScaffolds: sortedUnique(
        assignedRows.map((identity) => identity.fieldOwnershipScaffold)
      ),
      legalDesignDependencies: sortedUnique(
        assignedRows.map((identity) => identity.legalDesignDependency)
      ),
      materializationDependencies: [
        sourceMaterializationFoundationJobId
      ],
      unresolvedOrTerminalIdentities: relatedBlocked,
      expectedOutputs: [...job.expectedOutputs],
      ownedPaths: [...job.ownedPaths],
      focusedVerifier: job.regressionVerifier,
      runtimeDisabledInvariant: true,
      workerMayAcquireOrMaterializeSources: false,
      assignmentBlockers: []
    };
    if (assignedRows.length > 0) {
      if (
        job.assignmentClaim &&
        job.assignmentClaim.ownerSession !== "SESSION_E"
      ) {
        throw new Error(
          `${job.jobId} has a non-Session-E claim collision.`
        );
      }
      job.assignmentClaim = {
        targetType: "compiled_job",
        jobId: job.jobId,
        jurisdiction: job.jurisdiction,
        ownerSession: "SESSION_E",
        status: "reserved"
      };
    }
    if (consumers.length > 0) {
      job.officialPdfConsumerDependencies = consumers;
    } else {
      delete job.officialPdfConsumerDependencies;
    }
  }

  for (const job of sourceJobs) {
    const assignment = job.officialPdfAssignment;
    const materializationInputs = job.sourceMaterializationInputs ?? [];
    const materializationReady =
      assignment.identityKeys.length > 0 &&
      materializationInputs.length === assignment.identityKeys.length &&
      materializationInputs.every(
        (input) =>
          input.materializationState ===
            "binary_materialized_hash_verified" &&
          input.workerReadiness === "worker_ready"
      );
    const projectionBlockers = assignment.identityKeys.flatMap(
      (identityKey) => {
        const identity = inputs.officialPdfSourceProjection.identities.find(
          (candidate) => candidate.identityKey === identityKey
        );
        if (!identity) return ["projection_identity_absent"];
        return (identity.assignmentBlockers ?? []).filter(
          (blocker) =>
            blocker !== "exact_source_archive_not_materialized" ||
            !materializationReady
        );
      }
    );
    const terminalBlockers = assignment.unresolvedOrTerminalIdentities.map(
      (identity) => identity.disposition
    );
    const dependencyBlockers = job.dependencies
      .filter(
        (dependencyId) =>
          jobs.find((candidate) => candidate.jobId === dependencyId)?.status !==
          "completed"
      )
      .map((dependencyId) => `dependency_incomplete:${dependencyId}`);
    assignment.assignmentBlockers = sortedUnique([
      ...projectionBlockers,
      ...terminalBlockers,
      ...dependencyBlockers
    ]);
    const ready =
      materializationReady &&
      assignment.unresolvedOrTerminalIdentities.length === 0 &&
      assignment.assignmentBlockers.length === 0;
    assignment.assignmentState = ready
      ? "exact_pinned_assignment_worker_ready"
      : assignment.identityKeys.length > 0
        ? materializationReady
          ? "exact_pinned_assignment_blocked_non_source_dependencies"
          : "exact_pinned_assignment_blocked_external_materialization"
        : "blocked_no_exact_identity_assignment";
    if (job.status === "completed") {
      if (!ready) {
        // Name what stopped verifying. This threw with the fact alone, which
        // says a completed job broke without saying what broke, and the whole
        // plan is unbuildable until someone works it out by hand. The three
        // ways it can happen — an identity that no longer resolves, an
        // unmaterialized archive, an unfinished dependency — are recorded right
        // here, so carry them into the message rather than making the reader
        // rediscover them.
        throw new Error(
          `${job.jobId} cannot remain completed after its exact source assignment stopped verifying: ` +
            `${assignment.assignmentState}; ` +
            `blockers [${assignment.assignmentBlockers.join(", ") || "none"}]; ` +
            `unresolved or terminal identities [${
              assignment.unresolvedOrTerminalIdentities
                .map((identity) => identity.identityKey ?? identity.disposition)
                .join(", ") || "none"
            }].`
        );
      }
      assignment.assignmentState = "exact_pinned_assignment_implemented";
      continue;
    }
    job.status = ready ? "ready" : "blocked";
  }

  // A route whose components are entirely custom pleading or process guidance
  // has no official-form component anywhere in the audited queue, so it can
  // never acquire an exact identity and would sit blocked in the official-PDF
  // lane forever, reading as outstanding PDF work that does not exist. Those
  // are marked not applicable to this lane rather than left as permanent
  // blockers. A genuine official-PDF job missing an identity is untouched: it
  // has queue components, and it stays blocked on them.
  // The projection dispositions every queue document, so the tracks it names
  // are exactly the tracks the audited queue carries an official-form component
  // for — whatever that component's disposition turned out to be.
  const queueComponentTracks = new Set(
    (inputs.officialPdfSourceProjection?.identities ?? []).flatMap((identity) =>
      (identity.trackIds ?? []).map(
        (trackId) => `${identity.jurisdiction}:${trackId}`
      )
    )
  );
  for (const job of sourceJobs) {
    if ((job.officialPdfAssignment?.identityKeys?.length ?? 0) > 0) continue;
    if (job.status === "completed" || job.status === "cancelled") continue;
    const hasQueueComponent = (job.trackIds ?? []).some((trackId) =>
      queueComponentTracks.has(`${job.jurisdiction}:${trackId}`)
    );
    if (hasQueueComponent) continue;
    job.status = "cancelled";
    job.officialPdfAssignment = {
      ...(job.officialPdfAssignment ?? {}),
      assignmentState: "not_applicable_no_official_pdf_component",
      assignmentBlockers: []
    };
    job.executionNote =
      `${job.jobId} has no official-form component in the audited production ` +
      "queue: every component on its tracks is a custom pleading or process " +
      "guidance. It is not applicable to official-PDF implementation and is " +
      "carried by the custom-pleading and guidance lanes instead. The route " +
      "itself is unaffected; only this lane's claim on it is withdrawn.";
  }

  const assignedIdentityCount = [...rowsByOwner.values()].reduce(
    (total, rows) => total + rows.length,
    0
  );
  // Every eligible identity is either assigned to an owning job or explicitly
  // recorded as having no implementation lane to own it. The partition must be
  // exact: an identity that is neither would be silently dropped, which is the
  // failure this check exists to prevent.
  if (
    assignedIdentityCount + unownedAssignableIdentities.length !==
    assignmentRows.length
  ) {
    throw new Error(
      `Official-PDF child assignments cover ${assignedIdentityCount} assigned plus ` +
        `${unownedAssignableIdentities.length} lane-unowned of ` +
        `${assignmentRows.length} eligible implementation identities.`
    );
  }
  return {
    unownedAssignableIdentities: unownedAssignableIdentities.sort((left, right) =>
      left.identityKey.localeCompare(right.identityKey)
    )
  };
}

function officialPdfOwnerScore(job, identity) {
  if (job.lane === identity.implementationFamily) return 30;
  if (job.lane !== "composed_route") return 20;
  return 10;
}

/**
 * Source-materialization owners for authority-manifested sources that no
 * implementation job covers yet.
 *
 * The lifecycle used to be circular: the lane classifier wants a verified
 * receipt before it will assign a renderer family, the receipt names the job
 * that owns the source, and no such job exists until the lane is assigned. New
 * Jersey's CN-10557 and New York's CPL 160.59 packet sat in that loop — exact,
 * authority-manifested, externally verified, and unownable.
 *
 * This breaks it by making source materialization its own lifecycle stage:
 *
 *   exact authority identity -> source-materialization owner -> verified
 *   receipt -> technical structure -> implementation-family owner
 *
 * The owner needs only an exact identity, an authority asset, a role, an
 * archive path and expected bytes. It does not need a renderer, a field map, an
 * implementation job, a private-corpus row or a packet proof. Once a receipt
 * exists the job is retained as the historical materialization owner even after
 * an implementation job starts consuming it, so provenance never moves.
 */
function addAuthorityBackedSourceMaterializationJobs({
  rootDir,
  addJob,
  inputs,
  unownedAssignableIdentities,
  sourceMaterializationFoundationJobId
}) {
  const receiptDir = path.join(
    rootDir,
    "data/record-clearing/production-factory/source-materialization-receipts"
  );
  const ownedByReceipt = new Map();
  if (fs.existsSync(receiptDir)) {
    for (const name of fs.readdirSync(receiptDir).sort()) {
      if (!name.endsWith(".json")) continue;
      const receipt = JSON.parse(
        fs.readFileSync(path.join(receiptDir, name), "utf8")
      );
      if (typeof receipt.materializationOwnerJobId === "string") {
        ownedByReceipt.set(
          receipt.provenance?.sourceIdentityKey ?? name.replace(/\.json$/u, ""),
          receipt
        );
      }
    }
  }

  const candidates = new Map();
  for (const entry of unownedAssignableIdentities) {
    if (!entry.identity?.exactSourceContract) continue;
    candidates.set(entry.identityKey, entry.identity);
  }
  // A source whose receipt already names a materialization owner keeps that job
  // even once an implementation job consumes the receipt.
  for (const [identityKey] of ownedByReceipt) {
    if (candidates.has(identityKey)) continue;
    const identity = (
      inputs.officialPdfSourceProjection.identities ?? []
    ).find((candidate) => candidate.identityKey === identityKey);
    if (identity?.exactSourceContract) candidates.set(identityKey, identity);
  }

  for (const [identityKey, identity] of [...candidates.entries()].sort(
    ([left], [right]) => left.localeCompare(right)
  )) {
    const verification = inspectOfficialPdfMaterialization({
      identity,
      materializationRoot:
        typeof process.env.RCAP_SOURCE_MATERIALIZATION_ROOT === "string" &&
        process.env.RCAP_SOURCE_MATERIALIZATION_ROOT.trim() !== ""
          ? process.env.RCAP_SOURCE_MATERIALIZATION_ROOT
          : null,
      ownerJobId: sourceMaterializationJobIdFor(identity),
      rootDir
    });
    const input = officialPdfMaterializationInput(identity, verification);
    const jobId = sourceMaterializationJobIdFor(identity);
    const job = addJob({
      lane: "platform_foundation",
      jurisdiction: identity.jurisdiction,
      jobId,
      strategyFamily: "authority_backed_source_materialization",
      trackIds: [],
      executionScope: "captain",
      status: verification.ready ? "completed" : "ready",
      model: "opus",
      effort: "high",
      participantPacketProofRequired: false,
      dependencies: [sourceMaterializationFoundationJobId],
      expectedOutputs: [input.receiptOutput],
      ownedPaths: [input.receiptOutput],
      // The receipts directory stays forbidden to every worker. This captain
      // job owns exactly one receipt inside it — its own — which is the whole
      // point of giving a source a lifecycle owner.
      forbiddenPaths: GLOBAL_WORKER_FORBIDDEN_PATHS.filter(
        (candidate) =>
          !input.receiptOutput.startsWith(candidate) &&
          candidate !== input.receiptOutput
      ),
      requiredInputs: [
        FACTORY_INPUT_PATHS.authority,
        OFFICIAL_PDF_SOURCE_PROJECTION_PATH
      ],
      focusedValidation: [input.verificationCommand],
      commitSubject:
        `chore(record-clearing): materialize ${identity.jurisdiction} ` +
        `${identity.officialDocument?.documentId ?? identityKey}`,
      stopCondition:
        `Materialize the exact authority asset for ${identityKey} into the sealed ` +
        "portable source root and record its verified receipt. Extract only from the adopted " +
        "authority archive; never from the private corpus, a repository capture or a similarly " +
        "named file. Do not rebuild, recompress, flatten or rename the binary, do not commit it, " +
        "do not assign a renderer family or field map, and do not enable runtime, promote, or " +
        "deploy. " +
        TERMINAL_INSTRUCTION
    });
    job.sourceMaterializationInputs = [input];
    job.integrationOwnedOutputs = sortedUnique([
      ...(job.integrationOwnedOutputs ?? [])
    ]);
  }
}

/**
 * The authorization corpus, read once per root per compile. Plan compilation
 * touches every identity and the corpus does not change underneath it.
 */
const SOURCE_AUTHORIZATION_INDEX_CACHE = new Map();
function sourceAuthorizationIndex(rootDir) {
  const key = rootDir ?? process.cwd();
  if (!SOURCE_AUTHORIZATION_INDEX_CACHE.has(key)) {
    SOURCE_AUTHORIZATION_INDEX_CACHE.set(
      key,
      buildSourceAuthorizationIndex(key)
    );
  }
  return SOURCE_AUTHORIZATION_INDEX_CACHE.get(key);
}

function sourceMaterializationJobIdFor(identity) {
  return `${identity.identityKey}-source-materialization`;
}

function officialPdfMaterializationInput(
  identity,
  verification,
  { consumerJobId = null, rootDir = null } = {}
) {
  const source = identity.exactSourceContract;
  // Who materialized the source and who is allowed to read it are two
  // different jobs. A dedicated source-materialization job can own a receipt
  // before any implementation exists, and the implementation later consumes it
  // without becoming its owner. Carrying both on the input is what lets a
  // consumer be checked against the receipt without the receipt having to
  // claim the consumer wrote it.
  const receiptOutput = sourceMaterializationReceiptPath(identity.identityKey);
  let materializationOwnerJobId = consumerJobId;
  if (rootDir) {
    try {
      const receipt = JSON.parse(
        fs.readFileSync(path.join(rootDir, receiptOutput), "utf8")
      );
      if (typeof receipt.materializationOwnerJobId === "string") {
        materializationOwnerJobId = receipt.materializationOwnerJobId;
      } else if (typeof receipt.assignmentJobId === "string") {
        materializationOwnerJobId = receipt.assignmentJobId;
      }
    } catch {
      // No receipt yet: the consuming job is the prospective owner.
    }
  }
  const verificationCommand =
    "node scripts/verify-rcap-materialized-source.mjs " +
    `--source-identity-key ${identity.identityKey} ` +
    `--sha256 ${source.expectedSha256} --bytes ${source.expectedBytes}`;
  // Permission is read from the integrated decision corpus, per jurisdiction
  // and — where a decision scopes itself to named documents — per document.
  const authorization = authorizationFor(
    sourceAuthorizationIndex(rootDir),
    {
      jurisdiction: identity.jurisdiction,
      documentId: identity.officialDocument?.documentId ?? null
    }
  );
  const lifecycle = deriveSourceLifecycle({
    receiptVerified: verification.ready === true,
    authorization
  });
  return {
    sourceIdentityKey: identity.identityKey,
    documentId: identity.officialDocument.documentId,
    materializationOwnerJobId,
    downstreamImplementationConsumerJobId: consumerJobId,
    authorityEdition: source.authorityEdition,
    authorityArchiveSha256: source.sourceArchiveSha256,
    jurisdiction: identity.jurisdiction,
    documentRole: identity.officialDocument.documentRole,
    expectedMediaType: source.expectedMime,
    expectedSha256: source.expectedSha256,
    expectedBytes: source.expectedBytes,
    canonicalAuthorityPath: source.archiveRelativePath,
    repositorySourcePath: source.archiveRelativePath,
    portableLocator: source.portableSourceLocator,
    materializationDestination: source.materializationDestination,
    receiptOutput: sourceMaterializationReceiptPath(identity.identityKey),
    readOnlyTreatment: "worker_read_only_no_modify",
    retentionPolicy:
      "retain_until_worker_integration_then_captain_managed_cleanup",
    expectedMeasurementBasis: "carried_forward_registry_measurement",
    identityBindingStatus: "exact_pinned_identity",
    authorityAssetState: "authority_asset_known",
    registryState: "registry_metadata_present",
    // Evidence and permission, kept apart. `verification.ready` is a
    // measurement — bytes, hash, size, mode — and it establishes custody of the
    // evidence and nothing else. Worker readiness additionally requires that
    // the controlling licence decision permits the reproduction we intend.
    // Colorado is the case that made the difference visible: twelve receipts
    // that verify exactly, against a terminal `written_permission_required`.
    materializationState: verification.ready
      ? "binary_materialized_hash_verified"
      : "binary_materialization_required",
    workerReadiness: lifecycle.workerReady
      ? "worker_ready"
      : verification.ready
        ? "generation_permission_required"
        : "binary_materialization_required",
    sourceLifecycle: lifecycle,
    sourceAuthorization: {
      verdict: authorization.verdict,
      generationAllowed: authorization.generationAllowed,
      licenseAdopted: authorization.licenseAdopted,
      blocker: authorization.blocker,
      decisionJobId: authorization.decisionJobId
    },
    // Internal verification of retained evidence is always permitted; it is
    // what a receipt is for. Participant-facing reproduction is not.
    workerMayRead: true,
    workerMayModify: false,
    verificationCommand,
    usageBindings: identity.componentUses.map((use) => ({
      trackId: use.trackId,
      componentId: use.componentId
    })),
    provenance: {
      projectionPath: OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
      sourceIdentityKey: identity.identityKey,
      freshLocalVerification: verification.ready,
      localVerificationState: verification.state,
      registryPresenceConfersReadiness: false
    }
  };
}

function inspectOfficialPdfMaterialization({
  identity,
  materializationRoot,
  ownerJobId,
  rootDir
}) {
  if (!materializationRoot) {
    return {
      ready: false,
      state: "external_materialization_root_absent"
    };
  }
  const source = identity.exactSourceContract;
  let root;
  try {
    root = fs.realpathSync(path.resolve(materializationRoot));
    const rootStat = fs.lstatSync(root);
    if (
      !rootStat.isDirectory() ||
      rootStat.isSymbolicLink() ||
      (rootStat.mode & 0o777) !== 0o555
    ) {
      return {
        ready: false,
        state: "external_materialization_root_not_sealed"
      };
    }
  } catch {
    return {
      ready: false,
      state: "external_materialization_root_absent"
    };
  }

  const destination = path.resolve(
    root,
    ...source.materializationDestination.split("/")
  );
  const relative = path.relative(root, destination);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    return {
      ready: false,
      state: "materialization_destination_escape"
    };
  }

  let current = path.dirname(destination);
  while (true) {
    let currentStat;
    try {
      currentStat = fs.lstatSync(current);
    } catch {
      return {
        ready: false,
        state: "materialized_source_absent"
      };
    }
    if (
      !currentStat.isDirectory() ||
      currentStat.isSymbolicLink() ||
      (currentStat.mode & 0o777) !== 0o555
    ) {
      return {
        ready: false,
        state: "materialization_boundary_not_sealed"
      };
    }
    if (current === root) break;
    const parent = path.dirname(current);
    if (parent === current) {
      return {
        ready: false,
        state: "materialization_destination_escape"
      };
    }
    current = parent;
  }

  let stat;
  try {
    stat = fs.lstatSync(destination);
  } catch {
    return {
      ready: false,
      state: "materialized_source_absent"
    };
  }
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1 ||
    (stat.mode & 0o222) !== 0
  ) {
    return {
      ready: false,
      state: "materialized_source_not_read_only_regular_file"
    };
  }
  let realDestination;
  try {
    realDestination = fs.realpathSync(destination);
  } catch {
    return {
      ready: false,
      state: "materialized_source_absent"
    };
  }
  const realRelative = path.relative(root, realDestination);
  if (
    realRelative === ".." ||
    realRelative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(realRelative)
  ) {
    return {
      ready: false,
      state: "materialization_destination_escape"
    };
  }
  if (stat.size !== source.expectedBytes) {
    return {
      ready: false,
      state: "materialized_source_size_mismatch"
    };
  }
  const bytes = fs.readFileSync(destination);
  if (
    bytes.subarray(0, 5).toString("ascii") !== "%PDF-" ||
    crypto.createHash("sha256").update(bytes).digest("hex") !==
      source.expectedSha256
  ) {
    return {
      ready: false,
      state: "materialized_source_hash_or_mime_mismatch"
    };
  }
  const receiptPath = path.join(
    rootDir,
    sourceMaterializationReceiptPath(identity.identityKey)
  );
  let receipt;
  try {
    receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
  } catch {
    return {
      ready: false,
      state: "materialization_receipt_absent"
    };
  }
  const receiptWithoutEnvelope = Object.fromEntries(
    Object.entries(receipt).filter(
      ([key]) => key !== "receiptSha256" && key !== "materializationAction"
    )
  );
  const expectedStates = [
    "authority_asset_known",
    "registry_metadata_present",
    "binary_materialized",
    "binary_hash_verified",
    "worker_read_authorized",
    "worker_ready"
  ];
  if (
    receipt.schemaVersion !== "rcap-source-materialization-result/v1" ||
    receipt.authorityEdition !== source.authorityEdition ||
    receipt.authorityArchiveSha256 !== source.sourceArchiveSha256 ||
    receipt.jurisdiction !== identity.jurisdiction ||
    receipt.documentId !== identity.officialDocument.documentId ||
    receipt.documentRole !== identity.officialDocument.documentRole ||
    receipt.canonicalAuthorityPath !== source.archiveRelativePath ||
    receipt.expectedSha256 !== source.expectedSha256 ||
    receipt.actualSha256 !== source.expectedSha256 ||
    receipt.expectedBytes !== source.expectedBytes ||
    receipt.actualBytes !== source.expectedBytes ||
    receipt.expectedMediaType !== source.expectedMime ||
    receipt.actualMediaType !== source.expectedMime ||
    receipt.portableLocator !== source.portableSourceLocator ||
    receipt.portableLocatorSha256 !==
      crypto
        .createHash("sha256")
        .update(JSON.stringify(source.portableSourceLocator))
        .digest("hex") ||
    receipt.materializationDestination !==
      source.materializationDestination ||
    receipt.locatorScheme !== "attorney-review-package" ||
    receipt.readOnlyTreatment !== "worker_read_only_no_modify" ||
    // The job that materialized a source stays its historical owner. A later
    // implementation job consumes the receipt without becoming that owner, so a
    // receipt whose assignmentJobId names its own recorded materialization owner
    // remains valid when ownership moves downstream. Without this, giving a
    // source a lifecycle owner before an implementation job existed would
    // invalidate the receipt the moment the implementation job appeared.
    (receipt.assignmentJobId !== ownerJobId &&
      !(
        typeof receipt.materializationOwnerJobId === "string" &&
        receipt.materializationOwnerJobId === receipt.assignmentJobId
      )) ||
    !/^[0-9a-f]{40}$/u.test(receipt.assignmentBaseCommit ?? "") ||
    !SHA256_PATTERN.test(receipt.assignmentManifestSha256 ?? "") ||
    receipt.localVerificationBasis !== "freshly_verified_local_bytes" ||
    receipt.state !== "worker_ready" ||
    JSON.stringify(receipt.states) !== JSON.stringify(expectedStates) ||
    receipt.actualMode !== 0o444 ||
    receipt.hashAndMediaVerified !== true ||
    receipt.workerReady !== true ||
    receipt.ready !== true ||
    receipt.provenance?.freshLocalVerification !== true ||
    receipt.provenance?.registryPresenceConfersReadiness !== false ||
    !["verified_existing_binary", "materialized_verified_binary"].includes(
      receipt.materializationAction
    ) ||
    receipt.receiptSha256 !==
      crypto
        .createHash("sha256")
        .update(canonicalReceiptJson(receiptWithoutEnvelope))
        .digest("hex")
  ) {
    return {
      ready: false,
      state: "materialization_receipt_invalid"
    };
  }
  return {
    ready: true,
    state:
      "fresh_local_hash_size_mime_boundary_and_receipt_verified"
  };
}

function sourceMaterializationReceiptPath(identityKey) {
  return `${SOURCE_MATERIALIZATION_RECEIPT_DIR}/${identityKey}.json`;
}

function canonicalReceiptJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalReceiptJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalReceiptJson(value[key])}`
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function legalReviewMaterializationVerified(rootDir, assignment) {
  const reviewPath = path.join(
    rootDir,
    assignment.activeReview.materializationDestination
  );
  const receiptPath = path.join(rootDir, assignment.receiptOutput);
  if (!fs.existsSync(reviewPath) || !fs.existsSync(receiptPath)) return false;
  const reviewStat = fs.lstatSync(reviewPath);
  if (
    !reviewStat.isFile() ||
    reviewStat.isSymbolicLink() ||
    reviewStat.nlink !== 1 ||
    (reviewStat.mode & 0o222) !== 0
  ) {
    return false;
  }
  const bytes = fs.readFileSync(reviewPath);
  const observedSha256 = crypto
    .createHash("sha256")
    .update(bytes)
    .digest("hex");
  if (observedSha256 !== assignment.activeReview.expectedSha256) return false;
  let observedTitle;
  let observedJurisdictionMarker;
  try {
    const reviewText = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    observedTitle =
      reviewText
        .split(/\r?\n/u)
        .map((line) => line.match(/^#\s+(.+?)\s*$/u)?.[1] ?? null)
        .find(Boolean) ?? null;
    const jurisdictionMarkers = reviewText
      .split(/\r?\n/u)
      .map(
        (line) =>
          line.match(/^\*\*JURISDICTION:\s*(.+?)\s*\*\*\s*$/iu)?.[1] ??
          null
      )
      .filter(Boolean);
    observedJurisdictionMarker =
      jurisdictionMarkers.length === 1 ? jurisdictionMarkers[0] : null;
  } catch {
    return false;
  }
  if (
    observedTitle !== assignment.activeReview.expectedTitle ||
    observedJurisdictionMarker === null ||
    !observedJurisdictionMarker
      .toLocaleUpperCase("en-US")
      .includes(
        assignment.activeReview.expectedJurisdictionName.toLocaleUpperCase(
          "en-US"
        )
      )
  ) {
    return false;
  }
  let receipt;
  try {
    receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
  } catch {
    return false;
  }
  return (
    receipt.schemaVersion ===
      "rcap-legal-review-materialization-receipt/v1" &&
    receipt.jobId === assignment.jobId &&
    receipt.jurisdiction === assignment.jurisdiction &&
    receipt.archiveSha256 ===
      assignment.activeReview.expectedArchiveSha256 &&
    receipt.archiveEntryPath ===
      assignment.activeReview.archiveRelativePath &&
    receipt.expectedReviewSha256 ===
      assignment.activeReview.expectedSha256 &&
    receipt.observedReviewSha256 === observedSha256 &&
    receipt.observedReviewBytes === bytes.length &&
    receipt.observedMime === assignment.activeReview.expectedMime &&
    receipt.expectedTitle === assignment.activeReview.expectedTitle &&
    receipt.observedTitle === assignment.activeReview.expectedTitle &&
    receipt.expectedJurisdictionName ===
      assignment.activeReview.expectedJurisdictionName &&
    receipt.observedJurisdictionMarker === observedJurisdictionMarker &&
    receipt.activeReviewCount === assignment.expectedActiveReviewCount &&
    receipt.addendumCount === assignment.expectedAddendumCount &&
    receipt.materializationDestination ===
      assignment.activeReview.materializationDestination &&
    receipt.materializationState === "binary_hash_verified" &&
    receipt.verificationStatus === "binary_hash_and_size_verified" &&
    receipt.readOnly === true
  );
}

function exactLegalReviewArchiveAvailable(contract) {
  const archivePath = process.env.RCAP_AUTHORITY_ARCHIVE_PATH;
  if (
    typeof archivePath !== "string" ||
    archivePath.trim() === "" ||
    !SHA256_PATTERN.test(contract.sourceArchive?.expectedSha256 ?? "") ||
    !Number.isSafeInteger(contract.sourceArchive?.expectedBytes) ||
    contract.sourceArchive.expectedBytes <= 0
  ) {
    return false;
  }
  let stat;
  try {
    stat = fs.lstatSync(archivePath);
  } catch {
    return false;
  }
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size !== contract.sourceArchive.expectedBytes
  ) {
    return false;
  }
  return (
    crypto.createHash("sha256").update(fs.readFileSync(archivePath)).digest("hex") ===
    contract.sourceArchive.expectedSha256
  );
}

function applyLegalReviewMaterializationReceipts({
  input,
  contract,
  rootDir
}) {
  const expanded = structuredClone(input);
  const assignments = new Map(
    (contract.assignments ?? []).map((assignment) => [
      assignment.jurisdiction,
      assignment
    ])
  );
  expanded.bundles = (expanded.bundles ?? []).map((bundle) => {
    const assignment = assignments.get(bundle.jurisdiction);
    if (
      !assignment ||
      !legalReviewMaterializationVerified(rootDir, assignment)
    ) {
      return bundle;
    }
    const receipt = JSON.parse(
      fs.readFileSync(path.join(rootDir, assignment.receiptOutput), "utf8")
    );
    return {
      ...bundle,
      reviewMaterialization: {
        ...bundle.reviewMaterialization,
        expectedBytes: receipt.observedReviewBytes,
        observedSha256: receipt.observedReviewSha256,
        observedBytes: receipt.observedReviewBytes,
        materializationState: "binary_hash_verified",
        verificationCommand: assignment.verificationCommand,
        verificationProvenance: "freshly_verified",
        verificationStatus: "binary_hash_and_size_verified"
      }
    };
  });
  return expanded;
}

function sourceMaterializationInputsForTracks(inputs, tracks) {
  const relationshipsByTrack = groupBy(
    inputs.sourceRelationships.relationships ?? [],
    (relationship) => `${relationship.jurisdiction}:${relationship.trackId}`
  );
  const artifacts = (inputs.sourceArtifacts.artifacts ?? []).filter(
    (artifact) =>
      artifact.fileType === "pdf" &&
      artifact.currency !== "reference_only" &&
      typeof artifact.sourcePath === "string" &&
      /^[0-9a-f]{64}$/.test(
        artifact.measuredSha256 ?? artifact.inventorySha256 ?? ""
      ) &&
      Number.isInteger(artifact.sizeBytes) &&
      artifact.sizeBytes > 0
  );
  const selected = new Map();
  for (const track of tracks) {
    const relationships =
      relationshipsByTrack.get(`${track.jurisdiction}:${track.trackId}`) ?? [];
    for (const artifact of artifacts.filter(
      (candidate) => candidate.jurisdiction === track.jurisdiction
    )) {
      if (!relationships.some((relationship) => relationshipMatchesArtifact(relationship, artifact))) {
        continue;
      }
      const expectedSha256 =
        artifact.measuredSha256 ?? artifact.inventorySha256;
      selected.set(`${artifact.artifactId}:${expectedSha256}`, {
        documentId: artifact.artifactId,
        expectedSha256,
        expectedBytes: artifact.sizeBytes,
        canonicalAuthorityPath: artifact.sourcePath,
        repositorySourcePath: artifact.sourcePath,
        portableLocator:
          `master-library-edition-1.2://${artifact.sourcePath}`,
        materializationDestination: artifact.sourcePath,
        authorityAssetState: "authority_asset_known",
        materializationState: "binary_materialization_required",
        workerReadiness: "binary_materialization_required",
        workerMayRead: true,
        workerMayModify: false,
        verificationCommand:
          `node scripts/verify-rcap-materialized-source.mjs --document-id ${artifact.artifactId} ` +
          `--sha256 ${expectedSha256} --bytes ${artifact.sizeBytes}`
      });
    }
  }
  return [...selected.values()].sort((left, right) =>
    left.documentId.localeCompare(right.documentId)
  );
}

// Matching a form id inside a longer name is how a document is recognised in a
// private file whose name carries a description after the id. Doing it on keys
// with every separator stripped also matched a *different* document whose id
// merely starts with the same characters: Vermont's petition 200-00130 matched
// the scanned instructions sheet 200-00130A, and six sealing tracks were
// classified from a scan of a document they do not use.
//
// Matching therefore runs on keys that keep their separators, and a containment
// match must land on a token boundary. "cr-65" still matches
// "cr-65-expunge-petition-10-2024"; "200-00130" no longer matches
// "200-00130a-filing-a-petition-to-expunge-or-seal-a-criminal-record", because
// the id ends there and "200-00130a" is a different id.
function relationshipMatchesArtifact(relationship, artifact) {
  const relationshipKeys = [
    relationship.officialFormId,
    urlBasename(relationship.officialSourceUrl)
  ]
    .map(identityKey)
    .filter((value) => value.length >= 3);
  const artifactKeys = [
    artifact.artifactId,
    artifact.fileName,
    path.posix.basename(artifact.fileName ?? "", path.posix.extname(artifact.fileName ?? "")),
    artifact.officialTitle
  ]
    .map(identityKey)
    .filter(Boolean);

  return relationshipKeys.some((left) =>
    artifactKeys.some(
      (right) =>
        left === right ||
        (left.length >= 5 && right.includes(left)) ||
        (right.length >= 5 && left.includes(right))
    )
  );
}

function buildAcquisitionReconciliation(inputs, jobs) {
  const documents = inputs.acquisitionDocuments.documents ?? [];
  const records = documents
    .map((document) => {
      const assigned = jobs.filter((job) =>
        (job.acquisitionIds ?? []).includes(document.acquisitionId)
      );
      if (assigned.length !== 1) {
        throw new Error(
          `${document.acquisitionId} must map to exactly one job; found ${assigned.length}.`
        );
      }
      return {
        acquisitionId: document.acquisitionId,
        jurisdiction: document.jurisdiction,
        documentId: document.documentId,
        finalResearchStatus: document.finalResearchStatus,
        authorityJobFamily: assigned[0].strategyFamily,
        jobId: assigned[0].jobId
      };
    })
    .sort((left, right) => left.acquisitionId.localeCompare(right.acquisitionId));
  const evidenceRecords = documents.reduce(
    (count, document) => count + (document.evidence?.length ?? 0),
    0
  );
  const duplicateAssignments =
    records.length -
    new Set(records.map((record) => record.acquisitionId)).size;
  return {
    researchedDocuments: documents.length,
    dispositionedDocuments: records.length,
    evidenceRecords,
    issuerCampaigns: inputs.acquisitionCampaigns.campaigns?.length ?? 0,
    duplicateAssignments,
    omissions: documents.length - records.length,
    byFinalResearchStatus: tally(
      documents,
      (document) => document.finalResearchStatus
    ),
    records
  };
}

function buildTrackReconciliation(normalizedTracks, jobs, implementationRecords) {
  const implemented = new Map();
  for (const { path: recordPath, data } of implementationRecords) {
    if (!String(data.implementationStatus ?? "").includes("implemented")) continue;
    for (const track of data.selectedTracks ?? []) {
      if (!track?.trackId) continue;
      implemented.set(`${data.jurisdiction}:${track.trackId}`, {
        trancheId: data.trancheId,
        evidencePath: recordPath
      });
    }
  }

  const implementationLanes = new Set([
    "custom_pleading",
    "acroform_fill",
    "flat_pdf_overlay",
    "composed_route",
    "guidance_implementation"
  ]);
  const assignments = normalizedTracks.map((track) => {
    const key = `${track.jurisdiction}:${track.trackId}`;
    const completion = implemented.get(key);
    if (completion) {
      return {
        jurisdiction: track.jurisdiction,
        trackId: track.trackId,
        disposition: "implementation_complete",
        trancheId: completion.trancheId,
        evidencePath: completion.evidencePath
      };
    }

    const implementationCandidates = jobs
      .filter(
        (job) =>
          implementationLanes.has(job.lane) &&
          job.jurisdiction === track.jurisdiction &&
          job.trackIds.includes(track.trackId)
      )
      .sort(compareJobs);
    // A correction reissues the assignment that produced the defect: same
    // module, same verifier, same tracks, one owner. It is not a second job
    // competing for the work, and the completed implementation it corrects is
    // still what built the tracks. Counting both as pending owners would make
    // opening any correction look like a double assignment.
    const implementationJobs = implementationCandidates.filter(
      (job) =>
        job.strategyFamily !== "legal_design_adjudication" &&
        job.strategyFamily !== "implementation_correction"
    );
    const correctionJobs = implementationCandidates.filter(
      (job) => job.strategyFamily === "implementation_correction"
    );
    const adjudicationJobs = implementationCandidates.filter(
      (job) => job.strategyFamily === "legal_design_adjudication"
    );
    if (implementationJobs.length > 1) {
      throw new Error(
        `${key} appears in multiple pending implementation jobs: ${implementationJobs
          .map((job) => job.jobId)
          .join(", ")}.`
      );
    }
    if (implementationJobs.length === 1) {
      if (implementationJobs[0].status === "completed") {
        return {
          jurisdiction: track.jurisdiction,
          trackId: track.trackId,
          disposition: "implementation_complete",
          completionCommit: implementationJobs[0].completionCommit,
          evidencePath: implementationJobs[0].expectedOutputs[0],
          // The implementation is built and integrated; its current output is
          // known defective and is being corrected. Both facts travel together
          // so neither is mistaken for the other.
          ...(correctionJobs.length > 0
            ? {
                currentOutputStatus: "correction_required",
                correctionJobId: correctionJobs[0].jobId
              }
            : {})
        };
      }
      // A reissued expansion assignment is not complete as a whole, and the
      // tracks it already built did not stop being built when the lane widened.
      // The pinned set is what the integrated commit actually produced.
      if (
        Array.isArray(implementationJobs[0].implementedTrackIds) &&
        implementationJobs[0].implementedTrackIds.includes(track.trackId)
      ) {
        return {
          jurisdiction: track.jurisdiction,
          trackId: track.trackId,
          disposition: "implementation_complete",
          completionCommit: implementationJobs[0].priorCompletionCommit,
          evidencePath: implementationJobs[0].expectedOutputs[0]
        };
      }
      return {
        jurisdiction: track.jurisdiction,
        trackId: track.trackId,
        disposition: "pending_production_job",
        jobId: implementationJobs[0].jobId
      };
    }
    if (adjudicationJobs.length > 1) {
      throw new Error(
        `${key} appears in multiple legal-design adjudication jobs: ${adjudicationJobs
          .map((job) => job.jobId)
          .join(", ")}.`
      );
    }
    if (adjudicationJobs.length === 1) {
      return {
        jurisdiction: track.jurisdiction,
        trackId: track.trackId,
        disposition: "pending_production_job",
        jobId: adjudicationJobs[0].jobId
      };
    }

    const legalDesignBlockerJob = jobs.find(
      (job) =>
        job.strategyFamily === "legal_design" &&
        job.status !== "completed" &&
        job.jurisdiction === track.jurisdiction &&
        job.trackIds.includes(track.trackId)
    );
    if (legalDesignBlockerJob) {
      return {
        jurisdiction: track.jurisdiction,
        trackId: track.trackId,
        disposition: "pending_production_job",
        jobId: legalDesignBlockerJob.jobId
      };
    }

    const authorityJobs = jobs
      .filter(
        (job) =>
          job.lane === "source_acquisition" &&
          job.jurisdiction === track.jurisdiction &&
          job.trackIds.includes(track.trackId)
      )
      .sort((left, right) => authorityPriority(left) - authorityPriority(right) || left.jobId.localeCompare(right.jobId));
    const reviewJob = jobs.find(
      (job) =>
        job.lane === "legal_output_review" &&
        job.jurisdiction === track.jurisdiction &&
        job.trackIds.includes(track.trackId)
    );
    const selected = authorityJobs[0] ?? reviewJob;
    if (!selected) {
      throw new Error(`${key} has no production job or final disposition.`);
    }
    return {
      jurisdiction: track.jurisdiction,
      trackId: track.trackId,
      disposition: "pending_production_job",
      jobId: selected.jobId
    };
  });

  const completed = assignments.filter(
    (assignment) => assignment.disposition === "implementation_complete"
  );
  const pending = assignments.filter(
    (assignment) => assignment.disposition === "pending_production_job"
  );
  return {
    normalizedTracks: assignments.length,
    representedExactlyOnce:
      new Set(
        assignments.map(
          (assignment) => `${assignment.jurisdiction}:${assignment.trackId}`
        )
      ).size,
    implementationComplete: completed.length,
    pendingProductionJob: pending.length,
    assignments
  };
}

function authorityPriority(job) {
  const order = [
    "in_repo_identity_reconciliation",
    "public_official_download",
    "official_download_automation_blocked",
    "direct_issuer_request",
    "commercial_license",
    "local_form_scope_correction",
    "source_identity_resolution",
    "not_required_design_reconciliation",
    "superseded_source_replacement"
  ];
  const index = order.indexOf(job.strategyFamily);
  return index === -1 ? order.length : index;
}

function buildSourceSummary(inputs, classifications) {
  const normalizedTracks = inputs.normalizedTracks.tracks ?? [];
  const implementationStatuses = tally(
    inputs.implementationRecords.map((record) => record.data),
    (record) => record.implementationStatus ?? "unknown"
  );
  const reviewTechnical = tally(
    inputs.reviewRecords.map((record) => record.data),
    (record) => record.technicalResult ?? record.result ?? "not_recorded"
  );
  const reviewVisual = tally(
    inputs.reviewRecords.map((record) => record.data),
    (record) => record.visualResult ?? record.result ?? "not_recorded"
  );
  const trancheRuntime = tally(
    inputs.implementationRecords.map((record) => record.data),
    (record) => record.runtimeStatus ?? "not_recorded"
  );
  const launchGates = sortedUnique(
    inputs.reviewRecords.map((record) => record.data.launchGate).filter(Boolean)
  );
  const enabledByTrancheReview = Math.max(
    0,
    ...inputs.reviewRecords.map((record) =>
      Number.isFinite(Number(record.data.enabledJurisdictions))
        ? Number(record.data.enabledJurisdictions)
        : 0
    )
  );

  return {
    authority: {
      edition: String(inputs.authority.edition),
      adoptionStatus: inputs.authority.adoptionStatus,
      cutoffDate: inputs.authority.cutoffDate,
      adoptedAgainstCommit: inputs.authority.adoptedAgainstCommit,
      clearedTracks: inputs.trackSourceAudit.totals?.tracksCleared ?? 0,
      blockedTracks: inputs.trackSourceAudit.totals?.tracksBlocked ?? 0
    },
    normalization: {
      trackCount: inputs.normalizedTracks.trackCount ?? normalizedTracks.length,
      jurisdictionsReceived: inputs.normalizedTracks.jurisdictionsReceived,
      jurisdictionsOutstanding: inputs.normalizedTracks.jurisdictionsOutstanding
    },
    sourceAcquisition: {
      rows: inputs.sourceAcquisitionQueue.rows?.length ?? 0,
      openRows: (inputs.sourceAcquisitionQueue.rows ?? []).filter(
        (row) => row.edition12Disposition !== "acquired_and_adopted"
      ).length,
      researchedDocuments: inputs.acquisitionDocuments.documents?.length ?? 0,
      dispositionCounts: inputs.acquisitionDocuments.totals?.byStatus ?? {},
      evidenceRecords: (inputs.acquisitionDocuments.documents ?? []).reduce(
        (count, document) => count + (document.evidence?.length ?? 0),
        0
      ),
      issuerCampaigns: inputs.acquisitionCampaigns.campaigns?.length ?? 0,
      blockerRows: inputs.blockerLedger.rows?.length ?? 0,
      officialPdfTracksClassifiedAsAcroform: classifications.acroform.length,
      officialPdfTracksClassifiedAsOverlay: classifications.overlay.length,
      officialPdfTracksAwaitingTechnicalClassification: classifications.unclassified.length
    },
    implementation: {
      packetImplementationRecordCount: inputs.implementationRecords.length,
      statuses: implementationStatuses,
      implementedTrackCount: implementedTracks(inputs.implementationRecords).size
    },
    review: {
      manifestCount: inputs.reviewRecords.length,
      technicalResults: reviewTechnical,
      visualResults: reviewVisual
    },
    runtime: {
      normalizedPacketReadyTracks: inputs.normalizedTracks.packetReadyCount ?? 0,
      normalizedRuntimeDisabledTracks: normalizedTracks.filter(
        (track) => typeof track.runtimeDisabledReason === "string"
      ).length,
      trancheRuntimeStatuses: trancheRuntime,
      enabledJurisdictions: enabledByTrancheReview,
      launchGates
    },
    promotion: {
      readinessMatrixStatuses: inputs.promotionReadiness.statusCounts ?? {},
      legacyStatePromotionRecords: inputs.statePromotionRecords.length,
      legacyStatePromotionLiveEnabled: inputs.statePromotionRecords.filter(
        (record) => record.liveEnabled === true
      ).length,
      buildManifestApprovedForLive: (inputs.allStateBuildStatus.states ?? []).filter(
        (state) => state.liveRouting?.approvedForLive === true
      ).length,
      buildManifestLive: (inputs.allStateBuildStatus.states ?? []).filter(
        (state) => state.liveRouting?.live === true
      ).length
    }
  };
}

function implementedTracks(records) {
  const result = new Set();
  for (const { data } of records) {
    if (!String(data.implementationStatus ?? "").includes("implemented")) continue;
    for (const track of data.selectedTracks ?? []) {
      if (track?.trackId) result.add(`${data.jurisdiction}:${track.trackId}`);
    }
  }
  return result;
}

function buildNormalizationReadinessSummary(records, input) {
  const remaining = REMAINING_NORMALIZATION_JURISDICTIONS.map((jurisdiction) => {
    const record = records.get(jurisdiction);
    if (!record) {
      throw new Error(
        `Normalization readiness is missing remaining jurisdiction ${jurisdiction}.`
      );
    }
    return record;
  });
  return {
    expectedJurisdictions: REMAINING_NORMALIZATION_JURISDICTIONS.length,
    representedExactlyOnce: remaining.length,
    bundlesReceived: input.bundles.length,
    readyForNormalization: remaining.filter(
      (record) => record.readinessState === "ready_for_normalization"
    ).length,
    blocked: remaining.filter(
      (record) => record.readinessState !== "ready_for_normalization"
    ).length,
    byReadinessState: tally(remaining, (record) => record.readinessState)
  };
}

function buildCompiledJobClaims(inputClaims, jobs) {
  const terminalCompiledJobIds = new Set(
    jobs
      .filter((job) => ["completed", "cancelled"].includes(job.status))
      .map((job) => job.jobId)
  );
  const byJobId = new Map(
    (inputClaims.claims ?? [])
      .filter(
        (claim) =>
          claim.targetType !== "compiled_job" ||
          !terminalCompiledJobIds.has(claim.jobId)
      )
      .map((claim) => [
        `${claim.targetType}:${claim.jobId}`,
        structuredClone(claim)
      ])
  );
  for (const job of jobs) {
    if (!job.assignmentClaim) continue;
    const key = `compiled_job:${job.jobId}`;
    const existing = byJobId.get(key);
    if (
      existing &&
      [
        "targetType",
        "jobId",
        "jurisdiction",
        "ownerSession",
        "status"
      ].some(
        (field) => existing[field] !== job.assignmentClaim[field]
      )
    ) {
      throw new Error(`${job.jobId} has conflicting exact assignment claims.`);
    }
    byJobId.set(key, structuredClone(job.assignmentClaim));
  }
  return {
    schemaVersion: inputClaims.schemaVersion,
    claims: [...byJobId.values()].sort(
      (left, right) =>
        left.targetType.localeCompare(right.targetType) ||
        left.jobId.localeCompare(right.jobId)
    )
  };
}

function assertFactoryClaimTargets(claims, jobs, canonicalParents) {
  const validation = validateFactoryJobClaims(claims);
  if (!validation.ok) {
    throw new Error(`Invalid factory job claims:\n- ${validation.issues.join("\n- ")}`);
  }
  const compiledJobIds = new Set(jobs.map((job) => job.jobId));
  const canonicalParentIds = new Set(
    canonicalParents.map((parent) => parent.jobId)
  );
  for (const claim of claims.claims) {
    const targets =
      claim.targetType === "compiled_job"
        ? compiledJobIds
        : canonicalParentIds;
    if (!targets.has(claim.jobId)) {
      throw new Error(
        `Factory claim ${claim.jobId} does not name a known ${claim.targetType}.`
      );
    }
    if (claim.targetType === "compiled_job") {
      const job = jobs.find((entry) => entry.jobId === claim.jobId);
      if (claim.jurisdiction !== job.jurisdiction) {
        throw new Error(
          `Factory claim ${claim.jobId} jurisdiction ${claim.jurisdiction} ` +
            `does not match ${job.jurisdiction}.`
        );
      }
    }
  }
}

/**
 * Every retained materialization receipt, partitioned by what it establishes.
 *
 * A receipt is evidence of custody. Some receipts back a source a worker may
 * use; others back a source we hold and verify but may not reproduce. Before
 * this existed the plan had no way to describe the second kind, so a verified
 * Colorado receipt looked like an orphan and the only way to make the gates
 * pass was to delete evidence. Recording the partition makes the fail-closed
 * state a first-class one: the receipt stays, the source stays sealed, and the
 * reason it is not assignable travels with it.
 *
 * Counts are derived from the receipts actually present. Nothing here asserts
 * how many there should be.
 */
function buildSourceEvidenceRetention(jobs, rootDir) {
  const directory = path.join(
    rootDir ?? process.cwd(),
    "data/record-clearing/production-factory/source-materialization-receipts"
  );
  const assignableIdentityKeys = new Set(
    jobs.flatMap((job) =>
      (job.sourceMaterializationInputs ?? [])
        .filter((input) => input.sourceLifecycle?.workerReady === true)
        .map((input) => input.sourceIdentityKey)
    )
  );
  const index = sourceAuthorizationIndex(rootDir);
  const records = [];
  if (fs.existsSync(directory)) {
    for (const name of fs.readdirSync(directory).sort()) {
      if (!name.endsWith(".json")) continue;
      let receipt;
      try {
        receipt = JSON.parse(
          fs.readFileSync(path.join(directory, name), "utf8")
        );
      } catch {
        continue;
      }
      const identityKey = name.replace(/\.json$/u, "");
      const authorization = authorizationFor(index, {
        jurisdiction: receipt.jurisdiction,
        documentId: receipt.documentId ?? null
      });
      const receiptVerified =
        receipt.hashAndMediaVerified === true &&
        receipt.materializationState === "binary_hash_verified" ||
        receipt.hashAndMediaVerified === true;
      const lifecycle = deriveSourceLifecycle({
        receiptVerified,
        authorization,
        otherGatesPass: assignableIdentityKeys.has(identityKey)
      });
      records.push({
        sourceIdentityKey: identityKey,
        jurisdiction: receipt.jurisdiction ?? null,
        documentId: receipt.documentId ?? null,
        receiptPath:
          `data/record-clearing/production-factory/source-materialization-receipts/${name}`,
        receiptVerified,
        authorizationVerdict: authorization.verdict,
        blocker: authorization.blocker,
        decisionJobId: authorization.decisionJobId,
        lifecycle
      });
    }
  }
  records.sort((left, right) =>
    left.sourceIdentityKey.localeCompare(right.sourceIdentityKey)
  );
  const withheld = records.filter(
    (entry) => entry.receiptVerified && !entry.lifecycle.workerReadAuthorized
  );
  return {
    schemaVersion: "rcap-source-evidence-retention/v1",
    principle:
      "A receipt records that bytes were measured. It never records permission to reproduce them.",
    totals: {
      receipts: records.length,
      verified: records.filter((entry) => entry.receiptVerified).length,
      workerReady: records.filter((entry) => entry.lifecycle.workerReady).length,
      retainedEvidenceGenerationPermissionRequired: withheld.length,
      byAuthorizationVerdict: Object.fromEntries(
        [...new Set(records.map((entry) => entry.authorizationVerdict))]
          .sort()
          .map((verdict) => [
            verdict,
            records.filter((entry) => entry.authorizationVerdict === verdict)
              .length
          ])
      ),
      byJurisdictionWithheld: Object.fromEntries(
        [...new Set(withheld.map((entry) => entry.jurisdiction))]
          .sort()
          .map((jurisdiction) => [
            jurisdiction,
            withheld.filter((entry) => entry.jurisdiction === jurisdiction).length
          ])
      )
    },
    records
  };
}

function buildMaterializationPlanningSummary(jobs, inputs) {
  const reviewJobs = jobs.filter(
    (job) => job.strategyFamily === "legal_review_materialization"
  );
  const officialJobs = jobs.filter(
    (job) =>
      Array.isArray(job.officialPdfAssignment?.identityKeys) &&
      job.officialPdfAssignment.identityKeys.length > 0
  );
  const assignedIdentityKeys = new Set(
    officialJobs.flatMap(
      (job) => job.officialPdfAssignment.identityKeys
    )
  );
  const completedImplementationIdentities =
    inputs.officialPdfSourceProjection.identities.filter(
      (identity) =>
        identity.jurisdiction === "MD" &&
        ["CC-DC-CR-148", "MDJ-008"].includes(
          identity.officialDocument.documentId
        ) &&
        identity.assignmentEligible
    );
  const dispositionCounts =
    inputs.officialPdfSourceProjection.coverage.countsByDisposition;
  return {
    legalReviewMaterialization: {
      assignmentCount:
        inputs.legalReviewMaterialization.assignmentCount,
      explicitOwnerJobs: reviewJobs.length,
      readyJobs: reviewJobs.filter((job) => job.status === "ready").length,
      blockedJobs: reviewJobs.filter((job) => job.status === "blocked").length,
      completedJobs: reviewJobs.filter((job) => job.status === "completed")
        .length,
      externalArchiveStatus:
        reviewJobs.some((job) => job.status === "ready")
          ? "exact_external_archive_verified_materialization_pending"
          : reviewJobs.every((job) => job.status === "completed")
            ? "materialized_reviews_verified"
            : "external_archive_not_materialized"
    },
    officialPdfProjection: {
      path: FACTORY_INPUT_PATHS.officialPdfSourceProjection,
      queueIdentityCount:
        inputs.officialPdfSourceProjection.coverage.queueIdentityCount,
      exactSourceContractCount:
        inputs.officialPdfSourceProjection.coverage.exactSourceContractCount,
      exactWorkerAssignable:
        inputs.officialPdfSourceProjection.coverage.assignmentEligibleCount,
      assignedToNewImplementationChildren:
        assignedIdentityKeys.size -
        completedImplementationIdentities.length,
      existingImplementationMaterializationOnly:
        completedImplementationIdentities.length,
      unresolvedIdentities:
        dispositionCounts.unresolved_identity ?? 0,
      dispositionCounts
    },
    officialPdfChildren: {
      childJobsWithExactAssignments: officialJobs.length,
      workerReadyFamilies: new Set(
        officialJobs
          .filter((job) => job.status === "ready")
          .map((job) => job.jurisdiction)
      ).size,
      blockedFamilies: new Set(
        officialJobs
          .filter((job) => job.status === "blocked")
          .map((job) => job.jurisdiction)
      ).size,
      materializedSources: new Set(
        officialJobs.flatMap((job) =>
          (job.sourceMaterializationInputs ?? [])
            .filter(
              (input) =>
                input.materializationState ===
                  "binary_materialized_hash_verified" &&
                input.workerReadiness === "worker_ready"
            )
            .map((input) => input.sourceIdentityKey)
        )
      ).size,
      runtimeDisabled: officialJobs.every(
        (job) => job.officialPdfAssignment.runtimeDisabledInvariant === true
      )
    }
  };
}

function canonicalStates(inputs) {
  const states = (inputs.allStateBuildStatus.states ?? []).map((state) => ({
    code: state.code,
    name: state.name,
    slug: state.slug
  }));
  if (states.length !== 51) {
    throw new Error(`Expected 51 jurisdictions in all-state build status; found ${states.length}.`);
  }
  const codes = new Set();
  for (const state of states) {
    if (!/^(?:[A-Z]{2}|DC)$/.test(state.code) || !state.slug || codes.has(state.code)) {
      throw new Error(`Invalid or duplicate jurisdiction identity in all-state build status: ${state.code}.`);
    }
    codes.add(state.code);
  }
  return states.sort((a, b) => a.code.localeCompare(b.code));
}

function parseEmbeddedPromotionManifest(source) {
  const startMarker = "/* PROMOTION_MANIFEST_START */";
  const endMarker = "/* PROMOTION_MANIFEST_END */";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  if (start === -1 || end === -1 || start >= end) {
    throw new Error("State promotion manifest markers are missing or malformed.");
  }
  return JSON.parse(source.slice(start + startMarker.length, end).trim());
}

function resolveRoot(options) {
  const requested = options.rootDir ?? options.root ?? process.cwd();
  return path.resolve(requested);
}

function resolveBaseCommit(rootDir, requested) {
  if (requested !== undefined) {
    const value = String(requested).trim().toLowerCase();
    if (!/^[0-9a-f]{40}$/.test(value)) {
      throw new Error(`Invalid base commit ${JSON.stringify(requested)}.`);
    }
    return value;
  }

  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: rootDir,
    encoding: "utf8"
  });
  const value = result.status === 0 ? result.stdout.trim().toLowerCase() : "";
  if (!/^[0-9a-f]{40}$/.test(value)) {
    throw new Error("Could not determine a 40-character Git base commit; pass baseCommit explicitly.");
  }
  return value;
}

function readJson(rootDir, relativePath) {
  const text = readText(rootDir, relativePath);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in ${relativePath}: ${error.message}`);
  }
}

function readText(rootDir, relativePath) {
  const file = path.join(rootDir, normalizeRepoPath(relativePath));
  if (!fs.existsSync(file)) throw new Error(`Required factory input not found: ${relativePath}.`);
  return fs.readFileSync(file, "utf8");
}

function listJsonFiles(rootDir, relativeDir) {
  const absolute = path.join(rootDir, relativeDir);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Required implementation-record directory not found: ${relativeDir}.`);
  }
  return fs
    .readdirSync(absolute, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => `${relativeDir}/${entry.name}`)
    .sort();
}

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function urlBasename(value) {
  if (!value) return "";
  try {
    return path.posix.basename(decodeURIComponent(new URL(value).pathname));
  } catch {
    return "";
  }
}

function identityKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isComposedTrack(track) {
  return (
    track.outputStrategyDeclared === "composed" ||
    track.compositionMode === "sequential" ||
    track.compositionMode === "alternative" ||
    (Array.isArray(track.units) && track.units.length > 0)
  );
}

function jobIdFor(jurisdiction, lane) {
  return `rcap-${jurisdiction.toLowerCase()}-${lane.replaceAll("_", "-")}`;
}

function groupBy(values, keyOf) {
  const groups = new Map();
  for (const value of values) {
    const key = keyOf(value);
    const list = groups.get(key) ?? [];
    list.push(value);
    groups.set(key, list);
  }
  return groups;
}

function sortedUnique(values) {
  return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b)));
}

function compareTracks(a, b) {
  return a.jurisdiction.localeCompare(b.jurisdiction) || a.trackId.localeCompare(b.trackId);
}

function compareJobs(a, b) {
  return (
    FACTORY_LANES.indexOf(a.lane) - FACTORY_LANES.indexOf(b.lane) ||
    a.jurisdiction.localeCompare(b.jurisdiction) ||
    a.jobId.localeCompare(b.jobId)
  );
}

function tally(values, keyOf) {
  const counts = {};
  for (const value of values) {
    const key = String(keyOf(value));
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}
