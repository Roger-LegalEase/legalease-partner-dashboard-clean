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
 * THE SECOND WAY A PIN CAN MOVE: THE PROOF ITSELF IS SUPERSEDED.
 *
 * A reconciliation carries a pin forward within one proof. It cannot describe
 * what happens when an owner decision supersedes the packet a proof measured:
 * there the proof's artifacts stop reproducing altogether, and no re-pin could
 * make them reproduce. That proof is retired and a new generation is written.
 *
 * Retirement is the obvious way to escape a ledger — abandon the proof whose
 * pins have drifted and start clean — so it is held to its own rules:
 *
 *   5. exactly one generation is live, and it is the proof this verifier and
 *      the authority generator read;
 *   6. a retired generation names its successor, the successor names it back,
 *      and the retired proof file is still on disk with the bytes the
 *      generation records;
 *   7. a retired generation enumerates every pin it left unreconciled, and the
 *      list is checked against the retirement tree, so it can be neither padded nor
 *      emptied;
 *   8. the live generation's own pins are held to rules 1–4 as before.
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
/**
 * The live proof is not a constant here. It is whichever generation the ledger
 * declares live, and `generationRefusals` below proves that declaration is the
 * one the rest of the system reads. Hard-coding it would mean this verifier and
 * the authority generator could silently disagree about which proof is current.
 */
const PROOF_CONSUMER = "scripts/lib/ms-paid-packet-proof.mjs";

const read = (file) => fs.readFileSync(path.join(rootDir, file), "utf8");
const json = (file) => JSON.parse(read(file));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const decisionIdentity = proof => ({
  decisionPath: proof.ownerDecision.decisionPath,
  decisionSha256: proof.ownerDecision.decisionSha256
});
const gitCache = new Map();
const git = (args, encoding = "utf8") => {
  const key = JSON.stringify([args, encoding]);
  if (!gitCache.has(key)) gitCache.set(key, spawnSync("git", args,
    { cwd: rootDir, encoding, maxBuffer: 64 * 1024 * 1024 }));
  return gitCache.get(key);
};
const blob = (commit, file) => {
  if (!/^[a-f0-9]{40}$/.test(commit ?? "")) return null;
  const result = git(["show", `${commit}:${file}`], "buffer");
  return result.status === 0 ? result.stdout : null;
};
const blobJson = (commit, file) => {
  const bytes = blob(commit, file);
  return bytes ? JSON.parse(bytes) : null;
};
const inputChanges = (before, after) => [...new Set([
  ...Object.keys(before.inputs ?? {}), ...Object.keys(after.inputs ?? {})
])].sort().filter(file => before.inputs?.[file] !== after.inputs?.[file])
  .map(file => ({ file, priorSha256: before.inputs?.[file] ?? null, currentSha256: after.inputs?.[file] ?? null }));

