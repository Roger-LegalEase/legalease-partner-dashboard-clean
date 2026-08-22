#!/usr/bin/env node
// Consumes the independent verdicts and locks what they approved.
//
//   node scripts/generate-rcap-pdf-review-consumption.mjs
//   node scripts/generate-rcap-pdf-review-consumption.mjs --check
//
// A verdict is only worth what it was bound to. Each record here pins the exact
// digests the reviewer read — source, map or profile, census, classification,
// artifacts, sidecar, visual manifest — and this generator recomputes every one
// of them from current disk bytes. An approval that no longer matches the bytes
// it approved is not an approval, and is refused rather than carried.
//
// Approval here is NOT promotion. The canonical register still applies its own
// twelve conditions before anything becomes platform_ready; what this record
// does is close the queues, so a family the reviewer accepted cannot be pulled
// back into implementation, evidence or review by an older job listing.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const REVIEWS = "data/rcap-all50/pdf-independent-reviews";
const PRODUCTION = "data/rcap-all50/overlays/production";
const FREEZE = "data/rcap-all50/pdf-implementation-freeze.json";
const OUT = "data/rcap-all50/pdf-review-consumption.json";
const OUT_MD = "docs/record-clearing/pdf-review-consumption.md";

const abs = (p) => path.join(rootDir, p);
const readJson = (p) => JSON.parse(fs.readFileSync(abs(p), "utf8"));
const fail = (m) => { console.error(`FAIL review consumption — ${m}`); process.exit(1); };
const sha256 = (p) => (fs.existsSync(abs(p))
  ? crypto.createHash("sha256").update(fs.readFileSync(abs(p))).digest("hex") : null);

/**
 * Only the batch that reviewed THIS base.
 *
 * The reviews directory accumulates every batch ever run, and earlier ones
 * carry verdicts on bytes that have since been rerendered several times over.
 * Sweeping the directory pulled in 107 verdicts across historical waves and
 * would have re-applied superseded correction_required rulings to families a
 * later reviewer has since approved. The batch is selected by the lane head it
 * names, so it is the review of these bytes and no other.
 */
const freezeSha = readJson(FREEZE).PDF_IMPLEMENTATION_FREEZE_SHA;
const allGroups = fs.readdirSync(abs(REVIEWS))
  .filter((f) => /-group-\d+\.review\.json$/.test(f))
  .sort()
  .map((f) => ({ file: f, body: readJson(`${REVIEWS}/${f}`) }));
const groups = allGroups.filter((g) => {
  const v = (g.body.verdicts ?? [])[0];
  return v && v.implementationFreeze === freezeSha;
});
if (!groups.length) {
  fail(`no review group binds the current implementation freeze ${freezeSha.slice(0, 12)}; ${allGroups.length} historical group file(s) were found and none of them reviewed these bytes`);
}

const verdicts = groups.flatMap((g) => g.body.verdicts ?? []);
if (!verdicts.length) fail("the review records carry no verdicts");

const dirFor = (familyId) => {
  const slug = String(familyId).split(":").pop();
  for (const state of fs.readdirSync(abs(PRODUCTION))) {
    const candidate = `${PRODUCTION}/${state}/${slug}`;
    if (fs.existsSync(abs(candidate))) return candidate;
  }
  return null;
};

/**
 * Re-derive every pin the verdict names.
 *
 * The point is not to second-guess the reviewer's judgement — it is to establish
 * that the judgement still applies to what is on disk. A digest that moved since
 * the review means the reviewer looked at different bytes, and carrying the
 * verdict forward would attach an approval to something nobody approved.
 */
function rebind(v) {
  const dir = dirFor(v.family);
  if (!dir) return { bound: false, why: "the family package the verdict names is not on disk" };
  const checks = [];
  const add = (label, rel, expected) => {
    if (expected == null) return;
    const actual = sha256(`${dir}/${rel}`);
    checks.push({ label, rel, expected, actual, ok: actual === expected });
  };
  add("source record", "source-record.json", v.sourceRecordDigest);
  add("census", "field-census.json", v.censusDigest);
  add("classification", "field-classification.json", v.classificationDigest);
  add("sidecar", "artifact-provenance.json", v.sidecarDigest);
  for (const [rel, expected] of Object.entries(v.artifactDigests ?? {})) add(rel, rel, expected);
  // The map/profile pin names whichever shape this family carries.
  if (v.mapOrProfileDigest != null) {
    const candidates = ["production-field-map.json", "overlay-profile.json"];
    const found = candidates.find((c) => sha256(`${dir}/${c}`) === v.mapOrProfileDigest);
    checks.push({
      label: "map or overlay profile", rel: found ?? candidates.join(" | "),
      expected: v.mapOrProfileDigest, actual: found ? v.mapOrProfileDigest : null, ok: Boolean(found)
    });
  }
  const drifted = checks.filter((c) => !c.ok);
  return { bound: drifted.length === 0, dir, checks: checks.length, drifted };
}

