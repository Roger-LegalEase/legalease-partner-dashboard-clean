#!/usr/bin/env node
// Regression guard: an official-source raster must be a picture of the official
// source PDF.
//
//   node scripts/verify-rcap-source-raster-provenance.mjs
//
// THE DEFECT THIS PINS
//
// A lane 2 evidence run was asked for official-source rasters when the source
// pack was not mounted. Instead of refusing it lifted the official layer out of
// each finalized artifact -- the source's own stream objects, carried inside the
// artifact's page content -- and rendered that as the source side of every
// comparison. The images look like the form and the manifests read as complete.
//
// They are not evidence. The artifact is the thing under examination, so a
// "source" raster derived from it is the artifact vouching for itself: it cannot
// show anything the artifact did to the form, because whatever the artifact did
// is already baked into the picture on both sides.
//
// So this asserts the two properties that distinguish the two, over every
// visual-evidence package in the tree:
//
//   1. every source raster is bound to a digest that is not its family's
//      artifact digest;
//   2. a family with no official source produced no source raster at all,
//      rather than a substitute.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE = path.join(rootDir, "docs/record-clearing/pdf-visual-evidence");

const failures = [];
const checked = { packages: 0, families: 0, sourceRasters: 0, blocked: 0 };

const indexes = fs.existsSync(EVIDENCE)
  ? fs.readdirSync(EVIDENCE, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(EVIDENCE, d.name, "index.json"))
    .filter((f) => fs.existsSync(f))
  : [];

for (const indexPath of indexes) {
  const rel = path.relative(rootDir, indexPath);
  let index;
  try { index = JSON.parse(fs.readFileSync(indexPath, "utf8")); } catch { continue; }
  // Only packages that claim to carry official-source rasters are in scope.
  if (!Array.isArray(index.families)) continue;
  checked.packages += 1;

  for (const row of index.families) {
    const manifestPath = path.join(rootDir, row.manifest ?? "");
    if (!row.manifest || !fs.existsSync(manifestPath)) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const artifactSha = manifest.artifact?.currentArtifactSha256 ?? null;
    const sourceRasters = (manifest.rasters ?? []).filter((r) => r.of === "source");
    if (!sourceRasters.length) continue;
    checked.families += 1;

    for (const raster of sourceRasters) {
      checked.sourceRasters += 1;
      if (!raster.boundTo) {
        failures.push(`${rel} :: ${row.familyId} page ${raster.page}: source raster names no digest at all`);
        continue;
      }
      if (artifactSha && raster.boundTo === artifactSha) {
        failures.push(
          `${rel} :: ${row.familyId} page ${raster.page}: source raster is bound to the artifact digest ${String(artifactSha).slice(0, 16)}, `
          + "so it is a picture of the artifact rather than of the official source"
        );
      }
    }

    const declared = manifest.officialSource ?? {};
    if (declared.binaryAvailableToThisRun === false) {
      failures.push(
        `${rel} :: ${row.familyId}: the package records that no official binary was available, yet ${sourceRasters.length} source raster(s) were produced anyway`
      );
    }
  }

  // A family the run could not source must appear as blocked and must have no
  // rasters. This is the half that catches a silent substitution: a package that
  // reports every family covered when some had no source is the failure.
  for (const b of index.blockedFamilies ?? []) {
    checked.blocked += 1;
    if ((index.families ?? []).some((f) => f.familyId === b.familyId)) {
      failures.push(`${rel} :: ${b.familyId} is listed as blocked on an absent official source and also as covered`);
    }
  }
}

if (failures.length) {
  console.error(`FAIL source-raster provenance — ${failures.length} finding(s)`);
  for (const f of failures) console.error(`   ${f}`);
  process.exit(1);
}
console.log(
  `OK source-raster provenance — ${checked.packages} package(s), ${checked.families} family/families carrying source rasters, `
  + `${checked.sourceRasters} source raster(s) each bound to a non-artifact digest, ${checked.blocked} blocked family/families carrying none`
);
