// The actual legal-team work queue.
//
// Counts without the underlying questions are not a work queue. This publishes
// every unresolved counsel-confirmation question with its text, its track, its
// controlling authority and exactly one classification, plus the four immediate
// decision sets and the nine tracks that still need legal research.
//
// data/record-clearing/all51-current-legal-questions.json is controlling;
// docs/record-clearing/ALL51_CURRENT_LEGAL_QUESTIONS.md is generated from it.
//
// Usage:
//   node scripts/generate-all51-current-legal-questions.mjs           # write
//   node scripts/generate-all51-current-legal-questions.mjs --check   # verify

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");

const OUT_JSON = "data/record-clearing/all51-current-legal-questions.json";
const OUT_MD = "docs/record-clearing/ALL51_CURRENT_LEGAL_QUESTIONS.md";
const MEMO_DIR = "data/record-clearing/legal-design-intake";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

const finalization = readJson("data/rcap-ledger/all51-legal-authority-finalization.json");
const reconciliation = readJson("data/rcap-ledger/all51-legal-authority-reconciliation.json");
const legalJoin = readJson("data/rcap-ledger/paid-pathway-legal-join.json");

// ---------------------------------------------------------------------------
// The memo corpus, indexed by track.
// ---------------------------------------------------------------------------

const trackById = new Map();
const memoHashes = new Map();
for (const file of fs.readdirSync(path.join(root, MEMO_DIR)).sort()) {
  if (!file.endsWith(".memo.json") || file === "TEMPLATE.memo.json") continue;
  const rel = `${MEMO_DIR}/${file}`;
  const raw = fs.readFileSync(path.join(root, rel), "utf8");
  memoHashes.set(rel, createHash("sha256").update(raw).digest("hex"));
  const memo = JSON.parse(raw);
  for (const track of memo.tracks) {
    trackById.set(track.trackId, { ...track, jurisdiction: memo.jurisdiction, memoPath: rel });
  }
}

const joinByTrack = new Map();
for (const pathway of legalJoin.pathways) {
  for (const trackId of pathway.registryTrackIds ?? []) {
    if (!joinByTrack.has(trackId)) joinByTrack.set(trackId, []);
    joinByTrack.get(trackId).push(pathway);
  }
}

const COUNSEL_BASES = new Set(["counsel_confirmation_required", "batch_decision_matrix"]);

// ---------------------------------------------------------------------------
// The question denominator.
//
// The finalization emits 53 (pathway, track, question) tuples. Four questions
// are reached by two pathways each, so the queue holds 49 distinct questions.
// Both numbers are published: 53 is what the ledger rows produce, 49 is what a
// lawyer would actually answer.
// ---------------------------------------------------------------------------

const tuples = finalization.deferredCounselQuestions.questions;
const uniqueQuestions = new Map();
for (const tuple of tuples) {
  const key = `${tuple.trackId}||${tuple.question}`;
  const existing = uniqueQuestions.get(key);
  if (existing) {
    existing.pathwayKeys.push(tuple.pathwayKey);
    continue;
  }
  uniqueQuestions.set(key, {
    questionId: null,
    jurisdiction: tuple.jurisdiction,
    trackId: tuple.trackId,
    pathwayKeys: [tuple.pathwayKey],
    affectedElement: tuple.affectedElement,
    question: tuple.question
  });
}

// The immediate four are classified separately and are not in this denominator.
const IMMEDIATE_TRACKS = new Set(["ga-rfo", "mo-311-326-minor-in-possession", "nd-nonconviction-auto-close-verify", "sc_pti_17_22_150"]);

// Elements a lawyer decides from the statute and the adopted memo, versus those
// that need the current official instructions or an actual rendered packet.
const DESIGN_ELEMENTS = new Set([
  "governing_mechanism", "eligibility_branch", "waiting_period", "venue",
  "output_strategy", "legal_effect_or_warning", "geographic_scope"
]);
const OUTPUT_ELEMENTS = new Set(["correct_form", "packet_components", "participant_instructions"]);
const SOURCE_ELEMENTS = new Set(["filing_process", "notice_or_service"]);

const questions = [...uniqueQuestions.values()].sort(
  (a, b) => a.jurisdiction.localeCompare(b.jurisdiction) || a.trackId.localeCompare(b.trackId)
);

