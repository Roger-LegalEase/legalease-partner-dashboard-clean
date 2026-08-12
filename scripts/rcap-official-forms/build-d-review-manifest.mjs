// Builds the D-wave corrected-family review manifest from the seven lane
// branches.
//
// The orchestrator does not recreate any child's work and does not merge the
// lane branches. It reads each branch's committed state directories directly
// out of git, so the manifest describes exactly what was pushed rather than a
// working tree anyone could have touched since.
//
// Every family lands in one of three review shards by sha256(familyId) mod 3,
// which is stable, reproducible by the reviewers themselves, and independent of
// the order lanes happened to finish in.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const D0_BASE = "03c14f985beda55596b894686bf70833e44a8f5b";

export const LANES = [
  { lane: "D1A", branch: "claude/rcap-d1a-regenerate-al-ar-ak", pack: "D1", states: { AL: "alabama", AR: "arkansas", AK: "alaska" } },
  { lane: "D1B", branch: "claude/rcap-d1b-regenerate-va-ky-nc", pack: "D1", states: { VA: "virginia", KY: "kentucky", NC: "north-carolina" } },
  { lane: "D1C", branch: "claude/rcap-d1c-regenerate-ne-vt-wi", pack: "D1", states: { NE: "nebraska", VT: "vermont", WI: "wisconsin" } },
  { lane: "D2A", branch: "claude/rcap-d2a-regenerate-az-il-wa-ks-mn", pack: "D2", states: { AZ: "arizona", IL: "illinois", WA: "washington", KS: "kansas", MN: "minnesota" } },
  { lane: "D2B", branch: "claude/rcap-d2b-regenerate-nj-fl-la-nm", pack: "D2", states: { NJ: "new-jersey", FL: "florida", LA: "louisiana", NM: "new-mexico" } },
  { lane: "D3A", branch: "claude/rcap-d3a-regenerate-co-tx-nd-nh-mo", pack: "D3", states: { CO: "colorado", TX: "texas", ND: "north-dakota", NH: "new-hampshire", MO: "missouri" } },
  { lane: "D3B", branch: "claude/rcap-d3b-regenerate-or-ia-ma-ut", pack: "D3", states: { OR: "oregon", IA: "iowa", MA: "massachusetts", UT: "utah" } }
];

const PRODUCTION = "data/rcap-all50/overlays/production";

const git = (args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }).trim();
const gitQuiet = (args) => { try { return git(args); } catch { return null; } };

/** Every path committed under one state directory on one branch. */
function filesUnder(ref, dir) {
  const out = gitQuiet(["ls-tree", "-r", "--name-only", ref, `${dir}/`]);
  return out ? out.split("\n").filter(Boolean) : [];
}

