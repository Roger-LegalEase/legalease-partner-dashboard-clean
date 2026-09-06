#!/usr/bin/env node
// Test an already-built image. Application/worker/registry bytes are never
// mounted from the host. Test helpers and SQL are read-only external mounts.
// PostgreSQL and Poppler are installed only in a disposable writable container
// layer; that layer is never committed, tagged or published as an image.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const image = process.argv[2] ?? "rcap-render-worker:codex-image-01";
const out = path.resolve(process.argv[3] ?? fs.mkdtempSync(path.join(os.tmpdir(), "rcap-image-test-")));
fs.mkdirSync(out, { recursive: true });
const name = `rcap-image-test-${process.pid}`;
const results = [];
function run(id, args, expected = 0) {
  console.log(`${id}: docker ${args.join(" ")}`);
  const result = spawnSync("docker", args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  fs.writeFileSync(path.join(out, `${id}.log`), output);
  results.push({ id, command: ["docker", ...args], exitCode: result.status, expectedExitCode: expected, signal: result.signal, outputTail: output.slice(-3000) });
  fs.writeFileSync(path.join(out, "commands.json"), JSON.stringify(results, null, 2) + "\n");
  console.log(`${id}: exit ${result.status}`);
  assert.equal(result.status, expected, `${id}: ${output.slice(-5000)}`);
  return output;
}
const inspected = JSON.parse(run("image-inspect", ["image", "inspect", image]))[0];
fs.writeFileSync(path.join(out, "image-identity.json"), JSON.stringify({ imageId: inspected.Id, repoDigests: inspected.RepoDigests, rootfs: inspected.RootFS, sizeBytes: inspected.Size }, null, 2) + "\n");
const baseRun = ["run", "--rm", "--cpus=1", "--network", "none", image];
run("preflight", [...baseRun, "node", "deploy/rcap-render-worker/preflight.mjs", "--stage=preflight"]);
run("authority", [...baseRun, "node", "deploy/rcap-render-worker/preflight.mjs", "--stage=authority"]);
run("default-preflight", [...baseRun, "node", "deploy/rcap-render-worker/preflight.mjs"]);
run("unconfigured-entrypoint", [...baseRun, "node", "scripts/rcap-render-worker.mjs", "--once"], 2);
run("harness-excluded", [...baseRun, "node", "--input-type=module", "-e", "import fs from 'node:fs'; const bad=fs.readdirSync('scripts/lib').filter(f=>/-test-|rcap-ephemeral-pg|rcap-onboarding-artifact-fixture/.test(f)); if(bad.length || fs.existsSync('scripts/test-rcap-il-authority-fixture.mjs')) throw new Error('test harness packaged: '+bad); console.log('No test authority, transport doubles or PostgreSQL test harness packaged');"]);

const mounts = [
  "scripts/test-rcap-il-personalization.mjs",
  "scripts/test-rcap-il-authority-fixture.mjs",
  "scripts/test-rcap-il-delivery-loader.mjs",
  "scripts/test-rcap-il-delivery-boundaries.mjs",
  "scripts/lib/rcap-ephemeral-pg.mjs",
  "scripts/lib/consumer-payment-test-loader.mjs",
  "scripts/lib/consumer-payment-test-doubles.mjs",
  "supabase"
];
const inventoryProgram = `import fs from 'node:fs'; import crypto from 'node:crypto'; import path from 'node:path';
const excluded=new Set(${JSON.stringify(mounts)}); const files=[];
function walk(rel){if(excluded.has(rel))return;for(const name of fs.readdirSync(rel).sort()){const p=path.posix.join(rel,name);if(excluded.has(p))continue;const stat=fs.lstatSync(p);if(stat.isDirectory())walk(p);else if(stat.isFile())files.push([p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]);}}
for(const dir of ['src','scripts','data','deploy'])walk(dir);
for(const file of ['package.json','tsconfig.json'])files.push([file,crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]);
files.sort((a,b)=>a[0].localeCompare(b[0])); console.log(JSON.stringify({fileCount:files.length,sha256:crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex')}));`;
const packagedInventory = JSON.parse(run("packaged-inventory", [...baseRun, "node", "--input-type=module", "-e", inventoryProgram]));
const mountArgs = mounts.flatMap((relative) => ["--mount", `type=bind,src=${path.join(root, relative)},dst=/app/${relative},readonly`]);
let created = false;
try {
  run("container-create", ["create", "--name", name, "--cpus=1", ...mountArgs, image, "sleep", "infinity"]);
  created = true;
  run("container-start", ["start", name]);
  run("test-utilities-install", ["exec", "--user", "root", name, "sh", "-c", "printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d && chmod +x /usr/sbin/policy-rc.d && apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends postgresql poppler-utils && rm -rf /var/lib/apt/lists/*"]);
  run("disconnect-network", ["network", "disconnect", "bridge", name]);
  const container = JSON.parse(run("container-inspect", ["inspect", name]))[0];
  assert.deepEqual(container.NetworkSettings.Networks, {});
  assert.equal(container.Image, inspected.Id);
  assert.equal(container.HostConfig.NanoCpus, 1e9);
  assert(container.Mounts.every((mount) => mount.Type === "bind" && mount.RW === false));
  run("test-utility-versions", ["exec", name, "sh", "-c", "node --version && psql --version && pdftotext -v"]);
  run("packaged-preflight-after-install", ["exec", name, "node", "deploy/rcap-render-worker/preflight.mjs"]);
  for (const [id, args] of [["render", []], ["render-failure", ["--verify-fail-closed"]]]) {
    const output = run(id, ["exec", name, "node", "scripts/test-rcap-il-personalization.mjs", ...args]);
    const artifactRoot = /Synthetic artifacts: (\/tmp\/il-personalization-[A-Za-z0-9]+)/.exec(output)?.[1];
    assert(artifactRoot, `${id}: no completed artifact evidence path`);
    run(`${id}-evidence-copy`, ["cp", `${name}:${artifactRoot}`, path.join(out, `${id}-artifacts`)]);
  }
  run("container-diff", ["diff", name]);
  const testedInventory = JSON.parse(run("tested-inventory", ["exec", name, "node", "--input-type=module", "-e", inventoryProgram]));
  assert.deepEqual(testedInventory, packagedInventory, "test utilities or harness modified packaged application bytes");
  console.log(`Image acceptance completed. Evidence: ${out}`);
} finally {
  if (created) run("container-remove", ["rm", "-f", name]);
}
