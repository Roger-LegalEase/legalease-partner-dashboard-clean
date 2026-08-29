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
//
// IDENTITY GATES ASSERT LINEAGE, NOT EQUALITY
//
// The first version of the identity gate told each worker to check that the
// captain branch printed the worker's base SHA. That is a stop condition that
// becomes false through the captain doing its job: the moment the captain
// commits anything after dispatch -- integrating a lane, filing a blocker,
// editing this very file -- the tip advances and every dispatched worker reads
// its own environment as misrouted. A gate that can only hold while the captain
// is idle is worse than no gate, because a worker cannot tell that failure apart
// from a genuinely wrong clone, and the honest response to both is to stop.
//
// What the worker actually needs to know is that it is standing on the captain's
// line of history, which does not stop being true when the line grows longer.
// So the gate asserts ancestry -- the base is contained in the captain branch,
// and the lane branch contains the base -- and this file rejects the equality
// form outright, so it cannot come back the next time a dispatch is written.
//
//   node scripts/verify-active-lane-envelopes.mjs
//   node scripts/verify-active-lane-envelopes.mjs --mutations
//
// --mutations breaks the manifest one way at a time, in memory, and requires
// each breakage to be caught. Nothing is written to disk by that mode; a check
// that has never been shown to fail is not evidence that anything is true.
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

const ACTIVE = new Set(["active"]);
const DISPATCHED = new Set(["active", "queued"]);

// ---- what an equality-form identity gate looks like -------------------------
//
// These match a stop condition that pins a branch tip to a commit, in the forms
// a captain would actually write it. The lineage form -- "is an ancestor of",
// "contains", "merge-base --is-ancestor" -- deliberately matches none of them.
const EQ_VERB =
  "(?:print|prints|printed|equal|equals|match|matches|resolve to|resolves to|be exactly|is exactly|point at|points at|read|reads)";
const SHA40 = "\\b[0-9a-f]{40}\\b";
const SHA_SHORT = "\\b[0-9a-f]{7,40}\\b";
// Generic forms: pinning any tip to a commit by comparison.
const TIP_EQUALITY_ANY = [
  new RegExp(`does not ${EQ_VERB} ${SHA_SHORT}`, "i"),
  new RegExp(`${SHA40} (?:must|should|has to|is required to) (?:${EQ_VERB}|be)\\b`, "i"),
  new RegExp(`(?:captain|controlling) (?:branch )?(?:tip|head) (?:must|should|has to|is required to) (?:${EQ_VERB}|be|equal)`, "i")
];
// The controlling-branch form, built per lane. It is deliberately NOT applied to
// a lane's own branch: "the lane branch carries only this lane's commits beyond
// the base" is a true and useful thing to assert, and only the comparison
// against the captain's moving tip is the defect.
function captainTipEqualityHit(text, controllingBranch) {
  for (const rx of TIP_EQUALITY_ANY) if (rx.test(text)) return true;
  const branch = String(controllingBranch).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const specific = new RegExp(
    `origin\\/${branch} (?:must |should |has to |is required to )?${EQ_VERB} ${SHA_SHORT}`,
    "i"
  );
  return specific.test(text);
}

// ---- git, asked rather than assumed ----------------------------------------
function gitHas(sha) {
  if (!/^[0-9a-f]{7,40}$/.test(String(sha ?? ""))) return false;
  try {
    execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd: rootDir, stdio: "ignore" });
    return true;
  } catch { return false; }
}
function gitResolve(ref) {
  try {
    return execFileSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], { cwd: rootDir, encoding: "utf8" }).trim();
  } catch { return null; }
}
function isAncestor(ancestor, descendant) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], { cwd: rootDir, stdio: "ignore" });
    return true;
  } catch { return false; }
}

