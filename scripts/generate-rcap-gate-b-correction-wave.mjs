#!/usr/bin/env node
// The Gate B correction wave: what is being fixed, where it lives, and what it
// is allowed to touch.
//
//   node scripts/generate-rcap-gate-b-correction-wave.mjs
//   node scripts/generate-rcap-gate-b-correction-wave.mjs --check
//
// Three records, and the middle one is the gate.
//
//   1. The eight shared escalations, one row each, with the module, the defect,
//      the families and assets waiting on it, the reviewer condition it fails,
//      the smallest correction, the family-owned follow-up, and the mutation
//      that has to go red before the fix is believed.
//   2. Every path those corrections touch, classified against the canonical
//      worker image-input set and the application input set. A shared PDF fix
//      that lands inside either one stops being a PDF fix and becomes a release
//      event, so the classification runs before anything is edited rather than
//      being reconstructed afterwards.
//   3. The twelve retirement candidates the operational manifest still names.
//      They were refused retirement, which means they are implementation work
//      now, and a refusal with no follow-on is just a rejection.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const ESCALATIONS_IN = "data/rcap-all50/pdf-independent-reviews/shared-module-escalations.json";
const QUEUE_IN = "data/rcap-all50/pdf-independent-reviews/correction-queue.json";
const ADJUDICATION_IN = "data/rcap-all50/pdf-retirement-evidence/retirement-adjudication.json";
const MANIFEST_IN = "data/rcap-all50/overlays/overlay-factory-manifest.json";
const REGISTER_IN = "data/rcap-all50/problematic-pdf-register.json";
const BATCH_MANIFEST = "data/rcap-all50/pdf-independent-reviews/batch-1-manifest.json";

const OUT_WAVE = "data/rcap-all50/pdf-independent-reviews/gate-b-correction-wave.json";
const OUT_RETAINED = "data/rcap-all50/pdf-retirement-evidence/retained-manifest-assets.json";
const OUT_MD = "docs/record-clearing/pdf-independent-reviews/gate-b-correction-wave.md";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));

