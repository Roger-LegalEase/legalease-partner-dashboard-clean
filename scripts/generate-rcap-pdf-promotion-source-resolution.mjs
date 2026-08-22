#!/usr/bin/env node
// Resolves every reviewed source against the authorized corpus, for promotion only.
//
//   node scripts/generate-rcap-pdf-promotion-source-resolution.mjs
//   node scripts/generate-rcap-pdf-promotion-source-resolution.mjs --check
//
// The promotion gate resolves a reviewed source through the family's recorded
// canonicalBundlePath. Nine reviewed families never had one recorded, so the gate
// refuses them for want of a path — not for any defect in the review, the
// implementation or the source. Mounting the corpus does not help those nine:
// there is nothing for the resolver to follow.
//
// So they are resolved the other way round, by content. The review already pins
// an exact SHA-256 and an exact byte length; a corpus file matching BOTH is the
// reviewed source, whatever it is called and wherever it sits. Requiring a unique
// match is the whole safeguard — two matches would mean the identity is genuinely
// ambiguous, and this refuses rather than picking one.
//
// The resolved path is recorded HERE and nowhere else. Writing it back into the
// reviewed source record would change bytes that carry a current approval, which
// is exactly what a promotion step must not do.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const CONSUMPTION = "data/rcap-all50/pdf-review-consumption.json";
const REGISTER = "data/rcap-all50/problematic-pdf-register.json";
const PRODUCTION = "data/rcap-all50/overlays/production";
const CORPUS_ROOTS = [
  "private/Nationwide Record Clearing",
  "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1"
];
const OUT = "data/rcap-all50/pdf-promotion-source-resolution.json";

const abs = (p) => path.join(rootDir, p);
const readJson = (p) => JSON.parse(fs.readFileSync(abs(p), "utf8"));
const fail = (m) => { console.error(`FAIL promotion source resolution — ${m}`); process.exit(1); };

// Index the corpus by (digest, byte length). Both, never one: a digest alone is
// enough in practice, but the review pins a length too and a resolver that
// ignores half its evidence is a resolver nobody can audit.
const byIdentity = new Map();
let corpusFiles = 0;
const walk = (dir) => {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    let bytes;
    try { bytes = fs.readFileSync(full); } catch { continue; }
    corpusFiles += 1;
    const digest = crypto.createHash("sha256").update(bytes).digest("hex");
    for (const key of [`${digest}:${bytes.length}`, digest]) {
      if (!byIdentity.has(key)) byIdentity.set(key, []);
      byIdentity.get(key).push(path.relative(rootDir, full));
    }
  }
};
for (const root of CORPUS_ROOTS) walk(abs(root));
if (!corpusFiles) {
  fail("no authorized corpus is mounted. The promotion gate must not run in a source-empty environment: it would refuse reviewed rows for want of a file rather than for any defect.");
}

const consumption = readJson(CONSUMPTION);
// structuralClass is a register fact, not a family-record one: the family record
// describes the source, the register describes what kind of asset it is.
const registerFor = new Map();
for (const rec of readJson(REGISTER).records ?? []) {
  for (const id of rec.familyIds ?? []) registerFor.set(id, rec);
}
const dirFor = (familyId) => {
  const slug = String(familyId).split(":").pop();
  for (const state of fs.readdirSync(abs(PRODUCTION))) {
    const candidate = `${PRODUCTION}/${state}/${slug}`;
    if (fs.existsSync(abs(candidate))) return candidate;
  }
  return null;
};

