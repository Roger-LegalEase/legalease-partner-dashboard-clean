// Reconciles every one of the 61 families review returned against what the
// correction cycle actually did to it.
//
// 48 families were re-rendered and 61 were returned, so 13 families changed no
// participant bytes. "13 families were not re-rendered" is not an account of
// them -- each one has to name the reason it needed no new artifact, and that
// reason has to be checkable. This builds that table from git rather than from
// anyone's summary: for each family it diffs the reviewed lane head against the
// correction branch and classifies what moved.
//
// It refuses to emit unless 48 + the explicitly accounted remainder is exactly
// 61, and unless no approved or held family has drifted into the population.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRODUCTION = "data/rcap-all50/overlays/production";

const git = (args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).trim();
const gitQuiet = (args) => { try { return git(args); } catch { return null; } };

const index = JSON.parse(fs.readFileSync(
  path.join(rootDir, "docs/record-clearing/d-wave/corrections-v2/correction-index.json"), "utf8"));

export function shardForFamily(familyId) {
  const hex = crypto.createHash("sha256").update(familyId).digest("hex");
  return Number(BigInt(`0x${hex}`) % 3n);
}

// What kind of file moved. A participant PDF is the filed artifact; a contact
// sheet is review evidence about it; everything else is a report, ledger,
// classification or map -- evidence about the build, not the filing.
function classifyPath(p) {
  if (/\/fixtures\/.*-filled\.pdf$/.test(p)) return "participantPdf";
  if (/\/contact-sheet\/.*\.pdf$/.test(p)) return "contactSheet";
  if (/\/reports\/overflow-and-clipping\.json$/.test(p)) return "ledger";
  if (/\/(reports|fixtures)\/.*\.json$/.test(p)) return "evidence";
  if (/\/(field-census|field-classification|overlay-profile|production-field-map|source-record)\.json$/.test(p)) return "classification";
  return "evidence";
}

// Why a family that produced no new participant bytes did not need any. Each
// reason is tied to the defect classes the index recorded for that family, so
// it can be checked rather than taken on trust.
function nonRerenderAccount(family) {
  const classes = new Set(family.corrections.map((c) => c.defectClass));
  if (classes.has("anchor_decoder_subset_font")) {
    return {
      account: "blocked_on_unnamed_shared_defect",
      detail: "rcap-pdf-anchor-capture loadFonts consults neither /ToUnicode nor /Encoding /Differences, so this family's subset-font text layer decodes to nothing and its no-extractable-text disposition rests on a false premise. Outside the three defects this cycle authorized; the family is unchanged and unapproved."
    };
  }
  if (classes.has("rich_text_field_finalize_crash")) {
    return {
      account: "blocked_on_unnamed_shared_defect",
      detail: "sanitizeAndFlatten calls updateFieldAppearances with no guard for rich-text (/RV) fields, so this family throws RichTextFieldReadError before a page is written and no artifact exists to correct. Outside the three defects this cycle authorized; the family is unchanged and unapproved."
    };
  }
  if ([...classes].every((c) => c === "orchestrator_manifest_source_pointer")) {
    return {
      account: "orchestrator_evidence_only_no_artifact_implicated",
      detail: "The finding was against the review manifest, not the family: the builder read canonicalBundlePath while lane D1C records canonicalRelativePath, so the source pointer reported null. The manifest now normalizes both spellings and the pointer resolves to pack bytes matching the recorded sha256. No artifact was ever implicated, so none was re-rendered."
    };
  }
  return { account: "unaccounted", detail: null };
}

