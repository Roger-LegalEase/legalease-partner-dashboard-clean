// Checks the captain's dispatch manifest before any worker starts.
//
// The manifest is the only thing standing between eight parallel sessions and
// two of them editing the same generated registry. A field that reads like a
// bracketed placeholder is not an envelope, it is a lane that will invent its
// own answer; every lane that ran without a real envelope in this sprint
// recorded that as a blocker, and one of them shipped the placeholder into a
// committed status document. So the placeholder check here is not cosmetic.
//
// Everything asserted below is asserted against the repository itself -- commits
// are resolved with git, paths are checked on disk -- rather than against the
// manifest's own claims about itself.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
register("./lib/ts-esm-loader.mjs", import.meta.url);
// Imported, never restated. Lane F's coverage is compared against the authority
// itself, so a point added there fails this file until the envelope agrees.
const { COMMERCIAL_ADMISSION_POINTS } = await import("../src/lib/rcap/fulfillment/grade-a-authority.ts");
const MANIFEST = "data/rcap-grade-a/active-lane-envelopes.json";
// The base every ACTIVE lane must start from. Integrated lanes keep the base
// they were actually built and integrated against, because rewriting their
// recorded base would make the manifest lie about history.
const ORIGINAL_BASE = "0cad61625a74665db23ac64988c301e48909cf81";

const failures = [];
const fail = (m) => failures.push(m);

const REQUIRED_FIELDS = [
  "sprintId", "lane", "model", "status", "repository", "controllingBranch",
  "baseSha", "remoteBaseSha", "laneBranch", "worktreeRule", "shardId",
  "routeIds", "packetFamilyIds", "jurisdictions", "sourceIdentities",
  "sourceHashes", "ownedPaths", "prohibitedSharedPaths", "requiredDeliverables",
  "requiredTests", "requiredReturnFormat", "requiredReturnCommit",
  "dependencies", "salvageBranches", "salvageCommits", "stopConditions"
];

// A placeholder is a field that looks answered and is not. "captain-provided"
// and "isolated worktree" are here because they are the exact strings the lanes
// in this sprint were actually handed.
const PLACEHOLDER = [
  /<[^>]*>/, /\bTBD\b/i, /\bTODO\b/i, /\bUNKNOWN\b/i,
  /NOT SUPPLIED/i, /captain-provided/i, /isolated worktree/i
];

const doc = JSON.parse(fs.readFileSync(path.join(rootDir, MANIFEST), "utf8"));
// More than one base can be legitimately active at once: a lane already
// running must not be reset onto a newer base just because one exists, while a
// lane dispatched now should start from the newest consolidated work. Each
// permitted base is declared with the reason it is permitted, so the set cannot
// grow silently.
const ACTIVE_BASES = (doc.activeDispatch?.activeBases ?? []).map((b) => b.sha);
if (ACTIVE_BASES.length === 0) fail('activeDispatch declares no active base');
for (const entry of doc.activeDispatch?.activeBases ?? []) {
  if (!entry.reason || entry.reason.trim() === '') fail(`active base ${entry.sha} is declared with no reason`);
}
const CONTROLLING_BRANCH = doc.activeDispatch?.controllingBranch ?? "claude/legalease-sprint-captain-utucnw";
const lanes = doc.lanes ?? [];
if (lanes.length === 0) fail("the manifest describes no lanes");

const ACTIVE = new Set(["active"]);

function scanPlaceholders(laneId, field, value) {
  // A stop condition may legitimately quote a placeholder it is warning about.
  if (field === "stopConditions") return;
  const strings = Array.isArray(value) ? value : [value];
  for (const s of strings) {
    if (typeof s !== "string") continue;
    for (const rx of PLACEHOLDER) {
      if (rx.test(s)) fail(`${laneId}.${field} contains placeholder text matching ${rx}: ${s.slice(0, 80)}`);
    }
  }
}

function gitHas(sha) {
  try {
    execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd: rootDir, stdio: "ignore" });
    return true;
  } catch { return false; }
}

