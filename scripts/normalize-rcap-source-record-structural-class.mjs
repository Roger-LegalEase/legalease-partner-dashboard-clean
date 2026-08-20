#!/usr/bin/env node
// Re-derives `structuralClassAgrees` on every committed D1 source record.
//
//   node scripts/normalize-rcap-source-record-structural-class.mjs
//   node scripts/normalize-rcap-source-record-structural-class.mjs --check
//
// The field is a pure function of two values the record already carries, so
// re-deriving it invents nothing: it reads `structuralClassObserved` and
// `structuralClassDeclared` and recomputes agreement through the shared
// vocabulary. No hash, no path, no class and no hold is touched.
//
// This exists because the builder that wrote these records compared the two
// vocabularies with raw string equality. The canonical manifest declares
// `acroform_pdf`; the inspector, reading the binary, reports `acroform`. Every
// AcroForm in the corpus was therefore recorded as disagreeing with its own
// manifest, and the problematic-PDF register turned each one into a
// source-identity defect. There was never a genuine disagreement among them.
//
// The binaries these records describe are not in the clone, so the records
// cannot simply be rebuilt. Re-deriving the one field the fixed comparator
// changes is the whole correction, and running the builder later reproduces
// exactly the same value.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { structuralClassesAgree } from "./rcap-official-forms/rcap-structural-class.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.join(rootDir, "data/rcap-all50/overlays/production");
const checkOnly = process.argv.includes("--check");

const changed = [];
let inspected = 0;

for (const stateDir of fs.readdirSync(ROOT).sort()) {
  const statePath = path.join(ROOT, stateDir);
  if (!fs.statSync(statePath).isDirectory()) continue;
  for (const familyDir of fs.readdirSync(statePath).sort()) {
    const file = path.join(statePath, familyDir, "source-record.json");
    if (!fs.existsSync(file)) continue;
    const raw = fs.readFileSync(file, "utf8");
    const record = JSON.parse(raw);
    // Only v2 verified-binary records carry the observed/declared pair.
    if (!("structuralClassAgrees" in record)) { inspected += 1; continue; }
    inspected += 1;

    const derived = structuralClassesAgree(record.structuralClassObserved, record.structuralClassDeclared);
    if (record.structuralClassAgrees === derived) continue;

    changed.push({
      family: `${stateDir}/${familyDir}`,
      observed: record.structuralClassObserved ?? null,
      declared: record.structuralClassDeclared ?? null,
      was: record.structuralClassAgrees,
      now: derived
    });
    // Rewritten in place so key order -- and therefore every other byte of the
    // record -- is preserved.
    record.structuralClassAgrees = derived;
    if (!checkOnly) fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  }
}

if (checkOnly && changed.length > 0) {
  console.error(`FAIL structural-class normalization — ${changed.length} source record(s) still carry a raw-equality verdict; re-run scripts/normalize-rcap-source-record-structural-class.mjs`);
  for (const row of changed.slice(0, 10)) {
    console.error(`  ${row.family}: observed '${row.observed}' vs declared '${row.declared}' recorded as ${row.was}, should be ${row.now}`);
  }
  process.exit(1);
}

console.log(`OK structural-class normalization — ${inspected} source record(s) inspected, ${changed.length} re-derived`);
