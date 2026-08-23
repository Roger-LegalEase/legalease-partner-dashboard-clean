#!/usr/bin/env node
// The dispatch package: what changed under each reviewer objection, and what
// a re-review is now being asked to look at.
//
//   node scripts/generate-rcap-gate-b-dispatch-package.mjs
//   node scripts/generate-rcap-gate-b-dispatch-package.mjs --check
//
// Batches A and B returned eight verdicts and no approvals against the
// artifacts at ea1a16b6. Those verdicts cannot be edited into approvals: the
// bytes they describe no longer exist, and a reviewer has to issue a new record
// against the new ones. This says, per family, what the objection was, what
// this lane changed, and -- separately, because they are not the same claim --
// what remains outside this lane's reach.
//
// Two things this deliberately does not do. It issues no verdict: every family
// below is a re-review candidate and nothing here promotes anything. And it
// does not report a source hash as verified, because the reviewer has to
// recompute that from the official bytes in their own clone, which is the one
// blocker no change in this repository resolves.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const REVIEWS = "data/rcap-all50/pdf-independent-reviews";
const EVIDENCE = `${REVIEWS}/gate-b-evidence-completion.json`;
const OUT = `${REVIEWS}/gate-b-dispatch-package.json`;
const OUT_MD = "docs/record-clearing/pdf-independent-reviews/gate-b-dispatch-package.md";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));

function fail(message) {
  console.error(`FAIL dispatch package — ${message}`);
  process.exit(1);
}

const evidence = readJson(EVIDENCE);
const batchA = readJson(`${REVIEWS}/batch-a-verdicts.json`);
const batchB = readJson(`${REVIEWS}/batch-b-verdicts.json`);
const reviewedHead = batchA.reviewedLaneHead;
if (batchB.reviewedLaneHead !== reviewedHead) {
  fail(`the two batches reviewed different heads: ${reviewedHead} and ${batchB.reviewedLaneHead}`);
}

/**
 * What each reviewer objected to, and what this lane did about it.
 *
 * Taken from the reviewers' own finding ids so a reader can hold this against
 * the review record line by line. `closedBy` names the correction; `provenBy`
 * names the measurement that shows it landed, which is the part a reader who
 * does not trust this lane can re-run.
 */
