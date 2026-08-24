#!/usr/bin/env node
/**
 * Phase 4 correction: normalise the six shards' county/court datasets into the
 * one shape the shared layer serves.
 *
 * The shards produced four different module shapes — `controlled-filing-dataset`,
 * `county-court-directory`, `county-court-instructions` and
 * `record-clearing-filing-locations` — because each shard authored its own half
 * independently. Nothing invents a county or a court: every option here comes
 * from a module already committed to this repository, and every court option
 * carries the quote its shard recorded.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT_DIR, getAllJurisdictionProfiles, getProfileByJurisdiction, projectPublicProfile, writeArtifact, gitSha } from "../flow-audit/lib/engine.mjs";

const PACKS_DIR = path.join(ROOT_DIR, "src/lib/rcap/state-packs");
const DATASET_FILES = ["controlled-filing-dataset", "county-court-directory", "county-court-instructions", "record-clearing-filing-locations"];

const slugOf = (name) => String(name ?? "").toLowerCase().replace(/\s+/g, "-");
const idOf = (label) => String(label).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);

/** Pull every plausible option list out of whatever the module exported. */
function harvest(moduleNamespace) {
  const counties = [];
  const courts = [];
  const seenCounty = new Set();
  const seenCourt = new Set();

  const asOption = (entry) => {
    if (typeof entry === "string") return { label: entry };
    if (!entry || typeof entry !== "object") return null;
    const label = entry.value ?? entry.label ?? entry.name ?? entry.court ?? entry.county ?? entry.destination;
    if (typeof label !== "string" || label.trim() === "") return null;
    return {
      label: label.trim(),
      sourceQuote: typeof entry.quote === "string" ? entry.quote : typeof entry.sourceQuote === "string" ? entry.sourceQuote : undefined,
      sourceRef: typeof entry.sourceRef === "string" ? entry.sourceRef : typeof entry.quotedFrom === "string" ? entry.quotedFrom : undefined,
      courtType: typeof entry.courtType === "string" ? entry.courtType : typeof entry.designation === "string" ? entry.designation : typeof entry.level === "string" ? entry.level : undefined,
      location: typeof entry.location === "string" ? entry.location : typeof entry.judicialDistrict === "string" ? entry.judicialDistrict : typeof entry.qualifier === "string" ? entry.qualifier : undefined,
      counties: Array.isArray(entry.counties) ? entry.counties.filter((value) => typeof value === "string") : undefined
    };
  };

  const pushCounty = (option) => {
    if (!option || seenCounty.has(option.label)) return;
    seenCounty.add(option.label);
    counties.push({ id: idOf(option.label), label: option.label, sourceQuote: option.sourceQuote, sourceRef: option.sourceRef });
  };
  const pushCourt = (option) => {
    if (!option || seenCourt.has(option.label)) return;
    seenCourt.add(option.label);
    courts.push({
      id: idOf(option.label), label: option.label,
      courtType: option.courtType, location: option.location,
      counties: option.counties && option.counties.length > 0 ? option.counties.map(idOf) : null,
      sourceQuote: option.sourceQuote, sourceRef: option.sourceRef
    });
  };

  const walk = (node, keyPath) => {
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      const lower = key.toLowerCase();
      if (Array.isArray(value)) {
        // A list is a county list or a court list by what its key calls it.
        const isCounty = /count(y|ies)|filinglocation|localunit|filingdestination/.test(lower) && !/court/.test(lower);
        const isCourt = /court|destination|designation/.test(lower);
        if (isCounty) for (const entry of value) pushCounty(asOption(entry));
        else if (isCourt) for (const entry of value) pushCourt(asOption(entry));
        continue;
      }
      if (value && typeof value === "object") walk(value, `${keyPath}.${key}`);
    }
  };

  for (const [exportName, exported] of Object.entries(moduleNamespace)) {
    const lower = exportName.toLowerCase();
    if (Array.isArray(exported)) {
      const isCounty = /count(y|ies)|filinglocation|localunit/.test(lower) && !/court/.test(lower);
      const isCourt = /court|destination|designation/.test(lower);
      if (isCounty) for (const entry of exported) pushCounty(asOption(entry));
      else if (isCourt) for (const entry of exported) pushCourt(asOption(entry));
      continue;
    }
    if (exported && typeof exported === "object") walk(exported, exportName);
  }
  return { counties, courts };
}

