#!/usr/bin/env node
// Writes a source receipt beside every family whose pinned binary is present.
//
//   node scripts/materialize-rcap-family-sources.mjs
//   node scripts/materialize-rcap-family-sources.mjs --check
//
// The bytes themselves stay in private/source-imports: they are the issuing
// courts' documents, they are large, and committing 300 official PDFs into an
// application repository is not this lane's decision to make. What is committed
// is the receipt -- where the family's source lives, its hash, its size, and
// its structure read from the bytes -- so a later session can tell whether the
// corpus it has is the corpus these artifacts were built from, and can say
// exactly which file is missing when it is not.
//
// A receipt is written only when the bytes match the hash the family pins.
// A near-match is a different document.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OVERLAY_DIR = path.join(rootDir, "data/rcap-all50/overlays/production");
const CORPUS_INDEX = path.join(rootDir, "data/rcap-all50/local-source-corpus-index.json");
const CORPUS_ROOT = path.join(rootDir, "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1");
const checkOnly = process.argv.includes("--check");

const readJson = (p, fallback = null) => {
  if (!fs.existsSync(p)) return fallback;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
};

const corpus = readJson(CORPUS_INDEX, { entries: [] });
const bySha = new Map((corpus.entries ?? []).map((e) => [e.sha256, e]));

const written = [];
const unmatched = [];

for (const state of fs.readdirSync(OVERLAY_DIR).sort()) {
  const stateDir = path.join(OVERLAY_DIR, state);
  if (!fs.statSync(stateDir).isDirectory()) continue;
  for (const family of fs.readdirSync(stateDir).sort()) {
    const familyDir = path.join(stateDir, family);
    const record = readJson(path.join(familyDir, "source-record.json"));
    if (!record) continue;
    const retired = fs.existsSync(path.join(familyDir, "retirement.json"));

    const entry = record.sha256 ? bySha.get(record.sha256) ?? null : null;
    if (!entry) {
      unmatched.push({ familyId: `${record.jurisdiction}:${family}`, sha256: record.sha256 ?? null, retired });
      continue;
    }

    const absolute = path.join(CORPUS_ROOT, entry.path);
    const bytes = fs.readFileSync(absolute);
    const observed = crypto.createHash("sha256").update(bytes).digest("hex");
    // Re-hashed here rather than trusted from the index: the index is a record
    // of a past read, and this receipt is a claim about the file right now.
    if (observed !== record.sha256) {
      unmatched.push({ familyId: `${record.jurisdiction}:${family}`, sha256: record.sha256,
        reason: `the corpus file at ${entry.path} hashes to ${observed}` , retired });
      continue;
    }

    const receipt = {
      schemaVersion: "rcap-family-source-receipt/v1",
      familyId: `${record.jurisdiction}:${family}`,
      jurisdiction: record.jurisdiction,
      documentId: record.documentId ?? null,
      revision: record.revision ?? entry.revision ?? null,
      sha256: observed,
      byteLength: bytes.length,
      sourceArchive: "Expungement_AI_RCAP_Master_Library_Edition_1",
      pathInArchive: entry.path,
      // Where the bytes actually are on this machine. Not committed, and
      // reconstructible from the archive above.
      resolvedPath: path.relative(rootDir, absolute),
      structuralClassObserved: entry.structuralClassObserved,
      pageCount: entry.pageCount,
      acroFieldCount: entry.acroFieldCount,
      xfaPresent: entry.xfaPresent,
      matchedBy: "exact_pinned_sha256",
      // Stated so nobody reads a receipt as a currentness finding.
      whatThisReceiptDoesNotEstablish: [
        "that this is the current official edition of the form",
        "that it has not been superseded since the archive was assembled",
        "that this asset has a named current use"
      ]
    };
    if (!checkOnly) {
      fs.writeFileSync(path.join(familyDir, "source-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
    }
    written.push({ familyId: receipt.familyId, retired, structuralClassObserved: entry.structuralClassObserved });
  }
}

const summary = {
  familiesWithAReceipt: written.length,
  operational: written.filter((w) => !w.retired).length,
  retired: written.filter((w) => w.retired).length,
  acroform: written.filter((w) => w.structuralClassObserved === "acroform").length,
  flat: written.filter((w) => w.structuralClassObserved === "flat_pdf").length,
  familiesWithoutAMatchingBinary: unmatched.length,
  operationalFamiliesWithoutAMatchingBinary: unmatched.filter((u) => !u.retired).length
};
console.log(JSON.stringify(summary, null, 1));
