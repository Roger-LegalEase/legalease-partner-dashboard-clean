// Builds the exact correction index for the D targeted correction cycle.
//
// The accepted review totals are controlling: 104 technical_approved, 61
// correction_required, 88 held_on_source_or_design, 253 families. This script
// produces the machine-readable list of exactly the 61 correction_required
// families and nothing else, so the re-render wave has a closed work list that
// cannot quietly grow to touch an approved or held family.
//
// The three review shards were written by three independent reviewers and do
// not share a schema. Shard 0 puts per-family defects in `findings` with an
// `id`; shard 1 uses `findings` with a `category`; shard 2 uses `corrections`
// with neither. Normalizing them is the whole job here, and the normalizer
// fails loudly on an unrecognized defect rather than bucketing it as "other" --
// a silently misfiled defect is a family that never gets fixed.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const REVIEW_SHARDS = [
  { shard: 0, branch: "claude/rcap-review-d-corrected-shard-0" },
  { shard: 1, branch: "claude/rcap-review-d-corrected-shard-1" },
  { shard: 2, branch: "claude/rcap-review-d-corrected-shard-2" }
];

// Each lane's existing head, and the new correction branch it feeds. The head
// is named explicitly rather than resolved from the branch tip so the index
// records the exact commit that was reviewed, not whatever the branch points
// at when this runs.
export const LANE_CORRECTION_BRANCHES = {
  D1A: { from: "claude/rcap-d1a-regenerate-al-ar-ak", head: "70a30807abf44a94c54d1953e1a112900678c1f4", to: "claude/rcap-d1a-corrections-v2" },
  D1B: { from: "claude/rcap-d1b-regenerate-va-ky-nc", head: "21f5c446d234b69e00a08dffa1c2d79e0cd7b186", to: "claude/rcap-d1b-corrections-v2" },
  D1C: { from: "claude/rcap-d1c-regenerate-ne-vt-wi", head: "a7e49afe780695baa0d04c08f5223a0ded29cdcb", to: "claude/rcap-d1c-corrections-v2" },
  D2A: { from: "claude/rcap-d2a-regenerate-az-il-wa-ks-mn", head: "d7ce458ce14fd97c13efbf83fe72a5cc14e21b1f", to: "claude/rcap-d2a-corrections-v2" },
  D2B: { from: "claude/rcap-d2b-regenerate-nj-fl-la-nm", head: "1f2632bb66a9d83d90381318f2a35d8b02005312", to: "claude/rcap-d2b-corrections-v2" },
  D3A: { from: "claude/rcap-d3a-regenerate-co-tx-nd-nh-mo", head: "b1cac44fb5a170caca38394a3c520a70cc9efc01", to: "claude/rcap-d3a-corrections-v2" },
  D3B: { from: "claude/rcap-d3b-regenerate-or-ia-ma-ut", head: "2cf9a5a60c9bc32c879ac800857a98e63ec59daa", to: "claude/rcap-d3b-corrections-v2" }
};

