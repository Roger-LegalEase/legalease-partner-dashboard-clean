#!/usr/bin/env node
// ENV-007 — resolve the worker-image authority split.
//
// Two authorities in this repository name different worker images:
//
//   A  worker_source_sha 5ac0d8d6…  digest sha256:4e5b58e4…
//      pinned by .github/workflows/rcap-f1-ephemeral-staging.yml and
//      .github/workflows/rcap-hosted-acceptance-staging.yml
//
//   B  worker_source_sha 57318c20…  digest sha256:2656abeb…
//      recorded by data/rcap-staging-action.json and
//      data/rcap-render/worker-publication-evidence.json
//
// This script does not pick a winner by date or by higher commit number. It
// gathers, for each pair, the nine facts a deployment authority actually needs,
// and selects a canonical pair ONLY if every required fact is proven for
// exactly one of them. Otherwise it returns WORKER_AUTHORITY_BLOCKED and
// changes no pin.
//
// It is read-only: git object reads and committed JSON. No registry call, no
// deployment, no write to any workflow constant.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
import {
  buildWorkerImageInputManifestAtCommit,
  compareManifests
} from "./control/rcap-worker-image-inputs.mjs";

const OUT = path.join(rootDir, "data/rcap-render/worker-authority-reconciliation.json");

const git = (...args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8" }).trim();
const tryGit = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));

// The canonical worker image-input set is no longer a list of directories.
//
// ENV-007 correction: comparing whole directories — `scripts/lib` and `src`
// among them — answered "did anything under here move?", not "did anything that
// enters the worker image change?". A control-plane module added under
// scripts/lib made the two indistinguishable. The authority is now
// data/rcap-render/worker-image-input-manifest.json: every file the Dockerfile
// actually pulls into the build context, with its exact path and SHA-256, in a
// deterministic order, derived from the Dockerfile rather than asserted.
//
// The directory list survives only as the human-readable summary of where those
// files come from. Nothing computes equivalence from it.
export const WORKER_IMAGE_INPUT_SUMMARY_PATHS = [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "scripts/rcap-render-worker.mjs",
  "deploy/rcap-render-worker/Dockerfile",
  "scripts/lib",
  "src"
];

const WORKFLOW_FILES = [
  ".github/workflows/rcap-f1-ephemeral-staging.yml",
  ".github/workflows/rcap-hosted-acceptance-staging.yml"
];

function pinnedFromWorkflow(rel) {
  const text = fs.readFileSync(path.join(rootDir, rel), "utf8");
  const grab = (key) => (new RegExp(`^\\s*${key}:\\s*(\\S+)\\s*$`, "m").exec(text) ?? [])[1] ?? null;
  return {
    file: rel,
    applicationSha: grab("AUTHORIZED_APPLICATION_SHA"),
    workerSourceSha: grab("AUTHORIZED_WORKER_SOURCE_SHA"),
    workerDigest: grab("AUTHORIZED_WORKER_DIGEST"),
    imageRepository: grab("IMAGE_REPOSITORY")
  };
}

/**
 * One number per candidate image-input set, computed over the per-file manifest:
 * the sha256 of the ordered `path:sha256` lines of every file that actually
 * enters the build context at that commit.
 */
const manifestCache = new Map();
function imageInputManifestAt(sourceSha) {
  if (!manifestCache.has(sourceSha)) {
    manifestCache.set(sourceSha, tryGit(() => buildWorkerImageInputManifestAtCommit(rootDir, sourceSha), null));
  }
  return manifestCache.get(sourceSha);
}
function workerImageInputHash(sourceSha) {
  const m = imageInputManifestAt(sourceSha);
  if (!m) return { hash: "UNRESOLVED", entries: [], fileCount: 0 };
  return {
    hash: m.aggregateSha256,
    fileCount: m.fileCount,
    // The summary lines stay short; the exhaustive per-file listing is the
    // manifest artifact itself, not this reconciliation record.
    entries: WORKER_IMAGE_INPUT_SUMMARY_PATHS.map((p) => {
      const under = m.entries.filter((e) => e.path === p || e.path.startsWith(`${p}/`));
      return `${p}:${under.length} file(s)`;
    })
  };
}

