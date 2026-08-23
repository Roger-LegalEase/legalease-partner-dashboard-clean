#!/usr/bin/env node
// The four-family correction freeze, and what Sessions 9 and 10 must bind to it.
//
//   node scripts/generate-rcap-nc-four-freeze-dispatch.mjs
//   node scripts/generate-rcap-nc-four-freeze-dispatch.mjs --check
//
// This freeze is narrow on purpose. Forty-eight families already hold current
// approvals over bytes nobody has touched, and re-freezing them would invite a
// re-review of work that is finished. So the freeze is derived from the last
// commit that changed one of the four corrected package paths — never from a
// captain HEAD, which moves every time coordination is recorded and would keep
// re-dating a freeze that has not actually moved.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const NC = "data/rcap-all50/overlays/production/north-carolina";
const FAMILIES = [
  { familyId: "NC:aoc-cr-287-form-es", dir: `${NC}/aoc-cr-287-form-es` },
  { familyId: "NC:aoc-cr-287-form-vi", dir: `${NC}/aoc-cr-287-form-vi` },
  { familyId: "NC:aoc-cr-288-form-es", dir: `${NC}/aoc-cr-288-form-es` },
  { familyId: "NC:aoc-cr-288-form-vi", dir: `${NC}/aoc-cr-288-form-vi` }
];
const ENGLISH = [`${NC}/aoc-cr-287-form-en`, `${NC}/aoc-cr-288-form-en`];
const ORIGINAL_FREEZE = "f34fe99d8760805eef219c4014664a87f6e90e50";
const CONSUMPTION = "data/rcap-all50/pdf-review-consumption.json";
const OUT = "data/rcap-all50/pdf-nc-four-freeze-dispatch.json";
const OUT_MD = "docs/record-clearing/pdf-nc-four-freeze-dispatch.md";

const abs = (p) => path.join(rootDir, p);
const readJson = (p) => JSON.parse(fs.readFileSync(abs(p), "utf8"));
const fail = (m) => { console.error(`FAIL nc-four freeze — ${m}`); process.exit(1); };
const sha256 = (p) => (fs.existsSync(abs(p))
  ? crypto.createHash("sha256").update(fs.readFileSync(abs(p))).digest("hex") : null);
const git = (...args) => execFileSync("git", args, { cwd: rootDir, maxBuffer: 1 << 28 }).toString().trim();

const freezeSha = git("log", "-1", "--format=%H", "--", ...FAMILIES.map((f) => f.dir));
if (!/^[0-9a-f]{40}$/.test(freezeSha)) fail("could not resolve the last commit that changed a corrected package");

// Exactly four packages may differ from the original freeze. Sidecars are
// evidence-owned and excluded; anything else is scope creep and fails here.
{
  const changed = git("diff", "--name-only", ORIGINAL_FREEZE, freezeSha, "--",
    "data/rcap-all50/overlays/production").split("\n").filter(Boolean);
  const outside = changed.filter((p) =>
    !FAMILIES.some((f) => p.startsWith(`${f.dir}/`)) && !p.endsWith("artifact-provenance.json"));
  if (outside.length) fail(`${outside.length} production path(s) outside the four corrected families changed: ${outside.slice(0, 4).join(", ")}`);
  const touched = new Set(changed.filter((p) => FAMILIES.some((f) => p.startsWith(`${f.dir}/`)))
    .map((p) => p.split("/").slice(0, 6).join("/")));
  if (touched.size !== 4) fail(`${touched.size} corrected package(s) changed; exactly four were authorised`);
  for (const dir of ENGLISH) {
    const moved = git("diff", "--name-only", ORIGINAL_FREEZE, freezeSha, "--", dir).split("\n").filter(Boolean);
    if (moved.length) fail(`${dir} moved ${moved.length} byte-path(s); the English filing family must not change`);
  }
}

const consumption = readJson(CONSUMPTION);
const approved = consumption.rows.filter((r) => r.verdict === "approved_platform_ready");
const drifted = approved.filter((r) => !r.pinsStillMatching);
if (drifted.length) fail(`${drifted.length} approved famil(ies) no longer match their reviewed bytes: ${drifted.slice(0, 3).map((r) => r.familyId).join(", ")}`);

