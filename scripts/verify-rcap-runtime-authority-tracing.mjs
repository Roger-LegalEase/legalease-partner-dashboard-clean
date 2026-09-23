#!/usr/bin/env node
/*
 * All-consumer runtime-authority tracing proof.
 *
 * WHY THIS IS A SEPARATE CONTROL. verify-rcap-deployment-closure.mjs proves a
 * path survives `.vercelignore` pruning: the file is in the deployment INPUT.
 * That is not the same question as whether the serverless function that reads
 * the file receives it. Next traces each function's dependencies on its own,
 * and it cannot follow `path.join(root, …)` when the root is a parameter. So
 * the source tree can be complete, the closure control green, and the running
 * function still missing the bytes it needs. That is what happened: the
 * migrated route resolved factory_v2 from source and returned the ADR-0004
 * retirement refusal in the hosted runtime, because nine of the thirteen
 * authority files its loader reads were absent from the render function's
 * trace. A missing file and an absent successor are indistinguishable at the
 * participant boundary, and the loader is right to refuse both.
 *
 * WHY IT MEASURES EVERY CONSUMER. A first repair fixed the render route and
 * measured only the render route. Checkout and payment confirmation share the
 * same loader, received fewer of its inputs, and kept reading a null
 * successor -- render allowed, checkout held -- while the one-route verifier
 * reported green. This control therefore discovers the complete consumer set
 * from the import graph, locates every consumer's generated trace, holds each
 * to the reads of exactly the authority modules it reaches, and proves the
 * packaged behavior equals the source-tree behavior for that call chain. It
 * does not carry a hand-maintained route list that can drift.
 *
 * WHAT "PASS" MEANS HERE.
 *   - a FRESH `next build --webpack` succeeded in this run (no stale .next);
 *   - discovery completed and every consumer has an emitted trace;
 *   - the compiled config carries exactly the discovered keys, with
 *     omitted consumers = 0 and unintended matches = 0;
 *   - every consumer trace carries every real file its reachable authority
 *     modules read (missing = 0), with no review-tree file dragged in;
 *   - inside a packaged root built from nothing but the trace, the successor
 *     loader, route resolver, commercial authority and worker-static binding
 *     answer exactly as they do in the source tree, with no source escape;
 *   - removing one successor decision file from a representative consumer's
 *     packaged root brings the refusal back, restoring the exact bytes brings
 *     the authority back, and the un-migrated sibling stays refused throughout.
 *
 *   node scripts/verify-rcap-runtime-authority-tracing.mjs [--report <path>] [--baseline-traces <dir>] [--representative <route>]
 *   node scripts/verify-rcap-runtime-authority-tracing.mjs --reuse-build   # iteration only; never acceptance
 */
import fs from "node:fs";
import assert from "node:assert/strict";
import {independentConsumers, assertDenominators} from "./rcap-runtime-authority-independent.mjs";
import {executionIdentity} from "./rcap-runtime-authority-identity.mjs";
import {behaviorOf, probeConsumerAuthority} from "./rcap-runtime-authority-comparison.mjs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_ROOT_DIR, RUNTIME_AUTHORITY_INCLUDES, discoverRuntimeAuthorityConsumers, emittedAppRoutes,
  expandRuntimeAuthorityIncludes, measureKeyCoverage, tracingIncludesFor, tracingKeyMatches
} from "./rcap-runtime-authority-consumers.mjs";

const ROOT = DEFAULT_ROOT_DIR;
const PROBE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "rcap-runtime-authority-probe.mjs");
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const reuseBuild = args.includes("--reuse-build");
const reportPath = path.resolve(flag("--report") ?? path.join(ROOT, "tmp/rcap-runtime-authority-tracing/report.json"));
const baselineTraces = flag("--baseline-traces") ? path.resolve(flag("--baseline-traces")) : null;
const representativeRoute = flag("--representative") ?? "/api/expungement-ai/checkout";
const REVIEW_TREE = "data/rcap-ledger/grade-a/reviews/";
const REPRESENTATIVE_SURFACES = ["/api/expungement-ai/packet/render", "/api/expungement-ai/checkout", "/api/expungement-ai/payment/confirm", "/api/stripe/webhook", "/briefcase", "/api/legal-aid/intakes", "/clinic/[eventSlug]/intake", "/p/[partnerSlug]/continue"];

