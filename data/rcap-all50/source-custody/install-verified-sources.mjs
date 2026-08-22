#!/usr/bin/env node
// Session 3 — source custody. Deterministic verifying source installer.
//
//   node data/rcap-all50/source-custody/install-verified-sources.mjs [--apply] [--family <id>] [--root <dir>]
//
// For every family in source-custody-manifest.json it locates the exact
// official member, proves it by digest and byte length, and materializes it at
// the canonical path the platform-ready gate already looks for —
// <familyPath>/source/<basename>. It never matches on a filename.
//
// Read-only by default: without --apply it reports what it would install and
// exits non-zero if anything it could install is unproven. Family workers and
// Sessions 9 and 10 run this rather than reaching into a corpus themselves, so
// every lane consumes the same bytes proven the same way.
//
// Corpus roots default to the two the work view names and may be extended with
// --root or RCAP_CORPUS_ROOTS (colon-separated). A root that does not exist is
// skipped, not an error: custody publishes one installer for every clone,
// whatever subset of the corpus that clone happens to hold.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const MANIFEST = path.join(HERE, "source-custody-manifest.json");
const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const pick = (flag) => { const i = argv.indexOf(flag); return i === -1 ? null : argv[i + 1]; };
const ONLY = pick("--family");

const DEFAULT_ROOTS = ["private/source-imports", "private/Nationwide Record Clearing"];
const roots = [
  ...(pick("--root") ? [pick("--root")] : []),
  ...(process.env.RCAP_CORPUS_ROOTS ? process.env.RCAP_CORPUS_ROOTS.split(":") : []),
  ...DEFAULT_ROOTS
].filter((r) => r && fs.existsSync(r));

const sha256 = (file) => {
  const h = crypto.createHash("sha256");
  const fd = fs.openSync(file, "r");
  const buf = Buffer.alloc(1 << 20);
  let n;
  while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n));
  fs.closeSync(fd);
  return h.digest("hex");
};

// Index every reachable corpus file by digest, once. Filenames are ignored on
// purpose: the member is whatever hashes to the pinned identity, wherever it sits.
function indexCorpus(dirs) {
  const byDigest = new Map();
  let files = 0;
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) {
        files += 1;
        const d = sha256(p);
        if (!byDigest.has(d)) byDigest.set(d, []);
        byDigest.get(d).push(p);
      }
    }
  };
  for (const d of dirs) walk(d);
  for (const list of byDigest.values()) list.sort();
  return { byDigest, files };
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const members = manifest.members.filter((m) => !ONLY || m.familyId === ONLY);
if (ONLY && members.length === 0) {
  console.error(`no such family in the custody manifest: ${ONLY}`);
  process.exit(2);
}

console.log(`corpus roots searched: ${roots.length ? roots.join(", ") : "(none present)"}`);
const { byDigest, files } = indexCorpus(roots);
console.log(`corpus files indexed by digest: ${files}`);

// An official binary is never written into the tracked tree. private/ is
// gitignored; anywhere else would stage a court's PDF into the repository.
const insidePrivate = (p) => {
  const rel = path.relative("private", path.resolve(p));
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
};

const installed = [], already = [], absent = [], refused = [];
for (const m of members) {
  const dest = m.canonicalDestination;
  if (!insidePrivate(dest)) {
    refused.push({ m, why: `canonical destination ${dest} is outside private/; custody does not write an official binary into the tracked tree` });
    continue;
  }
  if (fs.existsSync(dest)) {
    if (sha256(dest) === m.sha256 && fs.statSync(dest).size === m.byteLength) { already.push(m); continue; }
    refused.push({ m, why: "a file already sits at the canonical destination and is not the pinned member" });
    continue;
  }
  const candidates = byDigest.get(m.sha256) ?? [];
  if (candidates.length === 0) { absent.push(m); continue; }
  const src = candidates[0];
  if (fs.statSync(src).size !== m.byteLength) {
    refused.push({ m, why: `digest matched at ${src} but byte length is ${fs.statSync(src).size}, not ${m.byteLength}` });
    continue;
  }
  if (APPLY) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    if (sha256(dest) !== m.sha256) {
      refused.push({ m, why: "the copy did not reproduce the pinned digest" });
      try { fs.unlinkSync(dest); } catch {}
      continue;
    }
  }
  installed.push({ m, src });
}

for (const { m, src } of installed) console.log(`${APPLY ? "installed" : "would install"}  ${m.familyId}  <- ${src}`);
for (const m of already) console.log(`already proven ${m.familyId}  ${m.canonicalDestination}`);
for (const { m, why } of refused) console.error(`REFUSED  ${m.familyId}: ${why}`);
for (const m of absent) console.log(`no member ${m.familyId}: nothing in the searched roots hashes to ${m.sha256.slice(0, 16)}…`);

console.log(
  `\n${APPLY ? "installed" : "installable"}: ${installed.length}` +
  ` | already proven: ${already.length}` +
  ` | no member in this clone: ${absent.length}` +
  ` | refused: ${refused.length}` +
  ` | of ${members.length} hash-verified families`
);
if (refused.length) { console.error("\nFAIL source custody — a refusal is never installed."); process.exit(1); }
process.exit(0);