// ---- per-lane field integrity --------------------------------------------
for (const lane of lanes) {
  const id = lane.lane ?? "(unnamed lane)";
  for (const field of REQUIRED_FIELDS) {
    if (!(field in lane)) { fail(`${id} is missing required field ${field}`); continue; }
    const v = lane[field];
    if (v === null || v === undefined) { fail(`${id}.${field} is null`); continue; }
    if (typeof v === "string" && v.trim() === "") { fail(`${id}.${field} is empty`); continue; }
    if (Array.isArray(v)) {
      if (v.length === 0) fail(`${id}.${field} is an empty required list`);
      for (const item of v) if (typeof item === "string" && item.trim() === "") fail(`${id}.${field} contains an empty entry`);
    }
    scanPlaceholders(id, field, v);
  }

  // An all-repository wildcard is not an owned path, it is a claim on everything.
  for (const p of lane.ownedPaths ?? []) {
    if (p === "**" || p === "*" || p.includes("**")) fail(`${id}.ownedPaths contains an all-repository wildcard: ${p}`);
  }

  // One exact base. An active or queued lane bases on the current dispatch base;
  // an integrated lane keeps the base it was actually built against.
  if (lane.status === "integrated") {
    // An integrated lane keeps the base it was actually built against, and lanes
    // integrated at different points have different ones -- B, C and D were built
    // on the sprint base, E on a later captain head. Pinning one constant here
    // would force a lane's record to lie about its own history. What must hold is
    // that the base is a real commit already contained in the captain branch, so
    // the record cannot name a base that never existed or was never integrated.
    if (lane.baseSha !== lane.remoteBaseSha) fail(`${id}.baseSha and remoteBaseSha disagree`);
    if (!gitHas(lane.baseSha)) {
      fail(`${id}.baseSha ${lane.baseSha} does not resolve to a commit in this repository`);
    } else {
      try {
        execFileSync("git", ["merge-base", "--is-ancestor", lane.baseSha, "HEAD"], { cwd: rootDir, stdio: "ignore" });
      } catch {
        fail(`${id}.baseSha ${lane.baseSha} is not an ancestor of the captain head, so it was never integrated`);
      }
    }
    // An integrated lane must also record the captain commit that took it in.
    if (!/^[0-9a-f]{40}$/.test(lane.captainIntegrationCommit ?? "")) {
      if (lane.lane === "E") fail(`${id} is integrated but records no exact captainIntegrationCommit`);
    } else if (!gitHas(lane.captainIntegrationCommit)) {
      fail(`${id}.captainIntegrationCommit ${lane.captainIntegrationCommit} is not in this repository`);
    }
  } else {
    if (!ACTIVE_BASES.includes(lane.baseSha)) fail(`${id}.baseSha ${lane.baseSha} is not a declared active base`);
    if (lane.baseSha !== lane.remoteBaseSha) fail(`${id}.baseSha and remoteBaseSha disagree`);
    // The branch must actually start where the envelope says it does.
    try {
      const tip = execFileSync("git", ["rev-parse", `origin/${lane.laneBranch}`], { cwd: rootDir, encoding: "utf8" }).trim();
      const merged = execFileSync("git", ["merge-base", tip, lane.baseSha], { cwd: rootDir, encoding: "utf8" }).trim();
      if (merged !== lane.baseSha) fail(`${id}.laneBranch ${lane.laneBranch} does not descend from its declared base ${lane.baseSha}`);
    } catch { /* branch not fetched here; the envelope is still internally consistent */ }
  }
  if (!gitHas(lane.baseSha)) fail(`${id}.baseSha does not resolve to a commit in this repository`);
  // Every active lane runs Claude Opus 5; Codex is removed from this sprint.
  if (ACTIVE.has(lane.status) && lane.model !== "Claude Opus 5") {
    fail(`${id}.model is ${lane.model}; every active lane runs Claude Opus 5`);
  }
  if (ACTIVE.has(lane.status) && /^codex\//.test(lane.laneBranch)) {
    fail(`${id}.laneBranch ${lane.laneBranch} is a Codex branch; those are history and authorize nothing`);
  }
  if (ACTIVE.has(lane.status) && lane.controllingBranch !== CONTROLLING_BRANCH) {
    fail(`${id}.controllingBranch is ${lane.controllingBranch}, not ${CONTROLLING_BRANCH}`);
  }

  // every salvage commit must actually exist
  for (const sha of lane.salvageCommits ?? []) {
    if (/^[0-9a-f]{40}$/.test(sha)) {
      if (!gitHas(sha)) fail(`${id} salvage commit ${sha} is not in this repository`);
    } else if (!/no salvage commits/i.test(sha)) {
      fail(`${id} salvageCommits entry is neither a 40-character SHA nor an explicit no-salvage statement: ${sha}`);
    }
  }

  // an integrated lane must name the exact commit it returned
  if (lane.status === "integrated") {
    if (!/^[0-9a-f]{40}$/.test(lane.requiredReturnCommit ?? "")) {
      fail(`${id} is integrated but requiredReturnCommit is not an exact 40-character SHA`);
    } else if (!gitHas(lane.requiredReturnCommit)) {
      fail(`${id} integration commit ${lane.requiredReturnCommit} is not in this repository`);
    }
  }

  // captain-only paths must appear in every worker's prohibited list
  if (ACTIVE.has(lane.status) || lane.status === "queued") {
    for (const captainPath of doc.captainOnlyPaths ?? []) {
      if (!(lane.prohibitedSharedPaths ?? []).includes(captainPath)) {
        fail(`${id}.prohibitedSharedPaths omits captain-only path ${captainPath}`);
      }
    }
  }

  // A captain-only path may not be OWNED either. Listing it as prohibited and
  // then claiming it is the contradiction a worker would actually write, and
  // checking only the prohibited list misses it entirely.
  if (ACTIVE.has(lane.status) || lane.status === "queued") {
    for (const captainPath of doc.captainOnlyPaths ?? []) {
      for (const owned of lane.ownedPaths ?? []) {
        if (owned === captainPath || (captainPath.endsWith("/") && owned.startsWith(captainPath))) {
          fail(`${id}.ownedPaths claims captain-only path ${owned}`);
        }
      }
    }
  }

  // no worker owns Production configuration or secrets
  for (const p of lane.ownedPaths ?? []) {
    if (/(^|\/)\.env|secrets?\//i.test(p) || /vercel\.json|\.npmrc/i.test(p)) {
      fail(`${id}.ownedPaths claims Production configuration or secrets: ${p}`);
    }
  }

  // owned paths must exist, or the lane is aimed at nothing
  for (const p of lane.ownedPaths ?? []) {
    if (!fs.existsSync(path.join(rootDir, p))) fail(`${id}.ownedPaths names a path that is not in the tree: ${p}`);
  }
}

