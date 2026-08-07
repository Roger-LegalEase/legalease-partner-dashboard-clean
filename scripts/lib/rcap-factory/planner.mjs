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
      "edf0f86c7eee382f6c0666e3a400b4b41bb5ffadc3a51610c12aacd6fe93b2f8"
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
      "560d30414b2615203cbe6767b69e8f7f3e7bc100123343e86f9c728f1b3cdf3e"
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
      "ed0323da7859f0b94a9e801fbe0b896dbb1a6261c8cdf02e4a505df433300df1"
  },
  {
    jurisdiction: "NV",
    workerCommit: "e69480b1bb3072ec8fa9435ee281f70d0c22e914",
    workerBranch:
      "rcap-factory/rcap-nv-legal-design-normalization-972fc317-34dc8759",
    completionCommit: "eb79b1eacdbfc45c06eae10b98a0ce62210dbe15",
    memoSha256:
      "711b8df32c62507f6d4d711c9077630c873771e10631e0a9e5a48caaef788cc6"
  },
  {
    jurisdiction: "OK",
    workerCommit: "25a4a8966a2f3c012c1486fc37ee218f21cdca14",
    workerBranch:
      "rcap-factory/rcap-ok-legal-design-normalization-52006e83-20128515",
    completionCommit: "5ef6b00d209f3a0c48fbd994de67e380a79e3c4e",
    memoSha256:
      "984994b2ede275028d8d1345738e673e369872fc226016257d367349ba86de1f"
  }
]);
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
      ![record.memoSha256, record.amendedMemoSha256]
        .filter(Boolean)
        .includes(sha256File(absoluteMemoPath))
    ) {
      throw new Error(
        `${record.jurisdiction} completed normalization memo does not match ` +
          `${[record.memoSha256, record.amendedMemoSha256]
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
      status: "blocked",
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
        "Cover the Va. Code section 19.2-392.2 version effective December 1, 2026 against the " +
        "existing tracks ending November 30, 2026, including the broader subsection A gateway and " +
        "the multi-transaction single-petition treatment; the section 19.2-392.6 changes effective " +
        "July 1, 2027; and the resulting screening, packet, and dated regression-test requirements. " +
        "Do not activate future law early, do not retire a track that is still in force, and do not " +
        "enable runtime, promote, or deploy. " +
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
      status: "blocked",
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
        "Establish, for each instrument in the current CC-1201 series, its exact form number, " +
        "title, revision, role, statewide scope, official URL, content hash, participant-facing " +
        "status, and the affected Virginia tracks and components. Do not substitute CC-1473 " +
        "outside Va. Code section 19.2-392.2(A), do not adopt an unofficial mirror or aggregator " +
        "copy as authority, do not commit a source binary, and do not enable runtime, promote, or " +
        "deploy. " +
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
      status: "ready",
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
    addJob({
      lane: "legal_design_normalization",
      jurisdiction: entry.jurisdiction,
      jobId: entry.jobId,
      strategyFamily: "legal_design_adjudication",
      trackIds: [],
      dependencies: [
        `rcap-${entry.jurisdiction.toLowerCase()}-legal-design-normalization`
      ],
      status: "ready",
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
  addMarylandLegacyEvidenceMigrationJob({ addJob });
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
    jobsByLaneAndState
  });
  addGeorgiaJailGuidanceSpecificationChildren({ addJob });
  addTrackLaneJobs({
    lane: "acroform_fill",
    tracks: classifications.acroform,
    inputs,
    addJob,
    jobsByLaneAndState,
    sourceMaterializationFoundationJobId: sourceMaterializationFoundation.jobId
  });
  addTrackLaneJobs({
    lane: "flat_pdf_overlay",
    tracks: classifications.overlay,
    inputs,
    addJob,
    jobsByLaneAndState,
    sourceMaterializationFoundationJobId: sourceMaterializationFoundation.jobId
  });
  addTrackLaneJobs({
    lane: "composed_route",
    tracks: pendingTracks.filter(isComposedTrack),
    inputs,
    addJob,
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
    const overrides = implementationJobOverrides(lane, jurisdiction, inputs);
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
  }
]);

// The deliverable-identity question South Carolina's custom-pleading job waits
// on is a real property of the normalized design, so readiness is read from it
// rather than pinned to a memo hash or asserted by hand. Zero unresolved
// output-strategy questions across the assigned tracks means the correction
// landed; one means it did not, whatever any status field claims.
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

function implementationJobOverrides(lane, jurisdiction, inputs) {
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
    return {
      status: "completed",
      completionCommit: completedCustomPleading.completionCommit,
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
      status: "ready",
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
function addMarylandLegacyEvidenceMigrationJob({ addJob }) {
  return addJob({
    lane: "platform_foundation",
    jurisdiction: "MD",
    jobId: "rcap-md-legacy-official-pdf-evidence-migration",
    strategyFamily: "legacy_completion_evidence_migration",
    executionScope: "captain",
    status: "blocked",
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
  if (job.lane === "legal_design_normalization") {
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
      return officialPdfMaterializationInput(identity, verification);
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
        throw new Error(
          `${job.jobId} cannot remain completed after its exact source assignment stopped verifying.`
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

function sourceMaterializationJobIdFor(identity) {
  return `${identity.identityKey}-source-materialization`;
}

function officialPdfMaterializationInput(identity, verification) {
  const source = identity.exactSourceContract;
  const verificationCommand =
    "node scripts/verify-rcap-materialized-source.mjs " +
    `--source-identity-key ${identity.identityKey} ` +
    `--sha256 ${source.expectedSha256} --bytes ${source.expectedBytes}`;
  return {
    sourceIdentityKey: identity.identityKey,
    documentId: identity.officialDocument.documentId,
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
    materializationState: verification.ready
      ? "binary_materialized_hash_verified"
      : "binary_materialization_required",
    workerReadiness: verification.ready
      ? "worker_ready"
      : "binary_materialization_required",
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
    const implementationJobs = implementationCandidates.filter(
      (job) => job.strategyFamily !== "legal_design_adjudication"
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
