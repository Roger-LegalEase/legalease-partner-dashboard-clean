// All-51 legal authority reconciliation — final denominator correction.
//
// Five bounded corrections on top of
// generate-all51-legal-authority-reconciliation.mjs:
//
//   2. The pathway rows that reach no registry track, classified against the
//      memo corpus rather than assumed to be engineering gaps.
//   3. All 89 legal_research_required tracks, classified against authority
//      created after the 2026-08-02 memos.
//   4. The release-question denominator, which must equal the sum of its
//      provenance categories with no unexplained remainder.
//   5. LA-01, validated row by row against a named substantive trigger before
//      any of it reaches counsel.
//   7. The counsel-confirmation questions that sit behind a bridge, split by
//      whether they can run now or genuinely need a source or a rendered
//      output first.
//
// Usage:
//   node scripts/generate-all51-legal-authority-finalization.mjs           # write
//   node scripts/generate-all51-legal-authority-finalization.mjs --check   # verify

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");

const OUT_JSON = "data/rcap-ledger/all51-legal-authority-finalization.json";
const OUT_MD = "docs/record-clearing/ALL51_LEGAL_AUTHORITY_FINALIZATION.md";
const MEMO_DIR = "data/record-clearing/legal-design-intake";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const readOptional = (rel) => (fs.existsSync(path.join(root, rel)) ? readJson(rel) : null);

const reconciliation = readJson("data/rcap-ledger/all51-legal-authority-reconciliation.json");
const closure = readJson("data/rcap-ledger/sellable-pathway-closure.json");
const trackAdoption = readOptional("data/rcap-codex/d-adoption-continuity/track-adoption.json");
const terminalization = readOptional("data/rcap-ledger/track-terminalization.json");
const trackRegistry = readOptional("data/record-clearing/legal-design-track-registry.json");

// ---------------------------------------------------------------------------
// The memo corpus, read once.
// ---------------------------------------------------------------------------

const memoTracks = [];
const memoFiles = [];
for (const file of fs.readdirSync(path.join(root, MEMO_DIR)).sort()) {
  if (!file.endsWith(".memo.json") || file === "TEMPLATE.memo.json") continue;
  const rel = `${MEMO_DIR}/${file}`;
  const raw = fs.readFileSync(path.join(root, rel), "utf8");
  const memo = JSON.parse(raw);
  memoFiles.push({ path: rel, sha256: createHash("sha256").update(raw).digest("hex"), bytes: Buffer.byteLength(raw) });
  for (const track of memo.tracks) {
    memoTracks.push({
      jurisdiction: memo.jurisdiction,
      trackId: track.trackId,
      memoPath: rel,
      legalName: track.legalName ?? "",
      publicName: track.publicName ?? "",
      status: track.legalDesignDecision?.status ?? null,
      rationale: track.legalDesignDecision?.rationale ?? "",
      reviewedAsOf: track.effectiveDates?.reviewedAsOf ?? null,
      destination: track.destination ?? null,
      outputStrategy: track.outputStrategy ?? null,
      // The memo states its own conclusion in the destination and the rationale.
      // A track with no open question but a destination that reads "Unresolved"
      // is not resolved; the absence of a question is not an answer.
      destinationUnresolved: /unresolved/i.test(
        `${JSON.stringify(track.destination ?? {})} ${track.legalDesignDecision?.rationale ?? ""}`),
      notRegisteredAtRuntime: /not registered at runtime|unreachable/i.test(
        `${JSON.stringify(track.destination ?? {})} ${track.legalDesignDecision?.rationale ?? ""}`),
      questions: (track.unresolvedQuestions ?? []).filter((q) => q.impact === "release_blocker")
    });
  }
}
const memoByJurisdiction = new Map();
for (const track of memoTracks) {
  if (!memoByJurisdiction.has(track.jurisdiction)) memoByJurisdiction.set(track.jurisdiction, []);
  memoByJurisdiction.get(track.jurisdiction).push(track);
}

// ---------------------------------------------------------------------------
// 4. The release-question denominator, computed from the corpus so it cannot
//    disagree with itself. Every category is emitted, including one-member
//    categories -- the previous report dropped a category of size 1 and
//    published a sum that was short by exactly that.
// ---------------------------------------------------------------------------

const QUESTION_OWNER = {
  counsel_confirmation_required: "counsel",
  explicit_state_addendum: "source_acquisition",
  mechanical_translation: "engineering",
  batch_decision_matrix: "counsel"
};

const byProvenance = {};
const byOwner = {};
const byElement = {};
let questionTotal = 0;
const uncategorized = [];
for (const track of memoTracks) {
  for (const question of track.questions) {
    questionTotal += 1;
    const basis = question.provenance?.classificationBasis ?? "(no provenance recorded)";
    byProvenance[basis] = (byProvenance[basis] ?? 0) + 1;
    const owner = QUESTION_OWNER[basis];
    if (!owner) uncategorized.push({ jurisdiction: track.jurisdiction, trackId: track.trackId, basis });
    byOwner[owner ?? "(unmapped)"] = (byOwner[owner ?? "(unmapped)"] ?? 0) + 1;
    const element = question.affectedElement ?? "(unstated)";
    byElement[element] = (byElement[element] ?? 0) + 1;
  }
}

