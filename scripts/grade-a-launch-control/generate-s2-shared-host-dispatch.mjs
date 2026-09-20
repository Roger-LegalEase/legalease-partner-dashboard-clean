#!/usr/bin/env node
// The shared host P1, P3 and P4 may not touch, fixed once by a lane that can.
//
//   node scripts/grade-a-launch-control/generate-s2-shared-host-dispatch.mjs [--check]
//
// P1, P3 and P4 all import build-census-v1-ne-setaside-custodial-set.mjs and all
// three are prohibited from changing it, because its importers reach past every
// one of their family sets into two C11-stopped families owned by R3 and R4.
// Their stop conditions tell them to report upward. Waiting for three lanes to
// stop before dispatching the fix they will all stop on spends a whole cycle
// discovering something the import graph already proves.
//
// So S2 is dispatched now, in parallel, and it is deliberately narrow: it owns
// the host and its own directory, renders nothing, and touches no overlay.
//
// COUNT RECONCILIATION
//
// Two numbers have been quoted for this host and both were right about
// different things. The import graph is the authority, and it says 12.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECK = process.argv.includes("--check");
const OUT = "data/rcap-grade-a/launch-control/S2_SHARED_HOST_ASSIGNMENT.json";
const PROMPT_DIR = "docs/rcap/grade-a/launch-control/completeness-repair-prompts";
const LC = "data/rcap-grade-a/launch-control";
const SCRIPTS = "scripts";
const CAPTAIN_BRANCH = "claude/legalease-sprint-captain-utucnw";
const HOST = "scripts/build-census-v1-ne-setaside-custodial-set.mjs";
const ASSIGNMENT_ID = "S2_SHARED_NE_SETASIDE_HOST_COMPLETENESS";
const SLUG = "s2-shared-ne-setaside-host-completeness";

const CAPTAIN_BASE_SHA = "09ada500b42b7e2181b30155412bb7e70176b70b";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const wave2 = read(`${LC}/WAVE_2_ASSIGNMENTS.json`);
const repairWave = read(`${LC}/COMPLETENESS_REPAIR_WAVE.json`);
const c11 = read(`${LC}/C11_RETURN_REVIEW.json`);
const matrix = read("data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json");

const norm = (id) => String(id).replace(/_/g, "-").toLowerCase();
const familyIdOf = (script) => path.basename(script).replace(/^build-census-v1-/, "").replace(/\.mjs$/, "");

// ---- the import graph, recomputed here rather than quoted --------------------------
const scriptFiles = fs.readdirSync(path.join(ROOT, SCRIPTS)).filter((f) => /^build-census-v1-.+\.mjs$/.test(f));
const directImports = new Map();
for (const file of scriptFiles) {
  const src = fs.readFileSync(path.join(ROOT, SCRIPTS, file), "utf8");
  directImports.set(file, [...new Set([...src.matchAll(/from\s+["']\.\/(build-census-v1-[^"']+\.mjs)["']/g)].map((m) => m[1]))]);
}
const hostBase = path.basename(HOST);
const memo = new Map();
const reachesHost = (file, seen = new Set()) => {
  if (memo.has(file)) return memo.get(file);
  if (file === hostBase) { memo.set(file, true); return true; }
  if (seen.has(file)) return false;
  seen.add(file);
  const r = (directImports.get(file) ?? []).some((d) => reachesHost(d, seen));
  memo.set(file, r);
  return r;
};
const directImporters = scriptFiles.filter((f) => f !== hostBase && (directImports.get(f) ?? []).includes(hostBase)).sort();
const transitiveImporters = scriptFiles.filter((f) => f !== hostBase && reachesHost(f)).sort();

const problems = [];
if (!fs.existsSync(path.join(ROOT, HOST))) problems.push(`${HOST} does not exist`);

// ---- who each importer is ----------------------------------------------------------
const laneOf = (familyId) => {
  for (const a of [...repairWave.assignments, ...wave2.assignments]) {
    if ((a.items ?? []).some((i) => norm(i) === norm(familyId))) return a.assignmentId;
  }
  return null;
};
const familyRecord = (familyId) => c11.families.find((f) => norm(f.familyId) === norm(familyId)) ?? null;
const matrixRecord = (familyId) => matrix.results.find((r) => norm(r.familyId) === norm(familyId)) ?? null;