let checks = 0;
const failures = [];
const check = (label, ok, detail = "") => {
  checks += 1;
  const line = `${label}${detail ? ` — ${detail}` : ""}`;
  if (ok) console.log(`  ok   ${line}`); else { failures.push(line); console.log(`  FAIL ${line}`); }
  return ok;
};
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const report = { proofKind: "PACKAGED-DATA AUTHORITY PARITY", deploymentBuilderProof: "PENDING", verifier: "verify-rcap-runtime-authority-tracing", startedAt: new Date().toISOString(), rootDir: ROOT, acceptance: !reuseBuild };

console.log("runtime authority tracing — all consumers\n");

// Exact transfer gate and before/after content binding. No reconstruction.
const before = executionIdentity(ROOT);
for (const [flagName, field] of [['--expected-commit','candidateCommit'],['--expected-tree','treeSha'],['--expected-source','sourceIdentitySha256']]) {
  assert.ok(flag(flagName), `Required exact-transfer argument: ${flagName}`);
  assert.equal(before[field], flag(flagName), `Exact-transfer identity mismatch: ${field}`);
}
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=all','--',...before.coveredInputs],{cwd:ROOT,encoding:'utf8',maxBuffer:32*1024*1024}).trim(),'', 'Candidate input worktree must be clean');
const bundler = flag('--builder') ?? 'webpack';
assert.ok(['webpack','default'].includes(bundler), 'builder must be webpack or default');
const buildArgs = ['build', ...(bundler === 'webpack' ? ['--webpack'] : [])];
assert.equal(JSON.parse(fs.readFileSync(path.join(ROOT,"node_modules/next/package.json"))).version,"16.2.6","Matcher contract must be reviewed for a different Next version");
report.identity = {...before, nodeVersion:process.version, nextVersion:JSON.parse(fs.readFileSync(path.join(ROOT,'node_modules/next/package.json'))).version, command:['node_modules/next/dist/bin/next',...buildArgs].join(' ')};
report.identity.nextTraceCollectorSha256=sha256(fs.readFileSync(path.join(ROOT,"node_modules/next/dist/build/collect-build-traces.js")));
report.identity.typescriptVersion=JSON.parse(fs.readFileSync(path.join(ROOT,'node_modules/typescript/package.json'))).version;
const toolchainPaths=['next/dist/build/collect-build-traces.js','next/dist/compiled/picomatch/index.js','typescript/lib/typescript.js','next/dist/compiled/acorn/acorn.js'];
const toolchainIdentity=()=>Object.fromEntries(toolchainPaths.map(p=>[p,sha256(fs.readFileSync(path.join(ROOT,'node_modules',p)))]));
report.identity.toolchainFileHashes=toolchainIdentity();
const checkIdentity = phase => {
  assert.deepEqual(toolchainIdentity(),report.identity.toolchainFileHashes,`Toolchain bytes changed ${phase}`);
  const after=executionIdentity(ROOT);
  assert.equal(after.candidateCommit,before.candidateCommit,`Commit changed ${phase}`);
  assert.equal(after.treeSha,before.treeSha,`Tree changed ${phase}`);
  assert.equal(after.sourceIdentitySha256,before.sourceIdentitySha256,`Source changed ${phase}`);
};

// ---- 1. Fresh build -------------------------------------------------------
const distDir = path.join(ROOT, ".next");
if (reuseBuild) {
  console.log("  !!   --reuse-build: measuring an EXISTING .next. This run is for iteration and is NOT acceptance evidence.\n");
  report.build = { fresh: false, reused: true };
} else {
  fs.rmSync(distDir, { recursive: true, force: true });
  const started = Date.now();
  const nextBin = path.join(ROOT, "node_modules/next/dist/bin/next");
  const r = spawnSync(process.execPath, [nextBin, ...buildArgs], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }, maxBuffer: 256 * 1024 * 1024 });
  const seconds = Math.round((Date.now() - started) / 1000);
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(path.join(path.dirname(reportPath), "next-build.log"), output);
  report.build = { fresh: true, command: `${path.relative(ROOT, nextBin)} ${buildArgs.join(" ")}`, exitCode: r.status, signal: r.signal, seconds, startedAt: new Date(started).toISOString() };
  check(`fresh ${buildArgs.join(" ")} completed`, r.status === 0 && !r.signal, `exit=${r.status}${r.signal ? ` signal=${r.signal}` : ""} in ${seconds}s`);
  if (r.status !== 0 || r.signal) { console.error(output.split("\n").slice(-30).join("\n")); finish(); }
}
checkIdentity("after build / before trace acceptance");
const buildId = fs.existsSync(path.join(distDir, "BUILD_ID")) ? fs.readFileSync(path.join(distDir, "BUILD_ID"), "utf8").trim() : null;
const nextVersion = JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules/next/package.json"), "utf8")).version;
report.build = { ...report.build, buildId, nextVersion, distDir };
check("build output present", Boolean(buildId), `BUILD_ID=${buildId} next@${nextVersion}`);
if (!buildId) finish();

