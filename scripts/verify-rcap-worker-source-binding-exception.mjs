#!/usr/bin/env node
// The source-binding exception must stay exactly one digest wide.
//
//   node scripts/verify-rcap-worker-source-binding-exception.mjs
//   node scripts/verify-rcap-worker-source-binding-exception.mjs --mutations
//
// An exception that compensates for a missing OCI revision is a hole in the
// one control that ties a running image back to reviewed source. It is
// defensible for a single already-published digest whose binding is
// independently established. It is not defensible as a policy, and the way a
// narrow exception becomes a policy is by nobody noticing when `reusable` flips
// or a digit changes.
//
// So this proves the shape of the hole, not just that it is documented:
//   - the future publication workflow records the revision, so the next image
//     never needs this;
//   - the exception names one exact digest, source and run;
//   - widening it fails;
//   - and a CONTRADICTORY revision fails even with a perfect record, because
//     the exception compensates for absence and never for disagreement.
//
// A retired record is the other legal state. The publication that succeeded
// 5ac0d8d6 states its own revision, so nothing compensates for anything any
// more. A retired record must say so, must keep the tuple it covered so the
// history stays readable, and must not name the accepted publication — because
// a record that still pointed at the image in force would be an exception
// pretending to be history.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MUTATIONS = process.argv.includes("--mutations");

const EXCEPTION = "data/rcap-render/worker-source-binding-exception.json";
const EVIDENCE = "data/rcap-render/worker-publication-evidence.json";
const PUBLISH_WORKFLOW = ".github/workflows/publish-rcap-render-worker.yml";
const REVISION_VERIFIER = "scripts/verify-rcap-worker-image-revision.mjs";

const abs = (p) => path.join(rootDir, p);
const readJson = (p) => JSON.parse(fs.readFileSync(abs(p), "utf8"));
const readText = (p) => fs.readFileSync(abs(p), "utf8");

const SHA40 = /^[0-9a-f]{40}$/;
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;

/**
 * The world the checks run against. Held as data so a mutation can alter one
 * fact and the same checks re-run against it.
 */
function world() {
  return {
    exception: readJson(EXCEPTION),
    evidence: readJson(EVIDENCE),
    publishWorkflow: readText(PUBLISH_WORKFLOW),
    revisionVerifier: readText(REVISION_VERIFIER)
  };
}

