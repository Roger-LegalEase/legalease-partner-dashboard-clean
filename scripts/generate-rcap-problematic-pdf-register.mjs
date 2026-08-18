#!/usr/bin/env node
// The mandatory post-497 problematic PDF register.
//
// Terminalizing a track around a broken PDF is the right product decision, but
// it is only honest if the broken PDF is still written down. This register is
// that record: every expected or problematic official-form asset, what exactly
// is wrong with it, which launch tracks it touches, what the participant gets
// instead, and what would have to be true before it could ever replace that
// fallback.
//
//   node scripts/generate-rcap-problematic-pdf-register.mjs
//   node scripts/generate-rcap-problematic-pdf-register.mjs --check
//
// The two counters that gate launch are computed here from the authoritative
// route resolver rather than declared: a problem PDF whose route is still
// sellable, and a problem PDF whose route is still public. Both must be zero.
//
// Records are deduplicated by exact PDF identity and source SHA. Every affected
// track attaches to the one record rather than cloning it, so a form used by
// six tracks is one row with six tracks, not six rows.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { structuralClassesAgree } from "./rcap-official-forms/rcap-structural-class.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

register("./lib/ts-esm-loader.mjs", import.meta.url);
const { resolvePacketRoute } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");
const { terminalTreatmentForTrack } = await import("../src/lib/rcap/documents/guidance-packet-registry.ts");

const OVERLAY_DIR = path.join(rootDir, "data/rcap-all50/overlays/production");
const LEDGER = path.join(rootDir, "data/rcap-ledger/track-terminalization.json");
const QUEUE = path.join(rootDir, "data/rcap-all50/review-artifacts/d-track-queue.json");
const F2 = path.join(rootDir, "data/rcap-all50/review-artifacts/f2-dispositions.json");
const F3 = path.join(rootDir, "data/rcap-all50/review-artifacts/f3-visual-review.json");
const ARTIFACT_AUDIT = path.join(rootDir, "data/rcap-all50/finalized-artifact-audit.json");
const SHEET_PROOF = path.join(rootDir, "data/rcap-all50/contact-sheet-visual-proof.json");
const OUT_JSON = path.join(rootDir, "data/rcap-all50/problematic-pdf-register.json");
const OUT_MD = path.join(rootDir, "docs/record-clearing/problematic-pdf-register.md");
const OUT_CSV = path.join(rootDir, "docs/record-clearing/problematic-pdf-register.csv");
const REGISTRY_PATH = "data/record-clearing/legal-design-track-registry.json";

const checkOnly = process.argv.includes("--check");

function fail(message) {
  console.error(`FAIL problematic PDF register — ${message}`);
  process.exit(1);
}

function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

const ledger = readJson(LEDGER);
if (!ledger) fail("the completion ledger is missing");
const ledgerByTrack = new Map(ledger.tracks.map((t) => [t.trackId, t]));

// The byte-pinned legal design is the authority on which PDFs are EXPECTED.
// A form that no track's packet set names is inventory; a form a packet set
// requires and we do not have is a missing asset, and those are different rows.
const regSrc = ledger.registrySource;
const registryRaw = execFileSync("git", ["show", `${regSrc.commit}:${REGISTRY_PATH}`], {
  cwd: rootDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024
});
if (crypto.createHash("sha256").update(registryRaw).digest("hex") !== regSrc.sha256[REGISTRY_PATH]) {
  fail("the pinned legal-design registry bytes do not match the ledger pin");
}
const registryTracks = JSON.parse(registryRaw).tracks;

// documentId -> the tracks whose packet set requires it, with the component.
const expectedByForm = new Map();
for (const track of registryTracks) {
  for (const component of track.packetSet?.components ?? []) {
    if (!component.officialFormId) continue;
    const key = `${track.jurisdiction}:${component.officialFormId}`;
    const row = expectedByForm.get(key) ?? { jurisdiction: track.jurisdiction, formId: component.officialFormId, components: [], sourceUrls: new Set() };
    row.components.push({
      trackId: track.trackId,
      componentId: component.componentId,
      role: component.role,
      requirement: component.requirement,
      outputStrategy: component.outputStrategy
    });
    if (component.officialSourceUrl) row.sourceUrls.add(component.officialSourceUrl);
    expectedByForm.set(key, row);
  }
}

// familyId -> tracks, from the D queue's committed relationships.
const queue = readJson(QUEUE, { tracks: [] });
const tracksByFamily = new Map();
for (const track of queue.tracks ?? []) {
  for (const familyId of track.requiredFamilyIds ?? []) {
    const list = tracksByFamily.get(familyId) ?? [];
    list.push(track.trackId);
    tracksByFamily.set(familyId, list);
  }
}