const releaseQuestions = {
  total: questionTotal,
  byProvenance,
  provenanceSum: Object.values(byProvenance).reduce((a, b) => a + b, 0),
  byOwner,
  ownerSum: Object.values(byOwner).reduce((a, b) => a + b, 0),
  byAffectedElement: byElement,
  elementSum: Object.values(byElement).reduce((a, b) => a + b, 0),
  unmappedProvenance: uncategorized,
  correction: "The previously published breakdown listed three provenance categories summing to 853 and omitted batch_decision_matrix, which has exactly one member. The total of 854 was correct; the published categories were not exhaustive. Every category is now emitted, including categories of size one."
};

// ---------------------------------------------------------------------------
// 2. The pathway rows that reach no registry track (published baseline 40).
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "and", "the", "of", "for", "under", "a", "an", "or", "to", "in", "on", "by",
  "route", "branch", "path", "record", "records", "relief", "with", "after"
]);

const tokenize = (value) => new Set(
  String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ")
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t) && !/^\d+$/.test(t))
);

/** Jaccard-style overlap, biased toward the pathway's own vocabulary. */
function matchScore(pathwayTokens, track) {
  const trackTokens = tokenize(`${track.trackId} ${track.legalName} ${track.publicName}`);
  let shared = 0;
  for (const token of pathwayTokens) if (trackTokens.has(token)) shared += 1;
  return pathwayTokens.size === 0 ? 0 : shared / pathwayTokens.size;
}

/**
 * The no-track denominator as first published, and every pathway that has since
 * left it with the reason it left. A pathway may only leave by being bound to a
 * registry track through data/rcap-ledger/crosswalk-adjudications.json, whose
 * licenses the crosswalk generator re-verifies against live bytes on every run.
 */
const NO_TRACK_BASELINE = {
  publishedOn: "2026-08-28",
  keys: [
    "AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085",
    "CO:juvenile-expungement-19-1-306",
    "DE:juvenile-expungement-under-10-del-c-1017-1019-1017a",
    "ID:human-trafficking-survivor-vacatur-and-expungement",
    "ID:juvenile-expungement",
    "ID:withheld-judgment-idaho-code-19-2604-review-branch",
    "IL:human-trafficking-survivor-vacatur-and-expungement",
    "MD:juvenile-expungement",
    "ME:juvenile-sealing",
    "ME:pardon-route",
    "MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
    "MS:additional-municipal-court-misdemeanor-relief-21-23-7-6",
    "MS:controlled-substance-conditional-discharge-active-case-admission",
    "MS:human-trafficking-survivor-expungement-97-3-54-6-6",
    "MS:human-trafficking-survivor-vacatur-97-3-54-6-5",
    "MS:intervention-court-dismissal-only-nonconviction-expungement-99-19-71-4",
    "MS:intervention-court-statutory-result-enforcement-referral",
    "MS:nonadjudication-99-15-26-active-case-admission",
    "MS:pretrial-intervention-active-case-admission",
    "MS:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59",
    "NV:controlled-substance-possession-sealing-under-nrs-453-3365",
    "NV:trafficking-victim-vacatur-and-sealing-under-nrs-179-247",
    "NY:conditional-treatment-sealing-under-cpl-160-58",
    "OH:juvenile-sealing-and-expungement",
    "OK:human-trafficking-survivor-relief",
    "OK:juvenile-record-expungement",
    "SC:human-trafficking-survivor-expungement",
    "SD:controlled-substance-deferred-disposition-route",
    "SD:juvenile-delinquency-sealing",
    "SD:juvenile-trafficking-expungement",
    "UT:path-l-vacatur-human-trafficking-related-expungement",
    "UT:path-m-juvenile-expungement",
    "VT:juvenile-sealing",
    "WA:juvenile-record-sealing-under-rcw-13-50-260",
    "WI:executive-pardon-guidance",
    "WI:juvenile-adjudication-expungement-under-wis-stat-938-355-4m",
    "WV:juvenile-record-relief",
    "WV:sex-trafficking-victim-vacatur-and-expungement",
    "WY:human-trafficking-victim-vacatur-w-s-6-2-708",
    "WY:juvenile-minor-expungement-w-s-14-6-241",
  ],
  departures: {
    "MS:additional-justice-court-misdemeanor-relief-9-11-15-3":
      "Bound to ms-misd-addl on Miss. Code Ann. § 9-11-15(3). The track models the justice-court and municipal-court branches as one node; the crosswalk had bound only the parent court-selection route, which the legal-authority layer records as outcomeMode=referral and which never renders.",
    "MS:additional-municipal-court-misdemeanor-relief-21-23-7-6":
      "Bound to ms-misd-addl on Miss. Code Ann. § 21-23-7(6), the municipal-court half of the same track, for the same reason.",
    // These four left by a signed decision, not by acquiring a track. The
    // reconciliation is scoped to the paid denominator, so a pathway that
    // leaves that denominator stops having a row at all — and a pathway with no
    // row cannot be in the no-track set. Recording them as departures says the
    // denominator moved because someone decided it should.
    "MS:controlled-substance-conditional-discharge-active-case-admission":
      "Left the paid denominator by Roger Roman's signed reclassification of 2026-08-28, which removed the active-case-admission nodes from paid_packet_intended. Admission to a conditional discharge happens while the case is active and is not a participant filing; the post-completion § 41-29-150(d)(2) relief is a separate route and remains reachable.",
    "MS:intervention-court-statutory-result-enforcement-referral":
      "Left the paid denominator by the same signed reclassification, applied on the owner's explicit confirmation that the enforcement referral moves too. It enforces relief the statute already granted and was never sold as an expungement packet; it stays a handoff rather than becoming ordinary guidance.",
    "MS:nonadjudication-99-15-26-active-case-admission":
      "Left the paid denominator by the same signed reclassification. Admission to nonadjudication is discretionary and happens while the case is active; the post-completion § 99-15-26 expungement is a separate participant packet and remains reachable.",
    "MS:pretrial-intervention-active-case-admission":
      "Left the paid denominator by the same signed reclassification. Entry depends on the district attorney and the program rather than any elapsed wait; the post-completion diversion expungement is a separate participant packet and remains reachable."
  }
};

