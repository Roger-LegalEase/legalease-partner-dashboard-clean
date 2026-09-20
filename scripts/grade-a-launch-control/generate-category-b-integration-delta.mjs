#!/usr/bin/env node
// Reconcile the 55 revalidated Category B decisions against the current tree.
//
//   node scripts/grade-a-launch-control/generate-category-b-integration-delta.mjs [--check|--mutations]
//
// THE DENOMINATOR RULE IS THE WHOLE POINT
//
// 49 of the 55 routes split into a controlled B stage plus a participant-facing
// A branch. The tempting arithmetic is 451 + 49. It is wrong, and wrong in the
// expensive direction: some of those participant branches are already in the
// canonical universe under their own route, and adding them again would create
// a duplicate obligation, a duplicate packet family and eventually two products
// for one filing.
//
// So each participant branch is matched against the existing Category A routes
// in its own jurisdiction on the strongest evidence the research gives us: the
// FORM NUMBERS its instrument names. California's split names CR-409 and
// CR-410, and a Category A route already carries exactly those. That is a
// crosswalk, not a new obligation.
//
// Where no form number matches, the branch is reported as newly required rather
// than assumed to be new: the difference between "no match found" and "no match
// exists" is exactly the kind of gap that has to stay visible.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = "data/rcap-grade-a/launch-control/category-b-revalidation";
const OUT_DELTA = "data/rcap-grade-a/launch-control/CATEGORY_B_REVALIDATION_INTEGRATION_DELTA.json";
const OUT_CROSSWALK = "data/rcap-grade-a/launch-control/CATEGORY_B_STAGE_BRANCH_CROSSWALK.json";
const CHECK = process.argv.includes("--check");
const MUTATIONS = process.argv.includes("--mutations");

const EXPECTED = { rows: 55, CONFIRM_B: 3, CONVERT_ALL_TO_A: 3, SPLIT_B_STAGE_AND_A_BRANCH: 49, NEEDS_LEGAL_DECISION: 0, jurisdictions: 26 };

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 29 }).trim(); } catch { return null; } };

const manifest = read(`${BASE}/manifest.json`);
const results = read(`${BASE}/results.json`);
const frozen = read("data/rcap-grade-a/route-obligation-census-candidate/category-b-medium-confidence-revalidation.json");
const census = read("data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json");
const retriage = read("data/rcap-grade-a/route-obligation-census-v1/legal-review-queue-v2-retriage.json");
const sourceQueue = read("data/rcap-grade-a/route-obligation-census-v1/source-queue-reconciliation.json");
const reuse = read("data/rcap-grade-a/launch-control/EXISTING_WORK_REUSE_INDEX.json");

const censusByKey = new Map(census.routes.map((r) => [r.routeKey, r]));
const categoryA = census.routes.filter((r) => r.possibleCategory === "A_MUST_FULFILL");
const retriageByKey = new Map((retriage.rows ?? []).map((r) => [r.routeKey, r.bucket]));
const familiesWithEvidence = new Set(reuse.families.filter((f) => f.reuseDecision !== "NO_EXISTING_WORK").map((f) => f.worklistGroupId));
const sourceQueueFamilies = new Set(sourceQueue.rows.map((r) => r.worklistGroupId));

/**
 * Form numbers an instrument names.
 *
 * Deliberately conservative. "CR-409", "JDF 417", "BCIA 8706", "MC 227a" are
 * identities; a bare word is not. A loose pattern here would manufacture
 * crosswalks, which is worse than missing one: a false crosswalk silently drops
 * a participant branch that nothing else covers.
 */
function formNumbers(text) {
  if (!text) return [];
  const found = new Set();
  for (const match of String(text).matchAll(/\b([A-Z]{2,6})[\s-]?(\d{2,5}(?:[.\-]\d+)*[A-Za-z]?)\b/g)) {
    found.add(`${match[1]}-${match[2]}`.toUpperCase());
    found.add(`${match[1]}${match[2]}`.toUpperCase());
  }
  return [...found];
}

function normalizeSourceIds(route) {
  return (route.requiredSourceIds ?? []).map((id) => String(id).toUpperCase().replace(/\s+/g, ""));
}

