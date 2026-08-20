#!/usr/bin/env node
// Is the overlay factory manifest an operational dependency, or a census of a folder?
//
//   node scripts/verify-rcap-corpus-census-surface.mjs
//   node scripts/verify-rcap-corpus-census-surface.mjs --write
//
// The retirement determination probes ten surfaces and retains any asset that
// any surface names. Thirty assets are retained by exactly one surface: the
// overlay factory manifest. The handoff that carries them asks for proof that
// "the regenerated manifest no longer names the asset" before they can retire.
//
// That condition cannot be met by regenerating, and the reason is not that the
// corpus is missing. The manifest is produced by walking a source directory and
// emitting one row per file found. Regenerating it against the same corpus
// reproduces the same rows, because the row exists if and only if the file
// exists. The only way to make the manifest stop naming an asset is to delete
// the asset's bytes out of the historical source corpus -- which is the one
// thing retirement explicitly promises not to do ("Nothing was deleted. It
// stays here as historical evidence").
//
// So the condition is unsatisfiable, and thirty retirements have been waiting
// on it. The defect is in the surface taxonomy, not in the corpus: a census of
// what bytes exist is being counted as a use of those bytes.
//
// This verifier establishes the census claim mechanically rather than by
// assertion, on four independent legs. If any leg stops holding, the
// classification is withdrawn and the assets return to retained.
//
//   1. ROW SET IS THE FILE SET. Every manifest row is a file-inventory row
//      keyed by its path inside the corpus, and the manifest's own count is the
//      row count. Nothing selects which files appear; presence does.
//   2. NO ROW CARRIES AN OPERATIONAL BINDING. No key anywhere in the manifest
//      names a route, track, packet, price, entitlement or sellability. A row
//      cannot route, sell or deliver anything, because it has no field in which
//      to say so.
//   3. THE ONLY CONSUMER IS THE INTERNAL PREVIEW. One module in src/ reads the
//      manifest, and it is imported only by internal-admin-gated pages. No
//      participant route, public surface or checkout path reads it.
//   4. RETIREMENT DOES NOT DELETE BYTES. The retirement applier writes a marker
//      and removes nothing, so a census that keeps naming a retired asset is
//      still telling the truth. The two facts do not contradict each other.
//
// Leg 2 is the one that would catch a real regression: if somebody adds routing
// or sellability to the manifest, it stops being a census, this verifier fails,
// and the retirements that rested on it are no longer supportable.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = path.join(rootDir, "data/rcap-all50/overlays/overlay-factory-manifest.json");
const FACTORY_LIB = path.join(rootDir, "scripts/rcap-all50-overlay-factory-lib.mjs");
const RETIRE_SCRIPT = path.join(rootDir, "scripts/retire-rcap-problematic-pdf-assets.mjs");
const PREVIEW_MODULE = "src/lib/rcap/all50-internal-preview.ts";
const OUT = path.join(rootDir, "data/rcap-all50/pdf-retirement-evidence/corpus-census-surface-proof.json");
const write = process.argv.includes("--write");

const failures = [];
const legs = [];

const readText = (file) => fs.readFileSync(file, "utf8");
const readJson = (file) => JSON.parse(readText(file));

function leg(id, claim, run) {
  try {
    const evidence = run();
    legs.push({ leg: id, claim, holds: true, evidence });
  } catch (error) {
    legs.push({ leg: id, claim, holds: false, evidence: { failure: String(error.message) } });
    failures.push(`${id}: ${error.message}`);
  }
}

const require_ = (condition, message) => { if (!condition) throw new Error(message); };

const manifest = readJson(MANIFEST);

