#!/usr/bin/env node
/**
 * The MS paid-packet proof's re-pins, held to the rule they exist under.
 *
 * A proof pins the bytes of the files it was derived from. When one of those
 * files legitimately moves, the tempting repair is to write the new hash into
 * the proof and move on — and a proof repaired that way has stopped being
 * evidence, because the edit that makes it green is indistinguishable from the
 * edit that would hide a real regression.
 *
 * So a move is only allowed through a recorded reconciliation, and this holds
 * that record to four properties:
 *
 *   1. the live proof agrees with the ledger's newest pin, and the file on
 *      disk agrees with both;
 *   2. the chain is continuous — each entry's prior hash is the one the
 *      previous entry left current, so no move is skipped over;
 *   3. nothing is laundered — a hash already recorded as superseded may never
 *      become current again;
 *   4. every entry says what it changed: the baseline comparison, the cause,
 *      the behavioural delta, the parity evidence, and that the regenerated
 *      proof is still mutation-sensitive.
 *
 * Run with --mutations to prove each of those bites.
 *
 * This verifier makes no claim about whether the change was correct. It claims
 * that the change was recorded, that the record is internally honest, and that
 * an unrecorded change is refused.
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER = "data/rcap-grade-a/participant-data-rights/ms-paid-packet-proof-reconciliations.json";
const PROOF = "data/rcap-grade-a/participant-data-rights/ms-paid-packet-proof-20260914.json";

const read = (file) => fs.readFileSync(path.join(rootDir, file), "utf8");
const json = (file) => JSON.parse(read(file));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const failures = [];
let checks = 0;
const ok = (label, condition, detail) => {
  checks += 1;
  if (!condition) failures.push(`${label}${detail === undefined ? "" : ` — got ${detail}`}`);
};

/**
 * Every refusal this ledger must produce, given a ledger and the live proof.
 *
 * Separated from the assertions so the mutation pass can drive the same
 * function over edited copies instead of re-implementing the rules.
 */
function refusals(ledger, proof) {
  const found = [];
  const say = (reason) => found.push(reason);
  const entries = ledger.reconciliations ?? [];

  if (entries.length === 0) say("the ledger records no reconciliation at all");

  // Grouped per pinned file: a proof pins many files and each has its own chain.
  const byFile = new Map();
  for (const entry of entries) {
    const file = entry.pin?.file;
    if (!file) { say("a reconciliation names no pinned file"); continue; }
    if (!byFile.has(file)) byFile.set(file, []);
    byFile.get(file).push(entry);
  }

  for (const [file, chain] of byFile) {
    const superseded = new Set();
    let previousCurrent = null;
    for (const entry of chain) {
      const { priorSha256, currentSha256 } = entry.pin;
      if (!/^[a-f0-9]{64}$/.test(priorSha256 ?? "") || !/^[a-f0-9]{64}$/.test(currentSha256 ?? "")) {
        say(`${file}: a reconciliation does not pin two full sha256 digests`);
        continue;
      }
      if (priorSha256 === currentSha256) say(`${file}: a reconciliation records a move to the same hash`);
      // 2. Continuity. The first entry may start anywhere; later ones may not
      //    skip a move, which is how a quiet intermediate edit would hide.
      if (previousCurrent !== null && priorSha256 !== previousCurrent) {
        say(`${file}: a reconciliation starts from ${priorSha256.slice(0, 12)} but the previous one left ${previousCurrent.slice(0, 12)}`);
      }
      // 3. Anti-laundering. Reverting to a hash already recorded as superseded
      //    would let a withdrawn state return without saying so.
      if (superseded.has(currentSha256)) {
        say(`${file}: a reconciliation re-pins ${currentSha256.slice(0, 12)}, which is already recorded as superseded`);
      }
      superseded.add(priorSha256);
      previousCurrent = currentSha256;

      // 4. A record that does not say what it changed is not a record.
      const baseline = entry.baselineComparison ?? {};
      if (!/^[a-f0-9]{40}$/.test(baseline.acceptedBaselineSha ?? "")) {
        say(`${file}: a reconciliation cites no accepted baseline commit`);
      }
      for (const field of ["resultOnBaseline", "resultOnCandidate", "classification"]) {
        if (!String(baseline[field] ?? "").trim()) say(`${file}: a reconciliation does not state ${field}`);
      }
      if (entry.whyTheBytesDiffer?.intentional !== true) {
        say(`${file}: a reconciliation does not claim the change was intentional, so the bytes should have been restored or held`);
      }
      if (!(entry.whyTheBytesDiffer?.commits ?? []).length) {
        say(`${file}: a reconciliation names no commit that moved the bytes`);
      }
      if (!String(entry.behaviouralDelta?.summary ?? "").trim()) {
        say(`${file}: a reconciliation states no behavioural delta`);
      }
      if (!String(entry.behaviouralDelta?.authorizesNoNewBehaviour ?? "").trim()) {
        say(`${file}: a reconciliation does not say what it authorizes`);
      }
      if (Object.keys(entry.parityAndSafetyEvidence ?? {}).length === 0) {
        say(`${file}: a reconciliation offers no parity or safety evidence`);
      }
      if (!(entry.mutationSensitivityPreserved?.negativeBindingControls > 0)) {
        say(`${file}: a reconciliation does not show the regenerated proof is still mutation-sensitive`);
      }
    }

    // 1. The newest pin must be the live one, in the proof and on disk.
    const live = proof.inputs?.[file] ?? null;
    if (live !== previousCurrent) {
      say(`${file}: the proof pins ${String(live).slice(0, 12)} but the ledger's newest reconciliation leaves ${String(previousCurrent).slice(0, 12)}`);
    }
  }

  // A pinned file whose bytes moved with no reconciliation at all is the exact
  // silent rewrite this ledger exists to prevent.
  for (const [file, expected] of Object.entries(proof.inputs ?? {})) {
    const absolute = path.join(rootDir, file);
    if (!fs.existsSync(absolute)) { say(`${file}: the proof pins a file that no longer exists`); continue; }
    const actual = sha256(fs.readFileSync(absolute));
    if (actual !== expected) {
      say(`${file}: the proof pins ${expected.slice(0, 12)} and the file now hashes to ${actual.slice(0, 12)}, with no reconciliation carrying it forward`);
    }
  }

  return found;
}

