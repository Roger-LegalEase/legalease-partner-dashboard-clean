#!/usr/bin/env node
// The whole corpus's binding projection, from one version of the semantics.
//
//   node scripts/rcap-official-forms/project-field-semantics.mjs <out.json> [semantics.mjs]
//
// A change to the shared binder is only as safe as the set of fields it moves,
// and "I expected it to move three" is not evidence. This projects every
// censused blank in every committed family through a given semantics module and
// writes the answer per field, so the before and after can be diffed exactly and
// anything outside the expected set shows up as a row rather than as a feeling.
//
// The second argument lets the projection be taken from a version of the
// semantics that is not the one on disk -- the committed one, say -- without
// stashing anything. The module has no imports of its own, so a copy of it runs
// identically wherever it is placed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(rootDir);

const OVERLAY_ROOT = "data/rcap-all50/overlays";
const outArg = process.argv[2];
const semanticsArg = process.argv[3] ?? "scripts/rcap-official-forms/rcap-field-semantics.mjs";
if (!outArg) {
  console.error("usage: project-field-semantics.mjs <out.json> [semantics.mjs]");
  process.exit(2);
}

const semantics = await import(pathToFileURL(path.resolve(rootDir, semanticsArg)).href);
const { descriptorsMatching, protectCategoryOf, decideBinding } = semantics;

function familyDirectories() {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(rootDir, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (entry.name === "field-census.json") found.push(dir);
    }
  };
  walk(OVERLAY_ROOT);
  return found.sort();
}

const rows = [];
for (const familyDir of familyDirectories()) {
  let census;
  try { census = JSON.parse(fs.readFileSync(path.join(rootDir, `${familyDir}/field-census.json`), "utf8")); }
  catch { continue; }
  for (const field of census.fields ?? []) {
    const subject = field.effectiveLabel ?? field.name;
    // Both channels, because decideBinding tries the field NAME first and only
    // falls back to the printed label. A projection that looked at one of them
    // would answer a question the binder does not ask.
    const byName = descriptorsMatching(field.name).map((d) => d.factId);
    const byLabel = field.effectiveLabel ? descriptorsMatching(field.effectiveLabel).map((d) => d.factId) : [];
    const decision = decideBinding(
      { name: field.name, pdfType: field.type, effectiveLabel: field.effectiveLabel ?? null },
      {}
    );
    rows.push({
      key: `${familyDir}|${field.name}`,
      familyDirectory: familyDir,
      fieldName: field.name,
      effectiveLabel: field.effectiveLabel ?? null,
      pdfType: field.type ?? null,
      subjectFirstDescriptor: descriptorsMatching(subject)[0]?.factId ?? null,
      byNameDescriptors: byName,
      byLabelDescriptors: byLabel,
      protectCategory: protectCategoryOf(subject) ?? protectCategoryOf(field.name) ?? null,
      bindingWritable: decision.writable === true,
      bindingFactId: decision.factId ?? null,
      bindingReason: decision.reason ?? null,
      bindingCategory: decision.category ?? null
    });
  }
}
rows.sort((a, b) => a.key.localeCompare(b.key));

const out = path.resolve(rootDir, outArg);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify({
  schemaVersion: "rcap-field-semantics-projection/v1",
  generatedBy: "scripts/rcap-official-forms/project-field-semantics.mjs",
  semanticsModule: semanticsArg,
  familiesScanned: familyDirectories().length,
  fieldsProjected: rows.length,
  rows
}, null, 2)}\n`);
console.log(`${outArg}: ${rows.length} field(s) across ${familyDirectories().length} family(ies)`);
