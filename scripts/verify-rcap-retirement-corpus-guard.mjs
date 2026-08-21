#!/usr/bin/env node
// The seventh condition must refuse when it cannot be answered.
//
//   node scripts/verify-rcap-retirement-corpus-guard.mjs
//
// The defect these controls close was silent. The adjudication computed whether
// the operational Nationwide tree was mounted, never consulted the answer, and
// with the tree absent walked an empty file list -- so every candidate was "not
// found in the delivery", which the verdict read as condition 7 passing.
// Condition-7 passes went from 18 to 30 and the twelve assets whose source
// files are in the operational corpus were converted on the strength of a
// missing directory, in a record that reported mounted: false three lines up.
//
// Each control below asserts red where the old code was green. Nothing here
// checks that the guard exists; each one arranges the failure and requires the
// tool to refuse, because a guard nobody exercised is a comment.
//
// The corpora are synthetic and live in a temporary directory. The two that
// need the generator to get past the corpus legs point OFFICIAL_FORMS_SOURCE_DIR
// at a tree shaped like the operational one, so what is under test is the leg
// named in the control rather than the corpus check firing first.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { withTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ADJUDICATION = "data/rcap-all50/pdf-retirement-evidence/retirement-adjudication.json";
const ADJUDICATION_MD = "docs/record-clearing/pdf-independent-reviews/retirement-adjudication.md";
const GENERATOR = "scripts/generate-rcap-retirement-adjudication.mjs";
const RETIRE = "scripts/retire-rcap-problematic-pdf-assets.mjs";
const FACTORY = "scripts/rcap-all50-overlay-factory-lib.mjs";
const REPOINT = "data/rcap-all50/pdf-retirement-evidence/retirement-repoint-adjudication.json";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));
const failures = [];

// Every tracked file a control could cause a tool to write.
//
// This is not defensive tidiness. A control proves it is load-bearing by being
// run against the unguarded code, and the unguarded code does exactly what the
// control accuses it of: the retire tool writes forty markers and the generator
// rewrites the adjudication. Running these controls must not depend on which
// version of the code is checked out, so every control that invokes a writer
// runs inside a journal covering everything that writer can reach.
const OVERLAY_DIR = "data/rcap-all50/overlays/production";
const DISPUTED = "data/rcap-all50/pdf-retirement-evidence/disputed-retirement-markers.json";

function markerPathsTheRetireToolCanReach() {
  const paths = new Set([DISPUTED]);
  const determination = readJson("data/rcap-all50/pdf-retirement-determination.json");
  const states = fs.readdirSync(abs(OVERLAY_DIR)).filter((entry) => fs.statSync(abs(path.join(OVERLAY_DIR, entry))).isDirectory());
  for (const asset of determination.assets ?? []) {
    for (const familyId of asset.familyIds ?? []) {
      const slug = String(familyId).split(":").pop();
      if (!slug) continue;
      for (const state of states) {
        const dir = path.join(OVERLAY_DIR, state, slug);
        if (fs.existsSync(abs(path.join(dir, "source-record.json")))) paths.add(path.join(dir, "retirement.json"));
      }
    }
  }
  for (const state of states) {
    for (const family of fs.readdirSync(abs(path.join(OVERLAY_DIR, state)))) {
      const marker = path.join(OVERLAY_DIR, state, family, "retirement.json");
      if (fs.existsSync(abs(marker))) paths.add(marker);
    }
  }
  return [...paths];
}

const ADJUDICATION_OUTPUTS = [ADJUDICATION, ADJUDICATION_MD];
const RETIREMENT_OUTPUTS = markerPathsTheRetireToolCanReach();

