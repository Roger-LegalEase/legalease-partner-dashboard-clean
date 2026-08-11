// Dispatch for the Milestone 1 item 2 blockers, taken from the canonical job graph.
//
// This is deliberately NOT a new evidence wave. The 363-job E2 wave is finished
// and superseded; what remains is 38 named blockers — 30 compiled pathways and 8
// registry tracks — each already carrying its reason, its owned paths and its
// stop condition in data/rcap-ledger/e3-job-graph.json. A lane's job is to
// resolve or terminalize the subjects it is handed, not to re-survey the corpus.
//
// Partition rule: by jurisdiction, so a lane holds all the blockers of a state
// together. The candidate discriminators for a state's tracks are usually that
// same state's pathways, so splitting a jurisdiction across lanes would force
// two lanes to derive the same reading independently and risk them disagreeing.
// Jurisdictions are dealt largest-first into the emptiest lane, which keeps the
// lanes near-even without any randomness.
//
// Owned paths: every lane writes only its own resolution file. The crosswalk
// artifacts, the adjudication input, the generators and the evidence packages
// are captain-owned and integrated in one pass afterwards, exactly as the E2
// lanes were.
//
// Usage:
//   node scripts/generate-rcap-crosswalk-resolution-dispatch.mjs
//   node scripts/generate-rcap-crosswalk-resolution-dispatch.mjs --check

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const graphPath = path.join(rootDir, "data/rcap-ledger/e3-job-graph.json");
const outputPath = path.join(rootDir, "data/rcap-ledger/crosswalk-resolution-dispatch.json");
const reportPath = path.join(rootDir, "docs/record-clearing/crosswalk-resolution-dispatch.md");
const check = process.argv.includes("--check");

const LANE_COUNT = 4;

const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
const blockers = graph.jobs
  .filter((j) => j.obligations.some((o) => o.milestone1Item2))
  .sort((a, b) => a.id.localeCompare(b.id));

