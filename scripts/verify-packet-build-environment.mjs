#!/usr/bin/env node
// Can this container build an official-form packet, or will it stop at the source gate?
//
// The first national packet wave answered that question the expensive way. Six
// workers were dispatched; five reached their first step, found no source bytes,
// and correctly refused. Nothing they did was wrong. The dispatch was wrong: it
// assumed a container carries the corpus, and a fresh clone never does, because
// private/ is git-ignored and the bytes live in a private release.
//
// So this runs BEFORE a packet worker, not after it. It is the difference
// between discovering the container is unusable in the first minute and
// discovering it after a session has been spent writing a gate report.
//
//   node scripts/verify-packet-build-environment.mjs
//   node scripts/verify-packet-build-environment.mjs --family ak-courtview-set
//   node scripts/verify-packet-build-environment.mjs --family ca-1203-4-set --branch claude/census-v1-build-ca-1203-4-set
//   node scripts/verify-packet-build-environment.mjs --prove     # discrimination self-test
//
//   node scripts/verify-packet-build-environment.mjs \
//     --family <FAMILY_ID> --codex-cloud --minimum-captain-sha <SHA>
//
// TWO ENVIRONMENTS, ONE STANDARD
//
// Three of these checks were written against a Codespace: a permanent origin, a
// full clone, and an origin/<branch> tracking ref. Codex Cloud has none of those
// on purpose -- it checks the selected Captain branch out as a local branch named
// `work`, shallow, and removes origin before the agent starts, because the
// finished diff returns through its own UI rather than through a push. Every
// ordinary Codex Cloud packet task therefore failed this gate before it reached
// a single source byte.
//
// --codex-cloud does not waive those three. It REPLACES them with checks that
// establish the same three facts by other evidence: the repository by its
// committed markers rather than by its remote, the checkout by proving it
// contains the exact Captain commit the assignment was cut from rather than by
// proving it contains everything, and the assignment by proving its own files
// are present in this tree rather than by resolving a remote ref.
//
// The denominator stays 14 in both modes. A waived check reported as 13/14 is a
// gate that has been argued with; a replaced check is a gate that has been met a
// different way, and only the second is worth having.
//
// Exit 0 only when every check passes. Any failure is a refusal to launch.
//
// WHY EACH CHECK EXISTS
//
// Every check below is here because something actually failed on it, and each
// one names the return that produced it. A preflight assembled from imagination
// tests the failures you thought of; this one tests the failures that happened.
//
// THE VACUITY TRAP
//
// The failure this file most has to avoid is the one it is checking for. An
// absent directory read as an empty file list is how twelve assets once flipped
// from held to passing. A check that cannot fail proves nothing, so --prove
// exercises each check against a synthetic environment that should fail it, and
// a check that passes its own negative case is reported as VACUOUS.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { preferOfficialForm } from "./lib/official-form-asset-class.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const MASTER_LIBRARY_RELATIVE = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const OPERATIONAL_RELATIVE = "private/Nationwide Record Clearing";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CUSTODY = "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json";
const WORKLIST = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const BOOTSTRAP = "scripts/rcap-corpus/bootstrap-private-corpus.sh";

const EXPECT_JURISDICTIONS = 51;
const EXPECT_FILES = 499;
const EXPECT_PDFS = 329;

/*
 * What proves this is the packet repository when there is no remote to ask.
 *
 * Four committed paths, each of which a different kind of wrong checkout would
 * be missing: the agent contract, the package manifest, this file itself, and
 * the corpus index every source check reads. A directory carrying all four and
 * a valid HEAD is this repository; a scratch clone of something else is not.
 */
const REPOSITORY_MARKERS = [
  "AGENTS.md",
  "package.json",
  "scripts/verify-packet-build-environment.mjs",
  "data/rcap-all50/local-source-corpus-index.json"
];

/* Where the cloud setup script leaves the corpus environment. Either satisfies
 * the gate: the repo-local file is what a worker sources, the home copy is what
 * survives a working-directory change. */
const CORPUS_ENV_REPO = "private/source-corpus-environment.txt";
const CORPUS_ENV_HOME = ".legalease-corpus-env";

/* The manifests a cloud assignment can live in. Searched in order; the first
 * assignment whose items name the family wins, and two matches is a refusal
 * rather than a guess. */
const ASSIGNMENT_MANIFESTS = [
  /*
   * The 24h factory's own dispatch, first because it is the current one. It was
   * missing from this list, so no family of the packet-factory-24h wave
   * resolved here: a lane that ran the preflight without an explicit
   * --assignment saw a spurious 13/14 and had to be told the path by hand.
   * A dispatch nobody can find is a dispatch that does not exist.
   */
  "data/rcap-grade-a/packet-factory-24h/ACTIVE_ASSIGNMENTS.json",
  "data/rcap-grade-a/launch-control/CODEX_CLOUD_CONTINUATIONS.json",
  "data/rcap-grade-a/launch-control/P2_WASHINGTON_VERIFICATION.json",
  "data/rcap-grade-a/launch-control/R8_FOUR_WAY_SPLIT.json",
  "data/rcap-grade-a/launch-control/S2_CONTINUATION.json",
  "data/rcap-grade-a/launch-control/COMPLETENESS_REPAIR_WAVE.json",
  "data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json",
  "data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json",
  "data/rcap-grade-a/launch-control/S2_SHARED_HOST_ASSIGNMENT.json"
];

// ---- argument handling -------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
const FAMILY = flag("--family");
const BRANCH = flag("--branch");
const REPORT = flag("--json");
const PROVE = argv.includes("--prove");
const CLOUD = argv.includes("--codex-cloud");
const REQUIRE_RASTERIZER = argv.includes("--require-rasterizer");
const MINIMUM_CAPTAIN_SHA = flag("--minimum-captain-sha");
const ASSIGNMENT_FILE = flag("--assignment");
const PROMPT_FILE = flag("--prompt");
const ASSIGNMENT_ID = flag("--assignment-id");
const SOURCE_OBLIGATION = flag("--source-obligation");

/* Source conveyor lanes are not packet builders. Their executable gate binds
 * an exact lane and (for the row gate) an exact obligation without pretending
 * that an obligation id is a packet-family id. Keep this before the 14 packet
 * checks so an ACQ lane is never required to mount private packet bytes. */
if (ASSIGNMENT_ID || SOURCE_OBLIGATION) {
  const gitSource = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };
  const activePath = "data/rcap-grade-a/packet-factory-24h/ACTIVE_ASSIGNMENTS.json";
  const failures = [];
  const active = JSON.parse(fs.readFileSync(path.join(ROOT, activePath), "utf8"));
  const claims = active.assignments.filter((a) => (a.items ?? []).includes(SOURCE_OBLIGATION));
  const lane = active.assignments.find((a) => a.assignmentId === ASSIGNMENT_ID);
  if (!/^[0-9a-f]{40}$/.test(String(MINIMUM_CAPTAIN_SHA ?? ""))) failures.push("minimum Captain SHA is absent or malformed");
  else if (gitSource(["merge-base", "--is-ancestor", MINIMUM_CAPTAIN_SHA, "HEAD"]) === null) failures.push("minimum Captain SHA is not an ancestor of HEAD");
  const sourceMissingMarkers = REPOSITORY_MARKERS.filter((m) => !fs.existsSync(path.join(ROOT, m)));
  if (sourceMissingMarkers.length) failures.push(`repository markers missing: ${sourceMissingMarkers.join(", ")}`);
  if (gitSource(["status", "--porcelain"]) !== "") failures.push("worktree is not clean");
  if (!lane) failures.push(`assignment ${ASSIGNMENT_ID ?? "(absent)"} does not exist`);
  else {
    if (lane.itemKind !== "sourceObligation" || !lane.operation) failures.push("assignment is not an operation-bound source lane");
    if (!lane.promptFile || !fs.existsSync(path.join(ROOT, lane.promptFile))) failures.push("assignment prompt does not exist");
    for (const declared of [...(lane.ownedPaths ?? []), ...(lane.prohibitedPaths ?? [])]) {
      if (!declared || typeof declared !== "string") failures.push("an owned/prohibited path declaration is absent");
    }
    if (SOURCE_OBLIGATION && !(lane.items ?? []).includes(SOURCE_OBLIGATION)) failures.push("item does not belong to the exact lane");
    if (SOURCE_OBLIGATION && (claims.length !== 1 || claims[0]?.assignmentId !== ASSIGNMENT_ID)) failures.push(`item has ${claims.length} current owners`);
    if (lane.operation === "official-acquisition-dispatch" && SOURCE_OBLIGATION) {
      const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/SOURCE_ACQUISITION_MANIFEST.json"), "utf8"));
      if (!manifest.entries.some((e) => e.itemId === SOURCE_OBLIGATION && /^https:\/\//.test(e.officialUrl ?? ""))) failures.push("ACQ row has no approved exact URL");
    }
    if (lane.operation === "promotion-and-release" && SOURCE_OBLIGATION) {
      const detail = (lane.itemDetails ?? []).find((x) => x.itemId === SOURCE_OBLIGATION);
      if (!detail?.artifactName || !detail?.receiptPath) failures.push("PROMO row has no exact artifact and receipt");
    }
  }
  for (const f of failures) console.log(`FAIL  source_lane_gate ${f}`);
  const verdict = failures.length ? "SOURCE_CONVEYOR_PREFLIGHT_REFUSED" : "SOURCE_CONVEYOR_PREFLIGHT_READY";
  console.log(`\n${verdict}: ${failures.length ? 0 : SOURCE_OBLIGATION ? 2 : 1}/${SOURCE_OBLIGATION ? 2 : 1} gate(s) passed`);
  process.exit(failures.length ? 1 : 0);
}

// ---- check plumbing ----------------------------------------------------------
// A check returns { ok, detail, ...evidence }. It never throws for a condition it
// is meant to detect: a thrown check and a failed check look different to a
// reader, and "the corpus is absent" is a finding, not a crash.
const CHECKS = [];
// `negative` optionally builds an environment this check MUST fail in. A check
// whose failure mode the barren directory does not reproduce needs its own
// negative case, or --prove would call it discriminating on no evidence.
// `cloud` optionally replaces this check under --codex-cloud: { id, title,
// because, run, negatives }. A replacement carries its own id, because a reader
// of the report must be able to see WHICH check ran, not merely that fourteen
// did. `negatives` are named scenarios --prove builds and requires to fail.
const check = (id, title, because, run, negative = null, cloud = null) =>
  CHECKS.push({ id, title, because, run, negative, cloud });

/** The form of a check that will actually run, given the mode. */
const active = (c) => (CLOUD && c.cloud ? { ...c, ...c.cloud, negative: null, replaces: c.id } : c);

const sh = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd: opts.cwd ?? ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const shSafe = (cmd, args, opts) => { try { return sh(cmd, args, opts); } catch { return null; } };

const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const readJson = (rel, env = ROOT) => {
  const p = path.join(env, rel);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
};

/** The Master Library root this environment would use, however it is pointed at. */
function masterLibraryRoot(env = ROOT) {
  if (process.env.MASTER_LIBRARY_SOURCE_DIR) return path.resolve(process.env.MASTER_LIBRARY_SOURCE_DIR);
  return path.join(env, MASTER_LIBRARY_RELATIVE);
}

/**
 * Every file under a directory, or null when the directory cannot be walked.
 *
 * null and [] are different answers and the difference is the whole point: null
 * means "there is no tree here", [] means "the tree is here and it is empty".
 * Collapsing them is the defect this preflight exists to prevent.
 */
function filesUnder(dir) {
  const found = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else found.push(path.relative(dir, full).split(path.sep).join("/"));
    }
  };
  try { walk(dir); } catch { return null; }
  return found;
}

