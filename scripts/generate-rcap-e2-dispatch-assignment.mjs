// E2 dispatch assignment — which frozen job belongs to which evidence lane.
//
// The frozen queue in data/rcap-ledger/e2-evidence-jobs.json names 363 pieces of
// work but does not say who does them. This writer partitions that queue across
// the eight dispatched E2 sessions and pins the partition to the queue's own
// digest, so a lane can prove its scope and a later adjudication pass can prove
// that every job was claimed exactly once.
//
// Two rules the partition exists to enforce:
//
//   1. Every job is assigned to exactly one lane. Coverage and exclusivity are
//      asserted here rather than trusted, because a silently dropped job would
//      look identical to a closed one at the end of the sprint.
//
//   2. No lane writes a shared path. The frozen jobs carry `ownedPaths` that
//      point at the canonical crosswalk and the compiled profiles — artifacts
//      several jobs would contend for and that the crosswalk generator derives.
//      An E2 lane therefore does not edit them at all. It writes findings to one
//      evidence file that belongs to it alone, and E3 adjudicates those findings
//      into the crosswalk in a single controlled pass. Evidence gathering and
//      artifact mutation are separated on purpose: a lane cannot close its own
//      row, so it cannot close it by guessing.
//
// Determinism: lanes are a fixed literal, jobs are sorted by id and split
// contiguously, and nothing reads the clock. Regenerating on an unchanged queue
// produces byte-identical output.
//
// Usage:
//   node scripts/generate-rcap-e2-dispatch-assignment.mjs
//   node scripts/generate-rcap-e2-dispatch-assignment.mjs --check

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jobsPath = path.join(rootDir, "data/rcap-ledger/e2-evidence-jobs.json");
const outputPath = path.join(rootDir, "data/rcap-ledger/e2-dispatch-assignment.json");
const reportPath = path.join(rootDir, "docs/record-clearing/e2-dispatch-assignment.md");
const check = process.argv.includes("--check");

if (!fs.existsSync(jobsPath)) {
  console.error("No frozen E2 queue. Run: npm run rcap:e2-evidence-jobs");
  process.exit(1);
}

const jobsRaw = fs.readFileSync(jobsPath, "utf8");
const queue = JSON.parse(jobsRaw);
// Pin the job set, not the file. The partition is a function of the jobs and
// nothing else, so queue metadata — notably the supersession record added once
// this queue was replaced — must not invalidate a partition the landed evidence
// is already keyed to. Digesting whole-file bytes would report a frozen, worked
// partition as stale and invite a regeneration that re-partitions jobIds.
const queueDigest = crypto.createHash("sha256").update(JSON.stringify(queue.jobs)).digest("hex");

// Shared paths an evidence lane may never write. Contention on any of these is
// what makes eight concurrent lanes safe or unsafe; the list is machine-readable
// so a lane's own harness can check itself rather than relying on prose.
const PROHIBITED_PATHS = [
  "scripts/generate-rcap-e2-evidence-jobs.mjs",
  "scripts/generate-rcap-e2-dispatch-assignment.mjs",
  "scripts/generate-rcap-track-pathway-crosswalk.mjs",
  "scripts/verify-rcap-track-pathway-crosswalk.mjs",
  "scripts/extract-rcap-registry-projection.mjs",
  "data/rcap-ledger/e2-evidence-jobs.json",
  "data/rcap-ledger/e2-dispatch-assignment.json",
  "data/rcap-ledger/track-pathway-crosswalk.json",
  "data/rcap-ledger/registry-crosswalk-projection.json",
  "data/rcap-ledger/authority-ledger.json",
  "data/rcap-verifier-dispositions.json",
  "data/rcap-authorization-queue.json",
  "package.json",
  "package-lock.json",
  "src/lib/rcap-engine/compiled/profiles/",
  "src/lib/rcap/render/",
  "src/lib/rcap/documents/",
  "supabase/"
];

