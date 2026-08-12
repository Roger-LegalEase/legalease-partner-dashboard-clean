// Freezes the exact set of families the final remediation cycle may touch.
//
// Six groups were named for this cycle, and they overlap: the family blocked on
// the rich-text defect is also one of the five unresolved semantic defects, and
// most of the reopened approvals also carry a stale manifest. Counting the
// groups and adding them up would claim a larger blast radius than the work
// actually has, so every family is recorded once with the full set of reasons
// it is in scope, and the union is what bounds the cycle.
//
// Nothing here is taken from a prior summary's counts. Group membership is read
// out of the independent review artifacts and the captain handoff, and the
// rich-text group is derived by reading the source binaries.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PACK_ROOTS = ["/tmp/rcap-source-packs/ex-D1", "/tmp/rcap-source-packs/ex-D2", "/tmp/rcap-source-packs/ex-D3"];
const RICH_TEXT_FLAG = 1 << 25; // /Ff bit 26

const git = (args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).trim();
const gitQuiet = (args) => { try { return git(args); } catch { return null; } };
const readJsonAt = (ref, file) => { const raw = gitQuiet(["show", `${ref}:${file}`]); if (!raw) return null; try { return JSON.parse(raw); } catch { return null; } };

const handoff = JSON.parse(fs.readFileSync(path.join(rootDir, "docs/record-clearing/d-wave/corrections-v2/captain-handoff.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "docs/record-clearing/d-wave/corrected-review-manifest.json"), "utf8"));
const index = JSON.parse(fs.readFileSync(path.join(rootDir, "docs/record-clearing/d-wave/corrections-v2/correction-index.json"), "utf8"));
const byFamilyId = new Map(manifest.families.map((f) => [f.familyId, f]));

const evidenceReview = readJsonAt("origin/claude/rcap-review-d-approval-evidence-v2",
  "docs/record-clearing/d-wave/corrections-v2/review/approval-evidence/review-findings.json");
if (!evidenceReview) throw new Error("approval-evidence review not readable");

// --- the six groups, each read from evidence --------------------------------
const groups = {};

// 1. Prior approvals the independent evidence review reopened.
groups.reopened_approval = evidenceReview.families
  .filter((f) => (f.result ?? f.disposition) !== "prior_technical_approval_reaffirmed")
  .map((f) => ({ familyId: f.familyId, detail: (f.findings ?? []).join(" | ").slice(0, 300) }));

// 2. Families corrected after their first independent review had inspected
//    them. Their bytes are newer than the review that judged them.
groups.corrected_after_review = handoff.gate1.families
  .filter((f) => f.finalDisposition === "correction_required"
    && /corrected after independent review/.test(String(f.remainingBlocker)))
  .map((f) => ({ familyId: f.familyId, detail: f.remainingBlocker }));

// 3. Correction families still open on a defect nobody has fixed.
const correctedAfterIds = new Set(groups.corrected_after_review.map((f) => f.familyId));
groups.unresolved_semantic_defect = handoff.gate1.families
  .filter((f) => f.finalDisposition === "correction_required" && !correctedAfterIds.has(f.familyId))
  .map((f) => ({ familyId: f.familyId, detail: String(f.remainingBlocker).slice(0, 300) }));

// 4. Families the correction review moved to held on the anchor decoder.
groups.anchor_decoder_hold = handoff.gate1.families
  .filter((f) => f.finalDisposition === "held_on_source_or_design")
  .map((f) => ({ familyId: f.familyId, detail: String(f.remainingBlocker ?? "").slice(0, 300) }));

// 5. Families whose source actually carries a rich-text field. Derived from the
//    binaries: the defect is a property of the source, not of the disposition
//    that happened to expose it, and assuming a single family would miss any
//    other form that would throw the moment it was rendered.
const packIndex = new Map();
for (const root of PACK_ROOTS) {
  if (!fs.existsSync(root)) continue;
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p); else packIndex.set(path.relative(root, p), p);
  } };
  walk(root);
}
groups.rich_text_finalize = [];
if (packIndex.size === 0) {
  groups.rich_text_finalize_note = "source packs not extracted; rich-text group could not be derived";
} else {
  for (const family of manifest.families) {
    const abs = packIndex.get(family.sourceCanonicalPath ?? "");
    if (!abs) continue;
    let doc;
    try { doc = await PDFDocument.load(fs.readFileSync(abs), { ignoreEncryption: true, updateMetadata: false }); } catch { continue; }
    let fields;
    try { fields = doc.getForm().getFields(); } catch { continue; }
    const rich = [];
    for (const field of fields) {
      const dict = field.acroField.dict;
      const hasRV = dict.get(PDFName.of("RV")) !== undefined;
      const ffRaw = dict.get(PDFName.of("Ff"));
      const ff = typeof ffRaw?.asNumber === "function" ? ffRaw.asNumber() : 0;
      if (!hasRV && !(ff & RICH_TEXT_FLAG)) continue;
      let name = "(unnamed)";
      try { name = field.getName(); } catch { /* judged on flags regardless */ }
      rich.push(name);
    }
    if (rich.length > 0) {
      groups.rich_text_finalize.push({ familyId: family.familyId, detail: `rich-text fields: ${rich.join(", ")}` });
    }
  }
}