const importers = transitiveImporters.map((script) => {
  const familyId = familyIdOf(script);
  const rec = familyRecord(familyId);
  const m = matrixRecord(familyId);
  return {
    familyId,
    buildScript: `${SCRIPTS}/${script}`,
    importKind: directImporters.includes(script) ? "direct" : "transitive-only",
    c11Classification: rec?.classification ?? "NOT_A_C11_FAMILY",
    owningLane: laneOf(familyId),
    completenessResultNow: m?.result ?? null,
    countersNow: m ? Object.fromEntries(Object.entries(m.counters).filter(([, v]) => v > 0)) : null
  };
});
const hostFamilyId = familyIdOf(hostBase);
const hostFamily = {
  familyId: hostFamilyId,
  c11Classification: familyRecord(hostFamilyId)?.classification ?? "NOT_A_C11_FAMILY",
  owningLane: laneOf(hostFamilyId),
  completenessResultNow: matrixRecord(hostFamilyId)?.result ?? null,
  note: "The host is itself a built family. Its packet is repaired by its own lane, not by S2; S2 changes only the shared logic inside its build script."
};

const built = importers.filter((i) => i.c11Classification === "BUILT");
const stopped = importers.filter((i) => i.c11Classification !== "BUILT");

const countReconciliation = {
  authoritative: transitiveImporters.length,
  authority: "the transitive import graph over scripts/build-census-v1-*.mjs, recomputed at generation time",
  directImporters: directImporters.length,
  transitiveOnlyImporters: transitiveImporters.length - directImporters.length,
  whyTenWasQuoted: `${built.length} of the ${transitiveImporters.length} importers are BUILT families inside the S1-unaffected repair wave, and that is the number the family-level view showed. It was right about built families and silent about the rest.`,
  whyTwelveWasQuoted: `${transitiveImporters.length} scripts import the host. That is the number the prompt tables showed, because ownership is decided by scripts, not by families.`,
  theTwoThatExplainTheGap: stopped.map((s) => ({ familyId: s.familyId, c11Classification: s.c11Classification, owningLane: s.owningLane })),
  scriptsInTheClosure: transitiveImporters.length + 1,
  builtFamiliesInTheClosure: built.length + (hostFamily.c11Classification === "BUILT" ? 1 : 0),
  verdict: `Both numbers were correct about different populations and neither was stated with its scope. The import graph controls: ${transitiveImporters.length} importers, ${transitiveImporters.length + 1} scripts in the closure once the host is counted.`
};

// ---- the deterministic dependency-consumption contract ------------------------------
//
// P1, P3 and P4 keep the owned paths and prompts they were dispatched with. What
// they lack is a defined way to consume S2's result, and "wait and see" is not
// one: three lanes each deciding when the host is ready produces three different
// answers. The sequence below is the only one, and step 3 is what makes it
// deterministic -- a committed record naming the exact base, rather than a
// worker judging whether S2 has landed.
const dependencyConsumption = {
  appliesTo: ["P1_UT_PETITION_EXPUNGE_COMPLETENESS", "P3_WV_CONVICTION_COMPLETENESS", "P4_NE_SD_SETASIDE_COMPLETENESS"],
  theirOwnedPathsAreUnchanged: true,
  theirPromptsAreUnchanged: true,
  whyNothingOfTheirsChanges: "They already carry a stop condition sending an unresolvable host defect to Captain. This contract is what Captain does with it, so nothing they were dispatched with has to move underneath them.",
  whatTheyMayDoNow: [
    "every blank disposition, route-option selection, row completion and component decision that does not require the host to change",
    "the full per-family completeness ledger and the required_before_filing classification",
    "everything except a re-render that depends on corrected host logic"
  ],
  sequence: [
    { step: 1, actor: "S2 worker", action: `returns on codex/${SLUG} with the corrected host and a before/after fleet audit` },
    { step: 2, actor: "Captain", action: `verifies the return, confirms it modified ${HOST} and nothing else, and integrates it by cherry-picking the exact commit` },
    { step: 3, actor: "Captain", action: `runs the completeness fleet audit and publishes ${LC}/S2_CONTINUATION.json naming the integration commit, the per-family counter movement, and the exact continuation base` },
    { step: 4, actor: "P1, P3, P4", action: "rebase the worker branch onto the continuation base named in that record, then re-render" },
    { step: 5, actor: "Captain", action: "reruns the fleet audit and confirms every repaired family reaches PASS_COMPLETE" }
  ],
  continuationRecord: `${LC}/S2_CONTINUATION.json`,
  rule: "A lane may not re-render against a host it has not confirmed by ancestry. The continuation record names the commit; the worker checks that its base is an ancestor of it, and stops if it is not.",
  ancestryCheck: "git merge-base --is-ancestor <continuationBase> HEAD"
};