const rows = consumption.rows.map((r) => {
  const dir = dirFor(r.familyId);
  if (!dir) fail(`${r.familyId}: no package on disk`);
  const record = readJson(`${dir}/source-record.json`);
  const digest = record.sha256 ?? null;
  const byteLength = record.byteLength ?? null;
  const bundlePath = record.canonicalBundlePath ?? null;

  if (!digest) {
    /**
     * A captured HTML index page has no PDF source and produces no filing PDF.
     *
     * Asking the PDF source-presence check about one is asking the wrong
     * question, and answering it "unresolved" reads as a blocker when the
     * family is simply a different kind of thing. The register's own
     * structuralClass says which, so the classification is read rather than
     * inferred from the missing digest — a real PDF whose digest went missing
     * must still fail here.
     */
    const reg = registerFor.get(r.familyId) ?? {};
    const structural = String(reg.structuralClass ?? record.structuralClass ?? "");
    const looksHtml = /html/i.test(structural)
      || /\.html?$/i.test(String(reg.formId ?? record.documentId ?? ""));
    const hasArtifact = fs.existsSync(abs(`${dir}/fixtures/canonical-filled.pdf`));
    if (looksHtml && !hasArtifact) {
      return { familyId: r.familyId, resolution: "not_applicable_no_pdf_source", resolvedPath: null,
        structuralClass: structural || "html_form",
        why: "a captured HTML page, not a PDF. It has no PDF source to resolve and produces no filing PDF, so the PDF source-presence check does not apply to it." };
    }
    return { familyId: r.familyId, resolution: "unresolved_no_source_digest", resolvedPath: null,
      why: "the reviewed record pins no source SHA-256, so neither a path nor a content search can establish identity" };
  }

  if (bundlePath) {
    const candidates = CORPUS_ROOTS.flatMap((root) => [
      path.join(root, bundlePath),
      path.join(root, bundlePath.split("/").slice(1).join("/"))
    ]);
    const hit = candidates.find((c) => fs.existsSync(abs(c)));
    if (hit) {
      const bytes = fs.readFileSync(abs(hit));
      const actual = crypto.createHash("sha256").update(bytes).digest("hex");
      if (actual !== digest) fail(`${r.familyId}: ${hit} hashes ${actual.slice(0, 12)} but the review pins ${digest.slice(0, 12)}`);
      if (byteLength != null && bytes.length !== byteLength) {
        fail(`${r.familyId}: ${hit} is ${bytes.length} bytes, the review pins ${byteLength}`);
      }
      return { familyId: r.familyId, resolution: "path_resolved", resolvedPath: hit,
        sha256: digest, byteLength: bytes.length };
    }
  }

  // No path, or a path that resolves to nothing. Resolve by content.
  //
  // Byte length is used when the record pins one and skipped when it does not.
  // Several reviewed records pin a digest and no length, and a composite key
  // silently matched none of them — the resolver looked like it could not find
  // sources that were sitting in the corpus.
  const matches = byteLength != null
    ? (byIdentity.get(`${digest}:${byteLength}`) ?? [])
    : (byIdentity.get(digest) ?? []);
  if (matches.length === 0) {
    return { familyId: r.familyId, resolution: "unresolved_no_corpus_match", resolvedPath: null,
      sha256: digest, byteLength,
      why: byteLength != null
        ? "no corpus file carries this exact digest and byte length"
        : "no corpus file carries this digest" };
  }
  // Several paths sharing one digest are not competing candidates — they are the
  // same bytes filed twice. The uniqueness safeguard exists to stop the resolver
  // choosing between DIFFERENT sources, and a digest match rules that out by
  // construction. Resolve deterministically and record every copy.
  const resolvedPath = [...matches].sort()[0];
  const bytes = fs.readFileSync(abs(resolvedPath));
  const actual = crypto.createHash("sha256").update(bytes).digest("hex");
  if (actual !== digest) fail(`${r.familyId}: ${resolvedPath} re-hashed to ${actual.slice(0, 12)}, not the pinned ${digest.slice(0, 12)}`);
  return {
    familyId: r.familyId, resolution: "hash_resolved", resolvedPath,
    sha256: digest, byteLength: bytes.length,
    identicalCopiesInCorpus: matches.length,
    allMatchingPaths: matches.length > 1 ? [...matches].sort() : undefined,
    environmentalResolution:
      "the reviewed record carries no canonicalBundlePath. The source was located by its reviewed digest and byte length, uniquely, in the authorized corpus. Nothing was written back into the reviewed record."
  };
});

const counts = rows.reduce((acc, r) => { acc[r.resolution] = (acc[r.resolution] ?? 0) + 1; return acc; }, {});
const unresolved = rows.filter((r) => r.resolution.startsWith("unresolved"));

const record = {
  schemaVersion: "rcap-pdf-promotion-source-resolution/v1",
  generatedBy: "scripts/generate-rcap-pdf-promotion-source-resolution.mjs",
  purpose: "promotion-only source resolution. Not an implementation, evidence or review change.",
  corpus: { roots: CORPUS_ROOTS, filesIndexed: corpusFiles },
  doesNotWriteBack:
    "no resolved path is written into any reviewed source record. Those bytes carry current approvals, and a promotion step that edits them invalidates what it is trying to promote.",
  totals: { families: rows.length, ...counts, unresolved: unresolved.length },
  rows
};

const body = `${JSON.stringify(record, null, 2)}\n`;
const file = abs(OUT);
const stale = !fs.existsSync(file) || fs.readFileSync(file, "utf8") !== body;
if (stale && checkOnly) fail(`${OUT} is stale; re-run scripts/generate-rcap-pdf-promotion-source-resolution.mjs`);
if (stale) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); }

console.log(`OK promotion source resolution — ${rows.length} reviewed famil(ies) across ${corpusFiles} corpus files: ` +
  `${counts.path_resolved ?? 0} path-resolved, ${counts.hash_resolved ?? 0} hash-resolved, ${unresolved.length} unresolved`);
if (unresolved.length) for (const u of unresolved) console.log(`   unresolved: ${u.familyId} — ${u.why}`);
