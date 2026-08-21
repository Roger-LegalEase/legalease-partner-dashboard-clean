#!/usr/bin/env node
// Where every source-required asset actually stands.
//
//   node scripts/generate-rcap-source-population-reconciliation.mjs
//   node scripts/generate-rcap-source-population-reconciliation.mjs --check
//
// Four lanes reported and none of them acquired a binary, which is easy to
// misread as four lanes reporting the same thing. They did not: one proved which
// publisher is authoritative, one resolved identities to official URLs, one
// specified which families the Master Library can already satisfy, and one
// adjudicated retirement. Collapsing those into "still blocked" would discard
// the distinction that decides what Session 5 can execute next.
//
// So each asset lands in exactly one state, and the states are ordered by how
// close the asset is to having a usable binary:
//
//   packable_from_master_library   the bytes exist locally; a pack can carry them
//   landing_page_resolved          the official page is identified, no binary yet
//   direct_url_resolved            an official direct URL, acquisition blocked
//   contaminated_source            a recorded URL that is not this form
//   html_capture_not_a_form        what was captured is an index page
//   publisher_searched_no_binary   asked the publisher of record, nothing returned
//   never_searched                 no publisher-of-record search performed yet
//
// The rule this file exists to enforce: an identity resolution is not an
// acquisition. Nothing below reduces retained_missing, because no lane produced
// a binary, and retained_missing counts binaries that are present.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const HANDOFFS = "data/rcap-all50/pdf-source-handoffs";
const PACKS = "data/rcap-all50/source-packs/index.json";
const ADJUDICATION = "data/rcap-all50/pdf-retirement-evidence/retirement-repoint-adjudication.json";
const LEDGER = "data/rcap-all50/pdf-independent-reviews/inventory-closure-ledger.json";
const QUEUE = "data/rcap-all50/gate-b-81-terminalization-queue.json";
const OUT = "data/rcap-all50/source-population-reconciliation.json";
const OUT_MD = "docs/record-clearing/source-population-reconciliation.md";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => (fs.existsSync(abs(rel)) ? JSON.parse(fs.readFileSync(abs(rel), "utf8")) : null);

function fail(message) {
  console.error(`FAIL source population — ${message}`);
  process.exit(1);
}

const ledger = readJson(LEDGER) ?? fail("no closure ledger");
const queue = readJson(QUEUE) ?? fail("no terminalization queue");
const packs = readJson(PACKS);
const adjudication = readJson(ADJUDICATION);
const publisher = readJson(`${HANDOFFS}/source-direct/publisher-of-record.json`);
const resolution = readJson(`${HANDOFFS}/source-resolution/source-resolution-findings.json`);

/** Every disposition any lane recorded, keyed by the asset it was recorded against. */
const dispositions = new Map();
const noteDisposition = (assetId, lane, disposition, detail) => {
  if (!assetId) return;
  if (!dispositions.has(assetId)) dispositions.set(assetId, []);
  dispositions.get(assetId).push({ lane, disposition, detail: detail ?? null });
};

for (const file of ["publisher-of-record.json", "batch-1-ky.json", "batch-2-al.json", "batch-3-ar-ak.json"]) {
  const body = readJson(`${HANDOFFS}/source-direct/${file}`);
  for (const asset of body?.assets ?? []) {
    noteDisposition(asset.assetId ?? asset.identity, "source-direct",
      asset.disposition ?? asset.status ?? null, asset.resolvedUrl ?? asset.publisherOfRecord ?? null);
  }
}
for (const file of ["source-resolution-findings.json", "publisher-resolutions.json"]) {
  const body = readJson(`${HANDOFFS}/source-resolution/${file}`);
  for (const asset of body?.rows ?? body?.assets ?? body?.resolutions ?? []) {
    noteDisposition(asset.assetId ?? asset.identity, "source-resolution",
      asset.disposition ?? asset.status ?? null, asset.resolvedUrl ?? null);
  }
}

