#!/usr/bin/env node
// Controls for the problematic-PDF register's three source-validation states.
//
//   node scripts/verify-rcap-problematic-pdf-register-source-modes.mjs
//
// Source-empty `--check` no longer rederives platform-ready outcomes from an
// empty corpus; it validates the committed register against the promotion proof
// that WAS generated with the corpus mounted. That is only defensible if it can
// still fail. These controls prove it does — and that a half-mounted corpus is
// never quietly treated as an absent one.
//
// Every control restores the tree, and the run refuses to finish dirty.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATOR = path.join(rootDir, "scripts/generate-rcap-problematic-pdf-register.mjs");
const RESOLUTION = path.join(rootDir, "data/rcap-all50/pdf-promotion-source-resolution.json");
const READINESS = path.join(rootDir, "data/rcap-all50/pdf-release-readiness.json");
const CONSUMPTION = path.join(rootDir, "data/rcap-all50/pdf-review-consumption.json");
const PROD = path.join(rootDir, "data/rcap-all50/overlays/production");

/** The generator's real exit code and its declared mode — never a pipe's. */
function check(env = {}) {
  const run = spawnSync(process.execPath, [GENERATOR, "--check"], {
    cwd: rootDir, encoding: "utf8", timeout: 900000, env: { ...process.env, ...env }
  });
  const out = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  const mode = out.match(/source_validation_mode=(\w+)/)?.[1] ?? "(none)";
  return { red: run.status !== 0, mode, out };
}

const touched = new Map();
function write(file, body) {
  if (!touched.has(file)) touched.set(file, fs.existsSync(file) ? fs.readFileSync(file) : null);
  fs.writeFileSync(file, body);
}
function remove(file) {
  if (!touched.has(file)) touched.set(file, fs.existsSync(file) ? fs.readFileSync(file) : null);
  fs.rmSync(file, { force: true });
}
function restoreAll() {
  for (const [file, body] of touched) {
    if (body === null) fs.rmSync(file, { force: true });
    else fs.writeFileSync(file, body);
  }
  touched.clear();
}
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const writeJson = (f, v) => write(f, `${JSON.stringify(v, null, 2)}\n`);

/** A first source-dependent family, resolved to its on-disk record. */
function firstResolvedFamily() {
  const row = readJson(RESOLUTION).rows.find((r) => r.resolution !== "not_applicable_no_pdf_source");
  const family = String(row.familyId).split(":").pop();
  for (const stateDir of fs.readdirSync(PROD)) {
    const candidate = path.join(PROD, stateDir, family, "source-record.json");
    if (fs.existsSync(candidate)) return { row, recordPath: candidate };
  }
  throw new Error(`could not locate the source record for ${row.familyId}`);
}

const tempRoots = [];
function partialCorpusRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-partial-corpus-"));
  // One file, nowhere near the 46 the resolution record names.
  fs.writeFileSync(path.join(dir, "a-single-unrelated-file.pdf"), "%PDF-1.7\n");
  tempRoots.push(dir);
  return dir;
}
function completeCorpusRootWithMismatchedBytes() {
  // Every expected source PRESENT, so the mount reads as complete, but the bytes
  // are not the reviewed bytes. Completeness and validity are different
  // questions and this proves the second is still asked.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-complete-corpus-"));
  for (const row of readJson(RESOLUTION).rows) {
    if (!row.resolvedPath) continue;
    const target = path.join(dir, row.resolvedPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "%PDF-1.7\n% not the reviewed bytes\n");
  }
  tempRoots.push(dir);
  return dir;
}

const CONTROLS = [
  ["source-empty CI with a current matching promotion proof passes", () => ({}), (r) =>
    !r.red && r.mode === "committed_promotion_proof"],

  ["source-empty CI with the promotion proof removed fails", () => { remove(READINESS); return {}; }, (r) =>
    r.red && r.mode === "committed_promotion_proof"],

  ["source-empty CI with one reviewed source digest altered fails", () => {
    const { recordPath } = firstResolvedFamily();
    const record = readJson(recordPath);
    if (record.sha256) record.sha256 = "0".repeat(64);
    else record.expectedSha256 = "0".repeat(64);
    writeJson(recordPath, record);
    return {};
  }, (r) => r.red && r.mode === "committed_promotion_proof"],

  ["source-empty CI with a non-approved review binding fails", () => {
    const consumption = readJson(CONSUMPTION);
    consumption.rows[0].verdict = "correction_required";
    writeJson(CONSUMPTION, consumption);
    return {};
  }, (r) => r.red && r.mode === "committed_promotion_proof"],

  ["a partial corpus root fails instead of entering proof-backed mode", () =>
    ({ OFFICIAL_FORMS_SOURCE_DIR: partialCorpusRoot() }), (r) =>
    r.red && r.mode === "partial_or_invalid_source_mount"],

  ["a complete mounted corpus whose source bytes mismatch fails", () =>
    ({ OFFICIAL_FORMS_SOURCE_DIR: completeCorpusRootWithMismatchedBytes() }), (r) =>
    r.red && r.mode === "mounted_corpus"]
];

let wrong = 0;
for (const [label, setup, expected] of CONTROLS) {
  const env = setup();
  const result = check(env);
  restoreAll();
  const ok = expected(result);
  console.log(`${ok ? "ok      " : "WRONG   "} ${label} [mode=${result.mode}, ${result.red ? "red" : "green"}]`);
  if (!ok) { wrong += 1; console.log(result.out.split("\n").slice(0, 4).map((l) => `           ${l}`).join("\n")); }
}

restoreAll();
for (const dir of tempRoots) fs.rmSync(dir, { recursive: true, force: true });
const dirty = spawnSync("git", ["status", "--porcelain", "--", "data"], { cwd: rootDir, encoding: "utf8" });
if ((dirty.stdout ?? "").trim() !== "") {
  console.error(`\nDIRTY — controls left data/ modified:\n${dirty.stdout}`);
  process.exit(1);
}

if (wrong > 0) {
  console.error(`\nverify-rcap-problematic-pdf-register-source-modes FAILED — ${wrong} control(s) behaved wrongly.`);
  process.exit(1);
}
console.log(`\nThe register check tells a complete source mount from an empty one, and proof-backed mode still fails on a real defect (${CONTROLS.length}/${CONTROLS.length}); tree restored.`);
