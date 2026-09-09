#!/usr/bin/env node
// A verification return is not always called rows.json, and reading only that
// name made every return that followed its own brief invisible.
//
// Two verification lanes collided by appending to one shared rows.json, so
// every lane brief since tells the lane to write ALONGSIDE under a distinct
// name and leave the existing file byte-for-byte intact. Both instructions are
// right. Together they made the returns unreadable: the extractor swept
// `${lane}/rows.json` and nothing else, so VF05's FAIL_REPAIR_REQUIRED on
// il-seal-3yr-set — three defects measured against the enumerated fields of the
// blank forms — sat in `vf05/rows-vf05-20260909b.json` and moved nothing.
//
// The packet-build side had already fixed exactly this, once, for the same
// reason. This is the same fix on the verification side, and this test is what
// stops it regressing a third time.
//
//   node scripts/grade-a-packet-factory-24h/test-verification-return-filenames.mjs

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const DIR = "data/rcap-grade-a/packet-factory-24h";
const RETURNS = path.join(ROOT, DIR, "VERIFIER_RETURNS.json");

const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };

/** Every verification return on disk that is NOT called rows.json. */
const nonCanonicalReturns = () => {
  const found = [];
  const base = path.join(ROOT, DIR);
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^vf\d+$/.test(entry.name)) continue;
    for (const file of fs.readdirSync(path.join(base, entry.name))) {
      if (!file.endsWith(".json") || file === "rows.json") continue;
      const doc = readJson(path.join(base, entry.name, file));
      const list = Array.isArray(doc) ? doc : doc?.rows;
      if (!Array.isArray(list) || list.length === 0) continue;
      if (!list.every((r) => r && typeof r === "object" && (r.itemId ?? r.familyId) && r.verdict)) continue;
      found.push({ lane: entry.name, file, rows: list });
    }
  }
  return found;
};

let failed = 0;
const check = (name, fn) => { try { fn(); console.log(`  ok   ${name}`); } catch (e) { failed += 1; console.log(`  FAIL ${name}\n         ${e.message}`); } };

console.log("verification returns are found by shape, not by filename\n");

check("at least one verification return is not called rows.json", () => {
  const found = nonCanonicalReturns();
  assert.ok(found.length > 0,
    "no lane has written a return under a distinct name; if every lane now shares one file, the collision rule has been dropped and this test needs re-justifying rather than deleting");
});

check("every such return reaches VERIFIER_RETURNS.json", () => {
  const extracted = readJson(RETURNS);
  assert.ok(extracted, "the extraction has not been run at this head");
  const known = new Set((extracted.rows ?? []).map((r) => `${r.lane}::${r.familyId}`));
  const refused = JSON.stringify(extracted.refusedRows ?? []);
  const missing = [];
  for (const { lane, file, rows } of nonCanonicalReturns()) {
    for (const row of rows) {
      const family = row.itemId ?? row.familyId;
      // A row the extractor deliberately REFUSED is accounted for: it was read
      // and rejected, which is the opposite of invisible.
      if (known.has(`${lane}::${family}`) || refused.includes(family)) continue;
      missing.push(`${lane}/${file} :: ${family}`);
    }
  }
  assert.deepEqual(missing, [], `verification return(s) on disk that the extraction never read: ${missing.join(" | ")}`);
});

check("a return under a distinct name can supersede an older one for the same family", () => {
  // The point of reading these files is that a newer read wins. If the newest
  // row for a family is one of these, it must not be marked superseded by an
  // older one.
  const extracted = readJson(RETURNS);
  const byFamily = new Map();
  for (const r of extracted.rows ?? []) {
    if (!byFamily.has(r.familyId)) byFamily.set(r.familyId, []);
    byFamily.get(r.familyId).push(r);
  }
  let checked = 0;
  for (const { rows } of nonCanonicalReturns()) {
    for (const row of rows) {
      const family = row.itemId ?? row.familyId;
      const all = byFamily.get(family);
      if (!all || all.length < 2) continue;
      assert.ok(all.some((r) => r.superseded !== true),
        `${family}: every extracted row is superseded, so the newest read decides nothing`);
      checked += 1;
    }
  }
  console.log(`         (${checked} famil(ies) had more than one extracted read)`);
});

console.log(`\n${failed === 0 ? "all controls pass" : `${failed} control(s) FAILED`}`);
process.exit(failed === 0 ? 0 : 1);
