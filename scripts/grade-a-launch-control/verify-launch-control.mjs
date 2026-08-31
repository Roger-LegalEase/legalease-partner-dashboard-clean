#!/usr/bin/env node
// The four-hour checkpoint verifier.
//
//   node scripts/grade-a-launch-control/verify-launch-control.mjs [--mutations]
//
// Forty-eight refusals. Each is a way the control plane could look healthy while
// being wrong, and each has cost something in this sprint or in the one before
// it. A checkpoint that only reports numbers tells you what it was told; this
// asks whether it was told the truth.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MUTATIONS = process.argv.includes("--mutations");
const LC = "data/rcap-grade-a/launch-control/GRADE_A_LAUNCH_CONTROL.json";
const STATUS = "docs/rcap/grade-a/launch-control/GRADE_A_LAUNCH_STATUS.md";
const REUSE = "data/rcap-grade-a/launch-control/EXISTING_WORK_REUSE_INDEX.json";
const DISPATCH = "data/rcap-grade-a/launch-control/ACTIVE_CODEX_ASSIGNMENTS.json";
const SUPERSEDED = "data/rcap-grade-a/launch-control/SUPERSEDED_STATUS_RECORDS.json";
const DELTA = "data/rcap-grade-a/launch-control/CATEGORY_B_REVALIDATION_INTEGRATION_DELTA.json";
const CROSSWALK = "data/rcap-grade-a/launch-control/CATEGORY_B_STAGE_BRANCH_CROSSWALK.json";
const FREEZE = "data/rcap-grade-a/route-obligation-census-v1/FREEZE.json";
const WAVE_REVIEW = "data/rcap-grade-a/launch-control/WAVE_1_RETURN_REVIEW.json";
const INTEGRATION = "data/rcap-grade-a/launch-control/CATEGORY_B_INTEGRATION_STATUS.json";
const RESIDUAL = "data/rcap-grade-a/launch-control/RESIDUAL_WORK.json";
const CONTRACT = "data/rcap-grade-a/launch-control/WORKER_EXECUTION_CONTRACT.json";
const COUNSEL = "data/rcap-grade-a/launch-control/COUNSEL_DETERMINATION_DELTA.json";
const C11 = "data/rcap-grade-a/launch-control/C11_RETURN_REVIEW.json";
const C11_STOPS = "data/rcap-grade-a/launch-control/C11_STOP_CLASSIFICATION.json";
const WAVE2 = "data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json";
const COMPLETENESS = "data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json";
const REPAIR_PLAN = "data/rcap-grade-a/packet-completeness/COMPLETENESS_REPAIR_PLAN.json";
const REPAIR_WAVE = "data/rcap-grade-a/launch-control/COMPLETENESS_REPAIR_WAVE.json";
const S2 = "data/rcap-grade-a/launch-control/S2_SHARED_HOST_ASSIGNMENT.json";
const MASS = "data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json";
const MASS_COLLISIONS = "data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150_COLLISIONS.json";
const MASS_CHECKPOINT = "data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150_CHECKPOINT.json";
const WORKLIST = "data/rcap-grade-a/launch-control/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST.json";
const WAVE2_REPAIRS = "data/rcap-grade-a/launch-control/WAVE_2_REPAIR_ASSIGNMENTS.json";
const CONTINUATION = "data/rcap-grade-a/launch-control/S2_CONTINUATION.json";
// Ten committed binaries already matched a private-corpus SHA-256 before the
// packet factory returned, under hard-forms/*/evidence/ and rcap-codex source
// receipts. They are a governance discrepancy for Roger, not something to remove
// retroactively -- but the number must never grow. C11 would have taken it to 62.
const KNOWN_COMMITTED_CORPUS_BINARIES = 10;
const PROMPTS = "docs/rcap/grade-a/launch-control/prompts";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 29, stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };

const results = [];
let failures = 0;
const check = (id, title, passed, observed = "") => {
  results.push({ id, title, passed });
  if (!passed) failures += 1;
  console.log(`  ${passed ? "ok  " : "FAIL"} ${id} ${title}`);
  if (!passed && observed) console.log(`         observed: ${observed}`);
};

const lc = read(LC);
const reuse = read(REUSE);
const dispatch = read(DISPATCH);
const superseded = read(SUPERSEDED);
const delta = read(DELTA);
const crosswalk = read(CROSSWALK);
const freeze = read(FREEZE);
const waveReview = read(WAVE_REVIEW);
const integration = read(INTEGRATION);
const residual = read(RESIDUAL);
const contract = read(CONTRACT);
const counsel = read(COUNSEL);
const c11 = read(C11);
const c11Stops = read(C11_STOPS);
const wave2 = fs.existsSync(path.join(ROOT, WAVE2)) ? read(WAVE2) : null;
const completeness = read(COMPLETENESS);
const repairPlan = read(REPAIR_PLAN);
const repairWave = fs.existsSync(path.join(ROOT, REPAIR_WAVE)) ? read(REPAIR_WAVE) : null;
const s2 = fs.existsSync(path.join(ROOT, S2)) ? read(S2) : null;
const mass = fs.existsSync(path.join(ROOT, MASS)) ? read(MASS) : null;
const massCollisions = fs.existsSync(path.join(ROOT, MASS_COLLISIONS)) ? read(MASS_COLLISIONS) : null;
const massCheckpoint = fs.existsSync(path.join(ROOT, MASS_CHECKPOINT)) ? read(MASS_CHECKPOINT) : null;
const continuation = fs.existsSync(path.join(ROOT, CONTINUATION)) ? read(CONTINUATION) : null;

/** Everything an assignment owns, whatever shape its rows take. */
const rowsOf = (a) => [
  ...(a.routeKeys ?? []),
  ...(a.rowGroups ?? []).flatMap((g) => [...(g.obligations ?? []), ...(g.families ?? [])])
];
const familiesOf = (a) => (a.rowGroups ?? []).flatMap((g) => g.families ?? []);

// 1. Two records claiming current authority.
{
  const claimants = [];
  const scan = (rel) => {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) return;
    if (/thisIsTheControllingLaunchRecord/.test(fs.readFileSync(full, "utf8"))) claimants.push(rel);
  };
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (entry.name.endsWith(".json")) scan(rel);
    }
  };
  walk("data/rcap-grade-a");
  check("A1", "exactly one record claims current launch authority", claimants.length === 1, claimants.join(", "));
  const listed = new Set(superseded.superseded.map((s) => s.record));
  check("A2", "every superseded status record points at the controlling one",
    superseded.controllingRecord === LC
    && superseded.controllingAssignmentManifest === DISPATCH
    && listed.size === superseded.superseded.length,
    `controlling ${superseded.controllingRecord}, manifest ${superseded.controllingAssignmentManifest}`);
}

// 2. Duplicate route/family ownership across assignments.
{
  const seen = new Map(); const dupes = [];
  for (const a of dispatch.assignments) for (const row of rowsOf(a)) {
    if (seen.has(row)) dupes.push(`${row}: ${seen.get(row)} + ${a.assignmentId}`); else seen.set(row, a.assignmentId);
  }
  check("A3", "no row or family is owned by two assignments", dupes.length === 0, dupes.slice(0, 3).join(" | "));
}

// 3. Placeholder assignment values.
{
  const bad = dispatch.assignments.filter((a) => /\b(TBD|TODO|FIXME|XXX)\b/i.test(JSON.stringify(a)));
  check("A4", "no assignment carries a placeholder value", bad.length === 0, bad.map((a) => a.assignmentId).join(", "));
}

// 4. Overlapping worker-owned paths.
{
  const roots = new Map(); const clashes = [];
  for (const a of dispatch.assignments) for (const p of a.ownedPaths) {
    const root = p.split("(")[0].trim();
    if (roots.has(root) && roots.get(root) !== a.assignmentId) clashes.push(`${root}: ${roots.get(root)} + ${a.assignmentId}`);
    roots.set(root, a.assignmentId);
  }
  check("A5", "no two assignments own the same path", clashes.length === 0, clashes.slice(0, 3).join(" | "));
}

// 5. An assignment based on a nonancestor.
{
  const base = dispatch.captainBaseSha;
  const isAncestor = git(["merge-base", "--is-ancestor", base, "HEAD"]) !== null;
  check("A6", "every assignment branches from a commit that is an ancestor of the current tip", isAncestor, base);
  check("A7", "every assignment records that same base",
    dispatch.assignments.every((a) => a.captainBaseSha === base));
}

// 6. An active assignment lacking a reuse decision.
{
  const withoutReuse = dispatch.assignments.filter((a) => a.reuseChecked !== true);
  check("A8", "every assignment carries a reuse record", withoutReuse.length === 0, withoutReuse.map((a) => a.assignmentId).join(", "));
  // A packet lane may only receive a family that is free to dispatch -- but only
  // while the lane is still open. Once it returns, its families have evidence
  // BECAUSE it built them, and reading that as "dispatched a family that already
  // had evidence" would turn a lane doing its job into a failure.
  const returned = new Set(waveReview.reviews.filter((r) => r.commit !== null).map((r) => r.id));
  const free = new Set(reuse.families.filter((f) => f.freeToDispatch).map((f) => f.worklistGroupId));
  const wrong = [];
  for (const a of dispatch.assignments.filter((x) => x.lane === "packet" && !returned.has(x.assignmentId))) {
    for (const family of familiesOf(a)) if (!free.has(family)) wrong.push(`${a.assignmentId}:${family}`);
  }
  check("A9", "no open packet lane is given a family that already has evidence", wrong.length === 0, wrong.slice(0, 3).join(", "));
}

// 7. A completed assignment without a worker commit.
{
  const completedWithoutCommit = dispatch.assignments.filter((a) => a.status === "completed" && !a.workerCommit);
  check("A10", "no assignment is marked completed without a worker commit",
    completedWithoutCommit.length === 0, completedWithoutCommit.map((a) => a.assignmentId).join(", "));
}

