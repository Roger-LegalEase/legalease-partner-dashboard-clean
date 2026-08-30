#!/usr/bin/env node
// The twelve first-wave assignments, and one filled prompt per assignment.
//
//   node scripts/grade-a-launch-control/generate-first-wave-dispatch.mjs [--check]
//
// TWO-COMMIT METHOD
//
// Workers branch from an exact control-baseline commit and read their
// assignment from a later dispatch commit. If the manifest recorded its own
// commit it could not exist before it was committed, so the base is pinned
// here as a constant and the dispatch is committed separately.
//
// EVERY ROW AND FAMILY IS ALLOCATED FROM THE REUSE INDEX. A packet lane can
// only receive a family whose reuse decision is NO_EXISTING_WORK, so the six
// families already built in the tree and the six finished on branches cannot
// be handed to anyone to rebuild.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = "data/rcap-grade-a/launch-control/first-wave-assignments.json";
const PROMPT_DIR = "docs/rcap/grade-a/captain/dispatch/first-wave";
const CHECK = process.argv.includes("--check");

// The control-baseline commit. Workers branch from exactly this.
const CAPTAIN_BASE_SHA = "bc504a3e1b160e153a7393ed8673f3e784c0a8c7";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 29 }).trim(); } catch { return null; } };

const V1 = "data/rcap-grade-a/route-obligation-census-v1";
const reuse = read("data/rcap-grade-a/launch-control/reuse-index.json");
const categoryB = read("data/rcap-grade-a/route-obligation-census-candidate/category-b-medium-confidence-revalidation.json");
const retriage = read(`${V1}/legal-review-queue-v2-retriage.json`);
const sourceQueue = read(`${V1}/source-queue-reconciliation.json`);
const custody = read(`${V1}/source-custody-reconciliation.json`);
const freeze = read(`${V1}/FREEZE.json`);

const heldSources = new Set(custody.rows.filter((r) => r.custodyClass === "SOURCE_ALREADY_HELD").map((r) => r.worklistGroupId));
const freeFamilies = reuse.families.filter((f) => f.freeToDispatch);
const pdfBuildable = [...new Set(freeFamilies
  .filter((f) => f.implementationStrategy === "official_pdf_fill" && heldSources.has(f.worklistGroupId))
  .map((f) => f.worklistGroupId))].sort();
// A family can appear in the worklist under more than one implementation
// strategy. ne-trafficking-setaside-and-seal-set is both official_pdf_fill and
// custom_pleading, so a naive split put it in two packet lanes at once. It goes
// to the official-PDF lane, because that lane has its held source bytes; the
// composed lane takes only what the PDF lane did not.
const composedBuildable = [...new Set(freeFamilies
  .filter((f) => f.implementationStrategy !== "official_pdf_fill" && heldSources.has(f.worklistGroupId))
  .map((f) => f.worklistGroupId))].filter((id) => !pdfBuildable.includes(id)).sort();

/** Four nonoverlapping shards of the frozen 55, split on a stable order. */
const categoryBRows = [...categoryB.rows].sort((a, b) =>
  a.jurisdiction.localeCompare(b.jurisdiction) || a.routeKey.localeCompare(b.routeKey));
const shards = [[], [], [], []];
categoryBRows.forEach((row, index) => shards[index % 4].push(row.routeKey));

const retriageRows = read(`${V1}/legal-review-queue-v2-retriage.json`).rows ?? [];
const alreadyAnswered = retriageRows.filter((r) => r.bucket === "ALREADY_ANSWERED").map((r) => r.routeKey).sort();
const mappingRows = retriageRows.filter((r) => r.bucket === "CAPTAIN_MAPPING_CORRECTION").map((r) => r.routeKey).sort();

const acquireRows = sourceQueue.rows.filter((r) => r.disposition === "ACQUIRE_FROM_EXACT_OFFICIAL_SOURCE");
const resolveUrlRows = sourceQueue.rows.filter((r) => r.disposition === "RESOLVE_OFFICIAL_URL");
const unresolvedIdentityRows = sourceQueue.rows.filter((r) => r.disposition === "UNRESOLVED_IDENTITY");
const promoteRows = sourceQueue.rows.filter((r) => r.disposition === "PROMOTE_FROM_NATIONWIDE_INVENTORY");

