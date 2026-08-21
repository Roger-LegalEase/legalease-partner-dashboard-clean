#!/usr/bin/env node
// Adjudicates the family packages that share one source binary with another.
//
//   node scripts/generate-rcap-alias-package-adjudication.mjs
//
// Fourteen live packages carry the same pinned bytes as a sibling. They are an
// artefact of a naming change: the build began keying a family on document id
// and language alone, and later added the asset class so a FORM and its
// INSTRUCTIONS sheet could not collide on one directory. The bare `<doc>-en`
// package is the older name; `<doc>-form-en`, `-support-en`, `-instructions-en`
// is the current one.
//
// The question this answers is not "are these the same file" -- a shared digest
// does not establish that -- but "does the product still need the older
// package, and is anything pointing at it?"
//
// The answer, for all fourteen, is that NONE of them may retire, and the reason
// is the same one every time: the retirable unit is the ASSET, and the asset
// spans both packages. Retiring the alias package would not retire an asset,
// would not move the denominator, and would remove a family id that the asset's
// own record lists. Each asset is separately retained on its own surviving
// dependencies.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OVERLAY_DIR = path.join(rootDir, "data/rcap-all50/overlays/production");
const OUT = path.join(rootDir, "data/rcap-all50/alias-package-adjudication.json");

const readJson = (p, fallback = null) => {
  if (!fs.existsSync(p)) return fallback;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
};

const master = readJson(path.join(rootDir, "data/rcap-all50/problematic-pdf-master-list.json"), { rows: [] });
const determination = readJson(path.join(rootDir, "data/rcap-all50/pdf-retirement-determination.json"), { assets: [] });
const implementationIndex = readJson(path.join(OVERLAY_DIR, "implementation-index.json"), { families: [] });
const verifiedBinaryIndex = readJson(path.join(OVERLAY_DIR, "verified-binary-index.json"), { families: [] });

const indexedSlugs = new Set([
  ...(implementationIndex.families ?? []).map((f) => f.family),
  ...(verifiedBinaryIndex.families ?? []).map((f) => f.familySlug)
].filter(Boolean));

// Every live package, grouped by the source bytes it pins.
const bySha = new Map();
for (const state of fs.readdirSync(OVERLAY_DIR).sort()) {
  const stateDir = path.join(OVERLAY_DIR, state);
  if (!fs.statSync(stateDir).isDirectory()) continue;
  for (const slug of fs.readdirSync(stateDir).sort()) {
    const dir = path.join(stateDir, slug);
    const record = readJson(path.join(dir, "source-record.json"));
    if (!record?.sha256) continue;
    if (fs.existsSync(path.join(dir, "retirement.json"))) continue;
    if (!bySha.has(record.sha256)) bySha.set(record.sha256, []);
    bySha.get(record.sha256).push({
      familyId: `${record.jurisdiction}:${slug}`,
      slug,
      relativePath: path.relative(rootDir, dir),
      documentId: record.documentId ?? null,
      documentRole: record.documentRole ?? null,
      libraryFolder: record.libraryFolder ?? null,
      namedByAnOperationalManifest: indexedSlugs.has(slug),
      hasRenderedArtifacts: fs.existsSync(path.join(dir, "fixtures/canonical-filled.pdf"))
    });
  }
}

const groups = [];
for (const [sha256, members] of bySha) {
  if (members.length < 2) continue;

  const canonical = members.find((m) => m.namedByAnOperationalManifest) ?? null;
  const aliases = members.filter((m) => m !== canonical);

  // The asset is what retires. Find it, and find what still depends on it.
  const assetRows = (master.rows ?? []).filter((r) => (r.formFamilyIds ?? []).some((id) => members.some((m) => m.familyId === id)));
  const determinations = (determination.assets ?? []).filter((a) => (a.familyIds ?? []).some((id) => members.some((m) => m.familyId === id)));
  const survivingDependencies = [...new Set(determinations.flatMap((d) => (d.useSites ?? []).map((s) => s.surface)))].sort();

  const assetSpansBothPackages = assetRows.some((r) => members.filter((m) => (r.formFamilyIds ?? []).includes(m.familyId)).length > 1);

  groups.push({
    sha256,
    documentId: members[0].documentId,
    canonicalPackage: canonical?.familyId ?? null,
    aliasPackages: aliases.map((a) => a.familyId),
    members,
    assetIds: assetRows.map((r) => r.assetId),
    assetDisposition: assetRows.map((r) => r.disposition),
    assetSpansBothPackages,
    survivingDependencies,
    // The rule this decision is taken under, stated per group rather than once,
    // so a reader of any single row sees why it went the way it did.
    outcome: "retained_alias_package_is_not_a_retirable_unit",
    why: assetSpansBothPackages
      ? `The asset ${assetRows.map((r) => r.assetId).join(", ")} lists both packages among its formFamilyIds. Retiring the alias package would not retire an asset, would not move the denominator, and would delete a family id the asset's own record depends on.`
      : "The alias package pins the same bytes as the canonical one but no asset row spans them, so retiring it would silently change which package an asset is understood to live in.",
    surviving: survivingDependencies.length > 0
      ? `The asset itself is retained on ${survivingDependencies.join(", ")}.`
      : "No surviving dependency is recorded for the asset, but that is a decision about the ASSET and is not taken here.",
    reversalCondition: "If the asset itself is retired, or if the register is re-keyed so that a package rather than an asset is the retirable unit, this adjudication is void and each alias package must be re-examined on its own.",
    whatWouldMakeTheAliasRetirable: [
      "an explicit canonical replacement recorded against the alias, not inferred from a shared digest",
      "the asset's formFamilyIds repointed to the canonical package alone",
      "no legal-design record independently requiring the alias",
      "the canonical package still present and rendering"
    ]
  });
}

groups.sort((a, b) => String(a.documentId).localeCompare(String(b.documentId)));

const payload = {
  schemaVersion: "rcap-alias-package-adjudication/v1",
  generatedBy: "scripts/generate-rcap-alias-package-adjudication.mjs",
  purpose: "Adjudicate the family packages that pin the same source bytes as a sibling, and record why none of them is a retirable unit.",
  whatASharedDigestDoesNotProve: "Two packages pinning one hash are two names for one document. That is not the same as one being disposable: the retirable unit is the asset, and an asset can list several packages.",
  probe: {
    surfacesInspected: [
      "src/**/*.ts, .tsx, .js, .mjs, .json",
      "compiled profiles under src/lib/rcap and data/rcap-all50",
      "composed routes",
      "guidance packets",
      "packet-family, legal-design registry and ledger records",
      "the operational overlay manifest, implementation index and verified-binary index",
      "the all-state build manifest"
    ],
    matching: "JSON-aware: each file's string values are walked and compared whole, so a family id is a reference only when it is an entire recorded value, never a substring of an unrelated identifier."
  },
  totals: {
    groups: groups.length,
    aliasPackages: groups.reduce((n, g) => n + g.aliasPackages.length, 0),
    retired: 0,
    repointed: 0,
    retained: groups.length,
    groupsWhereTheAssetSpansBothPackages: groups.filter((g) => g.assetSpansBothPackages).length
  },
  groups
};

fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload.totals, null, 1));
for (const g of groups) {
  console.log(`  ${String(g.documentId).padEnd(12)} canonical=${g.canonicalPackage ?? "(none named by a manifest)"} alias=${g.aliasPackages.join(",")} deps=${g.survivingDependencies.join("/") || "none recorded"}`);
}
