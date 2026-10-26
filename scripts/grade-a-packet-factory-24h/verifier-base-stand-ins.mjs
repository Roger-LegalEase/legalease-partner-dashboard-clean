/*
 * VERIFIER BASES THAT NO PUSHED HISTORY HOLDS (UNREACHABLE_VERIFIER_BASES.json).
 *
 * A row may declare a base that only a local object store ever had. Every reader
 * that asks git about such a base -- ancestry, existence, bytes at the base, a
 * diff since it -- must get the same answer in CI as locally, so all of them ask
 * here. Two kinds of entry:
 *  - first_commit_that_added_the_evidence_file: a later stand-in, reviewed for the
 *    extractor's ordering only. Other readers leave such a base unresolved, as
 *    they always have.
 *  - pushed_parent_tree_with_overrides: the base's tree is its pushed parent's tree
 *    with the listed paths taken from another pushed commit. It stands in for
 *    ordering and for content, so every reader resolves it.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const UNREACHABLE_BASES = "data/rcap-grade-a/packet-factory-24h/UNREACHABLE_VERIFIER_BASES.json";
export const CONTENT_KIND = "pushed_parent_tree_with_overrides";
const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const isCommit = (s) => typeof s === "string" && /^[0-9a-f]{7,40}$/.test(s);

export function loadStandIns({ root = ROOT, git = execFileSync, files = fs, commitShaped = isCommit } = {}) {
  // Reachability from HEAD, not mere object existence: a dangling worker object must not read as "reachable again",
  // and a stand-in on a side branch could validate yet never order a fresh read.
  const reachableFromHead = (c) => { try { git("git", ["merge-base", "--is-ancestor", c, "HEAD"], { cwd: root, stdio: "ignore" }); return true; } catch { return false; } };
  const byKey = new Map(), byBase = new Map();
  if (!files.existsSync(path.join(root, UNREACHABLE_BASES))) return { byKey, byBase };
  const record = JSON.parse(files.readFileSync(path.join(root, UNREACHABLE_BASES), "utf8"));
  if (record.schemaVersion !== "rcap-unreachable-verifier-bases/v1") throw new Error(`${UNREACHABLE_BASES}: unknown schemaVersion`);
  for (const row of record.rows) {
    if (!commitShaped(row.verifiedAtBase) || !commitShaped(row.standInBase)) throw new Error(`${UNREACHABLE_BASES}: ${row.evidencePath}: bases must be commit-shaped`);
    if (reachableFromHead(row.verifiedAtBase)) throw new Error(`${UNREACHABLE_BASES}: ${row.verifiedAtBase} is reachable from HEAD again; remove its stale entry`);
    if (!reachableFromHead(row.standInBase)) throw new Error(`${UNREACHABLE_BASES}: stand-in ${row.standInBase} is not an ancestor of HEAD`);
    if (!files.existsSync(path.join(root, row.evidencePath))) throw new Error(`${UNREACHABLE_BASES}: ${row.evidencePath} no longer exists; a moved return would silently lose its stand-in`);
    if (row.rowCount !== undefined && !(Number.isInteger(row.rowCount) && row.rowCount > 0)) throw new Error(`${UNREACHABLE_BASES}: ${row.evidencePath}: rowCount must be a positive integer`);
    if (row.standInKind === CONTENT_KIND) {
      const o = row.treeOverrides;
      if (!o || !commitShaped(o.commit) || !Array.isArray(o.paths) || !o.paths.every((p) => typeof p === "string" && p)) throw new Error(`${UNREACHABLE_BASES}: ${row.evidencePath}: ${CONTENT_KIND} needs treeOverrides {commit, paths}`);
      if (!reachableFromHead(o.commit)) throw new Error(`${UNREACHABLE_BASES}: override commit ${o.commit} is not an ancestor of HEAD`);
    }
    const entry = { standInBase: row.standInBase, rowCount: row.rowCount ?? 1, kind: row.standInKind ?? null, overrides: row.treeOverrides ?? null };
    byKey.set(`${row.verifiedAtBase}\0${row.evidencePath}`, entry);
    const prior = byBase.get(row.verifiedAtBase);
    const same = (a, b) => a.standInBase === b.standInBase && a.kind === b.kind && JSON.stringify(a.overrides) === JSON.stringify(b.overrides);
    if (prior && !same(prior, entry)) throw new Error(`${UNREACHABLE_BASES}: base ${row.verifiedAtBase} has entries that disagree on its stand-in`);
    byBase.set(row.verifiedAtBase, entry);
  }
  return { byKey, byBase };
}

// An entry that matches no extracted row (a typo, a moved return) would be silently unused and the family would
// fall back to lane precedence; require exactly the declared number of matches (one unless rowCount says otherwise).
export function assertStandInMatches(standIns, rows) {
  for (const [key, entry] of standIns.byKey) {
    const matches = rows.filter((r) => `${r.verifiedAtBase}\0${r.evidencePath}` === key).length;
    if (matches !== entry.rowCount) throw new Error(`${UNREACHABLE_BASES}: entry ${key.split("\0").join(" @ ")} matches ${matches} extracted row(s), not ${entry.rowCount === 1 ? "one" : entry.rowCount}`);
  }
}

let loaded = null;
const current = () => (loaded ??= loadStandIns());
const contentEntry = (base) => { const e = current().byBase.get(base); return e?.kind === CONTENT_KIND ? e : null; };

// The pushed commit a base stands as for ancestry and existence questions (any base without a content entry: itself).
export const pushedEquivalent = (base) => contentEntry(base)?.standInBase ?? base;
// The pushed commit holding `p` exactly as it was at `base`.
export const contentCommit = (base, p) => { const e = contentEntry(base); return !e ? base : e.overrides.paths.includes(p) ? e.overrides.commit : e.standInBase; };
// A base to diff `pathspecs` from: its stand-in when no pathspec can reach an overridden path; else null (unanswerable).
export const diffBase = (base, pathspecs) => {
  const e = contentEntry(base);
  if (!e) return base;
  const reaches = (spec) => !spec.startsWith(":(exclude)") && e.overrides.paths.some((p) => p === spec || p.startsWith(`${spec.replace(/\/$/, "")}/`) || spec === "." || spec === "");
  return pathspecs.some(reaches) ? null : e.standInBase;
};
