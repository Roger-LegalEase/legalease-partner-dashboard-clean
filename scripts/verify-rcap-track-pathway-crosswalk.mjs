// Completion gate for the registry ↔ pathway crosswalk.
//
// The crosswalk is only useful if it cannot quietly lose a track, invent a
// mapping, or drift from the tree it claims to describe. This verifier asserts
// those properties against the committed artifact and the live compiled
// profiles, and re-derives the artifact to prove the numbers are reproducible
// rather than recorded.
//
//   npm run rcap:verify-track-pathway-crosswalk

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const crosswalkPath = path.join(rootDir, "data/rcap-ledger/track-pathway-crosswalk.json");
const projectionPath = path.join(rootDir, "data/rcap-ledger/registry-crosswalk-projection.json");
const profileDir = path.join(rootDir, "src/lib/rcap-engine/compiled/profiles");

const failures = [];
const checks = [];

function check(name, condition, detail) {
  if (condition) {
    checks.push(name);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  }
}

for (const required of [crosswalkPath, projectionPath]) {
  if (!fs.existsSync(required)) {
    console.error(`Missing ${path.relative(rootDir, required)}.`);
    process.exit(1);
  }
}

const crosswalk = JSON.parse(fs.readFileSync(crosswalkPath, "utf8"));
const projection = JSON.parse(fs.readFileSync(projectionPath, "utf8"));

const MAPPED_RELATIONS = new Set([
  "direct_runtime_representation",
  "compiled_variant_of_registry_track",
]);
const TERMINAL_RELATIONS = new Set(["registry_scoped_out_named_authority"]);
const UNRESOLVED_RELATIONS = new Set([
  "unresolved_ambiguous_candidates",
  "unresolved_no_candidate",
]);
const ALL_RELATIONS = new Set([...MAPPED_RELATIONS, ...TERMINAL_RELATIONS, ...UNRESOLVED_RELATIONS]);

const TRACK_DISPOSITIONS = new Set([
  "exact_current_pathway",
  "represented_by_compiled_variants",
  "missing_from_compiled_runtime",
  "unresolved_ambiguous_candidates",
]);

// --- live denominators, recomputed rather than trusted ------------------------

let liveePathways = 0;
const liveIds = new Set();
const liveJurisdictions = new Set();
for (const file of fs.readdirSync(profileDir).filter((f) => f.endsWith(".json"))) {
  const profile = JSON.parse(fs.readFileSync(path.join(profileDir, file), "utf8"));
  const code = String(profile.jurisdiction?.code || profile.jurisdiction).toUpperCase();
  liveJurisdictions.add(code);
  for (const pathway of profile.pathways || []) {
    liveePathways += 1;
    liveIds.add(`${code}:${pathway.id}`);
  }
}

const tracks = crosswalk.registryTracks;
const pathways = crosswalk.compiledPathways;

check(
  "registry track count matches the pinned projection",
  tracks.length === projection.trackCount,
  `crosswalk ${tracks.length} vs projection ${projection.trackCount}`
);
check(
  "compiled pathway count matches the live profiles",
  pathways.length === liveePathways,
  `crosswalk ${pathways.length} vs live ${liveePathways}`
);
check(
  "compiled jurisdiction count matches the live profiles",
  crosswalk.aggregates.compiledJurisdictions === liveJurisdictions.size,
  `${crosswalk.aggregates.compiledJurisdictions} vs ${liveJurisdictions.size}`
);

// --- representation exactly once ---------------------------------------------

const trackKeys = tracks.map((t) => `${t.jurisdiction}:${t.registryTrackId}`);
const pathwayKeys = pathways.map((p) => `${p.jurisdiction}:${p.compiledPathwayId}`);
check(
  "every registry track is represented exactly once",
  new Set(trackKeys).size === trackKeys.length,
  `${trackKeys.length - new Set(trackKeys).size} duplicates`
);
check(
  "every compiled pathway is represented exactly once",
  new Set(pathwayKeys).size === pathwayKeys.length,
  `${pathwayKeys.length - new Set(pathwayKeys).size} duplicates`
);

const missingFromCrosswalk = [...liveIds].filter((id) => !new Set(pathwayKeys).has(id));
check(
  "no compiled pathway is silently dropped",
  missingFromCrosswalk.length === 0,
  missingFromCrosswalk.slice(0, 5).join(", ")
);

const projectionKeys = new Set(projection.tracks.map((t) => `${t.jurisdiction}:${t.trackId}`));
const missingTracks = [...projectionKeys].filter((id) => !new Set(trackKeys).has(id));
check(
  "no registry track is silently dropped",
  missingTracks.length === 0,
  missingTracks.slice(0, 5).join(", ")
);

// --- classification totality --------------------------------------------------