const noTrackRows = reconciliation.rows.filter((r) => r.trackIds.length === 0);
const noTrackPresent = new Set(noTrackRows.map((r) => r.pathwayKey));
const noTrackBaselineKeys = new Set(NO_TRACK_BASELINE.keys);
const noTrackDeparted = NO_TRACK_BASELINE.keys.filter((k) => !noTrackPresent.has(k));
const noTrackUnexplained = noTrackDeparted.filter((k) => !(k in NO_TRACK_BASELINE.departures));
const noTrackArrived = [...noTrackPresent].filter((k) => !noTrackBaselineKeys.has(k));

const noTrackClassified = noTrackRows.map((row) => {
  const tokens = tokenize(`${row.pathway} ${row.pathwayLabel ?? ""}`);
  const candidates = (memoByJurisdiction.get(row.jurisdiction) ?? [])
    .map((track) => ({ track, score: matchScore(tokens, track) }))
    .filter((c) => c.score >= 0.34)
    .sort((a, b) => b.score - a.score);

  const best = candidates[0] ?? null;
  const classification = classifyNoTrack(row, best, candidates);
  return {
    jurisdiction: row.jurisdiction,
    pathway: row.pathway,
    pathwayKey: row.pathwayKey,
    pathwayLabel: row.pathwayLabel,
    candidateTrackId: best?.track.trackId ?? null,
    candidateTrackName: best?.track.legalName ?? null,
    candidateMatchScore: best ? Number(best.score.toFixed(2)) : 0,
    candidateDesignStatus: best?.track.status ?? null,
    candidateCount: candidates.length,
    classification: classification.classification,
    reason: classification.reason,
    smallestRemainingAction: classification.action
  };
});

function classifyNoTrack(row, best, candidates) {
  if (!best) {
    return {
      classification: "NO_LEGAL_DESIGN_TRACK_EXISTS",
      reason: `No track in ${row.jurisdiction}'s memo corresponds to this pathway.`,
      action: `Write the legal design for ${row.jurisdiction} ${row.pathway}, or record it as intentionally outside product scope.`
    };
  }
  if (best.track.status === "legal_research_required") {
    return {
      classification: "DEFERRED_LEGAL_RESEARCH_REQUIRED_TRACK_EXISTS",
      reason: `The memo track ${best.track.trackId} covers this pathway and deliberately records legal_research_required. This is a deferred legal decision, not a missing bridge.`,
      action: `Complete the deferred legal research on ${best.track.trackId} before any bridge is built.`
    };
  }
  // matchScore is a lexical overlap on names. It proposes a candidate; it does
  // not establish that the track covers the pathway. Asserting coverage from it
  // matched eight juvenile pathways to adult tracks because both say
  // "expungement". The candidate is adjudicated against the route record's
  // statute, stage and outcomeMode, and the track's controlling authority, in
  // scripts/generate-pathway-bridge-adjudication.mjs.
  return {
    classification: "APPROVED_TRACK_CANDIDATE_FOUND_ADJUDICATION_REQUIRED",
    reason: `The memo track ${best.track.trackId} is the closest lexical candidate (score ${best.score.toFixed(2)}) and has design status ${best.track.status}. A name overlap is not coverage.`,
    action: `Adjudicate ${row.jurisdiction}:${row.pathway} against ${best.track.trackId} in data/rcap-ledger/pathway-bridge-adjudication.json before binding anything.`
  };
}

// ---------------------------------------------------------------------------
// 3. All 89 legal_research_required tracks, against later authority.
// ---------------------------------------------------------------------------

const adoptionByTrack = new Map((trackAdoption?.tracks ?? []).map((t) => [t.trackId, t]));
const terminalByTrack = new Map((terminalization?.tracks ?? []).filter((t) => t.trackId).map((t) => [t.trackId, t]));
const registryTrackIds = new Set(
  Array.isArray(trackRegistry?.tracks) ? trackRegistry.tracks.map((t) => t.trackId ?? t.id).filter(Boolean) : []
);

const researchTracks = memoTracks.filter((t) => t.status === "legal_research_required");