const rows = results.rows.map((row) => {
  const censusRow = censusByKey.get(row.routeKey) ?? null;
  const decision = row.finalDecision;
  const forms = decision === "CONFIRM_B" ? [] : formNumbers(row.participantInstrument);

  // Crosswalk: does an existing Category A route in this jurisdiction already
  // carry one of the forms this participant branch would file?
  const candidates = [];
  if (forms.length > 0) {
    for (const a of categoryA.filter((r) => r.jurisdiction === row.jurisdiction)) {
      const ids = normalizeSourceIds(a).join("|");
      const hit = forms.find((f) => ids.includes(f.replace(/-/g, "")) || ids.includes(f));
      if (hit) candidates.push({ routeKey: a.routeKey, matchedForm: hit, packetFamilyId: a.packetFamilyId ?? null, packetSetId: a.packetSetId ?? null });
    }
  }
  const aBranchExists = candidates.length > 0;

  const needsNewABranch = (decision === "SPLIT_B_STAGE_AND_A_BRANCH" || decision === "CONVERT_ALL_TO_A") && !aBranchExists;
  const retainsBStage = decision === "SPLIT_B_STAGE_AND_A_BRANCH" || decision === "CONFIRM_B";

  return {
    originalRouteKey: row.routeKey,
    jurisdiction: row.jurisdiction,
    publicLabel: row.publicLabel,
    finalDecision: decision,
    currentReason: row.currentReason,

    retainedBStageIdentity: retainsBStage
      ? { routeKey: row.routeKey, stageKind: row.automaticOrControlledStage ?? row.currentReason, remainsExcludedFromParticipantFiling: true }
      : null,
    requiredABranchIdentity: decision === "CONFIRM_B" ? null : {
      proposedRouteKey: aBranchExists ? candidates[0].routeKey : `${row.routeKey}::participant-branch`,
      instrument: row.participantInstrument ?? null,
      filingActor: row.filingActor ?? null,
      destination: row.destination ?? null,
      formNumbersNamed: forms.filter((f) => f.includes("-"))
    },
    existingCanonicalMatch: {
      matched: aBranchExists,
      candidates,
      basis: aBranchExists
        ? "an existing Category A route in the same jurisdiction already requires a form this participant branch would file"
        : forms.length === 0
          ? "the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists'"
          : "no existing Category A route in this jurisdiction requires any form this instrument names"
    },
    newRouteRequired: needsNewABranch,

    existingTrackId: censusRow?.trackId ?? null,
    existingRuntimePathwayId: censusRow?.runtimePathwayId ?? null,
    existingRouteContractId: censusRow?.routeContractId ?? null,
    existingPacketFamilyId: censusRow?.packetFamilyId ?? null,
    existingPacketSetId: censusRow?.packetSetId ?? null,
    existingSourceIdentity: censusRow ? (censusRow.requiredSourceIds ?? []).filter((id) => String(id).startsWith("official-form:")) : [],
    packetFamilyHasEvidence: censusRow?.packetFamilyId ? familiesWithEvidence.has(censusRow.packetFamilyId) : false,
    packetSetInSourceQueue: censusRow?.packetSetId ? sourceQueueFamilies.has(censusRow.packetSetId) : false,
    // No branch in the reuse index carries route-level work for any of these
    // 55: they are excluded routes, so nobody has been building them. What
    // exists is the legal-design memo import the census records, which is
    // provenance rather than an implementation to resume from. Reporting a
    // branch here that does not exist would tell a worker to resume nothing.
    existingImplementationBranchOrCommit: {
      branch: null,
      commit: null,
      evidence: censusRow?.currentImplementationEvidence ?? [],
      basis: "no branch or commit in the reuse index carries work for this route; the recorded evidence is the legal-design memo import the census imported it from"
    },
    existingArtifactEvidence: censusRow?.existingArtifactIds ?? [],
    existingProductWiring: censusRow?.currentCommercialState ?? null,

    overlapWithAlreadyAnsweredQueue: retriageByKey.get(row.routeKey) === "ALREADY_ANSWERED",
    overlapWithCaptainMappingQueue: retriageByKey.get(row.routeKey) === "CAPTAIN_MAPPING_CORRECTION",
    overlapWithSourceIdentityQueue: retriageByKey.get(row.routeKey) === "SOURCE_IDENTITY_QUESTION",
    aliasOrDuplicateRelationship: candidates.length > 1
      ? `more than one existing Category A route matches this instrument (${candidates.map((c) => c.routeKey).join(", ")}); the alias must be resolved before a branch is created`
      : null,

    remainingEngineeringWork: decision === "CONFIRM_B"
      ? ["guidance, verification and correction-escalation copy for a stage the participant cannot file into"]
      : aBranchExists
        ? ["crosswalk this participant branch to the existing Category A route", "give the B stage and the A branch distinct selectors, output strategies, product outcomes and commercial treatment"]
        : ["create the participant-facing A branch identity", "bind its instrument, filing actor, destination, trigger, deadline and service requirements", "give the B stage and the A branch distinct selectors, output strategies, product outcomes and commercial treatment"],
    reuseDecision: null,
    assignedLaneKey: null
  };
});

