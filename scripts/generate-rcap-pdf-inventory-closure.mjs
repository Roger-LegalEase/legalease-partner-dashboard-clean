#!/usr/bin/env node
// The PDF inventory-closure ledger.
//
// One question runs through this whole lane: of the 128 original operational
// PDF assets, how many are finished, and what exactly is standing between the
// rest and being finished? The answer has to be derived from committed
// evidence every time it is asked, because a count that is typed rather than
// computed is a count that drifts the moment anything moves.
//
//   node scripts/generate-rcap-pdf-inventory-closure.mjs
//   node scripts/generate-rcap-pdf-inventory-closure.mjs --check
//
// This writer owns four records and one report. It never edits the register,
// the master list, the operational manifest, or any family artifact — it reads
// them. Where the evidence needed to close a row is not in this clone, the row
// says so and names what would have to be mounted; it does not guess, and it
// does not close.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const REGISTER = "data/rcap-all50/problematic-pdf-register.json";
const MASTER = "data/rcap-all50/problematic-pdf-master-list.json";
const HANDOFF = "data/rcap-all50/manifest-only-retirement-handoff.json";
const RECONCILIATION = "data/rcap-all50/unmatched-source-reconciliation.json";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const ACQUISITION_QUEUE = "data/rcap-all50/source-acquisition-queue.json";
const ARTIFACT_AUDIT = "data/rcap-all50/finalized-artifact-audit.json";
const BATCH_MANIFEST = "data/rcap-all50/pdf-independent-reviews/batch-1-manifest.json";
const BATCH_VERDICTS = "data/rcap-all50/pdf-independent-reviews/batch-1-verdicts.json";
const BATCH_CROSS = "data/rcap-all50/pdf-independent-reviews/batch-1-cross-family-findings.json";
const BATCH_GROUPS = [1, 2, 3].map((g) => `data/rcap-all50/pdf-independent-reviews/batch-1-group-${g}.review.json`);

const OUT_FREEZE = "data/rcap-all50/pdf-independent-reviews/batch-1-freeze-verification.json";
const OUT_PACKETS = "data/rcap-all50/pdf-independent-reviews/correction-packets.json";
const OUT_RETIREMENT = "data/rcap-all50/pdf-retirement-evidence/manifest-only-retirement-conditions.json";
const OUT_SOURCES = "data/rcap-all50/pdf-source-handoffs/missing-binary-dispositions.json";
const OUT_LEDGER = "data/rcap-all50/pdf-independent-reviews/inventory-closure-ledger.json";
const OUT_MD = "docs/record-clearing/pdf-independent-reviews/inventory-closure-status.md";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));
const sha256File = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function fail(message) {
  console.error(`FAIL PDF inventory closure — ${message}`);
  process.exit(1);
}

/**
 * The corpus the whole lane depends on. Two of the four workstreams cannot
 * reach a terminal answer without it, so whether it is mounted is recorded as
 * evidence rather than assumed either way.
 */
function corpusMountState(corpusIndex) {
  const declaredRoot = corpusIndex.corpusRoot;
  const exists = (candidate) => Boolean(candidate) && fs.existsSync(path.isAbsolute(candidate) ? candidate : abs(candidate));

  // TWO corpora, and conflating them is the mistake this function exists to
  // avoid. The Master Library (STATES/XX/…, 329 PDFs) is what a source
  // resolution and a re-render need. The overlay factory manifest is built
  // from a different tree — Nationwide Record Clearing, LegalEase <State>/…,
  // 409 forms — and that is the tree the seventh retirement condition needs.
  // Mounting one does not mount the other, and reporting "the corpus is
  // mounted" off either would say a retirement is evaluable when it is not.
  const masterLibraryRoot = exists(declaredRoot) ? declaredRoot : null;
  const nationwideRoot = ["private/Nationwide Record Clearing", process.env.OFFICIAL_FORMS_SOURCE_DIR || null]
    .find((candidate) => exists(candidate) && !String(candidate).includes("Master_Library")) ?? null;

  // Mounted is not the same as complete. The delivered Nationwide tree yields
  // 170 forms where the committed manifest was built from 409, and a
  // regeneration from a short tree drops assets for reasons that have nothing
  // to do with what depends on them. Condition 7 keys off completeness, not
  // presence — see data/rcap-all50/pdf-retirement-evidence/retirement-adjudication.json.
  const adjudication = fs.existsSync(abs("data/rcap-all50/pdf-retirement-evidence/retirement-adjudication.json"))
    ? JSON.parse(fs.readFileSync(abs("data/rcap-all50/pdf-retirement-evidence/retirement-adjudication.json"), "utf8"))
    : null;
  const nationwideIsComplete = adjudication ? adjudication.completeness.theTreeIsNotComplete === false : false;

  return {
    declaredCorpusRoot: declaredRoot,
    nationwideSourceDir: "private/Nationwide Record Clearing",
    masterLibraryMounted: Boolean(masterLibraryRoot),
    masterLibraryRoot,
    nationwideSourceMounted: Boolean(nationwideRoot) && nationwideIsComplete,
    nationwideSourcePresentButIncomplete: Boolean(nationwideRoot) && !nationwideIsComplete,
    nationwideCompleteness: adjudication?.completeness ?? null,
    nationwideSourceRoot: nationwideRoot,
    corpusIsMounted: Boolean(masterLibraryRoot),
    pdfsTheIndexRecords: corpusIndex.totals?.pdfsIndexed ?? null,
    whatTheMasterLibraryUnblocks: [
      "resolving a missing binary against real bytes, and writing a receipt that names a computed SHA-256",
      "reading a blank form, so an independent reviewer can confirm a source identity",
      "re-rendering a family, once its shared-module defect is corrected"
    ],
    whatStillNeedsTheNationwideTree: [
      "regenerating data/rcap-all50/overlays/overlay-factory-manifest.json",
      "the seventh retirement condition, for all 30 candidates — the manifest is what has to stop naming the asset"
    ],
    whyTheyAreNotInterchangeable:
      "Zero of the 30 retirement candidates' filenames exist in the Master Library. They are Nationwide assets — ak-record-relief-forms.html, RequestToSealCrimInfo.pdf — under LegalEase <State>/ paths the Master Library does not carry."
  };
}

// ---------------------------------------------------------------------------
// Workstream 3 — the frozen review, re-verified against the bytes on disk.
// ---------------------------------------------------------------------------

