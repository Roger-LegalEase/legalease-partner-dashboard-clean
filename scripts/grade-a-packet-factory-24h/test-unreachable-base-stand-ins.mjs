#!/usr/bin/env node
// Verifier reads whose declared base exists in no reachable history are ordered
// by an explicit stand-in (UNREACHABLE_VERIFIER_BASES.json). These controls run
// the extractor's own record-validation and supersession source against fixture
// rows, the way test-stopped-build-returns.mjs runs verify.mjs, so a change that
// drops the stand-in or silences a bad record entry fails here, not in a flipped
// verdict. Nothing is written to the repository.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(ROOT, "scripts/grade-a-packet-factory-24h/extract-verifier-returns.mjs"), "utf8");
const slice = (startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `${startMarker.slice(0, 30)}... boundaries exist`);
  return source.slice(start, end);
};
const recordSource = slice("const UNREACHABLE_BASES =", "// An entry that matches no extracted row");
const matchSource = slice("// An entry that matches no extracted row", "/*\n * Only the base a lane DECLARES");
const selectSource = slice("const supersedes = (r, prior) => {", "/*\n * AN ENVIRONMENT-SCOPED SOURCE REFUSAL");

// Tiny history: B -> S -> H, with X unreachable (a never-pushed worker commit).
const parents = { S: ["B"], H: ["S"] };
const ancestors = (c) => { const out = new Set(); const walk = (x) => (parents[x] ?? []).forEach((p) => { out.add(p); walk(p); }); walk(c); return out; };
const isAncestorOf = (a, b) => a !== b && ancestors(b).has(a);
const isCommit = (s) => typeof s === "string" && /^[A-Z]$/.test(s);
const reachable = new Set(["B", "S", "H"]);
const execFileSync = (cmd, args) => {
  assert.ok(cmd === "git" && args[0] === "merge-base" && args[1] === "--is-ancestor", "only the ancestry probe is expected");
  if (!reachable.has(args[2]) || !isAncestorOf(args[2], "H") && args[2] !== "H") throw new Error("not an ancestor");
  return "";
};
const RECORD = "data/rcap-grade-a/packet-factory-24h/UNREACHABLE_VERIFIER_BASES.json";
const evidence = "data/rcap-grade-a/packet-factory-24h/vf02/rows-fixture.json";
const absentRow = { lane: "vf02", familyId: "fx-set", verdict: "PASS_COMPLETE_INDEPENDENT", verifiedAtBase: "X", evidencePath: evidence, isIndependentVerification: true };
const blockedRow = { lane: "vf02", familyId: "fx-set", verdict: "BLOCKED_SOURCE", verifiedAtBase: "B", evidencePath: "data/rcap-grade-a/packet-factory-24h/vf02/rows-older.json", isIndependentVerification: true };
const freshRow = { lane: "vf01", familyId: "fx-set", verdict: "FAIL_REPAIR_REQUIRED", verifiedAtBase: "H", evidencePath: "data/rcap-grade-a/packet-factory-24h/vf01/rows-fresh.json", isIndependentVerification: true };
let checks = 0;
const check = (ok, title) => { assert.ok(ok, title); checks++; };

function standIns(record, rows, files = [evidence]) {
  const context = {
    ROOT, path, isCommit, execFileSync, rows, Map, Set, JSON, Error, Number,
    fs: { existsSync: (file) => file === path.join(ROOT, RECORD) ? record !== null : files.includes(path.relative(ROOT, file)),
      readFileSync: () => typeof record === "string" ? record : JSON.stringify(record) }
  };
  vm.runInNewContext(`${recordSource}\n${matchSource}\n__result(standInBase);`, { ...context, __result: (m) => { context.result = m; } });
  return context.result;
}
const goodRecord = { schemaVersion: "rcap-unreachable-verifier-bases/v1", rows: [{ verifiedAtBase: "X", evidencePath: evidence, standInBase: "S" }] };