const researchClassified = researchTracks.map((track) => {
  const adoption = adoptionByTrack.get(track.trackId) ?? null;
  const terminal = terminalByTrack.get(track.trackId) ?? null;
  const sourceQuestions = track.questions.filter((q) => q.provenance?.classificationBasis === "explicit_state_addendum").length;
  const counselQuestions = track.questions.filter((q) => ["counsel_confirmation_required", "batch_decision_matrix"].includes(q.provenance?.classificationBasis)).length;
  const mechanicalQuestions = track.questions.filter((q) => q.provenance?.classificationBasis === "mechanical_translation").length;
  const inRegistry = registryTrackIds.has(track.trackId);

  const result = classifyResearchTrack({ track, adoption, terminal, sourceQuestions, counselQuestions, mechanicalQuestions, inRegistry });
  return {
    jurisdiction: track.jurisdiction,
    trackId: track.trackId,
    legalName: track.legalName,
    memoPath: track.memoPath,
    reviewedAsOf: track.reviewedAsOf,
    destination: track.destination,
    releaseBlockingQuestions: track.questions.length,
    sourceQuestions,
    counselQuestions,
    mechanicalQuestions,
    laterAdoptionClassification: adoption?.classification ?? null,
    laterAdoptionRequiresReview: adoption ? Boolean(adoption.newSubstantiveReviewRequired) : null,
    inApprovedRegistry: inRegistry,
    terminalLane: terminal?.lane ?? terminal?.laneAssignment ?? null,
    classification: result.classification,
    reason: result.reason,
    serviceDisposition: result.serviceDisposition
  };
});

function classifyResearchTrack(ctx) {
  const { track, adoption, sourceQuestions, counselQuestions, mechanicalQuestions } = ctx;

  // Later authority that explicitly says no new substantive review is needed
  // supersedes the memo's own research flag.
  if (adoption && adoption.newSubstantiveReviewRequired === false
    && (adoption.classification === "standing_adoption_applies" || adoption.classification === "layout_only_continuity_applies")) {
    return {
      classification: "RESOLVED_BY_LATER_AUTHORITY",
      reason: `The track-adoption register classifies ${track.trackId} as ${adoption.classification} and records newSubstantiveReviewRequired=false, which post-dates the memo.`,
      serviceDisposition: "Adopted design; service disposition follows the adopted route."
    };
  }

  if (adoption && adoption.newSubstantiveReviewRequired === true) {
    return {
      classification: "TRUE_LEGAL_RESEARCH_STILL_REQUIRED",
      reason: "Later authority agrees the track needs new substantive review.",
      serviceDisposition: "Guidance or handoff until the research lands. No packet is offered."
    };
  }

  // A track whose open questions are all sourcing cannot be researched until the
  // official source is in hand.
  if (sourceQuestions > 0 && counselQuestions === 0) {
    return {
      classification: "SOURCE_ACQUISITION_REQUIRED_FIRST",
      reason: `All ${sourceQuestions} release-blocking question(s) name an official source that has not been acquired.`,
      serviceDisposition: "Process guidance from the statute already cited in the memo, with no packet, until the source is acquired."
    };
  }

  if (counselQuestions > 0) {
    return {
      classification: "PRODUCT_DECISION_REQUIRED",
      reason: `${counselQuestions} release-blocking question(s) ask counsel to approve a product treatment rather than to research law.`,
      serviceDisposition: "Guidance or referral until the product decision is made."
    };
  }

  if (mechanicalQuestions > 0 && sourceQuestions === 0 && counselQuestions === 0) {
    return {
      classification: "ENGINEERING_MISCLASSIFICATION",
      reason: `All ${mechanicalQuestions} release-blocking question(s) are mechanical translation, which is engineering work recorded under a legal flag.`,
      serviceDisposition: "Existing route disposition stands."
    };
  }

  // No open release-blocking question at all. Whether that means resolved
  // depends on what the memo says about the route's destination, not on the
  // silence of the question list.
  if (track.questions.length === 0) {
    if (track.destinationUnresolved) {
      return {
        classification: "TRUE_LEGAL_RESEARCH_STILL_REQUIRED",
        reason: track.notRegisteredAtRuntime
          ? "The memo records the destination as unresolved and the track as not registered at runtime. Counsel named no approved form, pleading or guidance strategy."
          : "The memo records the route's destination or governing mechanism as unresolved, so the design is not complete even though no question is itemised.",
        serviceDisposition: "No participant-facing route yet. Serve an explicit unsupported-scope outcome until the design resolves."
      };
    }
    return {
      classification: "GUIDANCE_OR_HANDOFF_APPROVED",
      reason: "The memo records legal_research_required but leaves no release-blocking question open and states a resolved destination. The route is served as guidance or handoff and needs no packet decision.",
      serviceDisposition: "Guidance or attorney handoff, complete as a service outcome."
    };
  }

  return {
    classification: "TRUE_LEGAL_RESEARCH_STILL_REQUIRED",
    reason: "The memo records legal_research_required and no later authority resolves it.",
    serviceDisposition: "Guidance or handoff until the research lands. No packet is offered."
  };
}

// ---------------------------------------------------------------------------
// 5. LA-01, validated row by row.
// ---------------------------------------------------------------------------

const la01 = reconciliation.legalAssignments.find((a) => a.classification === "LEGAL_RECONFIRMATION_REQUIRED") ?? null;
const closureByKey = new Map(closure.pathways.map((p) => [p.pathwayKey, p]));
const memoByTrackId = new Map(memoTracks.map((t) => [t.trackId, t]));

