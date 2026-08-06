// Contract tests for the legal-design intake pipeline.
//
// Proves the machinery before any real memo arrives: that a complete memo
// imports, that an incomplete one is refused rather than filled in, that
// attorney metadata is rejected outright, and that counsel approving a legal
// design never produces a runnable track.
//
// It also proves the product model. LegalEase asks questions, generates the
// packet, and lists what the participant must obtain, complete, sign, notarize,
// pay and serve before filing. So the checks below insist that a certified
// disposition is a packet instruction rather than a generation gate, that no
// participant action changes a track's runtime status, and that no status
// claiming knowledge of a filed document exists.

import { register, createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

register("./lib/ts-esm-loader.mjs", import.meta.url);

const { validateLegalDesignMemo } = await import("@/lib/rcap/legal-design/validate");
const {
  sourceRelationships,
  normalizeMemo,
  legalStatusFor,
  queueFor,
  splitRequirements,
  splitUnresolvedQuestions,
  participantActionsFor,
  isGuidanceRereviewCandidate,
  readinessCeilingFor,
  strategyForSelectedUnit
} = await import("@/lib/rcap/legal-design/normalize");
const { computeRuntimeStatus, RUNTIME_STATUSES, FORBIDDEN_RUNTIME_STATUSES } = await import(
  "@/lib/rcap/packets/types"
);
const {
  REQUIRED_TRACK_FIELDS,
  FORBIDDEN_MEMO_KEYS,
  FORBIDDEN_FULFILLMENT_KEYS,
  LIMITATION_CLASSIFICATIONS,
  AFFECTED_ELEMENTS,
  UNRESOLVED_QUESTION_IMPACTS,
  GUIDANCE_RATIONALES,
  REREVIEWABLE_GUIDANCE_RATIONALES,
  PRESERVED_GUIDANCE_RATIONALES,
  GUIDANCE_REREVIEW_QUESTION
} = await import("@/lib/rcap/legal-design/types");

let checks = 0;
const check = (name, fn) => {
  fn();
  checks += 1;
};

function validTrack(overrides = {}) {
  return {
    trackId: "example-nonconviction",
    legalName: "Petition for Expungement of Non-Conviction Records",
    publicName: "Clear a case that did not end in conviction",
    controllingAuthority: { citations: ["Ex. Code § 1-2-3"], summary: "The court shall expunge on petition." },
    effectiveDates: { effectiveFrom: "2019-07-01", effectiveTo: null, reviewedAsOf: "2026-07-30" },
    eligibleRecordTypes: ["arrest"],
    eligibleDispositions: ["dismissed"],
    exclusions: [],
    waitingPeriods: [{ condition: "Dismissed without prejudice", duration: "1 year" }],
    outputStrategy: "official_pdf_fill",
    geography: { scope: "statewide", keys: [], venue: "Trial court where filed." },
    destination: { kind: "clerk", name: "Clerk of court", detail: "File in the originating county." },
    components: [
      {
        role: "primary_filing",
        requirement: "required",
        outputStrategy: "official_pdf_fill",
        officialFormId: "EX-100",
        officialSourceUrl: "https://courts.example.gov/EX-100.pdf"
      }
    ],
    participantInputs: [
      { key: "disposition", question: "How did the case end?", requirement: "required" },
      { key: "dispositionDate", question: "On what date did it end?", requirement: "required" }
    ],
    supportingDocuments: [
      {
        name: "Certified disposition",
        obtainedFrom: "Clerk of the trial court",
        requirement: "required",
        requiredBeforeFiling: true,
        howToObtain: "Ask the clerk of the court where the case was filed for a certified copy of the disposition.",
        confirms: "disposition"
      }
    ],
    manualCompletionItems: [
      { item: "Signature and date", whereInPacket: "Petition, final page", why: "The court requires a wet signature." }
    ],
    officialSources: [
      {
        title: "EX-100",
        url: "https://courts.example.gov/EX-100.pdf",
        retrievedOn: "2026-07-28",
        sha256: "a".repeat(64)
      }
    ],
    rules: {
      filing: "File with the clerk.",
      fees: "none",
      feeWaiver: "none",
      notice: "Prosecutor notice.",
      service: "By mail.",
      participantSignature: "The petitioner signs the petition.",
      notarization: "none"
    },
    selfHelpStopConditions: ["The prosecutor objects."],
    unresolvedQuestions: [],
    legalDesignDecision: { status: "legal_design_approved", rationale: "Settled pathway.", limitations: [] },
    ...overrides
  };
}

/**
 * Stamps fixture provenance onto anything that did not bring its own.
 *
 * Every limitation and every unresolved question must record where its
 * classification came from. Repeating that block in forty fixtures would bury
 * what each check is actually testing, so fixtures may omit it and a check that
 * cares about provenance supplies its own.
 */
const FIXTURE_PROVENANCE = {
  classificationBasis: "mechanical_translation",
  sourceFile: "fixture.md",
  sourceHeading: "fixture",
  sourceStatement: "fixture statement",
  normalizerInferred: true
};

function withProvenance(track) {
  const decision = track.legalDesignDecision;
  if (decision && Array.isArray(decision.limitations)) {
    decision.limitations = decision.limitations.map((limitation) =>
      limitation && typeof limitation === "object" && !Array.isArray(limitation) && !limitation.provenance
        ? { ...limitation, provenance: { ...FIXTURE_PROVENANCE } }
        : limitation
    );
  }
  if (Array.isArray(track.unresolvedQuestions)) {
    track.unresolvedQuestions = track.unresolvedQuestions.map((question) =>
      question && typeof question === "object" && !Array.isArray(question) && !question.provenance
        ? { ...question, provenance: { ...FIXTURE_PROVENANCE } }
        : question
    );
  }
  return track;
}

function validMemo(trackOverrides = {}, memoOverrides = {}) {
  return {
    schemaVersion: 1,
    jurisdiction: "IA",
    memoVersion: "1.0.0",
    submittedAt: "2026-07-30T00:00:00.000Z",
    tracks: [withProvenance(validTrack(trackOverrides))],
    ...memoOverrides
  };
}

// --- acceptance -------------------------------------------------------------

check("a complete memo validates", () => {
  const result = validateLegalDesignMemo(validMemo());
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.equal(result.jurisdiction, "IA");
  assert.deepEqual([...result.importableTrackIds], ["example-nonconviction"]);
});

check("the eighteen required fields are all enforced", () => {
  // Each mutation removes one required thing; every one must be rejected.
  const mutations = {
    "stable track ID": { trackId: "" },
    "legal and public name": { publicName: "" },
    "controlling authority": { controllingAuthority: { citations: [], summary: "" } },
    "effective dates": { effectiveDates: { effectiveFrom: "nope", effectiveTo: null, reviewedAsOf: "2026-07-30" } },
    "eligible record and disposition types": { eligibleDispositions: [] },
    "exclusions and waiting periods": { waitingPeriods: undefined },
    "output strategy": { outputStrategy: "improvise" },
    "geography and venue": { geography: { scope: "statewide", keys: [], venue: "" } },
    "filing or process destination": { destination: { kind: "clerk", name: "", detail: "x" } },
    "packet or process components": { components: [] },
    "questions LegalEase asks": { participantInputs: undefined },
    "documents the participant attaches": { supportingDocuments: undefined },
    "items completed by hand": { manualCompletionItems: undefined },
    "official sources": { officialSources: [] },
    "filing, fee, notice, service, signature and notarization rules": {
      rules: { filing: "x", fees: "x", feeWaiver: "x", notice: "x", service: "x", participantSignature: "x" }
    },
    "self-help stop conditions": { selfHelpStopConditions: [] },
    "unresolved questions": { unresolvedQuestions: undefined },
    "legal-design decision": { legalDesignDecision: { status: "vibes", rationale: "", limitations: [] } }
  };
  assert.equal(
    Object.keys(mutations).length,
    REQUIRED_TRACK_FIELDS.length,
    "one mutation per required field"
  );
  for (const [label, override] of Object.entries(mutations)) {
    const result = validateLegalDesignMemo(validMemo(override));
    assert.equal(result.ok, false, `${label} was accepted while missing or invalid`);
    assert.equal(result.importableTrackIds.length, 0, `${label} produced an importable track`);
  }
});

check("an empty list and an absent field are distinguished", () => {
  // [] means "counsel says there are none" and is accepted.
  assert.equal(validateLegalDesignMemo(validMemo({ exclusions: [] })).ok, true);
  // Absent means "nobody said", and is refused rather than guessed.
  assert.equal(validateLegalDesignMemo(validMemo({ exclusions: undefined })).ok, false);
});

check("a geographically narrow track must name the places it serves", () => {
  const narrow = validateLegalDesignMemo(
    validMemo({ geography: { scope: "county", keys: [], venue: "County court" } })
  );
  assert.equal(narrow.ok, false, "a county-scoped track with no keys cannot fail closed");

  const named = validateLegalDesignMemo(
    validMemo({ geography: { scope: "county", keys: ["polk"], venue: "County court" } })
  );
  assert.equal(named.ok, true, JSON.stringify(named.issues));
});

check("approval with limitations must name the limitations", () => {
  const unnamed = validateLegalDesignMemo(
    validMemo({
      legalDesignDecision: { status: "legal_design_approved_with_limitations", rationale: "x", limitations: [] }
    })
  );
  assert.equal(unnamed.ok, false);
});

// --- the self-help product model -------------------------------------------

check("every limitation must say what kind of thing it is", () => {
  // Eight after the Batch 1 amendment added required_before_filing and
  // post_generation_handoff to the six the product correction named.
  assert.equal(LIMITATION_CLASSIFICATIONS.length, 8);
  for (const expected of ["required_before_filing", "post_generation_handoff"]) {
    assert.ok(LIMITATION_CLASSIFICATIONS.includes(expected), `${expected} missing`);
  }

  // A bare string reads, in practice, as "do not generate". Refused.
  const bare = validateLegalDesignMemo(
    validMemo({
      legalDesignDecision: {
        status: "legal_design_approved_with_limitations",
        rationale: "x",
        limitations: ["Require the certified disposition before generating."]
      }
    })
  );
  assert.equal(bare.ok, false, "an unclassified limitation was accepted");

  const classified = validateLegalDesignMemo(
    validMemo({
      legalDesignDecision: {
        status: "legal_design_approved_with_limitations",
        rationale: "x",
        limitations: [
          {
            classification: "packet_instruction",
            statement: "Tell the participant to attach a certified disposition from the clerk."
          }
        ]
      }
    })
  );
  assert.equal(classified.ok, true, JSON.stringify(classified.issues));
});

check("a legal-design blocker must name the element counsel could not determine", () => {
  const vague = validateLegalDesignMemo(
    validMemo({
      legalDesignDecision: {
        status: "legal_design_approved_with_limitations",
        rationale: "x",
        limitations: [{ classification: "legal_design_blocker", statement: "We need the certified disposition." }]
      }
    })
  );
  assert.equal(vague.ok, false, "a blocker with no undetermined element was accepted");

  const real = validateLegalDesignMemo(
    validMemo({
      legalDesignDecision: {
        status: "legal_design_approved_with_limitations",
        rationale: "x",
        limitations: [
          {
            classification: "legal_design_blocker",
            statement: "Counsel has not identified which statewide form governs.",
            undeterminedElement: "correct_form"
          }
        ]
      }
    })
  );
  assert.equal(real.ok, true, JSON.stringify(real.issues));
});

check("a memo assuming uploads, review or staff approval is rejected", () => {
  assert.ok(FORBIDDEN_FULFILLMENT_KEYS.includes("documentUpload"));
  assert.equal(validateLegalDesignMemo(validMemo({ requiredUploads: ["certified disposition"] })).ok, false);
  assert.equal(validateLegalDesignMemo(validMemo({}, { staffApproval: "required" })).ok, false);
  assert.equal(validateLegalDesignMemo(validMemo({ eligibilityDetermination: "LegalEase decides" })).ok, false);
});

check("a document the participant obtains is never a generation blocker", () => {
  const track = normalizeMemo(validMemo()).tracks[0];

  // It is recorded as a filing requirement...
  assert.equal(track.participantFilingRequirements.length, 1);
  assert.equal(track.participantFilingRequirements[0].name, "Certified disposition");

  // ...it appears as something the participant does before filing...
  const obtain = track.packetSet.participantActionRequired.filter((action) => action.kind === "obtain_document");
  assert.equal(obtain.length, 1);
  assert.ok(track.packetSet.requiredBeforeFiling.some((entry) => /certified disposition/i.test(entry)));

  // ...and it is nowhere in the blockers.
  const blockerText = track.blockers.map((blocker) => blocker.statement).join(" | ");
  assert.doesNotMatch(blockerText, /certified disposition/i, "a participant document became a blocker");
  assert.equal(track.legalDesignBlockers.length, 0, "a participant document became a legal-design blocker");
});

check("limitations route to the five kinds rather than all becoming blockers", () => {
  const split = splitRequirements(
    withProvenance(validTrack({
      legalDesignDecision: {
        status: "legal_design_approved_with_limitations",
        rationale: "x",
        limitations: [
          { classification: "packet_instruction", statement: "Attach a certified disposition." },
          { classification: "participant_question", statement: "Ask whether the case was deferred." },
          { classification: "scope_restriction", statement: "Do not offer for deferred dispositions." },
          { classification: "manual_completion_item", statement: "Case number is written in by hand." },
          { classification: "self_help_boundary", statement: "Stop if the prosecutor objects." },
          {
            classification: "legal_design_blocker",
            statement: "Venue for out-of-county arrests is unsettled.",
            undeterminedElement: "venue"
          }
        ]
      }
    }))
  );

  assert.deepEqual(split.packetInstructions, ["Attach a certified disposition."]);
  assert.deepEqual(split.participantQuestions, ["Ask whether the case was deferred."]);
  assert.deepEqual(split.scopeRestrictions, ["Do not offer for deferred dispositions."]);
  assert.deepEqual(split.manualCompletionStatements, ["Case number is written in by hand."]);
  assert.deepEqual(split.selfHelpBoundaries, ["Stop if the prosecutor objects."]);
  assert.equal(split.legalDesignBlockers.length, 1);
  assert.match(split.legalDesignBlockers[0], /venue/);
});

check("only a legal-design blocker among the six classifications blocks", () => {
  const nonBlocking = LIMITATION_CLASSIFICATIONS.filter((classification) => classification !== "legal_design_blocker");
  for (const classification of nonBlocking) {
    const track = normalizeMemo(
      validMemo({
        legalDesignDecision: {
          status: "legal_design_approved_with_limitations",
          rationale: "x",
          limitations: [{ classification, statement: "Counsel said something about this track." }]
        }
      })
    ).tracks[0];
    assert.equal(
      track.legalDesignBlockers.length,
      0,
      `${classification} produced a legal-design blocker`
    );
  }
});

check("counsel's undetermined design elements are preserved as blockers", () => {
  const track = normalizeMemo(
    validMemo({
      legalDesignDecision: {
        status: "legal_design_approved_with_limitations",
        rationale: "x",
        limitations: [
          {
            classification: "legal_design_blocker",
            statement: "Counsel has not identified the governing mechanism.",
            undeterminedElement: "governing_mechanism"
          }
        ]
      }
    })
  ).tracks[0];
  assert.equal(track.legalDesignBlockers.length, 1);
  assert.match(track.legalDesignBlockers[0], /governing_mechanism/);
});

check("a component that fills an unnamed official form is still a blocker", () => {
  const track = normalizeMemo(
    validMemo({
      components: [{ role: "primary_filing", requirement: "required", outputStrategy: "official_pdf_fill" }]
    })
  ).tracks[0];
  assert.equal(track.legalDesignBlockers.length, 1, "an unnamed official form stopped being a blocker");
  assert.match(track.legalDesignBlockers[0], /names no official form/);
});

check("participant actions never move the runtime status", () => {
  const track = normalizeMemo(validMemo()).tracks[0];
  assert.ok(track.packetSet.requiredBeforeFiling.length > 0, "fixture has outstanding participant actions");

  // Same gate state, whether or not the participant has done anything.
  const ready = computeRuntimeStatus({
    statuses: {
      research: "research_draft_complete",
      technical: "technical_proof_passed",
      visual: "visual_review_passed",
      legal: "legal_approved"
    },
    sourceCurrent: true,
    runtimeDisabled: false,
    outputStrategy: track.outputStrategy
  });
  assert.equal(
    ready,
    "packet_ready",
    "a track with outstanding participant filing requirements could not reach packet_ready"
  );
});

check("there is no platform status claiming to know about a filed document", () => {
  for (const forbidden of FORBIDDEN_RUNTIME_STATUSES) {
    assert.ok(
      !RUNTIME_STATUSES.includes(forbidden),
      `${forbidden} is a runtime status; LegalEase does not inspect the participant's assembled filing`
    );
  }
  assert.ok(FORBIDDEN_RUNTIME_STATUSES.includes("filing_complete"));
});

// --- unresolved questions carry an impact ----------------------------------

check("an unresolved question must say what it costs", () => {
  // Four: the three costs plus the fail-closed value used when the controlling
  // materials do not say which of the three applies.
  assert.equal(UNRESOLVED_QUESTION_IMPACTS.length, 4);

  // Prose alone would leave the question with no owner and no gate.
  const bare = validateLegalDesignMemo(
    validMemo({ unresolvedQuestions: ["Does the waiting period run from dismissal or discharge?"] })
  );
  assert.equal(bare.ok, false, "a bare-string unresolved question was accepted");

  const typed = validateLegalDesignMemo(
    validMemo({
      unresolvedQuestions: [
        {
          question: "Does the waiting period run from dismissal or discharge?",
          impact: "release_blocker",
          affectedElement: "waiting_period"
        }
      ]
    })
  );
  assert.equal(typed.ok, true, JSON.stringify(typed.issues));
});

check("the affected-element vocabulary covers all twelve elements", () => {
  assert.equal(AFFECTED_ELEMENTS.length, 12);
  for (const element of [
    "governing_mechanism",
    "correct_form",
    "output_strategy",
    "venue",
    "geographic_scope",
    "eligibility_branch",
    "waiting_period",
    "packet_components",
    "filing_process",
    "notice_or_service",
    "participant_instructions",
    "legal_effect_or_warning"
  ]) {
    assert.ok(AFFECTED_ELEMENTS.includes(element), `${element} is missing from the vocabulary`);
  }
});

check("open questions route by impact and none of them disappears", () => {
  const questions = [
    { question: "Which statute governs?", impact: "build_blocker", affectedElement: "governing_mechanism" },
    { question: "Does the wait run from dismissal?", impact: "release_blocker", affectedElement: "waiting_period" },
    { question: "Is there a second notice rule?", impact: "nonblocking_research_note", affectedElement: "notice_or_service" }
  ];
  const split = splitUnresolvedQuestions(validTrack({ unresolvedQuestions: questions }));
  assert.equal(split.buildBlockers.length, 1);
  assert.equal(split.releaseBlockers.length, 1);
  assert.equal(split.researchNotes.length, 1);

  const track = normalizeMemo(validMemo({ unresolvedQuestions: questions })).tracks[0];
  assert.equal(track.buildBlockers.length, 1);
  assert.equal(track.releaseBlockers.length, 1);
  assert.equal(track.openLegalQuestions.length, 1);
  // All three survive on the track, whatever their impact.
  assert.equal(track.unresolvedQuestions.length, 3);
});

check("a build blocker is recorded as a legal-design blocker", () => {
  const track = normalizeMemo(
    validMemo({
      unresolvedQuestions: [
        { question: "Which statute governs?", impact: "build_blocker", affectedElement: "governing_mechanism" }
      ]
    })
  ).tracks[0];
  assert.equal(track.legalDesignBlockers.length, 1);
  assert.match(track.legalDesignBlockers[0], /blocks the build/);
});

check("a release blocker permits the build and forbids packet_ready", () => {
  const blocked = normalizeMemo(
    validMemo({
      unresolvedQuestions: [
        { question: "Does the wait run from dismissal?", impact: "release_blocker", affectedElement: "waiting_period" }
      ]
    })
  ).tracks[0];

  // Engineering is not stopped: it is not a design blocker.
  assert.equal(blocked.legalDesignBlockers.length, 0, "a release blocker stopped the build");
  assert.equal(blocked.releaseBlockers.length, 1);
  assert.ok(blocked.blockers.some((entry) => entry.kind === "release_blocker"));

  // Shipping is stopped, with every other gate green.
  assert.equal(readinessCeilingFor(blocked), "runtime_disabled", "an open release blocker still reached readiness");

  // The same track without the question does reach packet_ready.
  const clear = normalizeMemo(validMemo()).tracks[0];
  assert.equal(readinessCeilingFor(clear), "packet_ready");
});

check("a nonblocking research note stops neither the build nor the release", () => {
  const track = normalizeMemo(
    validMemo({
      unresolvedQuestions: [
        { question: "Is there a second notice rule?", impact: "nonblocking_research_note", affectedElement: "notice_or_service" }
      ]
    })
  ).tracks[0];
  assert.equal(track.legalDesignBlockers.length, 0);
  assert.equal(track.releaseBlockers.length, 0);
  assert.equal(track.openLegalQuestions.length, 1, "the note was dropped instead of tracked");
  assert.equal(readinessCeilingFor(track), "packet_ready");
});

// --- the participant confirms their own answer -----------------------------

check("a record that corroborates an answer produces a confirmation step", () => {
  const track = normalizeMemo(validMemo()).tracks[0];
  const confirm = track.packetSet.participantActionRequired.filter((action) => action.kind === "confirm_answer");
  assert.equal(confirm.length, 1, "no confirmation step was produced");
  assert.match(confirm[0].description, /How did the case end\?/);
  assert.match(confirm[0].description, /Certified disposition/);
  // We ask them to check their own answer. We never check it.
  assert.equal(confirm[0].requiredBeforeFiling, true);
  assert.equal(track.legalDesignBlockers.length, 0);
});

check("a confirmation must point at a question we actually ask", () => {
  const dangling = validateLegalDesignMemo(
    validMemo({
      supportingDocuments: [
        {
          name: "Certified disposition",
          obtainedFrom: "Clerk",
          requirement: "required",
          requiredBeforeFiling: true,
          howToObtain: "Ask the clerk.",
          confirms: "notAQuestionWeAsk"
        }
      ]
    })
  );
  assert.equal(dangling.ok, false, "a confirmation pointing nowhere was accepted");
});

// --- guidance re-review queue ----------------------------------------------

const guidanceTrack = (rationales) =>
  validTrack({
    outputStrategy: "process_guidance",
    guidanceRationales: rationales,
    components: [{ role: "process_guidance", requirement: "required", outputStrategy: "process_guidance" }]
  });

check("a guidance track must say why it is guidance", () => {
  assert.equal(GUIDANCE_RATIONALES.length, 9);
  assert.equal(REREVIEWABLE_GUIDANCE_RATIONALES.length, 5);
  assert.equal(PRESERVED_GUIDANCE_RATIONALES.length, 4);

  const silent = validateLegalDesignMemo(
    validMemo({
      outputStrategy: "process_guidance",
      components: [{ role: "process_guidance", requirement: "required", outputStrategy: "process_guidance" }]
    })
  );
  assert.equal(silent.ok, false, "a guidance track with no stated reason was accepted");

  const stated = validateLegalDesignMemo(validMemo(guidanceTrack(["agency_certification"])));
  assert.equal(stated.ok, true, JSON.stringify(stated.issues));

  // A packet track has no business carrying one.
  const misplaced = validateLegalDesignMemo(validMemo({ guidanceRationales: ["agency_certification"] }));
  assert.equal(misplaced.ok, false, "guidanceRationales was accepted on a packet track");
});

check("external-dependency guidance tracks become re-review candidates", () => {
  for (const rationale of REREVIEWABLE_GUIDANCE_RATIONALES) {
    assert.equal(
      isGuidanceRereviewCandidate(guidanceTrack([rationale])),
      true,
      `${rationale} was not flagged for re-review`
    );
  }
  assert.equal(isGuidanceRereviewCandidate(guidanceTrack(["third_party_signature", "agency_certification"])), true);
});

check("guidance is preserved where it is genuinely the right output", () => {
  for (const rationale of PRESERVED_GUIDANCE_RATIONALES) {
    assert.equal(
      isGuidanceRereviewCandidate(guidanceTrack([rationale])),
      false,
      `${rationale} was wrongly queued for re-review`
    );
  }
  // One preserved reason is enough to keep a mixed track off the queue.
  assert.equal(
    isGuidanceRereviewCandidate(guidanceTrack(["agency_certification", "contested_evidentiary_showing"])),
    false
  );
});

check("the re-review queue asks a question and reclassifies nothing", () => {
  assert.match(GUIDANCE_REREVIEW_QUESTION, /^Can LegalEase prepare the participant-facing portion/);
  const track = normalizeMemo(validMemo(guidanceTrack(["participant_obtains_record"]))).tracks[0];
  assert.equal(track.guidanceRereviewCandidate, true);
  // Flagged for a question, not converted.
  assert.equal(track.outputStrategy, "process_guidance", "a queued track was reclassified");
});

check("an operator's reading may not be filed as counsel's conclusion", () => {
  // normalizerInferred records restructuring of something counsel stated. Paired
  // with a basis that asserts counsel decided the point, it would launder a
  // reading into an approval. Refused.
  for (const basis of ["explicit_state_addendum", "batch_decision_matrix", "general_packet_only_rule"]) {
    const laundered = validateLegalDesignMemo(
      validMemo({
        legalDesignDecision: {
          status: "legal_design_approved_with_limitations",
          rationale: "x",
          limitations: [
            {
              classification: "packet_instruction",
              statement: "Something counsel did not say.",
              provenance: {
                classificationBasis: basis,
                sourceFile: "f.md",
                sourceHeading: "h",
                sourceStatement: "s",
                normalizerInferred: true
              }
            }
          ]
        }
      })
    );
    assert.equal(laundered.ok, false, `${basis} accepted normalizerInferred`);
  }

  // An unsupported classification must record the question, not a guess.
  const silent = validateLegalDesignMemo(
    validMemo({
      legalDesignDecision: {
        status: "legal_design_approved_with_limitations",
        rationale: "x",
        limitations: [
          {
            classification: "packet_instruction",
            statement: "Unclear.",
            provenance: {
              classificationBasis: "counsel_confirmation_required",
              sourceFile: "f.md",
              sourceHeading: "h",
              sourceStatement: "s"
            }
          }
        ]
      }
    })
  );
  assert.equal(silent.ok, false, "counsel_confirmation_required accepted with no counselQuestion");
});

check("an unclassified impact withholds release without asserting why", () => {
  const track = normalizeMemo(
    validMemo({
      unresolvedQuestions: [
        {
          question: "Does this change the packet or only the instructions?",
          impact: "counsel_classification_required",
          affectedElement: "packet_components",
          provenance: {
            classificationBasis: "counsel_confirmation_required",
            sourceFile: "f.md",
            sourceHeading: "h",
            sourceStatement: "s",
            counselQuestion: "Is this a build blocker or a release blocker?"
          }
        }
      ]
    })
  ).tracks[0];

  assert.equal(track.awaitingCounselClassification.length, 1);
  assert.equal(track.counselConfirmationRequired, true);
  assert.equal(track.counselQuestions.length, 1);
  // Fails closed on release, but does not claim the build is blocked.
  assert.equal(track.legalDesignBlockers.length, 0, "an unclassified question blocked the build");
  assert.equal(readinessCeilingFor(track), "runtime_disabled");
});

// --- an unresolved output strategy is said by omission ----------------------
//
// A concrete strategy is a substantive conclusion. process_guidance says the
// relief is not a participant filing; custom_pleading says we draft it. Neither
// may stand in for "counsel has not decided", and there is no fourth strategy
// to name, because naming one would make it addressable by the renderer.

check("a deferred legal-research track may omit its output strategy", () => {
  const memo = validMemo({
    outputStrategy: undefined,
    outputStrategyStatus: "unresolved",
    packetIdentity: "unresolved",
    components: [],
    legalDesignDecision: {
      status: "legal_research_required",
      rationale: "Counsel named no approved form, pleading or guidance strategy.",
      limitations: []
    }
  });
  delete memo.tracks[0].outputStrategy;
  const result = validateLegalDesignMemo(memo);
  assert.equal(result.ok, true, JSON.stringify(result.issues));

  const normalized = normalizeMemo(memo);
  assert.equal(normalized.tracks.length, 0, "a deferred track was imported");
  assert.equal(normalized.deferredTracks.length, 1);
  assert.equal(normalized.deferredTracks[0].outputStrategy, null);
  assert.equal(normalized.deferredTracks[0].outputStrategyStatus, "unresolved");
  assert.equal(normalized.deferredTracks[0].packetIdentity, "unresolved");
});

check("a deferred track with no source-authorized strategy cannot carry one", () => {
  // Every concrete strategy is refused alongside an unresolved status.
  for (const strategy of ["process_guidance", "custom_pleading", "official_pdf_fill"]) {
    const result = validateLegalDesignMemo(
      validMemo({
        outputStrategy: strategy,
        outputStrategyStatus: "unresolved",
        packetIdentity: "unresolved",
        components: [],
        legalDesignDecision: { status: "legal_research_required", rationale: "x", limitations: [] }
      })
    );
    assert.equal(result.ok, false, `${strategy} was accepted as a placeholder for unknown`);
  }

  // And an unresolved strategy cannot sit on an importable track: it forces
  // deferral, which is what keeps it out of runtime resolution.
  const importable = validMemo({
    outputStrategyStatus: "unresolved",
    packetIdentity: "unresolved",
    components: [],
    legalDesignDecision: { status: "legal_design_approved", rationale: "x", limitations: [] }
  });
  delete importable.tracks[0].outputStrategy;
  assert.equal(
    validateLegalDesignMemo(importable).ok,
    false,
    "an unresolved strategy was accepted on a non-deferred track"
  );
});

check("a provisional strategy is legal only where a controlling source authorizes it", () => {
  // Idaho's addendum expressly authorised "custom_pleading, legal-design
  // blocked" for ID-3 and ID-4. Without such a statement it is a guess.
  const unauthorised = validateLegalDesignMemo(
    validMemo({
      outputStrategy: "custom_pleading",
      outputStrategyStatus: "provisional",
      legalDesignDecision: {
        status: "legal_design_approved_with_limitations",
        rationale: "x",
        limitations: [
          {
            classification: "packet_instruction",
            statement: "Something the normalizer restructured.",
            provenance: { ...FIXTURE_PROVENANCE }
          }
        ]
      }
    })
  );
  assert.equal(unauthorised.ok, false, "an unauthorised provisional strategy was accepted");

  const authorised = validateLegalDesignMemo(
    validMemo({
      outputStrategy: "custom_pleading",
      outputStrategyStatus: "provisional",
      legalDesignDecision: {
        status: "legal_design_approved_with_limitations",
        rationale: "x",
        limitations: [
          {
            classification: "legal_design_blocker",
            statement: "Accepted filing vehicle unresolved; provisional custom pleading authorised.",
            undeterminedElement: "correct_form",
            provenance: {
              classificationBasis: "explicit_state_addendum",
              sourceFile: "review.md",
              sourceHeading: "Provisional custom-pleading routes",
              sourceStatement: "Amended status: custom_pleading, legal-design blocked pending filing confirmation."
            }
          }
        ]
      }
    })
  );
  assert.equal(authorised.ok, true, JSON.stringify(authorised.issues));
});

check("deferred tracks are absent from runtime resolution and unreachable", () => {
  const memo = validMemo({
    outputStrategyStatus: "unresolved",
    packetIdentity: "unresolved",
    components: [],
    legalDesignDecision: { status: "legal_research_required", rationale: "x", limitations: [] }
  });
  delete memo.tracks[0].outputStrategy;
  const normalized = normalizeMemo(memo);
  const deferred = normalized.deferredTracks[0];

  assert.equal(deferred.runtimeRegistration, "none");
  assert.equal(deferred.runtimeReachable, false);

  // Nothing the resolver reads contains it.
  const ids = normalized.tracks.map((t) => t.trackId);
  assert.ok(!ids.includes(deferred.trackId), "a deferred track reached the imported registry");
  assert.equal(sourceRelationships(normalized).length, 0, "a deferred track produced a source relationship");
});

check("every real Batch 1 deferral omits its strategy unless a source authorized it", () => {
  // Drives the committed corpus, not a fixture: no deferred track may carry a
  // concrete strategy that counsel did not settle.
  const intake = path.join(process.cwd(), "data/record-clearing/legal-design-intake");
  for (const file of fs.readdirSync(intake).filter((n) => /^[A-Z]{2}\.memo\.json$/.test(n))) {
    const memo = JSON.parse(fs.readFileSync(path.join(intake, file), "utf8"));
    for (const track of memo.tracks) {
      if (track.legalDesignDecision.status !== "legal_research_required") continue;
      const status = track.outputStrategyStatus ?? "resolved";
      assert.ok(
        status !== "resolved" || track.outputStrategy === undefined,
        `${memo.jurisdiction}:${track.trackId} is deferred but carries a settled strategy ${track.outputStrategy}`
      );
      if (status === "unresolved") {
        assert.equal(
          track.outputStrategy,
          undefined,
          `${memo.jurisdiction}:${track.trackId} carries a placeholder strategy`
        );
      }
    }
  }
});

// --- composed routes: explicit selection, never first-available -------------
//
// Array order is not legal routing. Which unit of a composed route applies is a
// legal question — the offence date, which statutory branch governs, whether the
// prerequisite event has happened — and the answer is supplied by the caller,
// never inferred from position. Every check below is a fail-closed proof.

/** A composed route whose second unit is the real filing. */
function composedMemo(overrides = {}) {
  return validMemo({
    outputStrategy: "composed",
    outputStrategyStatus: "resolved",
    packetIdentity: "identified",
    compositionMode: "sequential",
    units: [
      {
        unitId: "example-stage-1",
        order: 1,
        label: "Guidance",
        outputStrategy: "process_guidance",
        description: "Explain the prerequisite event.",
        available: true
      },
      {
        unitId: "example-stage-2",
        order: 2,
        label: "Packet",
        outputStrategy: "official_pdf_fill",
        description: "Generate the official pair.",
        available: true
      }
    ],
    ...overrides
  });
}

check("a composed route keeps no track-level renderer strategy", () => {
  const memo = composedMemo();
  const result = validateLegalDesignMemo(memo);
  assert.equal(result.ok, true, JSON.stringify(result.issues));

  const track = normalizeMemo(memo).tracks[0];
  // The declared composition survives as provenance and nothing else.
  assert.equal(track.outputStrategyDeclared, "composed");
  assert.equal(track.compositionMode, "sequential");
  assert.equal(track.units.length, 2);
  // There is no single strategy to state, so none is stated. This is the field
  // that used to carry the first available unit's strategy.
  assert.equal(track.outputStrategy, null, "a composed route invented a track-level strategy");
  // And with no strategy, nothing about it can be ready.
  assert.equal(readinessCeilingFor(track), "runtime_disabled");
});

check("no normalized track anywhere carries a composition marker as a strategy", () => {
  const intake = path.join(process.cwd(), "data/record-clearing/legal-design-intake");
  for (const file of fs.readdirSync(intake).filter((n) => /^[A-Z]{2}\.memo\.json$/.test(n))) {
    const memo = JSON.parse(fs.readFileSync(path.join(intake, file), "utf8"));
    for (const track of normalizeMemo(memo).tracks) {
      assert.ok(
        track.outputStrategy === null ||
          ["custom_pleading", "official_pdf_fill", "process_guidance"].includes(track.outputStrategy),
        `${memo.jurisdiction}:${track.trackId} renders as ${track.outputStrategy}`
      );
      // Every unit that is offered carries one of the three, and every unit that
      // is not offered carries none.
      for (const unit of track.units) {
        if (unit.available) {
          assert.ok(
            ["custom_pleading", "official_pdf_fill", "process_guidance"].includes(unit.outputStrategy),
            `${memo.jurisdiction}:${track.trackId}:${unit.unitId} is available with ${unit.outputStrategy}`
          );
        }
      }
    }
  }
});

// 4. A composed track with no selected unit has no renderer.
check("a composed route with no selected unit yields no renderer strategy", () => {
  const track = composedMemo().tracks[0];
  const selection = strategyForSelectedUnit(track);
  assert.equal(selection.ok, false, "a composed route resolved without a selection");
  assert.equal(selection.reason, "no_unit_selected");
  assert.equal(selection.outputStrategy, undefined, "a strategy leaked from a failed selection");

  // Null and empty string are refusals too, not "unset, so pick one".
  assert.equal(strategyForSelectedUnit(track, null).reason, "no_unit_selected");
  assert.equal(strategyForSelectedUnit(track, "").reason, "no_unit_selected");
});

// 2. Unknown selectedUnitId fails closed.
check("an unknown unit ID fails closed rather than falling back", () => {
  const track = composedMemo().tracks[0];
  const selection = strategyForSelectedUnit(track, "example-stage-99");
  assert.equal(selection.ok, false);
  assert.equal(selection.reason, "unknown_unit");
  assert.equal(selection.outputStrategy, undefined);
});

// 5. An unresolved unit has no renderer.
check("an unresolved unit borrows no strategy from its resolved sibling", () => {
  const memo = composedMemo({
    compositionMode: "alternative",
    units: [
      {
        unitId: "example-automatic",
        order: 1,
        label: "Automatic branch",
        outputStrategy: "process_guidance",
        description: "Relief occurs without a participant filing.",
        available: true
      },
      {
        unitId: "example-petition",
        order: 2,
        label: "Petition branch",
        outputStrategyStatus: "unresolved",
        packetIdentity: "unresolved",
        description: "The accepted filing vehicle is unresolved.",
        available: false,
        unavailableReason: "Counsel has not settled the accepted form."
      }
    ]
  });
  assert.equal(validateLegalDesignMemo(memo).ok, true);
  const track = memo.tracks[0];

  const selection = strategyForSelectedUnit(track, "example-petition");
  assert.equal(selection.ok, false, "an unresolved unit produced a renderer strategy");
  assert.equal(selection.reason, "unresolved_unit");
  assert.equal(selection.outputStrategy, undefined);

  // The resolved sibling still answers for itself, and only for itself.
  assert.deepEqual(strategyForSelectedUnit(track, "example-automatic"), {
    ok: true,
    unitId: "example-automatic",
    outputStrategy: "process_guidance"
  });
});

// 6. Two applicable units produce an error rather than a first-match result.
check("two units answering to one selection is an error, not a first match", () => {
  // The validator refuses duplicate unit IDs at intake.
  const duplicated = composedMemo({
    units: [
      {
        unitId: "example-stage-1",
        order: 1,
        label: "Guidance",
        outputStrategy: "process_guidance",
        description: "Explain.",
        available: true
      },
      {
        unitId: "example-stage-1",
        order: 2,
        label: "Packet",
        outputStrategy: "official_pdf_fill",
        description: "Generate.",
        available: true
      }
    ]
  });
  assert.equal(validateLegalDesignMemo(duplicated).ok, false, "duplicate unit IDs were accepted");

  // And the selector refuses them at runtime, so the guarantee does not rest on
  // validation alone. Both units are available and both carry a real strategy:
  // the old helper would have returned the first one.
  const selection = strategyForSelectedUnit(duplicated.tracks[0], "example-stage-1");
  assert.equal(selection.ok, false, "an ambiguous selection resolved by first match");
  assert.equal(selection.reason, "ambiguous_unit_selection");
  assert.equal(selection.outputStrategy, undefined);
});

check("an unavailable unit produces nothing, however settled its strategy", () => {
  const memo = composedMemo({
    units: [
      {
        unitId: "example-stage-1",
        order: 1,
        label: "Guidance",
        outputStrategy: "process_guidance",
        description: "Explain.",
        available: true
      },
      {
        unitId: "example-stage-2",
        order: 2,
        label: "Packet",
        outputStrategy: "official_pdf_fill",
        description: "Generate.",
        available: false,
        unavailableReason: "A blocker keeps this unit closed."
      }
    ]
  });
  const selection = strategyForSelectedUnit(memo.tracks[0], "example-stage-2");
  assert.equal(selection.ok, false);
  assert.equal(selection.reason, "unavailable_unit");
  assert.equal(selection.outputStrategy, undefined);
});

check("a composed route must declare its mode and units, and a unit may not fake a strategy", () => {
  const noUnits = validateLegalDesignMemo(
    validMemo({
      outputStrategy: "composed",
      outputStrategyStatus: "resolved",
      packetIdentity: "identified",
      compositionMode: "sequential"
    })
  );
  assert.equal(noUnits.ok, false, "a composed route with no units was accepted");

  const noMode = composedMemo();
  delete noMode.tracks[0].compositionMode;
  assert.equal(validateLegalDesignMemo(noMode).ok, false, "a composed route with no mode was accepted");

  // An unresolved unit omits its strategy and cannot be available.
  const faked = validateLegalDesignMemo(
    composedMemo({
      units: [
        {
          unitId: "example-stage-1",
          order: 1,
          label: "Guidance",
          outputStrategy: "process_guidance",
          description: "Explain.",
          available: true
        },
        {
          unitId: "example-stage-2",
          order: 2,
          label: "Unsettled branch",
          outputStrategy: "custom_pleading",
          outputStrategyStatus: "unresolved",
          description: "Vehicle unknown.",
          available: false,
          unavailableReason: "Vehicle unresolved."
        }
      ]
    })
  );
  assert.equal(faked.ok, false, "an unresolved unit kept a concrete strategy");

  // A unit without a stable ID cannot be selected, so it is not a unit.
  const anonymous = composedMemo();
  delete anonymous.tracks[0].units[0].unitId;
  assert.equal(validateLegalDesignMemo(anonymous).ok, false, "a unit with no unitId was accepted");

  // units and compositionMode belong only on a composed route.
  assert.equal(
    validateLegalDesignMemo(
      validMemo({
        units: [
          {
            unitId: "x-1",
            order: 1,
            label: "x",
            outputStrategy: "process_guidance",
            description: "y",
            available: true
          }
        ]
      })
    ).ok,
    false,
    "units was accepted on a single-output route"
  );
  assert.equal(
    validateLegalDesignMemo(validMemo({ compositionMode: "sequential" })).ok,
    false,
    "compositionMode was accepted on a single-output route"
  );
});

check("a single-output track answers for itself and rejects a selection it cannot honour", () => {
  const track = validMemo().tracks[0];
  assert.deepEqual(strategyForSelectedUnit(track), {
    ok: true,
    unitId: null,
    outputStrategy: "official_pdf_fill"
  });
  // A selection against a track with no units is a caller error, not a no-op.
  assert.equal(strategyForSelectedUnit(track, "example-stage-1").reason, "unknown_unit");
});

check("mixed nesting is one level deep and names a real parent", () => {
  const mixed = (units) =>
    validateLegalDesignMemo(composedMemo({ compositionMode: "mixed", units }));

  const branch = {
    unitId: "example-branch-a",
    order: 1,
    label: "Branch A",
    outputStrategy: "process_guidance",
    description: "The branch itself.",
    available: true
  };
  const child = {
    unitId: "example-branch-a-stage-2",
    order: 2,
    label: "Branch A, second step",
    outputStrategy: "official_pdf_fill",
    description: "The filing inside the branch.",
    available: true,
    parentUnitId: "example-branch-a"
  };

  assert.equal(mixed([branch, child]).ok, true, "a valid mixed composition was refused");
  assert.equal(
    mixed([branch, { ...child, parentUnitId: "example-nonexistent" }]).ok,
    false,
    "a parentUnitId naming no unit was accepted"
  );
  assert.equal(
    mixed([branch, { ...child, parentUnitId: child.unitId }]).ok,
    false,
    "a unit was accepted as its own parent"
  );
  assert.equal(
    mixed([
      { ...branch, parentUnitId: "example-branch-a-stage-2" },
      child
    ]).ok,
    false,
    "two levels of nesting were accepted"
  );
  // parentUnitId is meaningless outside a mixed composition.
  assert.equal(
    validateLegalDesignMemo(
      composedMemo({
        compositionMode: "sequential",
        units: [branch, child]
      })
    ).ok,
    false,
    "parentUnitId was accepted on a sequential composition"
  );
});

// --- the Arkansas composed routes, against the committed corpus -------------
//
// These are the cases the correction exists for. AR-7's guidance unit sits ahead
// of its official filing unit in the array, and both are available.

const AR_MEMO = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/record-clearing/legal-design-intake/AR.memo.json"), "utf8")
);
const arTrack = (trackId) => {
  const track = AR_MEMO.tracks.find((candidate) => candidate.trackId === trackId);
  assert.ok(track, `${trackId} is missing from the Arkansas memo`);
  return track;
};

