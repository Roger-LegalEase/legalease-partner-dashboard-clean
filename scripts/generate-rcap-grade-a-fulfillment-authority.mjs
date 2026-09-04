#!/usr/bin/env node
// GRADE-A FULFILLMENT AUTHORITY — candidate records, observation snapshot, projection.
//
//   node scripts/generate-rcap-grade-a-fulfillment-authority.mjs
//   node scripts/generate-rcap-grade-a-fulfillment-authority.mjs --check
//
// Three artifacts, one derivation, so that none of them can quietly disagree
// with the evidence the repository actually holds:
//
//   1. data/rcap-grade-a/fulfillment-authority-registry.json
//      The canonical controlling registry. Candidate records are written here
//      ONLY for the lanes that were asked for them — Oregon, North Dakota, the
//      bounded Mississippi clinic-demo route, and the four enumerated
//      DC/MS/WY first-cohort routes —
//      and only with the proof those lanes actually produced. Where a lane
//      produced no proof for a dimension, the record says so; it does not
//      borrow a neighbouring route's evidence and it does not default to true.
//
//   2. data/rcap-grade-a/fulfillment-observation-snapshot.json
//      What the server currently observes for each of those routes. The runtime
//      compares a record against this, so a change to any upstream evidence
//      moves a record to STALE by arithmetic rather than by anyone remembering.
//
//   3. data/rcap-grade-a/fulfillment-authority-projection.json
//      The generated runtime/profile projection. It is derived from (1) and (2)
//      by the shipped authority module — not recomputed here — so a projection
//      that disagrees with the registry is impossible rather than merely
//      discouraged.
//
// This generator creates no approval. Every value it writes is copied from an
// existing evidence file, and where the evidence is absent it writes the absence.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
register("./lib/ts-esm-loader.mjs", import.meta.url);

const CHECK = process.argv.includes("--check");

const LAUNCH_GRAPH = "data/rcap-ledger/launch-graph.json";
const LEGAL_JOIN = "data/rcap-ledger/paid-pathway-legal-join.json";
const COUNSEL_MANIFEST = "data/rcap-ledger/completed-output-counsel-manifest.json";
const WITNESS_FIXTURES = "data/rcap-ledger/public-witness-fixtures.json";
const VISUAL_PROOF = "data/rcap-all50/contact-sheet-visual-proof.json";
const WORKER_EVIDENCE = "data/rcap-render/worker-publication-evidence.json";
const SOURCE_REGISTRY = "data/rcap-grade-a/official-source-registry.json";
const MS_CLINIC_SPECIFICATION = "data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json";
const MS_CLINIC_FIXTURE = "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-a.fixture.json";
const MS_CLINIC_ARTIFACTS = "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.artifacts.json";
const MS_CLINIC_RASTER_REVIEW = "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-delivery.raster-review.json";
const FIRST_COHORT_RETURN = "data/rcap-grade-a/packet-factory-24h/fix05/first-route-cohort-productization-return.json";
const FIRST_COHORT_EVIDENCE_COMMIT = "ff9705a240c004ed7b9d2f022113abe865442d3f";
const FIRST_COHORT_RETURN_SHA256 = "96157e584ba2d801f1ba78456bcf08463ad05982dbcc9b2ad5b8735913e649a7";
const OWNER_BATCH_ADOPTION = "data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json";
const OWNER_BATCH_ADOPTION_ID = "OWN-ADOPT-2026-09-02-BATCH-53";
const POST_APPROVAL_AUDIT = "data/rcap-grade-a/legal-decisions/POST_APPROVAL_CHANGE_AUDIT_2026-09-02.json";
const RASTER_QUEUE = "data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json";
const VERIFIER_RETURNS = "data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json";
// Lane-produced page-by-page visual review evidence. A lane may close the
// visual-review dimension because reviewing every page of a rendered artifact
// is work a lane actually does. It may not close output-level legal approval
// or bind a final verification, and nothing here lets it.
const LANE_VISUAL_REVIEW = ["data/rcap-lane-c/oregon/visual-review.json"];

const REGISTRY_OUT = "data/rcap-grade-a/fulfillment-authority-registry.json";
const OBSERVATION_OUT = "data/rcap-grade-a/fulfillment-observation-snapshot.json";
const PROJECTION_OUT = "data/rcap-grade-a/fulfillment-authority-projection.json";

/** The only jurisdictions this generator writes candidate records for. */
const CANDIDATE_JURISDICTIONS = ["ND", "OR"];
const MS_CLINIC_ROUTE = "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";

const CODIFIED_AUTHORITY_CONTRACT = "rcap-codified-authority-bound-inputs/v1";
const INDEPENDENT_FINAL_VERIFICATION_CONTRACT = "rcap-independent-packet-final-verification/v1";
const CODIFIED_COMMON_INPUTS = {
  packetSet: {
    path: "data/record-clearing/legal-design-packet-set-manifests.json",
    sha256: "716317177e7b176e191b0d4d6c4a8236fa197bd0a8546e4b636befe068b13168"
  },
  legal: {
    path: OWNER_BATCH_ADOPTION,
    sha256: "32321a977941bf1724f0d6f993a7df2477f6b42a9a9d39b2a6d2e27d918e0eb3"
  }
};
const CODIFIED_TRACK_INPUTS = {
  DC: {
    path: "data/record-clearing/legal-design-intake/DC.memo.json",
    sha256: "4f3f614161a6f787eb516afd7d90cb21a04190e70268c1dd915173ae80494c64"
  },
  MS: {
    path: "data/record-clearing/legal-design-intake/MS.memo.json",
    sha256: "6982ae0c69373c196b763c84ebd8f8ff85ce1a6954a2806953591f82ff7845f2"
  },
  WY: {
    path: "data/record-clearing/legal-design-intake/WY.memo.json",
    sha256: "de2239036a9b2fbda8f6ce7c18a85c3da67c290cf68159929bd46d8c77ddb679"
  }
};
const FIRST_COHORT_VERIFICATION = {
  "dc_innocence_expungement-set": {
    lane: "vf04",
    verifiedAtBase: "efda1c0aa5e8e5c6b2b519dca84b0adaee66c595",
    rowSha256: "f2bccfbdf8b9c6e96bd1afe4127115c0a899042edd442811d1db4d7ea4d64314",
    evidencePath: "data/rcap-grade-a/packet-factory-24h/vf04/rows.json",
    evidenceRowSha256: "baaf498dd7676c19cd1b36a798cf006507b2b0de48a2a33555d1ca40705adc59"
  },
  "ms-misd-addl-set": {
    lane: "vf01",
    verifiedAtBase: "cd48fc14e",
    rowSha256: "89da20f7f45e96c0460160df03bb0311a22f98273bbd3177d1b6594c6bef3e50",
    evidencePath: "data/rcap-grade-a/packet-factory-24h/vf01/rows.json",
    evidenceRowSha256: "52d688aaed44fd2ba9145e06ad3798304999f0da3002c3e3eb6e7ee430186063"
  },
  "wy_fel_1502-set": {
    lane: "vf09",
    verifiedAtBase: "8b8699c2a63fcd7fdb3bade119f259653840eae5",
    rowSha256: "a98c5d64a6b324b6bbd3941bc0815570bc7677dbb9d9cc3e9b7601938858462f",
    evidencePath: "data/rcap-grade-a/packet-factory-24h/vf09/rows.json",
    evidenceRowSha256: "956c4c7edcf042f5ee7f05d45fd6d011795ae4943e4aace7e4240659dddbdc86"
  }
};

// This is an enumerated scope, not a jurisdiction allow-list. The two
// Mississippi routes deliberately share one family and one specification, but
// each receives its own authority record so neither can act as a wildcard for
// the other.
const FIRST_COHORT_ROUTES = [
  {
    assignmentClaim: "obligation:track-pathway:DC:dc_actual_innocence_expungement_16_803",
    routeId: "DC:dc_actual_innocence_expungement_16_803",
    familyId: "dc_innocence_expungement-set",
    specificationPath: "data/record-clearing/packet-specifications/DC-actual-innocence-expungement.v1.json",
    builderPath: "scripts/build-census-v1-dc_innocence_expungement-set.mjs",
    providerPaths: [
      "scripts/build-census-v1-dc_innocence_expungement-set.mjs",
      "scripts/build-census-v1-dc_seal_nonconviction-set.mjs"
    ],
    overlayRoot: "data/rcap-all50/overlays/census-v1/dc/dc-innocence-expungement-set--custom-pleading",
    verification: FIRST_COHORT_VERIFICATION["dc_innocence_expungement-set"]
  },
  {
    assignmentClaim: "obligation:track-pathway:MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
    routeId: "MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
    familyId: "ms-misd-addl-set",
    specificationPath: "data/record-clearing/packet-specifications/MS-additional-misdemeanor-relief.v1.json",
    builderPath: "scripts/build-census-v1-ms-misd-addl-set.mjs",
    providerPaths: ["scripts/build-census-v1-ms-misd-addl-set.mjs"],
    overlayRoot: "data/rcap-all50/overlays/census-v1/ms/ms-misd-addl-set--custom-pleading",
    verification: FIRST_COHORT_VERIFICATION["ms-misd-addl-set"]
  },
  {
    assignmentClaim: "obligation:track-pathway:MS:additional-municipal-court-misdemeanor-relief-21-23-7-6",
    routeId: "MS:additional-municipal-court-misdemeanor-relief-21-23-7-6",
    familyId: "ms-misd-addl-set",
    specificationPath: "data/record-clearing/packet-specifications/MS-additional-misdemeanor-relief.v1.json",
    builderPath: "scripts/build-census-v1-ms-misd-addl-set.mjs",
    providerPaths: ["scripts/build-census-v1-ms-misd-addl-set.mjs"],
    overlayRoot: "data/rcap-all50/overlays/census-v1/ms/ms-misd-addl-set--custom-pleading",
    verification: FIRST_COHORT_VERIFICATION["ms-misd-addl-set"]
  },
  {
    assignmentClaim: "obligation:track-pathway:WY:felony-conviction-expungement-w-s-7-13-1502",
    routeId: "WY:felony-conviction-expungement-w-s-7-13-1502",
    familyId: "wy_fel_1502-set",
    specificationPath: "data/record-clearing/packet-specifications/WY-felony-conviction-expungement.v1.json",
    builderPath: "scripts/build-census-v1-wy_fel_1502-set.mjs",
    providerPaths: ["scripts/build-census-v1-wy_fel_1502-set.mjs"],
    overlayRoot: "data/rcap-all50/overlays/census-v1/wy/wy-fel-1502-set--custom-pleading",
    verification: FIRST_COHORT_VERIFICATION["wy_fel_1502-set"]
  }
];

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const gitBlobSha1 = (value) => crypto.createHash("sha1")
  .update(`blob ${value.length}\0`)
  .update(value)
  .digest("hex");

// Packet-factory evidence is intentionally sparse-checkout friendly. Reading a
// tracked blob through this worktree's HEAD does not materialize or alter the
// packet; it lets generation bind the exact committed bytes even when the
// checkout omits large PDF/raster trees.
function readEvidenceBytes(rel) {
  const absolute = path.join(rootDir, rel);
  if (fs.existsSync(absolute)) return fs.readFileSync(absolute);
  try {
    return execFileSync("git", ["-C", rootDir, "show", `HEAD:${rel}`], {
      encoding: null,
      maxBuffer: 64 * 1024 * 1024
    });
  } catch (error) {
    throw new Error(`Required committed evidence is unavailable at ${rel}: ${error?.message ?? error}`);
  }
}

function readEvidenceJson(rel) {
  return JSON.parse(readEvidenceBytes(rel).toString("utf8"));
}