// 8. A family counted as built without required evidence.
{
  const overlays = path.join(ROOT, "data/rcap-all50/overlays/census-v1");
  const missingEvidence = [];
  if (fs.existsSync(overlays)) {
    for (const state of fs.readdirSync(overlays)) {
      const stateDir = path.join(overlays, state);
      if (!fs.statSync(stateDir).isDirectory()) continue;
      for (const family of fs.readdirSync(stateDir)) {
        const dir = path.join(stateDir, family);
        const hasFixtures = fs.existsSync(path.join(dir, "fixtures"));
        const hasSourceReceipt = fs.readdirSync(dir).some((f) => /source-(receipt|verification|gate|binding)/.test(f));
        if (hasFixtures && !hasSourceReceipt) missingEvidence.push(`${state}/${family}`);
      }
    }
  }
  check("A11", "no family carries rendered fixtures without a source record",
    missingEvidence.length === 0, missingEvidence.join(", "));
}

// 9. A route counted commercially open without Grade-A proof.
{
  const opened = lc.productPath.commercialRoutesOpened;
  const proven = lc.packetFamilies.completePacketProven;
  check("A12", "no route is commercially open without a proven packet behind it",
    opened === 0 || opened <= proven, `opened ${opened}, proven ${proven}`);
}

// 10. Unexplained denominator movement.
{
  const d = lc.denominator;
  check("A13", "the launch record's denominator is the frozen census denominator",
    d.terminalObligations === freeze.totals.totalObligations
    && d.categoryA === freeze.totals.categoryA
    && d.categoryB === freeze.totals.categoryB
    && d.packetFamilies === freeze.totals.packetFamilies,
    `${d.terminalObligations}/${d.categoryA}/${d.categoryB}/${d.packetFamilies} vs frozen ${freeze.totals.totalObligations}/${freeze.totals.categoryA}/${freeze.totals.categoryB}/${freeze.totals.packetFamilies}`);
}

// 11. A stale checkpoint claiming current status.
//
// Exact equality with HEAD cannot be the test: the record is committed, and
// committing it moves HEAD past it. That is the same self-reference the
// two-commit dispatch method exists to avoid, and demanding equality would make
// the check impossible to satisfy rather than hard to fool.
//
// The real question is whether anything the record DEPENDS ON has changed since
// it was generated. So: the recorded tip must be an ancestor of HEAD, and every
// record the launch control consumes must be byte-identical between that tip and
// HEAD. A launch record generated before a commit that did not touch its inputs
// is still current; one generated before a commit that did is not.
{
  const recorded = lc.lineage.captainSha;
  const head = git(["rev-parse", "HEAD"]);
  const isAncestor = recorded === head || git(["merge-base", "--is-ancestor", recorded, "HEAD"]) !== null;
  check("A14", "the launch record was generated at a commit that is still in this history", isAncestor,
    `record ${String(recorded).slice(0, 8)} is not an ancestor of head ${String(head).slice(0, 8)}`);

  const drifted = [];
  if (isAncestor && recorded !== head) {
    for (const consumed of Object.values(lc.consumes)) {
      if (git(["rev-parse", `${recorded}:${consumed}`]) !== git(["rev-parse", `HEAD:${consumed}`])) drifted.push(consumed);
    }
  }
  check("A15", "no record the launch control consumes has changed since it was generated",
    drifted.length === 0,
    `${drifted.length} input(s) moved: ${drifted.join(", ")} — regenerate rather than reading a stale checkpoint as current`);
}

// 12. A classified route assigned to nobody, or to the wrong lane.
//
// The 55 came back classified. If a route falls out of the assignment manifest,
// nothing rebuilds it and nothing reports it missing: it simply stops existing
// as work. This is the check that makes "no participant branch silently
// dropped" true of the DISPATCH and not only of the delta.
{
  const laneById = new Map(delta.rows.map((r) => [r.originalRouteKey, r.assignedLaneKey]));
  const assigned = new Map();
  for (const a of dispatch.assignments.filter((x) => x.lane === "category-b-implementation")) {
    for (const key of a.routeKeys) assigned.set(key, a.assignmentId);
  }
  const missing = [...laneById.keys()].filter((k) => !assigned.has(k));
  check("A16", "every classified Category B route is assigned to exactly one archetype lane",
    missing.length === 0 && assigned.size === delta.counts.rows,
    `${assigned.size} of ${delta.counts.rows} assigned; missing ${missing.slice(0, 3).join(", ")}`);
  const misrouted = [...assigned.entries()].filter(([key, id]) => laneById.get(key) !== id);
  check("A17", "no route is assigned to a lane the integration delta does not route it to",
    misrouted.length === 0, misrouted.slice(0, 3).map(([k, id]) => `${k}: delta says ${laneById.get(k)}, manifest says ${id}`).join(" | "));
}

// 13. An answered research lane back in the dispatch.
{
  const OBSOLETE = /^C[1-4]_CATEGORY_B_EVIDENCE_SHARD_[1-4]$/;
  const revived = dispatch.assignments.filter((a) => OBSOLETE.test(a.assignmentId));
  const researchScoped = dispatch.assignments.filter((a) =>
    /classif|re-?research|assemble the exclusion evidence/i.test(a.mission) && a.lane === "category-b-implementation");
  check("A18", "no answered Category B research lane is dispatched",
    revived.length === 0 && researchScoped.length === 0,
    [...revived, ...researchScoped].map((a) => a.assignmentId).join(", "));
}

// 14. A prompt file no assignment claims.
//
// A prompt is an instruction to a worker. One that no manifest entry claims is a
// dispatchable assignment with no reuse record, no collision check and no owner
// — which is exactly the shape the retired research prompts had.
{
  const expected = new Set(dispatch.assignments.map((a) => `${a.assignmentId}.md`));
  const dir = path.join(ROOT, PROMPTS);
  const present = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".md")) : [];
  const stray = present.filter((f) => !expected.has(f));
  const absent = [...expected].filter((f) => !present.includes(f));
  check("A19", "every dispatched assignment has a prompt and no prompt is unclaimed",
    stray.length === 0 && absent.length === 0,
    `${stray.length} unclaimed: ${stray.join(", ")}; ${absent.length} missing: ${absent.join(", ")}`);
}

// 15. The launch record restating the integration delta instead of reading it.
{
  const c = lc.categoryBIntegration;
  const d = delta.counts;
  const agrees = c.rows === d.rows
    && c.aBranchesAlreadyExisting === d.aBranchesAlreadyExisting
    && c.aBranchesNewlyRequired === d.aBranchesNewlyRequired
    && c.categoryBStagesRetained === d.categoryBStagesRetained
    && c.newPacketFamiliesRequired === d.newPacketFamiliesRequired
    && c.stageBranchPairs === crosswalk.pairs.length
    && c.confirmedBStages === crosswalk.confirmedBStages.length
    && c.convertedToA === crosswalk.convertedToA.length;
  check("A20", "the launch record's Category B counts are the delta's, not a second set",
    agrees,
    `launch ${c.rows}/${c.aBranchesAlreadyExisting}/${c.aBranchesNewlyRequired}/${c.newPacketFamiliesRequired} vs delta ${d.rows}/${d.aBranchesAlreadyExisting}/${d.aBranchesNewlyRequired}/${d.newPacketFamiliesRequired}`);
}

// 16. A branch-identity lane owning a packet-family path.
//
// A jurisdiction's packet family is shared across archetypes -- Michigan's
// official-PDF family is implicated by three lanes -- so a lane that both names
// and owns it would race two other lanes to create three conflicting families
// for one jurisdiction.
{
  const offenders = [];
  for (const a of dispatch.assignments.filter((x) => x.lane === "category-b-implementation")) {
    for (const p of a.ownedPaths) if (/data\/rcap-all50\/(overlays|pleadings)/.test(p)) offenders.push(`${a.assignmentId}:${p}`);
  }
  check("A21", "no branch-identity lane owns a packet-family path", offenders.length === 0, offenders.join(", "));
}

// 17. The human-readable mirror disagreeing with the record it mirrors.
{
  const statusPath = path.join(ROOT, STATUS);
  const text = fs.existsSync(statusPath) ? fs.readFileSync(statusPath, "utf8") : "";
  const says = (needle) => text.includes(needle);
  check("A22", "the launch status mirror reports the record's own GO/HOLD and denominator",
    text.length > 0
    && says(`**GO/HOLD: ${lc.goHold.decision}.**`)
    && says(`| Terminal obligations | ${lc.denominator.terminalObligations} |`)
    && says(`| A branches newly required | ${lc.categoryBIntegration.aBranchesNewlyRequired} |`)
    && says(`| New packet families required | ${lc.categoryBIntegration.newPacketFamiliesRequired} |`),
    text.length === 0 ? `${STATUS} is missing` : "the mirror does not carry the record's values");
}

// 18. A worker return that wrote where it was not allowed, or opened anything.
{
  const w = waveReview.summary;
  check("A23", "no return wrote outside its lane, touched a prohibited path, opened a route or touched Production",
    w.outOfScopeWrites === 0 && w.prohibitedPathViolations === 0 && w.commercialRoutesOpened === 0 && w.productionTouched === false && w.refused === 0,
    `outside ${w.outOfScopeWrites}, prohibited ${w.prohibitedPathViolations}, opened ${w.commercialRoutesOpened}, production ${w.productionTouched}, refused ${w.refused}`);
}

