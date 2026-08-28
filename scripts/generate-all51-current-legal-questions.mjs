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
const controlling = readJson("data/record-clearing/legal-decisions/2026-08-28-controlling-decisions.json");

// The national legal decision report of 2026-08-28, as an overlay. It is
// owner-supplied controlling legal authority covering 49 of this register's
// questions, and it outranks every element-based heuristic below: those
// heuristics exist to decide what a question needs when nobody has answered it,
// and here somebody has.
const national = readJson("data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json");
const nationalByQuestionId = new Map(national.questionDecisions.map((d) => [d.registerQuestionId, d]));
const nationalTrackById = new Map(national.researchTrackDecisions.map((t) => [t.trackId, t]));
const nationalAssignmentByTrackId = new Map(national.immediateAssignments.map((a) => [a.trackId, a]));
const nationalOutOfScope = new Map(
  national.scope.registerQuestionsOutOfReportScope.map((r) => [r.questionId, r.reason])
);
const NATIONAL_OWNERS = {
  LEGAL_DECISION_RESOLVED_PACKET: { owner: "RCAP packet factory", blockedUntil: null },
  LEGAL_DECISION_RESOLVED_GUIDANCE: { owner: "RCAP packet factory", blockedUntil: null },
  SOURCE_ACQUISITION_REQUIRED: { owner: "RCAP source acquisition", blockedUntil: "the official clerk, solicitor or agency instruction is in hand" },
  ARTIFACT_LEGAL_REVIEW_REQUIRED: { owner: "RCAP packet factory, then artifact-level counsel review", blockedUntil: "a candidate artifact and hash exist" },
  ATTORNEY_OR_PARTNER_HANDOFF: { owner: "Service design", blockedUntil: null },
  FUTURE_EFFECTIVE: { owner: "RCAP engineering", blockedUntil: "the statutory effective date" }
};

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

/**
 * The tuple count as first published, and every addition since. A tuple is a
 * (pathway, track, question) triple, so binding a pathway to a track that
 * carries an open question adds one — which is the queue working, not drifting,
 * provided the addition is named here.
 */
const TUPLE_BASELINE = {
  count: 53,
  publishedOn: "2026-08-28",
  additions: [
    {
      trackId: "ms-misd-addl",
      pathwayKeys: [
        "MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
        "MS:additional-municipal-court-misdemeanor-relief-21-23-7-6"
      ],
      tuples: 2,
      reason: "Both terminal Mississippi misdemeanor routes were bound to ms-misd-addl, which carries the open Miss. Code Ann. § 99-19-72 filing-fee question. That question names §§ 9-11-15(3) and 21-23-7(6) directly as sections the § 99-19-71 fee does not reach by its terms, so binding the routes is what surfaced it. One question text, reached by two pathways."
    }
  ]
};

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

// The four decided tracks. Their six question texts were previously tracked
// beside the 49 rather than inside it, so 49 minus 6 was never the right sum:
// the two sets were disjoint. They are folded in here, giving one denominator
// of 55 in which resolution can actually be counted.
const IMMEDIATE_TRACKS = new Set(controlling.decisions.flatMap((d) => d.tracks));

const decisionByTrack = new Map();
for (const decision of controlling.decisions) {
  for (const trackId of decision.tracks) decisionByTrack.set(trackId, decision);
}

// The exact question texts the controlling decisions answer. A question
// elsewhere in the corpus with the same text is answered by the same decision;
// that is a cascade, not an assumption.
const decidedQuestionTexts = new Map();
for (const decision of controlling.decisions) {
  for (const text of decision.originalQuestionText) decidedQuestionTexts.set(text, decision);
}