const SUBSTANTIVE_TRIGGERS = new Set([
  "changed_statute", "changed_eligibility_rule", "changed_waiting_period_rule",
  "changed_venue", "changed_mandatory_component", "changed_service_or_notice_obligation",
  "changed_legal_effect", "legally_substantive_official_form_change",
  "changed_participant_treatment", "track_never_covered_by_the_adoption"
]);

const la01Rows = (la01?.pathwayKeys ?? []).map((key) => {
  const row = reconciliation.rows.find((r) => r.pathwayKey === key);
  const pathway = closureByKey.get(key);
  const tracks = (row?.trackIds ?? []).map((id) => memoByTrackId.get(id)).filter(Boolean);
  const adoptions = (row?.trackIds ?? []).map((id) => adoptionByTrack.get(id)).filter(Boolean);

  // A substantive trigger has to be nameable from evidence. Age is not one.
  const neverAdopted = (row?.trackIds ?? []).filter((id) => !adoptionByTrack.has(id));
  const counselQuestions = tracks.reduce(
    (a, t) => a + t.questions.filter((q) => ["counsel_confirmation_required", "batch_decision_matrix"].includes(q.provenance?.classificationBasis)).length, 0);
  const namedQuestions = tracks.flatMap((t) => t.questions
    .filter((q) => ["counsel_confirmation_required", "batch_decision_matrix"].includes(q.provenance?.classificationBasis))
    .map((q) => ({ trackId: t.trackId, affectedElement: q.affectedElement, question: q.question })));

  let trigger = null;
  let classification = null;
  // A positive trigger only. Absence from the 67-track adoption continuity
  // register is not evidence that the standing adoption never reached a track:
  // that register has a smaller scope than the corpus, and the legal join
  // already reports these rows as approved_by_decision_owner. Treating absence
  // as a trigger would send an administrative linkage problem to counsel.
  if (counselQuestions > 0) {
    trigger = namedQuestions[0]?.affectedElement
      ? `changed_or_undecided_${namedQuestions[0].affectedElement}`
      : "changed_mandatory_component";
    classification = "LEGAL_RECONFIRMATION_REQUIRED";
  } else if (adoptions.some((a) => a.classification === "standing_adoption_applies" || a.classification === "layout_only_continuity_applies")) {
    trigger = null;
    classification = "STANDING_ADOPTION_APPLIES";
  } else if (row?.completedOutputApproval && row.completedOutputApproval !== "owner_approval_pending") {
    // Approved, family bridged, and no named substantive question. What is open
    // is the projection of the approval, which is a generator problem.
    trigger = null;
    classification = "APPROVAL_NOT_LINKED";
  } else {
    trigger = null;
    classification = "STALE_GENERATED_STATUS";
  }

  return {
    pathwayKey: key,
    jurisdiction: row?.jurisdiction ?? null,
    pathway: row?.pathway ?? null,
    trackIds: row?.trackIds ?? [],
    memoPaths: [...new Set(tracks.map((t) => t.memoPath))],
    reviewedAsOf: row?.reviewedAsOf ?? null,
    adoptionClassifications: adoptions.map((a) => a.classification),
    tracksAbsentFromAdoptionContinuityRegister: neverAdopted,
    absenceIsNotATrigger: neverAdopted.length > 0
      ? "The adoption continuity register covers 67 tracks and does not cover this one. That is a scope difference, not evidence of a lapsed ratification."
      : null,
    namedCounselQuestions: namedQuestions,
    substantiveTrigger: trigger,
    triggerIsAllowed: trigger === null ? null : SUBSTANTIVE_TRIGGERS.has(trigger) || trigger.startsWith("changed_or_undecided_"),
    classification,
    ledgerStatement: (pathway?.openBlockers ?? []).find((b) => b.id === "legal_reconfirmation")?.statement ?? null
  };
});

const la01True = la01Rows.filter((r) => r.classification === "LEGAL_RECONFIRMATION_REQUIRED");
const la01Reclassified = la01Rows.filter((r) => r.classification !== "LEGAL_RECONFIRMATION_REQUIRED");

// ---------------------------------------------------------------------------
// 6. LA-02, recorded exactly and not one question wider.
// ---------------------------------------------------------------------------

const la02Track = memoTracks.find((t) => t.trackId === "sc_pti_17_22_150") ?? null;
const la02Row = reconciliation.rows.find((r) => (r.trackIds ?? []).includes("sc_pti_17_22_150")) ?? null;
const la02Question = (la02Track?.questions ?? []).find(
  (q) => q.provenance?.classificationBasis === "counsel_confirmation_required") ?? null;
const la02MemoFile = memoFiles.find((f) => f.path.endsWith("SC.memo.json")) ?? null;

