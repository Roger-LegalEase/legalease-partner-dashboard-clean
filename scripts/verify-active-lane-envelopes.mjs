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
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = "data/rcap-grade-a/active-lane-envelopes.json";
const CONTROLLING_BASE = "0cad61625a74665db23ac64988c301e48909cf81";

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

  // one exact base, and it is the controlling one
  if (lane.baseSha !== CONTROLLING_BASE) fail(`${id}.baseSha is ${lane.baseSha}, not the controlling base`);
  if (lane.remoteBaseSha !== CONTROLLING_BASE) fail(`${id}.remoteBaseSha is ${lane.remoteBaseSha}, not the controlling base`);
  if (!gitHas(lane.baseSha)) fail(`${id}.baseSha does not resolve to a commit in this repository`);

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

// G-DOC is queued until C or D releases a slot
const gdoc = lanes.find((l) => l.lane === "G-DOC");
if (gdoc && ACTIVE.has(gdoc.status)) {
  const stillRunning = lanes.filter((l) => (l.lane === "C" || l.lane === "D") && ACTIVE.has(l.status)).map((l) => l.lane);
  if (stillRunning.length > 0) fail(`G-DOC is active while ${stillRunning.join(" and ")} still hold a slot`);
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
console.log(`  every lane bases on ${CONTROLLING_BASE}; owned paths are disjoint; captain-only paths are prohibited to every worker.`);
