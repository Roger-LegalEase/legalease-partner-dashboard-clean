#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { probeRasterizer } from "./raster/pdf-page-raster.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const runResolver = (env) => spawnSync(process.execPath, ["--input-type=module", "-e",
  'import {resolveChromium} from "./scripts/raster/pdf-page-raster.mjs"; const r=resolveChromium(); console.log(JSON.stringify(r)); process.exit(r.executablePath?0:1)'
], { cwd: ROOT, encoding: "utf8", env: { ...process.env, ...env, RCAP_BROWSER_RESOLVER_TEST_ONLY: "1" } });

const runtime = await probeRasterizer();
assert.equal(runtime.ok, true, runtime.why);
assert.equal(runtime.syntheticPdfCreated, true);
assert.equal(runtime.pngWritten, true);
assert.ok(runtime.paper.width > 0 && runtime.paper.height > 0);
assert.ok(runtime.calibrationResidualPx <= 1.5);

const empty = fs.mkdtempSync(path.join(os.tmpdir(), "env-ras01-empty-"));
const nonExecutable = path.join(empty, "chromium");
fs.writeFileSync(nonExecutable, "not executable");
try {
  assert.notEqual(runResolver({ RCAP_CHROMIUM_PATH: "", PLAYWRIGHT_BROWSERS_PATH: empty }).status, 0, "no browser must fail");
  assert.notEqual(runResolver({ RCAP_CHROMIUM_PATH: path.join(empty, "missing"), PLAYWRIGHT_BROWSERS_PATH: empty }).status, 0, "missing configured path must fail");
  assert.notEqual(runResolver({ RCAP_CHROMIUM_PATH: nonExecutable, PLAYWRIGHT_BROWSERS_PATH: empty }).status, 0, "non-executable configured path must fail");
} finally { fs.rmSync(empty, { recursive: true, force: true }); }

const launchFailure = spawnSync(process.execPath, ["--input-type=module", "-e",
  'import {probeRasterizer} from "./scripts/raster/pdf-page-raster.mjs"; const r=await probeRasterizer(); console.log(JSON.stringify(r)); process.exit(r.ok?0:1)'
], { cwd: ROOT, encoding: "utf8", env: { ...process.env, RCAP_CHROMIUM_PATH: "/bin/false", PLAYWRIGHT_BROWSERS_PATH: "/does-not-exist", RCAP_BROWSER_RESOLVER_TEST_ONLY: "1" } });
assert.notEqual(launchFailure.status, 0, "Chromium launch failure must fail acceptance");

const rasterFailure = spawnSync(process.execPath, ["--input-type=module", "-e",
  'import {probeRasterizer} from "./scripts/raster/pdf-page-raster.mjs"; const r=await probeRasterizer(); console.log(JSON.stringify(r)); process.exit(r.ok?0:1)'
], { cwd: ROOT, encoding: "utf8", env: { ...process.env, RCAP_RASTER_TEST_FORCE_FAILURE: "1" }, timeout: 120000 });
assert.notEqual(rasterFailure.status, 0, "post-launch PDF raster failure must fail acceptance");

for (const name of ["PLAYWRIGHT_BROWSERS_PATH", "RCAP_CHROMIUM_PATH"]) {
  assert.ok(process.env[name], `${name} must be exported`);
  for (const file of ["private/source-corpus-environment.txt", path.join(os.homedir(), ".legalease-corpus-env")]) {
    assert.match(fs.readFileSync(path.isAbsolute(file) ? file : path.join(ROOT, file), "utf8"), new RegExp(`^export ${name}=`, "m"));
  }
}

const promptFiles = execFileSync("find", ["docs/rcap/grade-a", "-type", "f", "-name", "*.md"], { cwd: ROOT, encoding: "utf8" }).trim().split("\n").filter(Boolean);
for (const file of promptFiles) assert.doesNotMatch(read(file), /PACKET_BUILD_ENVIRONMENT_READY:?\s*\d+\/\d+/, `${file} hardcodes a denominator`);

const setup = read("scripts/codex-cloud/setup-packet-factory.sh");
assert.doesNotMatch(setup, /^\s*(?:sudo\s+)?(?:apt-get|pdftoppm)\b/m, "setup must not invoke apt-get or pdftoppm");
for (const file of promptFiles) assert.doesNotMatch(read(file), /^\s*(?:sudo\s+)?(?:apt-get|pdftoppm)\b/m, `${file} attempts a forbidden worker command`);

const workflow = read(".github/workflows/codex-cloud-packet-runtime.yml");
for (const trigger of ["scripts/codex-cloud/**", "scripts/raster/pdf-page-raster.mjs", "scripts/verify-packet-build-environment.mjs", "package.json", "package-lock.json", "docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md"]) assert.ok(workflow.includes(trigger), `workflow omits ${trigger}`);
assert.match(workflow, /test-codex-cloud-packet-runtime\.mjs/, "workflow omits runtime acceptance");

console.log(`CODEX_CLOUD_PACKET_RUNTIME_ACCEPTED chromium=${runtime.executablePath} paper=${runtime.paper.width}x${runtime.paper.height} residual=${runtime.calibrationResidualPx}px`);
console.log("NEGATIVE_CONTROLS_PASS: 9/9");
