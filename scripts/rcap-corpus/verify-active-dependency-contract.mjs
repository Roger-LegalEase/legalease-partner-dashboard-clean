#!/usr/bin/env node
/**
 * The control on the active dependency contract.
 *
 * The contract's whole job is to make a set of recorded paths STOP being launch
 * blockers, which is the most dangerous kind of change to get wrong: every bug
 * in it looks like progress. A defect here does not turn the suite red, it
 * turns a missing official form into a green light.
 *
 * So the checks below are mostly about what the contract REFUSES to excuse, and
 * they are run by mutating a throwaway copy of the repository's own records
 * rather than by asserting that the code means well. Four mutations:
 *
 *   I    a live packet component reclassified to an unknown class -> still active
 *   II   a disposition row deleted -> its path becomes active, not excused
 *   III  a custody record pointed at bytes that are not there -> stale, not held
 *   IV   a held file's bytes altered -> no longer held, because identity is the hash
 *
 * It also holds the boundary: the completeness precondition is NOT relaxed by
 * any of this, and the generated status record has to be current.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  activeDependencyContract,
  ACTIVE_CLASSIFICATIONS,
  SETTLED_CLASSIFICATIONS,
  CUSTODY_RECORDS,
  RESTORE_MANIFEST,
  RESIDUAL_EXECUTION
} from "./active-dependency-contract.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const STATUS = "data/rcap-all50/NATIONWIDE_ACTIVE_DEPENDENCY_STATUS.json";

const failures = [];
const check = (passed, message) => {
  console.log(`${passed ? "ok  " : "FAIL"} ${message}`);
  if (!passed) failures.push(message);
};

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

const base = activeDependencyContract(rootDir);

// ---------------------------------------------------------------- the shape

check(
  ACTIVE_CLASSIFICATIONS.every((c) => !SETTLED_CLASSIFICATIONS.includes(c)),
  "no classification is both active and settled"
);

const classifications = new Set(readJson(path.join(rootDir, RESIDUAL_EXECUTION)).rows.map((r) => r.classification));
const known = new Set([...ACTIVE_CLASSIFICATIONS, ...SETTLED_CLASSIFICATIONS]);
const unknown = [...classifications].filter((c) => !known.has(c));
check(
  unknown.length === 0,
  `every classification the disposition uses is one the contract knows${unknown.length ? ` (unknown: ${unknown.join(", ")})` : ""}`
);

check(
  base.rows.filter((row) => ACTIVE_CLASSIFICATIONS.includes(row.classification)).every((row) => row.active),
  "no path in an active class is ever treated as settled"
);

check(
  base.rows.filter((row) => row.classification === "UNCLASSIFIED").every((row) => row.active),
  "an unclassified recorded path is an active dependency (fail-closed)"
);

// Settled is a statement about dependency. It must never imply custody.
const settledAbsent = base.rows.filter((row) => !row.active && !row.bytesHeld);
check(
  settledAbsent.length > 0 && settledAbsent.every((row) => row.bytesHeld === false),
  `settled paths with absent bytes are still reported absent, not recovered (${settledAbsent.length})`
);

/*
 * Every superseded source names the edition that replaced it.
 *
 * Not every supersession is one file replacing one file. Maryland's DC-CR-071
 * was replaced by the CC-DC-CR-072 SERIES -- four forms -- so there is no
 * single successor hash to bind, and the record says so: it names the series
 * and the official index, and records that the identity was inferred from the
 * filename and from no route asking for 071. That is a weaker determination
 * than an exact hash, and the right thing to do with it is surface it, not
 * demand a hash the world does not have and not quietly accept it as equal.
 */
const superseded = base.rows.filter((row) => row.classification === "SUPERSEDED_SOURCE");
const namesSuccessor = (row) => Boolean(row.successor?.formNumber && row.successor?.officialSourcePage);
const boundByHash = superseded.filter((row) => row.successor?.currentSha256 && row.successor?.heldAt);
const unnamed = superseded.filter((row) => !namesSuccessor(row));
check(
  superseded.length > 0 && unnamed.length === 0,
  `every superseded source names its successor edition of record (${superseded.length})${
    unnamed.length ? `; ${unnamed.length} do not` : ""}`
);