// 1. AR-2 stage 1 explicitly selected: process_guidance.
check("AR-2 stage 1, explicitly selected, is process guidance", () => {
  const track = arTrack("ar-misdemeanor-dwi-seal");
  assert.equal(track.compositionMode, "sequential");
  assert.deepEqual(strategyForSelectedUnit(track, "ar-misdemeanor-dwi-seal-stage-1"), {
    ok: true,
    unitId: "ar-misdemeanor-dwi-seal-stage-1",
    outputStrategy: "process_guidance"
  });
});

// 2. AR-2 stage 2 explicitly selected while the waiting-period blocker remains:
//    unavailable, no renderer.
check("AR-2 stage 2 stays unavailable while the waiting-period conflict is open", () => {
  const track = arTrack("ar-misdemeanor-dwi-seal");
  const unit = track.units.find((candidate) => candidate.unitId === "ar-misdemeanor-dwi-seal-stage-2");
  assert.equal(unit.available, false);
  assert.match(unit.unavailableReason, /Coleman/);

  const selection = strategyForSelectedUnit(track, "ar-misdemeanor-dwi-seal-stage-2");
  assert.equal(selection.ok, false, "the blocked ACIC DWI pair produced a renderer strategy");
  assert.equal(selection.reason, "unavailable_unit");
  assert.equal(selection.outputStrategy, undefined);
});

