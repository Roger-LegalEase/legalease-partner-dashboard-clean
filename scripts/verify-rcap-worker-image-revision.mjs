#!/usr/bin/env node
// Which source commit the accepted image was built from.
//
//   REF=<repo>@sha256:… WORKER_TAG=<40-hex> EXPECTED_DIGEST=sha256:… \
//     node scripts/verify-rcap-worker-image-revision.mjs
//
// The publication evidence CLAIMS a source SHA. That claim is a line in a JSON
// file this repository wrote about itself. This asks the image instead, so the
// accepted digest and the frozen source are bound by something outside our own
// assertion.
//
// TWO WAYS TO PASS, and only two.
//
//   NORMAL PATH  the image names its source: org.opencontainers.image.revision,
//                or a source-naming provenance attestation, equal to the
//                accepted worker source SHA.
//
//   EXCEPTION    the image names NOTHING, and a committed exception record
//   PATH         covering this exact digest establishes the binding externally.
//                Fifteen conditions, all required.
//
// The distinction that matters: the exception compensates for ABSENCE, never
// for CONTRADICTION. An image that says it was built from another commit is not
// a gap in metadata — it is evidence that the digest is for other bytes, and no
// owner decision can make that safe. That case fails before the exception is
// even consulted.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXCEPTION_PATH = "data/rcap-render/worker-source-binding-exception.json";
const EVIDENCE_PATH = "data/rcap-render/worker-publication-evidence.json";

const REF = process.env.REF ?? "";
const EXPECTED = String(process.env.WORKER_TAG ?? "").toLowerCase();
const DIGEST = String(process.env.EXPECTED_DIGEST ?? "");
const PR_HEAD = String(process.env.PR_HEAD_SHA ?? "").toLowerCase();

const abs = (p) => path.join(rootDir, p);
const readJson = (p) => JSON.parse(fs.readFileSync(abs(p), "utf8"));
const SHA40 = /^[0-9a-f]{40}$/;
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;

if (!SHA40.test(EXPECTED)) {
  console.error("verify-rcap-worker-image-revision: WORKER_TAG must be a full 40-character commit SHA");
  process.exit(1);
}

/** What the image itself says, if anything. */
function statedRevision() {
  let label = "";
  try {
    label = execFileSync(
      "docker",
      ["image", "inspect", "--format", '{{index .Config.Labels "org.opencontainers.image.revision"}}', REF],
      { encoding: "utf8" }
    ).trim();
  } catch { /* reported as absent below */ }
  if (label && label !== "<no value>") {
    return { source: "org.opencontainers.image.revision label", value: label.toLowerCase() };
  }

  for (const format of ["{{json .Provenance}}", "{{json .SBOM}}"]) {
    try {
      const raw = execFileSync("docker", ["buildx", "imagetools", "inspect", REF, "--format", format], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      });
      // Any 40-hex commit the attestation names. Taking the FIRST match rather
      // than searching for the expected one matters: an attestation naming a
      // different commit must surface as a contradiction, not be skipped over
      // until a matching string is found somewhere in the blob.
      const found = raw.match(/\b[0-9a-f]{40}\b/);
      if (found) return { source: `buildx ${format.includes("Provenance") ? "provenance" : "SBOM"} attestation`, value: found[0].toLowerCase() };
    } catch { /* absent or unreadable */ }
  }
  return null;
}

const stated = statedRevision();

// --- NORMAL PATH ------------------------------------------------------------
if (stated && stated.value === EXPECTED) {
  console.log("verify-rcap-worker-image-revision passed.");
  console.log(`  ${stated.source}: ${stated.value}`);
  console.log(`  matches the accepted worker source ${EXPECTED}`);
  console.log("  SOURCE BINDING: PASS");
  console.log("  OCI REVISION: PRESENT");
  process.exit(0);
}

// --- CONTRADICTION: never compensable --------------------------------------
if (stated && stated.value !== EXPECTED) {
  console.error("verify-rcap-worker-image-revision FAILED");
  console.error(`  - ${stated.source} says ${stated.value}, but the accepted worker source is ${EXPECTED}.`);
  console.error("    The image states it was built from other bytes. This is a contradiction, not a missing label,");
  console.error("    and no source-binding exception may compensate for it.");
  process.exit(1);
}

// --- EXCEPTION PATH ---------------------------------------------------------
const problems = [];
const fail = (condition, message) => { if (!condition) problems.push(message); };

if (!fs.existsSync(abs(EXCEPTION_PATH))) {
  console.error("verify-rcap-worker-image-revision FAILED");
  console.error(`  - the image records no source revision and no exception record exists at ${EXCEPTION_PATH}.`);
  console.error(`    Expected: ${EXPECTED}`);
  console.error("    Fix by publishing with the revision recorded (docker/metadata-action, or a Dockerfile LABEL).");
  process.exit(1);
}