// A successor not bound to exact bytes has to say how confidently it was identified.
const disposition = readJson(path.join(rootDir, RESIDUAL_EXECUTION));
const inferred = superseded.filter((row) => !boundByHash.includes(row));
const undeclared = inferred.filter((row) =>
  !disposition.rows.find((r) => r.sha256 === row.sha256)?.identityConfidence);
check(
  undeclared.length === 0,
  `${boundByHash.length} of ${superseded.length} successors are bound to exact bytes; the other ${inferred.length} declare how the identity was reached${
    undeclared.length ? ` (${undeclared.length} do not)` : ""}`
);

// ------------------------------------------------- the boundary it must keep

const precondition = fs.readFileSync(
  path.join(rootDir, "scripts/rcap-official-forms/operational-corpus-precondition.mjs"), "utf8");
check(
  /absent\.length === 0 && mismatched\.length === 0/.test(precondition),
  "the completeness precondition still requires the WHOLE recorded corpus -- this contract does not relax it"
);
check(
  !/active-dependency-contract/.test(precondition),
  "the completeness precondition does not consult this contract; condition 7 remains a question about the complete tree"
);

// ------------------------------------------------------------ the mutations

/**
 * A throwaway repository whose records can be edited. The evidence trees are
 * symlinked rather than copied, so custody resolves exactly as it does for
 * real and a mutation is the only difference between the two runs.
 */
function scratchRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "adc-"));
  fs.mkdirSync(path.join(dir, "data/rcap-all50"), { recursive: true });
  for (const file of [RESTORE_MANIFEST, RESIDUAL_EXECUTION]) {
    fs.copyFileSync(path.join(rootDir, file), path.join(dir, file));
  }
  for (const source of CUSTODY_RECORDS) {
    fs.mkdirSync(path.join(dir, path.dirname(source.record)), { recursive: true });
    fs.copyFileSync(path.join(rootDir, source.record), path.join(dir, source.record));
  }
  for (const entry of ["reference"]) {
    if (fs.existsSync(path.join(rootDir, entry))) fs.symlinkSync(path.join(rootDir, entry), path.join(dir, entry));
  }
  return dir;
}

/*
 * The row the custody mutations act on must be one the DISPOSITION names.
 * A held path outside the residual set was never in dispute, so breaking its
 * binding cannot move the findings count -- and a mutation that cannot move
 * the number it is testing proves nothing.
 */
const inDisposition = new Set(disposition.rows.map((r) => r.sha256));
const heldResidual = base.rows.find((row) =>
  row.active && row.bytesHeld && inDisposition.has(row.sha256)
  && row.custody?.record === CUSTODY_RECORDS[0].record);
check(Boolean(heldResidual), "there is a held residual dependency for the custody mutations to act on");

const control = activeDependencyContract(scratchRepo());
check(
  control.counts.residualActiveUnheld === base.counts.residualActiveUnheld
  && control.counts.residualActiveHeld === base.counts.residualActiveHeld,
  `the scratch repository reproduces the real contract (${control.counts.residualActiveHeld} held, ${control.counts.residualActiveUnheld} unheld)`
);

// I -- a live component reclassified to something the contract does not know.
{
  const dir = scratchRepo();
  const file = path.join(dir, RESIDUAL_EXECUTION);
  const json = readJson(file);
  const row = json.rows.find((r) => r.classification === "LIVE_PACKET_COMPONENT");
  row.classification = "PROBABLY_FINE";
  fs.writeFileSync(file, JSON.stringify(json, null, 2));
  const mutated = activeDependencyContract(dir);
  const seen = mutated.rows.find((r) => r.sha256 === row.sha256);
  check(
    seen.active === true,
    "MUTATION I: a class the contract does not recognise does not excuse a path -- it stays an active dependency"
  );
}