// 3. AR-7's guidance stage cannot shadow the official filing stage after the
//    filing stage is explicitly selected.
check("AR-7's guidance stage cannot shadow its official filing stage", () => {
  const track = arTrack("ar-pardon-seal");
  const [first, second] = track.units;

  // The shape that produced the bug: guidance first in the array, both available.
  assert.equal(first.outputStrategy, "process_guidance");
  assert.equal(first.available, true);
  assert.equal(second.outputStrategy, "official_pdf_fill");
  assert.equal(second.available, true);

  // Selecting the filing stage returns the filing stage.
  assert.deepEqual(strategyForSelectedUnit(track, "ar-pardon-seal-stage-2"), {
    ok: true,
    unitId: "ar-pardon-seal-stage-2",
    outputStrategy: "official_pdf_fill"
  });
  // And selecting nothing returns nothing, rather than the guidance stage that
  // happens to be first.
  assert.equal(strategyForSelectedUnit(track).ok, false);
});

check("a composed route's guidance units still produce guidance specs", () => {
  // Treating a composed route as a single-output track used to file it under
  // whichever strategy came first. Correcting that must not silently drop the
  // guidance work: the guidance stage of a staged route is still drafted, and
  // its filing stage is still assigned a form.
  const specs = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data/record-clearing/legal-design-specifications.json"), "utf8")
  );
  const registry = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data/record-clearing/legal-design-track-registry.json"), "utf8")
  );
  const specified = new Set(
    specs.processGuidanceSpecs.filter((spec) => spec.unitId).map((spec) => `${spec.trackId}:${spec.unitId}`)
  );
  const assigned = new Set(specs.officialFormAssignments.map((assignment) => assignment.trackId));

  for (const track of registry.tracks.filter((candidate) => candidate.outputStrategyDeclared === "composed")) {
    for (const unit of track.units) {
      if (unit.outputStrategy === "process_guidance") {
        assert.ok(
          specified.has(`${track.trackId}:${unit.unitId}`),
          `${track.trackId}:${unit.unitId} is guidance with no guidance spec`
        );
      }
      if (unit.outputStrategy === "official_pdf_fill") {
        assert.ok(assigned.has(track.trackId), `${track.trackId} has a filing unit with no official form assignment`);
      }
    }
  }
});

