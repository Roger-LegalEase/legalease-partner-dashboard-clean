#!/usr/bin/env node
/**
 * Does the 24-hour packet factory dispatch hold?
 *
 *   node scripts/grade-a-packet-factory-24h/verify.mjs
 *   node scripts/grade-a-packet-factory-24h/verify.mjs --mutations
 *
 * Eleven refusals, each with a mutation that proves it is not vacuous. The
 * dispatch is large enough that a check nobody can falsify would be believed
 * for the whole 24 hours, so every one of them is broken on purpose here and
 * required to fail.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const MUTATIONS = process.argv.includes("--mutations");

const DIR = "data/rcap-grade-a/packet-factory-24h";
const PROMPTS = "docs/rcap/grade-a/packet-factory-24h";
const MASTER = `${DIR}/MASTER_QUEUE.json`;
const ACTIVE = `${DIR}/ACTIVE_ASSIGNMENTS.json`;
const GRAPH = `${DIR}/IMPORT_GRAPH.json`;
const COLLISIONS = `${DIR}/COLLISIONS.json`;
const CHECKPOINT = `${DIR}/CHECKPOINT.json`;
const WASHINGTON = `${DIR}/WASHINGTON_REPAIR.json`;

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const rootOf = (p) => p.replace(/\/?\*+$/, "");
const touches = (a, b) => { const ra = rootOf(a); const rb = rootOf(b); return ra === rb || ra.startsWith(`${rb}/`) || rb.startsWith(`${ra}/`); };

const gitOk = (args) => { try { execFileSync("git", args, { cwd: ROOT, stdio: "ignore" }); return true; } catch { return false; } };

const results = [];
const check = (id, title, ok, observed = "") => { results.push({ id, title, ok, observed }); };

function run() {
  results.length = 0;
  const master = read(MASTER);
  const active = read(ACTIVE);
  const graph = read(GRAPH);
  const collisions = read(COLLISIONS);
  const checkpoint = read(CHECKPOINT);
  const a = active.assignments;

  const byLane = (lane) => a.filter((x) => x.lane === lane);
  const pf = byLane("packet-build");
  const vf = byLane("independent-verification");
  const src = byLane("source-swarm");
  const fix = byLane("rapid-repair");
  const familyById = new Map(master.families.map((f) => [f.familyId, f]));

  // 1. duplicate families, within one kind of work
  const dupes = [];
  const seen = new Map();
  for (const x of a) {
    if (x.itemKind !== "packetFamily") continue;
    for (const f of x.items) {
      const key = `${x.lane}::${f}`;
      if (seen.has(key)) dupes.push(`${f} in ${seen.get(key)} and ${x.assignmentId}`);
      seen.set(key, x.assignmentId);
    }
  }
  check("F1", "no family is claimed twice inside one kind of work", dupes.length === 0, dupes.slice(0, 3).join(" | "));

  // 2. path collisions, recomputed rather than read from the collision record
  const paths = a.flatMap((x) => x.ownedPaths.map((p) => ({ lane: x.assignmentId, path: p })));
  const hits = [];
  for (let i = 0; i < paths.length; i += 1) {
    for (let j = i + 1; j < paths.length; j += 1) {
      if (paths[i].lane === paths[j].lane) continue;
      if (touches(paths[i].path, paths[j].path)) hits.push(`${paths[i].lane}~${paths[j].lane} at ${paths[i].path}`);
    }
  }
  check("F2", "no two lanes own the same path", hits.length === 0 && collisions.counts.pathCollisions === 0, hits.slice(0, 3).join(" | "));

  // 3. shared-host collisions: one build script, one writer
  const writers = new Map();
  for (const x of a) {
    for (const p of x.ownedPaths) {
      if (!/^scripts\/build-census-v1-.+\.mjs$/.test(p)) continue;
      writers.set(p, [...(writers.get(p) ?? []), x.assignmentId]);
    }
  }
  const twoWriters = [...writers.entries()].filter(([, ls]) => ls.length > 1);
  // And the graph's own rule: a script imported from outside a lane is not owned by it.
  const wronglyOwned = [];
  for (const x of pf) {
    for (const p of x.ownedPaths.filter((q) => /^scripts\/build-census-v1-/.test(q))) {
      const edge = graph.edges.find((e) => `scripts/${e.script}` === p);
      const outside = (edge?.importedBy ?? []).map((s) => s.replace(/^build-census-v1-/, "").replace(/\.mjs$/, ""))
        .filter((f) => !x.items.includes(f));
      if (outside.length) wronglyOwned.push(`${x.assignmentId} owns ${p}, imported by ${outside.join(", ")}`);
    }
  }
  check("F3", "one shared host has one owner, and no lane owns a script imported from outside it",
    twoWriters.length === 0 && wronglyOwned.length === 0 && collisions.counts.sharedHostCollisions === 0,
    [...twoWriters.map(([s, l]) => `${s}: ${l.join(", ")}`), ...wronglyOwned].slice(0, 3).join(" | "));

  // 4. active-family collisions
  const activeFamilies = new Set(master.activeOwnership.families);
  const activePaths = master.families.filter((f) => f.activeOwner).flatMap((f) => f.ownedPaths);
  const reDispatched = a.filter((x) => x.itemKind === "packetFamily").flatMap((x) => x.items.filter((f) => activeFamilies.has(f)));
  const pathClash = paths.filter((p) => activePaths.some((q) => touches(p.path, q)));
  check("F4", "nothing this wave holds is already held by an active lane",
    reDispatched.length === 0 && pathClash.length === 0,
    `${reDispatched.length} famil(ies), ${pathClash.length} path(s)`);

  // 5. placeholders
  const PLACEHOLDER = /\b(TBD|TODO|FIXME|XXX)\b|<placeholder>|(?<![A-Za-z0-9])__[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*__(?![A-Za-z0-9])/;
  const holed = a.filter((x) => PLACEHOLDER.test(JSON.stringify({
    ...x, requiredOutputs: undefined, stopConditions: undefined, focusedTests: undefined,
    returnFormat: undefined, builderObligations: undefined, proofObligations: undefined,
    preflight: undefined, prohibitedCommands: undefined, prohibitedPaths: undefined,
    scriptsNotOwned: undefined, claimRule: undefined, checkpointRule: undefined,
    everyAcquiredSourceRecords: undefined, seedItemsAreNotTheWholeJob: undefined
  }))).map((x) => x.assignmentId);
  check("F5", "no assignment carries a placeholder", holed.length === 0 && collisions.counts.placeholders === 0, holed.slice(0, 3).join(", "));

  // 6 and 7. a blocked family is never handed to a builder
  const blockedInPF = pf.flatMap((x) => x.items.map((f) => familyById.get(f)))
    .filter((f) => f && f.state === "SOURCE_BLOCKED").map((f) => f.familyId);
  const legalInPF = pf.flatMap((x) => x.items.map((f) => familyById.get(f)))
    .filter((f) => f && f.legalInputStatus === "OPEN_LEGAL_INPUT").map((f) => f.familyId);
  check("F6", "no source-blocked family is assigned to a builder", blockedInPF.length === 0, blockedInPF.slice(0, 3).join(", "));
  check("F7", "no legally blocked family is assigned to a builder", legalInPF.length === 0, legalInPF.slice(0, 3).join(", "));

  // 8. an incomplete family is never called complete
  const falsePass = master.families.filter((f) =>
    (f.state === "PASS_COMPLETE" || f.state === "VERIFIED_PASS" || f.state === "COMPLETE_PACKET_PROVEN")
    && f.counters && Object.values(f.counters).some((v) => v > 0)).map((f) => f.familyId);
  check("F8", "no family with a nonzero counter is recorded as complete", falsePass.length === 0, falsePass.slice(0, 3).join(", "));

  // 9. self-verification
  const pfItems = new Set(pf.flatMap((x) => x.items));
  const selfVerified = vf.flatMap((x) => x.items.filter((f) => pfItems.has(f)));
  const branchClash = [...pf, ...vf].map((x) => `${x.assignmentId}:${x.workerBranch}`);
  const sharedReturnDir = vf.filter((v) => pf.some((b) => b.returnDirectory === v.returnDirectory));
  check("F9", "no verifier verifies what a builder in this wave is building",
    selfVerified.length === 0 && sharedReturnDir.length === 0 && branchClash.length === pf.length + vf.length,
    `${selfVerified.length} self-verified, ${sharedReturnDir.length} shared return dir(s)`);

  // 10. no Codex prompt carries a Git network command
  const FORBIDDEN = [/(^|[^`\w])git\s+fetch/, /(^|[^`\w])git\s+pull/, /(^|[^`\w])git\s+push/, /(^|[^`\w])gh\s+\w/, /(^|[^`\w])git\s+worktree/, /(^|[^`\w])git\s+clone/];
  const promptFiles = fs.existsSync(path.join(ROOT, PROMPTS)) ? fs.readdirSync(path.join(ROOT, PROMPTS)).filter((f) => f.endsWith(".md")) : [];
  const offending = [];
  for (const f of promptFiles) {
    const text = fs.readFileSync(path.join(ROOT, PROMPTS, f), "utf8");
    // The "Never run these" list names each command inside backticks; those are
    // the prohibition, not an instruction. Only an unquoted occurrence counts.
    for (const line of text.split("\n")) {
      const stripped = line.replace(/`[^`]*`/g, "");
      if (FORBIDDEN.some((re) => re.test(stripped))) offending.push(`${f}: ${line.trim().slice(0, 60)}`);
    }
  }
  check("F10", "no Codex prompt instructs a Git network command",
    offending.length === 0 && promptFiles.length === a.length,
    `${promptFiles.length} prompt(s), ${offending.length} offending line(s): ${offending.slice(0, 2).join(" | ")}`);

  // 11. no idle lane while executable work remains
  const assignedToPF = new Set(pf.flatMap((x) => x.items));
  const unassignedSourceReady = master.families.filter((f) => f.state === "SOURCE_READY" && !f.activeOwner && !assignedToPF.has(f.familyId));
  const emptyPF = pf.filter((x) => x.items.length === 0);
  const unassignedSourceObligations = master.totals.sourceObligationsAssigned - src.reduce((n, x) => n + x.itemCount, 0);
  check("F11", "no lane is idle while work of its kind remains unassigned",
    unassignedSourceReady.length === 0
    && !(emptyPF.length > 0 && unassignedSourceReady.length > 0)
    && unassignedSourceObligations === 0
    && checkpoint.codex.queuedTasks === a.length,
    `${unassignedSourceReady.length} source-ready unassigned, ${emptyPF.length} empty builder(s), ${unassignedSourceObligations} source obligation(s) unassigned`);

  // 13. SOURCE_READY means held bytes, not a named identity.
  const falselyReady = master.families.filter((f) => {
    if (f.state !== "SOURCE_READY") return false;
    const r = f.sourceReadiness;
    if (!r) return true;
    if (!r.ready || r.reasons.length > 0) return true;
    if (r.boundCount === 0) return true;
    return r.boundSources.some((b) => !b.path || !b.sha256 || !b.tier);
  }).map((f) => f.familyId);
  const blockedWithNoReason = master.families.filter((f) => f.state === "SOURCE_BLOCKED" && (f.sourceReadiness?.reasons ?? []).length === 0).map((f) => f.familyId);
  check("F13", "SOURCE_READY means every required source is held, indexed and hash-matched",
    falselyReady.length === 0 && blockedWithNoReason.length === 0,
    `${falselyReady.length} falsely ready [${falselyReady.slice(0, 3).join(", ")}]; ${blockedWithNoReason.length} blocked with no stated reason`);

  // 14. The row-stop contract is in every builder prompt, and it is executable.
  const pfPrompts = pf.map((x) => ({ id: x.assignmentId, file: path.join(ROOT, PROMPTS, `${x.assignmentId}.md`) }))
    .filter((x) => fs.existsSync(x.file))
    .map((x) => ({ ...x, text: fs.readFileSync(x.file, "utf8") }));
  const REQUIRED_PROMPT_CLAUSES = [
    { id: "isolation", re: /THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK/ },
    { id: "isolation-not-all", re: /DO NOT EXECUTE PF01-PF16 IN ONE TASK/ },
    { id: "isolation-not-another", re: /DO NOT EXECUTE ANOTHER PF PROMPT IN THIS CONTAINER/ },
    { id: "lane-gate", re: /Lane gate/i },
    { id: "row-gate", re: /Row gate/i },
    { id: "blocked-source-continues", re: /BLOCKED_SOURCE row[\s\S]{0,160}CONTINUE TO THE NEXT FAMILY/ },
    { id: "blocked-legal-continues", re: /BLOCKED_LEGAL_INPUT row[\s\S]{0,160}CONTINUE TO THE NEXT FAMILY/ },
    { id: "one-row-per-family", re: /one row per assigned family/i },
    { id: "stopped-writes-nothing", re: /leave its overlay directory byte-for-byte unchanged/i }
  ];
  const missingClauses = [];
  for (const p of pfPrompts) {
    for (const c of REQUIRED_PROMPT_CLAUSES) if (!c.re.test(p.text)) missingClauses.push(`${p.id}: ${c.id}`);
  }
  check("F14", "every builder prompt carries task isolation and the row-stop contract",
    pfPrompts.length === pf.length && missingClauses.length === 0,
    `${pfPrompts.length}/${pf.length} prompt(s); ${missingClauses.length} missing clause(s): ${missingClauses.slice(0, 3).join(" | ")}`);

  /*
   * 15. The row-stop contract, executed rather than described.
   *
   * A prompt clause is a promise; this is the evaluator that says whether a
   * returned rows.json kept it. The positive control is the shape that matters:
   * a lane whose FIRST family is blocked must still complete the other two.
   */
  const evaluateLane = (assignedFamilies, rows) => {
    const problems = [];
    const byFamily = new Map();
    for (const r of rows) {
      const id = r.itemId ?? r.familyId;
      if (byFamily.has(id)) problems.push(`${id} has two rows`);
      byFamily.set(id, r);
    }
    for (const f of assignedFamilies) if (!byFamily.has(f)) problems.push(`${f} has no row`);
    for (const [id, r] of byFamily) {
      if (!assignedFamilies.includes(id)) problems.push(`${id} was not assigned to this lane`);
      if (!["COMPLETED", "STOPPED"].includes(r.status)) problems.push(`${id} has status ${r.status}`);
      /* A STOPPED row must name a blocker from the closed vocabulary. "not
       * attempted after the first stop" is a lane halt wearing a row: it looks
       * like an accounted family and is a family nobody tried. */
      const ALLOWED_BLOCKERS = /^(BLOCKED_SOURCE|BLOCKED_LEGAL_INPUT|knownRequiredFieldsMissing|requiredFactsNotCollected|unclassifiedBlanks|incompleteRows|requiredOptionsMissing|requiredComponentsMissing|invisibleWrites|protectedWrites|visualDefects)\b/;
      if (r.status === "STOPPED" && !r.blocker) problems.push(`${id} is STOPPED with no blocker`);
      else if (r.status === "STOPPED" && !ALLOWED_BLOCKERS.test(String(r.blocker))) {
        problems.push(`${id} is STOPPED with "${r.blocker}", which is outside the closed blocker vocabulary; a family nobody attempted is a lane halt, not a row`);
      }
      if (r.status === "STOPPED" && r.overlayFilesChanged > 0) problems.push(`${id} is STOPPED and changed ${r.overlayFilesChanged} overlay file(s)`);
    }
    const stoppedIndexes = rows.map((r, i) => (r.status === "STOPPED" ? i : -1)).filter((i) => i >= 0);
    const lastStopped = stoppedIndexes.length ? Math.max(...stoppedIndexes) : -1;
    const completedAfterAStop = rows.slice(lastStopped + 1).some((r) => r.status === "COMPLETED");
    if (stoppedIndexes.length > 0 && rows.length > lastStopped + 1 && !completedAfterAStop) {
      problems.push("every family after the last stop is also stopped; the lane may have halted on a row stop");
    }
    return { ok: problems.length === 0, problems };
  };
  const CONTROL_FAMILIES = ["family-one", "family-two", "family-three"];
  const control = evaluateLane(CONTROL_FAMILIES, [
    { itemId: "family-one", status: "STOPPED", blocker: "BLOCKED_SOURCE", overlayFilesChanged: 0 },
    { itemId: "family-two", status: "COMPLETED", overlayFilesChanged: 12 },
    { itemId: "family-three", status: "COMPLETED", overlayFilesChanged: 14 }
  ]);
  const haltedOnFirstStop = evaluateLane(CONTROL_FAMILIES, [
    { itemId: "family-one", status: "STOPPED", blocker: "BLOCKED_SOURCE", overlayFilesChanged: 0 }
  ]);
  const haltedOnLegalInput = evaluateLane(CONTROL_FAMILIES, [
    { itemId: "family-one", status: "STOPPED", blocker: "BLOCKED_LEGAL_INPUT", overlayFilesChanged: 0 },
    { itemId: "family-two", status: "STOPPED", blocker: "not attempted after the first stop", overlayFilesChanged: 0 },
    { itemId: "family-three", status: "STOPPED", blocker: "not attempted after the first stop", overlayFilesChanged: 0 }
  ]);
  const omittedBlocked = evaluateLane(CONTROL_FAMILIES, [
    { itemId: "family-two", status: "COMPLETED", overlayFilesChanged: 12 },
    { itemId: "family-three", status: "COMPLETED", overlayFilesChanged: 14 }
  ]);
  const stoppedButWrote = evaluateLane(CONTROL_FAMILIES, [
    { itemId: "family-one", status: "STOPPED", blocker: "BLOCKED_SOURCE", overlayFilesChanged: 7 },
    { itemId: "family-two", status: "COMPLETED", overlayFilesChanged: 12 },
    { itemId: "family-three", status: "COMPLETED", overlayFilesChanged: 14 }
  ]);
  check("F15", "the row-stop contract is executable: a blocked first family does not stop the lane, and four ways of breaking that are refused",
    control.ok
    && !haltedOnFirstStop.ok && !haltedOnLegalInput.ok && !omittedBlocked.ok && !stoppedButWrote.ok,
    `control ${control.ok ? "accepted" : `REFUSED: ${control.problems.join("; ")}`}; refusals ${[haltedOnFirstStop, haltedOnLegalInput, omittedBlocked, stoppedButWrote].filter((x) => !x.ok).length}/4`);

  /* ------------------------------------------------------------------ *
   * F16 to F23 -- the eight ways a rolling factory quietly loses work.
   *
   * These read every dispatched assignment in the factory AND in the
   * Washington repair, because a duplicate obligation or a second writer on
   * one host is no less a defect for being split across two documents.
   * ------------------------------------------------------------------ */
  const wash = fs.existsSync(path.join(ROOT, WASHINGTON)) ? read(WASHINGTON) : { assignments: [] };
  const every = [...a, ...wash.assignments];
  const sourceLanes = every.filter((x) => x.itemKind === "sourceObligation");
  const verifyLanes = every.filter((x) => x.lane === "independent-verification");
  const buildingLanes = every.filter((x) => ["packet-build", "rapid-repair", "packet-repair"].includes(x.lane));

  // 16. One document, one obligation. Two lanes acquiring one PDF is two
  //     dispatches for one URL and two receipts for one byte.
  const obligationOwner = new Map();
  const duplicateObligations = [];
  for (const x of sourceLanes) {
    const withinLane = new Set();
    for (const it of x.items ?? []) {
      if (withinLane.has(it)) duplicateObligations.push(`${it} twice within ${x.assignmentId}`);
      withinLane.add(it);
      if (obligationOwner.has(it)) duplicateObligations.push(`${it} in ${obligationOwner.get(it)} and ${x.assignmentId}`);
      else obligationOwner.set(it, x.assignmentId);
    }
  }
  check("F16", "no source obligation is dispatched to two lanes",
    duplicateObligations.length === 0,
    `${sourceLanes.length} source lane(s), ${obligationOwner.size} distinct obligation(s), ${duplicateObligations.length} duplicate(s): ${duplicateObligations.slice(0, 2).join(" | ")}`);

  // 17. A release is a promise that a family is now buildable. Two lanes
  //     cannot both make it: where obligations are split, neither lane
  //     finishes the family alone.
  const releaseOwner = new Map();
  const duplicateReleases = [];
  for (const x of sourceLanes) {
    const withinLane = new Set();
    for (const f of x.familiesUnblocked ?? []) {
      if (withinLane.has(f)) duplicateReleases.push(`${f} twice within ${x.assignmentId}`);
      withinLane.add(f);
      if (releaseOwner.has(f)) duplicateReleases.push(`${f} released by ${releaseOwner.get(f)} and ${x.assignmentId}`);
      else releaseOwner.set(f, x.assignmentId);
    }
  }
  const splitClaimedAnyway = [];
  for (const x of sourceLanes) {
    for (const sp of x.familiesAdvancedButNotReleasedHere ?? []) {
      if ((sp.releasedOnlyWhenAllOf ?? []).length < 2) splitClaimedAnyway.push(`${sp.familyId} names ${(sp.releasedOnlyWhenAllOf ?? []).length} lane(s)`);
      if (releaseOwner.has(sp.familyId)) splitClaimedAnyway.push(`${sp.familyId} is both split and released by ${releaseOwner.get(sp.familyId)}`);
    }
  }
  check("F17", "no family is released by two lanes, and a split family is released by none",
    duplicateReleases.length === 0 && splitClaimedAnyway.length === 0,
    `${releaseOwner.size} released, ${duplicateReleases.length} duplicate(s), ${splitClaimedAnyway.length} bad split(s): ${[...duplicateReleases, ...splitClaimedAnyway].slice(0, 2).join(" | ")}`);

  // 18. A promotion is a release. Promoting without exact bytes releases a
  //     family into a builder that cannot open its source.
  const promotionLanes = sourceLanes.filter((x) => /^SPR/.test(x.assignmentId) || x.operation === "promotion-and-release");
  const promotionWithoutBytes = promotionLanes.filter((x) => !/exact bytes/i.test(String(x.promotionRule ?? "")) || !/SHA-256|sha256/i.test(String(x.promotionRule ?? ""))).map((x) => x.assignmentId);
  const promotedWithoutBytes = master.families.filter((f) => {
    if (f.sourceStatus !== "SOURCE_BOUND_BY_HELD_BYTES") return false;
    const bound = f.sourceReadiness?.boundSources ?? [];
    return bound.length === 0 || bound.some((b) => !b.path || !/^[0-9a-f]{64}$/.test(String(b.sha256 ?? "")) || !b.tier || !b.resolvedBy);
  }).map((f) => f.familyId);
  check("F18", "no source is promoted without exact bytes",
    promotionLanes.length > 0 && promotionWithoutBytes.length === 0 && promotedWithoutBytes.length === 0,
    `${promotionLanes.length} promotion lane(s), ${promotionWithoutBytes.length} without the bytes rule, ${promotedWithoutBytes.length} family(ies) bound without a full custody record [${promotedWithoutBytes.slice(0, 3).join(", ")}]`);

  // 19. A released family that no builder holds is the conveyor stopping at
  //     the moment it finally moved.
  const heldByBuilders = new Set(buildingLanes.flatMap((x) => x.itemKind === "packetFamily" ? x.items : []));
  const releasedButIdle = [...releaseOwner.keys()].filter((f) => {
    const fam = familyById.get(f);
    return fam && fam.state === "SOURCE_READY" && !fam.activeOwner && !heldByBuilders.has(f);
  });
  const refillStated = pf.every((x) => /releases a family/i.test(String(x.refillRule ?? "")));
  check("F19", "a released family is assigned, and the refill rule says who assigns it",
    releasedButIdle.length === 0 && refillStated,
    `${releasedButIdle.length} released and idle [${releasedButIdle.slice(0, 3).join(", ")}]; refill rule on every builder: ${refillStated}`);

  // 20. A verifier whose checkout predates the packet commit does not verify
  //     a packet; it verifies an absence, and an absence reads as a defect.
  const verifierProblems = [];
  for (const v of verifyLanes) {
    const n = (v.items ?? []).length;
    if (v.launchNow === undefined) { verifierProblems.push(`${v.assignmentId} does not say whether it may launch`); continue; }
    if (v.launchNow === false) {
      if (!v.launchRule) verifierProblems.push(`${v.assignmentId} is held back with no rule for releasing it`);
      continue;
    }
    if (n === 0) { verifierProblems.push(`${v.assignmentId} is launchable with nothing to verify`); continue; }
    if (!/^[0-9a-f]{7,40}$/.test(String(v.verifiesCommit ?? ""))) { verifierProblems.push(`${v.assignmentId} names no packet commit`); continue; }
    if (gitOk(["cat-file", "-e", `${v.verifiesCommit}^{commit}`])) {
      for (const d of v.packetDirectories ?? []) {
        if (!gitOk(["cat-file", "-e", `${v.verifiesCommit}:${d}`])) verifierProblems.push(`${v.assignmentId}: ${d} does not exist at ${v.verifiesCommit}`);
      }
    } else verifierProblems.push(`${v.assignmentId}: commit ${v.verifiesCommit} is not in this repository`);
  }
  check("F20", "no verification assignment is launchable before the packet commit it must read exists",
    verifierProblems.length === 0,
    `${verifyLanes.length} verifier(s), ${verifierProblems.length} problem(s): ${verifierProblems.slice(0, 2).join(" | ")}`);

  // 21. The verifier may not be the builder or the repairer.
  const builderOf = new Map();
  for (const x of buildingLanes) for (const f of (x.itemKind === "packetFamily" ? x.items : [])) builderOf.set(f, x.assignmentId);
  const independenceProblems = [];
  for (const v of verifyLanes) {
    if (!(v.mayNotBeRunBy ?? []).length) independenceProblems.push(`${v.assignmentId} names nobody it may not be run by`);
    for (const f of v.items ?? []) {
      if (builderOf.has(f)) {
        const excluded = (v.mayNotBeRunBy ?? []).join(" ");
        if (!excluded.includes(builderOf.get(f)) && !/any PF or FIX lane|the worker that built or last repaired/i.test(excluded)) {
          independenceProblems.push(`${v.assignmentId} verifies ${f}, built by ${builderOf.get(f)}, without excluding it`);
        }
      }
    }
    for (const owned of v.ownedPaths ?? []) {
      if (/overlays\/census-v1|build-census-v1/.test(owned)) independenceProblems.push(`${v.assignmentId} owns a write path into what it verifies: ${owned}`);
    }
  }
  check("F21", "no verification worker is the builder or the repairer of what it verifies",
    independenceProblems.length === 0,
    `${verifyLanes.length} verifier(s), ${independenceProblems.length} problem(s): ${independenceProblems.slice(0, 2).join(" | ")}`);

  // 22. An executable family nobody holds is capacity spent on nothing.
  const executable = master.families.filter((f) =>
    f.state === "SOURCE_READY" && f.legalInputStatus !== "OPEN_LEGAL_INPUT" && !f.activeOwner);
  const idleExecutable = executable.filter((f) => !heldByBuilders.has(f.familyId)).map((f) => f.familyId);
  const repairable = master.families.filter((f) => f.state === "REPAIR_REQUIRED" && !f.activeOwner)
    .filter((f) => !heldByBuilders.has(f.familyId)).map((f) => f.familyId);
  check("F22", "no executable family is left idle",
    idleExecutable.length === 0 && repairable.length === 0,
    `${executable.length} executable, ${idleExecutable.length} idle [${idleExecutable.slice(0, 3).join(", ")}]; ${repairable.length} repairable and unheld [${repairable.slice(0, 3).join(", ")}]`);

  // 23. One shared host, one writer -- counted across both documents.
  const hostWriters = new Map();
  for (const x of every) {
    for (const owned of x.ownedPaths ?? []) {
      const m = /(scripts\/build-census-v1-[^*\s]+\.mjs)/.exec(owned);
      if (!m) continue;
      const fam = familyById.get(path.basename(m[1]).replace(/^build-census-v1-|\.mjs$/g, ""));
      const shared = fam ? (fam.importedBy ?? []).length > 0 || fam.exclusiveScript === false : true;
      if (!shared) continue;
      hostWriters.set(m[1], [...(hostWriters.get(m[1]) ?? []), x.assignmentId]);
    }
  }
  const multiWriter = [...hostWriters.entries()].filter(([, ids]) => new Set(ids).size > 1)
    .map(([h, ids]) => `${path.basename(h)}: ${[...new Set(ids)].join(", ")}`);
  check("F23", "no shared build host has two writers, across every dispatched document",
    multiWriter.length === 0,
    `${hostWriters.size} shared host(s) claimed, ${multiWriter.length} with more than one writer: ${multiWriter.slice(0, 2).join(" | ")}`);

  // The arithmetic that makes the rest readable.
  check("F12", "the live denominator closes",
    master.denominator.sumsToDenominator === true
    && master.denominator.liveFamilyDenominator === master.families.length
    && master.totals.lanes === a.length && a.length >= 32,
    `${master.families.length} families, ${a.length} lanes`);

  const failed = results.filter((r) => !r.ok);
  return { results: [...results], failed };
}