for (const decision of controlling.decisions) {
  for (const text of decision.originalQuestionText) {
    const track = trackById.get(decision.tracks[0]);
    const memoQuestion = (track?.unresolvedQuestions ?? []).find((q) => q.question === text);
    uniqueQuestions.set(`${decision.tracks[0]}||${text}`, {
      questionId: null,
      jurisdiction: decision.jurisdiction,
      trackId: decision.tracks[0],
      pathwayKeys: [...decision.pathways],
      affectedElement: memoQuestion?.affectedElement ?? "(unstated)",
      question: text,
      decidedDirectly: true
    });
  }
}

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
  entry.legalStatus = result.legalStatus ?? "OPEN";
  entry.legalAuthorities = result.legalAuthorities ?? [];
  entry.reason = result.reason;
  entry.owner = result.owner;
  entry.blockedUntil = result.blockedUntil;
  entry.resolvedBy = result.resolvedBy ?? null;
  entry.cascaded = Boolean(result.cascaded);
  entry.scopeNote = result.scopeNote ?? null;
});

function classify(entry, track) {
  // Legal status and delivery state are two different questions, and the report
  // is explicit that they are: "A resolved legal question does not automatically
  // make a route commercially ready." Seven South Carolina questions are
  // answered by CLD-2026-08-28-SC-PTI on the fee AND held by the report behind a
  // solicitor source gate. Collapsing those into one field loses whichever half
  // is recorded second, and a queue that showed them as resolved would show
  // seven routes as shippable that are not.
  const legalAuthorities = [];
  let cascaded = false;

  // 1. Answered outright by a controlling decision.
  const direct = decisionByTrack.get(entry.trackId);
  if (direct && direct.originalQuestionText.includes(entry.question)) {
    legalAuthorities.push({
      authorityId: direct.decisionId,
      kind: "controlling_decision",
      statement: `Answered by ${direct.decisionId}, reviewed through ${direct.reviewedThrough}.`
    });
  } else {
    // 2. The same question, asked on another track. The SC single-incident fee
    //    question appears verbatim on eight tracks; one answer settles all of
    //    them, and re-asking would be the duplicate research this register
    //    exists to prevent.
    const cascade = decidedQuestionTexts.get(entry.question);
    if (cascade) {
      cascaded = true;
      legalAuthorities.push({
        authorityId: cascade.decisionId,
        kind: "controlling_decision_cascade",
        statement: `Byte-identical to the question answered by ${cascade.decisionId}. One answer controls every track that asks it.`
      });
    }
  }

  // 3. Answered by the national legal decision report.
  const reportDecision = nationalByQuestionId.get(entry.questionId);
  if (reportDecision) {
    legalAuthorities.push({
      authorityId: `NATIONAL-2026-08-28-${reportDecision.reportQuestionId}`,
      kind: "national_legal_decision_report",
      statement: `${reportDecision.holding} Controlling product decision: ${reportDecision.controllingProductDecision}.`
    });
  }

  // The report sets the delivery state wherever it reaches, because it is the
  // later authority and the only one that speaks to delivery at all.
  if (reportDecision) {
    const routing = NATIONAL_OWNERS[reportDecision.deliveryDisposition];
    if (!routing) throw new Error(`no owner routing for ${reportDecision.deliveryDisposition}`);
    return {
      classification: reportDecision.deliveryDisposition,
      legalStatus: "RESOLVED",
      legalAuthorities,
      reason: `${legalAuthorities.map((a) => a.statement).join(" ")} (${national.authority.document} ${reportDecision.reportQuestionId}, current through ${reportDecision.reviewedThrough}.)`,
      owner: routing.owner,
      blockedUntil: routing.blockedUntil,
      resolvedBy: `NATIONAL-2026-08-28-${reportDecision.reportQuestionId}`,
      cascaded
    };
  }

  // A controlling decision with no report row answers the question outright and
  // names no further delivery gate.
  if (legalAuthorities.length > 0) {
    return {
      classification: "LEGAL_DECISION_RESOLVED",
      legalStatus: "RESOLVED",
      legalAuthorities,
      reason: legalAuthorities.map((a) => a.statement).join(" "),
      owner: "Closed",
      blockedUntil: null,
      resolvedBy: legalAuthorities[0].authorityId,
      cascaded
    };
  }

  // 4. A Missouri FI-05 case type question is a receiving-clerk configuration,
  //    not statewide legal research. The controlling decision states the FI-05
  //    rule about the published Case Types List -- XG provisional, X5
  //    prohibited, X1 only on clerk direction -- and puts the final code behind
  //    the same clerk gate. Its named scope is § 311.326; it is applied here
  //    because the rule is about the list, and the gate is the same gate.
  if (entry.jurisdiction === "MO" && /FI-05 case type code/i.test(entry.question)) {
    return {
      classification: "OPERATIONAL_CONFIGURATION_REQUIRED",
      reason: "The receiving clerk confirms the case type code. CLD-2026-08-28-MO-311-326 fixes the rule (XG provisional, X5 prohibited, X1 only on clerk direction) and places the final code behind the clerk gate.",
      owner: "RCAP operations",
      blockedUntil: "receiving-clerk confirmation",
      scopeNote: "The controlling decision names mo-311-326-minor-in-possession. It is applied to this track because the FI-05 rule is stated about the published Case Types List and the clerk gate is the same."
    };
  }

  // 5. A question that exists only because a now-retired output was expected.
  if (entry.jurisdiction === "SC" && retiredScPleading(entry, track)) {
    return {
      classification: "STALE_OR_SUPERSEDED",
      reason: "The ordinary SC custom-pleading packet is retired by CLD-2026-08-28-SC-PTI. This question existed only because that pleading was expected.",
      owner: "Closed",
      blockedUntil: null,
      resolvedBy: "CLD-2026-08-28-SC-PTI"
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
      serviceDisposition: entry.serviceDisposition,
      // The national report gives each of these nine a complete legal treatment.
      // The track stays listed because its memo still records the deferral, and
      // the memos are hash-bound and never edited; what changes is that the
      // question is answered and the work is now delivery, not research.
      nationalReportTreatment: nationalTrackById.get(entry.trackId) ?? null,
      legalStatus: nationalTrackById.has(entry.trackId) ? "RESOLVED" : "OPEN"
    };
  });