// ---- leg 1: the row set is the file set -------------------------------------
// A census enumerates; it does not select. The generator walks the source
// directory and emits a row per file, so the row count is the file count and
// every row is addressed by its path inside the corpus.
leg("row_set_is_the_file_set", "Every manifest row is a corpus file row, and the manifest counts rows rather than selecting them.", () => {
  const factory = readText(FACTORY_LIB);
  require_(/readdirSync\(sourceDir/.test(factory), "the factory library no longer enumerates sourceDir; the manifest may no longer be a directory walk");
  require_(/totalFormsFound:\s*forms\.length/.test(factory), "the manifest's form count is no longer simply the number of rows found");
  require_(/Nationwide source directory not found/.test(factory), "the factory library no longer requires the source corpus to exist");

  const rows = manifest.forms ?? [];
  require_(rows.length > 0, "the manifest has no rows");
  require_(manifest.summary?.totalFormsFound === rows.length,
    `the manifest's own count (${manifest.summary?.totalFormsFound}) is not the row count (${rows.length}); rows are being selected, not enumerated`);

  const unaddressed = rows.filter((row) => !row.relativePath || !row.sourceFolderName);
  require_(unaddressed.length === 0,
    `${unaddressed.length} row(s) are not addressed by a path inside the corpus, so they are not file-inventory rows`);

  const distinctPaths = new Set(rows.map((row) => row.relativePath));
  require_(distinctPaths.size === rows.length,
    `${rows.length - distinctPaths.size} row(s) share a corpus path; a census has one row per file`);

  require_(typeof manifest.sourceDir === "string" && /Nationwide Record Clearing/.test(manifest.sourceDir),
    `the manifest was not produced from the Nationwide source corpus (sourceDir=${manifest.sourceDir})`);

  return {
    rows: rows.length,
    totalFormsFound: manifest.summary.totalFormsFound,
    distinctCorpusPaths: distinctPaths.size,
    sourceDir: manifest.sourceDir,
    generatedAt: manifest.generatedAt ?? null
  };
});

// ---- leg 2: no row carries an operational binding ---------------------------
// The regression guard. A census row describes a file: where it is, what kind
// of PDF it is, how many pages and fields it has, whether a draft map exists.
// It has no field in which to name a route, a track, a packet, a price or an
// entitlement -- so it cannot express an operational dependency even in
// principle. If that ever changes, the manifest stops being a census.
const CENSUS_ROW_KEYS = new Set([
  "blockedArtifactPath", "blockedReason", "classification", "errors", "fieldCount",
  "fieldMapPath", "fileName", "formSlug", "jurisdictionCode", "kind", "mapKind",
  "pageCount", "recommendedMappingMode", "relativePath", "renderError",
  "rescuedFromOfficialPdf", "rescuedPdfPath", "samplePath", "sourceFolderName",
  "stateName", "status", "visualReview", "warnings"
]);

const OPERATIONAL_KEY_PATTERN =
  /(track|route|packet|sellable|purchasab|public|price|pricing|entitle|checkout|sku|stripe|product|offer|paywall|billing|order)/i;

leg("no_row_carries_an_operational_binding", "No key anywhere in the manifest names a route, track, packet, price, entitlement or sellability.", () => {
  const rowKeys = new Set();
  for (const row of manifest.forms ?? []) for (const key of Object.keys(row)) rowKeys.add(key);

  const unknown = [...rowKeys].filter((key) => !CENSUS_ROW_KEYS.has(key)).sort();
  require_(unknown.length === 0,
    `the manifest row shape has grown key(s) this proof has not classified: ${unknown.join(", ")}. Classify them before relying on the census claim`);

  // Every key at every depth, so an operational field cannot hide in a nested
  // object the row-key scan never reaches.
  const everyKey = new Set();
  const walk = (value) => {
    if (Array.isArray(value)) { for (const item of value) walk(item); return; }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) { everyKey.add(key); walk(child); }
  };
  walk(manifest);

  const operational = [...everyKey].filter((key) => OPERATIONAL_KEY_PATTERN.test(key)).sort();
  require_(operational.length === 0,
    `the manifest names operational concept(s) in key(s): ${operational.join(", ")}. It is no longer a census`);

  return { distinctRowKeys: [...rowKeys].sort(), distinctKeysAtEveryDepth: everyKey.size, operationalKeysFound: 0 };
});

