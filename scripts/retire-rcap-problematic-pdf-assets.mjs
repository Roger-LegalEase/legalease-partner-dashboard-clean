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
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveOperationalCorpus, refusalReport } from "./rcap-official-forms/operational-corpus-precondition.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DETERMINATION = path.join(rootDir, "data/rcap-all50/pdf-retirement-determination.json");
const OVERLAY_DIR = path.join(rootDir, "data/rcap-all50/overlays/production");
const MARKER = "retirement.json";
const checkOnly = process.argv.includes("--check");
// Clears markers the determination no longer supports. Off by default: a
// retirement ledger that prunes itself on every run is one bad probe away from
// silently un-retiring the corpus, and the refusal is what makes a
// contradiction visible in the first place.
const prune = process.argv.includes("--prune") || process.argv.includes("--prune-stale-only");
/**
 * Remove contradicted markers and touch nothing else.
 *
 * The broad `--prune` clears a stale marker, but it also re-serializes every
 * SURVIVING marker on the same pass, because writing markers and pruning them
 * share one loop. Those rewrites are not corrections: the committed markers were
 * written by a later generator than the one in this tree, so re-serializing
 * replaces their basis and reversal prose with an earlier draft. Repairing two
 * wrong retirements is not a licence to move forty right ones.
 *
 * This mode removes only markers the current determination contradicts, creates
 * nothing, rewrites nothing, and writes outside a retirement-marker path not at
 * all.
 */
const pruneStaleOnly = process.argv.includes("--prune-stale-only");
const DISPUTED_OUT = path.join(rootDir, "data/rcap-all50/pdf-retirement-evidence/disputed-retirement-markers.json");

function fail(message) {
  console.error(`FAIL asset retirement — ${message}`);
  process.exit(1);
}

// ---- writing a marker requires an answerable seventh condition ---------------
// The seventh condition is that the regenerated operational manifest no longer
// names the asset, and it is only answerable with the operational tree mounted.
// Without it the adjudication upstream used to read an empty file list as
// "nothing references this", which is the shape of a proof and the substance of
// a missing directory.
//
// So a marker is never written on an unevaluable condition. Checking is a
// different act and stays allowed: --check compares markers that already exist
// against the determination, which creates no retirement and needs no corpus.
// Writing is what makes an asset disappear from the inventory, and that is the
// direction that has to fail closed.
/**
 * The corpus gate guards the direction that removes an asset from the
 * inventory, which is writing a marker. Removing a marker is the opposite
 * direction: it returns an asset to retained/remediation, and this file already
 * says so -- "Writing is what makes an asset disappear from the inventory, and
 * that is the direction that has to fail closed."
 *
 * --prune-stale-only writes no marker, so it is not gated on the seventh
 * condition. What it IS gated on is the determination being current, which the
 * check above enforces through the generator's own --check. Requiring the
 * corpus here would make the correction for a retirement taken on absent
 * evidence itself impossible without that evidence.
 */
if (!checkOnly && !pruneStaleOnly) {
  const corpus = await resolveOperationalCorpus(rootDir);
  if (!corpus.evaluable) {
    fail(`${refusalReport(corpus)}\n  no retirement marker is written while the seventh condition is unevaluable; --check still verifies markers that already exist`);
  }
}

const determination = fs.existsSync(DETERMINATION)
  ? JSON.parse(fs.readFileSync(DETERMINATION, "utf8"))
  : fail("the retirement determination has not been generated");

/**
 * A removal is only as good as the determination behind it.
 *
 * Pruning against a stale determination un-retires assets on the strength of a
 * probe that no longer describes this tree — the same class of error that
 * retired these assets in the first place. The canonical freshness test is the
 * generator's own --check, so that is what runs.
 */
if (pruneStaleOnly && !checkOnly) {
  try {
    execFileSync("node", [path.join(rootDir, "scripts/generate-rcap-pdf-retirement-determination.mjs"), "--check"], { cwd: rootDir, stdio: "pipe" });
  } catch {
    fail("the retirement determination is stale; regenerate it before pruning, because a removal derived from a stale probe repeats the error it is meant to correct");
  }
}

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

/**
 * What a marker must still say, as opposed to how it says it.
 *
 * This compared the marker's bytes to a freshly serialized one, so a marker was
 * "stale" whenever any derived sentence had been reworded -- and forty of them
 * were, by a LATER generator than the one in this tree: the committed markers
 * name terminal treatments and carry the census caveat, and re-serializing here
 * would have overwritten that guidance with an earlier draft. A retirement
 * ledger checked by prose equality reports authorship drift as a governance
 * failure and repairs it by deleting the better text.
 *
 * So the contract is what a retirement asserts: this asset, this disposition,
 * these families, probed against these surfaces, with no use site and no track,
 * and a historical identity that still matches its source record. Prose must be
 * present and non-empty -- an empty basis is a marker that says nothing -- but
 * its wording is not the contract.
 *
 * Returns null when the marker holds, or a sentence naming the first breach.
 */