// Review dispositions, so a record can say whether anyone independent ever
// approved this PDF rather than implying it from implementation status.
const f2 = readJson(F2, { closures: [] });
const approvedTrackKeys = new Set();
const correctionTrackKeys = new Set();
for (const closure of f2.closures ?? []) {
  for (const key of closure.trackKeys ?? []) {
    if (closure.outcome === "technical_approved") approvedTrackKeys.add(key);
    else if (closure.outcome === "correction_required") correctionTrackKeys.add(key);
  }
}
const f3 = readJson(F3, { jobs: [], reviewExempt: [] });
const visualJobStatusByFamily = new Map();
for (const job of f3.jobs ?? []) visualJobStatusByFamily.set(`${job.state}:${job.family}`, job.status);

// What the committed artifacts actually are, and whether the contact sheets
// actually show a fill. Both are observed from the bytes in the clone, so a
// family cannot claim rendered or visual evidence it does not have.
const artifactAudit = readJson(ARTIFACT_AUDIT, { families: [] });
const auditByFamily = new Map((artifactAudit.families ?? []).map((f) => [f.familyId, f]));
const sheetProof = readJson(SHEET_PROOF, { families: [] });
const sheetProofByFamily = new Map((sheetProof.families ?? []).map((f) => [f.familyId, f]));

const implIndex = readJson(path.join(OVERLAY_DIR, "implementation-index.json"), { families: [] });
const implByFamily = new Map(implIndex.families.map((f) => [`${f.jurisdiction}:${f.family}`, f]));
const binIndex = readJson(path.join(OVERLAY_DIR, "verified-binary-index.json"), { families: [] });
const binByFamily = new Map(binIndex.families.map((f) => [`${f.jurisdiction}:${f.familySlug}`, f]));

/** Every family directory that carries a committed source record. */
function familyDirectories() {
  const out = [];
  if (!fs.existsSync(OVERLAY_DIR)) return out;
  for (const stateDir of fs.readdirSync(OVERLAY_DIR).sort()) {
    const statePath = path.join(OVERLAY_DIR, stateDir);
    if (!fs.statSync(statePath).isDirectory()) continue;
    for (const familyDir of fs.readdirSync(statePath).sort()) {
      const familyPath = path.join(statePath, familyDir);
      if (!fs.statSync(familyPath).isDirectory()) continue;
      const sourceRecord = path.join(familyPath, "source-record.json");
      if (!fs.existsSync(sourceRecord)) continue;
      out.push({ stateDir, familySlug: familyDir, familyPath, sourceRecord });
    }
  }
  return out;
}

/**
 * Every defect this asset actually carries, each one tied to the committed
 * evidence that establishes it. Categories are kept distinct on purpose: a
 * missing binary, a stale revision and an unsafe overlay are different problems
 * with different owners and different acceptance conditions, and collapsing
 * them into "needs work" is how a register stops being useful.
 */