// ---- leg 3: the only consumer is the internal preview ------------------------
// A census read by a participant route would still be a runtime dependency of
// that route. This checks who actually reads it, and what gates them.
leg("only_consumer_is_the_internal_preview", "One module reads the manifest, and only internal-admin-gated pages import that module.", () => {
  const sourceFiles = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) sourceFiles.push(full);
    }
  };
  walk(path.join(rootDir, "src"));

  const readers = sourceFiles
    .filter((file) => readText(file).includes("overlay-factory-manifest"))
    .map((file) => path.relative(rootDir, file))
    .sort();
  require_(readers.length === 1 && readers[0] === PREVIEW_MODULE,
    `expected ${PREVIEW_MODULE} to be the only src/ reader of the manifest; found ${readers.length}: ${readers.join(", ")}`);

  const importers = sourceFiles
    .filter((file) => /all50-internal-preview/.test(readText(file)))
    .map((file) => path.relative(rootDir, file))
    .filter((file) => file !== PREVIEW_MODULE)
    .sort();
  require_(importers.length > 0, "nothing imports the internal preview module; the consumer graph could not be established");

  const outsideInternal = importers.filter((file) => !file.startsWith("src/app/internal/"));
  require_(outsideInternal.length === 0,
    `the internal preview is imported outside src/app/internal/: ${outsideInternal.join(", ")}. A non-internal surface reads the census`);

  const ungated = importers.filter((file) => !/resolveInternalAdminPageAccess/.test(readText(path.join(rootDir, file))));
  require_(ungated.length === 0,
    `internal preview page(s) are not behind the internal-admin gate: ${ungated.join(", ")}`);

  return { srcReadersOfTheManifest: readers, internalAdminGatedImporters: importers };
});

// ---- leg 4: retirement does not delete bytes --------------------------------
// The two facts have to be able to coexist: the asset is out of the operational
// inventory, and the census still records that its bytes are in the corpus. If
// retirement deleted anything, the census would go stale and would have to be
// regenerated -- which is what the original condition assumed.
leg("retirement_does_not_delete_bytes", "The retirement applier writes a marker and removes nothing, so the census stays truthful after a retirement.", () => {
  const retire = readText(RETIRE_SCRIPT);
  const destructive = ["unlinkSync", "rmSync", "rmdirSync", "renameSync"].filter((call) => retire.includes(call));
  require_(destructive.length === 0,
    `the retirement applier calls ${destructive.join(", ")}; retirement may now delete bytes and the census claim no longer holds`);
  require_(/Nothing was deleted/.test(retire),
    "the retirement applier no longer states that nothing is deleted");
  return { destructiveCallsFound: 0, contract: "retired_from_operational_inventory: marker written, bytes preserved" };
});

// ---- result -----------------------------------------------------------------
const payload = {
  schemaVersion: "rcap-corpus-census-surface-proof/v1",
  generatedBy: "scripts/verify-rcap-corpus-census-surface.mjs",
  purpose: "Whether data/rcap-all50/overlays/overlay-factory-manifest.json is an operational dependency or a census of the source corpus, established mechanically so a retirement may rest on it.",
  theConditionThisReplaces: "\"the regenerated manifest, produced from the private corpus, no longer names the asset\" -- unsatisfiable by regeneration, because the manifest emits one row per file present and retirement deletes no files. Only deleting the historical source bytes could satisfy it, and retirement forbids that.",
  whatACensusClassificationDoesNotDo: [
    "It does not weaken any other surface. The other nine surfaces are probed unchanged, and any hit on one of them still retains the asset.",
    "It does not make a route public, sellable or packet-ready.",
    "It does not delete, move or alter the manifest, the corpus, or any asset's bytes.",
    "It does not survive a change to the manifest's shape: leg 2 fails the moment a row can name a route, track, packet, price or entitlement."
  ],
  surface: {
    name: "overlay_factory_manifest",
    path: "data/rcap-all50/overlays/overlay-factory-manifest.json",
    classification: failures.length === 0 ? "corpus_census" : "unproven",
    generator: "scripts/rcap-all50-overlay-factory-lib.mjs"
  },
  legs,
  holds: failures.length === 0
};

if (write && failures.length === 0) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
}

if (failures.length > 0) {
  console.error(`FAIL corpus census surface — ${failures.length} leg(s) do not hold; overlay_factory_manifest may not be treated as a census`);
  for (const message of failures) console.error(`  ${message}`);
  process.exit(1);
}

console.log(`OK corpus census surface — ${legs.length} legs hold; overlay_factory_manifest is a census of ${manifest.summary.totalFormsFound} corpus files, read only by the internal-admin preview${write ? `, proof written to ${path.relative(rootDir, OUT)}` : ""}`);