// II -- the disposition row deleted outright.
{
  const dir = scratchRepo();
  const file = path.join(dir, RESIDUAL_EXECUTION);
  const json = readJson(file);
  const dropped = json.rows.find((r) => r.classification === "REFERENCE_ONLY");
  json.rows = json.rows.filter((r) => r.sha256 !== dropped.sha256);
  fs.writeFileSync(file, JSON.stringify(json, null, 2));
  const mutated = activeDependencyContract(dir);
  const seen = mutated.rows.find((r) => r.sha256 === dropped.sha256);
  check(
    seen.active === true && seen.classification === "UNCLASSIFIED",
    "MUTATION II: deleting a disposition row does not silently excuse the path -- it becomes an unclassified active dependency"
  );
}

// III -- a custody record that names bytes which are not there.
{
  const dir = scratchRepo();
  const source = CUSTODY_RECORDS[0];
  const file = path.join(dir, source.record);
  const json = readJson(file);
  const rows = source.rows(json);
  const held = heldResidual;
  const row = rows.find((r) => source.sha256(r) === held.sha256);
  row.heldCorpusPath = "reference/source-recovery/this-file-does-not-exist.pdf";
  fs.writeFileSync(file, JSON.stringify(json, null, 2));
  const mutated = activeDependencyContract(dir);
  const seen = mutated.rows.find((r) => r.sha256 === held.sha256);
  check(
    seen.bytesHeld === false && mutated.staleCustodyBindings.some((s) => s.sha256 === held.sha256),
    "MUTATION III: a custody record naming bytes that are not there is reported stale, never counted as held"
  );
  check(
    mutated.counts.residualActiveUnheld === base.counts.residualActiveUnheld + 1,
    "MUTATION III: and the path returns to the findings"
  );
}

// IV -- the held bytes themselves altered. Identity is the hash, not the path.
{
  const dir = scratchRepo();
  const source = CUSTODY_RECORDS[0];
  const held = heldResidual;
  // Redirect the binding at a real file whose bytes are something else.
  const decoy = path.join(dir, "reference-decoy.pdf");
  fs.writeFileSync(decoy, "not the official form\n");
  const file = path.join(dir, source.record);
  const json = readJson(file);
  source.rows(json).find((r) => source.sha256(r) === held.sha256).heldCorpusPath = "reference-decoy.pdf";
  fs.writeFileSync(file, JSON.stringify(json, null, 2));
  const mutated = activeDependencyContract(dir);
  const seen = mutated.rows.find((r) => r.sha256 === held.sha256);
  const stale = mutated.staleCustodyBindings.find((s) => s.sha256 === held.sha256);
  check(
    seen.bytesHeld === false && stale?.why === "the file is there and is not those bytes",
    "MUTATION IV: a file present at the named path with different bytes does not satisfy the dependency"
  );
}

// -------------------------------------------------------- the status record

const statusPath = path.join(rootDir, STATUS);
check(fs.existsSync(statusPath), `the generated status record exists (${STATUS})`);
if (fs.existsSync(statusPath)) {
  const status = readJson(statusPath);
  check(
    status.counts.residualActiveUnheld === base.counts.residualActiveUnheld
    && status.counts.residualActive === base.counts.residualActive
    && status.counts.settled === base.counts.settled,
    "the status record is current -- regenerate it with its own generator if this fails"
  );
  check(
    status.unheldActiveDependencies.length === base.counts.residualActiveUnheld,
    `the status record names every unheld active dependency (${status.unheldActiveDependencies.length})`
  );
  check(
    /does not establish that any absent byte was recovered/i.test(JSON.stringify(status.whatThisDoesNotEstablish)),
    "the status record states in terms that it does not relabel absent bytes as recovered"
  );
}

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"} — ${failures.length} failing check(s)`);
if (failures.length > 0) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exitCode = 1;
}
