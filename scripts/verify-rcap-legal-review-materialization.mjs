#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  LEGAL_REVIEW_MATERIALIZATION_CONTRACT_PATH,
  validateLegalReviewMaterializationContract
} from "./lib/rcap-factory/materialization-planning.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RECEIPT_SCHEMA = "rcap-legal-review-materialization-receipt/v1";

const args = parseArgs(process.argv.slice(2));
const contract = readJson(
  path.join(ROOT, LEGAL_REVIEW_MATERIALIZATION_CONTRACT_PATH),
  "legal-review materialization contract"
);
const contractIssues = validateLegalReviewMaterializationContract(contract);
if (contractIssues.length > 0) {
  fail("invalid_contract", contractIssues.join("; "));
}

if (!args.jurisdiction) {
  const materializedReviewCount = contract.assignments.filter(
    verifiedMaterializationPresent
  ).length;
  process.stdout.write(
    `${JSON.stringify({
      schemaVersion: contract.schemaVersion,
      assignmentCount: contract.assignmentCount,
      status: "portable_contract_verified",
      materializedReviewCount
    })}\n`
  );
  process.exit(0);
}

const assignment = contract.assignments.find(
  (entry) => entry.jurisdiction === args.jurisdiction
);
if (!assignment) {
  fail("unknown_jurisdiction", `${args.jurisdiction} is not assigned.`);
}
const archivePath =
  args.archive ?? process.env.RCAP_AUTHORITY_ARCHIVE_PATH;
if (!archivePath) {
  fail(
    "required_archive_absent",
    "RCAP_AUTHORITY_ARCHIVE_PATH or --archive is required."
  );
}
const archiveStat = safeLstat(archivePath, "required_archive_absent");
if (!archiveStat.isFile() || archiveStat.isSymbolicLink()) {
  fail("unsafe_archive", "The authority archive must be a real regular file.");
}
if (archiveStat.size !== assignment.activeReview.expectedArchiveBytes) {
  fail("archive_size_mismatch", "The authority archive byte count differs.");
}
if (sha256File(archivePath) !== assignment.activeReview.expectedArchiveSha256) {
  fail("archive_sha_mismatch", "The authority archive SHA-256 differs.");
}

const entries = zipEntries(archivePath);
const normalizedEntries = entries.map(normalizeArchiveEntry);
if (new Set(normalizedEntries).size !== normalizedEntries.length) {
  fail("duplicate_archive_entry", "The authority archive has duplicate normalized entries.");
}
const expectedArchiveRoot =
  assignment.activeReview.sourceArchiveIdentity.replace(/\.zip$/u, "") + "/";
if (
  normalizedEntries.length === 0 ||
  normalizedEntries.some((entry) => !entry.startsWith(expectedArchiveRoot))
) {
  fail(
    "archive_root_mismatch",
    "The authority archive does not use its exact canonical edition root."
  );
}
const archiveRelativeEntries = normalizedEntries.map((entry) =>
  entry.slice(expectedArchiveRoot.length)
);
if (
  archiveRelativeEntries.some((entry) => entry.length === 0) ||
  new Set(archiveRelativeEntries).size !== archiveRelativeEntries.length
) {
  fail(
    "duplicate_archive_entry",
    "The authority archive has duplicate or empty edition-relative entries."
  );
}
const statePrefix = `STATES/${assignment.jurisdiction}/01_LEGAL_REVIEW/`;
const activeReviews = archiveRelativeEntries.filter(
  (entry) =>
    entry.startsWith(statePrefix) &&
    /__LEGAL-REVIEW__.*\.md$/u.test(entry)
);
const addenda = archiveRelativeEntries.filter(
  (entry) =>
    entry.startsWith(statePrefix) &&
    /__LEGAL-REVIEW-ADDENDUM__.*\.md$/u.test(entry)
);
if (activeReviews.length !== assignment.expectedActiveReviewCount) {
  fail(
    "active_review_count_mismatch",
    `Expected ${assignment.expectedActiveReviewCount} active review; found ${activeReviews.length}.`
  );
}
if (addenda.length !== assignment.expectedAddendumCount) {
  fail(
    "unexpected_addendum",
    `Expected ${assignment.expectedAddendumCount} addenda; found ${addenda.length}.`
  );
}
if (activeReviews[0] !== assignment.activeReview.archiveRelativePath) {
  fail(
    "review_identity_mismatch",
    "The active archive review does not match the assigned identity."
  );
}