const researchTracksStillOpen = researchTracks.filter((t) => t.legalStatus === "OPEN");

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
    // The national report answers all four of these. The assignment record is
    // kept — it states what was asked, and deleting the question once it is
    // answered destroys the ability to check that the answer addresses it — but
    // it is no longer an open ask, and its status says so.
    nationalReportTreatment: nationalAssignmentByTrackId.get(trackId) ?? null,
    assignmentStatus: nationalAssignmentByTrackId.has(trackId) ? "ANSWERED_BY_NATIONAL_REPORT" : "OPEN",
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

function retiredScPleading(entry, track) {
  // Only the ordinary PTI custom pleading is retired. Another SC track that
  // happens to be a custom pleading is untouched.
  return track?.trackId === "sc_pti_17_22_150" && track?.outputStrategy === "custom_pleading";
}

// Categories that close a question. Everything else is still open work.
/**
 * Categories in which nothing further is owed by this register. The report's
 * own framing decides two of the additions:
 *
 *   ATTORNEY_OR_PARTNER_HANDOFF is terminal because the report says these "are
 *   service dispositions, not missing statewide research" — the decision has
 *   been made, and it was to hand the matter off.
 *
 *   FUTURE_EFFECTIVE is terminal here because the law is settled; what remains
 *   is an effective-date control, which is engineering, not a question.
 *
 * SOURCE_ACQUISITION_REQUIRED and ARTIFACT_LEGAL_REVIEW_REQUIRED are NOT
 * terminal. Their legal question is answered but a gate stands between the
 * answer and a releasable route, and a queue that hid that would report thirty
 * routes as ready that are not.
 */
const TERMINAL = new Set([
  "RESOLVED_BY_CONTROLLING_DECISION",
  "EXISTING_AUTHORITY_ALREADY_ANSWERS",
  "DUPLICATE_OF_DECISION_SET",
  "STALE_OR_SUPERSEDED",
  "LEGAL_DECISION_RESOLVED",
  "LEGAL_DECISION_RESOLVED_PACKET",
  "LEGAL_DECISION_RESOLVED_GUIDANCE",
  "ATTORNEY_OR_PARTNER_HANDOFF",
  "FUTURE_EFFECTIVE"
]);