/**
 * The document sources a family must bind.
 *
 * Two tiers, in order, and neither of them guesses.
 *
 * Tier 1 is the custody reconciliation, which already resolved each source to a
 * held path and a pinned digest. It is authoritative where it has a row.
 *
 * Tier 2 exists because the reconciliation covers the 295 acquisition tasks
 * only: a family whose sources are all held names no acquisition task and so
 * has no row, which is exactly the position the three AK families are in. For
 * those, the census route states `official-form:<number>` and the committed
 * corpus index states what that form number is held as. Resolution is exact
 * form-number equality within the index, and an ambiguous or absent form number
 * is a refusal rather than a nearest match -- a wrong resolution sends a worker
 * to measure the wrong document.
 */
function familySources(family, env = ROOT) {
  const custody = readJson(CUSTODY, env);
  const row = custody?.rows?.find((r) => r.worklistGroupId === family);
  if (row) {
    return {
      tier: "custody_reconciliation",
      from: CUSTODY,
      custodyClass: row.custodyClass,
      commissionAcquisition: row.commissionAcquisition,
      sources: (row.documentSources || [])
        .filter((s) => s.resolved && s.heldAs?.sha256)
        .map((s) => ({ sourceId: s.sourceId, path: s.heldAs.path, sha256: s.heldAs.sha256 })),
      unresolvable: []
    };
  }

  const worklist = readJson(WORKLIST, env);
  const entry = worklist?.packetFamilies?.find((f) => f.worklistGroupId === family);
  if (!entry) return null;

  const index = readJson(CORPUS_INDEX, env);
  if (!index?.entries?.length) return null;

  const formNumbers = [...new Set(
    (entry.routes || [])
      .flatMap((r) => r.requiredSourceIds || [])
      .filter((id) => typeof id === "string" && id.startsWith("official-form:"))
      .map((id) => id.slice("official-form:".length))
  )];

  const sources = [];
  const unresolvable = [];
  for (const formNumber of formNumbers) {
    let matches = index.entries.filter((e) => e.formNumber === formNumber);
    /*
     * An instruction sheet is filed under the number of the form it explains,
     * so an `official-form:` label can match the petition AND the sheet about
     * it. Different bytes, so the identical-hash collapse below cannot reach
     * them, and the number refused as an ambiguity that only ever existed in
     * how the library files its instructions. Where a FORM answers the number,
     * only FORM entries are considered.
     */
    matches = preferOfficialForm(matches);
    /*
     * ONE DOCUMENT AT TWO PATHS IS ONE IDENTITY.
     *
     * The index carries more than one custody, and the same official binary
     * legitimately sits in two: Alaska's TF-810 at REV-2025-05 is in the Master
     * Library and in a D source pack at the identical SHA-256. Requiring a
     * single entry read that as an ambiguity and refused a form the family was
     * already built from. Identical hashes are one identity and the lexically
     * first path is the deterministic pick; differing bytes under one form
     * number stay a genuine ambiguity and still refuse, which is the case this
     * must not decide. Same rule as the factory's own source binder.
     */
    if (matches.length > 1 && new Set(matches.map((m) => m.sha256)).size === 1) {
      matches = [matches.slice().sort((a, b) => a.path.localeCompare(b.path))[0]];
    }
    if (matches.length === 1) {
      sources.push({ sourceId: `official-form:${formNumber}`, path: matches[0].path, sha256: matches[0].sha256 });
    } else {
      unresolvable.push({
        sourceId: `official-form:${formNumber}`,
        indexMatches: matches.length,
        why: matches.length === 0
          ? "no entry in the committed corpus index carries this exact form number"
          : "more than one index entry carries this exact form number, so the identity is ambiguous"
      });
    }
  }
  return { tier: "census_form_number_against_committed_index", from: WORKLIST, custodyClass: null, commissionAcquisition: null, sources, unresolvable };
}

/** Every repository marker present, as a list of the ones that are not. */
function missingMarkers(env = ROOT) {
  return REPOSITORY_MARKERS.filter((m) => !fs.existsSync(path.join(env, m)));
}

/**
 * The assignment this cloud task is executing, resolved from the tree.
 *
 * Named explicitly with --assignment, or found by searching the launch-control
 * manifests for the one whose items include the family. Two matches is a refusal
 * rather than a guess: a worker told to build a family that two lanes claim has
 * a dispatch problem, not a preflight problem.
 */
function resolveAssignment(env = ROOT, family = FAMILY, explicit = ASSIGNMENT_FILE) {
  if (explicit) {
    const doc = readJson(explicit, env);
    return doc ? { file: explicit, found: true, assignments: [], doc } : { file: explicit, found: false, assignments: [] };
  }
  if (!family) return { file: null, found: false, assignments: [], why: "no --family and no --assignment" };
  /*
   * ASSIGNMENT_MANIFESTS is ordered by precedence, most current first, and the
   * search stops at the first manifest that names the family.
   *
   * Two claims are a COLLISION only when they are the same KIND of work. A
   * family a repair lane builds and a verification shard verifies is claimed
   * twice on purpose -- that is the whole design -- and reading any second claim
   * as a collision refused all four R8 families at 13/14 for a dispatch that was
   * correct. The lane's own `lane` field decides the kind; an assignment that
   * does not state one is treated as its own kind rather than merged with
   * another lane's.
   */
  for (const rel of ASSIGNMENT_MANIFESTS) {
    const doc = readJson(rel, env);
    if (!doc) continue;
    const lists = [doc.assignments, doc.independentVerification?.assignments].filter(Array.isArray);
    const here = [];
    for (const list of lists) {
      for (const a of list) {
        if (!Array.isArray(a.items) || !a.items.includes(family)) continue;
        here.push({
          file: rel, assignmentId: a.assignmentId ?? null, promptFile: a.promptFile ?? null,
          base: a.captainBaseSha ?? a.minimumCaptainSha ?? null,
          lane: a.lane ?? a.assignmentId ?? "unstated"
        });
      }
    }
    if (here.length === 0) continue;
    const kinds = new Map();
    for (const a of here) kinds.set(a.lane, [...(kinds.get(a.lane) ?? []), a.assignmentId]);
    const collidingKinds = [...kinds.entries()].filter(([, ids]) => ids.length > 1);
    /* The one this worker is executing: prefer a build or repair lane over a
     * verification lane, because a preflight is run before doing the work. */
    const doing = here.find((a) => a.lane !== "independent-verification") ?? here[0];
    return {
      file: rel, found: collidingKinds.length === 0, assignments: here, executing: doing,
      collidingKinds: collidingKinds.map(([lane, ids]) => ({ lane, assignments: ids })),
      precedence: ASSIGNMENT_MANIFESTS.indexOf(rel)
    };
  }
  return { file: null, found: false, assignments: [] };
}

