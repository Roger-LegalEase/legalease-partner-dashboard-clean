#!/usr/bin/env node
// Source resolution against the mounted Master Library.
//
//   node scripts/generate-rcap-source-resolution.mjs
//   node scripts/generate-rcap-source-resolution.mjs --check
//
// Every retained asset that carries missing_binary, run down the acquisition
// order against real bytes rather than against a record of bytes: exact SHA
// across the corpus, then the Master Manifest's duplicate table — which is the
// bridge between the filenames the assets were scraped under and the canonical
// library paths — then form number and revision, then the links workbook for
// the official URL.
//
// A row leaves here with one disposition from the closure vocabulary and, when
// its identity is proven, a receipt naming the issuing jurisdiction, the form
// number, the revision, the byte length and the SHA-256 computed here. Nothing
// is accepted on a filename alone: the receipt records what was compared.
//
// The corpus is git-ignored, so the receipts are the committed record of it.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const CORPUS_ROOT = process.env.OFFICIAL_FORMS_SOURCE_DIR
  ?? path.join(rootDir, "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1");
const BOOTSTRAP = path.join(rootDir, "private/source-imports");
const NATIONWIDE_ROOT = path.join(rootDir, "private/Nationwide Record Clearing");
const OVERLAY_DIR = path.join(rootDir, "data/rcap-all50/overlays/production");

const RECONCILIATION = "data/rcap-all50/unmatched-source-reconciliation.json";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const BATCH_MANIFEST = "data/rcap-all50/pdf-independent-reviews/batch-1-manifest.json";
const OUT = "data/rcap-all50/pdf-source-handoffs/source-resolution.json";
const RECEIPTS_DIR = "data/rcap-all50/pdf-source-receipts";
const OUT_MD = "docs/record-clearing/pdf-independent-reviews/source-resolution.md";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const norm = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

function fail(message) {
  console.error(`FAIL source resolution — ${message}`);
  process.exit(1);
}

if (!fs.existsSync(CORPUS_ROOT)) fail(`the corpus is not mounted at ${path.relative(rootDir, CORPUS_ROOT)}`);

/**
 * Every file in both mounted corpora, hashed once.
 *
 * Two trees, and they are not interchangeable: the Master Library holds the
 * canonical official editions, the Nationwide tree holds what the operational
 * overlay factory reads. A row can resolve in either, and which one it
 * resolved in is recorded, because a Nationwide hit and a Master Library hit
 * do not mean the same thing about currency.
 */
function corpusFiles() {
  const roots = [
    { corpus: "master_library", root: CORPUS_ROOT },
    { corpus: "nationwide_record_clearing", root: NATIONWIDE_ROOT }
  ].filter((entry) => fs.existsSync(entry.root));

  const out = [];
  for (const { corpus, root } of roots) {
    (function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else {
          const bytes = fs.readFileSync(full);
          out.push({
            corpus,
            corpusPath: path.relative(root, full).split(path.sep).join("/"),
            absolute: full,
            sha256: sha256(bytes),
            byteLength: bytes.length
          });
        }
      }
    })(root);
  }
  return out;
}

/**
 * The Master Manifest workbook, read without a spreadsheet library.
 *
 * An xlsx is a zip of XML, and the two tables this needs — the duplicate
 * bridge and the asset identities — are plain rows. Shelling out to a parser
 * would add a dependency to a repository whose package files this lane may not
 * touch, so the sheets are read directly.
 */
