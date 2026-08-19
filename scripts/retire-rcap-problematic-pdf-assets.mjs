#!/usr/bin/env node
// Retires the assets nothing uses, and refuses to retire anything else.
//
//   node scripts/retire-rcap-problematic-pdf-assets.mjs
//   node scripts/retire-rcap-problematic-pdf-assets.mjs --check
//
// Retirement here means one specific thing: the asset leaves the operational
// inventory -- the problematic denominator, the acquisition queue, the scans
// that expect it to become deliverable -- and stays on disk as historical
// evidence with a marker saying why. Nothing is deleted. A form somebody
// resurrects later still has its source record, its census and its reports.
//
// The marker is written only where the retirement determination probed every
// surface and found none that names the asset. This script does not make that
// judgement; it enforces it. Retiring a form because repairing it is hard is
// exactly the failure the determination exists to prevent, so an asset with any
// recorded use site is refused here even if someone lists it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DETERMINATION = path.join(rootDir, "data/rcap-all50/pdf-retirement-determination.json");
const OVERLAY_DIR = path.join(rootDir, "data/rcap-all50/overlays/production");
const MARKER = "retirement.json";
const checkOnly = process.argv.includes("--check");

function fail(message) {
  console.error(`FAIL asset retirement — ${message}`);
  process.exit(1);
}

const determination = fs.existsSync(DETERMINATION)
  ? JSON.parse(fs.readFileSync(DETERMINATION, "utf8"))
  : fail("the retirement determination has not been generated");

if (determination.totals.surfacesUnreadable !== 0) {
  fail("the determination could not read every surface; an unchecked surface cannot support a retirement");
}

/** state directory for a family id like "VT:200-00131-en". */
function familyDirectoriesFor(familyIds) {
  const found = [];
  for (const familyId of familyIds) {
    const slug = familyId.split(":")[1];
    if (!slug) continue;
    for (const stateDir of fs.readdirSync(OVERLAY_DIR)) {
      const candidate = path.join(OVERLAY_DIR, stateDir, slug);
      if (fs.existsSync(path.join(candidate, "source-record.json"))) found.push(candidate);
    }
  }
  return [...new Set(found)];
}

const written = [];
const refused = [];
const stale = [];

for (const asset of determination.assets) {
  const dirs = familyDirectoriesFor(asset.familyIds);

  if (asset.determination !== "retirement_candidate") {
    // A retained asset carrying a marker is the dangerous direction: it would
    // vanish from the denominator while the platform still reaches it.
    for (const dir of dirs) {
      if (fs.existsSync(path.join(dir, MARKER))) {
        refused.push(`${asset.jurisdiction} ${asset.formNumber}: retained (${asset.useSites.map((s) => s.surface).join(", ")}) yet carries a retirement marker at ${path.relative(rootDir, dir)}`);
      }
    }
    continue;
  }

  if (asset.useSites.length > 0) {
    refused.push(`${asset.jurisdiction} ${asset.formNumber}: called a retirement candidate while naming ${asset.useSites.length} use site(s)`);
    continue;
  }
  if (asset.affectedTrackIds.length > 0) {
    refused.push(`${asset.jurisdiction} ${asset.formNumber}: called a retirement candidate while naming ${asset.affectedTrackIds.length} affected track(s)`);
    continue;
  }
  if (dirs.length === 0) {
    refused.push(`${asset.jurisdiction} ${asset.formNumber}: no family directory found to mark`);
    continue;
  }

  for (const dir of dirs) {
    const record = JSON.parse(fs.readFileSync(path.join(dir, "source-record.json"), "utf8"));
    const marker = {
      schemaVersion: "rcap-asset-retirement/v1",
      writtenBy: "scripts/retire-rcap-problematic-pdf-assets.mjs",
      status: "retired_from_operational_inventory",
      jurisdiction: asset.jurisdiction,
      formNumber: asset.formNumber,
      assetId: asset.assetId,
      familyIds: asset.familyIds,
      meaning: "This asset has left the operational inventory: it is out of the problematic denominator, out of the acquisition queue, and no scan expects it to become deliverable. Nothing was deleted. It stays here as historical evidence.",
      basis: asset.determinationBasis,
      surfacesProbed: determination.surfacesProbed.map((s) => s.name),
      useSitesFound: 0,
      affectedTrackIds: [],
      // The identity of what is being retired, kept so a later reader can tell
      // whether a form they are looking at is this one.
      historicalSource: {
        documentId: record.documentId ?? record.fileName ?? null,
        officialTitle: record.officialTitle ?? null,
        revision: record.revision ?? null,
        sha256: record.sha256 ?? record.expectedSha256 ?? null,
        sourceUrl: record.sourceUrl ?? null,
        libraryFolder: record.libraryFolder ?? null,
        documentRole: record.documentRole ?? null
      },
      reversal: "Name this asset from any packet component, composed route, guidance packet, overlay manifest, field-map draft or application source, re-run the retirement determination, and delete this marker. It returns to the operational inventory and must then be remediated like every other retained asset."
    };
    const file = path.join(dir, MARKER);
    const json = `${JSON.stringify(marker, null, 2)}\n`;
    if (checkOnly) {
      const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
      if (current !== json) stale.push(path.relative(rootDir, file));
    } else {
      fs.writeFileSync(file, json);
    }
    written.push(path.relative(rootDir, file));
  }
}

if (refused.length > 0) {
  console.error(`FAIL asset retirement — ${refused.length} refusal(s)`);
  for (const message of refused) console.error(`  ${message}`);
  process.exit(1);
}
if (checkOnly && stale.length > 0) {
  console.error(`FAIL asset retirement — ${stale.length} retirement marker(s) are stale or missing; re-run scripts/retire-rcap-problematic-pdf-assets.mjs`);
  for (const file of stale.slice(0, 10)) console.error(`  ${file}`);
  process.exit(1);
}

console.log(`OK asset retirement — ${written.length} marker(s) across ${determination.totals.retirementCandidates} retired asset(s); ${determination.totals.retainAndRemediate} retained for remediation`);