function defectsFor(ctx) {
  const { record, impl, overflow, protectedScan, binary, visualStatus, trackKeys, audit, sheet } = ctx;
  const defects = [];
  const add = (category, description, evidence) => defects.push({ category, description, evidence });

  const v2 = record.schemaVersion?.includes("v2");

  if (v2) {
    if (record.binaryPresent === false) add("missing_binary", `The verified binary for ${record.documentId} is not present in the clone.`, "source-record.json:binaryPresent");
    if (record.sha256VerifiedAgainstBundleManifest === false) add("source_identity_ambiguous", "The source SHA does not verify against the bundle manifest.", "source-record.json:sha256VerifiedAgainstBundleManifest");
    if (record.byteLengthMatches === false) add("source_identity_ambiguous", "The observed byte length disagrees with the bundle-declared length.", "source-record.json:byteLengthMatches");
    // Recomputed through the shared vocabulary rather than read from the
    // record's own boolean: records written by the pre-normalization builder
    // carry `false` for every AcroForm purely because the manifest spells the
    // class `acroform_pdf` where the binary inspector spells it `acroform`.
    if (structuralClassesAgree(record.structuralClassObserved, record.structuralClassDeclared) === false) {
      add("source_identity_ambiguous", `The observed structural class (${record.structuralClassObserved}) disagrees with the declared class (${record.structuralClassDeclared}).`, "source-record.json:structuralClassObserved,structuralClassDeclared");
    }
    if (record.pageCountAgrees === false) add("source_identity_ambiguous", "The observed page count disagrees with the declared page count.", "source-record.json:pageCountAgrees");
    if (record.freshnessStatus && record.freshnessStatus !== "current_source" && record.freshnessStatus !== "candidate_current_source") {
      add("stale_or_superseded", `Freshness is recorded as ${record.freshnessStatus}.`, "source-record.json:freshnessStatus");
    }
    if (record.freshnessStatus === "candidate_current_source") {
      add("currentness_unverified", `Revision ${record.revision ?? "unknown"} is a candidate current source that no independent currentness review has confirmed.`, "source-record.json:freshnessStatus");
    }
    if (record.generationAllowed === false) add("held_on_source_or_design", "Generation from this asset is not allowed by its committed source record.", "source-record.json:generationAllowed");
    for (const hold of record.productionHolds ?? []) {
      add("held_on_source_or_design", typeof hold === "string" ? hold : JSON.stringify(hold), "source-record.json:productionHolds");
    }
  } else {
    if (record.sourcePresenceInClone === false) add("missing_binary", `${record.fileName} is expected at ${record.relativePath} and is not present in the clone.`, "source-record.json:sourcePresenceInClone");
    if (record.fieldExtractionStatus === "field_census_unavailable_in_repo") add("flat_overlay_geometry_or_readback", "No field census could be extracted, so overlay geometry cannot be measured or read back.", "source-record.json:fieldExtractionStatus");
    if (record.classification === "dirty_acroform") add("xfa_javascript_or_active_content_residue", "The binary is a dirty AcroForm carrying active-content or residue that must be neutralised before any fill.", "source-record.json:classification");
    if (record.classification === "scanned_pdf") add("flat_overlay_geometry_or_readback", "The binary is a scan, so there are no widgets to bind and any fill is flat-overlay geometry.", "source-record.json:classification");
    if (record.failClosed === true) add("held_on_source_or_design", "The source record fails closed: no generation is permitted from it in its current state.", "source-record.json:failClosed");
    for (const hold of record.productionHolds ?? []) {
      add("held_on_source_or_design", typeof hold === "string" ? hold : JSON.stringify(hold), "source-record.json:productionHolds");
    }
  }

  if (binary?.structuralClass === "flat_pdf") {
    add("flat_overlay_geometry_or_readback", "The asset is a flat PDF, so every value is placed by measured geometry rather than into a widget.", "verified-binary-index.json:structuralClass");
  }

  for (const finding of overflow?.findings ?? []) {
    const category = finding.check === "clipping" ? "clipped_overlapping_or_misplaced" : "visually_unsafe";
    add(category, `Field "${finding.field}" fails the ${finding.check} check under the ${finding.fixture} fixture: text width ${finding.textWidthAt} exceeds widget width ${finding.widgetWidth} at font size ${finding.fontSize}.`, "reports/overflow-and-clipping.json");
  }

  for (const violation of protectedScan?.violations ?? []) {
    add("protected_field_populated", typeof violation === "string" ? violation : JSON.stringify(violation), "reports/protected-fields-scan.json");
  }
  if (protectedScan && protectedScan.pass === false && (protectedScan.violations ?? []).length === 0) {
    add("protected_field_populated", "The protected-field scan did not pass.", "reports/protected-fields-scan.json");
  }

  if (impl) {
    if (impl.contactSheet === false) add("stale_contact_sheet_manifest_or_review_evidence", "No contact sheet was produced, so there is no visual evidence to review.", "implementation-index.json:contactSheet");
    if (impl.status === "overlay_no_participant_label_matched") add("multi_widget_ambiguity", "No participant label could be matched on the overlay, so no field can be bound unambiguously.", "implementation-index.json:status");
    if (impl.status === "overlay_labels_measured_write_box_pending_review") add("multi_widget_ambiguity", "Overlay labels are measured but the write box is unreviewed, so placement remains ambiguous.", "implementation-index.json:status");
    if (impl.status === "acroform_mapped_all_fields_manual_or_unwritable") add("missing_required_packet_component", "Every field on this AcroForm is manual or unwritable, so it produces no filled component.", "implementation-index.json:status");
    if (impl.fields > 0 && impl.bound === 0) add("multi_widget_ambiguity", `The asset exposes ${impl.fields} fields and binds none of them.`, "implementation-index.json:bound");
  }

  // The committed artifacts, judged against the factory's own finalization
  // contract. These are not opinions about the source binary: they are what
  // the bytes in the clone are. An artifact that is not flattened hides its
  // values in widget appearances, which is why the sheets built from these
  // show nothing.
  for (const artifact of (audit?.artifacts ?? []).filter((a) => a.present && !a.finalized)) {
    for (const failure of artifact.failures) {
      switch (failure) {
        case "not_flattened_live_form_fields_survive":
        case "participant_values_exist_only_in_unflattened_widget_appearances":
        case "participant_values_absent_from_the_artifact_entirely":
        case "not_stamped_by_the_current_factory":
          add("unfinalized_rendered_artifact", `${artifact.rel} is not a finalized participant artifact: ${failure.replace(/_/g, " ")}.`, "finalized-artifact-audit.json:families[].artifacts[].failures");
          break;
        case "object_streams_hide_active_content_from_the_scan":
          add("rendered_artifact_not_byte_inspectable", `${artifact.rel} is serialized with object streams, so the active-content residue scan cannot give a clean verdict on it.`, "finalized-artifact-audit.json:families[].artifacts[].byteInspectable");
          break;
        case "active_content_residue":
        case "xfa_survives_in_output":
          add("xfa_javascript_or_active_content_residue", `${artifact.rel} carries ${failure.replace(/_/g, " ")}.`, "finalized-artifact-audit.json:families[].artifacts[].failures");
          break;
        case "protected_field_written_by_the_factory":
          add("protected_field_populated", `${artifact.rel} carries a factory-written value in ${artifact.protectedFieldsWrittenByFactory.join(", ")}.`, "finalized-artifact-audit.json:families[].artifacts[].protectedFieldsWrittenByFactory");
          break;
        case "protected_field_holds_a_source_default_that_flattening_would_drop":
          add("unfinalized_rendered_artifact", `${artifact.rel} leaves the form's own preprinted default in protected field(s) ${artifact.protectedFieldsHoldingSourceDefaults.join(", ")}; flattening the artifact drops them.`, "finalized-artifact-audit.json:families[].artifacts[].protectedFieldsHoldingSourceDefaults");
          break;
        case "does_not_parse":
          add("missing_required_packet_component", `${artifact.rel} does not parse as a PDF.`, "finalized-artifact-audit.json:families[].artifacts[].parseError");
          break;
        default:
          add("unfinalized_rendered_artifact", `${artifact.rel}: ${failure.replace(/_/g, " ")}.`, "finalized-artifact-audit.json:families[].artifacts[].failures");
      }
    }
  }

  // The sheet was rendered and its two panels compared. Identical panels mean
  // the reviewer is being shown two blank forms.
  if (sheet?.panelsAreVisuallyIdentical === true) {
    add("contact_sheet_shows_no_fill", `The committed contact sheet renders its blank and filled panels identically (${(sheet.differingPixelFraction * 100).toFixed(4)}% of pixels differ), so it shows no fill to review.`, "contact-sheet-visual-proof.json:families[].differingPixelFraction");
  }
  if (audit && audit.artifacts.some((a) => a.present && a.kind === "contact_sheet") && audit.contactSheetProofPresent === false) {
    add("stale_contact_sheet_manifest_or_review_evidence", "The committed contact sheet carries no visibility proof, so it was written before the builder began proving its filled panel shows the expected values.", "contact-sheet/contact-sheet-proof.json");
  }

  if (visualStatus && visualStatus !== "closed" && visualStatus !== "approved") {
    add("visually_unsafe", `The F3 visual review job for this family is ${visualStatus}, so no independent visual approval exists.`, "f3-visual-review.json:jobs");
  }

  const anyApproved = trackKeys.some((key) => approvedTrackKeys.has(key));
  const anyCorrection = trackKeys.some((key) => correctionTrackKeys.has(key));
  if (anyCorrection) add("technically_correction_required", "An independent technical review returned correction_required for a track this asset serves.", "f2-dispositions.json:closures");
  if (!anyApproved) add("never_independently_approved", "No independent technical approval exists for any track this asset serves.", "f2-dispositions.json:closures");

  return defects;
}

