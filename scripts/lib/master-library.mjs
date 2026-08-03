// Master Library loader.
//
// Reads the adopted Expungement.ai + RCAP Master Forms and Legal-Review Library
// edition named in `data/record-clearing/master-library/authority.json`.
//
// The library is the authority; this repository is a derived implementation of
// it. Nothing here writes to the library, and nothing here infers a source's
// status from a folder name or a filename. The manifest carries the controlling
// classification, and a file that exists is not thereby approved.
//
// The edition may be retained either as the immutable ZIP the user supplied or
// as an extracted tree. Both are read in place. Neither is copied into the
// repository: a second copy is a second authority.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

export const AUTHORITY_RECORD_PATH = "data/record-clearing/master-library/authority.json";

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/**
 * RFC 4180 reader.
 *
 * Written out rather than split on commas because the governance CSVs carry
 * quoted fields containing commas, newlines and doubled quotes, and a naive
 * split silently loses rows — which in this context means silently losing an
 * exclusion or a source gap.
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const body = text.replace(/^﻿/, "");

  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (quoted) {
      if (ch === '"') {
        if (body[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const header = rows[0].map((name) => name.trim());
  return rows
    .slice(1)
    .filter((entry) => entry.some((value) => value.trim().length > 0))
    .map((entry) => {
      const record = {};
      header.forEach((name, index) => {
        record[name] = entry[index] ?? "";
      });
      return record;
    });
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/**
 * The library's own machine key: `{STATE}:{DOCUMENT_ID}:{DOCUMENT_ROLE}:{LANGUAGE}`.
 * Used rather than invented, so this repository does not carry a second and
 * incompatible document-identity system.
 */
export function workflowKeyOf(row) {
  return `${row.jurisdiction_code}:${row.document_id}:${row.document_role}:${row.language}`;
}

/** Separator- and case-insensitive document-ID comparison key. */
export function documentIdKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

// ---------------------------------------------------------------------------
// Authority record
// ---------------------------------------------------------------------------

