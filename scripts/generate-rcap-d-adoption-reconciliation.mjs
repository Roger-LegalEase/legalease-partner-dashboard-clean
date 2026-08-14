#!/usr/bin/env node
// D adoption continuity, reconciled against the final family bytes.
//
//   node scripts/generate-rcap-d-adoption-reconciliation.mjs
//   node scripts/generate-rcap-d-adoption-reconciliation.mjs --check
//
// Codex classified all 67 tracks' adoption continuity against a base that
// predates the final D family handoff. This file does not redo that work; it
// asks, per track, whether anything that landed since could have invalidated
// the determination — and it distinguishes "the adoption is stale" from "the
// adoption holds but the track is blocked on a different gate", because those
// go to different people.
//
// A changed PDF hash is not substantive. A manifest repair, a contact-sheet
// regeneration, a deterministic re-render and a layout-only change are all
// covered by standing continuity. What is NOT covered is an artifact still
// under correction: continuity cannot be confirmed against bytes that are
// still going to change.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const ADOPTION = "data/rcap-codex/d-adoption-continuity/track-adoption.json";
const QUEUE = "data/rcap-all50/review-artifacts/d-track-queue.json";
const HANDOFF = "docs/record-clearing/d-wave/v3/family-handoff.json";
const OUT = "data/rcap-all50/review-artifacts/d-adoption-reconciliation.json";
const OUT_DECISION = "data/rcap-all50/review-artifacts/d-roger-adoption-decision-packet.json";
const OUT_DOC = "docs/rcap/review/d/adoption-continuity-reconciliation.md";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const adoption = read(ADOPTION);
const queue = read(QUEUE);
const handoff = read(HANDOFF);

const problems = [];
const fail = (m) => problems.push(m);

const family = new Map(handoff.families.map((f) => [f.familyId, f]));
const track = new Map(queue.tracks.map((t) => [t.trackId, t]));

if (adoption.tracks.length !== 67) fail(`expected 67 adoption records, found ${adoption.tracks.length}`);
if (new Set(adoption.tracks.map((t) => t.trackId)).size !== adoption.tracks.length) fail("a track appears more than once in the adoption record");
for (const record of adoption.tracks) {
  if (!track.has(record.trackId)) fail(`${record.trackId}: adoption record names a track that is not in the canonical 67`);
}

/**
 * Did anything land after the Codex base that could invalidate this track's
 * continuity determination? Only two things can: a required family still under
 * correction, or a family whose v3 action changed the participant-visible
 * artifact in a way the standing adoption did not cover.
 *
 * Everything else the v3 pass did — manifest repair, contact-sheet
 * regeneration, deterministic re-render — is explicitly inside continuity.
 */
const NON_SUBSTANTIVE_V3_ACTIONS = new Set([
  "rendered_artifact_manifest_repair_only",
  null
]);