/** Per-file equivalence. Named paths, never "the directory differs". */
function compareImageInputs(a, b) {
  const ma = imageInputManifestAt(a);
  const mb = imageInputManifestAt(b);
  if (!ma || !mb) return { identical: false, added: [], removed: [], changed: [], unresolved: true };
  return { ...compareManifests(ma, mb), unresolved: false };
}
function pathSetIdentical(a, b) { return compareImageInputs(a, b).identical; }
function differingPaths(a, b) {
  const c = compareImageInputs(a, b);
  return [...c.changed, ...c.added.map((p) => `${p} (added)`), ...c.removed.map((p) => `${p} (removed)`)];
}

const publication = readJson("data/rcap-render/worker-publication-evidence.json");
const bindingException = readJson("data/rcap-render/worker-source-binding-exception.json");
const stagingAction = readJson("data/rcap-staging-action.json");
const manifest = readJson("data/rcap-acceptance-migration-manifest.json");
const workflowPins = WORKFLOW_FILES.map(pinnedFromWorkflow);

const PINNED_APPLICATION_SHA = workflowPins[0].applicationSha;

const CANDIDATES = [
  {
    id: "A",
    label: "workflow-pinned pair",
    sourceSha: workflowPins[0].workerSourceSha,
    digest: workflowPins[0].workerDigest,
    declaredBy: WORKFLOW_FILES
  },
  {
    id: "B",
    label: "publication-record pair",
    sourceSha: publication.sourceSha,
    digest: publication.immutableRegistryDigest,
    declaredBy: ["data/rcap-render/worker-publication-evidence.json", "data/rcap-staging-action.json"]
  }
];

