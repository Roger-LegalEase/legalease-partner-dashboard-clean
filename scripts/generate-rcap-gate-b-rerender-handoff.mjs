#!/usr/bin/env node
// The family rerender handoff for the Gate B shared corrections.
//
//   node scripts/generate-rcap-gate-b-rerender-handoff.mjs
//   node scripts/generate-rcap-gate-b-rerender-handoff.mjs --check
//
// This lane corrects shared modules and does not rerender anything. That is
// the whole discipline: a family map is generated, so hand-editing one leaves
// the defect live for every family derived afterwards, and rerendering here
// would put new artifact bytes under review records that describe the old
// ones. The PDF implementation lane owns the rerender.
//
// So this is what that lane needs and nothing else: per correction, the commit,
// the module, the families, the exact command, the verifiers, the artifacts to
// expect, the review findings each rerender is expected to close, and whether
// any family-owned work remains after it.
//
// It also states plainly what a rerender does NOT do. A corrected module and a
// fresh artifact are not an approval. The sequence is unchanged:
//
//   shared correction → family rerender → new artifact hashes →
//   independent re-review → canonical approved record → platform_ready
//
// The 26 correction records stand as history either way.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const PLAN_IN = "data/rcap-all50/gate-b-shared-correction-plan.json";
const OUT = "data/rcap-all50/gate-b-family-rerender-handoff.json";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));

function fail(message) {
  console.error(`FAIL Gate B rerender handoff — ${message}`);
  process.exit(1);
}

/** Resolves a correction commit by its subject line, so the record names bytes rather than a description. */
function commitBySubject(subject) {
  try {
    const sha = execFileSync("git", ["log", "--format=%H", "--fixed-strings", `--grep=${subject}`, "-1", "HEAD"],
      { cwd: rootDir, encoding: "utf8" }).trim();
    return sha || null;
  } catch { return null; }
}

const plan = readJson(PLAN_IN);
const planByEscalation = new Map(plan.escalations.map((e) => [e.escalationId, e]));

// The canonical generator. Both corrections are re-derived by the same driver
// over the same mounted corpus; there is no per-escalation rerender path and
// inventing one would be a second pipeline.
const RERENDER_COMMAND =
  "RCAP_BUNDLE_EXTRACT=<path to the mounted Expungement_AI_RCAP_Master_Library_Edition_1 extract> " +
  "node scripts/implement-rcap-official-forms-d1.mjs";

const RERENDER_PRECONDITIONS = [
  "the Master Library extract is mounted and each family's source-record.json sha256 recomputes from the actual bytes; the driver refuses a family on source drift rather than rendering from bytes the record does not describe",
  "a family whose overlay-profile.json carries an approved independent review is skipped by the driver by design — regenerating a reviewed family is a deliberate act and the approval is deleted first"
];

const FOCUSED_VERIFIERS = [
  "node scripts/verify-rcap-widget-geometry-canaries.mjs",
  "node scripts/verify-rcap-field-semantics-canaries.mjs",
  "node scripts/verify-rcap-official-forms-d1.mjs",
  "node scripts/verify-rcap-shared-pdf-contract.mjs"
];

const EXPECTED_ARTIFACTS = [
  "production-field-map.json",
  "field-census.json",
  "field-classification.json",
  "fixtures/canonical-filled.pdf",
  "fixtures/boundary-filled.pdf",
  "contact-sheet/blank-vs-filled.pdf",
  "reports/protected-fields.json",
  "reports/populated-fields.json",
  "reports/overflow-and-clipping.json"
];