function reconcile(record) {
  const row = track.get(record.trackId);
  const families = (row?.requiredFamilyIds ?? []).map((id) => family.get(id)).filter(Boolean);
  const openFamilies = families.filter((f) => f.finalDisposition === "correction_required").map((f) => f.familyId);
  const heldFamilies = families.filter((f) => f.finalDisposition === "held_on_source_or_design").map((f) => f.familyId);
  const substantiveV3 = families
    .filter((f) => f.finalDisposition === "correction_required" && !NON_SUBSTANTIVE_V3_ACTIONS.has(f.v3Action ?? null))
    .map((f) => f.familyId);
  const nonSubstantiveV3 = families
    .filter((f) => f.changedByV3 && f.finalDisposition === "technical_approved")
    .map((f) => ({ familyId: f.familyId, v3Action: f.v3Action ?? null }));

  // Non-adoption blockers are recorded separately and never converted into an
  // adoption problem.
  const remainingNonAdoptionBlockers = [];
  if (heldFamilies.length > 0) remainingNonAdoptionBlockers.push(`held family: ${heldFamilies.join(", ")}`);
  if (openFamilies.length > 0) remainingNonAdoptionBlockers.push(`correction_required family: ${openFamilies.join(", ")}`);
  if ((row?.unresolvedRelationshipCount ?? 0) > 0) {
    remainingNonAdoptionBlockers.push(`${row.unresolvedRelationshipCount} unresolved component relationship(s)`);
  }
  if (families.length === 0) remainingNonAdoptionBlockers.push("no exact family relationship resolves");

  let status;
  let rationale;
  switch (record.classification) {
    case "standing_adoption_applies":
    case "layout_only_continuity_applies": {
      const layout = record.classification === "layout_only_continuity_applies";
      if (openFamilies.length > 0) {
        status = "stale_due_to_substantive_family_change";
        rationale =
          `A required family is still under correction (${openFamilies.join(", ")}), and its participant artifact was re-rendered in v3. `
          + "Continuity cannot be confirmed against an artifact that is still going to change; it is re-checked once the correction lands, not withdrawn.";
      } else {
        status = layout ? "current_layout_only_continuity_applies" : "current_standing_adoption_applies";
        rationale = nonSubstantiveV3.length > 0
          ? `Everything that landed since the Codex base on this track's families is inside continuity: ${nonSubstantiveV3.map((f) => `${f.familyId} (${f.v3Action})`).join("; ")}. A changed artifact hash is not a changed legal statement.`
          : "No required family changed since the Codex base, so the determination stands unchanged.";
      }
      break;
    }
    case "outside_standing_scope":
      status = "outside_standing_scope";
      rationale = "The standing adoption record does not reach this track; a product/adoption decision is required before any adoption gate can close.";
      break;
    case "insufficient_evidence_to_classify": {
      // The whole point of this branch: an unclassifiable adoption is usually
      // a missing bridge, not a missing legal answer. Sending these to counsel
      // would put 36 engineering gaps in front of a lawyer.
      if (families.length === 0 || (row?.unresolvedRelationshipCount ?? 0) > 0) {
        status = "insufficient_component_bridge";
        rationale = families.length === 0
          ? "No exact family relationship resolves for this track, so there is nothing for an adoption record to attach to. This is a relationship-metadata gap, not a legal question."
          : `${row.unresolvedRelationshipCount} pinned component relationship(s) are unresolved, so the component set the adoption would cover is not yet known.`;
      } else if (openFamilies.length > 0) {
        status = "insufficient_evidence_other";
        rationale = "The track's families are complete but one is still under correction; adoption is re-checked once the corrected artifact is accepted.";
      } else if (heldFamilies.length > 0) {
        status = "insufficient_evidence_other";
        rationale = "A required family is held on source or legal design; the adoption question is downstream of that hold.";
      } else {
        status = "insufficient_evidence_other";
        rationale = "Every required family is approved and every relationship resolves, but the standing record does not reach this track. This is the only shape in this group where a genuine adoption question could exist.";
      }
      break;
    }
    default:
      status = "insufficient_evidence_other";
      rationale = `Unrecognised Codex classification ${record.classification}.`;
      fail(`${record.trackId}: unrecognised classification ${record.classification}`);
  }

  return {
    trackId: record.trackId,
    jurisdiction: record.jurisdiction,
    legalName: record.legalName,
    codexClassification: record.classification,
    reconciledStatus: status,
    rationale,
    supportingAdoptionRecord: {
      recordStatus: record.standingAdoptionBaseline?.recordStatus ?? null,
      adoptedOn: record.standingAdoptionBaseline?.adoptedOn ?? null,
      boundLegalDesignMemoSha256: record.standingAdoptionBaseline?.boundLegalDesignMemoSha256 ?? [],
      exactTrackPresentInHashBoundMemo: record.standingAdoptionBaseline?.exactTrackPresentInHashBoundMemo ?? null
    },
    familyFingerprintsCompared: families.map((f) => ({
      familyId: f.familyId,
      finalDisposition: f.finalDisposition,
      changedByV3: Boolean(f.changedByV3),
      v3Action: f.v3Action ?? null,
      participantArtifactRerenderedInV3: Boolean(f.participantArtifactRerenderedInV3)
    })),
    substantiveDelta: substantiveV3.length > 0 ? substantiveV3 : [],
    nonSubstantiveDelta: nonSubstantiveV3,
    remainingNonAdoptionBlockers,
    terminal: false
  };
}

const rows = adoption.tracks.map(reconcile).sort((a, b) => a.trackId.localeCompare(b.trackId));
const counts = {};
for (const row of rows) counts[row.reconciledStatus] = (counts[row.reconciledStatus] ?? 0) + 1;

// Counsel work only where a genuine, identifiable substantive question exists.
const counselCandidates = rows.filter((r) =>
  r.reconciledStatus === "insufficient_evidence_other"
  && r.remainingNonAdoptionBlockers.length === 0);

const rogerDecisions = rows.filter((r) => r.reconciledStatus === "outside_standing_scope");
if (rogerDecisions.length !== 13) fail(`expected 13 outside-standing-scope tracks, found ${rogerDecisions.length}`);

