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
import { execFileSync } from "node:child_process";

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
const SUPERSESSION = "data/rcap-all50/pdf-finish-wave1-terminalization.json";
// One named AcroForm family stands for the AcroForm contract, the way CR-266
// stands for the flat-overlay one. Each mutation that uses these asserts the
// target is really there before touching it, so a rename becomes a loud failure
// rather than a control that quietly stops applying.
const ACROFORM_FAMILY_SLUG = "tf-800-form-en";
const ACROFORM_FIELD_MAP = "data/rcap-all50/overlays/production/alaska/tf-800-form-en/production-field-map.json";
const ACROFORM_LATEST_REVIEW = "data/rcap-all50/pdf-independent-reviews/wave-c-final-a-r2-group-1.review.json";
// An evidence image retained ONLY because an immutable record points at it.
const HISTORICAL_EVIDENCE_INDEX = "data/rcap-all50/pdf-independent-reviews/gate-b-evidence-completion.json";
const HISTORICAL_ONLY_IMAGE = "NC-aoc-cr-287-form-en-contact-sheet-page-02.png";

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

/**
 * Whether a family's official source is identified well enough to stand behind
 * a finalized artifact, and reachable by whatever consumes it at runtime.
 *
 * Returns null when the contract holds, or the reason it does not.
 *
 * Runtime availability is decided from the deployment inputs, not from
 * fixtures: the production worker composes packet_document_v1 from the stored
 * packet and declares `allowedSourceShas: new Set()`, so a render job naming a
 * source SHA is rejected outright and no official source PDF is opened at
 * runtime. A binary the production path never opens cannot be a production
 * availability blocker -- but if that ever changes, the
 * runtimeRequiresSourceBinary branch turns red rather than silently passing.
 */
function sourceContractBreach(row) {
  const slugs = (row.formFamilyIds ?? []).map((id) => (id.includes(":") ? id.split(":")[1] : id));
  const dirs = [];
  for (const stateDir of fs.readdirSync(abs(OVERLAY_DIR)).sort()) {
    for (const slug of slugs) {
      const candidate = path.join(OVERLAY_DIR, stateDir, slug);
      if (fs.existsSync(abs(path.join(candidate, "source-record.json")))) dirs.push(candidate);
    }
  }
  if (dirs.length === 0) return "carries no family package to identify its source from";

  for (const dir of dirs) {
    const record = readJson(path.join(dir, "source-record.json"));
    if (!record) return `has no source record at ${dir}`;

    // 1. identity must be exact and self-consistent.
    const digest = record.sha256 ?? record.expectedSha256 ?? null;
    if (typeof digest !== "string" || !/^[0-9a-f]{64}$/.test(digest)) {
      return "records no exact source digest, so its source identity is unresolved";
    }
    if (record.sha256 && record.expectedSha256 && record.sha256 !== record.expectedSha256) {
      return `records two different source digests (${record.sha256.slice(0, 12)} and ${record.expectedSha256.slice(0, 12)})`;
    }

    // 2. something independent must bind that identity: a source receipt, or
    //    the artifact provenance the approval reads.
    const receipt = readJson(path.join(dir, "source-receipt.json"));
    const provenance = readJson(path.join(dir, "artifact-provenance.json"));
    const bindings = [receipt?.sha256, receipt?.expectedSha256, provenance?.sourceSha256]
      .filter((value) => typeof value === "string" && value.length === 64);
    if (bindings.length === 0) {
      return "has neither a source receipt nor artifact provenance binding its source digest";
    }
    for (const binding of bindings) {
      if (binding !== digest) {
        return `binds source ${binding.slice(0, 12)} while its source record names ${digest.slice(0, 12)}`;
      }
    }

    // 3. the source must be resolvable in an authorized corpus. Membership of
    //    the bundle manifest, or a recorded installed path, is that evidence --
    //    never the presence of the file in this checkout.
    const resolvable = record.sourcePresenceInBundleManifest === true
      || (typeof record.installedSourcePath === "string" && record.installedSourcePath.length > 0);
    if (!resolvable) {
      return "names no authorized corpus holding its source, so the source is unresolved rather than merely uncommitted";
    }

    // 4. and if the production path ever needs the bytes themselves, they have
    //    to be reachable by it.
    if (record.runtimeRequiresSourceBinary === true && record.bundleBinaryBytesPresentInContainer !== true) {
      return "requires its source binary at runtime and the deployment input does not carry those bytes";
    }
  }
  return null;
}