const x = readJson(EXCEPTION_PATH);
const evidence = readJson(EVIDENCE_PATH);

// 1 and 2. absence, established above by `stated === null`
fail(stated === null, "the image states a revision, so the exception path does not apply");
// 3, 4, 5. the record must name this exact digest, source and run
fail(x.immutableDigest === DIGEST, `the exception names digest ${x.immutableDigest}, not the digest under acceptance ${DIGEST}`);
fail(x.sourceSha === EXPECTED, `the exception names source ${x.sourceSha}, not the accepted worker source ${EXPECTED}`);
fail(x.publicationRunId === evidence.workflowRunId, `the exception names run ${x.publicationRunId}, not the publication run ${evidence.workflowRunId}`);
// 6. committed publication evidence must independently agree on all three
fail(evidence.immutableRegistryDigest === DIGEST, "the committed publication evidence names a different digest");
fail(evidence.sourceSha === EXPECTED, "the committed publication evidence names a different source SHA");
fail(typeof evidence.workflowRunId === "number", "the committed publication evidence names no publication run");
// the record must state the absence it compensates for, not paper over it
fail(x.ociRevisionPresent === false, "the exception claims an OCI revision is present; it is not, and claiming so misreports the image");
fail(x.provenanceAttestationPresent === false, "the exception claims a provenance attestation is present; it is not");
// 11, 12, 13, 14. the publication contract itself
fail(evidence.packageVisibility === "private", "the package is not recorded private");
fail(evidence.mutableLatestTagCreated === false, "a mutable latest tag is recorded");
fail(evidence.publishOnlyNoDeploy === true, "the publication is not recorded as publish-only");
fail(evidence.workerClaimingStarted === false, "worker claiming is recorded as having started");
fail(evidence.stagingAndProductionUnchanged === true, "staging or Production is not recorded as unchanged");
// 15. single use, and never a deployment authority
fail(x.reusable === false, "the exception does not declare reusable: false, so it could be applied to another image");
fail(x.ownerDecision === "approved_for_this_exact_digest_only", "the exception carries no exact-digest owner decision");
fail(x.noDeploymentAuthorizedByException === true, "the exception does not disclaim deployment authority");
fail(
  typeof x.futurePublicationRequirement === "string" && /revision|provenance/i.test(x.futurePublicationRequirement),
  "the exception states no requirement that future publications record a revision"
);
fail(Array.isArray(x.sourceBindingMethod) && x.sourceBindingMethod.length >= 5,
  "the exception names fewer than five independent source-binding facts");
fail(DIGEST_RE.test(String(x.immutableDigest)), "the exception's digest is malformed");
fail(SHA40.test(String(x.sourceSha)), "the exception's source SHA is malformed");
fail(SHA40.test(String(x.prHeadSha)), "the exception's PR head SHA is malformed");
// 10. The complete image-input diff from the accepted source to the head under
//     acceptance must be EMPTY.
//
//     Checked as a diff rather than as string equality against the recorded
//     prHeadSha: the head necessarily moves as data-only commits land (this
//     record's own commit moves it), and pinning a literal SHA would make the
//     exception expire the moment it was written. What must hold is that no
//     image input changed — which is the property the digest depends on, and
//     which a moving head does not weaken.
const IMAGE_INPUT_PATHS = [
  "package.json", "package-lock.json", "tsconfig.json",
  "scripts/rcap-render-worker.mjs", "scripts/lib", "src",
  "deploy/rcap-render-worker/Dockerfile"
];
if (PR_HEAD) {
  try {
    const changed = execFileSync(
      "git",
      ["diff", "--name-only", x.sourceSha, PR_HEAD, "--", ...IMAGE_INPUT_PATHS],
      { cwd: rootDir, encoding: "utf8" }
    ).trim();
    fail(
      changed === "",
      `image inputs changed between the accepted source ${x.sourceSha.slice(0, 12)}… and the head under acceptance ${PR_HEAD.slice(0, 12)}…: ${changed.split("\n").join(", ")} — the accepted digest is for other bytes`
    );
  } catch (error) {
    fail(false, `could not compute the image-input diff from ${x.sourceSha.slice(0, 12)}… to ${PR_HEAD.slice(0, 12)}…: ${String(error.message ?? error).split("\n")[0]}`);
  }
}

if (problems.length > 0) {
  console.error("verify-rcap-worker-image-revision FAILED");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log("verify-rcap-worker-image-revision passed via the exact-digest compensating control.");
console.log(`  SOURCE BINDING: PASS WITH EXACT-DIGEST COMPENSATING CONTROL`);
console.log(`  OCI REVISION: ABSENT`);
console.log(`  source ${EXPECTED} bound to ${DIGEST} by: ${x.sourceBindingMethod.join(", ")}`);
console.log(`  publication run ${x.publicationRunId}; reusable: ${x.reusable}`);
console.log("  This is not an OCI revision pass. The image states no source; the binding is external.");