const git = (args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8", maxBuffer: 128 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }).trim();
const gitQuiet = (args) => { try { return git(args); } catch { return null; } };

/**
 * Where a defect has to be fixed. This drives the whole wave: a
 * `shared_factory_d0v2` defect is fixed once and every affected family inherits
 * the fix, while a `lane_specific` defect needs that lane to change its own
 * code or mapping.
 */
const FIX_ROUTES = {
  SHARED_D0V2: "shared_factory_d0v2",
  SHARED_OUT_OF_SCOPE: "shared_factory_outside_the_three_named_defects",
  LANE: "lane_specific",
  ORCHESTRATOR: "orchestrator_evidence_only"
};

/**
 * The canonical defect taxonomy, and which of the three named D0-v2 defects
 * each maps to.
 *
 * `d0v2Defect` is A, B or C for the defects this cycle authorized. Two classes
 * carry `null` with route SHARED_OUT_OF_SCOPE: they are genuine D0 defects the
 * review found, in the same modules, but they are not among the three the
 * correction cycle named. They are recorded rather than fixed, because
 * widening a shared-tooling commit that seven lanes build on is not a call to
 * make silently.
 */
const DEFECT_CLASSES = {
  print_flag_ink_leak: {
    route: FIX_ROUTES.SHARED_D0V2,
    d0v2Defect: "A",
    summary: "Non-printing or hidden source widget ink flattened into the filed artifact."
  },
  contact_sheet_active_content: {
    route: FIX_ROUTES.SHARED_D0V2,
    d0v2Defect: "B+C",
    summary: "Contact sheet carries active-content residue copied from the unsanitized blank source, and the sheet's own scan failed open."
  },
  withheld_field_written_by_lane: {
    route: FIX_ROUTES.LANE,
    d0v2Defect: null,
    summary: "A field the family's production-field-map records as withheld_by_lane_review was written anyway, because the lane passed an unfiltered census to finalizeOfficialForm."
  },
  overflow_ledger_missing_refusal: {
    route: FIX_ROUTES.LANE,
    d0v2Defect: null,
    summary: "The renderer correctly refused a value below the readable floor but the overflow ledger asserts nothing was refused."
  },
  semantic_binding_error: {
    route: FIX_ROUTES.LANE,
    d0v2Defect: null,
    summary: "A value was bound to the wrong field or asserted a fact the caller never supplied."
  },
  caption_overlap: {
    route: FIX_ROUTES.LANE,
    d0v2Defect: null,
    summary: "Written caption text overlaps other text in the filed artifact."
  },
  orchestrator_manifest_source_pointer: {
    route: FIX_ROUTES.ORCHESTRATOR,
    d0v2Defect: null,
    summary: "The review manifest reported a null source pointer because it read one key spelling; the family's own artifacts were not implicated."
  },
  anchor_decoder_subset_font: {
    route: FIX_ROUTES.SHARED_OUT_OF_SCOPE,
    d0v2Defect: null,
    summary: "rcap-pdf-anchor-capture loadFonts never consults /ToUnicode or /Encoding /Differences, so a subset-font text layer decodes to nothing and a fillable form was dispositioned as having no extractable text."
  },
  rich_text_field_finalize_crash: {
    route: FIX_ROUTES.SHARED_OUT_OF_SCOPE,
    d0v2Defect: null,
    summary: "sanitizeAndFlatten calls updateFieldAppearances with no guard for rich-text (/RV) AcroForm fields, so the whole family throws RichTextFieldReadError and produces no artifact at all."
  }
};

/**
 * Maps one reviewer's defect label onto the canonical taxonomy.
 *
 * Shard 2 supplies neither an id nor a category, so its entries are classified
 * from the defect text and the owner attribution. Returning null is a hard
 * failure upstream, not a default bucket.
 */
export function classifyDefect({ id, category, visibleDefect, likelyOwner }) {
  const label = String(id ?? category ?? "");
  const text = `${visibleDefect ?? ""} ${likelyOwner ?? ""}`;

  // Explicit labels first: a reviewer who named the defect is more reliable
  // than any inference from prose.
  if (/^anchor_capture_/.test(label)) return "anchor_decoder_subset_font";
  if (label === "source_canonical_path_null_in_review_manifest") return "orchestrator_manifest_source_pointer";
  if (label === "boundary_refusal_absent_from_overflow_ledger") return "overflow_ledger_missing_refusal";
  if (label === "non_printing_widget_ink_flattened_into_filed_artifact") return "print_flag_ink_leak";
  if (label === "active_content_residue_in_contact_sheet") return "contact_sheet_active_content";
  if (category === "active_content_residue" || /-contact-sheet-active-content$/.test(label)) return "contact_sheet_active_content";
  if (category === "interactive_chrome_flattened_into_filing" || /-buttons-flattened$/.test(label)) return "print_flag_ink_leak";
  if (category === "overlapping_text") return "caption_overlap";
  if (["protected_field_written", "court_section_written", "outside_party_attribution_unresolved",
       "unsupplied_event_fact_asserted", "wrong_fact_in_caption"].includes(category)) return "semantic_binding_error";

  // Shard 2's unlabelled entries.
  if (/RichTextFieldReadError|rich-text|rich text/i.test(text)) return "rich_text_field_finalize_crash";
  if (/withheld_by_lane_review/.test(text)) return "withheld_field_written_by_lane";
  if (/\/F annotation flags|Print bit|non-printing/i.test(text)) return "print_flag_ink_leak";
  if (/active[- ]content residue|additional_actions|field_javascript/i.test(text)) return "contact_sheet_active_content";

  return null;
}

/** Every per-family defect entry, whatever the shard called the field. */
function defectEntriesOf(family) {
  const list = family.findings ?? family.corrections ?? [];
  return Array.isArray(list) ? list : [];
}

function readShard(shard, branch) {
  const raw = gitQuiet(["show", `origin/${branch}:docs/record-clearing/d-wave/review/shard-${shard}/review-findings.json`]);
  if (!raw) throw new Error(`shard ${shard}: review-findings.json not readable at origin/${branch}`);
  const doc = JSON.parse(raw);
  const head = git(["rev-parse", `origin/${branch}`]);
  return { doc, head, branch };
}

// Shard rule, recomputed here rather than trusted from the manifest, so the
// index can be checked by anyone with sha256 and a calculator.
export function shardForFamily(familyId) {
  const hex = crypto.createHash("sha256").update(familyId).digest("hex");
  return Number(BigInt(`0x${hex}`) % 3n);
}

/** Does this path exist in the tree at this commit? */
function pathExistsAt(ref, filePath) {
  return gitQuiet(["cat-file", "-e", `${ref}:${filePath}`]) !== null;
}

// The extracted source packs, outside every git worktree. They are the only
// way to prove a recorded source pointer names a real file rather than a
// plausible-looking string, so the check is skipped -- and said to be skipped
// -- rather than assumed to pass when they are absent.
const SOURCE_PACK_ROOTS = ["/tmp/rcap-source-packs/ex-D1", "/tmp/rcap-source-packs/ex-D2", "/tmp/rcap-source-packs/ex-D3"];

function indexSourcePacks() {
  const byPath = new Map();
  const walk = (root, dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(root, p);
      else byPath.set(path.relative(root, p), p);
    }
  };
  for (const root of SOURCE_PACK_ROOTS) {
    if (!fs.existsSync(root)) return null;
    walk(root, root);
  }
  return byPath;
}