questions.forEach((entry, index) => {
  entry.questionId = `Q-${String(index + 1).padStart(3, "0")}`;
  const track = trackById.get(entry.trackId) ?? null;
  const pathways = joinByTrack.get(entry.trackId) ?? [];
  entry.legalName = track?.legalName ?? null;
  entry.memoPath = track?.memoPath ?? null;
  entry.memoSha256 = track?.memoPath ? memoHashes.get(track.memoPath) : null;
  entry.controllingAuthorities = track?.controllingAuthority?.citations ?? [];
  entry.reviewedAsOf = track?.effectiveDates?.reviewedAsOf ?? null;
  entry.packetFamilies = [...new Set(pathways.flatMap((p) => p.packetFamilies ?? []))];
  entry.familyBridgePresent = pathways.some((p) => p.familyBridgePresent);
  entry.duplicatePathwayRows = entry.pathwayKeys.length - 1;

  const result = classify(entry, track);
  entry.classification = result.classification;
  entry.reason = result.reason;
  entry.owner = result.owner;
  entry.blockedUntil = result.blockedUntil;
});

function classify(entry, track) {
  // A question on a track the immediate assignments already cover is a
  // duplicate of that decision set, not a separate item.
  if (IMMEDIATE_TRACKS.has(entry.trackId)) {
    return {
      classification: "DUPLICATE_OF_DECISION_SET",
      reason: `This track is already covered by an immediate decision set; the question is answered there.`,
      owner: "Lawrence Blackmon",
      blockedUntil: null
    };
  }
  if (!track) {
    return {
      classification: "STALE_OR_SUPERSEDED",
      reason: "The question names a track that is no longer in the memo corpus.",
      owner: "RCAP ledger generation",
      blockedUntil: null
    };
  }
  // The memo already recorded a design decision for this element; the question
  // is a product choice about how to present it, not a question of law.
  if (entry.affectedElement === "output_strategy") {
    return {
      classification: "PRODUCT_DECISION_NOT_LEGAL",
      reason: "The question asks which output vehicle the product should offer. The law is settled in the memo; the choice is a product one.",
      owner: "Roger Roman",
      blockedUntil: null
    };
  }
  if (DESIGN_ELEMENTS.has(entry.affectedElement)) {
    return {
      classification: "READY_FOR_LEGAL_DESIGN_RESEARCH",
      reason: `The question turns on ${entry.affectedElement}, decidable from the cited authority and the adopted memo. It needs neither a rendered packet nor a fresh source.`,
      owner: "Lawrence Blackmon",
      blockedUntil: null
    };
  }
  if (SOURCE_ELEMENTS.has(entry.affectedElement)) {
    return {
      classification: "SOURCE_ACQUISITION_REQUIRED_FIRST",
      reason: `The question turns on ${entry.affectedElement}, which depends on the current official filing or service instructions that have not been acquired.`,
      owner: "RCAP source acquisition",
      blockedUntil: "the official instructions are in hand"
    };
  }
  if (OUTPUT_ELEMENTS.has(entry.affectedElement)) {
    return {
      classification: "COMPLETED_OUTPUT_REQUIRED_FIRST",
      reason: `The question turns on ${entry.affectedElement}, which counsel can only assess against an actual rendered artifact.`,
      owner: "RCAP packet factory",
      blockedUntil: "a candidate artifact and hash exist"
    };
  }
  return {
    classification: "ENGINEERING_QUESTION_NOT_LEGAL",
    reason: `The question names ${entry.affectedElement}, which no adopted authority treats as a question of law.`,
    owner: "RCAP engineering",
    blockedUntil: null
  };
}

// ---------------------------------------------------------------------------
// Ready-now decision sets: one answer that controls more than one track.
// ---------------------------------------------------------------------------

