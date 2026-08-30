#!/usr/bin/env node
// The 55 medium-confidence Category B rows, exported as their own assignment.
//
//   node scripts/grade-a-route-obligation-census/export-category-b-medium-confidence-revalidation.mjs
//   node ... --check       verify both outputs are byte-identical to what is committed
//   node ... --mutations   prove the check can fail
//
// WHY THIS EXISTS
//
// These 55 rows are Category B exclusions the census itself flagged as only
// medium confidence: it excluded them, and said it was not sure. That is a
// revalidation assignment, and it was previously handed over by pointing at a
// 694-row ledger and describing a filter. This exports the exact rows.
//
// TWO WRONG SOURCES, NAMED SO THEY ARE NOT REACHED FOR AGAIN
//
//   - unresolved-legal-review-queue.json is the SEPARATE 86-question queue. It
//     is a different assignment with a different population, and mixing it in
//     would put questions in front of a reviewer who was asked about
//     exclusions.
//   - The fields are `possibleCategory` and `classificationConfidence`. There
//     is no `category`, `confidence` or `reason` field on these rows; a filter
//     naming them matches nothing and exports an empty set that looks like a
//     clean answer.
//
// This packages rows. It makes no legal determination, opens and closes no
// route, and changes no commercial state.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json";
const JSON_OUT = "data/rcap-grade-a/route-obligation-census-candidate/category-b-medium-confidence-revalidation.json";
const MD_OUT = "docs/rcap/grade-a/route-obligation-census/CATEGORY_B_MEDIUM_CONFIDENCE_REVALIDATION.md";

const CHECK = process.argv.includes("--check");
const MUTATIONS = process.argv.includes("--mutations");

const FILTER = { possibleCategory: "B_LEGITIMATE_EXCLUSION", classificationConfidence: "medium" };
const EXPECTED_COUNT = 55;

/** Every field carried through, in a fixed order so the export is stable. */
const CARRIED_FIELDS = [
  "routeKey", "jurisdiction", "publicLabel", "statuteOrAuthority", "trackId",
  "runtimePathwayId", "routeContractId", "processActor", "participantCanInitiate",
  "participantFacingInstrument", "destination", "currentOutputStrategy",
  "packetFamilyId", "packetSetId", "requiredSourceIds", "existingArtifactIds",
  "currentServiceDisposition", "currentCommercialState", "legalDecisionRecordIds",
  "currentImplementationEvidence", "missingImplementationWork", "possibleCategory",
  "possibleCategoryBReason", "classificationConfidence", "requiresLegalReview",
  "legalReviewQuestion"
];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();

function build(sourceText, pinned = null) {
  const source = JSON.parse(sourceText);
  const rows = (source.routes ?? [])
    .filter((row) => row.possibleCategory === FILTER.possibleCategory
      && row.classificationConfidence === FILTER.classificationConfidence)
    // Stable ordering: jurisdiction, then routeKey. A stable order is what
    // makes --check meaningful; an unordered export drifts on every run and the
    // fixed-point check degrades into noise.
    .sort((a, b) => a.jurisdiction.localeCompare(b.jurisdiction) || a.routeKey.localeCompare(b.routeKey))
    .map((row) => {
      const carried = {};
      for (const field of CARRIED_FIELDS) carried[field] = row[field] ?? null;
      return {
        ...carried,
        // The aliases the receiving assignment expects, alongside the source
        // names rather than instead of them. Renaming a field in transit is how
        // a reader ends up unable to find the row in the ledger it came from.
        currentReason: row.possibleCategoryBReason ?? null,
        currentConfidence: row.classificationConfidence ?? null
      };
    });

  return {
    schemaVersion: "category-b-medium-confidence-revalidation/v1",
    generatedBy: "scripts/grade-a-route-obligation-census/export-category-b-medium-confidence-revalidation.mjs",
    whatThisIs:
      "The exact Category B exclusions the census flagged at medium confidence — it excluded them and said it was not sure. Handed over as rows rather than as a filter over a 694-row ledger.",
    whatThisIsNot:
      "Not the 86-question unresolved-legal-review queue, which is a separate assignment with a different population. No row here comes from it, and no synthetic QUESTION-n key is used: every row is keyed by its own routeKey.",
    generatedFrom: {
      repository: "Roger-LegalEase/legalease-partner-dashboard-clean",
      captainBranch: "claude/legalease-sprint-captain-utucnw",
      captainHead: pinned ? pinned.captainHead : git(["rev-parse", "HEAD"]),
      sourcePath: SOURCE,
      sourceGitBlobSha: pinned ? pinned.sourceGitBlobSha : git(["hash-object", SOURCE]),
      sourceSha256: crypto.createHash("sha256").update(sourceText).digest("hex")
    },
    filter: FILTER,
    filterNote:
      "The fields are possibleCategory and classificationConfidence. These rows carry no `category`, `confidence` or `reason` field; a filter naming those matches nothing and yields an empty export that reads like a clean answer.",
    count: rows.length,
    grantsNothing: [
      "It makes no legal determination.",
      "It opens no route and closes none.",
      "It changes no commercial state.",
      "It does not alter the source ledger."
    ],
    rows
  };
}