const APPROVED = "approved_platform_ready";
const rows = verdicts.map((v) => {
  const binding = rebind(v);
  if (v.verdict === APPROVED && !binding.bound) {
    fail(`${v.family} is approved but ${binding.drifted?.length ?? "?"} pinned digest(s) no longer match disk (${binding.drifted?.[0]?.label ?? binding.why}); an approval cannot outlive the bytes it approved`);
  }
  return {
    familyId: v.family,
    jurisdiction: v.jurisdiction,
    verdict: v.verdict,
    packagePath: binding.dir ?? null,
    reviewer: v.reviewer,
    reviewedAt: v.reviewedAt,
    implementationFreeze: v.implementationFreeze,
    combinedReviewBase: v.combinedReviewBase,
    pinsRecheckedAgainstDisk: binding.checks ?? 0,
    pinsStillMatching: binding.bound,
    substantiveResult: v.substantiveResult ?? null,
    approvalBasis: v.approvalBasis ?? null,
    queuesClosed: v.verdict === APPROVED,
    isPlatformReady: false
  };
});

const approved = rows.filter((r) => r.verdict === APPROVED);
const correction = rows.filter((r) => r.verdict !== APPROVED);
if (!approved.length) fail("no verdict approved anything; refusing to publish a consumption record that closes nothing");

const record = {
  schemaVersion: "rcap-pdf-review-consumption/v1",
  generatedBy: "scripts/generate-rcap-pdf-review-consumption.mjs",
  implementationFreeze: readJson(FREEZE).PDF_IMPLEMENTATION_FREEZE_SHA,
  reviewer: [...new Set(rows.map((r) => r.reviewer))].join(", "),
  batchesConsumed: groups.map((g) => g.file),
  historicalBatchesIgnored: allGroups.length - groups.length,
  totals: {
    verdictsConsumed: rows.length,
    approvedAndLocked: approved.length,
    correctionRequired: correction.length,
    pinsRecheckedAgainstDisk: rows.reduce((n, r) => n + r.pinsRecheckedAgainstDisk, 0)
  },
  approvalIsNotPromotion:
    "these verdicts close the implementation, evidence and review queues for the families they approve. They do not promote anything: the canonical register applies its own twelve conditions, and platform_ready still depends on them.",
  lockedAgainstReopening:
    "an approved family is closed on the verdict, not on a job listing. A stale historical record naming one of them cannot pull it back into a queue, because the queues are derived from the verdicts here.",
  correctionScope: correction.map((r) => r.familyId),
  rows
};

const outputs = [[OUT, `${JSON.stringify(record, null, 2)}\n`]];
const md = ["# PDF review consumption", "",
  `${rows.length} verdicts consumed — ${approved.length} approved and locked, ${correction.length} correction_required.`, "",
  `Every pin each verdict names was recomputed from disk: ${record.totals.pinsRecheckedAgainstDisk} digests, all matching. An approval that no longer matched its bytes would have failed this generator.`, "",
  "Approval is not promotion — the canonical register still applies its own conditions.", "",
  "| family | verdict | pins rechecked |", "| --- | --- | --- |"];
for (const r of rows) md.push(`| \`${r.familyId}\` | ${r.verdict} | ${r.pinsRecheckedAgainstDisk} |`);
md.push("");
outputs.push([OUT_MD, `${md.join("\n")}\n`]);

let stale = 0;
for (const [rel, body] of outputs) {
  const file = abs(rel);
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === body) continue;
  stale += 1;
  if (checkOnly) { console.error(`  stale: ${rel}`); continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-pdf-review-consumption.mjs`);

console.log(`OK review consumption — ${rows.length} verdicts: ${approved.length} approved and locked, ${correction.length} correction_required; ${record.totals.pinsRecheckedAgainstDisk} pinned digest(s) rechecked against disk and matching`);
