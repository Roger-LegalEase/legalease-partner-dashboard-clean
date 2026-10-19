#!/usr/bin/env node
// A legally cleared product-path hold advances on a decision-aware independent read that passes the packet or
// sends it to repair; a source or legal refusal, a read that did not see the clearing record, or an unready
// source gate does not. Exercised on the real KS families and resolution; only clones are mutated.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sourceDispositionAdvancement } from "./source-disposition-advancement.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const master = read("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json");
const reconciled = read("data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json").reconciliation42.families;
let checks = 0;
for (const familyId of ["ks-21-6614-prostitution-coercion-set", "ks-22-4908-registration-relief-set"]) {
  const row = reconciled.find((r) => r.familyId === familyId);
  const family = master.families.find((f) => f.familyId === familyId);
  assert.equal(row?.disposition, "PRODUCT_PATH_PENDING", `${familyId} is governed as a product-path hold`);
  assert.equal(family?.currentLegalResolution?.disposition, "LEGAL_CLEAR");
  const withVerdict = (verdict, patch = {}) => { const f = structuredClone(family); f.selectedIndependentVerdict = { ...f.selectedIndependentVerdict, verdict }; return Object.assign(f, patch); };
  for (const verdict of ["PASS_COMPLETE_INDEPENDENT", "FAIL_REPAIR_REQUIRED"]) {
    const a = sourceDispositionAdvancement(ROOT, row, withVerdict(verdict));
    assert.equal(a?.effectiveDisposition, "SOURCE_READY", `${familyId}: a decision-aware ${verdict} read advances the cleared hold`); checks++;
    assert.equal(a.decisionId, family.currentLegalResolution.decisionId); checks++;
  }
  for (const verdict of ["BLOCKED_SOURCE", "BLOCKED_LEGAL_INPUT", "PRODUCT_PATH_PENDING"]) {
    assert.equal(sourceDispositionAdvancement(ROOT, row, withVerdict(verdict)), null, `${familyId}: a ${verdict} read keeps the hold`); checks++;
  }
  const noBase = withVerdict("FAIL_REPAIR_REQUIRED"); noBase.selectedIndependentVerdict.verifiedAtBase = null;
  assert.equal(sourceDispositionAdvancement(ROOT, row, noBase), null, `${familyId}: a read that did not see the clearing record keeps the hold`); checks++;
  assert.equal(sourceDispositionAdvancement(ROOT, row, withVerdict("FAIL_REPAIR_REQUIRED", { sourceReadiness: { ...family.sourceReadiness, ready: false } })), null, `${familyId}: an unready source gate keeps the hold`); checks++;
}
console.log(`source disposition advancement: ${checks} checks passed; no repository files written.`);
