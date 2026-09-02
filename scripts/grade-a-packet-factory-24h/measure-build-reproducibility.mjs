#!/usr/bin/env node
/**
 * Does each family's committed output actually come from its own build script?
 *
 * The repository has never asked this. It asks whether a packet verifies, whether
 * its raster receipt matches its bytes, whether its sources are bound -- but not
 * whether the bytes sitting in a family's output directory are the bytes that
 * family's builder produces today. Four provenance defects surfaced by accident
 * before this tool existed: a family that rebuilds POORER than what is committed
 * while sitting in a proven state, two families shipping no participant
 * instructions though their host writes them unconditionally, and three builders
 * stamping a wall clock so their bytes moved on every rebuild underneath
 * hash-bound raster receipts. Every one of those was found by somebody looking
 * for something else.
 *
 * A family whose committed artifacts are not what its builder produces has no
 * reproducible provenance, and a raster receipt taken over such bytes proves
 * less than it appears to. This performs the sweep that finds them all.
 *
 * The builders resolve official sources through MASTER_LIBRARY_SOURCE_DIR and
 * refuse to infer it, so this refuses to start without it rather than record its
 * own environment as a fleet of broken builders:
 *
 *   export MASTER_LIBRARY_SOURCE_DIR="$PWD/private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1"
 *   node scripts/grade-a-packet-factory-24h/measure-build-reproducibility.mjs
 *   node scripts/grade-a-packet-factory-24h/measure-build-reproducibility.mjs --resume
 *   node scripts/grade-a-packet-factory-24h/measure-build-reproducibility.mjs --limit 10
 *   node scripts/grade-a-packet-factory-24h/measure-build-reproducibility.mjs --family ak-tf800-set
 *   node scripts/grade-a-packet-factory-24h/measure-build-reproducibility.mjs --proven-only
 *
 * THIS TOOL MEASURES AND REPAIRS NOTHING. It restores the working tree after
 * every family it rebuilds and verifies the restoration byte-for-byte before
 * moving to the next one, because leaving a rebuilt artifact behind would
 * corrupt the very thing being measured. It refuses to start on a dirty tree
 * for the same reason: it would otherwise report somebody's uncommitted work as
 * builder drift.
 *
 * Classifications:
 *   REPRODUCES          rebuild is byte-identical to what is committed
 *   NONDETERMINISTIC    a second consecutive rebuild differs from the first
 *   DIVERGES            rebuild is stable but differs from what is committed
 *   UNBUILDABLE         the owning script errors (the error is captured)
 *   UNKNOWN_INVOCATION  how to invoke the script for this family cannot be determined
 *   SKIPPED_LANE_ACTIVE another lane is repairing this host under an owner decision
 *
 * A HOST_BLEED observation is recorded separately whenever rebuilding family A
 * writes outside A's own directory -- most often into a sibling family's
 * directory, because they share a build host. That is itself a finding.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUEUE = "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json";
const OUT = "data/rcap-grade-a/fable-packet-factory/BUILD_REPRODUCIBILITY.json";

const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const LIMIT = Number(flag("--limit") ?? Infinity);
const ONLY_FAMILY = flag("--family");
const PROVEN_ONLY = argv.includes("--proven-only");
const BUILD_TIMEOUT_MS = Number(flag("--timeout") ?? 600_000);

const PROVEN_STATES = new Set(["COMPLETE_PACKET_PROVEN", "VERIFIED_PASS"]);

// The east shared host is under active repair in another lane under an owner
// decision. Rebuilding it here would collide with that repair, so it is recorded
// rather than measured. Named by host script plus one explicitly excluded family.
const LANE_ACTIVE_HOST = "build-census-v1-nj_arrest_no_conviction-set.mjs";
const LANE_ACTIVE_FAMILIES = new Set(["ri_nonconviction_sealing-set"]);

const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 });
const rel = (p) => path.relative(ROOT, path.resolve(ROOT, p)).split(path.sep).join("/");

// ---------------------------------------------------------------------------
// hashing a directory
// ---------------------------------------------------------------------------

function walk(dir, acc = []) {
  const abs = path.resolve(ROOT, dir);
  if (!fs.existsSync(abs)) return acc;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(child, acc);
    else if (entry.isFile()) acc.push(rel(child));
  }
  return acc;
}

const TEXT_EXT = new Set([".md", ".json", ".txt", ".csv", ".mjs", ".js", ".ts", ".html", ".xml", ".svg"]);

/**
 * A bounded look at what actually changed in a text file: lines the committed
 * copy has and the rebuild does not, and the reverse. Called while the rebuilt
 * bytes are still on disk, before restoration.
 */
