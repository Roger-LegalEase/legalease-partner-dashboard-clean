#!/usr/bin/env node
// Three output-level legal-review packages, one per Oregon configuration.
//
//   node scripts/generate-rcap-oregon-disposition-output-legal-review.mjs
//   node scripts/generate-rcap-oregon-disposition-output-legal-review.mjs --check
//   node scripts/generate-rcap-oregon-disposition-output-legal-review.mjs --mutations
//
// WHY THREE, AND WHY NOW
//
// The single Oregon package asked a reviewer to approve one artifact for a route
// the decision owner then found overbroad, and it says so itself: it is retained
// as historical engineering evidence and marked DO NOT SEND, with the note that
// separate route-specific packages are required, one per configuration, after
// their exact artifacts and hashes exist. They exist. These are those packages.
//
// WHAT A PACKAGE IS AND IS NOT
//
// It is a request. Every field is derived from a record that already controls
// it -- the configurations, the render record, the byte-level verification and
// the independent visual review -- and nothing here decides anything. There is
// no approval field to set and no default that reads as approval: the decision
// is recorded as REQUESTED with no grantor, and a package claiming otherwise is
// caught by this generator's own mutations rather than by a reader noticing.
//
// The two questions the earlier package asked as blocking -- which subsection
// governs, and whether one route may deliver one packet for three dispositions
// -- are answered, by the decisions of 2026-08-29. They are recorded as answered
// rather than asked again. What replaces them are the questions these three
// artifacts actually raise.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const CHECK = process.argv.includes("--check");
const MUTATIONS = process.argv.includes("--mutations");

const CONFIGURATIONS = "data/record-clearing/packet-specifications/OR-disposition-configurations.v1.json";
const ARTIFACTS = "data/rcap-all50/oregon-disposition-artifacts.json";
const VISUAL = "data/rcap-lane-c/oregon/disposition-visual-review.json";
const DECISIONS = "data/record-clearing/legal-decisions/2026-08-29-lawrence-six-decisions.json";
const PREDECESSOR = "docs/rcap/grade-a/oregon/OUTPUT_LEGAL_REVIEW.json";
const OUT_ROOT = "docs/rcap/grade-a/oregon/disposition-configurations";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");

const configurations = read(CONFIGURATIONS);
const artifacts = read(ARTIFACTS);
const visual = read(VISUAL);

/**
 * The commit these artifacts were last changed at, rather than HEAD.
 *
 * HEAD moves with every commit and would make this record stale the moment it
 * was committed. What a reviewer needs is the commit the bytes under review came
 * from, and that only moves when the bytes do.
 */
function candidateCommit() {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%H", "--", ARTIFACTS], { cwd: rootDir, encoding: "utf8" });
    return out.trim() || null;
  } catch { return null; }
}
const CANDIDATE_COMMIT = candidateCommit();

