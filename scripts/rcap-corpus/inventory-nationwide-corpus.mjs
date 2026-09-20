#!/usr/bin/env node
// Capture the WHOLE Nationwide Record Clearing corpus, from every copy of it.
//
// verify-nationwide-corpus.mjs walks the committed index and asks "is each of
// these 425 files present?". That is the wrong question for recovery. The index
// is a snapshot taken 2026-06-17; gathering continued after it, so files that
// arrived later are absent from the index and a check driven by it cannot see
// them. Batch 2 alone carries 165 such files.
//
// This walks the directories instead and treats the index as a cross-check.
// Every file found is captured whether or not anything knew about it, and the
// index tells us which of the known ones changed or are still missing.
//
// It writes a fresh inventory in the committed schema, so the result becomes
// the new source of truth rather than another artifact to reconcile by hand.
//
//   node inventory-nationwide-corpus.mjs --root A --root B
//   node inventory-nationwide-corpus.mjs --root A --root B --out /tmp/inventory.json
//   node inventory-nationwide-corpus.mjs --root A --root B --stage /tmp/corpus --tar /tmp/corpus.tgz

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const flag = (n, d = null) => { const i = argv.indexOf(n); return i === -1 ? d : argv[i + 1]; };
const flagAll = (n) => argv.reduce((a, v, i) => (v === n && argv[i + 1] ? [...a, argv[i + 1]] : a), []);

const roots = flagAll("--root").map((r) => path.resolve(r)).filter((r) => {
  if (fs.existsSync(r)) return true;
  console.error(`skipping, does not exist: ${r}`); return false;
});
if (!roots.length) { console.error("Pass at least one --root."); process.exit(2); }

const INDEX = path.join(rootDir, "data/rcap-all50/nationwide-source-inventory.json");
const index = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, "utf8")) : { states: [] };

// folder -> jurisdiction, from the committed index's own sourceFolders
const folderToState = new Map();
for (const s of index.states ?? [])
  for (const f of s.sourceFolders ?? []) folderToState.set(f, { code: s.code, name: s.name, slug: s.slug });
const indexed = new Map();
for (const s of index.states ?? [])
  for (const f of s.files ?? []) indexed.set(f.relativePath, { code: s.code, ...f });

const sha256 = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const classify = (ext) =>
  ext === ".pdf" ? "pdf"
  : [".html", ".htm", ".md", ".txt"].includes(ext) ? "reference"
  : [".doc", ".docx", ".rtf"].includes(ext) ? "document"
  : [".json", ".csv", ".xlsx"].includes(ext) ? "data" : "other";

function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === ".DS_Store") continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walk(abs, base, out);
    else if (e.isFile()) out.push(path.relative(base, abs));
  }
  return out;
}

// Union across copies. First root wins; a later copy that disagrees is recorded
// as a conflict rather than silently dropped, because two copies of one path
// with different bytes is a fact worth surfacing, not a tie to break quietly.
const union = new Map(); const conflicts = [];
for (const r of roots) {
  for (const rel of walk(r)) {
    const abs = path.join(r, rel);
    const h = sha256(abs);
    const prev = union.get(rel);
    if (!prev) union.set(rel, { rel, sha256: h, sizeBytes: fs.statSync(abs).size, mtime: fs.statSync(abs).mtime.toISOString(), foundIn: r });
    else if (prev.sha256 !== h) conflicts.push({ rel, a: prev.foundIn, aSha: prev.sha256, b: r, bSha: h });
  }
}

const all = [...union.values()];
const verified = [], changed = [], fresh = [];
for (const f of all) {
  const known = indexed.get(f.rel);
  if (!known) { fresh.push(f); continue; }
  if (!known.sha256) { fresh.push(f); continue; }
  (known.sha256 === f.sha256 ? verified : changed).push({ ...f, indexedSha256: known.sha256, code: known.code });
}
const stillMissing = [...indexed.keys()].filter((k) => !union.has(k)).map((k) => ({ rel: k, ...indexed.get(k) }));

const pdf = (rows) => rows.filter((r) => path.extname(r.rel ?? r.relativePath ?? "").toLowerCase() === ".pdf").length;
console.log(`copies scanned            : ${roots.length}`);
for (const r of roots) console.log(`  ${r}`);
console.log(`\nFILES RECOVERED (union)   : ${all.length}   (${pdf(all)} PDFs)`);
console.log(`  matching the index      : ${verified.length}`);
console.log(`  CHANGED since the index : ${changed.length}`);
console.log(`  not in the index at all : ${fresh.length}   <- gathered after 2026-06-17`);
console.log(`indexed but still MISSING : ${stillMissing.length}   (${pdf(stillMissing)} PDFs)`);
if (conflicts.length) console.log(`same path, different bytes: ${conflicts.length}`);

