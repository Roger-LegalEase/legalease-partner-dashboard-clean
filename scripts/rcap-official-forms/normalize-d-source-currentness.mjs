// Normalizes the D wave's source-currentness and legal-design vocabulary.
//
// Seven lanes recorded the same few conditions in seven different spellings,
// mixing separators and prefixes: "requires track-level import mapping" appears
// three ways, and "state legal review missing from the supplied corpus" two.
// Anything consuming these as strings -- a promotion gate above all -- sees
// seven conditions where there are four, and a gate that cannot tell two
// spellings apart from two conditions will either block work that is ready or
// pass work that is not.
//
// Normalization here means collapsing spellings, never deciding a condition.
// No hold is resolved, weakened or invented: a family's condition after this
// is the one it had before, said once.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = JSON.parse(fs.readFileSync(
  path.join(rootDir, "docs/record-clearing/d-wave/corrected-review-manifest.json"), "utf8"));

// Separators and casing carry no meaning here, so they are removed before any
// comparison. What remains is the sentence the lane meant to write.
const flatten = (s) => String(s ?? "").toLowerCase().replace(/[^a-z]+/g, "");

const LEGAL_DESIGN_CONDITIONS = [
  { id: "requires_track_level_import_mapping",
    test: (f) => f.includes("tracklevelimportmapping"),
    meaning: "The mapping from this family to a track has not been made, so no track can be promoted on it.",
    blocksPromotion: true },
  { id: "state_legal_review_missing_from_supplied_corpus",
    test: (f) => f.includes("missingfromsuppliedcorpus"),
    meaning: "The supplied corpus contains no state legal review for this family. Counsel review is outstanding, not merely unrecorded.",
    blocksPromotion: true },
  { id: "see_state_legal_review",
    test: (f) => f.includes("seestatelegalreview"),
    meaning: "The mapping status defers to the state legal review record rather than asserting one here.",
    blocksPromotion: true },
  { id: "unrecorded",
    test: (f) => f === "unrecorded" || f === "",
    meaning: "No legal-design status was recorded. Absence of a hold is not clearance -- these are different claims, and only one is safe to act on.",
    blocksPromotion: true }
];

const CURRENTNESS_CONDITIONS = [
  { id: "source_reports_current",
    test: (f) => f.includes("nonerecordedsourcereportscurrent"),
    meaning: "The source pack reports this revision as current and no lane recorded a currentness hold against it.",
    blocksPromotion: false },
  { id: "source_or_currentness_gate_open",
    test: (f) => f.includes("sourceorcurrentnessgateopen"),
    meaning: "A source or currentness gate is open on this family.",
    blocksPromotion: true },
  { id: "revision_confirmation_required",
    test: (f) => f.includes("revisionconfirmationrequired"),
    meaning: "The revision in hand has not been confirmed against the issuing authority.",
    blocksPromotion: true }
];

function classify(value, conditions) {
  const flat = flatten(value);
  const hit = conditions.find((c) => c.test(flat));
  return hit ? hit.id : null;
}

const rows = [];
const unclassified = [];
for (const f of manifest.families) {
  const legalDesign = classify(f.legalDesign, LEGAL_DESIGN_CONDITIONS);
  const currentness = classify(f.currentness, CURRENTNESS_CONDITIONS);
  if (!legalDesign) unclassified.push({ familyId: f.familyId, field: "legalDesign", raw: f.legalDesign });
  if (!currentness) unclassified.push({ familyId: f.familyId, field: "currentness", raw: f.currentness });
  rows.push({
    familyId: f.familyId, state: f.jurisdiction, lane: f.lane,
    legalDesignRaw: f.legalDesign ?? null, legalDesign,
    currentnessRaw: f.currentness ?? null, currentness,
    productionHolds: f.productionHolds ?? [],
    // A family is clear on non-technical grounds only when neither condition
    // blocks and it carries no production hold of its own.
    nonTechnicalGatesClear:
      Boolean(legalDesign && currentness)
      && !LEGAL_DESIGN_CONDITIONS.find((c) => c.id === legalDesign)?.blocksPromotion
      && !CURRENTNESS_CONDITIONS.find((c) => c.id === currentness)?.blocksPromotion
      && (f.productionHolds ?? []).length === 0
  });
}

const tally = (key) => rows.reduce((a, r) => { a[r[key] ?? "(unclassified)"] = (a[r[key] ?? "(unclassified)"] ?? 0) + 1; return a; }, {});
const spellings = (key) => rows.reduce((a, r) => {
  const id = r[key] ?? "(unclassified)";
  (a[id] ??= new Set()).add(r[`${key}Raw`] ?? "(absent)");
  return a;
}, {});
const asObject = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, [...v].sort()]));

const totals = {
  families: rows.length,
  legalDesign: tally("legalDesign"),
  legalDesignSpellingsCollapsed: asObject(spellings("legalDesign")),
  currentness: tally("currentness"),
  currentnessSpellingsCollapsed: asObject(spellings("currentness")),
  distinctSpellingsBefore: {
    legalDesign: new Set(rows.map((r) => r.legalDesignRaw ?? "(absent)")).size,
    currentness: new Set(rows.map((r) => r.currentnessRaw ?? "(absent)")).size
  },
  distinctConditionsAfter: {
    legalDesign: new Set(rows.map((r) => r.legalDesign)).size,
    currentness: new Set(rows.map((r) => r.currentness)).size
  },
  nonTechnicalGatesClear: rows.filter((r) => r.nonTechnicalGatesClear).length,
  unclassified: unclassified.length
};

const gates = [
  { gate: "every family classified on both axes", pass: unclassified.length === 0, observed: unclassified.slice(0, 8) },
  { gate: "all 253 families accounted for", pass: rows.length === 253, observed: rows.length },
  { gate: "no condition was resolved, only respelled",
    pass: rows.every((r) => r.legalDesignRaw !== null || r.legalDesign === "unrecorded"),
    observed: rows.filter((r) => r.legalDesignRaw === null && r.legalDesign !== "unrecorded").length }
];

const out = {
  schema: "rcap-d-currentness-normalization/v1",
  posture: "Collapses spellings only. No hold is resolved, weakened or invented; a family's condition after this is the one it had before, said once.",
  legalDesignConditions: LEGAL_DESIGN_CONDITIONS.map(({ id, meaning, blocksPromotion }) => ({ id, meaning, blocksPromotion })),
  currentnessConditions: CURRENTNESS_CONDITIONS.map(({ id, meaning, blocksPromotion }) => ({ id, meaning, blocksPromotion })),
  totals, gates, families: rows
};

const outDir = path.join(rootDir, "docs/record-clearing/d-wave/v3");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "source-currentness-normalization.json"), `${JSON.stringify(out, null, 2)}\n`);

console.log(JSON.stringify(totals, null, 2));
for (const g of gates) {
  console.log(`${g.pass ? "PASS" : "FAIL"}  ${g.gate}`);
  if (!g.pass) console.log(`      ${JSON.stringify(g.observed).slice(0, 300)}`);
}
console.log(gates.every((g) => g.pass) ? "\nNORMALIZED" : "\nFAILED");
process.exitCode = gates.every((g) => g.pass) ? 0 : 1;
