#!/usr/bin/env node
// Generates (and re-checks) deploy/rcap-render-worker/runtime-data-manifest.json.
//
// The render-worker image used to carry no data/ at all: the Dockerfile copied
// package manifests, scripts/ and src/ only. Every read-only runtime input the
// worker resolves through process.cwd() was therefore absent inside the
// container, and the readers below are guarded — a missing file makes the
// worker refuse or silently degrade rather than crash, which is why an image
// that "starts" proved nothing.
//
// The set here was derived by tracing the worker's module graph from
// scripts/rcap-render-worker.mjs and by instrumenting fs.readFileSync /
// readdirSync / existsSync while driving the authority, specification-binding
// and job-contract paths. It is deliberately NOT a copy of data/ (1.1 GB): it
// is the closure the worker actually reads, plus the ESM JSON imports its
// module graph cannot load without.
//
//   node deploy/rcap-render-worker/build-runtime-data-manifest.mjs           # write
//   node deploy/rcap-render-worker/build-runtime-data-manifest.mjs --check   # verify

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "../..");
const OUT = path.join(here, "runtime-data-manifest.json");

/** Every entry carries why it is in the image and what reads it. */
const ENTRIES = [
  { path: "data/rcap-grade-a/fulfillment-authority-registry.json", kind: "file",
    readBy: "src/lib/rcap/fulfillment/grade-a-registry.ts (REGISTRY_PATH)",
    why: "The Grade-A fulfillment record set. Absent, getCurrentFulfillmentRecord finds no record and every route is refused." },
  { path: "data/rcap-grade-a/fulfillment-observation-snapshot.json", kind: "file",
    readBy: "src/lib/rcap/fulfillment/grade-a-admission.ts (OBSERVATION_PATH)",
    why: "Independent observation the admission gate binds a record against." },
  { path: "data/rcap-grade-a/maintenance/route-holds.json", kind: "file",
    readBy: "src/lib/rcap/documents/packet-route-resolver.ts (ROUTE_HOLDS_PATH)",
    why: "Route-scoped maintenance holds. Absent = no holds, which would silently un-hold a held route." },
  { path: "data/rcap-codex/release-readiness.json", kind: "file",
    readBy: "src/lib/rcap/documents/packet-route-resolver.ts (RELEASE_READINESS_PATH, via deploymentConfigIncomplete)",
    why: "Read only when the delivery route state is live. Absent, deploymentConfigIncomplete() fails closed and every live route stops resolving." },
  { path: "data/rcap-all50/problematic-pdf-register.json", kind: "file",
    readBy: "src/lib/rcap/documents/packet-route-resolver.ts (PROBLEMATIC_PDF_REGISTER_PATH)",
    why: "Track ids under a PDF maintenance hold." },
  { path: "data/rcap-all50/review-artifacts/f2-dispositions.json", kind: "file",
    readBy: "src/lib/rcap/documents/guidance-packet-registry.ts",
    why: "Factory-v2 route dispositions consulted during route availability." },
  { path: "data/rcap-all50/guidance-packets", kind: "dir", ext: ".json",
    readBy: "src/lib/rcap/documents/guidance-packet-registry.ts (PACKET_DIR, readdirSync)",
    why: "Directory is enumerated at runtime; a partial copy changes the guidance set the resolver sees." },
  { path: "data/rcap-ledger/packet-fulfillment-records.json", kind: "file",
    readBy: "src/lib/expungement-ai/packet-fulfillment-authority.ts (ESM JSON import)",
    why: "Static import: the module graph cannot load without the file present." },
  { path: "data/rcap-ledger/packet-correction-required.json", kind: "file",
    readBy: "worker module graph (ESM JSON import)", why: "Static import; module load fails if absent." },
  { path: "data/rcap-ledger/route-kind-adjudications.json", kind: "file",
    readBy: "worker module graph (ESM JSON import)", why: "Static import; module load fails if absent." },
  { path: "data/rcap-ledger/route-presentation-conflicts.json", kind: "file",
    readBy: "worker module graph (ESM JSON import)", why: "Static import; module load fails if absent." },
  { path: "data/rcap-ledger/track-pathway-crosswalk.json", kind: "file",
    readBy: "src/lib/rcap/documents/guidance-packet-registry.ts (CROSSWALK_PATH)",
    why: "Track-to-pathway crosswalk used while resolving a route." },
  { path: "data/record-clearing/factory-v2-route-registry.json", kind: "file",
    readBy: "src/lib/rcap/documents/factory-v2-registry.ts (REGISTRY_PATH)",
    why: "Factory-v2 route rows behind buildRenderJobSpec." },
  { path: "data/record-clearing/legal-design-packet-set-manifests.json", kind: "file",
    readBy: "src/lib/rcap/documents/factory-v2-registry.ts (ROUTE_MIGRATIONS_PATH)",
    why: "Packet-set manifests behind buildRenderJobSpec." },
  { path: "data/record-clearing/legal-decisions/route-ratification-registry.json", kind: "file",
    readBy: "src/lib/rcap/render/job-contract.ts and src/lib/rcap-engine/evaluator.ts (ESM JSON import)",
    why: "Static import; module load fails if absent." },
  { path: "data/rcap-all50/composed-routes", kind: "tree", basename: "route.json",
    readBy: "src/lib/rcap/documents/guidance-packet-registry.ts (COMPOSED_ROUTES_DIR, loadComponentDeferrals)",
    why: "loadComponentDeferrals walks <state>/<route>/route.json and it FAILS OPEN: an absent directory yields an empty deferral map. resolvePacketRoute (reached from src/lib/rcap/render/job-contract.ts buildRenderJobSpec, which is on the worker's graph) consults it before every other classification, so without these files a component-deferred track stops resolving to routeKind component_deferral and falls through to a later, possibly sellable, classification. Only route.json is opened; sibling canonical/boundary/negative fixtures and participant .md copy are never read, and a route directory carrying no route.json is skipped by the loader either way, so this subset produces the identical deferral map." },
  { path: "data/rcap-all50/terminalization-treatments", kind: "dir", ext: ".json",
    readBy: "src/lib/rcap/documents/guidance-packet-registry.ts (TERMINAL_TREATMENT_DIR, loadTerminalTreatments)",
    why: "Same fail-open shape: an absent directory yields no treatments, and resolvePacketRoute then stops returning exact_supported_deferral with treatmentReviewState pending_independent_review for the 114 treated tracks. The loader reads every top-level .json (skipping _-prefixed names at parse time), so the whole flat directory ships." },
  { path: "data/record-clearing/packet-specifications", kind: "dir", ext: ".json",
    readBy: "src/lib/rcap/grade-a/packet-specification.ts (18 ESM JSON imports) and src/lib/rcap/fulfillment/consumer-specification-binding.ts (readdirSync + per-file sha256)",
    why: "The binding scans the WHOLE directory and matches a record's packetSpecification.sha256 against file bytes. A partial copy makes an otherwise valid route unbindable, so every .json here ships, including OR-disposition-configurations.v1.json which is scanned though not imported." }
];

