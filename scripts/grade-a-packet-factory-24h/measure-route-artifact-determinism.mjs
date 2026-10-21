#!/usr/bin/env node
/**
 * Do the route artifacts rebuild to the same bytes, twice, from nothing?
 *
 *   node scripts/grade-a-packet-factory-24h/measure-route-artifact-determinism.mjs \
 *     --family rcap-ks-custom-pleading --builder scripts/build-census-v1-rcap-ks-custom-pleading.mjs
 *
 * WHY TWO REBUILDS AND WHY FROM NOTHING
 *
 * One rebuild that overwrites an existing file with identical bytes proves less
 * than it looks like: a builder that skipped the write entirely would produce
 * the same result. So the fixtures directory is DELETED first, and every
 * artifact has to be produced again from the committed records alone.
 *
 * And one rebuild cannot see nondeterminism. Three builders in this repository
 * stamped a wall clock into their PDFs, so their bytes moved on every rebuild
 * underneath hash-bound raster receipts, and a single rebuild taken a second
 * after the first would have agreed with itself often enough to hide it. Two
 * independent from-scratch rebuilds in two separate processes are the smallest
 * measurement that can catch it.
 *
 * Nothing here is repaired. The tree is restored from git after the measurement
 * and the restoration is verified byte-for-byte before this exits, because
 * leaving a rebuilt artifact behind would corrupt the thing being measured. It
 * refuses to start on a dirty tree for the same reason: it would otherwise
 * report somebody's uncommitted work as builder drift.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ARGS = process.argv.slice(2);
const OUT = "data/rcap-grade-a/route-artifact-acceptance/ROUTE_ARTIFACT_DETERMINISM.json";

const multi = (flag) => ARGS.reduce((acc, a, i) => (a === flag && ARGS[i + 1] ? [...acc, ARGS[i + 1]] : acc), []);
const FAMILIES = multi("--family");
const BUILDERS = multi("--builder");
if (FAMILIES.length === 0 || FAMILIES.length !== BUILDERS.length) {
  console.error("REFUSED: pass one --builder for each --family; guessing which script owns a family is how a measurement ends up describing the wrong build");
  process.exit(1);
}

const git = (a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" });
const sha256 = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const readIf = (rel) => { const p = path.join(ROOT, rel); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null; };

const dirty = git(["status", "--porcelain", "--", "data/rcap-all50/overlays/census-v1"]).trim();
if (dirty) {
  console.error(`REFUSED: the overlay tree is dirty, so a rebuild difference could not be told from uncommitted work:\n${dirty}`);
  process.exit(1);
}

/* Every PDF a family ships, family assembly and route artifact alike, so a
 * rebuild that moved the assembly's bytes is caught here rather than discovered
 * later underneath the assembly's own hash-bound raster receipt. */
const pdfsOf = (familyDir) => {
  const base = path.join(ROOT, familyDir, "fixtures");
  if (!fs.existsSync(base)) return [];
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".pdf")) out.push(path.relative(ROOT, p));
    }
  };
  walk(base);
  return out.sort();
};

const snapshot = (familyDir) => Object.fromEntries(pdfsOf(familyDir).map((rel) => [rel, {
  sha256: sha256(path.join(ROOT, rel)), byteLength: fs.statSync(path.join(ROOT, rel)).size
}]));

const families = [];
for (const [i, familyId] of FAMILIES.entries()) {
  const builder = BUILDERS[i];
  const found = execFileSync("bash", ["-lc",
    `ls -d ${JSON.stringify(path.join(ROOT, "data/rcap-all50/overlays/census-v1"))}/*/* 2>/dev/null`],
  { encoding: "utf8" }).trim().split("\n")
    .map((d) => path.relative(ROOT, d))
    .find((d) => readIf(`${d}/reports/rendered-artifacts.json`)?.familyId === familyId);
  if (!found) { console.error(`REFUSED: ${familyId} has no overlay directory carrying a rendered-artifacts record`); process.exit(1); }
  families.push({ familyId, builder, dir: found });
}