// 7. All composed Batch 1 tracks remain runtime_disabled in the committed corpus.
check("every composed track in the committed corpus is runtime_disabled and unreachable", () => {
  const registry = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data/record-clearing/legal-design-track-registry.json"), "utf8")
  );
  const queue = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data/record-clearing/legal-design-implementation-queue.json"), "utf8")
  );
  const queued = new Map(
    queue.batches.flatMap((batch) => batch.tracks.map((track) => [`${track.jurisdiction}:${track.trackId}`, track]))
  );

  const composed = registry.tracks.filter((track) => track.outputStrategyDeclared === "composed");
  assert.ok(composed.length > 0, "the corpus has no composed tracks to check");

  for (const track of composed) {
    const key = `${track.jurisdiction}:${track.trackId}`;
    // Registered, and registered disabled.
    assert.ok(track.runtimeDisabledReason, `${key} records no reason for being disabled`);
    assert.equal(queued.get(key)?.runtimeStatus, "runtime_disabled", `${key} is not runtime_disabled`);
    assert.notEqual(track.legalStatus, "legal_approved", `${key} claims legal approval`);

    // No track-level strategy, and every unit individually selectable.
    assert.equal(track.outputStrategy, null, `${key} carries a track-level strategy`);
    assert.ok(["sequential", "alternative", "mixed"].includes(track.compositionMode), `${key} declares no mode`);
    assert.ok(track.units.length > 0, `${key} declares no units`);

    const ids = new Set();
    for (const unit of track.units) {
      assert.ok(unit.unitId, `${key} has a unit with no ID`);
      assert.equal(ids.has(unit.unitId), false, `${key} repeats unit ID ${unit.unitId}`);
      ids.add(unit.unitId);
    }

    // And selecting nothing still yields nothing, straight off the corpus.
    assert.equal(strategyForSelectedUnit(track).ok, false, `${key} resolved without a selection`);
  }
});