/** The participant-facing treatment standing in for this PDF, per track. */
function fallbackFor(trackId) {
  const row = ledgerByTrack.get(trackId);
  const treatment = terminalTreatmentForTrack(trackId);
  const jurisdiction = row?.jurisdiction ?? "";
  const probes = [null, ...((row?.mappedCompiledPathwayIds) ?? [])];
  let sellable = false;
  let creditConsumable = false;
  let routeKind = "unresolved";
  for (const pathwayId of probes) {
    const route = resolvePacketRoute({ state: jurisdiction, pathway: pathwayId ?? "", trackId });
    routeKind = route.routeKind;
    if (route.sellable) sellable = true;
    if (route.creditConsumable) creditConsumable = true;
  }
  return {
    trackId,
    jurisdiction,
    terminal: row?.terminal ?? false,
    treatmentKind: treatment?.treatment ?? row?.candidateTreatment ?? row?.requiredTreatment ?? null,
    treatmentValid: treatment ? treatment.classification === "terminal_treatment_candidate" : null,
    treatmentReviewState: treatment?.reviewState ?? null,
    routeKind,
    routeDisabled: routeKind === "disabled",
    sellable,
    creditConsumable,
    paymentAllowed: false,
    packetCreditConsumption: "none",
    partnerCreditConsumption: "none",
    // A route is "public" for this register when the runtime would offer a
    // packet on it. A guidance, deferral or exclusion route is reachable but
    // offers nothing, which is the safe state this window is aiming at.
    publicPacketRoute: sellable || creditConsumable
  };
}

const records = [];
const seen = new Map();

