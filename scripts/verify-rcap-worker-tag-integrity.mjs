#!/usr/bin/env node
// Resolves what the worker's full-SHA GHCR tag ACTUALLY points at, and refuses
// to let a publication overwrite one that already exists.
//
// Why this exists: two successful publications of source 664b8ddd wrote the
// same full-SHA tag. Run 31965540347 produced sha256:e958cb05 and the later run
// 31980720145 produced sha256:be782397, and neither committed record mentions
// the other. The scheme's whole safety argument was "the tag is the full commit
// SHA, so it can only ever mean one build" — but a tag is a mutable pointer, and
// nothing stopped the second push from moving it. Calling that tag immutable was
// always wrong; only the digest is immutable.
//
// Two modes:
//   --resolve   read-only. Report the digest the tag resolves to, and the
//               presence of each candidate digest. Used to settle which
//               publication is canonical from the registry rather than from a
//               JSON file that happens to be newer.
//   --guard     pre-publication. Fail closed when the tag already exists, so a
//               second publication cannot silently move it.
//
// Fails closed on every uncertainty: a lookup error, a missing token, a
// malformed tag, or an ambiguous answer all exit non-zero. An unreachable
// registry must never read as "the tag is free".

import process from "node:process";

const MODE_RESOLVE = process.argv.includes("--resolve");
const MODE_GUARD = process.argv.includes("--guard");
const REGISTRY = "ghcr.io";
const IMAGE = process.env.RCAP_WORKER_IMAGE || "roger-legalease/rcap-render-worker";
const TAG = (process.env.RCAP_WORKER_TAG || "").trim();
const TOKEN = process.env.GHCR_TOKEN || process.env.GITHUB_TOKEN || "";
/** Set only by a named, explicit exceptional authorization. */
const REPLACEMENT_AUTHORIZATION = (process.env.RCAP_WORKER_TAG_REPLACEMENT_AUTHORIZATION || "").trim();

const MANIFEST_ACCEPT = [
  "application/vnd.oci.image.index.v1+json",
  "application/vnd.oci.image.manifest.v1+json",
  "application/vnd.docker.distribution.manifest.list.v2+json",
  "application/vnd.docker.distribution.manifest.v2+json"
].join(", ");

function fail(message) {
  console.error(`verify-rcap-worker-tag-integrity FAILED\n  - ${message}`);
  process.exit(1);
}

if (!MODE_RESOLVE && !MODE_GUARD) fail("pass --resolve or --guard");
if (!/^[0-9a-f]{40}$/.test(TAG)) {
  // A short SHA would let two different commits share a tag prefix, which is
  // exactly the ambiguity the full SHA exists to remove.
  fail(`RCAP_WORKER_TAG must be a full 40-character lowercase commit SHA; got ${JSON.stringify(TAG)}`);
}
if (!TOKEN) fail("no GHCR credential in GHCR_TOKEN or GITHUB_TOKEN; refusing to report a tag as absent without being able to look");

async function bearer() {
  const basic = Buffer.from(`x:${TOKEN}`).toString("base64");
  const res = await fetch(
    `https://${REGISTRY}/token?service=${REGISTRY}&scope=repository:${IMAGE}:pull`,
    { headers: { Authorization: `Basic ${basic}` } }
  );
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.token) {
    fail(`could not obtain a GHCR pull token (${res.status}); the credential lacks read:packages or the package is unreachable`);
  }
  return body.token;
}

/** Returns the immutable digest a reference resolves to, or null when absent. */
async function resolveReference(token, reference) {
  const res = await fetch(`https://${REGISTRY}/v2/${IMAGE}/manifests/${reference}`, {
    method: "HEAD",
    headers: { Authorization: `Bearer ${token}`, Accept: MANIFEST_ACCEPT }
  });
  if (res.status === 404) return null;
  if (!res.ok) fail(`registry lookup for ${reference} returned ${res.status}; failing closed rather than guessing`);
  const digest = res.headers.get("docker-content-digest");
  if (!digest) fail(`registry returned no docker-content-digest for ${reference}`);
  return digest;
}

const token = await bearer();
const tagDigest = await resolveReference(token, TAG);
const latestDigest = await resolveReference(token, "latest");

if (MODE_GUARD) {
  if (latestDigest) fail(`a mutable latest tag exists (${latestDigest}); this scheme forbids it`);
  if (tagDigest) {
    if (REPLACEMENT_AUTHORIZATION !== `replace-${TAG}`) {
      fail(
        `the full-SHA tag ${TAG} already resolves to ${tagDigest}.\n` +
        `    Publishing again would MOVE that tag and leave two records naming one tag, which has already happened once.\n` +
        `    The existing digest is unchanged by this refusal.\n` +
        `    To replace it deliberately, set RCAP_WORKER_TAG_REPLACEMENT_AUTHORIZATION=replace-${TAG}.`
      );
    }
    console.log(`  authorized replacement of ${TAG} (currently ${tagDigest})`);
  } else {
    console.log(`  ${TAG} is free; publication may proceed`);
  }
  console.log("verify-rcap-worker-tag-integrity passed (guard).");
  process.exit(0);
}

// --resolve
const candidates = (process.env.RCAP_WORKER_CANDIDATE_DIGESTS || "")
  .split(",").map((d) => d.trim()).filter(Boolean);

console.log(`image: ${REGISTRY}/${IMAGE}`);
console.log(`tag:   ${TAG}`);
console.log(`  tag currently resolves to: ${tagDigest ?? "(absent)"}`);
console.log(`  mutable latest tag:        ${latestDigest ?? "(absent — correct)"}`);
for (const candidate of candidates) {
  const present = await resolveReference(token, candidate);
  console.log(
    `  candidate ${candidate}\n` +
    `      exists in registry: ${present ? "yes" : "NO"}\n` +
    `      is the tag target:  ${present && present === tagDigest ? "YES" : "no"}`
  );
}
if (!tagDigest) fail(`the full-SHA tag ${TAG} does not exist; a release cannot pin a tag that is absent`);
console.log("\nverify-rcap-worker-tag-integrity passed (resolve).");
