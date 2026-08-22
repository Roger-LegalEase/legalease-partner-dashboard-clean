#!/usr/bin/env node
// Proves the four approved-release checks are load-bearing.
//
//   node scripts/verify-rcap-approved-release-checks.mjs
//
// The retirement, field-classification, flat-overlay and artifact-disposition
// checks were rewritten from "re-derive it and compare the bytes" to "read the
// approved release and validate what it asserts". That is the right contract --
// re-derivation reported an approved release as stale whenever the deriving
// code improved, and repaired it by overwriting pinned bytes -- but a read-only
// check is exactly the kind that can quietly stop checking.
//
// So each one is mutated and must go red, and the tree is restored afterwards
// through the shared journal guard.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { withTrackedMutation } from "./lib/tracked-mutation-guard.mjs";
import { corpusFingerprint, sameCorpus } from "./rcap-official-forms/operational-corpus-precondition.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const abs = (repoPath) => path.join(rootDir, repoPath);
const readJson = (repoPath) => JSON.parse(fs.readFileSync(abs(repoPath), "utf8"));

const RETIRE = "scripts/retire-rcap-problematic-pdf-assets.mjs";
const CLASSIFY = "scripts/generate-rcap-field-classification.mjs";
const RENDER = "scripts/render-rcap-flat-overlay-families.mjs";
const DISPOSE = "scripts/generate-rcap-artifact-dispositions.mjs";

const MARKER = "data/rcap-all50/overlays/production/alabama/c-94a-source-gated-en/retirement.json";
const AK = "data/rcap-all50/overlays/production/alaska/requesttosealcriminfo";
const WI = "data/rcap-all50/overlays/production/wisconsin/cr-266-form-en";
const DISPOSITIONS = "data/rcap-all50/artifact-dispositions.json";
const COVERAGE = "data/rcap-all50/field-classification-coverage.json";
const RENDER_REPORT = "data/rcap-all50/flat-overlay-render-report.json";

/** Runs a check and reports whether it refused. Never throws on a non-zero exit. */
function checkFails(script, args = ["--check"]) {
  try {
    execFileSync("node", [abs(script), ...args], { cwd: rootDir, stdio: "pipe" });
    return false;
  } catch {
    return true;
  }
}

let failures = 0;
const CASES = [];

/** A mutation that must turn one named check red, with the tree restored after. */
const mutate = (name, script, targets, apply) => CASES.push({ name, script, targets, apply });

// ---- corpus identity is contents, not a mount path -------------------------
//
// These two are not file mutations: they compare fingerprints directly, which
// is the whole claim. An equivalent corpus reached by another path is the same
// corpus; a partial one is not.
function corpusIdentityControls() {
  const corpus = abs("private/Nationwide Record Clearing");
  if (!fs.existsSync(corpus)) {
    console.log("skip    corpus identity controls — the operational corpus is not mounted in this environment");
    return;
  }
  const here = corpusFingerprint(corpus);
  const elsewhere = fs.mkdtempSync(path.join(rootDir, "tmp-corpus-control-"));
  try {
    // Same contents, different absolute path.
    fs.cpSync(corpus, path.join(elsewhere, "mounted-somewhere-else"), { recursive: true });
    const moved = corpusFingerprint(path.join(elsewhere, "mounted-somewhere-else"));
    if (sameCorpus(here, moved)) {
      console.log("OK      an equivalent corpus under another path is the same corpus");
    } else {
      console.error("FAIL    an equivalent corpus under another path was not recognised as the same corpus");
      failures += 1;
    }
    // One member removed.
    const partial = path.join(elsewhere, "partial");
    fs.cpSync(corpus, partial, { recursive: true });
    const victim = (function firstFile(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { const found = firstFile(full); if (found) return found; }
        else return full;
      }
      return null;
    })(partial);
    fs.rmSync(victim);
    if (!sameCorpus(here, corpusFingerprint(partial))) {
      console.log("OK      a partial corpus is not the same corpus");
    } else {
      console.error("FAIL    a partial corpus was accepted as the same corpus");
      failures += 1;
    }
  } finally {
    fs.rmSync(elsewhere, { recursive: true, force: true });
  }
}

// ---- retirement ------------------------------------------------------------
mutate("a retirement marker's asset identity drifts from the determination", RETIRE, [MARKER], () => {
  const marker = readJson(MARKER);
  marker.assetId = `${marker.assetId}-rewritten`;
  fs.writeFileSync(abs(MARKER), `${JSON.stringify(marker, null, 2)}\n`);
});
mutate("a retired marker claims a surviving use site", RETIRE, [MARKER], () => {
  const marker = readJson(MARKER);
  marker.useSitesFound = 1;
  fs.writeFileSync(abs(MARKER), `${JSON.stringify(marker, null, 2)}\n`);
});
mutate("a retirement marker explains nothing", RETIRE, [MARKER], () => {
  const marker = readJson(MARKER);
  marker.basis = "";
  fs.writeFileSync(abs(MARKER), `${JSON.stringify(marker, null, 2)}\n`);
});