// Record validation: exact and loud.
check(standIns(goodRecord, [absentRow, blockedRow]).get(`X\0${evidence}`) === "S", "a valid entry yields its stand-in");
check(standIns(null, [absentRow]).size === 0, "no record means no stand-ins");
assert.throws(() => standIns("{not json", [absentRow]), SyntaxError, "a malformed record fails before any output"); checks++;
assert.throws(() => standIns({ ...goodRecord, schemaVersion: "other" }, [absentRow]), /unknown schemaVersion/); checks++;
assert.throws(() => standIns({ ...goodRecord, rows: [{ ...goodRecord.rows[0], verifiedAtBase: "B" }] }, [{ ...absentRow, verifiedAtBase: "B" }]), /reachable from HEAD again/); checks++;
assert.throws(() => standIns({ ...goodRecord, rows: [{ ...goodRecord.rows[0], standInBase: "Q" }] }, [absentRow]), /not an ancestor of HEAD/); checks++;
assert.throws(() => standIns(goodRecord, [absentRow], []), /no longer exists/); checks++;
assert.throws(() => standIns(goodRecord, [blockedRow]), /matches 0 extracted row/); checks++;
assert.throws(() => standIns(goodRecord, [absentRow, absentRow]), /matches 2 extracted row/); checks++;

// Supersession: the stand-in orders the unreachable read; a fresh read still displaces it.
function current(rows, standInBase) {
  const orderingBase = (r) => standInBase.get(`${r.verifiedAtBase}\0${r.evidencePath}`) ?? r.verifiedAtBase;
  const lanePrecedence = (r) => Number(r.lane.replace(/\D/g, ""));
  let result;
  vm.runInNewContext(`${selectSource}\n__result(current);`, { rows, isAncestorOf, orderingBase, isCommit, lanePrecedence,
    NON_READING: new Set(["BLOCKED_BEFORE_CLAIM", "STOPPED", "COMPLETED"]), Map, Set, __result: (m) => { result = m; } });
  return result.get("fx-set");
}
const withStandIn = standIns(goodRecord, [absentRow, blockedRow, freshRow]);
check(current([blockedRow, absentRow], withStandIn).verdict === "PASS_COMPLETE_INDEPENDENT", "the unreachable read supersedes an older present read through its stand-in");
check(current([absentRow, blockedRow], withStandIn).verdict === "PASS_COMPLETE_INDEPENDENT", "...regardless of sweep order");
check(current([blockedRow, absentRow], new Map()).verdict === "BLOCKED_SOURCE", "without a stand-in the same pair falls to lane precedence (the defect the record exists to prevent)");
check(current([absentRow, blockedRow, freshRow], withStandIn).verdict === "FAIL_REPAIR_REQUIRED", "a fresh read at HEAD displaces the stand-in row");

// A multi-row evidence file (one lane's return of many families read at one unreachable base) declares rowCount.
const secondRow = { ...absentRow, familyId: "fx2-set" };
const multiRecord = { schemaVersion: "rcap-unreachable-verifier-bases/v1", rows: [{ verifiedAtBase: "X", evidencePath: evidence, standInBase: "S", rowCount: 2 }] };
const multi = standIns(multiRecord, [absentRow, secondRow, blockedRow]);
check(multi.get(`X\0${evidence}`) === "S", "a multi-row entry yields its stand-in");
check(current([blockedRow, absentRow], multi).verdict === "PASS_COMPLETE_INDEPENDENT", "each row of the multi-row file is ordered by the stand-in");
check(current([absentRow, blockedRow, freshRow], multi).verdict === "FAIL_REPAIR_REQUIRED", "a fresh read still displaces a multi-row stand-in row");
assert.throws(() => standIns(multiRecord, [absentRow]), /matches 1 extracted row\(s\), not 2/); checks++;
assert.throws(() => standIns(multiRecord, [absentRow, secondRow, { ...absentRow, familyId: "fx3-set" }]), /matches 3 extracted row\(s\), not 2/); checks++;
for (const rowCount of [0, 1.5, "2"]) {
  assert.throws(() => standIns({ ...multiRecord, rows: [{ ...multiRecord.rows[0], rowCount }] }, [absentRow, secondRow]), /rowCount must be a positive integer/); checks++;
}
check(current([freshRow, absentRow, blockedRow], withStandIn).verdict === "FAIL_REPAIR_REQUIRED", "...regardless of sweep order");
console.log(`unreachable-base stand-ins: ${checks} controls passed; no repository files written.`);