const badRelation = pathways.filter((p) => !ALL_RELATIONS.has(p.registryRelation));
check(
  "every compiled pathway carries a known relationship or terminal classification",
  badRelation.length === 0,
  badRelation.slice(0, 3).map((p) => p.compiledPathwayId).join(", ")
);

const badDisposition = tracks.filter((t) => !TRACK_DISPOSITIONS.has(t.compiledCoverageDisposition));
check(
  "every registry track carries a known coverage disposition",
  badDisposition.length === 0,
  badDisposition.slice(0, 3).map((t) => t.registryTrackId).join(", ")
);

// --- no mapping without evidence ----------------------------------------------
// The whole point of the artifact: an `exact` mapping must rest on a shared
// operative citation or a form unique to one track. Name similarity is not
// evidence, and a mapped row with no evidence is the failure this guards.

const ACCEPTABLE_EVIDENCE = new Set([
  "shared_operative_statutory_citation",
  "shared_official_form",
  "shared_supporting_statutory_citation",
]);

const unevidencedMappings = pathways.filter(
  (p) =>
    MAPPED_RELATIONS.has(p.registryRelation) &&
    (p.mappingEvidence.length === 0 ||
      !p.mappingEvidence.some((e) => ACCEPTABLE_EVIDENCE.has(e)) ||
      p.mappedRegistryTrackIds.length === 0)
);
check(
  "no mapped pathway lacks mapping evidence",
  unevidencedMappings.length === 0,
  unevidencedMappings.slice(0, 3).map((p) => p.compiledPathwayId).join(", ")
);

const supportingOnly = pathways.filter(
  (p) =>
    MAPPED_RELATIONS.has(p.registryRelation) &&
    !p.mappingEvidence.includes("shared_operative_statutory_citation") &&
    !p.mappingEvidence.includes("shared_official_form")
);
check(
  "no mapping rests on a supporting citation alone",
  supportingOnly.length === 0,
  supportingOnly.slice(0, 3).map((p) => p.compiledPathwayId).join(", ")
);

const unresolvedWithoutReason = pathways.filter(
  (p) => UNRESOLVED_RELATIONS.has(p.registryRelation) && (!p.unresolvedReason || p.missingEvidence.length === 0)
);
check(
  "every unresolved pathway names the evidence it is missing",
  unresolvedWithoutReason.length === 0,
  unresolvedWithoutReason.slice(0, 3).map((p) => p.compiledPathwayId).join(", ")
);

const mappedWithoutCoverage = pathways.filter(
  (p) => MAPPED_RELATIONS.has(p.registryRelation) !== (p.contributesToRuntimeCoverage === true)
);
check(
  "runtime-coverage flag agrees with the relationship",
  mappedWithoutCoverage.length === 0,
  `${mappedWithoutCoverage.length} rows disagree`
);

// A compiled pathway is a runtime fact; the 497 denominator is a certification
// property of the registry. Nothing on the compiled side may inflate it.
const denominatorInflation = pathways.filter((p) => p.contributesToRegistryDenominator !== false);
check(
  "no compiled pathway inflates the registry denominator",
  denominatorInflation.length === 0,
  `${denominatorInflation.length} rows claim denominator weight`
);

const scopedOutWithoutCitation = pathways.filter(
  (p) =>
    p.registryRelation === "registry_scoped_out_named_authority" &&
    !(p.evidenceDetail?.scopedOutBy || []).length
);
check(
  "every scoped-out pathway cites the registry statement that scopes it out",
  scopedOutWithoutCitation.length === 0,
  scopedOutWithoutCitation.map((p) => p.compiledPathwayId).join(", ")
);

// --- bidirectional consistency -------------------------------------------------

const trackById = new Map(tracks.map((t) => [`${t.jurisdiction}:${t.registryTrackId}`, t]));
let asymmetric = 0;
for (const pathway of pathways) {
  for (const trackId of pathway.mappedRegistryTrackIds) {
    const track = trackById.get(`${pathway.jurisdiction}:${trackId}`);
    if (!track || !track.mappedCompiledPathwayIds.includes(pathway.compiledPathwayId)) asymmetric += 1;
  }
}
for (const track of tracks) {
  for (const pathwayId of track.mappedCompiledPathwayIds) {
    const pathway = pathways.find(
      (p) => p.jurisdiction === track.jurisdiction && p.compiledPathwayId === pathwayId
    );
    if (!pathway || !pathway.mappedRegistryTrackIds.includes(track.registryTrackId)) asymmetric += 1;
  }
}
check("every mapping resolves in both directions", asymmetric === 0, `${asymmetric} one-sided mappings`);

// --- surplus reconciliation ----------------------------------------------------