// Group by jurisdiction, then deal largest group first into the smallest lane.
const byJurisdiction = new Map();
for (const job of blockers) {
  if (!byJurisdiction.has(job.jurisdiction)) byJurisdiction.set(job.jurisdiction, []);
  byJurisdiction.get(job.jurisdiction).push(job);
}
const groups = [...byJurisdiction.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

const lanes = Array.from({ length: LANE_COUNT }, (_, i) => ({
  laneId: `E4-R${i + 1}`,
  model: "claude-opus-5",
  jurisdictions: [],
  jobIds: [],
  resolutionPath: `data/rcap-ledger/crosswalk-resolution/E4-R${i + 1}.json`,
  reportPath: `docs/record-clearing/crosswalk-resolution/E4-R${i + 1}.md`
}));

for (const [jurisdiction, jobs] of groups) {
  const lane = lanes.reduce((min, l) => (l.jobIds.length <= min.jobIds.length ? l : min), lanes[0]);
  lane.jurisdictions.push(jurisdiction);
  for (const job of jobs) lane.jobIds.push(job.id);
}
for (const lane of lanes) {
  lane.jurisdictions.sort();
  lane.jobIds.sort();
  lane.jobCount = lane.jobIds.length;
}

// Paths no resolution lane may write. Contention here is what made the eight
// E2 lanes safe, and the same rule applies unchanged.
const FORBIDDEN_PATHS = [
  "data/rcap-ledger/track-pathway-crosswalk.json",
  "data/rcap-ledger/registry-crosswalk-projection.json",
  "data/rcap-ledger/crosswalk-adjudications.json",
  "data/rcap-ledger/e3-job-graph.json",
  "data/rcap-ledger/e2-evidence-jobs.json",
  "data/rcap-ledger/e2-dispatch-assignment.json",
  "data/rcap-crosswalk-enrichment/e2-source-support-audit.json",
  "data/rcap-ledger/e2-evidence/",
  "package.json",
  "supabase/",
  "scripts/"
];

const totalDispatched = lanes.reduce((s, l) => s + l.jobCount, 0);
if (totalDispatched !== blockers.length) {
  console.error(`generate-rcap-crosswalk-resolution-dispatch FAILED: dispatched ${totalDispatched} of ${blockers.length} blockers`);
  process.exit(1);
}
const seen = new Set(lanes.flatMap((l) => l.jobIds));
if (seen.size !== blockers.length) {
  console.error("generate-rcap-crosswalk-resolution-dispatch FAILED: a blocker was dispatched to more than one lane");
  process.exit(1);
}

const artifact = {
  schemaVersion: "rcap-crosswalk-resolution-dispatch/v1",
  generatedBy: "scripts/generate-rcap-crosswalk-resolution-dispatch.mjs",
  purpose:
    "Dispatch of the 38 Milestone 1 item 2 blockers to the Opus crosswalk-resolution lane, partitioned by jurisdiction from the canonical job graph. Not an evidence wave: the E2 wave is complete and superseded.",
  notAnEvidenceWave:
    "Lanes resolve or terminalize the named subjects they are handed. They do not re-survey the corpus, do not re-open the 363-job E2 queue, and do not regenerate any shared artifact.",
  input: {
    jobGraph: "data/rcap-ledger/e3-job-graph.json",
    crosswalkContentHash: graph.input.crosswalkContentHash,
    crosswalkEvidenceHash: graph.input.crosswalkEvidenceHash,
    jobGraphSha256: crypto.createHash("sha256").update(fs.readFileSync(graphPath)).digest("hex")
  },
  totals: {
    blockers: blockers.length,
    unresolvedPathways: blockers.filter((j) => j.kind === "compiled_pathway").length,
    unresolvedTracks: blockers.filter((j) => j.kind === "registry_track").length,
    lanes: lanes.length
  },
  forbiddenPaths: FORBIDDEN_PATHS,
  stopConditions: [
    "A subject is resolved when a registry track (or compiled pathway) is named on cited authority committed in this repository.",
    "A subject is terminalized when it is shown that no such counterpart exists, with the blocker published.",
    "'No citation available' is not an outcome. Neither is a mapping proposed without a license the generator can re-check.",
    "A subject blocked on primary authority that this repository does not contain is returned as still-blocked, naming the retrieval packet — not guessed."
  ],
  lanes
};

const serialized = `${JSON.stringify(artifact, null, 2)}\n`;

const L = [];
L.push("# Crosswalk resolution dispatch — the 38 Milestone 1 item 2 blockers");
L.push("");
L.push(
  `Generated from \`data/rcap-ledger/e3-job-graph.json\` (crosswalk contentHash \`${graph.input.crosswalkContentHash}\`).`
);
L.push("");
L.push(
  `**${blockers.length} blockers** — ${artifact.totals.unresolvedPathways} compiled pathways and ${artifact.totals.unresolvedTracks} registry tracks — across ${lanes.length} Opus lanes. This is not a new evidence wave; the 363-job E2 wave is complete and superseded.`
);
L.push("");
L.push("| Lane | Jobs | Jurisdictions |");
L.push("| --- | ---: | --- |");
for (const lane of lanes) L.push(`| ${lane.laneId} | ${lane.jobCount} | ${lane.jurisdictions.join(", ")} |`);
L.push("");
L.push("Partitioned by jurisdiction so a state's blockers stay together: the discriminator for a state's ambiguous track is usually that same state's pathway, and splitting a jurisdiction would make two lanes derive the same reading and risk disagreement.");
L.push("");
L.push("## Stop conditions");
L.push("");
for (const s of artifact.stopConditions) L.push(`- ${s}`);
L.push("");
L.push("## Paths no lane may write");
L.push("");
for (const p of FORBIDDEN_PATHS) L.push(`- \`${p}\``);
L.push("");
L.push("Each lane writes only its own resolution file and report. Integration is a single captain pass afterwards, exactly as with the eight E2 lanes.");
L.push("");
L.push("## Jobs by lane");
L.push("");
for (const lane of lanes) {
  L.push(`### ${lane.laneId} (${lane.jobCount})`);
  L.push("");
  for (const id of lane.jobIds) L.push(`- \`${id}\``);
  L.push("");
}

const report = `${L.join("\n")}\n`;

// A dispatch that has been executed is frozen. Its lanes were verified against
// the crosswalk state it was cut from; recomputing it against a crosswalk those
// same lanes have since resolved would destroy the contract the lane files and
// the lane verifier depend on. Once `executed` is set, --check verifies the
// frozen contract is internally consistent instead of regenerating it.
const committed = fs.existsSync(outputPath) ? JSON.parse(fs.readFileSync(outputPath, "utf8")) : null;
if (check && committed?.executed) {
  const problems = [];
  const total = (committed.lanes || []).reduce((n, l) => n + l.jobCount, 0);
  if (total !== (committed.blockerCount ?? total)) problems.push(`lane job counts sum to ${total}, blockerCount is ${committed.blockerCount}`);
  for (const lane of committed.lanes || []) {
    if ((lane.jobIds || []).length !== lane.jobCount) problems.push(`${lane.laneId}: ${lane.jobIds?.length} jobIds for jobCount ${lane.jobCount}`);
    if (!fs.existsSync(path.join(rootDir, lane.resolutionPath))) problems.push(`${lane.laneId}: resolution file missing`);
  }
  if (problems.length) {
    console.error("Frozen crosswalk resolution dispatch is inconsistent:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`Crosswalk resolution dispatch frozen and consistent: ${committed.lanes.length} lanes, ${total} blockers, executed ${committed.executed}.`);
  process.exit(0);
}

if (check) {
  const currentJson = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  const currentReport = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, "utf8") : "";
  if (currentJson !== serialized || currentReport !== report) {
    console.error("Crosswalk resolution dispatch is stale. Run: npm run rcap:crosswalk-resolution-dispatch");
    process.exit(1);
  }
  console.log(`Crosswalk resolution dispatch current. ${lanes.length} lanes, ${blockers.length} blockers.`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(outputPath, serialized);
fs.writeFileSync(reportPath, report);

console.log(`Crosswalk resolution dispatch written: ${lanes.length} lanes, ${blockers.length} blockers`);
for (const lane of lanes) {
  console.log(`  ${lane.laneId}  ${String(lane.jobCount).padStart(2)} jobs  ${lane.jurisdictions.join(", ")}`);
}