const first = run();
for (const r of first.results) console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.id.padEnd(4)} ${r.title}${r.ok ? "" : `\n         observed: ${r.observed}`}`);
console.log(`\n${first.results.length - first.failed.length}/${first.results.length} factory checks passed.`);

if (MUTATIONS) {
  console.log("\nmutations:");
  const targets = { master: path.join(ROOT, MASTER), active: path.join(ROOT, ACTIVE), collisions: path.join(ROOT, COLLISIONS), checkpoint: path.join(ROOT, CHECKPOINT) };
  const originals = Object.fromEntries(Object.entries(targets).map(([k, p]) => [k, fs.readFileSync(p)]));
  const promptTarget = path.join(ROOT, PROMPTS, "PF01.md");
  const originalPrompt = fs.readFileSync(promptTarget);
  const firstPF = (j) => j.assignments.find((x) => x.lane === "packet-build" && x.items.length > 0);
  const cases = [
    { on: "active", id: "F1", name: "a family claimed by two builders is caught", mutate: (j) => { const b = j.assignments.filter((x) => x.lane === "packet-build" && x.items.length); b[1].items.push(b[0].items[0]); return j; } },
    { on: "active", id: "F2", name: "two lanes owning one path is caught", mutate: (j) => { const b = j.assignments.filter((x) => x.lane === "packet-build" && x.items.length); b[1].ownedPaths.push(b[0].ownedPaths[1]); return j; } },
    { on: "active", id: "F3", name: "a shared host with two writers is caught", mutate: (j) => { const b = j.assignments.filter((x) => x.lane === "packet-build"); const s = b.find((x) => x.ownedPaths.some((p) => /build-census-v1/.test(p))).ownedPaths.find((p) => /build-census-v1/.test(p)); b.find((x) => !x.ownedPaths.includes(s)).ownedPaths.push(s); return j; } },
    { on: "active", id: "F4", name: "an active family re-dispatched is caught", mutate: (j) => { firstPF(j).items.push(read(MASTER).activeOwnership.families[0]); return j; } },
    { on: "active", id: "F5", name: "a placeholder in an assignment is caught", mutate: (j) => { firstPF(j).mission = "TBD"; return j; } },
    { on: "master", id: "F6", name: "a source-blocked family sent to a builder is caught", mutate: (j) => { const f = j.families.find((x) => x.state === "SOURCE_READY" && !x.activeOwner); f.state = "SOURCE_BLOCKED"; return j; } },
    { on: "master", id: "F7", name: "a legally blocked family sent to a builder is caught", mutate: (j) => { const f = j.families.find((x) => x.state === "SOURCE_READY" && !x.activeOwner); f.legalInputStatus = "OPEN_LEGAL_INPUT"; return j; } },
    { on: "master", id: "F8", name: "an incomplete family recorded as complete is caught", mutate: (j) => { const f = j.families.find((x) => x.counters && Object.values(x.counters).some((v) => v > 0)); f.state = "VERIFIED_PASS"; return j; } },
    { on: "active", id: "F9", name: "a verifier verifying what a builder in this wave builds is caught", mutate: (j) => { const b = firstPF(j); j.assignments.find((x) => x.lane === "independent-verification").items.push(b.items[0]); return j; } },
    { on: "active", id: "F11", name: "a source-ready family left unassigned is caught", mutate: (j) => { firstPF(j).items.pop(); return j; } },
    { on: "checkpoint", id: "F11", name: "a queue count that disagrees with the lanes is caught", mutate: (j) => { j.codex.queuedTasks = 7; return j; } },
    { on: "master", id: "F12", name: "a denominator that does not close is caught", mutate: (j) => { j.denominator.sumsToDenominator = false; return j; } },
    { on: "collisions", id: "F2", name: "a collision record reporting a collision it did not fail on is caught", mutate: (j) => { j.counts.pathCollisions = 1; return j; } },
    { on: "prompt", id: "F10", name: "a prompt instructing a Git network command is caught", mutateText: (t) => `${t}\n\nRun git push origin work when you are finished.\n` },
    /* F16 to F23 -- the eight ways a rolling factory quietly loses work.
     * Where the dispatch is correct the condition has no subject in it, so
     * these construct the condition rather than searching for one. */
    { on: "active", id: "F16", name: "one source obligation dispatched to two lanes is caught", mutate: (j) => { const s = j.assignments.filter((x) => x.itemKind === "sourceObligation" && x.items.length); s[1].items.push(s[0].items[0]); return j; } },
    { on: "active", id: "F17", name: "one family released by two source lanes is caught", mutate: (j) => { const s = j.assignments.filter((x) => x.itemKind === "sourceObligation" && (x.familiesUnblocked ?? []).length); s[1].familiesUnblocked.push(s[0].familiesUnblocked[0]); return j; } },
    { on: "active", id: "F17", name: "a split family claimed as released anyway is caught", mutate: (j) => { const s = j.assignments.find((x) => (x.familiesAdvancedButNotReleasedHere ?? []).length); s.familiesUnblocked.push(s.familiesAdvancedButNotReleasedHere[0].familyId); return j; } },
    { on: "master", id: "F18", name: "a family bound by held bytes with no custody path is caught", mutate: (j) => { const f = j.families.find((x) => x.sourceStatus === "SOURCE_BOUND_BY_HELD_BYTES"); f.sourceReadiness.boundSources[0].path = ""; return j; } },
    { on: "active", id: "F18", name: "a promotion lane that drops the exact-bytes rule is caught", mutate: (j) => { j.assignments.find((x) => /^PROMO/.test(x.assignmentId)).promotionRule = "promote what the lane has resolved"; return j; } },
    { on: "active", id: "F19", name: "a builder that drops the refill rule is caught", mutate: (j) => { j.assignments.find((x) => x.lane === "packet-build").refillRule = "the lane works through its list"; return j; } },
    { on: "active", id: "F20", name: "an empty verifier marked launchable is caught", mutate: (j) => { const v = j.assignments.find((x) => x.lane === "independent-verification"); v.items = []; v.launchNow = true; return j; } },
    { on: "active", id: "F20", name: "a verifier naming a commit this repository does not have is caught", mutate: (j) => { j.assignments.find((x) => x.lane === "independent-verification").verifiesCommit = "0123456789abcdef0123456789abcdef01234567"; return j; } },
    { on: "active", id: "F21", name: "a verifier that owns a write path into what it verifies is caught", mutate: (j) => { j.assignments.find((x) => x.lane === "independent-verification").ownedPaths.push("data/rcap-all50/overlays/census-v1/**"); return j; } },
    { on: "active", id: "F22", name: "an executable family dropped from every builder is caught", mutate: (j) => { firstPF(j).items.pop(); return j; } },
    /* No builder claims a shared host in a correct dispatch, so this hands a
     * real shared host from the master queue to two of them. */
    { on: "active", id: "F23", name: "a shared build host handed to two lanes is caught", mutate: (j) => { const shared = read(MASTER).families.find((f) => (f.importedBy ?? []).length > 0 && f.buildScript); if (!shared) throw new Error("the master queue names no shared build host at all"); const b = j.assignments.filter((x) => x.lane === "packet-build"); b[0].ownedPaths.push(shared.buildScript); b[1].ownedPaths.push(shared.buildScript); return j; } },
    { on: "master", id: "F13", name: "an exact identity with no held byte classified SOURCE_READY is caught", mutate: (j) => { const f = j.families.find((x) => x.state === "SOURCE_BLOCKED"); f.state = "SOURCE_READY"; return j; } },
    { on: "master", id: "F13", name: "a held path with no SHA classified SOURCE_READY is caught", mutate: (j) => { const f = j.families.find((x) => x.state === "SOURCE_READY"); f.sourceReadiness.boundSources[0].sha256 = null; return j; } },
    { on: "master", id: "F13", name: "a held SHA with no indexed path classified SOURCE_READY is caught", mutate: (j) => { const f = j.families.find((x) => x.state === "SOURCE_READY"); f.sourceReadiness.boundSources[0].path = null; return j; } },
    { on: "master", id: "F13", name: "a readiness verdict with a stated reason still called ready is caught", mutate: (j) => { const f = j.families.find((x) => x.state === "SOURCE_READY"); f.sourceReadiness.reasons = ["indexed SHA-256 does not equal the held SHA-256"]; return j; } },
    { on: "master", id: "F13", name: "a family with zero bound sources classified SOURCE_READY is caught", mutate: (j) => { const f = j.families.find((x) => x.state === "SOURCE_READY"); f.sourceReadiness.boundSources = []; f.sourceReadiness.boundCount = 0; return j; } },
    { on: "prompt", id: "F14", name: "a builder prompt without the task-isolation banner is caught", mutateText: (t) => t.replace(/THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK\./, "This is a task.") },
    { on: "prompt", id: "F14", name: "a builder prompt whose blocked family does not continue the lane is caught", mutateText: (t) => t.replace(/CONTINUE TO THE NEXT FAMILY/g, "stop the lane") },
    { on: "prompt", id: "F14", name: "a builder prompt that drops the one-row-per-family rule is caught", mutateText: (t) => t.replace(/one row per assigned family/gi, "some rows") },
    { on: "prompt", id: "F14", name: "a builder prompt that lets a stopped family write is caught", mutateText: (t) => t.replace(/leave its overlay directory byte-for-byte unchanged/i, "may leave partial output") }
  ];
  let undetected = 0;
  try {
    for (const c of cases) {
      if (c.on === "prompt") fs.writeFileSync(promptTarget, c.mutateText(originalPrompt.toString("utf8")));
      else fs.writeFileSync(targets[c.on], `${JSON.stringify(c.mutate(JSON.parse(originals[c.on].toString("utf8"))), null, 2)}\n`);
      let caught = false;
      try {
        const after = run();
        caught = after.failed.some((f) => f.id === c.id);
      } catch { caught = true; }
      if (c.on === "prompt") fs.writeFileSync(promptTarget, originalPrompt);
      else fs.writeFileSync(targets[c.on], originals[c.on]);
      console.log(`  ${caught ? "detected " : "MISSED   "} [${c.id}] ${c.name}`);
      if (!caught) undetected += 1;
    }
  } finally {
    for (const [k, p] of Object.entries(targets)) fs.writeFileSync(p, originals[k]);
    fs.writeFileSync(promptTarget, originalPrompt);
  }
  const restored = Object.entries(targets).every(([k, p]) => fs.readFileSync(p).equals(originals[k]))
    && fs.readFileSync(promptTarget).equals(originalPrompt);
  console.log(`\n  every mutated file restored byte-for-byte: ${restored}`);
  if (!restored || undetected > 0) { console.error("the factory verifier proves less than it claims."); process.exit(1); }
  console.log(`\nOK factory mutations — ${cases.length} case(s), every mutation caught.`);
}

const final = run();
if (final.failed.length > 0) { console.error(`\n${final.failed.length} factory check(s) FAILED.`); process.exit(1); }
