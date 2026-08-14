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
import { execFileSync } from "node:child_process";
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
// It may also be pinned to a commit as `path@<ref>`, which is the stronger form:
// it names the bytes that were actually read, and stays true when the working
// tree moves on. Those are resolved against the ref rather than the tree.
const sourcePath = (source) => String(source ?? "").split(/[\s(]/)[0].replace(/[,;]$/, "");

function resolvesAtRef(relPath, ref) {
  try {
    execFileSync("git", ["cat-file", "-e", `${ref}:${relPath}`], { cwd: rootDir, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Evidence lives at the finding level for most groups. E2-C adjudicates a
// jurisdiction's surplus one pathway at a time, so its evidence hangs off each
// surplus pathway instead. Both shapes are the contract; flatten and check the
// same way.
function evidenceOf(finding) {
  const direct = Array.isArray(finding.evidence) ? finding.evidence : [];
  const nested = Array.isArray(finding.surplusPathways)
    ? finding.surplusPathways.flatMap((p) => (Array.isArray(p.evidence) ? p.evidence : []))
    : [];
  return [...direct, ...nested];
}

// The eight dispatched lanes come from the frozen assignment. E-SPECIAL is a
// ninth evidence package, authored during final E3 for the six subjects no lane
// owned. It is not in the assignment, so enumerating only assignment.lanes would
// leave its citations out of the denominator entirely — the corpus is 935
// citations, not the 912 the lanes alone contribute. It has no frozen jobId
// list, so scope is taken from its own findings; every other check applies.
const EXTRA_PACKAGES = [
  { laneId: "E-SPECIAL", evidencePath: "data/rcap-ledger/e2-evidence/E-SPECIAL.json", jobIds: null }
];

const packages = (() => {
  const named = new Set(assignment.lanes.map((l) => l.laneId));
  return [...assignment.lanes, ...EXTRA_PACKAGES.filter((p) => !named.has(p.laneId))];
})();

/** Reads a `path@<ref>` pin at its ref, so pinned quotes are measured, not skipped. */
function normalizedBlobAtRef(relPath, ref) {
  const key = `${relPath}@${ref}`;
  if (!fileCache.has(key)) {
    try {
      const raw = execFileSync("git", ["show", `${ref}:${relPath}`], {
        cwd: rootDir,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024
      });
      fileCache.set(key, normalize(raw));
    } catch {
      fileCache.set(key, null);
    }
  }
  return fileCache.get(key);
}

const landed = [];
let quotesChecked = 0;
let quotesVerbatim = 0;
let pinnedSources = 0;
const outcomeTotals = {};

for (const lane of packages) {
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
  // A package with no frozen jobId list (E-SPECIAL) defines its own scope; there
  // is no assignment to contradict, so only duplication is checkable.
  const assigned = Array.isArray(lane.jobIds) ? new Set(lane.jobIds) : null;

  // 1. Coverage and exclusivity.
  for (const finding of findings) {
    if (seen.has(finding.jobId)) failures.push(`${lane.laneId}: ${finding.jobId} appears more than once`);
    seen.add(finding.jobId);
    if (assigned && !assigned.has(finding.jobId)) {
      failures.push(`${lane.laneId}: ${finding.jobId} is not in this lane's scope`);
    }
    outcomeTotals[finding.outcome] = (outcomeTotals[finding.outcome] ?? 0) + 1;

    // 2. Evidence present.
    const evidence = evidenceOf(finding);
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

      const token = sourcePath(source);
      if (!token) {
        failures.push(`${lane.laneId}: ${finding.jobId} has an evidence entry with no source`);
        continue;
      }

      // `path@<ref>` pins the bytes that were read. Resolve it there, and
      // measure its quote against the pinned blob — skipping these would drop
      // them from the denominator, which is exactly how the corpus was
      // previously undercounted.
      const pinned = /^(.+?)@([0-9a-f]{7,40})$/.exec(token);
      if (pinned) {
        const [, pinnedPath, ref] = pinned;
        const blob = normalizedBlobAtRef(pinnedPath, ref);
        if (blob === null) {
          failures.push(
            `${lane.laneId}: ${finding.jobId} cites ${pinnedPath} at ${ref.slice(0, 10)}, which does not resolve there`
          );
          continue;
        }
        pinnedSources += 1;
        if (item.quote) {
          quotesChecked += 1;
          if (blob.includes(normalize(item.quote))) quotesVerbatim += 1;
        }
        continue;
      }

      const rel = token;
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

  const missing = Array.isArray(lane.jobIds) ? lane.jobIds.filter((id) => !seen.has(id)) : [];
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

// The source-support audit walks the same corpus with a far more careful
// classifier (smallest supporting span, citation-core verification). Two
// independent counts of one corpus are only useful if they are reconciled, so
// the denominators are compared and a disagreement is a hard failure: it means
// one of the two is not seeing the whole corpus, which is the exact defect that
// produced the 903 undercount.
const AUDIT_JSON = path.join(rootDir, "data/rcap-crosswalk-enrichment/e2-source-support-audit.json");
let auditNote = null;
if (fs.existsSync(AUDIT_JSON)) {
  const audit = JSON.parse(fs.readFileSync(AUDIT_JSON, "utf8"));
  const auditRows = Array.isArray(audit.rows) ? audit.rows.length : 0;
  if (auditRows !== quotesChecked) {
    console.error("verify-rcap-e2-evidence-intake FAILED");
    console.error(
      ` - denominator disagreement: intake counted ${quotesChecked} citations, the source-support audit counted ${auditRows}.\n` +
        `   One of them is not seeing the whole corpus. Reconcile before trusting either rate.`
    );
    process.exit(1);
  }
  auditNote = audit.aggregates?.totals?.nonVerbatimRate ?? null;
}

const verbatimRate = quotesChecked > 0 ? (100 * quotesVerbatim) / quotesChecked : 100;

console.log(`verify-rcap-e2-evidence-intake passed. Packages landed: ${landed.length}/${packages.length} (${landed.join(", ")})`);
console.log(`  every assigned job present exactly once, every finding carries evidence, every source resolves`);
for (const [outcome, count] of Object.entries(outcomeTotals).sort()) {
  console.log(`  ${outcome.padEnd(12)} ${count}`);
}
console.log(`  citations in corpus: ${quotesChecked} (pinned to a commit and read there: ${pinnedSources})`);
console.log(`  quote verbatim by substring test: ${quotesVerbatim}/${quotesChecked} (${verbatimRate.toFixed(1)}%)`);
if (auditNote !== null) {
  console.log(`  authoritative non-verbatim rate (source-support audit): ${auditNote}%`);
  console.log(
    `  The audit's classifier is the one to quote. This substring rate is a coarse cross-check\n` +
      `  on the same ${quotesChecked} citations, not a second opinion worth citing.`
  );
}
console.log(
  `  A non-verbatim quote is a REREAD PRIORITY, not a mapping failure: the finding may be\n` +
    `  correct, but its quote cannot carry its own proof, so the cited source must be reread\n` +
    `  before the row is adjudicated.`
);