// ---- 2. Discovery + key coverage -----------------------------------------
const discovery = discoverRuntimeAuthorityConsumers({ rootDir: ROOT });
const independent = await independentConsumers(ROOT);
assertDenominators(discovery, independent);
const consumers = discovery.consumers;
report.independentDenominator = independent;
check('independent SWC/Acorn denominator equals TypeScript discovery', true, `${consumers.length} consumers; complete runtime closure equality`);
check("runtime consumer discovery completed", consumers.length > 0, `${discovery.entries.length} entrypoints, ${consumers.length} runtime consumers, compiler-erased imports excluded`);
const emitted = emittedAppRoutes({ rootDir: ROOT });
check("emitted route manifest present", Array.isArray(emitted), `${emitted?.length ?? 0} emitted app routes`);
const sourcePaths=new Set(discovery.entries.map(e=>'/'+e.appPath));
for(const e of emitted) assert.ok(sourcePaths.has(e.appPath)||['/_not-found/page','/_global-error/page'].includes(e.appPath), `Unresolved emitted entry: ${e.appPath}`);
for(const e of discovery.entries) assert.ok(emitted.some(b=>b.appPath==='/'+e.appPath), `Unemitted source entry: ${e.appPath}`);
const emittedByRoute = new Map(emitted.map((e) => [e.route, e]));
const expectedIncludes = tracingIncludesFor(consumers);
const compiledConfigPath = path.join(distDir, "required-server-files.json");
const compiledIncludes = JSON.parse(fs.readFileSync(compiledConfigPath, "utf8")).config?.outputFileTracingIncludes ?? {};
check("compiled config carries exactly the discovered keys", JSON.stringify(Object.keys(compiledIncludes).sort()) === JSON.stringify(Object.keys(expectedIncludes).sort())
  && Object.values(compiledIncludes).every((v) => JSON.stringify(v) === JSON.stringify([...RUNTIME_AUTHORITY_INCLUDES])),
  `${Object.keys(compiledIncludes).length} keys × ${RUNTIME_AUTHORITY_INCLUDES.length} structural includes`);
for(const c of consumers) for(const entry of emitted) assert.equal(tracingKeyMatches(c.tracingKey,entry.appPath),c.route===entry.route,`Exact key mismatch: ${c.route} vs ${entry.appPath}`);
const coverage = measureKeyCoverage({ keys: Object.keys(compiledIncludes), consumerRoutes: consumers.map((c) => c.route), allRoutes: emitted.map((e) => e.route) });
check("every consumer was emitted as a function", coverage.missingFromRoutes.length === 0, coverage.missingFromRoutes.join(", ") || `${consumers.length}/${consumers.length}`);
check("omitted consumers = 0", coverage.omitted.length === 0, coverage.omitted.join(", ") || `matched ${coverage.matched.length}`);
check("unintended matches = 0", coverage.unintended.length === 0, coverage.unintended.map((u) => u.route).join(", ") || "none");
report.discovery = {
  entrypoints: discovery.entries.length, runtimeConsumers: consumers.map((c) => ({ route: c.route, kind: c.kind, file: c.file, reachedRoots: c.reachedRoots })),
  typeErasure: "TypeScript and SWC independently compared", matched: coverage.matched.length, omitted: coverage.omitted, unintended: coverage.unintended, emittedRoutes: emitted.length
};

// ---- 3. Structural include + required authority (attributed) -------------
const structural = expandRuntimeAuthorityIncludes({ rootDir: ROOT });
const structuralReview = structural.files.filter((f) => f.file.startsWith(REVIEW_TREE));
check("structural include ships no review-tree file", structuralReview.length === 0, `${structural.count} files, ${structural.bytes} bytes`);
report.structuralInclude = { categories: [...RUNTIME_AUTHORITY_INCLUDES], files: structural.count, bytes: structural.bytes, reviewTreeFiles: structuralReview.length,
  byCategory: Object.fromEntries(RUNTIME_AUTHORITY_INCLUDES.map((g) => { const base = g.replace(/\/\*.*$/, ""); const rows = structural.files.filter((f) => f.file.startsWith(base + "/") && (!g.endsWith("*.json") || !f.file.slice(base.length + 1).includes("/"))); return [g, { files: rows.length, bytes: rows.reduce((n, f) => n + f.bytes, 0) }]; })) };