const catalog = {};
const jurisdictionByPack = new Map();
for (const entry of getAllJurisdictionProfiles()) {
  const code = entry.jurisdiction?.code ?? entry.code;
  const name = entry.jurisdiction?.name ?? entry.name;
  if (code && name) jurisdictionByPack.set(slugOf(name), code);
}

const COUNTY_QUESTION_IDS = ["county", "county_or_filing_location", "filing_location"];
const COURT_QUESTION_IDS = ["court"];

for (const pack of fs.readdirSync(PACKS_DIR)) {
  if (!fs.statSync(path.join(PACKS_DIR, pack)).isDirectory()) continue;
  const code = jurisdictionByPack.get(pack);
  if (!code) continue;
  const namespaces = {};
  for (const file of DATASET_FILES) {
    const relative = `src/lib/rcap/state-packs/${pack}/${file}.ts`;
    if (!fs.existsSync(path.join(ROOT_DIR, relative))) continue;
    try {
      const loaded = await import(path.join(ROOT_DIR, relative));
      Object.assign(namespaces, loaded);
    } catch (error) {
      console.error(`  ! ${relative}: ${String(error?.message ?? error).slice(0, 120)}`);
    }
  }
  if (Object.keys(namespaces).length === 0) continue;
  const { counties, courts } = harvest(namespaces);
  if (counties.length === 0 && courts.length === 0) continue;

  const publicProfile = projectPublicProfile(getProfileByJurisdiction(code));
  const publishedIds = new Set(publicProfile.questions.map((question) => question.id));
  catalog[code] = {
    jurisdiction: code,
    statePack: pack,
    counties, courts,
    countyQuestionIds: COUNTY_QUESTION_IDS.filter((id) => publishedIds.has(id)),
    courtQuestionIds: COURT_QUESTION_IDS.filter((id) => publishedIds.has(id)),
    reviewStatus: "source_backed_from_the_phase_3_state_packs; dataset-owner confirmation still recorded as outstanding"
  };
}

const missingQuestion = [];
for (const entry of getAllJurisdictionProfiles()) {
  const code = entry.jurisdiction?.code ?? entry.code;
  if (!code) continue;
  const publicProfile = projectPublicProfile(getProfileByJurisdiction(code));
  const published = publicProfile.questions.map((question) => question.id);
  if (!published.some((id) => COUNTY_QUESTION_IDS.includes(id) || COURT_QUESTION_IDS.includes(id))) missingQuestion.push(code);
}

const output = {
  schemaVersion: "rcap-county-court-catalog/v1",
  generatedBy: "scripts/expungement-ai/phase4-corrections/build-county-court-catalog.mjs",
  head: gitSha("HEAD"),
  contract: {
    provenance: "Every option is harvested from a committed state-pack module. This file invents no county and no court.",
    manualEntry: "A participant may always type a value the list does not carry. That value is stored separately and is never treated as verified.",
    compatibility: "A jurisdiction absent from `jurisdictions` renders exactly as it did before: the existing free-text question, unchanged.",
    parity: "This is published as an additive field on the question. No question id, type, stage, options array, required flag or contextOnly flag changes, so the screening-parity gate is unaffected and no approved delta is consumed."
  },
  totals: {
    jurisdictionsWithACatalog: Object.keys(catalog).length,
    counties: Object.values(catalog).reduce((sum, entry) => sum + entry.counties.length, 0),
    courts: Object.values(catalog).reduce((sum, entry) => sum + entry.courts.length, 0),
    jurisdictionsPublishingNoCountyOrCourtQuestion: missingQuestion.length
  },
  jurisdictionsPublishingNoCountyOrCourtQuestion: missingQuestion.sort(),
  jurisdictions: Object.fromEntries(Object.keys(catalog).sort().map((code) => [code, catalog[code]]))
};
fs.writeFileSync(path.join(ROOT_DIR, "src/lib/rcap-engine/county-court-catalog.json"), `${JSON.stringify(output, null, 2)}\n`);
writeArtifact("data/expungement-ai/flow-audit/phase4-corrections/county-court-catalog-summary.json", {
  schemaVersion: "expai-phase4-county-court-catalog-summary/v1",
  totals: output.totals,
  jurisdictionsPublishingNoCountyOrCourtQuestion: output.jurisdictionsPublishingNoCountyOrCourtQuestion,
  perJurisdiction: Object.fromEntries(Object.entries(catalog).map(([code, entry]) => [code, { counties: entry.counties.length, courts: entry.courts.length, countyQuestionIds: entry.countyQuestionIds, courtQuestionIds: entry.courtQuestionIds }]))
});
console.log(JSON.stringify(output.totals, null, 1));
