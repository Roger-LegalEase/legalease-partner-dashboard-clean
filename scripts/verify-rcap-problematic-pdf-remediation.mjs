#!/usr/bin/env node
// The problematic-PDF lane's fail-closed contract.
//
//   node scripts/verify-rcap-problematic-pdf-remediation.mjs
//   node scripts/verify-rcap-problematic-pdf-remediation.mjs --mutations
//
// Everything here is checked against committed bytes. The lane's whole claim
// is that the register now tells the truth about what the artifacts are, so
// the checks are about agreement between the observations and the records
// derived from them, and about the two counters that must stay at zero.
//
// The mutation pass is the part that matters. A check that has never been seen
// to fail is not a check, so each mutation breaks exactly one thing and the
// pass asserts that the matching check -- and, where it is meaningful, only
// that check -- goes red. Every mutation runs under the repository's tracked
// mutation guard, which journals the bytes first and restores them on return,
// throw, exit and every catchable signal.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { structuralClassesAgree } from "./rcap-official-forms/rcap-structural-class.mjs";
import { ROOT_CAUSES } from "./rcap-official-forms/rcap-pdf-root-causes.mjs";
import { withTrackedMutation, assertTreeNotMidMutation } from "./lib/tracked-mutation-guard.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mutationsMode = process.argv.includes("--mutations");

const REGISTER = "data/rcap-all50/problematic-pdf-register.json";
const AUDIT = "data/rcap-all50/finalized-artifact-audit.json";
const SHEET_PROOF = "data/rcap-all50/contact-sheet-visual-proof.json";
const MASTER = "data/rcap-all50/problematic-pdf-master-list.json";
const F3 = "data/rcap-all50/review-artifacts/f3-visual-review.json";
const RETIREMENT = "data/rcap-all50/pdf-retirement-determination.json";
const PLACEMENT = "data/rcap-all50/overlay-placement-evidence.json";
const CLASSIFICATION = "data/rcap-all50/field-classification-coverage.json";
const FINALIZER = "scripts/rcap-official-forms/rcap-official-form-finalize.mjs";
const SEMANTICS = "scripts/rcap-official-forms/rcap-field-semantics.mjs";
const OVERLAY_DIR = "data/rcap-all50/overlays/production";
const WORKFLOW = ".github/workflows/rcap-all50-handoff.yml";
const QUEUE = "data/rcap-all50/source-acquisition-queue.json";
const ACQUISITION_WORKFLOW = ".github/workflows/rcap-source-acquisition-branch.yml";
const DERIVATION = "data/rcap-all50/flat-overlay-profile-derivation.json";
const RENDER_DRIVER = "scripts/render-rcap-flat-overlay-families.mjs";
const RENDER_REPORT = "data/rcap-all50/flat-overlay-render-report.json";

const abs = (repoPath) => path.join(rootDir, repoPath);
const readJson = (repoPath, fallback = null) => {
  const file = abs(repoPath);
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
};

// Statuses that say nothing a reader could act on. A row carrying one of these
// is a row somebody will have to re-derive by hand.
const VAGUE = [
  /\bneeds? work\b/i, /\breview later\b/i, /\bcoming soon\b/i, /\bto be determined\b/i,
  /\bfix (the )?form\b/i, /^\s*unknown\s*$/i, /\bTBD\b/, /\bproblematic\b\s*$/i
];

/**
 * Every check, each returning its own failures. Keyed so a mutation can assert
 * that one specific check went red rather than merely that something did.
 */
/**
 * Runs the factory on the values that actually reach it.
 *
 * The committed fixtures use a clean county fact, so no artifact in the
 * repository can show whether the suffix strip survives a trailing space --
 * and a trailing space is what a form field and a CSV import routinely
 * produce. An independent review rendered "La Crosse County  COUNTY" from
 * "La Crosse County " while the audit record claimed the suffix had been
 * removed. This exercises the behaviour rather than the artifact.
 */
async function suffixNormalizationFailures() {
  const failures = [];
  const profilePath = abs("data/rcap-all50/overlays/production/wisconsin/cr-266-form-en/overlay-profile.json");
  const sourcePath = abs("data/rcap-codex/remaining-tracks/source-receipts/wi-cr-266.pdf");
  if (!fs.existsSync(profilePath) || !fs.existsSync(sourcePath)) return failures;
  const profile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
  const anchor = (profile.anchors ?? []).find((a) => a.printedSuffixAfterBlank);
  if (!anchor) return failures;
  const sourceBytes = fs.readFileSync(sourcePath);

  // Imported fresh on every call, with a cache-busting query, so a mutation of
  // the factory on disk is actually exercised rather than answered by the copy
  // this process loaded at startup.
  let finalizeFlatOverlay;
  try {
    ({ finalizeFlatOverlay } = await import(
      `${pathToFileURL(abs(FINALIZER)).href}?probe=${crypto.randomUUID()}`
    ));
  } catch (error) {
    return [`the factory could not be loaded: ${error?.message ?? error}`];
  }

  // Every shape the same fact arrives in. The expected value is the county
  // without the word the form prints for itself.
  const cases = [
    ["La Crosse County", "La Crosse"],
    ["La Crosse County ", "La Crosse"],
    ["La Crosse County\t", "La Crosse"],
    ["La Crosse County\n", "La Crosse"],
    ["Milwaukee Co.", "Milwaukee"],
    ["La Crosse", null],
    // Trailing whitespace and no suffix. Trimming is not normalizing, and
    // recording it as if it were writes a false line into the one record a
    // reviewer would trust instead of looking at the page.
    ["La Crosse ", null]
  ];
  for (const [input, expected] of cases) {
    let result;
    try {
      result = await finalizeFlatOverlay({
        sourceBytes, expectedSha256: profile.sha256,
        anchors: [anchor], protectedRules: profile.protectedRules ?? [],
        facts: { [anchor.factId]: input }
      });
    } catch (error) {
      failures.push(`${JSON.stringify(input)}: the factory threw ${error?.message ?? error}`);
      continue;
    }
    const logged = (result.report.normalized ?? []).find((n) => n.anchor === anchor.label) ?? null;
    if (expected === null) {
      if (logged) failures.push(`${JSON.stringify(input)}: a normalization was recorded although the value carries no suffix to remove`);
      continue;
    }
    if (!logged) {
      failures.push(`${JSON.stringify(input)}: the suffix was not removed and nothing was recorded`);
      continue;
    }
    if (logged.to !== expected) {
      failures.push(`${JSON.stringify(input)}: normalized to ${JSON.stringify(logged.to)}, expected ${JSON.stringify(expected)}`);
    }
  }
  return failures;
}