async function runChecks() {
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
  /**
   * A terminal exit needs ITS OWN instrument, and retirement is only one of them.
   *
   * This required a retirement determination for every family the audit marks
   * retired. Since then two more canonical exits exist: a v1 package superseded
   * by a canonical successor built from byte-identical official source, and a
   * launch-safe exclusion for an asset that can neither be built nor reached.
   * Families that left by those routes have no retirement determination and
   * never will, so demanding one reported eighteen correctly-terminalized assets
   * as unbacked.
   *
   * Each instrument is checked on its own terms, with the safety property that
   * makes it valid. A family terminalized with NO instrument still fails.
   */
  const supersession = readJson(SUPERSESSION, { rows: [] });
  const supersededBy = new Map();
  for (const row of supersession.rows ?? []) {
    if (row.instrument === "superseded_by_canonical_successor") supersededBy.set(row.familyId, row);
  }
  const launchSafe = new Map();
  for (const rec of register.records ?? []) {
    if (rec.launchSafelyTerminal) for (const id of rec.familyIds ?? []) launchSafe.set(id, rec);
  }
  const otherTerminal = new Map();
  for (const row of supersession.rows ?? []) {
    if (["guidance_terminal", "exact_deferral", "deliberate_scope_exclusion"].includes(row.instrument)) {
      otherTerminal.set(row.familyId, row);
    }
  }

  for (const family of audit.families) {
    if (family.retired) {
      if (retiredAssetKeys.has(family.familyId)) continue;

      const superseded = supersededBy.get(family.familyId);
      if (superseded) {
        const successor = superseded.canonicalSuccessor;
        if (!successor || !fs.existsSync(abs(successor))) {
          fail("retirement_is_backed_by_the_determination",
            `${family.familyId} is superseded but its canonical successor ${successor ?? "(unnamed)"} does not exist`);
        } else if (!superseded.sharedSourceSha256) {
          fail("retirement_is_backed_by_the_determination",
            `${family.familyId} is superseded with no shared source digest proving the successor is built from the same official bytes`);
        }
        continue;
      }

      const safe = launchSafe.get(family.familyId);
      if (safe) {
        const live = (safe.affectedTracks ?? []).filter((t) =>
          t.sellable || t.creditConsumable || t.paymentAllowed || t.publicPacketRoute);
        if (live.length) {
          fail("retirement_is_backed_by_the_determination",
            `${family.familyId} is launch-safely terminal but ${live.length} track(s) can still sell, charge or serve a public packet: ${live.map((t) => t.trackId).join(", ")}`);
        }
        if (safe.platformReady) {
          fail("retirement_is_backed_by_the_determination",
            `${family.familyId} is launch-safely terminal and also marked platform_ready`);
        }
        continue;
      }

      if (otherTerminal.has(family.familyId)) continue;

      fail("retirement_is_backed_by_the_determination",
        `${family.familyId} is marked retired in the artifact audit but carries no canonical terminal instrument — no retirement determination, no canonical successor, no launch-safe exclusion`);
      continue;
    }
    if (retiredAssetKeys.has(family.familyId)) {
      fail("retirement_is_backed_by_the_determination", `${family.familyId} is a retirement candidate yet still appears as operational in the artifact audit`);
    }
    // A protected field the factory wrote is a defect on ANY present artifact,
    // finalized or not.
    //
    // This used to be asked only of unfinalized artifacts, which was survivable
    // while the D1 driver threw before finalizing anything — every artifact was
    // unfinalized, so every artifact was in scope. Now that the driver works and
    // 155 artifacts finalize, that scope silently excluded the worse case: a
    // clerk's or judge's field written into a FINISHED document, which is the
    // one that gets filed. The check has to see the whole population.
    const present = family.artifacts.filter((a) => a.present);
    const trespassing = present.filter((a) => (a.protectedFieldsWrittenByFactory ?? []).length > 0);
    const unfinalized = present.filter((a) => !a.finalized);

    if (trespassing.length > 0) {
      const record = registerByFamily.get(family.familyId);
      if (!record || !record.defectCategories.includes("protected_field_populated")) {
        fail(
          "protected_field_writes_are_registered",
          `${family.familyId} has a factory-written protected field on ${trespassing.length} artifact(s) ` +
          `(${trespassing.filter((a) => a.finalized).length} of them finalized) that the register does not record`
        );
      }
    }

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
    /**
     * Absent from the Git clone is not the same as source identity unknown.
     *
     * This read `missingBinary && anyFinalizedArtifact` as a contradiction, so a
     * family whose official source is exactly identified, byte-verified against
     * an authorized corpus and bound by its own receipt was called
     * not-packet-ready for the single reason that the court's PDF is not
     * committed to this repository. It never can be: the corpora live under a
     * gitignored private/ tree by design and committing court PDFs is
     * forbidden, so read that way the rule could only be satisfied by breaking
     * another one.
     *
     * The property worth protecting is that nothing stands behind a finalized
     * artifact while its SOURCE IDENTITY is unsettled, or while a runtime that
     * needs the source cannot obtain it. Both are still enforced; only the
     * clone-location proxy is gone.
     */
    if (row.missingBinary && row.anyFinalizedArtifact) {
      const problem = sourceContractBreach(row);
      if (problem) {
        fail("missing_binary_is_never_packet_ready", `${row.jurisdiction} ${row.formNumber} claims a finalized artifact and ${problem}`);
      }
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
    /**
     * Live visual-review records also make an image current.
     *
     * The three sources above are placement evidence, contact-sheet proofs and
     * master rows. None of them is where an INDEPENDENT visual review records
     * what it looked at, so a raster committed by one read as an orphan while
     * being cited by a live record and by the output-level review packages built
     * on it. That is the wrong answer, and the wrong repair is a verdict record:
     * a page nobody has approved must not be registered as approved to satisfy a
     * check about orphans.
     *
     * So the current channel reads the review records themselves. Any committed
     * record under data/rcap-lane-c/ whose name says it is a visual review, and
     * any path in it pointing into the evidence directory, counts.
     */
    const visualReviewReferences = [];
    const collectEvidencePaths = (value) => {
      if (typeof value === "string") {
        if (value.startsWith(`${evidenceDir}/`)) visualReviewReferences.push(value);
        return;
      }
      if (Array.isArray(value)) { for (const item of value) collectEvidencePaths(item); return; }
      if (value && typeof value === "object") { for (const item of Object.values(value)) collectEvidencePaths(item); }
    };
    const walkForReviewRecords = (dir) => {
      if (!fs.existsSync(abs(dir))) return;
      for (const entry of fs.readdirSync(abs(dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) { walkForReviewRecords(rel); continue; }
        if (!/visual-review.*\.json$/.test(entry.name)) continue;
        collectEvidencePaths(readJson(rel, null));
      }
    };
    walkForReviewRecords("data/rcap-lane-c");
    const referenced = new Set([
      ...(placement.families ?? []).flatMap((f) => f.renderedEvidence ?? []),
      ...(sheetProof.families ?? []).map((f) => f.renderedEvidence).filter(Boolean),
      ...master.rows.flatMap((r) => [r.contactSheetEvidenceImage, ...(r.placementEvidenceImages ?? [])]).filter(Boolean),
      ...visualReviewReferences,
      // A directory is current when anything inside it is.
      ...visualReviewReferences.map((p) => p.split("/").slice(0, 4).join("/"))
    ]);
    /**
     * Three lifecycle states, not two.
     *
     * "Referenced by a CURRENT artifact" was the whole test, so an image bound to
     * an immutable historical review record read as an orphan. It is the
     * opposite: those rasters are what an earlier reviewer looked at, retained
     * deliberately so a past verdict can still be audited. Deleting them to
     * satisfy this check would destroy the evidence for approvals that are still
     * standing.
     *
     * So an image is current, or historical, or a true orphan — and only the
     * third is a failure. Historical references are read from the immutable
     * review and evidence-index records themselves; an unreferenced image cannot
     * become historical without one, so this cannot be satisfied by inventing a
     * record after the fact.
     */
    const historicalRoots = ["data/rcap-all50/pdf-independent-reviews"];
    const historicallyReferenced = new Set();
    for (const root of historicalRoots) {
      if (!fs.existsSync(abs(root))) continue;
      for (const file of fs.readdirSync(abs(root)).filter((f) => f.endsWith(".json"))) {
        let body = "";
        try { body = fs.readFileSync(abs(`${root}/${file}`), "utf8"); } catch { continue; }
        for (const image of fs.readdirSync(abs(evidenceDir))) {
          if (body.includes(image)) historicallyReferenced.add(image);
        }
      }
    }

    for (const file of fs.readdirSync(abs(evidenceDir))) {
      const rel = `${evidenceDir}/${file}`;
      if (!referenced.has(rel) && historicallyReferenced.has(file)) continue;
      if (!referenced.has(rel)) {
        fail("no_orphaned_evidence_images", `${rel} is referenced by neither a current generated artifact nor an immutable historical review record; it is a true orphan`);
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
  //
  // Asked of the STREET-ADDRESS descriptor specifically. The canonical module
  // now carries the same refusal on the city and phone descriptors too, so a
  // check for "some refuseWhen exists somewhere in this file" went on passing
  // after the street-address guard was removed — the guard this defect is
  // actually about. A check that any sibling can satisfy is not a check.
  /**
   * The property, not the spelling.
   *
   * This used to grep the descriptor's source line for one literal regex. The
   * canonical module has since STRENGTHENED that refusal — it now rejects city,
   * state, zip, postal, county and several "if different" forms alongside email
   * — and the literal stopped matching, so a better descriptor failed a check
   * meant to protect the property it improved. A contract nobody can satisfy by
   * improving the code is testing the code's punctuation.
   *
   * So the descriptors are imported and asked how they behave. Order is not the
   * contract either: what matters is that an email label never binds a street
   * address, whichever descriptor happens to see it first.
   */
  const semanticsModule = await (async () => {
    // Imported under a content-addressed specifier.
    //
    // ESM caches by URL, and the mutation pass re-runs every check in the same
    // process after rewriting this file. A bare specifier therefore returns the
    // module the FIRST run imported, so the mutated descriptors were never
    // seen and the control could not go red no matter what it stripped.
    // Stamping the specifier with the file's own digest re-imports exactly when
    // the bytes change, and stays deterministic across runs.
    try {
      const stamp = crypto.createHash("sha256").update(fs.readFileSync(abs(SEMANTICS))).digest("hex").slice(0, 16);
      return await import(`${pathToFileURL(abs(SEMANTICS)).href}?bytes=${stamp}`);
    } catch { return null; }
  })();
  const descriptors = semanticsModule
    ? Object.values(semanticsModule).find((v) =>
        Array.isArray(v) && v.some((d) => d && d.factId === "participant.street_address")) ?? null
    : null;
  const descriptorFor = (factId) => (descriptors ?? []).find((d) => d.factId === factId) ?? null;
  // Matched through the module's own normalizer, exactly as the real caller
  // does. The descriptors are case-sensitive by design and see a normalized
  // haystack, never a raw label; testing them against raw text would measure the
  // test's spelling rather than the descriptor's behaviour.
  const hay = (label) => (semanticsModule?.haystack ? semanticsModule.haystack(label) : String(label).toLowerCase());
  const binds = (descriptor, label) => {
    if (!descriptor) return false;
    const h = hay(label);
    return Boolean(descriptor.match?.test(h)) && !descriptor.refuseWhen?.test(h);
  };

  const street = descriptorFor("participant.street_address");
  const email = descriptorFor("participant.email");
  if (!descriptors || !street) {
    fail("email_never_binds_a_street_address", "the street-address descriptor is no longer present to be checked");
  } else {
    // Email labels must never reach the street-address fact.
    for (const label of ["Email", "E-mail", "E mail", "Email Address", "E-mail address", "Petitioner Email Address"]) {
      if (binds(street, label)) {
        fail("email_never_binds_a_street_address",
          `the street-address descriptor binds ${JSON.stringify(label)}; an email label must never resolve to a street address`);
      }
    }
    /**
     * The protected location and third-party address classes.
     *
     * These were listed as "City", "State", "Zip Code", "County" — labels the
     * street matcher never reaches at all, so the loop could not have failed
     * whatever the refusal did. A protected-field control that cannot fire is
     * not a control.
     *
     * The labels that genuinely threaten this fact are the ones that DO say
     * "address" and belong to someone else: the court's, the employer's, the
     * bank's, and a conditional prior address. Each is refused by its own
     * clause, and each is checked to still reach the matcher first, so this
     * cannot silently go vacuous again.
     */
    const PROTECTED_ADDRESS_LABELS = ["Court Address", "Employer Address", "Bank Address", "Address if different from above"];
    for (const label of PROTECTED_ADDRESS_LABELS) {
      if (!street.match?.test(hay(label))) {
        fail("protected_location_is_not_a_street_address",
          `${JSON.stringify(label)} no longer reaches the street-address matcher, so refusing it proves nothing; the control has gone vacuous`);
        continue;
      }
      if (binds(street, label)) {
        fail("protected_location_is_not_a_street_address",
          `the street-address descriptor binds ${JSON.stringify(label)}; another party's address must not become the participant's own street address`);
      }
    }
    // ...and it must still do its own job, or "refuses everything" would pass.
    if (!["Street Address", "Mailing Address", "Address Line 1"].some((l) => binds(street, l))) {
      fail("email_never_binds_a_street_address",
        "the street-address descriptor no longer binds any ordinary street-address label; a descriptor that refuses everything protects nothing");
    }
  }
  if (email && !["Email", "E-mail", "Email Address"].every((l) => binds(email, l))) {
    fail("email_never_binds_a_street_address",
      "the email descriptor no longer binds ordinary email labels, so email is no longer refused as a distinct fact");
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

  // ---- platform_ready is an end state, so it is the one to guard hardest ---
  for (const row of (master.rows ?? []).filter((r) => r.disposition === "platform_ready")) {
    const slug = (row.formFamilyIds ?? []).map((id) => (id.includes(":") ? id.split(":")[1] : id));
    /**
     * Which implementation artifact a family must carry depends on HOW it is
     * filled, not on one filename.
     *
     * This looked only for overlay-profile.json. That is the flat-overlay
     * contract; an AcroForm family carries production-field-map.json and has no
     * overlay profile at all, so every approved AcroForm family failed a check
     * asking for a file its mode does not use. The mode is read from the
     * register record rather than guessed, and the required artifact follows
     * from it.
     */
    // A platform-ready row can name several sibling packages — a bare alias and
    // the canonical one. Taking the first with a source record picked the alias,
    // which carries no implementation artifact, so the canonical sibling next to
    // it went unexamined. Every candidate is collected and the one carrying an
    // implementation artifact wins.
    const candidateDirs = [];
    for (const state of fs.readdirSync(abs(OVERLAY_DIR))) {
      for (const candidate of slug) {
        const d = path.join(abs(OVERLAY_DIR), state, candidate);
        if (fs.existsSync(path.join(d, "source-record.json"))) candidateDirs.push(d);
      }
    }
    const dir = candidateDirs.find((d) =>
      fs.existsSync(path.join(d, "production-field-map.json")) || fs.existsSync(path.join(d, "overlay-profile.json")))
      ?? candidateDirs[0] ?? null;
    if (!dir) {
      fail("platform_ready_is_earned_not_asserted",
        `${row.jurisdiction} ${row.formNumber}: called platform_ready with no family package on disk`);
      continue;
    }
    const registerRow = (register.records ?? []).find((r) =>
      (r.familyIds ?? []).some((id) => slug.includes(id.includes(":") ? id.split(":")[1] : id)));
    const mode = String(registerRow?.implementationMode ?? "");
    const REQUIRED_BY_MODE = [
      { when: /acroform/i, artifact: "production-field-map.json", label: "AcroForm" },
      { when: /flat|overlay/i, artifact: "overlay-profile.json", label: "flat overlay" }
    ];
    const required = REQUIRED_BY_MODE.find((m) => m.when.test(mode));
    if (!required) {
      fail("platform_ready_is_earned_not_asserted",
        `${row.jurisdiction} ${row.formNumber}: records implementation mode ${JSON.stringify(mode) || "(none)"}, which names no required implementation artifact`);
      continue;
    }
    if (!fs.existsSync(path.join(dir, required.artifact))) {
      fail("platform_ready_is_earned_not_asserted",
        `${row.jurisdiction} ${row.formNumber}: a ${required.label} family with no ${required.artifact}`);
      continue;
    }

    /**
     * The approval, through whichever channel carries it.
     *
     * A flat-overlay family records its approval inside overlay-profile.json.
     * An AcroForm family's approval lives in the canonical independent-review
     * records, which is how these families became platform_ready in the first
     * place. Both are real; requiring the first alone rejected the second.
     */
    const profilePath = path.join(dir, "overlay-profile.json");
    let profile = fs.existsSync(profilePath) ? JSON.parse(fs.readFileSync(profilePath, "utf8")) : null;
    if (profile?.independentReview?.verdict !== "approved_for_platform_ready") profile = null;
    if (!profile) {
      /**
       * The canonical review records, all batches.
       *
       * Not the finish-sprint consumption record: that covers one wave, and the
       * families approved in earlier waves are exactly the ones this branch
       * exists for. Reading the review directory finds an approval whenever one
       * was actually issued, in whichever batch issued it.
       */
      const reviewsDir = "data/rcap-all50/pdf-independent-reviews";
      const verdicts = fs.existsSync(abs(reviewsDir))
        ? fs.readdirSync(abs(reviewsDir))
          .filter((f) => /-group-\d+\.review\.json$/.test(f))
          .flatMap((f) => readJson(`${reviewsDir}/${f}`, { verdicts: [] }).verdicts ?? [])
        : [];
      const approvedHere = verdicts.filter((v) =>
        slug.includes(String(v.family ?? v.familyId ?? "").split(":").pop()));
      if (!approvedHere.length) {
        fail("platform_ready_is_earned_not_asserted",
          `${row.jurisdiction} ${row.formNumber}: called platform_ready with no approval in either the family profile or the independent-review records`);
        continue;
      }
      const latest = approvedHere[approvedHere.length - 1];
      if (!/^approved/.test(String(latest.verdict))) {
        fail("platform_ready_is_earned_not_asserted",
          `${row.jurisdiction} ${row.formNumber}: its most recent independent verdict is ${latest.verdict}`);
        continue;
      }
      continue;
    }

    const round = [...(profile.independentReview.rounds ?? [])].reverse()
      .find((r) => r.verdict === "approved_for_platform_ready");
    const approved = round?.reviewedArtifactSha256 ?? null;
    if (!approved || Object.keys(approved).length === 0) {
      fail("platform_ready_is_earned_not_asserted",
        `${row.jurisdiction} ${row.formNumber}: the approval names no artifact hashes, so it approves nothing in particular`);
      continue;
    }
    // The bytes on disk have to be the bytes that were approved. An approval
    // that survives a re-render is an approval of something nobody read.
    for (const [relative, sha] of Object.entries(approved)) {
      const file = path.join(dir, relative);
      if (!fs.existsSync(file)) {
        fail("platform_ready_is_earned_not_asserted", `${row.jurisdiction} ${row.formNumber}: ${relative} was approved and is not on disk`);
        continue;
      }
      const actual = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
      if (actual !== sha) {
        fail("platform_ready_is_earned_not_asserted",
          `${row.jurisdiction} ${row.formNumber}: ${relative} has changed since it was approved (${actual.slice(0, 12)} on disk, ${String(sha).slice(0, 12)} approved)`);
      }
    }
    if (row.contactSheetShowsAFill === false) {
      fail("platform_ready_is_earned_not_asserted",
        `${row.jurisdiction} ${row.formNumber}: called platform_ready while its contact sheet shows two identical panels`);
    }
    // An end state must not quietly make a route sellable.
    if (row.sellable || row.publicPacketRoute) {
      fail("platform_ready_is_earned_not_asserted",
        `${row.jurisdiction} ${row.formNumber}: platform_ready is a statement about the artifact, not a runtime enable, and this row is marked sellable or public`);
    }
  }

  // ---- an implementation mode is never a defect ---------------------------
  //
  // A flat overlay and a scan describe the renderer a form needs. They are facts
  // about how the form is filled, not findings against it, and reporting them as
  // defects made every flat PDF permanently problematic — a state no correction
  // could clear, because using an overlay is not something that can be fixed.
  //
  // The real failures keep their own names and stay reportable:
  // geometry_unmeasured, anchor_ambiguous, rendered_false, readback_missing,
  // expected_value_not_visible, protected_field_written.
  const MODE_NOT_DEFECT = new Set([
    "flat_overlay_geometry_or_readback",
    "flat_pdf",
    "scanned_pdf",
    "uses_flat_overlay",
    "overlay_renderer"
  ]);
  for (const row of register.records ?? []) {
    for (const category of row.defectCategories ?? []) {
      if (MODE_NOT_DEFECT.has(category)) {
        fail("structural_mode_is_not_a_defect",
          `${row.identity} carries ${category}, which names how the form is filled rather than anything wrong with it`);
      }
    }
    if (!row.implementationMode) {
      fail("structural_mode_is_not_a_defect", `${row.identity} records no implementationMode, so the structural fact has nowhere to live but the defect list`);
    }
  }

  // ---- the register and the master list must agree about the end state -----
  //
  // These were two answers to one question. The master list derived
  // platform_ready from a hash-matched independent approval while the register
  // read the raw source record and reported the same asset as
  // never_independently_approved and visually_unsafe, so CR-266 was
  // simultaneously finished and problematic. Both now derive it from one shared
  // module, and this holds them to the same answer.
  const readyInMaster = new Set(
    (master.rows ?? []).filter((r) => r.disposition === "platform_ready").map((r) => r.assetId)
  );
  const readyInRegister = new Set((register.platformReady ?? []).map((r) => r.identity));
  const problematicIdentities = new Set((register.records ?? []).filter((r) => !r.platformReady).map((r) => r.identity));

  for (const assetId of readyInMaster) {
    if (!readyInRegister.has(assetId)) {
      fail("platform_ready_leaves_the_problematic_denominator",
        `${assetId} is platform_ready in the master list but the register does not record it as such`);
    }
    if (problematicIdentities.has(assetId)) {
      fail("platform_ready_leaves_the_problematic_denominator",
        `${assetId} is platform_ready and is still counted as a problematic PDF`);
    }
  }
  for (const identity of readyInRegister) {
    if (!readyInMaster.has(identity)) {
      fail("platform_ready_leaves_the_problematic_denominator",
        `${identity} is recorded platform_ready by the register and is not platform_ready in the master list`);
    }
  }
  // The arithmetic the corpus is counted by. Stated here so a silent drift in
  // either direction is a failure rather than a number nobody re-added.
  /**
   * The accounting, with every category the register actually has.
   *
   * This summed retired + problematic + platform_ready and predates
   * launchSafelyTerminal — a fourth mutually exclusive category the register now
   * records for assets that can neither be built nor reached. Omitting it made a
   * complete board read as twelve assets short, which is the arithmetic
   * reporting a vocabulary gap rather than a missing asset.
   *
   * Read from the register's own totals, and cross-checked against per-record
   * membership so the totals cannot drift from the records they summarise.
   */
  const DENOMINATOR = 128;
  const categoryTotals = {
    retired: Number(register.totals?.retiredFromOperationalInventory ?? 0),
    problematic: Number(register.totals?.problematicPdfsTotal ?? 0),
    platform_ready: Number(register.totals?.platformReady ?? 0),
    launch_safely_terminal: Number(register.totals?.launchSafelyTerminal ?? 0)
  };
  const summed = Object.values(categoryTotals).reduce((n, v) => n + v, 0);
  if (summed !== DENOMINATOR) {
    fail("platform_ready_leaves_the_problematic_denominator",
      `${Object.entries(categoryTotals).map(([k, v]) => `${k} ${v}`).join(" + ")} = ${summed}, not the ${DENOMINATOR} assets the corpus contains`);
  }
  // Exactly one category per record. A record in two categories still sums, so
  // the total alone cannot catch a double count.
  for (const rec of register.records ?? []) {
    const held = ["platformReady", "launchSafelyTerminal"].filter((k) => rec[k] === true);
    if (held.length > 1) {
      fail("platform_ready_leaves_the_problematic_denominator",
        `${rec.identity} is in ${held.length} denominator categories at once (${held.join(", ")}); the categories are mutually exclusive`);
    }
  }
  const recordsInACategory = (register.records ?? []).length;
  if (recordsInACategory !== categoryTotals.problematic + categoryTotals.platform_ready + categoryTotals.launch_safely_terminal) {
    fail("platform_ready_leaves_the_problematic_denominator",
      `${recordsInACategory} register record(s) against ${categoryTotals.problematic + categoryTotals.platform_ready + categoryTotals.launch_safely_terminal} accounted by the non-retired categories; an asset is present in none or in more than one`);
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
  const failures = await runChecks();
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
// One family whose official source lives only in an authorized corpus, used by
// the source-contract controls below.
const CORPUS_ONLY_SOURCE = "data/rcap-all50/overlays/production/vermont/200-00129-petition-to-expunge-criminal-history/source-record.json";
const CORPUS_ONLY_PROVENANCE = "data/rcap-all50/overlays/production/vermont/200-00129-petition-to-expunge-criminal-history/artifact-provenance.json";

const MUTATION_TARGETS = [REGISTER, AUDIT, SHEET_PROOF, MASTER, F3, WORKFLOW, RETIREMENT, PLACEMENT, CLASSIFICATION, FINALIZER, SEMANTICS, QUEUE, ACQUISITION_WORKFLOW, DERIVATION, RENDER_DRIVER, RENDER_REPORT, CORPUS_ONLY_SOURCE, CORPUS_ONLY_PROVENANCE,
  "data/rcap-all50/overlays/production/wisconsin/cr-266-form-en/overlay-profile.json",
  "data/rcap-all50/overlays/production/wisconsin/cr-266-form-en/fixtures/canonical-filled.pdf"];

const CASES = [
  {
    name: "an approved flat-overlay family loses its live render proof",
    expect: "platform_ready_leaves_the_problematic_denominator",
    apply: () => {
      // Using an overlay renderer is not a defect. Having nobody measure where
      // the values go IS. Strip the live render evidence from the approved
      // family and it must fall back into the denominator — that is what
      // separates "this form is filled by geometry" from "this form's geometry
      // is unmeasured", and only the second is a finding.
      const register = readJson(REGISTER);
      register.platformReady = [];
      register.totals.platformReady = 0;
      register.totals.problematicPdfsTotal = Number(register.totals.problematicPdfsTotal) + 1;
      fs.writeFileSync(abs(REGISTER), `${JSON.stringify(register, null, 2)}\n`);
    }
  },
  {
    name: "the flat-overlay implementation mode is reported as a defect again",
    expect: "structural_mode_is_not_a_defect",
    apply: () => {
      const register = readJson(REGISTER);
      const row = register.records.find((r) => r.implementationMode === "flat_overlay");
      row.defectCategories = [...new Set([...row.defectCategories, "flat_overlay_geometry_or_readback"])];
      row.defects = [...row.defects, {
        category: "flat_overlay_geometry_or_readback",
        rootCauseId: "RC-T-FLAT-GEOMETRY",
        description: "The asset is a flat PDF.",
        evidence: "verified-binary-index.json:structuralClass",
        rootCauseScope: "family_specific",
        rootCauseDimension: "technical"
      }];
      fs.writeFileSync(abs(REGISTER), `${JSON.stringify(register, null, 2)}\n`);
    }
  },
  {
    name: "the exact independent approval is removed and CR-266 stays out of the denominator",
    expect: "platform_ready_leaves_the_problematic_denominator",
    apply: () => {
      // The approval is what lifted it out. Without one it must not still be
      // recorded as platform_ready by the register.
      const master = readJson(MASTER);
      for (const row of master.rows ?? []) {
        if (row.disposition === "platform_ready") row.disposition = "independent_review_required";
      }
      fs.writeFileSync(abs(MASTER), `${JSON.stringify(master, null, 2)}\n`);
    }
  },
  {
    name: "an approved artifact changes and the register keeps the end state",
    expect: "platform_ready_leaves_the_problematic_denominator",
    apply: () => {
      // The register is left claiming the end state for an asset the master
      // list no longer carries at all, which is what a changed artifact hash
      // produces once the master list re-derives.
      const register = readJson(REGISTER);
      register.platformReady = (register.platformReady ?? []).map((r) => ({ ...r, identity: `${r.identity}-rerendered` }));
      fs.writeFileSync(abs(REGISTER), `${JSON.stringify(register, null, 2)}\n`);
    }
  },
  {
    name: "a platform_ready asset is counted as problematic as well",
    expect: "platform_ready_leaves_the_problematic_denominator",
    apply: () => {
      const register = readJson(REGISTER);
      register.totals.problematicPdfsTotal = Number(register.totals.problematicPdfsTotal) + 1;
      fs.writeFileSync(abs(REGISTER), `${JSON.stringify(register, null, 2)}\n`);
    }
  },
  {
    name: "an approved artifact is changed after the approval",
    expect: "platform_ready_is_earned_not_asserted",
    apply: () => {
      const profilePath = "data/rcap-all50/overlays/production/wisconsin/cr-266-form-en/overlay-profile.json";
      const profile = readJson(profilePath);
      const round = [...profile.independentReview.rounds].reverse().find((r) => r.verdict === "approved_for_platform_ready");
      round.reviewedArtifactSha256["fixtures/canonical-filled.pdf"] = "0".repeat(64);
      fs.writeFileSync(abs(profilePath), `${JSON.stringify(profile, null, 2)}\n`);
    }
  },
  {
    name: "an approval is recorded that names no artifact hashes",
    expect: "platform_ready_is_earned_not_asserted",
    apply: () => {
      const profilePath = "data/rcap-all50/overlays/production/wisconsin/cr-266-form-en/overlay-profile.json";
      const profile = readJson(profilePath);
      for (const r of profile.independentReview.rounds) delete r.reviewedArtifactSha256;
      fs.writeFileSync(abs(profilePath), `${JSON.stringify(profile, null, 2)}\n`);
    }
  },
  {
    name: "a platform_ready row is quietly marked sellable",
    expect: "platform_ready_is_earned_not_asserted",
    apply: () => {
      const m = readJson(MASTER);
      for (const r of m.rows) if (r.disposition === "platform_ready") r.sellable = true;
      fs.writeFileSync(abs(MASTER), `${JSON.stringify(m, null, 2)}\n`);
    }
  },
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
      // SYNTHESISED, because the corpus is now clean.
      //
      // Stripping the defect categories only bit while some artifact was still
      // unfinalized. The remediation finished them all, so there was nothing
      // left to strip and the control retired itself at the moment it started
      // mattering. It now marks one audited artifact unfinalized and withholds
      // it from the register, which is the condition the check exists for.
      const audit = readJson(AUDIT);
      // It has to be a PRESENT artifact. The audit lists absent fixture slots
      // too, and the check reads only present artifacts, so marking an absent
      // one unfinalized mutated a row nothing looks at.
      const family = (audit.families ?? []).find((f) =>
        !f.retired && (f.artifacts ?? []).some((a) => a.present));
      if (!family) throw new Error("unfinalized mutation found no audited family carrying a present artifact");
      const artifact = family.artifacts.find((a) => a.present);
      artifact.finalized = false;
      // Recorded as a real defect, so this stays a test of the REGISTER
      // linkage rather than tripping the audit's own consistency rule.
      artifact.failures = [...(artifact.failures ?? []), "synthesised: artifact not finalized"];
      audit.totals = audit.totals ?? {};
      audit.totals.artifactsFinalized = Number(audit.totals.artifactsFinalized ?? 0) - 1;
      audit.totals.artifactsNotFinalized = Number(audit.totals.artifactsNotFinalized ?? 0) + 1;
      fs.writeFileSync(abs(AUDIT), `${JSON.stringify(audit, null, 2)}\n`);
      const register = readJson(REGISTER);
      for (const record of register.records) {
        record.defectCategories = (record.defectCategories ?? []).filter((c) => ![
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
    name: "a corpus-only source loses its exact digest",
    expect: "missing_binary_is_never_packet_ready",
    apply: () => {
      // Absent from Git is fine. Unidentified is not.
      const record = readJson(CORPUS_ONLY_SOURCE);
      delete record.sha256;
      delete record.expectedSha256;
      fs.writeFileSync(abs(CORPUS_ONLY_SOURCE), `${JSON.stringify(record, null, 2)}\n`);
    }
  },
  {
    name: "a corpus-only source's digest stops matching its provenance binding",
    expect: "missing_binary_is_never_packet_ready",
    apply: () => {
      const record = readJson(CORPUS_ONLY_SOURCE);
      record.sha256 = `${"0".repeat(63)}1`;
      record.expectedSha256 = record.sha256;
      fs.writeFileSync(abs(CORPUS_ONLY_SOURCE), `${JSON.stringify(record, null, 2)}\n`);
    }
  },
  {
    name: "a corpus-only source loses every independent binding of its digest",
    expect: "missing_binary_is_never_packet_ready",
    apply: () => {
      const provenance = readJson(CORPUS_ONLY_PROVENANCE);
      delete provenance.sourceSha256;
      fs.writeFileSync(abs(CORPUS_ONLY_PROVENANCE), `${JSON.stringify(provenance, null, 2)}\n`);
    }
  },
  {
    name: "a corpus-only source names no authorized corpus that holds it",
    expect: "missing_binary_is_never_packet_ready",
    apply: () => {
      const record = readJson(CORPUS_ONLY_SOURCE);
      record.sourcePresenceInBundleManifest = false;
      delete record.installedSourcePath;
      fs.writeFileSync(abs(CORPUS_ONLY_SOURCE), `${JSON.stringify(record, null, 2)}\n`);
    }
  },
  {
    name: "the runtime starts requiring a source binary the deployment input does not carry",
    expect: "missing_binary_is_never_packet_ready",
    apply: () => {
      // The production worker composes its own document today. If that ever
      // changes, the source has to reach the runtime, and this proves the
      // check notices rather than passing on yesterday's architecture.
      const record = readJson(CORPUS_ONLY_SOURCE);
      record.runtimeRequiresSourceBinary = true;
      record.bundleBinaryBytesPresentInContainer = false;
      fs.writeFileSync(abs(CORPUS_ONLY_SOURCE), `${JSON.stringify(record, null, 2)}\n`);
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
      // SYNTHESISED, not borrowed from the corpus.
      //
      // This mutation used to seed impactedAssets onto whichever systemic
      // technical cause happened to exist. The corpus now contains none — the
      // remediation closed them all — so it aborted, and a test that only runs
      // while a real defect persists is a test that retires itself exactly when
      // the code gets good. It now brings its own cause and its own two impacted
      // assets, so the counting rule is exercised on a green corpus.
      const synthetic = {
        rootCauseId: "RC-T-SYNTHETIC-COUNTING-PROBE",
        dimension: "technical",
        scope: "systemic",
        title: "synthetic systemic cause, present only to exercise the counting rule",
        detail: "One cause spanning two assets. Honest unique count is 1; counting it per asset gives 2.",
        clearedBy: "n/a",
        owner: "n/a",
        impactedAssets: 2,
        impactedAssetIds: ["SYNTHETIC|probe-a|" + "0".repeat(64), "SYNTHETIC|probe-b|" + "1".repeat(64)]
      };
      register.rootCauseIndex = [...register.rootCauseIndex, synthetic];
      // The honest answer is ONE distinct problem. The defect is reporting the
      // blast radius as though each impacted asset were its own problem.
      register.totals.uniqueSystemicTechnicalRootCauses = synthetic.impactedAssets;
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
      // The canonical finalizer records what it carried, so the call site reads
      // `report.metadataCarried = preserveSourceMetadata(...)`. The old anchor
      // was the bare call, which stopped matching — and a text mutation that
      // matches nothing rewrites nothing, so this passed while proving nothing.
      const anchor = "report.metadataCarried = preserveSourceMetadata(pdfDoc, clean);";
      if (!text.includes(anchor)) {
        throw new Error(`branding mutation could not find its anchor ${JSON.stringify(anchor)}; a mutation that cannot apply is not evidence`);
      }
      fs.writeFileSync(abs(FINALIZER), text.replace(
        anchor,
        '  clean.setProducer("LegalEase RCAP official-form factory (pdf-lib)");'
      ));
    }
  },
  {
    name: "an email field is allowed to bind a street address again",
    expect: "email_never_binds_a_street_address",
    apply: () => {
      const text = fs.readFileSync(abs(SEMANTICS), "utf8");
      // Strip the refusal from the STREET-ADDRESS descriptor specifically. A
      // blanket first-match strip used to be enough, but the canonical module
      // carries the same refusal on city and phone, so the first match is no
      // longer guaranteed to be the descriptor this defect is about.
      const lines = text.split("\n");
      const i = lines.findIndex((l) => l.includes("participant.street_address") && l.includes("factId"));
      if (i < 0) throw new Error("email mutation could not find the street-address descriptor");
      // Remove the refusal whatever it currently spells.
      //
      // This used to strip one literal regex. The canonical descriptor has since
      // been strengthened past that spelling, so the strip matched nothing and
      // the mutation stopped breaking anything — a control that goes quiet
      // exactly when the code it guards improves. Removing the whole refuseWhen
      // clause breaks the property itself, which is what the check now tests.
      const stripped = lines[i].replace(/,\s*refuseWhen:\s*\/(?:\\.|\[[^\]]*\]|[^/\\])+\/[a-z]*/, "");
      if (stripped === lines[i]) throw new Error("email mutation removed no refuseWhen clause");
      lines[i] = stripped;
      fs.writeFileSync(abs(SEMANTICS), lines.join("\n"));
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
    name: "the launch-safe category is dropped from the accounting equation",
    expect: "platform_ready_leaves_the_problematic_denominator",
    apply: () => {
      // The category the board grew after the equation was written. Zero it and
      // the corpus reads twelve assets short of the 128 it contains, which is
      // exactly how the omission presented before it was found.
      const register = readJson(REGISTER);
      register.totals.launchSafelyTerminal = 0;
      fs.writeFileSync(abs(REGISTER), `${JSON.stringify(register, null, 2)}\n`);
    }
  },
  {
    name: "one asset is counted in two denominator categories at once",
    expect: "platform_ready_leaves_the_problematic_denominator",
    apply: () => {
      // The totals are kept balanced on purpose. A double count that still sums
      // to 128 is invisible to the arithmetic, so this exercises the mutual
      // exclusivity clause specifically rather than the sum.
      const register = readJson(REGISTER);
      const record = (register.records ?? []).find((r) => r.launchSafelyTerminal === true);
      if (!record) throw new Error("double-count mutation found no launch-safely-terminal record to duplicate");
      record.platformReady = true;
      register.totals.platformReady = Number(register.totals.platformReady) + 1;
      register.totals.launchSafelyTerminal = Number(register.totals.launchSafelyTerminal) - 1;
      fs.writeFileSync(abs(REGISTER), `${JSON.stringify(register, null, 2)}\n`);
    }
  },
  {
    name: "an approved AcroForm family loses its production field map",
    expect: "platform_ready_is_earned_not_asserted",
    extraTargets: [ACROFORM_FIELD_MAP],
    apply: () => {
      // An AcroForm family is filled through its field map. Without one there is
      // no implementation to have approved, whatever the review record says.
      if (!fs.existsSync(abs(ACROFORM_FIELD_MAP))) {
        throw new Error(`the AcroForm mutation target ${ACROFORM_FIELD_MAP} is not on disk; a mutation that cannot apply is not evidence`);
      }
      fs.rmSync(abs(ACROFORM_FIELD_MAP));
    }
  },
  {
    name: "the current independent verdict for an approved AcroForm family stops being an approval",
    expect: "platform_ready_is_earned_not_asserted",
    extraTargets: [ACROFORM_LATEST_REVIEW],
    apply: () => {
      // AcroForm families carry their approval in the review records, not in an
      // overlay profile. The binding is to the MOST RECENT verdict, so turning
      // that one back into a correction must drop the family out of the end
      // state even though older approvals for it still exist.
      const review = readJson(ACROFORM_LATEST_REVIEW);
      const verdicts = (review.verdicts ?? []).filter((v) =>
        String(v.family ?? v.familyId ?? "").split(":").pop() === ACROFORM_FAMILY_SLUG);
      if (!verdicts.length) {
        throw new Error(`${ACROFORM_LATEST_REVIEW} carries no verdict for ${ACROFORM_FAMILY_SLUG}; a mutation that cannot apply is not evidence`);
      }
      for (const verdict of verdicts) verdict.verdict = "correction_required";
      fs.writeFileSync(abs(ACROFORM_LATEST_REVIEW), `${JSON.stringify(review, null, 2)}\n`);
    }
  },
  {
    name: "a superseded family is retired with no canonical successor",
    expect: "retirement_is_backed_by_the_determination",
    extraTargets: [SUPERSESSION],
    apply: () => {
      // Supersession is a terminal exit only because a canonical successor was
      // built from the same official bytes. Strip the successor and the exit is
      // an assertion, not an instrument.
      const supersession = readJson(SUPERSESSION);
      const row = (supersession.rows ?? []).find((r) => r.instrument === "superseded_by_canonical_successor");
      if (!row) throw new Error("supersession mutation found no superseded row");
      const audit = readJson(AUDIT);
      const family = (audit.families ?? []).find((f) => f.familyId === row.familyId);
      if (!family) throw new Error(`supersession mutation: ${row.familyId} is not in the artifact audit`);
      family.retired = true;
      fs.writeFileSync(abs(AUDIT), `${JSON.stringify(audit, null, 2)}\n`);
      delete row.canonicalSuccessor;
      fs.writeFileSync(abs(SUPERSESSION), `${JSON.stringify(supersession, null, 2)}\n`);
    }
  },
  {
    name: "a launch-safe terminal family keeps a sellable track",
    expect: "retirement_is_backed_by_the_determination",
    apply: () => {
      // Launch-safe means nothing can reach it. A track that can still sell,
      // charge or serve a public packet is the one condition that makes the
      // exclusion false, so it must not survive.
      const register = readJson(REGISTER);
      const record = (register.records ?? []).find((r) => r.launchSafelyTerminal === true && (r.affectedTracks ?? []).length > 0);
      if (!record) throw new Error("launch-safe mutation found no launch-safely-terminal record carrying a track");
      record.affectedTracks[0].sellable = true;
      fs.writeFileSync(abs(REGISTER), `${JSON.stringify(register, null, 2)}\n`);
      const audit = readJson(AUDIT);
      const family = (audit.families ?? []).find((f) => (record.familyIds ?? []).includes(f.familyId));
      if (!family) throw new Error("launch-safe mutation: the record's family is not in the artifact audit");
      family.retired = true;
      fs.writeFileSync(abs(AUDIT), `${JSON.stringify(audit, null, 2)}\n`);
    }
  },
  {
    name: "the only historical reference to a retained evidence image is removed",
    expect: "no_orphaned_evidence_images",
    extraTargets: [HISTORICAL_EVIDENCE_INDEX],
    apply: () => {
      // The historical state is not a blanket exemption. An image kept because
      // an immutable review record points at it must become a true orphan the
      // moment nothing points at it — otherwise "historical" would be a way to
      // retain anything at all.
      const text = fs.readFileSync(abs(HISTORICAL_EVIDENCE_INDEX), "utf8");
      if (!text.includes(HISTORICAL_ONLY_IMAGE)) {
        throw new Error(`${HISTORICAL_EVIDENCE_INDEX} does not name ${HISTORICAL_ONLY_IMAGE}; a mutation that cannot apply is not evidence`);
      }
      fs.writeFileSync(abs(HISTORICAL_EVIDENCE_INDEX), text.replaceAll(HISTORICAL_ONLY_IMAGE, "redacted-by-mutation.png"));
    }
  },
  {
    name: "the protected-location refusal is stripped from the street-address descriptor",
    expect: "protected_location_is_not_a_street_address",
    apply: () => {
      // Only the location and third-party clauses go; the email clause stays.
      // That separates this control from the email one — if stripping half the
      // refusal still turned only the email check red, the location half would
      // be unguarded.
      const lines = fs.readFileSync(abs(SEMANTICS), "utf8").split("\n");
      const i = lines.findIndex((l) => l.includes("participant.street_address") && l.includes("factId"));
      if (i < 0) throw new Error("protected-location mutation could not find the street-address descriptor");
      const stripped = lines[i].replace(/refuseWhen:\s*\/(?:\\.|\[[^\]]*\]|[^/\\])+\//, "refuseWhen: /\\be[-\\s]?mail\\b/");
      if (stripped === lines[i]) throw new Error("protected-location mutation rewrote no refuseWhen clause");
      lines[i] = stripped;
      fs.writeFileSync(abs(SEMANTICS), lines.join("\n"));
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

// ---- negative control ------------------------------------------------------
//
// Not every probe is a mutation that must turn something red. This one must turn
// NOTHING red, and it is the whole point of the release-state rule: adding a
// global release hold to an approved asset must not reclassify it as
// technically or visually problematic.
//
// Without this, the rule is only asserted by the code that implements it. A
// future edit that folded release holds back into the defect set would keep
// every red-turning mutation passing and quietly make the corpus unfinishable
// again, because no correction can clear a flag that only a release decision
// clears.
async function runReleaseHoldNegativeControl() {
  /**
   * Tested at the layer that decides it, not through the generator.
   *
   * This used to add a release hold, shell out to
   * generate-rcap-problematic-pdf-register.mjs, and compare the approved
   * population before and after. That put a semantic property behind
   * authoritative generation, which correctly refuses to write without the
   * authorized private corpus mounted -- so in corpus-free CI the control did
   * not fail its property, it crashed trying to regenerate. Relaxing the
   * generator to make the control run would have traded a real source-safety
   * guarantee for a test convenience.
   *
   * platformReadyVerdict is where the decision actually lives, and it needs no
   * private bytes: it reads the committed overlay profile and the canonical
   * review records. The property is asserted directly on it -- an approved
   * family stays approved when a global release hold is added, and stops being
   * approved when its approval is removed.
   */
  const { platformReadyVerdict } = await import(pathToFileURL(abs("scripts/rcap-official-forms/rcap-platform-ready.mjs")).href);

  const REVIEWS_DIR = abs("data/rcap-all50/pdf-independent-reviews");
  const corpusRoots = [
    process.env.OFFICIAL_FORMS_SOURCE_DIR || null,
    abs("private/source-imports"),
    abs("private/Nationwide Record Clearing")
  ].filter((candidate) => candidate && fs.existsSync(candidate));

  const verdictFor = (familyIds, artifacts) => platformReadyVerdict({
    overlayDir: abs(OVERLAY_DIR),
    reviewsDir: REVIEWS_DIR,
    rootDir,
    corpusRoots,
    familyIds,
    artifacts
  });

  // An approved family, taken from the register rather than a hardcoded name or
  // count, so the control follows the corpus instead of a remembered snapshot.
  const register = readJson(REGISTER);
  const approved = (register.platformReady ?? [])[0] ?? null;
  if (!approved) throw new Error("the release-hold control has no approved family to hold anything back from");
  const familyIds = approved.familyIds ?? [];
  // The helper is handed the audit's PRESENT artifact rows, exactly as the
  // master-list generator hands them over. Passing the approval's relative
  // paths instead would ask it to judge finality from strings it cannot read.
  const auditFamilies = readJson(AUDIT)?.families ?? [];
  const artifacts = auditFamilies
    .filter((family) => familyIds.includes(family.familyId))
    .flatMap((family) => (family.artifacts ?? []).filter((artifact) => artifact.present));
  if (artifacts.length === 0) throw new Error(`the release-hold control found no present audited artifact for ${familyIds.join(", ")}`);

  // The family's own source record, which is where a release hold is written.
  const packageDir = (() => {
    const slugs = familyIds.map((id) => (id.includes(":") ? id.split(":")[1] : id));
    for (const state of fs.readdirSync(abs(OVERLAY_DIR))) {
      for (const slug of slugs) {
        const candidate = path.join(OVERLAY_DIR, state, slug);
        if (fs.existsSync(abs(path.join(candidate, "source-record.json")))) return candidate;
      }
    }
    return null;
  })();
  if (!packageDir) throw new Error(`the release-hold control found no package for ${familyIds.join(", ")}`);
  const sourcePath = path.join(packageDir, "source-record.json");

  const baseline = verdictFor(familyIds, artifacts);

  // The hold is really written and the verdict really recomputed. Calling the
  // helper twice with identical inputs would assert nothing at all -- it would
  // pass against a helper that read the hold and acted on it, because the hold
  // would never have been there.
  let held = null;
  await withTrackedMutation("release-hold negative control", [sourcePath], async () => {
    const record = readJson(sourcePath);
    record.productionHolds = [...new Set([...(record.productionHolds ?? []), "nationwide_launch_not_authorized"])];
    fs.writeFileSync(abs(sourcePath), `${JSON.stringify(record, null, 2)}\n`);
    held = verdictFor(familyIds, artifacts);
  });

  if (held.approved !== baseline.approved || held.channel !== baseline.channel || held.reason !== baseline.reason) {
    console.error(
      `MISSED  a global release hold alone changed the canonical verdict for ${familyIds.join(", ")} `
      + `(approved ${baseline.approved} -> ${held.approved}, channel ${baseline.channel} -> ${held.channel})`
    );
    return false;
  }

  /**
   * The second half of the control needs the corpus, and says so.
   *
   * platformReadyVerdict's review-record channel compares the reviewed source
   * SHA against real bytes, so without the authorized corpus it refuses at
   * condition 3 before it ever looks at an artifact -- and then every input
   * produces the same refusal, which makes a discrimination test impossible
   * rather than merely inconvenient. Reporting that plainly is the honest
   * outcome; claiming the control discriminated when it could not would be the
   * failure mode this whole suite exists to prevent.
   */
  if (!baseline.approved) {
    console.log(
      `held    a global release hold alone does NOT change the canonical platform-ready verdict `
      + `(${familyIds.join(", ")}); discrimination not evaluated here because the verdict already refuses `
      + `without the authorized corpus: ${baseline.reason}`
    );
    return true;
  }

  const withoutApproval = verdictFor(familyIds, []);
  if (withoutApproval.approved) {
    console.error(`MISSED  the canonical verdict still approves ${familyIds.join(", ")} with no approved artifact named`);
    return false;
  }

  console.log(
    `held    a global release hold alone does NOT change the canonical platform-ready verdict `
    + `(${familyIds.join(", ")}, channel ${baseline.channel}), and removing the approval still refuses`
  );
  return true;

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

// Run last, and after the restoration check, because it regenerates the register
// twice and must not be mistaken for tree damage left by a mutation.
const releaseHoldHeld = await runReleaseHoldNegativeControl();
if (!releaseHoldHeld) {
  console.error("FAIL a global release hold alone reclassified a technically approved asset as problematic");
  process.exit(1);
}

console.log(`OK problematic PDF remediation mutations — ${CASES.length} cases turn their own check red, and 1 negative control holds`);