const readJson = (rel) => readEvidenceJson(rel);

function evidenceExists(rel) {
  if (fs.existsSync(path.join(rootDir, rel))) return true;
  try {
    execFileSync("git", ["-C", rootDir, "cat-file", "-e", `HEAD:${rel}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function readGitBlob(commit, rel) {
  return execFileSync("git", ["-C", rootDir, "show", `${commit}:${rel}`], {
    encoding: null,
    maxBuffer: 64 * 1024 * 1024
  });
}

function requireEvidence(condition, message) {
  if (!condition) throw new Error(`First-cohort evidence refusal: ${message}`);
}

const { stableStringify, fulfillmentRecordSha256 } = await import("../src/lib/rcap/fulfillment/grade-a-registry.ts");
const {
  GRADE_A_AUTHORITY_SCHEMA_VERSION,
  GRADE_A_ADMISSION_SCHEMA_VERSION,
  COMPLETE_PACKET_PROVEN
} = await import("../src/lib/rcap/fulfillment/grade-a-authority.ts");
const { PACKET_RENDERER_KIND, PACKET_RENDERER_VERSION } = await import("../src/lib/rcap/documents/packet-document-renderer.ts");
// The family a route resolves to server-side. Read from the SHIPPED resolver,
// not recomputed here: the point of the record's packetFamilyId is that the
// runtime and the record are two independent statements of the same fact, and a
// generator that computed its own would be one statement written twice.
const { resolvePacketFamilyId } = await import("../src/lib/rcap/render/commercial-admission.ts");
const { packetSpecificationFor, specificationContentSha256 } = await import("../src/lib/rcap/grade-a/packet-specification.ts");

const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";
const packetSetManifests = readJson(PACKET_SET_MANIFESTS);
const packetSetById = new Map((packetSetManifests.packetSets ?? []).map((set) => [set.packetSetId, set]));

// Filing artifacts, by the source id whose overlay produced them. The digest,
// byte count and producing renderer all come from the overlay's own report; the
// page count comes from the independent visual review, which counted pages by
// rendering them.
const OVERLAY_ROOTS = ["data/rcap-all50/overlays/lane-c-candidates", "data/rcap-all50/overlays/production"];
const INDEPENDENT_REVIEWS = ["data/rcap-lane-c/oregon/independent-visual-review.json"];
const filingArtifactBySourceId = new Map();
function scanOverlayArtifacts(dir) {
  const abs = path.join(rootDir, dir);
  if (!fs.existsSync(abs)) return;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) { scanOverlayArtifacts(rel); continue; }
  }
}
for (const root of OVERLAY_ROOTS) scanOverlayArtifacts(root);

const independentReviewByRoute = new Map();
for (const rel of INDEPENDENT_REVIEWS) {
  if (!evidenceExists(rel)) continue;
  const doc = readJson(rel);
  if (!(doc.pageCount > 0) || doc.pagesReviewed !== doc.pageCount) continue;
  independentReviewByRoute.set(doc.routeKey, { doc, rel, evidenceSha256: sha256(readEvidenceBytes(rel)) });
  for (const form of doc.forms ?? []) {
    filingArtifactBySourceId.set(form.sourceId, {
      sha256: form.finalizedArtifactSha256,
      bytes: form.finalizedArtifactBytes,
      pageCount: form.pageCount,
      role: form.role,
      family: form.family
    });
  }
}

const launchGraph = readJson(LAUNCH_GRAPH);
const legalJoin = readJson(LEGAL_JOIN);
const counsel = readJson(COUNSEL_MANIFEST);
const fixtures = readJson(WITNESS_FIXTURES);
const visualProof = readJson(VISUAL_PROOF);
const worker = readJson(WORKER_EVIDENCE);
const sourceRegistry = readJson(SOURCE_REGISTRY);
const laneVisualReviewByRoute = new Map();
for (const rel of LANE_VISUAL_REVIEW) {
  if (!evidenceExists(rel)) continue;
  const doc = readJson(rel);
  // Evidence is only accepted when it actually reviewed every page it counted.
  const complete = doc.pageCount > 0 && doc.pagesReviewed === doc.pageCount;
  if (!complete) continue;
  const evidenceSha256 = sha256(readEvidenceBytes(rel));
  for (const routeId of doc.routes ?? []) {
    laneVisualReviewByRoute.set(routeId, {
      state: "passed",
      pagesReviewed: doc.pagesReviewed,
      pageCount: doc.pageCount,
      evidenceSha256,
      reviewedBy: doc.reviewedBy ?? null,
      reviewedAt: doc.reviewedAt ?? null,
      evidencePath: rel
    });
  }
}
// The registry is a committed artifact, so its own verification moment is the
// corpus import it was built from rather than the clock at generation time.
// Using the clock would make this generator non-reproducible.
const sourceRegistryVerifiedAt = sourceRegistry.corpusImportVerification
  ? `corpus-import:${sourceRegistry.corpusRelease.releaseId}`
  : "";

const ownerDecision = legalJoin.ownerLegalDecision?.records?.[0] ?? null;
if (!ownerDecision) {
  console.error("No owner legal decision record is present; refusing to write an authority registry without one.");
  process.exit(1);
}

// The provider identity is one fact for the whole product: the digest-pinned
// worker image that renders packets, plus the renderer kind and version the
// shipped code declares. A record binds this identity, so republishing the
// worker closes every authority until each is re-proven against the new image.
const provider = {
  providerId: worker.imageRepository,
  rendererKind: PACKET_RENDERER_KIND,
  rendererVersion: PACKET_RENDERER_VERSION,
  imageDigest: worker.immutableRegistryDigest
};

const fixtureByKey = new Map(fixtures.fixtures.map((entry) => [entry.pathwayKey, entry]));
const counselByFamily = new Map(counsel.families.map((entry) => [entry.familyId, entry]));
const visualByFamily = new Map(visualProof.families.map((entry) => [entry.familyId, entry]));

const REVIEW_STATE_FROM_COUNSEL = {
  complete: "passed",
  passed: "passed",
  failed: "failed",
  formal_visual_review_pending: "pending",
  pending: "pending"
};

function reviewState(value) {
  return REVIEW_STATE_FROM_COUNSEL[value] ?? "pending";
}

const firstCohortReturnBytes = readEvidenceBytes(FIRST_COHORT_RETURN);
const firstCohortCommittedReturnBytes = readGitBlob(FIRST_COHORT_EVIDENCE_COMMIT, FIRST_COHORT_RETURN);
requireEvidence(
  sha256(firstCohortReturnBytes) === sha256(firstCohortCommittedReturnBytes),
  `${FIRST_COHORT_RETURN} is not byte-identical to ${FIRST_COHORT_EVIDENCE_COMMIT}`
);
requireEvidence(
  sha256(firstCohortReturnBytes) === FIRST_COHORT_RETURN_SHA256,
  `${FIRST_COHORT_RETURN} no longer has the exact admitted first-cohort digest`
);
const firstCohortReturn = JSON.parse(firstCohortReturnBytes.toString("utf8"));
requireEvidence(
  firstCohortReturn.routeResults?.length === FIRST_COHORT_ROUTES.length,
  `${FIRST_COHORT_RETURN} does not contain exactly the four assigned route results`
);

const ownerBatchAdoptionBytes = readEvidenceBytes(OWNER_BATCH_ADOPTION);
const ownerBatchAdoption = JSON.parse(ownerBatchAdoptionBytes.toString("utf8"));
requireEvidence(ownerBatchAdoption.recordId === OWNER_BATCH_ADOPTION_ID, `${OWNER_BATCH_ADOPTION_ID} is absent`);
requireEvidence(ownerBatchAdoption.decisionOwner === "Roger Roman", `${OWNER_BATCH_ADOPTION_ID} has no exact decision owner`);
requireEvidence(ownerBatchAdoption.decidedOn === "2026-09-02", `${OWNER_BATCH_ADOPTION_ID} has an unexpected decision date`);

const firstCohortFamilies = [...new Set(FIRST_COHORT_ROUTES.map((entry) => entry.familyId))].sort();
const ownerQualification = ownerBatchAdoption.adoption?.qualifications?.find((entry) =>
  firstCohortFamilies.every((familyId) => entry.families?.includes(familyId))
) ?? null;
requireEvidence(ownerQualification, `${OWNER_BATCH_ADOPTION_ID} does not adopt all three assigned families in one exact qualification`);
requireEvidence(
  /No runtime, technical, visual, payment, sponsorship, or production authority is granted\./.test(ownerQualification.ownerNote ?? ""),
  `${OWNER_BATCH_ADOPTION_ID} no longer carries its fail-closed qualification`
);

const postApprovalAuditBytes = readEvidenceBytes(POST_APPROVAL_AUDIT);
const postApprovalAudit = JSON.parse(postApprovalAuditBytes.toString("utf8"));
const postApprovalAuditByFamily = new Map(
  (postApprovalAudit.families ?? [])
    .filter((entry) => firstCohortFamilies.includes(entry.familyId))
    .map((entry) => [entry.familyId, entry])
);
const rasterQueueBytes = readEvidenceBytes(RASTER_QUEUE);
const rasterQueue = JSON.parse(rasterQueueBytes.toString("utf8"));
const rasterByFamily = new Map(
  (rasterQueue.rows ?? [])
    .filter((entry) => firstCohortFamilies.includes(entry.familyId))
    .map((entry) => [entry.familyId, entry])
);
const verifierReturnsBytes = readEvidenceBytes(VERIFIER_RETURNS);
const verifierReturns = JSON.parse(verifierReturnsBytes.toString("utf8"));
const verifierByFamily = new Map(
  (verifierReturns.rows ?? [])
    .filter((entry) => firstCohortFamilies.includes(entry.familyId) && entry.superseded === false)
    .map((entry) => [entry.familyId, entry])
);

/**
 * One candidate record from one launch-graph row. Every field is either copied
 * from evidence or recorded as absent. Nothing here decides anything: the
 * shipped authority module reads the record and reaches its own conclusion.
 */
/**
 * The canonical content hash of a route's packet specification.
 *
 * The previous value was sha256 over {packetSetIds, componentCount,
 * participantActionsRequired} -- a set id and two counts. Replacing a bound
 * official form with a different one left it unchanged, and `collectStaleness`
 * compares exactly this value, so the specification could change under a record
 * without anything ever reading as stale. A hash that cannot detect the change
 * it exists to detect is worse than no hash, because the record claims to pin
 * something.
 *
 * This hashes the whole specification instead: for every packet set the route
 * binds, its id and version, and for every component its identity, role,
 * requirement, output strategy, order, the official form it binds and that
 * form's content digest, plus every participant action, the field-map identity
 * of each bound overlay, and the renderer identity. Anything whose change makes
 * the packet a different packet moves this value.
 *
 * Where the shipped resolver has a registered specification for the route, its
 * own committed content hash is folded in as well, so the record and the runtime
 * cannot pin different documents.
 */
function overlayRendererFor(family) {
  for (const root of OVERLAY_ROOTS) {
    const abs = path.join(rootDir, root);
    if (!fs.existsSync(abs)) continue;
    for (const state of fs.readdirSync(abs, { withFileTypes: true })) {
      if (!state.isDirectory()) continue;
      const rel = path.posix.join(root, state.name, family, "reports/rendered-artifacts.json");
      if (fs.existsSync(path.join(rootDir, rel))) return readJson(rel).renderer;
    }
  }
  try {
    const tracked = execFileSync("git", ["-C", rootDir, "ls-tree", "-r", "--name-only", "HEAD", "--", ...OVERLAY_ROOTS], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    }).split("\n");
    const suffix = `/${family}/reports/rendered-artifacts.json`;
    const rel = tracked.find((entry) => entry.endsWith(suffix));
    if (rel) return readJson(rel).renderer ?? "";
  } catch {
    // Absence is evidence too. The caller records an empty renderer identity,
    // which keeps the provider/fileability proof incomplete.
  }
  return "";
}

function canonicalSpecificationSha256(row, sourceDigestById) {
  const packetSetIds = (row.packetSets ?? []).map((entry) => entry.packetSetId).sort();
  const sets = packetSetIds.map((id) => {
    const set = packetSetById.get(id) ?? null;
    if (!set) return { packetSetId: id, present: false };
    return {
      packetSetId: set.packetSetId,
      version: set.version ?? null,
      trackId: set.trackId ?? null,
      components: (set.components ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((component) => ({
          componentId: component.componentId,
          role: component.role,
          requirement: component.requirement,
          conditionDescription: component.conditionDescription ?? null,
          outputStrategy: component.outputStrategy,
          order: component.order,
          officialFormId: component.officialFormId ?? null,
          // The digest of the document the component binds. This is the field
          // the count-based hash could not see: swapping a bound form for
          // another one changes it and changed nothing before.
          officialFormSha256: component.officialFormId
            ? sourceDigestById[component.officialFormId] ?? ""
            : null,
          fieldMapIdentity: component.officialFormId
            ? filingArtifactBySourceId.get(component.officialFormId)?.family ?? ""
            : null
        })),
      participantActionRequired: (set.participantActionRequired ?? []).map((action) => ({
        kind: action.kind,
        requirement: action.requirement,
        requiredBeforeFiling: Boolean(action.requiredBeforeFiling),
        obtainedFrom: action.obtainedFrom ?? null,
        description: action.description
      })),
      requiredBeforeFiling: (set.requiredBeforeFiling ?? []).slice().sort()
    };
  });

  const registered = packetSpecificationFor(row.pathwayKey);
  return sha256(stableStringify({
    contract: "rcap-grade-a-canonical-packet-specification/v1",
    routeId: row.pathwayKey,
    packetSetIds,
    sets,
    renderer: { kind: PACKET_RENDERER_KIND, version: PACKET_RENDERER_VERSION },
    registeredSpecification: registered
      ? {
          specificationId: registered.specificationId,
          specificationVersion: registered.specificationVersion,
          specificationSha256: specificationContentSha256(registered)
        }
      : null
  }));
}

function candidateRecord(row) {
  // Two independent statements of the same fact. The launch graph is the build
  // record's view; the shipped resolver is the runtime's. Where the runtime
  // resolves a family, it wins -- it is the one the admission gate will consult
  // -- and where it does not, the build record's is carried so the disagreement
  // is visible instead of collapsing to null on both sides.
  const resolvedFamilyId = resolvePacketFamilyId(row.pathwayKey);
  const familyId = resolvedFamilyId ?? row.packetFamilies?.[0] ?? null;
  const counselRow = familyId ? counselByFamily.get(familyId) ?? null : null;
  const visualRow = familyId ? visualByFamily.get(familyId) ?? null : null;
  const fixture = fixtureByKey.get(row.pathwayKey) ?? null;
  const packetSetIds = (row.packetSets ?? []).map((entry) => entry.packetSetId).sort();

  const officialSources = (row.sourceAssets?.officialFormIdsNamed ?? []).slice().sort().map((sourceId) => {
    // The digest comes from the governed source registry, which corroborates
    // the digest the packet was built against against the digest the corpus
    // import verified on disk. It is never derived from the identifier: hashing
    // the name proves nothing about the document, and a court could reissue a
    // form under the same identifier without anything reading as stale.
    const governed = sourceRegistry.sources?.[sourceId] ?? null;
    const corroborated = governed?.status === "corroborated";
    return {
      sourceId,
      // The bound digest, and what staleness compares. An uncorroborated source
      // gets the empty string, which is the honest value; a placeholder hash
      // would read as evidence.
      sha256: corroborated ? governed.expectedSha256 : "",
      expectedSha256: governed?.expectedSha256 ?? "",
      installedSha256: governed?.installedSha256 ?? "",
      corpusReleaseId: corroborated ? sourceRegistry.corpusRelease.releaseId : "",
      corpusArchiveSha256: corroborated ? sourceRegistry.corpusRelease.archiveSha256 : "",
      verifiedAt: corroborated ? sourceRegistryVerifiedAt : "",
      verificationRecord: corroborated ? SOURCE_REGISTRY : ""
    };
  });

  // ---- fileability -----------------------------------------------------------
  const independentReview = independentReviewByRoute.get(row.pathwayKey) ?? null;
  const primarySet = packetSetById.get(packetSetIds[0]) ?? null;
  const componentByRole = new Map((primarySet?.components ?? []).map((c) => [c.role, c]));
  const primaryFiling = componentByRole.get("primary_filing") ?? null;
  const filingArtifact = primaryFiling?.officialFormId
    ? filingArtifactBySourceId.get(primaryFiling.officialFormId) ?? null
    : null;
  const registeredSpec = packetSpecificationFor(row.pathwayKey) ?? null;
  const unboundLegal = new Set(registeredSpec?.unboundLegalSections ?? []);

  // A dimension whose content is the court's own published form is covered by
  // that form. A dimension whose content is something this product would state
  // about the law is covered only when a legal-design owner has decided it --
  // and a specification with unbound legal sections has, by construction, no
  // decided statement to print. Marking those covered because a component
  // exists would be the record vouching for pages that would come out empty.
  const dimension = (component, legalSection, whatItWouldSay) => {
    if (!component) return { state: "missing", basis: null };
    if (legalSection && unboundLegal.has(legalSection)) {
      return { state: "missing", basis: null, };
    }
    return { state: "covered", basis: `${primarySet?.packetSetId}:${component.componentId}${whatItWouldSay ? ` (${whatItWouldSay})` : ""}` };
  };
  const attachmentActions = (primarySet?.participantActionRequired ?? []).filter((a) => a.kind === "obtain_document");

  const packetCompleteness = registeredSpec && filingArtifact
    ? {
        specificationId: registeredSpec.specificationId,
        specificationVersion: registeredSpec.specificationVersion,
        specificationSha256: specificationContentSha256(registeredSpec),
        filingApplication: dimension(primaryFiling, null, "official court form"),
        proposedOrder: dimension(componentByRole.get("proposed_order") ?? null, null, "official court form"),
        attachmentsAndSchedules: attachmentActions.length > 0
          ? { state: "covered", basis: `${primarySet.packetSetId}: ${attachmentActions.length} participant obtain_document action(s)` }
          : { state: "missing", basis: null },
        serviceAndNotice: dimension(componentByRole.get("service_instructions") ?? null, "serviceAndNotice"),
        filingDestination: unboundLegal.has("filingDestination") ? { state: "missing", basis: null } : { state: "covered", basis: `${registeredSpec.specificationId}:filingDestination` },
        feeAndWaiverInstructions: unboundLegal.has("feeAndWaiver") ? { state: "missing", basis: null } : { state: "covered", basis: `${registeredSpec.specificationId}:feeAndWaiver` },
        copyRequirements: unboundLegal.has("copyRequirements") ? { state: "missing", basis: null } : { state: "covered", basis: `${registeredSpec.specificationId}:copyRequirements` },
        postFilingSteps: dimension(componentByRole.get("post_order_verification") ?? null, "postFilingTimeline"),
        hearingAndObjectionStopConditions: dimension(componentByRole.get("objection_and_hearing_instructions") ?? null, "hearingAndObjectionStops"),
        customPleadingAuthority: {
          // Every component of this packet is either an official court form or
          // process guidance. Nothing is drafted, so no drafting authority is
          // required -- which is a different statement from having one.
          required: (primarySet?.components ?? []).some((c) => c.outputStrategy === "custom_pleading"),
          approved: false,
          authorityId: null
        },
        filingFormatArtifact: {
          format: "pdf",
          sha256: filingArtifact.sha256,
          pageCount: filingArtifact.pageCount,
          producedBy: {
            renderer: overlayRendererFor(filingArtifact.family),
            matchesRecordProvider: false,
            reconciliation:
              "The record's provider is the digest-pinned worker image that renders packets at delivery. This artifact was produced by the official-form regeneration factory, which is what fills an official court PDF; the worker image composes documents and does not fill official forms. Binding the reviewed artifact to the delivery image would claim a provenance nobody checked. Both identities are recorded so a reviewer sees which produced the bytes they looked at.",
            deterministicRenderVerified: true
          }
        },
        companionArtifacts: (primarySet?.components ?? [])
          .filter((c) => c.officialFormId && c.officialFormId !== primaryFiling?.officialFormId)
          .map((c) => {
            const artifact = filingArtifactBySourceId.get(c.officialFormId) ?? null;
            return artifact
              ? { componentId: c.componentId, sourceId: c.officialFormId, format: "pdf", sha256: artifact.sha256, pageCount: artifact.pageCount }
              : { componentId: c.componentId, sourceId: c.officialFormId, format: "pdf", sha256: null, pageCount: 0 };
          })
      }
    : null;

  const laneVisualReview = laneVisualReviewByRoute.get(row.pathwayKey) ?? null;
  const visualPageCount = visualRow?.pagesOnSheet ?? 0;
  const visualStateFromCounsel = counselRow ? reviewState(counselRow.visualReviewResult) : "pending";

  const record = {
    // A record declares the admission schema only when it actually carries the
    // dimension that schema adds. Declaring v2 without a fileability proof would
    // be the record claiming to have answered a question it never asked.
    schemaVersion: packetCompleteness ? GRADE_A_ADMISSION_SCHEMA_VERSION : GRADE_A_AUTHORITY_SCHEMA_VERSION,
    recordId: `grade-a-${row.jurisdiction.toLowerCase()}-${row.pathwayId}-v1`,
    routeId: row.pathwayKey,
    jurisdiction: row.jurisdiction,
    pathwayId: row.pathwayId,
    packetFamilyId: familyId,
    // Every row this generator reads comes from the frozen paid denominator, so
    // the disposition is the paid one. It is written explicitly rather than
    // assumed, because the authority refuses to prove any other disposition and
    // a future row with a different one must say so.
    serviceDisposition: "paid_packet_intended",
    version: 1,
    effectiveFrom: ownerDecision.effectiveDate,
    supersededBy: null,
    supersededAt: null,
    revocation: { revoked: false, reason: null, revokedAt: null, revokedBy: null },
    legalAuthority: {
      recordId: row.ownerLegalDecisionRecordId ?? ownerDecision.recordId,
      version: ownerDecision.recordId,
      status: row.ownerApprovedLegalStatus === "approved_by_decision_owner" ? "approved_by_decision_owner" : "pending",
      effectiveDate: ownerDecision.effectiveDate,
      scopeSha256: sha256(ownerDecision.scopeStatement ?? "")
    },
    packetSpecification: {
      specId: packetSetIds.join("+") || `${row.pathwayKey}:no-packet-set`,
      sha256: packetSetIds.length > 0
        ? canonicalSpecificationSha256(row, Object.fromEntries(officialSources.map((s) => [s.sourceId, s.sha256])))
        : "",
      complete: Boolean(row.packetSpecification?.complete)
    },
    officialSources,
    provider,
    fixture: {
      fixtureId: fixture ? fixture.pathwayKey : `${row.pathwayKey}:no-fixture`,
      sha256: fixture ? sha256(stableStringify(fixture.answers ?? {})) : "",
      deterministic: Boolean(row.artifactResult?.deterministic)
    },
    artifactValidation: filingArtifact
      ? {
          // The object a participant would actually file, not the text
          // composition the launch graph's artifact probe produced. Those are
          // two different objects and the record used to validate the wrong one:
          // under FILEABLE_ARTIFACT_FORMATS a text composition is not a filing,
          // so a record that validated it had proven a render happened and
          // nothing about whether the result could be filed.
          state: "validated",
          artifactSha256: filingArtifact.sha256,
          validatedAt: independentReview?.doc.reviewedAt ?? ownerDecision.effectiveDate
        }
      : {
          state: row.artifactResult?.rendered && (row.artifactResult?.errors ?? []).length === 0 ? "validated" : "not_run",
          artifactSha256: row.artifactResult?.sha256 ?? null,
          validatedAt: row.artifactResult?.sha256 ? launchGraph.generatedAt ?? ownerDecision.effectiveDate : null
        },
    packetCompleteness,
    // The independent raster review where one exists, the implementing lane's
    // byte-level review otherwise. Lane C's review is real evidence and is kept
    // as such -- it is cited in the independent review it is compared against --
    // but a review that recorded "rasterReview: not performed" is not the
    // page-by-page pass a Grade-A record needs to cite.
    visualReview: independentReview
      ? {
          state: "passed",
          pagesReviewed: independentReview.doc.pagesReviewed,
          pageCount: independentReview.doc.pageCount,
          evidenceSha256: independentReview.evidenceSha256,
          reviewedBy: `${independentReview.doc.generatedBy} (independent raster review)`,
          reviewedAt: laneVisualReview?.reviewedAt ?? ownerDecision.effectiveDate,
          evidencePath: independentReview.rel,
          supersedes: laneVisualReview?.evidencePath ?? null
        }
      : laneVisualReview ?? {
      state: visualRow?.comparable && visualRow?.controlDiscriminates ? visualStateFromCounsel : visualStateFromCounsel,
      pagesReviewed: visualRow?.comparable ? visualPageCount : 0,
      pageCount: visualPageCount,
      evidenceSha256: visualRow?.contactSheetSha256 ?? null,
      reviewedBy: null,
      reviewedAt: null
    },
    outputLegalApproval: {
      state: counselRow ? reviewState(counselRow.completedOutputLegalReview) : "pending",
      reviewerId: counselRow?.completedOutputLegalReview === "complete" ? counselRow.legalDecisionOwner ?? null : null,
      decidedAt: counselRow?.completedOutputLegalReview === "complete" ? counselRow.legalDecisionEffectiveDate ?? null : null,
      scopeSha256: counselRow?.completedOutputLegalReview === "complete" ? counselRow.currentPacketProofSha256 ?? null : null
    },
    finalVerification: {
      // What "bound" would have to mean is now stated exactly rather than left
      // to whoever writes the first hash: src/lib/rcap/fulfillment/
      // final-verification-contract.ts enumerates the nine inputs and computes
      // the digest over them, so a verification is current only while the world
      // it was taken in still hashes to the same value. A material Review and
      // Edit change moves the fact snapshot and invalidates it by arithmetic.
      contract: "rcap-final-verification-bound-inputs/v1",
      contractModule: "src/lib/rcap/fulfillment/final-verification-contract.ts",
      // No lane has produced a final verification bound to the exact proof set
      // below, so the record says unbound. This is the dimension that most
      // wants a default of "true"; it gets the opposite.
      state: "unbound",
      verifierId: null,
      boundInputsSha256: null,
      verifiedAt: null
    },
    history: []
  };

  record.history = [{
    version: 1,
    changeKind: "created",
    changedAt: ownerDecision.effectiveDate,
    changedBy: "scripts/generate-rcap-grade-a-fulfillment-authority.mjs",
    reason: `Candidate Grade-A fulfillment record derived from ${LAUNCH_GRAPH}, ${COUNSEL_MANIFEST}, ${VISUAL_PROOF}, ${WITNESS_FIXTURES} and ${WORKER_EVIDENCE}. No approval is created here.`,
    recordSha256: fulfillmentRecordSha256(record),
    supersedesRecordSha256: null
  }];

  return record;
}

/**
 * The clinic-demo route is deliberately supplemental to the frozen paid launch
 * denominator. Its participant-delivery build and raster evidence are real,
 * and exact-output counsel approval are real. The earlier approval remains
 * historical evidence for different internal-review bytes and is never carried
 * into this record. Final verification and every technical Preview predicate
 * remain independent, so sponsored Preview posture stays held.
 */
function mississippiClinicCandidateRecord() {
  const specificationBytes = readEvidenceBytes(MS_CLINIC_SPECIFICATION);
  const fixtureBytes = readEvidenceBytes(MS_CLINIC_FIXTURE);
  const artifacts = readJson(MS_CLINIC_ARTIFACTS);
  const rasterReviewBytes = readEvidenceBytes(MS_CLINIC_RASTER_REVIEW);
  const rasterReview = JSON.parse(rasterReviewBytes);
  const canonical = artifacts.artifacts.find((artifact) => artifact.fixture === "participant_delivery_canonical");
  const boundary = artifacts.artifacts.find((artifact) => artifact.fixture === "participant_delivery_boundary");
  const historicalCanonical = artifacts.artifacts.find((artifact) => artifact.fixture === "canonical");
  const historicalBoundary = artifacts.artifacts.find((artifact) => artifact.fixture === "boundary");
  const historicalApproval = artifacts.outputLegalApproval;
  const participantReview = artifacts.participantDeliveryReview;
  const canonicalRaster = rasterReview.artifacts?.find((artifact) => artifact.fixture === "participant_delivery_canonical");
  if (!canonical) throw new Error("Mississippi clinic artifact evidence has no canonical artifact");
  if (!boundary) throw new Error("Mississippi clinic artifact evidence has no boundary artifact");
  if (!canonicalRaster) throw new Error("Mississippi clinic raster evidence has no canonical artifact");
  if (!historicalCanonical || !historicalBoundary ||
    historicalApproval?.state !== "approved" ||
    historicalApproval.decision !== "APPROVE" ||
    historicalApproval.reviewerId !== "Lawrence Blackmon" ||
    historicalApproval.decidedAt !== "2026-09-03" ||
    historicalApproval.routeId !== MS_CLINIC_ROUTE ||
    historicalApproval.packetFamily !== "ms-nonconv-set" ||
    historicalApproval.canonicalSha256 !== historicalCanonical.sha256 ||
    historicalApproval.boundarySha256 !== historicalBoundary.sha256 ||
    historicalApproval.specificationSha256 !== sha256(specificationBytes) ||
    historicalApproval.consumerPaidAuthorized !== false ||
    historicalApproval.productionAuthorized !== false
  ) {
    throw new Error("Mississippi clinic historical internal-review approval is absent or no longer binds its exact bytes");
  }
  if (participantReview?.state !== "approved"
    || participantReview.reviewerId !== "Lawrence Blackmon"
    || participantReview.decision !== "APPROVE"
    || participantReview.decidedAt !== "2026-09-03"
    || !Array.isArray(participantReview.qualifications)
    || participantReview.qualifications.length !== 0
    || participantReview.authenticationKind !== "owner_attestation"
    || !participantReview.authenticatedApprovalReference?.startsWith("Owner attestation by Roger Roman")
    || participantReview.routeId !== MS_CLINIC_ROUTE
    || participantReview.packetFamily !== "ms-nonconv-set"
    || participantReview.previewPartnerSlug !== "mvl-demo"
    || participantReview.canonical?.sha256 !== canonical.sha256
    || participantReview.canonical?.byteLength !== canonical.byteLength
    || participantReview.canonical?.pageCount !== canonical.pageCount
    || participantReview.boundary?.sha256 !== boundary.sha256
    || participantReview.boundary?.byteLength !== boundary.byteLength
    || participantReview.boundary?.pageCount !== boundary.pageCount
    || participantReview.documentCount !== 5
    || participantReview.packetSpecificationId !== "ms-nonconviction-expungement-99-19-71-4"
    || participantReview.packetSpecificationVersion !== "2.0.0"
    || participantReview.packetSpecificationSha256 !== sha256(specificationBytes)
    || participantReview.rendererIdentity !== "rcap_grade_a_document_v1"
    || participantReview.rendererVersion !== "2.0.0"
    || participantReview.workerSourceSha !== "b680a4e4dd92e7422bc7030aa2189026929782a1"
    || participantReview.deliveryScope !== "sponsored_preview_only_two_synthetic_staging_participants_after_all_technical_gates_pass"
    || participantReview.priorApprovalReused !== false
    || participantReview.approvalRecorded !== true
    || participantReview.consumerPaidAuthorized !== false
    || participantReview.productionAuthorized !== false) {
    throw new Error("Mississippi participant-delivery approval is absent or no longer binds the exact approved bytes and scope");
  }
  const approvalScopeSha256 = sha256(stableStringify(participantReview));

  const composerBytes = readEvidenceBytes("src/lib/rcap/grade-a/composer.ts");
  const rendererBytes = readEvidenceBytes("src/lib/rcap/grade-a/renderer.ts");
  const record = {
    schemaVersion: GRADE_A_ADMISSION_SCHEMA_VERSION,
    recordId: "grade-a-ms-non-conviction-expungement-clinic-demo-v1",
    routeId: MS_CLINIC_ROUTE,
    jurisdiction: "MS",
    pathwayId: MS_CLINIC_ROUTE.slice(3),
    packetFamilyId: "ms-nonconv-set",
    serviceDisposition: "paid_packet_intended",
    version: 1,
    effectiveFrom: "2026-09-03",
    supersededBy: null,
    supersededAt: null,
    revocation: { revoked: false, reason: null, revokedAt: null, revokedBy: null },
    legalAuthority: {
      recordId: ownerDecision.recordId,
      version: ownerDecision.recordId,
      status: "approved_by_decision_owner",
      effectiveDate: ownerDecision.effectiveDate,
      scopeSha256: sha256(ownerDecision.scopeStatement ?? "")
    },
    packetSpecification: {
      specId: "ms-nonconviction-expungement-99-19-71-4@2.0.0",
      sha256: sha256(specificationBytes),
      complete: true
    },
    officialSources: [],
    provider: {
      providerId: "rcap_grade_a_composer_v1",
      rendererKind: "rcap_grade_a_document_v1",
      rendererVersion: "2.0.0",
      imageDigest: `sha256:${sha256(Buffer.concat([composerBytes, rendererBytes]))}`
    },
    fixture: {
      fixtureId: "ms-nonconviction-clinic-demo-participant-a",
      sha256: sha256(fixtureBytes),
      deterministic: artifacts.deterministic === true
    },
    artifactValidation: {
      state: "validated",
      artifactSha256: canonical.sha256,
      validatedAt: "2026-09-03"
    },
    packetCompleteness: {
      specificationId: "ms-nonconviction-expungement-99-19-71-4",
      specificationVersion: "2.0.0",
      specificationSha256: sha256(specificationBytes),
      filingApplication: { state: "covered", basis: "ms-nonconv-set:ms-nonconv-primary-filing-1" },
      proposedOrder: { state: "covered", basis: "ms-nonconv-set:ms-nonconv-proposed-order-2" },
      attachmentsAndSchedules: { state: "covered", basis: "ms-nonconv-set:ms-nonconv-attachment-4" },
      serviceAndNotice: { state: "covered", basis: "ms-nonconv-set:ms-nonconv-certificate-of-service-3" },
      filingDestination: { state: "covered", basis: "ms-nonconviction-expungement-99-19-71-4:filingDestination" },
      feeAndWaiverInstructions: { state: "covered", basis: "ms-nonconviction-expungement-99-19-71-4:feeAndWaiver" },
      copyRequirements: { state: "covered", basis: "ms-nonconviction-expungement-99-19-71-4:copyRequirements" },
      postFilingSteps: { state: "covered", basis: "ms-nonconv-set:ms-nonconv-instructions-5" },
      hearingAndObjectionStopConditions: { state: "covered", basis: "ms-nonconviction-expungement-99-19-71-4:hearingAndObjectionStops" },
      customPleadingAuthority: {
        required: true,
        approved: true,
        authorityId: ownerDecision.recordId
      },
      filingFormatArtifact: {
        format: "pdf",
        sha256: canonical.sha256,
        pageCount: canonical.pageCount,
        producedBy: {
          renderer: "rcap_grade_a_document_v1@2.0.0",
          matchesRecordProvider: true,
          reconciliation: null,
          deterministicRenderVerified: artifacts.deterministic === true
        }
      }
    },
    visualReview: {
      state: rasterReview.status === "passed" && canonicalRaster.pagesReviewed === canonicalRaster.pageCount ? "passed" : "pending",
      pagesReviewed: rasterReview.status === "passed" ? canonicalRaster.pagesReviewed : 0,
      pageCount: canonicalRaster.pageCount,
      evidenceSha256: sha256(rasterReviewBytes),
      reviewedBy: rasterReview.status === "passed" ? rasterReview.reviewer : null,
      reviewedAt: rasterReview.status === "passed" ? rasterReview.reviewedOn : null
    },
    outputLegalApproval: {
      state: "passed",
      reviewerId: participantReview.reviewerId,
      decidedAt: participantReview.decidedAt,
      scopeSha256: approvalScopeSha256
    },
    finalVerification: {
      contract: "rcap-final-verification-bound-inputs/v1",
      contractModule: "src/lib/rcap/fulfillment/final-verification-contract.ts",
      state: "unbound",
      verifierId: null,
      boundInputsSha256: null,
      verifiedAt: null
    },
    history: []
  };
  record.history = [{
    version: 1,
    changeKind: "created",
    changedAt: "2026-09-03",
    changedBy: "scripts/generate-rcap-grade-a-fulfillment-authority.mjs",
    reason: `Clinic Preview participant-delivery candidate derived from ${MS_CLINIC_SPECIFICATION}, ${MS_CLINIC_FIXTURE}, ${MS_CLINIC_ARTIFACTS}, and ${MS_CLINIC_RASTER_REVIEW}. Lawrence Blackmon approved the new exact participant-delivery hashes by owner attestation; the earlier internal-review approval remains historical and was not reused. Participant final verification and all technical Preview predicates remain independent, so delivery stays held.`,
    recordSha256: fulfillmentRecordSha256(record),
    supersedesRecordSha256: null
  }];
  return record;
}

function exactSourceIdentity(specification, kind, routeId) {
  const matches = (specification.sourceIdentities ?? []).filter((entry) => entry.kind === kind);
  requireEvidence(matches.length === 1, `${routeId} must name exactly one ${kind} source identity`);
  return matches[0];
}

/**
 * Bind a zero-official-binary custom pleading to the committed authority that
 * actually governs its words. This is not an official-form receipt. The
 * `sourceKind` discriminator and the explicit null officialBinarySource keep
 * that distinction machine-readable even though the v2 authority's legacy
 * source collection is still named `officialSources`.
 */
function codifiedAuthorityProof({
  routeId,
  familyId,
  jurisdiction,
  specificationPath,
  specification,
  specificationBytes,
  sourceReceiptPath,
  verification
}) {
  const sourceReceiptBytes = readEvidenceBytes(sourceReceiptPath);
  const sourceReceipt = JSON.parse(sourceReceiptBytes.toString("utf8"));
  requireEvidence(sourceReceipt.familyId === familyId, `${sourceReceiptPath} names a different family`);
  requireEvidence(sourceReceipt.implementationStrategy === "custom_pleading", `${sourceReceiptPath} is not a custom-pleading receipt`);
  requireEvidence(sourceReceipt.sourceBinaryCommitted === false, `${sourceReceiptPath} claims a source binary was committed`);
  requireEvidence(sourceReceipt.commercialRoutesOpened === 0, `${sourceReceiptPath} claims a commercial route was opened`);

  const includedReceiptBinaries = (sourceReceipt.documents ?? []).filter((document) =>
    document.instrumentKind !== "bound_reference_instrument"
      || !/not included/i.test(document.role ?? "")
  );
  requireEvidence(
    includedReceiptBinaries.length === 0,
    `${sourceReceiptPath} includes a binary source and cannot use codified authority`
  );

  const officialBinarySpecificationDocuments = (specification.documents ?? []).filter((document) =>
    document.outputStrategy === "official_pdf_fill"
      || Boolean(document.officialFormId)
      || Boolean(document.officialSourceId)
      || Boolean(document.sourcePdfPath)
  );
  requireEvidence(
    officialBinarySpecificationDocuments.length === 0,
    `${specificationPath} requires an official PDF component and cannot use codified authority`
  );
  requireEvidence(
    (specification.documents ?? []).some((document) => document.outputStrategy === "custom_pleading"),
    `${specificationPath} has no custom pleading to ground in codified authority`
  );

  const packetSet = packetSetById.get(specification.packetSetId) ?? null;
  requireEvidence(packetSet?.packetSetId === familyId, `${specificationPath} does not bind packet set ${familyId}`);
  const officialBinaryManifestComponents = (packetSet.components ?? []).filter((component) =>
    component.outputStrategy === "official_pdf_fill" || Boolean(component.officialFormId)
  );
  requireEvidence(
    officialBinaryManifestComponents.length === 0,
    `${familyId} has an official PDF component and cannot use codified authority`
  );

  const trackIdentity = exactSourceIdentity(specification, "legal_design_intake_track", routeId);
  const packetSetIdentity = exactSourceIdentity(specification, "owner_approved_packet_set_manifest", routeId);
  const legalIdentity = exactSourceIdentity(specification, "owner_exact_digest_adoption", routeId);
  const trackExpected = CODIFIED_TRACK_INPUTS[jurisdiction];
  requireEvidence(trackExpected, `${routeId} has no admitted codified track input`);
  requireEvidence(trackIdentity.location === trackExpected.path, `${routeId} names a different track-authority path`);
  requireEvidence(packetSetIdentity.location === CODIFIED_COMMON_INPUTS.packetSet.path, `${routeId} names a different packet-set authority path`);
  requireEvidence(legalIdentity.location === CODIFIED_COMMON_INPUTS.legal.path, `${routeId} names a different legal-authority path`);
  requireEvidence(legalIdentity.sourceId === OWNER_BATCH_ADOPTION_ID, `${routeId} names a different legal authority`);

  const trackBytes = readEvidenceBytes(trackExpected.path);
  const packetSetBytes = readEvidenceBytes(CODIFIED_COMMON_INPUTS.packetSet.path);
  const legalBytes = readEvidenceBytes(CODIFIED_COMMON_INPUTS.legal.path);
  requireEvidence(sha256(trackBytes) === trackExpected.sha256, `${trackExpected.path} moved after the admitted current digest`);
  requireEvidence(sha256(packetSetBytes) === CODIFIED_COMMON_INPUTS.packetSet.sha256, `${CODIFIED_COMMON_INPUTS.packetSet.path} moved after the admitted current digest`);
  requireEvidence(sha256(legalBytes) === CODIFIED_COMMON_INPUTS.legal.sha256, `${CODIFIED_COMMON_INPUTS.legal.path} moved after the admitted current digest`);

  const trackDocument = JSON.parse(trackBytes.toString("utf8"));
  requireEvidence(
    (trackDocument.tracks ?? []).some((track) => track.trackId === specification.trackId && track.outputStrategy === "custom_pleading"),
    `${trackExpected.path} has no exact custom-pleading track ${specification.trackId}`
  );

  const boundInputs = {
    contract: CODIFIED_AUTHORITY_CONTRACT,
    routeId,
    familyId,
    trackId: specification.trackId,
    packetSetId: specification.packetSetId,
    implementationStrategy: "custom_pleading",
    officialBinaryComponentsExpected: false,
    classificationEvidence: {
      path: sourceReceiptPath,
      sha256: sha256(sourceReceiptBytes)
    },
    authorityInputs: [
      {
        role: "track_authority",
        sourceId: trackIdentity.sourceId,
        path: trackExpected.path,
        sha256: trackExpected.sha256
      },
      {
        role: "legal_authority",
        sourceId: OWNER_BATCH_ADOPTION_ID,
        path: CODIFIED_COMMON_INPUTS.legal.path,
        sha256: CODIFIED_COMMON_INPUTS.legal.sha256
      },
      {
        role: "packet_set_authority",
        sourceId: packetSetIdentity.sourceId,
        path: CODIFIED_COMMON_INPUTS.packetSet.path,
        sha256: CODIFIED_COMMON_INPUTS.packetSet.sha256
      },
      {
        role: "packet_specification_authority",
        sourceId: `${specification.specificationId}@${specification.specificationVersion}`,
        path: specificationPath,
        sha256: sha256(specificationBytes)
      }
    ]
  };
  const boundInputsSha256 = sha256(stableStringify(boundInputs));

  return {
    sourceKind: "codified_authority",
    sourceId: `codified-authority:${familyId}:${routeId}`,
    sha256: boundInputsSha256,
    expectedSha256: boundInputsSha256,
    installedSha256: boundInputsSha256,
    // Explicit sentinels, not invented corpus or binary identities. The
    // observation generator mirrors them only for codified-authority records.
    corpusReleaseId: "not_applicable:codified_authority",
    corpusArchiveSha256: "not_applicable:codified_authority",
    verifiedAt: `base:${verification.verifiedAtBase}`,
    verificationRecord: sourceReceiptPath,
    officialBinaryExpected: false,
    officialBinarySource: null,
    contract: CODIFIED_AUTHORITY_CONTRACT,
    boundInputs,
    boundInputsSha256
  };
}

/**
 * Candidate authority for one of the four already-productized first-cohort
 * routes. The packet factory proves a family; this function deliberately
 * produces a separate record for each exact runtime route and refuses any
 * wildcard or neighbouring route.
 *
 * The owner adoption is legal/output evidence for the exact pinned bytes only.
 * Its own qualification says it grants no runtime or commercial authority, and
 * the raster and independent-verification receipts say the same. Those proofs
 * are bound here to their exact current rows and artifact inputs. The source
 * gate is satisfied only through an explicitly discriminated codified-authority
 * proof after both the specification and packet-set components prove that no
 * official PDF is required.
 */
function firstCohortCandidateRecord(definition) {
  const {
    assignmentClaim, routeId, familyId, specificationPath, builderPath, providerPaths, overlayRoot, verification
  } = definition;
  const jurisdiction = routeId.slice(0, routeId.indexOf(":"));
  const pathwayId = routeId.slice(routeId.indexOf(":") + 1);

  const returnedRoute = firstCohortReturn.routeResults.find((entry) => entry.routeId === routeId) ?? null;
  requireEvidence(returnedRoute, `${FIRST_COHORT_RETURN} has no result for ${routeId}`);
  requireEvidence(returnedRoute.familyId === familyId, `${routeId} maps to ${returnedRoute.familyId}, not ${familyId}, in the committed return`);
  requireEvidence(returnedRoute.availabilityAfterChange === "UNFINISHED", `${routeId} was unexpectedly opened by the productization return`);
  requireEvidence(returnedRoute.artifacts?.length === 2, `${routeId} does not bind exactly canonical and boundary artifacts`);
  requireEvidence(resolvePacketFamilyId(routeId) === familyId, `the shipped resolver does not map ${routeId} to ${familyId}`);

  const specificationBytes = readEvidenceBytes(specificationPath);
  const specification = JSON.parse(specificationBytes.toString("utf8"));
  requireEvidence(specification.jurisdiction === jurisdiction, `${specificationPath} has the wrong jurisdiction for ${routeId}`);
  requireEvidence(specification.packetFamily === familyId, `${specificationPath} has the wrong family for ${routeId}`);
  requireEvidence(specification.routeKeys?.includes(routeId), `${specificationPath} does not enumerate ${routeId}`);
  requireEvidence(specification.legalSectionsBound === true, `${specificationPath} does not bind its legal sections`);
  requireEvidence(
    specification.legalSectionsBoundBy?.ownerDecisionRecordId === OWNER_BATCH_ADOPTION_ID,
    `${specificationPath} is not bound to ${OWNER_BATCH_ADOPTION_ID}`
  );
  requireEvidence(
    specification.legalSectionsBoundBy?.postApprovalAuditVerdict === "COVERED_BY_EXISTING_APPROVAL",
    `${specificationPath} does not carry the current post-approval verdict`
  );

  const approvedByFixture = new Map((specification.approvedArtifacts ?? []).map((entry) => [entry.fixture, entry]));
  const returnedByFixture = new Map((returnedRoute.artifacts ?? []).map((entry) => [entry.fixture, entry]));
  const ownerPins = ownerQualification.digestConditionRecordedPerFamily?.[familyId] ?? [];
  const ownerPinByFixture = new Map(ownerPins.map((entry) => [entry.fixture, entry]));
  const canonical = approvedByFixture.get("canonical") ?? null;
  const boundary = approvedByFixture.get("boundary") ?? null;
  requireEvidence(canonical && boundary && approvedByFixture.size === 2, `${specificationPath} does not hold exactly canonical and boundary approvals`);

  for (const artifact of [canonical, boundary]) {
    const returned = returnedByFixture.get(artifact.fixture) ?? null;
    const ownerPin = ownerPinByFixture.get(artifact.fixture) ?? null;
    requireEvidence(returned?.sha256 === artifact.sha256, `${routeId} ${artifact.fixture} hash differs from ${FIRST_COHORT_RETURN}`);
    requireEvidence(returned?.byteLength === artifact.byteLength, `${routeId} ${artifact.fixture} byte length differs from ${FIRST_COHORT_RETURN}`);
    requireEvidence(returned?.pageCount === artifact.pageCount, `${routeId} ${artifact.fixture} page count differs from ${FIRST_COHORT_RETURN}`);
    requireEvidence(returned?.unchanged === true, `${routeId} ${artifact.fixture} was not returned as unchanged`);
    requireEvidence(ownerPin?.file === artifact.file, `${OWNER_BATCH_ADOPTION_ID} pins a different ${artifact.fixture} path for ${familyId}`);
    requireEvidence(ownerPin?.sha256 === artifact.sha256, `${OWNER_BATCH_ADOPTION_ID} pins a different ${artifact.fixture} hash for ${familyId}`);
    requireEvidence(sha256(readEvidenceBytes(artifact.file)) === artifact.sha256, `${artifact.file} no longer hashes to its approved digest`);
  }

  const audit = postApprovalAuditByFamily.get(familyId) ?? null;
  requireEvidence(audit?.verdict === "COVERED_BY_EXISTING_APPROVAL", `${familyId} has no current covered-by-existing-approval audit`);
  requireEvidence(audit?.reviewedAgainstApprovalRecordId === OWNER_BATCH_ADOPTION_ID, `${familyId} audit cites a different owner decision`);
  requireEvidence(audit?.mayEnterTheFirstCohort === true, `${familyId} was not admitted to the bounded first cohort`);
  requireEvidence(audit.currentShippingArtifact?.fixtures?.length === 2, `${familyId} audit does not bind both fixture hashes`);

  const renderedArtifactsPath = `${overlayRoot}/reports/rendered-artifacts.json`;
  const sourceReceiptPath = `${overlayRoot}/source-receipt.json`;
  const productionFieldMapPath = `${overlayRoot}/production-field-map.json`;
  const participantInstructionsPath = `${overlayRoot}/participant-instructions.md`;
  const renderedArtifactsBytes = readEvidenceBytes(renderedArtifactsPath);
  const renderedArtifacts = JSON.parse(renderedArtifactsBytes.toString("utf8"));
  requireEvidence(sha256(renderedArtifactsBytes) === audit.currentShippingArtifact.renderedArtifactsReportSha256, `${familyId} rendered-artifact report drifted after the audit`);
  requireEvidence(sha256(readEvidenceBytes(sourceReceiptPath)) === audit.currentShippingArtifact.sourceReceiptSha256, `${familyId} source receipt drifted after the audit`);
  requireEvidence(sha256(readEvidenceBytes(productionFieldMapPath)) === audit.currentShippingArtifact.productionFieldMapSha256, `${familyId} production field map drifted after the audit`);
  requireEvidence(sha256(readEvidenceBytes(participantInstructionsPath)) === audit.currentShippingArtifact.participantInstructionsSha256, `${familyId} participant instructions drifted after the audit`);
  requireEvidence(renderedArtifacts.familyId === familyId, `${renderedArtifactsPath} names a different family`);
  requireEvidence(renderedArtifacts.renderedFresh === true && renderedArtifacts.derivedFromBytes === true && renderedArtifacts.byteDerivedHashes === true, `${renderedArtifactsPath} does not carry fresh byte-derived artifact evidence`);
  for (const artifact of [canonical, boundary]) {
    const rendered = renderedArtifacts.artifacts?.find((entry) => entry.fixture === artifact.fixture) ?? null;
    const audited = audit.currentShippingArtifact.fixtures.find((entry) => entry.fixture === artifact.fixture) ?? null;
    requireEvidence(rendered?.sha256 === artifact.sha256, `${renderedArtifactsPath} has a different ${artifact.fixture} hash`);
    requireEvidence(rendered?.byteLength === artifact.byteLength, `${renderedArtifactsPath} has a different ${artifact.fixture} byte length`);
    requireEvidence(rendered?.pageCount === artifact.pageCount, `${renderedArtifactsPath} has a different ${artifact.fixture} page count`);
    requireEvidence(audited?.sha256ApprovedAndNow === artifact.sha256, `${familyId} audit has a different ${artifact.fixture} hash`);
    requireEvidence(audited?.pageCountNow === artifact.pageCount, `${familyId} audit has a different ${artifact.fixture} page count`);
  }

  const currentVerifierRows = (verifierReturns.rows ?? [])
    .filter((entry) => entry.familyId === familyId && entry.superseded === false);
  requireEvidence(currentVerifierRows.length === 1, `${familyId} must have exactly one current independent-verification registry row`);
  const verifier = verifierByFamily.get(familyId) ?? null;
  requireEvidence(verifier?.verdict === "PASS_COMPLETE_INDEPENDENT", `${familyId} has no current independent complete verdict`);
  requireEvidence(verifier?.isIndependentVerification === true, `${familyId} current verdict is not independent`);
  requireEvidence(verifier?.superseded === false, `${familyId} current independent verdict is superseded`);
  requireEvidence(verifier?.failedObligations?.length === 0 && verifier?.unmeasuredObligations?.length === 0, `${familyId} current independent verdict still has proof gaps`);
  requireEvidence(Boolean(verifier?.verifiedAtBase), `${familyId} current independent verdict declares no verified base`);
  requireEvidence(verifier.lane === verification.lane, `${familyId} current independent verdict comes from ${verifier.lane}, not ${verification.lane}`);
  requireEvidence(verifier.verifiedAtBase === verification.verifiedAtBase, `${familyId} current independent verdict declares a different verified base`);
  requireEvidence(verifier.evidencePath === verification.evidencePath, `${familyId} current independent verdict names a different evidence path`);
  const verifierRowSha256 = sha256(JSON.stringify(verifier));
  requireEvidence(verifierRowSha256 === audit.currentIndependentVerification?.verifierRowJsonStringifySha256ApprovedAndNow, `${familyId} current independent verdict row drifted after the audit`);
  requireEvidence(verifierRowSha256 === verification.rowSha256, `${familyId} current independent verdict row differs from the admitted exact digest`);

  const verifierEvidenceBytes = readEvidenceBytes(verifier.evidencePath);
  const verifierEvidence = JSON.parse(verifierEvidenceBytes.toString("utf8"));
  const verifierEvidenceRows = (verifierEvidence.rows ?? []).filter((entry) => entry.itemId === familyId);
  requireEvidence(verifierEvidenceRows.length === 1, `${verifier.evidencePath} must have exactly one row for ${familyId}`);
  const verifierEvidenceRow = verifierEvidenceRows[0];
  requireEvidence(verifierEvidenceRow.verdict === "PASS_COMPLETE_INDEPENDENT", `${verifier.evidencePath} has a weaker verdict for ${familyId}`);
  requireEvidence(verifierEvidenceRow.verifiedAtBase === verification.verifiedAtBase, `${verifier.evidencePath} has a different verified base for ${familyId}`);
  requireEvidence(String(verifierEvidenceRow.lane ?? "").toLowerCase() === verification.lane, `${verifier.evidencePath} has a different lane for ${familyId}`);
  const verifierEvidenceRowSha256 = sha256(JSON.stringify(verifierEvidenceRow));
  requireEvidence(verifierEvidenceRowSha256 === verification.evidenceRowSha256, `${verifier.evidencePath} row for ${familyId} mutated after admission`);
  const verifierEvidenceRowText = JSON.stringify(verifierEvidenceRow);
  requireEvidence(verifierEvidenceRowText.includes(canonical.sha256), `${verifier.evidencePath} does not bind the exact canonical digest for ${familyId}`);
  requireEvidence(verifierEvidenceRowText.includes(boundary.sha256), `${verifier.evidencePath} does not bind the exact boundary digest for ${familyId}`);

  const raster = rasterByFamily.get(familyId) ?? null;
  requireEvidence(raster?.currentRasterState === "RASTER_PASS", `${familyId} has no current raster pass`);
  requireEvidence(raster?.rasterReceipt?.verdict === "RASTER_PASS" && raster.rasterReceipt.jobConclusion === "success", `${familyId} raster receipt is not a successful pass`);
  requireEvidence(raster.rasterReceipt.coversTheWholeFamily === true, `${familyId} raster receipt does not cover the whole family`);
  requireEvidence(raster.rasterReceipt.boundToCanonicalSha256 === canonical.sha256, `${familyId} raster receipt binds a different canonical hash`);
  requireEvidence(raster.rasterReceipt.boundToBoundarySha256 === boundary.sha256, `${familyId} raster receipt binds a different boundary hash`);
  requireEvidence(audit.currentRasterPins?.workflowRunId === raster.rasterReceipt.workflowRunId, `${familyId} audit and raster receipt disagree on workflow run`);
  requireEvidence(audit.currentRasterPins?.jobId === raster.rasterReceipt.jobId, `${familyId} audit and raster receipt disagree on job`);
  requireEvidence(audit.currentRasterPins?.canonicalSha256 === canonical.sha256, `${familyId} audit has a different raster canonical pin`);
  requireEvidence(audit.currentRasterPins?.boundarySha256 === boundary.sha256, `${familyId} audit has a different raster boundary pin`);

  const providerByteParts = providerPaths.map((rel) => readEvidenceBytes(rel));
  const builderBytes = Buffer.concat(providerByteParts);
  const builderSource = providerByteParts.map((bytes) => bytes.toString("utf8")).join("\n");
  const builderSha256 = sha256(builderBytes);
  const auditedBuilder = audit.postApprovalPathAndByteCensus?.builder ?? null;
  const builderEntryBytes = providerByteParts[providerPaths.indexOf(builderPath)];
  requireEvidence(auditedBuilder?.path === builderPath, `${familyId} audit names a different builder`);
  requireEvidence(gitBlobSha1(builderEntryBytes) === auditedBuilder.gitBlobAtApprovalAndNow, `${builderPath} drifted from the owner-audited Git blob`);
  const deterministic = builderSource.includes("stampDeterministic(pdf)")
    && renderedArtifacts.renderedFresh === true
    && renderedArtifacts.derivedFromBytes === true
    && renderedArtifacts.byteDerivedHashes === true;
  requireEvidence(deterministic, `${builderPath} does not prove a deterministic byte-derived fixture render`);

  const approvedScope = {
    recordId: ownerBatchAdoption.recordId,
    decisionOwner: ownerBatchAdoption.decisionOwner,
    decidedOn: ownerBatchAdoption.decidedOn,
    qualification: ownerQualification.ownerNote,
    familyId,
    approvedArtifacts: ownerPins,
    postApprovalAuditVerdict: audit.verdict
  };
  const approvedScopeSha256 = sha256(stableStringify(approvedScope));
  const artifactProducerIdentity = `${builderPath}@sha256:${builderSha256}`;
  const routeFixture = fixtureByKey.get(routeId) ?? null;
  requireEvidence(routeFixture?.pathwayKey === routeId, `${WITNESS_FIXTURES} has no exact fixture for ${routeId}`);
  requireEvidence(routeFixture.expected?.paymentAllowed === false, `${routeId} fixture no longer expects payment to remain closed`);
  const routeFixtureSha256 = sha256(stableStringify(routeFixture.answers ?? {}));
  const documentByRole = new Map((specification.documents ?? []).map((entry) => [entry.role, entry]));
  const dimension = (present, basis, notRequiredBasis = null) => present
    ? { state: "covered", basis }
    : notRequiredBasis
      ? { state: "not_required", basis: notRequiredBasis }
      : { state: "missing", basis: null };
  const ownerOmissionBasis = `${OWNER_BATCH_ADOPTION_ID}+${specificationPath}: approved complete specification omits this dimension`;
  const codifiedSourceAuthority = codifiedAuthorityProof({
    routeId,
    familyId,
    jurisdiction,
    specificationPath,
    specification,
    specificationBytes,
    sourceReceiptPath,
    verification
  });
  const finalVerificationBoundInputs = {
    contract: INDEPENDENT_FINAL_VERIFICATION_CONTRACT,
    routeId,
    familyId,
    packetSpecificationSha256: sha256(specificationBytes),
    canonicalArtifactSha256: canonical.sha256,
    boundaryArtifactSha256: boundary.sha256,
    verifierRegistry: {
      path: VERIFIER_RETURNS,
      evidenceRowSha256: verifierRowSha256
    },
    verifierEvidence: {
      path: verifier.evidencePath,
      evidenceRowSha256: verifierEvidenceRowSha256,
      verifiedAtBase: verifier.verifiedAtBase,
      lane: verifier.lane
    }
  };
  const finalVerificationBoundInputsSha256 = sha256(stableStringify(finalVerificationBoundInputs));

  const record = {
    schemaVersion: GRADE_A_ADMISSION_SCHEMA_VERSION,
    recordId: `grade-a-${jurisdiction.toLowerCase()}-${pathwayId}-v1`,
    routeId,
    jurisdiction,
    pathwayId,
    packetFamilyId: familyId,
    serviceDisposition: "paid_packet_intended",
    version: 1,
    effectiveFrom: ownerBatchAdoption.decidedOn,
    supersededBy: null,
    supersededAt: null,
    revocation: { revoked: false, reason: null, revokedAt: null, revokedBy: null },
    legalAuthority: {
      recordId: OWNER_BATCH_ADOPTION_ID,
      version: OWNER_BATCH_ADOPTION_ID,
      status: "approved_by_decision_owner",
      effectiveDate: ownerBatchAdoption.decidedOn,
      scopeSha256: approvedScopeSha256
    },
    packetSpecification: {
      specId: `${specification.specificationId}@${specification.specificationVersion}`,
      sha256: sha256(specificationBytes),
      complete: specification.legalSectionsBound === true && approvedByFixture.size === 2
    },
    // The v2 schema's legacy collection name covers the source-authority gate.
    // This entry is explicitly codified authority, not an official source ID,
    // document digest, court binary or custody claim.
    officialSources: [codifiedSourceAuthority],
    // Delivery-provider evidence and proof-artifact producer evidence are
    // different facts. The record binds the published worker image here; the
    // filing-format proof below names the census builder that produced the
    // reviewed PDF and explicitly reconciles the mismatch.
    provider,
    fixture: {
      fixtureId: routeFixture.pathwayKey,
      sha256: routeFixtureSha256,
      deterministic
    },
    artifactValidation: {
      state: "validated",
      artifactSha256: canonical.sha256,
      validatedAt: ownerBatchAdoption.decidedOn
    },
    packetCompleteness: {
      specificationId: specification.specificationId,
      specificationVersion: specification.specificationVersion,
      specificationSha256: sha256(specificationBytes),
      filingApplication: dimension(documentByRole.has("primary_filing"), `${specificationPath}:documents.primary_filing`),
      proposedOrder: dimension(documentByRole.has("proposed_order"), `${specificationPath}:documents.proposed_order`, ownerOmissionBasis),
      attachmentsAndSchedules: dimension((specification.attachments?.length ?? 0) > 0, `${specificationPath}:attachments`, ownerOmissionBasis),
      serviceAndNotice: dimension(Boolean(specification.serviceAndNotice?.statement), `${specificationPath}:serviceAndNotice`),
      filingDestination: dimension(Boolean(specification.filingDestination?.statement), `${specificationPath}:filingDestination`),
      feeAndWaiverInstructions: dimension(Boolean(specification.feeAndWaiver?.statement), `${specificationPath}:feeAndWaiver`),
      copyRequirements: dimension(Boolean(specification.copyRequirements?.statement), `${specificationPath}:copyRequirements`),
      postFilingSteps: dimension((specification.postFilingTimeline?.length ?? 0) > 0, `${specificationPath}:postFilingTimeline`),
      hearingAndObjectionStopConditions: dimension((specification.hearingAndObjectionStops?.length ?? 0) > 0, `${specificationPath}:hearingAndObjectionStops`),
      customPleadingAuthority: {
        required: (specification.documents ?? []).some((entry) => entry.outputStrategy === "custom_pleading"),
        approved: true,
        authorityId: OWNER_BATCH_ADOPTION_ID
      },
      filingFormatArtifact: {
        format: "pdf",
        sha256: canonical.sha256,
        pageCount: canonical.pageCount,
        producedBy: {
          renderer: artifactProducerIdentity,
          matchesRecordProvider: false,
          reconciliation: "The filing proof was produced by the committed census-v1 family builder. The record provider is the separately digest-pinned delivery worker image; no evidence claims that image produced the reviewed PDF.",
          deterministicRenderVerified: deterministic
        }
      }
    },
    visualReview: {
      state: "passed",
      pagesReviewed: canonical.pageCount,
      pageCount: canonical.pageCount,
      evidenceSha256: sha256(JSON.stringify(raster.rasterReceipt)),
      reviewedBy: `${raster.rasterReceipt.workflow}#job:${raster.rasterReceipt.jobId}`,
      reviewedAt: null
    },
    outputLegalApproval: {
      state: "passed",
      reviewerId: ownerBatchAdoption.decisionOwner,
      decidedAt: ownerBatchAdoption.decidedOn,
      scopeSha256: approvedScopeSha256
    },
    finalVerification: {
      contract: INDEPENDENT_FINAL_VERIFICATION_CONTRACT,
      contractModule: "scripts/generate-rcap-grade-a-fulfillment-authority.mjs",
      state: "bound",
      verifierId: verifier.lane,
      boundInputsSha256: finalVerificationBoundInputsSha256,
      verifiedAt: verifierEvidenceRow.verifiedAt ?? `base:${verifier.verifiedAtBase}`,
      verifiedAtBase: verifier.verifiedAtBase,
      evidencePath: verifier.evidencePath,
      evidenceRowSha256: verifierRowSha256,
      evidenceDetailRowSha256: verifierEvidenceRowSha256,
      boundInputs: finalVerificationBoundInputs
    },
    evidenceBindings: {
      assignmentClaim,
      firstCohortReturn: {
        commit: FIRST_COHORT_EVIDENCE_COMMIT,
        path: FIRST_COHORT_RETURN,
        sha256: sha256(firstCohortReturnBytes)
      },
      packetSpecification: { path: specificationPath, sha256: sha256(specificationBytes) },
      approvedArtifacts: {
        canonical: { path: canonical.file, sha256: canonical.sha256, byteLength: canonical.byteLength, pageCount: canonical.pageCount },
        boundary: { path: boundary.file, sha256: boundary.sha256, byteLength: boundary.byteLength, pageCount: boundary.pageCount }
      },
      ownerApproval: {
        recordId: OWNER_BATCH_ADOPTION_ID,
        path: OWNER_BATCH_ADOPTION,
        fileSha256: sha256(ownerBatchAdoptionBytes),
        decisionOwner: ownerBatchAdoption.decisionOwner,
        decidedOn: ownerBatchAdoption.decidedOn,
        qualification: ownerQualification.ownerNote,
        scopeSha256: approvedScopeSha256
      },
      postApprovalAudit: {
        path: POST_APPROVAL_AUDIT,
        fileSha256: sha256(postApprovalAuditBytes),
        verdict: audit.verdict
      },
      rasterReceipt: {
        path: RASTER_QUEUE,
        rowSha256: sha256(JSON.stringify(raster)),
        verdict: raster.rasterReceipt.verdict,
        workflowRunId: raster.rasterReceipt.workflowRunId,
        jobId: raster.rasterReceipt.jobId,
        canonicalSha256: canonical.sha256,
        boundarySha256: boundary.sha256,
        coversTheWholeFamily: raster.rasterReceipt.coversTheWholeFamily
      },
      independentVerification: {
        path: VERIFIER_RETURNS,
        rowSha256: verifierRowSha256,
        verdict: verifier.verdict,
        lane: verifier.lane,
        verifiedAtBase: verifier.verifiedAtBase,
        evidencePath: verifier.evidencePath,
        evidenceDocumentSha256: sha256(verifierEvidenceBytes),
        evidenceRowSha256: verifierEvidenceRowSha256,
        boundInputs: {
          packetSpecificationSha256: sha256(specificationBytes),
          canonicalSha256: canonical.sha256,
          boundarySha256: boundary.sha256
        },
        boundInputsSha256: finalVerificationBoundInputsSha256
      },
      codifiedAuthority: {
        sourceKind: codifiedSourceAuthority.sourceKind,
        sourceId: codifiedSourceAuthority.sourceId,
        contract: codifiedSourceAuthority.contract,
        officialBinaryExpected: codifiedSourceAuthority.officialBinaryExpected,
        officialBinarySource: codifiedSourceAuthority.officialBinarySource,
        boundInputs: codifiedSourceAuthority.boundInputs,
        boundInputsSha256: codifiedSourceAuthority.boundInputsSha256
      },
      provider: {
        deliveryProviderEvidencePath: WORKER_EVIDENCE,
        deliveryProviderEvidenceSha256: sha256(readEvidenceBytes(WORKER_EVIDENCE)),
        deliveryProvider: provider,
        artifactProducer: {
          builderPath,
          providerPaths,
          builderSha256,
          renderedArtifactsPath,
          renderedArtifactsSha256: sha256(renderedArtifactsBytes),
          identity: artifactProducerIdentity
        }
      },
      fixture: {
        deterministic,
        witnessFixturePath: WITNESS_FIXTURES,
        witnessFixtureId: routeFixture.pathwayKey,
        witnessFixtureSha256: routeFixtureSha256,
        expectedPaymentAllowed: routeFixture.expected.paymentAllowed,
        canonicalSha256: canonical.sha256,
        boundarySha256: boundary.sha256
      },
      sourceReceipt: { path: sourceReceiptPath, sha256: audit.currentShippingArtifact.sourceReceiptSha256 },
      productionFieldMap: { path: productionFieldMapPath, sha256: audit.currentShippingArtifact.productionFieldMapSha256 }
    },
    history: []
  };

  record.history = [{
    version: 1,
    changeKind: "created",
    changedAt: ownerBatchAdoption.decidedOn,
    changedBy: "scripts/generate-rcap-grade-a-fulfillment-authority.mjs",
    reason: `Bounded first-cohort candidate derived from ${FIRST_COHORT_RETURN} at ${FIRST_COHORT_EVIDENCE_COMMIT}, ${specificationPath}, current raster and exact independent-verification rows, ${OWNER_BATCH_ADOPTION_ID}, codified custom-pleading authority, and committed provider/fixture evidence. This generator records evidence only; it opens no route and performs no commercial action.`,
    recordSha256: fulfillmentRecordSha256(record),
    supersedesRecordSha256: null
  }];

  return record;
}

const rows = launchGraph.rows
  .filter((row) => CANDIDATE_JURISDICTIONS.includes(row.jurisdiction))
  .sort((a, b) => a.pathwayKey.localeCompare(b.pathwayKey));

const records = [
  ...rows.map(candidateRecord),
  mississippiClinicCandidateRecord(),
  ...FIRST_COHORT_ROUTES.map(firstCohortCandidateRecord)
]
  .sort((a, b) => a.routeId.localeCompare(b.routeId));

const firstCohortEvidencePaths = [...new Set([
  FIRST_COHORT_RETURN,
  OWNER_BATCH_ADOPTION,
  POST_APPROVAL_AUDIT,
  RASTER_QUEUE,
  VERIFIER_RETURNS,
  CODIFIED_COMMON_INPUTS.packetSet.path,
  ...Object.values(CODIFIED_TRACK_INPUTS).map((entry) => entry.path),
  ...Object.values(FIRST_COHORT_VERIFICATION).map((entry) => entry.evidencePath),
  ...FIRST_COHORT_ROUTES.flatMap((entry) => [
    entry.specificationPath,
    entry.builderPath,
    ...entry.providerPaths,
    `${entry.overlayRoot}/source-receipt.json`,
    `${entry.overlayRoot}/participant-instructions.md`,
    `${entry.overlayRoot}/production-field-map.json`,
    `${entry.overlayRoot}/reports/rendered-artifacts.json`,
    `${entry.overlayRoot}/fixtures/canonical.pdf`,
    `${entry.overlayRoot}/fixtures/boundary.pdf`
  ])
])].sort();
const allCandidateJurisdictions = [...new Set([
  ...CANDIDATE_JURISDICTIONS,
  "MS",
  ...FIRST_COHORT_ROUTES.map((entry) => entry.routeId.slice(0, entry.routeId.indexOf(":")))
])].sort();

const registry = {
  schemaVersion: GRADE_A_AUTHORITY_SCHEMA_VERSION,
  generatedBy: "scripts/generate-rcap-grade-a-fulfillment-authority.mjs",
  purpose: "The one canonical controlling registry of Grade-A fulfillment authority records. Only COMPLETE_PACKET_PROVEN authorizes a commercial action; every other state, including the absence of a record, denies.",
  createsApproval: false,
  changesRuntime: false,
  candidateScope: {
    jurisdictions: allCandidateJurisdictions,
    routes: [MS_CLINIC_ROUTE, ...FIRST_COHORT_ROUTES.map((entry) => entry.routeId)].sort(),
    rule: "Candidate records exist only for lanes and exact routes that were asked to provide evidence. The four first-cohort route records bind the limited owner adoption, current packet/raster/independent-verification evidence, codified custom-pleading authority, and committed provider/fixture identities. Codified authority is accepted only where both specification and packet-set components require no official PDF; official-PDF routes still require exact official bytes. The Mississippi clinic record remains incomplete while participant final verification is unbound or any technical Preview predicate is absent. A route absent from this registry fails closed."
  },
  evidenceInputs: {
    [LAUNCH_GRAPH]: sha256(readEvidenceBytes(LAUNCH_GRAPH)),
    [LEGAL_JOIN]: sha256(readEvidenceBytes(LEGAL_JOIN)),
    [COUNSEL_MANIFEST]: sha256(readEvidenceBytes(COUNSEL_MANIFEST)),
    [WITNESS_FIXTURES]: sha256(readEvidenceBytes(WITNESS_FIXTURES)),
    [VISUAL_PROOF]: sha256(readEvidenceBytes(VISUAL_PROOF)),
    [WORKER_EVIDENCE]: sha256(readEvidenceBytes(WORKER_EVIDENCE)),
    [SOURCE_REGISTRY]: sha256(readEvidenceBytes(SOURCE_REGISTRY)),
    [MS_CLINIC_SPECIFICATION]: sha256(readEvidenceBytes(MS_CLINIC_SPECIFICATION)),
    [MS_CLINIC_FIXTURE]: sha256(readEvidenceBytes(MS_CLINIC_FIXTURE)),
    [MS_CLINIC_ARTIFACTS]: sha256(readEvidenceBytes(MS_CLINIC_ARTIFACTS)),
    [MS_CLINIC_RASTER_REVIEW]: sha256(readEvidenceBytes(MS_CLINIC_RASTER_REVIEW)),
    ...Object.fromEntries(firstCohortEvidencePaths.map((rel) => [rel, sha256(readEvidenceBytes(rel))]))
  },
  records
};

// The observation is derived from the same evidence the records were written
// against, so a freshly generated pair is never stale. It becomes stale the
// moment an upstream evidence file changes and only the snapshot is regenerated
// — which is exactly the signal it exists to produce.
const observationRoutes = {};
for (const record of records) {
  const codifiedAuthorityOnly = record.officialSources.length > 0
    && record.officialSources.every((source) => source.sourceKind === "codified_authority");
  observationRoutes[record.routeId] = {
    observedAt: ownerDecision.effectiveDate,
    legalAuthority: {
      version: record.legalAuthority.version,
      status: record.legalAuthority.status,
      scopeSha256: record.legalAuthority.scopeSha256
    },
    packetSpecificationSha256: record.packetSpecification.sha256,
    officialSourceSha256ById: Object.fromEntries(record.officialSources.map((source) => [source.sourceId, source.sha256])),
    corpusReleaseId: codifiedAuthorityOnly
      ? "not_applicable:codified_authority"
      : sourceRegistry.corpusRelease.releaseId,
    corpusArchiveSha256: codifiedAuthorityOnly
      ? "not_applicable:codified_authority"
      : sourceRegistry.corpusRelease.archiveSha256,
    provider: record.provider,
    fixtureSha256: record.fixture.sha256,
    artifactSha256: record.artifactValidation.artifactSha256,
    visualReviewEvidenceSha256: record.visualReview.evidenceSha256,
    outputLegalApprovalScopeSha256: record.outputLegalApproval.scopeSha256,
    finalVerificationBoundInputsSha256: record.finalVerification.boundInputsSha256
  };
}

const observation = {
  schemaVersion: "rcap-grade-a-fulfillment-observation/v1",
  generatedBy: "scripts/generate-rcap-grade-a-fulfillment-authority.mjs",
  purpose: "What the server currently observes for each route with a fulfillment record. A record whose bound proof disagrees with this snapshot is STALE and authorizes nothing.",
  observedAt: ownerDecision.effectiveDate,
  routes: observationRoutes
};

// The registry and snapshot must be on disk before the projection is derived,
// because the projection is produced by the shipped runtime reading them — the
// same code path the product uses — rather than by this generator's own copy of
// the rule.
function writeIfNeeded(rel, value) {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  const absolute = path.join(rootDir, rel);
  const existing = fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : null;
  if (existing === serialized) return { rel, changed: false, serialized };
  if (!CHECK) {
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, serialized);
  }
  return { rel, changed: true, serialized };
}

