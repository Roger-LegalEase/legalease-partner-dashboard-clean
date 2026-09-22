#!/usr/bin/env node
// §4E: the one worker-equivalence contract must fail for every canonical input,
// including inputs that exist only because the Dockerfile COPYs them, and must
// offer no way to exempt a path from the comparison.
//
// Every mutation is applied inside a temporary Git fixture. Nothing in this
// repository is written, and the suite asserts that for itself: the real
// working tree's porcelain status is captured before the first mutation and
// compared again at the end, including after a simulated kill. That assertion
// exists because an interrupted mutation harness was found to have left a
// security-weakening edit (a dropped `revoke all ... from anon`) in a tracked
// file, where it could have been committed by the next person to stage broadly.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { workerInputEquivalence } from "./verify-rcap-worker-input-equivalence.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const porcelain = () => execFileSync("git", ["status", "--porcelain=v1", "-uall"], { cwd: repo, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const beforePorcelain = porcelain();

const root = fs.mkdtempSync(path.join(os.tmpdir(), "worker-input-equivalence-"));
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const write = (rel, body) => {
  fs.mkdirSync(path.join(root, path.dirname(rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), body);
};

// One input outside every fixed canonical root, reachable ONLY through a
// Dockerfile COPY line. §4D: the control must follow the resolver here.
const COPY_DERIVED = "data/rcap-fixture-runtime/extra-runtime-input.json";
const DOCKERFILE = [
  "FROM node:22-slim AS deps",
  "COPY package.json package-lock.json ./",
  "FROM node:22-slim",
  "COPY package.json tsconfig.json ./",
  "COPY scripts/rcap-render-worker.mjs scripts/",
  "COPY scripts/lib/ scripts/lib/",
  "COPY src/ src/",
  "COPY data/record-clearing/supplemental-guides/ data/record-clearing/supplemental-guides/",
  "COPY data/record-clearing/brand/legalease-logo.png data/record-clearing/brand/",
  `COPY ${COPY_DERIVED} ${path.dirname(COPY_DERIVED)}/`,
  ""
].join("\n");

let passed = 0;
try {
  git("init", "-b", "main");
  git("config", "user.email", "fixture@example.invalid");
  git("config", "user.name", "Worker input fixture");

  write("package.json", '{"name":"fixture","private":true}\n');
  write("package-lock.json", '{"lockfileVersion":3}\n');
  write("tsconfig.json", '{"compilerOptions":{}}\n');
  write("scripts/rcap-render-worker.mjs", "// fixture worker\n");
  write("scripts/lib/helper.mjs", "export const helper = 1;\n");
  write("src/app/page.tsx", "export default function Page() { return null; }\n");
  write("src/lib/clinic-mode/result-follow-up.ts", "export const followUp = 1;\n");
  write("deploy/rcap-render-worker/Dockerfile", DOCKERFILE);
  write("deploy/rcap-render-worker/Dockerfile.dockerignore", "node_modules\n");
  write("data/record-clearing/supplemental-guides/guide.json", '{"guide":1}\n');
  write("data/record-clearing/brand/legalease-logo.png", "fixture-logo-bytes");
  write(COPY_DERIVED, '{"runtime":1}\n');
  write("docs/not-an-input.md", "tooling only\n");
  git("add", "-f", ".");
  git("commit", "-q", "-m", "accepted worker source");
  const base = git("rev-parse", "HEAD");

  // Green baseline: a commit that touches nothing the image copies.
  write("docs/not-an-input.md", "tooling only, revised\n");
  git("add", "-f", "docs/not-an-input.md");
  git("commit", "-q", "-m", "tooling-only change");
  const toolingOnly = git("rev-parse", "HEAD");
  const baseline = workerInputEquivalence(root, base, toolingOnly);
  assert.equal(baseline.equivalent, true, `baseline must be green: ${baseline.changedPaths.join(", ")}`);
  assert.deepEqual(baseline.changedPaths, []);
  assert.ok(baseline.comparedInputs.includes(COPY_DERIVED),
    "the COPY-derived input must be in the closure without being named in the fixed roots");
  console.log(`PASS baseline: green, ${baseline.comparedInputs.length} canonical inputs compared`);
  passed += 1;

  // §4E 1-11.
  const mutations = [
    ["package.json", "package.json", '{"name":"fixture","private":true,"version":"9.9.9"}\n'],
    ["package-lock.json", "package-lock.json", '{"lockfileVersion":3,"name":"moved"}\n'],
    ["tsconfig.json", "tsconfig.json", '{"compilerOptions":{"strict":true}}\n'],
    ["scripts/rcap-render-worker.mjs", "scripts/rcap-render-worker.mjs", "// fixture worker, changed\n"],
    ["anything under scripts/lib", "scripts/lib/helper.mjs", "export const helper = 2;\n"],
    ["anything under src", "src/app/page.tsx", "export default function Page() { return 1; }\n"],
    ["deploy/rcap-render-worker/Dockerfile", "deploy/rcap-render-worker/Dockerfile", DOCKERFILE + "ENV FIXTURE=1\n"],
    ["deploy/rcap-render-worker/Dockerfile.dockerignore", "deploy/rcap-render-worker/Dockerfile.dockerignore", "node_modules\n*.log\n"],
    ["data/record-clearing/supplemental-guides", "data/record-clearing/supplemental-guides/guide.json", '{"guide":2}\n'],
    ["data/record-clearing/brand/legalease-logo.png", "data/record-clearing/brand/legalease-logo.png", "fixture-logo-bytes-changed"],
    ["a Docker COPY-derived input outside the fixed roots", COPY_DERIVED, '{"runtime":2}\n'],
    // The exemption that the hosted workflow used to carry.
    ["src/lib/clinic-mode/result-follow-up.ts", "src/lib/clinic-mode/result-follow-up.ts", "export const followUp = 2;\n"]
  ];

  for (const [name, rel, body] of mutations) {
    git("reset", "-q", "--hard", toolingOnly);
    git("clean", "-qfd");
    const before = fs.readFileSync(path.join(root, rel), "utf8");
    write(rel, body);
    assert.notEqual(fs.readFileSync(path.join(root, rel), "utf8"), before, `${name}: the mutation must actually apply`);
    git("add", "-f", rel);
    git("commit", "-q", "-m", `mutate ${rel}`);
    const head = git("rev-parse", "HEAD");

    const result = workerInputEquivalence(root, base, head);
    assert.equal(result.equivalent, false, `${name}: a changed canonical input must refuse reuse`);
    assert.ok(result.changedPaths.some(p => p === rel || rel.startsWith(p.replace(/\/$/, "") + "/") || p === path.dirname(rel)),
      `${name}: ${rel} must appear in changedPaths, got ${result.changedPaths.join(", ")}`);
    assert.notEqual(result.aggregateInputSha256, baseline.aggregateInputSha256,
      `${name}: the aggregate fingerprint must move`);

    // The CLI must refuse too, with a nonzero exit -- a workflow reads the code.
    const cli = spawnSync(process.execPath, [
      path.join(repo, "scripts/verify-rcap-worker-input-equivalence.mjs"),
      "--root", root, "--base", base, "--head", head
    ], { encoding: "utf8" });
    assert.equal(cli.status, 1, `${name}: the CLI must exit 1, got ${cli.status}: ${cli.stderr}`);
    assert.match(cli.stderr, /may not be reused/);
    console.log(`PASS mutation: ${name}`);
    passed += 1;
  }

  // Negative control: no exclusion may hide a changed canonical input.
  git("reset", "-q", "--hard", toolingOnly);
  git("clean", "-qfd");
  write("src/lib/clinic-mode/result-follow-up.ts", "export const followUp = 3;\n");
  git("add", "-f", "src/lib/clinic-mode/result-follow-up.ts");
  git("commit", "-q", "-m", "mutate the formerly exempted path");
  const exempted = git("rev-parse", "HEAD");

  // A pathspec exclusion in a hand-written git diff DOES hide it. This is the
  // behaviour the hosted workflow relied on, reproduced so the contrast is
  // measured rather than asserted.
  const hidden = spawnSync("git", ["diff", "--quiet", base, exempted, "--",
    "package.json", "package-lock.json", "tsconfig.json", "scripts/rcap-render-worker.mjs",
    "deploy/rcap-render-worker/Dockerfile", "scripts/lib", "src",
    ":(exclude)src/lib/clinic-mode/result-follow-up.ts"], { cwd: root });
  assert.equal(hidden.status, 0, "the old hand-written comparison must be shown to hide it");

  // The canonical resolver does not.
  const notHidden = workerInputEquivalence(root, base, exempted);
  assert.equal(notHidden.equivalent, false, "the canonical resolver must not be exemptable");
  // And there is no argument that makes it so: unknown flags change nothing.
  for (const extra of [["--exclude", "src"], ["--exclude-path", "src/lib/clinic-mode/result-follow-up.ts"], ["--paths", "package.json"]]) {
    const cli = spawnSync(process.execPath, [
      path.join(repo, "scripts/verify-rcap-worker-input-equivalence.mjs"),
      "--root", root, "--base", base, "--head", exempted, ...extra
    ], { encoding: "utf8" });
    assert.equal(cli.status, 1, `${extra[0]} must not be able to exempt a canonical input`);
  }
  console.log("PASS negative control: a pathspec exclusion hides it; the canonical resolver refuses, and no flag exempts it");
  passed += 1;

  // No ACTIVE preproduction or hosted job may decide worker equivalence with a
  // hand-written path list. Production jobs are deliberately excluded: they are
  // isolated from captain-release by CANONICAL_INTEGRATION_BRANCH and are not
  // part of the release path being frozen. That boundary is asserted rather
  // than assumed, so a production gate cannot quietly become a hosted one.
  const { parse } = (await import("yaml")).default ?? await import("yaml");
  const handWrittenWorkerDecisions = (doc) => {
    const found = [];
    for (const [job, spec] of Object.entries(doc.jobs ?? {})) {
      for (const step of spec.steps ?? []) {
        for (const line of (step.run ?? "").split("\n")) {
          if (!/git diff --quiet/.test(line)) continue;
          if (!/worker_source_sha|rcap-render-worker\.mjs/.test(line)) continue;
          found.push({ job, line: line.trim() });
        }
      }
    }
    return found;
  };
  const hosted = fs.readFileSync(path.join(repo, ".github/workflows/rcap-hosted-acceptance-staging.yml"), "utf8");
  const f1 = fs.readFileSync(path.join(repo, ".github/workflows/rcap-f1-ephemeral-staging.yml"), "utf8");
  for (const [name, src] of [["hosted", hosted], ["f1", f1]]) {
    const all = handWrittenWorkerDecisions(parse(src));
    const active = all.filter(d => !d.job.startsWith("production_"));
    assert.deepEqual(active, [],
      `${name}: an active job decides worker equivalence with a hand-written git diff:\n${active.map(d => `${d.job}: ${d.line}`).join("\n")}`);
    assert.match(src, /verify-rcap-worker-input-equivalence\.mjs/,
      `${name}: the canonical equivalence control must be invoked`);
    for (const d of all) {
      assert.ok(d.job.startsWith("production_"),
        `${name}: ${d.job} is not a production job and must not carry a hand-written worker comparison`);
    }
  }
  // The exemption must be gone from the executed shell. It is still named in a
  // comment there, explaining why it was removed, so this looks at executable
  // lines only rather than at the file text.
  const executableLines = (doc) => Object.values(doc.jobs ?? {})
    .flatMap(spec => spec.steps ?? [])
    .flatMap(step => (step.run ?? "").split("\n"))
    .filter(line => !line.trim().startsWith("#"));
  for (const [name, src] of [["hosted", hosted], ["f1", f1]]) {
    const exempting = executableLines(parse(src)).filter(line => /:\(exclude\)/.test(line));
    assert.deepEqual(exempting, [],
      `${name}: an executed shell still exempts a path from a comparison:\n${exempting.join("\n")}`);
  }
  // The known, deliberately out-of-scope remainder, named so it is not lost.
  const productionRemainder = handWrittenWorkerDecisions(parse(f1)).filter(d => d.job.startsWith("production_"));
  assert.equal(productionRemainder.length, 1,
    `the production remainder changed; re-read the scope decision before editing: ${JSON.stringify(productionRemainder)}`);
  assert.equal(productionRemainder[0].job, "production_public_verify");
  console.log("PASS: the active hosted and F1 worker decisions consume the canonical control");
  console.log(`      (1 hand-written comparison remains in production_public_verify, out of scope by instruction)`);
  passed += 1;

  // Interruption safety: a killed child that was mutating a fixture must leave
  // this repository untouched.
  const victim = path.join(root, "src/app/page.tsx");
  const child = spawnSync(process.execPath, ["-e", `
    const fs = require("node:fs");
    fs.writeFileSync(${JSON.stringify(victim)}, "export default function Page() { return 2; }\\n");
    process.kill(process.pid, "SIGKILL");
  `], { encoding: "utf8" });
  assert.notEqual(child.status, 0, "the interruption simulation must not exit cleanly");
  assert.equal(porcelain(), beforePorcelain, "a killed mutation child changed this repository");
  console.log("PASS: a killed mutation child left this repository byte-identical");
  passed += 1;
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

// The assertion the interrupted Phase 54 run would have failed.
assert.equal(porcelain(), beforePorcelain,
  "this suite changed tracked or untracked files in the real working tree");
console.log(`PASS worker-input equivalence: ${passed}/${passed} checks; real working tree byte-identical`);
