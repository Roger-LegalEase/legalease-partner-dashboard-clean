// Contract tests for the legal-design intake pipeline.
//
// Proves the machinery before any real memo arrives: that a complete memo
// imports, that an incomplete one is refused rather than filled in, that
// attorney metadata is rejected outright, and that counsel approving a legal
// design never produces a runnable track.

import { register } from "node:module";
import assert from "node:assert/strict";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const { validateLegalDesignMemo } = await import("@/lib/rcap/legal-design/validate");
const { normalizeMemo, legalStatusFor, queueFor } = await import("@/lib/rcap/legal-design/normalize");
const { computeRuntimeStatus } = await import("@/lib/rcap/packets/types");
const { REQUIRED_TRACK_FIELDS, FORBIDDEN_MEMO_KEYS } = await import("@/lib/rcap/legal-design/types");

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
    officialSources: [
      {
        title: "EX-100",
        url: "https://courts.example.gov/EX-100.pdf",
        retrievedOn: "2026-07-28",
        sha256: "a".repeat(64)
      }
    ],
    rules: { filing: "File with the clerk.", fees: "none", feeWaiver: "none", notice: "Prosecutor notice.", service: "By mail." },
    selfHelpStopConditions: ["The prosecutor objects."],
    unresolvedQuestions: [],
    legalDesignDecision: { status: "legal_design_approved", rationale: "Settled pathway.", limitations: [] },
    ...overrides
  };
}

function validMemo(trackOverrides = {}, memoOverrides = {}) {
  return {
    schemaVersion: 1,
    jurisdiction: "IA",
    memoVersion: "1.0.0",
    submittedAt: "2026-07-30T00:00:00.000Z",
    tracks: [validTrack(trackOverrides)],
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

check("the fifteen required fields are all enforced", () => {
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
    "official sources": { officialSources: [] },
    "filing, fee, notice and service rules": { rules: { filing: "x", fees: "x", feeWaiver: "x", notice: "x" } },
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
  const joined = track.blockers.join(" | ");
  assert.match(joined, /Output review pending/);
  assert.match(joined, /Visual review not started/);
  assert.match(joined, /Technical proof not started/);
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

console.log("RCAP legal-design intake verifier passed.");
console.log(`1. ${checks} contract checks over validation, normalization and queueing.`);
console.log("2. All fifteen required fields are enforced; a memo missing any one is rejected.");
console.log("3. An empty list and an absent field are treated differently; nothing is invented.");
console.log("4. Attorney metadata is rejected at any depth. This is not a reviewer database.");
console.log("5. Legal-design approval yields legal_review_pending, never legal_approved.");
console.log("6. No imported track reaches packet_ready, and legal approval alone does not either.");
console.log("7. Tracks route to implementation batches A-F, with source problems taking precedence.");
