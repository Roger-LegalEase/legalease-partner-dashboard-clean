#!/usr/bin/env node
// Resolves every family that still has no source binary, using the corpus's own
// governance records rather than another web fetch.
//
// The families that look unresolvable are keyed by the filename each form was
// scraped under. The Master Library already recorded what happened to those
// filenames: DUPLICATE_SOURCE_LOG.csv maps each one to the canonical path it
// was deduplicated into, and MASTER_ASSET_MANIFEST.csv carries every asset's
// hash, document id and revision. Matching against those is the difference
// between "we do not have this form" and "we have it under the name the
// library gave it".
//
// Nothing here re-pins a family. A match is a candidate for a person: the
// pinned hash records which edition was reviewed, and a different edition of
// the same form is the normal case.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = process.env.OFFICIAL_FORMS_SOURCE_DIR
  ?? path.join(rootDir, "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1");
const GOV = path.join(CORPUS, "00_GOVERNANCE");
const OVERLAY_DIR = path.join(rootDir, "data/rcap-all50/overlays/production");
const OUT = path.join(rootDir, "data/rcap-all50/missing-source-corpus-reconciliation.json");

const readJson = (p, fallback = null) => {
  if (!fs.existsSync(p)) return fallback;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
};
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

// Quoted CSV with embedded commas and newlines in the notes columns.
function parseCsv(file) {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  const header = rows.shift() ?? [];
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const manifest = parseCsv(path.join(GOV, "MASTER_ASSET_MANIFEST.csv"));
const duplicates = parseCsv(path.join(GOV, "DUPLICATE_SOURCE_LOG.csv"));

const manifestBySha = new Map(manifest.map((m) => [m.sha256, m]));
const manifestByCanonicalPath = new Map(manifest.map((m) => [m.canonical_relative_path, m]));
// Both the library filename and the original scraped filename, normalized.
const manifestByFilename = new Map();
for (const m of manifest) {
  for (const name of [m.source_filename, path.basename(m.canonical_relative_path ?? "")]) {
    if (name) manifestByFilename.set(norm(name.replace(/\.pdf$/i, "")), m);
  }
}
// The scraped name a duplicate was collapsed under, and where it went.
const duplicateByFilename = new Map();
for (const d of duplicates) {
  if (d.duplicate_source_filename) {
    duplicateByFilename.set(norm(d.duplicate_source_filename.replace(/\.pdf$/i, "")), d);
  }
}

const shaOnDisk = new Map();
(function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "__MACOSX" || entry.name.startsWith("._")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.pdf$/i.test(entry.name)) {
      const sha = crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex");
      if (!shaOnDisk.has(sha)) shaOnDisk.set(sha, path.relative(CORPUS, full));
    }
  }
})(CORPUS);

