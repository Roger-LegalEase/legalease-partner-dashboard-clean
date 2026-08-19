#!/usr/bin/env node
// Re-derives, from the CURRENT canonical graph and the current tree, whether the
// manifest-only retention claim still holds.
//
//   node scripts/verify-rcap-manifest-only-retention.mjs
//   node scripts/verify-rcap-manifest-only-retention.mjs --mutations
//
// The PDF lane reports 31 assets whose only remaining dependency is the
// generated overlay factory manifest: no compiled pathway names them, no packet
// track names them, the byte-pinned legal-design registry does not name them, no
// src/ runtime path other than the manifest names them, and no intended-paid
// pathway depends on them.
//
// That claim is the precondition for retiring them. It is NOT the retirement,
// and this verifier does not perform one. The manifest is read at runtime by
// src/lib/rcap/all50-internal-preview.ts and is generated from
// `private/Nationwide Record Clearing/`, which is not in this clone; a runtime
// manifest that is hand-edited to stop naming an asset has not retired anything,
// it has just stopped admitting the asset is there.
//
// So this asks the one question that can be answered from these bytes, and
// answers it per asset rather than in aggregate: is the manifest really the only
// thing left pointing at this asset? An aggregate "31 of 31 clean" hides the one
// asset that acquired a dependency since the list was written, and that asset is
// the whole reason to re-derive rather than to trust.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MUTATIONS = process.argv.includes("--mutations");

const LIST = "data/rcap-all50/manifest-only-retention-list.json";
const GRAPH = "data/rcap-ledger/paid-pathway-legal-join.json";
const MANIFEST_PATH = "data/rcap-all50/overlays/overlay-factory-manifest.json";

const abs = (p) => path.join(rootDir, p);
const read = (p) => fs.readFileSync(abs(p), "utf8");
const readJson = (p) => JSON.parse(read(p));

/**
 * The surfaces whose naming an asset is a REASON TO KEEP IT.
 *
 * Deliberately `src/` and the canonical ledgers, and deliberately not two other
 * things a first pass swept in and mis-called dependencies:
 *
 *   the asset's own overlay package, and the sibling packages of the same form.
 *     Vermont 200-00631 exists as `200-00631`, `200-00631-en` and
 *     `200-00631-form-en`, and each package's source-record names the form. A
 *     family describing itself is not a dependency on itself, and counting it as
 *     one would make every asset permanently unretirable.
 *
 *   docs/record-clearing/d-wave/**, which is review and handoff EVIDENCE. A
 *     review finding that names a form is a record that the form was looked at.
 *     Retiring an asset does not falsify the record of having reviewed it, and
 *     an audit trail that pins its own subjects in place forever is not an
 *     audit trail.
 */
function searchCorpus() {
  const roots = ["src", "data/rcap-ledger"];
  const files = [];
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(abs(dir), { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (/\.(ts|tsx|mjs|js|json)$/.test(entry.name) && rel !== MANIFEST_PATH) files.push(rel);
    }
  };
  for (const root of roots) walk(root);
  return files;
}

function failures({ list, graph, corpusText }) {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };

  fail(list.schemaVersion === "rcap-manifest-only-retention-list/v1", "the retention list is missing or carries an unrecognised schema");
  const assets = Array.isArray(list.assets) ? list.assets : [];
  fail(assets.length > 0, "the retention list names no assets");
  fail(
    list.totals?.assets === assets.length,
    `the list reports ${list.totals?.assets} assets against ${assets.length} entries`
  );

  // The graph is the authority on what an intended-paid pathway depends on, and
  // it is required from this tree for the same reason the reachability evidence
  // requires it: a claim re-derived against a stale graph is not re-derived.
  const graphPathways = Array.isArray(graph.pathways) ? graph.pathways : [];
  fail(graphPathways.length > 0, `${GRAPH} carries no pathways to check dependencies against`);
  const graphText = JSON.stringify(graph);

  for (const asset of assets) {
    const id = asset.assetId ?? "(unnamed asset)";
    const label = `${id}`;

    // Each claim is re-derived, not read back off the record that made it.
    if (asset.anyIntendedPaidPathwayDependsOnIt === true) {
      out.push(`${label}: the list itself records an intended-paid dependency; it may not be retired`);
      continue;
    }

    // A family id appearing anywhere in the canonical graph is a dependency.
    for (const familyId of asset.formFamilyIds ?? []) {
      if (graphText.includes(familyId)) {
        out.push(`${label}: family ${familyId} is named by the canonical graph, so a pathway depends on it`);
      }
    }

    // Anything outside the manifest that names the asset or its family package.
    const needles = [id, ...(asset.formFamilyIds ?? []), ...(asset.familyPackagePaths ?? [])].filter(Boolean);
    for (const [file, text] of corpusText) {
      for (const needle of needles) {
        if (text.includes(needle)) {
          out.push(`${label}: named by ${file}, which is not the overlay factory manifest`);
        }
      }
    }

    fail(
      Array.isArray(asset.srcRuntimeReferences) && asset.srcRuntimeReferences.length === 0,
      `${label}: the list records ${asset.srcRuntimeReferences?.length} runtime reference(s); it may not be retired`
    );
    fail(
      typeof asset.routeReference === "string" && asset.routeReference.startsWith("none"),
      `${label}: a compiled pathway names it (${asset.routeReference})`
    );
    fail(
      typeof asset.packetFamilyReference === "string" && asset.packetFamilyReference.startsWith("none"),
      `${label}: a packet track names it (${asset.packetFamilyReference})`
    );
    // A live legal-design reference is recorded as an OBJECT naming the form and
    // the tracks it is bound to; an absent one is the sentence "none: ...". The
    // shape is the answer, so an object is a dependency however small it looks.
    // The list's own summary counts only intended-PAID dependencies, which is a
    // narrower question than the one retirement turns on, and at least one asset
    // is clean by that count while the legal-design registry still names it.
    const legal = asset.legalDesignReference;
    fail(
      typeof legal === "string" && legal.startsWith("none"),
      `${label}: the byte-pinned legal-design registry names it (${JSON.stringify(legal)}); it may not be retired`
    );
  }

  return out;
}

