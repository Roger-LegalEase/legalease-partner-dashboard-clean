#!/usr/bin/env node
/**
 * Does the 24-hour packet factory dispatch hold?
 *
 *   node scripts/grade-a-packet-factory-24h/verify.mjs
 *   node scripts/grade-a-packet-factory-24h/verify.mjs --mutations
 *
 * Every refusal has a mutation that proves it is not vacuous. The
 * dispatch is large enough that a check nobody can falsify would be believed
 * for the whole 24 hours, so every one of them is broken on purpose here and
 * required to fail.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  artifactsOnlyBookkeepingRepairsFailure,
  canRereadAfterRepair
} from "./post-repair-reread.mjs";
import { pathsOverlap } from "./path-ownership.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const MUTATIONS = process.argv.includes("--mutations");

const DIR = "data/rcap-grade-a/packet-factory-24h";
const PROMPTS = "docs/rcap/grade-a/packet-factory-24h";

/*
 * Every prompt under the dispatch directory, including the ones in
 * per-state subdirectories.
 *
 * F10, F14 and F25 used a non-recursive readdirSync, so the live
 * vermont-repair/ and washington-repair/ lanes -- dispatched prompts that
 * claim.mjs knows by lane kind -- were never scanned. C13 stripped the task
 * isolation banner and the row-stop contract out of WAR03 and appended
 * `git fetch origin`, `git pull`, `pdftoppm -r 72` and
 * `apt-get install -y poppler-utils`, and all three checks reported ok on a
 * 27/27 gate. The checks counted their denominator correctly; they just could
 * not see two thirds of the lanes.
 *
 * Returned relative to PROMPTS so a failure names the subdirectory.
 */
function promptFilesRecursive() {
  const out = [];
  const walk = (rel) => {
    const abs = path.join(ROOT, PROMPTS, rel);
    if (!fs.existsSync(abs)) return;
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(r);
      else if (e.name.endsWith(".md")) out.push(r);
    }
  };
  walk("");
  return out.sort();
}
// A scan of an empty set passes every content check it applies. The dispatch
// has never had fewer than this, and a sudden collapse is a defect rather than
// a quiet day.
const MINIMUM_PROMPTS = 48;
const MASTER = `${DIR}/MASTER_QUEUE.json`;
const ACTIVE = `${DIR}/ACTIVE_ASSIGNMENTS.json`;
const GRAPH = `${DIR}/IMPORT_GRAPH.json`;
const COLLISIONS = `${DIR}/COLLISIONS.json`;
const CHECKPOINT = `${DIR}/CHECKPOINT.json`;
const LEDGER = `${DIR}/claim-ledger.json`;
const STALE = `${DIR}/STALE_LANE_RETURNS.json`;
const RASTER = "scripts/raster/pdf-page-raster.mjs";
const CLAIM = "scripts/grade-a-packet-factory-24h/claim.mjs";
const WASHINGTON = `${DIR}/WASHINGTON_REPAIR.json`;

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const gitOk = (args) => { try { execFileSync("git", args, { cwd: ROOT, stdio: "ignore" }); return true; } catch { return false; } };

/*
 * A verifier assignment is executable only when claim.mjs --assert can accept
 * every item it names. Released claims remain valid history when they are not
 * dispatched; a released claim in a current VF assignment is an instruction
 * to do work the named lane is forbidden to begin.
 */
function verificationClaimProblems(active, ledger) {
  const problems = [];
  for (const assignment of active.assignments ?? []) {
    if (assignment.lane !== "independent-verification") continue;
    for (const familyId of assignment.items ?? []) {
      const claims = (ledger.claims ?? []).filter((claim) =>
        claim.subjectType === "packet-family"
        && claim.subjectId === familyId
        && claim.operation === "independent-verification");
      if (claims.length !== 1) {
        problems.push(`${assignment.assignmentId}/${familyId}: ${claims.length} matching claims`);
        continue;
      }
      const claim = claims[0];
      if (claim.lane !== assignment.assignmentId) {
        problems.push(`${assignment.assignmentId}/${familyId}: matching claim belongs to ${claim.lane}`);
      } else if (claim.laneKind !== "independent-verification") {
        problems.push(`${assignment.assignmentId}/${familyId}: matching claim has laneKind ${claim.laneKind}`);
      } else if (claim.released) {
        problems.push(`${assignment.assignmentId}/${familyId}: matching claim is released at ${claim.releasedAt ?? "an unknown time"}`);
      }
    }
  }
  return problems;
}