/** Questions these three artifacts actually raise, per configuration. */
function questionsFor(configuration, row) {
  const shared = [
    {
      id: "Q-120",
      question:
        "The court's own instruction page tells every reader \"The District Attorney typically has 120 days to object\", without qualifying it by subsection. The bound legal sections do not apply that period to this route, because it is what ORS 137.225(1)(a) sets for the conviction track. Is that the right handling?",
      why:
        "A participant who reads the packet will see the 120-day sentence on page 3 whatever the platform says elsewhere, so the reviewer is being asked to confirm the difference between the court's generic wording and this route's statute, not to notice it.",
      blocking: false
    },
    {
      id: "Q-MARK",
      question:
        "The selection is made by striking two diagonals inside the court's own printed box, inset 2pt so its 0.72pt line is untouched. Is a mark of that form what a clerk should receive?",
      why:
        "Nothing is drawn that the court did not print, and the alternative -- leaving the box for the participant to mark by hand -- is a different product. Confirm the shape rather than assume it.",
      blocking: false
    },
    {
      id: "Q-BLANKS",
      question:
        "The participant still completes the signature, the signature date, the SID number, the fingerprint number and the certificate of mailing by hand. Is a packet of that shape the completed output?",
      why:
        "Each is refused deliberately: a signature and its date are the participant's act, SID and FPN are state-police identifiers, and the certificate of mailing states a mailing that has not yet happened.",
      blocking: false
    }
  ];
  if (configuration.formOption === "Option 3") {
    return [
      {
        id: "Q-NC-1",
        question:
          "The case-number blank is left empty rather than filled, and the form itself prints \"(leave blank if no court case)\" beside it. Is that the correct completion for a never-charged matter?",
        why: "It is the one blank on the caption a reviewer would expect to be filled, and its emptiness is the route's central assertion.",
        blocking: false
      },
      {
        id: "Q-NC-2",
        question:
          "The offence is written into the first row of the form's \"Name of Citation/Arrest Offenses\" table, after the printed bullet. Where a participant has more than one citation or arrest offence, only the first is written. Is one row the intended behaviour for this release?",
        why: "The table has three rows. Writing only the first is a deliberate limit and not a rendering failure, and the reviewer should decide whether it is acceptable or whether the route must refuse a multi-offence matter.",
        blocking: true
      },
      {
        id: "Q-NC-3",
        question:
          "The 60-day period runs from the prosecutor's declination, and the route requires it as a fact before filing. Nothing in the artifact states the declination date on the form. Should it appear on the motion?",
        why: "The form provides no blank for it. If the court expects it stated, the packet needs somewhere to say it; if not, it belongs only in the participant's own records.",
        blocking: false
      },
      ...shared
    ];
  }
  return [
    {
      id: "Q-1D-1",
      question:
        `Both (1)(d) configurations select Option 2, whose printed text is "${configuration.formOptionText}". The acquittal and the ordinary-dismissal artifacts therefore differ only in the matter facts. Is one form option correct for both dispositions?`,
      why:
        "The form offers no separate acquittal and dismissal options, so the two routes converge on the same box by the court's design rather than by ours. The reviewer should confirm that is right rather than a collapse of two routes into one.",
      blocking: true
    },
    {
      id: "Q-1D-2",
      question:
        "Option 2's text says the movant is not moving to set aside any convictions and is moving to set aside all eligible dismissed or acquitted charges only. Nothing in the artifact names WHICH charges. Is that acceptable, or must the eligible charges be listed?",
      why:
        "The form's charge table sits under Option 1 and is not filled by these routes. If a court expects the charges enumerated for an Option 2 motion, this packet is short of what it needs.",
      blocking: true
    },
    ...shared
  ];
}