for (const family of familyDirectories()) {
  const record = readJson(family.sourceRecord);
  if (!record) continue;
  const jurisdiction = String(record.jurisdiction ?? "").toUpperCase();
  const familyId = `${jurisdiction}:${family.familySlug}`;
  const impl = implByFamily.get(familyId) ?? null;
  const binary = binByFamily.get(familyId) ?? null;
  const overflow = readJson(path.join(family.familyPath, "reports/overflow-and-clipping.json"));
  const protectedScan = readJson(path.join(family.familyPath, "reports/protected-fields-scan.json"));

  const documentId = record.documentId ?? binary?.documentId ?? record.fileName ?? family.familySlug;
  const sourceSha = record.sha256 ?? record.expectedSha256 ?? null;

  // Dedupe by exact PDF identity and source SHA. Two families that resolve to
  // the same binary are one asset with two family ids.
  const identity = `${jurisdiction}|${documentId}|${sourceSha ?? "no-sha"}`;

  const fromQueue = tracksByFamily.get(familyId) ?? [];
  const fromRegistry = (expectedByForm.get(`${jurisdiction}:${documentId}`)?.components ?? []).map((c) => c.trackId);
  const affectedTrackIds = [...new Set([...fromQueue, ...fromRegistry])].sort();
  const trackKeys = affectedTrackIds.map((trackId) => `${ledgerByTrack.get(trackId)?.jurisdiction ?? jurisdiction}:${trackId}`);

  const defects = defectsFor({ record, impl, overflow, protectedScan, binary, visualStatus: visualJobStatusByFamily.get(familyId), trackKeys, audit: auditByFamily.get(familyId) ?? null, sheet: sheetProofByFamily.get(familyId) ?? null });
  if (defects.length === 0) continue;

  const existing = seen.get(identity);
  if (existing) {
    existing.familyIds = [...new Set([...existing.familyIds, familyId])].sort();
    existing.affectedTrackIds = [...new Set([...existing.affectedTrackIds, ...affectedTrackIds])].sort();
    existing.evidencePaths = [...new Set([...existing.evidencePaths, path.relative(rootDir, family.familyPath)])].sort();
    // The merged family's defects belong to the record too. Two families that
    // resolve to the same binary are one asset, but they are not one package:
    // each carries its own rendered artifacts, contact sheet and reports, and
    // dropping the second family's defects hid every artifact defect belonging
    // to a family that happened to be seen second.
    const known = new Set(existing.defects.map((d) => `${d.category}|${d.description}`));
    for (const defect of defects) {
      if (known.has(`${defect.category}|${defect.description}`)) continue;
      existing.defects.push(defect);
    }
    existing.defectCategories = [...new Set(existing.defects.map((d) => d.category))].sort();
    existing.fieldAndPageLocations = [
      ...existing.fieldAndPageLocations,
      ...(overflow?.findings ?? []).map((f) => ({
        field: f.field, check: f.check, widgetWidth: f.widgetWidth ?? null, textWidthAt: f.textWidthAt ?? null, page: f.page ?? null
      }))
    ];
    continue;
  }

  const affectedTracks = affectedTrackIds.map(fallbackFor);
  const categories = [...new Set(defects.map((d) => d.category))].sort();
  const entry = {
    identity,
    jurisdiction,
    familyIds: [familyId],
    formId: documentId,
    formTitle: record.officialTitle ?? record.fileName ?? null,
    sourceSha256: sourceSha,
    revision: record.revision ?? null,
    sourceUrl: record.sourceUrl ?? null,
    binaryPresent: record.binaryPresent ?? (record.sourcePresenceInClone ?? null),
    pages: record.declaredPages ?? record.pageCount ?? binary?.pages ?? null,
    structuralClass: record.structuralClassObserved ?? record.classification ?? binary?.structuralClass ?? null,
    participantFillable: record.participantFillable ?? binary?.participantFillable ?? null,
    defectCategories: categories,
    defects,
    fieldAndPageLocations: (overflow?.findings ?? []).map((f) => ({
      field: f.field, check: f.check, widgetWidth: f.widgetWidth ?? null, textWidthAt: f.textWidthAt ?? null, page: f.page ?? null
    })),
    technicalDisposition: impl?.status ?? "no_implementation_record",
    legalDisposition: trackKeys.some((k) => approvedTrackKeys.has(k)) ? "technical_approved_for_at_least_one_served_track" : "no_independent_approval",
    affectedTrackIds,
    affectedTracks,
    implementationEvidence: impl
      ? { fields: impl.fields, bound: impl.bound, filled: impl.filled, anchors: impl.anchors, findings: impl.findings, holds: impl.holds, contactSheet: impl.contactSheet }
      : null,
    evidencePaths: [path.relative(rootDir, family.familyPath)],
    implementationBranch: "claude/rcap-final-sprint-integration",
    reviewBranches: (f2.reviewRecords ?? []).map((r) => ({ lane: r.lane, branch: r.branch, commit: r.commit })),
    owner: "Terminal A route owner",
    exactNextAction: null,
    exactAcceptanceCondition: null,
    postLaunchPriority: null,
    section: null
  };
  records.push(entry);
  seen.set(identity, entry);
}