function fail(message) {
  console.error(`FAIL Gate B correction wave — ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// The canonical release-input sets, read from the generator that owns them
// rather than restated. A copy here would drift the moment the Dockerfile
// changed, and a stale copy is worse than no check: it says "outside the image"
// about a path that has since moved inside it.
// ---------------------------------------------------------------------------

const stagingGenerator = fs.readFileSync(abs("scripts/generate-rcap-staging-action.mjs"), "utf8");
const imageInputBlock = /const IMAGE_INPUT_PATHS = \[([\s\S]*?)\];/.exec(stagingGenerator);
if (!imageInputBlock) fail("could not read IMAGE_INPUT_PATHS from scripts/generate-rcap-staging-action.mjs");
const IMAGE_INPUT_PATHS = [...imageInputBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
if (IMAGE_INPUT_PATHS.length === 0) fail("the image-input set parsed empty");

// The application is the Next.js app: its inputs are src/ and the build config
// the app is compiled with. Both already appear in the image set, which is why
// the two sets overlap rather than nest.
const APPLICATION_INPUT_PATHS = ["src/", "package.json", "package-lock.json", "tsconfig.json", "next.config.ts"];

const insideSet = (candidate, set) =>
  set.some((entry) => (entry.endsWith("/") ? candidate.startsWith(entry) : candidate === entry));

/** Every path this wave's shared corrections touch. */
const CORRECTION_PATHS = [
  "scripts/rcap-official-forms/rcap-field-semantics.mjs",
  "scripts/rcap-official-forms/rcap-artifact-provenance.mjs",
  "scripts/implement-rcap-official-forms-d1.mjs",
  "scripts/verify-rcap-official-forms-d1.mjs",
  "scripts/verify-rcap-shared-pdf-contract.mjs",
  "scripts/verify-rcap-field-semantics-canaries.mjs"
];

const pathClassification = CORRECTION_PATHS.map((candidate) => ({
  path: candidate,
  exists: fs.existsSync(abs(candidate)),
  insideWorkerImageInputs: insideSet(candidate, IMAGE_INPUT_PATHS),
  insideApplicationInputs: insideSet(candidate, APPLICATION_INPUT_PATHS)
}));

const inputChangingPaths = pathClassification.filter((p) => p.insideWorkerImageInputs || p.insideApplicationInputs);

// ---------------------------------------------------------------------------
// The eight escalations, with the columns the wave needs added to what the
// review already recorded.
// ---------------------------------------------------------------------------

const escalationsIn = readJson(ESCALATIONS_IN);
const queue = readJson(QUEUE_IN);
const batchManifest = readJson(BATCH_MANIFEST);

const assetIdByFamily = new Map(batchManifest.families.map((f) => [f.familyId, `${f.jurisdiction}|${f.documentId}|${f.sourceSha256}`]));

/** The reviewer condition each escalation's families fail, and what follows the shared fix. */
const WAVE_DETAIL = {
  "ESC-GEOMETRY-NOT-AN-INPUT": {
    reviewerConditionFailed: "protection established by geometry where required, not label alone",
    familyOwnedFollowUp: "re-derive each field map and re-render; the maps are generated, so no family file is hand-edited",
    status: "open"
  },
  "ESC-MANUAL-NOT-NEVER-WRITE": {
    reviewerConditionFailed: "every discovered entry classified exactly once, and no participant value written to a protected area",
    familyOwnedFollowUp: "re-render; any binding onto a `manual` field disappears on its own",
    status: "corrected",
    correctedBy: "`manual` added to NEVER_WRITE in the binder and to NEVER_WRITE_CLASSES in the verifier, kept identical"
  },
  "ESC-NO-SSN-RULE": {
    reviewerConditionFailed: "court, clerk, judge, prosecutor, agency, signature, service, notarization and decision fields protected",
    familyOwnedFollowUp: "re-render KY aoc-334, aoc-496, aoc-496-2 and confirm the SSN and Jail ID boxes are empty in the bytes",
    status: "corrected",
    correctedBy: "a government_identifier protect rule covering SSN, SID, FBI number, jail and booking identifiers, DOC number and driver's licence"
  },
  "ESC-NO-REFUSE-WHEN": {
    reviewerConditionFailed: "participant-writable entries correct",
    familyOwnedFollowUp: "re-render the eight affected families; the duplicated address lines and the bank-name fills clear with the binding",
    status: "corrected",
    correctedBy: "refuseWhen guards on street_address and full_legal_name, and the attorney rule extended to `atty` and `vsb`"
  },
  "ESC-SERVICE-BLOCK-BY-NAME": {
    reviewerConditionFailed: "service fields protected",
    familyOwnedFollowUp: "re-render AK tf-800 and tf-805 and confirm the certification line is blank",
    status: "corrected",
    correctedBy: "`cert date`, `cert time` and `certify on` added to the service_block rule"
  },
  "ESC-CAPTION-VARIANTS": {
    reviewerConditionFailed: "no clipping, no silent truncation, no duplicated preprinted caption",
    familyOwnedFollowUp: "re-render the five Nebraska families and read the caption band in the raster",
    status: "open"
  },
  "ESC-VALUE-NOT-VISIBLE": {
    reviewerConditionFailed: "expected participant values visibly present",
    familyOwnedFollowUp: "re-render VT 600-00228 and confirm the applicant fields carry values",
    status: "open",
    note: "the same missing channel as ESC-GEOMETRY-NOT-AN-INPUT, seen from the other side: with no printed label reaching the binder, a form whose fields are named as bare digits refuses everything"
  },
  "ESC-SIDECAR-NONCONFORMANT": {
    reviewerConditionFailed: "artifact provenance complete and hash-matched",
    familyOwnedFollowUp: "re-render every family; the sidecar is emitted by the shared module, not written per family",
    status: "open"
  }
};

const escalations = escalationsIn.escalations.map((escalation) => {
  const detail = WAVE_DETAIL[escalation.id] ?? fail(`no wave detail for ${escalation.id}`);
  const families = escalation.affectedFamilies ?? [];
  return {
    escalationId: escalation.id,
    sharedModule: escalation.module,
    currentDefect: escalation.currentBehaviour,
    requiredBehaviour: escalation.requiredBehaviour,
    affectedFamilyIds: families,
    affectedAssetIds: families.map((f) => assetIdByFamily.get(f) ?? null).filter(Boolean),
    familiesAffected: families.length,
    reviewerConditionFailed: detail.reviewerConditionFailed,
    smallestSharedCorrection: escalation.requiredBehaviour,
    familyOwnedFollowUp: detail.familyOwnedFollowUp,
    mutationThatMustTurnRed: escalation.mutationThatShouldFail,
    whyNoFamilyCorrectionSubstitutes: escalation.whyNoFamilyCorrectionSolvesIt,
    status: detail.status,
    correctedBy: detail.correctedBy ?? null,
    note: detail.note ?? null
  };
});

if (escalations.length !== 8) fail(`expected 8 escalations, found ${escalations.length}`);

// ---------------------------------------------------------------------------
// The twelve the manifest still names.
// ---------------------------------------------------------------------------

const adjudication = readJson(ADJUDICATION_IN);
const manifest = readJson(MANIFEST_IN);
const register = readJson(REGISTER_IN);

const manifestByBasename = new Map();
for (const form of manifest.forms) {
  const rel = form.relativePath ?? form.sourcePath ?? form.path;
  if (!rel) continue;
  manifestByBasename.set(path.basename(rel).toLowerCase(), { relativePath: rel, classification: form.classification ?? null });
}
const registerByForm = new Map((register.records ?? []).map((r) => [String(r.formId).toLowerCase(), r]));

const retained = adjudication.candidates
  .filter((candidate) => candidate.conditionSevenVerdict === "fails")
  .map((candidate) => {
    const entry = manifestByBasename.get(candidate.formNumber.toLowerCase()) ?? null;
    const record = registerByForm.get(String(candidate.formNumber).toLowerCase()) ?? null;
    const isCapturedPage = /\.html?$/i.test(candidate.formNumber);
    return {
      assetId: candidate.assetId,
      jurisdiction: candidate.jurisdiction,
      asset: candidate.formNumber,
      survivingManifestReference: entry?.relativePath ?? null,
      manifestClassification: entry?.classification ?? null,
      operationalFamilies: candidate.formFamilyIds,
      familyPackagePaths: (queue.rows.find((r) => candidate.formFamilyIds.includes(r.familyId))?.familyPath) ?? null,
      routeOrPackageRelationship: record
        ? `carried in the register as ${record.jurisdiction} ${record.formId}; binary present: ${record.binaryPresent}`
        : "not carried as a distinct register record; reached only through the operational manifest",
      exactRemediationOrReplacement: isCapturedPage
        ? "This is a captured web page, not a form. It cannot be remediated as a PDF. Either bind the family to the official form the page links to — the source lane has proven binaries for several — or remove the page from the operational tree, at which point the retirement condition it currently fails is satisfied on the evidence rather than by absence."
        : "A real binary is present in the operational tree. It needs the ordinary remediation path: field census, classification, map, fixtures and an independent review — the same queue as every other retained asset."
    };
  });

if (retained.length !== 12) fail(`expected 12 retained manifest assets, found ${retained.length}`);

// ---------------------------------------------------------------------------

const wave = {
  schemaVersion: "rcap-pdf-gate-b-correction-wave/v1",
  generatedBy: "scripts/generate-rcap-gate-b-correction-wave.mjs",
  purpose:
    "The eight shared escalations as one deterministic table, the release-input classification that gates them, and the state of each correction.",
  consumedInventoryCommits: ["c78eb99f", "acc73fdd", "4e018401", "abed7631"],
  approvalChannelPreservedAt: "080c2013",
  howTheyWereConsumed:
    "By lineage, not by import. All five commits are ancestors of this branch's head — this is the lane that produced them — so there is nothing to cherry-pick and no risk of importing a partial view of a record this branch already carries whole.",
  releaseInputClassification: {
    workerImageInputPaths: IMAGE_INPUT_PATHS,
    workerImageInputPathsReadFrom: "scripts/generate-rcap-staging-action.mjs",
    applicationInputPaths: APPLICATION_INPUT_PATHS,
    correctionPaths: pathClassification,
    pathsInsideEitherSet: inputChangingPaths.map((p) => p.path),
    applicationInputChange: inputChangingPaths.some((p) => p.insideApplicationInputs),
    workerInputChange: inputChangingPaths.some((p) => p.insideWorkerImageInputs),
    verdict: inputChangingPaths.length === 0
      ? "All correction paths are outside both sets. Proceed on this branch; no rebuild, no republication, and Gate A Preview and payment acceptance are untouched by construction."
      : "At least one correction path is inside a release-input set. Continue on this branch, do not merge those paths during the hosted-acceptance run, and do not rebuild or republish the worker.",
    whyThisHolds:
      "The Dockerfile copies scripts/rcap-render-worker.mjs, scripts/lib/ and src/. Neither scripts/lib/ nor src/ contains any reference to scripts/rcap-official-forms/, so the corrected modules are not reachable from the image even transitively — they run at build time in this repository, not inside the worker."
  },
  totals: {
    escalations: escalations.length,
    corrected: escalations.filter((e) => e.status === "corrected").length,
    open: escalations.filter((e) => e.status === "open").length,
    familiesWaiting: new Set(escalations.flatMap((e) => e.affectedFamilyIds)).size,
    retainedManifestAssets: retained.length
  },
  escalations
};

const retainedRecord = {
  schemaVersion: "rcap-pdf-retained-manifest-assets/v1",
  generatedBy: "scripts/generate-rcap-gate-b-correction-wave.mjs",
  purpose:
    "The twelve retirement candidates the operational manifest still names. They were refused retirement, so they are implementation work now.",
  whyTheyWereRefused:
    "Their source files are in the operational tree, so the regenerated manifest names them again. Condition 7 fails every time it is asked, which is a settled answer rather than a pending one.",
  theShapeOfTheTwelve:
    "Eleven are captured .html pages and one is a PDF. That is the mirror image of the eighteen that retired, which were almost all official PDFs — and it is why the retirement had to be derived per asset rather than applied to the batch.",
  totals: {
    assets: retained.length,
    capturedWebPages: retained.filter((r) => /\.html?$/i.test(r.asset)).length,
    realBinaries: retained.filter((r) => !/\.html?$/i.test(r.asset)).length
  },
  assets: retained
};

function markdown() {
  const lines = [];
  lines.push("# Gate B correction wave");
  lines.push("");
  lines.push("## Release-input classification");
  lines.push("");
  lines.push("| path | in worker image inputs | in application inputs |");
  lines.push("| --- | :-: | :-: |");
  for (const row of pathClassification) {
    lines.push(`| \`${row.path}\` | ${row.insideWorkerImageInputs ? "YES" : "no"} | ${row.insideApplicationInputs ? "YES" : "no"} |`);
  }
  lines.push("");
  lines.push(wave.releaseInputClassification.verdict);
  lines.push("");
  lines.push(wave.releaseInputClassification.whyThisHolds);
  lines.push("");
  lines.push("## The eight escalations");
  lines.push("");
  lines.push("| id | shared module | families | reviewer condition failed | status |");
  lines.push("| --- | --- | ---: | --- | --- |");
  for (const escalation of escalations) {
    lines.push(`| ${escalation.escalationId} | \`${escalation.sharedModule.split(",")[0]}\` | ${escalation.familiesAffected} | ${escalation.reviewerConditionFailed} | ${escalation.status} |`);
  }
  lines.push("");
  for (const escalation of escalations) {
    lines.push(`### ${escalation.escalationId}`);
    lines.push("");
    lines.push(`**Module** — ${escalation.sharedModule}`);
    lines.push("");
    lines.push(`**Defect** — ${escalation.currentDefect}`);
    lines.push("");
    lines.push(`**Smallest shared correction** — ${escalation.smallestSharedCorrection}`);
    lines.push("");
    lines.push(`**Family-owned follow-up** — ${escalation.familyOwnedFollowUp}`);
    lines.push("");
    lines.push(`**Mutation that must turn red** — ${escalation.mutationThatMustTurnRed}`);
    lines.push("");
    if (escalation.correctedBy) {
      lines.push(`**Corrected by** — ${escalation.correctedBy}`);
      lines.push("");
    }
    lines.push(`**Families** — ${escalation.affectedFamilyIds.join(", ") || "none"}`);
    lines.push("");
  }
  lines.push("## The twelve the manifest still names");
  lines.push("");
  lines.push(retainedRecord.theShapeOfTheTwelve);
  lines.push("");
  lines.push("| jurisdiction | asset | surviving manifest reference | remediation |");
  lines.push("| --- | --- | --- | --- |");
  for (const asset of retained) {
    lines.push(`| ${asset.jurisdiction} | ${asset.asset} | \`${asset.survivingManifestReference ?? "—"}\` | ${/\.html?$/i.test(asset.asset) ? "bind to the official form it links to, or remove the page from the operational tree" : "ordinary remediation path"} |`);
  }
  lines.push("");
  return lines.join("\n");
}

const outputs = [
  [OUT_WAVE, `${JSON.stringify(wave, null, 2)}\n`],
  [OUT_RETAINED, `${JSON.stringify(retainedRecord, null, 2)}\n`],
  [OUT_MD, markdown()]
];

let stale = 0;
for (const [rel, content] of outputs) {
  const file = abs(rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === content) continue;
  stale += 1;
  if (checkOnly) { console.error(`  stale: ${rel}`); continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-gate-b-correction-wave.mjs`);

console.log(
  `OK Gate B correction wave — ${escalations.length} escalations (${wave.totals.corrected} corrected, ${wave.totals.open} open); ` +
    `${inputChangingPaths.length} correction path(s) inside a release-input set; ${retained.length} retained manifest assets`
);
