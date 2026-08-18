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

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTER = path.join(rootDir, "data/rcap-all50/problematic-pdf-register.json");
const AUDIT = path.join(rootDir, "data/rcap-all50/finalized-artifact-audit.json");
const SHEET_PROOF = path.join(rootDir, "data/rcap-all50/contact-sheet-visual-proof.json");
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
    exactBlocker = `None for the render itself: the verified binary is present at ${binaryPathInClone}. Generation is separately withheld while ${productionHolds.join("; ") || "no hold"} stands.`;
  } else if (currentnessDefect) {
    lane = "C";
    exactBlocker = `Revision ${record?.revision ?? "(unrecorded)"} cannot be shown to be the currently published edition: freshness is recorded as ${record?.freshnessStatus ?? "unrecorded"} and no independent currentness review exists.`;
  } else {
    lane = "C";
    exactBlocker = `The asset carries a recorded source or design hold that no committed evidence resolves: ${productionHolds.join("; ") || "no hold text recorded"}.`;
  }

  const exactNextAction = {
    A: `Re-render ${entry.jurisdiction} ${entry.formId} from ${binaryPathInClone} through scripts/implement-rcap-official-forms-d1.mjs, then re-run the finalized-artifact audit and the contact-sheet visual proof for its family. Do not lift the recorded production holds to do it.`,
    B: `Retrieve the current official ${entry.jurisdiction} ${entry.formId} binary from its issuing body, record its URL, retrieval timestamp, publisher, edition date, byte length and SHA-256, and place it at the path its source record pins. Nothing downstream can proceed without those bytes.${activeTrackIds.length === 0 ? (candidateRegistryFormId ? ` Separately, confirm or reject the candidate form-number binding to ${entry.jurisdiction} ${candidateRegistryFormId} so this row can name the route it affects.` : " Separately, establish which packet component, if any, depends on this asset: no track binding exists and no candidate form-number match was found, so this row cannot currently name the route it affects.") : ""}`,
    C: `Confirm against the issuing body's own publication whether revision ${record?.revision ?? "(unrecorded)"} of ${entry.jurisdiction} ${entry.formId} is the currently published edition, and record the comparison and the superseded identity if it is not.`,
    D: `Put the recorded legal-design question to counsel and record the answer with its carrier before any field on ${entry.jurisdiction} ${entry.formId} is bound.`,
    E: `Decide retain, archive or retire for ${entry.jurisdiction} ${entry.formId} and record the decision. It blocks nothing in the meantime.`,
    F: `No participant action is pending. Keep the terminal treatment on ${activeTrackIds.join(", ")} and leave the asset recorded until its binary is supplied.`
  }[lane];

  const artifacts = (auditRow?.artifacts ?? []).filter((a) => a.present);
  const { publisher, basis } = publisherFrom(record);

  rows.push({
    // identity
    jurisdiction: entry.jurisdiction,
    assetId: entry.identity,
    formName: entry.formTitle ?? "not recorded in the committed source record",
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
    disposition: "HELD"
  });
}

rows.sort((a, b) => (a.jurisdiction + a.formNumber).localeCompare(b.jurisdiction + b.formNumber));

const byLane = (lane) => rows.filter((r) => r.remediationLane === lane);
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
  assetsWithNoTrackBinding: rows.filter((r) => r.trackBindingStatus.startsWith("no_track_binding_established")).length,
  assetsWithACandidateUnconfirmedTrackBinding: rows.filter((r) => r.candidateRegistryFormId).length,
  neverIndependentlyReviewed: rows.filter((r) => r.independentReviewStatus === "never_independently_reviewed").length,
  sellable: rows.filter((r) => r.sellable).length,
  publicPacketRoutes: rows.filter((r) => r.publicPacketRoute).length,
  highSeverity: rows.filter((r) => r.severity === "high").length
};

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
  highestPermissibleDisposition: "READY FOR INDEPENDENT PDF REVIEW. No row in this list is approved for live, public, sellable or checkout, and this generator refuses to emit a list in which any problematic asset is sellable or on a public packet route.",
  totals,
  rows
};

