#!/usr/bin/env node
// Which source commit the published image says it was built from.
//
//   REF=<repo>@sha256:… WORKER_TAG=<40-hex> GHCR_TOKEN=… \
//     node scripts/verify-rcap-worker-image-revision.mjs
//
// The publication evidence CLAIMS a source SHA. That claim is a line in a JSON
// file this repository wrote about itself. This asks the image instead, so the
// accepted digest and the frozen source are bound by something the registry
// holds rather than by something we asserted.
//
// Two places can carry the answer, and either is sufficient:
//
//   1. org.opencontainers.image.revision on the image config — the standard
//      label, set by docker/metadata-action or a Dockerfile LABEL.
//   2. the SLSA provenance attestation buildx attaches on push, whose
//      materials/invocation name the source commit.
//
// A build that records neither cannot say what it was built from. That is a
// real acceptance failure and it is reported as one: the fix is to publish with
// the revision recorded, not to accept an image that cannot identify itself.
import { execFileSync } from "node:child_process";

const REF = process.env.REF ?? "";
const EXPECTED = String(process.env.WORKER_TAG ?? "").toLowerCase();
const TOKEN = process.env.GHCR_TOKEN ?? "";
const DIGEST = process.env.EXPECTED_DIGEST ?? "";

const problems = [];
const found = [];

if (!/^[0-9a-f]{40}$/.test(EXPECTED)) {
  console.error("verify-rcap-worker-image-revision: WORKER_TAG must be a full 40-character commit SHA");
  process.exit(1);
}

const docker = (args) => execFileSync("docker", args, { encoding: "utf8" }).trim();

// 1. The standard label on the image config.
let label = "";
try {
  label = docker([
    "image", "inspect", "--format",
    '{{index .Config.Labels "org.opencontainers.image.revision"}}',
    REF
  ]);
} catch (error) {
  problems.push(`could not inspect the image config: ${String(error.message ?? error).split("\n")[0]}`);
}
if (label && label !== "<no value>") {
  found.push({ source: "org.opencontainers.image.revision label", value: label.toLowerCase() });
}

// 2. The provenance attestation buildx attaches on push. Read through buildx
//    itself, which already holds the registry credentials from docker login —
//    hand-rolling the GHCR token exchange here would be a second, worse
//    implementation of something the tool does correctly.
if (found.length === 0) {
  for (const format of ["{{json .Provenance}}", "{{json .SBOM}}"]) {
    try {
      const raw = execFileSync(
        "docker",
        ["buildx", "imagetools", "inspect", REF, "--format", format],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
      );
      const match = raw.match(/[0-9a-f]{40}/g)?.find((c) => c === EXPECTED);
      if (match) {
        found.push({ source: `buildx ${format.includes("Provenance") ? "provenance" : "SBOM"} attestation`, value: match });
        break;
      }
    } catch {
      // Absent or unreadable attestations are not themselves a failure; the
      // label is the primary evidence and its absence is reported below.
    }
  }
}

if (found.length === 0) {
  console.error("verify-rcap-worker-image-revision FAILED");
  console.error(`  - the image at ${REF} records no source revision.`);
  console.error("    Neither org.opencontainers.image.revision nor a provenance attestation naming a commit is present,");
  console.error("    so the image cannot state which source it was built from and the binding to the freeze SHA rests");
  console.error("    entirely on the committed evidence file asserting it.");
  console.error(`    Expected: ${EXPECTED}`);
  console.error("    Fix by publishing with the revision recorded (docker/metadata-action, or a LABEL in the Dockerfile).");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const mismatched = found.filter((f) => f.value !== EXPECTED);
if (mismatched.length > 0) {
  console.error("verify-rcap-worker-image-revision FAILED");
  for (const m of mismatched) {
    console.error(`  - ${m.source} says ${m.value}, but the freeze source is ${EXPECTED}`);
    console.error("    The image was built from other bytes than the ones this release froze.");
  }
  process.exit(1);
}

console.log("verify-rcap-worker-image-revision passed.");
for (const f of found) console.log(`  ${f.source}: ${f.value}`);
console.log(`  matches the freeze source ${EXPECTED}`);
