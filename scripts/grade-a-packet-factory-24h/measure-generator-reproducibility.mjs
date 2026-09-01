#!/usr/bin/env node
/**
 * Which generators can reproduce the artifacts they committed, and which cannot.
 *
 * C13 found that every generator's --check converged nothing, and six were
 * fixed to compare bytes. That left an unasked question: the repository has 33
 * generators, and the other 27 write committed records with nothing checking
 * that those records are still what the generator produces.
 *
 * Measuring it: 3 differ only in a timestamp or a dispatch pin, which is
 * expected. 11 differ in substance -- counts, verdicts, hashes, booleans -- and
 * 1 does not run at all. So a dozen committed artifacts cannot be reproduced by
 * the code that claims to author them.
 *
 * THIS TOOL DOES NOT DECIDE WHAT THAT MEANS, because it is not one question.
 * Several of the divergent generators belong to finished waves, and their
 * artifacts may be deliberate historical snapshots -- regenerating those would
 * destroy the record of what a past dispatch actually said. Others may simply be
 * stale. Telling them apart is a judgement about intent, and quietly
 * regenerating all of them to make a number go green would be exactly the kind
 * of confident wrong answer this session has been correcting.
 *
 * So it measures and reports, and leaves the decision where it belongs.
 *
 *   node scripts/grade-a-packet-factory-24h/measure-generator-reproducibility.mjs
 *   node scripts/grade-a-packet-factory-24h/measure-generator-reproducibility.mjs --write
 *
 * It restores the working tree after every generator it runs, and refuses to
 * start unless the tree is already clean -- otherwise it would be measuring
 * somebody's uncommitted work and calling it drift.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WRITE = process.argv.includes("--write");
const OUT = "data/rcap-grade-a/packet-factory-24h/GENERATOR_REPRODUCIBILITY.json";

const git = (a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" });
const restore = () => { try { git(["checkout", "--", "data/", "docs/"]); } catch { /* nothing to restore */ } };

if (git(["status", "--porcelain"]).trim() !== "") {
  console.error("REFUSED: the working tree is not clean. This runs generators and restores the tree afterwards;");
  console.error("starting dirty would measure uncommitted work and report it as generator drift.");
  process.exit(1);
}

const generators = ["scripts/grade-a-packet-factory-24h", "scripts/grade-a-launch-control"]
  .flatMap((d) => (fs.existsSync(path.join(ROOT, d)) ? fs.readdirSync(path.join(ROOT, d)).filter((f) => /^generate.*\.mjs$/.test(f)).map((f) => `${d}/${f}`) : []))
  .sort();

// A dispatch pin and a generation timestamp are legitimately different on every
// run. Everything else is content.
const SHA40 = /\b[0-9a-f]{40}\b/g;
const ISO = /\d{4}-\d{2}-\d{2}T[\d:.]+Z/g;
const normalize = (l) => l.replace(SHA40, "<pin>").replace(ISO, "<timestamp>");

const rows = [];
for (const g of generators) {
  const covered = /makeEmitter/.test(fs.readFileSync(path.join(ROOT, g), "utf8"));
  if (covered) { rows.push({ generator: g, convergenceChecked: true, status: "CONVERGENCE_CHECKED", detail: "routes its writes through the convergence emitter, so --check compares bytes" }); continue; }

  const run = spawnSync(process.execPath, [g], { cwd: ROOT, encoding: "utf8", timeout: 60000 });
  if (run.status !== 0) {
    restore();
    rows.push({ generator: g, convergenceChecked: false, status: "DOES_NOT_RUN", detail: (run.stderr ?? "").trim().split("\n").filter(Boolean).slice(-1)[0]?.slice(0, 160) ?? "exited non-zero" });
    continue;
  }
  const diff = git(["diff", "--unified=0"]);
  if (!diff.trim()) { restore(); rows.push({ generator: g, convergenceChecked: false, status: "REPRODUCES", detail: "committed output is byte-identical to a fresh run" }); continue; }

  const changed = diff.split("\n").filter((l) => (l.startsWith("+") || l.startsWith("-")) && !l.startsWith("+++") && !l.startsWith("---"));
  const plus = new Set(changed.filter((l) => l.startsWith("+")).map((l) => normalize(l.slice(1))));
  const minus = new Set(changed.filter((l) => l.startsWith("-")).map((l) => normalize(l.slice(1))));
  const substantive = [...plus].filter((l) => !minus.has(l));
  const files = [...new Set(diff.split("\n").filter((l) => l.startsWith("+++ b/")).map((l) => l.slice(6)))];
  restore();

  rows.push({
    generator: g, convergenceChecked: false,
    status: substantive.length === 0 ? "REPRODUCES_MODULO_PIN_AND_TIMESTAMP" : "DOES_NOT_REPRODUCE",
    files, substantiveChangedLines: substantive.length,
    firstSubstantiveDifference: substantive[0]?.trim().slice(0, 140) ?? null,
    detail: substantive.length === 0
      ? "differs only in the dispatch pin and the generation timestamp"
      : "the committed artifact is not what this generator produces today"
  });
}

const by = (s) => rows.filter((r) => r.status === s);
const doc = {
  schemaVersion: "rcap-generator-reproducibility/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/measure-generator-reproducibility.mjs",
  question: "Can each generator reproduce the artifact it committed?",
  answer: `${by("CONVERGENCE_CHECKED").length} of ${rows.length} generators have a byte-comparing --check. Of the rest, ${by("DOES_NOT_REPRODUCE").length} produce substantively different output today and ${by("DOES_NOT_RUN").length} do not run at all.`,
  whyThisIsNotAutomaticallyADefect: "Several divergent generators belong to finished waves, and their artifacts may be deliberate historical snapshots -- regenerating one would destroy the record of what that dispatch actually said. Others are simply stale. Telling those apart is a judgement about intent, and regenerating everything to turn a number green would be a confident wrong answer.",
  whatItDoesEstablish: "A committed record under one of these generators cannot be assumed current. Anything reading them should either be pointed at a convergence-checked generator or treat the artifact as a dated snapshot.",
  counts: {
    generators: rows.length,
    convergenceChecked: by("CONVERGENCE_CHECKED").length,
    reproduces: by("REPRODUCES").length,
    reproducesModuloPinAndTimestamp: by("REPRODUCES_MODULO_PIN_AND_TIMESTAMP").length,
    doesNotReproduce: by("DOES_NOT_REPRODUCE").length,
    doesNotRun: by("DOES_NOT_RUN").length
  },
  volatileFieldsNormalized: ["a 40-hex dispatch pin", "an ISO-8601 generation timestamp"],
  rows,
  commercialRoutesOpened: 0,
  productionTouched: false
};

if (WRITE) {
  fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`Wrote ${OUT}`);
}
for (const s of ["DOES_NOT_RUN", "DOES_NOT_REPRODUCE", "REPRODUCES_MODULO_PIN_AND_TIMESTAMP", "REPRODUCES", "CONVERGENCE_CHECKED"]) {
  const n = by(s).length;
  if (n) console.log(`  ${String(n).padStart(2)}  ${s}`);
}
for (const r of by("DOES_NOT_REPRODUCE")) console.log(`      ${path.basename(r.generator)} — ${r.substantiveChangedLines} line(s): ${r.firstSubstantiveDifference?.slice(0, 70)}`);
for (const r of by("DOES_NOT_RUN")) console.log(`      ${path.basename(r.generator)} — does not run`);
console.log(`\nworking tree after measurement: ${git(["status", "--porcelain"]).trim() === "" ? "clean" : "DIRTY — restore failed"}`);
