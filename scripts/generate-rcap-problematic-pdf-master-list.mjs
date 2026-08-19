#!/usr/bin/env node
// The decision-useful master list of every problematic PDF asset.
//
//   node scripts/generate-rcap-problematic-pdf-master-list.mjs
//   node scripts/generate-rcap-problematic-pdf-master-list.mjs --check
//
// The register next door records what is wrong with each asset. This records
// what to DO about each asset, which is a different question and needs
// different columns: who owns it, what exactly is missing, what exactly would
// close it, and which of six mutually exclusive remediation lanes it is in.
//
// The lanes exist so that a reader can tell, without reading a defect list,
// whether an asset is waiting on work someone can start now or on something
// nobody in this repository can supply:
//
//   A  correctable now, from a verified binary that is present in this clone
//   B  needs an official source binary that is not here
//   C  the held binary cannot be shown to be the currently published edition
//   D  a substantive legal-design question is unresolved
//   E  no active track requires it
//   F  the binary is absent and the participant already has a complete
//      terminal deferral, so nothing is pending for the participant
//
// Every row states its exact blocker and its exact next action. "Needs work",
// "review later" and "unknown" are not dispositions and do not appear here: a
// row nobody can act on from its own text is a row that will be re-derived by
// hand every time someone opens this file.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ROOT_CAUSES } from "./rcap-official-forms/rcap-pdf-root-causes.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTER = path.join(rootDir, "data/rcap-all50/problematic-pdf-register.json");
const AUDIT = path.join(rootDir, "data/rcap-all50/finalized-artifact-audit.json");
const SHEET_PROOF = path.join(rootDir, "data/rcap-all50/contact-sheet-visual-proof.json");
const PLACEMENT = path.join(rootDir, "data/rcap-all50/overlay-placement-evidence.json");
const OVERLAY_DIR = path.join(rootDir, "data/rcap-all50/overlays/production");
const OUT_JSON = path.join(rootDir, "data/rcap-all50/problematic-pdf-master-list.json");
const OUT_MD = path.join(rootDir, "docs/record-clearing/problematic-pdf-master-list.md");
const OUT_CSV = path.join(rootDir, "docs/record-clearing/problematic-pdf-master-list.csv");
const OUT_HTML = path.join(rootDir, "docs/record-clearing/problematic-pdf-review-gallery.html");

const checkOnly = process.argv.includes("--check");

function fail(message) {
  console.error(`FAIL problematic PDF master list — ${message}`);
  process.exit(1);
}
const readJson = (file, fallback = null) => {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
};

const register = readJson(REGISTER);
if (!register) fail("the problematic PDF register has not been generated");
const audit = readJson(AUDIT, { families: [] });
const auditByFamily = new Map((audit.families ?? []).map((f) => [f.familyId, f]));
const sheetProof = readJson(SHEET_PROOF, { families: [] });
const sheetByFamily = new Map((sheetProof.families ?? []).map((f) => [f.familyId, f]));
const placement = readJson(PLACEMENT, { families: [] });
const placementByFamily = new Map((placement.families ?? []).map((f) => [f.familyId, f]));

// ---- which verified source binaries are actually present in this clone -----
// A correction that needs a re-render needs the binary it renders from. The
// only honest way to know whether that is possible is to look for the bytes,
// by the SHA the source record pins, rather than trusting `binaryPresent`,
// which records presence in the source bundle and not in this repository.
function pdfsInClone() {
  const found = new Map();
  const skip = new Set(["node_modules", ".git", ".next"]);
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.pdf$/i.test(entry.name)) {
        const sha = crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex");
        if (!found.has(sha)) found.set(sha, path.relative(rootDir, full));
      }
    }
  };
  walk(rootDir);
  return found;
}
const binariesInClone = pdfsInClone();

// ---- source facts, read from each family's committed source record ---------
const sourceByFamily = new Map();
for (const stateDir of fs.existsSync(OVERLAY_DIR) ? fs.readdirSync(OVERLAY_DIR).sort() : []) {
  const statePath = path.join(OVERLAY_DIR, stateDir);
  if (!fs.statSync(statePath).isDirectory()) continue;
  for (const familyDir of fs.readdirSync(statePath).sort()) {
    const record = readJson(path.join(statePath, familyDir, "source-record.json"));
    if (!record) continue;
    sourceByFamily.set(`${String(record.jurisdiction ?? stateDir).toUpperCase()}:${familyDir}`, record);
  }
}

/**
 * Whether a recorded official title looks like it was mis-extracted.
 *
 * Kentucky AOC-334's title reads "is hereby void; and all records pertaining
 * thereto that are in custody of the court and any records in the custody of"
 * -- a fragment of the form's body text, captured instead of its heading. The
 * title is left exactly as recorded, because it is committed evidence and this
 * generator does not rewrite evidence. It is flagged, so a reader is not left
 * to wonder whether that is really what the form is called, and so whoever
 * acquires the binary knows to re-read the title from it.
 */
function titleLooksMisextracted(title, formNumber) {
  const text = String(title ?? "").trim();
  if (text === "") return false;
  if (text.toUpperCase().includes(String(formNumber ?? "").toUpperCase())) return false;
  // A real title starts like a title. A sentence fragment starts mid-clause.
  return /^[a-z]/.test(text) || /^(is|are|and|that|the|of|to|for|in)\b/i.test(text);
}

/** The retrieval date the source record encodes, or null. Never guessed. */
function retrievalDate(record) {
  const match = /(\d{4}-\d{2}-\d{2})/.exec(String(record?.sourceStatus ?? ""));
  return match ? match[1] : null;
}

/**
 * The publisher, only where the record actually establishes one. The source
 * URL's host is evidence of a publisher; an absent URL is not, and inventing a
 * publisher for an asset whose source nobody recorded is exactly the kind of
 * confident-looking fiction this list exists to remove.
 */
function publisherFrom(record) {
  const url = record?.sourceUrl;
  if (!url) return { publisher: null, basis: "no source URL is recorded against this asset" };
  try {
    return { publisher: new URL(url).host, basis: "host of the recorded official source URL" };
  } catch {
    return { publisher: null, basis: "the recorded source URL does not parse" };
  }
}