function sampleTextDiff(relPath, max = 6) {
  if (!TEXT_EXT.has(path.extname(relPath).toLowerCase())) return null;
  let committedText;
  try { committedText = git(["show", `HEAD:${relPath}`]); } catch { return null; }
  const abs = path.resolve(ROOT, relPath);
  const rebuiltText = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
  const a = committedText.split("\n");
  const b = rebuiltText.split("\n");
  const bSet = new Set(b);
  const aSet = new Set(a);
  const clip = (s) => (s.length > 200 ? `${s.slice(0, 200)}...` : s);
  const onlyCommitted = a.filter((l) => l.trim() !== "" && !bSet.has(l));
  const onlyRebuilt = b.filter((l) => l.trim() !== "" && !aSet.has(l));
  return {
    onlyInCommitted: onlyCommitted.slice(0, max).map(clip),
    onlyInCommittedCount: onlyCommitted.length,
    onlyInRebuild: onlyRebuilt.slice(0, max).map(clip),
    onlyInRebuildCount: onlyRebuilt.length
  };
}

function fileFacts(relPath) {
  const buf = fs.readFileSync(path.resolve(ROOT, relPath));
  const facts = {
    sha256: crypto.createHash("sha256").update(buf).digest("hex"),
    bytes: buf.length,
    // Only ever used to tell "the builder rewrote this file with identical
    // bytes" from "the builder never touched it". Never part of the comparison.
    mtimeMs: fs.statSync(path.resolve(ROOT, relPath)).mtimeMs
  };
  if (TEXT_EXT.has(path.extname(relPath).toLowerCase())) {
    const text = buf.toString("utf8");
    facts.lines = text === "" ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
  }
  return facts;
}

/** Map of relative path -> {sha256, bytes, lines?} for every file under a directory. */
function snapshot(dir) {
  const out = {};
  for (const f of walk(dir)) out[f] = fileFacts(f);
  return out;
}

/**
 * How the two snapshots differ, and -- for text -- whether the rebuild says more
 * or less than what is committed. "Poorer" is the shape of DF-004: a 69-line
 * filing-instruction document rebuilding into a 13-line stub.
 */
function diffSnapshots(committed, rebuilt) {
  const paths = [...new Set([...Object.keys(committed), ...Object.keys(rebuilt)])].sort();
  const files = [];
  let richer = 0;
  let poorer = 0;
  for (const p of paths) {
    const a = committed[p];
    const b = rebuilt[p];
    if (a && b && a.sha256 === b.sha256) continue;
    if (!b) { files.push({ path: p, change: "MISSING_AFTER_REBUILD", committedBytes: a.bytes, committedLines: a.lines ?? null }); poorer += 1; continue; }
    if (!a) { files.push({ path: p, change: "NEW_IN_REBUILD", rebuiltBytes: b.bytes, rebuiltLines: b.lines ?? null }); richer += 1; continue; }
    const entry = {
      path: p,
      change: "CONTENT_DIFFERS",
      committedBytes: a.bytes,
      rebuiltBytes: b.bytes,
      byteDelta: b.bytes - a.bytes,
      committedLines: a.lines ?? null,
      rebuiltLines: b.lines ?? null,
      lineDelta: a.lines !== undefined && b.lines !== undefined ? b.lines - a.lines : null
    };
    // Direction is judged on lines for text and on bytes otherwise; a file that
    // changes content without changing size is neither richer nor poorer.
    const delta = entry.lineDelta ?? entry.byteDelta;
    if (delta > 0) richer += 1;
    else if (delta < 0) poorer += 1;
    entry.direction = delta > 0 ? "RICHER" : delta < 0 ? "POORER" : "SAME_SIZE";
    files.push(entry);
  }
  const direction = poorer > 0 && richer > 0 ? "MIXED" : poorer > 0 ? "POORER" : richer > 0 ? "RICHER" : "SAME_SIZE";
  return { fileCount: files.length, direction, richerFiles: richer, poorerFiles: poorer, files };
}

