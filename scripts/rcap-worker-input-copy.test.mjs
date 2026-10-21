import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { createWorkerInputPlan } from "./rcap-hosted-acceptance-worker-input-plan.mjs";

test("image reuse follows committed Docker COPY data and executable inputs", (t) => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-image-inputs-"));
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const write = (name, value) => {
    fs.mkdirSync(path.dirname(path.join(rootDir, name)), { recursive: true });
    fs.writeFileSync(path.join(rootDir, name), value);
  };
  const files = {
    "package.json": "{}", "package-lock.json": "{}", "tsconfig.json": "{}",
    "scripts/rcap-render-worker.mjs": "export {};", "scripts/lib/loader.mjs": "export {};", "src/worker.ts": "export {};",
    "data/runtime/authority.json": "{}", "data/specifications/a.json": "{}",
    "deploy/rcap-render-worker/runtime-data-manifest.json": "{}",
    "deploy/rcap-render-worker/preflight.mjs": "export {};",
    "deploy/rcap-render-worker/Dockerfile.dockerignore": "private/\n",
    "deploy/rcap-render-worker/Dockerfile": [
      "FROM node:22-slim AS deps", "COPY package.json package-lock.json ./",
      "FROM node:22-slim", "COPY --from=deps /app/node_modules ./node_modules",
      "COPY src/ src/", "COPY data/runtime/authority.json data/runtime/",
      "COPY data/specifications/ data/specifications/",
      "COPY deploy/rcap-render-worker/runtime-data-manifest.json \\",
      "     deploy/rcap-render-worker/preflight.mjs deploy/rcap-render-worker/"
    ].join("\n")
  };
  git("init", "--quiet");
  git("config", "user.email", "synthetic-test@example.invalid");
  git("config", "user.name", "Synthetic image input test");
  for (const [name, value] of Object.entries(files)) write(name, value);
  git("add", "--", ...Object.keys(files));
  git("commit", "--quiet", "-m", "synthetic accepted source");
  const acceptedSourceSha = git("rev-parse", "HEAD");
  const plan = () => createWorkerInputPlan({ rootDir, acceptedSourceSha, acceptedDigest: `sha256:${"a".repeat(64)}`, candidateSha: git("rev-parse", "HEAD") });
  const initial = plan();
  assert.equal(initial.rebuildRequired, false);
  assert(initial.canonicalInputs.includes("data/specifications"));
  assert(initial.canonicalInputs.includes("deploy/rcap-render-worker/preflight.mjs"));
  assert(!initial.canonicalInputs.includes("/app/node_modules"));

  write("data/review/unrelated.json", "review evidence only");
  git("add", "--", "data/review/unrelated.json");
  git("commit", "--quiet", "-m", "synthetic unrelated review");
  assert.equal(plan().rebuildRequired, false);
  assert.equal(plan().aggregateInputSha256, initial.aggregateInputSha256);

  const changed = [
    "data/runtime/authority.json", "data/specifications/new.json",
    "deploy/rcap-render-worker/runtime-data-manifest.json", "deploy/rcap-render-worker/preflight.mjs",
    "deploy/rcap-render-worker/Dockerfile.dockerignore"
  ];
  for (const name of changed) {
    write(name, "changed copied input");
    git("add", "--", name);
    git("commit", "--quiet", "-m", `synthetic change ${name}`);
    const current = plan();
    assert.equal(current.rebuildRequired, true);
    assert(current.changedPaths.includes(name), `${name} must require publication`);
    assert.notEqual(current.aggregateInputSha256, initial.aggregateInputSha256);
    assert.equal(current.image.digest, "pending");
  }

  write("deploy/rcap-render-worker/Dockerfile", "FROM node:22-slim\nCOPY data/*.json data/\n");
  git("add", "--", "deploy/rcap-render-worker/Dockerfile");
  git("commit", "--quiet", "-m", "synthetic unsupported COPY");
  assert.throws(plan, /unsupported Dockerfile COPY source/);
});