// 6. Families whose rendered-artifacts.json no longer describes a file that
//    exists. Evidence only -- no participant artifact is implicated.
groups.stale_rendered_artifact_manifest = evidenceReview.families
  .filter((f) => (f.findings ?? []).some((x) => /rendered-artifacts\.json still records/.test(String(x))))
  .map((f) => ({ familyId: f.familyId, detail: "rendered-artifacts.json records the pre-regeneration contact-sheet sha256" }));

// --- union, with every reason a family is in scope --------------------------
const union = new Map();
for (const [group, entries] of Object.entries(groups)) {
  if (!Array.isArray(entries)) continue;
  for (const e of entries) {
    if (!union.has(e.familyId)) {
      const m = byFamilyId.get(e.familyId);
      const laneRoute = m ? index.laneCorrectionBranches[m.lane] : null;
      union.set(e.familyId, {
        familyId: e.familyId,
        state: m?.jurisdiction ?? null, stateSlug: m?.jurisdictionSlug ?? null, lane: m?.lane ?? null,
        sourceSha256: m?.sourceSha256 ?? null, sourceCanonicalPath: m?.sourceCanonicalPath ?? null,
        v2Branch: laneRoute?.to ?? null,
        v2Commit: laneRoute ? gitQuiet(["rev-parse", `origin/${laneRoute.to}`]) : null,
        finalPdfPaths: m?.finalPdfPaths ?? [], contactSheetPaths: m?.contactSheetPaths ?? [],
        priorFinalCategory: handoff.gate4 ? null : null,
        groups: [], reasons: {}
      });
    }
    const row = union.get(e.familyId);
    row.groups.push(group);
    row.reasons[group] = e.detail;
  }
}

// What each family actually needs. A participant re-render is the heaviest
// action and is reserved for families whose filed bytes are wrong; a stale
// manifest needs no new artifact at all, and the instruction is explicit that a
// participant PDF must not change merely to make its manifest current.
const NEEDS_RERENDER = new Set(["reopened_approval", "unresolved_semantic_defect", "anchor_decoder_hold", "rich_text_finalize"]);
for (const row of union.values()) {
  const g = new Set(row.groups);
  row.requiresParticipantRerender = [...g].some((x) => NEEDS_RERENDER.has(x));
  row.requiresContactSheetOnly = !row.requiresParticipantRerender && g.has("corrected_after_review");
  row.requiresManifestRepairOnly = !row.requiresParticipantRerender && !row.requiresContactSheetOnly && g.has("stale_rendered_artifact_manifest");
  row.action = row.requiresParticipantRerender ? "rerender_participant_artifact_and_evidence"
    : (row.requiresContactSheetOnly ? "already_corrected_needs_independent_review_only"
      : "rendered_artifact_manifest_repair_only");
}