// 19. Work that stopped and then vanished, or finished work re-dispatched.
//
// A stopped route missing from the residual is not "pending": it is a route
// nobody holds. A completed route present in the residual spends a worker on
// finished work. Both are checked here against the committed records rather than
// trusted from the generator that wrote them.
{
  const stopped = integration.rows.filter((r) => r.integrationStatus === "STOPPED").map((r) => r.routeKey);
  const completed = new Set(integration.rows.filter((r) => r.integrationStatus === "COMPLETED").map((r) => r.routeKey));
  const residualRoutes = new Set(residual.lanes.flatMap((l) => (l.itemKind === "routeKey" ? l.items : [])));
  const dropped = stopped.filter((k) => !residualRoutes.has(k));
  const repeated = [...residualRoutes].filter((k) => completed.has(k));
  check("A24", "every stopped route is carried into the residual and no completed route is repeated",
    dropped.length === 0 && repeated.length === 0,
    `${dropped.length} dropped: ${dropped.slice(0, 2).join(", ")}; ${repeated.length} repeated: ${repeated.slice(0, 2).join(", ")}`);
}

// 20. A residual lane reaching into a lane that is still running.
{
  const running = waveReview.reviews.filter((r) => r.verdict === "STILL_RUNNING_NOT_REVIEWED");
  const reserved = running.flatMap((r) => (r.ownedPaths ?? []).map((p) => p.split("(")[0].trim().replace(/\/?\*\*$/, "")));
  const intruders = [];
  for (const lane of residual.lanes) {
    for (const p of lane.ownedPaths) {
      const root = p.replace(/\/?\*\*$/, "");
      for (const r of reserved) if (root === r || root.startsWith(`${r}/`) || r.startsWith(`${root}/`)) intruders.push(`${lane.residualLaneId} -> ${r}`);
    }
  }
  check("A25", "no residual lane claims a path a still-running lane owns",
    intruders.length === 0 && residual.notYetResidual.reservedPaths.length === reserved.length,
    intruders.join(", ") || (reserved.length === 0
      ? "no lane is still running; every path is released"
      : `${reserved.length} reserved path(s)`));
}

// 21. The launch record restating the wave instead of reading it.
{
  const w = lc.waveOne;
  const agrees = w.branchIdentities.completed === integration.counts.completed
    && w.branchIdentities.stopped === integration.counts.stopped
    && w.branchIdentities.newBranchIdentitiesIntegrated === integration.counts.newBranchIdentitiesIntegrated
    && w.branchIdentities.crosswalksIntegrated === integration.counts.crosswalksIntegrated
    && w.branchIdentities.packetFamiliesCreated === 0
    && w.residual.residualRoutes === residual.counts.residualRoutes
    && w.residual.residualAcquisitions === residual.counts.residualAcquisitions
    && w.stillRunning === waveReview.summary.stillRunning;
  check("A26", "the launch record's wave numbers are the wave records', not a second set", agrees,
    `launch ${w.branchIdentities.completed}/${w.branchIdentities.stopped}/${w.residual.residualRoutes} vs records ${integration.counts.completed}/${integration.counts.stopped}/${residual.counts.residualRoutes}`);
}

// 22. A residual lane dispatched without the contract that exists to fix the
//     defect that produced it.
{
  const covered = new Set(contract.appliesTo.residualLanes);
  const uncovered = residual.lanes.map((l) => l.residualLaneId).filter((id) => !covered.has(id));
  check("A27", "every residual lane is covered by the worker execution contract",
    uncovered.length === 0 && contract.clauses.length > 0, uncovered.join(", "));
}

// 23. A counsel determination read as a simpler instruction than it is.
//
// Three of the four answers are Category A, and two of those three carry a
// condition that changes what may be built: New York's obligation splits into
// two date-specific subroutes, and four of Utah's nine branches refuse without
// signed prosecutorial consent. A tree that recorded "Category A" and dropped
// the condition would generate a legally inaccurate packet, which is the exact
// failure the determination exists to prevent.
{
  const nySplit = counsel.rows.find((r) => r.classification === "CATEGORY_A_MANDATORY_ROUTE_SPLIT");
  const utGated = counsel.rows.find((r) => r.classification === "CATEGORY_A_WITH_SEPARATELY_GATED_BRANCHES");
  const gatedCount = (utGated?.gatedBranches ?? []).filter((b) => b.prosecutorConsentRequired).length;
  check("A28", "every counsel determination keeps the condition attached to its answer",
    counsel.counts.questionsAnswered === counsel.counts.questionsAsked
    && (nySplit?.mandatorySubroutes.length ?? 0) >= 2
    && gatedCount > 0
    && gatedCount === counsel.counts.branchesGatedBehindConsent,
    `answered ${counsel.counts.questionsAnswered}/${counsel.counts.questionsAsked}, NY subroutes ${nySplit?.mandatorySubroutes.length ?? 0}, UT gated ${gatedCount}`);

  // The determinations are projections. The frozen census must still hold them
  // as NEEDS_LEGAL_REVIEW: an answer that silently moved the ledger would be a
  // denominator movement nobody explained.
  const stillUnmoved = counsel.rows.every((r) => r.censusCategoryBefore === "NEEDS_LEGAL_REVIEW");
  check("A29", "no counsel determination has moved the census by hand",
    stillUnmoved && counsel.projectedDenominator.frozen.needsLegalReview === freeze.totals.needsLegalReview,
    `frozen legal review ${counsel.projectedDenominator.frozen.needsLegalReview} vs census ${freeze.totals.needsLegalReview}`);

  // Every answered route has to be carried by a residual lane, or the answer
  // produces no work and the four questions were asked for nothing.
  const residualRoutes = new Set(residual.lanes.flatMap((l) => (l.itemKind === "routeKey" ? l.items : [])));
  const uncarried = counsel.rows.map((r) => r.routeKey).filter((k) => !residualRoutes.has(k));
  check("A30", "every counsel-determined route is carried into a residual lane", uncarried.length === 0, uncarried.join(", "));
}

// 24. Private corpus bytes entering the repository.
//
// The corpus governance keeps 583 source files out of git and commits only their
// SHA-256 index. The packet factory committed 52 of them; they were excluded at
// integration. This is the check that makes the exclusion stick: hash every
// committed binary and count how many the index knows. The count may fall. It
// may never rise.
{
  const inventory = read("data/rcap-all50/nationwide-source-inventory.json");
  const corpus = new Set();
  for (const state of inventory.states ?? []) for (const f of state.files ?? []) if (f.sha256) corpus.add(String(f.sha256).toLowerCase());
  const binaries = (git(["ls-tree", "-r", "--name-only", "HEAD"]) ?? "").split("\n").filter((f) => /\.(pdf|docx?|rtf)$/i.test(f));
  const hits = [];
  for (const file of binaries) {
    try {
      const sha = crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, file))).digest("hex");
      if (corpus.has(sha)) hits.push(file);
    } catch { /* unreadable file is not a corpus hit */ }
  }
  check("A31", "no new private-corpus binary has entered the repository",
    hits.length <= KNOWN_COMMITTED_CORPUS_BINARIES,
    `${hits.length} committed binaries match a private-corpus sha256; the known pre-existing count is ${KNOWN_COMMITTED_CORPUS_BINARIES}${hits.length > KNOWN_COMMITTED_CORPUS_BINARIES ? `: ${hits.slice(KNOWN_COMMITTED_CORPUS_BINARIES, KNOWN_COMMITTED_CORPUS_BINARIES + 3).join(", ")}` : ""}`);
}

// 25. The packet factory's return, and what "built" is allowed to mean.
{
  check("A32", "the packet-factory return is accepted and every stopped family is classified",
    /^ACCEPTED/.test(c11.verdict)
    && c11Stops.counts.stoppedFamilies === c11.summary.stopped
    && c11.summary.commercialRoutesOpened === 0
    && c11.summary.outputApprovalsGranted === 0,
    `verdict ${c11.verdict}, stopped ${c11.summary.stopped} classified ${c11Stops.counts.stoppedFamilies}, approvals ${c11.summary.outputApprovalsGranted}`);

  // Built is not proven. Until an independent shard returns, the number of
  // independently verified packets is zero, and the launch record must say so.
  check("A33", "no built packet family is counted as proven without independent verification",
    lc.waveOne.packetFactory.packetsProvenIndependently === 0
    && lc.packetFamilies.completePacketProven === 0
    && lc.waveOne.packetFactory.familiesBuilt === c11.summary.built,
    `built ${lc.waveOne.packetFactory.familiesBuilt}, independently verified ${lc.waveOne.packetFactory.packetsProvenIndependently}, proven ${lc.packetFamilies.completePacketProven}`);
}