// ---- classification, next action and priority -------------------------------
for (const entry of records) {
  const activeTracks = entry.affectedTracks.filter((t) => ledgerByTrack.has(t.trackId));
  const missing = entry.defectCategories.includes("missing_binary");

  entry.section = missing
    ? "missing_pdf_assets"
    : activeTracks.length > 0
      ? "active_track_problem_pdfs"
      : "orphaned_or_optional_problem_pdfs";

  entry.exactNextAction = missing
    ? `Supply the exact verified binary for ${entry.jurisdiction} ${entry.formId} at its committed path and SHA, then re-run the D1 implementation and visual evidence for its family.`
    : entry.defectCategories.includes("protected_field_populated")
      ? `Remove the factory write into the protected field(s) recorded against ${entry.jurisdiction} ${entry.formId} and re-render the fixture from the verified binary.`
      : entry.defectCategories.includes("unfinalized_rendered_artifact") || entry.defectCategories.includes("contact_sheet_shows_no_fill")
      ? `Re-render ${entry.jurisdiction} ${entry.formId} through the current official-form factory so the fixture is flattened, sanitized, byte-inspectable and factory-stamped, and so its contact sheet shows a filled panel. This requires the verified source binary, which is not in the clone.`
    : entry.defectCategories.includes("clipped_overlapping_or_misplaced")
      ? `Re-measure the failing widgets on ${entry.jurisdiction} ${entry.formId} and re-render the boundary fixture until no clipping finding remains.`
      : entry.defectCategories.includes("protected_field_populated")
        ? `Remove every write into a protected court, clerk, prosecutor or outside-party field on ${entry.jurisdiction} ${entry.formId} and re-run the protected-field scan.`
        : entry.defectCategories.includes("currentness_unverified")
          ? `Confirm that revision ${entry.revision ?? "(unrecorded)"} of ${entry.jurisdiction} ${entry.formId} is the currently published form, against the issuing body's own publication.`
          : `Resolve the recorded source or design hold on ${entry.jurisdiction} ${entry.formId} and obtain a fresh independent technical and visual approval.`;

  entry.exactAcceptanceCondition = "Exact source verification against the issuing body, current implementation proof, fresh independent technical AND visual approval, legal-adoption continuity where applicable, runtime integration, staging acceptance, and a controlled route-state promotion. Until all of those hold, the participant keeps the terminal treatment and this asset stays in the register.";

  // Priority follows participant exposure, not tidiness: an asset serving a
  // launch track whose participants are being turned away from a filing route
  // is worth more than a cosmetic defect on inventory nobody reaches.
  const servesActive = activeTracks.length > 0;
  const severe = entry.defectCategories.some((c) => [
    "protected_field_populated", "missing_binary", "source_identity_ambiguous",
    "unfinalized_rendered_artifact", "rendered_artifact_not_byte_inspectable", "contact_sheet_shows_no_fill"
  ].includes(c));
  entry.postLaunchPriority = servesActive && severe ? "high" : servesActive ? "medium" : "low";
}

records.sort((a, b) => a.identity.localeCompare(b.identity));

const sections = {
  active_track_problem_pdfs: records.filter((r) => r.section === "active_track_problem_pdfs"),
  orphaned_or_optional_problem_pdfs: records.filter((r) => r.section === "orphaned_or_optional_problem_pdfs"),
  missing_pdf_assets: records.filter((r) => r.section === "missing_pdf_assets"),
  post_launch_factory_or_mapping_work: records.filter((r) => r.postLaunchPriority !== "low")
};

const allAffected = records.flatMap((r) => r.affectedTracks);
const stillSellable = allAffected.filter((t) => t.sellable || t.creditConsumable);
const stillPublic = allAffected.filter((t) => t.publicPacketRoute);
const safelyTerminalized = [...new Set(allAffected.filter((t) => t.terminal || t.treatmentKind).map((t) => t.trackId))];