// ---- field classification --------------------------------------------------
mutate("an approved classification's digest stops matching its approval", CLASSIFY, [`${AK}/field-classification.json`], () => {
  const file = `${AK}/field-classification.json`;
  const committed = readJson(file);
  committed.entries[0].label = `${committed.entries[0].label} (edited)`;
  fs.writeFileSync(abs(file), `${JSON.stringify(committed, null, 2)}\n`);
});
mutate("a filing family loses its classification entirely", CLASSIFY, [`${WI}/field-classification.json`], () => {
  fs.rmSync(abs(`${WI}/field-classification.json`));
});
mutate("one label is classified twice", CLASSIFY, [`${WI}/field-classification.json`], () => {
  const file = `${WI}/field-classification.json`;
  const committed = readJson(file);
  committed.entries.push({ ...committed.entries[0] });
  committed.classifiedFieldsOrAnchors = committed.entries.length;
  committed.discoveredFieldsOrAnchors = committed.entries.length;
  fs.writeFileSync(abs(file), `${JSON.stringify(committed, null, 2)}\n`);
});

// ---- flat overlay ----------------------------------------------------------
mutate("an approved artifact's bytes change under its approval", RENDER, [`${WI}/fixtures/canonical-filled.pdf`], () => {
  const file = `${WI}/fixtures/canonical-filled.pdf`;
  fs.writeFileSync(abs(file), Buffer.concat([fs.readFileSync(abs(file)), Buffer.from("\n% mutated\n")]));
});
mutate("a required approved artifact is removed", RENDER, [`${WI}/fixtures/boundary-filled.pdf`], () => {
  fs.rmSync(abs(`${WI}/fixtures/boundary-filled.pdf`));
});
mutate("a measured family disappears from the render report", RENDER, [RENDER_REPORT], () => {
  const report = readJson(RENDER_REPORT);
  report.families = report.families.slice(1);
  fs.writeFileSync(abs(RENDER_REPORT), `${JSON.stringify(report, null, 2)}\n`);
});

// ---- artifact dispositions -------------------------------------------------
mutate("a filing artifact is disposed while unfinalized", DISPOSE, [DISPOSITIONS], () => {
  const ledger = readJson(DISPOSITIONS);
  ledger.rows.find((row) => row.disposition === "filing_artifact").finalized = false;
  fs.writeFileSync(abs(DISPOSITIONS), `${JSON.stringify(ledger, null, 2)}\n`);
});
mutate("a court-declared informational component is recorded as filled", DISPOSE, [DISPOSITIONS], () => {
  const ledger = readJson(DISPOSITIONS);
  const row = ledger.rows.find((r) => r.disposition === "informational_companion");
  row.finalized = true;
  row.recordedFailures = [];
  fs.writeFileSync(abs(DISPOSITIONS), `${JSON.stringify(ledger, null, 2)}\n`);
});
mutate("the disposition totals stop summarising the rows", DISPOSE, [DISPOSITIONS], () => {
  const ledger = readJson(DISPOSITIONS);
  ledger.totals.filingArtifacts = Number(ledger.totals.filingArtifacts) + 1;
  fs.writeFileSync(abs(DISPOSITIONS), `${JSON.stringify(ledger, null, 2)}\n`);
});

// ---- the check may never render --------------------------------------------
//
// A read-only check that quietly regains the ability to render would pass every
// mutation above and still rewrite an approved artifact. The proof is that the
// approved bytes are untouched after --check runs.
function renderCheckWritesNothing() {
  const watched = [
    `${WI}/fixtures/canonical-filled.pdf`,
    `${WI}/fixtures/boundary-filled.pdf`,
    `${WI}/contact-sheet/blank-vs-filled.pdf`,
    `${AK}/fixtures/canonical-filled.pdf`
  ].filter((file) => fs.existsSync(abs(file)));
  const before = watched.map((file) => crypto.createHash("sha256").update(fs.readFileSync(abs(file))).digest("hex"));
  execFileSync("node", [abs(RENDER), "--check"], { cwd: rootDir, stdio: "pipe" });
  const after = watched.map((file) => crypto.createHash("sha256").update(fs.readFileSync(abs(file))).digest("hex"));
  const moved = watched.filter((_, i) => before[i] !== after[i]);
  if (moved.length === 0) {
    console.log(`OK      --check rendered nothing; ${watched.length} approved artifact(s) byte-identical afterwards`);
  } else {
    console.error(`FAIL    --check rewrote ${moved.length} approved artifact(s): ${moved.join(", ")}`);
    failures += 1;
  }
}

corpusIdentityControls();

for (const testCase of CASES) {
  const wentRed = await withTrackedMutation(`approved-release-checks: ${testCase.name}`, testCase.targets, async () => {
    testCase.apply();
    return checkFails(testCase.script);
  });
  if (wentRed) {
    console.log(`OK      ${testCase.name}`);
  } else {
    console.error(`FAIL    ${testCase.name} did not turn ${path.basename(testCase.script)} red`);
    failures += 1;
  }
}

renderCheckWritesNothing();

// The tree has to be exactly as it was, and re-running every check green is
// what proves the guard restored it.
for (const script of [RETIRE, CLASSIFY, RENDER, DISPOSE]) {
  if (checkFails(script)) {
    console.error(`FAIL    ${path.basename(script)} is red after the mutation pass; the tree did not come back clean`);
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`FAIL approved-release checks — ${failures} control(s) did not hold`);
  process.exit(1);
}
console.log(`OK approved-release checks — ${CASES.length} mutation(s) turn their own check red, corpus identity is contents not path, and --check renders nothing`);