const OBJECTIONS = {
  "AK:tf-800-form-en": [
    { finding: "A-SOURCE-BYTES-ABSENT", status: "outside_this_lane",
      what: "the reviewer could not recompute the official source SHA-256, because the Master Library extract is not mounted in the reviewer's clone",
      closedBy: null,
      provenBy: null,
      remains: "the reviewer needs RCAP_BUNDLE_EXTRACT set to a mounted Edition 1 extract; this repository cannot carry the corpus bytes" }
  ],
  "AK:tf-805-form-en": [
    { finding: "A-SOURCE-BYTES-ABSENT", status: "outside_this_lane",
      what: "the official source SHA-256 could not be recomputed from bytes",
      closedBy: null, provenBy: null,
      remains: "same mount; no artifact, map, classification or sidecar change was requested or made" }
  ],
  "KY:aoc-334-form-en": [
    { finding: "A-KY334-UNDECLARED-WRITES", status: "corrected",
      what: "the artifact drew 7 values against a map declaring 5: the case number into `Court` and the participant's name onto the rule captioned `Date`, both recorded unwritable in the family's own map",
      closedBy: "the renderer is now given the role refusals the map records and applies them before any name match, and the family was re-rendered",
      provenBy: "controls C2 and C3 reproduce both writes from the bytes at the reviewed head and require the contract to refuse them; the placement audit at this head reports no protected-slot finding for this family",
      remains: null },
    { finding: "A-X3-NEVER-WRITE-COVERS-ONLY-MANUAL", status: "corrected",
      what: "field `Text1` is classified `unused`, which the binder's denylist did not name, and was bound and written",
      closedBy: "writable classes are an allowlist of participant, deterministic and participant_writable, mirrored in the verifier",
      provenBy: "control C7; `unused`, `not_applicable`, `manual_participant` and `prosecutor_or_outside_party` are all refused by default now",
      remains: null },
    { finding: "batch-1: ownership typed as participant filing on a court order; revision REV-UNKNOWN; scraped officialTitle; Reset/Print captions flattened into ink",
      status: "open", what: "recorded by the reviewer as open at the reviewed head",
      closedBy: null, provenBy: null,
      remains: "source-identity and document-ownership questions this correction wave did not address" }
  ],
  "KY:aoc-496-3-form-en": [
    { finding: "A-KY4963-COUNTY-DROPPED", status: "corrected",
      what: "the map declares 2 bindings, the artifact draws 1, and the scan reported both numbers and passed: the county dropdown produced nothing and nothing said so",
      closedBy: "populated-fields.json records what the renderer did rather than only what the map declared, and the scan reconciles written against declared in both directions",
      provenBy: "control C9; this family's scan now records `value_not_among_field_options` against `3 County Dropdown` -- the fixture county is not one of the form's real options -- rather than reporting it populated",
      remains: "the binding is still not exercised by any fixture, because selecting a real county would mean putting a county this platform did not choose onto a filed document" },
    { finding: "A-KY4963-IDENTITY-UNRECORDED", status: "open",
      what: "revision REV-UNKNOWN with freshnessStatus revision_confirmation_required, and officialTitle is a scraped body fragment",
      closedBy: null, provenBy: null, remains: "source identity, unaddressed by this wave" }
  ],
  "NC:aoc-cr-287-form-en": [
    { finding: "source binary not resolvable", status: "outside_this_lane",
      what: "the reviewed source binary could not be resolved in the reviewer's clone",
      closedBy: null, provenBy: null,
      remains: "the same mount blocker as the two Alaska families" }
  ],
  "NC:aoc-cr-288-form-en": [
    { finding: "ESC-GEOMETRY-NOT-AN-INPUT (still present)", status: "corrected",
      what: "the petitioner's name was written into `PetitionerIsEligibleBecauseText1`, a field whose widget sits under the printed heading FINDINGS OF FACT on page 2 -- the judge's block",
      closedBy: "the region channel consults a heading vocabulary rather than the field-name rules, which match nothing in `FINDINGS OF FACT`; and page 2's topmost heading is no longer suppressed as a document title",
      provenBy: "controls C1 and C6; the binder now refuses this field with reason protected_page_region / court",
      remains: null },
    { finding: "withdraw the false provenAgainstThisFamilysBytes claim", status: "acknowledged",
      what: "the rerender record claimed this escalation proven against this family's bytes and it was not",
      closedBy: "the claim is superseded: the check the reviewer said was missing now runs against every family, not just this one",
      provenBy: "the placement audit reports 17 of 17 rerendered families clean on every page, measured rather than asserted",
      remains: null }
  ],
  "NC:aoc-cr-296-form-en": [
    { finding: "substantive_owner_decision_required", status: "owner_decision",
      what: "AOC-CR-296 is prosecutor-controlled, and whether it belongs in a participant-completed packet at all is not a technical question",
      closedBy: null, provenBy: null,
      remains: "an owner has to decide; the pathway stays sellable only through supported participant-filed documents" },
    { finding: "DLState bound to participant.state on a field-name substring match", status: "open",
      what: "the residence state and the state that issued a driver's licence are different facts, and the canonical fixture renders 'XX' in the Drivers License State column",
      closedBy: null, provenBy: null,
      remains: "subordinate to the ownership decision, and wrong either way" }
  ],
  "NC:aoc-cr-298-form-en": [
    { finding: "source binary not resolvable", status: "outside_this_lane",
      what: "the reviewed source binary could not be resolved in the reviewer's clone",
      closedBy: null, provenBy: null, remains: "the same mount blocker" },
    { finding: "not raised by any reviewer", status: "found_by_the_new_contract",
      what: "the participant's name was drawn into `NotEligibleReason` on page 2, a field recorded unwritable in this family's own map",
      closedBy: "the same role refusal now reaching the renderer",
      provenBy: "the placement audit; this defect was invisible to a page-1 raster, which is why no reviewer saw it",
      remains: null }
  ]
};

const familyById = new Map(evidence.families.map((f) => [f.familyId, f]));
const verdicts = { ...batchA.verdictsByFamily };
for (const [verdict, families] of Object.entries(batchB.byVerdict ?? {})) {
  for (const family of families) verdicts[family] = verdict;
}

const families = Object.keys(OBJECTIONS).map((familyId) => {
  const objections = OBJECTIONS[familyId];
  const evidenceRow = familyById.get(familyId) ?? null;
  const open = objections.filter((o) => o.status === "open" || o.status === "owner_decision");
  const outside = objections.filter((o) => o.status === "outside_this_lane");
  return {
    familyId,
    reviewedVerdict: verdicts[familyId] ?? null,
    objections,
    correctedInThisWave: objections.filter((o) => o.status === "corrected" || o.status === "found_by_the_new_contract").length,
    stillOpen: open.length,
    blockedOutsideThisLane: outside.length,
    evidenceAtThisHead: evidenceRow
      ? {
          pagesCarryingFields: evidenceRow.rasterEvidence?.pagesCarryingFields ?? [],
          pagesRasterised: (evidenceRow.rasterEvidence?.pages ?? []).map((p) => p.page),
          rasterCoverageComplete: evidenceRow.rasterEvidence?.coverageComplete ?? false,
          placementClean: evidenceRow.placement?.clean ?? null,
          artifactSha256: evidenceRow.artifactSha256 ?? null,
          sidecarFields: evidenceRow.sidecarFields ?? null,
          readyForIndependentReview: evidenceRow.readyForIndependentReview ?? false
        }
      : null,
    readyForReReview: Boolean(evidenceRow?.readyForIndependentReview) && open.length === 0
  };
});

