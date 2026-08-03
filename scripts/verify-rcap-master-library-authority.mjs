// Master Library authority verifier.
//
// Fails on a structural authority defect. It does not fail because Edition 1
// records an open gap: a recorded gap is the edition working correctly, and it
// is reported with its authoritative impact rather than treated as an error.
//
// What counts as a defect is narrow and deliberate — two assets claiming one
// identity, a manifest row with no file, a checksum that does not hold, a
// prohibited source reached by a live mapping, a route promoted without
// authority. Everything else is a finding, not a failure.

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

register("./lib/ts-esm-loader.mjs", import.meta.url);

import {
  readAuthorityRecord,
  openLibrary,
  loadGovernance,
  indexLibrary,
  sha256File,
  workflowKeyOf,
  isDuplicatePathExclusion
} from "./lib/master-library.mjs";

const { isResolverSelectable, componentResultPermitsPromotion, gateRuntimeStatus } = await import(
  "@/lib/rcap/legal-design/master-library-authority"
);

const root = process.cwd();
const failures = [];
const findings = [];

const authority = readAuthorityRecord(root);
const library = openLibrary(root, authority);
const governance = loadGovernance(library);
const index = indexLibrary(governance);

// ---------------------------------------------------------------------------
// 1. Adoption record
// ---------------------------------------------------------------------------

if (authority.adoptionStatus !== "adopted") {
  failures.push(`Authority record is ${authority.adoptionStatus}; the edition must be adopted to govern.`);
}
if (authority.edition !== governance.edition.edition) {
  failures.push(
    `Authority record adopts edition ${authority.edition} but the retained edition reports ${governance.edition.edition}.`
  );
}
if (authority.cutoffDate !== governance.edition.cutoff_date) {
  failures.push(
    `Authority record records cutoff ${authority.cutoffDate} but the retained edition reports ${governance.edition.cutoff_date}.`
  );
}
if (library.mode === "archive" && library.archiveSha256 !== authority.retention.archiveSha256) {
  failures.push(
    `Adopted archive SHA-256 is ${library.archiveSha256} but the authority record pins ${authority.retention.archiveSha256}. The edition is immutable; a changed archive is a new edition.`
  );
}
if (!governance.hasAdoptedMemorandum) {
  failures.push("The adopted legal-resolution memorandum is not retained inside the adopted edition.");
}

// ---------------------------------------------------------------------------
// 2. Edition integrity
// ---------------------------------------------------------------------------

library.withTree((treeRoot) => {
  for (const entry of governance.checksums) {
    const file = path.join(treeRoot, entry.path);
    if (!fs.existsSync(file)) {
      failures.push(`Checksum file lists ${entry.path}, which the edition does not retain.`);
      continue;
    }
    if (sha256File(file) !== entry.sha256) failures.push(`Checksum mismatch on ${entry.path}.`);
  }
});

const retained = new Set(library.listFiles());
const covered = new Set(governance.checksums.map((entry) => entry.path));
for (const file of retained) {
  if (file === authority.checksumFilePath) continue;
  if (!covered.has(file)) failures.push(`Retained file ${file} is not covered by the checksum file.`);
}

for (const row of governance.manifest) {
  if (!retained.has(row.canonical_relative_path)) {
    failures.push(`Manifest row ${row.workflow_key} points at ${row.canonical_relative_path}, which is not retained.`);
  }
}

const manifestPaths = new Set(governance.manifest.map((row) => row.canonical_relative_path));
for (const file of retained) {
  if (!file.startsWith("STATES/")) continue;
  if (file.endsWith("STATE_MANIFEST.csv") || file.endsWith("STATE_README.md")) continue;
  if (!manifestPaths.has(file)) failures.push(`Retained asset ${file} is absent from the master manifest.`);
}

for (const [key, rows] of index.byWorkflowKey) {
  if (rows.length > 1) failures.push(`Duplicate workflow key ${key} across ${rows.length} manifest rows.`);
  const shas = new Set(rows.map((row) => row.sha256));
  if (shas.size > 1) failures.push(`Workflow key ${key} carries ${shas.size} conflicting SHA-256 values.`);
}

