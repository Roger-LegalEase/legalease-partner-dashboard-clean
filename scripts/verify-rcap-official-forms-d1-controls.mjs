#!/usr/bin/env node
// Controls for verify-rcap-official-forms-d1's reconciled expectations.
//
//   node scripts/verify-rcap-official-forms-d1-controls.mjs
//
// The D1 verifier was reconciled so that what a family must have on disk is
// derived from its current approved terminal state rather than assumed. That
// change REMOVED 28 assertions, and a check that stops failing is worth exactly
// as much as the defects it can still catch. Each control below reintroduces one
// real defect and requires the verifier to go red for it.
//
// Every mutation is applied to a COPY of the tree state in memory — the files
// are restored before the next control runs, and the run refuses to finish if
// anything is left modified. No approved PDF, evidence or review byte is
// rewritten by this file.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERIFIER = path.join(rootDir, "scripts/verify-rcap-official-forms-d1.mjs");
const PROD = path.join(rootDir, "data/rcap-all50/overlays/production");

const REFERENCE_ONLY = path.join(PROD, "north-carolina/aoc-cr-287-form-es");
const PROTECTED_ACTOR = path.join(PROD, "north-carolina/aoc-cr-296-form-en");
const FILING = path.join(PROD, "arkansas/felony-petition-form-f");
// A family the implementation index actually marks artifact-asserted. The
// Edition-lift control below needs felony-petition-form-f, which carries the
// editionHoldLiftedBy record but is NOT in the implementation index — so
// deleting ITS canonical PDF proves nothing about the artifact requirement.
const FILING_ASSERTED = path.join(PROD, "alaska/tf-800-form-en");

/** The verifier's real exit code — never a pipeline's. */
function verifierIsRed() {
  const run = spawnSync(process.execPath, [VERIFIER], { cwd: rootDir, encoding: "utf8", timeout: 600000 });
  return { red: run.status !== 0, out: `${run.stdout ?? ""}${run.stderr ?? ""}` };
}

const touched = new Map();
function write(file, body) {
  if (!touched.has(file)) touched.set(file, fs.existsSync(file) ? fs.readFileSync(file) : null);
  fs.mkdirSync(path.dirname(file), { recursive: true });
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
const readRecord = (dir) => JSON.parse(fs.readFileSync(path.join(dir, "source-record.json"), "utf8"));
const writeRecord = (dir, r) => write(path.join(dir, "source-record.json"), `${JSON.stringify(r, null, 2)}\n`);

const CONTROLS = [
  ["a participant PDF is added back to a reference-only translation", () => {
    write(path.join(REFERENCE_ONLY, "fixtures/canonical-filled.pdf"), Buffer.from("%PDF-1.7\n% reintroduced participant artifact\n"));
  }],
  ["a withdrawal receipt is removed while the artifacts stay absent", () => {
    const r = readRecord(REFERENCE_ONLY);
    r.artifactsWithdrawn = [];
    if (r.ownerDisposition) r.ownerDisposition.artifactsWithdrawn = [];
    writeRecord(REFERENCE_ONLY, r);
  }],
  ["a filing-artifact family is marked complete while its canonical PDF is absent", () => {
    remove(path.join(FILING_ASSERTED, "fixtures/canonical-filled.pdf"));
  }],
  ["a scoped authorization is removed from a family whose Edition hold was lifted", () => {
    const r = readRecord(FILING);
    delete r.editionHoldLiftedBy;
    delete r.implementationStatus;
    delete r.sourceBindingBasis;
    writeRecord(FILING, r);
  }],
  ["a chooser placeholder is reintroduced into an expected filing artifact", () => {
    write(path.join(FILING, "reports/populated-fields.json"), `${JSON.stringify({ note: "TODO wire the chooser" }, null, 2)}\n`);
  }],
  ["a protected-actor terminal family is turned into a participant-filled outcome", () => {
    const r = readRecord(PROTECTED_ACTOR);
    r.participantFillable = true;
    r.implementationStatus = "implemented_pending_independent_review";
    r.documentOwnership = "participant_completed";
    writeRecord(PROTECTED_ACTOR, r);
  }]
];

const baseline = verifierIsRed();
if (baseline.red) {
  console.error("baseline is not green; controls would prove nothing:\n");
  console.error(baseline.out.split("\n").filter((l) => l.startsWith(" - ")).slice(0, 10).join("\n"));
  process.exit(1);
}

let undetected = 0;
for (const [label, mutate] of CONTROLS) {
  mutate();
  const { red } = verifierIsRed();
  restoreAll();
  console.log(`${red ? "caught  " : "MISSED  "} ${label}`);
  if (!red) undetected += 1;
}

restoreAll();
const dirty = spawnSync("git", ["status", "--porcelain", "--", "data/rcap-all50"], { cwd: rootDir, encoding: "utf8" });
if ((dirty.stdout ?? "").trim() !== "") {
  console.error(`\nDIRTY — controls left data/rcap-all50 modified:\n${dirty.stdout}`);
  process.exit(1);
}

if (undetected > 0) {
  console.error(`\nverify-rcap-official-forms-d1-controls FAILED — ${undetected} control(s) undetected.`);
  process.exit(1);
}
console.log(`\nThe reconciled D1 verifier still goes red on every real defect (${CONTROLS.length}/${CONTROLS.length}); tree restored.`);