// Branch names as they appear inside prose. The character class stops at a
// backtick, a comma, a colon or a space, so a branch quoted inside a shell
// command is still extracted intact.
const ORIGIN_REF = /origin\/(?:[A-Za-z0-9_-]+)(?:\/[A-Za-z0-9._-]+)*/g;
function namedBranches(text) {
  return [...String(text).matchAll(ORIGIN_REF)].map((m) => m[0].replace(/^origin\//, "").replace(/\.+$/, ""));
}
function namedShas(text) {
  return String(text).match(/\b[0-9a-f]{40}\b/g) ?? [];
}
const squash = (s) => String(s).replace(/\s+/g, " ");

/**
 * Every assertion this file makes, as a pure function of the manifest. Pure so
 * that --mutations can break a clone of the document and ask the same question
 * again, instead of writing a deliberately broken manifest to disk and hoping
 * the process lives long enough to put it back.
 */
function collectFailures(doc) {
  const failures = [];
  const fail = (m) => failures.push(m);

  // More than one base can be legitimately active at once: a lane already
  // running must not be reset onto a newer base just because one exists, while a
  // lane dispatched now should start from the newest consolidated work. Each
  // permitted base is declared with the reason it is permitted, so the set
  // cannot grow silently.
  const activeBaseEntries = doc.activeDispatch?.activeBases ?? [];
  const ACTIVE_BASES = activeBaseEntries.map((b) => b.sha);
  if (ACTIVE_BASES.length === 0) fail("activeDispatch declares no active base");
  for (const entry of activeBaseEntries) {
    if (!entry.reason || entry.reason.trim() === "") fail(`active base ${entry.sha} is declared with no reason`);
  }

  const CONTROLLING_BRANCH = doc.activeDispatch?.controllingBranch ?? "claude/legalease-sprint-captain-utucnw";
  // The captain branch as this clone can see it. origin/<branch> is the shared
  // truth and is preferred; HEAD is the fallback for a clone that has not
  // fetched, and is labelled as such so a reported failure is not misread.
  const controllingRef = gitResolve(`origin/${CONTROLLING_BRANCH}`) ? `origin/${CONTROLLING_BRANCH}` : "HEAD";
  const controllingLabel = controllingRef === "HEAD" ? "the captain head" : `origin/${CONTROLLING_BRANCH}`;

  const lanes = doc.lanes ?? [];
  if (lanes.length === 0) fail("the manifest describes no lanes");

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

  // ---- a declared active base must be on the captain's line ----------------
  for (const entry of activeBaseEntries) {
    if (!gitHas(entry.sha)) {
      fail(`active base ${entry.sha} does not resolve to a commit in this repository`);
    } else if (!isAncestor(entry.sha, controllingRef)) {
      fail(`active base ${entry.sha} is not an ancestor of the controlling branch (${controllingLabel}); it is not on the captain's line of history`);
    }
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

    // One exact base. An active or queued lane bases on a declared active base;
    // an integrated lane keeps the base it was actually built against.
    if (lane.baseSha !== lane.remoteBaseSha) fail(`${id}.baseSha and remoteBaseSha disagree`);
    if (!gitHas(lane.baseSha)) {
      fail(`${id}.baseSha ${lane.baseSha} does not resolve to a commit in this repository`);
    }

    if (lane.status === "integrated") {
      // An integrated lane keeps the base it was actually built against, and lanes
      // integrated at different points have different ones -- B, C and D were built
      // on the sprint base, E on a later captain head. Pinning one constant here
      // would force a lane's record to lie about its own history. What must hold is
      // that the base is a real commit already contained in the captain branch, so
      // the record cannot name a base that never existed or was never integrated.
      if (gitHas(lane.baseSha) && !isAncestor(lane.baseSha, "HEAD")) {
        fail(`${id}.baseSha ${lane.baseSha} is not an ancestor of the captain head, so it was never integrated`);
      }

      // Every integrated lane records the exact captain commit that took it in.
      // This used to fire for lane E alone, which made it a check on one row
      // rather than a rule: six lanes carried no integration commit at all and
      // the manifest reported clean. The rule holds for every integrated lane.
      const integ = lane.captainIntegrationCommit ?? "";
      if (!/^[0-9a-f]{40}$/.test(integ)) {
        fail(`${id} is integrated but records no exact captainIntegrationCommit`);
      } else if (!gitHas(integ)) {
        fail(`${id}.captainIntegrationCommit ${integ} is not in this repository`);
      } else if (!isAncestor(integ, "HEAD")) {
        fail(`${id}.captainIntegrationCommit ${integ} is not an ancestor of the captain head`);
      }

      // an integrated lane must name the exact commit it returned
      if (!/^[0-9a-f]{40}$/.test(lane.requiredReturnCommit ?? "")) {
        fail(`${id} is integrated but requiredReturnCommit is not an exact 40-character SHA`);
      } else if (!gitHas(lane.requiredReturnCommit)) {
        fail(`${id} integration commit ${lane.requiredReturnCommit} is not in this repository`);
      } else if (lane.laneBranch === CONTROLLING_BRANCH) {
        // A salvage lane has no live worker session -- its lane branch IS the
        // captain branch. The captain replayed commits off an abandoned branch,
        // so the commit the lane "returned" IS the captain commit that carried
        // it. Requiring two different SHAs here would force the record to invent
        // a worker return that never happened. (B, C and D also record the
        // controllingBranch they were dispatched under, which is not the branch
        // the captain works on today; that is their history and is left alone.)
        if (lane.requiredReturnCommit !== lane.captainIntegrationCommit) {
          fail(`${id} is a salvage lane on the controlling branch, so its return commit and captainIntegrationCommit must be the same commit`);
        }
      } else if (lane.requiredReturnCommit === lane.captainIntegrationCommit) {
        // A worker-branch lane is replayed, never merged. Identical SHAs would
        // mean the worker branch was taken whole.
        fail(`${id} records the same commit as its worker return and its captain integration; worker branches are replayed, not merged`);
      } else if (isAncestor(lane.requiredReturnCommit, "HEAD")) {
        fail(`${id}.requiredReturnCommit ${lane.requiredReturnCommit} is an ancestor of the captain head, so the worker branch was merged rather than replayed`);
      }
    }

    if (DISPATCHED.has(lane.status)) {
      if (!ACTIVE_BASES.includes(lane.baseSha)) fail(`${id}.baseSha ${lane.baseSha} is not a declared active base`);

      // A worker cannot start from a base the captain branch does not contain.
      // Without this a plausible-looking 40-character SHA -- another lane's tip,
      // an abandoned branch -- passes as a base and the lane builds off the line.
      if (gitHas(lane.baseSha) && !isAncestor(lane.baseSha, controllingRef)) {
        fail(`${id}.baseSha ${lane.baseSha} is not an ancestor of the controlling branch (${controllingLabel}); a worker may not start from a base the captain branch does not contain`);
      }

      // The branch must actually contain the base it says it starts from. This
      // is resolved against origin, and when the branch is not fetched into this
      // clone the check is skipped rather than silently passed -- but a branch
      // that IS resolvable and does not contain its base is a hard failure, not
      // an exception swallowed together with the lookup.
      const tip = gitResolve(`origin/${lane.laneBranch}`);
      if (tip !== null && gitHas(lane.baseSha) && !isAncestor(lane.baseSha, tip)) {
        fail(`${id}.laneBranch ${lane.laneBranch} does not descend from its declared base ${lane.baseSha}`);
      }

      // An active lane may not point at the historical sprint base.
      if (doc.historicalSprintBaseSha && lane.baseSha === doc.historicalSprintBaseSha) {
        fail(`${id} bases on the historical sprint base, which is not an active base`);
      }
    }

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

    // captain-only paths must appear in every worker's prohibited list
    if (DISPATCHED.has(lane.status)) {
      for (const captainPath of doc.captainOnlyPaths ?? []) {
        if (!(lane.prohibitedSharedPaths ?? []).includes(captainPath)) {
          fail(`${id}.prohibitedSharedPaths omits captain-only path ${captainPath}`);
        }
      }
    }

    // A captain-only path may not be OWNED either. Listing it as prohibited and
    // then claiming it is the contradiction a worker would actually write, and
    // checking only the prohibited list misses it entirely.
    if (DISPATCHED.has(lane.status)) {
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
    const conditions = lane.stopConditions ?? [];

    // No Codex reference may survive anywhere in an active envelope.
    if (/codex/i.test(envelope)) {
      fail(`${id} active envelope still contains a Codex reference`);
    }

    // The return instruction must name the branch the lane actually pushes to.
    if (!String(lane.requiredReturnCommit ?? "").includes(lane.laneBranch)) {
      fail(`${id}.requiredReturnCommit does not name its own laneBranch ${lane.laneBranch}`);
    }

    // No stop condition may name another lane's branch or another lane's base.
    // A worker follows its stop conditions literally; a sibling's branch in one
    // is an instruction to inspect, or push to, work that is not this lane's.
    const otherBranches = new Set(
      lanes.filter((o) => o.lane !== lane.lane).map((o) => o.laneBranch).filter((b) => b && b !== lane.controllingBranch)
    );
    const otherBases = new Set(
      lanes.filter((o) => o.lane !== lane.lane).map((o) => o.baseSha).filter((b) => b && b !== lane.baseSha)
    );
    for (const condition of conditions) {
      for (const branch of namedBranches(condition)) {
        if (branch === lane.laneBranch || branch === lane.controllingBranch) continue;
        if (otherBranches.has(branch)) {
          fail(`${id} stop condition names another lane's branch ${branch}`);
        } else {
          fail(`${id} stop condition names branch ${branch}, which is neither its own lane branch nor the controlling branch`);
        }
      }
      for (const sha of namedShas(condition)) {
        if (sha === lane.baseSha) continue;
        if (otherBases.has(sha)) {
          fail(`${id} stop condition names another lane's base ${sha}`);
        } else {
          fail(`${id} stop condition names commit ${sha}, which is not its own base ${lane.baseSha}`);
        }
      }

      // The equality form of the gate, in any stop condition. This is the defect
      // the lineage rewrite exists to remove: a condition satisfied only while
      // the captain branch stands still.
      if (captainTipEqualityHit(squash(condition), lane.controllingBranch)) {
        fail(`${id} stop condition requires the live captain tip to equal a worker base, which the captain's next commit falsifies: ${squash(condition).slice(0, 90)}`);
      }
    }

    // The identity gate itself: present, and asserting lineage in both
    // directions rather than a tip comparison.
    const identity = conditions.filter((c) => /identity gate/i.test(c));
    if (identity.length === 0) {
      fail(`${id} has no identity stop condition`);
    }
    for (const condition of identity) {
      const text = squash(condition);
      if (namedShas(text).length === 0) fail(`${id} identity stop condition names no SHA`);
      const branches = namedBranches(text);
      if (!branches.includes(lane.controllingBranch)) {
        fail(`${id} identity stop condition does not name its controlling branch ${lane.controllingBranch}`);
      }
      if (!branches.includes(lane.laneBranch)) {
        fail(`${id} identity stop condition does not name its own lane branch ${lane.laneBranch}`);
      }
      const baseInCaptain = new RegExp(
        `merge-base --is-ancestor ${lane.baseSha} origin/${lane.controllingBranch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
      );
      const baseInLane = new RegExp(
        `merge-base --is-ancestor ${lane.baseSha} origin/${lane.laneBranch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
      );
      if (!baseInCaptain.test(text)) {
        fail(`${id} identity stop condition does not assert that its base is an ancestor of the controlling branch`);
      }
      if (!baseInLane.test(text)) {
        fail(`${id} identity stop condition does not assert that its lane branch contains its base`);
      }
      if (!/clean worktree|git status --porcelain/i.test(text)) {
        fail(`${id} identity stop condition does not require a clean worktree at worker start`);
      }
      if (!new RegExp(lane.repository.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text)) {
        fail(`${id} identity stop condition does not require origin to resolve to ${lane.repository}`);
      }
    }

    // An active lane may not quote the historical sprint base as its gate.
    if (doc.historicalSprintBaseSha && identity.some((c) => c.includes(doc.historicalSprintBaseSha))) {
      fail(`${id} identity stop condition pins the historical sprint base`);
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
  const workers = lanes.filter((l) => DISPATCHED.has(l.status));

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

  // A packet family, and the routes in it, may be worked by more than one lane
  // ONLY when those lanes are split by function rather than by scope -- Colorado
  // is acquired by one lane and built by another. That is safe because their
  // owned paths are disjoint, which is enforced above; what makes it legible is
  // that each declares a distinct packetFamilyRole. Two lanes sharing a family
  // with the same role, or with no role, is the collision this check exists for.
  function uniqueUnlessRoleSplit(field, isConcrete) {
    const owners = new Map();
    for (const l of workers) {
      for (const v of l[field] ?? []) {
        if (!isConcrete(v)) continue;
        const prior = owners.get(v);
        if (!prior) { owners.set(v, l); continue; }
        const priorRole = prior.packetFamilyRole ?? null;
        const thisRole = l.packetFamilyRole ?? null;
        if (!priorRole || !thisRole) {
          fail(`${field} ${v} is assigned to both ${prior.lane} and ${l.lane}, and at least one declares no packetFamilyRole`);
        } else if (priorRole === thisRole) {
          fail(`${field} ${v} is assigned to both ${prior.lane} and ${l.lane} with the same role ${thisRole}`);
        }
      }
    }
  }
  uniqueUnlessRoleSplit("packetFamilyIds", (v) => !/^no packet family/i.test(v));
  uniqueUnlessRoleSplit("routeIds", (v) => /^[A-Z]{2}:/.test(v));

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

  return failures;
}

/* ---- mutations ------------------------------------------------------------ */
//
// Each mutation names one way a dispatch manifest goes wrong and the failure
// that must catch it. A mutation is only evidence if the clean manifest does NOT
// produce that failure, so both halves are asserted.
function runMutations(baseDoc) {
  const clone = () => JSON.parse(JSON.stringify(baseDoc));
  const laneOf = (doc, id) => doc.lanes.find((l) => l.lane === id);
  const POST_G = "148382ab2a2acbe673b6d35c8967f5a908342e60";
  // A real commit that is NOT on the captain's line: Lane E's returned worker tip.
  const OFF_LINE = "d3bd3e241b8712b9954e50323c3121ad62753f85";

  const mutations = [
    {
      name: "the identity gate demands the live captain tip equal the worker base",
      expect: "requires the live captain tip to equal a worker base",
      apply(doc) {
        const lane = laneOf(doc, "G-CO-SOURCE");
        lane.stopConditions[0] =
          `The identity gate does not print ${POST_G} for origin/${lane.controllingBranch}: return ENVIRONMENT MISROUTED without editing a file.`;
      }
    },
    {
      name: "a worker base that the captain branch does not contain",
      // Pinned to the lane rule specifically: the same sentence is also written
      // for a declared active base, and this mutation does not touch those.
      expect: `.baseSha ${OFF_LINE} is not an ancestor of the controlling branch`,
      apply(doc) {
        const lane = laneOf(doc, "G-CO-BUILD");
        lane.baseSha = OFF_LINE;
        lane.remoteBaseSha = OFF_LINE;
      }
    },
    {
      name: "a lane branch that does not descend from its declared base",
      expect: "does not descend from its declared base",
      apply(doc) {
        // An existing origin branch, resolvable in this clone, that was cut long
        // before the post-audit base and therefore cannot contain it.
        laneOf(doc, "I").laneBranch = "claude/grade-a-68h-lane-e";
      }
    },
    {
      name: "a stop condition naming another lane's branch",
      expect: "names another lane's branch",
      apply(doc) {
        const lane = laneOf(doc, "J");
        lane.stopConditions.push(
          "A conflict appears with origin/claude/grade-a-v6-co-build: reconcile it there before continuing."
        );
      }
    },
    {
      name: "an active lane based on the historical sprint base",
      expect: "bases on the historical sprint base",
      apply(doc) {
        const lane = laneOf(doc, "G-CO-SOURCE");
        lane.baseSha = baseDoc.historicalSprintBaseSha;
        lane.remoteBaseSha = baseDoc.historicalSprintBaseSha;
        // Declared as active too, so the mutation is not caught only by the
        // "not a declared active base" rule it would otherwise trip first.
        doc.activeDispatch.activeBases.push({
          sha: baseDoc.historicalSprintBaseSha,
          reason: "mutation: the historical base smuggled back in as active"
        });
      }
    }
  ];

  const clean = collectFailures(clone());
  if (clean.length > 0) {
    console.error("\nMUTATIONS NOT RUN: the unmutated manifest is already failing.");
    for (const f of clean) console.error(`  x ${f}`);
    return 1;
  }

  const undetected = [];
  for (const mutation of mutations) {
    const doc = clone();
    mutation.apply(doc);
    const found = collectFailures(doc);
    const caught = found.some((f) => f.includes(mutation.expect));
    if (caught) {
      console.log(`  detected  ${mutation.name}`);
    } else {
      undetected.push(mutation);
      console.error(`  UNDETECTED ${mutation.name}`);
      console.error(`             expected a failure containing: ${mutation.expect}`);
      console.error(`             failures seen: ${found.length === 0 ? "(none)" : found.join(" | ")}`);
    }
  }

  if (undetected.length > 0) {
    console.error(`\nFAIL active-lane-envelope mutations (${undetected.length}/${mutations.length} undetected)`);
    return 1;
  }
  console.log(`\nOK active-lane-envelope mutations — ${mutations.length}/${mutations.length} deliberate breakages detected.`);
  return 0;
}

/* ---- report --------------------------------------------------------------- */
const doc = JSON.parse(fs.readFileSync(path.join(rootDir, MANIFEST), "utf8"));

if (process.argv.includes("--mutations")) {
  process.exit(runMutations(doc));
}

const failures = collectFailures(doc);
if (failures.length > 0) {
  console.error(`\nACTIVE LANE ENVELOPES: ${failures.length} PROBLEM(S)`);
  for (const f of failures) console.error(`  x ${f}`);
  process.exit(1);
}
const lanes = doc.lanes ?? [];
const counts = lanes.reduce((a, l) => ((a[l.status] = (a[l.status] ?? 0) + 1), a), {});
const activeBases = doc.activeDispatch?.activeBases ?? [];
console.log(`Active lane envelopes verified: ${lanes.length} lane(s).`);
console.log(`  ${Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join("   ")}`);
console.log(`  active lanes base on one of ${activeBases.length} declared base(s), each contained in the controlling branch, and all run Claude Opus 5.`);
console.log(`  identity gates assert lineage, not a tip comparison; owned paths are disjoint; captain-only paths are prohibited to every worker.`);