// ---- archetype routing, used by the revised first wave --------------------------
//
// WHY THE LEAD CLAUSE AND NOT THE WHOLE SENTENCE
//
// Almost every instrument here names more than one document, because a route
// whose automatic process did not fire usually needs BOTH a court backstop and
// a record correction. Testing keywords against the whole sentence therefore
// matches nearly everything against nearly every archetype: an earlier version
// of this routing put 32 of 52 rows in C5 because the word "correct" appears
// somewhere in most of them, including rows whose actual build output is a
// court petition on an official form.
//
// The revalidation wrote the PRIMARY instrument first, so the lead clause --
// the text before the first semicolon or " plus " -- is the instrument the
// participant actually files, and it is what decides the lane's output
// strategy. The stage kind (AUTOMATIC / AGENCY_CONTROLLED / COURT_INITIATED)
// then decides which of C1/C2/C3/C5 a nonadversarial branch belongs to.
//
// Each row records WHICH rule fired, so a reader can see why a route is in a
// lane and move it with a one-line change rather than by re-deriving the
// taxonomy.
const leadClause = (instrument) => String(instrument ?? "").split(/;|,\s+plus\s+|\s+plus\s+/)[0].trim();
const ADVERSARIAL = /\bobjection\b|\bobject\b|hearing|\bresponse\b|appeal|judicial review|de novo|contested[- ]case/i;
const ENFORCEMENT = /\benforce\b|missing certificate|after successful completion|not implemented|did not occur|failed to comply|should already|already ordered|already granted/i;
const OMITTED_RECORD = /\bomitted\b|\bmissed\b|missing[- ]record|missing[- ]case/i;
const COURT_FILING = /\bpetition\b|\bmotion\b/i;
const LABEL_POST_ORDER = /already ordered|already granted|judge already|court already|should already/i;

const ARCHETYPE = (row) => {
  if (row.finalDecision === "CONVERT_ALL_TO_A") {
    return ["C6_CONVERT_ALL_TO_A", "R1 the decision converts the whole route to participant-facing, so no B stage is retained"];
  }
  if (row.finalDecision === "CONFIRM_B") {
    return ["C7_CONFIRM_B_GUIDANCE", "R2 the exclusion is confirmed, so the work is guidance, verification and escalation"];
  }
  const lead = leadClause(row.requiredABranchIdentity?.instrument);
  if (ADVERSARIAL.test(lead)) {
    return ["C4_SPLIT_OBJECTION_HEARING_APPEAL", "R3 the lead instrument is an objection, hearing request, response, appeal or judicial review"];
  }
  if (LABEL_POST_ORDER.test(row.publicLabel)) {
    return ["C5_SPLIT_POST_ORDER_ENFORCEMENT", "R4 the route is about an order that was already entered and not carried out"];
  }
  if (row.currentReason === "COURT_INITIATED") {
    return ["C5_SPLIT_POST_ORDER_ENFORCEMENT", "R5 the stage is court-initiated, so the branch corrects or enforces a disposition the court already entered"];
  }
  if (ENFORCEMENT.test(lead) || OMITTED_RECORD.test(lead)) {
    return ["C5_SPLIT_POST_ORDER_ENFORCEMENT", "R6 the lead instrument enforces or corrects an implementation that did not happen"];
  }
  if (row.currentReason === "AGENCY_CONTROLLED") {
    return ["C3_SPLIT_AGENCY_PROSECUTOR_APPLICATION", "R7 the stage is agency- or prosecutor-controlled and the branch is an application or request to it"];
  }
  if (COURT_FILING.test(lead)) {
    return ["C2_SPLIT_AUTOMATIC_COURT_PETITION", "R8 the automatic stage's backstop is a court petition or motion"];
  }
  return ["C1_SPLIT_AUTOMATIC_CORRECTION_STATUS", "R9 the automatic stage's branch is an administrative correction or status request"];
};