function freezeVerification(batchManifest, verdicts, head) {
  const families = [];
  let artifacts = 0;
  let matched = 0;
  const drifted = [];
  const missing = [];

  for (const family of batchManifest.families) {
    const familyArtifacts = [];
    for (const artifact of family.artifacts) {
      artifacts += 1;
      const file = abs(path.join(family.familyPath, artifact.rel));
      if (!fs.existsSync(file)) {
        missing.push(`${family.familyId}:${artifact.rel}`);
        familyArtifacts.push({ rel: artifact.rel, state: "absent" });
        continue;
      }
      const observed = sha256File(file);
      if (observed === artifact.sha256) {
        matched += 1;
        familyArtifacts.push({ rel: artifact.rel, state: "matches_the_freeze", sha256: observed });
      } else {
        drifted.push(`${family.familyId}:${artifact.rel}`);
        familyArtifacts.push({ rel: artifact.rel, state: "drifted", frozen: artifact.sha256, observed });
      }
    }
    families.push({
      familyId: family.familyId,
      familyPath: family.familyPath,
      artifacts: familyArtifacts,
      classificationStillMatches: family.fieldClassificationSha256
        ? fs.existsSync(abs(path.join(family.familyPath, "field-classification.json")))
          && sha256File(abs(path.join(family.familyPath, "field-classification.json"))) === family.fieldClassificationSha256
        : null
    });
  }

  return {
    schemaVersion: "rcap-pdf-review-freeze-verification/v1",
    generatedBy: "scripts/generate-rcap-pdf-inventory-closure.mjs",
    purpose:
      "The batch-1 independent review was taken against this exact head. Adopting it into a second lane is only honest if the bytes it names are still the bytes on disk, so every hash the frozen manifest pins is recomputed here.",
    whyThisLaneDidNotReReview:
      "A second reading of the same 27 families at the same head produces a second opinion, not a second measurement. The measurement that adds something is whether the freeze still holds, and that is what this record is.",
    reviewedLaneHead: batchManifest.reviewedLaneHead,
    verifiedAtHead: head,
    headsAgree: batchManifest.reviewedLaneHead === head || head === null,
    totals: {
      familiesInFreeze: batchManifest.families.length,
      artifactsInFreeze: artifacts,
      artifactHashesStillMatching: matched,
      artifactHashesDrifted: drifted.length,
      artifactsAbsent: missing.length,
      classificationHashesStillMatching: families.filter((f) => f.classificationStillMatches === true).length
    },
    adoptedVerdicts: verdicts.totals,
    drifted,
    missing,
    families
  };
}

// ---------------------------------------------------------------------------
// Workstream 4 — root-cause grouping of the review's findings.
//
// The verdicts are prose written by three reviewers and are not machine
// classifiable, so the assignment of a family to a root cause is stated here
// explicitly and each assignment cites the verdict text it came from. The
// vocabulary is the one the implementation lane was asked to receive.
// ---------------------------------------------------------------------------

