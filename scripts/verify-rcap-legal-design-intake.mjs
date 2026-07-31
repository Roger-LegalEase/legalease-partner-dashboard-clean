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
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

register("./lib/ts-esm-loader.mjs", import.meta.url);

const { validateLegalDesignMemo } = await import("@/lib/rcap/legal-design/validate");
const {
  normalizeMemo,
  legalStatusFor,
  queueFor,
  splitRequirements,
  splitUnresolvedQuestions,
  participantActionsFor,
  isGuidanceRereviewCandidate,
  readinessCeilingFor
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
    "D_staged_or_process_guidance"
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