function runProbe({ root, modes, attribute = false }) {
  const out = execFileSync(process.execPath, [PROBE, "--root", root, "--modes", modes.join(","), ...(attribute ? ["--attribute"] : [])], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(out);
}
const ALL_MODES = ["successor", "resolver", "commercial", "workerStatic", "checkout"];
// This all-mode observation defines structural requirements by reachable module.
// It is not the dynamic-read or behavior baseline for consumers with fewer modes.
const sourceProbe = runProbe({ root: ROOT, modes: ALL_MODES, attribute: true });
check("source-tree authority evaluation completed", sourceProbe.results.successor?.loaded === true, `successor=${sourceProbe.results.successor?.decisionId} route=${sourceProbe.results.resolver?.route}`);
// module -> real file reads (files only; enumerations are proven through the files they yield; absent probes are not dependencies)
const readsByModule = new Map();
for (const row of sourceProbe.reads) { if (!row.module) continue; (readsByModule.get(row.module) ?? readsByModule.set(row.module, new Set()).get(row.module)).add(row.path); }
check("every authority read is attributed to a source module", sourceProbe.reads.every((r) => r.module), `${sourceProbe.reads.length} reads across ${readsByModule.size} modules; ${sourceProbe.enumerations.length} enumerations; ${sourceProbe.absentProbes.length} absent probes (not dependencies)`);
const MODE_MODULES = { successor: "src/lib/rcap/fulfillment/paid-consumer-successor.ts", resolver: "src/lib/rcap/documents/packet-route-resolver.ts", commercial: "src/lib/expungement-ai/packet-fulfillment-authority.ts", workerStatic: "src/lib/rcap/fulfillment/worker-static-authority.ts", checkout: "src/lib/expungement-ai/payment-adapter.ts" };
report.authorityReads = { modules: Object.fromEntries([...readsByModule.entries()].map(([m, s]) => [m, [...s].sort()])), enumerations: sourceProbe.enumerations.map((e) => e.path), absentProbes: sourceProbe.absentProbes.map((e) => e.path) };

// ---- 4. Per-consumer trace matrix ----------------------------------------
function tracePathFor(route) {
  const entry = emittedByRoute.get(route);
  if (!entry) return null;
  const p = path.join(distDir, "server", `${entry.bundle}.nft.json`);
  return fs.existsSync(p) ? p : null;
}
function tracedFiles(tracePath) {
  const base = path.dirname(tracePath);
  return new Set(JSON.parse(fs.readFileSync(tracePath, "utf8")).files.map((f) => path.relative(ROOT, path.resolve(base, f)).split(path.sep).join("/")));
}
const matrix = [];
function packagedRootFor(traced, omit = null) {
  const box = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-packaged-runtime-"));
  for (const rel of traced) {
    if (!(rel.startsWith("data/") || rel.startsWith("src/") && rel.endsWith(".json")) || rel === omit) continue;
    const src = path.join(ROOT, rel);
    if (!fs.existsSync(src) || fs.statSync(src).isDirectory()) continue;
    fs.mkdirSync(path.dirname(path.join(box, rel)), { recursive: true });
    fs.copyFileSync(src, path.join(box, rel));
  }
  return box;
}
for (const c of consumers) {
  const modes = ALL_MODES.filter((m) => c.reachable.has(path.join(ROOT, MODE_MODULES[m])));
  const reachedModules = [...readsByModule.keys()].filter((m) => c.reachable.has(path.join(ROOT, m)));
  const required = new Set(reachedModules.flatMap((m) => [...readsByModule.get(m)]));
  const tracePath = tracePathFor(c.route);
  const row = {
    consumer: c.route, route: c.route, kind: c.kind, traceFound: Boolean(tracePath), tracePath: tracePath ? path.relative(ROOT, tracePath) : null,
    structural_dependency_count: required.size, structural_missing_count: required.size, structural_missing: [...required].sort(), structural_trace_closed: false,
    probe_modes: modes, source_read_count: null, packaged_read_count: null, read_set_difference: null, executed_read_equal: false,
    behavior_equal: false, escape_count: null, successor_result: null, isolation_clean: false
  };
  if (!tracePath) { row.pass = false; row.reason = "no emitted trace"; matrix.push(row); continue; }
  const traced = tracedFiles(tracePath);
  const reviewTree = [...traced].filter((f) => f.startsWith(REVIEW_TREE));
  const dataFiles = [...traced].filter((f) => f.startsWith("data/")).sort();
  const dataBytes = dataFiles.reduce((n, f) => { try { return n + fs.statSync(path.join(ROOT, f)).size; } catch { return n; } }, 0);
  Object.assign(row, { reachedAuthorityModules: reachedModules, traceEntries: traced.size, traceDataFiles: dataFiles.length, traceDataBytes: dataBytes, reviewTreeFiles: reviewTree.length });
  const box = packagedRootFor(traced);
  try {
    Object.assign(row, probeConsumerAuthority({
      consumer: c.route, structuralDependencies: required, traceFiles: traced, modes,
      sourceRoot: ROOT, packagedRoot: box, runProbe
    }));
  } finally { fs.rmSync(box, { recursive: true, force: true }); }
  row.source_identity_sha256 = before.sourceIdentitySha256; // Rechecked after all probes and at report time.
  row.pass = row.pass && reviewTree.length === 0 && (!modes.includes("successor") || row.successor_result === sourceProbe.results.successor.decisionId);
  if (!row.pass) row.reason = [
    row.structural_missing_count ? `missing structural dependencies: ${row.structural_missing.join(", ")}` : null,
    !row.executed_read_equal ? `same-mode read drift: ${JSON.stringify(row.read_set_difference)}` : null,
    !row.behavior_equal ? `behavior differs: ${JSON.stringify(row.packaged_behavior)}` : null,
    !row.isolation_clean ? `source escapes: baseline=${row.source_escape_count}, packaged=${row.escape_count}` : null,
    reviewTree.length ? "review tree traced" : null,
    modes.includes("successor") && row.successor_result !== sourceProbe.results.successor.decisionId ? "approved successor differs" : null
  ].filter(Boolean).join("; ");
  matrix.push(row);
}
console.log("\n  consumer | trace | structural required/missing | probe modes | source/packaged reads | read difference | behavior equal | escapes | successor");
for (const r of matrix) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"} ${r.consumer} | ${r.traceFound ? "yes" : "NO"} | ${r.structural_dependency_count}/${r.structural_missing_count} | ${r.probe_modes.join(",")} | ${r.source_read_count}/${r.packaged_read_count} | ${JSON.stringify(r.read_set_difference)} | ${r.behavior_equal} | ${r.escape_count} | ${r.successor_result}${r.reason ? ` | ${r.reason}` : ""}`);
}
console.log("");
check("every consumer has an emitted trace", matrix.every((r) => r.traceFound), `${matrix.filter((r) => r.traceFound).length}/${matrix.length}`);
check("structural trace closure: missing dependencies = 0 for every consumer", matrix.every((r) => r.structural_trace_closed), matrix.filter((r) => !r.structural_trace_closed).map((r) => `${r.route}:${r.structural_missing_count}`).join(", ") || `${matrix.length} consumers complete`);
check("no consumer trace carries a review-tree file", matrix.every((r) => r.reviewTreeFiles === 0));
check("executed read closure: packaged reads equal same-mode source reads for every consumer", matrix.every((r) => r.executed_read_equal), matrix.filter((r) => !r.executed_read_equal).map((r) => `${r.route}: ${JSON.stringify(r.read_set_difference)}`).join("; ") || `${matrix.length} fresh source/packaged pairs`);
check("behavior parity: packaged behavior equals same-mode source behavior for every consumer", matrix.every((r) => r.behavior_equal), matrix.filter((r) => !r.behavior_equal).map((r) => r.route).join(", ") || `${matrix.length} consumers equal`);
check("source escapes = 0 for every consumer probe pair", matrix.every((r) => r.isolation_clean), matrix.filter((r) => !r.isolation_clean).map((r) => r.route).join(", ") || "none");
check("every consumer reads the same approved successor", matrix.every((r) => r.successor_result === sourceProbe.results.successor.decisionId), sourceProbe.results.successor.decisionId);
for (const surface of REPRESENTATIVE_SURFACES) {
  const row = matrix.find((r) => r.route === surface);
  check(`representative surface ${surface}`, Boolean(row?.pass), row ? `successor=${row.successor_result}${row.packaged_behavior?.resolver ? ` route=${row.packaged_behavior.resolver.route}` : ""}${row.packaged_behavior?.commercial ? ` checkout=${row.packaged_behavior.commercial.surfaces["checkout creation"].split(":")[0]}` : ""}` : "not a discovered consumer");
}
report.matrix = matrix;
report.structuralSourceBehavior = behaviorOf(sourceProbe, ALL_MODES);