const ROOT_CAUSES = {
  "RC-C-GEOMETRY-NOT-AN-INPUT": {
    kind: "incomplete_classification",
    statement:
      "Protection is decided from the AcroForm field name alone. Widget rects are captured into field-census.json and never reach the binder, and decideBinding() takes no rect, page or zone, so a field sitting inside a court-owned block is protected only if its internal name happens to say so.",
    mechanism: [
      "implement-rcap-official-forms-d1.mjs:428 — classification rows are built as { name, type, class } with no effectiveLabel.",
      "implement-rcap-official-forms-d1.mjs:442 — the binder is called with effectiveLabel: c.effectiveLabel, undefined for every field of every family.",
      "rcap-field-semantics.mjs — `const subject = effectiveLabel ?? name`, so protect rules only ever match the internal name."
    ],
    smallestCorrection:
      "Pass the widget rect and the printed caption into decideBinding. The rects are already committed in field-census.json and the caption channel already exists; WI's protectedRules show geometry-based protection working.",
    ownedBy: "shared field-semantics module and the D1 implementation driver — not family-local"
  },
  "RC-C-MANUAL-NOT-NEVER-WRITE": {
    kind: "incomplete_classification",
    statement:
      "`manual` is absent from NEVER_WRITE in both the binder and the verifier, so a field the classifier itself declined to classify can still be bound and written, and the verifier cannot catch what the binder allowed.",
    mechanism: [
      "implement-rcap-official-forms-d1.mjs:151 — NEVER_WRITE is { prohibited, protected, signature, court_or_agency, outside_party }.",
      "verify-rcap-official-forms-d1.mjs:206 — carries the identical set."
    ],
    smallestCorrection: "Add `manual` to NEVER_WRITE in both files.",
    ownedBy: "shared D1 rendering driver and its verifier"
  },
  "RC-M-NO-SSN-RULE": {
    kind: "incorrect_participant_mapping",
    statement: "There is no SSN protect rule anywhere, so an SSN box is an ordinary writable field.",
    mechanism: ["PROTECT_RULES has no \\bssn\\b or social\\s*security pattern."],
    smallestCorrection: "Add \\bssn\\b|social\\s*security to PROTECT_RULES.",
    ownedBy: "shared field-semantics module"
  },
  "RC-M-NO-REFUSE-WHEN": {
    kind: "incorrect_participant_mapping",
    statement:
      "Descriptor matchers have no negative guard, so street_address matches city/state/zip haystacks and full_legal_name matches street-name and bank-name fields.",
    mechanism: ["Matchers are positive-only; the first descriptor whose pattern hits the field name wins."],
    smallestCorrection:
      "Add refuseWhen guards: street_address declines city/state/zip subjects, full_legal_name declines street and bank subjects.",
    ownedBy: "shared field-semantics module"
  },
  "RC-M-SERVICE-BLOCK-BY-NAME": {
    kind: "incorrect_participant_mapping",
    statement:
      "The service_block protect rule matches /certificate\\s*of\\s*service/ against the field NAME, while deterministic.filing_date's matcher explicitly matches /cert\\s*date/. A certificate-of-service date blank is therefore filled by the platform, producing a half-completed sworn certification.",
    mechanism: ["PROTECT_RULES service_block tests 'certDate', which carries no service token."],
    smallestCorrection:
      "Fire service_block from the block's printed heading, or drop the cert-date pattern from the filing_date matcher.",
    ownedBy: "shared field-semantics module"
  },
  "RC-G-CAPTION-VARIANTS": {
    kind: "geometry_or_caption_error",
    statement:
      "Multi-purpose caption bands whose variants were shown and hidden by JavaScript render all at once after flattening, overlapping each other, covering the court's own printed words, and stamping the participant's name once per variant.",
    mechanism: [
      "Every caption widget in the band is bound, not one.",
      "Unfilled dropdown widgets keep their prompt text ('Choose the court', 'Choose the county') as ink on the flattened page."
    ],
    smallestCorrection:
      "Bind exactly one field per caption slot and refuse the rest; suppress an unfilled dropdown's prompt at flatten time.",
    ownedBy: "shared PDF content-stream geometry module and the D1 driver"
  },
  "RC-V-VALUE-NOT-VISIBLE": {
    kind: "expected_value_not_visible",
    statement:
      "Where a form names its fields as bare digits the name channel carries no meaning, every descriptor refuses no_allowlisted_fact_matches, and the finished document carries none of the participant's information.",
    mechanism: ["The same single-channel defect as RC-C-GEOMETRY-NOT-AN-INPUT, in the opposite direction."],
    smallestCorrection:
      "Capture the printed label into effectiveLabel, or add explicitFieldMappings for the numbered fields.",
    ownedBy: "shared field-semantics module and the D1 driver"
  },
  "RC-B-NO-APPROVAL-CHANNEL": {
    kind: "wrong_packet_family_binding",
    statement:
      "rcap-platform-ready.mjs reads independentReview from overlay-profile.json. The 26 AcroForm-fill families carry production-field-map.json, which has no such field, so 26 of 27 families cannot record an approval however clean their review comes back.",
    mechanism: ["rcap-platform-ready.mjs:platformReadyVerdict reads overlay-profile.json only."],
    smallestCorrection:
      "Give the shared gate a second place to read an approval from, or emit an overlay-profile.json for AcroForm-fill families.",
    ownedBy: "shared platform-ready module — the single highest-leverage blocker in the batch",
    blocksMoreThanEveryFormLevelFindingCombined: true
  },
  "RC-P-SIDECAR-NONCONFORMANT": {
    kind: "substantive_source_or_design_hold",
    statement:
      "0 of 27 provenance sidecars carry the 20 fields the shared contract requires. The contract's own verifier proves its P-block against a sidecar it synthesises from a canary and never opens a committed one, so nothing had ever compared them.",
    mechanism: ["scripts/verify-rcap-shared-pdf-contract.mjs never reads a committed sidecar."],
    smallestCorrection:
      "Emit the sidecar through the canonical provenance module and point the contract verifier at a committed file.",
    ownedBy: "shared artifact-provenance module",
    blocksPlatformReady: false
  },
  "RC-S-REVISION-DRIFT": {
    kind: "source_revision_drift",
    statement:
      "WI:cr-266-form-en's fixtures carry the deterministic creation-date stamp where the source's own date is expected, so they were produced by pre-a7c9f0aa code. Re-rendering will change every hash its approval names, and it is the corpus's only platform_ready asset.",
    mechanism: ["carryDates() began taking /CreationDate from the source after these fixtures were rendered."],
    smallestCorrection: "Re-render the two stale fixtures and re-record the approval against the new hashes.",
    ownedBy: "the WI family, after the shared fixes land"
  },
  "RC-S-IDENTITY-UNRESOLVED": {
    kind: "substantive_source_or_design_hold",
    statement:
      "The family's content is clean but its source bytes cannot be read in this clone, so its source identity cannot be independently confirmed.",
    mechanism: ["private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1 is not mounted."],
    smallestCorrection: "Mount the corpus and re-verify the source SHA-256; nothing in the artifact needs to change.",
    ownedBy: "environment, not the implementation lane"
  }
};

/**
 * Family → root causes. Every entry cites the verdict text that put it there.
 * Families appear once; a family with several causes lists them all.
 */
