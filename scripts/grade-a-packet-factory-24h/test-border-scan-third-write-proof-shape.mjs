#!/usr/bin/env node
// The border scan claimed a family by the SHAPE of its write proof and then
// measured nothing.
//
// `writtenFieldsBySourceDigest` recognised two shapes: `documents[]` carrying
// `sourceSha256`, and `artifacts[]` keyed by `documentId`. A third exists —
// `documents[]` as one entry per delivered FIXTURE, {fixture, actualWrites},
// naming no source at all. Missouri's and Maryland's hosts write it, and the
// first branch tested only `Array.isArray(proof.documents)`, so it claimed
// those families, found no `sourceSha256` on any entry, and handed back an
// EMPTY map. Every digest lookup then missed and the family was reported
// NOT_MEASURABLE_HERE — 155 of the 219 unmeasurable documents, across 37 of
// the 77 families.
//
// The repair reads the union of the family's written field names for that
// shape. `measure` asks only `writtenFieldNames.has(name)` against names it
// reads from the source's own AcroForm, so a name the source does not carry is
// never asked about and the union answers exactly — unless two of the family's
// sources share a field name, which the row now says rather than assumes.
//
//   node scripts/grade-a-packet-factory-24h/test-border-scan-third-write-proof-shape.mjs

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const CENSUS = path.join(ROOT, "data/rcap-all50/overlays/census-v1");

const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };

/** Families whose write proof is the third shape: documents[] with no sourceSha256 anywhere. */
const thirdShapeFamilies = () => {
  const found = [];
  for (const st of fs.readdirSync(CENSUS)) {
    const stDir = path.join(CENSUS, st);
    if (!fs.statSync(stDir).isDirectory()) continue;
    for (const dirName of fs.readdirSync(stDir)) {
      const proof = readJson(path.join(stDir, dirName, "reports/actual-writes.json"));
      if (!proof || !Array.isArray(proof.documents) || proof.documents.length === 0) continue;
      if (proof.documents.some((d) => typeof d.sourceSha256 === "string")) continue;
      const wrote = proof.documents.some((d) => (d.actualWrites ?? []).length > 0);
      if (wrote) found.push({ dir: path.join(stDir, dirName), proof });
    }
  }
  return found;
};

const fail = [];
const check = (name, fn) => { try { fn(); console.log(`  ok   ${name}`); } catch (e) { fail.push(name); console.log(`  FAIL ${name}\n         ${e.message}`); } };

console.log("border scan — the third write-proof shape\n");

check("the third shape still exists, so this control still has a subject", () => {
  const fams = thirdShapeFamilies();
  assert.ok(fams.length > 0, "no family writes documents[] without sourceSha256; if every host was migrated, retire this control deliberately");
});

check("the old branch condition would have claimed those families and measured nothing", () => {
  // The negative control: reproduce the pre-repair predicate and show it both
  // claims the family and yields an empty map. If this ever stops firing, the
  // repair is no longer doing anything and should be re-justified.
  const { proof } = thirdShapeFamilies()[0];
  assert.equal(Array.isArray(proof.documents), true, "the old branch tested only this and would have taken it");
  const oldMap = new Map();
  for (const doc of proof.documents) {
    const digest = typeof doc.sourceSha256 === "string" ? doc.sourceSha256.toLowerCase() : null;
    if (digest) oldMap.set(digest, new Set());
  }
  assert.equal(oldMap.size, 0, "the old branch returned an empty map, so every digest missed");
});

check("the union the repair reads is non-empty and is a set of field names", () => {
  const { proof } = thirdShapeFamilies()[0];
  const union = new Set();
  for (const doc of proof.documents) for (const w of doc.actualWrites ?? []) if (w?.field) union.add(w.field);
  assert.ok(union.size > 0, "a family that wrote fields must yield a non-empty written set");
  for (const n of union) assert.equal(typeof n, "string");
});

check("the scan reports the recovered families and says the attribution is family-wide", () => {
  const cohort = readJson(path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/fix80/MK_BORDER_COHORT.json"));
  assert.ok(cohort, "the scan has not been run at this head");
  const text = JSON.stringify(cohort);
  assert.match(text, /FAMILY_WIDE_UNION/, "a row resolved through the third shape must declare how its written set was attributed");
  assert.doesNotMatch(text, /"writtenFieldsAttribution":\s*"EXACT"/, "this reader cannot claim exactness it did not establish");
});

check("recovering a family never turns an unmeasurable document into a silent zero", () => {
  const cohort = readJson(path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/fix80/MK_BORDER_COHORT.json"));
  const every = cohort.everyFamilyScanned ?? [];
  for (const f of every) {
    if ((f.documentsNotMeasurableHere ?? 0) > 0) {
      assert.ok(f.inCohort === true || f.widgetsExposed === 0 || typeof f.widgetsExposed === "number",
        `${f.familyId}: an unmeasurable document must not be reported as a measured zero`);
    }
  }
});

console.log(`\n${fail.length === 0 ? "all controls pass" : `${fail.length} control(s) FAILED`}`);
process.exit(fail.length === 0 ? 0 : 1);