const record = {
  schemaVersion: "rcap-gate-b-dispatch-package/v1",
  generatedBy: "scripts/generate-rcap-gate-b-dispatch-package.mjs",
  reviewedHead,
  evidenceGeneratedFrom: evidence.generatedBy ?? null,
  notAnApproval:
    "No verdict is issued here. Every family below is a re-review candidate. The reviewer records at the reviewed head remain the current verdicts until a reviewer issues new ones against the new bytes.",
  theBlockerThisLaneCannotClear:
    "Four families -- AK TF-800, AK TF-805, NC AOC-CR-287 and NC AOC-CR-298 -- were refused for one reason only: the reviewer could not recompute the official source SHA-256, because the Master Library extract is absent from the reviewer's clone. That is an environment fact, not a defect in any artifact. The corpus is mounted in this lane's container and all four sources hash to their pinned values there, but the reviewer must recompute it in their own clone, and no commit in this repository can carry the corpus bytes to them.",
  totals: {
    familiesReviewed: families.length,
    approvalsAtTheReviewedHead: 0,
    objectionsCorrectedInThisWave: families.reduce((n, f) => n + f.correctedInThisWave, 0),
    objectionsStillOpen: families.reduce((n, f) => n + f.stillOpen, 0),
    familiesBlockedOnlyByTheSourceMount: families.filter((f) => f.blockedOutsideThisLane > 0 && f.stillOpen === 0 && f.correctedInThisWave === 0).length,
    familiesReadyForReReview: families.filter((f) => f.readyForReReview).length,
    familiesAwaitingAnOwnerDecision: families.filter((f) => f.objections.some((o) => o.status === "owner_decision")).length
  },
  families
};

function markdown() {
  const lines = [];
  lines.push("# Gate B dispatch package");
  lines.push("");
  lines.push(record.notAnApproval);
  lines.push("");
  lines.push("## The blocker this lane cannot clear");
  lines.push("");
  lines.push(record.theBlockerThisLaneCannotClear);
  lines.push("");
  lines.push("| family | verdict at the reviewed head | corrected here | still open | pages shown | placement clean | ready for re-review |");
  lines.push("| --- | --- | :-: | :-: | :-: | :-: | :-: |");
  for (const f of families) {
    const e = f.evidenceAtThisHead;
    lines.push(`| ${f.familyId} | ${f.reviewedVerdict ?? "—"} | ${f.correctedInThisWave} | ${f.stillOpen} | ${e ? e.pagesRasterised.join(", ") : "held"} | ${e ? (e.placementClean ? "yes" : "NO") : "—"} | ${f.readyForReReview ? "yes" : "no"} |`);
  }
  lines.push("");
  for (const f of families) {
    lines.push(`## ${f.familyId}`);
    lines.push("");
    for (const o of f.objections) {
      lines.push(`- **${o.finding}** — _${o.status}_`);
      lines.push(`  - ${o.what}`);
      if (o.closedBy) lines.push(`  - closed by: ${o.closedBy}`);
      if (o.provenBy) lines.push(`  - proven by: ${o.provenBy}`);
      if (o.remains) lines.push(`  - remains: ${o.remains}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

const outputs = [[OUT, `${JSON.stringify(record, null, 2)}\n`], [OUT_MD, markdown()]];
let stale = 0;
for (const [rel, content] of outputs) {
  const file = abs(rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === content) continue;
  stale += 1;
  if (checkOnly) { console.error(`  stale: ${rel}`); continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-gate-b-dispatch-package.mjs`);

console.log(
  `OK dispatch package — ${record.totals.familiesReviewed} reviewed families; ` +
    `${record.totals.objectionsCorrectedInThisWave} objection(s) corrected, ${record.totals.objectionsStillOpen} still open, ` +
    `${record.totals.familiesBlockedOnlyByTheSourceMount} blocked only by the source mount, ` +
    `${record.totals.familiesReadyForReReview} ready for re-review, 0 approvals`
);