const la02 = la02Track && la02Row && la02Question ? {
  assignmentId: "LA-02",
  jurisdiction: "SC",
  trackId: la02Track.trackId,
  pathwayKey: la02Row.pathwayKey,
  exactUnresolvedCounselQuestion: la02Question.provenance?.counselQuestion ?? la02Question.question,
  fullMemoStatement: la02Question.question,
  affectedElement: la02Question.affectedElement,
  packetFamily: la02Row.packetFamily,
  outputUnderReview: `${la02Track.outputStrategy} produced for ${la02Track.legalName}`,
  memoPath: la02Track.memoPath,
  memoSha256: la02MemoFile?.sha256 ?? null,
  existingAdoptedLegalDesign: `${la02Track.status}, reviewed as of ${la02Track.reviewedAsOf}; EXT-ADOPT-01 adopted the legal design on 2026-08-08.`,
  whyNoExistingApprovalReachesTheOutput:
    "The completed-output approval of 2026-08-19 covers the family rcap-sc-custom-pleading as it stood then. It does not resolve a conflict between two sources of the fee figure, which is what the packet has to quote.",
  exactDecisionRequested:
    "Does the $150 single-incident fee in the Supreme Court expungement guidance survive the 2018 amendment to S.C. Code § 17-22-940(G), which provides that only one $250 fee may be charged where multiple charges from a single incident are combined? Which figure does the packet quote?",
  scopeLimit: "This assignment is exactly this question. It does not reopen the SC legal design, the packet family, or any other South Carolina route."
} : null;

// ---------------------------------------------------------------------------
// 7. The counsel-confirmation questions behind a bridge.
// ---------------------------------------------------------------------------

const DESIGN_LEVEL_ELEMENTS = new Set([
  "governing_mechanism", "eligibility_branch", "waiting_period", "venue",
  "output_strategy", "legal_effect_or_warning", "geographic_scope"
]);
const OUTPUT_LEVEL_ELEMENTS = new Set(["correct_form", "packet_components", "participant_instructions"]);

const deferredRows = reconciliation.rows.filter((r) => r.counselConfirmationQuestions > 0
  && !["TRUE_COMPLETED_OUTPUT_LEGAL_REVIEW_REQUIRED", "LEGAL_RECONFIRMATION_REQUIRED"].includes(r.classification));

const deferredQuestions = [];
for (const row of deferredRows) {
  for (const trackId of row.trackIds) {
    const track = memoByTrackId.get(trackId);
    if (!track) continue;
    for (const question of track.questions) {
      const basis = question.provenance?.classificationBasis;
      if (basis !== "counsel_confirmation_required" && basis !== "batch_decision_matrix") continue;
      const element = question.affectedElement ?? "(unstated)";
      let classification;
      let reason;
      if (DESIGN_LEVEL_ELEMENTS.has(element)) {
        classification = "LEGAL_DESIGN_DECISION_CAN_RUN_NOW";
        reason = `The question concerns ${element}, which is decided from the statute and the memo. It needs neither a rendered packet nor a fresh source.`;
      } else if (OUTPUT_LEVEL_ELEMENTS.has(element)) {
        classification = "COMPLETED_OUTPUT_REQUIRED_BEFORE_COUNSEL";
        reason = `The question concerns ${element}, which counsel can only assess against an actual rendered output.`;
      } else if (element === "filing_process" || element === "notice_or_service") {
        classification = "SOURCE_REQUIRED_BEFORE_COUNSEL";
        reason = `The question concerns ${element}, which depends on the current official filing instructions.`;
      } else {
        classification = "LEGAL_DESIGN_DECISION_CAN_RUN_NOW";
        reason = "The question is answerable from the adopted memo and the cited authority.";
      }
      deferredQuestions.push({
        jurisdiction: row.jurisdiction,
        pathwayKey: row.pathwayKey,
        trackId,
        affectedElement: element,
        question: question.question,
        classification,
        reason
      });
    }
  }
}

const deferredCounts = {};
for (const q of deferredQuestions) deferredCounts[q.classification] = (deferredCounts[q.classification] ?? 0) + 1;

// ---------------------------------------------------------------------------
// 8. Memo import manifest: byte-for-byte identity with the source branch.
// ---------------------------------------------------------------------------

const memoManifest = {
  sourceBranch: "feat/record-clearing-production-integration",
  sourceCommit: "3b6f4c10",
  importedPath: MEMO_DIR,
  readOnly: "This directory is an import, not a second editable source of truth. Corrections belong upstream and are re-imported.",
  files: memoFiles,
  totalBytes: memoFiles.reduce((a, f) => a + f.bytes, 0),
  fileCount: memoFiles.length
};

// ---------------------------------------------------------------------------

const noTrackCounts = {};
for (const row of noTrackClassified) noTrackCounts[row.classification] = (noTrackCounts[row.classification] ?? 0) + 1;
const researchCounts = {};
for (const track of researchClassified) researchCounts[track.classification] = (researchCounts[track.classification] ?? 0) + 1;

const register = {
  schemaVersion: 1,
  generatedBy: "scripts/generate-all51-legal-authority-finalization.mjs",
  createsApproval: false,
  authorityChain: [
    "legal-design memo (data/record-clearing/legal-design-intake)",
    "approved legal track (legal-design-track-registry.json)",
    "runtime pathway (compiled profiles)",
    "packet or process family (legal-design-packet-set-manifests.json)",
    "source and component relationships (legal-design-track-source-relationships.json)",
    "technical artifact (packet proofs)",
    "completed-output approval (rcap-authorization-queue.json)",
    "launch graph (data/rcap-ledger/launch-graph.json)"
  ],
  memoManifest,
  memoCorpus: {
    jurisdictions: memoByJurisdiction.size,
    tracks: memoTracks.length,
    byDesignStatus: memoTracks.reduce((acc, t) => { acc[t.status ?? "unknown"] = (acc[t.status ?? "unknown"] ?? 0) + 1; return acc; }, {})
  },
  releaseQuestions,
  noTrackRows: { total: noTrackClassified.length, counts: noTrackCounts, rows: noTrackClassified },
  legalResearchRequiredTracks: { total: researchClassified.length, counts: researchCounts, tracks: researchClassified },
  la01: {
    submittedRows: la01Rows.length,
    trueReconfirmationRows: la01True.length,
    reclassifiedRows: la01Reclassified.length,
    rows: la01Rows
  },
  la02,
  deferredCounselQuestions: { total: deferredQuestions.length, counts: deferredCounts, questions: deferredQuestions }
};

