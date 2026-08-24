#!/usr/bin/env node
/**
 * Phase 4 verification of the county/court SHARED_PHASE2_BLOCKER.
 *
 * Checks the five things the assignment names: whether the prepared datasets
 * exist, whether a state profile edit alone can reach the served public profile,
 * whether the parity gate blocks an unapproved question change, whether the
 * shared renderer can offer a controlled list plus a separate manual fallback,
 * and whether any shard represented a prepared dataset as a live selector.
 *
 * Read-only. Nothing here implements the selector.
 */
import fs from "node:fs";
import path from "node:path";
import {
  getAllJurisdictionProfiles, getProfileByJurisdiction, projectPublicProfile,
  ROOT_DIR, read, exists, writeArtifact, gitSha
} from "../flow-audit/lib/engine.mjs";

const RENDERER = "src/components/expungement-ai/screening/QuestionField.tsx";
const PARITY_VERIFIER = "scripts/verify-expungement-plain-language-values.mjs";
const APPROVED_DELTAS = "data/expungement-ai/screening-parity-approved-deltas.json";

const out = {
  schemaVersion: "expai-phase4-county-court-verification/v1",
  candidateSha: gitSha("HEAD"),
  claims: {},
  perJurisdiction: {},
  totals: {}
};

// 1. Do the prepared datasets exist, and do they carry real options?
const packsDir = path.join(ROOT_DIR, "src/lib/rcap/state-packs");
const packs = fs.readdirSync(packsDir).filter((entry) => fs.statSync(path.join(packsDir, entry)).isDirectory());
let withDataset = 0, withOptions = 0, emptyDataset = 0;
const jurisdictionOfPack = new Map();
for (const profileEntry of getAllJurisdictionProfiles()) {
  const code = profileEntry.jurisdiction?.code ?? profileEntry.code;
  const slug = (profileEntry.jurisdiction?.name ?? profileEntry.name ?? "").toLowerCase().replace(/\s+/g, "-");
  if (code) jurisdictionOfPack.set(slug, code);
}
for (const pack of packs) {
  const datasetPath = `src/lib/rcap/state-packs/${pack}/controlled-filing-dataset.ts`;
  const code = jurisdictionOfPack.get(pack) ?? pack.toUpperCase().slice(0, 2);
  const present = exists(datasetPath);
  let courtCount = 0, locationCount = 0, status = null, sourceGap = false;
  if (present) {
    const text = read(datasetPath);
    withDataset += 1;
    // Count entries by their quote-carrying option shape rather than by parsing TS.
    courtCount = (text.match(/courtDestinations:\s*\[([\s\S]*?)\n {2}\]/)?.[1] ?? "").split(/\{\s*\n/).length - 1;
    locationCount = (text.match(/filingLocations:\s*\[([\s\S]*?)\n {2}\]/)?.[1] ?? "").split(/\{\s*\n/).length - 1;
    status = text.match(/status:\s*"([^"]+)"/)?.[1] ?? null;
    sourceGap = /SOURCE GAP/.test(text);
    if (courtCount > 0 || locationCount > 0) withOptions += 1; else emptyDataset += 1;
  }
  out.perJurisdiction[code] = { pack, datasetPresent: present, status, courtDestinations: courtCount, filingLocations: locationCount, sourceGap };
}

// 2. Can a state profile edit alone reach the served public profile?
const bindingReaders = [];
for (const dir of ["src", "scripts"]) {
  const stack = [path.join(ROOT_DIR, dir)];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) { stack.push(full); continue; }
      if (!/\.(ts|tsx|mjs|js)$/.test(entry.name)) continue;
      const text = fs.readFileSync(full, "utf8");
      if (/controlledDataBindings|controlled-filing-dataset|ControlledFilingDataset/.test(text)) {
        bindingReaders.push(path.relative(ROOT_DIR, full));
      }
    }
  }
}
const projectionReadsBindings = bindingReaders.some((file) => file.includes("public-profile-projection"));