// ---- what the branch has to PRODUCE, and therefore which family holds it ---------
//
// These routes carry a guidance family today because they are excluded from
// participant filing. A participant branch is a filing, so it needs a
// participant-filing family in its own jurisdiction. The strategy follows from
// the archetype and from whether the instrument names an official form number:
// a named form is filled, an unnamed one is composed.
const OUTPUT_STRATEGY = (row) => {
  const named = (row.requiredABranchIdentity?.formNumbersNamed ?? []).length > 0;
  switch (row.assignedLaneKey) {
    case "C7_CONFIRM_B_GUIDANCE": return "process_guidance";
    case "C1_SPLIT_AUTOMATIC_CORRECTION_STATUS":
    case "C3_SPLIT_AGENCY_PROSECUTOR_APPLICATION":
      return named ? "official_pdf_fill" : "participant_agency_application";
    default:
      return named ? "official_pdf_fill" : "custom_pleading";
  }
};
const FAMILY_SUFFIX = {
  official_pdf_fill: "official-pdf-fill",
  custom_pleading: "custom-pleading",
  participant_agency_application: "participant-agency-application",
  process_guidance: "guidance-implementation"
};

const censusFamilies = new Set(census.routes.map((r) => r.packetFamilyId).filter(Boolean));

/**
 * The reuse decision for one classified route.
 *
 * A branch already in the canonical universe is REUSED: the work is a crosswalk,
 * and creating a second route would duplicate an obligation, a family and
 * eventually a product. A confirmed exclusion keeps its guidance family, so its
 * assets are salvaged. Only an unmatched branch is genuinely new work.
 */
const REUSE_DECISION = (row) => {
  if (row.finalDecision === "CONFIRM_B") {
    return { decision: "SALVAGE_SPECIFIC_ASSETS", basis: `the exclusion is confirmed; ${row.existingPacketFamilyId} already carries this route's guidance and is extended rather than replaced` };
  }
  if (row.existingCanonicalMatch.matched) {
    return { decision: "REUSE_AS_IS", basis: `an existing Category A route already requires this instrument (${row.existingCanonicalMatch.candidates.map((c) => c.routeKey).join(", ")}); crosswalk it rather than creating a second route` };
  }
  return { decision: "NO_EXISTING_WORK", basis: row.existingCanonicalMatch.basis };
};

for (const row of rows) {
  const [archetype, basis] = ARCHETYPE(row);
  row.assignedLaneKey = archetype;
  row.archetypeBasis = basis;
  row.reuseDecision = REUSE_DECISION(row);
  if (row.finalDecision === "CONFIRM_B") {
    row.requiredParticipantOutputStrategy = null;
    row.requiredParticipantPacketFamily = null;
    row.requiredParticipantPacketFamilyAlreadyInCensus = null;
  } else {
    const strategy = OUTPUT_STRATEGY(row);
    const family = `rcap-${row.jurisdiction.toLowerCase()}-${FAMILY_SUFFIX[strategy]}`;
    row.requiredParticipantOutputStrategy = strategy;
    row.requiredParticipantPacketFamily = family;
    row.requiredParticipantPacketFamilyAlreadyInCensus = censusFamilies.has(family);
  }
}

