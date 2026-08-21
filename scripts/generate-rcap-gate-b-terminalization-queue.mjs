#!/usr/bin/env node
// The Gate B terminalization queue: every retained asset, one primary bucket,
// one blocker, one terminal target, one next action.
//
//   node scripts/generate-rcap-gate-b-terminalization-queue.mjs
//   node scripts/generate-rcap-gate-b-terminalization-queue.mjs --check
//
// Buckets are tested in a fixed order, so an asset can reach exactly one:
//
//   RETIRE_OR_REPOINT  the asset is a duplicate alias or carries no surviving
//                      operational dependency, so the question is whether it
//                      should exist at all;
//   SOURCE_REQUIRED    the official binary is absent, or the only open
//                      questions are about the source itself; nothing can be
//                      rendered or reviewed until that is settled;
//   RERENDER_REQUIRED  the source is in hand and something produced from it has
//                      to be produced again;
//   REVIEW_ONLY        nothing else is open; the asset is waiting on an
//                      independent approval the gate accepts.
//
// No asset carries "pending", "blocked" or "review required" as a root cause.
// Each blocker names the specific condition and the surface it sits on, because
// a queue whose reasons are generic cannot be worked in parallel: every lane
// has to re-derive the same facts before it can start.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const REGISTER = "data/rcap-all50/problematic-pdf-register.json";
const DETERMINATION = "data/rcap-all50/pdf-retirement-determination.json";
const LEDGER = "data/rcap-all50/pdf-independent-reviews/inventory-closure-ledger.json";
const OVERLAY = "data/rcap-all50/overlays/production";
const REVIEWS = "data/rcap-all50/pdf-independent-reviews";
const RASTERS = "docs/record-clearing/pdf-visual-evidence";
const SOURCE_POPULATION = "data/rcap-all50/source-population-reconciliation.json";
const OUT = "data/rcap-all50/gate-b-81-terminalization-queue.json";
const OUT_MD = "docs/record-clearing/gate-b-81-terminalization-queue.md";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));
const exists = (rel) => fs.existsSync(abs(rel));

function fail(message) {
  console.error(`FAIL terminalization queue — ${message}`);
  process.exit(1);
}

const register = readJson(REGISTER);
const sourcePopulation = fs.existsSync(abs(SOURCE_POPULATION)) ? readJson(SOURCE_POPULATION) : null;
const sourceStateByAsset = new Map((sourcePopulation?.assets ?? []).map((a) => [a.assetId, a.state]));
const determination = readJson(DETERMINATION);
const ledger = readJson(LEDGER);

/** Operational surfaces, as the binary-identity rules define them. */
const OPERATIONAL = new Set([
  "application_source", "overlay_factory_manifest", "legal_design_registry",
  "d_track_queue", "composed_routes", "guidance_packets", "terminalization_treatments",
  "track_terminalization_ledger", "all_state_build_manifest", "field_map_drafts"
]);
const PACKET_FAMILY = new Set(["composed_routes", "guidance_packets", "d_track_queue"]);

const RERENDER_CATEGORIES = new Set([
  "flat_overlay_geometry_or_readback", "visually_unsafe",
  "xfa_javascript_or_active_content_residue", "stale_contact_sheet_manifest_or_review_evidence",
  "multi_widget_ambiguity", "contact_sheet_shows_no_fill",
  "unfinalized_rendered_artifact", "missing_required_packet_component"
]);
const SOURCE_CATEGORIES = new Set(["missing_binary", "currentness_unverified", "stale_or_superseded"]);
const NON_DISCRIMINATING = new Set(["held_on_source_or_design", "never_independently_approved"]);

// The four families holding a current approved_platform_ready verdict the gate
// refuses. Their blocker is a proven contradiction between two clauses of the
// gate rather than anything a reviewer found, and it is named per asset below.
const APPROVED_BUT_REFUSED = new Set([
  "AK:tf-800-form-en", "AK:tf-805-form-en",
  "NC:aoc-cr-287-form-en", "NC:aoc-cr-288-form-en"
]);

const LANES = {
  REVIEW_ONLY: { lane: "LANE-REVIEW", owner: "independent review shard" },
  RERENDER_REQUIRED: { lane: "LANE-RERENDER", owner: "family rerender shard" },
  SOURCE_REQUIRED: { lane: "LANE-SOURCE", owner: "source acquisition shard" },
  RETIRE_OR_REPOINT: { lane: "LANE-RETIRE", owner: "retirement and repoint lane" }
};