/** Families the Master Library can already satisfy, from the pack specification. */
const packableFamilies = new Set();
{
  // The index lists pack ids; the family ids live in each pack's own manifest,
  // under `files[].familyIds`. Reading the index alone would silently find
  // nothing and report every asset unpackable, which is the same answer for the
  // wrong reason.
  const packDir = path.dirname(PACKS);
  const manifests = fs.existsSync(abs(packDir))
    ? fs.readdirSync(abs(packDir)).filter((f) => f.endsWith(".manifest.json"))
    : [];
  for (const file of manifests) {
    const manifest = readJson(path.join(packDir, file));
    for (const entry of manifest?.files ?? manifest?.families ?? []) {
      for (const familyId of entry.familyIds ?? [entry.familyId ?? entry]) {
        if (typeof familyId === "string") packableFamilies.add(familyId);
      }
    }
  }
  if (manifests.length && packableFamilies.size === 0) {
    fail(`${manifests.length} pack manifest(s) yielded no family ids; the manifest shape changed`);
  }
}

const STATES = [
  "packable_from_master_library", "direct_url_resolved", "landing_page_resolved",
  "contaminated_source", "html_capture_not_a_form",
  "publisher_searched_no_binary", "never_searched"
];

function stateFor(asset) {
  const recorded = dispositions.get(asset.assetId) ?? [];
  const say = (s) => recorded.some((r) => String(r.disposition ?? "").includes(s));

  if (asset.familyIds?.some((f) => packableFamilies.has(f))) {
    return { state: "packable_from_master_library",
      because: "the Master Library holds this family's pinned source and a committed pack manifest already specifies it; no external fetch is needed",
      nextAction: "Session 5 runs the pack generator with --build in a corpus-mounted container and materialises the ZIP" };
  }
  if (say("captured_index_page_not_an_official_form") || say("not_an_official_form")) {
    return { state: "html_capture_not_a_form",
      because: "what was captured is an index or landing page, not the official form",
      nextAction: "discard the capture and search the publisher of record for the form binary" };
  }
  if (say("contaminated")) {
    return { state: "contaminated_source",
      because: "the recorded URL resolves to something that is not this form",
      nextAction: "replace the recorded URL, then acquire and hash the official binary" };
  }
  if (say("official_direct_url_resolved")) {
    return { state: "direct_url_resolved",
      because: "an official direct PDF URL is identified and acquisition was blocked in the resolving environment",
      nextAction: "fetch the direct URL in an egress-permitted container and record the SHA-256 of the retrieved bytes" };
  }
  if (say("official_landing_page_resolved")) {
    return { state: "landing_page_resolved",
      because: "the official landing page is identified; the binary behind it has not been retrieved",
      nextAction: "follow the landing page to the form binary, retrieve it, and record its SHA-256" };
  }
  if (say("publisher_of_record_searched_no_binary_returned")) {
    return { state: "publisher_searched_no_binary",
      because: "the publisher of record was searched and returned no binary for this form",
      nextAction: "record a no-official-source finding naming what was searched, or escalate for a retirement decision" };
  }
  return { state: "never_searched",
    because: "no publisher-of-record search has been performed against this asset",
    nextAction: "search the publisher of record for this jurisdiction and form number" };
}

const sourceRequired = queue.assets.filter((a) => a.primaryBucket === "SOURCE_REQUIRED");
const assets = sourceRequired.map((asset) => {
  const decided = stateFor(asset);
  return {
    assetId: asset.assetId,
    jurisdiction: asset.jurisdiction,
    familyId: asset.familyId,
    formId: asset.formId,
    state: decided.state,
    because: decided.because,
    nextAction: decided.nextAction,
    binaryPresentInClone: asset.binaryPresent === true,
    lanesReporting: (dispositions.get(asset.assetId) ?? []).map((r) => r.lane)
  };
});

const byState = Object.fromEntries(STATES.map((s) => [s, assets.filter((a) => a.state === s).length]));

// The claims each lane is and is not making, taken from the lanes' own records.
const acquired = Number(publisher?.totals?.acquired ?? 0)
  + Number(resolution?.totals?.acquiredHere ?? 0);
const retirementsWritten = Number(adjudication?.totals?.retirementsWritten ?? 0);
const repointsRecorded = Number(adjudication?.totals?.repointsRecorded ?? 0);

if (acquired !== 0) fail(`a lane reports ${acquired} acquisition(s); the reconciliation assumes none and must be re-derived`);

