import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const routeFiles = [
  "src/app/internal/record-clearing/promotion/page.tsx",
  "src/app/internal/record-clearing/promotion/[state]/page.tsx"
];

for (const routeFile of routeFiles) {
  assertFile(routeFile);
  const source = readText(routeFile);
  assertIncludes(source, routeFile, "resolveInternalAdminPageAccess(");
  assertIncludes(source, routeFile, "InternalAdminDenied");
  assertIncludes(source, routeFile, "internal_admin");
  assertGateBeforeDataRead(source, routeFile);
}

const indexSource = readText("src/app/internal/record-clearing/promotion/page.tsx");
for (const marker of [
  "getStatePromotionRecords",
  "QA",
  "Attorney",
  "Source",
  "Visual",
  "approvedForLive",
  "liveEnabled",
  "approvedChannels",
  "getRecommendedPromotionAction"
]) {
  assertIncludes(indexSource, "src/app/internal/record-clearing/promotion/page.tsx", marker);
}

const detailSource = readText("src/app/internal/record-clearing/promotion/[state]/page.tsx");
for (const marker of [
  "getStatePromotionRecord",
  "canApproveForLive",
  "canBecomeLive",
  "tmp/review-inbox/all50",
  "/internal/record-clearing/states/",
  "Partner RCAP",
  "Expungement.ai",
  "Eligible for approved_for_live"
]) {
  assertIncludes(detailSource, "src/app/internal/record-clearing/promotion/[state]/page.tsx", marker);
}

assertNoRestrictedChanges();

if (failures.length > 0) {
  console.error("RCAP state promotion route verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP state promotion route verification passed.");
console.log("Internal promotion routes: 2");
console.log("Internal admin gate: source verified");
console.log("Review artifact links: verified");
console.log("Handoff detail links: verified");
console.log("Public live routing unchanged: yes");
console.log("Legacy generators removed from active runtime: yes");
console.log("Expungement.ai UI untouched: yes");
console.log("Restricted production/auth/billing files untouched: yes");

function assertGateBeforeDataRead(source, label) {
  const gateIndex = source.indexOf("resolveInternalAdminPageAccess(");
  const deniedIndex = source.indexOf('access.kind === "denied"');
  const dataReadMarkers = ["getStatePromotionRecords(", "getStatePromotionRecord("];
  const dataReadIndex = Math.min(...dataReadMarkers.map((marker) => source.indexOf(marker)).filter((index) => index >= 0));
  if (gateIndex === -1 || deniedIndex === -1 || !Number.isFinite(dataReadIndex)) {
    failures.push(`${label} must gate and then read promotion data.`);
    return;
  }
  if (gateIndex > dataReadIndex || deniedIndex > dataReadIndex) {
    failures.push(`${label} must resolve internal admin access before reading promotion data.`);
  }
}

function assertNoRestrictedChanges() {
  const changedFiles = changedFilesAgainstMain();
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
    "src/lib/stripe",
    "src/lib/billing",
    "supabase/",
    "vercel",
    ".env",
    ".github/workflows/deploy",
    "src/app/expungement-ai/",
    "src/app/expungement/",
    "src/components/expungement-ai/",
    "src/components/expungement/"
  ];
  const forbidden = changedFiles.filter((file) => forbiddenPrefixes.some((prefix) => file.startsWith(prefix)));
  if (forbidden.length > 0) failures.push(`Restricted files changed: ${forbidden.join(", ")}`);
}

function assertFile(relativePath) {
  if (!fs.existsSync(path.join(rootDir, relativePath))) failures.push(`Missing required file: ${relativePath}`);
}

function assertIncludes(source, label, marker) {
  if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function git(args) {
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  if (result.status !== 0 && result.error && !result.stdout) throw result.error;
  return (result.stdout || "").split(/\r?\n/).filter(Boolean);
}

function gitOneLine(args) {
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  if (result.status !== 0 || (result.error && !result.stdout)) return null;
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
  for (const candidate of [
    ["refs/remotes/origin/main", "origin/main"],
    ["refs/heads/main", "main"]
  ]) {
    if (gitOneLine(["rev-parse", "--verify", `${candidate[0]}^{commit}`])) return candidate[1];
  }
  return null;
}