// ---- the assignment ------------------------------------------------------------------
const assignment = {
  assignmentId: ASSIGNMENT_ID,
  wave: "completeness-repair-addendum",
  engine: "Codex",
  lane: "shared-host-fix",
  sequence: 1,
  workerBranch: `codex/${SLUG}`,
  captainBaseSha: CAPTAIN_BASE_SHA,
  readAssignmentFrom: { branch: CAPTAIN_BRANCH, file: OUT, verify: `captainBaseSha must equal ${CAPTAIN_BASE_SHA}` },
  parentManifest: `${LC}/WAVE_2_ASSIGNMENTS.json`,
  siblingManifest: `${LC}/COMPLETENESS_REPAIR_WAVE.json`,
  mission: `Correct the completeness defects carried by ${HOST}, once, for all ${transitiveImporters.length} scripts that import it. You render no packet and you touch no overlay directory: this lane changes shared logic and measures what that does to every importer.`,
  itemKind: "sharedModule",
  itemCount: 1,
  items: [HOST],
  hostImporters: { count: transitiveImporters.length, direct: directImporters.length, families: importers, hostFamily },
  countReconciliation,
  ownedPaths: [`data/rcap-grade-a/wave-2/${SLUG}/**`, HOST],
  rendersNoPackets: true,
  modifiesNoOverlayDirectories: true,
  scopeOfCorrection: {
    inScope: [
      "shared fact-map defects: a known participant or case fact the host refuses with a statement of build policy rather than a property of the field",
      "blank-disposition defects: a blank the host leaves with no approved disposition from the closed vocabulary",
      "route-option defects: an election the route determines that the host leaves to the participant",
      "row-completion defects: a repeating row the host fills partially, which reads as a finished row and is not",
      "component-policy defects: a document the host maps into the packet and never renders"
    ],
    outOfScope: [
      "any packet render",
      "any overlay directory",
      "any other build script, including the two S1 runners",
      "any change that is a per-family correction rather than shared logic — if it belongs to one family it belongs to that family's lane"
    ],
    rule: "Correct only what the host actually carries. A defect that turns out to be per-family is reported to the owning lane, not fixed here."
  },
  requiredMeasurement: {
    before: "node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --write, captured before any edit",
    after: "the same command after the correction",
    report: `every one of the ${built.length + 1} built families in the closure, with counters before and after, plus any family outside the closure whose counters moved — a family outside the closure that moves means the change was not confined to this host`,
    rule: "Report movement, not improvement. A counter that rises is as important as one that falls, and a family outside the closure that moves at all is a finding."
  },
  requiredInputs: [
    `${OUT}  (read from the Captain branch tip, not from the baseline)`,
    "scripts/rcap-packet-completeness/completeness-contract.mjs",
    "data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json",
    `${LC}/COMPLETENESS_REPAIR_WAVE.json`,
    "docs/rcap/grade-a/route-obligation-census/PACKET_WORKER_BRIEF.md"
  ],
  requiredOutputs: [
    `data/rcap-grade-a/wave-2/${SLUG}/rows.json — one row per defect corrected in the host: itemId, status, the defect class, the field classes it affected, and the importer families it reaches`,
    `data/rcap-grade-a/wave-2/${SLUG}/fleet-audit-before-after.json — the full completeness matrix before and after, and the per-family counter movement for every family in the closure`,
    `${HOST} — the corrected shared host`
  ],
  outputSchema: {
    requirement: "WEC-5: the output schema is fixed, not left to the lane.",
    arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"],
    rule: "Detail goes in separate fields. An unrecognised status is refused at integration rather than translated."
  },
  focusedTests: [
    "node scripts/rcap-packet-completeness/verify-packet-completeness.mjs",
    "node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --mutations",
    "node scripts/grade-a-launch-control/verify-launch-control.mjs",
    "npm run typecheck"
  ],
  stopConditions: [
    "WEC-6: every stop below states its scope. A ROW stop records that defect and continues; a LANE stop says why the rest are unsafe without it.",
    "LANE STOP — you render no packet and you write into no overlay directory. Re-rendering belongs to P1, P3, P4 and the host family's own lane, after Captain publishes the continuation record.",
    "LANE STOP — you own one build script. Do not touch the two S1 runners, any other build script, or any other lane's paths.",
    "NEVER invent a fact. A fact the platform does not hold is classified required_before_filing and surfaced to the participant, not guessed. A guessed arresting agency is worse than a blank one: the blank is visible and the guess is not.",
    "NEVER write a protected field — participant signature, signature date, certificate of mailing before mailing, or any court-only or prosecutor-only field.",
    `ROW STOP — a defect that is per-family rather than shared is reported to the owning lane (${[...new Set(importers.map((i) => i.owningLane).filter(Boolean))].join(", ")}) and left alone.`,
    "ROW STOP — a correction that would move a family outside the closure stops and is reported. Its blast radius is the twelve importers and the host, and nothing else."
  ],
  dependencyConsumption,
  returnFormat: [
    "ASSIGNMENT:", "WORKER BRANCH:", "BASE SHA:", "ASSIGNMENT READ FROM:", "COMMIT:",
    "HOST DEFECTS CORRECTED:", "DEFECT CLASSES:",
    "IMPORTER FAMILIES WHOSE COUNTERS MOVED:", "FAMILIES OUTSIDE THE CLOSURE THAT MOVED: 0",
    "PACKETS RENDERED: 0", "OVERLAY DIRECTORIES MODIFIED: 0",
    "FACTS CLASSIFIED REQUIRED_BEFORE_FILING:",
    "STOPPED AND REPORTED:", "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO"
  ],
  promptFile: `${PROMPT_DIR}/${ASSIGNMENT_ID}.md`,
  grantsNothing: "A corrected host is corrected logic. It renders no packet, proves no packet, opens no route and approves no output."
};