const TERMINAL = {
  REVIEW_ONLY: "platform_ready",
  RERENDER_REQUIRED: "platform_ready",
  SOURCE_REQUIRED: "platform_ready, or retired once the source question is settled against it",
  RETIRE_OR_REPOINT: "retired_from_operational_inventory, or repointed to the canonical asset"
};

const determinationByAsset = new Map((determination.assets ?? []).map((a) => [a.assetId, a]));
const platformReadyIdentities = new Set((register.platformReady ?? []).map((p) => p.identity));

/** Where a family's package lives, if it has one. */
function packageDir(familyIds) {
  for (const familyId of familyIds ?? []) {
    const slug = String(familyId).split(":").pop();
    if (!exists(OVERLAY)) break;
    for (const state of fs.readdirSync(abs(OVERLAY))) {
      const candidate = path.join(OVERLAY, state, slug);
      if (exists(path.join(candidate, "source-record.json"))) return candidate;
    }
  }
  return null;
}

/** Which reviews name this family, and what the newest one said. */
const reviewByFamily = new Map();
for (const file of fs.readdirSync(abs(REVIEWS)).filter((f) => f.endsWith("-manifest.json"))) {
  const manifest = JSON.parse(fs.readFileSync(path.join(abs(REVIEWS), file), "utf8"));
  const batchId = manifest.batch ?? file.replace("-manifest.json", "");
  const groups = fs.readdirSync(abs(REVIEWS))
    .filter((f) => f.startsWith(`${batchId}-group-`) && f.endsWith(".review.json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(abs(REVIEWS), f), "utf8")));
  for (const g of groups) {
    for (const v of g.verdicts ?? []) {
      reviewByFamily.set(v.family, { batchId, verdict: v.verdict });
    }
  }
}

const rasterNames = exists(RASTERS) ? new Set(fs.readdirSync(abs(RASTERS))) : new Set();

function assetRecord(record) {
  const familyIds = record.familyIds ?? [];
  const familyId = familyIds[0] ?? null;
  const det = determinationByAsset.get(record.identity) ?? null;
  const surfaces = (det?.useSites ?? []).map((s) => s.surface);
  const operationalRefs = surfaces.filter((s) => OPERATIONAL.has(s));
  const legalDesignRefs = surfaces.filter((s) => s === "legal_design_registry");
  const packetFamilyRefs = surfaces.filter((s) => PACKET_FAMILY.has(s));

  const dir = packageDir(familyIds);
  const artifact = dir && exists(path.join(dir, "fixtures/canonical-filled.pdf"));
  const sidecar = dir && exists(path.join(dir, "artifact-provenance.json"));
  const slug = familyId ? String(familyId).split(":").pop() : null;
  const rasterPages = slug
    ? [...rasterNames].filter((n) => n.includes(`-${slug}-contact-sheet-page-`)).length
    : 0;

  const categories = new Set(record.defectCategories ?? []);
  const discriminating = [...categories].filter((c) => !NON_DISCRIMINATING.has(c));
  const review = familyIds.map((f) => reviewByFamily.get(f)).find(Boolean) ?? null;
  const approvedButRefused = familyIds.some((f) => APPROVED_BUT_REFUSED.has(f));

  const common = {
    assetId: record.identity,
    jurisdiction: record.jurisdiction,
    familyId,
    familyIds,
    formId: record.formId,
    sourceStatus: record.binaryPresent === true
      ? "official binary present in the clone and hashable"
      : "official binary absent from the clone",
    currentnessStatus: categories.has("currentness_unverified")
      ? `revision ${record.revision ?? "unrecorded"} is a candidate current source no independent currentness review has confirmed`
      : categories.has("stale_or_superseded")
        ? "recorded as stale or superseded"
        : `revision ${record.revision ?? "unrecorded"} carries no open currentness objection`,
    operationalReferences: operationalRefs,
    legalDesignReferences: legalDesignRefs,
    packetFamilyReferences: packetFamilyRefs,
    currentArtifactStatus: !dir ? "no family package exists"
      : artifact ? "canonical fixture present" : "family package exists and carries no canonical fixture",
    sidecarStatus: !dir ? "no family package exists"
      : sidecar ? "artifact-provenance.json present" : "no provenance sidecar",
    allPageEvidenceStatus: rasterPages > 0
      ? `${rasterPages} rasterised contact-sheet page(s) committed`
      : "no committed raster evidence",
    reviewStatus: approvedButRefused
      ? `approved_platform_ready in batch ${review?.batchId ?? "unknown"}, refused by the gate`
      : review ? `${review.verdict} in batch ${review.batchId}`
        : "never carried an independent review verdict",
    familyPackagePath: dir
  };

  // --- bucket 1: retire or repoint -----------------------------------------
  if (operationalRefs.length === 0) {
    return { ...common, primaryBucket: "RETIRE_OR_REPOINT",
      primaryBlocker: "no operational surface names this asset, so nothing depends on it and its continued retention is unexplained",
      nextAction: "prove the absence of every operational reference through the retirement determination, then retire it or record the repoint that keeps it" };
  }
  if (categories.has("stale_or_superseded")) {
    return { ...common, primaryBucket: "RETIRE_OR_REPOINT",
      primaryBlocker: `recorded stale or superseded while ${operationalRefs.length} operational surface(s) still name it: ${operationalRefs.join(", ")}`,
      nextAction: "repoint every operational reference to the successor asset, then retire this one under the binary-identity rules" };
  }

  // --- bucket 2: source required -------------------------------------------
  if (record.binaryPresent === false || categories.has("missing_binary")) {
    return { ...common, primaryBucket: "SOURCE_REQUIRED",
      primaryBlocker: `the official binary is absent from the clone, so its SHA-256 cannot be recomputed and neither a render nor a review can be performed; ${operationalRefs.length} operational surface(s) still name it`,
      nextAction: record.exactNextAction ?? "acquire the official source binary from the publisher of record and commit its source receipt, or prove no operational reference survives and retire it" };
  }
  if (discriminating.length > 0 && discriminating.every((c) => SOURCE_CATEGORIES.has(c))) {
    return { ...common, primaryBucket: "SOURCE_REQUIRED",
      primaryBlocker: `every open objection is about the source itself (${discriminating.join(", ")}), so the artifact cannot be trusted until the source identity is settled`,
      nextAction: record.exactNextAction ?? "confirm the official revision against the publisher and record the currentness finding, or record a supersession" };
  }

  // --- bucket 3: rerender required -----------------------------------------
  if (approvedButRefused) {
    // The narrowest possible correction, and the distinction matters: the PDF is
    // approved and must not be re-rendered. Only field-classification.json
    // changes, by gaining the two completeness counters, and the reviewer then
    // repins that one hash. Re-rendering here would discard four approvals to
    // fix a metadata omission.
    return { ...common, primaryBucket: "RERENDER_REQUIRED",
      subtype: "classification_metadata_only",
      primaryBlocker: "field-classification.json omits the canonical completeness counters classifiedFieldsOrAnchors and discoveredFieldsOrAnchors, so the gate refuses the family's current approved_platform_ready record; condition 5 additionally pins that file to the hash the reviewer approved, so the counters cannot be added without the reviewer repinning it",
      nextAction: "regenerate field-classification.json for this family so it carries classifiedFieldsOrAnchors equal to discoveredFieldsOrAnchors, leaving every fixture, map, sidecar and raster byte-identical, then have the original reviewer repin fieldClassificationSha256 in their canonical record — do not re-render this family's PDFs" };
  }
  const rerenderHits = discriminating.filter((c) => RERENDER_CATEGORIES.has(c));
  if (rerenderHits.length) {
    return { ...common, primaryBucket: "RERENDER_REQUIRED",
      primaryBlocker: `the produced artifact carries ${rerenderHits.join(", ")}`,
      nextAction: record.exactNextAction ?? "apply the recorded correction to the shared binder or this family's inputs, re-render against the mounted source, and regenerate its all-page evidence" };
  }

  // --- bucket 4: review only ------------------------------------------------
  return { ...common, primaryBucket: "REVIEW_ONLY",
    primaryBlocker: "no source, render or evidence objection is open against this asset and it holds no independent approval the gate accepts",
    nextAction: "assign to an independent reviewer in a worktree with the Edition 1 extract mounted, and have the verdict emitted as a canonical batch manifest and group review file" };
}

/**
 * The terminal outcome an asset is being driven to, and what "done" means.
 *
 * A bucket says what work is open; an outcome says how the asset stops being
 * open at all. Most of these never become a filled customer PDF and are not
 * failures for that: a form the participant completes by hand terminates as
 * guidance, and a web resource that was never a PDF terminates the same way.
 * Marking everything packet_ready would turn a burn-down into a backlog.
 *
 * must_packet is reserved for the narrow case the brief names: a route whose
 * completed participant treatment genuinely needs a customer PDF, where the
 * source is not in hand and not resolvable from the Master Library.
 */
function terminalOutcomeFor(asset, registerRow) {
  const operationalRefs = asset.operationalReferences?.length ?? 0;
  const sourceState = sourceStateByAsset.get(asset.assetId) ?? null;
  const routeDependent = (asset.legalDesignReferences?.length ?? 0) > 0
    || (asset.packetFamilyReferences?.length ?? 0) > 0
    || (registerRow?.affectedTrackIds?.length ?? 0) > 0;

  if (asset.primaryBucket === "RETIRE_OR_REPOINT") {
    return operationalRefs === 0
      ? { terminalOutcome: "retire", mustPacket: false,
          doneCondition: "the retirement script writes this asset's marker with every operational reference proven absent, and the determination re-derives without it" }
      : { terminalOutcome: "repoint", mustPacket: false,
          doneCondition: `every one of the ${operationalRefs} surviving operational reference is repointed to the canonical asset, and only then is this id retired` };
  }

  if (asset.primaryBucket === "SOURCE_REQUIRED") {
    // A web resource is not a PDF that failed to arrive. Directing the
    // participant to the official page IS the completed treatment.
    if (registerRow?.structuralClass === "html_form" || sourceState === "html_capture_not_a_form") {
      return { terminalOutcome: "guidance_terminal", mustPacket: false,
        doneCondition: "the route's guidance names this official resource, its publisher and what the participant does with it; no customer PDF is produced because none exists to produce" };
    }
    if (sourceState === "packable_from_master_library") {
      return { terminalOutcome: "packet_ready", mustPacket: false,
        doneCondition: "the Master Library pack is built, this family renders from the packed source, and an independent review accepts the result" };
    }
    if (routeDependent) {
      return { terminalOutcome: "exact_deferral", mustPacket: true,
        doneCondition: "the route completes with this component named as an exact deferral, stating what the participant must obtain and from whom, until the official binary is acquired" };
    }
    return { terminalOutcome: "deliberate_scope_exclusion", mustPacket: false,
      doneCondition: "the asset is recorded out of scope for this gate: no route, packet family or legal-design surface depends on it, and no participant treatment is diminished by its absence" };
  }

  // RERENDER_REQUIRED: the source is in hand, so the question is only whether
  // the platform fills it on the participant's behalf.
  if (registerRow?.participantFillable === false) {
    return { terminalOutcome: "guidance_terminal", mustPacket: false,
      doneCondition: "the route's guidance explains who completes this form and when; the platform produces no fill because the document is not the participant's to complete" };
  }
  return { terminalOutcome: "packet_ready", mustPacket: false,
    doneCondition: "the family re-renders clean against the corrected binder, carries complete sidecar and all-page evidence, and holds a current independent approval the gate accepts" };
}

const assets = [];
for (const record of register.records ?? []) {
  if (platformReadyIdentities.has(record.identity)) continue;
  const built = assetRecord(record);
  const lane = LANES[built.primaryBucket];
  const terminal = terminalOutcomeFor(built, record);
  assets.push({
    ...built,
    subtype: built.subtype ?? null,
    terminalOutcome: terminal.terminalOutcome,
    mustPacket: terminal.mustPacket,
    doneCondition: terminal.doneCondition,
    terminalTarget: TERMINAL[built.primaryBucket],
    ownerLane: lane.lane,
    owner: lane.owner,
    ownedPaths: built.familyPackagePath
      ? [built.familyPackagePath, `${RASTERS}/`]
      : ["data/rcap-all50/pdf-source-handoffs/", "data/rcap-all50/source-acquisition-queue.json"],
    exactNextAction: built.nextAction
  });
}

// Total, disjoint, and equal to the canonical denominator — all three checked.
const expected = ledger.equation.retainedProblematic;
if (assets.length !== expected) fail(`queued ${assets.length} assets; the canonical denominator says ${expected}`);
const seen = new Set();
for (const a of assets) {
  if (seen.has(a.assetId)) fail(`${a.assetId} appears twice`);
  seen.add(a.assetId);
  for (const field of ["primaryBucket", "primaryBlocker", "terminalTarget", "ownerLane", "exactNextAction"]) {
    if (!a[field]) fail(`${a.assetId} has no ${field}`);
  }
  if (/^(pending|blocked|review required)$/i.test(String(a.primaryBlocker).trim())) {
    fail(`${a.assetId} carries a generic root cause`);
  }
}

// A burn-down in which every asset is driven to one outcome is a backlog with a
// new label, so the generator refuses to emit one.
{
  const outcomes = new Set(assets.map((a) => a.terminalOutcome));
  if (outcomes.size < 2) fail(`every asset was assigned ${[...outcomes][0]}; that is not a terminal assignment`);
  for (const a of assets) {
    if (!a.terminalOutcome || !a.doneCondition) fail(`${a.assetId} has no terminal outcome or done condition`);
  }
}

const buckets = ["REVIEW_ONLY", "RERENDER_REQUIRED", "SOURCE_REQUIRED", "RETIRE_OR_REPOINT"];
const byBucket = Object.fromEntries(buckets.map((b) => [b, assets.filter((a) => a.primaryBucket === b)]));

const record = {
  schemaVersion: "rcap-gate-b-terminalization-queue/v1",
  generatedBy: "scripts/generate-rcap-gate-b-terminalization-queue.mjs",
  head: ledger.head ?? null,
  derivedFrom: [REGISTER, DETERMINATION, LEDGER],
  denominatorAtGeneration: {
    platform_ready: ledger.equation.platformReady,
    retired: ledger.equation.retired,
    retained_problematic: ledger.equation.retainedProblematic,
    retained_missing: ledger.retainedBreakdown.retainedMissing
  },
  whyThisIsEightyFiveAndNotEightyOne:
    "The four independent approvals are already discovered: loadReviewRecords sees wave-c-final-a and wave-c-final-b, and reports all four families with a newest verdict of approved_platform_ready. Canonical re-emission is done and is not what is holding them. The gate refuses all four on a contradiction between two of its own clauses, demonstrated against AK:tf-800 — as reviewed it refuses `the field or anchor classification is not complete`; with the counters added it refuses `condition 5 — field-classification.json has changed since it was reviewed`. No content of that file satisfies both, so the four cannot be counted without regenerating the classification and obtaining a fresh approval against the regenerated bytes.",
  totals: {
    queued: assets.length,
    REVIEW_ONLY: byBucket.REVIEW_ONLY.length,
    RERENDER_REQUIRED: byBucket.RERENDER_REQUIRED.length,
    SOURCE_REQUIRED: byBucket.SOURCE_REQUIRED.length,
    RETIRE_OR_REPOINT: byBucket.RETIRE_OR_REPOINT.length,
    approvedButRefusedByTheGate: assets.filter((a) => a.familyIds.some((f) => APPROVED_BUT_REFUSED.has(f))).length,
    classificationMetadataOnly: assets.filter((a) => a.subtype === "classification_metadata_only").length,
    byTerminalOutcome: Object.fromEntries(
      ["packet_ready", "guidance_terminal", "exact_deferral", "deliberate_scope_exclusion", "retire", "repoint"]
        .map((o) => [o, assets.filter((a) => a.terminalOutcome === o).length])
    ),
    mustPacketWithMissingSource: assets.filter((a) => a.mustPacket).length
  },
  assets
};

function markdown() {
  const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
  const lines = [];
  lines.push("# Gate B terminalization queue");
  lines.push("");
  lines.push(`Denominator at generation: **${record.denominatorAtGeneration.platform_ready} / ${record.denominatorAtGeneration.retired} / ${record.denominatorAtGeneration.retained_problematic} / ${record.denominatorAtGeneration.retained_missing}**.`);
  lines.push("");
  lines.push(record.whyThisIsEightyFiveAndNotEightyOne);
  lines.push("");
  lines.push("| bucket | assets | lane | terminal target |");
  lines.push("| --- | ---: | --- | --- |");
  for (const b of buckets) lines.push(`| ${b} | ${byBucket[b].length} | ${LANES[b].lane} | ${TERMINAL[b]} |`);
  lines.push("");
  for (const b of buckets) {
    lines.push(`## ${b} — ${byBucket[b].length}`);
    lines.push("");
    if (!byBucket[b].length) { lines.push("_Empty._"); lines.push(""); continue; }
    lines.push("| jur | form | source | review | primary blocker | next action |");
    lines.push("| --- | --- | --- | --- | --- | --- |");
    for (const a of byBucket[b]) {
      lines.push(`| ${a.jurisdiction} | ${cell(a.formId)} | ${cell(a.sourceStatus).slice(0, 40)} | ${cell(a.reviewStatus).slice(0, 44)} | ${cell(a.primaryBlocker).slice(0, 150)} | ${cell(a.exactNextAction).slice(0, 150)} |`);
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
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-gate-b-terminalization-queue.mjs`);

console.log(
  `OK terminalization queue — ${record.totals.queued} assets: REVIEW_ONLY ${record.totals.REVIEW_ONLY}, ` +
    `RERENDER_REQUIRED ${record.totals.RERENDER_REQUIRED}, SOURCE_REQUIRED ${record.totals.SOURCE_REQUIRED}, ` +
    `RETIRE_OR_REPOINT ${record.totals.RETIRE_OR_REPOINT}; ${record.totals.approvedButRefusedByTheGate} approved and refused by the gate`
);
