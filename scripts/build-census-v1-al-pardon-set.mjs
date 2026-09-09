#!/usr/bin/env node
/**
 * Route-obligation census v1 - packet family `al-pardon-set`.
 *
 *   MASTER_LIBRARY_SOURCE_DIR=... node scripts/build-census-v1-al-pardon-set.mjs
 *
 * Alabama, an application to the Board of Pardons and Paroles on form ABPP-3.
 * One declared component, one declared source:
 *
 *   al-pardon-primary-filing-1   ABPP-3, the Board's pardon application,
 *                                160009 bytes, 4 pages, 30 AcroForm fields
 *                                per the committed corpus index.
 *
 * WHAT THIS FILE IS
 *
 * It is the family's source binding and its refusal. It is NOT a fill pipeline:
 * no field census, no field map, no overlay, no fixture is implemented here,
 * because the bytes this family is built from have never been present in any
 * container this repository runs in. Writing a fill against a form nobody can
 * open would be asserting a capability that was never exercised, and a builder
 * that has never met its own source cannot claim to fill it.
 *
 * WHY IT REFUSES
 *
 * The committed corpus index files ABPP-3 under the custody
 * `src05_worker_materialization_2026_09_02`, whose own declaration in that index
 * says `bytesHeldByAnyMountedCustody: false` and
 * `custodyType: EPHEMERAL_WORKER_MATERIALIZATION_NOT_PERSISTED`: fourteen
 * binaries were fetched into a worker's ephemeral copy of the Master Library
 * tree and were never staged, committed, or added to any release. Three of the
 * fourteen were later found elsewhere in the repository. ABPP-3 is not one of
 * the three.
 *
 * So this refusal is not "the file might be somewhere we did not look". The
 * declared digest is searched for by CONTENT across every mounted custody root
 * before the refusal is written, and the roots that were searched are named in
 * it. If the bytes ever arrive, this file resolves them by digest and then stops
 * again, at NOT_IMPLEMENTED_BEYOND_SOURCE_BINDING, so that nothing downstream
 * can mistake a bound source for a built packet.
 *
 * RE-ACQUISITION IS EXECUTABLE BY THE OWNER
 *
 * data/rcap-grade-a/packet-factory-24h/src05/SOURCE_MATERIALIZATION_RETURN.json
 * carries the owner-only Google Drive fileId this binary was fetched from, and
 * records that the fetched bytes hashed to the declared digest at exactly the
 * declared byte length. Recovering it is an owner action, not a build action,
 * and this lane performed no network acquisition.
 *
 * Nothing is written. The overlay directory is not created or touched, and all
 * nine completeness counters are null rather than zero, because a family that
 * was not built was not measured.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "al-pardon-set";
const OUT_REL = "data/rcap-all50/overlays/census-v1/al/al-pardon-set--official-pdf-fill";
const ROUTE_KEYS = ["obligation:track-only:AL:al-pardon"];
const COMPONENTS = ["component:al-pardon-primary-filing-1"];
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const ACQUISITION_RETURN = "data/rcap-grade-a/packet-factory-24h/src05/SOURCE_MATERIALIZATION_RETURN.json";

const SOURCE = Object.freeze({
  sourceId: "official-form:ABPP-3",
  officialFormId: "ABPP-3",
  officialTitle: "Application for Pardon (Alabama Board of Pardons and Paroles)",
  path: "LegalEase Alabama/AL_ABPP-3_rev-2025-06-14.pdf",
  sha256: "874e738a83c3577413a29a92eb0b999e8c9aab36ddf83589191e33d3c63ac327",
  byteLength: 160009,
  pageCount: 4,
  acroFieldCount: 30,
  component: "al-pardon-primary-filing-1"
});

// A custody the corpus index files under `repositoryRoot` resolves inside the
// checkout that is running, and a custody with no mounted root resolves nowhere.
// Naming a root in the environment is how the D source packs are already reached
// (RCAP_D_SOURCE_DIR, scripts/build-census-v1-ar-*.mjs). An override changes only
// WHERE the bytes are looked for: the committed index still pins the digest, and
// the bytes are still hashed here and must equal it.
const CUSTODY_ROOT_OVERRIDES = Object.freeze({
  human_source_returns: process.env.RCAP_HUMAN_SOURCE_RETURNS_DIR ?? null,
  d_source_packs: process.env.RCAP_D_SOURCE_DIR ?? null,
  nationwide_recovery_pool_2026_09_02: process.env.RCAP_NATIONWIDE_POOL_DIR ?? null,
  src05_worker_materialization_2026_09_02: process.env.RCAP_SRC05_SOURCE_DIR ?? null
});

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

/** The same entry, looked for under an environment-named root for its custody. */
function overridePathFor(index, entry) {
  const custodyId = entry?.custody ?? null;
  const overrideRoot = custodyId ? CUSTODY_ROOT_OVERRIDES[custodyId] : null;
  if (!overrideRoot) return null;
  const custody = (index.custodies ?? []).find((row) => row.id === custodyId);
  if (!custody) return null;
  const withinCustody = custody.pathsRelativeTo === "repositoryRoot"
    ? path.relative(custody.root, entry.path)
    : entry.path;
  if (!withinCustody || withinCustody.startsWith("..") || path.isAbsolute(withinCustody)) return null;
  const base = path.resolve(overrideRoot);
  const candidate = path.resolve(base, withinCustody);
  if (!candidate.startsWith(`${base}${path.sep}`)) return null;
  return candidate;
}