function readJsonAt(ref, filePath) {
  const raw = gitQuiet(["show", `${ref}:${filePath}`]);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/**
 * A hold is only recorded when the family's own evidence says so. Absence of a
 * hold field is reported as "unrecorded" rather than silently as "none" --
 * those are different claims, and only one of them is safe to act on.
 */
function holdsOf(record) {
  if (!record) return { currentness: "unrecorded", legalDesign: "unrecorded", productionHolds: [] };
  const holds = Array.isArray(record.productionHolds) ? record.productionHolds : [];
  const freshness = record.freshnessStatus ?? record.freshness_status ?? null;
  const currentness = record.currentnessHold ?? (freshness && freshness !== "candidate_current_source" ? freshness : null);
  const legalDesign = record.legalDesignHold
    ?? (holds.find((h) => /legal[-_ ]?design|legal[-_ ]?review|counsel/i.test(h)) ?? null);
  return {
    currentness: currentness ?? (freshness ? "none_recorded_source_reports_current" : "unrecorded"),
    legalDesign: legalDesign ?? "unrecorded",
    productionHolds: holds
  };
}

/** What a reviewer has to do with this family. */
function reviewTypeOf(record, hasFinalPdf, hasSheet) {
  if (record?.notForFilingNotice) return "non_filing_hold_confirmation";
  if (!hasFinalPdf) return "no_fill_disposition_review";
  if (!hasSheet) return "finalized_artifact_review_without_contact_sheet";
  return "full_visual_and_safety_review";
}

// Shard over the full digest, so a reviewer recomputing
// `sha256(familyId) % 3` by hand lands on the same shard. Exactly one shard
// rule exists here on purpose: a second one would eventually be used by
// mistake.
export function shardForFamily(familyId) {
  const hex = crypto.createHash("sha256").update(familyId).digest("hex");
  return Number(BigInt(`0x${hex}`) % 3n);
}

export function buildManifest() {
  const families = [];
  const laneStatus = [];

  for (const laneDef of LANES) {
    const ref = `origin/${laneDef.branch}`;
    const head = gitQuiet(["rev-parse", "--verify", ref]);
    if (!head) {
      laneStatus.push({ ...laneDef, pushed: false, head: null, commits: 0, families: 0,
        note: "branch not pushed at manifest time" });
      continue;
    }
    const baseOk = gitQuiet(["merge-base", "--is-ancestor", D0_BASE, ref]) !== null;
    const commits = Number(gitQuiet(["rev-list", "--count", `${D0_BASE}..${ref}`]) ?? 0);
    let laneFamilies = 0;

    for (const [code, slug] of Object.entries(laneDef.states)) {
      const stateDir = `${PRODUCTION}/${slug}`;
      const files = filesUnder(ref, stateDir);
      if (files.length === 0) continue;

      // A family is any directory holding a source-record.json.
      const familyDirs = [...new Set(files
        .filter((f) => f.endsWith("/source-record.json"))
        .map((f) => path.dirname(f)))];

      for (const dir of familyDirs) {
        const familySlug = path.basename(dir);
        const familyId = `${code}:${familySlug}`;
        const record = readJsonAt(ref, `${dir}/source-record.json`);
        const inDir = files.filter((f) => f.startsWith(`${dir}/`));

        const finalPdfs = inDir.filter((f) => /fixtures\/(canonical|boundary)-filled\.pdf$/.test(f));
        const sheets = inDir.filter((f) => /contact-sheet\/.*\.pdf$/.test(f));
        const proof = readJsonAt(ref, `${dir}/contact-sheet/contact-sheet-proof.json`);
        const scan = readJsonAt(ref, `${dir}/reports/protected-fields-scan.json`);

        // The commit that last touched this family on its lane branch, so a
        // correction can name an exact commit rather than a branch head that
        // will have moved.
        const commit = gitQuiet(["log", "-1", "--format=%H", ref, "--", dir]);

        families.push({
          familyId,
          familySlug,
          jurisdiction: code,
          jurisdictionSlug: slug,
          lane: laneDef.lane,
          childBranch: laneDef.branch,
          commit,
          sourceSha256: record?.sha256 ?? null,
          sourceCanonicalPath: record?.canonicalBundlePath ?? null,
          documentId: record?.documentId ?? null,
          revision: record?.revision ?? null,
          structuralClass: record?.structuralClassObserved ?? null,
          documentOwnership: record?.documentOwnership ?? null,
          implementationStatus: record?.implementationStatus ?? null,
          nonFilingNotice: record?.notForFilingNotice ?? null,
          finalPdfPaths: finalPdfs,
          contactSheetPaths: sheets,
          contactSheetProof: proof
            ? { allExpectedValuesVisible: proof.allExpectedValuesVisible ?? null,
                panelsDiffer: proof.panelsDiffer ?? null,
                finalizedSha256: proof.finalizedSha256 ?? null }
            : null,
          protectedFieldScanPass: scan?.pass ?? null,
          activeContentResidue: scan?.activeContentResidue ?? null,
          ...holdsOf(record),
          requiredReviewType: reviewTypeOf(record, finalPdfs.length > 0, sheets.length > 0),
          reviewShard: shardForFamily(familyId)
        });
        laneFamilies += 1;
      }
    }

    laneStatus.push({ ...laneDef, pushed: true, head, baseIsD0Ancestor: baseOk, commits, families: laneFamilies });
  }

  families.sort((a, b) => a.familyId.localeCompare(b.familyId));
  const shardCounts = [0, 1, 2].map((s) => families.filter((f) => f.reviewShard === s).length);

  return {
    schema: "rcap-d-corrected-review-manifest/v1",
    d0Base: D0_BASE,
    sourceRelease: { tag: "rcap-d-source-packs-2026-08-12", id: 369314157 },
    shardRule: "sha256(familyId) mod 3, over the full hex digest",
    lanes: laneStatus,
    totals: {
      lanesPushed: laneStatus.filter((l) => l.pushed).length,
      families: families.length,
      withFinalizedPdf: families.filter((f) => f.finalPdfPaths.length > 0).length,
      withContactSheet: families.filter((f) => f.contactSheetPaths.length > 0).length,
      nonFilingHeld: families.filter((f) => f.nonFilingNotice).length,
      shardCounts
    },
    families
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = buildManifest();
  const outPath = path.join(rootDir, "docs/record-clearing/d-wave/corrected-review-manifest.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest.totals, null, 2));
  console.log(`written: ${path.relative(rootDir, outPath)}`);
}