// ==============================================================================
// 1. Repository identity
// ==============================================================================
check(
  "repo_identity",
  "The checkout is the packet repository, at a commit, on a named branch",
  "A worker that builds in the wrong clone pushes work nobody reads.",
  (env) => {
    const remote = shSafe("git", ["remote", "get-url", "origin"], { cwd: env });
    const head = shSafe("git", ["rev-parse", "HEAD"], { cwd: env });
    const branch = shSafe("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: env });
    const ok = Boolean(remote?.includes("legalease-partner-dashboard-clean") && head && branch && branch !== "HEAD");
    return { ok, remote, head, branch, detail: ok ? `${branch} at ${head?.slice(0, 8)}` : "origin is not the packet repository, or HEAD is detached" };
  },
  null,
  {
    id: "repo_identity_by_committed_markers",
    title: "The checkout carries this repository's committed markers, at a commit, on a named branch",
    because: "Codex Cloud removes origin before the agent starts, so a remote URL cannot answer which repository this is. Four committed paths can: the agent contract, the package manifest, this file, and the corpus index every source check reads. A scratch clone of something else carries none of them.",
    run: (env) => {
      const missing = missingMarkers(env);
      const head = shSafe("git", ["rev-parse", "HEAD"], { cwd: env });
      const branch = shSafe("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: env });
      const ok = missing.length === 0 && Boolean(head) && Boolean(branch) && branch !== "HEAD";
      return {
        ok, head, branch, markers: REPOSITORY_MARKERS.length, missingMarkers: missing,
        originRequired: false,
        detail: ok
          ? `${REPOSITORY_MARKERS.length}/${REPOSITORY_MARKERS.length} markers present; ${branch} at ${head.slice(0, 8)}`
          : missing.length
            ? `${missing.length} repository marker(s) absent: ${missing.join(", ")}`
            : "HEAD is detached or unresolvable"
      };
    }
  }
);

// ==============================================================================
// 2. The clone is complete
// ==============================================================================
check(
  "clone_is_complete",
  "The clone is not shallow and not single-branch",
  "A shallow single-branch clone cannot see the branch it is meant to resume, so a resumed worker silently rebuilds from scratch and loses the committed research on its own tip.",
  (env) => {
    const shallow = shSafe("git", ["rev-parse", "--is-shallow-repository"], { cwd: env });
    const refspecs = (shSafe("git", ["config", "--get-all", "remote.origin.fetch"], { cwd: env }) || "").split("\n").filter(Boolean);
    const fetchesAllHeads = refspecs.some((r) => r.includes("refs/heads/*:refs/remotes/origin/*"));
    const ok = shallow === "false" && fetchesAllHeads;
    return {
      ok, shallow, refspecs, fetchesAllHeads,
      detail: ok ? "full clone, all heads fetchable"
        : shallow !== "false" ? "the clone is shallow"
        : "remote.origin.fetch does not fetch all heads"
    };
  },
  null,
  {
    id: "cloud_checkout_contains_captain_base",
    title: "This shallow checkout contains the exact Captain commit the assignment was cut from",
    because: "A shallow checkout is not a defect in Codex Cloud, it is the design. What matters is not whether the clone has everything, but whether it has the ONE commit the assignment was dispatched against -- a worker building on a tree that predates the contract fix produces a packet against a contract nobody is holding any more. The SHA must be supplied: a preflight that guesses which commit was meant proves nothing.",
    run: (env, opts = {}) => {
      const min = Object.hasOwn(opts, "minimumCaptainSha") ? opts.minimumCaptainSha : MINIMUM_CAPTAIN_SHA;
      if (!min) {
        return { ok: false, minimumCaptainSha: null, detail: "--codex-cloud requires --minimum-captain-sha; without it there is nothing to prove this checkout contains" };
      }
      if (!/^[0-9a-f]{7,40}$/.test(min)) {
        return { ok: false, minimumCaptainSha: min, detail: `--minimum-captain-sha ${min} is not a commit-shaped hex sha` };
      }
      const exists = shSafe("git", ["cat-file", "-e", `${min}^{commit}`], { cwd: env }) !== null;
      if (!exists) {
        return { ok: false, minimumCaptainSha: min, present: false, detail: `${min.slice(0, 8)} is not an object in this checkout; the shallow window does not reach it` };
      }
      const ancestor = shSafe("git", ["merge-base", "--is-ancestor", min, "HEAD"], { cwd: env }) !== null;
      const head = shSafe("git", ["rev-parse", "HEAD"], { cwd: env });
      return {
        ok: ancestor, minimumCaptainSha: min, present: true, ancestorOfHead: ancestor, head,
        detail: ancestor
          ? `${min.slice(0, 8)} is present and an ancestor of HEAD ${head?.slice(0, 8)}`
          : `${min.slice(0, 8)} is present but NOT an ancestor of HEAD ${head?.slice(0, 8)}; this checkout is not descended from the dispatch`
      };
    }
  }
);

// ==============================================================================
// 3. The assigned branch's own pushed tip is visible
// ==============================================================================
check(
  "assigned_branch_tip_visible",
  "The assigned branch and its pushed tip are visible locally",
  "Five returns are branches to RESUME, not to rebuild. A container that cannot resolve origin/<branch> will start over and throw away committed source and local-variation research.",
  (env) => {
    if (!BRANCH) return { ok: true, skipped: true, detail: "no --branch given; check not applicable" };
    const tip = shSafe("git", ["rev-parse", `origin/${BRANCH}`], { cwd: env });
    const assignments = readJson("data/rcap-grade-a/route-obligation-census-v1/worker-assignments.json", env);
    const recorded = assignments?.assignments?.find((a) => a.branch === BRANCH)?.pushedTip ?? null;
    const ok = Boolean(tip) && (!recorded || tip === recorded);
    return {
      ok, branch: BRANCH, resolvedTip: tip, recordedTip: recorded,
      detail: !tip ? `origin/${BRANCH} does not resolve in this clone`
        : recorded && tip !== recorded ? `origin/${BRANCH} is ${tip.slice(0, 8)} but the Captain recorded ${recorded.slice(0, 8)}`
        : `origin/${BRANCH} at ${tip.slice(0, 8)}`
    };
  },
  null,
  {
    id: "assignment_present_in_this_checkout",
    title: "The assignment and its prompt are in this checkout, and this checkout descends from the commit the assignment names",
    because: "In Codespaces a worker resumed a pushed branch, so origin/<branch> was the thing to resolve. In Codex Cloud there is no origin and nothing to resume: the task starts from the selected Captain checkout and returns a diff. The equivalent question is whether the assignment this worker is executing is actually in the tree it was handed, and whether that tree descends from the commit the assignment was cut from.",
    run: (env, opts = {}) => {
      const family = Object.hasOwn(opts, "family") ? opts.family : FAMILY;
      const explicit = Object.hasOwn(opts, "assignmentFile") ? opts.assignmentFile : ASSIGNMENT_FILE;
      const resolved = resolveAssignment(env, family, explicit);
      if ((resolved.collidingKinds ?? []).length > 0) {
        const c = resolved.collidingKinds[0];
        return { ok: false, family, collidingKinds: resolved.collidingKinds, detail: `${family} is claimed by ${c.assignments.length} ${c.lane} assignments (${c.assignments.join(", ")}); two lanes of one kind on one family is a dispatch collision, not a preflight decision` };
      }
      if (!resolved.file) {
        return { ok: false, family, detail: `no assignment in this checkout names ${family ?? "this task"}; pass --assignment or dispatch the family first` };
      }
      if (!fs.existsSync(path.join(env, resolved.file))) {
        return { ok: false, assignmentFile: resolved.file, detail: `${resolved.file} is not in this checkout` };
      }
      const match = resolved.executing ?? resolved.assignments[0] ?? null;
      const prompt = (Object.hasOwn(opts, "promptFile") ? opts.promptFile : PROMPT_FILE) ?? match?.promptFile ?? null;
      const promptPresent = prompt ? fs.existsSync(path.join(env, prompt)) : null;
      if (prompt && !promptPresent) {
        return { ok: false, assignmentFile: resolved.file, promptFile: prompt, detail: `the assignment names ${prompt} and it is not in this checkout` };
      }
      // The commit the assignment was cut from must be behind HEAD. This is the
      // same fact the checkout check establishes, asked from the assignment's
      // side: there the SHA is what the operator supplied, here it is what the
      // record says, and a disagreement between them is the finding.
      const base = match?.base ?? null;
      const descends = base ? shSafe("git", ["merge-base", "--is-ancestor", base, "HEAD"], { cwd: env }) !== null : null;
      if (base && !descends) {
        return { ok: false, assignmentFile: resolved.file, assignmentId: match?.assignmentId ?? null, assignmentBase: base, detail: `the assignment was cut from ${base.slice(0, 8)}, which is not an ancestor of this HEAD` };
      }
      return {
        ok: true, assignmentFile: resolved.file, assignmentId: match?.assignmentId ?? null,
        promptFile: prompt, promptPresent, assignmentBase: base, headDescendsFromAssignmentBase: descends,
        alsoClaimedBy: resolved.assignments.filter((x) => x.assignmentId !== match?.assignmentId).map((x) => `${x.assignmentId} (${x.lane})`),
        detail: `${match?.assignmentId ?? path.basename(resolved.file)} present${prompt ? ` with ${path.basename(prompt)}` : ""}${base ? `, cut from ${base.slice(0, 8)}` : ""}${resolved.assignments.length > 1 ? `; also held by ${resolved.assignments.length - 1} lane(s) of another kind` : ""}`
      };
    }
  }
);

// ==============================================================================
// 4. The worktree is clean
// ==============================================================================
check(
  "worktree_clean",
  "The worktree carries no uncommitted change",
  "A verifier batch launched on a dirty tree has already produced two false regression diagnoses in this sprint. A build that starts dirty cannot attribute its own output.",
  (env) => {
    const status = shSafe("git", ["status", "--porcelain"], { cwd: env });
    const ok = status === "";
    return { ok, dirtyPaths: status ? status.split("\n") : [], detail: ok ? "clean" : `${status.split("\n").length} uncommitted path(s)` };
  }
);

// ==============================================================================
// 5. The toolchain can run the factory
// ==============================================================================
check(
  "node_toolchain",
  "Node is present at a version the factory runs on",
  "The factory is ESM and uses node:crypto, node:fs promises and structuredClone.",
  () => {
    const major = Number(process.versions.node.split(".")[0]);
    const ok = major >= 18;
    return { ok, node: process.versions.node, detail: ok ? `node ${process.versions.node}` : `node ${process.versions.node} is below 18` };
  }
);

// ==============================================================================
// 6. pdf-lib is importable
// ==============================================================================
check(
  "pdf_lib_importable",
  "node_modules is installed and pdf-lib imports",
  "ak-courtview-set named this explicitly: node_modules was absent in its container, so scripts/rcap-all50-overlay-factory-lib.mjs could not import pdf-lib. Without it nothing can be filled, measured or rastered.",
  (env) => {
    const modules = path.join(env, "node_modules");
    if (!fs.existsSync(modules)) return { ok: false, nodeModules: false, detail: "node_modules is absent; run npm ci" };
    const pkg = path.join(modules, "pdf-lib", "package.json");
    if (!fs.existsSync(pkg)) return { ok: false, nodeModules: true, pdfLib: false, detail: "node_modules is present but pdf-lib is not installed" };
    let version = null;
    try { version = JSON.parse(fs.readFileSync(pkg, "utf8")).version; } catch { /* reported below */ }
    return { ok: Boolean(version), nodeModules: true, pdfLib: true, version, detail: version ? `pdf-lib ${version}` : "pdf-lib package.json is unreadable" };
  }
);

check(
  "browser_environment_exported",
  "the governed browser cache and exact executable are exported",
  "A browser found only by accident in one shell is not a worker runtime. Setup must persist both values and every worker must source them before preflight. Like its sibling below, this is NOT APPLICABLE unless the caller says it is about to render: the central raster split moved the render off the builders, and a builder that opens no PDF needs no browser exported. Requiring it here was the other half of the same contradiction -- page_rasterizer_available became opt-in while the check demanding that exact executable be exported and persisted stayed mandatory, so every PF, FIX, DISC, SRC, ACQ and PROMO lane still failed preflight for a browser it never opens. A skipped check is never counted as a pass, and PASS_COMPLETE still requires a hash-bound RASTER_PASS, so this cannot inflate a verdict.",
  (env) => {
    /*
     * --require-rasterizer is how a caller says a browser is about to be used.
     * Only the central raster workflow passes it, and there this check runs in
     * full: a runner that is about to render must have the governed cache and
     * the exact executable exported and persisted, or the receipt would name a
     * browser nobody can identify again.
     */
    if (!REQUIRE_RASTERIZER) {
      return {
        ok: true, skipped: true,
        detail: "not applicable: this invocation renders nothing, so it needs no browser exported. Rendering is central (.github/workflows/rcap-packet-raster-acceptance-batch.yml); pass --require-rasterizer where a browser is actually about to be used."
      };
    }
    const required = ["PLAYWRIGHT_BROWSERS_PATH", "RCAP_CHROMIUM_PATH"];
    const missing = required.filter((name) => !process.env[name]);
    const executable = process.env.RCAP_CHROMIUM_PATH;
    const executableOk = Boolean(executable && (() => {
      try { return fs.statSync(executable).isFile() && (fs.accessSync(executable, fs.constants.X_OK), true); }
      catch { return false; }
    })());
    const envFiles = [path.join(env, CORPUS_ENV_REPO), path.join(os.homedir(), CORPUS_ENV_HOME)];
    const unpersisted = envFiles.flatMap((file) => {
      if (!fs.existsSync(file)) return [`${file} is missing`];
      const text = fs.readFileSync(file, "utf8");
      return required.filter((name) => !new RegExp(`^export ${name}=`, "m").test(text)).map((name) => `${name} missing from ${file}`);
    });
    const ok = missing.length === 0 && executableOk && unpersisted.length === 0;
    return {
      ok, missing, unpersisted, executable, browserCache: process.env.PLAYWRIGHT_BROWSERS_PATH,
      detail: ok ? `browser environment persisted; executable ${executable}`
        : [...missing.map((name) => `${name} is not exported`), ...unpersisted, ...(executable && !executableOk ? [`${executable} is missing or non-executable`] : [])].join("; ")
    };
  }
);

// ==============================================================================
// 6a2. the rasterizer the BUILD HOSTS actually use
// ==============================================================================
check(
  "build_time_rasterizer_available",
  "the Poppler rasterizer the build hosts call can start and identify itself",
  "The preflight probed Chromium and the build hosts do not use it. Both call popplerRasterIdentity()/rasterizeWithPoppler() and neither imports the browser rasterizer -- 25 Poppler references in the west host and 13 in the east, against zero imports of scripts/raster/pdf-page-raster.mjs. So --require-rasterizer reported a working rasterizer while the one the build was about to use was absent, and FIX-A read READY, built, and died on 'spawnSync pdftoppm ENOENT' at popplerRasterIdentity with the family's output directory ALREADY CLEARED. That is the one dependency this preflight appeared to cover while covering something else, and the lane contract's promise that a lane which cannot raster learns before it builds rather than after did not hold for this host pair. This check probes the same executable, by the same environment variable, with the same -v call the hosts make.",
  () => {
    /*
     * Gated exactly like its sibling: a lane that renders nothing needs no
     * rasterizer of either kind. DISC, SRC, ACQ and PROMO never open a PDF.
     */
    if (!REQUIRE_RASTERIZER) {
      return {
        ok: true, skipped: true,
        detail: "not applicable: this invocation renders nothing. Pass --require-rasterizer where a build is actually about to raster."
      };
    }
    const exe = process.env.RCAP_PDFTOPPM ?? "pdftoppm";
    if (path.isAbsolute(exe) && !fs.existsSync(exe)) {
      return { ok: false, executable: exe, detail: `RCAP_PDFTOPPM points at ${exe}, which does not exist` };
    }
    const probe = spawnSync(exe, ["-v"], { encoding: "utf8", timeout: 15000 });
    if (probe.error?.code === "ENOENT") {
      return {
        ok: false, executable: exe,
        detail: `${exe} is not on PATH. The build hosts raster with Poppler, so a build will die at popplerRasterIdentity AFTER clearing the family output directory. Never apt-get it from a lane; the builder image must carry it.`
      };
    }
    if (probe.status !== 0) {
      return { ok: false, executable: exe, detail: `${exe} -v exited ${probe.status}: ${(probe.stderr || probe.stdout || "").trim().split("\n")[0]}` };
    }
    // The hosts do not accept a binary that runs but will not name itself, and
    // neither does this: they parse the version out of -v and assert on it.
    const output = `${probe.stderr ?? ""}\n${probe.stdout ?? ""}`;
    const match = /\bpdftoppm version\s+([^\s]+)/i.exec(output);
    if (!match) {
      return { ok: false, executable: exe, detail: `${exe} ran but did not identify itself as pdftoppm, which is what popplerRasterIdentity asserts on` };
    }
    return { ok: true, executable: exe, version: match[1], detail: `pdftoppm ${match[1]} — the rasterizer the build hosts actually call` };
  }
);

// ==============================================================================
// 6b. the page rasterizer can actually start
// ==============================================================================
check(
  "page_rasterizer_available",
  "the calibrated Chromium page rasterizer renders a page (only where a lane actually renders)",
  "Four lanes returned STOPPED after passing this preflight at 14/14: PF09 and PF15 on 'pdftoppm ENOENT', PF11 and PF12 on 'Playwright cannot find Chromium'. The first fix made this check launch a browser and render a page -- right about what to ask, wrong about where. ENV-RAS01 then established that Codex cannot obtain a browser at all, because the Playwright CDN answers HTTP 403 from inside it, so requiring one here made every lane in that environment unrunnable: DISC, SRC, ACQ and PROMO settle identity, fetch bytes and write custody records, and not one of them opens a PDF. Rendering moved to a runner that has a browser. This check is NOT APPLICABLE unless the caller says it is about to render, which only the central raster workflow does. A skipped check is never counted as a pass, so this cannot inflate a verdict.",
  (env) => {
    /*
     * --require-rasterizer is how the central raster workflow says a browser is
     * about to be used. Nothing else passes it, and nothing else should: a PF
     * or FIX lane finishes nonvisual construction and returns
     * BUILT_RASTER_PENDING, and PASS_COMPLETE still requires a hash-bound
     * RASTER_PASS from that workflow. The gate moved; it did not soften.
     */
    if (!REQUIRE_RASTERIZER) {
      return {
        ok: true, skipped: true,
        detail: "not applicable: this invocation renders nothing. Rendering is central (.github/workflows/rcap-packet-raster-acceptance-batch.yml); pass --require-rasterizer where a browser is actually about to be used."
      };
    }
    const lib = path.join(env, "scripts/raster/pdf-page-raster.mjs");
    if (!fs.existsSync(lib)) return { ok: false, detail: "scripts/raster/pdf-page-raster.mjs is absent" };
    /*
     * This launches the browser and rasterizes a one-page PDF. It used to call
     * resolveChromium() and pass if a path came back -- and resolveChromium only
     * asks fs.accessSync(X_OK). C13 built two environments where that printed ok
     * and the render then failed: a browsers path holding only
     * chromium_headless_shell, which has no PDF viewer, and RCAP_CHROMIUM_PATH
     * pointed at a directory, which is executable and is not a program.
     * Executability is not renderability. Rastering is a required build step, so
     * the preflight renders.
     */
    const probe = spawnSync(process.execPath, ["--input-type=module", "-e",
      `import { probeRasterizer } from ${JSON.stringify(pathToFileURL(lib).href)};`
      + "probeRasterizer().then((r) => process.stdout.write(JSON.stringify(r)));"
    ], { cwd: env, encoding: "utf8", timeout: 120000 });
    if (probe.status !== 0) {
      return { ok: false, detail: `the rasterizer could not be loaded: ${(probe.stderr || probe.stdout || "").trim().split("\n").slice(-1)[0]}` };
    }
    let resolved = null;
    try { resolved = JSON.parse(probe.stdout); } catch { return { ok: false, detail: "the rasterizer returned no resolution" }; }
    if (!resolved.ok) {
      return {
        ok: false, candidatesTried: resolved.tried ?? [], executablePath: resolved.executablePath ?? null,
        detail: `${resolved.why ?? "the rasterizer could not render"}. Tried: ${(resolved.tried ?? [resolved.executablePath]).filter(Boolean).join(", ") || "(nothing — PLAYWRIGHT_BROWSERS_PATH is unset)"}. Set RCAP_CHROMIUM_PATH to a Chromium BINARY; never substitute pdftoppm and never install packages.`
      };
    }
    return {
      ok: true, executablePath: resolved.executablePath, resolvedBy: resolved.resolvedBy, paper: resolved.paper,
      detail: `chromium at ${resolved.executablePath} (${resolved.resolvedBy}) rendered a page: paper ${resolved.paper.width}x${resolved.paper.height}px`
    };
  }
);

// ==============================================================================
// 7. private/ is git-ignored
// ==============================================================================
check(
  "private_is_git_ignored",
  "private/ is git-ignored, so source bytes cannot be committed",
  "The bootstrap refuses to extract into a tracked tree, and it is right to. Source binaries must never enter a commit.",
  (env) => {
    let ignored = false;
    try { execFileSync("git", ["check-ignore", "-q", "private/"], { cwd: env, stdio: "ignore" }); ignored = true; } catch { ignored = false; }
    const tracked = (shSafe("git", ["ls-files", "private/"], { cwd: env }) || "").split("\n").filter(Boolean);
    const ok = ignored && tracked.length === 0;
    return { ok, ignored, trackedBeneathPrivate: tracked.length, detail: ok ? "private/ is ignored and tracks nothing" : ignored ? `${tracked.length} tracked path(s) beneath private/` : "private/ is NOT git-ignored" };
  }
);

// ==============================================================================
// 8. The Master Library is mounted
// ==============================================================================
check(
  "master_library_mounted",
  "The Master Library corpus root exists and is a directory",
  "This is the check the whole first wave failed. Five workers found no root and stopped. An absent root is a positive finding of absence, not an empty corpus.",
  (env, opts = {}) => {
    const root = masterLibraryRoot(env);
    const exists = fs.existsSync(root) && fs.statSync(root).isDirectory();
    const cloud = Object.hasOwn(opts, "cloud") ? opts.cloud : CLOUD;
    if (!cloud) {
      return {
        ok: exists, root: path.relative(env, root) || root, exists,
        detail: exists ? `mounted at ${path.relative(env, root)}` : `absent at ${path.relative(env, root) || root} — run: bash ${BOOTSTRAP}`
      };
    }
    /*
     * In cloud mode the mount is not the whole gate. Setup writes a corpus
     * environment file and the execution contract has every worker source it;
     * without it a worker that changes directory loses the mount and rediscovers
     * the first wave's failure with the bytes sitting right there. The file is a
     * required part of the environment, so its absence is a refusal.
     */
    const home = Object.hasOwn(opts, "home") ? opts.home : os.homedir();
    const repoEnv = path.join(env, CORPUS_ENV_REPO);
    const homeEnv = path.join(home, CORPUS_ENV_HOME);
    const repoEnvPresent = fs.existsSync(repoEnv);
    const homeEnvPresent = fs.existsSync(homeEnv);
    const envPresent = repoEnvPresent || homeEnvPresent;
    const ok = exists && envPresent;
    return {
      ok, root: path.relative(env, root) || root, exists,
      corpusEnvironmentFile: { [CORPUS_ENV_REPO]: repoEnvPresent, [`~/${CORPUS_ENV_HOME}`]: homeEnvPresent },
      detail: ok ? `mounted at ${path.relative(env, root)}; corpus environment file present`
        : !exists ? `absent at ${path.relative(env, root) || root} — run: bash scripts/codex-cloud/setup-packet-factory.sh`
        : `mounted, but neither ${CORPUS_ENV_REPO} nor ~/${CORPUS_ENV_HOME} exists — run: bash scripts/codex-cloud/setup-packet-factory.sh`
    };
  }
);

// ==============================================================================
// 9. The mounted corpus is complete
// ==============================================================================
check(
  "master_library_complete",
  "The mounted corpus carries at least the declared file, PDF and jurisdiction counts",
  "A short extract is worse than no extract: every field map keyed to a missing binary would report a form with no source. This gate enforces immutable minimums while allowing governed recovery files to extend the corpus.",
  (env) => {
    const root = masterLibraryRoot(env);
    const files = filesUnder(root);
    if (files === null) return { ok: false, walkable: false, detail: "the corpus root cannot be walked (absent is not empty)" };
    const pdfs = files.filter((f) => f.toLowerCase().endsWith(".pdf"));
    const jurisdictions = new Set(files.map((f) => f.match(/^STATES\/([A-Z]{2})\//)?.[1]).filter(Boolean));
    const ok = files.length >= EXPECT_FILES && pdfs.length >= EXPECT_PDFS && jurisdictions.size >= EXPECT_JURISDICTIONS - 6;
    return {
      ok, walkable: true, files: files.length, pdfs: pdfs.length, jurisdictions: jurisdictions.size,
      expected: { files: EXPECT_FILES, pdfs: EXPECT_PDFS },
      detail: ok ? `${files.length} files, ${pdfs.length} PDFs, ${jurisdictions.size} jurisdictions`
        : `below immutable minimum: ${files.length}/${EXPECT_FILES} files, ${pdfs.length}/${EXPECT_PDFS} PDFs`
    };
  }
);

// ==============================================================================
// 10. The mounted corpus is the corpus the committed index describes
// ==============================================================================
check(
  "corpus_matches_committed_index",
  "A sample of the committed index verifies byte-exact against the mounted corpus",
  "A corpus that looks recovered and is not is worse than no corpus. The index is the committed record of what the corpus contained; if the bytes disagree, every measurement keyed to them describes a document that no longer exists.",
  (env) => {
    const root = masterLibraryRoot(env);
    const index = readJson(CORPUS_INDEX, env);
    if (!index?.entries?.length) return { ok: false, detail: `${CORPUS_INDEX} is missing or carries no entries` };
    if (filesUnder(root) === null) return { ok: false, detail: "the corpus root cannot be walked; nothing to compare the index against" };

    /*
     * The index carries more than one custody, and each writes its paths in its
     * own namespace. Joining every entry onto the Master Library root would
     * look for a human source return inside the library and report it absent —
     * a corruption report about a file that is exactly where it belongs. The
     * resolver follows what the index declares instead.
     *
     * A custody this container does not mount is a different answer again, and
     * it is not a failure: the Master Library is the only corpus the pinned
     * release carries, so a cloud worker legitimately holds no others. Those
     * entries are excluded from the sample and named, so the check still says
     * what it did and did not compare.
     */
    const corpusPaths = makeCorpusEntryResolver(index, { repoRoot: env, masterLibraryRoot: root });
    const comparable = index.entries.filter((e) => corpusPaths.isMounted(e));
    const notMounted = corpusPaths.unmountedCustodies(index.entries);
    if (!comparable.length) return { ok: false, detail: "no custody named by the committed index is mounted here" };

    // A deterministic spread across states rather than the first N, so a corpus
    // recovered correctly for AK and truncated at TX is still caught.
    const sorted = [...comparable].sort((a, b) => a.path.localeCompare(b.path));
    const step = Math.max(1, Math.floor(sorted.length / 24));
    const sample = sorted.filter((_, i) => i % step === 0).slice(0, 24);
    const mismatched = [];
    const absent = [];
    for (const entry of sample) {
      const p = corpusPaths.resolve(entry);
      if (!fs.existsSync(p)) { absent.push(entry.path); continue; }
      if (sha256(p) !== entry.sha256) mismatched.push(entry.path);
    }
    const ok = absent.length === 0 && mismatched.length === 0;
    return {
      ok, sampled: sample.length, absent: absent.length, mismatched: mismatched.length,
      absentPaths: absent.slice(0, 5), mismatchedPaths: mismatched.slice(0, 5),
      custodiesNotMountedHere: notMounted,
      detail: ok
        ? `${sample.length} sampled entries verify byte-exact${notMounted.length ? `; ${notMounted.join(", ")} not mounted here and not compared` : ""}`
        : `${absent.length} absent, ${mismatched.length} mismatched of ${sample.length} sampled`
    };
  }
);

// ==============================================================================
// 11. This family's own pinned sources bind
// ==============================================================================
check(
  "family_sources_bind",
  "Every source this family names is present and hashes to its pinned digest",
  "Family-level is the level that matters. A corpus can be complete in aggregate and still not carry the two binaries this worker was dispatched to measure.",
  (env) => {
    if (!FAMILY) return { ok: true, skipped: true, detail: "no --family given; check not applicable" };
    const resolved = familySources(FAMILY, env);
    if (!resolved) return { ok: false, family: FAMILY, detail: `${FAMILY} is not resolvable from ${CUSTODY} or ${WORKLIST}; the Captain must resolve its sources before dispatch` };
    if (resolved.unresolvable.length) {
      return {
        ok: false, family: FAMILY, tier: resolved.tier, unresolvable: resolved.unresolvable,
        detail: `${resolved.unresolvable.length} source(s) do not resolve to exactly one committed index entry: ${resolved.unresolvable.map((u) => u.sourceId).join(", ")}`
      };
    }
    if (resolved.sources.length === 0) {
      /* The wording below is only true of a fill family. A custom pleading (or
       * participant agency application) composed from settled codified
       * authority binds zero document bytes by design -- MASTER_QUEUE records
       * it as CUSTOM_PLEADING_FROM_CODIFIED_TEXT -- and refusing it here
       * blocked five ready DC families with an official_pdf_fill message.
       * Same rule as factory check F13: zero sources is the correct count for
       * that strategy, not a missing binding. */
      const queue = readJson("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json", env);
      const queueRow = queue?.families?.find((f) => f.familyId === FAMILY || f.worklistGroupId === FAMILY);
      if (queueRow?.sourceStatus === "CUSTOM_PLEADING_FROM_CODIFIED_TEXT") {
        return {
          ok: true, family: FAMILY, custodyClass: resolved.custodyClass, sources: 0,
          detail: `${FAMILY} is a zero-source composition (CUSTOM_PLEADING_FROM_CODIFIED_TEXT): it binds committed legal records by hash inside its builder, not document bytes here`
        };
      }
      return {
        ok: false, family: FAMILY, custodyClass: resolved.custodyClass, sources: 0,
        detail: `${FAMILY} names no resolved document source. An official_pdf_fill family with no bound source is not dispatchable.`
      };
    }
    /*
     * A source's path is only Master-Library-relative when the Master Library
     * is the custody that holds it. The corpus index carries more than one now,
     * and every custody but the library writes REPOSITORY-relative paths — so
     * joining the library root onto a D-source-pack path produced a file that
     * does not exist and reported 9 of 9 sources not binding for three Utah
     * families whose bytes were sitting right there, byte-exact.
     *
     * The index declares how its own paths are shaped, and
     * scripts/lib/corpus-index-paths.mjs resolves an entry through that
     * declaration. This check is the fourth reader to need it; the other three
     * were wired up when the second custody landed and this one was missed.
     */
    const root = masterLibraryRoot(env);
    const corpusIndex = readJson(CORPUS_INDEX, env);
    const corpusPaths = makeCorpusEntryResolver(corpusIndex, { repoRoot: env, masterLibraryRoot: root });
    const entryByPath = new Map((corpusIndex?.entries ?? []).map((e) => [e.path, e]));
    /*
     * And a path is only findable when the custody that holds it is MOUNTED.
     * Only two of the five custodies the index names are mounted in a worker
     * container, so a source whose declared path points into d_source_packs or
     * the recovery pool reads as absent even when the identical bytes sit in
     * the Master Library under a different path. VF-G measured it: three
     * Louisiana sources reported "3 of 3 do not bind" for two families while
     * every digest resolved byte-exact, byteLength included. A build lane that
     * trusts this check stops on a family whose sources are all held.
     *
     * So a declared path that does not produce the pinned bytes falls back to
     * the digest itself, looked up across every mounted custody the index
     * names. This cannot weaken the check: the pin is the same SHA-256 either
     * way, bytes that are nowhere still fail, and a file that is present at
     * the declared path but hashes to something else still fails at that path
     * before the fallback is consulted. What changes is that "held somewhere
     * mounted" stops being reported as "not held", and the resolution is named
     * so a source sitting in the wrong custody is visible rather than silent.
     */
    let byDigest = null;
    const digestIndex = () => {
      if (byDigest) return byDigest;
      byDigest = new Map();
      for (const entry of corpusIndex?.entries ?? []) {
        const digest = String(entry?.sha256 ?? "");
        if (!/^[0-9a-f]{64}$/.test(digest) || byDigest.has(digest)) continue;
        const p = corpusPaths.resolve(entry);
        if (p && fs.existsSync(p)) byDigest.set(digest, { path: p, custody: entry.custody ?? null, declaredPath: entry.path ?? null });
      }
      return byDigest;
    };

    const results = resolved.sources.map((s) => {
      const entry = entryByPath.get(s.path);
      const p = (entry && corpusPaths.resolve(entry)) ?? path.join(root, s.path);
      if (fs.existsSync(p)) {
        const observed = sha256(p);
        if (observed === s.sha256) return { ...s, present: true, observed, bound: true, resolvedBy: "declared path" };
        return { ...s, present: true, observed, bound: false, resolvedBy: "declared path" };
      }
      const held = digestIndex().get(s.sha256);
      if (!held) return { ...s, present: false, observed: null, bound: false, resolvedBy: null };
      const observed = sha256(held.path);
      return {
        ...s, present: true, observed, bound: observed === s.sha256,
        resolvedBy: "content hash across the mounted custodies",
        heldAt: held.path, heldInCustody: held.custody,
        declaredPathIsUnreachableHere: s.path
      };
    });
    const ok = results.every((r) => r.bound);
    return {
      ok, family: FAMILY, tier: resolved.tier, custodyClass: resolved.custodyClass, commissionAcquisition: resolved.commissionAcquisition,
      sources: results.map((r) => ({
        sourceId: r.sourceId, present: r.present, bound: r.bound, pinned: r.sha256, observed: r.observed,
        resolvedBy: r.resolvedBy ?? null,
        ...(r.heldAt ? { heldAt: r.heldAt, heldInCustody: r.heldInCustody, declaredPathIsUnreachableHere: r.declaredPathIsUnreachableHere } : {})
      })),
      boundByContentHashRatherThanDeclaredPath: results.filter((r) => r.bound && r.resolvedBy !== "declared path").length,
      detail: ok
        ? `${results.length}/${results.length} source(s) bind by exact SHA-256 (${resolved.tier})${results.some((r) => r.resolvedBy !== "declared path") ? `; ${results.filter((r) => r.resolvedBy !== "declared path").length} found by content hash because the declared path is in a custody that is not mounted here` : ""}`
        : `${results.filter((r) => !r.bound).length} of ${results.length} source(s) do not bind`
    };
  }
);

// ==============================================================================
// 12. The Master Library is not standing in for the operational tree
// ==============================================================================
check(
  "master_library_not_at_operational_path",
  "The Master Library is not mounted at, or pointed to by, the operational path",
  "operational-corpus-precondition.mjs refuses a Master Library mounted at the operational path by name, and is right to: the two trees answer different questions. Substituting one for the other would make a retirement mean something nobody intended.",
  (env) => {
    const env_var = process.env.OFFICIAL_FORMS_SOURCE_DIR ?? null;
    const master = masterLibraryRoot(env);
    const operational = env_var ? path.resolve(env_var) : path.join(env, OPERATIONAL_RELATIVE);
    const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
    const collides = fs.existsSync(operational) && fs.existsSync(master) && real(operational) === real(master);
    // A Master Library shape sitting at the operational path is the same substitution
    // by another route, so the shape is read rather than inferred from the path.
    let shapedLikeMasterLibrary = false;
    if (fs.existsSync(operational)) {
      try { shapedLikeMasterLibrary = fs.readdirSync(operational).includes("STATES"); } catch { shapedLikeMasterLibrary = false; }
    }
    const ok = !collides && !shapedLikeMasterLibrary;
    return {
      ok, officialFormsSourceDir: env_var, collides, shapedLikeMasterLibrary,
      detail: ok ? "the operational path does not resolve to the Master Library"
        : collides ? "OFFICIAL_FORMS_SOURCE_DIR / the operational path resolves to the Master Library"
        : "a Master Library-shaped tree is sitting at the operational path"
    };
  },
  // The barren directory has no operational tree at all, so it passes this check
  // trivially. The substitution has to be built to be tested.
  (work) => {
    const env = path.join(work, "master-library-at-operational-path");
    fs.mkdirSync(path.join(env, OPERATIONAL_RELATIVE, "STATES", "AK"), { recursive: true });
    return env;
  }
);

// ==============================================================================
// 13. Absent is not empty
// ==============================================================================
check(
  "absent_is_not_empty",
  "This preflight distinguishes an absent corpus from an empty one",
  "An adjudication once walked an empty file list from a missing directory and read the silence as the condition passing. Twelve assets flipped from held to passing on the strength of a missing directory. A preflight that cannot tell those apart reproduces exactly that.",
  () => {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "packet-preflight-"));
    try {
      const missing = path.join(work, "does-not-exist");
      const empty = path.join(work, "empty");
      fs.mkdirSync(empty);
      const absentWalk = filesUnder(missing);
      const emptyWalk = filesUnder(empty);
      const ok = absentWalk === null && Array.isArray(emptyWalk) && emptyWalk.length === 0;
      return {
        ok, absentReturns: absentWalk === null ? "null" : String(absentWalk?.length),
        emptyReturns: Array.isArray(emptyWalk) ? `[] (${emptyWalk.length})` : String(emptyWalk),
        detail: ok ? "an absent tree returns null; an empty tree returns []" : "absence and emptiness are indistinguishable — the preflight is unsound"
      };
    } finally { fs.rmSync(work, { recursive: true, force: true }); }
  }
);

// ==============================================================================
// 14. The stale-artifact block is loadable and consulted
// ==============================================================================
check(
  "stale_artifact_block_consulted",
  "The stale-artifact block loads, is internally consistent, and no artifact this family owns carries a blocked hash",
  "Blocked hashes cannot satisfy artifact approval, packet-family completion, launch authority or commercial admission. A worker that cannot read the block, or reads a truncated one, could render onto a blocked artifact and call it proven.",
  (env) => {
    const block = readJson(STALE_BLOCK, env);
    if (!block) return { ok: false, detail: `${STALE_BLOCK} is missing or unparseable` };

    // A truncated block is the dangerous failure: it loads, reads as fewer
    // blocked hashes than exist, and silently stops refusing some of them. So
    // the declared counts are checked against the arrays that carry them.
    const hashes = Array.isArray(block.hashes) ? block.hashes : [];
    const families = Array.isArray(block.families) ? block.families : [];
    const consistent = block.blockedHashes === hashes.length && block.uniqueFamilies === families.length;
    if (!consistent) {
      return {
        ok: false, blockedHashes: hashes.length, declaredHashes: block.blockedHashes,
        families: families.length, declaredFamilies: block.uniqueFamilies,
        detail: `the block is internally inconsistent: declares ${block.blockedHashes} hash(es)/${block.uniqueFamilies} family(ies), carries ${hashes.length}/${families.length}`
      };
    }
    if (hashes.length === 0) {
      return { ok: false, detail: "the block carries no hashes; a block that refuses nothing is not a block" };
    }

    const blocked = new Set(hashes);
    let scanned = 0;
    const carryingABlockedHash = [];
    if (FAMILY) {
      // Every PDF the family already owns, hashed against the block. This is the
      // check that stops a resumed worker from inheriting a stale artifact.
      const assignments = readJson("data/rcap-grade-a/route-obligation-census-v1/worker-assignments.json", env);
      const owned = assignments?.assignments?.find((a) => a.worklistGroupId === FAMILY)?.ownedPath;
      const dir = owned ? path.join(env, owned) : null;
      const files = dir ? filesUnder(dir) : null;
      for (const rel of (files ?? []).filter((f) => f.toLowerCase().endsWith(".pdf"))) {
        scanned += 1;
        const digest = sha256(path.join(dir, rel));
        if (blocked.has(digest)) carryingABlockedHash.push({ path: `${owned}/${rel}`, sha256: digest });
      }
      // Also refuse a family whose own production directory the block names.
      const named = families.filter((f) => typeof f.familyDirectory === "string" && fs.existsSync(path.join(env, f.familyDirectory)));
      return {
        ok: carryingABlockedHash.length === 0,
        family: FAMILY, ownedPath: owned ?? null, artifactsScanned: scanned,
        blockedHashes: hashes.length, blockedFamilies: families.length,
        blockedProductionDirectoriesPresent: named.length,
        carryingABlockedHash,
        detail: carryingABlockedHash.length
          ? `${carryingABlockedHash.length} artifact(s) under ${owned} carry a blocked hash; re-render through the bounded per-family entry point before proving anything`
          : `block consistent (${hashes.length} hashes, ${families.length} families); ${scanned} artifact(s) under ${owned ?? "this family"} clear`
      };
    }
    return {
      ok: true, blockedHashes: hashes.length, blockedFamilies: families.length,
      refusedCapabilities: (block.refusedCapabilities ?? []).length,
      detail: `block consistent: ${hashes.length} hashes, ${families.length} families, ${(block.refusedCapabilities ?? []).length} refused capabilities`
    };
  },
  // A block that does not load is the negative case; the barren directory has no
  // data/ at all, which is exactly that.
  null
);

// ==============================================================================
// running
// ==============================================================================
function runAll(env = ROOT, opts = {}) {
  return CHECKS.map((c) => {
    const a = active(c);
    let result;
    try { result = a.run(env, opts); }
    catch (error) { result = { ok: false, threw: true, detail: `check threw: ${error.message}` }; }
    return { id: a.id, title: a.title, because: a.because, ...(a.replaces ? { replaces: a.replaces } : {}), ...result };
  });
}

/**
 * Does each check actually discriminate?
 *
 * Every check is run a second time against a synthetic environment built to fail
 * it. A check that passes there tests nothing, and is reported VACUOUS. This is
 * the same standard the source gates on the returned branches held themselves to.
 */
function prove() {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "packet-preflight-prove-"));
  const results = [];
  try {
    // A directory that is not a clone, has no corpus, no node_modules and no data.
    const barren = path.join(work, "barren");
    fs.mkdirSync(barren);
    const barrenResults = new Map(runAll(barren).map((r) => [r.id, r]));

    for (const raw of CHECKS) {
      const c = active(raw);
      // A check with its own negative builder is run against that environment;
      // the barren directory would pass it for the wrong reason.
      let negative = barrenResults.get(c.id);
      let negativeCase = "barren directory";
      if (c.negative) {
        const env = c.negative(work);
        negativeCase = path.basename(env);
        try { negative = { id: c.id, ...c.run(env) }; }
        catch (error) { negative = { id: c.id, ok: false, threw: true, detail: error.message }; }
      }
      // Checks that are environment-independent by construction, or that were
      // skipped for want of an argument, cannot be falsified this way; they are
      // reported as such rather than silently counted as proved.
      const structural = c.id === "absent_is_not_empty" || c.id === "node_toolchain";
      const skipped = Boolean(negative.skipped);
      const discriminates = structural || skipped ? null : negative.ok === false;
      results.push({
        id: c.id,
        negativeCase,
        negativeCaseOutcome: negative.ok ? "PASSED (did not discriminate)" : "failed as it should",
        verdict: structural ? "STRUCTURAL_NOT_FALSIFIABLE_THIS_WAY" : skipped ? "SKIPPED_NEEDS_ARGUMENT" : discriminates ? "DISCRIMINATES" : "VACUOUS"
      });
    }
  } finally { fs.rmSync(work, { recursive: true, force: true }); }
  return results;
}

/**
 * Does cloud mode refuse the things it must refuse?
 *
 * The barren-directory sweep proves a check fails when NOTHING is there, which
 * is the easy half. These scenarios are the hard half: a checkout that is almost
 * right, failing in exactly one way. Each builds a real git repository, breaks
 * one thing, and requires the named check to refuse it. A scenario that passes
 * is reported, and the run exits nonzero, because a cloud gate that accepts a
 * wrong checkout is worse than no gate -- it launches the worker.
 */
function cloudScenarios() {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "packet-preflight-cloud-"));
  const savedMasterLibrary = process.env.MASTER_LIBRARY_SOURCE_DIR;
  const findings = [];
  const byId = new Map(CHECKS.map((c) => [c.id, active(c)]));
  const run = (id, env, opts) => {
    const c = byId.get(id);
    try { return c.run(env, opts); }
    catch (error) { return { ok: false, threw: true, detail: error.message }; }
  };

  const git = (env, args) => execFileSync("git", args, { cwd: env, stdio: "ignore" });
  const FAKE_BYTES = Buffer.from("%PDF-1.7\n% a synthetic source binary for the preflight self-test\n");
  const FAKE_SHA = crypto.createHash("sha256").update(FAKE_BYTES).digest("hex");

  /* A checkout that passes cloud mode, so each scenario can break exactly one
   * thing about it and know that is what it broke. */
  const makeEnv = (name, opts = {}) => {
    const env = path.join(work, name);
    fs.mkdirSync(path.join(env, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(env, "data/rcap-all50"), { recursive: true });
    fs.mkdirSync(path.join(env, "data/rcap-grade-a/route-obligation-census-candidate"), { recursive: true });
    if (opts.markers !== false) {
      fs.writeFileSync(path.join(env, "AGENTS.md"), "# synthetic\n");
      fs.writeFileSync(path.join(env, "package.json"), JSON.stringify({ name: "synthetic" }));
      fs.writeFileSync(path.join(env, "scripts/verify-packet-build-environment.mjs"), "// synthetic\n");
    }
    fs.writeFileSync(path.join(env, CORPUS_INDEX), JSON.stringify({
      entries: [{ path: "STATES/ZZ/FAKE-1.pdf", formNumber: "FAKE-1", sha256: opts.indexSha ?? FAKE_SHA }]
    }, null, 2));
    fs.writeFileSync(path.join(env, WORKLIST), JSON.stringify({
      packetFamilies: [{ worklistGroupId: "zz-synthetic-set", routes: [{ requiredSourceIds: ["official-form:FAKE-1"] }] }]
    }, null, 2));
    if (opts.corpus !== false) {
      const root = path.join(env, MASTER_LIBRARY_RELATIVE, "STATES", "ZZ");
      fs.mkdirSync(root, { recursive: true });
      fs.writeFileSync(path.join(root, "FAKE-1.pdf"), opts.corpusBytes ?? FAKE_BYTES);
    }
    if (opts.corpusEnv !== false) {
      fs.mkdirSync(path.join(env, "private"), { recursive: true });
      fs.writeFileSync(path.join(env, CORPUS_ENV_REPO), "# synthetic corpus environment\n");
    }
    fs.writeFileSync(path.join(env, ".gitignore"), "private/\nnode_modules/\n");
    git(env, ["init", "-q", "-b", "work"]);
    git(env, ["config", "user.email", "preflight@example.invalid"]);
    git(env, ["config", "user.name", "preflight"]);
    // Explicit paths that exist, never a blanket add: a scenario that removes a
    // marker must not fail at `git add` before the check it is testing runs.
    const toAdd = [".gitignore", "AGENTS.md", "package.json", "scripts", "data"]
      .filter((rel) => fs.existsSync(path.join(env, rel)));
    git(env, ["add", "--", ...toAdd]);
    git(env, ["commit", "-q", "-m", "base"]);
    const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: env, encoding: "utf8" }).trim();
    fs.writeFileSync(path.join(env, "data/second.json"), "{}\n");
    git(env, ["add", "--", "data/second.json"]);
    git(env, ["commit", "-q", "-m", "second"]);
    return { env, base };
  };

  const record = (scenario, mustRefuse, result) => {
    findings.push({
      scenario, check: mustRefuse, refused: result.ok === false,
      detail: result.detail,
      verdict: result.ok === false ? "REFUSED_AS_IT_MUST" : "ACCEPTED — THE GATE DOES NOT HOLD"
    });
  };

  const accept = (scenario, mustAccept, result) => {
    findings.push({
      scenario, check: mustAccept, refused: result.ok === false,
      accepted: result.ok === true,
      detail: result.detail,
      verdict: result.ok === true ? "ACCEPTED_AS_IT_MUST" : "REFUSED — THE GATE REJECTS A VALID CORPUS"
    });
  };

  try {
    delete process.env.MASTER_LIBRARY_SOURCE_DIR;

    const good = makeEnv("cloud-good");
    // The positive control. Every scenario below breaks one thing about THIS
    // checkout, so if this one does not pass the negatives prove nothing.
    const controlChecks = ["repo_identity", "clone_is_complete", "assigned_branch_tip_visible", "master_library_mounted"];
    const control = {
      repo_identity: run("repo_identity", good.env, {}),
      clone_is_complete: run("clone_is_complete", good.env, { minimumCaptainSha: good.base }),
      master_library_mounted: run("master_library_mounted", good.env, { cloud: true, home: good.env })
    };
    findings.push({
      scenario: "CONTROL — an otherwise-correct cloud checkout is accepted",
      check: controlChecks.filter((c) => c !== "assigned_branch_tip_visible").join(", "),
      refused: false,
      accepted: Object.values(control).every((r) => r.ok === true),
      detail: Object.entries(control).map(([k, v]) => `${k}: ${v.ok ? "ok" : `FAILED — ${v.detail}`}`).join(" · "),
      verdict: Object.values(control).every((r) => r.ok === true) ? "ACCEPTED_AS_IT_MUST" : "REFUSED — the negatives below prove nothing"
    });

    record("--minimum-captain-sha is missing", "cloud_checkout_contains_captain_base",
      run("clone_is_complete", good.env, { minimumCaptainSha: null }));

    record("the minimum Captain SHA is not an object in this checkout", "cloud_checkout_contains_captain_base",
      run("clone_is_complete", good.env, { minimumCaptainSha: "0".repeat(40) }));

    record("the minimum Captain SHA is not commit-shaped", "cloud_checkout_contains_captain_base",
      run("clone_is_complete", good.env, { minimumCaptainSha: "not-a-sha" }));

    // A commit that exists in the object database and is not behind HEAD.
    const sibling = makeEnv("cloud-sibling");
    git(sibling.env, ["checkout", "-q", "-b", "elsewhere", sibling.base]);
    fs.writeFileSync(path.join(sibling.env, "data/divergent.json"), "{}\n");
    git(sibling.env, ["add", "--", "data/divergent.json"]);
    git(sibling.env, ["commit", "-q", "-m", "divergent"]);
    const divergent = execFileSync("git", ["rev-parse", "HEAD"], { cwd: sibling.env, encoding: "utf8" }).trim();
    git(sibling.env, ["checkout", "-q", "work"]);
    record("the minimum Captain SHA is present but not an ancestor of HEAD", "cloud_checkout_contains_captain_base",
      run("clone_is_complete", sibling.env, { minimumCaptainSha: divergent }));

    const unmarked = makeEnv("cloud-no-markers", { markers: false });
    record("the repository markers are missing", "repo_identity_by_committed_markers",
      run("repo_identity", unmarked.env, {}));

    const detached = makeEnv("cloud-detached");
    git(detached.env, ["checkout", "-q", "--detach", "HEAD"]);
    record("HEAD is detached", "repo_identity_by_committed_markers",
      run("repo_identity", detached.env, {}));

    const noEnvFile = makeEnv("cloud-no-corpus-env", { corpusEnv: false });
    record("the corpus environment file is absent", "master_library_mounted",
      run("master_library_mounted", noEnvFile.env, { cloud: true, home: noEnvFile.env }));

    const shortExtract = makeEnv("cloud-short-corpus");
    record("the corpus counts are wrong", "master_library_complete",
      run("master_library_complete", shortExtract.env, {}));

    const recoveredCorpus = makeEnv("cloud-recovered-corpus");
    const recoveredRoot = path.join(recoveredCorpus.env, MASTER_LIBRARY_RELATIVE);
    for (let i = 1; i < EXPECT_PDFS + 1; i += 1) {
      const jurisdiction = String.fromCharCode(65 + Math.floor(i / 26), 65 + (i % 26));
      const dir = path.join(recoveredRoot, "STATES", jurisdiction);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `RECOVERED-${i}.pdf`), FAKE_BYTES);
    }
    for (let i = 0; i < EXPECT_FILES - EXPECT_PDFS; i += 1) {
      fs.writeFileSync(path.join(recoveredRoot, `governance-${i}.txt`), "synthetic\n");
    }
    accept("a governed recovery raises the corpus above its immutable minimum", "master_library_complete",
      run("master_library_complete", recoveredCorpus.env, {}));

    const noSource = makeEnv("cloud-source-absent", { corpus: false });
    record("a family source is absent from the corpus", "family_sources_bind",
      run("family_sources_bind", noSource.env, {}));

    const wrongSource = makeEnv("cloud-source-mismatch", { corpusBytes: Buffer.from("%PDF-1.7\n% different bytes\n") });
    record("a family source hashes to something else", "family_sources_bind",
      run("family_sources_bind", wrongSource.env, {}));

    const trackedBinary = makeEnv("cloud-private-tracked");
    fs.mkdirSync(path.join(trackedBinary.env, "private/source-imports"), { recursive: true });
    fs.writeFileSync(path.join(trackedBinary.env, "private/source-imports/leaked.pdf"), FAKE_BYTES);
    git(trackedBinary.env, ["add", "-f", "--", "private/source-imports/leaked.pdf"]);
    git(trackedBinary.env, ["commit", "-q", "-m", "leak"]);
    record("private/ carries a tracked source binary", "private_is_git_ignored",
      run("private_is_git_ignored", trackedBinary.env, {}));

    const noAssignment = makeEnv("cloud-no-assignment");
    record("no assignment in the checkout names this family", "assignment_present_in_this_checkout",
      run("assigned_branch_tip_visible", noAssignment.env, { family: "zz-synthetic-set", assignmentFile: null, promptFile: null }));

    /* Two lanes of ONE kind on one family is a collision; a builder and its
     * verifier are not. Both directions, because getting the first right by
     * refusing everything is how four correct R8 families were refused. */
    const collide = makeEnv("cloud-two-builders-one-family");
    const manifest = (assignmentsJson) => {
      const dir = path.join(collide.env, "data/rcap-grade-a/launch-control");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "CODEX_CLOUD_CONTINUATIONS.json"), JSON.stringify({ assignments: assignmentsJson }, null, 2));
    };
    manifest([
      { assignmentId: "BUILD_A", lane: "completeness-repair", items: ["zz-synthetic-set"] },
      { assignmentId: "BUILD_B", lane: "completeness-repair", items: ["zz-synthetic-set"] }
    ]);
    record("two lanes of one kind claiming one family", "assignment_present_in_this_checkout",
      run("assigned_branch_tip_visible", collide.env, { family: "zz-synthetic-set", assignmentFile: null, promptFile: null }));
    manifest([
      { assignmentId: "BUILD_A", lane: "completeness-repair", items: ["zz-synthetic-set"] },
      { assignmentId: "VERIFY_A", lane: "independent-verification", items: ["zz-synthetic-set"] }
    ]);
    const builderAndVerifier = run("assigned_branch_tip_visible", collide.env, { family: "zz-synthetic-set", assignmentFile: null, promptFile: null });
    findings.push({
      scenario: "CONTROL — a builder and its verifier claiming one family is NOT a collision",
      check: "assignment_present_in_this_checkout",
      refused: builderAndVerifier.ok === false,
      detail: builderAndVerifier.detail,
      verdict: builderAndVerifier.ok === true ? "ACCEPTED_AS_IT_MUST" : "REFUSED — the gate refuses a correct dispatch"
    });

    // Normal mode must not have been softened on the way past.
    const shallowSource = makeEnv("cloud-shallow-source");
    const shallow = path.join(work, "normal-shallow");
    execFileSync("git", ["clone", "-q", "--depth", "1", `file://${shallowSource.env}`, shallow], { stdio: "ignore" });
    const normalClone = CHECKS.find((c) => c.id === "clone_is_complete");
    let shallowResult;
    try { shallowResult = normalClone.run(shallow); }
    catch (error) { shallowResult = { ok: false, threw: true, detail: error.message }; }
    record("NORMAL MODE — a shallow clone is still refused", "clone_is_complete", shallowResult);
  } finally {
    if (savedMasterLibrary === undefined) delete process.env.MASTER_LIBRARY_SOURCE_DIR;
    else process.env.MASTER_LIBRARY_SOURCE_DIR = savedMasterLibrary;
    fs.rmSync(work, { recursive: true, force: true });
  }
  return findings;
}