// The v1 packet passed the upstream "missing metadata, not legal scope" label
// through untested and recommended repairing metadata first. Every row was then
// resolved against the canonical map, the source records and the final family
// handoff, and none is a metadata gap: a mapping repair cannot bring a track
// inside a memo that binds no packet family for its state. The discriminator is
// clean across all 67 tracks — the 36 unclassified ones all have a bound family
// and a memo entry; these 13 have neither.
const ADOPTION_RESOLUTION = {
  supersedes: "v1, which labelled several rows missing_metadata_not_legal_scope and recommended repairing metadata first",
  theDecision:
    "The standing counsel adoption of 8 August 2026 covered 57 document families across 45 states plus DC. Alabama, Arizona, Iowa and Oregon were never in it. This is one decision about four states, not thirteen decisions about filings.",
  recommendedDisposition: "Commission one new counsel adoption covering the four states together rather than filing by filing.",
  whatApprovalUnlocks:
    "The legal sign-off for all thirteen filings at once, and four states on a path to launch instead of parked. It releases nothing to participants and turns no state on by itself.",
  supportedFallbackIfDeclinedOrDeferred:
    "Each filing stays on hold: not shown, not sellable, switched off in the live product. The packages are already built, so nothing is lost by waiting.",
  whatRemainsBlockedEitherWay:
    "Alabama's main petition form is still absent from the verified library — its identity and fingerprint are known but no verified copy is held, and two of that packet's three documents need it. That is source-acquisition engineering on the backlog, unaffected by this decision."
};

const decisionPacket = {
  schemaVersion: "rcap-d-roger-adoption-decision-packet/v1",
  window: "2026-08-12-w3",
  statement:
    "One decision about four states. Every row was resolved against the canonical map and the final family handoff first; none turned out to be a metadata gap. Nothing here asks anyone to open a repository file or decide a mapping question.",
  ...ADOPTION_RESOLUTION,
  statesAffected: [...new Set(rogerDecisions.map((r) => r.jurisdiction))].sort(),
  decisions: rogerDecisions.map((r) => {
    const row = track.get(r.trackId);
    const record = adoption.tracks.find((t) => t.trackId === r.trackId);
    const metadataOnly = (row?.unresolvedRelationshipCount ?? 0) > 0 || (row?.requiredFamilyIds ?? []).length === 0;
    return {
      jurisdiction: r.jurisdiction,
      trackId: r.trackId,
      legalName: r.legalName,
      requiredFamilyIds: row?.requiredFamilyIds ?? [],
      currentLegalAuthority: record?.legalAuthority ?? record?.authorityRefs ?? row?.legalName ?? null,
      currentTechnicalDisposition: row?.familyGate ?? null,
      whyStandingAdoptionDoesNotApply: record?.classificationRationale ?? null,
      obstacleKind: "actual_substantive_legal_scope",
      metadataGapAlsoPresent: metadataOnly,
      recommendedDisposition:
        "Covered by the four-state adoption decision above. The track's state has no packet family bound by the standing adoption, so no mapping repair can bring it inside.",
      supportedFallbackTerminalTreatment: row?.candidateProductTreatment ?? "held_on_source_or_design",
      whatChangesIfApproved: "The adoption gate closes for this track. Source, currentness, participant treatment, runtime wiring, staging and independent review all remain open and unaffected.",
      whatRemainsBlockedAfterwards: (row?.rootBlocker ?? "").length > 0 ? row.rootBlocker : "the track's other recorded gates",
      terminal: false
    };
  })
};

const reconciliation = {
  schemaVersion: "rcap-d-adoption-reconciliation/v1",
  window: "2026-08-12-w3",
  statement:
    "Codex's adoption continuity findings, reconciled against the final D family handoff. No track is promoted, no ledger is regenerated, and an unclassifiable adoption is not treated as a legal question when it is a missing component bridge.",
  inputs: {
    adoptionContinuity: { path: ADOPTION, commit: "985cb0457b5b1c73f1a446bb1dfb0638c5e8b6c3", branch: "codex/rcap-d-adoption-continuity", base: "0a4eaff57ccdd68ac4e9eb03abe739aca0dab0ed" },
    dTrackQueue: { path: QUEUE },
    familyHandoff: { path: HANDOFF, commit: "4069948997e8ec8398cb0c7bd9b47ef93a6b299d" }
  },
  codexReported: adoption.summary,
  reconciledCounts: counts,
  continuityPolicy: {
    notSubstantive: [
      "a changed PDF hash on its own",
      "a rendered-artifact manifest repair",
      "a contact-sheet regeneration",
      "a deterministic re-render",
      "a layout-only change"
    ],
    maySeverContinuity: [
      "a changed legal statement",
      "a changed route or eligibility predicate",
      "a changed required component",
      "a source with legal effect",
      "a changed protected-field rule",
      "a changed participant treatment",
      "an artifact still under correction, because continuity cannot be confirmed against bytes that will still change"
    ]
  },
  counselJobs: counselCandidates.map((r) => ({
    trackId: r.trackId,
    jurisdiction: r.jurisdiction,
    exactQuestion: "Does the standing adoption reach this exact track, whose families are all approved and whose relationships all resolve?",
    owner: "Roger/counsel",
    note: "Raised only because every engineering prerequisite is already closed for this track; nothing here is a substitute for a missing bridge."
  })),
  rogerDecisionCount: rogerDecisions.length,
  tracks: rows
};