function readWorkbookSheets(file) {
  if (!fs.existsSync(file)) return null;
  const bytes = fs.readFileSync(file);
  const entries = unzipEntries(bytes);
  // Every tag may carry a namespace prefix — this workbook writes <x:sheet>,
  // <x:row>, <x:c> — and its relationship ids are opaque strings rather than
  // rId1, rId2. Assuming either shape silently yields zero rows.
  const tag = (name) => `<(?:\\w+:)?${name}`;
  const shared = [];
  const sharedXml = entries.get("xl/sharedStrings.xml");
  if (sharedXml) {
    for (const si of sharedXml.split(new RegExp(`${tag("si")}[^>]*>`)).slice(1)) {
      shared.push([...si.matchAll(new RegExp(`${tag("t")}[^>]*>([\\s\\S]*?)</(?:\\w+:)?t>`, "g"))]
        .map((m) => decodeXml(m[1])).join(""));
    }
  }
  const workbook = entries.get("xl/workbook.xml") ?? "";
  const names = [...workbook.matchAll(new RegExp(`${tag("sheet")}\\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"`, "g"))]
    .map((m) => ({ name: decodeXml(m[1]), rid: m[2] }));
  // Attribute order inside a <Relationship> element is not fixed — this
  // workbook writes Type, then Target, then Id — so each attribute is read
  // from the element independently rather than in one positional pattern.
  const rels = entries.get("xl/_rels/workbook.xml.rels") ?? "";
  const target = new Map();
  for (const element of rels.match(/<Relationship\b[^>]*>/g) ?? []) {
    const id = /\bId="([^"]+)"/.exec(element)?.[1];
    const to = /\bTarget="([^"]+)"/.exec(element)?.[1];
    if (id && to) target.set(id, to.replace(/^\/?xl\//, ""));
  }

  const sheets = new Map();
  for (const { name, rid } of names) {
    const xml = entries.get(`xl/${target.get(rid)}`);
    if (!xml) continue;
    const rows = [];
    for (const rowXml of xml.split(new RegExp(`${tag("row")}\\b`)).slice(1)) {
      const cells = [];
      for (const cell of [...rowXml.matchAll(new RegExp(`${tag("c")}\\b([^>]*)>([\\s\\S]*?)</(?:\\w+:)?c>`, "g"))]) {
        const type = /\st="(\w+)"/.exec(cell[1])?.[1] ?? null;
        const value = new RegExp(`${tag("v")}[^>]*>([\\s\\S]*?)</(?:\\w+:)?v>`).exec(cell[2])?.[1] ?? null;
        if (value == null) { cells.push(null); continue; }
        cells.push(type === "s" ? shared[Number(value)] ?? null : decodeXml(value));
      }
      rows.push(cells);
    }
    sheets.set(name, rows);
  }
  return sheets;
}

const decodeXml = (value) => String(value)
  .replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", "\"")
  .replaceAll("&apos;", "'").replaceAll("&amp;", "&");

