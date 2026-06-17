import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = process.env.OFFICIAL_FORMS_SOURCE_DIR
  ?? "/workspaces/legalease-partner-dashboard-clean/private/Nationwide Record Clearing";
const outputDir = path.join(rootDir, "tmp/official-pdf-implementation-gate");
const shadowOutputDir = path.join(rootDir, "tmp/official-pdf-shadow-batch");
const expectedApprovedCount = Number(process.env.OFFICIAL_PDF_IMPLEMENTATION_GATE_EXPECTED_COUNT ?? "26");
const failures = [];

registerTypeScriptHook();

const batch = require(path.join(rootDir, "src/lib/record-clearing/official-pdf-shadow-batch.ts"));
const gate = require(path.join(rootDir, "src/lib/record-clearing/official-pdf-implementation-gate.ts"));

const draftPaths = batch.discoverApprovedFieldMapDraftPaths(rootDir);

// Snapshot every draft on disk BEFORE evaluation so we can prove the gate is read-only.
const beforeHashes = snapshotDrafts(draftPaths);

if (draftPaths.length !== expectedApprovedCount) {
  failures.push(`Expected ${expectedApprovedCount} approved drafts, found ${draftPaths.length}.`);
}

let report = null;
try {
  report = await gate.evaluateOfficialPdfImplementationGate({ rootDir, sourceDir, outputDir, shadowOutputDir, draftPaths });
} catch (error) {
  failures.push(`Gate evaluation threw: ${error instanceof Error ? error.message : String(error)}`);
}

// The gate must never mutate a draft.
const afterHashes = snapshotDrafts(draftPaths);
for (const draftPath of draftPaths) {
  if (beforeHashes.get(draftPath) !== afterHashes.get(draftPath)) {
    failures.push(`${draftPath}: draft file was modified by the gate (must be read-only).`);
  }
}

// Defense in depth: scan EVERY field-map draft on disk (not just the discovered/approved
// set) so a draft that was promoted out of the approved set is still caught.
const draftsDir = path.join(rootDir, "docs/record-clearing/field-map-drafts");
const allDraftFiles = fs.existsSync(draftsDir)
  ? fs.readdirSync(draftsDir).filter((entry) => entry.endsWith(".field-map-review.json"))
  : [];
for (const entry of allDraftFiles) {
  const draft = readJson(path.join(draftsDir, entry));
  if (!draft) continue;
  if (draft.lifecycle === "replacement_candidate" || draft.lifecycle === "verified_replacement") {
    failures.push(`field-map-drafts/${entry}: draft is promoted to ${draft.lifecycle}.`);
  }
  if (draft.rendererReady === true) {
    failures.push(`field-map-drafts/${entry}: rendererReady is true (no draft may be renderer-ready).`);
  }
}

// Every approved draft on disk must still be shadow-only and unpromoted.
for (const draftPath of draftPaths) {
  const draft = readJson(path.join(rootDir, draftPath));
  if (!draft) {
    failures.push(`${draftPath}: unreadable after evaluation.`);
    continue;
  }
  if (draft.lifecycle !== "none") failures.push(`${draftPath}: lifecycle is ${JSON.stringify(draft.lifecycle)} (must be none).`);
  if (draft.rendererReady !== false) failures.push(`${draftPath}: rendererReady is ${JSON.stringify(draft.rendererReady)} (must be false).`);
  if (draft.visual_review_required !== true) failures.push(`${draftPath}: visual_review_required is ${JSON.stringify(draft.visual_review_required)} (must be true).`);
  if (draft.lifecycle === "replacement_candidate" || draft.lifecycle === "verified_replacement") {
    failures.push(`${draftPath}: draft is promoted to ${draft.lifecycle}.`);
  }
}