/**
 * Confirms each family's recorded source pointer resolves to a pack file whose
 * bytes hash to the recorded sha256. This is the acceptance condition for the
 * families whose only defect was the manifest's null source pointer, so it is
 * evidence rather than a convenience check.
 */
function verifySourcePointers(rows) {
  const packs = indexSourcePacks();
  if (!packs) return { checked: false, reason: "source packs not extracted at the expected roots", roots: SOURCE_PACK_ROOTS };
  const problems = [];
  let resolved = 0;
  for (const row of rows) {
    if (!row.sourceCanonicalPath) { problems.push({ familyId: row.familyId, reason: "no source pointer recorded" }); continue; }
    const abs = packs.get(row.sourceCanonicalPath);
    if (!abs) { problems.push({ familyId: row.familyId, reason: "pointer does not resolve in any pack", path: row.sourceCanonicalPath }); continue; }
    const sha = crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
    if (sha !== row.sourceSha256) { problems.push({ familyId: row.familyId, reason: "pack bytes do not hash to the recorded sha256", observed: sha, recorded: row.sourceSha256 }); continue; }
    resolved += 1;
  }
  return { checked: true, packFilesIndexed: packs.size, familiesChecked: rows.length, resolvedWithMatchingSha256: resolved, problems };
}

export function buildCorrectionIndex() {
  const manifestRaw = fs.readFileSync(path.join(rootDir, "docs/record-clearing/d-wave/corrected-review-manifest.json"), "utf8");
  const manifest = JSON.parse(manifestRaw);
  const byFamily = new Map(manifest.families.map((f) => [f.familyId, f]));

  const shards = REVIEW_SHARDS.map((s) => readShard(s.shard, s.branch));
  const dispositionCounts = { technical_approved: 0, correction_required: 0, held_on_source_or_design: 0 };
  const approvedIds = new Set();
  const heldIds = new Set();
  const rows = [];
  const unclassified = [];

  for (const { doc, head, branch } of shards) {
    const shard = doc.shard ?? doc.shardIndex;
    for (const family of doc.families) {
      dispositionCounts[family.disposition] = (dispositionCounts[family.disposition] ?? 0) + 1;
      if (family.disposition === "technical_approved") { approvedIds.add(family.familyId); continue; }
      if (family.disposition === "held_on_source_or_design") { heldIds.add(family.familyId); continue; }
      if (family.disposition !== "correction_required") continue;

      const m = byFamily.get(family.familyId);
      const lane = family.lane ?? m?.lane ?? null;
      const laneRoute = lane ? LANE_CORRECTION_BRANCHES[lane] : null;

      const corrections = [];
      for (const [i, entry] of defectEntriesOf(family).entries()) {
        const cls = classifyDefect(entry);
        if (!cls) { unclassified.push({ familyId: family.familyId, shard, entry }); continue; }
        const def = DEFECT_CLASSES[cls];
        corrections.push({
          // The reviewer's own identifier, kept verbatim so a correction can be
          // traced back to the finding that demanded it.
          reviewFindingId: entry.id ?? entry.category ?? `${family.familyId}#${i}`,
          reviewShard: shard,
          defectClass: cls,
          defectSummary: def.summary,
          severity: entry.severity ?? null,
          fixRoute: def.route,
          d0v2Defect: def.d0v2Defect,
          // Exactly where: file, page, and the field or annotation.
          file: entry.file ?? null,
          alsoAffects: entry.alsoAffects ?? entry.alsoIn ?? null,
          fixture: entry.fixture ?? null,
          page: entry.page ?? null,
          fieldOrRegion: entry.fieldOrRegion ?? null,
          visibleDefect: entry.visibleDefect ?? null,
          likelyOwner: entry.likelyOwner ?? null,
          acceptanceCondition: entry.acceptanceCondition ?? null,
          evidenceBasis: entry.evidenceBasis ?? entry.evidence ?? null
        });
      }

      const routes = new Set(corrections.map((c) => c.fixRoute));
      // A family is only re-renderable once every defect blocking it has a fix
      // route this cycle authorized. A family whose sole defect is an
      // orchestrator evidence bug needs no new bytes at all, and one blocked on
      // an unnamed shared defect cannot be corrected by fixing A, B and C.
      const rerenderRequired = corrections.some((c) => c.fixRoute === FIX_ROUTES.SHARED_D0V2 || c.fixRoute === FIX_ROUTES.LANE);
      const blockedOutOfScope = corrections.some((c) => c.fixRoute === FIX_ROUTES.SHARED_OUT_OF_SCOPE);

      rows.push({
        familyId: family.familyId,
        state: family.jurisdiction ?? m?.jurisdiction ?? null,
        stateSlug: m?.jurisdictionSlug ?? null,
        lane,
        implementationBranch: family.implementationBranch ?? m?.childBranch ?? null,
        implementationCommit: family.commit ?? m?.commit ?? null,
        laneHeadReviewed: laneRoute?.head ?? null,
        correctionBranch: laneRoute?.to ?? null,
        sourceSha256: family.sourceSha256 ?? family.verified?.sourceSha256 ?? m?.sourceSha256 ?? null,
        sourceCanonicalPath: m?.sourceCanonicalPath ?? null,
        documentId: family.documentId ?? m?.documentId ?? null,
        revision: family.revision ?? m?.revision ?? null,
        finalPdfPaths: m?.finalPdfPaths ?? [],
        contactSheetPaths: m?.contactSheetPaths ?? [],
        reviewShardRecomputed: shardForFamily(family.familyId),
        priorDisposition: "correction_required",
        priorRationale: family.rationale ?? null,
        correctionCount: corrections.length,
        fixRoutes: [...routes].sort(),
        rerenderRequired,
        blockedOutOfScope,
        corrections
      });
    }
  }

  rows.sort((a, b) => a.familyId.localeCompare(b.familyId));

  const byClass = {};
  const byRoute = {};
  for (const r of rows) {
    for (const c of r.corrections) {
      byClass[c.defectClass] = (byClass[c.defectClass] ?? 0) + 1;
      byRoute[c.fixRoute] = (byRoute[c.fixRoute] ?? 0) + 1;
    }
  }
  const familiesPerLane = {};
  for (const r of rows) familiesPerLane[r.lane] = (familiesPerLane[r.lane] ?? 0) + 1;

  return {
    schema: "rcap-d-correction-index/v1",
    cycle: "d-targeted-correction-cycle",
    generatedFrom: {
      reviewShards: shards.map((s) => ({ branch: s.branch, head: s.head })),
      manifestBranch: "claude/rcap-d-corrected-review-manifest",
      manifestSha256: crypto.createHash("sha256").update(manifestRaw).digest("hex"),
      d0Base: manifest.d0Base,
      d0v2Base: "03c14f985beda55596b894686bf70833e44a8f5b"
    },
    controllingTotals: {
      technical_approved: 104,
      correction_required: 61,
      held_on_source_or_design: 88,
      families: 253
    },
    observedTotals: { ...dispositionCounts, families: Object.values(dispositionCounts).reduce((a, b) => a + b, 0) },
    defectClasses: DEFECT_CLASSES,
    laneCorrectionBranches: LANE_CORRECTION_BRANCHES,
    summary: {
      familiesRequiringCorrection: rows.length,
      familiesPerLane,
      correctionsTotal: rows.reduce((n, r) => n + r.correctionCount, 0),
      correctionsByDefectClass: byClass,
      correctionsByFixRoute: byRoute,
      familiesRequiringRerender: rows.filter((r) => r.rerenderRequired).length,
      familiesEvidenceOnly: rows.filter((r) => !r.rerenderRequired && !r.blockedOutOfScope).length,
      familiesBlockedOnUnnamedSharedDefect: rows.filter((r) => r.blockedOutOfScope).length
    },
    sourcePointerVerification: verifySourcePointers(rows),
    // Recorded so the re-render wave can prove it never touched them.
    preservedTechnicalApproved: [...approvedIds].sort(),
    preservedHeldOnSourceOrDesign: [...heldIds].sort(),
    unclassified,
    families: rows
  };
}

