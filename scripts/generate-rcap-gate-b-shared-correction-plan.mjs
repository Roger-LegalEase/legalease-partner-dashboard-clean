#!/usr/bin/env node
// The Gate B shared-correction ownership manifest.
//
//   node scripts/generate-rcap-gate-b-shared-correction-plan.mjs
//   node scripts/generate-rcap-gate-b-shared-correction-plan.mjs --check
//
// This lane may not edit an implementation path that this manifest does not
// name. That is the point of generating it first: the ownership boundary is
// written down before anything moves, so a path that turns out to belong to
// another lane is caught by reading rather than by a merge conflict.
//
// Three things are recorded.
//
//   1. The frozen correction denominator. The 26 `correction_required` family
//      IDs are re-derived from the three committed group review records rather
//      than restated, and cross-checked against the batch rollup and the batch
//      manifest. A family whose evidence file is missing on this branch is
//      reported as such and still counted: the denominator is what the
//      reviewer decided, not what happens to be on disk.
//   2. The escalations THIS lane owns, one row each, with the module, the
//      families and assets waiting, the reviewer condition failed, the current
//      and required behaviour, the family-owned work that remains afterwards,
//      and the release-input classification of every path.
//   3. The lane boundary. The evidence-completion lane exclusively owns the
//      artifact-provenance sidecar, its verification, and raster/contact-sheet
//      evidence generation. Those paths are named here as prohibited so the
//      boundary is checkable rather than remembered.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const REVIEW_DIR = "data/rcap-all50/pdf-independent-reviews";
const GROUP_RECORDS = [1, 2, 3].map((g) => `${REVIEW_DIR}/batch-1-group-${g}.review.json`);
const BATCH_MANIFEST = `${REVIEW_DIR}/batch-1-manifest.json`;
const VERDICT_ROLLUP = `${REVIEW_DIR}/batch-1-verdicts.json`;
const ESCALATIONS_IN = `${REVIEW_DIR}/shared-module-escalations.json`;
const OUT = "data/rcap-all50/gate-b-shared-correction-plan.json";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));
const sha256OfFile = (rel) =>
  rel && fs.existsSync(abs(rel)) ? crypto.createHash("sha256").update(fs.readFileSync(abs(rel))).digest("hex") : null;