// ---- refusals -------------------------------------------------------------------
const problems = [];
const byDecision = rows.reduce((acc, r) => { acc[r.finalDecision] = (acc[r.finalDecision] ?? 0) + 1; return acc; }, {});
if (rows.length !== EXPECTED.rows) problems.push(`${rows.length} rows, expected ${EXPECTED.rows}`);
for (const [decision, count] of Object.entries({ CONFIRM_B: EXPECTED.CONFIRM_B, CONVERT_ALL_TO_A: EXPECTED.CONVERT_ALL_TO_A, SPLIT_B_STAGE_AND_A_BRANCH: EXPECTED.SPLIT_B_STAGE_AND_A_BRANCH })) {
  if ((byDecision[decision] ?? 0) !== count) problems.push(`${decision}: ${byDecision[decision] ?? 0}, expected ${count}`);
}
if ((byDecision.NEEDS_LEGAL_DECISION ?? 0) !== 0) problems.push("a row needs a legal decision; the results claim none do");
const keys = rows.map((r) => r.originalRouteKey);
if (new Set(keys).size !== EXPECTED.rows) problems.push("duplicate routeKey in the delta");
const frozenKeys = new Set(frozen.rows.map((r) => r.routeKey));
for (const key of keys) if (!frozenKeys.has(key)) problems.push(`${key} is not one of the frozen 55`);
for (const key of frozenKeys) if (!keys.includes(key)) problems.push(`${key} is in the frozen assignment but missing from the delta`);
for (const row of rows) {
  if (row.finalDecision !== "CONFIRM_B" && !row.requiredABranchIdentity) {
    problems.push(`${row.originalRouteKey}: a participant branch was silently dropped`);
  }
  if (row.existingCanonicalMatch.matched && row.newRouteRequired) {
    problems.push(`${row.originalRouteKey}: an existing canonical branch would be duplicated`);
  }
}
if (manifest.sourceLedgerBlob !== frozen.generatedFrom.sourceGitBlobSha) {
  problems.push(`manifest ledger blob ${manifest.sourceLedgerBlob} does not match the frozen assignment's ${frozen.generatedFrom.sourceGitBlobSha}`);
}
if (manifest.assignmentCommit && git(["cat-file", "-t", manifest.assignmentCommit]) !== "commit") {
  problems.push(`manifest assignmentCommit ${manifest.assignmentCommit} is not in this history`);
}

const existingA = rows.filter((r) => r.existingCanonicalMatch.matched).length;
const newA = rows.filter((r) => r.newRouteRequired).length;
const bStages = rows.filter((r) => r.retainedBStageIdentity).length;
const aliases = rows.filter((r) => r.aliasOrDuplicateRelationship).length;
const familiesPresent = new Set(rows.map((r) => r.existingPacketFamilyId).filter(Boolean));
const familiesWithEvidenceCount = rows.filter((r) => r.packetFamilyHasEvidence).length;

// A participant branch is a filing, so it needs a participant-filing family in
// its own jurisdiction. Some of those families already exist -- a state that
// already builds official-PDF packets does not need a second official-PDF
// family for these branches -- so "new packet families required" is the
// deduplicated set of required families MINUS the ones the census already
// carries, not one per branch.
const requiredFamilies = new Set(rows.filter((r) => r.newRouteRequired && r.requiredParticipantPacketFamily)
  .map((r) => r.requiredParticipantPacketFamily));
const requiredFamiliesAlreadyInCensus = [...requiredFamilies].filter((f) => censusFamilies.has(f)).sort();
const newFamiliesRequired = [...requiredFamilies].filter((f) => !censusFamilies.has(f)).sort();