/**
 * Every custody root this container actually holds, so a refusal can say what it
 * searched instead of implying it searched everything.
 */
function mountedCustodyRoots(index, resolver) {
  const roots = [];
  for (const custody of index.custodies ?? []) {
    const declared = resolver.rootFor(custody.id);
    const override = CUSTODY_ROOT_OVERRIDES[custody.id]
      ? path.resolve(CUSTODY_ROOT_OVERRIDES[custody.id]) : null;
    for (const root of [declared, override]) {
      if (!root || roots.some((row) => row.root === root)) continue;
      roots.push({ custody: custody.id, root, mounted: fs.existsSync(root) });
    }
  }
  return roots;
}

/**
 * Look for the declared digest by CONTENT under a root, not by filename. A form
 * is bound by its bytes, so a similarly named file, a different revision or a
 * locator page must never satisfy it.
 */
function findByContent(root, wantSha256, wantByteLength) {
  const hits = [];
  const skip = new Set([".git", "node_modules"]);
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) { if (!skip.has(entry.name)) walk(full); continue; }
      if (!entry.isFile()) continue;
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      // Byte length is pinned, so anything of another size cannot be these bytes.
      if (stat.size !== wantByteLength) continue;
      try { if (sha256(fs.readFileSync(full)) === wantSha256) hits.push(full); } catch { /* unreadable */ }
    }
  };
  walk(root);
  return hits;
}

function resolveSource() {
  const index = readJson(CORPUS_INDEX);
  const resolver = makeCorpusEntryResolver(index, {
    repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR
  });
  const entry = (index.entries ?? []).find((row) => row.path === SOURCE.path);
  if (!entry) {
    return { resolved: null, index, resolver,
      failure: { why: `no committed index entry at ${SOURCE.path}` } };
  }
  if (entry.sha256 !== SOURCE.sha256) {
    return { resolved: null, index, resolver,
      failure: { why: `the committed index pins ${entry.sha256}, not the digest this family declares` } };
  }

  const declaredPath = resolver.resolve(entry);
  const overridePath = overridePathFor(index, entry);
  const pathsTried = [declaredPath, overridePath].filter(Boolean);
  let absolute = pathsTried.find((candidate) => fs.existsSync(candidate)) ?? null;
  let resolvedThrough = absolute === declaredPath
    ? "the corpus index custody declaration"
    : absolute ? `an environment-named root for custody ${entry.custody}` : null;

  // The declared path failing is not the same as the bytes being absent. Search
  // every mounted custody root by content before saying they are not here.
  const rootsSearched = mountedCustodyRoots(index, resolver);
  let contentHits = [];
  if (!absolute) {
    for (const row of rootsSearched) {
      if (!row.mounted) continue;
      contentHits = contentHits.concat(findByContent(row.root, SOURCE.sha256, SOURCE.byteLength));
    }
    if (contentHits.length > 0) {
      absolute = contentHits[0];
      resolvedThrough = "a content-digest search of the mounted custody roots; the declared path did not hold it";
    }
  }

  if (!absolute) {
    return { resolved: null, index, resolver, rootsSearched, pathsTried, failure: null };
  }

  const bytes = fs.readFileSync(absolute);
  const digest = sha256(bytes);
  if (digest !== SOURCE.sha256) {
    return { resolved: null, index, resolver, rootsSearched, pathsTried,
      failure: { why: `SHA-256 drift: the binary at ${absolute} hashes ${digest}` } };
  }
  if (bytes.length !== SOURCE.byteLength) {
    return { resolved: null, index, resolver, rootsSearched, pathsTried,
      failure: { why: `byte length drift: ${bytes.length} rather than the pinned ${SOURCE.byteLength}` } };
  }
  return { resolved: { ...SOURCE, absolute, bytes, custody: entry.custody, resolvedThrough },
    index, resolver, rootsSearched, pathsTried, failure: null };
}

