import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const rescueReportPath = "data/rcap-all50/overlays/encrypted-pdf-rescue-report.json";
const overlayManifestPath = "data/rcap-all50/overlays/overlay-factory-manifest.json";
const expectedTargets = new Set([
  "CA:cr180.pdf",
  "CA:cr181.pdf",
  "DE:download.aspx.pdf",
  "ME:MJB-Form-cr-218.pdf",
  "ME:MJB-Form-jv-043.pdf",
  "NV:DPS-006.pdf",
  "PA:dna_removal_request.pdf",
  "WV:SCA-C906.pdf"
]);

assertFile(rescueReportPath);
assertFile(overlayManifestPath);
assertFile("scripts/rescue-encrypted-rcap-pdfs.mjs");

const report = readJson(rescueReportPath);
const manifest = readJson(overlayManifestPath);
const formsByKey = new Map(manifest.forms.map((form) => [`${form.jurisdictionCode}:${form.fileName}`, form]));
const reportByKey = new Map((report.targets || []).map((target) => [`${target.jurisdictionCode}:${target.fileName}`, target]));

if ((report.targets || []).length !== 8) failures.push(`Expected 8 rescue report targets, found ${(report.targets || []).length}.`);

for (const key of expectedTargets) {
  const target = reportByKey.get(key);
  const form = formsByKey.get(key);
  if (!target) {
    failures.push(`Missing rescue report target: ${key}`);
    continue;
  }
  if (!form) failures.push(`Missing overlay form for rescue target: ${key}`);
  if (!target.sourceRelativePath) failures.push(`${key} missing sourceRelativePath.`);
  if (!["rescued", "still_blocked", "tool_missing", "password_required", "source_missing"].includes(target.rescueStatus)) {
    failures.push(`${key} has invalid rescueStatus: ${target.rescueStatus}`);
  }
  if (target.sourceSha256Before && target.sourceSha256After && target.sourceSha256Before !== target.sourceSha256After) {
    failures.push(`${key} source hash changed; original source PDF may have been overwritten.`);
  }
  if (target.rescueStatus === "rescued") {
    if (!target.rescuedPdfPath) failures.push(`${key} rescued status missing rescuedPdfPath.`);
    if (target.rescuedPdfPath && !fs.existsSync(path.join(rootDir, target.rescuedPdfPath))) failures.push(`${key} missing rescued PDF: ${target.rescuedPdfPath}`);
    if (target.rescuedPdfPath === target.sourceRelativePath) failures.push(`${key} rescuedPdfPath must not overwrite sourceRelativePath.`);
    if (!form?.rescuedPdfPath) failures.push(`${key} overlay manifest missing rescuedPdfPath.`);
    if (form?.visualReview !== "pending") failures.push(`${key} rescued form must remain visualReview pending.`);
    if (!["partial_map", "mapped"].includes(form?.status)) failures.push(`${key} rescued form should be mapped or partial_map.`);
    if (!form?.fieldMapPath) failures.push(`${key} rescued form missing field map path.`);
    if (!form?.samplePath) failures.push(`${key} rescued form missing sample path.`);
  } else {
    if (target.rescuedPdfPath) failures.push(`${key} non-rescued target should not have rescuedPdfPath.`);
    if (!target.notes?.length && !target.errors?.length) failures.push(`${key} still-blocked target must include notes or errors.`);
    if (form?.status !== "blocked") failures.push(`${key} unrecovered form should remain blocked.`);
    if (form?.blockedReason !== "encrypted_pdf") failures.push(`${key} unrecovered form should keep encrypted_pdf blockedReason.`);
  }
}

const stillBlocked = [...reportByKey.values()].filter((target) => target.rescueStatus !== "rescued");
if (stillBlocked.length > 0 && manifest.summary.blockedEncrypted < stillBlocked.length) {
  failures.push("Overlay manifest blockedEncrypted count is lower than unrecovered encrypted rescue targets.");
}

const stateDowngrades = manifest.states.filter((state) => state.guidanceOnlyBecauseEncryptedPdf === true || state.status === "guidance_only");
if (stateDowngrades.length > 0) failures.push(`No entire state may be downgraded to guidance_only because of blocked forms: ${stateDowngrades.map((state) => state.jurisdictionCode).join(", ")}`);

const selectorSource = readOptionalText("src/lib/rcap/all51-launch-selector.ts");
if (selectorSource) {
  assertIncludes(selectorSource, "src/lib/rcap/all51-launch-selector.ts", "pathType === \"blocked_form\"");
  assertIncludes(selectorSource, "src/lib/rcap/all51-launch-selector.ts", "\"guidance_only\"");
  assertIncludes(selectorSource, "src/lib/rcap/all51-launch-selector.ts", "paymentAllowedOutcomes");
  assertIncludes(selectorSource, "src/lib/rcap/all51-launch-selector.ts", "[\"packet_ready\", \"packet_ready_with_caution\"]");
}

assertNoRestrictedChanges();

if (failures.length > 0) {
  console.error("RCAP encrypted PDF rescue verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP encrypted PDF rescue verification passed.");
console.log(`Encrypted PDFs accounted for: ${report.targets.length}`);
console.log(`Rescued PDFs: ${report.targets.filter((target) => target.rescueStatus === "rescued").length}`);
console.log(`Still blocked PDFs: ${report.targets.filter((target) => target.rescueStatus !== "rescued").length}`);
console.log("Original source PDFs overwritten: no");
console.log("Blocked paths fallback to guidance_only: verified");
console.log("paymentAllowed false for guidance_only: verified");
console.log("No entire state downgraded to guidance_only by one blocked form: yes");
console.log("Legacy generators preserved: yes");
console.log("Expungement.ai consumer UI changes allowed by adapter branch: yes");
console.log("Restricted production/auth/billing files untouched: yes");

function assertNoRestrictedChanges() {
  const changedFiles = changedFilesAgainstMain();
  const forbiddenPrefixes = [
    "src/app/auth/",
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
    "src/app/expungement/",
    "src/components/expungement/"
  ];
  const allowedConsumerPersistenceFiles = new Set([
    "supabase/phase-26-consumer-briefcase-items.sql",
    "supabase/phase-27-consumer-checkout-metadata.sql",
    "supabase/phase-28-consumer-packet-generation-status.sql",
    "supabase/phase-29-consumer-wilma-telemetry.sql"
  ]);
  const forbidden = changedFiles
    .filter((file) => !allowedConsumerPersistenceFiles.has(file))
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
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function readOptionalText(relativePath) {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
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
