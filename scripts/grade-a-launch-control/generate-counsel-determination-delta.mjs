#!/usr/bin/env node
// What Lawrence's four determinations actually require of this tree.
//
//   node scripts/grade-a-launch-control/generate-counsel-determination-delta.mjs [--check|--mutations]
//
// The four true counsel questions came back answered. Three are Category A and
// one is a legitimate exclusion, but "Category A" is not by itself an
// instruction: New York's answer splits one obligation into two date-specific
// subroutes, and Utah's answer keeps one obligation while gating three of its
// nine branches behind prosecutorial consent. Reading either as "build the
// route" would produce a legally inaccurate packet.
//
// THE DENOMINATOR IS PROJECTED, NOT MOVED
//
// These four routes sit in NEEDS_LEGAL_REVIEW in the frozen census. Their
// answers change what they will become, and the census moves only through its
// own generator, only when the routes exist, and only with an explanation.
// So this record computes what the denominator BECOMES and changes nothing.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECK = process.argv.includes("--check");
const MUTATIONS = process.argv.includes("--mutations");
const OUT = "data/rcap-grade-a/launch-control/COUNSEL_DETERMINATION_DELTA.json";
const LC = "data/rcap-grade-a/launch-control";
const V1 = "data/rcap-grade-a/route-obligation-census-v1";
const RECORD = "data/record-clearing/legal-decisions/2026-08-30-lawrence-four-counsel-determinations.json";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const decisions = read(RECORD);
const census = read("data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json");
const freeze = read(`${V1}/FREEZE.json`);
const queue = read(`${V1}/legal-review-queue-v2.json`);
const categoryBDelta = read(`${LC}/CATEGORY_B_REVALIDATION_INTEGRATION_DELTA.json`);
const sourceQueue = read(`${V1}/source-queue-reconciliation.json`);

const censusByKey = new Map(census.routes.map((r) => [r.routeKey, r]));
const queueByNumber = new Map(queue.trueCounselQueue.questions.map((q) => [`Q${q.number}`, q]));

const problems = [];

// Every question in the counsel queue must be answered, and every answer must
// name a question that was actually asked. An answer to an unasked question is
// as wrong as an unanswered one.
const answered = new Set(decisions.decisions.map((d) => d.questionId));
for (const q of queue.trueCounselQueue.questions) {
  if (!answered.has(`Q${q.number}`)) problems.push(`Q${q.number} (${q.jurisdiction}) is in the counsel queue and has no determination`);
}
for (const d of decisions.decisions) {
  if (!queueByNumber.has(d.questionId)) problems.push(`${d.questionId} is answered but was never in the counsel queue`);
  const asked = queueByNumber.get(d.questionId);
  if (asked && asked.routeKey !== d.routeKey) {
    problems.push(`${d.questionId}: the determination names ${d.routeKey} but the queue asked about ${asked.routeKey}`);
  }
}

// The 55 revalidated Category B routes and these four must not overlap: two
// records moving the same route in different directions is how a denominator
// becomes unexplainable.
const categoryBKeys = new Set(categoryBDelta.rows.map((r) => r.originalRouteKey));
for (const d of decisions.decisions) {
  if (categoryBKeys.has(d.routeKey)) problems.push(`${d.routeKey} is moved by both the Category B revalidation and a counsel determination`);
}