const materializedPath = resolveOwnedPath(
  assignment.activeReview.materializationDestination,
  assignment.ownedPaths
);
if (args.materialize) {
  const archiveEntry =
    `${expectedArchiveRoot}${assignment.activeReview.archiveRelativePath}`;
  const extraction = spawnSync("unzip", ["-p", archivePath, archiveEntry], {
    encoding: "buffer",
    maxBuffer: 16 * 1024 * 1024
  });
  if (extraction.status !== 0) {
    fail(
      "review_extraction_failed",
      "Unable to extract the exact assigned review from the authority archive."
    );
  }
  materializeExactFile(materializedPath, extraction.stdout, 0o444);
}
const materializedStat = safeLstat(
  materializedPath,
  "required_review_absent"
);
if (
  !materializedStat.isFile() ||
  materializedStat.isSymbolicLink() ||
  materializedStat.nlink !== 1
) {
  fail(
    "unsafe_materialized_review",
    "The materialized review must be a non-linked regular file."
  );
}
if ((materializedStat.mode & 0o222) !== 0) {
  fail("materialized_review_writable", "The materialized review must be read-only.");
}
const bytes = fs.readFileSync(materializedPath);
if (bytes.includes(0)) {
  fail("review_mime_mismatch", "The assigned Markdown review contains binary NUL bytes.");
}
let reviewText;
try {
  reviewText = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
} catch {
  fail("review_mime_mismatch", "The assigned Markdown review is not valid UTF-8.");
}
const observedTitle =
  reviewText
    .split(/\r?\n/u)
    .map((line) => line.match(/^#\s+(.+?)\s*$/u)?.[1] ?? null)
    .find(Boolean) ?? null;
if (observedTitle !== assignment.activeReview.expectedTitle) {
  fail(
    "review_title_mismatch",
    "The active review title does not match the exact assigned title."
  );
}
const jurisdictionMarkers = reviewText
  .split(/\r?\n/u)
  .map(
    (line) =>
      line.match(/^\*\*JURISDICTION:\s*(.+?)\s*\*\*\s*$/iu)?.[1] ?? null
  )
  .filter(Boolean);
if (
  jurisdictionMarkers.length !== 1 ||
  !jurisdictionMarkers[0]
    .toLocaleUpperCase("en-US")
    .includes(
      assignment.activeReview.expectedJurisdictionName.toLocaleUpperCase(
        "en-US"
      )
    )
) {
  fail(
    "jurisdiction_mismatch",
    "The review must contain exactly one jurisdiction marker matching the assignment."
  );
}
const observedJurisdictionMarker = jurisdictionMarkers[0];
const observedSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
if (observedSha256 !== assignment.activeReview.expectedSha256) {
  fail("review_sha_mismatch", "The materialized review SHA-256 differs.");
}
if (
  assignment.activeReview.expectedBytes !== null &&
  bytes.length !== assignment.activeReview.expectedBytes
) {
  fail("review_size_mismatch", "The materialized review byte count differs.");
}
if (
  !path.posix.basename(assignment.activeReview.archiveRelativePath).startsWith(
    `${assignment.jurisdiction}__LEGAL-REVIEW__STATEWIDE__`
  )
) {
  fail("jurisdiction_mismatch", "The review identity does not match the jurisdiction.");
}

const receiptPath = resolveOwnedPath(
  assignment.receiptOutput,
  assignment.ownedPaths
);
const expectedReceipt = {
  schemaVersion: RECEIPT_SCHEMA,
  jobId: assignment.jobId,
  jurisdiction: assignment.jurisdiction,
  authorityEdition: assignment.activeReview.authorityEdition,
  archiveIdentity: assignment.activeReview.sourceArchiveIdentity,
  archiveSha256: assignment.activeReview.expectedArchiveSha256,
  archiveBytes: assignment.activeReview.expectedArchiveBytes,
  archiveEntryPath: assignment.activeReview.archiveRelativePath,
  expectedReviewSha256: assignment.activeReview.expectedSha256,
  observedReviewSha256: observedSha256,
  observedReviewBytes: bytes.length,
  observedMime: "text/markdown",
  expectedTitle: assignment.activeReview.expectedTitle,
  observedTitle,
  expectedJurisdictionName:
    assignment.activeReview.expectedJurisdictionName,
  observedJurisdictionMarker,
  activeReviewCount: activeReviews.length,
  addendumCount: addenda.length,
  materializationDestination:
    assignment.activeReview.materializationDestination,
  materializationState: "binary_hash_verified",
  verificationStatus: "binary_hash_and_size_verified",
  verifier: "scripts/verify-rcap-legal-review-materialization.mjs",
  readOnly: true
};
if (args.materialize) {
  materializeExactFile(
    receiptPath,
    Buffer.from(`${JSON.stringify(expectedReceipt, null, 2)}\n`, "utf8"),
    0o644
  );
}
const receipt = readJson(receiptPath, "legal-review materialization receipt");
if (canonicalJson(receipt) !== canonicalJson(expectedReceipt)) {
  fail(
    "receipt_mismatch",
    "The receipt does not exactly describe the freshly verified archive and review."
  );
}
process.stdout.write(`${JSON.stringify(expectedReceipt, null, 2)}\n`);

function parseArgs(raw) {
  const result = {};
  for (let index = 0; index < raw.length; index += 1) {
    const argument = raw[index];
    if (argument === "--materialize") {
      result.materialize = true;
      continue;
    }
    if (!["--jurisdiction", "--archive"].includes(argument)) {
      fail("invalid_arguments", `Unsupported argument ${argument}.`);
    }
    const value = raw[index + 1];
    if (!value || value.startsWith("--")) {
      fail("invalid_arguments", `${argument} requires a value.`);
    }
    result[argument.slice(2)] = value;
    index += 1;
  }
  if (
    result.jurisdiction &&
    !/^[A-Z]{2}$/u.test(result.jurisdiction)
  ) {
    fail("invalid_arguments", "--jurisdiction must be a two-letter code.");
  }
  return result;
}

function materializeExactFile(filePath, bytes, mode) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath)) {
    const stat = fs.lstatSync(filePath);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.nlink !== 1 ||
      !fs.readFileSync(filePath).equals(bytes)
    ) {
      fail(
        "materialization_collision",
        `Refusing to replace a different materialization at ${filePath}.`
      );
    }
    fs.chmodSync(filePath, mode);
    return;
  }
  let descriptor;
  try {
    descriptor = fs.openSync(filePath, "wx", mode);
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
  } catch (error) {
    if (descriptor !== undefined) {
      fs.closeSync(descriptor);
      if (fs.existsSync(filePath)) fs.rmSync(filePath);
    }
    fail(
      "materialization_write_failed",
      `Unable to create the exact materialization at ${filePath}: ${error.message}`
    );
  }
  fs.closeSync(descriptor);
  fs.chmodSync(filePath, mode);
}