const readyNow = questions.filter((q) => q.classification === "READY_FOR_LEGAL_DESIGN_RESEARCH");
const readySets = new Map();
// A decision set is one ANSWER, not one topic. Two tracks collapse only when
// the memo asks them the same question in the same words; two different
// questions about venue are two decisions even though one lawyer answers both.
const normalize = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 120);
for (const question of readyNow) {
  const key = `${question.jurisdiction}:${question.affectedElement}:${normalize(question.question)}`;
  if (!readySets.has(key)) {
    readySets.set(key, {
      decisionSetId: null,
      jurisdiction: question.jurisdiction,
      affectedElement: question.affectedElement,
      questionIds: [],
      trackIds: [],
      questions: [],
      oneAnswerControlsMultipleTracks: false
    });
  }
  const set = readySets.get(key);
  set.questionIds.push(question.questionId);
  if (!set.trackIds.includes(question.trackId)) set.trackIds.push(question.trackId);
  set.questions.push({ questionId: question.questionId, trackId: question.trackId, question: question.question });
  set.oneAnswerControlsMultipleTracks = set.trackIds.length > 1;
}
const readyDecisionSets = [...readySets.values()]
  .sort((a, b) => b.questionIds.length - a.questionIds.length || a.jurisdiction.localeCompare(b.jurisdiction));
readyDecisionSets.forEach((set, index) => { set.decisionSetId = `RN-${String(index + 1).padStart(2, "0")}`; });

// Batching is a scheduling convenience, not a claim that one answer settles the
// batch. Kept separate from the decision sets so the two are never conflated.
const batchMap = new Map();
for (const set of readyDecisionSets) {
  const key = `${set.jurisdiction}:${set.affectedElement}`;
  if (!batchMap.has(key)) batchMap.set(key, { jurisdiction: set.jurisdiction, affectedElement: set.affectedElement, decisionSetIds: [], questionCount: 0 });
  const batch = batchMap.get(key);
  batch.decisionSetIds.push(set.decisionSetId);
  batch.questionCount += set.questionIds.length;
}
const readyAssignmentBatches = [...batchMap.values()].sort((a, b) => b.questionCount - a.questionCount);

// ---------------------------------------------------------------------------
// The nine tracks that still require legal research, with their real question.
// ---------------------------------------------------------------------------

const researchTracks = finalization.legalResearchRequiredTracks.tracks
  .filter((t) => t.classification === "TRUE_LEGAL_RESEARCH_STILL_REQUIRED")
  .map((entry) => {
    const track = trackById.get(entry.trackId) ?? null;
    const destination = track?.destination ?? {};
    const named = (track?.unresolvedQuestions ?? []).filter((q) => q.impact === "release_blocker");
    // "Legal research required" is a status, not a question. The real question
    // is what the memo says is unresolved, in its own words.
    const unresolvedElement = destination?.name === "Unresolved" ? "governing_mechanism_and_output_vehicle"
      : /output vehicle/i.test(destination?.detail ?? "") ? "output_vehicle"
        : /governing mechanism/i.test(destination?.detail ?? "") ? "governing_mechanism"
          : "destination";
    return {
      jurisdiction: entry.jurisdiction,
      trackId: entry.trackId,
      legalName: entry.legalName,
      memoPath: entry.memoPath,
      memoSha256: memoHashes.get(entry.memoPath) ?? null,
      reviewedAsOf: entry.reviewedAsOf,
      controllingAuthorities: track?.controllingAuthority?.citations ?? [],
      affectedLegalDesignElement: unresolvedElement,
      exactUnresolvedQuestion: named.length > 0
        ? named.map((q) => q.question).join(" ")
        : `${destination?.detail ?? "The memo records the route's destination as unresolved."} The question is therefore: which forum receives this request, under which mechanism, and what participant-facing output vehicle carries it?`,
      memoDestination: destination,
      serviceDisposition: entry.serviceDisposition
    };
  });

// ---------------------------------------------------------------------------
// Source-first and output-first detail.
// ---------------------------------------------------------------------------

const sourceFirst = questions.filter((q) => q.classification === "SOURCE_ACQUISITION_REQUIRED_FIRST").map((q) => {
  const track = trackById.get(q.trackId);
  const destination = track?.destination ?? {};
  return {
    questionId: q.questionId,
    jurisdiction: q.jurisdiction,
    trackId: q.trackId,
    missingSource: `Current official ${q.affectedElement === "notice_or_service" ? "service and notice" : "filing"} instructions for ${track?.legalName ?? q.trackId}`,
    authoritativeIssuingBody: destination?.name && destination.name !== "Unresolved"
      ? destination.name
      : `${q.jurisdiction} judiciary or the agency named in the controlling authority`,
    expectedSourceIdentity: (track?.officialSources ?? []).map((s) => s.title).slice(0, 2),
    questionAnswerableAfterAcquisition: q.question,
    sourceAcquisitionOwner: "RCAP source acquisition"
  };
});

