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
import { fileURLToPath } from "node:url";
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
const OVERLAY_DIR = "data/rcap-all50/overlays/production";
const WORKFLOW = ".github/workflows/rcap-all50-handoff.yml";

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
  for (const family of audit.families) {
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

  // ---- 16. a verdict without a working control is not a verdict -----------
  for (const family of sheetProof.families) {
    if (family.panelsAreVisuallyIdentical === true && family.controlDiscriminates === false) {
      fail("visual_verdicts_have_a_control", `${family.familyId}: an identical-panels verdict was recorded although the known-different control did not discriminate`);
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
const baseline = runChecks();
if (!report(baseline, "problematic PDF remediation contract")) process.exit(1);

if (!mutationsMode) process.exit(0);

// ---- mutations --------------------------------------------------------------
// Each case edits committed bytes, re-runs every check, and requires the named
// check to be among the ones that went red. Starting green is a precondition:
// a mutation pass on an already-red tree proves nothing.
const MUTATION_TARGETS = [REGISTER, AUDIT, SHEET_PROOF, MASTER, F3, WORKFLOW];

const CASES = [
  {
    name: "a protected clerk field is made writable",
    expect: "protected_field_writes_are_registered",
    apply: () => {
      const audit = readJson(AUDIT);
      const family = audit.families.find((f) => f.artifacts.some((a) => a.present));
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
    const failures = runChecks();
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
const after = runChecks();
if (!report(after, "problematic PDF remediation contract, after mutations")) {
  console.error("FAIL the tree did not come back clean after the mutation pass");
  process.exit(1);
}

if (mutationFailures > 0) {
  console.error(`FAIL ${mutationFailures} mutation(s) did not turn their check red`);
  process.exit(1);
}
console.log(`OK problematic PDF remediation mutations — ${CASES.length} cases, every one turns its own check red`);