function failures(w) {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };
  const x = w.exception;
  const retired = x.status === "retired_not_in_force";

  // The future rule: the next image must not need this exception at all.
  fail(
    /org\.opencontainers\.image\.revision=/.test(w.publishWorkflow),
    "the publication workflow does not record org.opencontainers.image.revision, so the next image would need this exception too"
  );
  fail(
    /labels:/.test(w.publishWorkflow),
    "the publication workflow passes no labels at all"
  );
  fail(
    /org\.opencontainers\.image\.source=/.test(w.publishWorkflow),
    "the publication workflow records no source URL label"
  );

  // Exactly one digest wide, whether it is in force or kept as history.
  const tuple = retired ? (x.supersededTuple ?? {}) : x;
  fail(tuple.reusable === false, "the exception does not declare reusable: false");
  fail(tuple.ownerDecision === "approved_for_this_exact_digest_only", "the exception is not scoped to one exact digest by owner decision");
  fail(tuple.scope?.appliesToExactlyOneTuple === true, "the exception does not declare that it covers exactly one tuple");
  fail(DIGEST_RE.test(String(tuple.immutableDigest)), "the exception's digest is malformed");
  fail(SHA40.test(String(tuple.sourceSha)), "the exception's source SHA is malformed");
  fail(SHA40.test(String(tuple.prHeadSha)), "the exception's PR head SHA is malformed");
  fail(Number.isInteger(tuple.publicationRunId), "the exception names no publication run");

  // It must state the absence rather than paper over it.
  fail(tuple.ociRevisionPresent === false, "the exception reports an OCI revision as present, which misreports the image");
  fail(tuple.provenanceAttestationPresent === false, "the exception reports a provenance attestation as present");
  fail(
    x.exceptionType === "missing_oci_revision_compensated_by_external_source_binding",
    "the exception does not name what it is compensating for"
  );

  if (retired) {
    // Retired means the accepted image states its own revision. The record must
    // therefore NOT name the publication in force, or it is an exception wearing
    // history's clothes.
    fail(typeof x.retiredBecause === "string" && x.retiredBecause.length > 40, "the retired exception does not say why it stopped applying");
    fail(
      w.evidence.immutableRegistryDigest !== tuple.immutableDigest,
      "the exception is marked retired but still names the digest under acceptance"
    );
    fail(
      w.evidence.sourceSha !== tuple.sourceSha,
      "the exception is marked retired but still names the accepted worker source"
    );
    fail(
      w.evidence.workflowRunId !== tuple.publicationRunId,
      "the exception is marked retired but still names the publication run in force"
    );
    // And it must still name the publication it actually covered, which the
    // evidence records as the superseded one. Without this anchor a retired
    // record could be edited to name any digest at all and stay "not in force".
    const superseded = w.evidence.supersededPublication ?? {};
    fail(
      superseded.immutableRegistryDigest === tuple.immutableDigest,
      "the retired exception does not name the digest the evidence records as superseded"
    );
    fail(
      superseded.sourceSha === tuple.sourceSha,
      "the retired exception does not name the source the evidence records as superseded"
    );
    fail(
      superseded.publicationRunId === tuple.publicationRunId,
      "the retired exception does not name the run the evidence records as superseded"
    );
  } else {
    // In force: the committed evidence must independently agree — one record
    // asserting itself is not a binding.
    fail(w.evidence.immutableRegistryDigest === tuple.immutableDigest, "the publication evidence and the exception name different digests");
    fail(w.evidence.sourceSha === tuple.sourceSha, "the publication evidence and the exception name different source SHAs");
    fail(w.evidence.workflowRunId === tuple.publicationRunId, "the publication evidence and the exception name different publication runs");
  }

  // It authorizes nothing beyond the binding.
  fail(x.noDeploymentAuthorizedByException === true, "the exception does not disclaim deployment authority");
  fail(
    Array.isArray(tuple.sourceBindingMethod) && tuple.sourceBindingMethod.length >= 5,
    "the exception names fewer than five independent source-binding facts"
  );
  fail(
    typeof x.futurePublicationRequirement === "string" && /revision|provenance/i.test(x.futurePublicationRequirement),
    "the exception does not require future publications to record a revision"
  );

  // The verifier must refuse a contradictory revision BEFORE consulting the
  // exception. This is the property that keeps the hole absence-only.
  fail(
    /contradiction, not a missing label|no source-binding exception may compensate/i.test(w.revisionVerifier),
    "the revision verifier does not refuse a contradictory revision ahead of the exception path"
  );
  fail(
    /stated\.value !== EXPECTED/.test(w.revisionVerifier),
    "the revision verifier has no explicit contradiction branch"
  );
  fail(
    /OCI REVISION: ABSENT/.test(w.revisionVerifier),
    "the revision verifier does not report the revision as ABSENT on the exception path"
  );
  fail(
    !/OCI REVISION: PASS/.test(w.revisionVerifier),
    "the revision verifier reports 'OCI REVISION: PASS', which overstates what the image proves"
  );

  return out;
}

const base = world();
const baseFailures = failures(base);

const tupleOf = (w) =>
  w.exception.status === "retired_not_in_force" ? w.exception.supersededTuple : w.exception;

