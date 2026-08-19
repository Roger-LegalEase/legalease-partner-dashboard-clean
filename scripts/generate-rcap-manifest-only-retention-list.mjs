#!/usr/bin/env node
// The assets held back from retirement by nothing except this lane's own
// generated manifest.
//
// An asset retained because we built a package for it is close to circular.
// It is still a runtime input -- src/lib/rcap/all50-internal-preview.ts reads
// the overlay factory manifest -- so it cannot simply be dropped. But the
// question "does anything operational actually depend on this?" is answerable,
// and this file answers it per asset so the owner of the manifest can decide
// rather than inherit a list of names.
//
// Nothing here retires anything. It states, for each asset, every reference
// that exists and whether any intended paid pathway reaches it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(rootDir, "data/rcap-all50/manifest-only-retention-list.json");
const readJson = (p, fallback = null) => {
  const abs = path.join(rootDir, p);
  if (!fs.existsSync(abs)) return fallback;
  try { return JSON.parse(fs.readFileSync(abs, "utf8")); } catch { return fallback; }
};

const retirement = readJson("data/rcap-all50/pdf-retirement-determination.json", { assets: [] });
const master = readJson("data/rcap-all50/problematic-pdf-master-list.json", { rows: [] });
const byAssetId = new Map(master.rows.map((r) => [r.assetId, r]));

/**
 * An asset the byte-pinned legal-design registry names is not manifest-only.
 *
 * This list used to compute the legal-design reference as evidence and then
 * ignore it when deciding membership, so an asset could be published as "held
 * only by this lane's own manifest" while the registry named it — Virginia
 * CC-1473, bound to track va_exp_nonconviction, was in the list on exactly those
 * terms. The list's summary counts only intended-PAID dependencies, which is a
 * narrower question than retirement turns on, so nothing else caught it.
 *
 * A registry binding is a dependency whether or not a paid pathway has reached
 * it yet, and this list exists to authorise retirement. One wrong row here is a
 * form deleted from the operational inventory while the legal design still
 * points at it.
 */
const namedByTheLegalDesignRegistry = (row) => Boolean(row?.candidateRegistryFormId);

const excludedForALegalDesignBinding = retirement.assets
  .filter((a) => a.determination === "retain_and_remediate" && a.heldOnlyByThisLanesOwnManifest)
  .filter((a) => namedByTheLegalDesignRegistry(byAssetId.get(a.assetId) ?? null))
  .map((a) => {
    const row = byAssetId.get(a.assetId) ?? null;
    return {
      assetId: a.assetId,
      formId: row?.candidateRegistryFormId ?? null,
      trackIds: row?.candidateRegistryTrackIds ?? [],
      why: "the byte-pinned legal-design registry names this asset, so the manifest is not the only thing depending on it"
    };
  });

