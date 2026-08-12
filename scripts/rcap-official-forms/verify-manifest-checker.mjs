// Mutation-tests the rendered-artifact manifest checker.
//
// The checker's whole job is to notice when a manifest and its files disagree.
// A checker nobody has watched fail is a checker that might notice nothing, so
// each way they can disagree is introduced deliberately, in a scratch copy, and
// the checker must catch it. The fourth case is the one that matters most: a
// result fabricated to look clean must not survive, or the manifest becomes a
// place to write reassuring things.
//
// Usage: node verify-manifest-checker.mjs <worktreeToSampleFrom>
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { auditManifests } from "./repair-rendered-artifact-manifests.mjs";

const source = process.argv[2];
if (!source) { console.error("usage: verify-manifest-checker.mjs <worktree>"); process.exit(2); }

const PRODUCTION = "data/rcap-all50/overlays/production";
const failures = [];
const checks = [];
const assert = (ok, msg, detail) => { checks.push({ ok, msg, detail }); if (!ok) failures.push(msg); };

// A scratch copy of one real family, so the mutations run against a manifest
// the pipeline actually produced rather than one written for the test.
function sampleFamily() {
  const productionDir = path.join(source, PRODUCTION);
  for (const state of fs.readdirSync(productionDir, { withFileTypes: true })) {
    if (!state.isDirectory()) continue;
    for (const family of fs.readdirSync(path.join(productionDir, state.name), { withFileTypes: true })) {
      if (!family.isDirectory()) continue;
      const dir = path.join(productionDir, state.name, family.name);
      const manifestPath = path.join(dir, "reports/rendered-artifacts.json");
      if (!fs.existsSync(manifestPath)) continue;
      let m;
      try { m = JSON.parse(fs.readFileSync(manifestPath, "utf8")); } catch { continue; }
      const arts = Object.keys(m.artifacts ?? {});
      const hasSheet = arts.some((a) => a.startsWith("contact-sheet/"));
      const hasPdf = arts.some((a) => a.startsWith("fixtures/"));
      if (hasSheet && hasPdf && arts.every((a) => fs.existsSync(path.join(dir, a)))) {
        return { state: state.name, family: family.name, dir, manifestPath, artifacts: arts };
      }
    }
  }
  return null;
}

const sample = sampleFamily();
if (!sample) { console.log("verify-manifest-checker: no complete family to sample — skipped"); process.exit(0); }

function freshCopy() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-manifest-mutation-"));
  const dest = path.join(root, PRODUCTION, sample.state, sample.family);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(sample.dir, dest, { recursive: true });
  return { root, dest };
}

const clean = freshCopy();
const baseline = auditManifests(clean.root);
assert(baseline.totals.withProblems === 0,
  "an untouched family passes, so a later failure is the mutation and not the fixture",
  baseline.totals);

// M1 — a stale participant-PDF hash.
{
  const { root, dest } = freshCopy();
  const manifestPath = path.join(dest, "reports/rendered-artifacts.json");
  const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const target = sample.artifacts.find((a) => a.startsWith("fixtures/"));
  m.artifacts[target].sha256 = crypto.createHash("sha256").update("not the file").digest("hex");
  fs.writeFileSync(manifestPath, JSON.stringify(m, null, 2));
  const r = auditManifests(root);
  assert(r.totals.problemsByKind.recorded_hash_does_not_match_the_file >= 1,
    "M1: a stale participant-PDF hash is caught", r.totals.problemsByKind);
  fs.rmSync(root, { recursive: true, force: true });
}

// M2 — a stale contact-sheet hash, which is the defect this cycle actually hit.
{
  const { root, dest } = freshCopy();
  const manifestPath = path.join(dest, "reports/rendered-artifacts.json");
  const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const target = sample.artifacts.find((a) => a.startsWith("contact-sheet/"));
  m.artifacts[target].sha256 = crypto.createHash("sha256").update("the pre-regeneration sheet").digest("hex");
  fs.writeFileSync(manifestPath, JSON.stringify(m, null, 2));
  const r = auditManifests(root);
  assert(r.totals.problemsByKind.recorded_hash_does_not_match_the_file >= 1,
    "M2: a stale contact-sheet hash is caught", r.totals.problemsByKind);
  // And repairing it makes the manifest agree again.
  auditManifests(root, { repair: true });
  assert(auditManifests(root).totals.withProblems === 0, "M2: repair brings the manifest back into agreement");
  fs.rmSync(root, { recursive: true, force: true });
}

// M3 — an artifact the manifest names that is not on disk.
{
  const { root, dest } = freshCopy();
  const target = sample.artifacts.find((a) => a.startsWith("contact-sheet/"));
  fs.rmSync(path.join(dest, target));
  const r = auditManifests(root);
  assert(r.totals.problemsByKind.recorded_path_does_not_exist >= 1,
    "M3: a recorded artifact that does not exist is caught", r.totals.problemsByKind);
  fs.rmSync(root, { recursive: true, force: true });
}

// M4 — a fabricated clean result: the manifest is emptied so it has nothing to
// disagree with. An artifact sitting on disk that no manifest mentions must
// still be reported, or "clean" becomes a thing you can write rather than earn.
{
  const { root, dest } = freshCopy();
  const manifestPath = path.join(dest, "reports/rendered-artifacts.json");
  const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  m.artifacts = {};
  m.allArtifactsVerified = true;
  m.note = "everything is fine";
  fs.writeFileSync(manifestPath, JSON.stringify(m, null, 2));
  const r = auditManifests(root);
  assert(r.totals.problemsByKind.artifact_on_disk_not_recorded >= 1,
    "M4: emptying the manifest does not make it clean; the unrecorded artifacts are reported",
    r.totals.problemsByKind);
  assert(r.totals.withProblems === 1, "M4: and the family is counted as having a problem");
  fs.rmSync(root, { recursive: true, force: true });
}

// Check mode must not write. A check that repairs what it finds can never fail.
{
  const { root, dest } = freshCopy();
  const manifestPath = path.join(dest, "reports/rendered-artifacts.json");
  const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const target = sample.artifacts.find((a) => a.startsWith("fixtures/"));
  m.artifacts[target].sha256 = "deadbeef";
  const written = `${JSON.stringify(m, null, 2)}\n`;
  fs.writeFileSync(manifestPath, written);
  auditManifests(root);              // check mode
  assert(fs.readFileSync(manifestPath, "utf8") === written,
    "check mode leaves the manifest exactly as it found it");
  fs.rmSync(root, { recursive: true, force: true });
}

fs.rmSync(clean.root, { recursive: true, force: true });

console.log(`sampled ${sample.state}/${sample.family} (${sample.artifacts.length} artifacts)`);
for (const c of checks) console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.msg}`);
if (failures.length > 0) {
  console.error("\nverify-manifest-checker FAILED");
  process.exit(1);
}
console.log(`\nverify-manifest-checker passed: ${checks.length} checks across 4 mutations.`);
