#!/usr/bin/env node
// Image preflight: proves the CONTAINER carries the read-only runtime data the
// worker needs, and that the worker's own code reaches a real decision with it.
//
// This is deliberately not a health check that exits 0 because the process
// started. The failure it exists to catch is an image whose data/ closure is
// absent or partial: every reader in the worker's graph is guarded, so a
// missing registry or a half-copied specification directory produces a refusal
// or a silently degraded answer rather than a crash. A worker like that "runs"
// and never renders.
//
// It performs no network access and needs no database: the authority,
// specification-binding and composition decisions it drives are pure functions
// over the packaged files.
//
//   docker run --rm rcap-render-worker:<tag> node deploy/rcap-render-worker/preflight.mjs
//
// Exit 0 = every manifest file present and byte-identical, module graph loaded,
// and the Grade-A authority gate returned a reasoned decision for every record.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { register } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "../..");
process.chdir(ROOT); // every reader resolves against process.cwd()

const stage = process.argv.find((arg) => arg.startsWith("--stage="))?.split("=")[1] ?? "all";
if (!["all", "preflight", "authority"].includes(stage)) throw new Error(`unknown stage: ${stage}`);
let failures = 0;
const fail = (m) => { failures += 1; console.error(`FAIL ${m}`); };

if (stage !== "authority") {
// 1. The packaged bytes are exactly what the manifest names.
const manifest = JSON.parse(fs.readFileSync(path.join(here, "runtime-data-manifest.json"), "utf8"));
let missing = 0, mismatched = 0;
for (const entry of manifest.files) {
  const abs = path.join(ROOT, entry.path);
  if (!fs.existsSync(abs)) { missing += 1; fail(`missing packaged file: ${entry.path}`); continue; }
  const actual = crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
  if (actual !== entry.sha256) { mismatched += 1; fail(`sha256 mismatch: ${entry.path}`); }
}
console.log(`data manifest: ${manifest.files.length} files declared, ${missing} missing, ${mismatched} mismatched`);

}

// 2. The worker's module graph loads. This is what proves the ESM JSON imports
//    (@/../data/...) are present: without them the import throws here.
register(pathToFileURL(path.join(ROOT, "scripts/lib/ts-esm-loader.mjs")).href);
const { getAllJurisdictionProfiles } = await import(path.join(ROOT, "src/lib/rcap-engine/profile-registry.ts"));
const { getCurrentFulfillmentRecord } = await import(path.join(ROOT, "src/lib/rcap/fulfillment/grade-a-registry.ts"));
const { packetFulfillmentAuthority } = await import(path.join(ROOT, "src/lib/expungement-ai/packet-fulfillment-authority.ts"));
const { composablePacketSpecificationFor } = await import(path.join(ROOT, "src/lib/rcap/grade-a/packet-specification.ts"));
await import(path.join(ROOT, "src/lib/rcap/render/personalized-packet.ts"));
await import(path.join(ROOT, "src/lib/rcap/render/render-worker.ts"));
await import(path.join(ROOT, "scripts/rcap-render-worker.mjs"));
console.log(`module graph: loaded; ${getAllJurisdictionProfiles().length} compiled jurisdiction profiles`);

if (stage !== "preflight") {
// 3. The authority gate reaches a reasoned decision per record, reading the
//    packaged registry, observation snapshot and specification directory.
const registryPath = "data/rcap-grade-a/fulfillment-authority-registry.json";
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, registryPath), "utf8"));
let allowed = 0, refused = 0, undecided = 0;
for (const record of registry.records) {
  const specification = composablePacketSpecificationFor(record.routeId);
  // A specification carries either a tracks[] array or a single trackId; the
  // binding refuses a missing track, so both shapes must be offered.
  const tracks = specification?.tracks?.map((t) => t.trackId) ?? [specification?.trackId].filter(Boolean);
  let decision = null;
  for (const trackId of tracks.length ? tracks : [undefined]) {
    const verdict = packetFulfillmentAuthority(record.jurisdiction, record.pathwayId, "packet generation", { trackId });
    if (!decision || verdict.allowed) decision = verdict;
    if (verdict.allowed) break;
  }
  if (!decision) { undecided += 1; fail(`${record.routeId}: no decision returned`); continue; }
  if (decision.allowed) allowed += 1; else refused += 1;
  if (getCurrentFulfillmentRecord(record.routeId)?.revocation?.revoked && decision.allowed) fail(`${record.routeId}: revoked record was allowed`);
  if (!decision.allowed && !decision.reason) { undecided += 1; fail(`${record.routeId}: refused with no reason`); }
  console.log(`  ${record.routeId} -> ${decision.allowed ? "ALLOWED" : `refused: ${String(decision.reason).slice(0, 110)}`}`);
}
console.log(`authority gate: ${registry.records.length} records, ${allowed} allowed, ${refused} reasoned refusals, ${undecided} undecided`);

}

if (stage !== "authority") {
// 4. The specification binding really opened the packaged directory.
const specDir = path.join(ROOT, "data/record-clearing/packet-specifications");
const specCount = fs.readdirSync(specDir).filter((f) => f.endsWith(".json")).length;
if (specCount !== 19) fail(`expected 19 packaged specifications, found ${specCount}`);
console.log(`specification directory: ${specCount} files scannable at ${path.relative(ROOT, specDir)}`);

}

if (failures) { console.error(`\nPREFLIGHT FAILED: ${failures} problem(s)`); process.exit(1); }
console.log(`\n${stage.toUpperCase()} OK: ${stage === "authority" ? "packaged registry decisions checked without test authority" : stage === "preflight" ? "packaged assets and actual worker imports verified" : "packaged assets, worker imports and registry decisions verified"}`);