check("self-help ends at an objection without unwinding the packet", () => {
  const track = normalizeMemo(
    validMemo({
      selfHelpStopConditions: ["The prosecutor files an objection.", "The court sets a contested hearing."]
    })
  ).tracks[0];
  assert.equal(track.selfHelpBoundaries.length, 2);
  // The stop rule ends automated assistance. It does not make the track
  // unbuildable, and it does not retract a packet already generated.
  assert.equal(track.legalDesignBlockers.length, 0);
});

// --- attorney metadata ------------------------------------------------------

check("attorney metadata is rejected at any depth", () => {
  assert.ok(FORBIDDEN_MEMO_KEYS.length > 10);
  const topLevel = validateLegalDesignMemo(validMemo({}, { reviewerName: "Anyone" }));
  assert.equal(topLevel.ok, false, "top-level reviewer identity was accepted");

  const nested = validateLegalDesignMemo(
    validMemo({ legalDesignDecision: { status: "legal_design_approved", rationale: "x", limitations: [], barNumber: "12345" } })
  );
  assert.equal(nested.ok, false, "nested bar number was accepted");

  const deep = validateLegalDesignMemo(
    validMemo({ officialSources: [{ title: "t", url: "u", retrievedOn: "2026-07-28", contact: "someone@example.com" }] })
  );
  assert.equal(deep.ok, false, "deeply nested contact detail was accepted");
});

// --- the design-vs-output distinction --------------------------------------

check("legal-design approval never yields legal_approved", () => {
  assert.equal(legalStatusFor("legal_design_approved"), "legal_review_pending");
  assert.equal(legalStatusFor("legal_design_approved_with_limitations"), "legal_review_pending");
  assert.equal(legalStatusFor("output_review_pending"), "legal_review_pending");
  assert.equal(legalStatusFor("legal_research_required"), "not_submitted");
  assert.equal(legalStatusFor("legal_rejected"), "legal_rejected");
  // Only counsel approving the produced output reaches legal_approved.
  assert.equal(legalStatusFor("legal_approved"), "legal_approved");
});