const families = FAMILIES.map(({ familyId, dir }) => {
  if (!fs.existsSync(abs(dir))) fail(`${familyId}: ${dir} is not on disk`);
  const record = readJson(`${dir}/source-record.json`);
  const participantPdfs = ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf",
    "contact-sheet/blank-vs-filled.pdf"].filter((rel) => fs.existsSync(abs(`${dir}/${rel}`)));
  if (participantPdfs.length) fail(`${familyId} still carries ${participantPdfs.length} participant artifact(s)`);
  if (fs.existsSync(abs(`${dir}/artifact-provenance.json`))) {
    fail(`${familyId} still carries the sidecar that described its withdrawn artifacts`);
  }
  const bound = {};
  for (const rel of ["source-record.json", "field-census.json", "field-classification.json",
    "overlay-profile.json", "production-field-map.json"]) {
    const d = sha256(`${dir}/${rel}`);
    if (d) bound[rel] = d;
  }
  return {
    familyId, packagePath: dir,
    canonicalTerminalCategory: "reference_only",
    familyLocalDetail: record.implementationStatus ?? null,
    participantFillable: record.participantFillable ?? null,
    participantArtifacts: 0,
    contactSheets: 0,
    sourceSha256: record.sha256 ?? null,
    sourceByteLength: record.byteLength ?? null,
    canonicalBundlePath: record.canonicalBundlePath ?? null,
    boundHashes: bound
  };
});

const record = {
  schemaVersion: "rcap-pdf-nc-four-freeze-dispatch/v1",
  generatedBy: "scripts/generate-rcap-nc-four-freeze-dispatch.mjs",
  NC_FOUR_IMPLEMENTATION_FREEZE_SHA: freezeSha,
  derivedFrom: "the last commit that changed one of the four corrected package paths, never a captain coordination HEAD",
  originalFreeze: ORIGINAL_FREEZE,
  queues: { implementation: 0, targetedEvidence: 4, targetedReview: 4, unowned: 0, overlaps: 0 },
  approvedAndUntouched: {
    count: approved.length,
    everyPinStillMatches: true,
    rule: "the 48 are not re-frozen, re-evidenced or re-reviewed. Their approvals bind bytes nobody has touched, and re-freezing them would invite a re-review of finished work."
  },
  supersededForTheseFourOnly: {
    sidecars: "the previous four sidecars described participant artifacts that are now withdrawn. They are superseded by the corrected bytes and were removed from these packages; the other 48 sidecars remain current.",
    visualManifests: "the previous four visual manifests raster artifacts that no longer exist. Superseded by the corrected bytes; the other 48 remain current.",
    verdicts: "the four correction_required verdicts are satisfied by this closeout but remain historical review records. They are not rewritten — a verdict that gets edited after the fact is not a verdict.",
    historyKept: "no visual package or review record is deleted. Superseded is not the same as absent."
  },
  families,
  dispatch: {
    bothSessionsStartFrom: freezeSha,
    scope: "these four families only",
    session9: {
      produces: ["four current terminal provenance sidecars", "one four-family sidecar manifest"],
      mustNot: ["change any implementation byte", "touch any of the 48 approved families"]
    },
    session10: {
      produces: ["source-based terminal visual evidence"],
      mustShow: ["the official source notice present", "the official watermark present where applicable",
        "zero participant artifact", "zero stale participant-populated artifact",
        "the English filing-family bytes unchanged"],
      mustNot: ["raster withdrawn artifacts as if they were current",
        "change any implementation byte", "touch any of the 48 approved families"],
      historicalEvidence: "old artifact evidence may be retained as history, but the current terminal evidence has to prove absence, not re-render what was removed."
    },
    reviewer: { session: 2, status: "not_assigned",
      condition: "assigned only once both new four-family evidence commits exist, and then reviews exactly these four." }
  },
  promotionGate: {
    doNotRunInASourceEmptyEnvironment: true,
    why: "the gate compares each reviewed source SHA against the binary on disk. With no corpus mounted it refuses reviewed rows for want of a file rather than for any defect in the review.",
    measuredHere: "with the corpora mounted, 39 of the 48 approved families resolve their source binary and 9 carry no canonicalBundlePath at all. Mounting fixes the 39; the 9 need a recorded bundle path, which mounting cannot supply."
  }
};

const outputs = [[OUT, `${JSON.stringify(record, null, 2)}\n`]];
const md = ["# NC four-family correction freeze", "",
  `\`NC_FOUR_IMPLEMENTATION_FREEZE_SHA\`: \`${freezeSha}\``, "",
  "Four corrected reference-only translations. The 48 approved families are untouched and their approvals still bind their reviewed bytes.", "",
  "| family | participant artifacts | canonical category | family-local detail |", "| --- | --- | --- | --- |"];
for (const f of families) md.push(`| \`${f.familyId}\` | ${f.participantArtifacts} | ${f.canonicalTerminalCategory} | ${f.familyLocalDetail ?? "—"} |`);
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
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-nc-four-freeze-dispatch.mjs`);

console.log(`OK nc-four freeze — 4 corrected famil(ies) frozen at ${freezeSha.slice(0, 12)}; ${approved.length} approved famil(ies) untouched and still binding; queues implementation 0 / evidence 4 / review 4`);