function runChecks() {
  const failures = new Map();
  const fail = (check, message) => {
    if (!failures.has(check)) failures.set(check, []);
    failures.get(check).push(message);
  };

  const register = readJson(REGISTER);
  const audit = readJson(AUDIT);
  const sheetProof = readJson(SHEET_PROOF);
  const master = readJson(MASTER);
  const f3 = readJson(F3, { jobs: [] });

  for (const [name, value, repoPath] of [
    ["register", register, REGISTER], ["audit", audit, AUDIT],
    ["sheetProof", sheetProof, SHEET_PROOF], ["master", master, MASTER]
  ]) {
    if (!value) fail("artifacts_present", `${name} is missing or unparseable at ${repoPath}`);
  }
  if (failures.size > 0) return failures;

  // ---- 1. the structural-class vocabulary is applied everywhere ------------
  for (const stateDir of fs.readdirSync(abs(OVERLAY_DIR)).sort()) {
    const statePath = path.join(abs(OVERLAY_DIR), stateDir);
    if (!fs.statSync(statePath).isDirectory()) continue;
    for (const familyDir of fs.readdirSync(statePath).sort()) {
      const file = path.join(statePath, familyDir, "source-record.json");
      if (!fs.existsSync(file)) continue;
      const record = JSON.parse(fs.readFileSync(file, "utf8"));
      if (!("structuralClassAgrees" in record)) continue;
      const derived = structuralClassesAgree(record.structuralClassObserved, record.structuralClassDeclared);
      if (record.structuralClassAgrees !== derived) {
        fail("structural_class_vocabulary", `${stateDir}/${familyDir}: structuralClassAgrees is ${record.structuralClassAgrees}, the shared vocabulary derives ${derived}`);
      }
    }
  }

  // ---- 2. the audit's own verdicts are internally consistent --------------
  const auditArtifacts = audit.families.flatMap((f) => f.artifacts.filter((a) => a.present).map((a) => ({ family: f, artifact: a })));
  for (const { family, artifact } of auditArtifacts) {
    if (artifact.finalized && artifact.failures.length > 0) {
      fail("audit_self_consistent", `${family.familyId} ${artifact.rel}: called finalized while carrying failures ${artifact.failures.join(", ")}`);
    }
    if (!artifact.finalized && artifact.failures.length === 0) {
      fail("audit_self_consistent", `${family.familyId} ${artifact.rel}: called not finalized with no failure recorded`);
    }
    if (artifact.finalized && (artifact.formFields > 0 || artifact.xfaPresent || !artifact.byteInspectable
      || (artifact.activeContentHits ?? []).length > 0 || artifact.pages === 0)) {
      fail("audit_self_consistent", `${family.familyId} ${artifact.rel}: called finalized while live fields, XFA, object streams, residue or a zero page count are recorded against it`);
    }
  }

  // ---- 3. every unfinalized artifact reaches the register ------------------
  const registerByFamily = new Map();
  for (const record of register.records) {
    for (const familyId of record.familyIds) registerByFamily.set(familyId, record);
  }
  // A retired family is exempt from needing a register row, and only a retired
  // family is: the exemption is checked against the retirement determination
  // rather than taken from the audit's own flag, so marking a family retired in
  // one file cannot quietly remove it from the register in another.
  const retirement = readJson(RETIREMENT, { assets: [] });
  const retiredAssetKeys = new Set(
    (retirement.assets ?? [])
      .filter((a) => a.determination === "retirement_candidate")
      .flatMap((a) => a.familyIds)
  );
  for (const family of audit.families) {
    if (family.retired) {
      if (!retiredAssetKeys.has(family.familyId)) {
        fail("retirement_is_backed_by_the_determination", `${family.familyId} is marked retired in the artifact audit but the retirement determination does not name it as a retirement candidate`);
      }
      continue;
    }
    if (retiredAssetKeys.has(family.familyId)) {
      fail("retirement_is_backed_by_the_determination", `${family.familyId} is a retirement candidate yet still appears as operational in the artifact audit`);
    }
    const unfinalized = family.artifacts.filter((a) => a.present && !a.finalized);
    if (unfinalized.length === 0) continue;
    const record = registerByFamily.get(family.familyId);
    if (!record) {
      fail("unfinalized_artifacts_are_registered", `${family.familyId} carries ${unfinalized.length} unfinalized artifact(s) and no register record`);
      continue;
    }
    const recorded = record.defectCategories.some((c) => ["unfinalized_rendered_artifact", "rendered_artifact_not_byte_inspectable", "protected_field_populated", "xfa_javascript_or_active_content_residue", "missing_required_packet_component"].includes(c));
    if (!recorded) {
      fail("unfinalized_artifacts_are_registered", `${family.familyId} carries unfinalized artifacts but its register record names no artifact defect`);
    }
    if (unfinalized.some((a) => (a.protectedFieldsWrittenByFactory ?? []).length > 0)
      && !record.defectCategories.includes("protected_field_populated")) {
      fail("protected_field_writes_are_registered", `${family.familyId} has a factory-written protected field that the register does not record`);
    }
  }

  // ---- 4. the two counters that gate everything ---------------------------
  if (register.totals.problemPdfRoutesStillSellable !== 0) {
    fail("no_problematic_route_is_sellable", `the register reports ${register.totals.problemPdfRoutesStillSellable} problematic route(s) still sellable`);
  }
  if (register.totals.problemPdfRoutesStillPublic !== 0) {
    fail("no_problematic_route_is_public", `the register reports ${register.totals.problemPdfRoutesStillPublic} problematic route(s) still public`);
  }
  for (const row of master.rows) {
    if (row.sellable) fail("no_problematic_route_is_sellable", `${row.jurisdiction} ${row.formNumber} is on a sellable route`);
    if (row.publicPacketRoute) fail("no_problematic_route_is_public", `${row.jurisdiction} ${row.formNumber} is on a public packet route`);
  }

  // ---- 5. the master list covers the register exactly once ----------------
  const masterIds = master.rows.map((r) => r.assetId);
  const seen = new Set();
  for (const id of masterIds) {
    if (seen.has(id)) fail("master_list_covers_the_register", `asset ${id} appears more than once in the master list`);
    seen.add(id);
  }
  for (const record of register.records) {
    if (!seen.has(record.identity)) fail("master_list_covers_the_register", `register asset ${record.identity} is missing from the master list`);
  }

  // ---- 6. no vague status, and every row is still held --------------------
  for (const row of master.rows) {
    for (const field of ["exactBlocker", "exactNextAction"]) {
      const text = String(row[field] ?? "");
      if (text.trim().length < 30) {
        fail("no_vague_status", `${row.jurisdiction} ${row.formNumber}: ${field} is too short to be actionable`);
      }
      for (const pattern of VAGUE) {
        if (pattern.test(text)) fail("no_vague_status", `${row.jurisdiction} ${row.formNumber}: ${field} uses the non-status "${pattern.source}"`);
      }
    }

  }

  // ---- 7. lanes are assigned honestly -------------------------------------
  for (const row of master.rows) {
    if (row.remediationLane === "A" && !row.sourceBinaryPresentInClone) {
      fail("lane_a_needs_a_binary_in_the_clone", `${row.jurisdiction} ${row.formNumber} is in lane A with no verified source binary in the clone`);
    }
    if (row.missingBinary && !["B", "F"].includes(row.remediationLane)) {
      fail("missing_binary_is_never_packet_ready", `${row.jurisdiction} ${row.formNumber} has no binary yet sits in lane ${row.remediationLane}`);
    }
    if (row.missingBinary && row.anyFinalizedArtifact) {
      fail("missing_binary_is_never_packet_ready", `${row.jurisdiction} ${row.formNumber} has no binary yet claims a finalized artifact`);
    }
  }

  // ---- 8. every evidence path resolves ------------------------------------
  for (const row of master.rows) {
    for (const evidence of row.evidencePaths ?? []) {
      if (!fs.existsSync(abs(evidence))) fail("evidence_paths_resolve", `${row.jurisdiction} ${row.formNumber}: evidence path ${evidence} does not exist`);
    }
    if (row.contactSheetEvidenceImage && !fs.existsSync(abs(row.contactSheetEvidenceImage))) {
      fail("evidence_paths_resolve", `${row.jurisdiction} ${row.formNumber}: rendered evidence ${row.contactSheetEvidenceImage} does not exist`);
    }
  }

  // ---- 8b. no rendered evidence image is orphaned --------------------------
  // The forward check proves every referenced path exists. This is the reverse:
  // an image nothing references is evidence for a question that has moved on,
  // and it goes stale silently. The placement rendering for a family whose
  // write boxes have since been decided is exactly that case.
  const evidenceDir = "docs/record-clearing/pdf-visual-evidence";
  if (fs.existsSync(abs(evidenceDir))) {
    const placement = readJson(PLACEMENT, { families: [] });
    const referenced = new Set([
      ...(placement.families ?? []).flatMap((f) => f.renderedEvidence ?? []),
      ...(sheetProof.families ?? []).map((f) => f.renderedEvidence).filter(Boolean),
      ...master.rows.flatMap((r) => [r.contactSheetEvidenceImage, ...(r.placementEvidenceImages ?? [])]).filter(Boolean)
    ]);
    for (const file of fs.readdirSync(abs(evidenceDir))) {
      const rel = `${evidenceDir}/${file}`;
      if (!referenced.has(rel)) {
        fail("no_orphaned_evidence_images", `${rel} is referenced by no generated artifact; it is evidence for a question that has moved on`);
      }
    }
  }

  // ---- 9. a sheet that shows no fill is never treated as review evidence ---
  const f3StatusByFamily = new Map((f3.jobs ?? []).map((j) => [`${j.state}:${j.family}`, j.status]));
  for (const family of sheetProof.families) {
    if (family.panelsAreVisuallyIdentical !== true) continue;
    const status = f3StatusByFamily.get(family.familyId);
    if (status === "closed" || status === "approved") {
      fail("a_blank_sheet_is_not_review_evidence", `${family.familyId}: its contact sheet shows no fill, yet its visual-review job is ${status}`);
    }
    const record = registerByFamily.get(family.familyId);
    if (record && !record.defectCategories.includes("contact_sheet_shows_no_fill")) {
      fail("a_blank_sheet_is_not_review_evidence", `${family.familyId}: its contact sheet shows no fill and the register does not record it`);
    }
  }

  // ---- 10. every asset carries exactly one known operational disposition ---
  // "Held" is a release posture, not an operational state. Collapsing all 128
  // onto it groups a form whose route already delivers a complete deferral with
  // a form nobody can obtain, and tells a reader nothing about either.
  const DISPOSITION_VOCABULARY = new Set(Object.keys(master.dispositions ?? {}));
  const ACTIVE_TRACK_DISPOSITIONS = new Set([
    "active_track_delivery_hold", "certification_unproven", "independent_review_required"
  ]);
  const dispositionCounts = new Map();
  for (const row of master.rows) {
    if (!DISPOSITION_VOCABULARY.has(row.disposition)) {
      fail("every_asset_has_one_operational_disposition", `${row.jurisdiction} ${row.formNumber} carries the unknown disposition "${row.disposition}"`);
    }
    dispositionCounts.set(row.disposition, (dispositionCounts.get(row.disposition) ?? 0) + 1);
    if (row.releaseStatus !== "HELD") {
      fail("every_asset_stays_held", `${row.jurisdiction} ${row.formNumber} carries release status ${row.releaseStatus}`);
    }
  }
  // A single disposition across the whole register is the collapse this check
  // exists to catch, whatever that one value happens to be.
  if (master.rows.length > 1 && dispositionCounts.size <= 1) {
    fail("dispositions_are_not_collapsed", `all ${master.rows.length} assets share the single disposition "${[...dispositionCounts.keys()][0]}"`);
  }

  // ---- 11. an asset no active track requires is not a launch blocker -------
  for (const row of master.rows) {
    if (row.activeTrackStatus !== "orphaned_or_optional") continue;
    if (ACTIVE_TRACK_DISPOSITIONS.has(row.disposition)) {
      fail("orphaned_assets_are_not_active_blockers", `${row.jurisdiction} ${row.formNumber} is orphaned or optional yet carries the active-track disposition "${row.disposition}"`);
    }
    if (row.affectedTrackIds.length > 0) {
      fail("orphaned_assets_are_not_active_blockers", `${row.jurisdiction} ${row.formNumber} is classed orphaned or optional while naming ${row.affectedTrackIds.length} affected track(s)`);
    }
  }

  // ---- 12. every finding names a root cause the catalogue knows ------------
  for (const record of register.records) {
    if (!Array.isArray(record.rootCauseIds) || record.rootCauseIds.length === 0) {
      fail("root_cause_ids_resolve", `${record.identity} carries findings with no root cause recorded`);
      continue;
    }
    for (const defect of record.defects) {
      if (!defect.rootCauseId) {
        fail("root_cause_ids_resolve", `${record.identity}: a ${defect.category} finding names no root cause`);
      } else if (!ROOT_CAUSES[defect.rootCauseId]) {
        fail("root_cause_ids_resolve", `${record.identity}: unknown root cause ${defect.rootCauseId}`);
      }
    }
  }
  for (const cause of register.rootCauseIndex ?? []) {
    if (!ROOT_CAUSES[cause.rootCauseId]) {
      fail("root_cause_ids_resolve", `the root-cause index names unknown cause ${cause.rootCauseId}`);
    }
  }

  // ---- 13. a systemic cause is one problem, however many assets it touches -
  // The failure this guards against is arithmetic, not editorial: reporting a
  // systemic cause once per impacted asset turns one factory problem into 62.
  const indexById = new Map((register.rootCauseIndex ?? []).map((c) => [c.rootCauseId, c]));
  const systemicIn = (dimension) => [...indexById.values()]
    .filter((c) => ROOT_CAUSES[c.rootCauseId]?.dimension === dimension && ROOT_CAUSES[c.rootCauseId]?.scope === "systemic").length;
  for (const [dimension, key] of [["technical", "uniqueSystemicTechnicalRootCauses"], ["visual", "uniqueSystemicVisualRootCauses"], ["source", "uniqueSystemicSourceRootCauses"]]) {
    const expected = systemicIn(dimension);
    if (register.totals[key] !== expected) {
      fail("systemic_causes_are_counted_once", `${key} is ${register.totals[key]}; there are ${expected} distinct systemic ${dimension} causes in the index`);
    }
  }

  // ---- 14. priority 4 is a refusal, not a queue position -------------------
  for (const row of master.rows) {
    if (row.acquisitionPriority === 4 && row.acquisitionRule !== "do_not_acquire_without_a_named_current_use") {
      fail("priority_4_is_a_refusal", `${row.jurisdiction} ${row.formNumber} sits at priority 4 without the do-not-acquire rule (rule: ${row.acquisitionRule ?? "none"})`);
    }
    if (row.acquisitionPriority === 4 && row.activeTrackStatus === "active_track") {
      fail("priority_4_is_a_refusal", `${row.jurisdiction} ${row.formNumber} serves an active track yet is filed as do-not-acquire`);
    }
    if (row.acquisitionPriority !== null && ![1, 2, 3, 4].includes(row.acquisitionPriority)) {
      fail("priority_4_is_a_refusal", `${row.jurisdiction} ${row.formNumber} carries the unknown acquisition priority ${row.acquisitionPriority}`);
    }
  }

  // ---- 15. CI actually invokes this contract -------------------------------
  // Duplicated deliberately with the dedicated wiring check: whichever of the
  // two a reader runs, removing the invocation is visible.
  const workflow = fs.existsSync(abs(WORKFLOW)) ? fs.readFileSync(abs(WORKFLOW), "utf8") : "";
  if (!workflow.includes("run: node scripts/verify-rcap-problematic-pdf-remediation.mjs")) {
    fail("ci_invokes_this_contract", `${WORKFLOW} does not invoke this verifier directly`);
  }

  // ---- 15b. the three recorded decisions ----------------------------------
  // Participant values are drawn in black. The renderer defaulted to a dark
  // blue for no recorded reason, and an unexplained colour on a filed court
  // document is a difference nobody asked for.
  const finalizer = fs.existsSync(abs(FINALIZER)) ? fs.readFileSync(abs(FINALIZER), "utf8") : "";
  if (/color:\s*rgb\(0,\s*0,\s*0\.55\)/.test(finalizer)) {
    fail("participant_ink_is_black", "the finalizer draws participant values in the unexplained blue default again");
  }
  if (!/PARTICIPANT_INK\s*=\s*rgb\(0,\s*0,\s*0\)/.test(finalizer)) {
    fail("participant_ink_is_black", "the finalizer no longer defines PARTICIPANT_INK as black");
  }
  // The participant's official form carries the court's identity. Ours goes in
  // the sidecar. A finalizer that stamps its own Producer or Creator back onto
  // the artifact is putting partner branding on a court filing.
  if (/clean\.setProducer\(|clean\.setCreator\("LegalEase/.test(finalizer)) {
    fail("no_partner_branding_on_the_official_form", "the finalizer writes LegalEase branding into the participant artifact's metadata");
  }
  if (!/preserveSourceMetadata\(/.test(finalizer)) {
    fail("no_partner_branding_on_the_official_form", "the finalizer no longer carries the court's own metadata onto the artifact");
  }
  // Email Address must never resolve to a street address.
  const semantics = fs.existsSync(abs(SEMANTICS)) ? fs.readFileSync(abs(SEMANTICS), "utf8") : "";
  if (!/refuseWhen:\s*\/\\be\[-\\s\]\?mail\\b\//.test(semantics)) {
    fail("email_never_binds_a_street_address", "the street-address descriptor no longer refuses an email label; \"Email Address\" contains \"address\" and will bind the wrong fact");
  }

  // ---- 15c. every discovered field or anchor is classified ----------------
  const classification = readJson(CLASSIFICATION);
  if (!classification) {
    fail("every_field_is_classified", "the field-classification coverage report has not been generated");
  } else {
    if (classification.totals.classifiedFieldsOrAnchors !== classification.totals.discoveredFieldsOrAnchors) {
      fail("every_field_is_classified", `classified ${classification.totals.classifiedFieldsOrAnchors} of ${classification.totals.discoveredFieldsOrAnchors} discovered fields or anchors`);
    }
    for (const family of classification.families) {
      if (!family.complete) fail("every_field_is_classified", `${family.familyId} is incompletely classified (${family.classifiedFieldsOrAnchors}/${family.discoveredFieldsOrAnchors})`);
      if (family.entries.length === 0) fail("every_field_is_classified", `${family.familyId} carries an empty classification`);
    }
  }

  // ---- 16. a verdict without a working control is not a verdict -----------
  for (const family of sheetProof.families) {
    if (family.panelsAreVisuallyIdentical === true && family.controlDiscriminates === false) {
      fail("visual_verdicts_have_a_control", `${family.familyId}: an identical-panels verdict was recorded although the known-different control did not discriminate`);
    }
  }

  // ---- the source-acquisition queue ---------------------------------------
  // The queue decides what gets fetched from a court's own website. Every claim
  // it makes about where a form lives has to survive the same scrutiny as the
  // register: it must cover every asset, name only issuing bodies, and never
  // treat its own previous output as a recorded source.
  const queue = readJson(QUEUE);
  if (!queue) {
    fail("acquisition_queue_present", `the source-acquisition queue is missing or unparseable at ${QUEUE}`);
  } else {
    const sets = queue.sets ?? {};
    const allEntries = [
      ...(sets.exact_official_url_known ?? []),
      ...(sets.official_landing_page_known ?? []),
      ...(sets.no_official_source_identified ?? [])
    ];

    const queued = new Set(allEntries.map((e) => e.assetId));
    for (const row of master.rows ?? []) {
      if (!queued.has(row.assetId)) {
        fail("acquisition_queue_covers_every_asset", `${row.jurisdiction} ${row.formNumber}: on the master list but in no acquisition set`);
      }
    }
    if (allEntries.length !== (master.rows ?? []).length) {
      fail("acquisition_queue_covers_every_asset", `the three sets hold ${allEntries.length} entries for ${(master.rows ?? []).length} master-list rows`);
    }

    const hostsFor = (jurisdiction) => new Set(queue.officialHostsByJurisdiction?.[jurisdiction] ?? []);
    const hostOfUrl = (url) => { try { return new URL(url).hostname.toLowerCase(); } catch { return null; } };
    for (const entry of allEntries) {
      for (const [label, url] of [["url", entry.url], ["patternCandidate", entry.unverifiedPatternCandidateUrl]]) {
        if (!url) continue;
        if (/\s|\|/.test(url)) {
          fail("acquisition_queue_urls_are_single", `${entry.jurisdiction} ${entry.formNumber}: ${label} holds more than one URL in one field: ${url}`);
        }
        const host = hostOfUrl(url);
        if (!host || !hostsFor(entry.jurisdiction).has(host)) {
          fail("acquisition_queue_hosts_are_official", `${entry.jurisdiction} ${entry.formNumber}: ${label} points at ${host ?? url}, which is not a recorded issuing body for ${entry.jurisdiction}`);
        }
      }
      // A URL this generator itself emitted on a previous run is not a source
      // the repository recorded. Reading it back would launder a guess.
      for (const source of entry.reconciledFrom ?? []) {
        if (source === QUEUE) {
          fail("acquisition_queue_does_not_confirm_itself", `${entry.jurisdiction} ${entry.formNumber}: reconciled from the acquisition queue's own output`);
        }
      }
    }

    // Set 3 means no official source is identified. An entry there that carries
    // a URL is claiming the opposite.
    for (const entry of sets.no_official_source_identified ?? []) {
      if (entry.url) {
        fail("acquisition_queue_set3_names_no_source", `${entry.jurisdiction} ${entry.formNumber}: sits in the no-source set while carrying ${entry.url}`);
      }
    }

    for (const leg of [...(queue.matrix ?? []), ...(queue.probeMatrix ?? [])]) {
      const entry = allEntries.find((e) => e.assetId === leg.assetId);
      if (entry && entry.acquisitionPriority === 4) {
        fail("acquisition_queue_withholds_priority_4", `${leg.jurisdiction} ${leg.formNumber}: queued for fetching although priority 4 is do_not_acquire_without_a_named_current_use`);
      }
      if (!leg.url) {
        fail("acquisition_queue_withholds_priority_4", `${leg.jurisdiction} ${leg.formNumber}: queued with no URL`);
      }
    }

    // The dispatch-only workflow could only ever start from the default branch,
    // which is why nothing had been acquired. The branch workflow has to run on
    // an ordinary push or pull_request, and it has to read the queue.
    const acquisitionWorkflow = fs.existsSync(abs(ACQUISITION_WORKFLOW))
      ? fs.readFileSync(abs(ACQUISITION_WORKFLOW), "utf8") : null;
    if (!acquisitionWorkflow) {
      fail("acquisition_runs_on_this_branch", `${ACQUISITION_WORKFLOW} does not exist, so the queue can only be run from the default branch`);
    } else {
      if (!/^\s{2}push:/m.test(acquisitionWorkflow) && !/^\s{2}pull_request:/m.test(acquisitionWorkflow)) {
        fail("acquisition_runs_on_this_branch", `${ACQUISITION_WORKFLOW} has neither a push nor a pull_request trigger, so it cannot run on a feature branch`);
      }
      if (!acquisitionWorkflow.includes(QUEUE)) {
        fail("acquisition_runs_on_this_branch", `${ACQUISITION_WORKFLOW} does not read ${QUEUE}`);
      }
      // Acquisition is evidence gathering. A workflow that could write to the
      // repository would turn an unreviewed fetch into a committed source.
      if (/permissions:[\s\S]{0,200}contents:\s*write/.test(acquisitionWorkflow)) {
        fail("acquisition_commits_nothing", `${ACQUISITION_WORKFLOW} grants contents: write, so an unreviewed fetch could enter the repository`);
      }
      if (/git\s+(commit|push)/.test(acquisitionWorkflow)) {
        fail("acquisition_commits_nothing", `${ACQUISITION_WORKFLOW} runs a git commit or push`);
      }
    }
  }

  // ---- the generalised write-box derivation ------------------------------
  // CR-266 was measured by hand and then corrected by independent review. The
  // derivation exists so the other families are measured the corrected way
  // rather than the way that had to be corrected -- which is only worth
  // anything if it reproduces the reviewed profile exactly.
  const derivation = readJson(DERIVATION);
  if (!derivation) {
    fail("derivation_present", `the flat-overlay profile derivation is missing or unparseable at ${DERIVATION}`);
  } else {
    for (const row of derivation.derivations ?? []) {
      const agreement = row.agreementWithReviewedProfile;
      if (!agreement) continue;
      if (agreement.largestOffsetPt > 0) {
        fail("derivation_reproduces_the_reviewed_profile",
          `${row.familyId}: the derived write boxes differ from the independently reviewed ones by up to ${agreement.largestOffsetPt}pt`);
      }
      // A reviewed anchor the derivation cannot produce has to be named with a
      // reason. Silently producing fewer anchors than review established is how
      // a blank stops being filled without anyone deciding that.
      for (const missing of agreement.missingFromDerivation ?? []) {
        const profilePath = row.profilePath ? abs(row.profilePath) : null;
        const derived = profilePath && fs.existsSync(profilePath)
          ? JSON.parse(fs.readFileSync(profilePath, "utf8")) : null;
        const explained = (derived?.refusedCaptions ?? []).some((r) => r.factId === missing.factId || r.page === missing.page);
        if (!explained) {
          fail("derivation_reproduces_the_reviewed_profile",
            `${row.familyId}: the reviewed anchor ${missing.factId} is absent from the derivation and no refusal explains it`);
        }
      }
    }

    // A derived profile is review input. If the render driver read it, an
    // unreviewed coordinate would reach a filed court document.
    const driver = fs.existsSync(abs(RENDER_DRIVER)) ? fs.readFileSync(abs(RENDER_DRIVER), "utf8") : "";
    if (driver.includes("overlay-profile.derived.json")) {
      fail("derived_profiles_are_not_runtime_input",
        `${RENDER_DRIVER} reads overlay-profile.derived.json, so a coordinate nobody reviewed can reach a rendered artifact`);
    }
    for (const row of (derivation.derivations ?? []).filter((d) => d.derived)) {
      const profilePath = row.profilePath ? abs(row.profilePath) : null;
      const derived = profilePath && fs.existsSync(profilePath)
        ? JSON.parse(fs.readFileSync(profilePath, "utf8")) : null;
      if (derived && derived.requiresIndependentReviewBeforeUse !== true) {
        fail("derived_profiles_are_not_runtime_input",
          `${row.familyId}: the derived profile does not declare that it needs review before use`);
      }
    }
  }

  // ---- the three guards the second independent review required -------------
  const renderReport = readJson(RENDER_REPORT);
  for (const family of (renderReport?.families ?? []).filter((f) => f.rendered)) {
    const [state, slug] = family.familyId.split(":");
    const dir = path.join(OVERLAY_DIR, "..", "..", "..");
    const profilePath = [...fs.readdirSync(abs(OVERLAY_DIR))]
      .map((st) => path.join(abs(OVERLAY_DIR), st, slug, "overlay-profile.json"))
      .find((candidate) => fs.existsSync(candidate));
    const profile = profilePath ? JSON.parse(fs.readFileSync(profilePath, "utf8")) : null;
    if (!profile) continue;
    void state; void dir;

    // A blank followed by the word it is a blank for. Wisconsin's venue line
    // prints "CIRCUIT COURT, ______ COUNTY", and a county fact carrying its own
    // suffix rendered "Example County        COUNTY" on the caption of a
    // petition. Where an anchor declares the printed suffix, the value drawn
    // must not still carry it.
    for (const anchor of profile.anchors ?? []) {
      const suffix = anchor.printedSuffixAfterBlank;
      if (!suffix) continue;
      const suffixRe = new RegExp(`\\b${suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.?$`, "i");
      for (const label of ["canonicalNormalized", "boundaryNormalized"]) {
        for (const n of family[label] ?? []) {
          if (n.anchor !== anchor.label) continue;
          if (suffixRe.test(n.to)) {
            fail("printed_suffix_is_not_repeated",
              `${family.familyId}: ${anchor.label} was normalized to ${JSON.stringify(n.to)}, which still carries the ${JSON.stringify(suffix)} the form prints itself`);
          }
        }
      }
      const written = (family.canonicalWritten ?? []).includes(anchor.label);
      const normalized = (family.canonicalNormalized ?? []).some((n) => n.anchor === anchor.label);
      if (written && !normalized) {
        fail("printed_suffix_is_not_repeated",
          `${family.familyId}: ${anchor.label} declares that the form prints ${JSON.stringify(suffix)} after the blank, but the canonical render recorded no normalization, so either the fact changed or the stripping stopped happening`);
      }
    }

    // Protection had been a naming convention: the protect rules were applied
    // to the anchor's label, so a box on the signature rule was accepted under
    // a different name. A rule the map calls the court's must be refused for
    // where the box lands, not for what it is called.
    for (const rule of profile.protectedRules ?? []) {
      void 0;
      const trespassers = (profile.anchors ?? []).filter((a) => a.page === rule.page
        && Math.abs(rule.y + 2 - a.writeBox.y) <= 3
        && a.writeBox.x < rule.endX && a.writeBox.x + a.writeBox.width > rule.x);
      for (const anchor of trespassers) {
        for (const label of ["canonicalRefused", "boundaryRefused"]) {
          const refusal = (family[label] ?? []).find((r) => r.anchor === anchor.label);
          if (!refusal) {
            fail("protection_is_geometric_not_only_by_label",
              `${family.familyId}: ${anchor.label} lands on the protected rule at y=${rule.y} and the ${label.replace("Refused", "")} render did not refuse it`);
          } else if (refusal.reason !== "write_box_lands_on_a_rule_the_court_owns") {
            fail("protection_is_geometric_not_only_by_label",
              `${family.familyId}: ${anchor.label} lands on the protected rule at y=${rule.y} but was refused for ${JSON.stringify(refusal.reason)}; a label match is not a guarantee about where the box is`);
          }
        }
      }
    }

    // Geometric protection is opt-in, so a family that simply omits
    // protectedRules gets no protected-rule check at all. That is the failure
    // mode once this pattern is copied across fifty states.
    const ownedCaptions = (profile.anchors ?? []).filter((a) => /signature|notar|clerk|judge|attorney|state bar/i.test(a.label));
    if (ownedCaptions.length > 0 && (profile.protectedRules ?? []).length === 0) {
      fail("protection_is_geometric_not_only_by_label",
        `${family.familyId}: carries ${ownedCaptions.length} anchor(s) on a caption the court owns and declares no protectedRules, so nothing checks where a write box lands`);
    }

    // A value drawn off the page is a value that is not on the filed document.
    for (const anchor of profile.anchors ?? []) {
      const page = (profile.pageGeometry ?? []).find((g) => g.page === anchor.page);
      if (!page) continue;
      const box = anchor.writeBox;
      if (box.x < 0 || box.y < 0 || box.x + box.width > page.width + 0.5 || box.y + box.height > page.height + 0.5) {
        fail("write_boxes_stay_on_the_page",
          `${family.familyId}: ${anchor.label} writes to ${box.x},${box.y} ${box.width}x${box.height} on a ${page.width}x${page.height} page`);
      }
    }
  }

  return failures;
}

function report(failures, label) {
  const total = [...failures.values()].reduce((n, list) => n + list.length, 0);
  if (total === 0) {
    console.log(`OK ${label}`);
    return true;
  }
  console.error(`FAIL ${label} — ${total} failure(s) across ${failures.size} check(s)`);
  for (const [check, messages] of failures) {
    console.error(`  ${check}:`);
    for (const message of messages.slice(0, 6)) console.error(`    - ${message}`);
    if (messages.length > 6) console.error(`    ... and ${messages.length - 6} more`);
  }
  return false;
}

// ---- baseline ---------------------------------------------------------------
assertTreeNotMidMutation("verify-rcap-problematic-pdf-remediation.mjs");
async function runAllChecks() {
  const failures = runChecks();
  for (const message of await suffixNormalizationFailures()) {
    if (!failures.has("printed_suffix_is_not_repeated")) failures.set("printed_suffix_is_not_repeated", []);
    failures.get("printed_suffix_is_not_repeated").push(message);
  }
  return failures;
}

const baseline = await runAllChecks();
if (!report(baseline, "problematic PDF remediation contract")) process.exit(1);

if (!mutationsMode) process.exit(0);

// ---- mutations --------------------------------------------------------------
// Each case edits committed bytes, re-runs every check, and requires the named
// check to be among the ones that went red. Starting green is a precondition:
// a mutation pass on an already-red tree proves nothing.
const MUTATION_TARGETS = [REGISTER, AUDIT, SHEET_PROOF, MASTER, F3, WORKFLOW, RETIREMENT, PLACEMENT, CLASSIFICATION, FINALIZER, SEMANTICS, QUEUE, ACQUISITION_WORKFLOW, DERIVATION, RENDER_DRIVER, RENDER_REPORT,
  "data/rcap-all50/overlays/production/wisconsin/cr-266-form-en/overlay-profile.json"];

const CASES = [
  {
    name: "the suffix strip stops trimming before it matches",
    expect: "printed_suffix_is_not_repeated",
    apply: () => {
      const text = fs.readFileSync(abs(FINALIZER), "utf8");
      fs.writeFileSync(abs(FINALIZER), text.replace("const base = raw.trim();", "const base = raw;"));
    }
  },
  {
    name: "a normalization is recorded when only whitespace came off",
    expect: "printed_suffix_is_not_repeated",
    apply: () => {
      const text = fs.readFileSync(abs(FINALIZER), "utf8");
      fs.writeFileSync(abs(FINALIZER), text.replace("if (stripped !== base && stripped.length > 0) {", "if (stripped !== raw && stripped.length > 0) {"));
    }
  },
  {
    name: "a map with a signature caption declares no protected rules",
    expect: "protection_is_geometric_not_only_by_label",
    apply: () => {
      const profile = readJson("data/rcap-all50/overlays/production/wisconsin/cr-266-form-en/overlay-profile.json");
      profile.protectedRules = [];
      fs.writeFileSync(abs("data/rcap-all50/overlays/production/wisconsin/cr-266-form-en/overlay-profile.json"), `${JSON.stringify(profile, null, 2)}\n`);
    }
  },
  {
    name: "a county value keeps the suffix the form already prints",
    expect: "printed_suffix_is_not_repeated",
    apply: () => {
      const report = readJson(RENDER_REPORT);
      const family = report.families.find((f) => f.canonicalNormalized?.length > 0);
      family.canonicalNormalized[0].to = `${family.canonicalNormalized[0].to} County`;
      fs.writeFileSync(abs(RENDER_REPORT), `${JSON.stringify(report, null, 2)}\n`);
    }
  },
  {
    name: "the normalization silently stops happening",
    expect: "printed_suffix_is_not_repeated",
    apply: () => {
      const report = readJson(RENDER_REPORT);
      const family = report.families.find((f) => f.canonicalNormalized?.length > 0);
      family.canonicalNormalized = [];
      fs.writeFileSync(abs(RENDER_REPORT), `${JSON.stringify(report, null, 2)}\n`);
    }
  },
  {
    name: "a signature-rule refusal is downgraded to a label match",
    expect: "protection_is_geometric_not_only_by_label",
    apply: () => {
      const report = readJson(RENDER_REPORT);
      for (const family of report.families) {
        for (const r of family.canonicalRefused ?? []) {
          if (r.reason === "write_box_lands_on_a_rule_the_court_owns") r.reason = "protected_by_category";
        }
      }
      fs.writeFileSync(abs(RENDER_REPORT), `${JSON.stringify(report, null, 2)}\n`);
    }
  },
  {
    name: "a write box is pushed off the right edge of the page",
    expect: "write_boxes_stay_on_the_page",
    apply: () => {
      const profile = readJson("data/rcap-all50/overlays/production/wisconsin/cr-266-form-en/overlay-profile.json");
      profile.anchors[0].writeBox.x = 560;
      profile.anchors[0].writeBox.width = 200;
      fs.writeFileSync(abs("data/rcap-all50/overlays/production/wisconsin/cr-266-form-en/overlay-profile.json"), `${JSON.stringify(profile, null, 2)}\n`);
    }
  },
  {
    name: "a derived write box drifts from the independently reviewed one",
    expect: "derivation_reproduces_the_reviewed_profile",
    apply: () => {
      const derivation = readJson(DERIVATION);
      const row = derivation.derivations.find((d) => d.agreementWithReviewedProfile);
      row.agreementWithReviewedProfile.largestOffsetPt = 3.4;
      fs.writeFileSync(abs(DERIVATION), `${JSON.stringify(derivation, null, 2)}\n`);
    }
  },
  {
    name: "a reviewed anchor vanishes from the derivation with no refusal to explain it",
    expect: "derivation_reproduces_the_reviewed_profile",
    apply: () => {
      const derivation = readJson(DERIVATION);
      const row = derivation.derivations.find((d) => d.agreementWithReviewedProfile);
      row.agreementWithReviewedProfile.missingFromDerivation = [
        { label: "Invented", factId: "participant.invented_fact", page: 99 }
      ];
      fs.writeFileSync(abs(DERIVATION), `${JSON.stringify(derivation, null, 2)}\n`);
    }
  },
  {
    name: "the render driver is pointed at the unreviewed derived profile",
    expect: "derived_profiles_are_not_runtime_input",
    apply: () => {
      const text = fs.readFileSync(abs(RENDER_DRIVER), "utf8");
      fs.writeFileSync(abs(RENDER_DRIVER), text.replace('"overlay-profile.json"', '"overlay-profile.derived.json"'));
    }
  },
  {
    name: "an asset is dropped from every acquisition set",
    expect: "acquisition_queue_covers_every_asset",
    apply: () => {
      const queue = readJson(QUEUE);
      queue.sets.official_landing_page_known.pop();
      fs.writeFileSync(abs(QUEUE), `${JSON.stringify(queue, null, 2)}\n`);
    }
  },
  {
    name: "an acquisition URL is moved to a commercial form site",
    expect: "acquisition_queue_hosts_are_official",
    apply: () => {
      const queue = readJson(QUEUE);
      queue.sets.exact_official_url_known[0].url = "https://www.uslegalforms.com/form.pdf";
      fs.writeFileSync(abs(QUEUE), `${JSON.stringify(queue, null, 2)}\n`);
    }
  },
  {
    name: "the queue is made to cite its own previous output as a source",
    expect: "acquisition_queue_does_not_confirm_itself",
    apply: () => {
      const queue = readJson(QUEUE);
      queue.sets.exact_official_url_known[0].reconciledFrom = [QUEUE];
      fs.writeFileSync(abs(QUEUE), `${JSON.stringify(queue, null, 2)}\n`);
    }
  },
  {
    name: "a no-source asset is given a URL while staying in set 3",
    expect: "acquisition_queue_set3_names_no_source",
    apply: () => {
      const queue = readJson(QUEUE);
      const entry = queue.sets.no_official_source_identified[0];
      entry.url = `https://${queue.officialHostsByJurisdiction[entry.jurisdiction][0]}/guessed.pdf`;
      fs.writeFileSync(abs(QUEUE), `${JSON.stringify(queue, null, 2)}\n`);
    }
  },
  {
    name: "a priority-4 asset is queued for fetching",
    expect: "acquisition_queue_withholds_priority_4",
    apply: () => {
      const queue = readJson(QUEUE);
      const four = [...queue.sets.exact_official_url_known, ...queue.sets.official_landing_page_known]
        .find((e) => e.acquisitionPriority === 4);
      queue.matrix.push({ jurisdiction: four.jurisdiction, formNumber: four.formNumber, url: four.url,
        urlKind: four.urlKind, expectedSha256: "", assetId: four.assetId });
      fs.writeFileSync(abs(QUEUE), `${JSON.stringify(queue, null, 2)}\n`);
    }
  },
  {
    name: "two URLs are packed into one acquisition field",
    expect: "acquisition_queue_urls_are_single",
    apply: () => {
      const queue = readJson(QUEUE);
      const entry = queue.sets.exact_official_url_known[0];
      entry.url = `${entry.url} | ${entry.url}`;
      fs.writeFileSync(abs(QUEUE), `${JSON.stringify(queue, null, 2)}\n`);
    }
  },
  {
    name: "the acquisition workflow loses its branch triggers",
    expect: "acquisition_runs_on_this_branch",
    apply: () => {
      const text = fs.readFileSync(abs(ACQUISITION_WORKFLOW), "utf8");
      fs.writeFileSync(abs(ACQUISITION_WORKFLOW), text
        .replace(/^  push:$/m, "  # push:")
        .replace(/^  pull_request:$/m, "  # pull_request:"));
    }
  },
  {
    name: "the acquisition workflow is given write access to the repository",
    expect: "acquisition_commits_nothing",
    apply: () => {
      const text = fs.readFileSync(abs(ACQUISITION_WORKFLOW), "utf8");
      fs.writeFileSync(abs(ACQUISITION_WORKFLOW), text.replace("  contents: read", "  contents: write"));
    }
  },
  {
    name: "a protected clerk field is made writable",
    expect: "protected_field_writes_are_registered",
    apply: () => {
      const audit = readJson(AUDIT);
      // An operational family on purpose: a retired one is exempt from needing a
      // register row, so mutating it would prove nothing about this check.
      const family = audit.families.find((f) => !f.retired && f.artifacts.some((a) => a.present));
      const artifact = family.artifacts.find((a) => a.present);
      artifact.protectedFieldsWrittenByFactory = ["ClerkOfSuperiorCourtSignature"];
      artifact.failures = [...new Set([...artifact.failures, "protected_field_written_by_the_factory"])];
      fs.writeFileSync(abs(AUDIT), `${JSON.stringify(audit, null, 2)}\n`);
    }
  },
  {
    name: "active JavaScript survives into a finalized artifact",
    expect: "audit_self_consistent",
    apply: () => {
      const audit = readJson(AUDIT);
      const artifact = audit.families.flatMap((f) => f.artifacts).find((a) => a.present);
      artifact.activeContentHits = ["document_javascript"];
      artifact.failures = [];
      artifact.finalized = true;
      fs.writeFileSync(abs(AUDIT), `${JSON.stringify(audit, null, 2)}\n`);
    }
  },
  {
    name: "XFA survives into a finalized artifact",
    expect: "audit_self_consistent",
    apply: () => {
      const audit = readJson(AUDIT);
      const artifact = audit.families.flatMap((f) => f.artifacts).find((a) => a.present);
      artifact.xfaPresent = true;
      artifact.failures = [];
      artifact.finalized = true;
      fs.writeFileSync(abs(AUDIT), `${JSON.stringify(audit, null, 2)}\n`);
    }
  },
  {
    name: "a page is dropped from a finalized artifact",
    expect: "audit_self_consistent",
    apply: () => {
      const audit = readJson(AUDIT);
      const artifact = audit.families.flatMap((f) => f.artifacts).find((a) => a.present);
      artifact.pages = 0;
      artifact.failures = [];
      artifact.finalized = true;
      fs.writeFileSync(abs(AUDIT), `${JSON.stringify(audit, null, 2)}\n`);
    }
  },
  {
    name: "an unfinalized artifact stops reaching the register",
    expect: "unfinalized_artifacts_are_registered",
    apply: () => {
      const register = readJson(REGISTER);
      for (const record of register.records) {
        record.defectCategories = record.defectCategories.filter((c) => ![
          "unfinalized_rendered_artifact", "rendered_artifact_not_byte_inspectable",
          "protected_field_populated", "xfa_javascript_or_active_content_residue",
          "missing_required_packet_component"
        ].includes(c));
      }
      fs.writeFileSync(abs(REGISTER), `${JSON.stringify(register, null, 2)}\n`);
    }
  },
  {
    name: "a source record's structural class drifts from the shared vocabulary",
    expect: "structural_class_vocabulary",
    apply: () => {
      const file = path.join(abs(OVERLAY_DIR), "north-carolina/aoc-cr-287-form-en/source-record.json");
      const record = JSON.parse(fs.readFileSync(file, "utf8"));
      record.structuralClassAgrees = !record.structuralClassAgrees;
      fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
    },
    extraTargets: [`${OVERLAY_DIR}/north-carolina/aoc-cr-287-form-en/source-record.json`]
  },
  {
    name: "a problematic route becomes sellable",
    expect: "no_problematic_route_is_sellable",
    apply: () => {
      const register = readJson(REGISTER);
      register.totals.problemPdfRoutesStillSellable = 1;
      fs.writeFileSync(abs(REGISTER), `${JSON.stringify(register, null, 2)}\n`);
    }
  },
  {
    name: "a problematic route becomes public",
    expect: "no_problematic_route_is_public",
    apply: () => {
      const master = readJson(MASTER);
      master.rows[0].publicPacketRoute = true;
      fs.writeFileSync(abs(MASTER), `${JSON.stringify(master, null, 2)}\n`);
    }
  },
  {
    name: "a missing binary is treated as packet-ready",
    expect: "missing_binary_is_never_packet_ready",
    apply: () => {
      const master = readJson(MASTER);
      const row = master.rows.find((r) => r.missingBinary);
      row.remediationLane = "A";
      row.sourceBinaryPresentInClone = true;
      row.anyFinalizedArtifact = true;
      fs.writeFileSync(abs(MASTER), `${JSON.stringify(master, null, 2)}\n`);
    }
  },
  {
    name: "lane A is claimed without a binary in the clone",
    expect: "lane_a_needs_a_binary_in_the_clone",
    apply: () => {
      const master = readJson(MASTER);
      const row = master.rows.find((r) => !r.sourceBinaryPresentInClone && !r.missingBinary)
        ?? master.rows.find((r) => !r.sourceBinaryPresentInClone);
      row.remediationLane = "A";
      row.missingBinary = false;
      fs.writeFileSync(abs(MASTER), `${JSON.stringify(master, null, 2)}\n`);
    }
  },
  {
    name: "an unresolved legal-design question is answered with a vague status",
    expect: "no_vague_status",
    apply: () => {
      const master = readJson(MASTER);
      master.rows[0].exactBlocker = "Needs work; review later once someone has looked at the form.";
      fs.writeFileSync(abs(MASTER), `${JSON.stringify(master, null, 2)}\n`);
    }
  },
  {
    name: "an asset is dropped from the master list",
    expect: "master_list_covers_the_register",
    apply: () => {
      const master = readJson(MASTER);
      master.rows.splice(0, 1);
      fs.writeFileSync(abs(MASTER), `${JSON.stringify(master, null, 2)}\n`);
    }
  },
  {
    name: "an evidence path stops resolving",
    expect: "evidence_paths_resolve",
    apply: () => {
      const master = readJson(MASTER);
      master.rows[0].evidencePaths = ["data/rcap-all50/overlays/production/nowhere/no-such-family"];
      fs.writeFileSync(abs(MASTER), `${JSON.stringify(master, null, 2)}\n`);
    }
  },
  {
    name: "a sheet showing no fill is signed off as visually reviewed",
    expect: "a_blank_sheet_is_not_review_evidence",
    apply: () => {
      const proof = readJson(SHEET_PROOF);
      const family = proof.families[0];
      family.panelsAreVisuallyIdentical = true;
      family.controlDiscriminates = true;
      fs.writeFileSync(abs(SHEET_PROOF), `${JSON.stringify(proof, null, 2)}\n`);
      const f3 = readJson(F3, { jobs: [] });
      const [state, slug] = family.familyId.split(":");
      f3.jobs = [...(f3.jobs ?? []), { state, family: slug, status: "closed" }];
      fs.writeFileSync(abs(F3), `${JSON.stringify(f3, null, 2)}\n`);
    }
  },
  {
    name: "a visual verdict is recorded although its control did not discriminate",
    expect: "visual_verdicts_have_a_control",
    apply: () => {
      const proof = readJson(SHEET_PROOF);
      proof.families[0].panelsAreVisuallyIdentical = true;
      proof.families[0].controlDiscriminates = false;
      fs.writeFileSync(abs(SHEET_PROOF), `${JSON.stringify(proof, null, 2)}\n`);
    }
  },
  {
    name: "an asset is released from its held status",
    expect: "every_asset_stays_held",
    apply: () => {
      const master = readJson(MASTER);
      master.rows[0].releaseStatus = "approved_for_live";
      fs.writeFileSync(abs(MASTER), `${JSON.stringify(master, null, 2)}\n`);
    }
  },
  {
    name: "every disposition is collapsed back to one undifferentiated hold",
    expect: "dispositions_are_not_collapsed",
    apply: () => {
      const master = readJson(MASTER);
      master.dispositions = { held: "Held." };
      for (const row of master.rows) row.disposition = "held";
      fs.writeFileSync(abs(MASTER), `${JSON.stringify(master, null, 2)}\n`);
    }
  },
  {
    name: "an orphaned asset is treated as an active launch blocker",
    expect: "orphaned_assets_are_not_active_blockers",
    apply: () => {
      const master = readJson(MASTER);
      const row = master.rows.find((r) => r.activeTrackStatus === "orphaned_or_optional");
      row.disposition = "active_track_delivery_hold";
      fs.writeFileSync(abs(MASTER), `${JSON.stringify(master, null, 2)}\n`);
    }
  },
  {
    name: "a systemic root-cause id is omitted from a finding",
    expect: "root_cause_ids_resolve",
    apply: () => {
      const register = readJson(REGISTER);
      const record = register.records.find((r) => r.defects.length > 0);
      delete record.defects[0].rootCauseId;
      record.rootCauseIds = record.rootCauseIds.filter((id) => id !== "RC-T-OBJECT-STREAMS");
      fs.writeFileSync(abs(REGISTER), `${JSON.stringify(register, null, 2)}\n`);
    }
  },
  {
    name: "one systemic cause is counted as many unique root causes",
    expect: "systemic_causes_are_counted_once",
    apply: () => {
      const register = readJson(REGISTER);
      // The classic inflation: report impacted assets as if each were its own
      // distinct problem.
      register.totals.uniqueSystemicTechnicalRootCauses = register.rootCauseIndex
        .filter((c) => c.scope === "systemic" && c.dimension === "technical")
        .reduce((n, c) => n + c.impactedAssets, 0);
      fs.writeFileSync(abs(REGISTER), `${JSON.stringify(register, null, 2)}\n`);
    }
  },
  {
    name: "a priority-4 source is queued for acquisition without a named current use",
    expect: "priority_4_is_a_refusal",
    apply: () => {
      const master = readJson(MASTER);
      const row = master.rows.find((r) => r.acquisitionPriority === 4);
      row.acquisitionRule = null;
      fs.writeFileSync(abs(MASTER), `${JSON.stringify(master, null, 2)}\n`);
    }
  },
  {
    name: "an orphaned evidence image is left behind",
    expect: "no_orphaned_evidence_images",
    apply: () => {
      // Every reference has to go, including the sheet proof's -- nulling only
      // two of the three sources left the images still referenced and the
      // mutation proved nothing.
      const placement = readJson(PLACEMENT);
      for (const family of placement.families) family.renderedEvidence = null;
      fs.writeFileSync(abs(PLACEMENT), `${JSON.stringify(placement, null, 2)}\n`);
      const proof = readJson(SHEET_PROOF);
      for (const family of proof.families) family.renderedEvidence = null;
      fs.writeFileSync(abs(SHEET_PROOF), `${JSON.stringify(proof, null, 2)}\n`);
      const master = readJson(MASTER);
      for (const row of master.rows) { row.placementEvidenceImages = []; row.contactSheetEvidenceImage = null; }
      fs.writeFileSync(abs(MASTER), `${JSON.stringify(master, null, 2)}\n`);
    }
  },
  {
    name: "a retired asset is put back into the operational scan",
    expect: "retirement_is_backed_by_the_determination",
    apply: () => {
      const audit = readJson(AUDIT);
      const family = audit.families.find((f) => f.retired);
      family.retired = false;
      fs.writeFileSync(abs(AUDIT), `${JSON.stringify(audit, null, 2)}\n`);
    }
  },
  {
    name: "a retained asset is marked retired",
    expect: "retirement_is_backed_by_the_determination",
    apply: () => {
      const audit = readJson(AUDIT);
      const family = audit.families.find((f) => !f.retired);
      family.retired = true;
      fs.writeFileSync(abs(AUDIT), `${JSON.stringify(audit, null, 2)}\n`);
    }
  },
  {
    name: "blue is reintroduced as the unexplained participant ink default",
    expect: "participant_ink_is_black",
    apply: () => {
      const text = fs.readFileSync(abs(FINALIZER), "utf8");
      fs.writeFileSync(abs(FINALIZER), text.replace("PARTICIPANT_INK = rgb(0, 0, 0)", "PARTICIPANT_INK = rgb(0, 0, 0.55)"));
    }
  },
  {
    name: "the finalizer stamps LegalEase branding back onto the court form",
    expect: "no_partner_branding_on_the_official_form",
    apply: () => {
      const text = fs.readFileSync(abs(FINALIZER), "utf8");
      fs.writeFileSync(abs(FINALIZER), text.replace(
        "  preserveSourceMetadata(pdfDoc, clean);",
        '  clean.setProducer("LegalEase RCAP official-form factory (pdf-lib)");'
      ));
    }
  },
  {
    name: "an email field is allowed to bind a street address again",
    expect: "email_never_binds_a_street_address",
    apply: () => {
      const text = fs.readFileSync(abs(SEMANTICS), "utf8");
      fs.writeFileSync(abs(SEMANTICS), text.replace(/, refuseWhen: \/\\be\[-\\s\]\?mail\\b\//, ""));
    }
  },
  {
    name: "a family is left with an incomplete field classification",
    expect: "every_field_is_classified",
    apply: () => {
      const coverage = readJson(CLASSIFICATION);
      coverage.families[0].entries = [];
      coverage.families[0].classifiedFieldsOrAnchors = 0;
      coverage.families[0].complete = false;
      coverage.totals.classifiedFieldsOrAnchors = 0;
      fs.writeFileSync(abs(CLASSIFICATION), `${JSON.stringify(coverage, null, 2)}\n`);
    }
  },
  {
    name: "the direct CI invocation is silently removed",
    expect: "ci_invokes_this_contract",
    apply: () => {
      const workflow = fs.readFileSync(abs(WORKFLOW), "utf8");
      fs.writeFileSync(abs(WORKFLOW), workflow.replaceAll(
        "run: node scripts/verify-rcap-problematic-pdf-remediation.mjs", "run: echo skipped"
      ));
    }
  }
];

let mutationFailures = 0;
for (const testCase of CASES) {
  const targets = [...MUTATION_TARGETS, ...(testCase.extraTargets ?? [])];
  const wentRed = await withTrackedMutation(`verify-rcap-problematic-pdf-remediation: ${testCase.name}`, targets, async () => {
    testCase.apply();
    const failures = await runAllChecks();
    return failures.has(testCase.expect);
  });
  if (wentRed) {
    console.log(`  OK mutation "${testCase.name}" turns ${testCase.expect} red`);
  } else {
    mutationFailures += 1;
    console.error(`  FAIL mutation "${testCase.name}" did NOT turn ${testCase.expect} red`);
  }
}

// The tree must be exactly as it was: the guard restores from its journal, and
// re-running the baseline is what proves the restoration actually happened.
const after = await runAllChecks();
if (!report(after, "problematic PDF remediation contract, after mutations")) {
  console.error("FAIL the tree did not come back clean after the mutation pass");
  process.exit(1);
}

if (mutationFailures > 0) {
  console.error(`FAIL ${mutationFailures} mutation(s) did not turn their check red`);
  process.exit(1);
}
console.log(`OK problematic PDF remediation mutations — ${CASES.length} cases, every one turns its own check red`);