// ---- 5. Negative control on the representative consumer -------------------
const rep = matrix.find((r) => r.route === representativeRoute) ?? matrix[0];
const repTraced = tracedFiles(path.join(ROOT, rep.tracePath));
const victim = sourceProbe.results.successor.decisionPath;
const victimSha = sha256(fs.readFileSync(path.join(ROOT, victim)));
const negative = { representative: rep.route, modes: rep.probe_modes, removedFile: victim, removedFileSha256: victimSha };
{
  const box = packagedRootFor(repTraced, victim);
  try { negative.withoutFile = behaviorOf(runProbe({ root: box, modes: rep.probe_modes }), rep.probe_modes); } finally { fs.rmSync(box, { recursive: true, force: true }); }
  const box2 = packagedRootFor(repTraced);
  try {
    negative.restoredFileSha256 = sha256(fs.readFileSync(path.join(box2, victim)));
    negative.restored = behaviorOf(runProbe({ root: box2, modes: rep.probe_modes }), rep.probe_modes);
  } finally { fs.rmSync(box2, { recursive: true, force: true }); }
}
const refusedCheckout = negative.withoutFile.commercial ? /^refused/.test(negative.withoutFile.commercial.surfaces["checkout creation"]) : true;
const refusedRoute = negative.withoutFile.resolver ? negative.withoutFile.resolver.route === "legacy_retired" : true;
check(`negative control: removing ${path.basename(victim)} from ${rep.route} brings the refusal back`, negative.withoutFile.successor === null && refusedCheckout && refusedRoute,
  `successor=${negative.withoutFile.successor}${negative.withoutFile.resolver ? ` route=${negative.withoutFile.resolver.route}` : ""}${negative.withoutFile.commercial ? ` checkout=${negative.withoutFile.commercial.surfaces["checkout creation"].split(":")[0]}` : ""}`);