// 26. The Wave 2 dispatch, and the Wave 1 defect it exists to close.
if (wave2) {
  const base = wave2.captainBaseSha;
  const baseIsAncestor = git(["merge-base", "--is-ancestor", base, "HEAD"]) !== null;
  // The manifest must not be SELF-REFERENTIAL: the base it names must not already
  // contain the manifest being dispatched. On a first dispatch that means the
  // file is absent at the base. On a re-dispatch -- this wave has had two, the
  // second carrying the completeness contract -- the file legitimately exists at
  // the base holding the PREVIOUS wave's content, and demanding absence would
  // make a corrected dispatch impossible rather than hard to fool. So the test
  // is content: the blob at the base must differ from the blob being dispatched.
  const blobAtBase = git(["rev-parse", `${base}:${WAVE2}`]);
  const blobAtHead = git(["rev-parse", `HEAD:${WAVE2}`]);
  const selfReferential = blobAtBase !== null && blobAtBase === blobAtHead;
  check("A34", "Wave 2 names a real ancestor as its base, and that base does not already carry this dispatch",
    baseIsAncestor && !selfReferential && /^[0-9a-f]{40}$/.test(base),
    `base ${String(base).slice(0, 8)}, ancestor ${baseIsAncestor}, manifest at base ${blobAtBase === null ? "absent" : blobAtBase === blobAtHead ? "IDENTICAL — self-referential" : "present, earlier content"}`);

  // Every worker is told where to read the assignment, since it is not in their
  // checkout. This is the Wave 1 failure, stated as a check rather than a hope.
  const missingRead = wave2.assignments.filter((a) => !a.readAssignmentFrom?.branch || !a.readAssignmentFrom?.file || a.readAssignmentFrom.file !== WAVE2);
  check("A35", "every Wave 2 assignment says where to read itself from, and it is not the baseline",
    missingRead.length === 0, missingRead.map((a) => a.assignmentId).join(", "));

  const shards = wave2.assignments.filter((a) => a.lane === "independent-verification");
  const verified = shards.flatMap((a) => a.items);
  const built = c11.families.filter((f) => f.classification === "BUILT").map((f) => f.familyId);
  const dupes = verified.filter((f, i) => verified.indexOf(f) !== i);
  const omitted = built.filter((f) => !verified.includes(f));
  check("A36", "every built family is independently verified exactly once, by someone who did not build it",
    dupes.length === 0 && omitted.length === 0 && verified.length === built.length
    && shards.every((a) => a.items.length >= 6 && a.items.length <= 8)
    && shards.every((a) => a.workerBranch !== "codex/c11-packet-factory-accelerator"),
    `${verified.length} of ${built.length} across ${shards.length} shard(s); ${dupes.length} duplicate, ${omitted.length} omitted`);

  // A review package before an independent PASS would bind Lawrence's approval
  // to hashes nobody has checked.
  check("A37", "no output-legal review package exists before an independent PASS",
    wave2.outputLegalReview.batchesPrepared === 0 && wave2.productPathVerification.lanesDispatched === 0,
    `review batches ${wave2.outputLegalReview.batchesPrepared}, product-path lanes ${wave2.productPathVerification.lanesDispatched}`);

  const undispatched = residual.lanes.filter((l) => !wave2.assignments.some((a) => a.assignmentId === l.residualLaneId));
  check("A38", "every residual lane is dispatched in Wave 2", undispatched.length === 0, undispatched.map((l) => l.residualLaneId).join(", "));
}

// 27. Completeness, and the four revoked classifications.
//
// A packet that writes six of a hundred and eighty-seven fields can satisfy every
// build check ever written for it. These refuse the two ways that fact could be
// lost: a family counted complete that the contract fails, and a revoked PASS
// quietly carrying an output-legal review package.
{
  const audited = completeness.results.length;
  const claimedComplete = completeness.results.filter((r) => r.result === "PASS_COMPLETE");
  const wrong = claimedComplete.filter((r) => Object.values(r.counters).some((n) => n > 0));
  check("A39", "no family is reported PASS_COMPLETE with a nonzero completeness counter",
    wrong.length === 0 && audited > 0,
    `${audited} audited, ${claimedComplete.length} complete, ${wrong.length} with a nonzero counter`);

  const revoked = new Set(repairPlan.passRevocation.families);
  const stillPassing = [...revoked].filter((f) => completeness.results.find((r) => r.familyId === f)?.result === "PASS_COMPLETE");
  check("A40", "every revoked PASS family is reclassified and carries no review package",
    revoked.size === 4 && stillPassing.length === 0
    && repairPlan.passRevocation.newClassification === "PASS_REVOKED_PENDING_COMPLETENESS_RECHECK"
    && repairPlan.passRevocation.lawrenceReviewPackagesPrepared === 0,
    `${revoked.size} revoked, ${stillPassing.length} still passing, ${repairPlan.passRevocation.lawrenceReviewPackagesPrepared} package(s)`);

  // The launch record must read the contract's numbers, not restate them.
  const lcc = lc.waveOne.packetFactory.completeness;
  check("A41", "the launch record's completeness numbers are the contract's, not a second set",
    lcc.familiesAudited === completeness.familiesAudited
    && lcc.passComplete === (completeness.byResult.PASS_COMPLETE ?? 0)
    && lcc.counterTotals.knownRequiredFieldsMissing === completeness.counterTotals.knownRequiredFieldsMissing
    && lcc.passRevoked.length === repairPlan.passRevocation.families.length,
    `launch ${lcc.familiesAudited}/${lcc.passComplete} vs contract ${completeness.familiesAudited}/${completeness.byResult.PASS_COMPLETE ?? 0}`);

  if (wave2) {
    const shard = wave2.assignments.find((a) => a.lane === "independent-verification");
    const adopted = (shard?.proofObligations ?? []).filter((o) => o.startsWith("COMPLETENESS:")).length;
    const r8 = wave2.assignments.find((a) => a.assignmentId === "R8_COMPLETENESS_REPAIR_PRIORITY_FOUR");
    check("A42", "the verification shards adopt the completeness contract and the four repairs are dispatched",
      adopted >= 9 && r8 !== undefined && r8.items.length === 4
      && r8.items.every((f) => revoked.has(f)),
      `${adopted} completeness obligation(s) on each shard; R8 carries ${r8?.items.length ?? 0} famil(ies)`);
  }
}

