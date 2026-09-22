#!/usr/bin/env node
// #42-adjacent release-tooling reconciliation: prove verifyReleaseCandidateBinding
// validates a FUTURE exact binding from the controlling records, and still
// refuses every wrong identity.
//
// Why this exists alongside verify-hosted-tools-binding.test.mjs: that control
// clones the whole repository, which needs several gigabytes of working disk and
// therefore cannot run in every session. Its redness is then an environment
// result and says nothing about the verifier. This builds a small synthetic
// repository instead, so the tuple logic is measurable anywhere.
//
// It fabricates nothing in the repository: every record below is written inside
// a temporary Git fixture and discarded. No successor RELEASE_CANDIDATE_BINDING
// or HOSTED_TOOLS_BINDING is created, and no worker identity is bound.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { verifyReleaseCandidateBinding } from "./verify-release-candidate-binding.mjs";

// The literal tuple the verifier used to hard-code. Named here only so the test
// can prove it is no longer privileged.
const RETIRED_LITERAL = {
  applicationSha: "436520e4a99f0b8a290ace32f1d717b951630319",
  workerSourceSha: "436520e4a99f0b8a290ace32f1d717b951630319",
  workerDigest: "sha256:98e3e820f82c52912b3d007031e1e3e6c45445bcf231d9a61b3f269ffb5d1257",
  workerInputFingerprint: "sha256:d63d9c69d1468a140002571bb756e019abccd50332b08ed114d2d093f6e60683"
};

