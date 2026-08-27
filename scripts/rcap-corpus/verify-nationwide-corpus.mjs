#!/usr/bin/env node
// Verify a Nationwide Record Clearing corpus against the committed index.
//
// The 289 official PDFs and 136 reference files were gathered into a
// gitignored `private/` folder, so the bytes live outside this repository
// while a complete SHA-256 index of them lives inside it. That index is the
// only thing that can tell a recovered copy from a plausible-looking one, so
// this script answers three questions the eye cannot:
//
//   which of the indexed files are present, byte for byte
//   which are missing
//   which are present but CHANGED since the index was written
//
// A changed file is the dangerous case. It looks like a successful recovery
// and is not one: either the corpus drifted, or an official form was revised
// and every downstream field map keyed to the old bytes is now describing a
// document that no longer exists.
//
// Usage, from the repository root:
//   node scripts/rcap-corpus/verify-nationwide-corpus.mjs
//   node scripts/rcap-corpus/verify-nationwide-corpus.mjs --root "/some/other/path"
//   node scripts/rcap-corpus/verify-nationwide-corpus.mjs --json report.json
//   node scripts/rcap-corpus/verify-nationwide-corpus.mjs --tar corpus.tgz

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
};

const INDEX = path.join(rootDir, "data/rcap-all50/nationwide-source-inventory.json");
const corpusRoot = path.resolve(flag("--root", path.join(rootDir, "private/Nationwide Record Clearing")));

if (!fs.existsSync(INDEX)) {
  console.error(`Index not found: ${INDEX}`);
  process.exit(2);
}
const index = JSON.parse(fs.readFileSync(INDEX, "utf8"));

console.log(`index written : ${index.generatedAt}`);
console.log(`index source  : ${index.sourceDir}`);
console.log(`checking      : ${corpusRoot}`);
console.log("");

if (!fs.existsSync(corpusRoot)) {
  console.error(`The corpus directory does not exist at that path.`);
  console.error(`Nothing was checked. Pass --root to point at the real location.`);
  process.exit(2);
}

const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const present = [], missing = [], changed = [], unhashed = [];

for (const state of index.states ?? []) {
  for (const f of state.files ?? []) {
    const abs = path.join(corpusRoot, f.relativePath);
    const row = { code: state.code, name: state.name, ...f };
    if (!fs.existsSync(abs)) { missing.push(row); continue; }
    if (!f.sha256) { unhashed.push(row); continue; }
    const observed = sha256(abs);
    if (observed === f.sha256) present.push(row);
    else changed.push({ ...row, observedSha256: observed, observedBytes: fs.statSync(abs).size });
  }
}

const total = present.length + missing.length + changed.length + unhashed.length;
const pdf = (rows) => rows.filter((r) => (r.extension ?? "").toLowerCase() === ".pdf").length;

console.log(`indexed files        : ${total}`);
console.log(`  verified identical : ${present.length}   (${pdf(present)} PDFs)`);
console.log(`  MISSING            : ${missing.length}   (${pdf(missing)} PDFs)`);
console.log(`  CHANGED            : ${changed.length}   (${pdf(changed)} PDFs)`);
console.log(`  no hash in index   : ${unhashed.length}`);

// Per jurisdiction, so a partial recovery shows which states are affected
// rather than only how many files are gone.
const byState = new Map();
for (const [bucket, rows] of [["ok", present], ["missing", missing], ["changed", changed]])
  for (const r of rows) {
    const e = byState.get(r.code) ?? { ok: 0, missing: 0, changed: 0, name: r.name };
    e[bucket]++; byState.set(r.code, e);
  }
const incomplete = [...byState.entries()].filter(([, e]) => e.missing || e.changed);
if (incomplete.length) {
  console.log(`\njurisdictions not fully recovered (${incomplete.length} of ${byState.size}):`);
  for (const [code, e] of incomplete.sort((a, b) => (b[1].missing + b[1].changed) - (a[1].missing + a[1].changed)))
    console.log(`  ${code} ${String(e.name).padEnd(22)} ok=${e.ok}  missing=${e.missing}  changed=${e.changed}`);
} else if (total) {
  console.log(`\nAll ${byState.size} jurisdictions fully recovered.`);
}

if (changed.length) {
  console.log(`\nCHANGED — present but not the indexed bytes. Treat every downstream`);
  console.log(`field map keyed to these as describing a document that no longer exists:`);
  for (const c of changed.slice(0, 40))
    console.log(`  ${c.code} ${c.fileName}\n     indexed ${c.sha256.slice(0, 16)} ${c.sizeBytes}b\n     on disk ${c.observedSha256.slice(0, 16)} ${c.observedBytes}b`);
  if (changed.length > 40) console.log(`  ... and ${changed.length - 40} more (use --json for the full list)`);
}

if (missing.length) {
  console.log(`\nMISSING (first 40):`);
  for (const m of missing.slice(0, 40)) console.log(`  ${m.code} ${m.relativePath}`);
  if (missing.length > 40) console.log(`  ... and ${missing.length - 40} more (use --json for the full list)`);
}

const jsonOut = flag("--json");
if (jsonOut) {
  fs.writeFileSync(jsonOut, JSON.stringify({
    checkedAt: new Date().toISOString(), corpusRoot,
    indexGeneratedAt: index.generatedAt, indexSourceDir: index.sourceDir,
    totals: { total, present: present.length, missing: missing.length, changed: changed.length, unhashed: unhashed.length },
    present, missing, changed, unhashed
  }, null, 2) + "\n");
  console.log(`\nfull report -> ${jsonOut}`);
}

const tarOut = flag("--tar");
if (tarOut) {
  const abs = path.resolve(tarOut);
  execFileSync("tar", ["-czf", abs, "-C", path.dirname(corpusRoot), path.basename(corpusRoot)], { stdio: "inherit" });
  const bytes = fs.statSync(abs).size;
  console.log(`\narchive -> ${abs}  (${(bytes / 1e6).toFixed(1)} MB)`);
  console.log(`archive sha256: ${sha256(abs)}`);
}

// Exit non-zero on an incomplete recovery so this can gate a later step.
process.exit(missing.length || changed.length ? 1 : 0);