check("an imported track is runtime_disabled no matter how emphatic the memo", () => {
  const normalized = normalizeMemo(validMemo());
  assert.equal(normalized.tracks.length, 1);
  const track = normalized.tracks[0];
  assert.equal(track.legalStatus, "legal_review_pending");

  const runtime = computeRuntimeStatus({
    statuses: {
      research: "research_draft_complete",
      technical: "not_implemented",
      visual: "not_reviewed",
      legal: track.legalStatus
    },
    sourceCurrent: true,
    runtimeDisabled: true,
    outputStrategy: track.outputStrategy
  });
  assert.equal(runtime, "runtime_disabled");
});

check("even a fully approved design cannot reach packet_ready without the other gates", () => {
  const runtime = computeRuntimeStatus({
    statuses: {
      research: "research_draft_complete",
      technical: "not_implemented",
      visual: "not_reviewed",
      legal: "legal_approved"
    },
    sourceCurrent: true,
    runtimeDisabled: false,
    outputStrategy: "official_pdf_fill"
  });
  assert.equal(runtime, "runtime_disabled", "legal approval alone produced a ready track");
});

check("tracks needing more research are deferred, not imported", () => {
  const normalized = normalizeMemo(
    validMemo({ legalDesignDecision: { status: "legal_research_required", rationale: "open question", limitations: [] } })
  );
  assert.equal(normalized.tracks.length, 0);
  assert.deepEqual([...normalized.deferredTrackIds], ["example-nonconviction"]);
});

// --- implementation queue ---------------------------------------------------

check("tracks route to the correct implementation batch", () => {
  assert.equal(queueFor(validTrack()), "B_official_pdf_overlay");
  assert.equal(
    queueFor(validTrack({ outputStrategy: "custom_pleading" })),
    "C_custom_pleading"
  );
  assert.equal(
    queueFor(validTrack({ outputStrategy: "process_guidance" })),
    "D_composed_or_process_guidance"
  );
  assert.equal(
    queueFor(validTrack({ geography: { scope: "county", keys: ["polk"], venue: "x" } })),
    "E_local_variant"
  );
  // A missing source hash means staleness cannot be detected, so the track is
  // a source problem regardless of how good its legal design is.
  assert.equal(
    queueFor(validTrack({ officialSources: [{ title: "t", url: "u", retrievedOn: "2026-07-28" }] })),
    "F_source_problem"
  );
});

check("normalization records blockers rather than clearing them", () => {
  const track = normalizeMemo(validMemo()).tracks[0];
  const joined = track.blockers.map((blocker) => blocker.statement).join(" | ");
  assert.match(joined, /Output review pending/);
  assert.match(joined, /Visual review not started/);
  assert.match(joined, /Technical proof not started/);

  // Each blocker says whether it is a question for counsel or a gate of ours.
  const kinds = new Set(track.blockers.map((blocker) => blocker.kind));
  assert.ok(kinds.has("output_review_gate"));
  assert.ok(kinds.has("visual_review_gate"));
  assert.ok(kinds.has("technical_proof_gate"));
});

check("a source with no hash is a source gate, not a legal-design blocker", () => {
  const track = normalizeMemo(
    validMemo({ officialSources: [{ title: "t", url: "https://courts.example.gov/EX-100.pdf", retrievedOn: "2026-07-28" }] })
  ).tracks[0];
  const sourceGates = track.blockers.filter((blocker) => blocker.kind === "source_gate");
  assert.equal(sourceGates.length, 1, "the missing-hash source gate was dropped");
  assert.equal(track.legalDesignBlockers.length, 0, "a source problem was recorded as a legal question");
});

check("signature, notarization, fees and service become participant actions", () => {
  const actions = participantActionsFor(
    validTrack({
      rules: {
        filing: "File with the clerk.",
        fees: "$75 filing fee.",
        feeWaiver: "File an affidavit of indigency.",
        notice: "Prosecutor notice.",
        service: "Serve the prosecutor by mail.",
        participantSignature: "The petitioner signs before a deputy clerk.",
        notarization: "The affidavit must be notarized."
      }
    })
  );
  const kinds = actions.map((action) => action.kind);
  for (const expected of ["obtain_document", "sign", "notarize", "pay_fee", "apply_fee_waiver", "serve_party", "file"]) {
    assert.ok(kinds.includes(expected), `${expected} was not recorded as a participant action`);
  }

  // "none" is counsel saying a rule does not apply, not an action to print.
  const bare = participantActionsFor(
    validTrack({
      supportingDocuments: [],
      manualCompletionItems: [],
      rules: {
        filing: "File with the clerk.",
        fees: "none",
        feeWaiver: "none",
        notice: "none",
        service: "none",
        participantSignature: "none",
        notarization: "none"
      }
    })
  );
  assert.deepEqual(
    bare.map((action) => action.kind),
    ["file"]
  );
});

check("packet sets and specs are derived from the memo's components", () => {
  const track = normalizeMemo(
    validMemo({
      components: [
        { role: "primary_filing", requirement: "required", outputStrategy: "official_pdf_fill", officialFormId: "EX-100" },
        { role: "certificate_of_service", requirement: "required", outputStrategy: "custom_pleading" },
        {
          role: "fee_waiver",
          requirement: "conditional",
          conditionDescription: "If a waiver is requested.",
          outputStrategy: "official_pdf_fill",
          officialFormId: "EX-102"
        }
      ]
    })
  ).tracks[0];

  assert.equal(track.packetSet.components.length, 3);
  assert.deepEqual(
    track.packetSet.components.map((c) => c.order),
    [1, 2, 3]
  );
  assert.equal(track.packetSet.components[2].requirement, "conditional");
  assert.ok(track.packetSet.components[2].conditionDescription);
});

// --- the batch delta report --------------------------------------------------
//
// Driven over a scratch directory rather than the real intake, so the report's
// arithmetic is proven on non-zero data without a fabricated memo ever entering
// the repository. The fixture is the shipped template, which carries no real
// jurisdiction's law.

check("the batch delta report reconciles and refuses to restate counsel", () => {
  const os = require("node:os");
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-batch-delta-"));
  const outPath = path.join(scratch, "report.json");

  try {
    const template = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data/record-clearing/legal-design-intake/TEMPLATE.memo.json"), "utf8")
    );

    // Two jurisdictions, so the report has to sum across memos. A build
    // blocker, a release blocker and a research note, so every impact is
    // exercised and the partition has something in each bucket.
    const first = { ...template, jurisdiction: "AL" };
    const second = {
      ...template,
      jurisdiction: "AK",
      tracks: [
        {
          ...template.tracks[0],
          trackId: "example-second-track",
          unresolvedQuestions: [
            {
              question: "Which statute governs?",
              impact: "build_blocker",
              affectedElement: "governing_mechanism",
              provenance: { ...FIXTURE_PROVENANCE }
            },
            {
              question: "When does the wait start?",
              impact: "release_blocker",
              affectedElement: "waiting_period",
              provenance: { ...FIXTURE_PROVENANCE }
            },
            {
              question: "Is there another notice rule?",
              impact: "nonblocking_research_note",
              affectedElement: "notice_or_service",
              provenance: { ...FIXTURE_PROVENANCE }
            }
          ]
        }
      ]
    };
    fs.writeFileSync(path.join(scratch, "AL.memo.json"), JSON.stringify(first));
    fs.writeFileSync(path.join(scratch, "AK.memo.json"), JSON.stringify(second));

    execFileSync(
      process.execPath,
      [
        "scripts/rcap-legal-design-batch-delta.mjs",
        "--batch=AL,AK",
        `--intake=${scratch}`,
        `--out=${outPath}`
      ],
      { cwd: process.cwd(), stdio: "ignore" }
    );

    const report = JSON.parse(fs.readFileSync(outPath, "utf8"));

    assert.equal(report.totalTracksProcessed, 2);
    assert.equal(report.reconciliation.reconciles, true, "the partition did not sum to the track count");
    assert.equal(report.reconciliation.partitionTotal, report.totalTracksProcessed);

    // Both non-empty buckets of the partition are exercised, so reconciliation
    // is not passing merely because everything landed in one of them. The
    // template track carries a release blocker; the second adds a build blocker.
    assert.equal(report.reconciliation.tracksWithBuildBlockers, 1);
    assert.equal(report.reconciliation.tracksWithReleaseBlockersOnly, 1);
    assert.equal(report.reconciliation.tracksClearOfLegalBlockers, 0);

    assert.equal(report.buildBlockers.questions, 1);
    assert.equal(report.releaseBlockers.questions, 2);
    assert.equal(report.nonblockingResearchNotes.questions, 1);

    // The template's five classified limitations, twice over.
    assert.equal(report.limitationsByClassification.packet_instruction.limitations, 2);
    assert.equal(report.limitationsByClassification.scope_restriction.limitations, 2);
    assert.equal(report.participantFilingRequirements.items, 4);

    // The whole point: nothing counsel decided was restated.
    assert.equal(report.tracksWhoseSubstantiveLegalDecisionDidNotChange, 2);
    assert.deepEqual(report.tracksWhoseSubstantiveLegalDecisionChanged, []);
    assert.deepEqual(report.releaseBlockerCeilingViolations, []);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

// --- composed-unit approvals -------------------------------------------------
//
// The decision-change check above compares counsel's memo against what
// normalization produced. It cannot catch the memo itself changing: edit a
// unit's strategy and normalization faithfully follows, so the two agree. On a
// composed route the units *are* the legal substance, so they are pinned to a
// committed approvals file that only moves when somebody deliberately re-approves.
//
// Each fixture below tampers with one composed track and asserts the batch
// delta refuses the run. They exercise the real script, not a reimplementation
// of its rules.

/** Runs the batch delta over a fixture intake, returning its exit code and report. */
function runBatchDelta({ memos, approvalsFrom, approve = false, batch }) {
  const os = require("node:os");
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-composed-units-"));
  try {
    for (const [name, memo] of Object.entries(memos)) {
      fs.writeFileSync(path.join(scratch, name), JSON.stringify(memo));
    }
    const approvalsPath = path.join(scratch, "approvals.json");
    if (approvalsFrom) fs.copyFileSync(approvalsFrom, approvalsPath);

    const args = [
      "scripts/rcap-legal-design-batch-delta.mjs",
      `--batch=${batch}`,
      `--intake=${scratch}`,
      `--out=${path.join(scratch, "report.json")}`,
      `--approvals=${approvalsPath}`
    ];
    if (approve) args.push("--approve-composed-units");

    let status = 0;
    try {
      execFileSync(process.execPath, args, { cwd: process.cwd(), stdio: "ignore" });
    } catch (error) {
      status = error.status ?? 1;
    }
    const reportPath = path.join(scratch, "report.json");
    const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, "utf8")) : null;
    return { status, report, approvalsPath: fs.existsSync(approvalsPath) ? approvalsPath : null, scratch };
  } finally {
    // Left for the caller to read before cleanup happens on process exit.
  }
}