function acquisitionHandle() {
  try {
    const record = readJson(ACQUISITION_RETURN);
    const row = (record.binaries ?? []).find((item) => item.sourceObligationId === SOURCE.sourceId);
    if (!row) return null;
    return {
      record: ACQUISITION_RETURN,
      storedTitle: row.storedTitle ?? null,
      fileId: row.fileId ?? null,
      visibility: row.visibility ?? null,
      digestVerifiedAtAcquisition: row.observedSha256 === SOURCE.sha256,
      byteLengthVerifiedAtAcquisition: row.observedByteLength === SOURCE.byteLength,
      note: "Recovering these bytes is an owner action. This builder performs no network acquisition."
    };
  } catch { return null; }
}

const NULL_COUNTERS = Object.freeze({
  knownRequiredFieldsMissing: null, requiredFactsNotCollected: null, unclassifiedBlanks: null,
  incompleteRows: null, requiredOptionsMissing: null, requiredComponentsMissing: null,
  invisibleWrites: null, protectedWrites: null, visualDefects: null
});

async function build() {
  const { resolved, rootsSearched = [], pathsTried = [], failure } = resolveSource();

  if (!resolved) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      routeKeys: ROUTE_KEYS, packetComponents: COMPONENTS, directory: OUT_REL,
      overlayDirectoryTouched: false,
      counters: { ...NULL_COUNTERS },
      countersAreNullBecause:
        "no packet was built, so no counter was measured. A zero here would be a claim about a packet that does not exist.",
      failedSourceIdentities: [{
        sourceIdentity: SOURCE.sourceId,
        officialFormId: SOURCE.officialFormId,
        declaredPath: SOURCE.path,
        declaredSha256: SOURCE.sha256,
        declaredByteLength: SOURCE.byteLength,
        custody: "src05_worker_materialization_2026_09_02",
        why: failure?.why
          ?? "no file under any mounted custody root hashes to this digest, by declared path or by content search",
        pathsTried,
        custodyRootsSearchedByContent: rootsSearched
      }],
      whatWasNotDone:
        "No similarly named file, no other revision and no locator page was accepted in its place, and no network "
        + "acquisition was attempted.",
      reAcquisition: acquisitionHandle(),
      packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
    };
  }

  // The bytes are here. Bind them, read what the index claims about them back
  // out of the binary, and stop: the fill for this family has never been written
  // and has never been exercised against a real ABPP-3.
  const pdf = await PDFDocument.load(resolved.bytes, { ignoreEncryption: true, updateMetadata: false });
  let acroFieldCount = 0;
  try { acroFieldCount = pdf.getForm().getFields().length; } catch { acroFieldCount = 0; }

  return {
    familyId: FAMILY_ID, status: "STOPPED", stopClass: "NOT_IMPLEMENTED_BEYOND_SOURCE_BINDING",
    routeKeys: ROUTE_KEYS, packetComponents: COMPONENTS, directory: OUT_REL,
    overlayDirectoryTouched: false,
    counters: { ...NULL_COUNTERS },
    countersAreNullBecause: "no packet was built, so no counter was measured",
    sourceBinding: {
      sourceId: SOURCE.sourceId, officialFormId: SOURCE.officialFormId,
      pathInArchive: SOURCE.path, sha256: resolved.sha256,
      byteLength: resolved.bytes.length, custody: resolved.custody,
      resolvedThrough: resolved.resolvedThrough,
      boundBy: "exact_content_sha256",
      readBackFromTheBinary: {
        pageCount: pdf.getPageCount(), acroFieldCount,
        indexClaimedPageCount: SOURCE.pageCount, indexClaimedAcroFieldCount: SOURCE.acroFieldCount,
        agreesWithTheCommittedIndex:
          pdf.getPageCount() === SOURCE.pageCount && acroFieldCount === SOURCE.acroFieldCount
      }
    },
    why:
      "The source binds. The fill for this family was never written: at the time this builder was authored the bytes "
      + "had never been present in any container this repository runs in, and a fill drafted against a form nobody "
      + "could open would assert a capability that was never exercised. The next lane implements the census, the field "
      + "map, the overlay and the two fixtures against these now-present bytes.",
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  build().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}

export { build, FAMILY_ID, OUT_REL, SOURCE };