const COMMON_PROHIBITED = [
  "data/rcap-grade-a/route-obligation-census-candidate/category-b-medium-confidence-revalidation.json",
  "docs/rcap/grade-a/route-obligation-census/CATEGORY_B_MEDIUM_CONFIDENCE_REVALIDATION.md",
  "data/rcap-grade-a/route-obligation-census-v1/FREEZE.json",
  "data/rcap-grade-a/launch-control/**",
  "data/rcap-ledger/**",
  "supabase/migrations/**",
  "package.json",
  "package-lock.json",
  ".github/workflows/**"
];

const ASSIGNMENTS = [
  {
    key: "C1_CATEGORY_B_EVIDENCE_SHARD_1", lane: "legal-evidence",
    mission: "Assemble the exclusion evidence for 14 medium-confidence Category B routes so counsel can confirm or overturn each exclusion on its own record.",
    rows: shards[0], rowKind: "routeKey",
    owned: ["data/rcap-grade-a/category-b-evidence/shard-1/**"],
    outputs: ["data/rcap-grade-a/category-b-evidence/shard-1/evidence.json"],
    tests: ["node scripts/grade-a-launch-control/verify-launch-control.mjs"],
    stop: "A route whose evidence contradicts its own exclusion reason stops and is reported; it is not reclassified by this lane."
  },
  {
    key: "C2_CATEGORY_B_EVIDENCE_SHARD_2", lane: "legal-evidence",
    mission: "Assemble the exclusion evidence for 14 medium-confidence Category B routes so counsel can confirm or overturn each exclusion on its own record.",
    rows: shards[1], rowKind: "routeKey",
    owned: ["data/rcap-grade-a/category-b-evidence/shard-2/**"],
    outputs: ["data/rcap-grade-a/category-b-evidence/shard-2/evidence.json"],
    tests: ["node scripts/grade-a-launch-control/verify-launch-control.mjs"],
    stop: "A route whose evidence contradicts its own exclusion reason stops and is reported; it is not reclassified by this lane."
  },
  {
    key: "C3_CATEGORY_B_EVIDENCE_SHARD_3", lane: "legal-evidence",
    mission: "Assemble the exclusion evidence for 14 medium-confidence Category B routes so counsel can confirm or overturn each exclusion on its own record.",
    rows: shards[2], rowKind: "routeKey",
    owned: ["data/rcap-grade-a/category-b-evidence/shard-3/**"],
    outputs: ["data/rcap-grade-a/category-b-evidence/shard-3/evidence.json"],
    tests: ["node scripts/grade-a-launch-control/verify-launch-control.mjs"],
    stop: "A route whose evidence contradicts its own exclusion reason stops and is reported; it is not reclassified by this lane."
  },
  {
    key: "C4_CATEGORY_B_EVIDENCE_SHARD_4", lane: "legal-evidence",
    mission: "Assemble the exclusion evidence for 13 medium-confidence Category B routes so counsel can confirm or overturn each exclusion on its own record.",
    rows: shards[3], rowKind: "routeKey",
    owned: ["data/rcap-grade-a/category-b-evidence/shard-4/**"],
    outputs: ["data/rcap-grade-a/category-b-evidence/shard-4/evidence.json"],
    tests: ["node scripts/grade-a-launch-control/verify-launch-control.mjs"],
    stop: "A route whose evidence contradicts its own exclusion reason stops and is reported; it is not reclassified by this lane."
  },
  {
    key: "C5_ALREADY_ANSWERED_IMPLEMENTATION", lane: "legal-implementation",
    mission: "Implement the 37 legal-review rows a controlling decision already answers, citing the decision record by id for each. These are not questions to ask again.",
    rows: alreadyAnswered, rowKind: "routeKey",
    owned: ["data/rcap-grade-a/already-answered-implementation/**"],
    outputs: ["data/rcap-grade-a/already-answered-implementation/implemented.json"],
    tests: ["node scripts/grade-a-launch-control/verify-launch-control.mjs"],
    stop: "A row whose cited decision record cannot be found in this tree stops and is reported. An asserted answer no record backs is the most dangerous outcome in this lane."
  },
  {
    key: "C6_STAGE_BRANCH_SPLITS", lane: "engineering",
    mission: `Split the ${freeze.totals.hiddenParticipantFilingBranches} hidden participant-filing branches the census counted into explicit stages, so a route that is really two filings is represented as two.`,
    rows: [], rowKind: "censusDerived",
    owned: ["data/rcap-grade-a/stage-branch-splits/**"],
    outputs: ["data/rcap-grade-a/stage-branch-splits/splits.json"],
    tests: ["node scripts/grade-a-route-obligation-census/verify-national-route-obligation-census.mjs", "node scripts/grade-a-launch-control/verify-launch-control.mjs"],
    stop: "A split that would change the census denominator stops and is reported. The denominator moves only with an explanation."
  },
  {
    key: "C7_RUNTIME_CROSSWALKS_STAGE_BINDING", lane: "engineering",
    mission: "Bind each runtime pathway to the census stage it serves, so a route's runtime identity and its obligation identity are the same thing.",
    rows: [], rowKind: "censusDerived",
    owned: ["data/rcap-grade-a/runtime-crosswalks/**"],
    outputs: ["data/rcap-grade-a/runtime-crosswalks/stage-binding.json"],
    tests: ["node scripts/grade-a-route-obligation-census/verify-national-route-obligation-census.mjs", "node scripts/grade-a-launch-control/verify-launch-control.mjs"],
    stop: "A runtime pathway with no census stage, or two stages claiming one pathway, stops and is reported rather than being resolved by picking one."
  },
  {
    key: "C8_SOURCE_IDENTITY", lane: "source",
    mission: `Resolve the ${unresolvedIdentityRows.length} document obligations whose identity is still unresolved and the ${resolveUrlRows.length} whose official URL is unknown. Name the document; do not guess a form number.`,
    rows: [...new Set([...unresolvedIdentityRows, ...resolveUrlRows].map((r) => `${r.worklistGroupId}::${r.obligation}`))].sort(),
    rowKind: "obligation",
    owned: ["data/rcap-grade-a/route-obligation-census-v1/identity-resolution/wave-2/**"],
    outputs: ["data/rcap-grade-a/route-obligation-census-v1/identity-resolution/wave-2/resolved.json"],
    tests: ["node scripts/grade-a-route-obligation-census/reconcile-source-queue.mjs --check", "node scripts/grade-a-launch-control/verify-launch-control.mjs"],
    stop: "An identity that cannot be settled from committed records is recorded unresolved with what would settle it. A wrong resolution sends someone to acquire the wrong document, which is worse than an open row."
  },
  {
    key: "C9_SOURCE_ACQUISITION", lane: "source",
    mission: `Acquire the ${acquireRows.length} obligations whose exact official source is already identified, and promote the ${promoteRows.length} held in the nationwide inventory but not in the verified corpus.`,
    // Deduplicated: a family can name one document for two roles, and that is
    // one acquisition job, not two.
    rows: [...new Set(acquireRows.map((r) => `${r.worklistGroupId}::${r.obligation}`))].sort(), rowKind: "obligation",
    owned: ["data/rcap-grade-a/source-acquisition/wave-1/**"],
    outputs: ["data/rcap-grade-a/source-acquisition/wave-1/acquired.json"],
    tests: ["node scripts/grade-a-route-obligation-census/reconcile-source-queue.mjs --check", "node scripts/grade-a-launch-control/verify-launch-control.mjs"],
    stop: "BLOCKED ON EGRESS. Every Captain-reachable environment refuses court and agency hosts. This lane runs only in an environment whose egress policy permits the issuing authorities' own domains, and it acquires from the issuing authority or not at all — no mirror, cache, aggregator or lookalike form."
  },
  {
    key: "C10_OFFICIAL_PDF_PACKET_BUILDS", lane: "packet",
    mission: `Build official-PDF packet families whose source is already held. ${pdfBuildable.length} families qualify; take them in the listed order.`,
    rows: pdfBuildable, rowKind: "worklistGroupId",
    owned: ["data/rcap-all50/overlays/census-v1/**  (only the families listed below)", "scripts/build-census-v1-<family>.mjs"],
    outputs: ["one field census, field map, canonical and boundary fixtures, actual-write report and page rasters per family"],
    tests: ["node scripts/verify-packet-build-environment.mjs --family <family>", "node scripts/grade-a-launch-control/verify-launch-control.mjs"],
    stop: "The packet-build environment preflight must print PACKET_BUILD_ENVIRONMENT_READY 14/14 before anything is written. A family whose source does not bind by exact SHA-256 stops."
  },
  {
    key: "C11_COMPOSED_AND_AGENCY_PACKET_BUILDS", lane: "packet",
    mission: `Build composed-pleading and agency-application families whose source is already held. ${composedBuildable.length} families qualify.`,
    rows: composedBuildable, rowKind: "worklistGroupId",
    owned: ["data/rcap-all50/pleadings/**  (only the families listed below)"],
    outputs: ["one pleading configuration, fixtures, rendered output and participant instructions per family"],
    tests: ["node scripts/grade-a-launch-control/verify-launch-control.mjs"],
    stop: "A family whose output vehicle is unresolved in its legal-design memo stops and is reported; the vehicle is a legal-design decision, not a build choice."
  },
  {
    key: "C12_DATA_RIGHTS_HOSTED_ENVIRONMENT", lane: "platform",
    mission: "Stand up the synthetic nonproduction acceptance environment for participant data rights and run hosted export, matter-deletion and account-deletion acceptance against it.",
    rows: [], rowKind: "environment",
    owned: ["data/rcap-grade-a/participant-data-rights/**"],
    outputs: ["data/rcap-grade-a/participant-data-rights/hosted-acceptance.json"],
    tests: ["node scripts/verify-participant-data-rights.mjs", "node scripts/grade-a-launch-control/verify-launch-control.mjs"],
    stop: "SYNTHETIC NONPRODUCTION ONLY. No Production migration, deployment, environment-variable change or real participant data. The authorization covers one dedicated synthetic acceptance project and nothing else; if the project ref cannot be recorded and proven synthetic, this lane stops rather than proceeding."
  }
];