const outputFirst = questions.filter((q) => q.classification === "COMPLETED_OUTPUT_REQUIRED_FIRST").map((q) => ({
  questionId: q.questionId,
  jurisdiction: q.jurisdiction,
  trackId: q.trackId,
  packetFamilies: q.packetFamilies,
  requiredArtifact: q.packetFamilies.length > 0
    ? `A rendered packet from ${q.packetFamilies.join(", ")} with a recorded artifact hash`
    : "A rendered candidate packet; no family is bridged to this track yet",
  exactOutputLevelQuestion: q.question,
  responsibleEngineeringDependency: q.familyBridgePresent
    ? "Packet render and artifact hash"
    : "Track-to-family bridge, then packet render and artifact hash"
}));

// ---------------------------------------------------------------------------
// The four immediate decision sets.
// ---------------------------------------------------------------------------

function immediateSet(id, trackId, overrides) {
  const track = trackById.get(trackId);
  const pathways = joinByTrack.get(trackId) ?? [];
  const named = (track?.unresolvedQuestions ?? []).filter(
    (q) => q.impact === "release_blocker" && COUNSEL_BASES.has(q.provenance?.classificationBasis));
  return {
    decisionId: id,
    jurisdiction: track.jurisdiction,
    tracks: [trackId],
    pathways: pathways.map((p) => p.pathwayKey),
    packetFamilies: [...new Set(pathways.flatMap((p) => p.packetFamilies ?? []))],
    question: named.map((q) => q.question),
    controllingAuthorities: track?.controllingAuthority?.citations ?? [],
    existingMemo: { path: track.memoPath, sha256: memoHashes.get(track.memoPath), reviewedAsOf: track.effectiveDates?.reviewedAsOf ?? null, designStatus: track.legalDesignDecision?.status ?? null },
    existingProductTreatment: pathways.some((p) => p.familyBridgePresent)
      ? "Family bridged; packet generation and payment closed pending this answer."
      : "No family bridged; the route is served as guidance and payment is closed.",
    affectedRoutes: pathways.map((p) => p.pathwayKey),
    paymentCurrentlyDisabled: true,
    generationCurrentlyDisabled: true,
    ...overrides
  };
}

