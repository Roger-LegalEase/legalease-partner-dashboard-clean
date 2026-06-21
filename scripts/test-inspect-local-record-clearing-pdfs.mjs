import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectLocalRecordClearingPdfs, inspectPdfBytes, mapSourceFolder } from "./inspect-local-record-clearing-pdfs.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "record-clearing-pdf-inspection-"));
const sharedReportPaths = [
  path.join(rootDir, "data/record-clearing/pdf-inspection/latest-report.json"),
  path.join(rootDir, "data/record-clearing/pdf-inspection/latest-report.md"),
  path.join(rootDir, "data/record-clearing/pdf-inspection/migration-triage.json"),
  path.join(rootDir, "data/record-clearing/pdf-inspection/migration-triage.md")
];
const sharedReportSnapshot = snapshotSharedReports();

try {
  await assertMissingSourceFailsClearly();
  await assertEmptySourceDirectoryProducesReport();
  await assertFolderMapping();
  await assertInspectionReport();
  await assertWrittenReportsArePathSafeAndIncludeTriage();
  assertRawInspectionRules();
  assertPackageScript();
  assertGitignoreSafety();
  assertNoLiveRoutesModified();
  console.log("Local official PDF inspection tests passed.");
} finally {
  restoreSharedReports(sharedReportSnapshot);
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

async function assertMissingSourceFailsClearly() {
  await assert.rejects(
    () => inspectLocalRecordClearingPdfs({ sourceDir: "", writeReports: false }),
    /OFFICIAL_FORMS_SOURCE_DIR is required/
  );
}

async function assertEmptySourceDirectoryProducesReport() {
  const emptyDir = path.join(tempRoot, "empty");
  fs.mkdirSync(emptyDir);
  const report = await inspectLocalRecordClearingPdfs({ sourceDir: emptyDir, writeReports: false });
  assert.equal(report.summary.totalPdfCount, 0);
  assert.deepEqual(report.summary.unknownFolders, []);
  assertCanonicalTriageKeys(report.migrationTriage);
  for (const key of canonicalTriageKeys()) {
    assert.deepEqual(report.migrationTriage[key], []);
  }
}

function assertFolderMapping() {
  assert.deepEqual(mapSourceFolder("LegalEase_New_Hampshire"), {
    jurisdictionCode: "NH",
    sourceFolderName: "LegalEase_New_Hampshire",
    normalizedJurisdictionName: "New Hampshire",
    folderWarnings: []
  });
  assert.deepEqual(mapSourceFolder("LegalEase_North_Dakota")?.jurisdictionCode, "ND");
  assert.deepEqual(mapSourceFolder("LegalEase_Rhode_Island")?.jurisdictionCode, "RI");
  assert.deepEqual(mapSourceFolder("LegalEase_South_Carolina")?.jurisdictionCode, "SC");
  assert.deepEqual(mapSourceFolder("LegalEase_Washington_State")?.jurisdictionCode, "WA");
  assert.deepEqual(mapSourceFolder("LegalEase_DC")?.jurisdictionCode, "DC");
  assert.deepEqual(mapSourceFolder("LegalEase_District_of_Columbia")?.jurisdictionCode, "DC");
  assert.deepEqual(mapSourceFolder("LegalEase_Washington_DC")?.jurisdictionCode, "DC");
  assert.deepEqual(mapSourceFolder("LegalEase Arkanasa"), {
    jurisdictionCode: "AR",
    sourceFolderName: "LegalEase Arkanasa",
    normalizedJurisdictionName: "Arkansas",
    folderWarnings: ["folder_name_misspelled"]
  });
  assert.deepEqual(mapSourceFolder("LegalEase_Arkanasa")?.folderWarnings, ["folder_name_misspelled"]);
  assert.deepEqual(mapSourceFolder("LegalEase Tennesee"), {
    jurisdictionCode: "TN",
    sourceFolderName: "LegalEase Tennesee",
    normalizedJurisdictionName: "Tennessee",
    folderWarnings: ["folder_name_misspelled"]
  });
  assert.deepEqual(mapSourceFolder("LegalEase_Tennesee")?.folderWarnings, ["folder_name_misspelled"]);
  assert.equal(mapSourceFolder("LegalEase_Not_A_State"), null);
}

async function assertInspectionReport() {
  const sourceDir = path.join(tempRoot, "source");
  const alDir = path.join(sourceDir, "LegalEase_Alabama");
  const unknownDir = path.join(sourceDir, "LegalEase_Not_A_State");
  fs.mkdirSync(alDir, { recursive: true });
  fs.mkdirSync(unknownDir, { recursive: true });
  fs.writeFileSync(path.join(alDir, "notes.txt"), "skip me");

  const xfaPdf = makePdf({ acroForm: true, fieldNames: ["ClientName"], xfa: true, textLayer: true });
  const noTextPdf = makePdf({ textLayer: false });
  const badPdf = Buffer.from("not a pdf");
  fs.writeFileSync(path.join(alDir, "xfa.pdf"), xfaPdf);
  fs.writeFileSync(path.join(alDir, "scanned.pdf"), noTextPdf);
  fs.writeFileSync(path.join(alDir, "unreadable.pdf"), badPdf);

  const report = await inspectLocalRecordClearingPdfs({ sourceDir, writeReports: false });
  assert.equal(report.summary.totalPdfCount, 3);
  assert.deepEqual(report.summary.unknownFolders, ["LegalEase_Not_A_State"]);
  assert.equal(report.skippedFiles.some((file) => file.relativePath === path.join("LegalEase_Alabama", "notes.txt")), true);
  assert.equal(report.perJurisdiction.length, 1);
  assert.equal(report.perJurisdiction[0].jurisdictionCode, "AL");
  assert.equal(report.perJurisdiction[0].scanned_pdf, 1);
  assert.equal(report.perJurisdiction[0].migrationBucket, "manual_review_heavy");

  const xfa = report.pdfs.find((pdf) => pdf.fileName === "xfa.pdf");
  assert.equal(xfa?.possibleXfaDetected, true);
  assert.equal(xfa?.classification, "xfa_pdf");
  assert.equal(xfa?.sha256, crypto.createHash("sha256").update(xfaPdf).digest("hex"));

  const scanned = report.pdfs.find((pdf) => pdf.fileName === "scanned.pdf");
  assert.equal(scanned?.hasAcroForm, false);
  assert.equal(scanned?.hasExtractableTextLayer, false);
  assert.notEqual(scanned?.classification, "flat_pdf");

  const unreadable = report.pdfs.find((pdf) => pdf.fileName === "unreadable.pdf");
  assert.equal(unreadable?.classification, "unreadable");
  assert.equal(unreadable?.possibleXfaDetected, "unknown");
}

async function assertWrittenReportsArePathSafeAndIncludeTriage() {
  const sourceDir = path.join(tempRoot, "written-source");
  const scannedDir = path.join(sourceDir, "LegalEase_Tennesee");
  const encryptedDir = path.join(sourceDir, "LegalEase_Alaska");
  fs.mkdirSync(scannedDir, { recursive: true });
  fs.mkdirSync(encryptedDir, { recursive: true });
  fs.writeFileSync(path.join(scannedDir, "scan-a.pdf"), makePdf({ textLayer: false }));
  fs.writeFileSync(path.join(scannedDir, "scan-b.pdf"), makePdf({ textLayer: false }));
  fs.writeFileSync(path.join(encryptedDir, "locked.pdf"), makePdf({ encrypted: true, textLayer: true }));

  const report = await inspectLocalRecordClearingPdfs({ sourceDir, writeReports: true });
  const tn = report.perJurisdiction.find((jurisdiction) => jurisdiction.jurisdictionCode === "TN");
  const ak = report.perJurisdiction.find((jurisdiction) => jurisdiction.jurisdictionCode === "AK");
  assert.equal(tn?.sourceFolderWarnings.includes("folder_name_misspelled"), true);
  assert.equal(tn?.migrationBucket, "scanned_replacement_needed");
  assert.equal(ak?.migrationBucket, "encrypted_replacement_needed");
  assertCanonicalTriageKeys(report.migrationTriage);
  assert.equal(report.migrationTriage.mostlyScannedJurisdictions.some((jurisdiction) => jurisdiction.jurisdictionCode === "TN"), true);
  assert.equal(report.migrationTriage.encryptedOrLockedJurisdictions.some((jurisdiction) => jurisdiction.jurisdictionCode === "AK"), true);
  assert.equal(report.migrationTriage.deferUntilBetterSources.some((jurisdiction) => jurisdiction.jurisdictionCode === "AK"), true);

  for (const reportPath of sharedReportPaths) {
    assert.equal(fs.existsSync(reportPath), true);
    const content = fs.readFileSync(reportPath, "utf8");
    assert.equal(content.includes(tempRoot), false);
    assert.equal(content.includes("/workspaces/"), false);
  }
}

function snapshotSharedReports() {
  return sharedReportPaths.map((reportPath) => ({
    reportPath,
    existed: fs.existsSync(reportPath),
    content: fs.existsSync(reportPath) ? fs.readFileSync(reportPath) : null
  }));
}

function restoreSharedReports(snapshot) {
  for (const item of snapshot) {
    if (item.existed && item.content) {
      fs.mkdirSync(path.dirname(item.reportPath), { recursive: true });
      fs.writeFileSync(item.reportPath, item.content);
      continue;
    }
    if (!item.existed && fs.existsSync(item.reportPath)) fs.rmSync(item.reportPath);
  }
}

function assertCanonicalTriageKeys(triage) {
  for (const key of canonicalTriageKeys()) {
    assert.equal(Object.hasOwn(triage, key), true, `Missing canonical triage key: ${key}`);
    assert.equal(Array.isArray(triage[key]), true, `Canonical triage key is not an array: ${key}`);
  }
}

function canonicalTriageKeys() {
  return [
    "easiestJurisdictions",
    "hardestJurisdictions",
    "mostlyScannedJurisdictions",
    "encryptedOrLockedJurisdictions",
    "xfaJurisdictions",
    "acroformDirtyJurisdictions",
    "recommendedFirstStates",
    "deferUntilBetterSources"
  ];
}

function assertRawInspectionRules() {
  const duplicatePdf = makePdf({ acroForm: true, fieldNames: ["Name", "Name"], textLayer: true });
  const duplicate = inspectPdfBytes(duplicatePdf);
  assert.equal(duplicate.classification, "acroform_dirty");
  assert.deepEqual(duplicate.duplicateAcroFormFieldNames, ["Name"]);

  const flatPdf = inspectPdfBytes(makePdf({ textLayer: true }));
  assert.equal(flatPdf.classification, "flat_pdf");
  assert.equal(flatPdf.recommendedMappingMode, "overlay");

  const unreadable = inspectPdfBytes(Buffer.from("bad"));
  assert.equal(unreadable.possibleXfaDetected, "unknown");
  assert.equal(unreadable.classification, "unreadable");
}

function assertPackageScript() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
  assert.equal(packageJson.scripts["rcap:forms:inspect-local"], "node scripts/inspect-local-record-clearing-pdfs.mjs");
}

