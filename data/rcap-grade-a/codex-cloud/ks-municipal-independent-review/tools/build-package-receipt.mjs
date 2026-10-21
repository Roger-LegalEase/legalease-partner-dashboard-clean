#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const OUT = "data/rcap-grade-a/codex-cloud/ks-municipal-independent-review";
const ZIP_NAME = "ks-municipal-independent-review.zip";
const ZIP = path.join(ROOT, OUT, ZIP_NAME);
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const entries = execFileSync("unzip", ["-Z1", ZIP], { encoding: "utf8" })
  .split(/\r?\n/).filter((entry) => entry && !entry.endsWith("/")).sort();
const files = entries.map((entry) => {
  const bytes = execFileSync("unzip", ["-p", ZIP, entry], { encoding: null, maxBuffer: 64 * 1024 * 1024 });
  return { path: entry, sha256: sha256(bytes), byteLength: bytes.length };
});
const requiredRoutePdfs = {
  "exact-pdfs/ks-12-4516-municipal--canonical.pdf": {
    routeKey: "obligation:track-pathway:KS:ks-12-4516-municipal:municipal-conviction-or-diversion-expungement-under-12-4516",
    fixture: "canonical",
    sha256: "f79d5b4e82d3ccf22c9b03aa42ad202e0796a13b4de95f3d25b38b2adf22f810",
    byteLength: 18262,
    pageCount: 6
  },
  "exact-pdfs/ks-12-4516-municipal--boundary.pdf": {
    routeKey: "obligation:track-pathway:KS:ks-12-4516-municipal:municipal-conviction-or-diversion-expungement-under-12-4516",
    fixture: "boundary",
    sha256: "7b234e970d38bdc0515122916c6f3961f1140e74f12978b6096e6aa34928600f",
    byteLength: 18886,
    pageCount: 7
  },
  "exact-pdfs/ks-12-4516a-municipal-arrest--canonical.pdf": {
    routeKey: "obligation:track-pathway:KS:ks-12-4516a-municipal-arrest:municipal-arrest-record-expungement-under-12-4516a",
    fixture: "canonical",
    sha256: "8a85bc0f2365938bd8b5e0483585b95abf2550a6cc24a4717b0d72001abd708d",
    byteLength: 17378,
    pageCount: 6
  },
  "exact-pdfs/ks-12-4516a-municipal-arrest--boundary.pdf": {
    routeKey: "obligation:track-pathway:KS:ks-12-4516a-municipal-arrest:municipal-arrest-record-expungement-under-12-4516a",
    fixture: "boundary",
    sha256: "dd364be7194a5e23643057ba75e5d5ea84950e7cd18b2945db5483761b9f3617",
    byteLength: 17578,
    pageCount: 6
  }
};
const routeBindings = Object.entries(requiredRoutePdfs).map(([entry, required]) => {
  const observed = files.find((file) => file.path === entry);
  if (!observed) throw new Error(`package is missing ${entry}`);
  const exactMatch = observed.sha256 === required.sha256 && observed.byteLength === required.byteLength;
  if (!exactMatch) throw new Error(`${entry} does not match its required exact bytes`);
  return { packageEntry: entry, ...required, observedSha256: observed.sha256, observedByteLength: observed.byteLength, exactMatch };
});
const receipt = {
  schemaVersion: "rcap-offline-review-package-receipt/v1",
  generatedAt: "2026-09-02T00:00:00.000Z",
  familyId: "rcap-ks-custom-pleading",
  worker: "CODEX-CS2-KS-MUNICIPAL",
  packagePath: `${OUT}/${ZIP_NAME}`,
  packageSha256: sha256(fs.readFileSync(ZIP)),
  packageByteLength: fs.statSync(ZIP).size,
  packagePurpose: "downloadable offline independent review only",
  packageCreatesFulfillmentAuthority: false,
  packageBindsOrOpensARoute: false,
  packageEnablesPayment: false,
  packageTouchesProduction: false,
  routeBindings,
  containedFileCount: files.length,
  everyContainedFileListed: true,
  files,
  requiredReviewFilesPresent: ["rows.json", "raster-receipt.json", "review-workbook.csv", "review-report.md"].every((entry) => files.some((file) => file.path === entry)),
  exactPdfCount: files.filter((file) => file.path.startsWith("exact-pdfs/") && file.path.endsWith(".pdf")).length,
  rasterPngCount: files.filter((file) => file.path.startsWith("rasters/") && file.path.endsWith(".png")).length,
  verdict: "FAIL_REPAIR_REQUIRED",
  failedProofObligations: ["CLIPPING_AND_OVERLAP", "KNOWN_PREFILLS"],
  rogerNamedVisualApproval: "PENDING_UNCHECKED",
  centralRasterRecordsModified: false,
  ledgerModified: false,
  productionTouched: false
};
fs.writeFileSync(path.join(ROOT, OUT, "package-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ packageSha256: receipt.packageSha256, packageByteLength: receipt.packageByteLength, files: receipt.containedFileCount, pdfs: receipt.exactPdfCount, rasters: receipt.rasterPngCount }));