const ALL_CLASSIFICATIONS = [
  "RESOLVED_BY_CONTROLLING_DECISION",
  "OPERATIONAL_CONFIGURATION_REQUIRED",
  "READY_FOR_LEGAL_DESIGN_RESEARCH",
  "SOURCE_ACQUISITION_REQUIRED_FIRST",
  "COMPLETED_OUTPUT_REQUIRED_FIRST",
  // The delivery vocabulary the national report classifies into. The older
  // categories above are kept and still emitted at zero: a category that
  // disappears takes its history with it, and the point of publishing every
  // category is that a reader can see what emptied.
  "LEGAL_DECISION_RESOLVED",
  "LEGAL_DECISION_RESOLVED_PACKET",
  "LEGAL_DECISION_RESOLVED_GUIDANCE",
  "SOURCE_ACQUISITION_REQUIRED",
  "ARTIFACT_LEGAL_REVIEW_REQUIRED",
  "ATTORNEY_OR_PARTNER_HANDOFF",
  "FUTURE_EFFECTIVE",
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
    historicalLedgerTuples: tuples.length,
    historicalDeferredUniqueQuestions: questions.filter((q) => !q.decidedDirectly).length,
    decidedTrackQuestionTexts: questions.filter((q) => q.decidedDirectly).length,
    historicalUniqueQuestions: questions.length,
    baselineTuples: TUPLE_BASELINE.count,
    accountedAdditions: TUPLE_BASELINE.additions,
    note: `Three numbers, none of them interchangeable. The finalization emits ${tuples.length} (pathway, track, question) tuples, of which ${TUPLE_BASELINE.count} were in the first published queue and ${tuples.length - TUPLE_BASELINE.count} were added by bindings named in accountedAdditions. Tuples exceed questions because some questions are reached by more than one pathway, giving ${questions.filter((q) => !q.decidedDirectly).length} deferred questions. The ${questions.filter((q) => q.decidedDirectly).length} question texts on the decided tracks were tracked BESIDE that figure, not inside it, so subtracting one from the other was never valid. Folding them in gives one denominator of ${questions.length} in which resolution can be counted.`
  },
  resolution: {
    controllingDecisionRecord: "data/record-clearing/legal-decisions/2026-08-28-controlling-decisions.json",
    reviewedThrough: controlling.reviewedThrough,
    decisionsRecorded: controlling.decisions.length,
    nationalReportRecord: national.authority.document,
    nationalReportSha256: national.authority.sha256,
    nationalReportCurrentThrough: national.authority.currentThrough,
    legallyResolvedQuestions: questions.filter((q) => q.legalStatus === "RESOLVED").length,
    legallyOpenQuestions: questions.filter((q) => q.legalStatus === "OPEN").length,
    resolvedByNationalReport: questions.filter((q) => q.legalAuthorities.some((a) => a.kind === "national_legal_decision_report")).length,
    resolvedByControllingDecision: questions.filter((q) => q.legalAuthorities.some((a) => a.kind.startsWith("controlling_decision"))).length,
    resolvedByBothAuthorities: questions.filter((q) =>
      q.legalAuthorities.some((a) => a.kind === "national_legal_decision_report")
      && q.legalAuthorities.some((a) => a.kind.startsWith("controlling_decision"))).length,
    resolvedByCascade: questions.filter((q) => q.cascaded).length,
    questionsOutsideNationalReportScope: national.scope.registerQuestionsOutOfReportScope,
    // Not "unanswered". Every one of these has its legal answer; each is held by
    // a delivery gate the answer does not remove.
    questionsHeldByADeliveryGate: questions.filter((q) => !TERMINAL.has(q.classification)).length,
    deliveryGates: Object.fromEntries(
      questions.filter((q) => !TERMINAL.has(q.classification))
        .reduce((m, q) => m.set(q.classification, (m.get(q.classification) ?? 0) + 1), new Map())),
    questionsWithNothingFurtherOwed: questions.filter((q) => TERMINAL.has(q.classification)).length,
    openImmediateAssignments: immediateAssignments.filter((a) => a.assignmentStatus === "OPEN").length,
    immediateAssignmentsAnsweredByNationalReport: immediateAssignments.filter((a) => a.assignmentStatus === "ANSWERED_BY_NATIONAL_REPORT").length,
    researchTracksStillOpen: researchTracksStillOpen.length,
    researchTracksAnsweredByNationalReport: researchTracks.length - researchTracksStillOpen.length,
    terminalCategories: [...TERMINAL]
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
  // The published tuple count was 53. It may move, but only by additions this
  // register names. A queue whose denominator grows quietly is a queue nobody
  // can audit.
  const expectedTuples = TUPLE_BASELINE.count + TUPLE_BASELINE.additions.reduce((a, x) => a + x.tuples, 0);
  if (register.denominator.historicalLedgerTuples !== expectedTuples) {
    problems.push(`ledger tuples ${register.denominator.historicalLedgerTuples}; baseline ${TUPLE_BASELINE.count} plus ${expectedTuples - TUPLE_BASELINE.count} accounted addition(s) is ${expectedTuples}`);
  }
  for (const addition of TUPLE_BASELINE.additions) {
    const found = tuples.filter((t) => addition.pathwayKeys.includes(t.pathwayKey) && t.trackId === addition.trackId).length;
    if (found !== addition.tuples) {
      problems.push(`${addition.trackId}: ${found} tuple(s) on ${addition.pathwayKeys.join(", ")}, recorded as ${addition.tuples}`);
    }
  }
  if (register.denominator.decidedTrackQuestionTexts !== 6) problems.push(`decided question texts ${register.denominator.decidedTrackQuestionTexts}, expected 6`);
  const terminal = questions.filter((q) => TERMINAL.has(q.classification)).length;
  if (register.resolution.questionsHeldByADeliveryGate + terminal !== questions.length) {
    problems.push(`gated ${register.resolution.questionsHeldByADeliveryGate} + terminal ${terminal} != ${questions.length}`);
  }
  if (register.resolution.decisionsRecorded !== 4) problems.push(`${register.resolution.decisionsRecorded} controlling decisions, expected 4`);
  for (const decision of controlling.decisions) {
    for (const text of decision.originalQuestionText) {
      const row = questions.find((q) => q.question === text && q.trackId === decision.tracks[0]);
      if (!row) problems.push(`${decision.decisionId} names a question text with no row`);
      else if (row.legalStatus !== "RESOLVED") problems.push(`${decision.decisionId} question is legally ${row.legalStatus}`);
      // Check the decision itself is recorded on the row, not merely that the
      // row says "resolved". Once a later authority can also resolve a question,
      // a label alone no longer proves this decision was the one that did it.
      else if (!row.legalAuthorities.some((a) => a.authorityId === decision.decisionId)) {
        problems.push(`${decision.decisionId} is not among ${row.questionId}'s legal authorities (${row.legalAuthorities.map((a) => a.authorityId).join(", ") || "none"})`);
      }
    }
  }
  // Every question the overlay maps must carry the report as an authority, and
  // every question it does not map must be the one the overlay records as out of
  // the report's scope. Silence in either direction would overstate coverage.
  for (const decision of national.questionDecisions) {
    const row = questions.find((q) => q.questionId === decision.registerQuestionId);
    if (!row) { problems.push(`the overlay maps ${decision.registerQuestionId}, which this register does not carry`); continue; }
    if (!row.legalAuthorities.some((a) => a.authorityId === `NATIONAL-2026-08-28-${decision.reportQuestionId}`)) {
      problems.push(`${row.questionId} does not record ${decision.reportQuestionId} from the national report`);
    }
    if (row.classification !== decision.deliveryDisposition) {
      problems.push(`${row.questionId} is ${row.classification}; the report says ${decision.deliveryDisposition}`);
    }
  }
  for (const row of questions.filter((q) => q.legalStatus === "OPEN")) {
    if (!(row.questionId in Object.fromEntries(national.scope.registerQuestionsOutOfReportScope.map((r) => [r.questionId, r.reason])))) {
      problems.push(`${row.questionId} is legally open but is not recorded as outside the national report's scope`);
    }
  }
  if (researchTracks.length !== 9) problems.push(`${researchTracks.length} true legal-research tracks, expected 9`);
  if (immediateAssignments.length !== 4) problems.push(`${immediateAssignments.length} immediate assignments, expected 4`);
  // Each of the nine tracks and each of the four assignments must be matched to
  // a treatment in the report by track id. A track the report does not name
  // stays open, and the register must say which.
  for (const t of researchTracks) {
    if (t.legalStatus === "RESOLVED" && !t.nationalReportTreatment) problems.push(`${t.trackId} is marked resolved with no report treatment`);
  }
  for (const a of immediateAssignments) {
    if (a.assignmentStatus === "ANSWERED_BY_NATIONAL_REPORT" && !a.nationalReportTreatment) problems.push(`${a.decisionId} is marked answered with no report treatment`);
  }
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
console.log(`Ledger tuples ${register.denominator.historicalLedgerTuples} -> unique questions ${questions.length}`);
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
  L.push(`**${data.denominator.historicalLedgerTuples} ledger tuples · ${data.denominator.historicalDeferredUniqueQuestions} deferred questions · ${data.denominator.decidedTrackQuestionTexts} on decided tracks · ${data.denominator.historicalUniqueQuestions} in one denominator.**`);
  L.push("");
  L.push(data.denominator.note);
  L.push("");
  L.push(`**Legally resolved: ${data.resolution.legallyResolvedQuestions} of ${data.questions.length}. Legally open: ${data.resolution.legallyOpenQuestions}.**`);
  L.push("");
  L.push(`Two authorities answer these questions and neither supersedes the other. The national legal decision report of ${data.resolution.nationalReportCurrentThrough} answers ${data.resolution.resolvedByNationalReport}; the ${data.resolution.decisionsRecorded} controlling decisions of ${data.resolution.reviewedThrough} answer ${data.resolution.resolvedByControllingDecision} (${data.resolution.resolvedByCascade} of them by identical text on other tracks); ${data.resolution.resolvedByBothAuthorities} are answered by both, where the controlling decision settles the fee and the report still holds the route behind a solicitor source gate.`);
  L.push("");
  L.push(`**A resolved legal question is not a releasable route.** ${data.resolution.questionsWithNothingFurtherOwed} questions owe nothing further. ${data.resolution.questionsHeldByADeliveryGate} are answered and still held by a delivery gate: `
    + Object.entries(data.resolution.deliveryGates).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v} ${k}`).join(", ") + ".");
  L.push("");
  L.push(`Open immediate assignments: ${data.resolution.openImmediateAssignments} (${data.resolution.immediateAssignmentsAnsweredByNationalReport} answered by the report). Legal-research tracks still open: ${data.resolution.researchTracksStillOpen} (${data.resolution.researchTracksAnsweredByNationalReport} answered by the report).`);
  for (const row of data.resolution.questionsOutsideNationalReportScope) {
    L.push("");
    L.push(`**${row.questionId} is outside the report's scope.** ${row.reason}`);
  }
  L.push("");
  L.push("| Classification | Questions |");
  L.push("|---|---:|");
  for (const [k, v] of Object.entries(data.classificationCounts).sort((a, b) => b[1] - a[1])) L.push(`| ${k} | ${v} |`);
  L.push(`| **TOTAL** | **${data.classificationSum}** |`);
  L.push("");

  L.push("## Immediate assignments — all four resolved");
  L.push("");
  L.push(`Answered by \`${data.resolution.controllingDecisionRecord}\`, reviewed through ${data.resolution.reviewedThrough}. Retained for the record; none is open.`);
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
