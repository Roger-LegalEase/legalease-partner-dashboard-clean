// E2 evidence intake check — what a lane returned, before E3 adjudicates it.
//
// The eight E2 lanes gather evidence; E3 turns that evidence into crosswalk
// decisions. Between those two steps is the question this script answers: is
// what came back actually usable as evidence?
//
// It checks the things a lane could get wrong without noticing, and that E3
// would otherwise have to assume:
//
//   1. Coverage. Every job assigned to a lane appears exactly once in that
//      lane's file, with no jobs from another lane's scope. A silently dropped
//      job is indistinguishable from a closed one once the files are merged.
//   2. Every finding carries at least one evidence entry. An outcome with no
//      evidence is an opinion.
//   3. Sources resolve. A repository path that does not exist cannot support a
//      claim, and an http source recorded by a lane that had no web access is a
//      citation from memory — the one thing the lane contract forbids outright.
//   4. Quote fidelity, reported rather than enforced. A `quote` is supposed to
//      be the text that carries the claim. Where it is instead a paraphrase or
//      a conclusion, the finding may still be right, but the quote cannot be
//      mechanically trusted and E3 has to re-read the source. That rate is
//      published here so nobody has to discover it by hand.
//
// Failures 1-3 are hard. Item 4 is a measurement: it prints, and it does not
// fail the build, because a low verbatim rate is a reason to read carefully
// rather than proof that anything is wrong.
//
// Runs against whatever evidence files exist in the tree and skips cleanly when
// none do, so it is safe in the test chain while lanes are still landing.
//
// Usage:
//   node scripts/verify-rcap-e2-evidence-intake.mjs
//   node scripts/verify-rcap-e2-evidence-intake.mjs --strict   (require all 8)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assignmentPath = path.join(rootDir, "data/rcap-ledger/e2-dispatch-assignment.json");
const evidenceDir = path.join(rootDir, "data/rcap-ledger/e2-evidence");
const strict = process.argv.includes("--strict");

const failures = [];

if (!fs.existsSync(assignmentPath)) {
  console.error("No dispatch assignment. Run: npm run rcap:e2-dispatch-assignment");
  process.exit(1);
}

const assignment = JSON.parse(fs.readFileSync(assignmentPath, "utf8"));

if (!fs.existsSync(evidenceDir)) {
  if (strict) {
    console.error("--strict: no evidence directory; expected all 8 lanes to have landed.");
    process.exit(1);
  }
  console.log("E2 evidence intake: no lane evidence in this tree yet. Nothing to check.");
  process.exit(0);
}

// Normalised containment: citation formatting varies between a registry record
// and a compiled profile (§ vs 'sec', spacing, punctuation), and none of that
// variation is meaningful here.
const normalize = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[§\s.,()[\]–—-]/g, "");

const fileCache = new Map();
function normalizedFile(relPath) {
  if (!fileCache.has(relPath)) {
    fileCache.set(relPath, normalize(fs.readFileSync(path.join(rootDir, relPath), "utf8")));
  }
  return fileCache.get(relPath);
}

// A source may carry a trailing parenthetical note; the path is the first token.
const sourcePath = (source) => String(source ?? "").split(/[\s(]/)[0].replace(/[,;]$/, "");

const landed = [];
let quotesChecked = 0;
let quotesVerbatim = 0;
const outcomeTotals = {};

for (const lane of assignment.lanes) {
  const file = path.join(rootDir, lane.evidencePath);
  if (!fs.existsSync(file)) {
    if (strict) failures.push(`${lane.laneId}: --strict but ${lane.evidencePath} has not landed`);
    continue;
  }
  landed.push(lane.laneId);

  let document;
  try {
    document = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    failures.push(`${lane.laneId}: evidence file is not valid JSON (${error.message})`);
    continue;
  }

  const findings = Array.isArray(document.findings) ? document.findings : [];
  const seen = new Set();
  const assigned = new Set(lane.jobIds);

  // 1. Coverage and exclusivity.
  for (const finding of findings) {
    if (seen.has(finding.jobId)) failures.push(`${lane.laneId}: ${finding.jobId} appears more than once`);
    seen.add(finding.jobId);
    if (!assigned.has(finding.jobId)) {
      failures.push(`${lane.laneId}: ${finding.jobId} is not in this lane's scope`);
    }
    outcomeTotals[finding.outcome] = (outcomeTotals[finding.outcome] ?? 0) + 1;

    // 2. Evidence present.
    const evidence = Array.isArray(finding.evidence) ? finding.evidence : [];
    if (evidence.length === 0) {
      failures.push(`${lane.laneId}: ${finding.jobId} records an outcome with no evidence`);
      continue;
    }

    for (const item of evidence) {
      const source = String(item.source ?? "");

      // 3. Sources resolve, and a lane without web access never cites the web.
      if (/^https?:/i.test(source)) {
        if (document.webAccessAvailable === false) {
          failures.push(
            `${lane.laneId}: ${finding.jobId} cites ${source} but the lane recorded webAccessAvailable: false — that citation cannot have been fetched`
          );
        }
        continue;
      }

      const rel = sourcePath(source);
      if (!rel) {
        failures.push(`${lane.laneId}: ${finding.jobId} has an evidence entry with no source`);
        continue;
      }
      const abs = path.join(rootDir, rel);
      if (!fs.existsSync(abs)) {
        failures.push(`${lane.laneId}: ${finding.jobId} cites ${rel}, which does not exist`);
        continue;
      }
      if (fs.statSync(abs).isDirectory()) continue;

      // 4. Quote fidelity — measured, not enforced.
      if (item.quote) {
        quotesChecked += 1;
        if (normalizedFile(rel).includes(normalize(item.quote))) quotesVerbatim += 1;
      }
    }
  }

  const missing = lane.jobIds.filter((id) => !seen.has(id));
  if (missing.length > 0) {
    failures.push(
      `${lane.laneId}: ${missing.length} assigned job(s) missing from the evidence file, first: ${missing[0]}`
    );
  }
}

if (landed.length === 0) {
  console.log("E2 evidence intake: no lane evidence in this tree yet. Nothing to check.");
  process.exit(0);
}

if (failures.length > 0) {
  console.error("verify-rcap-e2-evidence-intake FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

const verbatimRate = quotesChecked > 0 ? (100 * quotesVerbatim) / quotesChecked : 100;

console.log(`verify-rcap-e2-evidence-intake passed. Lanes landed: ${landed.length}/${assignment.lanes.length} (${landed.join(", ")})`);
console.log(`  every assigned job present exactly once, every finding carries evidence, every source resolves`);
for (const [outcome, count] of Object.entries(outcomeTotals).sort()) {
  console.log(`  ${outcome.padEnd(12)} ${count}`);
}
console.log(`  quote verbatim in cited source: ${quotesVerbatim}/${quotesChecked} (${verbatimRate.toFixed(1)}%)`);
if (verbatimRate < 90) {
  console.log(
    `  NOTE for E3: ${(100 - verbatimRate).toFixed(1)}% of quotes are a paraphrase or a conclusion rather than\n` +
      `  source text. Those findings are not thereby wrong, but their quote cannot be taken as\n` +
      `  the evidence — re-read the cited source before adjudicating them.`
  );
}