const results = runAll();
const proof = PROVE ? prove() : null;
const cloudProof = PROVE && CLOUD ? cloudScenarios() : null;
const failed = results.filter((r) => r.ok === false);
const skipped = results.filter((r) => r.skipped);
const vacuous = (proof ?? []).filter((p) => p.verdict === "VACUOUS");
const cloudGatesThatDoNotHold = (cloudProof ?? []).filter((c) => c.verdict.startsWith("ACCEPTED — ") || c.verdict.startsWith("REFUSED — "));

const report = {
  schemaVersion: "rcap-packet-build-environment-preflight/v1",
  generatedBy: "scripts/verify-packet-build-environment.mjs",
  question: "Can this container build an official-form packet, or will it stop at the source gate?",
  family: FAMILY,
  branch: BRANCH,
  mode: CLOUD ? "codex-cloud" : "codespaces-or-local-clone",
  ...(CLOUD ? {
    codexCloud: {
      minimumCaptainSha: MINIMUM_CAPTAIN_SHA,
      originRequired: false,
      shallowCheckoutAllowed: true,
      replacedChecks: CHECKS.filter((c) => c.cloud).map((c) => ({ codespaces: c.id, cloud: c.cloud.id })),
      denominatorIsUnchanged: "Three Codespaces checks are replaced, not waived. The same roster runs in both modes, and a pass is every applicable check passing in both. The denominator is the applicable set and is stated by the run, never asserted in advance."
    }
  } : {}),
  /*
   * A not-applicable check is not a pass.
   *
   * `passed` was results.length - failed.length, which counted every skipped
   * check as passing: an invocation with neither --family nor --branch
   * reported "14/15 passed, 1 failed, 2 not applicable", where 14 + 1 = 15 and
   * the two skipped ones had been quietly added to the passes. That is the
   * shape of the waived-check failure this preflight exists to refuse, arriving
   * through its own summary line.
   *
   * The roster is every registered check. The APPLICABLE set is the roster
   * minus the ones this invocation does not scope, and the denominator is the
   * applicable set -- so scoping a check out narrows what was proved instead of
   * inflating it.
   */
  checks: results.length - skipped.length,
  registeredChecks: results.length,
  passed: results.length - skipped.length - failed.length,
  failed: failed.length,
  skipped: skipped.length,
  skippedAreNotPasses: "A not-applicable check proves nothing and is excluded from both the numerator and the denominator.",
  verdict: failed.length === 0 ? "PACKET_BUILD_ENVIRONMENT_READY" : "PACKET_BUILD_ENVIRONMENT_NOT_READY",
  mayLaunchPacketWorker: failed.length === 0,
  whatAPassDoesNotEstablish: [
    "that any packet is built, or that any artifact is proven",
    "that any route may open, or that any output is approved for participant delivery",
    "that the held sources are the current official editions"
  ],
  results,
  discriminationProof: proof,
  cloudDiscriminationProof: cloudProof
};