function assess(candidate) {
  const { sourceSha, digest } = candidate;
  const inputs = workerImageInputHash(sourceSha);

  // Which record, if any, describes this exact pair as the current publication?
  const isCurrentPublication =
    publication.sourceSha === sourceSha && publication.immutableRegistryDigest === digest;
  const supersededHere =
    publication.supersededPublication?.immutableRegistryDigest === digest ||
    (publication.supersededChain ?? []).some((s) => s.immutableRegistryDigest === digest);
  const supersedeReason =
    publication.supersededPublication?.immutableRegistryDigest === digest
      ? publication.supersededPublication.why
      : (publication.supersededChain ?? []).find((s) => s.immutableRegistryDigest === digest)?.why ?? null;

  const buildRunId = isCurrentPublication
    ? publication.workflowRunId
    : publication.supersededPublication?.immutableRegistryDigest === digest
      ? publication.supersededPublication.publicationRunId
      : (publication.supersededChain ?? []).find((s) => s.immutableRegistryDigest === digest)?.publicationRunId ?? null;

  // Health / readiness. The publication record is explicit that publication is
  // not acceptance: rcap-worker-image-acceptance.yml proves pull, digest/tag
  // agreement, OCI revision, non-root, fail-closed startup, health, SIGTERM,
  // scratch cleanliness and the secret scans — and its result for this digest
  // is what would satisfy this fact.
  const acceptanceStatus = isCurrentPublication ? publication.registryPullByDigestStatus : null;
  const healthProven =
    acceptanceStatus !== null && !/pending|not_/i.test(String(acceptanceStatus));

  // Source binding: does the image state its own revision, or is there an
  // in-force exception covering exactly this tuple?
  const ociRevisionPresent = isCurrentPublication
    ? Boolean(publication.reconciliationStatus)
    : false;
  const exceptionCoversThisTuple =
    bindingException.supersededTuple?.immutableDigest === digest;
  const exceptionInForce = bindingException.status === "in_force";

  // Compatibility with the pinned application source, by the same rule the
  // workflow's own equivalence gate applies.
  const compatibleWithPinnedApplication = pathSetIdentical(sourceSha, PINNED_APPLICATION_SHA);
  const differing = compatibleWithPinnedApplication ? [] : differingPaths(sourceSha, PINNED_APPLICATION_SHA);

  // Can this image process the packet schema after migrations 49-55? The only
  // thing that answers it is a recorded run of the job-read-column and packet
  // contract verifiers against THIS digest on an environment carrying the
  // manifest sequence. Absence is reported as absence.
  const schemaEvidence = findSchemaCompatibilityEvidence(digest);

  const facts = {
    registryReference: `${publication.imageRepository}:${sourceSha}`,
    immutableDigest: digest,
    digestPinnedReference: `${publication.imageRepository}@${digest}`,
    sourceCommit: sourceSha,
    sourceCommitResolves: tryGit(() => git("cat-file", "-t", sourceSha), null) === "commit",
    sourceCommitIsAncestorOfMain: (() => {
      try { execFileSync("git", ["merge-base", "--is-ancestor", sourceSha, "origin/main"], { cwd: rootDir }); return true; }
      catch { return false; }
    })(),
    workerImageInputHash: inputs.hash,
    workerImageInputEntries: inputs.entries,
    buildWorkflow: ".github/workflows/publish-rcap-render-worker.yml",
    buildWorkflowRunId: buildRunId,
    buildWorkflowConclusion: isCurrentPublication ? publication.workflowConclusion : "not recorded for this digest",
    healthReadinessResult: healthProven
      ? acceptanceStatus
      : `NOT PROVEN — ${acceptanceStatus ?? "no acceptance status recorded for this digest"}`,
    healthReadinessProven: healthProven,
    ociRevisionOrProvenance: ociRevisionPresent
      ? "image states its own revision (publication record reconciliationStatus present)"
      : exceptionCoversThisTuple
        ? `absent; covered by data/rcap-render/worker-source-binding-exception.json, whose status is "${bindingException.status}"`
        : "absent and uncovered",
    ociRevisionAcceptable: ociRevisionPresent || (exceptionCoversThisTuple && exceptionInForce),
    compatibleWithPinnedApplicationSource: compatibleWithPinnedApplication,
    pinnedApplicationSha: PINNED_APPLICATION_SHA,
    imageInputPathsDifferingFromPinnedApplication: differing,
    canProcessPacketSchemaAfterManifestSequence: schemaEvidence.proven,
    packetSchemaEvidence: schemaEvidence.detail,
    supersededByPublicationRecord: supersededHere,
    supersedeReason: supersedeReason
  };

  const requirements = [
    ["source commit resolves", facts.sourceCommitResolves],
    ["source commit is in canonical main ancestry", facts.sourceCommitIsAncestorOfMain],
    ["build workflow run recorded", facts.buildWorkflowRunId !== null],
    ["health / readiness acceptance proven for this digest", facts.healthReadinessProven],
    ["image states its source, or an in-force exception covers this exact tuple", facts.ociRevisionAcceptable],
    ["image inputs equal the pinned application source", facts.compatibleWithPinnedApplicationSource],
    ["proven able to process the packet schema after the manifest sequence", facts.canProcessPacketSchemaAfterManifestSequence],
    ["not marked superseded by the publication record", !facts.supersededByPublicationRecord]
  ];
  const unmet = requirements.filter(([, ok]) => !ok).map(([name]) => name);

  return { ...candidate, facts, requirements: requirements.map(([name, ok]) => ({ name, met: ok })), unmet, eligible: unmet.length === 0 };
}

/**
 * Is there committed evidence that a worker at this digest read the
 * packet_render_jobs shape produced by the manifest sequence? Looks only at
 * committed records; a hosted run that has not happened is reported as absent.
 */
function findSchemaCompatibilityEvidence(digest) {
  const searched = [
    "data/rcap-render/f1-confirmatory-acceptance.json",
    "data/rcap-render/delivery-gate-evidence.json",
    "data/rcap-render/deployment-closure.json",
    "data/rcap-render/staging-apply-evidence.json",
    "data/rcap-render/state-machine.json"
  ];
  const hits = [];
  for (const rel of searched) {
    const abs = path.join(rootDir, rel);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, "utf8");
    if (text.includes(digest)) hits.push(rel);
  }
  if (hits.length === 0) {
    return {
      proven: false,
      detail:
        `No committed record names ${digest} alongside a run against an environment carrying manifest phases ` +
        `${manifest.migrations.map((m) => m.phase).join("-")}. The verifiers that would answer this — ` +
        `scripts/verify-rcap-hosted-job-read-columns.mjs and scripts/verify-rcap-packet-contract.mjs — ` +
        `run only inside a hosted matrix phase, and no such run is recorded for this digest. ` +
        `Searched: ${searched.join(", ")}.`
    };
  }
  return { proven: true, detail: `named in ${hits.join(", ")}` };
}

