/**
 * The set of files a scope guard must police.
 *
 * The defect this exists to fix: guards were deriving their file list from
 * `git status --short`, which reports the WORKING TREE only. In CI the tree is
 * always clean immediately after checkout, so the list was empty, every
 * restricted-path loop iterated zero times, and the guard passed by having
 * nothing to look at. It caught exactly one thing — a locally dirty tree — and
 * silently permitted every committed change it was written to forbid. Six phase
 * migrations reached the branch that way.
 *
 * A scope guard has to answer "what does this branch change", which is a
 * question about commits, not about uncommitted edits. So the list is the union
 * of both:
 *
 *   * everything committed on this branch relative to its merge base with the
 *     default branch — the part that was missing;
 *   * everything currently uncommitted — the part that already worked, kept so
 *     a guard still catches a dirty tree before it is committed.
 *
 * And it fails closed. If the base cannot be resolved, that is reported as a
 * failure rather than returning an empty set, because an empty set is
 * indistinguishable from "nothing to check" — which is precisely how the
 * original defect stayed invisible.
 */

import { spawnSync } from "node:child_process";

function git(rootDir, args) {
  const out = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  return { ok: out.status === 0, stdout: out.stdout ?? "", stderr: out.stderr ?? "" };
}

/** The merge base with the default branch, trying the usual names in order. */
function resolveBase(rootDir) {
  for (const ref of ["origin/main", "main", "origin/master", "master"]) {
    const rev = git(rootDir, ["rev-parse", "--verify", "--quiet", ref]);
    if (!rev.ok || !rev.stdout.trim()) continue;
    const base = git(rootDir, ["merge-base", ref, "HEAD"]);
    if (base.ok && base.stdout.trim()) return { ref, sha: base.stdout.trim() };
  }
  return null;
}

/**
 * @param {object} options
 * @param {string} options.rootDir repository root
 * @param {string[]} [options.failures] collected failure messages; a missing
 *   base is pushed here rather than swallowed
 * @param {string} [options.envOverride] name of an env var that, when set,
 *   supplies the list verbatim (newline separated). Used by harnesses that
 *   need to drive the guard with a synthetic diff.
 * @returns {{ files: string[], base: string | null, source: string }}
 */
export function changedFilesForScopeGuard({ rootDir, failures = [], envOverride = null }) {
  if (envOverride && process.env[envOverride]) {
    return {
      files: process.env[envOverride].split("\n").map((l) => l.trim()).filter(Boolean),
      base: null,
      source: `env:${envOverride}`
    };
  }

  const files = new Set();

  // Working tree. `--short` lines are "XY path"; a rename prints "old -> new"
  // and it is the new path a guard must judge.
  const status = git(rootDir, ["status", "--short"]);
  for (const line of status.stdout.split(/\r?\n/)) {
    const trimmed = line.slice(3).trim();
    if (!trimmed) continue;
    files.add(trimmed.includes(" -> ") ? trimmed.split(" -> ").pop().trim() : trimmed);
  }

  const base = resolveBase(rootDir);
  if (!base) {
    failures.push(
      "Could not resolve a merge base against the default branch, so committed changes cannot be scoped. " +
        "Refusing to report an empty change set: an empty set reads as 'nothing to check'."
    );
    return { files: [...files], base: null, source: "working-tree-only (base unresolved)" };
  }

  const committed = git(rootDir, ["diff", "--name-only", `${base.sha}...HEAD`]);
  if (!committed.ok) {
    failures.push(`Could not diff HEAD against ${base.ref} (${base.sha.slice(0, 8)}): ${committed.stderr.trim()}`);
    return { files: [...files], base: base.sha, source: "working-tree-only (diff failed)" };
  }
  for (const line of committed.stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed) files.add(trimmed);
  }

  return { files: [...files].sort(), base: base.sha, source: `${base.ref}...HEAD + working tree` };
}