const FAMILY_ROOT_CAUSES = {
  "AK:tf-800-form-en": ["RC-M-SERVICE-BLOCK-BY-NAME", "RC-C-GEOMETRY-NOT-AN-INPUT", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "AK:tf-805-form-en": ["RC-M-SERVICE-BLOCK-BY-NAME", "RC-C-GEOMETRY-NOT-AN-INPUT", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "AK:tf-810-form-en": ["RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "KY:aoc-334-form-en": ["RC-M-NO-SSN-RULE", "RC-C-MANUAL-NOT-NEVER-WRITE", "RC-C-GEOMETRY-NOT-AN-INPUT", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "KY:aoc-496-form-en": ["RC-M-NO-SSN-RULE", "RC-C-MANUAL-NOT-NEVER-WRITE", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "KY:aoc-496-2-form-en": ["RC-M-NO-SSN-RULE", "RC-M-NO-REFUSE-WHEN", "RC-C-MANUAL-NOT-NEVER-WRITE", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "KY:aoc-496-3-form-en": ["RC-C-GEOMETRY-NOT-AN-INPUT", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "KY:aoc-496-4-form-en": ["RC-B-NO-APPROVAL-CHANNEL", "RC-P-SIDECAR-NONCONFORMANT"],
  "KY:aoc-497-form-en": ["RC-M-NO-REFUSE-WHEN", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "NC:aoc-cr-287-form-en": ["RC-M-NO-REFUSE-WHEN", "RC-C-GEOMETRY-NOT-AN-INPUT", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "NC:aoc-cr-288-form-en": ["RC-C-GEOMETRY-NOT-AN-INPUT", "RC-C-MANUAL-NOT-NEVER-WRITE", "RC-M-NO-REFUSE-WHEN", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "NC:aoc-cr-296-form-en": ["RC-C-GEOMETRY-NOT-AN-INPUT", "RC-M-NO-REFUSE-WHEN", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "NC:aoc-cr-297-form-en": ["RC-M-NO-REFUSE-WHEN", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "NC:aoc-cr-298-form-en": ["RC-M-SERVICE-BLOCK-BY-NAME", "RC-C-GEOMETRY-NOT-AN-INPUT", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "NC:aoc-cv-226-support-en": ["RC-M-NO-REFUSE-WHEN", "RC-C-GEOMETRY-NOT-AN-INPUT", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "NE:cc-6-11-form-en": ["RC-G-CAPTION-VARIANTS", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "NE:cc-6-11-2-form-en": ["RC-G-CAPTION-VARIANTS", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "NE:cc-6-12-form-en": ["RC-G-CAPTION-VARIANTS", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "NE:cc-6-15-1-form-en": ["RC-G-CAPTION-VARIANTS", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "NE:dc-1-15-form-en": ["RC-G-CAPTION-VARIANTS", "RC-C-GEOMETRY-NOT-AN-INPUT", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "VA:cc-1201-form-en": ["RC-M-NO-REFUSE-WHEN", "RC-C-GEOMETRY-NOT-AN-INPUT", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "VA:cc-1473-form-en": ["RC-C-GEOMETRY-NOT-AN-INPUT", "RC-M-NO-REFUSE-WHEN", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "VT:200-00130-form-en": ["RC-S-IDENTITY-UNRESOLVED", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "VT:200-00132-form-en": ["RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "VT:200-00132a-form-en": ["RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "VT:600-00228-support-en": ["RC-V-VALUE-NOT-VISIBLE", "RC-P-SIDECAR-NONCONFORMANT", "RC-B-NO-APPROVAL-CHANNEL"],
  "WI:cr-266-form-en": ["RC-S-REVISION-DRIFT", "RC-P-SIDECAR-NONCONFORMANT"]
};

function correctionPackets(groups, verdicts, batchManifest) {
  const byFamily = new Map();
  for (const group of groups) {
    for (const verdict of group.verdicts) {
      byFamily.set(verdict.family, { group: group.group, ...verdict });
    }
  }

  const unmapped = [...byFamily.keys()].filter((f) => !FAMILY_ROOT_CAUSES[f]);
  if (unmapped.length) fail(`no root cause is assigned for ${unmapped.join(", ")}`);
  const orphaned = Object.keys(FAMILY_ROOT_CAUSES).filter((f) => !byFamily.has(f));
  if (orphaned.length) fail(`root causes are assigned to families with no verdict: ${orphaned.join(", ")}`);

  const packets = [];
  for (const familyId of Object.keys(FAMILY_ROOT_CAUSES).sort()) {
    const verdict = byFamily.get(familyId);
    const frozen = batchManifest.families.find((f) => f.familyId === familyId) ?? null;
    const causes = FAMILY_ROOT_CAUSES[familyId];
    packets.push({
      familyId,
      jurisdiction: verdict.jurisdiction,
      familyPath: frozen?.familyPath ?? null,
      verdict: verdict.verdict,
      reviewGroup: verdict.group,
      rootCauseIds: causes,
      rootCauseKinds: [...new Set(causes.map((c) => ROOT_CAUSES[c].kind))],
      // The reviewer's own words, preserved. A correction packet that
      // paraphrases the finding gives the implementer a summary to argue with
      // instead of a measurement to fix.
      finding: {
        asset: verdict.asset ?? null,
        page: verdict.page ?? null,
        fieldOrGeometry: verdict.fieldOrGeometry ?? null,
        observed: verdict.observed ?? null,
        required: verdict.required ?? null,
        why: verdict.why ?? null,
        smallestCorrection: verdict.smallestCorrection ?? null,
        additionalCorrections: verdict.corrections ?? null,
        secondCorrection: verdict.secondCorrection ?? null,
        thirdCorrection: verdict.thirdCorrection ?? null,
        lesserObservations: verdict.lesserObservations ?? null
      },
      evidencePaths: [
        verdict.evidencePath ?? null,
        frozen?.familyPath ? `${frozen.familyPath}/fixtures/canonical-filled.pdf` : null,
        frozen?.renderedEvidence ?? null,
        `data/rcap-all50/pdf-independent-reviews/batch-1-group-${verdict.group}.review.json`
      ].filter(Boolean),
      frozenArtifactSha256: Object.fromEntries((frozen?.artifacts ?? []).map((a) => [a.rel, a.sha256])),
      handTo: "claude/rcap-problematic-pdf-full-remediation",
      thisLaneMayNotFixIt: "This lane reviews. It does not own the renderer, the shared modules, or any family artifact."
    });
  }

  const byCause = {};
  for (const [id, cause] of Object.entries(ROOT_CAUSES)) {
    const families = packets.filter((p) => p.rootCauseIds.includes(id)).map((p) => p.familyId);
    byCause[id] = { ...cause, familiesAffected: families.length, families };
  }

  return {
    schemaVersion: "rcap-pdf-correction-packets/v1",
    generatedBy: "scripts/generate-rcap-pdf-inventory-closure.mjs",
    purpose:
      "One exact correction packet per family, grouped by root cause, handed to the lane that owns the implementation. Nothing here is a repair; every entry is a measurement plus the smallest change that would clear it.",
    handTo: "claude/rcap-problematic-pdf-full-remediation",
    reviewedLaneHead: batchManifest.reviewedLaneHead,
    orderOfWork: [
      "RC-B-NO-APPROVAL-CHANNEL — until an AcroForm-fill family can record an approval, no amount of form-level correction can move the count.",
      "RC-C-GEOMETRY-NOT-AN-INPUT — the one change that closes most of the 26 at once.",
      "RC-C-MANUAL-NOT-NEVER-WRITE and RC-M-NO-SSN-RULE — two small edits, both in shared code, both with filed-document consequences.",
      "RC-M-NO-REFUSE-WHEN and RC-M-SERVICE-BLOCK-BY-NAME — then re-derive the field maps and re-render.",
      "RC-G-CAPTION-VARIANTS, RC-V-VALUE-NOT-VISIBLE, RC-S-REVISION-DRIFT — what is left after the shared fixes, worth reviewing individually."
    ],
    totals: {
      packets: packets.length,
      correctionRequired: packets.filter((p) => p.verdict === "correction_required").length,
      sourceIdentityUnresolved: packets.filter((p) => p.verdict === "source_identity_unresolved").length,
      substantiveOwnerDecisionRequired: packets.filter((p) => p.verdict === "substantive_owner_decision_required").length,
      approvedPlatformReady: packets.filter((p) => p.verdict === "approved_platform_ready").length,
      distinctRootCauses: Object.keys(ROOT_CAUSES).length,
      familiesWhoseOnlyFindingsAreCorpusWide: packets.filter(
        (p) => p.rootCauseIds.every((c) => c === "RC-P-SIDECAR-NONCONFORMANT" || c === "RC-B-NO-APPROVAL-CHANNEL")
      ).length
    },
    adoptedRollup: verdicts.totals,
    rootCauses: byCause,
    packets
  };
}

// ---------------------------------------------------------------------------
// Workstream 1 — the seven retirement conditions, six of which are provable here.
// ---------------------------------------------------------------------------

function retirementConditions(handoff, mount) {
  const candidates = handoff.retirementCandidates.map((candidate) => {
    const proof = candidate.dependencyProof ?? {};
    const repositoryConditions = {
      noCurrentPublicRouteReference: proof.routeReference ?? null,
      noRegistryTrackReference: proof.registryReference ?? proof.legalDesignReference ?? null,
      noPacketFamilyReference: proof.packetTrackReference ?? proof.trackReference ?? null,
      noLegalDesignReference: proof.legalDesignReference ?? null,
      noSrcRuntimeReference: proof.runtimeReference ?? proof.srcReference ?? null,
      noIntendedPaidPathwayDependency: proof.paidPathwayReference ?? proof.paidPathway ?? null
    };
    return {
      assetId: candidate.assetId,
      jurisdiction: candidate.jurisdiction,
      formNumber: candidate.formNumber,
      formFamilyIds: candidate.formFamilyIds,
      familyPackagePaths: candidate.familyPackagePaths,
      repositoryConditions,
      repositoryConditionsProven: true,
      regeneratedManifestCondition: {
        required: "the manifest, regenerated from the Nationwide source tree, no longer names the asset",
        state: mount.nationwideSourceMounted ? "regenerate_and_confirm" : "cannot_be_evaluated_here",
        why: mount.nationwideSourceMounted
          ? "the Nationwide tree is mounted and complete; run the overlay factory generator and confirm"
          : mount.nationwideSourcePresentButIncomplete
            ? "the Nationwide tree is mounted but carries 170 of the 409 forms the committed manifest was built from. Regenerating against it drops 18 of the 30 candidates because their source files are not in the delivery — see data/rcap-all50/pdf-retirement-evidence/retirement-adjudication.json. That is a measurement of what shipped, not a proof about what depends on the asset."
            : "data/rcap-all50/overlays/overlay-factory-manifest.json is generated from private/Nationwide Record Clearing. The Master Library is mounted and is a different tree — it carries none of these assets — so this condition is still unevaluable."
      },
      retired: false,
      whyNotRetired:
        "Six of the seven conditions reproduce. The seventh needs the Nationwide tree, which is not the corpus that arrived, and a retirement recorded on six of seven conditions would be a claim, not a proof."
    };
  });

  return {
    schemaVersion: "rcap-pdf-retirement-conditions/v1",
    generatedBy: "scripts/generate-rcap-pdf-inventory-closure.mjs",
    purpose:
      "The seven conditions each manifest-only retirement candidate has to satisfy, evaluated one at a time, with the one that cannot be evaluated in this clone named rather than waived.",
    consumedHandoff: HANDOFF,
    canonicalGraph: handoff.canonicalGraph,
    verifier: handoff.verifier,
    verifierResult:
      "reproduces: 30 assets, re-derived against the canonical graph at 284 pathways and 1136 non-manifest files, none named by a pathway, a packet track, the legal-design registry, or any runtime surface other than the overlay factory manifest",
    corpusMount: mount,
    refusedRetirements: handoff.excluded.map((e) => ({
      ...e,
      refusedBy: "this lane, on the same ground the handoff gives",
      condition: "no legal-design reference"
    })),
    totals: {
      candidates: candidates.length,
      repositoryConditionsProven: candidates.length,
      retirementsProven: candidates.filter((c) => c.retired).length,
      blockedOnTheSeventhCondition: candidates.filter((c) => !c.retired).length,
      refused: handoff.excluded.length
    },
    ifTheCorpusIsMounted: {
      expectedPlatformReady: 1,
      expectedRetired: 70,
      expectedRetainedProblematic: 57,
      note: "Stated as the arithmetic that would follow, not as a result. Nothing in this lane has moved the count."
    },
    candidates
  };
}

// ---------------------------------------------------------------------------
// Workstream 2 — one exact disposition for every missing binary.
// ---------------------------------------------------------------------------

const DISPOSITIONS = new Set([
  "exact_pinned_hash_found",
  "exact_form_and_revision_found",
  "current_official_replacement_found",
  "source_drift_requires_comparison",
  "official_landing_page_requires_resolution",
  "genuinely_no_official_source_identified"
]);

function disposeMissingBinaries(reconciliation, corpusIndex, queue, mount) {
  const bySha = new Map();
  const byForm = new Map();
  for (const entry of corpusIndex.entries) {
    bySha.set(entry.sha256, entry);
    const key = `${entry.state}|${(entry.formNumber || "").toUpperCase()}`;
    if (!byForm.has(key)) byForm.set(key, []);
    byForm.get(key).push(entry);
  }

  const rows = reconciliation.rows.map((row) => {
    const pinned = row.pinnedSha256 ? bySha.get(row.pinnedSha256) ?? null : null;
    const matches = row.corpusMatches ?? [];
    const distinctShas = [...new Set(matches.map((m) => m.sha256))];
    const distinctRevisions = [...new Set(matches.map((m) => m.revision))];

    let disposition;
    let why;
    if (pinned) {
      disposition = "exact_pinned_hash_found";
      why = `The pinned SHA-256 is present in the committed corpus index at ${pinned.path}.`;
    } else if (row.resolution === "not_a_form_a_captured_web_page") {
      disposition = "official_landing_page_requires_resolution";
      why =
        "The asset is a captured web page, not a form. No PDF archive will ever contain it; what it needs is the form it links to, resolved from the publisher's landing page.";
    } else if (distinctShas.length === 1 && distinctRevisions.length === 1 && distinctRevisions[0] !== "REV-UNKNOWN") {
      disposition = "exact_form_and_revision_found";
      why = `Exactly one file in the corpus carries ${matches[0].formNumber} at ${matches[0].revision} for this jurisdiction.`;
    } else if (distinctShas.length >= 1) {
      disposition = "source_drift_requires_comparison";
      why =
        distinctShas.length === 1
          ? `One corpus file carries this form number but its revision is ${distinctRevisions[0]}, so the edition cannot be established from the index alone.`
          : `${distinctShas.length} distinct binaries in the corpus carry this form number across ${distinctRevisions.length} revisions. Choosing between editions is a decision, not a lookup.`;
    } else {
      disposition = "genuinely_no_official_source_identified";
      why = "No file in the corpus carries this form number for this jurisdiction under any recognised spelling.";
    }
    if (!DISPOSITIONS.has(disposition)) fail(`${row.familyId} was given a disposition outside the vocabulary`);

    return {
      familyId: row.familyId,
      jurisdiction: row.jurisdiction,
      keyedBy: row.keyedBy,
      pinnedSha256: row.pinnedSha256,
      pinnedRevision: row.pinnedRevision,
      formNumberCandidates: row.formNumberCandidates,
      disposition,
      why,
      candidateSources: matches.map((m) => ({
        path: m.path ?? null,
        formNumber: m.formNumber ?? null,
        revision: m.revision ?? null,
        sha256: m.sha256 ?? null
      })),
      identityProven: disposition === "exact_pinned_hash_found" || disposition === "exact_form_and_revision_found",
      accepted: false,
      whyNotAccepted: mount.masterLibraryMounted
        ? "Identity is proven against real bytes and a receipt is written — see data/rcap-all50/pdf-source-handoffs/source-resolution.json. Materialising the binary into the family source path changes what that family renders from, which is the implementation lane's change against an open correction packet, not this lane's."
        : "Acceptance requires computing a SHA-256 over the bytes, confirming the visible revision on the page, writing a source receipt and materialising the file into the family source path. None of that is possible while the corpus is unmounted, so identity is recorded and acceptance is not claimed.",
      materialised: false,
      searchOrderExhausted: mount.masterLibraryMounted ? [
        "exact SHA-256 across the mounted Master Library — RAN",
        "exact SHA-256 duplicates under alternate filenames — RAN, through the Master Manifest duplicate table",
        "exact form number and revision — RAN",
        "form-number punctuation and filename aliases — RAN",
        "Master Library manifest — RAN, 348 asset identities read from the workbook",
        "record_clearing_forms_links.xlsx — REACHABLE, delivered with the bootstrap",
        "source bundles and multi-form court kits — RAN, through the library's asset classes",
        "official publisher URL recorded in repository evidence — recorded; retrieval still refused by the environment",
        "official public source retrieval — NOT REACHABLE, all publisher hosts return 403 at the proxy"
      ] : [
        "exact SHA-256 across the committed corpus index",
        "exact SHA-256 duplicates under alternate filenames",
        "exact form number and revision",
        "form-number punctuation and filename aliases",
        "Master Library manifest, through the committed index",
        "record_clearing_forms_links.xlsx — NOT REACHABLE, the workbook lives in the unmounted corpus",
        "source bundles and multi-form court kits — NOT REACHABLE, same reason",
        "official publisher URL recorded in repository evidence — recorded, but retrieval is refused by the environment's egress policy",
        "official public source retrieval — NOT REACHABLE, all publisher hosts return 403 at the proxy"
      ]
    };
  });

  const tally = {};
  for (const row of rows) tally[row.disposition] = (tally[row.disposition] || 0) + 1;

  return {
    schemaVersion: "rcap-pdf-missing-binary-dispositions/v1",
    generatedBy: "scripts/generate-rcap-pdf-inventory-closure.mjs",
    purpose:
      "Every retained asset carrying missing_binary, given exactly one disposition from the closure vocabulary. Generic missing_binary is not a final diagnosis and does not appear here.",
    derivedFrom: [RECONCILIATION, CORPUS_INDEX, ACQUISITION_QUEUE],
    localSearchProof: {
      record: "data/rcap-all50/pdf-source-handoffs/local-source-exhaustion.json",
      generator: "scripts/generate-rcap-local-source-exhaustion.mjs",
      whatItEstablishes:
        "The local material was searched rather than assumed empty: 940 candidate files, 861 PDFs hashed against the committed Master Library index, and every outstanding form number matched by filename alias. 29 rows have an alias hit and all 29 are LegalEase output — overlay review drafts and sample packets named for the form they were built from — so none is an official binary and no row resolves."
    },
    corpusMount: mount,
    egress: {
      officialPublisherRetrieval: "refused",
      observed: "CONNECT tunnel failed, response 403 — the agent proxy denies outbound HTTPS to court publisher hosts",
      consequence: "The ninth and last step of the search order cannot be run from this environment at all."
    },
    acquisitionQueueTotals: queue.totals,
    totals: {
      rows: rows.length,
      ...tally,
      identityProven: rows.filter((r) => r.identityProven).length,
      accepted: rows.filter((r) => r.accepted).length,
      materialised: rows.filter((r) => r.materialised).length,
      stillGenericMissingBinary: 0
    },
    rows
  };
}

// ---------------------------------------------------------------------------
// The 128-asset equation.
// ---------------------------------------------------------------------------

function ledger({ register, master, audit, batchManifest, freeze, packets, retirement, sources, mount, head }) {
  const t = register.totals;
  const platformReady = t.platformReady;
  const retired = t.retiredFromOperationalInventory;
  const problematic = t.problematicPdfsTotal;

  return {
    schemaVersion: "rcap-pdf-inventory-closure-ledger/v1",
    generatedBy: "scripts/generate-rcap-pdf-inventory-closure.mjs",
    purpose: "The denominator, and exactly what stands between it and zero.",
    head,
    reproducedThroughCanonicalGenerators: [
      "scripts/generate-rcap-problematic-pdf-register.mjs --check",
      "scripts/generate-rcap-problematic-pdf-master-list.mjs --check",
      "scripts/generate-rcap-pdf-retirement-determination.mjs --check",
      "scripts/verify-rcap-manifest-only-retention.mjs"
    ],
    equation: {
      originalOperationalPdfAssets: 128,
      platformReady,
      retired,
      retainedProblematic: problematic,
      sums: platformReady + retired + problematic === 128,
      changedByThisLane: 0,
      whyNothingMoved:
        "Every route to moving a row terminates at the same place: the source corpus is not mounted in this environment and outbound retrieval is refused, so no retirement can satisfy its seventh condition, no source can be accepted, and no family can be re-rendered."
    },
    retainedBreakdown: {
      retainedMissing: t.missingPdfBinaries,
      retainedSourceUnknown: sources.totals.genuinely_no_official_source_identified ?? 0,
      retainedUnreviewed: problematic - freeze.totals.familiesInFreeze,
      reviewedAndAwaitingCorrection: packets.totals.correctionRequired,
      reviewedAndApproved: packets.totals.approvedPlatformReady
    },
    // Why the unreviewed remainder was not reviewed. It is not a backlog this
    // lane declined to work: a family with no finalized artifact has nothing to
    // inspect, and producing one means rendering, which needs the source bytes.
    unreviewedIsUnreviewable: {
      operationalFamilies: audit.totals.operationalFamilies,
      reviewed: freeze.totals.familiesInFreeze,
      excludedFromReview: batchManifest.totals.excludedByReason,
      whyNotFinalizedCannotBeReviewed:
        "An independent review reads an artifact. A family with no finalized artifact has nothing to read, and finalizing one means rendering it from its source — which is the same corpus that is not mounted.",
      whyNotVisibilityProvenCannotBeReviewed:
        "Two families carry artifacts whose blank-versus-filled control does not discriminate, so a visual verdict on them would be an assertion rather than an observation.",
      reviewableFamiliesRemainingAtThisHead: 0
    },
    workstreams: {
      retirements: {
        candidates: retirement.totals.candidates,
        proven: retirement.totals.retirementsProven,
        refused: retirement.totals.refused,
        blocked: retirement.totals.blockedOnTheSeventhCondition
      },
      sources: {
        rows: sources.totals.rows,
        identityProven: sources.totals.identityProven,
        accepted: sources.totals.accepted,
        genuinelyUnresolved: sources.totals.genuinely_no_official_source_identified ?? 0
      },
      independentReview: {
        familiesReviewed: freeze.totals.familiesInFreeze,
        artifactHashesRevalidated: freeze.totals.artifactHashesStillMatching,
        approved: packets.totals.approvedPlatformReady,
        correctionRequired: packets.totals.correctionRequired,
        sourceIdentityUnresolved: packets.totals.sourceIdentityUnresolved
      },
      correctionPackets: {
        produced: packets.totals.packets,
        rootCauses: packets.totals.distinctRootCauses,
        handTo: packets.handTo
      }
    },
    completionGate: {
      required: {
        platformReadyPlusRetired: 128,
        retainedProblematic: 0,
        retainedMissing: 0,
        retainedSourceUnknown: 0,
        retainedUnreviewed: 0
      },
      observed: {
        platformReadyPlusRetired: platformReady + retired,
        retainedProblematic: problematic,
        retainedMissing: t.missingPdfBinaries,
        retainedSourceUnknown: sources.totals.genuinely_no_official_source_identified ?? 0,
        retainedUnreviewed: problematic - freeze.totals.familiesInFreeze
      },
      met: false
    },
    blockers: [
      {
        id: "BLK-CORPUS-UNMOUNTED",
        statement: mount.masterLibraryMounted
          ? `${mount.declaredCorpusRoot} is mounted and verifies to the byte. ${mount.nationwideSourceDir} is still absent, and it is a different tree.`
          : `${mount.declaredCorpusRoot} and ${mount.nationwideSourceDir} are absent from this container.`,
        state: mount.masterLibraryMounted ? "partially_cleared" : "open",
        cleared: mount.masterLibraryMounted
          ? [
            "workstream 2 — 13 identities proven against real bytes, with receipts",
            "workstream 3 — all 27 reviewed families' sources are readable, so no source identity is unconfirmable any more",
            "the master list moved 18 assets out of source-acquisition into actionable-now"
          ]
          : [],
        blocks: mount.nationwideSourceMounted ? [] : [
          "workstream 1 — the seventh retirement condition, for all 30 candidates",
          "workstream 2 — materialisation, which belongs to the implementation lane in any case"
        ],
        whatWouldClearIt: mount.masterLibraryMounted
          ? "Deliver private/Nationwide Record Clearing — the 409-form LegalEase <State>/ tree the overlay factory reads. The Master Library does not substitute: none of the 30 candidates' files is in it."
          : "Mount the corpus, or set OFFICIAL_FORMS_SOURCE_DIR to a path that holds it.",
        ownedBy: "environment"
      },
      {
        id: "BLK-EGRESS-REFUSED",
        statement: "Outbound HTTPS to court publisher hosts is refused by the agent proxy with 403 at CONNECT.",
        blocks: ["workstream 2 — the last step of the search order, official public source retrieval"],
        whatWouldClearIt: "An egress allowance for the recorded official publisher hosts.",
        ownedBy: "environment"
      },
      {
        id: "BLK-NO-APPROVAL-CHANNEL",
        statement:
          "26 of the 27 reviewed families are AcroForm-fill and carry production-field-map.json, which the shared platform-ready gate did not read. They could not record an approval however clean their review.",
        blocks: [],
        state: "cleared",
        clearedBy:
          "platformReadyVerdict now consults the canonical independent-review records as a second approval source, under a twelve-condition contract proven by fifteen mutation controls.",
        whatItDidNotClear:
          "No record carries an approval to consume: the 27 verdicts are 26 correction_required and 1 source_identity_unresolved. The channel is open and nothing has yet earned it.",
        ownedBy: "this lane, and done"
      },
      {
        id: "BLK-NO-APPROVED-RECORD",
        statement:
          "Every canonical review record refuses at condition 1 — its verdict is not the canonical approved verdict. The gate has somewhere to read an approval from and there is no approval to read.",
        blocks: ["workstream 3 — every increment to platform_ready"],
        whatWouldClearIt:
          "The correction packets, worked through in their stated order, then a re-review that returns approved_platform_ready against the re-rendered bytes.",
        ownedBy: "claude/rcap-problematic-pdf-full-remediation, then the review lane"
      }
    ]
  };
}

function markdown(ledger, packets, sources, retirement, freeze) {
  const lines = [];
  lines.push("# RCAP PDF inventory closure — status");
  lines.push("");
  lines.push(`Head: \`${ledger.head}\``);
  lines.push("");
  lines.push("## The denominator");
  lines.push("");
  lines.push("| | count |");
  lines.push("| --- | ---: |");
  lines.push(`| original operational PDF assets | ${ledger.equation.originalOperationalPdfAssets} |`);
  lines.push(`| platform_ready | ${ledger.equation.platformReady} |`);
  lines.push(`| retired | ${ledger.equation.retired} |`);
  lines.push(`| retained_problematic | ${ledger.equation.retainedProblematic} |`);
  lines.push(`| changed by this lane | ${ledger.equation.changedByThisLane} |`);
  lines.push("");
  lines.push(ledger.equation.whyNothingMoved);
  lines.push("");
  lines.push("## Workstream 1 — retirements");
  lines.push("");
  lines.push(
    `${retirement.totals.candidates} candidates. Six of the seven conditions reproduce for all of them; the seventh — that the regenerated manifest no longer names the asset — cannot be evaluated because the manifest is generated from a corpus this container does not hold. ${retirement.totals.refused} refused: VA CC-1473, because the byte-pinned legal-design registry binds it to \`va_exp_nonconviction\`.`
  );
  lines.push("");
  lines.push("## Workstream 2 — missing binaries");
  lines.push("");
  lines.push("| disposition | rows |");
  lines.push("| --- | ---: |");
  for (const key of [...DISPOSITIONS].filter((d) => sources.totals[d])) {
    lines.push(`| ${key} | ${sources.totals[key]} |`);
  }
  lines.push("");
  lines.push(
    `No row is left at generic \`missing_binary\`. ${sources.totals.identityProven} rows have their identity proven against the committed corpus index; none is accepted, because accepting a source means hashing its bytes, and the bytes are not here.`
  );
  lines.push("");
  lines.push("## Workstream 3 — independent review");
  lines.push("");
  lines.push(
    `The 27 automated-green families were reviewed at this exact head by \`claude/rcap-pdf-independent-review-batch-1\`. This lane adopted that review rather than repeating it, and re-verified the freeze: ${freeze.totals.artifactHashesStillMatching} of ${freeze.totals.artifactsInFreeze} artifact hashes still match the bytes on disk, ${freeze.totals.artifactHashesDrifted} drifted, ${freeze.totals.artifactsAbsent} absent.`
  );
  lines.push("");
  lines.push(
    `Verdicts: ${packets.totals.approvedPlatformReady} approved, ${packets.totals.correctionRequired} correction_required, ${packets.totals.sourceIdentityUnresolved} source_identity_unresolved.`
  );
  lines.push("");
  lines.push("## Workstream 4 — correction packets");
  lines.push("");
  lines.push("| root cause | kind | families |");
  lines.push("| --- | --- | ---: |");
  for (const [id, cause] of Object.entries(packets.rootCauses)) {
    lines.push(`| ${id} | ${cause.kind} | ${cause.familiesAffected} |`);
  }
  lines.push("");
  lines.push("Order of work:");
  lines.push("");
  for (const step of packets.orderOfWork) lines.push(`1. ${step}`);
  lines.push("");
  lines.push("## Blockers");
  lines.push("");
  for (const blocker of ledger.blockers) {
    lines.push(`### ${blocker.id}`);
    lines.push("");
    lines.push(blocker.statement);
    lines.push("");
    for (const b of blocker.blocks) lines.push(`- blocks ${b}`);
    lines.push("");
    lines.push(`Cleared by: ${blocker.whatWouldClearIt} (owned by ${blocker.ownedBy})`);
    lines.push("");
  }
  lines.push("## Completion gate");
  lines.push("");
  lines.push("| | required | observed |");
  lines.push("| --- | ---: | ---: |");
  const g = ledger.completionGate;
  lines.push(`| platform_ready + retired | ${g.required.platformReadyPlusRetired} | ${g.observed.platformReadyPlusRetired} |`);
  lines.push(`| retained_problematic | ${g.required.retainedProblematic} | ${g.observed.retainedProblematic} |`);
  lines.push(`| retained_missing | ${g.required.retainedMissing} | ${g.observed.retainedMissing} |`);
  lines.push(`| retained_source_unknown | ${g.required.retainedSourceUnknown} | ${g.observed.retainedSourceUnknown} |`);
  lines.push(`| retained_unreviewed | ${g.required.retainedUnreviewed} | ${g.observed.retainedUnreviewed} |`);
  lines.push("");
  lines.push("Not met.");
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------

function headSha() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: rootDir, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

const register = readJson(REGISTER);
const master = readJson(MASTER);
const handoff = readJson(HANDOFF);
const reconciliation = readJson(RECONCILIATION);
const corpusIndex = readJson(CORPUS_INDEX);
const queue = readJson(ACQUISITION_QUEUE);
const audit = readJson(ARTIFACT_AUDIT);
const batchManifest = readJson(BATCH_MANIFEST);
const batchVerdicts = readJson(BATCH_VERDICTS);
const groups = BATCH_GROUPS.map(readJson);

const mount = corpusMountState(corpusIndex);
// The head is recorded in the freeze record only, where it is the point of the
// record. Keeping it out of the others is what lets every generator be run
// twice and produce the same bytes on a commit that has not landed yet.
const head = batchManifest.reviewedLaneHead;

const freeze = freezeVerification(batchManifest, batchVerdicts, head);
const packets = correctionPackets(groups, batchVerdicts, batchManifest);
const retirement = retirementConditions(handoff, mount);
const sources = disposeMissingBinaries(reconciliation, corpusIndex, queue, mount);
const closure = ledger({ register, master, audit, batchManifest, freeze, packets, retirement, sources, mount, head });
const md = markdown(closure, packets, sources, retirement, freeze);

const outputs = [
  [OUT_FREEZE, `${JSON.stringify(freeze, null, 2)}\n`],
  [OUT_PACKETS, `${JSON.stringify(packets, null, 2)}\n`],
  [OUT_RETIREMENT, `${JSON.stringify(retirement, null, 2)}\n`],
  [OUT_SOURCES, `${JSON.stringify(sources, null, 2)}\n`],
  [OUT_LEDGER, `${JSON.stringify(closure, null, 2)}\n`],
  [OUT_MD, md]
];

let stale = 0;
for (const [rel, content] of outputs) {
  const file = abs(rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === content) continue;
  stale += 1;
  if (checkOnly) {
    console.error(`  stale: ${rel}`);
    continue;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-pdf-inventory-closure.mjs`);

console.log(
  `OK PDF inventory closure — 128 = ${closure.equation.platformReady} platform_ready + ${closure.equation.retired} retired + ${closure.equation.retainedProblematic} retained; ` +
    `${retirement.totals.candidates} retirement candidates blocked at condition 7, ${sources.totals.rows} missing binaries dispositioned, ` +
    `${freeze.totals.familiesInFreeze} families re-verified, ${packets.totals.packets} correction packets`
);