// Fixed lane definition. Model assignment is recorded because it is part of the
// dispatch decision, not an implementation detail: the A and B groups are wide
// mechanical evidence sweeps, C and D are small and adjudicative.
const LANES = [
  { laneId: "E2-A1", group: "E2-A", model: "claude-fable-5" },
  { laneId: "E2-A2", group: "E2-A", model: "claude-fable-5" },
  { laneId: "E2-A3", group: "E2-A", model: "claude-fable-5" },
  { laneId: "E2-B1", group: "E2-B", model: "claude-fable-5" },
  { laneId: "E2-B2", group: "E2-B", model: "claude-fable-5" },
  { laneId: "E2-B3", group: "E2-B", model: "claude-fable-5" },
  { laneId: "E2-C", group: "E2-C", model: "claude-opus-5" },
  { laneId: "E2-D", group: "E2-D", model: "claude-opus-5" }
];

// Contiguous split on sorted ids rather than round-robin: jobs sort by
// jurisdiction, so contiguous chunks keep a jurisdiction's statutory research in
// one lane wherever a chunk boundary allows it.
function splitContiguous(items, parts) {
  const out = [];
  let index = 0;
  for (let part = 0; part < parts; part += 1) {
    const size = Math.ceil((items.length - index) / (parts - part));
    out.push(items.slice(index, index + size));
    index += size;
  }
  return out;
}

const byGroup = {};
for (const job of queue.jobs) {
  (byGroup[job.group] ??= []).push(job.jobId);
}
for (const ids of Object.values(byGroup)) ids.sort();

const laneCountByGroup = {};
for (const lane of LANES) laneCountByGroup[lane.group] = (laneCountByGroup[lane.group] ?? 0) + 1;

const chunksByGroup = {};
for (const [group, ids] of Object.entries(byGroup)) {
  chunksByGroup[group] = splitContiguous(ids, laneCountByGroup[group] ?? 1);
}

const cursorByGroup = {};
const lanes = LANES.map((lane) => {
  const index = (cursorByGroup[lane.group] = (cursorByGroup[lane.group] ?? -1) + 1);
  const jobIds = chunksByGroup[lane.group]?.[index] ?? [];
  const jurisdictions = [...new Set(jobIds.map((id) => queue.jobs.find((j) => j.jobId === id).jurisdiction))].sort();
  return {
    laneId: lane.laneId,
    group: lane.group,
    model: lane.model,
    jobCount: jobIds.length,
    jurisdictions,
    evidencePath: `data/rcap-ledger/e2-evidence/${lane.laneId}.json`,
    reportPath: `docs/record-clearing/e2-evidence/${lane.laneId}.md`,
    jobIds
  };
});

// Coverage and exclusivity are proven, not assumed.
const assigned = lanes.flatMap((lane) => lane.jobIds);
const assignedSet = new Set(assigned);
const allIds = queue.jobs.map((job) => job.jobId).sort();
const unassigned = allIds.filter((id) => !assignedSet.has(id));
const duplicated = assigned.length !== assignedSet.size;
if (unassigned.length > 0 || duplicated) {
  console.error(
    `Partition is not a partition: ${unassigned.length} unassigned, ${assigned.length - assignedSet.size} duplicated.`
  );
  process.exit(1);
}

