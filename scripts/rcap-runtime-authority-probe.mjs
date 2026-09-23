#!/usr/bin/env node
/*
 * Packaged-runtime authority probe.
 *
 * Evaluates the shared fulfillment authority against a SUPPLIED filesystem
 * root and reports what it read and what it decided. The tracing verifier
 * builds that root from nothing but the files a server function's generated
 * trace carries, so the claim is PACKAGED-DATA AUTHORITY PARITY. These are source modules,
 * not compiled Next handlers or HTTP execution.
 *
 * Every invocation is a fresh process. Module-level caches in the authority
 * modules would otherwise let a source-tree read in one evaluation stand in
 * for a packaged read in the next, and the explicit cache resets below are
 * belt to that braces.
 *
 * SOURCE-ESCAPE CHECK. Every filesystem access is recorded and classified.
 * A `data/` read that resolves into the repository rather than the supplied
 * root is an ESCAPE, reported and fatal to the probe's verdict: a probe that
 * can quietly read repository authority while claiming to test a packaged
 * runtime would pass for the wrong reason. Reads are further distinguished
 * as real file reads, directory enumerations, and existence probes of absent
 * paths, because only the first two are dependencies a bundle must carry.
 *
 * MODES. Different functions reach different authority sub-chains, and a
 * function is not made to import authority it never uses just to satisfy a
 * universal test. Callers pass the modes their function's import graph
 * actually reaches:
 *   successor  -- the paid-consumer successor loader (every consumer)
 *   resolver   -- packet route resolution (route kind under ADR-0004)
 *   commercial -- packet fulfillment authority per money/delivery surface
 *   workerStatic -- the worker's static packet binding
 *
 * The probe route is the migrated exemplar the repair exists for; it is an
 * INPUT to a generic evaluation, not a special case inside it. An un-migrated
 * sibling in the same retired jurisdiction is probed beside it so a repair
 * that opened a jurisdiction rather than packaging a route would be seen.
 *
 *   node scripts/rcap-runtime-authority-probe.mjs --root <dir> --modes successor,resolver,commercial,workerStatic [--attribute]
 *
 * Prints one JSON document on stdout.
 */
import fs from "node:fs";
import {guardPackagedRoot} from "./rcap-runtime-authority-isolation.mjs";
import path from "node:path";
import { createHash } from "node:crypto";
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const root = path.resolve(flag("--root") ?? REPO);
const modes = new Set((flag("--modes") ?? "successor").split(",").filter(Boolean));
const attribute = args.includes("--attribute");

export const PROBE_ROUTE = Object.freeze({
  jurisdiction: "MS",
  pathwayId: "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal",
  trackId: "ms-nonconv"
});
export const PROBE_UNMIGRATED_SIBLING = Object.freeze({
  jurisdiction: "MS",
  pathwayId: "felony-expungement-99-19-71-1",
  trackId: "ms-felony"
});
export const COMMERCIAL_SURFACES = Object.freeze(["checkout creation", "consumer payment authority", "packet generation", "participant delivery"]);
export const MODE_MODULES = Object.freeze({
  successor: "src/lib/rcap/fulfillment/paid-consumer-successor.ts",
  resolver: "src/lib/rcap/documents/packet-route-resolver.ts",
  commercial: "src/lib/expungement-ai/packet-fulfillment-authority.ts",
  checkout: "src/lib/expungement-ai/payment-adapter.ts",
  workerStatic: "src/lib/rcap/fulfillment/worker-static-authority.ts"
});

// ---- filesystem recording -------------------------------------------------
const accesses = new Map(); // rel path -> { kinds:Set, module:string|null, location }
function classify(abs) {
  if (abs === root || abs.startsWith(root + path.sep)) return 'packaged';
  if (abs === REPO || abs.startsWith(REPO + path.sep)) return root === REPO ? 'packaged' : 'ESCAPE';
  return 'outside';
}

function attributeFrame() {
  const lines = (new Error().stack ?? "").split("\n").slice(3);
  const frame = lines.find((l) => l.includes(`${path.sep}src${path.sep}`) && !l.includes("node_modules"));
  const m = frame && frame.match(/(?:file:\/\/)?(\/[^):]+\/src\/[^):]+)/);
  return m ? path.relative(REPO, m[1]) : null;
}
function record(kind, target) {
  const abs = path.isAbsolute(String(target)) ? String(target) : path.resolve(process.cwd(), String(target));
  const location = classify(abs);
  if (location === "outside") return;
  const rel = path.relative(location === "packaged" ? root : REPO, abs).split(path.sep).join("/");
  const entry = accesses.get(rel) ?? { kinds: new Set(), module: null, location };
  entry.kinds.add(kind);
  if (location === "ESCAPE") entry.location = "ESCAPE";
  if (attribute && !entry.module) entry.module = attributeFrame();
  accesses.set(rel, entry);
}
const guard = guardPackagedRoot(root, (kind, target, phase) => {
  // Module code loading is outside packaged-data parity; runtime data is not.
  if (phase.initializing && target.includes(`${path.sep}node_modules${path.sep}`)) return;
  const names = {readFileSync:'read',openSync:'read',readSync:'read',readvSync:'read',readdirSync:'enumerate'};
  const [name, absent] = kind.split(':');
  record((names[name] ?? name) + (absent ? ':absent' : ''), target);
});

