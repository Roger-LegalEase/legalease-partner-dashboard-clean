#!/usr/bin/env node
// The preconditions on each terminal instrument, enforced.
//
//   node scripts/verify-rcap-session-13-terminalization.mjs
//
// Terminalizing is a one-way statement about an asset, so every instrument here
// carries a precondition and the danger is always the same shape: reaching for
// a stronger instrument than the evidence supports because the weaker one looks
// like unfinished work. Retiring a form a packet still requires removes a
// filing from that packet. Excluding one a route still reaches hides an asset
// the runtime can still serve. Claiming a repoint with nowhere to point says
// the asset was dealt with when nothing moved.
//
// Each control arranges the failure and requires a refusal, rather than reading
// the record back and agreeing with it.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { withTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RECORD = "data/rcap-all50/pdf-retirement-evidence/session-13-terminalization.json";
const GENERATOR = "scripts/generate-rcap-session-13-terminalization.mjs";
const LEDGER = "data/rcap-ledger/track-terminalization.json";
const MARKER = "terminal-state.json";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));
const failures = [];

function control(name, problem) {
  if (problem) failures.push(`${name}: ${problem}`);
  else console.log(`  ok  ${name}`);
}

function regenerate() {
  try {
    execFileSync("node", [GENERATOR], { cwd: rootDir, stdio: "pipe" });
    return { refused: false, record: readJson(RECORD) };
  } catch (error) {
    return { refused: true, output: `${error.stdout ?? ""}${error.stderr ?? ""}`.toString() };
  }
}

console.log("session 13 terminalization controls");

const record = readJson(RECORD);
const rows = record.assets;

// 1. Nothing a packet still requires is retired.
control(
  "1. an asset a packet component still names is retired",
  rows.filter((row) => row.terminalOutcome === "retired_from_operational_inventory" && row.legalDesign.components.length > 0)
    .map((row) => `${row.formId} retired while ${row.legalDesign.components.length} packet component(s) name it`)
    .join("; ") || null
);

// 2. Nothing a route still reaches is excluded. This is the precondition that
//    separates the two Kentucky orders: AOC-334's tracks map to no compiled
//    pathway, AOC-497's resolves in the profile the runtime loads.
control(
  "2. an asset a reachable route still serves is launch-safe excluded",
  rows.filter((row) => row.terminalOutcome === "launch_safe_exclusion" && row.routes.some((route) => route.reachable === true))
    .map((row) => `${row.formId} excluded while ${row.routes.filter((route) => route.reachable).map((route) => route.trackId).join(", ")} still resolves`)
    .join("; ") || null
);

// 3. An exclusion needs every naming track terminal in the ledger, not just the
//    convenient one.
control(
  "3. an exclusion rests on a track the ledger has not called terminal",
  rows.filter((row) => row.terminalOutcome === "launch_safe_exclusion" && row.routes.some((route) => route.ledgerTerminal !== true))
    .map((row) => `${row.formId} excluded with a non-terminal track`)
    .join("; ") || null
);

// 4. No repoint is claimed. These five are the canonical edition, so there is
//    nowhere for a reference to move.
control(
  "4. a repoint is claimed with no canonical asset to point at",
  rows.filter((row) => row.repointAvailable || row.terminalOutcome === "repointed_to_canonical_asset")
    .map((row) => `${row.formId} claims a repoint`)
    .join("; ") || null
);

// 5. None of these is a captured index page, and the record has to say so
//    rather than inherit the work view's grouping.
control(
  "5. a filing form is recorded as a captured index page",
  rows.filter((row) => !row.correctionsToTheWorkView?.some((entry) => /not_a_filing_artifact/.test(entry.premise) && entry.holds === false))
    .map((row) => `${row.formId} does not correct the not_a_filing_artifact grouping`)
    .join("; ") || null
);