// ---- refusals --------------------------------------------------------------------------
{
  const owned = assignment.ownedPaths.map((p) => p.replace(/\/?\*\*$/, ""));
  if (owned.length !== 2) problems.push(`S2 owns ${owned.length} paths; it owns exactly its directory and the host`);
  for (const p of owned) {
    if (/^data\/rcap-all50\/overlays\//.test(p)) problems.push(`S2 owns overlay path ${p}; it renders nothing`);
  }
  // No collision with any lane in either manifest.
  const others = [...wave2.assignments, ...repairWave.assignments];
  for (const a of others) {
    for (const p of a.ownedPaths) {
      const root = p.split("(")[0].trim().replace(/\/?\*\*$/, "");
      for (const mine of owned) {
        if (mine === root || mine.startsWith(`${root}/`) || root.startsWith(`${mine}/`)) {
          problems.push(`S2 owns ${mine}, which collides with ${a.assignmentId}`);
        }
      }
    }
  }
  // The host must be prohibited to the lanes that may not change it.
  for (const id of dependencyConsumption.appliesTo) {
    const lane = repairWave.assignments.find((a) => a.assignmentId === id);
    if (!lane) { problems.push(`${id} is named in the dependency contract and is not dispatched`); continue; }
    if (!lane.prohibitedPaths.includes(HOST)) problems.push(`${id} does not prohibit ${HOST}, so the contract would be describing a restriction that is not there`);
    if (lane.ownedPaths.includes(HOST)) problems.push(`${id} owns ${HOST}; two lanes would change one file`);
  }
  // Every output must name a path inside what S2 owns.
  const pathLike = /(?:^|[\s`"'(])((?:data|scripts|docs|src|supabase)\/[A-Za-z0-9_./<>-]+)/g;
  for (const line of assignment.requiredOutputs) {
    const found = [...String(line).matchAll(pathLike)].map((m) => m[1].replace(/[.,;]$/, ""));
    if (found.length === 0) problems.push("S2 has a required output naming no path");
    for (const target of found) {
      if (!owned.some((o) => target === o || target.startsWith(`${o}/`) || o.startsWith(`${target}/`))) {
        problems.push(`S2 owes an output at ${target}, outside every path it owns`);
      }
    }
  }
  const prohibitedOverlap = assignment.ownedPaths.filter((p) => (assignment.prohibitedPaths ?? []).includes(p));
  if (prohibitedOverlap.length > 0) problems.push(`S2 both owns and prohibits ${prohibitedOverlap.join(", ")}`);
  const PLACEHOLDER = /\b(TBD|TODO|FIXME|XXX)\b|<placeholder>|__[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*__/;
  if (PLACEHOLDER.test(JSON.stringify({ ...assignment, requiredOutputs: undefined, focusedTests: undefined, stopConditions: undefined, requiredInputs: undefined }))) {
    problems.push("S2 contains a placeholder value");
  }
  if (!/^[0-9a-f]{40}$/.test(CAPTAIN_BASE_SHA)) problems.push("S2 has no real control-baseline SHA");
  if (transitiveImporters.length === 0) problems.push("the host has no importers; there would be nothing shared to fix");
}

if (problems.length > 0) {
  console.error(`S2 dispatch: ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 12)) console.error(`  - ${p}`);
  process.exit(1);
}

const doc = {
  schemaVersion: "rcap-s2-shared-host-assignment/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-s2-shared-host-dispatch.mjs",
  question: "Three repair lanes import a host none of them may change. Who changes it, and how do they consume the result?",
  thisIsAnAddendum: {
    parentManifest: `${LC}/WAVE_2_ASSIGNMENTS.json`,
    siblingManifest: `${LC}/COMPLETENESS_REPAIR_WAVE.json`,
    why: "S1, R8, the seven shards and P1 to P4 are published against bases their workers may already hold. This record names them instead of regenerating them, and every collision check runs across all three."
  },
  host: HOST,
  countReconciliation,
  dependencyConsumption,
  totals: {
    assignments: 1,
    importers: transitiveImporters.length,
    builtFamiliesInClosure: countReconciliation.builtFamiliesInTheClosure,
    overlayPathsOwned: 0,
    packetsRendered: 0,
    collisions: 0,
    placeholders: 0
  },
  commercialPosture: "S2 corrects shared build logic. It opens no commercial route, renders no packet, proves nothing and approves nothing.",
  assignments: [assignment]
};

const serialized = JSON.stringify(doc, null, 2) + "\n";

function promptFor(a) {
  const list = (items) => (items.length === 0 ? "_none_" : items.map((i) => `- \`${i}\``).join("\n"));
  const p = [];
  p.push(`# ${a.assignmentId}`, "");
  p.push(`**Engine:** ${a.engine}  ·  **Lane:** ${a.lane}  ·  **Runs first**`);
  p.push(`**Worker branch:** \`${a.workerBranch}\``);
  p.push(`**Branch from:** \`${a.captainBaseSha}\``);
  p.push(`**Read this assignment from:** \`origin/${a.readAssignmentFrom.branch}\` → \`${a.readAssignmentFrom.file}\``);
  p.push("**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean", "");
  p.push("> The assignment manifest is NOT in the commit you branch from. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.", "");
  p.push("## Mission", "", a.mission, "");
  p.push("## The host and who depends on it", "");
  p.push(`\`${a.items[0]}\``, "");
  p.push(`**${a.hostImporters.count} importers**, all direct (${a.hostImporters.direct} direct, ${a.countReconciliation.transitiveOnlyImporters} transitive-only). With the host itself that is **${a.countReconciliation.scriptsInTheClosure} scripts** and **${a.countReconciliation.builtFamiliesInTheClosure} built families** in the closure.`, "");
  p.push("| Family | C11 status | Owning lane | Completeness now |");
  p.push("| --- | --- | --- | --- |");
  for (const i of a.hostImporters.families) {
    p.push(`| \`${i.familyId}\` | ${i.c11Classification} | ${i.owningLane ?? "—"} | ${i.completenessResultNow ?? "—"} |`);
  }
  p.push(`| \`${a.hostImporters.hostFamily.familyId}\` **(the host itself)** | ${a.hostImporters.hostFamily.c11Classification} | ${a.hostImporters.hostFamily.owningLane} | ${a.hostImporters.hostFamily.completenessResultNow} |`);
  p.push("");
  p.push(`_${a.hostImporters.hostFamily.note}_`, "");
  p.push("### Why two counts have been quoted", "");
  p.push(a.countReconciliation.verdict, "");
  p.push(`- **${a.countReconciliation.authoritative}** — ${a.countReconciliation.whyTwelveWasQuoted}`);
  p.push(`- **${a.hostImporters.families.filter((f) => f.c11Classification === "BUILT").length}** — ${a.countReconciliation.whyTenWasQuoted}`);
  p.push(`- The gap is ${a.countReconciliation.theTwoThatExplainTheGap.map((t) => `\`${t.familyId}\` (${t.c11Classification}, ${t.owningLane})`).join(" and ")}.`);
  p.push("");
  p.push("## What you correct", "");
  p.push("**In scope — only what the host actually carries:**", "");
  p.push(a.scopeOfCorrection.inScope.map((s) => `- ${s}`).join("\n"), "");
  p.push("**Out of scope:**", "");
  p.push(a.scopeOfCorrection.outOfScope.map((s) => `- ${s}`).join("\n"), "");
  p.push("", a.scopeOfCorrection.rule, "");
  p.push("## Measurement you owe", "");
  p.push(`- **before** — \`${a.requiredMeasurement.before}\``);
  p.push(`- **after** — \`${a.requiredMeasurement.after}\``);
  p.push(`- **report** — ${a.requiredMeasurement.report}`);
  p.push("", a.requiredMeasurement.rule, "");
  p.push("## Owned paths — write only here", "", list(a.ownedPaths), "");
  p.push("**You render zero packets and modify zero overlay directories.**", "");
  p.push("## Required inputs", "", list(a.requiredInputs), "");
  p.push("## Required outputs", "", a.requiredOutputs.map((o) => `- ${o}`).join("\n"), "");
  p.push("### Output schema", "");
  p.push(`${a.outputSchema.requirement} Array key \`${a.outputSchema.arrayKey}\`, item key \`${a.outputSchema.itemKeyField}\`, completion words ${a.outputSchema.completionVocabulary.map((v) => `\`${v}\``).join(" and ")} only.`);
  p.push("", a.outputSchema.rule, "");
  p.push("## Focused tests", "", list(a.focusedTests), "");
  p.push("## Stop conditions", "", a.stopConditions.map((s) => `- ${s}`).join("\n"), "");
  p.push("Stopping with an honest account of what is missing is a complete return.", "");
  p.push("## How P1, P3 and P4 consume your result", "");
  p.push(a.dependencyConsumption.whyNothingOfTheirsChanges, "");
  p.push("| Step | Actor | Action |");
  p.push("| ---: | --- | --- |");
  for (const s of a.dependencyConsumption.sequence) p.push(`| ${s.step} | ${s.actor} | ${s.action} |`);
  p.push("");
  p.push(`${a.dependencyConsumption.rule} \`${a.dependencyConsumption.ancestryCheck}\``, "");
  p.push("## Return format", "", "```text", a.returnFormat.join("\n"), "```", "");
  p.push("## What finishing does not do", "", a.grantsNothing, "");
  p.push("## Setup", "", "```sh");
  p.push("git fetch origin --prune");
  p.push(`git checkout -b ${a.workerBranch} ${a.captainBaseSha}`);
  p.push(`git show origin/${a.readAssignmentFrom.branch}:${a.readAssignmentFrom.file} > /tmp/s2-assignment.json`);
  p.push(`# STOP unless /tmp/s2-assignment.json captainBaseSha === ${a.captainBaseSha}`);
  p.push("npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free");
  p.push("bash scripts/rcap-corpus/bootstrap-private-corpus.sh");
  p.push("source private/source-corpus-environment.txt");
  p.push('export MASTER_LIBRARY_SOURCE_DIR="$RCAP_BUNDLE_EXTRACT"');
  p.push("```", "");
  p.push(`Commit your work and \`git push -u origin ${a.workerBranch}\`.`, "");
  return p.join("\n");
}

const outPath = path.join(ROOT, OUT);
const promptPath = path.join(ROOT, assignment.promptFile);

if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current !== serialized) { console.error(`${OUT} is stale or missing. Run the generator.`); process.exit(1); }
  if (!fs.existsSync(promptPath) || fs.readFileSync(promptPath, "utf8") !== promptFor(assignment)) {
    console.error(`${assignment.promptFile} is stale or missing.`); process.exit(1);
  }
  console.log(`S2 dispatch current: ${transitiveImporters.length} importer(s), ${assignment.ownedPaths.length} owned path(s), 0 overlay paths.`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(path.dirname(promptPath), { recursive: true });
fs.writeFileSync(outPath, serialized);
fs.writeFileSync(promptPath, promptFor(assignment));
console.log(`Wrote ${OUT}`);
console.log(`Wrote ${assignment.promptFile}\n`);
console.log(`  host importers: ${transitiveImporters.length} (${directImporters.length} direct) · built in closure: ${countReconciliation.builtFamiliesInTheClosure}`);
console.log(`  owned paths: ${assignment.ownedPaths.length} · overlay paths: 0 · packets rendered: 0`);
console.log(`  ${countReconciliation.verdict}`);