const CORRECTIONS = [
  {
    id: "the label and geometry channel",
    closes: ["ESC-VALUE-NOT-VISIBLE", "ESC-GEOMETRY-NOT-AN-INPUT"],
    subject: "the binder can see the page now",
    sharedModulesChanged: [
      "scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs",
      "scripts/rcap-official-forms/rcap-field-semantics.mjs",
      "scripts/rcap-official-forms/rcap-official-form-finalize.mjs",
      "scripts/implement-rcap-official-forms-d1.mjs"
    ],
    whatChangesInARerender: [
      "field-census.json entries gain effectiveLabel, labelBasis, regionHeading and regionBasis, measured from each page's own content stream",
      "bindings gain factBasis, which says whether the field's name or the form's printed caption produced the fact",
      "a binding inside a protected page region is refused with reason protected_page_region and the heading that refused it"
    ],
    familyOwnedWorkRemaining:
      "none expected. The maps are generated; a binding that disappears does so because a shared rule refused it, and a binding that appears does so because the form's own printed caption named the box. No explicitFieldMappings should need adding — for VT 600-00228 in particular, adding them was the local workaround the freeze forbade."
  },
  {
    id: "one widget per slot, and the chooser prompt",
    closes: ["ESC-CAPTION-VARIANTS"],
    subject: "one widget per slot, and no chooser prompt on a filed page",
    sharedModulesChanged: [
      "scripts/rcap-official-forms/rcap-field-semantics.mjs",
      "scripts/rcap-official-forms/rcap-official-form-finalize.mjs",
      "scripts/implement-rcap-official-forms-d1.mjs"
    ],
    whatChangesInARerender: [
      "overlapping widgets carrying one fact collapse to a single binding; the losers move into bindingRefusals as duplicate_widget_for_one_slot naming which widget was kept instead",
      "the finalize report gains slotArbitration (candidates, kept, refusedAsDuplicate) and promptsSuppressed",
      "an unselected chooser's prompt no longer appears in the finalized page's content stream, so the contact sheet's filled panel loses 'Choose the court' and 'Choose the county'"
    ],
    familyOwnedWorkRemaining:
      "none expected, but the caption band is the thing to read in the raster. The arbitration decides by a stated order — text before choice field, then larger, then topmost, leftmost, name — and if a Nebraska form turns out to want a different widget than that order picks, that is a finding against the order, which is shared, rather than against the family."
  }
];

const corrections = CORRECTIONS.map((correction) => {
  const escalations = correction.closes.map((id) => planByEscalation.get(id) ?? fail(`${id} is not in ${PLAN_IN}`));
  const families = [...new Set(escalations.flatMap((e) => e.affectedFamilyIds))].sort();
  const sha = commitBySubject(correction.subject);
  if (!sha) fail(`no commit on HEAD matches the subject ${JSON.stringify(correction.subject)}; the handoff must name real bytes`);

  const familyRows = families.map((familyId) => {
    const frozen = plan.denominator.families.find((f) => f.familyId === familyId) ?? null;
    return {
      familyId,
      jurisdiction: frozen?.jurisdiction ?? familyId.split(":")[0],
      assetId: frozen?.assetId ?? null,
      familyPath: frozen?.familyPath ?? null,
      sourceSha256: frozen?.sourceSha256 ?? null,
      reviewedFieldMapSha256: frozen?.fieldMapSha256 ?? null,
      reviewedClassificationSha256: frozen?.classificationSha256 ?? null,
      reviewedArtifactSha256: frozen?.artifactSha256 ?? null,
      reviewFindingToClose: frozen
        ? { page: frozen.page, fieldOrGeometry: frozen.fieldOrGeometry, observed: frozen.observed,
            required: frozen.required, smallestCorrection: frozen.smallestCorrection }
        : null,
      inCorrectionDenominator: Boolean(frozen)
    };
  });

  return {
    correction: correction.id,
    closesEscalations: correction.closes,
    correctionCommit: sha,
    correctionCommitSubject: correction.subject,
    sharedModulesChanged: correction.sharedModulesChanged,
    affectedFamilyIds: families,
    familiesAffected: families.length,
    exactRerenderCommand: RERENDER_COMMAND,
    rerenderPreconditions: RERENDER_PRECONDITIONS,
    focusedVerifiersRequired: FOCUSED_VERIFIERS,
    expectedArtifactOutputsPerFamily: EXPECTED_ARTIFACTS,
    whatChangesInARerender: correction.whatChangesInARerender,
    familyOwnedMapOrProfileChangesStillNecessary: correction.familyOwnedWorkRemaining,
    families: familyRows
  };
});

