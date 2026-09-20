#!/usr/bin/env node
// Exercise F37's actual check against bounded in-memory records. These are
// synthetic engineering controls; no packet receives an acceptance verdict.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DIR = "data/rcap-grade-a/packet-factory-24h";
const source = fs.readFileSync(path.join(ROOT, "scripts/grade-a-packet-factory-24h/verify.mjs"), "utf8");
const start = source.indexOf("  // A STOPPED builder row");
const end = source.indexOf("  // 1. duplicate families", start);
assert.ok(start >= 0 && end > start, "F37 check boundaries exist");
const checkSource = source.slice(start, end);
const familyId = "fixture-family";
const stopped = { itemId: familyId, status: "STOPPED", blocker: "BLOCKED_SOURCE" };
const stopPath = `${DIR}/pf01/rows.json`;
const passPath = `${DIR}/vf01/rows.json`;
const pass = {
  familyId, isIndependentVerification: true, superseded: false,
  verdict: "PASS_COMPLETE_INDEPENDENT", lane: "vf01", verifiedAtBase: "abcdef123", evidencePath: passPath
};

function evaluate({ extraDocuments = {}, verdict = null, selected = verdict,
  history = { rows: [stopped] }, state = "VERIFY_PENDING", evidenceExists = true, ancestor = true } = {}) {
  const documents = {
    [stopPath]: { rows: [stopped] },
    [`${DIR}/VERIFIER_RETURNS.json`]: { rows: verdict ? [verdict] : [] },
    ...(evidenceExists ? { [passPath]: { rows: [verdict] } } : {}),
    ...extraDocuments
  };
  const relative = (file) => path.relative(ROOT, String(file));
  const fixtureFs = {
    readdirSync(file, options) {
      const rel = relative(file);
      const children = [...new Set(Object.keys(documents).filter((name) => name.startsWith(`${rel}/`))
        .map((name) => name.slice(rel.length + 1).split("/")[0]))];
      return options?.withFileTypes
        ? children.map((name) => ({ name, isDirectory: () => Object.keys(documents).some((entry) => entry.startsWith(`${rel}/${name}/`)) }))
        : children;
    },
    existsSync: (file) => Object.hasOwn(documents, relative(file))
  };
  const family = { familyId, state, selectedIndependentVerdict: selected };
  let result;
  vm.runInNewContext(checkSource, {
    ROOT, DIR, path, fs: fixtureFs, familyById: new Map([[familyId, family]]),
    read: (file) => {
      if (!Object.hasOwn(documents, file)) throw new Error("fixture file absent");
      return structuredClone(documents[file]);
    },
    gitOk: () => ancestor,
    execFileSync: () => {
      if (history === null) throw new Error("historical source unavailable");
      return JSON.stringify(history);
    },
    check: (id, title, ok, observed) => { assert.equal(id, "F37"); result = { ok, observed }; }
  });
  assert.ok(result, "F37 executed");
  return result.ok;
}

assert.equal(evaluate(), false, "auditable stopped WIP is not a completed build");
assert.equal(evaluate({ state: "SOURCE_READY" }), true, "a stopped build may remain queued for construction");
assert.equal(evaluate({ extraDocuments: {
  [`${DIR}/pf02/rows.second-cohort.json`]: { rows: [{ itemId: familyId, status: "COMPLETED" }] }
} }), true, "a completed alternate-file PF return supersedes the earlier stop");
assert.equal(evaluate({ extraDocuments: {
  [`${DIR}/pf02/PFB_SHIFT_RETURN.json`]: { rows: [{ familyId, status: "COMPLETED" }] }
} }), true, "the existing familyId alias is retained");
assert.equal(evaluate({ extraDocuments: {
  [`${DIR}/pf02/notes.json`]: { itemId: familyId, status: "COMPLETED" },
  [`${DIR}/pf02/malformed.json`]: { rows: [{ itemId: familyId, status: "COMPLETED" }, {}] },
  [`${DIR}/fix01/rows.json`]: { rows: [{ itemId: familyId, status: "COMPLETED" }] },
  [`${DIR}/pf02/unrelated.json`]: { rows: [{ itemId: "another-family", status: "COMPLETED" }] }
} }), false, "notes, malformed arrays, unrelated completion, and repair labels do not clear stopped builds");
assert.equal(evaluate({ verdict: pass }), true, "a matched independent PASS after the exact stop supersedes it");
for (const fixture of [
  { verdict: { ...pass, isIndependentVerification: false } },
  { verdict: { ...pass, superseded: true } },
  { verdict: pass, selected: { ...pass, lane: "another-reader" } },
  { verdict: pass, history: { rows: [{ ...stopped, blocker: "an older stop" }] } },
  { verdict: pass, history: null },
  { verdict: pass, evidenceExists: false },
  { verdict: { ...pass, evidencePath: undefined } },
  { verdict: pass, ancestor: false },
  { verdict: { ...pass, verifiedAtBase: "unverified-base" } }
]) assert.equal(evaluate(fixture), false, "unbound, stale, or unorderable passes cannot clear stopped WIP");
console.log("F37 regression: 4 positive and 11 refusal controls passed; no repository files written.");