export function readAuthorityRecord(rootDir) {
  const file = path.join(rootDir, AUTHORITY_RECORD_PATH);
  if (!fs.existsSync(file)) {
    throw new Error(`Master Library authority record not found at ${AUTHORITY_RECORD_PATH}.`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/**
 * Resolves the adopted edition's location.
 *
 * `canonicalPath` is repository-relative when the user retained the edition
 * inside the repository and absolute when they retained it outside — which is
 * the case here, because this repository ignores `*.zip` and keeps its source
 * corpora out of version control.
 */
export function resolveLibraryLocation(rootDir, authority) {
  const declared = authority.canonicalPath;
  const resolved = path.isAbsolute(declared) ? declared : path.join(rootDir, declared);
  if (!fs.existsSync(resolved)) {
    throw new Error(
      `Adopted Master Library edition not found at ${declared}. The edition is immutable and read in place; it is not reconstructed.`
    );
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// Library access
// ---------------------------------------------------------------------------

function unzipEntryNames(archivePath) {
  const result = spawnSync("unzip", ["-Z1", archivePath], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`Could not list ${archivePath}: ${result.stderr || result.error}`);
  return result.stdout.split("\n").filter(Boolean);
}

function unzipEntryText(archivePath, entry) {
  const result = spawnSync("unzip", ["-p", archivePath, entry], {
    encoding: "buffer",
    maxBuffer: 512 * 1024 * 1024
  });
  if (result.status !== 0) throw new Error(`Could not read ${entry} from ${archivePath}.`);
  return result.stdout.toString("utf8");
}

/**
 * Opens the adopted edition for reading.
 *
 * Archive mode streams entries out of the ZIP and, where whole-tree work is
 * needed (checksum verification), extracts to an OS temporary directory that is
 * removed again. No extraction is ever written into the repository.
 */
export function openLibrary(rootDir, authority = readAuthorityRecord(rootDir)) {
  const location = resolveLibraryLocation(rootDir, authority);
  const isArchive = fs.statSync(location).isFile();

  if (!isArchive) {
    const root = location;
    return {
      mode: "tree",
      location,
      archiveSha256: null,
      readText(relativePath) {
        return fs.readFileSync(path.join(root, relativePath), "utf8");
      },
      exists(relativePath) {
        return fs.existsSync(path.join(root, relativePath));
      },
      listFiles() {
        const out = [];
        const walk = (dir, prefix) => {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const next = path.join(dir, entry.name);
            const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
            if (entry.isDirectory()) walk(next, rel);
            else out.push(rel);
          }
        };
        walk(root, "");
        return out.sort();
      },
      withTree(fn) {
        return fn(root);
      }
    };
  }

  const entries = unzipEntryNames(location);
  const prefixes = new Set(entries.map((entry) => entry.split("/")[0]));
  if (prefixes.size !== 1) {
    throw new Error(`Expected one top-level directory in ${authority.canonicalPath}, found ${prefixes.size}.`);
  }
  const archiveRoot = [...prefixes][0];

  return {
    mode: "archive",
    location,
    archiveRoot,
    archiveSha256: sha256File(location),
    readText(relativePath) {
      return unzipEntryText(location, `${archiveRoot}/${relativePath}`);
    },
    exists(relativePath) {
      return entries.includes(`${archiveRoot}/${relativePath}`);
    },
    listFiles() {
      return entries
        .filter((entry) => !entry.endsWith("/"))
        .map((entry) => entry.slice(archiveRoot.length + 1))
        .filter(Boolean)
        .sort();
    },
    /** Extracts to a temporary directory outside the repository, then removes it. */
    withTree(fn) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-master-library-"));
      try {
        const result = spawnSync("unzip", ["-q", "-o", location, "-d", dir], { encoding: "utf8" });
        if (result.status !== 0) throw new Error(`Could not extract ${location}: ${result.stderr}`);
        return fn(path.join(dir, archiveRoot));
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Governance
// ---------------------------------------------------------------------------

export const GOVERNANCE_FILES = {
  readme: "00_GOVERNANCE/README_MASTER_LIBRARY.md",
  workflowIntegration: "00_GOVERNANCE/WORKFLOW_INTEGRATION.md",
  namingStandard: "00_GOVERNANCE/NAMING_STANDARD.md",
  editionSummary: "00_GOVERNANCE/EDITION_SUMMARY.json",
  manifestCsv: "00_GOVERNANCE/MASTER_ASSET_MANIFEST.csv",
  manifestJsonl: "00_GOVERNANCE/MASTER_ASSET_MANIFEST.jsonl",
  stateCoverage: "00_GOVERNANCE/STATE_COVERAGE.csv",
  legalReviewCoverage: "00_GOVERNANCE/LEGAL_REVIEW_COVERAGE.csv",
  sourceGaps: "00_GOVERNANCE/MISSING_FILES_AND_SOURCE_GAPS.csv",
  exclusions: "00_GOVERNANCE/EXCLUDED_RETIRED_AND_REDUNDANT_SOURCES.csv",
  duplicates: "00_GOVERNANCE/DUPLICATE_SOURCE_LOG.csv",
  checksums: "00_GOVERNANCE/CHECKSUMS.sha256",
  adoptedMemorandum: "00_GOVERNANCE/ADOPTED_BATCH_2_LEGAL_RESEARCH_RESOLUTION.md"
};

/**
 * Exclusion-log statuses that record a *duplicate path*, not a retired document.
 *
 * The log records paths. Where a logged path holds the same bytes as a retained
 * asset, the edition kept one canonical copy and logged the others — that is the
 * duplicate rule working, not a retained asset being secretly excluded. Only a
 * status outside this set means the content itself was removed from currency.
 */
export const DUPLICATE_EXCLUSION_STATUSES = new Set([
  "duplicate",
  "exclude_duplicate",
  "existing_duplicate",
  "duplicate_archive",
  "repo_reference",
  "source_container"
]);

export function isDuplicatePathExclusion(row) {
  return DUPLICATE_EXCLUSION_STATUSES.has(row.status);
}

export function loadGovernance(library) {
  const readCsv = (relativePath) => parseCsv(library.readText(relativePath));

  const manifest = library
    .readText(GOVERNANCE_FILES.manifestJsonl)
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));

  const checksums = library
    .readText(GOVERNANCE_FILES.checksums)
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const match = line.match(/^([0-9a-f]{64})\s+(.+)$/);
      if (!match) throw new Error(`Unparseable checksum line: ${line}`);
      return { sha256: match[1], path: match[2].trim() };
    });

  return {
    edition: JSON.parse(library.readText(GOVERNANCE_FILES.editionSummary)),
    manifest,
    manifestCsv: readCsv(GOVERNANCE_FILES.manifestCsv),
    stateCoverage: readCsv(GOVERNANCE_FILES.stateCoverage),
    legalReviewCoverage: readCsv(GOVERNANCE_FILES.legalReviewCoverage),
    sourceGaps: readCsv(GOVERNANCE_FILES.sourceGaps),
    exclusions: readCsv(GOVERNANCE_FILES.exclusions),
    duplicates: readCsv(GOVERNANCE_FILES.duplicates),
    checksums,
    stateManifests: loadStateManifests(library),
    hasAdoptedMemorandum: library.exists(GOVERNANCE_FILES.adoptedMemorandum)
  };
}

function loadStateManifests(library) {
  const manifests = {};
  for (const file of library.listFiles()) {
    const match = file.match(/^STATES\/([A-Z]{2})\/STATE_MANIFEST\.csv$/);
    if (match) manifests[match[1]] = parseCsv(library.readText(file));
  }
  return manifests;
}

// ---------------------------------------------------------------------------
// Derived indexes
// ---------------------------------------------------------------------------

/**
 * Indexes the edition for lookup.
 *
 * Lookup is by workflow key, document ID and SHA-256 — never by filename or
 * folder. The naming standard is human-readable identity; it is not routing.
 */
export function indexLibrary(governance) {
  const byWorkflowKey = new Map();
  const bySha = new Map();
  const byJurisdictionDocumentId = new Map();

  for (const row of governance.manifest) {
    const key = workflowKeyOf(row);
    if (!byWorkflowKey.has(key)) byWorkflowKey.set(key, []);
    byWorkflowKey.get(key).push(row);

    if (!bySha.has(row.sha256)) bySha.set(row.sha256, []);
    bySha.get(row.sha256).push(row);

    const documentKey = `${row.jurisdiction_code}:${documentIdKey(row.document_id)}`;
    if (!byJurisdictionDocumentId.has(documentKey)) byJurisdictionDocumentId.set(documentKey, []);
    byJurisdictionDocumentId.get(documentKey).push(row);
  }

  const excludedSha = new Map();
  for (const row of governance.exclusions) {
    const sha = (row.sha256 || "").trim();
    if (!sha) continue;
    if (!excludedSha.has(sha)) excludedSha.set(sha, []);
    excludedSha.get(sha).push(row);
  }

  const duplicateSha = new Map();
  for (const row of governance.duplicates) {
    const sha = (row.sha256 || "").trim();
    if (!sha) continue;
    if (!duplicateSha.has(sha)) duplicateSha.set(sha, []);
    duplicateSha.get(sha).push(row);
  }

  const legalReviewByJurisdiction = new Map(
    governance.legalReviewCoverage.map((row) => [row.jurisdiction_code, row])
  );

  return {
    byWorkflowKey,
    bySha,
    byJurisdictionDocumentId,
    excludedSha,
    duplicateSha,
    legalReviewByJurisdiction
  };
}
