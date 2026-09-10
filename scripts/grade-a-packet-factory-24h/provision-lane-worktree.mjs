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
import { existsSync, lstatSync, symlinkSync, unlinkSync, readlinkSync } from "node:fs";
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

console.log();
console.log(checkOnly
  ? `${LINKED.length - missing} of ${LINKED.length} present in ${worktree}`
  : `${worktree} provisioned from ${canonical}`);
console.log(`Both are gitignored, so nothing here can be committed by the lane.`);
process.exit(missing && checkOnly ? 1 : 0);