function assertGitignoreSafety() {
  const gitignore = fs.readFileSync(path.join(rootDir, ".gitignore"), "utf8");
  const lines = gitignore.split(/\r?\n/).map((line) => line.trim());
  assert.equal(lines.includes("private/"), true);
  assert.equal(lines.includes("*.zip"), true);
}

function assertNoLiveRoutesModified() {
  const status = fs.existsSync(path.join(rootDir, ".git"))
    ? String(spawnSync("git", ["status", "--short", "--", "src/app", "src/lib/rcap-intake", "supabase"], { cwd: rootDir, encoding: "utf8" }).stdout ?? "")
    : "";
  const liveRouteStatus = status
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.includes("src/app/internal/record-clearing/"))
    .filter((line) => !line.includes("src/app/api/health/route.ts"))
    .filter((line) => !line.includes("src/app/api/expungement-ai/"))
    .filter((line) => !line.includes("src/app/api/stripe/webhook/route.ts"))
    .filter((line) => !line.includes("src/app/api/legalease/"))
    .filter((line) => !line.includes("src/app/api/request-pilot/route.ts"))
    .filter((line) => !line.includes("src/app/api/rcap/intake/start/route.ts"))
    .filter((line) => !line.includes("src/app/api/rcap/intake/complete/route.ts"))
    .filter((line) => !line.includes("src/app/api/rcap/documents/"))
    .filter((line) => !line.includes("src/app/documents/"))
    .filter((line) => !line.includes("src/app/dashboard/partners/"))
    .filter((line) => !line.includes("src/app/internal/partners/admin/page.tsx"))
    .filter((line) => !line.includes("src/app/expungement-ai/"))
    .filter((line) => !line.includes("src/app/briefcase/"))
    .filter((line) => !line.includes("supabase/phase-26-consumer-briefcase-items.sql"))
    .filter((line) => !line.includes("supabase/phase-27-consumer-checkout-metadata.sql"))
    .filter((line) => !line.includes("supabase/phase-28-consumer-packet-generation-status.sql"))
    .filter((line) => !line.includes("supabase/phase-29-consumer-wilma-telemetry.sql"))
    .filter((line) => !line.includes("supabase/phase-31-legalease-os-support-queue.sql"))
    .filter((line) => !line.includes("supabase/phase-32-expungement-screening-sessions.sql"))
    .filter((line) => !line.includes("supabase/phase-33-expungement-screening-resume-links.sql"))
    .join("\n");
  assert.equal(liveRouteStatus.trim(), "");
}

function makePdf({ acroForm = false, fieldNames = [], xfa = false, textLayer = false, encrypted = false } = {}) {
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R" + (acroForm ? " /AcroForm 5 0 R" : "") + (encrypted ? " /Encrypt 30 0 R" : "") + " >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj",
    textLayer
      ? "4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 72 720 Td (Hello world) Tj ET\nendstream\nendobj"
      : "4 0 obj\n<< /Length 0 >>\nstream\n\nendstream\nendobj"
  ];

  if (acroForm) {
    const fieldRefs = fieldNames.map((_, index) => `${6 + index} 0 R`).join(" ");
    objects.push("5 0 obj\n<< /Fields [" + fieldRefs + "]" + (xfa ? " /XFA 20 0 R" : "") + " >>\nendobj");
    fieldNames.forEach((name, index) => {
      objects.push(`${6 + index} 0 obj\n<< /FT /Tx /T (${name}) /V () >>\nendobj`);
    });
    if (xfa) objects.push("20 0 obj\n<< /Length 0 >>\nstream\n\nendstream\nendobj");
  }

  return Buffer.from(`%PDF-1.7\n${objects.join("\n")}\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`, "latin1");
}