// ---------------------------------------------------------------------------
// invocation
// ---------------------------------------------------------------------------

/**
 * Determine how this family's own script is invoked, rather than assuming it.
 *
 * Every census-v1 builder found so far is entered the same way: `node <script>`
 * with no arguments builds the family the script is named for. Two shapes carry
 * that: a four-line importer that calls a host's `run*(<familyId>)`, and a host
 * whose direct-invocation guard defaults to its own family. Both are confirmed
 * statically here and again empirically afterwards -- a run that writes nothing
 * into the family's own directory did not build this family, whatever it did.
 */
function determineInvocation(family) {
  const src = fs.readFileSync(path.resolve(ROOT, family.buildScript), "utf8");
  const consts = {};
  for (const m of src.matchAll(/\bconst\s+([A-Za-z0-9_$]+)\s*=\s*"([^"]+)"/g)) consts[m[1]] = m[2];

  // The composed-pleading host hides the guard behind a helper:
  // `runIfMain(FAMILY, import.meta.url)` resolves process.argv[1] inside
  // composed-family-host.mjs and runs FAMILY when the file is entered directly.
  // Six builders are entered that way, and it is still a no-argument invocation.
  if (/^\s*runIfMain\(\s*[A-Za-z0-9_$]+\s*,\s*import\.meta\.url\s*\)/m.test(src)) {
    return { argv: [], basis: "runIfMain(FAMILY, import.meta.url): the composed host runs this family when the file is entered directly, with no argument" };
  }

  const lines = src.split("\n");
  let guard = -1;
  for (let i = lines.length - 1; i >= 0; i -= 1) if (/process\.argv\[1\]/.test(lines[i])) { guard = i; break; }
  const region = guard >= 0 ? lines.slice(guard).join("\n") : src;

  // family ids passed to a run*/build* entrypoint inside the direct-invocation guard
  const passed = [...region.matchAll(/\b(?:run|build)[A-Za-z0-9_]*\(\s*(?:"([^"]+)"|([A-Za-z0-9_$]+))\s*[,)]/g)]
    .map((m) => (m[1] !== undefined ? m[1] : consts[m[2]]))
    .filter(Boolean);

  if (passed.includes(family.familyId)) {
    return { argv: [], basis: "direct-invocation guard enters this family id with no argument" };
  }
  if (passed.length === 0 && guard >= 0) {
    // A host with a no-argument entrypoint: it builds exactly one family, its own.
    return { argv: [], basis: "direct-invocation guard calls a no-argument entrypoint" };
  }
  if (passed.length === 0 && guard < 0) {
    return { argv: null, basis: `no direct-invocation guard found in ${family.buildScript}` };
  }
  return { argv: null, basis: `direct-invocation guard enters ${JSON.stringify(passed)}, not ${family.familyId}` };
}

// ---------------------------------------------------------------------------
// tree discipline
// ---------------------------------------------------------------------------

// This tool's own two files are legitimately dirty while it runs: it is itself
// new, and it is writing its report. Everything else that moves is a finding.
const SELF = new Set([OUT, "scripts/grade-a-packet-factory-24h/measure-build-reproducibility.mjs"]);

/** Every path git currently reports as changed, added or removed, worktree-wide. */
function dirtyPaths() {
  return git(["status", "--porcelain", "--untracked-files=all"])
    .split("\n").filter(Boolean)
    .map((l) => l.slice(3).trim())
    .map((p) => (p.includes(" -> ") ? p.split(" -> ")[1] : p))
    .map((p) => (p.startsWith('"') ? JSON.parse(p) : p))
    .filter((p) => !SELF.has(p));
}

/**
 * Put a set of paths back exactly as committed: delete anything the build newly
 * created (git checkout cannot remove an untracked file) then check out the rest.
 * Never a branch checkout, never a reset, never a stash -- named paths only.
 */
function restorePaths(paths) {
  const uniq = [...new Set(paths)].filter(Boolean);
  if (uniq.length === 0) return;
  const untracked = new Set(
    git(["ls-files", "--others", "--exclude-standard", "--", ...uniq]).split("\n").filter(Boolean)
  );
  for (const p of untracked) {
    const abs = path.resolve(ROOT, p);
    if (fs.existsSync(abs)) fs.rmSync(abs, { force: true });
  }
  const tracked = uniq.filter((p) => !untracked.has(p));
  if (tracked.length > 0) {
    try { git(["checkout", "--", ...tracked]); } catch { /* a path git does not track needs no checkout */ }
  }
}

// ---------------------------------------------------------------------------
// the sweep
// ---------------------------------------------------------------------------

const queue = JSON.parse(fs.readFileSync(path.resolve(ROOT, QUEUE), "utf8"));

if (dirtyPaths().length > 0) {
  console.error("REFUSED: the working tree is not clean.");
  console.error("");
  console.error("This rebuilds families and restores the tree afterwards; starting dirty would");
  console.error("report uncommitted work as builder drift, and could lose it on restoration.");
  process.exit(1);
}

// Several hosts read the Master Library through MASTER_LIBRARY_SOURCE_DIR and
// refuse to guess at it. Without the variable they exit in a fifth of a second
// at source resolution, and a sweep that recorded that as UNBUILDABLE would be
// reporting its own environment as a fleet of builder defects. So it is a
// precondition, not a result.
if (!process.env.MASTER_LIBRARY_SOURCE_DIR) {
  console.error("REFUSED: MASTER_LIBRARY_SOURCE_DIR is not set.");
  console.error("");
  console.error("The builders resolve their official sources through it and refuse to infer it.");
  console.error("Set it to the extracted Master Library before sweeping, e.g.");
  console.error("  export MASTER_LIBRARY_SOURCE_DIR=\"$PWD/private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1\"");
  console.error("Sweeping without it would record an environment gap as builder failure.");
  process.exit(1);
}

// An UNBUILDABLE that names a missing corpus or an unset precondition is a fact
// about where the sweep ran, not about the builder. It is still recorded, but it
// is labelled, so nobody reads a missing operational tree as a broken family.
const ENVIRONMENT_BOUNDED = /MASTER_LIBRARY_SOURCE_DIR|OFFICIAL_FORMS_SOURCE_DIR|Master Library is not mounted|operational[- ]corpus|Nationwide Record Clearing|ENOENT.*private\//i;

const candidates = queue.families.filter((f) => f.directory && f.buildScriptExists);

// The most valuable answers first: families whose provenance is currently being
// relied on. If the sweep is cut short, it is cut short on the families nobody
// has staked a proven claim on.
const ordered = [
  ...candidates.filter((f) => PROVEN_STATES.has(f.state)),
  ...(PROVEN_ONLY ? [] : candidates.filter((f) => !PROVEN_STATES.has(f.state)))
].filter((f) => (ONLY_FAMILY ? f.familyId === ONLY_FAMILY : true));

// A full pass is slow -- roughly a minute per family, and it cannot be
// parallelised because every build writes into the one working tree. So the
// report is rewritten after every family and --resume picks up where a previous
// run stopped, and a sweep that is interrupted still says exactly what it covered.
const RESUME = argv.includes("--resume");
const prior = RESUME && fs.existsSync(path.resolve(ROOT, OUT))
  ? JSON.parse(fs.readFileSync(path.resolve(ROOT, OUT), "utf8"))
  : null;

const results = prior ? [...prior.families] : [];
const hostBleed = prior ? [...prior.hostBleed] : [];
const alreadyDone = new Set(results.map((r) => r.familyId));
let swept = 0;

for (const family of ordered) {
  if (swept >= LIMIT) break;
  if (alreadyDone.has(family.familyId)) continue;

  const row = {
    familyId: family.familyId,
    jurisdiction: family.jurisdiction,
    queueState: family.state,
    proven: PROVEN_STATES.has(family.state),
    buildScript: family.buildScript,
    sharedBuildHost: family.sharedBuildHost,
    directory: family.directory,
    classification: null
  };

  if (family.sharedBuildHost === LANE_ACTIVE_HOST
    || path.basename(family.buildScript) === LANE_ACTIVE_HOST
    || LANE_ACTIVE_FAMILIES.has(family.familyId)) {
    row.classification = "SKIPPED_LANE_ACTIVE";
    row.detail = "another lane is repairing this build host under an owner decision; not rebuilt here";
    record(row);
    continue;
  }

  const invocation = determineInvocation(family);
  if (invocation.argv === null) {
    row.classification = "UNKNOWN_INVOCATION";
    row.detail = invocation.basis;
    record(row);
    continue;
  }
  row.invocation = `node ${family.buildScript}${invocation.argv.map((a) => ` ${a}`).join("")}`;
  row.invocationBasis = invocation.basis;

  const committed = snapshot(family.directory);
  row.committedFileCount = Object.keys(committed).length;

  const runOnce = () => spawnSync(process.execPath, [family.buildScript, ...invocation.argv], {
    cwd: ROOT, encoding: "utf8", timeout: BUILD_TIMEOUT_MS, maxBuffer: 1 << 28
  });

  const started = Date.now();
  const first = runOnce();
  row.buildSeconds = Number(((Date.now() - started) / 1000).toFixed(1));

  // What moved anywhere in the tree, before anything is put back.
  const movedFirst = dirtyPaths();
  const outside = movedFirst.filter((p) => !`${p}/`.startsWith(`${family.directory}/`));

  if (first.status !== 0) {
    row.classification = "UNBUILDABLE";
    row.exitCode = first.status;
    row.error = (first.stderr || first.stdout || "").trim().split("\n").filter(Boolean).slice(0, 6).join(" | ").slice(0, 900)
      || (first.error ? String(first.error.message) : "exited non-zero with no output");
    row.environmentBounded = ENVIRONMENT_BOUNDED.test(row.error);
    row.detail = row.environmentBounded
      ? "the script exits on a source-corpus precondition this environment does not satisfy; this says nothing about the builder"
      : "the script errors when run through its own entrypoint";
    if (outside.length > 0) hostBleed.push({ familyId: family.familyId, buildScript: family.buildScript, whenFailing: true, paths: outside.slice(0, 200), pathCount: outside.length });
    restorePaths(movedFirst);
    row.restored = verifyRestored(family, committed, movedFirst);
    record(row);
    swept += 1;
    continue;
  }

  if (outside.length > 0) {
    const bleed = {
      familyId: family.familyId,
      buildScript: family.buildScript,
      sharedBuildHost: family.sharedBuildHost,
      pathCount: outside.length,
      paths: outside.slice(0, 200),
      // Which other families own the ground that moved -- the part that matters.
      familiesAffected: [...new Set(
        outside.flatMap((p) => queue.families.filter((o) => o.directory && `${p}/`.startsWith(`${o.directory}/`)).map((o) => o.familyId))
      )].filter((id) => id !== family.familyId)
    };
    hostBleed.push(bleed);
    row.hostBleed = { pathCount: bleed.pathCount, familiesAffected: bleed.familiesAffected };
  }

  const rebuilt = snapshot(family.directory);
  // git dirtiness cannot answer this: a builder that rewrites a file with the
  // same bytes leaves the tree clean. mtime can, and the distinction matters --
  // "reproduces" is a claim about a builder that ran, not about one that skipped.
  const rewrote = Object.entries(rebuilt).filter(([p, f]) => !committed[p] || f.mtimeMs > committed[p].mtimeMs);
  const wroteOwnDirectory = rewrote.length > 0;

  if (Object.keys(rebuilt).length === 0) {
    row.classification = "UNKNOWN_INVOCATION";
    row.detail = "the script ran cleanly but the family's own directory is empty afterwards";
    restorePaths(movedFirst);
    row.restored = verifyRestored(family, committed, movedFirst);
    record(row);
    swept += 1;
    continue;
  }

  const drift = diffSnapshots(committed, rebuilt);

  if (drift.fileCount === 0) {
    row.classification = "REPRODUCES";
    row.filesRewrittenByBuilder = rewrote.length;
    row.detail = wroteOwnDirectory
      ? `rebuild is byte-identical to what is committed; the builder rewrote ${rewrote.length} of ${Object.keys(rebuilt).length} file(s) and produced the same bytes`
      : "rebuild is byte-identical to what is committed, but the builder rewrote none of the family's files, so this proves the script exits cleanly rather than that it authors these bytes";
    restorePaths(movedFirst);
    row.restored = verifyRestored(family, committed, movedFirst);
    record(row);
    swept += 1;
    continue;
  }

  // It differs. Is it stable? A second consecutive rebuild answers that, and
  // separates a builder that stamps a clock from a builder whose output has
  // genuinely drifted from what somebody committed.
  const second = runOnce();
  if (second.status !== 0) {
    row.classification = "NONDETERMINISTIC";
    row.detail = "the first rebuild differed from what is committed and a second consecutive rebuild failed";
    row.secondRunError = (second.stderr || "").trim().split("\n").filter(Boolean).slice(-2).join(" | ").slice(0, 400);
    row.divergence = drift;
  } else {
    const again = snapshot(family.directory);
    const unstable = diffSnapshots(rebuilt, again);
    if (unstable.fileCount > 0) {
      row.classification = "NONDETERMINISTIC";
      row.detail = "a second consecutive rebuild differs from the first, so these bytes are not reproducible at all";
      row.unstableFiles = unstable.files.map((f) => f.path);
      row.divergence = drift;
    } else {
      row.classification = "DIVERGES";
      row.detail = `the rebuild is stable but differs from what is committed in ${drift.fileCount} file(s); the rebuild is ${drift.direction}`;
      row.divergence = drift;
      // A Captain deciding what a divergence means should not have to rerun an
      // hour of builds to see it, so a bounded sample of the changed lines rides
      // along while the rebuilt bytes are still on disk.
      for (const f of drift.files) f.sample = sampleTextDiff(f.path);
    }
  }

  const movedAll = [...new Set([...movedFirst, ...dirtyPaths()])];
  restorePaths(movedAll);
  row.restored = verifyRestored(family, committed, movedAll);
  record(row);
  swept += 1;
}

/** Restoration is not asserted, it is checked: byte-identical directory, clean tree. */
function verifyRestored(family, committed, moved) {
  const after = snapshot(family.directory);
  const back = diffSnapshots(committed, after);
  const stillDirty = dirtyPaths();
  const ok = back.fileCount === 0 && stillDirty.length === 0;
  return {
    ok,
    familyDirectoryByteIdentical: back.fileCount === 0,
    worktreeClean: stillDirty.length === 0,
    pathsTouchedByBuild: moved.length,
    ...(ok ? {} : { unrestored: [...new Set([...back.files.map((f) => f.path), ...stillDirty])].slice(0, 50) })
  };
}


// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------

/**
 * The report is rewritten after every single family rather than once at the end.
 * A sweep of this shape is measured in hours and can be interrupted; a partial
 * sweep that says exactly what it covered is worth far more than a complete one
 * that was lost, or rushed.
 */
function buildReport() {
  const counts = {};
  for (const r of results) counts[r.classification] = (counts[r.classification] ?? 0) + 1;

  const provenFailing = results.filter((r) => r.proven && r.classification !== "REPRODUCES");
  const notSwept = candidates.filter((c) => !results.some((r) => r.familyId === c.familyId));

  return {
    schemaVersion: 1,
    question: "Does each family's committed output actually come from its own build script?",
    generatedBy: "scripts/grade-a-packet-factory-24h/measure-build-reproducibility.mjs",
    measuredAt: new Date().toISOString(),
    baseSha: git(["rev-parse", "HEAD"]).trim(),
    complete: notSwept.length === 0,
    method: {
      step1: "SHA-256 every committed file in the family's output directory",
      step2: "rebuild through the family's OWN owning script, invocation determined per script and confirmed empirically",
      step3: "hash again; a differing rebuild is rebuilt a second consecutive time to separate instability from drift",
      step4: "record which files differ, and whether the rebuild is richer or poorer in bytes and in lines",
      step5: "restore the working tree with `git checkout -- <path>` and verify byte-identical restoration before the next family",
      ordering: "every family in a proven state (COMPLETE_PACKET_PROVEN, VERIFIED_PASS) first, since those are the ones whose provenance is being relied on",
      repairsMade: 0,
      note: "this tool measures only; it repairs nothing it finds"
    },
    denominator: {
      familiesInQueue: queue.families.length,
      withDirectoryAndOwningScript: candidates.length,
      provenWithDirectoryAndOwningScript: candidates.filter((f) => PROVEN_STATES.has(f.state)).length,
      swept: results.length,
      sweptProven: results.filter((r) => r.proven).length,
      actuallyRebuilt: results.filter((r) => !["SKIPPED_LANE_ACTIVE", "UNKNOWN_INVOCATION"].includes(r.classification)).length,
      notSwept: notSwept.length,
      notSweptFamilies: notSwept.map((f) => ({ familyId: f.familyId, state: f.state, reason: "sweep bounded before reaching it" }))
    },
    counts,
    provenFamiliesThatDoNotReproduce: provenFailing.map((r) => ({
      familyId: r.familyId,
      queueState: r.queueState,
      classification: r.classification,
      detail: r.detail,
      environmentBounded: r.environmentBounded ?? false,
      filesAffected: r.divergence?.fileCount ?? null,
      direction: r.divergence?.direction ?? null
    })),
    environment: {
      masterLibrarySourceDir: process.env.MASTER_LIBRARY_SOURCE_DIR ?? null,
      officialFormsSourceDir: process.env.OFFICIAL_FORMS_SOURCE_DIR ?? null,
      unbuildableForEnvironmentReasons: results.filter((r) => r.environmentBounded).length,
      note: "an UNBUILDABLE marked environmentBounded is a fact about where the sweep ran, not about the builder"
    },
    hostBleed,
    restoration: {
      everyFamilyRestored: results.every((r) => !r.restored || r.restored.ok),
      unrestored: results.filter((r) => r.restored && !r.restored.ok).map((r) => ({ familyId: r.familyId, unrestored: r.restored.unrestored }))
    },
    commercialRoutesOpened: 0,
    productionTouched: false,
    families: results
  };
}

function writeReport() {
  fs.mkdirSync(path.resolve(ROOT, path.dirname(OUT)), { recursive: true });
  fs.writeFileSync(path.resolve(ROOT, OUT), `${JSON.stringify(buildReport(), null, 2)}\n`);
}

function record(row) {
  results.push(row);
  console.log(`  ${String(row.classification).padEnd(19)} ${row.familyId}${row.proven ? "  [PROVEN]" : ""}`);
  writeReport();
}

writeReport();

const report = buildReport();
console.log(`swept ${results.length} of ${candidates.length} buildable families (${report.denominator.actuallyRebuilt} actually rebuilt)`);
for (const [k, v] of Object.entries(report.counts).sort()) console.log(`  ${k}: ${v}`);
console.log(`proven families that do not reproduce: ${report.provenFamiliesThatDoNotReproduce.length}`);
for (const p of report.provenFamiliesThatDoNotReproduce) console.log(`  ${p.classification}  ${p.familyId} (${p.queueState})`);
console.log(`host bleed observations: ${hostBleed.length}`);
console.log(`every family restored: ${report.restoration.everyFamilyRestored}`);
console.log(`not swept: ${report.denominator.notSwept}`);
console.log(`wrote ${OUT}`);