const byFolder = new Map();
for (const f of all) {
  const top = f.rel.split(path.sep)[0];
  const st = folderToState.get(top);
  const key = st ? `${st.code} ${st.name}` : `?? ${top}`;
  byFolder.set(key, (byFolder.get(key) ?? 0) + 1);
}
console.log(`\njurisdictions represented : ${[...byFolder.keys()].filter((k) => !k.startsWith("??")).length}`);
const unknown = [...byFolder.entries()].filter(([k]) => k.startsWith("??"));
if (unknown.length) {
  console.log(`folders with no jurisdiction mapping (${unknown.length}) — new since the index:`);
  for (const [k, n] of unknown) console.log(`  ${String(n).padStart(4)}  ${k.slice(3)}`);
}
if (stillMissing.length) {
  const m = new Map();
  for (const f of stillMissing) m.set(f.code, (m.get(f.code) ?? 0) + 1);
  console.log(`\nstill missing, by jurisdiction:`);
  for (const [c, n] of [...m.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${c}: ${n}`);
  for (const f of stillMissing.slice(0, 20)) console.log(`    ${f.code} ${f.rel}`);
  if (stillMissing.length > 20) console.log(`    ... and ${stillMissing.length - 20} more`);
}
if (changed.length) {
  console.log(`\nCHANGED since the index (${changed.length}) — a revised or drifted document:`);
  for (const c of changed.slice(0, 20)) console.log(`  ${c.code} ${c.rel}\n     indexed ${c.indexedSha256.slice(0, 16)}   now ${c.sha256.slice(0, 16)}`);
  if (changed.length > 20) console.log(`  ... and ${changed.length - 20} more`);
}
for (const c of conflicts.slice(0, 10)) console.log(`\nCONFLICT ${c.rel}\n  ${c.a} -> ${c.aSha.slice(0, 16)}\n  ${c.b} -> ${c.bSha.slice(0, 16)}`);

// Fresh inventory, same schema as the committed one, so it can replace it.
const states = new Map();
for (const f of all) {
  const top = f.rel.split(path.sep)[0];
  const st = folderToState.get(top) ?? { code: "??", name: top, slug: top };
  const e = states.get(st.code) ?? { code: st.code, name: st.name, slug: st.slug, status: "resources_found", sourceFolders: [], files: [] };
  if (!e.sourceFolders.includes(top)) e.sourceFolders.push(top);
  e.files.push({ relativePath: f.rel, fileName: path.basename(f.rel), extension: path.extname(f.rel).toLowerCase(),
                 classification: classify(path.extname(f.rel).toLowerCase()), sizeBytes: f.sizeBytes, mtime: f.mtime, sha256: f.sha256 });
  states.set(st.code, e);
}
for (const e of states.values()) {
  const c = { pdf: 0, reference: 0, document: 0, data: 0, other: 0 };
  for (const f of e.files) c[f.classification]++;
  e.resourceCounts = { ...c, total: e.files.length };
}
const out = flag("--out");
if (out) {
  fs.writeFileSync(out, JSON.stringify({
    schemaVersion: index.schemaVersion ?? "rcap-nationwide-source-inventory/v1",
    generatedAt: new Date().toISOString(),
    sourceDir: roots.join(" + "), sourceExists: true,
    expectedJurisdictionCount: index.expectedJurisdictionCount ?? 51,
    supersedes: { generatedAt: index.generatedAt ?? null, fileCount: indexed.size },
    reconciliation: { recovered: all.length, verified: verified.length, changed: changed.length, newSinceIndex: fresh.length, stillMissing: stillMissing.length, conflicts: conflicts.length },
    states: [...states.values()].sort((a, b) => a.code.localeCompare(b.code))
  }, null, 2) + "\n");
  console.log(`\nfresh inventory -> ${out}   (${all.length} files, ${states.size} jurisdictions)`);
}

// One deduplicated directory holding every recovered file, ready to keep.
const stage = flag("--stage");
if (stage) {
  for (const f of all) {
    const dest = path.join(stage, f.rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(f.foundIn, f.rel), dest);
  }
  console.log(`staged ${all.length} files -> ${stage}`);
  const tar = flag("--tar");
  if (tar) {
    execFileSync("tar", ["-czf", path.resolve(tar), "-C", path.dirname(stage), path.basename(stage)], { stdio: "inherit" });
    console.log(`archive -> ${path.resolve(tar)}  sha256 ${sha256(path.resolve(tar))}`);
  }
}

process.exit(stillMissing.length || changed.length || conflicts.length ? 1 : 0);