function zipEntries(archivePath) {
  const result = spawnSync("unzip", ["-Z1", archivePath], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  if (result.status !== 0) {
    fail("archive_inventory_failed", "Unable to inventory the exact authority archive.");
  }
  return result.stdout.split(/\r?\n/u).filter(Boolean);
}

function normalizeArchiveEntry(entry) {
  if (
    typeof entry !== "string" ||
    entry.includes("\\") ||
    path.posix.isAbsolute(entry)
  ) {
    fail("archive_path_escape", "The archive contains a non-portable entry.");
  }
  const normalized = path.posix.normalize(entry).replace(/\/$/u, "");
  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.split("/").some((segment) => segment === "..")
  ) {
    fail("archive_path_escape", "The archive contains an escaping entry.");
  }
  return normalized;
}

function resolveOwnedPath(relativePath, ownedPaths) {
  if (
    typeof relativePath !== "string" ||
    path.posix.isAbsolute(relativePath) ||
    path.win32.isAbsolute(relativePath) ||
    relativePath.includes("\\") ||
    path.posix.normalize(relativePath) !== relativePath ||
    relativePath.startsWith("../")
  ) {
    fail("path_escape", "A materialization path is not portable.");
  }
  if (!(ownedPaths ?? []).includes(relativePath)) {
    fail("ownership_escape", `${relativePath} is outside exact job ownership.`);
  }
  const absolute = path.resolve(ROOT, relativePath);
  if (
    absolute !== ROOT &&
    !absolute.startsWith(`${ROOT}${path.sep}`)
  ) {
    fail("path_escape", `${relativePath} escapes the repository worktree.`);
  }
  return absolute;
}