// ---- evaluation -----------------------------------------------------------
register("./lib/ts-esm-loader.mjs", import.meta.url);
// Loader aliases bind to REPO; module-level cwd constants bind to the package.
process.chdir(root);
const mod = (rel) => import(pathToFileURL(path.join(REPO, rel)).href);

// Source code/static imports still come from REPO (parity only); every main
// thread runtime filesystem read, including module initialization, is checked.
const loaded = {};
if (modes.has("successor")) loaded.successor = await mod(MODE_MODULES.successor);
if (modes.has("resolver")) loaded.resolver = await mod(MODE_MODULES.resolver);
if (modes.has("commercial")) loaded.commercial = await mod(MODE_MODULES.commercial);
if (modes.has("workerStatic")) loaded.workerStatic = await mod(MODE_MODULES.workerStatic);
if (modes.has("checkout")) loaded.checkout = await mod(MODE_MODULES.checkout);
const resets = [];
for (const rel of ["src/lib/rcap/fulfillment/grade-a-registry.ts", "src/lib/rcap/fulfillment/grade-a-admission.ts", "src/lib/rcap/documents/factory-v2-registry.ts", "src/lib/rcap/documents/packet-route-resolver.ts"]) {
  try { const m = await mod(rel); for (const [k, v] of Object.entries(m)) if (/^reset/.test(k) && typeof v === "function") resets.push([rel, k, v]); } catch { /* not reachable in this mode set */ }
}

process.chdir(root);
guard.assertClean();
guard.beginEvaluation();
for (const [, , reset] of resets) reset();

const results = { successor: null, resolver: null, commercial: null, workerStatic: null };
const routeKey = `${PROBE_ROUTE.jurisdiction}:${PROBE_ROUTE.pathwayId}`;
if (loaded.successor) {
  const decision = loaded.successor.loadMsPaidConsumerSuccessor();
  results.successor = decision
    ? { loaded: true, decisionId: decision.decisionId, decisionPath: decision.decisionPath, decisionSha256: decision.decisionSha256, routeId: decision.routeId, trackId: decision.trackId }
    : { loaded: false, decisionId: null };
}
if (loaded.resolver) {
  const run = (r) => loaded.resolver.resolvePacketRoute({ state: r.jurisdiction, pathway: r.pathwayId, trackId: r.trackId }).routeKind;
  results.resolver = { route: run(PROBE_ROUTE), unmigratedSibling: run(PROBE_UNMIGRATED_SIBLING) };
}
if (loaded.commercial) {
  const surfaces = {};
  for (const surface of COMMERCIAL_SURFACES) {
    const d = loaded.commercial.packetFulfillmentAuthority(PROBE_ROUTE.jurisdiction, PROBE_ROUTE.pathwayId, surface, { trackId: PROBE_ROUTE.trackId });
    surfaces[surface] = d.allowed ? "allowed" : `refused: ${String(d.reason).slice(0, 160)}`;
  }
  const sibling = loaded.commercial.packetFulfillmentAuthority(PROBE_UNMIGRATED_SIBLING.jurisdiction, PROBE_UNMIGRATED_SIBLING.pathwayId, "checkout creation", { trackId: PROBE_UNMIGRATED_SIBLING.trackId });
  results.commercial = { route: routeKey, surfaces, unmigratedSiblingCheckout: sibling.allowed ? "allowed" : "refused" };
}
if (loaded.workerStatic) {
  const b = loaded.workerStatic.workerStaticPacketBinding(routeKey, PROBE_ROUTE.trackId);
  results.workerStatic = { bound: b !== null, packetSpecificationSha256: b?.packetSpecificationSha256 ?? null };
}

if (loaded.checkout) {
  const snapshot = {jurisdiction:PROBE_ROUTE.jurisdiction,pathwayId:PROBE_ROUTE.pathwayId,selectedTrackId:PROBE_ROUTE.trackId,packetType:'custom_pleading',resultCode:'packet_ready_with_caution',paymentAllowed:true,deferralComponentIds:[]};
  const refusal = fn => {try {fn(snapshot);return null;}catch(error){return {name:error.name,message:error.message};}};
  results.checkout = {creation:refusal(loaded.checkout.assertCheckoutAllowed),delivery:refusal(loaded.checkout.assertPacketRouteCanDeliver)};
}
guard.assertClean();
guard.restore();

// ---- report ---------------------------------------------------------------
const reads = [], enumerations = [], absentProbes = [], escapes = [];
for (const [rel, entry] of [...accesses.entries()].sort()) {
  const kinds = [...entry.kinds];
  const row = { path: rel, kinds: kinds.sort(), module: entry.module };
  if (entry.location === "ESCAPE") escapes.push(row);
  if (kinds.includes("read")) reads.push(row);
  else if (kinds.includes("enumerate")) enumerations.push(row);
  else if (kinds.every((k) => k.endsWith(":absent"))) absentProbes.push(row);
}
const sha = (p) => { try { return createHash("sha256").update(fs.readFileSync(p)).digest("hex"); } catch { return null; } };
process.stdout.write(JSON.stringify({
  root, repository: REPO, packagedRootIsRepository: root === REPO,
  modes: [...modes], resets: resets.map(([rel, k]) => `${rel}#${k}`),
  probeRoute: PROBE_ROUTE, unmigratedSibling: PROBE_UNMIGRATED_SIBLING,
  results,
  escapes, escapeCount: escapes.length,
  reads, enumerations, absentProbes,
  successorDecisionSha256: results.successor?.decisionPath ? sha(path.join(root, results.successor.decisionPath)) : null
}, null, 2));