// ---- track binding for legacy filename-keyed records -----------------------
// The 39 expected-and-absent assets were recorded before form numbers were the
// key: their document ids are filenames ("cr-65-expunge-petition-10-2024.pdf"),
// while the pinned legal-design registry keys packet components by form number
// ("AL:CR-65"). The two never join, so those rows carry no affected track and
// cannot say which route is waiting on them -- which is most of what a reader
// needs from a missing-asset row.
//
// A candidate match is computed here and labelled as a candidate. It never
// feeds a lane, a count or a status: a form number read out of a filename is a
// reasonable lead for whoever acquires the binary, and it is not evidence that
// a packet component depends on this asset.
function registryFormIds() {
  const ledger = readJson(path.join(rootDir, "data/rcap-ledger/track-terminalization.json"));
  if (!ledger) return new Map();
  let raw;
  try {
    raw = execFileSync("git", ["show", `${ledger.registrySource.commit}:data/record-clearing/legal-design-track-registry.json`],
      { cwd: rootDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  } catch { return new Map(); }
  const byKey = new Map();
  for (const track of JSON.parse(raw).tracks) {
    for (const component of track.packetSet?.components ?? []) {
      if (!component.officialFormId) continue;
      const key = `${track.jurisdiction}:${normalizeFormToken(component.officialFormId)}`;
      const row = byKey.get(key) ?? { formId: component.officialFormId, trackIds: new Set() };
      row.trackIds.add(track.trackId);
      byKey.set(key, row);
    }
  }
  return byKey;
}

/** A form number reduced to comparable characters: CR-65, cr_65, CR65 all fold. */
function normalizeFormToken(value) {
  return String(value ?? "")
    .replace(/\.(pdf|html?|docx?)$/i, "")
    .replace(/[-_\s.]/g, "")
    .toUpperCase();
}

/** The leading form-number-looking token of a legacy filename id, or null. */
function formTokenFromLegacyId(documentId) {
  // The whole numeric run is taken, not the first group of it: CC-6-11-2 and
  // CC-6-11 are different forms, and a match that stops at the first group
  // would confidently propose the wrong one.
  // A trailing letter is part of the form number only when nothing follows it:
  // the "A" of CC-1201-A is a different form, while the "e" that opens
  // "-expunge-petition" in a filename is prose and must not be swallowed.
  const match = /^([A-Za-z]{1,6}[-_ ]?\d{1,4}(?:[-_.]\d{1,3})*(?:[-_.]?[A-Za-z](?![A-Za-z]))?)/.exec(String(documentId ?? ""));
  return match ? normalizeFormToken(match[1]) : null;
}

const registryByForm = registryFormIds();

/**
 * Whether an independent reviewer approved the exact bytes now on disk.
 *
 * Every clause is checked against something measured elsewhere in this lane,
 * so `platform_ready` cannot be reached by editing a verdict into a file: the
 * approval has to name the artifact hashes, and those hashes have to be what
 * the finalized-artifact audit read off disk.
 */
function reviewVerdictFor(familyIds, artifacts) {
  for (const familyId of familyIds ?? []) {
    const slug = familyId.includes(":") ? familyId.split(":")[1] : familyId;
    const stateDirs = fs.existsSync(OVERLAY_DIR) ? fs.readdirSync(OVERLAY_DIR) : [];
    for (const state of stateDirs) {
      const dir = path.join(OVERLAY_DIR, state, slug);
      const profilePath = path.join(dir, "overlay-profile.json");
      if (!fs.existsSync(profilePath)) continue;
      let profile;
      try { profile = JSON.parse(fs.readFileSync(profilePath, "utf8")); } catch { continue; }
      const review = profile.independentReview ?? null;
      // One master-list row can cover several family packages -- CR-266 covers
      // both cr-266-en and cr-266-form-en. Only one of them carries a profile
      // and artifacts; returning on the first family without one concluded
      // "unreviewed" before looking at the family that was reviewed.
      if (review?.verdict !== "approved_for_platform_ready") continue;

      const round = [...(review.rounds ?? [])].reverse().find((r) => r.verdict === "approved_for_platform_ready");
      const approvedHashes = round?.reviewedArtifactSha256 ?? null;
      if (!approvedHashes) return { approved: false, reason: "the approval does not name the artifact hashes it approved" };

      // The approval must be of the bytes that are here now.
      for (const [relative, sha] of Object.entries(approvedHashes)) {
        const file = path.join(dir, relative);
        if (!fs.existsSync(file)) return { approved: false, reason: `${relative} is named by the approval and is not on disk` };
        const actual = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
        if (actual !== sha) return { approved: false, reason: `${relative} has changed since it was approved` };
      }

      const classification = fs.existsSync(path.join(dir, "field-classification.json"))
        ? JSON.parse(fs.readFileSync(path.join(dir, "field-classification.json"), "utf8")) : null;
      if (!classification || Number(classification.classifiedFieldsOrAnchors) !== Number(classification.discoveredFieldsOrAnchors)
        || Number(classification.discoveredFieldsOrAnchors) === 0) {
        return { approved: false, reason: "the field or anchor classification is not complete" };
      }

      if (artifacts.length === 0 || !artifacts.every((a) => a.finalized && (a.failures ?? []).length === 0)) {
        return { approved: false, reason: "not every artifact is finalized with no recorded failure" };
      }

      return { approved: true, reason: `independent review approved these exact bytes after ${(review.rounds ?? []).length} round(s)` };
    }
  }
  return { approved: false, reason: "no overlay profile carries an independent review for this family" };
}

// Exactly one operational disposition per asset, from an explicit vocabulary.
// "Held" told a reader nothing: it grouped a form whose route already delivers
// a complete deferral with a form nobody can obtain, and an instruction sheet
// no track reads with a petition an active track is waiting on.
const DISPOSITIONS = {
  active_track_delivery_hold: "An active track's packet delivery is blocked on this asset.",
  official_source_required: "The verified source binary is unavailable, so nothing downstream can be attempted.",
  certification_unproven: "Artifacts exist but cannot be certified: their active-content cleanliness or finalization cannot be established from the committed bytes.",
  independent_review_required: "Certifiable artifacts exist and no independent review has approved them.",
  legal_design_hold: "A substantive legal-design question is unresolved.",
  reference_only: "An instruction, guidance or supporting-process document, not a filed component.",
  orphaned: "No active track requires it and no candidate binding to one exists.",
  optional: "A packet form no active track currently requires, with a plausible binding.",
  archive_candidate: "Source-gated: retained for provenance, never runtime-selectable.",
  retire_candidate: "Recorded as superseded, withdrawn or repealed; nothing should use it.",
  // The only disposition that is an end state rather than a description of
  // what is wrong. It is derived from evidence, never asserted: the binary is
  // in the clone, every artifact is finalized and byte-inspectable, every
  // discovered field or anchor is classified, the contact sheet shows the
  // filled panel differing from the blank one, and an independent reviewer who
  // did not build it approved these exact bytes.
  platform_ready: "The official source is pinned, every field or anchor is classified, the artifacts are finalized, inspectable and visibly filled, and an independent reviewer approved these exact bytes."
};

// Acquisition priority. Priority 4 is deliberately a refusal, not a queue
// position: retrieving an orphaned or reference-only PDF to make a backlog
// number move is work that buys nothing and creates a currentness obligation
// for an asset nobody reads.
const ACQUISITION_PRIORITIES = {
  1: "Active-track source required for an otherwise packet-capable route.",
  2: "Active-track source required before technical or visual review can begin.",
  3: "Source needed to resolve currentness or supersession for a current participant treatment.",
  4: "Orphaned, optional, historical or reference-only. do_not_acquire_without_a_named_current_use."
};
const PRIORITY_4_RULE = "do_not_acquire_without_a_named_current_use";

const LANES = {
  A: "actionable_technical_or_visual_correction",
  B: "official_source_acquisition_required",
  C: "source_currentness_hold",
  D: "legal_design_hold",
  E: "orphaned_or_optional_asset",
  F: "missing_binary_with_complete_participant_deferral"
};

// Holds whose text names a substantive legal choice rather than a mechanical
// or lifecycle condition. A hold outside this set does not make an asset a
// legal-design hold.
const LEGAL_DESIGN_HOLD = /venue|recipient|filing destination|service|attachment|eligibility|reduction|legal conclusion|counsel|adoption/i;

const rows = [];
for (const entry of register.records) {
  // A register record can carry several family ids: two families resolving to
  // the same binary are deduplicated into one asset. Evidence has to be looked
  // up across all of them, not just the first, or the family that happened to
  // sort second loses its artifacts and its rendered sheet.
  const record = entry.familyIds.map((id) => sourceByFamily.get(id)).find(Boolean) ?? null;
  const auditRow = entry.familyIds.map((id) => auditByFamily.get(id))
    .find((row) => row && row.artifacts.some((a) => a.present))
    ?? entry.familyIds.map((id) => auditByFamily.get(id)).find(Boolean) ?? null;
  const sheetRow = entry.familyIds.map((id) => sheetByFamily.get(id)).find(Boolean) ?? null;

  const sourceSha = entry.sourceSha256;
  const binaryPathInClone = sourceSha ? (binariesInClone.get(sourceSha) ?? null) : null;

  const activeTrackIds = entry.affectedTrackIds;
  const activeTrack = entry.section === "active_track_problem_pdfs";
  const missingBinary = entry.defectCategories.includes("missing_binary");
  const everyTrackTerminal = entry.affectedTracks.length > 0
    && entry.affectedTracks.every((t) => t.terminal && t.treatmentKind);

  const productionHolds = (record?.productionHolds ?? []).map((h) => (typeof h === "string" ? h : JSON.stringify(h)));
  const legalDesignHolds = productionHolds.filter((h) => LEGAL_DESIGN_HOLD.test(h));
  const currentnessDefect = entry.defectCategories.some((c) => ["stale_or_superseded", "currentness_unverified"].includes(c));
  // Defects whose correction is a render: re-run the factory over the verified
  // binary and re-measure. Every one of them is actionable when those bytes
  // are here and blocked on acquisition when they are not, which is what
  // separates lane A from lane B.
  const needsRenderWork = entry.defectCategories.some((c) => [
    "unfinalized_rendered_artifact", "rendered_artifact_not_byte_inspectable",
    "contact_sheet_shows_no_fill", "clipped_overlapping_or_misplaced", "protected_field_populated",
    "multi_widget_ambiguity", "flat_overlay_geometry_or_readback",
    "stale_contact_sheet_manifest_or_review_evidence"
  ].includes(c));

  // A flat form whose write boxes the document does not express is waiting on
  // a placement decision, not on a render: running the factory again produces
  // the same correct refusal.
  const placementRow = entry.familyIds.map((id) => placementByFamily.get(id)).find(Boolean) ?? null;
  const awaitingPlacement = (placementRow?.labelsAwaitingAPlacementDecision ?? []).length > 0;

  // Only computed where no track binding exists; a row that already knows its
  // tracks needs no lead.
  let trackBindingStatus = activeTrackIds.length > 0
    ? "bound_to_tracks_by_the_committed_relationships"
    : "no_track_binding_established";
  let candidateRegistryFormId = null;
  let candidateRegistryTrackIds = [];
  if (activeTrackIds.length === 0) {
    const token = formTokenFromLegacyId(entry.formId);
    const candidate = token ? registryByForm.get(`${entry.jurisdiction}:${token}`) : null;
    if (candidate) {
      trackBindingStatus = "no_track_binding_established_candidate_form_number_match_unconfirmed";
      candidateRegistryFormId = candidate.formId;
      candidateRegistryTrackIds = [...candidate.trackIds].sort();
    }
  }

  // Exactly one lane, decided in order of what stops work first.
  let lane, exactBlocker;
  if (!activeTrack && entry.section === "orphaned_or_optional_problem_pdfs") {
    lane = "E";
    exactBlocker = "Nothing is blocked. No active launch track's packet set requires this asset, so it is inventory rather than pending work.";
  } else if (missingBinary && everyTrackTerminal) {
    lane = "F";
    exactBlocker = `The verified binary is absent, and every track it would serve (${activeTrackIds.join(", ") || "none recorded"}) already delivers a complete terminal treatment, so no participant is waiting on it.`;
  } else if (missingBinary) {
    lane = "B";
    exactBlocker = activeTrackIds.length > 0
      ? `The verified binary for ${entry.jurisdiction} ${entry.formId} is not in the clone and no track it serves has a recorded complete terminal treatment.`
      : `The verified binary for ${entry.jurisdiction} ${entry.formId} is not in the clone, and no track binding exists for it: this asset is keyed by filename while the pinned legal-design registry keys packet components by form number, so nothing joins the two and the affected route cannot be stated.${candidateRegistryFormId ? ` A candidate, unconfirmed, form-number match is ${entry.jurisdiction} ${candidateRegistryFormId} (tracks ${candidateRegistryTrackIds.join(", ")}).` : " No candidate form-number match was found either."}`;
  } else if (legalDesignHolds.length > 0) {
    lane = "D";
    exactBlocker = `An unresolved legal-design hold governs this asset: ${legalDesignHolds.join("; ")}.`;
  } else if (needsRenderWork && !binaryPathInClone) {
    lane = "B";
    exactBlocker = `Correcting this asset requires re-rendering it through the current official-form factory, and the verified source binary (SHA-256 ${sourceSha ?? "unrecorded"}) is not present in this clone. The factory renders from the binary; there is nothing to render from.`;
  } else if (needsRenderWork && binaryPathInClone) {
    lane = "A";
    exactBlocker = awaitingPlacement
      ? `A placement decision, not a binary: the verified source is present at ${binaryPathInClone}, and ${placementRow.labelsAwaitingAPlacementDecision.length} label(s) on it have no write box the document expresses, so no coordinate is asserted for them. Generation is separately withheld while ${productionHolds.join("; ") || "no hold"} stands.`
      : `None for the render itself: the verified binary is present at ${binaryPathInClone}. Generation is separately withheld while ${productionHolds.join("; ") || "no hold"} stands.`;
  } else if (currentnessDefect) {
    lane = "C";
    exactBlocker = `Revision ${record?.revision ?? "(unrecorded)"} cannot be shown to be the currently published edition: freshness is recorded as ${record?.freshnessStatus ?? "unrecorded"} and no independent currentness review exists.`;
  } else {
    lane = "C";
    exactBlocker = `The asset carries a recorded source or design hold that no committed evidence resolves: ${productionHolds.join("; ") || "no hold text recorded"}.`;
  }

  const exactNextAction = {
    A: awaitingPlacement
      ? `Decide where each of the ${placementRow.labelsAwaitingAPlacementDecision.length} candidate label(s) on ${entry.jurisdiction} ${entry.formId} takes its value, and record the approved write box. The document does not express one, so the anchor capture asserts no coordinate and re-running the factory reproduces the same refusal. The rendered form with each label marked at its measured position is at ${(placementRow.renderedEvidence ?? []).join(", ") || "no rendering available"}. Once a placement is approved, re-render from ${binaryPathInClone} and re-run the finalized-artifact audit and contact-sheet visual proof. Do not lift the recorded production holds to do it.`
      : `Re-render ${entry.jurisdiction} ${entry.formId} from ${binaryPathInClone} through scripts/implement-rcap-official-forms-d1.mjs, then re-run the finalized-artifact audit and the contact-sheet visual proof for its family. Do not lift the recorded production holds to do it.`,
    B: `Retrieve the current official ${entry.jurisdiction} ${entry.formId} binary from its issuing body, record its URL, retrieval timestamp, publisher, edition date, byte length and SHA-256, and place it at the path its source record pins. Nothing downstream can proceed without those bytes.${activeTrackIds.length === 0 ? (candidateRegistryFormId ? ` Separately, confirm or reject the candidate form-number binding to ${entry.jurisdiction} ${candidateRegistryFormId} so this row can name the route it affects.` : " Separately, establish which packet component, if any, depends on this asset: no track binding exists and no candidate form-number match was found, so this row cannot currently name the route it affects.") : ""}`,
    C: `Confirm against the issuing body's own publication whether revision ${record?.revision ?? "(unrecorded)"} of ${entry.jurisdiction} ${entry.formId} is the currently published edition, and record the comparison and the superseded identity if it is not.`,
    D: `Put the recorded legal-design question to counsel and record the answer with its carrier before any field on ${entry.jurisdiction} ${entry.formId} is bound.`,
    E: `Decide retain, archive or retire for ${entry.jurisdiction} ${entry.formId} and record the decision. It blocks nothing in the meantime.`,
    F: `No participant action is pending. Keep the terminal treatment on ${activeTrackIds.join(", ")} and leave the asset recorded until its binary is supplied.`
  }[lane];

  const artifacts = (auditRow?.artifacts ?? []).filter((a) => a.present);
  const libraryFolder = record?.libraryFolder ?? null;
  const documentRole = record?.documentRole ?? null;
  const treatments = [...new Set(entry.affectedTracks.map((t) => t.treatmentKind).filter(Boolean))];
  const packetCapableTreatment = treatments.includes("production_packet");
  // A route whose participant already receives a complete guidance or exact
  // deferral treatment is terminal by design, not a blocked packet route.
  const servedByGuidanceOrDeferral = entry.affectedTracks.length > 0
    && entry.affectedTracks.every((t) => ["guidance_only", "exact_supported_deferral", "exclusion"].includes(t.routeKind));
  const certifiable = artifacts.length > 0 && artifacts.every((a) => a.byteInspectable && a.finalized);
  const { publisher, basis } = publisherFrom(record);

  // ---- exactly one operational disposition ---------------------------------
  // Ordered by what is most true about the asset's standing, not by severity:
  // an asset nobody can obtain is source-required whatever else is wrong with
  // it, and an asset no track reads is not a launch blocker however defective.
  // Evidence for the end state, gathered before anything else is decided so
  // that a family cannot reach it by failing some earlier test.
  const approval = reviewVerdictFor(entry.familyIds, artifacts);

  let disposition;
  if (approval.approved) {
    disposition = "platform_ready";
  } else if (activeTrack) {
    if (packetCapableTreatment && (missingBinary || !binaryPathInClone)) disposition = "active_track_delivery_hold";
    else if (legalDesignHolds.length > 0) disposition = "legal_design_hold";
    // A form whose binary is here and whose open question is where a value
    // goes is waiting on a reviewer, not on bytes. Filing it as
    // source-required would send someone to fetch a file that is already in
    // the clone, and would quietly imply the answer is a re-render.
    else if (awaitingPlacement && binaryPathInClone) disposition = "independent_review_required";
    else if (artifacts.length === 0) disposition = "official_source_required";
    else if (!certifiable) disposition = "certification_unproven";
    else disposition = "independent_review_required";
  } else if (missingBinary) {
    disposition = "official_source_required";
  } else if (libraryFolder === "05_SOURCE_GATED") {
    disposition = "archive_candidate";
  } else if (documentRole === "INSTRUCTIONS" || libraryFolder === "03_INSTRUCTIONS" || libraryFolder === "04_SUPPORTING_PROCESS") {
    disposition = "reference_only";
  } else if (/superseded|withdrawn|repealed/i.test(String(record?.freshnessStatus ?? ""))) {
    disposition = "retire_candidate";
  } else if (candidateRegistryFormId) {
    disposition = "optional";
  } else {
    disposition = "orphaned";
  }

  // ---- acquisition priority -------------------------------------------------
  // Only assets that actually need bytes get a queue position. Priority 4 is a
  // standing refusal rather than a low position in the same queue.
  let acquisitionPriority = null;
  let acquisitionRule = null;
  const needsBytes = missingBinary || !binaryPathInClone;
  if (!needsBytes) {
    acquisitionPriority = null;
  } else if (!activeTrack) {
    acquisitionPriority = 4;
    acquisitionRule = PRIORITY_4_RULE;
  } else if (packetCapableTreatment) {
    acquisitionPriority = 1;
  } else if (servedByGuidanceOrDeferral && entry.defectCategories.includes("stale_or_superseded")) {
    // The participant is already served, and what the bytes would settle is
    // which edition the record holds -- a currentness question, not a blocked
    // review. Ordering this before the reviewability test matters: nothing in
    // this lane is certifiable, so a reviewability-first rule would swallow
    // every currentness item and the dimension would disappear.
    acquisitionPriority = 3;
  } else {
    acquisitionPriority = 2;
  }


  rows.push({
    // identity
    jurisdiction: entry.jurisdiction,
    assetId: entry.identity,
    formName: entry.formTitle ?? "not recorded in the committed source record",
    formNameLooksMisextracted: titleLooksMisextracted(entry.formTitle, entry.formId),
    formNumber: entry.formId,
    formFamilyIds: entry.familyIds,
    // tracks and routes
    affectedTrackIds: activeTrackIds,
    trackBindingStatus,
    candidateRegistryFormId,
    candidateRegistryTrackIds,
    affectedCompiledPathwayIds: [...new Set(entry.affectedTracks.flatMap((t) => t.mappedCompiledPathwayIds ?? []))],
    activeTrackStatus: activeTrack ? "active_track" : entry.section === "missing_pdf_assets" ? "expected_but_absent" : "orphaned_or_optional",
    routeKinds: [...new Set(entry.affectedTracks.map((t) => t.routeKind))],
    rendererKind: record?.renderStrategy ?? "no render strategy recorded",
    packetCapable: entry.affectedTracks.some((t) => t.routeKind === "packet"),
    participantTreatment: [...new Set(entry.affectedTracks.map((t) => t.treatmentKind).filter(Boolean))],
    sellable: entry.affectedTracks.some((t) => t.sellable),
    publicPacketRoute: entry.affectedTracks.some((t) => t.publicPacketRoute),
    checkoutSuppressed: !entry.affectedTracks.some((t) => t.sellable),
    paymentSuppressed: !entry.affectedTracks.some((t) => t.paymentAllowed),
    packetCreditConsumed: entry.affectedTracks.some((t) => t.creditConsumable),
    // source
    officialSourceUrl: record?.sourceUrl ?? null,
    sourcePublisher: publisher,
    sourcePublisherBasis: basis,
    sourceRetrievalDate: retrievalDate(record),
    sourceRevision: record?.revision ?? null,
    sourceSha256: sourceSha,
    sourceBinaryPresentInClone: Boolean(binaryPathInClone),
    sourceBinaryPathInClone: binaryPathInClone,
    currentnessStatus: record?.freshnessStatus ?? "not recorded",
    supersededSourceIdentity: null,
    missingBinary,
    // structure
    structuralClass: entry.structuralClass ?? "not recorded",
    interactiveFieldCount: record?.observedAcroFieldCount ?? null,
    xfaPresentInSource: null,
    // observed output
    renderedArtifacts: artifacts.map((a) => ({ rel: a.rel, kind: a.kind, finalized: a.finalized, failures: a.failures })),
    anyFinalizedArtifact: artifacts.some((a) => a.finalized),
    activeContentVerdict: artifacts.length === 0
      ? "no rendered artifact to judge"
      : artifacts.every((a) => a.byteInspectable)
        ? (artifacts.every((a) => (a.activeContentHits ?? []).length === 0) ? "clean and provable" : "residue found")
        : "unprovable: object streams hide objects from the residue scan",
    contactSheetShowsAFill: sheetRow ? sheetRow.panelsAreVisuallyIdentical === false : null,
    contactSheetEvidenceImage: sheetRow?.renderedEvidence ?? null,
    labelsAwaitingAPlacementDecision: (placementRow?.labelsAwaitingAPlacementDecision ?? []).length,
    // Stated as the question a reviewer answers, not as a coordinate this lane
    // guessed. No write box is proposed anywhere in this file.
    precisePlacementQuestion: awaitingPlacement
      ? `For ${entry.jurisdiction} ${entry.formId}, where does the participant value belong relative to each of these measured label positions: ${placementRow.labelsAwaitingAPlacementDecision.map((l) => `"${l.label}" (${l.factId}, page ${l.page} at x=${l.measuredLabelX}, baseline y=${l.measuredBaselineY})`).join("; ")}? The anchor capture derived ${placementRow.anchorsDerived} writable anchor(s) and asserts no coordinate for these labels because the document expresses no rectangle for them. The form's own footer states it shall not be modified and may be supplemented with additional material, so the answer must also say whether a value belongs on the form at all or on a supplement.`
      : null,
    placementLabels: placementRow?.labelsAwaitingAPlacementDecision ?? [],
    placementEvidenceImages: placementRow?.renderedEvidence ?? [],
    // defects and disposition
    defectCategories: entry.defectCategories,
    severity: entry.postLaunchPriority,
    releaseRisk: entry.affectedTracks.some((t) => t.sellable || t.publicPacketRoute)
      ? "participant_exposed"
      : activeTrack ? "contained_by_terminal_treatment" : "none",
    owner: lane === "D" ? "Counsel (legal design)"
      : lane === "B" ? "Roger (official source acquisition)"
      : lane === "C" ? "Source-currentness reviewer"
      : lane === "E" ? "RCAP inventory owner"
      : "Terminal A route owner",
    independentReviewStatus: entry.legalDisposition === "no_independent_approval"
      ? "never_independently_reviewed"
      : "technically_approved_for_at_least_one_served_track",
    remediationLane: lane,
    remediationLaneName: LANES[lane],
    exactBlocker,
    exactNextAction,
    evidencePaths: entry.evidencePaths,
    // Root causes, so a reader can see whether this asset's problems are its
    // own or the lane's.
    rootCauseIds: entry.rootCauseIds ?? [],
    systemicRootCauseIds: entry.systemicRootCauseIds ?? [],
    familySpecificRootCauseIds: entry.familySpecificRootCauseIds ?? [],
    // Operational state.
    disposition,
    platformReadyBasis: approval.reason,
    dispositionMeaning: DISPOSITIONS[disposition],
    libraryFolder,
    documentRole,
    packetCapableTreatment,
    servedByGuidanceOrDeferral,
    certifiableArtifacts: certifiable,
    acquisitionPriority,
    acquisitionPriorityMeaning: acquisitionPriority ? ACQUISITION_PRIORITIES[acquisitionPriority] : "No bytes are missing for this asset.",
    acquisitionRule,
    // The release posture, which is a separate axis from the operational
    // disposition and does not move in this lane.
    releaseStatus: "HELD"
  });
}

rows.sort((a, b) => (a.jurisdiction + a.formNumber).localeCompare(b.jurisdiction + b.formNumber));

const byLane = (lane) => rows.filter((r) => r.remediationLane === lane);
const byDisposition = (d) => rows.filter((r) => r.disposition === d);
const byPriority = (n) => rows.filter((r) => r.acquisitionPriority === n);
const totals = {
  assetsTotal: rows.length,
  activeTrack: rows.filter((r) => r.activeTrackStatus === "active_track").length,
  orphanedOrOptional: rows.filter((r) => r.activeTrackStatus === "orphaned_or_optional").length,
  expectedButAbsent: rows.filter((r) => r.activeTrackStatus === "expected_but_absent").length,
  laneA_actionableNow: byLane("A").length,
  laneB_sourceAcquisitionRequired: byLane("B").length,
  laneC_currentnessHold: byLane("C").length,
  laneD_legalDesignHold: byLane("D").length,
  laneE_orphanedOrOptional: byLane("E").length,
  laneF_missingBinaryCompleteDeferral: byLane("F").length,
  sourceBinariesPresentInClone: rows.filter((r) => r.sourceBinaryPresentInClone).length,
  assetsWithAFinalizedArtifact: rows.filter((r) => r.anyFinalizedArtifact).length,
  assetsWhoseActiveContentVerdictIsUnprovable: rows.filter((r) => r.activeContentVerdict.startsWith("unprovable")).length,
  contactSheetsShowingAFill: rows.filter((r) => r.contactSheetShowsAFill === true).length,
  contactSheetsShowingNoFill: rows.filter((r) => r.contactSheetShowsAFill === false).length,
  // Operational state, one asset one disposition.
  activeTrackAssetsBlockingPacketPromotion: byDisposition("active_track_delivery_hold").length,
  activeTrackAssetsSafelyServedByGuidanceOrDeferral: rows.filter((r) => r.activeTrackStatus === "active_track" && r.servedByGuidanceOrDeferral).length,
  orphanedOrOptionalAssets: rows.filter((r) => r.activeTrackStatus === "orphaned_or_optional").length,
  archiveCandidates: byDisposition("archive_candidate").length,
  retirementCandidates: byDisposition("retire_candidate").length,
  referenceOnly: byDisposition("reference_only").length,
  orphaned: byDisposition("orphaned").length,
  optional: byDisposition("optional").length,
  officialSourceRequired: byDisposition("official_source_required").length,
  certificationUnproven: byDisposition("certification_unproven").length,
  independentReviewRequired: byDisposition("independent_review_required").length,
  legalDesignHold: byDisposition("legal_design_hold").length,
  // Acquisition, by priority. Priority 4 is a refusal, not a backlog position.
  sourceAcquisitionCandidates: rows.filter((r) => r.acquisitionPriority !== null && r.acquisitionPriority !== 4).length,
  sourceAcquisitionPriority1: byPriority(1).length,
  sourceAcquisitionPriority2: byPriority(2).length,
  sourceAcquisitionPriority3: byPriority(3).length,
  sourceAcquisitionPriority4DoNotAcquire: byPriority(4).length,
  assetsAwaitingAPlacementDecision: rows.filter((r) => r.labelsAwaitingAPlacementDecision > 0).length,
  recordedTitlesThatLookMisextracted: rows.filter((r) => r.formNameLooksMisextracted).length,
  assetsWithNoTrackBinding: rows.filter((r) => r.trackBindingStatus.startsWith("no_track_binding_established")).length,
  assetsWithACandidateUnconfirmedTrackBinding: rows.filter((r) => r.candidateRegistryFormId).length,
  neverIndependentlyReviewed: rows.filter((r) => r.independentReviewStatus === "never_independently_reviewed").length,
  sellable: rows.filter((r) => r.sellable).length,
  publicPacketRoutes: rows.filter((r) => r.publicPacketRoute).length,
  highSeverity: rows.filter((r) => r.severity === "high").length
};

for (const row of rows) {
  if (!DISPOSITIONS[row.disposition]) fail(`${row.jurisdiction} ${row.formNumber} carries the unknown disposition ${row.disposition}`);
  if (row.releaseStatus !== "HELD") fail(`${row.jurisdiction} ${row.formNumber} is not held`);
  if (row.acquisitionPriority === 4 && row.acquisitionRule !== PRIORITY_4_RULE) {
    fail(`${row.jurisdiction} ${row.formNumber} is priority 4 without the do-not-acquire rule`);
  }
  if (row.activeTrackStatus === "orphaned_or_optional"
    && ["active_track_delivery_hold", "certification_unproven", "independent_review_required"].includes(row.disposition)) {
    fail(`${row.jurisdiction} ${row.formNumber} is orphaned or optional yet carries the active-track disposition ${row.disposition}`);
  }
  for (const id of row.rootCauseIds) {
    if (!ROOT_CAUSES[id]) fail(`${row.jurisdiction} ${row.formNumber} names the unknown root cause ${id}`);
  }
}
if (totals.sellable !== 0) fail(`${totals.sellable} problematic asset(s) sit on a sellable route`);
if (totals.publicPacketRoutes !== 0) fail(`${totals.publicPacketRoutes} problematic asset(s) sit on a public packet route`);

const payload = {
  schemaVersion: "rcap-problematic-pdf-master-list/v1",
  generatedBy: "scripts/generate-rcap-problematic-pdf-master-list.mjs",
  purpose: "Every problematic PDF asset with the one remediation lane it is in, its exact blocker, its exact next action and its owner.",
  derivedFrom: {
    register: "data/rcap-all50/problematic-pdf-register.json",
    finalizedArtifactAudit: "data/rcap-all50/finalized-artifact-audit.json",
    contactSheetVisualProof: "data/rcap-all50/contact-sheet-visual-proof.json"
  },
  lanes: LANES,
  dispositions: DISPOSITIONS,
  acquisitionPriorities: ACQUISITION_PRIORITIES,
  readingThisList: "Every asset carries exactly one operational disposition and, where bytes are missing, exactly one acquisition priority. `releaseStatus` is a separate axis and is HELD for every asset: no row here is approved, sellable, public, packet-ready or ready for checkout. An orphaned or optional asset is not a launch blocker; it is recorded so it is not lost.",
  onTwoCountsThatOverlap: "`activeTrackAssetsSafelyServedByGuidanceOrDeferral` and `activeTrackAssetsBlockingPacketPromotion` overlap by one asset, and that is not a contradiction. Every active-track participant is served today by a guidance or exact-deferral treatment. One of those assets ALSO carries a production_packet treatment in the pinned legal design, so its route is the only one whose packet promotion is waiting on this lane. It is simultaneously safe for the participant now and the single packet blocker.",
  highestPermissibleStatus: "READY FOR INDEPENDENT REGISTER AND EVIDENCE REVIEW. No new PDF correction occurred in this lane, so no form family is ready for independent correction review.",
  highestPermissibleDisposition: "READY FOR INDEPENDENT PDF REVIEW. No row in this list is approved for live, public, sellable or checkout, and this generator refuses to emit a list in which any problematic asset is sellable or on a public packet route.",
  totals,
  rows
};

// ---- documents --------------------------------------------------------------
const payload_onTwoCountsThatOverlap = "`Active-track assets safely served by guidance or exact deferral` and `Active-track assets blocking packet promotion` overlap by one asset, and that is not a contradiction: every active-track participant is served today, and one of those assets also carries a production_packet treatment in the pinned legal design, making its route the only packet promotion waiting on this lane.";
const md = [];
md.push("# Problematic PDF master list");
md.push("");
md.push("Generated by `scripts/generate-rcap-problematic-pdf-master-list.mjs`. Do not edit by hand.");
md.push("");
md.push("Every asset is in exactly one remediation lane and states the exact thing that would close it.");
md.push("");
md.push("| Measure | Count |");
md.push("| --- | ---: |");
// Written out rather than derived: a camel-case splitter renders these as
// "Lane B_source Acquisition Required" and "Assets With AFinalized Artifact".
const TOTAL_LABELS = {
  assetsTotal: "Assets in the register",
  activeTrack: "Serving an active launch track",
  orphanedOrOptional: "Orphaned or optional",
  expectedButAbsent: "Expected by legal design and absent",
  laneA_actionableNow: "Lane A — correctable now",
  laneB_sourceAcquisitionRequired: "Lane B — official source acquisition required",
  laneC_currentnessHold: "Lane C — source-currentness hold",
  laneD_legalDesignHold: "Lane D — legal-design hold",
  laneE_orphanedOrOptional: "Lane E — orphaned or optional",
  laneF_missingBinaryCompleteDeferral: "Lane F — missing binary, complete participant deferral",
  sourceBinariesPresentInClone: "Verified source binaries present in this clone",
  assetsWithAFinalizedArtifact: "Assets with a finalized rendered artifact",
  assetsWhoseActiveContentVerdictIsUnprovable: "Assets whose active-content verdict is unprovable",
  contactSheetsShowingAFill: "Contact sheets that show a fill",
  contactSheetsShowingNoFill: "Contact sheets that show no fill",
  activeTrackAssetsBlockingPacketPromotion: "Active-track assets blocking packet promotion",
  activeTrackAssetsSafelyServedByGuidanceOrDeferral: "Active-track assets safely served by guidance or exact deferral",
  orphanedOrOptionalAssets: "Orphaned or optional assets",
  archiveCandidates: "Archive candidates",
  retirementCandidates: "Retirement candidates",
  referenceOnly: "Reference-only documents",
  orphaned: "Orphaned",
  optional: "Optional",
  officialSourceRequired: "Official source required",
  certificationUnproven: "Certification unproven",
  independentReviewRequired: "Independent review required",
  legalDesignHold: "Legal-design hold",
  sourceAcquisitionCandidates: "Source-acquisition candidates (priorities 1-3)",
  sourceAcquisitionPriority1: "Acquisition priority 1 — packet-capable route waiting",
  sourceAcquisitionPriority2: "Acquisition priority 2 — review cannot begin",
  sourceAcquisitionPriority3: "Acquisition priority 3 — currentness or supersession",
  sourceAcquisitionPriority4DoNotAcquire: "Acquisition priority 4 — do not acquire without a named current use",
  assetsAwaitingAPlacementDecision: "Assets awaiting a write-box placement decision",
  recordedTitlesThatLookMisextracted: "Recorded official titles that look mis-extracted",
  assetsWithNoTrackBinding: "Assets with no track binding",
  assetsWithACandidateUnconfirmedTrackBinding: "Assets with a candidate, unconfirmed track binding",
  neverIndependentlyReviewed: "Never independently reviewed",
  sellable: "On a sellable route",
  publicPacketRoutes: "On a public packet route",
  highSeverity: "High severity"
};
for (const [key, value] of Object.entries(totals)) {
  md.push(`| ${TOTAL_LABELS[key] ?? key} | ${value} |`);
}
md.push("");
md.push("## Lanes");
md.push("");
for (const [key, name] of Object.entries(LANES)) {
  md.push(`- **${key}** — \`${name}\` (${byLane(key).length})`);
}
md.push("");
for (const [key, name] of Object.entries(LANES)) {
  const laneRows = byLane(key);
  md.push(`## Lane ${key} — ${name.replace(/_/g, " ")}`);
  md.push("");
  if (laneRows.length === 0) { md.push("_None._"); md.push(""); continue; }
  md.push("| Jurisdiction | Form | Tracks | Severity | Owner | Exact blocker | Exact next action |");
  md.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const row of laneRows) {
    const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
    md.push(`| ${row.jurisdiction} | ${cell(row.formNumber)} | ${row.affectedTrackIds.join(", ") || "—"} | ${row.severity} | ${cell(row.owner)} | ${cell(row.exactBlocker)} | ${cell(row.exactNextAction)} |`);
  }
  md.push("");
}

// The three queues someone actually works from, each row carrying everything
// needed to act on it without opening another file.
// ---- operational dispositions ----------------------------------------------
md.push("## Operational dispositions");
md.push("");
md.push("Every asset carries exactly one. `releaseStatus` is a separate axis and is HELD for all 128 — nothing here is approved, sellable, public, packet-ready or ready for checkout.");
md.push("");
md.push("| Disposition | Meaning | Assets |");
md.push("| --- | --- | ---: |");
for (const [key, meaning] of Object.entries(DISPOSITIONS)) {
  md.push(`| \`${key}\` | ${meaning} | ${byDisposition(key).length} |`);
}
md.push("");
md.push(payload_onTwoCountsThatOverlap);
md.push("");

// ---- root causes ------------------------------------------------------------
md.push("## Root causes");
md.push("");
md.push("How many assets carry a finding and how many distinct problems produce those findings are different questions. A systemic cause clears on every impacted asset at once; a family-specific one is this form's own work.");
md.push("");
md.push("| Root cause | Dimension | Scope | Impacted assets | Cleared by |");
md.push("| --- | --- | --- | ---: | --- |");
for (const cause of register.rootCauseIndex ?? []) {
  md.push(`| \`${cause.rootCauseId}\` | ${cause.dimension} | ${cause.scope} | ${cause.impactedAssets} | ${cause.clearedBy} |`);
}
md.push("");

// ---- acquisition queue, by priority ----------------------------------------
md.push("## Source-acquisition queue");
md.push("");
md.push("Priority 4 is a standing refusal, not a low queue position: retrieving an orphaned or reference-only PDF to move a backlog number buys nothing and creates a currentness obligation for an asset nobody reads.");
md.push("");
for (const priority of [1, 2, 3, 4]) {
  const queueRows = byPriority(priority);
  md.push(`### Priority ${priority} — ${ACQUISITION_PRIORITIES[priority]}`);
  md.push("");
  md.push(`${queueRows.length} asset(s).`);
  md.push("");
  if (queueRows.length === 0) { md.push("_None._"); md.push(""); continue; }
  if (priority === 4) {
    md.push("| Jurisdiction | Form | Disposition | Rule |");
    md.push("| --- | --- | --- | --- |");
    for (const row of queueRows) {
      md.push(`| ${row.jurisdiction} | ${row.formNumber} | \`${row.disposition}\` | \`${row.acquisitionRule}\` |`);
    }
    md.push("");
    continue;
  }
  for (const row of queueRows) {
    md.push(`#### ${row.jurisdiction} ${row.formNumber}`);
    md.push("");
    md.push(`- **Recorded official title**: ${row.formName}${row.formNameLooksMisextracted ? " _(this reads as a fragment of the form's body text rather than its heading; recorded as-is, and worth re-reading from the binary when it is acquired)_" : ""}`);
    md.push(`- **Affected route**: ${row.affectedTrackIds.join(", ") || "no track binding established"}${row.routeKinds.length ? ` (route kind: ${row.routeKinds.join(", ")})` : ""}`);
    md.push(`- **Active-track status**: ${row.activeTrackStatus}; disposition \`${row.disposition}\``);
    md.push(`- **Participant already safely served**: ${row.servedByGuidanceOrDeferral ? `yes — ${row.participantTreatment.join(", ") || "terminal treatment recorded"}` : "no terminal treatment recorded against a track"}`);
    md.push(`- **Controlling first-party publisher**: ${row.sourcePublisher ?? `not recorded (${row.sourcePublisherBasis})`}`);
    md.push(`- **Official URL**: ${row.officialSourceUrl ?? "none recorded"}`);
    md.push(`- **Expected revision / edition**: ${row.sourceRevision ?? "not recorded"}`);
    md.push(`- **Currently pinned hash**: ${row.sourceSha256 ?? "none pinned"}`);
    md.push(`- **Why the existing bytes are insufficient**: ${row.exactBlocker}`);
    md.push(`- **Work unlocked by acquisition**: ${row.exactNextAction}`);
    md.push(`- **Root causes**: ${row.rootCauseIds.join(", ") || "none recorded"}`);
    md.push("");
  }
}

md.push("## Exact legal-design questions");
md.push("");
const legalDesignRows = byDisposition("legal_design_hold");
if (legalDesignRows.length === 0) {
  md.push("_None recorded._ No production hold in this lane names a substantive legal choice; the holds are lifecycle and governance postures. The nearest open questions are the write-box placements below and the candidate track bindings in the acquisition queue.");
  md.push("");
} else {
  for (const row of legalDesignRows) {
    md.push(`- **${row.jurisdiction} ${row.formNumber}** — ${row.exactBlocker} Next: ${row.exactNextAction}`);
  }
  md.push("");
}

md.push("## Write-box placement decisions");
md.push("");
const placementRows = rows.filter((r) => r.labelsAwaitingAPlacementDecision > 0);
if (placementRows.length === 0) { md.push("_None._"); md.push(""); } else {
  md.push("| Jurisdiction | Form | Labels | Rendered evidence |");
  md.push("| --- | --- | ---: | --- |");
  for (const row of placementRows) {
    md.push(`| ${row.jurisdiction} | ${row.formNumber} | ${row.labelsAwaitingAPlacementDecision} | ${row.placementEvidenceImages.join(", ") || "binary not in this clone"} |`);
  }
  md.push("");
}

md.push("## Independent review queue");
md.push("");
md.push("Every asset here is held. None is approved, public, sellable, packet-ready or ready for checkout, and nothing in this lane may promote itself. No form family is ready for independent CORRECTION review, because no new PDF correction occurred: what is offered for review is the register, the evidence and the classification.");
md.push("");
md.push("| Jurisdiction | Form | Lane | Rendered artifact finalized | Active-content verdict | Contact sheet shows a fill | Independent review |");
md.push("| --- | --- | --- | --- | --- | --- | --- |");
for (const row of rows) {
  md.push(`| ${row.jurisdiction} | ${row.formNumber} | ${row.remediationLane} | ${row.anyFinalizedArtifact} | ${row.activeContentVerdict} | ${row.contactSheetShowsAFill === null ? "no sheet" : row.contactSheetShowsAFill} | ${row.independentReviewStatus} |`);
}
md.push("");

const CSV_COLUMNS = [
  "jurisdiction", "formNumber", "formName", "formNameLooksMisextracted", "remediationLane", "remediationLaneName", "activeTrackStatus",
  "affectedTrackIds", "trackBindingStatus", "candidateRegistryFormId", "candidateRegistryTrackIds", "routeKinds", "rendererKind", "packetCapable", "participantTreatment",
  "sellable", "publicPacketRoute", "checkoutSuppressed", "paymentSuppressed", "packetCreditConsumed",
  "officialSourceUrl", "sourcePublisher", "sourceRetrievalDate", "sourceRevision", "sourceSha256",
  "sourceBinaryPresentInClone", "sourceBinaryPathInClone", "currentnessStatus", "missingBinary",
  "structuralClass", "interactiveFieldCount", "anyFinalizedArtifact", "activeContentVerdict",
  "contactSheetShowsAFill", "defectCategories", "severity", "releaseRisk", "owner",
  "independentReviewStatus", "disposition", "dispositionMeaning", "acquisitionPriority", "acquisitionRule",
  "rootCauseIds", "systemicRootCauseIds", "familySpecificRootCauseIds",
  "packetCapableTreatment", "servedByGuidanceOrDeferral", "certifiableArtifacts",
  "labelsAwaitingAPlacementDecision", "exactBlocker", "exactNextAction", "releaseStatus"
];
const csvCell = (value) => {
  const text = Array.isArray(value) ? value.join(" ") : value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const csv = `${[CSV_COLUMNS.join(","), ...rows.map((row) => CSV_COLUMNS.map((c) => csvCell(row[c])).join(","))].join("\n")}\n`;

// ---- review gallery ---------------------------------------------------------
const escape = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const galleryRows = rows.filter((r) => r.contactSheetEvidenceImage);
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Problematic PDF audit gallery</title>
<style>
  :root { color-scheme: light dark; font-family: system-ui, -apple-system, Segoe UI, sans-serif; }
  body { margin: 0 auto; max-width: 72rem; padding: 2rem 1.25rem 4rem; line-height: 1.55; }
  h1 { font-size: 1.6rem; margin-bottom: .25rem; }
  .lede { opacity: .8; margin-top: 0; }
  table { border-collapse: collapse; width: 100%; font-size: .82rem; }
  th, td { border: 1px solid rgba(128,128,128,.35); padding: .35rem .5rem; text-align: left; vertical-align: top; }
  th { background: rgba(128,128,128,.14); }
  .wrap { overflow-x: auto; }
  figure { margin: 2rem 0; }
  figure img { width: 100%; height: auto; border: 1px solid rgba(128,128,128,.4); }
  figcaption { font-size: .85rem; opacity: .85; margin-top: .4rem; }
  code { font-size: .85em; }
  .lane { font-weight: 600; }
</style>
</head>
<body>
<h1>Problematic PDF audit gallery</h1>
<p class="lede">Generated by <code>scripts/generate-rcap-problematic-pdf-master-list.mjs</code>. Every asset below is <strong>held</strong>; none is approved, public, sellable, packet-ready or ready for checkout.</p>

<h2>What this package is</h2>
<p><strong>Problematic PDF audit corrected — source acquisition required before remediation.</strong> No new PDF family was corrected here and no official source was acquired. What changed is the inventory's truthfulness, its evidence, its classification and its verification.</p>

<h2>Operational dispositions</h2>
<p>Every asset carries exactly one. Release status is a separate axis and is HELD for all of them.</p>
<div class="wrap"><table>
<tr><th>Disposition</th><th>Meaning</th><th>Assets</th></tr>
${Object.entries(DISPOSITIONS).map(([key, meaning]) => `<tr><td class="lane">${escape(key)}</td><td>${escape(meaning)}</td><td>${byDisposition(key).length}</td></tr>`).join("\n")}
</table></div>

<h2>Root causes</h2>
<p>How many assets carry a finding and how many distinct problems produce them are different questions. A systemic cause clears on every impacted asset at once.</p>
<div class="wrap"><table>
<tr><th>Root cause</th><th>Dimension</th><th>Scope</th><th>Impacted assets</th></tr>
${(register.rootCauseIndex ?? []).map((c) => `<tr><td>${escape(c.rootCauseId)}</td><td>${escape(c.dimension)}</td><td>${escape(c.scope)}</td><td>${c.impactedAssets}</td></tr>`).join("\n")}
</table></div>

<h2>Source-acquisition priorities</h2>
<div class="wrap"><table>
<tr><th>Priority</th><th>Meaning</th><th>Assets</th></tr>
${[1, 2, 3, 4].map((n) => `<tr><td class="lane">${n}</td><td>${escape(ACQUISITION_PRIORITIES[n])}</td><td>${byPriority(n).length}</td></tr>`).join("\n")}
</table></div>

<h2>Lane counts</h2>
<div class="wrap"><table>
<tr><th>Lane</th><th>Meaning</th><th>Assets</th></tr>
${Object.entries(LANES).map(([key, name]) => `<tr><td class="lane">${key}</td><td>${escape(name.replace(/_/g, " "))}</td><td>${byLane(key).length}</td></tr>`).join("\n")}
</table></div>

<h2>Rendered visual evidence</h2>
<p>Each image is a real rendering of the committed blank-versus-filled contact sheet, produced through a PDF engine rather than by extracting text. Where the two panels are identical, the sheet shows a reviewer two blank forms and is not evidence of a fill.</p>
${galleryRows.map((row) => {
  const sheet = row.formFamilyIds.map((id) => sheetByFamily.get(id)).find(Boolean);
  const measured = sheet?.blankVsFilled?.differingPixelFraction ?? null;
  const control = sheet?.knownDifferentControl?.differingPixelFraction ?? null;
  const scale = control === null
    ? " No known-different control was available on this single-page sheet, so the reading rests on the corpus-wide calibration."
    : ` For scale, two genuinely different pages of this same form measure ${(control * 100).toFixed(2)}%.`;
  const verdict = row.contactSheetShowsAFill === false
    ? `Panels are visually identical (${((measured ?? 0) * 100).toFixed(4)}% of pixels differ). This sheet shows no fill.${scale}`
    : `Panels differ (${((measured ?? 0) * 100).toFixed(4)}% of pixels differ).${scale}`;
  return `<figure>
  <img src="${escape(path.relative(path.dirname(OUT_HTML), path.join(rootDir, row.contactSheetEvidenceImage)))}" alt="Rendered contact sheet, page 1, for ${escape(row.jurisdiction)} ${escape(row.formNumber)}">
  <figcaption><strong>${escape(row.jurisdiction)} ${escape(row.formNumber)}</strong> — lane ${escape(row.remediationLane)}. ${escape(verdict)}</figcaption>
</figure>`;
}).join("\n")}

<h2>Placement decisions awaiting a reviewer</h2>
<p>A flat official form has no widgets, so every value is placed by measured geometry. Where the document does not express a write box, the anchor capture asserts no coordinate — the correct refusal, since guessing a rectangle on a court filing is how a participant's name lands in a clerk's box. Each mark below is a label's <strong>measured</strong> position, not a proposed write box. Where the value belongs relative to it is the judgement being asked for.</p>
${rows.filter((row) => row.placementEvidenceImages.length > 0).flatMap((row) => row.placementEvidenceImages.map((image) => `<figure>
  <img src="${escape(path.relative(path.dirname(OUT_HTML), path.join(rootDir, image)))}" alt="Official ${escape(row.jurisdiction)} ${escape(row.formNumber)} with each candidate label marked at its measured position">
  <figcaption><strong>${escape(row.jurisdiction)} ${escape(row.formNumber)}</strong> — lane ${escape(row.remediationLane)}. ${row.labelsAwaitingAPlacementDecision} label(s) have no write box this document expresses.</figcaption>
</figure>`)).join("\n") || "<p><em>None.</em></p>"}

<h2>Every asset</h2>
<div class="wrap"><table>
<tr><th>Jurisdiction</th><th>Form</th><th>Disposition</th><th>Acq.</th><th>Lane</th><th>Owner</th><th>Exact blocker</th><th>Exact next action</th></tr>
${rows.map((row) => `<tr><td>${escape(row.jurisdiction)}</td><td>${escape(row.formNumber)}</td><td class="lane">${escape(row.disposition)}</td><td>${row.acquisitionPriority ?? "—"}</td><td class="lane">${escape(row.remediationLane)}</td><td>${escape(row.owner)}</td><td>${escape(row.exactBlocker)}</td><td>${escape(row.exactNextAction)}</td></tr>`).join("\n")}
</table></div>
</body>
</html>
`;

const outputs = [
  [OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`],
  [OUT_MD, `${md.join("\n")}`],
  [OUT_CSV, csv],
  [OUT_HTML, html]
];

if (checkOnly) {
  for (const [file, content] of outputs) {
    const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
    if (current !== content) fail(`${path.relative(rootDir, file)} is stale; re-run scripts/generate-rcap-problematic-pdf-master-list.mjs`);
  }
} else {
  for (const [file, content] of outputs) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
}

console.log(`OK problematic PDF master list — ${totals.assetsTotal} assets; lanes A:${totals.laneA_actionableNow} B:${totals.laneB_sourceAcquisitionRequired} C:${totals.laneC_currentnessHold} D:${totals.laneD_legalDesignHold} E:${totals.laneE_orphanedOrOptional} F:${totals.laneF_missingBinaryCompleteDeferral}; sellable ${totals.sellable}, public ${totals.publicPacketRoutes}`);
