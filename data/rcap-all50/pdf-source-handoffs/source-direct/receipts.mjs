#!/usr/bin/env node
// Source receipts for the assigned assets Session 6's Master Library packs
// materialize, and terminal blockers for the ones they do not.
//
//   node data/rcap-all50/pdf-source-handoffs/source-direct/receipts.mjs
//
// The packs under data/rcap-all50/source-packs/ are another lane's artefact and
// are not copied here — they are read from the commit that published them and
// cited by id. What they establish for five of the eighteen assigned assets is
// the thing this lane has been unable to get any other way: the official bytes
// exist, at a canonical Master Library path, under a digest computed from those
// bytes by a run with the corpus mounted.
//
// That digest is NOT recomputed here. This clone has no corpus — the pack index
// records corpusMounted true for the run that built them, and private/ does not
// exist here — so the honest record is that Session 6's run hashed the bytes and
// this receipt carries that hash with its provenance. Claiming to have hashed
// them here would be the one substitution this lane must never make.
//
// The join is by digest AND by family path. A hash join alone would accept a
// pack entry that happened to share a digest while pointing at a different
// family, so the pack's own comparesAgainstInRepo path must also be the
// directory holding this asset's source-record.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(here, "../../../..");
const AGGREGATE = path.join(here, "publisher-of-record.json");

// The commit that published the packs, pinned rather than tracked by branch
// name so this record keeps meaning after the branch moves.
const PACK_COMMIT = "efab503e37e4994cbd27d2b1e8ae785d82d512a2";
const PACK_IDS = ["01", "02", "03", "04", "05", "06", "07"].map((n) => `source-direct-batch-${n}`);

