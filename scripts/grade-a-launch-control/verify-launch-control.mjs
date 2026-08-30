#!/usr/bin/env node
// The four-hour checkpoint verifier.
//
//   node scripts/grade-a-launch-control/verify-launch-control.mjs [--mutations]
//
// Thirty-three refusals. Each is a way the control plane could look healthy while
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
// Ten committed binaries already matched a private-corpus SHA-256 before the
// packet factory returned, under hard-forms/*/evidence/ and rcap-codex source
// receipts. They are a governance discrepancy for Roger, not something to remove
// retroactively -- but the number must never grow. C11 would have taken it to 62.
const KNOWN_COMMITTED_CORPUS_BINARIES = 10;
const PROMPTS = "docs/rcap/grade-a/launch-control/prompts";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 29 }).trim(); } catch { return null; } };

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

console.log(`\n${results.length - failures}/${results.length} checkpoint checks passed.`);

if (MUTATIONS) {
  console.log("\nmutations:");
  const targets = {
    dispatch: path.join(ROOT, DISPATCH), lc: path.join(ROOT, LC), status: path.join(ROOT, STATUS),
    review: path.join(ROOT, WAVE_REVIEW), integration: path.join(ROOT, INTEGRATION),
    residual: path.join(ROOT, RESIDUAL), contract: path.join(ROOT, CONTRACT),
    counsel: path.join(ROOT, COUNSEL), c11: path.join(ROOT, C11)
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