const allFamilies = [...new Set(corrections.flatMap((c) => c.affectedFamilyIds))].sort();
const denominatorIds = new Set(plan.denominator.families.map((f) => f.familyId));
// Which escalation each family is named in, read from the register rather than
// assumed. "Blocked" here means only that this lane's three corrections do not
// reach the family — not that nothing has been done for it. Most of these had
// their field findings closed on this branch's own ancestor by the first four
// corrections, and what remains for them is the sidecar, which is another
// lane's.
const ESCALATION_LANE = {
  "ESC-GEOMETRY-NOT-AN-INPUT": "this lane — corrected",
  "ESC-CAPTION-VARIANTS": "this lane — corrected",
  "ESC-VALUE-NOT-VISIBLE": "this lane — corrected",
  "ESC-MANUAL-NOT-NEVER-WRITE": "corrected on this branch's ancestor f974a96a",
  "ESC-NO-SSN-RULE": "corrected on this branch's ancestor f974a96a",
  "ESC-NO-REFUSE-WHEN": "corrected on this branch's ancestor f974a96a",
  "ESC-SERVICE-BLOCK-BY-NAME": "corrected on this branch's ancestor f974a96a",
  "ESC-SIDECAR-NONCONFORMANT": "the evidence-completion lane, exclusively"
};
const escalationRegister = readJson("data/rcap-all50/pdf-independent-reviews/shared-module-escalations.json");
const escalationsNamingFamily = (familyId) => escalationRegister.escalations
  .filter((e) => (e.affectedFamilies ?? []).includes(familyId))
  .map((e) => ({ escalationId: e.id, heldBy: ESCALATION_LANE[e.id] ?? "unassigned" }));

const stillBlocked = plan.denominator.families
  .filter((f) => !allFamilies.includes(f.familyId))
  .map((f) => {
    const named = escalationsNamingFamily(f.familyId);
    const open = named.filter((n) => n.heldBy === "the evidence-completion lane, exclusively");
    return {
      familyId: f.familyId,
      reason: "none of this lane's three corrections reach this family",
      namedInEscalations: named,
      waitingOn: open.length > 0
        ? open.map((o) => `${o.escalationId} — ${o.heldBy}`)
        : ["nothing this lane can see; its escalations are all closed, so it is the reviewer's to look at again"],
      fieldFindingsAlreadyClosed: named.every((n) => n.heldBy !== "unassigned" && !n.heldBy.startsWith("this lane"))
        && named.some((n) => n.heldBy.startsWith("corrected on"))
    };
  });

const handoff = {
  schemaVersion: "rcap-pdf-gate-b-family-rerender-handoff/v1",
  generatedBy: "scripts/generate-rcap-gate-b-rerender-handoff.mjs",
  purpose:
    "What the PDF implementation lane needs to rerender the families this lane's shared corrections unblock: the commit, the module, the families, the exact command, the verifiers, the expected outputs, and the review findings each rerender is expected to close.",
  handTo: "the PDF implementation lane — this lane rerenders nothing and modifies no family-owned file",
  whatThisIsNot:
    "not an approval, and not a promotion. A corrected module and fresh artifact bytes change what the reviewer is looking at; they do not change the verdict. The sequence is shared correction, family rerender, new artifact hashes, independent re-review, canonical approved record, and only then automatic platform_ready promotion. The 26 correction records remain historical whatever this produces.",
  sequenceThatMustFollow: [
    "shared correction (this lane, done)",
    "family rerender (PDF implementation lane)",
    "new artifact hashes",
    "independent re-review",
    "canonical approved record",
    "automatic platform_ready promotion"
  ],
  totals: {
    corrections: corrections.length,
    familiesUnblockedForRerender: allFamilies.length,
    familiesStillBlocked: stillBlocked.length,
    correctionDenominator: plan.denominator.correctionRequired
  },
  familiesUnblockedForRerender: allFamilies,
  familiesStillBlocked: stillBlocked,
  corrections
};

if (allFamilies.some((f) => !denominatorIds.has(f))) {
  fail(`the handoff names a family outside the frozen correction denominator: ${allFamilies.filter((f) => !denominatorIds.has(f)).join(", ")}`);
}
if (allFamilies.length + stillBlocked.length !== plan.denominator.correctionRequired) {
  fail(`${allFamilies.length} unblocked plus ${stillBlocked.length} blocked does not account for all ${plan.denominator.correctionRequired} correction families`);
}

const serialized = JSON.stringify(handoff, null, 2) + "\n";

if (checkOnly) {
  const existing = fs.existsSync(abs(OUT)) ? fs.readFileSync(abs(OUT), "utf8") : null;
  if (existing !== serialized) fail(`${OUT} is stale; regenerate it`);
  console.log(`OK Gate B rerender handoff — ${OUT} is current`);
  process.exit(0);
}

fs.writeFileSync(abs(OUT), serialized);
console.log(
  `OK Gate B rerender handoff — ${corrections.length} corrections, ` +
    `${allFamilies.length} families unblocked for rerender, ${stillBlocked.length} still blocked, ` +
    `${plan.denominator.correctionRequired} accounted for.`
);