const packages = [];
for (const configuration of configurations.configurations) {
  const row = artifacts.configurations.find((r) => r.configurationId === configuration.specificationId);
  if (!row) throw new Error(`no rendered artifact for ${configuration.specificationId}`);
  const seen = visual.reviewed.filter((r) => r.configurationId === configuration.specificationId);
  const canonicalSeen = seen.find((r) => r.fixture === "canonical");

  const doc = {
    schemaVersion: "rcap-grade-a-review/v1",
    reviewKind: "output_level_legal",
    jurisdiction: "OR",
    configurationId: configuration.specificationId,
    routeId: configuration.routeKey,
    label: configuration.label,
    statutoryAuthority: configuration.statutoryAuthority,
    packetFamily: configuration.packetFamily,
    packetSetId: configuration.packetSetId,
    packetSetVersion: configuration.packetSetVersion,
    specification: {
      specificationId: configuration.specificationId,
      specificationVersion: configuration.specificationVersion,
      specificationSha256: configuration.specificationSha256,
      record: CONFIGURATIONS
    },
    legalDesignAlreadyDecided: {
      decisionRecord: DECISIONS,
      decisions: configurations.recordedDecisions,
      owner: configurations.decisionOwner,
      on: configurations.decisionDate,
      whatItSettled: [
        "Which subsection governs this route.",
        "That the three dispositions get separate packet sets rather than one shared configuration.",
        "The content of all six legal sections."
      ],
      whatItDidNotSettle:
        "Whether the exact artifact below may be delivered. That is what this package asks."
    },
    sourceIdentities: configuration.sourceIdentities,
    formSelection: {
      optionMarked: configuration.formOption,
      optionText: configuration.formOptionText,
      optionsLeftUnmarked: row.optionsLeftUnmarked,
      markShape: row.selections?.[0]?.mark ?? null,
      markInsetPt: row.selections?.[0]?.inset ?? null,
      measuredBox: row.selections?.[0]?.box ?? null,
      drewANewBox: false,
      redrewTheCourtsBox: false,
      geometryRecord: artifacts.geometryRecord
    },
    artifactUnderReview: {
      canonical: {
        artifact: row.fixtures.canonical.artifact,
        sha256: row.fixtures.canonical.sha256,
        bytes: row.fixtures.canonical.bytes,
        pages: canonicalSeen?.pageCount ?? null
      },
      boundary: {
        artifact: row.fixtures.boundary.artifact,
        sha256: row.fixtures.boundary.sha256,
        bytes: row.fixtures.boundary.bytes,
        why: "The same route at the widest plausible participant values, so shrink-to-fit and the readable floor are exercised rather than asserted."
      },
      renderedFrom: "a synthetic fixture, not a real participant's facts"
    },
    actualWriteEvidence: {
      writes: row.fixtures.canonical.written.map((w) => ({ blank: w.anchor, factId: w.factId, fontSize: w.fontSize, outcome: w.outcome })),
      refusals: row.fixtures.canonical.refused,
      caseNumber: row.caseNumber,
      caseNumberBecause: row.caseNumberBecause,
      readFrom: "the finalized PDF's own content streams, by scripts/verify-rcap-oregon-disposition-artifacts.mjs"
    },
    optionSelectionEvidence: {
      fromTheBytes:
        "Exactly two strokes inside the court's measured box, neither touching its line; no stroke in either other option box or in any of the seven declaration boxes.",
      fromAPicture: canonicalSeen?.optionBoxesAsSeen ?? null,
      visualReviewRecord: VISUAL,
      independentLegs: 2,
      note: "The two legs answer the same question from different evidence and must agree. Neither is derived from the other."
    },
    pageByPageVisualReview: {
      record: VISUAL,
      pagesReviewed: seen.reduce((n, r) => n + r.pageCount, 0),
      committedImage: canonicalSeen?.pageImage ?? null,
      whatItIsNot: "A human reading the pages for legal sense, which is what this package asks for."
    },
    legalSections: configuration.legalSections,
    outputReviewCautions: configuration.legalSections?.outputReviewCautions ?? [],
    commercialPosture: "candidate_evidence_only",
    commercialPostureNote:
      "Nothing here opens checkout, sponsorship, a packet credit, a render, a delivery or any commercial status. The configuration is commercially closed and stays that way whatever this decision is.",
    commerciallyEligible: 0,
    completePacketProven: 0,
    decision: {
      status: "REQUESTED",
      decidedBy: null,
      decidedOn: null,
      selfGranted: false,
      note: "No lane and no captain approves an output. This field is a request until a legal owner records a decision against it."
    },
    requestedDecisionScope: "one configuration, one route, the exact artifact hashes below",
    requestedApprovalStatement:
      `I approve the artifact at SHA-256 ${row.fixtures.canonical.sha256} (${row.fixtures.canonical.bytes} bytes, 5 pages) as the completed output of route ${configuration.routeKey}, `
      + `built from packet set ${configuration.packetSetId} version ${configuration.packetSetVersion} against official source ${configuration.sourceIdentities.map((s) => `${s.sourceId} at ${s.sha256}`).join(" and ")}, `
      + `under configuration ${configuration.specificationId} v${configuration.specificationVersion} at specification hash ${configuration.specificationSha256}, `
      + `with ${configuration.formOption} selected and the other two options unmarked, as observed at candidate commit ${CANDIDATE_COMMIT ?? "(uncommitted)"}.`,
    requestedRejectionStatement:
      "I reject the above artifact and configuration for this route, for the reasons recorded.",
    whatApprovalWouldAndWouldNotDo: {
      would: `Close the output_legal_approval dimension for ${configuration.specificationId} alone, at this one artifact hash and this one specification hash.`,
      wouldNot:
        "Approve either of the other two configurations, bind a final verification, raise the record to the commercial admission schema, prove packet fileability, move Oregon into a production overlay, or make any route commercially eligible."
    },
    questionsForTheReviewer: questionsFor(configuration, row),
    knownLimitations: [
      "The artifact was rendered from a synthetic fixture, not from a real participant's facts.",
      "Both verification legs are mechanical. Neither reads the pages for legal sense.",
      "The packet's own instruction pages are the court's and are unaltered, including the two places where they do not match the statute — the generic 120-day sentence and the ORS 137.255(4) citation — both recorded as cautions above.",
      "No final verification has been run against a real matter.",
      "Oregon stays under overlays/lane-c-candidates/. No production overlay is requested."
    ],
    outstandingGatesAfterThisDecision: [
      { gate: "final_verification", state: "unbound", owner: "a verifier" },
      { gate: "independent_human_visual_review", state: "pending", owner: "a human reviewer" },
      { gate: "production_overlay_admission", state: "not_requested", owner: "captain" },
      { gate: "commercial_admission", state: "refused", owner: "the fulfillment record", note: "All ten admission points refuse this route and continue to." }
    ],
    supersedes: {
      package: PREDECESSOR,
      why:
        "That package asked for approval of one artifact for the retired broad route, and says of itself that separate route-specific packages are required, one per configuration, once their exact artifacts and hashes exist. This is one of those three.",
      predecessorStatus: "historical engineering evidence, marked DO NOT SEND"
    },
    generatedBy: "scripts/generate-rcap-oregon-disposition-output-legal-review.mjs",
    candidateCommit: CANDIDATE_COMMIT,
    candidateCommitNote:
      "The commit the artifact bytes last changed at, rather than HEAD. HEAD moves with every commit; the bytes under review do not."
  };
  packages.push({ rel: `${OUT_ROOT}/${configuration.specificationId}/OUTPUT_LEGAL_REVIEW.json`, doc });
}