// ---- documents --------------------------------------------------------------
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
// Selected by predicate rather than by lane. A lane is the ONE thing that
// stops work first, so an asset that needs both a binary and a currentness
// answer lands in the acquisition lane and would drop out of a currentness
// queue keyed on lane C -- while the currentness question is still open.
const QUEUES = [
  ["Exact source-acquisition queue", (r) => r.remediationLane === "B",
   "Nobody in this repository can supply these. Each row names the form, the route it serves, what the participant gets meanwhile, and the exact bytes that are missing."],
  ["Exact legal-design questions", (r) => r.remediationLane === "D",
   "Each row is a substantive legal choice that no committed evidence resolves. Nothing on the form may be bound until it is answered and its carrier recorded."],
  ["Exact currentness queue", (r) => r.defectCategories.some((c) => ["stale_or_superseded", "currentness_unverified"].includes(c)),
   "Each row holds a binary that cannot be shown to be the currently published edition, whichever lane its first blocker puts it in."]
];
for (const [title, selects, blurb] of QUEUES) {
  md.push(`## ${title}`);
  md.push("");
  md.push(blurb);
  md.push("");
  const queueRows = rows.filter(selects);
  if (queueRows.length === 0) { md.push("_None._"); md.push(""); continue; }
  for (const row of queueRows) {
    md.push(`### ${row.jurisdiction} ${row.formNumber}${row.formName ? ` — ${row.formName}` : ""}`);
    md.push("");
    md.push(`- **Affected routes**: ${row.affectedTrackIds.join(", ") || "no active track requires it"}${row.routeKinds.length ? ` (route kind: ${row.routeKinds.join(", ")})` : ""}`);
    md.push(`- **Participant treatment today**: ${row.participantTreatment.join(", ") || "no terminal treatment recorded against a track"}`);
    md.push(`- **Checkout / payment / packet credit**: ${row.checkoutSuppressed ? "suppressed" : "NOT SUPPRESSED"} / ${row.paymentSuppressed ? "suppressed" : "NOT SUPPRESSED"} / ${row.packetCreditConsumed ? "CONSUMABLE" : "not consumed"}`);
    md.push(`- **Recorded official source**: ${row.officialSourceUrl ?? "none recorded"}`);
    md.push(`- **Publisher**: ${row.sourcePublisher ?? `not recorded (${row.sourcePublisherBasis})`}`);
    md.push(`- **Revision / retrieved / SHA-256**: ${row.sourceRevision ?? "unrecorded"} / ${row.sourceRetrievalDate ?? "unrecorded"} / ${row.sourceSha256 ?? "unrecorded"}`);
    md.push(`- **Currentness**: ${row.currentnessStatus}`);
    md.push(`- **Owner**: ${row.owner}`);
    md.push(`- **Exact missing evidence / blocker**: ${row.exactBlocker}`);
    md.push(`- **Exact next action**: ${row.exactNextAction}`);
    md.push("");
  }
}

md.push("## Independent review queue");
md.push("");
md.push("Every asset here is held. None is approved, public, sellable or ready for checkout, and nothing in this lane may promote itself.");
md.push("");
md.push("| Jurisdiction | Form | Lane | Rendered artifact finalized | Active-content verdict | Contact sheet shows a fill | Independent review |");
md.push("| --- | --- | --- | --- | --- | --- | --- |");
for (const row of rows) {
  md.push(`| ${row.jurisdiction} | ${row.formNumber} | ${row.remediationLane} | ${row.anyFinalizedArtifact} | ${row.activeContentVerdict} | ${row.contactSheetShowsAFill === null ? "no sheet" : row.contactSheetShowsAFill} | ${row.independentReviewStatus} |`);
}
md.push("");

const CSV_COLUMNS = [
  "jurisdiction", "formNumber", "formName", "remediationLane", "remediationLaneName", "activeTrackStatus",
  "affectedTrackIds", "trackBindingStatus", "candidateRegistryFormId", "candidateRegistryTrackIds", "routeKinds", "rendererKind", "packetCapable", "participantTreatment",
  "sellable", "publicPacketRoute", "checkoutSuppressed", "paymentSuppressed", "packetCreditConsumed",
  "officialSourceUrl", "sourcePublisher", "sourceRetrievalDate", "sourceRevision", "sourceSha256",
  "sourceBinaryPresentInClone", "sourceBinaryPathInClone", "currentnessStatus", "missingBinary",
  "structuralClass", "interactiveFieldCount", "anyFinalizedArtifact", "activeContentVerdict",
  "contactSheetShowsAFill", "defectCategories", "severity", "releaseRisk", "owner",
  "independentReviewStatus", "exactBlocker", "exactNextAction", "disposition"
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
<title>Problematic PDF review gallery</title>
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
<h1>Problematic PDF review gallery</h1>
<p class="lede">Generated by <code>scripts/generate-rcap-problematic-pdf-master-list.mjs</code>. Every asset below is <strong>held</strong>; none is approved, public, sellable or ready for checkout.</p>

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

<h2>Every asset</h2>
<div class="wrap"><table>
<tr><th>Jurisdiction</th><th>Form</th><th>Lane</th><th>Severity</th><th>Owner</th><th>Exact blocker</th><th>Exact next action</th></tr>
${rows.map((row) => `<tr><td>${escape(row.jurisdiction)}</td><td>${escape(row.formNumber)}</td><td class="lane">${escape(row.remediationLane)}</td><td>${escape(row.severity)}</td><td>${escape(row.owner)}</td><td>${escape(row.exactBlocker)}</td><td>${escape(row.exactNextAction)}</td></tr>`).join("\n")}
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