function markdown(doc) {
  const lines = [];
  lines.push("# Category B — medium-confidence exclusions, for revalidation");
  lines.push("");
  lines.push(`${doc.count} routes. ${doc.whatThisIs}`);
  lines.push("");
  lines.push(`**Source:** \`${doc.generatedFrom.sourcePath}\` at blob \`${doc.generatedFrom.sourceGitBlobSha}\``);
  lines.push(`**Captain head:** \`${doc.generatedFrom.captainHead}\``);
  lines.push("");
  lines.push("This is a packaging record. " + doc.grantsNothing.join(" "));
  lines.push("");
  lines.push("> " + doc.whatThisIsNot);
  lines.push("");
  let jurisdiction = null;
  for (const row of doc.rows) {
    if (row.jurisdiction !== jurisdiction) {
      jurisdiction = row.jurisdiction;
      lines.push(`## ${jurisdiction}`);
      lines.push("");
    }
    lines.push(`### ${row.publicLabel ?? row.routeKey}`);
    lines.push("");
    lines.push(`- **routeKey:** \`${row.routeKey}\``);
    lines.push(`- **Authority:** ${row.statuteOrAuthority ?? "—"}`);
    lines.push(`- **Process actor:** ${row.processActor ?? "—"} · **participant can initiate:** ${row.participantCanInitiate}`);
    lines.push(`- **Destination:** ${row.destination ?? "—"}`);
    lines.push(`- **Current output strategy:** ${row.currentOutputStrategy ?? "—"}`);
    lines.push(`- **Why excluded (medium confidence):** ${row.possibleCategoryBReason ?? "—"}`);
    if (row.legalReviewQuestion) lines.push(`- **Open question:** ${row.legalReviewQuestion}`);
    lines.push("");
  }
  return lines.join("\n") + "\n";
}