const rows = [];
for (const state of fs.readdirSync(OVERLAY_DIR).sort()) {
  const stateDir = path.join(OVERLAY_DIR, state);
  if (!fs.statSync(stateDir).isDirectory()) continue;
  for (const family of fs.readdirSync(stateDir).sort()) {
    const familyDir = path.join(stateDir, family);
    const record = readJson(path.join(familyDir, "source-record.json"));
    if (!record) continue;
    if (fs.existsSync(path.join(familyDir, "source-receipt.json"))) continue;

    const jurisdiction = record.jurisdiction;
    const scrapedName = norm(String(family).replace(/\.(pdf|html?)$/i, ""));
    const matches = [];

    // 1. exact pinned hash, in the corpus
    if (record.sha256 && shaOnDisk.has(record.sha256)) {
      matches.push({ how: "exact_pinned_sha256", path: shaOnDisk.get(record.sha256), sha256: record.sha256, editionMatchesThePin: true });
    }
    // 2. exact pinned hash, named by the manifest even if not on disk
    if (record.sha256 && manifestBySha.has(record.sha256)) {
      const m = manifestBySha.get(record.sha256);
      matches.push({ how: "exact_pinned_sha256_in_master_manifest", path: m.canonical_relative_path, sha256: m.sha256, revision: m.revision, editionMatchesThePin: true });
    }
    // 3. the library already recorded this exact filename as a duplicate it
    //    collapsed into a canonical copy. This is the alias case.
    if (duplicateByFilename.has(scrapedName)) {
      const d = duplicateByFilename.get(scrapedName);
      const m = manifestByCanonicalPath.get(d.kept_canonical_path) ?? null;
      matches.push({
        how: "recorded_as_an_exact_duplicate_of_a_canonical_copy",
        path: d.kept_canonical_path, sha256: d.sha256, revision: m?.revision ?? null,
        editionMatchesThePin: d.sha256 === record.sha256,
        libraryReason: d.reason
      });
    }
    // 4. the filename is the library's own source filename for an asset
    if (manifestByFilename.has(scrapedName)) {
      const m = manifestByFilename.get(scrapedName);
      matches.push({ how: "filename_matches_a_master_manifest_asset", path: m.canonical_relative_path, sha256: m.sha256, revision: m.revision, editionMatchesThePin: m.sha256 === record.sha256 });
    }
    // 5. same jurisdiction and document id, any revision. Most of these
    //    families carry no document id at all -- they are keyed by the filename
    //    they were scraped under -- so the form number is recovered from that
    //    name first. NC scrapes AOC-CR-287 as cr287_1; VA scrapes CC-1473 as
    //    cc1473inst; AL scrapes CR-65 with the revision glued on.
    const documentIdCandidates = new Set();
    if (record.documentId) documentIdCandidates.add(record.documentId);
    const base = String(family).replace(/\.(pdf|html?)$/i, "");
    const nc = /^cr(\d{3})(?:[-_]\d+)?$/i.exec(base);
    if (nc && jurisdiction === "NC") { documentIdCandidates.add(`AOC-CR-${nc[1]}`); documentIdCandidates.add(`CR-${nc[1]}`); }
    const va = /^cc(\d{3,4})(inst)?$/i.exec(base);
    if (va) documentIdCandidates.add(`CC-${va[1]}`);
    const al = /^(cr-\d+[a-z]?)\b/i.exec(base);
    if (al) documentIdCandidates.add(al[1].toUpperCase());
    const vt = /^(\d{3}-\d{5}[a-z]?)/i.exec(base);
    if (vt) documentIdCandidates.add(vt[1].toUpperCase());
    const ky = /^(\d{3})[-.](\d)$/.exec(base);
    if (ky && jurisdiction === "KY") documentIdCandidates.add(`AOC-${ky[1]}.${ky[2]}`);
    const kyJv = /^jv-(\d+)(?:-(\d))?$/i.exec(base);
    if (kyJv && jurisdiction === "KY") documentIdCandidates.add(`AOC-JV-${kyJv[1]}${kyJv[2] ? `.${kyJv[2]}` : ""}`);
    const dashed = /^([a-z]{2,3}-\d+(?:[-.]\d+)*[a-z]?)$/i.exec(base);
    if (dashed) documentIdCandidates.add(dashed[1].toUpperCase());

    for (const candidate of documentIdCandidates) {
      for (const m of manifest.filter((x) => x.jurisdiction_code === jurisdiction && norm(x.document_id) === norm(candidate))) {
        matches.push({ how: "same_jurisdiction_and_document_id", matchedDocumentId: m.document_id, path: m.canonical_relative_path, sha256: m.sha256, revision: m.revision, editionMatchesThePin: m.sha256 === record.sha256 });
      }
    }

    const deduped = [];
    const seen = new Set();
    for (const m of matches) {
      const key = `${m.how}|${m.sha256}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(m);
    }
    const onPin = deduped.find((m) => m.editionMatchesThePin);
    // A captured web page is not a form. A PDF library will never hold one, and
    // filing it as an unresolved acquisition sends somebody looking for a
    // document that does not exist.
    const isWebPage = /\.html?$/i.test(record.sourceFileName ?? "")
      || /(^|-)forms(-\d+)?$|expungements?$|-forms$|^nc-expunction-petition$|^al-expungement-petition$|waive-filing-fees-and-service-costs$/i.test(family);

    rows.push({
      familyId: `${jurisdiction}:${family}`,
      jurisdiction,
      documentId: record.documentId ?? null,
      pinnedSha256: record.sha256 ?? null,
      pinnedRevision: record.revision ?? null,
      matches: deduped,
      resolution: onPin ? "resolved_at_the_pinned_edition"
        : deduped.length > 0 ? "same_form_present_at_a_different_edition"
          : isWebPage ? "not_a_form_a_captured_web_page"
            : "unresolved_after_corpus_reconciliation",
      exactNextAction: onPin
        ? `Materialize ${onPin.path} into this family's source path and write its receipt. No acquisition is needed.`
        : deduped.length > 0
          ? "The corpus holds this form at a different edition. Confirm which edition this family should pin, then re-pin or record the pinned one as superseded. Do not fetch it from the web."
          : isWebPage
            ? "This asset is a captured web page, not a form. No PDF library will contain it. Retire it or bind it to the form it links to; it does not belong in an acquisition queue."
            : "Neither the corpus, the Master Asset Manifest nor the duplicate log names this asset under any recognised hash, filename, document id or alias. This one is a genuine acquisition."
    });
  }
}

const payload = {
  schemaVersion: "rcap-missing-source-corpus-reconciliation/v1",
  generatedBy: "scripts/reconcile-rcap-missing-sources-against-corpus.mjs",
  corpusRoot: path.relative(rootDir, CORPUS),
  reconciledAgainst: [
    "every PDF in the mounted corpus, hashed",
    "00_GOVERNANCE/MASTER_ASSET_MANIFEST.csv",
    "00_GOVERNANCE/DUPLICATE_SOURCE_LOG.csv"
  ],
  whatAMatchIsNot: "A match at a different edition is not a decision to re-pin. The pinned hash records which edition was reviewed.",
  totals: {
    familiesWithoutAReceipt: rows.length,
    resolvedAtThePinnedEdition: rows.filter((r) => r.resolution === "resolved_at_the_pinned_edition").length,
    sameFormAtADifferentEdition: rows.filter((r) => r.resolution === "same_form_present_at_a_different_edition").length,
    capturedWebPagesNotForms: rows.filter((r) => r.resolution === "not_a_form_a_captured_web_page").length,
    unresolved: rows.filter((r) => r.resolution === "unresolved_after_corpus_reconciliation").length
  },
  rows
};
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload.totals, null, 1));
for (const r of rows.filter((x) => x.resolution !== "unresolved_after_corpus_reconciliation")) {
  console.log(`  ${r.resolution === "resolved_at_the_pinned_edition" ? "PIN " : "EDIT"} ${r.familyId} -> ${r.matches[0].how}`);
}