// ---- mutations ---------------------------------------------------------------
if (MUTATIONS) {
  let bad = 0;
  const must = (name, ok) => { console.log(`  ${ok ? "detected " : "UNDETECTED"} ${name}`); if (!ok) bad += 1; };
  const selfGranted = (d) => d.decision?.status !== "REQUESTED" || Boolean(d.decision?.decidedBy) || d.decision?.selfGranted === true;
  const opensCommerce = (d) => d.commerciallyEligible !== 0 || d.completePacketProven !== 0 || d.commercialPosture !== "candidate_evidence_only";

  must("no package grants its own approval", packages.every((p) => !selfGranted(p.doc)));
  must("a package that granted itself approval would be caught",
    selfGranted({ ...packages[0].doc, decision: { status: "APPROVED", decidedBy: "captain" } }));
  must("no package opens commerce", packages.every((p) => !opensCommerce(p.doc)));
  must("a package that opened commerce would be caught",
    opensCommerce({ ...packages[0].doc, commerciallyEligible: 1 }));
  must("each package names exactly its own artifact hash",
    packages.every((p) => {
      const row = artifacts.configurations.find((r) => r.configurationId === p.doc.configurationId);
      return p.doc.requestedApprovalStatement.includes(row.fixtures.canonical.sha256)
        && artifacts.configurations.filter((r) => r.configurationId !== p.doc.configurationId)
          .every((r) => !p.doc.requestedApprovalStatement.includes(r.fixtures.canonical.sha256));
    }));
  must("each package names exactly its own option, and says the others are unmarked",
    packages.every((p) => {
      const configuration = configurations.configurations.find((c) => c.specificationId === p.doc.configurationId);
      return p.doc.formSelection.optionMarked === configuration.formOption
        && p.doc.formSelection.optionsLeftUnmarked.length === 2
        && !p.doc.formSelection.optionsLeftUnmarked.includes(configuration.formOption);
    }));
  must("every package carries at least one blocking question",
    packages.every((p) => p.doc.questionsForTheReviewer.some((q) => q.blocking)));
  must("both verification legs are cited, and neither is presented as the other",
    packages.every((p) => p.doc.optionSelectionEvidence.independentLegs === 2
      && p.doc.optionSelectionEvidence.fromTheBytes && p.doc.optionSelectionEvidence.fromAPicture));

  console.log("");
  if (bad) { console.error(`FAIL oregon-output-legal-review mutations (${bad} undetected)`); process.exit(1); }
  console.log("OK oregon-output-legal-review mutations — a package cannot approve itself, open commerce, or borrow another configuration's artifact.");
  process.exit(0);
}

let stale = 0;
for (const p of packages) {
  const serialized = `${JSON.stringify(p.doc, null, 2)}\n`;
  const abs = path.join(rootDir, p.rel);
  if (CHECK) {
    const current = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
    if (current !== serialized) { console.error(`${p.rel} is stale.`); stale += 1; }
    continue;
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, serialized);
}
if (CHECK) {
  if (stale) { console.error("Run: node scripts/generate-rcap-oregon-disposition-output-legal-review.mjs"); process.exit(1); }
  console.log(`Oregon output-legal-review packages current: ${packages.length}.`);
  process.exit(0);
}
console.log("Oregon output-level legal-review packages\n");
for (const p of packages) {
  console.log(`  ${p.doc.configurationId}  ${p.doc.formSelection.optionMarked}  ${p.doc.artifactUnderReview.canonical.sha256.slice(0, 12)}…  ${p.doc.questionsForTheReviewer.filter((q) => q.blocking).length} blocking question(s)`);
  console.log(`    ${p.rel}`);
}
console.log(`\nDecision status on all three: REQUESTED. Nothing here approves anything.`);