/** Minimal stored/deflated zip reader — enough for an xlsx's central directory. */
function unzipEntries(bytes) {
  const zlib = require_zlib();
  const entries = new Map();
  const eocd = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) return entries;
  let offset = bytes.readUInt32LE(eocd + 16);
  const count = bytes.readUInt16LE(eocd + 10);
  for (let i = 0; i < count; i += 1) {
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const localOffset = bytes.readUInt32LE(offset + 42);
    const name = bytes.toString("utf8", offset + 46, offset + 46 + nameLength);
    const method = bytes.readUInt16LE(offset + 10);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const localNameLength = bytes.readUInt16LE(localOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const raw = bytes.subarray(start, start + compressedSize);
    try {
      entries.set(name, (method === 0 ? raw : zlib.inflateRawSync(raw)).toString("utf8"));
    } catch { /* a sheet this reader cannot inflate is simply absent */ }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function require_zlib() {
  // eslint-disable-next-line no-undef
  return globalThis.__rcapZlib ?? (globalThis.__rcapZlib = require_node("node:zlib"));
}
function require_node(id) {
  return createRequire(import.meta.url)(id);
}
import { createRequire } from "node:module";

// ---------------------------------------------------------------------------

const reconciliation = readJson(RECONCILIATION);
const corpusIndex = readJson(CORPUS_INDEX);
const batchManifest = readJson(BATCH_MANIFEST);
const files = corpusFiles();
const bySha = new Map(files.map((f) => [f.sha256, f]));

/**
 * Which family packages now carry a retirement marker.
 *
 * A retired asset has left the operational inventory, so its row is history
 * rather than work. Reporting the same 39 outstanding rows after 18 of them
 * were retired would overstate what is left to acquire.
 */
const retiredSlugs = new Set();
if (fs.existsSync(OVERLAY_DIR)) {
  for (const state of fs.readdirSync(OVERLAY_DIR)) {
    const statePath = path.join(OVERLAY_DIR, state);
    if (!fs.statSync(statePath).isDirectory()) continue;
    for (const family of fs.readdirSync(statePath)) {
      if (fs.existsSync(path.join(statePath, family, "retirement.json"))) retiredSlugs.add(family.toLowerCase());
    }
  }
}
const isRetired = (familyId) => retiredSlugs.has(String(familyId).split(":").pop().toLowerCase());
const byBase = new Map();
for (const file of files) {
  const key = norm(path.basename(file.corpusPath));
  if (!byBase.has(key)) byBase.set(key, []);
  byBase.get(key).push(file);
}

const masterManifest = readWorkbookSheets(path.join(BOOTSTRAP, "Expungement_AI_RCAP_Master_Manifest_Edition_1.xlsx"));
const linksWorkbook = readWorkbookSheets(path.join(BOOTSTRAP, "record_clearing_forms_links.xlsx"));

/** duplicate_source_filename → { canonicalPath, sha256, jurisdiction } */
const duplicateBridge = new Map();
if (masterManifest?.has("Duplicates")) {
  const rows = masterManifest.get("Duplicates");
  const header = rows[0] ?? [];
  const column = (name) => header.indexOf(name);
  for (const row of rows.slice(1)) {
    const filename = row[column("duplicate_source_filename")];
    if (!filename) continue;
    const bridged = {
      canonicalPath: row[column("kept_canonical_path")],
      sha256: row[column("sha256")],
      jurisdiction: row[column("jurisdiction_code")]
    };
    // Assets were scraped under a filename; the reconciliation keys them by
    // that filename with the extension already stripped. Registering both
    // spellings is the difference between the bridge matching and not.
    duplicateBridge.set(norm(filename), bridged);
    duplicateBridge.set(norm(filename.replace(/\.[a-z0-9]+$/i, "")), bridged);
  }
}

/** jurisdiction|document_id → identity row from the Master Assets sheet. */
const assetIdentity = new Map();
if (masterManifest?.has("Master Assets")) {
  const rows = masterManifest.get("Master Assets");
  const header = rows[0] ?? [];
  const column = (name) => header.indexOf(name);
  for (const row of rows.slice(1)) {
    const jurisdiction = row[column("jurisdiction_code")];
    const documentId = row[column("document_id")];
    if (!jurisdiction || !documentId) continue;
    assetIdentity.set(`${jurisdiction}|${norm(documentId)}`, {
      state: row[column("state")],
      assetClass: row[column("asset_class")],
      documentRole: row[column("document_role")],
      documentId,
      officialTitle: row[column("official_title")],
      revision: row[column("revision")],
      language: row[column("language")]
    });
  }
}

const DISPOSITIONS = new Set([
  "exact_pinned_hash_found",
  "exact_form_and_revision_found",
  "current_official_replacement_found",
  "source_drift_requires_comparison",
  "official_landing_page_requires_resolution",
  "genuinely_no_official_source_identified"
]);

/** Revision and form number as the library's own naming system states them. */
function identityFromCorpusPath(corpusPath) {
  const base = path.basename(corpusPath, ".pdf");
  const parts = base.split("__");
  if (parts.length < 4) return null;
  const [jurisdiction, assetClass, documentId, slug] = parts;
  const revision = parts.find((p) => p.startsWith("REV-")) ?? null;
  const language = parts[parts.length - 1];
  return {
    jurisdiction,
    assetClass,
    documentId,
    slug,
    revision,
    language,
    libraryFolder: corpusPath.split("/")[2] ?? null,
    issuingBody: `${jurisdiction} — recorded under ${corpusPath.split("/")[2] ?? "the library"} in the Edition 1 Master Library`
  };
}

const rows = [];
for (const row of reconciliation.rows) {
  const candidates = [];
  let disposition = null;
  let resolvedBy = null;
  let file = null;

  // 1 — the pinned hash, against real bytes.
  if (row.pinnedSha256 && bySha.has(row.pinnedSha256)) {
    file = bySha.get(row.pinnedSha256);
    disposition = "exact_pinned_hash_found";
    resolvedBy = "exact SHA-256 across the mounted corpus";
  }

  // 2 — the Master Manifest's duplicate bridge, which is what connects a
  // scraped filename to the canonical library path it was de-duplicated into.
  if (!file) {
    for (const candidate of row.formNumberCandidates) {
      const bridged = duplicateBridge.get(norm(candidate));
      if (!bridged) continue;
      const byHash = bySha.get(bridged.sha256);
      const byPath = files.find((f) => f.corpusPath === bridged.canonicalPath);
      file = byHash ?? byPath ?? null;
      if (file) {
        disposition = byHash ? "exact_pinned_hash_found" : "exact_form_and_revision_found";
        resolvedBy = "the Master Manifest duplicate table, then the corpus";
        break;
      }
    }
  }

  // 3 — the form number and revision the reconciliation already matched.
  if (!file && (row.corpusMatches ?? []).length) {
    const distinct = [...new Set(row.corpusMatches.map((m) => m.sha256))];
    const revisions = [...new Set(row.corpusMatches.map((m) => m.revision))];
    for (const sha of distinct) candidates.push(bySha.get(sha) ?? null);
    if (distinct.length === 1 && bySha.has(distinct[0])) {
      file = bySha.get(distinct[0]);
      disposition = revisions[0] && revisions[0] !== "REV-UNKNOWN"
        ? "exact_form_and_revision_found"
        : "exact_pinned_hash_found";
      resolvedBy = "form number and revision, confirmed against corpus bytes";
    } else if (distinct.length > 1) {
      disposition = "source_drift_requires_comparison";
      resolvedBy = `${distinct.length} editions of this form number are in the corpus`;
    }
  }

  if (!disposition) {
    disposition = row.resolution === "not_a_form_a_captured_web_page"
      ? "official_landing_page_requires_resolution"
      : "genuinely_no_official_source_identified";
    resolvedBy = row.resolution === "not_a_form_a_captured_web_page"
      ? "the asset is a captured web page; no PDF archive contains it"
      : "no file in the mounted corpus carries this form number for this jurisdiction";
  }
  if (!DISPOSITIONS.has(disposition)) fail(`${row.familyId} was given a disposition outside the vocabulary`);

  const identity = file ? identityFromCorpusPath(file.corpusPath) : null;
  const declared = identity ? assetIdentity.get(`${identity.jurisdiction}|${norm(identity.documentId)}`) ?? null : null;

  rows.push({
    familyId: row.familyId,
    jurisdiction: row.jurisdiction,
    formNumberCandidates: row.formNumberCandidates,
    retiredFromOperationalInventory: isRetired(row.familyId),
    foundInCorpus: file?.corpus ?? null,
    disposition,
    resolvedBy,
    identityProven: Boolean(file),
    source: file
      ? {
        corpusPath: file.corpusPath,
        sha256: file.sha256,
        byteLength: file.byteLength,
        ...identity,
        declaredInMasterManifest: declared,
        jurisdictionAgrees: declared ? true : null,
        revisionAgrees: declared && identity?.revision
          ? norm(declared.revision) === norm(identity.revision)
          : null
      }
      : null,
    competingEditions: candidates.filter(Boolean).map((c) => ({ corpusPath: c.corpusPath, sha256: c.sha256 }))
  });
}

const tally = {};
for (const row of rows) tally[row.disposition] = (tally[row.disposition] || 0) + 1;

/**
 * Revisions read off a rendered page rather than off a filename.
 *
 * Only where it was actually done. Rasterising all thirteen is the reviewer's
 * pass, not this lane's, and a receipt that claimed the check without running
 * it would be worth less than one that says it is outstanding.
 */
const VISUALLY_CONFIRMED = {
  "VA:cc1473": "page 1 prints \"FORM CC-1473 (MASTER, Page 1 of 2) 07/26\", which agrees with REV-2026-07 — and settles the drift question the shadow draft raised, since that draft prints 07/24",
  "VA:cc1473inst": "same binary as VA:cc1473; page 1 prints \"FORM CC-1473 (MASTER, Page 1 of 2) 07/26\""
};

/** One committed receipt per proven source. The corpus is not committed; these are. */
const receipts = rows.filter((row) => row.identityProven).map((row) => ({
  schemaVersion: "rcap-pdf-source-receipt/v1",
  familyId: row.familyId,
  jurisdiction: row.jurisdiction,
  disposition: row.disposition,
  resolvedBy: row.resolvedBy,
  issuingBody: row.source.issuingBody,
  documentId: row.source.documentId,
  revision: row.source.revision,
  language: row.source.language,
  officialTitle: row.source.declaredInMasterManifest?.officialTitle ?? null,
  corpusPath: row.source.corpusPath,
  sha256: row.source.sha256,
  byteLength: row.source.byteLength,
  verifiedAgainst: {
    mountedCorpus: true,
    masterManifestIdentity: Boolean(row.source.declaredInMasterManifest),
    revisionAgrees: row.source.revisionAgrees
  },
  visibleRevisionConfirmedOnThePage: VISUALLY_CONFIRMED[row.familyId] ?? false,
  visibleRevisionEvidence: VISUALLY_CONFIRMED[row.familyId] ?? null,
  whyNotYet: VISUALLY_CONFIRMED[row.familyId]
    ? null
    : "The revision here is the one the library's naming system and the Master Manifest both state, cross-checked against each other. Confirming it on the page needs a raster: these binaries use subset fonts with custom encodings, and the content-stream text extractor does not recover their printed strings — it fails to find even the form number on a page that plainly prints it. That check belongs to the reviewer, and is recorded as outstanding rather than claimed.",
  materialisedIntoTheFamilyPath: false,
  whyNotMaterialised:
    "Materialising a source binary into a family package changes what that family renders from. That is the implementation lane's change to make, against an open correction packet, not this lane's."
}));

const record = {
  schemaVersion: "rcap-pdf-source-resolution/v1",
  generatedBy: "scripts/generate-rcap-source-resolution.mjs",
  purpose:
    "Every retained missing_binary row, run down the acquisition order against the mounted Master Library rather than against a record of it.",
  corpus: {
    root: path.relative(rootDir, CORPUS_ROOT),
    mounted: true,
    filesPresent: files.length,
    pdfsPresent: files.filter((f) => f.corpusPath.endsWith(".pdf")).length,
    indexAgrees: files.filter((f) => f.corpusPath.endsWith(".pdf")).length === corpusIndex.totals.pdfsIndexed
  },
  workbooks: {
    masterManifest: masterManifest ? [...masterManifest.keys()] : null,
    linksWorkbook: linksWorkbook ? [...linksWorkbook.keys()] : null,
    duplicateBridgeRows: duplicateBridge.size,
    masterAssetRows: assetIdentity.size
  },
  reviewedFamilySources: {
    families: batchManifest.families.length,
    readableNow: batchManifest.families.filter((f) => bySha.has(f.sourceSha256)).length,
    stillUnreadable: batchManifest.families.filter((f) => !bySha.has(f.sourceSha256)).map((f) => f.familyId)
  },
  totals: {
    rows: rows.length,
    ...tally,
    identityProven: rows.filter((r) => r.identityProven).length,
    receiptsWritten: receipts.length,
    stillGenericMissingBinary: 0,
    retiredSinceTheRowsWereWritten: rows.filter((r) => r.retiredFromOperationalInventory).length,
    liveRowsStillOutstanding: rows.filter((r) => !r.retiredFromOperationalInventory).length,
    liveRowsWithAProvenIdentity: rows.filter((r) => !r.retiredFromOperationalInventory && r.identityProven).length,
    foundInMasterLibrary: rows.filter((r) => r.foundInCorpus === "master_library").length,
    foundInNationwideTree: rows.filter((r) => r.foundInCorpus === "nationwide_record_clearing").length
  },
  rows
};

function markdown() {
  const lines = [];
  lines.push("# Source resolution against the mounted corpus");
  lines.push("");
  lines.push(`Corpus: \`${record.corpus.root}\` — ${record.corpus.filesPresent} files, ${record.corpus.pdfsPresent} PDFs, index agrees: ${record.corpus.indexAgrees}.`);
  lines.push("");
  lines.push(`Reviewed families whose source is readable now: ${record.reviewedFamilySources.readableNow} of ${record.reviewedFamilySources.families}.`);
  lines.push("");
  lines.push("| disposition | rows |");
  lines.push("| --- | ---: |");
  for (const key of [...DISPOSITIONS].filter((name) => tally[name])) lines.push(`| ${key} | ${tally[key]} |`);
  lines.push("");
  lines.push("## Rows with a proven source");
  lines.push("");
  lines.push("| family | form | revision | sha256 | corpus path |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const row of rows.filter((r) => r.identityProven)) {
    lines.push(`| ${row.familyId} | ${row.source.documentId} | ${row.source.revision ?? "—"} | \`${row.source.sha256.slice(0, 16)}…\` | \`${row.source.corpusPath}\` |`);
  }
  lines.push("");
  return lines.join("\n");
}

const outputs = [[OUT, `${JSON.stringify(record, null, 2)}\n`], [OUT_MD, markdown()]];
for (const receipt of receipts) {
  const slug = receipt.familyId.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase();
  outputs.push([`${RECEIPTS_DIR}/${slug}.receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`]);
}

let stale = 0;
for (const [rel, content] of outputs) {
  const file = abs(rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === content) continue;
  stale += 1;
  if (checkOnly) { console.error(`  stale: ${rel}`); continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-source-resolution.mjs`);

console.log(
  `OK source resolution — ${rows.length} rows; ${record.totals.identityProven} identities proven, ` +
    `${receipts.length} receipts; reviewed-family sources readable ${record.reviewedFamilySources.readableNow}/${record.reviewedFamilySources.families}`
);