check("negative control: restoring the exact bytes restores the authority", negative.restoredFileSha256 === victimSha && JSON.stringify(negative.restored) === JSON.stringify(rep.source_behavior),
  `sha256 ${negative.restoredFileSha256.slice(0, 12)}… successor=${negative.restored.successor}`);
const siblingBefore = negative.withoutFile.resolver?.unmigratedSibling ?? negative.withoutFile.commercial?.unmigratedSiblingCheckout;
const siblingAfter = negative.restored.resolver?.unmigratedSibling ?? negative.restored.commercial?.unmigratedSiblingCheckout;
check("un-migrated sibling stays refused before and after", ["legacy_retired", "refused"].includes(siblingBefore) && ["legacy_retired", "refused"].includes(siblingAfter), `${siblingBefore} / ${siblingAfter}`);
report.negativeControl = negative;
assert.equal(rep.route, '/api/expungement-ai/checkout', 'Checkout is the required behavioral control');
assert.equal(rep.packaged_behavior.checkout.creation, null, 'checkout baseline must be green');
assert.ok(negative.withoutFile.checkout.creation, 'missing authority must refuse payment adapter');
assert.equal(negative.restored.checkout.creation, null);
{
  const box=packagedRootFor(repTraced);
  try {
    assert.deepEqual(behaviorOf(runProbe({root:box,modes:rep.probe_modes}),rep.probe_modes),negative.restored);
    const target=path.join(box,victim);fs.unlinkSync(target);fs.symlinkSync(path.join(ROOT,victim),target);
    const result=spawnSync(process.execPath,[PROBE,'--root',box,'--modes',rep.probe_modes.join(',')],{cwd:ROOT,encoding:'utf8'});
    check('symlink to source data refuses packaged acceptance',result.status!==0&&`${result.stderr}${result.stdout}`.includes('PACKAGED_ROOT_ESCAPE'));
    report.symlinkMutation={exitCode:result.status,detected:`${result.stderr}${result.stdout}`.includes('PACKAGED_ROOT_ESCAPE')};
  } finally {fs.rmSync(box,{recursive:true,force:true});}
}
report.mutationCounts={behavioralAuthorityRemovals:1,symlinkEscapes:1,manifestOmissionAssertions:0};

