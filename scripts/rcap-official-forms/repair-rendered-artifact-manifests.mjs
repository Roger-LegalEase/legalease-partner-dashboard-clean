// Brings every rendered-artifacts.json back into agreement with the files it
// describes.
//
// Regenerating the approval evidence rewrote 84 contact sheets and left their
// manifests recording the hash of a file that no longer exists anywhere on the
// branch. Independent review caught it. A manifest that names a hash nothing
// matches is worse than no manifest: it looks like provenance and is not.
//
// Two modes, and the distinction is the point:
//
//   check    reads and reports, writes nothing. Safe to run anywhere, and the
//            only mode a verifier should use, because a check that repairs
//            what it finds can never fail.
//   repair   rewrites each manifest from the bytes actually on disk.
//
// A participant PDF is never touched in either mode. The manifest follows the
// artifact; the artifact never follows the manifest.
//
// Usage: node repair-rendered-artifact-manifests.mjs <worktree> [--repair]
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const [worktree, ...flags] = process.argv.slice(2);
const REPAIR = flags.includes("--repair");
const PRODUCTION = "data/rcap-all50/overlays/production";
const MANIFEST = "reports/rendered-artifacts.json";

const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");

export function auditManifests(root, { repair = false } = {}) {
  const productionDir = path.join(root, PRODUCTION);
  if (!fs.existsSync(productionDir)) return { families: [], totals: { familiesWithManifest: 0 } };

  const rows = [];
  for (const state of fs.readdirSync(productionDir, { withFileTypes: true })) {
    if (!state.isDirectory()) continue;
    const stateDir = path.join(productionDir, state.name);
    for (const family of fs.readdirSync(stateDir, { withFileTypes: true })) {
      if (!family.isDirectory()) continue;
      const familyDir = path.join(stateDir, family.name);
      const manifestPath = path.join(familyDir, MANIFEST);
      if (!fs.existsSync(manifestPath)) continue;

      let manifest;
      try { manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")); }
      catch { rows.push({ familyId: `${state.name}/${family.name}`, unreadable: true }); continue; }

      const recorded = manifest.artifacts ?? {};
      const problems = [];
      const repaired = {};

      for (const [rel, entry] of Object.entries(recorded)) {
        const abs = path.join(familyDir, rel);
        if (!fs.existsSync(abs)) {
          // The manifest names a file that is not there. Recording it as
          // missing is the whole point; silently dropping it would hide the
          // discrepancy the manifest exists to expose.
          problems.push({ artifact: rel, problem: "recorded_path_does_not_exist" });
          continue;
        }
        const bytes = fs.readFileSync(abs);
        const actual = sha(bytes);
        if (actual !== entry.sha256) {
          problems.push({ artifact: rel, problem: "recorded_hash_does_not_match_the_file",
            recorded: entry.sha256?.slice(0, 16) ?? null, actual: actual.slice(0, 16) });
        }
        repaired[rel] = { sha256: actual, bytes: bytes.length };
      }

      // An artifact on disk that the manifest never mentions is the same class
      // of defect from the other direction.
      for (const sub of ["fixtures", "contact-sheet"]) {
        const dir = path.join(familyDir, sub);
        if (!fs.existsSync(dir)) continue;
        for (const name of fs.readdirSync(dir)) {
          if (!name.endsWith(".pdf")) continue;
          const rel = `${sub}/${name}`;
          if (Object.hasOwn(recorded, rel)) continue;
          const bytes = fs.readFileSync(path.join(dir, name));
          problems.push({ artifact: rel, problem: "artifact_on_disk_not_recorded" });
          repaired[rel] = { sha256: sha(bytes), bytes: bytes.length };
        }
      }

      const row = {
        familyId: `${state.name}/${family.name}`,
        recordedArtifacts: Object.keys(recorded).length,
        problems,
        clean: problems.length === 0
      };

      if (repair && problems.length > 0) {
        fs.writeFileSync(manifestPath, `${JSON.stringify({
          ...manifest,
          // Ordered so a reader sees what changed and why without a diff.
          artifacts: repaired,
          manifestRepairedFrom: "the bytes on disk after the D final remediation cycle; no participant artifact was re-rendered to make a manifest current"
        }, null, 2)}\n`);
        row.repaired = true;
      }
      rows.push(row);
    }
  }

  const totals = {
    familiesWithManifest: rows.length,
    clean: rows.filter((r) => r.clean).length,
    withProblems: rows.filter((r) => !r.clean && !r.unreadable).length,
    unreadable: rows.filter((r) => r.unreadable).length,
    repaired: rows.filter((r) => r.repaired).length,
    problemsByKind: rows.flatMap((r) => r.problems ?? []).reduce((a, p) => {
      a[p.problem] = (a[p.problem] ?? 0) + 1; return a;
    }, {})
  };
  return { families: rows, totals };
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith("repair-rendered-artifact-manifests.mjs")) {
  if (!worktree) { console.error("usage: repair-rendered-artifact-manifests.mjs <worktree> [--repair]"); process.exit(2); }
  const result = auditManifests(worktree, { repair: REPAIR });
  console.log(JSON.stringify({ mode: REPAIR ? "repair" : "check", ...result.totals }, null, 2));
  for (const r of result.families.filter((x) => !x.clean).slice(0, 12)) {
    console.log(`  ${r.familyId}`);
    for (const p of (r.problems ?? []).slice(0, 4)) console.log(`      ${p.problem} ${p.artifact}`);
  }
  // In check mode a discrepancy is a failure; in repair mode the work is the
  // point, so the exit code reports whether anything still disagrees.
  const after = REPAIR ? auditManifests(worktree, { repair: false }) : result;
  const bad = after.families.filter((r) => !r.clean).length;
  console.log(bad === 0 ? "\nEVERY MANIFEST AGREES WITH ITS FILES" : `\n${bad} MANIFEST(S) STILL DISAGREE`);
  process.exitCode = bad === 0 ? 0 : 1;
}