const root = fs.mkdtempSync(path.join(os.tmpdir(), "release-binding-mutations-"));
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const write = (rel, body) => {
  fs.mkdirSync(path.join(root, path.dirname(rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), typeof body === "string" ? body : JSON.stringify(body, null, 2));
};
const TOOLING = "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json";
const PUBLICATION = "data/rcap-render/worker-publication-evidence.json";

try {
  git("init", "-b", "main");
  git("config", "user.email", "fixture@example.invalid");
  git("config", "user.name", "Release binding fixture");

  // A minimal tree carrying every canonical worker input the plan reads.
  write("package.json", { name: "fixture", private: true });
  write("package-lock.json", { lockfileVersion: 3 });
  write("tsconfig.json", { compilerOptions: {} });
  write("scripts/rcap-render-worker.mjs", "// fixture worker\n");
  write("scripts/lib/placeholder.mjs", "export const placeholder = true;\n");
  write("src/placeholder.ts", "export const placeholder = true;\n");
  write("deploy/rcap-render-worker/Dockerfile", "FROM node:22-slim\nCOPY package.json ./\n");
  write("deploy/rcap-render-worker/Dockerfile.dockerignore", "node_modules\n");
  write("data/record-clearing/supplemental-guides/placeholder.json", { placeholder: true });
  write("data/record-clearing/brand/legalease-logo.png", "fixture-logo-bytes");
  git("add", "-f", "package.json", "package-lock.json", "tsconfig.json", "scripts", "src", "deploy", "data");
  git("commit", "-q", "-m", "worker source");
  const workerSourceSha = git("rev-parse", "HEAD");

  // The application freeze: one commit past the worker source that changes no
  // canonical worker input, so the frozen application reuses the published image.
  write("docs/note.md", "application freeze\n");
  git("add", "-f", "docs/note.md");
  git("commit", "-q", "-m", "application freeze");
  const applicationSha = git("rev-parse", "HEAD");

  // A NEW worker digest, deliberately unlike the retired literal.
  const workerDigest = "sha256:" + "ab".repeat(32);
  // A published image is not an accepted one, and since 2026-09-22 the verifier
  // says so: the fixture therefore carries the read-only acceptance this tuple
  // would really have. This does not weaken anything below -- the acceptance is
  // mutated in its own right by test-release-control-boundary-mutations.mjs;
  // here it is simply the truthful baseline the identity mutations move away
  // from. A fixture that omitted it would now be measuring a refusal it did not
  // intend and reporting it as a pass for a tuple mutation.
  write(PUBLICATION, {
    sourceSha: workerSourceSha,
    immutableRegistryDigest: workerDigest,
    workflowConclusion: "success",
    runtimeAccepted: true,
    imageAcceptance: {
      runId: 424242,
      conclusion: "success",
      digest: workerDigest,
      tag: workerSourceSha,
      readOnly: true
    }
  });
  git("add", "-f", PUBLICATION);
  git("commit", "-q", "-m", "publication evidence");
  const publicationSha = git("rev-parse", "HEAD");

  // The tools commit: one bounded orchestration file, after the freeze.
  write("scripts/rcap-vercel-identity-recheck.mjs", "// tooling change\n");
  git("add", "-f", "scripts/rcap-vercel-identity-recheck.mjs");
  git("commit", "-q", "-m", "bounded tooling change");
  const toolsSha = git("rev-parse", "HEAD");

  // The fingerprint the plan actually computes for the tools commit.
  const { createWorkerInputPlan } = await import("../rcap-hosted-acceptance-worker-input-plan.mjs");
  const workerInputFingerprint = createWorkerInputPlan({
    rootDir: root, candidateSha: toolsSha, acceptedSourceSha: workerSourceSha, acceptedDigest: workerDigest
  }).aggregateInputSha256;

  const candidate = { applicationSha, workerSourceSha, workerDigest, workerInputFingerprint };
  const orchestrationFiles = git("diff", "--name-only", applicationSha, toolsSha)
    .split("\n").filter(p => p.startsWith("scripts/") || p.startsWith(".github/"));
  const binding = { ...candidate, toolsSha, orchestrationFiles };

  const bind = b => {
    write(TOOLING, b);
    git("add", "-f", TOOLING);
    git("commit", "-q", "-m", "tooling binding");
  };
  const reset = () => { git("reset", "-q", "--hard", toolsSha); git("clean", "-qfd"); };

  // 1. A future tuple that is none of the historical ones verifies CURRENT.
  bind(binding);
  const accepted = verifyReleaseCandidateBinding(root, candidate);
  assert.equal(accepted.current, true, `a correctly bound future tuple must verify: ${accepted.reasons.join("; ")}`);
  assert.equal(accepted.status, "CURRENT");
  for (const [key, value] of Object.entries(candidate)) {
    assert.notEqual(value, RETIRED_LITERAL[key], `${key} must differ from the retired literal for this proof to mean anything`);
  }
  console.log("PASS: a future exact binding, unlike the retired literal, verifies CURRENT");

  // 2. Every identity is load-bearing.
  const mutations = [
    ["tools SHA", { toolsSha: "0".repeat(40) }],
    ["application SHA", { applicationSha: "0".repeat(40) }],
    ["worker source SHA", { workerSourceSha: "0".repeat(40) }],
    ["worker digest", { workerDigest: "sha256:" + "0".repeat(64) }],
    ["worker input fingerprint", { workerInputFingerprint: "sha256:" + "0".repeat(64) }],
    ["declared orchestration set", { orchestrationFiles: [] }],
    ["retired literal smuggled into the binding", RETIRED_LITERAL]
  ];
  for (const [name, patch] of mutations) {
    reset();
    bind({ ...binding, ...patch });
    const result = verifyReleaseCandidateBinding(root, candidate);
    assert.equal(result.current, false, `${name}: a wrong identity must refuse`);
    assert.ok(result.reasons.length > 0 && result.reasons.every(r => r.trim()), `${name}: the refusal must say why`);
    console.log(`PASS refusal: ${name}`);
  }

  // 3. A candidate whose worker source is not the published source refuses,
  //    even though it is an ancestor of the application.
  reset();
  bind(binding);
  const wrongSource = { ...candidate, workerSourceSha: applicationSha };
  const sourceResult = verifyReleaseCandidateBinding(root, wrongSource);
  assert.equal(sourceResult.current, false);
  console.log("PASS refusal: candidate worker source that was never published");

  // 4. With no tooling binding at all, the candidate stands on its own proofs
  //    and no orchestration change is excused. At the publication commit there
  //    is no post-freeze orchestration delta, so it verifies; at the tools
  //    commit the same absent binding leaves that delta unbounded, so it
  //    refuses. Both directions matter: the binding is what authorizes bounded
  //    post-freeze tooling, and its absence must not silently permit it.
  git("reset", "-q", "--hard", publicationSha); git("clean", "-qfd");
  assert.equal(fs.existsSync(path.join(root, TOOLING)), false, "the fixture must have no tooling binding at this point");
  const unbound = verifyReleaseCandidateBinding(root, candidate);
  assert.equal(unbound.current, true, `an unchanged candidate must verify without a binding: ${unbound.reasons.join("; ")}`);
  git("reset", "-q", "--hard", toolsSha); git("clean", "-qfd");
  const unboundedDelta = verifyReleaseCandidateBinding(root, candidate);
  assert.equal(unboundedDelta.current, false, "an unbound post-freeze orchestration change must refuse");
  assert.match(unboundedDelta.reasons.join(" "), /Candidate inputs changed/);
  assert.equal(verifyReleaseCandidateBinding(root, null).status, "NOT_FROZEN");
  console.log("PASS: absent tooling binding neither blocks a clean candidate nor excuses tooling drift");

  console.log(`PASS release-candidate binding: future tuple accepted; ${mutations.length + 1}/${mutations.length + 1} wrong identities refused`);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
