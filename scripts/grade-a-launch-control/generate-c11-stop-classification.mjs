#!/usr/bin/env node
// What each C11 stop actually is, and which lane owns it.
//
//   node scripts/grade-a-launch-control/generate-c11-stop-classification.mjs [--check]
//
// Four families stopped and twenty-three built families are missing a record.
// Neither is "packet work that failed": each has a named blocker in the lane's
// own stop artifact, and the blocker decides the owner. Routing all seven
// classes to one repair lane would send a source-identity question to someone
// building pleadings, and a worklist mapping error to someone acquiring PDFs.
//
// The taxonomy is fixed. A stop that matches none of it REFUSES rather than
// being filed under whichever class is closest, because "close enough" is how a
// blocker ends up owned by someone who cannot resolve it.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECK = process.argv.includes("--check");
const OUT = "data/rcap-grade-a/launch-control/C11_STOP_CLASSIFICATION.json";
const LC = "data/rcap-grade-a/launch-control";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const readIf = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? read(rel) : null);

const review = read(`${LC}/C11_RETURN_REVIEW.json`);

const TAXONOMY = [
  "ROUTE_IDENTITY", "SOURCE_IDENTITY", "SOURCE_ACQUISITION", "PACKET_COMPONENT_IDENTITY",
  "COMPOSED_PLEADING_SPECIFICATION", "LOCAL_VARIATION", "ENGINEERING", "ENVIRONMENT"
];

/**
 * Each stop, read from the artifact the lane itself wrote.
 *
 * The classification is a judgement about which blocker has to be resolved
 * FIRST -- a family with both a source-identity problem and a mapping problem
 * cannot be built until the document is identified, whatever the mapping says --
 * and the secondary blocker is recorded rather than dropped.
 */
const STOPS = [
  {
    familyId: "ne-setaside-noncustodial-set",
    stopArtifact: "data/rcap-all50/overlays/census-v1/ne/ne-setaside-noncustodial-set--custom-pleading/vehicle-conflict-stop.json",
    primary: "COMPOSED_PLEADING_SPECIFICATION",
    secondary: ["ROUTE_IDENTITY"],
    lane: "R3_ROUTE_MAPPING_REMAINDER",
    why: "The worklist labels this family custom_pleading while the controlling Nebraska legal-design evidence resolves the route to the same official CC-6-11 packet and expressly does not authorise a composed pleading. The exact source is held and byte-exact, so nothing is missing: the assignment's implementation strategy is wrong, and correcting a mapping is R3's work.",
    mustNotDo: "No custom pleading may be invented from the conflict.",
    resolution: "Correct the shared assignment vehicle to official_pdf_fill, or record an approved exact hybrid design."
  },
  {
    familyId: "ne-trafficking-setaside-and-seal-set",
    stopArtifact: "data/rcap-all50/overlays/census-v1/ne/ne-trafficking-setaside-and-seal-set--official-pdf-fill/vehicle-conflict-stop.json",
    primary: "SOURCE_IDENTITY",
    secondary: ["ROUTE_IDENTITY", "COMPOSED_PLEADING_SPECIFICATION"],
    lane: "R4_SOURCE_IDENTITY_AND_ACQUISITION",
    why: "Two blockers, and the source one comes first: the only held CC-6-12 identity is a two-page instructions PDF rather than either named motion, so no vehicle decision can be acted on until the actual set-aside motion and sealing motion are identified. The duplicate incompatible worklist rows are real and are recorded as a dependency on R3.",
    mustNotDo: "No packet may be authored or filled against an instructions PDF standing in for a motion.",
    resolution: "Bind the actual set-aside motion and sealing motion by exact identity, then resolve the duplicate vehicle rows."
  },
  {
    familyId: "pa_6308_underage-set",
    stopArtifact: "data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--custom-pleading/build-findings.json",
    primary: "PACKET_COMPONENT_IDENTITY",
    secondary: ["COMPOSED_PLEADING_SPECIFICATION"],
    lane: "R7_PACKET_REPAIR",
    why: "The held Rule 490 petition and order match their pinned SHA-256 and byte lengths, so this is not a source problem. What is missing is a component: the court-status metadata that selects the correct official vehicle, and an approved source-backed custom service certificate. Both are packet-specification work on sources already in hand.",
    mustNotDo: "No pleading configuration, canonical or boundary pleading, filled PDF or runtime activation may be created from the gap.",
    resolution: "Record the court-status metadata that determines the official vehicle, and complete the exact service-certificate specification."
  },
  {
    familyId: "wa_blake_vacatur_and_lfo_refund-set",
    stopArtifact: "data/rcap-all50/overlays/census-v1/wa/wa-blake-vacatur-and-lfo-refund-set--official-pdf-fill/source-vehicle-stop.json",
    primary: "SOURCE_IDENTITY",
    secondary: [],
    lane: "R4_SOURCE_IDENTITY_AND_ACQUISITION",
    why: "The worklist assigns BLAKE-002 as a separate LFO-refund claim. First-hand inspection of the pinned bytes identifies it as the courts-of-limited-jurisdiction Blake motion to vacate and refund -- an alternate-jurisdiction motion, not a second component. The document was misidentified, which is exactly R4's question.",
    mustNotDo: "The alternate-jurisdiction motion must not be filled as though it were a separate refund claim.",
    resolution: "Correct the source role, and identify whether a separate LFO-refund instrument exists at all."
  }
];