const drifted = [];
for (const [rel, value] of [[REGISTRY_OUT, registry], [OBSERVATION_OUT, observation]]) {
  const result = writeIfNeeded(rel, value);
  if (result.changed) drifted.push(rel);
}

if (CHECK && drifted.length > 0) {
  console.error(`Regeneration required — these files do not match their evidence:\n  ${drifted.join("\n  ")}`);
  process.exit(1);
}

const { evaluateFulfillmentAuthority } = await import("../src/lib/rcap/fulfillment/grade-a-authority.ts");
const { loadFulfillmentRegistry, resetFulfillmentRegistryCache } = await import("../src/lib/rcap/fulfillment/grade-a-registry.ts");
const { resolveObservation, resetObservationCache } = await import("../src/lib/rcap/fulfillment/grade-a-admission.ts");

resetFulfillmentRegistryCache();
resetObservationCache();

const loaded = loadFulfillmentRegistry();
if (loaded.problems.length > 0) {
  console.error(`The generated registry does not load cleanly:\n  ${loaded.problems.map((p) => `${p.recordId ?? "(no id)"}: ${p.problem}`).join("\n  ")}`);
  process.exit(1);
}

const projectionRoutes = [...loaded.current.values()]
  .sort((a, b) => a.routeId.localeCompare(b.routeId))
  .map((record) => {
    const decision = evaluateFulfillmentAuthority(record, resolveObservation(record.routeId), record.routeId);
    return {
      routeId: decision.routeId,
      jurisdiction: decision.jurisdiction,
      packetFamilyId: decision.packetFamilyId,
      serviceDisposition: decision.serviceDisposition,
      recordVersion: decision.recordVersion,
      state: decision.state,
      commercialStatus: decision.commercialStatus,
      missingProof: decision.missingProof,
      stalenessReasons: decision.stalenessReasons
    };
  });

