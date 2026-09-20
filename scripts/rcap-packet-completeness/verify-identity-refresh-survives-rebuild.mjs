#!/usr/bin/env node
/**
 * A rebuild must not silently erase an identityRefresh annotation.
 *
 * A source receipt is regenerated wholesale by its builder. An identityRefresh
 * block is written by hand, by a repair lane that recovered a historical blob,
 * compared the anchored entries object-for-object and recorded that the bound
 * content did not move. The builder knows nothing about it, so a plain rebuild
 * drops it -- and the family's verification lapses again on the next run, with
 * no diff a reader would notice and nothing saying why.
 *
 * This is not hypothetical. Seventeen families were restored to
 * COMPLETE_PACKET_PROVEN on exactly those annotations, and the lane that found
 * this had four of them erased under it by a rebuild it performed itself; it
 * restored them by hand. Any rebuild of any of those seventeen would undo the
 * repair without a word.
 *
 * So: compare every source receipt in the working tree against the same file at
 * HEAD, and fail on any identityRefresh that HEAD carries and the tree does not.
 * It says nothing about whether a refresh is CORRECT -- only that a rebuild did
 * not throw one away.
 *
 *   node scripts/rcap-packet-completeness/verify-identity-refresh-survives-rebuild.mjs
 *   node ... --against <ref>     compare against a ref other than HEAD
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const AGAINST = (() => { const i = argv.indexOf("--against"); return i === -1 ? "HEAD" : argv[i + 1]; })();

/* Every path with a pin carrying a refresh, keyed so the same record under a
 * different container still compares. Walk by shape: pins hide under at least
 * nine path keys across nineteen container names. */
const PATH_KEYS = ["pathInRepository", "path", "pathInPack", "pathInArchive", "recordPath", "record", "file", "declaredPath", "sourcePath", "custodyPath"];
const refreshesIn = (doc) => {
  const found = new Map();
  const walk = (n) => {
    if (Array.isArray(n)) { for (const x of n) walk(x); return; }
    if (!n || typeof n !== "object") return;
    const key = PATH_KEYS.find((k) => typeof n[k] === "string");
    if (key && n.identityRefresh && typeof n.identityRefresh === "object") {
      found.set(`${n[key]}::${n.identityRefresh.was?.sha256 ?? ""}`, {
        path: n[key],
        was: n.identityRefresh.was?.sha256 ?? null,
        /* The pin the annotation sits beside: the identity the recorded move
         * ENDS at. A later re-anchor's `was` is exactly this value, which is
         * what lets a continued chain be told from an erasure. */
        writtenAgainst: typeof n.sha256 === "string" ? n.sha256 : null
      });
    }
    for (const v of Object.values(n)) walk(v);
  };
  walk(doc);
  return found;
};

const receipts = execFileSync("git", ["ls-files", "data/rcap-all50/overlays/census-v1/*/*/source-receipt.json"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 })
  .trim().split("\n").filter(Boolean);
if (receipts.length === 0) throw new Error("git ls-files matched zero source receipts; the denominator is broken, not the tree");

let checked = 0, withRefresh = 0;
const lost = [];
const notMeasured = [];
for (const rel of receipts) {
  let head;
  try { head = JSON.parse(execFileSync("git", ["show", `${AGAINST}:${rel}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 })); }
  catch { continue; /* new file at this ref: nothing could have been lost */ }
  const before = refreshesIn(head);
  if (before.size === 0) { checked++; continue; }
  withRefresh++;
  checked++;
  /*
   * A file that is not on disk was not rebuilt -- it was never checked out.
   * Sparse checkout has caught seven lanes in this operation, one of them with
   * 4,587 of 15,725 files present, and against that tree this check reported 49
   * receipts as ERASED BY A REBUILD when nothing had been rebuilt at all. A
   * check that cries wolf 49 times under a common condition teaches its readers
   * to ignore it, which costs more than the defect it was written for.
   *
   * So absence is reported as a hole in the MEASUREMENT, not as a finding, and
   * the exit code turns only on annotations that were genuinely dropped from a
   * file that is present.
   */
  const absolute = path.join(ROOT, rel);
  if (!fs.existsSync(absolute)) { notMeasured.push({ rel, why: "not present in the working tree; a file that was never checked out was never rebuilt" }); continue; }
  let now;
  try { now = JSON.parse(fs.readFileSync(absolute, "utf8")); }
  catch (e) { notMeasured.push({ rel, why: `present but unreadable (${e.message.slice(0, 60)}); this check cannot tell a truncated checkout from a rebuild` }); continue; }
  const after = refreshesIn(now);
  /*
   * A RE-ANCHOR IS NOT AN ERASURE, AND THIS USED TO REPORT IT AS ONE.
   *
   * The key is `path::was.sha256`, so the ONLY correct repair for a pin whose
   * shared record drifted again -- re-do the anchor comparison and write a
   * fresh annotation, which this module's own failure text asks for in as many
   * words -- necessarily changes `was` and therefore changes the key. Two
   * families re-anchored on 2026-09-10 were reported here as annotations
   * ERASED BY A REBUILD when both carried a fresh annotation continuing the
   * same chain. A check that fails the one repair it asks for teaches its
   * readers to ignore it, which is the cost its own sparse-checkout comment
   * names.
   *
   * So a dropped annotation is EXCUSED when the receipt still carries an
   * annotation AT THE SAME PATH whose `was.sha256` is the identity the dropped
   * annotation ended at -- the chain continues through it, and a human did the
   * comparison across the second move. Nothing else is excused: a path left
   * with no annotation, or one whose new annotation starts from somewhere else,
   * is still reported.
   */
  const continues = (dropped) => {
    if (!dropped.writtenAgainst) return false;
    return [...after.values()].some((a) => a.path === dropped.path && a.was === dropped.writtenAgainst);
  };
  const gone = [...before.keys()].filter((k) => !after.has(k) && !continues(before.get(k)));
  if (gone.length) lost.push({ rel, why: `${gone.length} of ${before.size} identityRefresh annotation(s) dropped`, annotations: gone.map((k) => before.get(k)) });
}

console.log(`receipts compared against ${AGAINST}: ${checked} · carrying an identityRefresh: ${withRefresh}`);
if (notMeasured.length) {
  console.log(`\nNOT MEASURED: ${notMeasured.length} receipt(s) carrying an annotation are not readable here, so this run says nothing about them.`);
  for (const n of notMeasured.slice(0, 5)) console.log(`  ${n.rel}\n    ${n.why}`);
  if (notMeasured.length > 5) console.log(`  ... and ${notMeasured.length - 5} more`);
  console.log("  If that is a sparse checkout, disable it and re-run before trusting this result.");
}
if (lost.length === 0) {
  console.log(notMeasured.length ? `EVERY_IDENTITY_REFRESH_SURVIVED_WHERE_MEASURABLE (${notMeasured.length} not measured)` : "EVERY_IDENTITY_REFRESH_SURVIVED");
  process.exit(0);
}
console.log(`\nERASED BY A REBUILD: ${lost.length} receipt(s)`);
for (const l of lost) {
  console.log(`  ${l.rel}`);
  console.log(`    ${l.why}`);
  for (const a of l.annotations) console.log(`    lost: ${a.path} (was ${String(a.was).slice(0, 16)})`);
}
console.log("\nEach one is a repair undone in silence. Restore the annotation verbatim from the ref above, or re-do the anchor comparison and write a fresh one -- do not leave the receipt without it.");
process.exit(1);
