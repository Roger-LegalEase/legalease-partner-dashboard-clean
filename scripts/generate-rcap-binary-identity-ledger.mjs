#!/usr/bin/env node
// The binary-identity ledger: one row per SHA-256 that more than one asset id
// claims, and a disposition for every id in it.
//
//   node scripts/generate-rcap-binary-identity-ledger.mjs
//   node scripts/generate-rcap-binary-identity-ledger.mjs --check
//
// Two asset ids over one digest is not automatically a duplicate. The same
// bytes can be a petition in one packet and a source-gated reference in
// another, and collapsing those because their SHA-256 matches would delete an
// operational role rather than a redundancy. So identity here is proven, never
// inferred from the hash:
//
//   1. same digest alone authorises nothing;
//   2. an alias may retire only once every operational reference is repointed
//      to the canonical asset;
//   3. any surviving operational reference prevents retirement;
//   4. distinct operational roles stay separate even when the bytes match;
//   5. a conflicted group with no proven relationship stays retained, whole;
//   6. no group leaves two dispositions unexplained.
//
// The rules are ordered so the safe answer is the default: rule 5 catches
// everything the earlier rules could not prove, and what it catches is
// retention.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveGroup, OPERATIONAL_SURFACES } from "./rcap-official-forms/rcap-binary-identity-rules.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const DETERMINATION = "data/rcap-all50/pdf-retirement-determination.json";
const OVERLAY_DIR = "data/rcap-all50/overlays/production";
const OUT = "data/rcap-all50/pdf-retirement-evidence/binary-identity-ledger.json";
const OUT_MD = "docs/record-clearing/pdf-independent-reviews/binary-identity-ledger.md";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));

function fail(message) {
  console.error(`FAIL binary identity ledger — ${message}`);
  process.exit(1);
}

const determination = readJson(DETERMINATION);

/** Every family package's source record, keyed by the slug the asset names. */
const sourceRecords = new Map();
const markers = new Map();
if (fs.existsSync(abs(OVERLAY_DIR))) {
  for (const state of fs.readdirSync(abs(OVERLAY_DIR))) {
    const statePath = abs(path.join(OVERLAY_DIR, state));
    if (!fs.statSync(statePath).isDirectory()) continue;
    for (const family of fs.readdirSync(statePath)) {
      const record = path.join(statePath, family, "source-record.json");
      if (fs.existsSync(record)) {
        try { sourceRecords.set(family, JSON.parse(fs.readFileSync(record, "utf8"))); } catch { /* unreadable */ }
      }
      if (fs.existsSync(path.join(statePath, family, "retirement.json"))) {
        markers.set(family, path.join(OVERLAY_DIR, state, family, "retirement.json"));
      }
    }
  }
}

const recordFor = (asset) => {
  for (const familyId of asset.familyIds ?? []) {
    const slug = String(familyId).split(":").pop();
    if (sourceRecords.has(slug)) return sourceRecords.get(slug);
  }
  return null;
};
const markerFor = (asset) => {
  for (const familyId of asset.familyIds ?? []) {
    const slug = String(familyId).split(":").pop();
    if (markers.has(slug)) return markers.get(slug);
  }
  return null;
};


const byDigest = new Map();
for (const asset of determination.assets) {
  const digest = String(asset.assetId).split("|").pop();
  if (!digest || digest.length !== 64) continue;
  if (!byDigest.has(digest)) byDigest.set(digest, []);
  byDigest.get(digest).push(asset);
}

const shared = [...byDigest.entries()].filter(([, assets]) => assets.length > 1);

/**
 * Do two assets over one digest carry the same operational role?
 *
 * Role is taken from the source record, not from the file name: a document
 * role and a library folder say what a form is FOR, and two records that agree
 * on both are the same thing filed twice. Anything else is treated as distinct,
 * because being wrong in that direction only costs an extra retained asset.
 */
function roleOf(asset) {
  const record = recordFor(asset);
  return {
    documentRole: record?.documentRole ?? null,
    libraryFolder: record?.libraryFolder ?? null,
    revision: record?.revision ?? null,
    language: record?.language ?? null,
    canonicalBundlePath: record?.canonicalBundlePath ?? null,
    jurisdiction: asset.jurisdiction
  };
}