if (REPORT) { fs.mkdirSync(path.dirname(path.join(ROOT, REPORT)), { recursive: true }); fs.writeFileSync(path.join(ROOT, REPORT), JSON.stringify(report, null, 2) + "\n"); }

for (const r of results) {
  const mark = r.skipped ? "  -" : r.ok ? "  ok" : "FAIL";
  console.log(`${mark}  ${r.id.padEnd(38)} ${r.detail}`);
}
if (proof) {
  console.log("\ndiscrimination:");
  for (const p of proof) console.log(`  ${p.verdict.padEnd(34)} ${p.id}`);
}
if (cloudProof) {
  console.log("\ncloud discrimination — each breaks one thing about a checkout that otherwise passes:");
  for (const c of cloudProof) console.log(`  ${c.verdict.padEnd(30)} ${c.scenario}`);
}
console.log(`\n${report.verdict}: ${report.passed}/${report.checks} passed, ${report.failed} failed, ${report.skipped} not applicable`);
if (CLOUD) console.log(`mode: codex-cloud — origin not required, shallow checkout accepted, ${report.codexCloud.replacedChecks.length} check(s) replaced rather than waived`);
if (vacuous.length) console.log(`${vacuous.length} check(s) do not discriminate and prove nothing.`);
if (cloudProof) console.log(`cloud scenarios: ${cloudProof.length}, ${cloudGatesThatDoNotHold.length} gate(s) that do not hold`);
if (REPORT) console.log(`Wrote ${REPORT}`);

process.exit(failed.length === 0 && vacuous.length === 0 && cloudGatesThatDoNotHold.length === 0 ? 0 : 1);