const surplusFromCounts = crosswalk.byJurisdiction.filter((j) => j.delta > 0).map((j) => j.jurisdiction).sort();
const surplusReported = crosswalk.surplusReconciliation.map((s) => s.jurisdiction).sort();
check(
  "every surplus jurisdiction is reconciled",
  JSON.stringify(surplusFromCounts) === JSON.stringify(surplusReported),
  `counts ${surplusFromCounts.join(",")} vs reconciled ${surplusReported.join(",")}`
);

const surplusMissingDetail = crosswalk.surplusReconciliation.filter(
  (s) =>
    s.absorbedByVariantDecomposition.length +
      s.absorbedByRegistryScopeRestriction.length +
      s.unexplainedSurplusCandidates.length ===
    0
);
check(
  "no surplus jurisdiction is reconciled without naming pathways",
  surplusMissingDetail.length === 0,
  surplusMissingDetail.map((s) => s.jurisdiction).join(", ")
);

// A surplus is only honestly accounted for when the pathways that could carry it
// are still on the books. If the candidate pool were smaller than the delta,
// pathways would have been absorbed into mappings they do not support.
const surplusUncontained = crosswalk.surplusReconciliation.filter(
  (s) =>
    !s.fullyExplained &&
    s.absorbedByVariantDecomposition.length +
      s.absorbedByRegistryScopeRestriction.length +
      s.unexplainedSurplusCandidates.length <
      s.delta
);
check(
  "an unidentified surplus is contained by its candidate pool",
  surplusUncontained.length === 0,
  surplusUncontained.map((s) => `${s.jurisdiction} +${s.delta}`).join(", ")
);

const surplusOverclaimed = crosswalk.surplusReconciliation.filter(
  (s) => s.fullyExplained && s.unexplainedSurplusCandidates.length !== 0
);
check(
  "a surplus is only called identified when nothing is left unexplained",
  surplusOverclaimed.length === 0,
  surplusOverclaimed.map((s) => s.jurisdiction).join(", ")
);

// --- unresolved set is enumerated and finite -----------------------------------

const unresolvedPathways = pathways.filter((p) => UNRESOLVED_RELATIONS.has(p.registryRelation));
check(
  "the unresolved pathway set is enumerated exactly",
  crosswalk.unresolvedIds.compiledPathways.length === unresolvedPathways.length,
  `${crosswalk.unresolvedIds.compiledPathways.length} listed vs ${unresolvedPathways.length} classified`
);

check(
  "milestone 1 item 2 status agrees with the unresolved set",
  crosswalk.aggregates.milestone1Item2Closed ===
    (unresolvedPathways.length === 0 && crosswalk.aggregates.tracksUnresolvedAmbiguous === 0),
  "closed flag does not follow from the rows"
);

// --- aggregates are arithmetic, not assertions ---------------------------------

const a = crosswalk.aggregates;
check(
  "relationship totals account for every compiled pathway",
  a.pathwaysDirect + a.pathwaysVariant + a.pathwaysScopedOut + a.pathwaysUnresolved === pathways.length,
  `${a.pathwaysDirect + a.pathwaysVariant + a.pathwaysScopedOut + a.pathwaysUnresolved} vs ${pathways.length}`
);
check(
  "coverage dispositions account for every registry track",
  a.tracksExactPathway +
    a.tracksRepresentedByVariants +
    a.tracksUnresolvedAmbiguous +
    a.tracksMissingFromCompiledRuntime ===
    tracks.length,
  "disposition totals do not sum to the track count"
);

// --- determinism ---------------------------------------------------------------

try {
  execFileSync("node", ["scripts/generate-rcap-track-pathway-crosswalk.mjs", "--check"], {
    cwd: rootDir,
    stdio: "pipe",
  });
  checks.push("generated artifacts are reproducible from their inputs");
} catch (error) {
  failures.push(
    `generated artifacts are reproducible from their inputs — ${String(error.stdout || "")}${String(error.stderr || "")}`.trim()
  );
}

// --- report ---------------------------------------------------------------------

for (const name of checks) console.log(`  ok  ${name}`);
if (failures.length > 0) {
  console.error("\nCrosswalk verification failed:");
  for (const failure of failures) console.error(`  FAIL ${failure}`);
  process.exit(1);
}

console.log(`\n${checks.length} checks passed.`);
console.log(`registryTracks        ${a.registryTracks}`);
console.log(`compiledPathways      ${a.compiledPathways}`);
console.log(`pathwaysMapped        ${a.pathwaysMapped}`);
console.log(`pathwaysScopedOut     ${a.pathwaysScopedOut}`);
console.log(`pathwaysUnresolved    ${a.pathwaysUnresolved}`);
console.log(`tracksWithCoverage    ${a.tracksWithRuntimeCoverage}`);
console.log(`milestone1Item2Closed ${a.milestone1Item2Closed}`);