function readPack(packId) {
  try {
    const raw = execFileSync("git", ["show", `${PACK_COMMIT}:data/rcap-all50/source-packs/${packId}.manifest.json`], {
      cwd: rootDir,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024
    });
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const packs = PACK_IDS.map(readPack).filter(Boolean);
if (packs.length === 0) {
  console.error(`FAIL no source-direct pack manifest could be read at ${PACK_COMMIT}`);
  process.exit(1);
}

const aggregate = JSON.parse(fs.readFileSync(AGGREGATE, "utf8"));

/** Every packed official file, keyed by the digest of its bytes. */
function packedFiles() {
  const out = new Map();
  for (const pack of packs) {
    for (const file of pack.files ?? []) {
      out.set(file.sha256, { pack, file });
    }
  }
  return out;
}

const packed = packedFiles();

const receipts = [];
const blockedPdfs = [];
const capturedPages = [];

for (const asset of aggregate.assets) {
  const hit = packed.get(asset.expectedSha256);

  if (hit) {
    const { pack, file } = hit;
    // The pack must point at THIS family, not merely at these bytes.
    const familyDir = path.dirname(asset.sourceRecordPath);
    const mappedDirs = Object.values(pack.comparesAgainstInRepo ?? {});
    const familyConfirmed = mappedDirs.includes(familyDir);

    receipts.push({
      assetId: asset.assetId,
      jurisdiction: asset.jurisdiction,
      fileName: asset.fileName,
      disposition: familyConfirmed
        ? "official_source_materialized_in_master_library"
        : "digest_matches_a_packed_file_but_the_pack_does_not_name_this_family",
      // Publisher identity, exactly as the library files it.
      publisherIdentity: {
        documentId: file.documentId,
        revision: file.revision,
        language: file.language,
        assetClass: file.assetClass,
        officialTitle: file.officialTitle,
        canonicalPath: file.pathInArchive
      },
      exactSourceSha256: file.sha256,
      byteLength: file.byteLength,
      matchesAssetPin: file.sha256 === asset.expectedSha256,
      matchesAssetPinnedSize: asset.expectedSizeBytes === null || asset.expectedSizeBytes === file.byteLength,
      visibleFormExpectation: file.visibleFormExpectation,
      pinBasis: file.pinBasis,
      shaProvenance: {
        computedBy: `${pack.packId} at ${PACK_COMMIT}`,
        computedFrom: "the Master Library bytes, with the corpus mounted on that run",
        recomputedInThisClone: false,
        whyNot: "no corpus is mounted here; private/source-imports/ does not exist in this clone"
      },
      familyPathConfirmed: familyConfirmed,
      sourceRecordPath: asset.sourceRecordPath,
      // Still open, and not this lane's to close.
      currentnessDetermination: "unmade — the library holds these bytes under this revision; whether the publisher serves the same edition today is a separate question"
    });
    continue;
  }

  if (!asset.isPdf && /\.html?$/i.test(asset.fileName)) {
    capturedPages.push({
      assetId: asset.assetId,
      jurisdiction: asset.jurisdiction,
      fileName: asset.fileName,
      disposition: "captured_index_page_not_an_official_form",
      why: "the asset is an HTML capture of a publisher's page, not a form",
      refusal: "no PDF may be substituted for it, and the page it was captured from is a page rather than a form; acquiring that page would file an index as a source",
      inMasterLibraryPacks: false,
      nextAction: "retire or repoint to the forms the captured page lists — a retirement-lane decision, not a source acquisition",
      ownedByThisLane: false,
      sourceRecordPath: asset.sourceRecordPath
    });
    continue;
  }

  blockedPdfs.push({
    assetId: asset.assetId,
    jurisdiction: asset.jurisdiction,
    fileName: asset.fileName,
    documentId: asset.documentId,
    expectedSha256: asset.expectedSha256,
    expectedSizeBytes: asset.expectedSizeBytes,
    disposition: "no_bytes_anywhere_reachable",
    inMasterLibraryPacks: false,
    publisherReachable: false,
    exactExternalBlocker:
      "the Master Library packs do not materialize this asset, and its publisher host answers 403 CONNECT through this session's egress proxy; .github/workflows/** is prohibited to this assignment, so the Actions acquisition route cannot be driven from it either",
    whatWouldClearIt:
      "either a Master Library pack that carries this document, or one request to its publisher from a client that host does not refuse",
    notEstablished: "that this asset has no official source; nothing here searched its publisher",
    unverifiedProbeCandidate: asset.unverifiedProbeCandidate,
    probeCandidateWithheld: asset.probeCandidateWithheld,
    sourceRecordPath: asset.sourceRecordPath
  });
}

const common = {
  schemaVersion: "rcap-source-direct-receipts/v1",
  generatedBy: "data/rcap-all50/pdf-source-handoffs/source-direct/receipts.mjs",
  assignment: "data/rcap-all50/gate-b-assignments/source-direct.json",
  packsConsumed: { commit: PACK_COMMIT, packIds: packs.map((p) => p.packId), path: "data/rcap-all50/source-packs/" },
  neverSubstituted: "no LegalEase output, fixture, sample, contact sheet or HTML page stands in for a PDF in any record here"
};

const files = [
  {
    name: "receipts-materialized.json",
    body: {
      ...common,
      purpose: "Assigned assets whose official source is materialized in the Master Library, with the exact digest of those bytes and the publisher identity the library files them under.",
      totals: {
        assets: receipts.length,
        digestMatchesAssetPin: receipts.filter((r) => r.matchesAssetPin).length,
        familyPathConfirmed: receipts.filter((r) => r.familyPathConfirmed).length,
        recomputedInThisClone: 0
      },
      assets: receipts
    }
  },
  {
    name: "blocked-pdfs.json",
    body: {
      ...common,
      purpose: "Assigned PDF forms that no Master Library pack materializes and whose publisher this session cannot reach. Each carries its exact external blocker.",
      totals: { assets: blockedPdfs.length, acquired: 0 },
      assets: blockedPdfs
    }
  },
  {
    name: "captured-index-pages.json",
    body: {
      ...common,
      purpose: "Assigned assets that are HTML captures of publisher pages rather than forms. No official binary exists for them and none may be substituted.",
      totals: { assets: capturedPages.length, acquired: 0 },
      assets: capturedPages
    }
  }
];

for (const f of files) fs.writeFileSync(path.join(here, f.name), `${JSON.stringify(f.body, null, 2)}\n`);

console.log(`packs consumed: ${packs.map((p) => p.packId).join(", ")} @ ${PACK_COMMIT.slice(0, 8)}`);
console.log(`  ${receipts.length} materialized (${receipts.filter((r) => r.matchesAssetPin && r.familyPathConfirmed).length} with digest and family both confirmed)`);
console.log(`  ${blockedPdfs.length} PDF form(s) with no bytes anywhere reachable`);
console.log(`  ${capturedPages.length} captured index page(s), not forms`);
console.log(`  ${receipts.length + blockedPdfs.length + capturedPages.length} of ${aggregate.assets.length} assigned assets accounted for`);