const countBy = (category) => records.filter((r) => r.defectCategories.includes(category)).length;
const totals = {
  problematicPdfsTotal: records.length,
  activeTrackProblematicPdfs: sections.active_track_problem_pdfs.length,
  orphanedOrOptionalPdfs: sections.orphaned_or_optional_problem_pdfs.length,
  missingPdfBinaries: sections.missing_pdf_assets.length,
  technicalDefects: records.filter((r) => r.defectCategories.some((c) => [
    "flat_overlay_geometry_or_readback", "multi_widget_ambiguity", "xfa_javascript_or_active_content_residue",
    "missing_required_packet_component", "technically_correction_required",
    "unfinalized_rendered_artifact", "rendered_artifact_not_byte_inspectable"
  ].includes(c))).length,
  visualDefects: records.filter((r) => r.defectCategories.some((c) => [
    "visually_unsafe", "clipped_overlapping_or_misplaced", "protected_field_populated",
    "contact_sheet_shows_no_fill", "stale_contact_sheet_manifest_or_review_evidence"
  ].includes(c))).length,
  // Split out because they are the finding that decides whether any committed
  // rendered or visual evidence in this lane can be relied on at all.
  unfinalizedRenderedArtifacts: records.filter((r) => r.defectCategories.includes("unfinalized_rendered_artifact")).length,
  renderedArtifactsNotByteInspectable: records.filter((r) => r.defectCategories.includes("rendered_artifact_not_byte_inspectable")).length,
  contactSheetsShowingNoFill: records.filter((r) => r.defectCategories.includes("contact_sheet_shows_no_fill")).length,
  protectedFieldsPopulatedByTheFactory: records.filter((r) => r.defectCategories.includes("protected_field_populated")).length,
  sourceOrCurrentnessDefects: records.filter((r) => r.defectCategories.some((c) => ["missing_binary", "stale_or_superseded", "currentness_unverified", "source_identity_ambiguous"].includes(c))).length,
  legalDesignOrAdoptionHolds: countBy("held_on_source_or_design"),
  tracksSafelyTerminalizedAroundAProblemPdf: safelyTerminalized.length,
  problemPdfRoutesStillSellable: stillSellable.length,
  problemPdfRoutesStillPublic: stillPublic.length,
  postLaunchHighPriorityPdfFixes: records.filter((r) => r.postLaunchPriority === "high").length
};

const payload = {
  schemaVersion: "rcap-problematic-pdf-register/v1",
  generatedBy: "scripts/generate-rcap-problematic-pdf-register.mjs",
  purpose: "Every problematic or expected-and-absent official-form asset, deduplicated by exact PDF identity and source SHA, with the participant-facing treatment standing in for it and the exact condition under which it could ever replace that treatment.",
  registerDoesNotBlock: "This register does not block 497/497 when the associated track has a complete independently approved terminal alternative. It DOES block launch when a track has no complete terminal treatment, when an unsupported PDF route remains sellable, when payment or credit can still be consumed, when the route can still generate or expose the unsafe PDF, or when an issue is omitted from the register.",
  postLaunchReplacementRule: "After launch a repaired PDF may replace its fallback only after exact source verification, current implementation proof, fresh independent technical and visual approval, legal-adoption continuity where applicable, runtime integration, staging acceptance, and a controlled route-state promotion. A pending post-launch repair never reopens the nationwide denominator.",
  registrySource: { commit: regSrc.commit, path: REGISTRY_PATH },
  totals,
  sections: {
    activeTrackProblemPdfs: sections.active_track_problem_pdfs.map((r) => r.identity),
    orphanedOrOptionalProblemPdfs: sections.orphaned_or_optional_problem_pdfs.map((r) => r.identity),
    missingPdfAssets: sections.missing_pdf_assets.map((r) => r.identity),
    postLaunchFactoryOrMappingWork: sections.post_launch_factory_or_mapping_work.map((r) => r.identity)
  },
  routesStillSellable: stillSellable,
  routesStillPublic: stillPublic,
  records
};

const json = `${JSON.stringify(payload, null, 2)}\n`;

// ---- documents --------------------------------------------------------------
const md = [];
md.push("# Problematic PDF register");
md.push("");
md.push("Generated by `scripts/generate-rcap-problematic-pdf-register.mjs`. Do not edit by hand.");
md.push("");
md.push("Terminalizing a track around a broken PDF is a legitimate product decision. It is only honest if the broken PDF is still written down, with the participant's actual alternative beside it. That is what this file is.");
md.push("");
md.push("## Totals");
md.push("");
md.push("| Measure | Count |");
md.push("| --- | ---: |");
for (const [key, value] of Object.entries(totals)) {
  md.push(`| ${key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())} | ${value} |`);
}
md.push("");
md.push("`Problem PDF routes still sellable` and `Problem PDF routes still public` must both be zero for launch.");
md.push("");

const sectionTitles = [
  ["active_track_problem_pdfs", "1. Active-track problem PDFs", "Problem PDFs tied to one or more of the 497 launch tracks. Each one names the terminal treatment its participants receive instead."],
  ["orphaned_or_optional_problem_pdfs", "2. Orphaned or optional problem PDFs", "Inventory assets not proven required by an active launch track. They are recorded, and they block nothing."],
  ["missing_pdf_assets", "3. Missing PDF assets", "Known required forms whose verified binaries are absent from the clone."],
  ["post_launch_factory_or_mapping_work", "4. Post-launch factory or mapping work", "Assets needing technical, visual, source, currentness, legal-design or adoption work after launch."]
];

