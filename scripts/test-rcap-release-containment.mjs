// Execute the actual workflow containment shells against isolated Git histories.
// No network, credentials, image publication, or deployment is involved.
import assert from "node:assert/strict";
import { requireProductionPhaseAuthorization } from "./rcap-production-migration-contract.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { parse } = require("yaml");
const read = name => parse(fs.readFileSync(`.github/workflows/${name}.yml`, "utf8"));
const entry = read("rcap-f1-ephemeral-staging");
const hosted = read("rcap-hosted-acceptance-staging");
const github = read("rcap-github-hosted-acceptance");
const publication = read("publish-rcap-render-worker");
const previewOnly = process.argv.includes("--preview-candidate-only");
const cases = previewOnly ? [[hosted, hosted.jobs.preflight]] : [
  [entry, entry.jobs.f1], [hosted, hosted.jobs.preflight], [github, github.jobs.acceptance]
];
function structural(documents) {
  const [f1, host, gh, pub] = documents;
  assert.equal(f1.jobs.f1.env.RELEASE_INTEGRATION_BRANCH, "captain-release");
  assert.equal(f1.env.RELEASE_INTEGRATION_BRANCH, undefined, "release pin must not leak into production jobs");
  assert.equal(f1.env.CANONICAL_INTEGRATION_BRANCH, "captain-release");
  for (const [name, job] of Object.entries(f1.jobs)) {
    if (name.startsWith("production_")) {
      assert.ok(!JSON.stringify(job).includes("RELEASE_INTEGRATION_BRANCH"));
      assert.ok(!JSON.stringify(job).includes("captain-release"));
      if (name === 'production_public_verify') {
        assert.equal(job.env?.CANONICAL_INTEGRATION_BRANCH, undefined);
        assert.equal(job.env?.AUTHORIZED_WORKER_SOURCE_SHA, undefined);
        assert.equal(job.env?.AUTHORIZED_WORKER_DIGEST, undefined);
        assert.equal(job.env?.RCAP_PRODUCTION_PHASE, 'public_verify');
        assert.ok(job.steps.some(step => step.run?.includes('node scripts/rcap-production-migration-contract.mjs')));
      } else if (job.steps?.some(step => step.run?.includes('$CANONICAL_INTEGRATION_BRANCH'))) {
        assert.equal(job.env?.CANONICAL_INTEGRATION_BRANCH, 'claude/legalease-sprint-captain-utucnw');
        assert.equal(job.env?.AUTHORIZED_WORKER_SOURCE_SHA, 'fe2457a71dd90d0fb83d0ed2738fcd1e6566d76e');
        assert.equal(job.env?.AUTHORIZED_WORKER_DIGEST, 'sha256:a22ad8559df69563a4f8b055e0efcb15de128e5ce09d75325abcbf783adff905');
      }
    }
  }
  for (const wf of [host, gh, pub]) assert.equal(wf.env.RELEASE_INTEGRATION_BRANCH, "captain-release");
  assert.equal(pub.env.CANONICAL_INTEGRATION_BRANCH, "main");
  for (const [wf, job] of [[f1, f1.jobs.f1], [host, host.jobs.preflight], [gh, gh.jobs.acceptance]]) {
    const script = job.steps.map(s => s.run ?? "").join("\n");
    assert.match(script, /\^\[0-9a-f\]\{40\}\$/);
    assert.match(script, /tools_sha must equal the workflow source SHA/);
    assert.match(script, /git diff --quiet/);
    assert.match(wf.env.AUTHORIZED_WORKER_SOURCE_SHA, /^[0-9a-f]{40}$/);
    assert.match(wf.env.AUTHORIZED_WORKER_DIGEST, /^sha256:[0-9a-f]{64}$/);
    assert.match(script, /WORKER_SOURCE_SHA.*AUTHORIZED_WORKER_SOURCE_SHA/);
    assert.match(script, /WORKER_DIGEST.*AUTHORIZED_WORKER_DIGEST/);
  }
}
const documents = [entry, hosted, github, publication];
if (!previewOnly) {
structural(documents);
for (const mutate of [
  d => { d[0].jobs.production_public_verify.env.CANONICAL_INTEGRATION_BRANCH = 'claude/legalease-sprint-captain-utucnw'; },
  d => { d[0].jobs.production_save_transition.env.AUTHORIZED_WORKER_SOURCE_SHA = d[0].env.AUTHORIZED_WORKER_SOURCE_SHA; },
  d => { d[0].jobs.f1.env.RELEASE_INTEGRATION_BRANCH = "feature/arbitrary"; },
  d => { d[1].env.RELEASE_INTEGRATION_BRANCH = "*"; },
  d => { d[2].env.RELEASE_INTEGRATION_BRANCH = "${{ inputs.branch }}"; },
  d => { d[0].env.RELEASE_INTEGRATION_BRANCH = "captain-release"; },
  d => { d[3].env.CANONICAL_INTEGRATION_BRANCH = "captain-release"; }
]) {
  const copy = structuredClone(documents); mutate(copy);
  assert.throws(() => structural(copy), assert.AssertionError);
}

}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-containment-"));
const git = (...args) => execFileSync("git", args, { cwd: tmp, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
try {
  git("init", "-b", "main"); git("config", "user.email", "fixture@example.invalid"); git("config", "user.name", "Containment fixture");
  git("commit", "--allow-empty", "-m", "main baseline"); const base = git("rev-parse", "HEAD");
  git("checkout", "-b", "captain-release"); git("commit", "--allow-empty", "-m", "integrated candidate"); const candidate = git("rev-parse", "HEAD");
  git("checkout", "-b", "unintegrated", base); git("commit", "--allow-empty", "-m", "unintegrated candidate"); const outside = git("rev-parse", "HEAD");
  git("branch", "claude/legalease-sprint-captain-utucnw", base);
  git("remote", "add", "origin", tmp);
  function run(script, env) {
    // Each CI checkout starts without PR tracking refs; stale local refs must not mask guard mutations.
    git("update-ref", "-d", "refs/remotes/preview/head");
    git("update-ref", "-d", "refs/remotes/preview/merge");
    return spawnSync("bash", ["-c", script], { cwd: tmp, encoding: "utf8", env: { ...process.env, ...env, GITHUB_OUTPUT: path.join(tmp, "output") } });
  }
  for (const [wf, job] of cases) {
    const step = job.steps.find(s => s.run?.includes("git merge-base --is-ancestor") && s.run.includes("for SHA in"));
    assert.ok(step, "actual ancestry loop exists");
    // Exercise just containment; leave worker byte/lineage checks intact in the workflow.
    const shell = step.run.slice(0, step.run.indexOf("\ndone") + 5)
      .replaceAll("${{ inputs.phase }}", "$REQUESTED_PHASE")
      .replaceAll("${{ inputs.application_sha }}", "$REQUESTED_APPLICATION_SHA")
      .replaceAll("${{ inputs.worker_source_sha }}", "$REQUESTED_WORKER_SOURCE_SHA")
      .replaceAll("${{ inputs.tools_sha }}", "$REQUESTED_TOOLS_SHA");
    assert.ok(shell.includes("done"));
    const env = { ...wf.env, ...job.env, REQUESTED_PHASE: "preflight", REQUESTED_APPLICATION_SHA: candidate, REQUESTED_WORKER_SOURCE_SHA: base, REQUESTED_TOOLS_SHA: candidate };
    const verify = script => {
      assert.equal(run(script, env).status, 0, "integrated release candidate must pass");
      for (const key of ["REQUESTED_APPLICATION_SHA", "REQUESTED_WORKER_SOURCE_SHA", "REQUESTED_TOOLS_SHA"]) {
        assert.notEqual(run(script, { ...env, [key]: outside }).status, 0, `${key}: unintegrated commit must fail`);
        assert.notEqual(run(script, { ...env, [key]: "a".repeat(40) }).status, 0, `${key}: nonexistent commit must fail`);
      }
    };
    verify(shell);
    assert.throws(() => verify(shell.replace(/^.*git merge-base --is-ancestor.*$/m, ": # removed containment")), assert.AssertionError);
    assert.throws(() => verify(shell.replaceAll("$RELEASE_INTEGRATION_BRANCH", "unintegrated")), assert.AssertionError);
    assert.notEqual(run(shell, { ...env, RELEASE_INTEGRATION_BRANCH: "claude/legalease-sprint-captain-utucnw" }).status, 0,
      "old branch must reproduce rejection of the integrated candidate");
  }
  // Exercise the actual hosted shell against the publisher's exact PR ref shape.
  const hostedStep = hosted.jobs.preflight.steps.find(s => s.run?.includes("for SHA in"));
  const candidateShell = hostedStep.run.slice(0, hostedStep.run.indexOf("\ndone") + 5)
    .replaceAll("${{ inputs.phase }}", "$REQUESTED_PHASE")
    .replaceAll("${{ inputs.application_sha }}", "$REQUESTED_APPLICATION_SHA")
    .replaceAll("${{ inputs.worker_source_sha }}", "$REQUESTED_WORKER_SOURCE_SHA")
    .replaceAll("${{ inputs.tools_sha }}", "$REQUESTED_TOOLS_SHA");
  const tree = git("rev-parse", `${base}^{tree}`);
  const merge = (first, second) => git("commit-tree", tree, "-p", first, "-p", second, "-m", "synthetic PR merge");
  const mergeSha = merge(candidate, outside);
  const refs = () => { git("update-ref", "refs/pull/268/head", outside); git("update-ref", "refs/pull/268/merge", mergeSha); };
  refs();
  const candidateEnv = { ...hosted.env, ...hosted.jobs.preflight.env, REQUESTED_PHASE: "replace_preview",
    GITHUB_SHA: outside, REQUESTED_APPLICATION_SHA: outside, REQUESTED_WORKER_SOURCE_SHA: base, REQUESTED_TOOLS_SHA: outside };
  const proveCandidate = shell => {
    refs();
    assert.equal(run(shell, candidateEnv).status, 0, "exact current PR candidate must pass Preview admission");
    assert.notEqual(run(shell, { ...candidateEnv, GITHUB_SHA: candidate }).status, 0, "stale workflow must refuse");
    for (const key of ["REQUESTED_APPLICATION_SHA", "REQUESTED_WORKER_SOURCE_SHA", "REQUESTED_TOOLS_SHA"])
      assert.notEqual(run(shell, { ...candidateEnv, [key]: candidate }).status, 0, `${key}: outside PR history must refuse`);
    for (const phase of ["preflight", "vercel_identity", "vercel_audit", "migrate", "clinic_migrate", "legal_aid_migrate",
      "deploy", "accept", "payment", "full", "browser", "stripe_retarget", "checkout_gate", "clinic_deploy", "clinic_preview",
      "clinic_resume", "legal_aid_browser", "sponsor_cap", "worker_contract"])
      assert.notEqual(run(shell, { ...candidateEnv, REQUESTED_PHASE: phase }).status, 0, `${phase}: PR admission must not transfer`);
    git("update-ref", "refs/pull/268/merge", merge(candidate, base));
    assert.notEqual(run(shell, candidateEnv).status, 0, "head/merge race must refuse");
    const unrelatedBase = git("commit-tree", tree, "-m", "unrelated root");
    git("update-ref", "refs/pull/268/merge", merge(unrelatedBase, outside));
    assert.notEqual(run(shell, candidateEnv).status, 0, "non-captain base must refuse");
    for (const ref of ["refs/pull/268/head", "refs/pull/268/merge"]) {
      refs(); git("update-ref", "-d", ref);
      assert.notEqual(run(shell, candidateEnv).status, 0, `missing ${ref} must refuse`);
    }
    refs();
  };
  proveCandidate(candidateShell);
  for (const guard of [
    /^.*\[ "\$PREVIEW_HEAD" = "\$GITHUB_SHA" \].*$/m,
    /^.*preview\/merge\^2.*head\/merge refs disagree.*$/m,
    /^.*PR 268 does not merge into canonical integration history.*$/m
  ]) {
    assert.match(candidateShell, guard);
    assert.throws(() => proveCandidate(candidateShell.replace(guard, ": # removed candidate guard")), assert.AssertionError, guard.source);
  }
  refs();
  if (!previewOnly) for (const [name, job] of Object.entries(entry.jobs)) {
    if (!name.startsWith("production_")) continue;
    const step = job.steps?.find(s => s.run?.includes("for SHA in") && s.run.includes("git merge-base --is-ancestor"));
    if (!step) continue; // Reusable production workflows retain their own gates.
    const shell = step.run.slice(0, step.run.indexOf("\ndone") + 5)
      .replaceAll("${{ inputs.phase }}", "$REQUESTED_PHASE")
      .replaceAll("${{ inputs.application_sha }}", "$REQUESTED_APPLICATION_SHA")
      .replaceAll("${{ inputs.worker_source_sha }}", "$REQUESTED_WORKER_SOURCE_SHA")
      .replaceAll("${{ inputs.tools_sha }}", "$REQUESTED_TOOLS_SHA");
    const env = { ...entry.env, ...job.env, REQUESTED_PHASE: "preflight", REQUESTED_APPLICATION_SHA: candidate, REQUESTED_WORKER_SOURCE_SHA: base, REQUESTED_TOOLS_SHA: candidate };
    if (name === "production_public_verify") {
      assert.equal(run(shell, env).status, 0, "public verification uses current Captain ancestry");
      const release = JSON.parse(fs.readFileSync("data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json", "utf8"));
      assert.throws(() => requireProductionPhaseAuthorization(release, "public_verify"), /not_authorized/,
        "Captain ancestry cannot grant Production authorization");
      continue;
    }
    const refuseRelease = script => assert.notEqual(run(script, env).status, 0, `${name}: release-only candidate gains no production authority`);
    refuseRelease(shell);
    assert.throws(() => refuseRelease(shell.replaceAll("$CANONICAL_INTEGRATION_BRANCH", "captain-release")), assert.AssertionError);
  }
  if (!previewOnly) {
  const pubShell = publication.jobs.publish.steps.find(s => s.id === "containment").run;
  const pubEnv = { ...publication.env, WORKER_BUILD_SHA: candidate };
  assert.equal(run(pubShell, pubEnv).status, 0, "release-contained publication passes");
  assert.equal(run(pubShell, { ...pubEnv, WORKER_BUILD_SHA: base }).status, 0, "main-contained publication passes");
  const refuseOutside = script => assert.notEqual(run(script, { ...pubEnv, WORKER_BUILD_SHA: outside }).status, 0, "arbitrary publication fails");
  refuseOutside(pubShell);
  assert.throws(() => refuseOutside(pubShell.replace(/git merge-base --is-ancestor[^;]+/g, "true")), assert.AssertionError);
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(previewOnly ? "PASS Preview candidate containment: actual hosted canonical and PR shells; all other phases, missing/stale/raced/wrong-base refs and guard mutations refused." : "PASS release containment: three actual acceptance shells, publication main/release, outsider/missing SHA denial, stale-branch reproduction, scope and bypass mutations.");
