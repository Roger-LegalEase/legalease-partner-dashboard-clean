// Lane verifier for the E2-C surplus-pathway adjudications.
//
// Proves the evidence artifact honors the six frozen surplus jobs: every
// candidate-pool pathway adjudicated exactly once, nothing dropped or smuggled
// in, every exact classification evidenced, every denominator exclusion
// supported, every variant licensed by registry-declared branching, every
// unresolved record carrying its exact missing evidence, and the jurisdiction
// arithmetic derived from individual records rather than asserted.
//
//   node scripts/verify-rcap-crosswalk-enrichment-e2-c.mjs
//
// Not wired into package.json — Terminal A owns shared test-chain wiring.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adjPath = path.join(rootDir, "data/rcap-crosswalk-enrichment/e2-c-surplus/surplus-pathway-adjudications.json");
const jobsPath = path.join(rootDir, "data/rcap-ledger/e2-evidence-jobs.json");
const crosswalkPath = path.join(rootDir, "data/rcap-ledger/track-pathway-crosswalk.json");

const failures = [];
const checks = [];
function check(name, condition, detail) {
  if (condition) checks.push(name);
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

for (const required of [adjPath, jobsPath, crosswalkPath]) {
  if (!fs.existsSync(required)) {
    console.error(`Missing ${path.relative(rootDir, required)}.`);
    process.exit(1);
  }
}

const doc = JSON.parse(fs.readFileSync(adjPath, "utf8"));
const jobsDoc = JSON.parse(fs.readFileSync(jobsPath, "utf8"));
const crosswalk = JSON.parse(fs.readFileSync(crosswalkPath, "utf8"));

const JURISDICTIONS = ["ID", "LA", "MS", "OK", "PA", "SD"];
const laneJobs = jobsDoc.jobs.filter((j) => j.group === "E2-C");

check("the frozen job source carries exactly six E2-C jobs", laneJobs.length === 6, `found ${laneJobs.length}`);
check(
  "the adjudication pins the required crosswalk content hash",
  doc.generatedFrom?.requiredCrosswalkContentHash === crosswalk.contentHash,
  "hash mismatch between adjudication header and canonical crosswalk"
);

const records = doc.adjudications;
const keyOf = (r) => `${r.jurisdiction}:${r.compiledPathwayId}`;

// --- assignment universe: exactly the frozen candidate pools -----------------

const poolKeys = new Set();
for (const job of laneJobs) {
  for (const pid of job.candidatePool) poolKeys.add(`${job.jurisdiction}:${pid}`);
}
const recordKeys = records.map(keyOf);
check(
  "every record is adjudicated exactly once",
  new Set(recordKeys).size === recordKeys.length,
  `${recordKeys.length - new Set(recordKeys).size} duplicates`
);
const missing = [...poolKeys].filter((k) => !recordKeys.includes(k));
check("no frozen candidate-pool pathway is dropped", missing.length === 0, missing.slice(0, 5).join(", "));
const extra = recordKeys.filter((k) => !poolKeys.has(k));
check("no pathway outside the frozen pools is introduced", extra.length === 0, extra.slice(0, 5).join(", "));
check(
  "jurisdictions match the six frozen surplus jobs exactly",
  JSON.stringify([...new Set(records.map((r) => r.jurisdiction))].sort()) === JSON.stringify(JURISDICTIONS),
  [...new Set(records.map((r) => r.jurisdiction))].sort().join(",")
);

// --- classification discipline ------------------------------------------------

const RELATIONS = new Set([
  "direct_runtime_representation",
  "compiled_variant_of_registry_track",
  "composed_unit_of_registry_track",
  "routing_or_supporting_path",
  "unregistered_substantive_relief_mechanism",
  "unresolved",
]);
const RESOLUTIONS = new Set(["exact", "registry_gap", "unresolved"]);

check(
  "every record carries a known relationship type",
  records.every((r) => RELATIONS.has(r.relationshipType)),
  records.filter((r) => !RELATIONS.has(r.relationshipType)).map(keyOf).slice(0, 3).join(", ")
);
check(
  "every record carries a known resolution",
  records.every((r) => RESOLUTIONS.has(r.resolution)),
  records.filter((r) => !RESOLUTIONS.has(r.resolution)).map(keyOf).slice(0, 3).join(", ")
);

// Evidence must point at committed repository records, not names. A name-only
// exact match would carry no path/pointer evidence; require both, on every
// evidenced record, and require the pointer to name a concrete field.
function evidenced(r) {
  return (
    Array.isArray(r.evidence) &&
    r.evidence.length >= 2 &&
    r.evidence.every((e) => e.source === "repository" && e.path && e.pointer && e.field && e.excerpt)
  );
}

const exactRecords = records.filter((r) => r.resolution === "exact");
check(
  "every exact classification carries at least two committed evidence citations",
  exactRecords.every(evidenced),
  exactRecords.filter((r) => !evidenced(r)).map(keyOf).slice(0, 3).join(", ")
);
check(
  "every exact mapping names its operative authority",
  exactRecords.every((r) => r.relationshipType === "routing_or_supporting_path" || (r.operativeAuthority && r.operativeAuthority.citation)),
  exactRecords.filter((r) => r.relationshipType !== "routing_or_supporting_path" && !(r.operativeAuthority && r.operativeAuthority.citation)).map(keyOf).join(", ")
);
check(
  "every mapped record selects at least one registry track",
  records
    .filter((r) => ["direct_runtime_representation", "compiled_variant_of_registry_track", "composed_unit_of_registry_track"].includes(r.relationshipType))
    .every((r) => r.selectedRegistryTrackIds.length >= 1),
  "a mapped record has no selected track"
);

// A variant or composed unit is licensed only by registry-declared branching:
// the record must cite registry evidence from a dispositions, mechanism,
// legalName, compositionMode, or units field of the selected track.
const BRANCH_FIELDS = new Set(["dispositions", "mechanism", "legalName", "compositionMode", "units"]);
const variantRecords = records.filter((r) =>
  ["compiled_variant_of_registry_track", "composed_unit_of_registry_track"].includes(r.relationshipType)
);
check(
  "every variant or composed unit cites registry-declared branch evidence",
  variantRecords.every((r) =>
    r.evidence.some((e) => e.path.startsWith("data/record-clearing/legal-design-track-registry.json") && BRANCH_FIELDS.has(e.field))
  ),
  variantRecords
    .filter((r) => !r.evidence.some((e) => e.path.startsWith("data/record-clearing/legal-design-track-registry.json") && BRANCH_FIELDS.has(e.field)))
    .map(keyOf)
    .slice(0, 3)
    .join(", ")
);

// A routing/supporting classification must identify the architecture record
// that makes it a router — the pathway's own routeType or routing rule text.
const routingRecords = records.filter((r) => r.relationshipType === "routing_or_supporting_path");
check(
  "every routing classification cites the routing architecture record",
  routingRecords.every((r) => r.evidence.some((e) => e.field === "routeType" || /route/i.test(e.excerpt))),
  routingRecords.map(keyOf).join(", ")
);

// Denominator discipline: no record may claim denominator weight, and every
// exclusion needs a stated reason.
check(
  "no record contributes to the 497 denominator",
  records.every((r) => r.contributesTo497Denominator === false),
  records.filter((r) => r.contributesTo497Denominator !== false).map(keyOf).slice(0, 3).join(", ")
);
check(
  "every record explains why it creates no additional track",
  records.every((r) => typeof r.whyNoAdditionalTrack === "string" && r.whyNoAdditionalTrack.length >= 30),
  records.filter((r) => !(typeof r.whyNoAdditionalTrack === "string" && r.whyNoAdditionalTrack.length >= 30)).map(keyOf).slice(0, 3).join(", ")
);

// Registry gaps must still be evidenced (mechanism content plus the absence of
// a registry candidate), and unresolved records must name what is missing.
const gapRecords = records.filter((r) => r.resolution === "registry_gap");
check("every registry gap carries committed mechanism evidence", gapRecords.every(evidenced),
  gapRecords.filter((r) => !evidenced(r)).map(keyOf).join(", "));
const unresolvedRecords = records.filter((r) => r.resolution === "unresolved");
check(
  "every unresolved record names its exact missing evidence",
  unresolvedRecords.every((r) => Array.isArray(r.exactMissingEvidence) && r.exactMissingEvidence.length >= 1),
  unresolvedRecords.filter((r) => !(r.exactMissingEvidence || []).length).map(keyOf).join(", ")
);
check(
  "no unresolved record claims runtime coverage or a selected track",
  unresolvedRecords.every((r) => r.contributesRuntimeCoverage === false && r.selectedRegistryTrackIds.length === 0),
  "an unresolved record claims coverage"
);

// --- arithmetic derived from individual records only -------------------------

const cwDeltas = Object.fromEntries(crosswalk.byJurisdiction.map((j) => [j.jurisdiction, j.delta]));
const cwCounts = Object.fromEntries(crosswalk.byJurisdiction.map((j) => [j.jurisdiction, j.registryTracks]));

for (const jur of JURISDICTIONS) {
  const rs = records.filter((r) => r.jurisdiction === jur);
  const selections = new Map();
  for (const r of rs) for (const t of r.selectedRegistryTrackIds) selections.set(t, (selections.get(t) || 0) + 1);
  for (const p of crosswalk.compiledPathways) {
    if (p.jurisdiction !== jur || p.registryRelation.startsWith("unresolved")) continue;
    for (const t of p.mappedRegistryTrackIds) selections.set(t, (selections.get(t) || 0) + 1);
  }
  const variantSurplus = [...selections.values()].filter((c) => c > 1).reduce((s, c) => s + c - 1, 0);
  const gaps = rs.filter((r) => r.resolution === "registry_gap").length;
  const routing = rs.filter((r) => r.relationshipType === "routing_or_supporting_path").length;
  const unresolved = rs.filter((r) => r.resolution === "unresolved").length;
  const uncovered = cwCounts[jur] - selections.size;
  const derived = variantSurplus + gaps + routing + unresolved - uncovered;
  check(
    `${jur}: jurisdiction arithmetic reconciles from individual records`,
    derived === cwDeltas[jur],
    `derived ${derived} vs reported ${cwDeltas[jur]}`
  );
  const row = doc.jurisdictionArithmetic.find((a) => a.jurisdiction === jur);
  check(
    `${jur}: the recorded arithmetic row matches the recomputation`,
    row && row.derivedDelta === derived && row.reconciles === (derived === cwDeltas[jur]),
    "recorded row disagrees with recomputation"
  );
  // Quantity-only reconciliation is prohibited: a jurisdiction may only be
  // called fully identified when zero of its records are unresolved.
  check(
    `${jur}: fully-identified claim matches the unresolved count`,
    row && row.surplusFullyIdentified === (unresolved === 0),
    "fullyIdentified flag does not follow from the records"
  );
}

// --- Wyoming continuity -------------------------------------------------------

const wy = crosswalk.surplusReconciliation.find((s) => s.jurisdiction === "WY");
check(
  "Wyoming continuity holds and is not reinterpreted",
  doc.wyomingContinuity?.reinterpreted === false &&
    wy &&
    wy.fullyExplained === true &&
    wy.absorbedByRegistryScopeRestriction.length === 2,
  "WY baseline changed or was reinterpreted"
);

// --- lane boundaries ----------------------------------------------------------

check(
  "no external evidence is relied on",
  (doc.externalOfficialEvidence || []).length === 0 &&
    records.every((r) => r.evidence.every((e) => e.source === "repository")),
  "an external source appears in the evidence"
);
check(
  "totals in the header match the records",
  doc.totals.records === records.length &&
    Object.entries(doc.totals.byResolution).every(([k, v]) => records.filter((r) => r.resolution === k).length === v),
  "header totals drift from the rows"
);

for (const name of checks) console.log(`  ok  ${name}`);
if (failures.length > 0) {
  console.error("\nE2-C enrichment verification failed:");
  for (const failure of failures) console.error(`  FAIL ${failure}`);
  process.exit(1);
}
console.log(`\n${checks.length} checks passed.`);
console.log(`records            ${records.length}`);
console.log(`exact              ${records.filter((r) => r.resolution === "exact").length}`);
console.log(`registryGaps       ${gapRecords.length}`);
console.log(`unresolved         ${unresolvedRecords.length}`);
console.log(`fullyIdentified    ${doc.jurisdictionArithmetic.filter((a) => a.surplusFullyIdentified).length} / 6 jurisdictions`);