const immediateAssignments = [
  immediateSet("LA-IMM-01", "ga-rfo", {
    conflictOrMissingElement:
      "The adopted Batch 2 resolution matrix makes the § 42-8-66 petition stage conditional on a later counsel approval that has not been given, so direct delivery stays disabled while the petition itself is legally identifiable.",
    options: [
      "Approve a distinct post-consent custom_pleading stage that generates the petition only after the participant holds the prosecuting attorney's written consent.",
      "Keep the route as process guidance and consent support with no generated petition.",
      "Approve the petition stage with a named limitation on when it may be offered."
    ],
    recommendedInterimTreatment:
      "Continue serving process guidance and consent support, with no generated petition and no payment, until the stage is approved.",
    exactDecisionRequested:
      "Does counsel approve a distinct post-consent packet stage for the O.C.G.A. § 42-8-66 retroactive first offender petition, generated only after the participant has obtained the prosecuting attorney's written consent?",
    engineeringChangeAfterAnswer:
      "If approved: register the post-consent custom_pleading unit, bridge it to the GA family and render. If declined: record the guidance disposition and close the route to packet generation permanently."
  }),
  immediateSet("LA-IMM-02", "mo-311-326-minor-in-possession", {
    conflictOrMissingElement:
      "The published FI-05 Case Types List names no code for § 311.326, and the section does not say whether a municipal or county underage-possession ordinance conviction is within it.",
    options: [
      "Name the FI-05 case type code to use and state whether ordinance convictions are in scope.",
      "Restrict the route to § 311.325 convictions only and serve ordinance convictions as guidance.",
      "Serve the whole route as guidance until the Office of State Courts Administrator publishes a code."
    ],
    recommendedInterimTreatment:
      "Restrict to § 311.325 convictions and serve ordinance convictions as guidance, with payment closed on both.",
    exactDecisionRequested:
      "Which FI-05 case type code does a § 311.326 application take where a new case is opened, and is a conviction under a municipal or county underage-possession ordinance within § 311.326?",
    engineeringChangeAfterAnswer:
      "Set the case type code in the packet and set the eligibility branch for ordinance convictions."
  }),
  immediateSet("LA-IMM-03", "nd-nonconviction-auto-close-verify", {
    conflictOrMissingElement:
      "Neither N.D.C.C. § 12-60.1-05, the official instructions, nor the resource set states what remedy exists when the court does not close the record at day sixty-one, or whether the participant is notified that it was closed.",
    options: [
      "Name the remedy (motion, letter to the clerk, or administrative request) and state the notice position.",
      "Serve the route as a verification-and-follow-up guidance product with no filing.",
      "Hold the route until the North Dakota courts publish a procedure."
    ],
    recommendedInterimTreatment:
      "Serve verification guidance that tells the participant how to check the record and what to do at day sixty-one in general terms, with no generated filing and no payment.",
    exactDecisionRequested:
      "What remedy exists where the court does not close the record at day sixty-one under N.D.C.C. § 12-60.1-05, and does the participant receive any notice that the record has been closed?",
    engineeringChangeAfterAnswer:
      "Add the remedy step to the route contract and set the participant instruction on notice."
  }),
  immediateSet("LA-IMM-04", "sc_pti_17_22_150", {
    conflictOrMissingElement:
      "Two authorities give different single-incident fees. S.C. Code § 17-22-940(G) as amended by 2018 Act No. 254 provides that only one $250 fee may be charged where charges from a single incident are combined; the Supreme Court expungement guidance the controlling review relies on reports $150.",
    options: [
      "Quote the statutory $250 figure.",
      "Quote the Supreme Court guidance figure of $150.",
      "Quote both with an explanation of which applies when."
    ],
    recommendedInterimTreatment:
      "The packet already quotes the statutory figure and does not promise the lower one. Keep that until counsel decides.",
    exactDecisionRequested:
      "Does the $150 single-incident fee in the Supreme Court expungement guidance survive the 2018 amendment to S.C. Code § 17-22-940(G), and which figure does the packet quote?",
    engineeringChangeAfterAnswer:
      "Set the fee figure in the SC custom pleading and re-render the family."
  })
];

// ---------------------------------------------------------------------------

const ALL_CLASSIFICATIONS = [
  "READY_FOR_LEGAL_DESIGN_RESEARCH",
  "SOURCE_ACQUISITION_REQUIRED_FIRST",
  "COMPLETED_OUTPUT_REQUIRED_FIRST",
  "EXISTING_AUTHORITY_ALREADY_ANSWERS",
  "DUPLICATE_OF_DECISION_SET",
  "STALE_OR_SUPERSEDED",
  "PRODUCT_DECISION_NOT_LEGAL",
  "ENGINEERING_QUESTION_NOT_LEGAL"
];
// Every category is emitted, zeros included. A category that is silently absent
// is how a published breakdown comes up one short of its own total.
const counts = Object.fromEntries(ALL_CLASSIFICATIONS.map((c) => [c, 0]));
for (const question of questions) counts[question.classification] = (counts[question.classification] ?? 0) + 1;

const register = {
  schemaVersion: 1,
  generatedBy: "scripts/generate-all51-current-legal-questions.mjs",
  createsApproval: false,
  controlling: OUT_JSON,
  denominator: {
    ledgerTuples: tuples.length,
    uniqueQuestions: questions.length,
    collapsed: tuples.length - questions.length,
    note: "The finalization emits one tuple per (pathway, track, question). Four questions are reached by two pathways each, so 53 ledger tuples are 49 distinct questions. A lawyer answers 49."
  },
  classificationCounts: counts,
  classificationSum: Object.values(counts).reduce((a, b) => a + b, 0),
  immediateAssignments,
  readyNowDecisionSets: readyDecisionSets,
  readyNowAssignmentBatches: readyAssignmentBatches,
  trueLegalResearchTracks: researchTracks,
  sourceFirst,
  outputFirst,
  questions
};

const serialized = `${JSON.stringify(register, null, 2)}\n`;
const markdown = renderMarkdown(register);