const record = {
  schemaVersion: "rcap-source-population-reconciliation/v1",
  generatedBy: "scripts/generate-rcap-source-population-reconciliation.mjs",
  head: ledger.head ?? null,
  consumed: {
    sourceDirect: "data/rcap-all50/pdf-source-handoffs/source-direct/**",
    sourceResolution: "data/rcap-all50/pdf-source-handoffs/source-resolution/**",
    retirementAdjudication: ADJUDICATION,
    sourcePackIndex: PACKS
  },
  anIdentityResolutionIsNotAnAcquisition:
    "Across all four handoffs, zero binaries were acquired and zero SHA-256 digests were recomputed from newly retrieved bytes. The source-resolution lane resolved 19 assets to official hosts and states acquiredHere = 0; the direct lane searched 2 of 18 and states acquired = 0. Those are identity findings, and identity is not possession. retained_missing counts assets whose pinned binary is absent from this clone, so it does not move.",
  retirementOutcome: {
    assetsAssigned: Number(adjudication?.totals?.assetsAssigned ?? 0),
    retirementsWritten,
    repointsRecorded,
    retainedWithABlockingDependency: Number(adjudication?.totals?.retainedWithABlockingDependency ?? 0),
    consequence: retirementsWritten === 0 && repointsRecorded === 0
      ? "No asset earned retirement or a repoint, so retired stays where it is. Every assigned asset still carries a surviving operational dependency, which is the one condition that forbids retirement."
      : "A retirement or repoint was recorded and the determination must be re-derived."
  },
  packability: {
    corpusMountedWhereThePacksWereSpecified: packs?.corpusMounted ?? null,
    zipsBuilt: Number(packs?.zipsBuilt ?? 0),
    packsSpecified: (packs?.packs ?? []).length,
    familiesCoveredByAPack: packs?.coverage?.familiesCoveredByAPack ?? null,
    familiesWithNoPinnedSource: packs?.coverage?.familiesWithNoPinnedSource ?? null,
    whyThisIsNotAnAcquisition:
      "A pack manifest is a specification, not bytes. No ZIP was built, because no Master Library was mounted where the packs were generated. The manifests say what each pack must contain; Session 5 owns building them."
  },
  totals: {
    sourceRequiredAssets: assets.length,
    byState,
    binariesAcquiredAcrossAllLanes: acquired,
    digestsRecomputedFromNewBytes: 0,
    retainedMissingUnchanged: true
  },
  denominatorUnmoved: {
    platform_ready: ledger.equation.platformReady,
    retired: ledger.equation.retired,
    retained_problematic: ledger.equation.retainedProblematic,
    retained_missing: ledger.retainedBreakdown.retainedMissing,
    because: "no binary was acquired and no retirement or repoint was earned, so no canonical disposition moved a row."
  },
  assets
};

function markdown() {
  const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
  const lines = [];
  lines.push("# Source population reconciliation");
  lines.push("");
  lines.push(record.anIdentityResolutionIsNotAnAcquisition);
  lines.push("");
  lines.push("| state | assets |");
  lines.push("| --- | ---: |");
  for (const s of STATES) lines.push(`| ${s} | ${byState[s]} |`);
  lines.push("");
  lines.push("## Retirement");
  lines.push("");
  lines.push(record.retirementOutcome.consequence);
  lines.push("");
  lines.push("## Packability");
  lines.push("");
  lines.push(record.packability.whyThisIsNotAnAcquisition);
  lines.push("");
  for (const s of STATES) {
    const rows = assets.filter((a) => a.state === s);
    if (!rows.length) continue;
    lines.push(`## ${s} — ${rows.length}`);
    lines.push("");
    lines.push("| jur | form | next executable action |");
    lines.push("| --- | --- | --- |");
    for (const a of rows) lines.push(`| ${a.jurisdiction} | ${cell(a.formId)} | ${cell(a.nextAction).slice(0, 150)} |`);
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
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-source-population-reconciliation.mjs`);

console.log(
  `OK source population — ${assets.length} source-required assets: ` +
    STATES.filter((s) => byState[s]).map((s) => `${s} ${byState[s]}`).join(", ") +
    `; ${acquired} binaries acquired, ${retirementsWritten} retirements written, denominator unmoved`
);
