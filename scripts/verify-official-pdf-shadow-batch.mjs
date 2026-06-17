import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = process.env.OFFICIAL_FORMS_SOURCE_DIR
  ?? "/workspaces/legalease-partner-dashboard-clean/private/Nationwide Record Clearing";
const outputDir = path.join(rootDir, "tmp/official-pdf-shadow-batch");
const expectedApprovedCount = Number(process.env.OFFICIAL_PDF_SHADOW_BATCH_EXPECTED_COUNT ?? "26");
const failures = [];

registerTypeScriptHook();

const batch = require(path.join(rootDir, "src/lib/record-clearing/official-pdf-shadow-batch.ts"));
const recordClearing = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));
const draftPaths = batch.discoverApprovedFieldMapDraftPaths(rootDir);

if (draftPaths.length !== expectedApprovedCount) {
  failures.push(`Expected ${expectedApprovedCount} approved drafts, found ${draftPaths.length}.`);
}

for (const draftPath of draftPaths) {
  const draft = JSON.parse(fs.readFileSync(path.join(rootDir, draftPath), "utf8"));
  const gateFailures = batch.getDraftGateFailures(draft);
  if (gateFailures.length > 0) failures.push(`${draftPath}: ${gateFailures.join("; ")}`);
}

let summary = null;
try {
  summary = await batch.renderOfficialPdfShadowBatch({ rootDir, sourceDir, outputDir, draftPaths });
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
}

if (summary) {
  if (!fs.existsSync(summary.manifestPath)) failures.push("Batch manifest was not written.");
  if (summary.approvedDraftCount !== draftPaths.length) failures.push("Manifest approvedDraftCount does not match discovered drafts.");
  for (const result of summary.results) {
    if (result.gatingStatus.approvalExists !== true) failures.push(`${result.sourceDraftJson}: approval gate missing in manifest.`);
    if (result.gatingStatus.visualReviewRequired !== true) failures.push(`${result.sourceDraftJson}: visual review gate missing in manifest.`);
    if (result.gatingStatus.lifecycle !== "none") failures.push(`${result.sourceDraftJson}: lifecycle gate changed in manifest.`);
    if (result.gatingStatus.rendererReady !== false) failures.push(`${result.sourceDraftJson}: rendererReady gate changed in manifest.`);
    if (result.gatingStatus.notPromoted !== true) failures.push(`${result.sourceDraftJson}: promotion block missing in manifest.`);
    if (result.gatingStatus.shadowOnly !== true) failures.push(`${result.sourceDraftJson}: shadow-only gate missing in manifest.`);
    if (result.outputPath && !fs.existsSync(result.outputPath)) failures.push(`${result.sourceDraftJson}: output path missing on disk.`);
    if (result.outputPath && result.outputSha256 === result.sourceSha256) failures.push(`${result.sourceDraftJson}: output hash matches source hash.`);
  }
}

const publicIndex = fs.readFileSync(path.join(rootDir, "src/lib/record-clearing/index.ts"), "utf8");
if (publicIndex.includes("official-pdf-shadow-batch")) {
  failures.push("Bulk shadow harness must not be exported from the public record-clearing index.");
}

const liveRouteImports = grep(["src/app"], "official-pdf-shadow-batch");
if (liveRouteImports.length > 0) failures.push(`Live route imports bulk shadow harness: ${liveRouteImports.join("; ")}`);

const approvedCodes = new Set(draftPaths.map((draftPath) => {
  const draft = JSON.parse(fs.readFileSync(path.join(rootDir, draftPath), "utf8"));
  return draft.jurisdictionCode;
}).filter(Boolean));
for (const code of approvedCodes) {
  const live = Array.isArray(recordClearing.recordClearingJurisdictions)
    ? recordClearing.recordClearingJurisdictions.some((jurisdiction) => jurisdiction.jurisdictionCode === code)
    : false;
  if (live) failures.push(`${code} must not appear in recordClearingJurisdictions/live selector wiring.`);
}

const harnessSource = fs.readFileSync(path.join(rootDir, "src/lib/record-clearing/official-pdf-shadow-batch.ts"), "utf8");
if (/\breplacement_candidate\b/.test(harnessSource) || /\bverified_replacement\b/.test(harnessSource)) {
  failures.push("Bulk shadow harness source must not contain promotion lifecycle labels.");
}

const protectedStatus = gitStatus([
  "src/app",
  "src/app/api/rcap",
  "src/lib/rcap/documents",
  "src/lib/rcap/state-packs",
  "src/lib/rcap-intake",
  "src/lib/documents",
  "src/lib/document-generation",
  "src/lib/reports",
  "supabase",
  "migrations",
  "private",
  "package-lock.json"
]);
if (protectedStatus.length > 0) failures.push(`Protected files changed: ${protectedStatus.join("; ")}`);

if (failures.length > 0) {
  console.error("Official PDF shadow batch verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Official PDF shadow batch verification passed.");
console.log(`Approved drafts discovered: ${draftPaths.length}`);
console.log(`Rendered: ${summary?.renderedCount ?? 0}`);
console.log(`Blocked: ${summary?.blockedCount ?? 0}`);
console.log(`Manifest: ${summary ? path.relative(rootDir, summary.manifestPath) : "none"}`);
console.log("Approval metadata present: yes");
console.log("visual_review_required remains true: yes");
console.log("lifecycle remains none: yes");
console.log("rendererReady remains false: yes");
console.log("Live route imports bulk harness: no");
console.log("Live selector wiring for approved batch: no");
console.log("Protected route/generator/Supabase/migration/private/package-lock changes: no");

function registerTypeScriptHook() {
  const originalLoader = Module._extensions[".ts"];
  Module._extensions[".ts"] = function loadTs(module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true
      },
      fileName: filename
    }).outputText;
    module._compile(output, filename);
  };
  process.once("exit", () => {
    Module._extensions[".ts"] = originalLoader;
  });
}

function gitStatus(paths) {
  const result = spawnSync("git", ["status", "--short", "--", ...paths], {
    cwd: rootDir,
    encoding: "utf8"
  });
  return result.stdout.trim().split(/\r?\n/).filter(Boolean);
}

function grep(paths, pattern) {
  const result = spawnSync("grep", ["-R", "-n", pattern, ...paths], {
    cwd: rootDir,
    encoding: "utf8"
  });
  if (result.status === 1) return [];
  return result.stdout.trim().split(/\r?\n/).filter(Boolean);
}
