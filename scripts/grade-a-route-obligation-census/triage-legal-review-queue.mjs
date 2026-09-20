#!/usr/bin/env node
// The 86 unresolved questions, split by who can actually answer them.
//
//   node scripts/grade-a-route-obligation-census/triage-legal-review-queue.mjs
//   node scripts/grade-a-route-obligation-census/triage-legal-review-queue.mjs --check
//
// WHY THIS EXISTS
//
// "86 legal questions" is a queue nobody can start on. Some of them are genuine
// legal decisions and only counsel can answer them. Some are asking which
// document a route means, which is identity work against the corpus. Some are
// asking which committed decision authorises a runtime pathway, which is a
// mapping reconciliation the captain owns. And some already have an answer
// sitting in a committed decision record that the census did not consult.
//
// Sending all 86 to counsel wastes the scarcest reviewer in the build and
// delays the ones that actually need them. So each is routed, and the rule that
// routed it is recorded beside it, so a reviewer can disagree with the routing
// rather than having to re-derive it.
//
// The routing is conservative in one direction on purpose: a question that
// could be legal goes to counsel. Only an explicit, checkable signal moves it
// off that path.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(rootDir);
const CHECK = process.argv.includes("--check");

const QUEUE = "data/rcap-grade-a/route-obligation-census-candidate/unresolved-legal-review-queue.json";
const CANDIDATE = "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json";
// Decisions live in two places and only scanning one of them undercounts.
// LD-SC-01, LD-CT-02, LD-DE-01 and LD-KY-02 are all real, recorded decisions —
// they sit in the ledger's adjudication registries rather than in the
// legal-decisions directory, and a triage that missed them would have sent
// answered questions to counsel.
const DECISION_SOURCES = [
  { kind: "directory", path: "data/record-clearing/legal-decisions" },
  { kind: "file", path: "data/rcap-ledger/route-kind-adjudications.json" },
  { kind: "file", path: "data/rcap-ledger/pathway-bridge-adjudication.json" },
  { kind: "file", path: "data/rcap-ledger/sellable-pathway-reclassifications.json" },
  { kind: "file", path: "data/rcap-ledger/sellable-pathway-closure.json" }
];
const OUT = "data/rcap-grade-a/route-obligation-census-v1/legal-review-triage.json";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const queue = readJson(QUEUE);
const candidate = readJson(CANDIDATE);
const routeByKey = new Map(candidate.routes.map((r) => [r.routeKey, r]));

/** Every decision id any committed decision record actually defines. */
function committedDecisionIds() {
  const ids = new Set();
  const harvest = (value) => {
    if (typeof value === "string") return;
    if (Array.isArray(value)) { for (const v of value) harvest(v); return; }
    if (!value || typeof value !== "object") return;
    for (const [key, v] of Object.entries(value)) {
      if (/^(decisionId|id|recordId|questionId|ratificationId)$/.test(key) && typeof v === "string") ids.add(v);
      harvest(v);
    }
  };
  for (const source of DECISION_SOURCES) {
    if (source.kind === "directory") {
      if (!fs.existsSync(path.join(rootDir, source.path))) continue;
      for (const name of fs.readdirSync(path.join(rootDir, source.path))) {
        if (name.endsWith(".json")) harvest(readJson(`${source.path}/${name}`));
      }
      continue;
    }
    if (fs.existsSync(path.join(rootDir, source.path))) harvest(readJson(source.path));
  }
  return ids;
}
const DECIDED = committedDecisionIds();

// A question asking which DOCUMENT a route means is identity work, not law.
const ASKS_WHICH_DOCUMENT = /\bwhich exact (form|source|motion|instrument|application|packet)\b|\bwhat (form|source) governs\b|\bwhich (form|official form|source)\b/i;
// A question asking which committed decision authorises a runtime representation
// is a mapping reconciliation: the answer is in this repository, not in a statute.
const ASKS_WHICH_DECISION_AUTHORISES = /which current legal-design decision|which committed decision|what authoriz|authorizes runtime|runtime-only pathway|crosswalk|registry gap|is not represented in compiled runtime/i;
// The substance of a legal decision: who may act, whether relief is automatic,
// what the statute requires.
const IS_LEGAL_SUBSTANCE = /participant|self-help|automatic|petition|court-initiated|eligib|statut|require|relief|cohort|discretionar|waiv|appeal/i;

const BUCKETS = ["ALREADY_ANSWERED", "SOURCE_IDENTITY_QUESTION", "CAPTAIN_MAPPING_CORRECTION", "TRUE_COUNSEL_DECISION"];