const delta = {
  schemaVersion: "rcap-category-b-revalidation-integration-delta/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-category-b-integration-delta.mjs",
  question: "The 55 medium-confidence Category B routes have been revalidated. What does each decision actually require of this tree?",
  ingestedFrom: {
    manifest: `${BASE}/manifest.json`,
    results: `${BASE}/results.json`,
    report: `${BASE}/report.md`,
    resultsSha256: crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, `${BASE}/results.json`))).digest("hex"),
    manifestClaimsResultsSha256: manifest.files["category-b-medium-confidence-revalidation-results.json"],
    assignmentCommit: manifest.assignmentCommit,
    sourceSnapshot: manifest.sourceSnapshot,
    sourceLedgerBlob: manifest.sourceLedgerBlob
  },
  decisionsAreLegalClassificationsOnly:
    "These classifications create implementation obligations and nothing else. They authorize no checkout, sponsorship, packet-credit consumption, provider dispatch, artifact attachment, delivery, repeat download, commercially eligible status or COMPLETE_PACKET_PROVEN. Every fail-closed commercial gate stands unchanged.",
  denominatorRule:
    "49 splits do NOT mean 49 new obligations. Each participant branch is matched against existing Category A routes in its own jurisdiction on the form numbers its instrument names. A branch already represented is crosswalked; only an unmatched branch is newly required, and 'no match found' is reported as exactly that rather than as 'no match exists'.",
  counts: {
    rows: rows.length,
    byDecision,
    jurisdictions: new Set(rows.map((r) => r.jurisdiction)).size,
    aBranchesAlreadyExisting: existingA,
    aBranchesNewlyRequired: newA,
    aliasOrCrosswalkRepairs: aliases,
    categoryBStagesRetained: bStages,
    packetFamiliesAlreadyPresent: familiesPresent.size,
    packetFamiliesWithExistingEvidence: familiesWithEvidenceCount,
    participantPacketFamiliesRequired: requiredFamilies.size,
    participantPacketFamiliesAlreadyInCensus: requiredFamiliesAlreadyInCensus.length,
    newPacketFamiliesRequired: newFamiliesRequired.length,
    overlapAlreadyAnswered: rows.filter((r) => r.overlapWithAlreadyAnsweredQueue).length,
    overlapCaptainMapping: rows.filter((r) => r.overlapWithCaptainMappingQueue).length,
    overlapSourceIdentity: rows.filter((r) => r.overlapWithSourceIdentityQueue).length
  },
  projectedDenominator: {
    currentCategoryA: categoryA.length,
    currentCategoryB: census.routes.filter((r) => r.possibleCategory === "B_LEGITIMATE_EXCLUSION").length,
    currentTerminalObligations: census.routes.length,
    categoryAAfterIntegration: categoryA.length + newA,
    categoryBStageAfterIntegration: census.routes.filter((r) => r.possibleCategory === "B_LEGITIMATE_EXCLUSION").length - rows.filter((r) => r.finalDecision === "CONVERT_ALL_TO_A").length,
    terminalObligationsAfterIntegration: census.routes.length + newA,
    thisIsAProjectionNotAFact:
      "These are what the denominator BECOMES when the branches are created, computed from the reconciliation rather than assumed. The census itself is unchanged until the branches exist, and the national census generator remains the only thing that may move it."
  },
  packetFamilyReconciliation: {
    guidanceFamiliesTheseRoutesAlreadySitIn: [...familiesPresent].sort(),
    participantFamiliesRequired: [...requiredFamilies].sort(),
    participantFamiliesAlreadyInCensus: requiredFamiliesAlreadyInCensus,
    participantFamiliesNewlyRequired: newFamiliesRequired,
    why: "The 26 families these routes carry today are guidance families, because the routes are excluded from participant filing. A participant branch files something, so it needs a participant-filing family in its own jurisdiction; the strategy follows the archetype and whether the instrument names an official form number. Families the census already carries are reused."
  },
  archetypeRouting: rows.reduce((acc, r) => { acc[r.assignedLaneKey] = (acc[r.assignedLaneKey] ?? 0) + 1; return acc; }, {}),
  archetypeRoutingBasis: rows.reduce((acc, r) => { acc[r.archetypeBasis] = (acc[r.archetypeBasis] ?? 0) + 1; return acc; }, {}),
  archetypeRouteKeys: rows.reduce((acc, r) => { (acc[r.assignedLaneKey] ??= []).push(r.originalRouteKey); return acc; }, {}),
  rows: rows.sort((a, b) => a.jurisdiction.localeCompare(b.jurisdiction) || a.originalRouteKey.localeCompare(b.originalRouteKey))
};

const crosswalk = {
  schemaVersion: "rcap-category-b-stage-branch-crosswalk/v1",
  generatedBy: delta.generatedBy,
  rule: "A controlled B stage and its participant A branch are two different things and must never share an identity. Distinct selectors, output strategies, product outcomes and commercial treatment; the stage is not participant-fileable and the branch is not automatic.",
  pairs: rows.filter((r) => r.finalDecision === "SPLIT_B_STAGE_AND_A_BRANCH").map((r) => ({
    jurisdiction: r.jurisdiction,
    bStageRouteKey: r.originalRouteKey,
    bStageRemainsExcluded: true,
    bStageKind: r.currentReason,
    aBranchRouteKey: r.requiredABranchIdentity.proposedRouteKey,
    aBranchExistsAlready: r.existingCanonicalMatch.matched,
    aBranchCrosswalkCandidates: r.aBranchCrosswalkCandidates,
    aBranchInstrument: r.requiredABranchIdentity.instrument,
    aBranchDestination: r.requiredABranchIdentity.destination,
    distinctSelectors: true,
    distinctOutputStrategy: true,
    distinctProductOutcome: true,
    distinctCommercialTreatment: true,
    commercialTreatmentNote: "Neither is commercially open. The stage never becomes sellable; the branch may only become sellable through a Grade-A fulfilment record for its own exact route and packet family."
  })),
  confirmedBStages: rows.filter((r) => r.finalDecision === "CONFIRM_B").map((r) => ({
    routeKey: r.originalRouteKey, jurisdiction: r.jurisdiction, publicLabel: r.publicLabel,
    remainsExcluded: true,
    workRequired: "guidance, verification and correction escalation only — there is no participant filing to build"
  })),
  convertedToA: rows.filter((r) => r.finalDecision === "CONVERT_ALL_TO_A").map((r) => ({
    routeKey: r.originalRouteKey, jurisdiction: r.jurisdiction, publicLabel: r.publicLabel,
    aBranchExistsAlready: r.existingCanonicalMatch.matched,
    crosswalkCandidates: r.aBranchCrosswalkCandidates,
    note: "The whole route becomes participant-facing; no B stage is retained."
  }))
};