function safeLstat(filePath, code) {
  try {
    return fs.lstatSync(filePath);
  } catch {
    fail(code, `Required path is absent: ${filePath}.`);
  }
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    fail("required_input_absent", `Unable to read ${label}.`);
  }
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function verifiedMaterializationPresent(assignment) {
  const reviewPath = path.join(
    ROOT,
    assignment.activeReview.materializationDestination
  );
  const receiptPath = path.join(ROOT, assignment.receiptOutput);
  let reviewStat;
  let receipt;
  let bytes;
  try {
    reviewStat = fs.lstatSync(reviewPath);
    receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
    bytes = fs.readFileSync(reviewPath);
  } catch {
    return false;
  }
  if (
    !reviewStat.isFile() ||
    reviewStat.isSymbolicLink() ||
    reviewStat.nlink !== 1 ||
    (reviewStat.mode & 0o222) !== 0
  ) {
    return false;
  }
  let reviewText;
  try {
    reviewText = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return false;
  }
  const observedTitle =
    reviewText
      .split(/\r?\n/u)
      .map((line) => line.match(/^#\s+(.+?)\s*$/u)?.[1] ?? null)
      .find(Boolean) ?? null;
  const jurisdictionMarkers = reviewText
    .split(/\r?\n/u)
    .map(
      (line) =>
        line.match(/^\*\*JURISDICTION:\s*(.+?)\s*\*\*\s*$/iu)?.[1] ?? null
    )
    .filter(Boolean);
  const observedJurisdictionMarker =
    jurisdictionMarkers.length === 1 ? jurisdictionMarkers[0] : null;
  const observedSha256 = crypto
    .createHash("sha256")
    .update(bytes)
    .digest("hex");
  return (
    observedSha256 === assignment.activeReview.expectedSha256 &&
    observedTitle === assignment.activeReview.expectedTitle &&
    observedJurisdictionMarker !== null &&
    observedJurisdictionMarker
      .toLocaleUpperCase("en-US")
      .includes(
        assignment.activeReview.expectedJurisdictionName.toLocaleUpperCase(
          "en-US"
        )
      ) &&
    receipt?.schemaVersion === RECEIPT_SCHEMA &&
    receipt.jobId === assignment.jobId &&
    receipt.jurisdiction === assignment.jurisdiction &&
    receipt.archiveSha256 === assignment.activeReview.expectedArchiveSha256 &&
    receipt.archiveEntryPath === assignment.activeReview.archiveRelativePath &&
    receipt.observedReviewSha256 === observedSha256 &&
    receipt.observedReviewBytes === bytes.length &&
    receipt.observedMime === assignment.activeReview.expectedMime &&
    receipt.expectedTitle === assignment.activeReview.expectedTitle &&
    receipt.observedTitle === assignment.activeReview.expectedTitle &&
    receipt.expectedJurisdictionName ===
      assignment.activeReview.expectedJurisdictionName &&
    receipt.observedJurisdictionMarker === observedJurisdictionMarker &&
    receipt.activeReviewCount === assignment.expectedActiveReviewCount &&
    receipt.addendumCount === assignment.expectedAddendumCount &&
    receipt.materializationState === "binary_hash_verified" &&
    receipt.verificationStatus === "binary_hash_and_size_verified" &&
    receipt.readOnly === true
  );
}

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}