const rows = queue.routes.map((question) => {
  const route = routeByKey.get(question.routeKey) ?? null;
  const decisionIds = route?.legalDecisionRecordIds ?? [];
  const answeredBy = decisionIds.filter((id) => DECIDED.has(id));
  const text = String(question.legalReviewQuestion ?? "");

  let bucket;
  let rule;
  if (answeredBy.length > 0) {
    bucket = "ALREADY_ANSWERED";
    rule = `the route names a decision this repository defines: ${answeredBy.join(", ")}`;
  } else if (ASKS_WHICH_DECISION_AUTHORISES.test(text)) {
    bucket = "CAPTAIN_MAPPING_CORRECTION";
    rule = "the question asks which committed decision authorises a runtime representation; the answer lives in this repository's own registries, not in a statute";
  } else if (ASKS_WHICH_DOCUMENT.test(text) && !IS_LEGAL_SUBSTANCE.test(text.replace(ASKS_WHICH_DOCUMENT, ""))) {
    bucket = "SOURCE_IDENTITY_QUESTION";
    rule = "the question asks which document a route means, which is resolved against the source corpus";
  } else if (ASKS_WHICH_DOCUMENT.test(text)) {
    bucket = "TRUE_COUNSEL_DECISION";
    rule = "the question names a document but turns on who may act or what the statute requires, so the document is downstream of a legal answer";
  } else {
    bucket = "TRUE_COUNSEL_DECISION";
    rule = "no explicit signal moves this off the legal path, and the default is counsel";
  }

  return {
    routeKey: question.routeKey,
    jurisdiction: question.jurisdiction,
    publicLabel: question.publicLabel,
    question: question.legalReviewQuestion,
    confidence: question.classificationConfidence,
    bucket,
    routedBy: rule,
    namedDecisionRecordIds: decisionIds,
    decisionRecordsThisRepositoryDefines: answeredBy,
    decisionRecordsNotFound: decisionIds.filter((id) => !DECIDED.has(id)),
    decisionRecordsNotFound: decisionIds.filter((id) => !DECIDED.has(id)),
    // An "already answered" row still needs a human to confirm the decision
    // answers THIS question rather than merely mentioning the route.
    needsConfirmation: bucket === "ALREADY_ANSWERED"
  };
});
rows.sort((a, b) => `${a.bucket}|${a.jurisdiction}|${a.routeKey}`.localeCompare(`${b.bucket}|${b.jurisdiction}|${b.routeKey}`));

const counts = Object.fromEntries(BUCKETS.map((b) => [b, rows.filter((r) => r.bucket === b).length]));
const doc = {
  schemaVersion: "rcap-census-v1-legal-review-triage/v1",
  generatedBy: "scripts/grade-a-route-obligation-census/triage-legal-review-queue.mjs",
  question: "Of the 86 unresolved questions, which actually need counsel?",
  routingIsConservative:
    "A question that could be legal goes to counsel. Only an explicit, checkable signal — a committed decision record that names the route, or a question about which document or which registry entry — moves it off that path.",
  everyRoutingIsAuditable:
    "Each row records the rule that routed it, so a reviewer can disagree with the routing without re-deriving it.",
  buckets: {
    ALREADY_ANSWERED: "A committed decision record already covers this route. Confirm it answers THIS question, then close.",
    SOURCE_IDENTITY_QUESTION: "Asks which document a route means. Resolved against the source corpus, not by counsel.",
    CAPTAIN_MAPPING_CORRECTION: "Asks which committed decision authorises a runtime representation. The answer is in this repository's registries; the captain owns it.",
    TRUE_COUNSEL_DECISION: "Turns on who may act, whether relief is automatic, or what the statute requires. Only counsel can answer."
  },
  total: rows.length,
  counts,
  countsByJurisdiction: rows.reduce((acc, r) => {
    acc[r.jurisdiction] = acc[r.jurisdiction] ?? {};
    acc[r.jurisdiction][r.bucket] = (acc[r.jurisdiction][r.bucket] ?? 0) + 1;
    return acc;
  }, {}),
  rows
};

const serialized = `${JSON.stringify(doc, null, 2)}\n`;
const outPath = path.join(rootDir, OUT);
if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "";
  if (current !== serialized) { console.error(`${OUT} is stale.`); process.exit(1); }
  console.log(`legal-review triage current: ${rows.length} question(s).`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, serialized);
console.log(`Wrote ${OUT}\n`);
for (const b of BUCKETS) console.log(`  ${String(counts[b]).padStart(3)}  ${b}`);
console.log(`\n  ${counts.TRUE_COUNSEL_DECISION} of ${rows.length} actually need counsel.`);