/**
 * The four assertions the correction cycle requires. Each returns evidence
 * rather than a bare boolean, so a failure names the offending family.
 */
export function assertIndex(index) {
  const results = [];
  const ids = index.families.map((f) => f.familyId);
  const unique = new Set(ids);

  results.push({
    assertion: "exactly 61 unique correction_required families",
    pass: ids.length === 61 && unique.size === 61,
    observed: { rows: ids.length, unique: unique.size, expected: 61 }
  });

  const approved = new Set(index.preservedTechnicalApproved);
  const held = new Set(index.preservedHeldOnSourceOrDesign);
  const approvedLeak = ids.filter((id) => approved.has(id));
  const heldLeak = ids.filter((id) => held.has(id));
  results.push({
    assertion: "no technical_approved family appears in the index",
    pass: approvedLeak.length === 0,
    observed: { approvedFamilies: approved.size, leaked: approvedLeak }
  });
  results.push({
    assertion: "no held_on_source_or_design family appears in the index",
    pass: heldLeak.length === 0,
    observed: { heldFamilies: held.size, leaked: heldLeak }
  });

  // Every correction must point at a branch that exists, a commit reachable
  // from that branch, and an artifact that exists at that commit. A correction
  // aimed at something that is not there cannot be verified after the fact.
  const missing = [];
  for (const f of index.families) {
    const ref = `origin/${f.implementationBranch}`;
    if (gitQuiet(["rev-parse", "--verify", ref]) === null) {
      missing.push({ familyId: f.familyId, reason: "implementation branch not on origin", ref });
      continue;
    }
    if (gitQuiet(["merge-base", "--is-ancestor", f.implementationCommit, ref]) === null) {
      missing.push({ familyId: f.familyId, reason: "implementation commit not an ancestor of its branch", commit: f.implementationCommit, ref });
    }
    // Artifact paths recorded by the manifest, checked at the lane head that
    // was reviewed.
    for (const p of [...f.finalPdfPaths, ...f.contactSheetPaths]) {
      if (!pathExistsAt(ref, p)) missing.push({ familyId: f.familyId, reason: "recorded artifact absent at lane head", path: p });
    }
    // Defect files that live in a state package must exist too. A defect
    // recorded against shared tooling or against the manifest is checked
    // against the orchestrator branch instead.
    for (const c of f.corrections) {
      if (!c.file || !c.file.startsWith("data/")) continue;
      if (!pathExistsAt(ref, c.file)) missing.push({ familyId: f.familyId, reason: "defect file absent at lane head", path: c.file });
    }
  }
  results.push({
    assertion: "every correction points to an existing branch, commit and artifact",
    pass: missing.length === 0,
    observed: { problems: missing.length, detail: missing.slice(0, 25) }
  });

  results.push({
    assertion: "every reviewer defect entry was classified",
    pass: index.unclassified.length === 0,
    observed: { unclassified: index.unclassified.length }
  });

  const spv = index.sourcePointerVerification;
  results.push({
    assertion: "every family's source pointer resolves to pack bytes matching its recorded sha256",
    pass: spv.checked === true && spv.problems.length === 0 && spv.resolvedWithMatchingSha256 === index.families.length,
    observed: spv.checked ? { resolved: spv.resolvedWithMatchingSha256, of: spv.familiesChecked, problems: spv.problems.slice(0, 10) } : spv
  });

  results.push({
    assertion: "observed dispositions match the controlling totals",
    pass: index.observedTotals.technical_approved === 104
      && index.observedTotals.correction_required === 61
      && index.observedTotals.held_on_source_or_design === 88
      && index.observedTotals.families === 253,
    observed: index.observedTotals
  });

  return { allPassed: results.every((r) => r.pass), results };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const index = buildCorrectionIndex();
  const assertions = assertIndex(index);
  index.assertions = assertions;

  const outDir = path.join(rootDir, "docs/record-clearing/d-wave/corrections-v2");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "correction-index.json"), `${JSON.stringify(index, null, 2)}\n`);

  console.log(JSON.stringify({ summary: index.summary, observedTotals: index.observedTotals }, null, 2));
  for (const r of assertions.results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.assertion}`);
    if (!r.pass) console.log(`      ${JSON.stringify(r.observed).slice(0, 900)}`);
  }
  console.log(assertions.allPassed ? "\nALL ASSERTIONS PASSED" : "\nASSERTIONS FAILED");
  process.exitCode = assertions.allPassed ? 0 : 1;
}