/** Paths a reader might expect here, deliberately left out. */
const EXCLUDED = [
  { path: "data/rcap-all50/composed-routes/**, other than route.json", reason: "The component-deferral loader opens route.json and nothing else; the canonical/boundary/negative/dependency fixtures and the participant-instructions/handoff/process-guidance markdown beside it have no runtime reader on the worker's graph." },
  { path: "data/rcap-all50/overlays/**/fixtures/*.pdf", reason: "factory-v2-registry.ts artifactPins compare path and sha256 STRINGS against database rows; the composer and renderer perform no filesystem reads, so no overlay fixture is opened at runtime." },
  { path: "data/record-clearing/legal-decisions/2026-08-28-controlling-decisions.json", reason: "CONTROLLING_DECISION_RECORD is an exported citation string in controlling-route-effects.ts, never read from disk." },
  { path: "private/**", reason: "Source corpus. Never a runtime input and never placed in the build context." },
  { path: "data/** (everything else)", reason: "1.1 GB of build-time and review material with no runtime reader on the worker's graph." }
];

const sha256 = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

const files = [];
for (const entry of ENTRIES) {
  const abs = path.join(ROOT, entry.path);
  if (!fs.existsSync(abs)) throw new Error(`manifest input missing: ${entry.path}`);
  let members;
  if (entry.kind === "dir") {
    members = fs.readdirSync(abs).filter((f) => f.endsWith(entry.ext)).sort().map((f) => `${entry.path}/${f}`);
  } else if (entry.kind === "tree") {
    // Recursive: only the basename the reader actually opens, at any depth.
    const found = [];
    const walk = (dir) => {
      for (const name of fs.readdirSync(dir).sort()) {
        const child = path.join(dir, name);
        if (fs.statSync(child).isDirectory()) walk(child);
        else if (name === entry.basename) found.push(path.relative(ROOT, child));
      }
    };
    walk(abs);
    if (found.length === 0) throw new Error(`manifest tree entry matched nothing: ${entry.path}/**/${entry.basename}`);
    members = found.sort();
  } else {
    members = [entry.path];
  }
  for (const rel of members) {
    const a = path.join(ROOT, rel);
    files.push({ path: rel, sha256: sha256(a), bytes: fs.statSync(a).size, readBy: entry.readBy, why: entry.why });
  }
}
files.sort((a, b) => a.path.localeCompare(b.path));

const manifest = {
  schemaVersion: "rcap-render-worker-runtime-data/v1",
  generatedBy: "deploy/rcap-render-worker/build-runtime-data-manifest.mjs",
  purpose: "The exact read-only data/ closure the render worker reads at runtime, so the container image carries it and no more.",
  derivation: "Static traversal of the import graph from scripts/rcap-render-worker.mjs (including @/../data ESM JSON imports), plus fs.readFileSync/readdirSync/existsSync instrumentation while driving packetFulfillmentAuthority, consumerSpecificationBinding, composeGradeAPacket/renderGradeAPacketPdf and buildRenderJobSpec over every record in the Grade-A registry.",
  containerPath: "/app/<path>, i.e. the repository-relative path is preserved because every reader resolves against process.cwd() and the image WORKDIR is /app.",
  fileCount: files.length,
  totalBytes: files.reduce((n, f) => n + f.bytes, 0),
  excluded: EXCLUDED,
  files
};

const serialized = JSON.stringify(manifest, null, 2) + "\n";
if (process.argv.includes("--check")) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current !== serialized) { console.error("runtime-data-manifest.json is stale; regenerate it."); process.exit(1); }
  console.log(`runtime-data-manifest.json current: ${files.length} files, ${manifest.totalBytes} bytes`);
} else {
  fs.writeFileSync(OUT, serialized);
  console.log(`wrote ${path.relative(ROOT, OUT)}: ${files.length} files, ${manifest.totalBytes} bytes`);
}
