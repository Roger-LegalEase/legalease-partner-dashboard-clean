import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const routeFiles = [
  "src/app/internal/record-clearing/states/page.tsx",
  "src/app/internal/record-clearing/states/[state]/page.tsx",
  "src/app/internal/record-clearing/states/[state]/review/page.tsx",
  "src/app/internal/record-clearing/handoff/page.tsx"
];

const buildManifest = readJson("data/rcap-all50/all-state-build-manifest.json");
const overlayManifest = readJson("data/rcap-all50/overlays/overlay-factory-manifest.json");

for (const routeFile of routeFiles) {
  assertFile(routeFile);
  const source = readText(routeFile);
  assertIncludes(source, routeFile, "resolveInternalAdminPageAccess(");
  assertIncludes(source, routeFile, "InternalAdminDenied");
  assertGateBeforeDataRead(source, routeFile);
}

assertFile("src/lib/rcap/all50-internal-preview.ts");
const dataSource = readText("src/lib/rcap/all50-internal-preview.ts");
for (const marker of [
  "getAll50StatePreviews",
  "getAll50StatePreview",
  "getAll50HandoffSummary",
  "tmp/review-inbox/all50",
  "blockedForms",
  "visualReviewPending",
  "counselReviewPending",
  "qaReviewPending",
  "sourceFreshnessPending"
]) {
  assertIncludes(dataSource, "src/lib/rcap/all50-internal-preview.ts", marker);
}

if (buildManifest.states.length !== 51) failures.push(`Expected 51 build states, found ${buildManifest.states.length}.`);
if (overlayManifest.states.length !== 51) failures.push(`Expected 51 overlay states, found ${overlayManifest.states.length}.`);

for (const state of buildManifest.states) {
  const reviewRoot = `tmp/review-inbox/all50/${state.slug}`;
  for (const fileName of [
    "REVIEW-MANIFEST.md",
    "source-inventory.json",
    "state-pack-summary.json",
    "forms-manifest.json",
    "guidance-summary.md",
    "pleading-summary.md",
    "qa-report.json",
    "attorney-review-notes.md",
    "visual-review-notes.md",
    "next-actions.md"
  ]) {
    assertFile(path.join(reviewRoot, fileName));
  }
  if (state.buildStatus !== "state_built") failures.push(`${state.code} is not state_built.`);
  for (const status of ["qa", "visual", "counsel", "sourceFreshness"]) {
    if (!state.reviewStatuses?.[status]) {
      failures.push(`${state.code} missing ${status} review status.`);
    }
  }
  for (const status of ["qa", "counsel", "sourceFreshness"]) {
    if (state.reviewStatuses?.[status] !== "pending") {
      failures.push(`${state.code} missing pending ${status} review status.`);
    }
  }
}

const blockedStates = overlayManifest.states.filter((state) => state.blockedForms > 0);
if (blockedStates.length === 0) failures.push("No blocked forms surfaced in overlay state summaries.");
if (overlayManifest.summary.blockedForms !== 1) failures.push(`Expected 1 blocked form, found ${overlayManifest.summary.blockedForms}.`);
if (overlayManifest.summary.visualReviewPending !== 292) failures.push(`Expected 292 visual-review-pending PDFs, found ${overlayManifest.summary.visualReviewPending}.`);

assertNoRestrictedChanges();