const groups = shared.map(([digest, assets]) => {
  const members = assets.map((asset) => {
    const role = roleOf(asset);
    const operationalReferences = (asset.useSites ?? []).filter((s) => OPERATIONAL_SURFACES.has(s.surface));
    return {
      assetId: asset.assetId,
      jurisdiction: asset.jurisdiction,
      formNumber: asset.formNumber,
      revision: role.revision,
      language: role.language,
      documentRole: role.documentRole,
      libraryFolder: role.libraryFolder,
      sourcePath: role.canonicalBundlePath,
      familyIds: asset.familyIds,
      runtimeReferences: (asset.useSites ?? []).filter((s) => s.runtime).map((s) => s.surface),
      packetFamilyReferences: (asset.useSites ?? []).filter((s) => ["composed_routes", "guidance_packets", "d_track_queue"].includes(s.surface)).map((s) => s.surface),
      legalDesignReferences: (asset.useSites ?? []).filter((s) => s.surface === "legal_design_registry").map((s) => s.surface),
      operationalManifestReferences: (asset.useSites ?? []).filter((s) => s.surface === "overlay_factory_manifest").map((s) => s.surface),
      operationalReferenceCount: operationalReferences.length,
      determination: asset.determination,
      retirementMarker: markerFor(asset)
    };
  });

  const dispositions = new Set(members.map((m) => m.determination));
  const conflicted = dispositions.size > 1;

  // One implementation of the rules, shared with the mutation suite.
  const decided = resolveGroup({
    digest,
    members: members.map((m) => ({ ...m, surfaces: [...new Set((determination.assets.find((a) => a.assetId === m.assetId)?.useSites ?? []).map((s) => s.surface))] })),
    repointProven: false
  });
  const { relationship, canonicalAssetId, rule, sameOperationalRole: sameRole } = decided;
  const resolved = decided.dispositions;

  const explained = resolved.every((r) => Boolean(r.because));
  if (!explained) fail(`digest ${digest} leaves a disposition unexplained`);

  return {
    digest,
    assetIds: members.map((m) => m.assetId),
    conflicted,
    relationship,
    canonicalAssetId,
    rule,
    sameOperationalRole: sameRole,
    members,
    dispositions: resolved,
    contradictionRemains: new Set(resolved.map((r) => r.disposition)).size > 1
      && resolved.some((r) => String(r.disposition).startsWith("retired"))
  };
});

const conflicted = groups.filter((g) => g.conflicted);
const unresolved = groups.filter((g) => g.contradictionRemains);

const record = {
  schemaVersion: "rcap-binary-identity-ledger/v1",
  generatedBy: "scripts/generate-rcap-binary-identity-ledger.mjs",
  purpose:
    "One row per SHA-256 claimed by more than one asset id, with a proven relationship and an explained disposition for every id.",
  whySameDigestIsNotEnough:
    "The same bytes can be a petition in one packet and a source-gated reference in another. Collapsing them because the hash matches deletes an operational role rather than a redundancy, so the hash opens the question and never answers it.",
  rules: [
    "1. same digest alone does not authorise deduplication",
    "2. a duplicate alias can retire only after every operational reference is repointed to the canonical asset",
    "3. a retained operational reference prevents retirement",
    "4. distinct operational roles may remain separate even when bytes match",
    "5. a conflicted group with no proven relationship remains retained",
    "6. no group may leave contradictory dispositions unexplained"
  ],
  totals: {
    logicalAssets: determination.assets.length,
    uniqueBinaryDigests: byDigest.size,
    digestsClaimedByMoreThanOneAsset: shared.length,
    conflictedGroups: conflicted.length,
    trueAliasGroups: groups.filter((g) => g.relationship === "true_alias").length,
    distinctRoleGroups: groups.filter((g) => g.relationship === "distinct_operational_roles").length,
    unprovenGroups: groups.filter((g) => g.relationship === "unproven").length,
    unresolvedContradictions: unresolved.length
  },
  groups
};

function markdown() {
  const lines = [];
  lines.push("# Binary identity ledger");
  lines.push("");
  lines.push(record.whySameDigestIsNotEnough);
  lines.push("");
  lines.push(`Logical assets: ${record.totals.logicalAssets}. Unique binary digests: ${record.totals.uniqueBinaryDigests}. Digests claimed by more than one asset: ${record.totals.digestsClaimedByMoreThanOneAsset}, of which ${record.totals.conflictedGroups} carried conflicting dispositions.`);
  lines.push("");
  for (const group of groups) {
    lines.push(`## \`${group.digest.slice(0, 16)}…\` — ${group.relationship}`);
    lines.push("");
    lines.push(group.rule);
    lines.push("");
    lines.push("| asset | role | folder | operational refs | was | now |");
    lines.push("| --- | --- | --- | ---: | --- | --- |");
    for (const member of group.members) {
      const resolved = group.dispositions.find((d) => d.assetId === member.assetId);
      lines.push(`| ${member.assetId.split("|").slice(0, 2).join(" ")} | ${member.documentRole ?? "—"} | ${member.libraryFolder ?? "—"} | ${member.operationalReferenceCount} | ${member.determination} | ${resolved.disposition} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

const outputs = [[OUT, `${JSON.stringify(record, null, 2)}\n`], [OUT_MD, markdown()]];
let stale = 0;
for (const [rel, content] of outputs) {
  const file = abs(rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === content) continue;
  stale += 1;
  if (checkOnly) { console.error(`  stale: ${rel}`); continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-binary-identity-ledger.mjs`);

console.log(
  `OK binary identity ledger — ${record.totals.logicalAssets} logical assets over ${record.totals.uniqueBinaryDigests} unique digests; ` +
    `${shared.length} shared digest(s), ${conflicted.length} conflicted, ${unresolved.length} unresolved`
);