function fail(message) {
  console.error(`FAIL Gate B shared-correction plan — ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. The frozen denominator.
// ---------------------------------------------------------------------------

const verdictRows = [];
for (const rel of GROUP_RECORDS) {
  const record = readJson(rel);
  for (const verdict of record.verdicts) {
    verdictRows.push({ ...verdict, group: record.group, sourceRecord: rel });
  }
}

const rollup = readJson(VERDICT_ROLLUP);
if (verdictRows.length !== rollup.totals.familiesReviewed) {
  fail(`the group records carry ${verdictRows.length} verdicts but the rollup says ${rollup.totals.familiesReviewed} families were reviewed`);
}

const corrections = verdictRows.filter((v) => v.verdict === "correction_required");
if (corrections.length !== rollup.totals.correctionRequired) {
  fail(`the group records carry ${corrections.length} correction_required verdicts but the rollup says ${rollup.totals.correctionRequired}`);
}
if (corrections.length !== 26) fail(`the correction denominator is ${corrections.length}, not 26`);

const formerlyUnresolved = verdictRows.filter((v) => v.verdict === "source_identity_unresolved").map((v) => v.family);
if (formerlyUnresolved.length !== 1) fail(`expected exactly one formerly source_identity_unresolved family, found ${formerlyUnresolved.length}`);
if (rollup.totals.approvedPlatformReady !== 0) fail("the batch is recorded as having approved a family; this lane's premise is 0 approvals");

const batchManifest = readJson(BATCH_MANIFEST);
const manifestByFamily = new Map(batchManifest.families.map((f) => [f.familyId, f]));

const correctionFamilies = corrections.map((verdict) => {
  const entry = manifestByFamily.get(verdict.family) ?? null;
  if (!entry) fail(`${verdict.family} has a correction verdict but no row in the batch manifest`);
  const provenanceRel = `${entry.familyPath}/artifact-provenance.json`;
  return {
    familyId: verdict.family,
    jurisdiction: entry.jurisdiction,
    assetId: `${entry.jurisdiction}|${entry.documentId}|${entry.sourceSha256}`,
    documentId: entry.documentId,
    familyPath: entry.familyPath,
    reviewGroup: verdict.group,
    // Identity as the reviewer froze it. Recomputed-on-disk values sit beside
    // the recorded ones so a family whose bytes have since moved is visible
    // rather than silently re-based.
    sourceSha256: entry.sourceSha256,
    fieldMapSha256: entry.fieldMapSha256,
    fieldMapPath: entry.fieldMapPath ?? null,
    fieldMapSha256OnDisk: sha256OfFile(entry.fieldMapPath),
    classificationSha256: entry.fieldClassificationSha256,
    artifactSha256: entry.artifacts.map((a) => ({ rel: a.rel, kind: a.kind, sha256: a.sha256, presentOnDisk: fs.existsSync(abs(`${entry.familyPath}/${a.rel}`)) })),
    provenanceSha256: entry.provenanceSha256,
    provenanceSha256OnDisk: sha256OfFile(provenanceRel),
    visualEvidence: entry.renderedEvidence ?? null,
    visualEvidenceSha256: sha256OfFile(entry.renderedEvidence),
    visualEvidencePresentOnDisk: Boolean(entry.renderedEvidence) && fs.existsSync(abs(entry.renderedEvidence)),
    failedReviewCondition: verdict.required ?? null,
    page: verdict.page ?? null,
    fieldOrGeometry: verdict.fieldOrGeometry ?? null,
    observed: verdict.observed ?? null,
    required: verdict.required ?? null,
    smallestCorrection: verdict.smallestCorrection ?? null
  };
});

const missingEvidence = correctionFamilies.filter((f) => f.artifactSha256.some((a) => !a.presentOnDisk));

// ---------------------------------------------------------------------------
// 2. The release-input sets, read from the generator that owns them.
// ---------------------------------------------------------------------------

const stagingGenerator = fs.readFileSync(abs("scripts/generate-rcap-staging-action.mjs"), "utf8");
const imageInputBlock = /const IMAGE_INPUT_PATHS = \[([\s\S]*?)\];/.exec(stagingGenerator);
if (!imageInputBlock) fail("could not read IMAGE_INPUT_PATHS from scripts/generate-rcap-staging-action.mjs");
const IMAGE_INPUT_PATHS = [...imageInputBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
if (IMAGE_INPUT_PATHS.length === 0) fail("the image-input set parsed empty");

const APPLICATION_INPUT_PATHS = ["src/", "package.json", "package-lock.json", "tsconfig.json", "next.config.ts"];
const insideSet = (candidate, set) =>
  set.some((entry) => (entry.endsWith("/") ? candidate.startsWith(entry) : candidate === entry));

// ---------------------------------------------------------------------------
// 3. The lane boundary.
// ---------------------------------------------------------------------------

// Owned exclusively by the evidence-completion lane. This lane does not open
// them. `implement-rcap-official-forms-d1.mjs` is shared between the lanes and
// is split by region rather than by file, so the split is stated.
const EVIDENCE_LANE_PATHS = [
  "scripts/rcap-official-forms/rcap-artifact-provenance.mjs",
  "scripts/rcap-official-forms/rcap-contact-sheet.mjs",
  "scripts/rcap-official-forms/rcap-pdf-rasterize.mjs",
  "scripts/verify-rcap-shared-pdf-contract.mjs",
  "scripts/generate-rcap-pdf-visual-evidence.mjs",
  "scripts/generate-rcap-finalized-artifact-audit.mjs"
];

const SHARED_FILE_SPLIT = [
  {
    path: "scripts/implement-rcap-official-forms-d1.mjs",
    thisLaneOwns: "the field census, the effective-label and widget-geometry capture, the call into decideBinding, and the caption-slot arbitration applied to its result",
    evidenceLaneOwns: "the artifactProvenance(...) call site and the artifact-provenance.json write beneath it",
    howTheSplitHolds: "the two regions do not overlap: this lane's edits end before the render block, and the provenance call reads `bindings` as an opaque array rather than any field this lane adds"
  }
];

// ---------------------------------------------------------------------------
// 4. The escalations this lane owns.
// ---------------------------------------------------------------------------

const escalationsIn = readJson(ESCALATIONS_IN);
const escalationById = new Map(escalationsIn.escalations.map((e) => [e.id, e]));

const OWNED = {
  "ESC-GEOMETRY-NOT-AN-INPUT": {
    modules: [
      "scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs",
      "scripts/rcap-official-forms/rcap-field-semantics.mjs",
      "scripts/implement-rcap-official-forms-d1.mjs",
      "scripts/rcap-official-forms/rcap-official-form-finalize.mjs"
    ],
    contract: "decideBinding(field, options) — `field` gains `rect` and `regionHeading`; a binding whose widget falls inside a page region whose printed heading is protected is refused on geometry whatever the field is called",
    reviewerConditionFailed: "protection established by geometry where required, not label alone",
    familyOwnedFollowUp: "re-derive each field map and re-render. The maps are generated, so no family file is hand-edited.",
    reproductionFixture: "a synthesised AcroForm whose protected widget is named innocuously and sits under a printed protected heading",
    baselineFailure: "the widget binds a participant fact because only its name reaches the binder",
    negativeControl: "an identically-named widget outside any protected region still binds"
  },
  "ESC-CAPTION-VARIANTS": {
    modules: [
      "scripts/rcap-official-forms/rcap-field-semantics.mjs",
      "scripts/implement-rcap-official-forms-d1.mjs",
      "scripts/rcap-official-forms/rcap-official-form-finalize.mjs"
    ],
    contract: "selectOnePerCaptionSlot(candidates) — among writable widgets that carry the same fact and overlap on a page, exactly one survives; and an unselected choice field's prompt is cleared before flatten",
    reviewerConditionFailed: "no clipping, no silent truncation, no duplicated preprinted caption",
    familyOwnedFollowUp: "re-render the five Nebraska families and read the caption band in the raster",
    reproductionFixture: "a synthesised page with two overlapping widgets binding one fact, plus a dropdown whose default option is a chooser prompt",
    baselineFailure: "both widgets bind and render ~5pt apart, and the unselected prompt flattens to ink",
    negativeControl: "two widgets carrying the same fact that do NOT overlap both survive — a form may legitimately repeat a caption fact on two lines"
  },
  "ESC-VALUE-NOT-VISIBLE": {
    modules: [
      "scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs",
      "scripts/implement-rcap-official-forms-d1.mjs",
      "scripts/rcap-official-forms/rcap-official-form-finalize.mjs"
    ],
    contract: "captureWidgetContext(page, widgets) — a widget whose name carries no words is given the printed caption beside or above it as its effectiveLabel",
    reviewerConditionFailed: "expected participant values visibly present",
    familyOwnedFollowUp: "re-render VT 600-00228 and confirm the applicant fields carry values",
    reproductionFixture: "a synthesised AcroForm whose field is named `2` under a printed `Name` caption",
    baselineFailure: "every descriptor refuses no_allowlisted_fact_matches and the form fills nothing",
    negativeControl: "a bare-digit field under a printed protected caption is still refused — the label channel must not become a way around the protect rules"
  }
};

const assetIdByFamily = new Map(batchManifest.families.map((f) => [f.familyId, `${f.jurisdiction}|${f.documentId}|${f.sourceSha256}`]));
const correctionFamilyIds = new Set(correctionFamilies.map((f) => f.familyId));

const ownedEscalations = Object.entries(OWNED).map(([id, owned]) => {
  const escalation = escalationById.get(id) ?? fail(`${id} is not in the escalation register`);
  const families = escalation.affectedFamilies ?? [];
  const outsideDenominator = families.filter((f) => !correctionFamilyIds.has(f));
  return {
    escalationId: id,
    sharedModules: owned.modules.map((candidate) => ({
      path: candidate,
      exists: fs.existsSync(abs(candidate)),
      isApplicationInput: insideSet(candidate, APPLICATION_INPUT_PATHS),
      isWorkerImageInput: insideSet(candidate, IMAGE_INPUT_PATHS)
    })),
    exactContract: owned.contract,
    affectedFamilyIds: families,
    affectedAssetIds: families.map((f) => assetIdByFamily.get(f) ?? null).filter(Boolean),
    familiesAffected: families.length,
    familiesOutsideTheCorrectionDenominator: outsideDenominator,
    reviewerConditionFailed: owned.reviewerConditionFailed,
    currentBehaviour: escalation.currentBehaviour,
    requiredBehaviour: escalation.requiredBehaviour,
    smallestSharedCorrection: escalation.requiredBehaviour,
    reproductionFixture: owned.reproductionFixture,
    baselineFailure: owned.baselineFailure,
    negativeControl: owned.negativeControl,
    mutationThatMustTurnRed: escalation.mutationThatShouldFail,
    whyNoFamilyCorrectionSubstitutes: escalation.whyNoFamilyCorrectionSolvesIt,
    familyOwnedWorkRemainingAfterwards: owned.familyOwnedFollowUp
  };
});

const NOT_OWNED = escalationsIn.escalations.filter((e) => !OWNED[e.id]).map((e) => ({
  escalationId: e.id,
  owner: e.id === "ESC-SIDECAR-NONCONFORMANT"
    ? "claude/rcap-gate-b-pdf-evidence-completion — the evidence-completion lane holds the sidecar schema, its writer, its call sites, its verification and the raster evidence exclusively"
    : "closed on this branch's ancestor f974a96a, before this lane opened",
  state: e.id === "ESC-SIDECAR-NONCONFORMANT" ? "open, another lane's" : "corrected"
}));

// Every implementation path this lane may touch. An edit to a path absent from
// this list is a boundary violation, not a judgement call.
const CHANGE_PATHS = [
  "scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs",
  "scripts/rcap-official-forms/rcap-field-semantics.mjs",
  "scripts/rcap-official-forms/rcap-official-form-finalize.mjs",
  "scripts/rcap-official-forms/rcap-active-content.mjs",
  "scripts/implement-rcap-official-forms-d1.mjs",
  "scripts/verify-rcap-official-forms-d1.mjs",
  "scripts/verify-rcap-field-semantics-canaries.mjs",
  "scripts/verify-rcap-widget-geometry-canaries.mjs",
  "scripts/generate-rcap-gate-b-shared-correction-plan.mjs",
  "scripts/generate-rcap-gate-b-rerender-handoff.mjs",
  "scripts/generate-rcap-gate-b-correction-wave.mjs"
];

const changePathClassification = CHANGE_PATHS.map((candidate) => ({
  path: candidate,
  exists: fs.existsSync(abs(candidate)),
  isApplicationInput: insideSet(candidate, APPLICATION_INPUT_PATHS),
  isWorkerImageInput: insideSet(candidate, IMAGE_INPUT_PATHS),
  claimedByEvidenceLane: EVIDENCE_LANE_PATHS.includes(candidate)
}));

const collisions = changePathClassification.filter((p) => p.claimedByEvidenceLane);
if (collisions.length > 0) fail(`these paths are claimed by the evidence-completion lane and must not be edited here: ${collisions.map((c) => c.path).join(", ")}`);

const insideEitherSet = changePathClassification.filter((p) => p.isApplicationInput || p.isWorkerImageInput);

const familiesUnblocked = [...new Set(ownedEscalations.flatMap((e) => e.affectedFamilyIds))].sort();

const plan = {
  schemaVersion: "rcap-pdf-gate-b-shared-correction-plan/v1",
  generatedBy: "scripts/generate-rcap-gate-b-shared-correction-plan.mjs",
  purpose:
    "The ownership manifest for the Gate B shared-PDF correction lane: the frozen 26-family correction denominator, the three escalations this lane owns, every implementation path it may touch classified against the release-input sets, and the boundary against the evidence-completion lane.",
  lane: {
    branch: "claude/rcap-gate-b-shared-pdf-corrections",
    branchedFrom: "the current tip of the PDF implementation history, which contains the canonical approval-channel commit 080c2013",
    ownsEscalations: Object.keys(OWNED),
    doesNotOwn: NOT_OWNED,
    evidenceLaneExclusivePaths: EVIDENCE_LANE_PATHS,
    sharedFilesSplitByRegion: SHARED_FILE_SPLIT,
    mayNotDo: [
      "modify a family source binary, source receipt, field map, overlay profile, classification, fixture, finalized artifact, provenance sidecar or contact sheet",
      "rerender any family; the PDF implementation lane owns that and receives a handoff instead",
      "edit an independent-review verdict, self-approve a family, or hand-edit a register count",
      "merge to main, publish a worker, deploy, or touch hosted acceptance"
    ]
  },
  denominator: {
    familiesReviewed: verdictRows.length,
    correctionRequired: corrections.length,
    formerlySourceIdentityUnresolved: formerlyUnresolved,
    approvedThroughThisBatch: rollup.totals.approvedPlatformReady,
    frozenFrom: GROUP_RECORDS,
    crossCheckedAgainst: [VERDICT_ROLLUP, BATCH_MANIFEST],
    familiesWithEvidenceMissingOnThisBranch: missingEvidence.map((f) => f.familyId),
    howAMissingFileIsTreated:
      "counted. The denominator is the reviewer's decision, not the contents of this branch's working tree, so a family whose artifact is absent here is reported as absent and still carried.",
    families: correctionFamilies
  },
  releaseInputClassification: {
    workerImageInputPaths: IMAGE_INPUT_PATHS,
    workerImageInputPathsReadFrom: "scripts/generate-rcap-staging-action.mjs",
    applicationInputPaths: APPLICATION_INPUT_PATHS,
    changePaths: changePathClassification,
    pathsInsideEitherSet: insideEitherSet.map((p) => p.path),
    applicationInputChange: insideEitherSet.some((p) => p.isApplicationInput),
    workerInputChange: insideEitherSet.some((p) => p.isWorkerImageInput),
    verdict: insideEitherSet.length === 0
      ? "Every path this lane touches is outside both the worker image-input set and the application input set. The corrections run at build time in this repository and are not reachable from the worker image even transitively: the Dockerfile copies scripts/rcap-render-worker.mjs, scripts/lib/ and src/, and none of those reference scripts/rcap-official-forms/. No rebuild, no republication, no Gate A effect."
      : "At least one path is inside a release-input set. The work continues on this branch and is flagged for a later Gate B source freeze; it is not merged during the hosted-acceptance run and no worker is rebuilt or republished.",
    laterGateBSourceFreezeRequired: insideEitherSet.length > 0
  },
  escalations: ownedEscalations,
  totals: {
    escalationsOwned: ownedEscalations.length,
    escalationsNotOwned: NOT_OWNED.length,
    familiesWaitingOnThisLane: familiesUnblocked.length,
    correctionFamilies: correctionFamilies.length
  },
  familiesWaitingOnThisLane: familiesUnblocked
};

const serialized = JSON.stringify(plan, null, 2) + "\n";

if (checkOnly) {
  const existing = fs.existsSync(abs(OUT)) ? fs.readFileSync(abs(OUT), "utf8") : null;
  if (existing !== serialized) fail(`${OUT} is stale; regenerate it`);
  console.log(`OK Gate B shared-correction plan — ${OUT} is current`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true });
fs.writeFileSync(abs(OUT), serialized);

console.log(
  `OK Gate B shared-correction plan — ${corrections.length} correction families frozen, ` +
    `${ownedEscalations.length} escalations owned (${familiesUnblocked.length} families waiting), ` +
    `${changePathClassification.length} change paths classified, ` +
    `${insideEitherSet.length} inside a release-input set.`
);