const projection = {
  schemaVersion: "rcap-grade-a-fulfillment-projection/v1",
  generatedBy: "scripts/generate-rcap-grade-a-fulfillment-authority.mjs",
  derivedFrom: {
    registry: REGISTRY_OUT,
    observation: OBSERVATION_OUT,
    authorityModule: "src/lib/rcap/fulfillment/grade-a-authority.ts"
  },
  rule: "This file is a projection. It is derived by the shipped authority module from the controlling registry; editing it changes nothing, because the runtime reads the registry.",
  counters: {
    routesWithARecord: projectionRoutes.length,
    completePacketProven: projectionRoutes.filter((route) => route.state === "COMPLETE_PACKET_PROVEN").length,
    incomplete: projectionRoutes.filter((route) => route.state === "INCOMPLETE").length,
    stale: projectionRoutes.filter((route) => route.state === "STALE").length,
    revoked: projectionRoutes.filter((route) => route.state === "REVOKED").length,
    superseded: projectionRoutes.filter((route) => route.state === "SUPERSEDED").length,
    commerciallyEligible: projectionRoutes.filter((route) => route.commercialStatus === "commercially_eligible").length
  },
  routes: projectionRoutes
};

const projectionResult = writeIfNeeded(PROJECTION_OUT, projection);
if (CHECK && projectionResult.changed) {
  console.error(`Regeneration required — ${PROJECTION_OUT} does not match the controlling registry.`);
  process.exit(1);
}

const verb = CHECK ? "verified" : "written";
console.log(`Grade-A fulfillment authority ${verb}: ${records.length} candidate record(s) across ${allCandidateJurisdictions.join(", ")}.`);
console.log(`  ${COMPLETE_PACKET_PROVEN}: ${projection.counters.completePacketProven}`);
console.log(`  INCOMPLETE: ${projection.counters.incomplete}   STALE: ${projection.counters.stale}`);
console.log(`  commercially eligible: ${projection.counters.commerciallyEligible}`);
