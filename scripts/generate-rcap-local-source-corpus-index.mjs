#!/usr/bin/env node
// Indexes the installed Master Library so the register can be reconciled
// against real bytes instead of against a URL somebody hopes still resolves.
//
//   node scripts/generate-rcap-local-source-corpus-index.mjs
//   node scripts/generate-rcap-local-source-corpus-index.mjs --check
//
// The corpus itself is never committed: private/ is ignored, and it is a
// working input, not a repository artifact. What is committed is this index --
// path, identity, hash and structure per file -- so a later session can tell
// whether the corpus it has is the corpus these decisions were made against.
//
// Structure is read from the bytes, not from the file name. A form named
// "__FORM__" that turns out to carry no AcroForm dictionary is a flat-overlay
// job, and naming it otherwise would send the wrong factory at it.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = path.join(rootDir, "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1");
const SHARD_MANIFEST = path.join(rootDir, "private/source-imports/rcap-source-shards-manifest.json");
const OUT = path.join(rootDir, "data/rcap-all50/local-source-corpus-index.json");
const checkOnly = process.argv.includes("--check");

// AppleDouble sidecars are macOS metadata, not documents. Indexing them would
// put 4KB "PDFs" in the corpus that no factory can read.
const isAppleDouble = (name) => name.startsWith("._") || name === ".DS_Store";

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === "__MACOSX" || isAppleDouble(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.pdf$/i.test(entry.name)) out.push(full);
  }
  return out;
}

// The library's naming standard: STATE__CLASS__DOCID__slug__REV-x__LANG.pdf
function identityFromName(fileName) {
  const parts = path.basename(fileName, path.extname(fileName)).split("__");
  return {
    state: parts[0] ?? null,
    assetClass: parts[1] ?? null,
    formNumber: parts[2] ?? null,
    slug: parts[3] ?? null,
    revision: (parts[4] ?? "").startsWith("REV-") ? parts[4] : null,
    language: parts[5] ?? null
  };
}

const files = walk(CORPUS);
const bySha = new Map();
const entries = [];
const duplicates = [];

for (const file of files) {
  const bytes = fs.readFileSync(file);
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  const relative = path.relative(CORPUS, file);
  if (bySha.has(sha256)) {
    duplicates.push({ path: relative, identicalTo: bySha.get(sha256), sha256 });
    continue;
  }
  bySha.set(sha256, relative);

  const identity = identityFromName(file);
  const text = bytes.toString("latin1");
  let pageCount = null;
  let acroFieldCount = null;
  let loadError = null;
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    pageCount = doc.getPageCount();
    try { acroFieldCount = doc.getForm().getFields().length; } catch { acroFieldCount = 0; }
  } catch (error) {
    loadError = error?.message ?? String(error);
  }

  entries.push({
    path: relative,
    fileName: path.basename(file),
    state: identity.state,
    assetClass: identity.assetClass,
    formNumber: identity.formNumber,
    revision: identity.revision,
    language: identity.language,
    byteLength: bytes.length,
    sha256,
    pageCount,
    // Read from the bytes. The name says what someone meant; the dictionary
    // says what the factory will actually find.
    acroFormPresent: /\/AcroForm\b/.test(text),
    acroFieldCount,
    xfaPresent: /\/XFA[\s/[]/.test(text),
    // An XFA form's fields may live entirely in the XML, so an AcroForm
    // dictionary with zero fields on an XFA document means "not readable by
    // this factory", not "nothing to fill".
    structuralClassObserved: loadError ? "unreadable"
      : /\/XFA[\s/[]/.test(text) ? "xfa"
        : (acroFieldCount ?? 0) > 0 ? "acroform"
          : "flat_pdf",
    loadError
  });
}

const shardManifest = fs.existsSync(SHARD_MANIFEST) ? JSON.parse(fs.readFileSync(SHARD_MANIFEST, "utf8")) : null;
let importVerification = null;
if (shardManifest) {
  let declared = 0; let present = 0; let hashOk = 0; const missing = []; const mismatched = [];
  for (const shard of shardManifest.shards ?? []) {
    for (const f of shard.files ?? []) {
      declared += 1;
      const p = path.join(CORPUS, f.path);
      if (!fs.existsSync(p)) { missing.push(f.path); continue; }
      present += 1;
      const sha = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
      if (sha === f.sha256) hashOk += 1; else mismatched.push({ path: f.path, declared: f.sha256, observed: sha });
    }
  }
  importVerification = {
    shardsDeclared: (shardManifest.shards ?? []).length,
    sourceArchiveSha256: shardManifest.source_archive_sha256 ?? null,
    filesDeclared: declared, filesPresent: present, filesHashVerified: hashOk,
    filesMissing: missing, filesHashMismatched: mismatched
  };
}

const byState = {};
const byStructure = {};
for (const e of entries) {
  byState[e.state ?? "unknown"] = (byState[e.state ?? "unknown"] ?? 0) + 1;
  byStructure[e.structuralClassObserved] = (byStructure[e.structuralClassObserved] ?? 0) + 1;
}

const payload = {
  schemaVersion: "rcap-local-source-corpus-index/v1",
  generatedBy: "scripts/generate-rcap-local-source-corpus-index.mjs",
  purpose: "An index of the installed Master Library, so every asset can be reconciled against bytes that are actually present rather than against a URL.",
  corpusRoot: path.relative(rootDir, CORPUS),
  corpusIsNotCommitted: "private/ is git-ignored. This index is the committed record of what the corpus contained; the corpus itself is a working input.",
  whatThisIndexDoesNotEstablish: [
    "that a file is the current official edition",
    "that a file has not been superseded since it was collected",
    "that a form belongs on any particular route"
  ],
  importVerification,
  totals: {
    pdfsIndexed: entries.length,
    exactDuplicateBinariesSkipped: duplicates.length,
    byStructure,
    statesRepresented: Object.keys(byState).length
  },
  byState,
  duplicates,
  entries
};

if (checkOnly) {
  const committed = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (committed !== `${JSON.stringify(payload, null, 2)}\n`) {
    console.error("FAIL local source corpus index has drifted from the committed record");
    process.exit(1);
  }
  console.log("OK local source corpus index matches the committed record");
  process.exit(0);
}

fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload.totals, null, 1));
if (importVerification) {
  console.log(`import: ${importVerification.shardsDeclared} shards, ${importVerification.filesPresent}/${importVerification.filesDeclared} files present, ${importVerification.filesHashVerified} hash-verified, ${importVerification.filesMissing.length} missing, ${importVerification.filesHashMismatched.length} mismatched`);
  for (const m of importVerification.filesHashMismatched) console.log(`  MISMATCH ${m.path}`);
}