const ledger = json(LEDGER);
const proof = json(PROOF);

ok("the ledger declares its schema", ledger.schemaVersion === "rcap-ms-paid-packet-proof-reconciliations/v1", ledger.schemaVersion);
ok("the ledger states the rule it enforces", String(ledger.rule ?? "").includes("never updated to make a check pass"));
ok("the ledger is append-only by declaration", String(ledger.purpose ?? "").includes("never rewritten"));

const live = refusals(ledger, proof);
ok("the recorded reconciliations account for the proof as it stands", live.length === 0, live.join("; "));

// The recorded parity evidence must be the proof's own, not a restatement.
const newest = ledger.reconciliations[ledger.reconciliations.length - 1];
for (const result of proof.results ?? []) {
  ok(`${result.fixture}: the recorded artifact hash is the proof's`,
    newest.parityAndSafetyEvidence?.artifactSha256?.[result.fixture] === result.artifactSha256,
    `${newest.parityAndSafetyEvidence?.artifactSha256?.[result.fixture]} vs ${result.artifactSha256}`);
  ok(`${result.fixture}: the recorded verification digest is the proof's`,
    newest.parityAndSafetyEvidence?.finalVerificationBoundInputsSha256?.[result.fixture] === result.verificationBoundInputsSha256);
  ok(`${result.fixture}: the proof still binds every field`,
    result.negativeBindingControls > 0 && result.currentRendererByteIdentical === true
    && result.postgresJsonbByteIdentical === true && result.postgresVerificationHashIdentical === true);
}
ok("the recorded control count is the proof's own total",
  newest.mutationSensitivityPreserved.negativeBindingControls
    === (proof.results ?? []).reduce((total, result) => total + result.negativeBindingControls, 0),
  String(newest.mutationSensitivityPreserved.negativeBindingControls));

// The baseline claim is checkable, so check it rather than trusting the prose.
const baselineSha = newest.baselineComparison.acceptedBaselineSha;
const baselineBytes = spawnSync("git", ["show", `${baselineSha}:${newest.pin.file}`],
  { cwd: rootDir, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 });