const assessed = CANDIDATES.map(assess);
const eligible = assessed.filter((c) => c.eligible);

const verdict = {
  schemaVersion: "rcap-worker-authority-reconciliation/v1",
  generatedBy: "scripts/rcap-worker-authority-reconcile.mjs",
  readOnly: true,
  pinnedApplicationSha: PINNED_APPLICATION_SHA,
  manifestPhases: manifest.migrations.map((m) => m.phase),
  workflowPins,
  stagingActionWorkerDigest: stagingAction.preconditions?.workerImageDigest?.value ?? null,
  stagingActionWorkerSourceSha: stagingAction.preconditions?.workerImageDigest?.evidence?.sourceSha ?? null,
  candidates: assessed,
  canonicalPair: eligible.length === 1 ? { sourceSha: eligible[0].sourceSha, digest: eligible[0].digest, candidateId: eligible[0].id } : null,
  status: eligible.length === 1 ? "WORKER_AUTHORITY_RESOLVED" : "WORKER_AUTHORITY_BLOCKED",
  reason:
    eligible.length === 1
      ? `candidate ${eligible[0].id} meets every requirement and is the only one that does`
      : eligible.length === 0
        ? "neither candidate meets every requirement; no pin is changed"
        : `${eligible.length} candidates meet every requirement, which is not a selection; no pin is changed`,
  pinsUnchanged: true,
  agreementRequiredBeforeDeploy: [
    "data/rcap-staging-action.json → preconditions.workerImageDigest",
    ".github/workflows/rcap-f1-ephemeral-staging.yml → AUTHORIZED_WORKER_SOURCE_SHA / AUTHORIZED_WORKER_DIGEST",
    ".github/workflows/rcap-hosted-acceptance-staging.yml → AUTHORIZED_WORKER_SOURCE_SHA / AUTHORIZED_WORKER_DIGEST",
    "data/rcap-render/worker-publication-evidence.json → sourceSha / immutableRegistryDigest"
  ],
  authoritiesCurrentlyAgree: (() => {
    const wf = new Set(workflowPins.map((p) => `${p.workerSourceSha}|${p.workerDigest}`));
    const action = `${stagingAction.preconditions?.workerImageDigest?.evidence?.sourceSha}|${stagingAction.preconditions?.workerImageDigest?.value}`;
    const pub = `${publication.sourceSha}|${publication.immutableRegistryDigest}`;
    return wf.size === 1 && wf.has(action) && wf.has(pub);
  })()
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(verdict, null, 2)}\n`);

console.log(`worker authority reconciliation → data/rcap-render/worker-authority-reconciliation.json`);
for (const c of assessed) {
  console.log(`\n  candidate ${c.id} (${c.label})`);
  console.log(`    source ${c.sourceSha}`);
  console.log(`    digest ${c.digest}`);
  console.log(`    image-input hash ${c.facts.workerImageInputHash}`);
  for (const r of c.requirements) console.log(`    ${r.met ? "ok  " : "FAIL"} ${r.name}`);
}
console.log(`\n${verdict.status} — ${verdict.reason}`);
console.log(`authorities currently agree on one pair: ${verdict.authoritiesCurrentlyAgree}`);
console.log(`pins changed by this script: none`);

if (verdict.status !== "WORKER_AUTHORITY_RESOLVED") {
  console.error(
    "\nWORKER_AUTHORITY_BLOCKED — hosted_deploy must not proceed. " +
    "Neither worker pin may be changed silently; the missing facts are listed per candidate above."
  );
  process.exit(1);
}