// --- validation ---------------------------------------------------------------
// Every one of these is a way the export could be wrong while looking right.
function validate(doc, sourceText) {
  const problems = [];
  const source = JSON.parse(sourceText);
  const byKey = new Map((source.routes ?? []).map((row) => [row.routeKey, row]));

  if (doc.count !== EXPECTED_COUNT) problems.push(`exported ${doc.count} row(s), expected ${EXPECTED_COUNT}`);
  if (doc.rows.length !== doc.count) problems.push(`count ${doc.count} disagrees with ${doc.rows.length} row(s)`);

  const keys = doc.rows.map((row) => row.routeKey);
  const unique = new Set(keys);
  if (unique.size !== EXPECTED_COUNT) problems.push(`${unique.size} unique routeKey(s), expected ${EXPECTED_COUNT}`);

  for (const row of doc.rows) {
    const origin = byKey.get(row.routeKey);
    if (!origin) { problems.push(`${row.routeKey} is not in the source ledger`); continue; }
    if (origin.possibleCategory !== FILTER.possibleCategory) problems.push(`${row.routeKey} is ${origin.possibleCategory} in the ledger`);
    if (origin.classificationConfidence !== FILTER.classificationConfidence) problems.push(`${row.routeKey} is ${origin.classificationConfidence} confidence in the ledger`);
    if (row.currentReason !== origin.possibleCategoryBReason) problems.push(`${row.routeKey}: currentReason does not alias possibleCategoryBReason`);
    if (row.currentConfidence !== origin.classificationConfidence) problems.push(`${row.routeKey}: currentConfidence does not alias classificationConfidence`);
    for (const field of CARRIED_FIELDS) {
      if (!(field in row)) problems.push(`${row.routeKey}: ${field} was silently dropped`);
    }
    if (/^QUESTION-\d+$/i.test(row.routeKey)) problems.push(`${row.routeKey} is a synthetic question key, not a route key`);
  }

  // Every ledger row matching the filter must be here. Exporting a subset is the
  // failure that looks most like success.
  const expectedKeys = new Set((source.routes ?? [])
    .filter((row) => row.possibleCategory === FILTER.possibleCategory && row.classificationConfidence === FILTER.classificationConfidence)
    .map((row) => row.routeKey));
  for (const key of expectedKeys) if (!unique.has(key)) problems.push(`${key} matches the filter but was not exported`);

  const sorted = [...doc.rows].sort((a, b) => a.jurisdiction.localeCompare(b.jurisdiction) || a.routeKey.localeCompare(b.routeKey));
  if (JSON.stringify(sorted.map((r) => r.routeKey)) !== JSON.stringify(keys)) problems.push("rows are not ordered by jurisdiction then routeKey");

  return problems;
}

/**
 * In --check mode the export is rebuilt from the blob it was FROZEN against,
 * not from whatever the ledger says today.
 *
 * This matters because the ledger legitimately moves. Regenerating the national
 * census after five family censuses were integrated changed its
 * sourceFingerprint and therefore its blob sha, and a check that rebuilt from
 * the live file would have reported the frozen assignment stale — when nothing
 * about the assignment had changed at all. Worse, the obvious "fix" would have
 * been to regenerate the assignment, which is exactly what must not happen: it
 * is handed to a reviewer and is traceable to one exact blob.
 *
 * So a frozen export stays verifiable forever against its own pinned source,
 * and the question "has the ledger moved underneath it?" is answered by the
 * post-regeneration delta record instead, where it belongs.
 */
function pinnedSource() {
  const committed = JSON.parse(read(JSON_OUT));
  const { sourceGitBlobSha, captainHead } = committed.generatedFrom;
  const text = execFileSync("git", ["cat-file", "blob", sourceGitBlobSha], {
    cwd: ROOT, encoding: "utf8", maxBuffer: 1024 * 1024 * 512
  });
  return { text, pinned: { sourceGitBlobSha, captainHead } };
}

let sourceText;
let pinned = null;
if ((CHECK || MUTATIONS) && fs.existsSync(path.join(ROOT, JSON_OUT))) {
  const resolved = pinnedSource();
  sourceText = resolved.text;
  pinned = resolved.pinned;
} else {
  sourceText = read(SOURCE);
}
const doc = build(sourceText, pinned);
const problems = validate(doc, sourceText);