for (const [key, title, blurb] of sectionTitles) {
  md.push(`## ${title}`);
  md.push("");
  md.push(blurb);
  md.push("");
  const rows = sections[key];
  if (rows.length === 0) {
    md.push("_None._");
    md.push("");
    continue;
  }
  for (const entry of rows) {
    md.push(`### ${entry.jurisdiction} ${entry.formId}${entry.formTitle ? ` — ${entry.formTitle}` : ""}`);
    md.push("");
    md.push(`- **Family ids**: ${entry.familyIds.join(", ")}`);
    md.push(`- **Source SHA**: ${entry.sourceSha256 ?? "not recorded"}${entry.revision ? ` (revision ${entry.revision})` : ""}`);
    md.push(`- **Binary present**: ${entry.binaryPresent === null ? "unrecorded" : entry.binaryPresent}`);
    md.push(`- **Structural class**: ${entry.structuralClass ?? "unrecorded"}; participant fillable: ${entry.participantFillable === null ? "unrecorded" : entry.participantFillable}`);
    md.push(`- **Defect categories**: ${entry.defectCategories.join(", ")}`);
    md.push(`- **Technical disposition**: ${entry.technicalDisposition}`);
    md.push(`- **Legal disposition**: ${entry.legalDisposition}`);
    md.push(`- **Owner**: ${entry.owner}`);
    md.push(`- **Post-launch priority**: ${entry.postLaunchPriority}`);
    md.push(`- **Exact next action**: ${entry.exactNextAction}`);
    md.push("");
    if (entry.defects.length > 0) {
      md.push("Defects:");
      md.push("");
      for (const defect of entry.defects) md.push(`- \`${defect.category}\` — ${defect.description} _(${defect.evidence})_`);
      md.push("");
    }
    if (entry.affectedTracks.length > 0) {
      md.push("| Affected track | Terminal | Treatment | Route | Sellable | Credit |");
      md.push("| --- | --- | --- | --- | --- | --- |");
      for (const track of entry.affectedTracks) {
        md.push(`| ${track.jurisdiction}:${track.trackId} | ${track.terminal} | ${track.treatmentKind ?? "—"} | ${track.routeKind} | ${track.sellable} | ${track.creditConsumable} |`);
      }
      md.push("");
    } else {
      md.push("_No active launch track is proven to require this asset._");
      md.push("");
    }
  }
}
md.push("## Acceptance condition for replacing a fallback");
md.push("");
md.push(payload.postLaunchReplacementRule);
md.push("");

const csvRows = [[
  "jurisdiction", "form_id", "form_title", "source_sha256", "revision", "binary_present", "structural_class",
  "defect_categories", "technical_disposition", "legal_disposition", "affected_track_ids", "section",
  "route_kinds", "any_sellable", "any_credit_consumable", "owner", "post_launch_priority", "exact_next_action"
]];
for (const entry of records) {
  csvRows.push([
    entry.jurisdiction, entry.formId, entry.formTitle ?? "", entry.sourceSha256 ?? "", entry.revision ?? "",
    String(entry.binaryPresent ?? ""), entry.structuralClass ?? "",
    entry.defectCategories.join(" "), entry.technicalDisposition, entry.legalDisposition,
    entry.affectedTrackIds.join(" "), entry.section,
    [...new Set(entry.affectedTracks.map((t) => t.routeKind))].join(" "),
    String(entry.affectedTracks.some((t) => t.sellable)),
    String(entry.affectedTracks.some((t) => t.creditConsumable)),
    entry.owner, entry.postLaunchPriority, entry.exactNextAction
  ]);
}
const csv = `${csvRows.map((row) => row.map((cell) => {
  const value = String(cell ?? "");
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}).join(",")).join("\n")}\n`;

const markdown = `${md.join("\n")}`;

const outputs = [[OUT_JSON, json], [OUT_MD, markdown], [OUT_CSV, csv]];

if (checkOnly) {
  for (const [file, content] of outputs) {
    const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
    if (current !== content) fail(`${path.relative(rootDir, file)} is stale; re-run scripts/generate-rcap-problematic-pdf-register.mjs`);
  }
} else {
  for (const [file, content] of outputs) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
}

console.log(`OK problematic PDF register — ${totals.problematicPdfsTotal} assets (${totals.activeTrackProblematicPdfs} active-track, ${totals.orphanedOrOptionalPdfs} orphaned/optional, ${totals.missingPdfBinaries} missing binaries); sellable ${totals.problemPdfRoutesStillSellable}, public ${totals.problemPdfRoutesStillPublic}`);