if (MUTATIONS) {
  const clone = () => JSON.parse(JSON.stringify({ ...base }));
  const mutations = [
    ["reusable: false is removed", (w) => { tupleOf(w).reusable = true; }],
    ["one digest character is changed", (w) => {
      const t = tupleOf(w);
      t.immutableDigest = t.immutableDigest.replace(/.$/, (c) => (c === "0" ? "1" : "0"));
    }],
    ["one source-SHA character is changed", (w) => {
      const t = tupleOf(w);
      t.sourceSha = t.sourceSha.replace(/.$/, (c) => (c === "0" ? "1" : "0"));
    }],
    ["the publication run is changed", (w) => { tupleOf(w).publicationRunId = 1; }],
    ["the exception claims the OCI revision is present", (w) => { tupleOf(w).ociRevisionPresent = true; }],
    ["the owner decision is widened beyond one digest", (w) => { tupleOf(w).ownerDecision = "approved_for_all_images"; }],
    ["the future workflow stops recording the revision", (w) => {
      w.publishWorkflow = w.publishWorkflow.replace(/org\.opencontainers\.image\.revision=/g, "org.opencontainers.image.notrevision=");
    }],
    ["the verifier drops its contradiction branch", (w) => {
      w.revisionVerifier = w.revisionVerifier.replace(/stated\.value !== EXPECTED/g, "false");
    }],
    ["the verifier reports the revision as a pass", (w) => {
      w.revisionVerifier = w.revisionVerifier.replace(/OCI REVISION: ABSENT/g, "OCI REVISION: PASS");
    }],
    ["the exception no longer disclaims deployment", (w) => { w.exception.noDeploymentAuthorizedByException = false; }],
    ["a retired record is pointed back at the digest in force", (w) => {
      w.exception.supersededTuple.immutableDigest = w.evidence.immutableRegistryDigest;
    }],
    ["a retired record is pointed back at the accepted source", (w) => {
      w.exception.supersededTuple.sourceSha = w.evidence.sourceSha;
    }],
    ["a retired record is pointed back at the publication run in force", (w) => {
      w.exception.supersededTuple.publicationRunId = w.evidence.workflowRunId;
    }],
    ["a retired record stops saying why it stopped applying", (w) => { w.exception.retiredBecause = ""; }]
  ];

  let undetected = 0;
  for (const [label, mutate] of mutations) {
    const w = clone();
    mutate(w);
    const caught = failures(w).length > baseFailures.length;
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-worker-source-binding-exception FAILED — ${undetected} mutation(s) undetected.`);
    process.exit(1);
  }
  console.log(`\nThe exception cannot be widened, reused, or turned into a revision pass (${mutations.length}/${mutations.length}).`);
  process.exit(0);
}

if (baseFailures.length > 0) {
  console.error(`verify-rcap-worker-source-binding-exception FAILED — ${baseFailures.length} problem(s):\n`);
  for (const problem of baseFailures) console.error(` - ${problem}`);
  process.exit(1);
}

const x = base.exception;
const spent = x.status === "retired_not_in_force";
const tuple = spent ? x.supersededTuple : x;
console.log("verify-rcap-worker-source-binding-exception passed.");
if (spent) {
  console.log("  no source-binding exception is in force.");
  console.log(`  the record is history for ${tuple.sourceSha.slice(0, 12)}… -> ${tuple.immutableDigest.slice(0, 20)}… (run ${tuple.publicationRunId}),`);
  console.log(`  and names neither the accepted source ${base.evidence.sourceSha.slice(0, 12)}… nor the digest under acceptance.`);
} else {
  console.log(`  exception covers exactly one tuple: ${tuple.sourceSha.slice(0, 12)}… -> ${tuple.immutableDigest.slice(0, 20)}… (run ${tuple.publicationRunId})`);
}
console.log(`  reusable: ${tuple.reusable}; OCI revision present: ${tuple.ociRevisionPresent}; provenance present: ${tuple.provenanceAttestationPresent}`);
console.log("  future publications record org.opencontainers.image.revision, so the next image needs no exception.");
console.log("  a contradictory revision still fails: the exception compensates for absence, never for disagreement.");