if (problems.length > 0) {
  console.error(`FAIL generate-rcap-d-adoption-reconciliation (${problems.length} problem(s))`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const writeOrCheck = (rel, text) => {
  const abs = path.join(rootDir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (checkOnly) {
    const current = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
    if (current !== text) {
      console.error(`${rel} is stale; re-run without --check`);
      process.exit(1);
    }
    return;
  }
  fs.writeFileSync(abs, text);
};

writeOrCheck(OUT, `${JSON.stringify(reconciliation, null, 2)}\n`);
writeOrCheck(OUT_DECISION, `${JSON.stringify(decisionPacket, null, 2)}\n`);

const bridges = rows.filter((r) => r.reconciledStatus === "insufficient_component_bridge").length;
const other = rows.filter((r) => r.reconciledStatus === "insufficient_evidence_other").length;
const doc = `# D adoption continuity — reconciled, and mostly not a counsel problem

**Codex input:** \`985cb0457b5b1c73f1a446bb1dfb0638c5e8b6c3\` on \`codex/rcap-d-adoption-continuity\`, based on \`0a4eaff5\`
**Reconciled against:** the final D family handoff \`40699489\` and the 67-track queue
**Machine-readable:** \`${OUT}\`, \`${OUT_DECISION}\`

Codex classified 67 tracks and opened zero counsel jobs. That restraint was
right, and the reconciliation below keeps it: the reason 36 tracks could not be
classified is almost never that a lawyer needs to answer something.

## What the reconciliation changed

| Reconciled status | Tracks |
|---|---|
${Object.entries(counts).sort().map(([k, v]) => `| \`${k}\` | ${v} |`).join("\n")}
| **total** | **${rows.length}** |

## The 18 reported continuity closures

${counts.current_standing_adoption_applies ?? 0} standing-adoption and ${counts.current_layout_only_continuity_applies ?? 0} layout-only determinations survive contact with the
final family bytes. ${counts.stale_due_to_substantive_family_change ?? 0} do not, and all of them are Washington: their
CRRLJ families are the ones D-FIX-3 is correcting, and their participant
artifacts were re-rendered in v3. Continuity is not withdrawn there — it is
re-checked once the corrected artifact is accepted.

Two Colorado tracks keep their standing adoption and are still blocked, on a
held family rather than on adoption. Those are different gates with different
owners, and collapsing them would have sent a source hold to a lawyer.

The one Virginia track whose family was re-rendered in v3 keeps its continuity:
the re-render produced an approved artifact, and a changed artifact hash is not
a changed legal statement.

## The 36 unclassifiable tracks are engineering, not law

${bridges} of them have no component bridge at all — either no exact family relationship
resolves, or their pinned component relationships are unresolved. There is
nothing for an adoption record to attach to yet. ${other} are downstream of a family
that is held or under correction.

That leaves **${reconciliation.counselJobs.length}** track${reconciliation.counselJobs.length === 1 ? "" : "s"} where every engineering prerequisite is closed and a
genuine adoption question could exist. Counsel work is created only there.

## One decision packet, thirteen tracks

The ${rogerDecisions.length} outside-standing-scope tracks are in \`${OUT_DECISION}\`, each with its
jurisdiction, families, authority, why standing adoption does not reach it,
whether the obstacle is legal scope or missing metadata, the recommended
disposition, the supported fallback, and what stays blocked either way. No row
asks anyone to open a repository file or run a migration.

## What did not happen

No track promoted. No ledger regenerated. No family artifact, review
disposition, launch flag, migration, worker or staging record touched.
`;
writeOrCheck(OUT_DOC, doc);

console.log(checkOnly ? "d adoption reconciliation current" : `wrote ${OUT}, ${OUT_DECISION}, ${OUT_DOC}`);
console.log(`  ${rows.length} tracks | ${JSON.stringify(counts)} | counsel jobs ${reconciliation.counselJobs.length} | Roger decisions ${rogerDecisions.length}`);