if (CHECK) {
  const problems = [];
  if (register.classificationSum !== questions.length) problems.push(`classifications sum to ${register.classificationSum}, not ${questions.length}`);
  if (register.denominator.ledgerTuples !== 53) problems.push(`ledger tuples ${register.denominator.ledgerTuples}, expected 53`);
  if (researchTracks.length !== 9) problems.push(`${researchTracks.length} true legal-research tracks, expected 9`);
  if (immediateAssignments.length !== 4) problems.push(`${immediateAssignments.length} immediate assignments, expected 4`);
  for (const track of researchTracks) {
    if (/^legal research required$/i.test(track.exactUnresolvedQuestion.trim())) {
      problems.push(`${track.trackId} uses "legal research required" as its question`);
    }
  }
  for (const question of questions) {
    if (!question.question || question.question.length < 20) problems.push(`${question.questionId} has no usable question text`);
  }
  for (const [rel, expected] of [[OUT_JSON, serialized], [OUT_MD, markdown]]) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) problems.push(`${rel} has not been generated`);
    else if (fs.readFileSync(abs, "utf8") !== expected) problems.push(`${rel} is stale; regenerate it`);
  }
  if (problems.length > 0) {
    console.error("Current legal questions register failed:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(`Current legal questions register verified: ${questions.length} unique questions, ${immediateAssignments.length} immediate assignments, ${researchTracks.length} research tracks.`);
  process.exit(0);
}

fs.mkdirSync(path.join(root, path.dirname(OUT_JSON)), { recursive: true });
fs.mkdirSync(path.join(root, path.dirname(OUT_MD)), { recursive: true });
fs.writeFileSync(path.join(root, OUT_JSON), serialized);
fs.writeFileSync(path.join(root, OUT_MD), markdown);

console.log(`Wrote ${OUT_JSON} and ${OUT_MD}`);
console.log(`Ledger tuples ${register.denominator.ledgerTuples} -> unique questions ${questions.length}`);
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);
console.log(`Ready-now decision sets: ${readyDecisionSets.length}`);
console.log(`True legal-research tracks: ${researchTracks.length}`);