/** A two-unit sequential composed route: guidance, then the real filing. */
function composedFixtureMemo(mutate = (memo) => memo) {
  const template = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data/record-clearing/legal-design-intake/TEMPLATE.memo.json"), "utf8")
  );
  const base = template.tracks[0];
  const memo = {
    ...template,
    jurisdiction: "AL",
    tracks: [
      {
        ...base,
        trackId: "example-composed",
        outputStrategy: "composed",
        outputStrategyStatus: "resolved",
        packetIdentity: "identified",
        compositionMode: "sequential",
        guidanceRationales: ["another_entity_decides"],
        units: [
          {
            unitId: "example-composed-stage-1",
            order: 1,
            label: "Guidance",
            outputStrategy: "process_guidance",
            outputStrategyStatus: "resolved",
            packetIdentity: "identified",
            description: "Explain the prerequisite event.",
            available: true
          },
          {
            unitId: "example-composed-stage-2",
            order: 2,
            label: "Official filing",
            outputStrategy: "official_pdf_fill",
            outputStrategyStatus: "resolved",
            packetIdentity: "identified",
            description: "Generate the official pair.",
            available: true
          }
        ]
      }
    ]
  };
  return mutate(memo);
}

/** Approves the untampered fixture, then replays it with one mutation applied. */
function composedDriftFixture(mutate) {
  const approvedRun = runBatchDelta({
    memos: { "AL.memo.json": composedFixtureMemo() },
    approve: true,
    batch: "AL"
  });
  assert.equal(approvedRun.status, 0, "the untampered composed fixture could not be approved");
  return runBatchDelta({
    memos: { "AL.memo.json": composedFixtureMemo(mutate) },
    approvalsFrom: approvedRun.approvalsPath,
    batch: "AL"
  });
}

const composedDrift = (result) =>
  (result.report?.composedUnits?.driftingTracks ?? []).flatMap((entry) => entry.differences).join(" | ");

// 6. Unchanged composed routes pass.
check("an unchanged composed route matches its approved unit substance", () => {
  const approved = runBatchDelta({
    memos: { "AL.memo.json": composedFixtureMemo() },
    approve: true,
    batch: "AL"
  });
  assert.equal(approved.status, 0);

  const replay = runBatchDelta({
    memos: { "AL.memo.json": composedFixtureMemo() },
    approvalsFrom: approved.approvalsPath,
    batch: "AL"
  });
  assert.equal(replay.status, 0, `an unchanged composed route drifted: ${composedDrift(replay)}`);
  assert.deepEqual(replay.report.composedUnits.driftingTracks, []);
  assert.equal(replay.report.composedUnits.composedTracks, 1);
  assert.equal(replay.report.composedUnits.totalUnits, 2);
});

// 1. Changing a resolved unit strategy fails.
check("changing a resolved unit's strategy fails the delta", () => {
  const result = composedDriftFixture((memo) => {
    memo.tracks[0].units[1].outputStrategy = "custom_pleading";
    return memo;
  });
  assert.notEqual(result.status, 0, "a changed unit strategy passed the delta");
  assert.match(composedDrift(result), /example-composed-stage-2\.outputStrategy/);
});

// 2. Deleting a unit fails.
check("deleting a unit fails the delta", () => {
  const result = composedDriftFixture((memo) => {
    memo.tracks[0].units.splice(1, 1);
    return memo;
  });
  assert.notEqual(result.status, 0, "a deleted unit passed the delta");
  assert.match(composedDrift(result), /unit removed: example-composed-stage-2/);
});

// 3. Adding an unapproved unit fails.
check("adding an unapproved unit fails the delta", () => {
  const result = composedDriftFixture((memo) => {
    memo.tracks[0].units.push({
      unitId: "example-composed-stage-3",
      order: 3,
      label: "Invented",
      outputStrategy: "custom_pleading",
      outputStrategyStatus: "resolved",
      packetIdentity: "identified",
      description: "A stage nobody approved.",
      available: true
    });
    return memo;
  });
  assert.notEqual(result.status, 0, "an unapproved unit passed the delta");
  assert.match(composedDrift(result), /unapproved unit added: example-composed-stage-3/);
});

// 4. Changing sequential unit order fails.
check("changing sequential stage order fails the delta", () => {
  const result = composedDriftFixture((memo) => {
    memo.tracks[0].units[0].order = 2;
    memo.tracks[0].units[1].order = 1;
    return memo;
  });
  assert.notEqual(result.status, 0, "a reordered sequential composition passed the delta");
  assert.match(composedDrift(result), /sequential stage order|\.order:/);
});

// Alternative branches are selected by a predicate, not by position, so their
// array order is deliberately not substantive. Proven so the sequential rule
// above is not quietly over-broad.
check("reordering alternative branches is not a substantive change", () => {
  const alternative = (reversed) =>
    composedFixtureMemo((memo) => {
      const track = memo.tracks[0];
      track.compositionMode = "alternative";
      track.units = [
        {
          unitId: "example-composed-branch-a",
          order: 1,
          label: "Branch A",
          outputStrategy: "process_guidance",
          outputStrategyStatus: "resolved",
          packetIdentity: "identified",
          description: "Applies on one set of facts.",
          available: true
        },
        {
          unitId: "example-composed-branch-b",
          order: 2,
          label: "Branch B",
          outputStrategy: "official_pdf_fill",
          outputStrategyStatus: "resolved",
          packetIdentity: "identified",
          description: "Applies on the other.",
          available: true
        }
      ];
      if (reversed) {
        track.units.reverse();
        track.units.forEach((unit, index) => {
          unit.order = index + 1;
        });
      }
      return memo;
    });

  const approved = runBatchDelta({ memos: { "AL.memo.json": alternative(false) }, approve: true, batch: "AL" });
  assert.equal(approved.status, 0);

  const swapped = runBatchDelta({
    memos: { "AL.memo.json": alternative(true) },
    approvalsFrom: approved.approvalsPath,
    batch: "AL"
  });
  assert.equal(swapped.status, 0, `alternative branch order was treated as substantive: ${composedDrift(swapped)}`);
});

// 5. Resolving an unresolved unit without controlling provenance fails.
check("an unresolved unit cannot become resolved without controlling provenance", () => {
  const withUnresolvedUnit = (resolved) =>
    composedFixtureMemo((memo) => {
      const unit = memo.tracks[0].units[1];
      if (resolved) {
        unit.outputStrategy = "official_pdf_fill";
        unit.outputStrategyStatus = "resolved";
        unit.packetIdentity = "identified";
        unit.available = true;
        delete unit.unavailableReason;
      } else {
        delete unit.outputStrategy;
        unit.outputStrategyStatus = "unresolved";
        unit.packetIdentity = "unresolved";
        unit.available = false;
        unit.unavailableReason = "Counsel has not settled the accepted vehicle.";
      }
      return memo;
    });

  const approved = runBatchDelta({
    memos: { "AL.memo.json": withUnresolvedUnit(false) },
    approve: true,
    batch: "AL"
  });
  assert.equal(approved.status, 0);

  // Flipping it to resolved drifts from the approved baseline, so the run fails
  // rather than silently accepting a vehicle counsel never settled.
  const flipped = runBatchDelta({
    memos: { "AL.memo.json": withUnresolvedUnit(true) },
    approvalsFrom: approved.approvalsPath,
    batch: "AL"
  });
  assert.notEqual(flipped.status, 0, "an unresolved unit was resolved without re-approval");
  assert.match(composedDrift(flipped), /\.unresolved|\.outputStrategyStatus|\.outputStrategy/);

  // And re-approving is refused where the track carries no counsel-authored
  // provenance, so the escape hatch cannot launder the change either.
  const noProvenance = composedFixtureMemo((memo) => {
    const track = memo.tracks[0];
    const inferred = {
      classificationBasis: "mechanical_translation",
      sourceFile: "fixture.md",
      sourceHeading: "fixture",
      sourceStatement: "fixture",
      normalizerInferred: true
    };
    for (const limitation of track.legalDesignDecision.limitations) limitation.provenance = { ...inferred };
    for (const question of track.unresolvedQuestions ?? []) question.provenance = { ...inferred };
    return memo;
  });
  const refused = runBatchDelta({ memos: { "AL.memo.json": noProvenance }, approve: true, batch: "AL" });
  assert.notEqual(refused.status, 0, "a resolved unit was approved with no counsel-authored provenance");
});

// 7. All committed Batch 1 composed routes pass against the committed approvals.
check("every committed Batch 1 composed route matches its approved unit substance", () => {
  const report = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data/record-clearing/legal-design-batch-delta-report.json"), "utf8")
  );
  const composed = report.composedUnits;
  assert.ok(composed, "the batch delta report carries no composed-unit section");
  assert.equal(composed.approvalsPresent, true, "the committed corpus has no composed-unit approvals file");
  assert.deepEqual(composed.driftingTracks, [], "a committed composed route drifted from its approved substance");
  assert.equal(composed.composedTracks, composed.approvedTracks);
  assert.equal(composed.composedTracks, 10);
  assert.equal(composed.totalUnits, 20);
  assert.equal(composed.unresolvedUnits, 3);

  // And the approvals file itself still describes the committed corpus.
  const approvals = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data/record-clearing/legal-design-composed-unit-approvals.json"), "utf8")
  );
  // The approvals file spans every batch, so the Batch 1 shape is asserted over
  // the Batch 1 entries. The per-track invariants below still run over every
  // entry in the file, whichever batch approved it.
  const BATCH_1_CODES = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "HI", "ID"];
  const batch1Approvals = approvals.tracks.filter((track) => BATCH_1_CODES.includes(track.jurisdiction));
  assert.equal(batch1Approvals.length, 10);
  const modes = batch1Approvals.reduce((counts, track) => {
    counts[track.compositionMode] = (counts[track.compositionMode] ?? 0) + 1;
    return counts;
  }, {});
  assert.deepEqual(modes, { sequential: 7, alternative: 3 });
  for (const track of approvals.tracks) {
    assert.equal(track.outputStrategyDeclared, "composed");
    assert.ok(track.counselAuthoredProvenanceCount > 0, `${track.trackId} has no counsel-authored provenance`);
    for (const unit of track.units) {
      assert.ok(unit.unitId, "an approved unit has no stable ID");
      if (unit.unresolved) assert.equal(unit.available, false, `${unit.unitId} is unresolved but available`);
      if (unit.available) {
        assert.ok(
          ["custom_pleading", "official_pdf_fill", "process_guidance"].includes(unit.outputStrategy),
          `${unit.unitId} is available with ${unit.outputStrategy}`
        );
      }
    }
  }
});