if (report) {
  const reportPath = path.join(outputDir, "official-pdf-implementation-gate-report.json");
  if (!fs.existsSync(reportPath)) failures.push("Gate report JSON was not written under tmp/.");

  const validStatuses = new Set(gate.IMPLEMENTATION_GATE_STATUSES);
  const byStatus = report.statusCounts;
  const statusSum = Object.values(byStatus).reduce((total, count) => total + count, 0);
  if (statusSum !== report.evaluatedCount) {
    failures.push(`Status counts (${statusSum}) do not sum to evaluated drafts (${report.evaluatedCount}).`);
  }
  if (report.evaluatedCount !== draftPaths.length) {
    failures.push(`Report evaluatedCount (${report.evaluatedCount}) does not match discovered drafts (${draftPaths.length}).`);
  }

  const bySlug = new Map(report.results.map((result) => [result.formSlug, result]));

  // California CR-180 / CR-181 must remain blocked_pdf_render unless the PDFDict issue is fixed.
  for (const slug of ["california-cr-180", "california-cr-181"]) {
    const result = bySlug.get(slug);
    if (!result) {
      failures.push(`${slug}: missing from gate report.`);
    } else if (result.primaryStatus !== "blocked_pdf_render") {
      failures.push(`${slug}: expected blocked_pdf_render, got ${result.primaryStatus}.`);
    }
  }

  for (const result of report.results) {
    if (!validStatuses.has(result.primaryStatus)) {
      failures.push(`${result.formSlug}: invalid primaryStatus ${result.primaryStatus}.`);
    }
    // The gate is non-promotional: it must never echo a promoted lifecycle.
    if (result.lifecycle !== "none") failures.push(`${result.formSlug}: report lifecycle is not none.`);
    if (result.rendererReady !== false) failures.push(`${result.formSlug}: report rendererReady is not false.`);
    if (result.visualReviewRequired !== true) failures.push(`${result.formSlug}: report visual_review_required is not true.`);
    for (const finding of [result.primaryStatus, ...result.secondaryFindings]) {
      if (finding === "replacement_candidate" || finding === "verified_replacement") {
        failures.push(`${result.formSlug}: report contains a promotion lifecycle label.`);
      }
    }
  }

  for (const check of report.globalChecks) {
    if (!check.pass) failures.push(`Global check failed: ${check.id} -> ${check.detail}`);
  }
}

// The gate module itself must not be exported publicly and must not carry promotion labels.
const publicIndex = fs.readFileSync(path.join(rootDir, "src/lib/record-clearing/index.ts"), "utf8");
if (publicIndex.includes("official-pdf-implementation-gate")) {
  failures.push("Implementation gate must not be exported from the public record-clearing index.");
}

const liveRouteImports = grep(["src/app"], "official-pdf-implementation-gate");
if (liveRouteImports.length > 0) failures.push(`Live route imports the implementation gate: ${liveRouteImports.join("; ")}`);

const gateSource = fs.readFileSync(path.join(rootDir, "src/lib/record-clearing/official-pdf-implementation-gate.ts"), "utf8");
// Promotion lifecycle labels may only appear in guard checks that REJECT them, never as assignments.
if (/lifecycle\s*[:=]\s*["'](replacement_candidate|verified_replacement)["']/.test(gateSource)) {
  failures.push("Implementation gate source assigns a promotion lifecycle label.");
}
if (/rendererReady\s*[:=]\s*true/.test(gateSource)) {
  failures.push("Implementation gate source sets rendererReady true.");
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
  console.error("Official PDF implementation-gate verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Official PDF implementation-gate verification passed.");
console.log(`Approved drafts evaluated: ${report?.evaluatedCount ?? 0}`);
console.log("Status counts:");
for (const [status, count] of Object.entries(report?.statusCounts ?? {})) {
  console.log(`  ${status}: ${count}`);
}
console.log(`Top implementation-gate-pass candidates: ${(report?.topImplementationGatePassCandidates ?? []).join(", ") || "none"}`);
console.log("California CR-180/CR-181 remain blocked_pdf_render: yes");
console.log("All drafts remain lifecycle none / rendererReady false / visual_review_required true: yes");
console.log("No draft was modified by the gate: yes");
console.log("No live route imports / public selector wiring / public index export: none");
console.log("Protected route/generator/Supabase/migration/private/package-lock changes: none");
console.log(`Report: ${path.relative(rootDir, path.join(outputDir, "official-pdf-implementation-gate-report.json"))}`);

function snapshotDrafts(paths) {
  const map = new Map();
  for (const draftPath of paths) {
    map.set(draftPath, crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, draftPath))).digest("hex"));
  }
  return map;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

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
  return (result.stdout ?? "").trim().split(/\r?\n/).filter(Boolean);
}

function grep(paths, pattern) {
  const existing = paths.filter((target) => fs.existsSync(path.join(rootDir, target)));
  if (existing.length === 0) return [];
  const result = spawnSync("grep", ["-R", "-n", pattern, ...existing], {
    cwd: rootDir,
    encoding: "utf8"
  });
  if (result.status === 1) return [];
  return (result.stdout ?? "").trim().split(/\r?\n/).filter(Boolean);
}
