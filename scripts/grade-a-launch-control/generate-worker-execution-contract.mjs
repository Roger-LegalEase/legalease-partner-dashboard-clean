#!/usr/bin/env node
// The execution contract the next wave is dispatched under.
//
//   node scripts/grade-a-launch-control/generate-worker-execution-contract.mjs [--check]
//
// Four defects in the first wave were mine, not the workers'. Each is derived
// here from the mechanical return review rather than restated, so the contract
// cannot drift from the evidence that produced it.
//
// WHY THE CURRENT DISPATCH IS NOT REWRITTEN
//
// C11 is still running against ACTIVE_CODEX_ASSIGNMENTS.json as committed.
// Regenerating that manifest now would change the assignment underneath a live
// worker -- its row list, its owned paths, the file it was told to verify
// against -- which is a worse failure than the one being fixed. So this contract
// binds the NEXT dispatch, and the current one is left exactly as C11 read it.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECK = process.argv.includes("--check");
const OUT = "data/rcap-grade-a/launch-control/WORKER_EXECUTION_CONTRACT.json";
const LC = "data/rcap-grade-a/launch-control";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const review = read(`${LC}/WAVE_1_RETURN_REVIEW.json`);
const residual = read(`${LC}/RESIDUAL_WORK.json`);
const dispatch = read(`${LC}/ACTIVE_CODEX_ASSIGNMENTS.json`);
const status = read(`${LC}/CATEGORY_B_INTEGRATION_STATUS.json`);