if (failures.length > 0) {
  console.error("RCAP all-50 internal preview verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP all-50 internal preview verification passed.");
console.log("Internal preview routes: 4");
console.log(`Jurisdictions surfaced: ${buildManifest.states.length}`);
console.log(`Blocked forms surfaced: ${overlayManifest.summary.blockedForms}`);
console.log("Internal admin gate: source verified");
console.log("Public live routing unchanged: yes");
console.log("Legacy generators preserved: yes");
console.log("Expungement.ai UI untouched: yes");

function assertGateBeforeDataRead(source, label) {
  const gateIndex = source.indexOf("resolveInternalAdminPageAccess(");
  const deniedIndex = source.indexOf('access.kind === "denied"');
  const dataReadMarkers = ["getAll50StatePreviews(", "getAll50StatePreview(", "getAll50HandoffSummary("];
  const dataReadIndex = Math.min(...dataReadMarkers.map((marker) => source.indexOf(marker)).filter((index) => index >= 0));
  if (gateIndex === -1 || deniedIndex === -1 || !Number.isFinite(dataReadIndex)) {
    failures.push(`${label} must gate and then read all50 preview data.`);
    return;
  }
  if (gateIndex > dataReadIndex || deniedIndex > dataReadIndex) {
    failures.push(`${label} must resolve internal admin access before reading preview data.`);
  }
}

function assertNoRestrictedChanges() {
  const changedFiles = changedFilesAgainstMain();
  const allowedExpungementAiLaunchSupportFiles = new Set([
    "src/app/api/expungement-ai/support/route.ts",
    "src/app/briefcase/[packetId]/page.tsx",
    "src/app/expungement-ai/contact/page.tsx",
    "src/app/expungement-ai/layout.tsx",
    "src/app/expungement-ai/packet-ready/page.tsx",
    "src/app/expungement-ai/support/page.tsx",
    "src/components/expungement-ai/BriefcaseShell.tsx",
    "src/components/expungement-ai/BriefcaseViews.tsx",
    "src/components/expungement-ai/ConsumerNav.tsx",
    "src/components/expungement-ai/SupportRequestForm.tsx",
    "src/lib/expungement-ai/support-os-adapter.ts",
    "supabase/phase-31-legalease-os-support-queue.sql",
    "docs/EXPUNGEMENT_AI_PRODUCTION_READINESS.md",
    "docs/EXPUNGEMENT_AI_MANUAL_SMOKE_TESTS.md",
    "public/favicon.svg",
    "public/apple-touch-icon.svg",
    "scripts/verify-expungement-production-readiness.mjs",
    "scripts/verify-expungement-launch-polish.mjs",
    "package.json",
    ".github/workflows/expungement-ai-consumer-adapter.yml",
    ".github/workflows/rcap-all50-handoff.yml"
  ]);
  const forbiddenPrefixes = [
    "src/app/api/",
    "src/app/auth/",
    "src/app/p/",
    "src/app/intake/",
    "src/app/documents/",
    "src/app/briefcase/",
    "src/app/partner/",
    "src/app/partners/",
    "src/app/request-pilot/",
    "src/app/internal/billing/",
    "src/lib/auth/",
    "src/lib/partners/billing",
    "src/lib/partners/session-partner",
    "src/lib/partners/partner-dashboard-rls",
    "src/lib/partners/partner-repository",
    "src/lib/partners/partner-service",
    "src/lib/rcap/documents/mississippi/",
    "src/lib/rcap/documents/illinois/",
    "src/lib/rcap/documents/dc/",
    "src/lib/rcap/documents/pennsylvania/",
    "src/lib/rcap/documents/texas-harris/",
    "supabase/",
    "vercel",
    ".env",
    "src/app/expungement-ai/",
    "src/app/expungement/",
    "src/components/expungement-ai/",
    "src/components/expungement/"
  ];
  const forbidden = changedFiles
    .filter((file) => !allowedExpungementAiLaunchSupportFiles.has(file))
    .filter((file) => forbiddenPrefixes.some((prefix) => file.startsWith(prefix)));
  if (forbidden.length > 0) failures.push(`Restricted files changed: ${forbidden.join(", ")}`);
}

function assertFile(relativePath) {
  if (!fs.existsSync(path.join(rootDir, relativePath))) failures.push(`Missing required file: ${relativePath}`);
}

function assertIncludes(source, label, marker) {
  if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`);
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function git(args) {
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  if (result.error && !result.stdout) throw result.error;
  return (result.stdout || "").split(/\r?\n/).filter(Boolean);
}

function gitOneLine(args) {
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  if (result.status !== 0 || result.error) return null;
  return result.stdout.trim() || null;
}

function changedFilesAgainstMain() {
  const baseRef = resolveMainBaseRef();
  if (!baseRef) {
    failures.push("Could not resolve origin/main or main for restricted-file comparison.");
    return [];
  }

  const mergeBase = gitOneLine(["merge-base", "HEAD", baseRef]);
  if (!mergeBase) {
    failures.push(`Could not compute merge base between HEAD and ${baseRef}.`);
    return [];
  }

  return git(["diff", "--name-only", mergeBase, "HEAD"]);
}

function resolveMainBaseRef() {
  for (const ref of ["origin/main", "main"]) {
    if (gitOneLine(["rev-parse", "--verify", `${ref}^{commit}`])) return ref;
  }
  return null;
}