// 6. Identity, not assertion: "superseded" has to be decided against the digest
//    the archive resolves, and all five match their own identity.
control(
  "6. an asset is called superseded while the archive holds its exact bytes",
  rows.filter((row) => row.identity.matchesTheAssetIdentity !== true || row.identity.supersededByTheArchive !== false)
    .map((row) => `${row.formId} identity=${row.identity.matchesTheAssetIdentity} superseded=${row.identity.supersededByTheArchive}`)
    .join("; ") || null
);

// 7. Every family carries the terminal state its evidence record assigns it.
control(
  "7. a family package disagrees with the evidence record",
  rows.flatMap((row) => row.familyDirectories.map((dir) => {
    const file = path.join(dir, MARKER);
    if (!fs.existsSync(abs(file))) return `${file} is missing`;
    const marker = readJson(file);
    if (marker.terminalOutcome !== row.terminalOutcome) return `${file} says ${marker.terminalOutcome}, the record says ${row.terminalOutcome}`;
    if (marker.assetId !== row.assetId) return `${file} names ${marker.assetId}`;
    return null;
  })).filter(Boolean).join("; ") || null
);

// 8. The outcomes partition the assignment: five in, five accounted for.
control(
  "8. the terminal outcomes do not account for every assigned asset",
  record.totals.assigned === record.totals.retired + record.totals.repointed + record.totals.launchSafeExcluded + record.totals.retained
    ? null
    : `assigned ${record.totals.assigned} but outcomes sum to ${record.totals.retired + record.totals.repointed + record.totals.launchSafeExcluded + record.totals.retained}`
);

// 9. Load-bearing: make an excluded asset's route reachable again and its
//    exclusion has to collapse. Without this, controls 2 and 3 only restate a
//    record that could have been written any way at all.
await withTrackedMutation("session-13-terminalization:route-returns", [RECORD, LEDGER, ...rows.flatMap((row) => row.familyDirectories.map((dir) => path.join(dir, MARKER)))], async () => {
  const ledger = readJson(LEDGER);
  const excluded = rows.find((row) => row.terminalOutcome === "launch_safe_exclusion");
  const reachable = rows.find((row) => row.terminalOutcome === "retained_operational_dependency_survives");
  const borrowedPathway = reachable.routes.find((route) => route.reachable)?.mappedCompiledPathwayIds?.[0];
  for (const route of excluded.routes) {
    const track = ledger.tracks.find((entry) => entry.trackId === route.trackId);
    track.mappedCompiledPathwayIds = [borrowedPathway];
  }
  fs.writeFileSync(abs(LEDGER), `${JSON.stringify(ledger, null, 2)}\n`);

  const result = regenerate();
  control(
    `9. an exclusion survives its route becoming reachable (${excluded.formId})`,
    (() => {
      if (result.refused) return `the generator refused instead of adjudicating:\n${result.output.trim().slice(0, 400)}`;
      const row = result.record.assets.find((entry) => entry.assetId === excluded.assetId);
      if (!row) return "the asset vanished from the record";
      if (row.terminalOutcome === "launch_safe_exclusion") return "the asset is still excluded although a mapped compiled pathway now resolves";
      if (row.terminalOutcome !== "retained_operational_dependency_survives") return `outcome became ${row.terminalOutcome}, expected retained`;
      return null;
    })()
  );
});

// The mutation must leave the committed record exactly as it found it.
try {
  execFileSync("node", [GENERATOR, "--check"], { cwd: rootDir, stdio: "pipe" });
} catch (error) {
  failures.push(`the committed terminalization is not back at its value after the mutation:\n${`${error.stdout ?? ""}${error.stderr ?? ""}`.trim()}`);
}

if (failures.length > 0) {
  console.error(`FAIL session 13 terminalization — ${failures.length} control(s) did not hold`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(
  `OK session 13 terminalization — 9 control(s) hold; ${record.totals.assigned} asset(s): ${record.totals.retired} retired, ` +
    `${record.totals.repointed} repointed, ${record.totals.launchSafeExcluded} launch-safe excluded, ${record.totals.retained} retained`
);