const runs = [];
for (const pass of [1, 2]) {
  for (const f of families) fs.rmSync(path.join(ROOT, f.dir, "fixtures"), { recursive: true, force: true });
  const built = {};
  for (const f of families) {
    /* A separate process per pass, so nothing a builder memoises in module scope
     * can make the second rebuild agree with the first for the wrong reason. */
    const r = spawnSync(process.execPath, [f.builder, "--no-raster"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) {
      console.error(`REFUSED: ${f.familyId} pass ${pass} exited ${r.status}: ${String(r.stderr).split("\n").slice(0, 4).join(" ")}`);
      git(["checkout", "--", "data/rcap-all50/overlays/census-v1"]);
      process.exit(1);
    }
    built[f.familyId] = snapshot(f.dir);
  }
  runs.push({ pass, built });
}

const committed = {};
git(["checkout", "--", "data/rcap-all50/overlays/census-v1"]);
git(["clean", "-fdq", "--", "data/rcap-all50/overlays/census-v1"]);
for (const f of families) committed[f.familyId] = snapshot(f.dir);

const restoredClean = git(["status", "--porcelain", "--", "data/rcap-all50/overlays/census-v1"]).trim() === "";

const artifacts = [];
for (const f of families) {
  const rendered = readIf(`${f.dir}/reports/rendered-artifacts.json`);
  const routeOf = new Map((rendered?.routeArtifacts ?? []).map((a) => [a.file, a]));
  const paths = new Set([
    ...Object.keys(committed[f.familyId]),
    ...Object.keys(runs[0].built[f.familyId]),
    ...Object.keys(runs[1].built[f.familyId])
  ]);
  for (const rel of [...paths].sort()) {
    const c = committed[f.familyId][rel] ?? null;
    const r1 = runs[0].built[f.familyId][rel] ?? null;
    const r2 = runs[1].built[f.familyId][rel] ?? null;
    const route = routeOf.get(rel) ?? null;
    const deterministic = !!r1 && !!r2 && r1.sha256 === r2.sha256;
    const matchesCommitted = !!c && !!r1 && c.sha256 === r1.sha256;
    artifacts.push({
      familyId: f.familyId,
      unit: route ? "route_artifact" : "family_assembly",
      routeKey: route?.routeKey ?? null, route: route?.route ?? null,
      fixture: route?.fixture ?? path.basename(rel, ".pdf"),
      file: rel,
      committedSha256: c?.sha256 ?? null,
      rebuild1Sha256: r1?.sha256 ?? null,
      rebuild2Sha256: r2?.sha256 ?? null,
      byteLength: r1?.byteLength ?? c?.byteLength ?? null,
      deterministic, matchesCommitted,
      classification: !r1 || !r2 ? "NOT_PRODUCED_BY_THE_BUILDER"
        : !deterministic ? "NONDETERMINISTIC"
          : !matchesCommitted ? "DIVERGES_FROM_COMMITTED"
            : "REPRODUCES"
    });
  }
}

const doc = {
  schemaVersion: "rcap-route-artifact-determinism/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/measure-route-artifact-determinism.mjs",
  atCommit: git(["rev-parse", "HEAD"]).trim(),
  method: [
    "the fixtures directory of every named family is deleted, so nothing can be reproduced by not being rewritten",
    "each family's builder is invoked in its own process with --no-raster, twice, each time from the deleted state",
    "every PDF under fixtures/ is hashed after each pass — family assemblies and route artifacts alike",
    "the tree is restored with git checkout and git clean, and the restoration is verified before this record is written"
  ],
  families: families.map((f) => ({ familyId: f.familyId, builder: f.builder, directory: f.dir })),
  counts: {
    artifacts: artifacts.length,
    routeArtifacts: artifacts.filter((a) => a.unit === "route_artifact").length,
    familyAssemblies: artifacts.filter((a) => a.unit === "family_assembly").length,
    reproduces: artifacts.filter((a) => a.classification === "REPRODUCES").length,
    nondeterministic: artifacts.filter((a) => a.classification === "NONDETERMINISTIC").length,
    divergesFromCommitted: artifacts.filter((a) => a.classification === "DIVERGES_FROM_COMMITTED").length
  },
  everyArtifactReproduces: artifacts.every((a) => a.classification === "REPRODUCES"),
  workingTreeRestored: restoredClean,
  packetContentChanged: false, commercialRoutesOpened: 0, productionTouched: false,
  artifacts
};

fs.mkdirSync(path.join(ROOT, path.dirname(OUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(doc, null, 2)}\n`);
console.log(`${OUT}: ${doc.counts.artifacts} artifact(s) — ${doc.counts.reproduces} REPRODUCES, ${doc.counts.nondeterministic} NONDETERMINISTIC, ${doc.counts.divergesFromCommitted} DIVERGES; tree restored: ${restoredClean}`);
for (const a of artifacts.filter((x) => x.classification !== "REPRODUCES")) {
  console.log(`  ${a.classification} ${a.file} — committed ${a.committedSha256} / r1 ${a.rebuild1Sha256} / r2 ${a.rebuild2Sha256}`);
}
process.exit(doc.everyArtifactReproduces && restoredClean ? 0 : 1);