const rows = decisions.decisions.map((d) => {
  const censusRow = censusByKey.get(d.routeKey) ?? null;
  if (!censusRow) { problems.push(`${d.routeKey} is not in the census`); return null; }
  if (censusRow.possibleCategory !== "NEEDS_LEGAL_REVIEW") {
    problems.push(`${d.routeKey} is ${censusRow.possibleCategory} in the census, not NEEDS_LEGAL_REVIEW; the determination answers a question the census no longer asks`);
  }

  const isSplit = d.classification === "CATEGORY_A_MANDATORY_ROUTE_SPLIT";
  const isGated = d.classification === "CATEGORY_A_WITH_SEPARATELY_GATED_BRANCHES";
  const determinedCategory = d.answer.startsWith("B") ? "B_LEGITIMATE_EXCLUSION" : "A_MUST_FULFILL";

  const subroutes = isSplit
    ? d.mandatoryRouteSplit.cohorts.map((c) => ({
        proposedRouteKey: `${d.routeKey}::${c.cohortId.toLowerCase().replace(/_/g, "-")}`,
        cohortId: c.cohortId,
        conviction: c.conviction,
        governedBy: c.governedBy,
        instrument: c.instrument,
        noticeRule: c.noticeRule
      }))
    : [];

  const branches = isGated
    ? d.eligibilityBranches.map((b) => ({
        branchId: b.branchId,
        when: b.when,
        prosecutorConsentRequired: b.consentRequired,
        selfHelpFulfilled: b.selfHelpFulfilled,
        gate: b.consentRequired
          ? "REFUSE_WITHOUT_SIGNED_CONSENT — the packet must not generate this branch on the participant's assertion that the prosecutor agrees"
          : "PARTICIPANT_FILED_NO_CONSENT_GATE"
      }))
    : [];

  // What each answer costs the denominator. A split turns one obligation into
  // two; a gate turns one obligation into one obligation with a refusal inside
  // it, which costs nothing.
  const obligationDelta = isSplit ? subroutes.length - 1 : 0;

  return {
    questionId: d.questionId,
    decisionId: d.decisionId,
    jurisdiction: d.jurisdiction,
    routeKey: d.routeKey,
    publicLabel: d.publicLabel,
    answer: d.answer,
    classification: d.classification,
    censusCategoryBefore: censusRow.possibleCategory,
    determinedCategory,
    determinedCategoryBReason: d.categoryBReason,
    categoryBReasonAlreadyInVocabulary: d.categoryBReason
      ? census.routes.some((r) => r.possibleCategoryBReason === d.categoryBReason)
      : null,
    participantFiledFallbackExists: d.participantFiledFallbackExists,
    existingTrackId: censusRow.trackId,
    existingRuntimePathwayId: censusRow.runtimePathwayId,
    existingRouteContractId: censusRow.routeContractId,
    existingPacketFamilyId: censusRow.packetFamilyId,
    existingPacketSetId: censusRow.packetSetId,
    existingSourceIds: censusRow.requiredSourceIds ?? [],
    existingProductWiring: censusRow.currentCommercialState,
    mandatorySubroutes: subroutes,
    gatedBranches: branches,
    obligationDelta,
    remainingEngineeringWork: [
      determinedCategory === "B_LEGITIMATE_EXCLUSION"
        ? `record the exclusion with reason ${d.categoryBReason} and build only what the determination permits: ${(d.selfHelpMayFulfil ?? []).length} guidance and referral outputs, and no merits pleading`
        : "create the participant-facing Category A identity with its selector, output strategy, product outcome and commercial treatment",
      ...(isSplit ? ["split the obligation into the two date-specific subroutes; a single generic motion would be legally inaccurate", "bind the screening question that identifies the exact conviction date, because that date selects the motion theory"] : []),
      ...(isGated ? ["build the branch gate: the consent-dependent and joint-motion branches refuse without signed prosecutorial consent", "bind the 35-day prosecutor response window and the Request to Submit workflow"] : []),
      ...(d.instrument?.documents?.length > 1 ? [`assemble the ${d.instrument.documents.length}-document packet in the order the determination names`] : []),
      `bind the ${(d.selfHelpStop ?? []).length} self-help stop conditions as refusals rather than as copy`
    ],
    selfHelpStopConditions: (d.selfHelpStop ?? []).length,
    controllingAuthority: d.controllingAuthority,
    sourceIdentityConstraint: d.sourceIdentityConstraint ?? null,
    grantsNothing: "This determination creates an implementation obligation. It opens no commercial route and proves no packet."
  };
}).filter(Boolean);

// Utah's placeholder form identifier is a source-identity obligation, not a
// route problem. It is only a real defect if something already hard-codes it.
const utahConstraint = rows.find((r) => r.sourceIdentityConstraint)?.sourceIdentityConstraint ?? null;
let placeholderHardCodedIn = [];
if (utahConstraint) {
  const needle = (utahConstraint.observed.match(/'([^']+)'/) ?? [])[1] ?? "1023XX";
  try {
    const hits = execFileSync("git", ["grep", "-lF", needle, "--", "data", "src", "scripts", "docs"], { cwd: ROOT, encoding: "utf8" });
    placeholderHardCodedIn = hits.split("\n").filter(Boolean);
  } catch { placeholderHardCodedIn = []; }
}