ok("the accepted baseline holds the prior pinned bytes",
  baselineBytes.status === 0 && sha256(baselineBytes.stdout) === newest.pin.priorSha256,
  baselineBytes.status === 0 ? sha256(baselineBytes.stdout).slice(0, 12) : "unreadable");
const baselineProof = spawnSync("git", ["show", `${baselineSha}:${PROOF}`],
  { cwd: rootDir, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
ok("the proof artifact itself did not move at the baseline",
  baselineProof.status === 0
    && JSON.parse(baselineProof.stdout).inputs?.[newest.pin.file] === newest.pin.priorSha256);

// ------------------------------------------------------------- mutations
if (process.argv.includes("--mutations")) {
  const clone = () => JSON.parse(JSON.stringify(ledger));
  const cases = [
    ["a reconciliation is deleted, leaving the move unexplained", () => {
      const edited = clone();
      edited.reconciliations = [];
      return edited;
    }],
    ["a reconciliation is edited in place to point at different bytes", () => {
      const edited = clone();
      edited.reconciliations.at(-1).pin.currentSha256 = "0".repeat(64);
      return edited;
    }],
    ["a move is skipped rather than recorded", () => {
      const edited = clone();
      edited.reconciliations.at(-1).pin.priorSha256 = "1".repeat(64);
      edited.reconciliations.unshift(JSON.parse(JSON.stringify(edited.reconciliations[0])));
      edited.reconciliations[0].pin.currentSha256 = "2".repeat(64);
      return edited;
    }],
    ["a superseded hash is quietly re-pinned", () => {
      const edited = clone();
      const first = edited.reconciliations.at(-1);
      const revert = JSON.parse(JSON.stringify(first));
      revert.pin.priorSha256 = first.pin.currentSha256;
      revert.pin.currentSha256 = first.pin.priorSha256;
      edited.reconciliations.push(revert);
      return edited;
    }],
    ["a reconciliation claims the change was not intentional yet keeps the new pin", () => {
      const edited = clone();
      edited.reconciliations.at(-1).whyTheBytesDiffer.intentional = false;
      return edited;
    }],
    ["a reconciliation states no behavioural delta", () => {
      const edited = clone();
      edited.reconciliations.at(-1).behaviouralDelta.summary = "";
      return edited;
    }],
    ["a reconciliation offers no parity evidence", () => {
      const edited = clone();
      edited.reconciliations.at(-1).parityAndSafetyEvidence = {};
      return edited;
    }],
    ["a reconciliation drops the proof's mutation sensitivity", () => {
      const edited = clone();
      edited.reconciliations.at(-1).mutationSensitivityPreserved.negativeBindingControls = 0;
      return edited;
    }],
    ["a reconciliation cites no accepted baseline", () => {
      const edited = clone();
      edited.reconciliations.at(-1).baselineComparison.acceptedBaselineSha = "";
      return edited;
    }]
  ];
  console.log("\nMutations that must be refused:");
  for (const [name, mutate] of cases) {
    checks += 1;
    const caught = refusals(mutate(), proof);
    if (caught.length === 0) failures.push(`MISSED: ${name}`);
    else console.log(`  refused  ${name}\n             ${caught[0].slice(0, 130)}`);
  }

  // And one over the proof rather than the ledger: a pinned file whose bytes
  // move with no reconciliation must be refused even though the ledger is
  // untouched, because that is the silent rewrite itself.
  checks += 1;
  const movedProof = JSON.parse(JSON.stringify(proof));
  movedProof.inputs[newest.pin.file] = "3".repeat(64);
  const movedCaught = refusals(ledger, movedProof);
  if (movedCaught.length === 0) failures.push("MISSED: the proof's pin moves with no reconciliation");
  else console.log(`  refused  the proof's pin moves with no reconciliation\n             ${movedCaught[0].slice(0, 130)}`);
}

if (failures.length > 0) {
  console.error(`\nMS paid-packet proof reconciliation FAILED — ${failures.length} problem(s):`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`\nMS paid-packet proof reconciliation — ${checks} checks. Every pin the proof holds is either original or carried forward by a recorded, continuous, non-laundering reconciliation.`);
