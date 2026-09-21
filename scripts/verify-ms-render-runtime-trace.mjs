#!/usr/bin/env node

// Run with: node scripts/verify-ms-render-runtime-trace.mjs
// Always build: an old .next trace is not evidence for the current config.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";

const require = createRequire(import.meta.url);
const picomatch = require("next/dist/compiled/picomatch");
const root = fileURLToPath(new URL("../", import.meta.url));
const route = "/api/expungement-ai/packet/render";
// Independent expectations: never derive the denominator from the generated trace.
// Historical Turbopack already traced these files without explicit includes.
const factoryInputs = [
  "data/record-clearing/factory-v2-route-registry.json",
  "data/record-clearing/legal-design-packet-set-manifests.json",
];
const successorInputs = [
  "data/record-clearing/legal-decisions/2026-09-20-ms-nonconv-paid-consumer-successor-v3.json",
  "data/record-clearing/legal-decisions/2026-09-20-ms-nonconv-paid-consumer-successor-v2.json",
  "data/record-clearing/legal-decisions/2026-09-14-ms-nonconv-paid-consumer-successor.json",
  "data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json",
  "data/record-clearing/supplemental-guides/MS-nonconviction-expungement-99-19-71-4.v1.json",
  "data/rcap-ledger/grade-a/ms-nonconviction-successor-review.evidence.json",
  "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.artifacts.json",
  "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-delivery.raster-review.json",
  "data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-full-en.pdf",
  "data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-full-es.pdf",
  "data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-court-only.pdf",
];
const expected = [...factoryInputs, ...successorInputs];
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

function assertNaturalTracing(includes) {
  for (const [pattern, files] of Object.entries(includes ?? {})) {
    assert.ok(!picomatch(pattern)(route) || files.length === 0,
      `render closure must be naturally traced, without explicit includes: ${pattern}`);
  }
}

function assertClosure(trace, tracePath) {
  assert.ok(Array.isArray(trace.files), "render trace must contain a files array");
  const files = new Set(trace.files.map((file) => path.resolve(path.dirname(tracePath), file)));
  for (const file of expected) {
    assert.ok(files.has(path.join(root, file)), `missing runtime input: ${file}`);
    assert.ok(fs.statSync(path.join(root, file)).isFile(), `runtime input is not a file: ${file}`);
  }
}

const build = spawn("npm", ["run", "build"], { cwd: root, stdio: ["ignore", "pipe", "inherit"] });
let turbopackBanner = "";
let output = "";
build.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  output += chunk.toString();
});
const status = await new Promise((resolve, reject) => {
  build.on("error", reject);
  build.on("close", resolve);
});
assert.equal(status, 0, "Next.js build failed");
turbopackBanner = output.split("\n").find((line) => /Next\.js .*\(Turbopack\)/.test(line));
assert.ok(turbopackBanner, "build must prove it used Turbopack, not webpack");
const config = readJson(".next/required-server-files.json").config;
assertNaturalTracing(config.outputFileTracingIncludes);
const tracePath = path.join(root, ".next/server/app/api/expungement-ai/packet/render/route.js.nft.json");
const trace = JSON.parse(fs.readFileSync(tracePath, "utf8"));
assertClosure(trace, tracePath);
console.log(`PASS: ${turbopackBanner.trim()} naturally traces all ${expected.length} runtime inputs`);

// Delete each dependency from a separate in-memory copy of the REAL build trace.
// The same closure assertion must reject every deletion for that exact reason.
// Neither repository evidence nor the generated trace is mutated on disk.
for (const file of expected) {
  const mutant = { ...trace, files: trace.files.filter((entry) =>
    path.resolve(path.dirname(tracePath), entry) !== path.join(root, file)) };
  assert.throws(() => assertClosure(mutant, tracePath),
    (error) => error.code === "ERR_ASSERTION" && error.message === `missing runtime input: ${file}`,
    `verifier accepted a trace missing ${file}`);
}
console.log(`PASS: ${expected.length}/${expected.length} individual trace-deletion mutations rejected`);
for (const pattern of [route, "/api/expungement-ai/packet/*", "/**/*"]) {
  assert.throws(() => assertNaturalTracing({ [pattern]: [successorInputs[0]] }),
    /render closure must be naturally traced/);
}
console.log("PASS: exact-route and wildcard explicit-include mutations rejected");