const seenPaths = new Map();
for (const row of governance.manifest) {
  const previous = seenPaths.get(row.canonical_relative_path);
  if (previous) {
    failures.push(
      `Duplicate canonical path ${row.canonical_relative_path} shared by ${workflowKeyOf(previous)} and ${workflowKeyOf(row)}.`
    );
  }
  seenPaths.set(row.canonical_relative_path, row);
}

// ---------------------------------------------------------------------------
// 3. Reconciliation with the edition's own summary
// ---------------------------------------------------------------------------

expectEqual(governance.manifest.length, governance.edition.retained_assets, "manifest row count");
expectEqual(governance.manifestCsv.length, governance.manifest.length, "manifest CSV/JSONL row count");
expectEqual(governance.stateCoverage.length, 51, "state coverage rows");
expectEqual(Object.keys(governance.stateManifests).length, 51, "state manifests");
expectEqual(
  governance.legalReviewCoverage.filter((row) => row.status === "present").length,
  governance.edition.jurisdictions_with_legal_review,
  "legal-review coverage"
);
expectEqual(governance.sourceGaps.length, governance.edition.missing_and_source_gap_rows, "source-gap ledger rows");
expectEqual(governance.exclusions.length, governance.edition.excluded_or_retired_rows, "exclusion log rows");
expectEqual(
  governance.duplicates.length,
  governance.edition.exact_duplicate_copies_removed,
  "duplicate log rows"
);

for (const row of governance.stateCoverage) {
  const counted = governance.manifest.filter((entry) => entry.jurisdiction_code === row.jurisdiction_code).length;
  if (counted !== Number(row.total_assets)) {
    failures.push(
      `State coverage for ${row.jurisdiction_code} declares ${row.total_assets} assets; the manifest holds ${counted}.`
    );
  }
}

// ---------------------------------------------------------------------------
// 4. Asset treatment
// ---------------------------------------------------------------------------

// A retained asset sharing bytes with an exclusion row is normally the
// duplicate rule working: the log records paths, and the edition keeps one
// canonical copy. Only a collision on a content-retirement status is worth a
// human look, and it is reported rather than failed — the bytes being identical
// means the retained copy is the same document the log called superseded.
const retirementCollisions = [];
let duplicatePathCollisions = 0;
for (const row of governance.manifest) {
  for (const exclusion of index.excludedSha.get(row.sha256) ?? []) {
    if (isDuplicatePathExclusion(exclusion)) duplicatePathCollisions += 1;
    else retirementCollisions.push({ workflowKey: row.workflow_key, status: exclusion.status, reason: exclusion.reason });
  }
}

for (const row of governance.manifest) {
  if (row.asset_class === "source_gated" && row.packet_candidate === "yes") {
    failures.push(`${row.workflow_key} is source-gated and simultaneously marked a packet candidate.`);
  }
  if (row.generation_allowed === "yes" && row.asset_class !== "packet_form") {
    failures.push(`${row.workflow_key} allows generation from a ${row.asset_class} asset.`);
  }
  if (row.generation_allowed === "yes" && row.runtime_status === "runtime_disabled") {
    failures.push(`${row.workflow_key} allows generation while runtime_disabled.`);
  }
}

// ---------------------------------------------------------------------------
// 5. Derived records are current
// ---------------------------------------------------------------------------

const derived = {};
for (const [name, relativePath] of Object.entries(authority.derivedRecords)) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    failures.push(`Derived record ${relativePath} is missing. Run npm run rcap:reconcile-master-library.`);
    continue;
  }
  derived[name] = readJson(relativePath);
}

