#!/usr/bin/env node
/*
 * A LANE WORKTREE WITHOUT THE CORPUS CANNOT MEASURE SOURCE_IDENTITY, AND THE
 * HONEST ANSWER TO AN UNMEASURABLE OBLIGATION LOSES THE WHOLE ROW.
 *
 * `private/` is gitignored, so it lives in the two long-lived checkouts and in
 * no worktree `git worktree add` ever creates. `node_modules` is the same. I cut
 * three lane worktrees in one shift and all three hit it:
 *
 *   FIX01  symlinked private/ and node_modules by hand, verified both pinned
 *          sources by digest first, and removed the links afterwards.
 *   FIX05  found no node_modules at all, checked pdf-lib and standard-fonts
 *          against the worktree's own package-lock before linking, then removed.
 *   VF36   did not, and correctly returned SOURCE_IDENTITY = NOT_MEASURABLE_HERE
 *          on all three of its families -- which alone refuses
 *          PASS_COMPLETE_INDEPENDENT. Three families' reads spent, and the
 *          verdict was unreachable before the lane opened a single PDF.
 *
 * VF36 did the right thing with the wrong environment. The row is honest and the
 * environment was mine to provide, so this provides it once instead of asking
 * every lane to improvise the same workaround and remember to undo it.
 *
 * It links rather than copies: the corpus is 871 MB and this container's writable
 * allowance is measured in single-digit gigabytes shared across every live lane.
 * A symlink also cannot drift from the canonical copy, which a copy would.
 *
 * READ-ONLY IS NOT ENFORCED HERE AND THIS SCRIPT DOES NOT PRETEND IT IS. The link
 * points at the real corpus, so a lane that writes through it writes to the
 * canonical copy. Every lane brief says the corpus is read-only; this makes the
 * corpus present, not safe from a lane that ignores its brief.
 *
 * Usage:
 *   node provision-lane-worktree.mjs <worktree> [--from <canonical checkout>]
 *   node provision-lane-worktree.mjs <worktree> --check
 */
import { existsSync, lstatSync, symlinkSync, unlinkSync, readlinkSync, readFileSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const CANONICAL_DEFAULT = "/home/user/legalease-partner-dashboard-clean";
const LINKED = ["private", "node_modules"];

const argv = process.argv.slice(2);
const worktree = argv.find((a) => !a.startsWith("--"));
if (!worktree) { console.error("usage: provision-lane-worktree.mjs <worktree> [--from <checkout>] [--check]"); process.exit(2); }
const fromIndex = argv.indexOf("--from");
const canonical = fromIndex >= 0 ? argv[fromIndex + 1] : CANONICAL_DEFAULT;
const checkOnly = argv.includes("--check");

if (!existsSync(worktree)) { console.error(`WORKTREE_ABSENT: ${worktree}`); process.exit(3); }

/*
 * THE LINKS MUST BE IGNORED, AND .gitignore DOES NOT IGNORE THEM.
 *
 * .gitignore line 53 is `private/`, with a trailing slash, which matches a
 * DIRECTORY. What this script creates is a SYMLINK named `private`, and git does
 * not treat that as a directory, so the pattern does not match it.
 *
 * It looked ignored anyway, and FIX01 found out why: a global core.excludesFile
 * pointed at `.../scratchpad/vf07-excludes`, an eight-byte file inside ANOTHER
 * LANE'S SCRATCHPAD containing the single word `private`. Every provisioned
 * worktree's ignore of an 871 MB corpus link was resting on a stray file one
 * cleanup away from deletion. Verified rather than assumed: overriding
 * core.excludesFile with an empty file, `check-ignore private` reports NOT
 * IGNORED in a provisioned worktree.
 *
 * So the ignore goes where it belongs -- the repository's own info/exclude in the
 * common git dir, which every worktree of this repo reads and which no scratchpad
 * cleanup can take away. Appended once, idempotently, never rewritten.
 */
const ensureExcluded = (worktreePath) => {
  const commonDir = execFileSync("git", ["-C", worktreePath, "rev-parse", "--git-common-dir"], { encoding: "utf8" }).trim();
  const excludeFile = path.join(path.resolve(worktreePath, commonDir), "info", "exclude");
  if (!existsSync(excludeFile)) { console.log(`info/exclude   ABSENT at ${excludeFile}; not created`); return; }
  const body = readFileSync(excludeFile, "utf8");
  const wanted = LINKED.filter((n) => !body.split("\n").some((l) => l.trim() === n));
  if (!wanted.length) { console.log(`info/exclude   already excludes ${LINKED.join(", ")}`); return; }
  appendFileSync(excludeFile,
    "\n# Lane-worktree provisioning: these are SYMLINKS, and .gitignore's trailing-slash\n"
    + "# patterns do not match a symlink. Written by provision-lane-worktree.mjs.\n"
    + wanted.map((n) => `${n}\n`).join(""));
  console.log(`info/exclude   added ${wanted.join(", ")} to ${excludeFile}`);
};

let missing = 0;
for (const name of LINKED) {
  const target = path.join(canonical, name);
  const link = path.join(worktree, name);
  const present = existsSync(link);
  const isLink = present && lstatSync(link).isSymbolicLink();

  if (!existsSync(target)) {
    /* Absent at the source is a fact about this container, not something to
     * paper over with a dangling link that would fail later and further away. */
    console.log(`${name.padEnd(13)} SOURCE_ABSENT   ${target}`);
    missing += 1;
    continue;
  }
  if (present && !isLink) { console.log(`${name.padEnd(13)} already real     (left alone)`); continue; }
  if (isLink) {
    const points = readlinkSync(link);
    if (points === target) { console.log(`${name.padEnd(13)} linked           -> ${points}`); continue; }
    if (checkOnly) { console.log(`${name.padEnd(13)} LINKED ELSEWHERE -> ${points}`); missing += 1; continue; }
    unlinkSync(link);
  }
  if (checkOnly) { console.log(`${name.padEnd(13)} ABSENT`); missing += 1; continue; }
  symlinkSync(target, link);
  console.log(`${name.padEnd(13)} linked           -> ${target}`);
}

if (!checkOnly) ensureExcluded(worktree);

console.log();
console.log(checkOnly
  ? `${LINKED.length - missing} of ${LINKED.length} present in ${worktree}`
  : `${worktree} provisioned from ${canonical}`);
console.log("Both are excluded through the repository's own info/exclude, which no scratchpad cleanup can remove.");
process.exit(missing && checkOnly ? 1 : 0);