// 28. An assignment that cannot legally write what it owes.
//
// The R8 prompt owned one wave-2 directory and required a corrected field map,
// an updated source receipt and re-rendered artifacts inside four overlay
// directories it did not own. A worker reading that either stops or breaks its
// own scope, and neither is noticed until integration. When this check was first
// run it found two MORE lanes with the same defect.
if (wave2) {
  const pathLike = /(?:^|[\s`"'(])((?:data|scripts|docs|src|supabase)\/[A-Za-z0-9_./<>-]+)/g;
  const unwritable = [];
  for (const a of wave2.assignments) {
    const owned = a.ownedPaths.map((p) => p.split("(")[0].trim().replace(/\/?\*\*$/, ""));
    for (const line of a.requiredOutputs) {
      const found = [...String(line).matchAll(pathLike)];
      // A pathless output cannot be checked at all, which is how the original R8
      // contradiction survived: "inside each family's existing overlay directory"
      // names files without saying where they land.
      if (found.length === 0) unwritable.push(`${a.assignmentId} -> output names no path`);
      for (const m of found) {
        const target = m[1].replace(/[.,;]$/, "");
        const ok = owned.some((o) => target === o || target.startsWith(`${o}/`) || o.startsWith(`${target}/`));
        if (!ok) unwritable.push(`${a.assignmentId} -> ${target}`);
      }
    }
  }
  check("A43", "every required output names a path, and every path is inside what the assignment owns",
    unwritable.length === 0, unwritable.slice(0, 3).join(" | "));

  // A verifier that owns a repair path can repair what it judges.
  const impure = wave2.assignments.filter((a) => a.lane === "independent-verification")
    .flatMap((a) => a.ownedPaths.filter((p) => /^data\/rcap-all50\//.test(p) || /^scripts\/build-census-v1-/.test(p)).map((p) => `${a.assignmentId}:${p}`));
  check("A44", "no verification shard owns a repair path", impure.length === 0, impure.join(", "));

  // A shared module changed per family forks the fleet. One lane owns the two
  // runners twenty-four families import, and the repairs wait for it.
  const s1 = wave2.assignments.find((a) => a.assignmentId === "S1_SHARED_FACT_ALLOWLIST");
  const r8 = wave2.assignments.find((a) => a.assignmentId === "R8_COMPLETENESS_REPAIR_PRIORITY_FOUR");
  const r7 = wave2.assignments.find((a) => a.assignmentId === "R7_PACKET_REPAIR");
  const sharedFiles = (wave2.sharedRepairSurface?.runners ?? []).map((r) => r.file);
  const r8HoldsShared = sharedFiles.filter((f) => (r8?.ownedPaths ?? []).includes(f));
  const overlap = (r7?.items ?? []).filter((f) => (r8?.items ?? []).includes(f));
  check("A45", "the shared runners are owned once, sequenced ahead of the repairs, and held by nobody else",
    s1 !== undefined && sharedFiles.length > 0
    && sharedFiles.every((f) => s1.ownedPaths.includes(f))
    && r8HoldsShared.length === 0
    && (r8?.dependsOn ?? []).includes("S1_SHARED_FACT_ALLOWLIST")
    && (s1.sequence ?? 99) < (r8?.sequence ?? 0)
    && overlap.length === 0,
    `S1 owns ${sharedFiles.length} runner(s); R8 holds ${r8HoldsShared.length}; R7/R8 overlap ${overlap.length}`);
}

// 29. The completeness repair addendum, and its two ways of going wrong.
if (repairWave && wave2) {
  // Nothing in it may reach an S1 runner, own an S1 or R8 path, or collide with
  // the parent manifest it is subordinate to.
  const s1Files = new Set(wave2.sharedRepairSurface.runners.map((r) => r.file));
  const r8 = wave2.assignments.find((a) => a.assignmentId === "R8_COMPLETENESS_REPAIR_PRIORITY_FOUR");
  const r8Paths = (r8?.ownedPaths ?? []).map((p) => p.replace(/\/?\*\*$/, ""));
  const parentPaths = wave2.assignments.flatMap((a) => a.ownedPaths.map((p) => p.split("(")[0].trim().replace(/\/?\*\*$/, "")));
  const violations = [];
  const seenItems = new Map();
  for (const a of repairWave.assignments) {
    for (const p of a.ownedPaths) {
      const root = p.replace(/\/?\*\*$/, "");
      if (s1Files.has(root)) violations.push(`${a.assignmentId} owns S1 runner ${root}`);
      if (r8Paths.some((r) => root === r || root.startsWith(`${r}/`))) violations.push(`${a.assignmentId} owns R8 path ${root}`);
      for (const owned of parentPaths) {
        if (root === owned || root.startsWith(`${owned}/`) || owned.startsWith(`${root}/`)) violations.push(`${a.assignmentId} collides with the parent manifest at ${root}`);
      }
    }
    for (const item of a.items) {
      if (seenItems.has(item)) violations.push(`${item} is claimed twice`);
      seenItems.set(item, a.assignmentId);
      if (repairPlan.passRevocation.families.includes(item)) violations.push(`${a.assignmentId} holds R8 family ${item}`);
    }
  }
  check("A46", "the repair addendum touches no S1 runner, no R8 family and no parent-owned path",
    violations.length === 0, violations.slice(0, 3).join(" | "));

  // A path owned and prohibited at once tells the worker two things. This fired
  // on the first generation of this very wave.
  const contradictions = [];
  for (const a of repairWave.assignments) {
    const owned = new Set(a.ownedPaths.map((p) => p.split("(")[0].trim().replace(/\/?\*\*$/, "")));
    const prohibited = new Set(a.prohibitedPaths.map((p) => p.replace(/\/?\*\*$/, "")));
    for (const p of owned) if (prohibited.has(p)) contradictions.push(`${a.assignmentId}:${p}`);
  }
  // And a shared file may only be owned when the import graph proves exclusivity.
  const wrongShared = repairWave.assignments.flatMap((a) =>
    a.sharedFileAnalysis.filter((sf) => sf.ownable && sf.importersOutsideLane.length > 0).map((sf) => `${a.assignmentId}:${sf.file}`));
  check("A47", "no repair lane owns a path it also prohibits, and a shared file is owned only when the import graph proves it exclusive",
    contradictions.length === 0 && wrongShared.length === 0,
    [...contradictions, ...wrongShared].slice(0, 3).join(" | "));

  const dispatched = repairWave.assignments.reduce((n, a) => n + a.items.length, 0);
  check("A48", "every S1-unaffected built family is dispatched exactly once, across four to six lanes",
    dispatched === repairWave.s1ExposureDerivation.builtFamiliesUnaffected
    && repairWave.assignments.length >= 4 && repairWave.assignments.length <= 6
    && seenItems.size === dispatched,
    `${dispatched} dispatched of ${repairWave.s1ExposureDerivation.builtFamiliesUnaffected} unaffected, across ${repairWave.assignments.length} lane(s)`);
}

// 30. The shared-host addendum. Three repair lanes import a host none of them
// may own; S2 owns it instead. Two things can go wrong: S2 can quietly become a
// render lane, and its importer count can be quoted rather than derived.
if (s2 && repairWave && wave2) {
  const a2 = s2.assignments[0];
  const host = s2.host;

  // The import graph, recomputed here rather than read out of the record it is
  // meant to check. 10 and 12 were both quoted this sprint; only one is derived.
  //
  // Recomputed AT THE ASSIGNMENT'S OWN BASE, not at HEAD. The repair lanes lifted
  // seven Utah families and one West Virginia family off this host after S2 was
  // dispatched, so the graph at HEAD is a different graph and checking a pinned
  // dispatch against it would report a correct record as wrong. A dispatch is
  // measured against the tree it was dispatched from.
  const atBase = a2.captainBaseSha;
  const scriptFiles = (git(["ls-tree", "--name-only", atBase, "scripts/"]) ?? "")
    .split("\n").map((f) => path.basename(f)).filter((f) => /^build-census-v1-.+\.mjs$/.test(f));
  const sourceAt = (f) => git(["show", `${atBase}:scripts/${f}`]) ?? "";
  const directImports = new Map(scriptFiles.map((f) => [f,
    [...new Set([...sourceAt(f)
      .matchAll(/from\s+["']\.\/(build-census-v1-[^"']+\.mjs)["']/g)].map((m) => m[1]))]]));
  const hostBase = path.basename(host);
  const memo = new Map();
  const reaches = (file, seen = new Set()) => {
    if (memo.has(file)) return memo.get(file);
    if (file === hostBase) return true;
    if (seen.has(file)) return false;
    seen.add(file);
    const r = (directImports.get(file) ?? []).some((d) => reaches(d, seen));
    memo.set(file, r);
    return r;
  };
  const graphImporters = scriptFiles.filter((f) => f !== hostBase && reaches(f)).sort();
  const recorded = a2.hostImporters.families.map((f) => path.basename(f.buildScript)).sort();

  check("A49", "the S2 importer set is the import graph's, recomputed, not a number carried forward",
    scriptFiles.length > 0
    && a2.hostImporters.count === graphImporters.length
    && s2.countReconciliation.authoritative === graphImporters.length
    && recorded.length === graphImporters.length
    && recorded.every((f, i) => f === graphImporters[i])
    && s2.countReconciliation.scriptsInTheClosure === graphImporters.length + 1
    && s2.countReconciliation.builtFamiliesInTheClosure
       === a2.hostImporters.families.filter((f) => f.c11Classification === "BUILT").length + 1,
    `graph at ${String(atBase).slice(0, 8)}: ${graphImporters.length} · record ${a2.hostImporters.count} · closure ${s2.countReconciliation.scriptsInTheClosure}`);

  // S2 changes shared logic. The moment it owns an overlay directory or claims a
  // packet family it stops being the fix for three lanes and becomes a fourth.
  const overlayOwned = a2.ownedPaths.filter((p) => /overlays|packets/.test(p));
  const ownRoot = `data/rcap-grade-a/wave-2/${a2.workerBranch.replace(/^codex\//, "")}`;
  const outputsOutside = a2.requiredOutputs.filter((o) => {
    const p = o.split("—")[0].trim();
    return !a2.ownedPaths.some((owned) => {
      const root = owned.replace(/\/?\*\*$/, "");
      return p === root || p.startsWith(`${root}/`);
    });
  });
  check("A50", "S2 owns the host and its own return directory, nothing else, and can write every output it owes",
    a2.ownedPaths.length === 2
    && a2.ownedPaths.includes(host)
    && a2.ownedPaths.includes(`${ownRoot}/**`)
    && overlayOwned.length === 0
    && a2.rendersNoPackets === true && a2.modifiesNoOverlayDirectories === true
    && s2.totals.overlayPathsOwned === 0 && s2.totals.packetsRendered === 0
    && outputsOutside.length === 0,
    `${a2.ownedPaths.length} owned · ${overlayOwned.length} overlay · ${outputsOutside.length} unwritable output(s)`);

  // The host stays exclusive: nobody else may own it, S2 may not reach into the
  // lanes it unblocks, and the continuation contract must name exactly the repair
  // lanes that actually hold a built importer.
  const others = [...wave2.assignments, ...repairWave.assignments];
  const alsoOwned = others.filter((a) => a.ownedPaths.some((p) => {
    const root = p.split("(")[0].trim().replace(/\/?\*\*$/, "");
    return root === host || a2.ownedPaths.some((mine) => {
      const m = mine.replace(/\/?\*\*$/, "");
      return root === m || root.startsWith(`${m}/`) || m.startsWith(`${root}/`);
    });
  })).map((a) => a.assignmentId);
  const repairLaneIds = new Set(repairWave.assignments.map((a) => a.assignmentId));
  const laneOfBuiltImporter = [...new Set(a2.hostImporters.families
    .filter((f) => f.c11Classification === "BUILT" && repairLaneIds.has(f.owningLane))
    .map((f) => f.owningLane))].sort();
  const appliesTo = [...(s2.dependencyConsumption.appliesTo ?? [])].sort();
  check("A51", "the host is S2's alone, and the continuation contract names exactly the repair lanes that import it",
    alsoOwned.length === 0
    && s2.totals.collisions === 0
    && appliesTo.length === laneOfBuiltImporter.length
    && appliesTo.every((l, i) => l === laneOfBuiltImporter[i])
    && s2.dependencyConsumption.theirOwnedPathsAreUnchanged === true
    && typeof s2.dependencyConsumption.continuationRecord === "string"
    && s2.dependencyConsumption.sequence.some((st) => String(st.action).includes(s2.dependencyConsumption.continuationRecord)),
    `${alsoOwned.length} other owner(s) [${alsoOwned.join(", ")}] · appliesTo ${appliesTo.join(",")} · importers in ${laneOfBuiltImporter.join(",")}`);

  // Same base discipline as Wave 2: a real ancestor, pinned, and not already
  // carrying the dispatch it is the base for.
  const s2Base = a2.captainBaseSha;
  const s2Ancestor = git(["merge-base", "--is-ancestor", s2Base, "HEAD"]) !== null;
  const s2AtBase = git(["rev-parse", `${s2Base}:${S2}`]);
  const s2AtHead = git(["rev-parse", `HEAD:${S2}`]);
  check("A52", "S2 names a real ancestor as its base, that base does not already carry it, and the record agrees with itself",
    /^[0-9a-f]{40}$/.test(s2Base) && s2Ancestor
    && !(s2AtBase !== null && s2AtBase === s2AtHead)
    && a2.readAssignmentFrom?.file === S2
    && String(a2.readAssignmentFrom?.verify ?? "").includes(s2Base),
    `base ${String(s2Base).slice(0, 8)}, ancestor ${s2Ancestor}, record at base ${s2AtBase === null ? "absent" : s2AtBase === s2AtHead ? "IDENTICAL — self-referential" : "earlier content"}`);
}

// 31. The mass-production pipeline. Five ways it can lie: an arithmetic that
// does not close, a lane sized to fit the story, a path already owned, a
// verifier that can edit what it verifies, and a shortfall absorbed silently.
if (mass && massCollisions && massCheckpoint && wave2 && repairWave && s2) {
  const buildL = mass.assignments.filter((a) => a.lane === "packet-build");
  const verifyL = mass.assignments.filter((a) => a.lane === "independent-verification");
  const sourceL = mass.assignments.filter((a) => a.lane === "source-identity-acquisition-promotion");
  const sharedL = mass.assignments.filter((a) => a.lane === "shared-infrastructure");

  // The ladder is the whole claim: every family in the national worklist is
  // either in production or excluded for exactly one stated reason.
  const worklist = read(WORKLIST);
  const ladder = new Set(mass.derivation.ladder);
  const badReason = mass.derivation.excluded.filter((e) => !ladder.has(e.reason));
  const producedIds = buildL.flatMap((a) => a.items);
  const bothWays = mass.derivation.excluded
    .filter((e) => e.reason !== "DUPLICATE_WORKLIST_GROUP" && producedIds.includes(e.familyId))
    .map((e) => `${e.familyId}:${e.reason}`);
  check("A53", "the exclusion ladder closes: every family is produced or excluded once, for a reason the ladder names",
    mass.derivation.excludedTotal + mass.derivation.productionSetSize === worklist.counts.families
    && mass.derivation.denominator === worklist.counts.families
    && mass.derivation.sumsToDenominator === true
    && badReason.length === 0
    && producedIds.length === mass.derivation.productionSetSize
    // A produced family may legitimately reappear as DUPLICATE_WORKLIST_GROUP:
    // the worklist carries two rows for it and the family is counted once. Any
    // other reason means it was both built and excluded.
    && bothWays.length === 0,
    `${mass.derivation.productionSetSize} produced + ${mass.derivation.excludedTotal} excluded of ${worklist.counts.families}; ${badReason.length} off-ladder reason(s); ${bothWays.length} produced-and-excluded`);

  // Lane sizes are a contract, and a shortfall is reported rather than absorbed
  // by shrinking lanes until the family count fits the lane count.
  const wrongSize = buildL.filter((a) => a.itemCount < 10 || a.itemCount > 15);
  const dispatched = buildL.reduce((n, a) => n + a.itemCount, 0);
  const verifyStatic = verifyL.filter((a) => (a.items ?? []).length > 0);
  check("A54", "every build lane is sized to contract, the families add up, and the shortfall against the daily target is stated",
    wrongSize.length === 0
    && dispatched === mass.derivation.productionSetSize
    && mass.totals.buildLanes + mass.totals.buildLanesHeldForSource === mass.totals.buildLanesProvisioned
    && mass.theShortfall.sourceReadyFamilies === mass.derivation.productionSetSize
    && mass.theShortfall.sourceReadyFamilies < mass.targetRate.familiesPerDay === (mass.totals.buildLanesHeldForSource > 0)
    && verifyStatic.length === 0
    && verifyL.length === 6 && sourceL.length === 4 && sharedL.length === 2,
    `${buildL.length} build lane(s) carrying ${dispatched}; ${wrongSize.length} off-size; ${mass.totals.buildLanesHeldForSource} held; ${verifyStatic.length} verifier(s) with a static list`);

  // Ownership, recomputed rather than read out of the collision record it checks.
  const activeOwned = [];
  for (const a of [...wave2.assignments, ...repairWave.assignments, ...s2.assignments]) {
    for (const p of a.ownedPaths ?? []) activeOwned.push({ lane: a.assignmentId, path: p.split("(")[0].trim() });
  }
  for (const r of read(WAVE2_REPAIRS).assignments) if (r.ownedPath) activeOwned.push({ lane: `WAVE_2_REPAIR:${r.family}`, path: r.ownedPath });
  const rootOf = (p) => p.replace(/\/?\*+$/, "");
  const touches = (a, b) => { const ra = rootOf(a), rb = rootOf(b); return ra === rb || ra.startsWith(`${rb}/`) || rb.startsWith(`${ra}/`); };
  const massPaths = mass.assignments.flatMap((a) => (a.ownedPaths ?? []).map((p) => ({ lane: a.assignmentId, path: p })));
  const hits = [];
  for (const mine of massPaths) for (const theirs of activeOwned) if (touches(mine.path, theirs.path)) hits.push(`${mine.lane}~${theirs.lane}`);
  for (let i = 0; i < massPaths.length; i += 1) {
    for (let j = i + 1; j < massPaths.length; j += 1) {
      if (massPaths[i].lane === massPaths[j].lane) continue;
      if (touches(massPaths[i].path, massPaths[j].path)) hits.push(`${massPaths[i].lane}~${massPaths[j].lane}`);
    }
  }
  const activeFams = new Set([
    ...read(COMPLETENESS).results.map((r) => r.familyId),
    ...[...wave2.assignments, ...repairWave.assignments, ...s2.assignments].flatMap((a) => a.items ?? []),
    ...read(WAVE2_REPAIRS).assignments.map((r) => r.family)
  ]);
  const reDispatched = producedIds.filter((f) => activeFams.has(f));
  const dupes = producedIds.filter((f, i) => producedIds.indexOf(f) !== i);
  check("A55", "the mass wave touches nothing an active lane holds, and claims no family twice",
    hits.length === 0 && reDispatched.length === 0 && dupes.length === 0
    && massCollisions.counts.pathCollisions === 0
    && massCollisions.counts.duplicateFamilies === 0
    && massCollisions.counts.activeFamiliesReDispatched === 0
    && massCollisions.counts.ownedAndProhibited === 0
    && massCollisions.counts.requiredOutputsOutsideOwnedPaths === 0
    && massCollisions.counts.placeholders === 0,
    `${hits.length} recomputed collision(s) [${[...new Set(hits)].slice(0, 3).join(", ")}]; ${reDispatched.length} re-dispatched; ${dupes.length} duplicate`);

  // A verifier that can write into what it verifies is not a verifier, and a
  // review batch cut before an independent pass is a package with no verdict.
  const verifierWithOverlay = verifyL.filter((a) => (a.ownedPaths ?? []).some((p) => /overlays|build-census-v1/.test(p)));
  const builderOwningVerification = buildL.filter((a) => (a.ownedPaths ?? []).some((p) => /\/verify-\d+-mass-production/.test(p)));
  const sharedBranches = new Set([...buildL, ...verifyL].map((a) => a.workerBranch));
  const sourceLaneClaimsProduction = sourceL.filter((a) => (a.familiesUnblocked ?? []).some((f) => producedIds.includes(f)));
  check("A56", "verification is independent, streaming and unarmed: no overlay paths, no shared branch, no batch before a pass",
    verifierWithOverlay.length === 0
    && builderOwningVerification.length === 0
    && sharedBranches.size === buildL.length + verifyL.length
    && sourceLaneClaimsProduction.length === 0
    && massCheckpoint.legalReview.batchesCut === 0
    && massCheckpoint.families.passedIndependently === 0
    && mass.totals.commercialRoutesOpened === 0 && mass.totals.productionTouched === false
    && massCheckpoint.commercial.commercialRoutesOpened === 0 && massCheckpoint.commercial.productionTouched === false,
    `${verifierWithOverlay.length} verifier(s) with overlay paths; ${builderOwningVerification.length} builder(s) owning a verification path; ${sourceLaneClaimsProduction.length} source lane(s) claiming a produced family`);
}

// 32. The S2 continuation. A record that names commits, counters and verdicts
// can be wrong in three ways: a commit that is not in this history, a counter
// that disagrees with the matrix it claims to read, and a verification
// assignment for a packet nobody proved complete.
if (continuation && s2 && massCheckpoint !== undefined) {
  const chain = continuation.theChain;
  const named = [chain.s1Integrated, chain.s2Integrated, ...chain.contractFixCommits,
    ...Object.values(chain.repairsApplied).map((r) => r.integratedAs),
    chain.rerenderAndAudit, chain.continuationBase];
  const notAncestors = named.filter((sha) => git(["merge-base", "--is-ancestor", sha, "HEAD"]) === null);
  const blobAtBase = git(["rev-parse", `${chain.continuationBase}:${CONTINUATION}`]);
  check("A57", "every commit the continuation names is in this history, and the base it names does not already carry it",
    notAncestors.length === 0
    && named.every((sha) => /^[0-9a-f]{40}$/.test(sha))
    && blobAtBase === null
    && chain.continuationBase === chain.rerenderAndAudit,
    `${named.length} commit(s) named, ${notAncestors.length} not ancestors; record at base ${blobAtBase === null ? "absent" : "PRESENT — self-referential"}`);

  // The eleven are recomputed from the S2 closure, and every counter is
  // re-read from the matrix rather than trusted from the record.
  const a2 = s2.assignments[0];
  const expected = [...new Set([
    a2.hostImporters.hostFamily?.familyId ?? "ne-setaside-custodial-set",
    ...a2.hostImporters.families.filter((f) => f.c11Classification === "BUILT").map((f) => f.familyId)
  ])].sort();
  const matrix = read(COMPLETENESS);
  const mismatched = continuation.rows.filter((r) => {
    const m = matrix.results.find((x) => x.familyId === r.familyId);
    if (!m) return true;
    if (m.result !== r.resultAfter) return true;
    return Object.entries(r.countersAfter ?? {}).some(([k, v]) => m.counters[k] !== v);
  });
  const passClaimedWithNonzero = continuation.rows.filter((r) =>
    r.allNineCountersZero && Object.values(r.countersAfter ?? {}).some((v) => v > 0));
  check("A58", "the continuation covers exactly the S2 closure, and every counter it reports is the matrix's",
    continuation.rows.length === expected.length
    && continuation.rows.map((r) => r.familyId).sort().every((f, i) => f === expected[i])
    && mismatched.length === 0
    && passClaimedWithNonzero.length === 0
    && continuation.totals.passComplete === continuation.rows.filter((r) => r.allNineCountersZero).length
    && continuation.totals.independentlyVerified === continuation.rows.filter((r) => r.independentVerdict).length,
    `${continuation.rows.length} of ${expected.length} closure families; ${mismatched.length} counter mismatch(es); ${passClaimedWithNonzero.length} PASS with a nonzero counter`);

  // Verification is for proven-complete packets only, and a failure is stated
  // rather than absorbed.
  /* Eligible for a NEW verification assignment: complete and not already
   * verified. A family that has come back with a verdict is finished, and
   * counting it as unassigned would demand a second shard re-prove it. */
  const eligible = new Set(continuation.rows.filter((r) => r.allNineCountersZero && !r.independentVerdict).map((r) => r.familyId));
  const vs = continuation.independentVerification.assignments;
  const ineligible = vs.flatMap((a) => a.items.filter((f) => !eligible.has(f)));
  const assigned = vs.flatMap((a) => a.items);
  const armed = vs.filter((a) => (a.ownedPaths ?? []).some((p) => /overlays|build-census-v1|rcap-packet-completeness/.test(p)));
  const failures = continuation.rows.filter((r) => !r.allNineCountersZero);
  check("A59", "only a proven-complete packet is sent for verification, no verifier can edit what it verifies, and every failure is stated",
    ineligible.length === 0
    && armed.length === 0
    && new Set(assigned).size === assigned.length
    && assigned.length === eligible.size
    && continuation.whatStillFails.length === failures.length
    && failures.every((r) => continuation.whatStillFails.some((w) => w.familyId === r.familyId && w.failingCounters.length > 0))
    && continuation.totals.commercialRoutesOpened === 0
    && continuation.totals.productionTouched === false,
    `${assigned.length} assigned of ${eligible.size} eligible; ${ineligible.length} ineligible; ${armed.length} armed verifier(s); ${failures.length} failure(s) stated as ${continuation.whatStillFails.length}`);
}

console.log(`\n${results.length - failures}/${results.length} checkpoint checks passed.`);

if (MUTATIONS) {
  console.log("\nmutations:");
  const targets = {
    dispatch: path.join(ROOT, DISPATCH), lc: path.join(ROOT, LC), status: path.join(ROOT, STATUS),
    review: path.join(ROOT, WAVE_REVIEW), integration: path.join(ROOT, INTEGRATION),
    residual: path.join(ROOT, RESIDUAL), contract: path.join(ROOT, CONTRACT),
    counsel: path.join(ROOT, COUNSEL), c11: path.join(ROOT, C11), wave2: path.join(ROOT, WAVE2),
    completeness: path.join(ROOT, COMPLETENESS), repairPlan: path.join(ROOT, REPAIR_PLAN),
    repairWave: path.join(ROOT, REPAIR_WAVE), s2: path.join(ROOT, S2),
    mass: path.join(ROOT, MASS), massCollisions: path.join(ROOT, MASS_COLLISIONS), massCheckpoint: path.join(ROOT, MASS_CHECKPOINT),
    continuation: path.join(ROOT, CONTINUATION)
  };
  const originals = Object.fromEntries(Object.entries(targets).map(([k, p]) => [k, fs.readFileSync(p)]));
  const cases = [
    { on: "dispatch", name: "a duplicated row across two assignments is caught", mutate: (j) => { j.assignments[1].routeKeys.push(j.assignments[0].routeKeys[0]); return j; } },
    { on: "dispatch", name: "a placeholder value is caught", mutate: (j) => { j.assignments[0].mission = "TBD"; return j; } },
    { on: "dispatch", name: "an overlapping owned path is caught", mutate: (j) => { j.assignments[1].ownedPaths = [...j.assignments[0].ownedPaths]; return j; } },
    { on: "dispatch", name: "a nonancestor base is caught", mutate: (j) => { j.captainBaseSha = "0".repeat(40); return j; } },
    { on: "dispatch", name: "an assignment without a reuse record is caught", mutate: (j) => { j.assignments[0].reuseChecked = false; return j; } },
    { on: "dispatch", name: "a completed assignment with no worker commit is caught", mutate: (j) => { j.assignments[0].status = "completed"; return j; } },
    // C11 has returned, so a mutation that gave the packet lane an already-built
    // family no longer fires: A9 deliberately skips returned lanes. The invariant
    // that still bites is the one for an OPEN packet lane, so the mutation puts
    // the lane back in flight and then hands it built work.
    { on: "review", name: "an open packet lane given an already-built family is caught", mutate: (j) => { const r = j.reviews.find((x) => x.id === "C11_PACKET_FACTORY_ACCELERATOR"); r.commit = null; r.verdict = "STILL_RUNNING_NOT_REVIEWED"; return j; } },
    { on: "dispatch", name: "an assignment recording a different base than the manifest is caught", mutate: (j) => { j.assignments[2].captainBaseSha = "1".repeat(40); return j; } },
    { on: "dispatch", name: "a classified route dropped from the dispatch is caught", mutate: (j) => { j.assignments[0].routeKeys.pop(); return j; } },
    { on: "dispatch", name: "a route moved to a lane the delta does not route it to is caught", mutate: (j) => { j.assignments[1].routeKeys.push(j.assignments[0].routeKeys.pop()); j.assignments[1].routeKeys.pop(); return j; } },
    { on: "dispatch", name: "an answered research lane put back in the dispatch is caught", mutate: (j) => { j.assignments[0].assignmentId = "C1_CATEGORY_B_EVIDENCE_SHARD_1"; return j; } },
    { on: "dispatch", name: "a branch-identity lane owning a packet-family path is caught", mutate: (j) => { j.assignments[0].ownedPaths = ["data/rcap-all50/overlays/census-v1/mi/**"]; return j; } },
    { on: "lc", name: "a commercial route opened with no proven packet is caught", mutate: (j) => { j.productPath.commercialRoutesOpened = 1; return j; } },
    { on: "lc", name: "a denominator moved away from the frozen census is caught", mutate: (j) => { j.denominator.terminalObligations = 729; return j; } },
    { on: "lc", name: "a Category B count restated instead of read is caught", mutate: (j) => { j.categoryBIntegration.aBranchesNewlyRequired = 49; return j; } },
    { on: "lc", name: "a superseded-record pointer moved off the controlling record is caught", mutate: (j) => { j.lineage.captainSha = "0".repeat(40); return j; } },
    { on: "status", name: "a status mirror claiming GO while the record holds is caught", mutate: null, write: (text) => text.replace("**GO/HOLD: HOLD.**", "**GO/HOLD: GO.**") },
    { on: "lc", name: "a wave completion count restated instead of read is caught", mutate: (j) => { j.waveOne.branchIdentities.completed = 55; return j; } },
    { on: "lc", name: "a returned lane reported as still running is caught", mutate: (j) => { j.waveOne.stillRunning = 1; return j; } },
    { on: "review", name: "an out-of-scope write in a return is caught", mutate: (j) => { j.summary.outOfScopeWrites = 1; return j; } },
    { on: "integration", name: "a stopped route flipped to completed is caught", mutate: (j) => { const r = j.rows.find((x) => x.integrationStatus === "STOPPED"); r.integrationStatus = "COMPLETED"; return j; } },
    { on: "lc", name: "a built packet family counted as independently verified is caught", mutate: (j) => { j.waveOne.packetFactory.packetsProvenIndependently = 43; return j; } },
    { on: "c11", name: "a stopped packet family dropped from the classification is caught", mutate: (j) => { j.summary.stopped = 3; return j; } },
    { on: "c11", name: "an output approval granted by the builder is caught", mutate: (j) => { j.summary.outputApprovalsGranted = 1; return j; } },
    { on: "wave2", name: "a built family verified by two shards is caught", mutate: (j) => { const s = j.assignments.filter((a) => a.lane === "independent-verification"); s[1].items.push(s[0].items[0]); return j; } },
    { on: "wave2", name: "a built family verified by nobody is caught", mutate: (j) => { j.assignments.find((a) => a.lane === "independent-verification").items.pop(); return j; } },
    { on: "wave2", name: "a shard handed to the builder is caught", mutate: (j) => { j.assignments.find((a) => a.lane === "independent-verification").workerBranch = "codex/c11-packet-factory-accelerator"; return j; } },
    { on: "wave2", name: "an assignment that does not say where to read itself is caught", mutate: (j) => { j.assignments[0].readAssignmentFrom = null; return j; } },
    { on: "wave2", name: "a self-referential base is caught", mutate: (j) => { j.captainBaseSha = git(["rev-parse", "HEAD"]); return j; } },
    { on: "wave2", name: "an assignment that cannot write its own output is caught", mutate: (j) => { const a = j.assignments.find((x) => x.assignmentId === "R8_COMPLETENESS_REPAIR_PRIORITY_FOUR"); a.ownedPaths = ["data/rcap-grade-a/wave-2/r8-completeness-repair-priority-four/**"]; return j; } },
    { on: "wave2", name: "a verifier given a repair path is caught", mutate: (j) => { j.assignments.find((a) => a.lane === "independent-verification").ownedPaths.push("data/rcap-all50/overlays/census-v1/**"); return j; } },
    { on: "wave2", name: "a repair lane grabbing a shared runner is caught", mutate: (j) => { j.assignments.find((a) => a.assignmentId === "R8_COMPLETENESS_REPAIR_PRIORITY_FOUR").ownedPaths.push(j.sharedRepairSurface.runners[0].file); return j; } },
    { on: "wave2", name: "a repair running before the shared fix is caught", mutate: (j) => { j.assignments.find((a) => a.assignmentId === "R8_COMPLETENESS_REPAIR_PRIORITY_FOUR").dependsOn = []; return j; } },
    { on: "repairWave", name: "a repair lane grabbing an S1 runner is caught", mutate: (j) => { j.assignments[0].ownedPaths.push("scripts/build-census-v1-nj_arrest_no_conviction-set.mjs"); return j; } },
    { on: "repairWave", name: "a repair lane colliding with the parent manifest is caught", mutate: (j) => { j.assignments[0].ownedPaths.push("data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/**"); return j; } },
    { on: "repairWave", name: "a path owned and prohibited at once is caught", mutate: (j) => { const a = j.assignments[0]; a.ownedPaths.push(a.prohibitedPaths[0]); return j; } },
    { on: "repairWave", name: "a non-exclusive shared file declared ownable is caught", mutate: (j) => { const a = j.assignments.find((x) => x.sharedFileAnalysis.some((s) => !s.ownable)); a.sharedFileAnalysis.find((s) => !s.ownable).ownable = true; return j; } },
    { on: "repairWave", name: "an unaffected family dispatched to nobody is caught", mutate: (j) => { j.assignments[0].items.pop(); return j; } },
    { on: "s2", name: "an importer count quoted rather than derived is caught", mutate: (j) => { j.countReconciliation.authoritative = 10; j.assignments[0].hostImporters.count = 10; return j; } },
    { on: "s2", name: "an importer dropped from the S2 closure is caught", mutate: (j) => { j.assignments[0].hostImporters.families.pop(); return j; } },
    { on: "s2", name: "the shared-host lane given an overlay directory is caught", mutate: (j) => { j.assignments[0].ownedPaths.push("data/rcap-all50/overlays/census-v1/ut/**"); return j; } },
    { on: "s2", name: "the shared-host lane owing an output it cannot write is caught", mutate: (j) => { j.assignments[0].ownedPaths = j.assignments[0].ownedPaths.filter((p) => !p.endsWith("/**")); return j; } },
    { on: "s2", name: "a repair lane left out of the continuation contract is caught", mutate: (j) => { j.dependencyConsumption.appliesTo.pop(); return j; } },
    { on: "s2", name: "a continuation contract that never publishes its own record is caught", mutate: (j) => { j.dependencyConsumption.sequence = j.dependencyConsumption.sequence.filter((st) => !String(st.action).includes(j.dependencyConsumption.continuationRecord)); return j; } },
    { on: "s2", name: "an S2 base that is not an ancestor is caught", mutate: (j) => { j.assignments[0].captainBaseSha = "0".repeat(40); return j; } },
    { on: "s2", name: "an S2 verify line naming a different base than the assignment is caught", mutate: (j) => { j.assignments[0].readAssignmentFrom.verify = "captainBaseSha must equal " + "9".repeat(40); return j; } },
    { on: "mass", name: "a family excluded for a reason the ladder does not name is caught", mutate: (j) => { j.derivation.excluded[0].reason = "SEEMED_HARD"; return j; } },
    { on: "mass", name: "an exclusion ladder that does not close is caught", mutate: (j) => { j.derivation.excluded.pop(); j.derivation.excludedTotal -= 1; return j; } },
    { on: "mass", name: "a build lane sized below the contract floor is caught", mutate: (j) => { const a = j.assignments.find((x) => x.lane === "packet-build"); a.items = a.items.slice(0, 4); a.itemCount = 4; return j; } },
    { on: "mass", name: "a shortfall absorbed instead of reported is caught", mutate: (j) => { j.totals.buildLanesHeldForSource = 0; return j; } },
    { on: "mass", name: "a mass lane grabbing an active lane's overlay path is caught", mutate: (j) => { j.assignments.find((x) => x.lane === "packet-build").ownedPaths.push("data/rcap-all50/overlays/census-v1/wa/wa-vac-felony-set--official-pdf-fill/**"); return j; } },
    { on: "mass", name: "a family claimed by two build lanes is caught", mutate: (j) => { const b = j.assignments.filter((x) => x.lane === "packet-build"); b[1].items.push(b[0].items[0]); b[1].itemCount += 1; return j; } },
    { on: "mass", name: "an already-active family re-dispatched into production is caught", mutate: (j) => { const a = j.assignments.find((x) => x.lane === "packet-build"); a.items[0] = "wa_vac_felony-set"; return j; } },
    { on: "mass", name: "a verifier given the overlay directories it verifies is caught", mutate: (j) => { j.assignments.find((x) => x.lane === "independent-verification").ownedPaths.push("data/rcap-all50/overlays/census-v1/**"); return j; } },
    { on: "mass", name: "a verifier handed a static family list is caught", mutate: (j) => { const v = j.assignments.find((x) => x.lane === "independent-verification"); v.items = ["ak-tf800-set"]; return j; } },
    { on: "mass", name: "a builder and a verifier sharing one branch is caught", mutate: (j) => { const b = j.assignments.find((x) => x.lane === "packet-build"); const v = j.assignments.find((x) => x.lane === "independent-verification"); v.workerBranch = b.workerBranch; return j; } },
    { on: "massCollisions", name: "a collision record reporting a collision it did not fail on is caught", mutate: (j) => { j.counts.pathCollisions = 1; return j; } },
    { on: "massCheckpoint", name: "a review batch cut before any family passed is caught", mutate: (j) => { j.legalReview.batchesCut = 1; return j; } },
    { on: "massCheckpoint", name: "a commercial route opened at dispatch is caught", mutate: (j) => { j.commercial.commercialRoutesOpened = 1; return j; } },
    { on: "continuation", name: "a continuation naming a commit outside this history is caught", mutate: (j) => { j.theChain.s2Integrated = "0".repeat(40); return j; } },
    { on: "continuation", name: "a closure family dropped from the continuation is caught", mutate: (j) => { j.rows.pop(); return j; } },
    { on: "continuation", name: "a counter restated instead of read from the matrix is caught", mutate: (j) => { j.rows[0].countersAfter.knownRequiredFieldsMissing = 99; return j; } },
    // Constructs the condition rather than depending on one existing: every
    // closure family passes now that South Dakota is repaired, so a mutation
    // that looked for a failing row silently stopped testing anything.
    { on: "continuation", name: "a PASS claimed over a nonzero counter is caught", mutate: (j) => { const r = j.rows[0]; r.countersAfter.knownRequiredFieldsMissing = 3; r.allNineCountersZero = true; return j; } },
    { on: "continuation", name: "an unproven family sent for independent verification is caught", mutate: (j) => { const bad = j.rows[0]; bad.allNineCountersZero = false; bad.failingCounters = ["knownRequiredFieldsMissing"]; j.independentVerification.assignments[0].items.push(bad.familyId); return j; } },
    { on: "continuation", name: "a verifier given the overlays it verifies is caught", mutate: (j) => { j.independentVerification.assignments[0].ownedPaths.push("data/rcap-all50/overlays/census-v1/**"); return j; } },
    { on: "continuation", name: "a remaining failure quietly dropped from the record is caught", mutate: (j) => { const r = j.rows[0]; r.allNineCountersZero = false; r.failingCounters = ["knownRequiredFieldsMissing"]; j.whatStillFails = []; return j; } },
    { on: "wave2", name: "a review package prepared before an independent PASS is caught", mutate: (j) => { j.outputLegalReview.batchesPrepared = 6; return j; } },
    { on: "wave2", name: "a verification shard that drops the completeness obligations is caught", mutate: (j) => { const s = j.assignments.find((a) => a.lane === "independent-verification"); s.proofObligations = s.proofObligations.filter((o) => !o.startsWith("COMPLETENESS:")); return j; } },
    { on: "completeness", name: "a family reported complete with a nonzero counter is caught", mutate: (j) => { j.results[0].result = "PASS_COMPLETE"; return j; } },
    { on: "repairPlan", name: "a revoked PASS quietly given a review package is caught", mutate: (j) => { j.passRevocation.lawrenceReviewPackagesPrepared = 4; return j; } },
    { on: "lc", name: "a completeness count restated instead of read is caught", mutate: (j) => { j.waveOne.packetFactory.completeness.passComplete = 43; return j; } },
    { on: "contract", name: "a residual lane left uncovered by the execution contract is caught", mutate: (j) => { j.appliesTo.residualLanes.pop(); return j; } },
    { on: "counsel", name: "New York's mandatory split dropped from the determination is caught", mutate: (j) => { const r = j.rows.find((x) => x.mandatorySubroutes.length > 1); r.mandatorySubroutes = []; return j; } },
    { on: "counsel", name: "Utah's consent gate removed from the determination is caught", mutate: (j) => { const r = j.rows.find((x) => x.gatedBranches.length); for (const b of r.gatedBranches) b.prosecutorConsentRequired = false; return j; } },
    { on: "counsel", name: "a counsel answer that silently moved the census is caught", mutate: (j) => { j.rows[0].censusCategoryBefore = "A_MUST_FULFILL"; return j; } },
    { on: "residual", name: "a counsel-determined route carried by no residual lane is caught", mutate: (j) => { const l = j.lanes.find((x) => x.residualLaneId === "R6_COUNSEL_DETERMINATION_IMPLEMENTATION"); l.items = []; l.itemKind = "environment"; return j; } }
  ];
  let undetected = 0;
  try {
    for (const testCase of cases) {
      const target = targets[testCase.on];
      const original = originals[testCase.on];
      if (testCase.write) fs.writeFileSync(target, testCase.write(original.toString("utf8")));
      else fs.writeFileSync(target, JSON.stringify(testCase.mutate(JSON.parse(original.toString("utf8"))), null, 2) + "\n");
      let caught = false;
      try { execFileSync(process.execPath, [fileURLToPath(import.meta.url)], { cwd: ROOT, stdio: "pipe" }); } catch { caught = true; }
      console.log(`  ${caught ? "detected " : "MISSED   "} ${testCase.name}`);
      if (!caught) undetected += 1;
      fs.writeFileSync(target, original);
    }
  } finally { for (const [k, p] of Object.entries(targets)) fs.writeFileSync(p, originals[k]); }
  const restored = Object.entries(targets).every(([k, p]) => fs.readFileSync(p).equals(originals[k]));
  console.log(`\n  every mutated file restored byte-for-byte: ${restored}`);
  if (!restored || undetected > 0) { console.error("the checkpoint proves less than it claims."); process.exit(1); }
  console.log(`\nOK checkpoint mutations — ${cases.length} case(s), every mutation caught.`);
}

if (failures > 0) { console.error(`\n${failures} checkpoint check(s) FAILED.`); process.exit(1); }