const list = readJson(LIST);
const graph = readJson(GRAPH);
const corpusText = searchCorpus().map((f) => [f, read(f)]);

if (MUTATIONS) {
  const base = failures({ list, graph, corpusText }).length;
  const clone = () => JSON.parse(JSON.stringify({ list, graph }));
  const run = (mutate) => {
    const d = clone();
    const extra = mutate(d);
    return failures({ ...d, corpusText: extra ?? corpusText }).length > base;
  };

  const mutations = [
    ["an asset with a live intended-paid dependency is listed as manifest-only", (d) => { d.list.assets[0].anyIntendedPaidPathwayDependsOnIt = true; }],
    ["an asset whose route reference is live is listed as manifest-only", (d) => { d.list.assets[0].routeReference = "pathway pa-act5-full names this asset"; }],
    ["an asset a packet track still names is listed as manifest-only", (d) => { d.list.assets[0].packetFamilyReference = "track T-014 names this asset"; }],
    ["an asset the legal-design registry names is listed as manifest-only", (d) => { d.list.assets[0].legalDesignReference = "EXT-ADOPT-01 names this asset"; }],
    ["an asset with a src runtime reference is listed as manifest-only", (d) => { d.list.assets[0].srcRuntimeReferences = ["src/lib/rcap/documents/packet-route-resolver.ts"]; }],
    ["the list under-reports how many assets it carries", (d) => { d.list.totals.assets = d.list.assets.length - 1; }],
    ["a family the canonical graph still names is listed as manifest-only", (d) => {
      d.graph.pathways[0] = { ...d.graph.pathways[0], probeFamily: d.list.assets[0].formFamilyIds[0] };
    }],
    ["a file outside the manifest still names the asset", (d) => {
      const needle = d.list.assets[0].formFamilyIds[0];
      return [...corpusText, ["src/lib/rcap/some-live-surface.ts", `import x from "${needle}";`]];
    }]
  ];

  let undetected = 0;
  for (const [label, mutate] of mutations) {
    const caught = run(mutate);
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-manifest-only-retention FAILED — ${undetected} mutation(s) undetected.`);
    process.exit(1);
  }
  console.log(`\nEvery way of listing a still-depended-on asset as manifest-only is detected (${mutations.length}/${mutations.length}).`);
  process.exit(0);
}

const problems = failures({ list, graph, corpusText });
if (problems.length > 0) {
  console.error(`verify-rcap-manifest-only-retention FAILED — ${problems.length} problem(s):\n`);
  for (const problem of problems.slice(0, 40)) console.error(` - ${problem}`);
  if (problems.length > 40) console.error(` ... and ${problems.length - 40} more`);
  process.exit(1);
}
console.log(
  `manifest-only retention claim reproduces: ${list.assets.length} asset(s), re-derived against the canonical graph at ` +
  `${graph.pathways.length} pathways and ${corpusText.length} non-manifest files. None is named by a pathway, a packet ` +
  `track, the legal-design registry, or any runtime surface other than the overlay factory manifest.`
);
console.log(
  "This is the PRECONDITION for retirement, not the retirement. The manifest is generated from " +
  "private/Nationwide Record Clearing/, which is not in this clone, so it cannot be regenerated here."
);