/** Run a control inside a journal, so an unguarded tool cannot leave its writes behind. */
async function guarded(owner, paths, body) {
  await withTrackedMutation(`retirement-corpus-guard:${owner}`, paths, body);
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-corpus-guard-"));
const cleanup = () => { try { fs.rmSync(scratch, { recursive: true, force: true }); } catch { /* best effort */ } };
process.on("exit", cleanup);

/** A directory shaped like the operational tree: per-state LegalEase folders holding PDFs. */
function operationalShapedCorpus(name, files = ["LegalEase Alaska/RequestToSealCrimInfo.pdf"]) {
  const dir = path.join(scratch, name);
  for (const file of files) {
    const full = path.join(dir, file);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, "%PDF-1.4\n");
  }
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** A directory shaped like the Master Library archive, which answers a different question. */
function masterLibraryShapedCorpus(name) {
  const dir = path.join(scratch, name);
  fs.mkdirSync(path.join(dir, "STATES", "AK", "02_PACKET_FORMS"), { recursive: true });
  fs.mkdirSync(path.join(dir, "00_GOVERNANCE"), { recursive: true });
  fs.writeFileSync(path.join(dir, "STATES", "AK", "02_PACKET_FORMS", "AK__FORM__TF-800.pdf"), "%PDF-1.4\n");
  fs.writeFileSync(path.join(dir, "README.md"), "Master Library Edition 1\n");
  return dir;
}

/** Run a script and report whether it refused, with what it said. */
function run(script, argv = [], env = {}) {
  try {
    const stdout = execFileSync("node", [script, ...argv], {
      cwd: rootDir,
      stdio: "pipe",
      env: { ...process.env, ...env }
    }).toString();
    return { refused: false, output: stdout };
  } catch (error) {
    return { refused: true, output: `${error.stdout ?? ""}${error.stderr ?? ""}`.toString() };
  }
}

function control(name, result, expectations) {
  const problem = expectations(result);
  if (problem) failures.push(`${name}: ${problem}`);
  else console.log(`  ok  ${name}`);
}

/** Every refusal has to name the corpus it wanted, or the reader cannot act on it. */
function namesTheExpectedPath(output) {
  return output.includes("private/Nationwide Record Clearing") ? null : "the refusal does not name the expected operational corpus path";
}

function refusedBecause(code) {
  return ({ refused, output }) => {
    if (!refused) return "the tool produced a result instead of refusing";
    if (!output.includes(code)) return `refused for the wrong reason; expected ${code} in:\n${output.trim().slice(0, 500)}`;
    return namesTheExpectedPath(output);
  };
}

console.log("retirement corpus guard controls");

// The committed adjudication is the thing every control must leave alone, so
// its bytes are captured up front and compared at the end.
const committedAdjudicationBefore = fs.readFileSync(abs(ADJUDICATION), "utf8");
const committedTotals = readJson(ADJUDICATION).totals;

// 1. The operational corpus is absent.
await guarded("absent", ADJUDICATION_OUTPUTS, async () => {
  control(
    "1. operational corpus absent",
    run(GENERATOR, [], { OFFICIAL_FORMS_SOURCE_DIR: path.join(scratch, "does-not-exist") }),
    refusedBecause("operational_corpus_absent")
  );
});

// 2. The path exists and holds nothing. Zero files is not a zero-reference proof.
const emptyDir = path.join(scratch, "empty");
fs.mkdirSync(emptyDir, { recursive: true });
await guarded("empty", ADJUDICATION_OUTPUTS, async () => {
  control(
    "2. operational corpus path exists but is empty",
    run(GENERATOR, [], { OFFICIAL_FORMS_SOURCE_DIR: emptyDir }),
    refusedBecause("operational_corpus_empty")
  );
});

// 3. The Master Library is present and the operational corpus is not. The
//    archive answers what the current official edition is; it cannot answer what
//    the operational manifest names.
await guarded("master-library", ADJUDICATION_OUTPUTS, async () => {
  control(
    "3. the Master Library exists but the operational corpus does not",
    run(GENERATOR, [], { OFFICIAL_FORMS_SOURCE_DIR: masterLibraryShapedCorpus("master-library") }),
    (result) => {
      const problem = refusedBecause("operational_corpus_is_the_master_library")(result);
      if (problem) return problem;
      if (!result.output.includes("Master Library")) return "the refusal does not say the Master Library is not a substitute";
      return null;
    }
  );
});

// 4. The manifest generator cannot be run. Condition 7 is a claim about what a
//    regeneration produces, so a generator that will not load leaves it
//    unevaluable however good the corpus is.
const corpusForGeneratorTests = operationalShapedCorpus("operational");
await guarded("generator-unavailable", [FACTORY, ...ADJUDICATION_OUTPUTS], async () => {
  fs.writeFileSync(abs(FACTORY), "export const sourceDir = null;\n");
  control(
    "4. the manifest generator cannot be run",
    run(GENERATOR, [], { OFFICIAL_FORMS_SOURCE_DIR: corpusForGeneratorTests }),
    refusedBecause("manifest_generator_unavailable")
  );
});

// 5. A candidate the operational manifest still names is marked retired. Two of
//    the thirty carry markers, so putting one of their source files into the
//    corpus makes the record assert that the manifest names it and that it left
//    the inventory. The generator has to refuse the contradiction rather than
//    write it down.
const handoff = readJson("data/rcap-all50/manifest-only-retirement-handoff.json");
const markedCandidate = handoff.retirementCandidates.find((candidate) => {
  for (const familyId of candidate.formFamilyIds ?? []) {
    const slug = String(familyId).split(":").pop();
    for (const state of fs.readdirSync(abs("data/rcap-all50/overlays/production"))) {
      if (fs.existsSync(abs(path.join("data/rcap-all50/overlays/production", state, slug, "retirement.json")))) return true;
    }
  }
  return false;
});
if (!markedCandidate) {
  failures.push("5. a manifest-named asset is called retired: no candidate carries a retirement marker, so the control cannot be arranged");
} else {
  const contradictoryCorpus = operationalShapedCorpus("contradiction", [`LegalEase North Carolina/${markedCandidate.formNumber}`]);
  await guarded("contradiction", ADJUDICATION_OUTPUTS, async () => {
    control(
      `5. a manifest-named asset is called retired (${markedCandidate.jurisdiction} ${markedCandidate.formNumber})`,
      run(GENERATOR, [], { OFFICIAL_FORMS_SOURCE_DIR: contradictoryCorpus }),
      ({ refused, output }) => {
        if (!refused) return "the generator recorded an asset as both named by the operational manifest and retired";
        if (!output.includes("named by the operational manifest and marked retired")) {
          return `refused for the wrong reason:\n${output.trim().slice(0, 500)}`;
        }
        return null;
      }
    );
  });
}

// 6. The mounted answer is computed and ignored. This is the original defect in
//    its source form, and it is the one control that reads code rather than
//    running it -- a future edit can reintroduce exactly this shape without any
//    behavioural test noticing, because the behaviour it produces looks like a
//    successful run.
{
  const source = fs.readFileSync(abs(GENERATOR), "utf8");
  const resolves = /resolveOperationalCorpus\s*\(/.test(source);
  const gates = /corpus\.evaluable/.test(source) && /fail\(refusalReport\(corpus\)\)/.test(source);
  const walksWithoutGating = /const\s+mounted\s*=\s*fs\.existsSync\(/.test(source);
  control(
    "6. the mounted boolean is computed but ignored",
    { refused: resolves && gates && !walksWithoutGating, output: "" },
    ({ refused }) => refused
      ? null
      : `${GENERATOR} must resolve the operational corpus and refuse on it, not recompute a mounted flag it does not consult (resolves=${resolves}, gates=${gates}, recomputesMounted=${walksWithoutGating})`
  );
}

// 7. A retirement marker is written while the condition is unevaluable. Writing
//    is what removes an asset from the inventory, so it fails closed; checking
//    markers that already exist creates no retirement and stays allowed.
await guarded("marker-write", RETIREMENT_OUTPUTS, async () => {
  control(
    "7. retirement markers are written after an unevaluable condition",
    run(RETIRE, [], { OFFICIAL_FORMS_SOURCE_DIR: path.join(scratch, "does-not-exist") }),
    (result) => {
      const problem = refusedBecause("operational_corpus_absent")(result);
      if (problem) return problem;
      if (!result.output.includes("no retirement marker is written")) return "the refusal does not say that no marker was written";
      return null;
    }
  );
});

// 8. The twelve manifest-retained assets are converted silently. This is the
//    defect measured rather than described: run with no corpus, the old code
//    moved condition-7 passes from 18 to 30 and rewrote the record in place.
//    The control requires a refusal AND that the committed record still says 12.
await guarded("silent-conversion", ADJUDICATION_OUTPUTS, async () => {
  const before = fs.readFileSync(abs(ADJUDICATION), "utf8");
  const result = run(GENERATOR, [], { OFFICIAL_FORMS_SOURCE_DIR: path.join(scratch, "does-not-exist") });
  const after = fs.readFileSync(abs(ADJUDICATION), "utf8");
  control(
    "8. the 12 manifest-retained assets are silently converted to retirements",
    result,
    ({ refused }) => {
      if (!refused) return "the generator produced a record with no corpus to produce it from";
      if (after !== before) return "the committed adjudication was rewritten by a run that had no corpus to read";
      const totals = JSON.parse(after).totals;
      if (totals.conditionSevenFails !== 12) {
        return `the committed record now reports ${totals.conditionSevenFails} condition-7 failures; the twelve manifest-retained assets must stay retained`;
      }
      if (totals.conditionSevenPasses !== 18) {
        return `the committed record now reports ${totals.conditionSevenPasses} condition-7 passes, not 18`;
      }
      return null;
    }
  );
});

// 9. The five adjudicated assets keep their outcomes. This work fixes how the
//    seventh condition is evaluated; it is not licence to move an adjudication
//    that was accepted on its own evidence.
{
  const EXPECTED = {
    "KY|AOC-334|7eb2838037903de1769a0253d6ad9b092dd72f4aa363b323968c8c510fd55d3d": "retained_with_blocking_dependency",
    "KY|AOC-496.3|3225f34ea85bb9e4649e41257530d40e9565a4a7b95628148ee115edced47eaa": "retained_with_blocking_dependency",
    "KY|AOC-497|715c00db62e19f07f7dedde68e89309027f4ed9566198a3617cb9bb34a98368b": "retained_with_blocking_dependency",
    "WI|DJ-LE-247|ada016d389ef1f0b343432b187aec8c8c93bd7711c85d4ccce847f75572ae6f7": "retained_with_blocking_dependency",
    "WI|DJ-LE-250B|3c5d4806ff1061246ec06c93716cfa80ec3d61b9e21c5c79639114ab1e5454b6": "retained_with_blocking_dependency"
  };
  const record = readJson(REPOINT);
  const problems = [];
  if (record.totals.retirementsWritten !== 0) problems.push(`retirementsWritten is ${record.totals.retirementsWritten}, not 0`);
  if (record.totals.repointsRecorded !== 0) problems.push(`repointsRecorded is ${record.totals.repointsRecorded}, not 0`);
  for (const [assetId, expected] of Object.entries(EXPECTED)) {
    const row = record.assets.find((asset) => asset.assetId === assetId);
    if (!row) { problems.push(`${assetId} is missing from the adjudication`); continue; }
    if (row.outcome !== expected) problems.push(`${assetId} moved from ${expected} to ${row.outcome}`);
  }
  control(
    "9. the five assigned adjudication outcomes are unchanged",
    { refused: problems.length === 0, output: "" },
    ({ refused }) => (refused ? null : problems.join("; "))
  );
}

// Nothing above may have moved the committed record.
if (fs.readFileSync(abs(ADJUDICATION), "utf8") !== committedAdjudicationBefore) {
  failures.push("the committed retirement adjudication was modified while running these controls");
}

if (failures.length > 0) {
  console.error(`FAIL retirement corpus guard — ${failures.length} control(s) did not hold`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(
  `OK retirement corpus guard — 9 control(s) hold; the committed record still reports ` +
    `${committedTotals.conditionSevenFails} condition-7 failures and ${committedTotals.conditionSevenPasses} passes`
);