const focusedInvariantIndex = process.argv.indexOf("--check-verification-claim-invariant");
if (focusedInvariantIndex >= 0) {
  const activePath = process.argv[focusedInvariantIndex + 1];
  const ledgerPath = process.argv[focusedInvariantIndex + 2];
  if (!activePath || !ledgerPath) {
    console.error("usage: verify.mjs --check-verification-claim-invariant <active-assignments.json> <claim-ledger.json>");
    process.exit(2);
  }
  const active = JSON.parse(fs.readFileSync(path.resolve(activePath), "utf8"));
  const ledger = JSON.parse(fs.readFileSync(path.resolve(ledgerPath), "utf8"));
  const problems = verificationClaimProblems(active, ledger);
  if (problems.length) {
    console.error(`UNASSERTABLE_VERIFICATION_DISPATCH ${problems.length}`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  const count = (active.assignments ?? [])
    .filter((assignment) => assignment.lane === "independent-verification")
    .reduce((total, assignment) => total + (assignment.items ?? []).length, 0);
  console.log(`VERIFICATION_CLAIMS_ASSERTABLE ${count}`);
  process.exit(0);
}

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

  // A STOPPED builder row is not a completed build, even when preserved WIP
  // bytes are complete enough for the matrix to audit.  This guards the exact
  // failure that promoted a source-unreproducible Michigan WIP to
  // VERIFY_PENDING after a full matrix refresh.
  const stoppedBuildPromotions = [];
  const stoppedBuildRows = new Map();
  const completedBuildFamilies = new Set();
  for (const entry of fs.readdirSync(path.join(ROOT, DIR), { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^pf\d+$/i.test(entry.name)) continue;
    // Match the generator's laneReturnDocuments contract. Later cohorts keep
    // earlier returns intact and may write their completed rows beside them.
    for (const file of fs.readdirSync(path.join(ROOT, DIR, entry.name))) {
      if (!file.endsWith(".json")) continue;
      const rowsPath = `${DIR}/${entry.name}/${file}`;
      let laneRows;
      try { laneRows = read(rowsPath).rows; } catch { continue; }
      if (!Array.isArray(laneRows) || laneRows.length === 0
        || !laneRows.every((row) => (row?.itemId ?? row?.familyId) && row?.status)) continue;
      for (const row of laneRows) {
        const familyId = row.itemId ?? row.familyId;
        if (row.status === "COMPLETED") completedBuildFamilies.add(familyId);
        else if (row.status === "STOPPED") {
          if (!stoppedBuildRows.has(familyId)) stoppedBuildRows.set(familyId, []);
          stoppedBuildRows.get(familyId).push({ row, rowsPath });
        }
      }
    }
  }
  for (const familyId of completedBuildFamilies) stoppedBuildRows.delete(familyId);
  const buildVerifierRows = (() => {
    try { return read(`${DIR}/VERIFIER_RETURNS.json`).rows ?? []; }
    catch { return []; }
  })();
  for (const [familyId, stoppedRows] of stoppedBuildRows) {
    const family = familyById.get(familyId);
    if (!family || !["PASS_COMPLETE", "VERIFY_PENDING", "VERIFYING", "BUILT_RASTER_PENDING", "VERIFIED_PASS", "COMPLETE_PACKET_PROVEN"].includes(family.state)) continue;
    // The generator gives a current independent PASS precedence over an old
    // build stop. Require the actual selected return and prove that every
    // exact STOPPED row already existed at its read base. A queue label, a
    // released claim, or a pass preceding a new stop does not discharge F37.
    const selected = family.selectedIndependentVerdict;
    const pass = buildVerifierRows.find((row) => row.familyId === familyId
      && row.isIndependentVerification === true && !row.superseded
      && row.verdict === "PASS_COMPLETE_INDEPENDENT"
      && selected?.verdict === row.verdict && selected.lane === row.lane
      && selected.verifiedAtBase === row.verifiedAtBase && selected.evidencePath === row.evidencePath);
    const passCoversStops = pass && /^[0-9a-f]{7,40}$/.test(String(pass.verifiedAtBase ?? ""))
      && typeof pass.evidencePath === "string"
      && fs.existsSync(path.join(ROOT, pass.evidencePath))
      && gitOk(["merge-base", "--is-ancestor", pass.verifiedAtBase, "HEAD"])
      && stoppedRows.every(({ row, rowsPath }) => {
        try {
          const before = JSON.parse(execFileSync("git", ["show", `${pass.verifiedAtBase}:${rowsPath}`],
            { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
          return (before.rows ?? []).some((prior) => JSON.stringify(prior) === JSON.stringify(row));
        } catch { return false; }
      });
    if (!passCoversStops) {
      stoppedBuildPromotions.push(`${familyId}: STOPPED in ${stoppedRows.map((row) => row.rowsPath).join(", ")}, state ${family.state}`);
    }
  }
  check("F37", "a STOPPED packet-build return cannot promote preserved WIP bytes to verification",
    stoppedBuildPromotions.length === 0, stoppedBuildPromotions.slice(0, 3).join(" | "));

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
      if (pathsOverlap(paths[i].path, paths[j].path)) hits.push(`${paths[i].lane}~${paths[j].lane} at ${paths[i].path}`);
    }
  }
  check("F2", "no two lanes own the same path", hits.length === 0 && collisions.counts.pathCollisions === 0, hits.slice(0, 3).join(" | "));

  const ownedAndProhibited = a.flatMap((assignment) =>
    (assignment.prohibitedPaths ?? []).flatMap((prohibited) =>
      assignment.ownedPaths
        .filter((owned) => pathsOverlap(owned, prohibited))
        .map((owned) => `${assignment.assignmentId} owns ${owned} but prohibits ${prohibited}`)
    )
  );
  check("F36", "no lane owns a path that its own instructions prohibit",
    ownedAndProhibited.length === 0 && collisions.counts.ownedAndProhibited === 0,
    ownedAndProhibited.slice(0, 3).join(" | "));

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
  const pathClash = paths.filter((p) => activePaths.some((q) => pathsOverlap(p.path, q)));
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
  const promptFiles = promptFilesRecursive();
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
  /*
   * The denominator used to be `promptFiles.length === a.length`, which held
   * only while the scan was non-recursive and the factory was the only
   * dispatch in this tree. Recursion brings the Vermont and Washington repair
   * prompts in too, so the claim to make is the one that was always meant: the
   * scan reached at least the floor, and every assignment this generator makes
   * has a prompt file on disk that the scan actually read.
   */
  const readSet = new Set(promptFiles.map((f) => `${PROMPTS}/${f}`));
  const unscannedAssignments = a.filter((x) => !readSet.has(x.promptFile));
  check("F10", "no Codex prompt instructs a Git network command",
    offending.length === 0 && promptFiles.length >= MINIMUM_PROMPTS && unscannedAssignments.length === 0,
    `${promptFiles.length} prompt(s) (floor ${MINIMUM_PROMPTS}), ${unscannedAssignments.length} assignment prompt(s) the scan never read, ${offending.length} offending line(s): ${offending.slice(0, 2).join(" | ")}`);

  // 11. no idle lane while executable work remains
  const assignedToPF = new Set(pf.flatMap((x) => x.items));
  const unassignedSourceReady = master.families.filter((f) => f.state === "SOURCE_READY" && !f.activeOwner && !assignedToPF.has(f.familyId));
  const emptyPF = pf.filter((x) => x.items.length === 0);
  const assignedSourceItems = new Set(src.flatMap((x) => x.items));
  const missingExactSourceAssignments = master.families
    .filter((f) => ["SOURCE_BLOCKED", "LEGAL_BLOCKED"].includes(f.state))
    .flatMap((f) => {
      const bound = new Set((f.sourceReadiness?.boundSources ?? []).map((s) => s.sourceId));
      return (f.sourceReadiness?.effectiveOfficialSourceIds ?? [])
        .filter((sourceId) => !bound.has(sourceId))
        .map((sourceId) => `${f.familyId}::${sourceId}`);
    })
    .filter((itemId) => !assignedSourceItems.has(itemId));
  const unassignedSourceObligations = master.totals.sourceObligationsAssigned - src.reduce((n, x) => n + x.itemCount, 0);
  check("F11", "no lane is idle while work of its kind remains unassigned",
    unassignedSourceReady.length === 0
    && !(emptyPF.length > 0 && unassignedSourceReady.length > 0)
    && missingExactSourceAssignments.length === 0
    && unassignedSourceObligations === 0
    && checkpoint.codex.queuedTasks === a.length,
    `${unassignedSourceReady.length} source-ready unassigned, ${emptyPF.length} empty builder(s), ${missingExactSourceAssignments.length} exact source obligation(s) undispatched [${missingExactSourceAssignments.slice(0, 2).join(", ")}], ${unassignedSourceObligations} source obligation(s) unassigned`);

  // 13. SOURCE_READY means held bytes, not a named identity.
  const falselyReady = master.families.filter((f) => {
    if (f.state !== "SOURCE_READY") return false;
    const r = f.sourceReadiness;
    if (!r) return true;
    if (!r.ready || r.reasons.length > 0) return true;
    /* A custom pleading drafts from codified text rather than a PDF. Group C's
     * governed source-strategy decisions additionally require the controlling
     * official authority to be bound by exact identity and URL. */
    /*
     * So does an instrument the owner determined is COMPOSED FROM AUTHORITY.
     * Louisiana's statutory forms and Florida's Rule 3.989 instruments are
     * generated faithfully from codified text; no agency-issued fillable PDF
     * exists to hold, so "held, indexed and hash-matched" cannot be owed for
     * them and this check would otherwise call the correct state false.
     *
     * The exemption is exactly as narrow as the determination. It reaches only
     * the obligations generate.mjs recorded in satisfiedByAuthority, which are
     * only the statutory or rule instruments themselves — the Florida FDLE
     * applications attach as separate OFFICIAL components and are still owed
     * as held bytes, which is why six Florida families are blocked rather than
     * ready. Every other gate on these families is untouched.
     */
    if (r.boundCount === 0 && (r.satisfiedByAuthority ?? []).length > 0) return false;
    if (f.sourceReconciliation?.group === "C" && f.implementationStrategy === "custom_pleading"
      && (r.boundAuthorities ?? []).length === 0) return true;
    if ((r.boundAuthorities ?? []).some((a) => !a.sourceId || !a.title || !a.issuingAuthority || !/^https:\/\//.test(a.officialUrl ?? ""))) return true;
    if (r.boundCount === 0) return f.implementationStrategy !== "custom_pleading" && f.implementationStrategy !== "participant_agency_application";
    return r.boundSources.some((b) => !b.path || !b.sha256 || !b.tier);
  }).map((f) => f.familyId);
  const blockedWithNoReason = master.families.filter((f) => f.state === "SOURCE_BLOCKED"
    && (f.sourceReadiness?.reasons ?? []).length === 0
    && !f.verifierSourceHold?.evidencePath
    && !(f.executionReclassification?.stateOverride === "SOURCE_BLOCKED"
      && f.executionOwner && f.nextExecutableAction)).map((f) => f.familyId);
  const supersededStillBound = master.families.filter((f) => {
    const superseded = new Set(Object.keys(f.sourceReconciliation?.sourceReplacements ?? {}));
    return (f.sourceReadiness?.boundSources ?? []).some((source) => superseded.has(source.sourceId));
  }).map((f) => f.familyId);
  check("F13", "SOURCE_READY means every required source is held, indexed and hash-matched",
    falselyReady.length === 0 && blockedWithNoReason.length === 0 && supersededStillBound.length === 0,
    `${falselyReady.length} falsely ready [${falselyReady.slice(0, 3).join(", ")}]; ${blockedWithNoReason.length} blocked with no stated reason; ${supersededStillBound.length} famil(ies) still bind superseded source identities [${supersededStillBound.slice(0, 3).join(", ")}]`);

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
  /*
   * 28. Task isolation, in EVERY dispatched prompt.
   *
   * F14 checks the sixteen builder prompts against a clause set written in PF
   * vocabulary. The Vermont and Washington repair prompts are dispatched the
   * same way, into the same kind of isolated container, and F14 does not reach
   * them: C13 stripped the isolation banner out of WAR03 and F14 stayed green
   * because WAR03 is not a builder.
   *
   * The banner is what stops one container from executing a whole lane family
   * in a single task and reporting twelve independent returns. That claim is
   * universal, so it is checked over every prompt in the tree rather than over
   * the ones a single generator happens to write.
   */
  /*
   * Dispatch prompts only. The prompt directory also carries reports -- the
   * human-action source list among them -- and a report is not a task anyone
   * executes in a container, so demanding an isolation banner on one is asking
   * the wrong question of the wrong document. The exclusion is an explicit
   * short list rather than a pattern, so adding to it is a visible decision.
   */
  const NOT_A_DISPATCH_PROMPT = new Set(["ROGER_SOURCE_UNBLOCK_LIST.md"]);
  const allPrompts = promptFilesRecursive().filter((f) => !NOT_A_DISPATCH_PROMPT.has(path.basename(f)));
  const noIsolation = allPrompts.filter((f) =>
    !/THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK/.test(fs.readFileSync(path.join(ROOT, PROMPTS, f), "utf8")));
  check("F28", "every dispatched prompt in the tree carries the task-isolation banner",
    noIsolation.length === 0 && allPrompts.length >= MINIMUM_PROMPTS,
    `${allPrompts.length} prompt(s) (floor ${MINIMUM_PROMPTS}), ${noIsolation.length} without the banner: ${noIsolation.slice(0, 3).join(", ")}`);

  /*
   * 29. A returned verdict is acted on.
   *
   * P2V01-P2V03 failed nine Washington families and all nine stayed VERIFYING,
   * because the state machine read VERIFYING off the presence of an
   * independent-verification owner and never asked whether that owner had
   * returned. The queue therefore said a verdict was pending on nine families
   * that had one, and they would have reached Lawrence review as in-flight
   * rather than as failed. This is the Vermont pardon defect again in a
   * different field: a record that outranks the evidence sitting beside it.
   *
   * Three things are asked. A family an independent verifier failed is not
   * VERIFYING and is not treated as proven. Every such family is dispatched to
   * a repair lane, because moving it out of VERIFYING and leaving it nowhere is
   * a queue that has lost work quietly. And the repair prompt that receives it
   * names the exact obligation the verifier failed, because "incomplete" is not
   * a defect and a repair worker cannot act on it.
   */
  const returnedVerdictProblems = [];
  let vr = null;
  try { vr = JSON.parse(fs.readFileSync(path.join(ROOT, DIR, "VERIFIER_RETURNS.json"), "utf8")); }
  catch { returnedVerdictProblems.push("no verifier-return extraction; a returned verdict nothing reads cannot move a family"); }
  if (vr) {
    /* A superseded verdict is history: a family failed by VF06 and passed by
     * VF23 after repair is not a failed family, and demanding a live repair
     * dispatch for it would re-open finished work. */
    /* A completed repair supersedes the verdict it answered: the repair lane
     * released its claim after fixing exactly the failed obligations, and the
     * family is awaiting re-raster and a fresh independent read. Demanding a
     * live repair dispatch for it would re-open finished work. A LIVE repair
     * claim means the repair is still running and the family stays failed. */
    const repairDone = new Set();
    const repairLive = new Set();
    {
      const led = fs.existsSync(path.join(ROOT, LEDGER)) ? read(LEDGER) : null;
      for (const c of led?.claims ?? []) {
        if (c.laneKind !== "repair" && c.laneKind !== "shared-host-repair") continue;
        for (const fid of c.familyIds ?? (c.familyId ? [c.familyId] : []))
          (c.released === true ? repairDone : repairLive).add(fid);
      }
    }
    const failedFamilies = (vr.rows ?? []).filter((r) => r.isIndependentVerification && r.verdict === "FAIL_REPAIR_REQUIRED" && !r.superseded
      && !(repairDone.has(r.familyId) && !repairLive.has(r.familyId)));
    const PROVEN = new Set(["VERIFYING", "VERIFIED_PASS", "LEGAL_REVIEW_READY", "LEGAL_APPROVED", "COMPLETE_PACKET_PROVEN"]);
    const repairText = fs.existsSync(path.join(ROOT, DIR, "WASHINGTON_REPAIR.json"))
      ? fs.readFileSync(path.join(ROOT, DIR, "WASHINGTON_REPAIR.json"), "utf8") : "";
    const vermontText = fs.existsSync(path.join(ROOT, DIR, "VERMONT_REPAIR.json"))
      ? fs.readFileSync(path.join(ROOT, DIR, "VERMONT_REPAIR.json"), "utf8") : "";
    /* A live repair grant is already a dispatch, including a deliberately held
     * off-roster lane. It must not be replaced merely to make this text search
     * find an internal prompt. */
    const dispatchedSomewhere = (familyId) => repairText.includes(familyId)
      || vermontText.includes(familyId)
      || a.some((assignment) =>
        (assignment.lane === "rapid-repair" || assignment.lane === "shared-host-repair")
        && (assignment.items ?? []).includes(familyId));
    /*
     * Scoped to the family, not to the corpus of dispatch text.
     *
     * The first version asked whether the obligation name appeared ANYWHERE in
     * any dispatch, and Vermont's VTR02 also concerns feeAndWaiver -- so
     * deleting the obligation from every Washington record left the check green
     * on Vermont's copy of the word. A defect class named for a different state
     * is not this family's assignment. The evidence row that names the family
     * is what has to name its obligation.
     */
    const evidenceFor = (familyId) => {
      const out = [];
      for (const text of [repairText, vermontText]) {
        if (!text) continue;
        let doc = null;
        try { doc = JSON.parse(text); } catch { continue; }
        for (const row of doc.evidence ?? []) if (row.familyId === familyId) out.push(JSON.stringify(row));
      }
      /* The generated dispatch is a repair record too: FIX lane detail rows
       * carry the verifier's failedObligationNames verbatim, which is exactly
       * the naming this check demands. */
      for (const x of a ?? []) {
        if (x.lane !== "rapid-repair" && x.lane !== "shared-host-repair") continue;
        for (const row of x.detail ?? []) if (row.familyId === familyId) out.push(JSON.stringify(row));
      }
      return out.join("\n");
    };
    for (const r of failedFamilies) {
      const fam = master.families.find((f) => f.familyId === r.familyId);
      if (!fam) { returnedVerdictProblems.push(`${r.familyId} was failed by ${r.lane} and is not in the queue at all`); continue; }
      if (PROVEN.has(fam.state)) returnedVerdictProblems.push(`${r.familyId} was failed by ${r.lane} and the queue still calls it ${fam.state}`);
      if (!dispatchedSomewhere(r.familyId)) returnedVerdictProblems.push(`${r.familyId} was failed and is dispatched to no repair lane`);
      const forThisFamily = evidenceFor(r.familyId);
      for (const o of r.failedObligationNames ?? []) {
        if (!forThisFamily.includes(o)) returnedVerdictProblems.push(`${r.familyId} failed ${o} and no repair dispatch names that obligation for that family`);
      }
    }
    // A negative test whose subject cannot exist proves nothing.
    if (failedFamilies.length === 0) returnedVerdictProblems.push("no failed family to check; this gate has no subject and proves nothing");
  }
  check("F29", "a family an independent verifier failed is out of VERIFYING and dispatched to a repair lane that names its exact obligation",
    returnedVerdictProblems.length === 0,
    `${returnedVerdictProblems.length} problem(s): ${returnedVerdictProblems.slice(0, 3).join(" | ")}`);

  /*
   * 30. The visual gate is moved, not weakened.
   *
   * Every packet-build lane stopped on a browser it could not obtain, and the
   * cheap fix -- let a packet pass without its rasters -- would have made
   * PASS_COMPLETE mean less while looking like progress. So the render moved to
   * a runner that has a browser, and this asks the three things that make that
   * a move rather than a waiver: no family is called proven without a
   * RASTER_PASS; the queue that carries the work exists and pins the exact PDF
   * bytes by SHA-256; and the builder prompts say plainly that a missing
   * Chromium is an environment fact, not a source or legal defect of the packet.
   */
  const rasterProblems2 = [];
  const rq = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, DIR, "RASTER_QUEUE.json"), "utf8")); } catch { return null; } })();
  if (!rq) rasterProblems2.push("no raster queue; the visual gate has nowhere to run and no record of what it owes");
  else {
    if (!Array.isArray(rq.rows) || rq.rows.length === 0) rasterProblems2.push("the raster queue holds no rows");
    for (const r of rq.rows ?? []) {
      if (!/^[0-9a-f]{64}$/.test(String(r.canonicalPdfSha256 ?? ""))) rasterProblems2.push(`${r.familyId} queues a canonical PDF with no exact hash`);
      if (!/^[0-9a-f]{64}$/.test(String(r.boundaryPdfSha256 ?? ""))) rasterProblems2.push(`${r.familyId} queues a boundary PDF with no exact hash`);
      if (!(rq.rasterStateVocabulary ?? []).includes(r.currentRasterState)) rasterProblems2.push(`${r.familyId} is in undeclared raster state ${r.currentRasterState}`);
      const family = familyById.get(r.familyId);
      if (family && ["SOURCE_READY", "BUILD_IN_PROGRESS", "FAIL_REPAIR_REQUIRED"].includes(family.state)) {
        rasterProblems2.push(`${r.familyId} is queued while its packet state is ${family.state}`);
      }
    }
    // One family, one lane. Two readers writing one verdict is a disagreement
    // nobody adjudicates.
    const owners = new Map();
    for (const r of rq.rows ?? []) {
      if (owners.has(r.familyId)) rasterProblems2.push(`${r.familyId} is queued to ${owners.get(r.familyId)} and ${r.nextOwner}`);
      owners.set(r.familyId, r.nextOwner);
    }
    const passed = new Set((rq.rows ?? []).filter((r) => r.currentRasterState === "RASTER_PASS").map((r) => r.familyId));
    /* PRODUCT_PATH_PENDING is executable mapping work, not proof of a packet. */
    const PROVEN = new Set(["PASS_COMPLETE", "VERIFIED_PASS", "LEGAL_REVIEW_READY", "LEGAL_APPROVED", "COMPLETE_PACKET_PROVEN"]);
    for (const f of master.families) {
      if (PROVEN.has(f.state) && !passed.has(f.familyId)) {
        rasterProblems2.push(`${f.familyId} is ${f.state} with no RASTER_PASS; the visual gate never ran on it`);
      }
    }
  }
  const pfPromptText = a.filter((x) => x.lane === "packet-build")
    .map((x) => { try { return fs.readFileSync(path.join(ROOT, x.promptFile), "utf8"); } catch { return ""; } });
  if (pfPromptText.length === 0) rasterProblems2.push("no builder prompt to read; this check has no subject");
  for (const [i, t] of pfPromptText.entries()) {
    if (!/not a source blocker and it is not a legal blocker/i.test(t)) rasterProblems2.push(`builder prompt ${i + 1} does not say a missing Chromium is an environment fact rather than a packet defect`);
    if (!/BUILT_RASTER_PENDING/.test(t)) rasterProblems2.push(`builder prompt ${i + 1} does not name BUILT_RASTER_PENDING`);
    if (!/No packet becomes PASS_COMPLETE without RASTER_PASS/i.test(t)) rasterProblems2.push(`builder prompt ${i + 1} does not state that RASTER_PASS is required for PASS_COMPLETE`);
  }
  check("F30", "the visual gate is moved to a browser-equipped runner and not weakened: exact bytes queued, and no family proven without RASTER_PASS",
    rasterProblems2.length === 0,
    `${rq?.rows?.length ?? 0} famil(ies) queued; ${rasterProblems2.length} problem(s): ${rasterProblems2.slice(0, 3).join(" | ")}`);

  /*
   * 31. A claim-gate refusal is history, not a packet verdict.
   *
   * BLOCKED_BEFORE_CLAIM records that one lane was not allowed to read a
   * family. The extractor intentionally preserves those rows, including their
   * original base, but excludes them from the substantive-verdict contest. A
   * consumer must therefore keep the row as history while selecting a later
   * completed read of the packet.
   */
  const claimRefusalProblems = [];
  const postRepairRereadProblems = [];
  const currentSubstantiveByFamily = new Map();
  const onlyPreclaimFamilies = new Set();
  let preservedRefusalsBesideSubstantive = 0;
  const projectedSourceBlockState = (family, row) => !family?.sourceReadiness?.ready
    ? "SOURCE_BLOCKED"
    : family.legalInputStatus === "OPEN_LEGAL_INPUT"
      ? "LEGAL_BLOCKED"
      : (row.failedObligationNames ?? []).length > 0
        ? "FAIL_REPAIR_REQUIRED"
        : "VERIFY_PENDING";
  if (!vr) claimRefusalProblems.push("no verifier-return extraction to check");
  else {
    const verifierRows = (vr.rows ?? []).filter((r) => r.isIndependentVerification);
    const wave2Passing = new Set((read("data/rcap-grade-a/launch-control/WAVE_2_VERIFICATION_LEDGER.json").rows ?? [])
      .filter((r) => r.verdict === "PASS")
      .map((r) => r.family));
    for (const r of verifierRows.filter((r) =>
      r.verdict && r.verdict !== "BLOCKED_BEFORE_CLAIM" && !r.superseded)) {
      currentSubstantiveByFamily.set(r.familyId, r);
    }
    const preclaimRows = verifierRows.filter((r) => r.verdict === "BLOCKED_BEFORE_CLAIM");
    const carriedHistory = new Set(preclaimRows.map((r) => `${r.lane}/${r.familyId}`));
    const declaredHistory = new Set(vr.refusedAtTheClaimGate?.rows ?? []);
    for (const key of declaredHistory) if (!carriedHistory.has(key)) claimRefusalProblems.push(`${key} is declared as claim-gate history but its row was lost`);
    for (const key of carriedHistory) if (!declaredHistory.has(key)) claimRefusalProblems.push(`${key} is carried as claim-gate history but omitted from the history index`);
    for (const refusal of preclaimRows) {
      if (currentSubstantiveByFamily.has(refusal.familyId)) preservedRefusalsBesideSubstantive += 1;
      else onlyPreclaimFamilies.add(refusal.familyId);
    }
    if (preservedRefusalsBesideSubstantive === 0) {
      claimRefusalProblems.push("no preserved claim-gate refusal exists beside a current substantive verdict; the check has no subject");
    }
    const rasterPassed = new Set((rq?.rows ?? [])
      .filter((r) => r.currentRasterState === "RASTER_PASS")
      .map((r) => r.familyId));
    /* A prior FAIL can move to VERIFY_PENDING only when current evidence shows
     * that a completed repair answered that exact failure after the verdict.
     * A released claim by itself is only history; it says neither what was
     * repaired nor whether the release predates a later FAIL. */
    const verdictLedger = fs.existsSync(path.join(ROOT, LEDGER)) ? read(LEDGER) : null;
    const repairedFamilies = new Set();
    const liveRepairFamilies = new Set();
    const liveVerificationFamilies = new Set();
    for (const claim of verdictLedger?.claims ?? []) {
      const ids = claim.familyIds ?? (claim.familyId ? [claim.familyId] : []);
      if (claim.laneKind === "repair" || claim.laneKind === "shared-host-repair") {
        for (const id of ids) (claim.released === true ? repairedFamilies : liveRepairFamilies).add(id);
      }
      if (claim.laneKind === "independent-verification" && claim.released !== true) {
        for (const id of ids) liveVerificationFamilies.add(id);
      }
    }
    const hasVerificationDispatch = (familyId) => vf.some((assignment) =>
      (assignment.items ?? []).includes(familyId));
    const repairCompletions = new Map();
    for (const root of [DIR, "data/rcap-grade-a/codex-cloud"]) {
      const absoluteRoot = path.join(ROOT, root);
      if (!fs.existsSync(absoluteRoot)) continue;
      for (const entry of fs.readdirSync(absoluteRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const evidencePath = `${root}/${entry.name}/rows.json`;
        if (!fs.existsSync(path.join(ROOT, evidencePath))) continue;
        let doc = null;
        try { doc = read(evidencePath); } catch { continue; }
        for (const row of doc.rows ?? []) {
          if (row.status !== "COMPLETED" || row.repairedByThisLane !== true) continue;
          if (row.laneKind && row.laneKind !== "repair" && row.laneKind !== "shared-host-repair") continue;
          const familyId = row.itemId ?? row.familyId;
          if (!familyId) continue;
          if (!repairCompletions.has(familyId)) repairCompletions.set(familyId, []);
          repairCompletions.get(familyId).push({ row, evidencePath });
        }
      }
    }
    const validBase = (base) => {
      if (!/^[0-9a-f]{7,40}$/.test(String(base ?? ""))) return false;
      try { execFileSync("git", ["cat-file", "-e", `${base}^{commit}`], { cwd: ROOT, stdio: "ignore" }); return true; }
      catch { return false; }
    };
    const pathsChangedSince = (base, paths) => {
      if (!validBase(base)) return false;
      try { execFileSync("git", ["diff", "--quiet", base, "HEAD", "--", ...paths], { cwd: ROOT, stdio: "ignore" }); return false; }
      catch (error) { return error?.status === 1; }
    };
    const hashOnDisk = (rel) => {
      if (!rel || !fs.existsSync(path.join(ROOT, rel))) return null;
      return crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex");
    };
    const nineCounterNames = [
      "knownRequiredFieldsMissing",
      "requiredFactsNotCollected",
      "unclassifiedBlanks",
      "incompleteRows",
      "requiredOptionsMissing",
      "requiredComponentsMissing",
      "invisibleWrites",
      "protectedWrites",
      "visualDefects"
    ];
    const hasExactlyNineZeroCounters = (counters) => Boolean(counters)
      && Object.keys(counters).length === nineCounterNames.length
      && nineCounterNames.every((name) => Number(counters[name]) === 0);
    const repairRowChangedSince = (base, candidate, familyId) => {
      if (!validBase(base)) return false;
      let before = null;
      try {
        before = JSON.parse(execFileSync("git", ["show", `${base}:${candidate.evidencePath}`],
          { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
      } catch { return true; /* the exact return file did not exist at the verdict base */ }
      const prior = (before.rows ?? []).find((row) => (row.itemId ?? row.familyId) === familyId
        && (row.laneKind === "repair" || row.laneKind === "shared-host-repair"));
      return !prior || JSON.stringify(prior) !== JSON.stringify(candidate.row);
    };
    const postVerdictRepairEvidence = (familyId, family, substantive) => {
      const base = substantive.verifiedAtBase;
      const failed = substantive.failedObligationNames ?? [];
      const candidates = (repairCompletions.get(familyId) ?? []).filter(({ row }) => {
        const evidence = JSON.stringify(row);
        const countersZero = row.countersAfter
          && Object.values(row.countersAfter).every((value) => Number(value) === 0);
        return countersZero && failed.length > 0 && failed.every((name) => evidence.includes(name));
      });
      const completion = candidates.find((candidate) => repairRowChangedSince(base, candidate, familyId));
      const artifactPaths = [family.directory, family.buildScript,
        `:(exclude)${family.directory}/product-wiring.json`,
        `:(exclude)${family.directory}/build-status.json`,
        `:(exclude)${family.directory}/reports/rendered-artifacts.json`].filter(Boolean);
      return {
        completion,
        artifactsChanged: pathsChangedSince(base, artifactPaths)
      };
    };
    const artifactsOnlyEvidence = (familyId, family, substantive, completion) => {
      if ((substantive.failedObligationNames ?? []).length !== 1
        || substantive.failedObligationNames[0] !== "ARTIFACTS") return null;
      const wiringRel = `${family.directory}/product-wiring.json`;
      let wiring = null;
      try { wiring = read(wiringRel); } catch { /* fail closed below */ }
      const candidates = [...(rq?.historicalRasterRows ?? []), ...(rq?.rows ?? [])]
        .filter((row) => row.familyId === familyId);
      const artifactForPath = (raster, rel) => rel === raster?.canonicalPdfPath
        ? "canonical"
        : rel === raster?.boundaryPdfPath ? "boundary" : null;
      const pin = (artifact, declaredSha256, rel) => ({
        artifact,
        declaredSha256: declaredSha256 ?? null,
        recomputedSha256: hashOnDisk(rel)
      });
      const evidenceFor = (raster) => {
        const currentArtifactHashes = {
          canonical: hashOnDisk(raster?.canonicalPdfPath),
          boundary: hashOnDisk(raster?.boundaryPdfPath)
        };
        const proposalPins = (wiring?.proposedRepresentation?.components ?? []).map((component) =>
          pin(artifactForPath(raster, component.file), component.sha256, component.file));
        const acceptance = wiring?.binding?.acceptanceReceipt ?? null;
        const acceptancePins = acceptance
          ? [
              pin("canonical", acceptance.boundToCanonicalSha256, raster?.canonicalPdfPath),
              ...(Object.prototype.hasOwnProperty.call(acceptance, "boundToBoundarySha256")
                ? [pin("boundary", acceptance.boundToBoundarySha256, raster?.boundaryPdfPath)]
                : [])
            ]
          : [];
        const receipt = raster?.rasterReceipt ?? null;
        return {
          changedAfterVerdict: pathsChangedSince(substantive.verifiedAtBase, [wiringRel]),
          completedRepairNamesExactlyArtifacts: Array.isArray(completion?.row?.obligationsRepaired)
            && completion.row.obligationsRepaired.length === 1
            && completion.row.obligationsRepaired[0] === "ARTIFACTS",
          completedRepairHasExactlyNineZeroCounters: hasExactlyNineZeroCounters(completion?.row?.countersAfter),
          currentCompletenessHasExactlyNineZeroCounters: hasExactlyNineZeroCounters(family.counters),
          currentArtifactHashes,
          productWiring: {
            present: wiring !== null,
            familyMatches: wiring?.family === familyId,
            proposalPins,
            acceptanceReceipt: {
              verdict: acceptance?.verdict ?? null,
              workflowRunId: acceptance?.workflowRunId ?? null,
              coversTheWholeFamily: acceptance?.coversTheWholeFamily === true,
              pins: acceptancePins
            }
          },
          rasterReceipt: {
            currentRasterState: raster?.currentRasterState ?? null,
            verdict: receipt?.verdict ?? null,
            workflowRunId: receipt?.workflowRunId ?? null,
            coverageComplete: raster?.coverage?.complete === true,
            coversTheWholeFamily: receipt?.coversTheWholeFamily === true,
            pins: [
              pin("canonical", receipt?.boundToCanonicalSha256, raster?.canonicalPdfPath),
              pin("boundary", receipt?.boundToBoundarySha256, raster?.boundaryPdfPath)
            ]
          }
        };
      };
      let first = null;
      for (let i = candidates.length - 1; i >= 0; i--) {
        const evidence = evidenceFor(candidates[i]);
        if (!first) first = evidence;
        if (artifactsOnlyBookkeepingRepairsFailure({
          failedObligationNames: substantive.failedObligationNames,
          artifactBookkeeping: evidence
        })) return evidence;
      }
      return first;
    };
    const isExecutablePostRepairReread = (familyId, family, substantive) => {
      const evidence = postVerdictRepairEvidence(familyId, family, substantive);
      const artifactBookkeeping = artifactsOnlyEvidence(
        familyId, family, substantive, evidence.completion);
      return canRereadAfterRepair({
        state: family.state,
        completedRepairMatchesFailure: Boolean(evidence.completion),
        repairEvidenceChangedAfterVerdict: Boolean(evidence.completion),
        artifactsChangedAfterVerdict: evidence.artifactsChanged,
        allNineCountersZero: family.allNineCountersZero === true,
        releasedRepairGrantExists: repairedFamilies.has(familyId),
        liveRepairGrantExists: liveRepairFamilies.has(familyId),
        liveVerificationGrantExists: liveVerificationFamilies.has(familyId),
        verificationDispatchExists: hasVerificationDispatch(familyId),
        failedObligationNames: substantive.failedObligationNames,
        artifactBookkeeping
      });
    };
    const isAwaitingPostRepairRaster = (familyId, family, substantive) => {
      const evidence = postVerdictRepairEvidence(familyId, family, substantive);
      return family.state === "BUILT_RASTER_PENDING"
        && Boolean(evidence.completion)
        && evidence.artifactsChanged
        && family.allNineCountersZero === true
        && repairedFamilies.has(familyId)
        && !liveRepairFamilies.has(familyId)
        && !rasterPassed.has(familyId);
    };
    /* This rule is global, not conditional on claim-gate history.  F31's
     * original loop intentionally visits only families that also carry a
     * BLOCKED_BEFORE_CLAIM row; using it as the sole enforcement point left
     * every other post-failure reread unchecked. */
    for (const family of master.families.filter((row) =>
      row.state === "VERIFY_PENDING"
      && row.selectedIndependentVerdict?.verdict === "FAIL_REPAIR_REQUIRED")) {
      const substantive = currentSubstantiveByFamily.get(family.familyId);
      if (!substantive) {
        postRepairRereadProblems.push(`${family.familyId} is a post-failure reread with no current substantive FAIL row`);
      } else if (!isExecutablePostRepairReread(family.familyId, family, substantive)) {
        postRepairRereadProblems.push(`${family.familyId} is VERIFY_PENDING after FAIL without complete causal repair and executable reread evidence`);
      }
    }
    for (const [familyId, substantive] of currentSubstantiveByFamily) {
      if (!verifierRows.some((r) => r.familyId === familyId && r.verdict === "BLOCKED_BEFORE_CLAIM")) continue;
      const fam = familyById.get(familyId);
      if (!fam) {
        claimRefusalProblems.push(`${familyId} has a current substantive verdict but no queue row`);
        continue;
      }
      const selected = fam.selectedIndependentVerdict;
      if (!selected
        || selected.verdict !== substantive.verdict
        || selected.lane !== substantive.lane
        || selected.verifiedAtBase !== (substantive.verifiedAtBase ?? null)
        || selected.evidencePath !== substantive.evidencePath) {
        claimRefusalProblems.push(`${familyId} selected ${selected?.lane ?? "none"}/${selected?.verdict ?? "none"} instead of ${substantive.lane}/${substantive.verdict}`);
        continue;
      }
      if (substantive.verdict === "FAIL_REPAIR_REQUIRED"
        && fam.state !== "FAIL_REPAIR_REQUIRED"
        && !isExecutablePostRepairReread(familyId, fam, substantive)
        && !isAwaitingPostRepairRaster(familyId, fam, substantive)) {
        claimRefusalProblems.push(`${familyId} has a current repair-required verdict but the queue calls it ${fam.state}`);
      } else if (substantive.verdict === "BLOCKED_SOURCE"
        && fam.state !== projectedSourceBlockState(fam, substantive)) {
        claimRefusalProblems.push(`${familyId} has a current source-blocked verdict but the queue calls it ${fam.state} instead of ${projectedSourceBlockState(fam, substantive)}`);
      } else if (substantive.verdict === "BLOCKED_LEGAL_INPUT" && fam.state !== "LEGAL_BLOCKED") {
        claimRefusalProblems.push(`${familyId} has a current legal-blocked verdict but the queue calls it ${fam.state}`);
      } else if (substantive.verdict === "PASS_COMPLETE_INDEPENDENT"
        && substantive.verifiedAtBase === master.minimumCaptainSha
        && rasterPassed.has(familyId)
        && !["COMPLETE_PACKET_PROVEN", "VERIFIED_PASS", "LEGAL_BLOCKED", "WRONG_DELIVERY_TYPE"].includes(fam.state)) {
        claimRefusalProblems.push(`${familyId} has a current-base pass with raster evidence but the queue calls it ${fam.state}`);
      }
    }
    for (const familyId of onlyPreclaimFamilies) {
      const fam = familyById.get(familyId);
      if (!fam) claimRefusalProblems.push(`${familyId} has only a claim-gate refusal and no queue row`);
      else if (fam.selectedIndependentVerdict?.verdict !== "BLOCKED_BEFORE_CLAIM") claimRefusalProblems.push(`${familyId} has only a claim-gate refusal but selected ${fam.selectedIndependentVerdict?.verdict ?? "nothing"}`);
      else if (fam.state === "SOURCE_READY") claimRefusalProblems.push(`${familyId} has only a claim-gate refusal but the queue ignores it and calls the family SOURCE_READY`);
      else if (["COMPLETE_PACKET_PROVEN", "PASS_COMPLETE"].includes(fam.state)) claimRefusalProblems.push(`${familyId} has only a claim-gate refusal but the queue over-promotes it to ${fam.state}`);
      else if (fam.state === "VERIFIED_PASS" && !wave2Passing.has(familyId)) claimRefusalProblems.push(`${familyId} has only a claim-gate refusal and no separate wave-2 PASS, but the queue promotes it to VERIFIED_PASS`);
    }
  }
  check("F31", "historical BLOCKED_BEFORE_CLAIM rows remain preserved without outranking current substantive verdicts",
    claimRefusalProblems.length === 0,
    `${preservedRefusalsBesideSubstantive} preserved refusal row(s) beside current substantive verdicts, ${onlyPreclaimFamilies.size} only-refusal family(ies); ${claimRefusalProblems.length} problem(s): ${claimRefusalProblems.slice(0, 3).join(" | ")}`);
  check("F35", "every post-failure reread is causally bound to a completed repair and an executable independent dispatch",
    postRepairRereadProblems.length === 0,
    `${postRepairRereadProblems.length} problem(s): ${postRepairRereadProblems.slice(0, 3).join(" | ")}`);

  /* 32. A current source refusal stops at source only while central custody
   * still cannot bind the source. Once readiness is true, the state preserves
   * any separately measured legal/packet defect, or requests a fresh read. */
  const sourceBlockProjectionProblems = [];
  const selectedSourceBlocks = (vr?.rows ?? []).filter((r) =>
    r.isIndependentVerification
    && r.verdict === "BLOCKED_SOURCE"
    && !r.superseded);
  const verdictLedger = fs.existsSync(path.join(ROOT, LEDGER)) ? read(LEDGER) : null;
  const liveVerificationClaims = new Set((verdictLedger?.claims ?? [])
    .filter((c) => c.laneKind === "independent-verification" && c.released !== true)
    .flatMap((c) => c.familyIds ?? (c.familyId ? [c.familyId] : [])));
  for (const r of selectedSourceBlocks) {
    const fam = familyById.get(r.familyId);
    if (!fam) sourceBlockProjectionProblems.push(`${r.familyId} has a current BLOCKED_SOURCE verdict but no queue row`);
    const expectedState = projectedSourceBlockState(fam, r);
    if (fam && fam.state !== expectedState) sourceBlockProjectionProblems.push(`${r.familyId} has current BLOCKED_SOURCE from ${r.lane}, readiness ${fam.sourceReadiness?.ready}, and the queue calls it ${fam.state} instead of ${expectedState}`);
    const verificationDispatch = vf.find((assignment) => (assignment.items ?? []).includes(r.familyId));
    if (expectedState === "VERIFY_PENDING") {
      if (!verificationDispatch) sourceBlockProjectionProblems.push(`${r.familyId} is now source-ready but has no fresh verification dispatch`);
      if (!liveVerificationClaims.has(r.familyId)) sourceBlockProjectionProblems.push(`${r.familyId} is now source-ready but has no live independent-verification claim`);
    } else {
      if (verificationDispatch) sourceBlockProjectionProblems.push(`${r.familyId} projects to ${expectedState} but was redundantly dispatched to ${verificationDispatch.assignmentId}`);
      if (liveVerificationClaims.has(r.familyId)) sourceBlockProjectionProblems.push(`${r.familyId} projects to ${expectedState} but still has a live independent-verification claim`);
    }
  }
  if (selectedSourceBlocks.length === 0) sourceBlockProjectionProblems.push("no current BLOCKED_SOURCE verdict exists; the check has no subject");
  check("F32", "a current BLOCKED_SOURCE verdict follows current custody without losing separately measured defects",
    sourceBlockProjectionProblems.length === 0,
    `${selectedSourceBlocks.length} current source block(s); ${sourceBlockProjectionProblems.length} problem(s): ${sourceBlockProjectionProblems.slice(0, 3).join(" | ")}`);

  /* 33. An owner-refused delivery type awaits an owner-selected replacement,
   * not another reading of bytes the independent verifier already passed. */
  const wrongDeliveryProblems = [];
  const wrongDeliveryFamilies = master.families.filter((f) => f.state === "WRONG_DELIVERY_TYPE");
  const actualVerifyPending = master.families.filter((f) => f.state === "VERIFY_PENDING" && !f.activeOwner).length;
  if (master.denominator?.verifyPending !== actualVerifyPending) {
    wrongDeliveryProblems.push(`denominator says ${master.denominator?.verifyPending ?? "missing"} verify-pending but ${actualVerifyPending} unowned family row(s) are VERIFY_PENDING`);
  }
  for (const fam of wrongDeliveryFamilies) {
    if (!fam.ownerDeliveryTypeRefusal) wrongDeliveryProblems.push(`${fam.familyId} has no exact owner refusal`);
    if (fam.activeOwner) wrongDeliveryProblems.push(`${fam.familyId} awaits an owner replacement but still names active owner ${fam.activeOwner}`);
    const dispatch = vf.find((assignment) => (assignment.items ?? []).includes(fam.familyId));
    if (dispatch) wrongDeliveryProblems.push(`${fam.familyId} awaits an owner replacement but was dispatched to ${dispatch.assignmentId}`);
    if (liveVerificationClaims.has(fam.familyId)) wrongDeliveryProblems.push(`${fam.familyId} awaits an owner replacement but has a live reread claim`);
  }
  if (wrongDeliveryFamilies.length === 0) wrongDeliveryProblems.push("no WRONG_DELIVERY_TYPE family exists; the check has no subject");
  check("F33", "owner-refused delivery types stay out of VERIFY_PENDING and independent rereview",
    wrongDeliveryProblems.length === 0,
    `${wrongDeliveryFamilies.length} owner-refused family(ies); ${wrongDeliveryProblems.length} problem(s): ${wrongDeliveryProblems.slice(0, 3).join(" | ")}`);

  /* 34. A live verifier grant must describe work the current state machine
   * still says is owed. F24 proves that grants and dispatch agree, but agreement
   * can preserve a stale grant forever: the generator intentionally seeds live
   * grants into their holder even when the family is already proven. A repaired
   * or rebuilt family belongs in VERIFY_PENDING; a claimed family being read is
   * VERIFYING. Anything else needs its grant released before regeneration. */
  const staleVerificationGrantProblems = [];
  for (const claim of (verdictLedger?.claims ?? []).filter((c) =>
    c.laneKind === "independent-verification" && c.released !== true)) {
    for (const familyId of claim.familyIds ?? (claim.familyId ? [claim.familyId] : [])) {
      const fam = familyById.get(familyId);
      if (!fam) staleVerificationGrantProblems.push(`${claim.lane} holds ${familyId}, which has no queue row`);
      else if (!["VERIFY_PENDING", "VERIFYING"].includes(fam.state)) {
        staleVerificationGrantProblems.push(`${claim.lane} holds ${familyId}, but its current state is ${fam.state}`);
      }
    }
  }
  check("F34", "every live verifier grant has a current verification state",
    staleVerificationGrantProblems.length === 0,
    `${liveVerificationClaims.size} live verification family grant(s); ${staleVerificationGrantProblems.length} stale problem(s): ${staleVerificationGrantProblems.slice(0, 3).join(" | ")}`);

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

  // 24. Every dispatched family is granted exactly once, by one mechanism.
  const ledgerProblems = [];
  const ledger = fs.existsSync(path.join(ROOT, LEDGER)) ? read(LEDGER) : null;
  if (!ledger) ledgerProblems.push("no claim ledger; a verifier told to claim from one would stop before reading anything, as VF12 did");
  else {
    const grantKey = (c) => `${c.subjectType}::${c.subjectId}::${c.operation}`;
    const seenGrant = new Map();
    for (const c of ledger.claims ?? []) {
      if (seenGrant.has(grantKey(c))) ledgerProblems.push(`${c.subjectId} granted to ${seenGrant.get(grantKey(c))} and ${c.lane} for the same operation`);
      else seenGrant.set(grantKey(c), c.lane);
    }
    // Every claimable item in the dispatch must be in the ledger, and nothing else.
    const dispatched = new Set(a.flatMap((x) => (x.items ?? []).map((id) => `${x.itemKind === "sourceObligation" ? "source-obligation" : "packet-family"}::${id}::${x.itemKind === "sourceObligation" ? x.operation : x.lane}`)));
    /*
     * External workers are dispatched through the control plane, not through
     * ACTIVE_ASSIGNMENTS, and their grants are real. Without this a transfer to
     * a Codespace or Cloud lane lands a live grant that F24 reads as
     * undispatched -- which is the state that kept this check red for four
     * heads, arrived at deliberately this time.
     *
     * The key uses laneKind, because that is what claim.mjs writes into a
     * claim's `operation`. Using the lane's display name instead is how the
     * hand-minted FIX09 attempt failed: the repair assignments call the lane
     * "rapid-repair" while the operation is "repair".
     */
    const EXTERNAL_INDEX = "data/rcap-grade-a/external-worker-control/EXTERNAL_ASSIGNMENTS.json";
    if (fs.existsSync(path.join(ROOT, EXTERNAL_INDEX))) {
      try {
        const ext = JSON.parse(fs.readFileSync(path.join(ROOT, EXTERNAL_INDEX), "utf8"));
        for (const w of ext.workers ?? []) {
          const op = w.operation ?? w.laneKind;
          for (const id of w.subjectIds ?? []) dispatched.add(`packet-family::${id}::${op}`);
        }
      } catch { ledgerProblems.push("the external assignment index exists and does not parse"); }
    }
    /*
     * MASTER_QUEUE may preserve an already-live Captain claim as active
     * ownership without emitting a replacement factory prompt. That is still
     * dispatched work: the named lane can assert the grant, and listing it in
     * ACTIVE_ASSIGNMENTS as well would be the double-dispatch F4 forbids.
     */
    for (const c of ledger.claims ?? []) {
      if (c.released === true || c.subjectType !== "packet-family") continue;
      const held = master.families.find((f) => f.familyId === c.subjectId && f.activeOwner === c.lane);
      if (held) dispatched.add(`${c.subjectType}::${c.subjectId}::${c.operation}`);
    }
    const granted = new Set((ledger.claims ?? []).map((c) => `${c.subjectType}::${c.subjectId}::${c.operation}`));
    for (const d of dispatched) if (!granted.has(d)) ledgerProblems.push(`${d} is dispatched and not granted`);
    for (const problem of verificationClaimProblems(active, ledger)) ledgerProblems.push(problem);
    /*
     * AND GRANTED TO THE LANE THAT WAS TOLD TO DO IT.
     *
     * The keys above carry subject and operation but not the lane, so a
     * dispatch that names a subject another lane holds LIVE satisfies every
     * one of them: the grant exists, just to somebody else. FABLE-VA3 walked
     * into that. Six of the thirteen families ACTIVE_ASSIGNMENTS listed for
     * VF03 were live to VF08, VF09 and VF10; all six refused at the gate with
     * exit 8 GRANTED_ELSEWHERE, and nothing in the tree had said so first.
     * Nearly half a verification lane's run was spent discovering it.
     *
     * A RELEASED grant elsewhere is not this: finished work does not stop a
     * lane, and the dispatch legitimately re-lists a subject for a new pass.
     * Only a LIVE grant to another lane is the collision, and it is fatal,
     * because two lanes told to hold one subject is the exact condition the
     * ledger exists to prevent.
     */
    const liveHolder = new Map();
    for (const c of ledger.claims ?? []) {
      if (c.released === true) continue;
      liveHolder.set(`${c.subjectType}::${c.subjectId}::${c.operation}`, c.lane);
    }
    for (const x of a) {
      const isSource = x.itemKind === "sourceObligation";
      for (const id of x.items ?? []) {
        const held = liveHolder.get(`${isSource ? "source-obligation" : "packet-family"}::${id}::${isSource ? x.operation : x.lane}`);
        if (held && held !== x.assignmentId) {
          ledgerProblems.push(`${x.assignmentId} is dispatched ${id} and ${held} holds it live`);
        }
      }
    }
    /*
     * A RELEASED grant is finished work, and finished work does not need a live
     * dispatch row. This required a strict bijection, so the moment the
     * generator stopped dispatching nine completed packet-build families --
     * correctly, they were done -- F24 went red and stayed red across three
     * Captain heads while three workers reported it. The dispatch would never
     * have been able to shrink.
     *
     * An UNRELEASED grant with no dispatch is still a real leak and still
     * caught: it means someone minted a grant without dispatching the lane that
     * holds it, which is exactly how VF15, VF16 and VF17 came to hold eighteen
     * live grants no assignment named.
     */
    const releasedGrants = new Set((ledger.claims ?? []).filter((c) => c.released === true).map(grantKey));
    for (const g of granted) {
      if (dispatched.has(g)) continue;
      if (releasedGrants.has(g)) continue;
      ledgerProblems.push(`${g} is granted, not dispatched, and not released`);
    }
    if (ledger.generatedAtCommit !== master.minimumCaptainSha) ledgerProblems.push(`the ledger is pinned to ${ledger.generatedAtCommit} and the dispatch to ${master.minimumCaptainSha}`);
    if (!fs.existsSync(path.join(ROOT, CLAIM))) ledgerProblems.push("the claim mechanism the ledger names does not exist");
    /*
     * The grant set must have an identity, and the identity must describe the
     * grants. generatedAtCommit is a declared floor: it did not move when
     * commit 068136465 revoked thirteen packet-build grants, so the pre- and
     * post-revocation ledgers named the same commit and a worker holding the
     * stale one asserted a withdrawn grant with an indistinguishable return.
     * claimsDigest is a function of the grants, so revocation always moves it,
     * and claim.mjs prints it in every CLAIM_OK for exactly that reason.
     */
    const digest = crypto.createHash("sha256")
      .update(JSON.stringify((ledger.claims ?? []).map((c) => ledger.claimsDigestCovers.map((field) => c[field] ?? null))))
      .digest("hex");
    if (!ledger.claimsDigest) ledgerProblems.push("the ledger carries no grant-set identity, so a revoked grant is indistinguishable from a current one");
    else if (ledger.claimsDigest !== digest) ledgerProblems.push(`the ledger declares grant set ${ledger.claimsDigest} and its grants hash to ${digest}`);
    if (!/claimsDigest/.test(fs.readFileSync(path.join(ROOT, CLAIM), "utf8"))) ledgerProblems.push("the claim mechanism does not check the grant-set identity");
  }
  check("F24", "one claim ledger grants every dispatched family exactly once, to the lane the dispatch names",
    ledgerProblems.length === 0,
    `${(ledger?.claims ?? []).length} grant(s); ${ledgerProblems.length} problem(s): ${ledgerProblems.slice(0, 2).join(" | ")}`);

  // 25. The raster path is discovered and gated, not assumed.
  const rasterText = fs.existsSync(path.join(ROOT, RASTER)) ? fs.readFileSync(path.join(ROOT, RASTER), "utf8") : "";
  const preflightText = fs.readFileSync(path.join(ROOT, "scripts/verify-packet-build-environment.mjs"), "utf8");
  const rasterProblems = [];
  if (!rasterText) rasterProblems.push("no page rasterizer");
  if (!/export function resolveChromium/.test(rasterText)) rasterProblems.push("the rasterizer does not export a resolver, so its path is assumed");
  // Resolving a path is not rendering a page. The preflight passed on any path
  // satisfying accessSync(X_OK), and two environments -- a headless_shell-only
  // browsers path, and RCAP_CHROMIUM_PATH pointed at a directory -- printed ok
  // and then died inside the render.
  if (!/export async function probeRasterizer/.test(rasterText)) rasterProblems.push("the rasterizer offers no render probe, so the preflight can only check that a file is executable");
  if (!/probeRasterizer/.test(preflightText)) rasterProblems.push("the preflight resolves a path instead of rendering a page");
  if (/headless_shell/.test(rasterText) && !/isRasterCapable/.test(rasterText)) rasterProblems.push("the rasterizer still accepts headless_shell, which has no PDF viewer");
  if (/const CHROMIUM = process\.env\.RCAP_CHROMIUM_PATH \?\? "/.test(rasterText)) rasterProblems.push("the rasterizer still falls back to a hardcoded browser path");
  if (!/page_rasterizer_available/.test(preflightText)) rasterProblems.push("the preflight does not check the rasterizer, so a lane can pass and then die on the render step");
  if (!/skippedAreNotPasses/.test(preflightText)) rasterProblems.push("the preflight may still count a not-applicable check as a pass");
  // No prompt may tell a worker to reach for Poppler or install packages.
  const poppler = [];
  const rasterPrompts = promptFilesRecursive();
  if (rasterPrompts.length < MINIMUM_PROMPTS) rasterProblems.push(`only ${rasterPrompts.length} prompt(s) found; the dispatch carries at least ${MINIMUM_PROMPTS}, so this scan is reading the wrong tree`);
  for (const f of rasterPrompts) {
    const t = fs.readFileSync(path.join(ROOT, PROMPTS, f), "utf8");
    for (const line of t.split("\n")) {
      const stripped = line.replace(/`[^`]*`/g, "");
      if (/\bpdftoppm\b|\bapt-get\b|playwright install/.test(stripped)) poppler.push(`${f}: ${line.trim().slice(0, 50)}`);
    }
  }
  if (poppler.length) rasterProblems.push(`${poppler.length} prompt line(s) reach for Poppler or a package install`);
  check("F25", "the page rasterizer is discovered and preflight-gated, and no prompt reaches for Poppler",
    rasterProblems.length === 0,
    `${rasterProblems.length} problem(s): ${rasterProblems.slice(0, 2).join(" | ")}`);

  // 26. A family a lane found legally blocked may not be sent to a builder.
  //
  // Thirteen families carried legalInputStatus SETTLED while a packet-factory
  // lane that actually tried to build them returned BLOCKED_LEGAL_INPUT, and
  // all thirteen were granted to packet-build lanes. A worker that hit a legal
  // wall is better evidence about a family than a status derived from a route
  // key, and building a packet for a route whose law is unresolved produces an
  // artifact that should not exist.
  const legalProblems = [];
  const stale = fs.existsSync(path.join(ROOT, STALE)) ? read(STALE) : null;
  if (stale) {
    const ownerReclassified = new Set(master.families
      .filter((f) => f.executionReclassification || f.legalHoldReclassification)
      .map((f) => f.familyId));
    const currentVerifierHolds = (vr?.rows ?? []).filter((r) => r.isIndependentVerification
      && r.verdict === "BLOCKED_LEGAL_INPUT" && !r.superseded
      && !ownerReclassified.has(r.familyId));
    for (const r of currentVerifierHolds) {
      if (!(r.blockedLegalObligations ?? []).some((o) => o.finding))
        legalProblems.push(`${r.familyId} has a current BLOCKED_LEGAL_INPUT verdict without an extracted finding`);
    }
    const heldByLane = [...new Set([
      ...(stale.rows ?? []).filter((r) => r.destination === "LEGAL" && !ownerReclassified.has(r.familyId)).map((r) => r.familyId),
      ...currentVerifierHolds.map((r) => r.familyId),
    ])];
    /* ACTIVE_ASSIGNMENTS is an audit history as well as a live roster. A
     * released repair in that file is not a current dispatch; only live grants
     * can conflict with a legal hold. */
    const liveClaims = (fs.existsSync(path.join(ROOT, LEDGER)) ? read(LEDGER).claims ?? [] : [])
      .filter((c) => c.released !== true);
    const builders = new Set(liveClaims.filter((c) => c.laneKind === "packet-build").flatMap((c) => c.familyIds ?? (c.familyId ? [c.familyId] : [])));
    const repairers = new Set(liveClaims.filter((c) => c.laneKind === "repair" || c.laneKind === "shared-host-repair").flatMap((c) => c.familyIds ?? (c.familyId ? [c.familyId] : [])));
    for (const f of heldByLane) {
      if (builders.has(f)) legalProblems.push(`${f} was found BLOCKED_LEGAL_INPUT by a lane and is granted to a builder`);
      if (repairers.has(f)) legalProblems.push(`${f} was found BLOCKED_LEGAL_INPUT by a lane and is granted to a repairer`);
      const fam = familyById.get(f);
      if (fam && fam.legalInputStatus !== "OPEN_LEGAL_INPUT") {
        legalProblems.push(`${f} was found BLOCKED_LEGAL_INPUT by a lane and the queue still calls it ${fam.legalInputStatus}`);
      }
      if (fam && fam.legalInputBasis !== "LANE_RETURN_BLOCKED_LEGAL_INPUT" && fam.legalInputStatus === "OPEN_LEGAL_INPUT" && !fam.laneReturnLegalHold) {
        legalProblems.push(`${f} is held but does not record that a lane return is why`);
      }
    }
    /*
     * And the other direction, because the first one alone can be emptied.
     *
     * Reading only from the extraction means deleting every LEGAL row leaves
     * nothing to check and the refusal passes vacuously -- which is exactly
     * what the second mutation below did. The queue records WHY each family is
     * held, so every family whose basis is a lane return must still have a
     * lane return behind it.
     */
    const claimsLaneHold = master.families.filter((f) => f.legalInputBasis === "LANE_RETURN_BLOCKED_LEGAL_INPUT").map((f) => f.familyId);
    const heldSet = new Set(heldByLane);
    for (const f of claimsLaneHold) {
      if (!heldSet.has(f)) legalProblems.push(`${f} is held on the authority of a lane return that is not in the extraction`);
    }
    if (claimsLaneHold.length !== heldByLane.length) {
      legalProblems.push(`${heldByLane.length} lane-return legal finding(s) and ${claimsLaneHold.length} family(ies) held on that basis; the two must agree`);
    }
    check("F26", "no family a lane found legally blocked is sent to a builder or a repairer, and every hold has a finding behind it",
      legalProblems.length === 0,
      `${heldByLane.length} finding(s), ${claimsLaneHold.length} held on that basis; ${legalProblems.length} problem(s): ${legalProblems.slice(0, 2).join(" | ")}`);
  } else {
    check("F26", "no family a lane found legally blocked is sent to a builder or a repairer",
      false, "no STALE_LANE_RETURNS.json, so the lane-return legal holds cannot be checked at all");
  }

  // 27. Nothing is in a state the queue has not declared.
  //
  // LEGAL_BLOCKED was emitted for thirteen families before it appeared in the
  // vocabulary, and every check here passed anyway, because nothing compared
  // what the queue emits against what it declares. A closed vocabulary that
  // nobody closes is a list.
  const declaredStates = new Set(master.stateVocabulary ?? []);
  const emittedStates = [...new Set(master.families.map((f) => f.state))];
  const undeclaredStates = emittedStates.filter((x) => !declaredStates.has(x));
  const byStateKeys = Object.keys(master.byState ?? {});
  const undeclaredByState = byStateKeys.filter((k) => !declaredStates.has(k));
  // And the other direction: byState must account for every family exactly once.
  const byStateTotal = Object.values(master.byState ?? {}).reduce((n, v) => n + Number(v || 0), 0);
  const stateProblems = [];
  if (declaredStates.size === 0) stateProblems.push("the queue declares no state vocabulary at all");
  for (const x of undeclaredStates) stateProblems.push(`families are in undeclared state ${x}`);
  for (const k of undeclaredByState) stateProblems.push(`byState carries undeclared key ${k}`);
  if (byStateTotal !== master.families.length) stateProblems.push(`byState sums to ${byStateTotal} and there are ${master.families.length} families`);
  check("F27", "every family is in a declared state, and byState carries no undeclared key",
    stateProblems.length === 0,
    `${declaredStates.size} declared, ${emittedStates.length} in use, ${byStateKeys.length} byState key(s); ${stateProblems.length} problem(s): ${stateProblems.slice(0, 2).join(" | ")}`);

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
  const targets = { master: path.join(ROOT, MASTER), active: path.join(ROOT, ACTIVE), collisions: path.join(ROOT, COLLISIONS), checkpoint: path.join(ROOT, CHECKPOINT), ledger: path.join(ROOT, LEDGER), raster: path.join(ROOT, RASTER), stale: path.join(ROOT, STALE),
    /* A live dispatched prompt in a SUBDIRECTORY. The prompt checks read only
     * the top level until C13 edited this exact file -- stripping its isolation
     * banner and appending git pull, pdftoppm and apt-get -- and watched F10,
     * F14 and F25 all report ok on a 27/27 gate. */
    repairPrompt: path.join(ROOT, PROMPTS, "washington-repair/WAR03_WA_RERENDER_1.md"),
    verifierReturns: path.join(ROOT, DIR, "VERIFIER_RETURNS.json"),
    fix02Rows: path.join(ROOT, DIR, "fix02/rows.json"),
    washingtonRepair: path.join(ROOT, DIR, "WASHINGTON_REPAIR.json"),
    rasterQueue: path.join(ROOT, DIR, "RASTER_QUEUE.json") };
  const originals = Object.fromEntries(Object.entries(targets).map(([k, p]) => [k, fs.readFileSync(p)]));
  const promptTarget = path.join(ROOT, PROMPTS, "PF01.md");
  const originalPrompt = fs.readFileSync(promptTarget);
  const firstPF = (j) => j.assignments.find((x) => x.lane === "packet-build" && x.items.length > 0);
  const heldSourceReady = (j) => {
    const family = j.families.find((candidate) => {
      const readiness = candidate.sourceReadiness;
      return candidate.state === "SOURCE_READY"
        && readiness
        && Array.isArray(readiness.boundSources)
        && readiness.boundSources.length > 0
        && readiness.boundSources.some((source) => source && typeof source === "object");
    });
    const source = family?.sourceReadiness.boundSources.find((candidate) => candidate && typeof candidate === "object");
    if (!family || !source) {
      throw new Error("F13 held-source mutation requires a SOURCE_READY family with at least one bound source record");
    }
    return { family, source };
  };
  /*
   * A family F29 ACTUALLY EVALUATES.
   *
   * These mutations took failRepairRequiredFamilies[0] and assumed F29 would
   * judge it. F29 rightly does not judge all of them: a family whose repair
   * lane has released is finished work, and demanding a live repair dispatch
   * for it would re-open what was just fixed. Once the list started with such
   * a family, four mutations became no-ops and reported MISSED — the check was
   * correct and the fixture was wrong, which is exactly the failure the F13
   * mutations had.
   *
   * So the fixture is chosen by F29's own rule rather than by position, and it
   * throws instead of silently proving nothing when no such family exists.
   */
  const failedFamilyF29Judges = () => {
    const vr = JSON.parse(fs.readFileSync(path.join(ROOT, DIR, "VERIFIER_RETURNS.json"), "utf8"));
    const led = JSON.parse(fs.readFileSync(path.join(ROOT, LEDGER), "utf8"));
    const repairDone = new Set();
    const repairLive = new Set();
    for (const c of led.claims ?? []) {
      if (c.laneKind !== "repair" && c.laneKind !== "shared-host-repair") continue;
      for (const fid of c.familyIds ?? (c.familyId ? [c.familyId] : []))
        (c.released === true ? repairDone : repairLive).add(fid);
    }
    const row = (vr.rows ?? []).find((r) => r.isIndependentVerification
      && r.verdict === "FAIL_REPAIR_REQUIRED" && !r.superseded
      && !(repairDone.has(r.familyId) && !repairLive.has(r.familyId)));
    if (!row) throw new Error("F29 mutations require a currently-failed family whose repair has not already released");
    return row.familyId;
  };
  const directAttachmentSourceReady = (j) => {
    const family = j.families.find((candidate) => candidate.state === "SOURCE_READY"
      && candidate.sourceReadiness?.directAttachment === true
      && Array.isArray(candidate.sourceReadiness.boundSources)
      && candidate.sourceReadiness.boundSources.length === 0);
    if (!family) {
      throw new Error("F13 direct-attachment mutation requires a SOURCE_READY direct-attachment family with no bound sources");
    }
    return family;
  };
  /* Recompute the grant-set identity the way the ledger and claim.mjs do, so a
   * mutation that legitimately adds or removes a grant is judged on the rule it
   * is testing rather than on a digest it was never trying to break. */
  const withClaimsDigest = (j) => ({
    ...j,
    claimsDigest: crypto.createHash("sha256")
      .update(JSON.stringify(j.claims.map((c) => j.claimsDigestCovers.map((f) => c[f] ?? null))))
      .digest("hex"),
  });

  const cases = [
    { on: "active", id: "F1", name: "a family claimed by two builders is caught", mutate: (j) => { const b = j.assignments.filter((x) => x.lane === "packet-build" && x.items.length); b[1].items.push(b[0].items[0]); return j; } },
    { on: "active", id: "F2", name: "two lanes owning one path is caught", mutate: (j) => { const b = j.assignments.filter((x) => x.lane === "packet-build" && x.items.length); b[1].ownedPaths.push(b[0].ownedPaths[1]); return j; } },
    { on: "active", id: "F36", name: "an interior-glob prohibition covering the lane's own family is caught", mutate: (j) => {
        const lane = firstPF(j);
        const owned = lane.ownedPaths.find((p) => p.startsWith("data/rcap-all50/overlays/census-v1/") && p.endsWith("/**"));
        if (!owned) throw new Error("F36 mutation requires a packet lane with an owned family directory");
        const leaf = owned.replace(/\/\*\*$/, "").split("/").at(-1).split("--")[0];
        lane.prohibitedPaths.push(`data/rcap-all50/overlays/census-v1/**/${leaf}*`);
        return j;
      } },
    { on: "active", id: "F3", name: "a shared host with two writers is caught", mutate: (j) => { const b = j.assignments.filter((x) => x.lane === "packet-build"); const s = b.find((x) => x.ownedPaths.some((p) => /build-census-v1/.test(p))).ownedPaths.find((p) => /build-census-v1/.test(p)); b.find((x) => !x.ownedPaths.includes(s)).ownedPaths.push(s); return j; } },
    { on: "master+active", id: "F4", name: "an active family re-dispatched is caught", mutate: ({ master, active }) => {
        const familyId = firstPF(active)?.items?.[0];
        const family = (master.families ?? []).find((row) => row.familyId === familyId);
        if (!familyId || !family) throw new Error("F4 mutation requires one dispatched packet-build family");
        master.activeOwnership.families = [...new Set([...(master.activeOwnership.families ?? []), familyId])];
        family.activeOwner = "EXTERNAL-F4-MUTATION";
        family.activeOwnerLane = "packet-build";
        return { master, active };
      } },
    { on: "active", id: "F5", name: "a placeholder in an assignment is caught", mutate: (j) => { firstPF(j).mission = "TBD"; return j; } },
    { on: "master", id: "F6", name: "a source-blocked family sent to a builder is caught", mutate: (j) => { const f = j.families.find((x) => x.state === "SOURCE_READY" && !x.activeOwner); f.state = "SOURCE_BLOCKED"; return j; } },
    { on: "master", id: "F7", name: "a legally blocked family sent to a builder is caught", mutate: (j) => { const f = j.families.find((x) => x.state === "SOURCE_READY" && !x.activeOwner); f.legalInputStatus = "OPEN_LEGAL_INPUT"; return j; } },
    { on: "master+active", id: "F11", name: "an exact effective source obligation omitted from source dispatch is caught", mutate: ({ master, active }) => {
        const family = master.families.find((f) => f.state === "SOURCE_BLOCKED" && f.sourceReadiness);
        if (!family) throw new Error("F11 mutation requires one source-blocked family");
        family.sourceReadiness.effectiveOfficialSourceIds = [
          ...(family.sourceReadiness.effectiveOfficialSourceIds ?? []),
          "official-form:F11-UNDISPATCHED-EXACT-SOURCE"
        ];
        return { master, active };
      } },
    { on: "master", id: "F8", name: "an incomplete family recorded as complete is caught", mutate: (j) => {
        const f = j.families.find((x) => x.counters);
        if (!f) throw new Error("F8 mutation requires one family with completeness counters");
        f.counters.knownRequiredFieldsMissing = 1;
        f.allNineCountersZero = false;
        f.state = "VERIFIED_PASS";
        return j;
      } },
    { on: "active", id: "F9", name: "a verifier verifying what a builder in this wave builds is caught", mutate: (j) => { const b = firstPF(j); j.assignments.find((x) => x.lane === "independent-verification").items.push(b.items[0]); return j; } },
    { on: "active", id: "F11", name: "a source-ready family left unassigned is caught", mutate: (j) => { firstPF(j).items.pop(); return j; } },
    { on: "checkpoint", id: "F11", name: "a queue count that disagrees with the lanes is caught", mutate: (j) => { j.codex.queuedTasks = 7; return j; } },
    { on: "master", id: "F13", name: "a Group C custom pleading without exact controlling authority is caught", mutate: (j) => {
        const f = j.families.find((x) => x.sourceReconciliation?.group === "C");
        if (!f) throw new Error("F13 mutation requires one Group C family");
        f.state = "SOURCE_READY";
        f.implementationStrategy = "custom_pleading";
        f.sourceReadiness.ready = true;
        f.sourceReadiness.reasons = [];
        f.sourceReadiness.boundSources = [];
        f.sourceReadiness.boundCount = 0;
        f.sourceReadiness.boundAuthorities = [];
        f.sourceReadiness.boundAuthorityCount = 0;
        return j;
      } },
    { on: "master", id: "F12", name: "a denominator that does not close is caught", mutate: (j) => { j.denominator.sumsToDenominator = false; return j; } },
    { on: "collisions", id: "F2", name: "a collision record reporting a collision it did not fail on is caught", mutate: (j) => { j.counts.pathCollisions = 1; return j; } },
    { on: "prompt", id: "F10", name: "a prompt instructing a Git network command is caught", mutateText: (t) => `${t}\n\nRun git push origin work when you are finished.\n` },
    /* F16 to F23 -- the eight ways a rolling factory quietly loses work.
     * Where the dispatch is correct the condition has no subject in it, so
     * these construct the condition rather than searching for one. */
    { on: "active", id: "F16", name: "one source obligation dispatched to two lanes is caught", mutate: (j) => { const s = j.assignments.filter((x) => x.itemKind === "sourceObligation" && x.items.length); s[1].items.push(s[0].items[0]); return j; } },
    { on: "active", id: "F17", name: "one family released by two source lanes is caught", mutate: (j) => { const s = j.assignments.filter((x) => x.itemKind === "sourceObligation" && (x.familiesUnblocked ?? []).length); s[1].familiesUnblocked.push(s[0].familiesUnblocked[0]); return j; } },
    { on: "active", id: "F17", name: "a split family claimed as released anyway is caught", mutate: (j) => {
        const s = j.assignments.find((x) => x.itemKind === "sourceObligation");
        if (!s) throw new Error("F17 requires a source lane");
        // A correct live queue may have no split families. Construct the
        // forbidden split/release pairing instead of waiting for one to exist.
        const familyId = "mutation-f17-split-family";
        s.familiesAdvancedButNotReleasedHere = [...(s.familiesAdvancedButNotReleasedHere ?? []),
          { familyId, releasedOnlyWhenAllOf: ["MUTATION_SRC_A", "MUTATION_SRC_B"] }];
        s.familiesUnblocked = [...(s.familiesUnblocked ?? []), familyId];
        return j;
      } },
    { on: "master", id: "F18", name: "a family bound by held bytes with no custody path is caught", mutate: (j) => { const f = j.families.find((x) => x.sourceStatus === "SOURCE_BOUND_BY_HELD_BYTES"); f.sourceReadiness.boundSources[0].path = ""; return j; } },
    { on: "active", id: "F18", name: "a promotion lane that drops the exact-bytes rule is caught", mutate: (j) => { j.assignments.find((x) => /^PROMO/.test(x.assignmentId)).promotionRule = "promote what the lane has resolved"; return j; } },
    { on: "active", id: "F19", name: "a builder that drops the refill rule is caught", mutate: (j) => { j.assignments.find((x) => x.lane === "packet-build").refillRule = "the lane works through its list"; return j; } },
    { on: "active", id: "F20", name: "an empty verifier marked launchable is caught", mutate: (j) => { const v = j.assignments.find((x) => x.lane === "independent-verification"); v.items = []; v.launchNow = true; return j; } },
    { on: "active", id: "F20", name: "a verifier naming a commit this repository does not have is caught", mutate: (j) => { j.assignments.find((x) => x.lane === "independent-verification").verifiesCommit = "0123456789abcdef0123456789abcdef01234567"; return j; } },
    { on: "active", id: "F21", name: "a verifier that owns a write path into what it verifies is caught", mutate: (j) => { j.assignments.find((x) => x.lane === "independent-verification").ownedPaths.push("data/rcap-all50/overlays/census-v1/**"); return j; } },
    { on: "active", id: "F22", name: "an executable family dropped from every builder is caught", mutate: (j) => { firstPF(j).items.pop(); return j; } },
    /* No builder claims a shared host in a correct dispatch, so this hands a
     * real shared host from the master queue to two of them. */
    { on: "master", id: "F27", name: "an undeclared byState value is caught", mutate: (j) => { j.byState = { ...j.byState, INVENTED_STATE: 1 }; return j; } },
    { on: "master", id: "F27", name: "a family in an undeclared state is caught", mutate: (j) => { j.families[0].state = "NOT_IN_THE_VOCABULARY"; return j; } },
    { on: "master", id: "F27", name: "dropping a state from the vocabulary while families are still in it is caught", mutate: (j) => { j.stateVocabulary = j.stateVocabulary.filter((x) => x !== "LEGAL_BLOCKED"); return j; } },
    { on: "stale", id: "F26", name: "a legally blocked family handed to a builder is caught", mutate: (j) => { const legal = j.rows.find((r) => r.destination === "LEGAL"); const built = read(ACTIVE).assignments.find((x) => x.lane === "packet-build" && x.items.length); legal.familyId = built.items[0]; return j; } },
    { on: "stale", id: "F26", name: "dropping every legal finding is caught by the master queue still holding them", mutate: (j) => { j.rows = j.rows.map((r) => (r.destination === "LEGAL" ? { ...r, destination: "SOURCE" } : r)); return j; } },
    { on: "ledger", id: "F24", name: "one family granted to two verifiers is caught", mutate: (j) => { const v = j.claims.filter((c) => c.laneKind === "independent-verification"); v[1] = { ...v[1], familyId: v[0].familyId }; j.claims = j.claims.map((c) => (c === v[1] ? v[1] : c)); j.claims.push({ ...v[0], lane: "VF99" }); return j; } },
    { on: "ledger", id: "F24", name: "a dispatched family missing from the ledger is caught", mutate: (j) => { j.claims.shift(); return j; } },
    /* Both of these ADD a grant, which moves claimsDigest, and F24 checks the
     * digest too. Without recomputing it the "caught" case would be caught for
     * the wrong reason and the "stays green" case could never stay green, so
     * neither would say anything about the dispatch rule under test. */
    { on: "ledger", id: "F24", name: "an unreleased grant no assignment dispatches is caught", mutate: (j) => withClaimsDigest({ ...j, claims: [...j.claims, { ...j.claims[0], subjectId: "not-a-dispatched-family-set", familyId: "not-a-dispatched-family-set", lane: "VF98", released: false, releasedAt: null }] }) },
    { on: "ledger", id: "F24", expectPass: true, name: "a released grant off the dispatch stays green", mutate: (j) => withClaimsDigest({ ...j, claims: [...j.claims, { ...j.claims[0], subjectId: "a-finished-family-set", familyId: "a-finished-family-set", lane: "VF97", released: true, releasedAt: "2026-09-01T00:00:00Z" }] }) },
    { on: "ledger", id: "F24", name: "a ledger pinned to a different commit than the dispatch is caught", mutate: (j) => { j.generatedAtCommit = "0123456789abcdef0123456789abcdef01234567"; return j; } },
    { on: "raster", id: "F25", name: "a rasterizer that hardcodes its browser path again is caught", mutateText: (t) => t.replace("export function resolveChromium", "function resolveChromiumInternal") },
    { on: "prompt", id: "F25", name: "a prompt telling a worker to use pdftoppm is caught", mutateText: (t) => `${t}\n\nRender the pages with pdftoppm -r 72 if Chromium is unavailable.\n` },
    { on: "active", id: "F23", name: "a shared build host handed to two lanes is caught", mutate: (j) => { const shared = read(MASTER).families.find((f) => (f.importedBy ?? []).length > 0 && f.buildScript); if (!shared) throw new Error("the master queue names no shared build host at all"); const b = j.assignments.filter((x) => x.lane === "packet-build"); b[0].ownedPaths.push(shared.buildScript); b[1].ownedPaths.push(shared.buildScript); return j; } },
    { on: "master", id: "F13", name: "an exact identity with no held byte classified SOURCE_READY is caught", mutate: (j) => { const f = j.families.find((x) => x.state === "SOURCE_BLOCKED"); f.state = "SOURCE_READY"; return j; } },
    { on: "master", id: "F13", name: "a held path with no SHA classified SOURCE_READY is caught", mutate: (j) => { heldSourceReady(j).source.sha256 = null; return j; } },
    { on: "master", id: "F13", name: "a held SHA with no indexed path classified SOURCE_READY is caught", mutate: (j) => { heldSourceReady(j).source.path = null; return j; } },
    { on: "master", id: "F13", name: "a readiness verdict with a stated reason still called ready is caught", mutate: (j) => { const f = j.families.find((x) => x.state === "SOURCE_READY"); f.sourceReadiness.reasons = ["indexed SHA-256 does not equal the held SHA-256"]; return j; } },
    { on: "master", id: "F13", name: "a family with zero bound sources classified SOURCE_READY is caught", mutate: (j) => { const f = heldSourceReady(j).family; f.sourceReadiness.boundSources = []; f.sourceReadiness.boundCount = 0; return j; } },
    { on: "master", id: "F13", expectPass: true, name: "a direct-attachment SOURCE_READY family with no bound sources stays green", mutate: (j) => { const f = directAttachmentSourceReady(j); f.sourceReadiness = { ...f.sourceReadiness, ready: true, boundCount: 0, boundSources: [], reasons: [] }; return j; } },
    { on: "prompt", id: "F14", name: "a builder prompt without the task-isolation banner is caught", mutateText: (t) => t.replace(/THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK\./, "This is a task.") },
    { on: "prompt", id: "F14", name: "a builder prompt whose blocked family does not continue the lane is caught", mutateText: (t) => t.replace(/CONTINUE TO THE NEXT FAMILY/g, "stop the lane") },
    { on: "prompt", id: "F14", name: "a builder prompt that drops the one-row-per-family rule is caught", mutateText: (t) => t.replace(/one row per assigned family/gi, "some rows") },
    { on: "prompt", id: "F14", name: "a builder prompt that lets a stopped family write is caught", mutateText: (t) => t.replace(/leave its overlay directory byte-for-byte unchanged/i, "may leave partial output") },
    /* F24's grant-set identity. generatedAtCommit is a declared floor and did
     * not move when thirteen grants were revoked, so both ledgers named the
     * same commit and a stale worker's assertion was indistinguishable from a
     * current one. The digest is a function of the grants. */
    { on: "ledger", id: "F24", name: "a ledger whose digest does not describe its own grants is caught", mutate: (j) => { j.claimsDigest = "0".repeat(64); return j; } },
    { on: "ledger", id: "F24", name: "a ledger with no grant-set identity at all is caught", mutate: (j) => { delete j.claimsDigest; return j; } },
    /* F28: the isolation banner, on prompts F14 never reads. The subject is a
     * repair prompt in a subdirectory -- exactly what the non-recursive scan
     * could not see. */
    { on: "repairPrompt", id: "F28", name: "a repair prompt in a subdirectory stripped of its isolation banner is caught", mutateText: (t) => t.replace(/THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK\./, "This is a task.") },
    { on: "repairPrompt", id: "F10", name: "a repair prompt in a subdirectory instructing a Git network command is caught", mutateText: (t) => `${t}\n\nRun git pull before you start.\n` },
    { on: "repairPrompt", id: "F25", name: "a repair prompt in a subdirectory reaching for Poppler is caught", mutateText: (t) => `${t}\n\nRender with pdftoppm -r 72 and apt-get install -y poppler-utils.\n` },
    /* F25 now asserts the preflight renders rather than resolving a path. */
    { on: "raster", id: "F25", name: "a rasterizer with no render probe is caught", mutateText: (t) => t.replace("export async function probeRasterizer", "async function probeRasterizerInternal") },
    /* F29. A returned verdict that the queue does not act on. The subject is
     * real: nine Washington families sat in VERIFYING with a
     * FAIL_REPAIR_REQUIRED verdict already recorded beside them. */
    { on: "master", id: "F29", name: "a failed family the queue still calls VERIFYING is caught", mutate: (j) => { const f = j.families.find((x) => x.familyId === failedFamilyF29Judges()); f.state = "VERIFYING"; return j; } },
    { on: "master", id: "F29", name: "a failed family the queue calls proven is caught", mutate: (j) => { const f = j.families.find((x) => x.familyId === failedFamilyF29Judges()); f.state = "VERIFIED_PASS"; return j; } },
    /* These two mutate the dispatch F29 actually reads for the family it is
     * judging. They used to edit WASHINGTON_REPAIR.json, which stopped naming
     * any currently-judged family once the Washington repairs released -- so
     * both edits became no-ops and reported MISSED against a check that was
     * working. A repair dispatch now lives in the generated FIX lane rows for
     * most families, and that is what has to be broken to test the rule. */
    { on: "active", id: "F29", name: "a repair dispatch that drops a failed family is caught", mutate: (j) => { const fam = failedFamilyF29Judges(); let touched = false; for (const x of j.assignments) { if (x.lane !== "rapid-repair" && x.lane !== "shared-host-repair") continue; if ((x.items ?? []).includes(fam)) { x.items = x.items.filter((i) => i !== fam); touched = true; } if ((x.detail ?? []).some((r) => r.familyId === fam)) { x.detail = x.detail.filter((r) => r.familyId !== fam); touched = true; } } if (!touched) throw new Error(`no repair lane dispatches ${fam}, so dropping it proves nothing`); return j; } },
    { on: "active", id: "F29", name: "a repair dispatch that names no exact obligation is caught", mutate: (j) => { const fam = failedFamilyF29Judges(); let touched = false; for (const x of j.assignments) { if (x.lane !== "rapid-repair" && x.lane !== "shared-host-repair") continue; if (!(x.detail ?? []).some((r) => r.familyId === fam)) continue; /* The row still dispatches the family, and says nothing about WHICH obligation failed. Blanking one field is not enough: the obligation is named again inside failedObligations and a third time in the finding prose, so the check would still see it and the mutation would prove nothing. */ x.detail = x.detail.map((r) => (r.familyId === fam ? { familyId: r.familyId, directory: r.directory } : r)); touched = true; } if (!touched) throw new Error(`no repair detail row dispatches ${fam}, so stripping its obligation proves nothing`); return j; } },
    { on: "master+ledger+active", id: "F29", name: "an arbitrary high FIX claim with no independent dispatch is caught", mutate: ({ master, ledger, active }) => {
        const familyId = failedFamilyF29Judges();
        const claim = (ledger.claims ?? []).find((row) =>
          (row.laneKind === "repair" || row.laneKind === "shared-host-repair")
          && row.released !== true
          && (row.familyIds ?? (row.familyId ? [row.familyId] : [])).includes(familyId));
        const assignment = (active.assignments ?? []).find((row) =>
          (row.lane === "rapid-repair" || row.lane === "shared-host-repair")
          && (row.items ?? []).includes(familyId));
        const family = (master.families ?? []).find((row) => row.familyId === familyId);
        if (!claim || !assignment || !family) throw new Error("F29 high-lane mutation requires one currently dispatched repair family");
        claim.lane = "FIX999";
        family.activeOwner = "FIX999";
        family.activeOwnerLane = "rapid-repair";
        assignment.items = assignment.items.filter((id) => id !== familyId);
        assignment.itemCount = assignment.items.length;
        assignment.detail = (assignment.detail ?? []).filter((row) => row.familyId !== familyId);
        return { master, ledger: withClaimsDigest(ledger), active };
      } },
    { on: "verifierReturns", id: "F29", name: "an extraction with no verdicts at all is caught", mutate: (j) => { j.rows = []; j.failRepairRequiredFamilies = []; return j; } },
    /* F31-F32. Administrative claim history never outranks a later packet
     * read, and a substantive source block never loops back to verification. */
    { on: "verifierReturns", id: "F31", name: "dropping one preserved claim-gate history row is caught", mutate: (j) => { const i = (j.rows ?? []).findIndex((r) => r.verdict === "BLOCKED_BEFORE_CLAIM"); if (i < 0) throw new Error("F31 history mutation requires a preserved claim-gate row"); j.rows.splice(i, 1); return j; } },
    { on: "verifierReturns", id: "F31", name: "an only-record claim-gate refusal promoted as a pass is caught", mutate: (j) => {
        const master = read(MASTER);
        const proven = new Set(master.families.filter((f) => ["COMPLETE_PACKET_PROVEN", "VERIFIED_PASS", "PASS_COMPLETE"].includes(f.state)).map((f) => f.familyId));
        const row = (j.rows ?? []).find((r) => r.isIndependentVerification && r.verdict === "PASS_COMPLETE_INDEPENDENT" && !r.superseded && proven.has(r.familyId));
        if (!row) throw new Error("F31 only-refusal mutation requires a currently proven independent pass");
        j.rows = j.rows.filter((r) => r.familyId !== row.familyId || r === row);
        row.verdict = "BLOCKED_BEFORE_CLAIM";
        row.superseded = false;
        return j;
      } },
    { on: "master", id: "F31", name: "a historical claim-gate refusal selected over the current substantive verdict is caught", mutate: (j) => {
        const returns = read(`${DIR}/VERIFIER_RETURNS.json`);
        const refusal = (returns.rows ?? []).find((r) => r.isIndependentVerification
          && r.verdict === "BLOCKED_BEFORE_CLAIM"
          && returns.rows.some((candidate) => candidate.familyId === r.familyId
            && candidate.isIndependentVerification
            && candidate.verdict !== "BLOCKED_BEFORE_CLAIM"
            && !candidate.superseded));
        if (!refusal) throw new Error("F31 selection mutation requires claim-gate history beside a current substantive verdict");
        const family = j.families.find((f) => f.familyId === refusal.familyId);
        if (!family) throw new Error(`F31 selection mutation cannot find ${refusal.familyId} in the queue`);
        family.selectedIndependentVerdict = {
          verdict: refusal.verdict,
          lane: refusal.lane,
          verifiedAtBase: refusal.verifiedAtBase ?? null,
          evidencePath: refusal.evidencePath ?? null
        };
        return j;
      } },
    { on: "master", id: "F32", name: "a current source block sent back to verification is caught", mutate: (j) => {
        const returns = JSON.parse(fs.readFileSync(path.join(ROOT, DIR, "VERIFIER_RETURNS.json"), "utf8"));
        const row = (returns.rows ?? []).find((r) => r.isIndependentVerification && r.verdict === "BLOCKED_SOURCE" && !r.superseded);
        if (!row) throw new Error("F32 mutation requires a current BLOCKED_SOURCE verdict");
        const family = j.families.find((f) => f.familyId === row.familyId);
        if (!family) throw new Error(`F32 mutation cannot find ${row.familyId} in the queue`);
        family.state = "VERIFY_PENDING";
        return j;
      } },
    { on: "active", id: "F32", name: "a current source block put into a verifier assignment is caught", mutate: (j) => {
        const returns = read(`${DIR}/VERIFIER_RETURNS.json`);
        const row = (returns.rows ?? []).find((r) => r.isIndependentVerification && r.verdict === "BLOCKED_SOURCE" && !r.superseded);
        if (!row) throw new Error("F32 dispatch mutation requires a current BLOCKED_SOURCE verdict");
        const lane = j.assignments.find((a) => a.lane === "independent-verification");
        if (!lane) throw new Error("F32 dispatch mutation requires an independent-verification assignment");
        lane.items = [...new Set([...(lane.items ?? []), row.familyId])];
        return j;
      } },
    { on: "ledger", id: "F32", name: "a current source block given a live reread claim is caught", mutate: (j) => {
        const returns = read(`${DIR}/VERIFIER_RETURNS.json`);
        const sourceBlock = (returns.rows ?? []).find((r) => r.isIndependentVerification && r.verdict === "BLOCKED_SOURCE" && !r.superseded);
        if (!sourceBlock) throw new Error("F32 reread mutation requires a current BLOCKED_SOURCE verdict");
        const claim = (j.claims ?? []).find((c) => c.laneKind === "independent-verification" && c.released === true && (c.familyIds ?? (c.familyId ? [c.familyId] : [])).includes(sourceBlock.familyId));
        if (!claim) throw new Error(`F32 reread mutation requires a released verification claim for ${sourceBlock.familyId}`);
        claim.released = false;
        claim.releasedAt = null;
        return withClaimsDigest(j);
      } },
    /* F33. An owner product refusal is not verification work. */
    { on: "master", id: "F33", name: "inflating VERIFY_PENDING with an owner-refused delivery type is caught", mutate: (j) => {
        const wrong = (j.families ?? []).find((f) => f.state === "WRONG_DELIVERY_TYPE");
        if (!wrong) throw new Error("F33 denominator mutation requires a WRONG_DELIVERY_TYPE family");
        j.denominator.verifyPending += 1;
        return j;
      } },
    { on: "active", id: "F33", name: "dispatching an owner-refused delivery type to independent rereview is caught", mutate: (j) => {
        const master = read(`${DIR}/MASTER_QUEUE.json`);
        const wrong = (master.families ?? []).find((f) => f.state === "WRONG_DELIVERY_TYPE");
        const lane = (j.assignments ?? []).find((a) => a.lane === "independent-verification");
        if (!wrong || !lane) throw new Error("F33 dispatch mutation requires a wrong-delivery family and verifier lane");
        lane.items = [...new Set([...(lane.items ?? []), wrong.familyId])];
        return j;
      } },
    { on: "ledger", id: "F33", name: "reopening independent rereview for an owner-refused delivery type is caught", mutate: (j) => {
        const master = read(`${DIR}/MASTER_QUEUE.json`);
        const wrong = (master.families ?? []).find((f) => f.state === "WRONG_DELIVERY_TYPE");
        const claim = (j.claims ?? []).find((c) => c.laneKind === "independent-verification" && c.released === true && (c.familyIds ?? (c.familyId ? [c.familyId] : [])).includes(wrong?.familyId));
        if (!wrong || !claim) throw new Error("F33 claim mutation requires a released verification claim for a wrong-delivery family");
        claim.released = false;
        claim.releasedAt = null;
        return withClaimsDigest(j);
      } },
    /* F34. A finished packet cannot keep a verifier busy without a current
     * verification state. This is the exact stale-grant shape that F24 cannot
     * distinguish from an intentionally dispatched reread. */
    { on: "ledger+active", id: "F34", mustStayGreen: ["F24"], name: "matching grant and dispatch on an already-proven null-lapse family is caught", mutate: ({ ledger, active }) => {
        const master = read(`${DIR}/MASTER_QUEUE.json`);
        const proven = (master.families ?? []).find((f) => f.state === "COMPLETE_PACKET_PROVEN" && !f.verificationLapsedBecause);
        const claim = (ledger.claims ?? []).find((c) => c.laneKind === "independent-verification" && c.released === true && (c.familyIds ?? (c.familyId ? [c.familyId] : [])).includes(proven?.familyId));
        const lane = (active.assignments ?? []).find((a) => a.lane === "independent-verification");
        if (!proven || !claim || !lane) throw new Error("F34 mutation requires a proven null-lapse family, released verification claim, and verifier lane");
        claim.lane = lane.assignmentId;
        claim.released = false;
        claim.releasedAt = null;
        lane.items = [...new Set([...(lane.items ?? []), proven.familyId])];
        lane.itemCount = lane.items.length;
        return { ledger: withClaimsDigest(ledger), active };
      } },
    { on: "master+ledger+active", id: "F34", expectPass: true, mustStayGreen: ["F24"], name: "a matching live grant in VERIFY_PENDING stays green", mutate: ({ master, ledger, active }) => {
        const proven = (master.families ?? []).find((f) => f.state === "COMPLETE_PACKET_PROVEN" && !f.verificationLapsedBecause);
        const claim = (ledger.claims ?? []).find((c) => c.laneKind === "independent-verification" && c.released === true && (c.familyIds ?? (c.familyId ? [c.familyId] : [])).includes(proven?.familyId));
        const lane = (active.assignments ?? []).find((a) => a.lane === "independent-verification");
        if (!proven || !claim || !lane) throw new Error("F34 positive control requires a proven family, released verification claim, and verifier lane");
        proven.state = "VERIFY_PENDING";
        master.byState.COMPLETE_PACKET_PROVEN -= 1;
        master.byState.VERIFY_PENDING = (master.byState.VERIFY_PENDING ?? 0) + 1;
        master.denominator.verifyPending += 1;
        claim.lane = lane.assignmentId;
        claim.released = false;
        claim.releasedAt = null;
        lane.items = [...new Set([...(lane.items ?? []), proven.familyId])];
        lane.itemCount = lane.items.length;
        return { master, ledger: withClaimsDigest(ledger), active };
      } },
    /* F35. Break the exact evidence used by a live post-failure reread. The
     * first mutation proves that a released repair grant is not a substitute
     * for a completed causal return. The second advances both copies of the
     * verdict base to HEAD, preserving F31's selection identity while proving
     * that repair evidence and family artifacts must actually postdate the
     * failed verdict. */
    { on: "fix02Rows", id: "F35", name: "a live reread whose exact repair completion is revoked is caught", mutate: (j) => {
        const master = read(MASTER);
        const liveRereads = new Set((master.families ?? [])
          .filter((f) => f.state === "VERIFY_PENDING" && f.selectedIndependentVerdict?.verdict === "FAIL_REPAIR_REQUIRED")
          .map((f) => f.familyId));
        const row = (j.rows ?? []).find((candidate) =>
          liveRereads.has(candidate.itemId ?? candidate.familyId)
          && candidate.status === "COMPLETED"
          && candidate.repairedByThisLane === true);
        if (!row) throw new Error("F35 repair-return mutation requires a live post-failure reread completed by FIX02");
        row.status = "STOPPED";
        return j;
      } },
    { on: "master+verifierReturns", id: "F35", mustStayGreen: ["F31"], name: "a reread whose repair and artifacts do not postdate its failed verdict is caught", mutate: ({ master, verifierReturns }) => {
        const family = (master.families ?? []).find((f) =>
          f.state === "VERIFY_PENDING" && f.selectedIndependentVerdict?.verdict === "FAIL_REPAIR_REQUIRED");
        const row = (verifierReturns.rows ?? []).find((candidate) =>
          candidate.familyId === family?.familyId
          && candidate.isIndependentVerification
          && candidate.verdict === "FAIL_REPAIR_REQUIRED"
          && !candidate.superseded);
        if (!family || !row) throw new Error("F35 temporal mutation requires a live post-failure reread and its current failed verdict");
        const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
        family.selectedIndependentVerdict.verifiedAtBase = head;
        row.verifiedAtBase = head;
        return { master, verifierReturns };
      } },
    /* F30. The three ways moving the visual gate could quietly become waiving it. */
    { on: "rasterQueue", id: "F30", name: "a queued PDF with no exact hash is caught", mutate: (j) => { j.rows[0].canonicalPdfSha256 = null; return j; } },
    { on: "rasterQueue", id: "F30", name: "an undeclared raster state is caught", mutate: (j) => { j.rows[0].currentRasterState = "RASTER_PROBABLY_FINE"; return j; } },
    { on: "rasterQueue", id: "F30", name: "one family queued to two lanes is caught", mutate: (j) => { j.rows.push({ ...j.rows[0], nextOwner: "RAS04" }); return j; } },
    /*
     * Constructs its subject instead of hoping for one. This picked the first
     * VERIFY_PENDING family, which was a family with no raster row while the
     * queue was short -- but once every queued row reached RASTER_PASS the
     * family it picked already HAD a pass, so promoting it was legitimate, F30
     * rightly said nothing, and the case reported MISSED. The subject is a
     * family the raster queue does not cover at all, chosen by reading the
     * queue rather than by assuming which families are in it.
     */
    { on: "master", id: "F30", name: "a family called proven with no RASTER_PASS is caught", mutate: (j) => {
        const q = JSON.parse(fs.readFileSync(path.join(ROOT, DIR, "RASTER_QUEUE.json"), "utf8"));
        const passed = new Set(q.rows.filter((r) => r.currentRasterState === "RASTER_PASS").map((r) => r.familyId));
        const f = j.families.find((x) => !passed.has(x.familyId));
        if (!f) return j;                 // no subject: reported MISSED, never a pass
        f.state = "PASS_COMPLETE"; return j; } },
    { on: "prompt", id: "F30", name: "a builder prompt that drops the not-a-blocker rule is caught", mutateText: (t) => t.replace(/not a source blocker and it is not a legal blocker/i, "a blocker") }
  ];
  let undetected = 0;
  let unprovable = 0;
  /*
   * A mutation judged against an ALREADY-FAILING check proves nothing. F24 was
   * red at baseline for eighteen undispatched grants, and every F24 case
   * therefore reported "detected" no matter what it mutated -- including one
   * deliberately written to stay green, which reported OVER-CAUGHT. Seven
   * cases were reading as evidence while testing nothing.
   *
   * So the baseline is measured first, and any case whose check is already red
   * is reported UNPROVABLE rather than counted either way.
   */
  const baselineFailed = new Set(run().failed.map((f) => f.id));
  if (baselineFailed.size) console.log(`  baseline: ${[...baselineFailed].sort().join(", ")} already failing — cases for those checks cannot be judged\n`);
  try {
    for (const c of cases) {
      if (baselineFailed.has(c.id)) {
        console.log(`  UNPROVABLE  [${c.id}] ${c.name} — this check is red before the mutation`);
        unprovable += 1;
        continue;
      }
      /* A target is JSON or it is source. The harness assumed JSON for
       * everything but the prompt, so the first source-file mutation --
       * breaking the rasterizer's resolver on purpose -- died in JSON.parse
       * before it could prove anything. A case says which by carrying
       * mutateText or mutate. */
      const touchedTargets = c.on.split("+");
      if (c.on === "prompt") fs.writeFileSync(promptTarget, c.mutateText(originalPrompt.toString("utf8")));
      else if (c.mutateText) fs.writeFileSync(targets[c.on], c.mutateText(originals[c.on].toString("utf8")));
      else if (touchedTargets.length > 1) {
        const inputs = Object.fromEntries(touchedTargets.map((key) =>
          [key, JSON.parse(originals[key].toString("utf8"))]));
        const outputs = c.mutate(inputs);
        for (const key of touchedTargets) {
          fs.writeFileSync(targets[key], `${JSON.stringify(outputs[key], null, 2)}\n`);
        }
      } else fs.writeFileSync(targets[c.on], `${JSON.stringify(c.mutate(JSON.parse(originals[c.on].toString("utf8"))), null, 2)}\n`);
      let caught = false;
      let collateral = [];
      try {
        const after = run();
        caught = after.failed.some((f) => f.id === c.id);
        collateral = (c.mustStayGreen ?? []).filter((id) => after.failed.some((f) => f.id === id));
      } catch { caught = true; }
      if (c.on === "prompt") fs.writeFileSync(promptTarget, originalPrompt);
      else for (const key of touchedTargets) fs.writeFileSync(targets[key], originals[key]);
      /*
       * Most cases prove the check CATCHES something. A few prove it does not
       * over-catch: when a check is narrowed -- F24 was narrowed to exempt
       * released grants -- the exemption itself needs a subject, or the
       * narrowing is free to widen into a hole and no case would notice.
       */
      if (c.expectPass) {
        console.log(`  ${caught || collateral.length ? "OVER-CAUGHT" : "stayed green"} [${c.id}] ${c.name}${collateral.length ? `; unexpectedly failed ${collateral.join(", ")}` : ""}`);
        if (caught || collateral.length) undetected += 1;
        continue;
      }
      console.log(`  ${caught && collateral.length === 0 ? "detected " : "MISSED   "} [${c.id}] ${c.name}${collateral.length ? `; unexpectedly failed ${collateral.join(", ")}` : ""}`);
      if (!caught || collateral.length) undetected += 1;
    }
  } finally {
    for (const [k, p] of Object.entries(targets)) fs.writeFileSync(p, originals[k]);
    fs.writeFileSync(promptTarget, originalPrompt);
  }
  const restored = Object.entries(targets).every(([k, p]) => fs.readFileSync(p).equals(originals[k]))
    && fs.readFileSync(promptTarget).equals(originalPrompt);
  console.log(`\n  every mutated file restored byte-for-byte: ${restored}`);
  if (unprovable) console.log(`  ${unprovable} case(s) unprovable: their check was already failing.`);
  if (!restored || undetected > 0) { console.error("the factory verifier proves less than it claims."); process.exit(1); }
  if (unprovable) { console.error(`\n${unprovable} case(s) could not be judged because their check is red at baseline. Fix the baseline, then this suite means something.`); process.exit(1); }
  console.log(`\nOK factory mutations — ${cases.length} case(s), every mutation caught.`);
}

const final = run();
if (final.failed.length > 0) { console.error(`\n${final.failed.length} factory check(s) FAILED.`); process.exit(1); }
execFileSync(process.execPath, ["scripts/grade-a-packet-factory-24h/test-post-repair-reread.mjs"], { cwd: ROOT, stdio: "inherit" });
execFileSync(process.execPath, ["scripts/grade-a-packet-factory-24h/verify-claim-ledger.mjs"], { cwd: ROOT, stdio: "inherit" });