function renderMarkdown(data) {
  const L = [];
  L.push("# The current national legal work queue");
  L.push("");
  L.push("**Generated by** `scripts/generate-all51-current-legal-questions.mjs` from");
  L.push(`\`${data.controlling}\`, which is controlling. Do not edit this file by hand.`);
  L.push("");
  L.push(`**${data.denominator.ledgerTuples} ledger tuples collapse to ${data.denominator.uniqueQuestions} distinct questions.** ${data.denominator.note}`);
  L.push("");
  L.push("| Classification | Questions |");
  L.push("|---|---:|");
  for (const [k, v] of Object.entries(data.classificationCounts).sort((a, b) => b[1] - a[1])) L.push(`| ${k} | ${v} |`);
  L.push(`| **TOTAL** | **${data.classificationSum}** |`);
  L.push("");

  L.push("## Immediate assignments");
  L.push("");
  for (const a of data.immediateAssignments) {
    L.push(`### ${a.decisionId} — ${a.jurisdiction} \`${a.tracks.join(", ")}\``);
    L.push("");
    L.push(`- **PATHWAYS:** ${a.pathways.map((p) => `\`${p}\``).join(", ") || "—"}`);
    L.push(`- **PACKET FAMILIES:** ${a.packetFamilies.join(", ") || "none bridged"}`);
    L.push(`- **QUESTION:** ${a.question.join(" ") || "(see exact decision requested)"}`);
    L.push(`- **CONTROLLING AUTHORITIES:** ${a.controllingAuthorities.join("; ") || "—"}`);
    L.push(`- **EXISTING MEMO:** \`${a.existingMemo.path}\` · sha256 \`${a.existingMemo.sha256}\` · ${a.existingMemo.designStatus} · reviewed as of ${a.existingMemo.reviewedAsOf}`);
    L.push(`- **EXISTING PRODUCT TREATMENT:** ${a.existingProductTreatment}`);
    L.push(`- **CONFLICT OR MISSING ELEMENT:** ${a.conflictOrMissingElement}`);
    L.push(`- **OPTIONS:** ${a.options.map((o, i) => `(${i + 1}) ${o}`).join(" ")}`);
    L.push(`- **RECOMMENDED INTERIM TREATMENT:** ${a.recommendedInterimTreatment}`);
    L.push(`- **EXACT DECISION REQUESTED:** ${a.exactDecisionRequested}`);
    L.push(`- **AFFECTED ROUTES:** ${a.affectedRoutes.length}`);
    L.push(`- **ENGINEERING CHANGE AFTER ANSWER:** ${a.engineeringChangeAfterAnswer}`);
    L.push(`- **PAYMENT CURRENTLY DISABLED:** ${a.paymentCurrentlyDisabled}`);
    L.push(`- **GENERATION CURRENTLY DISABLED:** ${a.generationCurrentlyDisabled}`);
    L.push("");
  }

  L.push(`## Ready now — ${data.readyNowDecisionSets.reduce((n, s) => n + s.questionIds.length, 0)} questions in ${data.readyNowDecisionSets.length} decision sets`);
  L.push("");
  L.push("These need neither a fresh source nor a rendered packet. They can go to legal today.");
  L.push("");
  L.push(`A decision set is one **answer**. ${data.readyNowDecisionSets.filter((s) => s.oneAnswerControlsMultipleTracks).length} of them control more than one track.`);
  L.push(`For scheduling, the sets fall into ${data.readyNowAssignmentBatches.length} batches of one jurisdiction and one legal-design element.`);
  L.push("");
  for (const set of data.readyNowDecisionSets) {
    L.push(`### ${set.decisionSetId} — ${set.jurisdiction} · ${set.affectedElement} · ${set.questionIds.length} question(s), ${set.trackIds.length} track(s)`);
    L.push("");
    for (const q of set.questions) L.push(`- **${q.questionId}** \`${q.trackId}\` — ${q.question}`);
    L.push("");
  }

  L.push("## The nine tracks that still require legal research");
  L.push("");
  for (const t of data.trueLegalResearchTracks) {
    L.push(`### ${t.jurisdiction} \`${t.trackId}\``);
    L.push("");
    L.push(`- **Legal name:** ${t.legalName}`);
    L.push(`- **Affected legal-design element:** ${t.affectedLegalDesignElement}`);
    L.push(`- **Exact unresolved question:** ${t.exactUnresolvedQuestion}`);
    L.push(`- **Controlling authorities:** ${t.controllingAuthorities.join("; ") || "none recorded"}`);
    L.push(`- **Memo:** \`${t.memoPath}\` · sha256 \`${t.memoSha256}\` · reviewed as of ${t.reviewedAsOf}`);
    L.push(`- **Service disposition today:** ${t.serviceDisposition}`);
    L.push("");
  }

  L.push(`## Source-first (${data.sourceFirst.length})`);
  L.push("");
  L.push("| Question | Track | Missing source | Issuing body | Owner |");
  L.push("|---|---|---|---|---|");
  for (const s of data.sourceFirst) {
    L.push(`| ${s.questionId} | \`${s.trackId}\` | ${s.missingSource} | ${s.authoritativeIssuingBody} | ${s.sourceAcquisitionOwner} |`);
  }
  L.push("");

  L.push(`## Output-first (${data.outputFirst.length})`);
  L.push("");
  L.push("Do not send these to legal before a candidate artifact and hash exist.");
  L.push("");
  L.push("| Question | Track | Packet family | Required artifact | Engineering dependency |");
  L.push("|---|---|---|---|---|");
  for (const o of data.outputFirst) {
    L.push(`| ${o.questionId} | \`${o.trackId}\` | ${o.packetFamilies.join(", ") || "none"} | ${o.requiredArtifact} | ${o.responsibleEngineeringDependency} |`);
  }
  L.push("");

  L.push("## Every question");
  L.push("");
  L.push("| ID | Jurisdiction | Track | Element | Classification | Question |");
  L.push("|---|---|---|---|---|---|");
  for (const q of data.questions) {
    L.push(`| ${q.questionId} | ${q.jurisdiction} | \`${q.trackId}\` | ${q.affectedElement} | ${q.classification} | ${q.question.replace(/\|/g, "\\|")} |`);
  }
  L.push("");
  return `${L.join("\n")}\n`;
}