const serialized = `${JSON.stringify(register, null, 2)}\n`;
const markdown = renderMarkdown(register);

if (CHECK) {
  const problems = [];
  if (releaseQuestions.total !== releaseQuestions.provenanceSum) problems.push(`release questions ${releaseQuestions.total} != provenance sum ${releaseQuestions.provenanceSum}`);
  if (releaseQuestions.total !== releaseQuestions.ownerSum) problems.push(`release questions ${releaseQuestions.total} != owner sum ${releaseQuestions.ownerSum}`);
  if (releaseQuestions.total !== releaseQuestions.elementSum) problems.push(`release questions ${releaseQuestions.total} != element sum ${releaseQuestions.elementSum}`);
  if (releaseQuestions.unmappedProvenance.length > 0) problems.push(`${releaseQuestions.unmappedProvenance.length} question(s) have a provenance with no owner mapping`);
  // The published denominator was 40. It may move, but only by pathways that
  // are named and accounted for — a denominator that drifts silently is the
  // thing this whole register exists to prevent.
  if (noTrackClassified.length !== NO_TRACK_BASELINE.keys.length - noTrackDeparted.length) {
    problems.push(`no-track rows ${noTrackClassified.length}; baseline ${NO_TRACK_BASELINE.keys.length} less ${noTrackDeparted.length} accounted departure(s) is ${NO_TRACK_BASELINE.keys.length - noTrackDeparted.length}`);
  }
  for (const key of noTrackUnexplained) {
    problems.push(`${key} left the no-track denominator with no recorded reason`);
  }
  for (const key of noTrackArrived) {
    problems.push(`${key} entered the no-track denominator, which the baseline does not carry`);
  }
  if (Object.values(noTrackCounts).reduce((a, b) => a + b, 0) !== noTrackClassified.length) problems.push("no-track classifications do not sum");
  if (researchClassified.length !== 89) problems.push(`legal_research_required tracks ${researchClassified.length}, expected 89`);
  if (Object.values(researchCounts).reduce((a, b) => a + b, 0) !== researchClassified.length) problems.push("research classifications do not sum");
  for (const row of la01Rows) {
    if (row.classification === "LEGAL_RECONFIRMATION_REQUIRED" && !row.substantiveTrigger) {
      problems.push(`${row.pathwayKey} is assigned to counsel with no named substantive trigger`);
    }
  }
  for (const [rel, expected] of [[OUT_JSON, serialized], [OUT_MD, markdown]]) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) problems.push(`${rel} has not been generated`);
    else if (fs.readFileSync(abs, "utf8") !== expected) problems.push(`${rel} is stale; regenerate it`);
  }
  if (problems.length > 0) {
    console.error("All-51 legal authority finalization failed:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(`All-51 legal authority finalization verified: ${releaseQuestions.total} questions reconciled, ${noTrackClassified.length} no-track rows (baseline ${NO_TRACK_BASELINE.keys.length}, ${noTrackDeparted.length} accounted departure(s)), 89 research tracks, LA-01 validated.`);
  process.exit(0);
}

fs.mkdirSync(path.join(root, path.dirname(OUT_JSON)), { recursive: true });
fs.mkdirSync(path.join(root, path.dirname(OUT_MD)), { recursive: true });
fs.writeFileSync(path.join(root, OUT_JSON), serialized);
fs.writeFileSync(path.join(root, OUT_MD), markdown);

console.log(`Wrote ${OUT_JSON} and ${OUT_MD}`);
console.log(`Release questions: ${releaseQuestions.total} = provenance ${releaseQuestions.provenanceSum} = owner ${releaseQuestions.ownerSum} = element ${releaseQuestions.elementSum}`);
console.log(`No-track rows (${noTrackClassified.length}):`);
for (const [k, v] of Object.entries(noTrackCounts)) console.log(`  ${k}: ${v}`);
console.log(`legal_research_required tracks (${researchClassified.length}):`);
for (const [k, v] of Object.entries(researchCounts)) console.log(`  ${k}: ${v}`);
console.log(`LA-01: ${la01True.length} true reconfirmations, ${la01Reclassified.length} reclassified`);
console.log(`Deferred counsel questions (${deferredQuestions.length}):`);
for (const [k, v] of Object.entries(deferredCounts)) console.log(`  ${k}: ${v}`);

function renderMarkdown(data) {
  const lines = [];
  lines.push("# All-51 legal authority reconciliation — finalization");
  lines.push("");
  lines.push("**Generated by** `scripts/generate-all51-legal-authority-finalization.mjs`. Do not edit by hand.");
  lines.push("");
  lines.push("## Authority chain");
  lines.push("");
  lines.push(data.authorityChain.map((step, i) => `${i + 1}. ${step}`).join("\n"));
  lines.push("");
  lines.push(`The memo directory is an import from \`${data.memoManifest.sourceBranch}\` @ \`${data.memoManifest.sourceCommit}\`,`);
  lines.push(`${data.memoManifest.fileCount} files, ${data.memoManifest.totalBytes} bytes, each hashed in the manifest.`);
  lines.push(`${data.memoManifest.readOnly}`);
  lines.push("");
  lines.push("## 4. Release-question denominator");
  lines.push("");
  lines.push(`**Total: ${data.releaseQuestions.total}.** ${data.releaseQuestions.correction}`);
  lines.push("");
  lines.push("| Provenance | Questions | Owner |");
  lines.push("|---|---:|---|");
  for (const [k, v] of Object.entries(data.releaseQuestions.byProvenance).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${k} | ${v} | ${QUESTION_OWNER[k] ?? "(unmapped)"} |`);
  }
  lines.push(`| **SUM** | **${data.releaseQuestions.provenanceSum}** | |`);
  lines.push("");
  lines.push("| Owner | Questions |");
  lines.push("|---|---:|");
  for (const [k, v] of Object.entries(data.releaseQuestions.byOwner).sort((a, b) => b[1] - a[1])) lines.push(`| ${k} | ${v} |`);
  lines.push(`| **SUM** | **${data.releaseQuestions.ownerSum}** |`);
  lines.push("");
  lines.push(`## 2. The ${data.noTrackRows.rows.length} rows that reach no registry track`);
  lines.push("");
  lines.push("| Classification | Rows |");
  lines.push("|---|---:|");
  for (const [k, v] of Object.entries(data.noTrackRows.counts).sort((a, b) => b[1] - a[1])) lines.push(`| ${k} | ${v} |`);
  lines.push(`| **TOTAL** | **${data.noTrackRows.total}** |`);
  lines.push("");
  lines.push("| Jurisdiction | Pathway | Candidate track | Design status | Classification |");
  lines.push("|---|---|---|---|---|");
  for (const row of data.noTrackRows.rows) {
    lines.push(`| ${row.jurisdiction} | \`${row.pathway}\` | ${row.candidateTrackId ?? "—"} | ${row.candidateDesignStatus ?? "—"} | ${row.classification} |`);
  }
  lines.push("");
  lines.push("## 3. All 89 legal_research_required tracks");
  lines.push("");
  lines.push("| Classification | Tracks |");
  lines.push("|---|---:|");
  for (const [k, v] of Object.entries(data.legalResearchRequiredTracks.counts).sort((a, b) => b[1] - a[1])) lines.push(`| ${k} | ${v} |`);
  lines.push(`| **TOTAL** | **${data.legalResearchRequiredTracks.total}** |`);
  lines.push("");
  lines.push("| Jurisdiction | Track | Classification | Service disposition |");
  lines.push("|---|---|---|---|");
  for (const track of data.legalResearchRequiredTracks.tracks) {
    lines.push(`| ${track.jurisdiction} | \`${track.trackId}\` | ${track.classification} | ${track.serviceDisposition} |`);
  }
  lines.push("");
  lines.push("## 5. LA-01, validated row by row");
  lines.push("");
  lines.push(`Submitted: ${data.la01.submittedRows}. True reconfirmations: ${data.la01.trueReconfirmationRows}. Reclassified: ${data.la01.reclassifiedRows}.`);
  lines.push("");
  lines.push("| Pathway | Track | Substantive trigger | Classification |");
  lines.push("|---|---|---|---|");
  for (const row of data.la01.rows) {
    lines.push(`| \`${row.pathwayKey}\` | ${row.trackIds.join(", ")} | ${row.substantiveTrigger ?? "none found"} | ${row.classification} |`);
  }
  lines.push("");
  if (data.la02) {
    lines.push("## 6. LA-02, exactly");
    lines.push("");
    lines.push(`- **Jurisdiction / track:** ${data.la02.jurisdiction} \`${data.la02.trackId}\``);
    lines.push(`- **Pathway:** \`${data.la02.pathwayKey}\``);
    lines.push(`- **Packet family:** ${data.la02.packetFamily.join(", ")}`);
    lines.push(`- **Output under review:** ${data.la02.outputUnderReview}`);
    lines.push(`- **Memo:** \`${data.la02.memoPath}\` · sha256 \`${data.la02.memoSha256}\``);
    lines.push(`- **Existing adopted legal design:** ${data.la02.existingAdoptedLegalDesign}`);
    lines.push(`- **Why no existing approval reaches it:** ${data.la02.whyNoExistingApprovalReachesTheOutput}`);
    lines.push(`- **Exact decision requested:** ${data.la02.exactDecisionRequested}`);
    lines.push(`- **Scope limit:** ${data.la02.scopeLimit}`);
    lines.push("");
  }
  lines.push("## 7. Counsel-confirmation questions behind a bridge");
  lines.push("");
  lines.push("| Classification | Questions |");
  lines.push("|---|---:|");
  for (const [k, v] of Object.entries(data.deferredCounselQuestions.counts).sort((a, b) => b[1] - a[1])) lines.push(`| ${k} | ${v} |`);
  lines.push(`| **TOTAL** | **${data.deferredCounselQuestions.total}** |`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}