const assignments = ASSIGNMENTS.map((a) => ({
  key: a.key,
  lane: a.lane,
  workerBranch: `codex/first-wave-${a.key.toLowerCase().replace(/_/g, "-")}`,
  captainBaseSha: CAPTAIN_BASE_SHA,
  mission: a.mission,
  rowKind: a.rowKind,
  rowCount: a.rows.length,
  rows: a.rows,
  ownedPaths: a.owned,
  prohibitedPaths: COMMON_PROHIBITED,
  requiredInputs: [
    "data/rcap-grade-a/launch-control/LAUNCH_CONTROL.json",
    "data/rcap-grade-a/launch-control/reuse-index.json",
    `${V1}/FREEZE.json`
  ],
  expectedOutputs: a.outputs,
  focusedTests: a.tests,
  stopConditions: a.stop,
  promptFile: `${PROMPT_DIR}/${a.key}.md`,
  reuseChecked: true,
  grantsNothing: "Completing this assignment opens no commercial route, proves no packet and approves no output."
}));

// ---- collision refusals ------------------------------------------------------
const problems = [];
const seenRows = new Map();
for (const a of assignments) {
  for (const row of a.rows) {
    if (seenRows.has(row)) problems.push(`${row} is assigned to both ${seenRows.get(row)} and ${a.key}`);
    else seenRows.set(row, a.key);
  }
}
const seenPaths = new Map();
for (const a of assignments) {
  for (const p of a.ownedPaths) {
    const root = p.split("(")[0].trim();
    if (seenPaths.has(root) && seenPaths.get(root) !== a.key) {
      problems.push(`owned path ${root} is claimed by both ${seenPaths.get(root)} and ${a.key}`);
    }
    seenPaths.set(root, a.key);
  }
}
const PLACEHOLDER = /\b(TBD|TODO|FIXME|XXX|<placeholder>|\.\.\.)\b/i;
for (const a of assignments) {
  const text = JSON.stringify(a);
  if (PLACEHOLDER.test(text)) problems.push(`${a.key} contains a placeholder value`);
  if (a.rowKind !== "censusDerived" && a.rowKind !== "environment" && a.rows.length === 0) {
    problems.push(`${a.key} has no rows and is not a census-derived or environment lane`);
  }
}
const freeSet = new Set(freeFamilies.map((f) => f.worklistGroupId));
for (const a of assignments.filter((x) => x.lane === "packet")) {
  for (const family of a.rows) {
    if (!freeSet.has(family)) problems.push(`${a.key} was given ${family}, which is not free to dispatch`);
  }
}
if (problems.length > 0) {
  console.error(`first-wave dispatch: ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 12)) console.error(`  - ${p}`);
  process.exit(1);
}

const doc = {
  schemaVersion: "rcap-grade-a-first-wave-assignments/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-first-wave-dispatch.mjs",
  captainBaseSha: CAPTAIN_BASE_SHA,
  captainBaseIsAncestorOfDispatch: true,
  controllingLaunchRecord: "data/rcap-grade-a/launch-control/LAUNCH_CONTROL.json",
  reuseIndex: "data/rcap-grade-a/launch-control/reuse-index.json",
  promptDirectory: PROMPT_DIR,
  twoCommitMethod:
    "Workers branch from captainBaseSha and read this manifest from the dispatch commit that follows it. The base is a constant rather than a lookup, because a manifest that recorded its own commit could not exist before it was committed.",
  notDispatched: {
    familiesAlreadyBuiltInTree: reuse.families.filter((f) => f.reuseDecision === "REUSE_AS_IS").map((f) => f.worklistGroupId),
    familiesFinishedOnBranchesAwaitingIntegration: reuse.families.filter((f) => f.reuseDecision === "RESUME_FROM_COMMIT")
      .map((f) => ({ family: f.worklistGroupId, branch: f.evidenceOnBranch })),
    why: "These twelve families are complete or complete-on-a-branch. Integrating them is Captain work; handing them to a packet lane would rebuild finished work on top of itself."
  },
  totals: {
    assignments: assignments.length,
    rowsAllocated: seenRows.size,
    collisions: 0,
    placeholders: 0
  },
  assignments
};

const serialized = JSON.stringify(doc, null, 2) + "\n";

function promptFor(a) {
  const rowsBlock = a.rows.length === 0
    ? "_This lane is scoped by the census rather than by an explicit row list; its scope is stated in the mission._"
    : a.rows.map((r) => `- \`${r}\``).join("\n");
  return `# ${a.key}

**Lane:** ${a.lane}
**Worker branch:** \`${a.workerBranch}\`
**Branch from:** \`${a.captainBaseSha}\` (the control baseline — branch from exactly this commit)
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

## Mission

${a.mission}

## Your exact scope — ${a.rowCount} ${a.rowKind}${a.rowCount === 1 ? "" : "s"}

${rowsBlock}

Nothing outside this list belongs to you. Every row here is allocated to you
and to no other lane; the dispatch refuses to generate if two lanes claim one
row.

## Required inputs

${a.requiredInputs.map((i) => `- \`${i}\``).join("\n")}