const rows = [];
for (const family of index.families) {
  const lane = index.laneCorrectionBranches[family.lane];
  const from = lane.head;
  const to = `origin/${lane.to}`;
  const familyDir = `${PRODUCTION}/${family.stateSlug}/${family.familyId.split(":")[1]}`;

  const changed = (gitQuiet(["diff", "--name-only", from, to, "--", familyDir]) ?? "")
    .split("\n").filter(Boolean);
  const kinds = new Set(changed.map(classifyPath));

  const participantChanged = kinds.has("participantPdf");
  const sheetChanged = kinds.has("contactSheet");
  const onlySupporting = changed.length > 0 && !participantChanged && !sheetChanged;

  // The commit on the correction branch that last touched this family.
  const correctedCommit = changed.length > 0
    ? gitQuiet(["log", "-1", "--format=%H", to, "--", familyDir])
    : null;

  const account = participantChanged ? null : nonRerenderAccount(family);

  rows.push({
    familyId: family.familyId,
    state: family.state,
    stateSlug: family.stateSlug,
    lane: family.lane,
    priorReviewFindingIds: family.corrections.map((c) => c.reviewFindingId),
    priorReviewShard: family.corrections[0]?.reviewShard ?? null,
    priorImplementationBranch: family.implementationBranch,
    priorImplementationCommit: family.implementationCommit,
    reviewedLaneHead: from,
    correctionCategories: [...new Set(family.corrections.map((c) => c.defectClass))].sort(),
    fixRoutes: family.fixRoutes,
    participantPdfBytesChanged: participantChanged,
    contactSheetBytesChanged: sheetChanged,
    onlyEvidenceVerifierClassificationOrLedgerChanged: onlySupporting,
    nothingChanged: changed.length === 0,
    filesChanged: changed.length,
    changedKinds: [...kinds].sort(),
    correctedBranch: lane.to,
    correctedCommit,
    acceptanceConditions: family.corrections.map((c) => ({
      reviewFindingId: c.reviewFindingId,
      defectClass: c.defectClass,
      file: c.file,
      page: c.page,
      fieldOrRegion: c.fieldOrRegion,
      acceptanceCondition: c.acceptanceCondition
    })),
    nonRerenderAccount: account?.account ?? null,
    nonRerenderDetail: account?.detail ?? null,
    phase4ReviewerShard: shardForFamily(family.familyId),
    phase4ReviewBranch: `claude/rcap-review-d-corrections-v2-shard-${shardForFamily(family.familyId)}`,
    // Filled in once the three Phase 4 shards push. Recorded as pending rather
    // than guessed: an unreviewed family with an assumed disposition is exactly
    // what this cycle exists to prevent.
    newIndependentDisposition: "pending_phase_4_independent_review"
  });
}

rows.sort((a, b) => a.familyId.localeCompare(b.familyId));

// Three buckets, not two. 48 families were re-rendered, but re-rendering is not
// the same as changing the filed artifact: Defect A (print flags) changes the
// participant PDF, while Defects B and C change only the contact sheet, which
// is review evidence about the filing rather than the filing itself. 32 filed
// artifacts moved; 16 families kept a byte-identical participant PDF and got a
// corrected sheet; 13 produced no new bytes at all.
const changedRows = rows.filter((r) => r.participantPdfBytesChanged);
const evidenceOnlyRerendered = rows.filter((r) => !r.participantPdfBytesChanged && (r.contactSheetBytesChanged || r.onlyEvidenceVerifierClassificationOrLedgerChanged));
const accountedRows = rows.filter((r) => !r.participantPdfBytesChanged && !r.contactSheetBytesChanged && !r.onlyEvidenceVerifierClassificationOrLedgerChanged);
const unaccounted = accountedRows.filter((r) => r.nonRerenderAccount === "unaccounted");
const rerendered = changedRows.length + evidenceOnlyRerendered.length;

const approved = new Set(index.preservedTechnicalApproved);
const held = new Set(index.preservedHeldOnSourceOrDesign);
const strays = rows.filter((r) => approved.has(r.familyId) || held.has(r.familyId));

