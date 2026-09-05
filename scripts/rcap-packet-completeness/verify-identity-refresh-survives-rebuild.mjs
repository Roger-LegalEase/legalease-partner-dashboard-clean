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
      found.set(`${n[key]}::${n.identityRefresh.was?.sha256 ?? ""}`, { path: n[key], was: n.identityRefresh.was?.sha256 ?? null });
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
for (const rel of receipts) {
  let head;
  try { head = JSON.parse(execFileSync("git", ["show", `${AGAINST}:${rel}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 })); }
  catch { continue; /* new file at this ref: nothing could have been lost */ }
  const before = refreshesIn(head);
  if (before.size === 0) { checked++; continue; }
  withRefresh++;
  checked++;
  let now;
  try { now = JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")); }
  catch { lost.push({ rel, why: "unreadable in the working tree", annotations: [...before.values()] }); continue; }
  const after = refreshesIn(now);
  const gone = [...before.keys()].filter((k) => !after.has(k));
  if (gone.length) lost.push({ rel, why: `${gone.length} of ${before.size} identityRefresh annotation(s) dropped`, annotations: gone.map((k) => before.get(k)) });
}

console.log(`receipts compared against ${AGAINST}: ${checked} · carrying an identityRefresh: ${withRefresh}`);
if (lost.length === 0) {
  console.log("EVERY_IDENTITY_REFRESH_SURVIVED");
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