## Owned paths — write only here

${a.ownedPaths.map((p) => `- \`${p}\``).join("\n")}

## Prohibited paths — never write here

${a.prohibitedPaths.map((p) => `- \`${p}\``).join("\n")}

## Expected outputs

${a.expectedOutputs.map((o) => `- ${o}`).join("\n")}

## Focused tests

${a.focusedTests.map((t) => `- \`${t}\``).join("\n")}

Do not run a broad tracked-file mutation suite: other workers are active and a
mutation harness that leaves a tracked file altered will fail their runs, not
only yours.

## Stop conditions

${a.stopConditions}

Stopping with an honest account of what is missing is a complete return. A
result reported as done on evidence nobody opened is not.

## What finishing does not do

${a.grantsNothing} Commercial authority comes from a Grade-A fulfilment record
keyed to an exact route and packet family, and from nothing else.

## Setup

\`\`\`sh
git fetch origin --prune
git checkout -b ${a.workerBranch} ${a.captainBaseSha}
npm ci --cache /tmp/legalease-npm-cache
\`\`\`

Commit your work and \`git push -u origin ${a.workerBranch}\`.
`;
}

const outPath = path.join(ROOT, OUT);
const promptDir = path.join(ROOT, PROMPT_DIR);

if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current !== serialized) { console.error(`${OUT} is stale. Run the generator.`); process.exit(1); }
  for (const a of assignments) {
    const file = path.join(ROOT, a.promptFile);
    if (!fs.existsSync(file)) { console.error(`missing prompt ${a.promptFile}`); process.exit(1); }
    if (fs.readFileSync(file, "utf8") !== promptFor(a)) { console.error(`${a.promptFile} is stale.`); process.exit(1); }
  }
  console.log(`first-wave dispatch current: ${assignments.length} assignment(s), ${seenRows.size} row(s), 0 collisions.`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(promptDir, { recursive: true });
fs.writeFileSync(outPath, serialized);
for (const a of assignments) fs.writeFileSync(path.join(ROOT, a.promptFile), promptFor(a));
console.log(`Wrote ${OUT}`);
console.log(`Wrote ${assignments.length} prompt(s) under ${PROMPT_DIR}\n`);
for (const a of assignments) console.log(`  ${a.key.padEnd(42)} ${String(a.rowCount).padStart(4)} ${a.rowKind}`);
console.log(`\n  rows allocated ${seenRows.size} · collisions 0 · placeholders 0`);