// Generation declarations and their retirement pins are historical facts.
// Revisions project a live identity forward without editing those declarations.
function revisionRefusals(ledger, livePath) {
  const found = [];
  const snapshot = ledger.generationSnapshotSha;
  const original = blobJson(snapshot, LEDGER);
  if (!original) return ["the generation snapshot is not an available exact Git object"];
  if (git(["merge-base", "--is-ancestor", snapshot, "HEAD"]).status !== 0) {
    found.push("the generation snapshot is not in this candidate's history");
  }
  if (!equal(ledger.proofGenerations, original.proofGenerations)
    || !equal(ledger.reconciliations?.slice(0, original.reconciliations.length), original.reconciliations)) {
    found.push("historical generation declarations or reconciliations were rewritten");
  }
  const history = git(["log", "--reverse", "--format=%H", `${snapshot}..HEAD`, "--", livePath]);
  const revisions = ledger.proofRevisions ?? [];
  if (history.status !== 0 || !equal(revisions.map(r => r.recordedAtCommit), history.stdout.trim().split(/\s+/).filter(Boolean))) {
    found.push("the live proof revision chain does not account for its exact Git history");
  }
  let previousBytes = blob(snapshot, livePath);
  if (!previousBytes) return [...found, "the generation snapshot has no live proof"];
  let previous = JSON.parse(previousBytes);
  const declared = ledger.proofGenerations?.find(g => g.state === "live");
  if (declared?.proofSha256 !== sha256(previousBytes) || declared?.decision !== previous.ownerDecision.decisionPath) {
    found.push("the initial live generation does not match its historical proof");
  }
  for (const revision of revisions) {
    const bytes = blob(revision.recordedAtCommit, livePath);
    if (!bytes) { found.push("a recorded proof revision is unavailable"); continue; }
    const current = JSON.parse(bytes);
    const fields = [...new Set([...Object.keys(previous), ...Object.keys(current)])].sort()
      .filter(key => !equal(previous[key], current[key]));
    if (revision.proof !== livePath || revision.priorSha256 !== sha256(previousBytes)
      || revision.currentSha256 !== sha256(bytes)
      || !equal(revision.priorDecision, decisionIdentity(previous))
      || !equal(revision.currentDecision, decisionIdentity(current))
      || !equal(revision.changedFields, fields)
      || !equal(revision.changedInputs, inputChanges(previous, current))) {
      found.push(`${revision.recordedAtCommit}: the proof revision does not match the immutable before/after objects`);
    }
    const decisionBytes = blob(revision.recordedAtCommit, current.ownerDecision.decisionPath);
    if (!decisionBytes || sha256(decisionBytes) !== current.ownerDecision.decisionSha256) {
      found.push(`${revision.recordedAtCommit}: the controlling decision bytes do not match`);
    }
    if (!String(revision.evidence ?? "").trim()) found.push("a proof revision supplies no evidence disposition");
    if (revision.kind === "input_refresh") {
      if (fields.some(key => !["sourceSha", "inputs"].includes(key))) {
        found.push("an input refresh changes substantive proof or authority fields");
      }
    } else if (revision.kind === "approved_authority_supersession") {
      if (equal(previous.ownerDecision, current.ownerDecision)) found.push("an authority supersession supplies no successor decision");
    } else found.push("an unknown proof revision kind cannot carry authority forward");
    previousBytes = bytes;
    previous = current;
  }
  if (sha256(previousBytes) !== sha256(fs.readFileSync(path.join(rootDir, livePath)))) {
    found.push("the live proof has an unrecorded revision after the recorded chain");
  }
  const currentDecision = path.join(rootDir, previous.ownerDecision.decisionPath);
  if (!fs.existsSync(currentDecision) || sha256(fs.readFileSync(currentDecision)) !== previous.ownerDecision.decisionSha256) {
    found.push("the projected live decision no longer matches its current authority bytes");
  }
  return found;
}

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
/**
 * Every refusal the proof-generation record must produce.
 *
 * Kept separate from `refusals` so the mutation pass can drive it over edited
 * ledgers, and so a generation problem is reported as a generation problem
 * rather than as a pin that mysteriously stopped matching.
 */
function generationRefusals(ledger, livePath) {
  const found = revisionRefusals(ledger, livePath);
  const say = (reason) => found.push(reason);
  const generations = ledger.proofGenerations ?? [];
  if (generations.length === 0) return ["the ledger declares no proof generation at all"];

  // 5. Exactly one live generation, and it is the one the rest of the system
  //    reads. A ledger that declared a different proof live than the generator
  //    consumes would be auditing a file nothing uses.
  const live = generations.filter((entry) => entry.state === "live");
  if (live.length !== 1) say(`the ledger declares ${live.length} live proof generations; exactly one may be live`);
  else if (live[0].proof !== livePath) {
    say(`the ledger declares ${live[0].proof} live but ${PROOF_CONSUMER} reads ${livePath}`);
  }

  for (const generation of generations) {
    const file = generation.proof;
    // 6. Every generation's file is still on disk with the bytes it records.
    //    A retired proof that quietly disappeared would take its unreconciled
    //    pins with it.
    if (!file || !fs.existsSync(path.join(rootDir, file))) {
      say(`${file ?? "(unnamed)"}: the ledger declares a proof generation whose file is not on disk`);
      continue;
    }
    const actual = sha256(fs.readFileSync(path.join(rootDir, file)));
    const expected = generation.state === "live"
      ? ledger.proofRevisions?.at(-1)?.currentSha256 ?? generation.proofSha256
      : generation.proofSha256;
    if (expected !== actual) {
      say(`${file}: the ledger records ${String(generation.proofSha256).slice(0, 12)} but the proof now hashes to ${actual.slice(0, 12)}`);
    }
    if (generation.state !== "retired") continue;

    // 6 (cont). Retirement is a two-sided statement, so both sides must agree.
    const successor = generations.find((entry) => entry.proof === generation.supersededBy);
    if (!successor) say(`${file}: a retired proof names no successor generation in this ledger`);
    else if (successor.supersedes !== file) say(`${file}: its successor ${successor.proof} does not name it as superseded`);
    if (!String(generation.retiredBecause ?? "").trim()) say(`${file}: a retired proof states no reason`);
    if (generation.resolvedBy !== "retirement_not_repinning") {
      say(`${file}: a retirement must say that its pins were resolved by retirement rather than re-pinned`);
    }
    if (generation.fileKeptUnchanged !== true) say(`${file}: a retirement must keep the retired proof unchanged`);

    // 7. The unreconciled pins are recomputed, not trusted. A padded list and
    //    an emptied one are both caught: the recorded set must be exactly the
    //    set of this proof's pins that no longer matched at retirement.
    const retiredProof = JSON.parse(read(file));
    const drifted = new Map();
    for (const [pinned, expected] of Object.entries(retiredProof.inputs ?? {})) {
      const retiredBytes = blob(ledger.generationSnapshotSha, pinned);
      const now = retiredBytes ? sha256(retiredBytes) : null;
      if (now !== expected) drifted.set(pinned, { expected, now });
    }
    const recorded = new Map((generation.unreconciledPinsAtRetirement ?? [])
      .map((entry) => [entry.file, entry]));
    for (const [pinned, { expected, now }] of drifted) {
      const entry = recorded.get(pinned);
      if (!entry) { say(`${file}: retirement does not record that ${pinned} was left unreconciled`); continue; }
      if (entry.pinnedByRetiredProof !== expected || entry.actualNow !== now) {
        say(`${file}: the recorded unreconciled pin for ${pinned} is not the one the retirement tree shows`);
      }
    }
    for (const pinned of recorded.keys()) {
      if (!drifted.has(pinned)) say(`${file}: retirement records ${pinned} as unreconciled, but it matches the tree`);
    }
  }
  return found;
}