const problems = [];
for (const stop of STOPS) {
  if (!TAXONOMY.includes(stop.primary)) problems.push(`${stop.familyId}: ${stop.primary} is not in the taxonomy`);
  for (const s of stop.secondary) if (!TAXONOMY.includes(s)) problems.push(`${stop.familyId}: secondary ${s} is not in the taxonomy`);
  if (!fs.existsSync(path.join(ROOT, stop.stopArtifact))) problems.push(`${stop.familyId}: its stop artifact ${stop.stopArtifact} is not in the tree`);
}

// Every family the review classified as stopped must be classified here, and
// nothing else may be.
const reviewStopped = review.families.filter((f) => f.classification === "STOPPED_WITH_EXACT_BLOCKER").map((f) => f.familyId).sort();
const classified = STOPS.map((s) => s.familyId).sort();
if (JSON.stringify(reviewStopped) !== JSON.stringify(classified)) {
  problems.push(`the review stopped [${reviewStopped.join(", ")}] but the classification covers [${classified.join(", ")}]`);
}

// The 23 built families missing a product-wiring record are a different animal:
// nothing failed, a record is absent. That is ENGINEERING, and it goes to the
// repair lane rather than to a source or mapping lane.
const missingWiring = review.summary.builtFamiliesWithoutProductWiring ?? [];
const wiringGap = missingWiring.length === 0 ? null : {
  classification: "ENGINEERING",
  lane: "R7_PACKET_REPAIR",
  families: missingWiring,
  count: missingWiring.length,
  why: "These families are built and their posture is closed by the fields they do write -- runtimeSelectable false, commercialAuthority false, approval requested and not granted. What is missing is product-wiring.json, so nothing in the tree states generationAllowed for them. An absent field is not a false one.",
  mustNotDo: "Do not rebuild these families. The artifacts are sound; the record is incomplete.",
  resolution: "Write the missing product-wiring.json for each, stating the family id, route keys, implementation strategy, field map, generationAllowed false, runtimeSelectable false and commercialRoutesOpened 0.",
  alsoRequires: "The next dispatch states the output schema, per WEC-5. Two schemas appeared inside one lane, which is what produced this gap."
};

if (problems.length > 0) {
  console.error(`C11 stop classification: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const byLane = {};
for (const s of STOPS) (byLane[s.lane] ??= []).push(s.familyId);
if (wiringGap) (byLane[wiringGap.lane] ??= []).push(...wiringGap.families);

const doc = {
  schemaVersion: "rcap-grade-a-c11-stop-classification/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-c11-stop-classification.mjs",
  question: "C11 stopped four families and left twenty-three built families without a wiring record. What is each blocker, and who can actually resolve it?",
  derivedFrom: `${LC}/C11_RETURN_REVIEW.json`,
  taxonomy: TAXONOMY,
  noNewLegalQuestion: {
    raised: 0,
    why: "None of the four stops needs a legal determination. Each names an actor, an instrument and a self-help boundary that the controlling records already answer; what is missing is a document identity, a worklist vehicle, or a packet component. A new legal question here would send Lawrence a question the tree can answer."
  },
  counts: {
    stoppedFamilies: STOPS.length,
    byPrimaryClass: STOPS.reduce((acc, s) => { acc[s.primary] = (acc[s.primary] ?? 0) + 1; return acc; }, {}),
    builtFamiliesMissingWiring: missingWiring.length,
    lanesInvolved: Object.keys(byLane).length,
    newLegalQuestions: 0
  },
  byLane,
  stops: STOPS,
  builtFamilyRecordGap: wiringGap
};

const serialized = JSON.stringify(doc, null, 2) + "\n";
const outPath = path.join(ROOT, OUT);

if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current !== serialized) { console.error(`${OUT} is stale or missing. Run the generator.`); process.exit(1); }
  console.log(`C11 stop classification current: ${STOPS.length} stop(s) across ${Object.keys(byLane).length} lane(s), ${missingWiring.length} wiring gap(s).`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, serialized);
console.log(`Wrote ${OUT}\n`);
for (const s of STOPS) console.log(`  ${s.familyId.padEnd(40)} ${s.primary.padEnd(32)} -> ${s.lane}`);
if (wiringGap) console.log(`  ${String(wiringGap.count + " built families").padEnd(40)} ${wiringGap.classification.padEnd(32)} -> ${wiringGap.lane}`);
console.log(`\n  new legal questions: 0`);