const aRows = rows.filter((r) => r.determinedCategory === "A_MUST_FULFILL");
const bRows = rows.filter((r) => r.determinedCategory === "B_LEGITIMATE_EXCLUSION");
const obligationDelta = rows.reduce((n, r) => n + r.obligationDelta, 0);
const newCategoryARoutes = aRows.length + obligationDelta;

// Composed with the Category B projection, because both describe the same
// denominator and reporting either alone would misstate where it lands.
const projected = {
  frozen: {
    terminalObligations: freeze.totals.totalObligations,
    categoryA: freeze.totals.categoryA,
    categoryB: freeze.totals.categoryB,
    needsLegalReview: freeze.totals.needsLegalReview
  },
  afterCategoryBIntegration: {
    terminalObligations: categoryBDelta.projectedDenominator.terminalObligationsAfterIntegration,
    categoryA: categoryBDelta.projectedDenominator.categoryAAfterIntegration,
    categoryB: categoryBDelta.projectedDenominator.categoryBStageAfterIntegration,
    needsLegalReview: freeze.totals.needsLegalReview
  },
  afterCounselDeterminations: {
    terminalObligations: categoryBDelta.projectedDenominator.terminalObligationsAfterIntegration + obligationDelta,
    categoryA: categoryBDelta.projectedDenominator.categoryAAfterIntegration + newCategoryARoutes,
    categoryB: categoryBDelta.projectedDenominator.categoryBStageAfterIntegration + bRows.length,
    needsLegalReview: freeze.totals.needsLegalReview - rows.length
  },
  thisIsAProjectionNotAFact:
    "The census is unchanged. These four routes are still NEEDS_LEGAL_REVIEW in the frozen ledger and move only when their identities exist and the national census generator recomputes them, with an explanation.",
  arithmeticShown: `${rows.length} questions answered: ${aRows.length} Category A and ${bRows.length} Category B, plus ${obligationDelta} obligation(s) from New York's mandatory split. Utah's gate adds no obligation: nine branches, ${rows.find((r) => r.gatedBranches.length)?.gatedBranches.filter((b) => b.prosecutorConsentRequired).length ?? 0} of them refused without signed consent, all inside one route.`
};

if (rows.length !== 4) problems.push(`${rows.length} determinations reconciled, expected 4`);
if (queue.trueCounselQueue.count !== rows.length) problems.push(`the counsel queue holds ${queue.trueCounselQueue.count} questions and ${rows.length} were answered`);

