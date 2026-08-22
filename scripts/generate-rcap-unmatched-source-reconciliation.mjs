#!/usr/bin/env node
// Reconciles every family that still has no source binary against the corpus.
//
// These families are keyed by the filename a form was scraped under -- cr287_1,
// 200-00131, expungements.html -- rather than by the form number the corpus is
// organised by, so an exact-hash match finds nothing even where the document is
// sitting in the archive under its official name. Matching on identity rather
// than on filename is the difference between "we do not have this form" and "we
// have it and did not recognise it".
//
// Nothing here rewrites a family's pinned hash. A match found this way is a
// candidate for a person to confirm: same form, different edition, is the
// normal case and the pinned hash is what says which edition was reviewed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OVERLAY_DIR = path.join(rootDir, "data/rcap-all50/overlays/production");
const CORPUS_INDEX = path.join(rootDir, "data/rcap-all50/local-source-corpus-index.json");
const OUT = path.join(rootDir, "data/rcap-all50/unmatched-source-reconciliation.json");

const readJson = (p, fallback = null) => {
  if (!fs.existsSync(p)) return fallback;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
};
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

// A scraped filename carries the form number inside it. These recover it
// without guessing at the document: cr287_1 is AOC-CR-287's first file, and
// 200-00132a is a Vermont form number as printed.
function formNumberCandidatesFrom(slug, jurisdiction) {
  const base = String(slug).replace(/\.(pdf|html?|docx?)$/i, "");
  const out = new Set([base]);
  // NC scrapes as cr287_1 / cr297; the corpus names them AOC-CR-287.
  const nc = /^cr(\d{3})(?:[-_]\d+)?$/i.exec(base);
  if (nc && jurisdiction === "NC") { out.add(`AOC-CR-${nc[1]}`); out.add(`CR-${nc[1]}`); }
  // VT scrapes as 200-00132a; the corpus prints the same number.
  const vt = /^(\d{3}-\d{5}[a-z]?)/i.exec(base);
  if (vt) out.add(vt[1].toUpperCase());
  // KY scrapes as 496.2 / jv-29-1; the corpus prints AOC-496.2 and AOC-JV-29.1.
  const kyNumeric = /^(\d{3})[-.](\d)$/.exec(base);
  if (kyNumeric && jurisdiction === "KY") out.add(`AOC-${kyNumeric[1]}.${kyNumeric[2]}`);
  const kyJv = /^jv-(\d+)(?:-(\d))?$/i.exec(base);
  if (kyJv && jurisdiction === "KY") out.add(`AOC-JV-${kyJv[1]}${kyJv[2] ? `.${kyJv[2]}` : ""}`);
  // AL scrapes as cr-65a-order-on-petition-for-expungement-10-2024.
  const al = /^(cr-\d+[a-z]?)\b/i.exec(base);
  if (al) out.add(al[1].toUpperCase());
  // VA scrapes as cc1473 / cc1473inst.
  const va = /^cc(\d{3,4})(inst)?$/i.exec(base);
  if (va) out.add(`CC-${va[1]}`);
  // NE and anything already printed as a form number.
  const dashed = /^([a-z]{2,3}-\d+(?:[-.]\d+)*[a-z]?)$/i.exec(base);
  if (dashed) out.add(dashed[1].toUpperCase());
  return [...out];
}

const corpus = readJson(CORPUS_INDEX, { entries: [] });
const byStateForm = new Map();
for (const e of corpus.entries ?? []) {
  const key = `${e.state}|${norm(e.formNumber)}`;
  if (!byStateForm.has(key)) byStateForm.set(key, []);
  byStateForm.get(key).push(e);
}

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
    // A .html asset is a web page that was captured, not a form. A PDF archive
    // will never contain it, and reporting it as an unresolved source
    // acquisition sends someone looking for a document that does not exist.
    const isWebPage = /\.html?$/i.test(record.sourceFileName ?? "") || /-forms$|expungements$|^forms(-\d+)?$|petition$|expungement$/i.test(family);
    const candidates = formNumberCandidatesFrom(family, jurisdiction);
    const matches = candidates.flatMap((c) => byStateForm.get(`${jurisdiction}|${norm(c)}`) ?? []);

    rows.push({
      familyId: `${jurisdiction}:${family}`,
      jurisdiction,
      keyedBy: record.documentId ? "form_number" : "scraped_filename",
      pinnedSha256: record.sha256 ?? null,
      pinnedRevision: record.revision ?? null,
      formNumberCandidates: candidates,
      corpusMatches: matches.map((m) => ({
        path: m.path, formNumber: m.formNumber, revision: m.revision,
        sha256: m.sha256, structuralClassObserved: m.structuralClassObserved
      })),
      resolution: matches.length > 0
        ? "same_form_present_in_the_corpus_under_a_different_edition"
        : isWebPage
          ? "not_a_form_a_captured_web_page"
          : "genuinely_unresolved",
      exactNextAction: matches.length > 0
        ? "The corpus holds this form under its official number at a different hash. Confirm the edition, then either re-pin this family to the corpus edition or record that the pinned edition is superseded. Do not fetch it from the web."
        : isWebPage
          ? "This asset is a captured web page, not a form. A PDF archive will never contain it. Retire it or bind it to the form it links to; do not queue it for source acquisition."
          : "No file in the corpus carries this form number for this jurisdiction under any recognised spelling. This one is a genuine acquisition."
    });
  }
}

const payload = {
  schemaVersion: "rcap-unmatched-source-reconciliation/v1",
  generatedBy: "scripts/generate-rcap-unmatched-source-reconciliation.mjs",
  purpose: "Families with no exact-hash match, reconciled against the corpus by form-number identity rather than by the filename they were scraped under.",
  whatAMatchHereIsNot: "A match is not a decision to re-pin. The pinned hash records which edition was reviewed; a different edition of the same form is the normal case and needs a person.",
  totals: {
    familiesWithoutABinary: rows.length,
    sameFormPresentUnderADifferentEdition: rows.filter((r) => r.resolution === "same_form_present_in_the_corpus_under_a_different_edition").length,
    capturedWebPagesNotForms: rows.filter((r) => r.resolution === "not_a_form_a_captured_web_page").length,
    genuinelyUnresolved: rows.filter((r) => r.resolution === "genuinely_unresolved").length
  },
  rows
};
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload.totals, null, 1));
for (const r of rows.filter((x) => x.resolution === "genuinely_unresolved")) console.log(`  unresolved ${r.familyId}`);