// ---- 6. Trace size accounting (and baseline delta when supplied) ----------
function traceStats(tracePath, baseDirInRealBuild) {
  const base = baseDirInRealBuild ?? path.dirname(tracePath);
  const files = JSON.parse(fs.readFileSync(tracePath, "utf8")).files.map((f) => path.relative(ROOT, path.resolve(base, f)).split(path.sep).join("/"));
  const data = files.filter((f) => f.startsWith("data/"));
  const bytes = data.reduce((n, f) => { try { return n + fs.statSync(path.join(ROOT, f)).size; } catch { return n; } }, 0);
  return { entries: files.length, dataFiles: data.length, dataBytes: bytes, data: new Set(data) };
}
const sizing = { representatives: [] };
for (const surface of REPRESENTATIVE_SURFACES) {
  const row = matrix.find((r) => r.route === surface);
  if (!row?.tracePath) continue;
  const now = traceStats(path.join(ROOT, row.tracePath));
  const entry = { route: surface, entries: now.entries, dataFiles: now.dataFiles, dataBytes: now.dataBytes };
  if (baselineTraces) {
    const rel = row.tracePath.replace(/^\.next\/server\//, "");
    const basePath = path.join(baselineTraces, rel);
    if (fs.existsSync(basePath)) {
      const before = traceStats(basePath, path.join(distDir, "server", path.dirname(rel)));
      const added = [...now.data].filter((f) => !before.data.has(f));
      const removed = [...before.data].filter((f) => !now.data.has(f));
      const cats = {};
      for (const f of added) { const k = f.split("/").slice(0, 3).join("/"); cats[k] = (cats[k] ?? 0) + 1; }
      Object.assign(entry, { baseline: { entries: before.entries, dataFiles: before.dataFiles, dataBytes: before.dataBytes }, addedDataFiles: added.length, removedDataFiles: removed.length,
        addedDataBytes: added.reduce((n, f) => n + fs.statSync(path.join(ROOT, f)).size, 0), addedByCategory: cats, addedReviewTree: added.filter((f) => f.startsWith(REVIEW_TREE)).length });
    }
  }
  sizing.representatives.push(entry);
}
const allTraces = [];
(function walk(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith(".nft.json")) allTraces.push(p); } })(path.join(distDir, "server", "app"));
const reviewTraced = allTraces.filter((t) => fs.readFileSync(t, "utf8").includes("/grade-a/reviews/"));
sizing.functionsTraced = allTraces.length;
sizing.functionsWithReviewTree = reviewTraced.length;
check("no emitted function trace carries the review tree", reviewTraced.length === 0, `${allTraces.length} function traces inspected`);
report.sizing = sizing;
report.traceManifestHashes = Object.fromEntries(allTraces.sort().map(p=>[path.relative(ROOT,p),sha256(fs.readFileSync(p))]));
report.buildManifestHashes=Object.fromEntries(['.next/BUILD_ID','.next/server/app-paths-manifest.json','.next/required-server-files.json'].map(p=>[p,sha256(fs.readFileSync(path.join(ROOT,p)))]));
checkIdentity('after probes / before acceptance');

finish();

function finish() {
  checkIdentity("at final report");
  report.finishedAt = new Date().toISOString();
  report.checks = checks;
  report.failures = failures;
  report.verdict = failures.length === 0 && !reuseBuild ? "PASS" : failures.length === 0 ? "PASS_NOT_ACCEPTANCE_REUSED_BUILD" : "FAIL";
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, (k, v) => (v instanceof Set ? [...v] : v), 2));
  console.log(`\n  report: ${path.relative(ROOT, reportPath)}`);
  if (failures.length > 0) {
    console.error(`verify-rcap-runtime-authority-tracing FAILED: ${failures.length} of ${checks} checks.`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`verify-rcap-runtime-authority-tracing passed: ${checks}/${checks} checks — PACKAGED-DATA AUTHORITY PARITY for independently enumerated consumers (not compiled-handler/HTTP proof).${reuseBuild ? " (REUSED BUILD: not acceptance)" : ""}`);
  process.exit(0);
}