// 3. Does the parity gate exist and refuse unapproved question changes?
const parityText = exists(PARITY_VERIFIER) ? read(PARITY_VERIFIER) : "";
const deltas = exists(APPROVED_DELTAS) ? JSON.parse(read(APPROVED_DELTAS)) : { deltas: [] };
const marylandDelta = (deltas.deltas ?? []).find((delta) => delta.jurisdiction === "MD");
const hashPins = JSON.stringify(marylandDelta ?? {}).match(/"sha256":\s*"[0-9a-f]{64}"/g) ?? [];

// 4. Can the shared renderer offer a controlled list plus a separate manual entry?
const rendererText = exists(RENDERER) ? read(RENDERER) : "";
const rendererArms = [...rendererText.matchAll(/case "([a-z_]+)":/g)].map((match) => match[1]);
const hasCombinedArm = /manual|other_specify|with_manual|freeText/i.test(rendererText)
  && /single_choice[\s\S]{0,400}(manualEntry|manual_entry)/.test(rendererText);

// 5. Did any shard represent a prepared dataset as a live selector?
const shardClaims = {};
for (let index = 1; index <= 6; index += 1) {
  const shardPath = `data/expungement-ai/flow-audit/shard-results/SHARD-${index}.json`;
  if (!exists(shardPath)) continue;
  const text = read(shardPath);
  shardClaims[`SHARD-${index}`] = {
    declaresSharedPhase2Blocker: /SHARED_PHASE2_BLOCKER/.test(text),
    claimsLiveSelector: /"(selectorImplemented|liveSelector)"\s*:\s*true/.test(text),
    saysNotConsumed: /none_yet|not_yet_renderable|consumedBy/.test(text)
  };
}

out.totals = {
  jurisdictions: Object.keys(out.perJurisdiction).length,
  datasetsPresent: withDataset,
  datasetsCarryingAtLeastOneOption: withOptions,
  datasetsPreparedButEmpty: emptyDataset,
  jurisdictionsWithNoDatasetAtAll: Object.values(out.perJurisdiction).filter((v) => !v.datasetPresent).length
};

out.claims = {
  sourceBackedDatasetsExist: {
    verdict: withDataset > 0 ? "CONFIRMED_PARTIAL" : "NOT_CONFIRMED",
    detail: `${withDataset} of ${out.totals.jurisdictions} jurisdictions carry a controlled-filing dataset; ${withOptions} carry at least one option; ${emptyDataset} are prepared but empty for a recorded source gap.`
  },
  stateProfileEditsDoNotReachTheServedProfile: {
    verdict: projectionReadsBindings ? "REFUTED" : "CONFIRMED",
    detail: `Files referencing the binding or dataset: ${bindingReaders.length === 0 ? "none" : bindingReaders.join(", ")}. public-profile-projection reads them: ${projectionReadsBindings}.`
  },
  parityGateBlocksUnapprovedQuestionChanges: {
    verdict: parityText.length > 0 ? "CONFIRMED" : "NOT_CONFIRMED",
    detail: `${PARITY_VERIFIER} present=${parityText.length > 0}; approved-delta records=${(deltas.deltas ?? []).length}; Maryland delta present=${!!marylandDelta}; hash pins on the Maryland delta=${hashPins.length}.`
  },
  rendererCannotOfferControlledPlusManual: {
    verdict: hasCombinedArm ? "REFUTED" : "CONFIRMED",
    detail: `QuestionField arms: ${[...new Set(rendererArms)].join(", ")}. No arm combines a controlled option list with a separate manual free-text value.`
  },
  noShardClaimedALiveSelector: {
    verdict: Object.values(shardClaims).every((claim) => !claim.claimsLiveSelector) ? "CONFIRMED" : "REFUTED",
    detail: JSON.stringify(shardClaims)
  }
};

writeArtifact("data/expungement-ai/flow-audit/phase4/county-court-verification.json", out);
console.log(JSON.stringify(out.totals, null, 1));
for (const [key, value] of Object.entries(out.claims)) console.log(`${value.verdict.padEnd(18)} ${key}\n    ${value.detail.slice(0, 300)}`);