const rows = [...union.values()].sort((a, b) => a.familyId.localeCompare(b.familyId));
const overlaps = rows.filter((r) => r.groups.length > 1)
  .map((r) => ({ familyId: r.familyId, groups: r.groups }));

const groupCounts = Object.fromEntries(Object.entries(groups)
  .filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length]));
const sumOfGroups = Object.values(groupCounts).reduce((a, b) => a + b, 0);

const totals = {
  groupCounts,
  sumOfGroupMemberships: sumOfGroups,
  uniqueAffectedFamilies: rows.length,
  doubleCountedByNaiveAddition: sumOfGroups - rows.length,
  requiringParticipantRerender: rows.filter((r) => r.requiresParticipantRerender).length,
  alreadyCorrectedNeedingReviewOnly: rows.filter((r) => r.requiresContactSheetOnly).length,
  manifestRepairOnly: rows.filter((r) => r.requiresManifestRepairOnly).length,
  byLane: rows.reduce((a, r) => { a[r.lane] = (a[r.lane] ?? 0) + 1; return a; }, {})
};

const gates = [
  { gate: "the four reopened approvals are present", pass: groupCounts.reopened_approval === 4, observed: groupCounts.reopened_approval },
  { gate: "the seven corrected-after-review families are present", pass: groupCounts.corrected_after_review === 7, observed: groupCounts.corrected_after_review },
  { gate: "the five unresolved semantic defects are present", pass: groupCounts.unresolved_semantic_defect === 5, observed: groupCounts.unresolved_semantic_defect },
  { gate: "the four Washington anchor-decoder holds are present", pass: groupCounts.anchor_decoder_hold === 4, observed: groupCounts.anchor_decoder_hold },
  { gate: "all 84 stale manifests are present", pass: groupCounts.stale_rendered_artifact_manifest === 84, observed: groupCounts.stale_rendered_artifact_manifest },
  { gate: "the rich-text group was derived from the binaries, not assumed", pass: Array.isArray(groups.rich_text_finalize) && groups.rich_text_finalize.length > 0, observed: groupCounts.rich_text_finalize },
  { gate: "no family is counted twice in the union", pass: new Set(rows.map((r) => r.familyId)).size === rows.length, observed: rows.length },
  { gate: "every affected family resolves to a lane and a v2 branch", pass: rows.every((r) => r.lane && r.v2Branch), observed: rows.filter((r) => !r.lane || !r.v2Branch).map((r) => r.familyId) },
  { gate: "no family outside the 253 entered scope", pass: rows.every((r) => byFamilyId.has(r.familyId)), observed: rows.filter((r) => !byFamilyId.has(r.familyId)).map((r) => r.familyId) }
];

const out = {
  schema: "rcap-d-v3-affected-index/v1",
  cycle: "d-final-remediation",
  derivedFrom: {
    captainHandoff: { branch: "claude/rcap-d-corrected-review-manifest", commit: "d324b897" },
    approvalEvidenceReview: { branch: "claude/rcap-review-d-approval-evidence-v2", commit: gitQuiet(["rev-parse", "origin/claude/rcap-review-d-approval-evidence-v2"]) },
    d0v2: "b412f543"
  },
  totals, overlaps, gates,
  groupMembership: groupCounts,
  families: rows
};

const outDir = path.join(rootDir, "docs/record-clearing/d-wave/v3");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "affected-family-index.json"), `${JSON.stringify(out, null, 2)}\n`);

console.log(JSON.stringify(totals, null, 2));
console.log(`\noverlapping families (${overlaps.length}):`);
for (const o of overlaps) console.log(`   ${o.familyId.padEnd(42)} ${o.groups.join(" + ")}`);
for (const g of gates) {
  console.log(`${g.pass ? "PASS" : "FAIL"}  ${g.gate}`);
  if (!g.pass) console.log(`      ${JSON.stringify(g.observed).slice(0, 300)}`);
}
console.log(gates.every((g) => g.pass) ? "\nAFFECTED SET FROZEN" : "\nFAILED");
process.exitCode = gates.every((g) => g.pass) ? 0 : 1;