const rows = retirement.assets
  .filter((a) => a.determination === "retain_and_remediate" && a.heldOnlyByThisLanesOwnManifest)
  .filter((a) => !namedByTheLegalDesignRegistry(byAssetId.get(a.assetId) ?? null))
  .map((a) => {
    const row = byAssetId.get(a.assetId) ?? null;
    return {
      assetId: a.assetId,
      jurisdiction: a.jurisdiction,
      formNumber: a.formNumber,
      formFamilyIds: a.familyIds ?? [],
      // Where the package lives, which is what regeneration would drop.
      familyPackagePaths: (a.familyIds ?? []).map((id) => {
        const slug = id.includes(":") ? id.split(":")[1] : id;
        const state = fs.existsSync(path.join(rootDir, "data/rcap-all50/overlays/production"))
          ? fs.readdirSync(path.join(rootDir, "data/rcap-all50/overlays/production"))
            .find((st) => fs.existsSync(path.join(rootDir, "data/rcap-all50/overlays/production", st, slug)))
          : null;
        return state ? `data/rcap-all50/overlays/production/${state}/${slug}` : null;
      }).filter(Boolean),
      manifestPath: "data/rcap-all50/overlays/overlay-factory-manifest.json",
      // Every reference class, stated as absent rather than omitted: a missing
      // key reads as "not checked", and these were all checked.
      routeReference: (row?.affectedCompiledPathwayIds ?? []).length > 0
        ? row.affectedCompiledPathwayIds : "none: no compiled pathway names this asset",
      packetFamilyReference: (row?.affectedTrackIds ?? []).length > 0
        ? row.affectedTrackIds : "none: no packet track names this asset",
      legalDesignReference: row?.candidateRegistryFormId
        ? { formId: row.candidateRegistryFormId, trackIds: row.candidateRegistryTrackIds ?? [] }
        : "none: the byte-pinned legal-design registry does not name this asset",
      srcRuntimeReferences: (a.useSites ?? [])
        .filter((s) => s.surface !== "overlay_factory_manifest")
        .map((s) => ({ surface: s.surface, runtime: s.runtime === true })),
      // The question the owner actually needs answered.
      anyIntendedPaidPathwayDependsOnIt: row
        ? Boolean(row.sellable || row.publicPacketRoute || row.packetCapable || (row.affectedTrackIds ?? []).length > 0)
        : null,
      paidPathwayBasis: row
        ? `sellable=${row.sellable}, publicPacketRoute=${row.publicPacketRoute}, packetCapable=${row.packetCapable}, affectedTrackIds=${(row.affectedTrackIds ?? []).length}`
        : "this asset is not on the master list, so no pathway posture is recorded for it",
      currentDisposition: row?.disposition ?? null,
      acquisitionPriority: row?.acquisitionPriority ?? null,
      sourceBinaryPresentInClone: row?.sourceBinaryPresentInClone === true
    };
  })
  .sort((a, b) => `${a.jurisdiction}|${a.formNumber}`.localeCompare(`${b.jurisdiction}|${b.formNumber}`));

const payload = {
  schemaVersion: "rcap-manifest-only-retention-list/v1",
  generatedBy: "scripts/generate-rcap-manifest-only-retention-list.mjs",
  purpose: "The assets whose only remaining dependency is this lane's own generated overlay factory manifest, with every reference class stated so the manifest's owner can regenerate from the canonical pathway and packet-family graph rather than from the current file.",
  theDecisionThisSupports: "Do not retain an asset solely because a stale generated manifest names it. Do not retire one without the regenerated canonical graph showing no operational dependency.",
  whyThisCannotBeDecidedHere: "data/rcap-all50/overlays/overlay-factory-manifest.json is read at runtime by src/lib/rcap/all50-internal-preview.ts and is generated from `private/Nationwide Record Clearing/`, which is not in this clone. It cannot be regenerated here, and hand-editing a runtime manifest is not a retirement.",
  ownedBy: "Session A, which owns regenerating the operational manifest from the canonical pathway and packet-family graph",
  totals: {
    assets: rows.length,
    withAnyIntendedPaidPathwayDependency: rows.filter((r) => r.anyIntendedPaidPathwayDependsOnIt).length,
    withAnyNonManifestRuntimeReference: rows.filter((r) => r.srcRuntimeReferences.length > 0).length,
    withSourceBinaryInClone: rows.filter((r) => r.sourceBinaryPresentInClone).length,
    excludedForALegalDesignBinding: excludedForALegalDesignBinding.length
  },
  // Named, not silently filtered. An asset dropped from a retirement list
  // without a reason reads as an oversight the next time someone counts.
  excludedForALegalDesignBinding,
  assets: rows
};

fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload.totals, null, 1));
for (const r of rows) {
  console.log(`${r.jurisdiction} ${r.formNumber} | paid=${r.anyIntendedPaidPathwayDependsOnIt} | route=${Array.isArray(r.routeReference) ? r.routeReference.length : 0} | track=${Array.isArray(r.packetFamilyReference) ? r.packetFamilyReference.length : 0} | prio=${r.acquisitionPriority}`);
}