function markerContractBreach(file, expected) {
  if (!fs.existsSync(file)) return "no retirement marker is present";
  let actual;
  try { actual = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { return `the marker is not readable JSON (${String(error.message).slice(0, 80)})`; }

  const identical = (key) => JSON.stringify(actual[key]) === JSON.stringify(expected[key]);
  for (const key of ["schemaVersion", "status", "jurisdiction", "formNumber", "assetId"]) {
    if (!identical(key)) {
      return `${key} is ${JSON.stringify(actual[key])}, and the determination says ${JSON.stringify(expected[key])}`;
    }
  }
  // Order is not identity for a set of ids.
  const asSet = (value) => JSON.stringify([...(value ?? [])].sort());
  if (asSet(actual.familyIds) !== asSet(expected.familyIds)) {
    return `it marks families ${asSet(actual.familyIds)}, and the determination retires ${asSet(expected.familyIds)}`;
  }
  if (asSet(actual.surfacesProbed) !== asSet(expected.surfacesProbed)) {
    return `it records ${(actual.surfacesProbed ?? []).length} probed surface(s) and the determination probed ${expected.surfacesProbed.length}`;
  }
  // The two numbers that make a retirement true at all.
  if (Number(actual.useSitesFound) !== 0) return `it records ${actual.useSitesFound} use site(s); a retired asset has none`;
  if ((actual.affectedTrackIds ?? []).length !== 0) {
    return `it records ${actual.affectedTrackIds.length} affected track(s); a retired asset has none`;
  }
  // Identity of the thing retired, so a later reader can tell which form this is.
  for (const key of ["documentId", "sha256", "revision", "documentRole"]) {
    const a = actual.historicalSource?.[key] ?? null;
    const b = expected.historicalSource?.[key] ?? null;
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      return `historicalSource.${key} is ${JSON.stringify(a)}, and the source record says ${JSON.stringify(b)}`;
    }
  }
  for (const key of ["meaning", "basis", "reversal"]) {
    if (typeof actual[key] !== "string" || actual[key].trim() === "") {
      return `${key} is empty; a marker that explains nothing is not evidence`;
    }
  }
  return null;
}

const written = [];
const refused = [];
const pruned = [];
const stale = [];

for (const asset of determination.assets) {
  const dirs = familyDirectoriesFor(asset.familyIds);

  if (asset.determination !== "retirement_candidate") {
    // A retained asset carrying a marker is the dangerous direction: it would
    // vanish from the denominator while the platform still reaches it.
    //
    // Refusing is the right default — a tool that silently deleted markers
    // could quietly undo a deliberate retirement. But a probe correction makes
    // exactly this contradiction expected and numerous, and until now there was
    // no canonical way to clear it: this tool only ever added markers, so the
    // only route back was deleting files by hand, which is how a retirement
    // ledger stops being derived and starts being edited. `--prune` is that
    // route, and it removes a marker only where the determination itself now
    // records a surviving reference.
    for (const dir of dirs) {
      const file = path.join(dir, MARKER);
      if (!fs.existsSync(file)) continue;
      if (prune) {
        if (!checkOnly) fs.rmSync(file);
        pruned.push({
          assetId: asset.assetId,
          jurisdiction: asset.jurisdiction,
          formNumber: asset.formNumber,
          marker: path.relative(rootDir, file),
          survivingReferences: asset.useSites.map((s) => ({ surface: s.surface, runtime: s.runtime, matched: s.matchedIdentifiers }))
        });
        continue;
      }
      refused.push(`${asset.jurisdiction} ${asset.formNumber}: retained (${asset.useSites.map((s) => s.surface).join(", ")}) yet carries a retirement marker at ${path.relative(rootDir, dir)}`);
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
      const problem = markerContractBreach(file, marker);
      if (problem) stale.push(`${path.relative(rootDir, file)}: ${problem}`);
    } else if (!pruneStaleOnly) {
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
  console.error(`FAIL asset retirement — ${stale.length} retirement marker(s) contradict the determination; re-run scripts/retire-rcap-problematic-pdf-assets.mjs`);
  for (const file of stale.slice(0, 10)) console.error(`  ${file}`);
  process.exit(1);
}

// Every marker the correction cleared, with the reference that saved the
// asset. A pruned marker is a retirement that was wrong, and a retirement
// ledger that cannot say which ones were wrong is not a ledger.
if (prune && !checkOnly && !pruneStaleOnly) {
  fs.mkdirSync(path.dirname(DISPUTED_OUT), { recursive: true });
  fs.writeFileSync(DISPUTED_OUT, `${JSON.stringify({
    schemaVersion: "rcap-disputed-retirement-markers/v1",
    writtenBy: "scripts/retire-rcap-problematic-pdf-assets.mjs --prune",
    purpose: "Retirement markers removed because the determination now records a surviving operational reference for the asset.",
    whyThereWereTwoCounts:
      "Markers and assets are not the same denominator. One asset can cover several family packages — VT 200-00131 carries both -en and -form-en — so a disagreement counted in markers is always at least as large as the same disagreement counted in assets.",
    totals: {
      markersRemoved: pruned.length,
      distinctAssetsRestoredToRetained: new Set(pruned.map((p) => p.assetId)).size,
      retirementCandidatesAfterCorrection: determination.totals.retirementCandidates,
      retainedAfterCorrection: determination.totals.retainAndRemediate
    },
    markers: pruned
  }, null, 2)}\n`);
}

console.log(
  `OK asset retirement — ${written.length} marker(s) across ${determination.totals.retirementCandidates} retired asset(s); ` +
    `${determination.totals.retainAndRemediate} retained for remediation` +
    (pruned.length ? `; ${pruned.length} stale marker(s) pruned across ${new Set(pruned.map((p) => p.assetId)).size} asset(s)` : "")
);
