#!/usr/bin/env node

// Run with: node scripts/verify-ms-render-runtime-trace.mjs
// Always build: an old .next trace is not evidence for the current config.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const picomatch = require("next/dist/compiled/picomatch");
const root = fileURLToPath(new URL("../", import.meta.url));
const route = "/api/expungement-ai/packet/render";
// Independent expectations: do not derive these from outputFileTracingIncludes,
// or deleting a required include could also delete the verifier's expectation.
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

function assertScopedIncludes(includes, routes) {
  assert.deepEqual(Object.keys(includes ?? {}), [route], "includes must target only the render route");
  assert.deepEqual([...includes[route]].sort(), successorInputs.map((file) => `./${file}`).sort(),
    "includes must contain exactly the eleven successor files, without subtree globs");
  const matchesRoute = picomatch(route);
  const matches = routes.filter((candidate) => matchesRoute(candidate));
  assert.deepEqual(matches, [route], "another built route receives the render includes");
}

function assertClosure(trace, tracePath) {
  assert.ok(Array.isArray(trace.files), "render trace must contain a files array");
  const files = new Set(trace.files.map((file) => path.resolve(path.dirname(tracePath), file)));
  for (const file of expected) {
    assert.ok(files.has(path.join(root, file)), `missing runtime input: ${file}`);
    assert.ok(fs.statSync(path.join(root, file)).isFile(), `runtime input is not a file: ${file}`);
  }
}

const build = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
assert.equal(build.error, undefined, "could not start Next.js build");
assert.equal(build.status, 0, `Next.js build failed (signal: ${build.signal ?? "none"})`);

// Check what Next actually emitted, including App Router and Pages Router paths.
const config = readJson(".next/required-server-files.json").config;
const routes = [...new Set([
  ...Object.values(readJson(".next/app-path-routes-manifest.json")),
  ...Object.keys(readJson(".next/server/pages-manifest.json")),
])].sort();
assert.ok(routes.includes(route), "render route was not built");
assertScopedIncludes(config.outputFileTracingIncludes, routes);
const tracePath = path.join(root, ".next/server/app/api/expungement-ai/packet/render/route.js.nft.json");
const trace = JSON.parse(fs.readFileSync(tracePath, "utf8"));
assertClosure(trace, tracePath);
console.log(`PASS: real Next.js render trace contains all ${expected.length} runtime inputs`);
console.log(`PASS: includes match only ${route} among ${routes.length} built routes`);

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
for (const otherRoute of ["/api/expungement-ai/packet/*", "/api/health"]) {
  const mutant = { ...config.outputFileTracingIncludes, [otherRoute]: config.outputFileTracingIncludes[route] };
  assert.throws(() => assertScopedIncludes(mutant, routes), /includes must target only the render route/);
}
console.log("PASS: wildcard and sibling-route include mutations rejected");