if (Object.keys(derived).length === Object.keys(authority.derivedRecords).length) {
  const rerun = spawnSync("node", ["scripts/rcap-reconcile-master-library.mjs"], {
    cwd: root,
    encoding: "utf8"
  });
  if (rerun.status !== 0) {
    failures.push(`Reconciliation could not be reproduced: ${rerun.stderr?.slice(0, 400)}`);
  } else {
    const changed = spawnSync("git", ["status", "--porcelain", "data/record-clearing/master-library"], {
      cwd: root,
      encoding: "utf8"
    });
    const dirty = (changed.stdout || "")
      .split("\n")
      .filter(Boolean)
      .filter((line) => !line.includes("authority.json"))
      .filter((line) => !line.startsWith("??"));
    if (dirty.length > 0) {
      failures.push(
        `Derived records are stale — regenerating changed ${dirty.length} file(s). Commit the reconciliation output.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 6. No prohibited source is reachable, and no route was promoted
// ---------------------------------------------------------------------------

const trackAudit = derived.trackSourceAudit;
const repositoryAudit = derived.repositoryAssetAudit;
const trackRegistry = readJson("data/record-clearing/legal-design-track-registry.json");

if (trackRegistry.packetReadyCount !== 0) {
  failures.push(`packet_ready must be zero; the registry reports ${trackRegistry.packetReadyCount}.`);
}
if (trackRegistry.masterLibraryAuthority?.auditPresent !== true) {
  failures.push("The track registry was built without the Master Library authority audit.");
}
if (trackRegistry.masterLibraryAuthority?.adoptedEdition !== governance.edition.edition) {
  failures.push("The track registry records a different adopted edition than the retained one.");
}

if (trackAudit) {
  for (const track of trackAudit.tracks) {
    for (const component of track.components) {
      if (component.outputStrategy !== "official_pdf_fill") continue;

      // A cleared component must not reach a prohibited asset.
      if (component.result && componentResultPermitsPromotion(component.result)) {
        const asset = component.asset;
        if (!asset) {
          failures.push(`${track.trackId}/${component.componentId} is cleared with no mapped asset.`);
          continue;
        }
        const retired = (index.excludedSha.get(asset.sha256) ?? []).filter(
          (exclusion) => !isDuplicatePathExclusion(exclusion)
        );
        if (retired.length > 0) {
          failures.push(
            `${track.trackId}/${component.componentId} maps to ${asset.workflowKey}, which the edition logs as ${retired[0].status}.`
          );
        }
        if (asset.assetClass === "source_gated") {
          failures.push(`${track.trackId}/${component.componentId} treats a source-gated asset as promotable.`);
        }
        if (!index.bySha.has(asset.sha256)) {
          failures.push(`${track.trackId}/${component.componentId} maps to bytes the edition does not retain.`);
        }
      }

      // A source-gated mapping must never be resolver-selectable.
      if (component.result === "authority_mapped_source_gated") {
        const row = index.bySha.get(component.asset?.sha256)?.[0];
        if (row && isResolverSelectable(toAssetRef(row))) {
          failures.push(`${track.trackId}/${component.componentId} maps a resolver-selectable source-gated asset.`);
        }
      }
    }

    // Fail-closed check on the gate itself: a blocked track must not survive
    // either readiness status.
    if (!track.cleared) {
      for (const status of ["packet_ready", "guidance_ready"]) {
        if (gateRuntimeStatus(status, track) !== "runtime_disabled") {
          failures.push(`The authority gate let blocked track ${track.trackId} through at ${status}.`);
        }
      }
    }
  }

  if (gateRuntimeStatus("packet_ready", undefined) !== "runtime_disabled") {
    failures.push("The authority gate does not fail closed on an unaudited track.");
  }

  const audited = new Set(trackAudit.tracks.map((track) => track.trackId));
  for (const track of trackRegistry.tracks) {
    if (!audited.has(track.trackId)) failures.push(`Track ${track.trackId} received no authority result.`);
  }
}

if (repositoryAudit) {
  const statuses = new Set([
    "manifested_exact",
    "manifested_path_alias",
    "manifested_packet_form",
    "manifested_instruction",
    "manifested_supporting_process",
    "manifested_source_gated",
    "manifested_but_missing_binary",
    "hash_mismatch",
    "revision_mismatch",
    "unmanifested_repository_asset",
    "excluded_or_retired_source",
    "exact_duplicate",
    "not_a_workflow_asset"
  ]);
  for (const asset of repositoryAudit.assets) {
    if (!statuses.has(asset.status)) failures.push(`Repository asset ${asset.artifactId} has status ${asset.status}.`);
  }

  const unmanifestedIds = new Set(
    repositoryAudit.assets
      .filter((asset) => asset.status === "unmanifested_repository_asset" && asset.binaryPresent)
      .map((asset) => asset.artifactId)
  );
  const pendingIds = new Set(derived.pendingEditionAmendments?.candidates.map((entry) => entry.documentId) ?? []);
  for (const id of unmanifestedIds) {
    if (!pendingIds.has(id)) failures.push(`Unmanifested repository asset ${id} is absent from the pending ledger.`);
  }
  for (const candidate of derived.pendingEditionAmendments?.candidates ?? []) {
    if (candidate.runtimeStatus !== "runtime_disabled" || candidate.libraryAuthorityStatus !== "library_authority_pending") {
      failures.push(`Pending amendment ${candidate.documentId} is not runtime disabled and authority pending.`);
    }
  }
}

// ---------------------------------------------------------------------------
// 7. The edition is not duplicated into version control
// ---------------------------------------------------------------------------

const tracked = spawnSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).stdout.split("\n").filter(Boolean);
for (const file of tracked) {
  if (file.includes("Expungement_AI_RCAP_Master_Library")) {
    failures.push(`${file} duplicates the adopted edition into version control.`);
  }
  if (/^data\/record-clearing\/master-library\/(STATES|00_GOVERNANCE)\//.test(file)) {
    failures.push(`${file} is an extraction of the adopted edition and must not be tracked.`);
  }
}

// ---------------------------------------------------------------------------
// 8. Findings — reported, never failed
// ---------------------------------------------------------------------------

const gapsByImpact = tally(governance.sourceGaps, (gap) => gap.impact);
findings.push(
  `Edition ${governance.edition.edition} records ${governance.sourceGaps.length} open source gaps: ${JSON.stringify(gapsByImpact)}. An open gap is the edition working, not a defect.`
);
findings.push(
  `${governance.legalReviewCoverage.filter((row) => row.status !== "present").length} jurisdictions have no retained legal review in this edition.`
);
findings.push(
  `${duplicatePathCollisions} exclusion rows share bytes with a retained asset under a duplicate-path status, which is the deduplication rule working. ${retirementCollisions.length} share bytes under a content-retirement status and want a human decision: ${JSON.stringify(retirementCollisions.map((entry) => entry.workflowKey))}.`
);
if (repositoryAudit) {
  findings.push(
    `${repositoryAudit.totals.excludedOrRetiredStillPresent} excluded or retired sources remain present in the repository corpus. Presence is not use; none is mapped as a current source.`
  );
}
if (trackAudit) {
  findings.push(
    `Official-form components by authority result: ${JSON.stringify(trackAudit.totals.officialPdfComponentsByResult)}.`
  );
}

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error("Master Library authority verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Master Library authority verifier passed.");
console.log(`1. Edition ${governance.edition.edition} adopted, cutoff ${governance.edition.cutoff_date}, read in ${library.mode} mode.`);
console.log(`2. ${governance.checksums.length} checksums verified; every retained file is covered and manifested.`);
console.log("3. No duplicate workflow key, duplicate canonical path or conflicting hash in the manifest.");
console.log("4. Manifest, state coverage, legal-review coverage, gap, exclusion and duplicate ledgers all reconcile with the edition summary.");
console.log("5. No excluded, retired or source-gated asset is presented as active, generation-allowed or resolver-selectable.");
console.log("6. Derived records reproduce exactly; every normalized track carries one authority result.");
console.log(`7. packet_ready = ${trackRegistry.packetReadyCount}. The gate fails closed on an unaudited track.`);
console.log("8. The adopted edition is not duplicated or extracted into version control.");
for (const finding of findings) console.log(`   finding: ${finding}`);

function expectEqual(actual, expected, label) {
  if (actual !== expected) failures.push(`${label}: expected ${expected}, found ${actual}.`);
}

function toAssetRef(row) {
  return {
    libraryEdition: row.library_edition,
    jurisdictionCode: row.jurisdiction_code,
    workflowKey: row.workflow_key,
    documentId: row.document_id,
    documentRole: row.document_role,
    officialTitle: row.official_title,
    revision: row.revision,
    language: row.language,
    assetClass: row.asset_class,
    canonicalRelativePath: row.canonical_relative_path,
    sha256: row.sha256,
    packetCandidate: row.packet_candidate === "yes",
    generationAllowed: row.generation_allowed === "yes",
    runtimeStatus: row.runtime_status
  };
}

function tally(list, keyOf) {
  const counts = {};
  for (const item of list) {
    const key = String(keyOf(item));
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}