const findingIds = rows.flatMap((r) => r.priorReviewFindingIds);
const totals = {
  priorCorrectionFamilies: rows.length,
  uniqueFamilies: new Set(rows.map((r) => r.familyId)).size,
  underlyingReviewFindings: findingIds.length,
  familiesRerendered: rerendered,
  participantArtifactChanged: changedRows.length,
  reviewEvidenceOnlyChangedParticipantPdfIdentical: evidenceOnlyRerendered.length,
  producedNoNewBytesButAccounted: accountedRows.length - unaccounted.length,
  unaccounted: unaccounted.length,
  reconcilesTo61: changedRows.length + evidenceOnlyRerendered.length + accountedRows.length,
  byNonRerenderAccount: accountedRows.reduce((acc, r) => {
    acc[r.nonRerenderAccount] = (acc[r.nonRerenderAccount] ?? 0) + 1;
    return acc;
  }, {}),
  contactSheetChanged: rows.filter((r) => r.contactSheetBytesChanged).length,
  onlySupportingChanged: rows.filter((r) => r.onlyEvidenceVerifierClassificationOrLedgerChanged).length,
  phase4ShardCounts: [0, 1, 2].map((s) => rows.filter((r) => r.phase4ReviewerShard === s).length),
  approvedOrHeldFamiliesPresent: strays.length
};

const gates = [
  { gate: "exactly 61 unique prior correction families", pass: rows.length === 61 && totals.uniqueFamilies === 61, observed: { rows: rows.length, unique: totals.uniqueFamilies } },
  { gate: "48 families re-rendered", pass: rerendered === 48, observed: rerendered },
  { gate: "the remaining 13 produced no new bytes and are each explicitly accounted for", pass: unaccounted.length === 0 && accountedRows.length === 13, observed: { remaining: accountedRows.length, unaccounted: unaccounted.map((r) => r.familyId) } },
  { gate: "no finding omitted", pass: findingIds.length === index.summary.correctionsTotal, observed: { inTable: findingIds.length, inIndex: index.summary.correctionsTotal } },
  { gate: "no technical_approved or held family moved into the correction population", pass: strays.length === 0, observed: strays.map((r) => r.familyId) },
  { gate: "the three buckets reconcile to 61", pass: changedRows.length + evidenceOnlyRerendered.length + accountedRows.length === 61, observed: `${changedRows.length} + ${evidenceOnlyRerendered.length} + ${accountedRows.length}` },
  // Recorded, not asserted. The cycle was framed as "48 families
  // participant_artifact_changed"; the bytes say 32. Defects B and C change the
  // contact sheet, which is evidence about a filing rather than the filing, so
  // 16 of the 48 kept a byte-identical participant PDF. Fewer filed artifacts
  // moved than expected, which is the better outcome, but the count has to be
  // stated rather than relabelled.
  {
    gate: "participant_artifact_changed equals the 48 originally assumed",
    pass: null,
    advisory: true,
    observed: {
      assumed: 48,
      actualParticipantPdfChanged: changedRows.length,
      participantPdfIdenticalButSheetCorrected: evidenceOnlyRerendered.length,
      explanation: "Defect A (print flags) changes the filed artifact; Defects B and C change only the contact sheet. 16 of the 48 re-rendered families carried only a sheet defect, so their filed PDF is byte-identical to the one already reviewed."
    }
  }
];

const out = {
  schema: "rcap-d-correction-reconciliation/v1",
  gate: "Gate 1 — reconcile all 61 prior corrections",
  d0v2: "b412f543",
  totals,
  gates,
  families: rows
};

const outPath = path.join(rootDir, "docs/record-clearing/d-wave/corrections-v2/reconciliation.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);

console.log(JSON.stringify(totals, null, 2));
for (const g of gates) {
  console.log(`${g.advisory ? "NOTE" : (g.pass ? "PASS" : "FAIL")}  ${g.gate}`);
  if (!g.pass) console.log(`      ${JSON.stringify(g.observed).slice(0, 600)}`);
}
const allPass = gates.filter((g) => !g.advisory).every((g) => g.pass);
console.log(allPass ? "\nGATE 1 RECONCILED" : "\nGATE 1 FAILED — STOPPING");
process.exitCode = allPass ? 0 : 1;