function refusals(ledger, proof) {
  const found = [];
  const say = (reason) => found.push(reason);
  const entries = ledger.reconciliations ?? [];

  if (entries.length === 0) say("the ledger records no reconciliation at all");

  // A retired proof and its successor have independent pin histories.
  const byFile = new Map();
  for (const entry of entries) {
    const file = entry.pin?.file;
    if (!file) { say("a reconciliation names no pinned file"); continue; }
    if (!(ledger.proofGenerations ?? []).some(g => g.proof === entry.proof)) {
      say(`${file}: a reconciliation names an undeclared proof generation`);
      continue;
    }
    const key = JSON.stringify([entry.proof, file]);
    if (!byFile.has(key)) byFile.set(key, []);
    byFile.get(key).push(entry);
  }

  for (const [key, chain] of byFile) {
    const [proofPath, file] = JSON.parse(key);
    const scopedProof = proofPath === PROOF ? proof : json(proofPath);
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
      const baselineBytes = blob(baseline.acceptedBaselineSha, file);
      const baselineProof = blobJson(baseline.acceptedBaselineSha, proofPath);
      if (!baselineBytes || sha256(baselineBytes) !== priorSha256 || baselineProof?.inputs?.[file] !== priorSha256) {
        say(`${file}: the baseline source and its proof do not establish the prior pin`);
      }
      const recordedProof = entry.regenerationCommit ? blobJson(entry.regenerationCommit, proofPath) : scopedProof;
      if (!recordedProof || recordedProof.inputs?.[file] !== currentSha256) {
        say(`${file}: the cited regeneration does not establish the new pin`);
      }
      const results = recordedProof?.results ?? [];
      for (const result of results) {
        const id = result.fixture ?? result.id;
        if (entry.parityAndSafetyEvidence?.artifactSha256?.[id] !== result.artifactSha256
          || entry.parityAndSafetyEvidence?.finalVerificationBoundInputsSha256?.[id] !== result.verificationBoundInputsSha256
          || (result.currentRendererByteIdentical ?? result.currentAssemblyByteIdentical) !== true
          || result.postgresJsonbByteIdentical !== true || result.postgresVerificationHashIdentical !== true) {
          say(`${file}: the recorded parity does not match this proof generation's measured results`);
        }
      }
      if (!results.length || entry.mutationSensitivityPreserved?.negativeBindingControls
        !== results.reduce((n, result) => n + result.negativeBindingControls, 0)) {
        say(`${file}: the mutation-control count is not this proof generation's measured total`);
      }
    }

    // 1. The newest pin must be the live one, in the proof and on disk.
    const live = scopedProof.inputs?.[file] ?? null;
    if (live !== previousCurrent) {
      say(`${file}: the proof pins ${String(live).slice(0, 12)} but the ledger's newest reconciliation leaves ${String(previousCurrent).slice(0, 12)}`);
    }
  }

  // The latest refresh needs an explicit scoped reconciliation for each input
  // it carried forward, even when the regenerated proof already matches disk.
  const latest = ledger.proofRevisions?.at(-1);
  if (latest?.kind === "input_refresh") for (const changed of latest.changedInputs ?? []) {
    if (!entries.some(entry => entry.proof === PROOF && entry.regenerationCommit === latest.recordedAtCommit
      && equal(entry.pin, changed))) {
      say(`${changed.file}: the live input refresh lacks its scoped reconciliation`);
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
/* Which proof is live is read from the module the authority generator imports,
 * so this verifier cannot drift into auditing a file nothing consumes. */
const PROOF = (await import(`../${PROOF_CONSUMER}`)).MS_PAID_PACKET_PROOF;
const proof = json(PROOF);

ok("the ledger declares its schema", ledger.schemaVersion === "rcap-ms-paid-packet-proof-reconciliations/v1", ledger.schemaVersion);
ok("the ledger states the rule it enforces", String(ledger.rule ?? "").includes("never updated to make a check pass"));
ok("the ledger is append-only by declaration", String(ledger.purpose ?? "").includes("never rewritten"));
ok("the ledger states that retirement is not an escape from a proof's pins",
  String(ledger.rule ?? "").includes("never retired to escape its own pins"));

const generationProblems = generationRefusals(ledger, PROOF);
ok("the declared proof generations account for every proof on disk", generationProblems.length === 0, generationProblems.join("; "));

const live = refusals(ledger, proof);
ok("the recorded reconciliations account for the proof as it stands", live.length === 0, live.join("; "));

/*
 * The recorded parity evidence must be the proof's own, not a restatement.
 *
 * A reconciliation carries a pin forward within ONE proof, so it is checked
 * against that proof — not against whichever proof happens to be live now.
 * Checking the newest re-pin of the retired generation against the live
 * generation's results would compare a record of one packet to the bytes of
 * another and fail for a reason that says nothing about either.
 */
const newest = ledger.reconciliations[ledger.reconciliations.length - 1];
const reconciledProof = json(newest.proof);
const reconciledResults = reconciledProof.results ?? [];
/* v1 results are keyed by fixture and record the renderer; v2 results are keyed
 * by approved-artifact id and record the production assembly. */
const resultKey = (result) => result.fixture ?? result.id;
const reproducedCurrently = (result) =>
  (result.currentRendererByteIdentical ?? result.currentAssemblyByteIdentical) === true;
for (const result of reconciledResults) {
  const key = resultKey(result);
  ok(`${key}: the recorded artifact hash is the proof's`,
    newest.parityAndSafetyEvidence?.artifactSha256?.[key] === result.artifactSha256,
    `${newest.parityAndSafetyEvidence?.artifactSha256?.[key]} vs ${result.artifactSha256}`);
  ok(`${key}: the recorded verification digest is the proof's`,
    newest.parityAndSafetyEvidence?.finalVerificationBoundInputsSha256?.[key] === result.verificationBoundInputsSha256);
  ok(`${key}: the proof still binds every field`,
    result.negativeBindingControls > 0 && reproducedCurrently(result)
    && result.postgresJsonbByteIdentical === true && result.postgresVerificationHashIdentical === true);
}
ok("the recorded control count is the proof's own total",
  newest.mutationSensitivityPreserved.negativeBindingControls
    === reconciledResults.reduce((total, result) => total + result.negativeBindingControls, 0),
  String(newest.mutationSensitivityPreserved.negativeBindingControls));

/* And the live proof binds every field in its own right, whether or not any pin
 * of it has ever needed carrying forward. */
for (const result of proof.results ?? []) {
  ok(`${resultKey(result)}: the live proof binds every field`,
    result.negativeBindingControls > 0 && reproducedCurrently(result)
    && result.postgresJsonbByteIdentical === true && result.postgresVerificationHashIdentical === true);
}

// The baseline claim is checkable, so check it rather than trusting the prose.
const baselineSha = newest.baselineComparison.acceptedBaselineSha;
const baselineBytes = spawnSync("git", ["show", `${baselineSha}:${newest.pin.file}`],
  { cwd: rootDir, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 });
ok("the accepted baseline holds the prior pinned bytes",
  baselineBytes.status === 0 && sha256(baselineBytes.stdout) === newest.pin.priorSha256,
  baselineBytes.status === 0 ? sha256(baselineBytes.stdout).slice(0, 12) : "unreadable");
const baselineProof = spawnSync("git", ["show", `${baselineSha}:${newest.proof}`],
  { cwd: rootDir, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
ok("the proof artifact itself did not move at the baseline",
  baselineProof.status === 0
    && JSON.parse(baselineProof.stdout).inputs?.[newest.pin.file] === newest.pin.priorSha256);

// ------------------------------------------------------------- mutations
if (process.argv.includes("--mutations")) {
  if (generationProblems.length || live.length) {
    console.error("Mutation credit refused: the unmutated currentness baseline is not green.");
    process.exit(1);
  }
  const clone = () => JSON.parse(JSON.stringify(ledger));
  const cases = [
    ["the current packet-information reconciliation is missing", () => {
      const edited = clone();
      edited.reconciliations = edited.reconciliations.filter(entry =>
        !(entry.proof === PROOF && entry.pin.file === "src/lib/expungement-ai/packet-information.ts"));
      return edited;
    }],
    ["a current reconciliation is assigned to the retired generation", () => {
      const edited = clone();
      edited.reconciliations.at(-1).proof = edited.proofGenerations[0].proof;
      return edited;
    }],
    ["a reconciliation invents an artifact parity hash", () => {
      const edited = clone();
      edited.reconciliations.at(-1).parityAndSafetyEvidence.artifactSha256["full-en"] = "0".repeat(64);
      return edited;
    }],
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

  /*
   * Retirement is the second way a pin could escape this ledger, so each way of
   * abusing it is driven here too: abandoning a proof without declaring it,
   * declaring two live proofs, declaring one the system does not read, claiming
   * a retirement left nothing unreconciled, inventing drift that does not
   * exist, and editing or deleting the retired proof after retiring it.
   */
  const generationCases = [
    ["a proof revision is omitted", (edited) => { edited.proofRevisions.splice(1, 1); }],
    ["the latest proof revision is deleted", (edited) => { edited.proofRevisions.pop(); }],
    ["the current decision is reverted to the initial V2 declaration", (edited) => {
      edited.proofRevisions.at(-1).currentDecision = edited.proofRevisions[0].priorDecision;
    }],
    ["a revision understates its changed input set", (edited) => { edited.proofRevisions.at(-1).changedInputs.pop(); }],
    ["a revised proof silently reuses a superseded hash", (edited) => {
      edited.proofRevisions.at(-1).currentSha256 = edited.proofRevisions[0].priorSha256;
    }],
    ["retirement is judged against a later tree", (edited) => { edited.generationSnapshotSha = ledger.proofRevisions.at(-1).recordedAtCommit; }],
    ["a proof generation is abandoned rather than declared", (edited) => { delete edited.proofGenerations; }],
    ["two proofs are declared live", (edited) => { edited.proofGenerations[0].state = "live"; }],
    ["the live proof is not the one the system reads", (edited) => {
      edited.proofGenerations.find((entry) => entry.state === "live").proof =
        "data/rcap-grade-a/participant-data-rights/ms-paid-packet-proof-20260914.json";
    }],
    ["a retirement claims it left nothing unreconciled", (edited) => {
      edited.proofGenerations.find((entry) => entry.state === "retired").unreconciledPinsAtRetirement = [];
    }],
    ["a retirement invents drift that does not exist", (edited) => {
      edited.proofGenerations.find((entry) => entry.state === "retired").unreconciledPinsAtRetirement
        .push({ file: LEDGER, pinnedByRetiredProof: "0".repeat(64), actualNow: "1".repeat(64) });
    }],
    ["a retirement understates a pin it left behind", (edited) => {
      edited.proofGenerations.find((entry) => entry.state === "retired")
        .unreconciledPinsAtRetirement[0].actualNow = "0".repeat(64);
    }],
    ["a retired proof is edited after retirement", (edited) => {
      edited.proofGenerations.find((entry) => entry.state === "retired").proofSha256 = "0".repeat(64);
    }],
    ["a retired proof names no successor", (edited) => {
      edited.proofGenerations.find((entry) => entry.state === "retired").supersededBy = null;
    }],
    ["a retirement claims its pins were re-pinned instead", (edited) => {
      edited.proofGenerations.find((entry) => entry.state === "retired").resolvedBy = "repinned";
    }]
  ];
  console.log("\nProof-generation mutations that must be refused:");
  for (const [name, mutate] of generationCases) {
    checks += 1;
    const edited = clone();
    mutate(edited);
    const caught = generationRefusals(edited, PROOF);
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
