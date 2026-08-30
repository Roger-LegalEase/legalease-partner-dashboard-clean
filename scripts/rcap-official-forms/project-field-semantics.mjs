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
//
// EVERY COMMITTED CENSUS, NOT EVERY CENSUS NAMED field-census.json.
//
// This used to walk for that one filename, and a census enrolled under any
// other name was invisible to it. `ar-arrest-seal-set` is enrolled as
// field-census.census-v1.json for a reason recorded in its own `filenameNote`,
// and it carries the two documents this projection most needs to see. A scan
// that skipped them would answer a narrower question than the one it is asked.
//
// The two shapes differ only in nesting: the v1 census puts its fields under
// `documents[]`, each document carrying the `captionOnly` and ownership facts
// that a flat census leaves to the caller. Both are read here, and the v1
// documents' `captionOnly` and per-field `regionHeading` are passed to
// decideBinding exactly as rcap-official-form-finalize passes them, so the
// projection reports the decision the factory would actually make rather than a
// decision taken with the inputs withheld.
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

const CENSUS_FILENAMES = ["field-census.json", "field-census.census-v1.json"];

/** Every committed census, as { familyDirectory, file }. */
function censusFiles() {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(rootDir, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (CENSUS_FILENAMES.includes(entry.name)) found.push({ familyDirectory: dir, file: rel });
    }
  };
  walk(OVERLAY_ROOT);
  return found.sort((a, b) => a.file.localeCompare(b.file));
}

/**
 * One census's blanks, flattened to a common shape.
 *
 * A flat census is one unnamed document; a v1 census is several named ones. The
 * document identity is carried through because two documents in one family can
 * legitimately share a field name -- `ar-arrest-seal-set` has "First Middle and
 * Last name" and "Case No" on both its petition and its order -- and a key that
 * dropped it would silently collapse the pair into one row.
 */
function blanksOf(census) {
  if (Array.isArray(census?.documents)) {
    return census.documents.flatMap((doc) => (doc.fields ?? []).map((field) => ({
      field, documentId: doc.documentId ?? null, captionOnly: doc.captionOnly === true
    })));
  }
  return (census?.fields ?? []).map((field) => ({ field, documentId: null, captionOnly: false }));
}

const CENSUSES = censusFiles();
const rows = [];
for (const { familyDirectory, file } of CENSUSES) {
  let census;
  try { census = JSON.parse(fs.readFileSync(path.join(rootDir, file), "utf8")); }
  catch { continue; }
  for (const { field, documentId, captionOnly } of blanksOf(census)) {
    const subject = field.effectiveLabel ?? field.name;
    // Both channels, because decideBinding tries the field NAME first and only
    // falls back to the printed label. A projection that looked at one of them
    // would answer a question the binder does not ask.
    const byName = descriptorsMatching(field.name).map((d) => d.factId);
    const byLabel = field.effectiveLabel ? descriptorsMatching(field.effectiveLabel).map((d) => d.factId) : [];
    const decision = decideBinding(
      {
        name: field.name,
        pdfType: field.type,
        effectiveLabel: field.effectiveLabel ?? null,
        regionHeading: field.regionHeading ?? null
      },
      { captionOnly }
    );
    rows.push({
      key: `${familyDirectory}|${documentId ?? "-"}|${field.name}`,
      familyDirectory,
      censusFile: file,
      documentId,
      captionOnly,
      fieldName: field.name,
      effectiveLabel: field.effectiveLabel ?? null,
      regionHeading: field.regionHeading ?? null,
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
  censusesScanned: CENSUSES.length,
  censusFiles: CENSUSES.map((c) => c.file),
  familiesScanned: new Set(CENSUSES.map((c) => c.familyDirectory)).size,
  fieldsProjected: rows.length,
  rows
}, null, 2)}\n`);
console.log(`${outArg}: ${rows.length} field(s) across ${CENSUSES.length} census(es)`);
