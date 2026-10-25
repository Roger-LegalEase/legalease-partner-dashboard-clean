#!/usr/bin/env node
// Generate and verify the canonical worker image-input manifest.
//
// ENV-007 correction. Read-only: it reads git objects and writes one evidence
// file. No registry, no network, no image build, no pin change.
//
//   node scripts/rcap-worker-image-input-manifest.mjs           # write + verify
//   node scripts/rcap-worker-image-input-manifest.mjs --check   # verify only
//
// The manifest is the authority for worker equivalence. It replaces the
// whole-directory `git diff -- scripts/lib src ...` comparison, which could not
// distinguish a worker behaviour change from an infrastructure-only module
// landing in the same directory.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  MANIFEST_RELATIVE_PATH,
  buildWorkerImageInputManifestAtCommit,
  compareManifests,
  verifyNoUnlistedInput
} from "./control/rcap-worker-image-inputs.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const workflow = fs.readFileSync(
  path.join(rootDir, ".github/workflows/rcap-hosted-acceptance-staging.yml"), "utf8"
);
const grab = (key) => (new RegExp(`^\\s*${key}:\\s*(\\S+)\\s*$`, "m").exec(workflow) ?? [])[1] ?? null;

const WORKER_SOURCE_SHA = grab("AUTHORIZED_WORKER_SOURCE_SHA");
const APPLICATION_SHA = grab("AUTHORIZED_APPLICATION_SHA");
if (!WORKER_SOURCE_SHA || !APPLICATION_SHA) {
  console.error("::error::could not read the authorized SHAs from the hosted workflow");
  process.exit(1);
}

const workerManifest = buildWorkerImageInputManifestAtCommit(rootDir, WORKER_SOURCE_SHA);
const applicationManifest = buildWorkerImageInputManifestAtCommit(rootDir, APPLICATION_SHA);
const comparison = compareManifests(workerManifest, applicationManifest);

// Build-context inclusion proof: every listed path is reachable from a COPY
// instruction, and nothing that a COPY reaches is left unlisted.
const headManifest = buildWorkerImageInputManifestAtCommit(rootDir, "HEAD");
const headCoverage = verifyNoUnlistedInput(headManifest, rootDir);

// Control modules that live under a whole-directory COPY are inputs whether or
// not the worker imports them. Named explicitly rather than quietly folded in.
const CONTROL_MODULE_PREFIXES = ["scripts/control/"];
const CONTROL_MODULES_IN_LIB = [
  "scripts/lib/rcap-migration-manifest.mjs",
  "scripts/lib/rcap-acceptance-schema-snapshot.mjs"
];
// Judged at HEAD: the question is whether the control plane BEING REVIEWED
// leaks into the image context, not whether it did at the frozen worker commit.
const listed = new Set(headManifest.entries.map((e) => e.path));
const infrastructureInsideContext = CONTROL_MODULES_IN_LIB.filter((p) => listed.has(p));
const infrastructureOutsideContext = CONTROL_MODULE_PREFIXES.flatMap((prefix) =>
  execFileSync("git", ["ls-files", "--", prefix], { cwd: rootDir, encoding: "utf8" })
    .split("\n").filter(Boolean).filter((p) => !listed.has(p))
);

const artifact = {
  schemaVersion: "rcap-worker-image-input-manifest-evidence/v1",
  description:
    "Every file that actually enters the worker image build context, per file, " +
    "with its exact SHA-256, in deterministic order. Worker equivalence is " +
    "computed from this manifest and from nothing else.",
  dockerfile: workerManifest.dockerfile,
  contextSpecs: workerManifest.contextSpecs,
  ordering: workerManifest.ordering,
  authorizedWorkerSourceSha: WORKER_SOURCE_SHA,
  authorizedApplicationSha: APPLICATION_SHA,
  worker: {
    sourceCommit: WORKER_SOURCE_SHA,
    fileCount: workerManifest.fileCount,
    aggregateSha256: workerManifest.aggregateSha256
  },
  application: {
    sourceCommit: APPLICATION_SHA,
    fileCount: applicationManifest.fileCount,
    aggregateSha256: applicationManifest.aggregateSha256
  },
  comparison: {
    identical: comparison.identical,
    changed: comparison.changed,
    added: comparison.added,
    removed: comparison.removed
  },
  buildContextInclusionProof: {
    everyListedPathIsReachableFromACopyInstruction: headCoverage.ok,
    errors: headCoverage.errors,
    // Recorded, not hidden: `COPY scripts/lib/ scripts/lib/` is a whole-directory
    // copy, so infrastructure-only modules placed there do enter the image.
    wholeDirectoryCopies: workerManifest.contextSpecs.filter((s) => s.directory).map((s) => s.spec),
    infrastructureModulesInsideBuildContext: infrastructureInsideContext,
    infrastructureModulesOutsideBuildContext: infrastructureOutsideContext,
    note:
      "scripts/control/ carries infrastructure-only control-plane modules and is " +
      "read by no COPY instruction, so those modules are not worker image inputs. " +
      "The two ENV-007 modules under scripts/lib/ ARE inputs, because line 29 of " +
      "the Dockerfile copies that directory whole. Narrowing that COPY would " +
      "change the image and is not done while WORKER_AUTHORITY_BLOCKED stands."
  },
  workerAuthority: "WORKER_AUTHORITY_BLOCKED",
  workerSelectedOrPublished: false,
  entries: workerManifest.entries
};

const out = path.join(rootDir, MANIFEST_RELATIVE_PATH);
if (!checkOnly) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(artifact, null, 2)}\n`);
}

let failed = false;
const line = (ok, label) => { if (!ok) failed = true; console.log(`  ${ok ? "ok  " : "FAIL"} ${label}`); };

console.log("worker image-input manifest");
console.log(`  dockerfile           ${artifact.dockerfile}`);
console.log(`  worker  ${WORKER_SOURCE_SHA} ${workerManifest.fileCount} files ${workerManifest.aggregateSha256}`);
console.log(`  app     ${APPLICATION_SHA} ${applicationManifest.fileCount} files ${applicationManifest.aggregateSha256}`);
line(headCoverage.ok, "every context file is listed and every listed file is a context file");
line(workerManifest.fileCount > 0, "the manifest is not empty");
line(
  infrastructureOutsideContext.length > 0,
  `infrastructure-only modules kept outside the build context (${infrastructureOutsideContext.length})`
);
console.log(
  `  note infrastructure modules inside the context via COPY scripts/lib/: ${
    infrastructureInsideContext.join(", ") || "none"}`
);
console.log(`  worker equivalence to the pinned application source: ${comparison.identical ? "identical" : `${comparison.changed.length} changed, ${comparison.added.length} added, ${comparison.removed.length} removed`}`);
console.log("  WORKER_AUTHORITY_BLOCKED — no worker selected, no image published");
if (failed) { console.error("::error::worker image-input manifest is not internally consistent"); process.exit(1); }
