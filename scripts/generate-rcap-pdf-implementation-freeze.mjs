#!/usr/bin/env node
// The implementation freeze: what Sessions 9 and 10 must bind their evidence to.
//
//   node scripts/generate-rcap-pdf-implementation-freeze.mjs
//   node scripts/generate-rcap-pdf-implementation-freeze.mjs --check
//
// Evidence is only worth anything if it names the exact bytes it describes. A
// sidecar or a raster pinned to "the current tree" silently goes stale the next
// time anything is rerendered, and nobody can tell afterwards whether it was
// ever true. So every implementation-complete family is recorded here with the
// digest of each artefact an evidence session will read, taken from disk.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const WORKVIEW = "data/rcap-all50/pdf-finish-workview.json";
const OUT = "data/rcap-all50/pdf-implementation-freeze.json";
const OUT_MD = "docs/record-clearing/pdf-implementation-freeze.md";

const abs = (p) => path.join(rootDir, p);
const fail = (m) => { console.error(`FAIL implementation freeze — ${m}`); process.exit(1); };
const sha256 = (p) => (fs.existsSync(abs(p))
  ? crypto.createHash("sha256").update(fs.readFileSync(abs(p))).digest("hex") : null);

const workview = JSON.parse(fs.readFileSync(abs(WORKVIEW), "utf8"));
if (workview.queues.IMPLEMENTATION_QUEUE !== 0) {
  fail(`${workview.queues.IMPLEMENTATION_QUEUE} famil(ies) are still active; implementation cannot be frozen while a worker may still write`);
}

/**
 * The freeze is the last commit that changed a family package — not HEAD.
 *
 * HEAD moves the moment this record is committed, so a HEAD read would name a
 * commit that does not yet exist when the record is written and a different one
 * every time afterwards. What "frozen" actually means is that no implementation
 * has landed since, and that is exactly the commit below. Publishing this record
 * does not touch a family package, so the freeze holds still while it is
 * recorded, and it moves again only if a worker really does write.
 */
const freezeSha = execFileSync(
  "git", ["log", "-1", "--format=%H", "--", "data/rcap-all50/overlays/production"],
  { cwd: rootDir }).toString().trim();
if (!/^[0-9a-f]{40}$/.test(freezeSha)) fail("could not resolve the last commit that changed a family package");

// What each evidence session reads. Named individually so a changed artefact is
// visible as a changed digest rather than as a silently different render.
const BOUND = [
  "source-record.json",
  "field-census.json",
  "field-classification.json",
  "production-field-map.json",
  "overlay-profile.json",
  "fixtures/canonical-filled.pdf",
  "fixtures/boundary-filled.pdf",
  "contact-sheet/blank-vs-filled.pdf"
];

const complete = workview.families.filter((f) => f.ownerLane.lane === "implementation_complete");
if (!complete.length) fail("no implementation-complete family to freeze");

const families = complete.map((f) => {
  const dir = f.ownerLane.allowedPackagePath ?? f.packagePath;
  const bound = {};
  for (const rel of BOUND) {
    const digest = sha256(`${dir}/${rel}`);
    if (digest) bound[rel] = digest;
  }
  if (!Object.keys(bound).length) fail(`${f.familyId}: nothing to bind at ${dir}`);
  return {
    familyId: f.familyId,
    packagePath: dir,
    canonicalTerminalDisposition: f.ownerLane.canonicalTerminalDisposition ?? null,
    sourceSha256: f.sourceAvailability?.sha256 ?? null,
    sourceByteLength: f.sourceAvailability?.byteLength ?? null,
    sourceResolvedPath: f.sourceAvailability?.resolvedPath ?? null,
    hasFilingArtifact: Boolean(bound["fixtures/canonical-filled.pdf"]),
    boundHashes: bound
  };
});

const record = {
  schemaVersion: "rcap-pdf-implementation-freeze/v1",
  generatedBy: "scripts/generate-rcap-pdf-implementation-freeze.mjs",
  PDF_IMPLEMENTATION_FREEZE_SHA: freezeSha,
  queues: workview.queues,
  frozen: {
    families: families.length,
    withFilingArtifact: families.filter((f) => f.hasFilingArtifact).length,
    withoutFilingArtifact: families.filter((f) => !f.hasFilingArtifact).length,
    whySomeHaveNone:
      "a reference-only translation, an instructions sheet or an outside-party filing correctly carries no participant artifact. Absence here is an outcome, not a gap."
  },
  evidenceSessionsMustBind:
    "these exact digests. A sidecar or raster that names the tree instead of the bytes cannot be shown to have been true later.",
  noWorkerMayWriteAfterThis:
    "every implementation family is complete and owned by no session. A change to any package below invalidates the evidence bound to it and requires a new freeze.",
  families
};

const outputs = [[OUT, `${JSON.stringify(record, null, 2)}\n`]];
const md = ["# PDF implementation freeze", "",
  `\`PDF_IMPLEMENTATION_FREEZE_SHA\`: \`${freezeSha}\``, "",
  `${families.length} frozen famil(ies) — ${record.frozen.withFilingArtifact} with a filing artifact, ${record.frozen.withoutFilingArtifact} correctly without one.`, "",
  `Queues: implementation ${workview.queues.IMPLEMENTATION_QUEUE}, evidence ${workview.queues.EVIDENCE_QUEUE}, review ${workview.queues.REVIEW_QUEUE}.`, "",
  "| family | filing artifact | canonical disposition |", "| --- | --- | --- |"];
for (const f of families) md.push(`| \`${f.familyId}\` | ${f.hasFilingArtifact ? "yes" : "no"} | ${f.canonicalTerminalDisposition ?? "—"} |`);
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
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-pdf-implementation-freeze.mjs`);

console.log(`OK implementation freeze — ${families.length} famil(ies) frozen at ${freezeSha.slice(0, 12)}; ${record.frozen.withFilingArtifact} carry a filing artifact; queues implementation ${workview.queues.IMPLEMENTATION_QUEUE} / evidence ${workview.queues.EVIDENCE_QUEUE} / review ${workview.queues.REVIEW_QUEUE}`);