const document = {
  schemaVersion: "rcap-e2-dispatch-assignment/v1",
  generatedBy: "scripts/generate-rcap-e2-dispatch-assignment.mjs",
  purpose:
    "Partition the frozen E2 evidence queue across eight dispatched lanes so every job is claimed exactly once and no two lanes write the same path.",
  input: {
    queue: "data/rcap-ledger/e2-evidence-jobs.json",
    queueSha256: queueDigest,
    crosswalkContentHash: queue.input?.crosswalkContentHash ?? null,
    totalJobs: queue.totalJobs
  },
  laneContract: {
    startsFrom: "the latest clean origin/claude/rcap-final-sprint-integration descendant that contains 72574ecc",
    consumes: "only the jobIds assigned to the lane below",
    writes: "only the lane's own evidencePath and reportPath",
    prohibitedPaths: PROHIBITED_PATHS,
    mayNotResolve:
      "A lane records evidence; it never edits the canonical crosswalk or a compiled profile. E3 adjudicates the recorded evidence into those artifacts in one controlled pass.",
    terminalization:
      "A job may be closed as terminal only by proving the required evidence does not exist. Name similarity is never evidence, a compiled pathway is never deleted to balance a jurisdiction, and a registry track is never invented."
  },
  totals: {
    lanes: lanes.length,
    jobsAssigned: assigned.length,
    jobsUnassigned: unassigned.length
  },
  lanes
};

const serialized = `${JSON.stringify(document, null, 2)}\n`;

const reportLines = [];
reportLines.push("# RCAP E2 Dispatch Assignment");
reportLines.push("");
reportLines.push(
  `Generated by \`scripts/generate-rcap-e2-dispatch-assignment.mjs\` from \`data/rcap-ledger/e2-evidence-jobs.json\` (sha256 \`${queueDigest.slice(0, 16)}\`, crosswalk contentHash \`${(queue.input?.crosswalkContentHash ?? "").slice(0, 16)}\`).`
);
reportLines.push("");
reportLines.push(
  `All **${assigned.length}** frozen jobs are assigned, each to exactly one lane. The partition is asserted in the generator: a job that went missing would otherwise be indistinguishable from a job that was closed.`
);
reportLines.push("");
reportLines.push("| Lane | Group | Model | Jobs | Jurisdictions | Evidence path |");
reportLines.push("| --- | --- | --- | ---: | ---: | --- |");
for (const lane of lanes) {
  reportLines.push(
    `| ${lane.laneId} | ${lane.group} | \`${lane.model}\` | ${lane.jobCount} | ${lane.jurisdictions.length} | \`${lane.evidencePath}\` |`
  );
}
reportLines.push("");
reportLines.push("## Why lanes do not edit the crosswalk");
reportLines.push("");
reportLines.push(
  "Each frozen job names `ownedPaths` on the canonical crosswalk or a compiled profile. Those are shared: several jobs in different lanes would contend for one file, and the crosswalk is generated output rather than a place to record findings. So an E2 lane writes only its own evidence file, and E3 adjudicates the collected evidence into the crosswalk in a single pass."
);
reportLines.push("");
reportLines.push(
  "This also keeps the closure rule honest. A lane that could edit the crosswalk could close its own row; a lane that can only record evidence cannot. Milestone 1 item 2 stays blocked until adjudication, not until dispatch completes."
);
reportLines.push("");
reportLines.push("## Paths no lane may write");
reportLines.push("");
for (const p of PROHIBITED_PATHS) reportLines.push(`- \`${p}\``);
reportLines.push("");

const report = `${reportLines.join("\n")}\n`;

if (check) {
  const currentJson = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  const currentReport = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, "utf8") : "";
  if (currentJson !== serialized || currentReport !== report) {
    console.error("E2 dispatch assignment is stale. Run: npm run rcap:e2-dispatch-assignment");
    process.exit(1);
  }
  console.log(`E2 dispatch assignment current. ${lanes.length} lanes, ${assigned.length} jobs.`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(outputPath, serialized);
fs.writeFileSync(reportPath, report);

console.log(`E2 dispatch assignment written: ${lanes.length} lanes, ${assigned.length} jobs`);
for (const lane of lanes) {
  console.log(`  ${lane.laneId.padEnd(6)} ${String(lane.jobCount).padStart(3)}  ${lane.model}`);
}
console.log(`  json:   ${path.relative(rootDir, outputPath)}`);
console.log(`  report: ${path.relative(rootDir, reportPath)}`);
