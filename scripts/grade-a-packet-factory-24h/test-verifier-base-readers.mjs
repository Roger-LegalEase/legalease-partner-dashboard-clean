#!/usr/bin/env node
// Every reader that asks git about a row's (or a ledger's) base resolves an unreachable one through
// verifier-base-stand-ins.mjs, so CI (no object) and a local store (object present) give the same answer.
// (1) helper semantics on a fixture record, (2) the committed record's content claim, proven where the
// object exists, (3) each reader found routes through the helper and keeps no raw base call. Read-only.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadStandIns, pushedEquivalent, contentCommit, diffBase, CONTENT_KIND, UNREACHABLE_BASES } from "./verifier-base-stand-ins.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
let checks = 0; const check = (ok, title) => { assert.ok(ok, title); checks++; };

// (1) Fixture record: P is pushed, X/Y unreachable; X is content-equivalent to P except one path taken from O.
const reachable = new Set(["P", "O", "S", "H"]);
const fakeGit = (cmd, args) => { if (!(cmd === "git" && args[1] === "--is-ancestor" && reachable.has(args[2]))) throw new Error("not an ancestor"); return ""; };
const record = { schemaVersion: "rcap-unreachable-verifier-bases/v1", rows: [
  { verifiedAtBase: "X", evidencePath: "e/x.json", standInBase: "P", standInKind: CONTENT_KIND, treeOverrides: { commit: "O", paths: ["data/census/out.json"] }, rowCount: 2 },
  { verifiedAtBase: "Y", evidencePath: "e/y.json", standInBase: "S", standInKind: "first_commit_that_added_the_evidence_file" }] };
const fakeFs = { existsSync: () => true, readFileSync: () => JSON.stringify(record) };
const loaded = loadStandIns({ root: ROOT, git: fakeGit, files: fakeFs, commitShaped: (s) => /^[A-Z]$/.test(s) });
check(loaded.byBase.get("X").kind === CONTENT_KIND && loaded.byKey.get("Y\0e/y.json").standInBase === "S", "the fixture record loads both kinds");
const disagree = structuredClone(record); disagree.rows.push({ ...record.rows[0], evidencePath: "e/x2.json", standInBase: "S" });
assert.throws(() => loadStandIns({ root: ROOT, git: fakeGit, files: { ...fakeFs, readFileSync: () => JSON.stringify(disagree) }, commitShaped: (s) => /^[A-Z]$/.test(s) }), /disagree on its stand-in/); checks++;
const noOverrides = structuredClone(record); delete noOverrides.rows[0].treeOverrides;
assert.throws(() => loadStandIns({ root: ROOT, git: fakeGit, files: { ...fakeFs, readFileSync: () => JSON.stringify(noOverrides) }, commitShaped: (s) => /^[A-Z]$/.test(s) }), /needs treeOverrides/); checks++;

// (2) The committed record, through the live helper.
const live = loadStandIns();
const content = [...live.byBase].filter(([, e]) => e.kind === CONTENT_KIND);
check(content.length >= 1, "the committed record carries a content-equivalent entry");
for (const [base, e] of content) {
  check(pushedEquivalent(base) === e.standInBase, `${base.slice(0, 9)} orders as its stand-in`);
  for (const p of e.overrides.paths) check(contentCommit(base, p) === e.overrides.commit, `${p} is read from the override commit`);
  check(contentCommit(base, "data/rcap-all50/overlays/census-v1/wa/x") === e.standInBase, "any other path is read from the stand-in");
  check(diffBase(base, [path.dirname(e.overrides.paths[0])]) === null, "a pathspec reaching an override is unanswerable");
  check(diffBase(base, ["data/rcap-all50/overlays", ":(exclude)data/rcap-all50/overlays/x"]) === e.standInBase, "family pathspecs diff from the stand-in");
  let present = false; try { git("cat-file", "-e", `${base}^{commit}`); present = true; } catch { /* CI: the object is absent, which is the point */ }
  if (present) {
    check(git("diff", "--name-only", e.standInBase, base).split("\n").filter(Boolean).sort().join("\n") === [...e.overrides.paths].sort().join("\n"), `${base.slice(0, 9)}'s tree is its stand-in's except the overrides`);
    for (const p of e.overrides.paths) check(git("rev-parse", `${base}:${p}`) === git("rev-parse", `${e.overrides.commit}:${p}`), `${p} is byte-identical at the override commit`);
  } else console.log(`note: ${base.slice(0, 12)} is absent here; its tree claim was proven where it exists`);
}
for (const [base, e] of live.byBase) if (e.kind !== CONTENT_KIND) {
  check(pushedEquivalent(base) === base && contentCommit(base, "x") === base && diffBase(base, ["x"]) === base, `${base.slice(0, 9)} (ordering-only) stays unresolved for readers, as before`);
}
check(pushedEquivalent("0".repeat(40)) === "0".repeat(40), "a base not in the record is itself");

// (3) The readers found (grep of scripts/ for merge-base / cat-file / show / diff on a row or ledger base).
const D = "scripts/grade-a-packet-factory-24h/";
const READERS = {
  "extract-verifier-returns.mjs": { must: ["loadStandIns({ root: ROOT })", "assertStandInMatches(standIns, rows)"] },
  "generate.mjs": { must: ["pushedEquivalent(candidateBase)", "pushedEquivalent(base)}^{commit}", "contentCommit(base, candidate.evidencePath)", "diffBase(base, pathsOf())", "diffBase(declaredBase, [directory])", "diffBase(base, [rel])"],
    raw: [/"--quiet", base, "HEAD"/, /"--name-only", base, "HEAD", "--", directory,/, /`\$\{base\}:\$\{candidate\.evidencePath\}`/, /`\$\{base\}\^\{commit\}`/] },
  "verify.mjs": { must: ["pushedEquivalent(base)}^{commit}", "contentCommit(base, candidate.evidencePath)", "diffBase(base, paths)", "pushedEquivalent(pass.verifiedAtBase)", "contentCommit(pass.verifiedAtBase, rowsPath)"],
    raw: [/`\$\{base\}\^\{commit\}`/, /`\$\{base\}:\$\{candidate\.evidencePath\}`/, /"--quiet", base, "HEAD"/, /"--is-ancestor", pass\.verifiedAtBase/, /`\$\{pass\.verifiedAtBase\}:/] },
  "wa-sud-custom-mapping.mjs": { must: ["contentCommit(base, p)", "pushedEquivalent(selected.verifiedAtBase)", "pushedEquivalent(bindingRow.verifiedAtBase)"],
    raw: [/'--is-ancestor', row\.verifiedAtBase/, /'--is-ancestor', bindingRow\.verifiedAtBase/, /, bindingRow\.verifiedAtBase\]\)/, /`\$\{base\}:\$\{p\}`/] },
  "legal-block-resolution.mjs": { must: ["contentCommit(verifiedAtBase, recordPath)"], raw: [/`\$\{verifiedAtBase\}:\$\{recordPath\}`/] },
  "claim.mjs": { must: ["pushedEquivalent(ledger.generatedAtCommit)"], raw: [/`\$\{ledger\.generatedAtCommit\}\^\{commit\}`/] }
};
for (const [file, { must, raw = [] }] of Object.entries(READERS)) {
  const src = fs.readFileSync(path.join(ROOT, D, file), "utf8");
  for (const m of must) check(src.includes(m), `${file} routes through the helper: ${m}`);
  for (const r of raw) check(!r.test(src), `${file} keeps no raw base call matching ${r}`);
}
console.log(`verifier-base readers: ${checks} checks passed; record ${UNREACHABLE_BASES}; no repository files written.`);