check("the corrected Wisconsin memo preserves the packet-capable supporting-action split", () => {
  const memoPath = path.join(
    process.cwd(),
    "data/record-clearing/legal-design-intake/WI.memo.json"
  );
  const memoBytes = fs.readFileSync(memoPath);
  assert.equal(
    crypto.createHash("sha256").update(memoBytes).digest("hex"),
    "028ac578608bf73db912e355a18824d2100a2e3e8052d9ef3040d437dbf08c28"
  );
  const memo = JSON.parse(memoBytes);
  assert.equal(validateLegalDesignMemo(memo).ok, true);
  assert.equal(memo.tracks.length, 9);
  assert.equal(
    memo.tracks.filter((track) => track.nodeType === "relief_track").length,
    8
  );
  assert.equal(
    memo.tracks.filter((track) => track.nodeType === "supporting_action").length,
    1
  );
  assert.match(
    memo._sourceSlotAccounting,
    /Eight review source slots, each accounted for exactly once, normalized to NINE nodes through one explicit split/
  );

  const strategies = memo.tracks.reduce((counts, track) => {
    const strategy = track.outputStrategy ?? "deferred";
    counts[strategy] = (counts[strategy] ?? 0) + 1;
    return counts;
  }, {});
  assert.deepEqual(strategies, {
    process_guidance: 4,
    custom_pleading: 1,
    official_pdf_fill: 3,
    deferred: 1
  });

  const underlying = memo.tracks.find(
    (track) => track.trackId === "wi_exp_certificate_of_discharge"
  );
  const followup = memo.tracks.find(
    (track) =>
      track.trackId === "wi_exp_certificate_of_discharge_followup"
  );
  assert.equal(underlying.nodeType, "relief_track");
  assert.equal(underlying.outputStrategy, "process_guidance");
  assert.equal(followup.nodeType, "supporting_action");
  assert.equal(followup.supportsTrackId, underlying.trackId);
  assert.equal(followup.outputStrategy, "custom_pleading");
  assert.equal(followup.packetIdentity, "identified");
  assert.equal(followup.destination.kind, "agency");
  assert.match(followup.destination.name, /clerk of circuit court/i);
  assert.equal(
    followup.unresolvedQuestions.filter(
      (question) => question.impact === "release_blocker"
    ).length,
    1
  );
  assert.equal(
    followup.unresolvedQuestions.filter(
      (question) =>
        question.impact === "nonblocking_research_note" &&
        question.affectedElement === "correct_form"
    ).length,
    1
  );
});

check("the corrected Rhode Island memo and approvals preserve one conditional marijuana mechanism", () => {
  const memoPath = path.join(
    process.cwd(),
    "data/record-clearing/legal-design-intake/RI.memo.json"
  );
  const memoBytes = fs.readFileSync(memoPath);
  assert.equal(
    crypto.createHash("sha256").update(memoBytes).digest("hex"),
    "918bdea81d68d75e072b8034dc22ba2cce0d6c86451c9ebdc3607b1225cfd62f"
  );
  const memo = JSON.parse(memoBytes);
  assert.equal(validateLegalDesignMemo(memo).ok, true);
  assert.equal(memo.tracks.length, 10);
  assert.ok(memo.tracks.every((track) => track.nodeType === "relief_track"));
  assert.match(
    memo._sourceSlotAccounting,
    /Ten review source slots, each accounted for exactly once, 1:1, with no splits/
  );

  const strategies = memo.tracks.reduce((counts, track) => {
    const strategy = track.outputStrategy ?? "deferred";
    counts[strategy] = (counts[strategy] ?? 0) + 1;
    return counts;
  }, {});
  assert.deepEqual(strategies, {
    composed: 6,
    deferred: 1,
    process_guidance: 2,
    official_pdf_fill: 1
  });
  assert.equal(
    memo.tracks
      .filter((track) => track.outputStrategy === "composed")
      .reduce((count, track) => count + track.units.length, 0),
    16
  );

  const marijuanaTracks = memo.tracks.filter(
    (track) => track.trackId === "ri_marijuana"
  );
  assert.equal(marijuanaTracks.length, 1);
  const marijuana = marijuanaTracks[0];
  assert.equal(marijuana.compositionMode, "sequential");
  assert.deepEqual(
    marijuana.units.map((unit) => ({
      unitId: unit.unitId,
      order: unit.order,
      outputStrategy: unit.outputStrategy
    })),
    [
      {
        unitId: "ri-marijuana-automatic-verification",
        order: 1,
        outputStrategy: "process_guidance"
      },
      {
        unitId: "ri-marijuana-expedited-written-request",
        order: 2,
        outputStrategy: "custom_pleading"
      }
    ]
  );
  assert.match(marijuana.units[0].description, /Nothing is filed at this stage/);
  assert.match(
    marijuana.units[1].description,
    /only where the participant confirms from their BCI record/
  );
  assert.equal(
    marijuana.unresolvedQuestions.filter(
      (question) => question.impact === "release_blocker"
    ).length,
    1
  );

  const approvals = JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        "data/record-clearing/legal-design-composed-unit-approvals.json"
      ),
      "utf8"
    )
  );
  // Session D wave 2 added WV's sequential DUI-deferral composition and SC's
  // alternative summary-court composition. Every earlier approval is preserved
  // value-identically; PA's pardon composition is still deliberately absent.
  assert.equal(approvals.tracks.length, 34);
  const riApprovals = approvals.tracks.filter(
    (track) => track.jurisdiction === "RI"
  );
  assert.equal(riApprovals.length, 6);
  assert.equal(
    riApprovals.reduce((count, track) => count + track.units.length, 0),
    16
  );
  assert.equal(
    approvals.tracks.some((track) => track.jurisdiction === "WI"),
    false
  );
  assert.equal(
    approvals.tracks.some(
      (track) =>
        track.jurisdiction === "PA" &&
        track.trackId === "pa_pardon_expungement"
    ),
    false
  );
});

// --- report-only is byte-inert -----------------------------------------------
//
// A captain runs `--report-only` to see what a candidate memo set would produce
// before deciding to accept a state. The run reported honestly but rewrote the
// seven shared registries on its way out, so an inspection left the worktree
// carrying a derived change nobody committed and nobody reviewed. The proof has
// to be byte-for-byte over the real script: a memo the tree does not yet carry
// is dropped into the intake directory, report-only runs against it, and every
// shared output must hash exactly as it did before.

check("report-only writes nothing, while write mode still regenerates", () => {
  const intakeDir = path.join(process.cwd(), "data/record-clearing/legal-design-intake");
  const outDir = path.join(process.cwd(), "data/record-clearing");
  const outputs = [
    "legal-design-legal-research-queue.json",
    "legal-design-guidance-rereview-queue.json",
    "legal-design-track-registry.json",
    "legal-design-packet-set-manifests.json",
    "legal-design-track-source-relationships.json",
    "legal-design-specifications.json",
    "legal-design-implementation-queue.json"
  ];
  const digest = () =>
    Object.fromEntries(
      outputs.map((name) => [
        name,
        crypto.createHash("sha256").update(fs.readFileSync(path.join(outDir, name))).digest("hex")
      ])
    );

  // A syntactically valid memo for a jurisdiction the tree has not imported.
  // Report-only must notice it — the accepted count moves — and still write
  // nothing. NV is used because no NV memo is committed; the probe is removed
  // before this test returns whether it passes or throws.
  const probe = path.join(intakeDir, "NV.memo.json");
  assert.equal(fs.existsSync(probe), false, "NV.memo.json exists; pick an unimported probe jurisdiction");

  const before = digest();
  try {
    fs.writeFileSync(probe, JSON.stringify(validMemo({}, { jurisdiction: "NV" })));
    const stdout = execFileSync(
      process.execPath,
      ["scripts/rcap-legal-design-intake.mjs", "--report-only"],
      { cwd: process.cwd(), encoding: "utf8" }
    );
    // The probe really did reach the run, so byte-identity below is not the
    // trivial result of report-only having had nothing new to say.
    assert.match(stdout, /Report-only: nothing was written/);
    assert.match(stdout, /Accepted: \d+\./);
  } finally {
    fs.rmSync(probe, { force: true });
  }

  assert.deepEqual(digest(), before, "report-only mutated a shared registry");
});

console.log("RCAP legal-design intake verifier passed.");
console.log(`1. ${checks} contract checks over validation, normalization and queueing.`);
console.log("2. All eighteen required fields are enforced; a memo missing any one is rejected.");
console.log("3. An empty list and an absent field are treated differently; nothing is invented.");
console.log("4. Attorney metadata is rejected at any depth. This is not a reviewer database.");
console.log("5. A memo assuming uploads, document review, staff approval or an eligibility determination is rejected.");
console.log("6. Every limitation carries one of eight classifications and its provenance; only legal_design_blocker withholds a track.");
console.log("7. A certified disposition is a participant filing requirement, listed in the packet, never a blocker.");
console.log("8. Participant actions do not move the runtime status; a track with them outstanding can be packet_ready.");
console.log("9. There is no filing_complete status. LegalEase does not inspect the participant's assembled filing.");
console.log("10. Legal-design approval yields legal_review_pending, never legal_approved.");
console.log("11. No imported track reaches packet_ready, and legal approval alone does not either.");
console.log("12. Tracks route to implementation batches A-F, with source problems taking precedence.");
console.log("13. Every unresolved question carries an impact over twelve affected elements; none is dropped.");
console.log("14. A build blocker stops the build; a release blocker permits it and forbids packet_ready.");
console.log("15. A record that corroborates an answer asks the participant to check their own answer.");
console.log("16. Guidance tracks state why; external-dependency ones are queued for counsel, never reclassified.");
console.log("17. normalizerInferred is refused on any basis that asserts counsel decided the point.");
console.log("18. A deferred track omits its output strategy; no concrete strategy may stand in for unknown.");
console.log("19. A provisional strategy needs a controlling source that authorized it.");
console.log(
  "20. A composed route keeps no track-level strategy; a renderer strategy comes only from an explicitly selected unit."
);
console.log(
  "21. Selection fails closed on no selection, an unknown, unresolved, unavailable or ambiguous unit. Never first-available."
);
console.log(
  "22. Composed units are pinned to a committed approvals file: a changed strategy, a deleted or added unit, a reordered"
);
console.log(
  "    sequential stage, or a silently resolved unit fails the batch delta. Alternative-branch array order does not."
);
