// Real resolver/transport admission with actual workflow env; all HTTP is blocked.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const { parse } = createRequire(import.meta.url)("yaml");
const fixtureArg = process.argv.indexOf("--fixture-root");
const fixtureRoot = fixtureArg < 0 ? process.cwd() : path.resolve(process.argv[fixtureArg + 1]);
const negativeOnly = process.argv.includes("--negative-only");
const git = args => execFileSync("git", args, { cwd: fixtureRoot, encoding: "utf8", stdio: "pipe" }).trim();
const head = git(["rev-parse", "HEAD"]);
const before = git(["status", "--porcelain", "--untracked-files=all"]);
const candidate = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json")));
assert.equal(candidate.status, "FORWARD_BOUND_HOSTED_PENDING", "use an already-qualified HELD fixture");
assert.equal(candidate.productionAuthorized, false); assert.equal(candidate.productionAuthorization, null);
assert.equal(candidate.deploymentAuthorized, false);
const inputs = { phase: "replace_preview", application_sha: candidate.applicationSha, worker_source_sha: candidate.workerSourceSha,
  worker_digest: candidate.workerDigest, tools_sha: candidate.toolsSha, supabase_project_ref: "hyflxnlhpmiqxvvcoiia" };
const wf = parse(fs.readFileSync(".github/workflows/rcap-hosted-acceptance-staging.yml", "utf8"));
const steps = Object.values(wf.jobs).flatMap(job => job.steps ?? []);
const entryWorkflow = parse(fs.readFileSync(".github/workflows/rcap-f1-ephemeral-staging.yml", "utf8"));
const forbiddenPhases = ["payment", "production_activate", "production_worker_deploy"];
for (const phase of forbiddenPhases) assert.ok(entryWorkflow.on.workflow_dispatch.inputs.mode.options.includes(phase === "payment" ? "hosted_payment" : phase), phase);
const fields = { APPLICATION_SHA_INPUT: "application_sha", WORKER_SOURCE_SHA_INPUT: "worker_source_sha",
  WORKER_DIGEST_INPUT: "worker_digest", TOOLS_SHA_INPUT: "tools_sha" };
function callerEnv(id) {
  const step = steps.find(step => step.id === id); assert.ok(step, id);
  assert.equal(step.env.GITHUB_SHA, undefined, "workflow SHA remains the runner-provided commit");
  const env = {};
  for (const name of ["PHASE_INPUT", ...Object.keys(fields), "HOSTED_APPLICATION_SHA", "ACCEPTANCE_SUPABASE_PROJECT_REF"]) {
    if (!Object.hasOwn(step.env, name)) continue;
    const match = step.env[name].match(/^\$\{\{ inputs\.([a-z_]+) \}\}$/);
    assert.ok(match, id + ": exact input expression for " + name); env[name] = inputs[match[1]];
  }
  return env;
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-preview-entry-"));
let checked = 0;
try {
  const entry = pathToFileURL(path.join(fixtureRoot, "scripts/rcap-hosted-resolve-preview.mjs")).href;
  const code = `globalThis.fetch = async (url, init = {}) => {
    if ((init.method ?? "GET") !== "GET") throw new Error("UNEXPECTED_MUTATING_FETCH");
    console.error("ENTRY_GET_BLOCKED_BEFORE_NETWORK"); throw new Error("ENTRY_GET_BLOCKED_BEFORE_NETWORK");
  }; await import(${JSON.stringify(entry)});`;
  const run = admission => spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    cwd: tmp, encoding: "utf8", timeout: 600000, maxBuffer: 1024 * 1024,
    env: { PATH: process.env.PATH, TMPDIR: tmp, GITHUB_SHA: head, VERCEL_TOKEN: "synthetic-not-a-real-token", ...admission }
  });
  const resolver = callerEnv("resolve_preview");
  if (!negativeOnly) {
    const result = run(resolver); assert.ifError(result.error);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /ENTRY_GET_BLOCKED_BEFORE_NETWORK/, result.stderr);
    assert.doesNotMatch(result.stderr, /exact Preview |INVALID_FORWARD_BINDING/);
    checked++;
  }
  for (const id of ["resolve_preview", "deploy_preview"]) {
    const env = callerEnv(id);
    assert.equal(env.PHASE_INPUT, "replace_preview", id);
    for (const [name, input] of Object.entries(fields)) assert.equal(env[name], inputs[input], id + ": " + name);
  }
  for (const [name, input] of Object.entries(fields)) for (const value of [undefined, "wrong"]) {
    const env = { ...resolver }; if (value === undefined) delete env[name]; else env[name] = value;
    const result = run(env); assert.ifError(result.error);
    assert.equal(result.status, 1); assert.match(result.stderr, new RegExp("exact Preview " + ({application_sha:"applicationSha",worker_source_sha:"workerSourceSha",worker_digest:"workerDigest",tools_sha:"toolsSha"})[input]));
    assert.doesNotMatch(result.stderr, /ENTRY_GET_BLOCKED_BEFORE_NETWORK/); checked++;
  }
  for (const phase of forbiddenPhases) {
    const wrongPhase = run({ ...resolver, PHASE_INPUT: phase }); assert.ifError(wrongPhase.error);
    assert.equal(wrongPhase.status, 1); assert.match(wrongPhase.stderr, /HELD permission is Preview creation only/);
    assert.doesNotMatch(wrongPhase.stderr, /ENTRY_GET_BLOCKED_BEFORE_NETWORK/); checked++;
  }
  assert.equal(git(["rev-parse", "HEAD"]), head); assert.equal(git(["status", "--porcelain", "--untracked-files=all"]), before, "fixture remains untouched");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(JSON.stringify({ status: "PASS", scope: negativeOnly ? "actual workflow env and eleven real-entry refusals; positive deferred to exact successor qualification" : "real resolver entry passes exact HELD gate then blocked GET; eleven real-entry refusals; deploy caller tuple complete", checked, actualHttpRequests: 0, fixtureHead: head }));