if (problems.length > 0) {
  console.error(`category B integration delta: ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 12)) console.error(`  - ${p}`);
  process.exit(1);
}

const serializedDelta = JSON.stringify(delta, null, 2) + "\n";
const serializedCrosswalk = JSON.stringify(crosswalk, null, 2) + "\n";
const deltaPath = path.join(ROOT, OUT_DELTA);
const crosswalkPath = path.join(ROOT, OUT_CROSSWALK);

if (CHECK) {
  const a = fs.existsSync(deltaPath) ? fs.readFileSync(deltaPath, "utf8") : null;
  const b = fs.existsSync(crosswalkPath) ? fs.readFileSync(crosswalkPath, "utf8") : null;
  if (a !== serializedDelta) { console.error(`${OUT_DELTA} is stale.`); process.exit(1); }
  if (b !== serializedCrosswalk) { console.error(`${OUT_CROSSWALK} is stale.`); process.exit(1); }
  console.log(`category B integration delta current: ${rows.length} rows, ${existingA} existing A, ${newA} new A.`);
  process.exit(0);
}
if (MUTATIONS) { runMutations(); process.exit(0); }

fs.writeFileSync(deltaPath, serializedDelta);
fs.writeFileSync(crosswalkPath, serializedCrosswalk);
console.log(`Wrote ${OUT_DELTA}`);
console.log(`Wrote ${OUT_CROSSWALK}\n`);
console.log(`  ${rows.length} rows · ${JSON.stringify(byDecision)}`);
console.log(`  A branches: ${existingA} already exist, ${newA} newly required, ${aliases} alias repair(s)`);
console.log(`  B stages retained: ${bStages} · packet families already present: ${familiesPresent.size}`);
console.log(`  denominator: A ${categoryA.length} -> ${delta.projectedDenominator.categoryAAfterIntegration}, obligations ${census.routes.length} -> ${delta.projectedDenominator.terminalObligationsAfterIntegration}`);
console.log(`  archetypes: ${JSON.stringify(delta.archetypeRouting)}`);

function runMutations() {
  // TWO GROUPS, PROVING TWO DIFFERENT THINGS.
  //
  // Mutating the OUTPUT proves the record is a fixed point of its generator:
  // any edit to the committed delta is a divergence --check reports. That is
  // worth proving, but on its own it proves only that a byte comparison
  // compares bytes.
  //
  // Mutating an INPUT proves the refusals are real. The generator's job is to
  // refuse a results file that drops a route, changes a decision count or
  // carries a key the frozen assignment never had; those refusals run before
  // anything is written, and nothing in the byte comparison exercises them.
  const inputPath = path.join(ROOT, `${BASE}/results.json`);
  const inputOriginal = fs.readFileSync(inputPath);
  const inputCases = [
    { name: "a results file that drops a route is refused", mutate: (j) => { j.rows.splice(4, 1); return j; } },
    { name: "a results file with a duplicated route is refused", mutate: (j) => { j.rows.push({ ...j.rows[0] }); return j; } },
    { name: "a results file carrying a route the frozen assignment never had is refused", mutate: (j) => { j.rows[5].routeKey = "obligation:track-only:ZZ:invented"; return j; } },
    { name: "a results file whose decision counts moved is refused", mutate: (j) => { j.rows[6].finalDecision = "CONFIRM_B"; return j; } },
    { name: "a results row still needing a legal decision is refused", mutate: (j) => { j.rows[7].finalDecision = "NEEDS_LEGAL_DECISION"; return j; } }
  ];
  let inputUndetected = 0;
  try {
    for (const testCase of inputCases) {
      fs.writeFileSync(inputPath, JSON.stringify(testCase.mutate(JSON.parse(inputOriginal.toString("utf8"))), null, 2) + "\n");
      let refused = false;
      try { execFileSync(process.execPath, [fileURLToPath(import.meta.url), "--check"], { cwd: ROOT, stdio: "pipe" }); } catch { refused = true; }
      console.log(`  ${refused ? "refused  " : "ACCEPTED "} ${testCase.name}`);
      if (!refused) inputUndetected += 1;
      fs.writeFileSync(inputPath, inputOriginal);
    }
  } finally { fs.writeFileSync(inputPath, inputOriginal); }
  const inputRestored = fs.readFileSync(inputPath).equals(inputOriginal);

  const original = fs.readFileSync(deltaPath);
  const cases = [
    { name: "a dropped route key is caught", mutate: (j) => { j.rows.splice(0, 1); return j; } },
    { name: "a duplicated route key is caught", mutate: (j) => { j.rows.push({ ...j.rows[1] }); return j; } },
    { name: "a route whose reuse decision was flipped to reuse is caught", mutate: (j) => { const r = j.rows.find((x) => x.reuseDecision.decision === "NO_EXISTING_WORK"); r.reuseDecision = { decision: "REUSE_AS_IS", basis: "invented" }; return j; } },
    { name: "a changed decision count is caught", mutate: (j) => { j.rows[2].finalDecision = "NEEDS_LEGAL_DECISION"; return j; } },
    { name: "a silently dropped participant branch is caught", mutate: (j) => { const r = j.rows.find((x) => x.finalDecision === "SPLIT_B_STAGE_AND_A_BRANCH"); r.requiredABranchIdentity = null; return j; } },
    { name: "duplicating an existing canonical branch is caught", mutate: (j) => { const r = j.rows.find((x) => x.existingCanonicalMatch.matched); r.newRouteRequired = true; return j; } },
    { name: "an unrecognized route key is caught", mutate: (j) => { j.rows[3].originalRouteKey = "obligation:track-only:ZZ:not-a-real-route"; return j; } },
    { name: "a route moved to the wrong archetype lane is caught", mutate: (j) => { j.rows[0].assignedLaneKey = "C2_SPLIT_AUTOMATIC_COURT_PETITION"; return j; } },
    { name: "an archetype basis that does not match its lane is caught", mutate: (j) => { j.rows[0].archetypeBasis = "R8 the automatic stage's backstop is a court petition or motion"; return j; } },
    { name: "a required participant family renamed to a family the census already has is caught", mutate: (j) => { const r = j.rows.find((x) => x.requiredParticipantPacketFamily && x.newRouteRequired); r.requiredParticipantPacketFamily = "rcap-in-custom-pleading"; return j; } },
    { name: "an inflated new-packet-family count is caught", mutate: (j) => { j.counts.newPacketFamiliesRequired = 49; return j; } },
    { name: "a participant branch given no output strategy is caught", mutate: (j) => { const r = j.rows.find((x) => x.finalDecision === "SPLIT_B_STAGE_AND_A_BRANCH"); r.requiredParticipantOutputStrategy = null; return j; } }
  ];
  let undetected = 0;
  try {
    for (const testCase of cases) {
      fs.writeFileSync(deltaPath, JSON.stringify(testCase.mutate(JSON.parse(original.toString("utf8"))), null, 2) + "\n");
      let caught = false;
      try { execFileSync(process.execPath, [fileURLToPath(import.meta.url), "--check"], { cwd: ROOT, stdio: "pipe" }); } catch { caught = true; }
      console.log(`  ${caught ? "detected " : "MISSED   "} ${testCase.name}`);
      if (!caught) undetected += 1;
      fs.writeFileSync(deltaPath, original);
    }
  } finally { fs.writeFileSync(deltaPath, original); }
  const restored = fs.readFileSync(deltaPath).equals(original);
  console.log(`\n  every mutated file restored byte-for-byte: ${restored && inputRestored}`);
  if (!restored || !inputRestored || undetected > 0 || inputUndetected > 0) {
    console.error("the delta check proves less than it claims.");
    process.exit(1);
  }
  console.log(`\nOK category B delta mutations — ${inputCases.length} input refusal(s) and ${cases.length} output case(s), all caught.`);
}