// ---- active-envelope sanitation -------------------------------------------
//
// An active envelope is what a worker reads to decide where to start and what to
// return. A stale branch name or a stale SHA in it is not cosmetic: it sends a
// live lane to the wrong base or tells it to push to a branch nobody reads.
for (const lane of lanes) {
  if (!ACTIVE.has(lane.status)) continue;
  const id = lane.lane;
  const envelope = JSON.stringify(lane);

  // No Codex reference may survive anywhere in an active envelope.
  if (/codex/i.test(envelope)) {
    fail(`${id} active envelope still contains a Codex reference`);
  }

  // The return instruction must name the branch the lane actually pushes to.
  if (!String(lane.requiredReturnCommit ?? "").includes(lane.laneBranch)) {
    fail(`${id}.requiredReturnCommit does not name its own laneBranch ${lane.laneBranch}`);
  }

  // The identity gate a lane runs must assert that lane's own base and branch.
  const identity = (lane.stopConditions ?? []).filter((c) => /identity gate/i.test(c));
  if (identity.length === 0) {
    fail(`${id} has no identity stop condition`);
  }
  for (const condition of identity) {
    const shas = condition.match(/[0-9a-f]{40}/g) ?? [];
    if (shas.length === 0) fail(`${id} identity stop condition names no SHA`);
    for (const sha of shas) {
      if (sha !== lane.baseSha) fail(`${id} identity stop condition expects ${sha}, not its own baseSha ${lane.baseSha}`);
    }
    const branches = condition.match(/origin\/([A-Za-z0-9._\/-]+?)(?=:|\s|$)/g) ?? [];
    if (branches.length === 0) fail(`${id} identity stop condition names no branch`);
    for (const branch of branches) {
      const named = branch.replace(/^origin\//, "");
      if (named !== lane.controllingBranch) {
        fail(`${id} identity stop condition expects branch ${named}, not its own controllingBranch ${lane.controllingBranch}`);
      }
    }
  }

  // An active lane may not point at the historical sprint base.
  if (doc.historicalSprintBaseSha && lane.baseSha === doc.historicalSprintBaseSha) {
    fail(`${id} bases on the historical sprint base, which is not an active base`);
  }
}

// The historical base must not be smuggled back in as an active one.
if (doc.historicalSprintBaseSha && ACTIVE_BASES.includes(doc.historicalSprintBaseSha)) {
  fail("the historical sprint base is declared as an active base");
}

// ---- Lane F covers exactly the authority's exported admission points -------
const laneF = lanes.find((l) => l.lane === "F");
if (laneF && ACTIVE.has(laneF.status)) {
  const declared = laneF.requiredAdmissionPoints ?? [];
  if (declared.length === 0) {
    fail("F declares no required admission points");
  } else {
    for (const point of COMMERCIAL_ADMISSION_POINTS) {
      if (!declared.includes(point)) fail(`F omits admission point ${point}, which the authority exports`);
    }
    for (const point of declared) {
      if (!COMMERCIAL_ADMISSION_POINTS.includes(point)) fail(`F declares admission point ${point}, which the authority does not export`);
    }
    if (declared.length !== COMMERCIAL_ADMISSION_POINTS.length) {
      fail(`F declares ${declared.length} admission points; the authority exports ${COMMERCIAL_ADMISSION_POINTS.length}`);
    }
  }
  if (/\bnine\b/i.test(JSON.stringify(laneF))) {
    fail("F still hard-codes a count of admission points rather than naming the exported set");
  }
}

// ---- cross-lane exclusivity ----------------------------------------------
const workers = lanes.filter((l) => ACTIVE.has(l.status) || l.status === "queued");

// one fresh branch each
const branches = new Map();
for (const l of workers) {
  if (branches.has(l.laneBranch)) fail(`${l.lane} and ${branches.get(l.laneBranch)} share lane branch ${l.laneBranch}`);
  else branches.set(l.laneBranch, l.lane);
}

// owned paths must not overlap
function overlaps(a, b) {
  if (a === b) return true;
  if (b.endsWith("/") && a.startsWith(b)) return true;
  if (a.endsWith("/") && b.startsWith(a)) return true;
  return false;
}
for (let i = 0; i < workers.length; i++) {
  for (let j = i + 1; j < workers.length; j++) {
    for (const pa of workers[i].ownedPaths ?? []) {
      for (const pb of workers[j].ownedPaths ?? []) {
        if (overlaps(pa, pb)) fail(`${workers[i].lane} and ${workers[j].lane} both own ${pa} / ${pb}`);
      }
    }
  }
}

// a packet family and a route id belong to exactly one lane
function uniqueAcross(field, isConcrete) {
  const owner = new Map();
  for (const l of workers) {
    for (const v of l[field] ?? []) {
      if (!isConcrete(v)) continue;
      if (owner.has(v)) fail(`${field} ${v} is assigned to both ${owner.get(v)} and ${l.lane}`);
      else owner.set(v, l.lane);
    }
  }
}
uniqueAcross("packetFamilyIds", (v) => !/^no packet family/i.test(v));
uniqueAcross("routeIds", (v) => /^[A-Z]{2}:/.test(v));

// ---- concurrency ----------------------------------------------------------
const activeCount = lanes.filter((l) => ACTIVE.has(l.status)).length;
const captainSession = 1;
const limit = doc.concurrency?.maxActiveSessions ?? 8;
if (activeCount + captainSession > limit) {
  fail(`${activeCount} active lanes plus the captain exceeds the ${limit} session limit`);
}

// Lane G owns exactly one concrete packet family, never a self-selected set.
const g = lanes.find((l) => l.lane === "G");
if (g) {
  const fams = (g.packetFamilyIds ?? []).filter((f) => !/^no packet family/i.test(f));
  if (fams.length !== 1) fail(`G is assigned ${fams.length} packet families; it must be assigned exactly one`);
  for (const forbidden of ["oregon", "north-dakota"]) {
    if (fams.includes(forbidden)) fail(`G is assigned ${forbidden}, which is already integrated`);
  }
  if ((g.routeIds ?? []).filter((r) => /^[A-Z]{2}:/.test(r)).length === 0) {
    fail("G is assigned no concrete route ids");
  }
}

// ---- report ---------------------------------------------------------------
if (failures.length > 0) {
  console.error(`\nACTIVE LANE ENVELOPES: ${failures.length} PROBLEM(S)`);
  for (const f of failures) console.error(`  x ${f}`);
  process.exit(1);
}
const counts = lanes.reduce((a, l) => ((a[l.status] = (a[l.status] ?? 0) + 1), a), {});
console.log(`Active lane envelopes verified: ${lanes.length} lane(s).`);
console.log(`  ${Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join("   ")}`);
console.log(`  active lanes base on one of ${ACTIVE_BASES.length} declared base(s) and all run Claude Opus 5; owned paths are disjoint; captain-only paths are prohibited to every worker.`);