if (problems.length > 0) {
  console.error(`counsel determination delta: ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 12)) console.error(`  - ${p}`);
  process.exit(1);
}

const doc = {
  schemaVersion: "rcap-grade-a-counsel-determination-delta/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-counsel-determination-delta.mjs",
  question: "The four true counsel questions are answered. What does each determination require of this tree?",
  decisionRecord: RECORD,
  decisionOwner: decisions.decisionOwner,
  decisionDate: decisions.decisionDate,
  answersQueue: `${V1}/legal-review-queue-v2.json`,
  determinationsAreObligationsOnly: decisions.note,
  counts: {
    questionsAsked: queue.trueCounselQueue.count,
    questionsAnswered: rows.length,
    categoryA: aRows.length,
    categoryB: bRows.length,
    mandatoryRouteSplits: rows.filter((r) => r.mandatorySubroutes.length > 0).length,
    subroutesRequired: rows.reduce((n, r) => n + r.mandatorySubroutes.length, 0),
    gatedRoutes: rows.filter((r) => r.gatedBranches.length > 0).length,
    branchesGatedBehindConsent: rows.reduce((n, r) => n + r.gatedBranches.filter((b) => b.prosecutorConsentRequired).length, 0),
    branchesParticipantFiled: rows.reduce((n, r) => n + r.gatedBranches.filter((b) => !b.prosecutorConsentRequired).length, 0),
    obligationDelta,
    overlapWithCategoryBRevalidation: 0
  },
  projectedDenominator: projected,
  sourceIdentityObligations: utahConstraint
    ? [{
        jurisdiction: "UT",
        constraint: utahConstraint,
        hardCodedInThisTree: placeholderHardCodedIn,
        verdict: placeholderHardCodedIn.length === 0
          ? "NOT_YET_A_DEFECT — the placeholder appears nowhere in this tree. The constraint is preventive: it must never be committed as a production form identity."
          : "LIVE_DEFECT — the placeholder is already committed and must be removed before any Utah 402 packet is built.",
        routeToLane: "R4_SOURCE_IDENTITY_AND_ACQUISITION"
      }]
    : [],
  whatThisDoesNotDo: [
    "It moves no census count.",
    "It opens no commercial route and proves no packet.",
    "It creates no packet family and no fulfilment record.",
    "It does not build any of the four routes; it states exactly what building each one requires."
  ],
  rows
};

const serialized = JSON.stringify(doc, null, 2) + "\n";
const outPath = path.join(ROOT, OUT);

if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current !== serialized) { console.error(`${OUT} is stale or missing. Run the generator.`); process.exit(1); }
  console.log(`counsel determination delta current: ${rows.length} answered, ${aRows.length} A, ${bRows.length} B, +${obligationDelta} obligation(s).`);
  process.exit(0);
}

if (MUTATIONS) {
  const original = fs.readFileSync(outPath);
  const cases = [
    { name: "an unanswered counsel question is caught", mutate: (j) => { j.rows.pop(); return j; } },
    { name: "a determination pointed at the wrong route is caught", mutate: (j) => { j.rows[0].routeKey = "obligation:track-only:ZZ:invented"; return j; } },
    { name: "a mandatory route split collapsed to one subroute is caught", mutate: (j) => { const r = j.rows.find((x) => x.mandatorySubroutes.length > 1); r.mandatorySubroutes = [r.mandatorySubroutes[0]]; return j; } },
    { name: "a consent-gated branch reported as participant-filed is caught", mutate: (j) => { const r = j.rows.find((x) => x.gatedBranches.length); const b = r.gatedBranches.find((x) => x.prosecutorConsentRequired); b.prosecutorConsentRequired = false; return j; } },
    { name: "a hand-moved census denominator is caught", mutate: (j) => { j.projectedDenominator.frozen.needsLegalReview = 82; return j; } },
    { name: "an inflated obligation delta is caught", mutate: (j) => { j.counts.obligationDelta = 9; return j; } },
    { name: "the exclusion flipped to Category A is caught", mutate: (j) => { const r = j.rows.find((x) => x.determinedCategory === "B_LEGITIMATE_EXCLUSION"); r.determinedCategory = "A_MUST_FULFILL"; return j; } }
  ];
  let undetected = 0;
  console.log("mutations:");
  try {
    for (const testCase of cases) {
      fs.writeFileSync(outPath, JSON.stringify(testCase.mutate(JSON.parse(original.toString("utf8"))), null, 2) + "\n");
      let caught = false;
      try { execFileSync(process.execPath, [fileURLToPath(import.meta.url), "--check"], { cwd: ROOT, stdio: "pipe" }); } catch { caught = true; }
      console.log(`  ${caught ? "detected " : "MISSED   "} ${testCase.name}`);
      if (!caught) undetected += 1;
      fs.writeFileSync(outPath, original);
    }
  } finally { fs.writeFileSync(outPath, original); }
  const restored = fs.readFileSync(outPath).equals(original);
  console.log(`\n  every mutated file restored byte-for-byte: ${restored}`);
  if (!restored || undetected > 0) { console.error("the counsel delta proves less than it claims."); process.exit(1); }
  console.log(`\nOK counsel determination mutations — ${cases.length} case(s), every mutation caught.`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, serialized);
console.log(`Wrote ${OUT}\n`);
for (const r of rows) console.log(`  ${r.questionId.padEnd(4)} ${r.jurisdiction}  ${r.determinedCategory.padEnd(24)} ${r.classification}`);
console.log(`\n  ${aRows.length} Category A · ${bRows.length} Category B · ${doc.counts.subroutesRequired} subroute(s) required · ${doc.counts.branchesGatedBehindConsent} branch(es) gated behind consent`);
console.log(`  projected: obligations ${projected.afterCategoryBIntegration.terminalObligations} -> ${projected.afterCounselDeterminations.terminalObligations}, A ${projected.afterCategoryBIntegration.categoryA} -> ${projected.afterCounselDeterminations.categoryA}, legal review ${projected.frozen.needsLegalReview} -> ${projected.afterCounselDeterminations.needsLegalReview}`);