const finding = (id) => review.systemicFindings.find((f) => f.id === id);
const problems = [];
for (const id of ["SYS-A", "SYS-B", "SYS-C", "SYS-D"]) {
  if (!finding(id)) problems.push(`${id} is missing from the return review; the contract cannot be derived from evidence that is not there`);
}
if (problems.length > 0) {
  console.error(`worker execution contract: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const egress = residual.lanes.find((l) => l.residualLaneId === "R4_SOURCE_IDENTITY_AND_ACQUISITION").detail.egressByExactSource;

const doc = {
  schemaVersion: "rcap-grade-a-worker-execution-contract/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-worker-execution-contract.mjs",
  question: "What has to be true of the next dispatch so the first wave's four self-inflicted failures cannot repeat?",
  bindsFromWave: 2,
  derivedFrom: `${LC}/WAVE_1_RETURN_REVIEW.json`,
  currentDispatchDeliberatelyNotRewritten: {
    manifest: `${LC}/ACTIVE_CODEX_ASSIGNMENTS.json`,
    captainBaseSha: dispatch.captainBaseSha,
    why: "C11_PACKET_FACTORY_ACCELERATOR is still running against this manifest. Regenerating it would change a live worker's row list, owned paths and verification target mid-flight, which is worse than the defect being fixed.",
    appliesInstead: "the next dispatch, generated after C11 returns"
  },

  clauses: [
    {
      id: "WEC-1",
      title: "Two commits, stated as two commits",
      because: finding("SYS-A").finding,
      evidence: finding("SYS-A").evidence,
      requirement: [
        "Every prompt states the control baseline it branches from AND says the assignment is read from the Captain branch tip, not from the baseline.",
        "The manifest carries a readAssignmentFrom block naming the branch and the exact command to read it.",
        "The worker verifies that the manifest's captainBaseSha equals the commit it branched from, and stops if it does not.",
        "No prompt lists the assignment manifest among required inputs resolvable at the baseline, because it is not there."
      ],
      workerSetupBlock: [
        "git fetch origin --prune",
        "git checkout -b <workerBranch> <captainBaseSha>",
        "git show origin/claude/legalease-sprint-captain-utucnw:data/rcap-grade-a/launch-control/ACTIVE_CODEX_ASSIGNMENTS.json > /tmp/assignment.json",
        "# stop unless /tmp/assignment.json captainBaseSha === <captainBaseSha>"
      ]
    },
    {
      id: "WEC-2",
      title: "A stated environment precondition, and an honest failure when it is not met",
      because: finding("SYS-B").finding,
      evidence: finding("SYS-B").evidence,
      requirement: [
        "Each assignment states the minimum free disk its lane needs before any command runs.",
        "A lane that cannot install the toolchain returns DEPENDENCIES_UNINSTALLABLE with the observed free space, and reports every test it could not run as BLOCKED with that reason.",
        "A test that could not run is never reported as passed, skipped, or not applicable.",
        "No partial node_modules or cache is left behind."
      ],
      minimumFreeDiskMib: 4096,
      observedWorstCaseFreeDiskMib: 32
    },
    {
      id: "WEC-3",
      title: "Egress recorded per exact source, never per wave",
      because: finding("SYS-C").finding,
      evidence: finding("SYS-C").evidence,
      requirement: [
        "No assignment carries a blanket 'blocked on egress' stop condition. A blanket rule pre-empts the evidence and stopped 49 obligations against hosts that answered.",
        "Each acquisition target carries its own last-probe result, and the worker acts on that result.",
        "A host recorded as refused is escalated, not re-probed. A host recorded as reachable is attempted.",
        "Reaching a host is not acquiring a document: a HEAD probe proves reachability only, and acquisition still requires the body and its SHA-256."
      ],
      lastProbe: egress
    },
    {
      id: "WEC-4",
      title: "The nonproduction authorization stays unspent until its preconditions hold",
      because: finding("SYS-D").finding,
      evidence: {
        authorizationConsumed: residual.lanes.find((l) => l.residualLaneId === "R5_NONPRODUCTION_ACCEPTANCE").detail.authorizationConsumed,
        provenSyntheticForThisRun: residual.lanes.find((l) => l.residualLaneId === "R5_NONPRODUCTION_ACCEPTANCE").detail.provenSyntheticForThisRun,
        migrationApplied: residual.lanes.find((l) => l.residualLaneId === "R5_NONPRODUCTION_ACCEPTANCE").detail.migrationApplied
      },
      requirement: [
        "The hosted-acceptance lane is not redispatched until the pinned project can be proven synthetic from the executing session and a credential authorized for its organization exists there.",
        "authorizationConsumed stays false. Roger's one-time authorization was not spent and is not re-requested.",
        "Redispatching it into an environment that cannot reach the project spends a worker to re-derive a blocker that is already recorded."
      ]
    },
    {
      id: "WEC-5",
      title: "Required outputs are specified as a schema, not as a filename",
      because: "Seven lanes returned seven shapes for the same two filenames, so no verifier could prove a route was completed rather than merely mentioned, and a translation layer had to be written after the fact.",
      evidence: {
        lanesReviewed: status.byLane.length,
        distinctStatusWordsObserved: Object.keys(status.statusVocabularyObserved).length,
        adapterLayer: "scripts/grade-a-launch-control/generate-category-b-integration-status.mjs"
      },
      requirement: [
        "Each assignment names the exact array key, the exact route-key field and the exact completion vocabulary its output must use.",
        "The permitted completion words are COMPLETED and STOPPED, with the lane's detail in separate fields rather than encoded in the status string.",
        "A return using a word outside that vocabulary is refused at integration rather than translated.",
        "A completed row names the participant A branch route key or keys it settled on; a row that names none is not complete."
      ],
      canonicalCompletionVocabulary: ["COMPLETED", "STOPPED"]
    },
    {
      id: "WEC-6",
      title: "A stop condition stops a row, and says so",
      because: "C8's stop condition was written as a lane-level sentence. The worker read it as stopping the lane, audited all 37 citations, found one genuine conflict and implemented nothing, so one conflicted row held thirty-six others.",
      evidence: {
        lane: "C8_ALREADY_ANSWERED_ENGINEERING",
        rowsExpected: 37,
        rowsImplemented: 0,
        rowsGenuinelyConflicted: 1
      },
      requirement: [
        "Every stop condition states its scope in its own text: this row stops and the lane continues, or the lane stops.",
        "A lane-level stop is reserved for a condition that makes the remaining rows unsafe or meaningless, and the assignment says why.",
        "A row-level stop is recorded per row and never prevents the next row from being attempted."
      ]
    }
  ],

  appliesTo: {
    residualLanes: residual.lanes.map((l) => l.residualLaneId),
    note: "Every residual lane is dispatched under this contract. A dispatch generated without it is a defect the checkpoint refuses."
  }
};

const serialized = JSON.stringify(doc, null, 2) + "\n";
const outPath = path.join(ROOT, OUT);

if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current !== serialized) { console.error(`${OUT} is stale or missing. Run the generator.`); process.exit(1); }
  console.log(`worker execution contract current: ${doc.clauses.length} clause(s), binds from wave ${doc.bindsFromWave}.`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, serialized);
console.log(`Wrote ${OUT}\n`);
for (const c of doc.clauses) console.log(`  ${c.id}  ${c.title}`);
console.log(`\n  binds from wave ${doc.bindsFromWave} · ${doc.appliesTo.residualLanes.length} residual lane(s) · current dispatch left intact for C11`);