const md = markdown(doc);
// The Markdown must carry the same 55 keys as the JSON, or a reviewer reading
// one is reviewing a different set from a reviewer reading the other.
for (const row of doc.rows) {
  if (!md.includes(row.routeKey)) problems.push(`${row.routeKey} is missing from the Markdown mirror`);
}
const mdKeys = [...md.matchAll(/- \*\*routeKey:\*\* `([^`]+)`/g)].map((m) => m[1]);
if (mdKeys.length !== doc.rows.length) problems.push(`Markdown lists ${mdKeys.length} route key(s), JSON has ${doc.rows.length}`);

if (problems.length > 0) {
  console.error(`category B medium-confidence export: ${problems.length} problem(s)`);
  for (const problem of problems.slice(0, 15)) console.error(`  - ${problem}`);
  process.exit(1);
}

const serialized = JSON.stringify(doc, null, 2) + "\n";
const jsonPath = path.join(ROOT, JSON_OUT);
const mdPath = path.join(ROOT, MD_OUT);

if (CHECK) {
  const currentJson = fs.existsSync(jsonPath) ? fs.readFileSync(jsonPath, "utf8") : null;
  const currentMd = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, "utf8") : null;
  if (currentJson !== serialized) { console.error(`${JSON_OUT} is stale. Run the exporter.`); process.exit(1); }
  if (currentMd !== md) { console.error(`${MD_OUT} is stale. Run the exporter.`); process.exit(1); }
  console.log(`category B medium-confidence export current: ${doc.count} row(s), ${new Set(doc.rows.map((r) => r.routeKey)).size} unique route key(s).`);
  process.exit(0);
}

if (MUTATIONS) { await runMutations(); process.exit(0); }

fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
fs.mkdirSync(path.dirname(mdPath), { recursive: true });
fs.writeFileSync(jsonPath, serialized);
fs.writeFileSync(mdPath, md);
console.log(`Wrote ${JSON_OUT}\nWrote ${MD_OUT}\n`);
console.log(`  ${doc.count} row(s), ${new Set(doc.rows.map((r) => r.routeKey)).size} unique route key(s)`);
console.log(`  source blob ${doc.generatedFrom.sourceGitBlobSha}`);
console.log(`  source sha256 ${doc.generatedFrom.sourceSha256}`);

/**
 * Does the check discriminate?
 *
 * Each mutation is a way the export could be wrong. A mutation that passes
 * means the corresponding validation proves nothing, so a surviving mutation
 * fails this run. Every mutated file is restored byte-for-byte.
 */
async function runMutations() {
  const cases = [
    {
      name: "a row reclassified to Category A is caught",
      mutate: (json) => { json.rows[0].possibleCategory = "A_IMPLEMENTATION_REQUIRED"; return json; }
    },
    {
      name: "a row promoted to high confidence is caught",
      mutate: (json) => { json.rows[1].classificationConfidence = "high"; json.rows[1].currentConfidence = "high"; return json; }
    },
    { name: "a deleted row is caught", mutate: (json) => { json.rows.splice(2, 1); json.count = json.rows.length; return json; } },
    { name: "a duplicated routeKey is caught", mutate: (json) => { json.rows.push({ ...json.rows[3] }); json.count = json.rows.length; return json; } },
    { name: "source-ledger hash drift is caught", mutate: (json) => { json.generatedFrom.sourceSha256 = "0".repeat(64); return json; } },
    { name: "a synthetic QUESTION-n key is caught", mutate: (json) => { json.rows[4].routeKey = "QUESTION-42"; return json; } },
    { name: "a silently dropped carried field is caught", mutate: (json) => { delete json.rows[5].missingImplementationWork; return json; } },
    { name: "an unordered export is caught", mutate: (json) => { json.rows.reverse(); return json; } }
  ];

  const originalJson = fs.readFileSync(jsonPath);
  const originalMd = fs.readFileSync(mdPath);
  let undetected = 0;
  try {
    for (const testCase of cases) {
      const mutated = testCase.mutate(JSON.parse(originalJson.toString("utf8")));
      fs.writeFileSync(jsonPath, JSON.stringify(mutated, null, 2) + "\n");
      let caught = false;
      try {
        execFileSync(process.execPath, [fileURLToPath(import.meta.url), "--check"], { cwd: ROOT, stdio: "pipe" });
      } catch { caught = true; }
      console.log(`  ${caught ? "detected " : "MISSED   "} ${testCase.name}`);
      if (!caught) undetected += 1;
      fs.writeFileSync(jsonPath, originalJson);
    }
  } finally {
    fs.writeFileSync(jsonPath, originalJson);
    fs.writeFileSync(mdPath, originalMd);
  }
  const restored = fs.readFileSync(jsonPath).equals(originalJson) && fs.readFileSync(mdPath).equals(originalMd);
  console.log(`\n  every mutated file restored byte-for-byte: ${restored}`);
  if (!restored) { console.error("a mutation was left on disk"); process.exit(1); }
  if (undetected > 0) { console.error(`\n${undetected} mutation(s) undetected — the check proves less than it claims.`); process.exit(1); }
  console.log(`\nOK category B export mutations — ${cases.length} case(s), every mutation caught.`);
}
